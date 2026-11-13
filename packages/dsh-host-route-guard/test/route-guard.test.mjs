/**
 * B0-T01 — dsh-host-route-guard unit tests (node --test).
 *
 * Covers: fail-closed connection, route-not-listed, route-stale, bodyLimit
 * spec-override and table-inherit, uniform 405 JSON shape, requestRejection
 * gating, handler errors → {ok:false,reason}, and inventory emission.
 * The mock ctx mirrors the four plugins' usage (`ctx.get`, `ctx.webServer`,
 * `ctx.effect`).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import {
  createGuard,
  registerRoutes,
  inventoryMarkdown,
  RouteGuardError,
  readJsonBody,
} from '../src/index.js'

/* ---------- minimal ctx / webServer / res mocks ---------- */

function makeRes() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    writableEnded: false,
    setHeader(k, v) { this.headers[k] = v },
    end(chunk) { this.writableEnded = true; if (chunk) this.body += chunk },
  }
}

function makeReq({ method = 'POST', headers = {}, chunks = [] } = {}) {
  const req = Readable.from(chunks)
  req.method = method
  req.headers = headers
  return req
}

function makeCtx({ connection = { requestRejection: () => undefined } } = {}) {
  const registered = []
  const effects = []
  const ctx = {
    webServer: {
      register(def) {
        registered.push(def)
        return { dispose() {} }
      },
    },
    effect(fn, label) { effects.push({ fn, label }); return fn() },
    get(name) { return name === 'connection' ? connection : undefined },
    _registered: registered,
    _effects: effects,
  }
  return ctx
}

const TABLE = [
  {
    path: '/nano-x/read',
    methods: ['POST'],
    sensitivity: 'L0',
    capability: 'fs.read',
    bodyLimit: 8 * 1024 * 1024,
    sessionBinding: 'session',
    justification: 'read markdown under the workspace',
    plugin: 'nano-x',
  },
  {
    path: '/nano-x/list',
    methods: ['GET', 'POST'],
    sensitivity: 'L1',
    capability: 'fs.list',
    bodyLimit: 65536,
    sessionBinding: 'session',
    justification: 'list workspace files',
    plugin: 'nano-x',
  },
]

function specs(handlers = {}) {
  return [
    {
      path: '/nano-x/read',
      method: 'POST',
      handler: handlers.read ?? (async (req, res) => { res.end('read-ok') }),
    },
    {
      path: '/nano-x/list',
      methods: ['GET', 'POST'],
      handler: handlers.list ?? (async (req, res) => { res.end('list-ok') }),
    },
  ]
}

const reason = e => (e instanceof RouteGuardError ? e.reason : `unexpected:${e.message}`)

/* ---------- fail-closed connection ---------- */

test('throws `no-connection` when ctx.get("connection") is absent', () => {
  const ctx = makeCtx({ connection: null })
  assert.throws(
    () => registerRoutes(ctx, specs(), { table: TABLE }),
    e => reason(e) === 'no-connection',
  )
  assert.equal(ctx._registered.length, 0, 'nothing registered on fail-closed')
})

test('throws `no-request-rejection` instead of registering fail-open routes', () => {
  const ctx = makeCtx({ connection: {} })
  assert.throws(
    () => registerRoutes(ctx, specs(), { table: TABLE }),
    e => reason(e) === 'no-request-rejection',
  )
  assert.equal(ctx._registered.length, 0, 'nothing registered without an auth boundary')
})

/* ---------- table coverage ---------- */

test('unlisted (path,method) throws `route-not-listed`', () => {
  const ctx = makeCtx()
  const bad = specs()
  bad.push({ path: '/nano-x/evil', method: 'POST', handler: async () => {} })
  assert.throws(
    () => registerRoutes(ctx, bad, { table: TABLE }),
    e => reason(e) === 'route-not-listed',
  )
  assert.equal(ctx._registered.length, 0, 'batch is atomic: nothing registered')
})

test('declared method not covered by table row throws `route-not-listed`', () => {
  const ctx = makeCtx()
  const bad = specs()
  bad[1] = { path: '/nano-x/list', methods: ['GET', 'DELETE'], handler: async () => {} }
  assert.throws(
    () => registerRoutes(ctx, bad, { table: TABLE }),
    e => reason(e) === 'route-not-listed',
  )
})

test('table row the plugin does not register throws `route-stale`', () => {
  const ctx = makeCtx()
  const partial = [specs()[0]] // /nano-x/list missing
  assert.throws(
    () => registerRoutes(ctx, partial, { table: TABLE }),
    e => reason(e) === 'route-stale',
  )
})

test('spec contradicting the table row throws `route-drift`', () => {
  const ctx = makeCtx()
  const bad = specs()
  bad[0] = { ...bad[0], sensitivity: 'L3' }
  assert.throws(
    () => registerRoutes(ctx, bad, { table: TABLE }),
    e => reason(e) === 'route-drift',
  )
})

test('empty/missing table fails validation', () => {
  const ctx = makeCtx()
  assert.throws(
    () => registerRoutes(ctx, specs(), { table: [] }),
    e => reason(e) === 'route-not-listed' || reason(e) === 'table-invalid',
  )
  assert.throws(
    () => registerRoutes(ctx, specs(), {}),
    e => reason(e) === 'route-not-listed' || reason(e) === 'table-invalid',
  )
})

/* ---------- registration + request flow ---------- */

