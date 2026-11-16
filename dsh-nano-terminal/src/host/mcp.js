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
 * @param {import('./sessions.js').SessionRegistry} deps.registry
 * @param {import('./events.js').EventBus} deps.bus
 * @param {string} deps.auditPath
 * @param {() => Record<string, {status: string, detail?: string}>} deps.laneStatus
 */
export function createMcpHandler({ registry, bus, auditPath, laneStatus, writeAudit }) {
  const audit = (event) => {
    if (typeof writeAudit === 'function') writeAudit(event)
  }
  void auditPath

  /** Resolve schema-style ref (id | name | addr) → record or throw. */
  const target = (ref) => {
    const rec = registry.resolve(ref)
    if (!rec) throw err(KIND.NOT_FOUND, `no such terminal '${ref}'`)
    return rec
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
          lane: rec.lane,
          title: rec.title,
          attach: { protocol: 'dnt-ws-v1', url: `/dsh-nano-terminal/stream?session=${rec.id}` },
        }
      }
      case 'term.session.list':
        return { sessions: registry.list() }
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
        return {
          id: rec.id,
          addr: rec.addr,
          text: rec.screenText(Math.min(args.lines ?? 50, 500), args.source ?? 'visible'),
          complete: !(rec.status?.state === 'working' || rec.status?.state === 'blocked'),
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
        bus.emit('labels', rec.addr, { id: rec.id, keep: rec.keep })
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
