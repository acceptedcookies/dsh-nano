import { createHash } from 'node:crypto'
import { createServer } from 'node:net'

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

function acceptKey(key) {
  return createHash('sha1').update(key + GUID).digest('base64')
}

function encodeFrame(payload, opcode = 0x02) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload)
  const len = body.length
  let header
  if (len < 126) header = Buffer.from([0x80 | opcode, len])
  else if (len < 0x10000) {
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
  return Buffer.concat([header, body])
}

function feedFrames(state, chunk, onMessage) {
  state.buf = Buffer.concat([state.buf, chunk])
  for (;;) {
    const b = state.buf
    if (b.length < 2) return
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
      for (let i = 0; i < len; i += 1) un[i] = payload[i] ^ mask[i & 3]
      payload = un
    } else payload = Buffer.from(payload)
    state.buf = b.subarray(off + len)
    onMessage(opcode, payload)
  }
}

/**
 * Loopback WebSocket server. Binary payloads are raw terminal bytes.
 * Text payloads are JSON control. Ping 0x09 is answered with pong 0x0A.
 * Only an upgrade whose request target equals `path` is accepted: the port is
 * loopback but any local process or web page could otherwise attach.
 */
export function listenTermSocket({ path, onBinary, onText }) {
  const sockets = new Set()
  const server = createServer((socket) => {
    let accepted = false
    let header = Buffer.alloc(0)
    const frames = { buf: Buffer.alloc(0) }
    socket.on('data', (chunk) => {
      if (!accepted) {
        header = Buffer.concat([header, chunk])
        const end = header.indexOf('\r\n\r\n')
        if (end < 0) return
        const text = header.subarray(0, end).toString('utf8')
        const key = text.match(/Sec-WebSocket-Key:\s*(\S+)/i)?.[1]
        const target = text.match(/^GET (\S+) HTTP\/1\.1\r?$/m)?.[1]
        if (!key || !/upgrade:\s*websocket/i.test(text) || (path && target !== path)) {
          socket.destroy()
          return
        }
        socket.write(
          'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
        )
        accepted = true
        sockets.add(socket)
        const rest = header.subarray(end + 4)
        header = Buffer.alloc(0)
        if (rest.length) feedFrames(frames, rest, handle)
        return
      }
      feedFrames(frames, chunk, handle)
    })
    function handle(opcode, payload) {
      if (opcode === 0x08) {
        socket.end()
        return
      }
      if (opcode === 0x09) {
        if (!socket.destroyed) socket.write(encodeFrame(payload, 0x0a))
        return
      }
      if (opcode === 0x01) onText?.(payload.toString('utf8'), socket)
      else if (opcode === 0x02) onBinary?.(payload, socket)
    }
    socket.on('close', () => sockets.delete(socket))
    socket.on('error', () => sockets.delete(socket))
  })
  return {
    server,
    sendBinary(payload) {
      const frame = encodeFrame(payload, 0x02)
      for (const socket of sockets) if (!socket.destroyed) socket.write(frame)
    },
    sendText(obj) {
      const frame = encodeFrame(Buffer.from(JSON.stringify(obj)), 0x01)
      for (const socket of sockets) if (!socket.destroyed) socket.write(frame)
    },
    close() {
      for (const socket of sockets) socket.destroy()
      sockets.clear()
      server.close()
      server.unref()
    },
  }
}
