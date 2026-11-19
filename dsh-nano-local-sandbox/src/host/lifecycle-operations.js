/**
 * Managed lifecycle owner (P3-01/03): durable intent + one dispatch per
 * accepted operation, object authorization before any privileged action,
 * and no replay across host restart — an `accepted`/`running` op left by a
 * previous process is evidence, not a task.
 *
 * Wired as the `execute` callback of createManagedRoutes; it is the staged
 * owner, not a second server.
 *
 * `backend` is the recording fixture or the real adapter; `observe` is the
 * normalized trusted observation source `(locator) => {locator, generation,
 * stateVolume, state}` or `null` only on confirmed missing. `profileFor`
 * returns the trusted installed profile (`profileId`, `recipeRef`, optional
 * `inspectedRecipe`, optional `recreate` adapter). `schedule(task)` is an
 * injected barrier for tests; production passes setImmediate. `audit` is
 * the object-authz whitelist sink.
 */

import { createHash } from 'node:crypto'
import { authorize, auditRecord, resolveTrusted } from './object-authz.js'

const WRITE_ACTIONS = ['create', 'start', 'stop', 'restart', 'recreate', 'remove']
const PENDING_STATES = new Set(['accepted', 'running'])

const boundedText = (value, max = 256) => typeof value === 'string' && value.length > 0 && value.length <= max && !value.includes('\0')
const paramsError = (what) => Object.assign(new Error(`${what} is required`), { errorId: `sandbox.params.${what}` })
const refusal = (status, error) => ({ status, body: { ok: false, error } })
const project = (operation) => ({
  sandboxId: operation.sandboxId,
  operationId: operation.operationId,
  action: operation.action,
  state: operation.state,
  step: operation.step,
})

function fingerprintOf(action, sandboxId, params) {
  const canonical = {}
  for (const key of Object.keys(params).sort()) canonical[key] = params[key]
  return createHash('sha256').update(`${action}\n${sandboxId ?? ''}\n${JSON.stringify(canonical)}`).digest('hex').slice(0, 32)
}

/** Normalized, approved submit params — never persisted, only fingerprinted. */
function normalizeParams(action, args) {
  const allowed = { create: ['name', 'requestId'], recreate: ['requestId'] }
  const keys = new Set(allowed[action] ?? ['requestId'])
  const meta = new Set(['sandboxId', 'action', 'operationId']) // selectors, not params
  const params = {}
  for (const [key, value] of Object.entries(args ?? {})) {
    if (meta.has(key)) continue
    if (!keys.has(key)) throw paramsError(key)
    params[key] = value
  }
  if (!boundedText(params.requestId, 128)) throw paramsError('requestId')
  if (action === 'create' && !boundedText(params.name, 128)) throw paramsError('name')
  return params
}

/**
 * Production observation normalization: Apple `inspect` raw output →
 * `{locator, generation, stateVolume, state}`.
 *
 * `backend.inspect` returns `null` only for a documented not-found of the
 * requested container (CLI missing, daemon errors and ambiguous output
 * surface as throws → unknown, never "missing"). `configuration.id` in the
 * raw JSON is the container NAME — the locator — not an identity; the
 * generation is a stable hash of `locator + creationDate`, so a container
 * recreated under the same name gets a different generation. Anything
 * ambiguous (partial config, ≠1 entries, wrong id, missing/epoch
 * creationDate) is unknown → `null`.
 */
