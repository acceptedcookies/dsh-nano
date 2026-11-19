// Terminal registry for dsh-nano-terminal.
// Lane "local": ctx.subprocess.spawnTerminal (node-pty) on the dsh host.
//
// Upgraded contract (DNT01): a terminal is a persistent, addressable object —
//   id    = uuid (stable, internal)
//   addr  = '<lane>/<name|short6>' — the single address space across lanes
//   name  = optional caller-chosen addressable name (unique)
//   parent= optional parent addr — notes fan-in, die_with_parent cleanup
//   keep  = respawn a shell when the program is lost; NEVER reruns the command
//   labels= caller key=value metadata
//   status= program-reported OSC 7501 state (idle/working/done/blocked/error)
//   phase = lifecycle: live | exited | recovering
//   turn  = monotonically increasing when status leaves 'working' (wait anchor)
// Sessions survive WebSocket detach; replay log powers reattach recovery.
// All lifecycle transitions emit on the registry's EventBus.

import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { ScreenMirror, loadMirror } from './mirror.js'
import { KIND, err } from './errors.js'
import { Gate } from './gate.js'
import { resizeMode } from '../shared/align.js'
import { parseCtxRef, bareTermStamp } from '../shared/ctxref.js'
import { resolveExecutionWorld, remoteChildEnv } from './execution-world.js'
// splitSlashArgs rides this bundle so index.js gets it from lib/sessions.js.
export { splitSlashArgs } from '../shared/ctxref.js'

/**
 * Host-side perf join. `ensurePerfReviewHost` is bundled into
 * lib/perf-review-host.js by build-client.mjs; this module is bundled too,
 * so import it directly. Disabled path = identity wrappers, no clocks.
 * `hostPerf()` returns the API (hostSpan/count) or a no-op when disabled.
 */
import { ensurePerfReviewHost } from 'dsh-performance-review/host'

const HOST_PLUGIN = 'dsh-nano-terminal'
let _hostApi = null
function hostPerf() {
  if (_hostApi === null) {
    const host = ensurePerfReviewHost()
    _hostApi = typeof host.hostJoin === 'function' ? host.hostJoin(HOST_PLUGIN) : null
  }
  return _hostApi
}
const hostSpan = (name, fn) => {
  const api = hostPerf()
  return api?.hostSpan ? api.hostSpan(name, fn) : fn()
}
const hostCount = (name, n = 1) => { try { hostPerf()?.count?.(name, n) } catch { /* best-effort */ } }

const decoder = new TextDecoder('utf-8', { fatal: false })
const encoder = new TextEncoder()

// keep respawn backoff (herdr-core kept.rs): 1.5→3→6→12→30→60s, reset when
// the respawned program survives ≥10s
const KEEP_BACKOFF = [1500, 3000, 6000, 12000, 30000, 60000]

// Default interactive shell per platform. $SHELL is POSIX-only; on Windows
// fall back to %COMSPEC% (cmd.exe). Callers can always override via spec.shell.
function defaultShell() {
  if (process.platform === 'win32') return process.env.COMSPEC ?? 'cmd.exe'
  return process.env.SHELL ?? '/bin/zsh'
}

// Injected into every pane's environment — lets an agent inside a terminal
// address itself and call back the control plane (hc $HC_TERMINAL_ID model).
function agentEnv(rec, apiBase) {
  return {
    DNT_TERMINAL_ID: rec.addr,
    DNT_TERMINAL_SESSION: rec.id,
    DNT_API: apiBase,
    DNT_ENV: '1',
    TERM_PROGRAM: 'dnt',
    // 交互式终端不该继承宿主进程的 NO_COLOR（那是给非交互 CLI 的）。按
    // no-color.org 的规范，空串等于未设置，TUI 才会正常上色。
    NO_COLOR: '',
    // 声明真彩，避免 TUI 退回 16 色或直接关色。
    COLORTERM: 'truecolor',
  }
}

