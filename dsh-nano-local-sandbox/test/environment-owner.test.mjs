/**
 * P6 integration: the real environment-owner composition — trusted profile
 * source + lifecycle + terminal + usage — driven through the managed MCP
 * router against a raw Apple-shaped backend fixture. Nothing here fakes the
 * profile, the registry or the wire contract; only the container CLI is
 * replaced by a recording backend that answers inspect with real
 * ManagedContainer JSON.
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { cpSync, existsSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { openEnvironmentOwner } from '../src/host/environment-owner.js'
import { capabilityReport } from '../src/host/backend.js'
import { resolveOwnerPrincipal } from '../src/host/object-authz.js'
import { makeAgentToolDefinitions } from '../src/host/agent-tools.js'
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

async function setup(t, scoped = false, backendOverride = null, extraDeps = {}) {
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
    ...extraDeps,
    // Frozen clock: the usage sampler's first tick lands a full minute out
    // (unref'd) so backend call counts stay exact for the whole test.
    clock: () => 0,
  })
  // Observable shared-owner proof: every capability dispatch — HTTP, /mcp
  // and the agent tools — goes through this one execute function, so the
  // recording wrapper counts all three entrances on a single ledger. The
  // wrapped fn is what index.js would hand both consumers verbatim.
  const execCalls = []
  const rawExecute = owner.execute.bind(owner)
  const countedExecute = async (call_) => { execCalls.push({ capability: call_.capability, via: call_.via }); return rawExecute(call_) }
  const specs = createManagedRoutes({ capabilities: owner.capabilities, execute: countedExecute, connection, table: BINDING_TABLE })
  const mcp = specs.find((spec) => spec.path === MCP_PATH)
  assert.ok(mcp, 'managed mcp route spec')
  // T-O-64: the four session-agent tools are the same composition point the
  // shipped plugin uses — index.js calls this builder with the same owner —
  // so a call through them lands on the very same `execute` the HTTP and
  // /mcp routes above are wired to (asserted via `execCalls`).
  const peerFor = extraDeps.toolPeer ?? ((exec) => (exec?.agent?.session != null ? peer : null))
  const tools = makeAgentToolDefinitions({ owner: { ...owner, execute: countedExecute }, peerFor })
  const agentExec = () => ({ agent: { session: {} }, signal: new AbortController().signal, callId: 't' })
  const toolByName = (name) => tools.find((d) => d.name === name)
  async function toolCall(name, args, exec = agentExec()) {
    const def = toolByName(name)
    assert.ok(def, `agent tool ${name} registered`)
    return def.execute(args, exec)
  }
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
  return { home, env, backend, audits, owner, call, create, setPeer, specs, manifest: ready.manifest, execCalls, tools, toolByName, toolCall, agentExec }
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

/* ── T-O-68: the managed failure projection is a four-key whitelist ──
 *
 * A kernel failure (authorization + generation passed, the route handler ran,
 * status ≥ 400) projects {ok:false, errorId, error?, hint?} — error capped at
 * the 240 chars the /operations row uses, hint verbatim, incidentId and every
 * other key never crossing. Pre-dispatch refusals (contract version, authz,
 * generation, admission) keep status + errorId with no error/hint.
 */

/**
 * A CDP stand-in for the managed object pages: every unknown command answers
 * {}, page sessions resolve through withPage, and `send` lets a test script
 * the kernel's replies (e.g. Page.navigate errorText / exceptionDetails).
 */
function fakePageClient(respond = {}) {
  const client = {
    alive: true,
    pageSessionId: null,
    pageTargetId: null,
    listen() {},
    close() {},
    async send(method, params = {}) {
      const custom = respond[method]
      if (typeof custom === 'function') {
        const value = await custom(params)
        if (value !== undefined) return value
      }
      if (method === 'Target.getTargets') {
        return { targetInfos: [{ targetId: 't1', type: 'page', url: 'about:blank' }] }
      }
      if (method === 'Target.attachToTarget') return { sessionId: 's1' }
      return {}
    },
  }
  return client
}

