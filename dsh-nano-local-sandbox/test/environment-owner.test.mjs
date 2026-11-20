/**
 * P6 integration: the real environment-owner composition — trusted profile
 * source + lifecycle + terminal + usage — driven through the managed MCP
 * router against a raw Apple-shaped backend fixture. Nothing here fakes the
 * profile, the registry or the wire contract; only the container CLI is
 * replaced by a recording backend that answers inspect with real
 * ManagedContainer JSON.
 */
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { openEnvironmentOwner } from '../src/host/environment-owner.js'
import { capabilityReport } from '../src/host/backend.js'
import { resolveOwnerPrincipal } from '../src/host/object-authz.js'
import { createManagedRoutes } from '../src/host/managed-routes.js'
import { loadProfileDriver } from '../src/host/profile-drivers.js'
import { BINDING_TABLE } from '../lib/bindings.js'
import { runtimeRoot } from '../profiles/kitesurf/driver/runtime.js'
import { DIGEST, makeBackend, materializeRuntime } from './support/managed-apple.mjs'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const MCP_PATH = '/nano-local-sandbox/mcp'
const CONTRACT = 'dnls.control/1'
const OTHER_DIGEST = `sha256:${'cd'.repeat(32)}`

function ownerPeer(controller = new AbortController()) {
  return { principal: { kind: 'owner' }, signal: controller.signal }
}

async function setup(t, scoped = false, backendOverride = null) {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'dnls-env-owner-')))
  const profilesRoot = join(home, 'profiles')
  cpSync(join(packageRoot, 'profiles', 'kitesurf'), join(profilesRoot, 'kitesurf'), { recursive: true })
  const env = {
    DNLS_ENV: 'dev',
    DSH_HOME: home,
    DNLS_STATE_ROOT: join(home, 'state'),
    DNLS_PROFILES: profilesRoot,
  }
  const ready = await loadProfileDriver(join(profilesRoot, 'kitesurf'), { env, profilesRoot })
  assert.equal(ready.ready, true, ready.errors?.join(', '))
  materializeRuntime(runtimeRoot(ready.manifest, { env }), ready.manifest)

  const backend = backendOverride ?? makeBackend()
  const audits = []
  let peer = ownerPeer()
  const connection = { admit: async () => ({ peer }) }
  const owner = openEnvironmentOwner({
    env,
    profilesRoot,
    backend,
    connection,
    webServer: { registerUpgrade: () => () => {} },
    originFor: async () => 'ws://127.0.0.1',
    audit: (event) => audits.push(event),
    ...(scoped && { resolvePrincipal: input => resolveOwnerPrincipal(input) && {
      key: 'fixture-user', operator: true, canUse: true, canSee: true,
    } }),
    // Frozen clock: the usage sampler's first tick lands a full minute out
    // (unref'd) so backend call counts stay exact for the whole test.
    clock: () => 0,
  })
  const specs = createManagedRoutes({ capabilities: owner.capabilities, execute: owner.execute, connection, table: BINDING_TABLE })
  const mcp = specs.find((spec) => spec.path === MCP_PATH)
  assert.ok(mcp, 'managed mcp route spec')
  let id = 0
  async function call(name, args) {
    const req = {
      method: 'POST',
      url: MCP_PATH,
      headers: {},
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++id,
        method: 'tools/call',
        params: { name, arguments: args, _meta: { 'dnls/contract': CONTRACT } },
      }),
    }
    const res = { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v }, end(text) { this.text = text } }
    await mcp.handler(req, res)
    return { res, result: JSON.parse(res.text).result }
  }
  async function create(suffix = 'a') {
    const { result } = await call('sandbox.instance.create', { name: `sb-${suffix}`, profileId: 'kitesurf', requestId: `create-${suffix}` })
    assert.equal(result.isError, false, JSON.stringify(result))
    const sandboxId = result.structuredContent.sandboxId
    await owner.drain()
    return owner.registry.get(sandboxId)
  }
  const setPeer = (next) => { peer = next }
  t.after(async () => {
    await owner.close()
    rmSync(home, { recursive: true, force: true })
  })
  return { home, env, backend, audits, owner, call, create, setPeer, manifest: ready.manifest }
}

