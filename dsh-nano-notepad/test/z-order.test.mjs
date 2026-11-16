/**
 * Stacking contract (NUE-1117 P9-02; DESIGN.md §4).
 *
 * Two things still have to hold after the migration:
 *
 *  1. The shell.overlay slot mounts the plugin inside a stacking context
 *     (position:absolute + z-index:20), where no child z-index can beat the
 *     shell's modal layer. `.np-layer` must be reparented to document.body.
 *  2. `.np-layer` must outrank the host modal and portal bands. nano-ui owns
 *     those numbers (`NANO_LAYER`); the notepad reads the generated
 *     `--nano-layer-window` custom property instead of writing a figure.
 *
 * What is gone is the second, body-level portal layer: menus and dialogs render
 * inside `.np-window` now, so there is no per-call `z:` and no `NP_PORTAL_Z`.
 * `NANO_UI_SRC` / `NP_SRC` let NUE1117-T26 run this against the pre-hard-cut tree.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const NP_SRC = process.env.NP_SRC ?? join(ROOT, 'src', 'client')
const NANO_UI_SRC = process.env.NANO_UI_SRC ?? join(ROOT, '..', 'packages', 'dsh-nano-ui', 'src')

const read = path => readFileSync(path, 'utf8')
/** A nano-ui source file, or '' when the tree predates it (NUE1117-T26 runs this against 0.1.0). */
const readOrEmpty = path => (existsSync(path) ? read(path) : '')

const panel = read(join(NP_SRC, 'panel.js'))
const layers = readOrEmpty(join(NANO_UI_SRC, 'layers.js'))
const nanoDom = readOrEmpty(join(NANO_UI_SRC, 'dom.js'))
const nanoMenu = readOrEmpty(join(NANO_UI_SRC, 'menu.js'))

/** One numeric member of NANO_LAYER. */
const layerValue = name => {
  const match = new RegExp(`${name}:\\s*(\\d+)`).exec(layers)
  assert.ok(match, `NANO_LAYER.${name} must exist in layers.js`)
  return Number(match[1])
}

test('nano-ui still owns the layer table', () => {
  assert.ok(layers.length > 0, 'nano-ui must ship src/layers.js (NANO_LAYER, DESIGN.md §4)')
  assert.ok(nanoDom.length > 0, 'nano-ui must ship src/dom.js')
  assert.ok(nanoMenu.length > 0, 'nano-ui must ship src/menu.js')
})

test('the layer reparents to document.body and is removed on unmount', () => {
  /* Without this the layer stays inside the slot's own stacking context and the
     shell's modal wins no matter what number we pick. */
  assert.match(panel, /document\.body\.append\(layer\)/)
  assert.match(panel, /disposers\.push\(\(\) => layer\.remove\(\)\)/)
})

test('.np-layer reads the nano-ui window layer instead of writing a figure', () => {
  assert.match(panel, /\.np-layer \{[^}]*z-index: var\(--nano-layer-window\)/, '.np-layer must use the generated layer property')
  assert.equal(/\.np-layer \{[^}]*z-index: \d/.test(panel), false, '.np-layer must not hard-code a number')
  const window = layerValue('window')
  const portal = layerValue('hostPortal')
  assert.equal(window, 1200, 'NANO_LAYER.window is the observed 1200 figure')
  assert.ok(window > portal, `window layer ${window} must beat the host portal band ${portal}`)
  const modal = layerValue('hostModal')
  assert.ok(window > modal, `window layer ${window} must beat the host modal layer ${modal}`)
})

test('the body-level portal layer no longer exists', () => {
  assert.equal(panel.includes('NP_PORTAL_Z'), false, 'NP_PORTAL_Z is deleted')
  const calls = [...panel.matchAll(/openNano(?:Menu|Dialog)\(\{[\s\S]{0,800}?\n?\s*\}\)/g)].map(match => match[0])
  assert.ok(calls.length > 0, 'portal call sites are still there')
  for (const call of calls) {
    assert.equal(/(^|[\s,{])z\s*:/.test(call), false, 'no portal call passes z any more')
  }
})

test('nano-ui dropped its explicit-z adapter', () => {
  assert.equal(/zIndex\s*=\s*String\(/.test(nanoDom), false, 'the dialog layer no longer applies an inline z-index')
  assert.equal(/wantsZ/.test(nanoDom), false, 'the z observer is deleted')
  assert.equal(/zIndex:\s*String\(Math\.round\(z\)\)/.test(nanoMenu), false, 'the menu root no longer takes a z')
  assert.equal(/\bz\s*:\s*options\.z/.test(nanoDom), false, 'openNanoMenu forwards no z')
})
