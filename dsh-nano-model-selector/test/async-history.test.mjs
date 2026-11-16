/**
 * async-history.test.mjs — the DNMS half of the DNMS01 audit ledger.
 *
 * The companion bundle writes `<sessionId>.jsonl`; this half only reads it and
 * folds it into the `history` field of the existing async-compact GET. These
 * tests pin the reader's contract: a missing ledger is normal, a torn tail line
 * is skipped, an unsafe id never escapes the directory, and the summary counts
 * are derived from the records rather than stored twice.
 *
 * Hermetic: the ledger root is derived at module import time from
 * DSH_DATA_DIR/DSH_HOME, so the env var is set before importing index.js.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DATA_DIR = mkdtempSync(join(tmpdir(), 'dnms-history-'))
process.env.DSH_DATA_DIR = DATA_DIR
const HISTORY_DIR = join(DATA_DIR, 'plugins/nano-model-selector/async-history')

const { derivePhase, readAsyncHistory } = await import('../index.js')

/** Write the ledger for one session id. */
function writeLedger(sessionId, records) {
  mkdirSync(HISTORY_DIR, { recursive: true })
  writeFileSync(
    join(HISTORY_DIR, `${sessionId}.jsonl`),
    records.map(record => `${JSON.stringify(record)}\n`).join(''),
  )
}

test.after(() => rmSync(DATA_DIR, { recursive: true, force: true }))

test('missing ledger is the normal empty state, not a degradation', () => {
  const history = readAsyncHistory('session-never-ran')
  assert.deepEqual(history.records, [])
  assert.equal(history.degraded, null)
  assert.equal(history.summary.arm, 0)
  assert.equal(history.summary.lastCommitAt, null)
})

test('records are returned in append order and summarised by kind', () => {
  writeLedger('session-fold', [
    { at: '2026-11-16T03:00:00.000Z', kind: 'arm', fill: 0.71, window: 262000, retain: 39300 },
    { at: '2026-11-16T03:00:01.000Z', kind: 'claim', retain: 39300 },
    { at: '2026-11-16T03:00:02.000Z', kind: 'commit', compactionId: 'c-1', tokens: 862, records: 5 },
    { at: '2026-11-16T03:10:00.000Z', kind: 'arm', fill: 0.78, window: 262000, retain: 39300 },
    { at: '2026-11-16T03:10:01.000Z', kind: 'drop', reason: 'degraded', bracketed: false },
  ])
  const history = readAsyncHistory('session-fold')
  assert.equal(history.degraded, null)
  assert.equal(history.records.length, 5)
  assert.deepEqual(history.records.map(r => r.kind), ['arm', 'claim', 'commit', 'arm', 'drop'])
  assert.equal(history.summary.arm, 2)
  assert.equal(history.summary.claim, 1)
  assert.equal(history.summary.commit, 1)
  assert.equal(history.summary.drop, 1)
  assert.equal(history.summary.skip, 0)
  // Last-writer facts point at the newest occurrence of each kind.
  assert.equal(history.summary.lastCommitAt, '2026-11-16T03:00:02.000Z')
  assert.equal(history.summary.lastDropReason, 'degraded')
})

test('a torn tail line is skipped instead of failing the whole read', () => {
  mkdirSync(HISTORY_DIR, { recursive: true })
  writeFileSync(
    join(HISTORY_DIR, 'session-torn.jsonl'),
    `${JSON.stringify({ at: '2026-11-16T03:00:00.000Z', kind: 'arm' })}\n{"at":"2026-11-16T03:0`,
  )
  const history = readAsyncHistory('session-torn')
  assert.equal(history.degraded, null)
  assert.equal(history.records.length, 1)
  assert.equal(history.records[0].kind, 'arm')
})

