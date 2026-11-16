import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickPaneToTheRight } from '../src/client/pane-right.js'

const self = { top: 80, right: 900, bottom: 800 }

test('picks the nearest pane whose left edge is at or past this pane', () => {
  const id = pickPaneToTheRight(self, [
    { id: 'below', left: 400, top: 820, bottom: 1100, width: 400, height: 280 },
    { id: 'far', left: 1400, top: 80, bottom: 800, width: 320, height: 720 },
    { id: 'right', left: 908, top: 80, bottom: 800, width: 480, height: 720 },
    { id: 'left', left: 200, top: 80, bottom: 800, width: 400, height: 720 },
  ])
  assert.equal(id, 'right')
})

test('a divider-width overlap still counts as the pane on the right', () => {
  assert.equal(pickPaneToTheRight(self, [
    { id: 'touching', left: 892, top: 100, bottom: 700, width: 400, height: 600 },
  ]), 'touching')
})

test('no pane to the right yields nothing', () => {
  assert.equal(pickPaneToTheRight(self, [
    { id: 'left', left: 100, top: 80, bottom: 800, width: 500, height: 720 },
    { id: 'tiny', left: 1000, top: 80, bottom: 800, width: 4, height: 720 },
  ]), undefined)
})
