import assert from 'node:assert/strict'
import test from 'node:test'
import { createWebRegistrar } from '../src/host/index.js'
import { normalizeBindings, BindingError } from '../src/contracts/index.js'

// ---- controlled host seam: real register/registerUpgrade/effect call counting ----
function makeCtx({ rejection } = {}) {
  const calls = { register: [], upgrade: [], effects: [], disposals: [] }
  const registrations = new Map()
  const ctx = {
    get(name) {
      if (name === 'connection') {
        return { requestRejection: rejection ?? (() => undefined) }
      }
      // Route registration resolves the bound listener via ctx.get('webServer')
      // (NOT ctx.webServer): on a real host the property-access trap returns a
      // shadow provision while get() returns the injected singleton — mirror that.
      if (name === 'webServer') return ctx.webServer
      return undefined
    },
    webServer: {
      register(spec) {
        calls.register.push(spec)
        const d = () => { calls.disposals.push(`http:${spec.path}`) }
        registrations.set(spec.path, spec)
        return d
      },
      registerUpgrade(spec) {
        calls.upgrade.push(spec)
        const d = () => { calls.disposals.push(`up:${spec.path}`) }
        registrations.set(spec.path, spec)
        return d
      },
    },
    // Cordis ctx.effect(effector, label) RUNS the effector eagerly and returns
    // its disposer — it does not defer the registration. Mirror that so the
    // per-route register() inside the effector executes during registerAll.
    effect(fn, label) {
      calls.effects.push(label)
      const dispose = fn ? fn() : () => {}
      return () => { calls.disposals.push(`effect:${label}`); dispose() }
    },
  }
  return { ctx, calls, registrations }
}

const BINDINGS = [
  { id: 'h.exact', channel: 'http', match: 'exact', path: '/x/exact', methods: ['GET'], sessionBinding: true,
    handler: (req, res) => { res.statusCode = 200; res.end('ok') } },
  { id: 'h.prefix', channel: 'http', match: 'prefix', path: '/x/sdk', methods: ['GET'],
    handler: (req, res) => { res.statusCode = 200; res.end('sdk') } },
  { id: 'u.stream', channel: 'upgrade', match: 'exact', path: '/x/stream', methods: ['GET'],
    handler: (req, socket) => { socket.write('hi') } },
]

test('mixed batch registers http-exact, http-prefix and upgrade-exact; single ctx.effect mount', () => {
  const { ctx, calls } = makeCtx()
  const r = createWebRegistrar({ plugin: 'p', bindings: BINDINGS })
  const dispose = r.registerAll(ctx)
  assert.equal(calls.register.length, 2, 'two http registrations')
  assert.equal(calls.upgrade.length, 1, 'one upgrade registration')
  // Routes mount per-route ctx.effect (guard contract) + one batch disposer.
  assert.ok(calls.effects.length >= 1, 'at least one ctx.effect mounted')
  assert.equal(typeof dispose, 'function')
  // Regression (2026-11-16): ctx.effect runs its body eagerly — the batch
  // disposer must be RETURNED, not invoked inside the body. Calling
  // disposeAll() inside registered then unregistered every route in the same
  // tick: all plugin routes 404'd on a live host.
  assert.equal(calls.disposals.length, 0, 'no teardown may run during registerAll')
  // inventory reflects only effective bindings with channel+match fields.
  const inv = r.inventory()
  assert.equal(inv.length, 3)
  for (const rec of inv) {
    assert.ok(rec.channel, 'channel present')
    assert.ok(rec.match, 'match present')
    assert.equal(rec.handler, undefined, 'handler not exposed on public record')
  }
})

test('invalid binding (non-function handler) is rejected at eager precheck — nothing registers', () => {
  const { ctx, calls } = makeCtx()
  const bad = [
    BINDINGS[0],
    { id: 'bad', channel: 'http', match: 'exact', path: '/x/bad', methods: ['GET'], handler: 123 },
  ]
  assert.throws(() => createWebRegistrar({ plugin: 'p', bindings: bad }), /handler must be a function/)
  assert.equal(calls.register.length + calls.upgrade.length, 0, 'net registrations = 0')
  assert.equal(ctx.webServer === undefined, false)
})

