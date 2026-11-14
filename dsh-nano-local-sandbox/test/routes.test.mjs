import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { registerRoutes } from '../lib/route-guard.js'
import { ROUTE_TABLE } from '../lib/route-table.js'
import { acceptUpgrade, routeSpecs } from '../src/host/routes.js'

const root = dirname(fileURLToPath(import.meta.url))

function host(rejection, register) {
  return {
    get(name) {
      if (name !== 'connection') return null
      return { requestRejection: rejection }
    },
    webServer: { register(route) { register(route); return () => {} } },
  }
}

test('an unlisted route never reaches webServer.register', () => {
  let calls = 0
  const specs = [...routeSpecs(), { path: '/not-listed', methods: ['GET'], sessionBinding: true, handler() {} }]
  assert.throws(() => registerRoutes(host(() => undefined, () => { calls += 1 }), specs, { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' }))
  assert.equal(calls, 0)
})

test('missing requestRejection registers nothing', () => {
  let calls = 0
  const ctx = host(undefined, () => { calls += 1 })
  ctx.get = () => ({})
  assert.throws(() => registerRoutes(ctx, routeSpecs(), { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' }))
  assert.equal(calls, 0)
})

test('every nano-local-sandbox spec binds the session and apply does not register directly', () => {
  for (const spec of routeSpecs()) assert.equal(spec.sessionBinding, true)
  for (const row of ROUTE_TABLE) {
    assert.equal(row.sessionBinding, true)
    assert.equal(row.path.startsWith('/nano-local-sandbox/'), true)
    assert.equal(row.path.includes('/nano-kitesurf/'), false)
  }
  const source = readFileSync(join(root, '..', 'index.js'), 'utf8')
  assert.equal(source.includes('ctx.webServer.register'), false)
  let calls = 0
  const disposers = registerRoutes(host(() => undefined, () => { calls += 1 }), routeSpecs(), { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' })
  assert.equal(calls, ROUTE_TABLE.length)
  assert.equal(disposers.length, ROUTE_TABLE.length)
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
