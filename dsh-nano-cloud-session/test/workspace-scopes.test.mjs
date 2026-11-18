import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkspaceScopes } from '../src/host/workspace-scopes.js'

const profile = { id: 'p-a', orgId: 'org-t', baseUrl: 'https://api.devin.ai', secret: 'cog_x' }

test('T04 same logical key shares one in-flight connect', async () => {
  const scopes = createWorkspaceScopes({ configEpochOf: () => 1 })
  let n = 0
  const factory = async (scope) => {
    n += 1
    await new Promise(r => setTimeout(r, 30))
    scope.resources = 'ready'
    return { root: '/tmp/ws', resources: 'ready', api: 'ready' }
  }
  const body = { session_id: 'devin-abc123' }
  const [a, b, c] = await Promise.all([
    scopes.connect(profile, body, factory),
    scopes.connect(profile, body, factory),
    scopes.connect(profile, body, factory),
  ])
  assert.equal(n, 1)
  assert.equal(a.scopeId, b.scopeId)
  assert.equal(b.scopeId, c.scopeId)
})

test('T04 different keys do not share; failure publishes no scope', async () => {
  const scopes = createWorkspaceScopes({ configEpochOf: () => 1 })
  const fail = async () => { throw new Error('boom') }
  await assert.rejects(() => scopes.connect(profile, { session_id: 'devin-aaa' }, fail), /boom/)
  await scopes.drain()
  assert.equal(scopes.list().length, 0)
  const ok = await scopes.connect({ ...profile, id: 'p-b' }, { session_id: 'devin-bbb' }, async (scope) => {
    scope.resources = 'ready'
    return { root: '/x', resources: 'ready', api: 'ready' }
  })
  assert.ok(ok.scopeId)
  assert.equal(scopes.list().length, 1)
})
