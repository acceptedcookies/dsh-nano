// src/host/assemble.js
import { mkdirSync as mkdirSync4, statSync as statSync2 } from "node:fs";
import { join as join5 } from "node:path";

// ../packages/dsh-interface/src/contracts/FamilyDefinition.js
var FamilyError = class extends Error {
  constructor(reason, detail) {
    super(detail ? `family: ${reason} \u2014 ${detail}` : `family: ${reason}`);
    this.name = "FamilyError";
    this.reason = reason;
    this.detail = detail;
  }
};
var isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);
var req = (cond, reason, detail) => {
  if (!cond) throw new FamilyError(reason, detail);
};
function defineFamily(def) {
  req(isObj(def), "bad-shape", "FamilyDefinition must be an object");
  req(typeof def.contractId === "string" && def.contractId !== "", "missing-contractId");
  const authorityRefs = def.authorityRefs;
  req(isObj(authorityRefs) || Array.isArray(authorityRefs), "missing-authorityRefs");
  const refEntries = Array.isArray(authorityRefs) ? authorityRefs.map((verdict, i) => [i, verdict]) : Object.entries(authorityRefs);
  for (const [name2, verdict] of refEntries) {
    req(
      verdict === true || isObj(verdict) && verdict.approved === true,
      "unapproved-authority",
      `authorityRefs[${name2}] is not an approved source`
    );
  }
  const operations = def.operations, bindings = def.bindings, providers = def.providers;
  req(isObj(operations) && Object.keys(operations).length > 0, "missing-operations");
  req(isObj(bindings) && Object.keys(bindings).length > 0, "missing-bindings");
  req(isObj(providers) && Object.keys(providers).length > 0, "missing-providers");
  for (const [opId, op3] of Object.entries(operations)) {
    req(isObj(op3), "bad-operation", `operations.${opId}`);
    req(op3.input !== void 0 && op3.output !== void 0, "missing-io", `operations.${opId} needs input/output`);
  }
  for (const [bId, b] of Object.entries(bindings)) {
    req(isObj(b), "bad-binding", `bindings.${bId}`);
    req(Array.isArray(b.operationIds) && b.operationIds.length > 0, "missing-operationIds", `bindings.${bId}`);
    for (const opId of b.operationIds) {
      req(operations[opId] !== void 0, "unknown-operation", `bindings.${bId} references undeclared operation ${opId}`);
    }
    if (b.operationIds.length > 1) {
      req(
        isObj(b.dispatch) && isObj(b.dispatch.cases),
        "missing-dispatch",
        `bindings.${bId} has ${b.operationIds.length} operations but no dispatch.cases selector`
      );
    }
  }
  for (const [pId, p] of Object.entries(providers)) {
    req(isObj(p) && typeof p.plugin === "string", "bad-provider", `providers.${pId}`);
    req(Array.isArray(p.supports), "missing-supports", `providers.${pId}`);
    for (const s of p.supports) {
      req(isObj(s) && typeof s.bindingId === "string", "bad-support", `providers.${pId}.supports`);
      req(bindings[s.bindingId] !== void 0, "unknown-binding", `providers.${pId}.supports \u2192 ${s.bindingId}`);
      for (const opId of s.operationIds ?? []) {
        req(operations[opId] !== void 0, "unknown-operation", `providers.${pId}.supports \u2192 ${opId}`);
      }
    }
  }
  return Object.freeze(def);
}
function selectOperation(def, bindingId, dispatchValue) {
  const b = def?.bindings?.[bindingId];
  req(b !== void 0, "unknown-binding", bindingId);
  if (b.operationIds.length === 1) return b.operationIds[0];
  const cases = b.dispatch?.cases ?? {};
  const opId = cases[String(dispatchValue)];
  req(
    opId !== void 0 && b.operationIds.includes(opId),
    "unknown-dispatch",
    `bindings.${bindingId} has no case for dispatch ${String(dispatchValue)}`
  );
  return opId;
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
    for (const [name2, span] of row.spans) {
      spans[name2] = {
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
      for (const [name2, n] of row.counts) counts[name2] = n;
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
    for (const [name2, span] of row.spans) {
      const minKept = span.minKeptSeq;
      if (predicate && minKept != null) {
        const floor = predicate.seq;
        if (floor + 1 < minKept) {
          truncated.push({ pluginId, name: name2, lost: minKept - floor - 1 });
        }
      } else if (!predicate && (span.lost ?? 0) > 0) {
        truncated.push({ pluginId, name: name2, lost: span.lost });
      }
      for (const event of span.log ?? []) {
        if (predicate && !(event.seq > predicate.seq)) continue;
        rows.push({
          seq: event.seq,
          pluginId,
          name: name2,
          ms: event.ms,
          err: event.err === true,
          at: event.at
        });
      }
    }
    for (const [name2, bucket] of row.contract ?? []) {
      for (const event of bucket.log ?? []) {
        if (predicate && !(event.seq > predicate.seq)) continue;
        rows.push({
          seq: event.seq,
          pluginId,
          name: name2,
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
  const recordSpan = (row, name2, t0, t1, err) => {
    if (!isEnabled()) return;
    let span = row.spans.get(name2);
    if (span === void 0) {
      span = createSpanRow();
      span.errors = 0;
      span.events = [];
      span.log = [];
      span.lost = 0;
      span.minKeptSeq = null;
      row.spans.set(name2, span);
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
      hostSpan(name2, fn) {
        if (typeof name2 !== "string" || !NAME_RE.test(name2)) {
          state.structure.unmappedKey += 1;
          return fn();
        }
        const t0 = now();
        let result;
        try {
          result = fn();
        } catch (error) {
          recordSpan(row, name2, t0, now(), true);
          throw error;
        }
        if (isPromiseLike(result)) {
          return result.then(
            (value) => {
              recordSpan(row, name2, t0, now(), false);
              return value;
            },
            (error) => {
              recordSpan(row, name2, t0, now(), true);
              throw error;
            }
          );
        }
        recordSpan(row, name2, t0, now(), false);
        return result;
      },
      count(name2, n = 1) {
        if (!NAME_RE.test(name2) || !isEnabled()) return;
        if (!(row.counts instanceof Map)) row.counts = /* @__PURE__ */ new Map();
        if (!row.counts.has(name2) && row.counts.size >= MAX_USAGE_KEYS) return;
        row.counts.set(name2, (row.counts.get(name2) ?? 0) + n);
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

// src/contracts/codec-util.js
function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function rejectUnknown(input, allowed) {
  if (!isPlainObject(input)) {
    const error = new Error("request must be a JSON object");
    error.reason = "invalid-request";
    throw error;
  }
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      const error = new Error(`unknown field ${key}`);
      error.reason = "invalid-request";
      throw error;
    }
  }
  return input;
}
function omitUndefined(object) {
  const out = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== void 0) out[key] = value;
  }
  return out;
}
function requireString(value, name2, { min = 1, max = 4096 } = {}) {
  if (typeof value !== "string") {
    const error = new Error(`${name2} must be a string`);
    error.reason = "invalid-request";
    throw error;
  }
  if (value.length < min || value.length > max) {
    const error = new Error(`${name2} length out of range`);
    error.reason = "invalid-request";
    throw error;
  }
  return value;
}
function optionalBoolean(value, name2) {
  if (value === void 0) return void 0;
  if (typeof value !== "boolean") {
    const error = new Error(`${name2} must be a boolean`);
    error.reason = "invalid-request";
    throw error;
  }
  return value;
}
function optionalInteger(value, name2, { min, max } = {}) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    const error = new Error(`${name2} must be an integer`);
    error.reason = "invalid-request";
    throw error;
  }
  if (min !== void 0 && value < min) {
    const error = new Error(`${name2} is below ${min}`);
    error.reason = "invalid-request";
    throw error;
  }
  if (max !== void 0 && value > max) {
    const error = new Error(`${name2} is above ${max}`);
    error.reason = "invalid-request";
    throw error;
  }
  return value;
}
function decodeBase64(value, name2) {
  if (typeof value !== "string" || value === "") {
    const error = new Error(`${name2} must be base64`);
    error.reason = "invalid-request";
    throw error;
  }
  if (value.includes("\0") || /[^A-Za-z0-9+/=]/.test(value)) {
    const error = new Error(`${name2} is not valid base64`);
    error.reason = "invalid-request";
    throw error;
  }
  return value;
}

// src/providers/devin/profile-codec.js
var PROVIDER_KEY = "devin";
var DEFAULT_BASE_URL = "https://api.devin.ai";
var ProfileCodecError = class extends Error {
  constructor(message, reason = "invalid-request") {
    super(message);
    this.name = "ProfileCodecError";
    this.reason = reason;
    this.status = 422;
  }
};
function originOf(baseUrl) {
  let url;
  try {
    url = new URL(String(baseUrl ?? ""));
  } catch {
    throw new ProfileCodecError("baseUrl must be a valid URL");
  }
  return url.origin;
}
function normalizeBaseUrl(value) {
  const raw = String(value ?? "").trim() || DEFAULT_BASE_URL;
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new ProfileCodecError("baseUrl must be a valid URL");
  }
  if (url.protocol !== "https:") throw new ProfileCodecError("baseUrl must be https");
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return (url.origin + url.pathname).replace(/\/+$/, "");
}
function decodeProfileSave(input, { existing } = {}) {
  if (!input || typeof input !== "object") throw new ProfileCodecError("profile must be an object");
  const label = String(input.label ?? "").trim();
  if (!label || label.length > 80) throw new ProfileCodecError("label is required (max 80 chars)");
  const orgId = String(input.orgId ?? "").trim();
  if (!/^org-[A-Za-z0-9-]*$/.test(orgId)) throw new ProfileCodecError("orgId must look like org-\u2026");
  const baseUrl = normalizeBaseUrl(input.baseUrl ?? existing?.baseUrl);
  const next = {
    id: existing?.id ?? (String(input.id ?? "").trim() || null),
    label,
    carrier: "devin",
    providerKey: PROVIDER_KEY,
    orgId,
    baseUrl,
    secret: existing?.secret ?? "",
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now()
  };
  const originChanged = existing?.baseUrl ? originOf(existing.baseUrl) !== originOf(baseUrl) : false;
  const secret = input.secret !== void 0 ? String(input.secret) : null;
  if (originChanged && (secret === null || secret === "")) {
    throw new ProfileCodecError("changing baseUrl origin requires rebinding the token");
  }
  if (secret !== null && secret !== "") {
    if (!/^cog_[A-Za-z0-9_-]{8,}$/.test(secret)) {
      throw new ProfileCodecError("token must look like cog_\u2026 (Devin PAT or service user key)");
    }
    next.secret = secret;
  }
  if (!next.secret) throw new ProfileCodecError("token is required");
  return next;
}
function publicProfile(profile, activeId) {
  return omitUndefined({
    id: profile.id,
    label: profile.label,
    carrier: profile.carrier,
    providerKey: PROVIDER_KEY,
    orgId: profile.orgId,
    baseUrl: profile.baseUrl,
    hasSecret: Boolean(profile.secret),
    active: profile.id === activeId,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  });
}
function encodeCreateSession(input) {
  if (!input || typeof input !== "object") throw new ProfileCodecError("create body must be an object");
  if (typeof input.prompt !== "string" || !input.prompt.trim()) {
    throw new ProfileCodecError("prompt is required");
  }
  return omitUndefined({
    prompt: input.prompt,
    title: input.title,
    tags: input.tags,
    repos: input.repos,
    devin_mode: input.devinMode ?? input.devin_mode,
    max_acu_limit: input.maxAcuLimit ?? input.max_acu_limit,
    resumable: input.resumable,
    playbook_id: input.playbookId ?? input.playbook_id,
    knowledge_ids: input.knowledgeIds ?? input.knowledge_ids,
    attachment_urls: input.attachmentUrls ?? input.attachment_urls,
    structured_output_schema: input.structuredOutputSchema ?? input.structured_output_schema,
    structured_output_required: input.structuredOutputRequired ?? input.structured_output_required,
    platform: input.platform,
    bypass_approval: input.bypassApproval ?? input.bypass_approval,
    child_playbook_id: input.childPlaybookId ?? input.child_playbook_id,
    create_as_user_id: input.createAsUserId ?? input.create_as_user_id,
    memory_enabled: input.memoryEnabled ?? input.memory_enabled,
    secret_ids: input.secretIds ?? input.secret_ids,
    session_secrets: input.sessionSecrets ?? input.session_secrets,
    session_links: input.sessionLinks ?? input.session_links,
    security_profile: input.securityProfile ?? input.security_profile
  });
}
function decodeListFilter(body = {}) {
  const archived = body.isArchived ?? body.is_archived;
  return omitUndefined({
    first: body.first,
    after: body.after,
    tags: body.tags,
    origins: body.origins,
    isArchived: archived,
    createdAfter: body.createdAfter ?? body.created_after,
    createdBefore: body.createdBefore ?? body.created_before,
    updatedAfter: body.updatedAfter ?? body.updated_after,
    updatedBefore: body.updatedBefore ?? body.updated_before,
    category: body.category,
    userIds: body.userIds ?? body.user_ids,
    repoNames: body.repoNames ?? body.repo_names,
    devinId: body.devinId ?? body.devin_id,
    sessionIds: body.sessionIds ?? body.session_ids,
    playbookId: body.playbookId ?? body.playbook_id,
    scheduleId: body.scheduleId ?? body.schedule_id,
    serviceUserIds: body.serviceUserIds ?? body.service_user_ids,
    automationIds: body.automationIds ?? body.automation_ids,
    parentSessionId: body.parentSessionId ?? body.parent_session_id
  });
}

// src/providers/devin/api.js
var DEFAULT_TIMEOUT_MS = 2e4;
var CarrierError = class extends Error {
  constructor(reason, message, { status = 0, upstream } = {}) {
    super(message);
    this.name = "CarrierError";
    this.reason = reason;
    this.status = status;
    this.providerStatus = status;
    this.upstream = upstream;
  }
};
function classify(status) {
  if (status === 403) return "forbidden-or-invisible";
  if (status === 401) return "unauthorized";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status === 422) return "invalid-request";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "upstream-error";
  return "unexpected-status";
}
async function request(profile, { method = "GET", path, query, body, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl }) {
  const base = String(profile.baseUrl).replace(/\/+$/, "");
  const url = new URL(base + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === void 0 || value === null || value === "") continue;
      if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, String(v)));
      else url.searchParams.set(key, String(value));
    }
  }
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let res;
  try {
    res = await (fetchImpl ?? fetch)(url, {
      method,
      headers: {
        authorization: `Bearer ${profile.secret}`,
        ...body !== void 0 && !isForm ? { "content-type": "application/json" } : {}
      },
      body: isForm ? body : body !== void 0 ? JSON.stringify(body) : void 0,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "error"
    });
  } catch (error) {
    if (String(error?.message ?? "").toLowerCase().includes("redirect")) {
      throw new CarrierError("forbidden-or-invisible", "refusing to follow a cross-origin redirect with a bearer token", { status: 0 });
    }
    const reason = error?.name === "TimeoutError" || error?.name === "AbortError" ? "timeout" : "unreachable";
    throw new CarrierError(reason, `devin upstream: ${reason}`, { status: 0 });
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
  }
  if (!res.ok) {
    const reason = classify(res.status);
    const detail = json?.error?.message ?? json?.message ?? json?.detail ?? text.slice(0, 300);
    throw new CarrierError(reason, `devin ${res.status}: ${String(detail).slice(0, 300)}`, { status: res.status, upstream: json });
  }
  return json;
}
var orgPath = (profile, suffix) => `/v3/organizations/${encodeURIComponent(profile.orgId)}${suffix}`;
function sessionQuery({
  first = 50,
  after,
  tags,
  origins,
  isArchived,
  createdAfter,
  createdBefore,
  updatedAfter,
  updatedBefore,
  category,
  userIds,
  repoNames,
  devinId,
  sessionIds,
  playbookId,
  scheduleId,
  serviceUserIds,
  automationIds,
  parentSessionId
} = {}) {
  return {
    first,
    after,
    tags,
    origins,
    category,
    is_archived: isArchived,
    created_after: createdAfter,
    created_before: createdBefore,
    updated_after: updatedAfter,
    updated_before: updatedBefore,
    user_ids: userIds,
    repo_names: repoNames,
    devin_id: devinId,
    session_ids: sessionIds,
    playbook_id: playbookId,
    schedule_id: scheduleId,
    service_user_ids: serviceUserIds,
    automation_ids: automationIds,
    parent_session_id: parentSessionId
  };
}
function createDevinApi({ timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl } = {}) {
  const call = (profile, spec) => request(profile, { timeoutMs, fetchImpl, ...spec });
  return {
    self: (profile) => call(profile, { path: "/v3/self" }),
    listSessions: (profile, params = {}) => call(profile, {
      path: orgPath(profile, "/sessions"),
      query: sessionQuery(params)
    }),
    listSessionsInsights: (profile, params = {}) => call(profile, {
      path: orgPath(profile, "/sessions/insights"),
      query: sessionQuery(params)
    }),
    getSession: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}`) }),
    getMessages: (profile, id, { first = 100, after } = {}) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/messages`), query: { first, after } }),
    getAttachments: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/attachments`) }),
    getInsights: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/insights`) }),
    generateInsights: (profile, id) => call(profile, { method: "POST", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/insights/generate`) }),
    getTags: (profile, id) => call(profile, { path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/tags`) }),
    listPlaybooks: (profile, { first = 100, after, includeEnterprise = true } = {}) => call(profile, { path: orgPath(profile, "/playbooks"), query: { first, after, include_enterprise: includeEnterprise } }),
    listSecrets: (profile, { first = 100, after } = {}) => call(profile, { path: orgPath(profile, "/secrets"), query: { first, after } }),
    listKnowledgeNotes: (profile, { first = 100, after, search, folderPath, pinnedRepo } = {}) => call(profile, { path: orgPath(profile, "/knowledge/notes"), query: { first, after, search, folder_path: folderPath, pinned_repo: pinnedRepo } }),
    listRepositories: (profile, { first = 100, after, filterName, loadIndexingStatus = false } = {}) => call(profile, { path: orgPath(profile, "/repositories"), query: { first, after, filter_name: filterName, load_indexing_status: loadIndexingStatus } }),
    uploadAttachment: (profile, { name: name2, contentType, bytes }) => {
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: contentType || "application/octet-stream" }), name2);
      return call(profile, { method: "POST", path: orgPath(profile, "/attachments"), body: form });
    },
    createSession: (profile, input) => call(profile, { method: "POST", path: orgPath(profile, "/sessions"), body: encodeCreateSession(input) }),
    postMessage: (profile, id, message) => call(profile, {
      method: "POST",
      path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/messages`),
      body: { message }
    }),
    setTags: (profile, id, tags) => call(profile, { method: "PUT", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/tags`), body: { tags } }),
    appendTags: (profile, id, tags) => call(profile, { method: "POST", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/tags`), body: { tags } }),
    sleep: (profile, id) => call(profile, { method: "POST", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/sleep`) }),
    archive: (profile, id) => call(profile, { method: "POST", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/archive`) }),
    unarchive: (profile, id) => call(profile, { method: "POST", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}/unarchive`) }),
    terminate: (profile, id) => call(profile, { method: "DELETE", path: orgPath(profile, `/sessions/${encodeURIComponent(id)}`) })
  };
}

