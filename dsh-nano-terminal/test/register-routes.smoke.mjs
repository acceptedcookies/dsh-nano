import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { BINDING_TABLE } from '../lib/bindings.js'
import { registerWebRoutes } from '../lib/web-routes.js'

// Controlled host seam: counts real register / registerUpgrade / effect calls.
function makeCtx({ rejection } = {}) {
  const calls = { register: [], upgrade: [], effects: [], disposals: [] }
  const ctx = {
    get(name) {
      if (name === 'connection') return { requestRejection: rejection ?? (() => undefined) }
      if (name === 'webServer') return ctx.webServer
      return undefined
    },
    webServer: {
      register(spec) {
        calls.register.push(spec)
        return () => calls.disposals.push(`http:${spec.path}`)
      },
      registerUpgrade(spec) {
        calls.upgrade.push(spec)
        return () => calls.disposals.push(`up:${spec.path}`)
      },
    },
    effect(fn, label) {
      calls.effects.push(label)
      const dispose = typeof fn === 'function' ? fn() : undefined
      return () => { calls.disposals.push(label); if (typeof dispose === 'function') dispose() }
    },
    commands: { register: () => () => {} },
  }
  return { ctx, calls }
}

const DEPS = {
  registry: { list: () => [], count: () => 0, resolve: () => null, close: async () => true },
  bus: { subscribe: () => () => {} },
  mcp: { audit: () => {}, handleRpc: async () => ({}) },
  laneStatus: () => ({ local: { status: 'up' } }),
  ws: {
    handshake: () => false,
    FrameParser: class {},
    sendBinary: () => {}, sendText: () => {}, sendClose: () => {},
    encodeFrame: () => Buffer.alloc(0), parseChannel: () => null,
    Attach: class {}, FR_KIND: {},
  },
}

test('web surfaces declared in BINDING_TABLE register through createWebRegistrar (real assembly)', () => {
  const { ctx, calls } = makeCtx()
  const dispose = registerWebRoutes(ctx, DEPS)

  // Real registration: 5 http bindings (4 exact + 1 prefix) + 1 upgrade binding.
  const httpRows = BINDING_TABLE.filter(b => b.channel === 'http')
  const upRows = BINDING_TABLE.filter(b => b.channel === 'upgrade')
  assert.equal(calls.register.length, httpRows.length, 'every http binding registered')
  assert.equal(calls.upgrade.length, upRows.length, 'every upgrade binding registered')
  assert.equal(calls.register.length, 5)
  assert.equal(calls.upgrade.length, 1)
  // The upgrade path is the WS data plane.
  assert.equal(calls.upgrade[0].path, '/dsh-nano-terminal/stream')
  // The prefix http binding is the session-close prefix.
  const prefix = calls.register.find(s => s.kind === 'prefix')
  assert.ok(prefix, 'a prefix-kind http binding is registered')
  assert.equal(prefix.path, '/dsh-nano-terminal/session')
  // Exact http rows mount one guard effect each, plus one registrar batch disposer.
  const exact = httpRows.filter(row => row.match === 'exact').length
  assert.equal(calls.effects.length, exact + 1)
  assert.equal(typeof dispose, 'function')
})

test('requestRejection fence runs before handler; dispose tears down every binding', async () => {
  const { ctx, calls } = makeCtx({ rejection: () => 403 })
  const dispose = registerWebRoutes(ctx, DEPS)
  const res = { statusCode: 0, setHeader() {}, end() {}, writeHead() {} }
  // Drive an http-exact handler → rejected before any side-effect.
  await calls.register.find(s => s.kind === 'exact').handler({ method: 'GET', url: '/dsh-nano-terminal/health', headers: {} }, res)
  assert.equal(res.statusCode, 403, 'rejection short-circuits the handler')
  // Dispose removes all registrations (5 http + 1 upgrade) exactly once.
  dispose()
  const bindingDisposals = calls.disposals.filter(item => item.startsWith('http:') || item.startsWith('up:'))
  assert.equal(bindingDisposals.length, 6, 'all six bindings disposed')
  const n = calls.disposals.length
  dispose()
  assert.equal(calls.disposals.length, n, 'dispose is idempotent')
})

test('index.js does not register routes directly — single registrar mechanism', () => {
  const source = readFileSync(new URL('../index.js', import.meta.url), 'utf8')
  assert.equal(source.includes('ctx.webServer.register('), false, 'no direct webServer.register')
  assert.equal(source.includes('ctx.webServer.registerUpgrade('), false, 'no direct registerUpgrade')
  assert.equal(source.includes('registerWebRoutes'), true)
  assert.equal(source.includes('registerRoutes('), false, 'legacy registerRoutes facade retired')
})

test('BINDING_TABLE ids cover the full DNT surface set (external literal)', () => {
  assert.deepEqual(BINDING_TABLE.map(r => r.id).sort(), [
    'dnt.events', 'dnt.health', 'dnt.mcp', 'dnt.session.close', 'dnt.sessions', 'dnt.stream',
  ])
})
