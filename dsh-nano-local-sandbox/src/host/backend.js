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

const APPLE_NOUNS = new Set(['container', 'vmnet', 'virtiofs'])

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
export function capabilityReport(supported = true) {
  return {
    ensureImage: supported,
    create: supported,
    start: supported,
    stop: supported,
    restart: supported,
    inspect: supported,
    exec: { stdin: supported },
    publish: supported,
    mount: supported,
    networkPolicy: supported,
    identity: supported,
    stateVolume: supported,
  }
}

/**
 * Per-action provider support gate — honest flags AND callable deps:
 * - every action needs `capabilities().inspect === true` and a callable
 *   `observe` (the supplied seam overrides `backend.observe`, so standalone
 *   composition tests that inject an observer satisfy it equivalently);
 * - create needs the create flag + `createManaged`; start/stop their flag +
 *   method; restart is the kernel's stop+start — flag plus both callables;
 * - remove needs a callable `remove`; recreate = remove + create + stop;
 * - read surfaces ('list'/'read') need only the base; 'processes' needs a
 *   callable `processes`, 'terminal' the exec.stdin flag + `terminalRpc`,
 *   'usage' a callable `sampleUsage`.
 * A backend without `capabilities()` supports nothing — fixtures declare
 * honest reports rather than defaulting to a full provider.
 */
export function supportsAction(backend, action, { observe } = {}) {
  const caps = typeof backend?.capabilities === 'function' ? backend.capabilities() : null
  const observer = observe ?? backend?.observe
  if (caps?.inspect !== true || typeof observer !== 'function') return false
  const callable = (name) => typeof backend?.[name] === 'function'
  switch (action) {
    case 'create':
      // A managed create needs the verified image evidence seam, not just
      // a callable create path — real profiles refuse to verify without it.
      return caps.create === true && callable('createManaged') && callable('imageEvidence')
    case 'start':
      return caps.start === true && callable('start')
    case 'stop':
      return caps.stop === true && callable('stop')
    case 'restart':
      // restart is composite: the provider must honestly advertise stop
      // AND start, not a restart flag alone.
      return caps.restart === true && caps.stop === true && caps.start === true &&
        callable('stop') && callable('start')
    case 'remove':
      return callable('remove')
    case 'logs':
      return callable('logs')
    case 'recreate':
      return supportsAction(backend, 'remove', { observe: observer }) &&
        supportsAction(backend, 'create', { observe: observer }) &&
        supportsAction(backend, 'stop', { observe: observer })
    case 'processes':
      return callable('processes')
    case 'terminal':
      return caps.exec?.stdin === true && callable('terminalRpc')
    case 'usage':
      return callable('sampleUsage')
    case 'list':
    case 'read':
      return true
    default:
      return false
  }
}
