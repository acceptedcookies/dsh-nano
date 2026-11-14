// Terminal lanes: the transport backends behind each pane.
// Every lane exposes { kind, open(), write(), resize(), close(), onOutput, onExit }.
//   local   — ws to this dsh host's /dsh-nano-terminal/stream (dnt-ws-v1)
//   mcp     — remote MCP endpoint: term.session.create then ws attach
//   isolate — in-process wasm lane (workerd/v8 placeholder)

const ROUTE = '/dsh-nano-terminal'

/**
 * WebSocket target for the same-host data plane.
 * In the dsh desktop app the page runs on `dsh-app://app`; requests at that
 * scheme are proxied via a custom protocol handler, but WebSocket upgrades at
 * it are rejected. The desktop host provides `__DSH_TRANSPORT__.streamBaseUrl`
 * — the real host origin — for ws connect; on plain web it is absent and
 * same-origin location.host is used.
 */
function streamBase() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const streamBaseUrl = globalThis.__DSH_TRANSPORT__?.streamBaseUrl
  if (streamBaseUrl) return new URL(streamBaseUrl).origin.replace(/^http/, 'ws') + ROUTE + '/stream'
  return `${proto}://${location.host}${ROUTE}/stream`
}

// dnt-ws-v2 framed channel: [channel u32][kind u8][len u32][payload]
const FR_DATA = 0, FR_CREDIT = 1, FR_AUTO_INPUT = 6, FR_SNAPSHOT = 7
const CREDIT_INIT = 256 * 1024

function encChannel(channel, kind, payload) {
  const out = new Uint8Array(9 + payload.length)
  const v = new DataView(out.buffer)
  v.setUint32(0, channel)
  v.setUint8(4, kind)
  v.setUint32(5, payload.length)
  out.set(payload, 9)
  return out
}

export class LocalLane {
  constructor({ sessionId, cols, rows, shell, cwd, attach = null }) {
    this.kind = 'local'
    this.sessionId = sessionId
    this.attach = attach // re-attach to a host-side session id | name | addr
    this.cols = cols
    this.rows = rows
    this.shell = shell
    this.cwd = cwd
    this.onOutput = () => {}
    this.onExit = () => {}
    this.onReady = () => {}
    this.ws = null
    this.id = null
    this.closed = false
    this.v = 1 // negotiated protocol version
    this.credit = 0 // bytes consumed, to be reported
  }

  open() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(streamBase())
      ws.binaryType = 'arraybuffer'
      this.ws = ws
      let opened = false
      const timer = setTimeout(() => reject(new Error('open timeout')), 10_000)
      ws.onopen = () => {
        opened = true
        if (this.attach) {
          ws.send(JSON.stringify({ type: 'open', v: 2, session: this.attach, owner: this.sessionId }))
        } else {
          ws.send(JSON.stringify({
            type: 'open', v: 2, owner: this.sessionId, shell: this.shell,
            cwd: this.cwd, cols: this.cols, rows: this.rows,
          }))
        }
      }
      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          let msg
          try { msg = JSON.parse(ev.data) } catch { return }
          if (msg.type === 'ready') {
            clearTimeout(timer)
            this.id = msg.session
            this.addr = msg.addr
            this.v = msg.v ?? 1
            this.onReady(msg)
            resolve(msg)
          } else if (msg.type === 'error') {
            clearTimeout(timer)
            reject(new Error(msg.message))
          } else if (msg.type === 'exit') {
            this.onExit(msg)
          }
          return
        }
        const buf = new Uint8Array(ev.data)
        if (this.v === 2) {
          this.#onFrame(buf)
        } else {
          this.onOutput(buf)
        }
      }
      ws.onerror = () => {
        clearTimeout(timer)
        reject(new Error('websocket error'))
      }
      ws.onclose = () => {
        if (!opened) {
          clearTimeout(timer)
          reject(new Error('websocket closed during open'))
          return
        }
        if (!this.closed) this.onExit({ reason: 'ws-close' })
      }
    })
  }

  #onFrame(buf) {
    if (buf.length < 9) return
    const v = new DataView(buf.buffer, buf.byteOffset)
    const kind = v.getUint8(4)
    const len = v.getUint32(5)
    const payload = buf.subarray(9, 9 + len)
    if (kind === FR_DATA || kind === FR_SNAPSHOT) {
      this.onOutput(payload)
      // credit: report bytes consumed so the host keeps streaming
      const credit = new Uint8Array(4)
      new DataView(credit.buffer).setUint32(0, payload.length)
      this.ws?.send(encChannel(0, FR_CREDIT, credit))
    }
    // SNAPSHOT payload already contains its own clear-screen escapes;
    // HELD/FACTS/etc. have no client action.
  }

  write(bytes) {
    if (this.ws?.readyState !== 1) return
    const payload = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    this.ws.send(this.v === 2 ? encChannel(0, FR_DATA, payload) : payload)
  }

  /** Terminal auto-replies (DA/CPR) — bypass the input gate on the host. */
  writeAuto(bytes) {
    if (this.ws?.readyState !== 1) return
    const payload = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    this.ws.send(this.v === 2 ? encChannel(0, FR_AUTO_INPUT, payload) : payload)
  }

  resize(cols, rows) {
    this.cols = cols
    this.rows = rows
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ type: 'resize', cols, rows }))
  }

  close() {
    this.closed = true
    try { this.ws?.close() } catch { /* gone */ }
    if (this.id) {
      fetch(`${ROUTE}/session/${encodeURIComponent(this.id)}/close`, { method: 'POST' }).catch(() => {})
    }
  }
}

