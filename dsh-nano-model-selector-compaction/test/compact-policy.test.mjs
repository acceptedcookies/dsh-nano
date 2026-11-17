/**
 * compact-policy unit tests — ACE-1117 contract.
 *
 * Strict order (-10②): H < B < S, equality is a 400 violation. DC-1
 * (effectivePin/W >= H) stays a legal full-only marker (AF-2). S is read-only
 * at 0.90 with NO read-time restamp (-10①): a file stamped 0.80 is
 * state-read-failed, not upgraded.
 * summaryPrompt is retired (-07②): the key anywhere (file or PUT, even
 * empty) is invalid-schema; extraRequirements (max 4000) only appends.
 * Pure node:test — no dsh imports, matching the module's no-host-import rule.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  DEFAULT_POLICY, POLICY_SCHEMA, SAFETY_RATIO, EXTRA_REQUIREMENTS_MAX,
  fill, validateMasterOrder, validatePolicyShape, validatePutBody,
  mergePutBody, serializePolicy, deserializePolicy, readState, writeState,
} from '../lib/compact-policy.js'

const W = 1000000 // 1M-token nominal window
const stateDir = () => mkdtempSync(join(tmpdir(), 'compact-policy-'))

// 1. round-trip: write -> read -> byte-stable canonical form, no enabled, no summaryPrompt
test('serialize/write/read round-trip stores schema:1 without enabled or summaryPrompt', () => {
  const dir = stateDir()
  const path = join(dir, 'async-compact.json')
  assert.equal(writeState(path, DEFAULT_POLICY).ok, true)
  const raw = readFileSync(path, 'utf8')
  assert.equal(raw.includes('"enabled"'), false)
  assert.equal(raw.includes('"summaryPrompt"'), false)
  const got = readState(path)
  assert.equal(got.ok, true)
  assert.equal(got.missing, false)
  assert.deepEqual(got.policy, DEFAULT_POLICY)
})

// 2. master order satisfied: default policy passes, effectivePin capped by floor(0.15*W)
test('validateMasterOrder accepts default policy and reports effectivePin', () => {
  const r = validateMasterOrder(DEFAULT_POLICY, W)
  assert.equal(r.ok, true)
  assert.equal(r.effectivePin, Math.min(100000, Math.floor(0.15 * W)))
  assert.equal(r.windowMin, 100000 / 0.5)
  assert.equal(r.fullOnly, false)
})

// 3. single fill formula: fill = totalTokens / W, nothing else
test('fill uses totalTokens / nominal window only', () => {
  assert.equal(fill(500000, 1000000), 0.5)
  assert.equal(fill(800000, 1000000), 0.8)
})

// 4. STRICT order (-10②): H == B and B == S both reject; only strictly-below passes
test('validateMasterOrder rejects H >= B and B >= S (equality is a violation)', () => {
  const dc2 = { ...DEFAULT_POLICY, bufferSizeAsync: 0.5, healthTargetAsync: 0.55 }
  assert.equal(validateMasterOrder(dc2, W).code, 'invalid-range')
  const equalHB = { ...DEFAULT_POLICY, healthTargetAsync: 0.65, bufferSizeAsync: 0.65 }
  assert.equal(validateMasterOrder(equalHB, W).ok, false)
  assert.equal(validateMasterOrder(equalHB, W).code, 'invalid-range')
  const atCeiling = { ...DEFAULT_POLICY, healthTargetAsync: 0.5, bufferSizeAsync: SAFETY_RATIO }
  assert.equal(validateMasterOrder(atCeiling, W).ok, false)
  assert.equal(validateMasterOrder(atCeiling, W).code, 'invalid-range')
  const justBelow = { ...DEFAULT_POLICY, healthTargetAsync: 0.5, bufferSizeAsync: 0.89 }
  assert.equal(validateMasterOrder(justBelow, W).ok, true)
})

// 5. DC-1 full-only marker: effectivePin/W >= H is legal, not a reject (AF-2)
test('DC-1 marks fullOnly instead of rejecting', () => {
  const lowH = { ...DEFAULT_POLICY, healthTargetAsync: 0.10, bufferSizeAsync: 0.3 }
  const r = validateMasterOrder(lowH, W) // effectivePin/W = 0.15 >= H
  assert.equal(r.ok, true)
  assert.equal(r.fullOnly, true)
  assert.deepEqual(r.dcs, ['DC-1'])
})

// 6. missing file -> DEFAULT_POLICY in memory only, nothing written
test('readState returns defaults for missing file without writing', () => {
  const path = join(stateDir(), 'absent.json')
  const r = readState(path)
  assert.equal(r.ok, true)
  assert.equal(r.missing, true)
  assert.deepEqual(r.policy, DEFAULT_POLICY)
  assert.equal(existsSync(path), false)
})

// 7. corrupt file -> fail-closed state-read-failed, file untouched
test('readState fails closed on corrupt JSON', () => {
  const path = join(stateDir(), 'bad.json')
  writeFileSync(path, '{not json')
  const r = readState(path)
  assert.equal(r.ok, false)
  assert.equal(r.code, 'state-read-failed')
  assert.equal(readFileSync(path, 'utf8'), '{not json')
})

// 8. unknown schema rejected, no legacy-key fallback, no dual-read
test('deserialize rejects non-schema:1 without legacy fallback', () => {
  const r = deserializePolicy(JSON.stringify({ schema: 0, enabled: true, bufferSizeAsync: 0.65 }))
  assert.equal(r.ok, false)
  assert.equal(r.code, 'invalid-schema')
})

// 8b. -10①: a file stamped S=0.80 is NOT restamped — it is state-read-failed.
test('readState rejects a legacy S=0.80 file (no read-time restamp)', () => {
  const dir = stateDir()
  const path = join(dir, 'legacy.json')
  const legacy = JSON.stringify({ ...DEFAULT_POLICY, bufferSizeSafety: 0.80 })
  writeFileSync(path, legacy)
  const r = readState(path)
  assert.equal(r.ok, false)
  assert.equal(r.code, 'state-read-failed')
  assert.match(r.reason, /invalid-range/)
  assert.equal(readFileSync(path, 'utf8'), legacy, 'file must be left byte-identical')
})

// 9. atomic replace: no tmp residue, mode 0600, content is new policy
test('writeState replaces atomically with no tmp residue', () => {
  const dir = stateDir()
  const path = join(dir, 'p.json')
  assert.equal(writeState(path, DEFAULT_POLICY).ok, true)
  const next = { ...DEFAULT_POLICY, bufferSizeAsync: 0.7 }
  assert.equal(writeState(path, next).ok, true)
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).bufferSizeAsync, 0.7)
  assert.equal(readdirSync(dir).filter(f => f.includes('.tmp')).length, 0)
})

// 10. PUT contract: read-only fields + retired summaryPrompt -> 400 shape
test('PUT body contract rejects read-only and retired fields; enabled never persisted', () => {
  assert.equal(validatePutBody({ schema: 1 }).code, 'invalid-schema')
  assert.equal(validatePutBody({ bufferSizeSafety: 0.9 }).code, 'invalid-schema')
  assert.equal(validatePutBody({ enabled: true }).code, 'invalid-schema')
  assert.equal(validatePutBody({ summaryPrompt: '' }).code, 'invalid-schema')
  assert.equal(validatePutBody({ summaryPrompt: 'anything' }).code, 'invalid-schema')
  assert.equal(validatePutBody({ bufferSizeAsync: 0.7 }).ok, true)
  const merged = mergePutBody(DEFAULT_POLICY, { bufferSizeAsync: 0.7, healthTargetAsync: 0.4 })
  assert.equal(validateMasterOrder(merged, W).ok, true)
  const shape = deserializePolicy(serializePolicy({ ...merged, enabled: true }))
  assert.equal('enabled' in shape.policy, false)
  assert.equal(shape.ok, true)
})

// 10b. Equality violations are write-time rejects too (merged result re-validated).
test('merged PUT that collides on equality is rejected at master order', () => {
  const merged = mergePutBody(DEFAULT_POLICY, { healthTargetAsync: 0.65 })
  assert.equal(validateMasterOrder(merged, W).ok, false)
  const ceiling = mergePutBody(DEFAULT_POLICY, { bufferSizeAsync: 0.90 })
  assert.equal(validateMasterOrder(ceiling, W).ok, false)
})

// 11. extraRequirements: valid string <= 4000, key summaryPrompt never accepted
test('extraRequirements is the only prompt addendum channel (max 4000)', () => {
  assert.equal(EXTRA_REQUIREMENTS_MAX, 4000)
  const okPut = validatePutBody({ extraRequirements: 'keep tool names verbatim' })
  assert.equal(okPut.ok, true)
  const tooLong = validatePutBody({ extraRequirements: 'x'.repeat(4001) })
  assert.equal(tooLong.code, 'invalid-schema')
  const exact = validatePutBody({ extraRequirements: 'x'.repeat(4000) })
  assert.equal(exact.ok, true)
  const shape = validatePolicyShape({ ...DEFAULT_POLICY, extraRequirements: 'x'.repeat(4000) })
  assert.equal(shape.ok, true)
  assert.equal(validatePolicyShape({ ...DEFAULT_POLICY, extraRequirements: 'x'.repeat(4001) }).code, 'invalid-schema')
  // Retired key anywhere is invalid-schema, even empty.
  assert.equal(validatePolicyShape({ ...DEFAULT_POLICY, summaryPrompt: '' }).code, 'invalid-schema')
})

// 12. T02: extras append AFTER the built-in eight sections — never replace.
test('instructionText keeps built-in sections first; extras append verbatim (T02)', async () => {
  const { instructionText, instructionVersion, COMPACTION_INSTRUCTION } = await import('../lib/compact-region.js')
  const { createHash } = await import('node:crypto')
  const extra = 'Always keep ## Primary Request wording exactly as the user wrote it.'
  const sent = instructionText({ override: extra })
  assert.equal(sent.startsWith(COMPACTION_INSTRUCTION), true)
  assert.equal(sent.endsWith(`Additional requirements:\n${extra}`), true)
  // Eight built-in sections survive verbatim.
  for (const section of ['## Primary Request and Intent', '## Key Technical Concepts', '## Files and Code', '## Errors and Fixes', '## Pending Jobs', '## Current Work', '## Next Step', '## Critical Context']) {
    assert.equal(sent.includes(section), true, section)
  }
  // Independent sha256 cross-check: version is the digest of the full text.
  const independent = createHash('sha256').update(sent, 'utf8').digest('hex').slice(0, 8)
  assert.equal(instructionVersion({ override: extra }), independent)
  // Empty extras never append the heading.
  assert.equal(instructionText({ override: '' }), COMPACTION_INSTRUCTION)
  assert.equal(instructionText({ override: '   ' }).endsWith('Additional requirements:\n   '), true)
})
