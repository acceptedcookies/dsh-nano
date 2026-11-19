/**
 * Visual measurement for the workbench-only Progress pane.
 *
 *   ego-browser nodejs < test/live/measure.live.mjs
 *
 * Prints the numbers the design review compares against the Devin reference:
 * search line height, row pitch, turn indent, time-gutter alignment, task footer
 * metrics, drag range and collapse height. Screenshots:
 *   /tmp/dnpr-measure-panel.png   right workbench pane
 *   /tmp/dnpr-measure-full.png    whole window
 *   /tmp/dnpr-measure-tasks.png   task footer close-up
 */

const GUI = 'https://dsh-dev.local/'
const PANE_SRC = `[...document.querySelectorAll('[data-nano-progress-report]')].find(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible') ?? null`

const task = await taskSpace('dnpr-measure')
const pages = await task.pages()
const page = pages[0] || task.page('p1')

async function gotoApp() {
  for (let i = 0; i < 4; i += 1) {
    try {
      await page.goto(GUI, { timeout: 60000 })
      await page.waitForLoadState()
      const bad = await page.evaluate(() => {
        const text = document.body?.innerText ?? ''
        return text.length < 20 || /HTTP ERROR|ERR_/i.test(text.slice(0, 200))
      }).catch(() => true)
      if (!bad) return true
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 2500 + i * 1500))
  }
  return false
}

async function ensurePane() {
  if (await page.evaluate(src => eval(src) !== null, PANE_SRC)) return true
  await page.evaluate(() => {
    const chip = [...document.querySelectorAll('[role="tab"]')]
      .find(e => (e.textContent ?? '').trim() === 'Progress' && e.getBoundingClientRect().x > 700)
    chip?.click()
  })
  await new Promise(r => setTimeout(r, 1200))
  if (await page.evaluate(src => eval(src) !== null, PANE_SRC)) return true
  await page.evaluate(() => {
    const open = [...document.querySelectorAll('button[aria-label]')]
      .find(b => /打开右侧边栏/.test(b.getAttribute('aria-label') || ''))
    open?.click()
  })
  await new Promise(r => setTimeout(r, 1500))
  if (await page.evaluate(src => eval(src) !== null, PANE_SRC)) return true
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
  for (let i = 0; i < 25; i += 1) {
    if (await page.evaluate(src => eval(src) !== null, PANE_SRC)) return true
    await new Promise(r => setTimeout(r, 400))
  }
  return false
}

await gotoApp()
await new Promise(r => setTimeout(r, 4000))
const pane = await ensurePane()
await new Promise(r => setTimeout(r, 1500))

// Start unfiltered so the pane shows turn groups.
await page.evaluate(src => {
  const input = eval(src)?.querySelector('[data-npr="search"]')
  if (!input || input.value === '') return
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, '')
  input.dispatchEvent(new Event('input', { bubbles: true }))
}, PANE_SRC)
await new Promise(r => setTimeout(r, 600))

const data = await page.evaluate(src => {
  const root = eval(src)
  if (!root) return null
  const cs = e => (e ? getComputedStyle(e) : null)
  const rect = e => {
    if (!e) return null
    const r = e.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  }
  const turn = root.querySelector('[data-npr="turn"]')
  const opener = turn?.querySelector('[data-npr="row"][data-level="0"]')
  const step = turn?.querySelector('[data-npr="turn-body"] [data-npr="row"]')
  const times = [...root.querySelectorAll('[data-npr="row"] [data-npr="time"]')]
  const bar = root.querySelector('[data-npr="tasks-panel"]')
  const tasks = [...(bar?.querySelectorAll('[data-npr="task"]') ?? [])]
  const progress = bar?.querySelector('[data-npr="progress"]')
  const fill = progress?.querySelector('.npr-progress-fill')
  return {
    root: rect(root),
    toolbar: rect(root.querySelector('[data-npr="toolbar"]')),
    search: {
      rect: rect(root.querySelector('.npr-search')),
      border: cs(root.querySelector('.npr-search'))?.borderTopWidth,
      bg: cs(root.querySelector('.npr-search'))?.backgroundColor,
    },
    rows: root.querySelectorAll('[data-npr="row"]').length,
    rowHeights: [...new Set([...root.querySelectorAll('[data-npr="row"]')].map(r => Math.round(r.getBoundingClientRect().height)))],
    turns: root.querySelectorAll('[data-npr="turn"]').length,
    turnIndent: opener && step ? Math.round(step.getBoundingClientRect().x - opener.getBoundingClientRect().x) : null,
    timeGutter: {
      n: times.length,
      rightEdges: [...new Set(times.map(t => Math.round(t.getBoundingClientRect().right)))],
      minWidth: Math.min(...times.map(t => Math.round(t.getBoundingClientRect().width))),
    },
    types: [...new Set([...root.querySelectorAll('[data-npr="row"]')].map(r => r.dataset.type))],
    sample: [...root.querySelectorAll('[data-npr="row"]')].slice(0, 8).map(r => ({
      type: r.dataset.type,
      title: r.querySelector('.npr-row-title')?.textContent?.slice(0, 30),
      color: cs(r.querySelector('.npr-row-title'))?.color,
      weight: cs(r.querySelector('.npr-row-title'))?.fontWeight,
      icon: cs(r.querySelector('.npr-icon'))?.color,
      bg: cs(r).backgroundColor,
      time: r.querySelector('[data-npr="time"]')?.textContent,
    })),
    tasks: bar ? {
      panel: rect(bar),
      bg: cs(bar)?.backgroundColor,
      borderTop: cs(bar)?.borderTopWidth,
      head: rect(bar.querySelector('[data-disclosure-header]')),
      count: bar.querySelector('[data-npr="tasks-count"]')?.textContent ?? null,
      bar: rect(progress),
      fill: rect(fill),
      items: tasks.map(t => ({
        status: t.dataset.status,
        h: Math.round(t.getBoundingClientRect().height),
        num: t.querySelector('.npr-task-num')?.textContent,
        text: t.querySelector('.npr-task-text')?.textContent?.slice(0, 28),
        meta: t.querySelector('.npr-task-meta')?.textContent ?? null,
      })),
    } : null,
  }
}, PANE_SRC)

