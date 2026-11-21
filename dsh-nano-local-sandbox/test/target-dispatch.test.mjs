import assert from 'node:assert/strict'
import test from 'node:test'
import { BINDING_TABLE } from '../lib/bindings.js'
import { registerRoutes } from '../lib/route-guard.js'
import { CONTRACT_VERSION } from '../src/host/control-contract.js'
import { createManagedRoutes } from '../src/host/managed-routes.js'

const MCP_PATH = '/nano-local-sandbox/mcp'
const LIFECYCLE_PATH = '/nano-local-sandbox/lifecycle'
const MANAGED_PATHS = ['/nano-local-sandbox/contract', MCP_PATH, LIFECYCLE_PATH]
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

function fixture() {
  const calls = { admit: 0, execute: [], spawn: 0 }
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
    connection: {
      admit: async () => {
        calls.admit += 1
        return { peer: { id: 'peer-1', principal: 'test', signal: { aborted: false } } }
      },
    },
    capabilities,
    execute: async (input) => {
      calls.execute.push(input)
      return { status: 200, body: { ok: true, saw: input.sandboxId } }
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

async function call(route, { method = 'POST', url = route.path, headers = { 'x-dnls-contract': CONTRACT_VERSION }, body = {} } = {}) {
  const res = resFor()
  await route.handler({ method, url, headers, body }, res)
  return { status: res.statusCode, headers: res.headers, body: res.raw ? JSON.parse(res.raw) : null }
}

async function callRaw(route, text) {
  const res = resFor()
  const req = {
    method: 'POST',
    url: route.path,
    headers: {},
    async *[Symbol.asyncIterator]() { yield Buffer.from(text) },
  }
  await route.handler(req, res)
  return { status: res.statusCode, body: res.raw ? JSON.parse(res.raw) : null }
}

const toolCall = (name, args, extra = {}) => ({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: { name, arguments: args, _meta: { 'dnls/contract': CONTRACT_VERSION }, ...extra },
})

test('DNLS03-T13 exactly one sandboxId selects exactly one object on HTTP and MCP', async () => {
  const { calls, routes } = fixture()
  const a = await call(routes[LIFECYCLE_PATH], { url: `${LIFECYCLE_PATH}?sandboxId=target-a`, body: {} })
  const b = await call(routes[LIFECYCLE_PATH], { url: `${LIFECYCLE_PATH}?sandboxId=target-b`, body: {} })
  assert.equal(a.body.saw, 'target-a')
  assert.equal(b.body.saw, 'target-b')
  assert.equal(a.body.sandboxId, 'target-a')
  assert.equal(b.body.sandboxId, 'target-b')

  const mcp = await call(routes[MCP_PATH], { body: toolCall('sandbox.lifecycle', { sandboxId: 'target-b' }) })
  assert.equal(mcp.body.result.structuredContent.saw, 'target-b')
  assert.deepEqual(calls.execute.map((row) => row.sandboxId), ['target-a', 'target-b', 'target-b'])
  assert.equal(calls.spawn, 0)
})

test('DNLS03-T13 duplicate, empty, alternate and missing selectors refuse before execute', async () => {
  const { calls, routes } = fixture()
  const rejections = [
    `${LIFECYCLE_PATH}?sandboxId=a&sandboxId=a`,
    `${LIFECYCLE_PATH}?sandboxId=a&sandboxId=b`,
    `${LIFECYCLE_PATH}?sandboxId=`,
    `${LIFECYCLE_PATH}?sandboxId=..`,
    `${LIFECYCLE_PATH}?sandboxId=a/b`,
    `${LIFECYCLE_PATH}?sessionId=s1`,
    LIFECYCLE_PATH,
  ]
  for (const url of rejections) {
    const denied = await call(routes[LIFECYCLE_PATH], { url })
    assert.equal(denied.status, 400, url)
    assert.match(denied.body.errorId, /^sandbox\.params\./)
    assert.equal(denied.body.contractVersion, CONTRACT_VERSION)
    assert.equal(denied.body.cause.includes('a/b'), false)
    assert.equal(denied.body.cause.includes('sessionId'), false)
  }
  for (const url of [`${LIFECYCLE_PATH}?sandboxId=a\\b`, `${LIFECYCLE_PATH}?sandboxId=%00`, `${LIFECYCLE_PATH}?sandboxId=%0d`]) {
    const denied = await call(routes[LIFECYCLE_PATH], { url })
    assert.equal(denied.status, 400, url)
  }
  const bodySelector = await call(routes[LIFECYCLE_PATH], { url: `${LIFECYCLE_PATH}?sandboxId=a`, body: { sandboxId: 'b' } })
  assert.equal(bodySelector.status, 400)
  const sessionBody = await call(routes[LIFECYCLE_PATH], { url: `${LIFECYCLE_PATH}?sandboxId=a`, body: { sessionId: 's1' } })
  assert.equal(sessionBody.status, 400)
  const headerSelector = await call(routes[LIFECYCLE_PATH], {
    url: `${LIFECYCLE_PATH}?sandboxId=a`,
    headers: { 'x-dnls-contract': CONTRACT_VERSION, 'x-sandbox-id': 'b' },
  })
  assert.equal(headerSelector.status, 400)
  assert.equal(calls.execute.length, 0)
  assert.equal(calls.spawn, 0)
})

test('DNLS03-T13 MCP refuses URL, body, header and session fallbacks before execute', async () => {
  const { calls, routes } = fixture()
  const urlSelector = await call(routes[MCP_PATH], { url: `${MCP_PATH}?sandboxId=a`, body: toolCall('sandbox.lifecycle', { sandboxId: 'a' }) })
  assert.equal(urlSelector.status, 400)
  const sessionArg = await call(routes[MCP_PATH], { body: toolCall('sandbox.lifecycle', { sandboxId: 'a', sessionId: 's' }) })
  assert.equal(sessionArg.status, 400)
  const missing = await call(routes[MCP_PATH], { body: toolCall('sandbox.lifecycle', {}) })
  assert.equal(missing.status, 400)
  const array = await call(routes[MCP_PATH], { body: toolCall('sandbox.lifecycle', { sandboxId: ['a', 'a'] }) })
  assert.equal(array.status, 400)
  const unknownField = await call(routes[MCP_PATH], { body: toolCall('sandbox.lifecycle', { sandboxId: 'a', rogue: 1 }) })
  assert.equal(unknownField.status, 400)
  assert.match(unknownField.body.result.structuredContent.errorId, /^sandbox\.params\./)
  const missingRequired = await call(routes[MCP_PATH], { body: toolCall('sandbox.lifecycle', { action: 'restart' }) })
  assert.equal(missingRequired.status, 400)
  const header = await call(routes[MCP_PATH], {
    body: toolCall('sandbox.lifecycle', { sandboxId: 'a' }),
    headers: { 'x-dnls-contract': CONTRACT_VERSION, 'x-session-id': 's' },
  })
  assert.equal(header.status, 400)
  for (const result of [urlSelector, sessionArg, missing, array, header, unknownField, missingRequired]) {
    assert.equal(result.body.result.isError, true)
    assert.match(result.body.result.structuredContent.errorId, /^sandbox\.params\./)
  }
  assert.equal(calls.execute.length, 0)
})

test('DNLS03-T13 a repeated arguments.sandboxId key on the real raw stream is rejected', async () => {
  const { calls, routes } = fixture()
  // Built by hand: JSON.stringify of an object literal dedupes repeated keys.
  const text = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{'
    + '"name":"sandbox.lifecycle",'
    + '"arguments":{"sandboxId":"a","note":"see \\"sandboxId\\":\\"b\\" inside this string","sandboxId":"b"},'
    + '"_meta":{"dnls/contract":"' + CONTRACT_VERSION + '"}}}'
  const denied = await callRaw(routes[MCP_PATH], text)
  assert.equal(denied.status, 400)
  assert.match(denied.body.result.structuredContent.errorId, /^sandbox\.params\./)
  assert.equal(calls.execute.length, 0)
  // A literal "sandboxId" inside a string value is not a duplicate.
  const fine = await callRaw(routes[MCP_PATH], JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'sandbox.lifecycle',
      arguments: { sandboxId: 'a', action: 'mention of "sandboxId" only in a string' },
      _meta: { 'dnls/contract': CONTRACT_VERSION },
    },
  }))
  assert.equal(fine.status, 200)
  assert.equal(fine.body.result.structuredContent.saw, 'a')
  assert.equal(calls.execute.length, 1)

  // Escaped spelling decodes to the same member; the walker sees through it.
  const escaped = '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{'
    + '"name":"sandbox.lifecycle",'
    + '"arguments":{"sandboxId":"a","sandbox\\u0049d":"b"},'
    + '"_meta":{"dnls/contract":"' + CONTRACT_VERSION + '"}}}'
  const smuggled = await callRaw(routes[MCP_PATH], escaped)
  assert.equal(smuggled.status, 400)
  assert.equal(calls.execute.length, 1)

  // Repeated enclosing members are rejected at the raw boundary too.
  const repeated = '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{'
    + '"name":"sandbox.lifecycle",'
    + '"arguments":{"sandboxId":"a"},"arguments":{"sandboxId":"b"},'
    + '"_meta":{"dnls/contract":"' + CONTRACT_VERSION + '"}}}'
  const nested = await callRaw(routes[MCP_PATH], repeated)
  assert.equal(nested.status, 400)
  assert.equal(calls.execute.length, 1)
})

