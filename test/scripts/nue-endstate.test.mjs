// NUE1117-T30: end-state scan over the six nano-ui users and nano-ui itself.
// Run explicitly: node --test test/scripts/nue-endstate.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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

// P9-05 is a stop point (qna Q19): listed separately, not counted, until [业主] rules.
const DEFERRED_HAS = [{ file: 'dsh-nano-notepad/src/client/panel.js', text: '[data-changed-files]:has(' }]

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
    if (line.includes('[class*=')) hits.push({ rule: 'class*=', at, line })
    if (line.includes(':has(') && !DEFERRED_HAS.some(d => rel === d.file && line.includes(d.text))) hits.push({ rule: ':has(', at, line })
    if (/\bschemeOf\b/.test(line)) hits.push({ rule: 'schemeOf', at, line })
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
    '.card:has(.host) {}',
    'const schemeOf = () => "dark"',
    'if (window.confirm("go")) run()',
    'document.querySelector(".nms-root")',
    'html[data-dncs-cloud="1"]',
  ].join('\n')
  const rules = new Set(scanText('fixture.js', fixture, []).map(h => h.rule))
  for (const r of ['class*=', ':has(', 'schemeOf', 'window.confirm', 'marker nms-root', 'marker dncs']) assert.ok(rules.has(r), r)
})

test('T30 end state: no host grafting, schemeOf, window.confirm or cross-package markers', () => {
  const { files, hits } = scanAll()
  for (const pkg of PACKAGES) assert.ok(files.some(f => f.startsWith(`${pkg.dir}/src/`)), `${pkg.dir} scanned`)
  assert.ok(files.length > 50, `scanned ${files.length} files`)
  assert.deepEqual(hits.map(h => `${h.rule} ${h.at}`), [])
})

test('T30 the deferred P9-05 site is still the only :has( and is listed separately (Q19)', () => {
  for (const d of DEFERRED_HAS) {
    const text = readFileSync(join(root, d.file), 'utf8')
    console.log(`deferred (Q19): ${d.file} contains ${text.split(d.text).length - 1} × ${d.text}`)
  }
})
