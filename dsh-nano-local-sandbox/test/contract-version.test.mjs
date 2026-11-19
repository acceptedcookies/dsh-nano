import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { BINDING_TABLE } from '../lib/bindings.js'
import { createGuard, registerRoutes } from '../lib/route-guard.js'
import { CONTRACT_VERSION, discovery } from '../src/host/control-contract.js'
import { createErrorCatalog, registerDriverErrors } from '../src/host/error-catalog.js'
import { createManagedRoutes } from '../src/host/managed-routes.js'

const CONTRACT_PATH = '/nano-local-sandbox/contract'
const MCP_PATH = '/nano-local-sandbox/mcp'
const LIFECYCLE_PATH = '/nano-local-sandbox/lifecycle'
const MANAGED_PATHS = [CONTRACT_PATH, MCP_PATH, LIFECYCLE_PATH]
const managedTable = () => BINDING_TABLE.filter((row) => MANAGED_PATHS.includes(row.path))

function ctxFor(routes) {
  return {
    get(name) {
      if (name === 'webServer') return this.webServer
      return { requestRejection() { return undefined } }
    },
    webServer: { register(route) { routes.push(route); return () => {} } },
  }
}

const PEER = { id: 'peer-1', principal: 'test', signal: { aborted: false } }

function fixture({ connection, execute } = {}) {
  const calls = { admit: [], execute: [] }
  const conn = connection ?? {
    admit: async (req) => {
      calls.admit.push(req)
      return { peer: PEER }
    },
  }
  const capabilities = new Map([
    ['sandbox.lifecycle', {
      http: { path: LIFECYCLE_PATH, methods: ['POST'] },
      tool: {
        name: 'sandbox.lifecycle',
        description: 'lifecycle',
        inputSchema: {
          type: 'object',
          properties: { sandboxId: { type: 'string' }, action: { type: 'string' } },
          required: ['sandboxId'],
          additionalProperties: false,
        },
      },
      target: 'object',
    }],
    ['sandbox.echo', {
      tool: { name: 'sandbox.echo', description: 'echo', inputSchema: { type: 'object' } },
      target: 'none',
    }],
  ])
  const specs = createManagedRoutes({
    table: managedTable(),
    connection: conn,
    capabilities,
    execute: async (input) => {
      calls.execute.push(input)
      if (execute) return execute(input)
      return { status: 200, body: { ok: true, capability: input.capability } }
    },
  })
  const routes = []
  registerRoutes(ctxFor(routes), specs, { table: managedTable(), plugin: 'dsh-nano-local-sandbox' })
  return { calls, routes: Object.fromEntries(routes.map((route) => [route.path, route])) }
}

function resFor() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(text) { this.raw = text },
  }
}

async function call(route, { method = 'GET', url = route.path, headers = {}, body } = {}) {
  const res = resFor()
  await route.handler({ method, url, headers, body }, res)
  return { status: res.statusCode, headers: res.headers, body: res.raw ? JSON.parse(res.raw) : null }
}

async function callRaw(route, { method = 'POST', url = route.path, headers = {}, text }) {
  const res = resFor()
  const req = {
    method,
    url,
    headers,
    async *[Symbol.asyncIterator]() { yield Buffer.from(text) },
  }
  await route.handler(req, res)
  return { status: res.statusCode, headers: res.headers, body: res.raw ? JSON.parse(res.raw) : null }
}

const versioned = { 'x-dnls-contract': CONTRACT_VERSION }
const packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
const toolCall = (name, args, meta = { 'dnls/contract': CONTRACT_VERSION }, id = 1) => ({
  jsonrpc: '2.0',
  id,
  method: 'tools/call',
  params: { name, arguments: args, _meta: meta },
})

