/**
 * registerWebRoutes — dsh-nano-terminal web surfaces, bound through the single
 * createWebRegistrar mechanism (CF1115 / P1-04).
 *
 * One batch: 4 http-exact + 1 http-prefix + 1 upgrade-exact bindings from the
 * baked BINDING_TABLE (lib/bindings.js). deps are injected so this module does
 * not re-import ws.js (avoids duplicate Attach/FrameParser class identity in
 * the bundle) and so tests can drive the real registration against a mock ctx.
 *
 * Returns the registrar's idempotent dispose (already folded into ctx.effect).
 */

import { createWebRegistrar } from 'dsh-interface/host'
import { ensurePerfReviewHost, handleHostRead } from 'dsh-performance-review/host'
import { BINDING_TABLE } from '../../lib/bindings.js'
import { recoverAttach } from '../shared/align.js'
import { stampOrKeep8 } from '../shared/ctxref.js'

const HOST_PLUGIN = 'dsh-nano-terminal'
let _hostApi = null
const hostApi = () => {
  if (_hostApi === null) {
    const host = ensurePerfReviewHost()
    _hostApi = typeof host.hostJoin === 'function' ? host.hostJoin(HOST_PLUGIN) : null
  }
  return _hostApi
}
const hostSpan = (name, fn) => (hostApi()?.hostSpan ? hostApi().hostSpan(name, fn) : fn())
const hostCount = (name, n = 1) => { try { hostApi()?.count?.(name, n) } catch { /* best-effort */ } }

