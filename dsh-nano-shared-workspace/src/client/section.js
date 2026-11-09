/**
 * The shared section is the workspace browser's own tree, not a lookalike:
 * `root > sectionHeader + listArea > list > groupSection > projectRow`.
 * Hashed class names are read off the live "工作区" section. Nothing is
 * painted until that read succeeds — a fallback frame is what slides the
 * icons from the left into place after load.
 */

import React from 'react'
import { IconFolderCloseRegular, IconFolderOpenRegular, IconGlobeOutlineRegular, IconNewChatOutlineRegular, IconProjectAddOutlineRegular, IconRefreshOutlineRegular, IconSlidersTwoOutlineRegular, IconTriangleRightFillRegular } from '@deepseek-ai/dsh-client-ui-primitives'

const { createElement, useEffect, useLayoutEffect, useRef, useState } = React

/** This member's localPath, for the joined-row tooltip. */
const myLocalPath = (row, username) =>
  Object.values(row?.members ?? {}).find(member => member?.username === username)?.localPath ?? ''

const classOf = el => el?.getAttribute?.('class') ?? ''
const tokens = cls => String(cls).split(/\s+/).filter(Boolean)
/** `.wide` is only the section's mount fade; replaying it on our mount is the jitter. */
const stripWide = cls => tokens(cls).filter(token => !/_wide$/.test(token)).join(' ')
const withLocal = (token, name) => {
  const cut = String(token).lastIndexOf('_')
  return cut < 0 ? '' : token.slice(0, cut + 1) + name
}

/**
 * Read the workspace section's class names. Returns null until the header,
 * the list seat, and a project row are all in the document.
 */