// src/host/profiles.js
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
var STORE_VERSION = 1;
var STORE_FILE = "nano-cloud-session.json";
var ENV_FILE = "nano-cloud-session.env";
function home() {
  return process.env.DSH_HOME || process.env.HOME || ".";
}
function storePath() {
  return join(home(), STORE_FILE);
}
function envPath() {
  return join(home(), ENV_FILE);
}
function readEnvFile(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
  }
  return out;
}
function seedFromEnv() {
  const file = readEnvFile(envPath());
  const pick = (key) => process.env[key] || file[key] || "";
  const token = pick("DEVIN_API_TOKEN");
  const orgId = pick("DEVIN_ORG_ID");
  const baseUrl = pick("DEVIN_API_BASE") || DEFAULT_BASE_URL;
  if (!token) return { complete: false };
  return { complete: true, token, orgId, baseUrl };
}
function load() {
  if (!existsSync(storePath())) {
    return { version: STORE_VERSION, activeId: null, profiles: [], configEpoch: 0 };
  }
  let data;
  try {
    data = JSON.parse(readFileSync(storePath(), "utf8"));
  } catch {
    throw new Error(`${STORE_FILE} is not valid JSON`);
  }
  if (!data || data.version !== STORE_VERSION || !Array.isArray(data.profiles)) {
    throw new Error(`${STORE_FILE} version/shape mismatch`);
  }
  if (!Number.isInteger(data.configEpoch)) data.configEpoch = 0;
  return data;
}
function save(data) {
  mkdirSync(dirname(storePath()), { recursive: true });
  const tmp = `${storePath()}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 384 });
  renameSync(tmp, storePath());
}
function createProfileStore({ onEpoch } = {}) {
  let data = load();
  let seeded = false;
  const bump = (profileId) => {
    data.configEpoch = (data.configEpoch ?? 0) + 1;
    onEpoch?.(data.configEpoch, profileId);
  };
  if (data.profiles.length === 0) {
    const seed = seedFromEnv();
    if (seed.complete) {
      const profile = decodeProfileSave({ label: "default (env)", orgId: seed.orgId, baseUrl: seed.baseUrl, secret: seed.token });
      profile.id = `dncs-${randomBytes(4).toString("hex")}`;
      data.profiles.push(Object.freeze({ ...profile }));
      data.activeId = profile.id;
      save(data);
      seeded = true;
    }
  }
  return {
    seededFromEnv: seeded,
    configEpoch: () => data.configEpoch ?? 0,
    list() {
      return data.profiles.map((p) => publicProfile(p, data.activeId));
    },
    active() {
      return data.profiles.find((p) => p.id === data.activeId) ?? null;
    },
    get(id) {
      return data.profiles.find((p) => p.id === id) ?? null;
    },
    saveProfile(input) {
      const existing = input?.id ? data.profiles.find((p) => p.id === input.id) : null;
      let profile;
      try {
        profile = decodeProfileSave(input, { existing });
      } catch (error) {
        if (error instanceof ProfileCodecError) throw error;
        throw error;
      }
      if (!profile.id) profile.id = `dncs-${randomBytes(4).toString("hex")}`;
      const duplicate = data.profiles.find((p) => p.id === profile.id && p !== existing);
      if (duplicate) throw new Error("profile id already exists");
      const frozen = Object.freeze({ ...profile });
      if (existing) {
        data.profiles = data.profiles.map((p) => p === existing ? frozen : p);
      } else {
        data.profiles = [...data.profiles, frozen];
      }
      if (data.profiles.length === 1) data.activeId = frozen.id;
      bump(frozen.id);
      save(data);
      return publicProfile(frozen, data.activeId);
    },
    removeProfile(id) {
      const before = data.profiles.length;
      data.profiles = data.profiles.filter((p) => p.id !== id);
      if (data.profiles.length === before) throw new Error("profile not found");
      if (data.activeId === id) data.activeId = data.profiles[0]?.id ?? null;
      bump(id);
      save(data);
    },
    activate(id) {
      if (!data.profiles.find((p) => p.id === id)) throw new Error("profile not found");
      data.activeId = id;
      save(data);
    }
  };
}

// src/host/ssh-keys.js
import { existsSync as existsSync2, readFileSync as readFileSync2, statSync, chmodSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join as join2 } from "node:path";
var KEY_BASENAME = "nano-cloud-session-ssh";
function home2() {
  return process.env.DSH_HOME || process.env.HOME || ".";
}
function keyPath() {
  return join2(home2(), KEY_BASENAME);
}
function ensureSshKeypair() {
  const priv = keyPath();
  const pub = `${priv}.pub`;
  if (!existsSync2(priv) || !existsSync2(pub)) {
    execFileSync(
      "ssh-keygen",
      ["-t", "ed25519", "-f", priv, "-N", "", "-C", `dsh-dncs-${Date.now()}`],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
  }
  chmodSync(priv, 384);
  const publicKey = readFileSync2(pub, "utf8").trim();
  return {
    privateKeyPath: priv,
    publicKey,
    mode: (statSync(priv).mode & 511).toString(8)
  };
}
function sshCommands(sessionId, keypair) {
  const id = String(sessionId);
  const key = keypair.privateKeyPath;
  return {
    shell: `ssh -i ${key} ${id}@ssh.devin.ai`,
    forward: `ssh -i ${key} -L <local>:127.0.0.1:<remote> ${id}@ssh.devin.ai '<command \u4FDD\u6301 channel \u5F00\u653E>'`
  };
}

// ../packages/dsh-host-route-guard/src/route-guard.js
var RouteGuardError = class extends Error {
  constructor(reason, detail = "") {
    super(detail ? `route-guard: ${reason} \u2014 ${detail}` : `route-guard: ${reason}`);
    this.name = "RouteGuardError";
    this.reason = reason;
  }
};
var ROUTE_KIND = "exact";
function sendJson(res, status, body) {
  if (res.writableEnded || res.destroyed) return;
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
async function readJsonBody(req2, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req2) {
    total += chunk.length;
    if (maxBytes !== void 0 && total > maxBytes) {
      throw new RouteGuardError("body-too-large", `${total} > ${maxBytes}`);
    }
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (text === "") return {};
  return JSON.parse(text);
}
function indexTable(table, plugin) {
  if (!Array.isArray(table)) {
    throw new RouteGuardError("table-invalid", "table must be an array of route rows");
  }
  const byPath = /* @__PURE__ */ new Map();
  for (const row of table) {
    if (!row || typeof row.path !== "string" || row.path === "") {
      throw new RouteGuardError("table-invalid", "every row needs a non-empty path");
    }
    const methods = Array.isArray(row.methods) ? row.methods.map((m) => String(m).toUpperCase()) : [];
    if (methods.length === 0) {
      throw new RouteGuardError("table-invalid", `${row.path}: methods list is empty`);
    }
    if (byPath.has(row.path)) {
      throw new RouteGuardError("table-invalid", `${row.path}: duplicate table row`);
    }
    byPath.set(row.path, {
      path: row.path,
      methods,
      sensitivity: row.sensitivity,
      capability: row.capability,
      bodyLimit: row.bodyLimit,
      sessionBinding: row.sessionBinding,
      justification: row.justification,
      plugin: row.plugin ?? plugin,
      id: typeof row.id === "string" && row.id !== "" ? row.id : null
    });
  }
  return byPath;
}
function normalizeSpec(spec) {
  if (!spec || typeof spec.path !== "string" || spec.path === "") {
    throw new RouteGuardError("route-spec-invalid", "every spec needs a non-empty path");
  }
  const methods = /* @__PURE__ */ new Set();
  if (Array.isArray(spec.methods)) {
    for (const m of spec.methods) methods.add(String(m).toUpperCase());
  }
  if (spec.method !== void 0) methods.add(String(spec.method).toUpperCase());
  if (methods.size === 0) {
    throw new RouteGuardError("route-spec-invalid", `${spec.path}: declare method or methods`);
  }
  if (typeof spec.handler !== "function") {
    throw new RouteGuardError("route-spec-invalid", `${spec.path}: handler must be a function`);
  }
  return { ...spec, methods: [...methods] };
}
function observeEnabled(observe) {
  return typeof observe === "function";
}
function observeStamp(observe) {
  if (!observeEnabled(observe)) return null;
  return globalThis.performance.now();
}
function emitObserve(observe, event) {
  if (!observeEnabled(observe)) return;
  try {
    const ret = observe(event);
    if (ret != null && typeof ret.then === "function") ret.then(() => {
    }, () => {
    });
  } catch {
  }
}
function emitHttp(observe, t0, { id, plugin, outcome, status }) {
  if (!observeEnabled(observe) || t0 == null) return;
  const event = {
    surface: "http",
    id: id ?? null,
    plugin: plugin ?? null,
    outcome,
    ms: globalThis.performance.now() - t0
  };
  if (status !== void 0) event.status = status;
  emitObserve(observe, event);
}
function createGuard({ table, plugin, observe } = {}) {
  const byPath = indexTable(table ?? [], plugin);
  const records = [];
  function registerRoutes2(ctx, specs) {
    const conn = ctx.get("connection");
    if (!conn) throw new RouteGuardError("no-connection", "no connection service");
    if (typeof conn.requestRejection !== "function") {
      throw new RouteGuardError("no-request-rejection", "connection.requestRejection is not a function; refusing to register unauthenticated routes");
    }
    const normalized = specs.map(normalizeSpec);
    const wanted = /* @__PURE__ */ new Map();
    for (const spec of normalized) {
      const row = byPath.get(spec.path);
      for (const method of spec.methods) {
        const key = `${method} ${spec.path}`;
        if (!row) {
          throw new RouteGuardError("route-not-listed", `${method} ${spec.path} is not in the route table`);
        }
        if (!row.methods.includes(method)) {
          throw new RouteGuardError("route-not-listed", `${method} ${spec.path}: method not covered by the table row`);
        }
        if (wanted.has(key)) {
          throw new RouteGuardError("route-duplicate", `${method} ${spec.path} declared twice`);
        }
        wanted.set(key, spec);
      }
      for (const field of ["sensitivity", "capability", "sessionBinding"]) {
        if (spec[field] !== void 0 && row[field] !== spec[field]) {
          throw new RouteGuardError("route-drift", `${spec.path}: ${field} declares "${spec[field]}" but the table row has "${row[field]}"`);
        }
      }
    }
    for (const row of byPath.values()) {
      for (const method of row.methods) {
        if (!wanted.has(`${method} ${row.path}`)) {
          throw new RouteGuardError("route-stale", `${method} ${row.path}: table row has no matching route spec`);
        }
      }
    }
    const disposers = [];
    for (const spec of normalized) {
      const row = byPath.get(spec.path);
      const route = Object.freeze({
        path: spec.path,
        methods: Object.freeze([...spec.methods]),
        sensitivity: row.sensitivity,
        capability: row.capability,
        bodyLimit: spec.bodyLimit ?? row.bodyLimit,
        sessionBinding: row.sessionBinding,
        justification: row.justification,
        plugin: row.plugin,
        ...row.id ? { id: row.id } : {}
      });
      records.push(route);
      const handler = async (req2, res) => {
        const t0 = observeStamp(observe);
        const identity = { id: row.id, plugin: route.plugin };
        const rejection = conn.requestRejection?.(req2);
        if (rejection !== void 0) {
          res.statusCode = rejection;
          res.end();
          emitHttp(observe, t0, { ...identity, outcome: "rejected", status: rejection });
          return;
        }
        if (!route.methods.includes(String(req2.method ?? "").toUpperCase())) {
          res.setHeader("allow", route.methods.join(", "));
          sendJson(res, 405, { ok: false, reason: "method-not-allowed" });
          emitHttp(observe, t0, { ...identity, outcome: "method", status: 405 });
          return;
        }
        try {
          await spec.handler(req2, res, route);
          emitHttp(observe, t0, { ...identity, outcome: "ok", status: res.statusCode });
        } catch (error) {
          const reason = error instanceof RouteGuardError ? error.reason : "failed";
          sendJson(res, 500, { ok: false, reason });
          emitHttp(observe, t0, { ...identity, outcome: "failed", status: 500 });
        }
      };
      const register = () => ctx.get("webServer").register({ kind: ROUTE_KIND, path: spec.path, handler });
      if (typeof ctx.effect === "function") {
        disposers.push(ctx.effect(register, `route-guard: ${spec.path}`));
      } else {
        disposers.push(register());
      }
    }
    return disposers;
  }
  function inventory() {
    return Object.freeze([...records]);
  }
  function lookup(path) {
    return records.find((r) => r.path === path);
  }
  return { registerRoutes: registerRoutes2, inventory, lookup };
}
function registerRoutes(ctx, specs, { table, plugin, observe } = {}) {
  return createGuard({ table, plugin, observe }).registerRoutes(ctx, specs);
}

// lib/bindings.js
var PLUGIN = "dsh-nano-cloud-session";
var BINDING_TABLE = Object.freeze([
  { "id": "dncs.status", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/status", "methods": ["POST"], "bodyLimit": 16384, "sensitivity": "L0", "capability": "read:none", "sessionBinding": false, "justification": "dsh-nano-cloud-session/index.js \u2014 carrier profile \u5217\u8868\uFF08\u8131\u654F\uFF0ChasSecret \u4EC5\u5E03\u5C14\uFF09\u4E0E activeId\uFF1B\u65E0 secret \u51FA\u53C2\u3002" },
  { "id": "dncs.config", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/config", "methods": ["POST"], "bodyLimit": 16384, "sensitivity": "L3", "capability": "write:operator", "sessionBinding": false, "justification": "dsh-nano-cloud-session/index.js \u2014 profile CRUD + activate + test\uFF1Atoken \u5199\u5165\u5BBF\u4E3B profile \u6587\u4EF6\uFF080600\uFF09\u4E0E\u89E6\u53D1 upstream /v3/self\uFF1B\u64CD\u4F5C\u5458\u914D\u7F6E\u9762\u3002" },
  { "id": "dncs.sessions", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/sessions", "methods": ["POST"], "bodyLimit": 65536, "sensitivity": "L2", "capability": "net:fetch", "sessionBinding": false, "justification": "dsh-nano-cloud-session/index.js \u2014 \u7ECF\u5BBF\u4E3B\u4EE3\u7406 GET /v3/organizations/{org}/sessions\uFF1B\u643A\u5E26 PAT \u7684\u51FA\u7AD9\u8BF7\u6C42\u3002" },
  { "id": "dncs.session", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/session", "methods": ["POST"], "bodyLimit": 65536, "sensitivity": "L2", "capability": "net:fetch", "sessionBinding": false, "justification": "dsh-nano-cloud-session/index.js \u2014 \u4F1A\u8BDD\u8BE6\u60C5/\u6D88\u606F\u6D41/attachments/insights/tags/get+set_tags \u4EE3\u7406\u3002" },
  { "id": "dncs.create", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/create", "methods": ["POST"], "bodyLimit": 262144, "sensitivity": "L2", "capability": "net:fetch+spawn:remote", "sessionBinding": false, "justification": "dsh-nano-cloud-session/index.js \u2014 \u521B\u5EFA Devin cloud session\uFF08\u6D88\u8017 ACU\u3001\u542F\u52A8\u8FDC\u7AEF VM\u3001\u53EF\u5E26 prompt/repos/devin_mode/max_acu_limit \u7B49\uFF09\u3002" },
  { "id": "dncs.message", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/message", "methods": ["POST"], "bodyLimit": 65536, "sensitivity": "L2", "capability": "net:fetch+spawn:remote", "sessionBinding": false, "justification": "dsh-nano-cloud-session/index.js \u2014 \u5411\u65E2\u6709 session \u6295\u9012\u7528\u6237\u6D88\u606F\uFF0C\u53EF\u5524\u9192/\u63A5\u7BA1 session\u3002" },
  { "id": "dncs.archive", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/archive", "methods": ["POST"], "bodyLimit": 16384, "sensitivity": "L2", "capability": "net:fetch+write:remote", "sessionBinding": false, "justification": "dsh-nano-cloud-session/index.js \u2014 \u5F52\u6863 session\u3002" },
  { "id": "dncs.unarchive", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/unarchive", "methods": ["POST"], "bodyLimit": 16384, "sensitivity": "L2", "capability": "net:fetch+write:remote", "sessionBinding": false, "justification": "dsh-nano-cloud-session/index.js \u2014 \u53D6\u6D88\u5F52\u6863\u3002" },
  { "id": "dncs.terminate", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/terminate", "methods": ["POST"], "bodyLimit": 16384, "sensitivity": "L2", "capability": "net:fetch+write:remote", "sessionBinding": false, "justification": "dsh-nano-cloud-session/index.js \u2014 DELETE upstream = \u4E2D\u6B62\uFF08\u5B58\u6D3B session \u2192 suspended\uFF0C\u975E\u786C\u5220\u3001\u4E0D\u81EA\u52A8\u5F52\u6863\uFF1B\u5F52\u6863\u9700\u53E6\u8D70 /archive\uFF09\u3002" },
  { "id": "dncs.catalog", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/catalog", "methods": ["POST"], "bodyLimit": 16384, "sensitivity": "L2", "capability": "net:fetch", "sessionBinding": false, "justification": "dsh-nano-cloud-session/index.js \u2014 \u7ECF\u5BBF\u4E3B\u4EE3\u7406 /v3/organizations/{org}/playbooks|secrets|knowledge/notes|repositories\uFF1B\u53EA\u8BFB\u76EE\u5F55\uFF0C\u643A\u5E26 PAT \u51FA\u7AD9\u3002" },
  { "id": "dncs.upload", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/upload", "methods": ["POST"], "bodyLimit": 33554432, "sensitivity": "L2", "capability": "net:fetch+write:remote", "sessionBinding": false, "justification": "dsh-nano-cloud-session/index.js \u2014 \u628A base64 \u9644\u4EF6\u7ECF\u5BBF\u4E3B multipart \u4E0A\u4F20\u5230 /v3/organizations/{org}/attachments\uFF1B16 MiB \u6587\u4EF6\u4E0A\u9650\u300132 MiB JSON \u4FE1\u5C01\u3002" },
  { "id": "dncs.ssh", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/ssh", "methods": ["POST"], "bodyLimit": 16384, "sensitivity": "L0", "capability": "read:none", "sessionBinding": false, "justification": "dsh-nano-cloud-session/index.js \u2014 \u8FD4\u56DE ssh \u547D\u4EE4\u4E32\u4E0E enroll \u63D0\u793A\u7684\u7EAF\u4FE1\u606F\u8DEF\u7531\uFF1B\u4E0D spawn\u3002" },
  { "id": "dncs.workspace", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/workspace", "methods": ["POST"], "bodyLimit": 65536, "sensitivity": "L2", "capability": "net:fetch+spawn:remote", "sessionBinding": false, "justification": "dsh-nano-cloud-session/src/host/assemble.js \u2014 WorkspaceScope connect/status/disconnect/inspect\uFF1BSSH bootstrap \u4E0E MCP \u63E1\u624B\uFF0C\u4E0D\u9500\u6BC1\u8FDC\u7AEF session\u3002" },
  { "id": "dncs.resources", "plugin": "dsh-nano-cloud-session", "channel": "http", "match": "exact", "path": "/nano-cloud-session/resources", "methods": ["POST"], "bodyLimit": 131072, "sensitivity": "L2", "capability": "net:fetch+write:remote", "sessionBinding": false, "justification": "dsh-nano-cloud-session/src/host/assemble.js \u2014 \u6295\u5F71 workspace family \u8D44\u6E90\u64CD\u4F5C\uFF08fs/process\uFF09\u5230\u5DF2\u9A8C\u8BC1 scope\uFF1B\u4E0D\u5F00\u653E /mcp\u3002" }
]);

// src/contracts/session-family.js
var op = (semanticsRef, failures = ["invalid-request", "unauthorized", "forbidden-or-invisible", "not-found", "upstream-error"]) => ({
  input: { type: "object" },
  output: { type: "object" },
  failures,
  semanticsRef
});
var nativeFailures = ["NATIVE_UNAVAILABLE", "NATIVE_UNSUPPORTED", "NATIVE_PROJECTION_FAILED", "NATIVE_OUTCOME_UNKNOWN", "invalid-request"];
var SESSION_FAMILY = defineFamily({
  contractId: "dncs.session.v1",
  authorityRefs: {
    "docs/specs/dsh-nano-cloud-session/design-1119.md#R1": { approved: true },
    "docs/specs/dsh-nano-cloud-session/design-1119.md#R4": { approved: true },
    "docs/specs/dsh-nano-cloud-session/design-1119.md#R5": { approved: true }
  },
  operations: {
    "config.list": op("config/list"),
    "config.save": op("config/save", ["invalid-request"]),
    "config.remove": op("config/remove", ["invalid-request", "profile-not-found"]),
    "config.activate": op("config/activate", ["invalid-request", "profile-not-found"]),
    "config.test": op("config/test"),
    "config.security": op("config/security"),
    "config.ssh-key": op("config/ssh-key"),
    "sessions.list": op("sessions/list"),
    "sessions.insights": op("sessions/insights"),
    "session.native_open": op("session/native_open", nativeFailures),
    "session.workspace_shell": op("session/workspace_shell", ["NATIVE_UNAVAILABLE", "invalid-request"]),
    "session.get": op("session/get"),
    "session.messages": op("session/messages"),
    "session.attachments": op("session/attachments"),
    "session.insights": op("session/insights"),
    "session.generate_insights": op("session/generate_insights"),
    "session.tags": op("session/tags"),
    "session.set_tags": op("session/set_tags", ["invalid-request", "conflict", "forbidden-or-invisible"]),
    "session.append_tags": op("session/append_tags", ["invalid-request", "conflict", "forbidden-or-invisible"]),
    "session.sleep": op("session/sleep"),
    "session.create": op("session/create"),
    "session.message": op("session/message"),
    "session.archive": op("session/archive"),
    "session.unarchive": op("session/unarchive"),
    "session.terminate": op("session/terminate"),
    "catalog.read": op("catalog/read"),
    "attachment.upload": op("attachment/upload", ["invalid-request", "body-too-large", "forbidden-or-invisible"]),
    "ssh.info": op("ssh/info")
  },
  bindings: {
    "http.status": {
      operationIds: ["config.list"],
      transport: "http",
      path: "/nano-cloud-session/status",
      methods: ["POST"],
      bodyLimit: 16384
    },
    "http.config": {
      operationIds: ["config.list", "config.save", "config.remove", "config.activate", "config.test", "config.security", "config.ssh-key"],
      transport: "http",
      path: "/nano-cloud-session/config",
      methods: ["POST"],
      bodyLimit: 16384,
      dispatch: { field: "action", cases: {
        list: "config.list",
        save: "config.save",
        remove: "config.remove",
        activate: "config.activate",
        test: "config.test",
        security: "config.security",
        "ssh-key": "config.ssh-key"
      } }
    },
    "http.sessions": {
      operationIds: ["sessions.list", "sessions.insights"],
      transport: "http",
      path: "/nano-cloud-session/sessions",
      methods: ["POST"],
      bodyLimit: 65536,
      dispatch: { field: "op", cases: { list: "sessions.list", insights: "sessions.insights" } }
    },
    "http.session": {
      operationIds: [
        "session.native_open",
        "session.workspace_shell",
        "session.get",
        "session.messages",
        "session.attachments",
        "session.insights",
        "session.generate_insights",
        "session.tags",
        "session.set_tags",
        "session.append_tags",
        "session.sleep"
      ],
      transport: "http",
      path: "/nano-cloud-session/session",
      methods: ["POST"],
      bodyLimit: 65536,
      dispatch: { field: "op", cases: {
        native_open: "session.native_open",
        workspace_shell: "session.workspace_shell",
        get: "session.get",
        messages: "session.messages",
        attachments: "session.attachments",
        insights: "session.insights",
        generate_insights: "session.generate_insights",
        tags: "session.tags",
        set_tags: "session.set_tags",
        append_tags: "session.append_tags",
        sleep: "session.sleep"
      } }
    },
    "http.create": { operationIds: ["session.create"], transport: "http", path: "/nano-cloud-session/create", methods: ["POST"], bodyLimit: 262144 },
    "http.message": { operationIds: ["session.message"], transport: "http", path: "/nano-cloud-session/message", methods: ["POST"], bodyLimit: 65536 },
    "http.archive": { operationIds: ["session.archive"], transport: "http", path: "/nano-cloud-session/archive", methods: ["POST"], bodyLimit: 16384 },
    "http.unarchive": { operationIds: ["session.unarchive"], transport: "http", path: "/nano-cloud-session/unarchive", methods: ["POST"], bodyLimit: 16384 },
    "http.terminate": { operationIds: ["session.terminate"], transport: "http", path: "/nano-cloud-session/terminate", methods: ["POST"], bodyLimit: 16384 },
    "http.catalog": { operationIds: ["catalog.read"], transport: "http", path: "/nano-cloud-session/catalog", methods: ["POST"], bodyLimit: 16384 },
    "http.upload": { operationIds: ["attachment.upload"], transport: "http", path: "/nano-cloud-session/upload", methods: ["POST"], bodyLimit: 33554432 },
    "http.ssh": { operationIds: ["ssh.info"], transport: "http", path: "/nano-cloud-session/ssh", methods: ["POST"], bodyLimit: 16384 }
  },
  providers: {
    devin: {
      plugin: "dsh-nano-cloud-session",
      supports: Object.keys({
        "http.status": 1,
        "http.config": 1,
        "http.sessions": 1,
        "http.session": 1,
        "http.create": 1,
        "http.message": 1,
        "http.archive": 1,
        "http.unarchive": 1,
        "http.terminate": 1,
        "http.catalog": 1,
        "http.upload": 1,
        "http.ssh": 1
      }).map((bindingId) => ({ bindingId })),
      constraintsRef: "dncs.devin.api"
    }
  }
});
var EXISTING_HTTP_PATHS = Object.freeze(
  Object.values(SESSION_FAMILY.bindings).map((binding) => binding.path)
);

// src/contracts/workspace-family.js
var WORKSPACE_FAILURES = Object.freeze([
  "invalid-request",
  "workspace-unavailable",
  "workspace-scope-expired",
  "workspace-denied",
  "workspace-not-found",
  "workspace-conflict",
  "workspace-limit",
  "workspace-failed",
  "workspace-outcome-unknown"
]);
var HTTP_STATUS_FOR_REASON = Object.freeze({
  "invalid-request": 422,
  "workspace-unavailable": 503,
  "workspace-scope-expired": 409,
  "workspace-denied": 403,
  "workspace-not-found": 404,
  "workspace-conflict": 409,
  "workspace-limit": 413,
  "workspace-failed": 502,
  "workspace-outcome-unknown": 502
});
var CONSTRAINTS = Object.freeze({
  maxFrameBytes: 1024 * 1024,
  maxFilePageBytes: 64 * 1024,
  maxInFlight: 8,
  maxProcesses: 4,
  readTimeoutMs: 2e4,
  mcpProtocol: "2025-06-18"
});
var op2 = (semanticsRef) => ({
  input: { type: "object" },
  output: { type: "object" },
  failures: WORKSPACE_FAILURES.slice(),
  semanticsRef
});
var RESOURCE_OPERATION_IDS = Object.freeze([
  "workspace.inspect",
  "fs.list",
  "fs.stat",
  "fs.read",
  "fs.write",
  "fs.mkdir",
  "fs.rename",
  "fs.remove",
  "process.start",
  "process.read",
  "process.wait",
  "process.terminate"
]);
function pathField(input) {
  const path = requireString(input.path, "path", { min: 1, max: 4096 });
  if (path.includes("\0")) {
    const error = new Error("path must not contain NUL");
    error.reason = "invalid-request";
    throw error;
  }
  return path;
}
var RESOURCE_CODECS = Object.freeze({
  "workspace.inspect": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set());
      return {};
    }
  },
  "fs.list": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["path", "cursor", "limit"]));
      return {
        path: pathField(input),
        cursor: input.cursor === void 0 ? void 0 : requireString(input.cursor, "cursor", { min: 1, max: 512 }),
        limit: optionalInteger(input.limit, "limit", { min: 1, max: 2e3 })
      };
    }
  },
  "fs.stat": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["path"]));
      return { path: pathField(input) };
    }
  },
  "fs.read": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["path", "offset", "length"]));
      const length = optionalInteger(input.length, "length", { min: 1, max: CONSTRAINTS.maxFilePageBytes }) ?? CONSTRAINTS.maxFilePageBytes;
      const offset = optionalInteger(input.offset, "offset", { min: 0 }) ?? 0;
      return { path: pathField(input), offset, length };
    }
  },
  "fs.write": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["path", "bytes", "expectedVersion", "createOnly"]));
      const bytes = decodeBase64(input.bytes, "bytes");
      if (Math.ceil(bytes.length * 0.75) > CONSTRAINTS.maxFilePageBytes) {
        const error = new Error("write exceeds 64 KiB page");
        error.reason = "workspace-limit";
        throw error;
      }
      return {
        path: pathField(input),
        bytes,
        expectedVersion: input.expectedVersion === void 0 ? void 0 : requireString(input.expectedVersion, "expectedVersion", { min: 1, max: 256 }),
        createOnly: optionalBoolean(input.createOnly, "createOnly") === true
      };
    }
  },
  "fs.mkdir": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["path"]));
      return { path: pathField(input) };
    }
  },
  "fs.rename": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["from", "to", "expectedVersion", "overwrite"]));
      if (input.overwrite === true) {
        const error = new Error("overwrite is not supported");
        error.reason = "invalid-request";
        throw error;
      }
      return {
        from: requireString(input.from, "from"),
        to: requireString(input.to, "to"),
        expectedVersion: input.expectedVersion === void 0 ? void 0 : requireString(input.expectedVersion, "expectedVersion", { min: 1, max: 256 }),
        overwrite: false
      };
    }
  },
  "fs.remove": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["path", "expectedVersion", "recursive"]));
      if (input.recursive === true) {
        const error = new Error("recursive delete is not supported");
        error.reason = "invalid-request";
        throw error;
      }
      return {
        path: pathField(input),
        expectedVersion: input.expectedVersion === void 0 ? void 0 : requireString(input.expectedVersion, "expectedVersion", { min: 1, max: 256 }),
        recursive: false
      };
    }
  },
  "process.start": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["argv", "cwd", "envPatch"]));
      if (!Array.isArray(input.argv) || input.argv.length === 0) {
        const error = new Error("argv must be a non-empty array");
        error.reason = "invalid-request";
        throw error;
      }
      const argv = input.argv.map((item, i) => requireString(item, `argv[${i}]`, { min: 1, max: 4096 }));
      if (argv.some((item) => item.includes("\0"))) {
        const error = new Error("argv must not contain NUL");
        error.reason = "invalid-request";
        throw error;
      }
      const envPatch = input.envPatch;
      if (envPatch !== void 0) {
        if (!envPatch || typeof envPatch !== "object" || Array.isArray(envPatch)) {
          const error = new Error("envPatch must be an object");
          error.reason = "invalid-request";
          throw error;
        }
        for (const [key, value] of Object.entries(envPatch)) {
          if (typeof key !== "string" || typeof value !== "string") {
            const error = new Error("envPatch values must be strings");
            error.reason = "invalid-request";
            throw error;
          }
        }
      }
      return {
        argv,
        cwd: input.cwd === void 0 ? "." : requireString(input.cwd, "cwd"),
        envPatch
      };
    }
  },
  "process.read": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["processHandle", "stdoutOffset", "stderrOffset", "limit"]));
      return {
        processHandle: requireString(input.processHandle, "processHandle", { min: 8, max: 128 }),
        stdoutOffset: optionalInteger(input.stdoutOffset, "stdoutOffset", { min: 0 }) ?? 0,
        stderrOffset: optionalInteger(input.stderrOffset, "stderrOffset", { min: 0 }) ?? 0,
        limit: optionalInteger(input.limit, "limit", { min: 1, max: CONSTRAINTS.maxFilePageBytes }) ?? CONSTRAINTS.maxFilePageBytes
      };
    }
  },
  "process.wait": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["processHandle", "timeoutMs"]));
      return {
        processHandle: requireString(input.processHandle, "processHandle", { min: 8, max: 128 }),
        timeoutMs: optionalInteger(input.timeoutMs, "timeoutMs", { min: 0, max: 12e4 }) ?? 0
      };
    }
  },
  "process.terminate": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["processHandle"]));
      return { processHandle: requireString(input.processHandle, "processHandle", { min: 8, max: 128 }) };
    }
  }
});
var WORKSPACE_FAMILY = defineFamily({
  contractId: "dncs.workspace.v1",
  authorityRefs: {
    "docs/specs/dsh-nano-cloud-session/design-1119.md#R1": { approved: true },
    "docs/specs/dsh-nano-cloud-session/design-1119.md#R2": { approved: true },
    "docs/specs/dsh-nano-cloud-session/design-1119.md#R3": { approved: true },
    "docs/specs/dsh-nano-cloud-session/design-1119.md#R4": { approved: true },
    "docs/specs/dsh-nano-cloud-session/design-1119.md#R5": { approved: true }
  },
  operations: {
    "workspace.connect": op2("workspace/connect"),
    "workspace.status": op2("workspace/status"),
    "workspace.disconnect": op2("workspace/disconnect"),
    "workspace.inspect": op2("workspace/inspect"),
    "fs.list": op2("fs/list"),
    "fs.stat": op2("fs/stat"),
    "fs.read": op2("fs/read"),
    "fs.write": op2("fs/write"),
    "fs.mkdir": op2("fs/mkdir"),
    "fs.rename": op2("fs/rename"),
    "fs.remove": op2("fs/remove"),
    "process.start": op2("process/start"),
    "process.read": op2("process/read"),
    "process.wait": op2("process/wait"),
    "process.terminate": op2("process/terminate")
  },
  bindings: {
    "http.workspace": {
      operationIds: ["workspace.connect", "workspace.status", "workspace.disconnect", "workspace.inspect"],
      transport: "http",
      path: "/nano-cloud-session/workspace",
      methods: ["POST"],
      bodyLimit: 65536,
      dispatch: { field: "op", cases: {
        connect: "workspace.connect",
        status: "workspace.status",
        disconnect: "workspace.disconnect",
        inspect: "workspace.inspect"
      } }
    },
    "http.resources": {
      operationIds: RESOURCE_OPERATION_IDS.slice(),
      transport: "http",
      path: "/nano-cloud-session/resources",
      methods: ["POST"],
      bodyLimit: 131072,
      dispatch: { field: "op", cases: Object.fromEntries(RESOURCE_OPERATION_IDS.map((id) => [id, id])) }
    },
    "mcp.resources": {
      operationIds: RESOURCE_OPERATION_IDS.slice(),
      transport: "mcp-stdio",
      protocol: CONSTRAINTS.mcpProtocol,
      dispatch: { field: "name", cases: Object.fromEntries(RESOURCE_OPERATION_IDS.map((id) => [id, id])) }
    }
  },
  providers: {
    devin: {
      plugin: "dsh-nano-cloud-session",
      supports: [
        { bindingId: "http.workspace" },
        { bindingId: "http.resources" },
        { bindingId: "mcp.resources" }
      ],
      constraintsRef: "dncs.devin.ssh"
    }
  }
});
function mcpToolsList() {
  return RESOURCE_OPERATION_IDS.map((name2) => ({
    name: name2,
    description: name2,
    inputSchema: { type: "object", additionalProperties: false }
  }));
}

// src/providers/devin/session-id.js
var DEVIN_SSH_GATEWAY = "ssh.devin.ai";
var DEVIN_SSH_PORT = 22;
var BARE_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,127}$/;
var SessionIdError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "SessionIdError";
    this.reason = "invalid-request";
    this.status = 422;
  }
};
function parseRemoteSessionId(raw) {
  const value = String(raw ?? "").trim();
  if (value === "" || /[\s@'"\\;|&$`\n\r\t]/.test(value) || value.includes("://")) {
    throw new SessionIdError("session_id must be a Devin session id");
  }
  if (value.startsWith("-") || value.includes(" -") || /(^|[^A-Za-z0-9-])-o(?: |$)/.test(value)) {
    throw new SessionIdError("session_id must be a Devin session id");
  }
  const bare = value.startsWith("devin-") ? value.slice("devin-".length) : value;
  if (!BARE_RE.test(bare)) throw new SessionIdError("session_id must be a Devin session id");
  const prefixed = `devin-${bare}`;
  return Object.freeze({
    bare,
    prefixed,
    gatewayUser: prefixed,
    gatewayHost: DEVIN_SSH_GATEWAY,
    gatewayPort: DEVIN_SSH_PORT
  });
}

