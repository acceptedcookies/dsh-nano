/** HTTP routes the client half calls: settings read/write and a status probe. */

import { mkdir, opendir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { clearIdentity, readIdentity, writeIdentity } from './credentials.js'
import { createS3 } from './s3.js'
import { createWorkspace, instanceId, joinWorkspace, listWorkspaces, ownMember, readMarker, trustedMember, unpinWorkspaceLocalPath } from './workspaces.js'
import { acquireClaim, fetchTranscript, foreignActiveClaim, listRemoteSessions, materializeSession, readPulledRev, renewClaim, syncAll } from './session-io.js'
import { purgeWorkspaceObjects, pullWorkspace, pushWorkspace, registerIdentity } from './tree.js'
import { ensurePerfReviewHost, LIB_VERSION } from 'dsh-performance-review/host'
import { registerRoutes as registerGuardedRoutes } from 'dsh-host-route-guard'
import { ROUTE_TABLE, PLUGIN } from './route-table.js'
import { SESSION_ID_RE, WORKSPACE_ID_RE } from 'dsh-remote-data-schema'

export const PREFIX = '/nano-shared-workspace'

/* ------------------------------------------------------------------ *
 * Route-boundary charset checks (P2-06 layer 1 of 2; the consumer layer
 * re-checks inside session-io/tree/workspaces). A body param that cannot
 * form a safe S3 key / host path is rejected before any bucket or fs call.
 * Violations throw → the register wrapper answers 400 {error}, matching the
 * existing missing-param error style.
 * ------------------------------------------------------------------ */
const badId = name => new Error(`${name} has an invalid charset`)

const assertWorkspaceId = value => {
  if (typeof value !== 'string' || !WORKSPACE_ID_RE.test(value)) throw badId('workspaceId')
  return value
}
const assertSessionId = value => {
  if (typeof value !== 'string' || !SESSION_ID_RE.test(value)) throw badId('sessionId')
  return value
}
/** Absolute + normalized replica path (mirrors the marker schema's localPath rule). */
const assertLocalPath = value => {
  if (typeof value !== 'string' || !isAbsolute(value) || resolve(value) !== value) {
    throw new Error('localPath must be an absolute normalized path')
  }
  return value
}

/** This instance's own member row — strict memberId binding (P2-03) PLUS the
 * local pin (review 9012 F1): the PINNED localPath, not the co-tenant-writable
 * remote row, is the replica root pull/push/sync use. */
const localMember = async (marker, identity, instance) =>
  instance === '' ? undefined : (await trustedMember(marker, identity, instance))?.member

/**
 * One background job row: what it is doing, how far, and how it ended. A
 * heavy call (`/sync`, `/materialize`) can return `jobId` immediately; the
 * client polls `GET /jobs/{id}` for a progress heartbeat instead of blocking
 * a request across many proxy round trips — the "first workspace load sits
 * for minutes with no signal" symptom.
 */
const JOB_TTL_MS = 10 * 60 * 1000
const jobs = new Map() // id -> {id, kind, state, done, total, note, startedAt, finishedAt, result|error}
let jobSeq = 0

function newJob(kind, total = 0) {
  const id = `job-${Date.now().toString(36)}-${(jobSeq += 1).toString(36)}`
  const job = { id, kind, state: 'running', done: 0, total, note: '', startedAt: Date.now() }
  jobs.set(id, job)
  // Bound the table; a finished row only needs to outlive the poller.
  for (const [key, row] of jobs) {
    if (row.finishedAt !== undefined && Date.now() - row.finishedAt > JOB_TTL_MS) jobs.delete(key)
  }
  return job
}

function finishJob(job, result) {
  job.state = 'done'
  job.result = result
  job.finishedAt = Date.now()
}

function failJob(job, error) {
  job.state = 'failed'
  const info = messageOf(error)
  job.error = info.error
  job.code = info.code
  job.finishedAt = Date.now()
}

/**
 * Download remote session artifacts that are new or changed since our last
 * materialize — the missing half of the sync cycle. A session only lands
 * under OUR member row's project dir; one held live by another member is
 * skipped (active-session write fence), and an unchanged rev is skipped
 * cheaply by mtime on the local artifact.
 * @returns `[{sessionId, workspaceId, outcome}]`
 */
async function pullRemoteSessions(s3, ctx, identity, dshHome, instance, markers, state, job) {
  const remotes = await listRemoteSessions(s3)
  if (remotes.length === 0) return []
  const writerId = `${identity.username}@${instance.slice(0, 8)}`
  const byWorkspace = new Map()
  for (const marker of markers) {
    const member = await localMember(marker, identity, instance)
    if (typeof member?.localPath === 'string' && member.localPath !== '') {
      byWorkspace.set(marker.workspaceId, member.localPath)
    }
  }
  /* Durable dedupe before any download: the fingerprint materialize left on
   * disk (surviving restarts) decides a re-pull; in-memory state only covers
   * the same process. Skip tombstones and the already-seen. Newest first. */
  const pending = (await Promise.all(remotes.map(async meta => {
    if (meta.deleted === true || !byWorkspace.has(meta.workspaceId)) return undefined
    const revKey = `${meta.rev ?? 0}:${meta.committedBytes ?? 0}`
    const seen = state.remoteRev.get(`${meta.workspaceId}:${meta.sessionId}`)
      ?? await readPulledRev(dshHome, byWorkspace.get(meta.workspaceId), meta.sessionId)
    return seen === revKey ? undefined : meta
  })))
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.mtime ?? 0) - Date.parse(a.mtime ?? 0))
  /* One pass bounds its work: beyond the cap the next tick continues; this is
   * what keeps a full history sync from blocking the tick for minutes. */
  const CAP = 6
  const batch = pending.slice(0, CAP)
  if (job !== undefined) { job.total = batch.length; job.done = 0 }
  const outcomes = []
  const worker = async () => {
    for (;;) {
      const index = outcomes.length
      if (index >= batch.length) return
      const meta = batch[index]
      const revKey = `${meta.rev ?? 0}:${meta.committedBytes ?? 0}`
      outcomes.push(null)
      if (job !== undefined) job.note = `session ${meta.sessionId} (${index + 1}/${batch.length})`
      const localPath = byWorkspace.get(meta.workspaceId)
      try {
        const owned = await foreignActiveClaim(s3, meta.sessionId, writerId)
        if (owned !== undefined) {
          outcomes[index] = { sessionId: meta.sessionId, workspaceId: meta.workspaceId, outcome: `skip:busy:${owned.writerId}` }
        } else {
          await materializeSession(s3, dshHome, { workspaceId: meta.workspaceId, sessionId: meta.sessionId, localPath, writerId })
          state.remoteRev.set(`${meta.workspaceId}:${meta.sessionId}`, revKey)
          /* Attach to the workspace so the pulled session appears in the
           * member's session list immediately — the visible "I can see their
           * session" half, not just an on-disk artifact. */
          const workspace = ctx.workspaceRegistry?.resolveByPath?.(localPath)
          try { workspace?.attachSession?.(meta.sessionId) } catch { /* best effort */ }
          outcomes[index] = { sessionId: meta.sessionId, workspaceId: meta.workspaceId, outcome: 'materialized' }
        }
      } catch (error) {
        /* Corrupt artifacts (e.g. parts written by a pre-fix build) fail
         * forever; after a few tries adopt the fingerprint so the tick stops
         * re-downloading a poisoned object every pass. */
        const key = `${meta.workspaceId}:${meta.sessionId}`
        const tries = (state.remoteTries.get(key) ?? 0) + 1
        state.remoteTries.set(key, tries)
        if (tries >= 3) state.remoteRev.set(key, revKey)
        outcomes[index] = { sessionId: meta.sessionId, workspaceId: meta.workspaceId, outcome: `error:${messageOf(error).error}` }
      }
      if (job !== undefined) job.done += 1
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, batch.length) }, worker))
  return outcomes.filter(Boolean)
}

