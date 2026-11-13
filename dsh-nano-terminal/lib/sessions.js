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
var ScreenMirror = class {
  constructor(cols, rows, scrollback = 2e3) {
    const e = loadMirror();
    this.id = e.dnt_new(cols, rows, scrollback);
    this.e = e;
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
  /** Last `n` rendered screen rows as joined text (trailing blanks trimmed). */
  screenText(n = 50) {
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

// src/host/sessions.js
var decoder2 = new TextDecoder("utf-8", { fatal: false });
var encoder = new TextEncoder();
var SessionRegistry = class {
  /**
   * @param {object} deps
   * @param {import('@deepseek-ai/cordis').Context} deps.ctx
   * @param {(event: object) => void} deps.audit
   * @param {number} deps.maxSessions
   * @param {number} deps.replayBytes
   * @param {number} deps.idleTimeoutMs
   */
  constructor({ ctx, audit, sendBinary, sendText, maxSessions = 16, replayBytes = 512 * 1024, idleTimeoutMs = 30 * 60 * 1e3 }) {
    this.ctx = ctx;
    this.audit = audit;
    this.sendBinary = sendBinary;
    this.sendText = sendText;
    this.maxSessions = maxSessions;
    this.replayBytes = replayBytes;
    this.idleTimeoutMs = idleTimeoutMs;
    this.sessions = /* @__PURE__ */ new Map();
  }
  get(id) {
    return this.sessions.get(id);
  }
  list() {
    return [...this.sessions.values()].map((s) => s.info());
  }
  count() {
    return this.sessions.size;
  }
  /**
   * Spawn a local PTY session.
   * @param {object} spec - {sessionId, shell, args, cwd, cols, rows, env, owner}
   */
  async create(spec) {
    if (this.sessions.size >= this.maxSessions) {
      throw Object.assign(new Error("terminal limit reached"), { code: "limit" });
    }
    const id = randomUUID();
    const cwd = await this.resolveCwd(spec);
    const shell = spec.shell || (process.env.SHELL ?? "/bin/zsh");
    const argv = spec.args?.length ? [shell, ...spec.args] : [shell, "-i"];
    const handle = await this.ctx.subprocess.spawnTerminal({
      argv,
      cwd,
      env: spec.env ?? {},
      rows: Math.min(Math.max(spec.rows || 24, 2), 512),
      cols: Math.min(Math.max(spec.cols || 80, 2), 512),
      terminalType: "xterm-256color",
      shellActivity: true,
      graceMs: 1500
    });
    const record = new SessionRecord({
      id,
      lane: "local",
      handle,
      owner: spec.owner ?? spec.sessionId ?? "unknown",
      title: spec.title ?? shell.split("/").pop(),
      meta: { shell, cwd, argv },
      replayBytes: this.replayBytes,
      registry: this
    });
    this.sessions.set(id, record);
    record.pipe();
    this.audit({ op: "create", id, lane: "local", shell, cwd, owner: record.owner, pid: handle.pid });
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
    const rec = this.sessions.get(id);
    if (!rec) return false;
    this.sessions.delete(id);
    await rec.shutdown();
    this.audit({ op: "close", id, reason });
    return true;
  }
  /** Terminate every session (plugin unload). */
  async dispose() {
    const records = [...this.sessions.values()];
    this.sessions.clear();
    await Promise.allSettled(records.map((r) => r.shutdown()));
  }
  /** Sweep sessions idle with no attached socket. */
  sweep() {
    const now = Date.now();
    for (const rec of this.sessions.values()) {
      if (rec.sockets.size === 0 && now - rec.lastDetach > this.idleTimeoutMs) {
        this.close(rec.id, "idle-timeout").catch(() => {
        });
      }
    }
  }
};
var SessionRecord = class {
  constructor({ id, lane, handle, owner, title, meta, replayBytes, registry }) {
    this.id = id;
    this.lane = lane;
    this.handle = handle;
    this.owner = owner;
    this.title = title;
    this.meta = meta;
    this.registry = registry;
    this.createdAt = Date.now();
    this.lastDetach = Date.now();
    this.exited = null;
    this.sockets = /* @__PURE__ */ new Set();
    this.replay = [];
    this.replayLen = 0;
    this.replayCap = replayBytes;
    this.mirror = null;
    try {
      loadMirror();
      this.mirror = new ScreenMirror(meta.cols ?? 80, meta.rows ?? 24);
    } catch {
    }
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
      meta: this.meta
    };
  }
  pipe() {
    const send = this.registry.sendBinary;
    this.handle.output.on("data", (chunk) => {
      this.remember(chunk);
      try {
        this.mirror?.write(chunk);
      } catch {
      }
      for (const s of this.sockets) send(s, chunk);
    });
    this.handle.output.on("end", () => {
      this.exited = { at: Date.now() };
      this.broadcastText({ type: "exit", session: this.id });
    });
    this.handle.done.then((outcome) => {
      this.exited = { at: Date.now(), outcome };
      this.broadcastText({ type: "exit", session: this.id, outcome: String(outcome?.code ?? outcome) });
    }).catch((err) => {
      this.exited = { at: Date.now(), error: String(err?.message ?? err) };
      this.broadcastText({ type: "exit", session: this.id, error: String(err?.message ?? err) });
    });
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
  async writeInput(data) {
    if (this.exited) return;
    await this.handle.write(typeof data === "string" ? data : decoder2.decode(data));
  }
  async resize(cols, rows) {
    this.meta = { ...this.meta, cols, rows };
    try {
      this.mirror?.resize(cols, rows);
    } catch {
    }
    if (!this.exited) await this.handle.resize(cols, rows).catch(() => {
    });
  }
  broadcastText(obj) {
    const send = this.registry.sendText;
    for (const s of this.sockets) send(s, obj);
  }
  screenText(n) {
    try {
      return this.mirror?.screenText(n) ?? "";
    } catch {
      return "";
    }
  }
  async shutdown() {
    for (const s of this.sockets) {
      try {
        s.destroy();
      } catch {
      }
    }
    this.sockets.clear();
    this.mirror?.free();
    await this.handle.terminate().catch(() => {
    });
  }
};
export {
  SessionRecord,
  SessionRegistry
};
