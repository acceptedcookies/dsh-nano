/**
 * nue-migration.test.mjs — NUE-1117 Phase 9 migration contract for [DNN].
 *
 * NUE1117-T25: the notepad's popups are window-scoped — every `openNanoMenu` call
 * and the non-viewport `openNanoDialog` path pass `container: panel` (the
 * `.np-window` element captured with `must(host, '.np-window')`), and no call
 * passes `theme` / `z`. `NP_PORTAL_Z`, `data-nano-theme`, `np-switch` and `np-tip`
 * are gone; the hand-copied light/dark palette is deleted in favour of nano-ui
 * ThemeScope; the slash menu is in-window DOM with this plugin's own classes; the
 * view switch and the settings rows are the host `SegmentedControl`; and every
 * sprite icon goes through the icon facade in `icons.js`.
 *
 * Scan scope: every `.js` under `dsh-nano-notepad/src/client` (the browser author
 * tree; build output and tests excluded). Every zero pattern is asserted per file,
 * and a positive-control fixture carrying all of them proves the patterns still
 * fire. `NP_SRC` overrides the tree so NUE1117-T26 can run this against `main`
 * before the migration (it must fail there).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = process.env.NP_SRC ?? join(root, 'src', 'client')

function walk(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(jsx?|mjs)$/.test(name) ? [path] : []
  })
}

const sources = walk(srcDir).map(path => ({ path: relative(srcDir, path), text: readFileSync(path, 'utf8') }))
const textOf = name => sources.find(file => file.path === name)?.text ?? ''
const panel = textOf('panel.js')
const index = textOf('index.js')
const icons = textOf('icons.js')

/** Constructs that must not appear anywhere in the author tree (asserted per file). */
const ZERO_PATTERNS = [
  ['NP_PORTAL_Z', /NP_PORTAL_Z/g],
  ['np-switch (hand-drawn segmented control)', /np-switch/g],
  ['np-tip (hand-drawn tooltip)', /np-tip/g],
  ['data-nano-theme', /data-nano-theme/g],
  ['theme: resolvedTheme()', /theme:\s*resolvedTheme\(\)/g],
  ['z: NP_PORTAL_Z', /z:\s*NP_PORTAL_Z/g],
  ['[data-nano-theme= selector', /\[data-nano-theme=/g],
  ['the hand-copied dark palette', /#303136a3|#fcfdfeb3/g],
  ['a hand-copied --dsw value', /--dsw-alias-label-primary:\s*#/g],
]

const count = (text, re) => (text.match(re) ?? []).length

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

test('T25: the source walk reached the DNN author tree', () => {
  assert.ok(sources.length >= 10, `expected the notepad author tree, walked ${sources.length} file(s)`)
  for (const name of ['panel.js', 'index.js', 'icons.js', 'cloud-settings.js']) {
    assert.ok(sources.some(file => file.path === name), `src/client/${name} is part of the scan`)
  }
  assert.ok(panel.length > 100_000, 'panel.js is the file under test')
})

test('T25 control: every zero pattern still fires on a fixture that carries it', () => {
  const fixture = [
    'const NP_PORTAL_Z = 1210',
    '<button class="np-switch" data-seg-field="theme"></button>',
    '<span class="np-tip" hidden></span>',
    'layer.setAttribute("data-nano-theme", theme)',
    'openNanoMenu({ anchor, items, theme: resolvedTheme(), z: NP_PORTAL_Z })',
    '[data-nano-theme="light"] { color-scheme: light }',
    '--dsw-alias-label-primary: #0f1115;',
    '.np-window[data-theme="dark"] { --dsw-menu-surface-fill: #303136a3 }',
  ].join('\n')
  for (const [name, re] of ZERO_PATTERNS) {
    assert.ok(count(fixture, re) > 0, `fixture carries ${name}`)
  }
})

test('T25: no legacy portal, control or theme marker is left (asserted per file)', () => {
  for (const file of sources) {
    for (const [name, re] of ZERO_PATTERNS) {
      assert.equal(count(file.text, re), 0, `${file.path} still contains ${name}`)
    }
  }
})

test('T25: all nine menus mount inside the window element and pass no theme/z', () => {
  const calls = callArgs(panel, 'openNanoMenu')
  assert.equal(calls.length, 9, `expected the nine notepad menus, found ${calls.length}`)
  calls.forEach((args, index) => {
    assert.match(args, /container:\s*panel\b/, `openNanoMenu call #${index + 1} must mount inside the .np-window element`)
    assert.equal(hasProp(args, 'theme'), false, `openNanoMenu call #${index + 1} must not pass theme`)
    assert.equal(hasProp(args, 'z'), false, `openNanoMenu call #${index + 1} must not pass z`)
  })
})

test('T25: the dialog adapter uses the window container on its non-viewport path', () => {
  const calls = callArgs(panel, 'openNanoDialog')
  assert.equal(calls.length, 1, `expected one dialog adapter, found ${calls.length}`)
  assert.match(calls[0], /container:\s*viewport \? undefined : panel\b/, 'window cards carry the window; the fx card is main-window level')
  assert.equal(hasProp(calls[0], 'theme'), false, 'the adapter passes no theme')
  assert.equal(hasProp(calls[0], 'z'), false, 'the adapter passes no z')
  assert.equal(hasProp(calls[0], 'region'), false, 'the measured-rect region is retired')
})

test('T25: the slash menu is in-window DOM with its own class names', () => {
  /* The slash popup is positioned at the caret and driven by the editor's own
     Arrow/Enter keys, so it is not an openNanoMenu caller: it is a child of the
     window element variable and needs no theme/z either. */
  assert.match(panel, /const slashMenu = must\(panel, '\.np-slash'\)/, 'the slash menu is a child of the .np-window element')
  assert.match(panel, /class="np-slash-item"/, 'rows carry the plugin class, not a nano-ui menu class')
  assert.equal(count(panel, /nano-menu-/g), 0, 'no nano-ui menu class name survives')
  assert.equal(hasProp(panel.slice(panel.indexOf('function paintSlash'), panel.indexOf('function placeSlash')), 'theme'), false, 'the slash painter passes no theme')
})

test('T25: the scheme comes from nano-ui ThemeScope, not from a per-call prop', () => {
  assert.ok(count(panel, /createThemeScope\(/g) >= 1, 'createThemeScope is used')
  assert.match(panel, /syncThemePin\(\)/, 'the pin follows the settings on every render')
  assert.match(index, /theme: ctx\.theme/, 'index.js hands the host theme service to the panel')
  assert.equal(count(index, /getTheme\(\)\.colorScheme/g), 0, 'no local scheme wrapper in the browser entry')
  assert.equal(/function\s+schemeOf|schemeOf\s*=/.test(panel), false, 'no local schemeOf survives')
})

test('T25: segmented controls are the host primitive, not the old hand-drawn one', () => {
  assert.match(panel, /import \{[^}]*SegmentedControl[^}]*\} from '@deepseek-ai\/dsh-client-ui-primitives'/, 'the host SegmentedControl is imported')
  assert.ok(count(panel, /mountNano\([^)]*SegmentedControl/g) >= 2, 'the view switch and the settings rows are mounted host controls')
  assert.match(panel, /class="np-view-switch"/, 'the toolbar view control is a mount point')
  assert.match(panel, /class="np-seg" data-seg-field=/, 'settings rows carry a mount point, not a hand-drawn track')
})

test('T25: icons go through the facade; only icons.js emits svg', () => {
  assert.equal(count(panel, /<svg\b/g), 0, 'panel.js emits no inline <svg>')
  assert.match(icons, /iconMarkup/, 'icons.js uses the nano-ui icon facade for sprite glyphs')
  assert.match(icons, /nano-ui-exempt:/, 'the host-gap drawings are registered')
  assert.equal(/<svg\b/.test(icons), true, 'icons.js is the one file allowed to draw svg')
})
