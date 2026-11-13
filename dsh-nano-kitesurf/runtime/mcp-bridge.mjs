/**
 * One WebSocket client, one `agent-browser mcp` child.
 * Frames are newline-delimited MCP JSON. The child gets AGENT_BROWSER_CDP
 * and therefore attaches to Kitesurf instead of launching Chrome.
 *
 * Security posture: the host publishes this port on 127.0.0.1 only, but the
 * bridge still defends itself — Origin allowlist for browser clients, a
 * connection cap, frame/message size ceilings, an idle timeout, and a
 * complete RFC 6455 control-frame set (continuation / ping / close).
 * Exports the pure pieces for `node --test`; the server starts only when run
 * as the entrypoint.
 */
import { spawn } from 'node:child_process'
import { webcrypto } from 'node:crypto'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.KITESURF_MCP_PORT || 8791)
const CDP = process.env.AGENT_BROWSER_CDP || 'ws://127.0.0.1:8787/devtools/browser'
const MAX_FRAME = Number(process.env.KITESURF_MCP_MAX_FRAME || 1_048_576)
const MAX_MESSAGE = Number(process.env.KITESURF_MCP_MAX_MESSAGE || 1_048_576)
const MAX_CONNS = Number(process.env.KITESURF_MCP_MAX_CONNS || 8)
const IDLE_MS = Number(process.env.KITESURF_MCP_IDLE_MS || 2 * 60 * 60 * 1000)
// Browser-supplied Origin must carry one of these exact hostnames — prefix
// matching would let http://localhost.evil.example pass (S2-3). Non-browser
// clients send no Origin and are allowed. Comma-separated env overrides.
const ALLOWED_HOSTS = (process.env.KITESURF_MCP_ORIGINS || 'localhost,127.0.0.1,[::1]')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)

export async function acceptKey(key) {
  const data = new TextEncoder().encode(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
  const digest = await webcrypto.subtle.digest('SHA-1', data)
  return Buffer.from(digest).toString('base64')
}

/**
 * Browser-supplied Origin must carry an allowlisted hostname, compared
 * exactly — a page at http://localhost.evil.example must NOT pass (DNS
 * rebinding would otherwise CSWSH the bridge). A missing Origin means a
 * non-browser client such as the DSH host agent — allowed.
 */
export function originAllowed(header) {
  if (header == null || header === '' || header === 'null') return true
  try {
    return ALLOWED_HOSTS.includes(new URL(header).hostname.toLowerCase())
  } catch {
    return false
  }
}

export function sendFrame(socket, opcode, payload = Buffer.alloc(0)) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload)
  let header
  if (body.length < 126) {
    header = Buffer.from([0x80 | opcode, body.length])
  } else if (body.length < 65536) {
    header = Buffer.alloc(4)
    header[0] = 0x80 | opcode
    header[1] = 126
    header.writeUInt16BE(body.length, 2)
  } else {
    header = Buffer.alloc(10)
    header[0] = 0x80 | opcode
    header[1] = 127
    header.writeBigUInt64BE(BigInt(body.length), 2)
  }
  socket.write(Buffer.concat([header, body]))
}

export const sendText = (socket, text) => sendFrame(socket, 0x1, text)
const sendClose = (socket, code = 1000) => {
  const body = Buffer.alloc(2)
  body.writeUInt16BE(code)
  sendFrame(socket, 0x8, body)
}
const sendPong = (socket, payload) => sendFrame(socket, 0xA, payload)

/**
 * RFC 6455 decoder. Handles fragmentation (0x0), ping (0x9 → pong), pong,
 * close handshake, and enforces MAX_FRAME per frame and MAX_MESSAGE across
 * fragments. Emits complete messages via onMessage; calls onClose(code)
 * when the connection should end (close frame, protocol violation, oversize).
 */
