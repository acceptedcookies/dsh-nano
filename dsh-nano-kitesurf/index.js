/** Host half. Skills only: the engine lifecycle and the page routes live in dsh-nano-local-sandbox. */

import { kitesurfSkill, nanoKiteSkill } from './lib/skill.js'

export const name = 'nano-kitesurf'
// Skills only — the pane consumes DNLS's host routes; this package never takes
// webServer/connection and never starts a container.
export const inject = ['skills']

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  const disposeSkill = ctx.skills.register({
    ...kitesurfSkill(),
    source: 'runtime',
    invocation: { modelInvocable: true, userInvocable: true },
    provider: 'nano-kitesurf',
  })
  const disposeKite = ctx.skills.register({
    ...nanoKiteSkill(),
    source: 'runtime',
    invocation: { modelInvocable: true, userInvocable: true },
    provider: 'nano-kitesurf',
  })
  ctx.effect(() => () => {
    disposeSkill?.()
    disposeKite?.()
  }, 'nano-kitesurf: skill')
}
