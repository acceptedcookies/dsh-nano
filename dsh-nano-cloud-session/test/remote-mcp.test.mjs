import test from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createFilesystem } from '../src/remote/filesystem.js'
import { createProcessTable } from '../src/remote/processes.js'
import { createMcpServer } from '../src/remote/mcp-stdio.js'
import { RESOURCE_OPERATION_IDS } from '../src/contracts/workspace-family.js'

function rpc(serverIn, clientOut, obj) {
  serverIn.write(`${JSON.stringify(obj)}\n`)
  return new Promise(resolve => {
    const buf = []
    const on = chunk => {
      buf.push(String(chunk))
      const lines = buf.join('').split('\n')
      for (const line of lines) {
        if (!line.trim()) continue
        let message
        try { message = JSON.parse(line) } catch { continue }
        if (obj.id != null && message.id !== obj.id) continue
        clientOut.off('data', on)
        resolve(message)
      }
    }
    clientOut.on('data', on)
  })
}

test('T07 NDJSON framing, unknown method, initialize, tools/list', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dncs-mcp-'))
  try {
    const stdin = new PassThrough()
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    createMcpServer({
      fs: createFilesystem(dir),
      processes: createProcessTable(dir),
      inspectFacts: () => ({ root: dir }),
      stdin, stdout, stderr,
    })
    const uninit = await rpc(stdin, stdout, { jsonrpc: '2.0', id: 1, method: 'nope' })
    assert.equal(uninit.error.code, -32002)
    const init = await rpc(stdin, stdout, { jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2025-06-18' } })
    assert.equal(init.result.protocolVersion, '2025-06-18')
    const bad = await rpc(stdin, stdout, { jsonrpc: '2.0', id: 4, method: 'nope' })
    assert.equal(bad.error.code, -32601)
    stdin.write('not-json\n')
    const listed = await rpc(stdin, stdout, { jsonrpc: '2.0', id: 3, method: 'tools/list' })
    assert.ok(listed.result, JSON.stringify(listed))
    assert.deepEqual(listed.result.tools.map(t => t.name).sort(), [...RESOURCE_OPERATION_IDS].sort())
    const inspected = await rpc(stdin, stdout, { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'workspace.inspect', arguments: {} } })
    assert.equal(inspected.result.structuredContent.ok, true)
    assert.equal(inspected.result.structuredContent.data.pty.supported, false)
    assert.equal(inspected.result.content[0].type, 'text')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('T08 fs list/read/write stay inside the remote root', async () => {
  const remote = mkdtempSync(join(tmpdir(), 'dncs-r-'))
  const local = mkdtempSync(join(tmpdir(), 'dncs-l-'))
  writeFileSync(join(local, 'sentinel.txt'), 'LOCAL')
  writeFileSync(join(remote, 'sentinel.txt'), 'REMOTE')
  try {
    const fs = createFilesystem(remote)
    const listed = fs.list({ path: '.' })
    assert.ok(listed.entries.some(e => e.name === 'sentinel.txt'))
    const got = fs.read({ path: 'sentinel.txt', offset: 0, length: 20 })
    assert.equal(Buffer.from(got.bytes, 'base64').toString(), 'REMOTE')
    fs.write({ path: 'new.txt', bytes: Buffer.from('hi').toString('base64'), createOnly: true })
    assert.equal(readFileSync(join(local, 'sentinel.txt'), 'utf8'), 'LOCAL')
    assert.throws(() => fs.read({ path: '../sentinel.txt' }))
  } finally {
    rmSync(remote, { recursive: true, force: true })
    rmSync(local, { recursive: true, force: true })
  }
})

test('T09 process argv is not a shell; unknown handle rejected', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dncs-p-'))
  try {
    const processes = createProcessTable(dir)
    const started = processes.start({ argv: [process.execPath, '-e', 'process.stdout.write("X")'], cwd: '.' })
    const waited = await processes.wait({ processHandle: started.processHandle, timeoutMs: 2000 })
    assert.equal(waited.running, false)
    const read = processes.read({ processHandle: started.processHandle, stdoutOffset: 0, limit: 16 })
    assert.equal(Buffer.from(read.stdout, 'base64').toString(), 'X')
    assert.throws(() => processes.terminate({ processHandle: 'p-deadbeefdeadbeef' }))
    const slow = processes.start({ argv: [process.execPath, '-e', 'setTimeout(()=>{}, 30000)'], cwd: '.' })
    const timed = await processes.wait({ processHandle: slow.processHandle, timeoutMs: 50 })
    assert.equal(timed.running, true)
    processes.terminate({ processHandle: slow.processHandle })
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('T10 process table enforces spawn limit and strips secret env', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dncs-lim-'))
  try {
    const processes = createProcessTable(dir, { maxProcesses: 2 })
    const a = processes.start({ argv: [process.execPath, '-e', 'setTimeout(()=>{}, 30000)'], cwd: '.' })
    const b = processes.start({ argv: [process.execPath, '-e', 'setTimeout(()=>{}, 30000)'], cwd: '.' })
    assert.throws(() => processes.start({ argv: [process.execPath, '-e', '1'], cwd: '.' }), /process limit/)
    processes.terminate({ processHandle: a.processHandle })
    processes.terminate({ processHandle: b.processHandle })
    processes.reset()
    const leaked = processes.start({
      argv: [process.execPath, '-e', 'process.stdout.write([process.env.SSH_AUTH_SOCK, process.env.DSH_TOKEN, process.env.SAFE].join(","))'],
      cwd: '.',
      envPatch: { SSH_AUTH_SOCK: '/tmp/agent', DSH_TOKEN: 'secret', SAFE: 'ok' },
    })
    await processes.wait({ processHandle: leaked.processHandle, timeoutMs: 2000 })
    const read = processes.read({ processHandle: leaked.processHandle, stdoutOffset: 0, limit: 64 })
    assert.equal(Buffer.from(read.stdout, 'base64').toString(), ',,ok')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('T12 remote read miss does not fall back to a local sentinel', () => {
  const remote = mkdtempSync(join(tmpdir(), 'dncs-r2-'))
  const local = mkdtempSync(join(tmpdir(), 'dncs-l2-'))
  writeFileSync(join(local, 'sentinel.txt'), 'LOCAL')
  try {
    const fs = createFilesystem(remote)
    assert.throws(() => fs.read({ path: 'sentinel.txt', offset: 0, length: 20 }), /not found/)
    assert.equal(readFileSync(join(local, 'sentinel.txt'), 'utf8'), 'LOCAL')
    const empty = fs.list({ path: '.', limit: 10 })
    assert.deepEqual(empty.entries, [])
    assert.equal(empty.truncated, false)
  } finally {
    rmSync(remote, { recursive: true, force: true })
    rmSync(local, { recursive: true, force: true })
  }
})

test('T16 empty page + cursor paging', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dncs-page-'))
  try {
    writeFileSync(join(dir, 'a.txt'), 'a')
    writeFileSync(join(dir, 'b.txt'), 'b')
    writeFileSync(join(dir, 'c.txt'), 'c')
    const fs = createFilesystem(dir)
    const first = fs.list({ path: '.', limit: 2 })
    assert.equal(first.entries.length, 2)
    assert.equal(first.truncated, true)
    assert.equal(first.nextCursor, first.entries[1].name)
    const rest = fs.list({ path: '.', limit: 2, cursor: first.nextCursor })
    assert.equal(rest.truncated, false)
    assert.equal(rest.entries.length, 1)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
