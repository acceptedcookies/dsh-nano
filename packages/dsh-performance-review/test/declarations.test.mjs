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