test('environment-owner create: real registry row, bound generation, actual spec evidence', async (t) => {
  const { owner, backend, create, manifest, env } = await setup(t)
  const row = await create('one')
  assert.match(row.binding.locator, /^dnls-/)
  assert.ok(row.binding.generation, 'bound generation recorded')
  assert.ok(row.appliedRevision)
  assert.equal(row.appliedRevision.revision, 0)
  assert.equal(row.appliedRevision.generation, row.binding.generation)
  assert.equal(row.appliedRevision.recipeRef, row.recipeRef)
  assert.equal(row.appliedRevision.imageDigest, DIGEST)
  assert.match(row.appliedRevision.verifiedAt, /^\d{4}-/)

  const spec = backend.calls.find((entry) => entry[0] === 'createManaged')[1]
  assert.equal(spec.locator, row.binding.locator)
  assert.equal(spec.image, manifest.build.image)
  assert.equal(spec.resources.cpus, 4)
  assert.equal(spec.resources.memoryBytes, 4 * 1024 ** 3)
  // Neutral mounts: the volume source is the row's own state dir and no
  // provider-specific CLI arg string crosses the domain boundary.
  const volumeMount = spec.mounts.find((m) => m.target === '/var/lib/kitesurf-state')
  assert.equal(volumeMount.source, row.stateVolume)
  assert.equal(volumeMount.type, 'bind')
  assert.equal(volumeMount.readOnly, false)
  assert.ok(spec.mounts.every((m) => !('arg' in m)))
  // Volume is under the canonical state root and was created by the driver.
  assert.equal(row.stateVolume, join(realpathSync(env.DNLS_STATE_ROOT), 'kitesurf', row.sandboxId))
  assert.ok(existsSync(row.stateVolume))

  // Two reserved tuples inside the declared dev pool, actual in inspect.
  assert.equal(row.ports.length, 2)
  assert.deepEqual(row.ports.map((p) => p.containerPort).sort((a, b) => a - b), [8787, 8791])
  for (const port of row.ports) {
    assert.equal(port.protocol, 'tcp')
    assert.equal(port.hostAddress, '127.0.0.1')
    assert.ok(port.hostPort >= 8940 && port.hostPort <= 8979, `hostPort ${port.hostPort} in dev pool`)
    assert.deepEqual(Object.keys(port).sort(), ['containerPort', 'hostAddress', 'hostPort', 'protocol', 'serviceId'])
  }
  const obs = await owner.observe(row)
  assert.equal(obs.state, 'running')
  assert.equal(obs.generation, row.binding.generation)
  assert.equal(obs.resources.cpus, 4)
  assert.equal(obs.resources.memoryBytes, 4 * 1024 ** 3)
  assert.equal(obs.imageDigest, DIGEST)
})

test('environment-owner revision.save: durable rev1, zero backend calls, stale 409', async (t) => {
  const { backend, call, create } = await setup(t)
  const row = await create('two')
  const before = backend.calls.length
  const { result } = await call('sandbox.revision.save', {
    sandboxId: row.sandboxId,
    expectedRevision: 0,
    overrides: { cpus: 2, memoryBytes: 512 * 1024 ** 2 },
  })
  assert.equal(result.isError, false, JSON.stringify(result))
  assert.equal(result.structuredContent.desiredRevision.revision, 1)
  assert.deepEqual(result.structuredContent.desiredRevision.overrides, { cpus: 2, memoryBytes: 512 * 1024 ** 2 })
  assert.equal(result.structuredContent.requiresRecreate, true)
  assert.equal(backend.calls.length, before, 'save made backend calls')
  assert.equal(backend.count('create'), 1)

  const stale = await call('sandbox.revision.save', {
    sandboxId: row.sandboxId,
    expectedRevision: 0,
    overrides: { cpus: 2 },
  })
  assert.equal(stale.result.isError, true)
  assert.equal(stale.result.structuredContent.status, 409)
  assert.equal(stale.result.structuredContent.errorId, 'sandbox.state_conflict')
  assert.equal(backend.calls.length, before)
})

