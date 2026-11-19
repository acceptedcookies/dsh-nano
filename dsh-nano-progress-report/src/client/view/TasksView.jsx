/** Tasks view — the official `todos` projection (`TodoItem[] | null`), rendered
 *  with host visual language: `StateDot` glyphs, 13px content with ellipsis,
 *  tertiary completed text, a per-row status word.
 *  The host's `TodoPanel` is not exported (`packages/client/ui-conversation/
 *  src/client/skeleton/TodoPanel.tsx` registers it internally), so this is a
 *  metric-for-metric replication using only `--dsw-alias-*` tokens. */
import React from 'react'
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { TODO_DOT } from '../icons.js'

const { createElement: h } = React

/**
 * @param {{ todos: object[], t: Function }} props
 */
export function TasksView({ todos, t }) {
  if (todos.length === 0) {
    return h('div', { className: 'npr-empty', 'data-npr': 'tasks-empty' }, t('tasks.empty'))
  }
  return h('div', { className: 'npr-tasks', 'data-npr': 'tasks' },
    todos.map((todo, index) => h('div', {
      key: `${String(index)}:${String(todo?.content ?? '')}`,
      className: 'npr-task',
      'data-npr': 'task',
      'data-status': todo?.status,
    },
    h('span', { className: 'npr-task-glyph', 'aria-hidden': 'true' },
      h(StateDot, { state: TODO_DOT[todo?.status] ?? 'idle' })),
    h('span', { className: 'npr-task-text', title: String(todo?.content ?? '') }, String(todo?.content ?? '')),
    h('span', { className: 'npr-task-state' }, t(`tasks.status.${String(todo?.status)}`)))))
}
