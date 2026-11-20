/**
 * T60: fleet projection — managed read surface over explicitly provided env
 * sources, through the real dnls.control/1 router (HTTP + MCP). Proves
 * visibility is applied before any probe, unavailable sources degrade to
 * complete:false without detail, unproven observations project unknown,
 * non-operator peers get no process data, and in-flight authorization loss
 * or replacement suppresses results entirely.
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { createFleetProjection } from '../src/host/fleet-projection.js'
import { createManagedRoutes } from '../src/host/managed-routes.js'
import { BINDING_TABLE } from '../lib/bindings.js'

const CONTRACT = 'dnls.control/1'
const MCP_PATH = '/nano-local-sandbox/mcp'

function ownerPeer(controller = new AbortController()) {
  return { principal: { kind: 'owner' }, signal: controller.signal }
}

function makeRow(over = {}) {
  const id = randomUUID()
  return {
    sandboxId: id,
    name: over.name ?? `sb-${id.slice(0, 6)}`,
    profileId: 'kitesurf',
    principal: 'owner',
    recipeRef: 'kitesurf-engine@sha256:' + 'aa'.repeat(32),
    origin: 'created',
    stateVolume: `/state/kitesurf/${id}`,
    binding: { locator: `dnls-${id.slice(0, 12)}`, generation: `gen-${id.slice(0, 12)}` },
    ports: [{ serviceId: 'engine', containerPort: 8787, hostPort: 8940, protocol: 'tcp', hostAddress: '127.0.0.1' }],
    managedAt: 1_700_000_000_000,
    desiredRevision: null,
    appliedRevision: null,
    operations: [],
    terminals: [],
    removed: false,
    ...over,
  }
}

function liveObs(row, over = {}) {
  return {
    locator: row.binding.locator,
    generation: row.binding.generation,
    stateVolume: row.stateVolume,
    state: 'running',
    observedAt: '2026-11-19T18:00:00.000Z',
    publications: [{ serviceId: null, containerPort: 8787, hostPort: 8940, protocol: 'tcp', hostAddress: '127.0.0.1' }],
    resources: { cpus: 4, memoryBytes: 4 * 1024 ** 3 },
    mounts: [],
    imageDigest: null,
    ...over,
  }
}

/**
 * A source is exactly the host-provided shape: envId, visibleTo(principal),
 * registry {list,get}, observe(row), profileFor, usage, backend. Counters
 * prove which seams were never touched.
 */
function makeSource(envId, rows, { visibleTo, observe, backend, usage, registryThrows } = {}) {
  const calls = { list: 0, get: 0, observe: 0, profileFor: 0, usage: 0, processes: 0 }
  const byId = new Map(rows.map((row) => [row.sandboxId, row]))
  return {
    calls,
    envId,
    // Scoped visibility is always explicit in the contract — the local
    // default here is "visible", hidden sources pass their own predicate.
    visibleTo: visibleTo ?? (() => true),
    registry: {
      list() { calls.list += 1; if (registryThrows) throw new Error('ledger unavailable'); return rows.map((row) => structuredClone(row)) },
      get(id) { calls.get += 1; const row = byId.get(id); return row ? structuredClone(row) : null },
      /** Tests may swap the live row copy to prove in-flight replacement. */
      _replace(id, next) { byId.set(id, next) },
    },
    observe: observe ?? (async (row) => { calls.observe += 1; return liveObs(row) }),
    profileFor: async () => {
      calls.profileFor += 1
      return {
        services: [{ id: 'engine', port: 8787, protocol: 'tcp', cwd: '/opt/kitesurf', role: 'engine' }],
        // T-O-67: the readonly manifest capability list projected onto rows.
        drivers: ['cdp', 'mcp'],
      }
    },
    usage: usage ?? { summary: async () => { calls.usage += 1; return { window: '24h', minutes: 0 } } },
    backend: backend ?? {
      processes: async () => { calls.processes += 1; return [
        { pid: 42, ppid: 1, state: 'S', name: 'node', rssBytes: 1024 },
        { pid: 7, ppid: 1, state: 'S', name: 'init', rssBytes: 512 },
      ] },
    },
  }
}