test('environment-owner services: actual loopback tuples, unknown health, denied peers', async (t) => {
  const { owner, call, create, setPeer } = await setup(t)
  const row = await create('three')
  const { result } = await call('sandbox.services', { sandboxId: row.sandboxId })
  assert.equal(result.isError, false, JSON.stringify(result))
  const services = result.structuredContent.services
  assert.equal(services.length, 2)
  for (const service of services) {
    const reserved = row.ports.find((p) => p.serviceId === service.serviceId)
    assert.ok(reserved, `reservation for ${service.serviceId}`)
    assert.equal(service.published, true)
    assert.equal(service.hostPort, reserved.hostPort)
    assert.equal(service.hostAddress, reserved.hostAddress)
    assert.equal(service.protocol, reserved.protocol)
    assert.equal(service.health, 'unknown')
    assert.equal(service.observedVersion, null)
    assert.ok(service.observedAt)
  }
  assert.deepEqual(services.map((s) => s.serviceId).sort(), ['engine', 'mcp-bridge'])

  // Foreign principal kind resolves to nothing: denied without object access.
  setPeer({ principal: { kind: 'stranger' }, signal: new AbortController().signal })
  const foreign = await call('sandbox.services', { sandboxId: row.sandboxId })
  assert.equal(foreign.result.isError, true)
  assert.equal(foreign.result.structuredContent.ok, false)
  assert.equal(foreign.res.statusCode, 403)

  // A revoked (aborted) owner signal fails admission itself.
  const controller = new AbortController()
  controller.abort()
  setPeer({ principal: { kind: 'owner' }, signal: controller.signal })
  const revoked = await call('sandbox.services', { sandboxId: row.sandboxId })
  assert.equal(revoked.result.isError, true)
  assert.equal(revoked.result.structuredContent.ok, false)
  assert.equal(revoked.res.statusCode, 403)
  assert.equal((await owner.observe(owner.registry.get(row.sandboxId))).state, 'running')
})

test('environment-owner recreate: verified replace keeps volume+ports, ends terminals, advances receipt', async (t) => {
  const { owner, backend, call, create } = await setup(t, true)
  const row = await create('four')
  const old = { generation: row.binding.generation, volume: row.stateVolume, ports: row.ports }

  const terminal = await call('term.session.create', {
    sandboxId: row.sandboxId, openId: 'o-1', paneId: 'p-1', service: 'engine',
  })
  assert.equal(terminal.result.isError, false, JSON.stringify(terminal.result))
  const terminalId = terminal.result.structuredContent.terminalId

  const save = await call('sandbox.revision.save', {
    sandboxId: row.sandboxId, expectedRevision: 0,
    overrides: { cpus: 2, memoryBytes: 512 * 1024 ** 2 },
  })
  assert.equal(save.result.isError, false)

  const recreate = await call('sandbox.instance.recreate', {
    sandboxId: row.sandboxId, requestId: 'recreate-1',
    expectedRevision: 1, interruptTerminals: true, preserveVolume: true,
  })
  assert.equal(recreate.result.isError, false, JSON.stringify(recreate.result))
  await owner.drain()

  const fresh = owner.registry.get(row.sandboxId)
  const op = fresh.operations.find((entry) => entry.action === 'recreate')
  assert.equal(op.state, 'succeeded')
  assert.equal(op.step, 'verify')
  assert.notEqual(fresh.binding.generation, old.generation, 'new generation required')
  assert.equal(fresh.binding.locator, row.binding.locator)
  assert.equal(fresh.stateVolume, old.volume)
  assert.deepEqual(fresh.ports, old.ports)
  assert.equal(fresh.terminals.find((entry) => entry.terminalId === terminalId).state, 'ended')

  // Actual spec dispatched for the replacement carried the revision's limits.
  const specs = backend.calls.filter((entry) => entry[0] === 'create').map((entry) => entry[1])
  const replacement = specs[1]
  assert.equal(replacement.containerName, fresh.binding.locator)
  assert.equal(replacement.resources.cpus, 2)
  assert.equal(replacement.resources.memoryBytes, 512 * 1024 ** 2)
  assert.deepEqual(replacement.ports.map((p) => ({ containerPort: p.containerPort, hostPort: p.hostPort })),
    old.ports.map((p) => ({ containerPort: p.containerPort, hostPort: p.hostPort })))
  assert.equal(replacement.mounts.find((m) => m.target === '/var/lib/kitesurf-state').source, old.volume)

  assert.deepEqual({
    revision: fresh.appliedRevision.revision,
    generation: fresh.appliedRevision.generation,
    imageDigest: fresh.appliedRevision.imageDigest,
    recipeRef: fresh.appliedRevision.recipeRef,
  }, { revision: 1, generation: fresh.binding.generation, imageDigest: DIGEST, recipeRef: fresh.recipeRef })
})

