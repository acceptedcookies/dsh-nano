import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkspaceScopes } from '../src/host/workspace-scopes.js'

test('T11 profile epoch invalidates existing scopes', async () => {
  let epoch = 1
  const scopes = createWorkspaceScopes({ configEpochOf: () => epoch })
  const profile = { id: 'p', orgId: 'org-t', baseUrl: 'https://api.devin.ai', secret: 'cog_x' }
  const snap = await scopes.connect(profile, { session_id: 'devin-abc' }, async () => ({ root: '/tmp', resources: 'ready', api: 'ready' }))
  scopes.invalidateProfile('p')
  assert.throws(() => scopes.get(snap.scopeId), /not valid|expired/)
  epoch = 2
  const next = await scopes.connect(profile, { session_id: 'devin-abc' }, async () => ({ root: '/tmp', resources: 'ready', api: 'ready' }))
  assert.notEqual(next.scopeId, snap.scopeId)
})
