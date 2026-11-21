/** Workbench shell (T-O-69: the shell is the consumer's chrome, not nano-ui).
 *  Geometry follows the design-mode pane: 38px bar, 216px slide-out drawer,
 *  26px status line, drag-up dock. The host has no vertical object list and
 *  no status sheet; the controls inside stay host primitives and nano-ui. */
import React from 'react'

const h = React.createElement
const DOCK_MIN = 120

export function WorkbenchShell({ label, bar, drawer, dock, status, children }) {
  return h('section', { className: 'dnls-shell', 'data-dnls-shell': '1' },
    h('div', { className: 'dnls-shell-bar', role: 'toolbar', 'aria-label': label }, bar),
    h('div', { className: 'dnls-shell-body' }, children),
    drawer ?? null,
    dock ?? null,
    status ?? null)
}

/* nano-ui-exempt: 宿主 Button 没有「图标+文字、28px、markdown-tag 底、按下混色」的切换钮，度量照 DNK .nks-nav-toggle。 */
export function ShellToggle({ icon, label, title, open, onClick }) {
  return h('button', {
    type: 'button',
    className: 'dnls-shell-toggle',
    'data-dnls-drawer-toggle': '1',
    'aria-pressed': open ? 'true' : 'false',
    'aria-expanded': open ? 'true' : 'false',
    'aria-label': label,
    title: label,
    onClick,
  }, icon, h('span', { className: 'dnls-shell-toggle-text' }, title))
}

export function TabDrawer({ open, label, head, onClose, children }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => { if (event.key === 'Escape') onClose?.() }
    const onDown = (event) => {
      const target = event.target
      if (ref.current?.contains(target)) return
      if (typeof target?.closest === 'function' && target.closest('[data-dnls-drawer-toggle]')) return
      onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, onClose])
  return h('nav', {
    ref,
    className: 'dnls-drawer',
    'data-dnls-drawer-state': open ? 'open' : 'closed',
    'aria-label': label,
    'aria-hidden': open ? undefined : true,
  },
  head ? h('div', { className: 'dnls-drawer-head' }, head) : null,
  h('div', { className: 'dnls-drawer-list' }, children))
}

/* nano-ui-exempt: 宿主 Button 不能做「状态点+单行截断名称+次行读数」的竖排页签行，名称会被折开；度量照 DNK .nks-nav-tab。 */
export function DrawerRow({ current, onClick, mark, label, meta }) {
  return h('button', {
    type: 'button',
    className: 'dnls-drawer-row',
    'aria-current': current ? 'page' : undefined,
    onClick,
  },
  mark ? h('span', { className: 'dnls-drawer-mark' }, mark) : null,
  h('span', { className: 'dnls-drawer-copy' },
    h('span', { className: 'dnls-drawer-label' }, label),
    meta ? h('span', { className: 'dnls-drawer-meta' }, meta) : null))
}

export function StatusBar({ label, children, actions = [] }) {
  return h('footer', { className: 'dnls-statusbar', 'aria-label': label },
    h('span', { className: 'dnls-statusbar-text' }, children),
    h('span', { className: 'dnls-statusbar-actions' }, actions.map((action) =>
      /* nano-ui-exempt: 宿主 Button 最小档 28px，26px 状态条里的 20px 文字按钮没有对应档；度量照 DNK .nks-status button。 */
      h('button', {
        key: action.id,
        type: 'button',
        className: 'dnls-statusbar-btn',
        'aria-pressed': action.pressed === undefined ? undefined : action.pressed ? 'true' : 'false',
        'aria-expanded': action.expanded === undefined ? undefined : action.expanded ? 'true' : 'false',
        disabled: action.disabled === true,
        onClick: action.onClick,
      }, action.label))))
}

function clampHeight(shell, height) {
  const limit = Math.max(DOCK_MIN, Math.floor((shell?.clientHeight ?? 480) * 0.7))
  return Math.min(limit, Math.max(DOCK_MIN, Math.round(height)))
}

/** Pull-up sheet above the status line. Height lives on the element so a drag
 *  never re-renders the dock's contents. */
