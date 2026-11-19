const TODO_KEYS = new Set(['todos'])
const GOAL_PHASES = new Set(['active', 'paused', 'blocked', 'complete'])

/** Combine host-owned current state without exposing projection handles or tool payloads. */
export function summarizeProgress(ctx, handle, agent) {
  const session = agent.session
  const state = handle.stateOf(session)
  const todos = ctx.sessionProjections.snapshot(session, TODO_KEYS).values.todos
  const counts = { pending: 0, in_progress: 0, completed: 0 }
  for (const todo of todos ?? []) {
    if (Object.hasOwn(counts, todo.status)) counts[todo.status]++
  }
  const goal = ctx.get('goal')?.get(agent)
  let runningJobs = 0
  for (const job of ctx.get('jobs')?.list(session.id) ?? []) {
    if (job.owner === session.id && (job.status === 'running' || job.status === 'stopping')) runningJobs++
  }
  let runningSubagents = 0
  for (const child of ctx.agents.list()) {
    if (child.status === 'running' && child.session.header.origin === 'subagent'
      && child.session.header.parentSession === session.id) runningSubagents++
  }
  return {
    todos: counts,
    goal: GOAL_PHASES.has(goal?.phase)
      ? { phase: goal.phase, roundsStarted: goal.roundsStarted, maxGoalRounds: goal.maxGoalRounds }
      : null,
    paths: state.paths,
    unresolvedBash: state.failures.length,
    runningJobs,
    runningSubagents,
  }
}
