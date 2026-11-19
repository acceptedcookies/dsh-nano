import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { openControlRegistry } from '../src/host/control-registry.js'
import { serviceMappings } from '../src/host/managed-profile.js'

function registryFor(t) {
  const root = mkdtempSync(join(tmpdir(), 'dnls-p6-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const registry = openControlRegistry({ root, envId: 'env-1' })
  t.after(() => { try { registry.close() } catch { /* closed */ } })
  return { registry, root }
}

const intent = (name) => ({ name, profileId: 'kitesurf', principal: 'owner-1', recipeRef: 'recipe@sha256:1' })
const PLAN = [
  { serviceId: 'engine', containerPort: 8787, protocol: 'tcp', hostAddress: '127.0.0.1', portRange: [8900, 8901] },
  { serviceId: 'bridge', containerPort: 8791, protocol: 'tcp', hostAddress: '127.0.0.1', portRange: [8900, 8901] },
]

function create(registry, name, plan = PLAN, extra = {}) {
  return registry.accept({
    principal: 'owner-1', requestId: `req-${name}`, action: 'create', fingerprint: 'fp',
    createIntent: intent(name), portPlan: plan, ...extra,
  })
}

test('create intent reserves a full set of unique tuples synchronously', (t) => {
  const { registry } = registryFor(t)
  const { operation } = create(registry, 'a')
  const row = registry.get(operation.sandboxId)
  assert.equal(row.ports.length, 2)
  assert.deepEqual(row.ports.map((p) => p.hostPort), [8900, 8901])
  assert.ok(row.ports.every((p) => p.hostAddress === '127.0.0.1' && p.protocol === 'tcp'))
  assert.ok(Number.isInteger(row.managedAt) && row.managedAt >= 0)
  assert.equal(row.desiredRevision, null)
  assert.equal(row.appliedRevision, null)
})

test('second object never reuses a live tuple', (t) => {
  const { registry } = registryFor(t)
  create(registry, 'a')
  const { operation } = create(registry, 'b', [
    { serviceId: 'engine', containerPort: 8787, protocol: 'tcp', hostAddress: '127.0.0.1', portRange: [8900, 8904] },
    { serviceId: 'bridge', containerPort: 8791, protocol: 'tcp', hostAddress: '127.0.0.1', portRange: [8900, 8904] },
  ])
  assert.deepEqual(registry.get(operation.sandboxId).ports.map((p) => p.hostPort), [8902, 8903])
})

test('allocation skips every tuple claimed by a live row across profiles', (t) => {
  const { registry } = registryFor(t)
  create(registry, 'a')
  const { operation } = registry.accept({
    principal: 'o2', requestId: 'r2', action: 'create', fingerprint: 'fp',
    createIntent: { name: 'b', profileId: 'other', principal: 'o2', recipeRef: 'r@sha256:2' },
    portPlan: [{ serviceId: 'x', containerPort: 9000, protocol: 'tcp', hostAddress: '127.0.0.1', portRange: [8900, 8903] }],
  })
  assert.equal(registry.get(operation.sandboxId).ports[0].hostPort, 8902)
})

test('pool exhaustion rejects the whole intent — nothing reserved', (t) => {
  const { registry } = registryFor(t)
  create(registry, 'a')
  assert.throws(() => create(registry, 'b'), /no free host port/)
  assert.equal(registry.list().length, 1)
})

test('tombstone releases reservations; reopen rejects duplicate tuples', (t) => {
  const { registry, root } = registryFor(t)
  const { operation } = create(registry, 'a')
  registry.transition(operation.operationId, 'accepted', { state: 'cancelled', step: 'x', removed: true })
  const { operation: op2 } = create(registry, 'b')
  assert.deepEqual(registry.get(op2.sandboxId).ports.map((p) => p.hostPort), [8900, 8901])
  registry.close()
  const again = openControlRegistry({ root, envId: 'env-1' })
  t.after(() => again.close())
  assert.throws(() => create(again, 'c'), /no free host port|already registered|name already/)
})

test('adopt populates exact observed tuples and rejects collisions', (t) => {
  const { registry } = registryFor(t)
  create(registry, 'a')
  const obs = { locator: 'L9', generation: 'g1', stateVolume: '/v/9' }
  assert.throws(() => registry.adopt(intent('z'), obs, [{ serviceId: 'e', containerPort: 8787, hostPort: 8900, protocol: 'tcp', hostAddress: '127.0.0.1' }]), /already claimed/)
  const row = registry.adopt(intent('z'), obs, [{ serviceId: 'e', containerPort: 8787, hostPort: 8999, protocol: 'tcp', hostAddress: '127.0.0.1' }])
  assert.equal(row.ports[0].hostPort, 8999)
  assert.throws(() => registry.adopt(intent('w'), { locator: 'L8', generation: 'g2', stateVolume: '/v/8' }, [{ serviceId: 'e', containerPort: 8787, hostPort: 8999, protocol: 'tcp', hostAddress: '127.0.0.1' }]), /already claimed/)
})

test('saveRevision is bookkeeping-only: stale expectedRevision and pending ops reject', (t) => {
  const { registry } = registryFor(t)
  const { operation } = create(registry, 'a')
  const id = operation.sandboxId
  assert.throws(() => registry.saveRevision(id, { expectedRevision: 0, overrides: {} }), /in progress|pending/)
  registry.transition(operation.operationId, 'accepted', { state: 'running', step: 'x' })
  assert.throws(() => registry.transition(operation.operationId, 'running', { state: 'succeeded', binding: { locator: 'other', generation: 'g1' } }))
  registry.transition(operation.operationId, 'running', { state: 'succeeded', step: 'verify', binding: { locator: registry.get(id).binding.locator, generation: 'g1' } })
  assert.throws(() => registry.saveRevision(id, { expectedRevision: 3, overrides: {} }), /stale expectedRevision/)
  const saved = registry.saveRevision(id, { expectedRevision: 0, overrides: { cpus: 2 } })
  assert.equal(saved.revision, 1)
  assert.deepEqual(saved.overrides, { cpus: 2 })
  assert.throws(() => registry.saveRevision(id, { expectedRevision: 0, overrides: {} }), /stale expectedRevision/)
  assert.throws(() => registry.saveRevision(id, { expectedRevision: 1, overrides: { threads: 2 } }), /not supported/)
  const defaults = registry.saveRevision(id, { expectedRevision: 1, overrides: {} })
  assert.equal(defaults.revision, 2)
})

test('serviceMappings publishes only the unique proven tuple', () => {
  const row = { binding: { locator: 'container-a', generation: 'G1' }, stateVolume: '/vol/A',
    ports: [{ serviceId: 'engine', containerPort: 8787, hostPort: 8900, protocol: 'tcp', hostAddress: '127.0.0.1' }] }
  const services = [{ id: 'engine', port: 8787, protocol: 'tcp', role: 'engine' }]
  const observed = { ...row.binding, stateVolume: row.stateVolume, state: 'running', publications: [row.ports[0]], observedAt: 't' }
  const hit = serviceMappings(row, observed, services)
  assert.equal(hit[0].published, true)
  assert.equal(hit[0].health, 'unknown')
  assert.equal(hit[0].observedVersion, null)
  assert.equal(hit[0].hostPort, 8900)
  assert.equal(serviceMappings(row, { ...observed, generation: 'G2' }, services)[0].hostPort, null)
  const miss = serviceMappings(row, { ...observed, publications: [{ ...row.ports[0], hostPort: 9999 }] }, services)
  assert.equal(miss[0].published, false)
  assert.equal(miss[0].health, 'unknown')
})
