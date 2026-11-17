// NUE1117-T30: end-state scan over the six nano-ui users and nano-ui itself.
// Run explicitly: node --test test/scripts/nue-endstate.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HOST_CLASS_ATTR_RE } from '../../scripts/check-ui-rules.mjs'

const root = process.env.NUE_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..')

// Each package may use its own markers; reading another package's marker is a private channel.
const PACKAGES = [
  { dir: 'dsh-nano-model-selector', own: ['nms-root', 'data-nano-model-selector'] },
  { dir: 'dsh-nano-explorer-extra', own: [] },
  { dir: 'dsh-nano-terminal', own: [] },
  { dir: 'dsh-nano-kitesurf', own: [] },
  { dir: 'dsh-nano-cloud-session', own: ['dncs'] },
  { dir: 'dsh-nano-notepad', own: [] },
  { dir: 'packages/dsh-nano-ui', own: [] },
]
const MARKERS = ['dncs', 'nms-root', 'data-nano-model-selector']

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (/\.(m?js|jsx)$/.test(name)) yield p
  }
}

export function scanText(rel, text, own) {
  const hits = []
  text.split('\n').forEach((line, i) => {
    const at = `${rel}:${i + 1}`
    // Same matcher as U5: whitespace, every class attribute operator, any case.
    if (line.match(HOST_CLASS_ATTR_RE) !== null) hits.push({ rule: 'class attribute selector', at, line })
    // Owner override 2026-11-17: [DNEE] filename tint selects the host row from its
    // own status mark. Every other :has() is still a hit.
    const ownerTint = rel.endsWith('dsh-nano-explorer-extra/src/client/styles.js')
      && line.includes(':has(') && line.includes('data-nxe-status')
    if (line.includes(':has(') && !ownerTint) hits.push({ rule: ':has(', at, line })
    if (/\bschemeOf\b/.test(line)) hits.push({ rule: 'schemeOf', at, line })
    // DESIGN.md §3: the scheme comes from ThemeScope, never from the host body attribute.
    if (/data-ds-dark-theme|dsDarkTheme/.test(line)) hits.push({ rule: 'host theme attribute', at, line })
    if (line.includes('window.confirm')) hits.push({ rule: 'window.confirm', at, line })
    for (const m of MARKERS) if (!own.includes(m) && line.includes(m)) hits.push({ rule: `marker ${m}`, at, line })
  })
  return hits
}

function scanAll() {
  const files = []
  const hits = []
  for (const pkg of PACKAGES) {
    for (const f of walk(join(root, pkg.dir, 'src'))) {
      const rel = f.replace(`${root}/`, '')
      files.push(rel)
      hits.push(...scanText(rel, readFileSync(f, 'utf8'), pkg.own))
    }
  }
  return { files, hits }
}

test('T30 positive control: the scanner reports every rule on a violating fixture', () => {
  const fixture = [
    '.x [class*="composerSeat"] {}',
    '.x [class *= "composerSeat"] {}',
    '.x [ class*= "composerSeat"] {}',
    '.x [class^="composerSeat"] {}',
    '.x [class$="composerSeat"] {}',
    '.card:has(.host) {}',
    'const schemeOf = () => "dark"',
    'if (window.confirm("go")) run()',
    'document.body.getAttribute("data-ds-dark-theme")',
    'document.body.dataset.dsDarkTheme',
    'document.querySelector(".nms-root")',
    'html[data-dncs-cloud="1"]',
  ].join('\n')
  const hits = scanText('fixture.js', fixture, [])
  const rules = new Set(hits.map(h => h.rule))
  for (const r of ['class attribute selector', ':has(', 'schemeOf', 'window.confirm', 'host theme attribute', 'marker nms-root', 'marker dncs']) assert.ok(rules.has(r), r)
  const classHits = hits.filter(h => h.rule === 'class attribute selector')
  assert.deepEqual(classHits.map(h => h.at), ['fixture.js:1', 'fixture.js:2', 'fixture.js:3', 'fixture.js:4', 'fixture.js:5'], 'every class attribute spelling fires')
})

test('T30 end state: no host grafting, schemeOf, host theme read, window.confirm or cross-package markers', () => {
  const { files, hits } = scanAll()
  for (const pkg of PACKAGES) assert.ok(files.some(f => f.startsWith(`${pkg.dir}/src/`)), `${pkg.dir} scanned`)
  assert.ok(files.length > 50, `scanned ${files.length} files`)
  assert.deepEqual(hits.map(h => `${h.rule} ${h.at}`), [])
})
