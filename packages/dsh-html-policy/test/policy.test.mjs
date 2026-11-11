/**
 * B3-T01 (skeleton) — dsh-html-policy unit tests.
 *
 * Phase 1 asserts the export surface and that the forced-drop set is complete
 * (it is the security boundary that exists NOW; the ALLOWED_* tables are
 * placeholders until Phase 3 / P3-01).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ALLOWED_ELEMENTS,
  ALLOWED_ATTRS,
  ALLOWED_SCHEMES,
  ALLOWED_STYLE_PROPS,
  DROP_ELEMENTS,
  DROP_SCHEMES,
  isDropAttr,
  isDropScheme,
  sanitizePolicy,
} from '../src/index.js'

test('all expected symbols are exported', () => {
  for (const sym of [ALLOWED_ELEMENTS, ALLOWED_ATTRS, ALLOWED_SCHEMES, ALLOWED_STYLE_PROPS, DROP_ELEMENTS]) {
    assert.ok(sym instanceof Set, 'policy sets are Sets')
  }
  assert.ok(DROP_SCHEMES instanceof Set)
  assert.equal(typeof isDropAttr, 'function')
  assert.equal(typeof isDropScheme, 'function')
  assert.equal(typeof sanitizePolicy, 'function')
})

test('DROP_ELEMENTS contains every forced-drop element', () => {
  const required = [
    'script', 'iframe', 'object', 'embed', 'base', 'meta',
    'form', 'input', 'button', 'textarea', 'select', 'link', 'style',
  ]
  for (const el of required) {
    assert.ok(DROP_ELEMENTS.has(el), `DROP_ELEMENTS missing "${el}"`)
  }
})

test('on* attributes and srcdoc are dropped', () => {
  for (const a of ['onclick', 'onload', 'ONERROR', 'onfocus', 'srcdoc', 'SRCDOC']) {
    assert.equal(isDropAttr(a), true, `expected drop for "${a}"`)
  }
  assert.equal(isDropAttr('href'), false)
  assert.equal(isDropAttr('class'), false)
})

test('active URL schemes are dropped', () => {
  for (const u of [
    'javascript:alert(1)', '  JaVaScRiPt:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=', 'vbscript:msgbox(1)',
    'file:///etc/passwd', 'data:,x',
  ]) {
    assert.equal(isDropScheme(u), true, `expected drop for "${u}"`)
  }
  // data:image/* is NOT a forced drop (the allowlist table decides)
  assert.equal(isDropScheme('data:image/png;base64,iVBORw0KGgo='), false)
  assert.equal(isDropScheme('https://mp.weixin.qq.com/s/abc'), false)
  assert.equal(isDropScheme('/relative/path'), false)
  assert.equal(isDropScheme('#fragment'), false)
})

test('DROP_SCHEMES lists the active schemes', () => {
  for (const s of ['javascript', 'data:text', 'vbscript', 'file']) {
    assert.ok(DROP_SCHEMES.has(s))
  }
})

test('ALLOWED_* tables are empty placeholders until Phase 3', () => {
  // Skeleton contract: no allowlist content yet — the drop sets are the only
  // live boundary. Phase 3 fills these; the test stays green either way by
  // asserting they are Sets (content assertions land with P3-01).
  assert.equal(ALLOWED_ELEMENTS.size, 0)
  assert.equal(ALLOWED_ATTRS.size, 0)
  assert.equal(ALLOWED_SCHEMES.size, 0)
  assert.equal(ALLOWED_STYLE_PROPS.size, 0)
})

test('sanitizePolicy stub throws (fail-closed until Phase 3)', () => {
  assert.throws(() => sanitizePolicy({ kind: 'element', name: 'p' }), /not implemented/)
})
