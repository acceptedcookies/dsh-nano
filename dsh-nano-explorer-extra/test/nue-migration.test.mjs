/**
 * nue-migration.test.mjs — NUE-1117 Phase 5 migration contract for [DNEE].
 *
 * NUE1117-T20: the file tree's host rows are no longer styled or probed from here
 * (`:has()`, `data-files-entry`, `data-status`, `[class*=`, `.nxe-menu*`), the three
 * button-as-tabs strips are host `SegmentedControl`, the row menu is the host `Menu`
 * through nano-ui, the pane's scheme comes from `createThemeScope`, and every card is a
 * nano-ui window overlay inside this plugin's own layer instead of a rewrite of the
 * host Modal's portal layer.
 *
 * The scan helpers are guarded by a positive control: a fixture that carries each
 * violation must be reported, so a typo in a pattern cannot turn a zero into a pass.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const repo = join(root, '..')
const srcDir = join(root, 'src')

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(jsx?|mjs)$/.test(name) ? [path] : []
  })
}

const read = rel => readFileSync(join(root, rel), 'utf8')
const sources = walk(srcDir).map(path => ({ path: relative(root, path), text: readFileSync(path, 'utf8') }))
const styles = read('src/client/styles.js')
const drawers = read('src/client/drawers.js')
const dialogs = read('src/client/dialogs.js')
const body = read('src/client/body.js')
const settings = read('src/client/settings.js')
const menu = read('src/client/menu.js')
const format = read('src/client/format.js')
const agents = read('AGENTS.md')
const design = readFileSync(join(repo, 'docs/specs/dsh-nano-ui/DESIGN.md'), 'utf8')

/** Count matches of `re` per file; [{ path, count }] with the zero-count files dropped. */
function countIn(files, re) {
  const hits = []
  for (const file of files) {
    const count = (file.text.match(re) ?? []).length
    if (count > 0) hits.push({ path: file.path, count })
  }
  return hits
}

