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

/** The host webServer upgrade surface, test-local: exact-path dispatch. */
function upgradeDispatcher() {
  const routes = new Map()
  const server = createServer((req, res) => { res.writeHead(404); res.end() })
  const api = {
    server,
    lastReq: null,
    registerUpgrade({ path, handler }) {
      if (routes.has(path)) throw new Error('duplicate')
      routes.set(path, handler)
      return () => routes.delete(path)
    },
  }
  server.on('upgrade', (req, socket, head) => {
    api.lastReq = req
    let pathname
    try { pathname = new URL(req.url ?? '/', 'http://x').pathname } catch { socket.destroy(); return }
    const route = routes.get(pathname)
    if (!route) return socket.destroy()
    Promise.resolve(route(req, socket, head)).catch(() => socket.destroy())
  })
  return api
}

function frame(kind, payload = Buffer.alloc(0)) {
  const out = Buffer.alloc(9 + payload.length)
  out.writeUInt32BE(0, 0)
  out.writeUInt8(kind, 4)
  out.writeUInt32BE(payload.length, 5)
  payload.copy(out, 9)
  return out
}

function client(ws) {
  const texts = []
  const frames = []
  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      frames.push({ kind: data.readUInt8(4), payload: data.subarray(9) })
    } else texts.push(JSON.parse(data.toString()))
  })
  const opened = new Promise((resolve) => ws.once('open', resolve))
  const until = async (pred, deadline = 8000) => {
    const end = Date.now() + deadline
    while (Date.now() < end) {
      if (pred()) return
      await new Promise((r) => setImmediate(r))
    }
    throw new Error(`client wait timed out texts=${JSON.stringify(texts)} frames=${frames.length}`)
  }
  return { texts, frames, opened, until }
}

/**
 * A fixture world: real registry row + reserved terminal, admission by an
 * x-peer header, scripted broker replies, real HTTP upgrade server.
 */
async function fixture(t, { principal = 'owner', script = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dnls-ws-'))
  const registry = openControlRegistry({ root, envId: 'env-1' })
  const row = registry.adopt(INTENT, OBS)
  const { ref } = registry.reserveTerminal(row.sandboxId, {
    principal, openId: 'open-1', fingerprint: 'fp', generation: OBS.generation,
  })
  registry.transitionTerminal(row.sandboxId, ref.terminalId, { state: 'active', generation: OBS.generation })

  const rpcCalls = []
  const queue = { snapshot: [{ ok: true, seq: 40, cols: 80, rows: 24, cursorX: 3, cursorY: 1, text: 'scr' }], read: [], ...script }
  const terminalRpc = async (locator, verb, request) => {
    if (verb !== 'rpc') throw new Error('unexpected create')
    rpcCalls.push(request)
    const next = queue[request.verb]?.length ? queue[request.verb].shift() : null
    if (next) return typeof next === 'function' ? next(request) : next
    if (request.verb === 'status') return { ok: true, state: 'active' }
    if (request.verb === 'snapshot') return { ok: false, error: 'unaligned' }
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
      key: 'owner',
      operator: true,
      canSee: () => true,
      canUse: () => true,
    }),
    observe: async () => OBS,
    terminalRpc,
    originFor: () => `ws://127.0.0.1:${port}`,
    heartbeatMs: 40,
  })
  const req = { headers: { 'x-peer': principal, host: `127.0.0.1:${port}` } }
  t.after(async () => {
    await stream.dispose()
    await new Promise((resolve) => dispatcher.server.close(resolve))
    registry.close()
    rmSync(root, { recursive: true, force: true })
  })
  return { registry, row, ref, req, stream, rpcCalls, connection, admitted, dispatcher, principal }
}

function connect(url, openMsg) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { 'x-peer': 'owner' } })
    const c = client(ws)
    ws.once('error', reject)
    ws.once('open', () => {
      ws.send(JSON.stringify(openMsg))
      resolve({ ws, c })
    })
  })
}

