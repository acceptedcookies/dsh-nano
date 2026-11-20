import assert from 'node:assert/strict'
import test from 'node:test'
import net from 'node:net'
import { acceptKey, createFrameDecoder, originAllowed, sendFrame, sendText } from '../profiles/kitesurf/mcp-bridge.mjs'

test('the WebSocket accept key matches RFC 6455', async () => {
  const key = await acceptKey('dGhlIHNhbXBsZSBub25jZQ==')
  assert.equal(key, 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=')
})

test('a missing Origin is allowed; a listed prefix matches any port; others are refused', () => {
  assert.equal(originAllowed(undefined), true)
  assert.equal(originAllowed(''), true)
  assert.equal(originAllowed('null'), true)
  assert.equal(originAllowed('http://localhost:60048'), true)
  assert.equal(originAllowed('http://127.0.0.1:3000'), true)
  assert.equal(originAllowed('http://[::1]:8791'), true)
  assert.equal(originAllowed('https://evil.example'), false)
  // Hostname is compared exactly — a rebinding-style suffix must not pass.
  assert.equal(originAllowed('http://localhost.evil.example'), false)
  assert.equal(originAllowed('not-a-url'), false)
})

function collector(opts = {}) {
  const messages = []
  const pings = []
  const closes = []
  const decode = createFrameDecoder({
    onMessage: (text) => messages.push(text),
    onPing: (payload) => pings.push(payload),
    onClose: (code) => closes.push(code),
    ...opts,
  })
  return { messages, pings, closes, decode }
}

function clientTextFrame(text, fin = true) {
  const body = Buffer.from(text)
  const mask = Buffer.from([1, 2, 3, 4])
  const masked = body.map((byte, index) => byte ^ mask[index % 4])
  const header = Buffer.alloc(6)
  header[0] = (fin ? 0x80 : 0) | 0x1
  header[1] = 0x80 | body.length
  mask.copy(header, 2)
  return Buffer.concat([header, masked])
}

test('a masked text frame decodes to a message', () => {
  const c = collector()
  c.decode(clientTextFrame('{"jsonrpc":"2.0"}'))
  assert.deepEqual(c.messages, ['{"jsonrpc":"2.0"}'])
  assert.deepEqual(c.closes, [])
})

test('fragmented text frames reassemble across chunks', () => {
  const c = collector()
  c.decode(clientTextFrame('hello ', false))
  // Continuation frame: FIN set, opcode 0x0, masked.
  const body = Buffer.from('world')
  const mask = Buffer.from([5, 6, 7, 8])
  const cont = Buffer.concat([
    Buffer.from([0x80, 0x80 | body.length]),
    mask,
    body.map((byte, index) => byte ^ mask[index % 4]),
  ])
  c.decode(cont)
  assert.deepEqual(c.messages, ['hello world'])
  assert.deepEqual(c.closes, [])
})

test('a ping produces a pong callback and a close ends the stream', () => {
  const c = collector()
  const ping = Buffer.from([0x89, 0x82, 1, 2, 3, 4, 1 ^ 1, 2 ^ 2]) // masked ping 'aa'
  c.decode(ping)
  assert.equal(c.pings.length, 1)
  const close = Buffer.from([0x88, 0x82, 9, 9, 9, 9, 9 ^ (0x03), 9 ^ (0xe8)]) // masked close 1000
  c.decode(close)
  assert.deepEqual(c.closes, [1000])
  // After close the decoder is dead.
  c.decode(clientTextFrame('late'))
  assert.deepEqual(c.messages, [])
})

test('an RSV bit is a protocol violation and oversize frames are refused', () => {
  const c = collector()
  c.decode(Buffer.from([0xC1, 0x80, 1, 2, 3, 4])) // RSV1 set, masked, empty payload
  assert.deepEqual(c.closes, [1002])

  const d = collector({ maxFrame: 8 })
  const body = Buffer.alloc(16)
  const header = Buffer.alloc(6)
  header[0] = 0x81
  header[1] = 0x80 | 16
  d.decode(Buffer.concat([header, body]))
  assert.deepEqual(d.closes, [1009])
})

test('sendText writes a FIN text frame', () => {
  const writes = []
  const socket = { write: (buf) => writes.push(buf) }
  sendText(socket, 'ok')
  assert.equal(writes.length, 1)
  assert.equal(writes[0][0] & 0x8f, 0x81)
  assert.equal(writes[0].subarray(2).toString(), 'ok')
})

// HITL (human-in-the-loop): the bridge HTTP face exposes the control state and
// accepts takeover/release — host-class only since T-O-63. The write gate
// itself lives in attach() which needs a spawned agent-browser child; the
// HTTP endpoints need no child, so they are the unit-testable surface of the
// contract. The generation credential is a host→bridge secret: tests mint a
// stand-in, place it where the bridge reads it (DNLS_RELAY_CRED_DIR) and
// assert it never appears in any response body.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'

const mintToken = () => randomBytes(32).toString('base64url')
function credDirOf(token) {
  const dir = mkdtempSync(join(tmpdir(), 'dnls-cred-'))
  writeFileSync(join(dir, 'dnls-relay-credential.json'), JSON.stringify({ v: 1, token }), { mode: 0o400 })
  return dir
}

test('POST /control takeover then release toggles humanHold — host credential required', async () => {
  const { createBridge } = await import('../profiles/kitesurf/mcp-bridge.mjs')
  const port = 19000 + Math.floor(Math.random() * 900)
  const token = mintToken()
  const dir = credDirOf(token)
  const server = createBridge(port, { ...process.env, DNLS_MCP_PORT: String(port), DNLS_RELAY_CRED_DIR: dir })
  await new Promise((r) => setTimeout(r, 150))
  const post = (headers, body) => fetch(`http://127.0.0.1:${port}/control`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  try {
    const control0 = await fetch(`http://127.0.0.1:${port}/control`).then((r) => r.json())
    assert.equal(control0.control.humanHold.active, false)
    assert.equal(control0.control.lastAction, null)
    // T-O-63: controlSnapshot carries relay accounting — agent-class conns
    // only, method-name-only lastMethod.
    assert.deepEqual(control0.control.relay, { conns: 0, lastAt: null, lastMethod: null })
    // /health is the public face: only the nonrestricted health summary,
    // never the control owner/lastAction detail.
    const health0 = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.json())
    assert.equal(health0.ok, true)
    assert.equal('control' in health0, false)
    assert.equal('calls' in health0, false)

    // No credential: 403, body empty. A wrong token is indistinguishable.
    assert.equal((await post({}, { action: 'takeover' })).status, 403)
    assert.equal((await post({ 'x-dnls-relay-credential': mintToken() }, { action: 'takeover' })).status, 403)
    assert.equal((await post({ 'x-dnls-relay-credential': 'short' }, { action: 'takeover' })).status, 403)

    const take = await post({ 'x-dnls-relay-credential': token }, { action: 'takeover', owner: 'kitesurf-pane' }).then((r) => r.json())
    assert.equal(take.ok, true)
    assert.equal(take.tookOver, true)
    assert.equal(take.control.humanHold.active, true)
    assert.equal(take.control.humanHold.owner, 'kitesurf-pane')

    const rel = await post({ 'x-dnls-relay-credential': token }, { action: 'release' }).then((r) => r.json())
    assert.equal(rel.ok, true)
    assert.equal(rel.control.humanHold.active, false)

    const bad = await post({ 'x-dnls-relay-credential': token }, { action: 'nonsense' }).then((r) => r.json())
    assert.equal(bad.ok, false)
    assert.equal(bad.errorId, 'kitesurf.control.query')

    // Browser-shaped requests (Origin) are refused like /diagnostics — even
    // with a valid credential.
    const origin = await fetch(`http://127.0.0.1:${port}/control`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example', 'x-dnls-relay-credential': token },
      body: JSON.stringify({ action: 'takeover' }),
    })
    assert.equal(origin.status, 403)

    // GET /control mirrors the state without a body — and no response body
    // anywhere carries the credential.
    const get = await fetch(`http://127.0.0.1:${port}/control`).then((r) => r.json())
    assert.equal(get.ok, true)
    assert.equal(get.control.humanHold.active, false)
    for (const body of [control0, health0, take, rel, bad, get]) {
      assert.equal(JSON.stringify(body).includes(token), false, 'credential must never appear in a response body')
    }
  } finally {
    server.close()
    rmSync(dir, { recursive: true, force: true })
  }
})

