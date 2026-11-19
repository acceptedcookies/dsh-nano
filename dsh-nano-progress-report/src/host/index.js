import { formatProgress } from './context.js'
import { progressLedger } from './ledger.js'
import { progressProjection } from './projection.js'
import { summarizeProgress } from './summary.js'

export const name = 'nano-progress-report'
export const inject = ['sessionProjections', 'systemPrompt', 'agents']

export async function apply(ctx) {
  // Await readiness; Cordis owns both registrations through this plugin fiber.
  let disposed = false
  ctx.effect(() => () => { disposed = true })
  const handle = await ctx.sessionProjections.register(progressProjection)
  const ledger = await ctx.sessionProjections.register(progressLedger)
  if (disposed) return
  ctx.systemPrompt.context({
    name: 'nano-progress-report:progress',
    order: 180,
    required: false,
    interpolate: false,
    text: ({ agent }) => agent ? formatProgress(summarizeProgress(ctx, handle, agent)) : '',
  })
}
