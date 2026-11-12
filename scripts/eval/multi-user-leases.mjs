/**
 * T-C01 / T-C02 / T-C03 / T-C07: single-writer lease across the two real
 * clients. Cool-off, heartbeat renewal, expiry recovery, concurrent CAS claim,
 * and charset rejection. Run: node scripts/eval/multi-user-leases.mjs
 */
import { mkdirSync, rmSync } from 'node:fs'
import { devNsw, desktopNsw, post, check } from './clients.mjs'
import { env, clientFor } from './lib.mjs'

const A_DIR = '/Users/seanz/dasw-1112-mu-a'
const B_DIR = '/Users/seanz/dasw-1112-mu-b'
for (const dir of [A_DIR, B_DIR]) mkdirSync(dir, { recursive: true })

const created = await post(devNsw, '/workspaces/create', {
  name: 'lease-tests', localPath: A_DIR, requestId: `dasw1112lease${Date.now()}`,
})
const id = created.body?.workspace?.workspaceId
check('lease workspace created', typeof id === 'string', JSON.stringify(created.body).slice(0, 120))
await post(desktopNsw, '/workspaces/join', { workspaceId: id, localPath: B_DIR })

const sessionId = 'session-dasw1112-lease'
const claimKey = `claims/${sessionId}.json`
const { s3 } = clientFor(env(), 'DASWA')
await s3.del(claimKey)

// ---- T-C01: A holds, B is read-only ----
const aClaim = await post(devNsw, '/sessions/claim', { workspaceId: id, sessionId })
check('A acquires the lease', aClaim.body?.ok === true && aClaim.body?.busy !== true,
  JSON.stringify(aClaim.body))
const bClaim = await post(desktopNsw, '/sessions/claim', { workspaceId: id, sessionId })
check('B is refused while A holds (cool-off)', bClaim.body?.ok === false && bClaim.body?.busy === true,
  JSON.stringify(bClaim.body))
check('B sees A as holder', String(bClaim.body?.holder ?? '').startsWith('dasw-a@'), JSON.stringify(bClaim.body))
const bLease = await post(desktopNsw, '/sessions/lease', { sessionId })
check('B lease says not mine', bLease.body?.mine === false && String(bLease.body?.holder ?? '').startsWith('dasw-a@'),
  JSON.stringify(bLease.body))

// ---- T-C02: heartbeat renews ----
const before = await s3.getJson(claimKey)
const beat = await post(devNsw, '/sessions/heartbeat', { workspaceId: id, sessionId })
const after = await s3.getJson(claimKey)
check('heartbeat renews A lease', beat.body?.ok === true && after.expiresAt > before.expiresAt,
  JSON.stringify({ before: before.expiresAt, after: after.expiresAt, beat: beat.body }))
check('heartbeatRev increments', after.heartbeatRev === (before.heartbeatRev ?? 0) + 1,
  `${before.heartbeatRev} -> ${after.heartbeatRev}`)

// ---- T-C02: expired lease is reclaimable by B ----
await s3.putJson(claimKey, { ...after, expiresAt: Date.now() - 1000 })
const bExpired = await post(desktopNsw, '/sessions/claim', { workspaceId: id, sessionId })
check('expired lease is reclaimable', bExpired.body?.ok === true, JSON.stringify(bExpired.body))
const leaseAfter = await s3.getJson(claimKey)
check('B is now the holder', String(leaseAfter?.writerId ?? '').startsWith('dasw-b@'), JSON.stringify(leaseAfter))
const aStale = await post(devNsw, '/sessions/heartbeat', { workspaceId: id, sessionId })
check('A cannot renew a lease it no longer holds', aStale.body?.ok === false, JSON.stringify(aStale.body))

// ---- T-C03: concurrent CAS claim (weak-ETag fix + P2-04) ----
await s3.del(claimKey)
const [raceA, raceB] = await Promise.all([
  post(devNsw, '/sessions/claim', { workspaceId: id, sessionId }),
  post(desktopNsw, '/sessions/claim', { workspaceId: id, sessionId }),
])
const wins = [raceA.body?.ok, raceB.body?.ok].filter(x => x === true).length
check('exactly one writer wins a concurrent claim', wins === 1,
  `A=${JSON.stringify(raceA.body)} B=${JSON.stringify(raceB.body)}`)
const final = await s3.getJson(claimKey)
check('surviving claim is a single writer', typeof final?.writerId === 'string' && final.expiresAt > Date.now(),
  JSON.stringify(final))

// ---- T-C07: forged / invalid ids ----
const badSession = await post(devNsw, '/sessions/claim', { workspaceId: id, sessionId: '../etc/passwd' })
check('traversal sessionId rejected', badSession.body?.ok !== true, JSON.stringify(badSession.body))
const badWorkspace = await post(devNsw, '/tree/push', { workspaceId: 'not-a-valid-id' })
check('invalid workspaceId rejected', badWorkspace.body?.ok !== true, JSON.stringify(badWorkspace.body))

await s3.del(claimKey)
console.log('lease workspace', id, 'left in bucket for evidence')
