/**
 * createWebRegistrar — the single channel/match web-registration mechanism
 * (Q6 / T-O-CF1115-11 / P1-03). Host facade: injects ctx only.
 *
 * Binding axis: channel('http'|'upgrade') × match('exact'|'prefix');
 * 'upgrade' only permits 'exact'. Full-batch precheck before any register;
 * any failure rolls back the batch's registered items; idempotent dispose is
 * folded into one ctx.effect. inventory() exposes only effective bindings.
 *
 * The http+exact admission pipeline reuses the single `createGuard`
 * implementation from dsh-host-route-guard (unidirectional reuse); the
 * http+prefix and upgrade+exact surfaces are new registrar-provided faces.
 */

import {
  createGuard,
  RouteGuardError,
  sendJson,
} from 'dsh-host-route-guard'
import {
  CHANNEL,
  MATCH,
  normalizeBindings,
  bindingRecord,
  BindingError,
} from '../contracts/index.js'
import { emitObserve, observeStamp } from './emitObserve.js'

/**
 * createWebRegistrar({ plugin, bindings, observe? }) →
 *   { registerAll(ctx), inventory(), lookup(id) }
 *
 * `bindings` is the baked declaration table (id/channel/match/path/methods/
 * handler + ledger fields). Validated eagerly at construction.
 * `observe` is optional (T-O-PRE1116-06) and is forwarded to the exact-http
 * guard. Omitted: no clock read, no event.
 */
