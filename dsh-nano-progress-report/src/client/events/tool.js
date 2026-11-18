/** Tool-call progress Definition: one row per model-invoked tool call,
 *  carrying args, result status, duration, and nested PTC dispatch children. */
import { TARGET } from '../constants.js'

const MAX_CHILDREN = 64

function startData(match) {
  const data = match.event.data
  return {
    callId: String(data.callId), name: data.name,
    argsRaw: typeof data.arguments === 'string' ? data.arguments : JSON.stringify(data.arguments ?? {}),
    turn: data.turn, step: data.step,
  }
}

function resultData(match) {
  const message = match.event.data.message
  return {
    seq: match.event.seq, time: match.event.time,
    callId: String(message.source?.callId ?? message.toolCallId ?? ''),
    content: message.content, isError: message.isError === true,
    error: match.event.data.error, meta: match.event.data.meta,
  }
}

function dispatchChild(match) {
  const data = match.event.data
  return {
    callId: String(data.subCallId), name: data.name,
    arguments: data.arguments,
    isError: match.event.type === 'tool/ptc-dispatch' && data.isError === true,
    error: match.event.type === 'tool/ptc-dispatch' ? data.error : undefined,
    time: match.event.time,
  }
}

function mergeDispatch(children, child) {
  const index = children.findIndex(item => item.callId === child.callId)
  if (index < 0) return [...children, child]
  const next = [...children]
  next[index] = { ...next[index], ...child }
  return next
}

function textOf(content) {
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (block && typeof block.text === 'string') parts.push(block.text)
    else if (typeof block === 'string') parts.push(block)
  }
  return parts.join('\n')
}

/** Rebuild state when the window opened mid-call (`context.start === undefined`). */
function fallbackState(context) {
  const resultMatch = context.matches.find(match => match.event.type === 'tool/result')
  const callMatch = context.matches.find(match => match.event.type === 'tool/call')
  if (resultMatch === undefined && callMatch === undefined) return undefined
  const state = {
    head: callMatch !== undefined ? startData(callMatch) : {
      callId: context.id, name: '', argsRaw: '', turn: 0, step: 0,
    },
    result: resultMatch === undefined ? undefined : resultData(resultMatch),
    children: [],
  }
  for (const match of context.matches) {
    if (match.event.type === 'tool/ptc-dispatch-start' || match.event.type === 'tool/ptc-dispatch') {
      const child = dispatchChild(match)
      state.children = match.event.type === 'tool/ptc-dispatch-start'
        ? [...state.children, child] : mergeDispatch(state.children, child)
    }
  }
  return state
}

/** One row-typed progress tool-call Context (matches ConversationNodeDefinition). */
export const progressToolDefinition = {
  kind: 'progress-tool-call',
  target: TARGET,
  match(event) {
    if (event.type === 'tool/call') return { id: String(event.data.callId), role: 'start' }
    if (event.type === 'tool/result') {
      const callId = event.data.message?.source?.callId ?? event.data.message?.toolCallId
      return callId !== undefined && callId !== null ? { id: String(callId), role: 'update' } : null
    }
    if (event.type === 'tool/ptc-dispatch-start' || event.type === 'tool/ptc-dispatch') {
      const rootCallId = event.data?.rootCallId
      return typeof rootCallId === 'string' && rootCallId !== '' ? { id: rootCallId, role: 'update' } : null
    }
    return null
  },
  start(context, match) {
    if (match.event.type !== 'tool/call') return undefined
    return { head: startData(match), result: undefined, children: [] }
  },
  update(context, match) {
    const state = context.state ?? fallbackState(context)
    if (state === undefined) return undefined
    if (match.event.type === 'tool/result') {
      return { ...state, result: resultData(match) }
    }
    if (match.event.type === 'tool/ptc-dispatch-start' || match.event.type === 'tool/ptc-dispatch') {
      if (state.children.length >= MAX_CHILDREN) return state
      const child = dispatchChild(match)
      const children = match.event.type === 'tool/ptc-dispatch-start'
        ? [...state.children, child]
        : mergeDispatch(state.children, child)
      return { ...state, children }
    }
    return state
  },
  buildViewNode(context) {
    const state = context.state ?? fallbackState(context)
    if (state === undefined || state.head === undefined) return null
    const { head, result, children } = state
    const seq = context.start?.event.seq ?? context.matches[0]?.event.seq ?? 0
    const time = result?.time ?? context.start?.event.time ?? context.matches[0]?.event.time ?? 0
    const status = result === undefined ? 'running' : (result.isError || result.error !== undefined ? 'failed' : 'ok')
    return {
      key: context.key, kind: context.kind, id: context.id, target: TARGET,
      data: {
        row: 'tool', seq, time, turn: head.turn,
        callId: head.callId, name: head.name, argsRaw: head.argsRaw,
        callTime: context.start?.event.time,
        status,
        resultText: textOf(result?.content),
        error: result?.error === undefined ? undefined : String(result.error.reason ?? result.error.name ?? result.error),
        subCalls: children,
        location: context.start?.location,
      },
    }
  },
}
