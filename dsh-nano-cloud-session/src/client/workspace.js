/** Three independent health faces for one cloud workspace. */

export const API_STATES = Object.freeze(['unknown', 'checking', 'ready', 'unavailable'])
export const RESOURCE_STATES = Object.freeze(['disconnected', 'connecting', 'verifying', 'ready', 'closing', 'unavailable'])
export const NATIVE_STATES = Object.freeze(['unavailable', 'opening', 'ready', 'closing'])

export function emptyHealth() {
  return { api: 'unknown', resources: 'disconnected', nativeView: 'unavailable', remoteSessionStatus: null, scopeId: null, error: '' }
}

export function applyHealth(current, patch) {
  const next = { ...emptyHealth(), ...current, ...patch }
  if (!API_STATES.includes(next.api)) next.api = 'unknown'
  if (!RESOURCE_STATES.includes(next.resources)) next.resources = 'disconnected'
  if (!NATIVE_STATES.includes(next.nativeView)) next.nativeView = 'unavailable'
  return next
}
