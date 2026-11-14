/** dsh-nano-terminal host half.
 *
 * Lanes:
 *   local   — ctx.subprocess.spawnTerminal (node-pty on this dsh host)
 *   mcp     — remote MCP terminal endpoint (containers, SSH hosts, nano-agent)
 *
 * Routes:
 *   GET  /dsh-nano-terminal/stream  (WebSocket upgrade, dnt-ws-v1 data plane)
 *   POST /dsh-nano-terminal/mcp     (MCP JSON-RPC control plane)
 *   GET  /dsh-nano-terminal/sessions
 *   POST /dsh-nano-terminal/session/:id/close
 *   GET  /dsh-nano-terminal/health
 */

import { join } from 'node:path'
import { SessionRegistry } from './lib/sessions.js'
import { EventBus } from './lib/events.js'
import { Persist } from './lib/persist.js'
import { createMcpHandler } from './lib/mcp.js'
import { handshake, FrameParser, sendBinary, sendText, sendClose, encodeFrame, parseChannel, Attach, FR_KIND } from './lib/ws.js'
import { registerRoutes } from './lib/route-guard.js'
import { ROUTE_TABLE } from './lib/route-table.js'

export const name = 'dsh-nano-terminal'

export const inject = ['webServer', 'connection', 'subprocess', 'sessions', 'workingDirectory', 'commands']

