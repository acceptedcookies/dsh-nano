/** Sidebar "云端工作区" section.
 *
 *  `sidebar.workspaces` is a single-seat slot owned by the shipped workspace
 *  browser, so a sibling section cannot be registered as a slot. This inserts
 *  our own host before that slot and portals the section into it.
 *
 *  The section paints itself from host tokens and the nano-ui spacing scale:
 *  one header row, one disclosure row for the active profile and one row per
 *  cloud session. Every control, glyph and status dot is a host primitive
 *  (`Button`, `DisclosureRow`, `StateDot`, `Tag`, `Icon*`). It does not read
 *  host class names or host custom properties: the collapsed rail is detected
 *  from the measured width of our own host, and the only host selector is the
 *  `sidebar.workspaces` slot attribute used for placement — the shell gap is
 *  registered in DESIGN.md §8.
 */
import React from 'react'
import { createPortal } from 'react-dom'
import {
  DisclosureRow,
  StateDot,
  Tag,
  IconArchiveOutlineRegular,
  IconFolderCloseRegular,
  IconFolderOpenRegular,
  IconGlobeOutlineRegular,
  IconProjectAddOutlineRegular,
  IconRefreshOutlineRegular,
  IconSettingsOutlineRegular,
  relativeTime,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { IconButton } from 'dsh-nano-ui'

const { createElement: h, useEffect, useState } = React

const HOST_ATTR = 'data-nano-cloud-session-section'
const GRAFT_ATTR = 'data-nano-cloud-session-section-graft'
/** Below this width the sidebar is the collapsed rail. */
const RAIL_WIDTH = 120

/** Watch the workspaces slot's parent for the graft host position.
 *
 *  The host lives as a sibling of the slot, so a host removal or a slot
 *  replacement is a direct child mutation of the region: nothing else on the
 *  page wakes us, and no host class is read. */
function useSlotWatch(onChange, region = false) {
  const latest = React.useRef(onChange)
  latest.current = onChange
  useEffect(() => {
    let target = null
    const observer = new MutationObserver(() => latest.current())
    const attach = () => {
      const slot = document.querySelector('[data-slot="sidebar.workspaces"]')
      const next = region ? slot?.parentElement ?? null : slot
      if (next === target) return false
      observer.disconnect()
      target = next
      if (target != null) observer.observe(target, region ? { childList: true } : { childList: true, subtree: true })
      return true
    }
    if (attach()) latest.current()
    const poll = window.setInterval(() => { if (attach()) latest.current() }, 400)
    return () => {
      window.clearInterval(poll)
      observer.disconnect()
    }
  }, [])
}

/** Find the region area and prepend our host before the workspace slot. */
function findHost() {
  const slot = document.querySelector('[data-slot="sidebar.workspaces"]')
  const region = slot?.parentElement
  if (region == null) return null
  let host = region.querySelector(`[${HOST_ATTR}]`)
  if (host == null) {
    host = document.createElement('div')
    host.setAttribute(HOST_ATTR, '')
    host.setAttribute(GRAFT_ATTR, '')
  }
  if (host.nextElementSibling !== slot) region.insertBefore(host, slot)
  return host
}

function useGraftHost() {
  const [host, setHost] = useState(null)
  const hostRef = React.useRef(null)
  /* The host is a sibling of the slot, so watch the region (slot's parent)
   * rather than the document: a host removal or a slot replacement is a direct
   * child mutation there, and nothing else on the page wakes us. */
  const sync = () => {
    const next = findHost()
    if (next === hostRef.current) return
    hostRef.current = next
    setHost(next)
  }
  useSlotWatch(sync, true)
  useEffect(() => {
    sync()
    return () => { hostRef.current?.remove() }
  }, [])
  return host
}

/** Collapsed-rail detection from our own host box (never from a host class). */
function useHostWidth(host) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (host == null) return
    const read = () => setWidth(Math.round(host.getBoundingClientRect().width))
    read()
    if (typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(read)
    observer.observe(host)
    return () => observer.disconnect()
  }, [host])
  return width
}

/** Devin session status → the native StateDot state vocabulary
 *  (`ongoing` | `idle` | `done` | `warning`). The dot carries the meaning; the
 *  localized label rides beside it as screen-reader-only text. */
const dotState = status => {
  switch (String(status ?? '').toLowerCase()) {
    case 'running':
    case 'working':
    case 'resuming':
    case 'pending':
      return 'ongoing'
    case 'suspended':
    case 'sleeping':
      return 'idle'
    case 'blocked':
    case 'error':
    case 'failed':
      return 'warning'
    default:
      return 'done'
  }
}

/** Host bucketing (`relativeTime`) + the locale's own wording. */
const RELATIVE_UNIT = {
  minutes: ['minute', -1],
  hours: ['hour', -1],
  days: ['day', -1],
  months: ['month', -1],
  years: ['year', -1],
}

const relativeLabel = (value, locale) => {
  if (!value) return ''
  const then = Date.parse(value)
  if (Number.isNaN(then)) return ''
  const { unit, n } = relativeTime(then, Date.now())
  const [intlUnit, sign] = RELATIVE_UNIT[unit] ?? ['second', 0]
  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'narrow' }).format(sign * n, intlUnit)
  } catch {
    return ''
  }
}

const onKeyActivate = action => event => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action()
}

function skeleton() {
  return h('div', { className: 'dncs-skeleton-row', role: 'status', 'aria-busy': 'true' },
    h('span', { className: 'dncs-skeleton-dot' }),
    h('span', { className: 'dncs-skeleton-bar' }))
}

