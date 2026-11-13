// Minimal RFC6455 WebSocket server for the dnt data plane.
// Binary frames carry raw PTY bytes; text frames carry JSON control.
// No compression, no fragmentation across >64KB (PTY chunks are small).

import { createHash, randomBytes } from 'node:crypto'

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

export function acceptKey(key) {
  return createHash('sha1').update(key + GUID).digest('base64')
}

/** Complete the HTTP Upgrade handshake. Returns true when accepted. */
export function handshake(req, socket) {
  const key = req.headers['sec-websocket-key']
  if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') {
    socket.destroy()
    return false
  }
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n` +
      '\r\n',
  )
  socket.setNoDelay(true)
  return true
}

/** Encode one server→client frame. */
export function encodeFrame(payload, opcode = 0x02) {
  const len = payload.length
  let header
  if (len < 126) {
    header = Buffer.from([0x80 | opcode, len])
  } else if (len < 0x10000) {
    header = Buffer.alloc(4)
    header[0] = 0x80 | opcode
    header[1] = 126
    header.writeUInt16BE(len, 2)
  } else {
    header = Buffer.alloc(10)
    header[0] = 0x80 | opcode
    header[1] = 127
    header.writeBigUInt64BE(BigInt(len), 2)
  }
  return Buffer.concat([header, payload])
}

export function sendBinary(socket, buf) {
  if (!socket.destroyed) socket.write(encodeFrame(buf, 0x02))
}

export function sendText(socket, obj) {
  if (!socket.destroyed) socket.write(encodeFrame(Buffer.from(JSON.stringify(obj), 'utf8'), 0x01))
}

export function sendClose(socket, code = 1000, reason = '') {
  if (socket.destroyed) return
  const body = Buffer.alloc(2 + Buffer.byteLength(reason))
  body.writeUInt16BE(code, 0)
  body.write(reason, 2)
  try {
    socket.write(encodeFrame(body, 0x08))
  } catch { /* socket racing close */ }
}

export function sendPing(socket) {
  if (!socket.destroyed) socket.write(encodeFrame(randomBytes(4), 0x09))
}

/**
 * Incremental client→server frame parser.
 * onMessage(opcode, payload): opcode 1 text, 2 binary, 8 close, 9 ping, 10 pong.
 */
export class FrameParser {
  constructor(onMessage) {
    this.onMessage = onMessage
    this.buf = Buffer.alloc(0)
    this.frag = null
  }
  feed(chunk) {
    this.buf = Buffer.concat([this.buf, chunk])
    for (;;) {
      const b = this.buf
      if (b.length < 2) return
      const fin = (b[0] & 0x80) !== 0
      const opcode = b[0] & 0x0f
      const masked = (b[1] & 0x80) !== 0
      let len = b[1] & 0x7f
      let off = 2
      if (len === 126) {
        if (b.length < 4) return
        len = b.readUInt16BE(2)
        off = 4
      } else if (len === 127) {
        if (b.length < 10) return
        len = Number(b.readBigUInt64BE(2))
        off = 10
      }
      const maskOff = off
      if (masked) off += 4
      if (b.length < off + len) return
      let payload = b.subarray(off, off + len)
      if (masked) {
        const mask = b.subarray(maskOff, maskOff + 4)
        const un = Buffer.allocUnsafe(len)
        for (let i = 0; i < len; i++) un[i] = payload[i] ^ mask[i & 3]
        payload = un
      } else {
        payload = Buffer.from(payload)
      }
      this.buf = b.subarray(off + len)
      if (opcode === 0x00 && this.frag) {
        this.frag.chunks.push(payload)
        if (fin) {
          const joined = Buffer.concat(this.frag.chunks)
          this.onMessage(this.frag.opcode, joined)
          this.frag = null
        }
        continue
      }
      if ((opcode === 0x01 || opcode === 0x02) && !fin) {
        this.frag = { opcode, chunks: [payload] }
        continue
      }
      this.onMessage(opcode, payload)
    }
  }
}