function principalOf(candidate) {
  return typeof candidate === 'function' ? candidate() : candidate
}

test('fleet instruments show sampled zero only to the current operator for their own object', async () => {
  const mine = makeRow()
  const other = makeRow({ principal: 'elsewhere' })
  const used = []
  const zero = { at: 1_700_000_000_000, cpuCores: 0, memoryBytes: 0 }
  const local = makeSource('dev', [mine, other], { usage: { lastMinute(row) { used.push(row.sandboxId); return zero } } })
  let operator = true
  const { http } = setup({ sources: [local], principal: () => ({ key: 'owner', operator, canSee: true, canUse: true }) })
  const list = await http('/nano-local-sandbox/sandboxes')
  assert.equal(list.status, 200)
  assert.deepEqual(list.body.rows.find(r => r.sandboxId === mine.sandboxId).lastMinute, zero)
  assert.equal(Object.hasOwn(list.body.rows.find(r => r.sandboxId === other.sandboxId), 'lastMinute'), false)
  assert.deepEqual(used, [mine.sandboxId])
  local.observe = async row => {
    if (row.sandboxId === other.sandboxId) operator = false
    return liveObs(row)
  }
  const revoked = await http('/nano-local-sandbox/fleet')
  assert.equal(revoked.status, 200)
  assert.ok(revoked.body.envs[0].rows.every(r => !Object.hasOwn(r, 'lastMinute')))
  assert.deepEqual(used, [mine.sandboxId])
})

function setup({ sources, principal = { key: 'owner', operator: true, canSee: true, canUse: true } } = {}) {
  let peer = ownerPeer()
  const connection = { admit: async () => ({ peer }) }
  const resolvePrincipal = () => principalOf(principal)
  const fleet = createFleetProjection({ envId: 'dev', sources, resolvePrincipal })
  const specs = createManagedRoutes({ capabilities: fleet.capabilities, execute: fleet.execute, connection, table: BINDING_TABLE })
  const byPath = new Map(specs.map((spec) => [spec.path, spec]))

  async function http(path, { method = 'GET', query = '' } = {}) {
    const req = { method, url: `${path}${query}`, headers: { 'x-dnls-contract': CONTRACT } }
    const res = { statusCode: 0, setHeader() {}, end(text) { this.text = text } }
    await byPath.get(path).handler(req, res)
    return { status: res.statusCode, body: res.text ? JSON.parse(res.text) : undefined }
  }

  let rpcId = 0
  async function tool(name, args) {
    const req = {
      method: 'POST',
      url: MCP_PATH,
      headers: {},
      body: JSON.stringify({
        jsonrpc: '2.0', id: ++rpcId, method: 'tools/call',
        params: { name, arguments: args, _meta: { 'dnls/contract': CONTRACT } },
      }),
    }
    const res = { statusCode: 0, setHeader() {}, end(text) { this.text = text } }
    await byPath.get(MCP_PATH).handler(req, res)
    return { status: res.statusCode, result: JSON.parse(res.text).result }
  }

  const setPeer = (next) => { peer = next }
  return { fleet, specs, http, tool, setPeer }
}

test('T60 fleet: hidden env and hidden sandbox never consulted or emitted', async () => {
  const visible = makeRow({ name: 'visible-one' })
  const hiddenSandbox = makeRow({ name: 'hidden-sandbox', principal: 'other' })
  const hiddenEnvRow = makeRow({ name: 'hidden-env' })
  const local = makeSource('dev', [visible, hiddenSandbox])
  const remote = makeSource('prod', [hiddenEnvRow], { visibleTo: () => false })
  const { http } = setup({
    sources: [local, remote],
    principal: { key: 'owner', operator: true, canSee: (row) => row.principal === 'owner', canUse: true },
  })
  const { status, body } = await http('/nano-local-sandbox/fleet')
  assert.equal(status, 200)
  assert.deepEqual(body.envs.map((env) => env.envId), ['dev'])
  assert.equal(remote.calls.list, 0, 'hidden env registry was consulted')
  assert.equal(remote.calls.observe, 0)
  const text = JSON.stringify(body)
  assert.equal(text.includes(hiddenEnvRow.sandboxId), false)
  assert.equal(text.includes('hidden-env'), false)
  const env = body.envs[0]
  assert.equal(env.complete, true)
  assert.deepEqual(env.rows.map((row) => row.sandboxId), [visible.sandboxId])
  assert.equal(text.includes(hiddenSandbox.sandboxId), false)
  assert.equal(text.includes('hidden-sandbox'), false)
})

