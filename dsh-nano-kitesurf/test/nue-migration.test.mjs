/**
 * nue-migration.test.mjs — NUE-1117 Phase 7 migration contract for [DNK].
 *
 * NUE1117-T22: the pane's scheme comes from nano-ui `createThemeScope` (no local
 * `schemeOf` anywhere in the file, `BrowserPane` parameters included), the
 * viewport menu renders inside the workspace (`openNanoMenu({ container })`, no
 * `theme`), the settings dialog is a window overlay (`openNanoDialog({
 * container })`, no `region`), the interactive error toast is the host `Toast`
 * through `NanoToast` (`actions` + `anchor`, no `.nano-toast` reuse), the browser
 * arrows are catalog `IconChevron*` instead of hand-drawn SVG, and every `nks-*`
 * class referenced from source has a style definition (U9 = 0).
 *
 * Scan scope: every `.js`/`.mjs` file under `dsh-nano-kitesurf/src` (the
 * browser and host author trees; tests and build output are excluded). The
 * zero-scan helpers are guarded by a positive-control fixture carrying each
 * violation, so a typo in a pattern cannot turn a zero into a pass.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'src')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(jsx?|mjs)$/.test(name) ? [path] : []
  })
}

const sources = walk(srcDir).map((path) => ({ path: relative(root, path), text: readFileSync(path, 'utf8') }))
const index = sources.find((file) => file.path === join('src', 'client', 'index.js'))?.text ?? ''
const SETTINGS_TABS = index.slice(index.indexOf('function SettingsTabs'), index.indexOf('function SettingsTabs') + 400)

/** Count matches of `re` per file; [{ path, count }] with the zero-count files dropped. */
function countIn(files, re) {
  const hits = []
  for (const file of files) {
    const count = (file.text.match(re) ?? []).length
    if (count > 0) hits.push({ path: file.path, count })
  }
  return hits
}

/** `name({ … })` call sites with the following slice of source as `args`. */
function callArgs(files, name, span = 1800) {
  const re = new RegExp(`\\b${name}\\(\\{`, 'g')
  const calls = []
  for (const file of files) {
    for (const match of file.text.matchAll(re)) calls.push({ path: file.path, args: file.text.slice(match.index, match.index + span) })
  }
  return calls
}

/** `h(Component, { … })` call sites with the props slice. */
function componentProps(files, component, span = 400) {
  const re = new RegExp(`h\\(${component},\\s*\\{`, 'g')
  const calls = []
  for (const file of files) {
    for (const match of file.text.matchAll(re)) calls.push({ path: file.path, props: file.text.slice(match.index, match.index + span) })
  }
  return calls
}

/** Class names defined by rules in the pane's STYLE string. */
function definedClasses(text) {
  return new Set([...text.matchAll(/\.(nks-[a-z0-9-]+)/g)].map((match) => match[1]))
}

/** Class names the source puts on an element via a literal className. */
function usedClasses(files) {
  const used = new Set()
  for (const file of files) {
    for (const match of file.text.matchAll(/className:\s*['"]([^'"]+)['"]/g)) {
      for (const name of match[1].split(/\s+/)) if (name.startsWith('nks-')) used.add(name)
    }
  }
  return used
}

function missingClasses(styleText, sourceText) {
  const defined = definedClasses(styleText)
  return [...usedClasses([{ path: 'fixture.js', text: sourceText }])].filter((name) => !defined.has(name))
}

/** True for `name: value` and for the shorthand `name` inside an options object. */
function hasParam(args, name) {
  return new RegExp(`(?:^|[{,\\s])${name}\\s*[,:]`).test(args)
}

test('T22: the source walk reached the DNK author tree', () => {
  assert.ok(sources.length >= 6, `expected the BNK source tree, walked ${sources.length} file(s)`)
  assert.ok(sources.some((file) => file.path === join('src', 'client', 'index.js')))
  assert.ok(index.length > 10_000, 'src/client/index.js is the pane under test')
  assert.ok(countIn(sources, /data-nks-workspace/g).length >= 1, 'the workspace element is still the anchor')
})

