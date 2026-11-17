/**
 * ab-render-perf.mjs — A/B render-performance harness for DNT vs builtin terminal.
 *
 * Run:    ego-browser nodejs < dsh-nano-terminal/scripts/ab-render-perf.mjs
 * Needs:  an ego-browser page on the authenticated dsh-dev GUI, ≥1 built-in
 *         terminal tab (Ctrl+`) in the right sidebar, and a Nano 终端 session
 *         view in the conversation area (opened once via /dnt → 新建标签页).
 *
 * The two views are mutually exclusive in the conversation area — the harness
 * therefore measures in phases: it toggles the Nano 终端 view ON for the DNT
 * leg and back to 对话 (with the zsh sidebar tab active) for the xterm leg,
 * per scenario. Both targets are measured fully mounted and focused.
 *
 * Scenarios (identical input/output semantics on both renderers):
 *   flood   — `seq 1 5000`: t_input → t_hostSeen (emulator got sentinel) →
 *             t_lastVisual (last base-canvas paint op / last DOM mutation)
 *   scroll  — `less -N` on 5000 lines: space → last-visual latency, 10 pages
 *   tui     — devin/claude/droid cold launch → prompt-ready latency
 *             (claude additionally gets a `/resume` repaint probe)
 *   echo    — single keystrokes → echo-visible latency
 *             (xterm: UI key path; dnt: host term.session.input — both paths
 *             cross PTY → emulator → renderer → visual update)
 *
 * No shipped code is touched. Instrumentation is page-local probes only:
 * rAF cadence, base-canvas draw-op timestamps (no pixel reads), MutationObserver
 * on .xterm, PerformanceObserver longtasks, and the host term.session.read
 * mirror for DNT content sentinels.
 */

// ---------------------------------------------------------------- config ----
const SPACE = 'dnt-ab-perf'
const PAGE = 'p1'

const FLOOD_LINES = 5000
const FLOOD_ROUNDS = 3
const TUI_ROUNDS = 3
const LESS_PAGES = 10
const ECHO_KEYS = 15
const QUIET_MS = 350
const SENTINEL_WAIT_MS = 20000

const TUIs = [
  // markers are picked so a bare zsh prompt can never satisfy them
  { cmd: 'devin', readyRe: /Devin CLI|remaining \(\d|Pro ·|~\/ ●|❯/, quit: ['q', 'ctrl+c'] },
  { cmd: 'claude', readyRe: /claude code|❯.*(?:help|quit|exit)|\?\s+for\s+shortcuts|bypass permissions|sonnet|opus/i, interact: 'resume', quit: ['ctrl+c'] },
  { cmd: 'droid', readyRe: /factory|droid|●.*(?:model|session)|❯/i, quit: ['q', 'ctrl+c'] },
]

const out = { meta: {}, scenarios: {}, notes: [] }
const log = (...a) => console.log('[ab]', ...a)

// ------------------------------------------------------------- bootstrap ----
const task = await taskSpace(SPACE)
const page = task.page(PAGE)
log('space', task.spaceId, 'page', PAGE)

const clockOff = await page.evaluate(() => Date.now() - performance.now())
const now = () => Date.now()
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function rpc(name, args = {}) {
  const r = await page.fetch('/dsh-nano-terminal/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
  })
  let parsed = null
  try { parsed = JSON.parse(r.body) } catch {}
  if (parsed?.error) throw new Error(`mcp ${name}: ${parsed.error.message}`)
  const res = parsed?.result
  if (res?.isError) throw new Error(`mcp ${name}: ${res?.structuredContent?.message ?? res?.content?.[0]?.text ?? 'mcp error'}`)
  if (!res) throw new Error(`mcp ${name}: no result (status ${r.status})`)
  return res.structuredContent
}

const readDnt = (addr, lines = 45) => rpc('term.session.read', { id: addr, lines })

// --------------------------------------------------------- view switching ---
/** Is the Nano 终端 conversation view mounted (≥1 pane with canvas)? */
const dntMounted = () => page.evaluate(() => document.querySelectorAll('.dnt-pane canvas').length > 0)
/** Is a built-in xterm visible? */
const xtermMounted = () => page.evaluate(() => [...document.querySelectorAll('.xterm')].some(e => e.offsetParent))

