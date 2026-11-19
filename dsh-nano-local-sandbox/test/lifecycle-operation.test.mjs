import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { BINDING_TABLE } from '../lib/bindings.js'
import { registerRoutes } from '../lib/route-guard.js'
import { CONTRACT_VERSION } from '../src/host/control-contract.js'
import { openControlRegistry } from '../src/host/control-registry.js'
import { createAppleBackend } from '../src/host/backend-apple.js'
import { createLifecycleOwner, createObservationSource } from '../src/host/lifecycle-operations.js'
import { createManagedRoutes } from '../src/host/managed-routes.js'

const MANAGED_PATHS = ['/nano-local-sandbox/contract', '/nano-local-sandbox/mcp', '/nano-local-sandbox/lifecycle', '/nano-local-sandbox/operations']
const managedTable = () => BINDING_TABLE.filter((row) => MANAGED_PATHS.includes(row.path))
const versioned = { 'x-dnls-contract': CONTRACT_VERSION }

function ctxFor(routes) {
  return {
    get(name) {
      if (name === 'webServer') return this.webServer
      return { requestRejection() { return undefined } }
    },
    webServer: { register(route) { routes.push(route); return () => {} } },
  }
}

function resFor() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(text) { this.raw = text },
  }
}

/**
 * A live world the injected observe reads: locator → observation or 'missing'.
 * The fake backend mutates it, so pre/post inspect sees real transitions.
 */
const TRUSTED_PROFILE = {
  profileId: 'kitesurf',
  recipeRef: 'recipe@sha256:1',
  // Trusted descriptor: verified image and the row's own mount — never bare ids.
  createSpec: (row) => ({
    containerName: row.binding.locator,
    image: 'dnls-kitesurf@sha256:img',
    mounts: [{ source: row.stateVolume, target: '/state', type: 'bind' }],
    ports: [],
  }),
}

function fixture(t, { principal, envId = 'env-1', profile } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dnls-p3-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const registry = openControlRegistry({ root, envId })
  t.after(() => { try { registry.close() } catch { /* already closed */ } })

  const live = new Map()
  const backend = {
    calls: { create: [], start: [], stop: [], remove: [] },
    async create(descriptor) {
      backend.calls.create.push(descriptor)
      const stateVolume = descriptor.stateVolume ?? descriptor.mounts?.find((m) => m.target === '/state')?.source ?? null
      live.set(descriptor.containerName, { generation: `gen-${backend.calls.create.length}`, stateVolume, state: 'running' })
      return { id: descriptor.containerName }
    },
    async start(name) { backend.calls.start.push(name); live.get(name).state = 'running'; return { ok: true } },
    async stop(name) { backend.calls.stop.push(name); live.get(name).state = 'stopped'; return { ok: true } },
    async remove(name) { backend.calls.remove.push(name); live.delete(name); return { ok: true } },
  }
  const queue = []
  const audits = []
  const owner = createLifecycleOwner({
    registry,
    envId,
    backend,
    profileFor: async () => profile ?? TRUSTED_PROFILE,
    observe: async (locator) => {
      const entry = live.get(locator)
      return entry ? { locator, ...entry } : { locator, generation: null, stateVolume: null, state: 'missing' }
    },
    resolvePrincipal: ({ peer }) => (peer?.key ? {
      key: peer.key,
      operator: peer.operator === true,
      canSee: (row) => peer.operator === true || row.principal === peer.key,
      canUse: (row) => peer.operator === true || row.principal === peer.key,
    } : null),
    schedule: (task) => queue.push(task),
    audit: (record) => audits.push(record),
  })

  const peerOf = (key, operator = true) => ({ key, operator, principal: { kind: 'owner' }, signal: { aborted: false } })
  let currentPeer = peerOf(principal ?? 'owner')
  const routes = []
  registerRoutes(ctxFor(routes), createManagedRoutes({
    table: managedTable(),
    connection: { admit: async () => ({ peer: currentPeer }) },
    capabilities: owner.capabilities,
    execute: owner.execute,
  }), { table: managedTable(), plugin: 'dsh-nano-local-sandbox' })
  const byPath = Object.fromEntries(routes.map((route) => [route.path, route]))
  const call = async (path, { method = 'POST', url = path, headers = versioned, body, res } = {}) => {
    const target = res ?? resFor()
    await byPath[path].handler({ method, url, headers, body }, target)
    return { status: target.statusCode, body: target.raw ? JSON.parse(target.raw) : null, res: target }
  }
  const tool = async (name, args) => call('/nano-local-sandbox/mcp', {
    method: 'POST',
    body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args, _meta: { 'dnls/contract': CONTRACT_VERSION } } },
  })
  const flush = () => { while (queue.length) queue.shift()() }
  const setPeer = (peer) => { currentPeer = peer }
  return { t, root, registry, backend, live, audits, owner, call, tool, flush, setPeer, peerOf }
}

