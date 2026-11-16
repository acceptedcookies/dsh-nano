/** Mount a React component from DOM code. React comes from the shell's module loader. */
import React from 'react'
import { createRoot } from 'react-dom/client'

/**
 * @param {Element} el - mount point, owned by the caller.
 * @param {Function} Component
 * @param {object} [props]
 * @returns {{ update: (next: object) => void, unmount: () => void }} `update` merges props.
 */
export function mountNano(el, Component, props = {}) {
  if (!(el instanceof Element)) throw new TypeError('dsh-nano-ui: mountNano needs an element')
  const root = createRoot(el)
  let current = { ...props }
  let mounted = true
  root.render(React.createElement(Component, current))
  return {
    update: next => {
      if (!mounted) return
      current = { ...current, ...next }
      root.render(React.createElement(Component, current))
    },
    unmount: () => {
      if (!mounted) return
      mounted = false
      root.unmount()
    },
  }
}
