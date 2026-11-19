/** Bottom task bar — the Devin Progress footer: one 30px header line
 *  (`Tasks` + done/total + a 3px progress bar + an optional Jobs switch) and the
 *  task list underneath. The header is the host `DisclosureRow`, so the
 *  chevron, keyboard toggle and aria-expanded come from the host; the bar
 *  itself is the only local primitive (host/nano-ui ship no meter).
 *
 *  The top edge stays draggable (pointer capture + clamped height) and the
 *  header collapses the body, matching the workspace tool panels. */
import React from 'react'
import { Button, DisclosureRow, IconChecklistOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { JobsView } from './JobsView.jsx'
import { TasksView } from './TasksView.jsx'

const { createElement: h, useCallback } = React

/** Smallest useful body: the header plus two task rows. */
export const TASKS_MIN = 88
/** Ceiling leaves the timeline most of the pane. */
export const tasksMax = () => Math.max(TASKS_MIN, Math.round(window.innerHeight * 0.6))

/**
 * @param {{ t: Function, view: string, onView: (v: string) => void,
 *   collapsed: boolean, onCollapsed: (v: boolean) => void,
 *   height: number, onResize: (px: number) => void,
 *   todos: object[], jobs: object[] }} props
 */
export function TasksSection({ t, view, onView, collapsed, onCollapsed, height, onResize, todos, jobs }) {
  const active = view === 'jobs' && jobs.length > 0 ? 'jobs' : 'tasks'
  const total = todos.length
  const done = todos.filter(item => item?.status === 'completed').length
  const ratio = total === 0 ? 0 : Math.round((done / total) * 100)

  const startResize = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    const startY = event.clientY
    const startHeight = height
    const target = event.currentTarget
    target.setPointerCapture?.(event.pointerId)
    const move = (moveEvent) => {
      const next = startHeight + (startY - moveEvent.clientY)
      onResize(Math.max(TASKS_MIN, Math.min(tasksMax(), Math.round(next))))
    }
    const stop = () => {
      target.releasePointerCapture?.(event.pointerId)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }, [height, onResize])

  const meta = [
    active === 'tasks' && total > 0
      ? h('span', {
        key: 'bar',
        className: 'npr-progress',
        'data-npr': 'progress',
        role: 'progressbar',
        'aria-valuemin': 0,
        'aria-valuemax': total,
        'aria-valuenow': done,
        'aria-label': `${String(done)}/${String(total)}`,
      }, h('span', { className: 'npr-progress-fill', style: { width: `${String(ratio)}%` } }))
      : null,
    active === 'tasks' && total > 0
      ? h('span', { key: 'count', className: 'npr-taskbar-count', 'data-npr': 'tasks-count' },
        `${String(done)}/${String(total)} ${t('tasks.done')}`)
      : null,
    jobs.length > 0
      ? h(Button, {
        key: 'jobs',
        variant: 'ghost',
        size: 'sm',
        className: 'npr-taskbar-jobs',
        'data-npr': 'tasks-view',
        'aria-pressed': active === 'jobs',
        onClick: () => onView(active === 'jobs' ? 'tasks' : 'jobs'),
      }, active === 'jobs'
        ? t('drawer.tasks')
        : `${t('drawer.jobs')} ${String(jobs.length)}`)
      : null,
  ]

  return h('div', {
    className: 'npr-taskbar',
    'data-npr': 'tasks-panel',
    'data-view': active,
    'data-collapsed': collapsed ? 'true' : 'false',
    style: collapsed ? undefined : { height: `${String(height)}px` },
  },
  h('div', {
    className: 'npr-grip',
    'data-npr': 'grip',
    role: 'separator',
    'aria-orientation': 'horizontal',
    'aria-label': t('drawer.resize'),
    onPointerDown: startResize,
  }),
  h(DisclosureRow, {
    icon: h('span', { className: 'npr-icon npr-taskbar-icon', 'aria-hidden': 'true' },
      h(IconChecklistOutlineRegular, { size: 14 })),
    title: active === 'jobs' ? t('drawer.jobs') : t('drawer.tasks'),
    open: !collapsed,
    expandable: true,
    onToggle: () => onCollapsed(!collapsed),
    expandOnRowClick: true,
    className: 'npr-taskbar-head',
    contentClassName: 'npr-taskbar-title-wrap',
    titleClassName: 'npr-taskbar-title',
    chevronClassName: 'npr-taskbar-chev',
    headerAccessory: h('span', { className: 'npr-taskbar-meta', 'data-npr': 'taskbar-meta' }, meta),
  }, collapsed
    ? null
    : h('div', { className: 'npr-taskbar-body', 'data-npr': 'tasks-body' },
      active === 'jobs' ? h(JobsView, { jobs, t }) : h(TasksView, { todos, t }))))
}
