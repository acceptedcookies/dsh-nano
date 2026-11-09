/** Media-generation engine state: host routes plus a localStorage cache for instant paint. */

const CACHE_KEY = 'dsh-nano-model-selector:media-engine.v1'

/** @returns {string | null} the last confirmed engine choice, or null. */
export function readEngineCache() {
  try {
    const value = window.localStorage.getItem(CACHE_KEY)
    return value === null || value === '' ? null : value
  } catch {
    return null
  }
}

/** @param {string | null} key */
export function writeEngineCache(key) {
  try {
    if (key === null) window.localStorage.removeItem(CACHE_KEY)
    else window.localStorage.setItem(CACHE_KEY, key)
  } catch { /* storage may be unavailable; the host file is the source of truth */ }
}

/** @returns {Promise<{ engines: Array<{ key: string, label: string, detail: string, path: string | null, available: boolean }> }>} */
export async function fetchEngines() {
  const response = await fetch('/nano-model-selector/media-engines', { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

/** @returns {Promise<string | null>} the engine persisted on the host. */
export async function fetchEngine() {
  const response = await fetch('/nano-model-selector/media-engine', { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const value = await response.json()
  return typeof value?.engine === 'string' ? value.engine : null
}

/** @param {string} key @returns {Promise<void>} */
export async function selectEngine(key) {
  const response = await fetch('/nano-model-selector/media-engine', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ engine: key }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  writeEngineCache(key)
}
