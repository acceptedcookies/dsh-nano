// NUE1117-T15: version stamp.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { VERSION } from '../src/version.js'
import { PKG, read, readSrc } from './_lib.mjs'

const pkg = JSON.parse(read(join(PKG, 'package.json')))

test('VERSION is 0.2.0 and matches package.json', () => {
  assert.equal(VERSION, '0.2.0')
  assert.equal(pkg.version, '0.2.0')
})

test('version.js carries a legal-comment marker equal to VERSION', () => {
  assert.ok(readSrc('version.js').startsWith(`/*! dsh-nano-ui@${VERSION} */\n`))
})

test('NANO_STYLES opens with the dsh-nano-ui@VERSION comment', () => {
  assert.match(readSrc('styles.js'), /export const NANO_STYLES = `\/\* dsh-nano-ui@\$\{VERSION\} \*\/\n/)
})

test('the package ships its catalog', () => {
  assert.ok(pkg.files.includes('catalog'))
  assert.equal(pkg.scripts.test, 'node --test test/*.test.mjs')
})

test('CHANGELOG 0.2.0 Removed lists every retired nano-ui surface', () => {
  const log = read(join(PKG, 'CHANGELOG.md'))
  const section = log.slice(log.indexOf('## 0.2.0'), log.indexOf('## 0.1.0'))
  const removed = section.slice(section.indexOf('### Removed'))
  assert.ok(section.includes('### Added') && section.includes('### Changed') && removed.length > 0)
  for (const word of ['MutationObserver', '`region`', '`theme`', '`z`', '--nano-dlg-', 'setTheme', 'NanoMenuItem', '.nano-menu', '.nano-tab', '.nano-toast', '[class*=', 'hex']) {
    assert.ok(removed.includes(word), word)
  }
})
