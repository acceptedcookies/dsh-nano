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
import { registerWebRoutes } from './lib/web-routes.js'

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

  // -- web surfaces: WS data plane + MCP/REST control plane ------------------
  // All web surfaces (http exact/prefix + upgrade) register through the single
  // createWebRegistrar mechanism (src/host/web-routes.js → lib/web-routes.js).
  // Handlers are bound to the baked BINDING_TABLE by stable id; the registrar
  // owns the requestRejection fence and unified ctx.effect teardown.

  const disposeRoutes = registerWebRoutes(ctx, {
    registry, bus, mcp, laneStatus,
    ws: { handshake, FrameParser, sendBinary, sendText, sendClose, encodeFrame, parseChannel, Attach, FR_KIND },
  })

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
    disposeRoutes()
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
