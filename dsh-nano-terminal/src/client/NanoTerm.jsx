// NanoTerm: the terminal tab body — a binary split tree of independent panes.
// Each pane = wasm emulator + canvas renderer + one lane (local/mcp).

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { copyMode, clampSelection } from './select.js'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoDialog, NanoMenu, NANO_STYLES, Toolbar } from 'dsh-nano-ui'

const { Button, Input, Switch, StateDot, Tag, ShortcutKeys } = primitives
import { loadCore, WasmTerm, MODES } from './wasm.js'
import { TermCanvas, buildPalette } from './render.js'
import { encodeKey, encodePaste, encodeMouse, encodeFocus } from './keys.js'
import { makeLane } from './lanes.js'
import {
  unmountAction, freezeGap, shouldRepaintNow, createFitCoalescer, noteFit, flushFit, resizeMode, watchDevicePixelRatio,
  applyTerminalOutput, outputDuringGap, paintCurrent, queueFrame,
} from './keep-alive.js'

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
/* Status bar row = nano-ui Toolbar (.nano-toolbar) plus the local classes below:
   identity + lane rollup on the left, actions and the pane-title filter right.
   Every color is a host token; no host toolbar class is borrowed.
   高度锁 36px：nano-toolbar 的 min-height 是 36，旧的 32 会把这一行压得比
   轨迹栏矮。左右 12px，和轨迹栏的内容边距对齐，不再吃 nano-space-2 的 8px。 */
