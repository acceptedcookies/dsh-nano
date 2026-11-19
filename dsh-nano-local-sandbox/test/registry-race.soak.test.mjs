import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { openControlRegistry } from '../src/host/control-registry.js'
import { createIdlePolicy } from '../src/host/idle-policy.js'
import { createUseBindings } from '../src/host/instance-registry.js'

test('T81 a competing writer and a new use arrive while expiry is checking the object', async t => {
  for (let i = 1; i <= 20; i++) {
    await t.test(`round ${i}`, async t => {
      const root = mkdtempSync(join(tmpdir(), 'dnls-arbitration-'))
      const registry = openControlRegistry({ root, envId: 'dev' })
      t.after(() => { registry.close(); rmSync(root, { recursive: true, force: true }) })
      const row = registry.reserve({ name: 'box', principal: 'owner', profileId: 'p', recipeRef: 'pin' })
      const obs = { locator: row.binding.locator, generation: 'G1', stateVolume: row.stateVolume, state: 'running' }
      registry.confirm(row.sandboxId, obs)
      const reached = Promise.withResolvers(), resume = Promise.withResolvers()
      let now = 0, attempts = 0
      const uses = createUseBindings(registry, id => idle.touch(id))
      const idle = createIdlePolicy({ registry, uses, envId: 'dev', clock: () => now,
        profileFor: async () => ({ idleTimeoutMs: 100, idleEvidence: async () => {
          if (now === 100) { reached.resolve(); await resume.promise }
          return { idle: true, activityEpoch: '1' }
        } }), observe: async () => obs, stop: () => { attempts++ } })
      await idle.tick()
      now = 100
      const checking = idle.tick()
      await reached.promise
      try {
        const before = readFileSync(join(root, 'registry.json'))
        assert.throws(() => openControlRegistry({ root, envId: 'dev' }), { errorId: 'sandbox.state_conflict' })
        assert.deepEqual(readFileSync(join(root, 'registry.json')), before)
        if (i % 2) {
          assert.ok(uses.ensure({ sandboxId: row.sandboxId, sessionId: 'session', policy: { mode: 'read-only', workspaceRoot: '/work' } }).ok)
        } else {
          const { ref } = registry.reserveTerminal(row.sandboxId, { principal: 'owner', generation: 'G1', openId: `open-${i}`, fingerprint: 'pane' })
          registry.transitionTerminal(row.sandboxId, ref.terminalId, { state: 'active', generation: 'G1' })
          assert.equal(registry.get(row.sandboxId).terminals[0].state, 'active')
        }
      } finally { resume.resolve(); await checking; await idle.close() }
      assert.equal(attempts, 0)
      assert.equal(registry.get(row.sandboxId).binding.generation, 'G1')
    })
  }
})
