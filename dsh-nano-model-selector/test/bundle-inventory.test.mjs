/**
 * bundle-inventory.test.mjs — the async-compaction bundle projection reader.
 *
 * The reader exists because `pluginManager.listBundles()` is a ~0.9 s
 * synchronous inventory read. These tests pin the four properties that make it
 * safe to put behind a UI read: single-flight, TTL reuse, event invalidation,
 * and a fail-soft projection that never throws at the route layer.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { COMPACTION_BUNDLE_NAME, createBundleInventory } from '../lib/bundle-inventory.js'

/** A ctx double: only `get('pluginManager')` is used by the reader. */
const ctxWith = manager => ({ get: name => (name === 'pluginManager' ? manager : undefined) })

const row = (over = {}) => ({
  name: COMPACTION_BUNDLE_NAME,
  installed: true,
  enabled: true,
  availability: 'profile',
  ...over,
})

test('projects the companion row onto installed/enabled/known/availability', async () => {
  const inventory = createBundleInventory(ctxWith({ listBundles: async () => [row()] }))
  assert.deepEqual(await inventory.get(), {
    installed: true, enabled: true, known: true, availability: 'profile',
  })
})

test('a missing row is "known but not installed", not "unknown"', async () => {
  const inventory = createBundleInventory(ctxWith({ listBundles: async () => [row({ name: 'other' })] }))
  assert.deepEqual(await inventory.get(), { installed: false, enabled: false, known: true })
})

test('no pluginManager service projects U1 (known:false)', async () => {
  const inventory = createBundleInventory({ get: () => undefined })
  assert.deepEqual(await inventory.get(), { installed: false, enabled: false, known: false })
})

test('a failing read projects U1 and does not throw', async () => {
  const inventory = createBundleInventory(ctxWith({ listBundles: async () => { throw new Error('boom') } }))
  assert.deepEqual(await inventory.get(), { installed: false, enabled: false, known: false })
})

test('concurrent callers share one inventory read (single-flight)', async () => {
  let reads = 0
  const inventory = createBundleInventory(ctxWith({
    listBundles: async () => { reads += 1; await new Promise(r => setTimeout(r, 10)); return [row()] },
  }))
  const answers = await Promise.all([inventory.get(), inventory.get(), inventory.get(), inventory.get()])
  assert.equal(reads, 1)
  for (const answer of answers) assert.equal(answer.enabled, true)
})

test('a warm snapshot is reused for the whole TTL', async () => {
  let reads = 0
  let clock = 0
  const inventory = createBundleInventory(
    ctxWith({ listBundles: async () => { reads += 1; return [row()] } }),
    { ttlMs: 1000, now: () => clock },
  )
  await inventory.get()
  clock = 999
  await inventory.get()
  assert.equal(reads, 1, 'inside the TTL the snapshot must be served')
  clock = 1000
  await inventory.get()
  assert.equal(reads, 2, 'at the TTL boundary the inventory is read again')
})

test('invalidate() drops the snapshot immediately', async () => {
  let reads = 0
  let enabled = true
  const inventory = createBundleInventory(ctxWith({
    listBundles: async () => { reads += 1; return [row({ enabled })] },
  }))
  assert.equal((await inventory.get()).enabled, true)
  enabled = false
  inventory.invalidate()
  assert.equal((await inventory.get()).enabled, false)
  assert.equal(reads, 2)
})

test('an invalidation during an in-flight read wins: the stale value is not cached', async () => {
  let release
  let reads = 0
  const inventory = createBundleInventory(ctxWith({
    listBundles: async () => {
      reads += 1
      const mine = reads
      if (mine === 1) await new Promise(r => { release = r })
      return [row({ enabled: mine === 1 })]
    },
  }))
  const first = inventory.get()          // starts read #1, blocks
  await new Promise(r => setImmediate(r))
  inventory.invalidate()                 // manager changed while reading
  release()
  assert.equal((await first).enabled, true, 'the in-flight answer is still returned to its caller')
  // ...but it must not have been cached: the next get() reads again and sees false.
  assert.equal((await inventory.get()).enabled, false)
  assert.equal(reads, 2)
})

test('a failed read after a good snapshot keeps the last good value', async () => {
  let fail = false
  let clock = 0
  const inventory = createBundleInventory(
    ctxWith({ listBundles: async () => { if (fail) throw new Error('offline'); return [row()] } }),
    { ttlMs: 1000, now: () => clock },
  )
  await inventory.get()
  fail = true
  clock = 5000 // force a re-read
  assert.deepEqual(await inventory.get(), {
    installed: true, enabled: true, known: true, availability: 'profile',
  }, 'a transient inventory failure must not flap the panel to U1')
})

test('the manager is read through ctx.get(), never a property access', async () => {
  // A cordis Context is a Proxy whose property trap resolves a shadow
  // provision. Reading `ctx.pluginManager` would silently answer a different
  // object; the reader must use the explicit service read.
  const touched = []
  const ctx = {
    get(name) { touched.push(name); return { listBundles: async () => [row()] } },
  }
  Object.defineProperty(ctx, 'pluginManager', {
    get() { throw new Error('property access is forbidden') },
  })
  const inventory = createBundleInventory(ctx)
  assert.equal((await inventory.get()).installed, true)
  assert.deepEqual(touched, ['pluginManager'])
})

