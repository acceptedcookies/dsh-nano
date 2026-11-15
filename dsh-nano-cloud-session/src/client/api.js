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
    error.status = json?.status ?? res.status
    throw error
  }
  return json
}

export const api = {
  status: () => post('/nano-cloud-session/status'),
  config: (action, extra = {}) => post('/nano-cloud-session/config', { action, ...extra }),
  sessions: (params = {}) => post('/nano-cloud-session/sessions', { op: 'list', ...params }),
  sessionsInsights: (params = {}) => post('/nano-cloud-session/sessions', { op: 'insights', ...params }),
  session: (op, params = {}) => post('/nano-cloud-session/session', { op, ...params }),
  nativeOpen: (session_id) => post('/nano-cloud-session/session', { op: 'native_open', session_id }),
  catalog: (resource, params = {}) => post('/nano-cloud-session/catalog', { resource, ...params }),
  upload: (name, contentType, dataBase64) => post('/nano-cloud-session/upload', { name, content_type: contentType, data_base64: dataBase64 }),
  create: (input) => post('/nano-cloud-session/create', input),
  message: (session_id, message) => post('/nano-cloud-session/message', { session_id, message }),
  archive: (session_id) => post('/nano-cloud-session/archive', { session_id }),
  unarchive: (session_id) => post('/nano-cloud-session/unarchive', { session_id }),
  terminate: (session_id) => post('/nano-cloud-session/terminate', { session_id }),
  ssh: (session_id) => post('/nano-cloud-session/ssh', { session_id }),
}
