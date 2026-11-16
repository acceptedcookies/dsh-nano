/** Window shell: owns the overlay container and the ThemeScope for everything inside it. */
import React from 'react'
import { IconCloseOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { IconButton } from './button.js'
import { createThemeScope } from './theme.js'
import { Toolbar } from './toolbar.js'

const h = React.createElement
const WindowContext = React.createContext(null)

/** The enclosing FloatingWindow element: pass it as `container` to openNanoDialog / openNanoMenu. */
export function useNanoWindow() {
  return React.useContext(WindowContext)
}

/**
 * @param {object} props
 * @param {{ getTheme?: () => any }} props.theme - host `ctx.theme`.
 * @param {'light' | 'dark'} [props.pin]
 * @param {(listener: () => void) => (() => void) | void} [props.subscribe] - see createThemeScope.
 * @param {string} props.title
 * @param {React.ReactNode} [props.actions] - extra toolbar content.
 * @param {() => void} [props.onClose]
 * @param {string} [props.closeLabel]
 * @param {boolean} [props.floating] - fixed position on the window layer.
 * @param {string} [props.className]
 * @param {object} [props.style] - position and size.
 * @param {React.ReactNode} [props.children]
 */
export function FloatingWindow({ theme, pin, subscribe, title, actions, onClose, closeLabel, floating, className, style, children }) {
  const ref = React.useRef(null)
  const scope = React.useRef(null)
  const [element, setElement] = React.useState(null)
  React.useLayoutEffect(() => {
    const next = createThemeScope({ theme, element: ref.current, pin, subscribe })
    scope.current = next
    setElement(ref.current)
    return () => {
      next.dispose()
      scope.current = null
    }
  }, [theme, subscribe])
  React.useLayoutEffect(() => {
    scope.current?.setPin(pin)
  }, [pin])
  return h('section', {
    ref,
    'aria-label': title,
    className: ['nano-window', floating ? 'nano-window-floating' : '', className ?? ''].filter(Boolean).join(' '),
    style,
  },
  h(Toolbar, { label: title },
    h('span', { className: 'nano-window-title' }, title),
    actions ?? null,
    onClose === undefined ? null : h(IconButton, { icon: h(IconCloseOutlineRegular, { size: 14 }), 'aria-label': closeLabel ?? 'Close', onClick: onClose })),
  h('div', { className: 'nano-window-body' }, h(WindowContext.Provider, { value: element }, children)))
}
