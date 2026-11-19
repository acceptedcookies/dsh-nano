/**
 * Visual measurement for the low-key Progress rebuild.
 *
 *   ego-browser nodejs < test/live/measure.live.mjs
 *
 * Prints the numbers the design review compares against the Devin reference:
 * search line height, row pitch, title colours/weights, task footer metrics,
 * drag range and collapse height. Also writes screenshots:
 *   /tmp/dnpr-measure-panel.png   right workbench pane
 *   /tmp/dnpr-measure-full.png    whole window
 *   /tmp/dnpr-measure-tasks.png   task footer close-up
 */

const GUI = 'https://dsh-dev.local/'
const VIEW_SRC = `[...document.querySelectorAll('[data-nano-progress-report][data-variant="view"]')].find(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible') ?? null`
const PANE_SRC = `[...document.querySelectorAll('[data-nano-progress-report][data-variant="pane"]')].find(el => el.offsetWidth > 0 && getComputedStyle(el).visibility === 'visible') ?? null`

const task = await taskSpace('dnpr-measure')
const pages = await task.pages()
const page = pages[0] || task.page('p1')

async function gotoApp() {
  for (const target of [GUI, GUI, GUI]) {
    try {
      await page.goto(target, { timeout: 60000 })
      await page.waitForLoadState()
      const bad = await page.evaluate(() => {
        const text = document.body?.innerText ?? ''
        return text.length < 20 || /HTTP ERROR|ERR_/i.test(text.slice(0, 200))
      }).catch(() => true)
      if (!bad) return true
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 2500))
  }
  return false
}

