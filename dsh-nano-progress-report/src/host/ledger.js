/** The session progress ledger: one durable, per-session work-item ledger
 *  (`nano-progress-report:ledger`). This is the only canonical progress state —
 *  the model reads it through the four-line PromptContext and `read_progress`;
 *  the human panel reads the same wire view. It stores facts (digests, paths,
 *  counts), never args, results, message bodies, or reasoning.
 *
 *  Work items: a `user/message` opener (source.kind user / goal / schedule)
 *  opens the newest item; facts attribute to the item that is current when the
 *  fact arrives. At most 16 newest items stay full; older full items demote to
 *  skeletons, and the list is capped at 16 full + 64 skeleton — the 81st
 *  evicts the oldest skeleton into the cumulative layer (counts only).
 *
 *  Failure discipline: entries are `{tool, key, seq, callId}`; `key` is the
 *  shared call fingerprint, computed at CALL time (pending rows carry only
 *  digests — raw args never persist). Unfingerprintable calls (background
 *  bash) still record a failure with `key: null`; they simply cannot recover.
 *  A later successful same-key call in the same item removes the entry — for
 *  bash only through the `successfulBash` terminal-marker check.
 *
 *  Immutability contract: apply() never mutates; unchanged subtrees keep
 *  references so `wire.view` can republish only what moved. */
import {
  callFingerprints, callPaths, digest, isDigest, successfulBash,
} from '../shared/fingerprint.js'
import { openKind } from '../shared/open.js'

export const LEDGER_KEY = 'nano-progress-report:ledger'
export const STATE_VERSION = 1

// Bounds (frozen): 16 full + 64 skeleton items; per-item files 32, failures
// 16, tasks 32; unpaired-call buffer 64; task text 200B; paths 192B.
const FULL_MAX = 16
const SKELETON_MAX = 64
const ITEMS_MAX = FULL_MAX + SKELETON_MAX
const FILES_MAX = 32
const FAILURES_MAX = 16
const TASKS_MAX = 32
const PENDING_MAX = 64
const TEXT_MAX_BYTES = 200
const PATH_MAX_BYTES = 192
const FILE_TOOLS = new Set(['write', 'edit', 'apply_patch'])
const ITEM_KINDS = new Set(['user', 'goal', 'schedule'])

// Cut on a codepoint boundary: decoding a split multi-byte sequence would
// yield U+FFFD and could push the text past maxBytes, which parseState rejects.
const utf8Slice = (text, maxBytes) => {
  const buf = Buffer.from(String(text), 'utf8')
  if (buf.length <= maxBytes) return buf.toString('utf8')
  let end = maxBytes
  while (end > 0 && (buf[end] & 0xc0) === 0x80) end -= 1
  return buf.subarray(0, end).toString('utf8')
}

// Identity = opening seq (T-O-7); goal items additionally carry their goalId
// for merge; prompt text never enters the ledger (T-O-9).
const newItem = (seq, kind, goalId) => ({
  id: seq, tier: 'full', kind,
  ...(kind === 'goal' && typeof goalId === 'string' ? { goalId } : {}),
  endReason: null, awaiting: 0,
  firstSeq: seq, lastSeq: seq,
  calls: 0, failedCalls: 0, recovered: 0,
  files: [], failures: [], tasks: [],
  truncated: { files: 0, failures: 0, tasks: 0 },
})

/** Collapse a full item to its skeleton: identity, coverage, counts only. */
const skeletonOf = item => ({
  id: item.id, tier: 'skeleton', kind: item.kind,
  ...(item.goalId !== undefined ? { goalId: item.goalId } : {}),
  endReason: item.endReason, firstSeq: item.firstSeq, lastSeq: item.lastSeq,
  calls: item.calls, failedCalls: item.failedCalls,
  filesCount: item.files.length, tasksCount: item.tasks.length,
  unresolvedCount: item.failures.reduce((n, f) => n + f.count, 0),
})

/** Replace `item` with `next` inside state.items (structural sharing). */
function patchItem(state, item, next) {
  const index = state.items.indexOf(item)
  const items = state.items.slice()
  items[index] = next
  return { ...state, items }
}

/** Advance asOfSeq only when a fact changed; firstSeq marks coverage start. */
const touch = (state, seq) => (state.firstSeq === null
  ? { ...state, firstSeq: seq, asOfSeq: seq }
  : { ...state, asOfSeq: seq })

