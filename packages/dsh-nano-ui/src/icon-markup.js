/** React-free half of the icon facade: sprite markup and catalog name checks. */

export const SPRITE_WEIGHTS = Object.freeze(['regular', 'medium'])

/**
 * `<svg><use>` against the document sprite that ui-theme maintains (`#dsw-icon-<glyph>-<weight>`).
 * @param {string} glyph - sprite glyph key, e.g. `close-outline`.
 * @param {'regular' | 'medium'} [weight]
 * @param {number} [size] - px.
 */
export function spriteMarkup(glyph, weight = 'regular', size = 16) {
  if (typeof glyph !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(glyph)) throw new TypeError(`dsh-nano-ui: bad sprite glyph "${glyph}"`)
  if (!SPRITE_WEIGHTS.includes(weight)) throw new TypeError(`dsh-nano-ui: bad sprite weight "${weight}"`)
  const id = `dsw-icon-${glyph}-${weight}`
  return `<svg width="${size}" height="${size}" data-icon="${id}" aria-hidden="true"><use href="#${id}"/></svg>`
}

/**
 * @param {{ glyphs: string[], weights: string[] } | undefined} sprite - `catalog/icons.json#sprite`.
 * @returns {boolean} whether the catalog records this glyph and weight.
 */
export function isSpriteGlyph(sprite, glyph, weight = 'regular') {
  return sprite?.glyphs?.includes(glyph) === true && sprite?.weights?.includes(weight) === true
}

/**
 * @param {{ components: Record<string, string[]> } | undefined} icons - `catalog/icons.json`.
 * @returns {boolean} whether any recorded host release exports this `Icon*` component.
 */
export function isIconComponent(icons, name) {
  if (typeof name !== 'string' || !/^Icon[A-Z]/.test(name)) return false
  return Object.values(icons?.components ?? {}).some(list => list.includes(name))
}
