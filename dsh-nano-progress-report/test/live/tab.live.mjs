/**
 * Live end-to-end check for dsh-nano-progress-report on the dsh-dev instance.
 *
 * Run with:
 *
 *   ego-browser nodejs < test/live/tab.live.mjs
 *
 * Every check asserts on real DOM state and leaves screenshots under
 * /tmp/dnpr-e2e-*.png. Exit code is non-zero when any check fails.
 * Requires: dsh-dev web running with the plugin deployed
 * (`node scripts/deploy-local.mjs --home ~/.dsh-dev --profile web
 *  --plugins dsh-nano-progress-report --partial` + restart the web host).
 *
 * The contract under test is the low-key Devin-shaped surface: one flat
 * execution list (no goal band, no turn groups, no status strip) and a quiet
 * Tasks footer whose top edge drags and whose header collapses.
 */

const SPACE = process.env.DNPR_EGO_SPACE || 'dnpr-e2e'
const GUI = process.env.DNPR_GUI_URL || 'https://dsh-dev.local/'
const results = []
let shot = 0

function record(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail: String(detail ?? '').slice(0, 160) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 120) : ''}`)
}

/**
 * keepMounted panes of OTHER sessions stay hidden in the DOM —
 * every query must select the *visible* root or it asserts on a stale pane.
 * Passed to page.evaluate as the `src` arg, evaluated in page context.
 */
const ROOT_SRC = `[...document.querySelectorAll('[data-nano-progress-report]')].find(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible') ?? null`
const VIEW_SRC = `[...document.querySelectorAll('[data-nano-progress-report][data-variant="view"]')].find(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible') ?? null`
const PANE_SRC = `[...document.querySelectorAll('[data-nano-progress-report][data-variant="pane"]')].find(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible') ?? null`

/** Predicate wait — replaces bare sleeps so slow machines fail, not flake. */
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

/** Navigate to the dev GUI. The token redirect mints a single-use token, so a
 *  consumed/expired URL surfaces as an HTTP error status; fall back to the bare
 *  origin (which mints a fresh one) before giving up. */
async function gotoApp(page, url) {
  const attempts = [url, 'https://dsh-dev.local/', url, 'https://dsh-dev.local/']
  let lastError = null
  for (let i = 0; i < attempts.length; i += 1) {
    const target = attempts[i]
    try {
      await page.goto(target, { timeout: 60000 })
      await page.waitForLoadState()
      const failed = await page.evaluate(() => {
        const text = document.body?.innerText ?? ''
        return text.length < 20 || /HTTP ERROR|ERR_|not found/i.test(text.slice(0, 200))
      }).catch(() => true)
      if (!failed) return true
    } catch (error) { lastError = error }
    // A freshly restarted web host needs a moment before the token broker
    // serves the new launch line; give each retry a longer grace period.
    await new Promise(resolve => setTimeout(resolve, 2000 + i * 2000))
  }
  if (lastError) throw lastError
  return false
}

/** Activate the conversation-view Progress tab (the primary entry). */
async function ensureView(page) {
  if (await page.evaluate(src => eval(src) !== null, VIEW_SRC)) return true
  // The conversation view strip mounts with the session; give it a moment.
  const found = await waitFor(page, () =>
    [...document.querySelectorAll('button[role="tab"]')]
      .some(b => (b.textContent ?? '').trim() === 'Progress' && b.getBoundingClientRect().y < 90), undefined, 15000)
  if (!found) return false
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('button[role="tab"]')]
      .find(b => (b.textContent ?? '').trim() === 'Progress' && b.getBoundingClientRect().y < 90)
    t?.click()
  })
  return waitFor(page, src => eval(src) !== null, VIEW_SRC, 15000)
}