export class SessionRegistry {
  /**
   * @param {object} deps
   * @param {import('@deepseek-ai/cordis').Context} deps.ctx
   * @param {(event: object) => void} deps.audit
   * @param {import('./events.js').EventBus} deps.bus
   * @param {string} deps.apiBase — base URL agents use to reach the MCP plane
   */
  constructor({ ctx, audit, sendBinary, sendText, bus, apiBase = '', persist = null, maxSessions = 16, replayBytes = 512 * 1024, idleTimeoutMs = 30 * 60 * 1000 }) {
    this.ctx = ctx
    this.audit = audit
    this.sendBinary = sendBinary
    this.sendText = sendText
    this.bus = bus
    this.apiBase = apiBase
    this.persist = persist
    this.maxSessions = maxSessions
    this.replayBytes = replayBytes
    this.idleTimeoutMs = idleTimeoutMs
    /** @type {Map<string, SessionRecord>} id → record */
    this.sessions = new Map()
    /** @type {Map<string, string>} name → id */
    this.names = new Map()
  }

  get(id) {
    return this.sessions.get(id)
  }

  /**
   * Resolve id | name | addr ('<lane>/<name|short6>') | bare short6 |
   * ctx ref ('[ DNT:{conv8}@{term8} ]') | bare 8-hex term stamp to a record.
   * A ctx ref matches the session whose `t` label is the term stamp; a conv
   * stamp additionally requires the `conv` label to agree.
   */
  resolve(ref) {
    if (!ref) return undefined
    if (this.sessions.has(ref)) return this.sessions.get(ref)
    // Context references resolve before the generic prefix fallback so a
    // uuid-shaped term stamp is never mistaken for a record-id prefix.
    const ctx = parseCtxRef(ref)
    if (ctx) return this.#resolveCtx(ctx)
    const slash = String(ref).indexOf('/')
    if (slash >= 0) ref = String(ref).slice(slash + 1)
    if (this.names.has(ref)) return this.sessions.get(this.names.get(ref))
    // A bare 8-hex term stamp resolves before the uuid-prefix heuristic —
    // label match is exact, `id.startsWith` could steal 'deadbeef' from its
    // `t` owner whenever some uuid happens to share the same first 8 hex.
    // Exact-label hit AND a different id-prefix hit → ambiguous, say so.
    const bare = bareTermStamp(ref)
    if (bare) {
      const hit = this.#resolveCtx({ conv: null, term: bare })
      if (hit) {
        const prefixHit = [...this.sessions.values()].find((r) => r.id.startsWith(ref) && r !== hit)
        if (prefixHit) throw err(KIND.NEEDS_TARGET, `'${ref}' names both a term stamp and session ids — resolve by addr or full id`)
        return hit
      }
    }
    for (const rec of this.sessions.values()) {
      if (rec.id.startsWith(ref) && ref.length >= 4) return rec
    }
    return undefined
  }

