/** One turn group: the opener (prompt / goal round / agent message) as a host
 *  `DisclosureRow` header with category counts, the turn's rows when open,
 *  and the turn's last assistant text as the folded outcome. */
import React from 'react'
import { DisclosureRow } from '@deepseek-ai/dsh-client-ui-primitives'
import { oneLine } from '../args.js'
import { countsText, durationText } from '../group-format.js'
import { FAIL_ICON, FALLBACK_ICON, TYPE_ICON } from '../icons.js'
import { relTime } from '../time.js'
import { Row } from './Row.jsx'

const { createElement: h } = React

/**
 * @param {{ group: object, open: boolean, onToggle: Function, running: boolean,
 *   now: number, t: Function, openKey: string|null, onRowToggle: (key: string) => void }} props
 */
export function Group({ group, open, onToggle, running, now, t, openKey, onRowToggle }) {
  const opener = group.opener
  const type = opener?.type ?? 'turn'
  const Icon = TYPE_ICON[type] ?? FALLBACK_ICON
  const title = opener !== null ? opener.summary : t('group.untitled')
  const counts = countsText(group.byType, t)
  const closed = group.end !== null
  const duration = closed ? durationText(group.endTime - group.startTime, t) : ''
  const status = group.failed > 0 ? 'failed' : group.status
  const row = r => h(Row, {
    key: r.key, row: r, now, t,
    open: openKey === r.key,
    onToggle: () => onRowToggle(r.key),
  })
  return h('div', {
    className: 'npr-group',
    'data-npr': 'group',
    'data-group-key': group.key,
    'data-role': opener?.role ?? 'boundary',
    'data-type': type,
    'data-status': status,
    'data-open': open ? 'true' : undefined,
  },
  h('div', { className: 'npr-row npr-group-head', 'data-type': type, 'data-status': status },
    h(DisclosureRow, {
      icon: h('span', { className: 'npr-icon', 'data-type': type, 'aria-hidden': 'true' }, h(Icon, { size: 14 })),
      title: oneLine(String(title ?? ''), 400),
      open,
      expandable: group.rows.length > 0 || group.end !== null,
      onToggle,
      expandOnRowClick: true,
      running,
      className: 'npr-row-inner',
      contentClassName: 'npr-row-grow',
      contentLayoutClassName: 'npr-row-content',
      titleClassName: `npr-row-title npr-t-${type}`,
      chevronClassName: 'npr-row-chev',
      headerAccessory: h('span', { className: 'npr-row-tail' },
        counts !== '' ? h('span', { className: 'npr-group-counts', 'data-npr': 'group-counts' }, counts) : null,
        group.failed > 0
          ? h('span', { className: 'npr-row-fail', 'data-npr': 'fail', role: 'img', 'aria-label': t('status.failed') },
            h(FAIL_ICON, { size: 12 }))
          : null,
        duration !== '' ? h('span', { className: 'npr-row-time', 'data-npr': 'duration' }, duration) : null,
        h('span', { className: 'npr-row-time', 'data-npr': 'time' }, relTime(group.startTime, now, t))),
    })),
  open
    ? h('div', { className: 'npr-group-body', 'data-npr': 'group-body' },
      group.rows.map(row),
      group.end !== null ? row(group.end) : null)
    : group.outcome !== null
      ? h('div', { className: 'npr-group-body', 'data-npr': 'group-outcome' }, row(group.outcome))
      : null)
}

/**
 * Divider above the first group of a goal run.
 * @param {{ objective: string|undefined, t: Function }} props
 */
export function GoalSection({ objective, t }) {
  const Icon = TYPE_ICON.goal
  return h('div', { className: 'npr-goal-section', 'data-npr': 'goal-section' },
    h('span', { className: 'npr-icon', 'data-type': 'goal', 'aria-hidden': 'true' }, h(Icon, { size: 14 })),
    h('span', { className: 'npr-goal-section-text' },
      objective ? `${t('goal.section')} · ${oneLine(objective, 200)}` : t('goal.section')))
}
