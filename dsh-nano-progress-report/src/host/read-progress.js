/** `read_progress { item?: integer ≥ 0 }` — the model's read-only view of the
 *  session ledger. No `item` → overview: asOfSeq + totals on line 1, one line
 *  per work item (newest first, ≤ 80 lines), a cumulative tail. With `item`
 *  (the first-seq shown in the overview) → that item's tasks, changed files,
 *  unresolved failures with seqs, a recovered-failure count, and honest
 *  truncation notes. Skeleton items give counts only. Plain text, ≤ 16 KiB.
 *  Description, schema, and the six overview slots are verbatim-locked
 *  (T-O-12 / plan §4 P3-02). */
import { kindWord } from './context.js'

const MAX_BYTES = 16 * 1024
const OVERVIEW_MAX_LINES = 80

export const READ_PROGRESS_NAME = 'read_progress'

const clip = text => {
  const buf = Buffer.from(text, 'utf8')
  return buf.length <= MAX_BYTES
    ? buf.toString('utf8')
    : `${buf.subarray(0, MAX_BYTES - 40).toString('utf8')}\n[truncated at 16 KiB]`
}

const taskDone = item => item.tier === 'full'
  ? item.tasks.filter(task => task.status === 'completed').length : 0

function overview(view) {
  const items = view.items ?? []
  const full = items.filter(item => item.tier === 'full')
  const skeletons = items.filter(item => item.tier === 'skeleton')
  const lines = [
    `asOfSeq ${view.asOfSeq} · ${items.length} work items (${full.length} full, ${skeletons.length} skeleton)`,
  ]
  for (const item of items.slice(0, OVERVIEW_MAX_LINES)) {
    const counts = item.counts ?? {}
    const tasks = item.tier === 'full'
      ? `${taskDone(item)}/${item.tasks.length}`
      : `${counts.tasks ?? 0}`
    lines.push(`item ${item.firstSeq} · ${kindWord(item.kind)} · ${item.status}`
      + ` · tasks ${tasks} · files ${counts.files ?? 0} · unresolved failures ${counts.failures ?? 0}`)
  }
  const un = view.unattributed ?? { calls: 0, failures: 0, jobs: 0 }
  const coverage = view.coverage ?? { firstSeq: null, lastSeq: view.asOfSeq }
  lines.push(`cumulative · ${items.length} items (${full.length} full, ${skeletons.length} skeleton)`
    + ` · unattributed ${un.calls} calls, ${un.failures} failures, ${un.jobs} jobs`
    + ` · coverage seq ${coverage.firstSeq ?? 'none'}–${coverage.lastSeq}`)
  return clip(lines.join('\n'))
}

function itemDetail(view, itemId) {
  const item = (view.items ?? []).find(entry => entry.firstSeq === itemId)
  if (item === undefined) {
    throw new Error(`Unknown work item ${itemId}. Omit item for the overview.`)
  }
  if (item.tier !== 'full') {
    const counts = item.counts ?? {}
    return clip(`item ${item.firstSeq} · ${kindWord(item.kind)} · ${item.status}`
      + ` · skeleton: calls ${counts.calls ?? 0}, failures ${counts.failures ?? 0},`
      + ` files ${counts.files ?? 0}, tasks ${counts.tasks ?? 0} · detail not retained`)
  }
  const lines = [`item ${item.firstSeq} · ${kindWord(item.kind)} · ${item.status}`]
  for (const task of item.tasks) {
    lines.push(`task ${task.status} ${task.content}`)
  }
  for (const file of item.files) {
    lines.push(`file ${file.path} seq ${file.firstSeq}${file.lastSeq !== file.firstSeq ? `–${file.lastSeq}` : ''}`)
  }
  for (const failure of item.failures) {
    const path = failure.path ?? '-'
    const seqs = failure.firstSeq === failure.lastSeq || failure.lastSeq === undefined
      ? `${failure.firstSeq ?? failure.seq}` : `${failure.firstSeq ?? failure.seq}–${failure.lastSeq}`
    lines.push(`failure ${failure.tool} ${path} ×${failure.count ?? 1} seq ${seqs}`)
  }
  // Recovered failures surface as a bare count (T-O-12: 已恢复失败只给数量).
  const unresolved = item.failures.reduce((total, f) => total + (f.count ?? 1), 0)
  const recovered = Math.max(0, (item.counts?.failures ?? unresolved) - unresolved)
  if (recovered > 0) lines.push(`recovered failures: ${recovered}`)
  if (item.truncated !== undefined) {
    const extra = (item.truncated.files ?? 0) + (item.truncated.failures ?? 0) + (item.truncated.tasks ?? 0)
    if (extra > 0) lines.push(`另有 ${extra} 条未保留`)
  }
  return clip(lines.join('\n'))
}

/** Wire view for a session, via the registered handle. */
export function viewOfSession(ledger, session) {
  const state = ledger.stateOf(session)
  if (state === undefined) return undefined
  return ledger.wire?.view === undefined ? state : ledger.wire.view(state)
}

/** @param {object} ledger - registered projection handle (stateOf). */
export function makeReadProgressDefinition(ledger) {
  return {
    name: READ_PROGRESS_NAME,
    description: 'Read this session\'s progress record: work items started by user requests, '
      + 'goals, and scheduled tasks, with their tasks, changed files, and tool failures that '
      + 'no later identical call fixed. Omit item for an overview of recent work items; pass '
      + 'an item id from the overview for its details.',
    parameters: {
      type: 'object',
      properties: {
        item: {
          type: 'integer', minimum: 0,
          description: 'Work item id from the overview. Omit for the overview.',
        },
      },
      additionalProperties: false,
    },
    output: { schema: { type: 'string' } },
    isConcurrencySafe: () => true,
    presentCall: args => (args?.item === undefined || args?.item === null
      ? '查看进度概览' : `查看工作项 ${args.item}`),
    presentResult: () => '查看进度',
    when: ({ agent }) => {
      if (agent === undefined || agent === null) return false
      const state = ledger.stateOf(agent.session)
      return state !== undefined && Array.isArray(state.items) && state.items.length > 0
    },
    execute(args, exec) {
      const session = exec?.agent?.session
      if (session === undefined) {
        throw new Error('read_progress: no session context for this call')
      }
      const view = viewOfSession(ledger, session)
      if (view === undefined) {
        throw new Error('read_progress: no ledger for this session')
      }
      return args?.item === undefined || args?.item === null
        ? overview(view) : itemDetail(view, args.item)
    },
  }
}