test('T60 fleet: unavailable visible source marks complete:false, no details', async () => {
  const row = makeRow()
  const ok = makeSource('dev', [row])
  const broken = makeSource('prod', [], { registryThrows: true })
  const { http } = setup({ sources: [ok, broken] })
  const { status, body } = await http('/nano-local-sandbox/fleet')
  assert.equal(status, 200)
  assert.deepEqual(body.envs.map((env) => ({ envId: env.envId, complete: env.complete })), [
    { envId: 'dev', complete: true },
    { envId: 'prod', complete: false },
  ])
  const prod = body.envs.find((env) => env.envId === 'prod')
  assert.deepEqual(prod.rows, [])
  assert.equal(JSON.stringify(prod).includes('ledger unavailable'), false)
  assert.equal(broken.calls.list, 1, 'visible source was consulted')
  assert.equal(broken.calls.observe, 0, 'broken ledger still probed rows')
})

test('T60 sandboxes: paged count counts only visible rows, stable sort', async () => {
  const rows = [makeRow(), makeRow(), makeRow(), makeRow({ principal: 'other', name: 'hidden' })].sort((a, b) => a.sandboxId.localeCompare(b.sandboxId))
  const local = makeSource('dev', [...rows].reverse())
  const { http, tool } = setup({
    sources: [local],
    principal: { key: 'owner', operator: true, canSee: (row) => row.principal === 'owner', canUse: true },
  })
  const expected = rows.filter((row) => row.principal === 'owner').map((row) => row.sandboxId).sort()
  const first = await http('/nano-local-sandbox/sandboxes', { query: '?limit=2&offset=0' })
  assert.equal(first.status, 200)
  assert.equal(first.body.total, 3, 'hidden row must not inflate the count')
  assert.deepEqual(first.body.rows.map((row) => row.sandboxId), expected.slice(0, 2))
  assert.equal(first.body.limit, 2)
  assert.equal(first.body.complete, true)
  const second = await http('/nano-local-sandbox/sandboxes', { query: '?limit=2&offset=2' })
  assert.deepEqual(second.body.rows.map((row) => row.sandboxId), expected.slice(2))
  // Same projection over MCP: tool args instead of query keys.
  const mcp = await tool('sandbox.list', { limit: 1 })
  assert.equal(mcp.result.isError, false)
  assert.equal(mcp.result.structuredContent.total, 3)
  assert.deepEqual(mcp.result.structuredContent.rows.map((row) => row.sandboxId), expected.slice(0, 1))
  // Declared selector keys are still rejected on targetless reads.
  const bad = await http('/nano-local-sandbox/sandboxes', { query: '?sandboxId=abc' })
  assert.equal(bad.status, 400)
})

test('T60 list: unproven observation projects unknown, never fake health', async () => {
  const row = makeRow()
  const local = makeSource('dev', [row], {
    observe: async (r) => ({ ...liveObs(r), generation: 'different-generation', stateVolume: r.stateVolume }),
  })
  const { http } = setup({ sources: [local] })
  const { body } = await http('/nano-local-sandbox/fleet')
  const item = body.envs[0].rows[0]
  assert.equal(item.generation, null)
  assert.equal(item.observedState, 'unknown')
  assert.equal(item.health, 'unknown')
  assert.equal(item.observedAt, null)
  assert.deepEqual(item.services, [{ serviceId: 'engine', published: false, health: 'unknown' }])
})

