/**
 * Web-binding contract vocabulary (pure definitions — no I/O, no node:*,
 * no DOM, no Cordis, no mutable store). Consumed by `host/createWebRegistrar`
 * and by `build` baking; the same axis vocabulary is shared by all three.
 *
 * Binding = one declared web surface row keyed by a stable `id`:
 *   { id, plugin, channel, match, path, methods, sessionBinding?,
 *     bodyLimit?, sensitivity?, capability?, justification?, handler }
 *
 * Axes (frozen, Q6 / T-O-CF1115-11):
 *   channel : 'http' | 'upgrade'
 *   match   : 'exact' | 'prefix'   ('upgrade' only permits 'exact')
 */

/** Contract-local error; pure (no IO). Registrar may re-wrap. */
export class BindingError extends Error {
  constructor(reason, detail = '') {
    super(detail ? `web-binding: ${reason} — ${detail}` : `web-binding: ${reason}`)
    this.name = 'BindingError'
    this.reason = reason
  }
}

export const CHANNEL = Object.freeze({ HTTP: 'http', UPGRADE: 'upgrade' })
export const MATCH = Object.freeze({ EXACT: 'exact', PREFIX: 'prefix' })

const CHANNELS = new Set(Object.values(CHANNEL))
const MATCHES = new Set(Object.values(MATCH))

/**
 * Normalize + validate one binding declaration. Throws BindingError on any
 * violation. Returns a frozen normalized record (handler retained on the
 * record — it is metadata the registrar dispatches to, not a public field).
 */
export function normalizeBinding(binding, { plugin } = {}) {
  if (!binding || typeof binding !== 'object') {
    throw new BindingError('binding-invalid', 'every binding must be an object')
  }
  const b = binding
  if (typeof b.id !== 'string' || b.id === '') {
    throw new BindingError('binding-invalid', 'every binding needs a stable non-empty `id`')
  }
  if (!CHANNELS.has(b.channel)) {
    throw new BindingError('binding-invalid', `${b.id}: channel must be one of ${[...CHANNELS].join('/')}`)
  }
  const match = b.match ?? MATCH.EXACT
  if (!MATCHES.has(match)) {
    throw new BindingError('binding-invalid', `${b.id}: match must be one of ${[...MATCHES].join('/')}`)
  }
  if (b.channel === CHANNEL.UPGRADE && match !== MATCH.EXACT) {
    throw new BindingError('binding-invalid', `${b.id}: upgrade channel requires match=exact`)
  }
  if (typeof b.path !== 'string' || !b.path.startsWith('/')) {
    throw new BindingError('binding-invalid', `${b.id}: path must be a string starting with '/'`)
  }
  const methods = b.channel === CHANNEL.UPGRADE
    ? Object.freeze([...(b.methods ?? ['GET'])].map(m => String(m).toUpperCase()))
    : (() => {
        const ms = Array.isArray(b.methods) && b.methods.length
          ? b.methods.map(m => String(m).toUpperCase())
          : (b.method !== undefined ? [String(b.method).toUpperCase()] : [])
        if (ms.length === 0) throw new BindingError('binding-invalid', `${b.id}: declare method or methods`)
        return Object.freeze(ms)
      })()
  if (typeof b.handler !== 'function') {
    throw new BindingError('binding-invalid', `${b.id}: handler must be a function`)
  }
  return Object.freeze({
    id: b.id,
    plugin: b.plugin ?? plugin,
    channel: b.channel,
    match,
    path: b.path,
    methods,
    bodyLimit: b.bodyLimit,
    sensitivity: b.sensitivity,
    capability: b.capability,
    sessionBinding: b.sessionBinding,
    justification: b.justification,
    handler: b.handler,
  })
}

/**
 * Normalize a whole binding table. Throws on any invalid row or duplicate
 * `id` / `(channel, match, path)` identity collision.
 */
export function normalizeBindings(bindings, { plugin } = {}) {
  if (!Array.isArray(bindings)) {
    throw new BindingError('bindings-invalid', 'bindings must be an array')
  }
  const seen = new Set()
  const surface = new Set()
  return bindings.map(b => {
    const n = normalizeBinding(b, { plugin })
    if (seen.has(n.id)) throw new BindingError('bindings-invalid', `duplicate binding id "${n.id}"`)
    const key = `${n.channel} ${n.match} ${n.path}`
    if (surface.has(key)) throw new BindingError('bindings-invalid', `duplicate surface ${key}`)
    seen.add(n.id)
    surface.add(key)
    return n
  })
}

/** Public-facing record (handler stripped) for inventory/lookup. */
export function bindingRecord(binding) {
  return Object.freeze({
    id: binding.id,
    plugin: binding.plugin,
    channel: binding.channel,
    match: binding.match,
    path: binding.path,
    methods: Object.freeze([...binding.methods]),
    bodyLimit: binding.bodyLimit,
    sensitivity: binding.sensitivity,
    capability: binding.capability,
    sessionBinding: binding.sessionBinding,
    justification: binding.justification,
  })
}
