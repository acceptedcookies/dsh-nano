import { formatProgress } from './context.js'
import { progressLedger } from './ledger.js'
import { makeReadProgressDefinition } from './read-progress.js'

export const name = 'nano-progress-report'
export const inject = ['sessionProjections', 'systemPrompt', 'agents', 'tools']

export async function apply(ctx) {
  // Await readiness; Cordis owns both registrations through this plugin fiber.
  let disposed = false
  ctx.effect(() => () => { disposed = true })
  const ledger = await ctx.sessionProjections.register(progressLedger)
  if (disposed) return
  // read_progress is the model's only read path; the four-line anchor pushes
  // the same ledger's current-item facts. Both stay silent for peer sessions.
  const definition = makeReadProgressDefinition(ledger)
  ctx.tools.register(definition)
  ctx.systemPrompt.context({
    name: 'nano-progress-report:progress',
    order: 180,
    required: false,
    interpolate: false,
    text: ({ agent }) => {
      if (agent === undefined || agent === null) return ''
      const session = agent.session
      const state = ledger.stateOf(session)
      if (state === undefined) return ''
      const view = ledger.wire.view(state)
      const todos = ctx.sessionProjections.snapshot(session, ['todos']).values.todos ?? []
      let runningJobs = 0
      for (const job of ctx.get('jobs')?.list(session.id) ?? []) {
        if (job.owner === session.id && (job.status === 'running' || job.status === 'stopping')) runningJobs += 1
      }
      let runningSubagents = 0
      for (const child of ctx.agents.list()) {
        if (child.status === 'running' && child.session.header.origin === 'subagent'
          && child.session.header.parentSession === session.id) runningSubagents += 1
      }
      return formatProgress({ view, todos, runningJobs, runningSubagents })
    },
  })
}
