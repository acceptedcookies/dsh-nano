import { openControlRegistry } from './control-registry.js'
import { createLifecycleOwner, createObservationSource } from './lifecycle-operations.js'
import { createManagedProfileSource, serviceMappings } from './managed-profile.js'
import { authorize, resolveOwnerPrincipal } from './object-authz.js'
import { envTag, stateRootFor } from './profile-drivers.js'
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
    const terminalRpc = (locator, verb, request) => backend.terminalRpc(locator, verb, request)
    stream = createTerminalStream({ ...common, connection, webServer, originFor, observe, terminalRpc })
    const terminal = createTerminalOwner({ ...common, observe, terminalRpc, issueLocator: stream.issueLocator,
      resolveCwd: async (row, args) => (await profileFor({ envId, profileId: row.profileId })).resolveCwd(args) })
    const capabilities = new Map([...lifecycle.capabilities, ...terminal.capabilities,
      objectTool('sandbox.services', 'List declared services and their observed loopback publications.'),
      objectTool('sandbox.revision.save', 'Save resource overrides without applying them.', {
        expectedRevision: { type: 'integer', minimum: 0 },
        overrides: schema({ cpus: { type: 'integer', minimum: 1 }, memoryBytes: { type: 'integer', minimum: 1 } }, []),
      }, ['expectedRevision', 'overrides']),
      objectTool('sandbox.usage', 'Read completed UTC minute statistics and coverage.', { window: { enum: ['24h', '7d', '30d'] } }, ['window']),
    ])
    let closing = null
    const inflight = new Set()
    async function dispatch(call) {
      if (terminal.capabilities.has(call.capability)) return terminal.execute(call)
      if (lifecycle.capabilities.has(call.capability)) return lifecycle.execute(call)
      const row = registry.get(call.sandboxId)
      const check = () => {
        const verdict = authorize({ peer: call.peer, envId, row, action: call.capability, resolvePrincipal })
        if (verdict.status) throw Object.assign(new Error(verdict.error), { status: verdict.status })
        return verdict.principal
      }
      const principal = check()
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
          await Promise.allSettled([...inflight])
          await lifecycle.drain()
        } finally {
          try { await stream.dispose() } finally {
            try { await usage.close() } finally { registry.close() }
          }
        }
      })
      return closing
    }
    usage.start()
    return { capabilities, execute, close, drain: lifecycle.drain, registry, observe, usage }
  } catch (error) {
    // These resources have no work in flight before start().
    void stream?.dispose()
    void usage?.close()
    registry.close()
    throw error
  }
}
