// NUE1117-T12: toast and tabs wrap host components; the self-drawn skins are gone.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hits, readSrc, sourceFiles } from './_lib.mjs'

test('.nano-toast and .nano-tab are gone from styles and component sources', () => {
  const files = sourceFiles()
  assert.ok(files.length > 0)
  const skins = /nano-toast|nano-tab(?![a-z-])/
  assert.deepEqual(hits(files, skins), [])
  assert.equal(hits([{ path: 'f.js', text: "className: 'nano-tab'\n.nano-toast {}\n.nano-table {}" }], skins).length, 2)
})

test('NanoToast renders the host Toast', () => {
  const src = readSrc('toast.js')
  assert.match(src, /import \{ Toast \} from '@deepseek-ai\/dsh-client-ui-primitives'/)
  assert.match(src, /createElement\(Toast, \{/)
  assert.match(src, /text === ''\) return null/)
  assert.match(src, /onDone: onDone \?\? noop/)
})

test('NanoTabs and nanoTabs both render SegmentedControl; nanoTabs keeps { el, select, value }', () => {
  const src = readSrc('tabs.js')
  assert.match(src, /import \{ SegmentedControl \} from '@deepseek-ai\/dsh-client-ui-primitives'/)
  const dom = src.slice(src.indexOf('export function nanoTabs'), src.indexOf('export function NanoTabs'))
  const react = src.slice(src.indexOf('export function NanoTabs'))
  assert.match(dom, /mountNano\(el, SegmentedControl,/)
  assert.match(react, /h\(SegmentedControl, \{/)
  assert.match(dom, /return \{ el, select, value: \(\) => current \}/)
  assert.match(dom, /item\.panel\.hidden = item\.value !== next/)
  assert.doesNotMatch(src, /addEventListener|keydown/)
})
