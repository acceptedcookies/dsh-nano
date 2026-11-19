import assert from 'node:assert/strict'
import test from 'node:test'
import { createBrowserHistoryAdapter, navigateHistory } from '../profiles/kitesurf/driver/history.js'
// Loading the profile driver configures the CDP helpers the adapter borrows.
import './support/kernel.mjs'

const A = 'https://a.example/'
const B = 'https://b.example/'

// Driver compatibility samples only: no engine, routes, filesystem or deployment.
test('history projects legacy visits newest-first with stable address ids and counts', () => {
  const session = { history: [
    { url: A, at: '2026-11-17T00:00:00Z' },
    { id: 'legacy-b', url: B, at: '2026-11-17T01:00:00Z', count: 2 },
    { url: A, at: '2026-11-17T02:00:00Z' },
  ] }
  const original = structuredClone(session.history)
  const adapter = createBrowserHistoryAdapter(session)
  const listed = adapter.listHistory()
  assert.equal(listed.total, 2)
  assert.deepEqual(listed.entries.map(row => [row.url, row.count]), [[A, 2], [B, 2]])
  assert.equal(listed.entries[0].at, '2026-11-17T02:00:00Z')
  assert.equal(listed.entries[1].id, createBrowserHistoryAdapter({ history: [{ url: B }] }).listHistory().entries[0].id)
  assert.deepEqual(session.history, original, 'reading legacy rows does not rewrite the canonical array')
  listed.entries[0].count = 99
  assert.equal(adapter.listHistory().entries[0].count, 2, 'display rows are not a second writable store')
})

test('history query and limit match the DNK address list and search consumers', () => {
  const adapter = createBrowserHistoryAdapter({ history: [{ url: A }, { url: B }, { url: 'https://a.example/path' }] })
  assert.deepEqual(adapter.listHistory({ q: 'A.EXAMPLE', limit: '1' }).entries.map(row => row.url), ['https://a.example/path'])
  assert.equal(adapter.listHistory({ q: 'A.EXAMPLE', limit: '1' }).total, 2)
  assert.deepEqual(adapter.listHistory({ q: 'missing' }), { total: 0, entries: [] })
})

test('history limit defaults to 100 and is capped at 1000 without truncating canonical visits', () => {
  const session = { history: Array.from({ length: 1005 }, (_, i) => ({ url: `${A}${i}` })) }
  const adapter = createBrowserHistoryAdapter(session)
  assert.equal(adapter.listHistory().entries.length, 100)
  assert.equal(adapter.listHistory({ limit: 99999 }).entries.length, 1000)
  for (const limit of ['bad', 0, -2, Infinity]) assert.equal(adapter.listHistory({ limit }).entries.length, 100)
  assert.equal(session.history.length, 1005)
})

test('recording uses only the current session array and sees outside updates', () => {
  const session = { history: [] }
  const canonical = session.history
  const adapter = createBrowserHistoryAdapter(session, { now: () => 'fixture-time' })
  const first = adapter.recordHistory(A)
  assert.equal(first.at, 'fixture-time')
  assert.equal(first.count, 1)
  adapter.recordHistory(A)
  assert.equal(adapter.listHistory().entries[0].count, 2)
  canonical.push({ url: B })
  assert.equal(adapter.listHistory().entries[0].url, B)
  assert.equal(session.history, canonical)
  assert.deepEqual(createBrowserHistoryAdapter({ history: [] }).listHistory().entries, [])
  assert.throws(() => adapter.recordHistory(''), error => error.status === 400 && error.errorId === 'kitesurf.history.body')
})

test('DELETE by URL removes every visit of the tab and leaves unrelated addresses', () => {
  const session = { history: [{ url: A }, { url: B }, { url: A }] }
  const canonical = session.history
  const adapter = createBrowserHistoryAdapter(session)
  assert.deepEqual(adapter.removeHistory({ url: A }), { removed: 2 })
  assert.deepEqual(session.history, [{ url: B }])
  assert.equal(session.history, canonical)
  assert.deepEqual(adapter.removeHistory({ url: A }), { removed: 0 })
})

test('DELETE by projected stable id or legacy row id removes its address', () => {
  const session = { history: [{ id: 'legacy-a', url: A }, { url: B }, { url: A }] }
  const adapter = createBrowserHistoryAdapter(session)
  const id = adapter.listHistory().entries.find(row => row.url === A).id
  assert.deepEqual(adapter.removeHistory({ id }), { removed: 2 })
  session.history.push({ id: 'legacy-a', url: A })
  assert.deepEqual(adapter.removeHistory({ id: 'legacy-a' }), { removed: 1 })
  assert.deepEqual(adapter.removeHistory({ id: 'unknown' }), { removed: 0 })
  assert.deepEqual(session.history, [{ url: B }])
  assert.throws(() => adapter.removeHistory({}), error => error.status === 400)
})

