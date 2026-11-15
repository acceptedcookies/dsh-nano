/** Sidebar "云端工作区" section.
 *
 *  `sidebar.workspaces` is a single-seat slot owned by the shipped workspace
 *  browser, so a sibling section cannot be registered as a slot. This mirrors
 *  the retired shared-workspace graft: find the live workspace section, insert
 *  a host immediately before it, and portal the section into that host.
 *
 *  The section reuses the workspace browser's native class names (read once
 *  from the live DOM) for its root/header/rows, and every control is a native
 *  Button carrying native artwork from dsh-client-ui-primitives. Nothing is
 *  painted from a guessed frame.
 */
import React from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  IconFolderCloseRegular,
  IconFolderOpenRegular,
  IconGlobeOutlineRegular,
  IconProjectAddOutlineRegular,
  IconRefreshOutlineRegular,
  IconSettingsOutlineRegular,
  IconTriangleRightFillRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'

const { createElement: h, useEffect, useLayoutEffect, useRef, useState } = React

const HOST_ATTR = 'data-nano-cloud-session-section'
const GRAFT_ATTR = 'data-nano-cloud-session-section-graft'

const classOf = el => el?.getAttribute?.('class') ?? ''
const tokens = cls => String(cls).split(/\s+/).filter(Boolean)
const stripWide = cls => tokens(cls).filter(token => !/_wide$/.test(token)).join(' ')
const withLocal = (token, name) => {
  const cut = String(token).lastIndexOf('_')
  return cut < 0 ? '' : token.slice(0, cut + 1) + name
}

/** Read the workspace browser's current class names. Null until the header,
 *  list area, tree, and search/action controls are all mounted. */
function readChrome() {
  const graft = document.querySelector(`[${HOST_ATTR}]`)
  const label = [...document.querySelectorAll('span')].find(node =>
    !graft?.contains(node)
    && node.children.length === 0
    && (node.textContent?.trim() === '工作区' || node.textContent?.trim() === 'Workspace'))
  const header = label?.parentElement
  const root = header?.parentElement
  if (header == null || root == null) return null
  const listArea = [...root.children].find(el => /listArea/.test(classOf(el)))
  const tree = listArea?.querySelector('[role="tree"]')
  const row = [...root.querySelectorAll('[class*="projectRow"]')]
    .find(node => !String(node.className).includes('menuOpen')) ?? null
  if (listArea == null || tree == null || row == null) return null
  const searchSlot = header.querySelector('[class*="searchSlot"]')
  const actions = header.querySelector('[class*="headerActions"]')
  const search = searchSlot?.querySelector(':scope > div')
  const searchButton = search?.querySelector('button') ?? searchSlot?.querySelector('button')
  if (searchSlot == null || actions == null || searchButton == null) return null

  const folder = row?.querySelector('[class*="folder"]') ?? null
  const chevron = row?.querySelector('[class*="chevron"]') ?? null
  const projectText = row == null ? null : [...row.children].find(child => /Text/.test(classOf(child))) ?? null
  const titleEl = projectText?.querySelector('[class*="title"]') ?? null
  const arrowToken = tokens(classOf(chevron?.querySelector('svg'))).find(token => /arrow/.test(token) && !/Open/.test(token)) ?? ''
  const rowToken = tokens(classOf(row))[0] ?? ''
  const sessionEl = [...root.querySelectorAll('[class*="sessionRow"]')].find(node => !String(node.className).includes('selected')) ?? null
  const sessionClass = stripWide(tokens(classOf(sessionEl)).filter(token => !/selected/.test(token)).join(' '))
  const selectedEl = [...root.querySelectorAll('[class*="sessionRow"]')].find(node => String(node.className).includes('selected'))
  const selectedToken = (tokens(classOf(selectedEl)).find(token => /selected/.test(token)) || withLocal(rowToken, 'selected'))

  const template = []
  for (const child of header.children) {
    const shown = getComputedStyle(child)
    if (shown.display === 'none' || shown.position === 'absolute' || shown.position === 'fixed') continue
    if (child !== label && child.getBoundingClientRect().width === 0) continue
    const slot = child === label ? 'label' : child === searchSlot ? 'search' : child === actions ? 'actions' : 'other'
    template.push({ slot, cls: stripWide(classOf(child)) })
  }

  return {
    header: stripWide(classOf(header)),
    template,
    search: classOf(search),
    searchButton: stripWide(classOf(searchButton)),
    actions: stripWide(classOf(actions)),
    button: stripWide(classOf(actions.querySelector('button'))),
    listArea: classOf(listArea),
    treeBody: tree.parentElement === listArea ? '' : stripWide(classOf(tree.parentElement)),
    list: classOf(tree),
    group: tokens(classOf(row?.closest('[class*="groupSection"]'))).filter(token => !/drop/.test(token)).join(' '),
    row: tokens(classOf(row)).filter(token => !/menuOpen|drop/.test(token)).join(' '),
    folder: tokens(classOf(folder)).filter(token => !/Active/.test(token)).join(' '),
    chevron: classOf(chevron),
    projectText: classOf(projectText),
    title: classOf(titleEl) || withLocal(rowToken, 'title'),
    rowActions: classOf([...(row?.children ?? [])].find(child => /Actions/.test(classOf(child))) ?? null),
    rowButton: stripWide(classOf(row?.querySelector('[class*="rowActions"] button') ?? null)),
    arrow: arrowToken,
    arrowOpen: arrowToken ? withLocal(arrowToken, 'arrowOpen') : '',
    sessionRow: sessionClass || withLocal(rowToken, 'sessionRow'),
    selected: selectedToken,
    sessionSlot: classOf(sessionEl?.querySelector('[class*="slot"]') ?? null) || withLocal(rowToken, 'slot'),
    sessionTitle: classOf(sessionEl?.querySelector('[class*="title"]') ?? null) || withLocal(rowToken, 'title'),
    resting: classOf(sessionEl?.querySelector('[class*="Resting"]') ?? null) || withLocal(rowToken, 'rowResting'),
    time: classOf(sessionEl?.querySelector('[class*="time"]') ?? null) || withLocal(rowToken, 'time'),
  }
}

