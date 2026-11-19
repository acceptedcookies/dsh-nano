// src/contracts/codec-util.js
function omitUndefined(object) {
  const out = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== void 0) out[key] = value;
  }
  return out;
}

// src/providers/devin/profile-codec.js
var ProfileCodecError = class extends Error {
  constructor(message, reason = "invalid-request") {
    super(message);
    this.name = "ProfileCodecError";
    this.reason = reason;
    this.status = 422;
  }
};
function encodeCreateSession(input) {
  if (!input || typeof input !== "object") throw new ProfileCodecError("create body must be an object");
  if (typeof input.prompt !== "string" || !input.prompt.trim()) {
    throw new ProfileCodecError("prompt is required");
  }
  return omitUndefined({
    prompt: input.prompt,
    title: input.title,
    tags: input.tags,
    repos: input.repos,
    devin_mode: input.devinMode ?? input.devin_mode,
    max_acu_limit: input.maxAcuLimit ?? input.max_acu_limit,
    resumable: input.resumable,
    playbook_id: input.playbookId ?? input.playbook_id,
    knowledge_ids: input.knowledgeIds ?? input.knowledge_ids,
    attachment_urls: input.attachmentUrls ?? input.attachment_urls,
    structured_output_schema: input.structuredOutputSchema ?? input.structured_output_schema,
    structured_output_required: input.structuredOutputRequired ?? input.structured_output_required,
    platform: input.platform,
    bypass_approval: input.bypassApproval ?? input.bypass_approval,
    child_playbook_id: input.childPlaybookId ?? input.child_playbook_id,
    create_as_user_id: input.createAsUserId ?? input.create_as_user_id,
    memory_enabled: input.memoryEnabled ?? input.memory_enabled,
    secret_ids: input.secretIds ?? input.secret_ids,
    session_secrets: input.sessionSecrets ?? input.session_secrets,
    session_links: input.sessionLinks ?? input.session_links,
    security_profile: input.securityProfile ?? input.security_profile
  });
}