/** Demote the oldest full items beyond 16; evict beyond 16+64. */
function rebalance(items) {
  const next = items.slice()
  let full = 0
  for (const item of next) if (item.tier === 'full') full += 1
  for (let i = next.length - 1; i >= 0 && full > FULL_MAX; i -= 1) {
    if (next[i].tier !== 'full') continue
    next[i] = skeletonOf(next[i])
    full -= 1
  }
  const evicted = []
  while (next.length > ITEMS_MAX) evicted.push(next.pop())
  return { items: next, evicted }
}

/** Fold evicted skeletons into the cumulative layer: item count, the last
 *  seq they covered, and the sum of their counts. */
function absorb(cumulative, evicted) {
  const next = { ...cumulative }
  for (const item of evicted) {
    next.items += 1
    next.lastSeq = Math.max(next.lastSeq, item.lastSeq)
    next.calls += item.calls
    next.failures += item.failedCalls
    next.files += item.filesCount
    next.tasks += item.tasksCount
    next.unresolved += item.unresolvedCount
  }
  return next
}

function apply(state, event) {
  // Host-supplied prefix cut, not the firstLiveSeq on reopen.
  if (event.seq < state.inherited) return state
  const seq = event.seq
  const data = event.data ?? {}
  switch (event.type) {
    case 'turn/start': {
      // Pending calls do not survive a turn boundary; their results, if they
      // ever arrive, are unpaired and dropped.
      const next = {
        ...state,
        turn: state.turn + 1, turnOpen: true, openedThisTurn: false, pending: {},
      }
      const current = next.items[0]
      // Without a work item the turn changes no ledger fact (asOfSeq stays).
      if (current === undefined) return next
      return touch(patchItem(next, current, { ...current, lastSeq: seq }), seq)
    }
    case 'turn/end': {
      const reason = typeof data.reason === 'string' ? data.reason : (data.reason?.kind ?? 'completed')
      const current = state.items[0]
      // Without a work item no view fact moves; approvals only close.
      if (current === undefined) return { ...state, turnOpen: false, approvals: {} }
      let next = touch({ ...state, turnOpen: false }, seq)
      next = patchItem(next, current, { ...current, endReason: reason, lastSeq: seq })
      // Approvals pending at turn end are closed (T-O-10).
      if (Object.keys(next.approvals).length > 0) {
        const items = next.items.map(item => {
          const pend = Object.values(next.approvals).filter(id => id === item.id).length
          return pend > 0 ? { ...item, awaiting: Math.max(0, item.awaiting - pend) } : item
        })
        next = { ...next, items, approvals: {} }
      }
      return next
    }
    case 'working-directory/change': {
      if (typeof data.cwd !== 'string') return state
      const cwd = digest(data.cwd)
      // cwd only feeds bash fingerprints; it is not a view fact.
      return cwd === state.cwd ? state : { ...state, cwd }
    }
    case 'user/message': {
      const kind = openKind(data.source?.kind)
      if (kind !== null) {
        // T-O-9: inside an open turn the first whitelist hit decides the
        // attribution; later whitelist messages in the same turn attach.
        // goal merges when its goalId equals the current item's.
        const current = state.items[0]
        if (kind === 'goal' && current !== undefined
          && current.goalId !== undefined && current.goalId === data.source?.goalId) {
          return touch(patchItem(state, current, { ...current, lastSeq: seq }), seq)
        }
        if (state.turnOpen && state.openedThisTurn && current !== undefined) {
          return touch(patchItem(state, current, { ...current, lastSeq: seq }), seq)
        }
        const goalId = kind === 'goal' ? data.source?.goalId : undefined
        const { items, evicted } = rebalance([newItem(seq, kind, goalId), ...state.items])
        return {
          ...touch(state, seq), items,
          openedThisTurn: state.turnOpen,
          cumulative: evicted.length > 0 ? absorb(state.cumulative, evicted) : state.cumulative,
        }
      }
      const current = state.items[0]
      if (current === undefined) return state
      return touch(patchItem(state, current, { ...current, lastSeq: seq }), seq)
    }
    case 'tool/call': {
      const callId = data.callId
      if (callId === undefined || callId === null || typeof data.name !== 'string') return state
      const id = String(callId)
      const args = data.arguments ?? null
      const pending = {
        ...state.pending,
        [id]: {
          name: data.name,
          keys: callFingerprints(data.name, args, { cwd: state.cwd }),
          paths: FILE_TOOLS.has(data.name) ? callPaths(args, null) : [],
          seq,
        },
      }
      const entries = Object.entries(pending)
      if (entries.length > PENDING_MAX) {
        entries.sort((a, b) => a[1].seq - b[1].seq)
        for (const [key] of entries.slice(0, entries.length - PENDING_MAX)) delete pending[key]
      }
      // A buffered call is not a fact until its result arrives.
      return { ...state, pending }
    }
    case 'tool/result': {
      const message = data.message
      const rawId = message?.source?.kind === 'tool' ? message.source.callId : message?.toolCallId
      if (rawId === undefined || rawId === null) return state
      const call = state.pending[String(rawId)]
      if (call === undefined) return state
      const pending = { ...state.pending }
      delete pending[String(rawId)]
      const failed = message?.isError === true || data.error != null
      const item = state.items[0]
      if (item === undefined || item.tier !== 'full') {
        const unattributed = {
          ...state.unattributed,
          calls: state.unattributed.calls + 1,
          failures: state.unattributed.failures + (failed ? 1 : 0),
        }
        return { ...touch(state, seq), pending, unattributed }
      }
      let patch = { ...item, calls: item.calls + 1, lastSeq: seq }
      if (failed) {
        patch = { ...patch, failedCalls: patch.failedCalls + 1 }
        const metaPaths = callPaths(null, data.meta)
        const path = metaPaths[0] ?? call.paths[0] ?? null
        const entries = call.keys.length > 0
          ? call.keys.map(key => ({ tool: call.name, key, path: FILE_TOOLS.has(call.name) ? path : null }))
          : [{ tool: call.name, key: null, path: null }]
        let failures = patch.failures
        let truncated = patch.truncated.failures
        for (const entry of entries) {
          const index = failures.findIndex(f => f.tool === entry.tool && f.key === entry.key)
          if (index < 0) {
            failures = [...failures, {
              ...entry, count: 1, firstSeq: seq, lastSeq: seq, callId: String(rawId),
            }]
          } else {
            failures = failures.map((f, i) => (i === index
              ? { ...f, count: f.count + 1, lastSeq: seq, callId: String(rawId) } : f))
          }
        }
        if (failures.length > FAILURES_MAX) {
          // Keep the most recently failed entries, in their original order.
          truncated += failures.length - FAILURES_MAX
          const keep = new Set(failures.slice().sort((a, b) => b.lastSeq - a.lastSeq).slice(0, FAILURES_MAX))
          failures = failures.filter(f => keep.has(f))
        }
        patch = { ...patch, failures, truncated: { ...patch.truncated, failures: truncated } }
      } else {
        // Recovery: same fingerprint succeeding in the same item clears it;
        // bash additionally needs the terminal-marker success check.
        const clears = call.name === 'bash' ? (successfulBash(data) ? call.keys : []) : call.keys
        if (clears.length > 0) {
          const cleared = new Set(clears)
          const kept = patch.failures.filter(f => f.key === null || !cleared.has(f.key))
          if (kept.length !== patch.failures.length) {
            const recovered = patch.failures.reduce((n, f) => (kept.includes(f) ? n : n + f.count), 0)
            patch = { ...patch, failures: kept, recovered: patch.recovered + recovered }
          }
        }
        if (FILE_TOOLS.has(call.name)) {
          const metaPaths = callPaths(null, data.meta)
          const paths = metaPaths.length > 0 ? metaPaths : call.paths
          let files = patch.files
          let truncated = patch.truncated.files
          for (const path of paths) {
            if (Buffer.byteLength(path) > PATH_MAX_BYTES) continue
            const index = files.findIndex(f => f.path === path)
            files = index < 0
              ? [...files, { path, firstSeq: seq, lastSeq: seq }]
              : files.map((f, i) => (i === index ? { ...f, lastSeq: seq } : f))
          }
          if (files.length > FILES_MAX) {
            truncated += files.length - FILES_MAX
            files = files.slice().sort((a, b) => b.lastSeq - a.lastSeq).slice(0, FILES_MAX)
              .sort((a, b) => a.firstSeq - b.firstSeq || a.lastSeq - b.lastSeq)
          }
          patch = { ...patch, files, truncated: { ...patch.truncated, files: truncated } }
        }
      }
      return touch(patchItem(state, item, patch), seq)
    }
    case 'todo/write': {
      const item = state.items[0]
      if (item === undefined || item.tier !== 'full') return state
      const todos = Array.isArray(data.todos) ? data.todos : []
      const now = event.time ?? 0
      // Identity is the stored (≤200B) content, so an over-long task re-listed
      // later matches its own row. First occurrence wins inside one snapshot.
      const listed = new Map()
      for (const todo of todos) {
        if (todo === null || typeof todo !== 'object' || typeof todo.content !== 'string' || todo.content === '') continue
        const content = utf8Slice(todo.content, TEXT_MAX_BYTES)
        if (listed.has(content)) continue
        listed.set(content, todo.status === 'completed' || todo.status === 'in_progress' ? todo.status : 'pending')
      }
      // completed is sticky: a revert never clears the mark; re-completion
      // never rewrites the first one (T-O-15).
      const mark = (task, status) => {
        const next = task.status === status ? task : { ...task, status }
        return status === 'completed' && next.completedSeq === undefined
          ? { ...next, completedSeq: seq, completedAt: now } : next
      }
      // A task missing from this snapshot keeps its last status (T-O-15).
      let tasks = item.tasks.map(task => {
        const status = listed.get(task.content)
        if (status === undefined) return task
        listed.delete(task.content)
        return mark(task, status)
      })
      for (const [content, status] of listed) tasks.push(mark({ content, status, firstSeq: seq }, status))
      let truncated = item.truncated.tasks
      if (tasks.length > TASKS_MAX) {
        // Rows stay in first-listed order, so the oldest are at the front.
        truncated += tasks.length - TASKS_MAX
        tasks = tasks.slice(tasks.length - TASKS_MAX)
      }
      return touch(patchItem(state, item, {
        ...item, tasks, lastSeq: seq,
        truncated: { ...item.truncated, tasks: truncated },
      }), seq)
    }
    case 'approval/asked': {
      const id = data.id
      if (id === undefined || id === null) return state
      const approvals = { ...state.approvals, [String(id)]: state.items[0]?.id ?? null }
      const item = state.items[0]
      if (item === undefined || item.tier !== 'full') return { ...state, approvals }
      return touch(patchItem({ ...state, approvals }, item, { ...item, awaiting: item.awaiting + 1, lastSeq: seq }), seq)
    }
    case 'approval/decided': {
      const key = data.id === undefined || data.id === null ? null : String(data.id)
      if (key === null || !(key in state.approvals)) return state
      const itemId = state.approvals[key]
      const approvals = { ...state.approvals }
      delete approvals[key]
      const item = state.items.find(entry => entry.id === itemId)
      if (item === undefined || item.tier !== 'full' || item.awaiting === 0) return { ...state, approvals }
      return touch(patchItem({ ...state, approvals }, item, { ...item, awaiting: item.awaiting - 1, lastSeq: seq }), seq)
    }
    case 'goal/change': {
      const current = state.items[0]
      if (current === undefined) return state
      return touch(patchItem(state, current, { ...current, lastSeq: seq }), seq)
    }
    default:
      return state
  }
}

