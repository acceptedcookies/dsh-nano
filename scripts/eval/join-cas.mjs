/**
 * U-02 evidence: two different identities join the same marker concurrently.
 * Exercises the upgraded `joinWorkspace` (ETag CAS) directly; before the fix
 * one member row was silently lost. Run with DSH_HOME pointed at a temp home.
 */
process.env.DSH_HOME = '/tmp/dasw-1112-home'
const { env, clientFor, check } = await import('./lib.mjs')
const { createWorkspace, joinWorkspace, readMarker } = await import('../../dsh-nano-shared-workspace/src/host/workspaces.js')

const { s3 } = clientFor(env(), 'DASWA')
const ctxFor = instance => ({
  get: name => name === 'credentials' ? {
    resolve: async ref => ref === 'DSH_NSW_INSTANCE_ID' ? { value: instance } : undefined,
    set: async () => {},
  } : undefined,
})
const identA = { username: 'dasw-a' }
const created = await createWorkspace(s3, ctxFor('11111111-1111-1111-1111-111111111111'), identA, {
  name: 'join-cas-fixture', localPath: '/tmp/dasw-1112-replica-a',
})
const key = `workspaces/${created.workspaceId}.json`
const [b, c] = await Promise.all([
  joinWorkspace(s3, ctxFor('22222222-2222-2222-2222-222222222222'), { username: 'dasw-b' },
    { workspaceId: created.workspaceId, localPath: '/tmp/dasw-1112-replica-b' }),
  joinWorkspace(s3, ctxFor('33333333-3333-3333-3333-333333333333'), { username: 'dasw-c' },
    { workspaceId: created.workspaceId, localPath: '/tmp/dasw-1112-replica-c' }),
])
const final = await readMarker(s3, key)
const names = Object.values(final.members).map(m => m.username).sort()
check('concurrent joins keep all three members', names.length === 3, `members = ${names.join(',')}`)
console.log('  join results:', JSON.stringify({ b: b.workspaceId, c: c.workspaceId }))
await s3.del(key)
console.log('fixture removed')
