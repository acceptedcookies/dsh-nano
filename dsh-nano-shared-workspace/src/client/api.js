/** Host route calls. Every response is JSON; failures carry `error`. */

const PREFIX = '/nano-shared-workspace'

async function call(path, init) {
  const response = await fetch(`${PREFIX}${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...init,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : `HTTP ${response.status}`)
  }
  return body
}

export const fetchSettings = () => call('/settings')
export const fetchStatus = () => call('/status')

export function testSettings({ username, token, accessKey }) {
  return call('/settings/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, token, accessKey }),
  }).then(response => {
    if (response?.ok !== true) throw new Error(response?.error ?? 'bucket probe failed')
    return response
  })
}

export function saveSettings({ username, token, accessKey }) {
  return call('/settings/update', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, token, accessKey }),
  })
}

export function clearSettings() {
  return call('/settings/clear', { method: 'POST' })
}

export const fetchSharedWorkspaces = () => call('/workspaces')

export function createWorkspace(name, localPath, requestId) {
  return call('/workspaces/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, localPath, requestId }),
  })
}

export function joinWorkspace(workspaceId, localPath) {
  return call('/workspaces/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceId, localPath }),
  })
}

/** Delete the cloud marker. The local replica directory is left in place. */
export function deleteWorkspace(workspaceId) {
  return call('/workspaces/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceId }),
  }).then(response => {
    if (response?.ok !== true) throw new Error(response?.error ?? 'delete failed')
    return response
  })
}

export const triggerSync = () => call('/sync', { method: 'POST' })

/** Host-side mkdir — independent of the optional directoryPicker/browse backend. */
export function createDirectory(parent, name) {
  return call('/mkdir', { method: 'POST', body: JSON.stringify({ parent, name }) })
    .then(response => {
      if (response?.ok !== true) throw new Error(response?.error ?? 'mkdir failed')
      return response.path
    })
}

/** Host-side one-level listing matching the DirectoryListing shape. */
export const listDirectory = path =>
  call('/ls', { method: 'POST', body: JSON.stringify(path === undefined ? {} : { path }) })
export const fetchRemoteSessions = () => call('/sessions')

/** Write a shared session into the local session tree and return `{sessionId, cwd, path}`. */
export function pullWorkspace(workspaceId) {
  return call('/tree/pull', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceId }),
  }).then(response => {
    if (response?.ok !== true) throw new Error(response?.error ?? 'pull failed')
    return response
  })
}

export function bindSession(path, sessionId) {
  return call('/sessions/bind', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path, sessionId }),
  }).then(response => {
    if (response?.ok !== true) throw new Error(response?.error ?? 'bind failed')
    return response
  })
}

export function claimSession(workspaceId, sessionId) {
  return call('/sessions/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceId, sessionId }),
  }).then(response => {
    if (response?.busy === true) return response
    if (response?.ok !== true) throw new Error(response?.error ?? 'claim failed')
    return response
  })
}

export function heartbeatSession(workspaceId, sessionId) {
  return call('/sessions/heartbeat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceId, sessionId }),
  })
}

export function materializeSession(workspaceId, sessionId) {
  return call('/materialize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceId, sessionId }),
  }).then(response => {
    if (response?.ok !== true) throw new Error(response?.error ?? 'materialize failed')
    return response
  })
}

export function fetchTranscript(workspaceId, sessionId) {
  return call('/transcript', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceId, sessionId }),
  })
}
