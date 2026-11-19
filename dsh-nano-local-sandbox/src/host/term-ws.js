/**
 * Managed terminal data plane (dnt-ws-v2). One issued locator names one exact
 * upgrade path registered on the host webServer — no new listener, no token
 * or userinfo in the URL. Authorization is proven at issue AND again at
 * upgrade AND again around every broker RPC: the serial is a locator, never
 * a credential.
 *
 * Frame layout on channel 0: [u32be channel][u8 kind][u32be length][payload].
 *   0 DATA       c→s raw input bytes (data_b64 to broker); s→c u32 seq + bytes
 *   1 CREDIT     c→s u32 additional output bytes permitted (starts at 0)
 *   2 RESIZE     c→s two u16: cols, rows
 *   3 CLOSE      c→s detach only — never a close/kill on the broker
 *   4 PING       c→s; answered with kind 8 PONG echoing the payload
 *   5 FACTS      c→s bounded JSON {cols,rows}
 *   6 AUTO_INPUT c→s raw bytes under the same authority as DATA
 *   7 SNAPSHOT   s→c align payload: 1 + u32 seq + u16 cols,rows,cursorX,cursorY
 *                + UTF-8 text (layout of DNT shared/align.js, mirrored here)
 *
 * The text control channel carries only open/ready/error/exit/align JSON.
 * Each binary WebSocket message is exactly one frame — ws defragments for
 * us; a concatenated or truncated message is a protocol failure (1002).
 * Close codes: 1000 client detach, 1002 protocol fault, 1008 authorization
 * or policy loss — a consumer must not reconnect on 1002/1008.
 */
import { randomUUID } from 'node:crypto'
import { WebSocketServer } from 'ws'
import { authorize } from './object-authz.js'

const BASE = '/nano-local-sandbox/term'
const PENDING_MAX = 128
const MAX_PAYLOAD = 131072
const FRAME_MAX = 1 << 18
const FACTS_MAX = 4096
const CREDIT_CAP = 4 << 20
const CHUNK_MAX = 64 << 10      // one s→c DATA payload
const BUFFER_MAX = 1 << 20      // ws bufferedAmount ceiling
const JOBS_MAX = 16             // queued per-socket async jobs
const UINT32 = 0xffffffff
const IDLE_MS = 1000            // bounded non-overlapping poll when ring empty

const KIND = { DATA: 0, CREDIT: 1, RESIZE: 2, CLOSE: 3, PING: 4, FACTS: 5, AUTO_INPUT: 6, SNAPSHOT: 7, PONG: 8 }
const CLOSE = { DETACH: 1000, PROTOCOL: 1002, DENIED: 1008 }

/** [u32be channel][u8 kind][u32be length][payload] */
function encodeFrame(channel, kind, payload) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload)
  const out = Buffer.alloc(9 + body.length)
  out.writeUInt32BE(channel, 0)
  out.writeUInt8(kind, 4)
  out.writeUInt32BE(body.length, 5)
  body.copy(out, 9)
  return out
}

/** Exactly one frame per binary message; anything else is a protocol fault. */
function decodeFrame(data) {
  if (!Buffer.isBuffer(data) || data.length < 9) return null
  const len = data.readUInt32BE(5)
  if (len > FRAME_MAX || data.length !== 9 + len) return null
  return { channel: data.readUInt32BE(0), kind: data.readUInt8(4), payload: data.subarray(9) }
}

/** The shared align.js SNAPSHOT payload, mirrored byte-for-byte. */
function encodeSnapshot({ seq, cols, rows, cursorX, cursorY, text }) {
  const body = Buffer.from(String(text ?? ''), 'utf8')
  const out = Buffer.alloc(13 + body.length)
  out.writeUInt8(1, 0)
  out.writeUInt32BE(seq >>> 0, 1)
  out.writeUInt16BE(cols & 0xffff, 5)
  out.writeUInt16BE(rows & 0xffff, 7)
  out.writeUInt16BE(cursorX & 0xffff, 9)
  out.writeUInt16BE(cursorY & 0xffff, 11)
  body.copy(out, 13)
  return out
}

