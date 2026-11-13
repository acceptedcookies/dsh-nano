// NanoTerm: the terminal tab body — a binary split tree of independent panes.
// Each pane = wasm emulator + canvas renderer + one lane (local/mcp/isolate).

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { loadCore, WasmTerm, MODES } from './wasm.js'
import { TermCanvas, buildPalette } from './render.js'
import { encodeKey, encodePaste, encodeMouse, encodeFocus } from './keys.js'
import { makeLane } from './lanes.js'

let paneSeq = 1
const FONT = { family: '"SF Mono", "Menlo", "Consolas", monospace', size: 13 }

// Workbench-consistent chrome: the same toolbar/tool shapes the other right-
// workspace plugins use, dressed entirely in --dsw-alias-* tokens.
const STYLE = `
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
.dnt-hint{margin-left:auto;color:var(--dsw-alias-label-tertiary)}
.dnt-panes{display:flex;flex:1 1 0;min-height:0;min-width:0}
.dnt-splitter{flex:0 0 4px;background:var(--dsw-alias-border-l3)}
.dnt-pane{position:relative;flex:1 1 0;min-width:0;min-height:0;display:flex;overflow:hidden}
.dnt-pane[data-focused="true"]{outline:1px solid var(--dsw-alias-brand-primary,var(--dsw-alias-link));outline-offset:-1px}
.dnt-canvas-host{position:absolute;inset:0;overflow:hidden;cursor:text}
.dnt-scrollbar{position:absolute;right:2px;top:20px;bottom:26px;width:4px;border-radius:2px;background:var(--dsw-alias-interactive-bg-hover);pointer-events:none;z-index:4}
.dnt-statusbar{position:absolute;left:0;right:0;bottom:0;height:22px;display:flex;align-items:center;gap:6px;padding:0 6px;background:var(--dsw-alias-bg-layer-1);border-top:.5px solid var(--dsw-alias-border-l3);user-select:none;z-index:5}
.dnt-statusbar .dnt-tool{width:20px;height:20px}
.dnt-statusbar .dnt-tool svg{width:14px;height:14px}
.dnt-lane{color:var(--dsw-alias-brand-primary,var(--dsw-alias-link));font-weight:600;text-transform:uppercase}
.dnt-status-title{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary)}
.dnt-status-scroll{color:var(--dsw-alias-label-quaternary)}
.dnt-err{padding:16px;color:var(--dsw-alias-label-tertiary)}
`

