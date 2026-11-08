/** Host half entry: the plugin's exported name, inject list, Config, and apply. */

import { createRoutes, registerRoutes } from './routes.js'

export const name = 'nano-explorer-extra'

// `ctx.get` reads the registry without an inject requirement, but declaring a
// service here makes the plugin wait for it before `apply` runs — so every
// service this plugin reads is listed to keep activation ordering explicit and
// to fail the plugin (not a single request) when one is absent. (review-01 R5:
// `sessionPersistence` was read but undeclared, so cold sessions silently lost
// the persisted-header fallback.)
export const inject = ['fs', 'sessions', 'webServer', 'subprocess', 'sandbox', 'sandboxPolicy', 'connection', 'sessionPersistence']

export const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-nano-explorer-extra',
    validate(value) {
      const source = value && typeof value === 'object' ? value : {}
      const issues = []
      const number = (key, fallback, min, max) => {
        const candidate = source[key]
        if (candidate === undefined) return fallback
        if (typeof candidate !== 'number' || !Number.isInteger(candidate) || candidate < min || candidate > max) {
          issues.push({ message: `${key} must be an integer from ${min} to ${max}` })
          return fallback
        }
        return candidate
      }
      const flag = (key, fallback) => {
        const candidate = source[key]
        if (candidate === undefined) return fallback
        if (typeof candidate !== 'boolean') {
          issues.push({ message: `${key} must be a boolean` })
          return fallback
        }
        return candidate
      }
      const gitCommand = source.gitCommand ?? 'git'
      if (typeof gitCommand !== 'string' || gitCommand.trim() === '') {
        issues.push({ message: 'gitCommand must be a non-empty string' })
      }
      const fields = {
        gitTimeoutMs: number('gitTimeoutMs', 10000, 1000, 60000),
        maxGitOutputBytes: number('maxGitOutputBytes', 8 * 1024 * 1024, 64 * 1024, 64 * 1024 * 1024),
        statsMaxDepth: number('statsMaxDepth', 32, 1, 128),
        statsMaxEntries: number('statsMaxEntries', 50000, 1000, 1000000),
        statsDebounceMs: number('statsDebounceMs', 2000, 0, 30000),
        statsExcludeGit: flag('statsExcludeGit', true),
        symlinkMaxHops: number('symlinkMaxHops', 16, 1, 64),
        listingMaxEntries: number('listingMaxEntries', 2000, 50, 20000),
      }
      if (issues.length > 0) return { issues }
      return { value: { gitCommand, ...fields } }
    },
  },
}

/**
 * Register the routes for this plugin's lifetime.
 * @param ctx - host context.
 * @param raw - configuration as written in the patch, validated here.
 */
export function apply(ctx, raw) {
  const resolved = Config['~standard'].validate(raw ?? {})
  if (resolved.issues !== undefined) {
    // Cordis validates before apply; reaching here means an unvalidated call path, which must fail loud.
    throw new Error(`nano-explorer-extra: invalid configuration: ${resolved.issues.map(item => item.message).join('; ')}`)
  }
  const config = resolved.value
  const routes = createRoutes(ctx, config)
  ctx.effect(() => {
    const disposers = registerRoutes(ctx, routes)
    return () => { for (const dispose of disposers) dispose() }
  }, 'nano-explorer-extra: routes')
}
