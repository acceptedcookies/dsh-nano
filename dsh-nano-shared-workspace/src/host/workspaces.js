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

const hash16 = input => createHash('sha256').update(input).digest('hex').slice(0, 16)

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
  const key = `workspaces/${workspaceId}.json`
  const existing = await s3.getJson(key)
  if (existing === undefined) throw new Error('shared workspace not found')
  const me = await instanceId(ctx)
  const memberId = memberKeyOf(identity, me)
  const members = { ...(existing.members ?? {}) }
  if (members[memberId] === undefined) {
    members[memberId] = { username: identity.username, instance: me, joinedAt: new Date().toISOString() }
  }
  members[memberId].localPath = localPath
  const marker = { ...existing, members }
  await s3.putJson(key, marker)
  return marker
}

/** All workspace markers under `workspaces/` — single listing page for v1. */
export async function listWorkspaces(s3) {
  const { keys } = await s3.list('workspaces/')
  const rows = []
  for (const key of keys) {
    if (!key.endsWith('.json')) continue
    const row = await s3.getJson(key).catch(() => undefined)
    if (row !== undefined && typeof row === 'object' && typeof row.workspaceId === 'string') rows.push(row)
  }
  return rows
}

/**
 * The marker whose members' `localPath` contains `cwd` (self or a child).
 * Falls back to the legacy path-hash id so markers written before the
 * localPath field existed still match.
 * @param markers - rows from {@link listWorkspaces}.
 */
export async function matchWorkspace(cwd, markers) {
  const legacy = await workspaceIdFor(cwd)
  let prefixBest = null
  for (const marker of markers) {
    if (marker.workspaceId === legacy) return marker
    for (const member of Object.values(marker.members ?? {})) {
      const localPath = member?.localPath
      if (typeof localPath !== 'string' || localPath === '') continue
      if (cwd === localPath || cwd.startsWith(`${localPath}/`)) {
        if (prefixBest === null || localPath.length > (prefixBest.__matchLength ?? 0)) {
          prefixBest = { ...marker, __matchLength: localPath.length }
        }
      }
    }
  }
  return prefixBest
}
