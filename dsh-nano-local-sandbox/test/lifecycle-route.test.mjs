import assert from 'node:assert/strict'
import test from 'node:test'
import { registerRoutes } from '../lib/route-guard.js'
import { ROUTE_TABLE } from '../lib/route-table.js'
import { routeSpecs } from '../src/host/routes.js'

function routesFor(session, backend) {
  const routes = []
  const ctx = {
    get() { return { requestRejection() { return undefined } } },
    webServer: { register(route) { routes.push(route); return () => {} } },
  }
  registerRoutes(ctx, routeSpecs({ session, backend }), { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' })
  return Object.fromEntries(routes.map((route) => [route.path, route]))
}

async function call(route, { method = 'GET', url = route.path, body } = {}) {
  let raw = ''
  const res = { statusCode: 0, end(text) { raw = text } }
  await route.handler({ method, url, body }, res)
  return { status: res.statusCode, body: JSON.parse(raw) }
}

test('kite suspend and resume follow the running session and history stays off workerd-kv', async () => {
  const stops = []
  const session = { phase: 'running', history: [], containerName: 'dnls-a' }
  const routes = routesFor(session, { async stop(name) { stops.push(name) }, async start(name) { stops.push(`start:${name}`) } })
  const opened = await call(routes['/nano-local-sandbox/open'], { method: 'POST', body: { url: 'https://example.com' } })
  assert.equal(opened.body.ok, true)
  const suspended = await call(routes['/nano-local-sandbox/kite'], { method: 'POST', body: { action: 'suspend' } })
  const mid = await call(routes['/nano-local-sandbox/status'])
  const resumed = await call(routes['/nano-local-sandbox/kite'], { method: 'POST', body: { action: 'resume' } })
  const after = await call(routes['/nano-local-sandbox/status'])
  const history = await call(routes['/nano-local-sandbox/browse-history'], { url: '/nano-local-sandbox/browse-history?limit=5' })
  const selftest = await call(routes['/nano-local-sandbox/selftest'])
  assert.equal(suspended.body.ok, true)
  assert.equal(mid.body.kite.phase, 'suspended')
  assert.equal(resumed.body.ok, true)
  assert.equal(after.body.kite.phase, 'running')
  assert.equal(after.body.ok, true)
  assert.deepEqual(stops, ['dnls-a', 'start:dnls-a'])
  assert.equal(history.body.source, 'plugin-store')
  assert.equal(history.body.entries.length, 1)
  assert.equal(selftest.body.ok, true)
  assert.equal(selftest.body.failed, 0)
})
