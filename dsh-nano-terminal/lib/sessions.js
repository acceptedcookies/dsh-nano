// src/host/sessions.js
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";

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
  /** 不重排。给会自己重画的 PTY（Windows ConPTY）用。 */
  resizeBox(cols, rows) {
    const fn = this.e.dnt_resize_box;
    if (fn) fn(this.id, cols, rows);
    else this.resize(cols, rows);
  }
  cols() {
    return this.e.dnt_cols?.(this.id) ?? 0;
  }
  rows() {
    return this.e.dnt_rows?.(this.id) ?? 0;
  }
  cursorX() {
    return this.e.dnt_cursor_x?.(this.id) ?? 0;
  }
  cursorY() {
    return this.e.dnt_cursor_y?.(this.id) ?? 0;
  }
  modes() {
    return this.e.dnt_modes?.(this.id) >>> 0;
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

// src/shared/align.js
var encoder = new TextEncoder();
var decoder2 = new TextDecoder("utf-8", { fatal: false });
function resizeMode(platform) {
  return platform === "win32" ? "box" : "reflow";
}

// src/shared/ctxref.js
function splitSlashArgs(rawInput) {
  const REF = /\[\s*DNT:[0-9a-f]{0,8}@[0-9a-f]{8}\s*\]|DNT:[0-9a-f]{0,8}@[0-9a-f]{8}/gi;
  const protected_ = [];
  const text = String(rawInput ?? "").trim().replace(REF, (m) => (protected_.push(m), `\0${protected_.length - 1}\0`));
  const [sub, ...rest0] = text.split(/\s+/);
  const unprotect = (t) => t.replace(/\x00(\d+)\x00/g, (_, i) => protected_[Number(i)]);
  return { sub, rest: rest0.map(unprotect) };
}
function parseCtxRef(input) {
  if (typeof input !== "string") return null;
  const m = input.trim().match(/^\[?\s*DNT:([0-9a-f]{8})?@([0-9a-f]{8})\s*\]?$/i);
  if (!m) return null;
  return { conv: m[1] ? m[1].toLowerCase() : null, term: m[2].toLowerCase() };
}
function bareTermStamp(input) {
  return /^[0-9a-f]{8}$/i.test(input ?? "") ? input.toLowerCase() : null;
}

// src/host/execution-world.js
function resolveExecutionWorld(ctx, sessionId) {
  const owner = typeof ctx.get === "function" ? ctx.get("workspaceExecution") : ctx.workspaceExecution;
  const binding = sessionId && owner && typeof owner.get === "function" ? owner.get(sessionId) : null;
  if (sessionId && binding == null) {
    const header = (typeof ctx.get === "function" ? ctx.get("sessions") : ctx.sessions)?.get?.(sessionId)?.header;
    if (header?.executionWorld === "unbound-remote") {
      return { kind: "remote", identity: String(sessionId), generation: "unbound", root: null, subprocess: null, signal: void 0, unbound: true };
    }
  }
  if (binding != null) {
    return {
      kind: "remote",
      identity: binding.identity ?? String(sessionId),
      generation: binding.generation,
      root: binding.root ?? null,
      subprocess: binding.subprocess,
      signal: binding.signal,
      unbound: !(binding.subprocess && binding.generation)
    };
  }
  return {
    kind: "local",
    identity: "local",
    generation: "local",
    root: null,
    subprocess: ctx.subprocess,
    signal: void 0
  };
}
var REMOTE_ENV_ALLOW = /* @__PURE__ */ new Set(["TERM", "LANG", "LC_ALL", "COLORTERM"]);
function remoteChildEnv(baseEnv) {
  const env = {};
  for (const key of REMOTE_ENV_ALLOW) {
    if (typeof baseEnv[key] === "string") env[key] = baseEnv[key];
  }
  return env;
}

// ../packages/dsh-interface/src/contracts/jsonOutcome.js
var FAILURE_KIND = Object.freeze({
  /** signal aborted; issued-before cancellation makes no server-side claim. */
  CANCELLED: "cancelled",
  /** Network/read-body failure; keep real httpStatus only when headers landed. */
  TRANSPORT: "transport",
  /** Non-2xx that is not a recognized sanctioned business failure; keep status. */
  HTTP: "http",
  /** Pre-request encode/binding failure OR illegal 2xx — never becomes ok:true. */
  PROTOCOL: "protocol",
  /** Recognized sanctioned business failure (incl. legal 2xx business failures). */
  DOMAIN: "domain"
});
var FAILURE_KINDS = Object.freeze(Object.values(FAILURE_KIND));

// ../packages/dsh-interface/src/contracts/observeEvent.js
var OBSERVE_SURFACES = Object.freeze(["http", "upgrade", "json", "mcp"]);
var HTTP_OUTCOMES = Object.freeze(["ok", "rejected", "method", "failed"]);
var UPGRADE_OUTCOMES = Object.freeze(["accepted", "rejected", "method"]);
var JSON_OUTCOMES = Object.freeze(["ok", ...FAILURE_KINDS]);
var MCP_OUTCOMES = Object.freeze(["ok", "error", "rejected"]);
var OBSERVE_FIELDS = Object.freeze([
  "surface",
  "id",
  "plugin",
  "outcome",
  "ms",
  "status",
  "kind"
]);
var REQUIRED = ["surface", "id", "plugin", "outcome", "ms"];
var OPTIONAL = /* @__PURE__ */ new Set(["status", "kind"]);
var OUTCOMES = {
  http: new Set(HTTP_OUTCOMES),
  upgrade: new Set(UPGRADE_OUTCOMES),
  json: new Set(JSON_OUTCOMES),
  mcp: new Set(MCP_OUTCOMES)
};
function fail(message) {
  throw new TypeError(`observe-event: ${message}`);
}
function assertObserveEvent(event) {
  if (event == null || typeof event !== "object" || Array.isArray(event)) {
    fail("event must be an object");
  }
  const keys = Object.keys(event);
  for (const key of keys) {
    if (!REQUIRED.includes(key) && !OPTIONAL.has(key)) fail(`unknown field ${key}`);
  }
  for (const key of REQUIRED) {
    if (!Object.prototype.hasOwnProperty.call(event, key)) fail(`missing ${key}`);
  }
  if (!OUTCOMES[event.surface]) fail(`unknown surface ${String(event.surface)}`);
  if (event.id !== null && (typeof event.id !== "string" || event.id === "")) {
    fail("id must be a non-empty string or null");
  }
  if (event.plugin !== null && (typeof event.plugin !== "string" || event.plugin === "")) {
    fail("plugin must be a non-empty string or null");
  }
  if (typeof event.outcome !== "string" || !OUTCOMES[event.surface].has(event.outcome)) {
    fail(`unknown outcome ${String(event.outcome)} for ${event.surface}`);
  }
  if (typeof event.ms !== "number" || !Number.isFinite(event.ms)) fail("ms must be a finite number");
  if (Object.prototype.hasOwnProperty.call(event, "status")) {
    if (typeof event.status !== "number" || !Number.isFinite(event.status)) fail("status must be a finite number");
  }
  if (event.surface === "mcp" && event.outcome === "error") {
    if (typeof event.kind !== "string" || event.kind === "") fail("mcp error requires kind");
  } else if (Object.prototype.hasOwnProperty.call(event, "kind")) {
    if (typeof event.kind !== "string" || event.kind === "") fail("kind must be a non-empty string");
  }
  return event;
}

// ../packages/dsh-performance-review/src/state.js
var CLIENT_KEY = Symbol.for("dsh.perfReview.v2");
var HOST_KEY = Symbol.for("dsh.perfReviewHost.v2");
var BUILD_STAMP = typeof __DNPR_BUILD__ === "string" ? __DNPR_BUILD__ : "dev";
var NAME_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
var CONTRACT_KEY_RE = /^[a-z0-9][a-z0-9.-]{0,63}$/;
var MAX_USAGE_KEYS = 32;
var RESERVOIR_CAP = 64;
function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}
function createSpanRow() {
  return { n: 0, window: [], reservoir: [] };
}
function createStructure() {
  return {
    rootErrors: 0,
    badNames: 0,
    overflowSpans: 0,
    overflowUsage: 0,
    observerErrors: 0,
    // A single observe() can fail silently (e.g. LoAF unsupported) while the
    // other two succeed. `observerErrors` only fires when ALL fail; this
    // counter makes a partial observer install visible (A5 / §10.4.6).
    observersMissing: 0,
    legacyCopies: 0,
    badShape: 0,
    unmappedKey: 0,
    missingBindingId: 0,
    oversize: 0,
    /** Protocol findings such as `{ level, code:'build-stamp', have, saw }`. */
    audits: []
  };
}
function pushAudit(structure, record) {
  if (!Array.isArray(structure.audits)) structure.audits = [];
  const dup = structure.audits.some((item) => item.level === record.level && item.code === record.code && item.have === record.have && item.saw === record.saw);
  if (!dup) structure.audits.push(record);
}
function installSingleton(global, key, legacyKey, stamp, create) {
  const existing = global[key];
  if (existing == null) {
    const created = create();
    created._build = stamp;
    global[key] = created;
    if (legacyKey != null && global[legacyKey] != null) {
      const structure = created._state?.().structure;
      if (structure != null) structure.legacyCopies += 1;
    }
    return created;
  }
  if (existing._build !== stamp) {
    const structure = existing._state?.().structure;
    if (structure != null) {
      pushAudit(structure, {
        level: "audit",
        code: "build-stamp",
        have: existing._build ?? null,
        saw: stamp
      });
    }
  }
  return existing;
}
var NANO_PKG_PREFIX = ["dsh", "nano"].join("-") + "-";
function roundMs(value) {
  return value == null ? null : Math.round(value * 10) / 10;
}

