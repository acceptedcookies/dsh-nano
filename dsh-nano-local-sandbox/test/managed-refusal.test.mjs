import assert from 'node:assert/strict'
import test from 'node:test'
import { registeredRefusalId } from '../src/host/managed-routes.js'

/**
 * T-O-68: a typed pre-dispatch refusal must answer with an errorId, but no new
 * errorId may be invented. The 409 case has a registered catalog row; every
 * other status stays detail-free text.
 */
test('only statuses with a registered catalog row answer with an errorId', () => {
  assert.equal(registeredRefusalId(409), 'sandbox.state_conflict')
  for (const status of [400, 401, 403, 404, 413, 503, null]) {
    assert.equal(registeredRefusalId(status), null, `status ${status} must not invent an errorId`)
  }
})