const glyph = (name, rotate = false) => {
  const Icon = {
    splitRight: primitives.IconPanelLeftOutlineRegular,
    splitDown: primitives.IconPanelLeftOutlineRegular,
    isolate: primitives.IconAppsAddOutlineRegular,
    mcp: primitives.IconApiOutlineRegular,
    go: primitives.IconRightUpOutlineRegular,
    close: primitives.IconCloseOutlineRegular,
  }[name]
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
    for (const s of paneSessions.current.values()) {
      try { s.lane?.close() } catch { /* gone */ }
    }
    paneSessions.current.clear()
  }, [])

  const split = useCallback((id, dir, spec) => {
    setTree((t) => mapTree(t, id, (n) => ({
      type: 'split', dir, ratio: 0.5, id: 's' + paneSeq++,
      a: n, b: leaf(spec ?? { lane: 'local' }),
    })))
  }, [])

  const closeLeaf = useCallback((id) => {
    setTree((t) => removeLeaf(t, id))
  }, [])

  const setRatio = useCallback((id, ratio) => {
    setTree((t) => mapTree(t, id, (n) => ({ ...n, ratio })))
  }, [])

  if (err) return <div className="dnt-err">nano-terminal failed to load: {err}</div>
  if (!ready) return <div className="dnt-err">{zh ? '正在加载终端核心…' : 'loading terminal core…'}</div>
  if (!tree) return <div className="dnt-err">{zh ? '所有面板已关闭' : 'all panes closed'}</div>

  return (
    <div className="dnt-root" data-nano-terminal>
      <Toolbar sessionId={sessionId} split={split} focused={focused} zh={zh} tree={tree} />
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
        />
      </div>
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

function Toolbar({ sessionId, split, focused, zh, tree }) {
  const [mcpUrl, setMcpUrl] = useState('')
  const [showMcp, setShowMcp] = useState(false)
  const target = focused ?? firstLeaf(tree)
  return (
    <div className="dnt-toolbar">
      <button type="button" className="dnt-tool" title={zh ? '向下分屏' : 'split down'}
        aria-label={zh ? '向下分屏' : 'split down'}
        onClick={() => target && split(target, 'v')} disabled={!target}>
        {glyph('splitDown', true)}
      </button>
      <button type="button" className="dnt-tool" title={zh ? '向右分屏' : 'split right'}
        aria-label={zh ? '向右分屏' : 'split right'}
        onClick={() => target && split(target, 'h')} disabled={!target}>
        {glyph('splitRight')}
      </button>
      <button type="button" className="dnt-tool" title={zh ? '新建隔离实例 (wasm lane)' : 'new isolate pane (wasm lane)'}
        aria-label={zh ? '新建隔离实例 (wasm lane)' : 'new isolate pane (wasm lane)'}
        onClick={() => target && split(target, 'h', { lane: 'isolate' })} disabled={!target}>
        {glyph('isolate')}
      </button>
      <button type="button" className="dnt-tool" title={zh ? '连接 MCP 终端' : 'connect MCP terminal'}
        aria-label={zh ? '连接 MCP 终端' : 'connect MCP terminal'}
        onClick={() => setShowMcp((v) => !v)}>
        {glyph('mcp')}
      </button>
      {showMcp && (
        <form style={{ display: 'inline-flex', gap: 4 }} onSubmit={(e) => {
          e.preventDefault()
          if (mcpUrl && target) split(target, 'h', { lane: 'mcp', url: mcpUrl })
          setShowMcp(false)
        }}>
          <input
            autoFocus value={mcpUrl} onChange={(e) => setMcpUrl(e.target.value)}
            placeholder="http://container:PORT/mcp" className="dnt-address"
          />
          <button className="dnt-tool" type="submit" aria-label="connect">{glyph('go')}</button>
        </form>
      )}
      <span className="dnt-hint">{zh ? '每个分屏一个独立实例' : 'each pane is an independent instance'}</span>
    </div>
  )
}

function PaneNode({ node, sessionId, session, focused, setFocused, split, closeLeaf, setRatio, paneSessions, zh, style }) {
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
        <div style={{ flex: `0 0 ${node.ratio * 100}%`, minWidth: 0, minHeight: 0, display: 'flex' }}>
          <PaneNode node={node.a} {...{ sessionId, session, focused, setFocused, split, closeLeaf, setRatio, paneSessions, zh }} />
        </div>
        <div
          className="dnt-splitter"
          style={{ cursor: horizontal ? 'col-resize' : 'row-resize', zIndex: 3 }}
          onMouseDown={startDrag}
        />
        <div style={{ flex: '1 1 0', minWidth: 0, minHeight: 0, display: 'flex' }}>
          <PaneNode node={node.b} {...{ sessionId, session, focused, setFocused, split, closeLeaf, setRatio, paneSessions, zh }} />
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
    />
  )
}

