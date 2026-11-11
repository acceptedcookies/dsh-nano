/**
 * v0 validators — historical objects predating `schemaVersion`/`v`
 * discriminants (T-O-8).
 *
 * v0 is *read-only compatible*: a v0 object may be read and rendered, and is
 * tagged `compat:'v0-backfill'` so the caller can schedule the one-shot
 * backfill on its next rewrite. v0 is NEVER auto-upgraded in place and never
 * silently written as v1 — writes always go through the v1 rules with an
 * explicit discriminant.
 *
 * The only check applied here is the shared depth guard: even a "pass"
 * object must not be able to exhaust the host through pathological nesting.
 */
import { SchemaReject } from '../reject.js'
import { SUPPORTED_KINDS, assertDepth } from './v1.js'

/** @returns {{ok:true, compat:'v0-backfill'}} */
export function validateV0(kind, obj) {
  if (!SUPPORTED_KINDS.includes(kind)) {
    throw new SchemaReject('schema:kind', `unknown kind "${kind}"`)
  }
  assertDepth(obj)
  return { ok: true, compat: 'v0-backfill' }
}
