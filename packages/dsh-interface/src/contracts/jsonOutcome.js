/**
 * JsonOutcome — the single JSON outcome contract (CF1115 / P2-01 / T-O-14).
 *
 * Pure contract surface: no node:* / DOM / Cordis / store / IO. It freezes the
 * Q8 discrimination-matrix result shape — the five failure kinds and the data
 * they carry — and the value constructors every producer/consumer pair shares,
 * so a host encoder and a client decoder write and read ONE representation.
 *
 * Success: { ok:true, data }
 * Failure: { ok:false, error:{ kind, message, httpStatus?, domainCode?, domainData? } }
 *   kind ∈ transport | cancelled | http | protocol | domain
 *
 * Boundary: these constructors never fetch, never retry, and never invent a
 * status, code, or endpoint. `cancelled`/`protocol` paths must have already
 * decided not to issue the request before producing their outcome.
 */

/** The five failure kinds (Q8 discrimination matrix, truth:294-302). */
export const FAILURE_KIND = Object.freeze({
  /** signal aborted; issued-before cancellation makes no server-side claim. */
  CANCELLED: 'cancelled',
  /** Network/read-body failure; keep real httpStatus only when headers landed. */
  TRANSPORT: 'transport',
  /** Non-2xx that is not a recognized sanctioned business failure; keep status. */
  HTTP: 'http',
  /** Pre-request encode/binding failure OR illegal 2xx — never becomes ok:true. */
  PROTOCOL: 'protocol',
  /** Recognized sanctioned business failure (incl. legal 2xx business failures). */
  DOMAIN: 'domain',
})

export const FAILURE_KINDS = Object.freeze(Object.values(FAILURE_KIND))

export function isFailureKind(kind) {
  return FAILURE_KINDS.includes(kind)
}

/** A successful outcome. `data` is whatever the operation codec produced. */
export function ok(data) {
  return { ok: true, data }
}

/**
 * A failure outcome. Never fabricates fields: httpStatus/domainCode/domainData
 * appear only when supplied by a layer that actually observed them.
 * @param {string} kind - one of FAILURE_KIND.
 * @param {string} message - safe display message.
 * @param {object} [extra] - { httpStatus?, domainCode?, domainData? }.
 */
export function failure(kind, message, extra = {}) {
  if (!isFailureKind(kind)) {
    throw new TypeError(`jsonOutcome: unknown failure kind ${String(kind)}`)
  }
  const error = { kind, message: String(message ?? kind) }
  if (extra.httpStatus !== undefined) error.httpStatus = extra.httpStatus
  if (extra.domainCode !== undefined) error.domainCode = extra.domainCode
  if (extra.domainData !== undefined) error.domainData = extra.domainData
  return { ok: false, error }
}

/** True when `value` is a failure outcome (structural, never instanceof). */
export function isFailure(value) {
  return value != null
    && typeof value === 'object'
    && value.ok === false
    && value.error != null
    && typeof value.error === 'object'
    && isFailureKind(value.error.kind)
}

/** True when `value` is a success outcome carrying `data`. */
export function isOk(value) {
  return value != null && typeof value === 'object' && value.ok === true
}
