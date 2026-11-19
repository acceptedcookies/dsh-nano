/**
 * Live end-to-end check for dsh-nano-progress-report on the dsh-dev instance.
 *
 *   ego-browser nodejs < test/live/tab.live.mjs
 *
 * Progress lives ONLY in the right workbench. The chat interface already has
 * the trajectory view, so the first checks assert no Progress tab exists there.
 * Every check reads real DOM state; screenshots land under /tmp/dnpr-e2e-*.png.
 * Requires dsh-dev web running with the plugin deployed.
 */

const GUI = process.env.DNPR_GUI_URL || 'https://dsh-dev.local/'
const results = []
let shot = 0

function record(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail: String(detail ?? '').slice(0, 160) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 120) : ''}`)
}

const PANE_SRC = `[...document.querySelectorAll('[data-nano-progress-report]')].find(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible') ?? null`

async function waitFor(page, fn, arg, ms = 8000) {
  const deadline = Date.now() + ms
  let lastError = null
  while (Date.now() < deadline) {
    try {
      if (await page.evaluate(fn, arg === undefined ? null : arg)) return true
    } catch (e) { lastError = e }
    await new Promise(r => setTimeout(r, 200))
  }
  if (lastError) console.log(`  waitFor predicate errored: ${String(lastError).slice(0, 120)}`)
  return false
}

async function snap(page, name) {
  await page.screenshot({ path: `/tmp/dnpr-e2e-${String(shot++).padStart(2, '0')}-${name}.png` })
}

/** Navigate to the dev GUI (token redirects are single-use; retry with grace). */
async function gotoApp(page, url) {
  const attempts = [url, 'https://dsh-dev.local/', url, 'https://dsh-dev.local/']
  let lastError = null
  for (let i = 0; i < attempts.length; i += 1) {
    try {
      await page.goto(attempts[i], { timeout: 60000 })
      await page.waitForLoadState()
      const failed = await page.evaluate(() => {
        const text = document.body?.innerText ?? ''
        return text.length < 20 || /HTTP ERROR|ERR_|not found/i.test(text.slice(0, 200))
      }).catch(() => true)
      if (!failed) return true
    } catch (error) { lastError = error }
    await new Promise(resolve => setTimeout(resolve, 2000 + i * 2000))
  }
  if (lastError) throw lastError
  return false
}

async function mounted(page) {
  return page.evaluate(src => eval(src) !== null, PANE_SRC)
}

/** Open the workbench Progress pane: existing root -> pane tab chip -> guide. */
async function ensurePane(page) {
  if (await mounted(page)) return true
  await page.evaluate(() => {
    const chip = [...document.querySelectorAll('[role="tab"]')]
      .find(e => (e.textContent ?? '').trim() === 'Progress' && e.getBoundingClientRect().x > 700)
    chip?.click()
  })
  await new Promise(r => setTimeout(r, 1200))
  if (await mounted(page)) return true
  await page.evaluate(() => {
    const open = [...document.querySelectorAll('button[aria-label]')]
      .find(b => /打开右侧边栏/.test(b.getAttribute('aria-label') || ''))
    open?.click()
  })
  await new Promise(r => setTimeout(r, 1500))
  if (await mounted(page)) return true
  const plus = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button[aria-label="新标签页"]')]
      .find(e => e.getBoundingClientRect().x > 700 && e.getBoundingClientRect().width > 0)
    if (!b) return false
    b.click(); return true
  })
  if (plus) await new Promise(r => setTimeout(r, 1200))
  const card = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button, [role="button"]')]
      .find(e => (e.textContent ?? '').trim() === 'Progress'
        && e.getBoundingClientRect().x > 700 && e.getBoundingClientRect().y > 100)
    if (!el) return false
    el.click(); return true
  })
  if (!card) return false
  return waitFor(page, src => eval(src) !== null, PANE_SRC, 10000)
}

