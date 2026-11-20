import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { execFileSync } from 'node:child_process'
import { callWorker, createWorker } from '../profiles/terminal/pty-entry.mjs'

const HOST = join(dirname(fileURLToPath(import.meta.url)), 'support', 'host-client.mjs')

function host(mode, { registryRoot, ptyRoot, nonce, readyFile, env = {} }) {
  const child = spawn(process.execPath, [HOST, registryRoot, ptyRoot, mode, nonce, ...(readyFile ? [readyFile] : [])], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => { stdout += chunk })
  child.stderr.on('data', (chunk) => { stderr += chunk })
  const lines = () => stdout.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line))
  return { child, lines, stderr: () => stderr, stdout: () => stdout }
}

/** Wait for host A's ready file — explicit readiness, no sleeps. */
async function waitReady(readyFile, deadline = 20000) {
  const until = Date.now() + deadline
  while (Date.now() < until) {
    if (existsSync(readyFile)) return
    await new Promise((resolve) => setImmediate(resolve))
  }
  throw new Error('host A never became ready')
}

const exitOf = (child) => new Promise((resolve) => child.once('close', (code, signal) => resolve({ code, signal })))

async function waitHost(h, readyFile, deadline = 20000) {
  const until = Date.now() + deadline
  while (Date.now() < until) {
    if (existsSync(readyFile)) return
    if (h.child.exitCode !== null || h.child.signalCode !== null) {
      throw new Error(`host exited early code=${h.child.exitCode} signal=${h.child.signalCode}: stderr=${h.stderr()} stdout=${h.stdout()}`)
    }
    await new Promise((resolve) => setImmediate(resolve))
  }
  throw new Error(`host A never became ready: ${h.stderr()}`)
}

test('broker: host A owns registry+terminal and dies; host B reopens and reaches the same worker — no respawn', async (t) => {
  const registryRoot = mkdtempSync(join(tmpdir(), 'dnls-reg-'))
  // AF_UNIX sun_path is 104 bytes on macOS — keep the socket path short.
  const ptyRoot = mkdtempSync(join(tmpdir(), 'p-'))
  const proofDir = mkdtempSync(join(tmpdir(), 'dnls-proof-'))
  const readyFile = join(proofDir, 'host-a.ready')
  let terminalId = null
  t.after(async () => {
    if (terminalId) await callWorker(ptyRoot, { terminalId, verb: 'close' }).catch(() => {})
    rmSync(registryRoot, { recursive: true, force: true })
    rmSync(ptyRoot, { recursive: true, force: true })
    rmSync(proofDir, { recursive: true, force: true })
  })

  // Host A: real process — registry lock, owner, durable reservation, guest
  // worker spawn and shell proof all happen inside it.
  const nonceA = `A${Date.now().toString(36)}`
  const a = host('A', { registryRoot, ptyRoot, nonce: nonceA, readyFile })
  await waitHost(a, readyFile)
  const first = a.lines().find((line) => line.ready === true)
  assert.ok(first, a.stderr())
  terminalId = first.terminalId
  const pid = first.pid
  const socket = join(ptyRoot, `${terminalId}.sock`)
  assert.equal(existsSync(socket), true)

  // SIGKILL the actual host: registry lock dies with it, worker must not.
  a.child.kill('SIGKILL')
  const aExit = await exitOf(a.child)
  assert.equal(aExit.signal, 'SIGKILL')
  assert.equal(existsSync(socket), true, 'worker survives host death')

  // Host B: fresh process reopens the same registry, attaches to the
  // ORIGINAL ref and proves same PID + exported env + new nonce.
  const nonceB = `B${Date.now().toString(36)}`
  const b = host('B', { registryRoot, ptyRoot, nonce: nonceB, env: { SPIKE_PRIOR: JSON.stringify({ seq: first.seq }) } })
  const bExit = await exitOf(b.child)
  assert.equal(bExit.code, 0, b.stderr())
  const proof = b.lines().find((line) => line.attach)
  assert.ok(proof, `host B produced no proof: ${b.stderr()}`)
  assert.equal(proof.terminalId, terminalId)
  assert.equal(proof.pid, pid, 'same shell PID across a killed and a fresh host')
  assert.equal(proof.proofEnv, `proof-${nonceA}`, 'env exported by host A survived')
  assert.equal(proof.attach.protocol, 'dnt-ws-v2')

  // B's close reaped the session: no socket, no respawn on a stale ref.
  const until = Date.now() + 5000
  while (existsSync(socket) && Date.now() < until) await new Promise((resolve) => setImmediate(resolve))
  assert.equal(existsSync(socket), false)
  const after = await callWorker(ptyRoot, { terminalId, verb: 'status' })
  assert.equal(after.ok, false)
  terminalId = null
})