export function registerWebRoutes(ctx, deps) {
  const { registry, bus, mcp, laneStatus, ws } = deps
  const { handshake, FrameParser, sendBinary, sendText, sendClose, encodeFrame, parseChannel, Attach, FR_KIND } = ws

  // -- data plane: WebSocket upgrade (upgrade + exact binding) ----------------
  const streamHandler = (req, socket) => {
      if (!handshake(req, socket)) return
      const url = new URL(req.url ?? '/', 'http://localhost')
      const attachId = url.searchParams.get('session')
      let record = null
      let ready = false
      let attach = null

      const parser = new FrameParser((opcode, payload) => {
        if (opcode === 0x08) {
          socket.end()
          return
        }
        if (opcode === 0x09) {
          socket.write(encodeFrame(payload, 0x0A))
          return
        }
        if (!ready) {
          if (opcode !== 0x01) return
          let msg
          try {
            msg = JSON.parse(payload.toString('utf8'))
          } catch {
            sendClose(socket, 1003, 'expected open frame')
            return
          }
          void openFlow(msg)
          return
        }
        if (opcode === 0x02 && record) {
          if (attach && attach.v === 2) {
            const fr = parseChannel(payload)
            if (!fr) return
            if (fr.kind === FR_KIND.CREDIT) {
              attach.onCredit(fr.payload.readUInt32BE(0))
            } else if (fr.kind === FR_KIND.DATA) {
              // interactive bytes count as human input — the gate holds them
              // while an agent delivery is in flight (never interleaves)
              hostCount('dnt-ws-in-bytes', fr.payload.length)
              hostCount('dnt-ws-in-msgs')
              void record.writeInput(fr.payload, 'human').then((r) => {
                if (r?.held) attach.channel(1, FR_KIND.HELD)
              }).catch(() => {})
            } else if (fr.kind === FR_KIND.AUTO_INPUT) {
              // terminal auto-replies bypass the gate entirely (hc rule)
              hostCount('dnt-ws-in-bytes', fr.payload.length)
              hostCount('dnt-ws-in-msgs')
              void record.writeInput(fr.payload, 'automatic').catch(() => {})
            } else if (fr.kind === FR_KIND.FACTS) {
              // headless attach reports its viewport — adopt its geometry
              try {
                const f = JSON.parse(fr.payload.toString('utf8'))
                if (f.cols && f.rows) void record.resize(f.cols, f.rows)
              } catch { /* ignore malformed facts */ }
            } else if (fr.kind === FR_KIND.RESIZE && fr.payload.length >= 4) {
              void record.resize(fr.payload.readUInt16BE(0), fr.payload.readUInt16BE(2))
            }
          } else {
            void record.writeInput(payload, 'human').catch(() => {})
          }
        } else if (opcode === 0x01) {
          try {
            const msg = JSON.parse(payload.toString('utf8'))
            if (msg.type === 'resize' && record) void record.resize(msg.cols, msg.rows)
            if (msg.type === 'align' && attach) attach.align()
            if (msg.type === 'ping') sendText(socket, { type: 'pong', t: Date.now() })
          } catch { /* ignore malformed control */ }
        }
      })

      socket.on('data', (chunk) => parser.feed(chunk))
      socket.on('error', () => {})

      async function openFlow(msg) {
        try {
          const attachRef = attachId ?? msg.session
          if (attachRef) {
            // ?session= or open.session accepts id | name | addr | ctx ref
            record = registry.resolve(attachRef)
            if (!record) throw new Error('no such session')
            // An attach can also graft ctx-ref anchors onto a session that
            // predates them (or was spawned outside a pane) — set-labels
            // merges and emits the labels event, so nothing is forged.
            const graft = {
              ...(stampOrKeep8(msg.tid) ? { t: stampOrKeep8(msg.tid) } : {}),
              ...(stampOrKeep8(msg.conv) ? { conv: stampOrKeep8(msg.conv) } : {}),
            }
            if (Object.keys(graft).length) record.setLabels(graft)
          } else if (msg.type === 'open') {
            record = await registry.create({
              sessionId: msg.owner,
              shell: msg.shell,
              args: msg.args,
              cwd: msg.cwd,
              cols: msg.cols,
              rows: msg.rows,
              title: msg.title,
              owner: msg.owner,
              // ctx-ref anchor labels: `t` = the pane's 8-hex term stamp,
              // `conv` = its conversation session stamp (ctxref.js format).
              // Both are normalized to 8-hex here — the client sends `tid` as
              // a full uuid and `conv` already stamped; stampOrKeep8 covers both.
              labels: {
                ...(stampOrKeep8(msg.tid) ? { t: stampOrKeep8(msg.tid) } : {}),
                ...(stampOrKeep8(msg.conv) ? { conv: stampOrKeep8(msg.conv) } : {}),
              },
            })
          } else {
            throw new Error('expected {type:"open"}')
          }
          // pending placeholder: spawn the fresh shell on first attach
          if (record.pending) await hostSpan('dnt-attach', () => registry.spawnPending(record))
          // v2 negotiated via open.v or ?v=2 — framed channels + credit
          const wantV2 = msg.v === 2 || url.searchParams.get('v') === '2'
          attach = new Attach(socket, record)
          attach.v = wantV2 ? 2 : 1
          // 新客户端声明 align:1 时，重连走当前屏，不再把 512KiB 原始 replay 当恢复主路径。
          attach.alignMode = wantV2 && msg.align === 1
          record.attached.set(socket, attach)
          socket.once('close', () => { record?.detach(socket); record?.attached.delete(socket) })
          ready = true
          sendText(socket, {
            type: 'ready',
            v: attach.v,
            align: attach.alignMode ? 1 : 0,
            platform: process.platform,
            session: record.id,
            addr: record.addr,
            title: record.title,
            lane: record.lane,
            exited: record.exited,
            replayBytes: attach.alignMode ? 0 : record.replayLen,
          })
          recoverAttach({
            alignMode: attach.alignMode,
            align: () => attach.align(),
            replay: () => record.replayInto(socket, (s, chunk) => attach.data(chunk)),
          })
        } catch (err) {
          sendText(socket, { type: 'error', message: String(err?.message ?? err) })
          sendClose(socket, 1008, 'open failed')
        }
      }
  }

  // -- control plane: MCP JSON-RPC + management REST --------------------------
  const HANDLERS = {
    'dnt.stream': streamHandler,
    'dnt.mcp': async (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405).end()
        return
      }
      const body = await readBody(req, 512 * 1024)
      let parsed
      try {
        parsed = JSON.parse(body)
      } catch {
        res.writeHead(400, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }))
        return
      }
      mcp.audit({ op: 'mcp.req', method: Array.isArray(parsed) ? 'batch' : parsed?.method })
      const reply = await mcp.handleRpc(parsed)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(reply === undefined ? '' : JSON.stringify(reply))
    },
    'dnt.sessions': async (req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ sessions: registry.list() }))
    },
    // SSE event stream: subscribe → snapshot first frame, then live events.
    // ?since=<seq> resumes from a position; falling behind the ring answers
    // with {missed:true,snapshot}. Agents can poll the same data via
    // term.events without holding a connection.
    'dnt.events': async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const since = Number(url.searchParams.get('since')) || 0
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      })
      const unsub = bus.subscribe((ev) => {
        try {
          res.write(`data: ${JSON.stringify(ev)}\n\n`)
        } catch { /* stream closing */ }
      }, { since })
      req.on('close', unsub)
    },
    'dnt.health': async (req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, lanes: laneStatus(), sessions: registry.count() }))
    },
    'dnt.session.close': async (req, res) => {
      const m = (req.url ?? '').match(/\/session\/([^/]+)\/close$/)
      if (req.method !== 'POST' || !m) {
        res.writeHead(404).end()
        return
      }
      const ok = await registry.close(decodeURIComponent(m[1]), 'route')
      res.writeHead(ok ? 200 : 404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ closed: ok }))
    },
    // Read-only whole-process perf view; only ?since is accepted (T-O-PRE1116-10).
    'dnt.perf-review.host': (req, res) => handleHostRead(req, res, ensurePerfReviewHost()),
  }

  const registrar = createWebRegistrar({
    plugin: 'dsh-nano-terminal',
    bindings: BINDING_TABLE.map(b => ({ ...b, handler: HANDLERS[b.id] })),
    observe: event => globalThis[Symbol.for('dsh.perfReviewHost.v2')]?.observe?.(event),
  })
  return registrar.registerAll(ctx)
}

async function readBody(req, cap) {
  const chunks = []
  let len = 0
  for await (const c of req) {
    len += c.length
    if (len > cap) throw new Error('body too large')
    chunks.push(c)
  }
  return Buffer.concat(chunks).toString('utf8')
}
