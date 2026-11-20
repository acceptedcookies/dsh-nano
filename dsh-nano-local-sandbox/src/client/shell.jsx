/** Workbench shell owned by this client (T-O-69: the shell is chrome, so it
 *  lives in the consumer, not in nano-ui). Geometry measured from the
 *  design-mode pane: 38px bar, 216px slide drawer, 26px status line, drag-up
 *  sheet. The host has no closable vertical document list and no status
 *  sheet, so the geometry lives here and rows stay host primitives. */
import React from 'react'

const h = React.createElement

export function WorkbenchShell({ label, bar, drawer, dock, shellRef, children, ...rest }) {
  return h('section', { ...rest, ref: shellRef, className: 'dnls-shell' },
    h('div', { className: 'dnls-shell-bar', role: 'toolbar', 'aria-label': label }, bar),
    h('div', { className: 'dnls-shell-body' }, children),
    drawer ?? null,
    dock ?? null)
}

export function ShellTitle({ children }) {
  return h('span', { className: 'dnls-shell-title' }, children)
}

export function ShellGap() {
  return h('span', { className: 'dnls-shell-gap' })
}

export function TabDrawer({ open, label, onClose, children }) {
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
  }, h('div', { className: 'dnls-drawer-list' }, children))
}

export function DrawerHead({ children }) {
  return h('div', { className: 'dnls-drawer-head' }, children)
}

/* nano-ui-exempt: 宿主 Button 做不成单行截断的抽屉行，名字会被折开。 */
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

/* nano-ui-exempt: 宿主 Button 没有「图标+文字、28px、markdown-tag 底、按下混色」这一颗，也没有 28×28 且与宿主顶栏图标同轴的座位。度量照 DNK .nks-nav-toggle / .nks-tool。 */
export function ShellToggle({ icon, label, pressed, onClick }) {
  return h('button', {
    type: 'button',
    className: 'dnls-shell-toggle',
    'data-dnls-drawer-toggle': '1',
    'aria-pressed': pressed ? 'true' : 'false',
    'aria-label': label,
    onClick,
  }, icon, h('span', null, label))
}

/* nano-ui-exempt: 宿主 Button 无 28×28 仅图标工具座位，度量照 DNK .nks-tool；与 ShellToggle 同一行登记。 */
export function ShellIcon({ icon, label, pressed, disabled, onClick }) {
  return h('button', {
    type: 'button',
    className: 'dnls-shell-tool',
    'aria-label': label,
    title: label,
    'aria-pressed': pressed ? 'true' : 'false',
    disabled: disabled === true,
    onClick,
  }, icon)
}

export function ShellTail({ children }) {
  return h('span', { className: 'dnls-shell-tail' }, children)
}

function clampHeight(shell, height) {
  const limit = Math.max(88, Math.floor((shell?.clientHeight ?? 480) * 0.6))
  return Math.min(limit, Math.max(88, Math.round(height)))
}

