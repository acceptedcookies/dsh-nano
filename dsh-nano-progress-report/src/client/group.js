/** Denoise + turn grouping over seq-sorted ProgressRows. Pure functions.
 *
 *  Denoise (rows stay in the log; only the ledger view folds them):
 *  - a background job registered by a tool call is the same work as that call:
 *    its status folds into the tool row and the job row disappears;
 *  - an assistant message with no text (a tool-call-only step) is not a row:
 *    its reasoning rides on the tools of the same `turn:step`; a reasoning-only
 *    step with no tool row stays visible as "(reasoning)".
 *
 *  Grouping: a human prompt or a goal round opens a group; an inter-agent
 *  message opens one only when no turn is in flight; a `turn/end` row closes
 *  the current group. Activity after a close without an opener (window opened
 *  mid-session, queued input) starts an opener-less group. */

const OPENERS = new Set(['prompt', 'goal', 'schedule'])
const ACTIVITY = new Set(['message', 'shell', 'file', 'web', 'tool', 'todo', 'subagent', 'wait'])

const stepKey = row => `${row.turn}:${row.step}`

/**
 * @param {readonly object[]} sorted - seq-sorted ProgressRows.
 * @returns {object[]} visible rows (tool rows may be shallow copies).
 */
export function denoise(sorted) {
  const toolByCall = new Map()
  const toolsByStep = new Map()
  for (const row of sorted) {
    if (row.kind !== 'progress-tool-call') continue
    const callId = row.detail?.callId
    if (callId) toolByCall.set(callId, row)
    if (row.step >= 0) {
      const key = stepKey(row)
      const list = toolsByStep.get(key)
      if (list === undefined) toolsByStep.set(key, [row])
      else list.push(row)
    }
  }
  const patch = new Map()
  const patched = row => {
    let next = patch.get(row.key)
    if (next === undefined) {
      next = { ...row, detail: { ...row.detail } }
      patch.set(row.key, next)
    }
    return next
  }
  const dropped = new Set()
  for (const row of sorted) {
    if (row.type === 'job') {
      const owner = toolByCall.get(row.detail?.callId)
      if (owner === undefined) continue
      const next = patched(owner)
      const jobStatus = row.status
      next.job = { status: jobStatus, label: row.summary }
      if (jobStatus === 'running' || jobStatus === 'failed') next.status = jobStatus
      dropped.add(row.key)
      continue
    }
    if (row.type === 'message' && row.empty === true) {
      const tools = row.step >= 0 ? toolsByStep.get(stepKey(row)) : undefined
      if (tools === undefined) {
        if (!row.detail?.reasoning) dropped.add(row.key)
        continue
      }
      const reasoning = row.detail?.reasoning
      if (reasoning) {
        const first = patched(tools[0])
        if (!first.detail.reasoning) first.detail.reasoning = reasoning
      }
      dropped.add(row.key)
    }
  }
  if (patch.size === 0 && dropped.size === 0) return sorted.slice()
  const out = []
  for (const row of sorted) {
    if (dropped.has(row.key)) continue
    out.push(patch.get(row.key) ?? row)
  }
  return out
}

/**
 * @typedef {object} ProgressGroup
 * @property {string} key            stable identity (opener key, else first row key)
 * @property {object|null} opener    prompt / goal / peer row that opened the turn
 * @property {object[]} rows         rows inside the turn (excluding opener and end)
 * @property {object|null} end       the closing `turn` row
 * @property {object|null} outcome   last assistant row with text
 * @property {string|null} goalId    goal identity when a goal round opened it
 * @property {number|undefined} round
 * @property {string} status         end status, or 'open' while in flight
 * @property {number} failed         failed rows inside
 * @property {boolean} awaiting      a row inside is awaiting input
 * @property {Record<string, number>} byType  activity counts (messages excluded)
 * @property {number} startTime
 * @property {number} endTime
 */

function newGroup(opener, first) {
  return {
    key: (opener ?? first).key,
    opener, rows: [], end: null, outcome: null,
    goalId: opener?.type === 'goal' ? opener.goalId ?? null : null,
    round: opener?.type === 'goal' ? opener.round : undefined,
    status: 'open', failed: 0, awaiting: false, byType: {},
    startTime: (opener ?? first).time, endTime: (opener ?? first).time,
  }
}

/**
 * @param {readonly object[]} rows - denoised, seq-sorted rows.
 * @returns {ProgressGroup[]}
 */
export function groupRows(rows) {
  const groups = []
  let cur = null
  for (const row of rows) {
    const closed = cur === null || cur.end !== null
    if (OPENERS.has(row.type) || (row.role === 'peer' && closed)) {
      cur = newGroup(row, row)
      groups.push(cur)
      continue
    }
    if (row.type === 'turn') {
      if (cur === null || cur.end !== null) { cur = newGroup(null, row); groups.push(cur) }
      cur.end = row
      cur.status = row.status
      cur.endTime = Math.max(cur.endTime, row.time)
      continue
    }
    if (cur === null || (cur.end !== null && ACTIVITY.has(row.type))) {
      cur = newGroup(null, row)
      groups.push(cur)
    }
    cur.rows.push(row)
    cur.endTime = Math.max(cur.endTime, row.time)
    if (row.status === 'failed') cur.failed += 1
    if (row.status === 'awaiting') cur.awaiting = true
    if (row.type === 'message') {
      if (row.summary !== '' && row.empty !== true) cur.outcome = row
    } else {
      cur.byType[row.type] = (cur.byType[row.type] ?? 0) + 1
    }
  }
  return groups
}
