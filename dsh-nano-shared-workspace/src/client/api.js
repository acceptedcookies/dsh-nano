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
