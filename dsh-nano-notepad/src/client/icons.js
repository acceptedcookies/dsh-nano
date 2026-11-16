/** Icon facade for the notepad's DOM-built surfaces (DESIGN.md §6.1, §10).
 *
 * Two host channels exist and both are used here: the ui-theme sprite (`#dsw-icon-<glyph>-<weight>`)
 * through nano-ui's `iconMarkup`, and — for the glyphs the host does not ship — the local drawings
 * below. This is the only file in the package that emits `<svg>` markup, which is exactly what
 * `check-ui-rules` U4 expects from an icon module.
 *
 * nano-ui-exempt: the host sprite has no typographic glyphs (paragraph / H1–H3 / bold / italic /
 * strike / numbered list / quote) and no window-chrome glyphs (minimize / maximize / restore /
 * macOS traffic lights), and the host `Icon*` React components cannot be rendered from the
 * innerHTML-built toolbar and title bar. Those drawings stay local; see DESIGN.md §10.
 */
import { iconMarkup } from 'dsh-nano-ui'

/** Sprite glyph through the nano-ui facade; warns once when the catalog lacks the name. */
export const dshIcon = (glyph, weight = 'regular', size = 16) => iconMarkup(glyph, weight, size)

/** Noto/Material-shaped path for a typographic control the host does not carry. */
export const googleIcon = path => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`

/** Lettered stand-in for H1/H2/H3 — the sprite has no heading glyphs. */
export const textIcon = label => `<svg viewBox="0 0 24 24" aria-hidden="true"><text x="12" y="16.5" text-anchor="middle" font-size="10" font-weight="700" font-family="inherit">${label}</text></svg>`

/* Sidebar glyph. The sprite ships the outline only, so the tree-open state is carried by the
   button's own `aria-expanded` styling instead of a filled variant the host does not export. */
export const PANEL_ICON = () => dshIcon('panel-left-outline')

/* Window-chrome glyphs. Sizes follow the macOS traffic-light (13px) and Windows caption (11px)
   geometry set in panel.js; the host has no minimize/maximize/restore sprite. */
export const WIN_MIN_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6h10" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>'
export const MAC_MIN_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6h7" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
export const MAC_MAX_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2.5v7M2.5 6h7" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
export const WIN_MAX_ICON = '<svg class="np-icon-max" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2h8v8H2z" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>'
export const WIN_RESTORE_ICON = '<svg class="np-icon-restore" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3h6v6H3z M1 5V1h4" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>'