/** Activate the Nano 终端 view: ⋯ (更多会话视图) → 终端 menuitem. */
async function showDnt() {
  if (await dntMounted()) return
  const opened = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent)
    const b = btns.find(e => e.getAttribute('aria-label') === '更多会话视图')
      ?? btns.find(e => (e.getAttribute('title') === '更多会话视图'))
      ?? btns.find(e => e.getAttribute('aria-label') === '更多操作' && e.getBoundingClientRect().x < 500)
    if (b) { b.click(); return true }
    return false
  })
  if (!opened) throw new Error('view menu button not found')
  await sleep(600)
  const hit = await page.evaluate(() => {
    const items = [...document.querySelectorAll('[role=menuitem],button,li')]
      .filter(e => e.offsetParent && e.textContent.trim() === '终端')
    if (items[0]) { items[0].click(); return true }
    return false
  })
  if (!hit) {
    await page.keyboard.press('Escape')
    throw new Error('view menu has no 终端 item')
  }
  const deadline = now() + 8000
  while (now() < deadline) {
    if (await dntMounted()) return
    await sleep(300)
  }
  throw new Error('Nano 终端 view did not mount within 8s')
}

/** Back to the plain conversation + activate the sidebar zsh (xterm) tab. */
async function showXterm() {
  // switch conversation area off Nano 终端 view → 对话 tab
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button,[role=tab],div,span')]
      .filter(e => e.offsetParent && e.textContent.trim() === '对话' && e.getBoundingClientRect().x < 700)
      .sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x)[0]
    if (b) b.click()
  })
  await page.waitForTimeout(600)
  // activate each shell-named sidebar tab until an .xterm is actually visible
  for (let i = 0; i < 5 && !(await xtermMounted()); i++) {
    await page.evaluate(() => {
      const cands = [...document.querySelectorAll('button,[role=tab]')]
        .filter(e => e.offsetParent && /^(zsh|bash|terminal|终端)/i.test(e.textContent.trim()) && e.getBoundingClientRect().x > 690)
      const i = (window.__abTabIx = ((window.__abTabIx ?? -1) + 1) % Math.max(cands.length, 1))
      if (cands[i]) cands[i].click()
    })
    await sleep(800)
  }
  // no tab produced an xterm — open a fresh built-in terminal via Ctrl+`
  for (let i = 0; i < 3 && !(await xtermMounted()); i++) {
    await page.keyboard.press('Control+`')
    await sleep(2000)
  }
  if (!(await xtermMounted())) throw new Error('no sidebar terminal tab shows an .xterm')
}

// ------------------------------------------------------------- probes -------
async function installProbes() {
  // Prefer the resident dev-probe (P1) — survives view switches + reloads.
  // Fall back to installing our own when the page wasn't started with the flag.
  const resident = await page.evaluate(() => !!window.__AB?.__probe)
  if (resident) { console.log('[ab] using resident dnt dev-probe'); return }
  await page.evaluate(() => {
    if (window.__AB) return
    const ab = window.__AB = {
      raf: [], paint: [], mut: [], longtasks: [], textSel: {}, textWatch: {},
    }
    requestAnimationFrame(function loop() {
      ab.raf.push(performance.now())
      if (ab.raf.length > 20000) ab.raf.splice(0, 10000)
      requestAnimationFrame(loop)
    })
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) ab.longtasks.push({ t: e.startTime, d: e.duration })
      }).observe({ type: 'longtask', buffered: true })
    } catch {}
    const mutObs = new MutationObserver(() => ab.mut.push(performance.now()))
    window.__AB_mutObs = mutObs
    const hook = () => {
      const panes = [...document.querySelectorAll('.dnt-pane')]
      panes.forEach((pane, idx) => {
        const hostEl = pane.querySelector('.dnt-canvas-host')
        const base = hostEl?.querySelector('canvas')
        if (!base) return
        const ctx = base.getContext('2d')
        if (!ctx) return
        if (!ctx.__abWrapped) {
          ctx.__abWrapped = true
          for (const k of ['fillRect', 'fillText', 'drawImage']) {
            const f = ctx[k]
            ctx[k] = function (...a) {
              const sink = this.__abFor
              if (sink) {
                sink.paint.push([performance.now(), this.__abPane])
                if (sink.paint.length > 400000) sink.paint.splice(0, 200000)
              }
              return f.apply(this, a)
            }
          }
        }
        ctx.__abFor = ab   // wrapper pushes into whichever probe is live now
        ctx.__abPane = idx
      })
      for (const x of document.querySelectorAll('.xterm')) {
        if (x.__abMut) continue
        x.__abMut = true
        mutObs.observe(x, { subtree: true, childList: true, characterData: true, attributes: true })
      }
    }
    hook()
    setInterval(hook, 1000)
    setInterval(() => {
      const t = performance.now()
      for (const [key, sel] of Object.entries(ab.textSel)) {
        const el = document.querySelector(sel)
        const txt = el ? el.textContent : null
        const w = ab.textWatch[key] ?? (ab.textWatch[key] = { last: null, at: 0 })
        if (txt !== null && txt !== w.last) { w.last = txt; w.at = t }
      }
    }, 33)
  })
}

