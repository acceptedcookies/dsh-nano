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
 *  list area, tree, and search/action controls are all mounted.
 *
 *  Detection is STRUCTURAL, not label-text based: the collapsed rail renders
 *  no "工作区" label, so keying off it returned null and hid the whole section
 *  (CF1115 regression — the rail then showed only the native icon column and
 *  the workspaces add/search pair, misaligned). We anchor on the
 *  `sidebar.workspaces` slot host itself and walk its subtree. */
function readChrome() {
  const graft = document.querySelector(`[${HOST_ATTR}]`)
  const wsSlot = document.querySelector('[data-slot="sidebar.workspaces"]')
  const wsRoot = wsSlot?.children?.[0] ?? null
  // Expanded mode: header holds the visible "工作区" label; rail mode keeps the
  // same `sectionHeader` shell but drops the label, so resolve header by class.
  let header = null
  let root = null
  let label = null
  if (wsRoot != null) {
    header = wsRoot.querySelector('[class*="sectionHeader"]')
    root = wsRoot
    label = header ? [...header.children].find(child =>
      /sectionLabel/.test(classOf(child))) ?? null : null
  }
  if (header == null) {
    label = [...document.querySelectorAll('span')].find(node =>
      !graft?.contains(node)
      && node.children.length === 0
      && (node.textContent?.trim() === '工作区' || node.textContent?.trim() === 'Workspace')) ?? null
    header = label?.parentElement
    root = header?.parentElement
  }
  if (header == null || root == null) return null
  const listArea = [...root.children].find(el => /listArea/.test(classOf(el)))
  const tree = listArea?.querySelector('[role="tree"]')
  const row = [...root.querySelectorAll('[class*="projectRow"]')]
    .find(node => !String(node.className).includes('menuOpen')) ?? null
  const searchSlot = header.querySelector('[class*="searchSlot"]')
  const actions = header.querySelector('[class*="headerActions"]')
  const search = searchSlot?.querySelector(':scope > div')
  const searchButton = search?.querySelector('button') ?? searchSlot?.querySelector('button')

  /* Rail mode (sidebar collapsed): the native workspaces tree renders no rows
   * and the header has no label/search — only the add-workspace icon button
   * inside headerActions. Degrade to a minimal chrome: rail geometry + a 36px
   * icon button class so the cloud section can still show its rail entry. */
  const rail = /_rail\b/.test(classOf(root)) || /_rail\b/.test(classOf(wsSlot?.children?.[0]))
  if (rail) {
    const railBtn = root.querySelector('[class*="iconButton"]') ?? root.querySelector('button')
    if (railBtn == null) return null
    return {
      rail: true,
      header: '',
      template: [],
      iconButton: stripWide(classOf(railBtn)) || classOf(railBtn),
      listArea: classOf(listArea) || '',
      list: '',
      group: '', row: '', folder: '', chevron: '', projectText: '', title: '',
      rowActions: '', rowButton: '', arrow: '', arrowOpen: '',
      sessionRow: '', selected: '', sessionSlot: '', sessionTitle: '', resting: '', time: '',
    }
  }
  if (listArea == null || tree == null || row == null) return null
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
    /* Chrome must re-read on EVERY relevant DOM change, not just at mount:
     * collapsing the sidebar rebuilds the workspaces subtree into rail mode,
     * and a stale expanded-mode chrome renders wide rows inside the 56px rail
     * — which is exactly the broken "E"-only icon regression (text clipped to
     * its first letter by the rail width). */
    let timer = 0
    const reread = () => {
      const next = readChrome()
      setChrome(prev => {
        if (next == null) return prev === null ? prev : null
        // Cheap signature compare to avoid render loops.
        const sig = c => c && [c.rail ? 1 : 0, c.header, c.iconButton, c.row, c.list, c.group].join('|')
        return sig(prev) === sig(next) ? prev : next
      })
    }
    reread()
    // Slow poll until first success (slot may mount later), plus re-read on
    // every DOM mutation (collapse/expand rebuilds the workspaces subtree).
    let tries = 0
    const poll = () => {
      reread()
      if (tries++ < 200) timer = window.setTimeout(poll, 100)
    }
    timer = window.setTimeout(poll, 100)
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(reread, 80)
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
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
  /* Rail mode: one 36×36 icon entry mirroring the native add-workspace rail
   * button. Clicking it re-expands the sidebar so the full cloud section is
   * reachable; the icon stays a real native glyph, never painted text. */
  if (chrome.rail) {
    return h('div', { className: 'dncs-section dncs-rail' },
      h(Button, {
        variant: 'ghost',
        size: 'sm',
        className: chrome.iconButton,
        icon: h(IconGlobeOutlineRegular, { size: 18 }),
        title: copy('cloudWorkspace'),
        'aria-label': copy('cloudWorkspace'),
        onClick: () => {
          // Re-expand the sidebar to reveal the full cloud section. The toggle
          // button is labelled by the host locale (打开侧边栏 / Open sidebar);
          // if it is not found (unexpected host layout) fall back to opening
          // the section settings so the entry is never dead.
          const btn = [...document.querySelectorAll('button')].find(b => {
            const label = `${b.getAttribute('aria-label') || ''} ${b.title || ''}`
            return /打开侧边栏|展开侧边|open sidebar|expand sidebar/i.test(label)
          })
          if (btn) btn.click()
          else face.openSettings()
        },
      }))
  }
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
