// NUE1117-T03 / T04: catalog generation is repeatable, counts hold, and the
// retired DNMS snapshot left no trace. Run: node --test test/scripts/gen-nano-catalog.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdtempSync, writeFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCatalog, bundleFile, stableJson } from '../../scripts/gen-nano-catalog.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SCRIPT = join(root, 'scripts', 'gen-nano-catalog.mjs')
const CATALOG = join(root, 'packages', 'dsh-nano-ui', 'catalog')
const load = name => JSON.parse(readFileSync(join(CATALOG, `${name}.json`), 'utf8'))
const NAMES = ['primitives', 'icons', 'tokens']

/** sha256 of a catalog file with `generated` removed. */
function digest(dir, name) {
  const body = JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'))
  delete body.generated
  return createHash('sha256').update(stableJson(body)).digest('hex')
}

const DEFAULT_SOURCES = load('primitives').sources
const sourcesPresent = Object.values(DEFAULT_SOURCES).every(s => s !== 'missing' && bundleFile(s) !== null)

test('T03 two generations from the real host artifacts are byte-identical apart from `generated`, and match the committed catalog', { skip: sourcesPresent ? false : 'host artifacts not on this machine' }, () => {
  const outs = [mkdtempSync(join(tmpdir(), 'nue-cat-a-')), mkdtempSync(join(tmpdir(), 'nue-cat-b-'))]
  for (const out of outs) {
    const r = spawnSync(process.execPath, [SCRIPT, '--out', out], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
  }
  for (const name of NAMES) {
    const [a, b] = outs.map(out => digest(out, name))
    console.log(`# ${name}.json sha256(without generated) run1=${a} run2=${b}`)
    assert.equal(a, b, `${name}.json differs between runs`)
    assert.equal(a, digest(CATALOG, name), `${name}.json is stale — rerun scripts/gen-nano-catalog.mjs`)
  }
})

test('T03 primitives are counted per release label: rc.1 = 311, rc.3 = 321', () => {
  const { exports, method, sources } = load('primitives')
  assert.equal(exports['rc.1'].length, 311)
  assert.equal(exports['rc.3'].length, 321)
  assert.ok(method.length > 0)
  assert.deepEqual(Object.keys(sources).sort(), ['rc.1', 'rc.3'])
})

test('T03 tokens: at least 437, every entry has light/dark, declared entries carry both values', () => {
  const { tokens, count, method } = load('tokens')
  assert.ok(method.length > 0)
  assert.equal(count, Object.keys(tokens).length)
  assert.ok(count >= 437, `tokens ${count}`)
  for (const [name, t] of Object.entries(tokens)) {
    assert.ok('light' in t && 'dark' in t, name)
    if (t.declared) assert.ok(t.light !== null && t.dark !== null, name)
  }
})

test('T03 schemes hold exactly the --dsw-* tokens whose light and dark values differ', () => {
  const { tokens, schemes } = load('tokens')
  const differing = Object.entries(tokens).filter(([n, t]) => n.startsWith('--dsw-') && t.declared && t.light !== null && t.dark !== null && t.light !== t.dark).map(([n]) => n).sort()
  assert.ok(differing.length > 0)
  assert.deepEqual(Object.keys(schemes.light).sort(), differing)
  assert.deepEqual(Object.keys(schemes.dark).sort(), differing)
  for (const n of differing) {
    assert.equal(schemes.light[n], tokens[n].light)
    assert.equal(schemes.dark[n], tokens[n].dark)
  }
})

test('T03 icons are a subset of primitives and the sprite carries glyphs × weights', () => {
  const { exports } = load('primitives')
  const { components, sprite } = load('icons')
  for (const [label, names] of Object.entries(components)) {
    assert.ok(names.length > 0, label)
    for (const n of names) assert.ok(exports[label].includes(n), `${label} ${n}`)
  }
  assert.ok(sprite.glyphs.length > 0)
  assert.ok(sprite.weights.length > 0)
})

test('T03 every token named in DESIGN.md exists in tokens.json', () => {
  const { tokens } = load('tokens')
  const design = readFileSync(join(root, 'docs', 'specs', 'dsh-nano-ui', 'DESIGN.md'), 'utf8')
  // Lines that name host-internal variables as forbidden examples are not token claims.
  const claimed = design.split('\n').filter(l => !l.includes('宿主组件内部变量'))
    .flatMap(l => l.match(/--(?:dsw|dsh|ds)-[a-z0-9-]*[a-z0-9]\b(?!-)/g) ?? [])
  assert.ok(claimed.length > 0)
  const missing = [...new Set(claimed)].filter(n => tokens[n] === undefined)
  assert.deepEqual(missing, [])
})

test('T03 fixture: a missing source is recorded as "missing"; all missing exits 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nue-cat-fx-'))
  const bundle = join(dir, 'index-abc.js')
  writeFileSync(bundle, 'var x={Button:()=>1,Tooltip:()=>2,IconFooOutlineRegular:()=>3};')
  const theme = join(dir, 'theme.js')
  writeFileSync(theme, '":root{--dsw-alias-a:#fff;--dsw-alias-b:var(--dsw-alias-a)}body[data-ds-dark-theme]{--dsw-alias-a:#000}"')
  const catalog = buildCatalog({ bundles: [['x', dir], ['gone', join(dir, 'nope')]], theme, generated: '2000-01-01' })
  assert.equal(catalog.primitives.sources.gone, 'missing')
  assert.deepEqual(catalog.primitives.exports.x, ['Button', 'IconFooOutlineRegular', 'Tooltip'])
  assert.deepEqual(catalog.icons.components.x, ['IconFooOutlineRegular'])
  assert.deepEqual(catalog.tokens.tokens['--dsw-alias-b'], { declared: true, prefix: false, runtime: false, light: '#fff', dark: '#000' })
  const r = spawnSync(process.execPath, [SCRIPT, `a=${join(dir, 'nope')}`, '--theme', join(dir, 'nope.js'), '--out', join(dir, 'out')], { encoding: 'utf8' })
  assert.equal(r.status, 1)
  assert.equal(existsSync(join(dir, 'out')), false)
})

function* walk(dir) {
  if (!existsSync(dir)) return
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else yield p
  }
}

test('T04 the DNMS snapshot and its generator are gone, with no remaining references', () => {
  assert.equal(existsSync(join(root, 'dsh-nano-model-selector', 'test', 'primitives-exports.json')), false)
  assert.equal(existsSync(join(root, 'scripts', 'gen-primitives-exports.mjs')), false)
  const dirs = ['scripts', 'packages', 'dsh-nano-model-selector', 'dsh-nano-explorer-extra', 'dsh-nano-terminal', 'dsh-nano-kitesurf', 'dsh-nano-cloud-session', 'dsh-nano-notepad']
  const needle = ['primitives', 'exports'].join('-')
  const hits = []
  let files = 0
  for (const d of dirs) {
    for (const f of walk(join(root, d))) {
      files++
      if (readFileSync(f, 'latin1').includes(needle)) hits.push(f.slice(root.length + 1))
    }
  }
  assert.ok(files > 0)
  assert.deepEqual(hits, [])
})
