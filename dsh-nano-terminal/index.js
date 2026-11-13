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

  const registry = new SessionRegistry({
    ctx,
    audit: () => {}, // replaced below
    sendBinary,
    sendText,
  })

  const laneStatus = () => ({
    local: { status: 'up', backend: 'subprocess.spawnTerminal', sessions: registry.count() },
    mcp: { status: 'client', detail: 'lane connects to remote MCP endpoints; this host is itself an MCP terminal server' },
    isolate: { status: 'stub', detail: 'wasm-embedded lane (workerd/v8) scaffolded' },
  })

  const mcp = createMcpHandler({ registry, auditPath, laneStatus })
  registry.audit = mcp.audit

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
          void record.writeInput(payload).catch(() => {})
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
            record = registry.get(attachId)
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
    description: 'nano-terminal: /term new | list | close <id> | attach <id>',
    input: { hint: '[new|list|close|attach] [args]' },
    handler: async ({ rawInput }) => {
      const [sub, ...rest] = String(rawInput ?? '').trim().split(/\s+/)
      try {
        if (!sub || sub === 'new') {
          const rec = await registry.create({ owner: 'slash' })
          return { kind: 'success', text: `terminal ${rec.id.slice(0, 8)} created (lane=local)` }
        }
        if (sub === 'list') {
          const rows = registry.list()
          if (!rows.length) return { kind: 'success', text: 'no terminal sessions' }
          return {
            kind: 'success',
            text: rows.map((r) => `${r.id.slice(0, 8)} ${r.lane} ${r.title} attached=${r.attached}${r.exited ? ' (exited)' : ''}`).join('\n'),
          }
        }
        if (sub === 'close') {
          const ok = await registry.close(rest[0], 'slash')
          return ok ? { kind: 'success', text: 'closed' } : { kind: 'error', text: 'no such session' }
        }
        if (sub === 'attach') {
          const rec = registry.get(rest[0])
          return rec
            ? { kind: 'success', text: `attach via ws ${ROUTE}/stream?session=${rec.id}` }
            : { kind: 'error', text: 'no such session' }
        }
        return { kind: 'error', text: `unknown subcommand '${sub}'` }
      } catch (err) {
        return { kind: 'error', text: String(err?.message ?? err) }
      }
    },
  }) ?? (() => {})

  // -- idle session sweep ------------------------------------------------------

  const sweep = setInterval(() => registry.sweep(), 60_000)

  ctx.effect(() => () => {
    clearInterval(sweep)
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
