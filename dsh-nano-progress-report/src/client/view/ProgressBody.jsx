/** ProgressBody — the Progress workbench pane. It lives ONLY in the right
 *  workbench tab (`sidebar.right.pane.tab`); the chat interface already owns
 *  the trajectory view and must not get a second Progress tab.
 *  Props arrive from the seat + this plugin's inject: { sessionId, ctx, t }.
 *
 *  Arrangement follows the Devin Progress reference: a quiet search line,
 *  turns whose steps are indented behind a hairline, and the Tasks footer. */
import React from 'react'
import {
  AnimatedRows, Button, IconCloseOutlineRegular, IconSearchOutlineRegular,
  IconSlidersTwoOutlineRegular, Input, Menu,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { applyFilter, isEmptyFilter, parseFilter } from '../filter.js'
import { activeMenuTokens, filterCounts, toggleMenuToken } from '../filter-menu.js'
import { STATUSES, TYPES } from '../constants.js'
import { taskCompletionTimes } from '../task-times.js'
import { perf } from '../perf.js'
import { Row } from './Row.jsx'
import { TasksSection } from './TasksSection.jsx'
import { Turn } from './Turn.jsx'

const { createElement: h, useEffect, useMemo, useState } = React

/** Task-bar preference (height + collapsed + list) — pure view state. */
const TASKS_KEY = 'dsh-nano-progress-report:tasks'
const TASKS_DEFAULT = { height: 200, collapsed: false, view: 'tasks' }

function readTasks() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TASKS_KEY) ?? 'null')
    if (parsed === null || typeof parsed !== 'object') return TASKS_DEFAULT
    return {
      height: typeof parsed.height === 'number' ? parsed.height : TASKS_DEFAULT.height,
      collapsed: parsed.collapsed === true,
      view: typeof parsed.view === 'string' ? parsed.view : TASKS_DEFAULT.view,
    }
  } catch { return TASKS_DEFAULT }
}

function safeGet(source) {
  try { return source === null || source === undefined ? undefined : source.getSnapshot() }
  catch { return undefined }
}