const ROUTE = '/dsh-nano-terminal'

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  // DSH_HOME is the harness home (~/.dsh-dev under dev); plugin install dir
  // is wiped on re-sync so durable state lives at the home root.
  const home = process.env.DSH_HOME || process.env.HOME || '/tmp'
  const stateDir = join(home, 'dsh-nano-terminal.state')
  const auditPath = join(home, 'nano-local-sandbox', 'term.audit')

  const bus = new EventBus({ audit: () => {} })
  // plugins/<pkg>/ is the install tree — re-synced from source on every host
  // restart, so session state must live at the DSH_HOME root to survive.
  const persist = new Persist(stateDir)

  const registry = new SessionRegistry({
    ctx,
    audit: () => {}, // replaced below
    sendBinary,
    sendText,
    bus,
    apiBase: `${ROUTE}/mcp`,
    persist,
  })
  bus.registry = registry
  registry.restoreSaved()

  const laneStatus = () => ({
    local: { status: 'up', backend: 'subprocess.spawnTerminal', sessions: registry.count() },
    mcp: { status: 'client', detail: 'lane connects to remote MCP endpoints; this host is itself an MCP terminal server' },
  })

  const mcp = createMcpHandler({ registry, bus, auditPath, laneStatus })
  registry.audit = mcp.audit
  bus.audit = mcp.audit

  // -- data plane: WebSocket upgrade -----------------------------------------

  const unregisterUpgrade = ctx.webServer.registerUpgrade({
    path: `${ROUTE}/stream`,
    handler: (req, socket) => {
      const rejection = ctx.get('connection')?.requestRejection?.(req)
      if (rejection !== undefined) {
        socket.end()
        return
      }
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
          if (attach.v === 2) {
            const fr = parseChannel(payload)
            if (!fr) return
            if (fr.kind === FR_KIND.CREDIT) {
              attach.onCredit(fr.payload.readUInt32BE(0))
            } else if (fr.kind === FR_KIND.DATA) {
              // interactive bytes count as human input — the gate holds them
              // while an agent delivery is in flight (never interleaves)
              void record.writeInput(fr.payload, 'human').then((r) => {
                if (r?.held) attach.channel(1, FR_KIND.HELD)
              }).catch(() => {})
            } else if (fr.kind === FR_KIND.AUTO_INPUT) {
              // terminal auto-replies bypass the gate entirely (hc rule)
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
            // ?session= or open.session accepts id | name | addr
            record = registry.resolve(attachRef)
            if (!record) throw new Error('no such session')
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
            })
          } else {
            throw new Error('expected {type:"open"}')
          }
          // pending placeholder: spawn the fresh shell on first attach
          if (record.pending) await registry.spawnPending(record)
          // v2 negotiated via open.v or ?v=2 — framed channels + credit
          const wantV2 = msg.v === 2 || url.searchParams.get('v') === '2'
          attach = new Attach(socket, record)
          attach.v = wantV2 ? 2 : 1
          record.attached.set(socket, attach)
          socket.once('close', () => { record?.detach(socket); record?.attached.delete(socket) })
          ready = true
          sendText(socket, {
            type: 'ready',
            v: attach.v,
            session: record.id,
            addr: record.addr,
            title: record.title,
            lane: record.lane,
            exited: record.exited,
            replayBytes: record.replayLen,
          })
          record.replayInto(socket, (s, chunk) => attach.data(chunk))
        } catch (err) {
          sendText(socket, { type: 'error', message: String(err?.message ?? err) })
          sendClose(socket, 1008, 'open failed')
        }
      }
    },
  })

  // -- control plane: MCP JSON-RPC + management REST --------------------------

  const unregisterRoutes = registerRoutes(ctx, [
    {
      path: `${ROUTE}/mcp`,
      methods: ['POST'],
      handler: async (req, res) => {
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
    },
    {
      path: `${ROUTE}/sessions`,
      methods: ['GET'],
      handler: async (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ sessions: registry.list() }))
      },
    },
    // SSE event stream: subscribe → snapshot first frame, then live events.
    // ?since=<seq> resumes from a position; falling behind the ring answers
    // with {missed:true,snapshot}. Agents can poll the same data via
    // term.events without holding a connection.
    {
      path: `${ROUTE}/events`,
      methods: ['GET'],
      handler: async (req, res) => {
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
    },
    {
      path: `${ROUTE}/health`,
      methods: ['GET'],
      handler: async (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: true, lanes: laneStatus(), sessions: registry.count() }))
      },
    },
    {
      path: `${ROUTE}/session`,
      methods: ['POST'],
      kind: 'prefix',
      handler: async (req, res) => {
        const m = (req.url ?? '').match(/\/session\/([^/]+)\/close$/)
        if (req.method !== 'POST' || !m) {
          res.writeHead(404).end()
          return
        }
        const ok = await registry.close(decodeURIComponent(m[1]), 'route')
        res.writeHead(ok ? 200 : 404, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ closed: ok }))
      },
    },
  ], { table: ROUTE_TABLE, plugin: 'dsh-nano-terminal' })

  // -- slash command (host side, agent-facing): /term --------------------------
  // UI-level mapping lives on the client via ctx.commandUi ('/dnt'); this host
  // command gives agents/scripts the same session operations the MCP tools do.

  const unregisterCommand = ctx.commands?.register?.({
    name: 'term',
    description: 'nano-terminal: /term new|list|close|attach|send|read|wait|keys|interrupt|keep|label|note|template|events|skill',
    input: { hint: '[new|list|close|attach|send|read|wait|keys|interrupt|keep|label|events|skill] [args]' },
    handler: async ({ rawInput }) => {
      const [sub, ...rest] = String(rawInput ?? '').trim().split(/\s+/)
      const arg = rest.join(' ')
      const rpc = async (name, args) => {
        const reply = await mcp.handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })
        const r = reply?.result
        if (r?.isError) return { kind: 'error', text: r.structuredContent?.message ?? r.content?.[0]?.text ?? 'error' }
        return { kind: 'success', text: typeof r?.structuredContent === 'object' ? JSON.stringify(r.structuredContent, null, 2) : String(r?.content?.[0]?.text ?? 'ok') }
      }
      try {
        switch (sub) {
          case '':
          case 'new': {
            const rec = await registry.create({ owner: 'slash' })
            return { kind: 'success', text: `terminal ${rec.addr} created (lane=local)` }
          }
          case 'list': {
            const rows = registry.list()
            if (!rows.length) return { kind: 'success', text: 'no terminal sessions' }
            return {
              kind: 'success',
              text: rows.map((r) => `${r.addr} ${r.title}${r.status?.state ? ` [${r.status.state}]` : ''} attached=${r.attached}${r.exited ? ' (exited)' : ''}${r.keep ? ' keep' : ''}`).join('\n'),
            }
          }
          case 'close':
            return rpc('term.session.close', { id: rest[0] })
          case 'attach': {
            const rec = registry.resolve(rest[0])
            return rec
              ? { kind: 'success', text: `attach via ws ${ROUTE}/stream?session=${rec.id}` }
              : { kind: 'error', text: 'no such session' }
          }
          case 'send': {
            const [id, ...data] = rest
            return rpc('term.send', { id, data: data.join(' ') })
          }
          case 'input': {
            const [id, ...data] = rest
            return rpc('term.session.input', { id, data: data.join(' ') })
          }
          case 'read':
            return rpc('term.session.read', { id: rest[0], lines: Number(rest[1]) || 50 })
          case 'wait':
            return rpc('term.wait', { id: rest[0], output: rest[1] ?? undefined })
          case 'keys': {
            const [id, ...keys] = rest
            return rpc('term.keys', { id, keys })
          }
          case 'interrupt':
            return rpc('term.interrupt', { id: rest[0] })
          case 'keep':
            return rpc('term.session.keep', { id: rest[0], keep: rest[1] !== 'off' })
          case 'label': {
            // /term label <id> k=v k=v  |  /term label <id> -k -k
            const [id, ...pairs] = rest
            const set = {}; const unset = []
            for (const p of pairs) {
              if (p.startsWith('-')) unset.push(p.slice(1))
              else { const i = p.indexOf('='); if (i > 0) set[p.slice(0, i)] = p.slice(i + 1) }
            }
            return rpc('term.session.label', { id, set, unset })
          }
          case 'note': {
            const [id, ...body] = rest
            return rpc('term.session.note', { id, body: body.join(' ') })
          }
          case 'template': {
            if (!rest[0]) return rpc('term.template.list', {})
            const [id, template, ...kv] = rest
            const args = {}
            for (const p of kv) { const i = p.indexOf('='); if (i > 0) args[p.slice(0, i)] = p.slice(i + 1) }
            return rpc('term.template.run', { id, template, args })
          }
          case 'events':
            return rpc('term.events', { since: Number(rest[0]) || 0 })
          case 'skill':
            return rpc('term.skill', {})
          default:
            return { kind: 'error', text: `unknown subcommand '${sub}'` }
        }
      } catch (err) {
        return { kind: 'error', text: String(err?.message ?? err) }
      }
    },
  }) ?? (() => {})

  // -- idle session sweep ------------------------------------------------------

  const sweep = setInterval(() => registry.sweep(), 60_000)

  ctx.effect(() => () => {
    clearInterval(sweep)
    bus.dispose()
    unregisterUpgrade()
    for (const un of unregisterRoutes) un()
    unregisterCommand()
    void registry.dispose()
  }, 'dsh-nano-terminal: dispose')
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

export const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-nano-terminal',
    validate(value) {
      return { value: value && typeof value === 'object' ? value : {} }
    },
  },
}

export default { name, inject, apply, Config }