export function createFrameDecoder({ onMessage, onPing, onClose, maxFrame = MAX_FRAME, maxMessage = MAX_MESSAGE }) {
  let pending = Buffer.alloc(0)
  let fragments = []
  let fragmentedBytes = 0
  let messageOpcode = 0
  let closed = false

  const fail = (code) => { if (!closed) { closed = true; onClose(code) } }

  return (chunk) => {
    if (closed) return
    pending = Buffer.concat([pending, chunk])
    while (pending.length >= 2) {
      const fin = (pending[0] & 0x80) !== 0
      const rsv = pending[0] & 0x70
      const opcode = pending[0] & 0x0f
      const masked = (pending[1] & 0x80) !== 0
      let length = pending[1] & 0x7f
      let offset = 2
      if (rsv !== 0) return fail(1002)                    // no extensions negotiated
      if (length === 126) {
        if (pending.length < 4) return
        length = pending.readUInt16BE(2)
        offset = 4
      } else if (length === 127) {
        if (pending.length < 10) return
        const big = pending.readBigUInt64BE(2)
        if (big > BigInt(maxFrame)) return fail(1009)
        length = Number(big)
        offset = 10
      }
      if (length > maxFrame) return fail(1009)
      const maskLen = masked ? 4 : 0
      if (pending.length < offset + maskLen + length) return
      const mask = masked ? pending.subarray(offset, offset + 4) : null
      const start = offset + maskLen
      const payload = Buffer.from(pending.subarray(start, start + length))
      if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4]
      pending = pending.subarray(start + length)

      if (opcode >= 0x8) {                                // control frames: never fragmented
        if (!fin) return fail(1002)
        if (opcode === 0x8) return fail(1000)             // close → echo close, done
        if (opcode === 0x9) { onPing(payload); continue } // ping → pong
        if (opcode === 0xA) continue                      // pong: nothing owed
        return fail(1002)
      }
      if (opcode === 0x0) {                               // continuation
        if (fragments.length === 0) return fail(1002)
      } else if (opcode === 0x1 || opcode === 0x2) {      // text / binary
        if (fragments.length !== 0) return fail(1002)     // interleaved start
        messageOpcode = opcode                            // remember what this message is
      } else {
        return fail(1002)                                 // reserved opcode
      }
      fragments.push(payload)
      fragmentedBytes += payload.length
      if (fragmentedBytes > maxMessage) return fail(1009)
      if (!fin) continue
      const message = Buffer.concat(fragments)
      const finalOpcode = messageOpcode                   // the START frame's opcode, not 0x0
      fragments = []
      fragmentedBytes = 0
      messageOpcode = 0
      if (finalOpcode === 0x1) onMessage(message.toString('utf8'))
      // binary frames carry no MCP JSON; consumed and dropped
    }
  }
}

function attach(socket, env = process.env) {
  let alive = true
  const teardown = (code = 1000) => {
    if (!alive) return
    alive = false
    try { sendClose(socket, code) } catch { /* gone */ }
    socket.end()
    child.kill()
  }
  const child = spawn('agent-browser', ['mcp'], {
    env: { ...env, AGENT_BROWSER_CDP: env.AGENT_BROWSER_CDP || CDP },
    stdio: ['pipe', 'pipe', 'inherit'],
  })

  let stdout = ''
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString('utf8')
    let nl
    while ((nl = stdout.indexOf('\n')) >= 0) {
      const line = stdout.slice(0, nl).trim()
      stdout = stdout.slice(nl + 1)
      if (line) sendText(socket, line)
    }
  })
  child.on('exit', () => socket.end())
  child.on('error', () => teardown(1011))

  let stdin = ''
  const decode = createFrameDecoder({
    onMessage: (text) => {
      stdin += text
      let nl
      while ((nl = stdin.indexOf('\n')) >= 0) {
        const line = stdin.slice(0, nl)
        stdin = stdin.slice(nl + 1)
        // Backpressure: stop reading the socket until the child drains.
        if (!child.stdin.write(`${line}\n`)) {
          socket.pause()
          child.stdin.once('drain', () => socket.resume())
          return
        }
      }
    },
    onPing: (payload) => { try { sendPong(socket, payload) } catch { /* gone */ } },
    onClose: (code) => teardown(code),
  })
  socket.on('data', decode)
  socket.on('close', () => { alive = false; child.kill() })
  socket.on('error', () => { alive = false; child.kill() })
  socket.setTimeout(IDLE_MS, () => teardown(1001))
}

export function createBridge(port = PORT, env = process.env) {
  let conns = 0
  let accepted = 0
  let rejected = 0
  const startedAt = Date.now()
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: true, mcp: '/mcp', conns, accepted, rejected, uptimeMs: Date.now() - startedAt }))
      return
    }
    res.writeHead(404)
    res.end()
  })

  server.on('upgrade', async (req, socket) => {
    if (req.url !== '/mcp'
        || typeof req.headers['sec-websocket-key'] !== 'string'
        || !originAllowed(req.headers.origin)) {
      rejected += 1
      socket.destroy()
      return
    }
    if (conns >= MAX_CONNS) {
      rejected += 1
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n')
      socket.destroy()
      return
    }
    conns += 1
    accepted += 1
    socket.on('close', () => { conns -= 1 })
    try {
      const accept = await acceptKey(req.headers['sec-websocket-key'])
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
      )
      attach(socket, env)
    } catch (error) {
      // acceptKey/attach threw after we counted the conn — destroy() may not
      // emit 'close' on a socket never fully opened, so release the slot here
      // and also run the attachless teardown (child may not exist yet).
      conns -= 1
      try { socket.destroy() } catch { /* gone */ }
      process.stderr.write(`kitesurf mcp bridge upgrade failed: ${error?.message || error}\n`)
    }
  })

  server.listen(port, '0.0.0.0', () => {
    process.stderr.write(`kitesurf mcp bridge on :${port} conns<=${MAX_CONNS} frame<=${MAX_FRAME}B\n`)
  })
  return server
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  createBridge()
}
