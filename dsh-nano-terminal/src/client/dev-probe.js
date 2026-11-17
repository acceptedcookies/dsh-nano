/**
 * dev-probe — resident A/B measurement instrumentation.
 *
 * Armed only when `?dnt-probe=1` is in the URL or
 * `localStorage['dnt-probe'] === '1'`; otherwise this file is inert. When
 * armed it installs `window.__AB`, a probe object the external harness
 * (`scripts/ab-render-perf.mjs`) reads to measure "input → visible change"
 * latency without relying on perf-review being enabled.
 *
 * What it captures:
 *   paint    — per-frame [perfNow, paneIdx] timestamps wrapped on every
 *              mounted base-canvas 2d context (fillRect/fillText/drawImage)
 *   textAt   — {xterm: last perfNow} from a MutationObserver on .xterm-rows
 *   textWatch— polling fallback that records .xterm-rows textContent changes
 *   mutAt    — last DOM mutation inside a .dnt-pane / .xterm
 *   raf      — [perfNow] rAF cadence (page-level)
 *   longtasks— PerformanceObserver('longtask') entries
 *
 * Re-installation is idempotent across view switches and page reloads: the
 * module runs once per bundle load, and `installDevProbe()` re-hooks contexts
 * every 1s so panes created later are wrapped too.
 */

const PROBE_FLAG = () => {
  try {
    return /[?&]dnt-probe=1(?:&|$)/.test(location.search)
      || localStorage.getItem('dnt-probe') === '1'
  } catch { return false }
}

export function installDevProbe() {
  if (typeof window === 'undefined' || !PROBE_FLAG()) return
  if (window.__AB?.__probe === 'dnt-dev-probe-v2') { refresh(); return }

  const ab = {
    __probe: 'dnt-dev-probe-v2',
    paint: [],               // [perfNow, paneIdx]
    textAt: {},              // selector → last perfNow
    textWatch: {},           // selector → {at, value}
    mutAt: 0,
    raf: [],
    longtasks: [],
    reset() {
      ab.paint.length = 0
      ab.textAt = {}
      ab.textWatch = {}
      ab.mutAt = 0
      ab.raf.length = 0
      ab.longtasks.length = 0
    },
  }
  window.__AB = ab

  // ---- canvas paint hook: wrap each mounted pane's base context ------------
  function hookPane(paneEl, paneIdx) {
    const base = paneEl?.querySelector('canvas')
    if (!base) return
    const ctx = base.getContext('2d')
    if (!ctx) return
    if (!ctx.__abWrapped) {
      ctx.__abWrapped = true
      for (const k of ['fillRect', 'fillText', 'drawImage']) {
        const f = ctx[k]
        ctx[k] = function (...args) {
          const sink = this.__abFor
          if (sink) {
            sink.paint.push([performance.now(), this.__abPane])
            if (sink.paint.length > 400000) sink.paint.splice(0, 200000)
          }
          return f.apply(this, args)
        }
      }
    }
    ctx.__abFor = ab
    ctx.__abPane = paneIdx
  }
  function refresh() {
    document.querySelectorAll('.dnt-pane').forEach((el, i) => hookPane(el, i))
  }
  refresh()

  // ---- text watchers ------------------------------------------------------
  const textWatcher = (sel) => {
    const el = document.querySelector(sel)
    if (!el || el.__abTextHook) return
    el.__abTextHook = true
    let last = el.textContent ?? ''
    const obs = new MutationObserver(() => {
      const v = el.textContent ?? ''
      if (v !== last) {
        last = v
        const now = performance.now()
        ab.textAt[sel] = now
        ab.textWatch[sel] = { at: now, value: v.slice(-4000) }
      }
    })
    obs.observe(el, { childList: true, subtree: true, characterData: true })
    el.__abTextObs = obs
  }
  const armWatchers = () => {
    textWatcher('.xterm .xterm-rows')
    textWatcher('.dnt-pane canvas')
  }
  armWatchers()

  // MutationObserver for .dnt-pane / .xterm subtree (any DOM change → mutAt)
  const mutObs = new MutationObserver(() => { ab.mutAt = performance.now() })
  const armMut = () => {
    document.querySelectorAll('.dnt-pane, .xterm').forEach((el) => {
      if (!el.__abMut) { el.__abMut = true; mutObs.observe(el, { childList: true, subtree: true, characterData: true, attributes: false }) }
    })
  }
  armMut()

  // ---- rAF cadence ---------------------------------------------------------
  const rafLoop = (t) => {
    ab.raf.push(t)
    if (ab.raf.length > 2000) ab.raf.splice(0, 1000)
    requestAnimationFrame(rafLoop)
  }
  requestAnimationFrame(rafLoop)

  // ---- longtasks ------------------------------------------------------------
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        ab.longtasks.push({ at: e.startTime, dur: e.duration })
        if (ab.longtasks.length > 400) ab.longtasks.splice(0, 200)
      }
    })
    po.observe({ type: 'longtask', buffered: false })
  } catch { /* unsupported */ }

  // Re-hook panes that mount later (view switch, split, remount)
  setInterval(() => { refresh(); armWatchers(); armMut() }, 1000)
}

export default installDevProbe
