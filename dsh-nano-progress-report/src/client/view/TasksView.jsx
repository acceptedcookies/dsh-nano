/** Tasks list — the official `todos` projection (`TodoItem[] | null`).
 *  Visual language follows the Devin Progress footer: a leading state glyph,
 *  the `#n` ordinal, one 12px line of content. The projection carries no
 *  timestamps or ids, so none are invented; the header owns the `done/total`
 *  count and the progress bar. */
import React from 'react'
import {
  IconCheckCircleFillRegular, IconCheckCircleOutlineRegular, StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'

const { createElement: h } = React

/** completed → green check (Devin), in progress → host spinner, pending → ring. */
function TaskGlyph({ status }) {
  if (status === 'completed') {
    return h('span', { className: 'npr-task-check' }, h(IconCheckCircleFillRegular, { size: 14 }))
  }
  if (status === 'in_progress') return h(StateDot, { state: 'ongoing' })
  return h('span', { className: 'npr-task-ring' }, h(IconCheckCircleOutlineRegular, { size: 14 }))
}

function clock(ms) {
  const d = new Date(ms)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * @param {{ todos: object[], taskTimes?: Map<string, number>, t: Function }} props
 */
export function TasksView({ todos, taskTimes, t }) {
  if (todos.length === 0) {
    return h('div', { className: 'npr-empty', 'data-npr': 'tasks-empty' }, t('tasks.empty'))
  }
  return h('div', { className: 'npr-task-list', 'data-npr': 'tasks' },
    todos.map((todo, index) => h('div', {
      key: `${String(index)}:${String(todo?.content ?? '')}`,
      className: 'npr-task',
      'data-npr': 'task',
      'data-status': todo?.status,
    },
    h('span', { className: 'npr-task-glyph', 'aria-hidden': 'true' }, h(TaskGlyph, { status: todo?.status })),
    h('span', { className: 'npr-task-num' }, `#${String(index + 1)}`),
    h('span', { className: 'npr-task-text', title: String(todo?.content ?? '') }, String(todo?.content ?? '')),
    (() => {
      const at = taskTimes?.get(String(todo?.content ?? ''))
      return at === undefined
        ? null
        : h('span', { className: 'npr-task-meta' }, `${t('tasks.completed')} ${clock(at)}`)
    })())))
}
