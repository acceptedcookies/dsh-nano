/** Turn/lifecycle rows: turn-end markers plus a small set of low-frequency
 *  lifecycle events worth surfacing in a progress ledger. */
import { TARGET } from '../constants.js'

/** `turn/end` — one row per finished turn; reason drives failed/normal.
 *  Host payload `{turn, reason}` where `reason` is a TurnEndReason object:
 *  `{kind: completed|aborted|blocked|error|max-tokens|interrupted|forked, …}`,
 *  with error detail on `reason.error`. */
export const progressTurnDefinition = {
  kind: 'progress-turn-end',
  target: TARGET,
  match(event) {
    return event.type === 'turn/end' ? { id: String(event.seq), role: 'start' } : null
  },
  start(context, match) {
    const data = match.event.data
    const reason = data.reason
    const reasonKind = typeof reason === 'string' ? reason : (reason?.kind ?? 'completed')
    return {
      seq: match.event.seq, time: match.event.time, turn: data.turn,
      reason: reasonKind,
      error: reason !== null && typeof reason === 'object' ? reason.error : undefined,
    }
  },
  update: context => context.state,
  buildViewNode(context) {
    const state = context.state
    if (state === undefined) return null
    return {
      key: context.key, kind: context.kind, id: context.id, target: TARGET,
      data: {
        row: 'turn', seq: state.seq, time: state.time, turn: state.turn,
        reason: state.reason, error: state.error,
        location: context.start?.location,
      },
    }
  },
}

/** `approval/asked` + `approval/decided` paired by `data.id` — one row that
 *  starts `awaiting` and flips to ok/rejected on the decision.
 *  decided-only windows rebuild from `context.matches` (the asked event may
 *  sit outside the loaded window; the decided payload carries only {id,outcome}). */
export const progressApprovalDefinition = {
  kind: 'progress-approval',
  target: TARGET,
  match(event) {
    if (event.type !== 'approval/asked' && event.type !== 'approval/decided') return null
    const id = event.data?.id
    if (id === undefined || id === null) return null
    return { id: String(id), role: event.type === 'approval/asked' ? 'start' : 'update' }
  },
  start(context, match) {
    const event = match.event
    const data = event.data ?? {}
    return {
      seq: event.seq, time: event.time,
      toolName: data.toolName, reason: data.reason,
      outcome: undefined,
    }
  },
  update(context, match) {
    if (match.event.type === 'approval/decided') {
      const state = context.state ?? {
        seq: match.event.seq, time: match.event.time,
        toolName: undefined, reason: undefined, outcome: undefined,
      }
      return { ...state, outcome: match.event.data?.outcome }
    }
    return context.state
  },
  buildViewNode(context) {
    // Fallback: the window opened on a decided event (asked outside it).
    const state = context.state ?? (() => {
      const asked = context.matches?.find(m => m.event.type === 'approval/asked')
      const decided = context.matches?.find(m => m.event.type === 'approval/decided')
      if (asked === undefined && decided === undefined) return undefined
      return {
        seq: asked?.event.seq ?? decided.event.seq,
        time: decided?.event.time ?? asked?.event.time,
        toolName: asked?.event.data?.toolName,
        reason: asked?.event.data?.reason,
        outcome: decided?.event.data?.outcome,
      }
    })()
    if (state === undefined) return null
    return {
      key: context.key, kind: context.kind, id: context.id, target: TARGET,
      data: {
        row: 'approval', seq: state.seq, time: state.time,
        toolName: state.toolName, reason: state.reason,
        outcome: state.outcome,
        location: context.start?.location,
      },
    }
  },
}

const LIFECYCLE = {
  'command/run': data => `/${data.name ?? data.commandId ?? 'command'}${typeof data.args === 'string' && data.args !== '' ? ` ${data.args}` : ''}`,
  'command/done': data => `Command ${data.kind === 'error' ? 'failed' : 'done'}${data.text ? `: ${data.text}` : ''}`,
  'plan/mode': data => `Plan mode ${data.active ? 'on' : 'off'}`,
  'model/selection': data => `Model ${data.model ?? 'changed'}${data.provider ? ` (${data.provider})` : ''}`,
  'working-directory/change': data => `Working directory → ${data.cwd ?? data.path ?? ''}`,
  'deliverables/presented': data => `Presented ${Array.isArray(data.files) ? `${data.files.length} file(s)` : 'deliverables'}`,
  'session/end-seed': () => 'Session ended',
  'compaction/start': () => 'Compaction started',
  'compaction/end': data => `Compaction ${data.error ? `failed: ${data.error}` : 'finished'}`,
  'compaction/prune': () => 'Context pruned',
  'compaction/summary': () => 'Context compacted',
}

/** `goal/change` → one 'goal' row per durable goal mutation. Payload is the
 *  full post-mutation snapshot `{operation, goal:{id, objective, phase,
 *  blockedReason?, maxGoalRounds}, roundsStarted}` or the clear tombstone
 *  `{operation:'clear', cleared:{id}}`. Inbox splices are not rows: the
 *  delivered messages already appear as relay/settled/team rows. */
export const progressGoalChangeDefinition = {
  kind: 'progress-goal-change',
  target: TARGET,
  match(event) {
    return event.type === 'goal/change' ? { id: String(event.seq), role: 'start' } : null
  },
  start(context, match) {
    const event = match.event
    const data = event.data ?? {}
    const goal = data.goal ?? {}
    return {
      seq: event.seq, time: event.time,
      operation: typeof data.operation === 'string' ? data.operation : 'edit',
      goalId: String(goal.id ?? data.cleared?.id ?? ''),
      objective: typeof goal.objective === 'string' ? goal.objective : '',
      phase: typeof goal.phase === 'string' ? goal.phase : undefined,
      blocked: typeof goal.blockedReason?.message === 'string' ? goal.blockedReason.message : undefined,
      roundsStarted: Number.isSafeInteger(data.roundsStarted) ? data.roundsStarted : undefined,
      maxGoalRounds: Number.isSafeInteger(goal.maxGoalRounds) ? goal.maxGoalRounds : undefined,
    }
  },
  update: context => context.state,
  buildViewNode(context) {
    const state = context.state
    if (state === undefined) return null
    return {
      key: context.key, kind: context.kind, id: context.id, target: TARGET,
      data: { row: 'goal-change', ...state, location: context.start?.location },
    }
  },
}

/** Low-frequency lifecycle rows. */
export const progressLifecycleDefinition = {
  kind: 'progress-lifecycle',
  target: TARGET,
  match(event) {
    return LIFECYCLE[event.type] !== undefined ? { id: String(event.seq), role: 'start' } : null
  },
  start(context, match) {
    const event = match.event
    return {
      seq: event.seq, time: event.time, eventType: event.type,
      status: event.type === 'command/done' && event.data?.kind === 'error' ? 'failed' : 'ok',
      summary: LIFECYCLE[event.type]?.(event.data ?? {}) ?? event.type,
      detail: JSON.stringify(event.data ?? {}).slice(0, 2000),
    }
  },
  update: context => context.state,
  buildViewNode(context) {
    const state = context.state
    if (state === undefined) return null
    return {
      key: context.key, kind: context.kind, id: context.id, target: TARGET,
      data: {
        row: 'lifecycle', seq: state.seq, time: state.time,
        status: state.status,
        eventType: state.eventType, summary: state.summary, detail: state.detail,
        location: context.start?.location,
      },
    }
  },
}
