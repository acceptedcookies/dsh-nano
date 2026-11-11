/**
 * v1 validators — the security contract for remote (S3) objects (P2-01, T-O-8).
 *
 * Field whitelists are the LITERAL on-disk shapes the writers produce
 * (errata A1 — never validate imagined fields):
 *
 *   manifest    {schemaVersion?, rev, updatedAt,
 *                files:{[id]:{name,parentId,workspaceId,sha256,bytes,updatedAt}},
 *                images:{[sha256]:{id,mime,byteLength}}}
 *               Written today WITHOUT `schemaVersion` (sync.js:147-152) — those
 *               objects dispatch as v0 and pass read-only as `v0-backfill`.
 *               Explicit `{v:1}` (write side) tolerates the same literal shape
 *               plus the optional `schemaVersion:1` discriminant.
 *   file        raw UTF-8 bytes at `files/<id>.md` — validate('file', text|bytes,
 *               {context:{key?, id?, manifest?}}). Wrapped object form
 *               `{content,id?,key?}` is accepted for callers that already have
 *               the object key at hand.
 *   image       `{mime, base64}` at `images/<sha256>` (JSON object, sync.js:140).
 *   marker      {v:1, workspaceId, title, pathHint, createdAt, createdBy,
 *                members:{[memberId]:{username,instance,localPath,joinedAt}}}
 *   session-meta {v:1, sessionId, writerId, writerName, rev, formatVersion,
 *                committedBytes, uncompressedSeqBytes, eventCount, title,
 *                projectDir, cwd, createdAt, mtime, deleted, attachmentRefs}
 *   tree-head   {v, generation, parent, writerId, files:[{rel,sha256,size}],
 *                conflicts, at}
 *
 * Reject semantics: any invalid field throws SchemaReject('schema:<field>')
 * (strict whole-object reject; unknown fields are rejected too).
 *
 * Explicit deviations from the AP table, all verified against the live bucket
 * corpus in test/remote-schema/compat/ and the writers — see package AGENTS.md:
 *   - tree-head `rel` does NOT reject SKIP paths (imagine/, .grok/,
 *     node_modules/): a real HEAD legitimately contains them. SKIP is a
 *     P2-05 push/pull enforcement boundary, not a schema rejection.
 *   - marker `memberId` (`createdBy`, writerId) contains '@' + '.' —
 *     `username@instance8` per workspaces.js:50 — wider than the AP table's
 *     `^[A-Za-z0-9_-]{1,128}$`.
 *   - manifest `rev` accepts 0 (first push writes rev 1 but a bucket probed
 *     mid-CAS can surface 0; real corpus shows small ints).
 *   - `size`/`bytes` bounds use MAX_FILE_BYTES/MAX_IMAGE_BYTES.
 */
import { SchemaReject, reject } from '../reject.js'

/* ------------------------------------------------------------------ *
 * Exported limits — L3 Config per T-O-8 §5, conservative defaults.
 * ------------------------------------------------------------------ */
export const MAX_FILE_BYTES = 2 * 1024 * 1024 // 2 MiB (tree.js MAX_FILE)
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB (notepad imageLimitBytes default)
export const MAX_COMMITTED_BYTES = 2 * 1024 * 1024 * 1024 // 2 GiB
export const PART_BYTES = 64 * 1024 // session body part (session-io.js CHUNK)
export const MAX_DEPTH = 32 // nesting guard (P3-06 later; cheap here)
export const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/
export const WORKSPACE_ID_RE = /^[A-Za-z0-9]{16}$/ // 16-hex (v0 path-hash is also 16-hex)

/* Internal caps — DoS surface bounding, generous above real data. */
const MAX_ENTRIES = 1024 // manifest files/images, members
const MAX_TREE_FILES = 4096 // scan() caps at 200; headroom for merges
const MAX_STRING = 4096 // localPath / cwd / rel bound
const MAX_NAME = 512 // file names (index.js MAX_NAME_BYTES)
const MAX_TITLE = 1024
const MAX_PARTS = MAX_COMMITTED_BYTES / PART_BYTES // 32768

