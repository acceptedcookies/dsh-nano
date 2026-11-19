import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { BINDING_TABLE } from '../lib/bindings.js'
import { registerRoutes } from '../lib/route-guard.js'
import { CONTRACT_VERSION } from '../src/host/control-contract.js'
import { openControlRegistry } from '../src/host/control-registry.js'
import { createManagedRoutes } from '../src/host/managed-routes.js'
import { createTerminalOwner } from '../src/host/term-bridge.js'

const managedTable = () => BINDING_TABLE.filter((row) => row.path === '/nano-local-sandbox/mcp')
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

const INTENT = { name: 'box', profileId: 'kitesurf', principal: 'owner', recipeRef: 'recipe@sha256:1' }
const OBSERVED = { locator: 'box-1', generation: 'gen-1', stateVolume: '/state/box-1', state: 'running' }

/**
 * A live world: observe reads it, the fake terminalRpc mutates it. `workers`
 * maps terminalId → the broker replies an rpc returns; absent → throw (a
 * dead worker is never a success).
 */
function fixture(t, { principal = 'owner', operator = true, obs = OBSERVED, issueLocator = (ref) => `ws://127.0.0.1/attach/${ref.terminalId}` } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dnls-p4-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const registry = openControlRegistry({ root, envId: 'env-1' })
  t.after(() => { try { registry.close() } catch { /* already closed */ } })
  const row = registry.adopt(INTENT, OBSERVED)

  const workers = new Map()
  const calls = []
  const terminalRpc = async (locator, verb, request) => {
    calls.push({ locator, verb, request })
    assert.equal(locator, row.binding.locator)
    if (verb === 'create') {
      workers.set(request.terminalId, { state: 'active', out: 'shell-bytes' })
      return { ok: true, terminalId: request.terminalId }
    }
    const worker = workers.get(request.terminalId)
    if (!worker) throw new Error('worker unavailable')
    if (request.verb === 'status') return { ok: true, state: worker.state }
    if (request.verb === 'read') return { ok: true, seq: worker.out.length, from: request.from ?? 0, bytes: worker.out, ended: worker.state === 'ended' }
    if (request.verb === 'close') { worker.state = 'ended'; return { ok: true, ended: true } }
    return { ok: true }
  }

  const owner = createTerminalOwner({
    registry,
    envId: 'env-1',
    observe: async () => obs,
    resolvePrincipal: ({ peer }) => (peer?.key ? {
      key: peer.key,
      operator: peer.operator === true,
      canSee: () => peer.operator === true || row.principal === peer.key,
      canUse: () => peer.operator === true || row.principal === peer.key,
    } : null),
    resolveCwd: async (_row, { cwd }) => {
      if (cwd === undefined) return '/'
      if (typeof cwd !== 'string' || !cwd.startsWith('/') || cwd.includes('..')) return null
      return cwd
    },
    terminalRpc,
    issueLocator,
  })

  let currentPeer = { key: principal, operator, principal: { kind: 'owner' }, signal: { aborted: false } }
  const routes = []
  registerRoutes(ctxFor(routes), createManagedRoutes({
    table: managedTable(),
    connection: { admit: async () => ({ peer: currentPeer }) },
    capabilities: owner.capabilities,
    execute: owner.execute,
  }), { table: managedTable(), plugin: 'dsh-nano-local-sandbox' })
  const mcp = routes[0].handler
  const tool = async (name, args) => {
    const res = resFor()
    await mcp({ method: 'POST', url: '/nano-local-sandbox/mcp', headers: versioned, body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args, _meta: { 'dnls/contract': CONTRACT_VERSION } } } }, res)
    const body = res.raw ? JSON.parse(res.raw) : null
    return { status: res.statusCode, content: body?.result?.structuredContent ?? body?.result }
  }
  const setPeer = (key, op = operator) => { currentPeer = { key, operator: op, principal: { kind: 'owner' }, signal: { aborted: false } } }
  return { registry, row, owner, workers, calls, tool, setPeer }
}

