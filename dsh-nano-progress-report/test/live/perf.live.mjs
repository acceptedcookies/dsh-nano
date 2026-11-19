/**
 * Perf-review live check for dsh-nano-progress-report.
 *
 *   ego-browser nodejs < test/live/perf.live.mjs
 *
 * Loads the GUI, arms dsh-perf-review via localStorage, reloads, exercises the
 * Progress tab, then reads Symbol.for('dsh.perfReview.v2').read() and asserts
 * the plugin row recorded spans + usage.
 */

const SPACE = process.env.DNPR_EGO_SPACE || 'dnpr-perf'
const GUI = process.env.DNPR_GUI_URL || 'https://dsh-dev.local/'
const results = []

/** keepMounted panes of other sessions stay hidden — select the visible root. */
const ROOT_SRC = `[...document.querySelectorAll('[data-nano-progress-report]')]
  .find(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible') ?? null`
const PERF_SRC = `globalThis[Symbol.for('dsh.perfReview.v2')]`

function record(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail: String(detail ?? '').slice(0, 160) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 120) : ''}`)
}

async function waitFor(page, fn, arg, ms = 8000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (await page.evaluate(fn, arg === undefined ? null : arg)) return true
    await new Promise(r => setTimeout(r, 200))
  }
  return false
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

/** Bring the workbench Progress pane on screen: existing -> pane tab chip ->
 *  open the sidebar -> "+" guide -> Progress card. */
async function ensureProgressPane(page) {
  const mountedNow = () => page.evaluate(src => eval(src) !== null, ROOT_SRC)
  if (await mountedNow()) return true
  await page.evaluate(() => {
    const chip = [...document.querySelectorAll('[role="tab"]')]
      .find(e => (e.textContent ?? '').trim() === 'Progress' && e.getBoundingClientRect().x > 700)
    chip?.click()
  })
  await new Promise(r => setTimeout(r, 1200))
  if (await mountedNow()) return true
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button[aria-label]')]
      .find(e => /打开右侧边栏/.test(e.getAttribute('aria-label') || ''))
    b?.click()
  })
  await new Promise(r => setTimeout(r, 1500))
  if (await mountedNow()) return true
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button[aria-label="新标签页"]')]
      .find(e => e.getBoundingClientRect().x > 700 && e.getBoundingClientRect().width > 0)
    b?.click()
  })
  await new Promise(r => setTimeout(r, 1200))
  const card = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button, [role="button"]')]
      .find(e => (e.textContent ?? '').trim() === 'Progress'
        && e.getBoundingClientRect().x > 700 && e.getBoundingClientRect().y > 100)
    if (!el) return false
    el.click(); return true
  })
  if (!card) return false
  for (let i = 0; i < 20; i += 1) {
    if (await mountedNow()) return true
    await new Promise(r => setTimeout(r, 400))
  }
  return await mountedNow()
}

async function main() {
  const task = await taskSpace(SPACE)
  const managed = await task.pages()
  const page = managed[0] || task.page('p1')

  await gotoApp(page, GUI)
  await new Promise(r => setTimeout(r, 3000))
  // The token redirect drops query params — arm the localStorage flag and reload.
  await page.evaluate(() => localStorage.setItem('dsh-perf-review', '1'))
  await page.reload({ timeout: 60000 })
  await page.waitForLoadState()
  await new Promise(r => setTimeout(r, 5000))

  const flag = await page.evaluate(src => typeof eval(src)?.read === 'function', PERF_SRC)
  record('perfReview installed', flag, '')

  const mounted = await ensureProgressPane(page)
  record('progress mounted for perf', mounted, '')

  if (mounted) {
    // Trigger counts: filter-apply (unique text so a persisted value can't no-op),
    // row-expand, load-older (if the button exists).
    await page.evaluate(src => {
      const input = eval(src)?.querySelector('[data-npr="search"]')
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        setter.call(input, 'status:ok')
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }, ROOT_SRC)
    await new Promise(r => setTimeout(r, 700))
    // Collapse any expanded row first (keepMounted state persists across runs,
    // so the click below must be an open, not a close).
    await page.evaluate(src => {
      const root = eval(src)
      if (!root) return
      const detail = root.querySelector('[data-npr="detail"]')
      if (detail) root.querySelector('[data-disclosure-row][data-expandable]')?.click()
    }, ROOT_SRC)
    await new Promise(r => setTimeout(r, 300))
    await page.evaluate(src => {
      eval(src)?.querySelector('[data-disclosure-row][data-expandable]')?.click()
    }, ROOT_SRC)
    await new Promise(r => setTimeout(r, 500))
    await page.evaluate(src => {
      eval(src)?.querySelector('.npr-older [data-npr="load-older"]')?.click()
    }, ROOT_SRC)
    await new Promise(r => setTimeout(r, 1500))
  }

  const report = await page.evaluate(src => {
    const rep = eval(src)?.read?.({})
    const row = rep?.plugins?.['nano-progress-report'] ?? null
    if (!row) return { found: false, keys: Object.keys(rep?.plugins ?? {}), shape: Object.keys(rep ?? {}) }
    const hand = row.hand ?? row
    return {
      found: true,
      spans: Object.keys(hand.spans ?? {}),
      usage: Object.fromEntries(Object.entries(hand.usage ?? {}).map(([k, v]) => [k, v?.total ?? v?.n ?? v])),
      version: hand.version,
    }
  }, PERF_SRC)
  if (!report.found) {
    record('nano-progress-report row in report', false, JSON.stringify(report).slice(0, 200))
  } else {
    record('nano-progress-report row in report', true, `version=${report.version}`)
    record('version reported', typeof report.version === 'string' && report.version.length > 0, `got ${report.version}`)
    record('span progress-subscribe', report.spans.includes('progress-subscribe'), `spans=${report.spans.join(',')}`)
    record('span row-render', report.spans.includes('row-render'), '')
    record('usage tab-open', (report.usage?.['tab-open'] ?? 0) > 0, JSON.stringify(report.usage))
    record('usage filter-apply', (report.usage?.['filter-apply'] ?? 0) > 0, '')
    record('usage row-expand', (report.usage?.['row-expand'] ?? 0) > 0, '')
  }

  const fails = results.filter(r => !r.ok)
  console.log(`\n${results.length} checks: ${results.length - fails.length} pass, ${fails.length} fail`)
  await task.finish({ keep: [] })
  process.exit(fails.length === 0 ? 0 : 1)
}

main().catch(e => { console.error('perf live crashed:', e); process.exit(1) })
