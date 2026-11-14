/**
 * Host plugin for the local sandbox. JS `name` is the plugin id.
 * Cordis `name` in cordis.patch.yml is the package name.
 * There is no second product UI in this package.
 */
import { registerRoutes } from './lib/route-guard.js'
import { ROUTE_TABLE } from './lib/route-table.js'
import { routeSpecs } from './src/host/routes.js'

export const name = 'nano-local-sandbox'

/** Fixed order. Tests assert the set, not a private channel to a consumer. */
export const inject = ['webServer', 'connection', 'sandboxPolicy', 'sandbox', 'sessions']

export function apply(ctx, deps = {}) {
  if (!deps.session) deps.session = { phase: 'idle', history: [] }
  return registerRoutes(ctx, routeSpecs(deps), { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' })
}
