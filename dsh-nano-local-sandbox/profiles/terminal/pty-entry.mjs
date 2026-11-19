#!/usr/bin/env node
/**
 * DNLS PTY entry — the only broker CLI, inside the guest.
 *
 *   pty-entry.mjs create   launch one worker for the request read from
 *                          stdin, wait for its ready pipe, then detach —
 *                          explicit creation only, never on rpc.
 *   pty-entry.mjs rpc      forward one JSON request from stdin to the
 *                          existing worker socket and print its reply to
 *                          stdout. Never creates or spawns a PTY.
 *
 * The production CLI has no knobs: the root is the fixed root-owned
 * /run/dnls-pty and the helper paths are baked. Test fixtures import
 * createWorker/callWorker with a private root — nothing here is a credential.
 */
import { spawn } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync } from 'node:fs'
import net from 'node:net'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const PRODUCTION = {
  root: '/run/dnls-pty',
  python: '/usr/bin/python3',
  workerPath: '/opt/dnls/pty-worker.py',
  user: 'node',
}
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/
const REQUEST_MAX = 1 << 16
const RPC_TIMEOUT_MS = 10000
const READY_TIMEOUT_MS = 10000

async function readStdin(limit = REQUEST_MAX) {
  let data = ''
  for await (const chunk of process.stdin) {
    data += chunk
    if (Buffer.byteLength(data) > limit) throw Object.assign(new Error('request too large'), { code: 2 })
  }
  try {
    return JSON.parse(data || '{}')
  } catch {
    throw Object.assign(new Error('request is not JSON'), { code: 2 })
  }
}

/** A private 0700 dir owned by uid 0 or this user; never a symlink target. */
function requireRoot(path) {
  if (!existsSync(path)) mkdirSync(path, { mode: 0o700, recursive: false })
  const st = lstatSync(path)
  if (!st.isDirectory() || (st.mode & 0o077) !== 0 || ![0, process.geteuid()].includes(st.uid)) {
    throw Object.assign(new Error('pty root must be a private 0700 dir owned by uid 0 or this user'), { code: 2 })
  }
  return path
}

function socketFor(root, terminalId) {
  if (!SAFE_ID.test(String(terminalId ?? ''))) throw Object.assign(new Error('bad terminalId'), { code: 2 })
  return join(root, `${terminalId}.sock`)
}

function errorOf(error) {
  return { ok: false, error: error?.message ?? 'failed' }
}

/**
 * Spawn the worker detached, wait on its ready pipe, then drop every handle —
 * no IPC pipe survives bootstrap. `config` supplies root/python/workerPath
 * (production constants or a test's private root).
 */
export async function createWorker(config, req) {
  const dir = requireRoot(config.root)
  const socket = socketFor(dir, req.terminalId)
  if (existsSync(socket)) return { ok: false, error: 'terminal already exists' }
  const cols = Number.isInteger(req.cols) && req.cols >= 2 && req.cols <= 512 ? req.cols : 80
  const rows = Number.isInteger(req.rows) && req.rows >= 2 && req.rows <= 512 ? req.rows : 24
  const cwd = typeof req.cwd === 'string' && req.cwd.startsWith('/') ? req.cwd : '/'
  const child = spawn(config.python, [
    '-I',
    config.workerPath,
    '--socket', socket,
    '--ready-fd', '3',
    '--root', dir,
    '--user', config.user ?? 'node',
    '--cwd', cwd,
    '--cols', String(cols),
    '--rows', String(rows),
  ], { detached: true, stdio: ['ignore', 'ignore', 'ignore', 'pipe'] })
  const readyPipe = child.stdio[3]
  const ready = await new Promise((resolve) => {
    let buf = ''
    const timer = setTimeout(() => resolve(false), READY_TIMEOUT_MS)
    readyPipe.on('data', (chunk) => {
      buf += chunk
      if (buf.includes('ready')) { clearTimeout(timer); resolve(true) }
    })
    readyPipe.on('close', () => { clearTimeout(timer); resolve(false) })
    child.on('error', () => { clearTimeout(timer); resolve(false) })
  })
  readyPipe.destroy()
  if (!ready) {
    try { process.kill(-child.pid, 'SIGKILL') } catch { try { child.kill('SIGKILL') } catch { /* gone */ } }
    return { ok: false, error: 'worker failed to start' }
  }
  child.unref()
  return { ok: true, terminalId: req.terminalId }
}

/**
 * Forward one request to the existing worker socket. `verb:'drain'` streams
 * reply lines to `onLine` until `ended`; every other verb resolves with the
 * single reply. A missing socket or connect failure is unavailable, never a
 * spawn.
 */
export async function callWorker(root, req, { onLine } = {}) {
  const dir = requireRoot(root)
  const socket = socketFor(dir, req.terminalId)
  if (!existsSync(socket)) return { ok: false, error: 'unavailable' }
  return new Promise((resolve) => {
    const conn = net.createConnection(socket)
    const timer = setTimeout(() => { conn.destroy(); resolve({ ok: false, error: 'timeout' }) }, RPC_TIMEOUT_MS)
    const finish = (obj) => { clearTimeout(timer); conn.destroy(); resolve(obj) }
    conn.on('error', () => finish({ ok: false, error: 'unavailable' }))
    conn.on('connect', () => conn.write(`${JSON.stringify({ ...req, terminalId: undefined })}\n`))
    let buf = ''
    conn.on('data', (chunk) => {
      buf += chunk
      let at
      while ((at = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, at)
        buf = buf.slice(at + 1)
        if (!line.trim()) continue
        let reply
        try { reply = JSON.parse(line) } catch { return finish({ ok: false, error: 'bad reply' }) }
        if (req.verb === 'drain') {
          onLine?.(reply)
          if (reply.ended === true) return finish({ ok: true, ended: true })
        } else {
          return finish(reply)
        }
      }
    })
    conn.on('close', () => {
      if (req.verb === 'drain') return finish({ ok: true, ended: true })
      finish({ ok: false, error: 'unavailable' })
    })
  })
}

/** Write and let the buffer leave before exiting — no truncated payload. */
function reply(obj, code = 0) {
  return new Promise((resolve) => {
    process.stdout.write(`${JSON.stringify(obj)}\n`, () => {
      process.exitCode = code
      resolve()
    })
  })
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href
if (isMain) {
  const [verb] = process.argv.slice(2)
  try {
    const req = await readStdin()
    if (verb === 'create') await reply(await createWorker(PRODUCTION, req))
    else if (verb === 'rpc') await reply(await callWorker(PRODUCTION.root, req))
    else await reply({ ok: false, error: `unknown verb ${verb}` }, 2)
  } catch (error) {
    await reply(errorOf(error), error?.code ?? 2)
  }
}
