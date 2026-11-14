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

const PORT = Number(process.env.DNLS_MCP_PORT || 8791)
const CDP = process.env.AGENT_BROWSER_CDP || ''
const MAX_FRAME = Number(process.env.DNLS_MCP_MAX_FRAME || 1_048_576)
const MAX_MESSAGE = Number(process.env.DNLS_MCP_MAX_MESSAGE || 1_048_576)
const MAX_CONNS = Number(process.env.DNLS_MCP_MAX_CONNS || 8)
// 20 minutes, not hours: a quiet but healthy MCP session is minutes, and a
// half-open zombie must not hold a conn slot for hours.
const IDLE_MS = Number(process.env.DNLS_MCP_IDLE_MS || 20 * 60 * 1000)
// Browser-supplied Origin must carry one of these exact hostnames — prefix
// matching would let http://localhost.evil.example pass (S2-3). Non-browser
// clients send no Origin and are allowed. Comma-separated env overrides.
const ALLOWED_HOSTS = (process.env.DNLS_MCP_ORIGINS || 'localhost,127.0.0.1,[::1]')
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

/**
 * Kitesurf-native MCP tools. The bridge is a byte pipe to `agent-browser mcp`,
 * whose 33 core tools know nothing about the host plugin's execution state.
 * These are answered LOCALLY from the diagnostics snapshot the host pushes to
 * POST /diagnostics, so an agent using only MCP can still answer "what did the
 * plugin just do, and which errorId fired?" — the gap the owner called out.
 */
const DNLS_TOOLS = [
  {
    name: 'kitesurf_diagnostics',
    description: 'One-shot Kitesurf plugin diagnostics: engine status, phase, targets, settings, console tail, operation trace, errorId catalogue and generated next-step hints. Call this FIRST when anything fails.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'kitesurf_console',
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
    name: 'kitesurf_operations',
    description: 'Recent /nano-kitesurf/* route calls with status, errorId, incidentId, durationMs and a whitelisted input summary. Use errorsOnly=true to see only failures.',
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
    name: 'kitesurf_error_catalog',
    description: 'The single source of truth: errorId → HTTP status → cause → next command. Use it to interpret any kitesurf.* errorId instead of guessing.',
    inputSchema: {
      type: 'object',
      properties: { errorId: { type: 'string', description: 'Optional: return only matching ids' } },
      additionalProperties: false,
    },
  },
  {
    name: 'kitesurf_targets',
    description: 'Engine CDP Target.getTargets result: page target ids/urls and which page the plugin socket is attached to. Use when the pane and the API disagree.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'kitesurf_history',
    description: 'Browse history for the Kitesurf pane: the newest 30 visits with url, ISO time and visit count, plus the total stored. Backed by the plugin durable store (the Kitesurf workerd exposes no D1/KV binding). Mutations go through the host: DELETE /nano-kitesurf/browse-history?id=… or POST {clear:true}.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'kitesurf_dom',
    description: 'Last captured document: url, byte size and the first 4000 characters of documentElement.outerHTML. Use to confirm what the engine is actually rendering when the pane looks wrong.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'kitesurf_elements',
    description: 'Elements panel data from the Kitesurf DOM/CSS domains: the last DOM tree (up to 40 nodes with tag/id/class/child count), the selector queried, and how many computed properties were returned. Call GET /nano-kitesurf/elements?selector=… on the host for styles of a specific node.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'kitesurf_control',
    description: 'Page control/ownership state: which writer holds the page (owner client name, since when, last write). One page is shared by a human and agents; a second writer is refused kitesurf.control.busy rather than tearing navigation. Use before any mutating tool call.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'kitesurf_selftest',
    description: 'One verdict over every layer: plugin build, engine identity, container state, published port loopback, MCP bridge counters, CDP targets, DOM availability, route table and phase consistency. Use after any restart or container change.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'kitesurf_network',
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
    name: 'kitesurf_ports',
    description: 'Port truth: what the profile configured, what the engine actually uses, what the container published, and whether each host port is free (e.g. 8787 held by Cursor while the engine runs on 8798). Read this FIRST for any container/bootstrap failure.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'kitesurf_recovery_plan',
    description: 'Ordered recovery steps with the exact HTTP call for each, derived from the live snapshot (port conflict, engine down, phase mismatch, container missing). Returns commands to run through the authenticated host session.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'kitesurf_bridge_health',
    description: 'MCP bridge liveness: conns, accepted, rejected, uptimeMs and when the last host diagnostics snapshot was pushed.',
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
    },
  }
}

