// src/host/sessions.js
import { randomUUID } from "node:crypto";

// src/host/mirror.js
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
var here = dirname(fileURLToPath(import.meta.url));
var exports_ = null;
var memory = null;
var decoder = new TextDecoder("utf-8", { fatal: false });
function loadMirror() {
  if (exports_) return exports_;
  const path = join(here, "..", "lib", "dnt-core.wasm");
  const bytes = readFileSync(path);
  const instance = new WebAssembly.Instance(new WebAssembly.Module(bytes), {});
  exports_ = instance.exports;
  memory = exports_.memory;
  return exports_;
}
function memI32() {
  return new Int32Array(memory.buffer);
}
function memU8() {
  return new Uint8Array(memory.buffer);
}
var SOURCE = { visible: 0, recent: 1, detection: 2 };
var ScreenMirror = class {
  constructor(cols, rows, scrollback = 2e3) {
    const e = loadMirror();
    this.id = e.dnt_new(cols, rows, scrollback);
    this.e = e;
    this._lastStateSeq = -1;
    this._stateCache = null;
  }
  free() {
    if (this.id) this.e.dnt_free(this.id);
    this.id = 0;
  }
  write(bytes) {
    const e = this.e;
    const ptr = e.dnt_alloc(bytes.length);
    memU8().set(bytes, ptr);
    e.dnt_write(this.id, ptr, bytes.length);
    e.dnt_dealloc(ptr, bytes.length);
  }
  resize(cols, rows) {
    this.e.dnt_resize(this.id, cols, rows);
  }
  /**
   * Program-reported OSC 7501 state — "the core never guesses the screen".
   * Returns { seq, title, records, root } — root = the id-less record (or null).
   * Cached by state_seq so the per-chunk poll is nearly free.
   */
  state() {
    const e = this.e;
    const seq = e.dnt_state_seq?.(this.id) >>> 0;
    if (seq === this._lastStateSeq && this._stateCache) return this._stateCache;
    this._lastStateSeq = seq;
    const ptr = e.dnt_state_json?.(this.id);
    const len = e.dnt_state_len?.(this.id) ?? 0;
    let parsed = { seq, title: "", records: [] };
    if (ptr && len) {
      try {
        parsed = JSON.parse(decoder.decode(memU8().subarray(ptr, ptr + len)));
      } catch {
      }
    }
    const root = parsed.records.find((r) => r.id === "") ?? null;
    this._stateCache = { seq: parsed.seq ?? seq, title: parsed.title ?? "", records: parsed.records, root };
    return this._stateCache;
  }
  /**
   * Rendered text via the wasm dump ABI (no render() involved).
   * source: 'visible' live screen | 'recent' incl. scrollback | 'detection'
   * bottom-buffer live rows (status-detection snapshot).
   */
  dump(n = 50, source = "visible") {
    const e = this.e;
    const ptr = e.dnt_dump?.(this.id, SOURCE[source] ?? 0, n);
    const len = e.dnt_dump_len?.(this.id) ?? 0;
    if (!ptr || !len) return "";
    return decoder.decode(memU8().subarray(ptr, ptr + len));
  }
  /** Back-compat single-arg read; prefers dump when available. */
  screenText(n = 50, source = "visible") {
    if (this.e.dnt_dump) return this.dump(n, source);
    return this.#screenTextLegacy(n);
  }
  /** Legacy render-buffer reader — kept for wasm binaries without dnt_dump. */
  #screenTextLegacy(n = 50) {
    const e = this.e;
    const ptr = e.dnt_render(this.id);
    const len = e.dnt_render_len(this.id);
    if (!ptr || !len) return "";
    const buf = memI32();
    const textLen = e.dnt_render_text_len(this.id);
    const textPtr = e.dnt_render_text(this.id);
    const textAll = decoder.decode(memU8().subarray(textPtr, textPtr + textLen));
    const textBytes = memU8().subarray(textPtr, textPtr + textLen);
    const map = new Uint32Array(textBytes.length + 1);
    let js = 0;
    let b = 0;
    while (b < textBytes.length) {
      map[b] = js;
      const c = textBytes[b];
      if ((c & 192) === 128) {
        b += 1;
        continue;
      }
      if (c < 128) {
        js += 1;
        b += 1;
      } else if (c < 224) {
        js += 1;
        b += 2;
      } else if (c < 240) {
        js += 1;
        b += 3;
      } else {
        js += 2;
        b += 4;
      }
    }
    map[textBytes.length] = textAll.length;
    let i = (ptr >> 2) + 1;
    const rowsVisible = buf[i++];
    i += 4;
    i++;
    const rowCount = buf[i++];
    const lines = new Array(rowsVisible).fill("");
    for (let r = 0; r < rowCount; r++) {
      const y = buf[i++];
      i += 2;
      const runCount = buf[i++];
      i += 3;
      let line = "";
      for (let k = 0; k < runCount; k++) {
        const col = buf[i++];
        const byteOff = buf[i++];
        const byteLen = buf[i++];
        i += 3;
        const t = textAll.slice(map[byteOff], map[byteOff + byteLen]);
        line = line.padEnd(col, " ") + t;
      }
      if (y >= 0 && y < rowsVisible) lines[y] = line.replace(/\s+$/, "");
    }
    let end = lines.length;
    while (end > 0 && lines[end - 1] === "") end--;
    return lines.slice(Math.max(0, end - n), end).join("\n");
  }
};