// src/host/workspace-scopes.js
import { randomBytes as randomBytes2, randomUUID } from "node:crypto";

// src/host/errors.js
var WorkspaceError = class extends Error {
  constructor(reason, message, { httpStatus, providerStatus = 0 } = {}) {
    super(String(message ?? reason).slice(0, 300));
    this.name = "WorkspaceError";
    this.reason = reason;
    this.httpStatus = httpStatus;
    this.providerStatus = providerStatus;
    this.status = httpStatus;
  }
};
var NativeError = class extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = "NativeError";
    this.reason = code;
    this.nativeCode = code;
    this.status = status;
    this.httpStatus = status;
    this.providerStatus = 0;
  }
};
function httpStatusForError(error) {
  if (error?.nativeCode != null) return error.status >= 400 ? error.status : 502;
  if (error?.httpStatus >= 400) return error.httpStatus;
  if (error?.status >= 400 && error.status < 500) return error.status;
  return 502;
}

// src/host/workspace-scopes.js
function logicalKey(providerKey, profileId, remoteSessionId) {
  return `${providerKey}\0${profileId}\0${remoteSessionId}`;
}
function newId() {
  return randomBytes2(18).toString("base64url");
}
function fail2(reason, message) {
  throw new WorkspaceError(reason, message, { httpStatus: HTTP_STATUS_FOR_REASON[reason] ?? 502 });
}
function createWorkspaceScopes({ configEpochOf } = {}) {
  const byId = /* @__PURE__ */ new Map();
  const byLogical = /* @__PURE__ */ new Map();
  const inflight = /* @__PURE__ */ new Map();
  const waiters = /* @__PURE__ */ new Set();
  const snapshot = (scope) => ({
    scopeId: scope.id,
    providerKey: scope.providerKey,
    profileId: scope.profileId,
    remoteSessionId: scope.remoteSessionId,
    generation: scope.generation,
    configEpoch: scope.configEpoch,
    root: scope.root,
    api: scope.api,
    resources: scope.resources,
    nativeView: scope.nativeView,
    remoteSessionStatus: scope.remoteSessionStatus,
    permissions: { ...scope.permissions },
    inspect: scope.inspect
  });
  const get = (scopeId) => {
    const scope = byId.get(String(scopeId ?? ""));
    if (!scope || scope.invalid) fail2("workspace-scope-expired", "workspace scope is not valid");
    return scope;
  };
  const invalidate = (scope, reason = "workspace-scope-expired") => {
    scope.invalid = true;
    scope.generation = `${scope.generation}:dead`;
    scope.resources = "closing";
    try {
      scope.abort.abort({ reason });
    } catch {
    }
    for (const waiter of [...scope.barriers]) {
      try {
        waiter(reason);
      } catch {
      }
    }
    scope.barriers.clear();
  };
  return {
    snapshot,
    get,
    getIf(scopeId) {
      return byId.get(String(scopeId ?? "")) ?? null;
    },
    list() {
      return [...byId.values()].filter((s) => !s.invalid).map(snapshot);
    },
    logicalKey(profile, remote) {
      const id = parseRemoteSessionId(remote);
      return logicalKey(PROVIDER_KEY, profile.id, id.prefixed);
    },
    async connect(profile, body, factory) {
      const remote = parseRemoteSessionId(body.session_id ?? body.remoteSessionId);
      const key = logicalKey(PROVIDER_KEY, profile.id, remote.prefixed);
      const epoch = configEpochOf ? configEpochOf() : 0;
      const existing = byLogical.get(key);
      if (existing && !existing.invalid && existing.configEpoch === epoch && existing.resources === "ready") {
        return snapshot(existing);
      }
      const running = inflight.get(key);
      if (running) return running;
      const work = (async () => {
        const abort = new AbortController();
        const scope = {
          id: newId(),
          providerKey: PROVIDER_KEY,
          profileId: profile.id,
          remoteSessionId: remote.prefixed,
          remote,
          generation: randomUUID(),
          configEpoch: epoch,
          root: null,
          api: "checking",
          resources: "connecting",
          nativeView: "unavailable",
          remoteSessionStatus: null,
          permissions: Object.freeze({
            fsWrite: body.authorize?.includes?.("fs.write") === true,
            process: body.authorize?.includes?.("process.start") === true,
            forward: body.authorize?.includes?.("forward") === true
          }),
          inspect: null,
          handles: /* @__PURE__ */ new Map(),
          tunnels: /* @__PURE__ */ new Map(),
          barriers: /* @__PURE__ */ new Set(),
          abort,
          invalid: false,
          profileSnapshot: Object.freeze({
            id: profile.id,
            orgId: profile.orgId,
            baseUrl: profile.baseUrl,
            secret: profile.secret
          })
        };
        byId.set(scope.id, scope);
        byLogical.set(key, scope);
        try {
          const result = await factory(scope, { signal: abort.signal, body });
          if (scope.invalid) fail2("workspace-scope-expired", "workspace scope expired during connect");
          if (result?.root) scope.root = result.root;
          if (result?.inspect) scope.inspect = result.inspect;
          if (result?.remoteSessionStatus) scope.remoteSessionStatus = result.remoteSessionStatus;
          scope.api = result?.api ?? "ready";
          scope.resources = result?.resources ?? "ready";
          scope.nativeView = result?.nativeView ?? "unavailable";
          return snapshot(scope);
        } catch (error) {
          invalidate(scope, error?.reason ?? "workspace-failed");
          byId.delete(scope.id);
          if (byLogical.get(key) === scope) byLogical.delete(key);
          await scope.cleanup?.().catch(() => {
          });
          throw error;
        } finally {
          inflight.delete(key);
        }
      })();
      inflight.set(key, work);
      const tracked = work.catch((error) => error);
      waiters.add(tracked);
      tracked.finally(() => waiters.delete(tracked));
      return work;
    },
    status(scopeId) {
      return snapshot(get(scopeId));
    },
    async disconnect(scopeId) {
      const scope = get(scopeId);
      invalidate(scope, "disconnect");
      byId.delete(scope.id);
      const key = logicalKey(scope.providerKey, scope.profileId, scope.remoteSessionId);
      if (byLogical.get(key) === scope) byLogical.delete(key);
      await scope.cleanup?.().catch(() => {
      });
      return { ok: true };
    },
    invalidateProfile(profileId) {
      for (const scope of [...byId.values()]) {
        if (scope.profileId === profileId && !scope.invalid) invalidate(scope, "workspace-scope-expired");
      }
    },
    invalidateAll() {
      for (const scope of [...byId.values()]) invalidate(scope, "workspace-scope-expired");
      byId.clear();
      byLogical.clear();
    },
    track(scope, promise) {
      waiters.add(promise);
      promise.finally(() => waiters.delete(promise));
      return promise;
    },
    async drain() {
      await Promise.allSettled([...waiters]);
    },
    requireReady(scopeId, { write = false, process: process2 = false, forward = false } = {}) {
      const scope = get(scopeId);
      if (scope.resources !== "ready") fail2("workspace-unavailable", "workspace resources are not ready");
      if (write && !scope.permissions.fsWrite) fail2("workspace-denied", "fs write is not authorized");
      if (process2 && !scope.permissions.process) fail2("workspace-denied", "process execution is not authorized");
      if (forward && !scope.permissions.forward) fail2("workspace-denied", "port forward is not authorized");
      return scope;
    }
  };
}

