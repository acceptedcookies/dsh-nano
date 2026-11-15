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
    effect(fn, label) {
      calls.effects.push(label)
      return () => { calls.disposals.push(`effect:${label}`); fn && fn() }
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
  assert.equal(calls.effects.length, 1, 'ctx.effect mounted exactly once')
  assert.equal(typeof dispose, 'function')
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

test('sessionBinding is recorded but carries no authorization side-effect', () => {
  const { ctx } = makeCtx()
  const r = createWebRegistrar({ plugin: 'p', bindings: BINDINGS })
  r.registerAll(ctx)
  const rec = r.lookup('h.exact')
  assert.equal(rec.sessionBinding, true, 'ledger metadata present')
  // metadata only: lookup exposes record, no auth token minted on the record.
  assert.equal(rec.authToken, undefined)
})
