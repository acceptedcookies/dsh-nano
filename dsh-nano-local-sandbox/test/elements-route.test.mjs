import assert from 'node:assert/strict'
import test from 'node:test'
import { registerRoutes } from '../lib/route-guard.js'
import { ROUTE_TABLE } from '../lib/route-table.js'
import { routeSpecs } from '../src/host/routes.js'

function host(deps) {
  const routes = []
  const ctx = {
    get() { return { requestRejection() { return undefined } } },
    webServer: { register(route) { routes.push(route); return () => {} } },
  }
  registerRoutes(ctx, routeSpecs(deps), { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' })
  return routes.find((route) => route.path.endsWith('/elements'))
}

async function call(route, url) {
  let body = ''
  const res = { statusCode: 0, end(text) { body = text } }
  await route.handler({ method: 'GET', url }, res)
  return { status: res.statusCode, body: JSON.parse(body) }
}

test('elements returns computed and matched styles from the engine capture', async () => {
  const route = host({
    async captureElements(_base, options) {
      assert.equal(options.selector, 'p')
      return {
        count: 2,
        selector: options.selector,
        computed: { color: 'rgb(0, 0, 0)', display: 'block', fontSize: '16px' },
        matched: { matched: [{ selector: 'p', properties: ['color: black'] }] },
      }
    },
  })
  const result = await call(route, '/nano-local-sandbox/elements?selector=p')
  assert.equal(result.status, 200)
  assert.equal(result.body.ok, true)
  assert.equal(Object.keys(result.body.computed).length > 2, true)
  assert.equal(result.body.matched.matched.length, 1)
})

test('elements without an engine page is JSON 502, not an empty body', async () => {
  const route = host({})
  const result = await call(route, '/nano-local-sandbox/elements?selector=p')
  assert.equal(result.status, 502)
  assert.equal(result.body.ok, false)
  assert.equal(result.body.errorId, 'kitesurf.elements.empty')
})
