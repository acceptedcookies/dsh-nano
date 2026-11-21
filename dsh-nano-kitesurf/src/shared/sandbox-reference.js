/**
 * Consumer half of the dsh-resource://sandbox/<envId>/<sandboxId> public
 * object reference (DNLS03 T-O-61). The address is an identity hint only:
 * the pane verifies it against the same-origin control contract and the
 * targeted inspect answer before it counts as an explicit selection.
 * Grammar is validated before any URL normalization, so `..`, literal `/`
 * or `\`, `%`, query, fragment, credentials and ports can never parse.
 *
 * T-O-67: verification also checks the object's readonly `drivers`
 * projection declares the `cdp` driver — an object without a browser
 * driver fails closed with its own reason and never falls back to another
 * object.
 */

const ENV_ID = '[a-z][a-z0-9-]{0,15}'
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const ADDRESS = new RegExp(`^dsh-resource://sandbox/(${ENV_ID})/(${UUID})$`)
const BROWSER_DRIVER = 'cdp'

function refuse(code, message) {
  const error = new Error(message)
  error.errorId = `kitesurf.sandbox.${code}`
  error.restricted = true
  throw error
}

/**
 * Canonical grammar only.
 * @param {string} address
 * @returns {{envId: string, sandboxId: string} | null}
 */
export function parseSandboxReference(address) {
  if (typeof address !== 'string') return null
  const match = ADDRESS.exec(address)
  return match ? { envId: match[1], sandboxId: match[2] } : null
}

/**
 * Verify one address: GET /contract first, then a targeted inspect of exactly
 * the referenced object. The checks are the T-O-67 contract — envId,
 * sandboxId and a drivers projection that contains `cdp`. Every failure
 * carries its own reason class and never selects or inspects another
 * object: `missing` (nonexistent or not visible to this principal), `env`
 * (object lives in a different environment), `driver` (no browser driver).
 * @param {string} address
 * @param {(path: string, init?: object) => Promise<Response>} impl
 * @param {string} origin
 * @param {{createManagedDesignClient: Function}} deps — injected for hermetic tests
 * @returns {Promise<{client: object, envId: string, sandboxId: string, name?: string, drivers: string[]}>}
 */
export async function verifySandboxReference(address, impl, origin, { createManagedDesignClient }) {
  const parsed = parseSandboxReference(address)
  if (!parsed) refuse('address', 'not a canonical sandbox resource')
  if (typeof impl !== 'function') refuse('fetch', 'a fetch implementation is required')

  const managed = createManagedDesignClient({ fetch: impl, origin })
  await managed.discover()

  const bound = managed.bind(parsed.sandboxId)
  const res = await bound('/nano-local-sandbox/inspect')
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const error = new Error(body?.error ?? `inspect failed (${res.status})`)
    // The row does not exist or is not visible to this principal — the
    // pane shows exactly that, never "pick another".
    error.errorId = body?.errorId ?? 'kitesurf.sandbox.missing'
    error.status = res.status
    throw error
  }
  const detail = await res.json().catch(() => null)
  if (detail?.sandboxId !== parsed.sandboxId) refuse('object', 'inspect names a different sandbox')
  if (detail?.envId !== parsed.envId) refuse('env', 'sandbox lives in a different environment')
  // The readonly drivers projection is the only evidence consulted: an
  // object whose profile declares no cdp driver cannot drive the pane.
  const drivers = Array.isArray(detail?.drivers)
    ? detail.drivers.filter((driver) => typeof driver === 'string' && driver.length > 0)
    : []
  if (!drivers.includes(BROWSER_DRIVER)) {
    refuse('driver', 'sandbox profile declares no browser driver')
  }
  return { client: managed, envId: parsed.envId, sandboxId: parsed.sandboxId, name: detail.name, drivers }
}

/**
 * Verified object names for tab titles (T-O-67: short id before
 * verification, the object name after). The pane records the name once its
 * own verification pass returns; the title slot reads and subscribes so a
 * verified name replaces the short id without touching the host's baked
 * `title()` string. In-memory only — `keepMounted` titles never persist.
 */
const verifiedNames = new Map()
const nameListeners = new Set()

/** Record the verified object name for a resource address. */
export function noteVerifiedSandboxName(address, name) {
  if (typeof name !== 'string' || name.length === 0) return
  const parsed = parseSandboxReference(address)
  if (!parsed) return
  verifiedNames.set(address, name)
  for (const listener of nameListeners) {
    try { listener() } catch { /* a title slot must never break verification */ }
  }
}

/** The verified name for an address, or null until verification lands. */
export function verifiedSandboxName(address) {
  return verifiedNames.get(address) ?? null
}

/** Subscribe to verified-name updates; returns the unsubscribe. */
export function subscribeVerifiedSandboxNames(listener) {
  if (typeof listener !== 'function') return () => {}
  nameListeners.add(listener)
  return () => nameListeners.delete(listener)
}