test('lines without a string kind are ignored (unknown shapes never reach the UI)', () => {
  writeLedger('session-shape', [
    { at: '2026-11-16T03:00:00.000Z', kind: 'arm' },
    { at: '2026-11-16T03:00:01.000Z' },
    { at: '2026-11-16T03:00:02.000Z', kind: 7 },
  ])
  const history = readAsyncHistory('session-shape')
  assert.equal(history.records.length, 1)
  assert.equal(history.summary.arm, 1)
})

test('an unsafe session id is refused instead of escaping the ledger directory', () => {
  for (const id of ['../escape', 'a/b', '..', '', 'x'.repeat(200)]) {
    const history = readAsyncHistory(id)
    assert.equal(history.degraded, 'history-read-failed', `id ${JSON.stringify(id)} should be refused`)
    assert.deepEqual(history.records, [])
  }
})

/* ------------------------- live phase derivation ------------------------- */

const iso = ms => new Date(Date.now() - ms).toISOString()

test('derivePhase: a fresh arm reads as armed, a stale one does not', () => {
  const fresh = derivePhase({ at: iso(30_000), kind: 'arm', target: { provider: 'p', model: 'm' }, promptVersion: 'abc12345' })
  assert.equal(fresh.state, 'armed')
  assert.deepEqual(fresh.model, { provider: 'p', model: 'm' })
  assert.equal(fresh.promptVersion, 'abc12345')

  // A host restarted mid-episode must not leave a permanent "queued" line.
  assert.equal(derivePhase({ at: iso(30 * 60_000), kind: 'arm' }).state, 'idle')
})

test('derivePhase: a claim is running only inside the episode timeout window', () => {
  assert.equal(derivePhase({ at: iso(10_000), kind: 'claim' }).state, 'running')
  // The engine bounds one attempt at 120 s; well past that the claim is stale.
  assert.equal(derivePhase({ at: iso(10 * 60_000), kind: 'claim' }).state, 'idle')
})

test('derivePhase: a recent drop surfaces its reason, an old one does not', () => {
  const failed = derivePhase({ at: iso(60_000), kind: 'drop', reason: 'transient', detail: '429' })
  assert.equal(failed.state, 'failed')
  assert.equal(failed.reason, 'transient')
  assert.equal(failed.detail, '429')
  assert.equal(derivePhase({ at: iso(60 * 60_000), kind: 'drop', reason: 'transient' }).state, 'idle')
})

test('derivePhase: a fresh commit reports committed, an old one goes idle', () => {
  // The shell's compaction row does not say which lane produced it, so the
  // async attribution has to outlive the commit itself.
  const fresh = derivePhase({ at: iso(5_000), kind: 'commit', compactionId: 'c', tokens: 90010, records: 332 })
  assert.equal(fresh.state, 'committed')
  assert.equal(fresh.tokens, 90010)
  assert.equal(fresh.records, 332)
  assert.equal(fresh.compactionId, 'c')

  assert.equal(derivePhase({ at: iso(60 * 60_000), kind: 'commit', compactionId: 'c' }).state, 'idle')
  // A skip is never a state the badge should show.
  assert.equal(derivePhase({ at: iso(5_000), kind: 'skip', reason: 'lock-held' }).state, 'idle')
})

test('derivePhase: malformed tails degrade to idle instead of throwing', () => {
  assert.equal(derivePhase(undefined).state, 'idle')
  assert.equal(derivePhase({ kind: 'arm' }).state, 'idle')
  assert.equal(derivePhase({ at: 'not-a-date', kind: 'arm' }).state, 'idle')
})

test('readAsyncHistory exposes the phase alongside records and summary', () => {
  writeLedger('session-phase', [
    { at: iso(120_000), kind: 'arm', fill: 0.7, retain: 100 },
    { at: iso(60_000), kind: 'claim', retain: 100, promptVersion: 'deadbeef' },
  ])
  const history = readAsyncHistory('session-phase')
  assert.equal(history.phase.state, 'running')
  assert.equal(history.phase.promptVersion, 'deadbeef')
  // An empty ledger is idle, never failed.
  assert.equal(readAsyncHistory('session-none').phase.state, 'idle')
})
