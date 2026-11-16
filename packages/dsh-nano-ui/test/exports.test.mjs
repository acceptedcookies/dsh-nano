// NUE1117-T14: public surface and icon facade.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VERSION } from '../src/version.js'
import { NANO_LAYER, NANO_SPACE, LAYER_CSS } from '../src/layers.js'
import { hostScheme, resolveScheme, schemeDeclarations } from '../src/theme-scheme.js'
import { isIconComponent, isSpriteGlyph, spriteMarkup } from '../src/icon-markup.js'
import { capClass, menuHeight, toHostItems } from '../src/menu-model.js'
import { catalog, exportedNames, read, readSrc, sourceFiles, PKG } from './_lib.mjs'
import { join } from 'node:path'

const REQUIRED = [
  'VERSION', 'NANO_LAYER', 'NANO_SPACE', 'NANO_STYLES', 'createThemeScope', 'resolveScheme', 'icon', 'iconMarkup',
  'NanoDialog', 'NanoWindowDialog', 'NanoMenu', 'NanoToast', 'nanoTabs', 'NanoTabs', 'openNanoDialog', 'openNanoMenu',
  'mountNano', 'IconButton', 'Toolbar', 'EmptyState', 'FloatingWindow',
]

test('index.js exports every 0.2.0 name', () => {
  const names = exportedNames(read(join(PKG, 'index.js')))
  for (const name of REQUIRED) assert.ok(names.has(name), name)
})

test('react-free modules export real values, not undefined', () => {
  assert.equal(typeof VERSION, 'string')
  assert.equal(typeof NANO_LAYER, 'object')
  assert.ok(Array.isArray(NANO_SPACE))
  assert.equal(typeof LAYER_CSS, 'string')
  for (const fn of [hostScheme, resolveScheme, schemeDeclarations, isIconComponent, isSpriteGlyph, spriteMarkup, capClass, menuHeight, toHostItems]) {
    assert.equal(typeof fn, 'function')
  }
})

test('icon names are checked against the catalog', () => {
  const icons = catalog('icons')
  assert.equal(isSpriteGlyph(icons.sprite, 'close-outline'), true)
  assert.equal(isSpriteGlyph(icons.sprite, 'close-outline', 'bold'), false)
  assert.equal(isSpriteGlyph(icons.sprite, 'no-such-glyph'), false)
  assert.equal(isIconComponent(icons, 'IconCloseOutlineRegular'), true)
  assert.equal(isIconComponent(icons, 'IconNoSuchThing'), false)
  assert.equal(isIconComponent(icons, 'Button'), false)
  assert.equal(spriteMarkup('close-outline'), '<svg width="16" height="16" data-icon="dsw-icon-close-outline-regular" aria-hidden="true"><use href="#dsw-icon-close-outline-regular"/></svg>')
  assert.throws(() => spriteMarkup('bad glyph'), /bad sprite glyph/)
  assert.throws(() => spriteMarkup('close-outline', 'bold'), /bad sprite weight/)
})

test('every Icon* nano-ui imports is a catalog icon component', () => {
  const icons = catalog('icons')
  const used = new Set()
  for (const { text } of sourceFiles()) for (const match of text.matchAll(/\b(Icon[A-Z]\w+)/g)) if (match[1] !== 'IconButton') used.add(match[1])
  assert.ok(used.size > 0)
  for (const name of used) assert.ok(isIconComponent(icons, name), name)
})

test('IconButton rejects a missing aria-label', () => {
  const src = readSrc('button.js')
  assert.match(src, /if \(typeof label !== 'string' \|\| label\.trim\(\) === ''\) throw new TypeError/)
})
