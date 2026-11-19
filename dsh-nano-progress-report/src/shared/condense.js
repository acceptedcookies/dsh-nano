/** A/B/C layering for the condensed timeline (spec-v1.1 §4.4).
 *  Pure functions; no React, no ctx, no DOM.
 *
 *  A-layer — milestone rows, always rendered one-for-one: openers, unresolved
 *  failures, waits/approvals, subagent events, todos with changed counts,
 *  slash commands, failed commands, deliverables, compaction.
 *  B-layer — consecutive same-category tool rows merged into one segment line:
 *  explore / modify / command / lookup / other.
 *  C-layer — stripped in the condensed view (and only there; a non-empty filter
 *  shows raw denoised rows): assistant narration, approvals merged into their
 *  tool row, completed turn endings, default-hidden lifecycle, unchanged todo
 *  counts, the todo_write tool row itself. */
import { callFingerprints } from './fingerprint.js'

const EXPLORE = new Set(['read', 'glob', 'grep'])
const MODIFY = new Set(['write', 'edit'])
const COMMAND = new Set(['bash', 'pwsh', 'terminal'])
const LOOKUP = new Set(['web_fetch', 'web_search'])
/** Always-A tools: waits and subagent dispatch keep their own rows. */
const ALWAYS_A = new Set([
  'wait_agent', 'send_message', 'ask_user_question',
  'subagent', 'subagent_fork',
])
/** Lifecycle subtypes that stay in the A-layer. Everything else is default
 *  hidden in the condensed view; the LIFECYCLE event table itself is unchanged
 *  and filtering still surfaces every row. */
const LIFECYCLE_A_PREFIX = 'compaction/'
const LIFECYCLE_A = new Set(['command/run', 'command/done', 'deliverables'])

/**
 * @param {object} row - a denoised ProgressRow (or a group opener/end row).
 * @returns {'a'|'b'|'c'}
 */
export function classify(row) {
  if (row === null || typeof row !== 'object') return 'c'
  switch (row.type) {
    case 'prompt':
    case 'goal':
    case 'schedule':
    case 'subagent':
      return 'a'
    case 'turn':
      // Only a completed ending folds into the opener's tail column; every
      // other end reason (error/aborted/blocked/forked/…) keeps its own row.
      return row.reason === 'completed' ? 'c' : 'a'
    case 'wait':
      // Approved or withdrawn approvals merged into the call row.
      return row.status === 'ok' && row.outcome !== undefined
        && (row.outcome === 'approved' || row.outcome === 'cancelled' || row.outcome === 'withdrawn')
        ? 'c' : 'a'
    case 'lifecycle':
      if (row.status === 'failed') return 'a'
      if (typeof row.eventType === 'string' && row.eventType.startsWith(LIFECYCLE_A_PREFIX)) return 'a'
      return LIFECYCLE_A.has(row.eventType) ? 'a' : 'c'
    case 'job':
      // Unmerged job rows (no owning tool call, e.g. running/failed/orphan
      // launches) are progress milestones; a merged one's status already rides
      // on its call row so it never reaches this view.
      return 'a'
    case 'todo':
      // The todo_write tool-call row is always C (the todo event row carries
      // the counts); the todo/write event row is A only when the counts moved
      // — condenseGroup knows the previous snapshot and promotes it there.
      if (row.status === 'failed') return 'a'
      return 'c'
    case 'message':
      // Assistant narration strips in condensed view; the group's outcome row
      // is promoted to A by condenseGroup (conclusion message stays visible).
      return 'c'
    case 'shell':
    case 'file':
    case 'web':
    case 'tool':
      // Waits/subagent dispatch stay A even on failure; mergeable tools keep
      // failures inside their segment so recovery folds (spec rule 4).
      return segmentCategory(row) !== null ? 'b' : 'a'
    default:
      return 'a'
  }
}

/** Merge category for a B-layer tool row, or null when it must stay A. */
export function segmentCategory(row) {
  if (row.kind !== 'progress-tool-call') return null
  const tool = row.tool
  if (typeof tool !== 'string' || tool === '' || ALWAYS_A.has(tool)) return null
  if (EXPLORE.has(tool)) return 'explore'
  if (MODIFY.has(tool)) return 'modify'
  if (COMMAND.has(tool)) return 'command'
  if (LOOKUP.has(tool)) return 'lookup'
  return 'other'
}