/**
 * One error row the client can act on: `error` is the human string, `code` a
 * stable machine token, `detail` optional debugging context (never a stack or
 * raw S3 XML — F-19). A thrown handler failure now carries all three so the
 * client can show *why* a call failed instead of a bare HTTP status.
 */
function messageOf(error) {
  const raw = error instanceof Error ? error.message : String(error)
  const code = /<Code>([^<]+)<\/Code>/.exec(raw)?.[1]
  const status = /HTTP (\d{3})/.exec(raw)?.[1]
  if (error?.code === 'session-busy') {
    return {
      error: raw, code: 'session-busy',
      holder: error.holder, holderExpiresAt: error.holderExpiresAt,
    }
  }
  if (code !== undefined) return { error: `S3 ${status ?? ''} ${code}`.trim(), code: `s3-${String(code).toLowerCase()}` }
  if (raw.startsWith('schema:')) return { error: raw, code: 'schema' }
  if (/(timeout|timed out|aborted|fetch failed|econnreset|econnrefused|enotfound|network)/i.test(raw)) {
    return { error: raw, code: 'network' }
  }
  const clean = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return { error: clean.length > 180 ? `${clean.slice(0, 177)}…` : clean, code: 'internal' }
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(payload)
}

/** Read the whole request body (bounded: settings payloads are a few hundred bytes). */
async function readBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > 64 * 1024) throw new Error('request body too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** `undefined` for absent fields so the caller can tell "not sent" from "sent empty". */
const field = value => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined)