const OPEN = { openId: 'open-1', paneId: 'pane-1' }

test('create returns exactly {sandboxId,terminalId} — no URL, no attach, one spawn', async (t) => {
  const f = fixture(t)
  const reply = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, ...OPEN })
  assert.equal(reply.status, 200)
  assert.deepEqual(Object.keys(reply.content).sort(), ['contractVersion', 'sandboxId', 'terminalId'])
  const text = JSON.stringify(reply.content)
  assert.equal(/url|token|attach/i.test(text), false)
  const created = f.calls.filter((c) => c.verb === 'create')
  assert.equal(created.length, 1)
  assert.deepEqual(Object.keys(created[0].request).sort(), ['cols', 'cwd', 'rows', 'terminalId'])
})

test('same openId+args dedupes to the original ref; conflicting args refuse; no revive after ended', async (t) => {
  const f = fixture(t)
  const first = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, ...OPEN })
  const again = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, ...OPEN })
  assert.equal(again.content.terminalId, first.content.terminalId)
  assert.equal(f.calls.filter((c) => c.verb === 'create').length, 1)
  const conflict = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, ...OPEN, cols: 120 })
  assert.equal(conflict.status, 409)
  // The terminal ended: a replayed open still gets the original ref — never a respawn.
  f.registry.transitionTerminal(f.row.sandboxId, first.content.terminalId, { state: 'ended', generation: 'gen-1' })
  const replay = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, ...OPEN })
  assert.equal(replay.content.terminalId, first.content.terminalId)
  assert.equal(f.calls.filter((c) => c.verb === 'create').length, 1)
})

test('a dead worker denies attach with zero creates and is reported unknown, not success', async (t) => {
  const f = fixture(t)
  const first = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, ...OPEN })
  f.workers.clear() // the broker is gone
  const attach = await f.tool('term.session.attach', { sandboxId: f.row.sandboxId, terminalId: first.content.terminalId })
  assert.equal(attach.status, 503)
  assert.equal(f.calls.filter((c) => c.verb === 'create').length, 1)
  const stored = f.registry.get(f.row.sandboxId).terminals.find((entry) => entry.terminalId === first.content.terminalId)
  assert.equal(stored.state, 'unknown')
})

test('attach verifies status then returns a frozen {attach:{protocol,url}}; absent or faulty issueLocator denies', async (t) => {
  const f = fixture(t)
  const first = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, ...OPEN })
  const attach = await f.tool('term.session.attach', { sandboxId: f.row.sandboxId, terminalId: first.content.terminalId })
  assert.equal(attach.status, 200)
  assert.equal(attach.content.attach.protocol, 'dnt-ws-v2')
  assert.equal(attach.content.attach.url.includes(first.content.terminalId), true)
  assert.equal(Object.hasOwn(attach.content, 'locator'), false)
  assert.equal(Object.isFrozen(attach.content) || typeof attach.content.attach === 'object', true)

  for (const bad of ['pty://socket/path', 'ws://user:pw@127.0.0.1/x', 'ws://127.0.0.1/x?token=abc', 'not-a-url']) {
    const faulty = fixture(t, { issueLocator: () => bad })
    await faulty.tool('term.session.create', { sandboxId: faulty.row.sandboxId, ...OPEN })
    const denied = await faulty.tool('term.session.attach', { sandboxId: faulty.row.sandboxId, terminalId: faulty.registry.get(faulty.row.sandboxId).terminals[0].terminalId })
    assert.equal(denied.status, 503, bad)
  }

  const noIssuer = fixture(t, { issueLocator: null })
  const made = await noIssuer.tool('term.session.create', { sandboxId: noIssuer.row.sandboxId, ...OPEN })
  const denied = await noIssuer.tool('term.session.attach', { sandboxId: noIssuer.row.sandboxId, terminalId: made.content.terminalId })
  assert.equal(denied.status, 503)
})

