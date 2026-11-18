import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { EventEmitter } from 'node:events'
import { probeWorkspace, publishArtifact, hashFile } from '../src/providers/devin/bootstrap.js'
import { fingerprintEd25519 } from '../src/providers/devin/ssh.js'

function fakeSpawn(script) {
  return (cmd, args) => {
    const child = new EventEmitter()
    child.stdin = { write() {}, end() {} }
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.kill = () => {}
    queueMicrotask(() => {
      const remote = args.at(-1) || ''
      const reply = script(cmd, args, remote)
      if (reply.stdout) child.stdout.emit('data', Buffer.from(reply.stdout))
      if (reply.stderr) child.stderr.emit('data', Buffer.from(reply.stderr))
      child.emit('close', reply.code ?? 0, null)
    })
    return child
  }
}

const PINNED = 'ssh.devin.ai ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFvVOgO3/bvauBxb+bndX1LBLY4BD7ovmtjtB1pYdW/t\n'
const KEY_B64 = 'AAAAC3NzaC1lZDI1NTE5AAAAIFvVOgO3/bvauBxb+bndX1LBLY4BD7ovmtjtB1pYdW/t'

test('T06 probe fails closed when node is missing; does not guess another host', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dncs-boot-'))
  const known = join(dir, 'known')
  writeFileSync(known, PINNED)
  const spawnImpl = fakeSpawn((_cmd, _args, remote) => {
    if (String(remote).includes('uname')) return { code: 0, stdout: 'Linux x86_64\n' }
    if (String(remote).includes('pwd')) return { code: 0, stdout: '/home/ubuntu\n' }
    if (String(remote).includes('id')) return { code: 0, stdout: 'ubuntu\n' }
    return { code: 1, stdout: '' }
  })
  try {
    await assert.rejects(() => probeWorkspace({
      sessionId: 'devin-abc',
      identityFile: '/tmp/id',
      knownHostsFile: known,
      spawnImpl,
    }), /Node/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('T06 unknown host key requires matching fingerprint; never accept-new', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dncs-fp-'))
  const known = join(dir, 'known')
  const spawnImpl = fakeSpawn((cmd) => {
    if (cmd === 'ssh-keyscan') return { code: 0, stdout: PINNED }
    return { code: 0, stdout: 'Linux\n' }
  })
  try {
    await assert.rejects(() => probeWorkspace({
      sessionId: 'devin-abc', identityFile: '/tmp/id', knownHostsFile: known, spawnImpl,
    }), (error) => error.reason === 'workspace-denied' && error.fingerprint?.startsWith('SHA256:'))
    await assert.rejects(() => probeWorkspace({
      sessionId: 'devin-abc', identityFile: '/tmp/id', knownHostsFile: known, spawnImpl,
      expectedFingerprint: 'SHA256:deadbeef',
    }), /fingerprint/)
    const expected = fingerprintEd25519(KEY_B64)
    const facts = await probeWorkspace({
      sessionId: 'devin-abc', identityFile: '/tmp/id', knownHostsFile: known, spawnImpl,
      expectedFingerprint: expected,
    }).catch(error => error)
    assert.notEqual(facts?.reason, 'workspace-denied')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('T06 changed gateway key requires a new matching fingerprint', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dncs-chg-'))
  const known = join(dir, 'known')
  writeFileSync(known, PINNED)
  const other = 'ssh.devin.ai ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=\n'
  const spawnImpl = fakeSpawn((cmd) => {
    if (cmd === 'ssh-keyscan') return { code: 0, stdout: other }
    return { code: 0, stdout: 'Linux x86_64\n' }
  })
  try {
    await assert.rejects(() => probeWorkspace({
      sessionId: 'devin-abc', identityFile: '/tmp/id', knownHostsFile: known, spawnImpl,
    }), (error) => error.reason === 'workspace-denied' && /changed|fingerprint/i.test(error.message))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('T06 artifact dir is chmod 700 and published via tmp+rename', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dncs-art-'))
  const known = join(dir, 'known')
  writeFileSync(known, PINNED)
  const artifact = join(dir, 'bridge.mjs')
  writeFileSync(artifact, 'export default 1\n')
  const hash = hashFile(artifact)
  const seen = []
  const spawnImpl = fakeSpawn((cmd, args, remote) => {
    seen.push({ cmd, remote: String(remote), args: args.map(String) })
    if (cmd === 'scp') return { code: 0, stdout: '' }
    if (String(remote).includes('sha256sum')) return { code: 0, stdout: `${hash}  file\n` }
    return { code: 0, stdout: '' }
  })
  try {
    const published = await publishArtifact({
      sessionId: 'devin-abc', identityFile: '/tmp/id', knownHostsFile: known, spawnImpl, artifact,
    })
    assert.equal(published.hash, hash)
    assert.ok(seen.some(row => row.cmd === 'scp' && row.args.some(a => a.endsWith('.tmp'))))
    assert.ok(seen.some(row => /\bchmod 700\b/.test(row.remote)))
    assert.ok(seen.some(row => /\bmv -f\b/.test(row.remote)))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
