import React from 'react'

/** Plain-DOM tab strip for Nano surfaces that build UI from HTML strings
 *  (e.g. the notepad settings dialog body). Mirrors the DSH SegmentedTabs
 *  interaction contract: role=tablist/tab/tabpanel wiring, roving tabindex,
 *  Arrow/Home/End navigation — but takes caller-owned panel elements instead
 *  of React children, so nothing here needs React.
 *
 *  Usage:
 *    const tabs = nanoTabs({
 *      label: 'Settings',
 *      value: 'general',
 *      items: [
 *        { value: 'general', label: 'General', panel: sectionA },
 *        { value: 'storage', label: 'Storage', panel: sectionB },
 *      ],
 *      onChange: value => { ... },
 *    })
 *    container.append(tabs.el)
 */

let nanoTabsSeq = 0

/**
 * Create a tab strip bound to caller-supplied panels.
 * @param {object} options
 * @param {Array<{value:string, label:string, panel:HTMLElement}>} options.items - tabs in display order; each panel is adopted (id/role/aria-labelledby/hidden managed).
 * @param {string} options.value - initially selected item value.
 * @param {(value:string)=>void} [options.onChange] - called on user selection.
 * @param {string} [options.label] - accessible name for the tab list.
 * @returns {{ el: HTMLElement, select: (value:string)=>void, value: ()=>string }}
 */
export function nanoTabs({ items, value, onChange, label }) {
  const seq = ++nanoTabsSeq
  const el = document.createElement('div')
  el.className = 'nano-tabs'
  el.setAttribute('role', 'tablist')
  if (label) el.setAttribute('aria-label', label)

  /** @type {Array<{item: any, tab: HTMLButtonElement}>} */
  const tabs = items.map(item => {
    const tab = document.createElement('button')
    tab.type = 'button'
    tab.className = 'nano-tab'
    tab.id = `nano-tab-${seq}-${item.value}`
    tab.setAttribute('role', 'tab')
    tab.textContent = item.label
    const panelId = `nano-tabpanel-${seq}-${item.value}`
    tab.setAttribute('aria-controls', panelId)
    item.panel.id = panelId
    item.panel.setAttribute('role', 'tabpanel')
    item.panel.setAttribute('aria-labelledby', tab.id)
    el.append(tab)
    return { item, tab }
  })

  let current = /** @type {string | undefined} */ (undefined)

  function select(next, { focus = false } = {}) {
    const entry = tabs.find(entry => entry.item.value === next)
    if (!entry) return
    current = entry.item.value
    for (const candidate of tabs) {
      const active = candidate === entry
      candidate.tab.setAttribute('aria-selected', String(active))
      candidate.tab.tabIndex = active ? 0 : -1
      candidate.item.panel.hidden = !active
    }
    if (focus) {
      entry.tab.focus()
      /* keep a keyboard-navigated tab inside the overflowed strip */
      entry.tab.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    onChange?.(entry.item.value)
  }

  el.addEventListener('click', event => {
    const tab = event.target instanceof Element ? event.target.closest('.nano-tab') : null
    const entry = tabs.find(candidate => candidate.tab === tab)
    if (entry) select(entry.item.value)
  })

  el.addEventListener('keydown', event => {
    const tab = event.target instanceof Element ? event.target.closest('.nano-tab') : null
    const index = tabs.findIndex(candidate => candidate.tab === tab)
    if (index < 0) return
    let next
    switch (event.key) {
      case 'ArrowLeft': next = (index + tabs.length - 1) % tabs.length; break
      case 'ArrowRight': next = (index + 1) % tabs.length; break
      case 'Home': next = 0; break
      case 'End': next = tabs.length - 1; break
      default: return
    }
    event.preventDefault()
    event.stopPropagation()
    select(tabs[next].item.value, { focus: true })
  })

  select(value, { focus: false })
  return { el, select, value: () => current }
}


/**
 * React counterpart of nanoTabs for plugin surfaces built with React (DNK's
 * settings dialog). Same `.nano-tabs` / `.nano-tab` classes and the same
 * role=tablist/tab/tabpanel contract, so the look is the shared nano-ui tab
 * style rather than a per-plugin reimplementation.
 *
 * Panels stay mounted (hidden) so form state survives tab switches — the
 * fixed-height dialog only changes which panel is visible.
 *
 * @param {object} props
 * @param {Array<{value:string,label:string,content:React.ReactNode}>} props.items
 * @param {string} [props.value] - controlled selected value
 * @param {(value:string)=>void} [props.onChange]
 * @param {string} [props.label] - accessible name for the tab list
 * @param {string} [props.className]
 */
export function NanoTabs({ items, value, onChange, label, className }) {
  const [inner, setInner] = React.useState(() => value ?? items[0]?.value)
  const current = value ?? inner
  const select = (next) => {
    if (value === undefined) setInner(next)
    onChange?.(next)
  }
  const idBase = React.useMemo(() => `nano-tabs-${Math.random().toString(36).slice(2, 9)}`, [])
  return React.createElement('div', { className: ['nano-tabs-wrap', className ?? ''].filter(Boolean).join(' ') },
    React.createElement('div', { className: 'nano-tabs', role: 'tablist', 'aria-label': label },
      items.map((item) => React.createElement('button', {
        key: item.value,
        id: `${idBase}-tab-${item.value}`,
        type: 'button',
        role: 'tab',
        className: 'nano-tab',
        'aria-selected': String(item.value === current),
        'aria-controls': `${idBase}-panel-${item.value}`,
        tabIndex: item.value === current ? 0 : -1,
        onClick: () => select(item.value),
      }, item.label))),
    items.map((item) => React.createElement('div', {
      key: item.value,
      id: `${idBase}-panel-${item.value}`,
      role: 'tabpanel',
      className: 'nano-tabs-panel',
      'aria-labelledby': `${idBase}-tab-${item.value}`,
      hidden: item.value !== current,
    }, item.content)))
}
