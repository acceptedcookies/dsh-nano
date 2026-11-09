/**
 * Session artifact sync — the up-path (local session.v4.jsonl.zstd → S3
 * chunk family) and the down-path (remote metas → decoded transcript).
 *
 * Layout (spec §2):
 *   workspaces/{workspaceId}/sessions/{sessionId}/
 *     meta.json            # the one overwritten object
 *     body/{index}.part    # append-only 64KB-aligned prefix slices
 *   claims/{sessionId}.json
 *
 * Invariants honoured here:
 *   1. body parts are never rewritten — every object is a byte prefix.
 *   2. part write precedes meta write (a meta never points at missing bytes).
 *   3. single writer: a meta whose writerId is not ours stops the push.
 *   4. claim = read-modify-write lease with a 90s TTL (no CAS in v1).
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { constants, zstdCompressSync, zstdDecompressSync } from 'node:zlib'

/** Same checksummed frame the JSONL backend appends. An unchecked frame is read as a torn record. */
const zstdFrame = bytes => zstdCompressSync(bytes, { params: { [constants.ZSTD_c_checksumFlag]: 1 } })
import { instanceId, listWorkspaces as listWorkspacesFrom, matchWorkspace } from './workspaces.js'

/**
 * Same project-directory key the JSONL backend uses (`--Users-seanz-demo-shared--`).
 * A materialized session is invisible unless it lives at this path for its cwd.
 */
export function projectKey(cwd) {
  if (cwd.length === 0) throw new Error('cannot encode an empty project path')
  let readable = ''
  let separatorRun = false
  for (let i = 0; i < cwd.length; i += 1) {
    const code = cwd.charCodeAt(i)
    const ch = String.fromCharCode(code)
    if (ch === '/' || ch === '\\' || ch === ':') {
      if (!separatorRun) readable += '-'
      separatorRun = true
    } else if (ch !== '~' && /^[A-Za-z0-9._-]$/.test(ch)) {
      readable += ch
      separatorRun = false
    } else {
      readable += `~${code.toString(16).toUpperCase().padStart(4, '0')}`
      separatorRun = false
    }
  }
  const slug = readable.replace(/^-+/, '') || 'root'
  return `--${slug.slice(0, 251)}--`
}

const CHUNK = 64 * 1024
const CLAIM_TTL_MS = 90_000

const sessionDir = home => join(home, 'sessions')

/** Decode one artifact; tolerate truncation mid-write. */
function decode(buf) {
  try {
    return zstdDecompressSync(buf).toString('utf8')
  } catch {
    return undefined
  }
}

/** First-line `session` event plus the latest `session/title` + event count. */
function summarize(buf) {
  const text = decode(buf)
  if (text === undefined) return { broken: true }
  let title = null
  let createdAt = null
  let cwd = null
  let id = null
  let events = 0
  for (const line of text.split('\n')) {
    if (line === '') continue
    events += 1
    if (events > 4000) break
    try {
      const event = JSON.parse(line)
      if (event?.type === 'session' && id === null) {
        id = typeof event.id === 'string' ? event.id : null
        cwd = typeof event.cwd === 'string' ? event.cwd : null
        createdAt = typeof event.createdAt === 'number' ? event.createdAt : null
      }
      if (event?.type === 'session/title' && typeof event?.data?.title === 'string') {
        title = event.data.title
      }
    } catch { /* torn line: ignore */ }
  }
  return { id, title, cwd, createdAt, events }
}

/**
 * Every session artifact under `$DSH_HOME/sessions/`, newest first.
 * @returns `[{sessionId, projectDir, filePath, sizeBytes, mtimeMs}]`
 */
export function listLocalSessions(dshHome) {
  const root = sessionDir(dshHome)
  const out = []
  let projects = []
  try { projects = readdirSync(root, { withFileTypes: true }) } catch { return out }
  for (const project of projects) {
    if (!project.isDirectory()) continue
    let sessions = []
    try { sessions = readdirSync(join(root, project.name), { withFileTypes: true }) } catch { continue }
    for (const dir of sessions) {
      if (!dir.isDirectory() || !dir.name.startsWith('session-')) continue
      const filePath = join(root, project.name, dir.name, 'session.v4.jsonl.zstd')
      try {
        const stat = statSync(filePath)
        out.push({
          sessionId: dir.name,
          projectDir: project.name,
          filePath,
          sizeBytes: stat.size,
          mtimeMs: stat.mtimeMs,
        })
      } catch { /* vanished */ }
    }
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs)
}

