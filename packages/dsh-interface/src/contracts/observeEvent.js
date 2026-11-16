/**
 * Observe event — the single closed contract for facade observation
 * (T-O-PRE1116-06). Pure definition: no node:* / DOM / store / IO.
 * [DNPR] consumes this shape and does not define a second outcome set.
 *
 * http `ok` means only that the handler did not throw. The reader must also
 * look at `status` (T-O-PRE1116-06.7). Status-class dimensions are a report
 * concern, not this module.
 */

import { FAILURE_KINDS } from './jsonOutcome.js'

export const OBSERVE_SURFACES = Object.freeze(['http', 'upgrade', 'json', 'mcp'])

export const HTTP_OUTCOMES = Object.freeze(['ok', 'rejected', 'method', 'failed'])

export const UPGRADE_OUTCOMES = Object.freeze(['accepted', 'rejected', 'method'])

/** `ok` plus the five CF1115 failure kinds. Not a new enum. */
export const JSON_OUTCOMES = Object.freeze(['ok', ...FAILURE_KINDS])

export const MCP_OUTCOMES = Object.freeze(['ok', 'error', 'rejected'])

export const OBSERVE_FIELDS = Object.freeze([
  'surface', 'id', 'plugin', 'outcome', 'ms', 'status', 'kind',
])

const REQUIRED = ['surface', 'id', 'plugin', 'outcome', 'ms']
const OPTIONAL = new Set(['status', 'kind'])

const OUTCOMES = {
  http: new Set(HTTP_OUTCOMES),
  upgrade: new Set(UPGRADE_OUTCOMES),
  json: new Set(JSON_OUTCOMES),
  mcp: new Set(MCP_OUTCOMES),
}

function fail(message) {
  throw new TypeError(`observe-event: ${message}`)
}

/**
 * Reject anything outside the closed field and outcome sets.
 * `id` and `plugin` may be null. `kind` is required when surface is mcp and
 * outcome is `error`. No url, query, body, header, session, or message slot.
 * @param {object} event
 * @returns {object} the same event, when it is in the closed set
 */
export function assertObserveEvent(event) {
  if (event == null || typeof event !== 'object' || Array.isArray(event)) {
    fail('event must be an object')
  }
  const keys = Object.keys(event)
  for (const key of keys) {
    if (!REQUIRED.includes(key) && !OPTIONAL.has(key)) fail(`unknown field ${key}`)
  }
  for (const key of REQUIRED) {
    if (!Object.prototype.hasOwnProperty.call(event, key)) fail(`missing ${key}`)
  }
  if (!OUTCOMES[event.surface]) fail(`unknown surface ${String(event.surface)}`)
  if (event.id !== null && (typeof event.id !== 'string' || event.id === '')) {
    fail('id must be a non-empty string or null')
  }
  if (event.plugin !== null && (typeof event.plugin !== 'string' || event.plugin === '')) {
    fail('plugin must be a non-empty string or null')
  }
  if (typeof event.outcome !== 'string' || !OUTCOMES[event.surface].has(event.outcome)) {
    fail(`unknown outcome ${String(event.outcome)} for ${event.surface}`)
  }
  if (typeof event.ms !== 'number' || !Number.isFinite(event.ms)) fail('ms must be a finite number')
  if (Object.prototype.hasOwnProperty.call(event, 'status')) {
    if (typeof event.status !== 'number' || !Number.isFinite(event.status)) fail('status must be a finite number')
  }
  if (event.surface === 'mcp' && event.outcome === 'error') {
    if (typeof event.kind !== 'string' || event.kind === '') fail('mcp error requires kind')
  } else if (Object.prototype.hasOwnProperty.call(event, 'kind')) {
    if (typeof event.kind !== 'string' || event.kind === '') fail('kind must be a non-empty string')
  }
  return event
}