function useNativeChrome() {
  const [chrome, setChrome] = useState(null)
  useLayoutEffect(() => {
    let tries = 0
    let timer = 0
    const tick = () => {
      const next = readChrome()
      if (next) { setChrome(next); return }
      if (++tries > 60) return
      timer = window.setTimeout(tick, 50)
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [])
  return chrome
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
  const hostRef = useRef(null)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const next = findHost()
      hostRef.current = next
      setHost(next)
    })
    observer.observe(document.body, { childList: true, subtree: true })
    const first = findHost()
    hostRef.current = first
    setHost(first)
    return () => {
      observer.disconnect()
      hostRef.current?.remove()
    }
  }, [])
  return host
}

function iconCellClass(chrome) {
  // The native projectRow hides `.folder` on hover and reveals `.chevron`.
  // Rows without a chevron must use the stable slot class or the glyph
  // vanishes and the title jumps sideways.
  return tokens(chrome.folder).filter(token => !/folder/i.test(token)).join(' ') || chrome.sessionSlot
}

function sectionBody({ chrome, copy, face, state }) {
  const profile = (state.profiles ?? []).find(item => item.id === state.activeId) ?? null
  const sessions = state.sessions ?? []
  const open = state.expanded !== false

  const bodyKey = state.loading === true || state.refreshing === true ? 'loading' : (state.activeId ?? 'empty')
  if (state.loading === true || state.refreshing === true) {
    return h('div', { key: bodyKey, className: `${chrome.group} dncs-section-body` },
      h('div', { role: 'status', className: `${chrome.row} dncs-skeleton-row`, 'aria-busy': 'true' },
        h('span', { className: iconCellClass(chrome) }, h('span', { className: 'dncs-skeleton-dot' })),
        h('span', { className: chrome.projectText },
          h('span', { className: 'dncs-skeleton-bar' }))))
  }

  if (profile == null) {
    return h('div', { key: bodyKey, className: `${chrome.group} dncs-section-body` },
      h('div', {
        role: 'button',
        className: chrome.row,
        title: copy('emptyCloud'),
        onClick: () => face.openSettings(),
      },
        h('span', { className: iconCellClass(chrome) }, h(IconGlobeOutlineRegular, { size: 16 })),
        h('span', { className: chrome.projectText },
          h('span', { className: chrome.title }, copy('emptyCloud')))))
  }

  const sessionRows = open ? sessions.map(session => h('div', {
    role: 'treeitem',
    key: session.session_id,
    className: `${chrome.sessionRow}${state.activeSessionId === session.session_id ? ` ${chrome.selected}` : ''}`,
    title: session.title || session.session_id,
    onClick: () => face.openSession(session.session_id),
  },
    h('span', { className: chrome.sessionSlot }),
    h('span', { className: chrome.sessionTitle }, session.title || session.session_id),
    h('span', { className: chrome.resting },
      h('span', { className: chrome.time }, session.status ?? ''))
  )) : []

  const empty = open && sessions.length === 0
    ? h('div', { className: chrome.sessionRow },
      h('span', { className: chrome.sessionSlot }),
      h('span', { className: chrome.sessionTitle, style: { opacity: .65 } }, copy('noSessions')))
    : null

  return h('div', { key: bodyKey, className: `${chrome.group} dncs-section-body` },
    h('div', {
      role: 'treeitem',
      className: chrome.row,
      'aria-expanded': open,
      onClick: () => face.toggleExpanded(),
    },
      h('span', { className: chrome.folder }, h(open ? IconFolderOpenRegular : IconFolderCloseRegular, { size: 16 })),
      h('span', { className: chrome.chevron },
        h(IconTriangleRightFillRegular, { size: 10, className: open ? `${chrome.arrow} ${chrome.arrowOpen}` : chrome.arrow })),
      h('span', { className: chrome.projectText },
        h('span', { className: chrome.title }, profile.label || 'Devin Cloud')),
      h('span', { className: chrome.time }, String(sessions.length))),
    ...sessionRows,
    empty)
}

