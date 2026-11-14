import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createInstanceRegistry } from '../src/host/instance-registry.js'
import { loadProfile } from '../src/host/profile-registry.js'

const production = join(dirname(fileURLToPath(import.meta.url)), '..', 'profiles', 'kitesurf')

test('sweep reads the fixture profile and the production timeout stays 1800000', async () => {
  const original = readFileSync(join(production, 'profile.yaml'), 'utf8')
  assert.match(original, /idleTimeoutMs: 1800000/)
  const dir = mkdtempSync(join(tmpdir(), 'dnls-life-'))
  cpSync(production, dir, { recursive: true })
  writeFileSync(join(dir, 'profile.yaml'), original.replace('idleTimeoutMs: 1800000', 'idleTimeoutMs: 50'))
  const loaded = loadProfile(dir)
  assert.equal(loaded.ready, true, loaded.errors.join(','))
  assert.equal(loaded.manifest.lifecycle.idleTimeoutMs, 50)
  assert.match(readFileSync(join(production, 'profile.yaml'), 'utf8'), /idleTimeoutMs: 1800000/)

  const clock = { t: 1000 }
  const calls = { create: 0, stop: 0, seenDuringStop: null }
  let registry
  const backend = {
    async create() { calls.create += 1 },
    async stop() {
      calls.stop += 1
      registry.instances.forEach(() => {})
      calls.seenDuringStop = registry.instances.size
    },
  }
  registry = createInstanceRegistry({
    backend,
    profile: loaded.manifest,
    now: () => clock.t,
    volumeFor: (id) => join(dir, 'vol', id),
  })
  const policy = { mode: 'read-only', workspaceRoot: '/work/a', extraRoots: [] }
  const created = await registry.ensure({ sessionId: 's1', policy })
  await registry.sweep()
  assert.equal(calls.stop, 0)
  clock.t = 1000 + loaded.manifest.lifecycle.idleTimeoutMs - 1
  await registry.sweep()
  assert.equal(calls.stop, 0)
  clock.t = 1000 + loaded.manifest.lifecycle.idleTimeoutMs
  await registry.sweep()
  assert.equal(calls.stop, 1)
  assert.equal(calls.seenDuringStop, 1)
  assert.equal(registry.instances.has(created.instance.instanceId), false)

  const again = await registry.ensure({ sessionId: 's2', policy: { ...policy, workspaceRoot: '/work/b' } })
  again.instance.attached = true
  clock.t += loaded.manifest.lifecycle.idleTimeoutMs + 10
  const stops = calls.stop
  await registry.sweep()
  assert.equal(calls.stop, stops)

  const cap = loaded.manifest.lifecycle.maxInstances
  const fresh = createInstanceRegistry({
    backend,
    profile: loaded.manifest,
    now: () => clock.t,
    volumeFor: (id) => join(dir, 'vol2', id),
  })
  for (let index = 0; index < cap; index += 1) {
    const result = await fresh.ensure({
      sessionId: `cap-${index}`,
      policy: { ...policy, workspaceRoot: `/work/cap-${index}` },
    })
    assert.equal(result.ok, true)
  }
  const before = fresh.instances.size
  const creates = calls.create
  const overflow = await fresh.ensure({
    sessionId: 'cap-overflow',
    policy: { ...policy, workspaceRoot: '/work/overflow' },
  })
  assert.notEqual(Math.floor(overflow.status / 100), 2)
  assert.equal(fresh.instances.size, before)
  assert.equal(calls.create, creates)
  assert.equal(overflow.errorId, undefined)
})
