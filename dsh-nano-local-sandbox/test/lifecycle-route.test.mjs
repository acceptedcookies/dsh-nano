import assert from 'node:assert/strict'
import test from 'node:test'
import { registerRoutes } from '../lib/route-guard.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BINDING_TABLE } from '../lib/bindings.js'
import { routeSpecs } from '../src/host/routes.js'

function routesFor(session, backend, extra = {}) {
  const routes = []
  const ctx = {
    get(name) {
      if (name === 'webServer') return this.webServer
      return { requestRejection() { return undefined } }
    },
    webServer: { register(route) { routes.push(route); return () => {} } },
  }
  registerRoutes(ctx, routeSpecs({ session, backend, ...extra }), { table: BINDING_TABLE, plugin: 'dsh-nano-local-sandbox' })
  return Object.fromEntries(routes.map((route) => [route.path, route]))
}

async function call(route, { method = 'GET', url = route.path, body } = {}) {
  let raw = ''
  const res = { statusCode: 0, end(text) { raw = text } }
  await route.handler({ method, url, body }, res)
  return { status: res.statusCode, body: JSON.parse(raw) }
}

test('lifecycle suspend and resume follow the running session and history stays off workerd-kv', async (t) => {
  const state = mkdtempSync(join(tmpdir(), 'dnls-lifecycle-'))
  t.after(() => rmSync(state, { recursive: true, force: true }))
  const stops = []
  const session = { phase: 'running', history: [], containerName: 'dnls-a' }
  let liveState = 'running'
  const routes = routesFor(session, {
    async stop(name) { stops.push(name); liveState = 'stopped' },
    async start(name) { stops.push(`start:${name}`); liveState = 'running' },
    // A successful /open now needs the engine's actual published tuple; the
    // session.cdp client is what the route talks to after that proof.
    async inspect() {
      return { raw: JSON.stringify([{ status: { state: liveState }, configuration: { publishedPorts: [
        { containerPort: 8787, hostPort: 48798, hostAddress: '127.0.0.1' },
      ] } }]) }
    },
  }, {
    prepareTimeoutMs: 0,
    env: { DNLS_STATE_ROOT: state },
    httpProbe: () => false,
    connect: async () => ({ alive: true, probedAt: Date.now(), async send(method) {
      if (method === 'Target.getTargets') return { targetInfos: [{ type: 'page', targetId: 'p', sessionId: 's' }] }
      return {}
    } }),
  })
  const opened = await call(routes['/nano-local-sandbox/open'], { method: 'POST', body: { url: 'https://example.com' } })
  assert.equal(opened.body.ok, true)
  const suspended = await call(routes['/nano-local-sandbox/lifecycle'], { method: 'POST', body: { action: 'suspend' } })
  const mid = await call(routes['/nano-local-sandbox/status'])
  const resumed = await call(routes['/nano-local-sandbox/lifecycle'], { method: 'POST', body: { action: 'resume' } })
  const after = await call(routes['/nano-local-sandbox/status'])
  const history = await call(routes['/nano-local-sandbox/browse-history'], { url: '/nano-local-sandbox/browse-history?limit=5' })
  const selftest = await call(routes['/nano-local-sandbox/selftest'])
  assert.equal(suspended.body.ok, true)
  assert.equal(mid.body.lifecycle.phase, 'suspended')
  assert.equal(resumed.body.ok, true)
  assert.equal(after.body.lifecycle.phase, 'running')
  assert.equal(after.body.ok, true)
  assert.deepEqual(stops, ['dnls-a', 'start:dnls-a'])
  assert.equal(history.body.source, 'instance-state')
  assert.equal(history.body.entries.length, 1)
  // /selftest is 11 real probes now (profile.yaml `health.selftest: 11`).
  // This fixture has no container and no engine, so it must report failures
  // rather than the old hard-coded ok:true.
  assert.equal(selftest.body.total, 11)
  assert.equal(selftest.body.checks.length, 11)
  assert.equal(selftest.body.ok, true)
  assert.equal(selftest.body.passed, false)
  assert.equal(selftest.body.failed > 0, true)
  assert.equal(selftest.body.v, 1)
  assert.equal(Array.isArray(selftest.body.degraded), true)
  assert.equal(selftest.body.snapshot?.v, 1)
})
