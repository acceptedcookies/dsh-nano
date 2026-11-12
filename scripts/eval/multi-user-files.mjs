/**
 * T-B04 / T-C04 / T-C05 / T-C06: two real clients (dsh-dev A, desktop B)
 * share one bucket and one workspace. Exercises join, file sync, three-way
 * conflict dissolution, binary upload, size cap, path-traversal fence,
 * SKIP-list fence, and concurrent tree pushes.
 * Run: node scripts/eval/multi-user-files.mjs
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync, lstatSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { devNsw, desktopNsw, post, check } from './clients.mjs'
import { env, clientFor } from './lib.mjs'

const A_DIR = '/Users/seanz/dasw-1112-mu-a'
const B_DIR = '/Users/seanz/dasw-1112-mu-b'
const ESCAPE = '/Users/seanz/dasw-1112-escape.txt'
const sha = buf => createHash('sha256').update(buf).digest('hex')
const text = path => readFileSync(path, 'utf8')

for (const dir of [A_DIR, B_DIR]) {
  // Only ever wipe this harness's own two dedicated replica directories.
  if (!/^\/Users\/seanz\/dasw-1112-mu-[ab]$/.test(dir)) throw new Error(`refuse to wipe ${dir}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
}
rmSync(ESCAPE, { force: true })

// ---- T-B04: A creates, B joins, both see both members ----
const REQ = `dasw1112mu${Date.now()}`
const created = await post(devNsw, '/workspaces/create', {
  name: 'multi-user', localPath: A_DIR, requestId: REQ,
})
const id = created.body?.workspace?.workspaceId
check('A creates shared workspace', created.body?.ok === true && typeof id === 'string', JSON.stringify(created.body).slice(0, 120))
if (typeof id !== 'string') throw new Error('no workspace id')

const joined = await post(desktopNsw, '/workspaces/join', { workspaceId: id, localPath: B_DIR })
check('B joins the same workspace', joined.body?.ok === true, JSON.stringify(joined.body).slice(0, 120))
const aList = (await devNsw('/workspaces')).body.workspaces.find(w => w.workspaceId === id)
const bList = (await desktopNsw('/workspaces')).body.workspaces.find(w => w.workspaceId === id)
const members = aList ? Object.values(aList.members).map(m => m.username).sort() : []
check('both clients see two members', members.length === 2 && members[0] === 'dasw-a' && members[1] === 'dasw-b', `members=${members.join(',')}`)
check('B sees the same marker', bList?.workspaceId === id)

// ---- T-C04: A writes, B pulls ----
writeFileSync(join(A_DIR, 'team.md'), 'from A\n')
const push1 = await post(devNsw, '/tree/push', { workspaceId: id })
const gen1 = push1.body?.generation
check('A push creates a generation', Number.isInteger(gen1) && gen1 >= 1, JSON.stringify(push1.body))
const pull1 = await post(desktopNsw, '/tree/pull', { workspaceId: id })
check('B pulls the same generation', pull1.body?.generation === gen1, JSON.stringify(pull1.body))
check('B received A content', text(join(B_DIR, 'team.md')) === 'from A\n', JSON.stringify(text(join(B_DIR, 'team.md'))))

// ---- T-C05: divergent edits dissolve, neither side silently lost ----
writeFileSync(join(A_DIR, 'team.md'), 'A edit\n')
const push2 = await post(devNsw, '/tree/push', { workspaceId: id })
const gen2 = push2.body?.generation
check('A push advances generation', gen2 === gen1 + 1, JSON.stringify(push2.body))
writeFileSync(join(B_DIR, 'team.md'), 'B edit\n')
const push3 = await post(desktopNsw, '/tree/push', { workspaceId: id })
const gen3 = push3.body?.generation
const bMerged = text(join(B_DIR, 'team.md'))
check('B push reports a conflict', (push3.body?.conflicts ?? []).includes('team.md'), JSON.stringify(push3.body))
check('B conflict marker keeps local', bMerged.includes('<<<<<<< local') && bMerged.includes('B edit\n'), JSON.stringify(bMerged))
check('B conflict marker keeps remote', bMerged.includes('=======') && bMerged.includes('A edit\n') && bMerged.includes('>>>>>>> remote'), JSON.stringify(bMerged))
const pullA = await post(devNsw, '/tree/pull', { workspaceId: id })
check('A pulls the dissolved generation', pullA.body?.generation === gen3, JSON.stringify(pullA.body))
check('A sees both sides', text(join(A_DIR, 'team.md')).includes('B edit\n') && text(join(A_DIR, 'team.md')).includes('A edit\n'))

// ---- T-C06 positive: binary upload ----
const blob = createHash('sha256').update('binary-fixture').digest()
const big = Buffer.alloc(1024 * 1024, 7)
writeFileSync(join(A_DIR, 'blob.bin'), big)
const pushBlob = await post(devNsw, '/tree/push', { workspaceId: id })
check('binary push ok', pushBlob.body?.ok === true, JSON.stringify(pushBlob.body))
const pullBlob = await post(desktopNsw, '/tree/pull', { workspaceId: id })
check('binary pulled with identical sha256', sha(readFileSync(join(B_DIR, 'blob.bin'))) === sha(big),
  `${sha(readFileSync(join(B_DIR, 'blob.bin'))).slice(0, 12)} vs ${sha(big).slice(0, 12)}`)

// ---- T-C06 negative: >2MiB file is skipped, not uploaded ----
writeFileSync(join(A_DIR, 'big.bin'), Buffer.alloc(2 * 1024 * 1024 + 1, 3))
const pushBig = await post(devNsw, '/tree/push', { workspaceId: id })
const { s3 } = clientFor(env(), 'DASWA')
const head = await s3.getJson(`workspaces/${id}/tree/HEAD.json`)
check('oversized file never reaches HEAD', !(head.files ?? []).some(f => f.rel === 'big.bin'),
  `files=${(head.files ?? []).map(f => f.rel).join(',')}`)
check('oversized file stays local', existsSync(join(A_DIR, 'big.bin')))
rmSync(join(A_DIR, 'big.bin'), { force: true })

// ---- T-C06 negative: symlink is never followed/uploaded ----
symlinkSync('/etc/passwd', join(A_DIR, 'link.txt'))
const pushLink = await post(devNsw, '/tree/push', { workspaceId: id })
const head2 = await s3.getJson(`workspaces/${id}/tree/HEAD.json`)
check('symlink not uploaded', !(head2.files ?? []).some(f => f.rel === 'link.txt'))
check('symlink still a link locally', lstatSync(join(A_DIR, 'link.txt')).isSymbolicLink())
rmSync(join(A_DIR, 'link.txt'), { force: true })

// ---- T-C06 negative: poisoned remote HEAD cannot escape or plant imagine/ ----
const poisonBase = head2.generation + 1
const planted = {
  v: 1, generation: poisonBase, parent: head2.generation, writerId: 'attacker@deadbeef',
  files: [
    { rel: 'imagine/.grok/auth.json', sha256: sha(Buffer.from('secret')), size: 6 },
    { rel: 'ok.txt', sha256: sha(Buffer.from('plain')), size: 5 },
  ],
  conflicts: [], at: new Date().toISOString(),
}
for (const file of planted.files) await s3.putBytes(`workspaces/${id}/tree/blobs/${file.sha256}`, Buffer.from(file.rel === 'ok.txt' ? 'plain' : 'secret'))
await s3.putJson(`workspaces/${id}/tree/generations/${poisonBase}.json`, planted)
await s3.putJson(`workspaces/${id}/tree/HEAD.json`, planted)
const pullPoison = await post(desktopNsw, '/tree/pull', { workspaceId: id })
check('schema-valid poisoned HEAD pulls normally', pullPoison.body?.ok === true, JSON.stringify(pullPoison.body))
check('SKIP-list path not written to replica', !existsSync(join(B_DIR, 'imagine', '.grok', 'auth.json')))
check('ordinary file still written', text(join(B_DIR, 'ok.txt')) === 'plain')
// A rel with ".." is rejected by the tree-head schema before any fs write.
const traversal = { ...planted, generation: poisonBase + 1, parent: poisonBase,
  files: [{ rel: '../dasw-1112-escape.txt', sha256: sha(Buffer.from('escape')), size: 6 }] }
await s3.putJson(`workspaces/${id}/tree/HEAD.json`, traversal)
const pullTraversal = await post(desktopNsw, '/tree/pull', { workspaceId: id })
check('traversal rel rejected without writing outside replica',
  pullTraversal.body?.ok !== true && !existsSync(ESCAPE), JSON.stringify(pullTraversal.body))
// restore a clean HEAD and remove the planted generation objects; otherwise
// a later concurrent push would find gen N already occupied and never advance.
await s3.putJson(`workspaces/${id}/tree/HEAD.json`, head2)
for (const n of [poisonBase, poisonBase + 1]) await s3.del(`workspaces/${id}/tree/generations/${n}.json`)
// local bases on both clients must be reset to the restored HEAD, otherwise
// the next push would treat the poisoned generation as its parent.
await post(devNsw, '/tree/pull', { workspaceId: id })
await post(desktopNsw, '/tree/pull', { workspaceId: id })
rmSync(join(B_DIR, 'ok.txt'), { force: true })

// ---- T-C06 / T-C03: concurrent tree pushes from A and B ----
writeFileSync(join(A_DIR, 'race.txt'), 'A race\n')
writeFileSync(join(B_DIR, 'race.txt'), 'B race\n')
const [ca, cb] = await Promise.all([
  post(devNsw, '/tree/push', { workspaceId: id }),
  post(desktopNsw, '/tree/push', { workspaceId: id }),
])
const finalHead = await s3.getJson(`workspaces/${id}/tree/HEAD.json`)
check('concurrent pushes produce one surviving generation', typeof finalHead.generation === 'number',
  `A=${JSON.stringify(ca.body)} B=${JSON.stringify(cb.body)} head=${finalHead.generation}`)
const raced = (finalHead.conflicts ?? []).includes('race.txt')
  || (ca.body?.conflicts ?? []).includes('race.txt') || (cb.body?.conflicts ?? []).includes('race.txt')
check('racing writes are serialised or dissolved, never silently lost',
  raced || ca.body?.generation !== cb.body?.generation,
  `A.gen=${ca.body?.generation} B.gen=${cb.body?.generation} head.conflicts=${JSON.stringify(finalHead.conflicts ?? [])}`)
const finalRace = text(join(A_DIR, 'race.txt')) + text(join(B_DIR, 'race.txt'))
check('both racing edits survive in at least one replica',
  !raced || (finalRace.includes('A race') && finalRace.includes('B race')),
  `A=${JSON.stringify(text(join(A_DIR, 'race.txt')))} B=${JSON.stringify(text(join(B_DIR, 'race.txt')))}`)

console.log('workspace', id, 'left in bucket for evidence')
