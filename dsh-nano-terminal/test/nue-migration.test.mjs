/**
 * nue-migration.test.mjs — NUE-1117 Phase 6 migration contract for [DNT].
 *
 * NUE1117-T21: the status bar no longer resolves the host TrajectoryToolbar's
 * hashed class names from `document.styleSheets`; it is nano-ui `Toolbar`, the
 * host height variable is gone, the U8 dead styles are deleted (not renamed),
 * and the ⊕/⚙ text glyphs are host `Icon*` components.
 *
 * Every zero assertion is guarded by a positive control: the same scanner must
 * report a fixture that injects the violation, so a typo in a pattern cannot
 * turn a zero into a pass. U8 is not re-implemented here — the repo detector in
 * `scripts/check-ui-rules.mjs` is the one that has to output 0.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PLUGINS, scanPlugin, run as runUiRules } from '../../scripts/check-ui-rules.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const repo = join(root, '..')
const srcDir = join(root, 'src')

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : /\.(jsx?|mjs)$/.test(name) ? [path] : []
  })
}

const sources = walk(srcDir).map(path => ({ path: relative(root, path), text: readFileSync(path, 'utf8') }))
const nanoTerm = readFileSync(join(srcDir, 'client/NanoTerm.jsx'), 'utf8')
const design = readFileSync(join(repo, 'docs/specs/dsh-nano-ui/DESIGN.md'), 'utf8')

/** Files that match `re`; the zero-count files are dropped. */
function countIn(files, re) {
  const hits = []
  for (const file of files) {
    const count = (file.text.match(re) ?? []).length
    if (count > 0) hits.push({ path: file.path, count })
  }
  return hits
}

/** Class names the Phase 6 baseline reported as U8 (defined in the style string, never referenced). */
const DELETED_CLASSES = [
  'dnt-statusbar',
  'dnt-statusbar-spacer',
  'dnt-statusbar-dim',
  'dnt-statusbar-termtitle',
  'dnt-statusbar-mark',
  'dnt-statusbar-stat',
  'dnt-statusbar-btnlabel',
  'dnt-statusbar-info',
  'dnt-dot',
  'dnt-lane',
  'dnt-overlay-retry',
  'dnt-size-field',
]

test('T21: the source walk reached the terminal tree', () => {
  assert.ok(sources.length > 10, `expected the package tree, walked ${sources.length} file(s)`)
  assert.ok(sources.some(file => file.path === join('src', 'client', 'NanoTerm.jsx')))
})

test('T21 control: every zero-scan pattern reports a fixture that carries it', () => {
  const fixture = [{
    path: 'fixture.jsx',
    text: [
      'const trajCache = {}',
      'function trajCls(local) { return local }',
      'for (const sheet of document.styleSheets) { sheet.cssRules }',
      'const sel = rule.selectorText',
      'const m = sel.match(/^\\.([A-Za-z0-9_-]+)_root$/)',
      '.k3f9_root{border-bottom:1px solid}',
      '.dnt-root{--dsh-trajectory-toolbar-height:32px}',
      '<div className={trajCls("root")} role="toolbar" />',
      '<span className="dnt-actionIcon" aria-hidden="true">⊕</span>',
      '<span aria-hidden="true">⚙</span>',
      'const svg = <svg viewBox="0 0 16 16" />',
      '/* nano-ui-exempt: fixture */',
      'const x = 1',
    ].join('\n'),
  }]
  for (const [pattern, expected, label] of [
    [/\btrajCls\b/g, 1, 'trajCls'],
    [/\btrajCache\b/g, 1, 'trajCache'],
    [/document\.styleSheets/g, 1, 'styleSheets probe'],
    [/\bcssRules\b/g, 1, 'cssRules probe'],
    [/selectorText/g, 1, 'selectorText'],
    [/[A-Za-z0-9_-]+_root\b/g, 1, 'hashed _root class'],
    [/--dsh-trajectory-toolbar-height/g, 1, 'host toolbar height'],
    [/role="toolbar"/g, 1, 'hand-rolled toolbar role'],
    [/⊕/g, 1, '⊕ glyph'],
    [/⚙/g, 1, '⚙ glyph'],
    [/actionIcon|toggleIcon|searchIcon/g, 1, 'text-glyph slot'],
    [/<svg\b/g, 1, 'inline svg'],
    [/nano-ui-exempt/g, 1, 'exemption marker'],
  ]) {
    assert.equal(countIn(fixture, pattern).length, expected, label)
  }
  for (const name of DELETED_CLASSES) {
    const dead = [{ path: 'fixture.jsx', text: `.${name}{display:none}\n` }]
    assert.equal(countIn(dead, new RegExp(name, 'g')).length, 1, name)
  }
})