/** One masked form of a secret for the settings card's "configured" hint. */
const mask = secret => (typeof secret === 'string' && secret.length >= 8
  ? `${secret.slice(0, 4)}…${secret.slice(-4)}`
  : undefined)

/**
 * GET /settings is static for a profile: patch config plus the stored identity,
 * and one existence check of `identities/{username}.json`. Opening the section
 * hits it every time, so keep one in-process copy. Identity writes drop it.
 */
const SETTINGS_TTL_MS = 60_000

/**
 * @param ctx - host context.
 * @param config - validated Config value `{endpoint, bucket, region, prefix}`.
 */
export function createRoutes(ctx, config) {
  // perf-review: identity wrappers unless DSH_PERF_REVIEW=1 (spec §6.2). hostSpan
  // names stay inside the v1 set — sync-tick / settings / remote-sessions / workspaces.
  const review = ensurePerfReviewHost().hostJoin('nano-shared-workspace', {
    version: typeof __NSW_VERSION__ === 'string' ? __NSW_VERSION__ : undefined,
    // This host bundle's own copy of the library version (A3 / §10.4.4).
    libVersion: LIB_VERSION,
  })
  const dshHome = process.env.DSH_HOME ?? `${homedir()}/.dsh`
  const syncState = { bySession: new Map(), remoteRev: new Map(), remoteTries: new Map() }
  /** `{ until, body }` for the last probe that did not throw. */
  let settingsCache
  /** `{ epoch, promise }` so overlapping opens share one resolve + S3 GET. */
  let settingsPending
  /** Bumped on identity writes so an in-flight probe cannot refill a stale body. */
  let settingsEpoch = 0
  const dropSettingsCache = () => {
    settingsCache = undefined
    settingsEpoch += 1
  }
  const loadSettings = () => {
    const now = Date.now()
    if (settingsCache !== undefined && now < settingsCache.until) return settingsCache.body
    if (settingsPending !== undefined && settingsPending.epoch === settingsEpoch) return settingsPending.promise
    const epoch = settingsEpoch
    const promise = (async () => {
      const identity = await readIdentity(ctx)
      let registered = false
      let probed = true
      if (identity?.configured === true && identity.username) {
        try {
          const client = createS3(config, identity)
          const row = await client.getJson(`identities/${encodeURIComponent(identity.username)}.json`)
          registered = row !== undefined
        } catch {
          registered = false
          probed = false
        }
      }
      const body = {
        endpoint: config.endpoint,
        bucket: config.bucket,
        registered,
        region: config.region,
        username: identity?.username ?? null,
        configured: identity?.configured === true,
        credentialSource: identity?.source ?? null,
        maskedSecret: mask(identity?.accessKey ?? identity?.token) ?? null,
      }
      // A failed probe stays uncached so the next open retries the bucket.
      if (probed && epoch === settingsEpoch) settingsCache = { until: Date.now() + SETTINGS_TTL_MS, body }
      return body
    })().finally(() => {
      if (settingsPending?.epoch === epoch) settingsPending = undefined
    })
    settingsPending = { epoch, promise }
    return promise
  }
  const s3 = async () => {
    const identity = await readIdentity(ctx)
    if (identity?.configured !== true) throw new Error('join identity is not configured')
    return { client: createS3(config, identity), identity }
  }
  return {
    '/settings': {
      method: 'GET',
      run() {
        return review.hostSpan('settings', () => loadSettings())
      },
    },
    // Real bucket probe for the staged keys: one signed LIST. Nothing is stored.
    '/settings/test': {
      method: 'POST',
      async run(req) {
        const body = JSON.parse(await readBody(req) || '{}')
        const username = field(body?.username)
        const token = field(body?.token)
        const accessKey = field(body?.accessKey)
        const current = (await readIdentity(ctx)) ?? {}
        const candidate = {
          username: username ?? current.username,
          token: token ?? current.token,
          accessKey: accessKey ?? current.accessKey,
        }
        if (candidate.token === undefined) return { ok: false, error: 'Access Key and Secret Key are required' }
        if (candidate.username === undefined) return { ok: false, error: 'username is required' }
        try {
          const client = createS3(config, candidate)
          await client.list('')
          return { ok: true, bucket: config.bucket, region: config.region }
        } catch (error) {
          return { ok: false, error: messageOf(error) }
        }
      },
    },
    '/settings/update': {
      method: 'PUT',
      async run(req) {
        const body = JSON.parse(await readBody(req) || '{}')
        const username = field(body?.username)
        const token = field(body?.token)
        const accessKey = field(body?.accessKey)
        if (username === undefined && token === undefined && accessKey === undefined) {
          return { ok: false, error: 'nothing to update' }
        }
        await writeIdentity(ctx, { username, token, accessKey })
        try {
          const { client, identity } = await s3()
          await registerIdentity(client, identity)
        } catch { /* registration is retried on the next authenticated call */ }
        dropSettingsCache()
        return { ok: true }
      },
    },
    '/settings/clear': {
      method: 'POST',
      async run() {
        await clearIdentity(ctx)
        dropSettingsCache()
        return { ok: true }
      },
    },
    '/status': {
      method: 'GET',
      async run() {
        const identity = await readIdentity(ctx)
        return {
          configured: identity?.configured === true,
          username: identity?.username ?? null,
          // Phase-0: no sync engine yet. These rows shape the client contract.
          state: identity?.configured === true ? 'idle' : 'unconfigured',
          sessions: [],
        }
      },
    },
    '/workspaces': {
      method: 'GET',
      async run() {
        return review.hostSpan('workspaces', async () => {
          const identity = await readIdentity(ctx)
          if (identity?.configured !== true) return { workspaces: [] }
          const client = createS3(config, identity)
          await registerIdentity(client, identity)
            .then(result => { if (result?.ok === true && result.existed === false) dropSettingsCache() })
            .catch(() => {})
          const rows = await listWorkspaces(client)
          return { workspaces: rows }
        })
      },
    },
    // Cloud canonical first: the marker is created on S3 BEFORE the client
    // picks a local replica path, so the workspace is born remote. The local
    // workspace list is deliberately untouched.
    '/workspaces/create': {
      method: 'POST',
      async run(req) {
        const { client, identity } = await s3()
        const body = JSON.parse(await readBody(req) || '{}')
        const name = typeof body?.name === 'string' && body.name.trim() !== '' ? body.name.trim() : undefined
        const localPath = typeof body?.localPath === 'string' && body.localPath.trim() !== '' ? body.localPath.trim() : undefined
        if (name === undefined || localPath === undefined) {
          return { ok: false, error: 'name and localPath are required' }
        }
        assertLocalPath(localPath)
        // A client-generated idempotency key makes a retried create return the
        // same marker instead of a second one (T-B02).
        const requestId = typeof body?.requestId === 'string' ? body.requestId : undefined
        const marker = await createWorkspace(client, ctx, identity, { name, localPath, requestId })
        return { ok: true, workspace: marker }
      },
    },
    '/workspaces/join': {
      method: 'POST',
      async run(req) {
        const { client, identity } = await s3()
        const body = JSON.parse(await readBody(req) || '{}')
        if (typeof body?.workspaceId !== 'string' || typeof body?.localPath !== 'string'
            || body.localPath.trim() === '') {
          return { ok: false, error: 'workspaceId and localPath are required' }
        }
        // Route boundary (P2-03/#12 + P2-06): the id must be the 16-hex key
        // charset before it can reach an S3 key — `..` join traversal stops here.
        const workspaceId = assertWorkspaceId(body.workspaceId)
        const localPath = assertLocalPath(body.localPath.trim())
        const marker = await joinWorkspace(client, ctx, identity,
          { workspaceId, localPath })
        return { ok: true, workspace: marker }
      },
    },
    // Delete the cloud marker. The local replica directory is left in place;
    // remote tree/session objects under this id are orphaned (documented gap).
    '/workspaces/delete': {
      method: 'POST',
      async run(req) {
        const { client, identity } = await s3()
        const body = JSON.parse(await readBody(req) || '{}')
        const workspaceId = assertWorkspaceId(body?.workspaceId)
        const key = `workspaces/${workspaceId}.json`
        const marker = await readMarker(client, key)
        if (marker === undefined) return { ok: false, error: 'shared workspace not found' }
        const isMember = Object.values(marker.members ?? {}).some(member => member?.username === identity.username)
        if (!isMember) return { ok: false, error: 'only members can delete this shared workspace' }
        await client.del(key)
        await unpinWorkspaceLocalPath(workspaceId)
        // The marker is gone; the tree generations, blobs and session chunks
        // under this id would otherwise stay in the bucket forever (F-12).
        const purged = await purgeWorkspaceObjects(client, workspaceId).catch(() => undefined)
        return { ok: true, workspaceId, purged: purged ?? null }
      },
    },
    '/sync': {
      method: 'POST',
      async run(req) {
        /* `{"async":true}` (or `?async=1`) returns a job immediately; the client
         * polls /jobs/{id} for a heartbeat instead of blocking the request
         * through every proxy round trip — the "first load sits silently for
         * minutes" case. Default stays synchronous for callers/tests. */
        const body = JSON.parse(await readBody(req) || '{}')
        const work = async (job) => {
          const { client, identity } = await s3()
          const markers = await listWorkspaces(client)
          job.note = 'pushing sessions'
          const results = await syncAll(client, ctx, identity, dshHome, syncState, markers)
          const instance = await instanceId(ctx)
          const me = instance.slice(0, 8)
          const trees = []
          /* Pull before push on every workspace: remote members' file
           * generations land in our replica first, then our local edits merge
           * on top — the earlier push-only cycle is why two members diverged. */
          job.total = markers.length
          for (const marker of markers) {
            job.note = `workspace ${marker.workspaceId}`
            const member = await localMember(marker, identity, instance)
            if (typeof member?.localPath !== 'string' || member.localPath === '') { job.done += 1; continue }
            try {
              const pulled = await pullWorkspace(client, dshHome, marker.workspaceId, member.localPath)
              trees.push({ workspaceId: marker.workspaceId, pulled, ...await pushWorkspace(client, dshHome, marker.workspaceId, member.localPath, `${identity.username}@${me}`) })
            } catch (error) {
              trees.push({ workspaceId: marker.workspaceId, ok: false, ...messageOf(error) })
            }
            job.done += 1
          }
          job.note = 'pulling sessions'
          const pulledSessions = await pullRemoteSessions(client, ctx, identity, dshHome, instance, markers, syncState, job).catch(() => [])
          return {
            ok: true,
            pushed: results.filter(r => r.outcome.startsWith('pushed')).length,
            outcomes: results.slice(0, 50),
            trees,
            pulledSessions,
          }
        }
        if (body?.async === true || new URL(req.url, 'http://x').searchParams.get('async') === '1') {
          const job = newJob('sync')
          work(job).then(result => finishJob(job, result)).catch(error => failJob(job, error))
          return { ok: true, jobId: job.id, async: true }
        }
        const job = newJob('sync')
        try {
          const result = await work(job)
          finishJob(job, result)
          return result
        } catch (error) {
          failJob(job, error)
          throw error
        }
      },
    },
    // Route kind is `exact`, so the id rides a query param, not a path segment.
    '/jobs': {
      method: 'GET',
      async run(req) {
        const id = new URL(req.url, 'http://x').searchParams.get('id')
        const job = id === null ? undefined : jobs.get(id)
        if (job === undefined) return { ok: false, error: 'no such job', code: 'job-not-found' }
        return { ok: true, job }
      },
    },
    '/tree/pull': {
      method: 'POST',
      async run(req) {
        const { client, identity } = await s3()
        const body = JSON.parse(await readBody(req) || '{}')
        const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId : ''
        if (workspaceId !== '') assertWorkspaceId(workspaceId)
        const marker = (await listWorkspaces(client)).find(row => row.workspaceId === workspaceId)
        if (marker === undefined) return { ok: false, error: 'shared workspace not found' }
        const member = await localMember(marker, identity, await instanceId(ctx))
        if (typeof member?.localPath !== 'string' || member.localPath === '') return { ok: false, error: 'join this shared workspace before syncing files' }
        return pullWorkspace(client, dshHome, workspaceId, member.localPath)
      },
    },
    '/tree/push': {
      method: 'POST',
      async run(req) {
        const { client, identity } = await s3()
        const body = JSON.parse(await readBody(req) || '{}')
        const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId : ''
        if (workspaceId !== '') assertWorkspaceId(workspaceId)
        const marker = (await listWorkspaces(client)).find(row => row.workspaceId === workspaceId)
        if (marker === undefined) return { ok: false, error: 'shared workspace not found' }
        const instance = await instanceId(ctx)
        const member = await localMember(marker, identity, instance)
        if (typeof member?.localPath !== 'string' || member.localPath === '') return { ok: false, error: 'join this shared workspace before syncing files' }
        return pushWorkspace(client, dshHome, workspaceId, member.localPath, `${identity.username}@${instance.slice(0, 8)}`)
      },
    },
    // Harness only enables the composer for a session a Host workspace accounts.
    // The replica workspace stays hidden from the local sidebar; this is not a
    // second source of truth.
    '/sessions/bind': {
      method: 'POST',
      async run(req) {
        const body = JSON.parse(await readBody(req) || '{}')
        const localPath = typeof body?.path === 'string' ? body.path : ''
        const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
        if (localPath === '' || sessionId === '') return { ok: false, error: 'path and sessionId are required' }
        assertSessionId(sessionId)
        assertLocalPath(localPath)
        const registry = ctx.get('workspaceRegistry')
        const workspace = await registry.resolveByPath(localPath)
        if (workspace === undefined) return { ok: false, error: 'replica is not registered' }
        if (!workspace.sessionIds.includes(sessionId)) await workspace.attachSession(sessionId)
        return { ok: true, workspaceId: workspace.id }
      },
    },
    '/sessions/claim': {
      method: 'POST',
      async run(req) {
        const { client, identity } = await s3()
        const body = JSON.parse(await readBody(req) || '{}')
        const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId : ''
        const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
        if (workspaceId === '' || sessionId === '') return { ok: false, error: 'workspaceId and sessionId are required' }
        assertWorkspaceId(workspaceId)
        assertSessionId(sessionId)
        const marker = (await listWorkspaces(client)).find(row => row.workspaceId === workspaceId)
        if (marker === undefined) return { ok: false, error: 'shared workspace not found' }
        const instance = await instanceId(ctx)
        const member = await localMember(marker, identity, instance)
        if (typeof member?.localPath !== 'string' || member.localPath === '') return { ok: false, error: 'join this shared workspace before opening its sessions' }
        const claim = await acquireClaim(client, ctx, sessionId, `${identity.username}@${instance.slice(0, 8)}`, 1)
        return {
          ok: claim.acquired === true,
          busy: claim.acquired !== true,
          holder: claim.holder ?? null,
          expiresAt: claim.expiresAt ?? null,
        }
      },
    },
    '/sessions/heartbeat': {
      method: 'POST',
      async run(req) {
        const { client, identity } = await s3()
        const body = JSON.parse(await readBody(req) || '{}')
        const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId : ''
        const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
        if (sessionId === '') return { ok: false, error: 'sessionId is required' }
        assertSessionId(sessionId)
        if (workspaceId !== '') assertWorkspaceId(workspaceId)
        const instance = await instanceId(ctx)
        const writerId = `${identity.username}@${instance.slice(0, 8)}`
        const renewed = await renewClaim(client, sessionId, writerId)
        if (renewed.renewed !== true) return { ok: false, busy: true, holder: renewed.holder, expiresAt: renewed.expiresAt }
        let tree = null
        if (workspaceId !== '') {
          const marker = (await listWorkspaces(client)).find(row => row.workspaceId === workspaceId)
          const member = await localMember(marker, identity, instance)
          if (typeof member?.localPath === 'string' && member.localPath !== '') {
            tree = await pushWorkspace(client, dshHome, workspaceId, member.localPath, writerId)
          }
        }
        return { ok: true, expiresAt: renewed.expiresAt, tree }
      },
    },
    '/sessions/lease': {
      method: 'POST',
      async run(req) {
        const { client, identity } = await s3()
        const body = JSON.parse(await readBody(req) || '{}')
        const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
        if (sessionId === '') return { ok: false, error: 'sessionId is required' }
        // Route boundary (P2-04/P2-06): `claims/${sessionId}.json` is keyed
        // straight from the body — a `..` id must never reach S3.
        assertSessionId(sessionId)
        const claim = await client.getJson(`claims/${sessionId}.json`)
        const me = (await instanceId(ctx)).slice(0, 8)
        return {
          ok: true,
          holder: claim?.writerId ?? null,
          expiresAt: claim?.expiresAt ?? null,
          heartbeatRev: claim?.heartbeatRev ?? null,
          mine: claim?.writerId === `${identity.username}@${me}`,
        }
      },
    },
    '/sessions': {
      method: 'GET',
      async run() {
        return review.hostSpan('remote-sessions', async () => {
          const { client } = await s3()
          return { sessions: await listRemoteSessions(client) }
        })
      },
    },
    // Host-side mkdir: the directoryPicker/browse backend (which owns
    // `directoryPicker/createDirectory`) is not composed on every instance —
    // the native picker's host lacks it and the remote call 502s. This route
    // always works on our host plugin.
    '/mkdir': {
      method: 'POST',
      async run(req) {
        const body = JSON.parse(await readBody(req) || '{}')
        const parent = typeof body?.parent === 'string' && isAbsolute(body.parent) ? resolve(body.parent) : undefined
        const name = typeof body?.name === 'string' ? body.name.trim() : ''
        if (parent === undefined) return { ok: false, error: 'parent must be an absolute path' }
        if (name === '' || name === '.' || name === '..' || /[/\\]/.test(name)) {
          return { ok: false, error: 'name must be a single path segment' }
        }
        const target = join(parent, name)
        await mkdir(target, { recursive: false })
        return { ok: true, path: target }
      },
    },
    // Host-side directory listing — the browse backend also owns
    // `directoryPicker/list`, so call it the same way `/mkdir` is called:
    // one level, dirs only, with breadcrumbs for the dialog's navigation.
    '/ls': {
      method: 'POST',
      async run(req) {
        const body = JSON.parse(await readBody(req) || '{}')
        const home = homedir()
        const path = typeof body?.path === 'string' && isAbsolute(body.path) ? resolve(body.path) : home
        const dir = await opendir(path)
        const entries = []
        try {
          for (;;) {
            const dirent = await dir.read()
            if (dirent === null) break
            if (!dirent.isDirectory() && !dirent.isSymbolicLink()) continue
            entries.push({ name: dirent.name, path: join(path, dirent.name), hidden: dirent.name.startsWith('.') })
          }
        } finally { await dir.close() }
        entries.sort((a, b) => a.name.localeCompare(b.name))
        const crumbs = []
        for (let node = path; ; ) {
          crumbs.unshift({ name: node === '/' ? '' : basename(node), path: node })
          const parent = dirname(node)
          if (parent === node) break
          node = parent
        }
        return { path, home, crumbs, entries, truncated: false }
      },
    },
    '/transcript': {
      method: 'POST',
      async run(req) {
        const { client } = await s3()
        const body = JSON.parse(await readBody(req) || '{}')
        if (typeof body?.workspaceId !== 'string' || typeof body?.sessionId !== 'string') {
          return { ok: false, error: 'workspaceId and sessionId are required' }
        }
        assertWorkspaceId(body.workspaceId)
        assertSessionId(body.sessionId)
        const { meta, events } = await fetchTranscript(client, body.workspaceId, body.sessionId)
        return { ok: true, meta, events }
      },
    },
    // Copy a shared session onto this machine's session tree, with cwd rewritten
    // to the local replica, so the Host can open it like any other session.
    '/materialize': {
      method: 'POST',
      async run(req) {
        const { client, identity } = await s3()
        const body = JSON.parse(await readBody(req) || '{}')
        if (typeof body?.workspaceId !== 'string' || typeof body?.sessionId !== 'string') {
          return { ok: false, error: 'workspaceId and sessionId are required' }
        }
        // Route boundary (P2-06 layer 1): `..` sessionId traversal is stopped
        // before it reaches the S3 key or the session tree (audit §4.10);
        // materializeSession re-checks at the consumer layer.
        const workspaceId = assertWorkspaceId(body.workspaceId)
        const sessionId = assertSessionId(body.sessionId)
        const work = async () => {
          const marker = (await listWorkspaces(client)).find(row => row.workspaceId === workspaceId)
          if (marker === undefined) return { ok: false, error: 'shared workspace not found' }
          // The materialize localPath is OUR member row's only — a foreign
          // member's localPath is never a write target (P2-03, audit §4.11).
          const instance = await instanceId(ctx)
          const member = await localMember(marker, identity, instance)
          const localPath = member?.localPath
          if (typeof localPath !== 'string' || localPath === '') {
            return { ok: false, error: 'join this shared workspace before opening its sessions' }
          }
          const landed = await materializeSession(client, dshHome, {
            workspaceId,
            sessionId,
            localPath,
            writerId: `${identity.username}@${instance.slice(0, 8)}`,
          })
          return { ok: true, ...landed }
        }
        if (body?.async === true || new URL(req.url, 'http://x').searchParams.get('async') === '1') {
          const job = newJob('materialize')
          work().then(result => finishJob(job, result)).catch(error => failJob(job, error))
          return { ok: true, jobId: job.id, async: true }
        }
        return work()
      },
    },
  }
}