const watchText = (key, selector) =>
  page.evaluate(({ key, selector }) => { window.__AB.textSel[key] = selector }, { key, selector })

/** Probe snapshot since t0p; `pane` filters paint ops to one pane index. */
function probeStats(t0p, pane = null) {
  return page.evaluate(({ t0p, pane }) => {
    const ab = window.__AB
    const rafIn = ab.raf.filter(t => t >= t0p)
    const gaps = rafIn.slice(1).map((t, i) => t - rafIn[i])
    const pts = ab.paint.map(e => Array.isArray(e) ? e : [e, -1])
    const paintIn = pts.filter(([t, p]) => t >= t0p && (pane == null || p === pane))
    const mutIn = ab.mut.filter(t => t >= t0p)
    const lt = ab.longtasks.filter(e => e.t >= t0p)
    return {
      rafCount: rafIn.length,
      maxGapMs: gaps.length ? Math.max(...gaps) : 0,
      paintOps: paintIn.length,
      lastPaintAt: paintIn.length ? paintIn[paintIn.length - 1][0] : 0,
      byPane: pts.filter(([t]) => t >= t0p).reduce((m, [t, p]) => { m[p] = (m[p] ?? 0) + 1; return m }, {}),
      mutCount: mutIn.length,
      lastMutAt: mutIn.length ? mutIn[mutIn.length - 1] : 0,
      longtasks: lt.length,
      longtaskMs: lt.reduce((s, e) => s + e.d, 0),
      textAt: Object.fromEntries(Object.entries(ab.textWatch).map(([k, w]) => [k, w.at])),
    }
  }, { t0p, pane })
}

/** Wait until probe field is quiet for QUIET_MS; returns epoch ms of last change.
 * Values stamped before t0p are ignored — they belong to the previous action. */
async function waitVisualSettle(field, t0p, timeout = SENTINEL_WAIT_MS, pane = null) {
  const deadline = now() + timeout
  let lastSeen = -1
  while (now() < deadline) {
    const s = await probeStats(t0p, pane)
    const raw = field === 'mut' ? s.lastMutAt : field === 'text' ? (s.textAt.xterm ?? 0) : s.lastPaintAt
    const v = raw >= t0p ? raw : 0
    if (v > lastSeen) { lastSeen = v }
    else if (lastSeen > 0 && now() - (lastSeen + clockOff) >= QUIET_MS) return { at: lastSeen + clockOff }
    await sleep(40)
  }
  return { at: lastSeen > 0 ? lastSeen + clockOff : 0, timedOut: true }
}

/** First visual change strictly after t0p (renderer-side first paint). */
async function waitFirstVisual(field, t0p, timeout = SENTINEL_WAIT_MS, pane = null) {
  const deadline = now() + timeout
  while (now() < deadline) {
    const s = await probeStats(t0p, pane)
    const v = field === 'mut' ? s.lastMutAt : field === 'text' ? (s.textAt.xterm ?? 0) : s.lastPaintAt
    if (v >= t0p) return { at: v + clockOff }
    await sleep(30)
  }
  return { at: 0, timedOut: true }
}

/** Wait until regex matches the target's visible screen. Returns epoch ms. */
async function waitContent(kind, dntAddr, re, timeout = SENTINEL_WAIT_MS) {
  const deadline = now() + timeout
  while (now() < deadline) {
    if (kind === 'dnt') {
      const s = await readDnt(dntAddr)
      if (re.test(s?.text ?? '')) return { at: now() }
    } else {
      const hit = await page.evaluate((src) => {
        const x = [...document.querySelectorAll('.xterm .xterm-rows')].find(e => e.offsetParent)
        return x ? new RegExp(src).test(x.textContent) : false
      }, re.source)
      if (hit) return { at: now() }
    }
    await sleep(55)
  }
  return { at: 0, timedOut: true }
}

