import { randomBytes } from 'node:crypto'
import { listenTermSocket } from './term-ws.js'

/** One active PTY per dsh sessionId. The URL is published only after listen(). */
const active = new Map()

// Terminal failures use the frozen dnt error kinds, not new DNLS errorIds.
// Policy staleness keeps its catalogued sandbox.* id.
const KIND_STATUS = { needs_target: 400, not_found: 404, unavailable: 409, spawn_failed: 502 }

function reject(kind, error) {
  return { ok: false, kind, status: KIND_STATUS[kind], error }
}

const missing = () => reject('not_found', 'no terminal')

export function termStateFor(sessionId) {
  const row = sessionId ? active.get(sessionId) : null
  if (row && !row.closed) return 'listening'
  return 'absent'
}

export async function openTermSession({ sessionId, cols = 80, rows = 24, containerRunning, policyStale, spawnPty }) {
  if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId === 'term-1') {
    return reject('needs_target', 'sessionId is required')
  }
  if (policyStale) return { ok: false, errorId: 'sandbox.instance.policy-stale', error: 'policy fingerprint mismatch' }
  if (containerRunning !== true) return reject('unavailable', 'container is not running')
  const existing = active.get(sessionId)
  if (existing && !existing.closed) {
    return { ok: true, id: existing.id, attach: { protocol: 'dnt-ws-v1', url: existing.url } }
  }
  if (typeof spawnPty !== 'function') return reject('spawn_failed', 'no pty spawn')
  let child
  try {
    child = spawnPty({ sessionId, cols, rows })
  } catch (error) {
    return reject('spawn_failed', error.message || 'pty spawn failed')
  }
  if (!child?.stdin || !child?.stdout) {
    try { child?.kill?.() } catch { /* not started */ }
    return reject('spawn_failed', 'pty spawn failed')
  }
  const path = `/term?session=${encodeURIComponent(sessionId)}&token=${randomBytes(16).toString('hex')}`
  const bridge = listenTermSocket({
    path,
    onText(text) {
      let msg
      try { msg = JSON.parse(text) } catch { return }
      if (msg?.type === 'open') bridge.sendText({ type: 'ready', v: 1, session: sessionId })
      else if (msg?.type === 'resize' && typeof child.resize === 'function') child.resize(msg.cols, msg.rows)
    },
    onBinary(payload) {
      try { child.stdin.write(payload) } catch { /* pipe closed */ }
    },
  })
  const port = await new Promise((resolve, rejectListen) => {
    bridge.server.once('error', rejectListen)
    bridge.server.listen(0, '127.0.0.1', () => resolve(bridge.server.address().port))
  }).catch((error) => {
    try { child.kill?.() } catch { /* already gone */ }
    bridge.close()
    return error
  })
  if (port instanceof Error || !port) return reject('spawn_failed', 'pty socket failed')
  bridge.server.unref()
  child.unref?.()
  const url = `ws://127.0.0.1:${port}${path}`
  const row = { id: sessionId, url, bridge, child, closed: false, output: [] }
  child.stdout.on('data', (chunk) => {
    const text = Buffer.from(chunk).toString('utf8')
    row.output.push(text)
    if (row.output.length > 200) row.output.shift()
    bridge.sendBinary(chunk)
  })
  child.on?.('exit', () => {
    const row = active.get(sessionId)
    if (row && row.url === url) row.closed = true
    bridge.sendText({ type: 'exit', session: sessionId })
  })
  active.set(sessionId, row)
  return { ok: true, id: sessionId, attach: { protocol: 'dnt-ws-v1', url } }
}

export function writeTermSession(sessionId, data) {
  const row = active.get(sessionId)
  if (!row || row.closed) return missing()
  try { row.child.stdin.write(Buffer.from(String(data))) } catch (error) {
    return reject('unavailable', error.message)
  }
  return { ok: true, id: sessionId }
}

export function readTermSession(sessionId, lines = 50) {
  const row = active.get(sessionId)
  if (!row || row.closed) return missing()
  const text = row.output.join('')
  const tail = text.split('\n').slice(-lines).join('\n')
  return { ok: true, id: sessionId, text: tail }
}

export function resizeTermSession(sessionId, cols, rows) {
  const row = active.get(sessionId)
  if (!row || row.closed) return missing()
  try { row.child.resize?.(cols, rows) } catch { /* the pty may be exiting */ }
  return { ok: true, id: sessionId, cols, rows }
}

export function closeTermSession(sessionId) {
  const row = active.get(sessionId)
  if (!row) return missing()
  row.closed = true
  active.delete(sessionId)
  try { row.child.kill?.('SIGKILL') } catch { /* already gone */ }
  try { row.child.unref?.() } catch { /* already gone */ }
  try { row.bridge.close() } catch { /* already closed */ }
  return { ok: true, id: sessionId }
}

export function shutdownTerms() {
  for (const id of [...active.keys()]) closeTermSession(id)
}

export function listTermSessions() {
  return [...active.values()].filter((row) => !row.closed).map((row) => ({ id: row.id, attach: { protocol: 'dnt-ws-v1', url: row.url } }))
}