/** u32/u16 serialization requires proven in-range integers first. */
function validSnapshot(snap) {
  return snap?.ok === true &&
    Number.isInteger(snap.seq) && snap.seq >= 0 && snap.seq <= UINT32 &&
    Number.isInteger(snap.cols) && snap.cols >= 0 && snap.cols <= 0xffff &&
    Number.isInteger(snap.rows) && snap.rows >= 0 && snap.rows <= 0xffff &&
    Number.isInteger(snap.cursorX) && snap.cursorX >= 0 && snap.cursorX <= 0xffff &&
    Number.isInteger(snap.cursorY) && snap.cursorY >= 0 && snap.cursorY <= 0xffff &&
    typeof snap.text === 'string'
}

function fail(status, error) {
  return Object.assign(new Error(error), { status })
}

/**
 * @param {object} o.connection   host connection service: admit(req) on the
 *                                identical IncomingMessage, every time
 * @param {object} o.webServer    registerUpgrade({path, handler(req,socket,head)})
 * @param {object} o.registry     managed control registry (row + terminal refs)
 * @param {string} o.envId
 * @param {Function} o.resolvePrincipal  trusted principal for an admitted peer
 * @param {Function} o.observe           live row observation (running+generation)
 * @param {Function} o.terminalRpc       (locator,'rpc',request) → broker reply
 * @param {Function} o.originFor         trusted ws(s)://host origin for a req
 * @returns {{issueLocator: Function, dispose: Function}}
 */
