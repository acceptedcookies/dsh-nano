/** Message-row Definitions: real user prompts and assistant text replies. */
import { TARGET } from '../constants.js'
import { blocksText } from '../args.js'

/** `user/message` whose source is a human → 'prompt' row. Other sources are
 *  injected context and do not surface as prompt rows. */
export const progressPromptDefinition = {
  kind: 'progress-prompt',
  target: TARGET,
  match(event) {
    if (event.type !== 'user/message') return null
    return event.data?.source?.kind === 'user' ? { id: String(event.seq), role: 'start' } : null
  },
  start(context, match) {
    const data = match.event.data
    return { seq: match.event.seq, time: match.event.time, text: blocksText(data.content ?? data.message?.content ?? data.text) }
  },
  update: context => context.state,
  buildViewNode(context) {
    const state = context.state
    if (state === undefined) return null
    return {
      key: context.key, kind: context.kind, id: context.id, target: TARGET,
      data: { row: 'prompt', seq: state.seq, time: state.time, text: state.text, location: context.start?.location },
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
      turn: data.turn, text, reasoning,
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
        row: 'message', seq: state.seq, time: state.time, turn: state.turn,
        text: state.text, reasoning: state.reasoning, reasoningText: state.reasoningText,
        interrupted: state.interrupted, location: context.start?.location,
      },
    }
  },
}
