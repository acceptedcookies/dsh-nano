import assert from 'node:assert/strict'
import test from 'node:test'
import { errorCatalog, errorCode, errorNamespace, renderSkillTable, statusOf } from '../src/host/error-catalog.js'
import { driver } from './support/kernel.mjs'

const CATALOG = errorCatalog()

const REQUIRED = [
  'kitesurf.shot.fit',
  'kitesurf.shot.empty',
  'kitesurf.history.body',
  'kitesurf.network.query',
  'kitesurf.dom.empty',
  'kitesurf.dom.blank',
  'kitesurf.elements.empty',
  'kitesurf.settings.unsupported',
  'kitesurf.control.busy',
  'sandbox.instance.policy-stale',
  'sandbox.cdp.page-lost',
]

test('the catalogue has one row per required id and shot.fit is 400', () => {
  for (const id of REQUIRED) {
    const rows = CATALOG.filter((row) => row.example === id)
    assert.equal(rows.length, 1, id)
  }
  assert.equal(statusOf('kitesurf.shot.fit'), 400)
  assert.equal(statusOf('kitesurf.settings.unsupported'), 400)
  assert.equal(statusOf('sandbox.instance.policy-stale'), 409)
  assert.equal(statusOf('sandbox.cdp.page-lost'), 502)
  assert.equal(CATALOG.some((row) => row.example === 'backend.nvx.unimplemented'), false)
  const derived = CATALOG.map((row) => `${row.example}\t${row.status}\t${row.cause}\t${row.next}`).join('\n')
  assert.equal(renderSkillTable(), derived)
})

test('the active namespace comes from the profile driver, and kernel ids stay sandbox.*', () => {
  assert.equal(errorNamespace(), driver.errors.namespace)
  assert.equal(errorCode('dom.empty'), 'kitesurf.dom.empty')
  assert.equal(statusOf('kitesurf.dom.stale'), 502)
  assert.equal(statusOf('kitesurf.control.held'), 409)
  assert.equal(statusOf('sandbox.cdp.page-lost'), 502)
  // Unknown ids fall back to the engine-failure status, as before the split.
  assert.equal(statusOf('kitesurf.not.a.real.code'), 502)
  assert.equal(CATALOG.some((row) => new RegExp(row.match).test('kitesurf.not.a.real.code')), false)
})

test('driver-declared rows are composed once, not duplicated per registration', () => {
  const stale = CATALOG.filter((row) => row.example === 'kitesurf.control.held')
  assert.equal(stale.length, 1)
  assert.equal(CATALOG.filter((row) => row.example === 'sandbox.cdp.page-lost').length, 1)
})
