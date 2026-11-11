/**
 * P3-04 / P3-05 / P3-06 — consumption-point guards around the render batch:
 *   - checkImage: strict mime/base64 gate before a payload can reach
 *     <img src="data:…"> (sync.js pull + markdown.js inline render);
 *   - cleanRemoteFile + escapeAttr: manifest fields can never inject into
 *     data-* attributes (sync.js / panel.js);
 *   - validateJson MAX_DEPTH: deep nesting fails controlled, not RangeError.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkImage } from 'dsh-remote-data-schema/image-check.js'
import { cleanRemoteFile } from '../src/client/sync.js'
import { escapeAttr } from '../src/client/markdown.js'
import { validateJson } from '../src/client/json.js'

/* ------------------------------------------------------------------ *
 * P3-04 — checkImage                                                  *
 * ------------------------------------------------------------------ */

test('checkImage accepts every whitelisted mime with canonical base64', () => {
  const b64 = Buffer.from('PNG!').toString('base64')
  for (const mime of ['image/png', 'image/jpeg', 'image/gif', 'image/webp']) {
    assert.equal(checkImage({ mime, base64: b64 }), true, mime)
  }
})

test('checkImage rejects non-whitelisted / missing / malformed payloads', () => {
  const b64 = Buffer.from('PNG!').toString('base64')
  assert.equal(checkImage({ mime: 'image/svg+xml', base64: b64 }), false)
  assert.equal(checkImage({ mime: 'text/html', base64: b64 }), false)
  assert.equal(checkImage({ mime: 'application/octet-stream', base64: b64 }), false)
  assert.equal(checkImage({ mime: 'IMAGE/PNG', base64: b64 }), false)
  assert.equal(checkImage({ mime: 'image/png', base64: b64.slice(0, -1) }), false) // %4
  assert.equal(checkImage({ mime: 'image/png', base64: 'PH!!' }), false) // charset
  /* 'AB==' is valid-length/charset but non-canonical: atob accepts it yet
     btoa(atob) produces 'AA==' — the decode/re-encode gate must catch it. */
  assert.equal(checkImage({ mime: 'image/png', base64: 'AB==' }), false)
  assert.equal(checkImage({ mime: 'image/png', base64: 42 }), false)
  assert.equal(checkImage({ base64: b64 }), false)
  assert.equal(checkImage({ mime: 'image/png' }), false)
  assert.equal(checkImage(null), false)
  assert.equal(checkImage('image/png'), false)
})

test('checkImage enforces the decoded byte cap without decoding', () => {
  const b64 = Buffer.alloc(1024).toString('base64')
  assert.equal(checkImage({ mime: 'image/png', base64: b64 }, { maxBytes: 1024 }), true)
  assert.equal(checkImage({ mime: 'image/png', base64: b64 }, { maxBytes: 1023 }), false)
  /* A hostile huge string must reject on length, not on decode cost. */
  const huge = 'A'.repeat(40 * 1024 * 1024)
  assert.equal(checkImage({ mime: 'image/png', base64: huge }, { maxBytes: 5 * 1024 * 1024 }), false)
})

/* ------------------------------------------------------------------ *
 * P3-05 — manifest-field sanitization + attr escaping                  *
 * ------------------------------------------------------------------ */

test('cleanRemoteFile enforces the id charset and degrades bad ids', () => {
  assert.equal(cleanRemoteFile('a/b/../evil', { name: 'x' }), null)
  assert.equal(cleanRemoteFile('../up', { name: 'x' }), null)
  assert.equal(cleanRemoteFile('bad"id', { name: 'x' }), null)
  assert.equal(cleanRemoteFile('', { name: 'x' }), null)
  const ok = cleanRemoteFile('file_1-Ab', { name: 'n.md', parentId: 'p1', workspaceId: 'w1', updatedAt: 5 })
  assert.deepEqual(ok, { id: 'file_1-Ab', name: 'n.md', parentId: 'p1', workspaceId: 'w1', updatedAt: 5 })
  /* A hostile parentId/workspaceId degrades to null — never reaches data-*. */
  const bad = cleanRemoteFile('file_1', { name: 'n', parentId: '" onmouseover="x', workspaceId: '<svg>' })
  assert.equal(bad.parentId, null)
  assert.equal(bad.workspaceId, null)
  /* Non-string name falls back, non-number updatedAt drops. */
  const odd = cleanRemoteFile('file_1', { name: 42, updatedAt: 'soon' })
  assert.equal(odd.name, 'untitled.md')
  assert.equal(odd.updatedAt, undefined)
  assert.equal(cleanRemoteFile('file_1', null), null)
})

test('escapeAttr neutralizes attribute-breaking characters', () => {
  assert.equal(escapeAttr('a"b'), 'a&quot;b')
  assert.equal(escapeAttr('<svg onload=x>'), '&lt;svg onload=x&gt;')
  assert.equal(escapeAttr('" data-evil="x'), '&quot; data-evil=&quot;x')
  assert.equal(escapeAttr('normal-id_1'), 'normal-id_1')
  assert.equal(escapeAttr(null), '')
  assert.equal(escapeAttr(42), '42')
})

/* ------------------------------------------------------------------ *
 * P3-06 — validateJson depth cap                                      *
 * ------------------------------------------------------------------ */

test('validateJson fails controlled at depth 33, parses at 32', () => {
  const deep = n => '['.repeat(n) + '1' + ']'.repeat(n)
  const at32 = validateJson(deep(32))
  assert.equal(at32.ok, true)
  const over = validateJson(deep(33))
  assert.equal(over.ok, false)
  assert.equal(typeof over.pos, 'number')
  assert.match(over.message, /nesting exceeds 32/)
  /* A crafted mega-deep document must reject, never RangeError. */
  const bomb = validateJson(deep(100000))
  assert.equal(bomb.ok, false)
  /* Objects count too, and normal JSON is unaffected. */
  assert.equal(validateJson('{"a":{"b":{"c":[1,2,{"d":true}]}}}').ok, true)
  const objOver = validateJson('{"a":'.repeat(34) + '1' + '}'.repeat(34))
  assert.equal(objOver.ok, false)
})