function CloudSection({ chrome, copy, face, state }) {
  const headerChildren = chrome.template.map((cell, index) => {
    if (cell.slot === 'label') {
      return h('span', { key: index, className: cell.cls }, copy('cloudWorkspace'))
    }
    if (cell.slot === 'search') {
      return h('div', { key: index, className: cell.cls },
        chrome.search
          ? h('div', { className: chrome.search },
            h(Button, {
              variant: 'ghost',
              size: 'sm',
              className: chrome.searchButton,
              icon: h(IconRefreshOutlineRegular, { size: 14 }),
              title: copy('refresh'),
              'aria-label': copy('refresh'),
              onClick: () => face.refresh(),
            }))
          : h(Button, {
            variant: 'ghost',
            size: 'sm',
            className: chrome.searchButton,
            icon: h(IconRefreshOutlineRegular, { size: 14 }),
            title: copy('refresh'),
            'aria-label': copy('refresh'),
            onClick: () => face.refresh(),
          }))
    }
    if (cell.slot === 'actions') {
      return h('div', { key: index, className: cell.cls },
        h(Button, {
          variant: 'ghost',
          size: 'sm',
          className: chrome.button,
          icon: h(IconSettingsOutlineRegular, { size: 16 }),
          title: copy('settingsTitle'),
          'aria-label': copy('settingsTitle'),
          onClick: () => face.openSettings(),
        }),
        h(Button, {
          variant: 'ghost',
          size: 'sm',
          className: chrome.button,
          icon: h(IconProjectAddOutlineRegular, { size: 16 }),
          title: copy('newSession'),
          'aria-label': copy('newSession'),
          onClick: () => face.openNew(),
        }))
    }
    return h('div', { key: index, className: cell.cls })
  })

  return h('div', { className: 'dncs-section' },
    h('div', { className: chrome.header }, ...headerChildren),
    h('div', { className: `${chrome.listArea} dncs-section-list` },
      h('div', { className: chrome.list, role: 'tree' }, sectionBody({ chrome, copy, face, state }))))
}

export function CloudSectionGraft({ face, state }) {
  const host = useGraftHost()
  const chrome = useNativeChrome()
  if (host == null || chrome == null) return null
  return createPortal(h(CloudSection, { chrome, copy: face.copy(), face, state }), host)
}