// A page request as the pane's HTTP entry would make it — the human-hold
// gate (R-11) exempts only 'http'; /mcp and model-tool calls stay gated.
async function pageRequest(owner, capability, sandboxId, { method = 'POST', args = {}, via = 'http' } = {}) {
  return owner.execute({
    capability,
    sandboxId,
    peer: ownerPeer(),
    args,
    via,
    req: { method, url: `/nano-local-sandbox/${capability.slice('dnls.'.length)}?sandboxId=${sandboxId}`, headers: {}, body: args },
  })
}

test('T-O-68 kernel failure: navigate refusal projects exactly {ok,errorId,error,hint} and the ops row keeps incidentId', async (t) => {
  const client = fakePageClient({
    'Page.navigate': () => ({ errorText: 'net::ERR_CONNECTION_REFUSED' }),
  })
  const { owner, create } = await setup(t, false, null, { connect: async () => client })
  const row = await create('fail-projection')

  const failure = await pageRequest(owner, 'dnls.open', row.sandboxId, { args: { url: 'http://localhost:65535/' } })
  assert.equal(failure.status, 502)
  assert.equal(failure.body.ok, false)
  assert.equal(failure.body.errorId, 'sandbox.navigate.failed')
  assert.equal(failure.body.error, 'net::ERR_CONNECTION_REFUSED')
  assert.match(failure.body.hint || '', /localhost|回环/, 'loopback topology hint projects verbatim')
  // The whitelist is exact — sorted keys are the whole contract. incidentId
  // (R-10) and every other kernel-body key stay out of the failure body.
  assert.deepEqual(Object.keys(failure.body).sort(), ['error', 'errorId', 'hint', 'ok'])

  // incidentId is not gone — it lives only on the per-call operations row,
  // surfaced by the same projection through /diagnostics.operations.
  const diagnostics = await pageRequest(owner, 'dnls.diagnostics', row.sandboxId, { method: 'GET' })
  assert.equal(diagnostics.status, 200, JSON.stringify(diagnostics.body).slice(0, 200))
  const op = (diagnostics.body.operations || []).filter((entry) =>
    entry.errorId === 'sandbox.navigate.failed' && entry.path === '/nano-local-sandbox/open').at(-1)
  assert.ok(op, 'ops ring holds the failed call')
  assert.match(op.incidentId || '', /^op-/)
  assert.equal(op.status, 502)
})

test('T-O-68 kernel failure: an over-240-char error is truncated to the ops-row cap', async (t) => {
  const longText = `engine failure: ${'x'.repeat(320)}`
  const client = fakePageClient({
    'Runtime.evaluate': (params) => params.returnByValue === true ? { exceptionDetails: { text: longText } } : undefined,
  })
  const { owner, create } = await setup(t, false, null, { connect: async () => client })
  const row = await create('fail-truncation')

  const failure = await pageRequest(owner, 'dnls.evaluate', row.sandboxId, { args: { expression: '1+1' } })
  assert.equal(failure.status, 400)
  assert.equal(failure.body.errorId, 'sandbox.evaluate.threw')
  assert.equal(failure.body.error.length, 240)
  assert.equal(failure.body.error, longText.slice(0, 240))
  assert.equal('hint' in failure.body, false, 'no hint was issued — the key must not appear')
  assert.equal('incidentId' in failure.body, false)
})

test('T-O-68 kernel failure without hint keeps {ok,errorId,error} and nothing else', async (t) => {
  // No matching hint rule for this errorText and no tunnel suffix — hint is
  // optional, never fabricated to fill the envelope.
  const client = fakePageClient({
    'Page.navigate': () => ({ errorText: 'net::ERR_UNUSUAL_TRANSPORT' }),
  })
  const { owner, create } = await setup(t, false, null, { connect: async () => client })
  const row = await create('fail-no-hint')

  const failure = await pageRequest(owner, 'dnls.open', row.sandboxId, { args: { url: 'https://example.net/odd' } })
  assert.equal(failure.status, 502)
  assert.equal(failure.body.errorId, 'sandbox.navigate.failed')
  assert.equal('hint' in failure.body, false)
  assert.deepEqual(Object.keys(failure.body).sort(), ['error', 'errorId', 'ok'])
})

