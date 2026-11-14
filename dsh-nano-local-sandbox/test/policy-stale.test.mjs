import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { policyFingerprint } from '../src/host/policy-adapter.js'
import { createInstanceRegistry } from '../src/host/instance-registry.js'
import { profileFixture } from './support/profile-fixture.mjs'

function harness() {
  const calls = { create: 0, stop: 0 }
  const backend = {
    async create() { calls.create += 1 },
    async stop() { calls.stop += 1 },
  }
  const registry = createInstanceRegistry({
    backend,
    profile: profileFixture(),
    volumeFor: (id) => join(mkdtempSync(join(tmpdir(), 'dnls-pol-')), id),
  })
  return { calls, registry }
}

test('mode and workspaceRoot changes are stale, and an unrelated label is not', async () => {
  const { calls, registry } = harness()
  const base = { mode: 'read-only', workspaceRoot: '/work/a', extraRoots: ['/b', '/a'], label: 'one' }
  const created = await registry.ensure({ sessionId: 's1', policy: base })
  const same = await registry.ensure({ sessionId: 's1', policy: { ...base, label: 'two' } })
  assert.equal(same.ok, true)
  assert.equal(same.instance.instanceId, created.instance.instanceId)
  assert.equal(policyFingerprint({ sessionId: 's1', mode: 'read-only', workspaceRoot: '/work/a', extraRoots: ['/b', '/a'] }),
    policyFingerprint({ sessionId: 's1', mode: 'read-only', workspaceRoot: '/work/a', extraRoots: ['/a', '/b'], label: 'ignored' }))
  const staleMode = await registry.ensure({ sessionId: 's1', policy: { ...base, mode: 'workspace-write' } })
  assert.equal(staleMode.ok, false)
  assert.equal(staleMode.status, 409)
  assert.equal(staleMode.errorId, 'sandbox.instance.policy-stale')
  assert.equal(typeof staleMode.expectedFingerprint, 'string')
  assert.notEqual(staleMode.expectedFingerprint, created.instance.policyFingerprint)
  assert.equal(calls.stop, 0)
  assert.equal(calls.create, 1)
  const { calls: calls2, registry: registry2 } = harness()
  const first = await registry2.ensure({ sessionId: 's9', policy: base })
  const staleRoot = await registry2.ensure({ sessionId: 's9', policy: { ...base, workspaceRoot: '/work/other' } })
  assert.equal(staleRoot.errorId, 'sandbox.instance.policy-stale')
  assert.notEqual(staleRoot.expectedFingerprint, first.instance.policyFingerprint)
  assert.equal(calls2.create, 1)
  assert.equal(registry2.instances.has(first.instance.instanceId), true)
  assert.equal(staleRoot.instance, undefined)
})
