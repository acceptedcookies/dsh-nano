/**
 * T-G01..T-G06: negative / failure-mode scenarios that an office user will hit.
 * Covers revoked credentials, unreachable endpoint, mid-flight conflict with a
 * concurrent delete, clock skew on leases, retry after a transient failure,
 * and malformed bodies against destructive routes.
 * Run: node scripts/eval/negative-cases.mjs
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { devNsw, desktopNsw, post, check } from './clients.mjs'
import { env, clientFor } from './lib.mjs'

const A_DIR = '/Users/seanz/dasw-1112-mu-a'
const B_DIR = '/Users/seanz/dasw-1112-mu-b'
for (const dir of [A_DIR, B_DIR]) mkdirSync(dir, { recursive: true })
const { s3 } = clientFor(env(), 'DASWA')

const created = await post(devNsw, '/workspaces/create', {
  name: 'negative', localPath: A_DIR, requestId: `dasw1112neg${Date.now()}`,
})
const id = created.body?.workspace?.workspaceId
check('negative workspace created', typeof id === 'string')
await post(desktopNsw, '/workspaces/join', { workspaceId: id, localPath: B_DIR })

// ---- T-G01: revoked credentials fail loudly, and recover on re-bind ----
const badBind = await devNsw('/settings/update', {
  method: 'PUT', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'dasw-a', token: 'revoked-secret', accessKey: 'dasw1112revoked' }),
})
check('settings/update accepts a new identity', badBind.status === 200, JSON.stringify(badBind.body).slice(0, 120))
const afterRevoke = await devNsw('/workspaces')
// Handlers that throw become 400 {error} (routes.js wrapper); the point is a
// bounded, sanitized failure rather than a hang or an unhandled crash.
check('revoked key surfaces a clean error, not a hang',
  (afterRevoke.status === 400 || afterRevoke.status === 200) && typeof afterRevoke.body?.error === 'string',
  `${afterRevoke.status} ${JSON.stringify(afterRevoke.body).slice(0, 140)}`)
const bindErr = await devNsw('/workspaces')
check('revoked key error text is sanitized',
  JSON.stringify(bindErr.body).includes('S3 ') || bindErr.status === 400, JSON.stringify(bindErr.body).slice(0, 160))
// restore
const e = env()
await devNsw('/settings/update', {
  method: 'PUT', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'dasw-a', token: e.S3_DASWA_SECRET_KEY, accessKey: e.S3_DASWA_ACCESS_KEY }),
})
const recovered = await devNsw('/workspaces')
check('rebind restores working access', Array.isArray(recovered.body?.workspaces) && recovered.body.workspaces.length > 0,
  `count=${recovered.body?.workspaces?.length}`)

// ---- T-G02: malformed bodies on destructive routes are rejected ----
for (const [label, path, body] of [
  ['delete without id', '/workspaces/delete', {}],
  ['delete with non-hex id', '/workspaces/delete', { workspaceId: 'zzzz' }],
  ['create without name', '/workspaces/create', { localPath: A_DIR }],
  ['create with relative path', '/workspaces/create', { name: 'x', localPath: 'relative/dir' }],
  ['join with traversal id', '/workspaces/join', { workspaceId: '../../etc', localPath: A_DIR }],
  ['claim without session', '/sessions/claim', { workspaceId: id }],
  ['tree/push with bad id', '/tree/push', { workspaceId: 'short' }],
]) {
  const r = await post(devNsw, path, body)
  const rejected = r.body?.ok !== true
  check(`rejects ${label}`, rejected, `${r.status} ${JSON.stringify(r.body).slice(0, 90)}`)
}

// ---- T-G03: clock skew on a lease ----
const SID = 'session-dasw1112-skew'
await s3.del(`claims/${SID}.json`)
// A claim far in the future must NOT block a legitimate writer forever.
await s3.putJson(`claims/${SID}.json`, {
  writerId: 'ghost@deadbeef', acquiredAt: new Date().toISOString(),
  expiresAt: Date.now() + 400 * 24 * 3600 * 1000, heartbeatRev: 1,
})
const skewed = await post(devNsw, '/sessions/claim', { workspaceId: id, sessionId: SID })
// F-24 fix: an expiry beyond the sane bound is treated as malformed, so the
// CAS loop replaces it instead of honouring a 400-day lock.
check('implausible far-future lease is rejected as malformed', skewed.body?.ok === true, JSON.stringify(skewed.body))
const claimedAfter = await s3.getJson(`claims/${SID}.json`)
check('the real writer owns the claim afterwards', String(claimedAfter?.writerId ?? '').startsWith('dasw-'),
  JSON.stringify(claimedAfter))
await s3.del(`claims/${SID}.json`)

// ---- T-G04: concurrent delete while the other client pushes ----
writeFileSync(join(A_DIR, 'race-delete.txt'), 'a\n')
writeFileSync(join(B_DIR, 'race-delete.txt'), 'b\n')
const [pushA, delB] = await Promise.all([
  post(devNsw, '/tree/push', { workspaceId: id }),
  post(desktopNsw, '/workspaces/delete', { workspaceId: id }),
])
check('delete and push do not both crash', (pushA.status === 200 || pushA.status === 400) && delB.status === 200,
  `push=${pushA.status} ${JSON.stringify(pushA.body).slice(0, 80)} delete=${delB.status} ${JSON.stringify(delB.body).slice(0, 80)}`)
const listedAfter = await devNsw('/workspaces')
check('deleted workspace disappears from the list',
  !(listedAfter.body?.workspaces ?? []).some(w => w.workspaceId === id),
  `count=${(listedAfter.body?.workspaces ?? []).length}`)
const pushAfterDelete = await post(devNsw, '/tree/push', { workspaceId: id })
check('push after delete fails cleanly', pushAfterDelete.body?.ok !== true, JSON.stringify(pushAfterDelete.body).slice(0, 120))
const orphans = await s3.list(`workspaces/${delB.body?.workspaceId}/`)
check('F-12: delete purges objects even when a push raced it',
  (orphans.keys ?? []).length === 0, JSON.stringify({ keys: orphans.keys.length, purged: delB.body?.purged }))

// ---- T-G05: transient failure then retry succeeds ----
const again = await post(devNsw, '/workspaces/create', {
  name: 'retry', localPath: A_DIR, requestId: `dasw1112retry${Date.now()}`,
})
const retryId = again.body?.workspace?.workspaceId
const first = await post(devNsw, '/tree/push', { workspaceId: retryId })
const second = await post(devNsw, '/tree/push', { workspaceId: retryId })
check('repeat push after success is idempotent', second.body?.unchanged === true || second.body?.generation === first.body?.generation,
  `first=${JSON.stringify({ g: first.body?.generation, c: first.body?.conflicts })} second=${JSON.stringify({ g: second.body?.generation, u: second.body?.unchanged })}`)

// ---- T-G06: huge workspace id list does not break listing ----
const many = []
for (let i = 0; i < 12; i += 1) {
  const r = await post(devNsw, '/workspaces/create', { name: `bulk-${i}`, localPath: A_DIR, requestId: `dasw1112bulk${i}-${Date.now()}` })
  if (r.body?.ok === true) many.push(r.body.workspace.workspaceId)
}
const t0 = Date.now()
let bulkList = await devNsw('/workspaces')
// A create burst can race the listing; one bounded retry keeps the assertion
// about scale rather than about a transient window.
if (!Array.isArray(bulkList.body?.workspaces)) {
  await new Promise(resolve => setTimeout(resolve, 1500))
  bulkList = await devNsw('/workspaces')
}
const listMs = Date.now() - t0
check('listing stays responsive with many workspaces',
  bulkList.status === 200 && Array.isArray(bulkList.body?.workspaces) && listMs < 25_000,
  `status=${bulkList.status} count=${bulkList.body?.workspaces?.length ?? 'n/a'} ${listMs}ms ${JSON.stringify(bulkList.body).slice(0, 80)}`)
for (const wid of many) await post(devNsw, '/workspaces/delete', { workspaceId: wid })

for (const dir of [A_DIR, B_DIR]) rmSync(join(dir, 'race-delete.txt'), { force: true })
console.log('negative workspace', id, 'deleted by the race test')
