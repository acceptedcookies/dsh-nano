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

import { join, dirname } from 'node:path'
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SessionRegistry, splitSlashArgs } from './lib/sessions.js'
import { EventBus } from './lib/events.js'
import { Persist } from './lib/persist.js'
import { createMcpHandler } from './lib/mcp.js'
import { handshake, FrameParser, sendBinary, sendText, sendClose, encodeFrame, parseChannel, Attach, FR_KIND } from './lib/ws.js'
import { registerWebRoutes } from './lib/web-routes.js'
import { ensurePerfReviewHost } from './lib/perf-review-host.js'

export const name = 'dsh-nano-terminal'

export const inject = ['webServer', 'connection', 'subprocess', 'sessions', 'workingDirectory', 'commands', 'skills']

const ROUTE = '/dsh-nano-terminal'

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  ensurePerfReviewHost()
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

  // P3-05 (T15): the audit writer must REALLY write — `writeAudit` is wired to
  // appendFileSync(auditPath) so term.audit durable-reads back actual events
  // (was: writeAudit never passed → audit was a silent no-op, term.audit empty).
  mkdirSync(dirname(auditPath), { recursive: true })
  const writeAudit = (event) => {
    try {
      appendFileSync(auditPath, JSON.stringify({ t: new Date().toISOString(), ...event }) + '\n')
    } catch { /* audit write failure must not take the control plane down */ }
  }
  const mcp = createMcpHandler({ ctx, registry, bus, auditPath, laneStatus, writeAudit })
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

  // -- slash commands (host side, agent-facing): /term + /nano-terminal -------
  // UI-level mapping lives on the client via ctx.commandUi ('/dnt'); these host
  // commands give agents/scripts the same session operations the MCP tools do.
  // /nano-terminal is the canonical agentic surface (skill name = slash name);
  // /term stays for back-compat and forwards to the same handler.

  const termHandler = async ({ rawInput }) => {
      // A pasted `[ DNT:{conv8}@{term8} ]` is ONE ref token — splitSlashArgs
      // protects it before whitespace splitting (shared, unit-tested).
      const { sub, rest } = splitSlashArgs(rawInput)
      const rpc = async (name, args) => {
        const reply = await mcp.handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })
        const r = reply?.result
        if (r?.isError) return { kind: 'error', errorKind: r.structuredContent?.kind, text: `${r.structuredContent?.kind ? `${r.structuredContent.kind}: ` : ''}${r.structuredContent?.message ?? r.content?.[0]?.text ?? 'error'}` }
        return { kind: 'success', text: typeof r?.structuredContent === 'object' ? JSON.stringify(r.structuredContent, null, 2) : String(r?.content?.[0]?.text ?? 'ok') }
      }
      // --flag / --k=v shared by the lifecycle subs; `--` ends flag parsing so
      // literal text starting with '--' (send data, wait patterns) survives.
      const takeFlags = (rest) => {
        const flags = {}
        const pos = []
        let done = false
        for (const p of rest) {
          if (!done && p === '--') { done = true; continue }
          if (!done && p.startsWith('--')) { const i = p.indexOf('='); i > 0 ? flags[p.slice(2, i)] = p.slice(i + 1) : flags[p.slice(2)] = true }
          else pos.push(p)
        }
        return { flags, pos }
      }
      try {
        switch (sub) {
          case '':
          case 'new': {
            // new [name] [--parent ref] [--keep] [--cwd dir] [--shell sh] [--cols n] [--rows n]
            const { flags, pos } = takeFlags(rest)
            const rec = await registry.create({
              owner: 'slash',
              name: pos[0] ?? undefined,
              parent: flags.parent ?? undefined,
              keep: !!flags.keep,
              cwd: flags.cwd ?? undefined,
              shell: flags.shell ?? undefined,
              cols: flags.cols ? Number(flags.cols) : undefined,
              rows: flags.rows ? Number(flags.rows) : undefined,
            })
            const ctx = rec.info?.().ctx
            return { kind: 'success', text: `terminal ${rec.addr} created (lane=local)${ctx ? ` ctx=[ ${ctx} ]` : ''}` }
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
            // send <ref> <text> [--force] [--if=idle|working] [--wait] [--timeout s]
            const { flags, pos } = takeFlags(rest)
            const [id, ...data] = pos
            return rpc('term.send', { id, data: data.join(' '), force: !!flags.force, if: flags.if ?? undefined, wait: !!flags.wait, timeout: flags.timeout ? Number(flags.timeout) : undefined })
          }
          case 'input': {
            const [id, ...data] = rest
            return rpc('term.session.input', { id, data: data.join(' ') })
          }
          case 'resize': {
            // resize <ref> <cols>x<rows> | <cols> <rows>
            const [id, a, b] = rest
            const [c, r] = a?.includes('x') ? a.split('x').map(Number) : [Number(a), Number(b)]
            return rpc('term.session.resize', { id, cols: c, rows: r })
          }
          case 'read':
            return rpc('term.session.read', { id: rest[0], lines: Number(rest[1]) || 50 })
          case 'ctx':
            return rpc('term.ctx', { ref: rest[0] })
          case 'clear':
            return rpc('term.session.clear', { id: rest[0] })
          case 'copy':
            return rpc('term.session.copy', { id: rest[0], lines: Number(rest[1]) || 200 })
          case 'screenshot':
            return rpc('term.session.screenshot', { id: rest[0] })
          case 'stats':
          case 'resources':
            return rpc('term.session.stats', { id: rest[0] })
          case 'health':
            return rpc('term.health', {})
          case 'wait': {
            // wait <ref> [pattern] [--children all|any] [--timeout s]
            const { flags, pos } = takeFlags(rest)
            return rpc('term.wait', { id: pos[0], output: pos[1] ?? undefined, children: flags.children ?? undefined, timeout: flags.timeout ? Number(flags.timeout) : undefined })
          }
          case 'keys': {
            const { flags, pos } = takeFlags(rest)
            const [id, ...keys] = pos
            return rpc('term.keys', { id, keys, force: !!flags.force })
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
          case 'audit':
            return rpc('term.audit', { lines: Number(rest[0]) || 50 })
          case 'lane':
          case 'lanes':
            return rpc('term.lane.status', {})
          case 'skill':
            return rpc('term.skill', {})
          default:
            return { kind: 'error', text: `unknown subcommand '${sub}'` }
        }
      } catch (err) {
        return { kind: 'error', text: String(err?.message ?? err) }
      }
  }

  const unregisterCommand = ctx.commands?.register?.({
    name: 'term',
    description: 'nano-terminal (alias of /nano-terminal): /term new|list|ctx|attach|send|input|read|copy|screenshot|clear|resize|wait|keys|interrupt|close|keep|label|note|template|stats|health|audit|lane|events|skill',
    input: { hint: '[new|list|ctx|attach|send|input|read|copy|screenshot|clear|resize|wait|keys|interrupt|close|keep|label|note|template|stats|health|audit|lane|events|skill] [args]' },
    handler: termHandler,
  }) ?? (() => {})

  // The canonical agentic surface: skill name == slash command name.
  // Same handler — the skill documents the full operation surface below.
  const unregisterNanoCommand = ctx.commands?.register?.({
    name: 'nano-terminal',
    description: 'nano-terminal agentic surface: /nano-terminal new|list|ctx|attach|send|input|read|copy|screenshot|clear|resize|wait|keys|interrupt|close|keep|label|note|template|stats|health|audit|lane|events|skill',
    input: { hint: '[new|list|ctx|attach|send|input|read|copy|screenshot|clear|resize|wait|keys|interrupt|close|keep|label|note|template|stats|health|audit|lane|events|skill] [args]' },
    handler: termHandler,
  }) ?? (() => {})

  // Agent-facing self-documentation: the skill body ships in docs/skill.md
  // and names the slash command it mirrors, so both entry points stay one doc.
  let unregisterSkill = () => {}
  try {
    const skillText = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'docs', 'skill.md'), 'utf8')
    unregisterSkill = ctx.skills?.register?.({
      name: 'nano-terminal',
      description: 'Drive nano-terminal sessions: locate a terminal by `[ DNT:{conv8}@{term8} ]`, read/copy/screenshot its screen, send input/keys/interrupt/clear, manage lifecycle, probe resources and health — all through /nano-terminal or the term.* MCP tools on POST /dsh-nano-terminal/mcp.',
      whenToUse: 'When the task needs an interactive terminal pane in the current conversation (shell, REPL, long-running program) or a `[ DNT:…@… ]` context reference must be traced back to a live session.',
      source: 'bundled',
      provider: 'dsh-nano-terminal',
      invocation: { modelInvocable: true, userInvocable: true },
      content: skillText,
    }) ?? (() => {})
  } catch { /* skill registration is best-effort — the tool surface is complete without it */ }

  // -- idle session sweep ------------------------------------------------------

  const sweep = setInterval(() => registry.sweep(), 60_000)

  ctx.effect(() => () => {
    clearInterval(sweep)
    bus.dispose()
    disposeRoutes()
    unregisterCommand()
    unregisterNanoCommand()
    unregisterSkill()
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
