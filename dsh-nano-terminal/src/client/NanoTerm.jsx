// NanoTerm: the terminal tab body — a binary split tree of independent panes.
// Each pane = wasm emulator + canvas renderer + one lane (local/mcp).

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { copyMode, clampSelection } from './select.js'
import { formatCtxRef, stamp8 } from '../shared/ctxref.js'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoDialog, NanoMenu, NANO_STYLES, Toolbar } from 'dsh-nano-ui'

const { Button, Input, Switch, StateDot, Tag } = primitives
import { loadCore, WasmTerm, MODES } from './wasm.js'
import { TermCanvas, buildPalette } from './render.js'
import { encodeKey, encodePaste, encodeMouse, encodeFocus, encodeText } from './keys.js'
import { makeLane } from './lanes.js'
import {
  unmountAction, freezeGap, shouldRepaintNow, createFitCoalescer, noteFit, flushFit, resizeMode, watchDevicePixelRatio,
  applyTerminalOutput, outputDuringGap, paintCurrent, queueFrame,
} from './keep-alive.js'
import { perf, setTerminalRoot } from './perf.js'

// Spinner glyphs programs append to OSC titles for animation — strip them so
// the pane title is stable (herdr terminal_title_stripped convention)
const SPINNER = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏◐◓◑◒◴◷◶◵⣾⣽⣻⢿⡿⣟⣯⣷\\|/-]$/u
function stripSpinner(s) {
  return s.replace(SPINNER, '').trimEnd()
}

/**
 * Effective display state for a pane status record:
 * lifecycle phase overlaid by the program's OSC 7501 report.
 */
function effState(s) {
  if (!s) return 'opening'
  if (s.phase !== 'live') return s.phase
  return s.prog?.state ?? 'live'
}

let paneSeq = 1
const FONT_FAMILIES = {
  jetbrains: '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, monospace',
  sf: '"SF Mono", Menlo, Consolas, monospace',
  system: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
}
const DEFAULT_SETTINGS = { fontSize: 13, font: 'jetbrains', blink: true, scrollback: 2000 }
// 首帧之前 wasm 与 PTY 共用的几何。必须一致：PTY 按这个尺寸起 shell，wasm
// 也按这个尺寸解析首批字节，否则窄几何会把程序的首屏输出折错。
const INITIAL_COLS = 80
const INITIAL_ROWS = 24
const SETTINGS_KEY = 'dnt.settings'

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') || {}) }
  } catch { return { ...DEFAULT_SETTINGS } }
}
function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}
const fontFrom = (s) => ({ family: FONT_FAMILIES[s.font] ?? FONT_FAMILIES.jetbrains, size: s.fontSize })

// Workbench-consistent chrome: the same toolbar/tool shapes the other right-
// workspace plugins use, dressed entirely in --dsw-alias-* tokens. The status
// bar itself is nano-ui `Toolbar` (the host TrajectoryToolbar is not exported);
// its local classes only carry the row layout.
const STYLE = `
${NANO_STYLES}

.dnt-root{position:relative;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);flex-direction:column;display:flex}
/* 12px 只给终端内容。状态栏要跟轨迹栏同一套界面字号，不能被这里压小。 */
.dnt-content,.dnt-pane,.dnt-empty{font:var(--dsw-font-xxs-12)}
/* Status bar = 宿主 TrajectoryToolbar 规格（宿主组件不可见导出，规格取自其
   pinned 源）：bg-layer-1 + border-l2 底边、min-height 32、xxs-12 字号、
   20px 高按钮（gap 4 / padding 0 5-7 / radius-sm）、12px 图标。
   nano-toolbar 自带 min-height 36 与 border-l1，这里按轨迹规格覆盖。 */
/* specificity 提到 (0,2,0)：nano-toolbar 的 min-height:36px 有多份拷贝且在
   部分注入顺序下排在本规则之后，会盖掉 32px——.dnt-root.dnt-bar 锁死。 */
.dnt-root .dnt-bar{box-sizing:border-box;flex:none;width:100%;min-height:32px;flex-wrap:nowrap;align-items:center;padding:3px 6px;gap:4px;border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);font:var(--dsw-font-xxs-12)}
/* 终端标签 = 宿主 dockkit tab 规格的栏内移植（组件不可见导出，规格取自其
   pinned 源 ui-dockkit/dockkit.module.css：chip/分隔缝/悬停关闭/新建 ghost。
   栏高固定 32px，chip 降到 24px 留呼吸，其余按原生值。 */
.dnt-strip{display:flex;flex:0 1 auto;align-items:center;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;gap:0}
/* 空 strip 仍占一份 bar gap：+ 号被推离左缘 4px，与右端齿轮不对称。 */
.dnt-strip:empty{display:none}
.dnt-strip::-webkit-scrollbar{display:none}
.dnt-slot{display:flex;flex:none;align-items:center;justify-content:center;width:10px;height:24px}
.dnt-slot::before{content:'';width:.5px;height:14px;background:var(--dsw-alias-border-l4)}
.dnt-tab-active + .dnt-slot::before,.dnt-slot:has(+ .dnt-tab-active)::before{background:transparent}
.dnt-tab{position:relative;display:flex;flex:0 1 auto;align-items:center;min-width:80px;max-width:170px;height:24px;padding:0 8px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;line-height:1;white-space:nowrap;border-radius:var(--dsw-radius-sm);cursor:pointer;user-select:none;touch-action:none}
.dnt-tab:focus-visible{outline:1px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}
.dnt-tab-title{display:flex;flex:1 1 auto;gap:5px;align-items:center;min-width:0;overflow:hidden;line-height:1.4}
.dnt-tab-title span{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dnt-tab-icon{display:inline-flex;flex:none;color:currentColor}
.dnt-tab-icon svg{width:12px;height:12px}
.dnt-tab-pin{display:inline-flex;flex:none;margin:0 22px 0 2px;color:var(--dsw-alias-label-tertiary)}
.dnt-tab-busy{display:inline-flex;flex:none;margin-left:2px}
.dnt-tab-pin svg{width:11px;height:11px}
.dnt-tab:focus-within .dnt-tab-title,.dnt-tab-active .dnt-tab-title{mask-image:linear-gradient(to right,black calc(100% - 26px),transparent calc(100% - 10px))}
@media (hover:hover){.dnt-tab:hover .dnt-tab-title{mask-image:linear-gradient(to right,black calc(100% - 26px),transparent calc(100% - 10px))}}
.dnt-tab-close{position:absolute;top:2px;right:2px;display:flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);line-height:1;cursor:pointer;opacity:0;pointer-events:none}
.dnt-tab-close svg{width:14px;height:14px}
.dnt-tab:focus-within .dnt-tab-close,.dnt-tab-active .dnt-tab-close{opacity:1;pointer-events:auto}
@media (hover:hover){.dnt-tab:hover .dnt-tab-close{opacity:1;pointer-events:auto}}
.dnt-tab-add{display:flex;flex:none;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);line-height:1;cursor:pointer}
.dnt-tab-add svg{width:14px;height:14px}
.dnt-tab-add:focus-visible,.dnt-tab-close:focus-visible{outline:1px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}
@media (hover:hover){
.dnt-tab-add:hover,.dnt-tab-close:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dnt-tab:hover{background:var(--dsw-alias-interactive-bg-hover)}
}
.dnt-tab-active{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-markdown-tag)}
/* 设置齿轮回到栏内右端：与 + 号同一 ghost 24px 形态（原生 addTab 规格），
   margin-left:auto 把整行右侧对齐到头部按钮的正下方。 */
.dnt-gear{margin-left:auto}
/* content fills the view edge-to-edge — zero outer padding so the pane
   surface meets the view column border, matching how the trajectory body
   and chat composer sit flush against the column. No symmetric margin is
   left beside the panes. */
.dnt-content{flex:1 1 0;min-height:0;min-width:0;display:flex;overflow:hidden}
/* 业主反馈：8px 0 让左右贴边——补上横向 padding，恢复四边呼吸。 */
.dnt-panes{display:flex;flex:1 1 auto;min-height:0;min-width:0;gap:6px;padding:8px;box-sizing:border-box}
.dnt-splitter{flex:0 0 6px;border-radius:3px;cursor:col-resize;transition:background .15s}
.dnt-splitter:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dnt-pane{position:relative;flex:1 1 0;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden;container-type:size;container-name:dnt-pane;border-radius:var(--dsw-radius-md,8px);border:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base);transition:border-color .15s}
@container dnt-pane (max-width: 220px){.dnt-hide-narrow{display:none}}
@container dnt-pane (max-width: 160px){.dnt-title,.dnt-scroll-lines{display:none}}
.dnt-pane[data-focused="true"]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,var(--dsw-alias-link)) 55%,transparent)}
.dnt-pane[data-focused="false"]{border-color:var(--dsw-alias-border-l3)}
.dnt-pane[data-focused="false"] .dnt-canvas-host{opacity:.82}
.dnt-copy-hint{position:absolute;right:12px;bottom:10px;z-index:var(--nano-layer-local5);font:600 11px/1 var(--dsh-font-family-code);color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 92%,transparent);padding:3px 7px;border-radius:4px;border:1px solid var(--dsw-alias-border-l3);pointer-events:none}
.dnt-header{display:flex;align-items:center;gap:7px;height:26px;padding:0 8px;border-bottom:.5px solid var(--dsw-alias-border-l3);user-select:none;flex:none}
.dnt-pane[data-focused="true"] .dnt-header{border-bottom-color:var(--dsw-alias-border-l2);background:color-mix(in srgb,var(--dsw-alias-brand-primary,var(--dsw-alias-link)) 4%,transparent)}
.dnt-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}
.dnt-scroll-lines{font-size:10px;color:var(--dsw-alias-label-dimmed);flex:0 0 auto;font-variant-numeric:tabular-nums}
/* nano-ui-exempt: 宿主 Button 最小 28px，窗格头 20px 密度无对应档 */
/* 窗格头按钮：只有本包这里用的 20px 图标密度（宿主 Button 无此密度），
   inline-flex 自身居中，否则 X 按 baseline 悬挂在按钮顶边。 */
.dnt-header .dnt-toolbtn{width:20px;height:20px;padding:0;display:inline-flex;align-items:center;justify-content:center;line-height:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.dnt-header .dnt-toolbtn:hover:not(:disabled){color:var(--dsw-alias-label-primary)}
.dnt-header .dnt-toolbtn:focus-visible{outline:2px solid var(--dsw-focus-ring-color);outline-offset:1px}
.dnt-header .dnt-toolbtn svg{width:13px;height:13px}
/* 宿主图标库只有水平 PanelLeft 形态；向下分屏复用同一图标旋转 90°
   （此前该规则在一次样式清理中被误删，两枚分屏按钮变成同一朝向）。 */
.dnt-rotate{transform:rotate(90deg)}
.dnt-header-actions{display:flex;align-items:center;gap:1px;flex:0 0 auto;margin-left:auto}
.dnt-canvas-host{position:absolute;top:26px;left:0;right:0;bottom:0;overflow:hidden;cursor:text}
/* IME surface: composition events only fire on editable elements — a plain
   div with tabIndex never receives CJK text commits. The hidden textarea
   tracks the cursor cell so the candidate window anchors where typing
   happens; opacity:0 keeps it invisible but still caret-positioned. */
.dnt-ime{position:absolute;overflow:hidden;resize:none;padding:0;border:0;outline:none;margin:0;background:transparent;color:transparent;caret-color:transparent;opacity:0;z-index:0;pointer-events:none;white-space:pre}
/* The host renders transcript width handles as siblings of the scroll body
   whenever the conversation phase is 'active' — it cannot know a terminal
   view owns the column, so they float over our panes. The mount effect marks
   the enclosing conversation body data-dnt-live; this rule (on the public
   data-width-handle attribute) hides them inside that subtree only. Same
   public-attribute pattern as the scrollport fix in index.js. */
[data-conversation-content][data-dnt-live] [data-width-handle]{display:none}
.dnt-scrollbar-track{position:absolute;right:3px;top:32px;bottom:8px;width:6px;pointer-events:none;z-index:var(--nano-layer-local4)}
.dnt-scrollbar-thumb{position:absolute;right:0;width:6px;border-radius:3px;background:var(--dsw-alias-label-dimmed);opacity:.55;transition:opacity .15s}
.dnt-pane:hover .dnt-scrollbar-thumb{opacity:.9}
.dnt-overlay{position:absolute;inset:0;top:26px;z-index:var(--nano-layer-local6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:color-mix(in srgb,var(--dsw-alias-bg-base) 88%,transparent);color:var(--dsw-alias-label-secondary);text-align:center;padding:16px;border-bottom-left-radius:inherit;border-bottom-right-radius:inherit}
.dnt-overlay svg{color:var(--dsw-alias-label-tertiary)}
.dnt-overlay-title{font-weight:600;color:var(--dsw-alias-label-primary)}
.dnt-overlay-msg{max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary)}
.dnt-split-row{flex:1 1 0;min-width:0;min-height:0;display:flex}
.dnt-err{padding:16px;color:var(--dsw-alias-label-tertiary)}
/* settings rows follow the DNEE convention: label+hint left, control right */
.dnt-settings-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.dnt-settings-row:last-child{border-bottom:0}
.dnt-settings-label{color:var(--dsw-alias-label-primary)}
.dnt-settings-hint{margin-top:2px;font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dnt-settings-row .dnt-pick{display:inline-flex;align-items:center;gap:6px;min-width:132px;justify-content:space-between}
/* The empty state must stay inside the flex column below the statusbar —
   inset:0 over the whole root swallows every toolbar click (+ and gear). */
.dnt-empty{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px;padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.dnt-empty-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-link,#2f6fed);border:.5px solid var(--dsw-alias-border-l2)}
.dnt-empty-icon svg{width:20px;height:20px}
.dnt-empty-title{color:var(--dsw-alias-label-primary);font-weight:600}
.dnt-empty-body{max-width:360px;line-height:1.55}
.dnt-empty-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:6px}
`

