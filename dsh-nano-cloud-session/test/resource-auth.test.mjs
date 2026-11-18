import test from 'node:test'
import assert from 'node:assert/strict'
import { RESOURCE_CODECS } from '../src/contracts/workspace-family.js'
import { createWorkspaceScopes } from '../src/host/workspace-scopes.js'
import { freezeWorkspaceRoot } from '../src/host/resource-service.js'

test('T10 unknown fields and recursive delete are rejected before any SSH', () => {
  assert.throws(() => RESOURCE_CODECS['fs.write'].decode({ path: 'a', bytes: 'YQ==', extra: true }), /unknown field/)
  assert.throws(() => RESOURCE_CODECS['fs.remove'].decode({ path: 'a', recursive: true }), /recursive/)
  assert.throws(() => RESOURCE_CODECS['process.start'].decode({ argv: [] }), /argv/)
})

test('T10 workspace root cannot escape the probed cwd', () => {
  assert.equal(freezeWorkspaceRoot('/home/ubuntu', undefined), '/home/ubuntu')
  assert.equal(freezeWorkspaceRoot('/home/ubuntu', '/home/ubuntu/repos/dsh-nano'), '/home/ubuntu/repos/dsh-nano')
  assert.throws(() => freezeWorkspaceRoot('/home/ubuntu', '/'), /absolute|probed|unsafe/)
  assert.throws(() => freezeWorkspaceRoot('/home/ubuntu', '/etc'), /probed cwd/)
  assert.throws(() => freezeWorkspaceRoot('/home/ubuntu', '/home/ubuntu/../etc'), /unsafe|probed/)
})

test('T10 write without authorization is denied', async () => {
  const scopes = createWorkspaceScopes({ configEpochOf: () => 1 })
  const profile = { id: 'p', orgId: 'org-t', baseUrl: 'https://api.devin.ai', secret: 'cog_x' }
  const snap = await scopes.connect(profile, { session_id: 'devin-abc' }, async (scope) => {
    scope.resources = 'ready'
    return { root: '/tmp', resources: 'ready', api: 'ready' }
  })
  assert.throws(() => scopes.requireReady(snap.scopeId, { write: true }), /not authorized/)
  assert.doesNotThrow(() => scopes.requireReady(snap.scopeId, { write: false }))
})
