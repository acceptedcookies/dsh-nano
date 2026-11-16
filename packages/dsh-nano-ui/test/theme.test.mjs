// NUE1117-T10: scheme resolution and ThemeScope contract.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hostScheme, resolveScheme, schemeDeclarations } from '../src/theme-scheme.js'
import { catalog, hits, readSrc, sourceFiles } from './_lib.mjs'

const host = snapshot => ({ getTheme: () => snapshot })
const SCHEMES = catalog('tokens').schemes

test('host scheme: light, dark, unknown, missing service, throwing getTheme', () => {
  assert.equal(hostScheme(host({ active: { colorScheme: 'light' } })), 'light')
  assert.equal(hostScheme(host({ colorScheme: 'light' })), 'light')
  assert.equal(hostScheme(host({ active: { colorScheme: 'dark' } })), 'dark')
  assert.equal(hostScheme(host({ active: {} })), 'dark')
  assert.equal(hostScheme(host(undefined)), 'dark')
  assert.equal(hostScheme({}), 'dark')
  assert.equal(hostScheme(undefined), 'dark')
  assert.equal(hostScheme({ getTheme: () => { throw new Error('boom') } }), 'dark')
})

test('pin wins when it names a scheme; otherwise the host decides', () => {
  const light = host({ active: { colorScheme: 'light' } })
  const dark = host({ active: { colorScheme: 'dark' } })
  assert.equal(resolveScheme({ pin: 'light', theme: dark }), 'light')
  assert.equal(resolveScheme({ pin: 'dark', theme: light }), 'dark')
  assert.equal(resolveScheme({ pin: 'light', theme: light }), 'light')
  assert.equal(resolveScheme({ pin: 'system', theme: light }), 'light')
  assert.equal(resolveScheme({ theme: light }), 'light')
  assert.equal(resolveScheme({}), 'dark')
})

test('same scheme as host injects nothing; a different one injects catalog values only', () => {
  assert.deepEqual(schemeDeclarations({ schemes: SCHEMES, scheme: 'light', host: 'light' }), [])
  for (const scheme of ['light', 'dark']) {
    const other = scheme === 'light' ? 'dark' : 'light'
    const decls = schemeDeclarations({ schemes: SCHEMES, scheme, host: other })
    assert.ok(decls.length >= 100, `${scheme}: ${decls.length} declarations`)
    for (const [name, value] of decls) {
      assert.match(name, /^--dsw-/)
      assert.equal(value, SCHEMES[scheme][name])
    }
  }
  assert.throws(() => schemeDeclarations({ schemes: {}, scheme: 'light', host: 'dark' }), /no "light" scheme/)
})

test('theme.js reads the catalog, stamps data-nano-scheme and cleans up on dispose', () => {
  const src = readSrc('theme.js')
  assert.match(src, /from '\.\.\/catalog\/tokens\.json'/)
  assert.match(src, /setAttribute\('data-nano-scheme', scheme\)/)
  const dispose = src.slice(src.indexOf('dispose: () =>'))
  assert.match(dispose, /unsubscribe\(\)/)
  assert.match(dispose, /clear\(\)/)
  assert.match(dispose, /removeAttribute\('data-nano-scheme'\)/)
  assert.match(src, /const clear = \(\) => \{\s*for \(const name of written\) element\.style\.removeProperty\(name\)/)
})

test('nano-ui never reads body[data-ds-dark-theme]', () => {
  assert.deepEqual(hits(sourceFiles(), /data-ds-dark-theme/), [])
})
