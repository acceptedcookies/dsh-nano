// Minimal RFC6455 WebSocket server for the dnt data plane.
// Binary frames carry raw PTY bytes; text frames carry JSON control.
// No compression, no fragmentation across >64KB (PTY chunks are small).

import { createHash, randomBytes } from 'node:crypto'
import { encodeAlign, encodeSequenced } from '../shared/align.js'

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

// ---------------------------------------------------------------------------
// dnt-ws-v2 framed channels (herdr framed.rs model)
//
// Binary frame payload: [channel u32 BE][kind u8][len u32 BE][payload]
// Channels: 0 = terminal data (pty bytes / snapshot), 1 = control JSON.
// Kinds:
//   DATA       0  raw bytes
//   CREDIT     1  u32 BE bytes consumed — flow control
//   RESIZE     2  {cols u16, rows u16}
//   CLOSE      3  channel teardown
//   PING/PONG  4/8
//   FACTS      5  headless attach reports {cols,rows,fg,bg} JSON
//   AUTO_INPUT 6  terminal auto-replies (DA/CPR) — bypass the input gate
//   SNAPSHOT   7  当前屏对齐（序号 + dump）。不是清屏转义。
//   HELD       9  ack: human bytes held behind an agent delivery
// Client→server credit starts at CREDIT_INIT. 信用耗尽不再发清屏快照：
// 多出来的字节留在宿主镜像里，等客户端声明冻结恢复后再对齐一次。
// ---------------------------------------------------------------------------

export const FR_KIND = {
  DATA: 0, CREDIT: 1, RESIZE: 2, CLOSE: 3, PING: 4,
  FACTS: 5, AUTO_INPUT: 6, SNAPSHOT: 7, PONG: 8, HELD: 9,
}
export const CREDIT_INIT = 256 * 1024
export const SNAP_LIMIT = 4 * 1024 * 1024

export function encodeChannel(channel, kind, payload = Buffer.alloc(0)) {
  const head = Buffer.allocUnsafe(9)
  head.writeUInt32BE(channel, 0)
  head.writeUInt8(kind, 4)
  head.writeUInt32BE(payload.length, 5)
  return Buffer.concat([head, payload])
}

/** Parse one framed-channel payload → {channel, kind, payload} or null. */
export function parseChannel(buf) {
  if (!buf || buf.length < 9) return null
  const channel = buf.readUInt32BE(0)
  const kind = buf.readUInt8(4)
  const len = buf.readUInt32BE(5)
  if (buf.length < 9 + len) return null
  return { channel, kind, payload: buf.subarray(9, 9 + len) }
}

/**
 * Per-socket v2 attach state: credit accounting + current-screen align.
 * `pending` = bytes sent since last CREDIT. Crossing credit + SNAP_LIMIT
 * drops the chunk from the wire (the mirror already has it) until `align()`.
 * alignMode prefixes each DATA payload with a u32 seq; the bytes after it
 * are the original PTY chunk.
 */
export class Attach {
  constructor(socket, record) {
    this.socket = socket
    this.record = record
    this.v = 1
    this.credit = CREDIT_INIT
    this.pending = 0
    this.stalled = false
    this.toldStall = false
    this.alignMode = false
  }

  /** Send data honoring credit. Over the limit: stall, do not clear the screen. */
  data(chunk, seq = 0) {
    if (this.v === 1) {
      sendBinary(this.socket, chunk)
      this.pending += chunk.length
      return
    }
    if (this.stalled) return
    const payload = this.alignMode ? Buffer.from(encodeSequenced(seq, chunk)) : chunk
    if (this.pending + payload.length > this.credit + SNAP_LIMIT) {
      // 丢掉这段，但告诉客户端来对齐。只靠定时器的话，短冻结加大输出会一直 stalled。
      this.stalled = true
      if (!this.toldStall) {
        this.toldStall = true
        sendText(this.socket, { type: 'stalled' })
      }
      return
    }
    this.socket.write(encodeFrame(encodeChannel(0, FR_KIND.DATA, payload), 0x02))
    this.pending += payload.length
  }

  /** Consume client credit. A stall is a hole: align once, do not resume raw bytes. */
  onCredit(n) {
    this.credit += n
    this.pending = Math.max(0, this.pending - n)
    if (this.stalled) this.align()
  }

  /**
   * 一次当前屏对齐。载荷是 dump + 序号，不含清屏转义。
   * 调用后恢复直连：序号之后的 DATA 继续逐块发送。
   */
  align() {
    const view = this.record?.alignView?.() ?? {
      seq: this.record?.outSeq ?? 0,
      cols: this.record?.meta?.cols ?? 80,
      rows: this.record?.meta?.rows ?? 24,
      cursorX: 0,
      cursorY: 0,
      text: this.record?.screenText?.(this.record?.meta?.rows ?? 24, 'visible') ?? this.record?.screenText?.(24, 'visible') ?? '',
    }
    const payload = Buffer.from(encodeAlign(view))
    if (!this.socket.destroyed) {
      this.socket.write(encodeFrame(encodeChannel(0, FR_KIND.SNAPSHOT, payload), 0x02))
    }
    this.pending = 0
    this.stalled = false
    this.toldStall = false
  }

  channel(channel, kind, payload) {
    if (!this.socket.destroyed) {
      this.socket.write(encodeFrame(encodeChannel(channel, kind, payload ?? Buffer.alloc(0)), 0x02))
    }
  }
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
