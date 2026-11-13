import assert from 'node:assert/strict'
import test from 'node:test'
import { contentFrame, shotPoint } from '../src/shared/shot-point.js'

const box = { x: 0, y: 0, width: 200, height: 220 }
const natural = { width: 1280, height: 720 }
// scale = min(200/1280, 220/720) = 0.15625 → drawn 200×112.5, centered →
// offsetX = 0, offsetY = (220-112.5)/2 = 53.75
const frame = contentFrame({ width: 200, height: 220 }, natural)

test('content is centered on BOTH axes (matches object-position: center)', () => {
  assert.equal(frame.left, 0)
  assert.equal(frame.top, 53.75)
  assert.equal(frame.width, 200)
  assert.equal(Math.round(frame.height), 113)
  assert.ok(frame.height < 220)
})

test('a click in the drawn band maps into screenshot pixels', () => {
  const inside = shotPoint(box, natural, { x: 100, y: 53.75 + 56.25 })
  assert.deepEqual(inside, { x: 640, y: 360 })
})

test('clicks above/below the drawn band are letterbox, not page', () => {
  assert.equal(shotPoint(box, natural, { x: 100, y: 10 }), null)
  assert.equal(shotPoint(box, natural, { x: 100, y: 210 }), null)
  assert.equal(shotPoint(box, natural, { x: 100, y: 53 }), null) // just above the band
})

test('a short/wide element letterboxes horizontally instead', () => {
  const wide = { x: 0, y: 0, width: 400, height: 100 }
  const f = contentFrame({ width: 400, height: 100 }, natural)
  assert.ok(f.left > 0 && f.top === 0)
  assert.equal(shotPoint(wide, natural, { x: 10, y: 50 }), null)
})
