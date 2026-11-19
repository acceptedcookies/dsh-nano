import test from 'node:test'
import assert from 'node:assert/strict'
import { createDevinApi, CarrierError } from '../src/providers/devin/api.js'
import { pluginRouteGone } from '../src/client/api.js'

const profile = { secret: 'cog_x', orgId: 'org-test', baseUrl: 'https://api.devin.ai' }

function fakeFetch(status, json, capture) {
  return async (url, init) => {
    if (capture) { capture.url = String(url); capture.method = init.method ?? 'GET' }
    return { ok: status < 400, status, text: async () => JSON.stringify(json ?? {}) }
  }
}

test('T19 catalog 403 is forbidden-or-invisible, not an empty list', async () => {
  const api = createDevinApi({ fetchImpl: fakeFetch(403, { error: 'no' }) })
  await assert.rejects(() => api.listPlaybooks(profile), (error) => (
    error instanceof CarrierError && error.reason === 'forbidden-or-invisible' && error.status === 403
  ))
})

test('T19 insights 404 stays not-found; tags 409 stays conflict', async () => {
  const missing = createDevinApi({ fetchImpl: fakeFetch(404, { error: 'gone' }) })
  await assert.rejects(() => missing.getInsights(profile, 'devin-x'), (error) => error.reason === 'not-found')
  const conflict = createDevinApi({ fetchImpl: fakeFetch(409, { error: 'busy' }) })
  await assert.rejects(() => conflict.setTags(profile, 'devin-x', ['a']), (error) => error.reason === 'conflict')
})

test('T19 send-unknown is not-found; sleep and archive are distinct paths', async () => {
  const cap = {}
  const missing = createDevinApi({ fetchImpl: fakeFetch(404, { error: 'no session' }) })
  await assert.rejects(() => missing.postMessage(profile, 'devin-x', 'hi'), (error) => error.reason === 'not-found')
  const sleep = createDevinApi({ fetchImpl: fakeFetch(200, { ok: true }, cap) })
  await sleep.sleep(profile, 'devin-x')
  assert.match(cap.url, /\/sleep$/)
  assert.equal(cap.method, 'POST')
  await sleep.archive(profile, 'devin-x')
  assert.match(cap.url, /\/archive$/)
})

test('T19 plugin-disabled 404 is not a carrier not-found', () => {
  assert.equal(pluginRouteGone({ httpStatus: 404, reason: 'failed' }), true)
  assert.equal(pluginRouteGone({ httpStatus: 404, reason: 'not-found', providerStatus: 404 }), false)
})
