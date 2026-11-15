/** Browser-side fetch helpers for the async-compaction takeover panel (-20). */

const BASE = '/nano-model-selector/async-compact'

/** GET the stored policy + derived read-only fields + bundle projection. */
export async function fetchCompactState() {
  const response = await fetch(BASE, { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) return null
  const data = await response.json()
  return data?.ok === true ? data : null
}

/** PUT a partial policy update. Returns the updated payload or throws the error reason. */
export async function putCompactPolicy(patch) {
  const response = await fetch(BASE, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.ok !== true) {
    const error = new Error(data?.error?.reason ?? `PUT ${response.status}`)
    error.code = data?.error?.code ?? `HTTP-${response.status}`
    throw error
  }
  return data // {ok, policy:{…, effective, runtime}, bundle} — caller merges, no refetch
}

/**
 * -20⑦: the panel's only write path for the takeover toggle.
 * @returns {{application:'applied'|'restart-required'|'overridden', restartReason?}}
 */
export async function postCompactSwitch(enabled) {
  const response = await fetch(`${BASE}/switch`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.ok !== true) {
    const error = new Error(data?.error?.reason ?? `POST ${response.status}`)
    error.code = data?.error?.code
    throw error
  }
  return data
}