async function screenText(kind, dntAddr) {
  if (kind === 'dnt') return (await readDnt(dntAddr))?.text ?? ''
  return page.evaluate(() => {
    const x = [...document.querySelectorAll('.xterm .xterm-rows')].find(e => e.offsetParent)
    return x ? x.textContent : ''
  })
}
async function waitCount(kind, dntAddr, re, want, timeout = 5000) {
  const deadline = now() + timeout
  while (now() < deadline) {
    const txt = await screenText(kind, dntAddr)
    if ((txt.match(re) ?? []).length >= want) return { at: now() }
    await sleep(45)
  }
  return { at: 0, timedOut: true }
}

// ------------------------------------------------------- target plumbing ----
async function dntSessions() {
  return JSON.parse((await page.fetch('/dsh-nano-terminal/sessions')).body).sessions
}
/**
 * Discover the DNT bench pair {addr, paneIdx, paneId} exactly: every mounted
 * .dnt-pane exposes data-dnt-pane = leaf id; dnt.layout maps leaf →
 * laneSpec.attach = session addr. No probing, no guessing.
 * Prefers a leaf whose session is a live zsh; creates none itself.
 */
async function paneMap() {
  return page.evaluate(() => {
    const layout = (() => { try { return JSON.parse(localStorage.getItem('dnt.layout') || '{}') } catch { return {} } })()
    const leaves = {}
    const walk = (n) => { if (!n) return; if (n.type === 'leaf') leaves[n.id] = n.laneSpec?.attach ?? null; else { walk(n.a); walk(n.b) } }
    for (const v of Object.values(layout)) walk(v)
    return [...document.querySelectorAll('.dnt-pane')].map((el, i) => ({
      i, paneId: el.dataset.dntPane, title: el.querySelector('.dnt-title')?.textContent ?? '',
      attach: leaves[el.dataset.dntPane] ?? null,
      rect: { w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height },
    }))
  })
}
/** Collapse the current conversation's DNT layout to a single fresh leaf and
 * reload: guarantees one full-size pane with a brand-new zsh session. */
async function resetDntLayout() {
  await page.evaluate(() => {
    const raw = (() => { try { return JSON.parse(localStorage.getItem('dnt.layout') || '{}') } catch { return {} } })()
    let bestKey = null, bestLeaves = -1
    const count = (n) => !n ? 0 : n.type === 'leaf' ? 1 : count(n.a) + count(n.b)
    for (const [k, v] of Object.entries(raw)) { const n = count(v); if (n > bestLeaves) { bestLeaves = n; bestKey = k } }
    if (!bestKey) return { done: false, keys: Object.keys(raw) }
    raw[bestKey] = { type: 'leaf', id: 'p1', laneSpec: { lane: 'local' } }
    localStorage.setItem('dnt.layout', JSON.stringify(raw))
    return { done: true, bestKey, was: bestLeaves }
  }).then(r => log('layout reset', JSON.stringify(r)))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await sleep(2500)
  await installProbes()
}

