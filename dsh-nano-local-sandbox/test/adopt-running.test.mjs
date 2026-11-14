import assert from 'node:assert/strict'
import test from 'node:test'
import { publishedHttpBase } from '../src/host/backend-apple.js'
import { registerRoutes } from '../lib/route-guard.js'
import { ROUTE_TABLE } from '../lib/route-table.js'
import { routeSpecs } from '../src/host/routes.js'

test('inspect JSON yields the loopback host port for the engine', () => {
  const raw = JSON.stringify([{ configuration: { publishedPorts: [
    { containerPort: 8787, hostAddress: '127.0.0.1', hostPort: 8798, proto: 'tcp' },
    { containerPort: 8791, hostAddress: '127.0.0.1', hostPort: 8799, proto: 'tcp' },
  ] } }])
  assert.equal(publishedHttpBase(`Warning\n${raw}`), 'http://127.0.0.1:8798')
  assert.equal(publishedHttpBase('not json'), null)
})

test('an idle session adopts a running container inspect', async () => {
  const session = { phase: 'idle', history: [], containerName: 'kitesurf' }
  const routes = []
  const ctx = {
    get() { return { requestRejection() { return undefined } } },
    webServer: { register(route) { routes.push(route); return () => {} } },
  }
  registerRoutes(ctx, routeSpecs({
    session,
    backend: { async inspect() { return { raw: JSON.stringify([{ configuration: { publishedPorts: [{ containerPort: 8787, hostAddress: '127.0.0.1', hostPort: 8798 }] } }]) } } },
  }), { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' })
  const status = routes.find((route) => route.path.endsWith('/status'))
  let raw = ''
  const res = { statusCode: 0, end(text) { raw = text } }
  await status.handler({ method: 'GET', url: '/nano-local-sandbox/status' }, res)
  const body = JSON.parse(raw)
  assert.equal(body.kite.phase, 'running')
  assert.equal(body.httpBase, 'http://127.0.0.1:8798')
  assert.equal(session.phase, 'running')
})