async function main() {
  const task = await taskSpace('dnpr-e2e')
  const managed = await task.pages()
  const page = managed[0] || task.page('p1')

  await gotoApp(page, GUI)
  await waitFor(page, () => document.readyState === 'complete' && document.body.innerText.length > 50, undefined, 20000)
  await new Promise(r => setTimeout(r, 3000))

  const bootError = await page.evaluate(() => document.body.innerText.includes('did not activate'))
  record('boot activates', !bootError, bootError ? 'boot page says entry did not activate' : 'clean')
  const bundleLoaded = await page.evaluate(() =>
    JSON.stringify(window.__DSH_BOOT__?.entries ?? []).includes('dsh-nano-progress-report'))
  record('client module loaded in page', bundleLoaded, '')

  // Placement: the chat interface must not carry a Progress tab (it already
  // has the trajectory view); Progress is a workbench tab only.
  const chat = await page.evaluate(() => {
    const lists = [...document.querySelectorAll('[role="tablist"]')]
      .filter(l => l.getBoundingClientRect().x < 700 && l.getBoundingClientRect().width > 0)
    return {
      lists: lists.length,
      tabs: lists.flatMap(l => [...l.querySelectorAll('[role="tab"]')]).map(e => (e.textContent ?? '').trim()),
    }
  })
  if (chat.lists === 0) {
    record('no Progress tab in chat — skipped', true,
      'the chat view strip is not mounted in this layout (source guard still asserts no conversation.view registration)')
  } else {
    record('no Progress tab in the chat interface',
      !chat.tabs.includes('Progress'), `chat tabs: ${chat.tabs.join(' | ').slice(0, 100)}`)
  }

  const pane = await ensurePane(page)
  record('workbench Progress pane opens', pane, '')
  await snap(page, 'pane')

  const rowsArrived = pane
    ? await waitFor(page, src => (eval(src)?.querySelectorAll('[data-npr="row"]').length ?? 0) > 0, PANE_SRC, 25000)
    : false
  record('timeline assembles', rowsArrived, '')
  record('exactly one progress root', await page.evaluate(() =>
    [...document.querySelectorAll('[data-nano-progress-report]')].filter(el => el.offsetWidth > 0).length) === 1, '')

  // Start from the unfiltered (turn-grouped) view regardless of persisted filters.
  await page.evaluate(src => {
    const input = eval(src)?.querySelector('[data-npr="search"]')
    if (!input || input.value === '') return
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, '')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, PANE_SRC)
  await waitFor(page, src => eval(src)?.querySelector('[data-npr="stats"]') === null, PANE_SRC, 3000)

  const chrome = await page.evaluate(src => {
    const el = eval(src)
    if (!el) return null
    const bar = el.querySelector('[data-npr="toolbar"]')
    const wrap = el.querySelector('.npr-search')
    const input = el.querySelector('[data-npr="search"]')
    const filter = el.querySelector('[data-npr="filter-toggle"]')
    const tablist = [...document.querySelectorAll('[role="tablist"]')].find(l => l.getBoundingClientRect().x > 700)
    const root = el.getBoundingClientRect()
    const cs = wrap ? getComputedStyle(wrap) : null
    return {
      root: { x: Math.round(root.x), y: Math.round(root.y), right: Math.round(root.right), bottom: Math.round(root.bottom) },
      tabBottom: tablist ? Math.round(tablist.getBoundingClientRect().bottom) : null,
      searchLeft: Math.round(wrap?.getBoundingClientRect().left ?? 0),
      filterRight: Math.round(filter?.getBoundingClientRect().right ?? 0),
      viewportH: window.innerHeight,
      barH: Math.round(bar?.getBoundingClientRect().height ?? 0),
      searchH: Math.round(wrap?.getBoundingClientRect().height ?? 0),
      inputType: input?.getAttribute('type') ?? null,
      searchBorder: cs ? `${cs.borderTopWidth} ${cs.borderTopStyle}` : null,
      searchBg: cs?.backgroundColor ?? null,
      goal: el.querySelector('.npr-goal, [data-npr="goal"]') !== null,
      groups: el.querySelector('.npr-group, [data-npr="group"]') !== null,
      status: el.querySelector('.npr-status, [data-npr="status"]') !== null,
      drawer: el.querySelector('[data-npr="drawer"]') !== null,
      rowH: [...el.querySelectorAll('[data-npr="row"]')].map(r => Math.round(r.getBoundingClientRect().height)),
    }
  }, PANE_SRC)
  record('search line keeps the host field on a 38px row',
    Boolean(chrome) && chrome.barH === 38 && chrome.searchH >= 26 && chrome.searchH <= 28
      && chrome.inputType === 'search'
      && chrome.searchBorder !== '0px none' && chrome.searchBg !== 'rgba(0, 0, 0, 0)',
    JSON.stringify(chrome).slice(0, 150))
  record('toolbar/search/filter obey the tab-bar insets',
    Boolean(chrome) && chrome.barH === 38 && chrome.searchLeft === chrome.root.x + 10
      && chrome.filterRight === chrome.root.right - 6 && chrome.root.y === chrome.tabBottom
      && chrome.root.bottom === chrome.viewportH,
    chrome ? JSON.stringify({ barH: chrome.barH, searchLeft: chrome.searchLeft, filterRight: chrome.filterRight, rootY: chrome.root.y, tabBottom: chrome.tabBottom, bottom: chrome.root.bottom, vh: chrome.viewportH }) : '')
  record('no goal band, group heads or status strip',
    Boolean(chrome) && !chrome.goal && !chrome.groups && !chrome.status && !chrome.drawer,
    chrome ? `goal=${chrome.goal} groups=${chrome.groups} status=${chrome.status}` : '')
  record('every row is a 28px line',
    Boolean(chrome) && chrome.rowH.length > 0 && chrome.rowH.every(h => h === 28),
    chrome ? [...new Set(chrome.rowH)].join(',') : '')

  const turnShape = await page.evaluate(src => {
    const el = eval(src)
    const turn = el?.querySelector('[data-npr="turn"]')
    const opener = turn?.querySelector('[data-npr="row"][data-level="0"]')
    const step = turn?.querySelector('[data-npr="turn-body"] [data-npr="row"][data-level="1"]')
    const body = turn?.querySelector('[data-npr="turn-body"]')
    if (!turn || !opener || !step || !body) return null
    return {
      turns: el.querySelectorAll('[data-npr="turn"]').length,
      indent: Math.round(step.getBoundingClientRect().x - opener.getBoundingClientRect().x),
      guide: getComputedStyle(body).borderLeftWidth,
    }
  }, PANE_SRC)
  record('turns nest their steps behind a hairline',
    Boolean(turnShape) && turnShape.turns > 0 && turnShape.indent >= 12 && turnShape.guide !== '0px',
    turnShape ? JSON.stringify(turnShape) : 'no turn')

  // The time is a gutter at the right edge: one right coordinate for every
  // row, and a width that cannot shrink below the fixed column.
  const timeCol = await page.evaluate(src => {
    const times = [...eval(src).querySelectorAll('[data-npr="row"] [data-npr="time"]')]
    const rights = times.map(t => Math.round(t.getBoundingClientRect().right))
    const widths = times.map(t => Math.round(t.getBoundingClientRect().width))
    return { n: times.length, distinctRights: [...new Set(rights)], minWidth: Math.min(...widths) }
  }, PANE_SRC)
  record('relative time is a fixed right-hand column',
    timeCol.n > 0 && timeCol.distinctRights.length === 1 && timeCol.minWidth >= 50,
    JSON.stringify(timeCol))

  const tone = await page.evaluate(src => {
    const el = eval(src)
    if (!el) return null
    const rows = [...el.querySelectorAll('[data-npr="row"]')]
    const pick = type => {
      const row = rows.find(r => r.dataset.type === type)
      if (!row) return null
      return {
        title: getComputedStyle(row.querySelector('.npr-row-title')).color,
        weight: getComputedStyle(row.querySelector('.npr-row-title')).fontWeight,
        bg: getComputedStyle(row).backgroundColor,
      }
    }
    const failed = rows.find(r => r.dataset.status === 'failed')
    return {
      prompt: pick('prompt'), message: pick('message'), shell: pick('shell'),
      failed: failed ? {
        bg: getComputedStyle(failed).backgroundColor,
        shadow: getComputedStyle(failed).boxShadow,
        title: getComputedStyle(failed.querySelector('.npr-row-title')).color,
        mark: failed.querySelector('[data-npr="fail"]') !== null,
      } : null,
      opaqueRows: rows.filter(r => getComputedStyle(r).backgroundColor !== 'rgba(0, 0, 0, 0)').length,
      weights: [...new Set(rows.map(r => getComputedStyle(r.querySelector('.npr-row-title')).fontWeight))],
    }
  }, PANE_SRC)
  record('rows are transparent — no tinted bands', tone?.opaqueRows === 0,
    tone ? `${tone.opaqueRows} opaque rows` : 'no pane')
  record('every title is regular weight (no hero rows)',
    tone?.weights.length === 1 && tone.weights[0] === '400', tone ? tone.weights.join(',') : 'no pane')
  if (tone?.prompt && tone?.shell) {
    record('human input is brighter than machine steps',
      tone.prompt.title !== tone.shell.title && tone.prompt.bg === tone.shell.bg,
      `prompt ${tone.prompt.title} / shell ${tone.shell.title}`)
  } else {
    record('text hierarchy — skipped', true, 'session lacks prompt or shell rows')
  }
  const iconColours = await page.evaluate(src => {
    const el = eval(src)
    return [...new Set([...el.querySelectorAll('[data-npr="row"]:not([data-status="failed"]) .npr-icon')]
      .map(i => getComputedStyle(i).color))]
  }, PANE_SRC)
  record('glyphs share one tertiary tone', iconColours.length === 1, iconColours.join(' | '))
  if (tone?.failed) {
    record('failure is text + mark only, no red band',
      tone.failed.bg === 'rgba(0, 0, 0, 0)' && tone.failed.shadow === 'none' && tone.failed.mark
        && /242, 90, 90/.test(tone.failed.title),
      JSON.stringify(tone.failed).slice(0, 120))
  } else {
    record('failure treatment — skipped', true, 'session has no failed row')
  }

  await page.evaluate(src => {
    const root = eval(src)
    const rows = [...root.querySelectorAll('.npr-row')]
    const target = rows.find(r => r.dataset.type === 'shell' && r.querySelector('[data-disclosure-row][data-expandable]'))
      ?? rows.find(r => r.querySelector('[data-disclosure-row][data-expandable]'))
    target?.querySelector('[data-disclosure-row]')?.click()
  }, PANE_SRC)
  const detailOpen = await waitFor(page, src => eval(src)?.querySelector('[data-npr="detail"]') !== null, PANE_SRC, 3000)
  const detail = await page.evaluate(src => {
    const d = eval(src)?.querySelector('[data-npr="detail"]')
    if (!d) return null
    const cs = getComputedStyle(d)
    return { mono: /mono|Menlo|Consolas|SF Mono/i.test(cs.fontFamily), size: cs.fontSize, bg: cs.backgroundColor, borderLeft: cs.borderLeftWidth }
  }, PANE_SRC)
  record('row expands into a plain mono payload',
    detailOpen && detail?.mono === true && detail.size === '11px' && detail.bg === 'rgba(0, 0, 0, 0)',
    detail ? JSON.stringify(detail) : '')
  await snap(page, 'expanded')

  const probe = await page.evaluate(src => {
    const root = eval(src)
    const counts = {}
    for (const row of root.querySelectorAll('[data-npr="row"]')) counts[row.dataset.type] = (counts[row.dataset.type] ?? 0) + 1
    const type = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]
    return { type, n: counts[type] ?? 0 }
  }, PANE_SRC)
  await page.evaluate(([src, type]) => {
    const input = eval(src)?.querySelector('[data-npr="search"]')
    window.__dnprProbeType = type
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, `type:${type}`)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, [PANE_SRC, probe.type])
  const narrowed = await waitFor(page, src => {
    const el = eval(src)
    const rows = el ? [...el.querySelectorAll('.npr-row')] : []
    return rows.length > 0 && rows.every(r => r.dataset.type === window.__dnprProbeType)
      && el.querySelector('[data-npr="stats"]') !== null
  }, PANE_SRC, 5000)
  const filtered = await page.evaluate(src => {
    const el = eval(src)
    const rows = [...el.querySelectorAll('.npr-row')]
    return { n: rows.length, types: [...new Set(rows.map(r => r.dataset.type))], stats: el.querySelector('[data-npr="stats"]')?.textContent }
  }, PANE_SRC)
  record(`type:${probe.type} filter`, narrowed && filtered.n === probe.n && filtered.types.length === 1,
    `${filtered.n}/${probe.n} rows, stats=${filtered.stats}`)
  await snap(page, 'filtered')
  await page.evaluate(src => eval(src)?.querySelector('[data-npr="filter-clear"]')?.click(), PANE_SRC)
  await waitFor(page, src => eval(src)?.querySelector('[data-npr="stats"]') === null, PANE_SRC, 3000)

  // ── Native filter menu ───────────────────────────────────────────────
  const menuOpen = await page.evaluate(src => {
    const el = eval(src)
    el?.querySelector('[data-npr="filter-toggle"]')?.click()
    return true
  }, PANE_SRC)
  const menuPanel = await waitFor(page, () =>
    [...document.querySelectorAll('[role="menu"]')].some(m => m.offsetWidth > 0), undefined, 3000)
  const menuShape = await page.evaluate(src => {
    const root = eval(src)
    const panel = [...document.querySelectorAll('[role="menu"]')].find(m => m.offsetWidth > 0)
    if (!panel) return null
    const r = panel.getBoundingClientRect()
    const rr = root.getBoundingClientRect()
    const items = [...panel.querySelectorAll('[role="menuitem"]')].filter(e => e.offsetWidth > 0)
    return {
      open: root.querySelector('[data-npr="filter-toggle"]')?.getAttribute('aria-expanded') === 'true',
      items: items.length,
      inside: r.left >= rr.left - 1 && r.right <= rr.right + 1,
      labelled: /状态|Status/.test(panel.innerText) && /类型|Type/.test(panel.innerText),
    }
  }, PANE_SRC)
  record('filter button opens the native menu',
    menuOpen && menuPanel && menuShape?.open === true && menuShape.items >= 15 && menuShape.inside && menuShape.labelled,
    menuShape ? JSON.stringify(menuShape) : 'no panel')
  const picked = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('[role="menu"]')].find(m => m.offsetWidth > 0)
    const item = panel ? [...panel.querySelectorAll('[role="menuitem"]')].find(e => !e.disabled) : null
    if (!item) return null
    const text = (item.textContent ?? '').trim()
    item.click()
    return text
  })
  await new Promise(res => setTimeout(res, 700))
  const afterPick = await page.evaluate(src => {
    const root = eval(src)
    const rows = [...root.querySelectorAll('[data-npr="row"]')]
    return {
      query: root.querySelector('[data-npr="search"]')?.value ?? '',
      statuses: [...new Set(rows.map(r => r.dataset.status))],
    }
  }, PANE_SRC)
  record('menu selection writes a native filter token',
    Boolean(picked) && afterPick.query === 'status:ok'
      && afterPick.statuses.length <= 1 && (afterPick.statuses[0] === 'ok' || afterPick.statuses.length === 0),
    JSON.stringify({ picked, ...afterPick }))
  const clearedByMenu = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('[role="menu"]')].find(m => m.offsetWidth > 0)
    const item = panel ? [...panel.querySelectorAll('[role="menuitem"]')]
      .find(e => /清除过滤|Clear filters/.test(e.textContent ?? '')) : null
    if (!item) return false
    item.click(); return true
  })
  await new Promise(res => setTimeout(res, 700))
  const afterClear = await page.evaluate(src => eval(src)?.querySelector('[data-npr="search"]')?.value ?? null, PANE_SRC)
  record('menu clear resets the query', clearedByMenu && afterClear === '', `query="${afterClear}"`)
  await page.keyboard.press('Escape')
  await new Promise(res => setTimeout(res, 400))
  record('menu closes on Escape',
    await page.evaluate(() => ![...document.querySelectorAll('[role="menu"]')].some(m => m.offsetWidth > 0)), '')

  // ── Tasks footer ─────────────────────────────────────────────────────
  const panel = await page.evaluate(src => {
    const el = eval(src)
    const bar = el.querySelector('[data-npr="tasks-panel"]')
    if (!bar) return null
    const head = bar.querySelector('[data-disclosure-header]')
    const cs = getComputedStyle(bar)
    const meta = bar.querySelector('[data-npr="tasks-count"]')?.textContent ?? null
    const tasks = [...bar.querySelectorAll('[data-npr="task"]')]
    const progress = bar.querySelector('[data-npr="progress"]')
    return {
      h: Math.round(bar.getBoundingClientRect().height),
      bg: cs.backgroundColor,
      borderTop: cs.borderTopWidth,
      headH: Math.round(head?.getBoundingClientRect().height ?? 0),
      rowH: tasks.map(t => Math.round(t.getBoundingClientRect().height)),
      glyphs: tasks.filter(t => t.querySelector('.npr-task-glyph > *') !== null).length,
      meta,
      done: Number(progress?.getAttribute('aria-valuenow') ?? -1),
      total: Number(progress?.getAttribute('aria-valuemax') ?? -1),
      jobsSwitch: bar.querySelector('[data-npr="tasks-view"]') !== null,
      innerTabs: bar.querySelectorAll('[role="tablist"], [role="tab"]').length,
    }
  }, PANE_SRC)
  record('task footer: 30px header over layer-1', Boolean(panel)
    && panel.headH === 30 && panel.bg === 'rgb(35, 35, 36)' && panel.borderTop === '0.5px',
    panel ? JSON.stringify({ h: panel.h, bg: panel.bg, border: panel.borderTop }).slice(0, 120) : '')
  record('task footer has no nested tab control', panel?.innerTabs === 0, '')
  if (panel && panel.meta !== null) {
    const m = /^(\d+)\/(\d+)\s*done$/i.exec(panel.meta)
    record('tasks count matches the projection',
      m !== null && Number(m[1]) === panel.done && Number(m[2]) === panel.total,
      `count="${panel.meta}" bar=${panel.done}/${panel.total}`)
    record('task rows are 26px with host glyphs',
      panel.rowH.length === panel.total && panel.rowH.every(h => h === 26) && panel.glyphs === panel.total,
      `rows=${panel.rowH.length} glyphs=${panel.glyphs}`)
    const withTimes = await page.evaluate(src => {
      const bar = eval(src)?.querySelector('[data-npr="tasks-panel"]')
      const items = [...(bar?.querySelectorAll('[data-npr="task"][data-status="completed"]') ?? [])]
      return {
        completed: items.length,
        stamped: items.filter(t => /\d{1,2}:\d{2}/.test(t.querySelector('.npr-task-meta')?.textContent ?? '')).length,
      }
    }, PANE_SRC)
    record('completed tasks carry the event-stream time',
      withTimes.completed === 0 || withTimes.stamped === withTimes.completed, JSON.stringify(withTimes))
  } else {
    record('tasks count — skipped', true, 'this session has no tasks')
  }
  record('jobs switch only when jobs exist', panel?.jobsSwitch === false, 'session has no jobs')

  await page.evaluate(src => {
    const bar = eval(src)?.querySelector('[data-npr="tasks-panel"]')
    if (bar?.dataset.collapsed === 'true') bar.querySelector('[data-npr="tasks-head"]')?.click()
  }, PANE_SRC)
  await new Promise(res => setTimeout(res, 300))

  const drag = await page.evaluate(async src => {
    const root = eval(src)
    const bar = root.querySelector('[data-npr="tasks-panel"]')
    const grip = bar?.querySelector('[data-npr="grip"]')
    if (!bar || !grip) return null
    const fire = (type, y) => {
      const r = grip.getBoundingClientRect()
      const target = type === 'pointerdown' ? grip : window
      target.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, clientX: r.x + 24, clientY: y, pointerId: 1,
      }))
    }
    const seat = () => new Promise(res => setTimeout(res, 160))
    const height = () => Math.round(bar.getBoundingClientRect().height)
    const dragBy = async dy => {
      const start = grip.getBoundingClientRect().y + 2
      fire('pointerdown', start)
      fire('pointermove', start - dy)
      fire('pointerup', start - dy)
      await seat()
      return height()
    }
    const floored = await dragBy(-2000)
    const settled = await dragBy(200 - floored)
    const grown = await dragBy(70)
    const clamped = await dragBy(2000)
    const ceiling = Math.round(window.innerHeight * 0.6)
    await dragBy(200 - clamped)
    return { floored, settled, grown, clamped, ceiling }
  }, PANE_SRC)
  record('task footer floors at 88px', drag?.floored === 88, drag ? `${drag.floored}px` : 'no grip')
  record('task footer restores a 200px working height', drag?.settled === 200, drag ? `${drag.settled}px` : '')
  record('drag raises the footer by 70px', drag?.grown === 270, drag ? `${drag.settled} → ${drag.grown}` : '')
  record('footer clamps at 60% of the viewport',
    Boolean(drag) && drag.clamped <= drag.ceiling && drag.clamped >= drag.ceiling - 2,
    drag ? `${drag.clamped} vs ${drag.ceiling}` : '')

  const collapse = await page.evaluate(async src => {
    const bar = eval(src)?.querySelector('[data-npr="tasks-panel"]')
    if (!bar) return null
    const openH = Math.round(bar.getBoundingClientRect().height)
    bar.querySelector('.npr-taskbar-title')?.click()
    await new Promise(res => setTimeout(res, 260))
    const collapsedH = Math.round(bar.getBoundingClientRect().height)
    const bodyGone = bar.querySelector('[data-npr="tasks-body"]') === null
    bar.querySelector('.npr-taskbar-title')?.click()
    await new Promise(res => setTimeout(res, 260))
    return { openH, collapsedH, reopenedH: Math.round(bar.getBoundingClientRect().height), bodyGone }
  }, PANE_SRC)
  record('header collapses the footer to its head',
    Boolean(collapse) && collapse.bodyGone && collapse.collapsedH === 31,
    collapse ? JSON.stringify(collapse) : '')
  record('re-open restores the previous height',
    Boolean(collapse) && collapse.reopenedH === 200, collapse ? `${collapse.collapsedH} -> ${collapse.reopenedH}` : '')

  // Whole-strip hit target: click the far-right end (over the count/meter).
  const stripPoint = await page.evaluate(src => {
    const head = eval(src)?.querySelector('[data-npr="tasks-head"]')
    if (!head) return null
    const r = head.getBoundingClientRect()
    return { x: Math.round(r.right - 28), y: Math.round(r.top + r.height / 2) }
  }, PANE_SRC)
  if (stripPoint) {
    await page.mouse.click(stripPoint.x, stripPoint.y)
    await new Promise(res => setTimeout(res, 300))
    const stripClosed = await page.evaluate(src => {
      const bar = eval(src)?.querySelector('[data-npr="tasks-panel"]')
      return { collapsed: bar?.dataset.collapsed, h: Math.round(bar?.getBoundingClientRect().height ?? 0) }
    }, PANE_SRC)
    const reopenPoint = await page.evaluate(src => {
      const head = eval(src)?.querySelector('[data-npr="tasks-head"]')
      if (!head) return null
      const r = head.getBoundingClientRect()
      return { x: Math.round(r.right - 28), y: Math.round(r.top + r.height / 2) }
    }, PANE_SRC)
    if (reopenPoint) await page.mouse.click(reopenPoint.x, reopenPoint.y)
    await new Promise(res => setTimeout(res, 300))
    const stripOpen = await page.evaluate(src => {
      const bar = eval(src)?.querySelector('[data-npr="tasks-panel"]')
      return { collapsed: bar?.dataset.collapsed, h: Math.round(bar?.getBoundingClientRect().height ?? 0) }
    }, PANE_SRC)
    record('clicking the empty end of the strip toggles the footer',
      stripClosed.collapsed === 'true' && stripOpen.collapsed === 'false' && stripOpen.h === 200,
      JSON.stringify({ closed: stripClosed, open: stripOpen }))
  } else {
    record('whole-strip click — skipped', true, 'no task header wrapper')
  }
  await snap(page, 'footer')

  const fails = results.filter(r => !r.ok)
  console.log(`\n${results.length} checks: ${results.length - fails.length} pass, ${fails.length} fail`)
  await task.finish({ keep: [] })
  process.exit(fails.length === 0 ? 0 : 1)
}

main().catch(e => { console.error('live test crashed:', e); process.exit(1) })
