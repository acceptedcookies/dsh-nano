/** HTTP routes the client half calls: settings read/write and a status probe. */

import { mkdir, opendir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { clearIdentity, readIdentity, writeIdentity } from './credentials.js'
import { createS3 } from './s3.js'
import { createWorkspace, instanceId, joinWorkspace, listWorkspaces } from './workspaces.js'
import { acquireClaim, fetchTranscript, listRemoteSessions, materializeSession, renewClaim, syncAll } from './session-io.js'
import { pullWorkspace, pushWorkspace, registerIdentity } from './tree.js'

export const PREFIX = '/nano-shared-workspace'

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
        return loadSettings()
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
        const identity = await readIdentity(ctx)
        if (identity?.configured !== true) return { workspaces: [] }
        const client = createS3(config, identity)
        await registerIdentity(client, identity).catch(() => {})
        const rows = await listWorkspaces(client)
        return { workspaces: rows }
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
        const marker = await joinWorkspace(client, ctx, identity,
          { workspaceId: body.workspaceId, localPath: body.localPath.trim() })
        return { ok: true, workspace: marker }
      },
    },
    '/sync': {
      method: 'POST',
      async run() {
        const { client, identity } = await s3()
        const results = await syncAll(client, ctx, identity, dshHome, syncState)
        const me = (await instanceId(ctx)).slice(0, 8)
        const trees = []
        for (const marker of await listWorkspaces(client)) {
          const member = Object.values(marker.members ?? {}).find(item => item?.username === identity.username && String(item.instance ?? '').startsWith(me))
            ?? Object.values(marker.members ?? {}).find(item => item?.username === identity.username)
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
        const marker = (await listWorkspaces(client)).find(row => row.workspaceId === workspaceId)
        if (marker === undefined) return { ok: false, error: 'shared workspace not found' }
        const me = (await instanceId(ctx)).slice(0, 8)
        const member = Object.values(marker.members ?? {}).find(item => item?.username === identity.username && String(item.instance ?? '').startsWith(me))
          ?? Object.values(marker.members ?? {}).find(item => item?.username === identity.username)
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
        const marker = (await listWorkspaces(client)).find(row => row.workspaceId === workspaceId)
        if (marker === undefined) return { ok: false, error: 'shared workspace not found' }
        const me = (await instanceId(ctx)).slice(0, 8)
        const member = Object.values(marker.members ?? {}).find(item => item?.username === identity.username && String(item.instance ?? '').startsWith(me))
          ?? Object.values(marker.members ?? {}).find(item => item?.username === identity.username)
        if (typeof member?.localPath !== 'string' || member.localPath === '') return { ok: false, error: 'join this shared workspace before syncing files' }
        return pushWorkspace(client, dshHome, workspaceId, member.localPath, `${identity.username}@${me}`)
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
        const marker = (await listWorkspaces(client)).find(row => row.workspaceId === workspaceId)
        if (marker === undefined) return { ok: false, error: 'shared workspace not found' }
        const me = (await instanceId(ctx)).slice(0, 8)
        const member = Object.values(marker.members ?? {}).find(item => item?.username === identity.username && String(item.instance ?? '').startsWith(me))
          ?? Object.values(marker.members ?? {}).find(item => item?.username === identity.username)
        if (typeof member?.localPath !== 'string' || member.localPath === '') return { ok: false, error: 'join this shared workspace before opening its sessions' }
        const claim = await acquireClaim(client, ctx, sessionId, `${identity.username}@${me}`, 1)
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
        const me = (await instanceId(ctx)).slice(0, 8)
        const writerId = `${identity.username}@${me}`
        const renewed = await renewClaim(client, sessionId, writerId)
        if (renewed.renewed !== true) return { ok: false, busy: true, holder: renewed.holder, expiresAt: renewed.expiresAt }
        let tree = null
        if (workspaceId !== '') {
          const marker = (await listWorkspaces(client)).find(row => row.workspaceId === workspaceId)
          const member = Object.values(marker?.members ?? {}).find(item => item?.username === identity.username && String(item.instance ?? '').startsWith(me))
            ?? Object.values(marker?.members ?? {}).find(item => item?.username === identity.username)
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
        const { client } = await s3()
        return { sessions: await listRemoteSessions(client) }
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
        const marker = (await listWorkspaces(client)).find(row => row.workspaceId === body.workspaceId)
        if (marker === undefined) return { ok: false, error: 'shared workspace not found' }
        const me = (await instanceId(ctx)).slice(0, 8)
        const member = Object.values(marker.members ?? {}).find(item => item?.username === identity.username && String(item.instance ?? '').startsWith(me))
          ?? Object.values(marker.members ?? {}).find(item => item?.username === identity.username)
        const localPath = member?.localPath
        if (typeof localPath !== 'string' || localPath === '') {
          return { ok: false, error: 'join this shared workspace before opening its sessions' }
        }
        const landed = await materializeSession(client, dshHome, {
          workspaceId: body.workspaceId,
          sessionId: body.sessionId,
          localPath,
        })
        return { ok: true, ...landed }
      },
    },
  }
}

/**
 * Register every route on the web server, gated by the connection's request admission.
 * @param ctx - host context providing `webServer` and `connection`.
 * @param routes - the handlers built by {@link createRoutes}.
 * @returns one disposer per registered route.
 */
export function registerRoutes(ctx, routes) {
  const connection = () => ctx.get('connection')
  const disposers = []
  for (const [suffix, route] of Object.entries(routes)) {
    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: `${PREFIX}${suffix}`,
      handler: async (req, res) => {
        const rejection = connection()?.requestRejection(req)
        if (rejection !== undefined) {
          res.statusCode = rejection
          res.end()
          return
        }
        if (req.method !== route.method) {
          res.setHeader('allow', route.method)
          sendJson(res, 405, { error: `method ${req.method} is not allowed` })
          return
        }
        try {
          sendJson(res, 200, await route.run(req))
        } catch (error) {
          sendJson(res, 400, { error: messageOf(error) })
        }
      },
    }))
  }
  return disposers
}

/** Every 30s, push session logs and replica files for workspaces this instance has joined. */
export function startBackgroundSync(ctx, config) {
  const dshHome = process.env.DSH_HOME ?? `${homedir()}/.dsh`
  const syncState = { bySession: new Map() }
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      const identity = await readIdentity(ctx)
      if (identity?.configured !== true) return
      const client = createS3(config, identity)
      const me = (await instanceId(ctx)).slice(0, 8)
      await syncAll(client, ctx, identity, dshHome, syncState).catch(() => {})
      for (const marker of await listWorkspaces(client)) {
        const member = Object.values(marker.members ?? {}).find(item => item?.username === identity.username && String(item.instance ?? '').startsWith(me))
          ?? Object.values(marker.members ?? {}).find(item => item?.username === identity.username)
        if (typeof member?.localPath !== 'string' || member.localPath === '') continue
        await pushWorkspace(client, dshHome, marker.workspaceId, member.localPath, `${identity.username}@${me}`).catch(() => {})
      }
    } finally {
      running = false
    }
  }
  const timer = setInterval(() => { tick().catch(() => {}) }, 30_000)
  timer.unref?.()
  return () => clearInterval(timer)
}