const stored = (f) => JSON.parse(readFileSync(join(f.root, 'registry.json'), 'utf8'))

test('DNLS03-T20 create persists reservation + accepted op in one write before any backend call', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  assert.equal(created.status, 202)
  assert.equal(created.body.action, 'create')
  assert.equal(created.body.state, 'accepted')
  // ONE atomic publish holds the intent row AND its operation — before dispatch.
  const doc = stored(f)
  assert.equal(doc.sandboxes.length, 1)
  assert.equal(doc.sandboxes[0].operations.length, 1)
  assert.equal(doc.sandboxes[0].operations[0].operationId, created.body.operationId)
  assert.equal(f.backend.calls.create.length, 0)

  f.flush()
  await f.owner.drain()
  const row = f.registry.get(created.body.sandboxId)
  assert.equal(f.backend.calls.create.length, 1)
  assert.equal(row.binding.generation, 'gen-1')
  assert.equal(row.binding.locator.startsWith('dnls-'), true)
  const op = f.registry.operation(created.body.sandboxId, created.body.operationId)
  assert.equal(op.state, 'succeeded')
  assert.equal(op.step, 'verify')
})

test('DNLS03-T20 same key+args returns the original across transports; mismatched args refuse', async (t) => {
  const f = fixture(t)
  const first = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  const again = await f.tool('sandbox.instance.create', { name: 'box', requestId: 'r1' })
  assert.equal(again.body.result.structuredContent.operationId, first.body.operationId)
  const changed = await f.tool('sandbox.instance.create', { name: 'other-name', requestId: 'r1' })
  assert.equal(changed.status, 409)
  assert.equal(changed.body.result.structuredContent.errorId, 'sandbox.state_conflict')
  f.flush()
  await f.owner.drain()
  assert.equal(f.backend.calls.create.length, 1)
})

test('DNLS03-T20 cancellation wins only before dispatch', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  const cancelled = await f.tool('sandbox.operations', { sandboxId: created.body.sandboxId, operationId: created.body.operationId, action: 'cancel' })
  assert.equal(cancelled.body.result.structuredContent.state, 'cancelled')
  f.flush()
  await f.owner.drain()
  assert.equal(f.backend.calls.create.length, 0)

  const second = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box2', requestId: 'r2' } })
  f.flush()
  await f.owner.drain()
  const late = await f.tool('sandbox.operations', { sandboxId: second.body.sandboxId, operationId: second.body.operationId, action: 'cancel' })
  // After dispatch, cancel reports the current operation — never rewrites it.
  assert.equal(late.body.result.structuredContent.state, 'succeeded')
})

test('DNLS03-T20 an indeterminate operation blocks a conflicting write', async (t) => {
  const f = fixture(t)
  f.backend.create = async (descriptor) => {
    f.backend.calls.create.push(descriptor)
    throw new Error('backend exploded mid-create')
  }
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  f.flush()
  await f.owner.drain()
  const op = f.registry.operation(created.body.sandboxId, created.body.operationId)
  assert.equal(op.state, 'indeterminate')
  const conflicting = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${created.body.sandboxId}`, body: { action: 'start', requestId: 'r2' } })
  assert.equal(conflicting.status, 409)
  assert.equal(conflicting.body.errorId, 'sandbox.state_conflict')
})

test('DNLS03-T20 a confirmed remove tombstones the row and keeps every byte', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  f.flush()
  await f.owner.drain()
  const sandboxId = created.body.sandboxId
  const row = f.registry.get(sandboxId)

  const removed = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${sandboxId}`, body: { action: 'remove', requestId: 'r2' } })
  assert.equal(removed.status, 202)
  f.flush()
  await f.owner.drain()
  assert.deepEqual(f.backend.calls.remove, [row.binding.locator])
  assert.equal(f.registry.get(sandboxId), null)
  assert.equal(f.registry.list().length, 0)
  // The tombstone, dedupe key and operation document persist on disk; the
  // stateVolume path is never touched by the ledger.
  const doc = stored(f)
  assert.equal(doc.sandboxes.length, 1)
  assert.equal(doc.sandboxes[0].removed, true)
  assert.equal(doc.sandboxes[0].stateVolume, row.stateVolume)
  const op = f.registry.operation(sandboxId, removed.body.operationId)
  assert.equal(op.state, 'succeeded')
})