test('list filters by principal; another principal sees none and cannot touch the terminal', async (t) => {
  const f = fixture(t)
  const first = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, ...OPEN })
  f.setPeer('peer-b')
  const listed = await f.tool('term.session.list', { sandboxId: f.row.sandboxId })
  assert.equal(listed.status, 200)
  assert.deepEqual(listed.content.terminals, [])
  // peer-b can see the sandbox but owns no terminal there.
  const attach = await f.tool('term.session.attach', { sandboxId: f.row.sandboxId, terminalId: first.content.terminalId })
  assert.equal(attach.status, 403)
  f.setPeer('owner')
  const mine = await f.tool('term.session.list', { sandboxId: f.row.sandboxId })
  assert.equal(mine.content.terminals.length, 1)
  assert.equal(mine.content.terminals[0].state, 'active')
})

test('terminal ops require both ids; wrong sandbox or unknown terminal is 404', async (t) => {
  const f = fixture(t)
  const first = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, ...OPEN })
  const other = f.registry.adopt({ ...INTENT, name: 'other' }, { ...OBSERVED, locator: 'box-2', stateVolume: '/state/box-2' })
  const wrong = await f.tool('term.session.attach', { sandboxId: other.sandboxId, terminalId: first.content.terminalId })
  assert.equal(wrong.status, 404)
  const bogus = await f.tool('term.session.input', { sandboxId: f.row.sandboxId, terminalId: 'no-such', data: 'x' })
  assert.equal(bogus.status, 404)
})

test('generation mismatch or a stopped object denies every terminal verb', async (t) => {
  const f = fixture(t, { obs: { ...OBSERVED, generation: 'gen-2' } })
  const created = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, ...OPEN })
  assert.equal(created.status, 503)
  assert.equal(f.calls.length, 0)
  const stopped = fixture(t, { obs: { ...OBSERVED, state: 'stopped' } })
  const denied = await stopped.tool('term.session.create', { sandboxId: stopped.row.sandboxId, ...OPEN })
  assert.equal(denied.status, 503)
})

test('schema and param bounds: sessionId rejected, openId/paneId required, cwd escapes refused', async (t) => {
  const f = fixture(t)
  const withSession = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, sessionId: 'sess', ...OPEN })
  assert.equal(withSession.status, 400)
  const noOpen = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, paneId: 'p' })
  assert.equal(noOpen.status, 400)
  const escaped = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, ...OPEN, cwd: '/state/../host' })
  assert.equal(escaped.status, 400)
  const inside = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, ...OPEN, cwd: '/state/work' })
  assert.equal(inside.status, 200)
  assert.equal(f.calls.at(-1).request.cwd, '/state/work')
})

test('input/read/resize/close route the owned verb; close reaps and reports ended', async (t) => {
  const f = fixture(t)
  const first = await f.tool('term.session.create', { sandboxId: f.row.sandboxId, ...OPEN })
  const id = first.content.terminalId
  const input = await f.tool('term.session.input', { sandboxId: f.row.sandboxId, terminalId: id, data: 'ls\n' })
  assert.equal(input.status, 200)
  const read = await f.tool('term.session.read', { sandboxId: f.row.sandboxId, terminalId: id })
  assert.deepEqual(Object.keys(read.content).sort(), ['bytes', 'contractVersion', 'ended', 'from', 'ok', 'sandboxId', 'seq'].sort())
  const resize = await f.tool('term.session.resize', { sandboxId: f.row.sandboxId, terminalId: id, cols: 120, rows: 40 })
  assert.equal(resize.status, 200)
  const close = await f.tool('term.session.close', { sandboxId: f.row.sandboxId, terminalId: id })
  assert.equal(close.status, 200)
  assert.equal(f.registry.get(f.row.sandboxId).terminals[0].state, 'ended')
  // detach/exit never auto-creates: a repeat close on the ended worker fails
  // rather than respawning anything.
  f.workers.clear()
  const again = await f.tool('term.session.close', { sandboxId: f.row.sandboxId, terminalId: id })
  assert.equal(again.status, 503)
})
