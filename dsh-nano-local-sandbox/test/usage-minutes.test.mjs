import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { openUsageMinutes } from '../src/host/usage-minutes.js'

const T = Date.UTC(2026, 1, 1)
const M = 60_000

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'dnls-usage-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  let now = T
  const row = { sandboxId: 'A', managedAt: T, stateVolume: '/guest-state/A', binding: { locator: 'loc-A', generation: 'first' } }
  const observed = { ...row.binding, state: 'running', stateVolume: row.stateVolume }
  let calls = 0
  let raw = []
  const cfg = {
    root, envId: 'test', clock: () => now,
    registry: { get: id => id === 'A' ? row : null, list: () => [row] },
    observe: async () => ({ ...observed }),
    backend: { async stats() { calls++; if (raw === null) throw new Error('unavailable'); return raw } },
  }
  const open = () => openUsageMinutes(cfg)
  let db = open()
  t.after(() => db.close())
  return {
    root, row, observed, open, get db() { return db }, calls: () => calls,
    async reopen() { await db.close(); db = open() },
    async omitMinute(minute) {
      await db.close()
      const fixtureDb = new DatabaseSync(join(root, 'usage-minutes.sqlite'))
      try {
        assert.equal(fixtureDb.prepare('DELETE FROM samples WHERE id=? AND minute=?').run('A', slotOf(minute)).changes, 1)
      } finally { fixtureDb.close() }
      db = open()
    },
    async take(minute, offset, cpu, memory) {
      now = T + minute * M + offset
      raw = cpu === 'fail' ? null : [{ id: 'loc-A', cpuUsageUsec: cpu, memoryUsageBytes: memory, argv: 'sensitive-command' }]
      await db.tick()
    },
    time: (minute) => { now = T + minute * M },
  }
}

const slotOf = offset => T / M + offset

test('DNLS03-T52 completed UTC slots, real zeros, weighted CPU, and holes survive a writer restart', async t => {
  const f = fixture(t)
  assert.throws(f.open, /locked|busy/i)
  await f.take(0, 5000, 0, 0)
  await f.take(1, 15000, 70e6, 100)
  await f.reopen()
  await f.take(1, 30000, 999e6, 99999)
  assert.equal(f.calls(), 2)
  await f.take(2, 5000, 170e6, 200)
  await f.take(3, 5000, 390e6, 999)
  await f.omitMinute(3)
  await f.take(4, 5000, 500e6, undefined)
  f.observed.state = 'stopped'
  await f.take(5, 5000, 0, 0)
  f.observed.state = 'running'
  await f.take(6, 10000, 'fail')
  f.observed.generation = f.row.binding.generation = 'second'
  await f.take(7, 5000, 0, 0)
  await f.take(8, 5000, 0, 0)
  f.time(9)
  const before = f.calls()
  for (const window of ['24h', '7d', '30d']) {
    const s = f.db.summary(f.row, window)
    assert.equal(s.end, T + 9 * M)
    assert.deepEqual(s.states, { running: 6, stopped: 1, missing: 1, failed: 1 })
    assert.deepEqual(s.memory, { unit: 'bytes', valid: 5, expected: 9, mean: 60, peak: 200 })
    assert.deepEqual(s.cpu, { unit: 'core', valid: 3, expected: 9, mean: 170 / 180, peak: 2 })
  }
  const missed = f.db.fleetMinute([f.row], T / M + 3)
  assert.deepEqual(missed.memory, { unit: 'bytes', contributors: 0, total: null })
  const latest = f.db.fleetMinute([f.row, { ...f.row, sandboxId: 'B' }])
  assert.equal(latest.expected, 2)
  assert.deepEqual(latest.memory, { unit: 'bytes', contributors: 1, total: 0 })
  assert.deepEqual(latest.cpu, { unit: 'core', contributors: 1, total: 0 })
  assert.equal(f.db.fleetMinute([]).expected, 0)
  const onlyLast = f.db.summary({ ...f.row, visibleFrom: T + 7 * M + 1 }, '24h')
  assert.equal(onlyLast.cpu.expected, 1)
  assert.equal(onlyLast.cpu.mean, null) // cannot use the preceding sample from before access began
  assert.equal(f.calls(), before)
  assert.ok(!readFileSync(join(f.root, 'usage-minutes.sqlite')).includes('sensitive-command'))
})

test('no CPU deltas across generations or counter reversal; aged-out readings are not retained', async t => {
  const f = fixture(t)
  await f.take(0, 0, 100, 42)
  f.observed.generation = f.row.binding.generation = 'replacement'
  await f.take(1, 0, 10000, 8)
  await f.take(2, 0, 4, 89)
  // A stop/start between polls invalidates the interval even if the container's generation is unchanged.
  f.row.operations = [{ action: 'restart', state: 'succeeded', step: 'verify', operationId: 'restart-1' }]
  await f.take(3, 0, 1e6, 20)
  f.time(4)
  assert.equal(f.db.summary(f.row, '24h').cpu.valid, 0)
  f.observed.generation = 'unbound'
  await f.take(43205, 0, 11111, 999)
  f.time(43206)
  const s = f.db.summary(f.row, '30d')
  assert.equal(s.states.failed, 1)
  assert.equal(s.states.missing, 43199)
  assert.equal(s.memory.mean, null)
  assert.equal(s.memory.expected, 43200)
  assert.throws(() => f.db.fleetMinute([f.row], T / M))
})
