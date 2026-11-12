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
 *   4. claim = read-modify-write lease with a 90s TTL, guarded by ETag CAS
 *      (P2-04): every acquire/renew write carries the etag it was computed
 *      from (or If-None-Match:* for create) — a 412 conflict means another
 *      writer raced us and we must NOT silently merge writes.
 */

import { lstat, mkdir, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import { constants, zstdCompress, zstdDecompress } from 'node:zlib'
import {
  validate, SchemaReject,
  SESSION_ID_RE, WORKSPACE_ID_RE, PART_BYTES,
} from 'dsh-remote-data-schema'

/* Async zstd: the sync forms block the host event loop while a sync pass
 * decodes every local artifact — a stall Caddy reports to clients as a 502
 * (upstream connection reset). Promisified zlib runs on the worker pool and
 * never starves interactive routes. */
const zstdCompressAsync = promisify(zstdCompress)
const zstdDecompressAsync = promisify(zstdDecompress)
const zstdFrame = bytes => zstdCompressAsync(bytes, { params: { [constants.ZSTD_c_checksumFlag]: 1 } })
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

/**
 * Decode one artifact; tolerate truncation mid-write.
 *
 * A DSH session log is a CONCATENATION of checksummed zstd frames (one per
 * append). `zstdDecompressSync` yields every frame on Node >= 24.22 but only
 * the FIRST frame on the Node bundled with Electron 44 (24.21) — the desktop
 * host would therefore read a 21-event session as its 1-line header and
 * materialize a truncated copy (F-22). Splitting on the frame magic and
 * decoding each frame keeps both runtimes identical.
 */
const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

/** Byte offsets of every zstd frame in `buf`. `indexOf` uses the runtime's
 *  native memchr — a per-byte `buf.compare` loop costs ~1000x and was itself a
 *  measurable stall on multi-MB artifacts. */
function frameOffsets(buf) {
  const offsets = []
  for (let i = buf.indexOf(ZSTD_MAGIC, 0); i !== -1; i = buf.indexOf(ZSTD_MAGIC, i + 1)) {
    offsets.push(i)
  }
  return offsets
}

async function decode(buf) {
  try {
    const offsets = frameOffsets(buf)
    if (offsets.length <= 1) return (await zstdDecompressAsync(buf)).toString('utf8')
    const texts = await Promise.all(offsets.map((start, i) => {
      const end = i + 1 < offsets.length ? offsets[i + 1] : buf.length
      return zstdDecompressAsync(buf.subarray(start, end)).then(part => part.toString('utf8'))
    }))
    return texts.join('')
  } catch {
    return undefined
  }
}

/**
 * Decode ONLY the first zstd frame and read its `session` header's cwd.
 * The cheap membership probe: a session whose cwd never entered a shared
 * workspace is rejected before the full multi-frame decode that `summarize`
 * needs — on a large corpus that early-out is the difference between a
 * first-pass sweep costing stat reads and one costing GBs of decompress.
 */
export async function peekCwd(buf) {
  const first = buf.indexOf(ZSTD_MAGIC, 0)
  if (first === -1) return null
  const second = buf.indexOf(ZSTD_MAGIC, first + 1)
  const frame = second === -1 ? buf.subarray(first) : buf.subarray(first, second)
  try {
    const text = (await zstdDecompressAsync(frame)).toString('utf8')
    const line = text.slice(0, text.indexOf('\n'))
    const event = JSON.parse(line)
    return event?.type === 'session' && typeof event.cwd === 'string' ? event.cwd : null
  } catch { return null }
}

/** First-line `session` event plus the latest `session/title` + event count. */
async function summarize(buf) {
  const text = await decode(buf)
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
export async function listLocalSessions(dshHome) {
  const root = sessionDir(dshHome)
  const out = []
  let projects = []
  try { projects = await readdir(root, { withFileTypes: true }) } catch { return out }
  for (const project of projects) {
    if (!project.isDirectory()) continue
    let sessions = []
    try { sessions = await readdir(join(root, project.name), { withFileTypes: true }) } catch { continue }
    for (const dir of sessions) {
      if (!dir.isDirectory() || !dir.name.startsWith('session-')) continue
      const filePath = join(root, project.name, dir.name, 'session.v4.jsonl.zstd')
      try {
        const info = await stat(filePath)
        out.push({
          sessionId: dir.name,
          projectDir: project.name,
          filePath,
          sizeBytes: info.size,
          mtimeMs: info.mtimeMs,
        })
      } catch { /* vanished */ }
    }
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs)
}

/**
 * The literal claim shape written by acquire/renew below; a remote object
 * outside this whitelist is co-tenant corruption, not a lease.
 */
const CLAIM_KEYS = new Set(['writerId', 'acquiredAt', 'expiresAt', 'heartbeatRev'])

/**
 * A claim's expiry may not exceed one TTL beyond now (F-24). Without this a
 * co-tenant could write `expiresAt: now + 400 days` and make the session
 * permanently read-only for every legitimate writer; the same shape appears
 * from a badly skewed clock. A claim past the bound is treated as malformed,
 * which the CAS loop already replaces atomically.
 */
function claimExpiryIsSane(expiresAt) {
  return typeof expiresAt === 'number' && Number.isFinite(expiresAt)
    && expiresAt <= Date.now() + CLAIM_TTL_MS * 2
}

function validClaim(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return false
  for (const key of Object.keys(obj)) if (!CLAIM_KEYS.has(key)) return false
  if (typeof obj.writerId !== 'string' || obj.writerId === '') return false
  if (typeof obj.acquiredAt !== 'string' || Number.isNaN(Date.parse(obj.acquiredAt))) return false
  if (!claimExpiryIsSane(obj.expiresAt)) return false
  if (obj.heartbeatRev !== undefined && !Number.isInteger(obj.heartbeatRev)) return false
  return true
}

/** One conditional write; `{conflict}`/throw propagates to the CAS loop. */
async function casPut(s3, key, value, etag) {
  return etag === undefined
    ? s3.putJson(key, value, { ifNoneMatch: '*' })
    : s3.putJson(key, value, { ifMatch: etag })
}

/** CAS retry bound: a losing race re-reads and recomputes instead of mixing. */
const CAS_ATTEMPTS = 4

/**
 * The write lease. A live claim held by another writer stops the push;
 * an expired or absent claim is ours to take.
 *
 * P2-04 CAS: the read-modify-write is performed under the object's ETag —
 * `putJson(key, value, {ifMatch: etag})`, or `{ifNoneMatch:'*'}` when the
 * claim does not exist. On 412 (`{conflict:true}`) the loop re-reads and
 * recomputes; an out-of-retries conflict surfaces as not-acquired rather
 * than overwriting a racing writer's lease.
 * @returns `{acquired: boolean, heartbeatRev, holder}`
 */
export async function acquireClaim(s3, ctx, sessionId, writerId, heartbeatRev) {
  if (!SESSION_ID_RE.test(sessionId)) throw new SchemaReject('schema:sessionId', 'claim sessionId has a bad charset')
  const key = `claims/${sessionId}.json`
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const got = await s3.getJson(key, { withMeta: true }).catch(() => undefined)
    const existing = validClaim(got?.value) ? got.value : undefined
    // CAS precondition is the etag of whatever we read — even a malformed
    // claim is only replaced atomically (a concurrent write still 412s).
    const etag = got?.value === undefined ? undefined : got.etag
    const now = Date.now()
    if (existing !== undefined && existing.writerId !== writerId && existing.expiresAt > now) {
      return { acquired: false, holder: existing.writerId, heartbeatRev: existing.heartbeatRev ?? 0 }
    }
    /* Already ours with plenty of lease left: skip the write. A sync pass
     * touches every shared session, and each avoided PUT saves one ~1.1s
     * round trip through the proxy (F-28). */
    if (existing !== undefined && existing.writerId === writerId
        && existing.expiresAt > now + CLAIM_TTL_MS / 2) {
      return { acquired: true, heartbeatRev: existing.heartbeatRev ?? heartbeatRev, expiresAt: existing.expiresAt, reused: true }
    }
    const claim = {
      writerId,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: now + CLAIM_TTL_MS,
      heartbeatRev,
    }
    const put = await casPut(s3, key, claim, etag)
    if (put?.conflict === true) continue // lost the race — re-read and recompute
    return { acquired: true, heartbeatRev, expiresAt: claim.expiresAt }
  }
  // All attempts raced: refuse rather than overwrite a concurrent writer.
  return { acquired: false, holder: null, heartbeatRev }
}

/**
 * Extend a lease we already hold — CAS (P2-04). The renewal write carries
 * the etag of the claim it extends: a concurrent change between read and
 * write is a conflict, never a silent mixed write. A foreign, malformed, or
 * expired claim is never renewed or resurrected.
 */
export async function renewClaim(s3, sessionId, writerId) {
  if (!SESSION_ID_RE.test(sessionId)) throw new SchemaReject('schema:sessionId', 'claim sessionId has a bad charset')
  const key = `claims/${sessionId}.json`
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const got = await s3.getJson(key, { withMeta: true }).catch(() => undefined)
    const existing = validClaim(got?.value) ? got.value : undefined
    const now = Date.now()
    if (existing === undefined || existing.writerId !== writerId || !(existing.expiresAt > now)) {
      return { renewed: false, holder: existing?.writerId ?? null, expiresAt: existing?.expiresAt ?? null }
    }
    const expiresAt = now + CLAIM_TTL_MS
    const put = await casPut(s3, key, {
      ...existing,
      expiresAt,
      heartbeatRev: (existing.heartbeatRev ?? 0) + 1,
    }, got.etag)
    if (put?.conflict === true) continue
    return { renewed: true, holder: writerId, expiresAt }
  }
  return { renewed: false, holder: writerId, expiresAt: null }
}

