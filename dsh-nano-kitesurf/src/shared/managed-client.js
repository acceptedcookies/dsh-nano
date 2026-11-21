/**
 * Managed design client for dnls.control/1. Discovery is the only request
 * that runs before an explicit sandbox selection; every object request goes
 * through bind(sandboxId) and is refused unless the discovered contract
 * announced the capability that owns the path.
 */

const CONTRACT_VERSION = 'dnls.control/1'
const CONTRACT_HEADER = 'x-dnls-contract'
const CONTRACT_PATH = '/nano-local-sandbox/contract'
const LIST_PATH = '/nano-local-sandbox/sandboxes'
const PREFIX = '/nano-local-sandbox/'
const SANDBOX_ID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const SELECTOR_KEYS = new Set(['sandboxId', 'sessionId', 'sandbox'])
const SELECTOR_HEADERS = new Set(['x-sandbox-id', 'x-dnls-sandbox', 'x-session-id', 'x-dnls-contract'])

/* Managed capability ids that own non-page HTTP paths. Every other
 * `/nano-local-sandbox/<suffix>` object page is gated by its announced
 * `dnls.<suffix>` binding id. */
const MANAGED_PATH_CAPS = new Map([
  ['/nano-local-sandbox/sandboxes', 'sandbox.list'],
  ['/nano-local-sandbox/fleet', 'sandbox.fleet'],
  ['/nano-local-sandbox/inspect', 'sandbox.inspect'],
  ['/nano-local-sandbox/processes', 'sandbox.processes'],
  ['/nano-local-sandbox/lifecycle', 'sandbox.lifecycle'],
  ['/nano-local-sandbox/operations', 'sandbox.operations'],
])

function refuse(code, message) {
  const error = new Error(message)
  error.errorId = `kitesurf.managed.${code}`
  error.restricted = true
  throw error
}

function capabilityFor(path) {
  const managed = MANAGED_PATH_CAPS.get(path)
  if (managed) return managed
  const suffix = path.slice(PREFIX.length)
  if (!suffix || suffix.includes('/')) return null
  return `dnls.${suffix}`
}

/** Walk a plain-object body for caller-supplied object selectors. */
function hasSelector(value) {
  if (Array.isArray(value)) return value.some(hasSelector)
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(([key, entry]) => SELECTOR_KEYS.has(key) || hasSelector(entry))
}

function headerEntries(headers) {
  if (!headers) return []
  if (typeof Headers === 'function' && headers instanceof Headers) return [...headers.entries()]
  if (Array.isArray(headers)) return headers
  return Object.entries(headers)
}

/**
 * @param {{fetch?: typeof fetch, origin?: string}} options
 * @returns {{discover: () => Promise<object>, list: () => Promise<object>, bind: (sandboxId: string) => (path: string, init?: object) => Promise<Response>}}
 */
export function createManagedDesignClient({ fetch: impl, origin } = {}) {
  const doFetch = impl ?? globalThis.fetch?.bind(globalThis)
  if (typeof doFetch !== 'function') throw new Error('managed design client requires fetch')
  const base = new URL(origin ?? globalThis.location?.origin)
  if (!base.origin || base.origin === 'null') throw new Error('managed design client requires an origin')
  let contract = null

  async function discover() {
    contract = null
    const res = await doFetch(new URL(CONTRACT_PATH, base).href, {
      method: 'GET',
      credentials: 'same-origin',
    })
    if (!res.ok) refuse('discovery', `contract discovery failed (${res.status})`)
    if (res.headers.get(CONTRACT_HEADER) !== CONTRACT_VERSION) refuse('contract', 'unknown control contract')
    const body = await res.json().catch(() => null)
    if (body?.contractVersion !== CONTRACT_VERSION || !Array.isArray(body.capabilities)) {
      refuse('contract', 'unknown control contract')
    }
    contract = { capabilities: new Set(body.capabilities) }
    return body
  }

  function requireContract() {
    if (!contract) refuse('undiscovered', 'control contract has not been discovered')
    return contract
  }

  async function checked(res, sandboxId) {
    if (!res.ok) return res
    if (res.headers.get(CONTRACT_HEADER) !== CONTRACT_VERSION) refuse('contract', 'response missing control contract')
    const clone = res.clone()
    const body = await clone.json().catch(() => null)
    if (!body || typeof body !== 'object') refuse('contract', 'malformed control response')
    if (body.contractVersion !== CONTRACT_VERSION) refuse('contract', 'response body contract mismatch')
    if (sandboxId && body.sandboxId !== sandboxId) refuse('object', 'response names a different sandbox')
    return res
  }

  async function list() {
    const { capabilities } = requireContract()
    if (!capabilities.has('sandbox.list')) refuse('capability', 'sandbox.list is not announced')
    const res = await doFetch(new URL(LIST_PATH, base).href, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { [CONTRACT_HEADER]: CONTRACT_VERSION },
    })
    return checked(res, null)
  }

  function bind(sandboxId) {
    if (typeof sandboxId !== 'string' || sandboxId.length === 0) refuse('target', 'missing sandbox id')
    if (!SANDBOX_ID.test(sandboxId)) refuse('target', 'invalid sandbox id')
    const { capabilities } = requireContract()

    return async function fetchBound(path, init = {}) {
      if (typeof path !== 'string') refuse('path', 'request path must be a string')
      const url = new URL(path, base)
      if (url.origin !== base.origin) refuse('origin', 'request crosses origin')
      if (!url.pathname.startsWith(PREFIX)) refuse('path', `unannounced path ${url.pathname}`)
      const capability = capabilityFor(url.pathname)
      if (capability === null || !capabilities.has(capability)) {
        refuse('capability', `capability for ${url.pathname} is not announced`)
      }
      for (const key of url.searchParams.keys()) {
        if (SELECTOR_KEYS.has(key)) refuse('selector', 'caller may not supply an object selector')
      }
      const entries = headerEntries(init.headers)
      for (const [name] of entries) {
        if (SELECTOR_HEADERS.has(String(name).toLowerCase())) refuse('selector', 'caller may not supply a selector header')
      }
      if (init.credentials !== undefined && init.credentials !== 'same-origin') {
        refuse('credentials', 'request may not choose credentials')
      }
      const body = init.body
      if (body !== undefined) {
        if (typeof body !== 'string') refuse('body', 'request body must be a serialized string')
        let parsed
        try {
          parsed = JSON.parse(body)
        } catch {
          refuse('body', 'request body must be valid JSON')
        }
        if (hasSelector(parsed)) refuse('selector', 'caller may not supply a body selector')
      }
      url.searchParams.set('sandboxId', sandboxId)
      const headers = [...entries.filter(([name]) => !SELECTOR_HEADERS.has(String(name).toLowerCase())),
        [CONTRACT_HEADER, CONTRACT_VERSION]]
      return doFetch(url.href, { ...init, headers, credentials: 'same-origin' })
        .then((res) => checked(res, sandboxId))
    }
  }

  return { discover, list, bind }
}

/** Flat row projection of a `sandbox.list` answer — `{envs, rows, total, complete}`. */
export function listSandboxRows(body) {
  if (!Array.isArray(body?.rows)) throw new Error('invalid sandbox list')
  return body.rows
}
