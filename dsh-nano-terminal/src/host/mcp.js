// MCP control plane: JSON-RPC 2.0 over POST /dsh-nano-terminal/mcp.
// Speaks the standard MCP tool surface (initialize / tools/list / tools/call).
// Every admitted call is written to the audit log — trusted, auditable,
// passwordless (same-origin browser or bearer token for remote agents).
//
// Contract source: schema/dnt-mcp.openrpc.json is the single source — the
// TOOLS table below is *generated* from it (name/description/inputSchema).
// Adding or changing a method means editing the schema first, then this file.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMcpToolset } from 'dsh-interface/host'
import { KIND, err } from './errors.js'
import { waitFor, NAMED_KEYS } from './wait.js'
import { sendNote } from './notes.js'
import { templateList, templateRun } from './templates.js'

const PROTOCOL_VERSION = '2025-06-18'
const schema = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'schema', 'dnt-mcp.openrpc.json'), 'utf8'),
)

// TOOLS table generated from the canonical schema — do not hand-author.
export const TOOLS = schema.methods.map((m) => ({
  name: m.name,
  description: m.description,
  inputSchema: m.params,
}))

const TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.name, t]))

/**
 * @param {object} deps
 * @param {import('@deepseek-ai/cordis').Context} deps.ctx — plugin context; `subprocess` powers the stats probe
 * @param {import('./sessions.js').SessionRegistry} deps.registry
 * @param {import('./events.js').EventBus} deps.bus
 * @param {string} deps.auditPath
 * @param {() => Record<string, {status: string, detail?: string}>} deps.laneStatus
 */
