import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickPaneToTheRight } from '../src/client/pane-right.js'

const self = { left: 400, top: 80, right: 900, bottom: 800 }

test('picks the nearest pane whose center is to the right', () => {
  const id = pickPaneToTheRight(self, [
    { id: 'below', left: 400, right: 800, top: 820, bottom: 1100, width: 400, height: 280 },
    { id: 'far', left: 1400, right: 1720, top: 80, bottom: 800, width: 320, height: 720 },
    { id: 'right', left: 908, right: 1388, top: 80, bottom: 800, width: 480, height: 720 },
    { id: 'left', left: 0, right: 400, top: 80, bottom: 800, width: 400, height: 720 },
  ])
  assert.equal(id, 'right')
})

test('a divider-width overlap still counts as the pane on the right', () => {
  assert.equal(pickPaneToTheRight(self, [
    { id: 'touching', left: 892, right: 1292, top: 100, bottom: 700, width: 400, height: 600 },
  ]), 'touching')
})

test('a border box wider than the painted column still sees the pane inside it', () => {
  // The files host can report a rect that covers the neighbor. The old
  // "left >= our right" test then dropped the only pane the reader can see.
  const wide = { left: 400, top: 80, right: 1400, bottom: 800 }
  assert.equal(pickPaneToTheRight(wide, [
    { id: 'right', left: 900, right: 1400, top: 80, bottom: 800, width: 500, height: 720 },
  ]), 'right')
})

test('column index wins over a misleading box', () => {
  assert.equal(pickPaneToTheRight({ ...self, column: 0 }, [
    { id: 'right', left: 200, right: 300, top: 80, bottom: 800, width: 100, height: 720, column: 1 },
    { id: 'further', left: 900, right: 1200, top: 80, bottom: 800, width: 300, height: 720, column: 2 },
  ]), 'right')
})

test('no pane to the right yields nothing', () => {
  assert.equal(pickPaneToTheRight(self, [
    { id: 'left', left: 0, right: 390, top: 80, bottom: 800, width: 390, height: 720 },
    { id: 'tiny', left: 1000, right: 1004, top: 80, bottom: 800, width: 4, height: 720 },
  ]), undefined)
})
