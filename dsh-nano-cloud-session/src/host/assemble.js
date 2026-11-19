/** Host assembly: families, provider adapters, scopes, routes. */

import { statSync } from 'node:fs'
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
import { decodeListFilter, ProfileCodecError, providerKeyOf } from '../providers/devin/profile-codec.js'
import { createWorkspaceScopes } from './workspace-scopes.js'
import { createResourceService } from './resource-service.js'
import { NativeError, WorkspaceError, httpStatusForError } from './errors.js'
import { artifactPath } from '../providers/devin/bootstrap.js'
import { DEVIN_DEFINITION } from '../providers/devin/definition.js'
import { createDevinView } from '../providers/devin/native-view.js'

export const name = 'nano-cloud-session'
export const inject = ['webServer', 'connection', 'sessionController']
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
  /* The host feature marker gates every native path: a host whose external
   * Session registry predates the contract reports no version and DNCS must
   * not register views into it. */
  const externalSessions = ctx.sessionController?.externalSessions
  const nativeViewAvailable = externalSessions?.nativeViewVersion === 1
  const nativeRegistrations = new Map()
  const revokeNative = (profileId) => {
    for (const [sessionId, entry] of nativeRegistrations) {
      if (profileId == null || entry.profileId === profileId) {
        entry.dispose()
        nativeRegistrations.delete(sessionId)
      }
    }
  }
  const scopes = createWorkspaceScopes({ configEpochOf: (profileId) => store.profileEpoch(profileId) })
  const store = createProfileStore({
    onEpoch: (_epoch, profileId) => {
      /* A profile change invalidates every external id minted under its old
       * epoch — the epoch is part of the namespaced id. */
      revokeNative(profileId ?? null)
      if (profileId) void scopes.invalidateProfile(profileId)
      else void scopes.invalidateAll()
    },
  })
  const resources = createResourceService({
    scopes, api, home: process.env.DSH_HOME || process.env.HOME,
    artifactPath: artifactPath(),
  })
  const defaultFirst = config.defaultFirst ?? 50

  const pick = profileId => {
    const found = profileId ? store.get(profileId) : store.active()
    if (!found) {
      if (profileId) throw new CarrierError('profile-not-found', `no profile ${profileId}`)
      throw new CarrierError('no-active-profile', 'no carrier profile configured')
    }
    /* A stored profile may only ever drive the provider it was written for;
     * an unknown carrier must never be silently treated as Devin. */
    providerKeyOf(found)
    return found
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
          ...(error.fingerprint ? { fingerprint: error.fingerprint, keyKind: error.keyKind } : {}),
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
      if (error?.reason === 'invalid-request') {
        sendJson(res, 422, { ok: false, reason: 'invalid-request', message: messageOf(error).slice(0, 300) })
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
        return {
          ok: true, profiles: store.list(), activeId: store.active()?.id ?? null, seededFromEnv: store.seededFromEnv,
          nativeChat: nativeViewAvailable
            ? { available: true }
            : { available: false, reason: 'NATIVE_UNAVAILABLE' },
        }
      case 'config.save': {
        const profile = store.saveProfile(body.profile)
        return { ok: true, profile, profiles: store.list(), activeId: store.active()?.id ?? null }
      }
      case 'config.remove':
        try { store.removeProfile(String(body.profileId ?? '')) }
        catch (error) {
          if (String(error?.message) === 'profile not found') throw new CarrierError('profile-not-found', error.message, { status: 404 })
          throw error
        }
        return { ok: true, profiles: store.list(), activeId: store.active()?.id ?? null }
      case 'config.activate':
        try { store.activate(String(body.profileId ?? '')) }
        catch (error) {
          if (String(error?.message) === 'profile not found') throw new CarrierError('profile-not-found', error.message, { status: 404 })
          throw error
        }
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

  const sessionOps = {
    /* Opens only through the host's external Session registry: the profile is
     * resolved explicitly, the upstream id is verified by a readonly get, and
     * the registered view is namespaced under profile id + epoch so a profile
     * change revokes it. Never mints a local session or Agent. */
    native_open: async (profile, body) => {
      /* Opening binds a frozen identity: no implicit active-profile fallback. */
      if (body.profileId == null || body.profileId === '') {
        throw new CarrierError('invalid-request', 'native_open requires an explicit profileId', { status: 422 })
      }
      const remote = parseRemoteSessionId(body.session_id)
      const bare = remote.bare
      if (!bare) throw new CarrierError('invalid-request', 'native_open requires an upstream session id', { status: 422 })
      const epochBefore = store.profileEpoch(profile.id)
      const detail = await api.getSession(profile, bare)
      const returned = detail?.session_id ?? detail?.id
      if (returned == null || parseRemoteSessionId(returned).bare !== bare) {
        throw new CarrierError('upstream-mismatch', `upstream identity ${returned ?? 'unknown'} does not match ${bare}`)
      }
      /* The epoch is part of the namespaced id: if the profile changed while
       * the readonly read was in flight, the minted id would already be stale. */
      const epoch = store.profileEpoch(profile.id)
      if (epoch !== epochBefore) {
        throw new CarrierError('profile-changed', 'profile changed while opening the native view', { status: 409 })
      }
      const sessionId = `external:devin:${Buffer.from(profile.id).toString('base64url')}:${bare}:${epoch}`
      if (nativeRegistrations.has(sessionId)) return { ok: true, external_session_id: sessionId }
      const view = createDevinView({
        api, profile, remoteId: bare, id: sessionId, detail,
        pollIntervalMs: config.pollIntervalMs ?? 5000,
      })
      const dispose = externalSessions.register(sessionId, view)
      nativeRegistrations.set(sessionId, { dispose, profileId: profile.id, remoteId: bare })
      return { ok: true, external_session_id: sessionId }
    },
    workspace_shell: () => { throw new NativeError('NATIVE_UNAVAILABLE', 'Native cloud session view and per-session plugin filtering are unavailable', 503) },
    get: (profile, body) => api.getSession(profile, parseRemoteSessionId(body.session_id).bare),
    messages: (profile, body) => api.getMessages(profile, parseRemoteSessionId(body.session_id).bare, { first: body.first, after: body.after }),
    attachments: (profile, body) => api.getAttachments(profile, parseRemoteSessionId(body.session_id).bare),
    /* Verified-registration-only read: the browser supplies the namespaced
     * external id; profileId and remoteId are recovered from the live
     * registration, never from request fields. */
    external_attachments: (_profile, body) => {
      const sessionId = String(body.session_id ?? '')
      const entry = nativeRegistrations.get(sessionId)
      if (!entry) {
        throw new CarrierError('not-registered', 'no verified external registration for this session id', { status: 404 })
      }
      const bound = store.get(entry.profileId)
      if (!bound) throw new CarrierError('profile-not-found', `no profile ${entry.profileId}`, { status: 404 })
      return api.getAttachments(bound, entry.remoteId).then(items => ({ ok: true, items }))
    },
    insights: (profile, body) => api.getInsights(profile, parseRemoteSessionId(body.session_id).bare),
    generate_insights: (profile, body) => api.generateInsights(profile, parseRemoteSessionId(body.session_id).bare),
    tags: (profile, body) => api.getTags(profile, parseRemoteSessionId(body.session_id).bare),
    set_tags: (profile, body) => api.setTags(profile, parseRemoteSessionId(body.session_id).bare, body.tags),
    append_tags: (profile, body) => api.appendTags(profile, parseRemoteSessionId(body.session_id).bare, body.tags),
    sleep: async (profile, body) => {
      const remote = parseRemoteSessionId(body.session_id)
      const result = await api.sleep(profile, remote.bare)
      await scopes.invalidateRemote(profile.id, remote.prefixed)
      return result
    },
  }

  /* The provider descriptor declares each operation's lane (local / native /
   * ssh / api); the mapping is a routing description, never an authorization
   * grant — dispatch still goes through selectOperation per family. Every
   * implemented session op must be declared in exactly one facet. */
  {
    const facets = DEVIN_DEFINITION.handlers
    const lanes = Object.entries(facets)
    const seen = new Set()
    for (const [lane, ids] of lanes) {
      for (const id of ids) {
        if (seen.has(id)) throw new Error(`Devin provider declares ${id} in both its ${lane} facet and another lane`)
        seen.add(id)
      }
    }
    for (const opName of Object.keys(sessionOps)) {
      if (!seen.has(`session.${opName}`)) {
        throw new Error(`session.${opName} is not part of the Devin provider's declared handler surface`)
      }
    }
    const expectedSsh = ['config.ssh-key', 'ssh.info', ...Object.keys(WORKSPACE_FAMILY.operations)]
    if (JSON.stringify([...facets.ssh].sort()) !== JSON.stringify([...expectedSsh].sort())) {
      throw new Error('Devin provider ssh facet does not match ssh-key + ssh.info + workspace family')
    }
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
      /* Remote workspace connect is unavailable until the host permission
       * layer exists: refuse before any identity probe or remote operation,
       * regardless of client-supplied authorize flags. */
      throw new WorkspaceError('workspace-unavailable', 'workspace connect is unavailable', { httpStatus: 503 })
    }
    if (op === 'workspace.status') return { ok: true, ...scopes.status(body.scopeId) }
    if (op === 'workspace.disconnect') return scopes.disconnect(body.scopeId)
    if (op === 'workspace.inspect') {
      const scope = scopes.requireReady(body.scopeId)
      const data = await scope.mcp.call('workspace.inspect', {})
      return {
        ok: true,
        data: { ...data, pty: { supported: false, reason: 'NATIVE_UNAVAILABLE' }, forward: { supported: false, reason: 'NATIVE_UNAVAILABLE' } },
        nativeChat: { available: false, reason: 'NATIVE_UNAVAILABLE' },
      }
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
        const opName = operationId.split('.')[1]
        /* Both opening paths refuse before profile lookup, message reads, or
         * any session mint/switch when the host cannot host a native view:
         * workspace_shell always (the local shell is retired), native_open
         * whenever the external Session registry lacks the version marker. */
        if (opName === 'workspace_shell') {
          throw new NativeError('NATIVE_UNAVAILABLE', 'Native cloud session view and per-session plugin filtering are unavailable', 503)
        }
        if (opName === 'native_open' && !nativeViewAvailable) {
          throw new NativeError('NATIVE_UNAVAILABLE', 'Native cloud session view is unavailable on this host', 503)
        }
        /* external_attachments takes the opaque namespaced id verbatim —
         * the Devin session-id grammar would reject `external:` prefixes. */
        const sessionId = opName === 'external_attachments' ? String(body.session_id ?? '') : needSessionId(body)
        const op = sessionOps[opName]
        /* external_attachments must not resolve identity from request fields:
         * skip pick() entirely; the op binds profile+remote id from the
         * verified registration map. */
        return opName === 'external_attachments'
          ? op(null, { ...body, session_id: sessionId })
          : op(pick(body.profileId), { ...body, session_id: sessionId })
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
        return api.postMessage(pick(body.profileId), parseRemoteSessionId(body.session_id).bare, body.message)
      }),
    },
    { path: '/nano-cloud-session/archive', methods: ['POST'], bodyLimit: 16384, handler: work(body => api.archive(pick(body.profileId), parseRemoteSessionId(body.session_id).bare)) },
    { path: '/nano-cloud-session/unarchive', methods: ['POST'], bodyLimit: 16384, handler: work(body => api.unarchive(pick(body.profileId), parseRemoteSessionId(body.session_id).bare)) },
    {
      path: '/nano-cloud-session/terminate', methods: ['POST'], bodyLimit: 16384,
      handler: work(async body => {
        const profile = pick(body.profileId)
        const remote = parseRemoteSessionId(body.session_id)
        const result = await api.terminate(profile, remote.bare)
        await scopes.invalidateRemote(profile.id, remote.prefixed)
        return result
      }),
    },
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
    revokeNative(null)
    void scopes.invalidateAll()
    void scopes.drain()
  }, 'nano-cloud-session: workspace scopes')

  registerRoutes(ctx, SPECS, { table: BINDING_TABLE, plugin: PLUGIN, observe: event => ensurePerfReviewHost().observe(event) })
}

class FamilyDispatchError extends Error {}
void HTTP_STATUS_FOR_REASON