const drag = await page.evaluate(async src => {
  const bar = eval(src)?.querySelector('[data-npr="tasks-panel"]')
  const grip = bar?.querySelector('[data-npr="grip"]')
  if (!bar || !grip) return { skipped: 'no grip' }
  if (bar.dataset.collapsed === 'true') bar.querySelector('[data-npr="tasks-head"]')?.click()
  await new Promise(res => setTimeout(res, 250))
  const fire = (type, y) => {
    const r = grip.getBoundingClientRect()
    ;(type === 'pointerdown' ? grip : window).dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, clientX: r.x + 20, clientY: y, pointerId: 1,
    }))
  }
  const seat = () => new Promise(res => setTimeout(res, 180))
  const h = () => Math.round(bar.getBoundingClientRect().height)
  const dragBy = async dy => {
    const y = grip.getBoundingClientRect().y + 2
    fire('pointerdown', y); fire('pointermove', y - dy); fire('pointerup', y - dy)
    await seat()
    return h()
  }
  const floored = await dragBy(-2000)
  const settled = await dragBy(200 - floored)
  const raised = await dragBy(140)
  const ceiling = Math.round(window.innerHeight * 0.6)
  const clamped = await dragBy(2000)
  const back = await dragBy(200 - clamped)
  return { floored, settled, raised, clamped, ceiling, back }
}, PANE_SRC)

const collapse = await page.evaluate(async src => {
  const bar = eval(src)?.querySelector('[data-npr="tasks-panel"]')
  if (!bar) return null
  if (bar.dataset.collapsed === 'true') bar.querySelector('[data-npr="tasks-head"]')?.click()
  await new Promise(res => setTimeout(res, 250))
  const openH = Math.round(bar.getBoundingClientRect().height)
  bar.querySelector('.npr-taskbar-title')?.click()
  await new Promise(res => setTimeout(res, 260))
  const collapsedH = Math.round(bar.getBoundingClientRect().height)
  const bodyGone = bar.querySelector('[data-npr="tasks-body"]') === null
  bar.querySelector('.npr-taskbar-title')?.click()
  await new Promise(res => setTimeout(res, 260))
  return { openH, collapsedH, reopenedH: Math.round(bar.getBoundingClientRect().height), bodyGone }
}, PANE_SRC)

if (pane) await page.screenshot({ path: '/tmp/dnpr-measure-panel.png' })
await page.screenshot({ path: '/tmp/dnpr-measure-full.png' })
const clip = await page.evaluate(src => {
  const bar = eval(src)?.querySelector('[data-npr="tasks-panel"]')
  if (!bar) return null
  const r = bar.getBoundingClientRect()
  return { x: Math.max(0, Math.round(r.x) - 2), y: Math.max(0, Math.round(r.y) - 12), width: Math.round(r.width) + 4, height: Math.round(r.height) + 14 }
}, PANE_SRC)
if (clip) await page.screenshot({ path: '/tmp/dnpr-measure-tasks.png', clip })

console.log(JSON.stringify({ pane, data, drag, collapse }, null, 2))