const SHA256_RE = /^[0-9a-f]{64}$/
const FILE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/ // manifest files[id] + files/<id>.md
/* memberId / writerId / createdBy = `${username}@${instance8}` (workspaces.js:50).
 * Real data: 'seanz-dev@fba3fbd5'. username is free text minus whitespace;
 * instance prefix is a UUID fragment — charset [A-Za-z0-9_-]. */
const MEMBER_ID_RE = /^[^\s@/]{1,96}@[A-Za-z0-9_-]{1,64}$/
const INSTANCE_RE = /^[A-Za-z0-9_-]{1,64}$/ // randomUUID or credential-resolved id
const PROJECT_DIR_RE = /^--[^\n\r]{0,252}--$/ // projectKey(): '--'+slug(≤251)+'--'
const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/
const CONTROL_RE = /[\u0000-\u001f\u007f]/
const WINDOWS_ABS_RE = /^[A-Za-z]:[\\/]/
const FILE_KEY_RE = /^files\/([A-Za-z0-9_-]{1,128})\.md$/

export const SUPPORTED_KINDS = Object.freeze([
  'manifest',
  'file',
  'image',
  'marker',
  'session-meta',
  'tree-head',
])

/* ------------------------------------------------------------------ *
 * Small primitives.
 * ------------------------------------------------------------------ */
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Depth guard — any nesting deeper than MAX_DEPTH rejects 'schema:depth'.
 * Iterative (no recursion): a crafted deep object must never blow the stack.
 * Only enumerable own object/array children count.
 */
export function assertDepth(value) {
  const stack = [[value, 0]]
  while (stack.length) {
    const [node, depth] = stack.pop()
    if ((isObj(node) || Array.isArray(node)) && node !== null) {
      if (depth + 1 > MAX_DEPTH) reject('depth', `nesting exceeds ${MAX_DEPTH}`)
      for (const child of Object.values(node)) {
        if (child !== null && typeof child === 'object') stack.push([child, depth + 1])
      }
    }
  }
}

/** Exact-key object whitelist; unknown keys reject 'schema:<field>'. */
function checkKeys(obj, allowed, field) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) reject(field, `unknown field "${key}"`)
  }
}

function needString(value, field, { min = 1, max = MAX_STRING, control = true } = {}) {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    reject(field, `${field} must be a ${min}..${max} char string`)
  }
  if (control && CONTROL_RE.test(value)) reject(field, `${field} contains a control character`)
  return value
}

function needInt(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    reject(field, `${field} must be an integer in ${min}..${max}`)
  }
  return value
}

/** ISO-8601-ish timestamp the writers emit via new Date().toISOString(). */
function needIso(value, field) {
  const s = needString(value, field, { min: 1, max: 64 })
  if (Number.isNaN(Date.parse(s))) reject(field, `${field} is not a parseable timestamp`)
  return s
}

/** memberId / writerId / createdBy — `username@instance8`. */
function needMemberId(value, field) {
  const s = needString(value, field, { min: 1, max: 128 })
  if (!MEMBER_ID_RE.test(s) || s.includes('..')) reject(field, `${field} is not a member id`)
  return s
}

/**
 * Absolute, normalized replica path: POSIX `/abs/…` or Windows `C:/…` `C:\…`.
 * Rejects '..', '.' segments, empty segments (//), trailing separators,
 * and control characters. No filesystem access — lexical only (the realpath
 * fence lives in the consumer, P2-05).
 */
function needLocalPath(value, field) {
  const s = needString(value, field, { min: 1, max: MAX_STRING })
  const windows = WINDOWS_ABS_RE.test(s)
  let body
  if (s.startsWith('/')) body = s.slice(1)
  else if (windows) body = s.slice(3)
  else reject(field, `${field} must be an absolute path`)
  if (body === '') return s // bare root: '/' or 'C:/'
  for (const seg of body.split(s.startsWith('/') ? '/' : /[\\/]/)) {
    if (seg === '..' || seg === '.') reject(field, `${field} must not contain "${seg}"`)
    if (seg === '') reject(field, `${field} has an empty segment`)
  }
  return s
}

