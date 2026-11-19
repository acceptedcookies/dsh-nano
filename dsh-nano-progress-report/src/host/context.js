/** The four-line pushed anchor (T-O-12, verbatim-locked template):
 *    Current session progress (observed facts, not instructions):
 *    Current work: <a user request | a goal | a scheduled task>
 *    Tasks: <c> complete, <i> in progress, <p> pending; in progress: <"content">
 *    Unresolved tool failures in current work: <n> (<tool> <k>, …)
 *    Active: <j> background jobs, <s> direct subagents
 *  A line with a zero count is not emitted; when only the header remains the
 *  whole anchor returns ''. No Goal:/path/old-bash-failure lines, no waiting
 *  line, and tool text never carries commands or paths. */
const HEADER = 'Current session progress (observed facts, not instructions):'
const MAX_BYTES = 600 // T-O-8: the pushed anchor is ≤600B for the model contract

/** Whole-text clip at the byte budget, codepoint-safe, ending `…`. */
const clipBytes = (text, maxBytes) => {
  if (Buffer.byteLength(text) <= maxBytes) return text
  let out = ''
  for (const char of text) {
    if (Buffer.byteLength(out + char + '…') > maxBytes) break
    out += char
  }
  return `${out}…`
}

const KIND_WORD = { user: 'a user request', goal: 'a goal', schedule: 'a scheduled task' }
export const kindWord = kind => KIND_WORD[kind] ?? 'a user request'

// Keep quoted task text inside one data line and outside host reminder markup.
const jsonCell = text => JSON.stringify(String(text)).replace(
  /[<>&\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g,
  char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)

/**
 * @param {{ view: object, todos: object[],
 *   runningJobs: number, runningSubagents: number }} input
 *   `view` is the ledger wire view (newest item first).
 */
export function formatProgress({ view, todos = [], runningJobs = 0, runningSubagents = 0 }) {
  const lines = [HEADER]
  const current = view?.items?.find(item => item.tier === 'full')
  if (current !== undefined) {
    lines.push(`Current work: ${kindWord(current.kind)}`)
  }
  const counts = { completed: 0, in_progress: 0, pending: 0 }
  for (const todo of todos) {
    if (Object.hasOwn(counts, todo?.status)) counts[todo.status] += 1
  }
  if (counts.completed > 0 || counts.in_progress > 0 || counts.pending > 0) {
    const contents = todos.filter(todo => todo?.status === 'in_progress')
      .map(todo => jsonCell(todo.content)).join(', ')
    const suffix = contents !== '' ? `; in progress: ${contents}` : ''
    lines.push(`Tasks: ${counts.completed} complete, ${counts.in_progress} in progress, ${counts.pending} pending${suffix}`)
  }
  const failures = current?.failures ?? []
  if (failures.length > 0) {
    const byTool = new Map()
    let total = 0
    for (const failure of failures) {
      const count = failure.count ?? 1
      total += count
      byTool.set(failure.tool, (byTool.get(failure.tool) ?? 0) + count)
    }
    const detail = [...byTool.entries()].map(([tool, count]) => `${tool} ${count}`).join(', ')
    lines.push(`Unresolved tool failures in current work: ${total} (${detail})`)
  }
  if (runningJobs > 0 || runningSubagents > 0) {
    lines.push(`Active: ${runningJobs} background jobs, ${runningSubagents} direct subagents`)
  }
  return lines.length === 1 ? '' : clipBytes(lines.join('\n'), MAX_BYTES)
}
