/** Host assembly: families, provider adapters, scopes, routes. */

import { mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { selectOperation } from '../../../packages/dsh-interface/src/contracts/FamilyDefinition.js'
import { ensurePerfReviewHost } from 'dsh-performance-review/host'
import { createDevinApi, CarrierError } from '../providers/devin/api.js'
import { createProfileStore, storePath, envPath } from './profiles.js'
import { ensureSshKeypair, sshCommands } from './ssh-keys.js'
import { registerRoutes, sendJson, readJsonBody } from './route-guard-entry.js'
import { BINDING_TABLE, PLUGIN } from '../../lib/bindings.js'
import { SESSION_FAMILY } from '../contracts/session-family.js'
import { WORKSPACE_FAMILY, HTTP_STATUS_FOR_REASON } from '../contracts/workspace-family.js'
import { parseRemoteSessionId, SessionIdError } from '../providers/devin/session-id.js'
import { decodeListFilter, ProfileCodecError } from '../providers/devin/profile-codec.js'
import { createWorkspaceScopes } from './workspace-scopes.js'
import { createResourceService } from './resource-service.js'
import { NativeError, WorkspaceError, httpStatusForError } from './errors.js'
import { resolveNativeChat } from '../host-adapters/native-chat.js'
import { readMessagePages } from '../providers/devin/chat.js'
import { artifactPath } from '../providers/devin/bootstrap.js'

export const name = 'nano-cloud-session'
export const inject = ['webServer', 'connection', 'sessions', 'agents']
export { httpStatusForError, NativeError, CarrierError, WorkspaceError }

const version = typeof __DNCS_VERSION__ !== 'undefined' ? __DNCS_VERSION__ : '0.0.0'
const review = ensurePerfReviewHost().hostJoin('nano-cloud-session', { version })

export const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-nano-cloud-session',
    validate(value) {
      const source = value && typeof value === 'object' ? value : {}
      const issues = []
      const number = (key, fallback, min, max) => {
        const candidate = source[key]
        if (candidate === undefined) return fallback
        if (typeof candidate !== 'number' || !Number.isInteger(candidate) || candidate < min || candidate > max) {
          issues.push({ message: `${key} must be an integer from ${min} to ${max}` })
          return fallback
        }
        return candidate
      }
      const requestTimeoutMs = number('requestTimeoutMs', 20000, 3000, 120000)
      const defaultFirst = number('defaultFirst', 50, 1, 200)
      const pollIntervalMs = number('pollIntervalMs', 5000, 2000, 60000)
      if (issues.length > 0) return { issues }
      return { value: { requestTimeoutMs, defaultFirst, pollIntervalMs } }
    },
  },
}

const messageOf = error => (error instanceof Error ? error.message : String(error))