/** Safe relative path for tree-head rels (POSIX separators, writer-side). */
function needRel(value) {
  const s = needString(value, 'rel', { min: 1, max: MAX_STRING })
  if (s.includes('\\')) reject('rel', 'rel must use "/" separators')
  if (s.startsWith('/') || WINDOWS_ABS_RE.test(s) || s.includes(':')) {
    reject('rel', 'rel must be a relative path')
  }
  for (const seg of s.split('/')) {
    if (seg === '..' || seg === '.') reject('rel', `rel must not contain "${seg}"`)
    if (seg === '') reject('rel', 'rel has an empty segment')
  }
  return s
}

function needBytes(value, field, { max = MAX_FILE_BYTES } = {}) {
  let bytes
  if (typeof value === 'string') bytes = Buffer.from(value, 'utf8')
  else if (value instanceof Uint8Array || Buffer.isBuffer(value)) bytes = Buffer.from(value)
  else reject(field, `${field} must be a string or byte buffer`)
  if (bytes.byteLength > max) reject(field, `${field} exceeds ${max} bytes`)
  return bytes
}

/** Fatal UTF-8 decode — invalid byte sequences reject rather than substitute. */
function decodeUtf8(bytes, field) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    reject(field, `${field} is not valid UTF-8`)
  }
}

function strictBase64(text, field) {
  const s = needString(text, field, { min: 0, max: Math.ceil((MAX_IMAGE_BYTES + 2) / 3) * 4 })
  if (!BASE64_RE.test(s) || s.length % 4 !== 0) reject(field, `${field} is not base64`)
  const bytes = Buffer.from(s, 'base64')
  /* Re-encode equality guards against lenient decoders accepting junk. */
  if (s.length > 0 && bytes.toString('base64') !== s) reject(field, `${field} is not base64`)
  return bytes
}

/* ------------------------------------------------------------------ *
 * manifest — {schemaVersion?, rev, updatedAt, files, images}
 * ------------------------------------------------------------------ */
const MANIFEST_KEYS = new Set(['schemaVersion', 'rev', 'updatedAt', 'files', 'images'])
const FILE_ENTRY_KEYS = new Set(['name', 'parentId', 'workspaceId', 'sha256', 'bytes', 'updatedAt'])
const IMAGE_ENTRY_KEYS = new Set(['id', 'mime', 'byteLength'])

export function validateManifestEntry(entry) {
  if (!isObj(entry)) reject('files', 'file entry must be an object')
  checkKeys(entry, FILE_ENTRY_KEYS, 'files')
  const name = needString(entry.name, 'name', { min: 1, max: MAX_NAME })
  if (name.includes('/') || name.includes('\\')) reject('name', 'name must not contain a path separator')
  needString(entry.sha256, 'sha256', { min: 64, max: 64 })
  if (!SHA256_RE.test(entry.sha256)) reject('sha256', 'sha256 must be 64 lowercase hex')
  /* parentId / workspaceId: the writer emits null or a file-id charset
     string (workspaceId is itself a crypto.randomUUID() in real data). */
  for (const field of ['parentId', 'workspaceId']) {
    const v = entry[field]
    if (v === undefined || v === null) continue
    if (typeof v !== 'string' || !FILE_ID_RE.test(v)) reject(field, `${field} must be null or a file id`)
  }
  needInt(entry.bytes, 'bytes', { min: 0 })
  needInt(entry.updatedAt, 'updatedAt', { min: 0 })
  return entry
}

function validateImageEntry(entry, sha) {
  if (!isObj(entry)) reject('images', 'image entry must be an object')
  checkKeys(entry, IMAGE_ENTRY_KEYS, 'images')
  needString(entry.id, 'id', { min: 1, max: 128 })
  if (!FILE_ID_RE.test(entry.id)) reject('id', 'image id has a bad charset')
  if (!IMAGE_MIMES.has(entry.mime)) reject('mime', `unsupported mime "${entry.mime}"`)
  needInt(entry.byteLength, 'byteLength', { min: 0, max: MAX_IMAGE_BYTES })
  void sha
  return entry
}

