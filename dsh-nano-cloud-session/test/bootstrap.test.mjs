import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { EventEmitter } from 'node:events'
import { probeWorkspace } from '../src/providers/devin/bootstrap.js'

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

test('T06 probe fails closed when node is missing; does not guess another host', async () => {
  const spawnImpl = fakeSpawn((_cmd, _args, remote) => {
    if (String(remote).includes('uname')) return { code: 0, stdout: 'Linux x86_64\n' }
    if (String(remote).includes('pwd')) return { code: 0, stdout: '/home/ubuntu\n' }
    if (String(remote).includes('id')) return { code: 0, stdout: 'ubuntu\n' }
    return { code: 1, stdout: '' }
  })
  await assert.rejects(() => probeWorkspace({
    sessionId: 'devin-abc',
    identityFile: '/tmp/id',
    knownHostsFile: '/tmp/known',
    spawnImpl,
  }), /Node/)
})