function toolError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

/** Answer a kitesurf_* tools/call without touching the agent-browser child. */
function answerNativeTool(name, args, bridgeState) {
  const snap = bridgeState.getDiagnostics()
  if (name === 'kitesurf_bridge_health') {
    return { ok: true, ...bridgeState.stats(), diagnosticsPushedAt: snap?.at || null }
  }
  if (!snap) {
    return { ok: false, errorId: 'kitesurf.diag.stale', error: 'host has not pushed a diagnostics snapshot yet; retry in a few seconds', hint: 'GET /nano-kitesurf/diagnostics on the authenticated host, or wait for the 30s push' }
  }
  if (name === 'kitesurf_diagnostics') return snap
  if (name === 'kitesurf_console') {
    const levels = typeof args.level === 'string' ? args.level.split(',').map((s) => s.trim()).filter(Boolean) : null
    const limit = Math.max(1, Math.min(Number(args.limit) || 50, 250))
    const entries = (snap.console?.entries || []).filter((e) => !levels || levels.includes(e.level)).slice(-limit)
    return { ok: true, entries, total: snap.console?.total ?? entries.length, counts: snap.console?.counts || {} }
  }
  if (name === 'kitesurf_operations') {
    const errorsOnly = args.errorsOnly === true
    const limit = Math.max(1, Math.min(Number(args.limit) || 50, 200))
    const entries = (snap.operations?.entries || []).filter((e) => !errorsOnly || !e.ok).slice(-limit)
    return { ok: true, entries, total: snap.operations?.total ?? entries.length, dropped: snap.operations?.dropped ?? 0 }
  }
  if (name === 'kitesurf_error_catalog') {
    const all = snap.observability?.errorCatalog || []
    const filter = typeof args.errorId === 'string' ? args.errorId : null
    return { ok: true, entries: filter ? all.filter((r) => r.errorId.includes(filter)) : all, total: all.length }
  }
  if (name === 'kitesurf_targets') return { ok: true, ...(snap.engine?.targets || { count: 0, targets: [] }), targetsError: snap.engine?.targetsError || null }
  if (name === 'kitesurf_history') {
    const h = snap.history || null
    if (!h) return { ok: false, errorId: 'kitesurf.history.stale', error: 'no history snapshot yet', hint: 'open a page on the host, then retry' }
    return { ok: true, total: h.total, entries: h.entries }
  }
  if (name === 'kitesurf_dom') {
    const dom = snap.dom || null
    if (!dom) return { ok: false, errorId: 'kitesurf.dom.stale', error: 'no DOM captured yet', hint: 'run GET /nano-kitesurf/dom on the host, then retry' }
    return { ok: true, ...dom }
  }
  if (name === 'kitesurf_elements') {
    const el = snap.elements || null
    if (!el) return { ok: false, errorId: 'kitesurf.elements.stale', error: 'no elements snapshot yet', hint: 'run GET /nano-kitesurf/elements on the host, then retry' }
    return { ok: true, ...el }
  }
  if (name === 'kitesurf_selftest') {
    const st = snap.selftest || null
    if (!st) return { ok: false, errorId: 'kitesurf.selftest.stale', error: 'no self-test has run yet', hint: 'run GET /nano-kitesurf/selftest on the authenticated host, then retry' }
    return { ok: true, ...st, ageMs: Date.now() - Date.parse(st.at) }
  }
  if (name === 'kitesurf_network') {
    const limit = Math.max(1, Math.min(Number(args.limit) || 100, 200))
    const entries = (snap.network?.entries || [])
      .filter((r) => args.failedOnly !== true || r.failed || (r.status && r.status >= 400))
      .slice(-limit)
    const failed = (snap.network?.entries || []).filter((r) => r.failed || (r.status && r.status >= 400)).length
    return { ok: true, entries, total: snap.network?.total ?? entries.length, failed }
  }
  if (name === 'kitesurf_ports') {
    const ports = snap.ports || null
    const hint = []
    if (ports?.ports?.engine && ports.ports.engine.free === false && ports.effective?.httpBase) {
      hint.push(`配置端口 ${ports.configured?.httpBase} 被占用或不可用；实际引擎在 ${ports.effective.httpBase}`)
    }
    if (ports?.lastRepair) hint.push(`最近一次端口修复：${ports.lastRepair.reason}（${JSON.stringify(ports.lastRepair.from)} → ${JSON.stringify(ports.lastRepair.to)}）`)
    if (ports?.container?.state && ports.container.state !== 'running') hint.push(`容器状态 ${ports.container.state}，需要 POST /nano-kitesurf/recover 或 /kite resume`)
    return { ok: true, ...(ports || { error: 'no port snapshot yet' }), hints: hint }
  }
  if (name === 'kitesurf_recovery_plan') {
    const phase = snap.plugin?.phase || snap.engine?.kite?.phase || 'unknown'
    const alive = snap.engine?.engineAlive === true
    const steps = []
    if (!alive) steps.push({ order: 1, action: 'suspend (only if phase=running)', call: 'POST /nano-kitesurf/kite {"action":"suspend"}' })
    if (!alive) steps.push({ order: 2, action: 'resume / start engine (auto-repairs a busy port)', call: 'POST /nano-kitesurf/kite {"action":"resume"}' })
    if (!alive) steps.push({ order: 3, action: 'one-shot self-heal + port report', call: 'POST /nano-kitesurf/recover {}' })
    steps.push({ order: steps.length + 1, action: 'verify', call: 'GET /nano-kitesurf/ports' })
    steps.push({ order: steps.length + 1, action: 'if a port is busy, repoint config', call: 'profile cordis.patch.yml → - id: nano-kitesurf / config.httpBase: http://127.0.0.1:8798, then restart the host' })
    return { ok: true, phase, engineAlive: alive, steps, notes: 'kitesurf.kite.portbusy (409) means the requested port is held by another process; the existing container is preserved.' }
  }
  if (name === 'kitesurf_control') {
    const c = bridgeState.control || {}
    return {
      ok: true,
      writer: c.writer != null,
      owner: c.owner ?? null,
      ownerSince: c.ownerSince ?? null,
      lastWriteAt: c.lastWriteAt ?? null,
      hint: 'one writer moves the page at a time; a second writer gets kitesurf.control.busy',
    }
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
  return typeof name === 'string' && (name.startsWith('kitesurf_interact') || WRITE_RE.test(name))
}

/**
 * The bridge-wide control gate, shared across every attached connection. Two
 * agents (or a human + agent) may hold the same engine; only ONE writer moves
 * the page at a time. A busy write gets kitesurf.control.busy instead of a
 * torn navigation — same ownership model ego's TaskSpace enforces.
 */
function makeControl() {
  return {
    writer: null,        // connId currently holding the write lock
    owner: null,         // clientInfo.name of the last writer ('agent'|…)
    ownerSince: null,
    lastWriteAt: null,
  }
}

function attach(socket, env = process.env, bridgeState = { getDiagnostics: () => null, stats: () => ({}), control: makeControl() }) {
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
  const child = spawn('agent-browser', ['mcp'], {
    env: { ...env, AGENT_BROWSER_CDP: env.AGENT_BROWSER_CDP || CDP },
    stdio: ['pipe', 'pipe', 'inherit'],
  })

  const connId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  let clientName = 'agent'
  // in-flight write-class call ids, so a dropped socket frees the gate even
  // if the child never answers.
  const pendingWrites = new Set()

  let stdout = ''
  // tools/list requests we forwarded to the child: when its reply comes back,
  // merge the native kitesurf_* tools into result.tools before sending.
  const pendingToolLists = new Set()
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString('utf8')
    let nl
    while ((nl = stdout.indexOf('\n')) >= 0) {
      let line = stdout.slice(0, nl).trim()
      stdout = stdout.slice(nl + 1)
      if (!line) continue
      try {
        const message = JSON.parse(line)
        // A completed write releases the shared gate for the next writer.
        if (message.id != null && pendingWrites.delete(message.id)) {
          releaseWriter()
        }
        if (message.id != null && pendingToolLists.has(message.id)) {
          pendingToolLists.delete(message.id)
          if (Array.isArray(message.result?.tools)) {
            message.result.tools = [...message.result.tools, ...DNLS_TOOLS]
            line = JSON.stringify(message)
          }
        }
      } catch { /* non-JSON child output: forward verbatim */ }
      sendText(socket, line)
    }
  })
  child.on('exit', () => socket.end())
  child.on('error', () => teardown(1011))

  const control = bridgeState.control || makeControl()
  const releaseWriter = () => {
    if (control.writer === connId && pendingWrites.size === 0) control.writer = null
  }
  const releaseAll = () => {
    pendingWrites.clear()
    if (control.writer === connId) control.writer = null
  }

  let stdin = ''
  const decode = createFrameDecoder({
    onMessage: (text) => {
      stdin += text
      let nl
      while ((nl = stdin.indexOf('\n')) >= 0) {
        const line = stdin.slice(0, nl)
        stdin = stdin.slice(nl + 1)
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
            if (toolName.startsWith('kitesurf_')) {
              const data = answerNativeTool(toolName, message.params.arguments || {}, bridgeState)
              sendText(socket, JSON.stringify(message.id == null
                ? toolError(null, -32600, 'tools/call requires an id')
                : toolResult(message.id, data)))
              handledLocally = true
            } else if (isWriteCall(toolName)) {
              // One writer moves the page at a time (ownership contract): a
              // second writer is refused, not queued, so a human annotating is
              // never torn by a background agent's navigation.
              if (control.writer !== null && control.writer !== connId) {
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
                control.writer = connId
                control.owner = clientName
                control.ownerSince = control.ownerSince || new Date().toISOString()
                control.lastWriteAt = new Date().toISOString()
                if (message.id != null) pendingWrites.add(message.id)
              }
            }
          }
        } catch { /* malformed frame: let the child produce the -32700 */ }
        if (handledLocally) continue
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

export function createBridge(port = PORT, env = process.env) {
  let conns = 0
  let accepted = 0
  let rejected = 0
  let lastDiagnostics = null
  let diagnosticsPushedAt = null
  const startedAt = Date.now()
  const control = makeControl()
  const stats = () => ({
    conns, accepted, rejected, uptimeMs: Date.now() - startedAt,
    control: { writer: control.writer !== null, owner: control.owner, ownerSince: control.ownerSince, lastWriteAt: control.lastWriteAt },
  })
  const bridgeState = {
    getDiagnostics: () => lastDiagnostics,
    stats,
    control,
  }
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: true, mcp: '/mcp', ...stats(), diagnosticsPushedAt }))
      return
    }
    // Host → bridge push. The dsh host is on the same loopback; the port is
    // only published on 127.0.0.1. Reject browser-shaped requests (Origin)
    // and bound the payload so this endpoint cannot be used to grow memory.
    if (req.url === '/diagnostics' && (req.method === 'POST' || req.method === 'GET')) {
      if (req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: true, pushedAt: diagnosticsPushedAt, diagnostics: lastDiagnostics }))
        return
      }
      if (req.headers.origin || (req.headers['content-type'] || '').indexOf('application/json') === -1) {
        res.writeHead(403)
        res.end()
        return
      }
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
        if (body.length > 512 * 1024) { req.destroy() }
      })
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body)
          if (!parsed || typeof parsed !== 'object') throw new Error('not an object')
          // Two hosts can push to one engine (desktop + a dev profile). Keep the
          // richest history instead of letting an older host erase it.
          const prev = lastDiagnostics?.history
          const next = parsed?.history
          if (prev && (!next || (next.entries?.length || 0) < (prev.entries?.length || 0))) parsed.history = prev
          lastDiagnostics = parsed
          diagnosticsPushedAt = new Date().toISOString()
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: true, at: diagnosticsPushedAt }))
        } catch (error) {
          res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: false, error: String(error?.message || error) }))
        }
      })
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
      attach(socket, env, bridgeState)
    } catch (error) {
      // acceptKey/attach threw after we counted the conn — destroy() may not
      // emit 'close' on a socket never fully opened, so release the slot here
      // and also run the attachless teardown (child may not exist yet).
      conns -= 1
      try { socket.destroy() } catch { /* gone */ }
      process.stderr.write(`kitesurf mcp bridge upgrade failed: ${error?.message || error}\n`)
    }
  })

  // 0.0.0.0 INSIDE the container is required: Apple container publishes a
  // host port onto the container's network IP (192.168.64.x), not its
  // loopback. Binding to 127.0.0.1 here would make 127.0.0.1:8799 unreachable.
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