function argOf(row, ...keys) {
  const raw = row.detail?.argsRaw
  if (typeof raw !== 'string' || raw === '') return undefined
  try {
    const args = JSON.parse(raw)
    for (const key of keys) {
      if (typeof args?.[key] === 'string' && args[key] !== '') return args[key]
      if (typeof args?.[key] === 'number') return String(args[key])
    }
  } catch { /* unparseable args → no identity field */ }
  return undefined
}

/** Fingerprint keys for segment folding. Same tool + same canonical args is
 *  the same step; rows that cannot be fingerprinted never merge nor recover. */
function rowKeys(row) {
  const keys = callFingerprints(row.tool, row.detail?.argsRaw, { cwd: null })
  return keys.length > 0 ? keys : [`rowkey:${row.key}`]
}

function todoCounts(row) {
  const todos = row.detail?.todos
  if (Array.isArray(todos)) {
    let done = 0
    for (const item of todos) if (item?.status === 'completed') done += 1
    return `${done}/${todos.length}`
  }
  const match = /^Task list: (\d+)\/(\d+) done$/.exec(row.summary ?? '')
  return match ? `${match[1]}/${match[2]}` : null
}

/**
 * Condense one group's rows.
 * @param {object} group - ProgressGroup from groupRows (denoised rows).
 * @param {{ includeEnd?: boolean }} opts - includeEnd=false drops the closing
 *   turn row when it is 'completed' and surfaces its reason/duration on the
 *   opener's tail column instead.
 * @returns {{ rows: object[], tail: {reason?: string, durationMs?: number}|null }}
 *   `rows` mixes real rows (references kept; same .key identity for filter/open
 *   bookkeeping) with synthetic `segment: true` rows.
 */
export function condenseGroup(group, opts = {}) {
  const includeEnd = opts.includeEnd !== false
  const tail = tailOf(group)
  const body = []
  for (const row of group.rows) body.push({ layer: classify(row), row })
  if (includeEnd && group.end !== null) body.push({ layer: classify(group.end), row: group.end })

  // Reasoning-only assistant rows ride onto the next visible row's detail.
  const carried = new Map()
  let pendingReasoning = null
  for (let i = 0; i < body.length; i += 1) {
    const item = body[i]
    if (item.layer === 'c' && item.row.type === 'message' && item.row.detail?.reasoning) {
      pendingReasoning = item.row.detail.reasoning
      continue
    }
    if (pendingReasoning !== null && item.layer !== 'c') {
      carried.set(item.row.key, pendingReasoning)
      pendingReasoning = null
    }
  }

  // Promote: the outcome message stays visible; a todo snapshot whose counts
  // changed is a milestone.
  let prevCounts = null
  for (const item of body) {
    if (item.row === group.outcome && item.layer === 'c') item.layer = 'a'
    if (item.row.type === 'todo' && item.row.kind === 'progress-todo-write') {
      const counts = todoCounts(item.row)
      if (counts !== null && counts !== prevCounts) item.layer = 'a'
      if (counts !== null) prevCounts = counts
    }
  }

  // Assemble display rows.
  const out = []
  let run = []
  const flushRun = () => {
    if (run.length === 0) return
    emitRun(run, out, carried)
    run = []
  }
  for (const item of body) {
    if (item.layer === 'b') {
      run.push(item)
      continue
    }
    if (item.layer === 'a') {
      flushRun()
      const text = carried.get(item.row.key)
      out.push(text === undefined ? item.row : { ...item.row, detail: { ...item.row.detail, text } })
    }
    // 'c' rows drop; 'b' accumulation continues across them.
  }
  flushRun()
  return { rows: out, tail }
}

/** Opener-tail facts for the 56px column: non-completed end reason, else the
 *  turn's duration. Empty when the turn is still open or has no end row. */
export function tailOf(group) {
  const end = group?.end
  if (end === null || end === undefined) return null
  const durationMs = group.startTime > 0 && end.time >= group.startTime
    ? end.time - group.startTime : undefined
  const reason = end.reason ?? (end.status === 'ok' ? 'completed' : undefined)
  if (reason === undefined && durationMs === undefined) return null
  return reason !== undefined && reason !== 'completed'
    ? { reason, durationMs }
    : { durationMs }
}