test('T60 processes: operator sees sorted bounded table; non-operator gets nothing', async () => {
  const row = makeRow()
  const local = makeSource('dev', [row])
  const { tool, setPeer } = setup({ sources: [local] })
  const res = await tool('sandbox.processes', { sandboxId: row.sandboxId })
  assert.equal(res.result.isError, false, JSON.stringify(res.result))
  const out = res.result.structuredContent
  assert.equal(out.ok, true)
  assert.deepEqual(out.processes.map((p) => p.pid), [7, 42])
  assert.deepEqual(Object.keys(out.processes[0]).sort(), ['name', 'pid', 'ppid', 'rssBytes', 'state'])
  assert.equal(out.truncated, false)
  assert.equal(local.calls.processes, 1)

  // A live non-operator principal: authorized to read, never to proc.
  const denied = await setup({
    sources: [local],
    principal: { key: 'scoped', operator: false, canSee: true, canUse: true },
  }).tool('sandbox.processes', { sandboxId: row.sandboxId })
  assert.equal(denied.result.isError, true)
  assert.equal(denied.result.structuredContent.ok, false)
  assert.equal(JSON.stringify(denied.result).includes('pid'), false)
  assert.equal(local.calls.processes, 1, 'processes ran for a non-operator')

  // Over-limit and out-of-range caps fail before any guest call.
  const tooBig = await tool('sandbox.processes', { sandboxId: row.sandboxId, limit: 201 })
  assert.equal(tooBig.result.isError, true)
  assert.equal(tooBig.result.structuredContent.errorId, 'sandbox.params.limit')
  const capped = await tool('sandbox.processes', { sandboxId: row.sandboxId, limit: 1 })
  assert.equal(capped.result.structuredContent.returned, 1)
  assert.equal(capped.result.structuredContent.truncated, true)
})

test('T60 processes: stopped/missing/unknown objects yield no fake table', async () => {
  const row = makeRow()
  for (const [state, want] of [['stopped', 'stopped'], ['missing', 'missing'], [null, 'unknown']]) {
    const local = makeSource('dev', [row], {
      observe: async (r) => (state === null ? null : liveObs(r, { state })),
    })
    const { tool } = setup({ sources: [local] })
    const res = await tool('sandbox.processes', { sandboxId: row.sandboxId })
    assert.equal(res.result.structuredContent.ok, false)
    assert.equal(res.result.structuredContent.state, want)
    assert.equal(res.result.structuredContent.processes, undefined)
    assert.equal(local.calls.processes, 0, `processes ran for ${want} evidence`)
  }
})

test('T60 processes: replacement or auth loss in flight suppresses results', async () => {
  const row = makeRow()
  // The object is replaced between the pre-check and the backend call's
  // post-observation — generation mismatch suppresses the table entirely.
  const local = makeSource('dev', [row])
  const backend = {
    processes: async () => {
      local.calls.processes += 1
      local.registry._replace(row.sandboxId, { ...row, binding: { locator: row.binding.locator, generation: 'gen-replaced' } })
      return [{ pid: 1, ppid: 0, state: 'S', name: 'init', rssBytes: 1 }]
    },
  }
  local.backend = backend
  const { tool } = setup({ sources: [local] })
  const res = await tool('sandbox.processes', { sandboxId: row.sandboxId })
  // A binding that moved under dispatch is a non-2xx business error, never
  // a pid-bearing or ok:false-shaped answer.
  assert.equal(res.result.isError, true)
  assert.equal(res.status, 409)
  assert.equal(JSON.stringify(res.result).includes('"pid"'), false)
})

test('T60 fleet: row suppressed when authorization or binding flips mid-probe', async () => {
  const row = makeRow()
  let open = true
  const local = makeSource('dev', [row], {
    observe: async (r) => { open = false; return liveObs(r) },
  })
  const { http } = setup({
    sources: [local],
    principal: { key: 'owner', operator: true, canSee: () => open, canUse: true },
  })
  const { body } = await http('/nano-local-sandbox/fleet')
  assert.equal(body.envs[0].complete, false)
  assert.deepEqual(body.envs[0].rows, [])

  // Replaced binding mid-probe: fresh-row check catches it, row vanishes.
  const local2 = makeSource('dev', [row], {
    observe: async (r) => {
      local2.registry._replace(row.sandboxId, { ...row, binding: { locator: 'dnls-new', generation: 'gen-new' } })
      return liveObs(r)
    },
  })
  const again = setup({ sources: [local2] })
  const out = await again.http('/nano-local-sandbox/fleet')
  assert.equal(out.body.envs[0].complete, false)
  assert.deepEqual(out.body.envs[0].rows, [])
})

