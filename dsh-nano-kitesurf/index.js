/** Host half. The Kitesurf process stays outside this plugin; we only speak CDP. */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

import { engineTargets, KitesurfError, releaseEngine } from './lib/engine.js'
import { kitesurfSkill, nanoKiteSkill } from './lib/skill.js'
import { createNanoKite } from './lib/nano-kite.js'
import { hostSpan } from './lib/perf-host.js'

export const name = 'nano-kitesurf'
// Skills only — webServer/connection were declared but never touched; a
// narrower inject keeps the activation contract honest.
export const inject = ['skills']


const DEFAULT_ORIGIN = 'http://127.0.0.1:8787'

export const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-nano-kitesurf',
    validate(value) {
      const source = value && typeof value === 'object' ? value : {}
      const raw = source.httpBase ?? DEFAULT_ORIGIN
      let url
      try {
        url = new URL(raw)
      } catch {
        return { issues: [{ message: 'httpBase must be an http(s) URL' }] }
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { issues: [{ message: 'httpBase must be http or https' }] }
      }
      if (url.username || url.password) {
        return { issues: [{ message: 'httpBase must not carry credentials' }] }
      }
      const host = url.hostname
      const loopback = host === 'localhost' || host === '127.0.0.1' || host === '::1'
      const allowRemote = source.allowRemote === true
      if (!loopback && !allowRemote) {
        return { issues: [{ message: 'httpBase must be loopback unless allowRemote is true' }] }
      }
      const checkout = typeof source.checkout === 'string' && source.checkout ? source.checkout : undefined
      let mcpPort
      if (source.mcpPort != null) {
        const port = Number(source.mcpPort)
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          return { issues: [{ message: 'mcpPort must be an integer between 1 and 65535' }] }
        }
        mcpPort = port
      }
      return { value: { httpBase: url.origin, allowRemote, checkout, mcpPort } }
    },
  },
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx, config) {
  const httpBase = config?.httpBase ?? DEFAULT_ORIGIN
  const kite = createNanoKite({
    httpBase,
    mcpPort: config?.mcpPort ?? 8799,
    allowRemote: config?.allowRemote === true,
    lockPath: path.join(process.env.DSH_HOME || homedir(), 'nano-kitesurf.lock.json'),
    fs: { readFile, writeFile, mkdir },
    onStart: () => bringUp('kitesurf.kite.start'),
    onSuspend: () => sleepEngine(),
    onResume: () => bringUp('kitesurf.kite.resume'),
  })
  async function bringUp(id) {
    await hostSpan('kite-warmup', async () => {
      // Engine liveness is the devtools HTTP face at the configured origin
      // (GET /json/list answers) — the CDP socket itself is owned by DNLS.
      try {
        await engineTargets(kite.snapshot().httpBase)
      } catch {
        throw new KitesurfError(id, '引擎没有应答。容器的启动不在这个包里。')
      }
      return { live: true }
    })
  }
  async function sleepEngine() {
    // releaseEngine is a retired CDP export — it throws kitesurf.engine.connect
    // by contract; suspend must still complete.
    try { releaseEngine() } catch { /* no socket to release */ }
  }
  // P3-04: `config.checkout` still parses for back-compat but has no consumer
  // inside the package — this package does not create containers.
  void config?.checkout

  // The skill body no longer bakes the origin: it teaches the agent to read
  // kite.cdp from /status so it always follows the live configure() value.
  const skill = kitesurfSkill()
  const disposeSkill = ctx.skills.register({
    ...skill,
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

  // This package registers skills only. Page routes live in dsh-nano-local-sandbox.
}