function SessionRow({ session, selected, copy, face, locale }) {
  const open = () => face.openSession(session.session_id)
  const title = session.title || session.session_id
  return h('div', {
    key: session.session_id,
    className: 'dncs-session',
    'data-active': selected ? 'true' : undefined,
    title,
  },
    h('div', {
      role: 'button',
      tabIndex: 0,
      className: 'dncs-session-main',
      'aria-pressed': selected,
      onClick: open,
      onKeyDown: onKeyActivate(open),
    },
      h('span', { className: 'dncs-session-dot' },
        h(StateDot, { state: dotState(session.status) }),
        h('span', { className: 'dncs-sr-only' }, session.status ?? '')),
      h('span', { className: 'dncs-session-title' }, title),
      h('span', { className: 'dncs-session-time' }, relativeLabel(session.updated_at ?? session.created_at, locale))),
    /* Resting state shows the relative time; the archive action rides in on
     * hover/focus exactly like the native session row's actions slot. */
    h('span', { className: 'dncs-session-actions' },
      h(IconButton, {
        icon: h(IconArchiveOutlineRegular, { size: 14 }),
        'aria-label': copy('archive'),
        onClick: event => {
          event.stopPropagation()
          event.preventDefault()
          face.askArchive(session.session_id)
        },
      })))
}

function sectionBody({ copy, face, state }) {
  const profile = (state.profiles ?? []).find(item => item.id === state.activeId) ?? null
  const sessions = state.sessions ?? []
  const open = state.expanded !== false
  const locale = state.locale

  if (state.loading === true) return skeleton()

  /* The host switched the plugin off: no settings shortcut here either —
   * every dialog field rides on the same unregistered routes. */
  if (state.disabled === true) {
    return h('div', { className: 'dncs-section-body' },
      h('div', { className: 'dncs-empty-row dncs-section-muted' },
        h('span', { className: 'dncs-empty-label' }, copy('pluginDisabled'))))
  }

  if (profile == null) {
    return h('div', { className: 'dncs-section-body' }, h('div', {
      role: 'button',
      tabIndex: 0,
      className: 'dncs-empty-row',
      title: copy('emptyCloud'),
      onClick: () => face.openSettings(),
      onKeyDown: onKeyActivate(() => face.openSettings()),
    },
      h(IconGlobeOutlineRegular, { size: 16 }),
      h('span', { className: 'dncs-empty-label' }, copy('emptyCloud'))))
  }

  const errorRow = state.error
    ? h('div', { className: 'dncs-error-row', role: 'alert', title: state.error }, state.error)
    : null

  const sessionRows = !open
    ? []
    : sessions.length === 0
      ? h('div', { className: 'dncs-empty-row dncs-section-muted' }, copy('noSessions'))
      : sessions.map(session => h(SessionRow, {
        key: session.session_id,
        session,
        selected: state.activeSessionId === session.session_id,
        copy,
        face,
        locale,
      }))

  return h('div', { className: 'dncs-section-body' },
    h(DisclosureRow, {
      open,
      expandable: true,
      expandOnRowClick: true,
      onToggle: () => face.toggleExpanded(),
      icon: h(open ? IconFolderOpenRegular : IconFolderCloseRegular, { size: 16 }),
      title: profile.label || copy('carrierDevin'),
      headerAccessory: h('span', { className: 'dncs-section-count' }, h(Tag, { tone: 'quiet' }, String(sessions.length))),
    }, sessionRows),
    /* A failed list read or a failed open must stay visible even when the
     * profile row is collapsed: the section is the only surface the owner has
     * before a native Chat exists. */
    errorRow)
}

function CloudSection({ copy, face, state, rail }) {
  /* Rail mode: one 36×36 icon entry. The host owns the sidebar toggle (the
   * `layout` service, soft-read in index.js), so the entry re-expands the sidebar
   * instead of scanning the document for the host's own button; if the layout
   * service is unavailable the entry opens the settings dialog so it is never
   * dead. */
  if (rail) {
    return h('div', { className: 'dncs-section dncs-rail' },
      h(IconButton, {
        icon: h(IconGlobeOutlineRegular, { size: 18 }),
        'aria-label': copy('cloudWorkspace'),
        onClick: () => {
          if (face.expandSidebar()) return
          face.openSettings()
        },
      }))
  }

  return h('div', { className: 'dncs-section' },
    h('div', { className: 'dncs-section-header' },
      h('span', { className: 'dncs-section-label' }, copy('cloudWorkspace')),
      h('div', { className: 'dncs-section-actions' },
        h(IconButton, {
          icon: h(IconRefreshOutlineRegular, { size: 14, className: state.refreshing ? 'dncs-spin' : undefined }),
          'aria-label': copy('refresh'),
          disabled: state.refreshing === true,
          onClick: () => { void face.refresh() },
        }),
        h(IconButton, {
          icon: h(IconSettingsOutlineRegular, { size: 16 }),
          'aria-label': copy('settingsTitle'),
          onClick: () => face.openSettings(),
        }),
        h(IconButton, {
          icon: h(IconProjectAddOutlineRegular, { size: 16 }),
          'aria-label': copy('newSession'),
          onClick: () => face.openNew(),
        }))),
    h('div', { className: 'dncs-section-list' }, sectionBody({ copy, face, state })))
}

export function CloudSectionGraft({ face, state }) {
  const host = useGraftHost()
  const width = useHostWidth(host)
  if (host == null) return null
  const rail = width > 0 && width < RAIL_WIDTH
  return createPortal(h(CloudSection, {
    copy: face.copy(),
    face,
    rail,
    state: { ...state, locale: face.locale },
  }), host)
}
