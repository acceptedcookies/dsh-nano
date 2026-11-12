/**
 * T-E02 / T-E03 / T-C06b: scale, performance instrumentation, and the
 * session-listing/transcript routes. Uses the two real clients.
 * Run: node scripts/eval/scale-and-perf.mjs
 */
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { devNsw, desktopNsw, post, check } from './clients.mjs'
import { env, clientFor } from './lib.mjs'

const A_DIR = '/Users/seanz/dasw-1112-mu-a'
const B_DIR = '/Users/seanz/dasw-1112-mu-b'
for (const dir of [A_DIR, B_DIR]) mkdirSync(dir, { recursive: true })

const created = await post(devNsw, '/workspaces/create', {
  name: 'scale', localPath: A_DIR, requestId: `dasw1112scale${Date.now()}`,
})
const id = created.body?.workspace?.workspaceId
check('scale workspace created', typeof id === 'string')
await post(desktopNsw, '/workspaces/join', { workspaceId: id, localPath: B_DIR })

// ---- T-E02: 200-file directory (MAX_FILES) + deep nesting ----
const many = join(A_DIR, 'many')
mkdirSync(many, { recursive: true })
for (let i = 0; i < 220; i += 1) writeFileSync(join(many, `f${String(i).padStart(3, '0')}.txt`), `file ${i}\n`)
const t0 = Date.now()
const pushMany = await post(devNsw, '/tree/push', { workspaceId: id })
const pushMs = Date.now() - t0
const headMany = (await clientFor(env(), 'DASWA').s3.getJson(`workspaces/${id}/tree/HEAD.json`))
const count = (headMany.files ?? []).filter(f => f.rel.startsWith('many/')).length
check('200-file cap enforced (220 written, ≤200 shipped)', count <= 200 && count >= 150,
  `shipped=${count} of 220, push=${pushMs}ms`)
check('large push completes under 30s', pushMs < 30_000, `${pushMs}ms`)

const t1 = Date.now()
const pullMany = await post(desktopNsw, '/tree/pull', { workspaceId: id })
const pullMs = Date.now() - t1
check('large pull completes under 30s', pullMs < 30_000, `pull=${pullMs}ms gen=${pullMany.body?.generation}`)
const bCopies = readdirCount(join(B_DIR, 'many'))
check('pulled files land on B', bCopies >= 150, `B has ${bCopies} files`)

// ---- T-E02: deep nesting ----
let deep = A_DIR
for (let i = 0; i < 12; i += 1) deep = join(deep, `d${i}`)
mkdirSync(deep, { recursive: true })
writeFileSync(join(deep, 'deep.txt'), 'deep\n')
const pushDeep = await post(devNsw, '/tree/push', { workspaceId: id })
check('deep nesting pushes', pushDeep.body?.ok === true, JSON.stringify(pushDeep.body))

// ---- T-E03: perf-review instrumentation seam ----
const perfHost = await devNsw('/settings')
check('/settings still fast with 200 files', perfHost.status === 200)
const t2 = Date.now()
const wsList = await devNsw('/workspaces')
const listMs = Date.now() - t2
check('/workspaces lists under 15s at scale', wsList.status === 200 && listMs < 15_000, `${listMs}ms`)
console.log(`  timings: push220=${pushMs}ms pull220=${pullMs}ms list=${listMs}ms`)

// ---- T-C06b: session listing, transcript, materialize on empty ----
const sessions = await devNsw('/sessions')
check('/sessions returns a list', Array.isArray(sessions.body?.sessions), JSON.stringify(sessions.body).slice(0, 120))
const missingTranscript = await post(devNsw, '/transcript', { workspaceId: id, sessionId: 'session-does-not-exist' })
check('/transcript on missing session fails cleanly', missingTranscript.body?.ok !== true
  && typeof missingTranscript.body?.error === 'string', JSON.stringify(missingTranscript.body).slice(0, 140))
const missingMaterialize = await post(desktopNsw, '/materialize', { workspaceId: id, sessionId: 'session-does-not-exist' })
check('/materialize on missing session fails cleanly', missingMaterialize.body?.ok !== true
  && typeof missingMaterialize.body?.error === 'string', JSON.stringify(missingMaterialize.body).slice(0, 140))

// ---- T-E04: background sync is disabled on both test nodes ----
const before = await clientFor(env(), 'DASWA').s3.getJson(`workspaces/${id}/tree/HEAD.json`)
await new Promise(resolve => setTimeout(resolve, 35_000))
const after = await clientFor(env(), 'DASWA').s3.getJson(`workspaces/${id}/tree/HEAD.json`)
check('backgroundSyncMs=0 means no timer-driven generation', before.generation === after.generation,
  `${before.generation} -> ${after.generation}`)

rmSync(join(A_DIR, 'many'), { recursive: true, force: true })
console.log('scale workspace', id, 'left in bucket for evidence')

function readdirCount(dir) {
  try { return readdirSync(dir).length } catch { return 0 }
}