// ../packages/dsh-performance-review/src/host.js
var WINDOW_SAMPLE_CAP = 512;
var EVENT_CAP = 32;
var isPromiseLike = (value) => value !== null && typeof value === "object" && typeof value.then === "function";
function spanStats(span) {
  const reservoir = span.reservoir ?? [];
  return {
    n: span.n,
    p50: roundMs(percentile(reservoir, 0.5)),
    p95: roundMs(percentile(reservoir, 0.95)),
    max: roundMs(reservoir.length === 0 ? null : Math.max(...reservoir)),
    errors: span.errors ?? 0,
    lastMs: span.lastMs ?? null,
    lastAt: span.lastAt ?? null,
    lastErrorAt: span.lastErrorAt ?? null
  };
}
function hostSnapshot(state) {
  const plugins = {};
  for (const [pluginId, row] of state.plugins) {
    const spans = {};
    for (const [name, span] of row.spans) {
      spans[name] = {
        n: span.n,
        samples: [...span.reservoir],
        windowN: span.window.length,
        windowSamples: [...span.window],
        stats: spanStats(span),
        events: [...span.events ?? []]
      };
    }
    const counts = {};
    if (row.counts instanceof Map) {
      for (const [name, n] of row.counts) counts[name] = n;
    }
    plugins[pluginId] = { version: row.version ?? null, spans, counts };
  }
  return {
    version: 2,
    enabled: state.enabled === true,
    contributors: state.contributors.map((item) => ({ ...item })),
    sinceStart: state.sinceStart,
    epoch: state.epoch,
    seq: state.seq,
    cursor: state.cursor,
    writtenAt: state.sinceStart,
    plugins,
    structure: { ...state.structure, audits: [...state.structure.audits ?? []] }
  };
}
function parseCursor(since, epoch) {
  if (typeof since === "number") {
    if (!Number.isInteger(since) || since < 0) return { error: true };
    return { epoch, seq: since };
  }
  if (typeof since === "string") {
    const dot = since.lastIndexOf(".");
    if (dot <= 0) return { error: true };
    const ep = since.slice(0, dot);
    const seq = Number(since.slice(dot + 1));
    if (ep.length === 0 || !Number.isInteger(seq) || seq < 0) return { error: true };
    return { epoch: ep, seq };
  }
  if (since !== null && typeof since === "object" && !Array.isArray(since)) {
    const seq = since.seq;
    if (since.epoch == null || !Number.isInteger(seq) || seq < 0) return { error: true };
    return { epoch: String(since.epoch), seq };
  }
  return { error: true };
}
function collectRows(state, predicate) {
  const rows = [];
  const truncated = [];
  for (const [pluginId, row] of state.plugins) {
    for (const [name, span] of row.spans) {
      const minKept = span.minKeptSeq;
      if (predicate && minKept != null) {
        const floor = predicate.seq;
        if (floor + 1 < minKept) {
          truncated.push({ pluginId, name, lost: minKept - floor - 1 });
        }
      } else if (!predicate && (span.lost ?? 0) > 0) {
        truncated.push({ pluginId, name, lost: span.lost });
      }
      for (const event of span.log ?? []) {
        if (predicate && !(event.seq > predicate.seq)) continue;
        rows.push({
          seq: event.seq,
          pluginId,
          name,
          ms: event.ms,
          err: event.err === true,
          at: event.at
        });
      }
    }
    for (const [name, bucket] of row.contract ?? []) {
      for (const event of bucket.log ?? []) {
        if (predicate && !(event.seq > predicate.seq)) continue;
        rows.push({
          seq: event.seq,
          pluginId,
          name,
          kind: "contract",
          outcome: event.outcome,
          ms: event.ms
        });
      }
    }
  }
  rows.sort((a, b) => a.seq - b.seq);
  return { rows, truncated };
}
function createPerfReviewHost(env = {}) {
  const processRef = env.process ?? globalThis.process;
  const epoch = env.epoch != null ? String(env.epoch) : Math.floor(Math.random() * 1e9).toString(36);
  const state = {
    enabled: env.forceEnabled !== void 0 ? env.forceEnabled === true : null,
    plugins: /* @__PURE__ */ new Map(),
    contributors: [],
    contributorKeys: /* @__PURE__ */ new Set(),
    sinceStart: (/* @__PURE__ */ new Date()).toISOString(),
    epoch,
    seq: 0,
    cursor: 0,
    structure: createStructure(),
    _build: env.build ?? BUILD_STAMP
  };
  const isEnabled = () => {
    if (state.enabled === null) {
      state.enabled = env.forceEnabled !== void 0 ? env.forceEnabled === true : processRef?.env?.DSH_PERF_REVIEW === "1";
    }
    return state.enabled === true;
  };
  const recordSpan = (row, name, t0, t1, err2) => {
    if (!isEnabled()) return;
    let span = row.spans.get(name);
    if (span === void 0) {
      span = createSpanRow();
      span.errors = 0;
      span.events = [];
      span.log = [];
      span.lost = 0;
      span.minKeptSeq = null;
      row.spans.set(name, span);
    }
    span.n += 1;
    const ms = t1 - t0;
    const at = (/* @__PURE__ */ new Date()).toISOString();
    const seq = state.seq + 1;
    state.seq = seq;
    span.lastMs = ms;
    span.lastAt = at;
    if (err2) {
      span.errors += 1;
      span.lastErrorAt = at;
    }
    span.window.push(ms);
    while (span.window.length > WINDOW_SAMPLE_CAP) span.window.shift();
    if (span.reservoir.length < RESERVOIR_CAP) span.reservoir.push(ms);
    else {
      const slot = Math.floor(Math.random() * span.n);
      if (slot < RESERVOIR_CAP) span.reservoir[slot] = ms;
    }
    const rounded = Math.round(ms * 10) / 10;
    span.events.push({ ms: rounded, at, err: err2 === true, seq });
    while (span.events.length > EVENT_CAP) span.events.shift();
    span.log.push({ seq, ms, err: err2 === true, at });
    while (span.log.length > WINDOW_SAMPLE_CAP) {
      span.log.shift();
      span.lost += 1;
      span.minKeptSeq = span.log[0]?.seq ?? null;
    }
  };
  const hostJoin = (pluginId, impl = {}) => {
    let row = state.plugins.get(pluginId);
    if (row === void 0) {
      row = { version: impl.version ?? null, spans: /* @__PURE__ */ new Map(), counts: /* @__PURE__ */ new Map() };
      state.plugins.set(pluginId, row);
    }
    if (!(row.counts instanceof Map)) row.counts = /* @__PURE__ */ new Map();
    const build = impl.build ?? BUILD_STAMP;
    const key = `${pluginId}@${build}`;
    if (!state.contributorKeys.has(key)) {
      state.contributorKeys.add(key);
      state.contributors.push({ pluginId, build });
    }
    const clock = env.performance ?? globalThis.performance;
    const now = () => clock.now();
    return {
      /**
       * hostSpan(name, fn). No trace context is stored (T-O-PRE1116-12).
       * A name that fails NAME_RE still runs `fn`, increments
       * `structure.unmappedKey`, and is not recorded.
       */
      hostSpan(name, fn) {
        if (typeof name !== "string" || !NAME_RE.test(name)) {
          state.structure.unmappedKey += 1;
          return fn();
        }
        const t0 = now();
        let result;
        try {
          result = fn();
        } catch (error) {
          recordSpan(row, name, t0, now(), true);
          throw error;
        }
        if (isPromiseLike(result)) {
          return result.then(
            (value) => {
              recordSpan(row, name, t0, now(), false);
              return value;
            },
            (error) => {
              recordSpan(row, name, t0, now(), true);
              throw error;
            }
          );
        }
        recordSpan(row, name, t0, now(), false);
        return result;
      },
      count(name, n = 1) {
        if (!NAME_RE.test(name) || !isEnabled()) return;
        if (!(row.counts instanceof Map)) row.counts = /* @__PURE__ */ new Map();
        if (!row.counts.has(name) && row.counts.size >= MAX_USAGE_KEYS) return;
        row.counts.set(name, (row.counts.get(name) ?? 0) + n);
      },
      snapshot: () => {
        isEnabled();
        return hostSnapshot(state);
      },
      read: (query) => read(query)
    };
  };
  const read = (query = {}) => {
    const seq = state.seq;
    const base = {
      epoch: state.epoch,
      seq,
      cursor: state.cursor,
      since: null,
      next: `${state.epoch}.${seq}`
    };
    if (query != null && query.mode !== void 0) {
      return { status: 400, error: "mode", basis: null, rows: [], truncated: [], ...base };
    }
    if (query == null || query.since === void 0) {
      const { rows: rows2, truncated: truncated2 } = collectRows(state, null);
      return { status: 200, basis: "cumulative", rows: rows2, truncated: truncated2, ...base };
    }
    base.since = typeof query.since === "number" ? query.since : String(query.since);
    const parsed = parseCursor(query.since, state.epoch);
    if (parsed.error) {
      return { status: 400, error: "cursor", basis: null, rows: [], truncated: [], ...base };
    }
    if (parsed.epoch !== state.epoch) {
      const { rows: rows2 } = collectRows(state, null);
      return { status: 200, basis: "cumulative", rows: rows2, truncated: ["epoch"], ...base };
    }
    const { rows, truncated } = collectRows(state, { seq: parsed.seq });
    return { status: 200, basis: "window", rows, truncated, ...base };
  };
  const observe = (event) => {
    if (!isEnabled()) return;
    if (event == null || typeof event !== "object" || Array.isArray(event)) {
      state.structure.badShape += 1;
      return;
    }
    let admitted;
    try {
      admitted = assertObserveEvent(event);
    } catch {
      state.structure.badShape += 1;
      return;
    }
    if (admitted.id == null || admitted.id === "") {
      state.structure.missingBindingId += 1;
      return;
    }
    if (!CONTRACT_KEY_RE.test(admitted.id) || typeof admitted.plugin !== "string" || admitted.plugin === "") {
      state.structure.badShape += 1;
      return;
    }
    let row = state.plugins.get(admitted.plugin);
    if (row === void 0) {
      row = { version: null, spans: /* @__PURE__ */ new Map(), counts: /* @__PURE__ */ new Map(), contract: /* @__PURE__ */ new Map() };
      state.plugins.set(admitted.plugin, row);
    }
    if (!(row.contract instanceof Map)) row.contract = /* @__PURE__ */ new Map();
    state.seq += 1;
    let bucket = row.contract.get(admitted.id);
    if (bucket === void 0) {
      bucket = { n: 0, window: 0, outcomes: {}, log: [] };
      row.contract.set(admitted.id, bucket);
    }
    bucket.n += 1;
    bucket.window += 1;
    bucket.outcomes[admitted.outcome] = (bucket.outcomes[admitted.outcome] ?? 0) + 1;
    bucket.log.push({ seq: state.seq, outcome: admitted.outcome, ms: admitted.ms });
    if (bucket.log.length > WINDOW_SAMPLE_CAP) {
      bucket.log.shift();
      bucket.lost = (bucket.lost ?? 0) + 1;
    }
  };
  return {
    hostJoin,
    read,
    observe,
    snapshot: () => {
      isEnabled();
      return hostSnapshot(state);
    },
    _state: () => state,
    _build: state._build
  };
}
function ensurePerfReviewHost(env = {}) {
  const global = env.global ?? globalThis;
  const stamp = env.build ?? BUILD_STAMP;
  return installSingleton(global, HOST_KEY, "__perfReviewHost", stamp, () => createPerfReviewHost(env));
}

