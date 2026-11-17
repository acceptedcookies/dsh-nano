import assert from 'node:assert/strict'
import test from 'node:test'
import { routeSpecs } from '../src/host/routes.js'

function networkRoute(session) {
  return routeSpecs({ session }).find((row) => row.path.endsWith('/network'))
}

async function call(route, { method = 'GET', url = route.path, body = {} } = {}) {
  let raw = ''
  const res = { statusCode: 0, end(text) { raw = text } }
  await route.handler({ method, url, body }, res)
  return { status: res.statusCode, body: JSON.parse(raw) }
}

const rows = [
  { id: 'a', url: 'https://example.com/', method: 'GET', type: 'Document', startedAt: 100, status: 200, size: 10, durationMs: 5 },
  { id: 'b', url: 'https://example.com/app.js', method: 'GET', type: 'Script', startedAt: 200, status: 200, size: 20, durationMs: 6 },
  { id: 'c', url: 'https://example.com/fail', method: 'POST', type: 'Fetch', startedAt: 300, failed: true, status: 404, size: 0, durationMs: 7 },
]

test('the network route filters failed rows, applies since/limit, and keeps gap markers out', async () => {
  const route = networkRoute({ network: [rows[0], { gap: true, at: 'x' }, rows[1], rows[2]] })
  const all = await call(route, { url: `${route.path}?limit=2` })
  assert.deepEqual(all.body.entries.map((row) => row.id), ['b', 'c'])
  const failed = await call(route, { url: `${route.path}?failedOnly=true` })
  assert.deepEqual(failed.body.entries.map((row) => row.id), ['c'])
  const since = await call(route, { url: `${route.path}?since=150` })
  assert.deepEqual(since.body.entries.map((row) => row.id), ['b', 'c'])
})

test('the network clear action empties the driver ring', async () => {
  const session = { network: [...rows] }
  const route = networkRoute(session)
  assert.deepEqual((await call(route, { method: 'POST', body: { clear: true } })).body, { ok: true, cleared: true })
  assert.deepEqual(session.network, [])
})

test('the network list omits detail-only headers and payloads', async () => {
  const route = networkRoute({ network: [{ ...rows[0], requestHeaders: { Authorization: 'secret' }, responseHeaders: { 'X-A': '1' }, postData: 'a=1' }] })
  const result = await call(route, { url: `${route.path}?limit=10` })
  assert.equal(result.body.entries[0].requestHeaders, undefined)
  assert.equal(result.body.entries[0].responseHeaders, undefined)
  assert.equal(result.body.entries[0].postData, undefined)
})

test('the network detail route reports a missing request without touching the engine', async () => {
  const route = networkRoute({ network: [] })
  const result = await call(route, { url: `${route.path}?id=missing` })
  assert.equal(result.status, 404)
  assert.equal(result.body.errorId, 'kitesurf.network.missing')
})
