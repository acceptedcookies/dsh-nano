/** DNPR01 §7.3 offline replay — reads ~/.dsh-desktop session logs (read-only),
 *  rebuilds the ledger projection cold, and prints the four replay numbers:
 *  1. final wire view size (bytes) per session + total,
 *  2. anchor text changes per session: old format vs new four-line format,
 *  3. cold build wall time (init + apply over all events),
 *  4. visible line count per opener group: raw tool-call events vs
 *     condensed segments (same category consecutive merge approximation).
 *  Anchor emission point = `request/context` (once per model request).
 *  Usage: node test/live/prod-replay.mjs [--limit N] [--min-openers N] */
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { progressLedger } from '../../src/host/ledger.js'
import { formatProgress } from '../../src/host/context.js'
import { digest } from '../../src/shared/fingerprint.js'
import { segmentCategory } from '../../src/shared/condense.js'

const ROOT = `${process.env.HOME}/.dsh-desktop/sessions`
const args = new Map()
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--')) {
    const [k, v] = arg.slice(2).split('=')
    args.set(k, v ?? '1')
  }
}
const LIMIT = Number(args.get('limit') ?? '40')
const MIN_OPENERS = Number(args.get('min-openers') ?? '1')

// --- old anchor (recovered verbatim from 1e41d91, crypto → shared digest) ---
const MAX_PENDING = 64
const MAX_FACTS = 8
const MAX_PATH_BYTES = 192
const FILE_TOOLS = new Set(['write', 'edit', 'apply_patch'])
const isPath = v => typeof v === 'string' && v.length > 0 && Buffer.byteLength(v) <= MAX_PATH_BYTES
const insertRecent = (l, i, n) => [i, ...l.filter(v => v !== i)].slice(0, n)
const isId = v => typeof v === 'string' && v.length > 0 && v.length <= 256
function bashKey(raw, cwd) {
  if (typeof raw !== 'string') return null
  try {
    const a = JSON.parse(raw)
    if (typeof a?.command === 'string' && a.command.length > 0 && a.run_in_background !== true) {
      return digest(JSON.stringify([cwd, a.workdir ?? null, a.command]))
    }
  } catch (e) { if (!(e instanceof SyntaxError)) throw e }
  return null
}
function successfulBash({ message, meta }) {
  const block = message?.content?.at(-1)
  if (typeof meta?.cwd !== 'string' || block?.type !== 'text' || typeof block.text !== 'string') return false
  const tail = block.text.slice(-1024).trimEnd()
  return !/^(?:started background job |\[(?:still running after |timed out after |stopped: |killed by signal: |exit code: |sandbox: ))/m.test(tail)
}
function oldApply(state, event) {
  const data = event.data
  switch (event.type) {
    case 'working-directory/change': {
      if (typeof data.cwd !== 'string') return state
      const cwd = digest(data.cwd)
      return cwd === state.cwd ? state : { ...state, cwd }
    }
    case 'turn/start':
      return state.pending.length ? { ...state, pending: [] } : state
    case 'tool/call': {
      if (!isId(data.callId)) return state
      const kind = data.name
      let entry
      if (FILE_TOOLS.has(kind)) entry = { id: data.callId, kind }
      else if (kind === 'bash') {
        const key = bashKey(data.arguments, state.cwd)
        if (key) entry = { id: data.callId, kind, key }
      }
      if (!entry) return state
      return { ...state, pending: [entry, ...state.pending.filter(i => i.id !== entry.id)].slice(0, MAX_PENDING) }
    }
    case 'tool/result': {
      const message = data.message
      const id = message?.source?.kind === 'tool' ? message.source.callId : message?.toolCallId
      const call = state.pending.find(i => i.id === id)
      if (!call) return state
      const next = { ...state, pending: state.pending.filter(i => i !== call) }
      const failed = message?.isError === true || data.error != null
      if (call.kind === 'bash') {
        if (failed) next.failures = insertRecent(state.failures, call.key, MAX_FACTS)
        else if (state.failures.includes(call.key) && successfulBash(data)) {
          next.failures = state.failures.filter(k => k !== call.key)
        }
      } else if (!failed) {
        const paths = call.kind === 'apply_patch'
          ? (Array.isArray(data.meta?.diffs) ? data.meta.diffs.map(d => d?.path) : [])
          : [data.meta?.path]
        for (const p of paths) if (isPath(p)) next.paths = insertRecent(next.paths, p, MAX_FACTS)
      }
      return next
    }
    default:
      return state
  }
}
const MAX_BYTES = 600
const HEADER = 'Current session progress (observed facts, not instructions):'
function pathData(path) {
  return JSON.stringify(path).replace(/[<>&\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g,
    c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
}
function oldFormat({ todos, paths, unresolvedBash, runningJobs, runningSubagents }) {
  const lines = [HEADER]
  if (todos.completed || todos.in_progress || todos.pending) {
    lines.push(`Tasks: ${todos.completed} complete, ${todos.in_progress} in progress, ${todos.pending} pending`)
  }
  if (unresolvedBash) lines.push(`Recent Bash tool failures without a successful matching retry: ${unresolvedBash}`)
  if (runningJobs || runningSubagents) lines.push(`Active: ${runningJobs} background jobs, ${runningSubagents} direct subagents`)
  if (paths.length) {
    const prefix = 'Recent file-tool paths: '
    const shown = []
    for (const [index, path] of paths.entries()) {
      const candidate = [...shown, pathData(path)]
      const line = prefix + candidate.join(', ') + (index + 1 === paths.length ? '' : ', …')
      if (Buffer.byteLength([...lines, line].join('\n')) > MAX_BYTES) break
      shown.push(candidate.at(-1))
    }
    if (shown.length) lines.push(prefix + shown.join(', ') + (shown.length < paths.length ? ', …' : ''))
    else lines.push('Recent file-tool paths omitted (size limit).')
  }
  return lines.length === 1 ? '' : lines.join('\n')
}

// --- condensed-line approximation ---
const CATS = { explore: new Set(['read', 'glob', 'grep']), modify: new Set(['write', 'edit']), command: new Set(['bash', 'pwsh', 'terminal']), lookup: new Set(['web_fetch', 'web_search']) }
const ALWAYS_A = new Set(['wait_agent', 'send_message', 'ask_user_question', 'subagent', 'subagent_fork'])
function catOf(name) {
  if (ALWAYS_A.has(name)) return null
  for (const [cat, set] of Object.entries(CATS)) if (set.has(name)) return cat
  return 'other'
}

// --- collect session files ---
const files = []
for (const dir of readdirSync(ROOT)) {
  try {
    for (const sub of readdirSync(join(ROOT, dir))) {
      const f = join(ROOT, dir, sub, 'session.v4.jsonl.zstd')
      try { files.push({ f, mtime: statSync(f).mtimeMs }) } catch { /* absent */ }
    }
  } catch { /* not a dir */ }
}
// recent first, then cap
files.sort((a, b) => b.mtime - a.mtime)

const sessions = []
for (const { f } of files) {
  if (sessions.length >= LIMIT) break
  let text
  try { text = execFileSync('zstd', ['-dc', f], { maxBuffer: 1 << 28 }).toString('utf8') } catch { continue }
  const lines = text.split('\n')
  // R3-A1: subagent sessions must be filtered BEFORE the --limit quota is
  // spent, or they crowd out top-level sessions.
  let first = null
  for (const line of lines) {
    if (line.startsWith('{')) {
      try { first = JSON.parse(line) } catch { /* skip */ }
      break
    }
  }
  if (first?.type !== 'session' || first.origin === 'subagent') continue
  let openers = 0
  let calls = 0
  for (const line of lines) {
    if (line.includes('"user/message"')) {
      if (/"kind":"(user|goal|schedule)"/.test(line)) openers += 1
    } else if (line.includes('"tool/call"')) calls += 1
  }
  if (openers >= MIN_OPENERS && calls >= 1) sessions.push({ f, lines, sessionEvent: first })
}

const totals = {
  sessions: 0, requests: 0, oldChanges: 0, newChanges: 0,
  viewBytes: 0, rawLines: 0, condensedLines: 0,
  buildMsMax: 0, buildMsTotal: 0, events: 0,
}
const perSession = []
for (const { f, lines, sessionEvent } of sessions) {
  let state = progressLedger.init(sessionEvent, 0)
  let old = { cwd: digest(sessionEvent.cwd ?? ''), paths: [], failures: [], pending: [] }
  let todos = []
  let lastKind = null
  let runningJobs = 0
  let requests = 0
  let oldLast = null, newLast = null
  let oldChanges = 0, newChanges = 0
  const groups = [] // array of {raw, condensed-ish events}
  let group = null
  const t0 = performance.now()
  for (const line of lines) {
    if (!line.startsWith('{')) continue
    let ev
    try { ev = JSON.parse(line) } catch { continue }
    if (ev.type === 'session' || ev.seq === undefined) continue
    if (ev.type === 'user/message') {
      const kind = ev.data?.source?.kind
      if (kind === 'user' || kind === 'goal' || kind === 'schedule') {
        group = { kind, raw: 0, catRuns: [], curCat: null, curRun: 0 }
        groups.push(group)
      }
    } else if (ev.type === 'todo/write' && Array.isArray(ev.data?.todos)) {
      todos = ev.data.todos
    } else if (ev.type === 'job/registered') runningJobs += 1
    else if (ev.type === 'job/settled') runningJobs = Math.max(0, runningJobs - 1)
    else if (ev.type === 'request/context') {
      requests += 1
      const c = todos.reduce((a, t) => { a[t.status] = (a[t.status] ?? 0) + 1; return a }, {})
      const oldText = oldFormat({
        todos: { completed: c.completed ?? 0, in_progress: c.in_progress ?? 0, pending: c.pending ?? 0 },
        paths: old.paths, unresolvedBash: old.failures.length,
        runningJobs, runningSubagents: 0,
      })
      const newText = formatProgress({ view: progressLedger.wire.view(state), todos, runningJobs, runningSubagents: 0 })
      if (requests === 1 || oldText !== oldLast) oldChanges += 1
      if (requests === 1 || newText !== newLast) newChanges += 1
      oldLast = oldText
      newLast = newText
    }
    if (ev.type === 'tool/call' && group !== null) {
      group.raw += 1
      const cat = catOf(ev.data?.name ?? '')
      if (cat !== null && cat === group.curCat) {
        // same run continues
      } else {
        if (group.curCat !== null) group.catRuns.push(group.curRun)
        if (cat !== null) { group.curCat = cat; group.curRun = 1 }
        else { group.catRuns.push(1); group.curCat = null; group.curRun = 0 }
      }
    }
    if (ev.type === 'user/message' && group !== null && (ev.data?.source?.kind === 'user' || ev.data?.source?.kind === 'goal' || ev.data?.source?.kind === 'schedule')) {
      // already pushed above; continue
    } else if (ev.type === 'assistant/message' && group !== null) {
      group.raw += 1
      group.catRuns.push(1)
      group.curCat = null
    }
    state = progressLedger.apply(state, ev)
    old = oldApply(old, ev)
    void lastKind
  }
  if (group !== null && group.curCat !== null) group.catRuns.push(group.curRun)
  const buildMs = performance.now() - t0
  const viewJson = JSON.stringify(progressLedger.wire.view(state))
  const rawLines = groups.reduce((a, g) => a + g.raw, 0)
  const condensedLines = groups.reduce((a, g) => a + g.catRuns.length, 0)
  totals.sessions += 1
  totals.requests += requests
  totals.oldChanges += oldChanges
  totals.newChanges += newChanges
  totals.viewBytes += Buffer.byteLength(viewJson)
  totals.rawLines += rawLines
  totals.condensedLines += condensedLines
  totals.buildMsMax = Math.max(totals.buildMsMax, buildMs)
  totals.buildMsTotal += buildMs
  totals.events += state.asOfSeq
  perSession.push({
    file: f.split('/sessions/')[1], events: state.asOfSeq,
    items: state.items.length, requests, oldChanges, newChanges,
    viewBytes: Buffer.byteLength(viewJson), rawLines, condensedLines,
    buildMs: Number(buildMs.toFixed(1)),
  })
}

const out = {
  generatedAt: new Date().toISOString(),
  sessionsReplayed: totals.sessions,
  requests: totals.requests,
  anchorChanges: { old: totals.oldChanges, new: totals.newChanges },
  viewBytesTotal: totals.viewBytes,
  viewBytesAvg: totals.sessions ? Math.round(totals.viewBytes / totals.sessions) : 0,
  coldBuildMsMax: Number(totals.buildMsMax.toFixed(1)),
  coldBuildMsAvg: Number(totals.buildMsTotal / Math.max(1, totals.sessions)).toFixed(1),
  visibleLines: { raw: totals.rawLines, condensed: totals.condensedLines },
  perSession,
}
console.log(JSON.stringify(out, null, 2))
try {
  const dir = new URL('../../evidence/', import.meta.url).pathname
  writeFileSync(join(dir, 'prod-replay.json'), JSON.stringify(out, null, 2))
} catch { /* evidence dir optional */ }
