/**
 * Generated-shared-module lock (T03). DNMSC is the single source for
 * compact-policy.js and the built-in summary prompt; this package ships
 * generated copies so it never imports the sibling bundle at runtime
 * (T-O-ACE1117-07④ / A-22).
 *
 * Counts only if: the bake header hash matches the current source bytes, the
 * body after the header is identical to the source, promptText mirrors
 * DNMSC instructionText for the override-only shape, and no import string
 * in index.js or src/ names the sibling package.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_POLICY, SAFETY_RATIO, EXTRA_REQUIREMENTS_MAX,
  validateMasterOrder, validatePutBody,
} from '../lib/compact-policy.js'
import { DEFAULT_SUMMARY_PROMPT, promptText } from '../lib/compact-prompt.js'
import { COMPACTION_INSTRUCTION, instructionText } from '../../dsh-nano-model-selector-compaction/lib/compact-region.js'
import * as dnscPolicy from '../../dsh-nano-model-selector-compaction/lib/compact-policy.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SIBLING = join(ROOT, '..', 'dsh-nano-model-selector-compaction')

const headerHash = file => readFileSync(file, 'utf8').match(/sha256:([0-9a-f]{12})/)?.[1]

test('baked compact-policy.js body is byte-identical to the DNMSC source', () => {
  const source = readFileSync(join(SIBLING, 'lib', 'compact-policy.js'), 'utf8')
  const baked = readFileSync(join(ROOT, 'lib', 'compact-policy.js'), 'utf8')
  assert.equal(headerHash(join(ROOT, 'lib', 'compact-policy.js')),
    createHash('sha256').update(source).digest('hex').slice(0, 12),
    'stale bake: re-run scripts/bake-compact-shared.mjs')
  assert.equal(baked.endsWith(source), true, 'baked body must be the verbatim source')
})

test('baked compact-prompt.js exposes the verbatim DNMSC instruction', () => {
  assert.equal(DEFAULT_SUMMARY_PROMPT, COMPACTION_INSTRUCTION)
  assert.equal(headerHash(join(ROOT, 'lib', 'compact-prompt.js')),
    createHash('sha256').update(readFileSync(join(SIBLING, 'lib', 'compact-region.js'), 'utf8')).digest('hex').slice(0, 12),
    'stale bake: re-run scripts/bake-compact-shared.mjs')
  // promptText must mirror instructionText({override}) exactly.
  assert.equal(promptText(''), instructionText({ override: '' }))
  assert.equal(promptText(undefined), instructionText({}))
  assert.equal(promptText('keep tool names verbatim'), instructionText({ override: 'keep tool names verbatim' }))
})

test('both packages evaluate identical fixtures identically (T01 shared copy)', () => {
  assert.equal(SAFETY_RATIO, dnscPolicy.SAFETY_RATIO)
  assert.equal(SAFETY_RATIO, 0.90)
  assert.equal(EXTRA_REQUIREMENTS_MAX, dnscPolicy.EXTRA_REQUIREMENTS_MAX)
  const bad = { ...DEFAULT_POLICY, healthTargetAsync: 0.65, bufferSizeAsync: 0.65 }
  const ours = validateMasterOrder(bad, 1000000)
  const theirs = dnscPolicy.validateMasterOrder(bad, 1000000)
  assert.equal(ours.ok, false)
  assert.equal(theirs.ok, false)
  assert.equal(ours.code, theirs.code)
  assert.equal(validatePutBody({ summaryPrompt: 'x' }).ok, false)
  assert.equal(dnscPolicy.validatePutBody({ summaryPrompt: 'x' }).ok, false)
})

test('no runtime import names the sibling compaction package (T03)', () => {
  const roots = ['index.js', 'src/client', 'lib']
  const offenders = []
  const importRef = /from\s+['"][^\n'"]*dsh-nano-model-selector-compaction|require\(\s*['"][^\n'"]*dsh-nano-model-selector-compaction|import\(\s*['"][^\n'"]*dsh-nano-model-selector-compaction/
  const scanFile = p => { if (importRef.test(readFileSync(p, 'utf8'))) offenders.push(p) }
  const scan = path => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const p = join(path, entry.name)
      if (entry.isDirectory()) { scan(p); continue }
      if (!/\.(mjs|jsx?|ts)$/.test(entry.name)) continue
      if (entry.name === 'compact-policy.js' || entry.name === 'compact-prompt.js') continue // generated copy
      if (entry.name === 'perf-declaration.js') continue
      scanFile(p)
    }
  }
  for (const rel of roots) {
    const p = join(ROOT, rel)
    try { scan(p) } catch { /* file vs dir */ scanFile(p) }
  }
  assert.deepEqual(offenders, [])
})

test('bake is idempotent: re-running writes no diff', async () => {
  const { execFileSync } = await import('node:child_process')
  const before = [readFileSync(join(ROOT, 'lib', 'compact-policy.js'), 'utf8'), readFileSync(join(ROOT, 'lib', 'compact-prompt.js'), 'utf8')]
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'bake-compact-shared.mjs')], { stdio: 'pipe' })
  assert.equal(readFileSync(join(ROOT, 'lib', 'compact-policy.js'), 'utf8'), before[0])
  assert.equal(readFileSync(join(ROOT, 'lib', 'compact-prompt.js'), 'utf8'), before[1])
})
