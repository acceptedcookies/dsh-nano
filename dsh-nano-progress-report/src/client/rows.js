/** Progress row model + node → row conversion. Pure functions, no ctx/DOM. */
import { isWaitTool, rowTypeOfTool } from './constants.js'
import { argString, blocksText, oneLine, parseArgs } from './args.js'

/**
 * @typedef {object} ProgressRow
 * @property {string} key        engine context key (stable identity)
 * @property {string} kind       definition kind
 * @property {string} id         definition-local id
 * @property {number} seq        anchor seq for ordering
 * @property {number} time       epoch ms
 * @property {string} type       filter `type:` value
 * @property {string} status     filter `status:` value
 * @property {string} summary    single-line display text
 * @property {string} tool       wire tool name for tool rows, else ''
 * @property {boolean} expandable
 * @property {object} detail     expandable payload: {call?, result?, text?, args?, error?, durationMs?, children?}
 * @property {number} turn       owning turn number or -1
 * @property {number} step       owning step number or -1 (assistant/tool rows)
 * @property {string} role       lane: human | goal | agent | peer | exec | boundary
 */

const text = value => oneLine(value ?? '', 140)

const TURN_FAILED = new Set(['error', 'aborted', 'max-tokens', 'interrupted'])

function resultMissing(resultLike) {
  return resultLike === null || resultLike === undefined
}

function turnOf(matchLocation, dataTurn) {
  if (typeof dataTurn === 'number') return dataTurn
  if (matchLocation && (matchLocation.kind === 'step' || matchLocation.kind === 'turn')) {
    return matchLocation.turn?.turn ?? -1
  }
  return -1
}

/** Derive the filter/status value for a completed or running tool call. */
export function toolStatus(resultLike) {
  if (resultLike === null || resultLike === undefined) return 'running'
  if (resultLike.isError === true || resultLike.error !== undefined) return 'failed'
  return 'ok'
}

/** Summary line for a tool call from its wire name + raw args. */
export function toolSummary(name, argsRaw) {
  const args = parseArgs(argsRaw)
  switch (name) {
    case 'bash':
    case 'pwsh':
    case 'terminal':
      return text(argString(args, 'command', 'cmd', 'script') ?? name)
    case 'read':
      return text(`Read ${argString(args, 'file_path', 'path')}`)
    case 'write':
      return text(`Write ${argString(args, 'file_path', 'path')}`)
    case 'edit':
      return text(`Edit ${argString(args, 'file_path', 'path')}`)
    case 'glob':
      return text(`Glob ${argString(args, 'pattern')}`)
    case 'grep':
      return text(`Grep ${argString(args, 'pattern')}`)
    case 'working_directory':
      return text(`cd ${argString(args, 'cd') || '(show)'}`)
    case 'web_fetch':
      return text(`Fetched ${argString(args, 'url')}`)
    case 'web_search':
      return text(`Searched ${argString(args, 'queries')}`)
    case 'skill':
      return text(`Skill ${argString(args, 'name')}`)
    case 'subagent':
    case 'subagent_fork':
      return text(`Agent ${argString(args, 'description', 'name', 'prompt')}`)
    case 'wait_agent':
      return text('Waiting for agent input')
    case 'send_message':
      return text(`Message → ${argString(args, 'agent')}`)
    case 'todo_write':
      return text('Updated task list')
    case 'present':
      return text(`Presented ${argString(args, 'files') || 'files'}`)
    case 'job_kill':
      return text(`Kill job ${argString(args, 'job_id')}`)
    case 'job_list':
      return text('Listed jobs')
    case 'schedule_create':
      return text(`Scheduled ${argString(args, 'title')}`)
    case 'create_goal':
      return text('Created goal')
    case 'update_goal':
      return text(`Goal ${argString(args, 'action')}`)
    case 'ask_user_question':
      return text(`Asked ${argString(args, 'questions') || 'user'}`)
    default:
      return text(name || 'tool')
  }
}

