/**
 * Visual acceptance measurements for dsh-nano-progress-report on dsh-dev.
 *
 *   ego-browser nodejs < test/live/measure.live.mjs
 *
 * Emits measurements (geometry, computed tokens, row counts) and screenshots
 * to /tmp/dnpr-measure-*.png. Prints a JSON summary at the end.
 */

const SPACE = process.env.DNPR_EGO_SPACE || 'dnpr-measure'
const GUI = process.env.DNPR_GUI_URL || 'https://dsh-dev.local/'

/** keepMounted panes of other sessions stay hidden — select the visible root. */
const ROOT_SRC = `[...document.querySelectorAll('[data-nano-progress-report]')]
  .find(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible') ?? null`

async function main() {
  const task = await taskSpace(SPACE)
  const managed = await task.pages()
  const page = managed[0] || task.page('p1')

  await page.goto(GUI, { timeout: 60000 })
  await page.waitForLoadState()
  await new Promise(r => setTimeout(r, 5000))

  let mounted = await page.evaluate(src => eval(src) !== null, ROOT_SRC)
  if (!mounted) {
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
    await new Promise(r => setTimeout(r, 1500))
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('[role="menuitem"], [role="menu"] *, [role="dialog"] *, [role="listbox"] *')]
        .find(e => e.textContent?.trim() === 'Progress')
      el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await new Promise(r => setTimeout(r, 2000))
    mounted = await page.evaluate(src => eval(src) !== null, ROOT_SRC)
  }

  const m = await page.evaluate(src => {
    const root = eval(src)
    if (!root) return { mounted: false }
    const cs = getComputedStyle(root)
    const rows = [...root.querySelectorAll('.npr-row')]
    const row0 = rows[0] ? getComputedStyle(rows[0]) : null
    const icons = [...root.querySelectorAll('.npr-row-icon svg')].length
    const expandBtn = root.querySelector('.npr-row .npr-row-chevron button')
    const rect = root.getBoundingClientRect()
    if (expandBtn) expandBtn.click()
    return {
      mounted: true,
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      rootBg: cs.backgroundColor, rootColor: cs.color, fontSize: cs.fontSize,
      rowCount: rows.length,
      rowTypes: [...new Set(rows.map(r => r.dataset.type))],
      rowStatuses: [...new Set(rows.map(r => r.dataset.status))],
      row0: row0 ? { color: row0.color, fontSize: row0.fontSize } : null,
      iconCount: icons,
      tasksPanel: [...root.querySelectorAll('.npr-panel-title')].map(t => t.textContent.trim()),
      headName: root.querySelector('.npr-head-name')?.textContent,
      headState: root.querySelector('.npr-head-state')?.textContent,
      filterValue: root.querySelector('.npr-filter input')?.value ?? '',
      todoItems: root.querySelectorAll('.npr-task').length,
    }
  }, ROOT_SRC)
  await new Promise(r => setTimeout(r, 600))
  const detail = await page.evaluate(src => {
    const d = eval(src)?.querySelector('.npr-row-detail')
    if (!d) return null
    const cs = getComputedStyle(d)
    return { fontFamily: cs.fontFamily.slice(0, 50), fontSize: cs.fontSize, text: d.textContent.slice(0, 80) }
  }, ROOT_SRC)
  m.expandedDetail = detail

  await page.screenshot({ path: '/tmp/dnpr-measure-full.png' })
  const clip = await page.evaluate(src => {
    const r = eval(src)?.getBoundingClientRect()
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null
  }, ROOT_SRC)
  if (clip) await page.screenshot({ path: '/tmp/dnpr-measure-panel.png', clip }).catch(() => {})

  console.log(JSON.stringify(m, null, 1))
  await task.finish({ keep: [] })
  process.exit(m.mounted ? 0 : 1)
}

main().catch(e => { console.error('measure crashed:', e); process.exit(1) })