/** Fake agent-browser child: records stdin lines, never produces output. */
function fakeChild(stdinLines = []) {
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(),
    stdin: { write: (line) => { stdinLines.push(line); return true }, once: () => {} },
    kill: () => {},
  })
  return child
}

/** Length-correct masked client frame (the legacy helper caps at 125B). */
function maskedFrame(text) {
  const payload = Buffer.from(text)
  const mask = Buffer.from([9, 8, 7, 6])
  const header = payload.length < 126
    ? Buffer.from([0x81, 0x80 | payload.length])
    : payload.length < 65536
      ? Buffer.from([0x81, 0x80 | 126, payload.length >> 8, payload.length & 0xff])
      : (() => { const b = Buffer.alloc(10); b[0] = 0x81; b[1] = 0x80 | 127; b.writeBigUInt64BE(BigInt(payload.length), 2); return b })()
  const masked = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]))
  return Buffer.concat([header, mask, masked])
}

/** Fake /mcp client socket: sendFrame feeds frames in, messages collects replies. */
function fakeBridgeSocket() {
  const incoming = new PassThrough()
  const emitter = new EventEmitter()
  const messages = []
  const waits = []
  const decode = createFrameDecoder({
    onMessage: (text) => { messages.push(JSON.parse(text)); for (const wait of waits.splice(0)) wait() },
    onPing: () => {},
    onClose: () => {},
  })
  const socket = Object.assign(emitter, {
    write: (chunk) => decode(chunk),
    destroy: () => {},
    setTimeout: () => {},
    sendFrame: (object) => incoming.push(maskedFrame(typeof object === 'string' ? object : JSON.stringify(object))),
    nextMessage: () => (messages.length
      ? Promise.resolve(messages.shift())
      : new Promise((resolve) => waits.push(() => resolve(messages.shift())))),
    messages,
  })
  incoming.on('data', (chunk) => emitter.emit('data', chunk))
  return socket
}

