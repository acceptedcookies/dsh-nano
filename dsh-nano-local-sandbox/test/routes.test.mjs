import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { registerRoutes } from '../lib/route-guard.js'
import { BINDING_TABLE } from '../lib/bindings.js'
import { acceptUpgrade, routeSpecs } from '../src/host/routes.js'

const root = dirname(fileURLToPath(import.meta.url))

function host(rejection, register) {
  return {
    get(name) {
      if (name === 'webServer') return this.webServer
      if (name !== 'connection') return null
      return { requestRejection: rejection }
    },
    webServer: { register(route) { register(route); return () => {} } },
  }
}

test('an unlisted route never reaches webServer.register', () => {
  let calls = 0
  const specs = [...routeSpecs(), { path: '/not-listed', methods: ['GET'], sessionBinding: true, handler() {} }]
  assert.throws(() => registerRoutes(host(() => undefined, () => { calls += 1 }), specs, { table: BINDING_TABLE, plugin: 'dsh-nano-local-sandbox' }))
  assert.equal(calls, 0)
})

test('missing requestRejection registers nothing', () => {
  let calls = 0
  const ctx = host(undefined, () => { calls += 1 })
  ctx.get = () => ({})
  assert.throws(() => registerRoutes(ctx, routeSpecs(), { table: BINDING_TABLE, plugin: 'dsh-nano-local-sandbox' }))
  assert.equal(calls, 0)
})

test('the ledger is the only sessionBinding source and apply does not register directly', () => {
  const ledger = JSON.parse(readFileSync(join(root, '..', '..', 'security', 'route-sensitivity.json'), 'utf8'))
  const expected = new Map(ledger.routes
    .filter(row => row.plugin === 'dsh-nano-local-sandbox')
    .map(row => [row.path, row.sessionBinding]))
  assert.equal(expected.size, BINDING_TABLE.length)
  for (const spec of routeSpecs()) assert.equal('sessionBinding' in spec, false)
  for (const row of BINDING_TABLE) {
    assert.equal(row.sessionBinding, expected.get(row.path), row.path)
    assert.equal(row.path.startsWith('/nano-local-sandbox/'), true)
    assert.equal(row.path.includes('/nano-' + 'kitesurf/'), false)
  }
  const source = readFileSync(join(root, '..', 'index.js'), 'utf8')
  assert.equal(source.includes('ctx.webServer.register'), false)
  let calls = 0
  const disposers = registerRoutes(host(() => undefined, () => { calls += 1 }), routeSpecs(), { table: BINDING_TABLE, plugin: 'dsh-nano-local-sandbox' })
  assert.equal(calls, BINDING_TABLE.length)
  assert.equal(disposers.length, BINDING_TABLE.length)
})

test('websocket handshake waits for requestRejection', () => {
  let handled = 0
  let handshake = 0
  const denied = acceptUpgrade({}, {}, () => 401, () => { handshake += 1 })
  assert.equal(denied.handshake, false)
  assert.equal(handshake, 0)
  assert.equal(handled, 0)
  const allowed = acceptUpgrade({}, {}, () => undefined, () => { handshake += 1; handled += 1 })
  assert.equal(allowed.handshake, true)
  assert.equal(handshake, 1)
})
