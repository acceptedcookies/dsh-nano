/**
 * DNMS01/-21 read-side runtime projection for `GET /nano-model-selector/async-compact`.
 * - lastCompaction: `ctx.sessionProjections` fold when the service registers;
 *   else the registered degraded path — per-session Map folded incrementally
 *   off `session/event` (no disk, no full scan).
 * - fill: one `tokenMeter.measure(latest session)` + 5s memo keyed by
 *   `sessionUuid + lastEventSeq` (-21②/-21⑤).
 * - degraded: closed set {null,'state-read-failed','last-compaction-failed',
 *   'meter-unavailable'} (-21③), priority degradedMode ?? lastCompaction ?? null.
 * Zero polling (-21④): nothing here subscribes the UI; GET computes on demand.
 */

const FILL_MEMO_MS = 5000

/** Pure fold over the three durable event types (-21①). */
function foldCompactionEvent(state, event) {
  switch (event.type) {
    case 'compaction/start':
      return { ...state, at: event.time ?? state.at, status: 'busy' }
    case 'compaction/summary':
      return {
        at: event.time ?? state.at,
        status: 'busy',
        provider: event.data?.provider ?? null,
        model: event.data?.model ?? null,
        shadowedTokenCount: state.shadowedTokenCount + (event.data?.shadowedTokenCount ?? 0),
        degradedReason: null,
      }
    case 'compaction/end':
      return event.data?.error === undefined
        ? { ...state, status: 'completed', at: event.time ?? state.at }
        : { ...state, status: 'failed', degradedReason: String(event.data.error).slice(0, 200), at: event.time ?? state.at }
    case 'compaction/prune':
      return {
        ...state,
        shadowedTokenCount: state.shadowedTokenCount + (event.data?.shadowedTokenCount ?? 0),
      }
    default:
      return state
  }
}

function emptyLastCompaction() {
  return {
    at: null,
    status: 'ready',
    provider: null,
    model: null,
    shadowedTokenCount: 0,
    degradedReason: null,
  }
}

/**
 * Register the projection + session tracker on the host ctx.
 * @returns {{ runtime(ctx): {fill,lastCompaction,degraded} assembler }}
 */
export function compactRuntime(ctx) {
  const perSession = new Map() // sessionId -> folded state (degraded path)
  let projectionHandle = null
  let degradedProjection = false
  let latestSession = null // most recent session that emitted any event
  const fillMemo = new Map() // `${sessionId}:${lastEventSeq}` -> {at, fill}

  // Preferred path (-21①): sessionProjections. Falls back without throwing.
  try {
    const sp = ctx.sessionProjections ?? ctx.get?.('sessionProjections')
    if (sp?.register !== undefined) {
      const definition = {
        key: 'nanoCompactionRuntime',
        stateVersion: 1,
        init: emptyLastCompaction,
        apply: (state, event) => foldCompactionEvent(state, event),
        view: state => state,
      }
      const registered = sp.register(definition)
      projectionHandle = registered?.then === undefined ? registered : null
      if (registered?.then !== undefined) {
        registered.then(handle => { projectionHandle = handle }).catch(() => {
          degradedProjection = true
          ctx.logger.warn('async-compact: sessionProjections.register rejected; per-session fold active')
        })
      }
    } else {
      degradedProjection = true
    }
  } catch {
    degradedProjection = true
    ctx.logger.warn('async-compact: sessionProjections unavailable; per-session fold active')
  }

  // Degraded-path fold + latest-session tracking (-21① fallback).
  try {
    ctx.on('session/event', (session, event) => {
      try {
        latestSession = session
        if (projectionHandle === null) {
          const key = session?.id ?? String(session)
          const previous = perSession.get(key) ?? emptyLastCompaction()
          const next = foldCompactionEvent(previous, event)
          if (next !== previous) perSession.set(key, next)
        }
      } catch (error) {
        ctx.logger.warn(`async-compact: session fold skipped: ${error instanceof Error ? error.message : String(error)}`)
      }
    })
  } catch {
    // Host realm cannot subscribe session/event: fill/lastCompaction stay null.
  }

  function lastCompactionFor(session) {
    // P5-01b: a bare sessionId string stays valid for the degraded fold map
    // (keyed by id) but is never fed to stateOf, which needs the object.
    if (session === null) return null
    try {
      if (projectionHandle !== null && typeof session === 'object') {
        return projectionHandle.stateOf(session) ?? null
      }
      const key = typeof session === 'string' ? session : (session?.id ?? String(session))
      return perSession.get(key) ?? null
    } catch (error) {
      ctx.logger.warn(`async-compact: projection read failed: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  function fillFor(session, W) {
    // A bare id can name the session but cannot be measured by the token meter.
    if (session === null || typeof session !== 'object') return null
    try {
      const meter = ctx.tokenMeter ?? ctx.get?.('tokenMeter')
      if (meter === undefined || meter === null) return null
      const lastEventSeq = session.seq ?? session.lastEventSeq ?? 0
      const key = `${session.id}:${lastEventSeq}`
      const hit = fillMemo.get(key)
      if (hit !== undefined && Date.now() - hit.at < FILL_MEMO_MS) return hit.fill
      const measurement = meter.measure(session)
      const fill = typeof W === 'number' && W > 0 ? measurement.totalTokens / W : null
      fillMemo.set(key, { at: Date.now(), fill })
      for (const memoKey of [...fillMemo.keys()]) {
        if (memoKey !== key && fillMemo.get(memoKey).at < Date.now() - FILL_MEMO_MS) fillMemo.delete(memoKey)
      }
      return fill
    } catch {
      return 'meter-unavailable'
    }
  }

  /**
   * Assemble the read-only `runtime` block for GET.
   * P5-01b: strictly session-scoped — `session === null` yields nulls; there is
   * no latestSession fallback for lastCompaction on the read face.
   * @param {object|string|null} session - session object or id to report
   * @param {number|null} W - context window used to convert tokens → fill ratio
   * @param {string|null} degradedMode - 'state-read-failed' when the state file is unreadable
   */
  function runtime(session, W, degradedMode) {
    let lastCompaction = null
    let degraded = degradedMode ?? null
    try {
      lastCompaction = lastCompactionFor(session)
    } catch (error) {
      ctx.logger.warn(`async-compact: lastCompaction projection failed: ${error instanceof Error ? error.message : String(error)}`)
    }
    let fill = fillFor(session, W)
    if (fill === 'meter-unavailable') { degraded = degraded ?? 'meter-unavailable'; fill = null }
    if (degraded === null && lastCompaction?.status === 'failed') degraded = 'last-compaction-failed'
    return { fill, lastCompaction, degraded }
  }

  return { runtime, get degradedProjection() { return degradedProjection }, get latestSession() { return latestSession } }
}