/** Item status word: an undecided approval → 'waiting'; an open turn in
 *  flight on the current item → 'in progress'; else the last end reason. */
function itemStatus(item, isCurrent, state) {
  if (item.tier !== 'full') return item.endReason ?? 'completed'
  if (item.awaiting > 0) return 'waiting'
  if (isCurrent && state.turnOpen) return 'in progress'
  if (item.endReason !== null) return item.endReason
  return 'in progress'
}

function itemView(item, index, state) {
  if (item.tier !== 'full') {
    return {
      tier: 'skeleton', kind: item.kind,
      ...(item.goalId !== undefined ? { goalId: item.goalId } : {}),
      status: itemStatus(item, false, state), endReason: item.endReason,
      firstSeq: item.firstSeq, lastSeq: item.lastSeq,
      counts: {
        calls: item.calls, failures: item.failedCalls,
        files: item.filesCount, tasks: item.tasksCount,
        unresolved: item.unresolvedCount,
      },
    }
  }
  return {
    tier: 'full', kind: item.kind,
    ...(item.goalId !== undefined ? { goalId: item.goalId } : {}),
    status: itemStatus(item, index === 0, state), endReason: item.endReason,
    firstSeq: item.firstSeq, lastSeq: item.lastSeq,
    files: item.files,
    failures: item.failures.map(({ tool, key, path, count, firstSeq, lastSeq, callId }) => (
      { tool, key, path, count, firstSeq, lastSeq, callId })),
    tasks: item.tasks,
    counts: {
      calls: item.calls, failures: item.failedCalls,
      files: item.files.length, tasks: item.tasks.length,
      unresolved: item.failures.reduce((n, f) => n + f.count, 0),
      recovered: item.recovered,
    },
    truncated: item.truncated,
  }
}

