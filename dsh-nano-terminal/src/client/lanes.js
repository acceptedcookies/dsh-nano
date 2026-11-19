// Terminal lanes: the transport backends behind each pane.
// Every lane exposes { kind, open(), write(), resize(), close(), onOutput, onExit }.
//   local   — ws to this dsh host's /dsh-nano-terminal/stream (dnt-ws-v1)
//   mcp     — remote MCP endpoint: term.session.create then ws attach
//   local and mcp only. There is no isolate lane and no sandbox lane.

import { decodeMcpReply } from 'dsh-interface/host'
import { handleFrame } from './frames.js'
import { perf } from './perf.js'
import { stampOrKeep8 } from '../shared/ctxref.js'

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
const FR_DATA = 0, FR_CREDIT = 1, FR_RESIZE = 2, FR_CLOSE = 3, FR_AUTO_INPUT = 6
const CREDIT_INIT = 256 * 1024
const DNLS_CONTRACT = 'dnls.control/1'
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/

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
  constructor({ sessionId, cols, rows, shell, cwd, attach = null, tid = null, conv = null }) {
    this.kind = 'local'
    this.sessionId = sessionId
    this.attach = attach // re-attach to a host-side session id | name | addr
    this.tid = tid // 8-hex term stamp → host label `t` (ctx-ref anchor)
    this.conv = conv // 8-hex conversation stamp → host label `conv`
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
    this.alignMode = false
    this.dropping = false
    this.alignSeq = null
    this.platform = null
    this.onAlign = () => {}
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
          ws.send(JSON.stringify({ type: 'open', v: 2, align: 1, session: this.attach, owner: this.sessionId, tid: this.tid, conv: this.conv }))
        } else {
          ws.send(JSON.stringify({
            type: 'open', v: 2, align: 1, owner: this.sessionId, shell: this.shell,
            cwd: this.cwd, cols: this.cols, rows: this.rows, tid: this.tid, conv: this.conv,
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
            // The session's authoritative ctx anchors — a re-attaching pane
            // adopts the host's, so a copied ref resolves to THIS session
            // even after the pane's own tid was regenerated (layout loss).
            this.boundCtx = msg.ctx ?? null
            this.v = msg.v ?? 1
            this.platform = msg.platform ?? null
            // 能对齐的连接在第一帧快照到达前丢掉原始字节，避免把 replay 灌进 wasm。
            this.alignMode = this.v === 2 && msg.align === 1
            this.dropping = this.alignMode
            this.alignSeq = null
            // ready 之前算出的尺寸可能没发出去（socket 还在 CONNECTING）。
            // 这里补一次，保证 PTY 和客户端提交的尺寸一致。
            if (this.ws?.readyState === 1) {
              this.ws.send(JSON.stringify({ type: 'resize', cols: this.cols, rows: this.rows }))
            }
            this.onReady(msg)
            resolve(msg)
          } else if (msg.type === 'error') {
            clearTimeout(timer)
            reject(new Error(msg.message))
          } else if (msg.type === 'exit') {
            this.onExit(msg)
          } else if (msg.type === 'stalled') {
            this.requestAlign()
          }
          return
        }
        const buf = new Uint8Array(ev.data)
        if (this.v === 2) {
          this.#onFrame(buf)
        } else {
          perf.count('dnt-ws-in-bytes', buf.length)
          perf.count('dnt-ws-in-msgs')
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
    // 到达即写入。不把快照载荷当普通字节，也不等绘制才回信用。
    handleFrame(this, buf, {
      onOutput: (bytes) => this.onOutput(bytes),
      onAlign: (snap) => this.onAlign(snap),
      credit: (n) => this.#credit(n),
    })
  }

  #credit(n) {
    const credit = new Uint8Array(4)
    new DataView(credit.buffer).setUint32(0, n)
    this.ws?.send(encChannel(0, FR_CREDIT, credit))
  }

  /** 页面刚从冻结恢复：丢掉积压，等一帧当前屏对齐。 */
  requestAlign() {
    if (!this.alignMode || this.ws?.readyState !== 1) return
    if (this.dropping) return
    this.dropping = true
    this.ws.send(JSON.stringify({ type: 'align' }))
  }

  write(bytes) {
    if (this.ws?.readyState !== 1) return
    const payload = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    const frame = this.v === 2 ? encChannel(0, FR_DATA, payload) : payload
    perf.count('dnt-ws-out-bytes', frame.length)
    this.ws.send(frame)
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
  constructor({ url, cols, rows, sessionId, sandbox = null }) {
    this.kind = 'mcp'
    this.url = url
    this.cols = cols
    this.rows = rows
    this.sessionId = sessionId
    // sandbox: managed dnls.control/1 object target — never the legacy
    // term.session.create/sessionId wire of a third-party MCP endpoint.
    this.sandbox = sandbox
    this.onOutput = () => {}
    this.onExit = () => {}
    this.onReady = () => {}
    this.onAlign = () => {}
    this.ws = null
    this.id = null
    this.closed = false
    this.dropping = false
    this.alignSeq = null
  }

  /**
   * The control endpoint must be a same-origin http(s) URL — the managed
   * contract is selected by the caller's announced contractVersion
   * (T-O-45), never by plugin name or URL features.
   */
  #sameOriginEndpoint() {
    try {
      const u = new URL(this.url)
      if ((u.protocol !== 'http:' && u.protocol !== 'https:') || u.search || u.hash || u.username || u.password) return false
      if (typeof location !== 'undefined' && u.origin !== location.origin) return false
      return true
    } catch { return false }
  }

  async open() {
    if (this.sandbox) return this.#openSandbox()
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
    /* Three-layer MCP decode via the shared decodeMcpReply (CF1115 / P3-01):
       rpc.error → tool.isError → result.structuredContent. attach honesty is
       still the caller's own check (#wsUrl throws on a missing attach.url). */
    const decoded = decodeMcpReply(reply)
    if (!decoded.ok) throw new Error(decoded.message ?? 'mcp create failed')
    const result = decoded.data
    if (!result?.id) {
      throw new Error('mcp create failed')
    }
    this.id = result.id
    this.wsUrl = this.#wsUrl(result)
    await this.#connect(true)
    return { session: this.id }
  }

  #wsUrl(result) {
    const raw = result.attach?.url
    if (!raw) throw new Error('attach.url missing')
    if (!/^(ws|wss):/.test(raw)) throw new Error('attach.url must be an absolute ws or wss URL')
    return new URL(raw)
  }

  /** One managed tools/call carrying the dnls.control/1 envelope proof. */
  async #call(name, args) {
    const rpc = await fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: Date.now(), method: 'tools/call',
        params: { name, arguments: args, _meta: { 'dnls/contract': DNLS_CONTRACT } },
      }),
    })
    const decoded = decodeMcpReply(await rpc.json())
    if (!decoded.ok) throw new Error(decoded.message ?? `${name} failed`)
    // Every managed object result carries the contract envelope — a body
    // without it is not dnls.control/1 and must not be trusted.
    if (name !== 'sandbox.contract' && decoded.data?.contractVersion !== DNLS_CONTRACT) {
      throw new Error(`${name} result contract mismatch`)
    }
    return decoded.data
  }

  /** A managed attach target: exact ids, dnt-ws-v2, credential-free same-origin ws URL. */
  #sandboxUrl(sandboxId, terminalId, result) {
    if (result?.sandboxId !== sandboxId || result?.terminalId !== terminalId || result?.attach?.protocol !== 'dnt-ws-v2') {
      throw new Error('attach target mismatch')
    }
    const url = new URL(String(result.attach.url))
    const base = new URL(this.url)
    // http(s) MCP base converted to ws(s): cross-origin, query, hash and
    // userinfo are all refused — the serial carries no credential.
    const wsScheme = base.protocol === 'https:' ? 'wss:' : 'ws:'
    if (url.protocol !== wsScheme || url.host !== base.host ||
        url.search || url.hash || url.username || url.password) {
      throw new Error('attach.url is not a credential-free same-origin ws URL')
    }
    return url
  }

  async #openSandbox() {
    const target = this.sandbox
    // An announced contract we do not speak fails — never a legacy fallback.
    if (target.contractVersion !== DNLS_CONTRACT) throw new Error('unrecognized managed contract version')
    if (!this.#sameOriginEndpoint()) throw new Error('managed sandbox requires a same-origin http endpoint')
    const idOk = (v) => typeof v === 'string' && SAFE_ID.test(v)
    if (!idOk(target.sandboxId)) throw new Error('explicit sandbox target required')
    if (target.terminalId != null) {
      // Salvage names only the terminal — openId/paneId are create-only.
      if (!idOk(target.terminalId)) throw new Error('explicit terminal target required')
    } else if (!idOk(target.paneId) || !idOk(target.openId)) {
      throw new Error('explicit create target required')
    }
    // Read-only discovery first: exact contract version, then capabilities.
    const contract = await this.#call('sandbox.contract', {})
    if (contract?.contractVersion !== DNLS_CONTRACT) throw new Error('sandbox contract version mismatch')
    const caps = new Set(contract?.capabilities ?? [])
    if (!caps.has('term.session.attach') || !caps.has('term.session.create')) throw new Error('sandbox contract lacks terminal capabilities')
    if (target.terminalId) {
      // Salvage an existing terminal only by attach — never recreated.
      this.sandboxRef = { sandboxId: target.sandboxId, terminalId: target.terminalId }
    } else {
      // One user gesture, one create; the returned refs are the stable identity.
      const created = await this.#call('term.session.create', {
        sandboxId: target.sandboxId, paneId: target.paneId, openId: target.openId,
        cols: this.cols, rows: this.rows, ...(target.service !== undefined ? { service: target.service } : {}),
      })
      if (created?.sandboxId !== target.sandboxId || !SAFE_ID.test(created?.terminalId ?? '')) {
        throw new Error('create target mismatch')
      }
      this.sandboxRef = { sandboxId: created.sandboxId, terminalId: created.terminalId }
    }
    this.id = this.sandboxRef.terminalId
    this.wsUrl = await this.#freshAttach()
    await this.#connect(true)
    return { session: this.id }
  }

  /** One fresh attach under the same contract — transport-loss only. */
  async #freshAttach() {
    const { sandboxId, terminalId } = this.sandboxRef
    const attached = await this.#call('term.session.attach', { sandboxId, terminalId })
    return this.#sandboxUrl(sandboxId, terminalId, attached)
  }

  /** Frame traffic through the shared v2 path (align + credit) for sandbox. */
  #onFrame(buf) {
    handleFrame(this, buf, {
      onOutput: (bytes) => this.onOutput(bytes),
      onAlign: (snap) => {
        // The first valid snapshot is the input gate: streamReady unlocks
        // write()/writeAuto(); onAlign still reports every re-alignment.
        this.streamReady = true
        this.onAlign(snap)
      },
      credit: (n) => this.#credit(n),
    })
  }

  #credit(n) {
    const payload = new Uint8Array(4)
    new DataView(payload.buffer).setUint32(0, n)
    this.ws?.send(encChannel(0, FR_CREDIT, payload))
  }

  /** Attach once. A dropped socket may be retried a single time, without replaying writes. */
  #connect(first) {
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    if (first) {
      this.retried = false
      this.exited = false
    } else this.retried = true
    const previous = this.ws
    if (previous) {
      previous.onclose = null
      try { previous.close() } catch { /* replaced */ }
    }
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl.toString())
      ws.binaryType = 'arraybuffer'
      this.ws = ws
      const timer = setTimeout(() => reject(new Error('attach timeout')), 10_000)
      ws.onopen = () => ws.send(JSON.stringify(
        this.sandbox ? { type: 'open', v: 2, align: 1, session: this.id } : { type: 'open', session: this.id },
      ))
      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          let msg
          try { msg = JSON.parse(ev.data) } catch { return }
          if (msg.type === 'ready') {
            if (this.sandbox && (msg.v !== 2 || msg.align !== 1 || msg.session !== this.id)) {
              clearTimeout(timer)
              this.exited = true
              try { ws.close() } catch { /* gone */ }
              reject(new Error('ready mismatch'))
              return
            }
            clearTimeout(timer)
            this.attempt = 0
            if (this.sandbox) {
              // Aligned mode: frames carry a u32 seq that routeFrame strips
              // only in alignMode; bytes arrive only after a snapshot, and
              // the first credit unlocks the host's stream.
              this.alignMode = true
              this.dropping = true
              this.alignSeq = null
              this.#credit(CREDIT_INIT)
            }
            this.onReady(msg)
            resolve(msg)
          } else if (msg.type === 'error') {
            clearTimeout(timer)
            reject(new Error(msg.message))
          } else if (msg.type === 'exit') {
            this.exited = true
            clearTimeout(this.reconnectTimer)
            this.onExit(msg)
          } else if (msg.type === 'stalled' && this.sandbox) {
            this.dropping = true
            this.ws?.send(JSON.stringify({ type: 'align' }))
          }
          return
        }
        const buf = new Uint8Array(ev.data)
        perf.count('dnt-ws-in-bytes', buf.length)
        perf.count('dnt-ws-in-msgs')
        if (this.sandbox) this.#onFrame(buf)
        else this.onOutput(buf)
      }
      ws.onerror = () => { clearTimeout(timer); reject(new Error('websocket error')) }
      ws.onclose = (ev) => {
        // 1002/1008 are policy and protocol denials — the only legitimate
        // reconnect cause is transport loss on an otherwise-valid session.
        if (ev?.code === 1002 || ev?.code === 1008) this.exited = true
        if (this.closed || this.exited || this.ws !== ws) return
        if (this.retried) {
          this.onExit({ reason: 'reconnect-failed' })
          return
        }
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = setTimeout(async () => {
          if (this.closed || this.exited) return
          if (this.sandbox) {
            // Transport loss only: one fresh attach under the same contract —
            // never a create, never an old URL or input replay.
            try {
              this.wsUrl = await this.#freshAttach()
            } catch {
              this.onExit({ reason: 'reconnect-failed' })
              return
            }
            // A close while the fresh attach was in flight wins — no new socket.
            if (this.closed || this.exited) return
          }
          this.#connect(false).catch(() => { this.onExit({ reason: 'reconnect-failed' }) })
        }, 2000)
      }
    })
  }

  write(bytes) {
    if (this.ws?.readyState !== 1) return
    if (!this.sandbox) {
      this.ws.send(bytes) // third-party wire: exactly what the caller handed us
      return
    }
    // No input before strict ready AND the first aligned snapshot.
    if (!this.streamReady) return
    const payload = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    this.ws.send(encChannel(0, FR_DATA, payload))
  }

  /** Terminal auto-replies (DA/CPR) — sandbox goes through the AUTO channel. */
  writeAuto(bytes) {
    if (!this.sandbox) return this.write(bytes)
    if (this.ws?.readyState !== 1 || !this.streamReady) return
    const payload = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    this.ws.send(encChannel(0, FR_AUTO_INPUT, payload))
  }

  resize(cols, rows) {
    this.cols = cols
    this.rows = rows
    if (this.ws?.readyState !== 1) return
    if (this.sandbox) {
      const payload = new Uint8Array(4)
      const view = new DataView(payload.buffer)
      view.setUint16(0, cols)
      view.setUint16(2, rows)
      this.ws.send(encChannel(0, FR_RESIZE, payload))
    } else {
      this.ws.send(JSON.stringify({ type: 'resize', cols, rows }))
    }
  }

  close() {
    this.closed = true
    clearTimeout(this.reconnectTimer)
    if (this.sandbox) {
      // A sandbox pane only detaches — the terminal outlives the socket.
      try {
        this.ws?.send(encChannel(0, FR_CLOSE, new Uint8Array(0)))
        this.ws?.close()
      } catch { /* gone */ }
      return
    }
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

export function makeLane(spec, meta) {
  switch (spec.lane) {
    case 'mcp': {
      // A recovered managed spec persists only stable refs — the endpoint is
      // rebuilt from the same-origin public contract, and McpLane re-verifies
      // dnls.control/1 before any attach.
      const managed = spec.contractVersion !== undefined || spec.sandboxId !== undefined
      const url = spec.url ?? (managed ? new URL('/nano-local-sandbox/mcp', globalThis.location?.origin).href : undefined)
      return new McpLane({
        url, cols: meta.cols, rows: meta.rows, sessionId: meta.sessionId,
        // Managed selection is by the announced contractVersion (T-O-45);
        // target fields are validated at open, never against URL features.
        sandbox: spec.contractVersion !== undefined || spec.sandboxId !== undefined ? {
          contractVersion: spec.contractVersion,
          sandboxId: spec.sandboxId,
          paneId: spec.paneId,
          openId: spec.openId,
          terminalId: spec.terminalId ?? null,
          service: spec.service,
        } : null,
      })
    }
    case 'local':
    default:
      if (spec.lane && spec.lane !== 'local') throw new Error(`lane ${spec.lane} is not available`)
      return new LocalLane({
        sessionId: meta.sessionId, cols: meta.cols, rows: meta.rows,
        shell: spec.shell, cwd: spec.cwd, attach: spec.attach ?? null,
        // ctx-ref anchor: `tid` is the pane uuid (host label `t`), `conv` the
        // conversation stamp (host label `conv`) → `[ DNT:{conv8}@{term8} ]`.
        tid: spec.tid ?? null, conv: stampOrKeep8(meta.sessionId),
      })
  }
}
