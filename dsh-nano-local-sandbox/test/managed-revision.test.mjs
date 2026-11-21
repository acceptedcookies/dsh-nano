import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { capabilityReport } from '../src/host/backend.js'
import { openControlRegistry } from '../src/host/control-registry.js'
import { createLifecycleOwner } from '../src/host/lifecycle-operations.js'

const PEER = { key: 'owner-1', operator: true }
const DIGEST = `sha256:${'ab'.repeat(32)}`

/**
 * A fake world the injected observe reads; the backend mutates it so every
 * pre/post inspect sees real transitions, and the profile is the trusted
 * descriptor seam — no argv trust.
 */
function fixture(t, { backend } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dnls-r6-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const registry = openControlRegistry({ root, envId: 'env-1' })
  t.after(() => { try { registry.close() } catch { /* closed */ } })

  const live = new Map()
  const calls = { create: [], stop: [], remove: [], image: [] }
  const realBackend = backend ?? {
    capabilities: () => capabilityReport(),
    async createManaged(spec) {
      calls.create.push(spec)
      live.set(spec.locator, {
        generation: `gen-${calls.create.length}`, stateVolume: spec.mounts.find((m) => m.target === '/state').source,
        state: 'running', publications: spec.ports.map((p) => ({ containerPort: p.containerPort, hostPort: p.hostPort, protocol: p.protocol, hostAddress: p.hostAddress })),
        imageDigest: DIGEST,
      })
      return { id: spec.locator }
    },
    async stop(name) { calls.stop.push(name); live.get(name).state = 'stopped' },
    async remove(name) { calls.remove.push(name); live.delete(name) },
    async imageEvidence(tag) { calls.image.push(tag); return { tag, digest: DIGEST } },
    async observe(locator) {
      const entry = live.get(locator)
      return entry ? { locator, ...entry, observedAt: 't' } : { locator, generation: null, stateVolume: null, state: 'missing' }
    },
    async inspect() { return { raw: '' } },
  }

  const profile = {
    profileId: 'kitesurf',
    recipeRef: 'recipe@sha256:1',
    portPlan: () => [{ serviceId: 'engine', containerPort: 8787, protocol: 'tcp', hostAddress: '127.0.0.1', portRange: [8900, 8903] }],
    createSpec: (row, { overrides = {} } = {}) => ({
      locator: row.binding.locator,
      image: 'dnls-kitesurf@sha256:img',
      mounts: [{ source: row.stateVolume, target: '/state', type: 'bind', readOnly: false }],
      ports: (row.ports ?? []).map((p) => ({ serviceId: p.serviceId, containerPort: p.containerPort, hostPort: p.hostPort, hostAddress: p.hostAddress, protocol: p.protocol })),
      resources: { cpus: overrides.cpus ?? 4 },
    }),
    preflight(row, { expectedRevision, overrides, evidence }) {
      const current = row.desiredRevision?.revision ?? 0
      if (expectedRevision !== current) { const e = new Error('stale expectedRevision'); e.code = 'revision.stale'; throw e }
      if (!evidence?.imageDigest) { const e = new Error('image digest could not be verified'); e.code = 'image.unknown_digest'; throw e }
      return { revision: current, overrides: overrides ?? {}, imageDigest: evidence.imageDigest }
    },
    verifySpec: (obs, row) => !!obs && obs.locator === row.binding.locator && obs.stateVolume === row.stateVolume,
  }

  const queue = []
  const owner = createLifecycleOwner({
    registry,
    envId: 'env-1',
    backend: realBackend,
    profileFor: async () => profile,
    observe: async (locator) => {
      const entry = live.get(locator)
      return entry ? { locator, ...entry, observedAt: 't' } : { locator, generation: null, stateVolume: null, state: 'missing' }
    },
    resolvePrincipal: ({ peer }) => (peer?.key ? {
      key: peer.key, operator: peer.operator === true,
      canSee: () => true, canUse: () => true,
    } : null),
    schedule: (task) => queue.push(task),
    audit: () => {},
  })
  const flush = () => { while (queue.length) queue.shift()() }
  const submit = async (action, args, sandboxId) => {
    const result = await owner.execute({ capability: 'sandbox.lifecycle', sandboxId, peer: PEER, args: { action, ...args } })
    flush()
    await owner.drain()
    return result
  }
  return { registry, calls, live, owner, submit }
}

test('saveRevision persists a rebuild-needed intent without any backend action', async (t) => {
  const f = fixture(t)
  const created = await f.submit('create', { name: 'box', requestId: 'c1' })
  const id = created.body.sandboxId
  const saved = f.registry.saveRevision(id, { expectedRevision: 0, overrides: { cpus: 2 } })
  assert.equal(saved.revision, 1)
  assert.equal(f.calls.stop.length + f.calls.remove.length, 0)
  assert.equal(f.calls.create.length, 1) // only the initial create
})