const isCount = value => Number.isSafeInteger(value) && value >= 0
const isPath = value => typeof value === 'string' && Buffer.byteLength(value) <= PATH_MAX_BYTES
const isText = value => typeof value === 'string' && Buffer.byteLength(value) <= TEXT_MAX_BYTES

function parseItem(value) {
  if (!value || typeof value !== 'object' || !isCount(value.id)
    || (value.tier !== 'full' && value.tier !== 'skeleton')
    || !ITEM_KINDS.has(value.kind) || (value.goalId !== undefined && typeof value.goalId !== 'string')
    || !isCount(value.firstSeq) || !isCount(value.lastSeq)) {
    throw new Error('Invalid progress ledger item')
  }
  rejectUnknown(value, value.tier === 'full' ? ALLOWED_ITEM_FULL : ALLOWED_ITEM_SKEL, `item ${value.tier}`)
  if (value.truncated !== undefined) rejectUnknown(value.truncated, ALLOWED_ITEM_TRUNC, 'item.truncated')
  if (value.tier === 'full') {
    if (!Array.isArray(value.files) || value.files.length > FILES_MAX
      || !Array.isArray(value.failures) || value.failures.length > FAILURES_MAX
      || !Array.isArray(value.tasks) || value.tasks.length > TASKS_MAX) {
      throw new Error('Invalid progress ledger item: collection over limit')
    }
    for (const f of value.files) { if (f && typeof f === 'object') rejectUnknown(f, ALLOWED_FILE, 'file') }
    for (const f of value.failures) { if (f && typeof f === 'object') rejectUnknown(f, ALLOWED_FAILURE, 'failure') }
    for (const t of value.tasks) { if (t && typeof t === 'object') rejectUnknown(t, ALLOWED_TASK, 'task') }
  }
  const base = {
    id: value.id, tier: value.tier, kind: value.kind,
    ...(value.goalId !== undefined ? { goalId: value.goalId } : {}),
    endReason: typeof value.endReason === 'string' ? value.endReason : null,
    firstSeq: value.firstSeq, lastSeq: value.lastSeq,
    calls: isCount(value.calls) ? value.calls : 0,
    failedCalls: isCount(value.failedCalls) ? value.failedCalls : 0,
  }
  if (value.tier !== 'full') {
    return { ...base, filesCount: isCount(value.filesCount) ? value.filesCount : 0,
      tasksCount: isCount(value.tasksCount) ? value.tasksCount : 0,
      unresolvedCount: isCount(value.unresolvedCount) ? value.unresolvedCount : 0 }
  }
  return {
    ...base,
    awaiting: isCount(value.awaiting) ? value.awaiting : 0,
    recovered: isCount(value.recovered) ? value.recovered : 0,
    files: (value.files ?? []).filter(f => f && isPath(f.path) && isCount(f.firstSeq) && isCount(f.lastSeq))
      .map(f => ({ path: f.path, firstSeq: f.firstSeq, lastSeq: f.lastSeq })),
    failures: (value.failures ?? [])
      .filter(f => f && typeof f.tool === 'string' && (f.key === null || isDigest(f.key))
        && isCount(f.firstSeq) && isCount(f.lastSeq) && isCount(f.count))
      .map(f => ({
        tool: f.tool, key: f.key,
        path: typeof f.path === 'string' && Buffer.byteLength(f.path) <= PATH_MAX_BYTES ? f.path : null,
        count: f.count, firstSeq: f.firstSeq, lastSeq: f.lastSeq,
        callId: typeof f.callId === 'string' && isText(f.callId) ? f.callId : '',
      })),
    tasks: (value.tasks ?? []).filter(t => t && isText(t.content) && isCount(t.firstSeq))
      .map(t => ({
        content: t.content, status: t.status === 'completed' || t.status === 'in_progress' ? t.status : 'pending',
        firstSeq: t.firstSeq,
        ...(isCount(t.completedSeq) && Number.isFinite(t.completedAt)
          ? { completedSeq: t.completedSeq, completedAt: t.completedAt } : {}),
      })),
    truncated: {
      files: isCount(value.truncated?.files) ? value.truncated.files : 0,
      failures: isCount(value.truncated?.failures) ? value.truncated.failures : 0,
      tasks: isCount(value.truncated?.tasks) ? value.truncated.tasks : 0,
    },
  }
}

