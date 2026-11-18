/** Devin REST v3 adapter. Upstream dialect is not redefined here. */

import { encodeCreateSession } from './profile-codec.js'

const DEFAULT_TIMEOUT_MS = 20000

export class CarrierError extends Error {
  constructor(reason, message, { status = 0, upstream } = {}) {
    super(message)
    this.name = 'CarrierError'
    this.reason = reason
    this.status = status
    this.providerStatus = status
    this.upstream = upstream
  }
}

function classify(status) {
  if (status === 403) return 'forbidden-or-invisible'
  if (status === 401) return 'unauthorized'
  if (status === 404) return 'not-found'
  if (status === 409) return 'conflict'
  if (status === 422) return 'invalid-request'
  if (status === 429) return 'rate-limited'
  if (status >= 500) return 'upstream-error'
  return 'unexpected-status'
}

async function request(profile, { method = 'GET', path, query, body, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl }) {
  const base = String(profile.baseUrl).replace(/\/+$/, '')
  const url = new URL(base + path)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      if (Array.isArray(value)) value.forEach(v => url.searchParams.append(key, String(v)))
      else url.searchParams.set(key, String(value))
    }
  }
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  let res
  try {
    res = await (fetchImpl ?? fetch)(url, {
      method,
      headers: {
        authorization: `Bearer ${profile.secret}`,
        ...(body !== undefined && !isForm ? { 'content-type': 'application/json' } : {}),
      },
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    })
  } catch (error) {
    if (String(error?.message ?? '').toLowerCase().includes('redirect')) {
      throw new CarrierError('forbidden-or-invisible', 'refusing to follow a cross-origin redirect with a bearer token', { status: 0 })
    }
    const reason = error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : 'unreachable'
    throw new CarrierError(reason, `devin upstream: ${reason}`, { status: 0 })
  }
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const reason = classify(res.status)
    const detail = json?.error?.message ?? json?.message ?? json?.detail ?? text.slice(0, 300)
    throw new CarrierError(reason, `devin ${res.status}: ${String(detail).slice(0, 300)}`, { status: res.status, upstream: json })
  }
  return json
}

const orgPath = (profile, suffix) => `/v3/organizations/${encodeURIComponent(profile.orgId)}${suffix}`

function sessionQuery({
  first = 50, after, tags, origins, isArchived, createdAfter, createdBefore,
  updatedAfter, updatedBefore, category, userIds, repoNames, devinId,
  sessionIds, playbookId, scheduleId, serviceUserIds, automationIds, parentSessionId,
} = {}) {
  return {
    first, after, tags, origins, category,
    is_archived: isArchived,
    created_after: createdAfter, created_before: createdBefore,
    updated_after: updatedAfter, updated_before: updatedBefore,
    user_ids: userIds, repo_names: repoNames,
    devin_id: devinId, session_ids: sessionIds,
    playbook_id: playbookId, schedule_id: scheduleId,
    service_user_ids: serviceUserIds, automation_ids: automationIds,
    parent_session_id: parentSessionId,
  }
}

export function createDevinApi({ timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl } = {}) {
  const call = (profile, spec) => request(profile, { timeoutMs, fetchImpl, ...spec })

  return {
    self: (profile) => call(profile, { path: '/v3/self' }),
    listSessions: (profile, params = {}) => call(profile, {
      path: orgPath(profile, '/sessions'),
      query: sessionQuery(params),
    }),
    listSessionsInsights: (profile, params = {}) => call(profile, {
      path: orgPath(profile, '/sessions/insights'),
      query: sessionQuery(params),
    }),
    getSession: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}`) }),
    getMessages: (profile, id, { first = 100, after } = {}) =>
      call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/messages`), query: { first, after } }),
    getAttachments: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/attachments`) }),
    getInsights: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/insights`) }),
    generateInsights: (profile, id) => call(profile, { method: 'POST', path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/insights/generate`) }),
    getTags: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/tags`) }),
    listPlaybooks: (profile, { first = 100, after, includeEnterprise = true } = {}) =>
      call(profile, { path: orgPath(profile, '/playbooks'), query: { first, after, include_enterprise: includeEnterprise } }),
    listSecrets: (profile, { first = 100, after } = {}) =>
      call(profile, { path: orgPath(profile, '/secrets'), query: { first, after } }),
    listKnowledgeNotes: (profile, { first = 100, after, search, folderPath, pinnedRepo } = {}) =>
      call(profile, { path: orgPath(profile, '/knowledge/notes'), query: { first, after, search, folder_path: folderPath, pinned_repo: pinnedRepo } }),
    listRepositories: (profile, { first = 100, after, filterName, loadIndexingStatus = false } = {}) =>
      call(profile, { path: orgPath(profile, '/repositories'), query: { first, after, filter_name: filterName, load_indexing_status: loadIndexingStatus } }),
    uploadAttachment: (profile, { name, contentType, bytes }) => {
      const form = new FormData()
      form.append('file', new Blob([bytes], { type: contentType || 'application/octet-stream' }), name)
      return call(profile, { method: 'POST', path: orgPath(profile, '/attachments'), body: form })
    },
    createSession: (profile, input) =>
      call(profile, { method: 'POST', path: orgPath(profile, '/sessions'), body: encodeCreateSession(input) }),
    postMessage: (profile, id, message) =>
      call(profile, {
        method: 'POST', path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/messages`),
        body: { message },
      }),
    setTags: (profile, id, tags) =>
      call(profile, { method: 'PUT', path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/tags`), body: { tags } }),
    appendTags: (profile, id, tags) =>
      call(profile, { method: 'POST', path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/tags`), body: { tags } }),
    sleep: (profile, id) => call(profile, { method: 'POST', path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/sleep`) }),
    archive: (profile, id) => call(profile, { method: 'POST', path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/archive`) }),
    unarchive: (profile, id) => call(profile, { method: 'POST', path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/unarchive`) }),
    terminate: (profile, id) => call(profile, { method: 'DELETE', path: orgPath(profile, `/sessions/${encodeURIComponent(id)}`) }),
  }
}