test('registers one handler per path via ctx.effect, gated by requestRejection', async () => {
  let rejection // controlled per request below
  const ctx = makeCtx({ connection: { requestRejection: () => rejection } })
  const guard = createGuard({ table: TABLE, plugin: 'nano-x' })
  const disposers = guard.registerRoutes(ctx, specs())
  assert.equal(disposers.length, 2)
  assert.equal(ctx._registered.length, 2)
  assert.equal(ctx._effects.length, 2, 'registration wrapped in ctx.effect')
  assert.equal(ctx._registered[0].kind, 'exact')

  // requestRejection short-circuits before method checks
  rejection = 401
  const res = makeRes()
  await ctx._registered[0].handler(makeReq({ method: 'GET' }), res)
  assert.equal(res.statusCode, 401)
  assert.equal(res.body, '', 'rejection ends the response, handler body not sent')
})

test('method not allowed → 405 JSON {ok:false,reason:"method-not-allowed"} + allow header', async () => {
  const ctx = makeCtx()
  registerRoutes(ctx, specs(), { table: TABLE })
  const res = makeRes()
  await ctx._registered[0].handler(makeReq({ method: 'GET' }), res)
  assert.equal(res.statusCode, 405)
  assert.equal(res.headers.allow, 'POST')
  assert.match(res.headers['content-type'], /application\/json/)
  assert.deepEqual(JSON.parse(res.body), { ok: false, reason: 'method-not-allowed' })
})

test('handler runs for a listed (path,method) and receives the route record', async () => {
  const ctx = makeCtx()
  let seenRoute
  const guard = createGuard({ table: TABLE })
  guard.registerRoutes(ctx, [
    { path: '/nano-x/read', method: 'POST', handler: async (req, res, route) => { seenRoute = route; res.end('ok') } },
    specs()[1],
  ])
  const res = makeRes()
  await ctx._registered[0].handler(makeReq({ method: 'POST' }), res)
  assert.equal(res.body, 'ok')
  assert.equal(seenRoute.bodyLimit, 8 * 1024 * 1024, 'bodyLimit inherited from table')
  assert.deepEqual([...seenRoute.methods], ['POST'])
  assert.equal(seenRoute.sessionBinding, 'session')
})

test('handler errors fall back to {ok:false,reason:"failed"} JSON', async () => {
  const ctx = makeCtx()
  registerRoutes(ctx, specs({
    read: async () => { throw new Error('boom') },
  }), { table: TABLE })
  const res = makeRes()
  await ctx._registered[0].handler(makeReq({ method: 'POST' }), res)
  assert.equal(res.statusCode, 500)
  assert.deepEqual(JSON.parse(res.body), { ok: false, reason: 'failed' })
})

/* ---------- bodyLimit: spec override vs table inherit ---------- */

test('spec bodyLimit overrides the table row', async () => {
  const ctx = makeCtx()
  let seen
  const guard = createGuard({ table: TABLE })
  guard.registerRoutes(ctx, [
    { path: '/nano-x/read', method: 'POST', bodyLimit: 1234, handler: async (req, res, route) => { seen = route.bodyLimit; res.end('x') } },
    specs()[1],
  ])
  await ctx._registered[0].handler(makeReq({ method: 'POST' }), makeRes())
  assert.equal(seen, 1234, 'spec wins')
  assert.equal(guard.lookup('/nano-x/list').bodyLimit, 65536, 'other route still inherits table')
})

test('readJsonBody enforces the effective bodyLimit', async () => {
  // forced (spec-provided) limit
  const forced = await readJsonBody(
    makeReq({ chunks: [Buffer.alloc(10, 0x61)] }), 5,
  ).then(() => null, e => e)
  assert.ok(forced instanceof RouteGuardError)
  assert.equal(forced.reason, 'body-too-large')

  // inherited limit honored the same way
  const ctx = makeCtx()
  const guard = createGuard({ table: TABLE })
  guard.registerRoutes(ctx, specs())
  const limit = guard.lookup('/nano-x/list').bodyLimit
  await assert.rejects(
    readJsonBody(makeReq({ chunks: [Buffer.alloc(limit + 1, 0x61)] }), limit),
    /body-too-large/,
  )
})

/* ---------- inventory ---------- */

test('inventory() emits route records incl. sessionBinding metadata', () => {
  const ctx = makeCtx()
  const guard = createGuard({ table: TABLE, plugin: 'nano-x' })
  guard.registerRoutes(ctx, specs())
  const inv = guard.inventory()
  assert.equal(inv.length, 2)
  const read = inv.find(r => r.path === '/nano-x/read')
  assert.deepEqual(read, {
    path: '/nano-x/read',
    methods: ['POST'],
    sensitivity: 'L0',
    capability: 'fs.read',
    bodyLimit: 8 * 1024 * 1024,
    sessionBinding: 'session',
    justification: 'read markdown under the workspace',
    plugin: 'nano-x',
  })
  const md = inventoryMarkdown(inv, { title: 'route-inventory' })
  assert.match(md, /route-inventory/)
  assert.match(md, /\| `\/nano-x\/read` \| POST \| L0 \|/)
})

/* ---------- standalone vs bound forms ---------- */

test('standalone registerRoutes mirrors createGuard(...).registerRoutes', () => {
  const ctx = makeCtx()
  const disposers = registerRoutes(ctx, specs(), { table: TABLE })
  assert.equal(disposers.length, 2)
  assert.equal(ctx._registered.length, 2)
})