function parseState(value) {
  if (!value || typeof value !== 'object' || value.v !== STATE_VERSION
    || !isCount(value.inherited) || !isDigest(value.cwd)
    || !Array.isArray(value.items) || value.items.length > ITEMS_MAX
    || value.items.filter(item => item?.tier === 'full').length > FULL_MAX
    || !value.pending || typeof value.pending !== 'object' || Array.isArray(value.pending)
    || !value.approvals || typeof value.approvals !== 'object' || Array.isArray(value.approvals)
    || !value.unattributed || typeof value.unattributed !== 'object'
    || !value.cumulative || typeof value.cumulative !== 'object') {
    throw new Error('Invalid progress ledger checkpoint')
  }
  rejectUnknown(value, ALLOWED_STATE, 'state')
  if (Object.keys(value.pending).length > PENDING_MAX) throw new Error('Invalid progress ledger checkpoint: pending over limit')
  rejectUnknown(value.unattributed, ALLOWED_UNATTR, 'unattributed')
  rejectUnknown(value.cumulative, ALLOWED_CUMULATIVE, 'cumulative')
  const pending = {}
  for (const [id, call] of Object.entries(value.pending)) {
    if (call && typeof call.name === 'string' && isCount(call.seq)
      && Array.isArray(call.keys) && call.keys.every(isDigest)
      && Array.isArray(call.paths) && call.paths.every(isPath)) {
      rejectUnknown(call, ALLOWED_PENDING, 'pending')
      pending[id] = { name: call.name, keys: [...call.keys], paths: [...call.paths], seq: call.seq }
    } else {
      throw new Error('Invalid progress ledger checkpoint: pending entry')
    }
  }
  const approvals = {}
  for (const [id, itemId] of Object.entries(value.approvals)) {
    if (isCount(itemId) || itemId === null) approvals[id] = itemId
  }
  return {
    v: STATE_VERSION,
    inherited: value.inherited, cwd: value.cwd,
    firstSeq: isCount(value.firstSeq) ? value.firstSeq : null,
    asOfSeq: isCount(value.asOfSeq) ? value.asOfSeq : value.inherited,
    turn: isCount(value.turn) ? value.turn : 0,
    turnOpen: value.turnOpen === true,
    openedThisTurn: value.openedThisTurn === true,
    items: value.items.map(parseItem),
    pending, approvals,
    unattributed: {
      calls: isCount(value.unattributed.calls) ? value.unattributed.calls : 0,
      failures: isCount(value.unattributed.failures) ? value.unattributed.failures : 0,
    },
    cumulative: Object.fromEntries([...ALLOWED_CUMULATIVE].map(key => (
      [key, isCount(value.cumulative[key]) ? value.cumulative[key] : 0]))),
  }
}

