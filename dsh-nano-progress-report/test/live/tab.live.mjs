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

async function main() {
  const task = await taskSpace(SPACE)
  const managed = await task.pages()
  const page = managed[0] || task.page('p1')

  await page.goto(GUI, { timeout: 60000 })
  await page.waitForLoadState()
  await waitFor(page, () => document.readyState === 'complete' && document.body.innerText.length > 50, undefined, 20000)
  await new Promise(r => setTimeout(r, 3000))

  const bootError = await page.evaluate(() => document.body.innerText.includes('did not activate'))
  record('boot activates', !bootError, bootError ? 'boot page says entry did not activate' : 'clean')
  // AGENTS.md 验收 2: the client bundle must actually be in the page —
  // __DSH_BOOT__.entries is the module manifest the runtime fetches.
  const bundleLoaded = await page.evaluate(() =>
    JSON.stringify(window.__DSH_BOOT__?.entries ?? []).includes('dsh-nano-progress-report'))
  record('client module loaded in page', bundleLoaded, '')

  // Discovery path 1 — '+' guide must list Progress.
  let seeded = await rootExists(page)
  if (!seeded) {
    const plus = await page.evaluate(() => {
      const el = [...document.querySelectorAll('button[aria-label]')].find(b => {
        const r = b.getBoundingClientRect()
        return r.x > 900 && r.y < 60 && r.width < 60
      })
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })
    if (plus) await page.mouse.click(plus.x, plus.y)
    const hasGuide = await waitFor(page,
      () => [...document.querySelectorAll('[role="menuitem"], [role="menu"] *, [role="dialog"] *, [role="listbox"] *')]
        .some(e => e.textContent?.trim() === 'Progress'), undefined, 5000)
    record('guide lists Progress', hasGuide, '')
    if (hasGuide) {
      await page.evaluate(() => {
        const el = [...document.querySelectorAll('[role="menuitem"], [role="menu"] *, [role="dialog"] *, [role="listbox"] *')]
          .find(e => e.textContent?.trim() === 'Progress')
        el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
    }
    seeded = await waitFor(page, src => eval(src) !== null, ROOT_SRC, 5000)
    await snap(page, 'after-guide')
  } else {
    record('guide lists Progress', true, 'tab already open (persisted from earlier run)')
  }

  const info = await page.evaluate(src => {
    const el = eval(src)
    return el ? { found: true, rows: el.querySelectorAll('.npr-row').length } : { found: false }
  }, ROOT_SRC)
  record('progress root mounted', info.found, `${info.rows ?? 0} rows`)
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
    return {
      head: el.querySelector('.npr-head-name')?.textContent,
      state: el.querySelector('.npr-head-state')?.textContent,
      filter: el.querySelector('.npr-filter input') !== null,
      tasks: [...el.querySelectorAll('.npr-panel-title')].map(t => t.textContent.trim()),
      tasksCount: el.querySelector('[data-npr="tasks"] .npr-panel-count')?.textContent ?? '',
      taskItems: el.querySelectorAll('.npr-task').length,
      jobsPanel: el.querySelector('[data-npr="jobs"]') !== null,
      loadOlder: el.querySelector('.npr-load-older') !== null,
    }
  }, ROOT_SRC)
  record('head + filter + panels rendered',
    Boolean(structure?.head && structure?.filter && structure?.tasks?.length > 0),
    JSON.stringify(structure).slice(0, 150))
  // Jobs panel only when jobs exist — negative assertion for the empty case.
  if (structure) {
    record('jobs panel absent without jobs', !structure.jobsPanel, '')
    // Tasks panel content-shape check: count must be '' or 'N/M done' matching items.
    const cm = structure.tasksCount.match(/^(\d+)\/(\d+)\s*done/i)
    if (structure.taskItems === 0) {
      record('tasks empty state consistent', cm === null, `count="${structure.tasksCount}"`)
    } else {
      record('tasks N/M consistent with items', cm !== null && Number(cm[2]) === structure.taskItems,
        `count="${structure.tasksCount}" items=${structure.taskItems}`)
    }
  }
  // AGENTS.md 验收 4: a session that ran tools must show event rows.
  record('timeline has rows', (info.rows ?? 0) > 0, `${info.rows ?? 0} rows`)

  if ((info.rows ?? 0) > 0) {
    const hadShell = await page.evaluate(src =>
      [...eval(src).querySelectorAll('.npr-row')].some(r => r.dataset.type === 'shell'), ROOT_SRC)
    // Expand first row → detail must appear. Collapse any open row first —
    // keepMounted persists expansion state across runs.
    await page.evaluate(src => {
      const root = eval(src)
      const openBtn = root?.querySelector('.npr-row-detail')
        ? root.querySelector('.npr-row .npr-row-chevron button') : null
      openBtn?.click()
    }, ROOT_SRC)
    await new Promise(r => setTimeout(r, 250))
    await page.evaluate(src => {
      eval(src)?.querySelector('.npr-row .npr-row-chevron button')?.click()
    }, ROOT_SRC)
    const detail = await waitFor(page, src => eval(src)?.querySelector('.npr-row-detail') !== null, ROOT_SRC, 3000)
    record('row expand shows detail', detail, '')
    await snap(page, 'expanded')

    // Filter input is React-controlled — set via the native setter + input event.
    await page.evaluate(src => {
      const input = eval(src)?.querySelector('.npr-filter input')
      if (!input) return
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(input, 'type:shell')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }, ROOT_SRC)
    const narrowed = await waitFor(page, src => {
      const el = eval(src)
      return el && [...el.querySelectorAll('.npr-row')].every(r => r.dataset.type === 'shell')
        && el.querySelector('.npr-filter-chip') !== null
    }, ROOT_SRC, 5000)
    const filtered = await page.evaluate(src => {
      const el = eval(src)
      const rows = [...el.querySelectorAll('.npr-row')]
      return { n: rows.length, types: rows.map(r => r.dataset.type), chips: [...el.querySelectorAll('.npr-filter-chip')].map(c => c.textContent) }
    }, ROOT_SRC)
    record('type:shell filter', narrowed && filtered.types.every(t => t === 'shell') && (!hadShell || filtered.n > 0),
      `${filtered.n} rows (had shell: ${hadShell}), chips=${filtered.chips.join(',')}`)
    await snap(page, 'filtered')

    await page.evaluate(src => {
      const el = eval(src)
      const btn = [...el.querySelectorAll('.npr-filter button')].find(b => b.getAttribute('aria-label'))
      btn?.click()
    }, ROOT_SRC)
    await waitFor(page, src => eval(src)?.querySelector('.npr-filter-chip') === null, ROOT_SRC, 3000)

    // Load older — baseline goes into the page, predicate reads it there
    // (page.evaluate args must be JSON-serializable, not closures over locals).
    const didLoad = await page.evaluate(src => {
      const root = eval(src)
      const btn = root?.querySelector('.npr-load-older')
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
  }

  // Discovery path 2 — tab context menu on ANY non-Progress tab must show
  // "Open Progress" and actually open the tab when clicked.
  const chip = await page.evaluate(() => {
    // Tab chips cluster: require ≥2 geometry-matching siblings to avoid
    // right-clicking a lone header button that isn't a tab.
    const candidates = [...document.querySelectorAll('[role="tab"], button')]
      .filter(e => {
        const r = e.getBoundingClientRect()
        const text = e.textContent?.trim() ?? ''
        return r.y < 60 && r.x > 700 && r.width > 20 && r.width < 200
          && text !== '' && text !== 'Progress' && !text.includes('Progress')
      })
    if (candidates.length < 2) return null
    const el = candidates[0]
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: el.textContent?.trim() }
  })
  if (chip) {
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
      const wasSeeded = await page.evaluate(src => eval(src) !== null, ROOT_SRC)
      const opened = await waitFor(page, src => eval(src) !== null, ROOT_SRC, 5000)
      // dismiss() contract: after onSelect the menu must close within ~1s.
      const dismissed = await waitFor(page, () =>
        [...document.querySelectorAll('[role="menu"]')]
          .every(m => !/打开 Progress|Open Progress/.test(m.textContent ?? '') || m.offsetParent === null),
        undefined, 1500)
      record('menu item opens Progress tab', opened,
        `clicked on "${chip.label}"${wasSeeded ? ' (already open — onSelect no-ops)' : ''}`)
      record('menu dismisses after select', dismissed, '')
      await page.keyboard.press('Escape')
      // keepMounted audit: still exactly one visible pane after the menu action.
      const rootsAfter = await page.evaluate(() =>
        [...document.querySelectorAll('[data-nano-progress-report]')]
          .filter(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible').length)
      record('one visible pane after menu open', rootsAfter === 1, `${rootsAfter}`)
      await snap(page, 'menu-opened')
    } else {
      await page.keyboard.press('Escape')
    }
  } else {
    record('tab menu shows "Open Progress"', false, 'no non-Progress tab chip found')
  }

  const fails = results.filter(r => !r.ok)
  console.log(`\n${results.length} checks: ${results.length - fails.length} pass, ${fails.length} fail`)
  await task.finish({ keep: [] })
  process.exit(fails.length === 0 ? 0 : 1)
}

main().catch(e => { console.error('live test crashed:', e); process.exit(1) })