test('v2 wire: exact open → ready → aligned SNAPSHOT before any DATA, credit-gated output, input/resize/facts/ping', async (t) => {
  const f = await fixture(t, {
    script: {
      read: [
        { ok: true, seq: 48, from: 40, bytes_b64: Buffer.from('ABCDEFGH').toString('base64'), ended: false },
        { ok: true, seq: 48, from: 48, bytes_b64: '', ended: false },
      ],
    },
  })
  const url = await f.stream.issueLocator(f.ref, f.row, { req: f.req })
  assert.match(url, /^ws:\/\/127\.0\.0\.1:\d+\/nano-local-sandbox\/term\//)
  assert.equal(url.includes('?'), false)
  // The issuer admits the IDENTICAL request object — not a synthesized copy.
  assert.equal(f.admitted.length > 0 && f.admitted.every((r) => r === f.req), true)
  const { ws, c } = await connect(url, { type: 'open', v: 2, align: 1, session: f.ref.terminalId })
  await c.until(() => c.texts.some((m) => m.type === 'ready'))
  // Upgrade + session rechecks admit the identical upgrade IncomingMessage.
  const upReq = f.dispatcher.lastReq
  assert.ok(upReq)
  assert.equal(f.admitted.slice(f.admitted.indexOf(upReq)).every((r) => r === upReq), true)
  assert.equal(f.admitted.includes(upReq), true)
  const ready = c.texts.find((m) => m.type === 'ready')
  assert.equal(ready.v, 2)
  assert.equal(ready.align, 1)
  assert.equal(ready.session, f.ref.terminalId)
  await c.until(() => c.frames.some((fr) => fr.kind === 7))
  const snap = c.frames.find((fr) => fr.kind === 7)
  assert.equal(snap.payload.readUInt8(0), 1)
  assert.equal(snap.payload.readUInt32BE(1), 40)
  assert.equal(snap.payload.readUInt16BE(5), 80)
  assert.equal(snap.payload.toString('utf8', 13), 'scr')

  // No DATA may flow before the client grants credit.
  await new Promise((r) => setTimeout(r, 60))
  assert.equal(c.frames.some((fr) => fr.kind === 0), false)
  const credit = Buffer.alloc(4); credit.writeUInt32BE(4, 0)
  ws.send(frame(1, credit))
  await c.until(() => c.frames.some((fr) => fr.kind === 0))
  const data = c.frames.find((fr) => fr.kind === 0)
  assert.equal(data.payload.readUInt32BE(0), 44, 'seq = end offset of credited bytes')
  assert.equal(data.payload.toString('utf8', 4), 'ABCD')
  // Only the credited 4 bytes arrived; the tail waits for more credit.
  assert.equal(f.rpcCalls.some((r) => r.verb === 'read'), true)

  ws.send(frame(0, Buffer.from('in\x00\xff')))            // DATA input
  ws.send(frame(6, Buffer.from('auto')))                 // AUTO_INPUT
  const rz = Buffer.alloc(4); rz.writeUInt16BE(120, 0); rz.writeUInt16BE(40, 2)
  ws.send(frame(2, rz))                                  // RESIZE
  ws.send(frame(5, Buffer.from(JSON.stringify({ cols: 100, rows: 30 })))) // FACTS
  ws.send(frame(4, Buffer.from('pn')))                   // PING
  await c.until(() => c.frames.some((fr) => fr.kind === 8))
  assert.equal(c.frames.find((fr) => fr.kind === 8).payload.toString(), 'pn')
  // Input frames queued behind a busy hop may share one broker call; the
  // bytes still reach the broker exactly once, in wire order.
  const inputBytes = () => Buffer.concat(f.rpcCalls.filter((r) => r.verb === 'input').map((r) => Buffer.from(r.data_b64, 'base64')))
  await c.until(() => inputBytes().equals(Buffer.from('in\x00\xffauto')))
  await c.until(() => f.rpcCalls.filter((r) => r.verb === 'resize').length >= 2)
  const resizes = f.rpcCalls.filter((r) => r.verb === 'resize')
  assert.deepEqual(resizes.map(({ cols, rows }) => [cols, rows]), [[120, 40], [100, 30]])
  ws.send(frame(3))                                      // CLOSE → detach only
  await c.until(() => ws.readyState === 3)
  assert.equal(f.rpcCalls.some((r) => r.verb === 'close'), false, 'detach never kills the PTY')
})

test('v1 / wrong-session / duplicate open are refused before any broker call', async (t) => {
  const f = await fixture(t)
  for (const open of [
    { type: 'open', session: f.ref.terminalId },                    // v1, no v2
    { type: 'open', v: 2, align: 1, session: 'term-other' },        // wrong id
    { type: 'open', v: 1, align: 1, session: f.ref.terminalId },    // v1 number
  ]) {
    const url = await f.stream.issueLocator(f.ref, f.row, { req: f.req })
    const { ws } = await connect(url, open)
    await new Promise((resolve) => ws.once('close', resolve))
  }
  // A binary-first connection is refused too.
  {
    const url = await f.stream.issueLocator(f.ref, f.row, { req: f.req })
    const ws = new WebSocket(url, { headers: { 'x-peer': 'owner' } })
    await new Promise((r) => ws.once('open', r))
    ws.send(frame(0, Buffer.from('x')))
    await new Promise((resolve) => ws.once('close', resolve))
  }
  assert.equal(f.rpcCalls.length, 0, 'no broker call for refused opens')

  // Duplicate open on a valid session is refused.
  const good = new WebSocket(await f.stream.issueLocator(f.ref, f.row, { req: f.req }), { headers: { 'x-peer': 'owner' } })
  const gc = client(good)
  await gc.opened
  good.send(JSON.stringify({ type: 'open', v: 2, align: 1, session: f.ref.terminalId }))
  await gc.until(() => gc.texts.some((m) => m.type === 'ready'))
  good.send(JSON.stringify({ type: 'open', v: 2, align: 1, session: f.ref.terminalId }))
  await new Promise((resolve) => good.once('close', resolve))
})

test('a one-shot locator cannot be reused or guessed; query is refused', async (t) => {
  const f = await fixture(t)
  const url = await f.stream.issueLocator(f.ref, f.row, { req: f.req })
  const { ws, c } = await connect(url, { type: 'open', v: 2, align: 1, session: f.ref.terminalId })
  await c.until(() => c.texts.some((m) => m.type === 'ready'))
  ws.close()
  await new Promise((resolve) => ws.once('close', resolve))
  const again = new WebSocket(url, { headers: { 'x-peer': 'owner' } })
  const failed = new Promise((resolve) => { again.on('error', resolve); again.on('close', () => resolve('closed')) })
  await failed
  const query = new WebSocket(`${url}?x=1`, { headers: { 'x-peer': 'owner' } })
  await new Promise((resolve) => { query.on('error', resolve); query.on('close', () => resolve('closed')) })
})

test('sequence gap realigns: a ring overflow yields a fresh SNAPSHOT, never replay', async (t) => {
  const f = await fixture(t, {
    script: {
      snapshot: [
        { ok: true, seq: 40, cols: 80, rows: 24, cursorX: 0, cursorY: 0, text: 'first' },
        { ok: true, seq: 90, cols: 80, rows: 24, cursorX: 1, cursorY: 0, text: 'second' },
      ],
      read: [
        // from jumped past our seq: bytes were evicted — realign.
        { ok: true, seq: 92, from: 88, bytes_b64: Buffer.from('TAIL').toString('base64'), ended: false },
      ],
    },
  })
  const url = await f.stream.issueLocator(f.ref, f.row, { req: f.req })
  const { ws, c } = await connect(url, { type: 'open', v: 2, align: 1, session: f.ref.terminalId })
  await c.until(() => c.frames.some((fr) => fr.kind === 7))
  const credit = Buffer.alloc(4); credit.writeUInt32BE(1024, 0)
  ws.send(frame(1, credit))
  await c.until(() => c.frames.filter((fr) => fr.kind === 7).length === 2)
  const second = c.frames.filter((fr) => fr.kind === 7)[1]
  assert.equal(second.payload.readUInt32BE(1), 90)
  assert.equal(second.payload.toString('utf8', 13), 'second')
  assert.equal(c.frames.some((fr) => fr.kind === 0), false, 'no raw bytes after an eviction gap')
})

test('typing faster than the broker answers coalesces input instead of overflowing the job queue', async (t) => {
  const slow = async () => { await new Promise((r) => setTimeout(r, 30)); return { ok: true } }
  const f = await fixture(t, { script: { input: Array.from({ length: 64 }, () => slow) } })
  const url = await f.stream.issueLocator(f.ref, f.row, { req: f.req })
  const { ws, c } = await connect(url, { type: 'open', v: 2, align: 1, session: f.ref.terminalId })
  await c.until(() => c.frames.some((fr) => fr.kind === 7))
  const typed = 'echo dnls-io-42 && uname -s && pwd\r'
  for (const ch of typed) ws.send(frame(0, Buffer.from(ch)))
  const inputs = () => f.rpcCalls.filter((r) => r.verb === 'input')
  const bytes = () => Buffer.concat(inputs().map((r) => Buffer.from(r.data_b64, 'base64'))).toString()
  await c.until(() => bytes() === typed)
  assert.equal(ws.readyState, 1, 'a burst of keystrokes is not a policy violation')
  assert.ok(inputs().length < typed.length, `coalesced into ${inputs().length} broker calls`)
  ws.close()
})
