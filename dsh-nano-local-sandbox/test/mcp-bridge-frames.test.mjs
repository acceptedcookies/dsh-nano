import assert from 'node:assert/strict'
import test from 'node:test'
import { acceptKey, createFrameDecoder, originAllowed, sendText } from '../profiles/kitesurf/mcp-bridge.mjs'

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
// accepts takeover/release. The write gate itself lives in attach() which needs
// a spawned agent-browser child; the HTTP endpoints need no child, so they are
// the unit-testable surface of the contract.
test('POST /control takeover then release toggles humanHold visible on /control', async () => {
  const { createBridge } = await import('../profiles/kitesurf/mcp-bridge.mjs')
  const port = 19000 + Math.floor(Math.random() * 900)
  const server = createBridge(port, { ...process.env, DNLS_MCP_PORT: String(port) })
  await new Promise((r) => setTimeout(r, 150))
  try {
    const control0 = await fetch(`http://127.0.0.1:${port}/control`).then((r) => r.json())
    assert.equal(control0.control.humanHold.active, false)
    assert.equal(control0.control.lastAction, null)
    // /health is the public face: only the nonrestricted health summary,
    // never the control owner/lastAction detail.
    const health0 = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.json())
    assert.equal(health0.ok, true)
    assert.equal('control' in health0, false)
    assert.equal('calls' in health0, false)

    const take = await fetch(`http://127.0.0.1:${port}/control`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'takeover', owner: 'kitesurf-pane' }),
    }).then((r) => r.json())
    assert.equal(take.ok, true)
    assert.equal(take.tookOver, true)
    assert.equal(take.control.humanHold.active, true)
    assert.equal(take.control.humanHold.owner, 'kitesurf-pane')

    const rel = await fetch(`http://127.0.0.1:${port}/control`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'release' }),
    }).then((r) => r.json())
    assert.equal(rel.ok, true)
    assert.equal(rel.control.humanHold.active, false)

    const bad = await fetch(`http://127.0.0.1:${port}/control`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'nonsense' }),
    }).then((r) => r.json())
    assert.equal(bad.ok, false)
    assert.equal(bad.errorId, 'kitesurf.control.query')

    // Browser-shaped requests (Origin) are refused like /diagnostics.
    const origin = await fetch(`http://127.0.0.1:${port}/control`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
      body: JSON.stringify({ action: 'takeover' }),
    })
    assert.equal(origin.status, 403)

    // GET /control mirrors the state without a body.
    const get = await fetch(`http://127.0.0.1:${port}/control`).then((r) => r.json())
    assert.equal(get.ok, true)
    assert.equal(get.control.humanHold.active, false)
  } finally {
    server.close()
  }
})