test('a missing pluginManager is not cached: the next call re-reads once it appears', async () => {
  // Activation order is not guaranteed (pluginManager is not in our inject
  // list), so "no manager yet" must never pin U1 for a whole TTL.
  let manager = null
  const ctx = { get: () => manager }
  const inventory = createBundleInventory(ctx, { ttlMs: 1_800_000 })
  assert.deepEqual(await inventory.get(), { installed: false, enabled: false, known: false })
  manager = { listBundles: async () => [row()] }
  assert.deepEqual(await inventory.get(), {
    installed: true, enabled: true, known: true, availability: 'profile',
  })
})

/* ===================== ACE-1117 P5-02/P5-04/T16 =========================== */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const repoRoot = join(here, '../..')
const read = p => readFileSync(p, 'utf8')

test('T16 source: the four resident schedules are gone from src and the store', () => {
  for (const file of [
    'src/client/ModelSelector.jsx',
    'src/client/AsyncStatusBadge.jsx',
    'src/client/CompactPanel.jsx',
    'src/client/AsyncHistoryDialog.jsx',
    'src/client/compact.js',
  ]) {
    const src = read(join(root, file))
    assert.equal(src.includes('setInterval('), false, `${file} must not chain setInterval`)
    assert.equal(/setTimeout\(\s*(?!=>|\()/.test(src), false,
      `${file} must not schedule setTimeout(<identifier>) — one-shot arrow timeouts are fine`)
  }
})

test('T16 artifact: lib/client.js carries no resident compaction cadence', () => {
  const built = read(join(root, 'lib/client.js'))
  // The 15 s badge poll, the 30 s panel heartbeat, and their raw literals.
  assert.equal(built.includes('15000'), false, 'the 15 s cadence must not survive the build')
  assert.equal(built.includes('30000'), false, 'the 30 s cadence must not survive the build')
  assert.equal(built.includes('3e4'), false)
  // The single sanctioned continuation constant DOES survive (esbuild writes
  // it as 3e3, never as a bare 3000 literal).
  assert.equal(built.includes('3e3'), true, 'INFLIGHT_POLL_MS=3000 must bake in')
})

test('T16 pump discipline: non-running yields zero schedules; select keeps polling until settle', async (t) => {
  const { AsyncCompactStore, INFLIGHT_POLL_MS } = await import('../src/client/compact.js')
  assert.equal(INFLIGHT_POLL_MS, 3000, 'the store constant and the declared budget are one number')
  const calls = []
  const records = { current: [] }
  const store = new AsyncCompactStore({
    fetcher: async sid => {
      calls.push({ sid, at: Date.now() })
      return { ok: true, history: { records: records.current }, policy: { runtime: { lastCompaction: null } } }
    },
  })

  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })

  // Non-running session: the subscribe fetch happens once, no follow-up.
  const unsub1 = store.subscribe('sess-idle', () => {})
  await Promise.resolve(); await Promise.resolve()
  store.setRunning('sess-idle', false)
  assert.equal(store.scheduledCount(), 0, 'non-running must hold zero schedules')
  t.mock.timers.tick(60_000)
  await Promise.resolve(); await Promise.resolve()
  assert.equal(calls.length, 1, 'non-running: only the open fetch in 60 s')
  unsub1()

  // Running + no in-flight episode: settled/empty ledger → still zero.
  const unsub2 = store.subscribe('sess-calm', () => {})
  store.setRunning('sess-calm', true)
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
  assert.equal(store.scheduledCount(), 0, 'running without an open episode schedules nothing')
  unsub2()

  // Running + select tail (in flight): continuation fires every 3000 ms until
  // a commit or drop lands.
  const seq = [
    [{ kind: 'arm', at: 'x' }, { kind: 'claim', at: 'x' }, { kind: 'select', at: 'x' }],
    [{ kind: 'commit', at: 'x' }],
  ]
  let idx = 0
  const store2 = new AsyncCompactStore({
    fetcher: async () => {
      calls.push({ at: Date.now() })
      return { history: { records: seq[Math.min(idx++, seq.length - 1)] }, policy: { runtime: {} } }
    },
  })
  store2.subscribe('sess-live', () => {})
  store2.setRunning('sess-live', true)
  const before = calls.length
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
  // First fetch resolved: select tail → a 3000 ms schedule exists.
  assert.equal(store2.scheduledCount(), 1, 'select tail keeps the pump armed')
  t.mock.timers.tick(3000)
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
  assert.equal(calls.length, before + 1, 'continuation fires after exactly 3000 ms')
  // Second fetch returned a commit → settled: no further schedule.
  await Promise.resolve(); await Promise.resolve()
  assert.equal(store2.scheduledCount(), 0, 'commit settles the pump')
  t.mock.timers.tick(60_000)
  await Promise.resolve()
  assert.equal(calls.length, before + 1, 'no fetch after settlement')
})

test('T16 perf declaration: audit budget pins 3000 and DNMSC has no declaration', () => {
  const decl = JSON.parse(read(join(root, 'src/perf/declaration.json')))
  const budget = (decl.budgets ?? []).find(b => b.id === 'async-inflight-poll')
  assert.ok(budget !== undefined, 'audit budget async-inflight-poll must exist')
  assert.equal(budget.subject, 'inflight-poll-ms')
  assert.deepEqual(budget.rule, { op: 'eq', limit: 3000 })
  assert.equal(budget.gate, 'audit')
  assert.equal('scenario' in budget, false, 'no scenario — the validator tolerates it today')
  // The baked runtime slice stays budget-free (declarations.test.mjs rule).
  const baked = read(join(root, 'lib/perf-declaration.js'))
  assert.equal(baked.includes('budgets'), false)
  // DNMSC must not grow its own declaration.
  assert.equal(existsSync(join(repoRoot, 'dsh-nano-model-selector-compaction/src/perf/declaration.json')), false)
})