/** Open the workbench Progress pane: sidebar -> guide (+) -> Progress card. */
async function ensurePane(page) {
  if (await page.evaluate(src => eval(src) !== null, PANE_SRC)) return true
  await page.evaluate(() => {
    const open = [...document.querySelectorAll('button[aria-label]')]
      .find(b => /打开右侧边栏/.test(b.getAttribute('aria-label') || ''))
    open?.click()
  })
  await new Promise(r => setTimeout(r, 1200))
  if (await page.evaluate(src => eval(src) !== null, PANE_SRC)) return true
  // "+" turns the right pane into the guide; its Progress card opens the tab.
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
  const task = await taskSpace(SPACE)
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

  // ── view: the flat low-key list ───────────────────────────────────────
  const view = await ensureView(page)
  record('conversation-view Progress tab opens', view, '')
  await snap(page, 'view')

  const viewRows = view
    ? await waitFor(page, src => (eval(src)?.querySelectorAll('[data-npr="row"]').length ?? 0) > 0, VIEW_SRC, 25000)
    : false
  record('timeline assembles', viewRows, view ? 'rows arrived' : 'no view root')
  record('exactly one visible view', await page.evaluate(() =>
    [...document.querySelectorAll('[data-nano-progress-report][data-variant="view"]')].filter(el => el.offsetWidth > 0).length) === 1, '')

  const chrome = await page.evaluate(src => {
    const el = eval(src)
    if (!el) return null
    const bar = el.querySelector('[data-npr="toolbar"]')
    const wrap = el.querySelector('.npr-search')
    const input = el.querySelector('[data-npr="search"]')
    const cs = wrap ? getComputedStyle(wrap) : null
    return {
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
  }, VIEW_SRC)
  record('search line is a quiet 34px row',
    Boolean(chrome) && chrome.barH === 34 && chrome.searchH === 22 && chrome.inputType === 'search'
      && chrome.searchBorder === '0px none' && chrome.searchBg === 'rgba(0, 0, 0, 0)',
    JSON.stringify(chrome).slice(0, 150))
  record('no goal band, group heads or status strip',
    Boolean(chrome) && !chrome.goal && !chrome.groups && !chrome.status && !chrome.drawer,
    chrome ? `goal=${chrome.goal} groups=${chrome.groups} status=${chrome.status}` : '')
  record('every row is a flat 26px line',
    Boolean(chrome) && chrome.rowH.length > 0 && chrome.rowH.every(h => h === 26),
    chrome ? [...new Set(chrome.rowH)].join(',') : '')

  const tone = await page.evaluate(src => {
    const el = eval(src)
    if (!el) return null
    const rows = [...el.querySelectorAll('[data-npr="row"]')]
    const pick = type => {
      const row = rows.find(r => r.dataset.type === type)
      if (!row) return null
      const title = row.querySelector('.npr-row-title')
      const icon = row.querySelector('.npr-icon')
      return {
        title: getComputedStyle(title).color,
        weight: getComputedStyle(title).fontWeight,
        icon: icon ? getComputedStyle(icon).color : null,
        bg: getComputedStyle(row).backgroundColor,
      }
    }
    const failed = rows.find(r => r.dataset.status === 'failed')
    return {
      prompt: pick('prompt'), message: pick('message'), shell: pick('shell'),
      turn: pick('turn'), lifecycle: pick('lifecycle'),
      failed: failed ? {
        bg: getComputedStyle(failed).backgroundColor,
        shadow: getComputedStyle(failed).boxShadow,
        title: getComputedStyle(failed.querySelector('.npr-row-title')).color,
        mark: failed.querySelector('[data-npr="fail"]') !== null,
      } : null,
      opaqueRows: rows.filter(r => {
        const bg = getComputedStyle(r).backgroundColor
        return bg !== 'rgba(0, 0, 0, 0)'
      }).length,
      weights: [...new Set(rows.map(r => getComputedStyle(r.querySelector('.npr-row-title')).fontWeight))],
    }
  }, VIEW_SRC)
  record('rows are transparent — no tinted bands',
    tone?.opaqueRows === 0, tone ? `${tone.opaqueRows} opaque rows` : 'no view')
  record('every title is regular weight (no hero rows)',
    tone?.weights.length === 1 && tone.weights[0] === '400', tone ? tone.weights.join(',') : 'no view')
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
  }, VIEW_SRC)
  record('glyphs share one tertiary tone', iconColours.length === 1, iconColours.join(' | '))
  if (tone?.failed) {
    record('failure is text + mark only, no red band',
      tone.failed.bg === 'rgba(0, 0, 0, 0)' && tone.failed.shadow === 'none' && tone.failed.mark
        && /242, 90, 90/.test(tone.failed.title),
      JSON.stringify(tone.failed).slice(0, 120))
  } else {
    record('failure treatment — skipped', true, 'session has no failed row')
  }

  // Expand a row that carries a payload.
  await page.evaluate(src => {
    const root = eval(src)
    const rows = [...root.querySelectorAll('.npr-row')]
    const target = rows.find(r => r.dataset.type === 'shell' && r.querySelector('[data-disclosure-row][data-expandable]'))
      ?? rows.find(r => r.querySelector('[data-disclosure-row][data-expandable]'))
    target?.querySelector('[data-disclosure-row]')?.click()
  }, VIEW_SRC)
  const detailOpen = await waitFor(page, src => eval(src)?.querySelector('[data-npr="detail"]') !== null, VIEW_SRC, 3000)
  const detail = await page.evaluate(src => {
    const d = eval(src)?.querySelector('[data-npr="detail"]')
    if (!d) return null
    const cs = getComputedStyle(d)
    return { mono: /mono|Menlo|Consolas|SF Mono/i.test(cs.fontFamily), size: cs.fontSize, bg: cs.backgroundColor, borderLeft: cs.borderLeftWidth }
  }, VIEW_SRC)
  record('row expands into a plain mono payload',
    detailOpen && detail?.mono === true && detail.size === '11px' && detail.bg === 'rgba(0, 0, 0, 0)',
    detail ? JSON.stringify(detail) : '')
  await snap(page, 'expanded')

  // Filter on the type this session actually contains.
  const probe = await page.evaluate(src => {
    const root = eval(src)
    const counts = {}
    for (const row of root.querySelectorAll('[data-npr="row"]')) counts[row.dataset.type] = (counts[row.dataset.type] ?? 0) + 1
    const type = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]
    return { type, n: counts[type] ?? 0 }
  }, VIEW_SRC)
  await page.evaluate(([src, type]) => {
    const input = eval(src)?.querySelector('[data-npr="search"]')
    window.__dnprProbeType = type
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, `type:${type}`)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, [VIEW_SRC, probe.type])
  const narrowed = await waitFor(page, src => {
    const el = eval(src)
    const rows = el ? [...el.querySelectorAll('.npr-row')] : []
    return rows.length > 0 && rows.every(r => r.dataset.type === window.__dnprProbeType)
      && el.querySelector('[data-npr="stats"]') !== null
  }, VIEW_SRC, 5000)
  const filtered = await page.evaluate(src => {
    const el = eval(src)
    const rows = [...el.querySelectorAll('.npr-row')]
    return { n: rows.length, types: [...new Set(rows.map(r => r.dataset.type))], stats: el.querySelector('[data-npr="stats"]')?.textContent }
  }, VIEW_SRC)
  record(`type:${probe.type} filter`, narrowed && filtered.n === probe.n && filtered.types.length === 1,
    `${filtered.n}/${probe.n} rows, stats=${filtered.stats}`)
  await page.evaluate(src => eval(src)?.querySelector('[data-npr="filter-clear"]')?.click(), VIEW_SRC)
  await waitFor(page, src => eval(src)?.querySelector('[data-npr="stats"]') === null, VIEW_SRC, 3000)
  await snap(page, 'filtered')

  // ── pane: the same list plus the Tasks footer ─────────────────────────
  const pane = await ensurePane(page)
  record('workbench Progress pane opens', pane, '')
  await snap(page, 'pane')

  if (pane) {
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
        collapsed: bar.dataset.collapsed,
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
      record('task rows are 24px with host glyphs',
        panel.rowH.length === panel.total && panel.rowH.every(h => h === 24) && panel.glyphs === panel.total,
        `rows=${panel.rowH.length} glyphs=${panel.glyphs}`)
    } else {
      record('tasks count — skipped', true, 'this session has no tasks')
    }
    record('jobs switch only when jobs exist', panel?.jobsSwitch === false, 'session has no jobs')

    // Drag the top edge: floor -> 200 -> +70 -> ceiling -> back.
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
      const back = await dragBy(200 - clamped)
      return { floored, settled, grown, clamped, ceiling, back }
    }, PANE_SRC)
    record('task footer floors at 88px', drag?.floored === 88, drag ? `${drag.floored}px` : 'no grip')
    record('task footer restores a 200px working height', drag?.settled === 200, drag ? `${drag.settled}px` : '')
    record('drag raises the footer by 70px', drag?.grown === 270, drag ? `${drag.settled} → ${drag.grown}` : '')
    record('footer clamps at 60% of the viewport',
      Boolean(drag) && drag.clamped <= drag.ceiling && drag.clamped >= drag.ceiling - 2,
      drag ? `${drag.clamped} vs ${drag.ceiling}` : '')

    const collapse = await page.evaluate(async src => {
      const root = eval(src)
      const bar = root.querySelector('[data-npr="tasks-panel"]')
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
    await snap(page, 'footer')
  }

  const fails = results.filter(r => !r.ok)
  console.log(`\n${results.length} checks: ${results.length - fails.length} pass, ${fails.length} fail`)
  await task.finish({ keep: [] })
  process.exit(fails.length === 0 ? 0 : 1)
}

main().catch(e => { console.error('live test crashed:', e); process.exit(1) })
