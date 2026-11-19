import assert from 'node:assert/strict'
import test from 'node:test'
import {
  elementRefSelector, elementRefSummary, getElementRef, isElementRef, putElementRefs,
} from '../lib/diagnostics.js'

// NOTE: lib/snapshot.js was removed — its snapshotExpression was a second
// source of truth for DNLS's inline walker. These tests now cover only the
// ref helpers that diagnostics.js still exports.
test('element ref store: @N round-trips to a selector', () => {
  putElementRefs({ '@1': { role: 'button', name: 'Go', selector: 'form>button' }, '@2': { role: 'link', name: 'x', selector: 'nav>a:nth-of-type(2)' } }, 'https://x/')

  assert.equal(isElementRef('@1'), true)
  assert.equal(isElementRef('@12'), true)
  assert.equal(isElementRef('@'), false)
  assert.equal(isElementRef('#btn'), false)
  assert.equal(isElementRef('a>b'), false)

  assert.equal(elementRefSelector('@1'), 'form>button')
  assert.equal(elementRefSelector('@2'), 'nav>a:nth-of-type(2)')
  assert.equal(elementRefSelector('@9'), null)
  assert.equal(getElementRef('@1').role, 'button')
  assert.equal(elementRefSummary().count, 2)
  assert.equal(elementRefSummary().url, 'https://x/')
})
