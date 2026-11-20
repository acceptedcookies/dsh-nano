/**
 * Host plugin for the local sandbox. JS `name` is the plugin id.
 * Cordis `name` in cordis.patch.yml is the package name.
 * There is no second product UI in this package.
 */
import { registerRoutes } from './lib/route-guard.js'
import { BINDING_TABLE } from './lib/bindings.js'
import { ensurePerfReviewHost } from './lib/perf-review-host.js'
import { createAppleBackend } from './src/host/backend-apple.js'
import { openEnvironmentOwner } from './src/host/environment-owner.js'
import { createManagedRoutes } from './src/host/managed-routes.js'
import { makeAgentToolDefinitions } from './src/host/agent-tools.js'
import { stateRootFor } from './src/host/profile-drivers.js'
import { appendFileSync } from 'node:fs'
import { join } from 'node:path'

export const name = 'nano-local-sandbox'

/** Fixed order. Tests assert the set, not a private channel to a consumer. */
export const inject = ['webServer', 'connection', 'sandboxPolicy', 'sandbox', 'sessions', 'tools']

export function apply(ctx, deps = {}) {
  const connection = ctx.get('connection'), webServer = ctx.get('webServer')
  if (typeof connection?.admit !== 'function' || typeof webServer?.registerUpgrade !== 'function') throw new Error('managed sandbox requires host admission and upgrades')
  const backend = deps.backend ?? createAppleBackend({}, { confine(argv) {
    const policy = ctx.get('sandboxPolicy')?.resolve({})
    if (!policy || !['workspace-write', 'read-only'].includes(policy.mode)) throw new Error('enforceable host sandbox policy required')
    return ctx.get('sandbox').confine(argv, policy)
  } })
  const auditPath = join(stateRootFor(deps), 'control.audit.jsonl')
  const owner = openEnvironmentOwner({ ...deps, backend, webServer, connection,
    originFor: () => webServer.getOrigin().replace(/^http/, 'ws'),
    audit: deps.audit ?? (record => appendFileSync(auditPath, JSON.stringify(record) + '\n', { mode: 0o600 })) })
  return ctx.effect(function* () {
    yield ctx.effect(() => () => owner.close())
    const specs = createManagedRoutes({ table: BINDING_TABLE, connection, capabilities: owner.capabilities, execute: owner.execute })
    for (const dispose of registerRoutes(ctx, specs, {
      table: BINDING_TABLE, plugin: 'dsh-nano-local-sandbox', observe: event => ensurePerfReviewHost().observe(event),
    })) yield dispose
    // T-O-64: the session agent's managed entry — the same capability owner
    // and dispatcher as HTTP and /mcp, never a second executor. The peer
    // adapter (T-O-59) is explicit composition, not arg inference: this
    // host's own session agent maps to the local user's owner principal and
    // the call's live signal; a call with no session context is refused
    // before dispatch. The caller's signal is shared only as the principal's
    // liveness proof — never as a transport.
    const tools = ctx.get('tools')
    if (typeof tools?.register === 'function') {
      const peerFor = deps.toolPeer ?? (exec =>
        exec?.agent?.session != null
          ? { principal: { kind: 'owner' }, signal: exec.signal ?? new AbortController().signal }
          : null)
      for (const definition of makeAgentToolDefinitions({ owner, peerFor })) {
        yield tools.register(definition)
      }
    }
  })
}
