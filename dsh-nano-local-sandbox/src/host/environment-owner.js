import { createBridgePublisher } from './bridge-projection.js'
import { openControlRegistry } from './control-registry.js'
import { createFleetProjection } from './fleet-projection.js'
import { createIdlePolicy } from './idle-policy.js'
import { createUseBindings } from './instance-registry.js'
import { createLifecycleOwner, createObservationSource } from './lifecycle-operations.js'
import { createManagedProfileSource, serviceMappings } from './managed-profile.js'
import { authorize, resolveOwnerPrincipal, resolveTrusted } from './object-authz.js'
import { createObjectPages } from './object-pages.js'
import { envTag, profilesRootFor, stateRootFor } from './profile-drivers.js'
import { listProfiles } from './profile-registry.js'
import { createTerminalOwner } from './term-bridge.js'
import { createTerminalStream } from './term-ws.js'
import { openUsageMinutes } from './usage-minutes.js'

const schema = (properties, required) => ({ type: 'object', properties, required, additionalProperties: false })
const id = { type: 'string' }
const objectTool = (name, description, properties = {}, required = []) => [name, {
  target: 'object', tool: { name, description, inputSchema: schema({ sandboxId: id, ...properties }, ['sandboxId', ...required]) },
}]

/** Own all durable writers and guest-facing control transports for one host installation. */
export function openEnvironmentOwner(deps) {
  const root = stateRootFor(deps), envId = envTag(deps.env)
  const { backend, connection, webServer, originFor } = deps
  const resolvePrincipal = deps.resolvePrincipal ?? resolveOwnerPrincipal
  const registry = openControlRegistry({ root, envId })
  let usage, stream
  try {
    const profileFor = createManagedProfileSource(deps)
    const source = createObservationSource({ backend, profileFor })
    const observe = row => source(row.binding.locator, row)
    usage = openUsageMinutes({ root, envId, registry, observe, backend, clock: deps.clock, onError: deps.onError })
    const common = { envId, registry, resolvePrincipal, backend, profileFor }
    const lifecycle = createLifecycleOwner({ ...common, observe: source, audit: deps.audit })
    const pages = createObjectPages({ ...common, deps, lifecycle, connection })
    const uses = createUseBindings(registry, sandboxId => idle.touch(sandboxId))
    const idle = createIdlePolicy({ ...common, observe, uses, stop: lifecycle.stopIfIdle })
    // Host-owned bridge health publication (dnls.control/1) — only over the
    // guest exec channel when the backend carries it; the published HTTP
    // port is never a writer.
    const publisher = typeof backend.publishHealth === 'function'
      ? createBridgePublisher({ envId, registry, observe, onError: deps.onError, publish: (locator, doc) => backend.publishHealth(locator, doc) })
      : null
    const terminalRpc = (locator, verb, request) => backend.terminalRpc(locator, verb, request)
    stream = createTerminalStream({ ...common, connection, webServer, originFor, observe, terminalRpc })
    const terminal = createTerminalOwner({ ...common, observe, terminalRpc, issueLocator: stream.issueLocator,
      resolveCwd: async (row, args) => (await profileFor({ envId, profileId: row.profileId })).resolveCwd(args) })
    // Read-only fleet projection over explicitly provided env sources; the
    // default is this installation's own env, visible to its owner (or any
    // scoped principal the host declares). External sources are host-supplied
    // only — this file never discovers or opens another env's registry.
    const fleet = createFleetProjection({
      envId,
      resolvePrincipal,
      sources: deps.sources ?? [{
        envId,
        visibleTo: deps.visibleTo ?? (p => p.operator && p.key === 'owner'),
        registry,
        observe,
        profileFor,
        usage,
        backend,
      }],
    })
    const capabilities = new Map([...lifecycle.capabilities, ...terminal.capabilities, ...fleet.capabilities, ...pages.capabilities,
      ['sandbox.profile.list', { target: 'none', tool: { name: 'sandbox.profile.list', description: 'List available local sandbox profiles.', inputSchema: schema({}, []) } }],
      ['sandbox.profile.describe', { target: 'none', tool: { name: 'sandbox.profile.describe', description: 'Describe one local profile by its advertised id.', inputSchema: schema({ id }, ['id']) } }],
      objectTool('sandbox.services', 'List declared services and their observed loopback publications.'),
      objectTool('sandbox.idle.configure', 'Set the idle timeout without stopping the sandbox. Zero disables automatic stop.', { idleTimeoutMs: { type: 'integer', minimum: 0 } }, ['idleTimeoutMs']),
      objectTool('sandbox.revision.save', 'Save resource overrides without applying them.', {
        expectedRevision: { type: 'integer', minimum: 0 },
        overrides: schema({ cpus: { type: 'integer', minimum: 1 }, memoryBytes: { type: 'integer', minimum: 1 } }, []),
      }, ['expectedRevision', 'overrides']),
      objectTool('sandbox.usage', 'Read completed UTC minute statistics and coverage.', { window: { enum: ['24h', '7d', '30d'] } }, ['window']),
    ])
    let closing = null
    const inflight = new Set()
    async function dispatch(call) {
      if (call.capability === 'sandbox.profile.list' || call.capability === 'sandbox.profile.describe') {
        const caller = resolveTrusted({ peer: call.peer, envId, resolvePrincipal })
        if (!caller.principal?.operator || (deps.visibleTo && deps.visibleTo(caller.principal) !== true)) {
          throw Object.assign(new Error('denied'), { status: caller.status || 403 })
        }
        const profiles = listProfiles(profilesRootFor(deps)).map(p => ({
          id: p.id, version: p.manifest?.version, ready: p.ready, digest: p.digest,
        }))
        if (call.capability === 'sandbox.profile.list') return { profiles }
        const profile = profiles.find(p => p.id === call.args.id)
        if (!profile) throw Object.assign(new Error('unknown profile'), { errorId: 'sandbox.profile.unknown' })
        return profile
      }
      if (terminal.capabilities.has(call.capability)) return terminal.execute(call)
      if (pages.capabilities.has(call.capability)) return pages.execute(call)
      if (lifecycle.capabilities.has(call.capability)) return lifecycle.execute(call)
      if (fleet.capabilities.has(call.capability)) return fleet.execute(call)
      const row = registry.get(call.sandboxId)
      const check = () => {
        const verdict = authorize({ peer: call.peer, envId, row: registry.get(call.sandboxId), action: call.capability, resolvePrincipal })
        if (verdict.status) throw Object.assign(new Error(verdict.error), { status: verdict.status })
        return verdict.principal
      }
      const principal = check()
      if (call.capability === 'sandbox.idle.configure') {
        if (!principal.operator) throw Object.assign(new Error('denied'), { status: 403 })
        const policy = registry.setIdlePolicy(row.sandboxId, call.args.idleTimeoutMs)
        idle.touch(row.sandboxId)
        return policy
      }
      if (call.capability === 'sandbox.usage') {
        // A current use grant alone is not permission to disclose historical usage.
        if (!principal.operator || principal.key !== row.principal) throw Object.assign(new Error('denied'), { status: 403 })
        if (!['24h', '7d', '30d'].includes(call.args.window)) throw Object.assign(new Error('invalid window'), { errorId: 'sandbox.params.window' })
        return usage.summary(row, call.args.window)
      }
      const profile = await profileFor({ envId, profileId: row.profileId })
      if (call.capability === 'sandbox.services') {
        const obs = await observe(row)
        if (check().key !== principal.key) throw Object.assign(new Error('denied'), { status: 403 })
        return { services: serviceMappings(registry.get(call.sandboxId), obs, profile.services) }
      }
      if (call.capability === 'sandbox.revision.save') {
        const again = check()
        if (!again.operator || again.key !== principal.key) throw Object.assign(new Error('denied'), { status: 403 })
        const { expectedRevision, overrides } = call.args
        if (!overrides || typeof overrides !== 'object') throw Object.assign(new Error('missing overrides'), { errorId: 'sandbox.params.overrides' })
        const desiredRevision = registry.saveRevision(row.sandboxId, { expectedRevision, overrides: profile.validateOverrides(overrides) })
        return { desiredRevision, requiresRecreate: true }
      }
      throw Object.assign(new Error('unknown capability'), { errorId: 'sandbox.tool.unknown' })
    }
    function execute(call) {
      if (closing) throw Object.assign(new Error('unavailable'), { status: 503 })
      const task = dispatch(call).finally(() => inflight.delete(task))
      inflight.add(task)
      return task
    }
    function close() {
      if (!closing) closing = Promise.resolve().then(async () => {
        try {
          // One rejecting background task must not strand the others —
          // settle every close before the drain, then surface the failure.
          const results = await Promise.allSettled([stream.dispose(), idle.close(), publisher?.close(), ...inflight])
          await lifecycle.drain()
          const failed = results.find((r) => r.status === 'rejected')
          if (failed) throw failed.reason
        } finally {
          try { pages.close() } finally {
            try { await usage.close() } finally { registry.close() }
          }
        }
      })
      return closing
    }
    usage.start()
    idle.start()
    publisher?.start()
    return { capabilities, execute, close, drain: lifecycle.drain, registry, observe, usage, uses, publisher }
  } catch (error) {
    // These resources have no work in flight before start().
    void stream?.dispose()
    void usage?.close()
    registry.close()
    throw error
  }
}
