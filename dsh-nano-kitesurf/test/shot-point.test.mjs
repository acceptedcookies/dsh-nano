import assert from 'node:assert/strict'
import test from 'node:test'
import { contentFrame, shotPoint } from '../src/shared/shot-point.js'

test('contain letterbox clicks map into the screenshot and bars do not', () => {
  const box = { x: 0, y: 0, width: 200, height: 220 }
  const natural = { width: 1280, height: 720 }
  const inside = shotPoint(box, natural, { x: 100, y: 56 })
  assert.deepEqual(inside, { x: 640, y: 358 })
  assert.equal(shotPoint(box, natural, { x: 100, y: 200 }), null)
  const frame = contentFrame({ width: 200, height: 220 }, natural)
  assert.equal(frame.top, 0)
  assert.ok(frame.height < 220)
})