test('environment-owner recreate: preflight failure performs no destructive action', async (t) => {
  const { owner, backend, call, create } = await setup(t)
  const row = await create('five')
  const save = await call('sandbox.revision.save', {
    sandboxId: row.sandboxId, expectedRevision: 0,
    overrides: { cpus: 2, memoryBytes: 512 * 1024 ** 2 },
  })
  assert.equal(save.result.isError, false)

  // Old artifact no longer proves itself: the reported image digest moved.
  backend.containers.get(row.binding.locator).digest = OTHER_DIGEST
  const callsBefore = backend.calls.length
  const recreate = await call('sandbox.instance.recreate', {
    sandboxId: row.sandboxId, requestId: 'recreate-2',
    expectedRevision: 1, interruptTerminals: true, preserveVolume: true,
  })
  assert.equal(recreate.result.isError, false)
  await owner.drain()

  const fresh = owner.registry.get(row.sandboxId)
  const op = fresh.operations.find((entry) => entry.action === 'recreate')
  assert.equal(op.state, 'failed')
  assert.equal(op.step, 'precheck')
  // Only inspect/imageEvidence may have run since the dispatch — nothing else.
  for (const entry of backend.calls.slice(callsBefore)) assert.ok(['observe', 'inspect', 'imageEvidence'].includes(entry[0]), entry[0])
  assert.equal(backend.count('stop'), 0)
  assert.equal(backend.count('remove'), 0)
  assert.equal(backend.count('create'), 1)
  assert.equal(fresh.binding.generation, row.binding.generation)
  assert.equal(fresh.appliedRevision.revision, 0)
  assert.equal((await owner.observe(fresh)).state, 'running')
})

test('environment-owner recreate: unverifiable replacement is indeterminate and keeps the old receipt', async (t) => {
  const { owner, backend, call, create } = await setup(t)
  const row = await create('six')
  const oldReceipt = structuredClone(row.appliedRevision)
  const save = await call('sandbox.revision.save', {
    sandboxId: row.sandboxId, expectedRevision: 0,
    overrides: { cpus: 2, memoryBytes: 512 * 1024 ** 2 },
  })
  assert.equal(save.result.isError, false)

  // The replacement actually reports different memory than it was asked for.
  backend.onCreate = (spec, entry) => {
    if (backend.count('create') === 2) entry.resources = { cpus: spec.resources.cpus, memoryInBytes: 123_456 }
  }
  const recreate = await call('sandbox.instance.recreate', {
    sandboxId: row.sandboxId, requestId: 'recreate-3',
    expectedRevision: 1, interruptTerminals: true, preserveVolume: true,
  })
  assert.equal(recreate.result.isError, false)
  await owner.drain()

  const fresh = owner.registry.get(row.sandboxId)
  const op = fresh.operations.find((entry) => entry.action === 'recreate')
  assert.equal(op.state, 'indeterminate')
  assert.equal(op.step, 'verify')
  // The destructive steps did happen — they are evidence, not hidden.
  assert.equal(backend.count('stop'), 1)
  assert.equal(backend.count('remove'), 1)
  assert.equal(backend.count('create'), 2)
  // The prior verified receipt and binding survive; nothing is fabricated.
  assert.equal(fresh.binding.generation, row.binding.generation)
  assert.deepEqual(fresh.appliedRevision, oldReceipt)
})

test('environment-owner resolveCwd: declared service cwd only, never host paths', async (t) => {
  const { call, create, backend } = await setup(t, true)
  const row = await create('seven')
  const ok = await call('term.session.create', {
    sandboxId: row.sandboxId, openId: 'o-2', paneId: 'p-2', service: 'engine',
  })
  assert.equal(ok.result.isError, false, JSON.stringify(ok.result))
  // The declared service's guest cwd is what the broker actually received.
  const spawn = backend.calls.find((entry) => entry[0] === 'terminalRpc' && entry[1] === 'create')
  assert.ok(spawn, 'terminalRpc create recorded')
  assert.equal(spawn[3].cwd, '/opt/kitesurf/packages/engine')

  const rpcBefore = backend.count('terminalRpc')
  // Host cwd is not a declared service cwd: rejected before any broker call.
  for (const args of [
    { openId: 'o-3', paneId: 'p-3', cwd: '/tmp' },
    { openId: 'o-4', paneId: 'p-4', cwd: '/opt/kitesurf/packages/engine' }, // service path without its selector
    { openId: 'o-5', paneId: 'p-5', service: 'not-a-service' },
    { openId: 'o-6', paneId: 'p-6', service: 'engine', cwd: '/' }, // service selector pinned to its own cwd only
  ]) {
    const denied = await call('term.session.create', { sandboxId: row.sandboxId, ...args })
    assert.equal(denied.result.isError, true, JSON.stringify({ args, body: denied.result.structuredContent }))
  }
  assert.equal(backend.count('terminalRpc'), rpcBefore, 'denied cwd still reached the broker')
})

