/** todo/write and job lifecycle rows. */
import { TARGET } from '../constants.js'

/** `todo/write` → 'todo' row carrying the replaced task list snapshot. */
export const progressTodoDefinition = {
  kind: 'progress-todo-write',
  target: TARGET,
  match(event) {
    return event.type === 'todo/write' ? { id: String(event.seq), role: 'start' } : null
  },
  start(context, match) {
    const todos = Array.isArray(match.event.data?.todos) ? match.event.data.todos : []
    return {
      seq: match.event.seq, time: match.event.time, todos,
      counts: {
        pending: todos.filter(item => item?.status === 'pending').length,
        inProgress: todos.filter(item => item?.status === 'in_progress').length,
        completed: todos.filter(item => item?.status === 'completed').length,
      },
      items: todos.length,
    }
  },
  update: context => context.state,
  buildViewNode(context) {
    const state = context.state
    if (state === undefined) return null
    return {
      key: context.key, kind: context.kind, id: context.id, target: TARGET,
      data: {
        row: 'todo', seq: state.seq, time: state.time,
        todos: state.todos, counts: state.counts, items: state.items,
        location: context.start?.location,
      },
    }
  },
}

/** `job/registered` + `job/settled` → one 'job' row per jobId (start+update). */
export const progressJobDefinition = {
  kind: 'progress-job',
  target: TARGET,
  match(event) {
    if (event.type === 'job/registered') {
      const jobId = event.data?.jobId
      return jobId !== undefined ? { id: String(jobId), role: 'start' } : null
    }
    if (event.type === 'job/settled') {
      const jobId = event.data?.jobId
      return jobId !== undefined ? { id: String(jobId), role: 'update' } : null
    }
    return null
  },
  start(context, match) {
    const data = match.event.data
    return {
      seq: match.event.seq, time: match.event.time, jobId: String(data.jobId),
      kind: data.kind, label: data.label, status: 'running',
      startedAt: data.startedAt, callId: data.toolCall?.callId,
    }
  },
  update(context, match) {
    const state = context.state ?? fallback(context)
    if (state === undefined) return undefined
    if (match.event.type !== 'job/settled') return state
    const data = match.event.data
    return {
      ...state, status: data.status ?? 'completed',
      finishedAt: data.finishedAt, cause: data.cause, detail: data.detail,
      time: match.event.time,
    }
  },
  buildViewNode(context) {
    const state = context.state ?? fallback(context)
    if (state === undefined) return null
    return {
      key: context.key, kind: context.kind, id: context.id, target: TARGET,
      data: {
        row: 'job', seq: state.seq, time: state.time,
        jobId: state.jobId, kind: state.kind, label: state.label,
        status: state.status, cause: state.cause, detail: state.detail,
        location: context.start?.location,
      },
    }
  },
}

/** Window-mid fallback: only `job/settled` seen → reconstruct a minimal row. */
function fallback(context) {
  const settled = context.matches.find(match => match.event.type === 'job/settled')
  if (settled === undefined) return undefined
  const data = settled.event.data
  return {
    seq: settled.event.seq, time: settled.event.time, jobId: String(data.jobId),
    kind: data.kind, label: data.label, status: data.status ?? 'completed',
    finishedAt: data.finishedAt, cause: data.cause, detail: data.detail,
  }
}
