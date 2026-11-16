/** Host half. Carrier credentials and every upstream call stay here; the
 *  browser only ever talks to /nano-cloud-session/* same-origin routes and
 *  never sees a token. Canonical state lives at the carrier (Devin cloud);
 *  this host keeps only the profile store + consumption receipts — 单一真源. */

import { readFileSync, statSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { ensurePerfReviewHost } from './lib/perf-review-host.js'
import { createDevinApi, CarrierError } from './lib/devin-api.js'
import { createProfileStore, storePath, envPath } from './lib/profiles-store.js'
import { ensureSshKeypair, sshCommands } from './lib/ssh-keys.js'
import { registerRoutes, sendJson, readJsonBody } from './lib/route-guard.js'
import { BINDING_TABLE, PLUGIN } from './lib/bindings.js'

export const name = 'nano-cloud-session'
export const inject = ['webServer', 'connection', 'sessions', 'agents']

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const review = ensurePerfReviewHost().hostJoin('nano-cloud-session', { version })

const ROUTE = {
  status: '/nano-cloud-session/status',
  config: '/nano-cloud-session/config',
  sessions: '/nano-cloud-session/sessions',
  session: '/nano-cloud-session/session',
  create: '/nano-cloud-session/create',
  message: '/nano-cloud-session/message',
  archive: '/nano-cloud-session/archive',
  unarchive: '/nano-cloud-session/unarchive',
  terminate: '/nano-cloud-session/terminate',
  ssh: '/nano-cloud-session/ssh',
  catalog: '/nano-cloud-session/catalog',
  upload: '/nano-cloud-session/upload',
}

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

/** HTTP status to send for a thrown error. A NativeError carries its own
 * authoritative status (503/422/502/500) — pass it through. A PLAIN
 * CarrierError keeps the existing contract: upstream 5xx → 502 (the carrier's
 * fault, not ours), 4xx → passthrough, status<400 (network/timeout) → 502.
 * Extracted as a pure function so the clamp is directly unit-testable — the
 * route harness cannot produce a 5xx-bearing CarrierError (the profile layer
 * forces https and the stub upstream is http). */
export const httpStatusForError = (error) =>
  error?.nativeCode != null
    ? (error.status >= 400 ? error.status : 502)
    : (error.status >= 400 && error.status < 500 ? error.status : 502)

export function apply(ctx, config = {}) {
  const api = createDevinApi({ timeoutMs: config.requestTimeoutMs ?? 20000 })
  const store = createProfileStore()
  const defaultFirst = config.defaultFirst ?? 50

  /** Resolve the carrier profile the client asked for, or the active one. */
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

  /** Uniform route shape: every handler returns JSON {ok,…} / {ok:false,reason}. */
  const work = (fn) => async (req, res, route) => {
    try {
      const body = await readJsonBody(req, route.bodyLimit)
      const result = await fn(body)
      sendJson(res, 200, result === undefined ? { ok: true } : result)
    } catch (error) {
      if (error instanceof CarrierError) {
        const status = httpStatusForError(error)
        /* `reason` carries the NATIVE_* / carrier code — it is the stable
         * classification field the ledger already describes. Do NOT mint a
         * parallel `code` wire key (unregistered = contract expansion). The
         * `status` body field echoes the error's own status (upstream code for
         * a carrier error, the authoritative code for a NativeError). */
        sendJson(res, status,
          { ok: false, reason: error.reason, message: error.message.slice(0, 300), status: error.status })
      } else {
        sendJson(res, 500, { ok: false, reason: 'failed', message: messageOf(error).slice(0, 300) })
      }
    }
  }

  /* ---- profile management (secrets write-only) ---- */

  const securityStatus = () => {
    let mode = null
    try { mode = (statSync(storePath()).mode & 0o777).toString(8) } catch { /* store not written yet */ }
    return {
      storePath: storePath(), envPath: envPath(), storeMode: mode,
      seededFromEnv: store.seededFromEnv,
      secretPolicy: 'write-only, mode 0600, never returned by any route',
    }
  }

  const configAction = async (body) => {
    const action = String(body.action ?? 'list')
    switch (action) {
      case 'list':
        return { ok: true, profiles: store.list(), activeId: store.active()?.id ?? null, seededFromEnv: store.seededFromEnv }
      case 'save': {
        const profile = store.saveProfile(body.profile)
        return { ok: true, profile, profiles: store.list(), activeId: store.active()?.id ?? null }
      }
      case 'remove':
        store.removeProfile(String(body.profileId ?? ''))
        return { ok: true, profiles: store.list(), activeId: store.active()?.id ?? null }
      case 'activate':
        store.activate(String(body.profileId ?? ''))
        return { ok: true, profiles: store.list(), activeId: store.active()?.id ?? null }
      case 'test': {
        const profile = pick(body.profileId)
        const self = await review.hostSpan('self', () => api.self(profile))
        const orgMatch = self.devin_sessions_org_id ? self.devin_sessions_org_id === profile.orgId : null
        return { ok: true, self, orgMatch }
      }
      case 'security':
        return { ok: true, security: securityStatus() }
      case 'ssh-key': {
        const kp = ensureSshKeypair()
        return { ok: true, publicKey: kp.publicKey, privateKeyPath: kp.privateKeyPath, keyMode: kp.mode }
      }
      default:
        throw new CarrierError('invalid-request', `unknown config action ${action}`, { status: 422 })
    }
  }

  /* ---- session surface ---- */

  const needSessionId = body => {
    const raw = String(body.session_id ?? '').trim()
    if (!/^(?:devin-)?[A-Za-z0-9-]+$/.test(raw)) {
      throw new CarrierError('invalid-request', 'session_id must be a Devin session id', { status: 422 })
    }
    /* v3 list/get responses expose the bare session id; the path parameter is
       the same id with a `devin-` prefix. Normalize once so every op accepts
       either shape from the browser. */
    return raw.startsWith('devin-') ? raw : `devin-${raw}`
  }

  /* ---- experimental native session bridge (spike) ----
   * Creates a transient in-memory dsh Session and a lightweight proxy Agent
   * for one Devin session. Native Chat renders the event log; the local
   * session is a projection only and is never persisted. Keyed by
   * remote-session + profile identity — F22.3 forbids reusing a bridge whose
   * profile/config changed, so a remote opened under a different account gets
   * a fresh bridge, not the stale one. */
  const nativeBridges = new Map()
  /* P4-02 NATIVE_* taxonomy — the native Chat projection (sessions+agents
   * inject) is an optional support obligation. When the host cannot satisfy
   * it, fail EXPLICITLY (no fabricated local session, no silent success):
   *   NATIVE_UNAVAILABLE      503 — host did not inject sessions/agents, or
   *                                 refused local session creation.
   *   NATIVE_UNSUPPORTED      422 — no carrier profile can be resolved to
   *                                 project from (pick() no-profile remapped).
   *   NATIVE_PROJECTION_FAILED 500 — session created but agents.enter refused;
   *                                 the orphan local session is torn down.
   *   NATIVE_OUTCOME_UNKNOWN  502 — upstream carrier read failed mid-projection;
   *                                 the local session may be partially projected.
   * `reason` carries the NATIVE_* code so callers classify on the stable field,
   * not the message — it is the ledgered classification key. */
  const NativeError = class NativeError extends CarrierError {
    constructor(code, message, status) {
      super(code, message, { status })
      this.nativeCode = code
    }
  }
  const textOfMessage = message => {
    if (typeof message === 'string') return message
    const content = Array.isArray(message?.content) ? message.content : []
    return content.filter(block => block?.type === 'text').map(block => block.text).join('\n')
  }
  const appendNative = (session, type, data, opts) => {
    try { session.append(type, data, opts) } catch (error) { console.warn('[nano-cloud-session] native append failed', type, error?.message ?? error) }
  }
  const nativeTurn = (session, turn) => {
    appendNative(session, 'turn/start', { turn })
    appendNative(session, 'step/start', { turn, step: 1 })
  }
  const nativeClose = (session, turn) => {
    appendNative(session, 'step/end', { turn, step: 1 })
    appendNative(session, 'turn/end', { turn, reason: { kind: 'stop' } })
  }
  const appendNativeMessage = (session, source, text, turn, id = randomUUID()) => {
    nativeTurn(session, turn)
    if (source === 'user') {
      appendNative(session, 'user/message', { id, role: 'user', content: [{ type: 'text', text }], source: { kind: 'user' } }, { surfaceOp: 'append' })
    } else {
      appendNative(session, 'assistant/message', {
        turn, step: 1,
        message: { id, role: 'assistant', content: [{ type: 'text', text }], source: { kind: 'model', provider: 'devin', model: 'devin-cloud-session' } },
        stream: [],
      }, { surfaceOp: 'append' })
    }
    nativeClose(session, turn)
  }
  const nativeOpen = async (profile, body) => {
    const remote = needSessionId(body)
    /* Host support obligation: the projection needs `sessions.create/get`
     * (to mint and re-find the local transcript) and `agents.enter` (to
     * register the proxy). This dsh SessionStore has no public
     * `sessions.close` — teardown is the disposer from `agents.enter`, and
     * `close(id)` is only called when a host actually provides it. Requiring
     * the missing method made every open 503. `profile` is guaranteed
     * non-null: pick() throws first (remapped to NATIVE_UNSUPPORTED). */
    const bridgeKey = `${remote}@${profile.id ?? profile.orgId ?? 'default'}`
    let bridge = nativeBridges.get(bridgeKey)
    if (bridge && ctx.sessions.get(bridge.localId)) {
      return { ok: true, local_session_id: bridge.localId, remote_session_id: remote }
    }
    /* A stale bridge whose local session is already gone leaks its poll timer
     * and agents-enter detach — tear it down before minting a replacement. */
    if (bridge) {
      if (bridge.timer) clearInterval(bridge.timer)
      try { bridge.detach?.() } catch { /* noop */ }
      nativeBridges.delete(bridgeKey)
    }
    let session
    try {
      session = ctx.sessions.create(undefined, { meta: { cwd: process.cwd() } })
    } catch (error) {
      /* The host injected sessions but refused the mint — the projection is
       * unavailable, not an internal fault. */
      throw new NativeError('NATIVE_UNAVAILABLE',
        `host refused local session creation: ${error?.message ?? 'unknown'}`, 503)
    }
    const bridgeState = { localId: session.id, remoteId: remote, profile, seen: new Set(), turn: 0, timer: null, agent: null }
    let page
    try {
      page = await api.getMessages(profile, remote, { first: 100 })
    } catch (error) {
      /* Carrier read failed AFTER the local session was minted: the caller
       * cannot tell whether the projection is usable. Surface the ambiguous
       * outcome and drop the orphan session rather than claim ok. */
      try { ctx.sessions.close(session.id) } catch { /* best-effort teardown */ }
      throw new NativeError('NATIVE_OUTCOME_UNKNOWN',
        `carrier read failed after local session minted: ${error?.message ?? 'unknown'}`, 502)
    }
    for (const message of page.items ?? page.messages ?? []) {
      bridgeState.seen.add(message.event_id)
      if (message.source === 'user' || message.source === 'devin') {
        bridgeState.turn += 1
        appendNativeMessage(session, message.source, String(message.message ?? ''), bridgeState.turn, message.event_id)
      }
    }
    const fake = {
      id: session.id,
      session,
      ctx,
      model: { current: () => ({ provider: 'devin', model: 'devin-cloud-session' }), select: () => {} },
      inbox: {
        nextTurn: [], nextStep: [],
        clear() {}, append() {}, prepend() {}, replace() { return false }, remove() { return false }, splice() { return [] },
      },
      followup: async message => {
        const text = textOfMessage(message).trim()
        if (!text) return
        /* The composer already painted a submission echo keyed by source.rpcId.
         * Appending a second synthesized user message leaves both bubbles.
         * Publish the Host's own message so the echo retires, then forward
         * the text to Devin. Do not run the local model. */
        bridgeState.turn += 1
        nativeTurn(session, bridgeState.turn)
        const payload = message?.content
          ? { id: message.id, role: 'user', content: message.content, source: message.source }
          : { id: randomUUID(), role: 'user', content: [{ type: 'text', text }], source: { kind: 'user' } }
        appendNative(session, 'user/message', payload, { surfaceOp: 'append' })
        nativeClose(session, bridgeState.turn)
        await api.postMessage(profile, remote, text)
      },
      steer: async message => fake.followup(message),
      cancel: async () => {},
      whenIdle: async () => {},
    }
    try {
      bridgeState.detach = ctx.agents.enter(fake)
    } catch (error) {
      /* The session exists but the agent register refused → nothing will ever
       * render the projection. Do NOT report ok against a dead transcript:
       * tear the orphan session down and fail explicitly. */
      try { ctx.sessions.close(session.id) } catch { /* best-effort */ }
      throw new NativeError('NATIVE_PROJECTION_FAILED',
        `agents.enter refused the proxy agent: ${error?.message ?? 'unknown'}`, 500)
    }
    bridgeState.agent = fake
    bridgeState.timer = setInterval(async () => {
      try {
        const next = await api.getMessages(profile, remote, { first: 100 })
        for (const message of next.items ?? next.messages ?? []) {
          if (bridgeState.seen.has(message.event_id)) continue
          bridgeState.seen.add(message.event_id)
          if (message.source === 'devin') {
            bridgeState.turn += 1
            appendNativeMessage(session, 'devin', String(message.message ?? ''), bridgeState.turn, message.event_id)
          }
        }
      } catch { /* upstream polling is best-effort */ }
    }, 2500)
    nativeBridges.set(bridgeKey, bridgeState)
    return { ok: true, local_session_id: session.id, remote_session_id: remote }
  }

  const sessionOps = {
    native_open: (profile, body) => nativeOpen(profile, body),
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

  /** Read-only org context used by the new-session form. Each branch is a
   *  documented list endpoint; a single route keeps the surface small. */
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

  /** Upload one attachment by JSON base64 envelope. The host never exposes
   *  the token; browser -> host same-origin, host -> Devin multipart. */
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

  const SPECS = [
    { path: ROUTE.status, methods: ['POST'], bodyLimit: 16384, handler: work(() => configAction({ action: 'list' })) },
    { path: ROUTE.config, methods: ['POST'], bodyLimit: 16384, handler: work(body => configAction(body)) },
    {
      path: ROUTE.sessions, methods: ['POST'], bodyLimit: 65536,
      handler: work(body => {
        const profile = pick(body.profileId)
        const op = String(body.op ?? 'list')
        if (op !== 'list' && op !== 'insights') throw new CarrierError('invalid-request', `unknown sessions op ${op}`, { status: 422 })
        const params = {
          first: body.first ?? defaultFirst, after: body.after,
          tags: body.tags, origins: body.origins, isArchived: body.is_archived,
          createdAfter: body.created_after, createdBefore: body.created_before,
          updatedAfter: body.updated_after, updatedBefore: body.updated_before,
          category: body.category, userIds: body.user_ids, repoNames: body.repo_names,
          devinId: body.devin_id, sessionIds: body.session_ids,
          playbookId: body.playbook_id, scheduleId: body.schedule_id,
          serviceUserIds: body.service_user_ids, automationIds: body.automation_ids,
          parentSessionId: body.parent_session_id,
        }
        const run = op === 'insights' ? api.listSessionsInsights : api.listSessions
        return run(profile, params)
      }),
    },
    {
      path: ROUTE.session, methods: ['POST'], bodyLimit: 65536,
      handler: work(body => {
        const op = sessionOps[String(body.op ?? 'get')]
        if (!op) throw new CarrierError('invalid-request', `unknown session op ${body.op}`, { status: 422 })
        const sessionId = needSessionId(body)
        /* native_open: the host support obligation is checked before pick() —
         * no carrier profile should be resolved when the projection itself is
         * impossible. `sessions.close` is NOT part of the obligation: the
         * public store has create/get/enter, and close(id) does not exist.
         * Other ops resolve the profile first as before. */
        if (body.op === 'native_open') {
          const missing = [
            typeof ctx.sessions?.create === 'function' ? null : 'sessions.create',
            typeof ctx.sessions?.get === 'function' ? null : 'sessions.get',
            typeof ctx.agents?.enter === 'function' ? null : 'agents.enter',
          ].filter(Boolean)
          if (missing.length) {
            throw new NativeError('NATIVE_UNAVAILABLE',
              `host did not inject ${missing.join(', ')}; native Chat projection is unavailable`, 503)
          }
          /* The projection needs a carrier profile. A missing/inactive profile
           * is NATIVE_UNSUPPORTED (422) for THIS op, not the generic carrier
           * failure pick() would raise — remap it so the code is reachable. */
          let profile
          try { profile = pick(body.profileId) } catch (error) {
            if (error?.reason === 'no-active-profile' || error?.reason === 'profile-not-found') {
              throw new NativeError('NATIVE_UNSUPPORTED',
                `no carrier profile to project from: ${error.message}`, 422)
            }
            throw error
          }
          return op(profile, { ...body, session_id: sessionId })
        }
        return op(pick(body.profileId), { ...body, session_id: sessionId })
      }),
    },
    {
      path: ROUTE.create, methods: ['POST'], bodyLimit: 262144,
      handler: work(body => {
        if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
          throw new CarrierError('invalid-request', 'prompt is required', { status: 422 })
        }
        return api.createSession(pick(body.profileId), body)
      }),
    },
    {
      path: ROUTE.message, methods: ['POST'], bodyLimit: 65536,
      handler: work(body => {
        if (!body.session_id || typeof body.message !== 'string' || !body.message.trim()) {
          throw new CarrierError('invalid-request', 'session_id and message are required', { status: 422 })
        }
        return api.postMessage(pick(body.profileId), needSessionId(body), body.message)
      }),
    },
    { path: ROUTE.archive, methods: ['POST'], bodyLimit: 16384, handler: work(body => api.archive(pick(body.profileId), needSessionId(body))) },
    { path: ROUTE.unarchive, methods: ['POST'], bodyLimit: 16384, handler: work(body => api.unarchive(pick(body.profileId), needSessionId(body))) },
    { path: ROUTE.terminate, methods: ['POST'], bodyLimit: 16384, handler: work(body => api.terminate(pick(body.profileId), needSessionId(body))) },
    { path: ROUTE.catalog, methods: ['POST'], bodyLimit: 16384, handler: work(body => catalog(body)) },
    { path: ROUTE.upload, methods: ['POST'], bodyLimit: 33554432, handler: work(body => upload(body)) },
    {
      path: ROUTE.ssh, methods: ['POST'], bodyLimit: 16384,
      handler: work(body => {
        /* Information-only: DNT owns the terminal lane; enrolling the pubkey
           is a one-time manual step in Devin settings. Returns the dedicated
           keypair material + ready commands (spike V-11 facts: gateway drops
           `ssh -N`, so forward must ride a command channel). */
        const id = needSessionId(body)
        const kp = ensureSshKeypair()
        return { ok: true, session_id: id, ...sshCommands(id, kp), publicKey: kp.publicKey,
          enrollHint: 'paste publicKey into Devin settings → SSH keys (account-level, one-time)' }
      }),
    },
  ]

  ctx.effect(() => () => {
    for (const bridge of nativeBridges.values()) { if (bridge.timer) clearInterval(bridge.timer); try { bridge.detach?.() } catch { /* noop */ } }
    nativeBridges.clear()
  }, 'nano-cloud-session: native bridges')

  registerRoutes(ctx, SPECS, { table: BINDING_TABLE, plugin: PLUGIN, observe: event => ensurePerfReviewHost().observe(event) })
}
