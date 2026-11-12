/**
 * The notepad must always sit above the shell's own overlays. Two barriers had
 * to be crossed:
 *
 *  1. Stacking context: the shell.overlay slot mounts the plugin inside its
 *     overlayLayer div (position:absolute + z-index:20). A child's z-index can
 *     never beat an ancestor's context, so .np-layer must be reparented to
 *     document.body — otherwise even z-index:1e9 stays under shell modals.
 *  2. Magnitude: the shell modal root/backdrop is z-index:1000 and its
 *     toast/portal band is 1100. .np-layer needs 1200, and the notepad's own
 *     body-level portals (menus, dialog cards) need to clear the layer too.
 *
 * These are contractual source assertions: the real geometry was measured in
 * Chrome (mask and card of a shell dialog painted over the notepad before the
 * fix, and the settings card was captured beneath its own window when only
 * the layer was raised).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const panel = readFileSync(join(here, '../src/client/panel.js'), 'utf8')
const nanoDom = readFileSync(join(here, '../../packages/dsh-nano-ui/src/dom.js'), 'utf8')
const nanoMenu = readFileSync(join(here, '../../packages/dsh-nano-ui/src/menu.js'), 'utf8')

test('the layer reparents to document.body and is removed on unmount', () => {
  /* Without this the layer stays inside the slot's z-index:20 context and the
     shell's z-index:1000 modal wins no matter what number we pick. */
  assert.match(panel, /document\.body\.append\(layer\)/)
  assert.match(panel, /disposers\.push\(\(\) => layer\.remove\(\)\)/)
})

test('.np-layer outranks the shell modal (1000) and toast band (1100)', () => {
  const rule = panel.match(/\.np-layer \{[^}]*z-index: (\d+)/)
  assert.ok(rule, '.np-layer must declare a z-index')
  assert.ok(Number(rule[1]) > 1100, `.np-layer z-index ${rule[1]} must beat the shell's 1100 band`)
})

test('every notepad portal call passes a z above the layer', () => {
  const layerZ = Number(panel.match(/\.np-layer \{[^}]*z-index: (\d+)/)[1])
  const constMatch = panel.match(/const NP_PORTAL_Z = (\d+)/)
  assert.ok(constMatch, 'NP_PORTAL_Z constant must exist')
  assert.ok(Number(constMatch[1]) > layerZ, 'portals must clear the layer that opened them')
  const calls = [...panel.matchAll(/openNano(?:Menu|Dialog)\(\{/g)]
  const withZ = [...panel.matchAll(/openNano(?:Menu|Dialog)\(\{[\s\S]{0,800}?z: NP_PORTAL_Z/g)]
  assert.equal(calls.length, withZ.length, `${calls.length} portal calls but only ${withZ.length} pass z`)
})

test('nano-ui honours an explicit z on the dialog layer and menu root', () => {
  /* The shell Modal bakes z-index:1000 into its root class; only an inline
     style reliably outranks it (specificity against a hashed class is fragile). */
  assert.match(nanoDom, /layer\.style\.zIndex = String\(Math\.round\(options\.z\)\)/)
  assert.match(nanoDom, /wantsZ.*MutationObserver/s)
  assert.match(nanoDom, /z: options\.z/)
  assert.match(nanoMenu, /zIndex: String\(Math\.round\(z\)\)/)
})
