import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeUrl } from '../src/client/safe-url.js'

test('safeUrl admits only https URLs without credentials', () => {
  assert.equal(safeUrl('https://files.example.com/a.pdf'), 'https://files.example.com/a.pdf')
  assert.equal(safeUrl('http://files.example.com/a.pdf'), null)
  assert.equal(safeUrl('javascript:alert(1)'), null)
  assert.equal(safeUrl('https://user:pass@files.example.com/a.pdf'), null)
  assert.equal(safeUrl('https://user@files.example.com/a.pdf'), null)
  assert.equal(safeUrl('file:///etc/passwd'), null)
  assert.equal(safeUrl('not a url'), null)
  assert.equal(safeUrl(''), null)
  assert.equal(safeUrl(null), null)
  assert.equal(safeUrl(undefined), null)
})

test('safeUrl rejects credential-carrying edge cases and protocol-relative tricks', () => {
  assert.equal(safeUrl('//evil.com/x'), null)
  assert.equal(safeUrl('https:evil.com'), 'https://evil.com/')
  assert.equal(safeUrl('HTTPS://files.example.com/a.pdf'), 'https://files.example.com/a.pdf')
  assert.equal(safeUrl('https://u%40ser@files.example.com/x'), null)
})