test('T-O-68 pre-dispatch refusal returns status + errorId only — no error, no hint', async (t) => {
  const { specs, create } = await setup(t)
  const row = await create('fail-predispatch')
  const open = specs.find((spec) => spec.path === '/nano-local-sandbox/open')
  assert.ok(open, 'managed /open spec registered')
  // A missing contract version fails BEFORE authorization, selection and any
  // page handler: the envelope carries the status + catalog errorId — never a
  // kernel reason line or a hint.
  const res = { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v }, end(text) { this.text = text } }
  await open.handler({
    method: 'POST',
    url: `/nano-local-sandbox/open?sandboxId=${row.sandboxId}`,
    headers: {},
    body: { url: 'https://example.net/' },
  }, res)
  assert.equal(res.statusCode, 400)
  const body = JSON.parse(res.text)
  assert.equal(body.ok, false)
  assert.equal(body.errorId, 'sandbox.contract_mismatch')
  assert.equal('error' in body, false, 'pre-dispatch bodies never carry the kernel reason')
  assert.equal('hint' in body, false, 'pre-dispatch bodies never carry a hint')
  assert.equal('incidentId' in body, false)
})

/* ── T-O-64 / R-11: the session agent's four managed tools ──────────────
 *
 * The shipped plugin registers them through index.js (`inject: [...'tools']`
 * → `ctx.tools.register` inside the same `ctx.effect` that owns the route
 * specs, disposed in reverse with everything else). The fixture below builds
 * the same definitions the plugin builds — `makeAgentToolDefinitions` gets
 * the very owner `createManagedRoutes` was given — so the counted `execute`
 * wrapper is the observable proof that tool, /mcp and HTTP reach ONE
 * capability owner + dispatcher, not a second object executor.
 */

const AGENT_TOOL_NAMES = ['sandbox_list', 'sandbox_status', 'sandbox_open', 'sandbox_control_status']

/**
 * A guaranteed-free port pool for one test: probes `size` consecutive
 * loopback ports and returns them as a `[lo, hi]` range for the
 * `portPools` dep. This host may have a real managed container holding the
 * declared dev pool (8940+); fixtures that must bind — or must prove dead —
 * the reserved tuple need a pool the environment cannot be occupying.
 */
async function freePool(size = 4) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const probe = createServer()
    probe.listen(0, '127.0.0.1')
    await once(probe, 'listening')
    const lo = probe.address().port
    await new Promise((resolve) => probe.close(resolve))
    let ok = lo + size - 1 <= 65535
    for (let p = lo + 1; ok && p <= lo + size - 1; p += 1) {
      const next = createServer()
      try {
        next.listen(p, '127.0.0.1')
        await once(next, 'listening')
      } catch {
        ok = false
      }
      await new Promise((resolve) => next.close(resolve))
    }
    if (ok) return [lo, lo + size - 1]
  }
  assert.fail('no free consecutive loopback pool found')
}

/** A loopback stand-in for the object bridge: /control truth, nothing else. */
async function fakeBridge(t, control, port = 0) {
  const server = createServer((req, res) => {
    if (req.url === '/control' && (req.method === 'GET' || req.method === 'HEAD')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, control }))
      return
    }
    res.writeHead(404).end()
  })
  const listening = once(server, 'listening')
  server.listen(port, '127.0.0.1')
  await listening
  t.after(async () => new Promise(resolve => server.close(resolve)))
  return `http://127.0.0.1:${server.address().port}`
}

/**
 * The host tuple this row reserves for one service — the only place an
 * honest bridge may listen. The registry row read here is authoritative
 * read-model only: `registry.get` clones, so nothing can repoint a live
 * reservation; the fixture listens on the reserved port instead, and the
 * inspect evidence (created with the same spec.ports) still proves the
 * publication to `serviceMappings`.
 */
function reservedPort(row, serviceId) {
  const port = row.ports.find((p) => p.serviceId === serviceId)
  assert.ok(port, `row reserves ${serviceId}`)
  assert.equal(port.hostAddress, '127.0.0.1')
  return port.hostPort
}