function readChrome() {
  const graft = document.querySelector('[data-nano-shared-workspace]')
  const label = [...document.querySelectorAll('span')].find(node =>
    !graft?.contains(node)
    && node.children.length === 0
    && (node.textContent?.trim() === '工作区' || node.textContent?.trim() === 'Workspace'))
  const header = label?.parentElement
  const root = header?.parentElement
  if (header == null || root == null) return null
  // The running bundle has no `data-sidebar-list-area`; the seat is the
  // header's sibling whose class is the listArea module.
  const listArea = [...root.children].find(el => /listArea/.test(classOf(el)))
  const tree = listArea?.querySelector('[role="tree"]')
  const row = [...root.querySelectorAll('[class*="projectRow"]')]
    .find(node => !String(node.className).includes('menuOpen'))
  if (listArea == null || tree == null || row == null) return null
  const searchSlot = header.querySelector('[class*="searchSlot"]')
  const actions = header.querySelector('[class*="headerActions"]')
  const search = searchSlot?.querySelector(':scope > div')
  const searchButton = search?.querySelector('button') ?? searchSlot?.querySelector('button')
  if (searchSlot == null || actions == null || searchButton == null) return null

  const folder = row.querySelector('[class*="folder"]')
  const chevron = row.querySelector('[class*="chevron"]')
  const projectText = [...row.children].find(child => /Text/.test(classOf(child)))
  const titleEl = projectText?.querySelector('[class*="title"]')
  const arrowToken = tokens(classOf(chevron?.querySelector('svg'))).find(token => /arrow/.test(token) && !/Open/.test(token)) ?? ''
  const rowToken = tokens(classOf(row))[0] ?? ''
  const sessionEl = [...root.querySelectorAll('[class*="sessionRow"]')].find(node => !String(node.className).includes('selected'))
  const sessionClass = stripWide(tokens(classOf(sessionEl)).filter(token => !/selected/.test(token)).join(' '))

  // Header `gap` counts every in-flow child, including a 0-wide node. The
  // native trailing node is `display: none` and must not be cloned, or the
  // icon cluster sits one gap (4px) left of the workspace header.
  const template = []
  for (const child of header.children) {
    const shown = getComputedStyle(child)
    if (shown.display === 'none' || shown.position === 'absolute' || shown.position === 'fixed') continue
    if (classOf(child) === '' && child.getBoundingClientRect().width === 0) continue
    const slot = child === label ? 'label' : child === searchSlot ? 'search' : child === actions ? 'actions' : 'other'
    template.push({ slot, cls: stripWide(classOf(child)) })
  }

  return {
    root: classOf(root),
    header: stripWide(classOf(header)),
    template,
    search: classOf(search),
    searchButton: stripWide(classOf(searchButton)),
    actions: stripWide(classOf(actions)),
    button: stripWide(classOf(actions.querySelector('button'))),
    listArea: classOf(listArea),
    treeBody: tree.parentElement === listArea ? '' : stripWide(classOf(tree.parentElement)),
    list: classOf(tree),
    // The row sits inside a hover-card root; the spacing class is the
    // groupSection ancestor, not that wrapper.
    group: tokens(classOf(row.closest('[class*="groupSection"]'))).filter(token => !/drop/.test(token)).join(' '),
    row: tokens(classOf(row)).filter(token => !/menuOpen|drop/.test(token)).join(' '),
    folder: tokens(classOf(folder)).filter(token => !/Active/.test(token)).join(' '),
    chevron: classOf(chevron),
    projectText: classOf(projectText),
    title: classOf(titleEl) || withLocal(rowToken, 'title'),
    rowActions: classOf([...row.children].find(child => /Actions/.test(classOf(child)))),
    rowButton: stripWide(classOf(row.querySelector('[class*="rowActions"] button'))),
    arrow: arrowToken,
    arrowOpen: arrowToken ? withLocal(arrowToken, 'arrowOpen') : '',
    sessionRow: sessionClass || withLocal(rowToken, 'sessionRow'),
    selected: withLocal(tokens(sessionClass).find(token => /sessionRow/.test(token)) || withLocal(rowToken, 'sessionRow'), 'selected'),
    sessionSlot: classOf(sessionEl?.querySelector('[class*="slot"]')) || withLocal(rowToken, 'slot'),
    sessionTitle: classOf(sessionEl?.querySelector('[class*="title"]')) || withLocal(rowToken, 'title'),
    resting: classOf(sessionEl?.querySelector('[class*="Resting"]')) || withLocal(rowToken, 'rowResting'),
    time: classOf(sessionEl?.querySelector('[class*="time"]')) || withLocal(rowToken, 'time'),
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
      if (++tries > 40) return
      timer = window.setTimeout(tick, 50)
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [])
  return chrome
}

/** Header-height hold while native chrome classes are still unread. No body rows, so load cannot jump. */
function LoadingHeader({ label }) {
  return createElement('div', { className: 'nsw-bone-header', role: 'status', 'aria-busy': 'true', 'aria-label': label },
    createElement('span', { className: 'nsw-bone nsw-bone-label' }))
}

const iconButton = (labelText, icon, extra, cls) => createElement('button', {
  type: 'button',
  className: cls,
  title: labelText,
  'aria-label': labelText,
  ...extra,
}, icon)

/**
 * Props: `{ face, wide }`. `face` supplies copy(), the settings store, the
 * view filter, and the header actions.
 */
