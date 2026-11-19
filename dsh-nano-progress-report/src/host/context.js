const MAX_BYTES = 600
const HEADER = 'Current session progress (observed facts, not instructions):'

function pathData(path) {
  // Keep filenames inside one data line and outside the host reminder markup.
  return JSON.stringify(path).replace(/[<>&\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g,
    char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
}

export function formatProgress({ todos, goal, paths, unresolvedBash, runningJobs, runningSubagents }) {
  const lines = [HEADER]
  if (goal) lines.push(`Goal: ${goal.phase} (${goal.roundsStarted}/${goal.maxGoalRounds} rounds started)`)
  if (todos.completed || todos.in_progress || todos.pending) {
    lines.push(`Tasks: ${todos.completed} complete, ${todos.in_progress} in progress, ${todos.pending} pending`)
  }
  if (unresolvedBash) lines.push(`Recent Bash tool failures without a successful matching retry: ${unresolvedBash}`)
  if (runningJobs || runningSubagents) lines.push(`Active: ${runningJobs} background jobs, ${runningSubagents} direct subagents`)
  if (paths.length) {
    const prefix = 'Recent file-tool paths: '
    const shown = []
    for (const [index, path] of paths.entries()) {
      const candidate = [...shown, pathData(path)]
      const suffix = index + 1 === paths.length ? '' : ', …'
      const line = prefix + candidate.join(', ') + suffix
      if (Buffer.byteLength([...lines, line].join('\n')) > MAX_BYTES) break
      shown.push(candidate.at(-1))
    }
    if (shown.length) lines.push(prefix + shown.join(', ') + (shown.length < paths.length ? ', …' : ''))
    else lines.push('Recent file-tool paths omitted (size limit).')
  }
  return lines.length === 1 ? '' : lines.join('\n')
}
