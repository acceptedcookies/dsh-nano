/** ProgressBody — the Progress surface, mounted twice:
 *  - `variant: 'pane'` — the 'progress' workbench tab in the right sidebar;
 *  - `variant: 'view'` — the 'nano-progress' conversation view tab, which
 *    scrolls inside the host conversation body (sticky toolbar, no drawer).
 *  Props arrive from the seat + this plugin's inject: { sessionId, ctx, t, variant }.
 *
 *  Unfiltered, the timeline is grouped by turn (goal → round → turn); a filter
 *  switches to the flat matching rows.
 *
 *  Composition follows the two references the owner named:
 *  - DNK devtools: 38px toolbar (host `Input`, border-bottom l3) → content →
 *    26px status line (border-top l3) → top-edge-resizable drawer whose head is
 *    a host `SegmentedControl` on `bg-layer-1`.
 *  - Devin Progress: 24px disclosure rows (glyph → summary → relative time),
 *    failure marks, and a Tasks drawer.
 *  Every glyph/button/field is a host primitive; only layout glue is local. */
import React from 'react'
import { AnimatedRows, Button, IconCloseOutlineRegular, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { applyFilter, isEmptyFilter, parseFilter } from '../filter.js'
import { perf } from '../perf.js'
import { defaultOpen } from '../group-format.js'
import { Drawer } from './Drawer.jsx'
import { GoalHeader } from './GoalHeader.jsx'
import { GoalSection, Group } from './Group.jsx'
import { JobsView } from './JobsView.jsx'
import { Row } from './Row.jsx'
import { TasksView } from './TasksView.jsx'

const { createElement: h, useEffect, useMemo, useState } = React

/** Drawer preference (view + height + collapsed) — pure view state, so it lives
 *  in the browser, never in the host. Filter text has its own per-session key. */
const DRAWER_KEY = 'dsh-nano-progress-report:drawer'
const DRAWER_DEFAULT = { height: 184, collapsed: false, view: 'tasks' }

function readDrawer() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DRAWER_KEY) ?? 'null')
    if (parsed === null || typeof parsed !== 'object') return DRAWER_DEFAULT
    return {
      height: typeof parsed.height === 'number' ? parsed.height : DRAWER_DEFAULT.height,
      collapsed: parsed.collapsed === true,
      view: typeof parsed.view === 'string' ? parsed.view : DRAWER_DEFAULT.view,
    }
  } catch { return DRAWER_DEFAULT }
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
  const variant = props.variant === 'view' ? 'view' : 'pane'
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
  const [groupOverride, setGroupOverride] = useState(() => new Map())
  const [ready, setReady] = useState(false)
  const [drawer, setDrawer] = useState(readDrawer)

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

  const goalSource = useMemo(() => {
    try { return sessionFace?.projections?.faceOf?.('goal') ?? null } catch { return null }
  }, [sessionFace])
  const goal = useExternal(goalSource, [goalSource])

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
    try { window.localStorage.setItem(DRAWER_KEY, JSON.stringify(drawer)) } catch { /* storage off */ }
  }, [drawer])

  const filter = useMemo(() => parseFilter(query), [query])
  const rows = progress?.rows ?? []
  const groups = progress?.groups ?? []
  const grouped = isEmptyFilter(filter)
  const filtered = useMemo(
    () => (isEmptyFilter(filter) ? rows : applyFilter(rows, filter)),
    [rows, filter],
  )

  const running = sessionSnap?.running === true
  const hasMore = sessionSnap?.hasMore === true
  const loadingOlder = sessionSnap?.loadingOlder === true
  const jobs = jobsSnap?.rows?.[sessionId] ?? []
  const todoItems = Array.isArray(todos) ? todos : []
  const todoDone = todoItems.filter(item => item?.status === 'completed').length
  const failed = progress?.counts?.failed ?? 0
  const awaiting = (progress?.counts?.awaiting ?? 0) > 0

  // A stale `jobs` view must not strand the drawer on an empty tab.
  const view = drawer.view === 'jobs' && jobs.length > 0 ? 'jobs' : 'tasks'
  const setDrawerField = (patch) => setDrawer(current => ({ ...current, ...patch }))

  if (bindingError) {
    return h('div', { className: 'npr-empty', 'data-nano-progress-report': '1', 'data-npr': 'root', 'data-variant': variant },
      t('session.unavailable'))
  }

  const toggleRow = (key) => {
    if (openKey !== key) perf.count('row-expand')
    setOpenKey(current => (current === key ? null : key))
  }
  const goalObjective = goal?.goal?.objective
  const goalId = goal?.goal?.id
  const renderGroups = () => {
    const out = []
    let lastGoal = null
    groups.forEach((group, index) => {
      const last = index === groups.length - 1
      if (group.goalId !== null && group.goalId !== lastGoal) {
        out.push(h(GoalSection, {
          key: `goal:${group.key}`,
          objective: group.goalId === goalId ? goalObjective : undefined,
          t,
        }))
      }
      if (group.opener !== null || group.goalId !== null) lastGoal = group.goalId
      const open = groupOverride.get(group.key) ?? defaultOpen(group, last)
      out.push(h(Group, {
        key: group.key,
        group,
        open,
        running: last && running && group.status === 'open',
        now,
        t,
        openKey,
        onRowToggle: toggleRow,
        onToggle: () => {
          perf.count('group-toggle')
          setGroupOverride((current) => {
            const next = new Map(current)
            next.set(group.key, !open)
            return next
          })
        },
      }))
    })
    return out
  }

  const stateKey = awaiting ? 'awaiting' : running ? 'running' : 'idle'
  const stats = query === ''
    ? t('toolbar.events').replace('{n}', String(rows.length))
    : t('toolbar.matched').replace('{n}', String(filtered.length)).replace('{total}', String(rows.length))

  const drawerOptions = [
    { value: 'tasks', label: t('drawer.tasks') },
    { value: 'jobs', label: t('drawer.jobs'), disabled: jobs.length === 0 },
  ]

  return h('div', { 'data-nano-progress-report': '1', 'data-npr': 'root', 'data-variant': variant },
    h('div', { className: 'npr-toolbar', 'data-npr': 'toolbar' },
      h(Input, {
        className: 'npr-search',
        'data-npr': 'search',
        type: 'search',
        value: query,
        placeholder: t('filter.placeholder'),
        'aria-label': t('filter.placeholder'),
        onChange: event => onQuery(event.currentTarget.value),
      }),
      query !== ''
        ? h(Button, {
          variant: 'ghost', size: 'sm', 'data-npr': 'filter-clear',
          icon: h(IconCloseOutlineRegular, { size: 14 }),
          'aria-label': t('filter.clear'),
          onClick: () => onQuery(''),
        })
        : null,
      // While filtering: the match count. Unfiltered, the pane's status line
      // carries the plain count; the view (no drawer) shows the task tally.
      query === ''
        ? (variant === 'view' && todoItems.length > 0
          ? h('span', { className: 'npr-stats', 'data-npr': 'tasks-count' },
            `${t('drawer.tasks')} ${String(todoDone)}/${String(todoItems.length)}`)
          : null)
        : h('span', { className: 'npr-stats', 'data-npr': 'stats' }, stats)),

    h(GoalHeader, { goal, t }),

    h('div', { className: 'npr-flow', 'data-npr': 'flow' },
      hasMore
        ? h('div', { className: 'npr-older' },
          h(Button, {
            variant: 'outline', size: 'sm', 'data-npr': 'load-older',
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
          ? h('div', { className: 'npr-groups', role: 'list', 'aria-label': t('flow.list'), 'data-npr': 'groups' },
            renderGroups())
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

    variant === 'view' ? null : h('div', { className: 'npr-status', 'data-npr': 'status' },
      h('span', { className: 'npr-status-item', 'data-npr': 'status-count' },
        t('status.events').replace('{n}', String(rows.length))),
      failed > 0
        ? h('span', { className: 'npr-status-item', 'data-npr': 'status-failed', 'data-bad': 'true' },
          t('status.failedCount').replace('{n}', String(failed)))
        : null,
      h('span', { className: 'npr-status-spacer' }),
      h('span', { className: 'npr-status-item', 'data-npr': 'state', 'data-state': stateKey },
        t(`state.${stateKey}`))),

    variant === 'view' ? null : h(Drawer, {
      t,
      view,
      onView: next => setDrawerField({ view: next }),
      options: drawerOptions,
      collapsed: drawer.collapsed,
      onCollapsed: value => setDrawerField({ collapsed: value }),
      height: drawer.height,
      onResize: value => setDrawerField({ height: value }),
      accessory: view === 'tasks' && todoItems.length > 0
        ? h('span', { className: 'npr-drawer-count', 'data-npr': 'tasks-count' },
          `${String(todoDone)}/${String(todoItems.length)} ${t('tasks.done')}`)
        : null,
    }, view === 'jobs'
      ? h(JobsView, { jobs, t })
      : h(TasksView, { todos: todoItems, t })))
}