export function createTerminalStream({ connection, webServer, registry, envId, resolvePrincipal, observe, terminalRpc, originFor, heartbeatMs = 1000 }) {
  const epoch = randomUUID()
  let serial = 0
  let disposed = false
  const pending = new Map()   // path -> {ref fields} + disposer (issue-only, one-shot)
  const live = new Set()      // upgraded socket sessions
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD, perMessageDeflate: false })

  const liveRow = (row, obs) => obs && obs.state === 'running' && obs.locator === row.binding.locator &&
    obs.generation === row.binding.generation && obs.stateVolume === row.stateVolume

  /**
   * The registry row only when its binding AND the terminal's recorded owner
   * still match the issued proof — ownership transfer invalidates a locator
   * rather than re-authorizing the new owner on the old serial.
   */
  function heldRow(pend) {
    let row
    try { row = registry.get(pend.sandboxId) } catch { return null }
    if (!row || row.binding.locator !== pend.locator || row.binding.generation !== pend.generation) return null
    const ref = row.terminals.find((entry) => entry.terminalId === pend.terminalId)
    if (!ref || ref.generation !== pend.generation || ref.state === 'ended' || ref.principal !== pend.principalKey) return null
    return { row, ref }
  }

  /**
   * Admit the identical request object and prove it speaks for the issued
   * principal with attach authority on the CURRENT ref — synchronous;
   * callers re-run it around every awaited hop. Anything thrown, refused,
   * aborted or malformed fails closed.
   */
  function admitPeer(pend, req, action = 'terminal.attach') {
    let admission
    try { admission = connection.admit(req) } catch { return null }
    if (!admission || typeof admission !== 'object' || !admission.peer) return null
    const peer = admission.peer
    if (peer.signal?.aborted) return null
    let trusted
    try { trusted = resolvePrincipal({ peer, envId }) } catch { return null }
    if (!trusted || trusted.key !== pend.principalKey) return null
    const held = heldRow(pend)
    if (!held) return null
    let outcome
    try {
      outcome = authorize({
        peer, envId, row: held.row, action,
        terminal: {
          sandboxId: pend.sandboxId,
          principalKey: held.ref.principal,
          generation: held.ref.generation,
        },
        resolvePrincipal,
      })
    } catch { return null }
    if (!outcome || outcome.status || outcome.principal?.key !== pend.principalKey) return null
    return { peer, ...held }
  }

  async function observedLive(row) {
    let obs
    try { obs = await observe(row) } catch { return false }
    return liveRow(row, obs)
  }

  /**
   * Issue an opaque one-shot attach locator for an already-authorized ref.
   * The issuer re-proves admission + object authority + live observation —
   * an issue is not naked authorization carried over from the caller.
   */
  async function issueLocator(ref, row, { req, peer } = {}) {
    if (disposed || !req) throw fail(503, 'unavailable')
    const pend = {
      sandboxId: row.sandboxId,
      terminalId: ref.terminalId,
      locator: row.binding.locator,
      generation: row.binding.generation,
      principalKey: ref.principal,
    }
    // admitPeer re-reads the registry: the fields recorded above are proven
    // still-current against the row the caller authorized.
    if (!admitPeer(pend, req)) throw fail(503, 'unavailable')
    if (!await observedLive(row)) throw fail(503, 'unavailable')
    if (!admitPeer(pend, req)) throw fail(503, 'unavailable')
    const origin = await originFor(req)
    // Fresh state after the origin hop — nothing issued survives a move.
    if (disposed || !admitPeer(pend, req)) throw fail(503, 'unavailable')
    let parsed
    try { parsed = new URL(String(origin)) } catch { parsed = null }
    if (!parsed || (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') ||
        !parsed.hostname || parsed.username || parsed.password ||
        parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.hostname === '*') {
      throw fail(503, 'unavailable')
    }
    const path = `${BASE}/${pend.sandboxId}/${pend.terminalId}/${epoch}-${++serial}`
    let disposer
    try { disposer = webServer.registerUpgrade({ path, handler: (upReq, socket, head) => upgrade(pend, upReq, socket, head) }) }
    catch { throw fail(503, 'unavailable') }
    pending.set(path, { ...pend, disposer })
    if (pending.size > PENDING_MAX) {
      const oldest = pending.keys().next().value
      try { pending.get(oldest)?.disposer() } catch { /* gone */ }
      pending.delete(oldest)
    }
    return `${parsed.origin}${path}`
  }

  /**
   * Re-admission + fresh object proof BEFORE the pending entry is consumed,
   * then the broker connection is born. A refused upgrade destroys the raw
   * socket — no 101, no close frame possible yet.
   */
  async function upgrade(pend, req, socket, head) {
    if (disposed) return socket.destroy()
    let path
    try {
      const target = new URL(req.url ?? '/', 'http://x')
      // The issued locator is a bare path: any query/hash is not ours.
      if (target.search || target.hash) return socket.destroy()
      path = target.pathname
    } catch {
      return socket.destroy()
    }
    const entry = pending.get(path)
    if (!entry || entry.terminalId !== pend.terminalId) {
      socket.destroy()
      return
    }
    const held = admitPeer(pend, req)
    if (!held || !await observedLive(held.row) || !admitPeer(pend, req)) {
      socket.destroy()
      return
    }
    // Consumed exactly once: a dispose or eviction across the awaits must
    // not let this socket resurrect the entry.
    if (disposed || pending.get(path) !== entry) return socket.destroy()
    pending.delete(path)
    try { entry.disposer() } catch { /* already off the route table */ }
    wss.handleUpgrade(req, socket, head, (ws) => session(pend, req, held, ws))
  }

  function session(pend, req, held, ws) {
    const ctx = {
      ws,
      dead: false,
      opened: false,
      aligned: false,
      credit: 0,
      seq: 0,               // next broker byte offset to stream
      polling: false,
      ended: false,
      pump: null,
      tail: Promise.resolve(),
      jobs: 0,
    }
    live.add(ctx)

    const drop = (code = CLOSE.DETACH) => {
      // Detach only: never a close/kill RPC on the broker for a lost client.
      if (ctx.dead) return
      ctx.dead = true
      live.delete(ctx)
      if (ctx.pump) clearTimeout(ctx.pump)
      try {
        if (ws.readyState === 1 || ws.readyState === 0) ws.close(code, 'dnls')
        else ws.terminate()
      } catch { /* gone */ }
    }
    ctx.drop = drop
    const abort = () => drop(CLOSE.DENIED)
    ctx.peer = held.peer
    if (held.peer.signal?.aborted) return drop(CLOSE.DENIED)
    held.peer.signal?.addEventListener?.('abort', abort, { once: true })
    const heartbeat = setInterval(() => {
      if (!ctx.dead && !admitPeer(pend, req)) drop(CLOSE.DENIED)
    }, heartbeatMs)
    heartbeat.unref?.()
    ws.on('close', () => {
      clearInterval(heartbeat)
      held.peer.signal?.removeEventListener?.('abort', abort)
      drop()
    })

    const guard = (action = 'terminal.attach') => !ctx.dead && !disposed && admitPeer(pend, req, action) !== null

    /**
     * Every broker hop proves admission + object authority + LIVE
     * observation on BOTH sides of the await: each `terminalRpc` spawns a
     * fresh CLI process by name, so there is no broker session that could
     * vouch for the generation — an inspection that moved behind an
     * unchanged ledger detaches (1008), never retries.
     */
    const rpc = async (request, action = 'terminal.read') => {
      const held = admitPeer(pend, req, action)
      if (!held || !await observedLive(held.row) || !guard(action)) { drop(CLOSE.DENIED); return null }
      let reply
      try {
        reply = await terminalRpc(pend.locator, 'rpc', { terminalId: pend.terminalId, ...request })
      } catch {
        return null // transport failure is unavailability, not a denial
      }
      const again = admitPeer(pend, req, action)
      if (!again || !await observedLive(again.row) || !guard(action)) { drop(CLOSE.DENIED); return null }
      return reply
    }
    ctx.rpc = rpc

    const sendText = (obj) => {
      if (ctx.dead || ws.readyState !== 1) return
      if (ws.bufferedAmount > BUFFER_MAX) return drop(CLOSE.DENIED)
      ws.send(JSON.stringify(obj))
    }
    const sendFrame = (kind, payload) => {
      if (ctx.dead || ws.readyState !== 1) return
      if (ws.bufferedAmount > BUFFER_MAX) return drop(CLOSE.DENIED)
      ws.send(encodeFrame(0, kind, payload))
    }

    /** Send a fresh pyte snapshot; `false` when the broker cannot align. */
    async function sendSnapshot() {
      const snap = await rpc({ verb: 'snapshot' })
      if (ctx.dead || !guard()) return 'dead'
      if (!validSnapshot(snap)) return false
      ctx.seq = snap.seq
      ctx.aligned = true
      sendFrame(KIND.SNAPSHOT, encodeSnapshot(snap))
      return true
    }

    /**
     * Non-overlapping output pump inside the socket's job chain: reads only
     * while aligned, credited and authorized. An exact ring position is
     * required — from must equal our seq and seq must equal from + bytes;
     * a moved ring realigns through a fresh snapshot, never a replay.
     */
    async function pump() {
      if (ctx.polling) return
      ctx.polling = true
      try {
        while (!ctx.dead && ctx.aligned && ctx.credit > 0) {
          const reply = await rpc({ verb: 'read', from: ctx.seq }, 'terminal.read')
          if (ctx.dead) return
          if (reply === null) return
          if (reply?.ok !== true) return
          if (reply.seq > UINT32 || reply.from !== ctx.seq || reply.seq < reply.from) {
            // from > seq (or a malformed window): the ring moved — realign.
            const ok = await sendSnapshot()
            if (ok === 'dead') return
            if (!ok) { sendText({ type: 'error', message: 'unaligned' }); return drop(CLOSE.PROTOCOL) }
            continue
          }
          const bytes = Buffer.from(reply.bytes_b64 ?? '', 'base64')
          if (reply.seq !== reply.from + bytes.length) {
            const ok = await sendSnapshot()
            if (ok === 'dead') return
            if (!ok) { sendText({ type: 'error', message: 'unaligned' }); return drop(CLOSE.PROTOCOL) }
            continue
          }
          const take = Math.min(bytes.length, ctx.credit, CHUNK_MAX)
          if (take > 0) {
            const end = reply.from + take
            const out = Buffer.alloc(4 + take)
            out.writeUInt32BE(end >>> 0, 0)
            bytes.copy(out, 4, 0, take)
            sendFrame(KIND.DATA, out)
            ctx.credit -= take
            ctx.seq = end
            if (ctx.credit <= 0) return
          } else {
            ctx.seq = reply.seq
          }
          if (reply.ended === true && reply.seq <= ctx.seq) {
            ctx.ended = true
            sendText({ type: 'exit' })
            return drop()
          }
          if (reply.seq === ctx.seq && take === bytes.length) break
        }
      } finally {
        ctx.polling = false
        // Bounded idle wakeup — one container exec per second at most when
        // the ring is empty; a CREDIT frame always pumps immediately.
        if (!ctx.dead && !ctx.ended && !disposed && ctx.credit > 0) {
          ctx.pump = setTimeout(() => enqueue(pump), IDLE_MS)
        }
      }
    }

    /**
     * Serialized per-socket jobs: input order is wire order, awaits inside a
     * job cannot interleave with a sibling job, and a flood of frames can
     * never grow an unbounded promise chain — excess work drops the socket.
     */
    function enqueue(job) {
      if (ctx.dead) return Promise.resolve()
      if (ctx.jobs >= JOBS_MAX) { drop(CLOSE.DENIED); return Promise.resolve() }
      ctx.jobs += 1
      ctx.tail = ctx.tail.then(async () => {
        ctx.jobs -= 1
        if (ctx.dead || disposed) return
        await job()
      }).catch(() => {})
      return ctx.tail
    }

    async function handleMessage(data, isBinary) {
      if (!ctx.opened) {
        if (isBinary) return drop(CLOSE.PROTOCOL)
        let msg
        try { msg = JSON.parse(data.toString('utf8')) } catch { return drop(CLOSE.PROTOCOL) }
        if (msg?.type !== 'open' || msg.v !== 2 || msg.align !== 1 || msg.session !== pend.terminalId) {
          return drop(CLOSE.PROTOCOL)
        }
        ctx.opened = true
        sendText({ type: 'ready', v: 2, align: 1, session: pend.terminalId })
        const ok = await sendSnapshot()
        if (ok === 'dead') return
        if (!ok) { sendText({ type: 'error', message: 'unaligned' }); return drop(CLOSE.PROTOCOL) }
        return
      }
      // Nothing reaches the broker before handshake AND a valid alignment.
      if (!ctx.aligned) return drop(CLOSE.PROTOCOL)
      if (!isBinary) {
        let msg
        try { msg = JSON.parse(data.toString('utf8')) } catch { return }
        if (msg?.type === 'align') {
          // A stalled client asks for the current screen — resync, no replay.
          const ok = await sendSnapshot()
          if (ok === 'dead') return
          if (!ok) { sendText({ type: 'error', message: 'unaligned' }); return drop(CLOSE.PROTOCOL) }
        } else if (msg?.type === 'open') {
          return drop(CLOSE.PROTOCOL) // duplicate open
        }
        return
      }
      const frame = decodeFrame(Buffer.from(data))
      if (!frame) return drop(CLOSE.PROTOCOL)
      if (frame.channel !== 0) return drop(CLOSE.PROTOCOL)
      switch (frame.kind) {
        case KIND.CREDIT: {
          if (frame.payload.length !== 4) return drop(CLOSE.PROTOCOL)
          ctx.credit = Math.min(ctx.credit + frame.payload.readUInt32BE(0), CREDIT_CAP)
          void enqueue(pump) // chains after this job — never awaited into it
          break
        }
        case KIND.RESIZE: {
          if (frame.payload.length !== 4) return drop(CLOSE.PROTOCOL)
          const cols = frame.payload.readUInt16BE(0)
          const rows = frame.payload.readUInt16BE(2)
          await rpc({ verb: 'resize', cols, rows }, 'terminal.resize')
          break
        }
        case KIND.FACTS: {
          if (frame.payload.length > FACTS_MAX) return drop(CLOSE.PROTOCOL)
          let facts
          try { facts = JSON.parse(frame.payload.toString('utf8')) } catch { return drop(CLOSE.PROTOCOL) }
          const cols = facts?.cols, rows = facts?.rows
          if (!Number.isInteger(cols) || !Number.isInteger(rows)) return drop(CLOSE.PROTOCOL)
          await rpc({ verb: 'resize', cols, rows }, 'terminal.resize')
          break
        }
        case KIND.DATA:
        case KIND.AUTO_INPUT:
          await rpc({ verb: 'input', data_b64: frame.payload.toString('base64') }, 'terminal.input')
          break
        case KIND.CLOSE:
          return drop(CLOSE.DETACH)
        case KIND.PING:
          sendFrame(KIND.PONG, frame.payload)
          break
        default:
          return drop(CLOSE.PROTOCOL)
      }
    }

    ws.on('message', (data, isBinary) => { void enqueue(() => handleMessage(data, isBinary)) })
    ws.on('error', () => drop())
  }

  async function dispose() {
    disposed = true
    for (const { disposer } of pending.values()) {
      try { disposer() } catch { /* gone */ }
    }
    pending.clear()
    const waits = []
    for (const ctx of [...live]) {
      ctx.drop()
      waits.push(ctx.tail)
      waits.push(new Promise((resolve) => {
        ctx.ws.once('close', resolve)
        setTimeout(resolve, 200)
      }))
    }
    await Promise.allSettled(waits)
    try { wss.close() } catch { /* noServer close is advisory */ }
  }

  return { issueLocator, dispose }
}
