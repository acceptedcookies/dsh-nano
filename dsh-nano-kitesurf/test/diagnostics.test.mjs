import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import {
  BRIDGE_ERROR_IDS, ERROR_CATALOG, ERROR_STATUS, clearConsole, clearOperations, diagnosticsSummary,
  listConsole, listOperations, recordConsole, recordOperation, summarizeInput,
} from '../lib/diagnostics.js'

function statusOf(id) {
  for (const [pattern, status] of ERROR_STATUS) if (pattern.test(id)) return status
  return 502
}

test('the catalogue is a single truth: every row maps to the status it declares', () => {
  for (const row of ERROR_CATALOG) {
    assert.equal(statusOf(row.example), row.status, `${row.example} → ${row.status}`)
  }
  // Known real ids from the throw sites.
  assert.equal(statusOf('kitesurf.pick.miss'), 404)
  assert.equal(statusOf('kitesurf.body.toolarge'), 413)
  assert.equal(statusOf('kitesurf.kite.state'), 409)
  assert.equal(statusOf('kitesurf.navigate.egress'), 504)
  assert.equal(statusOf('kitesurf.evaluate.exception'), 400)
  assert.equal(statusOf('kitesurf.engine.failed'), 502)
  // Unlisted ids stay upstream/engine.
  assert.equal(statusOf('kitesurf.brand.new'), 502)
  for (const row of ERROR_CATALOG) {
    assert.ok(row.cause && row.next, `${row.example} needs cause + next`)
  }
})

test('every real kitesurf.* errorId is catalogued or a bridge-local id', () => {
  // Contract: an agent that reads the catalog must never hit an undocumented
  // id — a host input-side id that falls through to the 502 default is a
  // contract bug (the agent would self-heal on the wrong branch). Scan every
  // source file for kitesurf.* literals, then require each to match a
  // catalog regex or be a registered bridge-local id.
  const covered = (id) => ERROR_STATUS.some(([pattern]) => pattern.test(id))
  const roots = [new URL('..', import.meta.url).pathname]
  const files = []
  for (const dir of ['index.js', 'lib', 'runtime']) {
    const full = join(roots[0], dir)
    if (dir === 'index.js') { files.push(full); continue }
    for (const entry of readdirSync(full)) {
      if (/\.(js|mjs)$/.test(entry)) files.push(join(full, entry))
    }
  }
  const literals = new Set()
  // errorId literals only: a bare 'kitesurf.lock.json' filename (the durable
  // lock path) is not an errorId, so require an errorId context or a
  // KitesurfError throw to count a literal.
  const patterns = [/errorId:\s*'(kitesurf\.[a-zA-Z]+\.[a-zA-Z]+)'/g, /KitesurfError\(\s*'(kitesurf\.[a-zA-Z]+\.[a-zA-Z]+)'/g]
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const pattern of patterns) {
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(text))) literals.add(match[1])
    }
  }
  const uncovered = [...literals].filter((id) => !BRIDGE_ERROR_IDS.has(id) && !covered(id)).sort()
  assert.deepEqual(uncovered, [], `uncovered host ids (will 502 as if engine-down): ${uncovered.join(', ')}`)
  // Bridge ids stay bridge-scoped and never sneak into the host catalog.
  for (const id of BRIDGE_ERROR_IDS) assert.ok(!covered(id), `${id} must not map to a host status`)
})

test('operations ring is bounded, filterable and carries the failure id', () => {
  clearOperations()
  for (let i = 0; i < 12; i += 1) {
    recordOperation({ route: '/nano-kitesurf/pick', method: 'POST', status: i % 2 ? 404 : 200, durationMs: i, ok: i % 2 === 0, errorId: i % 2 ? 'kitesurf.pick.miss' : null, input: summarizeInput({ x: 10, secret: 'do-not-record' }) })
  }
  const all = listOperations({ limit: 20 })
  assert.equal(all.entries.length, 12)
  assert.equal(all.entries[0].input.secret, undefined) // whitelist only
  assert.equal(all.entries[0].input.x, 10)
  const errors = listOperations({ errorsOnly: true })
  assert.equal(errors.entries.length, 6)
  assert.ok(errors.entries.every((row) => row.errorId === 'kitesurf.pick.miss'))
  const capped = listOperations({ limit: 3 })
  assert.equal(capped.entries.length, 3)
})

test('console ring counts by level and clears', () => {
  clearConsole()
  recordConsole({ level: 'error', source: 'console', text: 'boom' })
  recordConsole({ level: 'log', source: 'console', text: 'hello' })
  recordConsole({ level: 'exception', source: 'javascript', text: 'TypeError: x' })
  recordConsole({ level: 'network', source: 'network', text: 'net::ERR_FAILED' })
  const all = listConsole({ limit: 10 })
  assert.equal(all.total, 4)
  assert.equal(all.counts.error, 1)
  assert.equal(listConsole({ level: 'error,exception' }).entries.length, 2)
  assert.equal(clearConsole(), 4)
  assert.equal(listConsole().total, 0)
})

test('diagnosticsSummary reports latency, failures and the catalogue', () => {
  clearOperations()
  clearConsole()
  recordOperation({ route: '/nano-kitesurf/shot', method: 'POST', status: 200, durationMs: 42, ok: true })
  recordOperation({ route: '/nano-kitesurf/shot', method: 'POST', status: 502, durationMs: 7, ok: false, errorId: 'kitesurf.engine.failed', error: 'down' })
  const summary = diagnosticsSummary()
  assert.equal(summary.operations.total, 2)
  assert.equal(summary.operations.failures, 1)
  assert.equal(summary.operations.latency['/nano-kitesurf/shot'].n, 2)
  assert.equal(summary.recentErrors[0].errorId, 'kitesurf.engine.failed')
  assert.ok(summary.errorCatalog.length >= 20)
  assert.ok(summary.errorCatalog.every((row) => Number.isInteger(row.status) && row.next))
})