/**
 * Register every route on the web server through dsh-host-route-guard
 * (P1-05 / T-O-7): the guard owns requestRejection (Host/Origin fence +
 * authenticated Peer) and the uniform 405; handlers keep `route.run` and the
 * 200/400 response shapes.
 * @param ctx - host context providing `webServer` and `connection`.
 * @param routes - the handlers built by {@link createRoutes}.
 * @returns one disposer per registered route.
 */
export function registerRoutes(ctx, routes) {
  const specs = Object.entries(routes).map(([suffix, route]) => ({
    path: `${PREFIX}${suffix}`,
    methods: [route.method],
    handler: async (req, res) => {
      const started = Date.now()
      try {
        const body = await route.run(req)
        const ms = Date.now() - started
        // Slow-but-ok routes are visible too — the stall that turns a client
        // dialog into a 502 shows up here before Caddy resets the socket.
        if (ms > 2000) console.warn(`[nsw:route] ${route.method} ${suffix} -> 200 ${ms}ms`)
        sendJson(res, 200, body)
      } catch (error) {
        // Every handler failure is logged server-side AND returned as a
        // structured row ({error, code, …}) so the client can name the fault.
        const info = messageOf(error)
        console.error(`[nsw:route] ${route.method} ${suffix} -> 400 ${Date.now() - started}ms [${info.code}] :: ${info.error}`)
        sendJson(res, 400, { ok: false, ...info })
      }
    },
  }))
  return registerGuardedRoutes(ctx, specs, { table: ROUTE_TABLE, plugin: PLUGIN })
}

