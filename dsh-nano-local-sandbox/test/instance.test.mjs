import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createInstanceRegistry } from '../src/host/instance-registry.js'
import { profileFixture } from './support/profile-fixture.mjs'

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'host', 'instance-registry.js'), 'utf8')

function harness() {
  const calls = { create: 0, stop: 0 }
  const backend = {
    async create() { calls.create += 1 },
    async stop() { calls.stop += 1 },
  }
  const root = mkdtempSync(join(tmpdir(), 'dnls-inst-'))
  const registry = createInstanceRegistry({
    backend,
    profile: profileFixture(),
    volumeFor: (id) => join(root, id),
  })
  return { calls, registry }
}

test('the same triple reuses one id and create runs once; degrade does not cross instances', async () => {
  assert.equal(/^(?:let|const|var) phase\b/m.test(source), false)
  const { calls, registry } = harness()
  const policy = { mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [] }
  const first = await registry.ensure({ sessionId: 's1', policy })
  const second = await registry.ensure({ sessionId: 's1', policy })
  assert.equal(first.instance.instanceId, second.instance.instanceId)
  assert.equal(calls.create, 1)
  const other = await registry.ensure({
    sessionId: 's2',
    policy: { mode: 'workspace-write', workspaceRoot: '/work/b', extraRoots: [] },
  })
  assert.notEqual(other.instance.instanceId, first.instance.instanceId)
  registry.reconcile(first.instance.instanceId, { healthy: true })
  const before = other.instance.phase
  registry.reconcile(first.instance.instanceId, { healthy: false })
  assert.equal(other.instance.phase, before)
})