const bridgeStateOf = (control) => ({
  getDiagnostics: () => null,
  getRelayStats: () => ({ conns: 0, lastAt: null, lastMethod: null }),
  stats: () => ({}),
  control,
})

/** Minimal upstream WS endpoint answering CDP calls (duplicated substrate). */
async function fakeUpstream(replies = {}) {
  const seen = []
  const accepted = []
  const server = net.createServer((socket) => {
    accepted.push(socket)
    let httpBuf = Buffer.alloc(0)
    let opened = false
    let decode = null
    socket.on('data', async (chunk) => {
      if (!opened) {
        httpBuf = Buffer.concat([httpBuf, chunk])
        const end = httpBuf.indexOf('\r\n\r\n')
        if (end < 0) return
        const head = httpBuf.subarray(0, end).toString('utf8')
        const key = /sec-websocket-key:\s*(\S+)/i.exec(head)?.[1]
        const accept = await acceptKey(key)
        socket.write(
          'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
        )
        opened = true
        decode = createFrameDecoder({
          onMessage: (text) => {
            const message = JSON.parse(text)
            seen.push(message)
            if (typeof message.id === 'number' || typeof message.id === 'string') {
              const fn = replies[message.method]
              const result = typeof fn === 'function' ? fn(message.params, message) : (fn ?? {})
              sendFrame(socket, 0x1, JSON.stringify({ id: message.id, result }))
            }
          },
          onPing: () => {},
          onClose: () => {},
        })
        const rest = httpBuf.subarray(end + 4)
        if (rest.length) decode(rest)
        return
      }
      decode(chunk)
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    server,
    seen,
    port: server.address().port,
    teardown: () => {
      for (const s of accepted) { try { s.destroy() } catch { /* gone */ } }
      server.close()
    },
  }
}

async function replyFor(sock, id) {
  for (;;) {
    const m = await sock.nextMessage()
    if (m.id === id) return m
  }
}

test('T-O-63 write gate: only a host-class /mcp connection writes during humanHold', async () => {
  const { attach: attachFn, makeControl: makeControlFn } = await import('../profiles/kitesurf/mcp-bridge.mjs')
  assert.equal(typeof attachFn, 'function', 'attach must be exported for the write-gate contract')
  const control = typeof makeControlFn === 'function' ? makeControlFn() : {
    writer: null, owner: null, ownerSince: null, lastWriteAt: null,
    humanHold: { active: false, owner: null, since: null, note: null },
    lastAction: null, lastCallAt: null,
  }
  control.humanHold = { active: true, owner: 'human', since: 't0', note: 'takeover' }
  const state = bridgeStateOf(control)
  const env = { ...process.env, AGENT_BROWSER_CDP: 'ws://127.0.0.1:1/cdp' }

  // Agent-class: self-reporting clientInfo.name === humanHold.owner confers
  // NOTHING (T-O-63) — the write is refused and lastAction records it
  // without moving lastWriteAt/lastCallAt/writer.
  const agentLines = []
  const agentSock = fakeBridgeSocket()
  attachFn(agentSock, env, state, false, () => fakeChild(agentLines))
  agentSock.sendFrame({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { clientInfo: { name: 'human' } } })
  agentSock.sendFrame({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'agent_browser_navigate', arguments: { url: 'https://x.example/' } } })
  const refused = await replyFor(agentSock, 2)
  assert.equal(refused.result.isError, true)
  const refusedBody = JSON.parse(refused.result.content[0].text)
  assert.equal(refusedBody.ok, false)
  assert.equal(refusedBody.errorId, 'kitesurf.control.held')
  assert.equal(control.lastAction.tool, 'agent_browser_navigate')
  assert.equal(control.lastAction.ok, false)
  assert.equal(control.lastWriteAt, null, 'refused write must not move lastWriteAt')
  assert.equal(control.lastCallAt, null, 'refused write must not move lastCallAt')
  assert.equal(control.writer, null)
  assert.equal(agentLines.filter((l) => l.includes('agent_browser_navigate')).length, 0, 'refused write never reaches the child')

  // Agent-class takeover answers the query refusal, never humanHold.
  agentSock.sendFrame({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'sandbox.control', arguments: { action: 'takeover' } } })
  const takeover = await replyFor(agentSock, 3)
  const takeoverBody = JSON.parse(takeover.result.content[0].text)
  assert.equal(takeoverBody.ok, false)
  assert.equal(takeoverBody.errorId, 'kitesurf.control.query')
  assert.equal(control.humanHold.active, true, 'agent takeover must not mutate the hold')

  // Host-class: the same write is admitted and claims the writer lock.
  const hostLines = []
  const hostSock = fakeBridgeSocket()
  attachFn(hostSock, env, state, true, () => fakeChild(hostLines))
  hostSock.sendFrame({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'agent_browser_navigate', arguments: { url: 'https://y.example/' } } })
  await new Promise((r) => setTimeout(r, 30))
  assert.equal(hostLines.filter((l) => l.includes('agent_browser_navigate')).length, 1, 'host-class write reaches the child during the hold')
  assert.equal(control.writer !== null, true)
  assert.equal(control.lastAction.tool, 'agent_browser_navigate')

  // Host-class takeover over /mcp still works for the pane.
  const control2 = typeof makeControlFn === 'function' ? makeControlFn() : { ...control, writer: null, lastAction: null }
  control2.humanHold = { active: false, owner: null, since: null, note: null }
  const state2 = bridgeStateOf(control2)
  const hostSock2 = fakeBridgeSocket()
  attachFn(hostSock2, env, state2, true, () => fakeChild([]))
  hostSock2.sendFrame({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'sandbox.control', arguments: { action: 'takeover' } } })
  const took = await replyFor(hostSock2, 9)
  assert.equal(JSON.parse(took.result.content[0].text).tookOver, true)
})