test('stale expectedRevision fails preflight before the first stop', async (t) => {
  const f = fixture(t)
  const created = await f.submit('create', { name: 'box', requestId: 'c1' })
  const id = created.body.sandboxId
  f.registry.saveRevision(id, { expectedRevision: 0, overrides: { cpus: 2 } })
  const op = await f.submit('recreate', { requestId: 'r1', expectedRevision: 0, interruptTerminals: true, preserveVolume: true }, id)
  flushOps(f, op, created)
  const done = f.registry.operation(id, op.body.operationId)
  assert.equal(done.state, 'failed')
  assert.equal(done.step, 'precheck')
  assert.equal(f.calls.stop.length, 0)
  assert.equal(f.calls.remove.length, 0)
  assert.equal(f.registry.get(id).appliedRevision.revision, 0)
  assert.equal(f.registry.get(id).appliedRevision.generation, 'gen-1')
})

// op submit is async through the queue; poll the stored op until terminal.
async function flushOps(f, op, created, tries = 20) {
  for (let i = 0; i < tries; i += 1) {
    const state = f.registry.operation(created.body.sandboxId ?? op.body.sandboxId, op.body.operationId)?.state
    if (state && !['accepted', 'running'].includes(state)) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

test('unknown image digest fails preflight negatively — no destructive step', async (t) => {
  const f = fixture(t, {
    backend: {
      capabilities: () => capabilityReport(),
      async createManaged() { throw new Error('unused') },
      async stop() { throw new Error('stop must not run') },
      async remove() { throw new Error('remove must not run') },
      async imageEvidence() { return null },
      async observe(locator) {
        const entry = live.get(locator)
        return entry ? { locator, ...entry, observedAt: 't' } : { locator, generation: null, stateVolume: null, state: 'missing' }
      },
      async inspect() { return { raw: '' } },
    },
  })
  // Seed a live row directly: a verified binding the observation can prove.
  const { registry, live } = f
  const row = registry.reserve({ name: 'box', profileId: 'kitesurf', principal: 'owner-1', recipeRef: 'recipe@sha256:1' })
  live.set(row.binding.locator, { generation: 'gen-1', stateVolume: row.stateVolume, state: 'running', imageDigest: DIGEST })
  registry.confirm(row.sandboxId, { locator: row.binding.locator, generation: 'gen-1', stateVolume: row.stateVolume })
  registry.saveRevision(row.sandboxId, { expectedRevision: 0, overrides: {} })
  const op = await f.submit('recreate', { requestId: 'r2', expectedRevision: 0, interruptTerminals: true, preserveVolume: true }, row.sandboxId)
  await flushOps(f, op, { body: { sandboxId: row.sandboxId } })
  const done = f.registry.operation(row.sandboxId, op.body.operationId)
  assert.equal(done.state, 'failed')
  assert.equal(done.step, 'precheck')
})

test('authorized recreate preserves the volume and advances the receipt only on a verified new generation', async (t) => {
  const f = fixture(t)
  const created = await f.submit('create', { name: 'box', requestId: 'c1' })
  const id = created.body.sandboxId
  const row0 = f.registry.get(id)
  const volume = row0.stateVolume
  const ports = row0.ports
  f.registry.saveRevision(id, { expectedRevision: 0, overrides: { cpus: 2 } })
  const op = await f.submit('recreate', { requestId: 'r3', expectedRevision: 1, interruptTerminals: true, preserveVolume: true }, id)
  await flushOps(f, op, created)
  const done = f.registry.operation(id, op.body.operationId)
  assert.equal(done.state, 'succeeded')
  const row = f.registry.get(id)
  assert.equal(row.stateVolume, volume)
  assert.deepEqual(row.ports, ports)
  assert.notEqual(row.binding.generation, 'gen-1')
  assert.equal(row.appliedRevision.revision, 1)
  assert.equal(row.appliedRevision.generation, row.binding.generation)
  assert.equal(row.appliedRevision.imageDigest, DIGEST)
  // Same mount source reached both creates — the state volume was preserved.
  assert.equal(f.calls.create.at(-1).mounts.find((m) => m.target === '/state').source, volume)
})

test('recreate without interrupt consent fails at precheck', async (t) => {
  const f = fixture(t)
  const created = await f.submit('create', { name: 'box', requestId: 'c1' })
  const id = created.body.sandboxId
  f.registry.saveRevision(id, { expectedRevision: 0, overrides: {} })
  const op = await f.submit('recreate', { requestId: 'r4', expectedRevision: 0, preserveVolume: true }, id)
  await flushOps(f, op, created)
  const done = f.registry.operation(id, op.body.operationId)
  assert.equal(done.state, 'failed')
  assert.equal(done.step, 'precheck')
  assert.equal(f.calls.stop.length, 0)
})
