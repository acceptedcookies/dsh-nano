/**
 * Dialog geometry + form-control skin (NUE-1117 P9-01; DESIGN.md §5).
 *
 * Two bugs from the region era are kept as regressions, and the region contract
 * itself is replaced by the window-overlay one:
 *
 *   1. The old adapter resized the shell Modal's portal layer to a measured rect
 *      (`region`), so the mask hung past the owning window's corners unless the
 *      layer was border-box. Window cards now render into `.np-window` through
 *      nano-ui's overlay, whose mask is `inset: 0` inside the window itself — the
 *      card keeps its pixel sizes (`width` / `maxHeight` / `fixedHeight`) and the
 *      overlay supplies the geometry.
 *   2. `.np-dlg-body input` styled *every* input as a full-width text field, so
 *      the S3 endpoint form's checkbox rendered as a 300px slab with 8px padding
 *      instead of a 13px box. That rule and its row variant stay pinned here.
 *
 * `NANO_UI_SRC` / `NP_SRC` let NUE1117-T26 run this file against the pre-hard-cut
 * tree (which still carries `region` and no `container`).
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

const PANEL = read(join(NP_SRC, 'panel.js'))
const NANO_DOM = readOrEmpty(join(NANO_UI_SRC, 'dom.js'))
const NANO_OVERLAY = readOrEmpty(join(NANO_UI_SRC, 'overlay.js'))
const NANO_STYLES = readOrEmpty(join(NANO_UI_SRC, 'styles.js'))

/** The one `openNanoDialog({…})` call's argument text (the notepad has a single adapter). */
function dialogArgs() {
  const at = PANEL.indexOf('openNanoDialog({')
  assert.ok(at >= 0, 'panel.js must call openNanoDialog')
  let depth = 0
  const start = at + 'openNanoDialog'.length
  for (let i = start; i < PANEL.length; i += 1) {
    if (PANEL[i] === '{') depth += 1
    else if (PANEL[i] === '}') {
      depth -= 1
      if (depth === 0) return PANEL.slice(start, i + 1)
    }
  }
  throw new Error('unbalanced openNanoDialog call')
}

test('window cards declare the window container and keep their pixel sizes', () => {
  const args = dialogArgs()
  assert.match(args, /container:\s*viewport \? undefined : panel/, 'a window card renders inside .np-window; the fx card is main-window level')
  assert.equal(/(^|[\s,{])region\s*:/.test(args), false, 'the measured-rect region is retired')
  assert.match(args, /width:\s*viewport \? Math\.min\(680, Math\.round\(window\.innerWidth \* 0\.7\)\) : Math\.round\(rect\.width \* 0\.6\)/, 'card width keeps its original figures')
  assert.match(args, /maxHeight:\s*cap \+ 24/, 'card max height keeps its original figure')
  assert.match(args, /fixedHeight:\s*spec\.fixedHeight === true \? cap : undefined/, 'tabbed cards keep their fixed height')
})

test('the window overlay owns the mask and the card box', () => {
  assert.match(NANO_OVERLAY, /assertContainer\(container, 'NanoWindowDialog'\)/, 'a detached container throws instead of falling back to body')
  assert.match(NANO_OVERLAY, /style\.width = `min\(\$\{Math\.round\(width\)\}px, 100%\)`/, 'width is capped by the container')
  assert.match(NANO_OVERLAY, /style\.maxHeight = `min\(\$\{Math\.round\(maxHeight\)\}px, 100%\)`/, 'max height is capped by the container')
  assert.match(NANO_OVERLAY, /style\.height = `min\(\$\{Math\.round\(fixedHeight\)\}px, 100%\)`/, 'fixed height is capped by the container')
  assert.match(NANO_OVERLAY, /useModalLayer\(cardRef, true, onCancel\)/, 'Escape / focus trap / focus return come from the host modal stack')
  assert.match(NANO_STYLES, /\.nano-overlay \{[^}]*inset: 0/, 'the mask covers the container')
  assert.match(NANO_STYLES, /\.nano-overlay \{[^}]*pointer-events: auto/, 'the layer turns hit-testing back on inside the window')
  assert.equal(/MutationObserver/.test(NANO_DOM), false, 'the portal observer is gone')
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