function emitRun(run, out, carried) {
  // Pass 1: fingerprint bookkeeping across the whole B-run (a retry may cross
  // a category block boundary within the run).
  const rec = new Map()
  for (let idx = 0; idx < run.length; idx += 1) {
    const row = run[idx].row
    for (const key of rowKeys(row)) {
      const entry = rec.get(key) ?? { fails: [], oks: [] }
      if (row.status === 'failed') entry.fails.push(idx)
      else entry.oks.push(idx)
      rec.set(key, entry)
    }
  }
  const unrecovered = new Set()
  const recoveredCount = new Map()
  for (const { fails, oks } of rec.values()) {
    const lastOk = oks.length > 0 ? oks[oks.length - 1] : -1
    for (const f of fails) {
      if (f < lastOk) recoveredCount.set(lastOk, (recoveredCount.get(lastOk) ?? 0) + 1)
      else unrecovered.add(f)
    }
  }

  // Pass 2: same-category blocks, split at unresolved failures (promoted to A).
  let block = []
  const flushBlock = () => {
    if (block.length === 0) return
    out.push(makeSegment(block, recoveredCount, carried))
    block = []
  }
  for (let idx = 0; idx < run.length; idx += 1) {
    const { row } = run[idx]
    if (unrecovered.has(idx)) {
      flushBlock()
      out.push(row)
      continue
    }
    if (block.length > 0 && segmentCategory(row) !== segmentCategory(block[0].row)) flushBlock()
    block.push({ row, idx })
  }
  flushBlock()
}

function makeSegment(block, recoveredCount, carried) {
  const category = segmentCategory(block[0].row)
  const rows = block.map(item => item.row)
  const steps = rows.map(row => ({ name: row.tool, summary: row.summary, status: row.status }))
  const status = rows.some(row => row.status === 'running' || row.status === 'awaiting')
    ? 'running' : 'ok'
  const seg = {
    segment: true, category,
    key: `seg:${rows[0].key}`,
    type: rows[0].type, status, role: 'exec',
    time: rows[rows.length - 1].time,
    expandable: true,
    detail: { children: steps },
  }
  switch (category) {
    case 'explore': {
      const reads = new Set()
      let searches = 0
      for (const row of rows) {
        if (row.tool === 'read') reads.add(argOf(row, 'file_path', 'path') ?? row.summary)
        else searches += 1
      }
      const parts = []
      if (reads.size > 0) parts.push(`${reads.size} file${reads.size > 1 ? 's' : ''}`)
      if (searches > 0) parts.push(`${searches} ${searches > 1 ? 'searches' : 'search'}`)
      seg.summary = `Explore ${parts.join(' · ') || `${rows.length} step${rows.length > 1 ? 's' : ''}`}`
      break
    }
    case 'modify': {
      const counts = new Map()
      for (const row of rows) {
        const path = argOf(row, 'file_path', 'path') ?? row.summary
        counts.set(path, (counts.get(path) ?? 0) + 1)
      }
      if (counts.size === 1) {
        const [path, count] = [...counts.entries()][0]
        seg.summary = `Modify ${path}${count > 1 ? ` ×${count}` : ''}`
      } else {
        seg.summary = `Modify ${counts.size} files`
      }
      break
    }
    case 'command': {
      const singles = block
      const distinct = new Set()
      for (const { row } of singles) distinct.add(rowKeys(row)[0])
      if (distinct.size === 1) {
        const last = singles[singles.length - 1]
        const recovered = [...recoveredCount.keys()]
          .filter(idx => block.some(item => item.idx === idx))
          .reduce((total, idx) => total + recoveredCount.get(idx), 0)
        seg.summary = recovered > 0
          ? `${last.row.summary} — passed after ${recovered} failed attempt${recovered > 1 ? 's' : ''}`
          : last.row.summary
      } else {
        const recovered = [...recoveredCount.keys()].filter(idx => block.some(item => item.idx === idx))
          .reduce((total, idx) => total + recoveredCount.get(idx), 0)
        seg.summary = `Commands · ${distinct.size} command${distinct.size > 1 ? 's' : ''}`
          + (recovered > 0 ? ` · ${recovered} recovered` : '')
      }
      break
    }
    case 'lookup':
      seg.summary = `Lookup ${rows.length} ${rows.length > 1 ? 'queries' : 'query'}`
      break
    default:
      seg.summary = `Tools · ${rows.length} ${rows.length > 1 ? 'steps' : 'step'}`
  }
  // Fold reasoning carried onto a merged step into the segment detail.
  const texts = rows.map(row => carried.get(row.key)).filter(Boolean)
  if (texts.length > 0) seg.detail.text = texts[texts.length - 1]
  return seg
}
