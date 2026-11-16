import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { validateDeclaration } from '../src/declaration.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const PLUGINS = [
  'dsh-nano-explorer-extra',
  'dsh-nano-notepad',
  'dsh-nano-model-selector',
  'dsh-nano-cloud-session',
  'dsh-nano-terminal',
  'dsh-nano-local-sandbox',
  'dsh-nano-kitesurf',
]

test('seven declarations validate and DNMSC has none', () => {
  assert.equal(existsSync(join(ROOT, 'dsh-nano-model-selector-compaction/src/perf/declaration.json')), false)
  const ledger = JSON.parse(readFileSync(join(ROOT, 'security/route-sensitivity.json'), 'utf8'))
  for (const dir of PLUGINS) {
    const value = JSON.parse(readFileSync(join(ROOT, dir, 'src/perf/declaration.json'), 'utf8'))
    validateDeclaration(value)
    const ids = ledger.routes.filter(row => row.plugin === dir).map(row => row.id)
    if (dir === 'dsh-nano-kitesurf') assert.deepEqual(value.contract, [])
    else assert.deepEqual(value.contract, ids)
  }
  const kept = JSON.parse(readFileSync(join(ROOT, 'dsh-nano-explorer-extra/src/perf/declaration.json'), 'utf8'))
  assert.deepEqual(kept.keys.hostSpans, ['git-status', 'stats'])
  assert.equal(kept.keys.hostSpans.includes('list'), false)
})


test('runtime slice carries only keys/buckets/hash and matches the declaration', async () => {
  const { createHash } = await import('node:crypto')
  for (const dir of PLUGINS) {
    const value = JSON.parse(readFileSync(join(ROOT, dir, 'src/perf/declaration.json'), 'utf8'))
    const slicePath = join(ROOT, dir, 'lib', 'perf-declaration.js')
    assert.equal(existsSync(slicePath), true, `${dir} has no baked runtime slice`)
    const source = readFileSync(slicePath, 'utf8')
    assert.equal(source.includes('budgets'), false)
    assert.equal(source.includes('scenarios'), false)
    assert.equal(source.includes('contract'), false)
    const hash = createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 12)
    assert.ok(source.includes(hash), `${dir} hash`)
    assert.deepEqual(JSON.parse(source.match(/export const BUCKETS = Object\.freeze\((.*)\)/)[1]), value.buckets ?? [])
  }
  const nxe = JSON.parse(readFileSync(join(ROOT, 'dsh-nano-explorer-extra/src/perf/declaration.json'), 'utf8'))
  assert.deepEqual(nxe.buckets, [{ attr: 'data-nxe', bucket: 'files-row' }])
})

import { readdirSync, statSync } from 'node:fs'
import { reconcileDeclaration } from '../test-helpers/index.mjs'

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const info = statSync(path)
    if (info.isDirectory()) walk(path, out)
    else if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.mjs')) out.push(path)
  }
  return out
}

function implantedKeys(dir) {
  const files = walk(join(ROOT, dir, 'src'))
  try { files.push(join(ROOT, dir, 'index.js')) } catch { /* none */ }
  const spans = new Set(); const tracks = new Set(); const usage = new Set(); const hostSpans = new Set()
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/\.span\(\s*'([a-z0-9-]+)'/g)) spans.add(m[1])
    for (const m of text.matchAll(/\.track\(\s*'[a-z0-9-]+'\s*,\s*'([a-z0-9-]+)'/g)) tracks.add(m[1])
    for (const m of text.matchAll(/\.count\(\s*'([a-z0-9-]+)'/g)) usage.add(m[1])
    for (const m of text.matchAll(/\bhostSpan\(\s*'([a-z0-9-]+)'/g)) hostSpans.add(m[1])
    const map = text.match(/const FX_STEP_SPAN = Object\.freeze\(\{([\s\S]*?)\}\)/)
    if (map) for (const m of map[1].matchAll(/:\s*'([a-z0-9-]+)'/g)) spans.add(m[1])
  }
  return [...spans, ...tracks, ...usage, ...hostSpans]
}

test('PRE1116-T15 three-way reconciliation over seven real declarations', () => {
  for (const dir of PLUGINS) {
    const declaration = JSON.parse(readFileSync(join(ROOT, dir, 'src/perf/declaration.json'), 'utf8'))
    const bindings = readFileSync(join(ROOT, dir, 'lib', 'bindings.js'), 'utf8')
    const bindingIds = [...bindings.matchAll(/"id":"([^"]+)"/g)].map(m => m[1])
    const result = reconcileDeclaration({
      declaration,
      implantedKeys: implantedKeys(dir),
      bindingIds,
    })
    assert.deepEqual(result, { ok: true, missingInCode: [], missingInDecl: [], unknownContract: [] }, dir)
  }
})