test('T-O-64: the four agent tools are the same owner + dispatcher the /mcp and HTTP entries use', async (t) => {
  const { tools, execCalls, call, create, setPeer } = await setup(t)
  // Four tools, the four contract names, nothing else.
  assert.deepEqual(tools.map((d) => d.name).sort(), AGENT_TOOL_NAMES.slice().sort())
  assert.equal(tools.length, 4)
  for (const def of tools) {
    assert.equal(typeof def.execute, 'function')
    assert.equal(typeof def.parameters, 'object')
    assert.equal(def.parameters.type, 'object')
    assert.equal(def.parameters.additionalProperties, false)
    assert.equal(typeof def.output?.render, 'function')
  }
  // Schemas are the capability's own tool declarations — the same def that
  // /mcp tools/list advertises, not a second copy.
  const mcp = (await call('sandbox.list', {})).result
  assert.equal(mcp.isError, false)

  const row = await create('shared')
  setPeer(ownerPeer())
  const callsBefore = execCalls.length
  // Same capability, three entrances, one counted dispatcher call each.
  const viaTool = await tools.find((d) => d.name === 'sandbox_list').execute({}, { agent: { session: {} }, signal: new AbortController().signal })
  assert.equal(viaTool.status, 200, JSON.stringify(viaTool))
  assert.ok(viaTool.rows.some((r) => r.sandboxId === row.sandboxId), 'tool sees the same ledger')
  const toolDispatches = execCalls.slice(callsBefore).filter((c) => c.capability === 'sandbox.list' && c.via === 'tool')
  assert.equal(toolDispatches.length, 1, 'tool call landed on owner.execute exactly once')

  const mcpBefore = execCalls.length
  await call('sandbox.list', {})
  const mcpDispatches = execCalls.slice(mcpBefore).filter((c) => c.capability === 'sandbox.list' && c.via === 'mcp')
  assert.equal(mcpDispatches.length, 1, '/mcp tools/call landed on the same owner.execute')
  // Same visible object through both envelopes: tool rows === /mcp rows.
  const mcpRows = (await call('sandbox.list', {})).result.structuredContent.rows
  assert.deepEqual(viaTool.rows.map((r) => r.sandboxId).sort(), mcpRows.map((r) => r.sandboxId).sort())
})

test('T-O-64: object tools refuse a missing sandboxId before any dispatch', async (t) => {
  const { tools, execCalls } = await setup(t)
  for (const name of ['sandbox_status', 'sandbox_open', 'sandbox_control_status']) {
    const before = execCalls.length
    const answer = await tools.find((d) => d.name === name).execute({}, { agent: { session: {} }, signal: new AbortController().signal })
    assert.equal(answer.status, 400, `${name}`)
    assert.equal(answer.ok, false)
    assert.equal(answer.errorId, 'sandbox.params.sandboxId')
    assert.equal(execCalls.length, before, `${name} dispatched without a selector`)
    // Selector shape is the dispatcher's own rule — junk segments refuse too.
    for (const bad of ['../x', 'a b', 'a/b', '']) {
      const refused = await tools.find((d) => d.name === name).execute({ sandboxId: bad, url: 'https://e.net/' }, { agent: { session: {} }, signal: new AbortController().signal })
      assert.equal(refused.errorId, 'sandbox.params.sandboxId', `${name} sandboxId=${JSON.stringify(bad)}`)
    }
  }
  // No session context → the composition adapter yields no peer: pre-dispatch.
  const refused = await tools.find((d) => d.name === 'sandbox_list').execute({}, {})
  assert.equal(refused.status, 401)
  assert.equal(refused.ok, false)
})

