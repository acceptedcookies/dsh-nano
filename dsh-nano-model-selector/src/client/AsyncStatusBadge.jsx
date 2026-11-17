/**
 * Async-compaction status badge, mounted in the session header's action area
 * (`conversation.session.header.utilities`, list slot).
 *
 * Placement: async compaction is a SESSION-level background job, not something
 * the composer is doing — the composer's activity row means "the input bar is
 * busy", and borrowing it made a background job look like input state.
 *
 * Why a badge at all: the shell renders the committed result as
 * 「上下文已压缩 · 已压缩 N 条历史记录」, and that row is host-owned — it has no
 * async variant, so the flow cannot say which lane produced it. This badge is
 * where the async attribution lives: it names the lane while an episode is
 * queued/running, and says 「已异步压缩」 while the projection reports the
 * session's last compaction completed.
 *
 * Refresh discipline (P5-02): this component owns NO timer. It reads once on
 * mount through the shared store; continuation fetches exist only while the
 * session is running AND the ledger tail leaves an episode open, at the
 * store's single 3000 ms cadence. `committed` resolves off the session-scoped
 * projection (`runtime.lastCompaction`), never a TTL.
 */
import * as React from 'react'
import { IconCompactOutlineRegular, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { asyncCompactStore, INFLIGHT_POLL_MS } from './compact.js'
import { resolvePhase, statusBadgeFor } from './history-format.js'

// Locked by T16: the continuation cadence is exactly the declared constant.
export const BADGE_POLL_MS = INFLIGHT_POLL_MS

/**
 * @param {object} props
 * @param {string} props.sessionId - the session this header belongs to.
 * @param {object} props.copy - active dictionary slice.
 * @param {((sessionId: string) => boolean|undefined)|undefined} props.useSessionStatus
 *   session-scoped hook the slot injects; absent on older hosts → `running`
 *   is treated as unknown and the pump stays quiet until a fetch proves work.
 */
export function AsyncStatusBadge({ sessionId, copy, useSessionStatus, useProjection }) {
  // A hook may only be invoked unconditionally; when the prop is not a
  // function (older host) we take the static path below. The prop is
  // slot-injected, so it cannot change identity mid-mount.
  const running = typeof useSessionStatus === 'function'
    ? useSessionStatus(sessionId)?.running
    : undefined
  // useProjection is the zero-copy path for hosts that publish this unit;
  // ours is registered host-only (no wire view), so this stays undefined and
  // the badge falls back to the fetched payload — per P5-01e, no second
  // projection is fabricated here.
  const projection = typeof useProjection === 'function'
    ? useProjection('nanoCompactionRuntime')
    : undefined
  const [phase, setPhase] = React.useState(null)

  React.useEffect(() => {
    const unsubscribe = asyncCompactStore.subscribe(sessionId, data => {
      setPhase(resolvePhase(data?.history?.phase ?? null, data) ?? { state: 'idle' })
    })
    return unsubscribe
  }, [sessionId])

  React.useEffect(() => {
    if (running !== undefined) asyncCompactStore.setRunning(sessionId, running)
  }, [sessionId, running])

  // The projection path, when a host exposes it, is authoritative for the
  // committed surface — same fold the route serves, zero extra fetches.
  const projectionPhase = React.useMemo(() => {
    if (projection?.status === 'completed') {
      return resolvePhase(null, { policy: { runtime: { lastCompaction: projection } }, history: null })
    }
    return null
  }, [projection])

  const badge = statusBadgeFor(projectionPhase ?? phase, copy)
  if (badge === null) return null

  return React.createElement(Tooltip, { label: badge.tooltip },
    React.createElement('span', {
      className: 'nms-badge',
      'data-state': badge.state,
      role: 'status',
      tabIndex: 0,
    },
    React.createElement('span', { className: 'nms-badge-glyph', 'aria-hidden': 'true' },
      React.createElement(IconCompactOutlineRegular, { size: 14 })),
    React.createElement('span', { className: 'nms-badge-text' }, badge.text)))
}