/** One raw WS upgrade against the real server; resolves the response head. */
function rawUpgrade(port, { protocols } = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      const key = Buffer.from('0123456789abcdef').toString('base64')
      socket.write(
        `GET /cdp HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\n` +
        'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
        `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n` +
        (protocols ? `Sec-WebSocket-Protocol: ${protocols}\r\n` : '') +
        '\r\n',
      )
    })
    let buf = Buffer.alloc(0)
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk])
      const end = buf.indexOf('\r\n\r\n')
      if (end < 0) return
      const head = buf.subarray(0, end).toString('utf8')
      resolve({ socket, head, tail: buf.subarray(end + 4) })
    })
    socket.on('error', reject)
  })
}

// T-O-63 end-to-end classification: the generation credential rides the
// dnls-relay.<token> subprotocol offer (Node WebSocket's only header channel)
// or the dedicated header. Per-handshake compare against the CURRENT file —
// a token from a previous generation is agent-class the moment the file
// changes, and the 101 never echoes the credential back.
test('T-O-63: /cdp handshake classifies host vs agent by the generation credential', async () => {
  const { createBridge } = await import('../profiles/kitesurf/mcp-bridge.mjs')
  const upstream = await fakeUpstream({ 'Target.getTargets': () => ({ targetInfos: [{ targetId: 'P', type: 'page' }] }) })
  const port = 19500 + Math.floor(Math.random() * 400)
  const token1 = mintToken()
  const dir = credDirOf(token1)
  const server = createBridge(port, {
    ...process.env,
    DNLS_MCP_PORT: String(port),
    DNLS_RELAY_CRED_DIR: dir,
    KITESURF_CDP_UPSTREAM: `ws://127.0.0.1:${upstream.port}/devtools/browser`,
  })
  const sockets = []
  const controlGet = () => fetch(`http://127.0.0.1:${port}/control`).then((r) => r.json())
  try {
    await new Promise((r) => setTimeout(r, 150))
    // No credential at all → agent-class: relay.conns counts it.
    const agent = await rawUpgrade(port)
    sockets.push(agent.socket)
    assert.match(agent.head, /^HTTP\/1.1 101/)
    await new Promise((r) => setTimeout(r, 40))
    assert.equal((await controlGet()).control.relay.conns, 1)

    // Current-generation token in the subprotocol offer → host-class: the
    // agent conn count does NOT move, and the 101 carries no protocol echo
    // (the credential is never reflected on the wire).
    const host = await rawUpgrade(port, { protocols: `dnls-relay.${token1}` })
    sockets.push(host.socket)
    assert.match(host.head, /^HTTP\/1.1 101/)
    assert.equal(/sec-websocket-protocol/i.test(host.head), false, 'no subprotocol echo in the 101')
    await new Promise((r) => setTimeout(r, 40))
    assert.equal((await controlGet()).control.relay.conns, 1, 'host-class conns never enter relay.conns')

    // Generation change: the file now holds token2 — token1's handshake is
    // agent-class (per-handshake re-read), token2's stays host-class.
    rmSync(join(dir, 'dnls-relay-credential.json'))
    writeFileSync(join(dir, 'dnls-relay-credential.json'), JSON.stringify({ v: 1, token: mintToken() }), { mode: 0o400 })
    const stale = await rawUpgrade(port, { protocols: `dnls-relay.${token1}` })
    sockets.push(stale.socket)
    await new Promise((r) => setTimeout(r, 40))
    assert.equal((await controlGet()).control.relay.conns, 2, 'stale-generation credential is agent-class')
    const wrong = await rawUpgrade(port, { protocols: 'dnls-relay.not-a-real-token' })
    sockets.push(wrong.socket)
    await new Promise((r) => setTimeout(r, 40))
    assert.equal((await controlGet()).control.relay.conns, 3)
  } finally {
    for (const s of sockets) { try { s.destroy() } catch { /* gone */ } }
    server.close()
    upstream.teardown()
    rmSync(dir, { recursive: true, force: true })
  }
})
