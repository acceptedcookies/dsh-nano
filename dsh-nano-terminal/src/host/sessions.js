// Local PTY session registry for dsh-nano-terminal.
// Lane "local": ctx.subprocess.spawnTerminal (node-pty) on the dsh host.
// Sessions survive WebSocket detach; replay log powers reattach recovery.

import { randomUUID } from 'node:crypto'
import { ScreenMirror, loadMirror } from './mirror.js'

const decoder = new TextDecoder('utf-8', { fatal: false })
const encoder = new TextEncoder()

export class SessionRegistry {
  /**
   * @param {object} deps
   * @param {import('@deepseek-ai/cordis').Context} deps.ctx
   * @param {(event: object) => void} deps.audit
   * @param {number} deps.maxSessions
   * @param {number} deps.replayBytes
   * @param {number} deps.idleTimeoutMs
   */
  constructor({ ctx, audit, sendBinary, sendText, maxSessions = 16, replayBytes = 512 * 1024, idleTimeoutMs = 30 * 60 * 1000 }) {
    this.ctx = ctx
    this.audit = audit
    this.sendBinary = sendBinary
    this.sendText = sendText
    this.maxSessions = maxSessions
    this.replayBytes = replayBytes
    this.idleTimeoutMs = idleTimeoutMs
    /** @type {Map<string, SessionRecord>} */
    this.sessions = new Map()
  }

  get(id) {
    return this.sessions.get(id)
  }

  list() {
    return [...this.sessions.values()].map((s) => s.info())
  }

  count() {
    return this.sessions.size
  }

  /**
   * Spawn a local PTY session.
   * @param {object} spec - {sessionId, shell, args, cwd, cols, rows, env, owner}
   */
  async create(spec) {
    if (this.sessions.size >= this.maxSessions) {
      throw Object.assign(new Error('terminal limit reached'), { code: 'limit' })
    }
    const id = randomUUID()
    const cwd = await this.resolveCwd(spec)
    const shell = spec.shell || (process.env.SHELL ?? '/bin/zsh')
    const argv = spec.args?.length ? [shell, ...spec.args] : [shell, '-i']
    const handle = await this.ctx.subprocess.spawnTerminal({
      argv,
      cwd,
      env: spec.env ?? {},
      rows: Math.min(Math.max(spec.rows || 24, 2), 512),
      cols: Math.min(Math.max(spec.cols || 80, 2), 512),
      terminalType: 'xterm-256color',
      shellActivity: true,
      graceMs: 1500,
    })
    const record = new SessionRecord({
      id,
      lane: 'local',
      handle,
      owner: spec.owner ?? spec.sessionId ?? 'unknown',
      title: spec.title ?? shell.split('/').pop(),
      meta: { shell, cwd, argv },
      replayBytes: this.replayBytes,
      registry: this,
    })
    this.sessions.set(id, record)
    record.pipe()
    this.audit({ op: 'create', id, lane: 'local', shell, cwd, owner: record.owner, pid: handle.pid })
    return record
  }

  async resolveCwd(spec) {
    if (spec.cwd) return spec.cwd
    try {
      const session = spec.sessionId ? this.ctx.sessions?.get?.(spec.sessionId) : undefined
      if (session) return this.ctx.workingDirectory.get(session)
    } catch { /* fall through to HOME */ }
    return process.env.HOME || process.cwd()
  }

  async close(id, reason = 'close') {
    const rec = this.sessions.get(id)
    if (!rec) return false
    this.sessions.delete(id)
    await rec.shutdown()
    this.audit({ op: 'close', id, reason })
    return true
  }

  /** Terminate every session (plugin unload). */
  async dispose() {
    const records = [...this.sessions.values()]
    this.sessions.clear()
    await Promise.allSettled(records.map((r) => r.shutdown()))
  }

  /** Sweep sessions idle with no attached socket. */
  sweep() {
    const now = Date.now()
    for (const rec of this.sessions.values()) {
      if (rec.sockets.size === 0 && now - rec.lastDetach > this.idleTimeoutMs) {
        this.close(rec.id, 'idle-timeout').catch(() => {})
      }
    }
  }
}

export class SessionRecord {
  constructor({ id, lane, handle, owner, title, meta, replayBytes, registry }) {
    this.id = id
    this.lane = lane
    this.handle = handle
    this.owner = owner
    this.title = title
    this.meta = meta
    this.registry = registry
    this.createdAt = Date.now()
    this.lastDetach = Date.now()
    this.exited = null
    /** @type {Set<import('node:stream').Duplex>} */
    this.sockets = new Set()
    this.replay = []
    this.replayLen = 0
    this.replayCap = replayBytes
    this.mirror = null
    try {
      loadMirror()
      this.mirror = new ScreenMirror(meta.cols ?? 80, meta.rows ?? 24)
    } catch { /* wasm mirror optional */ }
  }

  info() {
    return {
      id: this.id,
      lane: this.lane,
      title: this.title,
      owner: this.owner,
      createdAt: this.createdAt,
      attached: this.sockets.size,
      exited: this.exited,
      meta: this.meta,
    }
  }

  pipe() {
    const send = this.registry.sendBinary
    this.handle.output.on('data', (chunk) => {
      this.remember(chunk)
      try {
        this.mirror?.write(chunk)
      } catch { /* mirror best-effort */ }
      for (const s of this.sockets) send(s, chunk)
    })
    this.handle.output.on('end', () => {
      this.exited = { at: Date.now() }
      this.broadcastText({ type: 'exit', session: this.id })
    })
    this.handle.done
      .then((outcome) => {
        this.exited = { at: Date.now(), outcome }
        this.broadcastText({ type: 'exit', session: this.id, outcome: String(outcome?.code ?? outcome) })
      })
      .catch((err) => {
        this.exited = { at: Date.now(), error: String(err?.message ?? err) }
        this.broadcastText({ type: 'exit', session: this.id, error: String(err?.message ?? err) })
      })
  }

  remember(chunk) {
    this.replay.push(chunk)
    this.replayLen += chunk.length
    while (this.replayLen > this.replayCap && this.replay.length) {
      this.replayLen -= this.replay.shift().length
    }
  }

  replayInto(socket, send) {
    for (const chunk of this.replay) send(socket, chunk)
  }

  attach(socket) {
    this.sockets.add(socket)
    socket.once('close', () => this.detach(socket))
  }

  detach(socket) {
    if (this.sockets.delete(socket)) {
      if (this.sockets.size === 0) this.lastDetach = Date.now()
    }
  }

  async writeInput(data) {
    if (this.exited) return
    await this.handle.write(typeof data === 'string' ? data : decoder.decode(data))
  }

  async resize(cols, rows) {
    this.meta = { ...this.meta, cols, rows }
    try {
      this.mirror?.resize(cols, rows)
    } catch { /* best-effort */ }
    if (!this.exited) await this.handle.resize(cols, rows).catch(() => {})
  }

  broadcastText(obj) {
    const send = this.registry.sendText
    for (const s of this.sockets) send(s, obj)
  }

  screenText(n) {
    try {
      return this.mirror?.screenText(n) ?? ''
    } catch {
      return ''
    }
  }

  async shutdown() {
    for (const s of this.sockets) {
      try { s.destroy() } catch { /* already gone */ }
    }
    this.sockets.clear()
    this.mirror?.free()
    await this.handle.terminate().catch(() => {})
  }
}