test('DNLS03-T20 rows and operations reopen exactly; nothing replays after restart', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  f.registry.close()
  const reopened = openControlRegistry({ root: f.root, envId: 'env-1' })
  t.after(() => reopened.close())
  const row = reopened.get(created.body.sandboxId)
  assert.equal(row.operations.length, 1)
  assert.equal(row.operations[0].state, 'accepted')
  // Zero replay: a fresh owner dispatches nothing for the previous host's op.
  const secondBackend = { create: async () => { throw new Error('must not dispatch') } }
  const restarted = createLifecycleOwner({
    registry: reopened,
    envId: 'env-1',
    backend: secondBackend,
    profileFor: async () => ({ profileId: 'kitesurf', recipeRef: 'r' }),
    observe: async () => null,
    resolvePrincipal: () => null,
  })
  await restarted.drain()
  assert.equal(reopened.operation(created.body.sandboxId, created.body.operationId).state, 'accepted')
  // Nor can a foreign `accepted` op be cancelled as if it were a locally
  // queued task — the new host only reports its state.
  const cancelling = createLifecycleOwner({
    registry: reopened,
    envId: 'env-1',
    backend: secondBackend,
    profileFor: async () => ({ profileId: 'kitesurf', recipeRef: 'r' }),
    observe: async () => null,
    resolvePrincipal: ({ peer }) => peer?.key === 'owner'
      ? { key: 'owner', operator: true, canSee: () => true, canUse: () => true }
      : null,
  })
  const peer = f.peerOf('owner')
  const report = await cancelling.cancel({ peer, sandboxId: created.body.sandboxId, operationId: created.body.operationId })
  assert.equal(report.status, 202)
  assert.equal(report.body.state, 'accepted')
  assert.equal(reopened.operation(created.body.sandboxId, created.body.operationId).state, 'accepted')
})

test('DNLS03-T20 already-at-state succeeds without a redundant backend write', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  f.flush()
  await f.owner.drain()
  const sandboxId = created.body.sandboxId
  const start = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${sandboxId}`, body: { action: 'start', requestId: 'r2' } })
  f.flush()
  await f.owner.drain()
  assert.equal(f.backend.calls.start.length, 0)
  assert.equal(f.registry.operation(sandboxId, start.body.operationId).state, 'succeeded')
  assert.equal(f.registry.operation(sandboxId, start.body.operationId).step, 'already')
  f.live.get(f.registry.get(sandboxId).binding.locator).state = 'stopped'
  const stop = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${sandboxId}`, body: { action: 'stop', requestId: 'r3' } })
  f.flush()
  await f.owner.drain()
  assert.equal(f.backend.calls.stop.length, 0)
  assert.equal(f.registry.operation(sandboxId, stop.body.operationId).step, 'already')
})

test('DNLS03-T20 stop, restart and remove dispatch exactly once with pre/post proof', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  f.flush()
  await f.owner.drain()
  const sandboxId = created.body.sandboxId
  const stop = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${sandboxId}`, body: { action: 'stop', requestId: 'r2' } })
  f.flush()
  await f.owner.drain()
  const restart = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${sandboxId}`, body: { action: 'restart', requestId: 'r3' } })
  f.flush()
  await f.owner.drain()
  assert.equal(f.backend.calls.stop.length, 1)
  assert.equal(f.backend.calls.start.length, 1)
  assert.equal(f.registry.operation(sandboxId, stop.body.operationId).state, 'succeeded')
  assert.equal(f.registry.operation(sandboxId, restart.body.operationId).state, 'succeeded')
})