export class McpLane {
  constructor({ url, cols, rows, sessionId }) {
    this.kind = 'mcp'
    this.url = url
    this.cols = cols
    this.rows = rows
    this.sessionId = sessionId
    this.onOutput = () => {}
    this.onExit = () => {}
    this.onReady = () => {}
    this.ws = null
    this.id = null
    this.closed = false
  }

  async open() {
    const rpc = await fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'term.session.create',
          arguments: { cols: this.cols, rows: this.rows, sessionId: this.sessionId },
        },
      }),
    })
    const reply = await rpc.json()
    const result = reply?.result?.structuredContent
    if (!result?.id) {
      throw new Error(reply?.error?.message ?? reply?.result?.content?.[0]?.text ?? 'mcp create failed')
    }
    this.id = result.id
    const attach = result.attach?.url ?? new URL(result.attach?.path ?? '/dsh-nano-terminal/stream', this.url).toString()
    const wsUrl = new URL(attach)
    wsUrl.searchParams.set('session', this.id)
    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss' : 'ws'
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl.toString())
      ws.binaryType = 'arraybuffer'
      this.ws = ws
      const timer = setTimeout(() => reject(new Error('attach timeout')), 10_000)
      ws.onopen = () => ws.send(JSON.stringify({ type: 'attach' }))
      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          let msg
          try { msg = JSON.parse(ev.data) } catch { return }
          if (msg.type === 'ready') {
            clearTimeout(timer)
            this.onReady(msg)
            resolve(msg)
          } else if (msg.type === 'error') {
            clearTimeout(timer)
            reject(new Error(msg.message))
          } else if (msg.type === 'exit') {
            this.onExit(msg)
          }
          return
        }
        this.onOutput(new Uint8Array(ev.data))
      }
      ws.onerror = () => { clearTimeout(timer); reject(new Error('websocket error')) }
      ws.onclose = () => { if (!this.closed) this.onExit({ reason: 'ws-close' }) }
    })
    return { session: this.id }
  }

  write(bytes) {
    if (this.ws?.readyState === 1) this.ws.send(bytes)
  }

  resize(cols, rows) {
    this.cols = cols
    this.rows = rows
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ type: 'resize', cols, rows }))
  }

  close() {
    this.closed = true
    try { this.ws?.close() } catch { /* gone */ }
    if (this.id) {
      fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: Date.now(), method: 'tools/call',
          params: { name: 'term.session.close', arguments: { id: this.id } },
        }),
      }).catch(() => {})
    }
  }
}

/** Isolate lane: terminal core inside our own wasm/JS — echo/REPL scaffold for
 * workerd/v8 backends. Proves the lane contract without a remote host. */
export class IsolateLane {
  constructor({ sessionId }) {
    this.kind = 'isolate'
    this.sessionId = sessionId
    this.onOutput = () => {}
    this.onExit = () => {}
    this.onReady = () => {}
    this.buffer = ''
    this.closed = false
    const enc = new TextEncoder()
    this.enc = enc
    this.id = 'isolate-' + Math.random().toString(36).slice(2, 10)
  }

  open() {
    queueMicrotask(() => {
      this.onReady({ session: this.id, lane: 'isolate' })
      // dim one-line notice, no hand-drawn chrome inside the buffer
      this.onOutput(this.enc.encode(
        '\x1b[2m— isolate lane · wasm instance · echo mode —\x1b[0m\r\n' +
        '\x1b[1;32misolate>\x1b[0m ',
      ))
    })
    return Promise.resolve({ session: this.id })
  }

  write(bytes) {
    if (this.closed) return
    // naive echo REPL: mirror input, newline → prompt
    for (const b of bytes) {
      if (b === 0x0d) {
        this.buffer += '\r\n'
        this.onOutput(this.enc.encode('\r\n\x1b[1;32misolate>\x1b[0m '))
      } else if (b === 0x7f) {
        this.buffer = this.buffer.slice(0, -1)
        this.onOutput(this.enc.encode('\b \b'))
      } else {
        this.buffer += String.fromCharCode(b)
        this.onOutput(new Uint8Array([b]))
      }
    }
  }

  resize() {}

  close() {
    this.closed = true
    this.onExit({ reason: 'closed' })
  }
}

export function makeLane(spec, meta) {
  switch (spec.lane) {
    case 'mcp':
      return new McpLane({ url: spec.url, cols: meta.cols, rows: meta.rows, sessionId: meta.sessionId })
    case 'isolate':
      return new IsolateLane({ sessionId: meta.sessionId })
    case 'local':
    default:
      return new LocalLane({ sessionId: meta.sessionId, cols: meta.cols, rows: meta.rows, shell: spec.shell, cwd: spec.cwd, attach: spec.attach ?? null })
  }
}
