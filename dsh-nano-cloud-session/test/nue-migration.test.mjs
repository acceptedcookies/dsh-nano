/**
 * nue-migration.test.mjs — NUE-1117 Phase 8 migration contract for [DNCS].
 *
 * NUE1117-T23: the composer graft is gone (no `composerSeat` read, no
 * `.nms-root` / `data-nano-model-selector` anchor, no `dncsCloud` document flag),
 * the Devin chip has no replacement mount point, the sidebar section paints
 * itself from host primitives and tokens (no `[class*=`, no `:has(`, no
 * `withLocal`-style class synthesis, no host custom property read), the settings
 * tabs are the React `NanoTabs` (no DOM `nanoTabs`), no `window.confirm` is left,
 * and the dialog cards take their size from `NanoDialog` props instead of a
 * `:has()` rule on nano-ui's own card class.
 *
 * Scan scope: every `.js`/`.mjs` file under `dsh-nano-cloud-session/src` (browser
 * and host author trees; tests and build output excluded). Every zero pattern is
 * asserted per file, and a positive-control fixture carrying all of them proves
 * the patterns can still fire.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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
const textOf = (rel) => sources.find((file) => file.path === join('src', 'client', rel))?.text ?? ''
const index = textOf('index.js')
const section = textOf('section.js')
const styles = textOf('styles.js')
const settings = textOf('settings-dialog.js')
const workbench = textOf('native-workbench.js')
const newDialog = textOf('new-session-dialog.js')
const sidebar = textOf('sidebar.js')

/** Constructs that must not appear anywhere in the author tree (per file). */
const ZERO_PATTERNS = [
  ['composerSeat', /composerSeat/g],
  ['.nms-root', /\.nms-root/g],
  ['data-nano-model-selector', /data-nano-model-selector/g],
  ['dncsCloud', /dncsCloud/g],
  ['window.confirm', /window\.confirm/g],
  ['a host class attribute selector', /\[\s*class\s*[*^$|~]?=/gi],
  [':has(', /:has\(/g],
  ['withLocal', /\bwithLocal\b/g],
  ['classOf', /\bclassOf\b/g],
  ['stripWide', /\bstripWide\b/g],
  ['nanoTabs (DOM tab factory)', /\bnanoTabs\b/g],
  ['getComputedStyle (host custom property read)', /\bgetComputedStyle\b/g],
  ['data-dncs-cloud', /data-dncs-cloud/g],
  ['ctx.layout (undeclared service proxy)', /\bctx\.layout\b/g],
]

const count = (text, re) => (text.match(re) ?? []).length

/** Selectors handed to `querySelector`/`querySelectorAll`, with their literal text. */
function selectors(text) {
  const found = []
  const re = /querySelector(?:All)?\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g
  for (const match of text.matchAll(re)) found.push({ selector: match[1] ?? match[2] ?? match[3], at: match.index })
  return found
}

/** A selector is allowed only when it is an attribute selector (own attribute or the
 *  `sidebar.workspaces` slot naming contract) — never a class or structure probe. */
const allowedSelector = (selector) => selector.startsWith('[') && !/class/i.test(selector) && !/(^|[\s,>+~])\./.test(selector)

test('T23: the source walk reached the DNCS author tree', () => {
  assert.ok(sources.length >= 10, `expected the DNCS author tree, walked ${sources.length} file(s)`)
  for (const rel of ['index.js', 'section.js', 'styles.js', 'settings-dialog.js', 'native-workbench.js', 'new-session-dialog.js', 'confirm.js', 'sidebar.js']) {
    assert.ok(sources.some((file) => file.path === join('src', 'client', rel)), `src/client/${rel} is part of the scan`)
  }
  assert.ok(index.length > 3_000 && section.length > 3_000, 'the browser entry and the section are the files under test')
})

test('T23 control: every zero pattern still fires on a fixture that carries it', () => {
  const fixture = [
    "const seat = document.querySelector('[class*=\"composerSeat\"]')",
    '.dncs-root [class *= "composerSeat"] { display: none }',
    '.dncs-root [ class^= "composerSeat"] { display: none }',
    '.dncs-root [CLASS$= "composerSeat"] { display: none }',
    "const anchor = seat.querySelector('.nms-root, [data-nano-model-selector=\"root\"]')",
    "document.documentElement.dataset.dncsCloud = '1'",
    'if (!window.confirm(text)) return',
    'html[data-dncs-cloud="1"] .x { display: none }',
    '.nano-dialog-card:has(.dncs-settings-root) { width: 720px }',
    'const withLocal = (token, name) => token',
    'const classOf = el => el.className',
    'const stripWide = cls => cls',
    'const tabs = nanoTabs({ items: [] })',
    'const shown = getComputedStyle(node)',
    'ctx.layout.toggleSidebar()',
  ].join('\n')
  for (const [name, re] of ZERO_PATTERNS) {
    assert.ok(count(fixture, re) > 0, `fixture carries ${name}`)
  }
  assert.deepEqual(selectors(fixture).filter(({ selector }) => !allowedSelector(selector)).map(({ selector }) => selector), [
    '[class*="composerSeat"]',
    '.nms-root, [data-nano-model-selector="root"]',
  ], 'host selectors are rejected by the guard')
})

test('T23: no host-DOM graft, no legacy confirm, no Devin chip left (asserted per file)', () => {
  for (const file of sources) {
    for (const [name, re] of ZERO_PATTERNS) {
      assert.equal(count(file.text, re), 0, `${file.path} still contains ${name}`)
    }
  }
})

test('T23: the section only queries attribute selectors, never host classes', () => {
  for (const file of sources) {
    for (const { selector } of selectors(file.text)) {
      assert.ok(allowedSelector(selector), `${file.path}: querySelector(${JSON.stringify(selector)}) probes host structure`)
    }
  }
  assert.ok(selectors(section).length >= 2, 'the slot placement query is still there')
  assert.match(section, /data-slot="sidebar\.workspaces"/, 'placement uses the host slot name, not a class')
  assert.match(section, /data-nano-cloud-session-section/, 'the graft host is our own attribute')
})

test('T23: styles carry no hidden composer rules and no nano-ui card overrides', () => {
  assert.equal(styles.includes('nano-dialog-card'), false, 'card sizing moved to NanoDialog width/fixedHeight')
  assert.equal(/\.nano-dialog-content/.test(styles), false, 'nano-ui internals are not styled from the plugin')
  assert.equal(styles.includes('composerSeat'), false, 'the composer hiding block is deleted')
  assert.equal(styles.includes('dncs-devin-chip'), false, 'the Devin chip style is deleted with its mount')
  assert.equal(styles.includes('--dsh-session-list-edge-inset'), false, 'host list geometry properties are not read')
  assert.match(styles, /--nano-space-/, 'spacing comes from the nano-ui scale')
})

test('T23: the settings tabs are the React NanoTabs contract', () => {
  assert.equal(count(settings, /\bnanoTabs\b/g), 0, 'no DOM tab factory')
  assert.ok(count(settings, /\bNanoTabs\b/g) >= 1, 'React NanoTabs is used')
  assert.match(settings, /h\(NanoTabs, \{/)
  for (const value of ['access', 'session', 'security', 'ssh']) {
    assert.match(settings, new RegExp(`value: '${value}'`), `${value} tab is declared`)
  }
  assert.equal(/useRef/.test(settings), false, 'no panel refs remain for a DOM tab factory')
})

test('T23: dialog cards take their size from NanoDialog props', () => {
  assert.match(settings, /width: 720/)
  assert.match(settings, /fixedHeight: 640/)
  assert.match(newDialog, /width: 560/)
  assert.match(newDialog, /fixedHeight: 640/)
})

test('T23: the section body is rendered from primitives and tokens', () => {
  assert.match(section, /DisclosureRow/)
  assert.match(section, /StateDot/)
  assert.match(section, /relativeTime/)
  assert.match(section, /IconButton/)
  assert.equal(/window\.document\.querySelectorAll\('button'\)/.test(section), false, 'no host button scan')
  assert.match(section, /ResizeObserver/, 'the rail is detected from our own host width')
  assert.match(section, /face\.expandSidebar\(\)/, 'the rail entry uses the host layout service')
})

test('T23: the rail expand soft-reads the layout service instead of the inject proxy', async () => {
  // Cordis throws `cannot get property "layout" without inject` on ctx.layout and an
  // optional chain cannot catch that proxy error, so the only correct read is ctx.get.
  assert.match(sidebar, /ctx\?\.get\?\.\('layout'\)/, 'layout is soft-read through ctx.get')
  assert.equal(/\bctx\.layout\b/.test(sidebar), false, 'sidebar.js never touches the undeclared proxy')
  assert.equal(/\bctx\.layout\b/.test(index), false, 'index.js never touches the undeclared proxy')
  assert.equal(/inject\s*=\s*\[[^\]]*'layout'/.test(index), false, 'layout stays out of inject (no startup hard dependency)')
  assert.match(index, /from '\.\/sidebar\.js'/, 'the helper is imported')
  assert.match(index, /expandSidebar: \(\) => expandSidebar\(ctx\)/, 'the face delegates to the helper')

  const { expandSidebar } = await import(pathToFileURL(join(root, 'src', 'client', 'sidebar.js')).href)
  let toggles = 0
  const ctx = {
    get: name => (name === 'layout' ? { toggleSidebar: () => { toggles += 1 } } : undefined),
    get layout() { throw new Error('cannot get property "layout" without inject') },
  }
  assert.equal(expandSidebar(ctx), true)
  assert.equal(toggles, 1, 'the host toggle ran exactly once')
  assert.equal(expandSidebar({ get: () => undefined }), false, 'an absent layout service falls back')
  assert.equal(expandSidebar({ get: () => ({}) }), false, 'a layout service without the method falls back')
  assert.equal(expandSidebar({ get: () => { throw new Error('boom') } }), false, 'a throwing lookup never escapes')
  assert.equal(expandSidebar(undefined), false, 'a missing context falls back')
})