test('DNLS03-T20 recreate fails closed before any destructive step without a profile adapter', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  f.flush()
  await f.owner.drain()
  const op = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${created.body.sandboxId}`, body: { action: 'recreate', requestId: 'r2' } })
  f.flush()
  await f.owner.drain()
  assert.equal(f.backend.calls.stop.length, 0)
  assert.equal(f.backend.calls.remove.length, 0)
  assert.equal(f.backend.calls.create.length, 1)
  const doc = f.registry.operation(created.body.sandboxId, op.body.operationId)
  assert.equal(doc.state, 'failed')
  assert.equal(doc.step, 'precheck')
})

test('DNLS03-T20 HTTP /operations GET reads and POST cancels the same projection', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  const read = await f.call('/nano-local-sandbox/operations', {
    method: 'GET',
    url: `/nano-local-sandbox/operations?sandboxId=${created.body.sandboxId}&operationId=${created.body.operationId}`,
  })
  assert.equal(read.status, 202) // pending state reads stay 202
  assert.equal(read.body.operationId, created.body.operationId)
  assert.equal(read.body.state, 'accepted')
  const cancelled = await f.call('/nano-local-sandbox/operations', {
    method: 'POST',
    url: `/nano-local-sandbox/operations?sandboxId=${created.body.sandboxId}`,
    body: { operationId: created.body.operationId, action: 'cancel' },
  })
  assert.equal(cancelled.status, 200)
  assert.equal(cancelled.body.state, 'cancelled')
})

test('DNLS03-T22 a second principal is invisible-404; audit carries no request or URL', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  f.setPeer(f.peerOf('intruder', false))
  const denied = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${created.body.sandboxId}`, body: { action: 'stop', requestId: 'r2' } })
  assert.equal(denied.status, 404)
  const read = await f.call('/nano-local-sandbox/operations', { method: 'GET', url: `/nano-local-sandbox/operations?sandboxId=${created.body.sandboxId}&operationId=${created.body.operationId}` })
  assert.equal(read.status, 404)
  for (const record of f.audits) {
    assert.deepEqual(Object.keys(record).sort(), ['action', 'at', 'operationId', 'principal', 'result', 'sandboxId'].sort())
    assert.equal(JSON.stringify(record).includes('token='), false)
    assert.equal(JSON.stringify(record).includes('/nano-local-sandbox'), false)
  }
})

test('DNLS03-T20 the production observation source reads raw inspect output strictly', async () => {
  const rawEntry = (id, creationDate, state = 'running') =>
    JSON.stringify([{ configuration: { id, creationDate }, status: { state } }])
  let seenProfileId
  const profileFor = async ({ profileId }) => {
    seenProfileId = profileId
    return { profileId, inspectedRecipe: () => ({ stateSource: '/state/vol' }) }
  }
  const backend = { inspect: async () => ({ raw: rawEntry('dnls-a', '2026-11-19T10:00:00Z') }) }
  const observe = createObservationSource({ backend, profileFor })
  const row = { profileId: 'kitesurf' }

  const first = await observe('dnls-a', row)
  assert.equal(seenProfileId, 'kitesurf')
  assert.equal(first.locator, 'dnls-a')
  assert.equal(first.state, 'running')
  assert.equal(first.stateVolume, '/state/vol')
  // generation is creation identity, never the name itself
  assert.notEqual(first.generation, 'dnls-a')
  // same name, later creationDate → provably a replacement
  backend.inspect = async () => ({ raw: rawEntry('dnls-a', '2026-11-19T11:00:00Z') })
  assert.notEqual((await observe('dnls-a', row)).generation, first.generation)
  // numeric creationDate works too
  backend.inspect = async () => ({ raw: rawEntry('dnls-a', 1700000000) })
  assert.equal(typeof (await observe('dnls-a', row)).generation, 'string')
  // inspect === null is the ONLY authoritative missing
  backend.inspect = async () => null
  assert.equal((await observe('dnls-a', row)).state, 'missing')
  // everything ambiguous is unknown — never "missing", never a binding
  for (const bad of [
    { raw: '[]' },
    { raw: 'not json' },
    { raw: null },
    undefined,
    { raw: rawEntry('dnls-other', '2026-11-19T10:00:00Z') }, // wrong name
    { raw: `${rawEntry('dnls-a', '2026-11-19T10:00:00Z').slice(0, -1)},${rawEntry('dnls-a', '2026-11-19T10:00:00Z').slice(1, -1)}]` }, // two entries
    { raw: '[{}]' },
    { raw: rawEntry('dnls-a', 0) },          // epoch sentinel
    { raw: rawEntry('dnls-a', '0001-01-01') }, // default sentinel
    { raw: JSON.stringify([{ configuration: { id: 'dnls-a' } }]) }, // no creationDate
    { raw: JSON.stringify([{ configuration: { id: 'dnls-a', creationDate: 1700000000 }, status: { state: 'restarting?' } }]) }, // unknown state
  ]) {
    backend.inspect = async () => bad
    assert.equal(await observe('dnls-a', row), null, JSON.stringify(bad))
  }
  // a daemon error surfaces — it is unknown, not missing
  backend.inspect = async () => { throw new Error('daemon unreachable') }
  await assert.rejects(observe('dnls-a', row))
})

