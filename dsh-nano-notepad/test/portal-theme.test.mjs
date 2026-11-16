/**
 * Window-scoped popups (NUE-1117 P9-01/P9-02; DESIGN.md §3, §5).
 *
 * The notepad's window can be pinned to light while the host runs dark. Menus and
 * dialog cards used to portal to `document.body`, so nano-ui took a `theme:` prop
 * per call and stamped `[data-nano-theme]` on the portaled surface, which the
 * notepad then repainted from a hand-copied palette. That whole adapter is gone:
 *
 *   1. every popup now renders inside `.np-window` (`container:` on the call),
 *   2. the window carries a nano-ui ThemeScope whose injected `--dsw-*` values
 *      reach everything rendered inside it, and
 *   3. no call site passes `theme:` or `z:` any more.
 *
 * Both source trees are overridable so NUE1117-T26 can run this file against the
 * pre-hard-cut commit: `NP_SRC` (default `dsh-nano-notepad/src/client`) and
 * `NANO_UI_SRC` (default `packages/dsh-nano-ui/src`).
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
const NANO_MENU = readOrEmpty(join(NANO_UI_SRC, 'menu.js'))
const NANO_OVERLAY = readOrEmpty(join(NANO_UI_SRC, 'overlay.js'))

/** Every `name(` call's argument text, paren-balanced. */
function callArgs(source, name) {
  const found = []
  const needle = `${name}(`
  let from = 0
  for (;;) {
    const at = source.indexOf(needle, from)
    if (at < 0) return found
    const lineStart = source.lastIndexOf('\n', at) + 1
    if (/function\s+$/.test(source.slice(lineStart, at))) { from = at + needle.length; continue }
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

const hasProp = (args, name) => new RegExp(`(^|[\\s{,])${name}\\s*:`).test(args)

test('every notepad popup renders inside the window and passes no theme/z', () => {
  for (const callee of ['openNanoMenu', 'openNanoDialog']) {
    const calls = callArgs(PANEL, callee)
    assert.ok(calls.length > 0, `expected at least one ${callee} call site`)
    calls.forEach((args, index) => {
      assert.ok(hasProp(args, 'container'), `${callee} call #${index + 1} must pass container (window overlay / in-place menu)`)
      assert.equal(hasProp(args, 'theme'), false, `${callee} call #${index + 1} must not pass theme — ThemeScope owns the scheme`)
      assert.equal(hasProp(args, 'z'), false, `${callee} call #${index + 1} must not pass z — the window layer owns stacking`)
      assert.equal(hasProp(args, 'region'), false, `${callee} call #${index + 1} must not pass a rect region`)
    })
  }
})

test('the container is the window element variable, not a measured rect', () => {
  assert.match(PANEL, /const panel = must\(host, '\.np-window'\)/, 'the window element is captured as `panel`')
  for (const args of callArgs(PANEL, 'openNanoMenu')) {
    assert.match(args, /container:\s*panel\b/, 'menus mount inside the window element itself')
  }
  const dialogs = callArgs(PANEL, 'openNanoDialog')
  assert.equal(dialogs.length, 1, 'one dialog adapter carries every card')
  assert.match(dialogs[0], /container:\s*viewport \? undefined : panel/, 'window cards use the window; the fx card is main-window level')
})

test('nano-ui mounts in place: container means portal:false and no body fallback', () => {
  assert.ok(NANO_DOM.length > 0, 'nano-ui ships src/dom.js')
  assert.ok(NANO_OVERLAY.length > 0, 'nano-ui ships src/overlay.js (window dialogs, DESIGN.md §5.3)')
  assert.match(NANO_DOM, /portal:\s*container === undefined/, 'openNanoMenu only portals without a container')
  assert.match(NANO_DOM, /mount\(container \?\? document\.body\)/, 'the mount parent is the container when given')
  assert.match(NANO_MENU, /portal = true/, 'NanoMenu still defaults to the host portal layer')
  assert.match(NANO_MENU, /className: 'nano-anchor'/, 'the in-place list anchors inside its container')
  assert.match(NANO_OVERLAY, /createPortal\(overlay, container\)/, 'window dialogs portal into the owner element')
  assert.match(NANO_OVERLAY, /overlays never fall back to document\.body/, 'a missing container throws instead of falling back')
})

test('the theme/z adapter is gone from nano-ui and from the notepad', () => {
  for (const [where, text] of [['panel.js', PANEL], ['dom.js', NANO_DOM], ['menu.js', NANO_MENU], ['overlay.js', NANO_OVERLAY]]) {
    assert.equal(text.includes('data-nano-theme'), false, `${where} still stamps data-nano-theme`)
  }
  assert.equal(NANO_DOM.includes('wantsTheme'), false, 'the portal theme observer is deleted')
  assert.equal(/theme:\s*options\.theme/.test(NANO_DOM), false, 'openNanoMenu no longer forwards a theme')
  assert.equal(/zIndex\s*=\s*String/.test(NANO_DOM), false, 'the dialog layer no longer takes an explicit z')
  assert.equal(/setTheme/.test(NANO_DOM), false, 'the dialog handle no longer exposes setTheme')
})

test('the hand-copied light/dark palette is deleted', () => {
  /* The two rules that repainted [data-nano-theme] carried literal hex values for
     the whole --dsw set. ThemeScope injects the catalog values instead. */
  assert.equal(/\[data-nano-theme=/.test(PANEL), false, 'no [data-nano-theme] selector')
  for (const literal of ['#303136a3', '#fcfdfeb3', '#2631480f', '#f25a5a26']) {
    assert.equal(PANEL.includes(literal), false, `panel.js still carries the hand-copied colour ${literal}`)
  }
  assert.equal(/--dsw-menu-surface-fill:\s*#/.test(PANEL), false, 'no hand-painted menu surface token')
})

test('the notepad learns its scheme from ThemeScope only', () => {
  assert.match(PANEL, /createThemeScope\(\{/, 'panel.js creates a ThemeScope')
  assert.match(PANEL, /themeScope\.scheme\(\)/, 'resolvedTheme() delegates to the scope')
  assert.ok((PANEL.match(/createThemeScope\(/g) ?? []).length >= 2, 'the window and the launcher each own a scope')
  assert.match(PANEL, /themeScope\.setPin\(/, 'the pin follows the notepad theme setting')
  assert.equal(/function\s+schemeOf|schemeOf\s*=/.test(PANEL), false, 'no local scheme resolver survives')
})