export function createObservationSource({ backend, profileFor }) {
  return async function observe(locator, row) {
    const result = await backend.inspect(locator)
    if (result === null) return { locator, generation: null, stateVolume: null, state: 'missing' }
    const text = typeof result === 'string' ? result : result?.raw
    if (typeof text !== 'string' || text.trim() === '') return null
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return null
    }
    if (!Array.isArray(parsed) || parsed.length !== 1) return null
    const configuration = parsed[0]?.configuration
    if (!configuration || typeof configuration !== 'object') return null
    if (configuration.id !== locator) return null
    const created = configuration.creationDate
    const seconds =
      typeof created === 'number' ? created
        : typeof created === 'string' ? Date.parse(created) / 1000
        : NaN
    if (!Number.isFinite(seconds) || seconds <= 0) return null // epoch/default sentinel is not an identity
    const live = parsed[0]?.status?.state
    const state = live === 'running' ? 'running' : live === 'stopped' || live === 'exited' ? 'stopped' : null
    if (state === null) return null
    const profile = await profileFor({ profileId: row?.profileId })
    const recipe = typeof profile?.inspectedRecipe === 'function' ? profile.inspectedRecipe(configuration) : null
    return {
      locator: configuration.id,
      generation: createHash('sha256').update(`${configuration.id}\n${seconds}`).digest('hex').slice(0, 32),
      stateVolume: boundedText(recipe?.stateSource) ? recipe.stateSource : null,
      state,
    }
  }
}

/**
 * Shared proof gate for privileged steps: a live observation of exactly
 * the bound object — same locator, a nonempty generation equal to the
 * bound one, and the verified stateVolume. `missing` is handled by the
 * caller; unknown or replaced evidence never passes.
 */
function verified(row, obs) {
  return !!obs &&
    (obs.state === 'running' || obs.state === 'stopped') &&
    obs.locator === row.binding?.locator &&
    boundedText(obs.generation) &&
    obs.generation === row.binding?.generation &&
    obs.stateVolume === row.stateVolume
}