/**
 * The write lease. A live claim held by another writer stops the push;
 * an expired or absent claim is ours to take. No CAS in v1 — the
 * read-check-write window is the documented best-effort path.
 * @returns `{acquired: boolean, heartbeatRev, holder}`
 */
export async function acquireClaim(s3, ctx, sessionId, writerId, heartbeatRev) {
  const key = `claims/${sessionId}.json`
  const existing = await s3.getJson(key).catch(() => undefined)
  const now = Date.now()
  if (existing !== undefined && existing.writerId !== writerId
      && typeof existing.expiresAt === 'number' && existing.expiresAt > now) {
    return { acquired: false, holder: existing.writerId, heartbeatRev: existing.heartbeatRev ?? 0 }
  }
  await s3.putJson(key, {
    writerId,
    acquiredAt: new Date(now).toISOString(),
    expiresAt: now + CLAIM_TTL_MS,
    heartbeatRev,
  })
  return { acquired: true, heartbeatRev }
}

/**
 * Push one session's new bytes. Returns a small outcome row the caller
 * surfaces in logs/routes; nothing is thrown for business-level skips.
 * @param markers - rows from `listWorkspaces` (fetched once per sync pass).
 * @param state - mutable `{bySession: Map}` the caller persists between calls.
 */
export async function pushSession(s3, ctx, identity, local, markers, state) {
  const me = await instanceId(ctx)
  const writerId = `${identity.username}@${me.slice(0, 8)}`
  const buf = readFileSync(local.filePath)
  const head = summarize(buf)
  if (head.cwd === null) return { sessionId: local.sessionId, outcome: 'skip:unparsable' }

  // Sessions only sync when the session's cwd sits inside a shared
  // workspace's local replica path (member.localPath), with the legacy
  // path-hash id as a fallback for pre-localPath markers.
  const marker = await matchWorkspace(head.cwd, markers)
  if (marker === null) return { sessionId: local.sessionId, outcome: 'skip:not-shared' }
  const workspaceId = marker.workspaceId

  const metaKey = `workspaces/${workspaceId}/sessions/${local.sessionId}/meta.json`
  const remote = await s3.getJson(metaKey).catch(() => undefined)
  if (remote !== undefined && remote.writerId !== writerId) {
    return { sessionId: local.sessionId, outcome: 'skip:foreign-writer' }
  }

  const tracked = state.bySession.get(local.sessionId) ?? { heartbeatRev: 0, pushedBytes: 0 }
  const claim = await acquireClaim(s3, ctx, local.sessionId, writerId, tracked.heartbeatRev + 1)
  if (!claim.acquired) {
    return { sessionId: local.sessionId, outcome: `skip:lease-held-by-${claim.holder}` }
  }
  tracked.heartbeatRev = claim.heartbeatRev

  const committed = remote?.committedBytes ?? 0
  let written = 0
  if (buf.length > committed) {
    for (let offset = committed; offset < buf.length; offset += CHUNK) {
      const index = Math.floor(offset / CHUNK)
      const slice = buf.subarray(offset, Math.min(offset + CHUNK, buf.length))
      await s3.putBytes(`workspaces/${workspaceId}/sessions/${local.sessionId}/body/${index}.part`, slice)
      written += slice.length
    }
  }

  const rev = (remote?.rev ?? 0) + 1
  await s3.putJson(metaKey, {
    v: 1,
    sessionId: local.sessionId,
    writerId,
    writerName: identity.username,
    rev,
    formatVersion: 4,
    committedBytes: buf.length,
    uncompressedSeqBytes: 0,
    eventCount: head.events ?? 0,
    title: head.title ?? '',
    projectDir: local.projectDir,
    cwd: head.cwd,
    createdAt: remote?.createdAt ?? (head.createdAt !== null ? new Date(head.createdAt).toISOString() : new Date().toISOString()),
    mtime: new Date(local.mtimeMs).toISOString(),
    deleted: false,
    attachmentRefs: [],
  })
  tracked.pushedBytes = buf.length
  state.bySession.set(local.sessionId, tracked)
  return {
    sessionId: local.sessionId,
    outcome: written > 0 ? `pushed:${written}b` : 'fresh',
    workspaceId,
  }
}

