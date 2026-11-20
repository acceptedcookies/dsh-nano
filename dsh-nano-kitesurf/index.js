/** Host half. Skills only: the engine lifecycle and the page routes live in dsh-nano-local-sandbox. */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { kitesurfSkill, nanoKiteSkill } from './lib/skill.js'

// The host schema for a directory resourceBase requires BOTH kind and path
// (oneOf: directory+path | url+url | opaque+description). Registering kind
// alone made the `skill` tool reject the whole entry — "must match exactly one
// oneOf branch" — so the agent never received the relay instructions.
const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = join(PACKAGE_ROOT, 'skills', 'kitesurf-cdp')

export const name = 'nano-kitesurf'
// Skills only — the pane consumes DNLS's host routes; this package never takes
// webServer/connection and never starts a container.
export const inject = ['skills']

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  const disposeSkill = ctx.skills.register({
    ...kitesurfSkill(),
    resourceBase: { kind: 'directory', path: SKILL_DIR },
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