test('T-O-64: invisible and nonexistent objects refuse identically on every entry', async (t) => {
  // An owner-shaped peer whose env-visibility predicate excludes this row —
  // the scoped resolvePrincipal adapter the composition supplies (T-O-59),
  // carrying the peer's own blindTo set into canSee.
  const { tools, call, create, setPeer } = await setup(t, false, null, {
    resolvePrincipal: ({ peer } = {}) => {
      const owner = resolveOwnerPrincipal({ peer })
      if (!owner) return null
      return peer?.blindTo instanceof Set
        ? { ...owner, canSee: (row) => !peer.blindTo.has(row?.sandboxId) }
        : owner
    },
  })
  const row = await create('hidden')
  const blind = { principal: { kind: 'owner' }, signal: new AbortController().signal, blindTo: new Set([row.sandboxId]) }
  setPeer(blind)
  const mcpInvisible = await call('sandbox.inspect', { sandboxId: row.sandboxId })
  const mcpMissing = await call('sandbox.inspect', { sandboxId: 'sb-no-such-row' })
  assert.equal(mcpInvisible.res.statusCode, mcpMissing.res.statusCode)
  assert.equal(mcpInvisible.res.statusCode, 404)
  assert.equal(mcpInvisible.result.structuredContent.ok, false)
  assert.deepEqual(mcpInvisible.result.structuredContent, mcpMissing.result.structuredContent,
    'invisible and missing answer with the identical body')

  const status = tools.find((d) => d.name === 'sandbox_status')
  const exec = { agent: { session: {} }, signal: blind.signal }
  const toolInvisible = await status.execute({ sandboxId: row.sandboxId }, exec)
  const toolMissing = await status.execute({ sandboxId: 'sb-no-such-row' }, exec)
  // peerFor maps the exec's live signal onto the same blind peer here —
  // same status, same body, indistinguishable to the caller.
  assert.equal(toolInvisible.status, toolMissing.status)
  assert.equal(toolInvisible.ok, false)
  assert.equal(toolMissing.ok, false)
  assert.deepEqual(toolInvisible, toolMissing)
})

test('R-11: human hold refuses tool + /mcp opens pre-dispatch while the pane HTTP /open still reaches the kernel', async (t) => {
  const connects = []
  const client = fakePageClient()
  // Kernel-work proof: Page.navigate sends on the object's owned CDP socket.
  const navs = []
  const rawSend = client.send.bind(client)
  client.send = async (method, ...rest) => {
    if (method === 'Page.navigate') navs.push(method)
    return rawSend(method, ...rest)
  }
  // Private port pool: the declared dev pool can be held by a real container
  // on this host; the fake bridge must own the reserved mcp-bridge tuple.
  const { tools, call, create, specs } = await setup(t, false, null, {
    connect: async (base) => { connects.push(base); return client },
    portPools: { dev: await freePool() },
  })
  const row = await create('held')
  // The fake bridge listens on the row's own reserved mcp-bridge tuple —
  // registry.get() clones, so the fixture binds the port the ledger and the
  // inspect evidence already agree on instead of rewriting either.
  let hold = { active: true, owner: 'human', since: '2026-01-01T00:00:00Z', note: 'operator' }
  await fakeBridge(t, { get humanHold() { return hold } }, reservedPort(row, 'mcp-bridge'))

  const kernelBefore = connects.length
  // (a) agent tool open: refused, dispatcher envelope, kernel untouched.
  const opened = tools.find((d) => d.name === 'sandbox_open')
  const refusal = await opened.execute({ sandboxId: row.sandboxId, url: 'https://example.net/' },
    { agent: { session: {} }, signal: new AbortController().signal })
  assert.equal(refusal.status, 409)
  assert.equal(refusal.ok, false)
  assert.equal(refusal.errorId, 'kitesurf.control.held')
  for (const key of ['error', 'hint', 'incidentId']) assert.equal(key in refusal, false, `pre-dispatch body carries ${key}`)
  assert.equal(connects.length, kernelBefore, 'tool open never reached the open kernel')
  assert.equal(navs.length, 0, 'tool open issued no navigation while held')

  // (b) /mcp open: same refusal — identical status + errorId, still no kernel.
  const mcpRefusal = await call('sandbox.open', { sandboxId: row.sandboxId, url: 'https://example.net/' })
  assert.equal(mcpRefusal.res.statusCode, 409)
  assert.equal(mcpRefusal.result.structuredContent.ok, false)
  assert.equal(mcpRefusal.result.structuredContent.errorId, 'kitesurf.control.held')
  assert.equal(connects.length, kernelBefore, '/mcp open never reached the open kernel')
  assert.equal(navs.length, 0, '/mcp open issued no navigation while held')

  // (c) the pane's own HTTP /open is exempt: hold active, kernel still runs.
  const httpOpen = specs.find((s) => s.path === '/nano-local-sandbox/open')
  const res = { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v }, end(text) { this.text = text } }
  await httpOpen.handler({
    method: 'POST',
    url: `/nano-local-sandbox/open?sandboxId=${row.sandboxId}`,
    headers: { 'x-dnls-contract': 'dnls.control/1' },
    body: { url: 'https://example.net/' },
  }, res)
  assert.equal(res.statusCode, 200, res.text)
  assert.equal(JSON.parse(res.text).ok, true)
  assert.equal(connects.length, kernelBefore + 1, 'HTTP pane entry reached the kernel once')
  assert.equal(navs.length, 1, 'pane HTTP /open navigated once')

  // (d) hold released → the tool opens through the SAME kernel now: the
  // object-owned CDP socket the pane connected in (c) carries this
  // navigation too — one kernel, one socket, no second dial.
  hold = { active: false, owner: null, since: null, note: null }
  const okTool = await opened.execute({ sandboxId: row.sandboxId, url: 'https://example.org/' },
    { agent: { session: {} }, signal: new AbortController().signal })
  assert.equal(okTool.status, 200, JSON.stringify(okTool))
  assert.equal(okTool.ok, true)
  assert.equal(navs.length, 2, 'tool open reached the same kernel once released')
  assert.equal(connects.length, kernelBefore + 1, 'tool reuses the object-owned kernel socket')
})