  /** All records matching a ctx pair — ambiguity must surface, not first-match. */
  #ctxHits({ conv, term }) {
    const hits = []
    for (const rec of this.sessions.values()) {
      if (rec.labels?.t !== term) continue
      if (conv && rec.labels?.conv !== conv) continue
      hits.push(rec)
    }
    return hits
  }

  #resolveCtx({ conv, term }) {
    const hits = this.#ctxHits({ conv, term })
    if (hits.length > 1) {
      throw err(KIND.NEEDS_TARGET, `term stamp '${term}' is ambiguous — ${hits.map((r) => r.addr).join(', ')}; resolve by addr or id`)
    }
    return hits[0]
  }

  list() {
    return [...this.sessions.values()].map((s) => s.info())
  }

  count() {
    return this.sessions.size
  }

  /** Children of a parent record (or addr). */
  childrenOf(ref) {
    const parent = typeof ref === 'string' ? this.resolve(ref) : ref
    if (!parent) return []
    return [...this.sessions.values()].filter((s) => s.parent === parent.id)
  }

  /**
   * Spawn a local PTY session.
   * @param {object} spec - {sessionId, name, parent, keep, labels, shell, args, cwd, cols, rows, env, owner, title}
   */
  async create(spec) {
    if (this.sessions.size >= this.maxSessions) {
      throw err(KIND.LIMIT, 'terminal limit reached')
    }
    if (spec.name) {
      if (this.names.has(spec.name)) throw err(KIND.NAME_TAKEN, `name '${spec.name}' already bound`)
      // A name that parses as a ctx ref would be swallowed by resolve()'s
      // ctx branch and unreachable forever — reserved spelling.
      if (parseCtxRef(spec.name) || bareTermStamp(spec.name)) {
        throw err(KIND.INVALID, `name '${spec.name}' collides with ctx-ref grammar`)
      }
    }
    const parentRec = spec.parent ? this.resolve(spec.parent) : undefined
    if (spec.parent && !parentRec) throw err(KIND.NOT_FOUND, `no such parent '${spec.parent}'`)

    // Minting an already-bound term stamp would make bare-stamp resolution
    // ambiguous — refuse up front instead of letting needs_target surface later.
    const mintT = spec.labels?.t
    if (mintT) {
      if (!/^[0-9a-f]{8}$/.test(mintT)) throw err(KIND.INVALID, `label 't' must be a lowercase 8-hex stamp, got '${mintT}'`)
      const clash = [...this.sessions.values()].find((r) => r.labels?.t === mintT)
      if (clash) throw err(KIND.CONFLICT, `term stamp '${mintT}' already bound to ${clash.addr}`)
    }
    if (spec.labels?.conv && !/^[0-9a-f]{8}$/.test(spec.labels.conv)) {
      throw err(KIND.INVALID, `label 'conv' must be a lowercase 8-hex stamp, got '${spec.labels.conv}'`)
    }

    const id = randomUUID()
    const cwd = await this.resolveCwd(spec)
    const shell = spec.shell || defaultShell()
    const argv = spec.args?.length ? [shell, ...spec.args] : [shell, ...(process.platform === 'win32' ? [] : ['-i'])]
    const record = new SessionRecord({
      id,
      lane: 'local',
      handle: null,
      owner: spec.owner ?? spec.sessionId ?? 'unknown',
      title: spec.title ?? shell.split(/[\\/]/).pop(),
      name: spec.name,
      parent: parentRec?.id,
      keep: !!spec.keep,
      labels: { ...(spec.labels ?? {}) },
      // cols/rows 必须进 meta：镜像按 meta 建，缺了就固定成 80×24，
      // 而 PTY 是按 open 消息里的尺寸起的，两边会错开。
      meta: {
        shell,
        cwd,
        argv,
        cols: Math.min(Math.max(spec.cols || 80, 2), 512),
        rows: Math.min(Math.max(spec.rows || 24, 2), 512),
      },
      replayBytes: this.replayBytes,
      registry: this,
    })
    const world = resolveExecutionWorld(this.ctx, spec.sessionId)
    /* A remote-marked session without a live binding must not quietly borrow
     * the host subprocess — that would run a "cloud" terminal on this host. */
    if (world.kind === 'remote' && (!world.subprocess || !world.generation || world.unbound || !world.root || world.signal?.aborted)) {
      throw err(KIND.SPAWN_FAILED, 'remote execution binding is unavailable; refusing local spawn')
    }
    record.generation = world.generation
    record.worldKind = world.kind
    record.remoteIdentity = world.kind === 'remote' ? world.identity : null
    if (world.kind === 'remote') record.keep = false
    const envBase = { ...(spec.env ?? {}), ...agentEnv(record, this.apiBase) }
    record.env = world.kind === 'remote' ? remoteChildEnv(envBase) : envBase
    const subprocess = world.subprocess ?? this.ctx.subprocess
    const handle = await hostSpan('dnt-spawn', () => subprocess
      .spawnTerminal({
        argv,
        cwd: world.root ?? cwd,
        env: record.env,
        /* The binding's own abort signal retires this handle: a revoked or
         * expired remote scope terminates its own terminal, nothing else. */
        signal: world.signal,
        rows: Math.min(Math.max(spec.rows || 24, 2), 512),
        cols: Math.min(Math.max(spec.cols || 80, 2), 512),
        terminalType: 'xterm-256color',
        shellActivity: true,
        graceMs: 1500,
      }))
      .catch((e) => {
        throw err(KIND.SPAWN_FAILED, String(e?.message ?? e))
      })
    record.handle = handle
    this.sessions.set(id, record)
    if (spec.name) this.names.set(spec.name, id)
    record.pipe()
    this.audit({ op: 'create', id, addr: record.addr, lane: 'local', shell, cwd, owner: record.owner, pid: handle.pid })
    this.bus?.emit('created', record.addr, { id, lane: record.lane, title: record.title, owner: record.owner, parent: parentRec?.addr })
    this.persist?.schedule(this)
    return record
  }

  /**
   * Restore persisted terminals as placeholders (no process; a fresh shell
   * spawns on first attach and the saved screen tail replays above it —
   * the program itself is NEVER rerun, same rule as `keep`).
   */
  restoreSaved() {
    const saved = this.persist?.load?.() ?? []
    for (const t of saved) {
      if (this.sessions.has(t.id)) continue
      try {
        const rec = new SessionRecord({
          id: t.id,
          lane: t.lane ?? 'local',
          handle: null,
          owner: t.owner ?? 'restored',
          title: t.title ?? 'restored',
          name: t.name,
          parent: null, // parent addr resolves lazily — order-independent
          keep: !!t.keep,
          labels: t.labels ?? {},
          meta: t.meta ?? {},
          replayBytes: this.replayBytes,
          registry: this,
        })
        rec.parent = t.parent ? (this.resolve(t.parent)?.id ?? null) : null
        /* Records written before this field existed carry no worldKind and
         * can only be treated as local — remote provenance cannot be
         * retroactively proven, so unmarked stays the backward-compatible
         * local placeholder path. */
        rec.worldKind = t.worldKind ?? 'local'
        rec.remoteIdentity = t.remoteIdentity ?? null
        rec.generation = t.generation ?? 'local'
        rec.preservedScreen = this.persist.screenFor(t.id)
        if (rec.worldKind === 'remote') {
          /* A remote terminal's binding cannot outlive a host restart: keep
           * only the saved screen as a tombstone, never spawn anything
           * (locally or remotely) on attach. */
          rec.pending = false
          rec.phase = 'exited'
          rec.exited = { code: null, reason: 'remote-binding-ended' }
          rec.keep = false
          if (rec.preservedScreen?.length) {
            rec.push(rec.preservedScreen)
            rec.mirror?.write(rec.preservedScreen)
          }
        } else {
          rec.pending = true
          rec.phase = 'live'
        }
        rec.env = agentEnv(rec, this.apiBase)
        rec.gate.restore(t.gate)
        this.sessions.set(t.id, rec)
        // A persisted name obeys the same grammar guard as create — a name
        // that parses as a ctx ref or shadows a live name stays unbound.
        if (t.name && !this.names.has(t.name) && !parseCtxRef(t.name) && !bareTermStamp(t.name)) {
          this.names.set(t.name, t.id)
        }
        this.bus?.emit('created', rec.addr, { id: rec.id, lane: rec.lane, title: rec.title, restored: true })
      } catch { /* one bad record doesn't block the rest */ }
    }
  }

  /**
   * First attach to a placeholder spawns the fresh shell and replays the
   * preserved screen above it. Idempotent AND race-safe: concurrent wakes
   * share one spawn promise; a failed spawn re-arms the placeholder so the
   * next attach retries instead of bricking the session.
   */
  async spawnPending(rec) {
    if (!rec.pending || rec.worldKind === 'remote') return
    if (rec.pendingSpawn) return rec.pendingSpawn
    rec.pendingSpawn = this.#spawnPendingOnce(rec)
    try {
      return await rec.pendingSpawn
    } finally {
      rec.pendingSpawn = null
    }
  }

  async #spawnPendingOnce(rec) {
    rec.pending = false // re-armed on failure below
    const meta = rec.meta ?? {}
    const shell = meta.shell || defaultShell()
    const argv = meta.argv?.length ? meta.argv : [shell, ...(process.platform === 'win32' ? [] : ['-i'])]
    const handle = await hostSpan('dnt-spawn', () => this.ctx.subprocess
      .spawnTerminal({
        argv,
        cwd: meta.cwd ?? homedir(),
        env: rec.env,
        rows: Math.min(Math.max(meta.rows || 24, 2), 512),
        cols: Math.min(Math.max(meta.cols || 80, 2), 512),
        terminalType: 'xterm-256color',
        shellActivity: true,
        graceMs: 1500,
      }))
      .catch((e) => {
        // The placeholder stays a placeholder — next wake retries the spawn
        // instead of permanently reporting 'no live backend'.
        rec.pending = true
        throw err(KIND.SPAWN_FAILED, String(e?.message ?? e))
      })
    rec.handle = handle
    rec.pipe()
    // preserved screen replays into the mirror + first attach so reads match
    // the pre-restart screen
    if (rec.preservedScreen?.length) {
      rec.push(rec.preservedScreen)
      rec.mirror?.write(rec.preservedScreen)
    }
    this.audit({ op: 'respawn-on-attach', id: rec.id, addr: rec.addr })
    this.bus?.emit('restarted', rec.addr, { id: rec.id, restored: true })
  }

  async resolveCwd(spec) {
    if (spec.cwd) return spec.cwd
    try {
      const session = spec.sessionId ? this.ctx.sessions?.get?.(spec.sessionId) : undefined
      if (session) return this.ctx.workingDirectory.get(session)
    } catch { /* fall through to HOME */ }
    return process.env.HOME || homedir() || process.cwd()
  }

  async close(id, reason = 'close') {
    const rec = this.resolve(id) ?? this.sessions.get(id)
    if (!rec) return false
    this.sessions.delete(rec.id)
    if (rec.name) this.names.delete(rec.name)
    // die_with_parent: a child outlives its parent only when it never had one
    for (const child of this.childrenOf(rec)) {
      await this.close(child.id, 'parent-died')
    }
    await rec.shutdown()
    this.audit({ op: 'close', id: rec.id, addr: rec.addr, reason })
    this.bus?.emit('removed', rec.addr, { id: rec.id, reason })
    this.persist?.schedule(this)
    return true
  }

  /** Terminate every session (plugin unload). */
  async dispose() {
    const records = [...this.sessions.values()]
    this.sessions.clear()
    this.names.clear()
    await Promise.allSettled(records.map((r) => r.shutdown()))
  }

  /** Sweep sessions idle with no attached socket. */
  sweep() {
    const now = Date.now()
    for (const rec of this.sessions.values()) {
      if (rec.sockets.size === 0 && now - rec.lastDetach > this.idleTimeoutMs && !rec.keep) {
        this.close(rec.id, 'idle-timeout').catch(() => {})
      }
    }
  }
}