// src/providers/devin/api.js
var DEFAULT_TIMEOUT_MS = 2e4;
var CarrierError = class extends Error {
  constructor(reason, message, { status = 0, upstream } = {}) {
    super(message);
    this.name = "CarrierError";
    this.reason = reason;
    this.status = status;
    this.providerStatus = status;
    this.upstream = upstream;
  }
};
function classify(status) {
  if (status === 403) return "forbidden-or-invisible";
  if (status === 401) return "unauthorized";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status === 422) return "invalid-request";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "upstream-error";
  return "unexpected-status";
}
async function request(profile, { method = "GET", path, query, body, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl, signal }) {
  const base = String(profile.baseUrl).replace(/\/+$/, "");
  const url = new URL(base + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === void 0 || value === null || value === "") continue;
      if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, String(v)));
      else url.searchParams.set(key, String(value));
    }
  }
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let res;
  try {
    res = await (fetchImpl ?? fetch)(url, {
      method,
      headers: {
        authorization: `Bearer ${profile.secret}`,
        ...body !== void 0 && !isForm ? { "content-type": "application/json" } : {}
      },
      body: isForm ? body : body !== void 0 ? JSON.stringify(body) : void 0,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
      redirect: "error"
    });
  } catch (error) {
    if (signal?.aborted) signal.throwIfAborted();
    if (String(error?.message ?? "").toLowerCase().includes("redirect")) {
      throw new CarrierError("forbidden-or-invisible", "refusing to follow a cross-origin redirect with a bearer token", { status: 0 });
    }
    const reason = error?.name === "TimeoutError" || error?.name === "AbortError" ? "timeout" : "unreachable";
    throw new CarrierError(reason, `devin upstream: ${reason}`, { status: 0 });
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
  }
  if (!res.ok) {
    const reason = classify(res.status);
    const detail = json?.error?.message ?? json?.message ?? json?.detail ?? text.slice(0, 300);
    throw new CarrierError(reason, `devin ${res.status}: ${String(detail).slice(0, 300)}`, { status: res.status, upstream: json });
  }
  return json;
}
var orgPath = (profile, suffix) => `/v3/organizations/${encodeURIComponent(profile.orgId)}${suffix}`;
function sessionQuery({
  first = 50,
  after,
  tags,
  origins,
  isArchived,
  createdAfter,
  createdBefore,
  updatedAfter,
  updatedBefore,
  category,
  userIds,
  repoNames,
  devinId,
  sessionIds,
  playbookId,
  scheduleId,
  serviceUserIds,
  automationIds,
  parentSessionId
} = {}) {
  return {
    first,
    after,
    tags,
    origins,
    category,
    is_archived: isArchived,
    created_after: createdAfter,
    created_before: createdBefore,
    updated_after: updatedAfter,
    updated_before: updatedBefore,
    user_ids: userIds,
    repo_names: repoNames,
    devin_id: devinId,
    session_ids: sessionIds,
    playbook_id: playbookId,
    schedule_id: scheduleId,
    service_user_ids: serviceUserIds,
    automation_ids: automationIds,
    parent_session_id: parentSessionId
  };
}
function createDevinApi({ timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl } = {}) {
  const call = (profile, spec) => request(profile, { timeoutMs, fetchImpl, ...spec });
  return {
    self: (profile) => call(profile, { path: "/v3/self" }),
    listSessions: (profile, params = {}) => call(profile, {
      path: orgPath(profile, "/sessions"),
      query: sessionQuery(params)
    }),
    listSessionsInsights: (profile, params = {}) => call(profile, {
      path: orgPath(profile, "/sessions/insights"),
      query: sessionQuery(params)
    }),
    getSession: (profile, id, { signal } = {}) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}`), signal }),
    getMessages: (profile, id, { first = 100, after, signal } = {}) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/messages`), query: { first, after }, signal }),
    getAttachments: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/attachments`) }),
    getInsights: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/insights`) }),
    generateInsights: (profile, id) => call(profile, { method: "POST", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/insights/generate`) }),
    getTags: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/tags`) }),
    listPlaybooks: (profile, { first = 100, after, includeEnterprise = true } = {}) => call(profile, { path: orgPath(profile, "/playbooks"), query: { first, after, include_enterprise: includeEnterprise } }),
    listSecrets: (profile, { first = 100, after } = {}) => call(profile, { path: orgPath(profile, "/secrets"), query: { first, after } }),
    listKnowledgeNotes: (profile, { first = 100, after, search, folderPath, pinnedRepo } = {}) => call(profile, { path: orgPath(profile, "/knowledge/notes"), query: { first, after, search, folder_path: folderPath, pinned_repo: pinnedRepo } }),
    listRepositories: (profile, { first = 100, after, filterName, loadIndexingStatus = false } = {}) => call(profile, { path: orgPath(profile, "/repositories"), query: { first, after, filter_name: filterName, load_indexing_status: loadIndexingStatus } }),
    uploadAttachment: (profile, { name, contentType, bytes }) => {
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: contentType || "application/octet-stream" }), name);
      return call(profile, { method: "POST", path: orgPath(profile, "/attachments"), body: form });
    },
    createSession: (profile, input) => call(profile, { method: "POST", path: orgPath(profile, "/sessions"), body: encodeCreateSession(input) }),
    postMessage: (profile, id, message, { signal } = {}) => call(profile, {
      method: "POST",
      path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/messages`),
      body: { message },
      signal
    }),
    setTags: (profile, id, tags) => call(profile, { method: "PUT", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/tags`), body: { tags } }),
    appendTags: (profile, id, tags) => call(profile, { method: "POST", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/tags`), body: { tags } }),
    sleep: (profile, id) => call(profile, { method: "POST", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/sleep`) }),
    archive: (profile, id) => call(profile, { method: "POST", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/archive`) }),
    unarchive: (profile, id) => call(profile, { method: "POST", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/unarchive`) }),
    terminate: (profile, id) => call(profile, { method: "DELETE", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}`) })
  };
}
export {
  CarrierError,
  createDevinApi
};
