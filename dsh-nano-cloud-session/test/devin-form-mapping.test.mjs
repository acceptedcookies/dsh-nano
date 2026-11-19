import test from 'node:test'
import assert from 'node:assert/strict'
import { formToCreateInput, encodeCreateSession, ProfileCodecError } from '../src/providers/devin/profile-codec.js'
import { createDevinApi } from '../src/providers/devin/api.js'

test('T20 form → codec → API keeps false/0 and maps every create field', async () => {
  const form = {
    prompt: 'do the thing',
    title: 't',
    repos: 'o/a\no/b',
    tags: 'x, y',
    devinMode: 'lite',
    maxAcuLimit: '0',
    resumable: 'false',
    playbookId: 'pb-1',
    knowledgeIds: ['k1'],
    secretIds: ['s1'],
    attachmentUrls: ['https://example.com/a'],
    createAsUserId: 'user-1',
    childPlaybookId: 'pb-child',
    platform: 'linux',
    bypassApproval: 'false',
    memoryEnabled: 'true',
    sessionLinks: 'https://a, https://b',
    securityProfileId: 'sec-1',
    structuredOutputSchema: '{"type":"object"}',
    structuredOutputRequired: 'true',
    sessionSecrets: '[{"name":"n","value":"v"}]',
  }
  const frozen = { ...form, knowledgeIds: [...form.knowledgeIds] }
  const input = formToCreateInput(form)
  assert.deepEqual(form.knowledgeIds, frozen.knowledgeIds)
  assert.equal(input.resumable, false)
  assert.equal(input.max_acu_limit, 0)
  assert.equal(input.bypass_approval, false)
  assert.equal(input.memory_enabled, true)
  assert.deepEqual(input.repos, ['o/a', 'o/b'])
  assert.deepEqual(input.tags, ['x', 'y'])
  const body = encodeCreateSession(input)
  assert.equal(body.resumable, false)
  assert.equal(body.max_acu_limit, 0)
  assert.equal(body.devin_mode, 'lite')
  assert.equal(body.playbook_id, 'pb-1')
  assert.deepEqual(body.knowledge_ids, ['k1'])
  assert.deepEqual(body.secret_ids, ['s1'])
  assert.deepEqual(body.attachment_urls, ['https://example.com/a'])
  assert.equal(body.create_as_user_id, 'user-1')
  assert.equal(body.child_playbook_id, 'pb-child')
  assert.equal(body.platform, 'linux')
  assert.equal(body.bypass_approval, false)
  assert.equal(body.memory_enabled, true)
  assert.deepEqual(body.session_links, ['https://a', 'https://b'])
  assert.deepEqual(body.security_profile, { profile_id: 'sec-1' })
  assert.deepEqual(body.structured_output_schema, { type: 'object' })
  assert.equal(body.structured_output_required, true)
  /* legacy `name` entries normalize to the contract's {key,value} shape */
  assert.deepEqual(body.session_secrets, [{ key: 'n', value: 'v' }])
  const cap = {}
  const api = createDevinApi({
    fetchImpl: async (url, init) => {
      cap.url = String(url)
      cap.body = JSON.parse(init.body)
      return { ok: true, status: 200, text: async () => JSON.stringify({ session_id: 'x' }) }
    },
  })
  await api.createSession({ secret: 'cog_x', orgId: 'org-t', baseUrl: 'https://api.devin.ai' }, input)
  assert.equal(cap.body.resumable, false)
  assert.equal(cap.body.max_acu_limit, 0)
  assert.equal(cap.body.devin_mode, 'lite')
})

test('T20 invalid JSON leaves the form object untouched', () => {
  const form = { prompt: 'p', sessionSecrets: '{', structuredOutputSchema: '' }
  assert.throws(() => formToCreateInput(form), ProfileCodecError)
  assert.equal(form.sessionSecrets, '{')
  assert.equal(form.prompt, 'p')
})

test('session_secrets uses {key,value,sensitive}; sensitive:false survives; bad sensitive rejected', () => {
  const input = formToCreateInput({ prompt: 'p', sessionSecrets: '[{"key":"A","value":"1","sensitive":false},{"name":"B","value":"2"}]' })
  assert.deepEqual(input.session_secrets, [{ key: 'A', value: '1', sensitive: false }, { key: 'B', value: '2' }])
  const body = encodeCreateSession(input)
  assert.deepEqual(body.session_secrets, [{ key: 'A', value: '1', sensitive: false }, { key: 'B', value: '2' }])
  assert.throws(() => formToCreateInput({ prompt: 'p', sessionSecrets: '[{"value":"v"}]' }), ProfileCodecError)
  assert.throws(() => formToCreateInput({ prompt: 'p', sessionSecrets: '{"key":"k"}' }), ProfileCodecError)
  assert.throws(() => formToCreateInput({ prompt: 'p', sessionSecrets: '[{"key":"k","value":"v","sensitive":"true"}]' }), ProfileCodecError)
})

test('security profile tri-state: inherit omits, none is unconditional null, custom requires id', () => {
  const inherit = formToCreateInput({ prompt: 'p', securityProfileMode: 'inherit' })
  assert.equal(inherit.security_profile, undefined)
  assert.equal(encodeCreateSession(inherit).security_profile, undefined)
  const none = formToCreateInput({ prompt: 'p', securityProfileMode: 'none' })
  assert.deepEqual(none.security_profile, { profile_id: null })
  assert.deepEqual(encodeCreateSession(none).security_profile, { profile_id: null })
  const custom = formToCreateInput({ prompt: 'p', securityProfileMode: 'custom', securityProfileId: 'sec-9' })
  assert.deepEqual(custom.security_profile, { profile_id: 'sec-9' })
  assert.throws(() => formToCreateInput({ prompt: 'p', securityProfileMode: 'custom' }), ProfileCodecError)
  assert.throws(() => formToCreateInput({ prompt: 'p', securityProfileMode: 'custom', securityProfileId: '  ' }), ProfileCodecError)
  /* 'none' is unconditional: a leftover typed id cannot resurrect a profile */
  const mixed = formToCreateInput({ prompt: 'p', securityProfileMode: 'none', securityProfileId: 'sec-9' })
  assert.deepEqual(mixed.security_profile, { profile_id: null })
  /* 'inherit' is unconditional too */
  const inheritWithId = formToCreateInput({ prompt: 'p', securityProfileMode: 'inherit', securityProfileId: 'sec-9' })
  assert.equal(inheritWithId.security_profile, undefined)
})