export class SessionRecord {
  constructor({ id, lane, handle, owner, title, name, parent, keep, labels, meta, replayBytes, registry }) {
    this.id = id
    this.lane = lane
    this.handle = handle
    this.owner = owner
    this.title = title
    this.name = name ?? null
    this.parent = parent ?? null
    this.keep = !!keep
    this.labels = labels ?? {}
    this.meta = meta
    this.registry = registry
    this.createdAt = Date.now()
    this.lastDetach = Date.now()
    this.exited = null
    /** lifecycle phase: live | exited | recovering (keep respawn pending) */
    this.phase = 'live'
    /** program-reported OSC 7501 state object or null — core never guesses */
    this.status = null
    /** turn counter: +1 every time status leaves 'working' (wait anchor) */
    this.turn = 0
    /** @type {Set<import('node:stream').Duplex>} */
    this.sockets = new Set()
    /** @type {Map<import('node:stream').Duplex, import('./ws.js').Attach>} v2 attach state per socket */
    this.attached = new Map()
    this.replay = []
    this.replayLen = 0
    this.replayCap = replayBytes
    /** 镜像已吃进的输出块序号。对齐帧带上它，之后的 DATA 必须更大。 */
    this.outSeq = 0
    this.keepAttempt = 0
    this.keepTimer = null
    this.gate = new Gate()
    // held human bytes flush straight to the pty once the agent delivery ends
    this.gate.flushHeld = (chunks) => {
      if (!this.exited) this.handle?.write(Buffer.concat(chunks.map((c) => (typeof c === 'string' ? Buffer.from(c, 'utf8') : c)))).catch(() => {})
    }
    this.mirror = null
    this._lastStateSeq = 0
    try {
      loadMirror()
      this.mirror = new ScreenMirror(meta.cols ?? 80, meta.rows ?? 24)
    } catch { /* wasm mirror optional */ }
  }

