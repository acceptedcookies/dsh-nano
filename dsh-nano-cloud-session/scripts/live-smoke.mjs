/** Live smoke against the real carrier. Reads DEVIN_API_TOKEN + DEVIN_ORG_ID
 *  from env (or repo-root .env.devin.api). Runs the full lifecycle:
 *  self → create (max_acu_limit 2, resumable false) → message → get →
 *  archive → unarchive → terminate. ~0 ACU (spike-verified). */

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDevinApi } from '../src/host/devin-api.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
for (const candidate of [join(root, '../.env.devin.api'), join(root, '../../.env.devin.api')]) {
  if (!existsSync(candidate)) continue
  for (const line of readFileSync(candidate, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const token = process.env.DEVIN_API_TOKEN
const orgId = process.env.DEVIN_ORG_ID
if (!token || !orgId) { console.error('need DEVIN_API_TOKEN + DEVIN_ORG_ID'); process.exit(1) }

const api = createDevinApi()
const profile = { secret: token, orgId, baseUrl: 'https://api.devin.ai' }
const mark = (ok, name, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' | ' + extra : ''}`)
let failed = 0
const check = (ok, name, extra) => { mark(ok, name, extra); if (!ok) failed++ }

const self = await api.self(profile)
check(Boolean(self.devin_sessions_org_id), 'self', `${self.principal_type}/${self.api_key_name}`)

const created = await api.createSession(profile, {
  prompt: 'DNCS live smoke: reply with OK and stop.', title: 'dncs-live-smoke',
  tags: ['dsh-dncs', 'smoke'], devinMode: 'lite', maxAcuLimit: 2, resumable: false,
})
const id = created.session_id ?? created.id
check(Boolean(id), 'create', id)

if (id) {
  const msg = await api.postMessage(profile, id, 'smoke ping')
  check(Boolean(msg), 'message')
  const detail = await api.getSession(profile, id)
  check(['claimed', 'running', 'working', 'suspended', 'exit'].includes(detail.status) || Boolean(detail.session_id), 'get', detail.status)
  const msgs = await api.getMessages(profile, id, { first: 20 })
  check(Array.isArray(msgs.items ?? msgs.messages ?? msgs), 'messages', `${(msgs.items ?? []).length} items`)
  await api.archive(profile, id); check(true, 'archive')
  await api.unarchive(profile, id); check(true, 'unarchive')
  await api.terminate(profile, id); check(true, 'terminate (DELETE)')
  // DELETE on a LIVE session is suspend(user_request), async and not archive.
  let after = {}
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 5000))
    after = await api.getSession(profile, id).catch(e => ({ err: e.reason }))
    if (['suspended', 'exit'].includes(after.status)) break
  }
  check(['suspended', 'exit'].includes(after.status), 'post-terminate suspended/exit',
    JSON.stringify({ status: after.status, detail: after.status_detail }))
  await api.archive(profile, id)
  const closed = await api.getSession(profile, id)
  check(closed.is_archived === true, 'close-out archive', `is_archived=${closed.is_archived}`)
}
console.log(failed ? `\n${failed} FAIL` : '\nall PASS')
process.exit(failed ? 1 : 0)