.dnt-bar{box-sizing:border-box;flex:none;width:100%;height:36px;min-height:36px;max-height:36px;flex-wrap:nowrap;padding:0 12px;gap:8px;font:inherit}
.dnt-bar-group{display:flex;align-items:center;gap:2px;min-width:0;flex:0 1 auto;overflow:hidden}
.dnt-bar-btn{display:inline-flex;align-items:center;gap:4px;height:24px;min-width:0;padding:0 6px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer}
.dnt-bar-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dnt-bar-btn:focus-visible{outline:2px solid var(--dsw-focus-ring-color);outline-offset:1px}
.dnt-bar-icon{display:inline-flex;flex:none;color:currentColor}
.dnt-bar-icon svg{width:14px;height:14px}
.dnt-bar-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dnt-bar-search{display:flex;align-items:center;gap:4px;margin-left:auto;flex:0 1 200px;min-width:96px}
.dnt-bar-input{flex:1 1 auto;min-width:0;height:24px;padding:0 6px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit}
.dnt-bar-input:focus-visible{outline:2px solid var(--dsw-focus-ring-color);outline-offset:1px}
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
.dnt-help-list{display:flex;flex-direction:column;gap:7px;margin:4px 0 0;color:var(--dsw-alias-label-secondary)}
.dnt-help-list kbd{font-family:ui-monospace,monospace;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:3px;padding:0 5px;color:var(--dsw-alias-label-secondary)}
.dnt-empty{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px;padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
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
    go: primitives.IconRightUpOutlineRegular,
    close: primitives.IconCloseOutlineRegular,
    retry: primitives.IconRefreshOutlineRegular,
    warn: primitives.IconWarningOutlineRegular,
    help: primitives.IconQuestionOutlineRegular,
    settings: primitives.IconSettingsOutlineRegular,
    check: primitives.IconCheckOutlineRegular,
    chevron: primitives.IconChevronDownOutlineRegular,
    add: primitives.IconPlusOutlineRegular,
    terminal: primitives.IconCodeOutlineRegular,
    copy: primitives.IconCopyOutlineRegular,
    paste: primitives.IconCopyOutlineRegular,
    search: primitives.IconSearchOutlineRegular,
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

function leaf(laneSpec = { lane: 'local' }) {
  return { type: 'leaf', id: 'p' + paneSeq++, laneSpec }
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
    s = { tree: saved ?? null, sessions: new Map() }
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
    <div ref={rootRef} className="dnt-root" data-nano-terminal>
      <StatusBar sessionId={sessionId} split={split} openLeaf={openLeaf} focused={focused} zh={zh} tree={tree} paneSessions={paneSessions} statuses={statuses} settings={settings} onSettings={updateSettings} />
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

function firstLeaf(node) {
  if (!node) return null
  return node.type === 'leaf' ? node.id : firstLeaf(node.a) ?? firstLeaf(node.b)
}

function leafIds(node, out = []) {
  if (!node) return out
  if (node.type === 'leaf') out.push(node.id)
  else { leafIds(node.a, out); leafIds(node.b, out) }
  return out
}

/** Top status bar: 轨迹 toolbar convention — identity + lane status left, controls right. */
function StatusBar({ sessionId, split, openLeaf, focused, zh, tree, paneSessions, statuses, settings, onSettings }) {
  const [mcpUrl, setMcpUrl] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [dialog, setDialog] = useState(null) // 'mcp' | 'help' | 'settings'
  const [menu, setMenu] = useState(null)
  const target = focused ?? firstLeaf(tree)
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
  const copy = { cancel: zh ? '取消' : 'Cancel', confirm: zh ? '确定' : 'OK', close: zh ? '关闭' : 'Close' }

  const count = Object.keys(statuses).length
  const cur = focused ? statuses[focused] : (target ? statuses[target] : undefined)
  // rollup (herdr convention): counts of program states bubble to the bar so
  // the owner sees "2 working · 1 blocked" without opening panes
  const rollup = Object.values(statuses).reduce((acc, s) => {
    const e = effState(s)
    acc[e] = (acc[e] ?? 0) + 1
    return acc
  }, {})
  const phaseDot = { opening: 'ongoing', live: 'done', exited: 'idle', error: 'error', working: 'ongoing', blocked: 'error', done: 'done', idle: 'idle' }
  const phaseText = { opening: zh ? '连接中' : 'connecting', live: zh ? '运行中' : 'live', exited: zh ? '已退出' : 'exited', error: zh ? '失败' : 'failed', working: zh ? '工作中' : 'working', blocked: zh ? '待处理' : 'blocked', done: zh ? '已完成' : 'done', idle: zh ? '空闲' : 'idle' }
  const laneText = { local: 'LOCAL', mcp: 'MCP' }
  // status bar row: identity + lane rollup left, action buttons and the
  // pane-title filter right, inside nano-ui `Toolbar` (host toolbar is not
  // exported). Icons come from the host icon set through glyph().
  const eff = effState(cur)
  const rollText = [rollup.working && `${rollup.working}${zh ? ' 工作' : 'w'}`, rollup.blocked && `${rollup.blocked}${zh ? ' 待处理' : 'blk'}`].filter(Boolean).join(' · ')
  const statSummary = cur
    ? `${laneText[cur.lane] ?? cur.lane} · ${count}${zh ? ' 窗格' : ' panes'}${cur.dims ? ` · ${cur.dims.cols}×${cur.dims.rows}` : ''} · ${phaseText[eff] ?? eff}${rollText ? ` · ${rollText}` : ''}`
    : null
  // Enter jumps to the next pane whose title contains the query (wrapping
  // past the focused one); DOM focus drives the pane's own onFocus so React
  // focus state and keyboard ownership stay in step.
  const jumpToPane = (e) => {
    if (e.key === 'Escape') { setFilterQuery(''); return }
    if (e.key !== 'Enter') return
    e.preventDefault()
    const q = filterQuery.trim().toLowerCase()
    if (!q) return
    const ids = leafIds(tree)
    const start = ids.indexOf(focused) + 1
    const order = [...ids.slice(start), ...ids.slice(0, start)]
    const hit = order.find((id) => (statuses[id]?.title ?? '').toLowerCase().includes(q))
    if (!hit) return
    const root = e.currentTarget.closest('[data-nano-terminal]')
    root?.querySelector(`[data-dnt-pane="${hit}"]`)?.focus()
  }
  return (
    <Toolbar label={zh ? '终端状态栏' : 'terminal status bar'} className="dnt-bar">
      <div className="dnt-bar-group">
        <button type="button" className="dnt-bar-btn" aria-label={zh ? '当前终端状态' : 'current terminal status'} title={statSummary ?? (zh ? '尚无窗格' : 'no panes')}>
          <span className="dnt-bar-icon" aria-hidden="true">{glyph('terminal')}</span>
          <span className="dnt-bar-label">{zh ? 'Nano 终端' : 'Nano Terminal'}</span>
        </button>
        {count > 0 && cur && (
          <button type="button" className="dnt-bar-btn" aria-label={zh ? '窗格与通道' : 'panes and lane'} title={cur.title ?? statSummary}>
            <StateDot state={phaseDot[eff] ?? 'idle'} />
            <span className="dnt-bar-label">{statSummary}</span>
          </button>
        )}
        <button type="button" className="dnt-bar-btn" aria-label={zh ? '新建窗格' : 'new pane'} title={zh ? '新建窗格' : 'new pane'} onClick={openMenu}>
          <span className="dnt-bar-icon" aria-hidden="true">{glyph('add')}</span>
          <span className="dnt-bar-label">{zh ? '新建' : 'New'}</span>
        </button>
        <button type="button" className="dnt-bar-btn" aria-label={zh ? '快捷键与说明' : 'shortcuts'} title={zh ? '快捷键与说明' : 'shortcuts'} onClick={() => setDialog('help')}>
          <span className="dnt-bar-icon" aria-hidden="true">{glyph('help')}</span>
        </button>
        <button type="button" className="dnt-bar-btn" aria-label={zh ? '终端设置' : 'terminal settings'} title={zh ? '终端设置' : 'terminal settings'} onClick={() => setDialog('settings')}>
          <span className="dnt-bar-icon" aria-hidden="true">{glyph('settings')}</span>
        </button>
      </div>
      <div className="dnt-bar-search">
        <span className="dnt-bar-icon" aria-hidden="true">{glyph('search')}</span>
        <input
          type="search"
          className="dnt-bar-input"
          aria-label={zh ? '窗格标题' : 'pane title'}
          placeholder={zh ? '窗格标题…' : 'pane title…'}
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.currentTarget.value)}
          onKeyDown={jumpToPane}
        />
      </div>
      <NanoMenu menu={menu} actions={laneActions} onClose={() => setMenu(null)} width={200} />
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
      {dialog === 'help' && (
        <NanoDialog
          copy={copy}
          title={zh ? '用法与快捷键' : 'Usage & shortcuts'}
          confirmLabel={zh ? '知道了' : 'Got it'}
          onConfirm={() => setDialog(null)}
          onCancel={() => setDialog(null)}
        >
          <div className="dnt-help-list">
            <span>{zh ? '每个窗格是一个独立实例（session）' : 'each pane is an independent instance'}</span>
            <span><ShortcutKeys keys={[zh ? '滚轮' : 'wheel']} /> {zh ? '翻页滚动 scrollback' : 'scroll scrollback'}</span>
            <span><ShortcutKeys keys={['⌘', 'V']} /> {zh ? '粘贴到当前窗格' : 'paste into focused pane'}</span>
            <span><ShortcutKeys keys={['⌘', 'E', '→', 'T']} /> {zh ? '切换到本视图/切回对话' : 'toggle this view / back to chat'}</span>
            <span><ShortcutKeys keys={[zh ? '拖拽边' : 'drag edge']} /> {zh ? '调整窗格比例' : 'resize panes'}</span>
            <span><ShortcutKeys keys={[zh ? '点击' : 'click']} /> {zh ? '聚焦窗格（品牌描边）' : 'focus pane (brand border)'}</span>
          </div>
        </NanoDialog>
      )}
      {dialog === 'settings' && (
        <SettingsDialog copy={copy} zh={zh} settings={settings} onSettings={onSettings} onClose={() => setDialog(null)} />
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
    const paint = () => {
      raf = 0
      const packed = term.render()
      if (packed) {
        // herdr：synchronized output 期间压住 request_render，半帧（含游标）不落画布。
        const syncHeld = (packed.modes & MODES.SYNC_OUTPUT) && packed.rows.length === 0
        if (!syncHeld) canvas.paint(packed)
        lastViewStart = packed.viewStart ?? 0
        // 选区层跟随视口滚动重新定位（滚动/输出移位时高亮不漂移）
        canvas.paintSelection(rec.sel?.a, rec.sel?.f, lastViewStart, contentCols)
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
    // W-P1-4: a non-focused pane downgrades to ~2Hz interval paints — wasm
    // keeps parsing (mirror/state stay current) but canvas painting halves.
    // Focus is read live from data-focused (effect doesn't rerun on focus).
    const schedulePaint = () => {
      if (raf) return
      if (boxRef.current?.dataset?.focused !== 'false') {
        raf = requestAnimationFrame(paint)
      } else if (!stateRef.current.slowTimer) {
        stateRef.current.slowTimer = setInterval(() => { if (raf) return; paint() }, 500)
      }
    }
    rec.hooks.schedulePaint = schedulePaint
    rec.hooks.applyStatus = applyStatus

    lane.onOutput = (bytes) => {
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
      box.focus()
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
      const now = Date.now()
      const gap = now - (stateRef.current.beatAt || now)
      stateRef.current.beatAt = now
      if (freezeGap(gap)) lane.requestAlign()
    }, 1000)
    const onResume = () => lane.requestAlign()
    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('resume', onResume)
    const stopDpr = watchDevicePixelRatio(() => { if (canvas.syncDpr()) fit() })
    const focusout = () => { const d = encodeFocus(term.modes(), false); if (d) lane.write(d) }
    // right-click = menu (herdr right_click=menu default): paste, copy-mode,
    // split, close — rendered by the pane header menu owner, not the program.
    const contextmenu = (ev) => {
      ev.preventDefault()
      onFocus()
      box.focus()
      setMenuAt({ x: ev.clientX, y: ev.clientY })
    }

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
            await lane.open()
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
      clearInterval(stateRef.current.slowTimer)
      clearInterval(beat)
      stateRef.current.slowTimer = null
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('resume', onResume)
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
    if (focused) boxRef.current?.focus()
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
