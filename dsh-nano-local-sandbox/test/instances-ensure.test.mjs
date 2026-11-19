import assert from 'node:assert/strict'
import test from 'node:test'
import { createUseBindings } from '../src/host/instance-registry.js'
import { registerRoutes } from '../lib/route-guard.js'
import { BINDING_TABLE } from '../lib/bindings.js'
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
  registerRoutes(ctxFor(routes), routeSpecs(deps), { table: BINDING_TABLE, plugin: 'dsh-nano-local-sandbox' })
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

test('sandbox.instance.ensure with a sessionId indexes the env container and invents no terminal endpoint', async () => {
  const backend = recordingBackend()
  const routes = routesFor(baseDeps(backend))
  const answer = await tool(routes, 'sandbox.instance.ensure', {
    sessionId: 'sess-a',
    policy: { mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [] },
  })
  assert.equal(answer.ok, true)
  assert.equal(answer.data.sessionId, 'sess-a')
  assert.equal(answer.data.containerName, 'kitesurf-dev')
  assert.equal(backend.calls.create.length, 0)
  assert.equal(Object.hasOwn(answer.data.endpoints, 'terminal'), false)
  assert.equal(JSON.stringify(answer.data).includes('20000'), false)
})

test('two sessions index the same env container', async () => {
  const backend = recordingBackend()
  const routes = routesFor(baseDeps(backend))
  const policy = { mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [] }
  const a = await tool(routes, 'sandbox.instance.ensure', { sessionId: 'sess-a', policy })
  const b = await tool(routes, 'sandbox.instance.ensure', { sessionId: 'sess-b', policy })
  assert.equal(a.data.containerName, b.data.containerName)
  assert.equal(a.data.endpoints.engine, b.data.endpoints.engine)
  assert.equal(backend.calls.create.length, 0)
})

test('each session gets its own instance record and fingerprint over the shared container', async () => {
  const backend = recordingBackend()
  const routes = routesFor(baseDeps(backend))
  const a = await tool(routes, 'sandbox.instance.ensure', {
    sessionId: 'sess-a',
    policy: { mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [] },
  })
  const b = await tool(routes, 'sandbox.instance.ensure', {
    sessionId: 'sess-b',
    policy: { mode: 'workspace-write', workspaceRoot: '/work/b', extraRoots: [] },
  })
  assert.notEqual(a.data.instanceId, b.data.instanceId)
  assert.notEqual(a.data.policyFingerprint, b.data.policyFingerprint)
  assert.equal(a.data.containerName, b.data.containerName)
  const listed = await tool(routes, 'sandbox.instance.status')
  assert.equal(typeof listed, 'object')
  assert.equal(backend.calls.create.length, 0)
})

test('the same session reuses its instance instead of creating a second container', async () => {
  const backend = recordingBackend()
  const routes = routesFor(baseDeps(backend))
  const policy = { mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [] }
  const first = await tool(routes, 'sandbox.instance.ensure', { sessionId: 'sess-a', policy })
  const second = await tool(routes, 'sandbox.instance.ensure', { sessionId: 'sess-a', policy })
  assert.equal(first.data.instanceId, second.data.instanceId)
  assert.equal(backend.calls.create.length, 0)
})

test('a changed policy fingerprint is refused, not hot-remounted', async () => {
  const backend = recordingBackend()
  const routes = routesFor(baseDeps(backend))
  await tool(routes, 'sandbox.instance.ensure', { sessionId: 'sess-a', policy: { mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [] } })
  const stale = await tool(routes, 'sandbox.instance.ensure', { sessionId: 'sess-a', policy: { mode: 'read-only', workspaceRoot: '/work/a', extraRoots: [] } })
  assert.equal(stale.ok, false)
  assert.equal(stale.errorId, 'sandbox.instance.policy-stale')
  assert.equal(backend.calls.create.length, 0)
  assert.equal(JSON.stringify(stale).includes('ws://'), false)
})

test('the tool catalog still advertises every instance tool', async () => {
  const routes = routesFor(baseDeps(recordingBackend()))
  const listed = await call(routes['/nano-local-sandbox/mcp'], { method: 'POST', body: { jsonrpc: '2.0', id: 1, method: 'tools/list' } })
  const names = listed.body.result.tools.map((row) => row.name)
  for (const name of ['sandbox.instance.ensure', 'sandbox.instance.start', 'sandbox.instance.stop', 'sandbox.instance.restart', 'sandbox.instance.status']) {
    assert.equal(names.includes(name), true, name)
  }
})

