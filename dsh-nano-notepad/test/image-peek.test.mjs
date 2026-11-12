/**
 * Stored-image hover preview (source view).
 *
 * In source view an image is plain text: `![alt](notepad-image:<id>)`. The
 * textarea paints transparent glyphs over the colourised mirror, so the only
 * way to know the pointer is over that token is to hit-test the mirror's spans.
 * highlightSource therefore tags the URL span with data-np-image — and that
 * tagging must not disturb the one invariant the mirror exists for: every span
 * changes colour only, never the glyph sequence, or the caret drifts off the
 * text it is editing.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { highlightSource } from '../src/client/highlight.js'

const ID = '0f93d888-adc6-4158-80f0-22048ab9127e'

/** Mirror HTML carries no text nodes of its own beyond the source glyphs. */
const plain = html => html.replace(/<[^>]*>/gu, '').replace(/&lt;/gu, '<').replace(/&gt;/gu, '>')
  .replace(/&quot;/gu, '"').replace(/&#39;/gu, "'").replace(/&amp;/gu, '&')

test('a stored-image link is tagged with its id', () => {
  const html = highlightSource(`![image](notepad-image:${ID})`, false, 'md')
  assert.match(html, new RegExp(`data-np-image="${ID}"`))
  /* The visible URL text is still the whole token, untouched. */
  assert.equal(plain(html), `![image](notepad-image:${ID})`)
})

test('remote images and plain links are not tagged', () => {
  const remote = highlightSource('![a](https://example.com/x.png)', false, 'md')
  assert.doesNotMatch(remote, /data-np-image/)
  const link = highlightSource('[a](https://example.com/x.png)', false, 'md')
  assert.doesNotMatch(link, /data-np-image/)
})

test('only a canonical 36-char id is tagged', () => {
  for (const bad of ['notepad-image:short', 'notepad-image:', 'notepad-image:' + 'z'.repeat(36),
    'notepad-image:' + '0'.repeat(35), 'notepad-image:' + '0'.repeat(37)]) {
    const html = highlightSource(`![image](${bad})`, false, 'md')
    assert.doesNotMatch(html, /data-np-image/, bad)
  }
})

test('tagging preserves the glyph sequence, so the caret stays aligned', () => {
  const line = `before ![image](notepad-image:${ID}) after`
  assert.equal(plain(highlightSource(line, false, 'md')), line)
})

test('plain-text files never tag images', () => {
  const html = highlightSource(`![image](notepad-image:${ID})`, false, 'text')
  assert.doesNotMatch(html, /data-np-image/)
  assert.equal(plain(html), `![image](notepad-image:${ID})`)
})
