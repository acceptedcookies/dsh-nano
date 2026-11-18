import test from 'node:test'
import assert from 'node:assert/strict'
import { pluginRouteGone } from '../src/client/api.js'
import { applyHealth } from '../src/client/workspace.js'

test('T18 plugin-disabled is HTTP 404/405 without a carrier reason, not provider 404', () => {
  assert.equal(pluginRouteGone({ httpStatus: 404, reason: 'failed' }), true)
  assert.equal(pluginRouteGone({ httpStatus: 405, reason: 'failed' }), true)
  assert.equal(pluginRouteGone({ httpStatus: 404, reason: 'not-found', providerStatus: 404 }), false)
  assert.equal(pluginRouteGone({ httpStatus: 403, reason: 'forbidden-or-invisible' }), false)
})

test('T18 three health faces stay independent', () => {
  const h = applyHealth({}, { api: 'ready', resources: 'unavailable', nativeView: 'unavailable' })
  assert.equal(h.api, 'ready')
  assert.equal(h.resources, 'unavailable')
  assert.equal(h.nativeView, 'unavailable')
})
