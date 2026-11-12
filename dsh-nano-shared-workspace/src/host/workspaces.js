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
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { validate, SchemaReject, WORKSPACE_ID_RE } from 'dsh-remote-data-schema'

const hash16 = input => createHash('sha256').update(input).digest('hex').slice(0, 16)

/**
 * Validate one remote marker value against its storage key (P2-03). A marker
 * is co-tenant writable, so it crosses the remote→host boundary only after the
 * v1 whole-object whitelist: `{v:1, workspaceId, title, pathHint, createdAt,
 * createdBy, members:{[memberId]:{username,instance,localPath,joinedAt}}}`.
 * @returns the validated marker; `undefined` on schema reject / foreign key.
 */
function parseMarker(row, key) {
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

/** Read + validate one remote marker; `undefined` when absent or malformed. */
export async function readMarker(s3, key) {
  const row = await s3.getJson(key).catch(() => undefined)
  return parseMarker(row, key)
}

/** Read a marker together with its ETag, the token a CAS write consumes. */
async function readMarkerWithMeta(s3, key) {
  const got = await s3.getJson(key, { withMeta: true }).catch(() => undefined)
  return got === undefined ? undefined : { marker: parseMarker(got.value, key), etag: got.etag }
}

/** Bounded retries for a lost CAS race; the caller re-reads between attempts. */
const MARKER_CAS_ATTEMPTS = 4

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

/* ------------------------------------------------------------------ *
 * Local membership pin (review 9012 F1/P2 + F7).
 *
 * `member.instance` is PUBLISHED in the marker (see createWorkspace), so the
 * strict `ownMember` check `member.instance === me` is not a secret — a
 * co-tenant of the shared bucket copies our row verbatim, rewrites
 * `localPath` to an attacker-chosen directory, and our pull writes remote
 * blobs into it while our push exfiltrates from it. The member row alone
 * cannot bind a trust decision; only a LOCAL fact the remote cannot touch
 * can. At create/join we pin the `localPath` this host chose under
 * `dshHome/nsw-pins/<workspaceId>.json`. From then on the PINNED path — not
 * whatever the remote marker currently claims — is this instance's replica
 * root, and a remote `localPath` that diverges is refused (log + ignore).
 * ------------------------------------------------------------------ */

const pinHome = () => process.env.DSH_HOME ?? join(homedir(), '.dsh')
const pinPath = workspaceId => join(pinHome(), 'nsw-pins', `${workspaceId}.json`)

function pinDir() {
  const dir = join(pinHome(), 'nsw-pins')
  mkdirSync(dir, { recursive: true })
  return dir
}

/** Record the localPath this host chose for `workspaceId` (create/join). */
export function pinWorkspaceLocalPath(workspaceId, localPath) {
  if (typeof workspaceId !== 'string' || !WORKSPACE_ID_RE.test(workspaceId)) return
  const file = join(pinDir(), `${workspaceId}.json`)
  writeFileSync(file, JSON.stringify({ workspaceId, localPath, pinnedAt: new Date().toISOString() }))
}

/** Drop this host's replica pin when the workspace is deleted. */
export function unpinWorkspaceLocalPath(workspaceId) {
  if (typeof workspaceId !== 'string' || !WORKSPACE_ID_RE.test(workspaceId)) return
  rmSync(pinPath(workspaceId), { force: true })
}

/** The localPath we pinned for `workspaceId`, or undefined when never pinned. */
export function readWorkspacePin(workspaceId) {
  if (typeof workspaceId !== 'string' || !WORKSPACE_ID_RE.test(workspaceId)) return undefined
  try {
    const row = JSON.parse(readFileSync(pinPath(workspaceId), 'utf8'))
    if (row?.workspaceId !== workspaceId || typeof row?.localPath !== 'string' || row.localPath === '') return undefined
    return row.localPath
  } catch {
    return undefined
  }
}

/**
 * The localPath this instance should actually sync against for `marker`.
 * Pin wins over the remote member row: a co-tenant who repointed our
 * `localPath` is ignored (and logged), so pull/push/match can never be
 * steered to an attacker-chosen directory. Returns our own member row with
 * `localPath` replaced by the pinned value, or `undefined` when this
 * instance never joined.
 */
export function trustedMember(marker, identity, me) {
  const own = ownMember(marker, identity, me)
  if (own === undefined) return undefined
  const pin = readWorkspacePin(marker.workspaceId)
  /* No pin ⇒ we never joined this workspace locally ⇒ the member row is
   * unverifiable attacker-controlled data: it must not drive pull/push/match.
   * Re-joining (joinWorkspace) writes the pin and restores membership —
   * pre-upgrade members re-join once. */
  if (pin === undefined) return undefined
  if (own.member.localPath !== pin) {
    console.warn(`[nsw] remote localPath diverges from local pin for ${marker.workspaceId} — using pinned ${pin} (remote claims ${own.member.localPath})`)
    return { ...own, member: { ...own.member, localPath: pin } }
  }
  return own
}

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
 *
 * `requestId` (client-generated per create attempt) makes the create
 * idempotent: the workspace id is derived from creator + request id and the
 * write is `If-None-Match: *`. A retry of the same attempt re-reads and
 * returns the existing marker instead of creating a second one.
 * @returns the marker as persisted, with `deduplicated` on a replay.
 */
export async function createWorkspace(s3, ctx, identity, { name, localPath, requestId }) {
  const me = await instanceId(ctx)
  const memberId = memberKeyOf(identity, me)
  const idempotent = typeof requestId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(requestId)
  const workspaceId = idempotent ? hash16(`${memberId}:${requestId}`) : randomBytes(8).toString('hex')
  const key = `workspaces/${workspaceId}.json`
  const marker = {
    v: 1,
    workspaceId,
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
  const put = await s3.putJson(key, marker, idempotent ? { ifNoneMatch: '*' } : {})
  if (put?.conflict === true) {
    const existing = await readMarker(s3, key)
    if (existing === undefined || existing.createdBy !== memberId || existing.title !== name) {
      throw new Error('workspace id collision; retry with a fresh request')
    }
    pinWorkspaceLocalPath(workspaceId, existing.members[memberId].localPath ?? localPath)
    return { ...existing, deduplicated: true }
  }
  pinWorkspaceLocalPath(workspaceId, localPath)
  return marker
}

/**
 * Join an existing shared workspace: merge this instance's member row (with
 * its local replica path) into the remote marker. The read-modify-write is
 * guarded by the marker's ETag, so two clients joining at once cannot erase
 * each other's member row (T-B06 / F-07).
 * @returns the merged marker.
 */
export async function joinWorkspace(s3, ctx, identity, { workspaceId, localPath }) {
  // Consumer-layer boundary (P2-06 defense-in-depth; the route already checks).
  if (typeof workspaceId !== 'string' || !WORKSPACE_ID_RE.test(workspaceId)) {
    throw new SchemaReject('schema:workspaceId', 'workspaceId has a bad charset')
  }
  const key = `workspaces/${workspaceId}.json`
  const me = await instanceId(ctx)
  const memberId = memberKeyOf(identity, me)
  for (let attempt = 0; attempt < MARKER_CAS_ATTEMPTS; attempt += 1) {
    const got = await readMarkerWithMeta(s3, key)
    if (got?.marker === undefined) throw new Error('shared workspace not found')
    if (typeof got.etag !== 'string' || got.etag === '') {
      throw new Error('shared workspace has no ETag; refusing an unsafe join')
    }
    const members = { ...(got.marker.members ?? {}) }
    if (members[memberId] === undefined) {
      members[memberId] = { username: identity.username, instance: me, joinedAt: new Date().toISOString() }
    }
    // Only THIS member's row is mutated — remote members' rows pass through
    // untouched (foreign localPath is never a write target).
    members[memberId].localPath = localPath
    const marker = { ...got.marker, members }
    const put = await s3.putJson(key, marker, { ifMatch: got.etag })
    if (put?.conflict === true) continue // lost the race — re-read and recompute
    pinWorkspaceLocalPath(workspaceId, localPath)
    return marker
  }
  throw new Error('another client is updating this workspace; retry the join')
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
export async function matchWorkspace(cwd, markers, { identity, me, legacyCache } = {}) {
  if (identity === undefined || me === undefined) return null
  /* The legacy path-hash needs one `git remote get-url` subprocess per cwd.
   * A sync pass walks every local session, so the same cwd repeats; caching by
   * cwd turns N spawns into the number of distinct directories (F-28). */
  let legacy
  if (legacyCache !== undefined && legacyCache.has(cwd)) {
    legacy = legacyCache.get(cwd)
  } else {
    legacy = await workspaceIdFor(cwd)
    legacyCache?.set(cwd, legacy)
  }
  let prefixBest = null
  for (const marker of markers) {
    /* trustedMember (review 9012 F1): the remote member row is co-tenant
     * writable, so the PINNED localPath — not the remote claim — decides
     * whether `cwd` is ours. A repointed remote row cannot claim this host. */
    const own = trustedMember(marker, identity, me)
    if (own === undefined) continue
    /* Legacy path-hash fallback (F7): a pin existing (trustedMember already
     * required it) is the only proof this hash-match is ours — a planted
     * marker that hash-matches our project basename can't claim the session. */
    if (marker.workspaceId === legacy) return marker
    const localPath = own.member.localPath
    if (typeof localPath !== 'string' || localPath === '') continue
    if (cwd === localPath || cwd.startsWith(`${localPath}/`)) {
      /* Two workspaces may legitimately share one replica root (the create
       * dialog lets a user reuse a directory). Longest prefix wins; an exact
       * tie falls back to the OLDEST marker, because a session written under
       * one workspace must keep resolving to it instead of flip-flopping with
       * bucket listing order (F-27). */
      const length = localPath.length
      const bestLength = prefixBest?.__matchLength ?? -1
      const older = prefixBest === null
        || String(marker.createdAt ?? '') < String(prefixBest.createdAt ?? '')
      if (length > bestLength || (length === bestLength && older)) {
        prefixBest = { ...marker, __matchLength: length }
      }
    }
  }
  return prefixBest
}