async function discoverDntBench() {
  const TUI_TITLE = /devin|claude|droid|factory|codex|gemini/i
  for (let attempt = 0; attempt < 2; attempt++) {
    const map = await paneMap()
    const sessions = await dntSessions()
    const live = new Map(sessions.filter(s => s.lane === 'local' && !s.exited).map(s => [s.addr, s]))
    const ok = (s) => s && /zsh|bash/.test(s.title ?? '') && !TUI_TITLE.test(s.title ?? '')
    let candidates = map.filter(m => m.attach && ok(live.get(m.attach)))
    if (!candidates.length) {
      // titles can lag: accept empty-title panes whose screen ends at a bare prompt
      for (const m of map) {
        if (!m.attach) continue
        const s = live.get(m.attach)
        if (!s || TUI_TITLE.test(s.title ?? '')) continue
        if ((s.title ?? '') !== '' && !/zsh|bash/.test(s.title)) continue
        const txt = (await readDnt(m.attach, 6).catch(() => null))?.text ?? ''
        if (/[%$#>❯]\s*$|\n\s*[%$#>]\s*$/.test(txt)) candidates.push(m)
      }
    }
    candidates.sort((a, b) => (b.rect.w * b.rect.h) - (a.rect.w * a.rect.h))
    if (candidates.length) {
      const c = candidates[0]
      const bench = { addr: c.attach, pane: c.i, paneId: c.paneId, dims: live.get(c.attach)?.meta }
      // a pane squeezed to <10 cols wraps every marker — promote it to a fixed
      // 900×640 overlay for the bench duration (fit() picks the size up and
      // lane.resize propagates to the PTY)
      const small = c.rect.w < 300 || c.rect.h < 200
      if (small) {
        await page.evaluate((paneId) => {
          const el = [...document.querySelectorAll('.dnt-pane')].find(p => p.dataset.dntPane === paneId)
          if (!el) return
          el.dataset.abBig = '1'
          el.style.cssText += ';position:fixed;left:80px;top:120px;width:900px;height:640px;z-index:60;background:#0b0b0e;'
        }, c.paneId)
        await sleep(900)
        bench.dims = live.get(c.attach)?.meta
        bench.enlarged = true
      }
      return bench
    }
    out.notes.push(`discover attempt ${attempt}: no candidates; map=${JSON.stringify(map.map(m => [m.paneId, m.attach, m.title]))} sessions=${sessions.length}`)
    if (attempt === 0) {
      // open a fresh pane (its session becomes a live local zsh)
      await page.click('button[aria-label="新建窗格"], button[aria-label="new pane"]').catch(() => {})
      await sleep(600)
      await page.click('text=新建本地窗格').catch(() => {})
      await sleep(2500)
    }
  }
  throw new Error('no pane↔zsh-session pair in dnt.layout')
}

async function focusXterm() {
  const pt = await page.evaluate(() => {
    const x = [...document.querySelectorAll('.xterm')].find(e => e.offsetParent)
    if (!x) return null
    const r = x.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  if (!pt) throw new Error('xterm not visible — view switched mid-scenario')
  await page.mouse.click(pt.x, pt.y, { label: 'focus xterm' })
  await sleep(120)
}
/** Focus the pane that shows `addr`'s session: panes ↔ layout leaf order. For
 * the bench we always use the leaf without attach (fresh shell pane = last). */
async function focusDntBenchPane() {
  const pt = await page.evaluate(() => {
    const panes = [...document.querySelectorAll('.dnt-pane')].filter(p => p.offsetParent)
    const p = panes.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x)[0] ?? panes[0]
    const r = p.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await page.mouse.click(pt.x, pt.y, { label: 'focus dnt bench pane' })
  await sleep(120)
}

/** Send text/command. dnt → host agentSend (bracketed paste + enter); xterm →
 * real key events into the focused xterm. */
async function send(kind, dntAddr, data, { enter = true } = {}) {
  if (kind === 'dnt') {
    const t = now()
    if (enter) await rpc('term.send', { id: dntAddr, data })
    else await rpc('term.session.input', { id: dntAddr, data })
    return { tInput: t }
  }
  await focusXterm()
  const t = now()
  await page.keyboard.type(data, { delay: 1 })
  if (enter) await page.keyboard.press('Enter')
  return { tInput: t }
}

const DNT_NAMED = { enter: 'enter', esc: 'esc', 'ctrl+c': 'ctrl+c', 'ctrl+d': 'ctrl+d', 'ctrl+z': 'ctrl+z', 'ctrl+u': 'ctrl+u', 'ctrl+l': 'ctrl+l', backspace: 'backspace', up: 'up', down: 'down' }
const XT_MAP = { enter: 'Enter', esc: 'Escape', ' ': ' ', 'ctrl+c': 'Control+c', 'ctrl+d': 'Control+d', 'ctrl+z': 'Control+z', 'ctrl+u': 'Control+u', 'ctrl+l': 'Control+l', backspace: 'Backspace', up: 'ArrowUp', down: 'ArrowDown' }
/** DNT raw bytes for a key token (bypasses the blocked guard via input lane). */
const DNT_SEQ = { esc: '\x1b', 'ctrl+c': '\x03', 'ctrl+d': '\x04', 'ctrl+z': '\x1a', 'ctrl+u': '\x15', 'ctrl+l': '\x0c', enter: '\r', backspace: '\x7f', up: '\x1b[A', down: '\x1b[B' }
async function key(kind, dntAddr, token) {
  if (kind === 'dnt') {
    const t = now()
    // term.keys refuses when the program reports blocked — fall back to the
    // agent input lane, which goes through the gate without the OSC guard.
    try {
      if (DNT_NAMED[token]) await rpc('term.keys', { id: dntAddr, keys: [DNT_NAMED[token]] })
      else await rpc('term.session.input', { id: dntAddr, data: token })
    } catch {
      await rpc('term.session.input', { id: dntAddr, data: DNT_SEQ[token] ?? token })
    }
    return { tKey: t }
  }
  await focusXterm()
  const t = now()
  if (XT_MAP[token]) await page.keyboard.press(XT_MAP[token])
  else await page.keyboard.type(token)
  return { tKey: t }
}

async function resetShell(kind, dntAddr, pane) {
  // every op is best-effort: the pane may sit in less, a blocked TUI, or a
  // draft state — the sequence still walks back to a prompt.
  try { await key(kind, dntAddr, 'ctrl+c') } catch {} await sleep(150)
  try { await key(kind, dntAddr, 'q') } catch {} await sleep(150)
  try { await key(kind, dntAddr, 'ctrl+c') } catch {} await sleep(150)
  try { await key(kind, dntAddr, 'esc') } catch {} await sleep(150)
  // Ctrl+L redraw (no words — `clear` collided with a devin-TUI hijack in dev)
  try { await key(kind, dntAddr, 'ctrl+l') } catch {} await sleep(300)
  // let the resulting repaint land so the next scenario's settle starts clean
  try { await waitVisualSettle(kind === 'dnt' ? 'paint' : 'text', (now() - 1500) - clockOff, 3000, pane) } catch {}
}

// ------------------------------------------------------------ scenarios -----
async function scenarioFlood(kind, dntAddr, pane) {
  const rs = []
  for (let round = 0; round < FLOOD_ROUNDS; round++) {
    await resetShell(kind, dntAddr, pane)
    const marker = `__FLOOD_${kind}_${round}__`
    const { tInput } = await send(kind, dntAddr, `seq 1 ${FLOOD_LINES}; echo ${marker}`)
    const seen = await waitContent(kind, dntAddr, new RegExp(marker))
    const settle = await waitVisualSettle(kind === 'dnt' ? 'paint' : 'text', tInput - clockOff, SENTINEL_WAIT_MS, pane)
    const stats = await probeStats(tInput - clockOff, kind === 'dnt' ? pane : null)
    rs.push({
      round,
      tHostSeen: seen.at ? seen.at - tInput : null,
      tLastVisual: settle.at ? settle.at - tInput : null,
      paintOps: stats.paintOps, mutCount: stats.mutCount,
      rafCount: stats.rafCount, maxGapMs: +stats.maxGapMs.toFixed(1),
      longtasks: stats.longtasks, longtaskMs: +stats.longtaskMs.toFixed(1),
      timedOut: !!(seen.timedOut || settle.timedOut),
    })
    log(`flood ${kind} r${round}`, JSON.stringify(rs.at(-1)))
  }
  return rs
}

async function scenarioScroll(kind, dntAddr, pane) {
  const file = '/tmp/ab-less.txt'
  const rs = []
  await resetShell(kind, dntAddr, pane)
  await send(kind, dntAddr, `less -N ${file}`)
  await waitContent(kind, dntAddr, /ab-less\.txt|\b1\s+1\b/, 8000)
  await sleep(600)
  for (let p = 0; p < LESS_PAGES; p++) {
    const { tKey } = await key(kind, dntAddr, ' ')
    const settle = await waitVisualSettle(kind === 'dnt' ? 'paint' : 'text', tKey - clockOff, 8000, pane)
    rs.push({ page: p, tVisual: settle.at ? settle.at - tKey : null, timedOut: !!settle.timedOut })
  }
  await key(kind, dntAddr, 'q'); await sleep(300)
  log(`scroll ${kind}`, rs.map(x => Math.round(x.tVisual ?? -1)).join(','))
  return rs
}

async function scenarioTui(kind, dntAddr, pane) {
  const res = {}
  for (const tui of TUIs) {
    const rs = []
    // warmup launch so first-run dialogs/config writes don't pollute timing
    await resetShell(kind, dntAddr, pane)
    await send(kind, dntAddr, tui.cmd)
    const warm = await waitContent(kind, dntAddr, tui.readyRe, 25000)
    for (const q of tui.quit) await key(kind, dntAddr, q).catch(() => {})
    await sleep(500)
    await resetShell(kind, dntAddr, pane)
    if (warm.timedOut) out.notes.push(`${tui.cmd}/${kind} warmup never reached ready state`)
    for (let round = 0; round < TUI_ROUNDS; round++) {
      const { tInput } = await send(kind, dntAddr, tui.cmd)
      const first = await waitFirstVisual(kind === 'dnt' ? 'paint' : 'text', tInput - clockOff, 25000, kind === 'dnt' ? pane : null)
      const ready = await waitContent(kind, dntAddr, tui.readyRe, 25000)
      const stats = await probeStats(tInput - clockOff, kind === 'dnt' ? pane : null)
      const rec = {
        round,
        tFirstVisual: first.at ? first.at - tInput : null,
        tReady: ready.at ? ready.at - tInput : null,
        timedOut: !!ready.timedOut && !!first.timedOut,
        longtasks: stats.longtasks, paintOps: stats.paintOps, mutCount: stats.mutCount,
      }
      if (tui.interact === 'resume' && !ready.timedOut) {
        const { tInput: tr } = await send(kind, dntAddr, '/resume')
        const done = await waitContent(kind, dntAddr, /resume|session|conversation|esc to/i, 10000)
        rec.tResume = done.at ? done.at - tr : null
        await key(kind, dntAddr, 'esc'); await sleep(250)
      }
      rs.push(rec)
      for (const q of tui.quit) await key(kind, dntAddr, q).catch(() => {})
      await sleep(400)
      await resetShell(kind, dntAddr, pane)
      log(`tui ${tui.cmd} ${kind} r${round}`, JSON.stringify(rec))
    }
    res[tui.cmd] = rs
  }
  return res
}

async function scenarioEcho(kind, dntAddr, pane) {
  const rs = []
  await resetShell(kind, dntAddr, pane)
  if (kind === 'xterm') await focusXterm()
  const base = await screenText(kind, dntAddr)
  const baseN = (base.match(/x/g) ?? []).length
  for (let i = 0; i < ECHO_KEYS; i++) {
    const tKey = now()
    if (kind === 'dnt') await rpc('term.session.input', { id: dntAddr, data: 'x' })
    else await page.keyboard.type('x')
    const seen = await waitCount(kind, dntAddr, /x/g, baseN + i + 1)
    rs.push({ i, tEcho: seen.at ? seen.at - tKey : null, timedOut: !!seen.timedOut })
  }
  for (let i = 0; i < ECHO_KEYS + 2; i++) await key(kind, dntAddr, 'backspace').catch(() => {})
  if (kind === 'xterm') for (let i = 0; i < ECHO_KEYS; i++) await page.keyboard.press('Backspace')
  try { await key(kind, dntAddr, 'ctrl+l') } catch {}
  await sleep(300)
  log(`echo ${kind}`, rs.map(x => Math.round(x.tEcho ?? -1)).join(','))
  return rs
}

// ------------------------------------------------------------------ main ----
await installProbes()
await watchText('xterm', '.xterm .xterm-rows')

// fresh single-pane layout so the bench pane is big and its zsh is alive
await resetDntLayout()
await installProbes()

// prepare the less file once through the DNT shell (shared host fs)
await showDnt()
const bench = await discoverDntBench()
log('dnt bench', JSON.stringify(bench))
await send('dnt', bench.addr, 'seq 1 5000 > /tmp/ab-less.txt')
await sleep(800)

out.meta = await page.evaluate(() => ({
  url: location.href,
  dntPanes: [...document.querySelectorAll('.dnt-pane')].map(p => ({
    w: +p.getBoundingClientRect().width.toFixed(0), h: +p.getBoundingClientRect().height.toFixed(0),
    focused: p.dataset.focused,
  })),
  devicePixelRatio: devicePixelRatio,
}))
await showXterm()
out.meta.xterm = await page.evaluate(() => {
  const x = [...document.querySelectorAll('.xterm')].find(e => e.offsetParent)
  if (!x) return null
  const r = x.getBoundingClientRect()
  const rows = x.querySelectorAll('.xterm-rows > div').length
  const cell = x.querySelector('.xterm-rows > div > span')
  return { w: +r.width.toFixed(0), h: +r.height.toFixed(0), rows, cellW: cell ? +cell.getBoundingClientRect().width.toFixed(2) : 0 }
})
log('meta', JSON.stringify(out.meta))

const legs = {
  dnt: { show: showDnt, ready: dntMounted },
  xterm: { show: showXterm, ready: xtermMounted },
}

for (const [name, fn] of Object.entries({ flood: scenarioFlood, scroll: scenarioScroll, echo: scenarioEcho, tui: scenarioTui })) {
  out.scenarios[name] = {}
  for (const kind of ['dnt', 'xterm']) {
    await legs[kind].show()
    if (!(await legs[kind].ready())) { out.notes.push(`${name}/${kind}: target not mounted`); continue }
    if (kind === 'dnt') {
      // real focus() — the pane's keydown path and rAF paint both need it
      await page.evaluate((paneId) => {
        const p = [...document.querySelectorAll('.dnt-pane')].find(e => e.dataset.dntPane === paneId)
        if (p) p.focus()
      }, bench.paneId)
      await sleep(250)
    }
    try {
      out.scenarios[name][kind] = await fn(kind, bench.addr, kind === 'dnt' ? bench.pane : null)
    } catch (e) {
      out.notes.push(`${name}/${kind} crashed: ${String(e?.message ?? e).slice(0, 200)}`)
      out.scenarios[name][kind] = { crashed: String(e?.message ?? e).slice(0, 200) }
      // leave the crashed TUI behind: force back to a shell
      try { await resetShell(kind, bench.addr, kind === 'dnt' ? bench.pane : null) } catch {}
    }
  }
}

// ------------------------------------------------------------ summarize -----
const arr = rs => Array.isArray(rs) ? rs : []
const median = a => { const v = a.filter(x => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : null }
const p95 = a => { const v = a.filter(x => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y); return v.length ? v[Math.floor((v.length - 1) * 0.95)] : null }
const rnd = x => x == null ? null : +x.toFixed(1)

const S = out.scenarios
const rows = x => (Array.isArray(x) ? x : [])
out.summary = {
  flood: Object.fromEntries(Object.entries(S.flood ?? {}).map(([k, rs0]) => {
    const rs = rows(rs0)
    return [k, {
      tHostSeenMedian: rnd(median(rs.map(r => r.tHostSeen))),
      tLastVisualMedian: rnd(median(rs.map(r => r.tLastVisual))),
      tLastVisualP95: rnd(p95(rs.map(r => r.tLastVisual))),
      paintOpsMedian: median(rs.map(r => r.paintOps)),
      mutsMedian: median(rs.map(r => r.mutCount)),
      maxGapMs: rs.length ? Math.max(...rs.map(r => r.maxGapMs), 0) : 0,
      longtaskMsTotal: rs.reduce((s, r) => s + r.longtaskMs, 0),
    }]
  })),
  scroll: Object.fromEntries(Object.entries(S.scroll ?? {}).map(([k, rs0]) => {
    const rs = rows(rs0)
    return [k, {
      tVisualMedian: rnd(median(rs.map(r => r.tVisual))),
      tVisualP95: rnd(p95(rs.map(r => r.tVisual))),
    }]
  })),
  tui: Object.fromEntries(Object.entries(S.tui ?? {}).map(([k, byCmd]) => [k,
    Object.fromEntries(Object.entries(byCmd ?? {}).map(([cmd, rs0]) => {
      const rs = rows(rs0)
      return [cmd, {
        tFirstVisualMedian: rnd(median(rs.map(r => r.tFirstVisual))),
        tReadyMedian: rnd(median(rs.map(r => r.tReady))),
        tReadyP95: rnd(p95(rs.map(r => r.tReady))),
        tResumeMedian: rs.some(r => r.tResume != null) ? rnd(median(rs.map(r => r.tResume))) : null,
      }]
    })),
  ])),
  echo: Object.fromEntries(Object.entries(S.echo ?? {}).map(([k, rs0]) => {
    const rs = rows(rs0)
    return [k, {
      tEchoMedian: rnd(median(rs.map(r => r.tEcho))),
      tEchoP95: rnd(p95(rs.map(r => r.tEcho))),
    }]
  })),
}

const report = JSON.stringify(out, null, 1)
console.log('\n===== AB-REPORT-BEGIN =====')
console.log(report)
console.log('===== AB-REPORT-END =====')
const fs = await import('node:fs/promises')
await fs.writeFile('/tmp/ab-render-perf-report.json', report)
log('wrote /tmp/ab-render-perf-report.json')