// src/host/sessions.js
var HOST_PLUGIN = "dsh-nano-terminal";
var _hostApi = null;
function hostPerf() {
  if (_hostApi === null) {
    const host = ensurePerfReviewHost();
    _hostApi = typeof host.hostJoin === "function" ? host.hostJoin(HOST_PLUGIN) : null;
  }
  return _hostApi;
}
var hostSpan = (name, fn) => {
  const api = hostPerf();
  return api?.hostSpan ? api.hostSpan(name, fn) : fn();
};
var hostCount = (name, n = 1) => {
  try {
    hostPerf()?.count?.(name, n);
  } catch {
  }
};
var decoder3 = new TextDecoder("utf-8", { fatal: false });
var encoder2 = new TextEncoder();
var KEEP_BACKOFF = [1500, 3e3, 6e3, 12e3, 3e4, 6e4];
function defaultShell() {
  if (process.platform === "win32") return process.env.COMSPEC ?? "cmd.exe";
  return process.env.SHELL ?? "/bin/zsh";
}
function agentEnv(rec, apiBase) {
  return {
    DNT_TERMINAL_ID: rec.addr,
    DNT_TERMINAL_SESSION: rec.id,
    DNT_API: apiBase,
    DNT_ENV: "1",
    TERM_PROGRAM: "dnt",
    // 交互式终端不该继承宿主进程的 NO_COLOR（那是给非交互 CLI 的）。按
    // no-color.org 的规范，空串等于未设置，TUI 才会正常上色。
    NO_COLOR: "",
    // 声明真彩，避免 TUI 退回 16 色或直接关色。
    COLORTERM: "truecolor"
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
  constructor({ ctx, audit, sendBinary, sendText, bus, apiBase = "", persist = null, maxSessions = 16, replayBytes = 512 * 1024, idleTimeoutMs = 30 * 60 * 1e3 }) {
    this.ctx = ctx;
    this.audit = audit;
    this.sendBinary = sendBinary;
    this.sendText = sendText;
    this.bus = bus;
    this.apiBase = apiBase;
    this.persist = persist;
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
   * Resolve id | name | addr ('<lane>/<name|short6>') | bare short6 |
   * ctx ref ('[ DNT:{conv8}@{term8} ]') | bare 8-hex term stamp to a record.
   * A ctx ref matches the session whose `t` label is the term stamp; a conv
   * stamp additionally requires the `conv` label to agree.
   */
  resolve(ref) {
    if (!ref) return void 0;
    if (this.sessions.has(ref)) return this.sessions.get(ref);
    const ctx = parseCtxRef(ref);
    if (ctx) return this.#resolveCtx(ctx);
    const slash = String(ref).indexOf("/");
    if (slash >= 0) ref = String(ref).slice(slash + 1);
    if (this.names.has(ref)) return this.sessions.get(this.names.get(ref));
    const bare = bareTermStamp(ref);
    if (bare) {
      const hit = this.#resolveCtx({ conv: null, term: bare });
      if (hit) {
        const prefixHit = [...this.sessions.values()].find((r) => r.id.startsWith(ref) && r !== hit);
        if (prefixHit) throw err(KIND.NEEDS_TARGET, `'${ref}' names both a term stamp and session ids \u2014 resolve by addr or full id`);
        return hit;
      }
    }
    for (const rec of this.sessions.values()) {
      if (rec.id.startsWith(ref) && ref.length >= 4) return rec;
    }
    return void 0;
  }
  /** All records matching a ctx pair — ambiguity must surface, not first-match. */
  #ctxHits({ conv, term }) {
    const hits = [];
    for (const rec of this.sessions.values()) {
      if (rec.labels?.t !== term) continue;
      if (conv && rec.labels?.conv !== conv) continue;
      hits.push(rec);
    }
    return hits;
  }
  #resolveCtx({ conv, term }) {
    const hits = this.#ctxHits({ conv, term });
    if (hits.length > 1) {
      throw err(KIND.NEEDS_TARGET, `term stamp '${term}' is ambiguous \u2014 ${hits.map((r) => r.addr).join(", ")}; resolve by addr or id`);
    }
    return hits[0];
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
      if (parseCtxRef(spec.name) || bareTermStamp(spec.name)) {
        throw err(KIND.INVALID, `name '${spec.name}' collides with ctx-ref grammar`);
      }
    }
    const parentRec = spec.parent ? this.resolve(spec.parent) : void 0;
    if (spec.parent && !parentRec) throw err(KIND.NOT_FOUND, `no such parent '${spec.parent}'`);
    const mintT = spec.labels?.t;
    if (mintT) {
      if (!/^[0-9a-f]{8}$/.test(mintT)) throw err(KIND.INVALID, `label 't' must be a lowercase 8-hex stamp, got '${mintT}'`);
      const clash = [...this.sessions.values()].find((r) => r.labels?.t === mintT);
      if (clash) throw err(KIND.CONFLICT, `term stamp '${mintT}' already bound to ${clash.addr}`);
    }
    if (spec.labels?.conv && !/^[0-9a-f]{8}$/.test(spec.labels.conv)) {
      throw err(KIND.INVALID, `label 'conv' must be a lowercase 8-hex stamp, got '${spec.labels.conv}'`);
    }
    const id = randomUUID();
    const cwd = await this.resolveCwd(spec);
    const shell = spec.shell || defaultShell();
    const argv = spec.args?.length ? [shell, ...spec.args] : [shell, ...process.platform === "win32" ? [] : ["-i"]];
    const record = new SessionRecord({
      id,
      lane: "local",
      handle: null,
      owner: spec.owner ?? spec.sessionId ?? "unknown",
      title: spec.title ?? shell.split(/[\\/]/).pop(),
      name: spec.name,
      parent: parentRec?.id,
      keep: !!spec.keep,
      labels: { ...spec.labels ?? {} },
      // cols/rows 必须进 meta：镜像按 meta 建，缺了就固定成 80×24，
      // 而 PTY 是按 open 消息里的尺寸起的，两边会错开。
      meta: {
        shell,
        cwd,
        argv,
        cols: Math.min(Math.max(spec.cols || 80, 2), 512),
        rows: Math.min(Math.max(spec.rows || 24, 2), 512)
      },
      replayBytes: this.replayBytes,
      registry: this
    });
    const world = resolveExecutionWorld(this.ctx, spec.sessionId);
    if (world.kind === "remote" && (!world.subprocess || !world.generation || world.unbound || !world.root || world.signal?.aborted)) {
      throw err(KIND.SPAWN_FAILED, "remote execution binding is unavailable; refusing local spawn");
    }
    record.generation = world.generation;
    record.worldKind = world.kind;
    record.remoteIdentity = world.kind === "remote" ? world.identity : null;
    if (world.kind === "remote") record.keep = false;
    const envBase = { ...spec.env ?? {}, ...agentEnv(record, this.apiBase) };
    record.env = world.kind === "remote" ? remoteChildEnv(envBase) : envBase;
    const subprocess = world.subprocess ?? this.ctx.subprocess;
    const handle = await hostSpan("dnt-spawn", () => subprocess.spawnTerminal({
      argv,
      cwd: world.root ?? cwd,
      env: record.env,
      /* The binding's own abort signal retires this handle: a revoked or
       * expired remote scope terminates its own terminal, nothing else. */
      signal: world.signal,
      rows: Math.min(Math.max(spec.rows || 24, 2), 512),
      cols: Math.min(Math.max(spec.cols || 80, 2), 512),
      terminalType: "xterm-256color",
      shellActivity: true,
      graceMs: 1500
    })).catch((e) => {
      throw err(KIND.SPAWN_FAILED, String(e?.message ?? e));
    });
    record.handle = handle;
    this.sessions.set(id, record);
    if (spec.name) this.names.set(spec.name, id);
    record.pipe();
    this.audit({ op: "create", id, addr: record.addr, lane: "local", shell, cwd, owner: record.owner, pid: handle.pid });
    this.bus?.emit("created", record.addr, { id, lane: record.lane, title: record.title, owner: record.owner, parent: parentRec?.addr });
    this.persist?.schedule(this);
    return record;
  }
  /**
   * Restore persisted terminals as placeholders (no process; a fresh shell
   * spawns on first attach and the saved screen tail replays above it —
   * the program itself is NEVER rerun, same rule as `keep`).
   */
  restoreSaved() {
    const saved = this.persist?.load?.() ?? [];
    for (const t of saved) {
      if (this.sessions.has(t.id)) continue;
      try {
        const rec = new SessionRecord({
          id: t.id,
          lane: t.lane ?? "local",
          handle: null,
          owner: t.owner ?? "restored",
          title: t.title ?? "restored",
          name: t.name,
          parent: null,
          // parent addr resolves lazily — order-independent
          keep: !!t.keep,
          labels: t.labels ?? {},
          meta: t.meta ?? {},
          replayBytes: this.replayBytes,
          registry: this
        });
        rec.parent = t.parent ? this.resolve(t.parent)?.id ?? null : null;
        rec.worldKind = t.worldKind ?? "local";
        rec.remoteIdentity = t.remoteIdentity ?? null;
        rec.generation = t.generation ?? "local";
        rec.preservedScreen = this.persist.screenFor(t.id);
        if (rec.worldKind === "remote") {
          rec.pending = false;
          rec.phase = "exited";
          rec.exited = { code: null, reason: "remote-binding-ended" };
          rec.keep = false;
          if (rec.preservedScreen?.length) {
            rec.push(rec.preservedScreen);
            rec.mirror?.write(rec.preservedScreen);
          }
        } else {
          rec.pending = true;
          rec.phase = "live";
        }
        rec.env = agentEnv(rec, this.apiBase);
        rec.gate.restore(t.gate);
        this.sessions.set(t.id, rec);
        if (t.name && !this.names.has(t.name) && !parseCtxRef(t.name) && !bareTermStamp(t.name)) {
          this.names.set(t.name, t.id);
        }
        this.bus?.emit("created", rec.addr, { id: rec.id, lane: rec.lane, title: rec.title, restored: true });
      } catch {
      }
    }
  }
  /**
   * First attach to a placeholder spawns the fresh shell and replays the
   * preserved screen above it. Idempotent AND race-safe: concurrent wakes
   * share one spawn promise; a failed spawn re-arms the placeholder so the
   * next attach retries instead of bricking the session.
   */
  async spawnPending(rec) {
    if (!rec.pending || rec.worldKind === "remote") return;
    if (rec.pendingSpawn) return rec.pendingSpawn;
    rec.pendingSpawn = this.#spawnPendingOnce(rec);
    try {
      return await rec.pendingSpawn;
    } finally {
      rec.pendingSpawn = null;
    }
  }
  async #spawnPendingOnce(rec) {
    rec.pending = false;
    const meta = rec.meta ?? {};
    const shell = meta.shell || defaultShell();
    const argv = meta.argv?.length ? meta.argv : [shell, ...process.platform === "win32" ? [] : ["-i"]];
    const handle = await hostSpan("dnt-spawn", () => this.ctx.subprocess.spawnTerminal({
      argv,
      cwd: meta.cwd ?? homedir(),
      env: rec.env,
      rows: Math.min(Math.max(meta.rows || 24, 2), 512),
      cols: Math.min(Math.max(meta.cols || 80, 2), 512),
      terminalType: "xterm-256color",
      shellActivity: true,
      graceMs: 1500
    })).catch((e) => {
      rec.pending = true;
      throw err(KIND.SPAWN_FAILED, String(e?.message ?? e));
    });
    rec.handle = handle;
    rec.pipe();
    if (rec.preservedScreen?.length) {
      rec.push(rec.preservedScreen);
      rec.mirror?.write(rec.preservedScreen);
    }
    this.audit({ op: "respawn-on-attach", id: rec.id, addr: rec.addr });
    this.bus?.emit("restarted", rec.addr, { id: rec.id, restored: true });
  }
  async resolveCwd(spec) {
    if (spec.cwd) return spec.cwd;
    try {
      const session = spec.sessionId ? this.ctx.sessions?.get?.(spec.sessionId) : void 0;
      if (session) return this.ctx.workingDirectory.get(session);
    } catch {
    }
    return process.env.HOME || homedir() || process.cwd();
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
    this.persist?.schedule(this);
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
    this.attached = /* @__PURE__ */ new Map();
    this.replay = [];
    this.replayLen = 0;
    this.replayCap = replayBytes;
    this.outSeq = 0;
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
    const { conv, t } = this.labels ?? {};
    return {
      id: this.id,
      addr: this.addr,
      // `[ DNT:{conv8}@{term8} ]` — or `DNT:@{term8}` when only `t` is bound;
      // either form resolves through resolve().
      ctx: t ? `DNT:${conv ?? ""}@${t}` : null,
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
  /**
   * Busy = a foreground program is running or the program reported
   * working/blocked via OSC 7501. Drives the UI close-confirm and the
   * `busy` field on list/stats/sessions — honest, never guessed: shell
   * idleness comes from the backend's own foreground inspection.
   */
  async isBusy() {
    const st = this.status?.state;
    if (st === "working" || st === "blocked") return true;
    if (!this.handle) return false;
    const fg = await this.handle.inspectForeground?.().catch(() => void 0);
    if (!fg || fg.processGroupId == null) return false;
    return fg.processGroupId !== this.handle.pid;
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
      hostSpan("dnt-pipe-broadcast", () => {
        this.remember(chunk);
        try {
          this.mirror?.write(chunk);
          this.#pollState();
        } catch {
        }
        this.outSeq = this.outSeq + 1 >>> 0;
        const seq = this.outSeq;
        for (const [s, att] of this.attached) {
          if (att) att.data(chunk, seq);
          else send(s, chunk);
        }
      });
      hostCount("dnt-out-bytes", chunk.length);
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
      if (this.worldKind === "remote") {
        this.phase = "exited";
        throw err(KIND.SPAWN_FAILED, "keep-respawn is forbidden for a remote execution world");
      }
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
    this.registry.persist?.schedule(this.registry);
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
  /** push() — feed raw bytes into the replay buffer (persisted screens). */
  push(chunk) {
    this.remember(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
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
    if (!this.handle && this.pending) await this.registry.spawnPending(this);
    if (!this.handle) throw err(KIND.UNAVAILABLE, "terminal not spawned yet (attach to wake)");
    if (source === "automatic") {
      await this.handle.write(typeof data === "string" ? data : decoder3.decode(data));
      return;
    }
    if (source === "agent") {
      return hostSpan("dnt-gate", () => this.gate.submit(() => this.handle.write(typeof data === "string" ? data : decoder3.decode(data))));
    }
    return hostSpan("dnt-input", async () => {
      const ok = this.gate.humanInput(typeof data === "string" ? Buffer.from(data, "utf8") : data);
      if (ok === null) return { held: true };
      await this.handle.write(decoder3.decode(ok));
      return void 0;
    });
  }
  /**
   * Agent send semantics (term.send): blocked guard → bracketed paste + Enter
   * → gate queue. opts: {enter, force, cond, urgent}
   */
  async agentSend(text, { enter = true, force = false, cond = null, urgent = false } = {}) {
    if (this.exited) throw err(KIND.FINISHED, "terminal exited");
    if (!this.handle && this.pending) await this.registry.spawnPending(this);
    if (!this.handle) throw err(KIND.UNAVAILABLE, "terminal not spawned yet (attach to wake)");
    const st = this.status?.state;
    if (st === "blocked" && !force) throw err(KIND.BLOCKED, `terminal reports blocked${this.status.kind ? ` (${this.status.kind})` : ""}`);
    if (cond && st !== cond) throw err(KIND.STATUS_MISMATCH, `status is '${st ?? "none"}', required '${cond}'`);
    const paste = (this.mirror?.modes() ?? 0) & 1 << 3;
    const body = String(text).replace(/\r?\n/g, "\r");
    const payload = `${paste ? "\x1B[200~" : ""}${body}${paste ? "\x1B[201~" : ""}${enter ? "\r" : ""}`;
    const r = await hostSpan("dnt-agent-send", () => this.gate.submit(() => this.handle.write(payload), { urgent }));
    this.registry.bus?.emit("message", this.addr, { id: this.id });
    return { ...r ?? {}, turn: this.turn };
  }
  setLabels(set = {}, unset = []) {
    if ("t" in set || "conv" in set || unset.includes("t") || unset.includes("conv")) {
      throw err(KIND.INVALID, "'t'/'conv' are reserved ctx anchors \u2014 set at create or pane attach only");
    }
    Object.assign(this.labels, set);
    for (const k of unset) delete this.labels[k];
    this.registry.bus?.emit("labels", this.addr, { id: this.id, labels: this.labels });
    this.registry.persist?.schedule(this.registry);
    return this.labels;
  }
  /**
   * Bind ctx-ref anchors on attach. Existing bindings are authoritative —
   * a second pane never rewrites them; it adopts the session's anchors
   * (the ready frame echoes them back, so its copied ref resolves to this
   * session even after its own tid was regenerated on layout loss).
   */
  graftCtxAnchors({ t, conv }) {
    let changed = false;
    for (const [k, v] of Object.entries({ t, conv })) {
      if (!v || this.labels[k]) continue;
      if (this.registry?.sessions && [...this.registry.sessions.values()].some((r) => r !== this && r.labels?.[k] === v)) continue;
      this.labels[k] = v;
      changed = true;
    }
    if (changed) {
      this.registry.bus?.emit("labels", this.addr, { id: this.id, labels: this.labels });
      this.registry.persist?.schedule(this.registry);
    }
    return this.labels;
  }
  async resize(cols, rows) {
    cols = Math.floor(Number(cols));
    rows = Math.floor(Number(rows));
    if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols < 2 || rows < 2 || cols > 512 || rows > 512) {
      throw err(KIND.INVALID, `resize needs finite cols/rows in [2,512], got ${cols}x${rows}`);
    }
    const prev = `${this.meta.cols}x${this.meta.rows}`;
    this.meta = { ...this.meta, cols, rows };
    try {
      if (resizeMode(process.platform) === "box") this.mirror?.resizeBox(cols, rows);
      else this.mirror?.resize(cols, rows);
    } catch {
    }
    if (`${cols}x${rows}` !== prev) {
      this.registry.bus?.emit("size", this.addr, { id: this.id, cols, rows });
      this.registry.persist?.schedule(this.registry);
    }
    if (!this.exited) await this.handle?.resize(cols, rows).catch(() => {
    });
  }
  broadcastText(obj) {
    const send = this.registry.sendText;
    for (const s of this.attached.size ? this.attached.keys() : this.sockets) send(s, obj);
  }
  screenText(n, source = "visible") {
    try {
      return this.mirror?.screenText(n, source) ?? "";
    } catch {
      return "";
    }
  }
  /** 对齐帧要的当前屏：序号、尺寸、光标、可见区 dump。 */
  alignView() {
    let cols = this.meta?.cols ?? 80;
    let rows = this.meta?.rows ?? 24;
    let cursorX = 0;
    let cursorY = 0;
    try {
      cols = this.mirror?.cols?.() || cols;
      rows = this.mirror?.rows?.() || rows;
      cursorX = this.mirror?.cursorX?.() ?? 0;
      cursorY = this.mirror?.cursorY?.() ?? 0;
    } catch {
    }
    return {
      seq: this.outSeq >>> 0,
      cols,
      rows,
      cursorX,
      cursorY,
      text: this.screenText(rows, "visible")
    };
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
  SessionRegistry,
  splitSlashArgs
};
