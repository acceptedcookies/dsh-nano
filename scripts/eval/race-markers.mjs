/**
 * T-B06 / T-C03 evidence: read-modify-write races on workspace markers.
 * Two simulated clients join the same marker concurrently. The current
 * `joinWorkspace` writes with an unconditional PUT, so the second write wins
 * and the first client's member row is lost. A CAS (If-Match) variant is run
 * as the control. Run: node scripts/eval/race-markers.mjs
 */
import { env, clientFor, check } from './lib.mjs'

const e = env()
const { s3 } = clientFor(e, 'DASWA')
const key = 'workspaces/dasw-race-marker.json'
const base = {
  v: 1,
  workspaceId: 'dasw-race-marker',
  title: 'race-fixture',
  pathHint: 'race-fixture',
  createdAt: new Date().toISOString(),
  createdBy: 'fixture',
  members: { fixture: { username: 'fixture', instance: 'fixture', localPath: '/tmp/fixture', joinedAt: new Date().toISOString() } },
}
const member = name => ({ [`${name}@${name}`]: { username: name, instance: name, localPath: `/tmp/${name}`, joinedAt: new Date().toISOString() } })

await s3.putJson(key, base)
const read = () => s3.getJson(key, { withMeta: true })

// Unconditional writes — what joinWorkspace does today.
const snap = await read()
const [a, b] = await Promise.all([
  s3.putJson(key, { ...snap.value, members: { ...snap.value.members, ...member('clientA') } }),
  s3.putJson(key, { ...snap.value, members: { ...snap.value.members, ...member('clientB') } }),
])
const lost = await s3.getJson(key)
const names = Object.keys(lost.members)
check('unconditional concurrent join loses a member', names.length === 2 || names.length === 3
  ? names.length === 2 : false, `members after race = ${names.join(',')}`)
console.log('  unconditional results:', JSON.stringify({ a, b }), 'survivors:', names.join(','))

// Conditional writes — CAS control.
await s3.putJson(key, base)
const snap2 = await read()
const [ca, cb] = await Promise.all([
  s3.putJson(key, { ...snap2.value, members: { ...snap2.value.members, ...member('clientA') } }, { ifMatch: snap2.etag }),
  s3.putJson(key, { ...snap2.value, members: { ...snap2.value.members, ...member('clientB') } }, { ifMatch: snap2.etag }),
])
const afterCas = await s3.getJson(key)
check('CAS lets exactly one writer win', [ca.conflict, cb.conflict].filter(Boolean).length === 1,
  `conflicts = ${JSON.stringify([ca.conflict, cb.conflict])}, members = ${Object.keys(afterCas.members).join(',')}`)

await s3.del(key)
console.log('fixture removed')