/**
 * A fully neutral provider: no Apple inspect JSON anywhere — observe emits
 * neutral evidence with its own generation scheme, createManaged records the
 * neutral spec verbatim. Proves the owner boundary never reaches raw
 * provider payloads.
 */
function makeNeutralBackend() {
  const calls = []
  const objects = new Map()
  let serial = 0
  const stateVolumeOf = (locator) => objects.get(locator)?.spec.mounts
    .filter((m) => m.type === 'bind' && m.readOnly === false && m.target === '/var/lib/kitesurf-state')[0]?.source ?? null
  return {
    calls,
    objects,
    count: (verb) => calls.filter((entry) => entry[0] === verb).length,
    capabilities() { return capabilityReport() },
    async observe(locator, { stateTarget } = {}) {
      calls.push(['observe', locator])
      const obj = objects.get(locator)
      if (!obj) return { locator, state: 'missing', generation: null, stateVolume: null }
      const volume = obj.spec.mounts
        .filter((m) => m.type === 'bind' && m.target === stateTarget && m.readOnly === false)[0]?.source ?? null
      return {
        locator,
        generation: obj.generation,
        stateVolume: volume,
        state: obj.state,
        creationDate: obj.creationDate,
        publications: obj.spec.ports.map((p) => ({
          serviceId: null, containerPort: p.containerPort, hostPort: p.hostPort,
          protocol: p.protocol, hostAddress: p.hostAddress,
        })),
        resources: { cpus: obj.spec.resources.cpus, memoryBytes: obj.spec.resources.memoryBytes },
        mounts: obj.spec.mounts,
        imageDigest: obj.digest,
        observedAt: new Date(obj.creationDate * 1000).toISOString(),
      }
    },
    async sampleUsage(locator) {
      calls.push(['sampleUsage', locator])
      return objects.has(locator) ? { locator, memoryBytes: 0, cpuUsec: 0 } : null
    },
    async createManaged(spec) {
      calls.push(['createManaged', structuredClone(spec)])
      serial += 1
      objects.set(spec.locator, {
        spec: structuredClone(spec), state: 'running',
        creationDate: 1_700_000_000 + serial * 61,
        generation: `neutral-gen-${serial}`,
        digest: spec.imageDigest ?? DIGEST,
      })
    },
    async start(locator) { calls.push(['start', locator]); const o = objects.get(locator); if (o) o.state = 'running' },
    async stop(locator) { calls.push(['stop', locator]); const o = objects.get(locator); if (o) o.state = 'stopped' },
    async remove(locator) { calls.push(['remove', locator]); objects.delete(locator) },
    async imageEvidence(tag) { calls.push(['imageEvidence', tag]); return { tag, digest: DIGEST } },
    async terminalRpc() { return { ok: true } },
  }
}

test('environment-owner neutral provider: create/inspect/start/stop/recreate without Apple JSON', async (t) => {
  const backend = makeNeutralBackend()
  const { owner, call, create } = await setup(t, true, backend)
  const row = await create('neutral')
  assert.match(row.binding.generation, /^neutral-gen-/)
  const spec = backend.calls.find((entry) => entry[0] === 'createManaged')[1]
  assert.equal(spec.locator, row.binding.locator)
  assert.ok(spec.mounts.every((m) => ['bind', 'tmpfs'].includes(m.type) && !('arg' in m)))
  // Neutral observation serves managed reads — the fixture saw no raw
  // inspect JSON because there is none.
  const obs = await owner.observe(row)
  assert.equal(obs.state, 'running')
  assert.equal(obs.stateVolume, row.stateVolume)

  const stop = await call('sandbox.instance.stop', { sandboxId: row.sandboxId, requestId: 'stop-n' })
  assert.equal(stop.result.isError, false, JSON.stringify(stop.result))
  await owner.drain()
  const start = await call('sandbox.instance.start', { sandboxId: row.sandboxId, requestId: 'start-n' })
  assert.equal(start.result.isError, false)
  await owner.drain()

  const save = await call('sandbox.revision.save', {
    sandboxId: row.sandboxId, expectedRevision: 0,
    overrides: { cpus: 2, memoryBytes: 512 * 1024 ** 2 },
  })
  assert.equal(save.result.isError, false)
  const recreate = await call('sandbox.instance.recreate', {
    sandboxId: row.sandboxId, requestId: 'recreate-n',
    expectedRevision: 1, interruptTerminals: true, preserveVolume: true,
  })
  assert.equal(recreate.result.isError, false, JSON.stringify(recreate.result))
  await owner.drain()
  const fresh = owner.registry.get(row.sandboxId)
  const op = fresh.operations.find((entry) => entry.action === 'recreate')
  assert.equal(op.state, 'succeeded')
  assert.notEqual(fresh.binding.generation, row.binding.generation)
  assert.equal(backend.count('createManaged'), 2)
})

