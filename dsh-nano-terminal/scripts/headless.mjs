#!/usr/bin/env node
// Headless dnt-ws-v2 driver (W-P1-6): attaches to a terminal over the framed
// channel without a renderer — reports FACTS (viewport geometry + palette),
// streams DATA to stdout, sends DATA from --send, and honors CREDIT.
// Usage:
//   node scripts/headless.mjs <ws-url> --session <id|name|addr> [--send 'cmd']
//                                [--cols N --rows N] [--duration ms]
// Example:
//   node scripts/headless.mjs ws://localhost:3083/dsh-nano-terminal/stream \
//     --session local/smoke --send 'ls' --duration 2000

import { connect as tcpConnect } from 'node:net'
import { connect as tlsConnect } from 'node:tls'
import { createHash, randomBytes } from 'node:crypto'

const argv = process.argv.slice(2)
const url = new URL(argv[0] ?? '')
const opt = {}
for (let i = 1; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1]

const COLS = Number(opt.cols ?? 120)
const ROWS = Number(opt.rows ?? 40)
const FR = { DATA: 0, CREDIT: 1, RESIZE: 2, CLOSE: 3, FACTS: 5, AUTO_INPUT: 6, SNAPSHOT: 7 }

const isTls = url.protocol === 'wss:' || url.protocol === 'https:'
const connect = isTls
  ? (opts, cb) => tlsConnect({ ...opts, servername: opts.host, rejectUnauthorized: process.env.DNT_INSECURE !== '1' }, cb)
  : tcpConnect

const key = randomBytes(16).toString('base64')
const path = `${url.pathname}${url.search || '?'}`
const sock = connect({ host: url.hostname, port: Number(url.port || (isTls ? 443 : 80)) }, () => {
  sock.write(
    `GET ${path} HTTP/1.1\r\nHost: ${url.host}\r\nUpgrade: websocket\r\n` +
    `Connection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
  )
})

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const expect = createHash('sha1').update(key + GUID).digest('base64')
let buf = Buffer.alloc(0)
let handshook = false

const encWs = (payload, opcode = 0x02) => {
  const mask = randomBytes(4)
  const len = payload.length
  let head
  if (len < 126) head = Buffer.from([0x80 | opcode, 0x80 | len])
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | opcode; head[1] = 0x80 | 126; head.writeUInt16BE(len, 2) }
  else { head = Buffer.alloc(10); head[0] = 0x80 | opcode; head[1] = 0x80 | 127; head.writeBigUInt64BE(BigInt(len), 2) }
  const masked = Buffer.from(payload)
  for (let i = 0; i < masked.length; i++) masked[i] ^= mask[i & 3]
  return Buffer.concat([head, mask, masked])
}
const encChannel = (ch, kind, payload = Buffer.alloc(0)) => {
  const h = Buffer.alloc(9)
  h.writeUInt32BE(ch, 0); h.writeUInt8(kind, 4); h.writeUInt32BE(payload.length, 5)
  return Buffer.concat([h, payload])
}
const sendChan = (ch, kind, payload) => sock.write(encWs(encChannel(ch, kind, payload)))
const sendText = (obj) => sock.write(encWs(Buffer.from(JSON.stringify(obj), 'utf8'), 0x01))

let credit = 0
sock.on('data', (chunk) => {
  buf = Buffer.concat([buf, chunk])
  if (!handshook) {
    const i = buf.indexOf('\r\n\r\n')
    if (i < 0) return
    const head = buf.subarray(0, i).toString('latin1')
    if (!head.includes('101')) { console.error('handshake rejected:', head.split('\r\n')[0]); process.exit(1) }
    buf = buf.subarray(i + 4)
    handshook = true
    sendText({ type: 'open', v: 2, session: opt.session, cols: COLS, rows: ROWS })
    // FACTS: headless viewport — host adopts this geometry
    sendChan(0, FR.FACTS, Buffer.from(JSON.stringify({ cols: COLS, rows: ROWS, fg: 'default', bg: 'default', headless: true }), 'utf8'))
    if (opt.send) {
      sendChan(0, FR.DATA, Buffer.from(`${opt.send}\n`, 'utf8'))
    }
    if (opt.duration) setTimeout(() => { sendChan(0, FR.CLOSE); sock.end(); process.exit(0) }, Number(opt.duration))
  }
  for (;;) {
    if (buf.length < 2) return
    const fin = (buf[0] & 0x80) !== 0
    const opcode = buf[0] & 0x0f
    let len = buf[1] & 0x7f
    let off = 2
    if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4 }
    else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10 }
    if (buf.length < off + len) return
    const payload = buf.subarray(off, off + len)
    buf = buf.subarray(off + len)
    if (!fin) continue
    if (opcode === 0x02) {
      if (payload.length < 9) continue
      const kind = payload.readUInt8(4)
      const plen = payload.readUInt32BE(5)
      const data = payload.subarray(9, 9 + plen)
      if (kind === FR.DATA || kind === FR.SNAPSHOT) {
        process.stdout.write(data)
        credit += data.length
        const c = Buffer.alloc(4)
        c.writeUInt32BE(data.length, 0)
        sendChan(0, FR.CREDIT, c)
      }
    } else if (opcode === 0x01) {
      try {
        const msg = JSON.parse(payload.toString('utf8'))
        if (msg.type === 'ready') process.stderr.write(`[ready ${msg.addr} v${msg.v}]\n`)
        if (msg.type === 'exit') process.stderr.write(`[exit ${msg.outcome ?? ''}]\n`)
      } catch { /* ignore */ }
    }
  }
})
sock.on('error', (e) => { console.error('socket error:', e.message); process.exit(1) })