export function createWebRegistrar({ plugin, bindings, observe } = {}) {
  const normalized = normalizeBindings(bindings ?? [], { plugin })
  const effective = [] // bindingRecords, only after successful registration

  const byChannel = {
    httpExact: normalized.filter(b => b.channel === CHANNEL.HTTP && b.match === MATCH.EXACT),
    httpPrefix: normalized.filter(b => b.channel === CHANNEL.HTTP && b.match === MATCH.PREFIX),
    upgradeExact: normalized.filter(b => b.channel === CHANNEL.UPGRADE && b.match === MATCH.EXACT),
  }

  /**
   * registerAll(ctx) → disposer
   * Prechecks the whole batch (fail-closed connection + requestRejection),
   * then registers. Any failure disposes everything registered so far.
   * The batch is folded into a single ctx.effect so teardown is unified.
   */
  function registerAll(ctx) {
    const conn = ctx.get('connection')
    if (!conn) throw new RouteGuardError('no-connection', 'no connection service')
    if (typeof conn.requestRejection !== 'function') {
      throw new RouteGuardError('no-request-rejection', 'connection.requestRejection is not a function; refusing to register unauthenticated routes')
    }

    const disposers = []
    const rollback = () => {
      for (const d of disposers.splice(0)) {
        try { d && d() } catch { /* teardown best-effort */ }
      }
    }

    try {
      // http + exact — single implementation via createGuard. We pass a ctx
      // view WITHOUT `effect` so per-route effects are not double-mounted; the
      // registrar owns unified batch disposal instead.
      if (byChannel.httpExact.length) {
        /* A cordis Context is a Proxy: ctx.webServer/.connection resolve
         * through the get-trap keyed on the trap's REAL context receiver.
         * Any shim ({...ctx} or Object.create(ctx)) copies/loses methods, or
         * — worse — resolves ctx.webServer against a SHADOW provision (the
         * Object.create object's own scope) instead of the live listener
         * instance, silently registering routes on a webServer that never
         * serves them (live-verified: POST returned 405 while match() claimed
         * a hit on the orphan instance). Pass the REAL ctx through unchanged;
         * per-route ctx.effect registration is the guard's own contract, and
         * disposeAll below is idempotent so teardown stays exact. */
        const guard = createGuard({ table: byChannel.httpExact, plugin, observe })
        const ds = guard.registerRoutes(ctx, byChannel.httpExact)
        disposers.push(...ds)
      }
      // http + prefix — same admission fence, prefix surface.
      for (const b of byChannel.httpPrefix) {
        const handler = async (req, res) => {
          const t0 = observeStamp(observe)
          const done = (outcome, status) => {
            if (t0 == null) return
            const event = {
              surface: 'http',
              id: b.id ?? null,
              plugin: b.plugin ?? plugin ?? null,
              outcome,
              ms: globalThis.performance.now() - t0,
            }
            if (status !== undefined) event.status = status
            emitObserve(observe, event)
          }
          // requestRejection is REQUIRED (prechecked above): direct call, never
          // optional-chained into a fail-open pass (F12.3).
          const rejection = conn.requestRejection(req)
          if (rejection !== undefined) {
            res.statusCode = rejection
            res.end()
            done('rejected', rejection)
            return
          }
          if (!b.methods.includes(String(req.method ?? '').toUpperCase())) {
            res.setHeader('allow', b.methods.join(', '))
            sendJson(res, 405, { ok: false, reason: 'method-not-allowed' })
            done('method', 405)
            return
          }
          try {
            await b.handler(req, res, bindingRecord(b))
            done('ok', res.statusCode)
          } catch (error) {
            const reason = error instanceof RouteGuardError ? error.reason : 'failed'
            sendJson(res, 500, { ok: false, reason })
            done('failed', 500)
          }
        }
        disposers.push(ctx.get('webServer').register({ kind: 'prefix', path: b.path, handler }))
      }
      // upgrade + exact — same rejection fence, socket teardown on reject.
      // Timing stops when the handler function returns. A long-lived socket
      // is not wrapped (T-O-PRE1116-06.4). There is no `failed` outcome on
      // this surface; a throw still propagates.
      for (const b of byChannel.upgradeExact) {
        const handler = (req, socket) => {
          const t0 = observeStamp(observe)
          const done = (outcome) => {
            if (t0 == null) return
            emitObserve(observe, {
              surface: 'upgrade',
              id: b.id ?? null,
              plugin: b.plugin ?? plugin ?? null,
              outcome,
              ms: globalThis.performance.now() - t0,
            })
          }
          // upgrade is GET-only by declaration (F12.2); enforce at request time
          // too — a non-GET upgrade must not reach b.handler.
          if (String(req.method ?? '').toUpperCase() !== 'GET') {
            try { socket.end() } catch { /* socket gone */ }
            done('method')
            return
          }
          const rejection = conn.requestRejection(req)
          if (rejection !== undefined) {
            try { socket.end() } catch { /* socket gone */ }
            done('rejected')
            return
          }
          const ret = b.handler(req, socket, bindingRecord(b))
          done('accepted')
          return ret
        }
        disposers.push(ctx.get('webServer').registerUpgrade({ path: b.path, handler }))
      }
    } catch (error) {
      rollback()
      throw error
    }

    // Only now mark effective bindings (registered successfully).
    for (const b of normalized) effective.push(bindingRecord(b))

    /* `disposed` is per-registerAll call (not shared on the registrar) so a
       second registerAll's own batch still tears down correctly (agent-7). */
    let disposed = false
    const disposeAll = () => {
      if (disposed) return
      disposed = true
      rollback()
    }
    // Fold the whole batch into a single ctx.effect (idempotent teardown).
    // The callback must RETURN the disposer: cordis runs the effect body
    // immediately and treats its return value as the teardown function.
    // `() => disposeAll()` would call rollback right now — registering every
    // route and un-registering it in the same tick (live-verified 2026-11-16:
    // all routes registered then DISPOSEd instantly, every plugin route 404).
    if (typeof ctx.effect === 'function') {
      ctx.effect(() => disposeAll, `web-registrar: ${plugin ?? 'plugin'} dispose`)
    }
    return disposeAll
  }

  /** inventory() → frozen effective binding records (registration order). */
  function inventory() {
    return Object.freeze([...effective])
  }

  /** lookup(id) → the effective binding record, or undefined. */
  function lookup(id) {
    return effective.find(r => r.id === id)
  }

  return { registerAll, inventory, lookup }
}

export { BindingError }
