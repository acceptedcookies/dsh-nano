/** dsh-nano-terminal host half.
 *
 * Lanes:
 *   local   — ctx.subprocess.spawnTerminal (node-pty on this dsh host)
 *   mcp     — remote MCP terminal endpoint (containers, SSH hosts, nano-agent)
 *   isolate — wasm/JS isolate lane (v8/workerd; scaffolded)
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
import { createMcpHandler } from './lib/mcp.js'
import { handshake, FrameParser, sendBinary, sendText, sendClose } from './lib/ws.js'

export const name = 'dsh-nano-terminal'

export const inject = ['webServer', 'subprocess', 'sessions', 'workingDirectory', 'commands']

const ROUTE = '/dsh-nano-terminal'

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  // DSH_HOME is the harness home (~/.dsh-dev under dev); audit lives under it
  const home = process.env.DSH_HOME || process.env.HOME || '/tmp'
  const auditPath = join(home, 'plugins', 'dsh-nano-terminal', 'audit.jsonl')

  const bus = new EventBus({ audit: () => {} })

  const registry = new SessionRegistry({
    ctx,
    audit: () => {}, // replaced below
    sendBinary,
    sendText,
    bus,
    apiBase: `${ROUTE}/mcp`,
  })
  bus.registry = registry

  const laneStatus = () => ({
    local: { status: 'up', backend: 'subprocess.spawnTerminal', sessions: registry.count() },
    mcp: { status: 'client', detail: 'lane connects to remote MCP endpoints; this host is itself an MCP terminal server' },
    isolate: { status: 'stub', detail: 'wasm-embedded lane (workerd/v8) scaffolded' },
  })

  const mcp = createMcpHandler({ registry, bus, auditPath, laneStatus })
  registry.audit = mcp.audit
  bus.audit = mcp.audit

  // -- data plane: WebSocket upgrade -----------------------------------------

  const unregisterUpgrade = ctx.webServer.registerUpgrade({
    path: `${ROUTE}/stream`,
    handler: (req, socket) => {
      if (!handshake(req, socket)) return
      const url = new URL(req.url ?? '/', 'http://localhost')
      const attachId = url.searchParams.get('session')
      let record = null
      let ready = false

      const parser = new FrameParser((opcode, payload) => {
        if (opcode === 0x08) {
          socket.end()
          return
        }
        if (opcode === 0x09) {
          socket.write(payload) // pong payload with opcode… handled below
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
          // interactive bytes count as human input — the gate holds them
          // while an agent delivery is in flight (never interleaves)
          void record.writeInput(payload, 'human').catch(() => {})
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
          if (attachId) {
            // ?session= accepts id | name | addr — the unified address space
            record = registry.resolve(attachId)
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
          record.attach(socket)
          socket.once('close', () => record?.detach(socket))
          ready = true
          sendText(socket, {
            type: 'ready',
            session: record.id,
            title: record.title,
            lane: record.lane,
            exited: record.exited,
            replayBytes: record.replayLen,
          })
          record.replayInto(socket, sendBinary)
        } catch (err) {
          sendText(socket, { type: 'error', message: String(err?.message ?? err) })
          sendClose(socket, 1008, 'open failed')
        }
      }
    },
  })

  // -- control plane: MCP JSON-RPC + management REST --------------------------

  const unregisterRoutes = [
    ctx.webServer.register({
      kind: 'exact',
      path: `${ROUTE}/mcp`,
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
    }),
    ctx.webServer.register({
      kind: 'exact',
      path: `${ROUTE}/sessions`,
      handler: async (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ sessions: registry.list() }))
      },
    }),
    // SSE event stream: subscribe → snapshot first frame, then live events.
    // ?since=<seq> resumes from a position; falling behind the ring answers
    // with {missed:true,snapshot}. Agents can poll the same data via
    // term.events without holding a connection.
    ctx.webServer.register({
      kind: 'exact',
      path: `${ROUTE}/events`,
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
    }),
    ctx.webServer.register({
      kind: 'exact',
      path: `${ROUTE}/health`,
      handler: async (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: true, lanes: laneStatus(), sessions: registry.count() }))
      },
    }),
    ctx.webServer.register({
      kind: 'prefix',
      path: `${ROUTE}/session`,
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
    }),
  ]

  // -- slash command (host side, agent-facing): /term --------------------------
  // UI-level mapping lives on the client via ctx.commandUi ('/dnt'); this host
  // command gives agents/scripts the same session operations the MCP tools do.

  const unregisterCommand = ctx.commands?.register?.({
    name: 'term',
    description: 'nano-terminal: /term new|list|close|attach|send|read|wait|keys|interrupt|keep|label|events|skill',
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