export function Dock({ label, height, onCommit, children }) {
  const ref = React.useRef(null)
  React.useLayoutEffect(() => {
    if (ref.current) ref.current.style.height = `${height}px`
  }, [height])
  const drag = (event) => {
    if (event.button != null && event.button !== 0) return
    event.preventDefault()
    const node = ref.current
    const shell = node?.closest('.dnls-shell')
    const startY = event.clientY
    const startH = node?.getBoundingClientRect().height ?? height
    const move = (ev) => { if (node) node.style.height = `${clampHeight(shell, startH + (startY - ev.clientY))}px` }
    const up = (ev) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onCommit?.(clampHeight(shell, startH + (startY - ev.clientY)))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  return h('div', { ref, className: 'dnls-dock', role: 'region', 'aria-label': label },
    h('div', {
      className: 'dnls-dock-grip',
      role: 'separator',
      'aria-orientation': 'horizontal',
      'aria-label': label,
      onPointerDown: drag,
    }),
    h('div', { className: 'dnls-dock-body' }, children))
}

export const SHELL_STYLE = `
.dnls-shell{position:relative;box-sizing:border-box;display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font:var(--dsw-font-xs-13)}
.dnls-shell-bar{position:relative;z-index:var(--nano-layer-local3);box-sizing:border-box;display:flex;flex:none;align-items:center;gap:var(--nano-space-2);height:38px;padding:5px 6px;border-bottom:var(--dsh-hairline-width) solid var(--dsw-alias-border-l3)}
.dnls-shell-toggle{display:inline-flex;flex:0 1 auto;align-items:center;gap:5px;min-width:0;max-width:60%;height:28px;margin-left:4px;padding:0 10px;border:0;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-markdown-tag);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);font-size:var(--dsh-content-font-size-secondary,13px);white-space:nowrap;cursor:pointer}
.dnls-shell-toggle:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dnls-shell-toggle:focus-visible,.dnls-drawer-row:focus-visible,.dnls-statusbar-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}
.dnls-shell-toggle[aria-pressed="true"]{background:color-mix(in srgb,var(--dsw-alias-link) 14%,var(--dsw-alias-markdown-tag))}
.dnls-shell-toggle-text{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dnls-shell-title{display:flex;flex:1 1 auto;align-items:center;gap:var(--nano-space-2);min-width:0;overflow:hidden;white-space:nowrap;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12)}
.dnls-shell-tail{display:flex;flex:none;align-items:center;gap:var(--nano-space-1)}
.dnls-shell-body{position:relative;display:flex;flex-direction:column;flex:1 1 auto;min-height:0}
.dnls-drawer{position:absolute;z-index:var(--nano-layer-local4);top:44px;left:10px;bottom:36px;width:216px;max-width:calc(100% - 20px);box-sizing:border-box;display:flex;flex-direction:column;min-height:0;background:var(--dsw-alias-bg-layer-2);border:var(--dsh-hairline-width) solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);box-shadow:var(--dsw-elevation-prominent);transform:translateX(calc(-100% - 12px));visibility:hidden;transition:transform var(--ds-transition-duration-slow,.32s) var(--ds-ease-in-out,ease),visibility 0s linear var(--ds-transition-duration-slow,.32s)}
.dnls-drawer[data-dnls-drawer-state="open"]{transform:none;visibility:visible;transition:transform var(--ds-transition-duration-slow,.32s) var(--ds-ease-in-out,ease)}
@starting-style{.dnls-drawer[data-dnls-drawer-state="open"]{transform:translateX(calc(-100% - 12px))}}
@media (prefers-reduced-motion:reduce){.dnls-drawer,.dnls-drawer[data-dnls-drawer-state="open"]{transition:none}}
.dnls-drawer-head{display:flex;flex:none;align-items:center;justify-content:space-between;gap:var(--nano-space-2);height:30px;padding:0 10px;border-bottom:var(--dsh-hairline-width) solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11)}
.dnls-drawer-list{display:flex;flex-direction:column;gap:2px;flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:var(--nano-space-1)}
.dnls-drawer-row{display:flex;align-items:center;gap:7px;width:100%;box-sizing:border-box;min-height:30px;margin:0;padding:4px 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxs-12);text-align:left;cursor:pointer}
.dnls-drawer-row:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dnls-drawer-row[aria-current="page"]{background:var(--dsw-alias-markdown-tag);color:var(--dsw-alias-label-primary)}
.dnls-drawer-mark{display:inline-flex;flex:none}
.dnls-drawer-copy{display:flex;flex-direction:column;flex:1 1 auto;min-width:0}
.dnls-drawer-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dnls-drawer-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11)}
.dnls-drawer-sep{height:0;margin:var(--nano-space-1) 4px;border-top:var(--dsh-hairline-width) solid var(--dsw-alias-border-l3)}
.dnls-statusbar{position:relative;z-index:var(--nano-layer-local3);flex:none;display:flex;align-items:center;gap:var(--nano-space-2);height:26px;padding:0 10px;border-top:var(--dsh-hairline-width) solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11)}
.dnls-statusbar-text{display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dnls-statusbar-actions{flex:none;display:flex;align-items:center;gap:var(--nano-space-1)}
.dnls-statusbar-btn{height:20px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-11);white-space:nowrap;cursor:pointer}
.dnls-statusbar-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dnls-statusbar-btn[aria-pressed="true"]{background:color-mix(in srgb,var(--dsw-alias-link) 22%,transparent);color:var(--dsw-alias-label-primary)}
.dnls-statusbar-btn:disabled{opacity:.45;cursor:default}
.dnls-dock{position:relative;z-index:var(--nano-layer-local6);flex:none;display:flex;flex-direction:column;min-height:120px;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);border-top:var(--dsh-hairline-width) solid var(--dsw-alias-border-l2)}
.dnls-dock-grip{position:absolute;left:0;right:0;top:-3px;height:7px;cursor:row-resize;touch-action:none}
.dnls-dock-grip:hover{background:color-mix(in srgb,var(--dsw-alias-link) 35%,transparent)}
.dnls-dock-body{display:flex;flex-direction:column;gap:var(--nano-space-2);flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;padding:var(--nano-space-2) var(--nano-space-3)}
`
