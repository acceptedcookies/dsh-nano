import assert from 'node:assert/strict'
import test from 'node:test'
import { registeredRefusalId } from '../src/host/managed-routes.js'
import { makeAgentToolDefinitions } from '../src/host/agent-tools.js'

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

/**
 * T-O-68 across entries: the tool entry must project a typed 409 to the same
 * registered errorId the HTTP and /mcp dispatchers use — not a bare body.
 */
test('the tool entry projects a typed 409 to the registered errorId', async () => {
  const capabilities = new Map([['sandbox.list', {
    tool: { name: 'ignored', description: 'list', inputSchema: { type: 'object' } },
    target: null,
  }]])
  const owner = {
    capabilities,
    execute: async () => { throw Object.assign(new Error('busy'), { status: 409 }) },
  }
  const peer = { principal: { kind: 'owner' }, signal: new AbortController().signal }
  const [definition] = makeAgentToolDefinitions({ owner, peerFor: () => peer })
  assert.ok(definition, 'the list tool is built')
  const body = await definition.execute({}, { agent: { session: {} }, signal: peer.signal })
  assert.equal(body.status, 409)
  assert.equal(body.ok, false)
  assert.equal(body.errorId, 'sandbox.state_conflict')
  assert.equal('error' in body, false, 'no bare error text replaces the errorId')
})
