import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDevinApi, CarrierError } from '../src/host/devin-api.js'

const profile = { secret: 'cog_x', orgId: 'org-test', baseUrl: 'https://api.devin.ai' }

function fakeFetch(status, json, capture) {
  return async (url, init) => {
    if (capture) { capture.url = String(url); capture.init = init }
    return { ok: status < 400, status, text: async () => JSON.stringify(json ?? {}) }
  }
}

test('self: bearer + path', async () => {
  const cap = {}
  const api = createDevinApi({ fetchImpl: fakeFetch(200, { principal_type: 'pat_user' }, cap) })
  const r = await api.self(profile)
  assert.equal(r.principal_type, 'pat_user')
  assert.equal(cap.init.headers.authorization, 'Bearer cog_x')
  assert.equal(cap.url, 'https://api.devin.ai/v3/self')
})

test('listSessions: org path + flat query params (spike-proven shape)', async () => {
  const cap = {}
  const api = createDevinApi({ fetchImpl: fakeFetch(200, { items: [] }, cap) })
  await api.listSessions(profile, { first: 50, after: 'cur', tags: ['a'], isArchived: false })
  const u = new URL(cap.url)
  assert.equal(u.pathname, '/v3/organizations/org-test/sessions')
  assert.equal(u.searchParams.get('first'), '50')
  assert.equal(u.searchParams.get('after'), 'cur')
  assert.equal(u.searchParams.getAll('tags')[0], 'a')
})

test('create: field mapping camelCase → upstream snake_case', async () => {
  const cap = {}
  const api = createDevinApi({ fetchImpl: fakeFetch(200, { session_id: 'x' }, cap) })
  await api.createSession(profile, { prompt: 'p', devinMode: 'lite', maxAcuLimit: 2, resumable: false, repos: ['o/r'] })
  const body = JSON.parse(cap.init.body)
  assert.equal(body.devin_mode, 'lite')
  assert.equal(body.max_acu_limit, 2)
  assert.equal(body.resumable, false)
  assert.deepEqual(body.repos, ['o/r'])
})

test('error dialect: 403 → forbidden-or-invisible (spike fact, not 404)', async () => {
  const api = createDevinApi({ fetchImpl: fakeFetch(403, { error: 'no' }) })
  await assert.rejects(() => api.getSession(profile, 'devin-nope'),
    (e) => e instanceof CarrierError && e.reason === 'forbidden-or-invisible' && e.status === 403)
})

test('error dialect: 422 → invalid-request; 5xx → upstream-error', async () => {
  await assert.rejects(() => createDevinApi({ fetchImpl: fakeFetch(422, {}) }).listSessions(profile),
    e => e.reason === 'invalid-request')
  await assert.rejects(() => createDevinApi({ fetchImpl: fakeFetch(500, {}) }).self(profile),
    e => e.reason === 'upstream-error')
})

test('network failure → unreachable', async () => {
  const api = createDevinApi({ fetchImpl: async () => { throw new Error('ECONNREFUSED') } })
  await assert.rejects(() => api.self(profile), e => e.reason === 'unreachable' && e.status === 0)
})

test('terminate uses DELETE on session path', async () => {
  const cap = {}
  const api = createDevinApi({ fetchImpl: fakeFetch(200, {}, cap) })
  await api.terminate(profile, 'devin-abc')
  assert.equal(cap.init.method, 'DELETE')
  assert.match(cap.url, /\/sessions\/devin-abc$/)
})