function TermPane({ paneId, laneSpec, sessionId, session, focused, onFocus, onClose, onSplit, paneSessions, zh }) {
  const boxRef = useRef(null)
  const canvasHostRef = useRef(null)
  const [status, setStatus] = useState({ lane: laneSpec.lane, phase: 'opening', scroll: '0/0', title: '' })
  const stateRef = useRef({})

  useEffect(() => {
    const box = boxRef.current
    const host = canvasHostRef.current
    if (!box || !host) return
    let dead = false
    let raf = 0
    let painted = false
    const palette = buildPalette(box)
    const canvas = new TermCanvas(host, palette, FONT)
    const term = new WasmTerm(2, 2, 2000)
    const lane = makeLane(laneSpec, { cols: 80, rows: 24, sessionId })

    const paint = () => {
      raf = 0
      const packed = term.render()
      if (packed) {
        canvas.paint(packed)
        painted = true
        const title = term.title()
        if (title) setStatus((s) => ({ ...s, title: title.slice(0, 60) }))
      }
    }
    const schedulePaint = () => { if (!raf) raf = requestAnimationFrame(paint) }

    let lastScrollStr = ''
    const syncStatus = () => {
      const tl = String(term.totalLines())
      if (tl !== lastScrollStr) {
        lastScrollStr = tl
        setStatus((s) => ({ ...s, scroll: tl }))
      }
    }
    lane.onOutput = (bytes) => {
      term.write(bytes)
      const reply = term.drainReply()
      if (reply.length) lane.write(reply)
      schedulePaint()
      syncStatus()
    }
    lane.onExit = () => {
      term.dead()
      setStatus((s) => ({ ...s, phase: 'exited' }))
    }
    lane.onReady = () => setStatus((s) => ({ ...s, phase: 'live' }))

    // measure → fit canvas + wasm + pty
    const fit = () => {
      const rect = host.getBoundingClientRect()
      const cols = Math.max(4, Math.floor(rect.width / canvas.charW))
      const rows = Math.max(2, Math.floor(rect.height / canvas.charH))
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
    const mousedown = (ev) => {
      onFocus()
      const rect = host.getBoundingClientRect()
      const x = Math.floor((ev.clientX - rect.left) / canvas.charW)
      const y = Math.floor((ev.clientY - rect.top) / canvas.charH)
      const data = encodeMouse(term.modes(), { btn: ev.button, x, y, release: false, shift: ev.shiftKey, alt: ev.altKey, ctrl: ev.ctrlKey })
      if (data) { lane.write(data); ev.preventDefault() }
    }
    const mouseup = (ev) => {
      const rect = host.getBoundingClientRect()
      const x = Math.floor((ev.clientX - rect.left) / canvas.charW)
      const y = Math.floor((ev.clientY - rect.top) / canvas.charH)
      const data = encodeMouse(term.modes(), { btn: ev.button, x, y, release: true, shift: ev.shiftKey, alt: ev.altKey, ctrl: ev.ctrlKey })
      if (data) lane.write(data)
    }
    const mousemove = (ev) => {
      if (!(ev.buttons & 1)) return
      const rect = host.getBoundingClientRect()
      const x = Math.floor((ev.clientX - rect.left) / canvas.charW)
      const y = Math.floor((ev.clientY - rect.top) / canvas.charH)
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

    lane.open().catch((e) => {
      setStatus((s) => ({ ...s, phase: 'error', title: String(e?.message ?? e) }))
      term.write(`\r\n\x1b[1;31mnano-terminal: lane open failed — ${String(e?.message ?? e)}\x1b[0m\r\n`)
      schedulePaint()
    })

    paneSessions.current.set(paneId, { lane, term })

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
      paneSessions.current.delete(paneId)
      lane.close()
      canvas.dispose()
      term.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId, laneSpec.lane, laneSpec.url])

  const phaseLabel = { opening: '…', live: laneSpec.lane, exited: 'exit', error: 'err' }[status.phase]
  return (
    <div
      ref={boxRef}
      tabIndex={0}
      onFocus={onFocus}
      className="dnt-pane"
      data-focused={focused ? 'true' : 'false'}
    >
      <div ref={canvasHostRef} className="dnt-canvas-host" style={{ bottom: 22 }} />
      <Scrollbar status={status} />
      <div className="dnt-statusbar">
        <span className="dnt-lane">{phaseLabel}</span>
        <span className="dnt-status-title">{status.title || (status.phase === 'error' ? 'open failed' : '')}</span>
        <span className="dnt-status-scroll">{status.scroll}ln</span>
        <button type="button" className="dnt-tool" onClick={(e) => { e.stopPropagation(); onSplit('h') }}
          title="split right" aria-label="split right">{glyph('splitRight')}</button>
        <button type="button" className="dnt-tool" onClick={(e) => { e.stopPropagation(); onSplit('v') }}
          title="split down" aria-label="split down">{glyph('splitDown', true)}</button>
        <button type="button" className="dnt-tool" onClick={(e) => { e.stopPropagation(); onClose() }}
          title="close pane" aria-label="close pane">{glyph('close')}</button>
      </div>
    </div>
  )
}

function Scrollbar({ status }) {
  // slim visual indicator (scrolling itself is wheel-driven via wasm scroll offset)
  if (!status.scroll || status.scroll === '0') return null
  return <div className="dnt-scrollbar" />
}