// DNLS03-T02: object-targeted use bindings over the managed control ledger.
// Session and locator are never lookup keys; the ledger row is the identity.
function spyingRegistry(row) {
  const seen = []
  return {
    seen,
    get(id) {
      seen.push(id)
      return id === row?.sandboxId ? row : null
    },
  }
}

const sandboxRow = {
  sandboxId: 'sb-0001',
  name: 'alpha',
  profileId: 'kitesurf',
  principal: 'owner:test',
  recipeRef: 'recipe@1',
  origin: 'created',
  stateVolume: '/state/kitesurf/sb-0001',
  binding: { locator: 'dnls-0001', generation: 'gen-1' },
  ports: [],
}

const usePolicy = (over = {}) => ({ mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [], ...over })

test('DNLS03-T02 two sessions bind the same object row under one sandboxId', () => {
  const registry = spyingRegistry(sandboxRow)
  const bindings = createUseBindings(registry)
  const a = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-a', policy: usePolicy() })
  const b = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-b', policy: usePolicy() })
  assert.equal(a.ok, true)
  assert.equal(b.ok, true)
  assert.equal(a.use.sandboxId, 'sb-0001')
  assert.equal(b.use.sandboxId, 'sb-0001')
  assert.notEqual(a.use.sessionId, b.use.sessionId)
  assert.equal(bindings.list('sb-0001').length, 2)
  for (const key of registry.seen) assert.equal(key, 'sb-0001')
})

test('DNLS03-T02 the same session reuses its own use binding', () => {
  const registry = spyingRegistry(sandboxRow)
  const bindings = createUseBindings(registry)
  const first = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-a', policy: usePolicy() })
  const second = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-a', policy: usePolicy() })
  assert.equal(first.status, 201)
  assert.equal(second.status, 200)
  assert.equal(bindings.list('sb-0001').length, 1)
})

test('DNLS03-T02 no lookup happens by session guess or by locator', () => {
  const registry = spyingRegistry(sandboxRow)
  const bindings = createUseBindings(registry)
  const missing = bindings.ensure({ sessionId: 'sess-a', policy: usePolicy() })
  assert.equal(missing.ok, false)
  assert.equal(registry.seen.length, 0)
  const locatorGuess = bindings.ensure({ sandboxId: 'dnls-0001', sessionId: 'sess-a', policy: usePolicy() })
  assert.equal(locatorGuess.ok, false)
  assert.equal(locatorGuess.status, 404)
  assert.deepEqual(registry.seen, ['dnls-0001'])
})

test('DNLS03-T02 release drops only that use and the object row is untouched', () => {
  const registry = spyingRegistry(sandboxRow)
  const bindings = createUseBindings(registry)
  bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-a', policy: usePolicy() })
  bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-b', policy: usePolicy() })
  assert.equal(bindings.release({ sandboxId: 'sb-0001', sessionId: 'sess-a' }), true)
  assert.equal(bindings.list('sb-0001').length, 1)
  assert.equal(bindings.list('sb-0001')[0].sessionId, 'sess-b')
  const kept = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-b', policy: usePolicy() })
  assert.equal(kept.status, 200)
  assert.equal(bindings.release({ sandboxId: 'sb-0001', sessionId: 'sess-b' }), true)
  assert.equal(bindings.release({ sandboxId: 'sb-0001', sessionId: 'sess-b' }), false)
  const reopened = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-c', policy: usePolicy() })
  assert.equal(reopened.status, 201)
  assert.equal(reopened.sandbox.sandboxId, 'sb-0001')
})

test('DNLS03-T02 a changed policy on the same use is refused, not rebound', () => {
  const registry = spyingRegistry(sandboxRow)
  const bindings = createUseBindings(registry)
  bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-a', policy: usePolicy() })
  const stale = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-a', policy: usePolicy({ mode: 'read-only' }) })
  assert.equal(stale.ok, false)
  assert.equal(stale.errorId, 'sandbox.instance.policy-stale')
  assert.equal(bindings.list('sb-0001').length, 1)
})

test('DNLS03-T02 an unknown sandboxId is a clean refusal, not a claim', () => {
  const registry = spyingRegistry(null)
  const bindings = createUseBindings(registry)
  const answer = bindings.ensure({ sandboxId: 'sb-nope', sessionId: 'sess-a', policy: usePolicy() })
  assert.equal(answer.ok, false)
  assert.equal(answer.status, 404)
  assert.deepEqual(registry.seen, ['sb-nope'])
})
