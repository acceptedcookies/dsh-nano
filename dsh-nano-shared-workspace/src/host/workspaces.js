/**
 * Shared workspaces are cloud-first: the marker under `workspaces/{id}.json`
 * on S3 is the canonical object; each member only records where *its* local
 * replica lives (`localPath`). Creating one never touches the host's local
 * workspace list — the local copy is a plain directory chosen by the client.
 *
 * workspaceId: random 16-hex (cloud-assigned). The legacy path-hash id is
 * still honoured when matching sessions to markers so v0 markers keep working.
 */

import { execFile } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { basename, resolve } from 'node:path'
import { validate, SchemaReject, WORKSPACE_ID_RE } from 'dsh-remote-data-schema'

const hash16 = input => createHash('sha256').update(input).digest('hex').slice(0, 16)

/**
 * Read + validate one remote marker (P2-03). A marker is co-tenant writable,
 * so it crosses the remote→host boundary only after the v1 whole-object
 * whitelist: `{v:1, workspaceId, title, pathHint, createdAt, createdBy,
 * members:{[memberId]:{username,instance,localPath,joinedAt}}}`.
 * @returns the validated marker; `undefined` on fetch failure / schema reject.
 */
export async function readMarker(s3, key) {
  const row = await s3.getJson(key).catch(() => undefined)
  if (row === undefined) return undefined
  try {
    validate('marker', row)
  } catch (error) {
    if (error instanceof SchemaReject) return undefined
    throw error
  }
  // Key↔object binding: a marker must live at workspaces/<its own id>.json —
  // a foreign workspaceId inside would drive cross-tenant key joins.
  if (row.workspaceId !== basename(key, '.json')) return undefined
  return row
}

const INSTANCE_REF = 'DSH_NSW_INSTANCE_ID'

/** One persistent instance id per dsh profile; survives restarts, unique per client. */
export async function instanceId(ctx) {
  const credentials = ctx.get('credentials')
  const resolved = await credentials?.resolve(INSTANCE_REF)
  if (typeof resolved?.value === 'string' && resolved.value !== '') return resolved.value
  const generated = randomUUID()
  await credentials?.set(INSTANCE_REF, generated)
  return generated
}

/** `git remote get-url origin` inside `path`; undefined outside a repo or without git. */
function remoteUrl(path) {
  return new Promise(resolvePromise => {
    execFile('git', ['-C', path, 'remote', 'get-url', 'origin'], { timeout: 5000 }, (error, stdout) => {
      resolvePromise(error === null && stdout.trim() !== '' ? stdout.trim() : undefined)
    })
  })
}

/**
 * Legacy workspaceId derivation — git remote > basename hash. New markers use
 * random ids, but session matching still probes this for v0 markers.
 * @param path - absolute workspace directory on this host.
 */
export async function workspaceIdFor(path) {
  const remote = await remoteUrl(path)
  if (remote !== undefined) return hash16(remote.replace(/\.git$/, ''))
  const leaf = basename(resolve(path))
  return hash16(leaf === '' ? resolve(path) : leaf)
}

const memberKeyOf = (identity, me) => `${identity.username}@${me.slice(0, 8)}`

/**
 * This instance's own member row in a marker — strict `memberId`
 * (`username@instance8`) lookup ONLY (P2-03, audit §4.9/§4.11). The previous
 * username-only fallback let a co-tenant plant `members[<victim's memberId>]`
 * or rely on username equality so an attacker-chosen `localPath` became this
 * host's replica root. The row's `instance` must also equal our full
 * instance id: memberId carries only the 8-char prefix, and the full UUID is
 * never published elsewhere, so a squatter cannot forge it.
 * A foreign member's `localPath` is read-only data (listing); it is never a
 * write target.
 * @param marker - schema-validated marker.
 * @param identity - local identity `{username}`.
 * @param me - this instance's full instance id.
 * @returns `{memberId, member}` or `undefined` when this instance never joined.
 */
export function ownMember(marker, identity, me) {
  const memberId = memberKeyOf(identity, me)
  const member = marker?.members?.[memberId]
  if (member === undefined || member === null || typeof member !== 'object') return undefined
  if (member.instance !== me) return undefined
  return { memberId, member }
}

