// NUE1117-T13: window overlay contract.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hits, readSrc, sourceFiles } from './_lib.mjs'

const OVERLAY = readSrc('overlay.js')
const DOM = readSrc('dom.js')
const STYLES = readSrc('styles.js')

test('useModalLayer is called at the top level of NanoWindowDialog', () => {
  const body = OVERLAY.slice(OVERLAY.indexOf('export function NanoWindowDialog'))
  const lines = body.split('\n')
  const call = lines.findIndex(line => line.includes('useModalLayer('))
  assert.ok(call > 0, 'useModalLayer call missing')
  assert.match(lines[call], /^ {2}useModalLayer\(cardRef, true, onCancel\)$/, 'must sit at function-body indentation')
  const before = lines.slice(1, call).join('\n')
  assert.doesNotMatch(before, /\bif\b|\breturn\b|=>\s*\{/, 'no branch or nested function before the hook')
})

test('no body portals, no MutationObserver, no parentElement walks', () => {
  const files = sourceFiles()
  assert.deepEqual(hits(files, /createPortal\([^)]*document\.body/), [])
  assert.deepEqual(hits(files, /MutationObserver/), [])
  assert.deepEqual(hits([{ path: 'overlay.js', text: OVERLAY }, { path: 'dom.js', text: DOM }], /parentElement/), [])
  assert.match(OVERLAY, /createPortal\(overlay, container\)/)
})

test('a missing or detached container throws instead of falling back to body', () => {
  const guard = OVERLAY.slice(OVERLAY.indexOf('export function assertContainer'), OVERLAY.indexOf('export function NanoWindowDialog'))
  assert.match(guard, /!\(container instanceof HTMLElement\) \|\| !container\.isConnected/)
  assert.match(guard, /throw new Error\(/)
  assert.match(DOM, /if \(container !== undefined\) assertContainer\(container, 'openNanoDialog'\)/)
  assert.match(DOM, /if \(container !== undefined\) assertContainer\(container, 'openNanoMenu'\)/)
})

test('openNanoDialog has exactly the two carriers', () => {
  assert.match(DOM, /container === undefined \? NanoDialog : NanoWindowDialog/)
})

test('overlay re-enables pointer events and uses host Button only', () => {
  const rule = /\.nano-overlay \{([^}]*)\}/.exec(STYLES)
  assert.ok(rule)
  assert.match(rule[1], /pointer-events: auto/)
  assert.match(rule[1], /inset: 0/)
  assert.doesNotMatch(OVERLAY, /'button'/)
  assert.doesNotMatch(OVERLAY, /\btheme\b/)
})