test('environment-owner unsupported provider: no lifecycle capabilities, submit refused before accept', async (t) => {
  const backend = makeNeutralBackend()
  backend.capabilities = () => capabilityReport(false)
  const { owner, call } = await setup(t, true, backend)
  assert.equal(owner.capabilities.has('sandbox.lifecycle'), false)
  assert.equal(owner.capabilities.has('sandbox.instance.create'), false)
  assert.equal(owner.capabilities.has('sandbox.instance.start'), false)
  assert.equal(owner.capabilities.has('term.session.create'), false)
  const res = await call('sandbox.instance.create', { name: 'nope', profileId: 'kitesurf', requestId: 'x' })
  assert.equal(res.result.isError, true)
  assert.equal(backend.count('createManaged'), 0)
  // Direct execute of a gated capability also refuses before dispatch.
  await assert.rejects(
    owner.execute({ capability: 'sandbox.instance.create', args: { name: 'n', requestId: 'x' }, peer: ownerPeer() }),
    (error) => error?.status === 503 || /support/i.test(String(error?.message)))
})

test('environment-owner partially capable provider: stop survives while unannounced writes refuse with no ledger row', async (t) => {
  const backend = makeNeutralBackend()
  const { owner, call, create } = await setup(t, true, backend)
  const row = await create('partial')
  // The provider re-announces honest flags: inspect/stop/start only —
  // create, restart, recreate, exec.stdin are all false now.
  const caps = capabilityReport(false)
  caps.inspect = true
  caps.stop = true
  caps.start = true
  backend.capabilities = () => caps

  const before = owner.registry.list().length
  const denied = await call('sandbox.instance.create', { name: 'denied', profileId: 'kitesurf', requestId: 'denied-1' })
  assert.equal(denied.result.isError, true)
  assert.equal(owner.registry.list().length, before) // refused before the ledger row
  assert.equal(backend.count('createManaged'), 1)    // only the earlier full-capability create

  const restart = await call('sandbox.instance.restart', { sandboxId: row.sandboxId, requestId: 'rst-1' })
  assert.equal(restart.result.isError, true)
  assert.equal(owner.registry.list().length, before)

  // The supported action still dispatches through generic lifecycle.
  const stop = await call('sandbox.instance.stop', { sandboxId: row.sandboxId, requestId: 'stop-p' })
  assert.equal(stop.result.isError, false, JSON.stringify(stop.result))
  await owner.drain()
  const fresh = owner.registry.get(row.sandboxId)
  assert.equal(fresh.operations.find((op) => op.action === 'stop').state, 'succeeded')
  assert.equal((await owner.observe(fresh)).state, 'stopped')
})

test('the retired /res proxy registers nowhere: not in bindings, specs, capabilities or the error catalog', async (t) => {
  const { owner } = await setup(t, true)
  assert.equal(owner.capabilities.has('dnls.dom'), true)
  // T-O-66: no alias, switch or tombstone — the path simply does not exist.
  assert.equal(owner.capabilities.has('dnls.res'), false)
  assert.equal(BINDING_TABLE.some((row) => row.id === 'dnls.res' || row.path === '/nano-local-sandbox/res'), false)
  const connection = { admit: async () => ({ peer: ownerPeer() }) }
  const specs = createManagedRoutes({ capabilities: owner.capabilities, execute: owner.execute, connection, table: BINDING_TABLE })
  assert.equal(specs.find((spec) => spec.path === '/nano-local-sandbox/res'), undefined)
  const { errorCatalog } = await import('../src/host/error-catalog.js')
  assert.equal(errorCatalog().some((row) => /^kitesurf\.res\.|^res\./.test(row.example)), false)
})