test('T21: no host stylesheet probe remains', () => {
  assert.deepEqual(countIn(sources, /\btrajCls\b/g), [], 'trajCls')
  assert.deepEqual(countIn(sources, /\btrajCache\b/g), [], 'trajCache')
  assert.deepEqual(countIn(sources, /document\.styleSheets/g), [], 'document.styleSheets scan')
  assert.deepEqual(countIn(sources, /\bcssRules\b/g), [], 'cssRules scan')
  assert.deepEqual(countIn(sources, /--dsh-trajectory-toolbar-height/g), [], 'host toolbar height')
  // No hashed host class may be synthesised or matched either.
  assert.deepEqual(countIn(sources, /[A-Za-z0-9_-]+_root\b/g), [], 'hashed _root class')
  assert.deepEqual(countIn(sources, /selectorText/g), [], 'selectorText')
})

test('T21: the status bar is nano-ui Toolbar', () => {
  assert.match(nanoTerm, /import \{[^}]*\bToolbar\b[^}]*\} from 'dsh-nano-ui'/)
  assert.match(nanoTerm, /<Toolbar\s+label=/)
  assert.match(nanoTerm, /className="dnt-bar"/)
  assert.deepEqual(countIn(sources, /role="toolbar"/g), [], 'the host role is owned by nano-ui Toolbar')
  // The row keeps its own layout classes and every one of them is defined.
  for (const name of ['dnt-bar', 'dnt-bar-group', 'dnt-bar-btn', 'dnt-bar-icon', 'dnt-bar-label', 'dnt-bar-search', 'dnt-bar-input']) {
    assert.ok(nanoTerm.includes(`.${name}{`), `.${name} is defined`)
    assert.ok(nanoTerm.includes(`"${name}"`), `.${name} is referenced`)
  }
})

test('T21: the status bar icons come from the host icon set', () => {
  assert.deepEqual(countIn(sources, /⊕/g), [], '⊕ text glyph')
  assert.deepEqual(countIn(sources, /⚙/g), [], '⚙ text glyph')
  assert.deepEqual(countIn(sources, /actionIcon|toggleIcon|searchIcon/g), [], 'text-glyph slots')
  for (const name of ['terminal', 'add', 'help', 'settings', 'search']) {
    assert.ok(nanoTerm.includes(`glyph('${name}')`), `glyph('${name}') is used`)
  }
  // Each one resolves to a catalog `Icon*` export, not to a locally drawn svg.
  const map = nanoTerm.slice(nanoTerm.indexOf('const glyph ='), nanoTerm.indexOf('function leaf('))
  for (const name of ['terminal: primitives.IconCodeOutlineRegular', 'add: primitives.IconPlusOutlineRegular',
    'help: primitives.IconQuestionOutlineRegular', 'settings: primitives.IconSettingsOutlineRegular',
    'search: primitives.IconSearchOutlineRegular']) {
    assert.ok(map.includes(name), name)
  }
  assert.deepEqual(countIn(sources, /<svg\b/g), [], 'inline <svg> outside the icon facade')
})

test('T21: the deleted dead styles stay deleted (no rename, no alias)', () => {
  for (const name of DELETED_CLASSES) {
    assert.deepEqual(countIn(sources, new RegExp(name, 'g')), [], `${name} is gone from the source`)
  }
})

