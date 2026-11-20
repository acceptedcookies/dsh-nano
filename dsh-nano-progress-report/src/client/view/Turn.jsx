/** One turn of the execution log, arranged the way Devin's Progress panel is:
 *  the human prompt sits at the left edge, and every step that turn produced is
 *  indented one level behind a hairline guide. There are no group cards, no
 *  counts, no lane chips — the indent IS the turn boundary.
 *  With `condensed` (no active filter) the body runs through the A/B/C
 *  layering: milestones keep their rows, same-category tool runs merge into
 *  segment lines, and the C-layer strips; a non-completed end reason or the
 *  turn duration rides the opener's 56px tail column. */
import React from 'react'
import { Row } from './Row.jsx'
import { condenseGroup, tailOf } from '../../shared/condense.js'

const { createElement: h } = React

const fmtDur = ms => {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h${m % 60 > 0 ? `${m % 60}m` : ''}`
}

function tailLabel(group) {
  const tail = tailOf(group)
  if (tail === null) return null
  if (tail.reason !== undefined && tail.reason !== 'completed') {
    return tail.durationMs !== undefined ? `${tail.reason} ${fmtDur(tail.durationMs)}` : tail.reason
  }
  return tail.durationMs !== undefined ? fmtDur(tail.durationMs) : null
}

/**
 * @param {{ group: object, now: number, t: Function, openKey: string|null,
 *   onRowToggle: (key: string) => void, condensed?: boolean }} props
 */
export function Turn({ group, now, t, openKey, onRowToggle, condensed = false }) {
  const opener = group.opener
  const rows = condensed
    ? condenseGroup(group).rows
    : (group.end !== null ? [...group.rows, group.end] : group.rows)
  if (opener === null && rows.length === 0) return null
  const tail = condensed ? tailLabel(group) : null
  const row = (r, level, extra = {}) => h(Row, {
    key: r.key,
    row: r,
    now,
    t,
    level,
    open: openKey === r.key,
    onToggle: () => onRowToggle(r.key),
    ...extra,
  })
  return h('div', { className: 'npr-turn', 'data-npr': 'turn', 'data-role': opener?.role ?? 'none' },
    opener !== null ? row(opener, 0, { tail }) : null,
    rows.length > 0
      ? h('div', { className: 'npr-turn-body', 'data-npr': 'turn-body' }, rows.map(r => row(r, 1)))
      : null)
}
