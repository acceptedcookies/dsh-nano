/**
 * Consumer half of the dsh-resource://sandbox/<envId>/<sandboxId> public
 * object reference (DNLS03 T-O-61). The address is an identity hint only:
 * the pane verifies it against the same-origin control contract and the
 * targeted inspect answer before it counts as an explicit selection.
 * Grammar is validated before any URL normalization, so `..`, literal `/`
 * or `\`, `%`, query, fragment, credentials and ports can never parse.
 */

const ENV_ID = '[a-z][a-z0-9-]{0,15}'
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const ADDRESS = new RegExp(`^dsh-resource://sandbox/(${ENV_ID})/(${UUID})$`)

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
 * the referenced object. A failure carries the cause and never selects or
 * inspects another object.
 * @param {string} address
 * @param {(path: string, init?: object) => Promise<Response>} impl
 * @param {string} origin
 * @param {{createManagedDesignClient: Function}} deps — injected for hermetic tests
 * @returns {Promise<{client: object, envId: string, sandboxId: string, name?: string}>}
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
    error.errorId = body?.errorId ?? 'kitesurf.sandbox.object'
    error.status = res.status
    throw error
  }
  const detail = await res.json().catch(() => null)
  if (detail?.sandboxId !== parsed.sandboxId) refuse('object', 'inspect names a different sandbox')
  if (detail?.envId !== parsed.envId) refuse('env', 'sandbox lives in a different environment')
  return { client: managed, envId: parsed.envId, sandboxId: parsed.sandboxId, name: detail.name }
}