test('T21: the repo U8 detector outputs zero for [DNT]', () => {
  // Positive control first: the detector built by check-ui-rules reports a class
  // that only exists in the style string, so a zero below is a real zero.
  const dnt = PLUGINS.find(plugin => plugin.abbr === 'DNT')
  const fixture = [{ rel: 'fixture.jsx', text: '.dnt-only-in-styles{color:red}\nexport const live = 1\n' }]
  const control = scanPlugin(dnt, fixture, { tokens: {}, exemptRows: [] }).filter(finding => finding.rule === 'U8')
  assert.equal(control.length, 1, 'the U8 detector reports a defined-but-unused class')

  const result = runUiRules({ root: repo, plugin: 'DNT' })
  assert.ok(result.files > 0, `scanned ${result.files} file(s)`)
  assert.ok(result.plugins.DNT.files > 0)
  assert.equal(result.plugins.DNT.counts.U8, 0, 'U8 for [DNT]')
  assert.equal(result.plugins.DNT.counts.U9, 0, 'U9 for [DNT]')
  assert.deepEqual(result.findings.filter(finding => finding.rule === 'U8'), [], 'no dead-style warning')
})

test('T21: the only exemption is the pane-header button density, not the toolbar', () => {
  // nano-ui `Toolbar` is the sanctioned replacement (DESIGN.md §8), so this
  // migration must not need an exemption for the host toolbar. The one marker
  // this package does carry is P3-03: the host `Button` bottoms out at 28px and
  // the 20px pane-header density has no matching tier.
  const markers = countIn(sources, /nano-ui-exempt/g)
  assert.deepEqual(markers.map(marker => marker.path), [join('src', 'client', 'NanoTerm.jsx')], 'one marker, in NanoTerm.jsx')
  assert.equal(markers[0].count, 1, 'exactly one nano-ui-exempt marker')
  assert.ok(nanoTerm.includes('nano-ui-exempt: 宿主 Button 最小 28px，窗格头 20px 密度无对应档'), 'P3-03 marker text')
  assert.ok(!/nano-ui-exempt[^\n]*[Tt]oolbar/.test(nanoTerm), 'the marker does not cover the host toolbar')
  const gaps = design.split(/^## 8\./m)[1].split(/^## 9\./m)[0]
  assert.match(gaps, /TrajectoryToolbar/)
  assert.match(gaps, /Toolbar/)
})

test('T21: no scrollbar takeover of the host conversation scroller', () => {
  // 悬浮滚动条和 body MutationObserver 仍然禁止。右侧空白是宿主
  // scrollbar-gutter:stable，业主要求这条槽位修正留在 DNT，只允许出现在
  // index.js 的 scrollport 样式里。
  for (const [re, label] of [
    [/dnt-floatbar/g, 'floating scrollbar stand-in'],
    [/\.observe\s*\(\s*document\s*\.\s*body/g, 'MutationObserver on document.body'],
  ]) assert.deepEqual(countIn(sources, re), [], label)
  const scrollport = countIn(sources, /data-conversation-scroll/g)
  assert.deepEqual(scrollport.map((hit) => hit.path), [join('src', 'client', 'index.js')], 'gutter fix lives only in index.js')
  // Positive control: whitespace variants must still be caught, so a reformatted
  // reintroduction cannot slip past the zero assertions above.
  const fixture = [{
    path: join('src', 'client', 'fixture.js'),
    text: 'document\n  .querySelector(\n    `[data-conversation-scroll]`)\n'
      + 'new MutationObserver(fn)\n  .observe(\n    document.body,\n    { childList: true })\n'
      + 'const bar = "dnt-floatbar"\n',
  }]
  for (const [re, label] of [
    [/data-conversation-scroll/g, 'anchor'],
    [/dnt-floatbar/g, 'floatbar'],
    [/\.observe\s*\(\s*document\s*\.\s*body/g, 'body observer'],
  ]) assert.equal(countIn(fixture, re).length, 1, label)
})
