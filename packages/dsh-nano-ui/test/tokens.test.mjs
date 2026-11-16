// NUE1117-T08: nano-ui uses only catalog tokens, no hex colors, no `[class*=` grafts.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { catalog, hits, sourceFiles } from './_lib.mjs'

const TOKENS = catalog('tokens').tokens
const WRONG = ['--dsw-alias-label-error', '--dsw-alias-danger', '--dsw-alias-label-danger', '--dsw-alias-focus-ring', '--dsw-alias-tooltip-bg', '--dsw-alias-tooltip-label']

/** Host token names referenced through var() that the catalog does not record. */
export function unknownTokens(files) {
  const out = []
  for (const { path, text } of files) {
    for (const match of text.matchAll(/var\(\s*(--(?:dsw|dsh)-[a-z0-9-]+)/g)) {
      const entry = TOKENS[match[1]]
      if (entry === undefined || entry.prefix === true) out.push(`${path}: ${match[1]}`)
    }
  }
  return out
}
const HEX = /#[0-9a-fA-F]{3,8}\b/
const GRAFT = /\[class\*=/

test('catalog is present and non-empty (a missing catalog fails, never skips)', () => {
  assert.ok(Object.keys(TOKENS).length >= 437)
})

test('every var(--dsw-*/--dsh-*) in nano-ui is a catalog token', () => {
  const files = sourceFiles()
  assert.ok(files.length > 0)
  assert.deepEqual(unknownTokens(files), [])
})

test('the six known-wrong token names are gone', () => {
  for (const name of WRONG) assert.deepEqual(hits(sourceFiles(), new RegExp(`${name}(?![a-z0-9-])`)), [], name)
})

test('no hex colors and no [class*= selectors in nano-ui', () => {
  assert.deepEqual(hits(sourceFiles(), HEX), [])
  assert.deepEqual(hits(sourceFiles(), GRAFT), [])
})

test('positive control: the same scans flag a violating fixture', () => {
  const fixture = [{ path: 'fixture.js', text: '.x [class*="title"] { color: var(--dsw-alias-label-error, #e5534b); }' }]
  assert.equal(unknownTokens(fixture).length, 1)
  assert.equal(hits(fixture, HEX).length, 1)
  assert.equal(hits(fixture, GRAFT).length, 1)
  assert.equal(hits(fixture, new RegExp(`${WRONG[0]}(?![a-z0-9-])`)).length, 1)
})