/**
 * Create the cloud canonical marker, then record this instance's membership
 * with the chosen local replica path. S3 write happens FIRST — the workspace
 * is born on the remote, not locally.
 * @returns the marker as persisted.
 */
export async function createWorkspace(s3, ctx, identity, { name, localPath }) {
  const me = await instanceId(ctx)
  const memberId = memberKeyOf(identity, me)
  const marker = {
    v: 1,
    workspaceId: randomBytes(8).toString('hex'),
    title: name,
    pathHint: name,
    createdAt: new Date().toISOString(),
    createdBy: memberId,
    members: {
      [memberId]: {
        username: identity.username,
        instance: me,
        localPath,
        joinedAt: new Date().toISOString(),
      },
    },
  }
  await s3.putJson(`workspaces/${marker.workspaceId}.json`, marker)
  return marker
}

/**
 * Join an existing shared workspace: merge this instance's member row (with
 * its local replica path) into the remote marker.
 * @returns the merged marker.
 */
export async function joinWorkspace(s3, ctx, identity, { workspaceId, localPath }) {
  // Consumer-layer boundary (P2-06 defense-in-depth; the route already checks).
  if (typeof workspaceId !== 'string' || !WORKSPACE_ID_RE.test(workspaceId)) {
    throw new SchemaReject('schema:workspaceId', 'workspaceId has a bad charset')
  }
  const key = `workspaces/${workspaceId}.json`
  const existing = await readMarker(s3, key)
  if (existing === undefined) throw new Error('shared workspace not found')
  const me = await instanceId(ctx)
  const memberId = memberKeyOf(identity, me)
  const members = { ...(existing.members ?? {}) }
  if (members[memberId] === undefined) {
    members[memberId] = { username: identity.username, instance: me, joinedAt: new Date().toISOString() }
  }
  // Only THIS member's row is mutated — remote members' rows pass through
  // untouched (foreign localPath is never a write target).
  members[memberId].localPath = localPath
  const marker = { ...existing, members }
  await s3.putJson(key, marker)
  return marker
}

/**
 * All workspace markers under `workspaces/` — single listing page for v1.
 * Only schema-valid markers surface (P2-03): a malformed or poisoned marker
 * is skipped, never matched against local paths.
 */
export async function listWorkspaces(s3) {
  const { keys } = await s3.list('workspaces/')
  const rows = []
  for (const key of keys) {
    if (!key.endsWith('.json')) continue
    const row = await readMarker(s3, key)
    if (row !== undefined) rows.push(row)
  }
  return rows
}

/**
 * The marker whose OWN member's `localPath` contains `cwd` (self or a child).
 * Falls back to the legacy path-hash id so markers written before the
 * localPath field existed still match.
 *
 * P2-03 (audit §4.9): only THIS instance's member row
 * (`members[username@instance8]` with `member.instance === instanceId`) may
 * drive the match — a co-tenant's `localPath` pointing at `/Users` previously
 * claimed every local session for the shared bucket. Foreign member
 * `localPath` is never a match target.
 *
 * @param cwd - the local session's cwd.
 * @param markers - rows from {@link listWorkspaces} (schema-validated).
 * @param me - identity `{identity, me}` for strict memberId binding.
 */
export async function matchWorkspace(cwd, markers, { identity, me } = {}) {
  if (identity === undefined || me === undefined) return null
  const legacy = await workspaceIdFor(cwd)
  let prefixBest = null
  for (const marker of markers) {
    const own = ownMember(marker, identity, me)
    if (own === undefined) continue
    // Legacy path-hash fallback still requires our own member row — a planted
    // marker sharing the hash never claims this session for a foreign writer.
    if (marker.workspaceId === legacy) return marker
    const localPath = own.member.localPath
    if (typeof localPath !== 'string' || localPath === '') continue
    if (cwd === localPath || cwd.startsWith(`${localPath}/`)) {
      if (prefixBest === null || localPath.length > (prefixBest.__matchLength ?? 0)) {
        prefixBest = { ...marker, __matchLength: localPath.length }
      }
    }
  }
  return prefixBest
}
