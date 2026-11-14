/** L1 backend surface. Not an L2 contract. 11 capability rows, 13 methods. */

export const BACKEND_METHODS = Object.freeze([
  'ensureImage',
  'create',
  'start',
  'stop',
  'restart',
  'inspect',
  'exec',
  'publish',
  'mount',
  'networkPolicy',
  'identity',
  'stateVolume',
  'capabilities',
])

export const PUBLIC_KEYS = Object.freeze([
  'image',
  'mounts',
  'ports',
  'resources',
  'network',
  'identity',
])

const APPLE_NOUNS = new Set(['container', 'vmnet', 'virtiofs', 'kitesurf'])

export function assertPublicSpec(spec) {
  if (spec == null) return
  if (typeof spec !== 'object' || Array.isArray(spec)) {
    throw new Error('backend spec must be a plain object')
  }
  for (const [key, value] of Object.entries(spec)) {
    if (APPLE_NOUNS.has(String(key))) {
      throw new Error(`backend public spec rejects apple noun key: ${key}`)
    }
    if (!PUBLIC_KEYS.includes(key)) {
      throw new Error(`backend public spec rejects key: ${key}`)
    }
    walkValue(value)
  }
}

function walkValue(value) {
  if (typeof value === 'string' && APPLE_NOUNS.has(value)) {
    throw new Error(`backend public spec rejects apple noun value: ${value}`)
  }
  if (Array.isArray(value)) {
    for (const item of value) walkValue(item)
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      if (APPLE_NOUNS.has(String(key))) {
        throw new Error(`backend public spec rejects apple noun key: ${key}`)
      }
      walkValue(inner)
    }
  }
}

/** Same key tree on every backend. Values may differ; keys may not. */
export function capabilityReport() {
  return {
    ensureImage: true,
    create: true,
    start: true,
    stop: true,
    restart: true,
    inspect: true,
    exec: { stdin: true },
    publish: true,
    mount: true,
    networkPolicy: true,
    identity: true,
    stateVolume: true,
  }
}
