/**
 * Dialog geometry + form-control skin.
 *
 * Two bugs the owner hit on Windows, both from a rule being wider than it meant
 * to be:
 *
 *   1. The dialog's portal layer is the shell Modal's `.root`, which is
 *      content-box with its own padding, and the mask is an absolutely
 *      positioned child (`inset: 0` → the padding box). Setting a `region`
 *      without border-box grows the layer by twice the padding, so the dimmed
 *      area hangs past the owning window's right and bottom edges.
 *   2. `.np-dlg-body input` styled *every* input as a full-width text field, so
 *      the S3 endpoint form's checkbox rendered as a 300px slab with 8px
 *      padding instead of a 13px box.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PANEL = readFileSync(join(ROOT, 'src', 'client', 'panel.js'), 'utf8')
const NANO_DOM = readFileSync(join(ROOT, '..', 'packages', 'dsh-nano-ui', 'src', 'dom.js'), 'utf8')

/** The `Object.assign(layer.style, {...})` block that applies a dialog region. */
function regionBlock() {
  const at = NANO_DOM.indexOf('if (wantsRegion)')
  assert.ok(at >= 0, 'openNanoDialog must handle the region option')
  const end = NANO_DOM.indexOf('})', at)
  return NANO_DOM.slice(at, end)
}

test('a regioned dialog layer is border-box so the mask cannot overhang', () => {
  const block = regionBlock()
  assert.match(block, /boxSizing:\s*'border-box'/, 'the regioned layer must be border-box')
  assert.match(block, /width:\s*`\$\{r\.width\}px`/)
  assert.match(block, /height:\s*`\$\{r\.height\}px`/)
})

test('a regioned dialog layer follows the owning window shape', () => {
  const block = regionBlock()
  assert.match(block, /borderRadius:\s*'var\(--dsw-radius-panel/, 'the mask must follow the window radius')
  assert.match(block, /overflow:\s*'hidden'/, 'the layer must clip the mask to that radius')
})

test('the generic dialog input skin skips checkbox and radio', () => {
  /* Several `.np-dlg-body input…` rules exist; the full-width skin is the one
     that sets width:100%. */
  const rules = [...PANEL.matchAll(/(\.np-dlg-body input[^{]*)\{([^}]*)\}/gu)]
  const skin = rules.find(match => /width:\s*100%/.test(match[2]))
  assert.ok(skin, 'panel.js must define the full-width dialog input rule')
  assert.match(skin[1], /:not\(\[type="checkbox"\]\)/, 'checkbox must be excluded from the full-width skin')
  assert.match(skin[1], /:not\(\[type="radio"\]\)/, 'radio must be excluded from the full-width skin')
})

test('checkbox and radio rows force their own cross-axis alignment', () => {
  /* `.np-dlg-body label` is a column flex with align-items:stretch and a higher
     specificity than a bare `.np-check`, so the row variant must win explicitly. */
  const rule = /\.np-check,\s*\.np-radio\s*\{([^}]*)\}/.exec(PANEL)
  assert.ok(rule, 'panel.js must define the .np-check/.np-radio row variant')
  assert.match(rule[1], /flex-direction:\s*row\s*!important/)
  assert.match(rule[1], /align-items:\s*center\s*!important/)
})
