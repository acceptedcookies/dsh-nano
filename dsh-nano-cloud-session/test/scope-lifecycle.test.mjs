import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkspaceScopes } from '../src/host/workspace-scopes.js'

test('T11 profile epoch invalidates existing scopes', async () => {
  let epoch = 1
  const scopes = createWorkspaceScopes({ configEpochOf: () => epoch })
  const profile = { id: 'p', orgId: 'org-t', baseUrl: 'https://api.devin.ai', secret: 'cog_x' }
  let cleaned = 0
  const snap = await scopes.connect(profile, { session_id: 'devin-abc' }, async (scope) => {
    scope.cleanup = async () => { cleaned += 1 }
    return { root: '/tmp', resources: 'ready', api: 'ready' }
  })
  await scopes.invalidateProfile('p')
  assert.throws(() => scopes.get(snap.scopeId), /not valid|expired/)
  assert.equal(cleaned, 1)
  epoch = 2
  const next = await scopes.connect(profile, { session_id: 'devin-abc' }, async () => ({ root: '/tmp', resources: 'ready', api: 'ready' }))
  assert.notEqual(next.scopeId, snap.scopeId)
  assert.throws(() => scopes.requireReady(snap.scopeId, { write: true }), /expired|not valid|not found/)
})
