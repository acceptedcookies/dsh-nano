/**
 * Async-compaction activity line, mounted in the composer's activity slot
 * (`conversation.input.activity`).
 *
 * Why this exists: an armed episode is invisible today. The engine keeps its
 * phase in memory, the durable bracket only appears at commit, and a drop
 * before the bracket leaves nothing at all — so "is it compacting right now?"
 * was unanswerable from the chat interface. The committed result already shows
 * up as the shell's own 「上下文已压缩」 row; this line covers the window
 * before it, and reports the summarizer model plus the instruction version that
 * is actually in force.
 *
 * The line is deliberately quiet: it renders nothing while the lane is idle,
 * expands the activity row only while it has something to say, and disappears
 * the moment the shell's own compaction row takes over.
 */
import * as React from 'react'
import { IconCompactOutlineRegular, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { fetchCompactHistory } from './compact.js'
import { activityLineFor } from './history-format.js'

/** Poll cadence while the lane is idle: async only runs at idle, so this is cheap. */
const IDLE_POLL_MS = 15_000
/** Poll cadence while an episode is armed or running: the state can change fast. */
const ACTIVE_POLL_MS = 3_000

/**
 * @param {object} props
 * @param {string} props.sessionId - the session this composer belongs to.
 * @param {object} props.copy - active dictionary slice.
 * @param {(active: boolean) => void} [props.onActiveChange] - expands the shell's activity row.
 */
export function AsyncActivityLine({ sessionId, copy, onActiveChange }) {
  const [phase, setPhase] = React.useState(null)

  const active = phase !== null && phase.state !== 'idle'

  // The shell only reserves space for this row while a plugin says it is active.
  React.useEffect(() => {
    onActiveChange?.(active)
    return () => onActiveChange?.(false)
  }, [active, onActiveChange])

  React.useEffect(() => {
    let cancelled = false
    let timer = null

    const tick = async () => {
      let next = { state: 'idle' }
      try {
        const data = await fetchCompactHistory(sessionId)
        next = data?.history?.phase ?? { state: 'idle' }
      } catch {
        // A read failure is not a compaction failure: keep the line silent
        // rather than claiming a state we could not observe.
        next = { state: 'idle' }
      }
      if (cancelled) return
      setPhase(next)
      const delay = next.state === 'armed' || next.state === 'running' ? ACTIVE_POLL_MS : IDLE_POLL_MS
      timer = setTimeout(tick, delay)
    }

    void tick()
    return () => {
      cancelled = true
      if (timer !== null) clearTimeout(timer)
    }
  }, [sessionId])

  const line = activityLineFor(phase, copy)
  if (line === null) return null

  return React.createElement(Tooltip, { content: line.tooltip },
    React.createElement('div', { className: 'nms-activity', 'data-state': line.state, role: 'status' },
      React.createElement('span', { className: 'nms-activity-glyph', 'data-state': line.state, 'aria-hidden': 'true' },
        React.createElement(IconCompactOutlineRegular, { size: 14 })),
      React.createElement('span', { className: 'nms-activity-text' }, line.text),
      line.meta === null ? null : React.createElement('span', { className: 'nms-activity-meta' }, line.meta)))
}
