import assert from 'node:assert/strict'
import test from 'node:test'
import { acceptKey, createFrameDecoder, originAllowed, sendText } from '../runtime/mcp-bridge.mjs'

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
