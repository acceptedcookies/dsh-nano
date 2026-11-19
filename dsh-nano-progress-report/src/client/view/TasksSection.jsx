/** Bottom task bar — the Devin Progress footer: one 30px header line
 *  (`Tasks` + done/total + a 3px progress bar + ghost text switches) and the
 *  list underneath. Switches appear only when the ledger's current work item
 *  actually has data for that list (C2-04): Files, Failures, Jobs. When the
 *  visible list empties the panel snaps back to Tasks. The header is the host
 *  `DisclosureRow`, so the chevron, keyboard toggle and aria-expanded come
 *  from the host; the bar itself is the only local primitive.
 *
 *  The top edge stays draggable (pointer capture + clamped height) and the
 *  header collapses the body, matching the workspace tool panels. */
import React from 'react'
import { Button, DisclosureRow, IconChecklistOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { JobsView } from './JobsView.jsx'
import { FailuresView, FilesView, TasksView } from './TasksView.jsx'

const { createElement: h, useCallback, useEffect } = React

/** Smallest useful body: the header plus two task rows. */
export const TASKS_MIN = 88
/** Ceiling leaves the timeline most of the pane. */
export const tasksMax = () => Math.max(TASKS_MIN, Math.round(window.innerHeight * 0.6))

const VIEW_COUNTS = item => ({
  tasks: item?.tasks?.length ?? 0,
  files: item?.files?.length ?? 0,
  failures: item?.failures?.length ?? 0,
})

/**
 * @param {{ t: Function, view: string, onView: (v: string) => void,
 *   collapsed: boolean, onCollapsed: (v: boolean) => void,
 *   height: number, onResize: (px: number) => void,
 *   item: object|null, jobs: object[],
 *   failureTitleOf?: (callId: string) => string|null }} props
 *   `item` is the ledger's current full-tier work item (or null).
 */
export function TasksSection({ t, view, onView, collapsed, onCollapsed, height, onResize, item, jobs, failureTitleOf }) {
  const counts = VIEW_COUNTS(item)
  const options = [
    { id: 'tasks', count: counts.tasks },
    { id: 'files', count: counts.files },
    { id: 'failures', count: counts.failures },
    { id: 'jobs', count: jobs.length },
  ]
  const active = options.some(option => option.id === view && option.count > 0)
    ? view : 'tasks'
  // C2-04: a list that empties snaps the panel (and the persisted view) back
  // to Tasks — the switch itself is also removed by the same condition.
  useEffect(() => {
    if (view !== 'tasks' && !options.some(option => option.id === view && option.count > 0)) {
      onView('tasks')
    }
  })
  const tasks = item?.tasks ?? []
  const done = tasks.filter(task => task?.status === 'completed').length
  const total = tasks.length
  const ratio = total === 0 ? 0 : Math.round((done / total) * 100)
  const truncated = item?.truncated ?? {}

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
    // C2-04: text switches, only while their list has data.
    ...options.filter(option => option.id !== 'tasks' && option.count > 0).map(option => h(Button, {
      key: option.id,
      variant: 'ghost',
      size: 'sm',
      className: 'npr-taskbar-view',
      'data-npr': `switch-${option.id}`,
      'aria-pressed': active === option.id,
      onClick: (event) => {
        // The whole header toggles; a switch is its own action.
        event.stopPropagation()
        onView(active === option.id ? 'tasks' : option.id)
      },
    }, active === option.id
      ? t('drawer.tasks')
      : `${t(`drawer.${option.id}`)} ${String(option.count)}`)),
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
  // The whole 30px strip is the hit target, not just the title text: the
  // wrapper handles pointer clicks, the host row's leading button keeps the
  // keyboard path (and stops propagation), and the switches opt out.
  h('div', {
    className: 'npr-taskbar-head-wrap',
    'data-npr': 'tasks-head',
    onClick: () => onCollapsed(!collapsed),
  },
  h(DisclosureRow, {
    icon: h('span', { className: 'npr-icon npr-taskbar-icon', 'aria-hidden': 'true' },
      h(IconChecklistOutlineRegular, { size: 14 })),
    title: active === 'tasks' ? t('drawer.tasks') : t(`drawer.${active}`),
    open: !collapsed,
    expandable: true,
    onToggle: () => onCollapsed(!collapsed),
    expandOnRowClick: false,
    className: 'npr-taskbar-head',
    contentClassName: 'npr-taskbar-title-wrap',
    titleClassName: 'npr-taskbar-title',
    chevronClassName: 'npr-taskbar-chev',
    headerAccessory: h('span', { className: 'npr-taskbar-meta', 'data-npr': 'taskbar-meta' }, meta),
  })),
  collapsed
    ? null
    : h('div', { className: 'npr-taskbar-body', 'data-npr': 'tasks-body' },
      active === 'files' ? h(FilesView, { files: item?.files ?? [], truncated: truncated.files ?? 0, t })
        : active === 'failures' ? h(FailuresView, { failures: item?.failures ?? [], titleOf: failureTitleOf ?? (() => null), t })
          : active === 'jobs' ? h(JobsView, { jobs, t })
            : h(TasksView, { tasks, truncated: truncated.tasks ?? 0, t })))
}
