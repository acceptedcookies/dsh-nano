// NanoTerm: the terminal tab body — a binary split tree of independent panes.
// Each pane = wasm emulator + canvas renderer + one lane (local/mcp/isolate).

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoDialog, NanoMenu, NANO_STYLES } from 'dsh-nano-ui'

const { Button, Input, Switch } = primitives
import { loadCore, WasmTerm, MODES } from './wasm.js'
import { TermCanvas, buildPalette } from './render.js'
import { encodeKey, encodePaste, encodeMouse, encodeFocus } from './keys.js'
import { makeLane } from './lanes.js'

let paneSeq = 1
const FONT_FAMILIES = {
  jetbrains: '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, monospace',
  sf: '"SF Mono", Menlo, Consolas, monospace',
  system: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
}
const DEFAULT_SETTINGS = { fontSize: 13, font: 'jetbrains', blink: true, scrollback: 2000 }
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
// workspace plugins use, dressed entirely in --dsw-alias-* tokens.
const STYLE = `
${NANO_STYLES}

.dnt-root{position:relative;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);flex-direction:column;display:flex;font:var(--dsw-font-xxs-12)}
.dnt-toolbar{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l3);flex:none;align-items:center;gap:4px;height:38px;padding:5px 6px;display:flex}
.dnt-tool{width:28px;height:28px;color:var(--dsw-alias-label-secondary);border-radius:var(--dsw-radius-sm);cursor:pointer;background:transparent;border:0;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}
.dnt-tool:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dnt-tool:disabled{color:var(--dsw-alias-label-quaternary);cursor:default}
.dnt-tool:focus-visible,.dnt-address:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,var(--dsw-alias-link));outline-offset:1px}
.dnt-tool svg{flex:none}
.dnt-rotate{transform:rotate(90deg)}
.dnt-address{box-sizing:border-box;width:220px;height:28px;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);padding:0 9px}
.dnt-address::placeholder{color:var(--dsw-alias-label-tertiary)}
.dnt-toolbar-info{margin-left:auto;cursor:default;color:var(--dsw-alias-label-quaternary)}
.dnt-toolbar-info:hover{color:var(--dsw-alias-label-tertiary);background:transparent}
.dnt-panes{display:flex;flex:1 1 0;min-height:0;min-width:0;gap:6px;padding:6px}
.dnt-splitter{flex:0 0 6px;border-radius:3px;cursor:col-resize;transition:background .15s}
.dnt-splitter:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dnt-pane{position:relative;flex:1 1 0;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden;container-type:size;container-name:dnt-pane;border-radius:var(--dsw-radius-md,8px);border:.5px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base);transition:border-color .15s}
@container dnt-pane (max-width: 220px){.dnt-hide-narrow{display:none}}
@container dnt-pane (max-width: 160px){.dnt-title,.dnt-scroll-lines{display:none}}
.dnt-pane[data-focused="true"]{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,var(--dsw-alias-link)) 55%,transparent)}
.dnt-pane[data-focused="false"]{border-color:var(--dsw-alias-border-l3)}
.dnt-pane[data-focused="false"] .dnt-canvas-host{opacity:.82}
.dnt-pane[data-focused="false"] .dnt-dot{opacity:.7}
.dnt-header{display:flex;align-items:center;gap:7px;height:26px;padding:0 8px;border-bottom:.5px solid var(--dsw-alias-border-l3);user-select:none;flex:none}
.dnt-pane[data-focused="true"] .dnt-header{border-bottom-color:var(--dsw-alias-border-l2);background:color-mix(in srgb,var(--dsw-alias-brand-primary,var(--dsw-alias-link)) 4%,transparent)}
.dnt-dot{width:7px;height:7px;border-radius:50%;flex:none;background:var(--dsw-alias-label-quaternary)}
.dnt-dot[data-phase="live"]{background:#3fb950}
.dnt-dot[data-phase="opening"]{background:#d29922}
.dnt-dot[data-phase="error"]{background:#f85149}
.dnt-dot[data-phase="exited"]{background:var(--dsw-alias-label-quaternary)}
.dnt-lane{font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--dsw-alias-brand-primary,var(--dsw-alias-link));background:color-mix(in srgb,var(--dsw-alias-brand-primary,var(--dsw-alias-link)) 12%,transparent);border-radius:var(--dsw-radius-sm);padding:1px 6px;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dnt-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}
.dnt-scroll-lines{font-size:10px;color:var(--dsw-alias-label-quaternary);flex:0 0 auto;font-variant-numeric:tabular-nums}
.dnt-header .dnt-tool{width:20px;height:20px;flex:0 0 auto;color:var(--dsw-alias-label-tertiary)}
.dnt-header .dnt-tool:hover:not(:disabled){color:var(--dsw-alias-label-primary)}
.dnt-header .dnt-tool svg{width:13px;height:13px}
.dnt-header-actions{display:flex;align-items:center;gap:1px;flex:0 0 auto;margin-left:auto}
.dnt-canvas-host{position:absolute;top:26px;left:0;right:0;bottom:0;overflow:hidden;cursor:text}
.dnt-scrollbar-track{position:absolute;right:3px;top:32px;bottom:8px;width:6px;pointer-events:none;z-index:4}
.dnt-scrollbar-thumb{position:absolute;right:0;width:6px;border-radius:3px;background:var(--dsw-alias-label-quaternary);opacity:.55;transition:opacity .15s}
.dnt-pane:hover .dnt-scrollbar-thumb{opacity:.9}
.dnt-overlay{position:absolute;inset:0;top:26px;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:color-mix(in srgb,var(--dsw-alias-bg-base) 88%,transparent);color:var(--dsw-alias-label-secondary);text-align:center;padding:16px;border-bottom-left-radius:inherit;border-bottom-right-radius:inherit}
.dnt-overlay svg{color:var(--dsw-alias-label-tertiary)}
.dnt-overlay-title{font-weight:600;color:var(--dsw-alias-label-primary)}
.dnt-overlay-msg{max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary)}
.dnt-overlay-retry{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer;font:var(--dsw-font-xxs-12)}
.dnt-overlay-retry:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dnt-overlay-retry:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,var(--dsw-alias-link));outline-offset:1px}
.dnt-split-row{flex:1 1 0;min-width:0;min-height:0;display:flex}
.dnt-err{padding:16px;color:var(--dsw-alias-label-tertiary)}
/* settings rows follow the DNEE convention: label+hint left, control right */
.dnt-settings-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:.5px solid var(--dsw-alias-border-l3)}
.dnt-settings-row:last-child{border-bottom:0}
.dnt-settings-label{color:var(--dsw-alias-label-primary)}
.dnt-settings-hint{margin-top:2px;font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dnt-settings-row .dnt-pick{display:inline-flex;align-items:center;gap:6px;min-width:132px;justify-content:space-between}
.dnt-size-field{width:72px}
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
    isolate: primitives.IconAppsAddOutlineRegular,
    mcp: primitives.IconApiOutlineRegular,
    go: primitives.IconRightUpOutlineRegular,
    close: primitives.IconCloseOutlineRegular,
    retry: primitives.IconRefreshOutlineRegular,
    warn: primitives.IconWarningOutlineRegular,
    help: primitives.IconQuestionOutlineRegular,
    settings: primitives.IconSettingsOutlineRegular ?? primitives.IconGearOutlineRegular,
    check: primitives.IconCheckOutlineRegular,
    chevron: primitives.IconChevronDownOutlineRegular,
    add: primitives.IconPlusOutlineRegular,
    terminal: primitives.IconCommandOutlineRegular ?? primitives.IconTerminalOutlineRegular ?? primitives.IconPlusOutlineRegular,
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

export function NanoTerm({ sessionId, session, zh }) {
  const [tree, setTree] = useState(() => leaf())
  const [focused, setFocused] = useState(null)
  const [err, setErr] = useState(null)
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState(loadSettings)
  const paneSessions = useRef(new Map())

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

  // unmount cleanup: close every pane lane still registered
  useEffect(() => () => {
    for (const s of paneSessions.current.values()) closePaneSession(s)
    paneSessions.current.clear()
  }, [])

  const split = useCallback((id, dir, spec) => {
    setTree((t) => mapTree(t, id, (n) => ({
      type: 'split', dir, ratio: 0.5, id: 's' + paneSeq++,
      a: n, b: leaf(spec ?? { lane: 'local' }),
    })))
  }, [])

  const closeLeaf = useCallback((id) => {
    const rec = paneSessions.current.get(id)
    if (rec) { closePaneSession(rec); paneSessions.current.delete(id) }
    setTree((t) => removeLeaf(t, id))
    setFocused((f) => (f === id ? null : f))
  }, [])

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

  if (err) return <div className="dnt-err">nano-terminal failed to load: {err}</div>
  if (!ready) return <div className="dnt-err">{zh ? '正在加载终端核心…' : 'loading terminal core…'}</div>

  return (
    <div className="dnt-root" data-nano-terminal>
      <Toolbar sessionId={sessionId} split={split} openLeaf={openLeaf} focused={focused} zh={zh} tree={tree} paneSessions={paneSessions} settings={settings} onSettings={updateSettings} />
      {tree ? (
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
          />
        </div>
      ) : (
        <div className="dnt-empty" data-dnt-empty>
          <div className="dnt-empty-icon">{glyph('terminal')}</div>
          <div className="dnt-empty-title">{zh ? '新建终端' : 'New terminal'}</div>
          <div className="dnt-empty-body">
            {zh
              ? '每个窗格是一个独立实例：本地 lane 直连宿主 shell，isolate 在 wasm 内运行，MCP 连接远端容器终端。'
              : 'Each pane is an independent instance: local lanes talk to the host shell, isolate runs inside wasm, MCP reaches remote container terminals.'}
          </div>
          <div className="dnt-empty-actions">
            <Button variant="primary" onClick={() => openLeaf()}>
              {zh ? '本地终端' : 'Local terminal'}
            </Button>
            <Button variant="outline" onClick={() => openLeaf({ lane: 'isolate' })}>
              {zh ? '隔离实例' : 'Isolate pane'}
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

function Toolbar({ sessionId, split, openLeaf, focused, zh, tree, paneSessions, settings, onSettings }) {
  const [mcpUrl, setMcpUrl] = useState('')
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
    { id: 'isolate', label: zh ? '新建隔离实例' : 'New isolate pane', icon: glyph('isolate'), run: () => open({ lane: 'isolate' }) },
    { id: 'mcp', label: zh ? '连接 MCP 终端…' : 'Connect MCP terminal…', icon: glyph('mcp'), run: () => setDialog('mcp') },
  ]
  const copy = { cancel: zh ? '取消' : 'Cancel', confirm: zh ? '确定' : 'OK', close: zh ? '关闭' : 'Close' }
  return (
    <div className="dnt-toolbar">
      <button type="button" className="dnt-tool" title={zh ? '新建窗格' : 'new pane'}
        aria-label={zh ? '新建窗格' : 'new pane'}
        onClick={openMenu}>
        {glyph('add')}
      </button>
      <span style={{ flex: '1 1 auto' }} />
      <button type="button" className="dnt-tool" title={zh ? '快捷键与说明' : 'shortcuts'}
        aria-label={zh ? '快捷键与说明' : 'shortcuts'} onClick={() => setDialog('help')}>
        {glyph('help')}
      </button>
      <button type="button" className="dnt-tool" title={zh ? '终端设置' : 'terminal settings'}
        aria-label={zh ? '终端设置' : 'terminal settings'} onClick={() => setDialog('settings')}>
        {glyph('settings')}
      </button>
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
            placeholder="http://container:PORT/mcp"
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
            <span><kbd>{zh ? '滚轮' : 'wheel'}</kbd> {zh ? '翻页滚动 scrollback' : 'scroll scrollback'}</span>
            <span><kbd>⌘V</kbd> {zh ? '粘贴到当前窗格' : 'paste into focused pane'}</span>
            <span><kbd>{zh ? '拖拽边' : 'drag edge'}</kbd> {zh ? '调整窗格比例' : 'resize panes'}</span>
            <span><kbd>{zh ? '点击' : 'click'}</kbd> {zh ? '聚焦窗格（品牌描边）' : 'focus pane (brand border)'}</span>
          </div>
        </NanoDialog>
      )}
      {dialog === 'settings' && (
        <SettingsDialog copy={copy} zh={zh} settings={settings} onSettings={onSettings} onClose={() => setDialog(null)} />
      )}
    </div>
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

function PaneNode({ node, sessionId, session, focused, setFocused, split, closeLeaf, setRatio, paneSessions, zh, settings, style }) {
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
          <PaneNode node={node.a} {...{ sessionId, session, focused, setFocused, split, closeLeaf, setRatio, paneSessions, zh, settings }} />
        </div>
        <div
          className="dnt-splitter"
          style={{ cursor: horizontal ? 'col-resize' : 'row-resize', zIndex: 3 }}
          onMouseDown={startDrag}
        />
        <div className="dnt-split-row">
          <PaneNode node={node.b} {...{ sessionId, session, focused, setFocused, split, closeLeaf, setRatio, paneSessions, zh, settings }} />
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

function TermPane({ paneId, laneSpec, sessionId, session, focused, onFocus, onClose, onSplit, paneSessions, zh, settings }) {
  const boxRef = useRef(null)
  const canvasHostRef = useRef(null)
  const [status, setStatus] = useState({ lane: laneSpec.lane, phase: 'opening', scroll: '0/0', title: '' })
  const [retrySeq, setRetrySeq] = useState(0)
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
      const term = new WasmTerm(2, 2, settings.scrollback ?? 2000)
      const lane = makeLane(laneSpec, { cols: 80, rows: 24, sessionId })
      rec = { lane, term, canvas, w: 0, h: 0, retrySeq, hooks: {}, lastStatus: { lane: laneSpec.lane, phase: 'opening', scroll: null, title: '' }, closed: false }
    } else {
      rec.canvas.attach(host)
      setStatus(rec.lastStatus)
    }
    const { canvas, term, lane } = rec

    // status updates flow to whichever mount currently owns the pane
    const applyStatus = (fn) => {
      rec.lastStatus = fn(rec.lastStatus)
      setStatus(rec.lastStatus)
    }
    let lastScrollKey = ''
    const paint = () => {
      raf = 0
      const packed = term.render()
      if (packed) {
        canvas.paint(packed)
        lastViewStart = packed.viewStart ?? 0
        const total = term.totalLines()
        const key = `${total}/${lastViewStart}/${canvas.rows}`
        if (key !== lastScrollKey) {
          lastScrollKey = key
          applyStatus((s) => ({ ...s, scroll: { total, viewStart: lastViewStart, rows: canvas.rows } }))
        }
        const title = term.title()
        if (title) applyStatus((s) => ({ ...s, title: title.slice(0, 60) }))
      }
    }
    const schedulePaint = () => { if (!raf) raf = requestAnimationFrame(paint) }
    rec.hooks.schedulePaint = schedulePaint
    rec.hooks.applyStatus = applyStatus

    lane.onOutput = (bytes) => {
      term.write(bytes)
      const reply = term.drainReply()
      if (reply.length) lane.write(reply)
      rec.hooks.schedulePaint?.()
    }
    lane.onExit = () => {
      term.dead()
      rec.hooks.applyStatus?.((s) => ({ ...s, phase: 'exited' }))
    }
    lane.onReady = () => rec.hooks.applyStatus?.((s) => ({ ...s, phase: 'live' }))

    // measure → fit canvas + wasm + pty
    const fit = () => {
      const rect = host.getBoundingClientRect()
      const dims = paneSessions.current.get(paneId)
      if (dims) { dims.w = rect.width; dims.h = rect.height }
      const cols = Math.max(4, Math.floor((rect.width - canvas.padX * 2) / canvas.charW))
      const rows = Math.max(2, Math.floor((rect.height - canvas.padY) / canvas.charH))
      if (cols === canvas.cols && rows === canvas.rows) return
      canvas.fit(cols, rows)
      term.resize(cols, rows)
      lane.resize(cols, rows)
      canvas.clearAll()
      schedulePaint()
    }
    const ro = new ResizeObserver(fit)
    ro.observe(host)
    fit()

    // input
    const keydown = (ev) => {
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
        x: Math.floor((ev.clientX - rect.left - canvas.padX) / canvas.charW),
        y: Math.floor((ev.clientY - rect.top - canvas.padY) / canvas.charH),
      }
    }
    const mousedown = (ev) => {
      onFocus()
      const { x, y } = cellAt(ev)
      const data = encodeMouse(term.modes(), { btn: ev.button, x, y, release: false, shift: ev.shiftKey, alt: ev.altKey, ctrl: ev.ctrlKey })
      if (data) { lane.write(data); ev.preventDefault() }
    }
    const mouseup = (ev) => {
      const { x, y } = cellAt(ev)
      const data = encodeMouse(term.modes(), { btn: ev.button, x, y, release: true, shift: ev.shiftKey, alt: ev.altKey, ctrl: ev.ctrlKey })
      if (data) lane.write(data)
    }
    const mousemove = (ev) => {
      if (!(ev.buttons & 1)) return
      const { x, y } = cellAt(ev)
      const data = encodeMouse(term.modes(), { btn: 32, x, y, release: false, shift: ev.shiftKey, alt: ev.altKey, ctrl: ev.ctrlKey })
      if (data) lane.write(data)
    }
    const focusin = () => { const d = encodeFocus(term.modes(), true); if (d) lane.write(d) }
    const focusout = () => { const d = encodeFocus(term.modes(), false); if (d) lane.write(d) }

    box.addEventListener('keydown', keydown)
    box.addEventListener('paste', paste)
    box.addEventListener('wheel', wheel, { passive: false })
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

      rec.reconfigure = (next) => {
        canvas.setFont(fontFrom(next))
        canvas.setBlink(next.blink)
        fit()
        schedulePaint()
      }

      paneSessions.current.set(paneId, rec)
    } else {
      // reattach: blink/repaint wiring survived on the canvas; restart it here
      canvas.startBlink(() => term.modes())
      schedulePaint()
    }
    fit()

    return () => {
      dead = true
      cancelAnimationFrame(raf)
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
      // unmount ≠ close: a split-remount reattaches; closeLeaf decides life.
      canvas.detach()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId, laneSpec.lane, laneSpec.url, retrySeq])

  const phaseLabel = { opening: '…', live: laneSpec.lane, exited: 'exit', error: 'err' }[status.phase]
  return (
    <div
      ref={boxRef}
      tabIndex={0}
      onFocus={onFocus}
      className="dnt-pane"
      data-focused={focused ? 'true' : 'false'}
    >
      <div className="dnt-header">
        <span className="dnt-dot" data-phase={status.phase} />
        <span className="dnt-lane">{phaseLabel}</span>
        <span className="dnt-title">{status.title || (status.phase === 'error' ? (zh ? '连接失败' : 'open failed') : '')}</span>
        <span className="dnt-scroll-lines">{status.scroll?.total ? `${status.scroll.total}ln` : ''}</span>
        <span className="dnt-header-actions">
          {(status.phase === 'error' || status.phase === 'exited') && (
            <button type="button" className="dnt-tool" onClick={(e) => { e.stopPropagation(); setRetrySeq((n) => n + 1) }}
              title={zh ? '重试连接' : 'retry connection'} aria-label={zh ? '重试连接' : 'retry connection'}>
              {glyph('retry')}
            </button>
          )}
          <button type="button" className="dnt-tool dnt-hide-narrow" onClick={(e) => { e.stopPropagation(); onSplit('h') }}
            title={zh ? '向右分屏' : 'split right'} aria-label={zh ? '向右分屏' : 'split right'}>{glyph('splitRight')}</button>
          <button type="button" className="dnt-tool dnt-hide-narrow" onClick={(e) => { e.stopPropagation(); onSplit('v') }}
            title={zh ? '向下分屏' : 'split down'} aria-label={zh ? '向下分屏' : 'split down'}>{glyph('splitDown', true)}</button>
          <button type="button" className="dnt-tool" onClick={(e) => { e.stopPropagation(); onClose() }}
            title={zh ? '关闭' : 'close pane'} aria-label={zh ? '关闭' : 'close pane'}>{glyph('close')}</button>
        </span>
      </div>
      <div ref={canvasHostRef} className="dnt-canvas-host" />
      <Scrollbar status={status} />
      {status.phase === 'error' && (
        <div className="dnt-overlay" role="alert">
          {glyph('warn')}
          <span className="dnt-overlay-title">{zh ? '通道连接失败' : 'lane connection failed'}</span>
          <span className="dnt-overlay-msg" title={status.title}>{status.title}</span>
          <button type="button" className="dnt-overlay-retry"
            onClick={(e) => { e.stopPropagation(); setRetrySeq((n) => n + 1) }}>
            {glyph('retry')}
            {zh ? '重试' : 'retry'}
          </button>
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
