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

test('full create mapping: advanced fields and snake/camel aliases', async () => {
  const cap = {}
  const api = createDevinApi({ fetchImpl: fakeFetch(200, { session_id: 'x' }, cap) })
  await api.createSession(profile, {
    prompt: 'p', title: 't', tags: ['a'], repos: ['o/r'],
    devinMode: 'ultra', maxAcuLimit: 12, resumable: false,
    playbookId: 'pb', knowledgeIds: ['kn'], secretIds: ['sec'],
    attachmentUrls: ['https://example.test/a.png'], platform: 'windows',
    bypassApproval: true, childPlaybookId: 'child', createAsUserId: 'user-1',
    memoryEnabled: false, sessionSecrets: [{ key: 'K', value: 'V', sensitive: true }],
    sessionLinks: ['https://example.test/link'], securityProfile: { profile_id: 'sp' },
    structuredOutputSchema: { type: 'object' }, structuredOutputRequired: true,
  })
  const body = JSON.parse(cap.init.body)
  assert.equal(body.devin_mode, 'ultra')
  assert.equal(body.max_acu_limit, 12)
  assert.equal(body.playbook_id, 'pb')
  assert.deepEqual(body.knowledge_ids, ['kn'])
  assert.deepEqual(body.secret_ids, ['sec'])
  assert.deepEqual(body.attachment_urls, ['https://example.test/a.png'])
  assert.equal(body.bypass_approval, true)
  assert.equal(body.child_playbook_id, 'child')
  assert.equal(body.create_as_user_id, 'user-1')
  assert.equal(body.memory_enabled, false)
  assert.deepEqual(body.session_secrets, [{ key: 'K', value: 'V', sensitive: true }])
  assert.deepEqual(body.session_links, ['https://example.test/link'])
  assert.deepEqual(body.security_profile, { profile_id: 'sp' })
  assert.deepEqual(body.structured_output_schema, { type: 'object' })
  assert.equal(body.structured_output_required, true)
})

test('listSessions forwards all documented filters', async () => {
  const cap = {}
  const api = createDevinApi({ fetchImpl: fakeFetch(200, { items: [] }, cap) })
  await api.listSessions(profile, {
    first: 50, after: 'c', tags: ['t'], origins: ['api'], isArchived: true,
    createdAfter: 1, createdBefore: 2, updatedAfter: 3, updatedBefore: 4,
    category: 'feature_development', userIds: ['u'], repoNames: ['o/r'],
    devinId: 'devin-x', sessionIds: ['devin-y'], playbookId: 'pb',
    scheduleId: 'sch', serviceUserIds: ['su'], automationIds: ['au'],
    parentSessionId: 'devin-parent',
  })
  const u = new URL(cap.url)
  for (const [key, value] of Object.entries({
    first: '50', after: 'c', is_archived: 'true', created_after: '1', created_before: '2',
    updated_after: '3', updated_before: '4', category: 'feature_development',
    devin_id: 'devin-x', playbook_id: 'pb', schedule_id: 'sch', parent_session_id: 'devin-parent',
  })) assert.equal(u.searchParams.get(key), value, key)
  assert.equal(u.searchParams.getAll('tags')[0], 't')
  assert.equal(u.searchParams.getAll('origins')[0], 'api')
  assert.equal(u.searchParams.getAll('session_ids')[0], 'devin-y')
  assert.equal(u.searchParams.getAll('user_ids')[0], 'u')
  assert.equal(u.searchParams.getAll('repo_names')[0], 'o/r')
  assert.equal(u.searchParams.getAll('service_user_ids')[0], 'su')
  assert.equal(u.searchParams.getAll('automation_ids')[0], 'au')
})

test('session ops: tags append, sleep, insights generate, catalog paths', async () => {
  for (const [fn, expected] of [
    [api => api.appendTags(profile, 'devin-x', ['a']), 'POST'],
    [api => api.sleep(profile, 'devin-x'), 'POST'],
    [api => api.generateInsights(profile, 'devin-x'), 'POST'],
  ]) {
    const cap = {}
    const instance = createDevinApi({ fetchImpl: fakeFetch(200, {}, cap) })
    await fn(instance)
    assert.equal(cap.init.method, expected)
  }
  const cap = {}
  const instance = createDevinApi({ fetchImpl: fakeFetch(200, { items: [] }, cap) })
  await instance.listPlaybooks(profile)
  assert.match(cap.url, /\/playbooks\?/)
  await instance.listSecrets(profile)
  assert.match(cap.url, /\/secrets\?/)
  await instance.listKnowledgeNotes(profile)
  assert.match(cap.url, /\/knowledge\/notes\?/)
  await instance.listRepositories(profile)
  assert.match(cap.url, /\/repositories\?/)
})

test('uploadAttachment posts multipart FormData with bearer', async () => {
  const cap = {}
  const api = createDevinApi({ fetchImpl: fakeFetch(200, { attachment_id: 'a' }, cap) })
  await api.uploadAttachment(profile, { name: 'a.txt', contentType: 'text/plain', bytes: Buffer.from('hello') })
  assert.equal(cap.init.method, 'POST')
  assert.equal(cap.init.headers['content-type'], undefined)
  assert.ok(cap.init.body instanceof FormData)
})