export function createLifecycleOwner({ registry, envId, backend, profileFor, observe, resolvePrincipal, schedule, audit } = {}) {
  const tasks = new Set()
  const queued = new Set() // operationIds this process still holds in the barrier
  const failures = []
  const enqueue = schedule ?? ((task) => setImmediate(task))
  const observeOne = observe ?? createObservationSource({ backend, profileFor })
  const auditEvent = (event) => {
    if (typeof audit === 'function') audit(auditRecord(event))
    else auditRecord(event)
  }
  const auditSafe = (event) => {
    try {
      if (event && boundedText(event.principal)) auditEvent(event)
    } catch { /* audit is a sink, never the control path */ }
  }

  const capabilities = new Map([
    ['sandbox.lifecycle', {
      http: { path: '/nano-local-sandbox/lifecycle', methods: ['POST'] },
      target: (args) => (args?.action === 'create' ? 'none' : 'object'),
    }],
    ['sandbox.instance.create', {
      tool: {
        name: 'sandbox.instance.create',
        description: 'Create a managed sandbox; returns an accepted operation, never an address.',
        inputSchema: { type: 'object', properties: { name: { type: 'string' }, requestId: { type: 'string' } }, required: ['name', 'requestId'], additionalProperties: false },
      },
      target: 'none',
    }],
    ...WRITE_ACTIONS.filter((action) => action !== 'create').map((action) => [
      `sandbox.instance.${action}`,
      {
        tool: {
          name: `sandbox.instance.${action}`,
          description: `Managed ${action} on one explicit sandboxId.`,
          inputSchema: { type: 'object', properties: { sandboxId: { type: 'string' }, requestId: { type: 'string' } }, required: ['sandboxId', 'requestId'], additionalProperties: false },
        },
        target: 'object',
      },
    ]),
    ['sandbox.operations', {
      http: { path: '/nano-local-sandbox/operations', methods: ['GET', 'HEAD', 'POST'] },
      tool: {
        name: 'sandbox.operations',
        description: 'Read or cancel one operation document by sandboxId + operationId.',
        inputSchema: { type: 'object', properties: { sandboxId: { type: 'string' }, operationId: { type: 'string' }, action: { type: 'string' } }, required: ['sandboxId', 'operationId'], additionalProperties: false },
      },
      target: 'object',
    }],
  ])

  const authorized = (peer, action, sandboxId) => {
    const row = sandboxId ? registry.get(sandboxId) : null
    const outcome = authorize({ peer, envId, row, action, resolvePrincipal })
    return outcome.status ? { failure: refusal(outcome.status, outcome.error) } : { row, principal: outcome.principal }
  }

  /**
   * Object-op authorization where the row may be a tombstone: the row is
   * invisible, but the original submitter may still read or re-submit its
   * own operation by (principal, requestId). Anything else is 404.
   */
  const authorizedForOperation = (peer, action, sandboxId, requestId) => {
    const row = registry.get(sandboxId)
    if (row) {
      const outcome = authorize({ peer, envId, row, action, resolvePrincipal })
      return outcome.status ? { failure: refusal(outcome.status, outcome.error) } : { row, principal: outcome.principal }
    }
    const resolved = resolveTrusted({ peer, envId, resolvePrincipal })
    if (resolved.status) return { failure: refusal(resolved.status, resolved.error) }
    const prior = requestId ? registry.dedupe(resolved.principal.key, requestId) : null
    if (!prior || prior.sandboxId !== sandboxId) return { failure: refusal(404, 'not found') }
    return { row: null, principal: resolved.principal }
  }

  /** One intent → one persisted accept → at most one dispatch, across transports. */
  async function submit({ peer, action, sandboxId, args }) {
    const params = normalizeParams(action, args)
    const authz = action === 'create'
      ? authorized(peer, action, null)
      : authorizedForOperation(peer, action, sandboxId, params.requestId)
    if (authz.failure) {
      auditSafe({ principal: authz.principal?.key, sandboxId, action, result: 'denied' })
      return authz.failure
    }
    const { principal } = authz
    // Every lifecycle mutation is operator-only; usage grants are not enough.
    if (principal.operator !== true) {
      auditSafe({ principal: principal.key, sandboxId, action, result: 'denied' })
      return refusal(403, 'denied')
    }
    let createIntent
    if (action === 'create') {
      const profile = await profileFor({ envId })
      createIntent = { name: params.name, profileId: profile.profileId, principal: principal.key, recipeRef: profile.recipeRef }
      if (!boundedText(createIntent.recipeRef)) throw paramsError('recipeRef')
    }
    const fingerprint = fingerprintOf(action, sandboxId ?? null, params)
    const { operation, isNew } = registry.accept({
      principal: principal.key,
      requestId: params.requestId,
      action,
      sandboxId: sandboxId ?? null,
      createIntent: createIntent ?? null,
      fingerprint,
    })
    auditSafe({ principal: principal.key, sandboxId: operation.sandboxId, action, result: isNew ? 'accepted' : 'duplicate', operationId: operation.operationId })
    if (isNew) {
      queued.add(operation.operationId)
      const task = new Promise((resolve) => {
        enqueue(() => {
          queued.delete(operation.operationId)
          runOperation(operation.operationId, peer)
            .catch((error) => failures.push(error))
            .finally(resolve)
        })
      })
      tasks.add(task)
      task.finally(() => tasks.delete(task))
    }
    return { status: PENDING_STATES.has(operation.state) ? 202 : 200, body: project(operation) }
  }

  async function read({ peer, sandboxId, operationId }) {
    const operation = registry.operation(sandboxId, operationId)
    const authz = operation ? authorizedForOperation(peer, 'read', sandboxId, operation.requestId) : authorized(peer, 'read', sandboxId)
    if (authz.failure) {
      auditSafe({ principal: authz.principal?.key, sandboxId, action: 'read', result: 'denied' })
      return authz.failure
    }
    if (!operation) return refusal(404, 'not found')
    return { status: PENDING_STATES.has(operation.state) ? 202 : 200, body: project(operation) }
  }

  /** Cancellation wins only before dispatch; afterwards it reports state. */
  async function cancel({ peer, sandboxId, operationId }) {
    const operation = registry.operation(sandboxId, operationId)
    const authz = operation ? authorizedForOperation(peer, 'cancel', sandboxId, operation.requestId) : authorized(peer, 'cancel', sandboxId)
    if (authz.failure) {
      auditSafe({ principal: authz.principal?.key, sandboxId, action: 'cancel', result: 'denied' })
      return authz.failure
    }
    if (!operation) return refusal(404, 'not found')
    // Only an op this process still holds at the barrier can be claimed as
    // cancelled here — an `accepted` op left by a dead host is evidence,
    // not a locally queued task.
    if (operation.state === 'accepted' && queued.has(operationId)) {
      queued.delete(operationId)
      // A never-dispatched create tombstones its reservation to free the slot.
      const cancelled = registry.transition(operationId, 'accepted', {
        state: 'cancelled',
        step: 'cancelled',
        removed: operation.action === 'create' ? true : undefined,
      })
      auditSafe({ principal: authz.principal.key, sandboxId, action: operation.action, result: 'cancelled', operationId })
      return { status: 200, body: project(cancelled) }
    }
    return { status: PENDING_STATES.has(operation.state) ? 202 : 200, body: project(operation) }
  }

  const observed = async (locator, row) => {
    try {
      return await observeOne(locator, row)
    } catch {
      return null // unknown evidence: indeterminate, never "missing"
    }
  }

  /**
   * Durable end mark. A failed commit is never claimed as success: it is
   * audited `uncertain`, recorded as a task failure (so `drain` rejects)
   * and rethrown.
   */
  function finish(operationId, outcome) {
    try {
      return registry.transition(operationId, 'running', outcome)
    } catch (error) {
      throw Object.assign(new Error('durable commit failed'), { cause: error })
    }
  }

  async function runOperation(operationId, peer) {
    let operation
    try {
      operation = registry.transition(operationId, 'accepted', { state: 'running', step: 'dispatch' })
    } catch (claimError) {
      // A predispatch cancel is the only quiet claim loss — the ledger says
      // the op is now `cancelled`. Any other durable failure must surface
      // to drain() instead of being swallowed.
      if (claimError?.operationState === 'cancelled') return
      throw claimError
    }
    const sandboxId = operation.sandboxId
    const done = (result, patch, auditResult) => {
      let ended
      try {
        ended = finish(operationId, { state: result, step: patch?.step ?? result, binding: patch?.binding, removed: patch?.removed })
      } catch (error) {
        auditSafe({ principal: operation.principal, sandboxId, action: operation.action, result: 'uncertain', operationId })
        throw error
      }
      auditSafe({ principal: operation.principal, sandboxId, action: operation.action, result: auditResult ?? result, operationId })
      return ended
    }
    const row = registry.get(sandboxId)
    // Live authority is rechecked with the same original peer right before
    // every privileged dispatch, after each awaited observation.
    const stillAuthorized = async () => {
      const outcome = authorized(peer, operation.action, sandboxId)
      if (outcome.failure || outcome.principal?.operator !== true ||
          outcome.principal.key !== operation.principal) {
        done('failed', { step: 'authorize' }, 'denied')
        return false
      }
      return true
    }
    if (!row || !row.binding?.locator) {
      return done('failed', { step: 'authorize' }, 'denied')
    }
    if (!(await stillAuthorized())) return
    const locator = row.binding.locator
    try {
      if (operation.action === 'create') {
        const profile = await profileFor({ envId, profileId: row.profileId })
        const spec = typeof profile?.createSpec === 'function' ? profile.createSpec(row) : null
        const mounts = Array.isArray(spec?.mounts) ? spec.mounts : []
        if (spec?.containerName !== locator ||
            typeof spec.image !== 'string' || spec.image.length === 0 ||
            !mounts.some((mount) => mount?.source === row.stateVolume)) {
          return done('failed', { step: 'precheck' })
        }
        if (!(await stillAuthorized())) return
        await backend.create(spec)
        const obs = await observed(locator, row)
        // A fresh object proves itself: same locator+mount, running, with a
        // real generation to bind — never a trusted-by-name success.
        if (!obs || obs.state !== 'running' || obs.locator !== locator ||
            obs.stateVolume !== row.stateVolume || !boundedText(obs.generation)) {
          return done(obs ? 'failed' : 'indeterminate', { step: 'verify' })
        }
        return done('succeeded', { step: 'verify', binding: { locator, generation: obs.generation } })
      }

      if (operation.action === 'recreate') {
        // Strictly disabled until P6's real preflight+replace adapter —
        // never simulated by create-on-existing.
        return done('failed', { step: 'precheck' })
      }

      const pre = await observed(locator, row)
      if (!pre) return done('indeterminate', { step: 'pre-inspect' })
      if (pre.state === 'missing') return done('failed', { step: 'pre-missing' })
      if (!verified(row, pre)) return done('indeterminate', { step: 'pre-mismatch' })

      const verifyStep = async (want) => {
        const post = await observed(locator, row)
        if (!post || post.state === 'missing') return 'indeterminate'
        if (!verified(row, post)) return 'indeterminate' // replaced object — do not act
        return post.state === want ? 'succeeded' : 'failed'
      }

      if (operation.action === 'start') {
        if (pre.state === 'running') return done('succeeded', { step: 'already' })
        if (!(await stillAuthorized())) return
        await backend.start(locator)
        return done(await verifyStep('running'), { step: 'verify' })
      }
      if (operation.action === 'stop') {
        if (pre.state === 'stopped') return done('succeeded', { step: 'already' })
        if (!(await stillAuthorized())) return
        await backend.stop(locator)
        return done(await verifyStep('stopped'), { step: 'verify' })
      }
      if (operation.action === 'restart') {
        if (pre.state !== 'stopped') {
          if (!(await stillAuthorized())) return
          await backend.stop(locator)
          const mid = await observed(locator, row)
          if (!mid || mid.state === 'missing' || !verified(row, mid)) {
            return done('indeterminate', { step: 'stop-verify' })
          }
          if (mid.state !== 'stopped') return done('failed', { step: 'stop-verify' })
        }
        if (!(await stillAuthorized())) return
        await backend.start(locator)
        return done(await verifyStep('running'), { step: 'verify' })
      }
      if (operation.action === 'remove') {
        // remove only what was proven: exact locator+generation+mount, then
        // a confirmed absence of that locator. The volume is never deleted.
        if (!(await stillAuthorized())) return
        await backend.remove(locator)
        const post = await observed(locator, row)
        if (post && post.state === 'missing' && post.locator === locator) {
          return done('succeeded', { step: 'verify', removed: true })
        }
        if (post && verified(row, post)) return done('failed', { step: 'verify' })
        return done('indeterminate', { step: 'verify' }) // no tombstone on uncertain evidence
      }
      return done('failed', { step: 'dispatch' })
    } catch (error) {
      if (error?.cause) throw error // failed durable commit already surfaced
      // IO may already have left the process; evidence is unknown.
      return done('indeterminate', { step: 'dispatch' })
    }
  }

  const WRITE_CAP = /^sandbox\.instance\.(create|start|stop|restart|recreate|remove)$/

  async function execute({ capability, sandboxId, peer, req, args }) {
    if (capability === 'sandbox.lifecycle') {
      const action = args?.action
      if (typeof action !== 'string' || !WRITE_ACTIONS.includes(action)) throw paramsError('action')
      return submit({ peer, action, sandboxId, args })
    }
    const match = WRITE_CAP.exec(capability)
    if (match) return submit({ peer, action: match[1], sandboxId, args })
    if (capability === 'sandbox.operations') {
      const query = new URL(req?.url ?? '/nano-local-sandbox/operations', 'http://managed.local').searchParams
      const operationId = args?.operationId ?? query.get('operationId')
      if (!boundedText(operationId, 64)) throw paramsError('operationId')
      return args?.action === 'cancel' ? cancel({ peer, sandboxId, operationId }) : read({ peer, sandboxId, operationId })
    }
    throw paramsError('capability')
  }

  return {
    submit,
    read,
    cancel,
    drain: async () => {
      await Promise.allSettled([...tasks])
      if (failures.length) throw failures[0]
    },
    capabilities,
    execute,
  }
}
