/**
 * Live end-to-end check for dsh-nano-progress-report on the dsh-dev instance.
 *
 * Run with:
 *
 *   ego-browser nodejs < test/live/tab.live.mjs
 *
 * Every check asserts on real DOM state and leaves a screenshot under
 * /tmp/dnpr-e2e-*.png. Exit code is non-zero when any check fails.
 * Requires: dsh-dev web running with the plugin deployed
 * (`node scripts/deploy-local.mjs --home ~/.dsh-dev --profile web
 *  --plugins dsh-nano-progress-report --partial` + `dsh-dev restart`).
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
 * keepMounted Progress panes of OTHER sessions stay hidden in the DOM —
 * every query must select the *visible* root or it asserts on a stale pane.
 * Passed to page.evaluate as the `src` arg, evaluated in page context.
 */
const ROOT_SRC = `[...document.querySelectorAll('[data-nano-progress-report]')]
  .find(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible') ?? null`
const root = page => page.evaluate(src => eval(src), ROOT_SRC)
const rootExists = page => page.evaluate(src => eval(src) !== null, ROOT_SRC)

/** Predicate wait — replaces bare sleeps so slow machines fail, not flake.
 *  Predicate rejects count as false (logged on timeout) instead of crashing. */
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
  const attempts = [url, 'https://dsh-dev.local/', url]
  let lastError = null
  for (const target of attempts) {
    try {
      await page.goto(target, { timeout: 60000 })
      await page.waitForLoadState()
      const failed = await page.evaluate(() => {
        const text = document.body?.innerText ?? ''
        return text.length < 20 || /HTTP ERROR|ERR_|not found/i.test(text.slice(0, 200))
      }).catch(() => true)
      if (!failed) return true
    } catch (error) { lastError = error }
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  if (lastError) throw lastError
  return false
}

/** Bring the Progress pane on screen: activate the tab chip when the host has
 *  one (inactive panes are unmounted, so "mounted" means "active"), otherwise
 *  reveal the right pane and use its guide card. */
