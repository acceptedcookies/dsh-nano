/** One timeline row: the host's shared 24px process row (`DisclosureRow`)
 *  carries the chevron/indent/running-shimmer chrome; this module only supplies
 *  the leading glyph, the semantic title class, and the expanded payload.
 *  Row anatomy mirrors the Devin Progress view: glyph → summary → trailing
 *  relative time, with a failure mark when the step ended badly. */
import React from 'react'
import { DisclosureRow } from '@deepseek-ai/dsh-client-ui-primitives'
import { oneLine } from '../args.js'
import { FAIL_ICON, FALLBACK_ICON, TYPE_ICON } from '../icons.js'
import { relTime } from '../time.js'

const { createElement: h } = React

const LABEL = {
  args: 'detail.args',
  result: 'detail.result',
  error: 'detail.error',
  reasoning: 'detail.reasoning',
  duration: 'detail.duration',
}

function DetailBody({ row, t }) {
  const d = row.detail ?? {}
  const parts = []
  if (d.error !== undefined) parts.push(h('div', { key: 'e', className: 'npr-detail-line', 'data-field': 'error' },
    h('span', { className: 'npr-detail-label' }, t(LABEL.error)),
    h('span', { className: 'npr-detail-value' }, String(d.error))))
  if (d.argsRaw) parts.push(h('div', { key: 'a', className: 'npr-detail-line', 'data-field': 'args' },
    h('span', { className: 'npr-detail-label' }, t(LABEL.args)),
    h('span', { className: 'npr-detail-value' }, String(d.argsRaw))))
  if (d.resultText) parts.push(h('div', { key: 'r', className: 'npr-detail-line', 'data-field': 'result' },
    h('span', { className: 'npr-detail-label' }, t(LABEL.result)),
    h('span', { className: 'npr-detail-value' }, String(d.resultText))))
  if (d.resultTruncated === true) parts.push(h('div', { key: 'rt', className: 'npr-detail-line', 'data-field': 'truncated' },
    h('span', { className: 'npr-detail-label' }, t('detail.truncated').replace('{n}', String(d.resultLength)))))
  if (row.job !== undefined) parts.push(h('div', { key: 'j', className: 'npr-detail-line', 'data-field': 'job' },
    h('span', { className: 'npr-detail-label' }, t('detail.job')),
    h('span', { className: 'npr-detail-value' }, String(row.job.label ?? row.job.status))))
  if (d.reasoning) parts.push(h('div', { key: 'q', className: 'npr-detail-line', 'data-field': 'reasoning' },
    h('span', { className: 'npr-detail-label' }, t(LABEL.reasoning)),
    h('span', { className: 'npr-detail-value' }, String(d.reasoning))))
  if (d.text) parts.push(h('div', { key: 't', className: 'npr-detail-line', 'data-field': 'text' },
    h('span', { className: 'npr-detail-value' }, String(d.text))))
  if (d.durationMs !== undefined) parts.push(h('div', { key: 'd', className: 'npr-detail-line', 'data-field': 'duration' },
    h('span', { className: 'npr-detail-label' }, t(LABEL.duration)),
    h('span', { className: 'npr-detail-value' }, `${(Number(d.durationMs) / 1000).toFixed(1)}s`)))
  const children = Array.isArray(d.children) ? d.children : []
  return h('div', { className: 'npr-detail', 'data-npr': 'detail' },
    parts,
    children.length > 0
      ? h('div', { className: 'npr-subcalls' }, children.map((child, i) => h('div', {
        key: `${child.name}:${i}`, className: 'npr-subcall', 'data-status': child.status,
      },
      h('span', { className: 'npr-subcall-name' }, child.name),
      h('span', { className: 'npr-subcall-summary' }, oneLine(String(child.summary ?? ''), 200)))))
      : null)
}

/**
 * @param {{ row: object, now: number, t: Function, open: boolean, onToggle: Function }} props
 */
export function Row({ row, now, t, open, onToggle }) {
  const Icon = TYPE_ICON[row.type] ?? FALLBACK_ICON
  const time = relTime(row.time, now, t)
  return h('div', {
    className: 'npr-row',
    'data-npr': 'row',
    'data-row-key': row.key,
    'data-type': row.type,
    'data-status': row.status,
    'data-open': open ? 'true' : undefined,
  },
  h(DisclosureRow, {
    icon: h('span', { className: 'npr-icon', 'data-type': row.type, 'aria-hidden': 'true' },
      h(Icon, { size: 14 })),
    title: oneLine(String(row.summary ?? ''), 400),
    open,
    expandable: row.expandable === true,
    onToggle,
    expandOnRowClick: true,
    running: row.status === 'running',
    className: 'npr-row-inner',
    contentClassName: 'npr-row-grow',
    contentLayoutClassName: 'npr-row-content',
    titleClassName: `npr-row-title npr-t-${row.type}`,
    chevronClassName: 'npr-row-chev',
    headerAccessory: h('span', { className: 'npr-row-tail' },
      row.status === 'failed'
        ? h('span', { className: 'npr-row-fail', 'data-npr': 'fail', role: 'img', 'aria-label': t('status.failed') },
          h(FAIL_ICON, { size: 12 }))
        : null,
      h('span', { className: 'npr-row-time', 'data-npr': 'time' }, time)),
  }, open ? h(DetailBody, { row, t }) : null))
}