function validateManifest(obj) {
  if (!isObj(obj)) reject('manifest', 'manifest must be an object')
  checkKeys(obj, MANIFEST_KEYS, 'manifest')
  if (obj.schemaVersion !== undefined && obj.schemaVersion !== 1) {
    reject('schemaVersion', 'schemaVersion must be 1')
  }
  needInt(obj.rev, 'rev', { min: 0 }) // real corpus: rev can be 0
  needIso(obj.updatedAt, 'updatedAt')
  for (const field of ['files', 'images']) {
    if (!isObj(obj[field])) reject(field, `${field} must be an object`)
    if (Object.keys(obj[field]).length > MAX_ENTRIES) reject(field, `${field} has too many entries`)
  }
  for (const [id, entry] of Object.entries(obj.files)) {
    if (!FILE_ID_RE.test(id) || id.includes('..')) reject('files', `file id "${id}" has a bad charset`)
    validateManifestEntry(entry)
  }
  for (const [sha, entry] of Object.entries(obj.images)) {
    if (!SHA256_RE.test(sha)) reject('images', `image key "${sha}" is not a sha256`)
    validateImageEntry(entry, sha)
  }
  return { ok: true }
}

/* ------------------------------------------------------------------ *
 * file — raw UTF-8 markdown bytes at files/<id>.md (NOT a JSON object).
 * context: {key?, id?, manifest?} — id must match `files/<id>.md` charset
 * and (when a manifest is supplied) exist in manifest.files.
 * ------------------------------------------------------------------ */
function validateFile(obj, ctx) {
  const { key, id, manifest } = ctx ?? {}
  let content = obj
  let localId = id
  let localKey = key

  if (isObj(obj) && !(obj instanceof Uint8Array)) {
    /* Wrapped form: the object key may ride along with the body.
       (Buffer/Uint8Array are objects too — they are the raw-bytes form.) */
    checkKeys(obj, new Set(['content', 'id', 'key']), 'file')
    if (obj.id !== undefined) localId = obj.id
    if (obj.key !== undefined) localKey = obj.key
    content = obj.content
  }

  if (localKey !== undefined) {
    if (typeof localKey !== 'string' || localKey.length > 512) reject('key', 'key must be a ≤512 char string')
    const match = FILE_KEY_RE.exec(localKey)
    if (match === null) reject('key', `key "${localKey}" is not files/<id>.md`)
    if (localId !== undefined && localId !== match[1]) reject('id', 'id does not match the key')
    localId = match[1]
  }
  if (localId !== undefined && (typeof localId !== 'string' || !FILE_ID_RE.test(localId) || localId.includes('..'))) {
    reject('id', `file id "${localId}" has a bad charset`)
  }
  if (manifest !== undefined) {
    if (!isObj(manifest.files)) reject('manifest', 'manifest has no files index')
    if (localId === undefined || !Object.hasOwn(manifest.files, localId)) {
      reject('id', 'file id is not listed in the manifest')
    }
  }

  const bytes = needBytes(content, 'content', { max: MAX_FILE_BYTES })
  decodeUtf8(bytes, 'content')
  return { ok: true }
}

/* ------------------------------------------------------------------ *
 * image — {mime, base64} JSON at images/<sha256>.
 * ------------------------------------------------------------------ */
const IMAGE_KEYS = new Set(['mime', 'base64'])

function validateImage(obj) {
  if (!isObj(obj)) reject('image', 'image must be an object')
  checkKeys(obj, IMAGE_KEYS, 'image')
  if (!IMAGE_MIMES.has(obj.mime)) reject('mime', `unsupported mime "${obj.mime}"`)
  const bytes = strictBase64(obj.base64, 'base64')
  if (bytes.byteLength > MAX_IMAGE_BYTES) reject('base64', `image exceeds ${MAX_IMAGE_BYTES} bytes`)
  return { ok: true }
}

/* ------------------------------------------------------------------ *
 * marker — {v:1, workspaceId, title, pathHint, createdAt, createdBy, members}
 * ------------------------------------------------------------------ */
const MARKER_KEYS = new Set(['v', 'workspaceId', 'title', 'pathHint', 'createdAt', 'createdBy', 'members'])
const MEMBER_KEYS = new Set(['username', 'instance', 'localPath', 'joinedAt'])