/**
 * Is `sessionId` claimed live by a writer other than `myWriterId`?
 * A live foreign claim means that member is actively running the session —
 * materializing or binding it on this host would hand our agent a copy of a
 * log another host is concurrently writing, and a second member writing into
 * the same canonical session is exactly what the lease is meant to forbid.
 * @returns the foreign `{writerId, expiresAt}` when the session is owned by
 *          someone else right now; `undefined` when free (absent, expired,
 *          malformed, or already ours).
 */
export async function foreignActiveClaim(s3, sessionId, myWriterId) {
  if (!SESSION_ID_RE.test(sessionId)) return undefined
  const got = await s3.getJson(`claims/${sessionId}.json`).catch(() => undefined)
  if (!validClaim(got)) return undefined
  if (got.writerId === myWriterId) return undefined
  if (!(got.expiresAt > Date.now())) return undefined
  return { writerId: got.writerId, expiresAt: got.expiresAt }
}

/**
 * Push one session's new bytes. Returns a small outcome row the caller
 * surfaces in logs/routes; nothing is thrown for business-level skips.
 * @param markers - rows from `listWorkspaces` (fetched once per sync pass).
 * @param state - mutable `{bySession: Map}` the caller persists between calls.
 */
export async function pushSession(s3, ctx, identity, local, markers, state, legacyCache) {
  // Consumer-layer charset (P2-06): a sessionId that cannot form a safe S3
  // key never reaches one.
  if (!SESSION_ID_RE.test(local.sessionId)) return { sessionId: local.sessionId, outcome: 'skip:schema:sessionId' }
  /* Cheapest possible answer first: the stat fingerprint from the directory
   * scan. A session whose bytes and mtime are unchanged since the last pass
   * that reached the bucket has nothing to send, so skip the file read, the
   * zstd decode, the marker match and every S3 call (F-28). */
  const seen = state.bySession.get(local.sessionId)
  if (seen !== undefined && seen.mtimeMs === local.mtimeMs && seen.size === local.sizeBytes
      && typeof seen.workspaceId === 'string') {
    return { sessionId: local.sessionId, workspaceId: seen.workspaceId, outcome: 'unchanged' }
  }
  const me = await instanceId(ctx)
  const writerId = `${identity.username}@${me.slice(0, 8)}`
  const buf = await readFile(local.filePath)
  /* Cheap membership probe first: decode only the header frame. A session
   * whose cwd is not under our member row is fingerprinted 'not-shared' and
   * the next stat-skip avoids even this read. The expensive multi-frame
   * `summarize` below only runs for the shared minority. */
  const cwd = await peekCwd(buf)
  if (cwd === null) return { sessionId: local.sessionId, outcome: 'skip:unparsable' }

  // Sessions only sync when the session's cwd sits inside THIS member's own
  // local replica path — strict memberId binding (P2-03, audit §4.9); the
  // legacy path-hash fallback is gated on our own member row too.
  const marker = await matchWorkspace(cwd, markers, { identity, me, legacyCache })
  if (marker === null) return { sessionId: local.sessionId, outcome: 'skip:not-shared' }
  const workspaceId = marker.workspaceId
  const head = await summarize(buf)
  if (head.cwd === null) return { sessionId: local.sessionId, outcome: 'skip:unparsable' }

  const metaKey = `workspaces/${workspaceId}/sessions/${local.sessionId}/meta.json`
  const remote = await s3.getJson(metaKey).catch(() => undefined)
  if (remote !== undefined) {
    // Remote meta crosses the trust boundary only after the v1 whitelist
    // (P2-04): a poisoned meta is skipped, never read as a writer/byte hint.
    try {
      validate('session-meta', remote)
    } catch (error) {
      if (error instanceof SchemaReject) return { sessionId: local.sessionId, outcome: `skip:${error.reason}` }
      throw error
    }
    if (remote.sessionId !== local.sessionId) {
      return { sessionId: local.sessionId, outcome: 'skip:schema:sessionId' }
    }
    if (remote.writerId !== writerId) {
      return { sessionId: local.sessionId, outcome: 'skip:foreign-writer' }
    }
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
    /* Write WHOLE parts from each part boundary (index*CHUNK), not from the
     * committed offset. Writing `buf.subarray(committed, …)` into part
     * floor(committed/CHUNK) drops that part's leading bytes — and a
     * co-tenant can plant a meta whose committedBytes is deliberately
     * mid-part (writerId is self-asserted, so the foreign-writer gate can't
     * catch it) to corrupt the boundary part and permanently tear the body
     * (review 9012 P5). Rewriting the boundary part whole makes the append
     * self-healing for ANY committed value, spoofed or not. */
    for (let index = Math.floor(committed / CHUNK); index * CHUNK < buf.length; index += 1) {
      const slice = buf.subarray(index * CHUNK, Math.min((index + 1) * CHUNK, buf.length))
      await s3.putBytes(`workspaces/${workspaceId}/sessions/${local.sessionId}/body/${index}.part`, slice)
      written += slice.length
    }
  }

  /* The local artifact is an append-only log, so an unchanged byte length
   * means unchanged content. Rewriting meta anyway bumped `rev` on every
   * background sync and cost one proxy round trip per shared session for
   * nothing (F-28). */
  const unchanged = remote !== undefined
    && buf.length === remote.committedBytes
    && (head.events ?? 0) === remote.eventCount
    && (head.title ?? '') === (remote.title ?? '')
  if (unchanged) {
    tracked.pushedBytes = buf.length
    tracked.mtimeMs = local.mtimeMs
    tracked.size = buf.length
    tracked.workspaceId = workspaceId
    state.bySession.set(local.sessionId, tracked)
    return { sessionId: local.sessionId, workspaceId, outcome: 'unchanged' }
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
  tracked.mtimeMs = local.mtimeMs
  tracked.size = buf.length
  tracked.workspaceId = workspaceId
  state.bySession.set(local.sessionId, tracked)
  return {
    sessionId: local.sessionId,
    outcome: written > 0 ? `pushed:${written}b` : 'fresh',
    workspaceId,
  }
}

/** Bounded session-push pool: each push is a chain of proxy round trips, so
 *  running them serially costs N×latency even when the payloads are
 *  independent. 4 keeps us under the default 6-socket keep-alive pool. */
const PUSH_CONCURRENCY = 4

/** Push every local session whose cwd maps to a claimed workspace marker. */
export async function syncAll(s3, ctx, identity, dshHome, state, knownMarkers) {
  const markers = knownMarkers ?? await listWorkspacesFrom(s3)
  const results = []
  // One git lookup per distinct cwd for the whole pass (F-28).
  const legacyCache = new Map()
  const locals = await listLocalSessions(dshHome)
  let cursor = 0
  const worker = async () => {
    while (cursor < locals.length) {
      const index = cursor
      cursor += 1
      const local = locals[index]
      try {
        results[index] = await pushSession(s3, ctx, identity, local, markers, state, legacyCache)
      } catch (error) {
        results[index] = { sessionId: local.sessionId, outcome: `error:${error instanceof Error ? error.message : String(error)}` }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PUSH_CONCURRENCY, locals.length) }, worker))
  return results
}