  /** '<lane>/<name|short6>' — the single address across lanes. */
  get addr() {
    return `${this.lane}/${this.name ?? this.id.slice(0, 6)}`
  }

  info() {
    const { conv, t } = this.labels ?? {}
    return {
      id: this.id,
      addr: this.addr,
      // `[ DNT:{conv8}@{term8} ]` — or `DNT:@{term8}` when only `t` is bound;
      // either form resolves through resolve().
      ctx: t ? `DNT:${conv ?? ''}@${t}` : null,
      name: this.name,
      lane: this.lane,
      title: this.title,
      owner: this.owner,
      parent: this.parent,
      keep: this.keep,
      labels: this.labels,
      phase: this.phase,
      status: this.status,
      turn: this.turn,
      createdAt: this.createdAt,
      attached: this.sockets.size,
      exited: this.exited,
      meta: { ...this.meta, argv: undefined }, // argv may carry secrets — omit
    }
  }

  /**
   * Busy = a foreground program is running or the program reported
   * working/blocked via OSC 7501. Drives the UI close-confirm and the
   * `busy` field on list/stats/sessions — honest, never guessed: shell
   * idleness comes from the backend's own foreground inspection.
   */
  async isBusy() {
    const st = this.status?.state
    if (st === 'working' || st === 'blocked') return true
    if (!this.handle) return false
    const fg = await this.handle.inspectForeground?.().catch(() => undefined)
    if (!fg || fg.processGroupId == null) return false
    // A live foreground process group that isn't the shell itself is work
    // the user would lose on close (vim, a build, a REPL).
    return fg.processGroupId !== this.handle.pid
  }