/** Push every local session whose cwd maps to a claimed workspace marker. */
export async function syncAll(s3, ctx, identity, dshHome, state) {
  const markers = await listWorkspacesFrom(s3)
  const results = []
  for (const local of listLocalSessions(dshHome)) {
    try {
      results.push(await pushSession(s3, ctx, identity, local, markers, state))
    } catch (error) {
      results.push({ sessionId: local.sessionId, outcome: `error:${error instanceof Error ? error.message : String(error)}` })
    }
  }
  return results
}

/**
 * Remote session metas across every workspace marker.
 * @returns `[{workspaceId, ...meta}]`
 */
export async function listRemoteSessions(s3) {
  // With a delimiter, `workspaces/` yields session-family dirs as prefixes
  // (`workspaces/{id}/`), each holding `sessions/{sessionId}/` subdirs.
  const { prefixes } = await s3.list('workspaces/')
  const out = []
  for (const wsPrefix of prefixes) {
    const workspaceId = wsPrefix.replace(/^workspaces\//, '').replace(/\/$/, '')
    const inner = await s3.list(`workspaces/${workspaceId}/sessions/`).catch(() => ({ prefixes: [] }))
    for (const sessionPrefix of inner.prefixes ?? []) {
      const sessionId = sessionPrefix.replace(/\/$/, '').split('/').pop()
      const meta = await s3.getJson(`workspaces/${workspaceId}/sessions/${sessionId}/meta.json`).catch(() => undefined)
      if (meta !== undefined) out.push({ workspaceId, ...meta })
    }
  }
  return out
}

/**
 * Download and decode one remote session transcript.
 * Parts are concatenated by index up to meta.committedBytes, then decoded.
 * @returns `{meta, events}` — `events` is the raw parsed JSONL rows.
 */
export async function fetchTranscript(s3, workspaceId, sessionId) {
  const meta = await s3.getJson(`workspaces/${workspaceId}/sessions/${sessionId}/meta.json`)
  if (meta === undefined) throw new Error('no such session')
  const parts = Math.ceil((meta.committedBytes ?? 0) / CHUNK)
  const buffers = []
  for (let index = 0; index < parts; index += 1) {
    const part = await s3.getBytes(`workspaces/${workspaceId}/sessions/${sessionId}/body/${index}.part`)
    if (part === undefined) throw new Error(`missing body part ${index}`)
    buffers.push(part)
  }
  const joined = Buffer.concat(buffers)
  const text = decode(joined)
  if (text === undefined) throw new Error('artifact failed to decode')
  const events = []
  for (const line of text.split('\n')) {
    if (line === '') continue
    try { events.push(JSON.parse(line)) } catch { /* torn line */ }
  }
  return { meta, events }
}

/**
 * Land a remote session on this machine so the Host session index can open it.
 * The stored cwd is the other replica's path; it is rewritten to `localPath`
 * and the header is its own zstd frame — the JSONL backend skips a log whose
 * first frame is not exactly that one line, or whose directory doesn't match cwd.
 * @returns `{sessionId, cwd, path}`
 */
export async function materializeSession(s3, dshHome, { workspaceId, sessionId, localPath }) {
  const meta = await s3.getJson(`workspaces/${workspaceId}/sessions/${sessionId}/meta.json`)
  if (meta === undefined) throw new Error('no such session')
  const parts = Math.ceil((meta.committedBytes ?? 0) / CHUNK)
  const buffers = []
  for (let index = 0; index < parts; index += 1) {
    const part = await s3.getBytes(`workspaces/${workspaceId}/sessions/${sessionId}/body/${index}.part`)
    if (part === undefined) throw new Error(`missing body part ${index}`)
    buffers.push(part)
  }
  const text = decode(Buffer.concat(buffers))
  if (text === undefined) throw new Error('artifact failed to decode')
  const newline = text.indexOf('\n')
  if (newline < 0) throw new Error('remote artifact has no session header')
  const header = JSON.parse(text.slice(0, newline))
  if (header?.type !== 'session' || header.id !== sessionId) throw new Error('remote artifact header does not match the session')
  header.cwd = localPath
  const headerFrame = zstdFrame(Buffer.from(`${JSON.stringify(header)}\n`))
  const rest = text.slice(newline + 1)
  const body = rest === '' ? Buffer.alloc(0) : zstdFrame(Buffer.from(rest.endsWith('\n') ? rest : `${rest}\n`))
  const dir = join(dshHome, 'sessions', projectKey(localPath), sessionId)
  await mkdir(dir, { recursive: true })
  const path = join(dir, 'session.v4.jsonl.zstd')
  await writeFile(path, Buffer.concat([headerFrame, body]))
  return { sessionId, cwd: localPath, path }
}