/**
 * Remote session metas across every workspace marker.
 * @returns `[{workspaceId, ...meta}]`
 */
const SESSION_LIST_CONCURRENCY = 8

export async function listRemoteSessions(s3) {
  // With a delimiter, `workspaces/` yields session-family dirs as prefixes
  // (`workspaces/{id}/`), each holding `sessions/{sessionId}/` subdirs.
  const { prefixes } = await s3.list('workspaces/')
  const out = []
  /* Each session's meta is one remote GET; fetch them a bounded few at a
   * time so the listing scales with count, not count×latency. */
  const tasks = []
  for (const wsPrefix of prefixes) {
    const workspaceId = wsPrefix.replace(/^workspaces\//, '').replace(/\/$/, '')
    if (!WORKSPACE_ID_RE.test(workspaceId)) continue
    const inner = await s3.list(`workspaces/${workspaceId}/sessions/`).catch(() => ({ prefixes: [] }))
    for (const sessionPrefix of inner.prefixes ?? []) {
      const sessionId = sessionPrefix.replace(/\/$/, '').split('/').pop()
      if (!SESSION_ID_RE.test(sessionId)) continue
      tasks.push(async () => {
        const meta = await s3.getJson(`workspaces/${workspaceId}/sessions/${sessionId}/meta.json`).catch(() => undefined)
        if (meta === undefined) return
        try {
          validate('session-meta', meta)
        } catch (error) {
          if (error instanceof SchemaReject) return
          throw error
        }
        if (meta.sessionId !== sessionId) return // key↔object binding
        out.push({ workspaceId, ...meta })
      })
    }
  }
  let cursor = 0
  const worker = async () => {
    while (cursor < tasks.length) {
      const task = tasks[cursor]
      cursor += 1
      await task()
    }
  }
  await Promise.all(Array.from({ length: Math.min(SESSION_LIST_CONCURRENCY, tasks.length) }, worker))
  return out
}

/**
 * Read + validate the remote meta (P2-04): the whole-object whitelist,
 * `committedBytes ≤ MAX_COMMITTED_BYTES`, key↔object sessionId binding.
 * @returns the validated meta; `undefined` when absent.
 */
async function readSessionMeta(s3, workspaceId, sessionId) {
  const meta = await s3.getJson(`workspaces/${workspaceId}/sessions/${sessionId}/meta.json`)
  if (meta === undefined) return undefined
  validate('session-meta', meta)
  if (meta.sessionId !== sessionId) {
    throw new SchemaReject('schema:sessionId', 'meta sessionId does not match its key')
  }
  return meta
}

/**
 * Read the body parts a validated meta points at. The schema-derived part
 * count is `ceil(committedBytes / PART_BYTES)` (parts-count limit) and every
 * fetched part must be `≤ PART_BYTES` — a co-tenant cannot inflate a part
 * into an unbounded fetch/decompress (audit §: remote-meta-unbounded-fetch).
 */
const PART_CONCURRENCY = 4

async function readBodyParts(s3, workspaceId, sessionId, meta) {
  const parts = Math.ceil(meta.committedBytes / CHUNK)
  const buffers = new Array(parts)
  /* Parts are independent prefix slices — fetch them a few at a time so a
   * multi-part transcript costs ~parts/4 round trips, not parts. */
  let cursor = 0
  const worker = async () => {
    while (cursor < parts) {
      const index = cursor
      cursor += 1
      const part = await s3.getBytes(`workspaces/${workspaceId}/sessions/${sessionId}/body/${index}.part`)
      if (part === undefined) throw new Error(`missing body part ${index}`)
      if (part.length > PART_BYTES) {
        throw new SchemaReject('schema:parts', `body part ${index} exceeds ${PART_BYTES} bytes`)
      }
      buffers[index] = part
    }
  }
  await Promise.all(Array.from({ length: Math.min(PART_CONCURRENCY, parts) }, worker))
  return Buffer.concat(buffers)
}

/**
 * Download and decode one remote session transcript.
 * Parts are concatenated by index up to meta.committedBytes, then decoded.
 * @returns `{meta, events}` — `events` is the raw parsed JSONL rows.
 */
export async function fetchTranscript(s3, workspaceId, sessionId) {
  if (!WORKSPACE_ID_RE.test(workspaceId)) throw new SchemaReject('schema:workspaceId', 'workspaceId has a bad charset')
  if (!SESSION_ID_RE.test(sessionId)) throw new SchemaReject('schema:sessionId', 'sessionId has a bad charset')
  const meta = await readSessionMeta(s3, workspaceId, sessionId)
  if (meta === undefined) throw new Error('no such session')
  const text = await decode(await readBodyParts(s3, workspaceId, sessionId, meta))
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
export async function materializeSession(s3, dshHome, { workspaceId, sessionId, localPath, writerId }) {
  // Consumer-layer boundary (P2-06 second layer; the route checks too):
  // a `..`/`/`-carrying sessionId can never reach the S3 key or the fs path.
  if (!WORKSPACE_ID_RE.test(workspaceId)) throw new SchemaReject('schema:workspaceId', 'workspaceId has a bad charset')
  if (!SESSION_ID_RE.test(sessionId)) throw new SchemaReject('schema:sessionId', 'sessionId has a bad charset')
  if (typeof localPath !== 'string' || !isAbsolute(localPath) || resolve(localPath) !== localPath) {
    throw new SchemaReject('schema:localPath', 'localPath must be an absolute normalized path')
  }
  /* Active-session write fence: while another member holds the live claim the
   * canonical session is being written by them. Materializing it here would
   * plant a divergent copy the local agent could run — exactly the "echo wrote
   * into sean's live session" failure. Refuse; the holder must finish or the
   * lease must expire first. */
  const owned = writerId === undefined ? undefined : await foreignActiveClaim(s3, sessionId, writerId)
  if (owned !== undefined) {
    const error = new Error(`session is held by ${owned.writerId} until ${new Date(owned.expiresAt).toISOString()}`)
    error.code = 'session-busy'
    error.holder = owned.writerId
    error.holderExpiresAt = owned.expiresAt
    throw error
  }
  const meta = await readSessionMeta(s3, workspaceId, sessionId)
  if (meta === undefined) throw new Error('no such session')
  const text = await decode(await readBodyParts(s3, workspaceId, sessionId, meta))
  if (text === undefined) throw new Error('artifact failed to decode')
  const newline = text.indexOf('\n')
  if (newline < 0) throw new Error('remote artifact has no session header')
  const header = JSON.parse(text.slice(0, newline))
  if (header?.type !== 'session' || header.id !== sessionId) throw new Error('remote artifact header does not match the session')
  header.cwd = localPath
  const headerFrame = await zstdFrame(Buffer.from(`${JSON.stringify(header)}\n`))
  const rest = text.slice(newline + 1)
  const body = rest === '' ? Buffer.alloc(0) : await zstdFrame(Buffer.from(rest.endsWith('\n') ? rest : `${rest}\n`))
  // realpath fence (P2-06): the unpack target must stay inside
  // `dshHome/sessions/<projectKey>/<sessionId>` — no lexical or symlink
  // escape, and a pre-existing symlinked session dir is never written into.
  const sessionsRoot = resolve(dshHome, 'sessions')
  const projectRoot = join(sessionsRoot, projectKey(localPath))
  const dir = join(projectRoot, sessionId)
  await mkdir(dir, { recursive: true })
  let realDir
  let realRoot
  try {
    ;[realDir, realRoot] = await Promise.all([realpath(dir), realpath(sessionsRoot)])
  } catch { throw new Error('materialize target failed the realpath fence') }
  if (!(realDir === realRoot || realDir.startsWith(realRoot + sep))
      || (await lstat(dir)).isSymbolicLink()) {
    throw new Error('materialize target escaped the session tree')
  }
  const path = join(dir, 'session.v4.jsonl.zstd')
  try {
    if ((await lstat(path)).isSymbolicLink()) throw new Error('materialize target is a symlink')
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await writeFile(path, Buffer.concat([headerFrame, body]))
  /* Durable pull-fingerprint: survives a host restart so the next sync pass
   * sees "already at this rev" instead of re-downloading the whole artifact
   * (an in-memory map alone re-materialized every session after a restart). */
  const revKey = `${meta.rev ?? 0}:${meta.committedBytes ?? 0}`
  await writeFile(join(dir, '.nsw-meta.json'), JSON.stringify({
    v: 1, workspaceId, sessionId, revKey, pulledAt: new Date().toISOString(),
  })).catch(() => {})
  return { sessionId, cwd: localPath, path, revKey }
}

/**
 * The persisted pull-fingerprint for a previously materialized session;
 * `undefined` when the artifact (or its receipt) was never written.
 */
export async function readPulledRev(dshHome, localPath, sessionId) {
  try {
    const row = JSON.parse(await readFile(join(dshHome, 'sessions', projectKey(localPath), sessionId, '.nsw-meta.json'), 'utf8'))
    return typeof row?.revKey === 'string' ? row.revKey : undefined
  } catch { return undefined }
}