  /** Adopt a (re)spawned handle — used by keep respawn. */
  adopt(handle) {
    this.handle = handle
    this.exited = null
    this.phase = 'live'
    this.pipe()
  }

  pipe() {
    const send = this.registry.sendBinary
    this.handle.output.on('data', (chunk) => {
      hostSpan('dnt-pipe-broadcast', () => {
        this.remember(chunk)
        try {
          this.mirror?.write(chunk)
          this.#pollState()
        } catch { /* mirror best-effort */ }
        this.outSeq = (this.outSeq + 1) >>> 0
        const seq = this.outSeq
        for (const [s, att] of this.attached) {
          if (att) att.data(chunk, seq)
          else send(s, chunk)
        }
      })
      hostCount('dnt-out-bytes', chunk.length)
    })
    this.handle.output.on('end', () => {
      this.#onProgramEnd({ at: Date.now() })
    })
    this.handle.done
      .then((outcome) => {
        this.#onProgramEnd({ at: Date.now(), outcome })
      })
      .catch((e) => {
        this.#onProgramEnd({ at: Date.now(), error: String(e?.message ?? e) })
      })
  }

  /** Program end: exit code / explicit kill = terminal; loss may keep-respawn. */
  #onProgramEnd(info) {
    if (this.exited) return
    this.exited = info
    // herdr-core kept.rs: a *lost* program (signal/no exit code/holder death)
    // with keep:true respawns a fresh shell — never reruns the command.
    const lost = info.error || info.outcome === undefined || String(info.outcome) === 'undefined'
    if (this.keep && lost && !this.closed) {
      this.phase = 'recovering'
      this.registry.bus?.emit('lost', this.addr, { id: this.id, reason: info.error ? 'error' : 'signal' })
      this.#scheduleRespawn()
      return
    }
    this.phase = 'exited'
    const turn = this.#leaveWorking()
    this.broadcastText({ type: 'exit', session: this.id, addr: this.addr, outcome: String(info.outcome ?? info.error ?? '') })
    this.registry.bus?.emit('finished', this.addr, { id: this.id, outcome: info.outcome, turn })
    this.registry.audit({ op: 'exit', id: this.id, addr: this.addr, outcome: info.outcome })
  }

  #scheduleRespawn() {
    const delay = KEEP_BACKOFF[Math.min(this.keepAttempt, KEEP_BACKOFF.length - 1)]
    this.keepAttempt += 1
    clearTimeout(this.keepTimer)
    this.keepTimer = setTimeout(() => this.#respawn().catch(() => {}), delay)
    this.keepTimer.unref?.()
  }

  async #respawn() {
    if (this.closed) return
    const { shell, cwd } = this.meta
    try {
      if (this.worldKind === 'remote') {
        this.phase = 'exited'
        throw err(KIND.SPAWN_FAILED, 'keep-respawn is forbidden for a remote execution world')
      }
      const handle = await this.registry.ctx.subprocess.spawnTerminal({
        argv: [shell, '-i'], // fresh shell — never reruns the lost command
        cwd,
        env: this.env,
        rows: Math.min(Math.max(this.meta.rows || 24, 2), 512),
        cols: Math.min(Math.max(this.meta.cols || 80, 2), 512),
        terminalType: 'xterm-256color',
        shellActivity: true,
        graceMs: 1500,
      })
      this.adopt(handle)
      this.keepAttempt = 0
      this.registry.bus?.emit('restarted', this.addr, { id: this.id })
      this.broadcastText({ type: 'restarted', session: this.id, addr: this.addr })
      this.registry.audit({ op: 'respawn', id: this.id, addr: this.addr })
    } catch (e) {
      // stay 'recovering'; next loss or explicit close resolves it
      this.registry.bus?.emit('lost', this.addr, { id: this.id, reason: 'respawn-failed', detail: String(e?.message ?? e) })
      this.#scheduleRespawn()
    }
  }

  /** If status was 'working', bump turn. Returns current turn. */
  #leaveWorking() {
    if (this.status?.state === 'working') this.turn += 1
    return this.turn
  }

  /** Mirror-driven OSC 7501 poll: state changes emit status/turn events. */
  #pollState() {
    const st = this.mirror?.state?.()
    if (!st || st.seq === this._lastStateSeq) return
    this._lastStateSeq = st.seq
    const prev = this.status?.state
    this.status = st.root ?? null
    if (prev !== this.status?.state) {
      if (prev === 'working') this.turn += 1 // leaving working ends a turn
      this.registry.bus?.emit('status', this.addr, { id: this.id, status: this.status, turn: this.turn })
      if (this.status?.state && this.status.state !== 'working') {
        this.registry.bus?.emit('turn', this.addr, { id: this.id, turn: this.turn })
      }
    }
    if (st.title && st.title !== this.title) {
      this.title = st.title
      this.registry.bus?.emit('title', this.addr, { id: this.id, title: st.title })
    }
    this.registry.persist?.schedule(this.registry)
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

  /** push() — feed raw bytes into the replay buffer (persisted screens). */
  push(chunk) {
    this.remember(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
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

  /**
   * Input path. `source`:
   *   'human'     — interactive bytes; counted toward the draft, held while an
   *                 agent delivery is in flight (returns null when held).
   *   'agent'     — tool/automation bytes; serialized through the gate queue.
   *   'automatic' — terminal auto-replies (DA/CPR); bypass the gate entirely.
   */
  async writeInput(data, source = 'human') {
    if (this.exited) throw err(KIND.FINISHED, 'terminal exited')
    // pending placeholder: an input write is a wake — spawn the shell just as
    // the first attach would, then drop the bytes into the fresh PTY.
    if (!this.handle && this.pending) await this.registry.spawnPending(this)
    if (!this.handle) throw err(KIND.UNAVAILABLE, 'terminal not spawned yet (attach to wake)')
    if (source === 'automatic') {
      await this.handle.write(typeof data === 'string' ? data : decoder.decode(data))
      return
    }
    if (source === 'agent') {
      return hostSpan('dnt-gate', () => this.gate.submit(() => this.handle.write(typeof data === 'string' ? data : decoder.decode(data))))
    }
    return hostSpan('dnt-input', async () => {
      const ok = this.gate.humanInput(typeof data === 'string' ? Buffer.from(data, 'utf8') : data)
      if (ok === null) return { held: true }
      await this.handle.write(decoder.decode(ok))
      return undefined
    })
  }

  /**
   * Agent send semantics (term.send): blocked guard → bracketed paste + Enter
   * → gate queue. opts: {enter, force, cond, urgent}
   */
  async agentSend(text, { enter = true, force = false, cond = null, urgent = false } = {}) {
    if (this.exited) throw err(KIND.FINISHED, 'terminal exited')
    if (!this.handle && this.pending) await this.registry.spawnPending(this)
    if (!this.handle) throw err(KIND.UNAVAILABLE, 'terminal not spawned yet (attach to wake)')
    const st = this.status?.state
    if (st === 'blocked' && !force) throw err(KIND.BLOCKED, `terminal reports blocked${this.status.kind ? ` (${this.status.kind})` : ''}`)
    if (cond && st !== cond) throw err(KIND.STATUS_MISMATCH, `status is '${st ?? 'none'}', required '${cond}'`)
    // Adaptive bracketed paste: only wrap when the program enabled 2004 —
    // plain shells otherwise print the raw `200~`/`201~` markers as text.
    const paste = (this.mirror?.modes() ?? 0) & (1 << 3)
    const body = String(text).replace(/\r?\n/g, '\r')
    const payload = `${paste ? '\x1b[200~' : ''}${body}${paste ? '\x1b[201~' : ''}${enter ? '\r' : ''}`
    const r = await hostSpan('dnt-agent-send', () => this.gate.submit(() => this.handle.write(payload), { urgent }))
    this.registry.bus?.emit('message', this.addr, { id: this.id })
    return { ...(r ?? {}), turn: this.turn }
  }

  setLabels(set = {}, unset = []) {
    // `t`/`conv` are the ctx-ref anchors — reserved. They can only be grafted
    // through graftCtxAnchors (ws open/attach); free-label writes must not
    // silently drop a forge, so reserved keys are an explicit error.
    if ('t' in set || 'conv' in set || unset.includes('t') || unset.includes('conv')) {
      throw err(KIND.INVALID, "'t'/'conv' are reserved ctx anchors — set at create or pane attach only")
    }
    Object.assign(this.labels, set)
    for (const k of unset) delete this.labels[k]
    this.registry.bus?.emit('labels', this.addr, { id: this.id, labels: this.labels })
    this.registry.persist?.schedule(this.registry)
    return this.labels
  }

  /**
   * Bind ctx-ref anchors on attach. Existing bindings are authoritative —
   * a second pane never rewrites them; it adopts the session's anchors
   * (the ready frame echoes them back, so its copied ref resolves to this
   * session even after its own tid was regenerated on layout loss).
   */
  graftCtxAnchors({ t, conv }) {
    let changed = false
    for (const [k, v] of Object.entries({ t, conv })) {
      if (!v || this.labels[k]) continue // never rewrite — the session owns its anchors
      // Refuse to mint a stamp already bound to a DIFFERENT session —
      // otherwise bare-stamp resolution becomes ambiguous forever.
      if (this.registry?.sessions && [...this.registry.sessions.values()].some((r) => r !== this && r.labels?.[k] === v)) continue
      this.labels[k] = v
      changed = true
    }
    if (changed) {
      this.registry.bus?.emit('labels', this.addr, { id: this.id, labels: this.labels })
      this.registry.persist?.schedule(this.registry)
    }
    return this.labels
  }

  async resize(cols, rows) {
    cols = Math.floor(Number(cols)); rows = Math.floor(Number(rows))
    if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols < 2 || rows < 2 || cols > 512 || rows > 512) {
      throw err(KIND.INVALID, `resize needs finite cols/rows in [2,512], got ${cols}x${rows}`)
    }
    const prev = `${this.meta.cols}x${this.meta.rows}`
    this.meta = { ...this.meta, cols, rows }
    try {
      // ConPTY 会自己重画。镜像先 reflow 再吃那一遍，格子会被写两遍。
      if (resizeMode(process.platform) === 'box') this.mirror?.resizeBox(cols, rows)
      else this.mirror?.resize(cols, rows)
    } catch { /* best-effort */ }
    if (`${cols}x${rows}` !== prev) {
      this.registry.bus?.emit('size', this.addr, { id: this.id, cols, rows })
      this.registry.persist?.schedule(this.registry)
    }
    if (!this.exited) await this.handle?.resize(cols, rows).catch(() => {})
  }

  broadcastText(obj) {
    const send = this.registry.sendText
    for (const s of this.attached.size ? this.attached.keys() : this.sockets) send(s, obj)
  }

  screenText(n, source = 'visible') {
    try {
      return this.mirror?.screenText(n, source) ?? ''
    } catch {
      return ''
    }
  }

  /** 对齐帧要的当前屏：序号、尺寸、光标、可见区 dump。 */
  alignView() {
    let cols = this.meta?.cols ?? 80
    let rows = this.meta?.rows ?? 24
    let cursorX = 0
    let cursorY = 0
    try {
      cols = this.mirror?.cols?.() || cols
      rows = this.mirror?.rows?.() || rows
      cursorX = this.mirror?.cursorX?.() ?? 0
      cursorY = this.mirror?.cursorY?.() ?? 0
    } catch { /* mirror best-effort */ }
    return {
      seq: this.outSeq >>> 0,
      cols,
      rows,
      cursorX,
      cursorY,
      text: this.screenText(rows, 'visible'),
    }
  }

  async shutdown() {
    this.closed = true
    clearTimeout(this.keepTimer)
    for (const s of this.sockets) {
      try { s.destroy() } catch { /* already gone */ }
    }
    this.sockets.clear()
    this.mirror?.free()
    await this.handle?.terminate().catch(() => {})
  }
}
