import { randomBytes } from 'node:crypto'
import { listenTermSocket } from './term-ws.js'

/** One active PTY per dsh sessionId. The URL is published only after listen(). */
const active = new Map()

function reject(errorId, error) {
  return { ok: false, errorId, error }
}

export function termStateFor(sessionId) {
  const row = sessionId ? active.get(sessionId) : null
  if (row && !row.closed) return 'listening'
  return 'absent'
}

export async function openTermSession({ sessionId, cols = 80, rows = 24, containerRunning, policyStale, spawnPty }) {
  if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId === 'term-1') {
    return reject('term.session.session', 'sessionId is required')
  }
  if (policyStale) return reject('sandbox.instance.policy-stale', 'policy fingerprint mismatch')
  if (containerRunning !== true) return reject('kitesurf.engine.connect', 'container is not running')
  const existing = active.get(sessionId)
  if (existing && !existing.closed) {
    return { ok: true, id: existing.id, attach: { protocol: 'dnt-ws-v1', url: existing.url } }
  }
  if (typeof spawnPty !== 'function') return reject('kitesurf.engine.connect', 'no pty spawn')
  let child
  try {
    child = spawnPty({ sessionId, cols, rows })
  } catch (error) {
    return reject('kitesurf.engine.connect', error.message || 'pty spawn failed')
  }
  if (!child?.stdin || !child?.stdout) {
    try { child?.kill?.() } catch { /* not started */ }
    return reject('kitesurf.engine.connect', 'pty spawn failed')
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
  if (port instanceof Error || !port) return reject('kitesurf.engine.connect', 'pty socket failed')
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
  if (!row || row.closed) return { ok: false, errorId: 'term.session.missing', error: 'no terminal' }
  try { row.child.stdin.write(Buffer.from(String(data))) } catch (error) {
    return { ok: false, errorId: 'kitesurf.engine.connect', error: error.message }
  }
  return { ok: true, id: sessionId }
}

export function readTermSession(sessionId, lines = 50) {
  const row = active.get(sessionId)
  if (!row || row.closed) return { ok: false, errorId: 'term.session.missing', error: 'no terminal' }
  const text = row.output.join('')
  const tail = text.split('\n').slice(-lines).join('\n')
  return { ok: true, id: sessionId, text: tail }
}

export function resizeTermSession(sessionId, cols, rows) {
  const row = active.get(sessionId)
  if (!row || row.closed) return { ok: false, errorId: 'term.session.missing', error: 'no terminal' }
  try { row.child.resize?.(cols, rows) } catch { /* size is best-effort */ }
  return { ok: true, id: sessionId, cols, rows }
}

export function closeTermSession(sessionId) {
  const row = active.get(sessionId)
  if (!row) return { ok: false, errorId: 'term.session.missing', error: 'no terminal' }
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
