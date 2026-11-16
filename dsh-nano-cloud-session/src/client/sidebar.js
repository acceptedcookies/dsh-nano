/** Host sidebar toggle for the collapsed-rail entry.
 *
 *  `layout` is deliberately NOT part of this plugin's `inject` list: the section
 *  must render (and offer settings) even when the host layout plugin is absent,
 *  and adding it would create a new startup-time hard dependency. Cordis' context
 *  property proxy throws `cannot get property "layout" without inject` for an
 *  undeclared service, and an optional chain does not catch that proxy error — so
 *  the service is soft-read through `ctx.get`, the same shape [DNEE] and [DNMS]
 *  use for optional services (INTRODUCTION.md §2.6).
 */

/**
 * Toggle the host sidebar once. Never throws.
 * @param {{ get?: (name: string) => unknown }} ctx - plugin context.
 * @returns {boolean} whether the host toggle was invoked.
 */
export function expandSidebar(ctx) {
  try {
    const layout = ctx?.get?.('layout')
    if (typeof layout?.toggleSidebar !== 'function') return false
    layout.toggleSidebar()
    return true
  } catch {
    return false
  }
}
