/**
 * PRE1116-T25 — package/spec docs must not teach the retired v1 mechanics.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const FILES = [
  'docs/specs/dsh-nano-performance-review/spec-26nov.md',
  'packages/dsh-performance-review/README.md',
  'INTRODUCTION.md',
  'lab/README.md',
]
const RETIRED = [
  /report\(\)\s*清空/,
  /四个包/,
  /\[DNK\][^\n]*拥有[^\n]*perf[^\n]*路由/i,
  /mode=window[^\n]*排空/,
  /window\.__perfReview\b/,
  /LIB_VERSION/,
  /host\.json/,
]

test('spec and package docs contain no retired v1 mechanism sentence', () => {
  for (const rel of FILES) {
    const text = readFileSync(join(ROOT, rel), 'utf8')
    for (const pattern of RETIRED) assert.equal(pattern.test(text), false, `${rel} matches ${pattern}`)
  }
})

test('kitesurf AGENTS does not claim the perf route or a perf diagnostics field', () => {
  const text = readFileSync(join(ROOT, 'dsh-nano-kitesurf/AGENTS.md'), 'utf8')
  assert.equal(/GET\/POST \| `见 QNA perf-review\/host`/.test(text), false)
  assert.equal(/errorCatalog \+ perf \+ 自动 hints/.test(text), false)
  assert.equal(/perfReview: true/.test(text), false)
})

test('PRE1116-T17/T18/T19: retired spans, switch and writer are gone', async () => {
  const { readdirSync, statSync } = await import('node:fs')
  const walk = (dir, out = []) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      const info = statSync(path)
      if (info.isDirectory()) walk(path, out)
      else if (name.endsWith('.js') || name.endsWith('.jsx')) out.push(path)
    }
    return out
  }
  const retired = ["hostSpan('catalog'", "hostSpan('read'", "hostSpan('save'", "hostSpan('list'", "hostSpan('sessions'"]
  for (const dir of ['dsh-nano-explorer-extra', 'dsh-nano-notepad', 'dsh-nano-model-selector', 'dsh-nano-cloud-session', 'dsh-nano-kitesurf']) {
    for (const file of walk(join(ROOT, dir, 'src'))) {
      const text = readFileSync(file, 'utf8')
      for (const needle of retired) assert.equal(text.includes(needle), false, `${file} ${needle}`)
    }
  }
  const dnk = readFileSync(join(ROOT, 'dsh-nano-kitesurf/index.js'), 'utf8')
  for (const needle of ['perfReview', 'setPerfEnabled', 'perfSnapshot', 'DSH_PERF_REVIEW']) {
    assert.equal(dnk.includes(needle), false, `DNK ${needle}`)
  }
  const host = readFileSync(join(ROOT, 'packages/dsh-performance-review/src/host.js'), 'utf8')
  for (const needle of ['writeFile', 'beforeExit', 'host.json', 'WRITE_INTERVAL_MS']) {
    assert.equal(host.includes(needle), false, `host.js ${needle}`)
  }
})

test('PRE1116-T21: every host bundle carries the current DNPR content stamp', async () => {
  const { dnprBuildStamp } = await import('../../../scripts/dnpr-build-stamp.mjs')
  const stamp = dnprBuildStamp()
  const bundles = [
    'dsh-nano-notepad/lib/perf-review-host.js',
    'dsh-nano-model-selector/lib/perf-review-host.js',
    'dsh-nano-cloud-session/lib/perf-review-host.js',
    'dsh-nano-terminal/lib/perf-review-host.js',
    'dsh-nano-local-sandbox/lib/perf-review-host.js',
    'dsh-nano-kitesurf/lib/perf-host.js',
    'dsh-nano-explorer-extra/lib/host.js',
  ]
  for (const rel of bundles) {
    assert.equal(readFileSync(join(ROOT, rel), 'utf8').includes(stamp), true, rel)
  }
})
