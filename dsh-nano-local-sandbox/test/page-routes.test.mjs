import assert from 'node:assert/strict'
import test from 'node:test'
import { registerRoutes } from '../lib/route-guard.js'
import { ROUTE_TABLE } from '../lib/route-table.js'
import { routeSpecs } from '../src/host/routes.js'

function routesFor(session) {
  const routes = []
  const ctx = {
    get() { return { requestRejection() { return undefined } } },
    webServer: { register(route) { routes.push(route); return () => {} } },
  }
  registerRoutes(ctx, routeSpecs({ session }), { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' })
  return Object.fromEntries(routes.map((route) => [route.path, route]))
}

async function call(route, { method = 'GET', url = route.path, body } = {}) {
  let raw = ''
  const res = { statusCode: 0, end(text) { raw = text } }
  await route.handler({ method, url, body }, res)
  return { status: res.statusCode, body: JSON.parse(raw) }
}

test('pick, targets, network and har read the session CDP client', async () => {
  const session = {
    phase: 'running',
    history: [],
    httpBase: 'http://127.0.0.1:8798',
    network: [{ id: '1', url: 'https://example.com/', method: 'GET', status: 200, at: '2026-11-14T00:00:00Z' }],
    cdp: {
      listen() { return () => {} },
      async send(method) {
        if (method === 'Target.getTargets') return { targetInfos: [{ type: 'page', url: 'https://example.com/', sessionId: 's' }] }
        if (method === 'Runtime.evaluate') return { result: { value: { ok: true, tag: 'p', text: 'Hello' } } }
        return {}
      },
    },
  }
  const routes = routesFor(session)
  const pick = await call(routes['/nano-local-sandbox/pick'], { method: 'POST', body: { selector: 'p' } })
  const targets = await call(routes['/nano-local-sandbox/targets'])
  const network = await call(routes['/nano-local-sandbox/network'])
  const har = await call(routes['/nano-local-sandbox/har'])
  const operations = await call(routes['/nano-local-sandbox/operations'])
  assert.equal(pick.body.tag, 'p')
  assert.equal(targets.body.targetInfos[0].url, 'https://example.com/')
  assert.equal(network.body.entries[0].status, 200)
  assert.equal(har.body.log.entries.length, 1)
  assert.equal(har.body.log.version, '1.2')
  assert.equal(operations.body.entries.length > 0, true)
  assert.equal(JSON.stringify(pick.body).includes('"path"'), false)
})
