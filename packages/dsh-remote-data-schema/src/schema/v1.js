/**
 * v1 validators — PHASE 1 SKELETON.
 *
 * Phase 2 (P2-01) fills in the real rules, strictly from the actual written
 * shapes (field whitelists come from the writers, not imagination — errata A1):
 *   - manifest:  {schemaVersion:1, rev:int>0, files:{[id]:{name,sha256,…}},
 *                 images:{[sha]:{byteLength}}}
 *   - file:      `files/<id>.md`, id charset ^[A-Za-z0-9_-]{1,128}$, ≤maxFileBytes
 *   - image:     mime∈{png,jpeg,gif,webp}, valid base64, ≤maxImageBytes
 *   - marker:    {v:1, workspaceId, title, pathHint, createdAt, createdBy, members}
 *   - session-meta: {v:1, formatVersion:4, committedBytes≤maxCommittedBytes, …}
 *   - tree-head: {files:[{rel,sha256,size}]}
 *
 * Until then every kind fails closed with `schema:unimplemented`, so a guard
 * wired early can never silently pass an unchecked remote object.
 */
import { SchemaReject } from '../reject.js'

export const SUPPORTED_KINDS = Object.freeze([
  'manifest',
  'file',
  'image',
  'marker',
  'session-meta',
  'tree-head',
])

/** @returns {{ok:true, compat?:string}} — always; failures throw SchemaReject. */
export function validateV1(kind, obj) {
  if (!SUPPORTED_KINDS.includes(kind)) {
    throw new SchemaReject('schema:kind', `unknown kind "${kind}"`)
  }
  // Phase 2: dispatch to the kind-specific rule. Fail closed until then.
  throw new SchemaReject('schema:unimplemented', `v1 rule for "${kind}" not implemented`)
}