test('T60 inspect: allowlisted detail, per-service tuples, scoped usage', async () => {
  const row = makeRow()
  const local = makeSource('dev', [row])
  const { tool } = setup({ sources: [local] })
  const res = await tool('sandbox.inspect', { sandboxId: row.sandboxId, window: '24h' })
  assert.equal(res.result.isError, false, JSON.stringify(res.result))
  const detail = res.result.structuredContent
  assert.equal(detail.sandboxId, row.sandboxId)
  assert.equal(detail.generation, row.binding.generation)
  assert.equal(detail.observedState, 'running')
  assert.deepEqual(detail.services, [{
    serviceId: 'engine', containerPort: 8787, protocol: 'tcp',
    published: true, hostPort: 8940, hostAddress: '127.0.0.1',
    health: 'unknown', declaredVersion: null, observedVersion: null,
    observedAt: '2026-11-19T18:00:00.000Z', guestCwd: '/opt/kitesurf',
    role: 'engine',
  }])
  assert.equal(local.calls.usage, 1)
  // The allowlist is total: no volume path, mount sources, principal or argv leaks.
  for (const banned of ['stateVolume', 'principal', 'env', 'argv', 'recipeRef']) {
    assert.equal(Object.hasOwn(detail, banned), false, `detail leaked ${banned}`)
  }
  // Guest mounts carry target/type/readOnly only — never a host source.
  for (const mount of detail.mounts ?? []) {
    assert.deepEqual(Object.keys(mount).sort(), ['readOnly', 'target', 'type'])
  }
  // Usage window on a non-operator is refused outright.
  const scoped = setup({ sources: [local], principal: { key: 'scoped', operator: false, canSee: true, canUse: true } })
  const denied = await scoped.tool('sandbox.inspect', { sandboxId: row.sandboxId, window: '24h' })
  assert.equal(denied.result.isError, true)
  assert.equal(denied.result.structuredContent.ok, false)
  assert.equal(local.calls.usage, 1, 'usage.summary ran for a non-operator')

  // Hidden row: nothing, not even a not-found echo of visibility.
  const hidden = setup({
    sources: [local],
    principal: { key: 'scoped', operator: true, canSee: false, canUse: true },
  })
  const obsBefore = local.calls.observe
  const invisible = await hidden.tool('sandbox.inspect', { sandboxId: row.sandboxId })
  assert.equal(invisible.result.isError, true)
  assert.equal(invisible.result.structuredContent.ok, false)
  assert.equal(local.calls.observe, obsBefore, 'hidden row was still probed')
})

test('T60 detail: resources allowlist; configuration and applied are operator-only', async () => {
  const digest = 'sha256:' + 'cc'.repeat(32)
  const row = makeRow({
    desiredRevision: { revision: 3, overrides: { cpus: 2, memoryBytes: 2 * 1024 ** 3 } },
    appliedRevision: { revision: 2, imageDigest: digest, verifiedAt: '2026-11-20T00:00:00.000Z' },
    idleTimeoutMs: 1_800_000,
  })
  const local = makeSource('dev', [row], {
    observe: async (entry) => liveObs(entry, { resources: { cpus: 4, memoryBytes: 4 * 1024 ** 3, pids: 99 } }),
  })
  const { tool } = setup({ sources: [local] })
  const res = await tool('sandbox.inspect', { sandboxId: row.sandboxId })
  assert.equal(res.result.isError, false, JSON.stringify(res.result))
  const detail = res.result.structuredContent
  assert.deepEqual(detail.resources, { cpus: 4, memoryBytes: 4 * 1024 ** 3 }, 'only cpus/memoryBytes survive the allowlist')
  assert.deepEqual(detail.configuration, {
    overrides: { cpus: 2, memoryBytes: 2 * 1024 ** 3 },
    idleTimeoutMs: 1_800_000,
  })
  assert.deepEqual(detail.applied, { imageDigest: digest, verifiedAt: '2026-11-20T00:00:00.000Z' })

  // A read grant alone never discloses the operator plane.
  const scoped = setup({ sources: [local], principal: { key: 'scoped', operator: false, canSee: true, canUse: true } })
  const plain = await scoped.tool('sandbox.inspect', { sandboxId: row.sandboxId })
  assert.equal(plain.result.isError, false, JSON.stringify(plain.result))
  const body = plain.result.structuredContent
  assert.equal(Object.hasOwn(body, 'configuration'), false, 'non-operator detail leaked configuration')
  assert.equal(Object.hasOwn(body, 'applied'), false, 'non-operator detail leaked applied receipt')
})

