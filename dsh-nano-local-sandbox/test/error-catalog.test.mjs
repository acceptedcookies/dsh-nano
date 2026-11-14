import assert from 'node:assert/strict'
import test from 'node:test'
import { ERROR_CATALOG, renderSkillTable, statusOf } from '../src/host/error-catalog.js'

const REQUIRED = [
  'kitesurf.shot.fit',
  'kitesurf.shot.empty',
  'kitesurf.history.body',
  'kitesurf.network.query',
  'kitesurf.dom.empty',
  'kitesurf.dom.blank',
  'kitesurf.elements.empty',
  'sandbox.instance.policy-stale',
  'sandbox.cdp.page-lost',
]

test('the catalogue has one row per required id and shot.fit is 400', () => {
  for (const id of REQUIRED) {
    const rows = ERROR_CATALOG.filter((row) => row.example === id)
    assert.equal(rows.length, 1, id)
  }
  assert.equal(statusOf('kitesurf.shot.fit'), 400)
  assert.equal(statusOf('sandbox.instance.policy-stale'), 409)
  assert.equal(statusOf('sandbox.cdp.page-lost'), 502)
  assert.equal(ERROR_CATALOG.some((row) => row.example === 'backend.nvx.unimplemented'), false)
  const derived = ERROR_CATALOG.map((row) => `${row.example}\t${row.status}\t${row.cause}\t${row.next}`).join('\n')
  assert.equal(renderSkillTable(), derived)
})
