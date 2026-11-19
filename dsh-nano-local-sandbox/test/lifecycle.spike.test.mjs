import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createUseBindings } from '../src/host/instance-registry.js'
import { openControlRegistry } from '../src/host/control-registry.js'
import { createLifecycleOwner } from '../src/host/lifecycle-operations.js'
import { createIdlePolicy } from '../src/host/idle-policy.js'
import { loadProfile } from '../src/host/profile-registry.js'

const production = join(dirname(fileURLToPath(import.meta.url)), '..', 'profiles', 'kitesurf')

test('DNLS03-T61 a verified idle stop preserves the managed object', async t => {
  assert.equal(loadProfile(production).manifest.lifecycle.idleTimeoutMs, 1800000)
  const root = mkdtempSync(join(tmpdir(), 'dnls-idle-'))
  const registry = openControlRegistry({ root, envId: 'test' })
  t.after(() => { registry.close(); rmSync(root, { recursive: true, force: true }) })
  const row = registry.reserve({ name: 'one', profileId: 'test', recipeRef: 'tested', principal: 'operator' })
  const obs = { locator: row.binding.locator, stateVolume: row.stateVolume, generation: 'g1', state: 'running' }
  registry.confirm(row.sandboxId, obs)
  const calls = []
  let proof = null, now = 0
  const backend = { async stop(id) { calls.push(id); obs.state = 'stopped' } }
  const profileFor = async () => ({ idleEvidence: () => proof, idleTimeoutMs: 50 })
  const observe = async () => ({ ...obs })
  const lifecycle = createLifecycleOwner({ registry, envId: 'test', profileFor, observe, backend })
  const uses = createUseBindings(registry, id => idle.touch(id))
  const idle = createIdlePolicy({ registry, envId: 'test', profileFor, observe, uses, stop: lifecycle.stopIfIdle, clock: () => now, cadenceMs: 25 })
  t.after(() => idle.close())
  const tick = async at => { now = at; await idle.tick() }
  await tick(0)
  await tick(30000)
  proof = { idle: true, activityEpoch: 'epoch-1' }
  await tick(30025)
  await tick(30050)
  await tick(31000)
  await tick(31025)
  assert.deepEqual(calls, [])
  await tick(31050)
  await tick(31100)
  assert.deepEqual(calls, [obs.locator])
  const stored = JSON.parse(readFileSync(join(root, 'registry.json'), 'utf8')).sandboxes[0]
  assert.equal(stored.removed, false)
  assert.equal(stored.sandboxId, row.sandboxId)
  assert.equal(stored.stateVolume, row.stateVolume)
  assert.equal(stored.operations.at(-1).state, 'succeeded')
  assert.equal(stored.operations.at(-1).action, 'stop')

})
