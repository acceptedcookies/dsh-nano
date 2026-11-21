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
import { timingSafeEqual, webcrypto } from 'node:crypto'
import { lstatSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { connect as netConnect } from 'node:net'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.DNLS_MCP_PORT || 8791)
// The agent-browser children used to point at AGENT_BROWSER_CDP verbatim, or
// at whatever default agent-browser picks when it is unset — either way each
// child opened its OWN engine socket, and at this pin every engine connection
// owns a private about:blank page (engine connection.ts:314). Default them to
// this bridge's /cdp relay instead: one upstream socket, one shared page.
const CDP = process.env.AGENT_BROWSER_CDP || `ws://127.0.0.1:${PORT}/cdp`
// Upstream engine socket the relay multiplexes every /cdp client onto.
const CDP_UPSTREAM = process.env.KITESURF_CDP_UPSTREAM || 'ws://127.0.0.1:8787/devtools/browser'
const MAX_FRAME = Number(process.env.DNLS_MCP_MAX_FRAME || 1_048_576)
const MAX_MESSAGE = Number(process.env.DNLS_MCP_MAX_MESSAGE || 1_048_576)
// /mcp and /cdp share this ceiling: the host's own relay socket permanently
// holds one slot, and every agent-browser child takes another — 8 squeezed a
// real workload, so the cap reflects the actual audience.
const MAX_CONNS = Number(process.env.DNLS_MCP_MAX_CONNS || 16)
// 20 minutes, not hours: a quiet but healthy MCP session is minutes, and a
// half-open zombie must not hold a conn slot for hours.
const IDLE_MS = Number(process.env.DNLS_MCP_IDLE_MS || 20 * 60 * 1000)
// Browser-supplied Origin must carry one of these exact hostnames — prefix
// matching would let http://localhost.evil.example pass (S2-3). Non-browser
// clients send no Origin and are allowed. Comma-separated env overrides.
const ALLOWED_HOSTS = (process.env.DNLS_MCP_ORIGINS || 'localhost,127.0.0.1,[::1]')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)

/**
 * Read-only projection of the host-owned dnls.control/1 health document.
 * The writer lives in the root-baked /opt/dnls/public-health.mjs helper —
 * this node-writable file only ever READS the published file and returns
 * the public summary, never the private identity.
 */
const HEALTH_DIR = '/run'
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/

/**
 * Generation-scoped host credential (T-O-63). The DNLS host delivers one
 * random token per container generation over `container exec` (root helper,
 * stdin, env -i — the publishHealth pattern) to a file only the bridge may
 * read. Its relay handshake presents it; a connection that cannot show the
 * CURRENT file's token is agent-class. The token is never emitted on any
 * HTTP/MCP response, ledger, audit line or log — it only proves "this
 * connection came from the DNLS host process" and grants no permission.
 */
const CRED_FILE = 'dnls-relay-credential.json'
const CRED_PREFIX = 'dnls-relay.'
const CRED_HEADER = 'x-dnls-relay-credential'
export const RELAY_TOKEN = /^[A-Za-z0-9_-]{43}$/

/** Read the current generation token, or null. Never logs the value. */
export function readRelayCredential(dir = HEALTH_DIR) {
  let doc = null
  try {
    const path = join(dir, CRED_FILE)
    const st = lstatSync(path)
    // The helper writes node-owned 0400. A looser or symlinked file is not a
    // credential — fail closed to agent-class rather than trusting it.
    if (!st.isFile() || (st.mode & 0o077) !== 0) return null
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) doc = parsed
  } catch { /* absent or unreadable */ }
  return RELAY_TOKEN.test(doc?.token) ? doc.token : null
}

/**
 * The credential a relay handshake presented: the dedicated upgrade header,
 * or a `dnls-relay.<token>` WebSocket subprotocol offer (the only
 * client-agnostic header channel — Node's WebSocket cannot set custom
 * headers). We never echo the offered protocol back, so the 101 response
 * does not repeat the credential.
 */
export function presentedCredential(headers = {}) {
  const direct = headers?.[CRED_HEADER]
  if (typeof direct === 'string' && RELAY_TOKEN.test(direct)) return direct
  const offered = headers?.['sec-websocket-protocol']
  if (typeof offered === 'string') {
    for (const part of offered.split(',')) {
      const token = part.trim()
      if (token.startsWith(CRED_PREFIX) && RELAY_TOKEN.test(token.slice(CRED_PREFIX.length))) {
        return token.slice(CRED_PREFIX.length)
      }
    }
  }
  return null
}

