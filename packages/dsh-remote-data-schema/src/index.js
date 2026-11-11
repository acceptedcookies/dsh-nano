/**
 * dsh-remote-data-schema — build-time shared library.
 *
 * Host-side schema validation for remote (S3-bucket) objects consumed by the
 * dsh-nano plugins (notepad manifest/files/images; shared-workspace marker /
 * session meta / tree HEAD). Pure JS, no DOM, no IO; bundled into lib/ via
 * esbuild (devDependency per T-O-13), never resolved at runtime.
 *
 * Contract (T-O-8, P1-06 skeleton / P2-01 rules):
 *   validate(kind, obj, {v?, context?}) → {ok:true, v, compat?} — throws SchemaReject.
 *   - `kind`  ∈ manifest | file | image | marker | session-meta | tree-head
 *   - `v`     explicit version override; when absent the version is detected
 *             from discriminants (`schemaVersion` → `v` → default v0).
 *   - `context` per-kind extras the object itself cannot carry:
 *               file:        {key?, id?, manifest?} — key `files/<id>.md`,
 *                            id ∈ manifest.files (when manifest supplied)
 *               session-meta:{parts?} — array of per-part byte sizes
 *   - unknown version → SchemaReject('schema:unknown-version')
 *   - v0 objects pass read-only and are tagged `compat:'v0-backfill'`.
 *
 * v1 rules are fail-closed: any invalid or unknown field rejects the whole
 * object with `SchemaReject('schema:<field>')`.
 */
import { SchemaReject } from './reject.js'
import { validateV1, SUPPORTED_KINDS } from './schema/v1.js'
import { validateV0 } from './schema/v0.js'

export { SchemaReject } from './reject.js'
export { SUPPORTED_KINDS }
export {
  MAX_FILE_BYTES,
  MAX_IMAGE_BYTES,
  MAX_COMMITTED_BYTES,
  PART_BYTES,
  MAX_DEPTH,
  SESSION_ID_RE,
  WORKSPACE_ID_RE,
  validateManifestEntry,
  assertDepth,
} from './schema/v1.js'

const VALIDATORS = {
  1: validateV1,
  0: validateV0,
}

/**
 * Detect the schema version when `{v}` is not passed.
 * `schemaVersion` wins over `v`. Absence of both is kind-dependent:
 *   - manifest → 0 (real manifests predate `schemaVersion`; T-O-8 backfill)
 *   - file / image → 1 (these classes never had a v0 form: raw bytes and
 *     {mime,base64} carry no discriminant, so defaulting to v0 would skip
 *     the whitelist entirely)
 *   - marker / session-meta / tree-head → 1 (always versioned; a missing
 *     `v` then fails inside the v1 rule as 'schema:v', fail-closed)
 */
const UNVERSIONED_DEFAULT = { manifest: 0, file: 1, image: 1, marker: 1, 'session-meta': 1, 'tree-head': 1 }

function detectVersion(kind, obj) {
  if (obj && typeof obj === 'object') {
    if (typeof obj.schemaVersion === 'number') return obj.schemaVersion
    if (typeof obj.v === 'number') return obj.v
  }
  return UNVERSIONED_DEFAULT[kind] ?? 0
}

/**
 * @param {string} kind
 * @param {unknown} obj
 * @param {{v?: number, context?: object}} [opts]
 * @returns {{ok:true, v:number, compat?:string}}
 * @throws {SchemaReject}
 */
export function validate(kind, obj, { v, context } = {}) {
  if (typeof kind !== 'string' || !SUPPORTED_KINDS.includes(kind)) {
    throw new SchemaReject('schema:kind', `unknown kind "${kind}"`)
  }
  const version = v ?? detectVersion(kind, obj)
  const run = VALIDATORS[version]
  if (!run) {
    throw new SchemaReject('schema:unknown-version', `${kind} schema version ${version}`)
  }
  const result = run(kind, obj, context)
  return { v: version, ...result }
}
