/**
 * The ⌘E→1 / Alt+E→1 chord.
 *
 * macOS: ⌘E then 1. Windows: Alt+E then 1, because Alt sits where ⌘ sits on a
 * Mac keyboard and Ctrl is a long reach from the home row. Ctrl stays accepted
 * on Windows as a fallback — Alt+E is also Chrome's "open the menu" accelerator,
 * so the browser may claim the first key and leave the chord incomplete.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chordAria, chordKeys, primaryDown } from '../src/client/shortcut.js'

const ev = (mods) => ({ altKey: false, ctrlKey: false, metaKey: false, ...mods })

test('Windows advertises Alt+E, macOS keeps ⌘E', () => {
  assert.equal(chordKeys('windows'), 'Alt+E 1')
  assert.equal(chordKeys('macos'), '⌘E1')
  assert.equal(chordAria('windows'), 'Alt+E+1 Control+E+1')
  assert.equal(chordAria('macos'), 'Meta+E+1')
})

test('Windows arms on Alt alone or Ctrl alone', () => {
  assert.equal(primaryDown(ev({ altKey: true }), 'windows'), true)
  assert.equal(primaryDown(ev({ ctrlKey: true }), 'windows'), true)
})

test('Windows ignores bare keys and the wrong modifiers', () => {
  assert.equal(primaryDown(ev({}), 'windows'), false)
  assert.equal(primaryDown(ev({ metaKey: true }), 'windows'), false)
  assert.equal(primaryDown(ev({ shiftKey: true }), 'windows'), false)
})

test('AltGr (Ctrl+Alt) does not arm the chord', () => {
  /* AltGr+E types a character on several layouts (€ on many European ones);
     arming on it would make the notepad pop up mid-word. */
  assert.equal(primaryDown(ev({ altKey: true, ctrlKey: true }), 'windows'), false)
})

test('macOS stays ⌘-only', () => {
  assert.equal(primaryDown(ev({ metaKey: true }), 'macos'), true)
  assert.equal(primaryDown(ev({ ctrlKey: true }), 'macos'), false)
  assert.equal(primaryDown(ev({ altKey: true }), 'macos'), false)
  assert.equal(primaryDown(ev({ metaKey: true, altKey: true }), 'macos'), false)
  assert.equal(primaryDown(ev({ metaKey: true, ctrlKey: true }), 'macos'), false)
})