test('DNLS03-T10 discovery is target-less, equal over HTTP and MCP, and touches nothing', async () => {
  const { calls, routes } = fixture()
  const http = await call(routes[CONTRACT_PATH])
  assert.equal(http.status, 200)
  assert.deepEqual(http.body, { contractVersion: CONTRACT_VERSION, capabilities: ['sandbox.lifecycle', 'sandbox.echo'] })
  assert.equal(http.headers['x-dnls-contract'], CONTRACT_VERSION)

  const head = await call(routes[CONTRACT_PATH], { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(head.body, null)
  assert.equal(head.headers['x-dnls-contract'], CONTRACT_VERSION)

  const mcp = await call(routes[MCP_PATH], {
    method: 'POST',
    body: toolCall('sandbox.contract', {}, {}),
  })
  assert.equal(mcp.status, 200)
  assert.deepEqual(mcp.body.result.structuredContent, http.body)
  assert.equal(mcp.body.result.isError, false)
  // Discovery grants nothing: no admission, no owner call, no object.
  assert.equal(calls.admit.length, 0)
  assert.equal(calls.execute.length, 0)
})

test('DNLS03-T10 tools/list, initialize, ping, notifications and unknown methods stay router-owned', async () => {
  const { calls, routes } = fixture()
  const list = await call(routes[MCP_PATH], { method: 'POST', body: { jsonrpc: '2.0', id: 1, method: 'tools/list' } })
  const names = list.body.result.tools.map((row) => row.name).sort()
  assert.deepEqual(names, ['sandbox.contract', 'sandbox.echo', 'sandbox.lifecycle'])
  for (const tool of list.body.result.tools) {
    assert.equal(typeof tool.description, 'string')
    assert.equal(typeof tool.inputSchema, 'object')
  }

  const init = await call(routes[MCP_PATH], { method: 'POST', body: { jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2025-03-26' } } })
  assert.equal(init.body.result.protocolVersion, '2025-03-26')
  assert.equal(init.body.result.serverInfo.name, 'dsh-nano-local-sandbox')
  assert.equal(init.body.result.serverInfo.version, packageVersion)
  // Negotiation envelopes are not the contract surface: no contract header.
  assert.equal(init.headers['x-dnls-contract'], undefined)
  const ping = await call(routes[MCP_PATH], { method: 'POST', body: { jsonrpc: '2.0', id: 3, method: 'ping' } })
  assert.deepEqual(ping.body.result, {})
  const notified = await call(routes[MCP_PATH], { method: 'POST', body: { jsonrpc: '2.0', method: 'notifications/initialized' } })
  assert.equal(notified.status, 204)
  const unknown = await call(routes[MCP_PATH], { method: 'POST', body: { jsonrpc: '2.0', id: 4, method: 'nope/method' } })
  assert.equal(unknown.body.error.code, -32601)
  assert.equal(calls.execute.length, 0)
})

test('DNLS03-T11 exactly one matching version is required before object resolution, both channels', async () => {
  const { calls, routes } = fixture()
  const url = `${LIFECYCLE_PATH}?sandboxId=object-a`
  for (const headers of [{}, { 'x-dnls-contract': 'dnls.control/0' }]) {
    const miss = await call(routes[LIFECYCLE_PATH], { method: 'POST', url, headers, body: {} })
    assert.equal(miss.status, 400)
    assert.equal(miss.body.errorId, 'sandbox.contract_mismatch')
    assert.equal(miss.body.status, 400)
    assert.equal(miss.body.contractVersion, CONTRACT_VERSION)
    assert.match(miss.body.next, /contract/)
    assert.equal(miss.body.cause.includes('sandboxId'), false)
    assert.equal(miss.body.cause.includes('object-a'), false)
  }
  const mcp = await call(routes[MCP_PATH], {
    method: 'POST',
    body: toolCall('sandbox.lifecycle', { sandboxId: 'object-a' }, { 'dnls/contract': 'dnls.control/0' }),
  })
  assert.equal(mcp.status, 400)
  assert.equal(mcp.body.result.isError, true)
  assert.equal(mcp.body.result.structuredContent.errorId, 'sandbox.contract_mismatch')
  assert.equal(calls.execute.length, 0)

  const ok = await call(routes[LIFECYCLE_PATH], { method: 'POST', url, headers: versioned, body: { action: 'restart' } })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.sandboxId, 'object-a')
  assert.equal(ok.body.contractVersion, CONTRACT_VERSION)
  assert.equal(calls.execute.length, 1)
  assert.equal(calls.execute[0].sandboxId, 'object-a')
  assert.equal(calls.execute[0].capability, 'sandbox.lifecycle')
  assert.deepEqual(calls.execute[0].args, { action: 'restart' })
  // The owner receives exactly `admission.peer`, not a re-wrapped object.
  assert.equal(calls.execute[0].peer, PEER)
})

test('DNLS03-T11 a correct pair is not permission: admission runs the host envelope', async () => {
  const url = `${LIFECYCLE_PATH}?sandboxId=o`
  const noMethod = fixture({ connection: {} })
  const missing = await call(noMethod.routes[LIFECYCLE_PATH], { method: 'POST', url, headers: versioned, body: {} })
  assert.equal(missing.status, 503)
  assert.equal(missing.body.error, 'host admission unavailable')
  assert.equal(noMethod.calls.execute.length, 0)

  const aborted = new AbortController()
  aborted.abort()
  for (const [envelope, want] of [
    [{ rejection: 403 }, 403],
    [{ rejection: 401 }, 401],
    [{ peer: {} }, 403],
    [{ peer: { principal: null } }, 403],
    [{ peer: { principal: 'test', signal: aborted.signal } }, 403],
    [{ unknown: true }, 503],
  ]) {
    const denied = fixture({ connection: { admit: async () => envelope } })
    const refused = await call(denied.routes[LIFECYCLE_PATH], { method: 'POST', url, headers: versioned, body: {} })
    assert.equal(refused.status, want, JSON.stringify(envelope))
    assert.equal(refused.body.contractVersion, CONTRACT_VERSION)
    // A denied or malformed envelope never invokes the owner.
    assert.equal(denied.calls.execute.length, 0)
  }

  const thrown = fixture({ connection: { admit: async () => { throw new Error('mount=/secret/vol') } } })
  const failed = await call(thrown.routes[MCP_PATH], {
    method: 'POST',
    body: toolCall('sandbox.lifecycle', { sandboxId: 'o' }),
  })
  assert.equal(failed.status, 503)
  assert.equal(failed.body.result.structuredContent.errorId, undefined)
  assert.equal(JSON.stringify(failed.body).includes('/secret/vol'), false)
  assert.equal(thrown.calls.execute.length, 0)
})

test('DNLS03-T11 execute sees HTTP 202 honored and the same payload shape over MCP', async () => {
  const { calls, routes } = fixture({
    execute: async (input) => ({ status: 202, body: { ok: true, accepted: true, operation: `op-${input.sandboxId}` } }),
  })
  const http = await call(routes[LIFECYCLE_PATH], { method: 'POST', url: `${LIFECYCLE_PATH}?sandboxId=o`, headers: versioned, body: {} })
  assert.equal(http.status, 202)
  assert.equal(http.body.contractVersion, CONTRACT_VERSION)
  assert.equal(http.body.sandboxId, 'o')

  const mcp = await call(routes[MCP_PATH], { method: 'POST', body: toolCall('sandbox.lifecycle', { sandboxId: 'o' }) })
  assert.equal(mcp.status, 202)
  assert.equal(mcp.body.result.isError, false)
  assert.deepEqual(mcp.body.result.structuredContent, http.body)
  assert.equal(JSON.parse(mcp.body.result.content[0].text).operation, 'op-o')
  assert.equal(calls.execute.length, 2)
})

test('DNLS03-T11 the seven fixed error ids carry fixed status, cause and next', async () => {
  const catalog = createErrorCatalog()
  const expected = {
    'sandbox.contract_mismatch': 400,
    'sandbox.name_taken': 409,
    'sandbox.port_exhausted': 409,
    'sandbox.quota': 409,
    'sandbox.state_conflict': 409,
    'sandbox.image_missing': 409,
    'sandbox.upgrade_failed': 500,
  }
  for (const [errorId, status] of Object.entries(expected)) {
    assert.equal(catalog.statusOf(errorId), status, errorId)
    const row = catalog.errorCatalog().find((item) => item.example === errorId)
    assert.ok(row, `${errorId} must be a fixed catalog row`)
    assert.equal(row.status, status)
    assert.equal(typeof row.cause, 'string')
    assert.equal(typeof row.next, 'string')
  }
  const { routes } = fixture({
    execute: async () => { throw Object.assign(new Error('taken'), { errorId: 'sandbox.name_taken' }) },
  })
  const hit = await call(routes[LIFECYCLE_PATH], { method: 'POST', url: `${LIFECYCLE_PATH}?sandboxId=o`, headers: versioned, body: {} })
  assert.equal(hit.status, 409)
  assert.equal(hit.body.errorId, 'sandbox.name_taken')
  assert.equal(hit.body.status, 409)
  assert.equal(hit.body.contractVersion, CONTRACT_VERSION)
  assert.equal(typeof hit.body.cause, 'string')
  assert.equal(typeof hit.body.next, 'string')
})

test('DNLS03-T11 thrown detail that is not a catalog id is sanitized, and op refs need a business error', async () => {
  const leak = fixture({
    execute: async () => { throw new Error('mount=/state/secret-vol creds=abc') },
  })
  const raw = await call(leak.routes[LIFECYCLE_PATH], { method: 'POST', url: `${LIFECYCLE_PATH}?sandboxId=o`, headers: versioned, body: {} })
  assert.equal(raw.status, 502)
  assert.equal(raw.body.errorId, undefined)
  assert.equal(raw.body.error, 'internal error')
  assert.equal(JSON.stringify(raw.body).includes('secret-vol'), false)

  const foreign = fixture({
    execute: async () => { throw Object.assign(new Error('x'), { errorId: 'kite.mount.leaked', operation: 'op-secret' }) },
  })
  const dropped = await call(foreign.routes[LIFECYCLE_PATH], { method: 'POST', url: `${LIFECYCLE_PATH}?sandboxId=o`, headers: versioned, body: {} })
  assert.equal(dropped.status, 502)
  assert.equal(dropped.body.errorId, undefined)
  assert.equal(dropped.body.operation, undefined)

  const business = fixture({
    execute: async () => { throw Object.assign(new Error('x'), { errorId: 'sandbox.quota', operation: 'op-9' }) },
  })
  const carried = await call(business.routes[LIFECYCLE_PATH], { method: 'POST', url: `${LIFECYCLE_PATH}?sandboxId=o`, headers: versioned, body: {} })
  assert.equal(carried.status, 409)
  assert.equal(carried.body.errorId, 'sandbox.quota')
  assert.equal(carried.body.operation, 'op-9')
})

test('DNLS03-T11 a success envelope must be object-shaped and must not cross objects', async () => {
  const empty = fixture({ execute: async () => undefined })
  const noResult = await call(empty.routes[LIFECYCLE_PATH], { method: 'POST', url: `${LIFECYCLE_PATH}?sandboxId=a`, headers: versioned, body: {} })
  assert.equal(noResult.status, 502)
  assert.equal(noResult.body.ok, false)

  const crossed = fixture({ execute: async () => ({ ok: true, sandboxId: 'target-b', secretOf: 'b' }) })
  const denied = await call(crossed.routes[LIFECYCLE_PATH], { method: 'POST', url: `${LIFECYCLE_PATH}?sandboxId=target-a`, headers: versioned, body: {} })
  assert.equal(denied.status, 502)
  assert.equal(denied.body.ok, false)
  assert.equal(denied.body.secretOf, undefined)
  assert.equal(JSON.stringify(denied.body).includes('target-b'), false)
})

test('DNLS03-T11 a scoped catalogue cannot be moved by a later driver registration', () => {
  const scoped = createErrorCatalog({ namespace: 'sandbox', rows: [{ code: 'kite.driver', status: 418, cause: 'c', next: 'n' }] })
  const before = scoped.errorCatalog().map((row) => row.example)
  assert.equal(scoped.errorCode('kite.driver'), 'sandbox.kite.driver')
  assert.equal(scoped.statusOf('sandbox.kite.driver'), 418)
  registerDriverErrors({ namespace: 'other', rows: [{ code: 'kite.driver', status: 200, cause: 'x', next: 'y' }] })
  assert.equal(scoped.errorNamespace, 'sandbox')
  assert.equal(scoped.statusOf('sandbox.kite.driver'), 418)
  assert.deepEqual(scoped.errorCatalog().map((row) => row.example), before)
  const other = createErrorCatalog({ namespace: 'other', rows: [] })
  assert.equal(other.errorCode('x'), 'other.x')
  registerDriverErrors({ namespace: 'sandbox', rows: [] })
})

test('DNLS03-T10 the /contract spec is registered through the real guard with the baked row', async () => {
  const { routes } = fixture()
  const guard = createGuard({ table: managedTable(), plugin: 'dsh-nano-local-sandbox' })
  const registered = []
  guard.registerRoutes(ctxFor(registered), createManagedRoutes({
    table: managedTable(),
    connection: { admit: async () => ({ id: 'p' }) },
    capabilities: new Map([
      ['sandbox.lifecycle', { http: { path: LIFECYCLE_PATH }, target: 'object' }],
    ]),
    execute: async () => ({}),
  }))
  const inventory = Object.fromEntries(guard.inventory().map((row) => [row.path, row.id]))
  assert.equal(inventory[CONTRACT_PATH], 'dnls.contract')
  assert.equal(inventory[MCP_PATH], 'dnls.mcp')
  assert.equal(inventory[LIFECYCLE_PATH], 'dnls.lifecycle')
  assert.ok(routes[CONTRACT_PATH])
  assert.deepEqual(discovery(['a', 'b']), { contractVersion: 'dnls.control/1', capabilities: ['a', 'b'] })
})
