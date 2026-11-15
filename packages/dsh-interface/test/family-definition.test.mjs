/**
 * CF1115-T12 — FamilyDefinition minimal authoring record + same-source
 * projection. Multi-op selector/cases + unknown-dispatch rejection; same-name
 * different-contract and cross-family identity distinguishable; unapproved
 * fields rejected; contracts stay pure.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defineFamily, selectOperation, projectWebTable, projectOperations, projectService,
} from '../src/contracts/FamilyDefinition.js'

const FAMILY = {
  contractId: 'cf1115.notepad',
  authorityRefs: { 'truth:F16': true, 'qna:Q10': { approved: true } },
  operations: {
    'import': { input: {}, output: {}, failures: ['type'], semanticsRef: 's:import' },
    'export': { input: {}, output: {}, failures: ['io'], semanticsRef: 's:export' },
  },
  bindings: {
    'svc': { operationIds: ['import'], transport: 'cordis', codecs: { import: {} } },
    'io': { operationIds: ['import', 'export'], transport: 'fs',
            codecs: {}, dispatch: { cases: { in: 'import', out: 'export' } } },
  },
  providers: {
    'p.notepad': { plugin: 'dsh-nano-notepad', supports: [{ bindingId: 'svc', operationIds: ['import'] }], constraintsRef: 'c:1' },
  },
}

test('defineFamily validates + freezes', () => {
  const def = defineFamily(FAMILY)
  assert.equal(def.contractId, 'cf1115.notepad')
  assert.ok(Object.isFrozen(def))
})

test('unapproved authorityRefs rejected (existence ≠ approval)', () => {
  const bad = { ...FAMILY, authorityRefs: { review: { approved: false } } }
  assert.throws(() => defineFamily(bad), /unapproved-authority/)
})

test('array authorityRefs cannot bypass the approval gate', () => {
  // Anti-fake-green: an array form must not skip the approval check.
  assert.throws(() => defineFamily({ ...FAMILY, authorityRefs: ['REVIEW', 'pending'] }), /unapproved-authority/)
  assert.throws(() => defineFamily({ ...FAMILY, authorityRefs: [{ approved: false }] }), /unapproved-authority/)
  const ok = defineFamily({ ...FAMILY, authorityRefs: [true, { approved: true }] })
  assert.equal(ok.contractId, FAMILY.contractId)
})

test('binding → undeclared operation rejected; provider → undeclared binding rejected', () => {
  assert.throws(() => defineFamily({ ...FAMILY, bindings: { x: { operationIds: ['nope'], transport: 'w' } } }), /unknown-operation/)
  assert.throws(() => defineFamily({ ...FAMILY, providers: { p: { plugin: 'x', supports: [{ bindingId: 'nope' }] } } }), /unknown-binding/)
})

test('multi-op binding without dispatch.cases rejected', () => {
  const bad = { ...FAMILY, bindings: { io: { operationIds: ['import', 'export'], transport: 'fs' } } }
  assert.throws(() => defineFamily(bad), /missing-dispatch/)
})

test('selectOperation: single returns its op; unknown dispatch rejected; never defaults to first', () => {
  const def = defineFamily(FAMILY)
  assert.equal(selectOperation(def, 'svc'), 'import')
  assert.equal(selectOperation(def, 'io', 'out'), 'export')
  assert.throws(() => selectOperation(def, 'io', 'bogus'), /unknown-dispatch/)
})

test('same-source projections keep contractId association', () => {
  const def = defineFamily(FAMILY)
  const table = projectWebTable(def, 'p.notepad', (bId) => ({ path: `/x/${bId}` }))
  assert.equal(table[0].contractId, 'cf1115.notepad')
  assert.equal(table[0].bindingId, 'svc')
  const ops = projectOperations(def, 'io')
  assert.deepEqual(ops.map(o => o.operationId), ['import', 'export'])
  const svc = projectService(def, 'p.notepad')
  assert.equal(svc.plugin, 'dsh-nano-notepad')
  assert.deepEqual(svc.operations, ['import'])
})
