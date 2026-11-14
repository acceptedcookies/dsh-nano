/** devin-cloud-session carrier client — REST v3 over https://api.devin.ai.
 *
 *  Facts verified by test/spike/cloud-session-devin (V-01..V-16, api PASS):
 *  - PAT (`cog_…`) is a Bearer token; org endpoints carry the org in the path,
 *    no X-Org-Id header needed.
 *  - Error dialect: missing/garbage auth AND nonexistent session both → 403
 *    (fail-closed invisibility; docs claim 401/404). Wrong org → 404.
 *    Malformed param → 422. So `403` means "forbidden or invisible" — callers
 *    must not assume the session does not exist.
 *  - DELETE is suspend/terminate (live session → suspended/user_request),
 *    NOT a hard delete and NOT an implicit archive: the record stays
 *    readable; call /archive to close it out. UI must say 终止/中止.
 *  - List pagination: cursor `after`, `first` ≤ 200 (else 422); visible
 *    domain is the caller's own sessions (PAT = personal scope).
 *  - `repos` on create is shallow-validated: accepted silently, not echoed.
 */

const DEFAULT_TIMEOUT_MS = 20000

/** A carrier-level failure with a stable `reason` for the client to switch on. */
export class CarrierError extends Error {
  constructor(reason, message, { status = 0, upstream } = {}) {
    super(message)
    this.name = 'CarrierError'
    this.reason = reason
    this.status = status
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
  let res
  try {
    res = await (fetchImpl ?? fetch)(url, {
      method,
      headers: {
        authorization: `Bearer ${profile.secret}`,
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
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

export function createDevinApi({ timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl } = {}) {
  const call = (profile, spec) => request(profile, { timeoutMs, fetchImpl, ...spec })

  return {
    /** Connection test: who am I, which org does this PAT resolve to. */
    self: (profile) => call(profile, { path: '/v3/self' }),

    listSessions: (profile, { first = 50, after, tags, origins, isArchived, createdAfter, createdBefore, category, userIds, repoNames, devinId } = {}) =>
      call(profile, {
        path: orgPath(profile, '/sessions'),
        query: {
          first, after, tags, origins, category,
          is_archived: isArchived,
          created_after: createdAfter, created_before: createdBefore,
          user_ids: userIds, repo_names: repoNames,
          devin_id: devinId,
        },
      }),

    getSession: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}`) }),

    getMessages: (profile, id, { first = 100, after } = {}) =>
      call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/messages`), query: { first, after } }),

    getAttachments: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/attachments`) }),
    getInsights: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/insights`) }),
    getTags: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/tags`) }),

    createSession: (profile, input) =>
      call(profile, {
        method: 'POST', path: orgPath(profile, '/sessions'),
        body: {
          prompt: input.prompt,
          title: input.title,
          tags: input.tags,
          repos: input.repos,
          devin_mode: input.devinMode,
          max_acu_limit: input.maxAcuLimit,
          resumable: input.resumable,
          playbook_id: input.playbookId,
          knowledge_ids: input.knowledgeIds,
          attachment_urls: input.attachmentUrls,
          structured_output_schema: input.structuredOutputSchema,
          structured_output_required: input.structuredOutputRequired,
          platform: input.platform,
        },
      }),

    postMessage: (profile, id, message) =>
      call(profile, {
        method: 'POST', path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/messages`),
        body: { message },
      }),

    setTags: (profile, id, tags) =>
      call(profile, {
        method: 'PUT', path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/tags`),
        body: { tags },
      }),

    archive: (profile, id) => call(profile, { method: 'POST', path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/archive`) }),
    unarchive: (profile, id) => call(profile, { method: 'POST', path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/unarchive`) }),
    /** Terminate + archive. NOT a hard delete: the record stays readable. */
    terminate: (profile, id) => call(profile, { method: 'DELETE', path: orgPath(profile, `/sessions/${encodeURIComponent(id)}`) }),
  }
}
