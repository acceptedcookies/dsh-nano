/** POST helpers against the plugin's own host routes. The browser never
 *  holds a carrier token; every call is same-origin JSON. */

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  let json = null
  try { json = await res.json() } catch { /* fallthrough */ }
  if (!res.ok || !json || json.ok === false) {
    const error = new Error(json?.message ?? `HTTP ${res.status}`)
    error.reason = json?.reason ?? 'failed'
    error.httpStatus = res.status
    error.providerStatus = json?.providerStatus ?? json?.status
    error.status = res.status
    if (json?.fingerprint) error.fingerprint = json.fingerprint
    if (json?.keyKind) error.keyKind = json.keyKind
    throw error
  }
  return json
}

export const api = {
  status: () => post('/nano-cloud-session/status'),
  config: (action, extra = {}) => post('/nano-cloud-session/config', { action, ...extra }),
  sessions: (params = {}) => post('/nano-cloud-session/sessions', { op: 'list', is_archived: params.is_archived ?? params.isArchived, ...params }),
  sessionsInsights: (params = {}) => post('/nano-cloud-session/sessions', { op: 'insights', ...params }),
  session: (op, params = {}) => post('/nano-cloud-session/session', { op, ...params }),
  externalAttachments: (session_id) => post('/nano-cloud-session/session', { op: 'external_attachments', session_id }),
  nativeOpen: (session_id, extra = {}) => post('/nano-cloud-session/session', { op: 'native_open', session_id, ...extra }),
  catalog: (resource, params = {}) => post('/nano-cloud-session/catalog', { resource, ...params }),
  upload: (name, contentType, dataBase64, extra = {}) => post('/nano-cloud-session/upload', { name, content_type: contentType, data_base64: dataBase64, ...extra }),
  create: (input) => post('/nano-cloud-session/create', input),
  message: (session_id, message, extra = {}) => post('/nano-cloud-session/message', { session_id, message, ...extra }),
  archive: (session_id, extra = {}) => post('/nano-cloud-session/archive', { session_id, ...extra }),
  unarchive: (session_id, extra = {}) => post('/nano-cloud-session/unarchive', { session_id, ...extra }),
  terminate: (session_id, extra = {}) => post('/nano-cloud-session/terminate', { session_id, ...extra }),
  ssh: (session_id) => post('/nano-cloud-session/ssh', { session_id }),
  workspace: (op, params = {}) => post('/nano-cloud-session/workspace', { op, ...params }),
  resources: (op, params = {}) => post('/nano-cloud-session/resources', { op, ...params }),
}

export function pluginRouteGone(error) {
  const http = error?.httpStatus ?? error?.status
  return (http === 404 || http === 405) && (error?.reason == null || error.reason === 'failed')
}
