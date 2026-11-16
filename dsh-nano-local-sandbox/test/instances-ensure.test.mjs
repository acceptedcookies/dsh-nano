import assert from 'node:assert/strict'
import test from 'node:test'
import { registerRoutes } from '../lib/route-guard.js'
import { ROUTE_TABLE } from '../lib/route-table.js'
import { routeSpecs } from '../src/host/routes.js'

function ctxFor(routes) {
  return {
    get(name) {
      if (name === 'webServer') return this.webServer
      return { requestRejection() { return undefined } }
    },
    webServer: { register(route) { routes.push(route); return () => {} } },
  }
}

function routesFor(deps) {
  const routes = []
  registerRoutes(ctxFor(routes), routeSpecs(deps), { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' })
  return Object.fromEntries(routes.map((route) => [route.path, route]))
}

async function call(route, { method = 'GET', url = route.path, body } = {}) {
  let raw = ''
  const res = { statusCode: 0, end(text) { raw = text } }
  await route.handler({ method, url, body }, res)
  return { status: res.statusCode, body: raw ? JSON.parse(raw) : null }
}

/** Call a declared sandbox tool through the real /mcp JSON-RPC plane. */
async function tool(routes, name, args = {}) {
  const result = await call(routes['/nano-local-sandbox/mcp'], {
    method: 'POST',
    body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
  })
  return result.body.result
}

function recordingBackend() {
  const calls = { create: [], start: [], stop: [] }
  return {
    calls,
    async create(instance) { calls.create.push(instance); return { id: instance.containerName, started: true } },
    async start(name) { calls.start.push(name); return { ok: true } },
    async stop(name) { calls.stop.push(name); return { ok: true } },
    async inspect() { return { raw: JSON.stringify([{ status: { state: 'running' }, configuration: { publishedPorts: [] } }]) } },
  }
}

const baseDeps = (backend) => ({
  session: { phase: 'idle', history: [], containerName: '' },
  backend,
  env: { DSH_HOME: '/tmp/.dsh-dev', KITESURF_CHECKOUT: '/tmp/checkout' },
  prepareTimeoutMs: 0,
})

test('sandbox.instance.ensure without a sessionId keeps the env-scoped container', async () => {
  const backend = recordingBackend()
  const routes = routesFor(baseDeps(backend))
  const answer = await tool(routes, 'sandbox.instance.ensure', {})
  assert.equal(answer.ok, true)
  assert.equal(answer.data.containerName, 'kitesurf-dev')
  assert.equal(backend.calls.create.length, 0)
})

test('sandbox.instance.ensure with a sessionId provisions its own container and port pair', async () => {
  const backend = recordingBackend()
  const routes = routesFor(baseDeps(backend))
  const answer = await tool(routes, 'sandbox.instance.ensure', {
    sessionId: 'sess-a',
    policy: { mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [] },
  })
  assert.equal(answer.ok, true)
  assert.equal(answer.data.sessionId, 'sess-a')
  assert.equal(answer.data.containerName.startsWith('dnls-'), true)
  assert.equal(backend.calls.create.length, 1)
  const created = backend.calls.create[0]
  // The registry's bare default (no image, no ports) would be unusable; the
  // kitesurf hooks must supply the runtime image and both published ports.
  assert.equal(created.image, 'kitesurf-engine:latest')
  assert.equal(created.ports.length, 2)
  assert.equal(created.ports[0].publish.endsWith(':8787'), true)
  assert.equal(created.ports[1].publish.endsWith(':8791'), true)
  assert.equal(created.mounts.some((row) => row.arg.includes('target=/opt/kitesurf')), true)
  assert.equal(created.mounts.some((row) => row.arg.includes('target=/var/lib/kitesurf-state')), true)
  assert.equal(backend.calls.start.includes(answer.data.containerName), true)
})

test('two sessions get two containers and two distinct port pairs', async () => {
  const backend = recordingBackend()
  const routes = routesFor(baseDeps(backend))
  const a = await tool(routes, 'sandbox.instance.ensure', { sessionId: 'sess-a', policy: { mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [] } })
  const b = await tool(routes, 'sandbox.instance.ensure', { sessionId: 'sess-b', policy: { mode: 'workspace-write', workspaceRoot: '/work/b', extraRoots: [] } })
  assert.notEqual(a.data.containerName, b.data.containerName)
  assert.notEqual(a.data.endpoints.engine, b.data.endpoints.engine)
  assert.equal(backend.calls.create.length, 2)
})

test('the same session reuses its instance instead of creating a second container', async () => {
  const backend = recordingBackend()
  const routes = routesFor(baseDeps(backend))
  const policy = { mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [] }
  const first = await tool(routes, 'sandbox.instance.ensure', { sessionId: 'sess-a', policy })
  const second = await tool(routes, 'sandbox.instance.ensure', { sessionId: 'sess-a', policy })
  assert.equal(first.data.instanceId, second.data.instanceId)
  assert.equal(backend.calls.create.length, 1)
})

test('a changed policy fingerprint is refused, not hot-remounted', async () => {
  const backend = recordingBackend()
  const routes = routesFor(baseDeps(backend))
  await tool(routes, 'sandbox.instance.ensure', { sessionId: 'sess-a', policy: { mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [] } })
  const stale = await tool(routes, 'sandbox.instance.ensure', { sessionId: 'sess-a', policy: { mode: 'read-only', workspaceRoot: '/work/a', extraRoots: [] } })
  assert.equal(stale.ok, false)
  assert.equal(stale.errorId, 'sandbox.instance.policy-stale')
  assert.equal(backend.calls.create.length, 1)
})

test('the tool catalog still advertises every instance tool', async () => {
  const routes = routesFor(baseDeps(recordingBackend()))
  const listed = await call(routes['/nano-local-sandbox/mcp'], { method: 'POST', body: { jsonrpc: '2.0', id: 1, method: 'tools/list' } })
  const names = listed.body.result.tools.map((row) => row.name)
  for (const name of ['sandbox.instance.ensure', 'sandbox.instance.start', 'sandbox.instance.stop', 'sandbox.instance.restart', 'sandbox.instance.status']) {
    assert.equal(names.includes(name), true, name)
  }
})
