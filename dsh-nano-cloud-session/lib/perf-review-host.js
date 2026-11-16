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
var BUILD_STAMP = true ? "ff5694c57be1" : "dev";
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
  const recordSpan = (row, name, t0, t1, err) => {
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
    if (err) {
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
    span.events.push({ ms: rounded, at, err: err === true, seq });
    while (span.events.length > EVENT_CAP) span.events.shift();
    span.log.push({ seq, ms, err: err === true, at });
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
function handleHostRead(req, res, host) {
  const method = req?.method ?? "GET";
  const finish = (status, body) => {
    res.statusCode = status;
    res.setHeader("content-type", "application/json; charset=utf-8");
    if (method === "HEAD") res.end();
    else res.end(JSON.stringify(body));
  };
  if (method !== "GET") {
    finish(405, { status: 405, error: "method" });
    return;
  }
  let keys = [];
  try {
    const url = new URL(req?.url ?? "/", "http://localhost");
    keys = [...url.searchParams.keys()];
    const extra = keys.filter((key) => key !== "since");
    if (extra.length > 0) {
      finish(400, { status: 400, error: extra.includes("mode") ? "mode" : "query" });
      return;
    }
    const since = url.searchParams.get("since");
    const view = host.read(since == null ? {} : { since });
    finish(view.status ?? 200, view);
  } catch {
    finish(400, { status: 400, error: "query" });
  }
}
function ensurePerfReviewHost(env = {}) {
  const global = env.global ?? globalThis;
  const stamp = env.build ?? BUILD_STAMP;
  return installSingleton(global, HOST_KEY, "__perfReviewHost", stamp, () => createPerfReviewHost(env));
}
export {
  createPerfReviewHost,
  ensurePerfReviewHost,
  handleHostRead,
  hostSnapshot,
  parseCursor
};