test('DNLS03-T20 a replaced generation before dispatch is indeterminate — no privileged call', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  f.flush()
  await f.owner.drain()
  const sandboxId = created.body.sandboxId
  const locator = f.registry.get(sandboxId).binding.locator
  f.live.get(locator).generation = 'gen-foreign'
  const stop = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${sandboxId}`, body: { action: 'stop', requestId: 'r2' } })
  f.flush()
  await f.owner.drain()
  assert.equal(f.backend.calls.stop.length, 0)
  const op = f.registry.operation(sandboxId, stop.body.operationId)
  assert.equal(op.state, 'indeterminate')
  assert.equal(op.step, 'pre-mismatch')
})

test('DNLS03-T20 a replacement mid-restart stops the operation — start is never sent', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  f.flush()
  await f.owner.drain()
  const sandboxId = created.body.sandboxId
  const locator = f.registry.get(sandboxId).binding.locator
  f.backend.stop = async (name) => {
    f.backend.calls.stop.push(name)
    f.live.get(name).state = 'stopped'
    f.live.get(name).generation = 'gen-replacement' // recreated under the same name
    return { ok: true }
  }
  const restart = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${sandboxId}`, body: { action: 'restart', requestId: 'r2' } })
  f.flush()
  await f.owner.drain()
  assert.equal(f.backend.calls.start.length, 0)
  const op = f.registry.operation(sandboxId, restart.body.operationId)
  assert.equal(op.state, 'indeterminate')
  assert.equal(op.step, 'stop-verify')
})