test('T60 read surface never samples usage or processes during list/fleet', async () => {
  const rows = [makeRow(), makeRow()]
  const local = makeSource('dev', rows)
  const { http } = setup({ sources: [local] })
  await http('/nano-local-sandbox/fleet')
  await http('/nano-local-sandbox/sandboxes', { query: '?limit=50' })
  assert.equal(local.calls.processes, 0)
  assert.equal(local.calls.usage, 0)
  // Observation ran once per projected row, never per hidden check.
  assert.equal(local.calls.observe, 4)
})

test('T60 processes: malformed or foreign source entries never leak or fake success', async () => {
  const row = makeRow()
  // Non-array backend reply: failure, not an empty table.
  const nonArray = makeSource('dev', [row])
  nonArray.backend = { processes: async () => 'not-an-array' }
  const a = setup({ sources: [nonArray] })
  const bad = await a.tool('sandbox.processes', { sandboxId: row.sandboxId })
  assert.equal(bad.result.isError, true)
  assert.equal(bad.status, 502)
  assert.equal(JSON.stringify(bad.result).includes('"pid"'), false)

  // Entries carrying foreign fields (argv/env/paths) cross only the allowlist.
  const leaky = makeSource('dev', [row])
  leaky.backend = { processes: async () => [
    { pid: 9, ppid: 1, name: 'init', state: 'S', rssBytes: 128, argv: ['rm', '-rf'], env: { TOKEN: 'x' }, exe: '/secret' },
    { pid: 2, ppid: 0, name: 'kthreadd', state: 'S', rssBytes: 0 },
  ] }
  const b = setup({ sources: [leaky] })
  const ok = await b.tool('sandbox.processes', { sandboxId: row.sandboxId })
  assert.equal(ok.result.isError, false)
  assert.deepEqual(ok.result.structuredContent.processes.map((p) => p.pid), [2, 9])
  assert.deepEqual(Object.keys(ok.result.structuredContent.processes[0]).sort(), ['name', 'pid', 'ppid', 'rssBytes', 'state'])
  const text = JSON.stringify(ok.result.structuredContent)
  for (const leak of ['argv', 'TOKEN', '/secret', 'env', 'exe']) {
    assert.equal(text.includes(leak), false, `response leaked ${leak}`)
  }
  assert.equal(ok.result.structuredContent.generation, row.binding.generation)
  assert.equal(ok.result.structuredContent.observedAt, '2026-11-19T18:00:00.000Z')
})

test('T60 processes: peer revoked before probe makes zero guest calls', async () => {
  const row = makeRow()
  const local = makeSource('dev', [row])
  const controller = new AbortController()
  const { tool, setPeer } = setup({ sources: [local] })
  const aborted = { principal: { kind: 'owner' }, signal: controller.signal }
  controller.abort()
  setPeer(aborted)
  const res = await tool('sandbox.processes', { sandboxId: row.sandboxId })
  assert.equal(res.result.isError, true)
  assert.equal(local.calls.observe, 0, 'revoked peer still probed')
  assert.equal(local.calls.processes, 0, 'revoked peer reached the guest')
})