/** Subscribe to an ObservableSnapshot ({getSnapshot, subscribe}). */
function useExternal(source, deps) {
  const [value, setValue] = useState(() => safeGet(source))
  useEffect(() => {
    if (source === null || source === undefined) { setValue(undefined); return undefined }
    setValue(safeGet(source))
    return source.subscribe(() => setValue(safeGet(source)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}

export default function ProgressBody(props) {
  const { sessionId, ctx, t } = props
  const storageKey = `dsh-nano-progress-report:filter:${sessionId ?? 'all'}`
  const [query, setQuery] = useState(() => {
    try { return window.localStorage.getItem(storageKey) ?? '' } catch { return '' }
  })
  const onQuery = (value) => {
    setQuery(value)
    if (value !== query) perf.count('filter-apply')
    try { window.localStorage.setItem(storageKey, value) } catch { /* storage off */ }
  }
  const [now, setNow] = useState(() => Date.now())
  const [bindingError, setBindingError] = useState(false)
  const [openKey, setOpenKey] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [tasks, setTasks] = useState(readTasks)

  const target = useMemo(() => {
    try { return perf.span('progress-subscribe', () => ctx.uiConversation.binding(sessionId).target('progress')) }
    catch { return null }
  }, [ctx, sessionId])
  useEffect(() => { setBindingError(target === null) }, [target])
  const progress = useExternal(target, [target])

  const sessionFace = useMemo(() => {
    try { return ctx.sessions.binding(sessionId)?.session ?? null } catch { return null }
  }, [ctx, sessionId])
  const sessionSnap = useExternal(sessionFace, [sessionFace])

  const todosSource = useMemo(() => {
    try { return sessionFace?.projections?.faceOf?.('todos') ?? null } catch { return null }
  }, [sessionFace])
  const todos = useExternal(todosSource, [todosSource])

  const jobsSource = useMemo(() => ctx.jobs?.state ?? null, [ctx])
  const jobsSnap = useExternal(jobsSource, [jobsSource])
  useEffect(() => {
    if (ctx.jobs?.watchRows === undefined || sessionId === undefined) return undefined
    return ctx.jobs.watchRows(sessionId)
  }, [ctx, sessionId])

  useEffect(() => {
    perf.count('tab-open')
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => { setReady(true) }, [])
  useEffect(() => {
    try { window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) } catch { /* storage off */ }
  }, [tasks])

  const filter = useMemo(() => parseFilter(query), [query])
  const rows = progress?.rows ?? []
  const groups = progress?.groups ?? []
  const grouped = isEmptyFilter(filter)
  const filtered = useMemo(
    () => (isEmptyFilter(filter) ? rows : applyFilter(rows, filter)),
    [rows, filter],
  )
  // Devi's Tasks rows carry a completion time; derive it from the event stream.
  const taskTimes = useMemo(() => taskCompletionTimes(rows), [rows])

  const counts = useMemo(() => filterCounts(rows), [rows])
  const selectedTokens = useMemo(() => activeMenuTokens(query), [query])
  const menuItems = useMemo(() => [
    { type: 'label', id: 'label-status', text: t('filter.status') },
    ...STATUSES.map(value => ({
      id: `status:${value}`,
      // The host menu's `shortcut` slot renders key caps (array), not a count;
      // fold the number into the label instead of abusing it.
      label: `${t(`filter.status.${value}`)} (${String(counts.statuses[value] ?? 0)})`,
    })),
    { type: 'separator', id: 'sep-1' },
    { type: 'label', id: 'label-type', text: t('filter.type') },
    ...TYPES.map(value => ({
      id: `type:${value}`,
      label: `${t(`filter.type.${value}`)} (${String(counts.types[value] ?? 0)})`,
    })),
    { type: 'separator', id: 'sep-2' },
    { id: 'clear', label: t('filter.clearAll'), disabled: query === '' },
  ], [counts, query, t])

  const hasMore = sessionSnap?.hasMore === true
  const loadingOlder = sessionSnap?.loadingOlder === true
  const jobs = jobsSnap?.rows?.[sessionId] ?? []
  const todoItems = Array.isArray(todos) ? todos : []
  const setTasksField = (patch) => setTasks(current => ({ ...current, ...patch }))

  if (bindingError) {
    return h('div', { className: 'npr-empty', 'data-nano-progress-report': '1', 'data-npr': 'root' },
      t('session.unavailable'))
  }

  const toggleRow = (key) => {
    if (openKey !== key) perf.count('row-expand')
    setOpenKey(current => (current === key ? null : key))
  }

  const stats = query === ''
    ? ''
    : t('toolbar.matched').replace('{n}', String(filtered.length)).replace('{total}', String(rows.length))

  return h('div', { 'data-nano-progress-report': '1', 'data-npr': 'root' },
    h('div', { className: 'npr-toolbar', 'data-npr': 'toolbar' },
      h('div', { className: 'npr-search-wrap' },
        h('span', { className: 'npr-toolbar-icon', 'aria-hidden': 'true' },
          h(IconSearchOutlineRegular, { size: 14 })),
        h(Input, {
          className: 'npr-search',
          'data-npr': 'search',
          type: 'search',
          value: query,
          placeholder: t('filter.placeholder'),
          'aria-label': t('filter.placeholder'),
          onChange: event => onQuery(event.currentTarget.value),
        })),
      query !== ''
        ? h(Button, {
          variant: 'ghost', size: 'sm', 'data-npr': 'filter-clear',
          icon: h(IconCloseOutlineRegular, { size: 12 }),
          'aria-label': t('filter.clear'),
          onClick: () => onQuery(''),
        })
        : null,
      stats !== '' ? h('span', { className: 'npr-stats', 'data-npr': 'stats' }, stats) : null,
      h(Menu, {
        open: filterOpen,
        anchor: h(Button, {
          variant: 'ghost',
          size: 'sm',
          className: 'npr-filter',
          'data-npr': 'filter-toggle',
          'aria-label': t('filter.button'),
          'aria-expanded': filterOpen ? 'true' : 'false',
          icon: h(IconSlidersTwoOutlineRegular, { size: 14 }),
          onClick: () => setFilterOpen(open => !open),
        }),
        items: menuItems,
        selectedIds: selectedTokens,
        selection: 'check',
        align: 'end',
        side: 'bottom',
        onSelect: (id) => {
          if (id === 'clear') { onQuery(''); return }
          onQuery(toggleMenuToken(query, id))
        },
        onClose: () => setFilterOpen(false),
      })),

    h('div', { className: 'npr-flow', 'data-npr': 'flow' },
      hasMore
        ? h('div', { className: 'npr-older' },
          h(Button, {
            variant: 'ghost', size: 'sm', 'data-npr': 'load-older',
            onClick: () => {
              perf.count('load-older')
              try { void sessionFace?.loadOlder?.() } catch { /* noop */ }
            },
            disabled: loadingOlder,
          }, loadingOlder ? t('flow.loadingOlder') : t('flow.loadOlder')))
        : null,
      filtered.length === 0
        ? h('div', { className: 'npr-empty', 'data-npr': 'empty' },
          isEmptyFilter(filter) ? t('flow.empty') : t('flow.emptyFiltered'))
        : grouped
          ? h('div', { className: 'npr-turns', role: 'list', 'aria-label': t('flow.list'), 'data-npr': 'turns' },
            groups.map(group => h(Turn, {
              key: group.key,
              group,
              now,
              t,
              openKey,
              onRowToggle: toggleRow,
            })))
          : h(AnimatedRows, {
            className: 'npr-rows',
            role: 'list',
            label: t('flow.list'),
            ready,
            resetKey: query,
            rowKeys: filtered.map(row => row.key),
          }, filtered.map(row => perf.span('row-render', () => h(Row, {
            key: row.key,
            row,
            now,
            t,
            open: openKey === row.key,
            onToggle: () => toggleRow(row.key),
          }))))),

    h(TasksSection, {
      t,
      view: tasks.view,
      onView: value => setTasksField({ view: value }),
      collapsed: tasks.collapsed,
      onCollapsed: value => setTasksField({ collapsed: value }),
      height: tasks.height,
      onResize: value => setTasksField({ height: value }),
      todos: todoItems,
      taskTimes,
      jobs,
    }))
}