test('register() throwing mid-batch rolls back all already-registered disposers', () => {
  const { ctx, calls } = makeCtx()
  // Make the 2nd http registration (prefix) throw → the 1st (exact) must be disposed.
  let n = 0
  ctx.webServer.register = (spec) => {
    n++
    if (n === 2) throw new Error('register failed mid-batch')
    calls.register.push(spec)
    return () => calls.disposals.push(`http:${spec.path}`)
  }
  const r = createWebRegistrar({ plugin: 'p', bindings: BINDINGS })
  assert.throws(() => r.registerAll(ctx), /register failed mid-batch/)
  assert.ok(calls.disposals.length >= 1, 'earlier registration disposed on rollback')
  assert.equal(r.inventory().length, 0, 'no effective bindings after rollback')
})

test('no connection / no requestRejection → fail-closed before any register', () => {
  const r = createWebRegistrar({ plugin: 'p', bindings: BINDINGS })
  const noConn = { get: () => undefined, webServer: { register(){throw new Error('should not register')} } }
  assert.throws(() => r.registerAll(noConn), /no-connection/)
  const noRej = { get: () => ({ }), webServer: { register(){throw new Error('should not register')} } }
  assert.throws(() => r.registerAll(noRej), /no-request-rejection/)
})

test('rejection happens before handler side-effect; legal control produces ≥1 effect', () => {
  let entered = 0
  const counting = BINDINGS.map(b => ({ ...b, handler: (req, res, rt) => { entered++; return b.handler(req, res, rt) } }))
  const { ctx, calls } = makeCtx({ rejection: () => 403 })
  const r = createWebRegistrar({ plugin: 'p', bindings: counting })
  r.registerAll(ctx)
  // Drive each registered handler; rejection must short-circuit (enter=0).
  const req = { method: 'GET', url: '/x/exact', headers: {} }
  const res = { statusCode: 0, setHeader(){}, end(){}, writeHead(){} }
  calls.register[0].handler(req, res)
  assert.equal(entered, 0, 'handler entry count = 0 on rejection')
  assert.equal(res.statusCode, 403)
  // Legal control → same handler fires.
  const { ctx: ctx2, calls: calls2 } = makeCtx()
  const r2 = createWebRegistrar({ plugin: 'p', bindings: counting })
  r2.registerAll(ctx2)
  calls2.register[0].handler(req, res)
  assert.equal(entered, 1, 'legal request produces ≥1 side-effect')
})

test('dispose is idempotent and folds whole batch teardown', () => {
  const { ctx, calls } = makeCtx()
  const r = createWebRegistrar({ plugin: 'p', bindings: BINDINGS })
  const dispose = r.registerAll(ctx)
  calls.effects[0] && dispose()
  const n = calls.disposals.length
  dispose()
  assert.equal(calls.disposals.length, n, 'second dispose is a no-op')
  // running the ctx.effect disposer also does not double-dispose.
})

test('upgrade + prefix is rejected at normalize (axis contract)', () => {
  assert.throws(
    () => normalizeBindings([{ id: 'u', channel: 'upgrade', match: 'prefix', path: '/u', handler() {} }]),
    BindingError,
  )
})

test('http+prefix handler runs requestRejection fence (rejection→status, no handler)', async () => {
  let entered = 0
  const { ctx, calls } = makeCtx({ rejection: () => 403 })
  const r = createWebRegistrar({ plugin: 'p', bindings: [
    { id: 'pre', channel: 'http', match: 'prefix', path: '/x/sdk', methods: ['GET'],
      handler: () => { entered++ } },
  ] })
  r.registerAll(ctx)
  const res = { statusCode: 0, setHeader(){}, end(){}, writeHead(){} }
  await calls.register[0].handler({ method: 'GET', url: '/x/sdk/a', headers: {} }, res)
  assert.equal(entered, 0, 'prefix handler not entered on rejection')
  assert.equal(res.statusCode, 403)
})

