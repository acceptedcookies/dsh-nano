/** React-free scheme resolution shared by ThemeScope (DESIGN.md §3). */

/**
 * The host's active scheme. `ctx.theme.getTheme()` returns a snapshot whose scheme lives at
 * `active.colorScheme`; a bare `colorScheme` is read too so a flat snapshot resolves the same.
 * Anything but `light` — including a missing service or a throwing `getTheme` — is `dark`.
 * @param {{ getTheme?: () => any } | undefined} theme - the host `ctx.theme` service.
 * @returns {'light' | 'dark'}
 */
export function hostScheme(theme) {
  try {
    const snapshot = theme?.getTheme?.()
    const value = snapshot?.active?.colorScheme ?? snapshot?.colorScheme
    return value === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

/**
 * @param {{ pin?: 'light' | 'dark', theme?: { getTheme?: () => any } }} options
 * @returns {'light' | 'dark'} `pin` when it names a scheme, otherwise the host scheme.
 */
export function resolveScheme({ pin, theme } = {}) {
  if (pin === 'light' || pin === 'dark') return pin
  return hostScheme(theme)
}

/**
 * Token declarations a scope resolved to `scheme` must carry while the host runs `host`.
 * Empty when they agree: the host tokens are already right.
 * @param {{ schemes: Record<string, Record<string, string>>, scheme: string, host: string }} options
 *   `schemes` is `catalog/tokens.json#schemes`.
 * @returns {Array<[string, string]>}
 */
export function schemeDeclarations({ schemes, scheme, host }) {
  if (scheme === host) return []
  const table = schemes?.[scheme]
  if (table === undefined || table === null) throw new Error(`dsh-nano-ui: catalog has no "${scheme}" scheme table`)
  return Object.entries(table)
}
