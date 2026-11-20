/** Workbench shell measured from the design-mode pane: 38px bar, 216px slide
 * drawer, 26px status line, drag-up sheet. The host has no closable vertical
 * document list and no status sheet, so the geometry lives here and callers
 * fill it with host primitives. */
import React from 'react'

const h = React.createElement

export function WorkbenchShell({ label, bar, drawer, dock, shellRef, children, ...rest }) {
  return h('section', { ...rest, ref: shellRef, className: 'nano-shell' },
    h('div', { className: 'nano-shell-bar', role: 'toolbar', 'aria-label': label }, bar),
    h('div', { className: 'nano-shell-body' }, children),
    drawer ?? null,
    dock ?? null)
}

export function ShellTitle({ children }) {
  return h('span', { className: 'nano-shell-title' }, children)
}

export function ShellGap() {
  return h('span', { className: 'nano-shell-gap' })
}

export function TabDrawer({ open, label, onClose, children }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => { if (event.key === 'Escape') onClose?.() }
    const onDown = (event) => {
      const target = event.target
      if (ref.current?.contains(target)) return
      if (typeof target?.closest === 'function' && target.closest('[data-nano-drawer-toggle]')) return
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
    className: 'nano-drawer',
    'data-nano-drawer-state': open ? 'open' : 'closed',
    'aria-label': label,
    'aria-hidden': open ? undefined : true,
  }, h('div', { className: 'nano-drawer-list' }, children))
}

export function DrawerHead({ children }) {
  return h('div', { className: 'nano-drawer-head' }, children)
}

/* nano-ui-exempt: 宿主 Button 做不成 DNK 那种单行截断的抽屉行，名字会被折开。 */
export function DrawerRow({ current, onClick, mark, label, meta }) {
  return h('button', {
    type: 'button',
    className: 'nano-drawer-row',
    'aria-current': current ? 'page' : undefined,
    onClick,
  },
    mark ? h('span', { className: 'nano-drawer-mark' }, mark) : null,
    h('span', { className: 'nano-drawer-copy' },
      h('span', { className: 'nano-drawer-label' }, label),
      meta ? h('span', { className: 'nano-drawer-meta' }, meta) : null))
}

/* nano-ui-exempt: 宿主 Button 没有「图标+文字、28px、markdown-tag 底、按下混色」这一颗，也没有 28×28 且与宿主顶栏图标同轴的座位。度量照 DNK .nks-nav-toggle / .nks-tool。 */
export function ShellToggle({ icon, label, pressed, onClick }) {
  return h('button', {
    type: 'button',
    className: 'nano-shell-toggle',
    'data-nano-drawer-toggle': '1',
    'aria-pressed': pressed ? 'true' : 'false',
    'aria-label': label,
    onClick,
  }, icon, h('span', null, label))
}

export function ShellIcon({ icon, label, pressed, disabled, onClick }) {
  return h('button', {
    type: 'button',
    className: 'nano-shell-tool',
    'aria-label': label,
    title: label,
    'aria-pressed': pressed ? 'true' : 'false',
    disabled: disabled === true,
    onClick,
  }, icon)
}

export function ShellTail({ children }) {
  return h('span', { className: 'nano-shell-tail' }, children)
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
    const shell = event.currentTarget.closest('.nano-shell')
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
    open ? h('div', { className: 'nano-dock', style: { height: `${height}px` } },
      h('div', {
        className: 'nano-dock-grip',
        role: 'separator',
        'aria-orientation': 'horizontal',
        'aria-label': label,
        onPointerDown: drag,
      }),
      h('div', { className: 'nano-dock-body' }, children)) : null,
    h('footer', { className: 'nano-status' },
      h('span', { className: 'nano-status-text' }, text),
      h('span', { className: 'nano-status-actions' }, actions.map((action) =>
        /* nano-ui-exempt: 宿主 Button 最小档 28px，26px 状态条里的 20px 文字按钮没有对应档。 */
        h('button', {
          key: action.id,
          type: 'button',
          className: 'nano-status-btn',
          'aria-pressed': action.pressed ? 'true' : 'false',
          disabled: action.disabled === true,
          onClick: action.onClick,
        }, action.label)))))
}
