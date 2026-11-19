/** Message-row Definitions: real user prompts and assistant text replies. */
import { TARGET } from '../constants.js'
import { blocksText } from '../args.js'

/** `user/message` whose source is a human → 'prompt' row; a goal continuation
 *  (`source: {kind:'goal', goalId, revision, round}`) → 'goal' row. Both open a
 *  turn group. Other sources are injected context; inter-agent sources get
 *  their own rows below. */
export const progressPromptDefinition = {
  kind: 'progress-prompt',
  target: TARGET,
  match(event) {
    if (event.type !== 'user/message') return null
    const kind = event.data?.source?.kind
    return kind === 'user' || kind === 'goal' || kind === 'schedule'
      ? { id: String(event.seq), role: 'start' } : null
  },
  start(context, match) {
    const data = match.event.data
    const source = data.source ?? {}
    return {
      seq: match.event.seq, time: match.event.time,
      text: blocksText(data.content ?? data.message?.content ?? data.text),
      sourceKind: source.kind === 'user' ? undefined : source.kind,
      goal: source.kind === 'goal'
        ? { goalId: String(source.goalId ?? ''), round: Number.isSafeInteger(source.round) ? source.round : undefined }
        : undefined,
    }
  },
  update: context => context.state,
  buildViewNode(context) {
    const state = context.state
    if (state === undefined) return null
    return {
      key: context.key, kind: context.kind, id: context.id, target: TARGET,
      data: {
        row: state.sourceKind === 'schedule' ? 'schedule'
          : state.goal === undefined ? 'prompt' : 'goal',
        seq: state.seq, time: state.time, text: state.text,
        goalId: state.goal?.goalId, round: state.goal?.round,
        location: context.start?.location,
      },
    }
  },
}

/** Source kinds of messages another agent (or the subagent runtime) delivered
 *  into this session. Host payload (dsh-subagent continuation-messages):
 *  `agent-message` = `{kind, form:'relay', senderSessionId}`, text opens with
 *  "Agent <name> sent a message:"; `subagent-settled` = `{kind, form:'notice',
 *  summary, stopReason?, senderSessionId}`. `stopReason` is absent before rc.5.
 *  agent-team mailbox delivery: `team-message` = `{kind, teamId, messageId,
 *  senderId, senderName}`. */
const AGENT_SOURCES = new Set(['agent-message', 'subagent-settled', 'team-message'])

/** Inter-agent `user/message` → 'relay' (send_message from another agent) or
 *  'settled' (background subagent finished) row. Kept apart from 'prompt':
 *  the human did not write these. */
export const progressAgentMessageDefinition = {
  kind: 'progress-agent-message',
  target: TARGET,
  match(event) {
    if (event.type !== 'user/message') return null
    return AGENT_SOURCES.has(event.data?.source?.kind) ? { id: String(event.seq), role: 'start' } : null
  },
  start(context, match) {
    const data = match.event.data
    const source = data.source
    return {
      seq: match.event.seq, time: match.event.time,
      sourceKind: source.kind,
      summary: typeof source.summary === 'string' ? source.summary : undefined,
      stopReason: typeof source.stopReason === 'string' ? source.stopReason : undefined,
      sender: typeof source.senderSessionId === 'string' ? source.senderSessionId
        : typeof source.senderId === 'string' ? source.senderId : undefined,
      senderName: typeof source.senderName === 'string' ? source.senderName : undefined,
      text: blocksText(data.content ?? data.message?.content ?? data.text),
    }
  },
  update: context => context.state,
  buildViewNode(context) {
    const state = context.state
    if (state === undefined) return null
    return {
      key: context.key, kind: context.kind, id: context.id, target: TARGET,
      data: {
        row: state.sourceKind === 'subagent-settled' ? 'settled'
          : state.sourceKind === 'team-message' ? 'team' : 'relay',
        seq: state.seq, time: state.time, text: state.text,
        summary: state.summary, stopReason: state.stopReason, sender: state.sender,
        senderName: state.senderName,
        location: context.start?.location,
      },
    }
  },
}
/** `assistant/message` → 'message' row with first text block as summary and
 *  optional reasoning text folded into the expandable detail. Host payload:
 *  `data.message` = AssistantMessage with `content: ContentBlock[]` tagged by
 *  `block.type` ('text' | 'reasoning' | 'tool-call' | …) — dsh-llm types. */
export const progressAssistantDefinition = {
  kind: 'progress-assistant-message',
  target: TARGET,
  match(event) {
    if (event.type !== 'assistant/message') return null
    const data = event.data ?? {}
    // Identity per spec §3.1: `${turn}:${step}` so a re-emitted message for the
    // same step merges into one row; fall back to seq when the envelope lacks
    // turn/step (e.g. window opened mid-turn).
    const turn = typeof data.turn === 'number' ? data.turn : undefined
    const step = typeof data.step === 'number' ? data.step : undefined
    const id = turn !== undefined && step !== undefined ? `${turn}:${step}` : `seq:${event.seq}`
    return { id, role: 'start' }
  },
  start(context, match) {
    const data = match.event.data
    const message = data.message ?? {}
    const blocks = Array.isArray(message.content) ? message.content : []
    let text = ''
    let reasoning = false
    const reasoningParts = []
    for (const block of blocks) {
      if (block?.type === 'text' && text === '' && typeof block.text === 'string') text = block.text
      if (block?.type === 'reasoning') {
        reasoning = true
        if (typeof block.text === 'string') reasoningParts.push(block.text)
      }
    }
    return {
      seq: match.event.seq, time: match.event.time,
      turn: data.turn, step: data.step, text, reasoning,
      reasoningText: reasoningParts.join('\n'),
      interrupted: message.interrupted === true || data.interrupted === true,
    }
  },
  update(context, match) {
    // Same-step message re-emitted (retry/edit): last write wins.
    // Named self-reference (not this.start) — survives destructured invocation.
    if (context.state === undefined || (match.event.time ?? 0) >= (context.state.time ?? 0)) {
      return progressAssistantDefinition.start(context, match)
    }
    return context.state
  },
  buildViewNode(context) {
    const state = context.state
    if (state === undefined) return null
    return {
      key: context.key, kind: context.kind, id: context.id, target: TARGET,
      data: {
        row: 'message', seq: state.seq, time: state.time, turn: state.turn, step: state.step,
        text: state.text, reasoning: state.reasoning, reasoningText: state.reasoningText,
        interrupted: state.interrupted, location: context.start?.location,
      },
    }
  },
}