test('T22 control: the zero-scan patterns report a fixture that carries them', () => {
  const fixture = [{
    path: 'fixture.js',
    text: [
      'function BrowserPane({ copy, schemeOf }) {}',
      "className: 'nano-toast nks-toast-fix nks-known nks-missing'",
      'openNanoDialog({ region, width: 420 })',
      "openNanoMenu({ theme: 'dark', items: [] })",
      "h('svg', { viewBox: '0 0 16 16' })",
    ].join('\n'),
  }]
  assert.equal(countIn(fixture, /\bschemeOf\b/g).length, 1, 'schemeOf fixture')
  assert.equal(countIn(fixture, /\bnano-toast\b/g).length, 1, 'nano-toast fixture')
  assert.equal(countIn(fixture, /h\('svg'|viewBox/g)[0]?.count, 2, 'inline SVG fixture')
  assert.equal(callArgs(fixture, 'openNanoDialog').filter((call) => hasParam(call.args, 'region')).length, 1)
  assert.equal(callArgs(fixture, 'openNanoDialog').filter((call) => hasParam(call.args, 'container')).length, 0)
  assert.equal(callArgs(fixture, 'openNanoMenu').filter((call) => hasParam(call.args, 'theme')).length, 1)
  assert.deepEqual(missingClasses('.nks-known{color:red}', "className: 'nks-known nks-missing'"), ['nks-missing'])
  assert.equal(componentProps(fixture, 'NanoToast').length, 0)
})

test('T22: the pane scheme comes from ThemeScope, not a local schemeOf', () => {
  assert.deepEqual(countIn(sources, /\bschemeOf\b/g), [], 'schemeOf identifiers (definition, call sites and BrowserPane parameters)')
  assert.equal(/function\s+BrowserPane\([^)]*schemeOf/.test(index), false, 'BrowserPane no longer receives a scheme resolver')
  assert.ok(countIn(sources, /createThemeScope/g).length >= 1, 'createThemeScope is used')
  assert.match(index, /createThemeScope\(\{\s*theme,\s*element,\s*subscribe:\s*onThemeChange\s*\}\)/)
  assert.match(index, /theme:\s*ctx\.theme/)
  assert.match(index, /onThemeChange:\s*\(listener\)\s*=>\s*ctx\.on\('theme\/change', listener\)/)
})

test('T22: the settings dialog is a window overlay inside the workspace', () => {
  const calls = callArgs(sources, 'openNanoDialog')
  assert.equal(calls.length, 4, 'settings, the page-open error dialog, the engine log and the restart confirmation')
  for (const call of calls) {
    assert.match(call.args, /container:\s*workspaceEl/, 'container carries the workspace element')
    assert.equal(hasParam(call.args, 'region'), false, 'no region rectangle')
  }
  assert.match(index, /const workspaceEl = workspaceRef\.current/, 'the element itself, not getBoundingClientRect()')
  assert.match(index, /ref:\s*workspaceRef/, 'the section owns the ref')
  const settingsHead = index.slice(index.indexOf('function openSettings'), index.indexOf('function openSettings') + 600)
  assert.equal(settingsHead.includes('getBoundingClientRect'), false, 'openSettings no longer measures a viewport rectangle')
})

test('T22: menus render inside the workspace without a theme parameter', () => {
  const calls = callArgs(sources, 'openNanoMenu')
  assert.equal(calls.length, 3, 'viewport, devtools resource-type and console-level menus')
  const args = calls.map((call) => call.args)
  assert.ok(args.some((text) => /container:\s*workspaceRef\.current/.test(text)), 'viewport menu is mounted in the workspace (portal:false)')
  assert.ok(args.some((text) => /container:\s*event\.currentTarget\.closest\('\[data-nks-workspace\]'\)/.test(text)), 'devtools menu is mounted in the workspace')
  for (const text of args) assert.equal(hasParam(text, 'theme'), false, 'no theme parameter')
})

test('T22: the interactive toast is NanoToast with actions and an anchor', () => {
  assert.deepEqual(countIn(sources, /\bnano-toast\b/g), [], '.nano-toast literal')
  assert.deepEqual(countIn(sources, /\bnks-toast-fix\b/g), [], 'the self-drawn toast variant')
  const toasts = componentProps(sources, 'NanoToast')
  assert.equal(toasts.length, 1, 'one NanoToast call site')
  assert.match(toasts[0].props, /anchor:\s*workspaceRef\.current/)
  assert.match(toasts[0].props, /actions:\s*toastFix\s*\?/)
  assert.match(toasts[0].props, /onClick:\s*repairNow/)
})

test('T22: browser arrows are catalog chevrons, not hand-drawn SVG', () => {
  assert.match(index, /IconChevronLeftOutlineRegular/)
  assert.match(index, /IconChevronRightOutlineRegular/)
  assert.deepEqual(countIn(sources, /h\('svg'|viewBox/g), [], 'inline SVG arrows')
  assert.deepEqual(countIn(sources, /\barrowGlyph\b/g), [], 'the hand-drawn arrow helper')
})

test('T22: every nks-* class in source has a style definition (U9 = 0)', () => {
  const used = usedClasses(sources)
  assert.ok(used.size >= 20, `expected the pane class set, found ${used.size}`)
  assert.deepEqual([...used].filter((name) => !definedClasses(index).has(name)), [], 'class referenced from source with no rule in STYLE')
  // The four compound-selector classes the scanner used to miss now have their own rules,
  // and the unstyled nks-primary marker is gone.
  for (const name of ['nks-tool-glyph', 'nks-dt-grow', 'nks-nav-toggle', 'nks-dom']) {
    assert.ok(definedClasses(index).has(name), `.${name} is defined`)
  }
  assert.equal(used.has('nks-primary'), false, 'nks-primary has no rule and is no longer referenced')
})

test('T22: the settings tab strip still follows the nano-ui NanoTabs contract', () => {
  assert.match(index, /h\(NanoTabs, \{/)
  assert.match(SETTINGS_TABS, /label:\s*copy\.settingsTitle/)
  assert.match(SETTINGS_TABS, /value:\s*'env'/)
  assert.match(SETTINGS_TABS, /value:\s*'simulation'/)
  assert.doesNotMatch(SETTINGS_TABS, /value:\s*'history'/)
})

// ---- NUE-1117 review fix: layers (U6) and tokens (U1) ----

/** DESIGN.md §4: numeric stacking values live only in nano-ui `layers.js`; everything else
 *  reads `--nano-layer-*`, and a zero layer used to open a stacking context is `isolation`. */
const NUMERIC_LAYER = /z-index\s*:\s*-?\d|zIndex\s*:\s*-?\d/g

/** DESIGN.md §2 「不要写」column. Matched as the token reference a plugin would write, so the
 *  sanctioned `--dsw-alias-state-warn-primary` / `-interactive-bg-hover-danger` stay clear. */
const FORBIDDEN_TOKENS = [
  'label-error', 'danger', 'label-danger', 'fill-error',
  'warning', 'warn', 'fill-warning', 'state-warning-primary',
  'fill-success', 'state-info-primary', 'focus-ring',
  'label-invert', 'label-inverted', 'label-on-color', 'tooltip-label',
  'label-quaternary',
  'bg-primary', 'bg-secondary', 'bg-l2',
  'border-primary', 'border-subtle',
  'accent-primary', 'fill-brand',
  'link-hover', 'elevation-raised', 'radius-full', 'hairline',
]
const FORBIDDEN_TOKEN_RE = new RegExp(`--dsw-(?:alias-)?(?:${FORBIDDEN_TOKENS.join('|')})(?![\\w-])`, 'g')
const FORBIDDEN_FONT_RE = /font-family-mono|font-mono|dsw-mono|--ds-font-family-code/g

test('T22 control: the layer and token scans report a fixture that carries them', () => {
  const fixture = [{
    path: 'fixture.js',
    text: [
      '.nks-fix-a{z-index:20}',
      "style: { zIndex: 3 }",
      ...FORBIDDEN_TOKENS.map((name) => `.nks-fix-${name}{color:var(--dsw-alias-${name})}`),
      '.nks-fix-font{font:11px font-mono}',
      '.nks-fix-ok{color:var(--dsw-alias-state-warn-primary);z-index:var(--nano-layer-local2)}',
    ].join('\n'),
  }]
  assert.equal(countIn(fixture, NUMERIC_LAYER)[0]?.count, 2, 'z-index / zIndex fixtures')
  const hits = [...fixture[0].text.matchAll(FORBIDDEN_TOKEN_RE)].map((match) => match[0])
  assert.equal(hits.length, FORBIDDEN_TOKENS.length, 'one hit per §2 「不要写」name')
  for (const name of FORBIDDEN_TOKENS) assert.ok(hits.includes(`--dsw-alias-${name}`), name)
  assert.deepEqual([...fixture[0].text.matchAll(FORBIDDEN_FONT_RE)].map((match) => match[0]), ['font-mono'])
})

test('T22: no numeric stacking values and no DESIGN.md §2 「不要写」tokens', () => {
  assert.deepEqual(countIn(sources, NUMERIC_LAYER), [], 'numeric z-index / zIndex in the author tree')
  assert.deepEqual(countIn(sources, FORBIDDEN_TOKEN_RE), [], 'tokens on the DESIGN.md §2 「不要写」list')
  assert.deepEqual(countIn(sources, FORBIDDEN_FONT_RE), [], 'monospace font keywords instead of --dsh-font-family-code')
  // The replacement tokens are the sanctioned ones, and the nano-ui layer variables the
  // plugin now reads are emitted by NANO_STYLES (LAYER_CSS :root) before STYLE.
  assert.match(index, /style\.textContent = NANO_STYLES \+ STYLE/)
  assert.match(index, /var\(--nano-layer-local\d\)/)
  assert.match(index, /var\(--nano-layer-overlay\)/)
  assert.match(index, /var\(--dsw-alias-state-error-primary\)/)
})

