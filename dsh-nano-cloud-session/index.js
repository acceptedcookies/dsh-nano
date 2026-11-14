/** Host half. Carrier credentials and every upstream call stay here; the
 *  browser only ever talks to /nano-cloud-session/* same-origin routes and
 *  never sees a token. Canonical state lives at the carrier (Devin cloud);
 *  this host keeps only the profile store + consumption receipts — 单一真源. */

import { readFileSync } from 'node:fs'
import { ensurePerfReviewHost, LIB_VERSION } from './lib/perf-review-host.js'
import { createDevinApi, CarrierError } from './lib/devin-api.js'
import { createProfileStore } from './lib/profiles-store.js'
import { registerRoutes, sendJson, readJsonBody } from './lib/route-guard.js'
import { ROUTE_TABLE, PLUGIN } from './lib/route-table.js'

export const name = 'nano-cloud-session'
export const inject = ['webServer', 'connection']

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const review = ensurePerfReviewHost().hostJoin('nano-cloud-session', { version, libVersion: LIB_VERSION })

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
        sendJson(res, error.status >= 400 && error.status < 500 ? error.status : 502,
          { ok: false, reason: error.reason, message: error.message.slice(0, 300), status: error.status })
      } else {
        sendJson(res, 500, { ok: false, reason: 'failed', message: messageOf(error).slice(0, 300) })
      }
    }
  }

  /* ---- profile management (secrets write-only) ---- */

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
        return { ok: true, self }
      }
      default:
        throw new CarrierError('invalid-request', `unknown config action ${action}`, { status: 422 })
    }
  }

  /* ---- session surface ---- */

  const sessionOps = {
    get: (profile, body) => api.getSession(profile, String(body.session_id)),
    messages: (profile, body) => api.getMessages(profile, String(body.session_id), { first: body.first, after: body.after }),
    attachments: (profile, body) => api.getAttachments(profile, String(body.session_id)),
    insights: (profile, body) => api.getInsights(profile, String(body.session_id)),
    tags: (profile, body) => api.getTags(profile, String(body.session_id)),
    set_tags: (profile, body) => api.setTags(profile, String(body.session_id), body.tags),
  }

  const SPECS = [
    { path: ROUTE.status, methods: ['POST'], bodyLimit: 16384, handler: work(() => configAction({ action: 'list' })) },
    { path: ROUTE.config, methods: ['POST'], bodyLimit: 16384, handler: work(body => configAction(body)) },
    {
      path: ROUTE.sessions, methods: ['POST'], bodyLimit: 65536,
      handler: work(body => {
        const profile = pick(body.profileId)
        const op = String(body.op ?? 'list')
        if (op !== 'list') throw new CarrierError('invalid-request', `unknown sessions op ${op}`, { status: 422 })
        return review.hostSpan('sessions', () => api.listSessions(profile, {
          first: body.first ?? defaultFirst, after: body.after,
          tags: body.tags, origins: body.origins, isArchived: body.is_archived,
          createdAfter: body.created_after, createdBefore: body.created_before,
          category: body.category, userIds: body.user_ids, repoNames: body.repo_names,
          devinId: body.devin_id,
        }))
      }),
    },
    {
      path: ROUTE.session, methods: ['POST'], bodyLimit: 65536,
      handler: work(body => {
        const op = sessionOps[String(body.op ?? 'get')]
        if (!op) throw new CarrierError('invalid-request', `unknown session op ${body.op}`, { status: 422 })
        if (!body.session_id) throw new CarrierError('invalid-request', 'session_id is required', { status: 422 })
        return op(pick(body.profileId), body)
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
        return api.postMessage(pick(body.profileId), String(body.session_id), body.message)
      }),
    },
    { path: ROUTE.archive, methods: ['POST'], bodyLimit: 16384, handler: work(body => api.archive(pick(body.profileId), String(body.session_id))) },
    { path: ROUTE.unarchive, methods: ['POST'], bodyLimit: 16384, handler: work(body => api.unarchive(pick(body.profileId), String(body.session_id))) },
    { path: ROUTE.terminate, methods: ['POST'], bodyLimit: 16384, handler: work(body => api.terminate(pick(body.profileId), String(body.session_id))) },
    {
      path: ROUTE.ssh, methods: ['POST'], bodyLimit: 16384,
      handler: work(body => {
        /* The SSH lane is information-only here: the terminal lane belongs to
           DNT, and enrolling the public key is a manual step in the Devin
           settings. This route hands the client everything needed to build
           the command — it does not spawn ssh itself. */
        const id = String(body.session_id ?? '')
        if (!id.startsWith('devin-')) throw new CarrierError('invalid-request', 'session_id must look like devin-…', { status: 422 })
        return { ok: true, session_id: id, command: `ssh ${id}@ssh.devin.ai`, forwardHint: `ssh -L <local>:127.0.0.1:<remote> ${id}@ssh.devin.ai '<command>' — keep a command channel open; the gateway drops ssh -N`, enrolledKeyHint: 'enroll the public key under your Devin account settings → SSH keys; one enrollment covers every session you own' }
      }),
    },
  ]

  registerRoutes(ctx, SPECS, { table: ROUTE_TABLE, plugin: PLUGIN })
}