test('broker: rpc never creates — a missing worker is unavailable, not spawned', async (t) => {
  const ptyRoot = mkdtempSync(join(tmpdir(), 'dnls-pty-'))
  t.after(() => rmSync(ptyRoot, { recursive: true, force: true }))
  const reply = await callWorker(ptyRoot, { terminalId: 'term-none', verb: 'status' })
  assert.equal(reply.ok, false)
  assert.equal(existsSync(join(ptyRoot, 'term-none.sock')), false)
})

/** Locate a pyte site-packages dir the isolated worker can be pointed at. */
function pytePath() {
  try {
    return execFileSync('/usr/bin/python3', ['-c', 'import pyte, os; print(os.path.dirname(os.path.dirname(pyte.__file__)))'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

test('broker: snapshot is the real pyte screen — overwritten cells and cursor, not raw replay', async (t) => {
  const site = pytePath()
  if (!site) return t.skip('pyte unavailable on this workstation')
  const ptyRoot = mkdtempSync(join(tmpdir(), 'p-'))
  t.after(async () => {
    await callWorker(ptyRoot, { terminalId: 'term-snap', verb: 'close' }).catch(() => {})
    rmSync(ptyRoot, { recursive: true, force: true })
  })
  const worker = join(dirname(fileURLToPath(import.meta.url)), '../profiles/terminal/pty-worker.py')
  const created = await createWorker(
    { root: ptyRoot, python: '/usr/bin/python3', workerPath: worker, pytePath: site },
    { terminalId: 'term-snap', cols: 20, rows: 4, cwd: '/' },
  )
  assert.equal(created.ok, true)
  // Overwrite cells: printf writes 'AAAA', CR returns, 'BB' repaints the row;
  // then cursor moves home and a second line lands. The raw ring holds the
  // escape bytes; the snapshot must hold the FINAL cells.
  const put = await callWorker(ptyRoot, {
    terminalId: 'term-snap', verb: 'input',
    // The ready marker must not occur in the PTY's echo of the input line.
    data: "printf 'AAAA\\rBB\\nla%s\\033[H\\n' st\n",
  })
  assert.equal(put.ok, true)
  let snap = null
  const until = Date.now() + 10000
  while (Date.now() < until) {
    snap = await callWorker(ptyRoot, { terminalId: 'term-snap', verb: 'snapshot' })
    if (snap?.ok && snap.text.includes('last')) break
    await new Promise((r) => setImmediate(r))
  }
  assert.equal(snap.ok, true)
  const lines = snap.text.split('\n')
  assert.equal(lines.some((line) => /^BBAA/.test(line)), true, 'overwritten cells win, not the raw AAA stream')
  assert.equal(lines.some((line) => /^last/.test(line)), true, 'second line is the printed text')
  assert.equal(snap.cols, 20)
  assert.equal(snap.rows, 4)
  assert.equal(Number.isInteger(snap.cursorX), true)
  assert.equal(Number.isInteger(snap.cursorY), true)
  // The snapshot's seq is a ring offset — a read at it must not replay
  // already-rendered bytes.
  const past = await callWorker(ptyRoot, { terminalId: 'term-snap', verb: 'read', from: snap.seq })
  assert.equal(past.ok, true)
  assert.equal(past.seq >= snap.seq, true)
  assert.equal(Buffer.from(past.bytes_b64 ?? '', 'base64').length <= 64, true)
})
