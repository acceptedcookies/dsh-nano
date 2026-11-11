import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRateLimiter } from '../src/rate.js'

test('acquire grants burst then throttles', async () => {
  const limiter = createRateLimiter({ rps: 2, burst: 2, concurrency: 10 })
  await limiter.acquire(); limiter.done()
  await limiter.acquire(); limiter.done()
  const t0 = Date.now()
  await limiter.acquire(); limiter.done()
  assert.ok(Date.now() - t0 >= 400, `third acquire should wait ~500ms, got ${Date.now() - t0}ms`)
})

test('concurrency caps in-flight slots', async () => {
  const limiter = createRateLimiter({ rps: 100, concurrency: 1 })
  await limiter.acquire()
  let second = false
  const pending = limiter.acquire().then(() => { second = true })
  await new Promise(r => setTimeout(r, 20))
  assert.equal(second, false)
  limiter.done()
  await pending
  limiter.done()
  assert.equal(second, true)
})

test('chargeUpload returns a positive wait past the bucket', () => {
  const limiter = createRateLimiter({ kbps: 1 })
  assert.equal(limiter.chargeUpload(512), 0)
  assert.ok(limiter.chargeUpload(2048) > 0)
})