// src/host/resource-service.js
import { existsSync as existsSync5 } from "node:fs";

// src/providers/devin/ssh.js
import { spawn } from "node:child_process";
import { appendFileSync, chmodSync as chmodSync2, existsSync as existsSync3, mkdirSync as mkdirSync2, readFileSync as readFileSync3 } from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { dirname as dirname2, join as join3 } from "node:path";
var FORBIDDEN_OPT = /StrictHostKeyChecking=no|^-A$|^-R$|^-N$/;
function dedicatedKeyPath(home3 = process.env.DSH_HOME || homedir()) {
  return join3(home3, "nano-cloud-session-ssh");
}
function knownHostsPath(home3 = process.env.DSH_HOME || homedir()) {
  return join3(home3, "nano-cloud-session-known-hosts");
}
function systemIdentityPath() {
  return join3(homedir(), ".ssh", "id_ed25519");
}
function resolveIdentityFile({ home: home3, identityFile } = {}) {
  if (identityFile) {
    if (identityFile.includes("\0") || identityFile.includes("\n")) {
      throw new WorkspaceError("invalid-request", "identityFile is invalid", { httpStatus: 422 });
    }
    return identityFile;
  }
  const dedicated = dedicatedKeyPath(home3);
  if (existsSync3(dedicated)) return dedicated;
  const system = systemIdentityPath();
  if (existsSync3(system)) return system;
  throw new WorkspaceError("workspace-unavailable", "no SSH identity file", { httpStatus: 503 });
}
function buildSshArgv({
  identityFile,
  knownHostsFile,
  sessionId,
  remoteArgv,
  pty = false,
  localForwards = [],
  extraOptions = [],
  strictHostKeyChecking = "yes"
} = {}) {
  const id = parseRemoteSessionId(sessionId);
  if (strictHostKeyChecking !== "yes") {
    throw new WorkspaceError("invalid-request", "StrictHostKeyChecking must be yes; pin the fingerprint first", { httpStatus: 422 });
  }
  for (const opt of extraOptions) {
    const text = String(opt);
    if (FORBIDDEN_OPT.test(text) || /ForwardAgent=yes|ForwardX11=yes|PermitLocalCommand=yes/.test(text)) {
      throw new WorkspaceError("invalid-request", "forbidden SSH option", { httpStatus: 422 });
    }
  }
  if (!identityFile || identityFile.startsWith("-")) {
    throw new WorkspaceError("invalid-request", "identityFile is invalid", { httpStatus: 422 });
  }
  if (!knownHostsFile || knownHostsFile.startsWith("-")) {
    throw new WorkspaceError("invalid-request", "knownHostsFile is invalid", { httpStatus: 422 });
  }
  const argv = ["ssh"];
  if (pty) argv.push("-tt");
  argv.push(
    "-i",
    identityFile,
    "-o",
    "IdentitiesOnly=yes",
    "-o",
    "BatchMode=yes",
    "-o",
    "ForwardAgent=no",
    "-o",
    "ForwardX11=no",
    "-o",
    "PermitLocalCommand=no",
    "-o",
    `UserKnownHostsFile=${knownHostsFile}`,
    "-o",
    "GlobalKnownHostsFile=/dev/null",
    "-o",
    `StrictHostKeyChecking=${strictHostKeyChecking}`,
    "-o",
    "ExitOnForwardFailure=yes",
    "-o",
    "ServerAliveInterval=30",
    "-o",
    "ServerAliveCountMax=6",
    "-p",
    String(DEVIN_SSH_PORT)
  );
  for (const opt of extraOptions) argv.push("-o", String(opt));
  for (const forward of localForwards) {
    const local = Number(forward.local);
    const remote = Number(forward.remote);
    if (!Number.isInteger(local) || local < 0 || local > 65535) {
      throw new WorkspaceError("invalid-request", "invalid local forward port", { httpStatus: 422 });
    }
    if (!Number.isInteger(remote) || remote < 1 || remote > 65535) {
      throw new WorkspaceError("invalid-request", "invalid remote forward port", { httpStatus: 422 });
    }
    argv.push("-L", `127.0.0.1:${local}:127.0.0.1:${remote}`);
  }
  argv.push("-l", id.gatewayUser, DEVIN_SSH_GATEWAY);
  if (remoteArgv && remoteArgv.length > 0) {
    for (const token of remoteArgv) {
      if (typeof token !== "string" || token === "" || !/^[A-Za-z0-9._/=+-]+$/.test(token)) {
        throw new WorkspaceError("invalid-request", "refusing unsafe remote argv token", { httpStatus: 422 });
      }
    }
    argv.push(remoteArgv.join(" "));
  }
  if (argv.includes("-A") || argv.includes("-R") || argv.includes("-N")) {
    throw new WorkspaceError("invalid-request", "forbidden SSH flag", { httpStatus: 422 });
  }
  return argv;
}
function spawnSsh(argv, { spawnImpl = spawn, env, stdio = "pipe" } = {}) {
  if (!Array.isArray(argv) || argv[0] !== "ssh") {
    throw new WorkspaceError("invalid-request", "ssh argv must start with ssh", { httpStatus: 422 });
  }
  const childEnv = { PATH: env?.PATH ?? process.env.PATH };
  delete childEnv.SSH_AUTH_SOCK;
  for (const key of Object.keys(env ?? {})) {
    if (key.startsWith("DSH_") || key.includes("TOKEN") || key.includes("SECRET") || key === "SSH_AUTH_SOCK") continue;
    if (key === "HOME" || key === "USER" || key === "LANG" || key === "LC_ALL") childEnv[key] = env[key];
  }
  return spawnImpl(argv[0], argv.slice(1), { env: childEnv, stdio });
}
function fingerprintEd25519(b64) {
  const raw = Buffer.from(String(b64), "base64");
  return `SHA256:${createHash("sha256").update(raw).digest("base64").replace(/=+$/, "")}`;
}
function parseKeyscanLine(line) {
  const parts = String(line).trim().split(/\s+/).filter(Boolean);
  let i = 0;
  if (parts[0] && !parts[0].startsWith("ssh-") && !parts[0].startsWith("ecdsa-")) i = 1;
  const kind = parts[i];
  const b64 = parts[i + 1];
  if (!kind || !b64) throw new WorkspaceError("workspace-unavailable", "invalid host key line", { httpStatus: 503 });
  return { kind, b64, fingerprint: fingerprintEd25519(b64) };
}
function knownHostPinned(knownHostsFile, host = DEVIN_SSH_GATEWAY) {
  if (!existsSync3(knownHostsFile)) return false;
  return readFileSync3(knownHostsFile, "utf8").split("\n").some((line) => line.includes(host) && /ssh-ed25519|ecdsa-sha2/.test(line));
}
async function scanGatewayKey({ spawnImpl = spawn } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl("ssh-keyscan", ["-t", "ed25519", "-T", "10", DEVIN_SSH_GATEWAY], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { PATH: process.env.PATH }
    });
    const out = [];
    child.stdout?.on("data", (chunk) => out.push(chunk));
    child.stderr?.on("data", () => {
    });
    child.on("error", (error) => reject(new WorkspaceError("workspace-failed", error.message, { httpStatus: 502 })));
    child.on("close", () => {
      try {
        const text = Buffer.concat(out).toString("utf8");
        const line = text.split("\n").find((row) => row.includes("ssh-ed25519"));
        if (!line) {
          reject(new WorkspaceError("workspace-unavailable", "could not scan gateway host key", { httpStatus: 503 }));
          return;
        }
        resolve(parseKeyscanLine(line));
      } catch (error) {
        reject(error);
      }
    });
  });
}
function pinGatewayKey(knownHostsFile, scanned, expectedFingerprint) {
  if (!expectedFingerprint || scanned.fingerprint !== expectedFingerprint) {
    const error = new WorkspaceError("workspace-denied", "host key fingerprint confirmation required", { httpStatus: 403 });
    error.fingerprint = scanned.fingerprint;
    error.keyKind = scanned.kind;
    throw error;
  }
  mkdirSync2(dirname2(knownHostsFile), { recursive: true });
  const entry = `${DEVIN_SSH_GATEWAY} ${scanned.kind} ${scanned.b64}
`;
  const prev = existsSync3(knownHostsFile) ? readFileSync3(knownHostsFile, "utf8") : "";
  if (!prev.includes(scanned.b64)) appendFileSync(knownHostsFile, entry, { mode: 384 });
  chmodSync2(knownHostsFile, 384);
}
async function ensurePinnedGateway({ knownHostsFile, expectedFingerprint, spawnImpl }) {
  if (knownHostPinned(knownHostsFile)) return { pinned: true };
  const scanned = await scanGatewayKey({ spawnImpl });
  if (!expectedFingerprint) {
    const error = new WorkspaceError("workspace-denied", "host key fingerprint confirmation required", { httpStatus: 403 });
    error.fingerprint = scanned.fingerprint;
    error.keyKind = scanned.kind;
    throw error;
  }
  pinGatewayKey(knownHostsFile, scanned, expectedFingerprint);
  return { pinned: true, fingerprint: scanned.fingerprint };
}
function execSsh(argv, { spawnImpl = spawn, timeoutMs = 2e4, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnSsh(argv, { spawnImpl });
    const stdout = [];
    const stderr = [];
    let settled = false;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      if (!settled) {
        settled = true;
        reject(new WorkspaceError("workspace-unavailable", "ssh exec timed out", { httpStatus: 503 }));
      }
    }, timeoutMs);
    child.stdout?.on("data", (chunk) => stdout.push(chunk));
    child.stderr?.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(new WorkspaceError("workspace-failed", error.message, { httpStatus: 502 }));
      }
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      resolve({
        code: code ?? 1,
        signal: signal ?? null,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8").slice(0, 4e3)
      });
    });
    if (input != null) {
      child.stdin.write(input);
      child.stdin.end();
    } else {
      child.stdin?.end();
    }
  });
}

