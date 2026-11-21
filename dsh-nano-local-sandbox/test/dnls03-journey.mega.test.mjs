import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { apply } from '../index.js'
import { BINDING_TABLE } from '../lib/bindings.js'
import { runtimeRoot } from '../profiles/kitesurf/driver/runtime.js'
import { resolveOwnerPrincipal } from '../src/host/object-authz.js'
import { loadProfileDriver, profilesRootFor } from '../src/host/profile-drivers.js'
import { makeBackend, materializeRuntime } from './support/managed-apple.mjs'

test('T80: shipped plugin registers a single managed control surface from discovery to attach', async (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'dnls-managed-journey-')))
  const env = { DNLS_ENV: 'dev', DSH_HOME: root, DNLS_STATE_ROOT: join(root, 'state') }
  const profile = await loadProfileDriver(join(profilesRootFor({ env }), 'kitesurf'), { env })
  assert.ok(profile.ready, JSON.stringify(profile.errors))
  materializeRuntime(runtimeRoot(profile.manifest, { env }), profile.manifest)
  const routes = new Map(), upgrades = new Map(), backend = makeBackend()
  const server = createServer((req, res) => {
    const handler = routes.get(new URL(req.url, 'http://localhost').pathname)
    if (!handler) { res.writeHead(404).end(); return }
    void handler(req, res)
  })
  const listening = once(server, 'listening')
  server.listen(0, '127.0.0.1')
  await listening
  const origin = `http://127.0.0.1:${server.address().port}`
  const register = (map, { path, handler }) => {
    assert.equal(map.has(path), false, path)
    map.set(path, handler)
    return () => map.delete(path)
  }
  const webServer = { getOrigin: () => origin, register: r => register(routes, r), registerUpgrade: r => register(upgrades, r) }
  const peer = { principal: { kind: 'fixture-user' }, signal: new AbortController().signal }
  let current = peer
  const connection = { requestRejection: () => undefined, admit: () => ({ peer: current }) }
  // Only the host services, host scope and container boundary are fixtures.
  // T-O-64 apply-level: the four model tools are registered by the plugin and
  // every registration's disposer runs on teardown — no second channel.
  const registeredTools = []
  const disposedTools = []
  const tools = { register(definition) { registeredTools.push(definition); return () => disposedTools.push(definition.name) } }
  const ctx = {
    get: name => ({ webServer, connection, tools })[name],
    effect(start) {
      const produced = start()
      if (!produced?.next) return produced
      const ds = [...produced]
      return async () => { for (const d of ds.reverse()) await d() }
    },
  }
  let dispose
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    try { await dispose?.() } finally { rmSync(root, { recursive: true, force: true }) }
    assert.equal(routes.size, 0)
    assert.equal(upgrades.size, 0)
    assert.deepEqual(disposedTools.sort(), registeredTools.map(t => t.name).sort(), 'T-O-64: unregister on dispose')
  })
  dispose = apply(ctx, { env, backend, clock: () => 0, visibleTo: () => true,
    resolvePrincipal: input => input.peer === peer ? { key: 'fixture-user', operator: true, canSee: true, canUse: true } : resolveOwnerPrincipal(input) })
  assert.deepEqual([...routes.keys()].sort(), BINDING_TABLE.map(r => r.path).sort())
  assert.equal(registeredTools.length, 4, 'T-O-64: four model tools registered')
  assert.deepEqual([...new Set(registeredTools.map(t => t.name))].length, 4)
  assert.deepEqual(disposedTools, [], 'nothing disposed before teardown')
  const version = 'dnls.control/1'
  let serial = 0
  async function http(path, data, expected = 200, paired = true) {
    const res = await fetch(`${origin}/nano-local-sandbox/${path}`, {
      method: data === undefined ? 'GET' : 'POST',
      headers: { ...(paired && { 'X-DNLS-Contract': version }), 'Content-Type': 'application/json' },
      ...(data !== undefined && { body: JSON.stringify(data) }),
    })
    const body = await res.json()
    assert.equal(res.status, expected, `${path}: ${JSON.stringify(body)}`)
    return body
  }
  async function tool(name, args) {
    const { result } = await http('mcp', { jsonrpc: '2.0', id: ++serial, method: 'tools/call',
      params: { name, arguments: args, _meta: { 'dnls/contract': version } } })
    assert.equal(result.isError, false, JSON.stringify(result))
    return result.structuredContent
  }
  const contract = await http('contract', undefined, 200, false)
  assert.equal(contract.contractVersion, version)
  for (const id of ['sandbox.list', 'sandbox.inspect', 'term.session.attach']) assert.ok(contract.capabilities.includes(id))
  const catalog = await http('mcp', { jsonrpc: '2.0', id: ++serial, method: 'tools/list' })
  assert.ok(!catalog.result.tools.some(tool => tool.name === 'sandbox.instance.ensure'))
  const implicit = await http('inspect?sessionId=old', undefined, 400)
  assert.equal(implicit.ok, false)
  assert.equal(backend.calls.length, 0)
  const { profiles } = await tool('sandbox.profile.list', {})
  assert.ok(profiles.some(p => p.id === 'kitesurf' && p.ready))
  const op = await http('lifecycle', { action: 'create', profileId: 'kitesurf', name: 'journey', requestId: 'one' }, 202)
  const { sandboxId, operationId } = op
  const q = `sandboxId=${encodeURIComponent(sandboxId)}`
  let state = op.state
  const deadline = Date.now() + 10000
  while (['accepted', 'running'].includes(state) && Date.now() < deadline) {
    state = (await tool('sandbox.operations', { sandboxId, operationId })).state
  }
  assert.equal(state, 'succeeded')
  assert.equal(backend.count('create'), 1)
  assert.equal((await http('sandboxes')).rows[0].sandboxId, sandboxId)
  const detail = await http(`inspect?${q}`)
  assert.equal(detail.envId, 'dev')
  assert.equal(detail.observedState, 'running')
  // T-O-67: the readonly drivers projection equals the profile manifest's
  // own capabilities.drivers on the same row list/inspect share.
  assert.deepEqual(detail.drivers, ['cdp', 'mcp'])
  assert.deepEqual((await http('sandboxes')).rows[0].drivers, ['cdp', 'mcp'])
  assert.ok(detail.services.some(s => s.published && s.hostPort > 0))
  assert.equal((await tool('sandbox.usage', { sandboxId, window: '24h' })).sandboxId, sandboxId)
  const ref = await tool('term.session.create', { sandboxId, paneId: 'pane', openId: 'gesture' })
  assert.equal(ref.sandboxId, sandboxId)
  assert.ok(ref.terminalId)
  assert.doesNotMatch(JSON.stringify(ref), /attach|url|token|sessionId/i)
  const { terminals } = await tool('term.session.list', { sandboxId })
  assert.equal(terminals[0].address, `dsh-resource://sandbox-terminal/dev/${sandboxId}/${ref.terminalId}`)
  const { attach } = await tool('term.session.attach', { sandboxId, terminalId: ref.terminalId })
  assert.equal(attach.protocol, 'dnt-ws-v2')
  const u = new URL(attach.url)
  assert.equal(u.origin, origin.replace('http:', 'ws:'))
  assert.equal(u.search + u.username + u.password, '')
  assert.ok(upgrades.has(u.pathname))
  assert.equal(backend.calls.filter(([kind, verb]) => kind === 'terminalRpc' && verb === 'create').length, 1)
  // T-O-59: the owner is this machine's stable principal. It may create and
  // attach a terminal of its own generation, and it is still not a wildcard.
  current = { principal: { kind: 'owner' }, signal: new AbortController().signal }
  const ownerRef = await tool('term.session.create', { sandboxId, paneId: 'owner-pane', openId: 'owner-gesture' })
  assert.ok(ownerRef.terminalId)
  assert.notEqual(ownerRef.terminalId, ref.terminalId)
  const owned = await tool('term.session.attach', { sandboxId, terminalId: ownerRef.terminalId })
  assert.equal(owned.attach.protocol, 'dnt-ws-v2')
  assert.ok(owned.attach.url)
  // Another principal's terminal stays out of reach for the same owner key.
  const foreignBefore = backend.count('terminalRpc')
  const foreign = await http('mcp', { jsonrpc: '2.0', id: ++serial, method: 'tools/call',
    params: { name: 'term.session.attach', arguments: { sandboxId, terminalId: ref.terminalId }, _meta: { 'dnls/contract': version } } }, 403)
  assert.equal(foreign.result.isError, true)
  assert.doesNotMatch(JSON.stringify(foreign), /ws:\/\//)
  assert.equal(backend.count('terminalRpc'), foreignBefore)
  // Any other kind still resolves to no principal at all.
  current = { principal: { kind: 'share-viewer' }, signal: new AbortController().signal }
  const before = backend.count('terminalRpc')
  const denied = await http('mcp', { jsonrpc: '2.0', id: ++serial, method: 'tools/call',
    params: { name: 'term.session.attach', arguments: { sandboxId, terminalId: ownerRef.terminalId }, _meta: { 'dnls/contract': version } } }, 403)
  assert.equal(denied.result.isError, true)
  assert.doesNotMatch(JSON.stringify(denied), /ws:\/\//)
  assert.equal(backend.count('terminalRpc'), before)
})