const glyph = (name, rotate = false) => {
  const Icon = {
    splitRight: primitives.IconPanelLeftOutlineRegular,
    splitDown: primitives.IconPanelLeftOutlineRegular,
    mcp: primitives.IconApiOutlineRegular,
    close: primitives.IconCloseOutlineRegular,
    retry: primitives.IconRefreshOutlineRegular,
    warn: primitives.IconWarningOutlineRegular,
    settings: primitives.IconSettingsOutlineRegular,
    check: primitives.IconCheckOutlineRegular,
    chevron: primitives.IconChevronDownOutlineRegular,
    add: primitives.IconPlusOutlineRegular,
    pin: primitives.IconPinFillRegular,
    pinLine: primitives.IconPinOutlineRegular,
    terminal: primitives.IconCodeOutlineRegular,
    copy: primitives.IconCopyOutlineRegular,
    paste: primitives.IconCopyOutlineRegular,
  }[name]
  if (!Icon) return null
  return (
    <Icon
      width={16}
      height={16}
      aria-hidden="true"
      className={rotate ? 'dnt-rotate' : undefined}
    />
  )
}

/** Per-pane terminal uuid — the `term8` half of `[ DNT:{conv8}@{term8} ]`. */
const newTermId = () => (globalThis.crypto?.randomUUID?.() ?? `t${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`)

function leaf(laneSpec = { lane: 'local' }) {
  // Every terminal carries a uuid at birth; the host records its 8-hex stamp
  // as the `t` label when the pane creates its session, so `[ DNT:…@… ]`
  // resolves back across the MCP plane.
  return { type: 'leaf', id: 'p' + paneSeq++, laneSpec: { tid: newTermId(), ...laneSpec } }
}

// —— terminal sessions outlive view mounts ——
// Switching conversation views (Nano 终端 ⇄ 对话/轨迹) unmounts the Body, but
// a user-opened terminal must NOT die with it. The split tree + live pane
// sessions are keyed by conversation sessionId at module scope; only an
// explicit pane close (X) or plugin unload kills a lane.
const termStores = new Map() // sessionId → { tree, sessions: Map<paneId, rec> }
const LAYOUT_KEY = 'dnt.layout'

/**
 * Layout persistence (W-P1-3): the split tree + pane lane specs serialize to
 * localStorage so a remount/page reload rebuilds the same arrangement.
 * Local panes carry `laneSpec.attach` (host session addr) — reload re-attaches
 * to the still-running host terminal instead of spawning a new shell.
 */
function loadLayouts() {
  try { return JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}') } catch { return {} }
}
const saveLayouts = (() => {
  let t = null
  return () => {
    clearTimeout(t)
    t = setTimeout(() => {
      const doc = {}
      for (const [k, s] of termStores) {
        if (!s.tree) continue
        // attach refs live on each pane record's lane — graft onto laneSpec
        const graft = (node) => {
          if (node.type === 'leaf') {
            const rec = s.sessions.get(node.id)
            const addr = rec?.lane?.addr ?? rec?.lane?.id
            const spec = { ...node.laneSpec }
            if (node.laneSpec.lane === 'local' && addr) spec.attach = addr
            return { ...node, laneSpec: spec }
          }
          return { ...node, a: graft(node.a), b: graft(node.b) }
        }
        doc[k] = graft(s.tree)
      }
      try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(doc)) } catch { /* quota */ }
    }, 400)
  }
})()

const termStore = (sessionId) => {
  const key = sessionId ?? '_default'
  let s = termStores.get(key)
  if (!s) {
    const saved = loadLayouts()[key]
    // Layouts saved before ctx refs lack laneSpec.tid — backfill in place so
    // the saved tree keeps working and each pane gains a copyable identity.
    const backfill = (node) => {
      if (node?.type === 'leaf' && node.laneSpec && !node.laneSpec.tid) node.laneSpec.tid = newTermId()
      if (node?.type === 'split') { backfill(node.a); backfill(node.b) }
      return node
    }
    // Saved ids mint fresh pN/sN on every restored tree walk — re-seed the
    // counter past the largest suffix so new panes never collide with the
    // restored ones (paneSessions keys, pin targets, ctx refs all key on id).
    const reseed = (node) => {
      if (!node) return
      const m = /^[ps](\d+)$/.exec(node.id ?? '')
      if (m) paneSeq = Math.max(paneSeq, Number(m[1]) + 1)
      if (node.type === 'split') { reseed(node.a); reseed(node.b) }
    }
    if (saved) reseed(saved)
    s = { tree: saved ? backfill(saved) : null, sessions: new Map() }
    termStores.set(key, s)
  }
  return s
}

// —— outside intake ——
// Another plugin asks for a terminal at a directory (the explorer's row menu is
// the first caller). When the nano-term view is not mounted there is no
// openLeaf to call yet, so the request parks here until a Body mounts — the
// user still sees the pane because the intake always activates the view first.
const pendingOpens = [] // { sessionId, spec }
const openCallbacks = new Map() // sessionId → openLeaf while a Body is mounted