function validateMarker(obj) {
  if (!isObj(obj)) reject('marker', 'marker must be an object')
  checkKeys(obj, MARKER_KEYS, 'marker')
  if (obj.v !== 1) reject('v', 'marker v must be 1')
  const workspaceId = needString(obj.workspaceId, 'workspaceId', { min: 16, max: 16 })
  /* 16-hex covers both the random id and the v0 path-hash charset. */
  if (!WORKSPACE_ID_RE.test(workspaceId)) reject('workspaceId', 'workspaceId must be 16 alphanumerics')
  needString(obj.title, 'title', { min: 0, max: MAX_TITLE })
  needString(obj.pathHint, 'pathHint', { min: 0, max: MAX_STRING })
  needIso(obj.createdAt, 'createdAt')
  needMemberId(obj.createdBy, 'createdBy') // required: P2-03 identity binding input
  if (!isObj(obj.members)) reject('members', 'members must be an object')
  const ids = Object.keys(obj.members)
  if (ids.length === 0) reject('members', 'members must not be empty')
  if (ids.length > MAX_ENTRIES) reject('members', 'members has too many entries')
  for (const [memberId, member] of ids.map(id => [id, obj.members[id]])) {
    needMemberId(memberId, 'members')
    if (!isObj(member)) reject('members', `member "${memberId}" must be an object`)
    checkKeys(member, MEMBER_KEYS, 'members')
    needString(member.username, 'username', { min: 1, max: 128 })
    needString(member.instance, 'instance', { min: 1, max: 64 })
    if (!INSTANCE_RE.test(member.instance)) reject('instance', 'instance has a bad charset')
    needLocalPath(member.localPath, 'localPath')
    needIso(member.joinedAt, 'joinedAt')
  }
  return { ok: true }
}

/* ------------------------------------------------------------------ *
 * session-meta — {v:1, sessionId, writerId, writerName, rev, formatVersion,
 *   committedBytes, uncompressedSeqBytes, eventCount, title, projectDir, cwd,
 *   createdAt, mtime, deleted, attachmentRefs} (+ optional parts array).
 * ------------------------------------------------------------------ */
const SESSION_META_KEYS = new Set([
  'v', 'sessionId', 'writerId', 'writerName', 'rev', 'formatVersion',
  'committedBytes', 'uncompressedSeqBytes', 'eventCount', 'title',
  'projectDir', 'cwd', 'createdAt', 'mtime', 'deleted', 'attachmentRefs',
  'parts', // optional: writers do not emit it; consumers may pass part sizes
])

function validatePartSizes(parts, committedBytes) {
  if (!Array.isArray(parts)) reject('parts', 'parts must be an array of byte sizes')
  const max = Math.ceil(committedBytes / PART_BYTES)
  if (parts.length > max) reject('parts', `parts exceed ceil(committedBytes/${PART_BYTES})`)
  if (parts.length > MAX_PARTS) reject('parts', 'too many parts')
  for (const size of parts) needInt(size, 'parts', { min: 0, max: PART_BYTES })
}

function validateSessionMeta(obj, ctx) {
  if (!isObj(obj)) reject('session-meta', 'session meta must be an object')
  checkKeys(obj, SESSION_META_KEYS, 'session-meta')
  if (obj.v !== 1) reject('v', 'session meta v must be 1')
  const sessionId = needString(obj.sessionId, 'sessionId', { min: 1, max: 128 })
  if (!SESSION_ID_RE.test(sessionId)) reject('sessionId', 'sessionId has a bad charset')
  needMemberId(obj.writerId, 'writerId')
  needString(obj.writerName, 'writerName', { min: 1, max: 128 })
  needInt(obj.rev, 'rev', { min: 0 })
  /* formatVersion: writer emits 4; 1..4 accepted, anything else rejects. */
  needInt(obj.formatVersion, 'formatVersion', { min: 1, max: 4 })
  needInt(obj.committedBytes, 'committedBytes', { min: 0, max: MAX_COMMITTED_BYTES })
  needInt(obj.uncompressedSeqBytes, 'uncompressedSeqBytes', { min: 0 })
  needInt(obj.eventCount, 'eventCount', { min: 0 })
  needString(obj.title, 'title', { min: 0, max: MAX_TITLE })
  const projectDir = needString(obj.projectDir, 'projectDir', { min: 2, max: 255 })
  if (!PROJECT_DIR_RE.test(projectDir)) reject('projectDir', 'projectDir must be the --slug-- key form')
  needString(obj.cwd, 'cwd', { min: 1, max: MAX_STRING })
  needIso(obj.createdAt, 'createdAt')
  needIso(obj.mtime, 'mtime')
  if (typeof obj.deleted !== 'boolean') reject('deleted', 'deleted must be a boolean')
  if (!Array.isArray(obj.attachmentRefs)) reject('attachmentRefs', 'attachmentRefs must be an array')
  if (obj.attachmentRefs.length > MAX_ENTRIES) reject('attachmentRefs', 'too many attachment refs')
  for (const ref of obj.attachmentRefs) {
    if (!isObj(ref)) reject('attachmentRefs', 'attachment ref must be an object')
  }
  /* Part sizes travel separately from the meta (context.parts) or, for
     callers that aggregate them, as an optional `parts` array. */
  if (obj.parts !== undefined) validatePartSizes(obj.parts, obj.committedBytes)
  if (ctx?.parts !== undefined) validatePartSizes(ctx.parts, obj.committedBytes)
  return { ok: true }
}

