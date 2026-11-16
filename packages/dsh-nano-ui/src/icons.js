/** Icon facade (DESIGN.md §6.3): React code gets host `Icon*` components, DOM code gets sprite markup. */
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { sprite } from '../catalog/icons.json'
import { isSpriteGlyph, spriteMarkup } from './icon-markup.js'

/**
 * @param {string} name - host export name, e.g. `IconCloseOutlineRegular`.
 * @returns {Function} the host icon component.
 */
export function icon(name) {
  const component = /^Icon[A-Z]/.test(name) ? primitives[name] : undefined
  if (component === undefined) throw new Error(`dsh-nano-ui: the host exports no icon "${name}"`)
  return component
}

const warned = new Set()

/**
 * Sprite `<svg><use>` markup. A glyph the catalog does not record still renders (a newer host may
 * ship it) but warns once, so a typo shows up in the console instead of as an empty square.
 * @param {string} glyph
 * @param {'regular' | 'medium'} [weight]
 * @param {number} [size]
 */
export function iconMarkup(glyph, weight = 'regular', size = 16) {
  if (!isSpriteGlyph(sprite, glyph, weight) && !warned.has(`${glyph}-${weight}`)) {
    warned.add(`${glyph}-${weight}`)
    console.warn(`dsh-nano-ui: sprite glyph "${glyph}-${weight}" is not in the catalog`)
  }
  return spriteMarkup(glyph, weight, size)
}
