import { registerRoutes } from './lib/route-guard.js'
import { ROUTE_TABLE } from './lib/route-table.js'
import { kitesurfSkill, nanoKiteSkill } from './lib/skill.js'

export const name = 'nano-kitesurf'
export const inject = ['webServer', 'connection', 'skills']

export function apply(ctx) {
  const disposeSkill = ctx.skills?.register?.({
    ...kitesurfSkill(),
    source: 'runtime',
    invocation: { modelInvocable: true, userInvocable: true },
    provider: 'nano-kitesurf',
  })
  const disposeKite = ctx.skills?.register?.({
    ...nanoKiteSkill(),
    source: 'runtime',
    invocation: { modelInvocable: true, userInvocable: true },
    provider: 'nano-kitesurf',
  })
  ctx.effect?.(() => () => {
    disposeSkill?.()
    disposeKite?.()
  }, 'nano-kitesurf: skill')
  return registerRoutes(ctx, [], { table: ROUTE_TABLE, plugin: 'dsh-nano-kitesurf' })
}
