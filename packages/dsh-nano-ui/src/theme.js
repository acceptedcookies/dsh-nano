/** ThemeScope: the single place a plugin surface learns its light/dark scheme (DESIGN.md §3). */
import { schemes } from '../catalog/tokens.json'
import { hostScheme, resolveScheme, schemeDeclarations } from './theme-scheme.js'

export { resolveScheme }

/**
 * Stamp `data-nano-scheme` on an owner element and, when the owner is pinned to the other scheme
 * than the host, re-declare that scheme's `--dsw-*` values (from the catalog) on the element so
 * everything rendered inside it — window overlays and `portal:false` menus included — follows.
 *
 * @param {object} options
 * @param {{ getTheme?: () => any }} options.theme - the host `ctx.theme` service.
 * @param {HTMLElement} options.element - the owner's root element.
 * @param {'light' | 'dark'} [options.pin] - fixed scheme; omit to follow the host.
 * @param {(listener: () => void) => (() => void) | void} [options.subscribe] - wires host theme
 *   changes, e.g. `listener => ctx.on('theme/change', listener)`. The theme service itself has no
 *   subscription API; without `subscribe` the caller calls `refresh()` on change.
 * @returns {{ scheme: () => 'light' | 'dark', refresh: () => void, setPin: (pin?: 'light' | 'dark') => void, dispose: () => void }}
 */
export function createThemeScope({ theme, element, pin, subscribe }) {
  if (!(element instanceof HTMLElement)) throw new TypeError('dsh-nano-ui: createThemeScope needs an owner element')
  let current = pin
  let scheme = resolveScheme({ pin: current, theme })
  let written = []
  let disposed = false
  const clear = () => {
    for (const name of written) element.style.removeProperty(name)
    written = []
  }
  const apply = () => {
    if (disposed) return
    scheme = resolveScheme({ pin: current, theme })
    clear()
    for (const [name, value] of schemeDeclarations({ schemes, scheme, host: hostScheme(theme) })) {
      element.style.setProperty(name, value)
      written.push(name)
    }
    element.setAttribute('data-nano-scheme', scheme)
  }
  apply()
  const unsubscribe = typeof subscribe === 'function' ? subscribe(apply) : undefined
  return {
    scheme: () => scheme,
    refresh: apply,
    setPin: next => {
      current = next === 'light' || next === 'dark' ? next : undefined
      apply()
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      if (typeof unsubscribe === 'function') unsubscribe()
      clear()
      element.removeAttribute('data-nano-scheme')
    },
  }
}
