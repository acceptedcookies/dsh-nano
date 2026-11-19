/**
 * Object authorization for the managed surface (T-O-44, P3-03).
 *
 * `connection.admit` proves a caller reached the host; it never proves
 * authority over a managed object. `authorize` resolves the admission peer
 * through the host-supplied `resolvePrincipal` adapter into a normalized
 * `{key, operator, canSee, canUse}` principal — fixtures hand normalized
 * shapes, production gets only the owner shape below — then answers
 * invisibility (404) separately from inability (403). Nothing is read from
 * request params, tags or `peer.id`.
 *
 * `audit(event)` builds the whitelist record `{principal, sandboxId, action,
 * result, operationId?, at}` — never a raw request, URL or input fragment.
 */

const MAX_TEXT = 256
const AUDIT_KEYS = ['principal', 'sandboxId', 'action', 'result', 'operationId', 'at']
const boundedText = (value, max = MAX_TEXT) => typeof value === 'string' && value.length > 0 && value.length <= max && !value.includes('\0')

const refusal = (status, error) => ({ status, error })

/** canSee/canUse may be a function, an iterable of sandboxIds, or a boolean. */
function predicateOf(value) {
  if (typeof value === 'function') return value
  if (value === true) return () => true
  if (value === false || value === undefined || value === null) return () => false
  if (value instanceof Set) return (row) => value.has(row?.sandboxId)
  if (Array.isArray(value)) return (row) => value.includes(row?.sandboxId)
  return () => false
}

function normalizePrincipal(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null
  if (!boundedText(candidate.key)) return null
  return {
    key: candidate.key,
    operator: candidate.operator === true,
    canSee: predicateOf(candidate.canSee),
    canUse: predicateOf(candidate.canUse),
  }
}

/**
 * The only production principal shape: the pinned host's owner kind with a
 * live signal, keyed `'owner'` for the env. Any other claimed shape is
 * untrusted by default — a scoped adapter is supplied by composition, not
 * derived from caller input.
 */
export function resolveOwnerPrincipal({ peer } = {}) {
  const signal = peer?.signal
  // A real live AbortSignal: anything merely shaped like one is untrusted.
  const live = signal !== null && typeof signal === 'object' &&
    typeof signal.aborted === 'boolean' && signal.aborted === false &&
    typeof signal.addEventListener === 'function'
  if (peer?.principal?.kind === 'owner' && live) {
    return { key: 'owner', operator: true, canSee: true, canUse: true }
  }
  return null
}

/**
 * Resolves the admission peer into a trusted principal without touching
 * row visibility — used when the row itself is the question (tombstone
 * dedupe reads). `authorize` below composes this with object checks.
 */
export function resolveTrusted({ peer, envId, resolvePrincipal } = {}) {
  if (!boundedText(envId)) return refusal(503, 'host env unavailable')
  if (typeof resolvePrincipal !== 'function') return refusal(503, 'principal resolution unavailable')
  if (!peer || peer.signal?.aborted === true) return refusal(401, 'unauthenticated')
  let candidate
  try {
    candidate = resolvePrincipal({ peer, envId })
  } catch {
    return refusal(503, 'principal resolution unavailable')
  }
  const principal = normalizePrincipal(candidate)
  if (!principal) return refusal(403, 'no trusted principal for this env')
  return { principal }
}

/**
 * `row` must be a verified trusted ledger row (or null); `terminal` a
 * verified independently-owned terminal record, never a wildcard.
 * Terminal actions additionally require the terminal to name this object,
 * this principal and the row's current generation — operator alone is not
 * a terminal read.
 */
export function authorize({ peer, envId, row, action, terminal, resolvePrincipal } = {}) {
  const resolved = resolveTrusted({ peer, envId, resolvePrincipal })
  if (resolved.status) return resolved
  const principal = resolved.principal
  if (!row) {
    // Targetless create has no object to see; only an operator may mint one.
    if (action === 'create') return principal.operator ? { principal } : refusal(403, 'denied')
    return refusal(404, 'not found')
  }
  let visible
  let usable
  try {
    // Predicates are host-supplied policy; a throwing predicate fails closed.
    visible = principal.canSee(row) === true
    usable = principal.canUse(row, action) === true
  } catch {
    return refusal(503, 'principal resolution unavailable')
  }
  if (!visible) return refusal(404, 'not found')
  if (!usable) return refusal(403, 'denied')
  // terminal.create/terminal.list are object-level capabilities; every
  // other terminal.* action additionally requires an owned terminal.
  if (typeof action === 'string' && action.startsWith('terminal.') && action !== 'terminal.create' && action !== 'terminal.list') {
    const owned =
      terminal &&
      terminal.sandboxId === row.sandboxId &&
      terminal.principalKey === principal.key &&
      boundedText(row.binding?.generation) &&
      terminal.generation === row.binding.generation
    if (!owned) return refusal(403, 'terminal not owned by this principal and generation')
  }
  return { principal }
}

/** Whitelist audit record: rejects extra fields and overlong strings. */
export function auditRecord(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('audit event must be an object')
  for (const key of Object.keys(event)) {
    if (!AUDIT_KEYS.includes(key)) throw new Error(`audit field is not in the whitelist: ${key}`)
  }
  for (const key of ['principal', 'sandboxId', 'action', 'result']) {
    if (!boundedText(event[key])) throw new Error(`audit ${key} is required`)
  }
  for (const key of ['operationId', 'at']) {
    if (event[key] !== undefined && !boundedText(event[key])) throw new Error(`audit ${key} out of bounds`)
  }
  return {
    principal: event.principal,
    sandboxId: event.sandboxId,
    action: event.action,
    result: event.result,
    ...(event.operationId !== undefined ? { operationId: event.operationId } : {}),
    at: event.at ?? new Date().toISOString(),
  }
}

/**
 * `append(record)` is the host-private sink (e.g. appendFileSync line).
 * An audit entry is only the whitelist above — attach URLs and request
 * input never reach it.
 */
export function createAudit(append) {
  return (event) => {
    const record = auditRecord(event)
    if (typeof append === 'function') append(record)
    return record
  }
}
