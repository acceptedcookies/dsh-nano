/**
 * Portal theme contract.
 *
 * The notepad's window can be pinned to light while the host runs dark. Its
 * menus and dialogs, however, portal to `document.body` — outside `.np-layer` —
 * so they resolve the host's `--dsw-*` palette and used to paint dark chrome
 * over a light notepad. The fix is a two-sided contract, both halves pinned here:
 *
 *   1. every portal call names the notepad's resolved scheme (`theme:`), and
 *   2. nano-ui stamps it as `[data-nano-theme]` on the portaled surface, which
 *      the notepad's palette rules then repaint.
 *
 * A new menu that forgets `theme:` silently regresses to the host palette, so
 * the call-site scan below is deliberately exhaustive rather than a spot check.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PANEL = readFileSync(join(ROOT, 'src', 'client', 'panel.js'), 'utf8')
const NANO_DOM = readFileSync(join(ROOT, '..', 'packages', 'dsh-nano-ui', 'src', 'dom.js'), 'utf8')
const NANO_MENU = readFileSync(join(ROOT, '..', 'packages', 'dsh-nano-ui', 'src', 'menu.js'), 'utf8')
const NANO_STYLES = readFileSync(join(ROOT, '..', 'packages', 'dsh-nano-ui', 'src', 'styles.js'), 'utf8')

/**
 * Collect the argument text of every `name(` call, paren-balanced so nested
 * object literals and calls do not truncate the slice.
 * @param {string} source - module text.
 * @param {string} name - callee identifier to match.
 * @returns {string[]} one entry per call, from the opening paren to its match.
 */
function callArgs(source, name) {
  const found = []
  const needle = `${name}(`
  let from = 0
  for (;;) {
    const at = source.indexOf(needle, from)
    if (at < 0) return found
    // Skip the definition itself (`export function openNanoMenu(options) {`).
    const lineStart = source.lastIndexOf('\n', at) + 1
    const line = source.slice(lineStart, at)
    if (/function\s+$/.test(line)) { from = at + needle.length; continue }
    let depth = 0
    let end = at + needle.length - 1
    for (let i = end; i < source.length; i += 1) {
      const ch = source[i]
      if (ch === '(') depth += 1
      else if (ch === ')') {
        depth -= 1
        if (depth === 0) { end = i; break }
      }
    }
    found.push(source.slice(at + needle.length, end))
    from = end + 1
  }
}

test('every notepad portal call names its resolved scheme', () => {
  for (const callee of ['openNanoMenu', 'openNanoDialog']) {
    const calls = callArgs(PANEL, callee)
    assert.ok(calls.length > 0, `expected at least one ${callee} call site`)
    calls.forEach((args, index) => {
      assert.match(
        args,
        /(^|[\s,{])theme:\s*resolvedTheme\(\)/,
        `${callee} call #${index + 1} must pass theme: resolvedTheme() — ` +
        'without it the popup inherits the host palette instead of the notepad\'s',
      )
    })
  }
})

test('notepad palette repaints the portaled surface for both schemes', () => {
  for (const scheme of ['light', 'dark']) {
    const rule = new RegExp(`\\[data-nano-theme="${scheme}"\\]\\s*\\{([^}]*)\\}`).exec(PANEL)
    assert.ok(rule, `panel.js must scope its ${scheme} palette to [data-nano-theme="${scheme}"]`)
    const body = rule[1]
    /* The menu skin paints itself from --dsw-menu-surface-fill, which the shell
       defines per theme on body — the exact token that leaked the host scheme. */
    assert.match(body, /--dsw-menu-surface-fill:/, `${scheme} portal palette must set --dsw-menu-surface-fill`)
    assert.match(body, /--dsw-alias-bg-layer-1:/, `${scheme} portal palette must set --dsw-alias-bg-layer-1`)
    assert.match(body, /--dsw-alias-label-primary:/, `${scheme} portal palette must set --dsw-alias-label-primary`)
    /* Derived tokens inherit their *computed* value from body, so overriding
       --dsw-alias-brand-primary alone leaves the shell Button on the host's
       scheme. The dialog footer needs these three repainted explicitly. */
    assert.match(body, /--dsw-alias-button-primary-fill:/, `${scheme} portal palette must repaint --dsw-alias-button-primary-fill`)
    assert.match(body, /--dsw-alias-button-primary-hover:/, `${scheme} portal palette must repaint --dsw-alias-button-primary-hover`)
    assert.match(body, /--dsw-alias-label-primary-foreground:/, `${scheme} portal palette must repaint --dsw-alias-label-primary-foreground`)
  }
})

test('nano-ui threads the scheme onto the portaled menu', () => {
  assert.match(NANO_MENU, /'data-nano-theme':\s*theme/, 'NanoMenu must stamp data-nano-theme on its root')
  assert.match(NANO_DOM, /theme:\s*options\.theme/, 'openNanoMenu must forward the theme option')
})

test('nano-ui threads the scheme onto the portaled dialog layer', () => {
  /* The shell Modal forwards only its own props, so the scheme must ride the
     portal layer (which owns both card and mask), not React props. */
  assert.match(NANO_DOM, /const wantsTheme = theme === 'light' \|\| theme === 'dark'/)
  assert.match(NANO_DOM, /layer\.setAttribute\('data-nano-theme', theme\)/)
  assert.match(
    NANO_DOM,
    /\(wantsRegion \|\| wantsWidth \|\| wantsTheme[^)]*\)/,
    'the portal observer must also run when only a theme is requested',
  )
})

test('dialog card resolves its own ink instead of inheriting the host colour', () => {
  /* Repainting the card light while `color` stays inherited from the dark host
     yields near-white text on a light card. The card must pair ink and surface. */
  const rule = /\.nano-dialog-card\s*\{([^}]*)\}/.exec(NANO_STYLES)
  assert.ok(rule, 'nano-ui styles must define .nano-dialog-card')
  assert.match(
    rule[1],
    /color:\s*var\(--dsw-alias-label-primary\)/,
    '.nano-dialog-card must resolve color from --dsw-alias-label-primary',
  )
})

test('an open dialog can be re-stamped when the owner flips scheme', () => {
  /* The notepad's settings card is open while the user changes the very theme
     that decides its palette, so the adapter must offer a live update. */
  assert.match(NANO_DOM, /const setTheme = next =>/, 'openNanoDialog must expose setTheme')
  assert.match(NANO_DOM, /return \{ close, setTheme \}/, 'the dialog handle must carry setTheme')
  assert.match(
    PANEL,
    /activeDialog\?\.setTheme\?\.\(theme\)/,
    'the notepad must re-stamp its open card from render()',
  )
})
