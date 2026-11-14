/**
 * compact-policy unit tests (plan P0-T09 / Phase 2 gate).
 * Pure node:test — no dsh imports, matching the module's no-host-import rule.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  DEFAULT_POLICY, POLICY_SCHEMA, SAFETY_RATIO,
  fill, validateMasterOrder, validatePolicyShape, validatePutBody,
  mergePutBody, serializePolicy, deserializePolicy, readState, writeState,
} from '../lib/compact-policy.js'

const W = 1000000 // 1M-token nominal window
const stateDir = () => mkdtempSync(join(tmpdir(), 'compact-policy-'))

// 1. round-trip: write -> read -> byte-stable canonical form, no enabled key
test('serialize/write/read round-trip stores schema:1 without enabled', () => {
  const dir = stateDir()
  const path = join(dir, 'async-compact.json')
  assert.equal(writeState(path, DEFAULT_POLICY).ok, true)
  const raw = readFileSync(path, 'utf8')
  assert.equal(raw.includes('"enabled"'), false)
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

// 4. DC-2/DC-3 reject: H>=B and B>=S are write-time invalid-range
test('validateMasterOrder rejects DC-2 (H>=B) and DC-3 (B>=S)', () => {
  const dc2 = { ...DEFAULT_POLICY, bufferSizeAsync: 0.5, healthTargetAsync: 0.55 }
  assert.deepEqual(validateMasterOrder(dc2, W).code, 'invalid-range')
  const dc3 = { ...DEFAULT_POLICY, bufferSizeAsync: 0.85, healthTargetAsync: 0.6 }
  assert.equal(validateMasterOrder(dc3, W).ok, false)
})

// 5. DC-1 full-only marker: effectivePin/W >= H is legal, not a reject
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

// 10. PUT contract: read-only fields (schema/bufferSizeSafety) -> 400 shape; enabled ignored in file
test('PUT body contract rejects read-only fields; enabled never persisted', () => {
  assert.equal(validatePutBody({ schema: 1 }).code, 'invalid-schema')
  assert.equal(validatePutBody({ bufferSizeSafety: 0.9 }).code, 'invalid-schema')
  assert.equal(validatePutBody({ enabled: true }).code, 'invalid-schema')
  assert.equal(validatePutBody({ bufferSizeAsync: 0.7 }).ok, true)
  const merged = mergePutBody(DEFAULT_POLICY, { bufferSizeAsync: 0.7, healthTargetAsync: 0.4 })
  assert.equal(validateMasterOrder(merged, W).ok, true)
  const shape = deserializePolicy(serializePolicy({ ...merged, enabled: true }))
  assert.equal('enabled' in shape.policy, false)
  assert.equal(shape.ok, true)
  assert.equal('enabled' in shape.policy, false)
})
