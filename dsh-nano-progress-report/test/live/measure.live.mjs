/**
 * Visual acceptance measurements for dsh-nano-progress-report on dsh-dev.
 *
 *   ego-browser nodejs < test/live/measure.live.mjs
 *
 * Emits measurements (geometry, computed tokens, per-type colour identity,
 * drawer metrics) and screenshots to /tmp/dnpr-measure-*.png. Prints a JSON
 * summary; exits non-zero when the panel is not mounted.
 */

const SPACE = process.env.DNPR_EGO_SPACE || 'dnpr-measure'
const GUI = process.env.DNPR_GUI_URL || 'https://dsh-dev.local/'

/** keepMounted panes of other sessions stay hidden — select the visible root. */
const ROOT_SRC = `[...document.querySelectorAll('[data-nano-progress-report]')]
  .find(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible') ?? null`

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

  if (process.env.DNPR_RESET_DRAWER === '1') {
    await gotoApp(page, GUI)
    await page.evaluate(() => { try { window.localStorage.removeItem('dsh-nano-progress-report:drawer') } catch { /* off */ } })
    await page.reload()
  }
  await gotoApp(page, GUI)
  await new Promise(r => setTimeout(r, 2500))

  const mountedSession = null
  const mounted = await ensureProgressPane(page)
  if (!mounted) {
    console.log(JSON.stringify({ mounted: false }, null, 1))
    await task.finish({ keep: [] })
    process.exit(1)
  }
  // Let the view target assemble before measuring rows.
  for (let i = 0; i < 25; i += 1) {
    const rows = await page.evaluate(src => eval(src)?.querySelectorAll('.npr-row').length ?? 0, ROOT_SRC)
    if (rows > 0) break
    await new Promise(r => setTimeout(r, 600))
  }

  // Start from the unfiltered view: a persisted `status:…` from an earlier run
  // would silently change every count below.
  await page.evaluate(src => {
    const root = eval(src)
    const input = root?.querySelector('[data-npr="search"]')
    if (!input) return
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, '')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, ROOT_SRC)
  await new Promise(r => setTimeout(r, 400))

  const m = await page.evaluate(src => {
    const root = eval(src)
    if (!root) return { mounted: false }
    const cs = getComputedStyle(root)
    const rect = root.getBoundingClientRect()
    const rows = [...root.querySelectorAll('.npr-row')]
    const colourOf = sel => {
      const el = root.querySelector(sel)
      return el ? getComputedStyle(el).color : null
    }
    // Per-type identity: the leading glyph colour is what separates a human
    // prompt from a shell step. Collected for every type actually present.
    const iconColours = {}
    for (const icon of root.querySelectorAll('.npr-icon')) {
      const type = icon.dataset.type
      if (type && !(type in iconColours)) iconColours[type] = getComputedStyle(icon).color
    }
    const titleColours = {}
    for (const title of root.querySelectorAll('.npr-row-title[class*="npr-t-"]')) {
      const type = [...title.classList].find(c => c.startsWith('npr-t-'))?.slice(6)
      if (type && !(type in titleColours)) titleColours[type] = getComputedStyle(title).color
    }
    const toolbar = root.querySelector('[data-npr="toolbar"]')
    const searchInput = root.querySelector('[data-npr="search"]')
  const search = searchInput?.closest('.npr-search') ?? searchInput
    const status = root.querySelector('[data-npr="status"]')
    const drawer = root.querySelector('[data-npr="drawer"]')
    const head = drawer?.querySelector('.npr-drawer-head')
    const body = drawer?.querySelector('[data-npr="drawer-body"]')
    return {
      mounted: true,
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      rootBg: cs.backgroundColor,
      rootColor: cs.color,
      fontSize: cs.fontSize,
      rowCount: rows.length,
      rowTypes: [...new Set(rows.map(r => r.dataset.type))],
      rowStatuses: [...new Set(rows.map(r => r.dataset.status))],
      iconColours,
      titleColours,
      failedRowBg: (() => {
        const failed = root.querySelector('.npr-row[data-status="failed"]')
        return failed ? getComputedStyle(failed).backgroundColor : null
      })(),
      toolbar: toolbar ? { h: Math.round(toolbar.getBoundingClientRect().height), bg: getComputedStyle(toolbar).backgroundColor, border: getComputedStyle(toolbar).borderBottomColor } : null,
      search: searchInput ? {
        type: searchInput.type,
        placeholder: searchInput.placeholder,
        h: Math.round(search.getBoundingClientRect().height),
        border: getComputedStyle(search).borderColor,
        bg: getComputedStyle(search).backgroundColor,
      } : null,
      stats: root.querySelector('[data-npr="stats"]')?.textContent ?? null,
      status: status ? {
        text: status.textContent.trim(),
        h: Math.round(status.getBoundingClientRect().height),
        color: getComputedStyle(status).color,
        state: status.querySelector('[data-npr="state"]')?.dataset.state ?? null,
      } : null,
      drawer: drawer ? {
        h: Math.round(drawer.getBoundingClientRect().height),
        collapsed: drawer.dataset.collapsed,
        view: drawer.dataset.view,
        headBg: head ? getComputedStyle(head).backgroundColor : null,
        bodyH: body ? Math.round(body.getBoundingClientRect().height) : 0,
        count: drawer.querySelector('[data-npr="tasks-count"]')?.textContent ?? null,
      } : null,
      session: root.querySelector('.npr-status')?.textContent ?? null,
    taskItems: root.querySelectorAll('[data-npr="task"]').length,
      stateDots: root.querySelectorAll('[data-npr="task"] svg[data-state]').length,
      todoTexts: [...root.querySelectorAll('[data-npr="task"] .npr-task-text')].slice(0, 4).map(el => el.textContent),
      jobsItems: root.querySelectorAll('[data-npr="job"]').length,
      filterValue: searchInput?.value ?? '',
    }
  }, ROOT_SRC)

  // Expand a row that actually carries detail, then read the payload style.
  await page.evaluate(src => {
    const root = eval(src)
    // Prefer a shell row: its payload is the long command, which is where the
    // mono/width behaviour actually shows.
    const rows = [...root.querySelectorAll('.npr-row[data-status]')]
    const row = rows.find(r => r.dataset.type === 'shell' && r.querySelector('[data-disclosure-row][data-expandable]'))
      ?? rows.find(r => r.querySelector('[data-disclosure-row][data-expandable]'))
    row?.querySelector('[data-disclosure-row]')?.click()
  }, ROOT_SRC)
  await new Promise(r => setTimeout(r, 500))
  m.expandedDetail = await page.evaluate(src => {
    const d = eval(src)?.querySelector('[data-npr="detail"]')
    if (!d) return null
    const cs = getComputedStyle(d)
    return {
      fontFamily: cs.fontFamily.slice(0, 60),
      fontSize: cs.fontSize,
      bg: cs.backgroundColor,
      lines: d.querySelectorAll('.npr-detail-line').length,
      text: d.textContent.slice(0, 90),
    }
  }, ROOT_SRC)

  // Drag the grip up by 80px: the drawer must grow, and clamp at the ceiling.
  m.resize = await page.evaluate(async src => {
    const root = eval(src)
    if (!root) return null
    const drawer = root.querySelector('[data-npr="drawer"]')
    const grip = root.querySelector('[data-npr="grip"]')
    if (!drawer || !grip) return null
    const before = Math.round(drawer.getBoundingClientRect().height)
    const r = grip.getBoundingClientRect()
    const opts = { bubbles: true, cancelable: true, clientX: r.x + 20, clientY: r.y + 2, pointerId: 1 }
    grip.dispatchEvent(new PointerEvent('pointerdown', opts))
    window.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientY: r.y - 78 }))
    window.dispatchEvent(new PointerEvent('pointerup', opts))
    await new Promise(res => setTimeout(res, 120))
    const after = Math.round(drawer.getBoundingClientRect().height)
    return { before, after, delta: after - before }
  }, ROOT_SRC)

  // Collapse round-trip: the head must survive, the body must leave the layout.
  m.collapse = await page.evaluate(async src => {
    const root = eval(src)
    if (!root) return null
    const drawer = root.querySelector('[data-npr="drawer"]')
    const toggle = root.querySelector('[data-npr="drawer-toggle"]')
    if (!drawer || !toggle) return null
    const openH = Math.round(drawer.getBoundingClientRect().height)
    const hadBody = drawer.querySelector('[data-npr="drawer-body"]') !== null
    toggle.click()
    await new Promise(res => setTimeout(res, 260))
    const collapsedH = Math.round(drawer.getBoundingClientRect().height)
    const bodyGone = drawer.querySelector('[data-npr="drawer-body"]') === null
    toggle.click()
    await new Promise(res => setTimeout(res, 260))
    const reopenedH = Math.round(drawer.getBoundingClientRect().height)
    return { openH, collapsedH, reopenedH, hadBody, bodyGone, headStillThere: drawer.querySelector('.npr-drawer-head') !== null }
  }, ROOT_SRC)

  await page.screenshot({ path: '/tmp/dnpr-measure-full.png' })
  const clip = await page.evaluate(src => {
    const r = eval(src)?.getBoundingClientRect()
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null
  }, ROOT_SRC)
  if (clip) {
    await page.screenshot({ path: '/tmp/dnpr-measure-panel.png', clip }).catch(() => {})
    // Drawer close-up: the panel the owner asked to be raisable.
    const drawerClip = await page.evaluate(src => {
      const r = eval(src)?.querySelector('[data-npr="drawer"]')?.getBoundingClientRect()
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null
    }, ROOT_SRC)
    if (drawerClip) await page.screenshot({ path: '/tmp/dnpr-measure-drawer.png', clip: drawerClip }).catch(() => {})
  }

  m.switchedToSession = mountedSession
  console.log(JSON.stringify(m, null, 1))
  await task.finish({ keep: [] })
  process.exit(m.mounted ? 0 : 1)
}

main().catch(e => { console.error('measure crashed:', e); process.exit(1) })