test('T-O-67: list and inspect rows carry the readonly drivers projection from the same source', async () => {
  const row = makeRow()
  const local = makeSource('dev', [row])
  const { http, tool } = setup({ sources: [local] })
  // HTTP read and the T-O-64 list tool read one projection — the value is
  // exactly what the profile source declares.
  const list = await http('/nano-local-sandbox/sandboxes')
  assert.equal(list.status, 200)
  const listed = list.body.rows.find((entry) => entry.sandboxId === row.sandboxId)
  assert.deepEqual(listed.drivers, ['cdp', 'mcp'])
  const viaTool = await tool('sandbox.list', {})
  assert.equal(viaTool.result.isError, false)
  const toolListed = viaTool.result.structuredContent.rows.find((entry) => entry.sandboxId === row.sandboxId)
  assert.deepEqual(toolListed.drivers, listed.drivers, 'tool list is the same-source projection')
  const detail = await http('/nano-local-sandbox/inspect', { query: `?sandboxId=${row.sandboxId}` })
  assert.equal(detail.status, 200)
  assert.deepEqual(detail.body.drivers, ['cdp', 'mcp'])
  const toolDetail = await tool('sandbox.inspect', { sandboxId: row.sandboxId })
  assert.deepEqual(toolDetail.result.structuredContent.drivers, ['cdp', 'mcp'])
  // fleet uses the same row projection.
  const fleet = await http('/nano-local-sandbox/fleet')
  assert.deepEqual(fleet.body.envs[0].rows[0].drivers, ['cdp', 'mcp'])
  // An unresolvable profile fails closed to an empty list, never a guess.
  const noProfile = makeSource('dev', [row])
  noProfile.profileFor = async () => { throw new Error('profile unavailable') }
  const second = setup({ sources: [noProfile] })
  const degraded = await second.http('/nano-local-sandbox/sandboxes')
  assert.deepEqual(degraded.body.rows[0].drivers, [])
})

test('T60 fleet: only this principal own live terminals are counted', async () => {
  const gen = 'gen-fixed'
  const row = makeRow({
    binding: { locator: 'dnls-fixed', generation: gen },
    terminals: [
      { terminalId: randomUUID(), sandboxId: 'x', principal: 'owner', openId: 'o1', fingerprint: 'f', generation: gen, state: 'active' },
      { terminalId: randomUUID(), sandboxId: 'x', principal: 'owner', openId: 'o2', fingerprint: 'f', generation: 'gen-old', state: 'active' },
      { terminalId: randomUUID(), sandboxId: 'x', principal: 'other', openId: 'o3', fingerprint: 'f', generation: gen, state: 'active' },
      { terminalId: randomUUID(), sandboxId: 'x', principal: 'owner', openId: 'o4', fingerprint: 'f', generation: gen, state: 'ended' },
    ],
  })
  const local = makeSource('dev', [row])
  const { http } = setup({ sources: [local] })
  const { body } = await http('/nano-local-sandbox/fleet')
  assert.equal(body.envs[0].rows[0].visibleTerminalCount, 1)
})

test('T60 list: source visibility revoked mid-flight drops the env and its count', async () => {
  const rows = [makeRow(), makeRow()]
  let open = true
  const local = makeSource('dev', rows, { visibleTo: () => open })
  const remote = makeSource('prod', [makeRow()], { visibleTo: () => true })
  const { http } = setup({ sources: [local, remote] })
  open = false // revoked between admission and response assembly
  const { status, body } = await http('/nano-local-sandbox/sandboxes')
  assert.equal(status, 200)
  assert.deepEqual(body.envs.map((env) => env.envId), ['prod'])
  assert.equal(body.total, 1)
  assert.equal(JSON.stringify(body).includes(rows[0].sandboxId), false)
})

test('T60 processes: generation moved after guest read suppresses the table', async () => {
  const row = makeRow()
  const gen = row.binding.generation
  const local = makeSource('dev', [row], {
    observe: async (r) => {
      local.calls.observe += 1
      // First call returns the bound generation; post-read returns a moved one.
      return liveObs(r, { generation: local.calls.observe === 1 ? gen : 'gen-moved-after' })
    },
  })
  const { tool } = setup({ sources: [local] })
  const res = await tool('sandbox.processes', { sandboxId: row.sandboxId })
  assert.equal(res.result.isError, true)
  assert.equal(res.status, 409)
  assert.equal(local.calls.processes, 1, 'the read happened — suppression, not prevention')
  assert.equal(JSON.stringify(res.result).includes('"pid"'), false)
})
