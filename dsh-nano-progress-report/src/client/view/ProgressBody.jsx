/** ProgressBody — the 'progress' workbench tab body.
 *  Props arrive from the seat + this plugin's inject: { sessionId, ctx, t }. */
import React from 'react'
import { Button, Input, IconChevronRightOutlineRegular, IconChevronDownOutlineRegular, IconChecklistOutlineRegular, IconRefreshOutlineRegular, IconCloseOutlineRegular, IconUserOutlineRegular, IconSparkleRegular, IconCodeOutlineRegular, IconDeliverDocRegular, IconGlobeOutlineRegular, IconSettingsOutlineRegular, IconAgentPresetOutlineRegular, IconClockOutlineRegular, IconQueueOutlineRegular, IconPlayOutlineRegular, IconCheckOutlineRegular, IconPauseOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { applyFilter, isEmptyFilter, parseFilter } from '../filter.js'
import { perf } from '../perf.js'

const { createElement: h, useEffect, useMemo, useState } = React

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

const TYPE_ICON = {
  prompt: IconUserOutlineRegular,
  message: IconSparkleRegular,
  shell: IconCodeOutlineRegular,
  file: IconDeliverDocRegular,
  web: IconGlobeOutlineRegular,
  tool: IconSettingsOutlineRegular,
  todo: IconChecklistOutlineRegular,
  subagent: IconAgentPresetOutlineRegular,
  wait: IconClockOutlineRegular,
  turn: IconPlayOutlineRegular,
  job: IconQueueOutlineRegular,
  lifecycle: IconPauseOutlineRegular,
}

const STATUS_ICON = {
  completed: IconCheckOutlineRegular,
  in_progress: IconClockOutlineRegular,
  pending: IconPauseOutlineRegular,
}

function relTime(time, now) {
  if (!time) return ''
  const s = Math.max(0, Math.floor((now - time) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const hr = Math.floor(m / 60)
  if (hr < 24) return `${hr}h`
  return `${Math.floor(hr / 24)}d`
}

function Row({ row, now, t }) {
  const [open, setOpen] = useState(false)
  const detail = row.detail
  const expandIcon = open
    ? h(IconChevronDownOutlineRegular, { size: 12 })
    : h(IconChevronRightOutlineRegular, { size: 12 })
  return perf.span('row-render', () => h(React.Fragment, null,
    h('div', { className: 'npr-row', 'data-type': row.type, 'data-status': row.status, 'data-npr': 'row' },
      row.expandable
        ? h('span', { className: 'npr-row-chevron' },
          h(Button, {
            variant: 'ghost', size: 'sm',
            icon: expandIcon,
            'aria-label': open ? t('row.collapse') : t('row.expand'),
            onClick: () => setOpen(v => {
              if (!v) perf.count('row-expand')
              return !v
            }),
          }))
        : h('span', { className: 'npr-row-chevron npr-row-chevron-spacer' }),
      h('span', { className: 'npr-row-icon', 'data-type': row.type },
        h(TYPE_ICON[row.type] ?? IconSettingsOutlineRegular, { size: 13 })),
      h('div', { className: 'npr-row-body' },
        h('div', { className: 'npr-row-summary', title: row.summary }, row.summary)),
      h('span', { className: 'npr-row-time', title: row.time ? new Date(row.time).toLocaleString() : '' }, relTime(row.time, now))),
    open && detail !== undefined
      ? h('div', { className: 'npr-row-detail' },
        detail.error !== undefined
          ? h('div', null, h('span', { className: 'npr-detail-label' }, 'error: '), String(detail.error))
          : null,
        detail.argsRaw
          ? h('div', null, h('span', { className: 'npr-detail-label' }, 'args: '), detail.argsRaw)
          : null,
        detail.resultText
          ? h('div', null, h('span', { className: 'npr-detail-label' }, 'result: '), detail.resultText)
          : null,
        detail.text ? h('div', null, detail.text) : null,
        detail.reasoning
          ? h('div', null, h('span', { className: 'npr-detail-label' }, 'reasoning: '), detail.reasoning)
          : null,
        Array.isArray(detail.todos) && detail.todos.length > 0
          ? h('div', null, detail.todos.map((todo, i) => h('div', { key: i, className: 'npr-subcall' },
            h('span', { className: 'npr-subcall-name' }, h(STATUS_ICON[todo.status] ?? IconPauseOutlineRegular, { size: 12 })),
            h('span', { className: 'npr-subcall-summary' }, todo.content))))
          : null,
        detail.durationMs !== undefined
          ? h('div', null, h('span', { className: 'npr-detail-label' }, 'duration: '), `${(detail.durationMs / 1000).toFixed(1)}s`)
          : null,
        Array.isArray(detail.children) && detail.children.length > 0
          ? h('div', { className: 'npr-subcalls' }, detail.children.map((child, i) => h('div', { key: i, className: 'npr-subcall', 'data-status': child.status },
            h('span', { className: 'npr-subcall-name' }, child.name),
            h('span', { className: 'npr-subcall-summary' }, child.summary))))
          : null)
      : null))
}

function FilterChips({ filter }) {
  const chips = []
  for (const type of filter.types) chips.push({ key: `t:${type}`, label: `type:${type}` })
  for (const type of filter.notTypes) chips.push({ key: `nt:${type}`, label: `-type:${type}`, neg: true })
  for (const status of filter.statuses) chips.push({ key: `s:${status}`, label: `status:${status}` })
  for (const status of filter.notStatuses) chips.push({ key: `ns:${status}`, label: `-status:${status}`, neg: true })
  if (filter.tool !== null) chips.push({ key: 'tool', label: `tool:${filter.tool}` })
  if (filter.notTool !== null && filter.notTool !== undefined) chips.push({ key: 'ntool', label: `-tool:${filter.notTool}`, neg: true })
  if (chips.length === 0) return null
  return h('div', { className: 'npr-filter-chips' },
    chips.map(chip => h('span', { key: chip.key, className: 'npr-filter-chip', 'data-neg': chip.neg === true ? 'true' : undefined }, chip.label)))
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

  const target = useMemo(() => {
    try { return perf.span('progress-subscribe', () => ctx.uiConversation.binding(sessionId).target('progress')) }
    catch { return null }
  }, [ctx, sessionId])
  useEffect(() => {
    setBindingError(target === null)
  }, [target])
  const progress = useExternal(target, [target])

  const sessionFace = useMemo(() => {
    try { return ctx.sessions.binding(sessionId)?.session ?? null } catch { return null }
  }, [ctx, sessionId])
  const sessionSnap = useExternal(sessionFace, [sessionFace])

  const listSource = useMemo(() => ctx.sessions?.list ?? null, [ctx])
  const sessionList = useExternal(listSource, [listSource])
  const sessionTitle = sessionList?.byId?.[sessionId]?.displayTitle
    ?? sessionList?.byId?.[sessionId]?.title ?? 'session'

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

  const filter = useMemo(() => parseFilter(query), [query])
  const rows = progress?.rows ?? []
  const filtered = useMemo(
    () => (isEmptyFilter(filter) ? rows : applyFilter(rows, filter)),
    [rows, filter],
  )

  const running = sessionSnap?.running === true
  const hasMore = sessionSnap?.hasMore === true
  const loadingOlder = sessionSnap?.loadingOlder === true
  const jobs = jobsSnap?.rows?.[sessionId] ?? []
  // faceOf('todos') snapshot value is `TodoItem[] | null` — the host wrapper
  // is a type marker only (dsh-tool-todo merge), host TodoDock consumes an array.
  const todoItems = Array.isArray(todos) ? todos : []
  const todoDone = todoItems.filter(item => item?.status === 'completed').length
  const todoCounts = todoItems.length > 0 ? { completed: todoDone } : null

  if (bindingError) {
    return h('div', { className: 'npr-empty', 'data-nano-progress-report': '1' }, t('session.unavailable'))
  }

  return h('div', { 'data-nano-progress-report': '1', 'data-npr': 'root' },
    h('div', { className: 'npr-head' },
      h('div', { className: 'npr-head-title' },
        h('span', { className: 'npr-head-name' }, sessionTitle),
        h('span', { className: 'npr-head-state' }, running ? t('state.running') : t('state.idle'))),
      h('div', { className: 'npr-head-actions' },
        h(Button, {
          variant: 'ghost', size: 'sm',
          icon: h(IconRefreshOutlineRegular, { size: 14 }),
          'aria-label': t('head.refresh'),
          onClick: () => setNow(Date.now()),
        }))),

    h('div', { className: 'npr-filter' },
      h(Input, {
        className: 'npr-filter-input', value: query,
        placeholder: t('filter.placeholder'),
        onChange: event => onQuery(event.currentTarget.value),
      }),
      h(FilterChips, { filter }),
      query !== ''
        ? h(Button, {
          variant: 'ghost', size: 'sm',
          icon: h(IconCloseOutlineRegular, { size: 13 }),
          'aria-label': t('filter.clear'),
          onClick: () => onQuery(''),
        })
        : null),

    h('div', { className: 'npr-flow', role: 'list', 'data-npr': 'flow' },
      hasMore
        ? h(Button, {
          variant: 'outline', size: 'sm', className: 'npr-load-older',
          onClick: () => {
            perf.count('load-older')
            try { void sessionFace?.loadOlder?.() } catch { /* noop */ }
          },
          disabled: loadingOlder,
        }, loadingOlder ? t('flow.loadingOlder') : t('flow.loadOlder'))
        : null,
      filtered.length === 0
        ? h('div', { className: 'npr-empty' }, isEmptyFilter(filter) ? t('flow.empty') : t('flow.emptyFiltered'))
        : filtered.map(row => h(Row, { key: row.key, row, now, t }))),

    h('div', { className: 'npr-panel', 'data-npr': 'tasks' },
      h('div', { className: 'npr-panel-head' },
        h('span', { className: 'npr-panel-title' },
          h(IconChecklistOutlineRegular, { size: 13, style: { marginRight: 6, verticalAlign: '-2px' } }),
          t('tasks.title')),
        h('span', { className: 'npr-panel-count' },
          todoCounts !== null ? `${todoDone}/${todoItems.length} ${t('tasks.done')}` : '')),
      todoItems.length > 0
        ? h('div', { className: 'npr-panel-bar' },
          h('div', {
            className: 'npr-panel-bar-fill',
            style: { width: `${Math.round(100 * todoDone / Math.max(1, todoItems.length))}%` },
          }))
        : null,
      h('div', { className: 'npr-panel-list' },
        todoItems.length === 0
          ? h('div', { className: 'npr-empty', style: { padding: '8px' } }, t('tasks.empty'))
          : todoItems.map((todo, i) => h('div', { key: i, className: 'npr-task', 'data-status': todo.status },
            h('span', { className: 'npr-task-dot' }, h(STATUS_ICON[todo.status] ?? IconPauseOutlineRegular, { size: 12 })),
            h('span', { className: 'npr-task-text' }, todo.content))))),

    jobs.length > 0
      ? h('div', { className: 'npr-panel', 'data-npr': 'jobs' },
        h('div', { className: 'npr-panel-head' },
          h('span', { className: 'npr-panel-title' }, t('jobs.title')),
          h('span', { className: 'npr-panel-count' }, String(jobs.length))),
        h('div', { className: 'npr-panel-list' },
          jobs.map(job => h('div', { key: job.id, className: 'npr-job', 'data-status': job.status },
            h('span', { className: 'npr-job-label' }, job.label ?? job.kind ?? job.id),
            h('span', { className: 'npr-job-status' }, job.status)))))
      : null)
}
