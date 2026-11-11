/** HTTP routes the client half calls: settings read/write and a status probe. */

import { mkdir, opendir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { clearIdentity, readIdentity, writeIdentity } from './credentials.js'
import { createS3 } from './s3.js'
import { createWorkspace, instanceId, joinWorkspace, listWorkspaces, ownMember } from './workspaces.js'
import { acquireClaim, fetchTranscript, listRemoteSessions, materializeSession, renewClaim, syncAll } from './session-io.js'
import { pullWorkspace, pushWorkspace, registerIdentity } from './tree.js'
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

/** This instance's own member row — strict memberId binding, no username fallback (P2-03). */
const localMember = (marker, identity, instance) =>
  instance === '' ? undefined : ownMember(marker, identity, instance)?.member

/** Error message extraction that never leaks a stack to the response. */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
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
  const syncState = { bySession: new Map() }
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
          await registerIdentity(client, identity).catch(() => {})
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
        const marker = await createWorkspace(client, ctx, identity, { name, localPath })
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
    '/sync': {
      method: 'POST',
      async run() {
        const { client, identity } = await s3()
        const results = await syncAll(client, ctx, identity, dshHome, syncState)
        const instance = await instanceId(ctx)
        const me = instance.slice(0, 8)
        const trees = []
        for (const marker of await listWorkspaces(client)) {
          // Strict memberId binding (P2-03): only our own row's localPath is a sync target.
          const member = localMember(marker, identity, instance)
          if (typeof member?.localPath !== 'string' || member.localPath === '') continue
          try {
            trees.push({ workspaceId: marker.workspaceId, ...await pushWorkspace(client, dshHome, marker.workspaceId, member.localPath, `${identity.username}@${me}`) })
          } catch (error) {
            trees.push({ workspaceId: marker.workspaceId, ok: false, error: messageOf(error) })
          }
        }
        return {
          ok: true,
          pushed: results.filter(r => r.outcome.startsWith('pushed')).length,
          outcomes: results.slice(0, 50),
          trees,
        }
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
        const member = localMember(marker, identity, await instanceId(ctx))
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
        const member = localMember(marker, identity, instance)
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
        const member = localMember(marker, identity, instance)
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
          const member = localMember(marker, identity, instance)
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
        const marker = (await listWorkspaces(client)).find(row => row.workspaceId === workspaceId)
        if (marker === undefined) return { ok: false, error: 'shared workspace not found' }
        // The materialize localPath is OUR member row's only — a foreign
        // member's localPath is never a write target (P2-03, audit §4.11).
        const member = localMember(marker, identity, await instanceId(ctx))
        const localPath = member?.localPath
        if (typeof localPath !== 'string' || localPath === '') {
          return { ok: false, error: 'join this shared workspace before opening its sessions' }
        }
        const landed = await materializeSession(client, dshHome, {
          workspaceId,
          sessionId,
          localPath,
        })
        return { ok: true, ...landed }
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
      try {
        sendJson(res, 200, await route.run(req))
      } catch (error) {
        sendJson(res, 400, { error: messageOf(error) })
      }
    },
  }))
  return registerGuardedRoutes(ctx, specs, { table: ROUTE_TABLE, plugin: PLUGIN })
}

/** Every 30s, push session logs and replica files for workspaces this instance has joined. */
export function startBackgroundSync(ctx, config) {
  // Same singleton/row as createRoutes; hostJoin is idempotent per plugin id.
  const review = ensurePerfReviewHost().hostJoin('nano-shared-workspace', {
    version: typeof __NSW_VERSION__ === 'string' ? __NSW_VERSION__ : undefined,
    libVersion: LIB_VERSION,
  })
  const dshHome = process.env.DSH_HOME ?? `${homedir()}/.dsh`
  const syncState = { bySession: new Map() }
  let running = false
  const tick = () => review.hostSpan('sync-tick', async () => {
    if (running) return
    running = true
    try {
      const identity = await readIdentity(ctx)
      if (identity?.configured !== true) return
      const client = createS3(config, identity)
      const instance = await instanceId(ctx)
      await syncAll(client, ctx, identity, dshHome, syncState).catch(() => {})
      for (const marker of await listWorkspaces(client)) {
        // Strict memberId binding (P2-03): a foreign member's localPath is
        // never a push target — no username-only fallback.
        const member = localMember(marker, identity, instance)
        if (typeof member?.localPath !== 'string' || member.localPath === '') continue
        await pushWorkspace(client, dshHome, marker.workspaceId, member.localPath, `${identity.username}@${instance.slice(0, 8)}`).catch(() => {})
      }
    } finally {
      running = false
    }
  })
  const timer = setInterval(() => { tick().catch(() => {}) }, 30_000)
  timer.unref?.()
  return () => clearInterval(timer)
}
