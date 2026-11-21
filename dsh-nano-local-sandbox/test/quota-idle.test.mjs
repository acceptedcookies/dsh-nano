import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { openControlRegistry } from '../src/host/control-registry.js'
import { createUseBindings } from '../src/host/instance-registry.js'

test('T61 quota counts durable objects, not sessions, and arbitrates concurrent create/adopt', async t => {
  const root = mkdtempSync(join(tmpdir(), 'dnls-quota-'))
  const registry = openControlRegistry({ root, envId: 'dev' })
  t.after(() => { registry.close(); rmSync(root, { recursive: true, force: true }) })
  const intent = name => ({ name, principal: 'owner', profileId: 'p', recipeRef: 'pin' })
  const observation = n => ({ locator: 'loc' + n, generation: 'G1', stateVolume: join(root, 'vol' + n), state: 'stopped' })
  const a = registry.adopt(intent('first'), observation(1), [], 2)
  const uses = createUseBindings(registry)
  for (const sessionId of ['s1', 's2']) {
    assert.equal(uses.ensure({ sessionId, sandboxId: a.sandboxId, policy: { mode: 'read-only', workspaceRoot: '/work' } }).ok, true)
  }
  const create = () => registry.accept({ requestId: 'req2', principal: 'owner', fingerprint: 'fingerprint',
    action: 'create', createIntent: intent('second'), maxInstances: 2 })
  const competing = await Promise.allSettled([Promise.resolve().then(create),
    Promise.resolve().then(() => registry.adopt(intent('third'), observation(3), [], 2))])
  assert.equal(competing[0].status, 'fulfilled')
  assert.equal(competing[1].reason.errorId, 'sandbox.quota')
  assert.equal(registry.list().length, 2)
  assert.equal(create().isNew, false)
  const second = competing[0].value.operation
  registry.transition(second.operationId, 'accepted', { state: 'cancelled', removed: true })
  assert.ok(registry.adopt(intent('third'), observation(3), [], 2))
  assert.equal(registry.get(a.sandboxId).binding.generation, 'G1')
})