/** nano-ui element call sites in these files, and which of them still pass a removed parameter. */
function nanoUiCalls(files) {
  const callRe = /createElement\((?:NanoDialog|NanoMenu|NanoToast|NanoWindowDialog)\s*,\s*\{/g
  const calls = []
  for (const file of files) {
    for (const match of file.text.matchAll(callRe)) {
      const args = file.text.slice(match.index, match.index + 800)
      calls.push({ path: file.path, removed: /(^|[{,\s])(theme|z|region):/.test(args) })
    }
  }
  return calls
}

/** Every `nano-ui-exempt` marker with the file that carries it. */
const exemptMarkers = sources
  .filter(file => file.text.includes('nano-ui-exempt'))
  .map(file => file.path)

/**
 * Spellings of the retired panel-confined carrier. Each one either rewrote a node this plugin does
 * not own (the host Modal's portal layer), stood a document-wide observer on `document.body`, or
 * probed a class / dead host attribute (`.nano-dialog-card`, `data-sidebar-right-pane`).
 */
const RETIRED_CARRIER = [
  { label: 'parentElement', re: /\bparentElement\b/g },
  { label: 'MutationObserver', re: /\bMutationObserver\b/g },
  { label: 'nano-dialog-card', re: /\.nano-dialog-card\b/g },
  { label: 'data-sidebar-right-pane', re: /data-sidebar-right-pane/g },
  { label: 'usePanelConfinedLayer', re: /\busePanelConfinedLayer\b/g },
  { label: 'data-nxe-card', re: /\bdata-nxe-card\b/g },
  { label: 'data-nxe-fill', re: /\bnxeFill\b|\bdata-nxe-fill\b/g },
  { label: 'nxe-confined-layer', re: /\bnxe-confined-layer\b/g },
]

/** Which retired carrier spellings these files still carry. */
function retiredCarrier(files) {
  return RETIRED_CARRIER
    .map(rule => ({ label: rule.label, hits: countIn(files, rule.re) }))
    .filter(rule => rule.hits.length > 0)
}

/** `createElement(NanoWindowDialog, {…})` sites, and whether each one names its container. */
function windowDialogCalls(files) {
  const calls = []
  for (const file of files) {
    for (const match of file.text.matchAll(/createElement\(\s*NanoWindowDialog\s*,\s*\{/g)) {
      const args = file.text.slice(match.index, match.index + 400)
      // `container: …` or the shorthand `container`; either way the property is present.
      calls.push({ path: file.path, container: /(^|[{,\s])container\s*(?=[,}:])/.test(args) })
    }
  }
  return calls
}

test('T20: the source walk reached the client tree', () => {
  assert.ok(sources.length > 10, `expected the client tree, walked ${sources.length} file(s)`)
  assert.ok(sources.some(file => file.path === join('src', 'client', 'styles.js')))
})

test('T20 control: the zero-scan patterns do report a fixture that carries them', () => {
  // Positive control: the same function, on a fixture, must find every pattern.
  const fixture = [{
    path: 'fixture.js',
    text: [
      'li[data-files-entry] > div > button',
      '.nxe-acc-letter[data-status="M"]',
      'button:has(> div [data-status])',
      'document.querySelector(\'[class*="nxe-"]\')',
      '.nxe-menu-item { }',
      'const MENU_LAYER = 80',
      'const schemeOf = () => "dark"',
    ].join('\n'),
  }]
  assert.equal(countIn(fixture, /\bdata-files-entry\b/g).length, 1)
  assert.equal(countIn(fixture, /\bdata-status\b/g).length, 1)
  assert.equal(countIn(fixture, /:has\(/g).length, 1)
  assert.equal(countIn(fixture, /\[class\*=/g).length, 1)
  assert.equal(countIn(fixture, /\.nxe-menu/g).length, 1)
  assert.equal(countIn(fixture, /\bMENU_LAYER\b/g).length, 1)
  assert.equal(countIn(fixture, /\bschemeOf\b/g).length, 1)
})

test('T20: no selector reaches into the host file tree rows', () => {
  const all = [{ path: 'src/client/styles.js', text: styles }]
  assert.deepEqual(countIn(all, /\[data-files-entry/g), [], 'data-files-entry selectors')
  assert.deepEqual(countIn(all, /\[data-status/g), [], 'data-status selectors')
  assert.deepEqual(countIn(all, /:has\(/g), [], ':has() selectors')
  assert.deepEqual(countIn(sources, /\[class\*=/g), [], '[class*=] probes')
})

test('T20: the host gap for the file tree is registered in DESIGN.md §8', () => {
  const gaps = design.split(/^## 8\./m)[1].split(/^## 9\./m)[0]
  assert.match(gaps, /文件树状态钩子/)
  assert.match(gaps, /DNEE/)
  assert.match(gaps, /着色/)
})

test('T20: the hand-drawn row menu is gone', () => {
  assert.deepEqual(countIn(sources, /\.nxe-menu/g), [], '.nxe-menu* rules and class names')
  assert.deepEqual(countIn(sources, /\bMENU_LAYER\b/g), [], 'MENU_LAYER')
  assert.deepEqual(countIn(sources, /createPortal/g), [], 'self-built body portal')
  assert.deepEqual(countIn(sources, /nano-menu\b/g), [], 'old nano-ui menu classes')
})

test('T20: the row menu is the host Menu with the portal contract', () => {
  assert.match(menu, /import \{ NanoMenu \} from 'dsh-nano-ui'/)
  assert.match(menu, /createElement\(NanoMenu, \{ menu, actions, onClose, portal: true \}\)/)
  assert.equal(/\bz:\s/.test(menu), false, 'no z parameter')
})

test('T20: the pane scheme comes from ThemeScope, not a local schemeOf', () => {
  assert.deepEqual(countIn(sources, /\bschemeOf\b/g), [], 'schemeOf')
  assert.deepEqual(countIn(sources, /data-ds-dark-theme/g), [], 'host theme attribute probing')
  assert.ok(countIn(sources, /createThemeScope/g).length >= 1, 'createThemeScope is used')
  assert.match(body, /createElement\('div', \{ 'data-nxe': 'true', ref: rootEl \}/)
  assert.match(body, /createThemeScope\(\{ theme: nxe\.theme, element, subscribe: nxe\.onThemeChange \}\)/)
  assert.match(styles, /\[data-nxe\]\[data-nano-scheme="dark"\]/)
  assert.deepEqual(countIn(sources, /\bdata-theme\b/g), [], 'the old theme attribute')
})

test('T20: no nano-ui call passes the removed theme / z / region parameters', () => {
  // Control: the same detector reports each removed parameter on a fixture, so the zero below is real.
  const fixture = [
    'createElement(NanoMenu, { menu, actions, onClose, z: 80 })',
    'createElement(NanoDialog, { title, theme: "dark" })',
    'createElement(NanoDialog, { region: element })',
  ].map((text, index) => ({ path: `fixture-${index}.js`, text }))
  assert.equal(nanoUiCalls(fixture).filter(call => call.removed).length, 3)
  const calls = nanoUiCalls(sources)
  assert.ok(calls.length >= 4, `expected the nano-ui call sites, found ${calls.length}`)
  assert.deepEqual(calls.filter(call => call.removed), [], 'a nano-ui call passes a removed parameter')
})

test('T20: three button-as-tabs strips are host SegmentedControl', () => {
  assert.match(drawers, /import \{[^}]*\bSegmentedControl\b[^}]*\} from '@deepseek-ai\/dsh-client-ui-primitives'/)
  assert.ok(countIn([{ path: 'drawers.js', text: drawers }], /createElement\(SegmentedControl, \{/g)[0].count >= 3,
    'one SegmentedControl per strip')
  // Each strip variable is asserted on its own: none of them may pick a Button variant any more.
  assert.equal(/variant:\s*tab\s*===/.test(drawers), false, 'branch tab drives a Button variant')
  assert.equal(/variant:\s*settingsTab\s*===/.test(drawers), false, 'settings tab drives a Button variant')
  assert.equal(/variant:\s*filter\s*===/.test(drawers), false, 'commit filter drives a Button variant')
  assert.equal(/'aria-pressed':\s*String\((tab|settingsTab|filter)\s*===/.test(drawers), false, 'tabs are not buttons')
  for (const id of ["id: 'nxe-branch-scope'", "id: 'nxe-repo-settings-scope'", "id: 'nxe-commit-filter'"]) {
    assert.ok(drawers.includes(id), `${id} present`)
  }
  // Each variable still selects its panel, so the control is wired to real state.
  assert.match(drawers, /onChange: value => setBranchTab\(value\)/)
  assert.match(drawers, /onChange: value => setSettingsTab\(value\)/)
  assert.match(drawers, /onChange: value => setFilter\(value\)/)
})

test('T20 control: the carrier scan reports a fixture that still confines and probes', () => {
  const fixture = [{
    path: 'fixture.js',
    text: [
      'const layer = card.parentElement',
      'new MutationObserver(run).observe(document.body, { childList: true, subtree: true })',
      "document.querySelector('.nano-dialog-card [data-nxe-card]')",
      "node.closest('[data-sidebar-right-pane]')",
      'usePanelConfinedLayer(open)',
      "card.dataset.nxeFill = '1'",
      "layer.classList.add('nxe-confined-layer')",
    ].join('\n'),
  }]
  assert.equal(retiredCarrier(fixture).length, RETIRED_CARRIER.length,
    retiredCarrier(fixture).map(rule => rule.label).join(', '))
  // The container detector must be able to fail: the same call shape without one is reported.
  const loose = [{ path: 'fixture.js', text: 'createElement(NanoWindowDialog, { copy, title })' }]
  assert.deepEqual(windowDialogCalls(loose).map(call => call.container), [false])
})

test("T20: cards are window overlays in the plugin's own layer, not rewrites of the host portal", () => {
  assert.deepEqual(retiredCarrier(sources), [], 'a retired carrier spelling came back')
  // The carrier: one plugin-owned positioned layer, handed to every card through a context.
  assert.match(dialogs, /import \{ NanoWindowDialog \} from 'dsh-nano-ui'/)
  assert.match(dialogs, /createContext\(null\)/)
  assert.match(dialogs, /className: 'nxe-dialog-layer'/)
  assert.match(dialogs, /createElement\(NanoWindowDialog, \{ \.\.\.props, container \}\)/)
  assert.match(body, /createElement\(DialogLayer, null,/)
  assert.match(styles, /\.nxe-dialog-layer\s*\{[^}]*position:\s*absolute[^}]*pointer-events:\s*none/)
  // The settings card rides the same carrier instead of the main-window Modal.
  assert.match(settings, /import \{ Dialog \} from '\.\/dialogs\.js'/)
  assert.equal(/NanoDialog/.test(dialogs + drawers + settings), false, 'a card still uses the main-window Modal')
  // Every window dialog names the container it draws into; there is no body fallback.
  const calls = windowDialogCalls(sources)
  assert.ok(calls.length >= 3, `expected the window dialog call sites, found ${calls.length}`)
  assert.deepEqual(calls.filter(call => !call.container).map(call => call.path), [], 'a card does not name its container')
})

test('T20: NanoToast is anchored on the pane', () => {
  const calls = body.match(/createElement\(NanoToast, \{[^}]*\}\)/g) ?? []
  assert.ok(calls.length >= 1, 'the pane renders the shared toast')
  for (const call of calls) assert.match(call, /anchor: rootEl\.current/)
})

test('T20: formatBytes keeps its own output and is registered as exempt', () => {
  // The host `fileSizeText` is not output-equivalent ("1.0KB" vs "1 KiB"), so the helper stays
  // and carries a marker that DESIGN.md §10 registers.
  assert.match(format, /export function formatBytes\(/)
  assert.match(format, /KiB/)
  assert.equal(format.includes('fileSizeText'), true, 'the marker names the component it declines')
  const registry = design.split(/^## 10\./m)[1]
  for (const path of exemptMarkers) {
    assert.ok(registry.includes(path), `${path} carries a marker but has no DESIGN.md §10 row`)
  }
})

test('T20: the package AGENTS describes the tree without the retired decorations', () => {
  assert.equal(agents.includes('删除线「幽灵行」'), false)
  assert.match(agents, /幽灵行/)
  assert.match(agents, /树行尾的 Git 字母、圆点/)
})
