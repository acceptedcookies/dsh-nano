/**
 * PRE1116-T01 / T02 / T03 / T04 / T20 — observe closed set and facade exits.
 * T04's "no production injection" is the W1 condition. W3 replaces the
 * allowlist; this file must then list the six contract-surface call sites
 * instead of asserting an empty set. Do not treat a green test-all as T04.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import {
  assertObserveEvent,
  HTTP_OUTCOMES,
  UPGRADE_OUTCOMES,
  JSON_OUTCOMES,
  MCP_OUTCOMES,
  OBSERVE_SURFACES,
  FAILURE_KIND,
} from '../src/contracts/index.js'
import { createWebRegistrar } from '../src/host/createWebRegistrar.js'
import { createJsonClient } from '../src/host/createJsonClient.js'
import { createMcpToolset } from '../src/host/createMcpToolset.js'
import { createGuard } from 'dsh-host-route-guard'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const TOKEN = 'sekret-token-PRE1116'
const PATH_MARK = '/tmp/private-path-PRE1116'
const SESSION_MARK = 'session-PRE1116-should-not-leak'
const QUERY_MARK = 'q=leak-PRE1116'
const HEADER_MARK = 'x-secret-PRE1116'

function baseEvent(over = {}) {
  return { surface: 'http', id: 'dnee.read', plugin: 'dsh-nano-explorer-extra', outcome: 'ok', ms: 1, status: 200, ...over }
}

test('PRE1116-T02 closed sets enumerate and reject unknown surface, outcome, and extra fields', () => {
  assert.deepEqual([...OBSERVE_SURFACES], ['http', 'upgrade', 'json', 'mcp'])
  assert.deepEqual([...HTTP_OUTCOMES], ['ok', 'rejected', 'method', 'failed'])
  assert.deepEqual([...UPGRADE_OUTCOMES], ['accepted', 'rejected', 'method'])
  assert.deepEqual([...MCP_OUTCOMES], ['ok', 'error', 'rejected'])
  assert.ok(JSON_OUTCOMES.includes('ok'))
  for (const kind of ['cancelled', 'transport', 'http', 'protocol', 'domain']) {
    assert.ok(JSON_OUTCOMES.includes(kind), kind)
  }
  assert.equal(assertObserveEvent(baseEvent()).surface, 'http')
  assert.throws(() => assertObserveEvent(baseEvent({ surface: 'ws' })), /unknown surface/)
  assert.throws(() => assertObserveEvent(baseEvent({ outcome: 'accepted' })), /unknown outcome/)
  assert.throws(() => assertObserveEvent(baseEvent({ url: 'http://x' })), /unknown field url/)
  assert.throws(() => assertObserveEvent(baseEvent({ query: 'a' })), /unknown field query/)
  assert.throws(() => assertObserveEvent(baseEvent({ body: 'a' })), /unknown field body/)
  assert.throws(() => assertObserveEvent(baseEvent({ header: 'a' })), /unknown field header/)
  assert.throws(() => assertObserveEvent(baseEvent({ session: 'a' })), /unknown field session/)
  assert.throws(() => assertObserveEvent(baseEvent({ message: TOKEN })), /unknown field message/)
  assert.throws(() => assertObserveEvent(baseEvent({ id: '' })), /id must/)
  assert.throws(() => assertObserveEvent({ surface: 'http', plugin: null, outcome: 'ok', ms: 0 }), /missing id/)
  const mcpErr = { surface: 'mcp', id: 'term.echo', plugin: null, outcome: 'error', ms: 1 }
  assert.throws(() => assertObserveEvent(mcpErr), /mcp error requires kind/)
  assert.equal(assertObserveEvent({ ...mcpErr, kind: 'blocked' }).kind, 'blocked')
})

test('route-guard source does not import dsh-interface', () => {
  const src = readFileSync(join(ROOT, 'packages/dsh-host-route-guard/src/route-guard.js'), 'utf8')
  assert.equal(src.includes('dsh-interface'), false)
  assert.equal(/from\s+['"]node:/.test(src), false)
})

test('observeEvent module source has no node import', () => {
  const src = readFileSync(join(ROOT, 'packages/dsh-interface/src/contracts/observeEvent.js'), 'utf8')
  assert.equal(/from\s+['"]node:/.test(src), false)
  assert.equal(/\bwindow\b|\bdocument\b/.test(src), false)
})

function makeRes() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    writableEnded: false,
    setHeader(k, v) { this.headers[k] = v },
    end(chunk) { this.writableEnded = true; if (chunk !== undefined) this.body += chunk },
  }
}

function snap(res) {
  const headers = Object.entries(res.headers).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
  return { status: res.statusCode, headers, body: res.body }
}

function makeReq(method = 'POST') {
  const req = Readable.from([])
  req.method = method
  req.headers = { 'x-token': HEADER_MARK }
  req.url = `/nano-x/read?${QUERY_MARK}`
  return req
}

const TABLE = [
  {
    id: 'dnee.read',
    path: '/nano-x/read',
    methods: ['POST'],
    sensitivity: 'L0',
    capability: 'fs.read',
    bodyLimit: 100,
    sessionBinding: 'session',
    justification: 'read',
    plugin: 'nano-x',
  },
]

function guardCtx() {
  const registered = []
  const ctx = {
    webServer: { register(def) { registered.push(def); return () => {} } },
    effect(fn) { return fn() },
    get(name) {
      if (name === 'connection') return { requestRejection: () => undefined }
      if (name === 'webServer') return ctx.webServer
      return undefined
    },
    _registered: registered,
  }
  return ctx
}

async function runGuard(handler, { method = 'POST', rejection, observe } = {}) {
  const ctx = guardCtx()
  if (rejection !== undefined) {
    ctx.get = (name) => {
      if (name === 'connection') return { requestRejection: () => rejection }
      if (name === 'webServer') return ctx.webServer
      return undefined
    }
  }
  createGuard({ table: TABLE, plugin: 'nano-x', observe }).registerRoutes(ctx, [
    { path: '/nano-x/read', method: 'POST', handler },
  ])
  const res = makeRes()
  await ctx._registered[0].handler(makeReq(method), res)
  return snap(res)
}

test('PRE1116-T01 guard four exits stay byte-identical without observe and do not read the clock', async () => {
  const orig = globalThis.performance.now
  let calls = 0
  globalThis.performance.now = () => { calls += 1; return orig.call(globalThis.performance) }
  try {
    const ok = await runGuard(async (_req, res) => { res.statusCode = 200; res.end('read-ok') })
    const missing = await runGuard(async (_req, res) => { res.statusCode = 200; res.end('read-ok') }, { method: 'GET' })
    const blown = await runGuard(async () => { throw new Error(`boom ${TOKEN} ${PATH_MARK}`) })
    const rejected = await runGuard(async () => { throw new Error('should-not-run') }, { rejection: 401 })
    assert.deepEqual(ok, { status: 200, headers: [], body: 'read-ok' })
    assert.equal(missing.status, 405)
    assert.equal(missing.body, JSON.stringify({ ok: false, reason: 'method-not-allowed' }))
    assert.deepEqual(missing.headers, [['allow', 'POST'], ['content-type', 'application/json; charset=utf-8']])
    assert.equal(blown.status, 500)
    assert.equal(blown.body, JSON.stringify({ ok: false, reason: 'failed' }))
    assert.equal(rejected.status, 401)
    assert.equal(rejected.body, '')
    assert.equal(calls, 0, 'performance.now must not be read when observe is omitted')
  } finally {
    globalThis.performance.now = orig
  }
})

test('PRE1116-T02/T20 guard observe: four exits, thrown callback, denylist, one call, no await', async () => {
  const events = []
  const observe = (event) => {
    events.push(event)
    if (event.outcome === 'failed') throw new Error(`observer ${TOKEN}`)
    return new Promise(() => {})
  }
  const quiet = await runGuard(async (_req, res) => { res.statusCode = 201; res.end('read-ok') })
  const withObs = await runGuard(async (_req, res) => { res.statusCode = 201; res.end('read-ok') }, { observe })
  assert.deepEqual(quiet, withObs)
  const methodQuiet = await runGuard(async (_req, res) => { res.end('no') }, { method: 'GET' })
  const methodObs = await runGuard(async (_req, res) => { res.end('no') }, { method: 'GET', observe })
  assert.deepEqual(methodQuiet, methodObs)
  const failQuiet = await runGuard(async () => { throw new Error(`boom ${TOKEN} ${PATH_MARK} ${SESSION_MARK}`) })
  const failObs = await runGuard(async () => { throw new Error(`boom ${TOKEN} ${PATH_MARK} ${SESSION_MARK}`) }, { observe })
  assert.deepEqual(failQuiet, failObs)
  const rejQuiet = await runGuard(async () => {}, { rejection: 401 })
  const rejObs = await runGuard(async () => {}, { rejection: 401, observe })
  assert.deepEqual(rejQuiet, rejObs)

  assert.equal(events.length, 4)
  const outcomes = events.map(e => e.outcome)
  assert.deepEqual(outcomes, ['ok', 'method', 'failed', 'rejected'])
  for (const event of events) {
    assertObserveEvent(event)
    const raw = JSON.stringify(event)
    assert.equal(raw.includes(TOKEN), false, raw)
    assert.equal(raw.includes(PATH_MARK), false, raw)
    assert.equal(raw.includes(SESSION_MARK), false, raw)
    assert.equal(raw.includes(QUERY_MARK), false, raw)
    assert.equal(raw.includes(HEADER_MARK), false, raw)
    assert.equal(event.id, 'dnee.read')
    assert.equal(event.surface, 'http')
    assert.equal(Object.hasOwn(event, 'url'), false)
  }
  assert.equal(events[0].status, 201)
  assert.equal(events[1].status, 405)
  assert.equal(events[2].status, 500)
  assert.equal(events[3].status, 401)
})

function regCtx(rejection) {
  const registered = []
  const ctx = {
    get(name) {
      if (name === 'connection') return { requestRejection: () => rejection }
      if (name === 'webServer') return ctx.webServer
      return undefined
    },
    webServer: {
      register(spec) { registered.push(spec); return () => {} },
      registerUpgrade(spec) { registered.push(spec); return () => {} },
    },
    effect(fn) { return fn() },
    _registered: registered,
  }
  return ctx
}

test('PRE1116-T02 registrar prefix and upgrade exits; missing id is null not a url', async () => {
  const events = []
  const bindings = [
    { id: 'h.exact', channel: 'http', match: 'exact', path: '/x/exact', methods: ['GET'],
      handler: (_req, res) => { res.statusCode = 200; res.end('ok') } },
    { id: 'h.prefix', channel: 'http', match: 'prefix', path: '/x/sdk', methods: ['GET'],
      handler: (_req, res) => { res.statusCode = 204; res.end('') } },
    { channel: 'upgrade', match: 'exact', path: '/x/stream', methods: ['GET'], id: 'u.stream',
      handler: (_req, socket) => { socket.write('hi'); return new Promise(() => {}) } },
  ]
  const ctx = regCtx(undefined)
  createWebRegistrar({ plugin: 'p', bindings, observe: (e) => events.push(e) }).registerAll(ctx)
  const http = ctx._registered.filter(s => s.kind)
  const up = ctx._registered.find(s => !s.kind)
  const prefix = http.find(s => s.kind === 'prefix')
  const exact = http.find(s => s.kind === 'exact')
  const res = makeRes()
  await prefix.handler(Object.assign(makeReq('GET'), { url: `/x/sdk?${QUERY_MARK}` }), res)
  assert.equal(res.statusCode, 204)
  const bad = makeRes()
  await prefix.handler(makeReq('POST'), bad)
  assert.equal(bad.statusCode, 405)
  assert.equal(bad.body, JSON.stringify({ ok: false, reason: 'method-not-allowed' }))
  const res2 = makeRes()
  await exact.handler(makeReq('GET'), res2)
  const socket = { ended: false, wrote: '', end() { this.ended = true }, write(s) { this.wrote += s } }
  const ret = up.handler(Object.assign(makeReq('GET'), { url: `/x/stream?${QUERY_MARK}` }), socket)
  assert.equal(typeof ret.then, 'function', 'upgrade must not be awaited past handler return')
  const denied = { ended: false, end() { this.ended = true }, write() {} }
  up.handler(makeReq('POST'), denied)
  assert.equal(denied.ended, true)
  const outcomes = events.map(e => `${e.surface}:${e.outcome}`)
  assert.deepEqual(outcomes, ['http:ok', 'http:method', 'http:ok', 'upgrade:accepted', 'upgrade:method'])
  for (const event of events) {
    assertObserveEvent(event)
    assert.equal(JSON.stringify(event).includes(QUERY_MARK), false)
  }
  assert.equal(events[3].id, 'u.stream')
  assert.equal(events[3].id === null || !String(events[3].id).includes('/x/stream'), true)
})

test('PRE1116-T01 json client without observe does not read the clock and keeps outcome text', async () => {
  const orig = globalThis.performance.now
  let calls = 0
  globalThis.performance.now = () => { calls += 1; return orig.call(globalThis.performance) }
  const seen = []
  const client = createJsonClient({
    fetch: async (url) => { seen.push(url); return { status: 200, text: async () => '{"a":1}' } },
    resolveUrl: () => `http://example.test/op?${QUERY_MARK}`,
  })
  const out = await client.call({ bindingId: 'dnn.read', encode: () => ({ method: 'POST' }), decode: async () => ({ ok: true, data: { a: 1 } }) }, {})
  assert.equal(out.ok, true)
  assert.equal(calls, 0)
  assert.equal(seen[0].includes(QUERY_MARK), true)
  globalThis.performance.now = orig
})

test('PRE1116-T02/T20 json outcomes, null id, thrown observe, hung promise', async () => {
  const events = []
  let fetches = 0
  const client = createJsonClient({
    plugin: 'dnn',
    observe: (event) => {
      events.push(event)
      if (event.outcome === 'transport') throw new Error(TOKEN)
      return new Promise(() => {})
    },
    fetch: async () => { fetches += 1; return { status: 500, text: async () => PATH_MARK } },
    resolveUrl: () => `http://example.test/${PATH_MARK}?${QUERY_MARK}`,
  })
  const ac = new AbortController()
  ac.abort()
  const cancelled = await client.call({ bindingId: 'dnn.read' }, {}, { signal: ac.signal })
  assert.equal(cancelled.ok, false)
  assert.equal(cancelled.error.kind, FAILURE_KIND.CANCELLED)
  assert.equal(fetches, 0)
  const protocol = await client.call({ encode: () => { throw new Error(TOKEN) } }, {})
  assert.equal(protocol.error.kind, 'protocol')
  assert.equal(protocol.error.message, TOKEN)
  const http = await client.call({ bindingId: 'dnn.read', encode: () => ({}) }, {})
  assert.equal(http.error.kind, 'http')
  assert.equal(events.length, 3)
  assert.deepEqual(events.map(e => e.outcome), ['cancelled', 'protocol', 'http'])
  assert.equal(events[1].id, null)
  assert.equal(events[0].id, 'dnn.read')
  for (const event of events) {
    assertObserveEvent(event)
    const raw = JSON.stringify(event)
    assert.equal(raw.includes(TOKEN), false)
    assert.equal(raw.includes(PATH_MARK), false)
    assert.equal(raw.includes(QUERY_MARK), false)
    assert.notEqual(event.id, `http://example.test/${PATH_MARK}?${QUERY_MARK}`)
  }
})

test('PRE1116-T02 mcp three exits; initialize is not observed; message stays off the event', async () => {
  const events = []
  const toolset = createMcpToolset({
    plugin: 'dnt',
    observe: (event) => { events.push(event); return new Promise(() => {}) },
    schema: { methods: [{ name: 'term.echo', description: 'echo', params: {} }], 'x-events': [] },
    dispatch: async (name) => {
      if (name === 'term.echo') return { ok: true }
      const e = new Error(`${TOKEN} ${PATH_MARK}`)
      e.kind = 'blocked'
      throw e
    },
  })
  await toolset.handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize' })
  assert.equal(events.length, 0)
  const ok = await toolset.handleRpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'term.echo', arguments: {} } })
  assert.equal(ok.result.structuredContent.ok, true)
  const unknown = await toolset.handleRpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'nope', arguments: {} } })
  assert.equal(unknown.error.code, -32602)
  const toolset2 = createMcpToolset({
    observe: (event) => events.push(event),
    schema: { methods: [{ name: 'term.fail', description: 'f', params: {} }] },
    dispatch: async () => { const e = new Error(TOKEN); e.kind = 'blocked'; throw e },
  })
  const err = await toolset2.handleRpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'term.fail', arguments: {} } })
  assert.equal(err.result.isError, true)
  assert.equal(err.result.structuredContent.message, TOKEN)
  assert.deepEqual(events.map(e => e.outcome), ['ok', 'rejected', 'error'])
  assert.equal(events[2].kind, 'blocked')
  for (const event of events) {
    assertObserveEvent(event)
    assert.equal(JSON.stringify(event).includes(TOKEN), false)
  }
  assert.equal(events[0].id, 'term.echo')
  assert.equal(events[1].id, 'nope')
})

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'deprecated' || name === '.git') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (name.endsWith('.js') || name.endsWith('.mjs')) out.push(p)
  }
}

test('PRE1116-T03 onCall is gone from facade src and the vendored lib copies', () => {
  const files = []
  walk(join(ROOT, 'packages/dsh-interface/src'), files)
  walk(join(ROOT, 'packages/dsh-host-route-guard/src'), files)
  const copies = [
    'dsh-nano-terminal/lib/mcp.js',
    'dsh-nano-terminal/lib/web-routes.js',
    'dsh-nano-notepad/lib/web-registrar.js',
    'dsh-nano-explorer-extra/lib/host.js',
    'dsh-nano-local-sandbox/lib/route-guard.js',
    'dsh-nano-kitesurf/lib/route-guard.js',
    'dsh-nano-cloud-session/lib/route-guard.js',
    'dsh-nano-model-selector/lib/route-guard.js',
    'dsh-nano-explorer-extra/lib/client.js',
    'dsh-nano-notepad/lib/client.js',
    'dsh-nano-model-selector/lib/client.js',
  ]
  for (const rel of copies) files.push(join(ROOT, rel))
  const hits = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    if (/\bonCall\b/.test(text)) hits.push(relative(ROOT, file))
  }
  assert.deepEqual(hits, [])
})

test('PRE1116-T04 W1 production sources do not inject observe', () => {
  const files = []
  for (const name of readdirSync(ROOT)) {
    if (!name.startsWith('dsh-nano-')) continue
    const dir = join(ROOT, name)
    if (!statSync(dir).isDirectory()) continue
    const index = join(dir, 'index.js')
    try { statSync(index); files.push(index) } catch { /* no index */ }
    const src = join(dir, 'src')
    try { if (statSync(src).isDirectory()) walk(src, files) } catch { /* no src */ }
  }
  const hits = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    if (/\bobserve\s*:/.test(text)) hits.push(relative(ROOT, file))
  }
  assert.deepEqual(hits, [], 'W1 must not inject observe; W3 updates this allowlist')
})
