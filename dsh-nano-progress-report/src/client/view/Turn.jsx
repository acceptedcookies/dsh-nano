/** One turn of the execution log, arranged the way Devin's Progress panel is:
 *  the human prompt sits at the left edge, and every step that turn produced is
 *  indented one level behind a hairline guide. There are no group cards, no
 *  counts, no lane chips — the indent IS the turn boundary. */
import React from 'react'
import { Row } from './Row.jsx'

const { createElement: h } = React

/**
 * @param {{ group: object, now: number, t: Function, openKey: string|null,
 *   onRowToggle: (key: string) => void }} props
 */
export function Turn({ group, now, t, openKey, onRowToggle }) {
  const opener = group.opener
  const rows = group.end !== null ? [...group.rows, group.end] : group.rows
  if (opener === null && rows.length === 0) return null
  const row = (r, level) => h(Row, {
    key: r.key,
    row: r,
    now,
    t,
    level,
    open: openKey === r.key,
    onToggle: () => onRowToggle(r.key),
  })
  return h('div', { className: 'npr-turn', 'data-npr': 'turn', 'data-role': opener?.role ?? 'none' },
    opener !== null ? row(opener, 0) : null,
    rows.length > 0
      ? h('div', { className: 'npr-turn-body', 'data-npr': 'turn-body' }, rows.map(r => row(r, 1)))
      : null)
}
