import { randomBytes } from 'node:crypto'

/**
 * Generation-scoped host credential vault (T-O-63).
 *
 * One random token per (locator, generation): minted on first use, delivered
 * into the guest over `deliver` (container exec root helper, stdin, env -i —
 * the publishHealth pattern) and cached only in process memory. Never
 * persisted to the registry, never written to the audit/ledger/logs, never
 * returned in any response — the token only proves "this connection came
 * from the DNLS host process".
 *
 * Lifecycle is lazy: the first relay handshake of a generation delivers.
 * That covers create, start and restart (same generation keeps its token),
 * recreate (a new generation mints a new token and overwrites the guest
 * file — the old credential dies with the previous container) and a host
 * restart adopting a running object (a fresh vault mints a new token).
 * A failed delivery is fail-closed: callers see 503 and the object page
 * never connects the relay.
 */
export function createBridgeCredentialVault({ deliver } = {}) {
  const mint = () => randomBytes(32).toString('base64url')
  const entries = new Map() // `${locator}\n${generation}` -> {token}
  const flights = new Map() // same key -> in-flight Promise<token>
  const keyOf = (locator, generation) => `${String(locator)}\n${String(generation)}`

  async function deliverToken(locator, generation) {
    const key = keyOf(locator, generation)
    const entry = entries.get(key)
    if (entry) return entry.token
    if (flights.has(key)) return flights.get(key)
    const flight = (async () => {
      const again = entries.get(key)
      if (again) return again.token
      if (typeof deliver !== 'function') {
        // No guest channel on this backend: fail closed, keep nothing.
        throw Object.assign(new Error('bridge credential delivery unavailable'), { status: 503 })
      }
      const token = mint()
      try {
        await deliver(locator, token)
      } catch (cause) {
        // The token never enters the error: the cause is the transport's own
        // message (container CLI detail), which the guest never saw either.
        throw Object.assign(new Error('bridge credential delivery failed'), { status: 503, cause })
      }
      entries.set(key, { token })
      return token
    })().finally(() => { flights.delete(key) })
    flights.set(key, flight)
    return flight
  }

  /**
   * The current generation token for one verified binding, or a thrown 503.
   * `locator`/`generation` must be the caller's already-verified pair — the
   * vault never proves object identity, it only mints and delivers.
   */
  async function tokenFor({ locator, generation } = {}) {
    if (typeof locator !== 'string' || !locator ||
        typeof generation !== 'string' || !generation) {
      throw Object.assign(new Error('verified binding required'), { status: 503 })
    }
    return deliverToken(locator, generation)
  }

  /** Forget one binding's token (teardown/rebind tests). */
  function drop({ locator, generation } = {}) {
    entries.delete(keyOf(locator, generation))
  }

  return { tokenFor, drop }
}
