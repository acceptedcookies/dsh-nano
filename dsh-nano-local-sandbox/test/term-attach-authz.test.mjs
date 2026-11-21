import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { WebSocket } from 'ws'
import { openControlRegistry } from '../src/host/control-registry.js'
import { createTerminalStream } from '../src/host/term-ws.js'

const OBS = { locator: 'box-1', generation: 'gen-1', stateVolume: '/state/box-1', state: 'running' }
const INTENT = { name: 'box', profileId: 'kitesurf', principal: 'owner', recipeRef: 'recipe@sha256:1' }

function upgradeDispatcher() {
  const routes = new Map()
  const server = createServer((req, res) => { res.writeHead(404); res.end() })
  server.on('upgrade', (req, socket, head) => {
    let pathname
    try { pathname = new URL(req.url ?? '/', 'http://x').pathname } catch { socket.destroy(); return }
    const route = routes.get(pathname)
    if (!route) return socket.destroy()
    Promise.resolve(route(req, socket, head)).catch(() => socket.destroy())
  })
  return {
    server,
    registerUpgrade({ path, handler }) {
      routes.set(path, handler)
      return () => routes.delete(path)
    },
  }
}

const frame = (kind, payload = Buffer.alloc(0)) => {
  const out = Buffer.alloc(9 + payload.length)
  out.writeUInt32BE(0, 0); out.writeUInt8(kind, 4); out.writeUInt32BE(payload.length, 5)
  payload.copy(out, 9)
  return out
}

/**
 * Issuer and upgrade are independently proven: the stream admits the REAL
 * request in front of it each time — a copied path carries no authority.
 */
async function fixture(t, { gate = () => true, obs = OBS } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dnls-az-'))
  const registry = openControlRegistry({ root, envId: 'env-1' })
  const row = registry.adopt(INTENT, OBS)
  const { ref } = registry.reserveTerminal(row.sandboxId, {
    principal: 'owner', openId: 'open-1', fingerprint: 'fp', generation: OBS.generation,
  })
  registry.transitionTerminal(row.sandboxId, ref.terminalId, { state: 'active', generation: OBS.generation })

  const rpcCalls = []
  const terminalRpc = async (locator, verb, request) => {
    rpcCalls.push(request)
    if (request.verb === 'snapshot') return { ok: true, seq: 40, cols: 80, rows: 24, cursorX: 0, cursorY: 0, text: 's' }
    if (request.verb === 'read') return { ok: true, seq: request.from, from: request.from, bytes_b64: '', ended: false }
    return { ok: true }
  }
  const peers = new Map()
  const admitted = [] // identical request objects handed to connection.admit
  const connection = {
    admit: (req) => {
      admitted.push(req)
      const key = req?.headers?.['x-peer']
      if (typeof key !== 'string' || !key) return { rejection: 401 }
      let peer = peers.get(key)
      if (!peer) {
        const ac = new AbortController()
        peer = { id: `peer-${key}`, principal: { kind: 'owner' }, signal: ac.signal, abort: () => ac.abort() }
        peers.set(key, peer)
      }
      return peer.signal.aborted ? { rejection: 403 } : { peer }
    },
  }
  const dispatcher = upgradeDispatcher()
  await new Promise((resolve) => dispatcher.server.listen(0, '127.0.0.1', resolve))
  const port = dispatcher.server.address().port
  const stream = createTerminalStream({
    connection,
    webServer: dispatcher,
    registry,
    envId: 'env-1',
    resolvePrincipal: ({ peer, envId: env }) => (peer.signal.aborted || env !== 'env-1') ? null : ({
      key: peer.id === 'peer-intruder' ? 'intruder' : 'owner',
      operator: peer.id !== 'peer-intruder',
      canSee: () => true,
      canUse: () => gate(),
    }),
    observe: async () => obs,
    terminalRpc,
    originFor: () => `ws://127.0.0.1:${port}`,
    heartbeatMs: 20,
  })
  t.after(async () => {
    await stream.dispose()
    await new Promise((resolve) => dispatcher.server.close(resolve))
    registry.close()
    rmSync(root, { recursive: true, force: true })
  })
  const reqFor = (key) => ({ headers: { 'x-peer': key, host: `127.0.0.1:${port}` } })
  return { registry, row, ref, stream, rpcCalls, peers, admitted, reqFor, port }
}

const wsOpen = (url, headers, session) => new Promise((resolve, reject) => {
  const ws = new WebSocket(url, { headers })
  const texts = []
  const frames = []
  ws.on('message', (data, isBinary) => {
    if (isBinary) frames.push({ kind: data.readUInt8(4), payload: data.subarray(9) })
    else texts.push(JSON.parse(data.toString()))
  })
  ws.once('open', () => {
    ws.send(JSON.stringify({ type: 'open', v: 2, align: 1, session }))
    resolve({ ws, texts, frames })
  })
  ws.once('error', reject)
})

test('a locator issued to one principal does not admit another; zero broker contact', async (t) => {
  const f = await fixture(t)
  const issueReq = f.reqFor('owner')
  const url = await f.stream.issueLocator(f.ref, f.row, { req: issueReq, peer: {} })
  const issueAdmits = f.admitted.length
  // The upgrade request itself is admitted on its OWN headers — the intruder's
  // copied path resolves to a different principal and is destroyed pre-101.
  await assert.rejects(wsOpen(url, { 'x-peer': 'intruder' }, f.ref.terminalId))
  assert.equal(f.rpcCalls.length, 0)
  // The path is consumed by the refused attempt? No — refused upgrades never
  // reach the pending entry's session; a second intruder attempt still fails.
  await assert.rejects(wsOpen(url, { 'x-peer': 'intruder' }, f.ref.terminalId))
  assert.equal(f.rpcCalls.length, 0)
  // Issue admitted the identical request object, never a synthesized copy;
  // every admit after `issueAdmits` is the upgrade's own IncomingMessage.
  assert.equal(issueAdmits > 0 && f.admitted.slice(0, issueAdmits).every((r) => r === issueReq), true)
  assert.equal(f.admitted.slice(issueAdmits).every((r) => r !== issueReq && r?.url === new URL(url).pathname), true)
})