test('http+prefix handler enforces method list (405 + allow) and legal passes', async () => {
  let entered = 0
  const { ctx, calls } = makeCtx()
  const r = createWebRegistrar({ plugin: 'p', bindings: [
    { id: 'pre', channel: 'http', match: 'prefix', path: '/x/sdk', methods: ['GET'],
      handler: () => { entered++ } },
  ] })
  r.registerAll(ctx)
  const res = { statusCode: 0, body: null, headers: {}, setHeader(k,v){ this.headers[k]=v }, end(b){ this.body=b } }
  await calls.register[0].handler({ method: 'POST', url: '/x/sdk', headers: {} }, res)
  assert.equal(res.statusCode, 405, 'non-listed method → 405')
  assert.match(String(res.headers.allow), /GET/)
  assert.equal(entered, 0)
  await calls.register[0].handler({ method: 'GET', url: '/x/sdk', headers: {} }, res)
  assert.equal(entered, 1, 'legal GET reaches handler')
})

test('upgrade handler rejects non-GET and applies requestRejection (socket.end)', () => {
  let entered = 0, ended = 0
  const socket = { end(){ ended++ }, write(){} }
  const { ctx, calls } = makeCtx()
  const r = createWebRegistrar({ plugin: 'p', bindings: [
    { id: 'up', channel: 'upgrade', match: 'exact', path: '/x/stream', methods: ['GET'],
      handler: () => { entered++ } },
  ] })
  r.registerAll(ctx)
  // non-GET upgrade must not reach b.handler (F12.2 enforcement).
  calls.upgrade[0].handler({ method: 'POST', url: '/x/stream', headers: {} }, socket)
  assert.equal(entered, 0)
  assert.equal(ended, 1, 'non-GET upgrade → socket.end')
})

test('upgrade handler applies requestRejection before dispatch', () => {
  let entered = 0, ended = 0
  const socket = { end(){ ended++ }, write(){} }
  const { ctx, calls } = makeCtx({ rejection: () => 403 })
  const r = createWebRegistrar({ plugin: 'p', bindings: [
    { id: 'up', channel: 'upgrade', match: 'exact', path: '/x/stream', methods: ['GET'],
      handler: () => { entered++ } },
  ] })
  r.registerAll(ctx)
  calls.upgrade[0].handler({ method: 'GET', url: '/x/stream', headers: {} }, socket)
  assert.equal(entered, 0)
  assert.equal(ended, 1, 'rejected upgrade → socket.end, no handler')
})

test('second registerAll on the same registrar registers again; each dispose is idempotent', () => {
  const { ctx, calls } = makeCtx()
  const r = createWebRegistrar({ plugin: 'p', bindings: BINDINGS })
  const d1 = r.registerAll(ctx)
  const afterFirst = calls.register.length
  const d2 = r.registerAll(ctx)
  // Each registerAll registers its own full batch (2 http + 1 upgrade here).
  assert.equal(calls.register.length, afterFirst + 2, 'second batch registered')
  // Both dispose handles are usable and idempotent — per-route ctx.effect
  // already owns route teardown, so a second call on the same handle is a no-op
  // and no handle throws.
  assert.doesNotThrow(d2)
  assert.ok(calls.disposals.length > 0, 'a dispose ran teardown')
  const n = calls.disposals.length
  assert.doesNotThrow(d1)
  assert.doesNotThrow(d2)
  assert.ok(calls.disposals.length >= n, 'idempotent repeat disposes never throw')
})

test('sessionBinding is recorded but carries no authorization side-effect', () => {
  const { ctx } = makeCtx()
  const r = createWebRegistrar({ plugin: 'p', bindings: BINDINGS })
  r.registerAll(ctx)
  const rec = r.lookup('h.exact')
  assert.equal(rec.sessionBinding, true, 'ledger metadata present')
  // metadata only: lookup exposes record, no auth token minted on the record.
  assert.equal(rec.authToken, undefined)
})