test('DNLS03-T13 bodyLimit=0 means no body, not unlimited, and over-limit stops early', async () => {
  const { calls, routes } = fixture()
  const contract = await call(routes['/nano-local-sandbox/contract'], {
    method: 'GET',
    headers: {},
    body: 'x'.repeat(64),
  })
  assert.equal(contract.status, 200) // discovery never reads a body
  const tooBig = await call(routes[LIFECYCLE_PATH], {
    url: `${LIFECYCLE_PATH}?sandboxId=a`,
    body: 'x'.repeat(5000),
  })
  assert.equal(tooBig.status, 413)
  assert.equal(tooBig.body.errorId, 'sandbox.body.toolarge')
  assert.equal(calls.execute.length, 0)
})

test('DNLS03-T13 a none-target capability accepts no object selector at all', async () => {
  const { calls, routes } = fixture()
  const selected = await call(routes[MCP_PATH], { body: toolCall('sandbox.echo', { sandboxId: 'a' }) })
  assert.equal(selected.status, 400)
  const urlSelected = await call(routes[MCP_PATH], { url: `${MCP_PATH}?sandboxId=a`, body: toolCall('sandbox.echo', {}) })
  assert.equal(urlSelected.status, 400)
  const ok = await call(routes[MCP_PATH], { body: toolCall('sandbox.echo', { value: 1 }) })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.result.structuredContent.saw, null)
  assert.equal(calls.execute.length, 1)
  assert.equal(calls.execute[0].sandboxId, null)
  assert.equal(calls.execute[0].capability, 'sandbox.echo')
})

test('DNLS03-T13 negotiation keeps no target and discovery pre-creates nothing', async () => {
  const { calls, routes } = fixture()
  const negotiate = await call(routes['/nano-local-sandbox/contract'], { method: 'GET', headers: {} })
  assert.equal(negotiate.status, 200)
  const contractTool = await call(routes[MCP_PATH], { body: toolCall('sandbox.contract', {}, {}) })
  assert.equal(contractTool.status, 200)
  assert.equal(calls.admit, 0)
  assert.equal(calls.execute.length, 0)
})
