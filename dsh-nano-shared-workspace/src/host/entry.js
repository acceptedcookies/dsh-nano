/** Host half entry: the plugin's exported name, inject list, Config, and apply. */

import { createRoutes, registerRoutes, startBackgroundSync } from './routes.js'

export const name = 'nano-shared-workspace'

// `ctx.get` reads the registry without an inject requirement, but declaring a
// service here makes the plugin wait for it before `apply` runs — so every
// service this plugin reads is listed to keep activation ordering explicit and
// to fail the plugin (not a single request) when one is absent.
export const inject = ['webServer', 'connection', 'credentials', 'workspaceRegistry']

export const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-nano-shared-workspace',
    validate(value) {
      const source = value && typeof value === 'object' ? value : {}
      const issues = []
      // Deployment values have no defaults. A missing one is a configuration
      // error: a fallback baked into the build would silently point an instance
      // at another environment's bucket.
      const required = key => {
        const candidate = source[key]
        if (typeof candidate !== 'string' || candidate.trim() === '') {
          issues.push({ message: `${key} is required` })
          return ''
        }
        return candidate.trim()
      }
      const endpoint = required('endpoint')
      const bucket = required('bucket')
      const region = required('region')
      const prefix = source.prefix === undefined ? '' : source.prefix
      if (typeof prefix !== 'string' || !/^[A-Za-z0-9\-_/]*$/.test(prefix)) {
        issues.push({ message: 'prefix must be a simple S3 key prefix' })
      }
      // Deployment-varying tunable: 0 disables the timer (deterministic test
      // nodes); the default keeps shipped behaviour. No per-instance const.
      const rawInterval = source.backgroundSyncMs === undefined ? 30_000 : source.backgroundSyncMs
      if (!Number.isInteger(rawInterval) || rawInterval < 0 || rawInterval > 86_400_000) {
        issues.push({ message: 'backgroundSyncMs must be an integer between 0 and 86400000' })
      }
      if (issues.length > 0) return { issues }
      return { value: { endpoint, bucket, region, prefix: prefix ?? '', backgroundSyncMs: rawInterval } }
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
    const stopSync = startBackgroundSync(ctx, config)
    return () => { stopSync(); for (const dispose of disposers) dispose() }
  }, 'nano-shared-workspace: routes')
}
