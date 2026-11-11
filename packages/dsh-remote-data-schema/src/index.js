/**
 * dsh-remote-data-schema — build-time shared library.
 *
 * Host-side schema validation for remote (S3-bucket) objects consumed by the
 * dsh-nano plugins (notepad manifest/files/images; shared-workspace marker /
 * session meta / tree HEAD). Pure JS, no DOM, no IO; bundled into lib/ via
 * esbuild (devDependency per T-O-13), never resolved at runtime.
 *
 * Contract (T-O-8, P1-06):
 *   validate(kind, obj, {v?}) → {ok:true, v, compat?} — throws SchemaReject.
 *   - `kind`  ∈ manifest | file | image | marker | session-meta | tree-head
 *   - `v`     explicit version override; when absent the version is detected
 *             from discriminants (`schemaVersion` → `v` → default v0).
 *   - unknown version → SchemaReject('schema:unknown-version')
 *   - v0 objects pass read-only and are tagged `compat:'v0-backfill'`.
 *
 * v1 rules are a Phase 2 skeleton: they exist but reject `schema:unimplemented`
 * until P2-01 fills them in — validation is fail-closed, never silently open.
 */
import { SchemaReject } from './reject.js'
import { validateV1, SUPPORTED_KINDS } from './schema/v1.js'
import { validateV0 } from './schema/v0.js'

export { SchemaReject } from './reject.js'
export { SUPPORTED_KINDS }

const VALIDATORS = {
  1: validateV1,
  0: validateV0,
}

/**
 * Detect the schema version when `{v}` is not passed.
 * `schemaVersion` wins over `v`; absence of both means v0 (pre-versioned).
 */
function detectVersion(obj) {
  if (obj && typeof obj === 'object') {
    if (typeof obj.schemaVersion === 'number') return obj.schemaVersion
    if (typeof obj.v === 'number') return obj.v
  }
  return 0
}

/**
 * @param {string} kind
 * @param {unknown} obj
 * @param {{v?: number}} [opts]
 * @returns {{ok:true, v:number, compat?:string}}
 * @throws {SchemaReject}
 */
export function validate(kind, obj, { v } = {}) {
  if (typeof kind !== 'string' || !SUPPORTED_KINDS.includes(kind)) {
    throw new SchemaReject('schema:kind', `unknown kind "${kind}"`)
  }
  const version = v ?? detectVersion(obj)
  const run = VALIDATORS[version]
  if (!run) {
    throw new SchemaReject('schema:unknown-version', `${kind} schema version ${version}`)
  }
  const result = run(kind, obj)
  return { v: version, ...result }
}