export function createMcpHandler({ ctx, registry, bus, auditPath, laneStatus, writeAudit }) {
  const audit = (event) => {
    if (typeof writeAudit === 'function') writeAudit(event)
  }
  void auditPath

  /** Resolve schema-style ref (id | name | addr | ctx ref) → record or throw. */
  const target = (ref) => {
    const rec = registry.resolve(ref)
    if (!rec) throw err(KIND.NOT_FOUND, `no such terminal '${ref}'`)
    return rec
  }

  /**
   * Process stats for one live terminal: `ps` under the provider's own spawn
   * (POSIX only — on win32 or spawn failure the tool still answers with the
   * registry facts and `processes: null`).
   */
  async function processStats(rec) {
    if (process.platform === 'win32' || !rec.handle?.pid) return { processes: null }
    try {
      const handle = ctx.subprocess.spawn({
        argv: ['/bin/ps', '-o', 'pid=,ppid=,pcpu=,rss=,stat=,etime=,command=', '-ax'],
        cwd: '/',
        stdio: { stdin: 'ignore', stdout: { maxBytes: 512 * 1024 }, stderr: { maxBytes: 8 * 1024 } },
        graceMs: 5000,
      })
      await handle.done.catch(() => {})
      const collected = handle.collected?.stdout?.readFrom(0)
      const text = collected?.text ?? ''
      const truncated = !!(collected && (collected.truncated || collected.hitLimit || text.length >= 512 * 1024))
      const rows = text.trim().split('\n').map((line) => line.trim()).filter(Boolean)
        .map((line) => {
          const parts = line.split(/\s+/)
          return {
            pid: Number(parts[0]),
            ppid: Number(parts[1]),
            pcpu: Number(parts[2]),
            rssKb: Number(parts[3]),
            stat: parts[4] ?? null,
            etime: parts[5] ?? null,
            command: parts.slice(6).join(' ') || null,
          }
        })
        .filter((p) => Number.isFinite(p.pid))
      // descendant tree of the terminal's root shell (job-control children can
      // live in other process groups — parentage is the only faithful bound)
      const byParent = new Map()
      for (const p of rows) {
        const list = byParent.get(p.ppid) ?? []
        list.push(p)
        byParent.set(p.ppid, list)
      }
      const processes = []
      const queue = [rec.handle.pid]
      const seen = new Set()
      while (queue.length) {
        const pid = queue.shift()
        if (seen.has(pid)) continue
        seen.add(pid)
        const rec2 = rows.find((r) => r.pid === pid)
        if (rec2) processes.push(rec2)
        for (const child of byParent.get(pid) ?? []) queue.push(child.pid)
      }
      return { processes, truncated }
    } catch {
      return { processes: null }
    }
  }

  async function callTool(name, args = {}) {
    switch (name) {
      case 'term.session.create': {
        if (args.lane && args.lane !== 'local') {
          throw err(KIND.INCOMPATIBLE, `lane '${args.lane}' has no local backend on this host; connect to its own MCP endpoint`)
        }
        const rec = await registry.create(args)
        audit({ op: 'mcp.create', id: rec.id, addr: rec.addr, by: 'tool' })
        return {
          id: rec.id,
          addr: rec.addr,
          ctx: rec.info().ctx, // `[ DNT:{conv8}@{term8} ]` when t+conv labels set
          lane: rec.lane,
          title: rec.title,
          labels: rec.labels,
          attach: { protocol: 'dnt-ws-v1', url: `/dsh-nano-terminal/stream?session=${rec.id}` },
        }
      }
      case 'term.session.list':
        return { sessions: registry.list() }
      case 'term.ctx': {
        // Resolve a context reference — '[ DNT:{conv8}@{term8} ]', a bare
        // term stamp, or any legacy ref — to the session it names.
        const ref = String(args.ref ?? '')
        const rec = registry.resolve(ref)
        if (!rec) throw err(KIND.NOT_FOUND, `no terminal matches '${ref}'`)
        audit({ op: 'mcp.ctx', id: rec.id, addr: rec.addr, ref })
        return {
          id: rec.id,
          addr: rec.addr,
          ctx: rec.info().ctx,
          title: rec.title,
          lane: rec.lane,
          owner: rec.owner,
          phase: rec.phase,
          labels: rec.labels,
          attached: rec.sockets.size,
          exited: rec.exited,
        }
      }
      case 'term.session.input': {
        const rec = target(args.id)
        audit({ op: 'mcp.input', id: rec.id, addr: rec.addr, bytes: args.data.length })
        await rec.writeInput(args.data, 'agent')
        return { ok: true }
      }
      case 'term.send': {
        const rec = target(args.id)
        audit({ op: 'mcp.send', id: rec.id, addr: rec.addr, bytes: args.data.length, force: !!args.force })
        const r = await rec.agentSend(args.data, {
          enter: args.enter !== false,
          force: !!args.force,
          cond: args.if ?? null,
        })
        if (args.wait) {
          const w = await waitFor(rec, registry, bus, { timeoutMs: (args.timeout ?? 180) * 1000 })
          return { ok: true, turn: r.turn, wait: w }
        }
        return { ok: true, turn: r.turn }
      }
      case 'term.keys': {
        const rec = target(args.id)
        if (rec.exited) throw err(KIND.FINISHED, 'terminal exited')
        if (!rec.handle && rec.pending) await registry.spawnPending(rec) // restored placeholder wakes on first use
        if (!rec.handle) throw err(KIND.UNAVAILABLE, 'terminal has no live backend')
        if (rec.status?.state === 'blocked' && !args.force) throw err(KIND.BLOCKED, 'terminal reports blocked')
        const bytes = []
        for (const k of args.keys ?? []) {
          const seq = NAMED_KEYS[k]
          if (seq === undefined) throw err(KIND.INVALID, `unknown key '${k}'`)
          bytes.push(seq)
        }
        await rec.gate.submit(() => rec.handle.write(bytes.join('')))
        return { ok: true }
      }
      case 'term.interrupt': {
        const rec = target(args.id)
        if (rec.exited) throw err(KIND.FINISHED, 'terminal exited')
        if (!rec.handle && rec.pending) await registry.spawnPending(rec)
        if (!rec.handle) throw err(KIND.UNAVAILABLE, 'terminal has no live backend')
        audit({ op: 'mcp.interrupt', id: rec.id, addr: rec.addr })
        // status-reporting programs get esc; others get ctrl+c (hc semantics)
        const key = rec.status ? '\x1b' : '\x03'
        const turnBefore = rec.turn
        await rec.gate.submit(() => rec.handle.write(key), { urgent: true })
        const w = await waitFor(rec, registry, bus, { timeoutMs: (args.timeout ?? 10) * 1000 })
        const result =
          w.reason === 'exit' ? 'exited'
            : w.reason === 'status' || rec.turn > turnBefore ? 'stopped'
              : w.reason === 'timeout' ? 'still_working' : 'unknown'
        return { result }
      }
      case 'term.wait': {
        const rec = target(args.id)
        audit({ op: 'mcp.wait', id: rec.id, addr: rec.addr, output: args.output })
        return waitFor(rec, registry, bus, {
          output: args.output ?? null,
          children: args.children ?? null,
          timeoutMs: (args.timeout ?? 180) * 1000,
        })
      }
      case 'term.session.read': {
        const rec = target(args.id)
        if (!rec.handle && rec.pending) await registry.spawnPending(rec) // wake restored placeholders on read
        const lines = Number.isFinite(Number(args.lines)) ? Math.min(Math.max(Math.floor(Number(args.lines)), 0), 500) : 50
        return {
          id: rec.id,
          addr: rec.addr,
          text: rec.screenText(lines, args.source ?? 'visible'),
          complete: !(rec.status?.state === 'working' || rec.status?.state === 'blocked'),
        }
      }
      case 'term.session.copy': {
        // Plain-text copy of the rendered grid — the agent's "clipboard".
        const rec = target(args.id)
        if (!rec.handle && rec.pending) await registry.spawnPending(rec)
        const lines = Number.isFinite(Number(args.lines)) ? Math.min(Math.max(Math.floor(Number(args.lines)), 0), 2000) : 200
        const text = rec.screenText(lines, args.source ?? 'visible')
        audit({ op: 'mcp.copy', id: rec.id, addr: rec.addr, lines: text.split('\n').length })
        return { id: rec.id, addr: rec.addr, text }
      }
      case 'term.session.screenshot': {
        // Structured screen capture: dims + cursor + the visible grid — the
        // agent-facing equivalent of a pixel screenshot.
        const rec = target(args.id)
        if (!rec.handle && rec.pending) await registry.spawnPending(rec)
        const view = rec.alignView()
        audit({ op: 'mcp.screenshot', id: rec.id, addr: rec.addr })
        return {
          id: rec.id,
          addr: rec.addr,
          ctx: rec.info().ctx,
          ...view,
          title: rec.title,
          status: rec.status,
        }
      }
      case 'term.session.clear': {
        // Send the terminal's own clear sequence (form feed, ^L): the shell
        // repaints; we never forge screen state behind the program's back.
        const rec = target(args.id)
        if (rec.exited) throw err(KIND.FINISHED, 'terminal exited')
        if (!rec.handle && rec.pending) await registry.spawnPending(rec)
        if (!rec.handle) throw err(KIND.UNAVAILABLE, 'terminal has no live backend')
        audit({ op: 'mcp.clear', id: rec.id, addr: rec.addr })
        await rec.gate.submit(() => rec.handle.write('\x0c'))
        return { ok: true }
      }
      case 'term.session.stats': {
        const rec = target(args.id)
        const [stats, foreground] = await Promise.all([
          processStats(rec),
          rec.handle?.inspectForeground?.().catch(() => undefined) ?? Promise.resolve(undefined),
        ])
        return {
          id: rec.id,
          addr: rec.addr,
          ctx: rec.info().ctx,
          pid: rec.handle?.pid ?? null,
          ...stats,
          foreground: foreground ?? null,
          activity: (rec.handle ? await rec.handle.inspectActivity?.().catch(() => null) : null) ?? null,
          status: rec.status,
          phase: rec.phase,
          exited: rec.exited,
          cols: rec.meta?.cols ?? null,
          rows: rec.meta?.rows ?? null,
        }
      }
      case 'term.session.resize': {
        const rec = target(args.id)
        await rec.resize(args.cols, args.rows)
        return { ok: true }
      }
      case 'term.session.keep': {
        const rec = target(args.id)
        rec.keep = args.keep !== false
        audit({ op: 'mcp.keep', id: rec.id, addr: rec.addr, keep: rec.keep })
        bus.emit('labels', rec.addr, { id: rec.id, keep: rec.keep, labels: rec.labels })
        return { ok: true, keep: rec.keep }
      }
      case 'term.session.label': {
        const rec = target(args.id)
        const labels = rec.setLabels(args.set, args.unset)
        return { ok: true, labels }
      }
      case 'term.session.note': {
        const rec = target(args.id)
        const id = await sendNote(registry, args.from, rec.id, args.body)
        return { ok: true, id }
      }
      case 'term.template.list':
        return { templates: templateList() }
      case 'term.template.run': {
        const rec = target(args.id)
        const r = await templateRun(rec, registry, bus, waitFor, args.template, args.args, (args.timeout ?? 180) * 1000)
        return { ok: true, ...r }
      }
      case 'term.events':
        return bus.since(args.since ?? 0)
      case 'term.session.close': {
        const ok = await registry.close(args.id, args.reason ?? 'mcp')
        return { closed: ok }
      }
      case 'term.audit':
        return { log: readAuditTail(auditPath, Math.min(args.lines ?? 50, 500)) }
      case 'term.lane.status':
        return { lanes: laneStatus() }
      case 'term.health': {
        // Whole-plane health probe: lanes + registry + per-session rollup.
        const sessions = registry.list()
        const alive = sessions.filter((s) => !s.exited)
        return {
          ok: true,
          lanes: laneStatus(),
          sessions: {
            total: sessions.length,
            alive: alive.length,
            exited: sessions.length - alive.length,
            working: sessions.filter((s) => s.status?.state === 'working').length,
            blocked: sessions.filter((s) => s.status?.state === 'blocked').length,
          },
          list: sessions.map((s) => ({ addr: s.addr, ctx: s.ctx, phase: s.phase, status: s.status?.state ?? null, attached: s.attached, exited: !!s.exited })),
        }
      }
      case 'term.skill': {
        const skill = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'skill.md'), 'utf8')
        return { skill }
      }
      default:
        throw err(KIND.INVALID, `unknown tool '${name}'`)
    }
  }

  /* The JSON-RPC 2.0 protocol surface (initialize/ping/tools-list/tools-call,
     batch handling, the content+structuredContent/isError envelopes) is the
     single shared createMcpToolset (CF1115 / P3-01 / T14). This plugin injects
     its canonical schema + the domain dispatch above; the TOOLS table is still
     generated from schema/dnt-mcp.openrpc.json — never hand-authored. */
  const toolset = createMcpToolset({
    schema,
    dispatch: (name, args) => callTool(name, args),
    protocolVersion: PROTOCOL_VERSION,
    serverInfo: { name: 'dsh-nano-terminal', version: '0.2.0' },
    plugin: 'dsh-nano-terminal',
    observe: event => globalThis[Symbol.for('dsh.perfReviewHost.v2')]?.observe?.(event),
  })

  return { handleRpc: (body) => toolset.handleRpc(body), audit, tools: TOOLS }
}

function readAuditTail(path, lines) {
  try {
    const text = readFileSync(path, 'utf8')
    return text.trim().split('\n').slice(-lines)
  } catch {
    return []
  }
}
