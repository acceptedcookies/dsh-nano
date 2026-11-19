import test from 'node:test'
import assert from 'node:assert/strict'
import { assertProbeIdentity } from '../scripts/lib/probe-target.mjs'

const profile = { id: 'p1', orgId: 'org-9', secret: 'cog_x', baseUrl: 'https://api.devin.ai' }
const api = (self, session) => ({
  self: async () => self,
  getSession: async () => session,
})

test('probe identity requires devin_sessions_org_id and the same parsed session id', async () => {
  const ok = await assertProbeIdentity({
    api: api({ devin_sessions_org_id: 'org-9', principal_type: 'pat_user' }, { session_id: 'abc-123' }),
    profile, sessionId: 'devin-abc-123',
  })
  assert.equal(ok.remote.bare, 'abc-123')

  /* Other org-shaped fields are not accepted as stand-ins. */
  await assert.rejects(() => assertProbeIdentity({
    api: api({ org_id: 'org-9', principal_type: 'pat_user' }, { session_id: 'abc-123' }),
    profile, sessionId: 'devin-abc-123',
  }), /reports org none/)

  await assert.rejects(() => assertProbeIdentity({
    api: api({ devin_sessions_org_id: 'org-other' }, { session_id: 'abc-123' }),
    profile, sessionId: 'devin-abc-123',
  }), /org-other/)

  await assert.rejects(() => assertProbeIdentity({
    api: api({ devin_sessions_org_id: 'org-9' }, { session_id: 'different-1' }),
    profile, sessionId: 'devin-abc-123',
  }), /mismatch/)
})