/** Push session logs and replica files on the configured interval; 0 disables it. */
export function startBackgroundSync(ctx, config) {
  if (config.backgroundSyncMs === 0) return () => {}
  // Same singleton/row as createRoutes; hostJoin is idempotent per plugin id.
  const review = ensurePerfReviewHost().hostJoin('nano-shared-workspace', {
    version: typeof __NSW_VERSION__ === 'string' ? __NSW_VERSION__ : undefined,
    libVersion: LIB_VERSION,
  })
  const dshHome = process.env.DSH_HOME ?? `${homedir()}/.dsh`
  const syncState = { bySession: new Map(), remoteRev: new Map(), remoteTries: new Map() }
  let running = false
  const tick = () => review.hostSpan('sync-tick', async () => {
    if (running) return
    running = true
    try {
      const identity = await readIdentity(ctx)
      if (identity?.configured !== true) return
      const client = createS3(config, identity)
      const instance = await instanceId(ctx)
      const markers = await listWorkspaces(client)
      /* Pull remote state before pushing: new session artifacts + file
       * generations land in our replica first, then local edits merge on top.
       * The earlier push-only cycle is why members diverged. */
      await pullRemoteSessions(client, ctx, identity, dshHome, instance, markers, syncState).catch(() => {})
      await syncAll(client, ctx, identity, dshHome, syncState, markers).catch(() => {})
      for (const marker of markers) {
        // Strict memberId binding (P2-03): a foreign member's localPath is
        // never a push target — no username-only fallback.
        const member = await localMember(marker, identity, instance)
        if (typeof member?.localPath !== 'string' || member.localPath === '') continue
        const writerId = `${identity.username}@${instance.slice(0, 8)}`
        await pullWorkspace(client, dshHome, marker.workspaceId, member.localPath).catch(() => {})
        await pushWorkspace(client, dshHome, marker.workspaceId, member.localPath, writerId).catch(() => {})
      }
    } finally {
      running = false
    }
  })
  const timer = setInterval(() => { tick().catch(() => {}) }, config.backgroundSyncMs)
  timer.unref?.()
  return () => clearInterval(timer)
}
