/**
 * Host plugin for the local sandbox. JS `name` is the plugin id.
 * Cordis `name` in cordis.patch.yml is the package name.
 * There is no second product UI in this package.
 */
import { registerRoutes } from './lib/route-guard.js'
import { BINDING_TABLE } from './lib/bindings.js'
import { ensurePerfReviewHost } from './lib/perf-review-host.js'
import { createAppleBackend } from './src/host/backend-apple.js'
import { routeSpecs, startDiagnosticsPush } from './src/host/routes.js'

export const name = 'nano-local-sandbox'

/** Fixed order. Tests assert the set, not a private channel to a consumer. */
export const inject = ['webServer', 'connection', 'sandboxPolicy', 'sandbox', 'sessions']

export function apply(ctx, deps = {}) {
  if (!deps.session) deps.session = { phase: 'idle', history: [], containerName: '' } // '' → containerNameFor() derives per-env
  if (!deps.backend) deps.backend = createAppleBackend()
  // deps.ctx is the live host context: routes resolve sandboxPolicy from it so
  // a terminal cannot attach across a policy remount.
  const finalDeps = { ...deps, ctx }
  // The bridge's sandbox.* tools read this pushed document; without the loop
  // every one of them reports kitesurf.diag.stale.
  startDiagnosticsPush(deps.session, finalDeps)
  return registerRoutes(ctx, routeSpecs(finalDeps), {
    table: BINDING_TABLE,
    plugin: 'dsh-nano-local-sandbox',
    observe: event => ensurePerfReviewHost().observe(event),
  })
}
