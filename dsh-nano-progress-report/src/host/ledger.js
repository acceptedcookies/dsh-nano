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
 *  evicts the oldest skeleton.
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
// 16, tasks 32; unpaired-call buffer 64; titles/task text 200B; paths 192B.
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

const utf8Slice = (text, maxBytes) => {
  const buf = Buffer.from(String(text), 'utf8')
  return buf.length <= maxBytes ? buf.toString('utf8') : buf.subarray(0, maxBytes).toString('utf8')
}

function messageText(data) {
  const content = data?.content ?? data?.message?.content ?? data?.text
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const parts = []
    for (const block of content) {
      if (block && typeof block.text === 'string') parts.push(block.text)
      else if (typeof block === 'string') parts.push(block)
    }
    return parts.join('\n')
  }
  return ''
}

const newItem = (seq, kind, text) => ({
  id: seq, tier: 'full', kind, title: utf8Slice(text, TEXT_MAX_BYTES),
  endReason: null, awaiting: 0,
  firstSeq: seq, lastSeq: seq,
  calls: 0, failedCalls: 0,
  files: [], failures: [], tasks: [], jobs: [],
  truncated: { files: 0, failures: 0, tasks: 0 },
})

/** Collapse a full item to its skeleton: identity, coverage, counts only. */
const skeletonOf = item => ({
  id: item.id, tier: 'skeleton', kind: item.kind, title: item.title,
  endReason: item.endReason, firstSeq: item.firstSeq, lastSeq: item.lastSeq,
  calls: item.calls, failedCalls: item.failedCalls,
  filesCount: item.files.length, tasksCount: item.tasks.length,
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
  let evicted = 0
  while (next.length > ITEMS_MAX) {
    next.pop()
    evicted += 1
  }
  return { items: next, evicted }
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
      let next = {
        ...touch(state, seq),
        turn: state.turn + 1, turnOpen: true, pending: {},
      }
      const current = next.items[0]
      if (current !== undefined) {
        next = patchItem(next, current, { ...current, lastSeq: seq })
      }
      return next
    }
    case 'turn/end': {
      const reason = typeof data.reason === 'string' ? data.reason : (data.reason?.kind ?? 'completed')
      let next = touch({ ...state, turnOpen: false }, seq)
      const current = next.items[0]
      if (current !== undefined) {
        next = patchItem(next, current, { ...current, endReason: reason, lastSeq: seq })
      }
      return next
    }
    case 'working-directory/change': {
      if (typeof data.cwd !== 'string') return state
      const cwd = digest(data.cwd)
      return cwd === state.cwd ? state : { ...touch(state, seq), cwd }
    }
    case 'user/message': {
      const kind = openKind(data.source?.kind)
      if (kind !== null) {
        const { items, evicted } = rebalance([newItem(seq, kind, messageText(data)), ...state.items])
        const next = { ...touch(state, seq), items }
        return evicted > 0 ? { ...next, truncated: { ...next.truncated, items: next.truncated.items + evicted } } : next
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
      return { ...touch(state, seq), pending }
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
        const entries = call.keys.length > 0
          ? call.keys.map(key => ({ tool: call.name, key, seq, callId: String(rawId) }))
          : [{ tool: call.name, key: null, seq, callId: String(rawId) }]
        let failures = patch.failures
        let truncated = patch.truncated.failures
        for (const entry of entries) {
          if (failures.some(f => f.tool === entry.tool && f.key === entry.key)) continue
          failures = [...failures, entry]
        }
        if (failures.length > FAILURES_MAX) {
          truncated += failures.length - FAILURES_MAX
          failures = failures.slice(failures.length - FAILURES_MAX)
        }
        patch = { ...patch, failures, truncated: { ...patch.truncated, failures: truncated } }
      } else {
        // Recovery: same fingerprint succeeding in the same item clears it;
        // bash additionally needs the terminal-marker success check.
        const clears = call.name === 'bash' ? (successfulBash(data) ? call.keys : []) : call.keys
        if (clears.length > 0) {
          const cleared = new Set(clears)
          const kept = patch.failures.filter(f => f.key === null || !cleared.has(f.key))
          if (kept.length !== patch.failures.length) patch = { ...patch, failures: kept }
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
      const byContent = new Map(item.tasks.map(task => [task.content, task]))
      let tasks = []
      for (const todo of todos) {
        if (todo === null || typeof todo.content !== 'string' || todo.content === '') continue
        const status = todo.status === 'completed' || todo.status === 'in_progress' ? todo.status : 'pending'
        const prev = byContent.get(todo.content)
        if (prev === undefined) {
          tasks.push({ content: utf8Slice(todo.content, TEXT_MAX_BYTES), status, firstSeq: seq })
          byContent.set(todo.content, tasks[tasks.length - 1])
          continue
        }
        // completed is sticky: a revert never clears it; re-completion never
        // rewrites the first completion mark.
        const next = { ...prev, status }
        if (status === 'completed' && prev.completedSeq === undefined) {
          next.completedSeq = seq
          next.completedAt = now
        }
        tasks.push(next)
      }
      let truncated = item.truncated.tasks
      if (tasks.length > TASKS_MAX) {
        truncated += tasks.length - TASKS_MAX
        tasks = tasks.slice().sort((a, b) => b.firstSeq - a.firstSeq).slice(0, TASKS_MAX)
          .sort((a, b) => a.firstSeq - b.firstSeq)
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
      let next = { ...touch(state, seq), approvals }
      const item = next.items[0]
      if (item !== undefined && item.tier === 'full') {
        next = patchItem(next, item, { ...item, awaiting: item.awaiting + 1, lastSeq: seq })
      }
      return next
    }
    case 'approval/decided': {
      const key = data.id === undefined || data.id === null ? null : String(data.id)
      if (key === null || !(key in state.approvals)) return state
      const itemId = state.approvals[key]
      const approvals = { ...state.approvals }
      delete approvals[key]
      let next = { ...touch(state, seq), approvals }
      const item = next.items.find(entry => entry.id === itemId)
      if (item !== undefined && item.tier === 'full' && item.awaiting > 0) {
        next = patchItem(next, item, { ...item, awaiting: item.awaiting - 1, lastSeq: seq })
      }
      return next
    }
    case 'job/registered': {
      if (data.jobId === undefined || data.jobId === null) return state
      const item = state.items[0]
      if (item === undefined || item.tier !== 'full') {
        return {
          ...touch(state, seq),
          unattributed: { ...state.unattributed, jobs: state.unattributed.jobs + 1 },
        }
      }
      const entry = {
        jobId: String(data.jobId),
        label: utf8Slice(String(data.label ?? data.kind ?? data.jobId), TEXT_MAX_BYTES),
        status: 'running', firstSeq: seq,
        callId: data.callId === undefined ? undefined : String(data.callId),
      }
      const jobs = [...item.jobs.filter(job => job.jobId !== entry.jobId), entry]
      return touch(patchItem(state, item, { ...item, jobs, lastSeq: seq }), seq)
    }
    case 'job/settled': {
      if (data.jobId === undefined || data.jobId === null) return state
      const jobId = String(data.jobId)
      const status = data.status === 'failed' || data.status === 'killed' ? 'failed' : 'done'
      let changed = false
      const items = state.items.map(item => {
        const index = item.jobs?.findIndex(job => job.jobId === jobId) ?? -1
        if (index < 0) return item
        changed = true
        return {
          ...item, lastSeq: seq,
          jobs: item.jobs.map((job, i) => (i === index ? { ...job, status } : job)),
        }
      })
      return changed ? { ...touch(state, seq), items } : state
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
      tier: 'skeleton', kind: item.kind, title: item.title,
      status: itemStatus(item, false, state), endReason: item.endReason,
      firstSeq: item.firstSeq, lastSeq: item.lastSeq,
      counts: {
        calls: item.calls, failures: item.failedCalls,
        files: item.filesCount, tasks: item.tasksCount,
      },
    }
  }
  return {
    tier: 'full', kind: item.kind, title: item.title,
    status: itemStatus(item, index === 0, state), endReason: item.endReason,
    firstSeq: item.firstSeq, lastSeq: item.lastSeq,
    files: item.files,
    failures: item.failures.map(({ tool, seq, callId }) => ({ tool, seq, callId })),
    tasks: item.tasks, jobs: item.jobs,
    counts: {
      calls: item.calls, failures: item.failedCalls,
      files: item.files.length, tasks: item.tasks.length, jobs: item.jobs.length,
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
    || typeof value.kind !== 'string' || !isText(value.title)
    || !isCount(value.firstSeq) || !isCount(value.lastSeq)) {
    throw new Error('Invalid progress ledger item')
  }
  const base = {
    id: value.id, tier: value.tier, kind: value.kind, title: value.title,
    endReason: typeof value.endReason === 'string' ? value.endReason : null,
    firstSeq: value.firstSeq, lastSeq: value.lastSeq,
    calls: isCount(value.calls) ? value.calls : 0,
    failedCalls: isCount(value.failedCalls) ? value.failedCalls : 0,
  }
  if (value.tier !== 'full') {
    return { ...base, filesCount: isCount(value.filesCount) ? value.filesCount : 0,
      tasksCount: isCount(value.tasksCount) ? value.tasksCount : 0 }
  }
  return {
    ...base,
    awaiting: isCount(value.awaiting) ? value.awaiting : 0,
    files: (value.files ?? []).filter(f => f && isPath(f.path) && isCount(f.firstSeq) && isCount(f.lastSeq))
      .map(f => ({ path: f.path, firstSeq: f.firstSeq, lastSeq: f.lastSeq })),
    failures: (value.failures ?? [])
      .filter(f => f && typeof f.tool === 'string' && (f.key === null || isDigest(f.key)) && isCount(f.seq))
      .map(f => ({ tool: f.tool, key: f.key, seq: f.seq, callId: String(f.callId ?? '') })),
    tasks: (value.tasks ?? []).filter(t => t && isText(t.content) && isCount(t.firstSeq))
      .map(t => ({
        content: t.content, status: t.status === 'completed' || t.status === 'in_progress' ? t.status : 'pending',
        firstSeq: t.firstSeq,
        ...(t.completedSeq !== undefined ? { completedSeq: t.completedSeq, completedAt: t.completedAt } : {}),
      })),
    jobs: (value.jobs ?? []).filter(j => j && typeof j.jobId === 'string')
      .map(j => ({ jobId: j.jobId, label: j.label ?? '', status: j.status ?? 'running',
        firstSeq: isCount(j.firstSeq) ? j.firstSeq : 0,
        ...(j.callId !== undefined ? { callId: String(j.callId) } : {}) })),
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
    || !value.truncated || typeof value.truncated !== 'object') {
    throw new Error('Invalid progress ledger checkpoint')
  }
  const pending = {}
  for (const [id, call] of Object.entries(value.pending)) {
    if (call && typeof call.name === 'string' && isCount(call.seq)
      && Array.isArray(call.keys) && call.keys.every(isDigest)
      && Array.isArray(call.paths) && call.paths.every(isPath)) {
      pending[id] = { name: call.name, keys: [...call.keys], paths: [...call.paths], seq: call.seq }
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
    items: value.items.map(parseItem),
    pending, approvals,
    unattributed: {
      calls: isCount(value.unattributed.calls) ? value.unattributed.calls : 0,
      failures: isCount(value.unattributed.failures) ? value.unattributed.failures : 0,
      jobs: isCount(value.unattributed.jobs) ? value.unattributed.jobs : 0,
    },
    truncated: {
      items: isCount(value.truncated.items) ? value.truncated.items : 0,
    },
  }
}

// Reference-stability caches: the wire layer suppresses publication for
// unchanged state, and unchanged items must keep the same view object so the
// client and read_progress see no phantom churn. Items are immutable, so a
// WeakMap keyed by the item object is exact.
const itemViewCache = new WeakMap()
const stateViewCache = new WeakMap()

function cachedItemView(item, index, state) {
  const key = index === 0 ? { item, isCurrent: true, turnOpen: state.turnOpen } : null
  // Current-item status depends on state.turnOpen; cache only non-current
  // items by reference, and cache the current item per turnOpen value.
  if (index !== 0) {
    let view = itemViewCache.get(item)
    if (view === undefined) {
      view = itemView(item, index, state)
      itemViewCache.set(item, view)
    }
    return view
  }
  if (key !== null && item.tier === 'full') {
    let slot = itemViewCache.get(item)
    if (slot === undefined || slot.turnOpen !== state.turnOpen) {
      slot = { turnOpen: state.turnOpen, view: itemView(item, index, state) }
      itemViewCache.set(item, slot)
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

function view(state) {
  let v = stateViewCache.get(state)
  if (v !== undefined) return v
  v = {
    v: 1,
    asOfSeq: state.asOfSeq,
    inherited: state.inherited,
    coverage: { firstSeq: state.firstSeq, lastSeq: state.asOfSeq },
    unattributed: state.unattributed,
    truncated: state.truncated,
    items: state.items.map((item, index) => cachedItemView(item, index, state)),
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
    turn: 0, turnOpen: false,
    items: [], pending: {}, approvals: {},
    unattributed: { calls: 0, failures: 0, jobs: 0 },
    truncated: { items: 0 },
  }),
  apply,
  wire: { viewSchema, view, summary: false },
}