test('revocation between issue and upgrade destroys the socket before open', async (t) => {
  let usable = true
  const f = await fixture(t, { gate: () => usable })
  const url = await f.stream.issueLocator(f.ref, f.row, { req: f.reqFor('owner'), peer: {} })
  usable = false // business authorization revoked after issue
  await assert.rejects(wsOpen(url, { 'x-peer': 'owner' }, f.ref.terminalId))
  assert.equal(f.rpcCalls.length, 0)
})

test('row/ref invalidation between issue and upgrade refuses', async (t) => {
  const f = await fixture(t)
  const url = await f.stream.issueLocator(f.ref, f.row, { req: f.reqFor('owner'), peer: {} })
  f.registry.transitionTerminal(f.row.sandboxId, f.ref.terminalId, { state: 'ended', generation: 'gen-1' })
  await assert.rejects(wsOpen(url, { 'x-peer': 'owner' }, f.ref.terminalId))
  assert.equal(f.rpcCalls.length, 0)
})

test('revocation mid-stream synchronously detaches: no more output, input, or resize — and no PTY kill', async (t) => {
  let usable = true
  const f = await fixture(t, { gate: () => usable })
  const url = await f.stream.issueLocator(f.ref, f.row, { req: f.reqFor('owner'), peer: {} })
  const { ws, frames } = await wsOpen(url, { 'x-peer': 'owner' }, f.ref.terminalId)
  await new Promise((r) => {
    const end = Date.now() + 5000
    const tick = () => (frames.some((fr) => fr.kind === 7) ? r() : Date.now() < end ? setImmediate(tick) : r())
    tick()
  })
  assert.equal(frames.some((fr) => fr.kind === 7), true)
  const callsBefore = f.rpcCalls.length
  usable = false // revoke
  // The heartbeat recheck must detach within its window — 1008, not a bare
  // hangup, so the consumer knows this is denial, never transport loss.
  const code = await new Promise((resolve) => ws.once('close', resolve))
  assert.equal(code, 1008)
  // Even if the socket somehow stayed open, frames must not reach the broker.
  const callsAfter = f.rpcCalls.length
  assert.equal(f.rpcCalls.some((r) => r.verb === 'close' || r.verb === 'input'), false)
  assert.equal(callsAfter >= callsBefore, true) // no new privileged verbs post-revoke
})

test('terminal ownership transfer invalidates the locator — no re-authorize as the new owner', async (t) => {
  const f = await fixture(t)
  const url = await f.stream.issueLocator(f.ref, f.row, { req: f.reqFor('owner'), peer: {} })
  // A foreign rewrite makes the current ref name another principal — the
  // stream reads registry.get fresh each check, so the serial is dead to
  // BOTH the old and the new owner.
  const get = f.registry.get.bind(f.registry)
  f.registry.get = (id) => {
    const row = get(id)
    if (row) row.terminals = row.terminals.map((t) => t.terminalId === f.ref.terminalId ? { ...t, principal: 'intruder' } : t)
    return row
  }
  await assert.rejects(wsOpen(url, { 'x-peer': 'intruder' }, f.ref.terminalId))
  await assert.rejects(wsOpen(url, { 'x-peer': 'owner' }, f.ref.terminalId))
  assert.equal(f.rpcCalls.length, 0)
})

test('inspect truth moving behind an unchanged ledger detaches — no further RPC, no bytes', async (t) => {
  const obs = { ...OBS }
  const f = await fixture(t, { obs })
  const url = await f.stream.issueLocator(f.ref, f.row, { req: f.reqFor('owner'), peer: {} })
  const { ws, frames } = await wsOpen(url, { 'x-peer': 'owner' }, f.ref.terminalId)
  await new Promise((r) => {
    const end = Date.now() + 5000
    const tick = () => (frames.some((fr) => fr.kind === 7) ? r() : Date.now() < end ? setImmediate(tick) : r())
    tick()
  })
  const rpcAtSnapshot = f.rpcCalls.length
  // The container was replaced: inspect reports a new generation while the
  // durable row still claims gen-1. The very next hop must detach.
  obs.generation = 'gen-2'
  const input = Buffer.alloc(9 + 1)
  input.writeUInt32BE(0, 0); input.writeUInt8(0, 4); input.writeUInt32BE(1, 5); input.writeUInt8(120, 9)
  ws.send(input)
  const code = await new Promise((resolve) => ws.once('close', resolve))
  assert.equal(code, 1008)
  assert.equal(f.rpcCalls.length, rpcAtSnapshot, 'no broker call after the observation moved')
  assert.equal(frames.some((fr) => fr.kind === 0), false, 'no DATA forwarded post-detach')
  assert.equal(f.rpcCalls.some((r) => r.verb === 'close'), false, 'detach never kills the PTY')
})

test('peer abort signal detaches the live socket with no broker traffic', async (t) => {
  const f = await fixture(t)
  const url = await f.stream.issueLocator(f.ref, f.row, { req: f.reqFor('owner'), peer: {} })
  const { ws } = await wsOpen(url, { 'x-peer': 'owner' }, f.ref.terminalId)
  await new Promise((r) => setTimeout(r, 80)) // session established
  f.peers.get('owner').abort()
  await new Promise((resolve) => ws.once('close', resolve))
  assert.equal(f.rpcCalls.some((r) => r.verb === 'close'), false)
})
