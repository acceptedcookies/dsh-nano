/**
 * v0 validators — PHASE 1 SKELETON.
 *
 * v0 = historical objects that predate `schemaVersion`/`v` discriminants.
 * T-O-8: v0 is *read-only compatible* (never written, never migrated in bulk)
 * and each accepted object is tagged `compat:'v0-backfill'` so callers can
 * schedule the one-shot backfill on rewrite.
 *
 * Phase 2 (P2-01) replaces the pass-through with the real v0 lenient rules
 * per kind. For the skeleton we keep the minimal safe surface: only the six
 * known kinds pass, anything else is rejected.
 */
import { SchemaReject } from '../reject.js'
import { SUPPORTED_KINDS } from './v1.js'

/** @returns {{ok:true, compat:'v0-backfill'}} */
export function validateV0(kind, obj) {
  if (!SUPPORTED_KINDS.includes(kind)) {
    throw new SchemaReject('schema:kind', `unknown kind "${kind}"`)
  }
  // Phase 2: per-kind v0 lenient rules. Minimal pass-through for the skeleton.
  return { ok: true, compat: 'v0-backfill' }
}