export function StatusDock({ label, text, actions = [], height = 0, onHeight, onCommit, children }) {
  const open = height > 0
  const drag = (event) => {
    if (event.button != null && event.button !== 0) return
    event.preventDefault()
    const shell = event.currentTarget.closest('.dnls-shell')
    const startY = event.clientY
    const startH = height
    const move = (ev) => onHeight?.(clampHeight(shell, startH + (startY - ev.clientY)))
    const up = (ev) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const next = clampHeight(shell, startH + (startY - ev.clientY))
      onHeight?.(next)
      onCommit?.(next)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  return h(React.Fragment, null,
    open ? h('div', { className: 'dnls-dock', style: { height: `${height}px` } },
      h('div', {
        className: 'dnls-dock-grip',
        role: 'separator',
        'aria-orientation': 'horizontal',
        'aria-label': label,
        onPointerDown: drag,
      }),
      h('div', { className: 'dnls-dock-body' }, children)) : null,
    h('footer', { className: 'dnls-status' },
      h('span', { className: 'dnls-status-text' }, text),
      h('span', { className: 'dnls-status-actions' }, actions.map((action) =>
        /* nano-ui-exempt: 宿主 Button 最小档 28px，26px 状态条里的 20px 文字按钮没有对应档。 */
        h('button', {
          key: action.id,
          type: 'button',
          className: 'dnls-status-btn',
          'aria-pressed': action.pressed ? 'true' : 'false',
          disabled: action.disabled === true,
          onClick: action.onClick,
        }, action.label)))))
}

/* Workbench shell styles (T-O-69). Heights match the measured design-mode
 * pane: bar 38px, drawer 216px, status 26px. Tokens only; no card fill on the
 * body. Layers and spacing come from nano-ui's --nano-* scale. */
export const SHELL_STYLES = `
.dnls-shell { position: relative; box-sizing: border-box; display: flex; flex-direction: column; height: 100%; min-height: 0;
  color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); font: var(--dsw-font-xxs-12); }
.dnls-shell-bar { position: relative; z-index: var(--nano-layer-local3); box-sizing: border-box; display: flex; flex: none; align-items: center;
  gap: var(--nano-space-2); height: 38px; padding: 5px 6px; border-bottom: var(--dsh-hairline-width) solid var(--dsw-alias-border-l3); }
/* DNK .nks-nav-toggle: one 28px pill, icon+label, markdown-tag fill, 4px inset so the left edge meets the host tab. */
.dnls-shell-toggle { display: inline-flex; flex: none; align-items: center; gap: 5px; height: 28px; margin-left: 4px; padding: 0 10px;
  border: 0; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-markdown-tag); color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxs-12); font-size: var(--dsh-content-font-size-secondary, 13px); white-space: nowrap; cursor: pointer; }
.dnls-shell-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dnls-shell-toggle[aria-pressed="true"] { background: color-mix(in srgb, var(--dsw-alias-link) 14%, var(--dsw-alias-markdown-tag)); }
/* DNK .nks-toolbar-tail / .nks-tool: 28×28 seats, 8px pitch, under the host 分栏/全屏/收起 cluster. */
.dnls-shell-tail { display: flex; flex: none; align-items: center; gap: 8px; }
.dnls-shell-tool { width: 28px; height: 28px; display: inline-flex; flex: none; align-items: center; justify-content: center; padding: 0;
  border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dnls-shell-tool:hover:not(:disabled) { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
.dnls-shell-tool[aria-pressed="true"] { color: var(--dsw-alias-label-primary); background: color-mix(in srgb, var(--dsw-alias-link) 18%, transparent); }
.dnls-shell-tool:disabled { opacity: .45; cursor: default; }
.dnls-shell-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: var(--dsw-font-xs-13); }
.dnls-shell-gap { flex: auto; }
.dnls-shell-body { flex: auto; min-height: 0; overflow: auto; }
.dnls-drawer { position: absolute; z-index: var(--nano-layer-local4); top: 44px; left: 10px; bottom: 36px; width: 216px; box-sizing: border-box;
  display: flex; flex-direction: column; min-height: 0; background: var(--dsw-alias-bg-layer-2);
  border: var(--dsh-hairline-width) solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg);
  box-shadow: var(--dsw-elevation-prominent); transform: translateX(calc(-100% - 12px)); visibility: hidden;
  transition: transform var(--ds-transition-duration-slow, .32s) var(--ds-ease-in-out, ease), visibility 0s linear var(--ds-transition-duration-slow, .32s); }
.dnls-drawer[data-dnls-drawer-state="open"] { transform: none; visibility: visible; transition: transform var(--ds-transition-duration-slow, .32s) var(--ds-ease-in-out, ease); }
@starting-style { .dnls-drawer[data-dnls-drawer-state="open"] { transform: translateX(calc(-100% - 12px)); } }
@media (prefers-reduced-motion: reduce) { .dnls-drawer, .dnls-drawer[data-dnls-drawer-state="open"] { transition: none; } }
/* DNK .nks-nav-head: 30px, hairline under it, so the title is not the first row. */
.dnls-drawer-head { display: flex; flex: none; align-items: center; height: 30px; padding: 0 10px; border-bottom: var(--dsh-hairline-width) solid var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-secondary); font: var(--dsw-font-xxxs-11); }
.dnls-drawer-list { flex: auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: var(--nano-space-1); }
/* DNK .nks-nav-tab: one row, name ellipsizes, current row is its own markdown-tag plate. */
.dnls-drawer-row { display: flex; align-items: center; gap: 7px; width: 100%; box-sizing: border-box; min-height: 30px; margin: 0; padding: 4px 8px;
  border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); font: var(--dsw-font-xxs-12); text-align: left; cursor: pointer; }
.dnls-drawer-row:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dnls-drawer-row[aria-current="page"] { background: var(--dsw-alias-markdown-tag); color: var(--dsw-alias-label-primary); }
.dnls-drawer-mark { display: inline-flex; flex: none; }
.dnls-drawer-copy { display: flex; flex-direction: column; flex: auto; min-width: 0; }
.dnls-drawer-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dnls-drawer-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11); }
.dnls-status { position: relative; z-index: var(--nano-layer-local3); flex: none; display: flex; align-items: center; gap: var(--nano-space-2);
  height: 26px; padding: 0 10px; border-top: var(--dsh-hairline-width) solid var(--dsw-alias-border-l3);
  font: var(--dsw-font-xxxs-11); color: var(--dsw-alias-label-tertiary); }
.dnls-status-text { flex: auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dnls-status-actions { flex: none; display: flex; align-items: center; gap: var(--nano-space-1); }
.dnls-status-btn { height: 20px; padding: 0 8px; border: 0; border-radius: var(--dsw-radius-sm); background: transparent;
  color: var(--dsw-alias-label-secondary); font: var(--dsw-font-xxxs-11); cursor: pointer; }
.dnls-status-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.dnls-status-btn[aria-pressed="true"] { background: color-mix(in srgb, var(--dsw-alias-link) 22%, transparent); color: var(--dsw-alias-label-primary); }
.dnls-status-btn:disabled { opacity: .45; cursor: default; }
.dnls-dock { position: relative; z-index: var(--nano-layer-local6); flex: none; display: flex; flex-direction: column; min-height: 88px;
  box-sizing: border-box; background: var(--dsw-alias-bg-base); border-top: var(--dsh-hairline-width) solid var(--dsw-alias-border-l2); }
.dnls-dock-grip { position: absolute; left: 0; right: 0; top: -3px; height: 7px; cursor: row-resize; touch-action: none; }
.dnls-dock-grip:hover { background: color-mix(in srgb, var(--dsw-alias-link) 35%, transparent); }
.dnls-dock-body { flex: auto; min-height: 0; overflow: auto; padding: var(--nano-space-2); }
`