/** Convert one progress ConversationViewNode into a ProgressRow. */
export function rowFromNode(node) {
  const data = node.data ?? {}
  const base = {
    key: node.key, kind: node.kind, id: node.id,
    seq: data.seq ?? 0, time: data.time ?? 0,
    turn: turnOf(data.location, data.turn),
    step: typeof data.step === 'number' ? data.step : -1,
    expandable: false, detail: undefined, tool: '', role: 'exec',
  }
  switch (data.row) {
    case 'prompt':
      return { ...base, type: 'prompt', status: 'ok', role: 'human',
        summary: text(data.text), expandable: (data.text ?? '').length > 140,
        detail: { text: data.text } }
    case 'goal':
      return { ...base, type: 'goal', status: 'ok', role: 'goal',
        goalId: data.goalId, round: data.round,
        summary: text(data.round !== undefined ? `Goal round ${data.round}` : 'Goal round'),
        expandable: (data.text ?? '').length > 0,
        detail: { text: data.text } }
    case 'goal-change': {
      const op = data.operation
      const status = op === 'block' ? 'awaiting' : 'ok'
      const rounds = data.roundsStarted !== undefined && data.maxGoalRounds !== undefined
        ? ` (${data.roundsStarted}/${data.maxGoalRounds})` : ''
      const what = op === 'clear' ? 'Goal cleared'
        : op === 'create' ? `Goal created: ${data.objective}`
          : `Goal ${op}${rounds}${op === 'block' && data.blocked ? `: ${data.blocked}` : ''}`
      return { ...base, type: 'goal', status, role: 'boundary', goalId: data.goalId,
        summary: text(what),
        expandable: (data.objective ?? '').length > 0,
        detail: { text: data.objective || undefined, error: data.blocked } }
    }
    case 'message': {
      const interrupted = data.interrupted === true
      const hasReasoning = data.reasoning === true
      const summaryText = data.text !== '' ? data.text : (hasReasoning ? '(reasoning)' : '')
      return { ...base, type: 'message', status: interrupted ? 'failed' : 'ok', role: 'agent',
        empty: (data.text ?? '') === '',
        summary: text(summaryText),
        expandable: (data.text ?? '').length > 140 || data.reasoning === true,
        detail: { text: data.text, reasoning: data.reasoningText } }
    }
    case 'tool': {
      const type = rowTypeOfTool(data.name)
      const args = parseArgs(data.argsRaw)
      // spec §3.4: wait_agent/send_message with no result yet is 'awaiting',
      // not 'running' — the agent is blocked on external input.
      const status = (data.status === 'running' && isWaitTool(data.name))
        ? 'awaiting'
        : data.status ?? (resultMissing(data.result) && isWaitTool(data.name)
          ? 'awaiting' : toolStatus(data.result))
      const summary = data.name === 'todo_write'
        ? todoSummary(args)
        : toolSummary(data.name, data.argsRaw)
      const children = Array.isArray(data.subCalls)
        ? data.subCalls.map(child => ({
          name: child.name, status: toolStatus(child.isError === true || child.error !== undefined ? child : null),
          summary: toolSummary(child.name, typeof child.arguments === 'string' ? child.arguments : JSON.stringify(child.arguments ?? {})),
          error: child.error === undefined ? undefined : String(child.error.reason ?? child.error.name ?? child.error),
        }))
        : []
      const durationMs = data.callTime !== undefined && data.time !== undefined && data.callTime !== null
        ? Math.max(0, data.time - data.callTime) : undefined
      return { ...base, type, status, summary, tool: data.name ?? '',
        expandable: true,
        detail: {
          argsRaw: data.argsRaw, resultText: data.resultText, error: data.error,
          resultLength: data.resultLength,
          resultTruncated: typeof data.resultLength === 'number' && typeof data.resultText === 'string'
            && data.resultLength > data.resultText.length,
          durationMs, children, callId: data.callId,
        } }
    }
    case 'todo':
      return { ...base, type: 'todo', status: 'ok',
        summary: data.counts
          ? `Task list: ${data.counts.completed}/${data.items} done`
          : 'Task list updated',
        expandable: Array.isArray(data.todos) && data.todos.length > 0,
        detail: { todos: data.todos } }
    case 'turn': {
      // spec §3.4 whitelist: error|aborted|max-tokens|interrupted → failed;
      // blocked → awaiting (paused on owner input); forked/completed → ok.
      const reason = data.reason
      const status = TURN_FAILED.has(reason) ? 'failed'
        : reason === 'blocked' ? 'awaiting' : 'ok'
      return { ...base, type: 'turn', status, role: 'boundary',
        summary: `Turn ${data.turn} ended${reason ? `: ${reason}` : ''}`,
        expandable: data.error !== undefined,
        detail: { error: typeof data.error === 'string' ? data.error : data.error?.message ?? (data.error === undefined ? undefined : String(data.error)) } }
    }
    case 'approval': {
      const outcome = data.outcome
      const pending = outcome === undefined || outcome === null || outcome === ''
      // outcome 'cancelled' stays 'ok' — a withdrawn request is not a failure.
      const status = pending ? 'awaiting' : outcome === 'rejected' || outcome === 'unavailable' ? 'failed' : 'ok'
      const summary = pending
        ? `Approval requested${data.toolName ? `: ${data.toolName}` : ''}`
        : `Approval ${outcome}${data.toolName ? `: ${data.toolName}` : ''}`
      return { ...base, type: 'wait', status,
        summary: text(summary),
        expandable: data.reason !== undefined && data.reason !== '',
        tool: data.toolName ?? '',
        detail: { text: data.reason } }
    }
    case 'relay':
      return { ...base, type: 'subagent', status: 'ok', role: 'peer',
        summary: text(data.text || 'Agent message'),
        expandable: (data.text ?? '').length > 140,
        detail: { text: data.text } }
    case 'settled': {
      // Missing stopReason (pre-rc.5 notices) carries no failure claim;
      // any recorded reason other than 'completed' means the child did not finish.
      const status = data.stopReason === undefined || data.stopReason === 'completed' ? 'ok' : 'failed'
      return { ...base, type: 'subagent', status, role: 'peer',
        summary: text(data.summary || data.text || 'Subagent finished'),
        expandable: (data.text ?? '').length > 0,
        detail: { text: data.text } }
    }
    case 'team':
      return { ...base, type: 'subagent', status: 'ok', role: 'peer',
        summary: text(`${data.senderName || 'Teammate'}: ${data.text || ''}`),
        expandable: (data.text ?? '').length > 140,
        detail: { text: data.text } }
    case 'job': {
      const status = data.status === 'failed' || data.status === 'killed'
        ? 'failed' : data.status === 'running' || data.status === 'stopping'
          ? 'running' : 'ok'
      return { ...base, type: 'job', status,
        summary: text(`Job ${data.label || data.kind || data.jobId}${data.status ? ` (${data.status})` : ''}`),
        expandable: data.detail !== undefined || data.cause !== undefined,
        detail: { text: data.detail, cause: data.cause, callId: data.callId } }
    }
    case 'lifecycle':
      return { ...base, type: 'lifecycle', status: data.status === 'failed' ? 'failed' : 'ok', role: 'boundary',
        summary: text(data.summary ?? data.eventType ?? 'event'),
        expandable: (data.detail ?? '').length > 0,
        detail: { text: data.detail } }
    default:
      return { ...base, type: 'lifecycle', status: 'ok', summary: text(node.kind) }
  }
}

function todoSummary(args) {
  const todos = args?.todos
  if (!Array.isArray(todos)) return 'Updated task list'
  const done = todos.filter(t => t?.status === 'completed').length
  return `Task list: ${done}/${todos.length} done`
}

/** Sort rows by seq (Devin-style chronological order, oldest first). */
export function sortRows(rows) {
  return [...rows].sort((a, b) => (a.seq - b.seq) || (a.time - b.time))
}

/** Derive aggregate counters from rows. */
export function rowCounts(rows) {
  const byType = {}
  let failed = 0
  let running = 0
  let awaiting = 0
  for (const row of rows) {
    byType[row.type] = (byType[row.type] ?? 0) + 1
    if (row.status === 'failed') failed += 1
    if (row.status === 'running') running += 1
    if (row.status === 'awaiting') awaiting += 1
  }
  return { total: rows.length, failed, running, awaiting, byType }
}