/** Per-handshake compare: only an exact match against the CURRENT file. */
export function isHostConnection(headers, dir = HEALTH_DIR) {
  const presented = presentedCredential(headers)
  const current = readRelayCredential(dir)
  if (!presented || !current) return false
  const a = Buffer.from(presented, 'utf8')
  const b = Buffer.from(current, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * CDP read whitelist for agent-class relay connections while humanHold is
 * active (T-O-63). Page.navigate, Input.*, Runtime.evaluate and every other
 * mutating method are refused with kitesurf.control.held; refusal only
 * happens during a hold.
 */
export function heldReadAllowed(method) {
  if (typeof method !== 'string') return false
  if (/^[A-Z][A-Za-z]*\.(enable|disable)$/.test(method)) return true
  return HELD_READ_METHODS.has(method)
}
const HELD_READ_METHODS = new Set([
  'DOM.getDocument',
  'DOM.querySelector',
  'DOM.querySelectorAll',
  'DOM.describeNode',
  'DOM.getBoxModel',
  'CSS.getComputedStyleForNode',
  'Accessibility.getFullAXTree',
  'Page.captureScreenshot',
  'Target.getTargets',
  'Target.attachToTarget',
])

export function readHealth(dir = HEALTH_DIR) {
  let doc = null
  try {
    const parsed = JSON.parse(readFileSync(join(dir, 'dnls-public-health.json'), 'utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) doc = parsed
  } catch { /* absent or unreadable */ }
  if (!doc) return null
  const { contractVersion, state, health, observedAt } = doc
  if (contractVersion !== 'dnls.control/1' || state !== 'running' || health !== 'unknown' ||
      typeof observedAt !== 'string' || !ISO_TIME.test(observedAt)) return null
  return { contractVersion, state, health, observedAt }
}

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

/** Client→server frames must be masked (RFC 6455 §5.3). Server frames must not be. */
function sendClientFrame(socket, opcode, payload = Buffer.alloc(0)) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload)
  // webcrypto.getRandomValues returns a Uint8Array — no .copy(); wrap it.
  const mask = Buffer.from(webcrypto.getRandomValues(new Uint8Array(4)))
  let header
  if (body.length < 126) {
    header = Buffer.alloc(6)
    header[1] = body.length
  } else if (body.length < 65536) {
    header = Buffer.alloc(8)
    header[1] = 126
    header.writeUInt16BE(body.length, 2)
  } else {
    header = Buffer.alloc(14)
    header[1] = 127
    header.writeBigUInt64BE(BigInt(body.length), 2)
  }
  header[0] = 0x80 | opcode
  header[1] |= 0x80
  mask.copy(header, header.length - 4)
  const masked = Buffer.from(body)
  for (let i = 0; i < masked.length; i++) masked[i] ^= mask[i % 4]
  socket.write(Buffer.concat([header, masked]))
}
const sendClientText = (socket, text) => sendClientFrame(socket, 0x1, text)
const sendClientClose = (socket, code = 1000) => {
  const body = Buffer.alloc(2)
  body.writeUInt16BE(code)
  sendClientFrame(socket, 0x8, body)
}

/**
 * Minimal WebSocket client for the engine's /devtools/browser. The container's
 * node:22 has globalThis.WebSocket, but the relay needs a raw socket that also
 * works on older runtimes, so the handshake + frames stay in one place.
 * @returns {Promise<{socket, onMessage(fn), onClose(fn), send(text), close()}>}
 */
function connectUpstreamWs(wsUrl, { timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl)
    const port = Number(url.port || 80)
    const host = url.hostname
    const key = Buffer.from(webcrypto.getRandomValues(new Uint8Array(16))).toString('base64')
    const path = `${url.pathname || '/'}${url.search || ''}`
    const socket = netConnect({ host, port })
    let opened = false
    let httpBuf = Buffer.alloc(0)
    const listeners = { message: new Set(), close: new Set() }
    const emit = (kind, arg) => { for (const fn of listeners[kind]) try { fn(arg) } catch { /* listener bug */ } }
    const decode = createFrameDecoder({
      onMessage: (text) => emit('message', text),
      onPing: (payload) => { try { sendClientFrame(socket, 0xA, payload) } catch { /* gone */ } },
      onClose: () => { emit('close'); try { socket.destroy() } catch { /* gone */ } },
      maxFrame: 16 * 1024 * 1024,
      maxMessage: 32 * 1024 * 1024,
    })
    const timer = setTimeout(() => {
      if (!opened) { socket.destroy(); reject(new Error('upstream ws handshake timeout')) }
    }, timeoutMs)
    socket.on('data', (chunk) => {
      if (!opened) {
        httpBuf = Buffer.concat([httpBuf, chunk])
        const end = httpBuf.indexOf('\r\n\r\n')
        if (end < 0) return
        const head = httpBuf.subarray(0, end).toString('utf8')
        if (!/^HTTP\/1\.1 101/.test(head)) {
          clearTimeout(timer); socket.destroy(); reject(new Error(`upstream ws rejected: ${head.split('\r\n')[0]}`)); return
        }
        opened = true
        clearTimeout(timer)
        const rest = httpBuf.subarray(end + 4)
        resolve({
          socket,
          onMessage: (fn) => listeners.message.add(fn),
          onClose: (fn) => listeners.close.add(fn),
          send: (text) => sendClientText(socket, text),
          close: () => { try { sendClientClose(socket) } catch { /* gone */ } try { socket.destroy() } catch { /* gone */ } },
        })
        if (rest.length) decode(rest)
        return
      }
      decode(chunk)
    })
    socket.on('error', (error) => {
      clearTimeout(timer)
      if (!opened) reject(error)
      emit('close')
    })
    socket.on('close', () => { clearTimeout(timer); emit('close') })
    socket.write(
      `GET ${path} HTTP/1.1\r\nHost: ${host}:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
    )
  })
}

/**
 * The /cdp relay — the single-upstream answer to "one page, many clients".
 * At the pinned engine, EVERY browser-socket connection gets a private
 * BrowserState and unconditionally creates its own about:blank page, so the
 * host plugin and every agent-browser child used to drive different pages.
 * Here all /cdp clients share ONE upstream connection (and therefore one
 * page). Command ids are namespaced per client (slot << 20) and rewritten on
 * the way out/in; events broadcast to every client (each carries its own
 * sessionId). Target.createTarget('about:blank') is answered locally with
 * the shared page's targetId — the page-creation contract survives while the
 * private page does not.
 */
export function makeCdpRelay({ upstreamUrl = CDP_UPSTREAM, debug = process.env.MCP_BRIDGE_DEBUG, control = null } = {}) {
  const SLOT_SHIFT = 20
  const clients = new Map() // socket -> {slot, klass: 'host'|'agent'}
  let freeSlot = 1
  let upstream = null           // {send, close, alive}
  let upstreamConnect = null    // in-flight Promise
  const shared = { pageTargetId: null }
  // Agent-visible relay accounting (T-O-63): conns counts ONLY agent-class
  // sockets; lastAt/lastMethod stamp the last ADMITTED command. A refused
  // command records control.lastAction but never moves lastAt.
  let agentConns = 0
  let lastAt = null
  let lastMethod = null

  const log = (...args) => { if (debug) try { process.stderr.write(`[cdp-relay] ${args.join(' ')}\n`) } catch {} }

  // Per-Cdp-command timing ring (cap 64): the relay was the only unobserved hop
  // on the pane→engine path. Keyed by the namespaced upstream id so a reply
  // lands the method+ms of its own command; surfaced via stats().cdp.
  const cdpPending = new Map() // namespacedId -> {method, startedMs}
  const cdpTimings = []
  const recordCdp = (method, startedMs, outcome) => {
    cdpTimings.push({ method: String(method || '?').slice(0, 60), ms: Math.max(0, Math.round(performance.now() - startedMs)), outcome, at: new Date().toISOString() })
    if (cdpTimings.length > 64) cdpTimings.shift()
  }
  const cdpSummary = () => {
    const ms = cdpTimings.map((r) => r.ms).sort((a, b) => a - b)
    const at = (p) => (ms.length ? ms[Math.min(ms.length - 1, Math.floor((p / 100) * ms.length))] : 0)
    return { count: cdpTimings.length, p50: at(50), p95: at(95), last: cdpTimings.slice(-8), pending: cdpPending.size }
  }

  const broadcast = (text, except = null) => {
    for (const [socket] of clients) {
      if (socket === except) continue
      try { sendText(socket, text) } catch { /* gone */ }
    }
  }

  const dropClient = (socket, why = '') => {
    const row = clients.get(socket)
    if (!row) return
    clients.delete(socket)
    if (row.klass === 'agent' && agentConns > 0) agentConns -= 1
    log(`dropClient ${why} slot=${row.slot}`)
    try { sendClose(socket) } catch { /* gone */ }
    try { socket.destroy() } catch { /* gone */ }
    // The shared upstream outlives one client — the page is the engine's
    // BrowserState on that socket, and closing it would kill everyone's page.
  }

  const ensureUpstream = async () => {
    if (upstream?.alive) return upstream
    if (upstreamConnect) return upstreamConnect
    upstreamConnect = (async () => {
      const link = await connectUpstreamWs(upstreamUrl)
      const handle = { alive: true, send: link.send, close: link.close }
      // Resolve the shared page once, so Target.createTarget(about:blank) can
      // be answered locally and /diagnostics can report it.
      let seqBase = 0x70000000
      const callUpstream = (method, params = {}, sessionId = null) => new Promise((resolve, reject) => {
        const id = ++seqBase
        const frame = { id, method, params }
        if (sessionId) frame.sessionId = sessionId
        relayInternal.set(id, { resolve, reject })
        link.send(JSON.stringify(frame))
      })
      const relayInternal = new Map()
      link.onMessage((text) => {
        let message
        try { message = JSON.parse(text) } catch { return }
        // Internal calls (relay's own housekeeping) answer first.
        if (typeof message.id === 'number' && relayInternal.has(message.id)) {
          const settle = relayInternal.get(message.id)
          relayInternal.delete(message.id)
          if (message.error) settle.reject(new Error(message.error.message || 'upstream error'))
          else settle.resolve(message.result ?? {})
          return
        }
        // about:blank createTarget is answered locally BEFORE forwarding, so
        // a namespaced upstream reply always belongs to a forwarded command —
        // no dead "pending create" table is needed to swallow replies.
        if (typeof message.id === 'number') {
          // Namespaced response: un-prefix, deliver to its owner only.
          const slot = message.id >> SLOT_SHIFT
          const clientId = message.id & ((1 << SLOT_SHIFT) - 1)
          const pending = cdpPending.get(message.id)
          if (pending) { cdpPending.delete(message.id); recordCdp(pending.method, pending.startedMs, message.error ? 'error' : 'ok') }
          for (const [socket, row] of clients) {
            if (row.slot === slot) {
              try { sendText(socket, JSON.stringify({ ...message, id: clientId })) } catch { /* gone */ }
              break
            }
          }
          return
        }
        if (typeof message.id === 'string' && message.id.startsWith('ks:')) {
          // String ids carry an explicit ks:<slot>:<id> namespace — numeric
          // bit-packing can't hold a string, so the prefix is the only route.
          const sep = message.id.indexOf(':', 3)
          const slot = Number(message.id.slice(3, sep))
          const clientId = message.id.slice(sep + 1)
          const pending = cdpPending.get(message.id)
          if (pending) { cdpPending.delete(message.id); recordCdp(pending.method, pending.startedMs, message.error ? 'error' : 'ok') }
          for (const [socket, row] of clients) {
            if (row.slot === slot) {
              try { sendText(socket, JSON.stringify({ ...message, id: clientId })) } catch { /* gone */ }
              break
            }
          }
          return
        }
        // Events broadcast: sessionId already distinguishes who cares.
        broadcast(text)
      })
      const onDead = () => {
        handle.alive = false
        upstream = null
        shared.pageTargetId = null
        for (const [, settle] of relayInternal) settle.reject(new Error('cdp upstream lost'))
        relayInternal.clear()
        for (const [, pending] of cdpPending) recordCdp(pending.method, pending.startedMs, 'upstream-lost')
        cdpPending.clear()
        // The shared page just died; every client socket is now useless.
        for (const [socket] of [...clients]) dropClient(socket)
      }
      link.onClose(onDead)
      upstream = handle
      // Find the shared page the engine created for this connection.
      try {
        const targets = await callUpstream('Target.getTargets')
        const page = (targets?.targetInfos || []).find((t) => t.type === 'page')
        shared.pageTargetId = page?.targetId || null
        log('upstream ready pageTarget=' + (shared.pageTargetId || 'none'))
      } catch { log('upstream ready, getTargets failed') }
      return handle
    })().finally(() => { upstreamConnect = null })
    return upstreamConnect
  }

  const handle = async (socket, klass = 'agent') => {
    let link
    try { link = await ensureUpstream() } catch (error) {
      log('upstream unavailable:', error?.message || error)
      try { sendClose(socket, 1011) } catch { /* gone */ }
      try { socket.destroy() } catch { /* gone */ }
      return
    }
    // Pick a slot that is NOT in use — a wrapped freeSlot used to hand an
    // occupied slot to a second client, and both would then receive each
    // other's replies. Slots are small positive ints; slot 0 stays reserved
    // because ids < 2^20 encode slot 0 for un-namespaced frames.
    const used = new Set([...clients.values()].map((row) => row.slot))
    let slot = 0
    for (let candidate = 1; candidate <= 2047; candidate += 1) {
      slot = ((freeSlot + candidate - 1) % 2047) + 1
      if (!used.has(slot)) break
      if (candidate === 2047) slot = 0
    }
    freeSlot = slot + 1
    if (!slot) {
      log('no free slot')
      try { sendClose(socket, 1013) } catch { /* gone */ }
      try { socket.destroy() } catch { /* gone */ }
      return
    }
    clients.set(socket, { slot, klass })
    if (klass === 'agent') agentConns += 1
    const decode = createFrameDecoder({
      onMessage: (text) => {
        let message
        try { message = JSON.parse(text) } catch (e) { log('bad json', e?.message); return }
        if (message && typeof message === 'object' && (typeof message.id === 'number' || typeof message.id === 'string') && typeof message.method === 'string') {
          // T-O-63: while a human holds the page, an agent-class connection
          // gets ONLY the read whitelist — every mutating CDP method (must
          // include Page.navigate, Input.*, Runtime.evaluate) is refused with
          // the existing kitesurf.control.held marker. The refused command is
          // recorded on lastAction; lastAt/writer never move and nothing is
          // queued or replayed. Host-class connections are never gated.
          if (klass === 'agent' && control?.humanHold?.active && !heldReadAllowed(message.method)) {
            if (control) control.lastAction = { tool: String(message.method).slice(0, 80), owner: 'agent', at: new Date().toISOString(), ok: false }
            sendText(socket, JSON.stringify({
              id: message.id,
              error: { code: -32000, message: 'kitesurf.control.held', data: { errorId: 'kitesurf.control.held' } },
            }))
            return
          }
          // about:blank creation is the engine's per-connection page contract;
          // answer it with the shared page so a client's own blank never
          // exists. Any OTHER createTarget is a real intent and forwards.
          const isBlankCreate = message.method === 'Target.createTarget'
            && (!message.params?.url || message.params.url === 'about:blank')
          if (isBlankCreate && shared.pageTargetId) {
            sendText(socket, JSON.stringify({ id: message.id, result: { targetId: shared.pageTargetId } }))
            return
          }
          // Admitted: stamp lastAt/lastMethod (method name only — params and
          // results never enter the ledger).
          lastAt = new Date().toISOString()
          lastMethod = String(message.method).slice(0, 80)
          if (typeof message.id === 'number') {
            message.id = (slot << SLOT_SHIFT) | (message.id & ((1 << SLOT_SHIFT) - 1))
            cdpPending.set(message.id, { method: message.method, startedMs: performance.now() })
            text = JSON.stringify(message)
          } else {
            // String ids must be namespaced too: an unprefixed string reply is
            // indistinguishable from an event and would broadcast to every
            // client, cross-wiring whoever happens to poll first.
            message.id = `ks:${slot}:${message.id}`
            cdpPending.set(message.id, { method: message.method, startedMs: performance.now() })
            text = JSON.stringify(message)
          }
        }
        try { link.send(text) } catch (e) { log('send failed', e?.message); dropClient(socket, 'send-fail') }
      },
      onPing: (payload) => { try { sendPong(socket, payload) } catch { /* gone */ } },
      onClose: (code) => dropClient(socket, `decoder-close-${code}`),
      maxFrame: MAX_FRAME,
      maxMessage: MAX_MESSAGE,
    })
    socket.on('data', decode)
    socket.on('close', () => dropClient(socket, 'sock-close'))
    socket.on('error', (e) => dropClient(socket, `sock-error-${e?.code||''}`))
    socket.setTimeout(IDLE_MS, () => dropClient(socket, 'idle'))
  }

  return { handle, clients, shared, agentStats: () => ({ conns: agentConns, lastAt, lastMethod }), stats: () => ({ clients: clients.size, agentConns, upstreamAlive: upstream?.alive === true, pageTargetId: shared.pageTargetId, cdpCalls: cdpSummary() }) }
}

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

/**
 * Kitesurf-native MCP tools. The bridge is a byte pipe to `agent-browser mcp`,
 * whose 33 core tools know nothing about the host plugin's execution state.
 * Snapshot-backed tools once read a host-pushed diagnostics POST; that
 * channel is gone (POST /diagnostics is a hard 403), so they answer the
 * stale error honestly rather than fabricating an empty success.
 */
const KITESURF_TOOLS = [
  {
    name: 'sandbox.diagnostics',
    description: 'One-shot Kitesurf plugin diagnostics: engine status, phase, targets, settings, console tail, operation trace, errorId catalogue and generated next-step hints. Call this FIRST when anything fails.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'sandbox.console',
    description: 'Recent page console/error/exception/network/navigation events captured over the plugin CDP socket.Levels: log,info,warn,error,exception,network,navigation.',
    inputSchema: {
      type: 'object',
      properties: {
        level: { type: 'string', description: 'Comma-separated levels, e.g. "error,exception"' },
        limit: { type: 'number', description: '1..250, default 50' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'sandbox.operations',
    description: 'Recent /nano-local-sandbox/* route calls with status, errorId, incidentId, durationMs and a whitelisted input summary. Use errorsOnly=true to see only failures.',
    inputSchema: {
      type: 'object',
      properties: {
        errorsOnly: { type: 'boolean' },
        limit: { type: 'number', description: '1..200, default 50' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'sandbox.error_catalog',
    description: 'The single source of truth: errorId → HTTP status → cause → next command. Use it to interpret any kitesurf.* errorId instead of guessing.',
    inputSchema: {
      type: 'object',
      properties: { errorId: { type: 'string', description: 'Optional: return only matching ids' } },
      additionalProperties: false,
    },
  },
  {
    name: 'sandbox.targets',
    description: 'Engine CDP Target.getTargets result: page target ids/urls and which page the plugin socket is attached to. Use when the pane and the API disagree.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'sandbox.history',
    description: 'Browse history for the Kitesurf pane: the newest 30 visits with url, ISO time and visit count, plus the total stored. Backed by the plugin durable store (the Kitesurf workerd exposes no D1/KV binding). Mutations go through the host: DELETE /nano-local-sandbox/browse-history?id=… or POST {clear:true}.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'sandbox.dom',
    description: 'Last captured document: url, byte size and the first 4000 characters of documentElement.outerHTML. Use to confirm what the engine is actually rendering when the pane looks wrong.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'sandbox.elements',
    description: 'Elements panel data from the Kitesurf DOM/CSS domains: the last DOM tree (up to 40 nodes with tag/id/class/child count), the selector queried, and how many computed properties were returned. Call GET /nano-local-sandbox/elements?selector=… on the host for styles of a specific node.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'sandbox.snapshot',
    description: 'a11y-lite snapshot: the last semantic tree + @N element-ref table the host pushed. Refs (@1..@N) resolve via GET /nano-local-sandbox/refs?ref=@N or are accepted directly in wait/pick/evaluate/edit selector fields on the host. This is the shared language between a human pick and an agent action. For a live re-walk call GET /nano-local-sandbox/snapshot on the authenticated host.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'sandbox.control',
    description: 'Page control/ownership state: one MCP writer moves the page at a time; status shows which MCP writer holds it (owner client name, since when, last write). One page is shared by a human and agents; a second MCP writer is refused kitesurf.control.busy rather than tearing navigation. The host pane writes over REST without this lock, so a human action is never blocked. action: status|claim|release — claim to take the page, release to free it.',
    inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['status', 'claim', 'release', 'takeover'] } }, additionalProperties: false },
  },
  {
    name: 'sandbox.selftest',
    description: 'One verdict over every layer: plugin build, engine identity, container state, published port loopback, MCP bridge counters, CDP targets, DOM availability, route table and phase consistency. Use after any restart or container change.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'sandbox.network',
    description: 'Network waterfall from the Kitesurf CDP session: method, url, status, mimeType, bytes and duration for every request. failedOnly=true shows 4xx/5xx and transport failures only.',
    inputSchema: {
      type: 'object',
      properties: {
        failedOnly: { type: 'boolean' },
        limit: { type: 'number', description: '1..200, default 100' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'sandbox.ports',
    description: 'Port truth: what the profile configured, what the engine actually uses, what the container published, and whether each host port is free (e.g. 8787 held by Cursor while the engine runs on 8798). Read this FIRST for any container/bootstrap failure.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'sandbox.recovery_plan',
    description: 'Ordered recovery steps with the exact HTTP call for each, derived from the live snapshot (port conflict, engine down, phase mismatch, container missing). Returns commands to run through the authenticated host session.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'sandbox.bridge_health',
    description: 'MCP bridge public health: the host-owned dnls.control/1 summary (state, health, observedAt) or null until the owner publishes.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
]

function toolResult(id, data) {
  const text = JSON.stringify(data)
  return {
    jsonrpc: '2.0', id,
    result: {
      content: [{ type: 'text', text }],
      structuredContent: data,
      // MCP tools/call marks business failures isError:true so a client/agent
      // doesn't read an {ok:false} payload as a normal result. The bridge's
      // three refusal paths (busy / held / claim-refused) all answer {ok:false}
      // — surface that honestly to the model, not just in the text body.
      isError: data?.ok === false ? true : undefined,
    },
  }
}

function toolError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

/**
 * Answer a kitesurf_* tools/call without touching the agent-browser child.
 * `self` is {connId, clientName} for the calling connection — needed so
 * kitesurf_control can bind release/claim to the actual owner, not a guess.
 */
function answerNativeTool(name, args, bridgeState, self = {}) {
  const snap = bridgeState.getDiagnostics()
  if (name === 'sandbox.bridge_health') {
    const health = bridgeState.getHealth()
    return { ok: true, health, observedAt: health?.observedAt ?? null }
  }
  if (name === 'sandbox.control') {
    // Answered BEFORE the diagnostics-stale early return: the write gate and
    // takeover status are bridge-local state, never snapshot-backed (T-O-63
    // requires an agent takeover refusal to be kitesurf.control.query).
    const c = bridgeState.control || {}
    const me = self.connId || null
    const action = typeof args.action === 'string' ? args.action.toLowerCase() : 'status'
    const state = () => ({
      ok: true,
      ...controlSnapshot(c, bridgeState.getRelayStats),
      mine: me != null && c.writer === me,
      hint: 'one MCP writer moves the page at a time; a second MCP writer gets kitesurf.control.busy. release only frees a lock you hold. humanHold.active means a human takeover refuses all MCP writes. The host pane is exempt: its REST writes are human actions.',
    })
    if (action === 'status') return state()
    if (action === 'claim') {
      // state() returns ok:true — spread it FIRST so the refusal's ok:false
      // and errorId survive; `...state()` after `ok:false` silently flipped
      // busy/held answers to {ok:true, errorId:busy} (self-contradicting).
      // T-O-63: during a hold only a host-class connection (relay credential
      // at handshake) may claim — a self-declared clientInfo.name is no
      // exemption, so the old `clientName === humanHold.owner` path is gone.
      if (c.humanHold?.active && !self.isHost) {
        return { ...state(), ok: false, errorId: 'kitesurf.control.held', error: `a human (${c.humanHold.owner}) holds the page via takeover` }
      }
      if (c.writer !== null && c.writer !== me) {
        return { ...state(), ok: false, errorId: 'kitesurf.control.busy', error: `another writer (${c.owner || 'unknown'}) holds the page` }
      }
      c.writer = me
      c.owner = self.clientName || c.owner || 'agent'
      c.ownerSince = c.ownerSince || new Date().toISOString()
      return state()
    }
    if (action === 'takeover') {
      // T-O-63: takeover is host-class only. An agent-class caller (no
      // generation credential at handshake) gets the query refusal — the
      // self-reported clientInfo.name confers nothing.
      if (!self.isHost) {
        return { ...state(), ok: false, errorId: 'kitesurf.control.query', error: 'takeover is host-class only; the host pane drives it over POST /control' }
      }
      c.humanHold = { active: true, owner: self.clientName || 'human', since: new Date().toISOString(), note: 'mcp-takeover' }
      c.writer = null; c.owner = null; c.ownerSince = null
      return { ok: true, tookOver: true, ...state() }
    }
    if (action === 'release') {
      if (c.writer === me) { c.writer = null; c.owner = null; c.ownerSince = null }
      return { ok: true, released: c.writer !== me, ...state() }
    }
    return { ...state(), ok: false, errorId: 'kitesurf.control.query', error: `unknown action ${action}; use status|claim|release|takeover` }
  }
  if (!snap) {
    return { ok: false, errorId: 'kitesurf.diag.stale', error: 'no diagnostics snapshot is available on this bridge', hint: 'GET /nano-local-sandbox/diagnostics on the authenticated host' }
  }
  if (name === 'sandbox.diagnostics') return snap
  if (name === 'sandbox.console') {
    const levels = typeof args.level === 'string' ? args.level.split(',').map((s) => s.trim()).filter(Boolean) : null
    const limit = Math.max(1, Math.min(Number(args.limit) || 50, 250))
    const entries = (snap.console?.entries || []).filter((e) => !levels || levels.includes(e.level)).slice(-limit)
    return { ok: true, entries, total: snap.console?.total ?? entries.length, counts: snap.console?.counts || {} }
  }
  if (name === 'sandbox.operations') {
    const errorsOnly = args.errorsOnly === true
    const limit = Math.max(1, Math.min(Number(args.limit) || 50, 200))
    const entries = (snap.operations?.entries || []).filter((e) => !errorsOnly || !e.ok).slice(-limit)
    return { ok: true, entries, total: snap.operations?.total ?? entries.length, dropped: snap.operations?.dropped ?? 0 }
  }
  if (name === 'sandbox.error_catalog') {
    const all = snap.observability?.errorCatalog || []
    const filter = typeof args.errorId === 'string' ? args.errorId : null
    return { ok: true, entries: filter ? all.filter((r) => r.errorId.includes(filter)) : all, total: all.length }
  }
  if (name === 'sandbox.targets') return { ok: true, ...(snap.engine?.targets || { count: 0, targets: [] }), targetsError: snap.engine?.targetsError || null }
  if (name === 'sandbox.history') {
    const h = snap.history || null
    if (!h) return { ok: false, errorId: 'kitesurf.history.stale', error: 'no history snapshot yet', hint: 'open a page on the host, then retry' }
    return { ok: true, total: h.total, entries: h.entries }
  }
  if (name === 'sandbox.dom') {
    const dom = snap.dom || null
    if (!dom) return { ok: false, errorId: 'kitesurf.dom.stale', error: 'no DOM captured yet', hint: 'run GET /nano-local-sandbox/dom on the host, then retry' }
    return { ok: true, ...dom }
  }
  if (name === 'sandbox.elements') {
    const el = snap.elements || null
    if (!el) return { ok: false, errorId: 'kitesurf.elements.stale', error: 'no elements snapshot yet', hint: 'run GET /nano-local-sandbox/elements on the host, then retry' }
    return { ok: true, ...el }
  }
  if (name === 'sandbox.snapshot') {
    const s = snap.snapshot || null
    if (!s) return { ok: false, errorId: 'kitesurf.diag.stale', error: 'no a11y snapshot pushed yet', hint: 'call GET /nano-local-sandbox/snapshot on the authenticated host to build the ref table, then retry' }
    return { ok: true, ...s, liveSnapshot: 'GET /nano-local-sandbox/snapshot', resolveRef: 'GET /nano-local-sandbox/refs?ref=@N' }
  }
  if (name === 'sandbox.selftest') {
    const st = snap.selftest || null
    if (!st) return { ok: false, errorId: 'kitesurf.selftest.stale', error: 'no self-test has run yet', hint: 'run GET /nano-local-sandbox/selftest on the authenticated host, then retry' }
    return { ok: true, ...st, ageMs: Date.now() - Date.parse(st.at) }
  }
  if (name === 'sandbox.network') {
    const limit = Math.max(1, Math.min(Number(args.limit) || 100, 200))
    const entries = (snap.network?.entries || [])
      .filter((r) => args.failedOnly !== true || r.failed || (r.status && r.status >= 400))
      .slice(-limit)
    const failed = (snap.network?.entries || []).filter((r) => r.failed || (r.status && r.status >= 400)).length
    return { ok: true, entries, total: snap.network?.total ?? entries.length, failed }
  }
  if (name === 'sandbox.ports') {
    const ports = snap.ports || null
    const hint = []
    if (ports?.ports?.engine && ports.ports.engine.free === false && ports.effective?.httpBase) {
      hint.push(`发布端口 ${ports.effective?.httpBase} 被占用或不可用；检查容器端口映射`)
    }
    if (ports?.lastRepair) hint.push(`最近一次端口修复：${ports.lastRepair.reason}（${JSON.stringify(ports.lastRepair.from)} → ${JSON.stringify(ports.lastRepair.to)}）`)
    if (ports?.container?.state && ports.container.state !== 'running') hint.push(`容器状态 ${ports.container.state}，需要 POST /nano-local-sandbox/recover 或 /lifecycle resume`)
    return { ok: true, ...(ports || { error: 'no port snapshot yet' }), hints: hint }
  }
  if (name === 'sandbox.recovery_plan') {
    const phase = snap.plugin?.phase || snap.engine?.lifecycle?.phase || 'unknown'
    const alive = snap.engine?.engineAlive === true
    const steps = []
    if (!alive) steps.push({ order: 1, action: 'suspend (only if phase=running)', call: 'POST /nano-local-sandbox/lifecycle {"action":"suspend"}' })
    if (!alive) steps.push({ order: 2, action: 'resume / start engine (auto-repairs a busy port)', call: 'POST /nano-local-sandbox/lifecycle {"action":"resume"}' })
    if (!alive) steps.push({ order: 3, action: 'one-shot self-heal + port report', call: 'POST /nano-local-sandbox/recover {}' })
    steps.push({ order: steps.length + 1, action: 'verify', call: 'GET /nano-local-sandbox/ports' })
    steps.push({ order: steps.length + 1, action: 'if a port is busy, free it or change the profile instance hostPorts, then restart the host', call: 'profile instance.hostPorts in profiles/kitesurf/profile.yaml' })
    return { ok: true, phase, engineAlive: alive, steps, notes: 'lifecycle.state (409) means the requested action does not match the current phase; a busy host port means another process holds it and the existing container is preserved.' }
  }
  return { ok: false, errorId: 'kitesurf.tool.unknown', error: `unknown native tool ${name}` }
}

/**
 * Write-class detection. Reads (snapshot, screenshot, find, get_*, wait_for_*,
 * console, storage_get, cookies_get, state_list, …) always pass through. A
 * write is anything that can move the page, its inputs, or its stores —
 * including eval/exec, which the engine cannot prove read-only. This is the
 * contract that lets ONE page be shared by a human and an agent without them
 * tearing each other's navigation apart.
 */
const WRITE_RE = /agent_browser_(click|dblclick|fill|type|press|hover|select|check|uncheck|drag|scroll|navigate|navigate_back|navigate_forward|reload|open|back|forward|eval|exec|upload|set_|auth_|storage_set|storage_clear|cookies_set|cookies_delete|state_save|state_load|state_clear|emulate|geolocation|network_|wait_for_download|download|record|screenshot_annotate|annotate|tab_|keyboard|mouse|form|submit|paste|insert|delete|move|resize|bring|focus|highlight|launch|connect|disconnect|session|context_|page_|frame_|route|intercept|mock|throttle|offline)/

function isWriteCall(name) {
  return typeof name === 'string' && (name.startsWith('sandbox.interact') || WRITE_RE.test(name))
}

/**
 * The bridge-wide control gate, shared across every attached connection. Two
 * agents (or a human + agent) may hold the same engine; only ONE writer moves
 * the page at a time. A busy write gets kitesurf.control.busy instead of a
 * torn navigation — same ownership model ego's TaskSpace enforces.
 */
export function makeControl() {
  return {
    writer: null,        // connId currently holding the write lock
    owner: null,         // clientInfo.name of the last writer ('agent'|…)
    ownerSince: null,
    lastWriteAt: null,
    // HITL (human-in-the-loop): a sticky human override, independent of any
    // socket lifetime. While active every MCP write is refused with
    // kitesurf.control.held — the pane's own host-side writes bypass this
    // bridge, so the human keeps full control. Set/cleared only via
    // POST /control {action:takeover|release} or sandbox.control takeover.
    humanHold: { active: false, owner: null, since: null, note: null },
    // Last admitted write tool call, for the pane's "Clicking element…"
    // feedback. Updated on admission; `ok` lands when the child answers.
    lastAction: null,    // {tool, owner, at, ok?}
    lastCallAt: null,    // any tools/call — liveness for the control badge
  }
}

function controlSnapshot(c, relay = null) {
  const relayStats = typeof relay === 'function' ? relay() : { conns: 0, lastAt: null, lastMethod: null }
  return {
    writer: c.writer != null,
    owner: c.owner ?? null,
    ownerSince: c.ownerSince ?? null,
    lastWriteAt: c.lastWriteAt ?? null,
    humanHold: c.humanHold ? { ...c.humanHold } : { active: false, owner: null, since: null, note: null },
    lastAction: c.lastAction ? { ...c.lastAction } : null,
    lastCallAt: c.lastCallAt ?? null,
    // T-O-63: relay-facing ledger — conns counts agent-class /cdp sockets
    // only; lastAt/lastMethod name the last ADMITTED relay command (method
    // name only, never params).
    relay: { conns: relayStats?.conns ?? 0, lastAt: relayStats?.lastAt ?? null, lastMethod: relayStats?.lastMethod ?? null },
  }
}

export function attach(socket, env = process.env, bridgeState = { getDiagnostics: () => null, stats: () => ({}), control: makeControl() }, isHost = false, spawnFn = spawn) {
  let alive = true
  const teardown = (code = 1000) => {
    if (!alive) return
    alive = false
    try { sendClose(socket, code) } catch { /* gone */ }
    // Destroy, not just end(): on a half-open socket (client died mid-frame)
    // end() can stall and 'close' never emits — destroy always releases it.
    try { socket.destroy() } catch { /* gone */ }
    child.kill()
  }
  const child = spawnFn('agent-browser', ['mcp'], {
    env: { ...env, AGENT_BROWSER_CDP: env.AGENT_BROWSER_CDP || CDP },
    stdio: ['pipe', 'pipe', 'inherit'],
  })

  const connId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  let clientName = 'agent'
  // in-flight write-class call ids, so a dropped socket frees the gate even
  // if the child never answers.
  const pendingWrites = new Set()
  // Per-call timing: the bridge was the chain's only unobserved hop. Every
  // tools/call (native or forwarded) lands in bridgeState.callRing with its
  // round-trip ms, so /health and sandbox.bridge_health can say which tool
  // class is slow instead of only "the route was slow".
  const callStarted = new Map() // message.id -> {tool, startedMs}
  const recordCall = (tool, startedMs, outcome) => {
    bridgeState.callRing = bridgeState.callRing || []
    bridgeState.callRing.push({ tool: String(tool || 'unknown').slice(0, 80), ms: Math.max(0, Math.round(performance.now() - startedMs)), outcome, at: new Date().toISOString() })
    if (bridgeState.callRing.length > 64) bridgeState.callRing.shift()
  }

  let stdout = ''
  // tools/list requests we forwarded to the child: when its reply comes back,
  // merge the native kitesurf_* tools into result.tools before sending.
  const pendingToolLists = new Set()
  child.on('spawn', () => { if (env.MCP_BRIDGE_DEBUG) try { process.stderr.write(`[bridge] child spawned cdp=${env.AGENT_BROWSER_CDP || CDP}\n`) } catch {} })
  child.on('error', (e) => { try { process.stderr.write(`[bridge] child error ${e?.message || e}\n`) } catch {} })
  child.on('exit', (c, s) => { try { process.stderr.write(`[bridge] child exit code=${c} sig=${s}\n`) } catch {}; socket.end() })
  child.stdout.on('data', (chunk) => {
    if (env.MCP_BRIDGE_DEBUG) try { process.stderr.write(`[bridge] child<-stdout ${chunk.toString('utf8').slice(0, 90)}\n`) } catch {}
    stdout += chunk.toString('utf8')
    let nl
    while ((nl = stdout.indexOf('\n')) >= 0) {
      let line = stdout.slice(0, nl).trim()
      stdout = stdout.slice(nl + 1)
      if (!line) continue
      try {
        const message = JSON.parse(line)
        // A completed write releases the shared gate for the next writer;
        // stamp the pane-visible action record with the outcome.
        if (message.id != null && pendingWrites.has(message.id)) {
          pendingWrites.delete(message.id)
          const started = callStarted.get(message.id)
          if (started) {
            callStarted.delete(message.id)
            const toolErr = message.error ? true
              : (typeof message.result?.content?.[0]?.text === 'string' && (message.result?.isError === true || /"ok"\s*:\s*false/.test(message.result.content[0].text)))
            recordCall(started.tool, started.startedMs, toolErr ? 'error' : 'ok')
          }
          // MCP tools/call reports failures as {result:{isError:true}} as well
          // as JSON-RPC {error} — the toast should mark both as not-ok.
          if (control.lastAction) {
            const toolErr = message.error ? true
              : (typeof message.result?.content?.[0]?.text === 'string' && (message.result?.isError === true || /"ok"\s*:\s*false/.test(message.result.content[0].text)))
            control.lastAction.ok = !toolErr
          }
        }
        if (message.id != null && pendingToolLists.has(message.id)) {
          pendingToolLists.delete(message.id)
          if (Array.isArray(message.result?.tools)) {
            message.result.tools = [...message.result.tools, ...KITESURF_TOOLS]
            line = JSON.stringify(message)
          }
        }
      } catch { /* non-JSON child output: forward verbatim */ }
      sendText(socket, line)
    }
  })
  const control = bridgeState.control || makeControl()
  // The lock is sticky: only kitesurf_control release or the socket going away
  // frees it — never the completion of one write. pendingWrites only tracks
  // in-flight ids so a dropped socket can clean them up.
  const releaseAll = () => {
    pendingWrites.clear()
    if (control.writer === connId) { control.writer = null; control.owner = null; control.ownerSince = null }
  }

  // MCP-over-WebSocket delivers one complete JSON-RPC message per text frame
  // — there is no newline terminator. Buffering on '\n' deadlocks every client
  // that sends a single-JSON frame (which is the norm). Treat each frame as
  // one message; split on '\n' only to stay compatible with a client that
  // batches several newline-joined messages into one frame.
  const decode = createFrameDecoder({
    onMessage: (text) => {
      if (env.MCP_BRIDGE_DEBUG) try { process.stderr.write(`[bridge] msg ${text.slice(0, 90)}\n`) } catch {}
      for (const rawLine of text.split('\n')) {
        const line = rawLine.trim()
        if (!line) continue
        let handledLocally = false
        try {
          const message = JSON.parse(line)
          if (message.method === 'tools/list' && message.id != null) pendingToolLists.add(message.id)
          if (message.method === 'initialize') {
            const n = message.params?.clientInfo?.name
            if (typeof n === 'string' && n) clientName = n.slice(0, 40)
          }
          if (message.method === 'tools/call' && typeof message.params?.name === 'string') {
            const toolName = message.params.name
            const startedMs = performance.now()
            if (toolName.startsWith('sandbox.')) {
              control.lastCallAt = new Date().toISOString()
              const data = answerNativeTool(toolName, message.params.arguments || {}, bridgeState, { connId, clientName, isHost })
              recordCall(toolName, startedMs, data?.ok === false ? 'error' : 'ok')
              sendText(socket, JSON.stringify(message.id == null
                ? toolError(null, -32600, 'tools/call requires an id')
                : toolResult(message.id, data)))
              handledLocally = true
            } else if (isWriteCall(toolName)) {
              // One writer moves the page at a time (ownership contract). The
              // lock is STICKY: the first write claims the page and keeps it
              // until kitesurf_control release or socket close, so a human
              // annotating is never torn by a background agent's navigation.
              // A second writer is refused, not queued.
              // T-O-63: during a hold only a host-class connection (relay
              // credential at handshake) may write — clientInfo.name is no
              // exemption. A refused write is recorded on lastAction first,
              // but lastCallAt/lastWriteAt/writer never move and nothing is
              // queued or replayed.
              if (control.humanHold?.active && !isHost) {
                recordCall(toolName, startedMs, 'refused')
                control.lastAction = { tool: toolName.slice(0, 80), owner: clientName, at: new Date().toISOString(), ok: false }
                sendText(socket, JSON.stringify(message.id == null
                  ? toolError(null, -32600, 'tools/call requires an id')
                  : toolResult(message.id, {
                    ok: false,
                    errorId: 'kitesurf.control.held',
                    error: `a human (${control.humanHold.owner}) holds the page via takeover`,
                    hint: 'the human clicked takeover; stop writing until they release',
                  })))
                handledLocally = true
              } else if (control.writer !== null && control.writer !== connId) {
                recordCall(toolName, startedMs, 'refused')
                sendText(socket, JSON.stringify(message.id == null
                  ? toolError(null, -32600, 'tools/call requires an id')
                  : toolResult(message.id, {
                    ok: false,
                    errorId: 'kitesurf.control.busy',
                    error: `another writer (${control.owner || 'unknown'}) holds the page`,
                    hint: 'wait and retry; GET /health on the bridge reports the current owner',
                  })))
                handledLocally = true
              } else {
                control.lastCallAt = new Date().toISOString()
                control.writer = connId
                control.owner = clientName
                control.ownerSince = control.ownerSince || new Date().toISOString()
                control.lastWriteAt = new Date().toISOString()
                control.lastAction = { tool: toolName.slice(0, 80), owner: clientName, at: control.lastWriteAt }
                if (message.id != null) { pendingWrites.add(message.id); callStarted.set(message.id, { tool: toolName, startedMs }) }
              }
            } else {
              control.lastCallAt = new Date().toISOString()
            }
          }
        } catch { /* malformed frame: let the child produce the -32700 */ }
        if (handledLocally) continue
        if (env.MCP_BRIDGE_DEBUG) try { process.stderr.write(`[bridge] fwd->child ${line.slice(0, 90)}\n`) } catch {}
        // Backpressure: stop reading the socket until the child drains.
        if (!child.stdin.write(`${line}\n`)) {
          socket.pause()
          child.stdin.once('drain', () => socket.resume())
          return
        }
      }
    },
    onPing: (payload) => { try { sendPong(socket, payload) } catch { /* gone */ } },
    onClose: (code) => { releaseAll(); teardown(code) },
  })
  socket.on('data', decode)
  socket.on('close', () => { alive = false; releaseAll(); child.kill() })
  socket.on('error', () => { alive = false; releaseAll(); child.kill() })
  // TCP FIN without a WS close frame (abrupt client death): 'end' fires where
  // 'close' may lag or never come — free the slot + child, don't leak the conn.
  socket.on('end', () => { releaseAll(); teardown(1006) })
  socket.setTimeout(IDLE_MS, () => { releaseAll(); teardown(1001) })
}

/** p50/p95 + per-tool summary of the callRing — /health and bridge_health surface it. */
function callSummary(ring) {
  const rows = Array.isArray(ring) ? ring : []
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b)
  const at = (p) => (ms.length ? ms[Math.min(ms.length - 1, Math.floor((p / 100) * ms.length))] : 0)
  const byTool = {}
  for (const r of rows) {
    const t = byTool[r.tool] || (byTool[r.tool] = { n: 0, totalMs: 0, errors: 0 })
    t.n += 1
    t.totalMs += r.ms
    if (r.outcome !== 'ok') t.errors += 1
  }
  for (const t of Object.values(byTool)) t.avgMs = Math.round(t.totalMs / t.n)
  return { count: rows.length, p50: at(50), p95: at(95), last: rows.slice(-10), byTool }
}

export function createBridge(port = PORT, env = process.env) {
  let conns = 0
  let accepted = 0
  let rejected = 0
  const startedAt = Date.now()
  const healthDir = env.DNLS_HEALTH_DIR || HEALTH_DIR
  const credDir = env.DNLS_RELAY_CRED_DIR || HEALTH_DIR
  const control = makeControl()
  const cdpRelay = makeCdpRelay({ upstreamUrl: env.KITESURF_CDP_UPSTREAM || CDP_UPSTREAM, debug: env.MCP_BRIDGE_DEBUG, control })
  const stats = () => ({
    conns, accepted, rejected, uptimeMs: Date.now() - startedAt,
    control: controlSnapshot(control, cdpRelay.agentStats),
    cdp: cdpRelay.stats(),
    calls: callSummary(bridgeState.callRing),
  })
  const bridgeState = {
    // The old host→bridge diagnostics push is gone (POST /diagnostics is a
    // hard 403 now); snapshot-backed tools stay honest and answer
    // kitesurf.diag.stale rather than fabricating success.
    getDiagnostics: () => null,
    getHealth: () => readHealth(healthDir),
    getRelayStats: cdpRelay.agentStats,
    stats,
    control,
  }
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      // Shared readers get only the nonrestricted health summary — no call
      // ring, control owner/lastAction, or tool bodies. Private liveness
      // detail belongs to authenticated host routes, not this port.
      const health = readHealth(healthDir)
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: true, health, observedAt: health?.observedAt ?? null }))
      return
    }
    // HITL control endpoint: the DSH pane reaches this through the host's
    // /nano-local-sandbox/control proxy. GET = status; POST {action:takeover|
    // release} toggles humanHold — the sticky human override that refuses all
    // MCP write-class calls (kitesurf.control.held) while the human drives.
    // Loopback-only like /diagnostics; reject browser-shaped requests.
    if (req.url === '/control' && (req.method === 'POST' || req.method === 'GET')) {
      if (req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: true, control: controlSnapshot(control, cdpRelay.agentStats) }))
        return
      }
      // T-O-63: a write on /control is host-class only — the DNLS host signs
      // the request with the current generation credential. No credential or
      // a stale one is an indistinguishable 403, same as a browser-shaped
      // request. The credential itself never enters the response or a log.
      if (req.headers.origin || (req.headers['content-type'] || '').indexOf('application/json') === -1 ||
          !isHostConnection(req.headers, credDir)) {
        res.writeHead(403)
        res.end()
        return
      }
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
        if (body.length > 8 * 1024) { req.destroy() }
      })
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body)
          const action = String(parsed?.action || '').toLowerCase()
          const note = typeof parsed?.note === 'string' ? parsed.note.slice(0, 80) : null
          const owner = typeof parsed?.owner === 'string' ? parsed.owner.slice(0, 40) : 'human'
          if (action === 'takeover') {
            control.humanHold = { active: true, owner, since: new Date().toISOString(), note }
            // Evict any live writer: the human holds the page now. The evicted
            // agent's next write gets kitesurf.control.held, not busy.
            control.writer = null; control.owner = null; control.ownerSince = null
            res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ ok: true, tookOver: true, control: controlSnapshot(control, cdpRelay.agentStats) }))
            return
          }
          if (action === 'release') {
            control.humanHold = { active: false, owner: null, since: null, note: null }
            res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ ok: true, released: true, control: controlSnapshot(control, cdpRelay.agentStats) }))
            return
          }
          res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: false, errorId: 'kitesurf.control.query', error: 'action must be takeover|release' }))
        } catch (error) {
          res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: false, errorId: 'kitesurf.control.body', error: String(error?.message || error) }))
        }
      })
      return
    }
    // Public health projection. The only writer is the trusted host owner
    // over `container exec` (dnls.control/1, /run/dnls-public-health.json) —
    // never the published HTTP port. POST is refused outright with zero
    // mutation: no writer election, no history merge, no accepted flag.
    if (req.url === '/diagnostics') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: true, health: readHealth(healthDir) }))
        return
      }
      res.writeHead(403)
      res.end()
      return
    }
    res.writeHead(404)
    res.end()
  })

  server.on('upgrade', async (req, socket) => {
    const isMcp = req.url === '/mcp'
    const isCdp = req.url === '/cdp'
    if ((!isMcp && !isCdp)
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
      // T-O-63: classify by the generation credential presented AT THIS
      // handshake — header or a dnls-relay.<token> subprotocol offer. The 101
      // response carries no Sec-WebSocket-Protocol echo, so the credential is
      // never reflected. A self-declared clientInfo.name or a copied relay
      // URL does not make a connection host-class.
      const isHost = isHostConnection(req.headers, credDir)
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
      )
      if (isCdp) {
        // CDP relay: one upstream engine socket, one shared page. /cdp clients
        // bypass the MCP writer lock by design — the host plugin's own CDP
        // work is trusted the same way the engine's direct port already is.
        cdpRelay.handle(socket, isHost ? 'host' : 'agent')
      } else {
        attach(socket, env, bridgeState, isHost)
      }
    } catch (error) {
      // acceptKey/attach threw after we counted the conn — destroy() may not
      // emit 'close' on a socket never fully opened, so release the slot here
      // and also run the attachless teardown (child may not exist yet).
      conns -= 1
      try { socket.destroy() } catch { /* gone */ }
      process.stderr.write(`kitesurf mcp bridge upgrade failed: ${error?.message || error}\n`)
    }
  })

  // 0.0.0.0 INSIDE the container is required: the container runtime publishes a
  // host port onto the container's allocated network address, not its
  // loopback. Binding to 127.0.0.1 here would make the published port unreachable.
  // The real boundary is the host-side loopback publish (createArgs), the
  // Origin allowlist on /mcp, and the no-Origin requirement on /diagnostics.
  server.listen(port, '0.0.0.0', () => {
    process.stderr.write(`kitesurf mcp bridge on :${port} conns<=${MAX_CONNS} frame<=${MAX_FRAME}B\n`)
  })
  return server
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  createBridge()
}
