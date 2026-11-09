/** Host half entry: the plugin's exported name, inject list, Config, and apply. */

import { createRoutes, registerRoutes } from './routes.js'

export const name = 'nano-shared-workspace'

// `ctx.get` reads the registry without an inject requirement, but declaring a
// service here makes the plugin wait for it before `apply` runs — so every
// service this plugin reads is listed to keep activation ordering explicit and
// to fail the plugin (not a single request) when one is absent.
export const inject = ['webServer', 'connection', 'credentials']

export const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-nano-shared-workspace',
    validate(value) {
      const source = value && typeof value === 'object' ? value : {}
      const issues = []
      const text = (key, fallback) => {
        const candidate = source[key]
        if (candidate === undefined) return fallback
        if (typeof candidate !== 'string' || candidate.trim() === '') {
          issues.push({ message: `${key} must be a non-empty string` })
          return fallback
        }
        return candidate.trim()
      }
      const endpoint = text('endpoint', 'https://nano-shared-workspace.saobao.com')
      const bucket = text('bucket', 'dsh-shared-workspace')
      const region = text('region', 'us-east-1')
      const prefix = source.prefix === undefined ? '' : source.prefix
      if (typeof prefix !== 'string' || !/^[A-Za-z0-9\-_/]*$/.test(prefix)) {
        issues.push({ message: 'prefix must be a simple S3 key prefix' })
      }
      if (issues.length > 0) return { issues }
      return { value: { endpoint, bucket, region, prefix: prefix ?? '' } }
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
    throw new Error(`nano-shared-workspace: invalid configuration: ${resolved.issues.map(item => item.message).join('; ')}`)
  }
  const config = resolved.value
  const routes = createRoutes(ctx, config)
  ctx.effect(() => {
    const disposers = registerRoutes(ctx, routes)
    return () => { for (const dispose of disposers) dispose() }
  }, 'nano-shared-workspace: routes')
}
