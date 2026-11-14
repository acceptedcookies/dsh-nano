import assert from 'node:assert/strict'
import test from 'node:test'
import { snapshotExpression } from '../lib/snapshot.js'
import {
  elementRefSelector, elementRefSummary, getElementRef, isElementRef, putElementRefs,
} from '../lib/diagnostics.js'

test('snapshotExpression injects a bounded, self-contained walker', () => {
  const expr = snapshotExpression(200)
  assert.match(expr, /var MAX = 200;/)
  assert.match(expr, /document\.(body|documentElement)/)
  assert.match(expr, /nth-of-type/)
  // Self-contained: no host scope leaks, valid as a JS expression string.
  assert.ok(new Function(`return (${expr})`) instanceof Function)
})

test('maxNodes is clamped to a safe bound', () => {
  assert.match(snapshotExpression(0), /var MAX = 200;/)     // 0 is falsy → default
  assert.match(snapshotExpression(99999), /var MAX = 500;/) // over cap → 500
  assert.match(snapshotExpression('abc'), /var MAX = 200;/) // NaN → default
  assert.match(snapshotExpression(50), /var MAX = 50;/)
})

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

test('a fresh snapshot replaces the whole ref table — stale refs never linger', () => {
  putElementRefs({ '@1': { role: 'button', name: 'A', selector: 'a' } }, 'https://a/')
  putElementRefs({ '@9': { role: 'link', name: 'B', selector: 'b' } }, 'https://b/')
  assert.equal(elementRefSelector('@1'), null) // replaced, not merged
  assert.equal(elementRefSelector('@9'), 'b')
  assert.equal(elementRefSummary().url, 'https://b/')
})