test('clear empties the same canonical array and never resurrects old visits', () => {
  const session = { history: [{ url: A }, { url: B }] }
  const canonical = session.history
  const adapter = createBrowserHistoryAdapter(session)
  assert.deepEqual(adapter.clearHistory(), { removed: 2 })
  assert.equal(session.history, canonical)
  assert.deepEqual(adapter.listHistory(), { total: 0, entries: [] })
  assert.deepEqual(createBrowserHistoryAdapter(session).listHistory().entries, [])
  assert.deepEqual(adapter.clearHistory(), { removed: 0 })
})

function cdpFixture({ currentIndex = 1, attached = true, onMove, actualUrl } = {}) {
  const calls = []
  let reached = { url: currentIndex === 1 ? B : A, title: '' }
  const client = { alive: true, async send(method, params, sessionId, timeoutMs) {
    calls.push({ method, params, sessionId, timeoutMs })
    if (method === 'Target.getTargets') return { targetInfos: [{ type: 'page', targetId: 'p', ...(attached ? { sessionId: 's' } : {}) }] }
    if (method === 'Target.attachToTarget') return { sessionId: 's' }
    if (method === 'Page.enable') return {}
    if (method === 'Page.getNavigationHistory') return { currentIndex, entries: [{ id: 11, url: A, title: 'A' }, { id: 12, url: B }] }
    if (method === 'Page.navigateToHistoryEntry') { reached = { url: actualUrl || (params.entryId === 11 ? A : B), title: params.entryId === 11 ? 'A' : '' }; return onMove?.() || {} }
    if (method === 'Runtime.evaluate') return { result: { value: reached } }
    throw new Error(`unexpected CDP command ${method}`)
  } }
  return { client, calls }
}

test('back uses the owning flattened CDP session and a 45-second navigation budget', async () => {
  const { client, calls } = cdpFixture()
  assert.deepEqual(await navigateHistory(client, -1), { moved: true, url: A, title: 'A', currentIndex: 0, entries: 2 })
  assert.deepEqual(calls.map(row => row.method).filter((m) => m !== 'Page.enable'), ['Target.getTargets', 'Page.getNavigationHistory', 'Page.navigateToHistoryEntry', 'Runtime.evaluate'])
  assert.deepEqual(calls.at(-2), { method: 'Page.navigateToHistoryEntry', params: { entryId: 11 }, sessionId: 's', timeoutMs: 45000 })
})

test('forward attaches only when needed and at either boundary returns moved:false', async () => {
  const { client, calls } = cdpFixture({ currentIndex: 0, attached: false })
  const result = await navigateHistory(client, 1)
  assert.equal(result.url, B)
  assert.deepEqual(calls[1], { method: 'Target.attachToTarget', params: { targetId: 'p', flatten: true }, sessionId: undefined, timeoutMs: undefined })
  for (const [currentIndex, delta] of [[0, -1], [1, 1]]) {
    const fixture = cdpFixture({ currentIndex })
    assert.deepEqual(await navigateHistory(fixture.client, delta), { moved: false, currentIndex, entries: 2 })
    assert.equal(fixture.calls.some(row => row.method === 'Page.navigateToHistoryEntry'), false)
  }
})

test('invalid deltas are rejected before talking to CDP', async () => {
  const { client, calls } = cdpFixture()
  for (const delta of [0, 2, '-1', null, NaN]) {
    await assert.rejects(() => navigateHistory(client, delta), error => error.status === 400 && error.errorId === 'kitesurf.history.body')
  }
  assert.deepEqual(calls, [])
})

test('history navigation awaits completion and propagates failure without replay or closing the socket', async () => {
  let finish
  const waiting = new Promise(resolve => { finish = resolve })
  const fixture = cdpFixture({ onMove: () => waiting })
  let settled = false
  const result = navigateHistory(fixture.client, -1).finally(() => { settled = true })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(settled, false)
  finish({})
  assert.equal((await result).moved, true)
  const failure = new Error('Page.navigateToHistoryEntry timed out')
  const rejected = cdpFixture({ onMove() { throw failure } })
  await assert.rejects(() => navigateHistory(rejected.client, -1), error => error === failure)
  assert.equal(rejected.calls.filter(row => row.method === 'Page.navigateToHistoryEntry').length, 1)
  assert.equal(rejected.client.alive, true)
})

test('a swallowed upstream navigation error cannot report the recorded target as arrival', async () => {
  const fixture = cdpFixture({ actualUrl: B })
  await assert.rejects(() => navigateHistory(fixture.client, -1), error => error.errorId === 'kitesurf.navigate.failed')
})

test('history redirects report the observed page URL, not the recorded destination', async () => {
  const fixture = cdpFixture({ actualUrl: 'https://redirected.example/' })
  assert.equal((await navigateHistory(fixture.client, -1)).url, 'https://redirected.example/')
})

test('missing page is a real driver failure, not a fabricated history success', async () => {
  await assert.rejects(() => navigateHistory({ async send() { return { targetInfos: [] } } }, -1), error => error.errorId === 'kitesurf.elements.empty')
})
