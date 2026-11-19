/** Bottom drawer — the workspace pattern DNK's devtools established: a grab
 *  strip on the top edge that raises/lowers the panel, a host
 *  `SegmentedControl` for the view, and a collapse toggle that leaves only the
 *  head. Height is owned by the caller (it persists); this module owns only the
 *  pointer drag → clamped height arithmetic. */
import React from 'react'
import {
  Button, IconChevronDownOutlineRegular, IconChevronUpOutlineRegular, SegmentedControl,
} from '@deepseek-ai/dsh-client-ui-primitives'

const { createElement: h, useCallback } = React

/** Smallest useful drawer body (two task rows + head). */
export const DRAWER_MIN = 96
/** Ceiling leaves the timeline most of the pane; window height is the bound. */
export const drawerMax = () => Math.max(DRAWER_MIN, Math.round(window.innerHeight * 0.7))

/**
 * @param {{ t: Function, view: string, onView: (v: string) => void,
 *   options: {value: string, label: string, disabled?: boolean}[],
 *   collapsed: boolean, onCollapsed: (v: boolean) => void,
 *   height: number, onResize: (px: number) => void,
 *   accessory?: any, children?: any }} props
 */
export function Drawer({ t, view, onView, options, collapsed, onCollapsed, height, onResize, accessory, children }) {
  const startResize = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    const startY = event.clientY
    const startHeight = height
    const target = event.currentTarget
    target.setPointerCapture?.(event.pointerId)
    const move = (moveEvent) => {
      const next = startHeight + (startY - moveEvent.clientY)
      onResize(Math.max(DRAWER_MIN, Math.min(drawerMax(), Math.round(next))))
    }
    const stop = () => {
      target.releasePointerCapture?.(event.pointerId)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }, [height, onResize])

  return h('div', {
    className: 'npr-drawer',
    'data-npr': 'drawer',
    'data-collapsed': collapsed ? 'true' : 'false',
    'data-view': view,
    style: collapsed ? undefined : { height: `${height}px` },
  },
  // Grab the top edge: the human decides how much room the timeline gives up.
  h('div', {
    className: 'npr-grip',
    'data-npr': 'grip',
    role: 'separator',
    'aria-orientation': 'horizontal',
    'aria-label': t('drawer.resize'),
    onPointerDown: startResize,
  }),
  h('div', { className: 'npr-drawer-head' },
    h('div', { className: 'npr-drawer-scale' },
      h(SegmentedControl, {
        id: 'npr-drawer-view',
        value: view,
        label: t('drawer.views'),
        options,
        onChange: onView,
      })),
    h('span', { className: 'npr-drawer-spacer' }),
    accessory,
    h(Button, {
      variant: 'ghost',
      size: 'sm',
      'data-npr': 'drawer-toggle',
      'aria-expanded': collapsed ? 'false' : 'true',
      'aria-label': collapsed ? t('drawer.expand') : t('drawer.collapse'),
      icon: collapsed ? h(IconChevronUpOutlineRegular, { size: 14 }) : h(IconChevronDownOutlineRegular, { size: 14 }),
      onClick: () => onCollapsed(!collapsed),
    })),
  collapsed ? null : h('div', { className: 'npr-drawer-body', 'data-npr': 'drawer-body' }, children))
}