// Whitelist rejection (P2-01 l): contraband fields and oversized collections
// throw instead of being silently rebuilt away.
const ALLOWED_STATE = new Set(['v', 'inherited', 'cwd', 'firstSeq', 'asOfSeq', 'turn',
  'turnOpen', 'openedThisTurn', 'items', 'pending', 'approvals', 'unattributed', 'cumulative'])
const ALLOWED_ITEM_FULL = new Set(['id', 'tier', 'kind', 'goalId', 'endReason', 'awaiting',
  'firstSeq', 'lastSeq', 'calls', 'failedCalls', 'recovered', 'files', 'failures', 'tasks', 'truncated'])
const ALLOWED_ITEM_SKEL = new Set(['id', 'tier', 'kind', 'goalId', 'endReason',
  'firstSeq', 'lastSeq', 'calls', 'failedCalls', 'filesCount', 'tasksCount', 'unresolvedCount'])
const ALLOWED_PENDING = new Set(['name', 'keys', 'paths', 'seq'])
const ALLOWED_FAILURE = new Set(['tool', 'key', 'path', 'count', 'firstSeq', 'lastSeq', 'callId'])
const ALLOWED_FILE = new Set(['path', 'firstSeq', 'lastSeq'])
const ALLOWED_TASK = new Set(['content', 'status', 'firstSeq', 'completedSeq', 'completedAt'])
const ALLOWED_UNATTR = new Set(['calls', 'failures'])
const ALLOWED_CUMULATIVE = new Set(['items', 'lastSeq', 'calls', 'failures', 'files', 'tasks', 'unresolved'])
const ALLOWED_ITEM_TRUNC = new Set(['files', 'failures', 'tasks'])

