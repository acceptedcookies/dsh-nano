import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { diagnose } from '../src/diagnose.js'
import { validateDeclaration } from '../src/declaration.js'
import { reconcileDeclaration } from '../test-helpers/index.mjs'
import { createStructure } from '../src/state.js'
import * as client from '../src/client.js'
import * as host from '../src/host.js'

const pageReport = (over = {}) => ({
  schemaVersion: 2,
  generatedAt: '2026-11-16T00:00:00.000Z',
  plugins: {},
  page: {
    nativeInpCount: 0,
    nativeInpP75: null,
    inputDelayP95: null,
    processingP95: null,
    nanoCombined: { clientJsBytes: 0 },
    host: { source: null, truncated: [] },
    ...over.page,
  },
  structure: { ...createStructure(), ...(over.structure ?? {}) },
  audits: [],
  ...over.rest,
})

test('diagnose is not on the client or host entry', () => {
  assert.equal(client.diagnose, undefined)
  assert.equal(host.diagnose, undefined)
  assert.equal(client.report, undefined)
  assert.equal(host.takeWindow, undefined)
  assert.equal(host.setEnabled, undefined)
  const clientSrc = readFileSync(new URL('../src/client.js', import.meta.url), 'utf8')
  const hostSrc = readFileSync(new URL('../src/host.js', import.meta.url), 'utf8')
  assert.equal(clientSrc.includes('diagnose.js'), false)
  assert.equal(hostSrc.includes('diagnose.js'), false)
})

test('page rules name no plugin and fail a hard red line', () => {
  const src = readFileSync(new URL('../src/diagnose.js', import.meta.url), 'utf8')
  assert.equal(/dsh-nano-/.test(src), false)
  const quiet = diagnose(pageReport())
  assert.equal(quiet.verdict, 'pass')
  assert.equal(quiet.findings.length, 0)
  const loud = diagnose(pageReport({
    page: { nativeInpCount: 8, inputDelayP95: 80, processingP95: 10 },
  }))
  assert.equal(loud.verdict, 'fail')
  const hit = loud.findings.find(item => item.subject === 'page.inputDelayP95')
  assert.equal(hit.gate, 'hard')
  assert.equal(hit.plugin, null)
  assert.equal(hit.value, 80)
  assert.equal(hit.limit, 50)
  assert.equal(hit.basis, 'window')
})

test('a declaration budget produces a plugin finding; a bad declaration throws', () => {
  const declaration = {
    schema: 'dnpr.declaration/1',
    plugin: 'nano-x',
    budgets: [{
      id: 'span-ceiling',
      subject: 'native.spanMsP95',
      gate: 'audit',
      minSamples: 8,
      rule: { op: 'max', limit: 10 },
    }],
  }
  validateDeclaration(declaration)
  const report = pageReport()
  report.plugins['nano-x'] = {
    native: { spanMsP95: 80, n: 8, samples: { spans: 8, callbacks: 0 } },
    manual: { spans: { render: { n: 8, p95: 80, basis: 'window' } } },
  }
  const result = diagnose(report, [declaration])
  assert.equal(result.verdict, 'fail')
  const pluginHit = result.findings.find(item => item.id === 'native.spanMsP95' && item.plugin === 'nano-x')
  assert.equal(pluginHit.gate, 'hard')
  assert.equal(pluginHit.limit, 50)
  const budgetHit = result.findings.find(item => item.id === 'span-ceiling')
  assert.equal(budgetHit.gate, 'audit')
  assert.equal(budgetHit.plugin, 'nano-x')
  assert.equal(budgetHit.value, 80)
  assert.equal(budgetHit.limit, 10)
  assert.throws(() => diagnose(report, { schema: 'dnpr.declaration/1', plugin: 'nano-x', budgets: [{ id: 'x', subject: 'page.nativeInpP75', gate: 'hard', rule: { op: 'average', limit: 1 } }] }))
  assert.throws(() => validateDeclaration({ schema: 'nope', plugin: 'nano-x' }))
  assert.throws(() => validateDeclaration(null))
})

test('reconcileDeclaration fails both drift directions and an unknown contract id', () => {
  const declaration = validateDeclaration({
    schema: 'dnpr.declaration/1',
    plugin: 'nano-x',
    keys: { spans: ['alpha'], tracks: [{ name: 'beta', kind: 'listener' }], usage: [], hostSpans: [] },
    contract: ['nxe.list'],
  })
  const missingCode = reconcileDeclaration({
    declaration,
    implantedKeys: ['beta'],
    bindingIds: ['nxe.list'],
  })
  assert.equal(missingCode.ok, false)
  assert.deepEqual(missingCode.missingInCode, ['alpha'])
  const missingDecl = reconcileDeclaration({
    declaration,
    implantedKeys: ['alpha', 'beta', 'gamma'],
    bindingIds: ['nxe.list'],
  })
  assert.deepEqual(missingDecl.missingInDecl, ['gamma'])
  const unknown = reconcileDeclaration({
    declaration,
    implantedKeys: ['alpha', 'beta'],
    bindingIds: [],
    mcpMethods: [],
  })
  assert.deepEqual(unknown.unknownContract, ['nxe.list'])
  const aligned = reconcileDeclaration({
    declaration,
    implantedKeys: ['alpha', 'beta'],
    mcpMethods: ['nxe.list'],
  })
  assert.equal(aligned.ok, true)
})

test('build-stamp and truncation are audit findings', () => {
  const report = pageReport({
    structure: {
      audits: [{ level: 'audit', code: 'build-stamp', have: 'aaa', saw: 'bbb' }],
      legacyCopies: 1,
    },
  })
  report.page.host = { source: 'snapshot', truncated: ['epoch', { pluginId: 'nano-x', name: 'list', lost: 3 }] }
  const result = diagnose(report)
  assert.equal(result.verdict, 'pass')
  assert.ok(result.findings.some(item => item.id === 'build-stamp' && item.gate === 'audit' && item.value === 'bbb'))
  assert.ok(result.findings.some(item => item.id === 'structure.legacyCopies' && item.gate === 'audit'))
  assert.ok(result.findings.some(item => item.id === 'host-epoch' && item.gate === 'audit'))
  assert.ok(result.findings.some(item => item.id === 'host-truncated' && item.gate === 'audit'))
})