async function ensureView() {
  if (await page.evaluate(src => eval(src) !== null, VIEW_SRC)) return true
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const ok = await page.evaluate(() => {
      const t = [...document.querySelectorAll('button[role="tab"]')]
        .find(b => (b.textContent ?? '').trim() === 'Progress' && b.getBoundingClientRect().y < 90)
      if (!t) return false
      t.click(); return true
    })
    if (ok) {
      for (let i = 0; i < 25; i += 1) {
        if (await page.evaluate(src => eval(src) !== null, VIEW_SRC)) return true
        await new Promise(r => setTimeout(r, 400))
      }
    }
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

async function ensurePane() {
  if (await page.evaluate(src => eval(src) !== null, PANE_SRC)) return true
  await page.evaluate(() => {
    const open = [...document.querySelectorAll('button[aria-label]')]
      .find(b => /打开右侧边栏/.test(b.getAttribute('aria-label') || ''))
    open?.click()
  })
  await new Promise(r => setTimeout(r, 1200))
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
await new Promise(r => setTimeout(r, 3500))

const view = await ensureView()
// Start from the unfiltered (turn-grouped) view regardless of persisted filters.
if (view) {
  await page.evaluate(src => {
    const input = eval(src)?.querySelector('[data-npr="search"]')
    if (!input || input.value === '') return
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, '')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, VIEW_SRC)
  await new Promise(r => setTimeout(r, 600))
}
const pane = await ensurePane()
await new Promise(r => setTimeout(r, 1200))

const data = await page.evaluate(([vsrc, psrc]) => {
  const viewRoot = eval(vsrc)
  const paneRoot = eval(psrc)
  const cs = e => e ? getComputedStyle(e) : null
  const rect = e => {
    if (!e) return null
    const r = e.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  }
  const view = viewRoot ? {
    root: rect(viewRoot),
    toolbar: rect(viewRoot.querySelector('[data-npr="toolbar"]')),
    search: {
      rect: rect(viewRoot.querySelector('.npr-search')),
      border: cs(viewRoot.querySelector('.npr-search'))?.borderTopWidth,
      bg: cs(viewRoot.querySelector('.npr-search'))?.backgroundColor,
    },
    rows: [...viewRoot.querySelectorAll('[data-npr="row"]')].length,
    rowHeights: [...new Set([...viewRoot.querySelectorAll('[data-npr="row"]')].map(r => Math.round(r.getBoundingClientRect().height)))],
    types: [...new Set([...viewRoot.querySelectorAll('[data-npr="row"]')].map(r => r.dataset.type))],
    turns: viewRoot.querySelectorAll('[data-npr="turn"]').length,
    turnIndent: (() => {
      const t = viewRoot.querySelector('[data-npr="turn"]')
      const o = t?.querySelector('[data-npr="row"][data-level="0"]')
      const s = t?.querySelector('[data-npr="turn-body"] [data-npr="row"]')
      return o && s ? Math.round(s.getBoundingClientRect().x - o.getBoundingClientRect().x) : null
    })(),
    sample: [...viewRoot.querySelectorAll('[data-npr="row"]')].slice(0, 8).map(r => ({
      type: r.dataset.type,
      title: r.querySelector('.npr-row-title')?.textContent?.slice(0, 34),
      color: cs(r.querySelector('.npr-row-title'))?.color,
      weight: cs(r.querySelector('.npr-row-title'))?.fontWeight,
      icon: cs(r.querySelector('.npr-icon'))?.color,
      bg: cs(r).backgroundColor,
      time: r.querySelector('[data-npr="time"]')?.textContent,
    })),
    expanded: (() => {
      const d = viewRoot.querySelector('[data-npr="detail"]')
      return d ? { ...rect(d), bg: cs(d).backgroundColor, font: cs(d).fontSize, borderLeft: cs(d).borderLeftWidth } : null
    })(),
  } : null
  const pane = paneRoot ? (() => {
    const bar = paneRoot.querySelector('[data-npr="tasks-panel"]')
    const tasks = [...(bar?.querySelectorAll('[data-npr="task"]') ?? [])]
    const progress = bar?.querySelector('[data-npr="progress"]')
    const fill = progress?.querySelector('.npr-progress-fill')
    return {
      root: rect(paneRoot),
      rows: paneRoot.querySelectorAll('[data-npr="row"]').length,
      tasks: {
        panel: rect(bar),
        bg: cs(bar)?.backgroundColor,
        borderTop: cs(bar)?.borderTopWidth,
        head: rect(bar?.querySelector('[data-disclosure-header]')),
        count: bar?.querySelector('[data-npr="tasks-count"]')?.textContent ?? null,
        bar: rect(progress),
        fill: rect(fill),
        fillColor: cs(fill)?.backgroundColor,
        items: tasks.map(t => ({
          status: t.dataset.status,
          h: Math.round(t.getBoundingClientRect().height),
          num: t.querySelector('.npr-task-num')?.textContent,
          text: t.querySelector('.npr-task-text')?.textContent?.slice(0, 30),
          glyph: t.querySelector('.npr-task-glyph')?.firstElementChild?.tagName,
          meta: t.querySelector('.npr-task-meta')?.textContent ?? null,
        })),
      },
    }
  })() : null
  return { view, pane }
}, [VIEW_SRC, PANE_SRC])

// Drag the footer to measure the usable range, then put it back.
const drag = await page.evaluate(async src => {
  const root = eval(src)
  const bar = root?.querySelector('[data-npr="tasks-panel"]')
  const grip = bar?.querySelector('[data-npr="grip"]')
  if (!bar || !grip) return null
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

// Collapse/reopen snapshot.
const collapse = await page.evaluate(async src => {
  const bar = eval(src)?.querySelector('[data-npr="tasks-panel"]')
  if (!bar) return null
  const openH = Math.round(bar.getBoundingClientRect().height)
  bar.querySelector('.npr-taskbar-title')?.click()
  await new Promise(r => setTimeout(r, 260))
  const collapsedH = Math.round(bar.getBoundingClientRect().height)
  const bodyGone = bar.querySelector('[data-npr="tasks-body"]') === null
  bar.querySelector('.npr-taskbar-title')?.click()
  await new Promise(r => setTimeout(r, 260))
  return { openH, collapsedH, reopenedH: Math.round(bar.getBoundingClientRect().height), bodyGone }
}, PANE_SRC)

// Close-ups.
const grabs = await page.evaluate(([vsrc, psrc]) => {
  const v = eval(vsrc)
  if (v) {
    const first = v.querySelector('[data-npr="row"]')
    const target = first?.querySelector('[data-disclosure-row][data-expandable]')
    if (target && !v.querySelector('[data-npr="detail"]')) target.click()
    return { expanded: true }
  }
  return { expanded: false }
}, [VIEW_SRC, PANE_SRC])
await new Promise(r => setTimeout(r, 700))
if (pane) await page.screenshot({ path: '/tmp/dnpr-measure-panel.png' })
await page.screenshot({ path: '/tmp/dnpr-measure-full.png' })
const clip = await page.evaluate(src => {
  const bar = eval(src)?.querySelector('[data-npr="tasks-panel"]')
  if (!bar) return null
  const r = bar.getBoundingClientRect()
  return { x: Math.max(0, Math.round(r.x) - 2), y: Math.max(0, Math.round(r.y) - 12), width: Math.round(r.width) + 4, height: Math.round(r.height) + 14 }
}, PANE_SRC)
if (clip) await page.screenshot({ path: '/tmp/dnpr-measure-tasks.png', clip })

console.log(JSON.stringify({ viewFound: view, paneFound: pane, view: data.view, pane: data.pane, drag, collapse, grabs }, null, 2))
