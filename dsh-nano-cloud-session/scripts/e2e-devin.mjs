/** Live Devin e2e smoke for the DNCS adapter.
 *
 *  Uses the active profile in $DSH_HOME/nano-cloud-session.json (or $DSH_HOME
 *  from the environment); never prints the token. Exercises:
 *  self → upload → create with attachment → poll messages → attachments →
 *  tags → sleep/status refresh → archive/unarchive.
 *
 *  Run against dsh-dev:
 *    npm run e2e                         # defaults to ~/.dsh-dev
 *    E2E_DSH_HOME=/path/to/home npm run e2e
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createDevinApi } from '../src/host/devin-api.js'

const home = process.env.E2E_DSH_HOME || join(homedir(), '.dsh-dev')
const store = JSON.parse(readFileSync(join(home, 'nano-cloud-session.json'), 'utf8'))
const active = store.profiles?.find(profile => profile.id === store.activeId) ?? store.profiles?.[0]
if (!active?.secret) throw new Error(`no active Devin profile in ${home}`)
const profile = { secret: active.secret, orgId: active.orgId, baseUrl: active.baseUrl }
const api = createDevinApi()
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let failures = 0
const check = (ok, name, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` | ${detail}` : ''}`)
  if (!ok) failures++
}

try {
  const self = await api.self(profile)
  check(Boolean(self?.devin_sessions_org_id), 'self', `${self?.principal_type ?? ''} / ${self?.devin_sessions_org_id ?? ''}`)

  const upload = await api.uploadAttachment(profile, {
    name: 'dncs-e2e.txt', contentType: 'text/plain', bytes: Buffer.from('DNCS e2e attachment\n'),
  })
  check(Boolean(upload?.attachment_id && upload?.url), 'upload attachment', upload?.attachment_id ?? '')

  const created = await api.createSession(profile, {
    prompt: 'Reply with exactly OK and stop. Do not use tools.',
    title: 'dncs-e2e-native-chat',
    tags: ['dncs-e2e'],
    devinMode: 'lite',
    maxAcuLimit: 1,
    resumable: true,
    attachmentUrls: upload?.url ? [upload.url] : undefined,
  })
  const id = created.session_id ?? created.id
  check(Boolean(id), 'create session with attachment', id ?? '')

  let detail = null
  let messages = []
  for (let attempt = 0; attempt < 12; attempt++) {
    await sleep(2500)
    detail = await api.getSession(profile, id)
    const page = await api.getMessages(profile, id, { first: 20 })
    messages = page.items ?? page.messages ?? []
    if (messages.some(message => message.source === 'devin' && /OK/i.test(message.message))) break
  }
  check(['claimed', 'running', 'working', 'waiting_for_user', 'suspended', 'exit'].includes(detail?.status), 'get session', detail?.status ?? '')
  check(messages.some(message => message.source === 'devin' && /OK/i.test(message.message)), 'devin replies through messages', `${messages.length} messages`)

  const attachments = await api.getAttachments(profile, id)
  check((attachments?.items ?? attachments ?? []).some(item => item.name === 'dncs-e2e.txt'), 'attachment retrieval', `${(attachments?.items ?? attachments ?? []).length} attachments`)

  const tags = await api.getTags(profile, id)
  check((tags?.tags ?? []).includes('dncs-e2e'), 'tags read', JSON.stringify(tags?.tags ?? []))
  const appended = await api.appendTags(profile, id, ['dncs-e2e-append'])
  check((appended?.tags ?? []).includes('dncs-e2e-append'), 'tags append')

  const slept = await api.sleep(profile, id)
  check(Boolean(slept?.session_id || slept?.status), 'sleep request', slept?.status ?? '')
  let after = null
  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(2500)
    after = await api.getSession(profile, id)
    if (after?.status === 'suspended' || after?.status === 'exit') break
  }
  check(['suspended', 'exit'].includes(after?.status), 'status refresh after sleep', `${after?.status ?? ''} / ${after?.status_detail ?? ''}`)

  await api.archive(profile, id)
  let archived = await api.getSession(profile, id)
  check(archived?.is_archived === true, 'archive')
  await api.unarchive(profile, id)
  archived = await api.getSession(profile, id)
  check(archived?.is_archived === false, 'unarchive')
} catch (error) {
  console.error(`FAIL fatal | ${error?.message ?? error}`)
  failures++
}

console.log(failures === 0 ? '\nE2E PASS' : `\nE2E FAIL (${failures})`)
process.exit(failures === 0 ? 0 : 1)
