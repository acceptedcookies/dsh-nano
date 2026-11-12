/**
 * SchemaReject — the single rejection type for remote-data validation.
 *
 * Every field-level failure throws `SchemaReject` carrying a stable `reason`
 * of the form `'schema:<field>'` (e.g. `schema:name`, `schema:committedBytes`).
 * Callers map it to the host route's `{ok:false,reason:'schema',detail}` shape
 * (T-O-8: strict whole-object reject; keep last-good state).
 */
export class SchemaReject extends Error {
  constructor(reason, detail = '') {
    super(detail ? `${reason}: ${detail}` : String(reason))
    this.name = 'SchemaReject'
    this.reason = String(reason)
  }
}

/** Convenience throw helper used by validators. */
export function reject(field, detail = '') {
  throw new SchemaReject(`schema:${field}`, detail)
}