/** Queue or dispatch one pane open for `sessionId`. Returns true when it ran. */
export function requestPaneOpen(sessionId, spec) {
  const open = openCallbacks.get(sessionId ?? '_default')
  if (open !== undefined) { open(spec); return true }
  pendingOpens.push({ sessionId: sessionId ?? '_default', spec })
  return false
}

/** True while any conversation session keeps a live or opening terminal. */
export function anyLiveTerminals() {
  for (const { sessions } of termStores.values()) {
    for (const rec of sessions.values()) {
      if (rec.closed) continue
      const phase = rec.lastStatus?.phase
      if (phase !== 'exited' && phase !== 'error') return true
    }
  }
  return false
}

/** Plugin unload only: kill every pane lane across all sessions. */
export function disposeAllTerminals() {
  for (const { sessions } of termStores.values()) {
    for (const rec of sessions.values()) closePaneSession(rec)
    sessions.clear()
  }
  termStores.clear()
}

// The settings gear lives INSIDE the status bar (right edge), not in the
// header — [业主] corrected the earlier utilities-slot reading.

export function NanoTerm({ sessionId, session, zh, openView }) {
  const store = useMemo(() => termStore(sessionId), [sessionId])
  const [tree, setTreeState] = useState(store.tree) // null until user picks a lane
  const setTree = useCallback((fn) => {
    setTreeState((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      store.tree = next
      saveLayouts()
      return next
    })
  }, [store])
  const [focused, setFocused] = useState(null)
  const [err, setErr] = useState(null)
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState(loadSettings)
  // per-pane status lifted to the status bar: paneId → {lane, phase, dims, title}
  const [statuses, setStatuses] = useState({})
  const paneSessions = useRef(store.sessions)

  const reportStatus = useCallback((paneId, st) => {
    setStatuses((prev) => (prev[paneId] === st ? prev : { ...prev, [paneId]: st }))
  }, [])
  const forgetStatus = useCallback((paneId) => {
    setStatuses((prev) => {
      if (!(paneId in prev)) return prev
      const next = { ...prev }
      delete next[paneId]
      return next
    })
  }, [])

  const rootRef = useRef(null)

  // While this view is mounted its column is a terminal surface — the host's
  // transcript width handles have no purpose here. Mark the enclosing
  // [data-conversation-content] so the scoped CSS rule hides them; the
  // attribute and the rule live/die with this mount.
  useEffect(() => {
    if (!ready) return undefined
    const convBody = rootRef.current?.closest('[data-conversation-content]')
    if (!convBody) return undefined
    convBody.setAttribute('data-dnt-live', '1')
    return () => convBody.removeAttribute('data-dnt-live')
  }, [ready])

  useEffect(() => {
    let live = true
    const style = document.createElement('style')
    style.dataset.dntStyles = '1'
    style.textContent = STYLE
    document.head.appendChild(style)
    loadCore()
      .then(() => live && setReady(true))
      .catch((e) => live && setErr(String(e?.message ?? e)))
    return () => {
      live = false
      style.remove()
    }
  }, [])

  // Unmount ≠ close: view switching remounts the Body while terminals keep
  // running in the module-scope store. Pane lanes die only via closeLeaf
  // (X button) or plugin unload (disposeAllTerminals from apply()).

  const split = useCallback((id, dir, spec) => {
    setTree((t) => mapTree(t, id, (n) => ({
      type: 'split', dir, ratio: 0.5, id: 's' + paneSeq++,
      a: n, b: leaf(spec ?? { lane: 'local' }),
    })))
  }, [])

  const closeLeaf = useCallback((id) => {
    const rec = paneSessions.current.get(id)
    if (rec) { closePaneSession(rec); paneSessions.current.delete(id) }
    forgetStatus(id)
    setTree((t) => removeLeaf(t, id))
    setFocused((f) => (f === id ? null : f))
  }, [forgetStatus])

  const setRatio = useCallback((id, ratio) => {
    setTree((t) => mapTree(t, id, (n) => ({ ...n, ratio })))
  }, [])

  // Pin flag rides the leaf node (persisted in dnt.layout with the tree);
  // the status bar floats pinned chips to the front on every render.
  const togglePin = useCallback((id) => {
    setTree((t) => mapTree(t, id, (n) => ({ ...n, pinned: !n.pinned })))
  }, [])

  const updateSettings = useCallback((patch) => {
    setSettings((s) => {
      const next = { ...s, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  // live-apply display settings to open panes (font/blink); scrollback applies to new panes
  useEffect(() => {
    for (const rec of paneSessions.current.values()) {
      try { rec.reconfigure?.(settings) } catch { /* pane mid-teardown */ }
    }
  }, [settings])

  // creating a pane works both from the split menu and the empty-state actions
  const openLeaf = useCallback((spec = { lane: 'local' }) => {
    const t = leaf(spec)
    setTree(t)
    setFocused(t.id)
  }, [])

  // Register the outside-intake slot for this session while the view is
  // mounted, and flush anything queued while it was away — several requests
  // become a vertical split row, which is the closest "each asked for a pane"
  // the tiling layout can promise.
  useEffect(() => {
    const key = sessionId ?? '_default'
    const open = (spec) => setTree((t) => {
      const node = leaf(spec)
      if (t === null) return node
      return { type: 'split', dir: 'h', ratio: 0.5, id: 's' + paneSeq++, a: t, b: node }
    })
    openCallbacks.set(key, open)
    const queued = pendingOpens.filter(req => req.sessionId === key)
    for (let i = pendingOpens.length - 1; i >= 0; i -= 1) {
      if (pendingOpens[i].sessionId === key) pendingOpens.splice(i, 1)
    }
    for (const req of queued) open(req.spec)
    return () => { if (openCallbacks.get(key) === open) openCallbacks.delete(key) }
  }, [sessionId, setTree])

  if (err) return <div className="dnt-err">nano-terminal failed to load: {err}</div>
  if (!ready) return <div className="dnt-err">{zh ? '正在加载终端核心…' : 'loading terminal core…'}</div>

  return (
    <div ref={rootRef} className="dnt-root" data-nano-terminal data-dnt-root>
      <StatusBar tree={tree} focused={focused} setFocused={setFocused} closeLeaf={closeLeaf} split={split} openLeaf={openLeaf} togglePin={togglePin} sessionId={sessionId} paneSessions={paneSessions} zh={zh} settings={settings} onSettings={updateSettings} statuses={statuses} />
      {tree ? (
        <div className="dnt-content">
          <div className="dnt-panes">
            <PaneNode
              node={tree}
              sessionId={sessionId}
              session={session}
              focused={focused}
              setFocused={setFocused}
              split={split}
              closeLeaf={closeLeaf}
              setRatio={setRatio}
              paneSessions={paneSessions}
              zh={zh}
              settings={settings}
              reportStatus={reportStatus}
            />
          </div>
        </div>
      ) : (
        <div className="dnt-empty" data-dnt-empty>
          <div className="dnt-empty-icon">{glyph('terminal')}</div>
          <div className="dnt-empty-title">{zh ? '新建终端' : 'New terminal'}</div>
          <div className="dnt-empty-body">
            {zh
              ? '每个窗格是一个独立实例。本地窗格直连宿主 shell。沙箱终端由返回的 attach.url 接入，不在这里新开一种 lane。'
              : 'Each pane is its own instance. A local pane talks to the host shell. A sandbox terminal attaches to the returned URL. There is no separate lane for it.'}
          </div>
          <div className="dnt-empty-actions">
            <Button variant="primary" onClick={() => openLeaf()}>
              {zh ? '本地终端' : 'Local terminal'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function mapTree(node, id, f) {
  if (!node) return node
  if (node.id === id) return f(node)
  if (node.type === 'split') {
    return { ...node, a: mapTree(node.a, id, f), b: mapTree(node.b, id, f) }
  }
  return node
}

function removeLeaf(node, id) {
  if (!node) return null
  if (node.type === 'leaf') return node.id === id ? null : node
  const a = removeLeaf(node.a, id)
  const b = removeLeaf(node.b, id)
  if (!a && !b) return null
  if (!a) return b
  if (!b) return a
  return { ...node, a, b }
}

/** Tree leaves in display order — one status-bar tab per terminal pane. */
function leafIdsInOrder(node, out = []) {
  if (!node) return out
  if (node.type === 'leaf') { out.push(node); return out }
  leafIdsInOrder(node.a, out)
  leafIdsInOrder(node.b, out)
  return out
}

/**
 * Status bar (TrajectoryToolbar spec): one 原生 dockkit 形态 chip per pane —
 * click activates, × closes, + opens the new-pane menu; the settings gear sits
 * at the bar's right edge, visually aligned under the header's native buttons.
 * Right-clicking a chip opens its context menu: copy the pane's
 * `[ DNT:{conv8}@{term8} ]` context reference, pin it to the front, close it.
 */
function StatusBar({ tree, focused, setFocused, closeLeaf, split, openLeaf, togglePin, sessionId, paneSessions, zh, settings, onSettings, statuses }) {
  const [mcpUrl, setMcpUrl] = useState('')
  const [dialog, setDialog] = useState(null) // 'mcp' | 'settings'
  const [menu, setMenu] = useState(null) // '+' lane menu anchor
  const [tabMenu, setTabMenu] = useState(null) // { x, y, node } — chip context menu
  const [copiedCtx, setCopiedCtx] = useState(null) // paneId whose ctx ref was just copied
  const [copyFailedCtx, setCopyFailedCtx] = useState(null) // paneId whose clipboard write was denied
  const [closeConfirm, setCloseConfirm] = useState(null) // { node, reason } — two-step close on pinned/busy panes
  const copy = { cancel: zh ? '取消' : 'Cancel', confirm: zh ? '确定' : 'OK', close: zh ? '关闭' : 'Close' }

  useEffect(() => {
    if (!copiedCtx) return undefined
    const t = setTimeout(() => setCopiedCtx(null), 1600)
    return () => clearTimeout(t)
  }, [copiedCtx])
  useEffect(() => {
    if (!copyFailedCtx) return undefined
    const t = setTimeout(() => setCopyFailedCtx(null), 1600)
    return () => clearTimeout(t)
  }, [copyFailedCtx])

  // Pinned panes float to the front of the strip (stable, like dockkit pins).
  const panes = useMemo(() => {
    const inOrder = leafIdsInOrder(tree)
    return inOrder.filter((n) => n.pinned).concat(inOrder.filter((n) => !n.pinned))
  }, [tree])
  const target = focused ?? panes[0]?.id ?? null
  // wide panes split right, tall/narrow panes split down
  const autoDir = () => {
    const dims = target ? paneSessions.current.get(target) : null
    return dims && dims.h > dims.w ? 'v' : 'h'
  }
  // create-or-split: splitting needs a target pane; with none we seed the tree
  const open = (spec) => {
    if (!target) openLeaf(spec ?? { lane: 'local' })
    else split(target, autoDir(), spec)
  }
  const openMenu = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setMenu({ x: r.left, y: r.bottom + 6, openedAt: Date.now() })
  }
  const laneActions = [
    { id: 'local', label: zh ? '新建本地窗格' : 'New local pane', icon: glyph('terminal'), run: () => open() },
    { id: 'mcp', label: zh ? '连接 MCP 终端' : 'Connect MCP terminal', icon: glyph('mcp'), run: () => setDialog('mcp') },
  ]

  /** `[ DNT:{conv8}@{term8} ]` — paste target for agents & the MCP ctx tools.
   *  The host-bound anchors (ready frame) win; the pane's own spec is the
   *  fallback before the session reports back. */
  const ctxRefOf = (node) => {
    const lane = paneSessions.current.get(node.id)?.lane
    if (lane?.boundCtx) return `[ ${lane.boundCtx} ]`
    return formatCtxRef(sessionId, node.laneSpec?.tid)
  }

  /** OSC-reported busy (working/blocked) — no host round-trip needed. */
  const paneBusy = (node) => {
    const st = statuses?.[node.id]
    return st?.prog?.state === 'working' || st?.prog?.state === 'blocked'
  }
  /**
   * Close request: plain panes close directly; pinned or busy panes get a
   * second confirmation so a pinned anchor or a running foreground program
   * is never lost to one misclick. The non-OSC busy signal (vim, a build,
   * a REPL) comes from the host's own foreground probe via /sessions.
   */
  const requestClose = async (node) => {
    if (node.pinned) return setCloseConfirm({ node, reason: 'pinned' })
    if (paneBusy(node)) return setCloseConfirm({ node, reason: 'busy' })
    const rec = paneSessions.current.get(node.id)
    const sid = rec?.lane?.id
    if (sid) {
      try {
        const r = await fetch(`/dsh-nano-terminal/sessions`, { credentials: 'same-origin' })
        const rows = (await r.json())?.sessions ?? []
        const host = rows.find((x) => x.id === sid)
        if (host?.busy) return setCloseConfirm({ node, reason: 'busy' })
      } catch { /* probe failure must never block a close */ }
    }
    closeLeaf(node.id)
  }
  const copyCtxRef = (node) => {
    const ref = ctxRefOf(node)
    navigator.clipboard?.writeText(ref)
      .then(() => setCopiedCtx(node.id))
      .catch(() => setCopyFailedCtx(node.id)) // flash a warn icon — never silent
  }
  const tabActions = (node) => [
    // ctx refs only anchor sessions registered on THIS host — an mcp lane
    // pane's session lives on its remote endpoint, so a copied ref would
    // dangle. Disabled until a local-shadow record exists for remote panes.
    { id: 'ctx', label: zh ? '复制终端上下文引用' : 'Copy terminal context ref', icon: glyph('copy'), disabled: node.laneSpec?.lane === 'mcp', run: () => copyCtxRef(node) },
    {
      id: 'pin',
      label: node.pinned ? (zh ? '取消置顶' : 'Unpin') : (zh ? '置顶' : 'Pin to front'),
      icon: glyph(node.pinned ? 'pin' : 'pinLine'),
      run: () => togglePin(node.id),
    },
    { separator: true },
    { id: 'close', label: zh ? '关闭' : 'Close', icon: glyph('close'), run: () => requestClose(node) },
  ]

  return (
    <Toolbar label={zh ? '终端状态栏' : 'terminal status bar'} className="dnt-bar">
      <div className="dnt-strip" role="tablist" aria-label={zh ? '终端窗格' : 'terminal panes'}>
        {panes.map((node, i) => {
          const st = paneSessions.current.get(node.id)?.lastStatus
          const active = focused === node.id
          return (
            <React.Fragment key={node.id}>
              {i > 0 && <span className="dnt-slot" aria-hidden="true" />}
              <div
                className={`dnt-tab${active ? ' dnt-tab-active' : ''}`}
                role="tab"
                aria-selected={active}
                tabIndex={0}
                title={st?.title || undefined}
                onClick={() => setFocused(node.id)}
                onContextMenu={(e) => { e.preventDefault(); setTabMenu({ x: e.clientX, y: e.clientY, node, openedAt: Date.now() }) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFocused(node.id) } }}
              >
                <span className="dnt-tab-title">
                  <span className="dnt-tab-icon" aria-hidden="true">{glyph(copiedCtx === node.id ? 'check' : copyFailedCtx === node.id ? 'warn' : node.laneSpec?.lane === 'mcp' ? 'mcp' : 'terminal')}</span>
                  <span>{st?.title || (zh ? '终端' : 'Terminal')}</span>
                </span>
                {paneBusy(node) && <span className="dnt-tab-busy" aria-hidden="true" title={zh ? '有前台程序在运行' : 'foreground program running'}><StateDot state="ongoing" /></span>}
                {node.pinned && <span className="dnt-tab-pin" aria-hidden="true">{glyph('pin')}</span>}
                <button
                  type="button"
                  className="dnt-tab-close"
                  aria-label={zh ? `关闭 ${st?.title || '终端'}` : `close ${st?.title || 'terminal'}`}
                  onClick={(e) => { e.stopPropagation(); requestClose(node) }}
                >
                  {glyph('close')}
                </button>
              </div>
            </React.Fragment>
          )
        })}
      </div>
      <button
        type="button"
        className="dnt-tab-add"
        aria-label={zh ? '新建终端' : 'new terminal'}
        title={zh ? '新建窗格…' : 'new pane…'}
        onClick={openMenu}
        onContextMenu={(e) => { e.preventDefault(); openMenu(e) }}
      >
        {glyph('add')}
      </button>
      <button
        type="button"
        className="dnt-tab-add dnt-gear"
        aria-label={zh ? '终端设置' : 'terminal settings'}
        title={zh ? '终端设置' : 'terminal settings'}
        onClick={() => setDialog('settings')}
      >
        {glyph('settings')}
      </button>
      <NanoMenu menu={menu} actions={laneActions} onClose={() => setMenu(null)} width={200} />
      <NanoMenu menu={tabMenu} actions={tabMenu ? tabActions(tabMenu.node) : []} onClose={() => setTabMenu(null)} width={228} />
      {dialog === 'mcp' && (
        <NanoDialog
          copy={copy}
          title={zh ? '连接 MCP 终端' : 'Connect MCP terminal'}
          description={zh ? '目标须实现 MCP terminal server（JSON-RPC over HTTP）' : 'target must be an MCP terminal server (JSON-RPC over HTTP)'}
          confirmLabel={zh ? '连接' : 'Connect'}
          confirmDisabled={!mcpUrl}
          onConfirm={() => {
            if (mcpUrl) { open({ lane: 'mcp', url: mcpUrl }); setMcpUrl(''); setDialog(null) }
          }}
          onCancel={() => setDialog(null)}
        >
          <Input
            value={mcpUrl}
            placeholder=""
            data-modal-autofocus
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setMcpUrl(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && mcpUrl) { e.preventDefault(); open({ lane: 'mcp', url: mcpUrl }); setMcpUrl(''); setDialog(null) } }}
          />
        </NanoDialog>
      )}
      {dialog === 'settings' && (
        <SettingsDialog copy={copy} zh={zh} settings={settings} onSettings={onSettings} onClose={() => setDialog(null)} />
      )}
      {closeConfirm && (
        <NanoDialog
          copy={copy}
          title={zh ? '关闭终端' : 'Close terminal'}
          description={closeConfirm.reason === 'pinned'
            ? (zh ? '这个终端已置顶。置顶终端通常是有意长期保留的——确认关闭？' : 'This terminal is pinned. Pinned terminals are usually kept intentionally — close it anyway?')
            : (zh ? '这个终端有前台程序在运行（working/blocked），关闭会终止它——确认关闭？' : 'A foreground program is running in this terminal (working/blocked) — closing will kill it. Close anyway?')}
          confirmLabel={zh ? '关闭' : 'Close'}
          danger
          onConfirm={() => { closeLeaf(closeConfirm.node.id); setCloseConfirm(null) }}
          onCancel={() => setCloseConfirm(null)}
        />
      )}
    </Toolbar>
  )
}

/** One settings row: label + hint left, control right — the DNEE convention. */
function SettingRow({ label, hint, children }) {
  return (
    <div className="dnt-settings-row">
      <div>
        <div className="dnt-settings-label">{label}</div>
        {hint && <div className="dnt-settings-hint">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

/** Option picker as a NanoMenu with a check row — same shape as the notepad workspace switcher. */
function MenuPicker({ label, value, options, zh, onPick }) {
  const [menu, setMenu] = useState(null)
  const check = glyph('check')
  return (
    <span>
      <Button
        variant="outline"
        className="dnt-pick"
        aria-label={label}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setMenu({ x: r.left, y: r.bottom + 6, openedAt: Date.now() })
        }}
      >
        <span>{options.find((o) => o.value === value)?.label ?? String(value)}</span>
        {glyph('chevron')}
      </Button>
      <NanoMenu
        menu={menu}
        width={190}
        onClose={() => setMenu(null)}
        actions={options.map((o) => ({
          id: String(o.value),
          label: o.label,
          icon: o.value === value ? check : undefined,
          run: () => onPick(o.value),
        }))}
      />
    </span>
  )
}

function SettingsDialog({ copy, zh, settings, onSettings, onClose }) {
  const fontOptions = [
    { value: 'jetbrains', label: 'JetBrains Mono' },
    { value: 'sf', label: 'SF Mono' },
    { value: 'system', label: zh ? '系统等宽' : 'System mono' },
  ]
  const scrollbackOptions = [500, 2000, 10000].map((n) => ({ value: n, label: String(n) }))
  const sizeOptions = [11, 12, 13, 14, 16, 18].map((n) => ({ value: n, label: `${n}px` }))
  return (
    <NanoDialog
      copy={copy}
      title={zh ? '终端设置' : 'Terminal settings'}
      description={zh ? '字号、字体与光标即时生效；回滚行数对新窗格生效' : 'size, font & blink apply live; scrollback applies to new panes'}
      confirmLabel={zh ? '完成' : 'Done'}
      onConfirm={onClose}
      onCancel={onClose}
    >
      <SettingRow label={zh ? '字号' : 'Font size'}>
        <MenuPicker zh={zh} label={zh ? '字号' : 'Font size'} value={settings.fontSize}
          options={sizeOptions} onPick={(v) => onSettings({ fontSize: v })} />
      </SettingRow>
      <SettingRow label={zh ? '字体' : 'Font'}>
        <MenuPicker zh={zh} label={zh ? '字体' : 'Font'} value={settings.font}
          options={fontOptions} onPick={(v) => onSettings({ font: v })} />
      </SettingRow>
      <SettingRow label={zh ? '光标闪烁' : 'Cursor blink'}>
        <Switch checked={settings.blink} label={zh ? '光标闪烁' : 'Cursor blink'}
          onChange={(v) => onSettings({ blink: v })} />
      </SettingRow>
      <SettingRow label={zh ? '回滚行数' : 'Scrollback'} hint={zh ? '仅对新建窗格生效' : 'applies to new panes'}>
        <MenuPicker zh={zh} label={zh ? '回滚行数' : 'Scrollback'} value={settings.scrollback}
          options={scrollbackOptions} onPick={(v) => onSettings({ scrollback: v })} />
      </SettingRow>
    </NanoDialog>
  )
}

function PaneNode({ node, sessionId, session, focused, setFocused, split, closeLeaf, setRatio, paneSessions, zh, settings, reportStatus, style }) {
  const dragRef = useRef(null)
  if (!node) return null
  if (node.type === 'split') {
    const horizontal = node.dir === 'h' // left-right split
    const startDrag = (ev) => {
      ev.preventDefault()
      const container = ev.currentTarget.parentElement
      const rect = container.getBoundingClientRect()
      const total = horizontal ? rect.width : rect.height
      const startPos = horizontal ? ev.clientX : ev.clientY
      const startRatio = node.ratio
      const move = (e) => {
        const pos = horizontal ? e.clientX : e.clientY
        const delta = ((pos - startPos) / total)
        setRatio(node.id, Math.min(0.9, Math.max(0.1, startRatio + delta)))
      }
      const up = () => {
        window.removeEventListener('mousemove', move)
        window.removeEventListener('mouseup', up)
      }
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', up)
    }
    return (
      <div style={{
        display: 'flex', flexDirection: horizontal ? 'row' : 'column',
        flex: '1 1 0', minWidth: 0, minHeight: 0, ...style,
      }}>
        <div className="dnt-split-row" style={{ flex: `0 0 ${node.ratio * 100}%` }}>
          <PaneNode node={node.a} {...{ sessionId, session, focused, setFocused, split, closeLeaf, setRatio, paneSessions, zh, settings, reportStatus }} />
        </div>
        <div
          className="dnt-splitter"
          style={{ cursor: horizontal ? 'col-resize' : 'row-resize', zIndex: 'var(--nano-layer-local3)' }}
          onMouseDown={startDrag}
        />
        <div className="dnt-split-row">
          <PaneNode node={node.b} {...{ sessionId, session, focused, setFocused, split, closeLeaf, setRatio, paneSessions, zh, settings, reportStatus }} />
        </div>
      </div>
    )
  }
  return (
    <TermPane
      paneId={node.id}
      laneSpec={node.laneSpec}
      sessionId={sessionId}
      session={session}
      focused={focused === node.id}
      onFocus={() => setFocused(node.id)}
      onClose={() => closeLeaf(node.id)}
      onSplit={(dir, spec) => split(node.id, dir, spec)}
      paneSessions={paneSessions}
      zh={zh}
      settings={settings}
      reportStatus={reportStatus}
    />
  )
}

const OPEN_RETRIES = 3
const RETRY_BACKOFF = [400, 1200]

/** Really end a pane session (X click, retry swap, root unmount). */
function closePaneSession(rec) {
  if (!rec || rec.closed) return
  rec.closed = true
  try { rec.lane?.close() } catch { /* already gone */ }
  try { rec.canvas?.dispose() } catch { /* detached already */ }
  try { rec.term?.dispose() } catch { /* freed */ }
}
// workbench content inset: cells sit inside pane chrome, not on its edge
const PANE_PAD = { padX: 8, padY: 4 }

function TermPane({ paneId, laneSpec, sessionId, session, focused, onFocus, onClose, onSplit, paneSessions, zh, settings, reportStatus }) {
  const boxRef = useRef(null)
  const canvasHostRef = useRef(null)
  const imeRef = useRef(null)
  const [status, setStatus] = useState({ lane: laneSpec.lane, phase: 'opening', scroll: '0/0', title: '' })
  const [retrySeq, setRetrySeq] = useState(0)
  const [menuAt, setMenuAt] = useState(null)
  const stateRef = useRef({})

  useEffect(() => {
    const box = boxRef.current
    const host = canvasHostRef.current
    if (!box || !host) return
    let dead = false
    let raf = 0
    let lastViewStart = 0

    // Sessions outlive components: splitting or collapsing panes reparents a
    // leaf in the tree, React remounts TermPane, and the session must survive.
    // paneSessions is the authority — a mount attaches, only a real close kills.
    let rec = paneSessions.current.get(paneId)
    if (rec && rec.retrySeq !== retrySeq) {
      closePaneSession(rec)
      paneSessions.current.delete(paneId)
      rec = undefined
    }
    const isNew = !rec
    if (isNew) {
      const palette = buildPalette(box)
      const canvas = new TermCanvas(host, palette, fontFrom(settings), PANE_PAD)
      // 页面 wasm 与 lane 必须用同一初始几何。zsh 启动时会先打一个 `%`，再用
      // 79 个空格探测光标是否在行首，最后 `\r \r\r ESC[J` 擦掉。2×2 起步会让
      // 这些空格把 `%` 滚进历史，并把该行标成软折行；随后的 resize reflow 又
      // 把它拼回提示符前面，屏幕上就多出一个孤立的 `%`。
      const term = new WasmTerm(INITIAL_COLS, INITIAL_ROWS, settings.scrollback ?? 2000)
      const lane = makeLane(laneSpec, { cols: INITIAL_COLS, rows: INITIAL_ROWS, sessionId })
      rec = { lane, term, canvas, w: 0, h: 0, retrySeq, hooks: {}, lastStatus: { lane: laneSpec.lane, phase: 'opening', scroll: null, title: '' }, closed: false, fitState: createFitCoalescer() }
    } else {
      rec.canvas.attach(host)
      setStatus(rec.lastStatus)
    }
    const { canvas, term, lane } = rec
    rec.fitState = rec.fitState ?? createFitCoalescer()

    // status updates flow to whichever mount currently owns the pane AND to
    // the status bar's aggregate map
    const applyStatus = (fn) => {
      rec.lastStatus = fn(rec.lastStatus)
      setStatus(rec.lastStatus)
      reportStatus?.(paneId, rec.lastStatus)
    }
    let lastScrollKey = ''
    // P0 spans: one paint = wasm render + canvas blit; first paint after a key
    // press is the input→visible echo (the 14ms number from the A/B).
    const paint = () => {
      raf = 0
      const t0in = stateRef.current.keySent ?? null
      const packed = perf.span('dnt-paint', () => term.render())
      if (t0in !== null) {
        stateRef.current.keySent = null
        perf.span('dnt-echo', () => performance.now() - t0in)
      }
      if (packed) {
        // herdr：synchronized output 期间压住 request_render，半帧（含游标）不落画布。
        const syncHeld = (packed.modes & MODES.SYNC_OUTPUT) && packed.rows.length === 0
        if (!syncHeld) canvas.paint(packed)
        lastViewStart = packed.viewStart ?? 0
        // 选区层跟随视口滚动重新定位（滚动/输出移位时高亮不漂移）
        canvas.paintSelection(rec.sel?.a, rec.sel?.f, lastViewStart, contentCols)
        positionIme()
        const total = term.totalLines()
        const key = `${total}/${lastViewStart}/${canvas.rows}`
        if (key !== lastScrollKey) {
          lastScrollKey = key
          applyStatus((s) => ({ ...s, scroll: { total, viewStart: lastViewStart, rows: canvas.rows } }))
        }
        const title = term.title()
        if (title) applyStatus((s) => ({ ...s, title: stripSpinner(title).slice(0, 60) }))
        // OSC 7501: program-reported state polled at paint cadence — the core
        // never guesses from the screen (herdr-core rule)
        const st = term.state?.()
        if (st && st.seq !== stateRef.current.stateSeq) {
          stateRef.current.stateSeq = st.seq
          applyStatus((s) => ({ ...s, prog: st.root ? { state: st.root.state, kind: st.root.kind, app: st.root.app, msg: st.root.msg, progress: st.root.progress } : null }))
        }
      }
    }
    // W-P1-4 / P2: unfocused panes used to paint at a fixed ~2Hz timer, so
    // active output (flood/scroll) starved the canvas for ~500ms. Now: an
    // unfocused pane still paints at rAF while bytes are actually arriving
    // (`activeUntil`), and only steps down to 500→1000ms back-off when the
    // stream has been quiet. Focus is read live from data-focused.
    const schedulePaint = () => {
      if (raf) return
      const focused = boxRef.current?.dataset?.focused !== 'false'
      const active = performance.now() < (stateRef.current.activeUntil ?? 0)
      if (focused || active) {
        raf = requestAnimationFrame(paint)
        if (stateRef.current.slowTimer) {
          clearTimeout(stateRef.current.slowTimer)
          stateRef.current.slowTimer = null
        }
      } else if (!stateRef.current.slowTimer) {
        // idle pane: back off 500 → 1000ms between checks
        let delay = 500
        const tick = () => {
          if (raf) return
          paint()
          delay = Math.min(delay * 2, 1000)
          stateRef.current.slowTimer = setTimeout(tick, delay)
        }
        stateRef.current.slowTimer = setTimeout(tick, delay)
      }
    }
    rec.hooks.schedulePaint = schedulePaint
    rec.hooks.applyStatus = applyStatus

    lane.onOutput = (bytes) => {
      // P2: data flowing = the pane is alive — keep rAF paints while unfocused
      // instead of dropping straight to the back-off timer (was the ~650ms
      // flood/scroll latency from the fixed 500ms slowTimer).
      stateRef.current.activeUntil = performance.now() + 1500
      outputDuringGap({
        gapMs: Date.now() - (stateRef.current.beatAt || Date.now()),
        bytes,
        requestAlign: () => lane.requestAlign(),
        write: (data) => {
          term.write(data)
          const reply = term.drainReply()
          // terminal auto-replies bypass the host input gate — they are not human
          // activity and must never reset the draft/quiet timers (hc rule)
          if (reply.length) (lane.writeAuto ?? lane.write).call(lane, reply)
        },
        after: () => rec.hooks.schedulePaint?.(),
      })
    }
    // 对齐帧整屏替换，不走 onOutput，避免把 dump 当 PTY 字节再解析一遍。
    lane.onAlign = (snap) => {
      if (snap.cols >= 2 && snap.rows >= 1) {
        if (resizeMode(lane.platform) === 'box') term.resizeBox(snap.cols, snap.rows)
        else term.resize(snap.cols, snap.rows)
      }
      term.replaceVisible(snap.text, snap.cursorX, snap.cursorY)
      paintCurrent({ invalidate: () => term.invalidate(), paint })
    }
    lane.onExit = () => {
      term.dead()
      rec.hooks.applyStatus?.((s) => ({ ...s, phase: 'exited' }))
    }
    lane.onReady = () => {
      perf.count('dnt-panes')
      rec.hooks.applyStatus?.((s) => ({ ...s, phase: 'live' }))
      saveLayouts() // the pane now has a host addr — persist it for re-attach
    }

    // 一帧里的列数抖动收成一次。和上次提交给 PTY 的尺寸相同就不再 lane.resize。
    const fitQueue = { handle: 0 }
    const applyFit = () => {
      const dprChanged = canvas.syncDpr()
      const rect = host.getBoundingClientRect()
      const dims = paneSessions.current.get(paneId)
      if (dims) { dims.w = rect.width; dims.h = rect.height }
      const cols = Math.max(4, Math.floor((rect.width - canvas.padX * 2) / canvas.charW))
      const rows = Math.max(2, Math.floor((rect.height - canvas.padY) / canvas.charH))
      noteFit(rec.fitState, cols, rows)
      const commit = flushFit(rec.fitState)
      const resized = canvas.fit(cols, rows)
      if (commit) {
        if (resizeMode(lane.platform) === 'box') term.resizeBox(commit.cols, commit.rows)
        else term.resize(commit.cols, commit.rows)
        lane.resize(commit.cols, commit.rows)
        applyStatus((s) => ({ ...s, dims: { cols: commit.cols, rows: commit.rows } }))
      }
      if (resized || dprChanged) {
        canvas.clearAll()
        term.invalidate()
      }
      schedulePaint()
    }
    const fit = () => {
      queueFrame(fitQueue, (run) => requestAnimationFrame(run), () => {
        if (dead) return
        applyFit()
      })
    }
    const ro = new ResizeObserver(fit)
    ro.observe(host)
    fit()

    // input
    const keydown = (ev) => {
      // IME composition owns the key stream until compositionend — forwarding
      // its navigation keys (candidate selection, Esc-cancel, arrows between
      // segments) into the pty corrupts both the preedit and the program.
      if (ev.isComposing || ev.keyCode === 229) return
      // ⌘C 复制当前选区（选区存在时不该落到程序手里）
      if (ev.metaKey && ev.key === 'c' && rec.sel) {
        ev.preventDefault(); ev.stopPropagation()
        copySel(false)
        return
      }
      // Esc 清选区/退出 copy-mode 残留高亮；无选区时放行给程序（vim 需要）
      if (ev.key === 'Escape' && rec.sel && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
        ev.preventDefault(); ev.stopPropagation()
        setSel(null)
        return
      }
      // ctrl+alt prefix family (herdr least-conflicting set): copy-mode,
      // split, next-pane — intercepted before the program sees them.
      if (ev.ctrlKey && ev.altKey) {
        const k = ev.key.toLowerCase()
        if (k === 'c') {
          ev.preventDefault(); ev.stopPropagation()
          if (!stateRef.current.copyMode) {
            stateRef.current.copyMode = copyMode({
              box, term, lane,
              onCopy: (t) => { navigator.clipboard?.writeText(t).catch(() => {}) },
              onHint: (h) => applyStatus((s) => ({ ...s, hint: h })),
            })
          }
          return
        }
        if (k === '\\' || k === '|') { ev.preventDefault(); ev.stopPropagation(); onSplit('h'); return }
        if (k === '-') { ev.preventDefault(); ev.stopPropagation(); onSplit('v'); return }
        if (k === 'w') { ev.preventDefault(); ev.stopPropagation(); onClose(); return }
      }
      const data = encodeKey(ev, term.modes())
      if (data?.length) {
        stateRef.current.keySent = performance.now()
        lane.write(data)
        term.scrollBottom()
        schedulePaint()
        ev.preventDefault()
        ev.stopPropagation()
      } else if (ev.key.length === 1 || ev.key === 'Backspace' || ev.key === 'Enter' || ev.key === 'Tab') {
        ev.stopPropagation()
      }
    }
    const paste = (ev) => {
      const text = ev.clipboardData?.getData('text/plain')
      if (text) {
        stateRef.current.keySent = performance.now()
        lane.write(encodePaste(text, term.modes()))
        ev.preventDefault()
      }
    }
    const wheel = (ev) => {
      ev.preventDefault()
      // deltaY>0 (scroll down) should move toward the live tail: decrease offset
      const delta = Math.abs(ev.deltaY) > 60 ? Math.sign(ev.deltaY) * 8 : Math.sign(ev.deltaY) * 3
      term.scroll(-delta)
      schedulePaint()
    }
    const cellAt = (ev) => {
      const rect = host.getBoundingClientRect()
      return {
        x: Math.max(0, Math.min(term.cols - 1, Math.floor((ev.clientX - rect.left - canvas.padX) / canvas.charW))),
        y: Math.max(0, Math.min(canvas.rows - 1, Math.floor((ev.clientY - rect.top - canvas.padY) / canvas.charH))),
      }
    }
    // —— 鼠标选区（tmux/xterm 语义）——
    // 普通终端：左键拖拽 = 选中文本；Shift 永远强制本地选取（程序接管鼠标时
    // 也保证能复制）。松开自动复制（tmux copy-on-select），高亮保留到 Esc/
    // 下一次点击。行索引用 buffer 绝对行（viewStart + 屏幕行），滚动后仍对。
    const mouseCaptured = () => !!(term.modes() & (MODES.MOUSE_CLICK | MODES.MOUSE_BTN_MOTION | MODES.MOUSE_ANY_MOTION))
    const absCell = (ev) => { const { x, y } = cellAt(ev); return { line: lastViewStart + y, col: x } }
    const contentCols = (line) => term.lineCols?.(line) ?? term.cols
    const setSel = (a, f) => {
      rec.selRaw = a && f ? { a, f } : null
      rec.sel = rec.selRaw ? clampSelection(a, f, contentCols, term.cols) : null
      if (!rec.sel) term.selectClear?.()
      canvas.paintSelection(rec.sel?.a, rec.sel?.f, lastViewStart, contentCols)
    }
    const selText = () => {
      const s = rec.sel
      if (!s) return ''
      // 起点/终点按 (line,col) 元组归一化——同行反向拖选也能拿到正序区间
      const [a, f] = (s.a.line < s.f.line || (s.a.line === s.f.line && s.a.col <= s.f.col)) ? [s.a, s.f] : [s.f, s.a]
      return term.selectText?.(a.line, f.line, a.col, f.col) ?? ''
    }
    const copySel = (quiet) => {
      const text = selText()
      if (!text) return
      navigator.clipboard?.writeText(text).then(() => {
        if (!quiet) applyStatus((s) => ({ ...s, hint: zh ? `已复制 ${text.length} 字符` : `copied ${text.length} chars` }))
      }).catch(() => {
        applyStatus((s) => ({ ...s, hint: zh ? '复制失败（剪贴板不可用）' : 'copy failed (clipboard unavailable)' }))
      })
    }
    const drag = { on: false, moved: false, detach: null, anchor: null }
    const endDrag = (ev) => {
      drag.detach?.(); drag.detach = null
      if (!drag.on) return
      drag.on = false
      // 单击不是选区：清掉上一次的高亮（shift+click 延伸选区除外）
      if (!drag.moved) { if (!ev?.shiftKey) setSel(null); return }
      if (!rec.sel) return
      // tmux 风格：拖选松开即复制；高亮保留作视觉反馈，Esc/再点清除
      copySel(false)
      ev?.preventDefault()
    }
    const dragMove = (ev) => {
      if (!drag.on) return
      const f = absCell(ev)
      if (!drag.moved) {
        // 同一格内的抖动不算拖拽：单击不应该留下一个格子的高亮
        if (f.line === drag.anchor.line && f.col === drag.anchor.col) return
        drag.moved = true
        ev.preventDefault() // 阻止默认拖拽，避免把 pane 当文本拖走
      }
      setSel(drag.anchor, f)
    }
    const beginDrag = () => {
      const mm = (e) => dragMove(e)
      const mu = (e) => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); endDrag(e) }
      window.addEventListener('mousemove', mm)
      window.addEventListener('mouseup', mu)
      drag.detach = () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu) }
    }
    const mousedown = (ev) => {
      onFocus()
      imeRef.current?.focus()
      const { x, y } = cellAt(ev)
      const captured = mouseCaptured()
      // 本地选取优先：未被程序接管鼠标时左键始终可选取；被接管时用 Shift 绕过
      if (ev.button === 0 && (!captured || ev.shiftKey)) {
        ev.preventDefault()
        drag.on = true
        drag.moved = false
        const a = absCell(ev)
        // shift+click 从原锚点延伸；普通按下先清旧高亮，真拖动才建立选区
        drag.anchor = ev.shiftKey && rec.selRaw ? rec.selRaw.a : a
        setSel(ev.shiftKey && rec.selRaw ? drag.anchor : null, ev.shiftKey && rec.selRaw ? a : null)
        beginDrag()
        return
      }
      const data = encodeMouse(term.modes(), { btn: ev.button, x, y, release: false, shift: ev.shiftKey, alt: ev.altKey, ctrl: ev.ctrlKey })
      if (data) { lane.write(data); ev.preventDefault() }
    }
    const mouseup = (ev) => {
      const { x, y } = cellAt(ev)
      const data = encodeMouse(term.modes(), { btn: ev.button, x, y, release: true, shift: ev.shiftKey, alt: ev.altKey, ctrl: ev.ctrlKey })
      if (data) lane.write(data)
    }
    const mousemove = (ev) => {
      if (!(ev.buttons & 1) || drag.on) return
      const { x, y } = cellAt(ev)
      const data = encodeMouse(term.modes(), { btn: 32, x, y, release: false, shift: ev.shiftKey, alt: ev.altKey, ctrl: ev.ctrlKey })
      if (data) lane.write(data)
    }
    const focusin = () => {
      // 重新拿到焦点时把 wasm 里已经当前的网格画出来，不等 500ms。
      if (shouldRepaintNow({ becameFocused: true })) paintCurrent({ invalidate: () => term.invalidate(), paint })
      const d = encodeFocus(term.modes(), true)
      if (d) lane.write(d)
    }
    const onVis = () => {
      if (!shouldRepaintNow({ becameVisible: document.visibilityState === 'visible' })) return
      paintCurrent({ invalidate: () => term.invalidate(), paint })
    }
    // 定时器缺口说明页面被冻过。回来时丢掉积压，对齐宿主镜像，不要快进。
    stateRef.current.beatAt = Date.now()
    const beat = setInterval(() => {
      // 拖到另一块屏、或只改像素密度不改布局时，ResizeObserver 和 matchMedia
      // 都可能不响。这里每秒对一次 dpr，保证画布 backing 跟得上，不被浏览器拉伸。
      if (canvas.syncDpr()) fit()
      const now = Date.now()
      const gap = now - (stateRef.current.beatAt || now)
      stateRef.current.beatAt = now
      if (freezeGap(gap)) lane.requestAlign()
    }, 1000)
    const onResume = () => lane.requestAlign()
    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('resume', onResume)
    const stopDpr = watchDevicePixelRatio(() => { if (canvas.syncDpr()) fit() })
    // 浏览器缩放会改 dpr；matchMedia 在部分浏览器/缩放下不报，resize 一定会报。
    const onWinResize = () => fit()
    window.addEventListener('resize', onWinResize)
    const focusout = () => { const d = encodeFocus(term.modes(), false); if (d) lane.write(d) }
    // right-click = menu (herdr right_click=menu default): paste, copy-mode,
    // split, close — rendered by the pane header menu owner, not the program.
    const contextmenu = (ev) => {
      ev.preventDefault()
      onFocus()
      imeRef.current?.focus()
      setMenuAt({ x: ev.clientX, y: ev.clientY })
    }

    // IME 输入面：composition 事件只在可编辑元素上触发——裸 div + tabIndex
    // 永远收不到 CJK 提交。隐藏 textarea 跟随光标 cell，让输入法候选窗落
    // 在正在打字的位置；普通键仍走 keydown（preventDefault 挡住字面量进入
    // 此框），dead-key/OSK/听写这类没经 keydown 的文本经 input 兜底提交。
    const ime = document.createElement('textarea')
    ime.className = 'dnt-ime'
    ime.dataset.dntIme = '1'
    ime.setAttribute('aria-label', zh ? '终端输入' : 'terminal input')
    ime.setAttribute('autocapitalize', 'off')
    ime.setAttribute('autocomplete', 'off')
    ime.setAttribute('autocorrect', 'off')
    ime.setAttribute('spellcheck', 'false')
    ime.tabIndex = -1
    host.appendChild(ime)
    imeRef.current = ime
    const positionIme = () => {
      const cw = canvas.charW || 8
      const ch = canvas.charH || 16
      const col = Math.max(0, Math.min((canvas.cols || 1) - 1, canvas.cursorX ?? 0))
      const row = Math.max(0, Math.min((canvas.rows || 1) - 1, canvas.cursorRow ?? 0))
      ime.style.left = `${canvas.padX + col * cw}px`
      ime.style.top = `${canvas.padY + row * ch}px`
      ime.style.width = `${Math.ceil(cw * 2)}px`
      ime.style.height = `${Math.ceil(ch)}px`
    }
    const commitText = (text) => {
      if (!text) return
      stateRef.current.keySent = performance.now()
      lane.write(encodeText(text))
      term.scrollBottom()
      schedulePaint()
    }
    const imeInput = (ev) => {
      // 非组合文本落地（dead key 闭合、屏上键盘、听写）；组合中输入法自管。
      if (ev.isComposing || !ime.value) return
      commitText(ime.value)
      ime.value = ''
    }
    const imeCompositionStart = () => {
      // 先清残留：异常终止的上一段预编辑不该混进这一次的提交里。
      ime.value = ''
    }
    const imeCompositionEnd = (ev) => {
      commitText(typeof ev.data === 'string' && ev.data !== '' ? ev.data : ime.value)
      ime.value = ''
    }
    ime.addEventListener('input', imeInput)
    ime.addEventListener('compositionstart', imeCompositionStart)
    ime.addEventListener('compositionend', imeCompositionEnd)
    positionIme()

    box.addEventListener('keydown', keydown)
    box.addEventListener('paste', paste)
    box.addEventListener('wheel', wheel, { passive: false })
    box.addEventListener('contextmenu', contextmenu)
    host.addEventListener('mousedown', mousedown)
    host.addEventListener('mouseup', mouseup)
    host.addEventListener('mousemove', mousemove)
    box.addEventListener('focusin', focusin)
    box.addEventListener('focusout', focusout)

    // bounded retry: a pane opened while the host is restarting should
    // recover on its own instead of pinning a dead error state
    if (isNew) {
      void (async () => {
        let lastErr = null
        for (let attempt = 0; attempt < OPEN_RETRIES; attempt += 1) {
          try {
            await perf.span('dnt-attach', () => lane.open())
            return
          } catch (e) {
            lastErr = e
            if (dead || attempt === OPEN_RETRIES - 1) break
            applyStatus((s) => ({ ...s, phase: 'opening', title: `open retry ${attempt + 2}/${OPEN_RETRIES}` }))
            await new Promise((r) => setTimeout(r, RETRY_BACKOFF[attempt] ?? 1200))
          }
        }
        if (dead) return
        const msg = String(lastErr?.message ?? lastErr ?? 'open failed')
        applyStatus((s) => ({ ...s, phase: 'error', title: msg }))
      })()

      canvas.setBlink(settings.blink)
      canvas.startBlink(() => term.modes())

      paneSessions.current.set(paneId, rec)
    } else {
      // reattach: blink/repaint wiring survived on the canvas; restart it here
      canvas.startBlink(() => term.modes())
      reportStatus?.(paneId, rec.lastStatus)
      schedulePaint()
    }
    // bind to THIS mount's host/fit — a remount hands the session a new host
    // element, so reconfigure must be refreshed on every mount, not just first.
    rec.reconfigure = (next) => {
      canvas.setFont(fontFrom(next))
      canvas.setBlink(next.blink)
      // 字体度量变了但列数可能不变。render() 只吐脏行，不整帧的话旧字形留在画布上。
      // herdr 在这种拿不准的时候整帧重画。
      term.invalidate()
      fit()
      schedulePaint()
    }
    fit()

    return () => {
      dead = true
      cancelAnimationFrame(raf)
      cancelAnimationFrame(fitQueue.handle)
      clearTimeout(stateRef.current.slowTimer)
      clearInterval(beat)
      stateRef.current.slowTimer = null
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('resume', onResume)
      window.removeEventListener('resize', onWinResize)
      stopDpr()
      ro.disconnect()
      box.removeEventListener('keydown', keydown)
      box.removeEventListener('paste', paste)
      box.removeEventListener('wheel', wheel)
      host.removeEventListener('mousedown', mousedown)
      host.removeEventListener('mouseup', mouseup)
      host.removeEventListener('mousemove', mousemove)
      box.removeEventListener('focusin', focusin)
      box.removeEventListener('focusout', focusout)
      ime.removeEventListener('input', imeInput)
      ime.removeEventListener('compositionstart', imeCompositionStart)
      ime.removeEventListener('compositionend', imeCompositionEnd)
      ime.remove()
      imeRef.current = null
      rec.hooks.schedulePaint = undefined
      rec.hooks.applyStatus = undefined
      stateRef.current.copyMode?.()
      stateRef.current.copyMode = null
      // 拖拽中的 window 级监听与选区层随挂载清理；rec.sel 保留在 session
      // 记录上（split remount 恢复高亮是刻意的）
      drag.detach?.()
      // unmount ≠ close: hidden / 失焦 / 慢绘制都不释放。关窗格和插件卸载才走 closePaneSession。
      canvas.detach()
      if (unmountAction({
        hidden: typeof document !== 'undefined' && document.hidden,
        focused: box.dataset.focused !== 'false',
      }) === 'release') closePaneSession(rec)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId, laneSpec.lane, laneSpec.url, retrySeq])

  // React `focused`（窗格 chrome 状态）与 DOM focus 必须一致——新建或被聚
  // 焦的窗格要在第一次击键前就持有键盘；终端只在 focused pane 的 box 上
  // 消费键事件，不主动 focus() 会让击键落到 body 被宿主吞掉。
  useEffect(() => {
    if (focused) (imeRef.current ?? boxRef.current)?.focus()
  }, [focused])

  // five-level state (W-P0-6): lifecycle phase {opening,live,exited,error}
  // overlaid by the program's own OSC 7501 report {idle,working,blocked,done};
  // blocked carries kind=permission|question|auth for the caller to act on.
  const eff = effState(status)
  const phaseDot = { opening: 'ongoing', live: 'done', exited: 'idle', error: 'error', working: 'ongoing', blocked: 'error', done: 'done', idle: 'idle' }
  const laneText = { local: 'LOCAL', mcp: 'MCP' }
  return (
    <div
      ref={boxRef}
      tabIndex={0}
      onFocus={onFocus}
      className="dnt-pane"
      data-dnt-pane={paneId}
      data-focused={focused ? 'true' : 'false'}
    >
      <div className="dnt-header">
        <StateDot state={phaseDot[eff] ?? 'idle'} />
        <Tag tone="outline">{laneText[laneSpec.lane] ?? laneSpec.lane}</Tag>
        {status.prog?.state && status.prog.state !== 'idle' && (
          <Tag tone={status.prog.state === 'blocked' ? 'warn' : 'info'}>{status.prog.state === 'blocked' ? (status.prog.kind ?? 'blocked') : status.prog.state}</Tag>
        )}
        <span className="dnt-title">{status.title || (status.phase === 'error' ? (zh ? '连接失败' : 'open failed') : '')}</span>
        <span className="dnt-scroll-lines">{status.scroll?.total ? `${status.scroll.total}ln` : ''}</span>
        <span className="dnt-header-actions">
          {(status.phase === 'error' || status.phase === 'exited') && (
            <button type="button" className="dnt-toolbtn" onClick={(e) => { e.stopPropagation(); setRetrySeq((n) => n + 1) }}
              aria-label={zh ? '重试连接' : 'retry connection'} title={zh ? '重试连接' : 'retry connection'}>
              {glyph('retry')}
            </button>
          )}
          <button type="button" className="dnt-toolbtn dnt-hide-narrow" onClick={(e) => { e.stopPropagation(); onSplit('h') }}
            aria-label={zh ? '向右分屏' : 'split right'} title={zh ? '向右分屏' : 'split right'}>{glyph('splitRight')}</button>
          <button type="button" className="dnt-toolbtn dnt-hide-narrow" onClick={(e) => { e.stopPropagation(); onSplit('v') }}
            aria-label={zh ? '向下分屏' : 'split down'} title={zh ? '向下分屏' : 'split down'}>{glyph('splitDown', true)}</button>
          <button type="button" className="dnt-toolbtn" onClick={(e) => { e.stopPropagation(); onClose() }}
            aria-label={zh ? '关闭' : 'close pane'} title={zh ? '关闭' : 'close pane'}>{glyph('close')}</button>
        </span>
      </div>
      <div ref={canvasHostRef} className="dnt-canvas-host" />
      {status.hint && <span className="dnt-copy-hint">{status.hint}</span>}
      <Scrollbar status={status} />
      {menuAt && (
        <NanoMenu
          menu={menuAt}
          onClose={() => setMenuAt(null)}
          width={190}
          actions={[
            { id: 'paste', label: zh ? '粘贴' : 'Paste', icon: glyph('paste'), run: async () => { const rec = paneSessions.current.get(paneId); const t = await navigator.clipboard?.readText?.().catch(() => '') ; if (t) rec?.lane?.write(encodePaste(t, rec.term.modes())) } },
            { id: 'copy', label: zh ? '复制选区' : 'Copy selection', icon: glyph('copy'), run: () => { const rec = paneSessions.current.get(paneId); const s = rec?.sel; if (s) { const [a, f] = (s.a.line < s.f.line || (s.a.line === s.f.line && s.a.col <= s.f.col)) ? [s.a, s.f] : [s.f, s.a]; const t = rec.term.selectText?.(a.line, f.line, a.col, f.col); if (t) navigator.clipboard?.writeText(t).catch(() => {}) } } },
            { id: 'copymode', label: zh ? '复制模式 (⌃⌥C)' : 'Copy mode (⌃⌥C)', icon: glyph('copy'), run: () => boxRef.current?.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, altKey: true, bubbles: true })) },
            { id: 'splith', label: zh ? '向右分屏' : 'Split right', icon: glyph('splitRight'), run: () => onSplit('h') },
            { id: 'splitv', label: zh ? '向下分屏' : 'Split down', icon: glyph('splitDown'), run: () => onSplit('v') },
            { id: 'close', label: zh ? '关闭窗格' : 'Close pane', icon: glyph('close'), run: () => onClose() },
          ]}
        />
      )}
      {status.phase === 'error' && (
        <div className="dnt-overlay" role="alert">
          {glyph('warn')}
          <span className="dnt-overlay-title">{zh ? '通道连接失败' : 'lane connection failed'}</span>
          <span className="dnt-overlay-msg" title={status.title}>{status.title}</span>
          <Button variant="outline" size="sm"
            onClick={(e) => { e.stopPropagation(); setRetrySeq((n) => n + 1) }}>
            {glyph('retry')}
            {zh ? '重试' : 'retry'}
          </Button>
        </div>
      )}
    </div>
  )
}

function Scrollbar({ status }) {
  // proportional thumb: fraction = viewStart / (total - rows), height ∝ rows/total
  const s = status.scroll
  if (!s || !s.total || s.total <= s.rows) return null
  const ratio = Math.min(1, s.rows / s.total)
  const maxStart = Math.max(1, s.total - s.rows)
  const top = Math.min(1, s.viewStart / maxStart)
  return (
    <div className="dnt-scrollbar-track">
      <div className="dnt-scrollbar-thumb" style={{
        height: `${Math.max(12, ratio * 100)}%`,
        top: `${top * (100 - Math.max(12, ratio * 100))}%`,
      }} />
    </div>
  )
}