export function apply(ctx, config = {}) {
  const api = createDevinApi({ timeoutMs: config.requestTimeoutMs ?? 20000 })
  const scopes = createWorkspaceScopes({ configEpochOf: () => store.configEpoch() })
  const store = createProfileStore({ onEpoch: () => scopes.invalidateAll() })
  const resources = createResourceService({
    scopes, api, home: process.env.DSH_HOME || process.env.HOME,
    artifactPath: artifactPath(),
  })
  const defaultFirst = config.defaultFirst ?? 50

  const pick = profileId => {
    if (profileId) {
      const found = store.get(profileId)
      if (!found) throw new CarrierError('profile-not-found', `no profile ${profileId}`)
      return found
    }
    const active = store.active()
    if (!active) throw new CarrierError('no-active-profile', 'no carrier profile configured')
    return active
  }

  const work = (fn) => async (req, res, route) => {
    try {
      const body = await readJsonBody(req, route.bodyLimit)
      const result = await fn(body)
      sendJson(res, 200, result === undefined ? { ok: true } : result)
    } catch (error) {
      if (error instanceof FamilyDispatchError || error?.reason === 'unknown-dispatch') {
        sendJson(res, 422, { ok: false, reason: 'invalid-request', message: messageOf(error).slice(0, 300) })
        return
      }
      if (error instanceof WorkspaceError) {
        sendJson(res, error.httpStatus ?? 502, {
          ok: false, reason: error.reason, message: error.message.slice(0, 300),
          httpStatus: error.httpStatus, providerStatus: error.providerStatus ?? 0,
        })
        return
      }
      if (error instanceof NativeError || error instanceof CarrierError || error instanceof ProfileCodecError || error instanceof SessionIdError) {
        const status = httpStatusForError(error)
        sendJson(res, status, {
          ok: false, reason: error.reason, message: error.message.slice(0, 300),
          status: error.status, httpStatus: status, providerStatus: error.status ?? 0,
        })
        return
      }
      sendJson(res, 500, { ok: false, reason: 'failed', message: messageOf(error).slice(0, 300) })
    }
  }

  const securityStatus = () => {
    let mode = null
    try { mode = (statSync(storePath()).mode & 0o777).toString(8) } catch { /* store not written yet */ }
    return {
      storePath: storePath(), envPath: envPath(), storeMode: mode,
      seededFromEnv: store.seededFromEnv,
      secretPolicy: 'write-only, mode 0600, never returned by any route',
      knownHostsPath: `${process.env.DSH_HOME || process.env.HOME}/nano-cloud-session-known-hosts`,
    }
  }

  const dispatchConfig = (body) => {
    const action = String(body.action ?? 'list')
    try { return selectOperation(SESSION_FAMILY, 'http.config', action) }
    catch { throw new CarrierError('invalid-request', `unknown config action ${action}`, { status: 422 }) }
  }

  const configAction = async (body) => {
    const op = dispatchConfig(body)
    switch (op) {
      case 'config.list':
        return { ok: true, profiles: store.list(), activeId: store.active()?.id ?? null, seededFromEnv: store.seededFromEnv }
      case 'config.save': {
        const profile = store.saveProfile(body.profile)
        return { ok: true, profile, profiles: store.list(), activeId: store.active()?.id ?? null }
      }
      case 'config.remove':
        store.removeProfile(String(body.profileId ?? ''))
        return { ok: true, profiles: store.list(), activeId: store.active()?.id ?? null }
      case 'config.activate':
        store.activate(String(body.profileId ?? ''))
        return { ok: true, profiles: store.list(), activeId: store.active()?.id ?? null }
      case 'config.test': {
        const profile = pick(body.profileId)
        const self = await review.hostSpan('self', () => api.self(profile))
        const orgMatch = self.devin_sessions_org_id ? self.devin_sessions_org_id === profile.orgId : null
        return { ok: true, self, orgMatch }
      }
      case 'config.security':
        return { ok: true, security: securityStatus() }
      case 'config.ssh-key': {
        const kp = ensureSshKeypair()
        return { ok: true, publicKey: kp.publicKey, privateKeyPath: kp.privateKeyPath, keyMode: kp.mode }
      }
      default:
        throw new CarrierError('invalid-request', `unknown config action`, { status: 422 })
    }
  }

  const needSessionId = body => parseRemoteSessionId(body.session_id).prefixed

  const nativeOpen = async (profile, body) => {
    const chat = resolveNativeChat(ctx)
    if (!chat.available) {
      throw new NativeError('NATIVE_UNAVAILABLE', chat.message, 503)
    }
    const remote = needSessionId(body)
    const opened = await chat.owner.open({
      providerKey: 'devin',
      profileId: profile.id,
      remoteSessionId: remote,
      pages: await readMessagePages(api, profile, remote),
    })
    return { ok: true, local_session_id: opened.localId, remote_session_id: remote }
  }

  const shells = new Map()
  const workspaceShell = async (profile, body) => {
    if (typeof ctx.sessions?.prepare !== 'function' || typeof ctx.sessions?.enter !== 'function' || typeof ctx.sessions?.announce !== 'function') {
      throw new NativeError('NATIVE_UNAVAILABLE', 'host cannot prepare a workbench session without sessions.prepare/enter/announce', 503)
    }
    const remote = needSessionId(body)
    const voidRoot = join(process.env.DSH_HOME || process.env.HOME || '.', 'nano-cloud-session-unbound')
    mkdirSync(voidRoot, { recursive: true })
    const session = ctx.sessions.prepare(undefined, { meta: { cwd: voidRoot, executionWorld: 'unbound-remote' } })
    const detach = ctx.sessions.enter(session)
    try { ctx.sessions.announce(session) } catch (error) {
      try { detach() } catch { /* ignore */ }
      throw new NativeError('NATIVE_UNAVAILABLE', `session announce failed: ${error?.message ?? error}`, 503)
    }
    shells.set(session.id, { detach, remote, profileId: profile.id })
    return { ok: true, local_session_id: session.id, remote_session_id: remote, nativeView: 'unavailable' }
  }

  const sessionOps = {
    native_open: (profile, body) => nativeOpen(profile, body),
    workspace_shell: (profile, body) => workspaceShell(profile, body),
    get: (profile, body) => api.getSession(profile, String(body.session_id)),
    messages: (profile, body) => api.getMessages(profile, String(body.session_id), { first: body.first, after: body.after }),
    attachments: (profile, body) => api.getAttachments(profile, String(body.session_id)),
    insights: (profile, body) => api.getInsights(profile, String(body.session_id)),
    generate_insights: (profile, body) => api.generateInsights(profile, String(body.session_id)),
    tags: (profile, body) => api.getTags(profile, String(body.session_id)),
    set_tags: (profile, body) => api.setTags(profile, String(body.session_id), body.tags),
    append_tags: (profile, body) => api.appendTags(profile, String(body.session_id), body.tags),
    sleep: (profile, body) => api.sleep(profile, String(body.session_id)),
  }

  const catalog = async (body) => {
    const profile = pick(body.profileId)
    const resource = String(body.resource ?? '')
    const first = body.first ?? 100
    const after = body.after
    switch (resource) {
      case 'playbooks':
        return { ok: true, ...(await api.listPlaybooks(profile, { first, after, includeEnterprise: body.include_enterprise !== false })) }
      case 'secrets':
        return { ok: true, ...(await api.listSecrets(profile, { first, after })) }
      case 'knowledge':
        return { ok: true, ...(await api.listKnowledgeNotes(profile, { first, after, search: body.search, folderPath: body.folder_path, pinnedRepo: body.pinned_repo })) }
      case 'repositories':
        return { ok: true, ...(await api.listRepositories(profile, { first, after, filterName: body.filter_name, loadIndexingStatus: body.load_indexing_status === true })) }
      default:
        throw new CarrierError('invalid-request', `unknown catalog resource ${resource}`, { status: 422 })
    }
  }

  const upload = async (body) => {
    const name = String(body.name ?? '').trim()
    const data = String(body.data_base64 ?? '')
    if (!name || !data) throw new CarrierError('invalid-request', 'name and data_base64 are required', { status: 422 })
    let bytes
    try { bytes = Buffer.from(data, 'base64') } catch { throw new CarrierError('invalid-request', 'data_base64 is not valid base64', { status: 422 }) }
    if (bytes.length === 0) throw new CarrierError('invalid-request', 'attachment is empty', { status: 422 })
    if (bytes.length > 16 * 1024 * 1024) throw new CarrierError('body-too-large', 'attachment exceeds 16 MiB', { status: 413 })
    const result = await api.uploadAttachment(pick(body.profileId), { name, contentType: body.content_type ?? body.type, bytes })
    return { ok: true, attachment: result }
  }

  const workspaceOp = async (body) => {
    let op
    try { op = selectOperation(WORKSPACE_FAMILY, 'http.workspace', body.op ?? 'status') }
    catch { throw new CarrierError('invalid-request', `unknown workspace op ${body.op}`, { status: 422 }) }
    if (op === 'workspace.connect') {
      const profile = pick(body.profileId)
      return { ok: true, ...(await scopes.connect(profile, body, resources.connectFactory)) }
    }
    if (op === 'workspace.status') return { ok: true, ...scopes.status(body.scopeId) }
    if (op === 'workspace.disconnect') return scopes.disconnect(body.scopeId)
    if (op === 'workspace.inspect') {
      const scope = scopes.requireReady(body.scopeId)
      const data = await scope.mcp.call('workspace.inspect', {})
      return { ok: true, data, nativeChat: resolveNativeChat(ctx) }
    }
    throw new CarrierError('invalid-request', `unknown workspace op`, { status: 422 })
  }

  const resourceOp = async (body) => {
    let op
    try { op = selectOperation(WORKSPACE_FAMILY, 'http.resources', body.op) }
    catch { throw new CarrierError('invalid-request', `unknown resource op ${body.op}`, { status: 422 }) }
    const data = await resources.call(body.scopeId, op, body)
    return { ok: true, data }
  }

  const SPECS = [
    { path: '/nano-cloud-session/status', methods: ['POST'], bodyLimit: 16384, handler: work(() => configAction({ action: 'list' })) },
    { path: '/nano-cloud-session/config', methods: ['POST'], bodyLimit: 16384, handler: work(body => configAction(body)) },
    {
      path: '/nano-cloud-session/sessions', methods: ['POST'], bodyLimit: 65536,
      handler: work(body => {
        const profile = pick(body.profileId)
        let op
        try { op = selectOperation(SESSION_FAMILY, 'http.sessions', body.op ?? 'list') }
        catch { throw new CarrierError('invalid-request', `unknown sessions op ${body.op}`, { status: 422 }) }
        const params = { first: body.first ?? defaultFirst, ...decodeListFilter(body) }
        const run = op === 'sessions.insights' ? api.listSessionsInsights : api.listSessions
        return run(profile, params)
      }),
    },
    {
      path: '/nano-cloud-session/session', methods: ['POST'], bodyLimit: 65536,
      handler: work(body => {
        let operationId
        try { operationId = selectOperation(SESSION_FAMILY, 'http.session', body.op ?? 'get') }
        catch { throw new CarrierError('invalid-request', `unknown session op ${body.op}`, { status: 422 }) }
        const sessionId = needSessionId(body)
        const opName = operationId.split('.')[1]
        const op = sessionOps[opName]
        if (body.op === 'native_open') {
          const chat = resolveNativeChat(ctx)
          if (!chat.available) {
            throw new NativeError('NATIVE_UNAVAILABLE', chat.message, 503)
          }
          let profile
          try { profile = pick(body.profileId) } catch (error) {
            if (error?.reason === 'no-active-profile' || error?.reason === 'profile-not-found') {
              throw new NativeError('NATIVE_UNSUPPORTED', `no carrier profile to project from: ${error.message}`, 422)
            }
            throw error
          }
          return op(profile, { ...body, session_id: sessionId })
        }
        return op(pick(body.profileId), { ...body, session_id: sessionId })
      }),
    },
    {
      path: '/nano-cloud-session/create', methods: ['POST'], bodyLimit: 262144,
      handler: work(body => api.createSession(pick(body.profileId), body)),
    },
    {
      path: '/nano-cloud-session/message', methods: ['POST'], bodyLimit: 65536,
      handler: work(body => {
        if (!body.session_id || typeof body.message !== 'string' || !body.message.trim()) {
          throw new CarrierError('invalid-request', 'session_id and message are required', { status: 422 })
        }
        return api.postMessage(pick(body.profileId), needSessionId(body), body.message)
      }),
    },
    { path: '/nano-cloud-session/archive', methods: ['POST'], bodyLimit: 16384, handler: work(body => api.archive(pick(body.profileId), needSessionId(body))) },
    { path: '/nano-cloud-session/unarchive', methods: ['POST'], bodyLimit: 16384, handler: work(body => api.unarchive(pick(body.profileId), needSessionId(body))) },
    { path: '/nano-cloud-session/terminate', methods: ['POST'], bodyLimit: 16384, handler: work(body => api.terminate(pick(body.profileId), needSessionId(body))) },
    { path: '/nano-cloud-session/catalog', methods: ['POST'], bodyLimit: 16384, handler: work(body => catalog(body)) },
    { path: '/nano-cloud-session/upload', methods: ['POST'], bodyLimit: 33554432, handler: work(body => upload(body)) },
    {
      path: '/nano-cloud-session/ssh', methods: ['POST'], bodyLimit: 16384,
      handler: work(body => {
        const id = needSessionId(body)
        const kp = ensureSshKeypair()
        return { ok: true, session_id: id, ...sshCommands(id, kp), publicKey: kp.publicKey,
          enrollHint: 'paste publicKey into Devin settings → SSH keys (account-level, one-time)' }
      }),
    },
    { path: '/nano-cloud-session/workspace', methods: ['POST'], bodyLimit: 65536, handler: work(body => workspaceOp(body)) },
    { path: '/nano-cloud-session/resources', methods: ['POST'], bodyLimit: 131072, handler: work(body => resourceOp(body)) },
  ]

  ctx.effect(() => () => {
    for (const shell of shells.values()) {
      try { shell.detach() } catch { /* ignore */ }
    }
    shells.clear()
    void scopes.invalidateAll()
    void scopes.drain()
  }, 'nano-cloud-session: workspace scopes')

  registerRoutes(ctx, SPECS, { table: BINDING_TABLE, plugin: PLUGIN, observe: event => ensurePerfReviewHost().observe(event) })
}

class FamilyDispatchError extends Error {}
void HTTP_STATUS_FOR_REASON