// src/providers/devin/bootstrap.js
import { createHash as createHash2 } from "node:crypto";
import { chmodSync as chmodSync3, existsSync as existsSync4, mkdirSync as mkdirSync3, readFileSync as readFileSync4, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname as dirname3, join as join4 } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn as spawn2 } from "node:child_process";
var FIXED_PROBE = Object.freeze([
  ["uname", "-s", "-m"],
  ["pwd"],
  ["id", "-un"]
]);
function artifactPath() {
  const candidates = [
    fileURLToPath(new URL("./remote/devin-workspace.mjs", import.meta.url)),
    fileURLToPath(new URL("../remote/devin-workspace.mjs", import.meta.url)),
    fileURLToPath(new URL("../../../lib/remote/devin-workspace.mjs", import.meta.url))
  ];
  for (const candidate of candidates) {
    if (existsSync4(candidate)) return candidate;
  }
  return candidates[0];
}
function hashFile(path) {
  return createHash2("sha256").update(readFileSync4(path)).digest("hex");
}
function sshOpts(sessionId, { identityFile, knownHostsFile }) {
  return {
    identityFile,
    knownHostsFile,
    sessionId,
    strictHostKeyChecking: "yes"
  };
}
async function probeWorkspace({ sessionId, identityFile, knownHostsFile, spawnImpl, expectedFingerprint }) {
  await ensurePinnedGateway({ knownHostsFile, expectedFingerprint, spawnImpl });
  const id = parseRemoteSessionId(sessionId);
  const facts = { gatewayUser: id.gatewayUser, gatewayHost: id.gatewayHost };
  const runs = [];
  for (const remoteArgv of FIXED_PROBE) {
    const argv = buildSshArgv({ ...sshOpts(sessionId, { identityFile, knownHostsFile }), remoteArgv });
    const result = await execSsh(argv, { spawnImpl, timeoutMs: 2e4 });
    runs.push({ argv: remoteArgv, code: result.code, stdout: result.stdout.trim().slice(0, 200) });
    if (result.code !== 0) {
      throw new WorkspaceError("workspace-unavailable", `probe ${remoteArgv[0]} failed`, { httpStatus: 503 });
    }
  }
  const nodeCandidates = [
    ["node", "-v"],
    ["/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node", "-v"]
  ];
  let node = "";
  for (const remoteArgv of nodeCandidates) {
    try {
      const argv = buildSshArgv({ ...sshOpts(sessionId, { identityFile, knownHostsFile }), remoteArgv });
      const result = await execSsh(argv, { spawnImpl, timeoutMs: 2e4 });
      if (result.code === 0 && result.stdout.includes("v")) {
        node = `${remoteArgv[0]} ${result.stdout.trim()}`.slice(0, 200);
        break;
      }
    } catch {
    }
  }
  facts.probe = runs;
  facts.node = node;
  if (!node.includes("v")) {
    throw new WorkspaceError("workspace-unavailable", "remote Node >=20 is required", { httpStatus: 503 });
  }
  const version2 = /v(\d+)/.exec(node);
  if (version2 && Number(version2[1]) < 20) {
    throw new WorkspaceError("workspace-unavailable", "remote Node >=20 is required", { httpStatus: 503 });
  }
  return facts;
}
function scpArgv({ identityFile, knownHostsFile, sessionId, local, remote }) {
  const id = parseRemoteSessionId(sessionId);
  if (remote.startsWith("-") || /[\n\r;|&`$]/.test(remote)) {
    throw new WorkspaceError("invalid-request", "unsafe remote path", { httpStatus: 422 });
  }
  return [
    "scp",
    "-i",
    identityFile,
    "-o",
    "IdentitiesOnly=yes",
    "-o",
    "BatchMode=yes",
    "-o",
    "ForwardAgent=no",
    "-o",
    `UserKnownHostsFile=${knownHostsFile}`,
    "-o",
    "GlobalKnownHostsFile=/dev/null",
    "-o",
    "StrictHostKeyChecking=yes",
    "-P",
    "22",
    local,
    `${id.gatewayUser}@${id.gatewayHost}:${remote}`
  ];
}
async function publishArtifact({ sessionId, identityFile, knownHostsFile, spawnImpl = spawn2, expectedFingerprint, artifact = artifactPath() }) {
  await ensurePinnedGateway({ knownHostsFile, expectedFingerprint, spawnImpl });
  if (!existsSync4(artifact)) {
    throw new WorkspaceError("workspace-unavailable", "remote bridge artifact is missing", { httpStatus: 503 });
  }
  const hash = hashFile(artifact);
  const remoteDir = `.dncs-bridge/${hash}`;
  const remoteFile = `${remoteDir}/devin-workspace.mjs`;
  const remoteTmp = `${remoteFile}.tmp`;
  const mkdirArgv = buildSshArgv({
    identityFile,
    knownHostsFile,
    sessionId,
    remoteArgv: ["mkdir", "-p", remoteDir]
  });
  const made = await execSsh(mkdirArgv, { spawnImpl });
  if (made.code !== 0) throw new WorkspaceError("workspace-failed", "could not create artifact dir", { httpStatus: 502 });
  const chmodArgv = buildSshArgv({
    identityFile,
    knownHostsFile,
    sessionId,
    remoteArgv: ["chmod", "700", remoteDir]
  });
  const mode = await execSsh(chmodArgv, { spawnImpl });
  if (mode.code !== 0) throw new WorkspaceError("workspace-failed", "could not lock artifact dir mode 0700", { httpStatus: 502 });
  const argv = scpArgv({ identityFile, knownHostsFile, sessionId, local: artifact, remote: remoteTmp });
  const result = await new Promise((resolve, reject) => {
    const child = spawnImpl(argv[0], argv.slice(1), { stdio: ["ignore", "pipe", "pipe"], env: { PATH: process.env.PATH } });
    const stderr = [];
    child.stderr.on("data", (c) => stderr.push(c));
    child.on("close", (code) => resolve({ code, stderr: Buffer.concat(stderr).toString("utf8") }));
    child.on("error", reject);
  });
  if (result.code !== 0) {
    throw new WorkspaceError("workspace-failed", "artifact upload failed", { httpStatus: 502 });
  }
  const moved = await execSsh(buildSshArgv({
    identityFile,
    knownHostsFile,
    sessionId,
    remoteArgv: ["mv", "-f", remoteTmp, remoteFile]
  }), { spawnImpl });
  if (moved.code !== 0) throw new WorkspaceError("workspace-failed", "artifact publish rename failed", { httpStatus: 502 });
  const check = await execSsh(buildSshArgv({
    identityFile,
    knownHostsFile,
    sessionId,
    remoteArgv: ["sha256sum", remoteFile]
  }), { spawnImpl });
  if (!check.stdout.includes(hash)) {
    throw new WorkspaceError("workspace-failed", "artifact hash mismatch", { httpStatus: 502 });
  }
  return { hash, remoteFile, remoteDir };
}
function ensureKnownHostsFile(home3, { seed } = {}) {
  const path = knownHostsPath(home3);
  mkdirSync3(dirname3(path), { recursive: true });
  if (!existsSync4(path) && seed) writeFileSync2(path, `${seed}
`, { mode: 384 });
  if (existsSync4(path)) chmodSync3(path, 384);
  return path;
}

// src/providers/devin/mcp-client.js
function fail3(reason, message) {
  throw new WorkspaceError(reason, message, { httpStatus: HTTP_STATUS_FOR_REASON[reason] ?? 502 });
}
function createMcpClient(child, { timeoutMs = CONSTRAINTS.readTimeoutMs } = {}) {
  let nextId = 1;
  let buffer = "";
  const pending = /* @__PURE__ */ new Map();
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (!line.trim()) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      const waiter = pending.get(message.id);
      if (waiter) {
        pending.delete(message.id);
        waiter(message);
      }
    }
  });
  child.on("exit", () => {
    for (const [id, waiter] of pending) {
      pending.delete(id);
      waiter({ error: { message: "mcp child exited" } });
    }
  });
  const request2 = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new WorkspaceError("workspace-unavailable", `${method} timed out`, { httpStatus: 503 }));
    }, timeoutMs);
    pending.set(id, (message) => {
      clearTimeout(timer);
      if (message.error) reject(new WorkspaceError("workspace-failed", message.error.message, { httpStatus: 502 }));
      else resolve(message.result);
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}
`);
  });
  const notify = (method, params) => {
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}
`);
  };
  return {
    async initialize() {
      const result = await request2("initialize", {
        protocolVersion: CONSTRAINTS.mcpProtocol,
        capabilities: {},
        clientInfo: { name: "dncs-host", version: "0.1.0" }
      });
      if (result?.protocolVersion !== CONSTRAINTS.mcpProtocol) {
        fail3("workspace-failed", `mcp protocol ${result?.protocolVersion ?? "missing"}`);
      }
      notify("notifications/initialized", {});
      return result;
    },
    async listTools() {
      const result = await request2("tools/list", {});
      return result.tools ?? [];
    },
    async call(name2, args) {
      const result = await request2("tools/call", { name: name2, arguments: args });
      const inner = result?.structuredContent;
      if (!inner || inner.ok !== true) {
        fail3(inner?.reason ?? "workspace-failed", inner?.message ?? "tool failed");
      }
      return inner.data;
    },
    cancel(id) {
      notify("notifications/cancelled", { requestId: id });
    },
    close() {
      try {
        child.stdin.end();
      } catch {
      }
      try {
        child.kill("SIGTERM");
      } catch {
      }
    }
  };
}

// src/host-adapters/native-chat.js
function resolveNativeChat(ctx) {
  const owner = typeof ctx.get === "function" ? ctx.get("externalChat") : ctx.externalChat;
  if (owner && typeof owner.open === "function" && owner.capabilities?.externalProjection === true) {
    return { available: true, owner };
  }
  return {
    available: false,
    reason: "NATIVE_UNAVAILABLE",
    message: "host has no formal external Chat view (H-CHAT); native projection is unavailable",
    evidence: {
      package: "@deepseek-ai/dsh-agent@0.2.2-rc.1",
      note: "agents.enter requires a full Agent; fake Agent is forbidden (F22)"
    }
  };
}

// src/host-adapters/execution.js
var HOST_ADAPTER_UNAVAILABLE = Object.freeze({
  pty: Object.freeze({ supported: false, reason: "NATIVE_UNAVAILABLE" }),
  forward: Object.freeze({ supported: false, reason: "NATIVE_UNAVAILABLE" })
});

// src/host/resource-service.js
function fail4(reason, message) {
  throw new WorkspaceError(reason, message, { httpStatus: HTTP_STATUS_FOR_REASON[reason] ?? 502 });
}
var WRITE_OPS = /* @__PURE__ */ new Set(["fs.write", "fs.mkdir", "fs.rename", "fs.remove"]);
var PROCESS_OPS = /* @__PURE__ */ new Set(["process.start", "process.terminate"]);
function createResourceService({ scopes, api, home: home3, spawnImpl, artifactPath: artifactPath2 }) {
  const connectScope = async (scope, { body, signal }) => {
    const profile = scope.profileSnapshot;
    let session;
    try {
      session = await api.getSession(profile, scope.remoteSessionId);
      scope.api = "ready";
      scope.remoteSessionStatus = session?.status ?? null;
    } catch (error) {
      if (error?.reason === "forbidden-or-invisible") {
        fail4("workspace-denied", error.message);
      }
      scope.api = "unavailable";
      fail4("workspace-unavailable", error?.message ?? "API identity check failed");
    }
    let identityFile = resolveIdentityFile({ home: home3, identityFile: body.identityFile });
    const knownHostsFile = ensureKnownHostsFile(home3);
    const expectedFingerprint = typeof body.expectedFingerprint === "string" ? body.expectedFingerprint : void 0;
    scope.resources = "verifying";
    const probeWith = (file) => probeWorkspace({
      sessionId: scope.remoteSessionId,
      identityFile: file,
      knownHostsFile,
      spawnImpl,
      expectedFingerprint
    });
    let inspect;
    try {
      inspect = await probeWith(identityFile);
    } catch (error) {
      const system = systemIdentityPath();
      if (!body.identityFile && identityFile !== system && existsSync5(system) && error?.reason === "workspace-unavailable") {
        identityFile = system;
        inspect = await probeWith(identityFile);
      } else {
        throw error;
      }
    }
    const root = String(body.root ?? inspect.probe.find((p) => p.argv[0] === "pwd")?.stdout ?? "").trim();
    if (!root || !root.startsWith("/")) fail4("invalid-request", "workspace root must be an absolute path");
    if (!/^[A-Za-z0-9._/=+-]+$/.test(root)) fail4("invalid-request", "workspace root contains unsafe characters");
    const published = await publishArtifact({
      sessionId: scope.remoteSessionId,
      identityFile,
      knownHostsFile,
      spawnImpl,
      expectedFingerprint,
      artifact: artifactPath2
    });
    const nodeBin = inspect.node.startsWith("/") ? inspect.node.split(" ")[0] : "node";
    const argv = buildSshArgv({
      identityFile,
      knownHostsFile,
      sessionId: scope.remoteSessionId,
      remoteArgv: [nodeBin, published.remoteFile, "--root", root]
    });
    const child = spawnSsh(argv, { spawnImpl });
    const client = createMcpClient(child);
    scope.cleanup = async () => {
      client.close();
    };
    if (signal?.aborted) {
      client.close();
      fail4("workspace-scope-expired", "connect aborted");
    }
    await client.initialize();
    const listed = await client.listTools();
    const names = new Set(listed.map((t) => t.name));
    for (const tool of mcpToolsList()) {
      if (!names.has(tool.name)) fail4("workspace-failed", `remote tool surface mismatch: missing ${tool.name}`);
    }
    const remoteInspect = await client.call("workspace.inspect", {});
    const confirmed = root.replace(/\/+$/, "");
    const remoteRoot = String(remoteInspect.root ?? "").replace(/\/+$/, "");
    if (remoteRoot !== confirmed && !remoteRoot.startsWith(`${confirmed}/`) && !confirmed.startsWith(`${remoteRoot}/`)) {
      fail4("workspace-failed", "remote root does not match the confirmed path");
    }
    scope.mcp = client;
    scope.child = child;
    return {
      root: remoteInspect.root ?? root,
      inspect: {
        ...inspect,
        remote: { ...remoteInspect, ...HOST_ADAPTER_UNAVAILABLE }
      },
      api: "ready",
      resources: "ready",
      nativeView: "unavailable",
      remoteSessionStatus: session?.status ?? null,
      ...HOST_ADAPTER_UNAVAILABLE
    };
  };
  return {
    connectFactory: (scope, ctx) => connectScope(scope, ctx),
    async call(scopeId, op3, input) {
      if (!RESOURCE_OPERATION_IDS.includes(op3)) fail4("invalid-request", `unknown resource op ${op3}`);
      const body = input ?? {};
      const {
        op: _op,
        scopeId: _scopeId,
        profileId: _profileId,
        generation,
        ...fields
      } = body;
      const decoded = RESOURCE_CODECS[op3].decode(fields);
      const scope = scopes.requireReady(scopeId, {
        write: WRITE_OPS.has(op3),
        process: PROCESS_OPS.has(op3)
      });
      if (generation !== void 0 && generation !== scope.generation) {
        fail4("workspace-scope-expired", "generation mismatch");
      }
      if (!scope.mcp) fail4("workspace-unavailable", "MCP client is not attached");
      return scope.mcp.call(op3, decoded);
    },
    nativeChatStatus(ctx) {
      return resolveNativeChat(ctx);
    }
  };
}

// src/providers/devin/chat.js
async function readMessagePages(api, profile, sessionId, { first = 50, pages = 8 } = {}) {
  const items = [];
  const seen = /* @__PURE__ */ new Set();
  let after;
  let pageCount = 0;
  let cursorStuck = false;
  const errors = [];
  while (pageCount < pages) {
    pageCount += 1;
    let page;
    try {
      page = await api.getMessages(profile, sessionId, { first, after });
    } catch (error) {
      errors.push({ page: pageCount, message: error?.message ?? String(error), reason: error?.reason });
      break;
    }
    const batch = page.items ?? page.messages ?? [];
    if (batch.length === 0) break;
    const startSize = items.length;
    for (const message of batch) {
      const id = message.event_id;
      if (id == null || id === "") {
        items.push({ ...message, identity: "missing-event-id" });
        continue;
      }
      if (seen.has(id)) continue;
      seen.add(id);
      items.push(message);
    }
    const next = page.end_cursor ?? page.cursor ?? page.next;
    if (page.has_next_page === false) break;
    if (!next || next === after) {
      cursorStuck = true;
      break;
    }
    if (items.length === startSize && batch.length > 0) {
    }
    after = next;
  }
  return { items, pages: pageCount, cursorStuck, errors, complete: errors.length === 0 && !cursorStuck };
}

// src/host/assemble.js
var name = "nano-cloud-session";
var inject = ["webServer", "connection", "sessions", "agents"];
var version = true ? "0.1.0" : "0.0.0";
var review = ensurePerfReviewHost().hostJoin("nano-cloud-session", { version });
var Config = {
  "~standard": {
    version: 1,
    vendor: "dsh-nano-cloud-session",
    validate(value) {
      const source = value && typeof value === "object" ? value : {};
      const issues = [];
      const number = (key, fallback, min, max) => {
        const candidate = source[key];
        if (candidate === void 0) return fallback;
        if (typeof candidate !== "number" || !Number.isInteger(candidate) || candidate < min || candidate > max) {
          issues.push({ message: `${key} must be an integer from ${min} to ${max}` });
          return fallback;
        }
        return candidate;
      };
      const requestTimeoutMs = number("requestTimeoutMs", 2e4, 3e3, 12e4);
      const defaultFirst = number("defaultFirst", 50, 1, 200);
      const pollIntervalMs = number("pollIntervalMs", 5e3, 2e3, 6e4);
      if (issues.length > 0) return { issues };
      return { value: { requestTimeoutMs, defaultFirst, pollIntervalMs } };
    }
  }
};
var messageOf = (error) => error instanceof Error ? error.message : String(error);
function apply(ctx, config = {}) {
  const api = createDevinApi({ timeoutMs: config.requestTimeoutMs ?? 2e4 });
  const scopes = createWorkspaceScopes({ configEpochOf: () => store.configEpoch() });
  const store = createProfileStore({
    onEpoch: (_epoch, profileId) => {
      if (profileId) scopes.invalidateProfile(profileId);
      else void scopes.invalidateAll();
    }
  });
  const resources = createResourceService({
    scopes,
    api,
    home: process.env.DSH_HOME || process.env.HOME,
    artifactPath: artifactPath()
  });
  const defaultFirst = config.defaultFirst ?? 50;
  const pick = (profileId) => {
    if (profileId) {
      const found = store.get(profileId);
      if (!found) throw new CarrierError("profile-not-found", `no profile ${profileId}`);
      return found;
    }
    const active = store.active();
    if (!active) throw new CarrierError("no-active-profile", "no carrier profile configured");
    return active;
  };
  const work = (fn) => async (req2, res, route) => {
    try {
      const body = await readJsonBody(req2, route.bodyLimit);
      const result = await fn(body);
      sendJson(res, 200, result === void 0 ? { ok: true } : result);
    } catch (error) {
      if (error instanceof FamilyDispatchError || error?.reason === "unknown-dispatch") {
        sendJson(res, 422, { ok: false, reason: "invalid-request", message: messageOf(error).slice(0, 300) });
        return;
      }
      if (error instanceof WorkspaceError) {
        sendJson(res, error.httpStatus ?? 502, {
          ok: false,
          reason: error.reason,
          message: error.message.slice(0, 300),
          httpStatus: error.httpStatus,
          providerStatus: error.providerStatus ?? 0,
          ...error.fingerprint ? { fingerprint: error.fingerprint, keyKind: error.keyKind } : {}
        });
        return;
      }
      if (error instanceof NativeError || error instanceof CarrierError || error instanceof ProfileCodecError || error instanceof SessionIdError) {
        const status = httpStatusForError(error);
        sendJson(res, status, {
          ok: false,
          reason: error.reason,
          message: error.message.slice(0, 300),
          status: error.status,
          httpStatus: status,
          providerStatus: error.status ?? 0
        });
        return;
      }
      sendJson(res, 500, { ok: false, reason: "failed", message: messageOf(error).slice(0, 300) });
    }
  };
  const securityStatus = () => {
    let mode = null;
    try {
      mode = (statSync2(storePath()).mode & 511).toString(8);
    } catch {
    }
    return {
      storePath: storePath(),
      envPath: envPath(),
      storeMode: mode,
      seededFromEnv: store.seededFromEnv,
      secretPolicy: "write-only, mode 0600, never returned by any route",
      knownHostsPath: `${process.env.DSH_HOME || process.env.HOME}/nano-cloud-session-known-hosts`
    };
  };
  const dispatchConfig = (body) => {
    const action = String(body.action ?? "list");
    try {
      return selectOperation(SESSION_FAMILY, "http.config", action);
    } catch {
      throw new CarrierError("invalid-request", `unknown config action ${action}`, { status: 422 });
    }
  };
  const configAction = async (body) => {
    const op3 = dispatchConfig(body);
    switch (op3) {
      case "config.list":
        return { ok: true, profiles: store.list(), activeId: store.active()?.id ?? null, seededFromEnv: store.seededFromEnv };
      case "config.save": {
        const profile = store.saveProfile(body.profile);
        return { ok: true, profile, profiles: store.list(), activeId: store.active()?.id ?? null };
      }
      case "config.remove":
        store.removeProfile(String(body.profileId ?? ""));
        return { ok: true, profiles: store.list(), activeId: store.active()?.id ?? null };
      case "config.activate":
        store.activate(String(body.profileId ?? ""));
        return { ok: true, profiles: store.list(), activeId: store.active()?.id ?? null };
      case "config.test": {
        const profile = pick(body.profileId);
        const self = await review.hostSpan("self", () => api.self(profile));
        const orgMatch = self.devin_sessions_org_id ? self.devin_sessions_org_id === profile.orgId : null;
        return { ok: true, self, orgMatch };
      }
      case "config.security":
        return { ok: true, security: securityStatus() };
      case "config.ssh-key": {
        const kp = ensureSshKeypair();
        return { ok: true, publicKey: kp.publicKey, privateKeyPath: kp.privateKeyPath, keyMode: kp.mode };
      }
      default:
        throw new CarrierError("invalid-request", `unknown config action`, { status: 422 });
    }
  };
  const needSessionId = (body) => parseRemoteSessionId(body.session_id).prefixed;
  const nativeOpen = async (profile, body) => {
    const chat = resolveNativeChat(ctx);
    if (!chat.available) {
      throw new NativeError("NATIVE_UNAVAILABLE", chat.message, 503);
    }
    const remote = needSessionId(body);
    const opened = await chat.owner.open({
      providerKey: "devin",
      profileId: profile.id,
      remoteSessionId: remote,
      pages: await readMessagePages(api, profile, remote)
    });
    return { ok: true, local_session_id: opened.localId, remote_session_id: remote };
  };
  const shells = /* @__PURE__ */ new Map();
  const workspaceShell = async (profile, body) => {
    if (typeof ctx.sessions?.prepare !== "function" || typeof ctx.sessions?.enter !== "function" || typeof ctx.sessions?.announce !== "function") {
      throw new NativeError("NATIVE_UNAVAILABLE", "host cannot prepare a workbench session without sessions.prepare/enter/announce", 503);
    }
    const remote = needSessionId(body);
    const voidRoot = join5(process.env.DSH_HOME || process.env.HOME || ".", "nano-cloud-session-unbound");
    mkdirSync4(voidRoot, { recursive: true });
    const session = ctx.sessions.prepare(void 0, { meta: { cwd: voidRoot, executionWorld: "unbound-remote" } });
    const detach = ctx.sessions.enter(session);
    try {
      ctx.sessions.announce(session);
    } catch (error) {
      try {
        detach();
      } catch {
      }
      throw new NativeError("NATIVE_UNAVAILABLE", `session announce failed: ${error?.message ?? error}`, 503);
    }
    shells.set(session.id, { detach, remote, profileId: profile.id });
    return { ok: true, local_session_id: session.id, remote_session_id: remote, nativeView: "unavailable" };
  };
  const sessionOps = {
    native_open: (profile, body) => nativeOpen(profile, body),
    workspace_shell: (profile, body) => workspaceShell(profile, body),
    get: (profile, body) => api.getSession(profile, String(body.session_id)),
    messages: (profile, body) => api.getMessages(profile, String(body.session_id), { first: body.first, after: body.after }),
    attachments: (profile, body) => api.getAttachments(profile, String(body.session_id)),
    insights: (profile, body) => api.getInsights(profile, String(body.session_id)),
    generate_insights: (profile, body) => api.generateInsights(profile, String(body.session_id)),
    tags: (profile, body) => api.getTags(profile, String(body.session_id)),
    set_tags: (profile, body) => api.setTags(profile, String(body.session_id), body.tags),
    append_tags: (profile, body) => api.appendTags(profile, String(body.session_id), body.tags),
    sleep: (profile, body) => api.sleep(profile, String(body.session_id))
  };
  const catalog = async (body) => {
    const profile = pick(body.profileId);
    const resource = String(body.resource ?? "");
    const first = body.first ?? 100;
    const after = body.after;
    switch (resource) {
      case "playbooks":
        return { ok: true, ...await api.listPlaybooks(profile, { first, after, includeEnterprise: body.include_enterprise !== false }) };
      case "secrets":
        return { ok: true, ...await api.listSecrets(profile, { first, after }) };
      case "knowledge":
        return { ok: true, ...await api.listKnowledgeNotes(profile, { first, after, search: body.search, folderPath: body.folder_path, pinnedRepo: body.pinned_repo }) };
      case "repositories":
        return { ok: true, ...await api.listRepositories(profile, { first, after, filterName: body.filter_name, loadIndexingStatus: body.load_indexing_status === true }) };
      default:
        throw new CarrierError("invalid-request", `unknown catalog resource ${resource}`, { status: 422 });
    }
  };
  const upload = async (body) => {
    const name2 = String(body.name ?? "").trim();
    const data = String(body.data_base64 ?? "");
    if (!name2 || !data) throw new CarrierError("invalid-request", "name and data_base64 are required", { status: 422 });
    let bytes;
    try {
      bytes = Buffer.from(data, "base64");
    } catch {
      throw new CarrierError("invalid-request", "data_base64 is not valid base64", { status: 422 });
    }
    if (bytes.length === 0) throw new CarrierError("invalid-request", "attachment is empty", { status: 422 });
    if (bytes.length > 16 * 1024 * 1024) throw new CarrierError("body-too-large", "attachment exceeds 16 MiB", { status: 413 });
    const result = await api.uploadAttachment(pick(body.profileId), { name: name2, contentType: body.content_type ?? body.type, bytes });
    return { ok: true, attachment: result };
  };
  const workspaceOp = async (body) => {
    let op3;
    try {
      op3 = selectOperation(WORKSPACE_FAMILY, "http.workspace", body.op ?? "status");
    } catch {
      throw new CarrierError("invalid-request", `unknown workspace op ${body.op}`, { status: 422 });
    }
    if (op3 === "workspace.connect") {
      const profile = pick(body.profileId);
      return { ok: true, ...await scopes.connect(profile, body, resources.connectFactory) };
    }
    if (op3 === "workspace.status") return { ok: true, ...scopes.status(body.scopeId) };
    if (op3 === "workspace.disconnect") return scopes.disconnect(body.scopeId);
    if (op3 === "workspace.inspect") {
      const scope = scopes.requireReady(body.scopeId);
      const data = await scope.mcp.call("workspace.inspect", {});
      return {
        ok: true,
        data: { ...data, pty: { supported: false, reason: "NATIVE_UNAVAILABLE" }, forward: { supported: false, reason: "NATIVE_UNAVAILABLE" } },
        nativeChat: resolveNativeChat(ctx)
      };
    }
    throw new CarrierError("invalid-request", `unknown workspace op`, { status: 422 });
  };
  const resourceOp = async (body) => {
    let op3;
    try {
      op3 = selectOperation(WORKSPACE_FAMILY, "http.resources", body.op);
    } catch {
      throw new CarrierError("invalid-request", `unknown resource op ${body.op}`, { status: 422 });
    }
    const data = await resources.call(body.scopeId, op3, body);
    return { ok: true, data };
  };
  const SPECS = [
    { path: "/nano-cloud-session/status", methods: ["POST"], bodyLimit: 16384, handler: work(() => configAction({ action: "list" })) },
    { path: "/nano-cloud-session/config", methods: ["POST"], bodyLimit: 16384, handler: work((body) => configAction(body)) },
    {
      path: "/nano-cloud-session/sessions",
      methods: ["POST"],
      bodyLimit: 65536,
      handler: work((body) => {
        const profile = pick(body.profileId);
        let op3;
        try {
          op3 = selectOperation(SESSION_FAMILY, "http.sessions", body.op ?? "list");
        } catch {
          throw new CarrierError("invalid-request", `unknown sessions op ${body.op}`, { status: 422 });
        }
        const params = { first: body.first ?? defaultFirst, ...decodeListFilter(body) };
        const run = op3 === "sessions.insights" ? api.listSessionsInsights : api.listSessions;
        return run(profile, params);
      })
    },
    {
      path: "/nano-cloud-session/session",
      methods: ["POST"],
      bodyLimit: 65536,
      handler: work((body) => {
        let operationId;
        try {
          operationId = selectOperation(SESSION_FAMILY, "http.session", body.op ?? "get");
        } catch {
          throw new CarrierError("invalid-request", `unknown session op ${body.op}`, { status: 422 });
        }
        const sessionId = needSessionId(body);
        const opName = operationId.split(".")[1];
        const op3 = sessionOps[opName];
        if (body.op === "native_open") {
          const chat = resolveNativeChat(ctx);
          if (!chat.available) {
            throw new NativeError("NATIVE_UNAVAILABLE", chat.message, 503);
          }
          let profile;
          try {
            profile = pick(body.profileId);
          } catch (error) {
            if (error?.reason === "no-active-profile" || error?.reason === "profile-not-found") {
              throw new NativeError("NATIVE_UNSUPPORTED", `no carrier profile to project from: ${error.message}`, 422);
            }
            throw error;
          }
          return op3(profile, { ...body, session_id: sessionId });
        }
        return op3(pick(body.profileId), { ...body, session_id: sessionId });
      })
    },
    {
      path: "/nano-cloud-session/create",
      methods: ["POST"],
      bodyLimit: 262144,
      handler: work((body) => api.createSession(pick(body.profileId), body))
    },
    {
      path: "/nano-cloud-session/message",
      methods: ["POST"],
      bodyLimit: 65536,
      handler: work((body) => {
        if (!body.session_id || typeof body.message !== "string" || !body.message.trim()) {
          throw new CarrierError("invalid-request", "session_id and message are required", { status: 422 });
        }
        return api.postMessage(pick(body.profileId), needSessionId(body), body.message);
      })
    },
    { path: "/nano-cloud-session/archive", methods: ["POST"], bodyLimit: 16384, handler: work((body) => api.archive(pick(body.profileId), needSessionId(body))) },
    { path: "/nano-cloud-session/unarchive", methods: ["POST"], bodyLimit: 16384, handler: work((body) => api.unarchive(pick(body.profileId), needSessionId(body))) },
    { path: "/nano-cloud-session/terminate", methods: ["POST"], bodyLimit: 16384, handler: work((body) => api.terminate(pick(body.profileId), needSessionId(body))) },
    { path: "/nano-cloud-session/catalog", methods: ["POST"], bodyLimit: 16384, handler: work((body) => catalog(body)) },
    { path: "/nano-cloud-session/upload", methods: ["POST"], bodyLimit: 33554432, handler: work((body) => upload(body)) },
    {
      path: "/nano-cloud-session/ssh",
      methods: ["POST"],
      bodyLimit: 16384,
      handler: work((body) => {
        const id = needSessionId(body);
        const kp = ensureSshKeypair();
        return {
          ok: true,
          session_id: id,
          ...sshCommands(id, kp),
          publicKey: kp.publicKey,
          enrollHint: "paste publicKey into Devin settings \u2192 SSH keys (account-level, one-time)"
        };
      })
    },
    { path: "/nano-cloud-session/workspace", methods: ["POST"], bodyLimit: 65536, handler: work((body) => workspaceOp(body)) },
    { path: "/nano-cloud-session/resources", methods: ["POST"], bodyLimit: 131072, handler: work((body) => resourceOp(body)) }
  ];
  ctx.effect(() => () => {
    for (const shell of shells.values()) {
      try {
        shell.detach();
      } catch {
      }
    }
    shells.clear();
    void scopes.invalidateAll();
    void scopes.drain();
  }, "nano-cloud-session: workspace scopes");
  registerRoutes(ctx, SPECS, { table: BINDING_TABLE, plugin: PLUGIN, observe: (event) => ensurePerfReviewHost().observe(event) });
}
var FamilyDispatchError = class extends Error {
};
export {
  CarrierError,
  Config,
  NativeError,
  WorkspaceError,
  apply,
  httpStatusForError,
  inject,
  name
};