export function SharedSection({ face, wide }) {
  const copy = face.copy()
  const [settings, setSettings] = useState(face.settings.current)
  const [currentId, setCurrentId] = useState(() => face.currentSessionId?.() ?? null)
  const [showRest, setShowRest] = useState(false)
  const [revealHeight, setRevealHeight] = useState(0)
  const revealRef = useRef(null)
  const chrome = useNativeChrome()

  useLayoutEffect(() => face.settings.subscribe(setSettings), [])
  useEffect(() => face.subscribeSession?.(setCurrentId), [])

  const listReady = settings?.listReady === true
  const sectionOpen = listReady && settings?.sectionOpen === true
  useEffect(() => {
    const node = revealRef.current
    if (node == null) return
    if (!sectionOpen) {
      setRevealHeight(0)
      return
    }
    // After the closed frame paints, grow to the content height so the
    // workspace list below is pushed for the whole transition.
    const next = node.firstElementChild?.scrollHeight ?? 0
    setRevealHeight(next)
  }, [sectionOpen, showRest, settings?.sharedWorkspaces, settings?.sessions, settings?.expanded])

  if (!wide) {
    return createElement('div', { className: 'nsw-rail', role: 'complementary', 'aria-label': copy.railTitle },
      createElement('button', {
        type: 'button',
        className: 'nsw-rail-button',
        title: copy.railTitle,
        'aria-label': copy.railTitle,
        onClick: face.onToggleRail,
      }, createElement(IconGlobeOutlineRegular, { size: 16 })))
  }
  // Chrome classes are not ready yet: hold the section's box with the
  // heartbeat so the wait is visible, without painting the fallback skin.
  if (chrome == null) return createElement(LoadingHeader, { label: copy.sectionLoading })

  const expandLimit = settings?.expandLimit ?? 3
  const configured = settings?.configured === true
  const username = settings?.username
  const filter = settings?.viewFilter ?? 'all'
  const expanded = settings?.expanded ?? {}
  const sessions = settings?.sessions ?? []
  const rows = (settings?.sharedWorkspaces ?? []).filter(row =>
    filter !== 'mine' || Object.values(row?.members ?? {}).some(member => member?.username === username))
  const sessionsFor = wsId => sessions.filter(session => session.workspaceId === wsId)

  const actionCluster = createElement('div', { className: chrome.actions },
    iconButton(copy.viewOptions, createElement(IconSlidersTwoOutlineRegular, { size: 16 }), { 'aria-haspopup': 'menu', 'data-nsw-view-options': true, onClick: face.onViewOptions }, chrome.button),
    iconButton(copy.addWorkspace, createElement(IconProjectAddOutlineRegular, { size: 16 }), { onClick: face.onCreateWorkspace }, chrome.button))

  const headerChildren = chrome.template.map((cell, index) => {
    if (cell.slot === 'label') return createElement('span', { key: index, className: `${cell.cls} nsw-label-with-expand` },
      copy.title,
      createElement('button', {
        type: 'button',
        className: `${chrome.button} nsw-expand`,
        title: sectionOpen ? copy.collapseSection : copy.expandSection,
        'aria-label': sectionOpen ? copy.collapseSection : copy.expandSection,
        'aria-expanded': sectionOpen,
        disabled: !listReady,
        onClick: face.onToggleSection,
      }, createElement(IconTriangleRightFillRegular, { className: sectionOpen ? `${chrome.arrow} ${chrome.arrowOpen}` : chrome.arrow })))
    if (cell.slot === 'search') {
      // Same nesting as the workspace search control: slot > search > button.
      // The button keeps the searchButton class only; iconButton is a
      // different control and pulls the glyph off the header baseline.
      const spinning = !listReady || settings?.syncing === true
      const button = iconButton(copy.refresh, createElement(IconRefreshOutlineRegular, { size: 14, className: spinning ? 'nsw-spin' : undefined }), { onClick: face.onRefresh }, chrome.searchButton)
      return createElement('div', { key: index, className: cell.cls },
        chrome.search ? createElement('div', { className: chrome.search }, button) : button)
    }
    if (cell.slot === 'actions') return React.cloneElement(actionCluster, { key: index, className: cell.cls })
    return createElement('div', { key: index, className: cell.cls })
  })

  const groups = rows.map(row => {
    const mine = Object.values(row?.members ?? {}).some(member => member?.username === username)
    const wsSessions = sessionsFor(row.workspaceId)
    const isOpen = expanded[row.workspaceId] === true
    const sessionRows = isOpen ? wsSessions.map(session => createElement('div', {
      role: 'treeitem',
      key: session.sessionId,
      className: session.sessionId === currentId && chrome.selected ? `${chrome.sessionRow} ${chrome.selected}` : chrome.sessionRow,
      'aria-selected': session.sessionId === currentId,
      title: session.mtime ?? '',
      onClick: () => face.onOpenSession?.(session),
    },
      createElement('span', { className: chrome.sessionSlot }),
      createElement('span', { className: chrome.sessionTitle }, session.title || session.sessionId),
      createElement('span', { className: chrome.resting },
        createElement('span', { className: chrome.time }, session.writerName ?? '')))) : []
    return createElement('div', { key: row.workspaceId, className: chrome.group },
      createElement('div', {
        role: 'treeitem',
        className: chrome.row,
        'data-nsw-loading': (settings?.sessionsReady !== true || settings?.pulling?.[row.workspaceId] === true) ? 'true' : undefined,
        'aria-expanded': isOpen,
        onClick: () => mine ? face.onToggleWorkspace?.(row.workspaceId) : face.onJoinWorkspace?.(row.workspaceId),
      },
        createElement('span', { className: chrome.folder },
          createElement(isOpen ? IconFolderOpenRegular : IconFolderCloseRegular)),
        createElement('span', { className: chrome.chevron },
          createElement(IconTriangleRightFillRegular, { className: isOpen ? `${chrome.arrow} ${chrome.arrowOpen}` : chrome.arrow })),
        createElement('span', { className: chrome.projectText },
          createElement('span', { className: chrome.title }, row?.title ?? row?.workspaceId)),
        !mine ? createElement('span', { className: chrome.time }, copy.stateIdle) : null,
        createElement('span', { className: chrome.rowActions, onClick: event => event.stopPropagation() },
          (settings?.sessionsReady !== true || settings?.pulling?.[row.workspaceId] === true)
            ? createElement('span', {
              className: chrome.rowButton,
              role: 'status',
              'aria-label': copy.sectionLoading,
            }, createElement(IconRefreshOutlineRegular, { size: 14, className: 'nsw-spin' }))
            : mine && chrome.rowButton !== '' ? createElement('button', {
              type: 'button',
              className: chrome.rowButton,
              'aria-label': copy.newSession,
              onClick: event => {
                event.stopPropagation()
                face.onCreateSession?.(row.workspaceId)
              },
            }, createElement(IconNewChatOutlineRegular, { size: 14 })) : null)),
      sessionRows.length > 0 ? createElement('div', { role: 'group' }, sessionRows) : null)
  })

  const empty = rows.length === 0
    ? createElement('div', { className: chrome.group },
      createElement('div', {
        role: 'button',
        className: chrome.row,
        onClick: configured ? face.onCreateWorkspace : face.onOpenSettings,
      },
        createElement('span', { className: chrome.folder }),
        createElement('span', { className: chrome.chevron }),
        createElement('span', { className: chrome.projectText },
          createElement('span', { className: chrome.title }, copy.emptyHint))))
    : null

  const shown = showRest ? groups : groups.slice(0, expandLimit)
  const hidden = groups.length - shown.length
  const more = hidden > 0
    ? createElement('button', {
      type: 'button',
      key: 'more',
      className: 'nsw-more',
      onClick: () => setShowRest(true),
    }, copy.showMore.replace('{n}', String(hidden)))
    : null
  const list = createElement('div', { className: chrome.list, role: 'tree' },
    shown,
    more,
    groups.length === 0 ? empty : null)
  const seated = chrome.treeBody
    ? createElement('div', { className: chrome.treeBody }, list)
    : list

  return createElement('div', { className: `nsw-root ${chrome.root}`, role: 'complementary', 'aria-label': copy.title },
    createElement('div', { className: chrome.header }, ...headerChildren),
    createElement('div', {
      ref: revealRef,
      className: 'nsw-reveal',
      'data-open': sectionOpen ? 'true' : 'false',
      style: sectionOpen ? { maxHeight: revealHeight } : undefined,
    },
      createElement('div', { className: 'nsw-reveal-inner' },
        createElement('div', { className: chrome.listArea }, seated))))
}