function rejectUnknown(value, allowed, what) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`Invalid progress ledger checkpoint: ${what}.${key}`)
  }
}

// Reference-stability caches: the wire layer suppresses publication for
// unchanged state, and unchanged items must keep the same view object so the
// client and read_progress see no phantom churn. Items are immutable, so a
// WeakMap keyed by the item object is exact.
const itemViewCache = new WeakMap()
const currentViewCache = new WeakMap()
const stateViewCache = new WeakMap()

function cachedItemView(item, index, state) {
  // The current item's status also depends on state.turnOpen, so it gets its
  // own cache slot per turnOpen value; every other item depends on the item
  // object alone. Separate maps keep a slot from leaking out as a view when
  // the current item shifts to index 1.
  if (index === 0 && item.tier === 'full') {
    let slot = currentViewCache.get(item)
    if (slot === undefined || slot.turnOpen !== state.turnOpen) {
      slot = { turnOpen: state.turnOpen, view: itemView(item, index, state) }
      currentViewCache.set(item, slot)
    }
    return slot.view
  }
  let view = itemViewCache.get(item)
  if (view === undefined) {
    view = itemView(item, index, state)
    itemViewCache.set(item, view)
  }
  return view
}

// Events that change only internal buffers (pending calls, cwd, turn counter)
// produce a new state with the same items; they must yield the same view so
// nothing is republished (T-O-15: unrelated events do not rebuild).
const viewByItems = new WeakMap()

function view(state) {
  let v = stateViewCache.get(state)
  if (v !== undefined) return v
  const prev = viewByItems.get(state.items)
  const turnMatters = state.items[0]?.tier === 'full'
  if (prev !== undefined && prev.asOfSeq === state.asOfSeq
    && (!turnMatters || prev.turnOpen === state.turnOpen)
    && prev.firstSeq === state.firstSeq && prev.inherited === state.inherited
    && prev.unattributed === state.unattributed && prev.cumulative === state.cumulative) {
    v = prev.view
  } else {
    v = {
      v: 1,
      asOfSeq: state.asOfSeq,
      inherited: state.inherited,
      coverage: { firstSeq: state.firstSeq, lastSeq: state.asOfSeq },
      unattributed: state.unattributed,
      cumulative: state.cumulative,
      items: state.items.map((item, index) => cachedItemView(item, index, state)),
    }
    viewByItems.set(state.items, {
      view: v, asOfSeq: state.asOfSeq, turnOpen: state.turnOpen, firstSeq: state.firstSeq,
      inherited: state.inherited, unattributed: state.unattributed, cumulative: state.cumulative,
    })
  }
  stateViewCache.set(state, v)
  return v
}

const viewSchema = {
  parse(value) {
    if (!value || typeof value !== 'object' || value.v !== 1 || !Array.isArray(value.items)) {
      throw new Error('Invalid progress ledger view')
    }
    return value
  },
}

export const progressLedger = {
  key: LEDGER_KEY,
  stateVersion: STATE_VERSION,
  stateSchema: { parse: parseState },
  init: (header, inherited) => ({
    v: STATE_VERSION,
    inherited, cwd: digest(header?.cwd ?? ''),
    firstSeq: null, asOfSeq: inherited,
    turn: 0, turnOpen: false, openedThisTurn: false,
    items: [], pending: {}, approvals: {},
    unattributed: { calls: 0, failures: 0 },
    cumulative: { items: 0, lastSeq: 0, calls: 0, failures: 0, files: 0, tasks: 0, unresolved: 0 },
  }),
  apply,
  wire: { viewSchema, view, summary: false },
}
