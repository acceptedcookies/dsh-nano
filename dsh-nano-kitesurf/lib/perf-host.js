// src/host/perf.js
import { readFileSync } from "node:fs";

// ../packages/dsh-performance-review/src/state.js
var LIB_VERSION = "0.1.0";
var NAME_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
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
function roundMs(value) {
  return value == null ? null : Math.round(value * 10) / 10;
}

// ../packages/dsh-performance-review/src/host.js
var WRITE_INTERVAL_MS = 3e4;
var WINDOW_SAMPLE_CAP = 512;
var EVENT_CAP = 32;
var JSONL_CAP_BYTES = 8 * 1024 * 1024;
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
    lastErrorAt: span.lastErrorAt ?? null,
    lastTraceId: span.lastTraceId ?? null
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
    enabled: state.enabled,
    observerVersion: LIB_VERSION,
    contributors: state.contributors.map((c) => ({ ...c })),
    sinceStart: state.sinceStart,
    writtenAt: (/* @__PURE__ */ new Date()).toISOString(),
    plugins,
    structure: { hostWriteErrors: state.writeErrors }
  };
}
function takeWindow(state) {
  const snap = hostSnapshot(state);
  const plugins = {};
  for (const [pluginId, row] of state.plugins) {
    const spans = {};
    for (const [name, span] of row.spans) {
      spans[name] = { n: span.window.length, samples: [...span.window] };
    }
    const counts = {};
    if (row.counts instanceof Map) {
      for (const [name, n] of row.counts) counts[name] = n;
    }
    plugins[pluginId] = { version: row.version ?? null, spans, counts };
  }
  for (const row of state.plugins.values()) {
    for (const span of row.spans.values()) span.window.length = 0;
  }
  return { ...snap, window: true, plugins };
}
function createPerfReviewHost(env = {}) {
  const processRef = env.process ?? globalThis.process;
  const state = {
    enabled: env.forceEnabled !== void 0 ? env.forceEnabled === true : null,
    plugins: /* @__PURE__ */ new Map(),
    contributors: [],
    writeErrors: 0,
    sinceStart: (/* @__PURE__ */ new Date()).toISOString(),
    writer: null
  };
  const dataDir = () => processRef.env?.DSH_DATA_DIR ?? processRef.env?.DSH_HOME ?? null;
  const writeFile = async () => {
    const fs = env.fs ?? await import("node:fs/promises");
    const path = env.path ?? await import("node:path");
    const dir = dataDir() ?? `${processRef.env?.HOME ?? ""}/.dsh`;
    const target = path.join(dir, "plugins", "perf-review");
    try {
      await fs.mkdir(target, { recursive: true });
      const snap = hostSnapshot(state);
      await fs.writeFile(path.join(target, "host.json"), JSON.stringify(snap, null, 2));
      const series = { at: snap.writtenAt, plugins: {} };
      for (const [pluginId, row] of state.plugins) {
        const spans = {};
        for (const [name, span] of row.spans) {
          spans[name] = { n: span.n, p95: roundMs(percentile(span.reservoir, 0.95)), errors: span.errors ?? 0 };
        }
        series.plugins[pluginId] = { spans };
      }
      const jsonlPath = path.join(target, "host-snapshots.jsonl");
      let existing = "";
      try {
        existing = await fs.readFile(jsonlPath, "utf8");
      } catch {
      }
      if (existing.length > JSONL_CAP_BYTES) {
        existing = existing.slice(-Math.floor(JSONL_CAP_BYTES / 2));
        const nl = existing.indexOf("\n");
        if (nl >= 0) existing = existing.slice(nl + 1);
      }
      await fs.writeFile(jsonlPath, existing + JSON.stringify(series) + "\n");
    } catch {
      state.writeErrors += 1;
    }
  };
  const startWriter = () => {
    if (state.writer !== null) return;
    const setIntervalRef = env.setInterval ?? setInterval;
    state.writer = setIntervalRef(() => {
      void writeFile();
    }, WRITE_INTERVAL_MS);
    if (typeof state.writer?.unref === "function") state.writer.unref();
    try {
      processRef.once?.("beforeExit", () => {
        void writeFile();
      });
    } catch {
    }
  };
  const isEnabled = () => {
    if (state.enabled === null) {
      state.enabled = env.forceEnabled !== void 0 ? env.forceEnabled === true : processRef.env?.DSH_PERF_REVIEW === "1";
      if (state.enabled) startWriter();
    }
    return state.enabled;
  };
  const setEnabled = (value) => {
    state.enabled = value === true;
    if (state.enabled) startWriter();
  };
  const recordSpan = (row, name, t0, t1, err = false, traceId = null) => {
    if (!NAME_RE.test(name) || !isEnabled()) return;
    let span = row.spans.get(name);
    if (span === void 0) {
      span = createSpanRow();
      span.errors = 0;
      span.events = [];
      row.spans.set(name, span);
    }
    span.n += 1;
    const ms = t1 - t0;
    const at = (/* @__PURE__ */ new Date()).toISOString();
    span.lastMs = ms;
    span.lastAt = at;
    if (traceId != null) span.lastTraceId = traceId;
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
    span.events.push(traceId != null ? { ms: Math.round(ms * 10) / 10, at, err, traceId } : { ms: Math.round(ms * 10) / 10, at, err });
    while (span.events.length > EVENT_CAP) span.events.shift();
  };
  const hostJoin = (pluginId, impl = {}) => {
    let row = state.plugins.get(pluginId);
    if (row === void 0) {
      row = { version: impl.version ?? null, spans: /* @__PURE__ */ new Map(), counts: /* @__PURE__ */ new Map() };
      state.plugins.set(pluginId, row);
    }
    if (!(row.counts instanceof Map)) row.counts = /* @__PURE__ */ new Map();
    state.contributors.push({ pluginId, libVersion: impl.libVersion ?? LIB_VERSION });
    const clock = env.performance ?? globalThis.performance;
    const now = () => clock.now();
    return {
      /**
       * hostSpan(name, fn, ctx?) — ctx: {traceId?, incidentId?} correlates the
       * span event with a caller-side trace (e.g. an incidentId from the
       * operations ring); only the LAST-seen trace is kept per span plus the
       * traceId on each event row.
       */
      hostSpan(name, fn, ctx = null) {
        if (!NAME_RE.test(name)) return fn();
        const traceId = ctx && (ctx.traceId ?? ctx.incidentId ?? null);
        const t0 = now();
        let result;
        try {
          result = fn();
        } catch (error) {
          recordSpan(row, name, t0, now(), true, traceId);
          throw error;
        }
        if (isPromiseLike(result)) {
          return result.then(
            (value) => {
              recordSpan(row, name, t0, now(), false, traceId);
              return value;
            },
            (error) => {
              recordSpan(row, name, t0, now(), true, traceId);
              throw error;
            }
          );
        }
        recordSpan(row, name, t0, now(), false, traceId);
        return result;
      },
      /** count(name, n?) — cumulative counter per name (usage-style). */
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
      takeWindow: () => takeWindow(state)
    };
  };
  return {
    hostJoin,
    setEnabled,
    snapshot: () => {
      isEnabled();
      return hostSnapshot(state);
    },
    takeWindow: () => takeWindow(state),
    flush: () => writeFile(),
    _state: () => state,
    libVersion: LIB_VERSION
  };
}
function ensurePerfReviewHost(env = {}) {
  const global = env.global ?? globalThis;
  const incumbent = global.__perfReviewHost;
  if (incumbent == null) {
    global.__perfReviewHost = createPerfReviewHost(env);
    return global.__perfReviewHost;
  }
  if (typeof incumbent.setEnabled !== "function" || typeof incumbent._state !== "function") {
    const fresh = createPerfReviewHost(env);
    try {
      const old = typeof incumbent._state === "function" ? incumbent._state() : null;
      const next = fresh._state();
      if (old && typeof old === "object") {
        if (old.plugins instanceof Map) next.plugins = old.plugins;
        if (Array.isArray(old.contributors)) next.contributors = old.contributors;
        if (typeof old.enabled === "boolean") next.enabled = old.enabled;
        if (typeof old.writeErrors === "number") next.writeErrors = old.writeErrors;
        if (typeof old.sinceStart === "string") next.sinceStart = old.sinceStart;
        if (old.writer) next.writer = old.writer;
      }
    } catch {
    }
    global.__perfReviewHost = fresh;
    return fresh;
  }
  return incumbent;
}

// src/host/perf.js
function pluginVersion() {
  try {
    return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
  } catch {
    return "0.0.0";
  }
}
var host = ensurePerfReviewHost();
var review = host.hostJoin("nano-kitesurf", { version: pluginVersion(), libVersion: LIB_VERSION });
function hostSpan(name, fn, ctx = null) {
  return review.hostSpan(name, fn, ctx);
}
function perfCount(name, n = 1) {
  return review.count(name, n);
}
function setPerfEnabled(value) {
  host.setEnabled(value === true);
}
function perfSnapshot(mode) {
  return mode === "window" ? host.takeWindow() : host.snapshot();
}
export {
  hostSpan,
  perfCount,
  perfSnapshot,
  setPerfEnabled
};