test('DNLS03-T20 uncertain removal preserves the row — only confirmed absence tombstones', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  f.flush()
  await f.owner.drain()
  const sandboxId = created.body.sandboxId
  const row = f.registry.get(sandboxId)
  // The delete leaves an impostor behind: removal evidence is uncertain.
  f.backend.remove = async (name) => {
    f.backend.calls.remove.push(name)
    f.live.set(name, { generation: 'gen-impostor', stateVolume: row.stateVolume, state: 'running' })
    return { ok: true }
  }
  const removed = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${sandboxId}`, body: { action: 'remove', requestId: 'r2' } })
  f.flush()
  await f.owner.drain()
  assert.equal(f.registry.operation(sandboxId, removed.body.operationId).state, 'indeterminate')
  assert.notEqual(f.registry.get(sandboxId), null) // NOT tombstoned
  assert.equal(stored(f).sandboxes[0].removed, false)
})

test('DNLS03-T20 an invalid transition throws and leaves the operation untouched', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  const opId = created.body.operationId
  assert.throws(() => f.registry.transition(opId, 'accepted', { state: 'succeeded' }), /illegal transition/)
  assert.throws(() => f.registry.transition(opId, 'accepted', { state: 'indeterminate' }), /illegal transition/)
  assert.equal(f.registry.operation(created.body.sandboxId, opId).state, 'accepted')
  // a binding patch without generation is rejected before any mutation
  assert.throws(() => f.registry.transition(opId, 'accepted', { state: 'cancelled', binding: { locator: 'x' } }), /locator and generation/)
  assert.equal(f.registry.operation(created.body.sandboxId, opId).state, 'accepted')
})

test('DNLS03-T20 a completed remove dedupes the original 200 across a tombstone', async (t) => {
  const f = fixture(t)
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  f.flush()
  await f.owner.drain()
  const sandboxId = created.body.sandboxId
  const removed = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${sandboxId}`, body: { action: 'remove', requestId: 'r2' } })
  f.flush()
  await f.owner.drain()
  assert.equal(f.registry.get(sandboxId), null)
  // Same submitter + same key+args reaches its own completed op through the
  // tombstone — a different requestId still sees nothing.
  const again = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${sandboxId}`, body: { action: 'remove', requestId: 'r2' } })
  assert.equal(again.status, 200)
  assert.equal(again.body.operationId, removed.body.operationId)
  assert.equal(again.body.state, 'succeeded')
  const fresh = await f.call('/nano-local-sandbox/lifecycle', { url: `/nano-local-sandbox/lifecycle?sandboxId=${sandboxId}`, body: { action: 'remove', requestId: 'r9' } })
  assert.equal(fresh.status, 404)
  // the submitter can also read the removal op through the tombstone
  const read = await f.call('/nano-local-sandbox/operations', { method: 'GET', url: `/nano-local-sandbox/operations?sandboxId=${sandboxId}&operationId=${removed.body.operationId}` })
  assert.equal(read.status, 200)
  assert.equal(read.body.state, 'succeeded')
  assert.equal(f.backend.calls.remove.length, 1)
})

test('DNLS03-T20 create without a trusted createSpec fails at precheck — no descriptor accepted', async (t) => {
  const f = fixture(t, { profile: { profileId: 'kitesurf', recipeRef: 'recipe@sha256:1' } })
  const created = await f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' } })
  f.flush()
  await f.owner.drain()
  assert.equal(f.backend.calls.create.length, 0)
  const op = f.registry.operation(created.body.sandboxId, created.body.operationId)
  assert.equal(op.state, 'failed')
  assert.equal(op.step, 'precheck')
})

test('DNLS03-T20 a transport disconnect on a queued op cancels nothing — one dispatch completes', async (t) => {
  const f = fixture(t)
  const res = Object.assign(new EventEmitter(), resFor())
  const pending = f.call('/nano-local-sandbox/lifecycle', { body: { action: 'create', name: 'box', requestId: 'r1' }, res })
  res.destroyed = true
  res.emit('close') // the client hung up while the op sat at the barrier
  const created = await pending
  assert.equal(created.status, 202)
  f.flush()
  await f.owner.drain()
  assert.equal(f.backend.calls.create.length, 1)
  assert.equal(f.registry.operation(created.body.sandboxId, created.body.operationId).state, 'succeeded')
})

test('DNLS03-T20 the real Apple backend proves missing only on the exact documented diagnostic', async () => {
  const cliFailure = (stderr, extra = {}) => Object.assign(new Error(`container inspect: ${stderr}`), { stderr, code: 1, ...extra })
  const exec = { fn: async () => { throw cliFailure('container not found: dnls-apple') } }
  const io = { execFile: (...args) => exec.fn(...args) } // bound once; fn may change
  const backend = createAppleBackend({ image: 'dnls@sha256:img' }, io)
  // the two documented absence shapes for the exact name
  assert.equal(await backend.inspect('dnls-apple'), null)
  exec.fn = async () => { throw cliFailure('container with ID dnls-apple not found') }
  assert.equal(await backend.inspect('dnls-apple'), null)
  // standard Error/notFound prefix still counts, wrong name never does
  exec.fn = async () => { throw cliFailure('Error: container not found: dnls-apple') }
  assert.equal(await backend.inspect('dnls-apple'), null)
  exec.fn = async () => { throw cliFailure('container not found: dnls-other') }
  await assert.rejects(backend.inspect('dnls-apple'))
  // daemon socket, CLI ENOENT and ambiguous output are unknown — never absence
  exec.fn = async () => { throw cliFailure('connect: no such file or directory') }
  await assert.rejects(backend.inspect('dnls-apple'))
  exec.fn = async () => { throw Object.assign(new Error('spawn container ENOENT'), { code: 'ENOENT' }) }
  await assert.rejects(backend.inspect('dnls-apple'))
  exec.fn = async () => { throw cliFailure('container not found: dnls-apple\nsecond diagnostic') }
  await assert.rejects(backend.inspect('dnls-apple'))
})

test('DNLS03-T20 the observation source runs through the real Apple backend — same digest, provable replacement', async () => {
  const entry = { configuration: { id: 'dnls-apple', creationDate: '2026-11-19T10:00:00Z' }, status: { state: 'running' } }
  const exec = { fn: async () => JSON.stringify([entry]) }
  const io = { execFile: (...args) => exec.fn(...args) } // bound once; fn may change
  const backend = createAppleBackend({ image: 'dnls@sha256:img' }, io)
  const profileFor = async () => ({ profileId: 'kitesurf', inspectedRecipe: () => ({ stateSource: '/state/vol' }) })
  const observe = createObservationSource({ backend, profileFor })
  const row = { profileId: 'kitesurf' }
  const first = await observe('dnls-apple', row)
  assert.equal(first.state, 'running')
  assert.equal(first.locator, 'dnls-apple')
  const again = await observe('dnls-apple', row)
  assert.equal(again.generation, first.generation) // same digest through the real execFile seam
  exec.fn = async () => JSON.stringify([{ ...entry, configuration: { ...entry.configuration, creationDate: '2026-11-19T11:00:00Z' } }])
  assert.notEqual((await observe('dnls-apple', row)).generation, first.generation)
})
