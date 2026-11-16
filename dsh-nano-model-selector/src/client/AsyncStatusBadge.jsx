/**
 * Async-compaction status badge, mounted in the session header's action area
 * (`conversation.session.header.actions`).
 *
 * Placement: async compaction is a SESSION-level background job, not something
 * the composer is doing — the composer's activity row means "the input bar is
 * busy", and borrowing it made a background job look like input state.
 *
 * Why a badge at all: the shell renders the committed result as
 * 「上下文已压缩 · 已压缩 N 条历史记录」, and that row is host-owned — it has no
 * async variant, so the flow cannot say which lane produced it. This badge is
 * where the async attribution lives: it names the lane while an episode is
 * queued/running, and keeps saying 「已异步压缩」 for a while after the commit,
 * so the host's row always has an async label beside it.
 */
import * as React from 'react'
import { IconCompactOutlineRegular, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { fetchCompactHistory } from './compact.js'
import { resolvePhase, statusBadgeFor } from './history-format.js'

/** Poll cadence while the lane is idle: async only runs at idle, so this is cheap. */
const IDLE_POLL_MS = 15_000
/** Poll cadence while an episode is queued or running: the state can change fast. */
const ACTIVE_POLL_MS = 3_000

/**
 * @param {object} props
 * @param {string} props.sessionId - the session this header belongs to.
 * @param {object} props.copy - active dictionary slice.
 */
export function AsyncStatusBadge({ sessionId, copy }) {
  const [phase, setPhase] = React.useState(null)

  React.useEffect(() => {
    let cancelled = false
    let timer = null

    const tick = async () => {
      let next = { state: 'idle' }
      try {
        const data = await fetchCompactHistory(sessionId)
        const history = data?.history ?? null
        next = resolvePhase(history?.phase ?? null, history?.records ?? [], Date.now()) ?? { state: 'idle' }
      } catch {
        // A read failure is not a compaction failure: stay silent rather than
        // claiming a state we could not observe.
        next = { state: 'idle' }
      }
      if (cancelled) return
      setPhase(next)
      const busy = next.state === 'armed' || next.state === 'running'
      timer = setTimeout(tick, busy ? ACTIVE_POLL_MS : IDLE_POLL_MS)
    }

    void tick()
    return () => {
      cancelled = true
      if (timer !== null) clearTimeout(timer)
    }
  }, [sessionId])

  const badge = statusBadgeFor(phase, copy)
  if (badge === null) return null

  return React.createElement(Tooltip, { content: badge.tooltip },
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
