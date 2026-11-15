/** Media-generation engine state: host routes plus a localStorage cache for instant paint. */
import { jsonOp, call } from './jsonClient.js'

const CACHE_KEY = 'dsh-nano-model-selector:media-engine.v1'

const ENGINES_OP = jsonOp({ method: 'GET', url: '/nano-model-selector/media-engines' })
const ENGINE_GET_OP = jsonOp({ method: 'GET', url: '/nano-model-selector/media-engine' })
const ENGINE_PUT_OP = jsonOp({ method: 'PUT', url: '/nano-model-selector/media-engine' })

/** @returns {string | null} the last confirmed engine choice, or null. */
export function readEngineCache() {
  try {
    const value = window.localStorage.getItem(CACHE_KEY)
    return typeof value === 'string' && value ? value : null
  } catch {
    return null
  }
}

/** @param {string | null} key persist the confirmed engine choice locally. */
export function writeEngineCache(key) {
  try {
    if (typeof key === 'string' && key) window.localStorage.setItem(CACHE_KEY, key)
    else window.localStorage.removeItem(CACHE_KEY)
  } catch { /* private-mode storage — cache is best-effort only */ }
}

/** @returns {Promise<{engines: Array}>} detected engines. */
export async function fetchEngines() {
  return call(ENGINES_OP)
}

/** @returns {Promise<string | null>} the engine persisted on the host. */
export async function fetchEngine() {
  const value = await call(ENGINE_GET_OP)
  return typeof value?.engine === 'string' ? value.engine : null
}

/** @param {string} key @returns {Promise<void>} */
export async function selectEngine(key) {
  await call(ENGINE_PUT_OP, { engine: key })
  writeEngineCache(key)
}