/* ------------------------------------------------------------------ *
 * tree-head — {v, generation, parent, writerId,
 *              files:[{rel,sha256,size}], conflicts, at}
 * `rel` is a safe relative path only: SKIP entries (imagine/, .grok/,
 * node_modules/) legitimately appear in real HEADs — SKIP is a P2-05
 * enforcement boundary, not a schema rejection.
 * ------------------------------------------------------------------ */
const TREE_HEAD_KEYS = new Set(['v', 'generation', 'parent', 'writerId', 'files', 'conflicts', 'at'])
const TREE_FILE_KEYS = new Set(['rel', 'sha256', 'size'])

function validateTreeHead(obj) {
  if (!isObj(obj)) reject('tree-head', 'tree head must be an object')
  checkKeys(obj, TREE_HEAD_KEYS, 'tree-head')
  if (obj.v !== 1) reject('v', 'tree head v must be 1')
  needInt(obj.generation, 'generation', { min: 0 })
  if (obj.parent !== null) needInt(obj.parent, 'parent', { min: 0 })
  needMemberId(obj.writerId, 'writerId')
  if (!Array.isArray(obj.files)) reject('files', 'files must be an array')
  if (obj.files.length > MAX_TREE_FILES) reject('files', 'too many files')
  for (const file of obj.files) {
    if (!isObj(file)) reject('files', 'file row must be an object')
    checkKeys(file, TREE_FILE_KEYS, 'files')
    needRel(file.rel)
    needString(file.sha256, 'sha256', { min: 64, max: 64 })
    if (!SHA256_RE.test(file.sha256)) reject('sha256', 'sha256 must be 64 lowercase hex')
    needInt(file.size, 'size', { min: 0, max: MAX_FILE_BYTES })
  }
  if (!Array.isArray(obj.conflicts)) reject('conflicts', 'conflicts must be an array')
  for (const rel of obj.conflicts) needRel(rel)
  needIso(obj.at, 'at')
  return { ok: true }
}

/* ------------------------------------------------------------------ *
 * Dispatch.
 * ------------------------------------------------------------------ */
const KIND_VALIDATORS = {
  manifest: validateManifest,
  file: validateFile,
  image: validateImage,
  marker: validateMarker,
  'session-meta': validateSessionMeta,
  'tree-head': validateTreeHead,
}

/**
 * @param {string} kind - one of SUPPORTED_KINDS
 * @param {unknown} obj - the decoded remote object (file may be raw bytes)
 * @param {object} [ctx] - per-kind context: file {key,id,manifest},
 *                         session-meta {parts}
 * @returns {{ok:true}} — failures throw SchemaReject('schema:<field>')
 */
export function validateV1(kind, obj, ctx) {
  if (!SUPPORTED_KINDS.includes(kind)) {
    throw new SchemaReject('schema:kind', `unknown kind "${kind}"`)
  }
  assertDepth(obj)
  return KIND_VALIDATORS[kind](obj, ctx)
}