async function ensureProgressPane(page) {
  const mountedNow = () => page.evaluate(src => eval(src) !== null, ROOT_SRC)
  if (await mountedNow()) return true
  const steps = [
    async () => page.evaluate(() => {
      const chip = [...document.querySelectorAll('[role="tab"], button')]
        .find(e => (e.textContent ?? '').trim() === 'Progress' && e.getBoundingClientRect().y < 90)
      if (!chip) return false
      chip.click()
      return true
    }),
    async () => page.evaluate(() => {
      const b = [...document.querySelectorAll('button[aria-label]')]
        .find(e => /打开右侧边栏/.test(e.getAttribute('aria-label') || ''))
      b?.click()
      return Boolean(b)
    }),
    async () => page.evaluate(() => {
      const chip = [...document.querySelectorAll('[role="tab"], button')]
        .find(e => (e.textContent ?? '').trim() === 'Progress' && e.getBoundingClientRect().y < 90)
      if (!chip) return false
      chip.click()
      return true
    }),
    async () => page.evaluate(() => {
      const el = [...document.querySelectorAll('button, [role="button"], [role="menuitem"], li')]
        .find(e => e.textContent?.trim() === 'Progress' && e.getBoundingClientRect().x > 700)
      if (!el) return false
      el.click()
      return true
    }),
  ]
  for (const step of steps) {
    const acted = await step()
    if (acted !== false) {
      for (let i = 0; i < 12; i += 1) {
        if (await mountedNow()) return true
        await new Promise(r => setTimeout(r, 400))
      }
    }
    await new Promise(r => setTimeout(r, 400))
  }
  return await mountedNow()
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
  // AGENTS.md 验收 2: the client bundle must actually be in the page —
  // __DSH_BOOT__.entries is the module manifest the runtime fetches.
  const bundleLoaded = await page.evaluate(() =>
    JSON.stringify(window.__DSH_BOOT__?.entries ?? []).includes('dsh-nano-progress-report'))
  record('client module loaded in page', bundleLoaded, '')

  // Discovery path 1 — activate the Progress tab (its chip exists once any
  // earlier run opened it) or reach it through the right-pane guide.
  const alreadyOpen = await rootExists(page)
  const ensured = alreadyOpen || await ensureProgressPane(page)
  record(alreadyOpen ? 'Progress tab restored from the persisted pane' : 'guide / tab chip opens the Progress pane',
    ensured, alreadyOpen ? 'tab was already active' : '')
  const seeded = ensured
  await snap(page, 'after-open')

  const mounted = await rootExists(page)
  record('progress root mounted', mounted, '')
  // The view target assembles asynchronously after a reload; a 0-row read is a
  // timing fact, not an empty session. Wait for the first row before judging.
  const rowsArrived = mounted
    ? await waitFor(page, src => (eval(src)?.querySelectorAll('.npr-row').length ?? 0) > 0, ROOT_SRC, 25000)
    : false
  const info = await page.evaluate(src => {
    const el = eval(src)
    return el ? { found: true, rows: el.querySelectorAll('.npr-row').length } : { found: false }
  }, ROOT_SRC)
  record('timeline assembles', rowsArrived, `${info.rows ?? 0} rows after wait`)
  // Exactly one visible pane — two visible roots would mean the selector or
  // the host's keepMounted hiding is broken (a real signal, not noise).
  const visibleRoots = await page.evaluate(() =>
    [...document.querySelectorAll('[data-nano-progress-report]')]
      .filter(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible').length)
  record('exactly one visible progress pane', visibleRoots === 1, `${visibleRoots} visible`)
  await snap(page, 'mounted')

  const structure = await page.evaluate(src => {
    const el = eval(src)
    if (!el) return null
    const drawer = el.querySelector('[data-npr="drawer"]')
    return {
      handWrittenHeader: el.querySelector('.npr-head') !== null,
      toolbarH: Math.round(el.querySelector('[data-npr="toolbar"]')?.getBoundingClientRect().height ?? 0),
      searchTag: el.querySelector('[data-npr="search"]')?.tagName ?? null,
      searchType: el.querySelector('[data-npr="search"]')?.getAttribute('type') ?? null,
      statusH: Math.round(el.querySelector('[data-npr="status"]')?.getBoundingClientRect().height ?? 0),
      statusState: el.querySelector('[data-npr="state"]')?.dataset.state ?? null,
      drawer: drawer !== null,
      drawerHead: drawer?.querySelector('.npr-drawer-head') !== null,
      drawerView: drawer?.dataset.view ?? null,
      taskItems: el.querySelectorAll('[data-npr="task"]').length,
      jobsItems: el.querySelectorAll('[data-npr="job"]').length,
      taskGlyphs: el.querySelectorAll('[data-npr="task"] .npr-task-glyph > *').length,
      tasksCount: el.querySelector('[data-npr="tasks-count"]')?.textContent ?? null,
      jobsOptionDisabled: (() => {
        const opt = [...el.querySelectorAll('[data-npr="drawer"] button')].find(b => b.textContent?.trim() === 'Jobs')
        return opt ? opt.disabled === true || opt.getAttribute('aria-disabled') === 'true' : null
      })(),
      loadOlder: el.querySelector('[data-npr="load-older"]') !== null,
    }
  }, ROOT_SRC)
  record('host search field + status line + drawer rendered',
    Boolean(structure && structure.searchTag === 'INPUT' && structure.searchType === 'search'
      && structure.toolbarH === 38 && structure.drawer && structure.drawerHead),
    JSON.stringify(structure).slice(0, 170))
  record('no hand-written status header', structure?.handWrittenHeader === false, '')
  record('status line carries the session state',
    structure?.statusH === 26 || structure?.statusH === 27, `h=${structure?.statusH} state=${structure?.statusState}`)
  // The Jobs view only means something when the host reports jobs: the option
  // is disabled otherwise (never a silently empty tab).
  if (structure) {
    record(structure.jobsItems === 0 ? 'jobs view disabled without jobs' : 'jobs view enabled with jobs',
      structure.jobsOptionDisabled === (structure.jobsItems === 0),
      `disabled=${structure.jobsOptionDisabled} jobs=${structure.jobsItems}`)
  }
  if (structure && structure.taskItems === 0) {
    record('tasks empty state consistent',
      structure.tasksCount === null && structure.taskGlyphs === 0,
      `count=${structure.tasksCount}`)
  } else if (structure) {
    const cm = /^(\d+)\/(\d+)\s*done/i.exec(structure.tasksCount ?? '')
    record('tasks render host state glyphs',
      structure.taskGlyphs === structure.taskItems && structure.taskItems > 0,
      `glyphs=${structure.taskGlyphs} items=${structure.taskItems}`)
    record('tasks N/M consistent with items',
      cm !== null && Number(cm[2]) === structure.taskItems, `count="${structure.tasksCount}"`)
  }
  // AGENTS.md 验收 4: a session that ran tools must show event rows.
  record('timeline has rows', (info.rows ?? 0) > 0, `${info.rows ?? 0} rows`)

  if ((info.rows ?? 0) > 0) {
    // Colour identity: human input must be the filled/branded row, and the
    // leading glyph colour must differ between kinds. Two equal colours mean
    // the semantic CSS never applied.
    const colours = await page.evaluate(src => {
      const el = eval(src)
      const pick = t => {
        const icon = el.querySelector(`.npr-icon[data-type="${t}"]`)
        const row = el.querySelector(`.npr-row[data-type="${t}"]`)
        return icon ? { icon: getComputedStyle(icon).color, bg: row ? getComputedStyle(row).backgroundColor : null } : null
      }
      return { prompt: pick('prompt'), shell: pick('shell'), message: pick('message'), lifecycle: pick('lifecycle') }
    }, ROOT_SRC)
    const distinct = new Set(Object.values(colours).filter(Boolean).map(c => c.icon))
    record('row kinds carry distinct glyph colours', distinct.size >= 2,
      [...distinct].join(' | ').slice(0, 110))
    if (colours.prompt && colours.shell) {
      record('human prompt looks different from machine steps',
        colours.prompt.icon !== colours.shell.icon && colours.prompt.bg !== colours.shell.bg,
        `prompt icon=${colours.prompt.icon} bg=${colours.prompt.bg}`)
    }

    // Failure treatment: only assertable when the session actually failed a
    // step; the skip is explicit so a green run is not mistaken for coverage.
    const failedStyle = await page.evaluate(src => {
      const root = eval(src)
      const row = root.querySelector('.npr-row[data-status="failed"]')
      if (!row) return null
      const cs = getComputedStyle(row)
      return {
        bg: cs.backgroundColor,
        shadow: cs.boxShadow,
        mark: row.querySelector('[data-npr="fail"]') !== null,
        title: getComputedStyle(row.querySelector('.npr-row-title')).color,
      }
    }, ROOT_SRC)
    if (failedStyle) {
      record('failed rows carry the error treatment',
        failedStyle.bg !== 'rgba(0, 0, 0, 0)' && failedStyle.mark === true && /inset/.test(failedStyle.shadow),
        JSON.stringify(failedStyle).slice(0, 130))
    } else {
      record('failed row treatment — skipped', true, 'session has no failed row')
    }

    // Expand a row that actually carries a payload (the disclosure row ignores
    // clicks on non-expandable rows by design).
    await page.evaluate(src => {
      const root = eval(src)
      const rows = [...root.querySelectorAll('.npr-row')]
      const target = rows.find(r => r.dataset.type === 'shell' && r.querySelector('[data-disclosure-row][data-expandable]'))
        ?? rows.find(r => r.querySelector('[data-disclosure-row][data-expandable]'))
      target?.querySelector('[data-disclosure-row]')?.click()
    }, ROOT_SRC)
    const detail = await waitFor(page, src => eval(src)?.querySelector('[data-npr="detail"]') !== null, ROOT_SRC, 3000)
    const detailStyle = await page.evaluate(src => {
      const d = eval(src)?.querySelector('[data-npr="detail"]')
      if (!d) return null
      const cs = getComputedStyle(d)
      return { mono: /mono|Menlo|Consolas|SF Mono/i.test(cs.fontFamily), size: cs.fontSize }
    }, ROOT_SRC)
    record('row expand shows detail', detail, detailStyle ? JSON.stringify(detailStyle) : '')
    record('detail payload uses the mono token', detailStyle?.mono === true, detailStyle?.size ?? '')
    await snap(page, 'expanded')

    // Filter on a type this session actually contains (a fixed `type:shell`
    // is vacuously red when the session never ran a shell command).
    const probe = await page.evaluate(src => {
      const root = eval(src)
      const counts = {}
      for (const row of root.querySelectorAll('.npr-row')) {
        counts[row.dataset.type] = (counts[row.dataset.type] ?? 0) + 1
      }
      const type = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]
      return { type, n: counts[type] ?? 0 }
    }, ROOT_SRC)
    // Filter input is React-controlled — set via the native setter + input event.
    await page.evaluate(([src, type]) => {
      const root = eval(src)
      const input = root?.querySelector('[data-npr="search"]')
      if (!input) return
      window.__dnprProbeType = type
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(input, `type:${type}`)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }, [ROOT_SRC, probe.type])
    const narrowed = await waitFor(page, src => {
      const el = eval(src)
      const rows = el ? [...el.querySelectorAll('.npr-row')] : []
      return rows.length > 0 && rows.every(r => r.dataset.type === window.__dnprProbeType)
        && el.querySelector('[data-npr="stats"]') !== null
    }, ROOT_SRC, 5000)
    const filtered = await page.evaluate(src => {
      const el = eval(src)
      const rows = [...el.querySelectorAll('.npr-row')]
      return { n: rows.length, types: [...new Set(rows.map(r => r.dataset.type))], stats: el.querySelector('[data-npr="stats"]')?.textContent }
    }, ROOT_SRC)
    record(`type:${probe.type} filter`, narrowed && filtered.n === probe.n
      && filtered.types.length === 1 && filtered.types[0] === probe.type,
      `${filtered.n}/${probe.n} rows, stats=${filtered.stats}`)
    await snap(page, 'filtered')

    await page.evaluate(src => {
      eval(src)?.querySelector('[data-npr="filter-clear"]')?.click()
    }, ROOT_SRC)
    await waitFor(page, src => eval(src)?.querySelector('[data-npr="stats"]') === null, ROOT_SRC, 3000)

    // Load older — baseline goes into the page, predicate reads it there
    // (page.evaluate args must be JSON-serializable, not closures over locals).
    const didLoad = await page.evaluate(src => {
      const root = eval(src)
      const btn = root?.querySelector('[data-npr="load-older"]')
      if (!btn) return false
      window.__dnprPrevRows = root.querySelectorAll('.npr-row').length
      btn.click()
      return true
    }, ROOT_SRC)
    if (didLoad) {
      const grew = await waitFor(page, src =>
        eval(src).querySelectorAll('.npr-row').length > (window.__dnprPrevRows ?? 0), ROOT_SRC, 8000)
      record('load older prepends rows', grew, 'row count must grow')
    } else {
      record('load older', true, 'skipped — hasMore false (no button present)')
    }

    // Drawer: drag the top edge. Every step starts from a known height so a
    // persisted height from an earlier run cannot make the delta vacuous.
    const drag = await page.evaluate(async src => {
      const root = eval(src)
      const drawer = root.querySelector('[data-npr="drawer"]')
      const grip = root.querySelector('[data-npr="grip"]')
      if (!drawer || !grip) return null
      const fire = (type, clientY) => {
        const r = grip.getBoundingClientRect()
        const target = type === 'pointerdown' ? grip : window
        target.dispatchEvent(new PointerEvent(type, {
          bubbles: true, cancelable: true, clientX: r.x + 24, clientY, pointerId: 1,
        }))
      }
      const seat = () => new Promise(res => setTimeout(res, 150))
      const height = () => Math.round(drawer.getBoundingClientRect().height)
      const dragBy = async (dy) => {
        const start = grip.getBoundingClientRect().y + 2
        fire('pointerdown', start)
        fire('pointermove', start - dy)
        fire('pointerup', start - dy)
        await seat()
        return height()
      }
      const floored = await dragBy(-2000)
      const before = await dragBy(100)
      const grown = await dragBy(70)
      const clamped = await dragBy(2000)
      const ceiling = Math.round(window.innerHeight * 0.7)
      const settled = await dragBy(-(height() - 200))
      return { floored, before, grown, clamped, ceiling, settled }
    }, ROOT_SRC)
    record('drawer floors at the minimum', drag?.floored === 96, drag ? `${drag.floored}px` : 'no grip')
    record('drawer raises by drag', Boolean(drag) && drag.grown - drag.before === 70,
      drag ? `${drag.before} → ${drag.grown}` : 'no grip')
    record('drawer clamps at the ceiling', Boolean(drag) && drag.clamped <= drag.ceiling
      && drag.clamped >= drag.ceiling - 2, drag ? `${drag.clamped} vs ceiling ${drag.ceiling}` : '')
    record('drawer lands back at a usable height', drag?.settled === 200, drag ? `${drag.settled}px` : '')
    const collapse = await page.evaluate(async src => {
      const root = eval(src)
      const drawer = root.querySelector('[data-npr="drawer"]')
      const toggle = root.querySelector('[data-npr="drawer-toggle"]')
      if (!drawer || !toggle) return null
      const openH = Math.round(drawer.getBoundingClientRect().height)
      toggle.click()
      await new Promise(res => setTimeout(res, 260))
      const collapsedH = Math.round(drawer.getBoundingClientRect().height)
      const bodyGone = drawer.querySelector('[data-npr="drawer-body"]') === null
      const headKept = drawer.querySelector('.npr-drawer-head') !== null
      toggle.click()
      await new Promise(res => setTimeout(res, 260))
      const reopenedH = Math.round(drawer.getBoundingClientRect().height)
      return { openH, collapsedH, reopenedH, bodyGone, headKept }
    }, ROOT_SRC)
    record('drawer collapses to its head', Boolean(collapse) && collapse.bodyGone && collapse.headKept
      && collapse.collapsedH < collapse.openH, JSON.stringify(collapse))
    record('drawer reopens at the previous height', Boolean(collapse) && collapse.reopenedH === collapse.openH,
      collapse ? `${collapse.collapsedH} → ${collapse.reopenedH}` : '')
    await snap(page, 'drawer')
  }

  // Discovery path 2 — the tab context menu on ANY other tab must open
  // Progress. A strip holding only Progress cannot be right-clicked, so open a
  // second tab from the guide first (that also proves openTabIn switches back).
  const chipAt = () => page.evaluate(() => {
    const chips = [...document.querySelectorAll('[role="tab"], button')].filter(e => {
      const r = e.getBoundingClientRect()
      const text = e.textContent?.trim() ?? ''
      return r.y < 70 && r.x > 700 && r.width > 20 && r.width < 220 && text !== '' && !text.includes('Progress')
    })
    if (chips.length === 0) return null
    const r = chips[0].getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: chips[0].textContent.trim() }
  })
  let chip = await chipAt()
  if (!chip) {
    // The guide page (an empty right pane) is the only surface that can open a
    // second tab when the strip holds just Progress; otherwise the menu path is
    // not reachable in this pane and the skip is reported as such.
    const opened = await page.evaluate(() => {
      const el = [...document.querySelectorAll('button, [role="button"], [role="menuitem"], li')]
        .find(e => ['文件', 'Files'].includes(e.textContent?.trim() ?? '') && e.getBoundingClientRect().x > 900)
      if (!el) return false
      el.click()
      return true
    })
    if (opened) {
      await new Promise(r => setTimeout(r, 1400))
      chip = await chipAt()
    }
  }
  if (chip) {
    const progressVisibleBefore = await rootExists(page)
    await page.mouse.click(chip.x, chip.y, { button: 'right' })
    const menuItem = await waitFor(page, () =>
      [...document.querySelectorAll('[role="menuitem"], [role="menu"] *')]
        .some(e => /打开 Progress|Open Progress/.test(e.textContent ?? '')), undefined, 4000)
    record('tab menu shows "Open Progress"', menuItem, `on "${chip.label}"`)
    if (menuItem) {
      await page.evaluate(() => {
        const el = [...document.querySelectorAll('[role="menuitem"], [role="menu"] *')]
          .find(e => /打开 Progress|Open Progress/.test(e.textContent ?? ''))
        el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      const reopened = await waitFor(page, src => eval(src) !== null, ROOT_SRC, 6000)
      // dismiss() contract: after onSelect the menu must close within ~1s.
      const dismissed = await waitFor(page, () =>
        [...document.querySelectorAll('[role="menu"]')]
          .every(m => !/打开 Progress|Open Progress/.test(m.textContent ?? '') || m.offsetParent === null),
        undefined, 1500)
      record('menu item opens Progress tab', reopened,
        `was visible: ${progressVisibleBefore}${progressVisibleBefore ? ' (no-op path)' : ''}`)
      record('menu dismisses after select', dismissed, '')
      await page.keyboard.press('Escape')
      const rootsAfter = await page.evaluate(() =>
        [...document.querySelectorAll('[data-nano-progress-report]')]
          .filter(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible').length)
      record('one visible pane after menu open', rootsAfter === 1, `${rootsAfter}`)
      await snap(page, 'menu-opened')
    } else {
      await page.keyboard.press('Escape')
    }
  } else {
    record('tab menu shows "Open Progress" — skipped', true,
      'single-tab strip and no guide surface: nothing to right-click')
  }

  const fails = results.filter(r => !r.ok)
  console.log(`\n${results.length} checks: ${results.length - fails.length} pass, ${fails.length} fail`)
  await task.finish({ keep: [] })
  process.exit(fails.length === 0 ? 0 : 1)
}

main().catch(e => { console.error('live test crashed:', e); process.exit(1) })
