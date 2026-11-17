import assert from 'node:assert/strict'
import test from 'node:test'
import { captureNavigation, requestTimeout } from '../src/shared/navigation.js'

const paths = { openPath: '/nano-local-sandbox/open', shotPath: '/nano-local-sandbox/shot' }

test('navigation and screenshot HTTP deadlines exceed their host CDP budgets', () => {
  assert.ok(requestTimeout(paths.openPath) > 45000)
  assert.ok(requestTimeout(paths.shotPath) > 30000)
})

test('one intent waits for navigation before one capture, accepts the final redirect URL', async () => {
  const calls = []
  let finish
  const opened = new Promise(resolve => { finish = resolve })
  const frame = { data: 'image', url: 'https://www.archy.studio/projects' }
  const post = async (path, body) => {
    calls.push({ path, body })
    if (path === paths.openPath) return opened
    return frame
  }
  const result = captureNavigation(post, { ...paths, url: 'archy.studio', fit: { width: 1280, height: 720 } })
  await Promise.resolve()
  assert.equal(calls.length, 1, 'no capture while navigation is running')
  finish({ ok: true })
  assert.equal(await result, frame)
  assert.deepEqual(calls.map(call => call.path), [paths.openPath, paths.shotPath])
  assert.deepEqual(calls[1].body.fit, { width: 1280, height: 720 })
})

test('a navigation error is not silently retried or hidden by capture', async () => {
  let calls = 0
  const error = new Error('navigation still running')
  await assert.rejects(captureNavigation(async () => { calls++; throw error }, { ...paths, url: 'https://archy.studio' }), error)
  assert.equal(calls, 1)
})

test('a blank frame is not counted as a successful navigation', async () => {
  await assert.rejects(captureNavigation(async path => path === paths.openPath ? { ok: true } : { data: 'old', url: 'about:blank' }, { ...paths, url: 'https://archy.studio' }), { errorId: 'kitesurf.navigate.failed' })
})