test('T-O-64: tool results pass the dispatcher redaction — denied keys never surface', async (t) => {
  const client = fakePageClient()
  const { tools, create } = await setup(t, false, null, {
    connect: async () => client,
    portPools: { dev: await freePool() },
  })
  const row = await create('redacted')
  // The control document itself carries fields the agent must never read;
  // the fake bridge answers them verbatim on the row's own bridge tuple,
  // redaction strips them.
  const control = {
    humanHold: { active: false, owner: null },
    relay: { writer: 'agent', connections: 0 },
    cookies: [{ name: 'sess' }],
    relayToken: 'secret-relay-token',
    authorization: 'Bearer xyz',
    argv: ['--dangerous'],
    env: { SECRET: 'v' },
  }
  await fakeBridge(t, control, reservedPort(row, 'mcp-bridge'))
  const answer = await tools.find((d) => d.name === 'sandbox_control_status')
    .execute({ sandboxId: row.sandboxId }, { agent: { session: {} }, signal: new AbortController().signal })
  assert.equal(answer.status, 200, JSON.stringify(answer))
  assert.equal(answer.ok, true)
  // Two-slot read: only humanHold + relay, already narrowed — plus every
  // denied key absent at any depth (redact still ran over the projection).
  assert.deepEqual(answer.humanHold, control.humanHold)
  assert.deepEqual(answer.relay, control.relay)
  const raw = JSON.stringify(answer)
  for (const denied of ['cookies', 'relayToken', 'authorization', 'argv', 'env', 'secret']) {
    assert.equal(raw.includes(denied), false, `${denied} surfaced in tool result`)
  }
})

test('R-11: a failed humanHold read refuses with control.bridge before any kernel work', async (t) => {
  const connects = []
  const client = fakePageClient()
  const { tools, call, create } = await setup(t, false, null, {
    connect: async (base) => { connects.push(base); return client },
    // A private pool also proves the reserved tuple is dead: nothing on
    // this host can be holding the port the row reserves for mcp-bridge.
    portPools: { dev: await freePool() },
  })
  const row = await create('bridge-down')
  // The reserved mcp-bridge tuple is honestly published by the fixture
  // inspect evidence, but nothing listens on it — the control read fails.
  const kernelBefore = connects.length

  const opened = tools.find((d) => d.name === 'sandbox_open')
  const refused = await opened.execute({ sandboxId: row.sandboxId, url: 'https://example.net/' },
    { agent: { session: {} }, signal: new AbortController().signal })
  assert.equal(refused.ok, false)
  assert.equal(refused.errorId, 'kitesurf.control.bridge')
  assert.equal(connects.length, kernelBefore, 'failed read never reached the kernel')

  const mcpRefused = await call('sandbox.open', { sandboxId: row.sandboxId, url: 'https://example.net/' })
  assert.equal(mcpRefused.result.structuredContent.ok, false)
  assert.equal(mcpRefused.result.structuredContent.errorId, 'kitesurf.control.bridge')
  assert.equal(connects.length, kernelBefore)
})