// src/host/errors.js
var KIND = Object.freeze({
  NOT_FOUND: "not_found",
  // no such session/address/name
  BLOCKED: "blocked",
  // target reported blocked; send refused (use force)
  FINISHED: "finished",
  // terminal exited; operation needs a live one
  LIVE: "live",
  // operation requires a finished/inactive terminal
  UNAVAILABLE: "unavailable",
  // transiently not usable (recovering/attaching)
  SPAWN_FAILED: "spawn_failed",
  // backend refused to start the program
  CONFLICT: "conflict",
  // request contradicts current state
  STATUS_MISMATCH: "status_mismatch",
  // --if condition not met
  NAME_TAKEN: "name_taken",
  // requested name already bound
  NEEDS_TARGET: "needs_target",
  // ambiguous/unspecified target
  INCOMPATIBLE: "incompatible",
  // protocol/version/capability mismatch
  LIMIT: "limit",
  // resource cap reached (session count, body size)
  INVALID: "invalid"
  // malformed argument
});
function err(kind, message, extra) {
  const e = new Error(message);
  e.kind = kind;
  if (extra) Object.assign(e, extra);
  return e;
}

// src/host/gate.js
var PASTE_GAP_MS = 200;
var Gate = class {
  constructor({ notesQuietMs = 3e3, draftWaitMs = 6e4 } = {}) {
    this.notesQuietMs = notesQuietMs;
    this.draftWaitMs = draftWaitMs;
    this.draft = 0;
    this.lastHumanKey = 0;
    this.busy = false;
    this.held = [];
    this.queue = Promise.resolve();
  }
  /** Human input: returns bytes to write now, or '' while held. */
  humanInput(data) {
    this.#observe(data);
    if (this.busy) {
      this.held.push(data);
      return null;
    }
    return data;
  }
  /** Feed the draft estimator — mirrors hc's Gate::observe. */
  #observe(data) {
    const bytes = typeof data === "string" ? Buffer.from(data, "utf8") : data;
    let i = 0;
    this.lastHumanKey = Date.now();
    while (i < bytes.length) {
      const b = bytes[i];
      if (b === 27 && bytes[i + 1] === 91 && bytes[i + 2] === 50 && bytes[i + 3] === 48 && bytes[i + 4] === 48 && bytes[i + 5] === 126) {
        const end = findSeq(bytes, i + 6, "\x1B[201~");
        this.draft = Math.max(1, end < 0 ? this.draft + (bytes.length - i - 6) : 1);
        i = end < 0 ? bytes.length : end + 6;
        continue;
      }
      if (b === 13 || b === 3 || b === 21) this.draft = 0;
      else if (b === 127) this.draft = Math.max(0, this.draft - 1);
      else if (b === 27) {
        i = skipEscape(bytes, i);
        continue;
      } else if (b >= 32) this.draft += 1;
      i++;
    }
  }
  /**
   * Agent delivery: waits the draft window, then runs `deliver()` exclusively
   * (human bytes held meanwhile). `kind:'note'` additionally requires
   * notesQuietMs of human silence — a note never interrupts active typing.
   * Returns deliver() result.
   */
  async submit(deliver, { urgent = false, kind = "send" } = {}) {
    const run = this.queue.then(async () => {
      if (!urgent) await this.#waitWindow(kind);
      this.busy = true;
      try {
        return await deliver();
      } finally {
        this.busy = false;
        if (this.held.length) {
          const flush = this.held;
          this.held = [];
          this.flushHeld?.(flush);
        }
      }
    });
    this.queue = run.catch(() => {
    });
    return run;
  }
  /**
   * hc Gate::wait semantics:
   *   draft > 0  — hold until the human clears it (Enter/^C/^U) or
   *                draftWaitMs elapses since the last key; quiet alone does
   *                NOT release (the human may resume typing).
   *   draft == 0 — only PASTE_GAP after Enter/clear for sends; notes require
   *                notesQuietMs of silence on top.
   */
  async #waitWindow(kind) {
    for (; ; ) {
      const quietFor = Date.now() - this.lastHumanKey;
      if (this.draft === 0) {
        const need = kind === "note" ? this.notesQuietMs : PASTE_GAP_MS;
        if (quietFor >= need) return;
      } else if (quietFor >= this.draftWaitMs) {
        return;
      }
      await sleep(25);
    }
  }
  /** Persistable state (draft only — queues don't survive restarts). */
  snapshot() {
    return { draft: this.draft, lastHumanKey: this.lastHumanKey, notesQuietMs: this.notesQuietMs, draftWaitMs: this.draftWaitMs };
  }
  restore(s) {
    if (!s) return;
    this.draft = s.draft ?? 0;
    this.lastHumanKey = s.lastHumanKey ?? 0;
    if (s.notesQuietMs) this.notesQuietMs = s.notesQuietMs;
    if (s.draftWaitMs) this.draftWaitMs = s.draftWaitMs;
  }
};
function findSeq(buf, from, seq) {
  const needle = Buffer.from(seq, "latin1");
  return buf.indexOf(needle, from);
}
function skipEscape(buf, i) {
  if (buf[i + 1] === 91) {
    let j = i + 2;
    while (j < buf.length && !(buf[j] >= 64 && buf[j] <= 126)) j++;
    return Math.min(j + 1, buf.length);
  }
  if (buf[i + 1] === 79) return Math.min(i + 3, buf.length);
  return Math.min(i + 2, buf.length);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// src/host/sessions.js
var decoder2 = new TextDecoder("utf-8", { fatal: false });
var encoder = new TextEncoder();
var KEEP_BACKOFF = [1500, 3e3, 6e3, 12e3, 3e4, 6e4];
function agentEnv(rec, apiBase) {
  return {
    DNT_TERMINAL_ID: rec.addr,
    DNT_TERMINAL_SESSION: rec.id,
    DNT_API: apiBase,
    DNT_ENV: "1",
    TERM_PROGRAM: "dnt"
  };
}
var SessionRegistry = class {
  /**
   * @param {object} deps
   * @param {import('@deepseek-ai/cordis').Context} deps.ctx
   * @param {(event: object) => void} deps.audit
   * @param {import('./events.js').EventBus} deps.bus
   * @param {string} deps.apiBase — base URL agents use to reach the MCP plane
   */
  constructor({ ctx, audit, sendBinary, sendText, bus, apiBase = "", maxSessions = 16, replayBytes = 512 * 1024, idleTimeoutMs = 30 * 60 * 1e3 }) {
    this.ctx = ctx;
    this.audit = audit;
    this.sendBinary = sendBinary;
    this.sendText = sendText;
    this.bus = bus;
    this.apiBase = apiBase;
    this.maxSessions = maxSessions;
    this.replayBytes = replayBytes;
    this.idleTimeoutMs = idleTimeoutMs;
    this.sessions = /* @__PURE__ */ new Map();
    this.names = /* @__PURE__ */ new Map();
  }
  get(id) {
    return this.sessions.get(id);
  }
  /**
   * Resolve id | name | addr ('<lane>/<name|short6>') | bare short6 to a record.
   */
  resolve(ref) {
    if (!ref) return void 0;
    if (this.sessions.has(ref)) return this.sessions.get(ref);
    const slash = String(ref).indexOf("/");
    if (slash >= 0) ref = String(ref).slice(slash + 1);
    if (this.names.has(ref)) return this.sessions.get(this.names.get(ref));
    for (const rec of this.sessions.values()) {
      if (rec.id.startsWith(ref) && ref.length >= 4) return rec;
    }
    return void 0;
  }
  list() {
    return [...this.sessions.values()].map((s) => s.info());
  }
  count() {
    return this.sessions.size;
  }
  /** Children of a parent record (or addr). */
  childrenOf(ref) {
    const parent = typeof ref === "string" ? this.resolve(ref) : ref;
    if (!parent) return [];
    return [...this.sessions.values()].filter((s) => s.parent === parent.id);
  }
  /**
   * Spawn a local PTY session.
   * @param {object} spec - {sessionId, name, parent, keep, labels, shell, args, cwd, cols, rows, env, owner, title}
   */
  async create(spec) {
    if (this.sessions.size >= this.maxSessions) {
      throw err(KIND.LIMIT, "terminal limit reached");
    }
    if (spec.name) {
      if (this.names.has(spec.name)) throw err(KIND.NAME_TAKEN, `name '${spec.name}' already bound`);
    }
    const parentRec = spec.parent ? this.resolve(spec.parent) : void 0;
    if (spec.parent && !parentRec) throw err(KIND.NOT_FOUND, `no such parent '${spec.parent}'`);
    const id = randomUUID();
    const cwd = await this.resolveCwd(spec);
    const shell = spec.shell || (process.env.SHELL ?? "/bin/zsh");
    const argv = spec.args?.length ? [shell, ...spec.args] : [shell, "-i"];
    const record = new SessionRecord({
      id,
      lane: "local",
      handle: null,
      owner: spec.owner ?? spec.sessionId ?? "unknown",
      title: spec.title ?? shell.split("/").pop(),
      name: spec.name,
      parent: parentRec?.id,
      keep: !!spec.keep,
      labels: { ...spec.labels ?? {} },
      meta: { shell, cwd, argv },
      replayBytes: this.replayBytes,
      registry: this
    });
    record.env = { ...spec.env ?? {}, ...agentEnv(record, this.apiBase) };
    const handle = await this.ctx.subprocess.spawnTerminal({
      argv,
      cwd,
      env: record.env,
      rows: Math.min(Math.max(spec.rows || 24, 2), 512),
      cols: Math.min(Math.max(spec.cols || 80, 2), 512),
      terminalType: "xterm-256color",
      shellActivity: true,
      graceMs: 1500
    }).catch((e) => {
      throw err(KIND.SPAWN_FAILED, String(e?.message ?? e));
    });
    record.handle = handle;
    this.sessions.set(id, record);
    if (spec.name) this.names.set(spec.name, id);
    record.pipe();
    this.audit({ op: "create", id, addr: record.addr, lane: "local", shell, cwd, owner: record.owner, pid: handle.pid });
    this.bus?.emit("created", record.addr, { id, lane: record.lane, title: record.title, owner: record.owner, parent: parentRec?.addr });
    return record;
  }
  async resolveCwd(spec) {
    if (spec.cwd) return spec.cwd;
    try {
      const session = spec.sessionId ? this.ctx.sessions?.get?.(spec.sessionId) : void 0;
      if (session) return this.ctx.workingDirectory.get(session);
    } catch {
    }
    return process.env.HOME || process.cwd();
  }
  async close(id, reason = "close") {
    const rec = this.resolve(id) ?? this.sessions.get(id);
    if (!rec) return false;
    this.sessions.delete(rec.id);
    if (rec.name) this.names.delete(rec.name);
    for (const child of this.childrenOf(rec)) {
      await this.close(child.id, "parent-died");
    }
    await rec.shutdown();
    this.audit({ op: "close", id: rec.id, addr: rec.addr, reason });
    this.bus?.emit("removed", rec.addr, { id: rec.id, reason });
    return true;
  }
  /** Terminate every session (plugin unload). */
  async dispose() {
    const records = [...this.sessions.values()];
    this.sessions.clear();
    this.names.clear();
    await Promise.allSettled(records.map((r) => r.shutdown()));
  }
  /** Sweep sessions idle with no attached socket. */
  sweep() {
    const now = Date.now();
    for (const rec of this.sessions.values()) {
      if (rec.sockets.size === 0 && now - rec.lastDetach > this.idleTimeoutMs && !rec.keep) {
        this.close(rec.id, "idle-timeout").catch(() => {
        });
      }
    }
  }
};
var SessionRecord = class {
  constructor({ id, lane, handle, owner, title, name, parent, keep, labels, meta, replayBytes, registry }) {
    this.id = id;
    this.lane = lane;
    this.handle = handle;
    this.owner = owner;
    this.title = title;
    this.name = name ?? null;
    this.parent = parent ?? null;
    this.keep = !!keep;
    this.labels = labels ?? {};
    this.meta = meta;
    this.registry = registry;
    this.createdAt = Date.now();
    this.lastDetach = Date.now();
    this.exited = null;
    this.phase = "live";
    this.status = null;
    this.turn = 0;
    this.sockets = /* @__PURE__ */ new Set();
    this.replay = [];
    this.replayLen = 0;
    this.replayCap = replayBytes;
    this.keepAttempt = 0;
    this.keepTimer = null;
    this.gate = new Gate();
    this.gate.flushHeld = (chunks) => {
      if (!this.exited) this.handle?.write(Buffer.concat(chunks.map((c) => typeof c === "string" ? Buffer.from(c, "utf8") : c))).catch(() => {
      });
    };
    this.mirror = null;
    this._lastStateSeq = 0;
    try {
      loadMirror();
      this.mirror = new ScreenMirror(meta.cols ?? 80, meta.rows ?? 24);
    } catch {
    }
  }
  /** '<lane>/<name|short6>' — the single address across lanes. */
  get addr() {
    return `${this.lane}/${this.name ?? this.id.slice(0, 6)}`;
  }
  info() {
    return {
      id: this.id,
      addr: this.addr,
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
      meta: { ...this.meta, argv: void 0 }
      // argv may carry secrets — omit
    };
  }
  /** Adopt a (re)spawned handle — used by keep respawn. */
  adopt(handle) {
    this.handle = handle;
    this.exited = null;
    this.phase = "live";
    this.pipe();
  }
  pipe() {
    const send = this.registry.sendBinary;
    this.handle.output.on("data", (chunk) => {
      this.remember(chunk);
      try {
        this.mirror?.write(chunk);
        this.#pollState();
      } catch {
      }
      for (const s of this.sockets) send(s, chunk);
    });
    this.handle.output.on("end", () => {
      this.#onProgramEnd({ at: Date.now() });
    });
    this.handle.done.then((outcome) => {
      this.#onProgramEnd({ at: Date.now(), outcome });
    }).catch((e) => {
      this.#onProgramEnd({ at: Date.now(), error: String(e?.message ?? e) });
    });
  }
  /** Program end: exit code / explicit kill = terminal; loss may keep-respawn. */
  #onProgramEnd(info) {
    if (this.exited) return;
    this.exited = info;
    const lost = info.error || info.outcome === void 0 || String(info.outcome) === "undefined";
    if (this.keep && lost && !this.closed) {
      this.phase = "recovering";
      this.registry.bus?.emit("lost", this.addr, { id: this.id, reason: info.error ? "error" : "signal" });
      this.#scheduleRespawn();
      return;
    }
    this.phase = "exited";
    const turn = this.#leaveWorking();
    this.broadcastText({ type: "exit", session: this.id, addr: this.addr, outcome: String(info.outcome ?? info.error ?? "") });
    this.registry.bus?.emit("finished", this.addr, { id: this.id, outcome: info.outcome, turn });
    this.registry.audit({ op: "exit", id: this.id, addr: this.addr, outcome: info.outcome });
  }
  #scheduleRespawn() {
    const delay = KEEP_BACKOFF[Math.min(this.keepAttempt, KEEP_BACKOFF.length - 1)];
    this.keepAttempt += 1;
    clearTimeout(this.keepTimer);
    this.keepTimer = setTimeout(() => this.#respawn().catch(() => {
    }), delay);
    this.keepTimer.unref?.();
  }
  async #respawn() {
    if (this.closed) return;
    const { shell, cwd } = this.meta;
    try {
      const handle = await this.registry.ctx.subprocess.spawnTerminal({
        argv: [shell, "-i"],
        // fresh shell — never reruns the lost command
        cwd,
        env: this.env,
        rows: Math.min(Math.max(this.meta.rows || 24, 2), 512),
        cols: Math.min(Math.max(this.meta.cols || 80, 2), 512),
        terminalType: "xterm-256color",
        shellActivity: true,
        graceMs: 1500
      });
      this.adopt(handle);
      this.keepAttempt = 0;
      this.registry.bus?.emit("restarted", this.addr, { id: this.id });
      this.broadcastText({ type: "restarted", session: this.id, addr: this.addr });
      this.registry.audit({ op: "respawn", id: this.id, addr: this.addr });
    } catch (e) {
      this.registry.bus?.emit("lost", this.addr, { id: this.id, reason: "respawn-failed", detail: String(e?.message ?? e) });
      this.#scheduleRespawn();
    }
  }
  /** If status was 'working', bump turn. Returns current turn. */
  #leaveWorking() {
    if (this.status?.state === "working") this.turn += 1;
    return this.turn;
  }
  /** Mirror-driven OSC 7501 poll: state changes emit status/turn events. */
  #pollState() {
    const st = this.mirror?.state?.();
    if (!st || st.seq === this._lastStateSeq) return;
    this._lastStateSeq = st.seq;
    const prev = this.status?.state;
    this.status = st.root ?? null;
    if (prev !== this.status?.state) {
      if (prev === "working") this.turn += 1;
      this.registry.bus?.emit("status", this.addr, { id: this.id, status: this.status, turn: this.turn });
      if (this.status?.state && this.status.state !== "working") {
        this.registry.bus?.emit("turn", this.addr, { id: this.id, turn: this.turn });
      }
    }
    if (st.title && st.title !== this.title) {
      this.title = st.title;
      this.registry.bus?.emit("title", this.addr, { id: this.id, title: st.title });
    }
  }
  remember(chunk) {
    this.replay.push(chunk);
    this.replayLen += chunk.length;
    while (this.replayLen > this.replayCap && this.replay.length) {
      this.replayLen -= this.replay.shift().length;
    }
  }
  replayInto(socket, send) {
    for (const chunk of this.replay) send(socket, chunk);
  }
  attach(socket) {
    this.sockets.add(socket);
    socket.once("close", () => this.detach(socket));
  }
  detach(socket) {
    if (this.sockets.delete(socket)) {
      if (this.sockets.size === 0) this.lastDetach = Date.now();
    }
  }
  /**
   * Input path. `source`:
   *   'human'     — interactive bytes; counted toward the draft, held while an
   *                 agent delivery is in flight (returns null when held).
   *   'agent'     — tool/automation bytes; serialized through the gate queue.
   *   'automatic' — terminal auto-replies (DA/CPR); bypass the gate entirely.
   */
  async writeInput(data, source = "human") {
    if (this.exited) throw err(KIND.FINISHED, "terminal exited");
    if (source === "automatic") {
      await this.handle.write(typeof data === "string" ? data : decoder2.decode(data));
      return;
    }
    if (source === "agent") {
      return this.gate.submit(() => this.handle.write(typeof data === "string" ? data : decoder2.decode(data)));
    }
    const ok = this.gate.humanInput(typeof data === "string" ? Buffer.from(data, "utf8") : data);
    if (ok === null) return { held: true };
    await this.handle.write(decoder2.decode(ok));
  }
  /**
   * Agent send semantics (term.send): blocked guard → bracketed paste + Enter
   * → gate queue. opts: {enter, force, cond, urgent}
   */
  async agentSend(text, { enter = true, force = false, cond = null, urgent = false } = {}) {
    if (this.exited) throw err(KIND.FINISHED, "terminal exited");
    const st = this.status?.state;
    if (st === "blocked" && !force) throw err(KIND.BLOCKED, `terminal reports blocked${this.status.kind ? ` (${this.status.kind})` : ""}`);
    if (cond && st !== cond) throw err(KIND.STATUS_MISMATCH, `status is '${st ?? "none"}', required '${cond}'`);
    const payload = `\x1B[200~${String(text).replace(/\r?\n/g, "\r")}\x1B[201~${enter ? "\r" : ""}`;
    const r = await this.gate.submit(() => this.handle.write(payload), { urgent });
    this.registry.bus?.emit("message", this.addr, { id: this.id });
    return { ...r ?? {}, turn: this.turn };
  }
  setLabels(set = {}, unset = []) {
    Object.assign(this.labels, set);
    for (const k of unset) delete this.labels[k];
    this.registry.bus?.emit("labels", this.addr, { id: this.id, labels: this.labels });
    return this.labels;
  }
  async resize(cols, rows) {
    const prev = `${this.meta.cols}x${this.meta.rows}`;
    this.meta = { ...this.meta, cols, rows };
    try {
      this.mirror?.resize(cols, rows);
    } catch {
    }
    if (`${cols}x${rows}` !== prev) {
      this.registry.bus?.emit("size", this.addr, { id: this.id, cols, rows });
    }
    if (!this.exited) await this.handle.resize(cols, rows).catch(() => {
    });
  }
  broadcastText(obj) {
    const send = this.registry.sendText;
    for (const s of this.sockets) send(s, obj);
  }
  screenText(n, source = "visible") {
    try {
      return this.mirror?.screenText(n, source) ?? "";
    } catch {
      return "";
    }
  }
  async shutdown() {
    this.closed = true;
    clearTimeout(this.keepTimer);
    for (const s of this.sockets) {
      try {
        s.destroy();
      } catch {
      }
    }
    this.sockets.clear();
    this.mirror?.free();
    await this.handle?.terminate().catch(() => {
    });
  }
};
export {
  SessionRecord,
  SessionRegistry
};
