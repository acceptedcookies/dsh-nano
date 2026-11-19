/**
 * P6 integration: the real environment-owner composition — trusted profile
 * source + lifecycle + terminal + usage — driven through the managed MCP
 * router against a raw Apple-shaped backend fixture. Nothing here fakes the
 * profile, the registry or the wire contract; only the container CLI is
 * replaced by a recording backend that answers inspect with real
 * ManagedContainer JSON.
 */
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { openEnvironmentOwner } from '../src/host/environment-owner.js'
import { createManagedRoutes } from '../src/host/managed-routes.js'
import { loadProfileDriver } from '../src/host/profile-drivers.js'
import { BINDING_TABLE } from '../lib/bindings.js'
import { KITESURF_RUNTIME_FILES, runtimeRoot } from '../profiles/kitesurf/driver/runtime.js'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const MCP_PATH = '/nano-local-sandbox/mcp'
const CONTRACT = 'dnls.control/1'
const DIGEST = `sha256:${'ab'.repeat(32)}`
const OTHER_DIGEST = `sha256:${'cd'.repeat(32)}`

function ownerPeer(controller = new AbortController()) {
  return { principal: { kind: 'owner' }, signal: controller.signal }
}

/** A fake-built kitesurf runtime tree: receipt + required files + node_modules. */
function materializeRuntime(root, manifest) {
  mkdirSync(dirname(root), { recursive: true })
  writeFileSync(join(dirname(root), 'artifact.json'), JSON.stringify({ ref: manifest.build.checkout.ref }))
  for (const file of [manifest.build.checkout.verify, ...KITESURF_RUNTIME_FILES]) {
    const path = join(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, 'fixture build output\n')
  }
  mkdirSync(join(root, 'node_modules'), { recursive: true })
}

/**
 * The container CLI seam, recorded. `create` stores the exact spec it was
 * handed; `inspect` reports it back as one Apple ManagedContainer, so every
 * verification path reads the same evidence the runtime would return.
 */
function makeBackend() {
  const calls = []
  const containers = new Map()
  let serial = 0
  const managedContainer = (locator, c) => ({
    raw: JSON.stringify([{
      configuration: {
        id: locator,
        creationDate: c.creationDate,
        mounts: (c.mounts ?? c.spec.mounts).map((m) => ({
          source: m.source ?? null,
          destination: m.target,
          type: { [m.type]: {} },
          options: m.readOnly ? ['ro'] : [],
        })),
        publishedPorts: (c.ports ?? c.spec.ports).map((p) => ({
          containerPort: p.containerPort,
          hostPort: p.hostPort,
          hostAddress: p.hostAddress,
          proto: p.protocol ?? p.proto,
          count: p.count ?? 1,
        })),
        resources: c.resources ?? { cpus: c.spec.resources.cpus, memoryInBytes: c.spec.resources.memoryBytes },
        image: { reference: c.spec.image, descriptor: { digest: c.digest ?? DIGEST } },
      },
      status: { state: c.state },
    }]),
  })
  return {
    calls,
    containers,
    onCreate: null,
    count: (verb) => calls.filter((entry) => entry[0] === verb).length,
    async create(spec) {
      calls.push(['create', structuredClone(spec)])
      serial += 1
      const entry = { spec: structuredClone(spec), state: 'running', creationDate: 1_700_000_000 + serial * 61 }
      containers.set(spec.containerName, entry)
      this.onCreate?.(spec, entry)
    },
    async stop(locator) {
      calls.push(['stop', locator])
      const c = containers.get(locator)
      if (c) c.state = 'stopped'
    },
    async remove(locator) {
      calls.push(['remove', locator])
      containers.delete(locator)
    },
    async start(locator) {
      calls.push(['start', locator])
      const c = containers.get(locator)
      if (c) c.state = 'running'
    },
    async inspect(locator) {
      calls.push(['inspect', locator])
      const c = containers.get(locator)
      return c ? managedContainer(locator, c) : null
    },
    async stats(locator) {
      calls.push(['stats', locator])
      return [{ id: locator, memoryUsageBytes: 0, cpuUsageUsec: 0 }]
    },
    async imageEvidence(tag) {
      calls.push(['imageEvidence', tag])
      return { tag, digest: DIGEST }
    },
    async terminalRpc(locator, verb, request) {
      calls.push(['terminalRpc', verb, locator, request])
      if (verb === 'create') return { ok: true, terminalId: request.terminalId }
      return { ok: true }
    },
  }
}

async function setup(t) {
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

  const backend = makeBackend()
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

  const spec = backend.calls.find((entry) => entry[0] === 'create')[1]
  assert.equal(spec.containerName, row.binding.locator)
  assert.equal(spec.image, manifest.build.image)
  assert.equal(spec.resources.cpus, 4)
  assert.equal(spec.resources.memoryBytes, 4 * 1024 ** 3)
  // Structured mounts: volume source is the row's own state dir, args serialized.
  const volumeMount = spec.mounts.find((m) => m.target === '/var/lib/kitesurf-state')
  assert.equal(volumeMount.source, row.stateVolume)
  assert.equal(volumeMount.type, 'virtiofs')
  assert.equal(volumeMount.readOnly, false)
  assert.ok(spec.mounts.every((m) => typeof m.arg === 'string' && m.arg.length > 0))
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
  const { owner, backend, call, create } = await setup(t)
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
  for (const entry of backend.calls.slice(callsBefore)) assert.ok(['inspect', 'imageEvidence'].includes(entry[0]), entry[0])
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
  const { call, create, backend } = await setup(t)
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
