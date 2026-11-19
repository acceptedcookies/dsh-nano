/** Tasks / Files / Failures lists for the footer — all read the session
 *  ledger's current work item (the same wire view read_progress serves the
 *  model), never a second source. Devin footer language: a leading state
 *  glyph, `#n` ordinal, one 12px line. Ledger tasks carry real completion
 *  marks (completedSeq/completedAt), files carry coverage seqs, failures
 *  carry seqs and a jump target into the timeline. */
import React from 'react'
import {
  IconCheckCircleFillRegular, StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'

const { createElement: h } = React

/** completed → green check (Devin), in progress → host spinner, pending →
 *  host idle dot (the catalog has no hollow-ring glyph beyond check circles;
 *  an idle dot reads as "not started" without inventing a glyph). */
function TaskGlyph({ status }) {
  if (status === 'completed') {
    return h('span', { className: 'npr-task-check' }, h(IconCheckCircleFillRegular, { size: 14 }))
  }
  if (status === 'in_progress') return h(StateDot, { state: 'ongoing' })
  return h(StateDot, { state: 'idle' })
}

function clock(ms) {
  const d = new Date(ms)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const Truncated = ({ t, extra }) => (extra > 0
  ? h('div', { className: 'npr-task npr-truncated', 'data-npr': 'truncated' },
    h('span', { className: 'npr-task-text' }, t('panel.truncated').replace('{n}', String(extra))))
  : null)

/**
 * @param {{ tasks: object[], truncated?: number, t: Function }} props
 */
export function TasksView({ tasks, truncated = 0, t }) {
  if (tasks.length === 0) {
    return h('div', { className: 'npr-empty', 'data-npr': 'tasks-empty' }, t('tasks.empty'))
  }
  return h('div', { className: 'npr-task-list', 'data-npr': 'tasks' },
    tasks.map((task, index) => h('div', {
      key: `${String(index)}:${String(task?.content ?? '')}`,
      className: 'npr-task',
      'data-npr': 'task',
      'data-status': task?.status,
    },
    h('span', { className: 'npr-task-glyph', 'aria-hidden': 'true' }, h(TaskGlyph, { status: task?.status })),
    h('span', { className: 'npr-task-num' }, `#${String(index + 1)}`),
    h('span', { className: 'npr-task-text', title: String(task?.content ?? '') }, String(task?.content ?? '')),
    task?.completedAt !== undefined
      ? h('span', { className: 'npr-task-meta' }, `${t('tasks.completed')} ${clock(task.completedAt)}`)
      : null)),
    h(Truncated, { t, extra: truncated }))
}

/**
 * @param {{ files: object[], truncated?: number, t: Function }} props
 */
export function FilesView({ files, truncated = 0, t }) {
  if (files.length === 0) {
    return h('div', { className: 'npr-empty', 'data-npr': 'files-empty' }, t('files.empty'))
  }
  return h('div', { className: 'npr-task-list', 'data-npr': 'files' },
    files.map((file, index) => h('div', {
      key: `${String(index)}:${String(file?.path ?? '')}`,
      className: 'npr-task npr-file',
      'data-npr': 'file',
    },
    h('span', { className: 'npr-task-glyph', 'aria-hidden': 'true' }, h(StateDot, { state: 'done' })),
    h('span', { className: 'npr-task-num' }, `#${String(index + 1)}`),
    h('span', { className: 'npr-task-text', title: String(file?.path ?? '') }, String(file?.path ?? '')),
    h('span', { className: 'npr-task-meta' }, file?.lastSeq !== file?.firstSeq
      ? `seq ${String(file.firstSeq)}–${String(file.lastSeq)}`
      : `seq ${String(file.firstSeq)}`))),
    h(Truncated, { t, extra: truncated }))
}

/**
 * @param {{ failures: object[], onJump?: (callId: string) => void, t: Function }} props
 */
export function FailuresView({ failures, onJump, t }) {
  if (failures.length === 0) {
    return h('div', { className: 'npr-empty', 'data-npr': 'failures-empty' }, t('failures.empty'))
  }
  return h('div', { className: 'npr-task-list', 'data-npr': 'failures' },
    failures.map((failure, index) => {
      const seqs = failure?.firstSeq === failure?.lastSeq
        ? String(failure.firstSeq) : `${String(failure.firstSeq)}–${String(failure.lastSeq)}`
      const label = `${failure?.tool ?? 'tool'}${failure?.path ? ` ${failure.path}` : ''}`
      return h('div', {
        key: `${String(index)}:${String(failure?.key ?? 'none')}`,
        className: 'npr-task npr-failure',
        'data-npr': 'failure',
        'data-status': 'failed',
        role: 'button',
        tabIndex: 0,
        onClick: () => onJump?.(failure?.callId),
        onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') onJump?.(failure?.callId) },
      },
      h('span', { className: 'npr-task-glyph', 'aria-hidden': 'true' }, h(StateDot, { state: 'error' })),
      h('span', { className: 'npr-task-num' }, `#${String(index + 1)}`),
      h('span', { className: 'npr-task-text', title: label }, label),
      h('span', { className: 'npr-task-meta' },
        `${failure?.count > 1 ? `×${String(failure.count)} ` : ''}seq ${seqs}`))
    }))
}
