// ../../../../packages/dsh-host-route-guard/src/route-guard.js
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
      const handler = async (req, res) => {
        const t0 = observeStamp(observe);
        const identity = { id: row.id, plugin: route.plugin };
        const rejection = conn.requestRejection?.(req);
        if (rejection !== void 0) {
          res.statusCode = rejection;
          res.end();
          emitHttp(observe, t0, { ...identity, outcome: "rejected", status: rejection });
          return;
        }
        if (!route.methods.includes(String(req.method ?? "").toUpperCase())) {
          res.setHeader("allow", route.methods.join(", "));
          sendJson(res, 405, { ok: false, reason: "method-not-allowed" });
          emitHttp(observe, t0, { ...identity, outcome: "method", status: 405 });
          return;
        }
        try {
          await spec.handler(req, res, route);
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

// ../../../../packages/dsh-interface/src/contracts/webBinding.js
var BindingError = class extends Error {
  constructor(reason, detail = "") {
    super(detail ? `web-binding: ${reason} \u2014 ${detail}` : `web-binding: ${reason}`);
    this.name = "BindingError";
    this.reason = reason;
  }
};
var CHANNEL = Object.freeze({ HTTP: "http", UPGRADE: "upgrade" });
var MATCH = Object.freeze({ EXACT: "exact", PREFIX: "prefix" });
var CHANNELS = new Set(Object.values(CHANNEL));
var MATCHES = new Set(Object.values(MATCH));
function normalizeBinding(binding, { plugin } = {}) {
  if (!binding || typeof binding !== "object") {
    throw new BindingError("binding-invalid", "every binding must be an object");
  }
  const b = binding;
  if (typeof b.id !== "string" || b.id === "") {
    throw new BindingError("binding-invalid", "every binding needs a stable non-empty `id`");
  }
  if (!CHANNELS.has(b.channel)) {
    throw new BindingError("binding-invalid", `${b.id}: channel must be one of ${[...CHANNELS].join("/")}`);
  }
  const match = b.match ?? MATCH.EXACT;
  if (!MATCHES.has(match)) {
    throw new BindingError("binding-invalid", `${b.id}: match must be one of ${[...MATCHES].join("/")}`);
  }
  if (b.channel === CHANNEL.UPGRADE && match !== MATCH.EXACT) {
    throw new BindingError("binding-invalid", `${b.id}: upgrade channel requires match=exact`);
  }
  if (typeof b.path !== "string" || !b.path.startsWith("/")) {
    throw new BindingError("binding-invalid", `${b.id}: path must be a string starting with '/'`);
  }
  const methods = b.channel === CHANNEL.UPGRADE ? Object.freeze([...b.methods ?? ["GET"]].map((m) => String(m).toUpperCase())) : (() => {
    const ms = Array.isArray(b.methods) && b.methods.length ? b.methods.map((m) => String(m).toUpperCase()) : b.method !== void 0 ? [String(b.method).toUpperCase()] : [];
    if (ms.length === 0) throw new BindingError("binding-invalid", `${b.id}: declare method or methods`);
    return Object.freeze(ms);
  })();
  if (typeof b.handler !== "function") {
    throw new BindingError("binding-invalid", `${b.id}: handler must be a function`);
  }
  return Object.freeze({
    id: b.id,
    plugin: b.plugin ?? plugin,
    channel: b.channel,
    match,
    path: b.path,
    methods,
    bodyLimit: b.bodyLimit,
    sensitivity: b.sensitivity,
    capability: b.capability,
    sessionBinding: b.sessionBinding,
    justification: b.justification,
    handler: b.handler
  });
}
function normalizeBindings(bindings, { plugin } = {}) {
  if (!Array.isArray(bindings)) {
    throw new BindingError("bindings-invalid", "bindings must be an array");
  }
  const seen = /* @__PURE__ */ new Set();
  const surface = /* @__PURE__ */ new Set();
  return bindings.map((b) => {
    const n = normalizeBinding(b, { plugin });
    if (seen.has(n.id)) throw new BindingError("bindings-invalid", `duplicate binding id "${n.id}"`);
    const key = `${n.channel} ${n.match} ${n.path}`;
    if (surface.has(key)) throw new BindingError("bindings-invalid", `duplicate surface ${key}`);
    seen.add(n.id);
    surface.add(key);
    return n;
  });
}
function bindingRecord(binding) {
  return Object.freeze({
    id: binding.id,
    plugin: binding.plugin,
    channel: binding.channel,
    match: binding.match,
    path: binding.path,
    methods: Object.freeze([...binding.methods]),
    bodyLimit: binding.bodyLimit,
    sensitivity: binding.sensitivity,
    capability: binding.capability,
    sessionBinding: binding.sessionBinding,
    justification: binding.justification
  });
}

// ../../../../packages/dsh-interface/src/contracts/jsonOutcome.js
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

// ../../../../packages/dsh-interface/src/contracts/observeEvent.js
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

// ../../../../packages/dsh-interface/src/host/emitObserve.js
function observeStamp2(observe) {
  if (typeof observe !== "function") return null;
  return globalThis.performance.now();
}
function emitObserve2(observe, event) {
  if (typeof observe !== "function") return;
  try {
    const ret = observe(event);
    if (ret != null && typeof ret.then === "function") ret.then(() => {
    }, () => {
    });
  } catch {
  }
}

// ../../../../packages/dsh-interface/src/host/createWebRegistrar.js
function createWebRegistrar({ plugin, bindings, observe } = {}) {
  const normalized = normalizeBindings(bindings ?? [], { plugin });
  const effective = [];
  const byChannel = {
    httpExact: normalized.filter((b) => b.channel === CHANNEL.HTTP && b.match === MATCH.EXACT),
    httpPrefix: normalized.filter((b) => b.channel === CHANNEL.HTTP && b.match === MATCH.PREFIX),
    upgradeExact: normalized.filter((b) => b.channel === CHANNEL.UPGRADE && b.match === MATCH.EXACT)
  };
  function registerAll(ctx) {
    const conn = ctx.get("connection");
    if (!conn) throw new RouteGuardError("no-connection", "no connection service");
    if (typeof conn.requestRejection !== "function") {
      throw new RouteGuardError("no-request-rejection", "connection.requestRejection is not a function; refusing to register unauthenticated routes");
    }
    const disposers = [];
    const rollback = () => {
      for (const d of disposers.splice(0)) {
        try {
          d && d();
        } catch {
        }
      }
    };
    try {
      if (byChannel.httpExact.length) {
        const guard = createGuard({ table: byChannel.httpExact, plugin, observe });
        const ds = guard.registerRoutes(ctx, byChannel.httpExact);
        disposers.push(...ds);
      }
      for (const b of byChannel.httpPrefix) {
        const handler = async (req, res) => {
          const t0 = observeStamp2(observe);
          const done = (outcome, status) => {
            if (t0 == null) return;
            const event = {
              surface: "http",
              id: b.id ?? null,
              plugin: b.plugin ?? plugin ?? null,
              outcome,
              ms: globalThis.performance.now() - t0
            };
            if (status !== void 0) event.status = status;
            emitObserve2(observe, event);
          };
          const rejection = conn.requestRejection(req);
          if (rejection !== void 0) {
            res.statusCode = rejection;
            res.end();
            done("rejected", rejection);
            return;
          }
          if (!b.methods.includes(String(req.method ?? "").toUpperCase())) {
            res.setHeader("allow", b.methods.join(", "));
            sendJson(res, 405, { ok: false, reason: "method-not-allowed" });
            done("method", 405);
            return;
          }
          try {
            await b.handler(req, res, bindingRecord(b));
            done("ok", res.statusCode);
          } catch (error) {
            const reason = error instanceof RouteGuardError ? error.reason : "failed";
            sendJson(res, 500, { ok: false, reason });
            done("failed", 500);
          }
        };
        disposers.push(ctx.get("webServer").register({ kind: "prefix", path: b.path, handler }));
      }
      for (const b of byChannel.upgradeExact) {
        const handler = (req, socket) => {
          const t0 = observeStamp2(observe);
          const done = (outcome) => {
            if (t0 == null) return;
            emitObserve2(observe, {
              surface: "upgrade",
              id: b.id ?? null,
              plugin: b.plugin ?? plugin ?? null,
              outcome,
              ms: globalThis.performance.now() - t0
            });
          };
          if (String(req.method ?? "").toUpperCase() !== "GET") {
            try {
              socket.end();
            } catch {
            }
            done("method");
            return;
          }
          const rejection = conn.requestRejection(req);
          if (rejection !== void 0) {
            try {
              socket.end();
            } catch {
            }
            done("rejected");
            return;
          }
          const ret = b.handler(req, socket, bindingRecord(b));
          done("accepted");
          return ret;
        };
        disposers.push(ctx.get("webServer").registerUpgrade({ path: b.path, handler }));
      }
    } catch (error) {
      rollback();
      throw error;
    }
    for (const b of normalized) effective.push(bindingRecord(b));
    let disposed = false;
    const disposeAll = () => {
      if (disposed) return;
      disposed = true;
      rollback();
    };
    if (typeof ctx.effect === "function") {
      ctx.effect(() => disposeAll, `web-registrar: ${plugin ?? "plugin"} dispose`);
    }
    return disposeAll;
  }
  function inventory() {
    return Object.freeze([...effective]);
  }
  function lookup(id) {
    return effective.find((r) => r.id === id);
  }
  return { registerAll, inventory, lookup };
}

// ../../../../packages/dsh-performance-review/src/state.js
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

// ../../../../packages/dsh-performance-review/src/host.js
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

// lib/bindings.js
var BINDING_TABLE = Object.freeze([
  { "id": "dnt.mcp", "plugin": "dsh-nano-terminal", "channel": "http", "match": "exact", "path": "/dsh-nano-terminal/mcp", "methods": ["POST"], "bodyLimit": 524288, "sensitivity": "L2", "capability": "read:host", "sessionBinding": false, "justification": "dsh-nano-terminal /dsh-nano-terminal/mcp" },
  { "id": "dnt.sessions", "plugin": "dsh-nano-terminal", "channel": "http", "match": "exact", "path": "/dsh-nano-terminal/sessions", "methods": ["GET"], "bodyLimit": 0, "sensitivity": "L2", "capability": "read:host", "sessionBinding": false, "justification": "dsh-nano-terminal /dsh-nano-terminal/sessions" },
  { "id": "dnt.events", "plugin": "dsh-nano-terminal", "channel": "http", "match": "exact", "path": "/dsh-nano-terminal/events", "methods": ["GET"], "bodyLimit": 0, "sensitivity": "L2", "capability": "read:host", "sessionBinding": false, "justification": "dsh-nano-terminal /dsh-nano-terminal/events" },
  { "id": "dnt.health", "plugin": "dsh-nano-terminal", "channel": "http", "match": "exact", "path": "/dsh-nano-terminal/health", "methods": ["GET"], "bodyLimit": 0, "sensitivity": "L2", "capability": "read:host", "sessionBinding": false, "justification": "dsh-nano-terminal /dsh-nano-terminal/health" },
  { "id": "dnt.session.close", "plugin": "dsh-nano-terminal", "channel": "http", "match": "prefix", "path": "/dsh-nano-terminal/session", "methods": ["POST"], "bodyLimit": 0, "sensitivity": "L2", "capability": "read:host", "sessionBinding": false, "justification": "dsh-nano-terminal /dsh-nano-terminal/session" },
  { "id": "dnt.stream", "plugin": "dsh-nano-terminal", "channel": "upgrade", "match": "exact", "path": "/dsh-nano-terminal/stream", "methods": ["GET"], "bodyLimit": 0, "sensitivity": "L2", "capability": "proc:terminal", "sessionBinding": true, "justification": "ws data plane" },
  { "id": "dnt.perf-review.host", "plugin": "dsh-nano-terminal", "channel": "http", "match": "exact", "path": "/dsh-nano-terminal/perf-review/host", "methods": ["GET"], "bodyLimit": 0, "sensitivity": "L2", "capability": "read:host", "sessionBinding": false, "justification": "\u53EA\u8BFB\u5168\u8FDB\u7A0B\u89C6\u56FE\u3002\u4E0D\u6392\u7A7A\uFF0C\u53EA\u63A5\u53D7 since\u3002" }
]);

// src/shared/align.js
var encoder = new TextEncoder();
var decoder = new TextDecoder("utf-8", { fatal: false });
function recoverOnAttach(alignMode) {
  return alignMode ? "align" : "replay";
}
function recoverAttach({ alignMode, align, replay }) {
  if (recoverOnAttach(alignMode) === "align") {
    align();
    return "align";
  }
  replay();
  return "replay";
}

// src/shared/ctxref.js
function stamp8(id) {
  if (typeof id !== "string" || id.length === 0) return "00000000";
  const s = id.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)) return s.slice(0, 8);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
function stampOrKeep8(input) {
  if (typeof input !== "string" || input.length === 0) return null;
  return /^[0-9a-f]{8}$/i.test(input) ? input.toLowerCase() : stamp8(input);
}

// src/host/web-routes.js
var HOST_PLUGIN = "dsh-nano-terminal";
var _hostApi = null;
var hostApi = () => {
  if (_hostApi === null) {
    const host = ensurePerfReviewHost();
    _hostApi = typeof host.hostJoin === "function" ? host.hostJoin(HOST_PLUGIN) : null;
  }
  return _hostApi;
};
var hostSpan = (name, fn) => hostApi()?.hostSpan ? hostApi().hostSpan(name, fn) : fn();
var hostCount = (name, n = 1) => {
  try {
    hostApi()?.count?.(name, n);
  } catch {
  }
};
function registerWebRoutes(ctx, deps) {
  const { registry, bus, mcp, laneStatus, ws } = deps;
  const { handshake, FrameParser, sendBinary, sendText, sendClose, encodeFrame, parseChannel, Attach, FR_KIND } = ws;
  const streamHandler = (req, socket) => {
    if (!handshake(req, socket)) return;
    const url = new URL(req.url ?? "/", "http://localhost");
    const attachId = url.searchParams.get("session");
    let record = null;
    let ready = false;
    let attach = null;
    const parser = new FrameParser((opcode, payload) => {
      if (opcode === 8) {
        socket.end();
        return;
      }
      if (opcode === 9) {
        socket.write(encodeFrame(payload, 10));
        return;
      }
      if (!ready) {
        if (opcode !== 1) return;
        let msg;
        try {
          msg = JSON.parse(payload.toString("utf8"));
        } catch {
          sendClose(socket, 1003, "expected open frame");
          return;
        }
        void openFlow(msg);
        return;
      }
      if (opcode === 2 && record) {
        if (attach && attach.v === 2) {
          const fr = parseChannel(payload);
          if (!fr) return;
          if (fr.kind === FR_KIND.CREDIT) {
            attach.onCredit(fr.payload.readUInt32BE(0));
          } else if (fr.kind === FR_KIND.DATA) {
            hostCount("dnt-ws-in-bytes", fr.payload.length);
            hostCount("dnt-ws-in-msgs");
            void record.writeInput(fr.payload, "human").then((r) => {
              if (r?.held) attach.channel(1, FR_KIND.HELD);
            }).catch(() => {
            });
          } else if (fr.kind === FR_KIND.AUTO_INPUT) {
            hostCount("dnt-ws-in-bytes", fr.payload.length);
            hostCount("dnt-ws-in-msgs");
            void record.writeInput(fr.payload, "automatic").catch(() => {
            });
          } else if (fr.kind === FR_KIND.FACTS) {
            try {
              const f = JSON.parse(fr.payload.toString("utf8"));
              if (f.cols && f.rows) void record.resize(f.cols, f.rows);
            } catch {
            }
          } else if (fr.kind === FR_KIND.RESIZE && fr.payload.length >= 4) {
            void record.resize(fr.payload.readUInt16BE(0), fr.payload.readUInt16BE(2));
          }
        } else {
          void record.writeInput(payload, "human").catch(() => {
          });
        }
      } else if (opcode === 1) {
        try {
          const msg = JSON.parse(payload.toString("utf8"));
          if (msg.type === "resize" && record) void record.resize(msg.cols, msg.rows);
          if (msg.type === "align" && attach) attach.align();
          if (msg.type === "ping") sendText(socket, { type: "pong", t: Date.now() });
        } catch {
        }
      }
    });
    socket.on("data", (chunk) => parser.feed(chunk));
    socket.on("error", () => {
    });
    async function openFlow(msg) {
      try {
        const attachRef = attachId ?? msg.session;
        if (attachRef) {
          record = registry.resolve(attachRef);
          if (!record) throw new Error("no such session");
          const graft = {
            ...stampOrKeep8(msg.tid) ? { t: stampOrKeep8(msg.tid) } : {},
            ...stampOrKeep8(msg.conv) ? { conv: stampOrKeep8(msg.conv) } : {}
          };
          if (Object.keys(graft).length) record.graftCtxAnchors(graft);
        } else if (msg.type === "open") {
          record = await registry.create({
            sessionId: msg.owner,
            shell: msg.shell,
            args: msg.args,
            cwd: msg.cwd,
            cols: msg.cols,
            rows: msg.rows,
            title: msg.title,
            owner: msg.owner,
            // ctx-ref anchor labels: `t` = the pane's 8-hex term stamp,
            // `conv` = its conversation session stamp (ctxref.js format).
            // Both are normalized to 8-hex here — the client sends `tid` as
            // a full uuid and `conv` already stamped; stampOrKeep8 covers both.
            labels: {
              ...stampOrKeep8(msg.tid) ? { t: stampOrKeep8(msg.tid) } : {},
              ...stampOrKeep8(msg.conv) ? { conv: stampOrKeep8(msg.conv) } : {}
            }
          });
        } else {
          throw new Error('expected {type:"open"}');
        }
        if (record.pending) await hostSpan("dnt-attach", () => registry.spawnPending(record));
        const wantV2 = msg.v === 2 || url.searchParams.get("v") === "2";
        attach = new Attach(socket, record);
        attach.v = wantV2 ? 2 : 1;
        attach.alignMode = wantV2 && msg.align === 1;
        record.attached.set(socket, attach);
        socket.once("close", () => {
          record?.detach(socket);
          record?.attached.delete(socket);
        });
        ready = true;
        sendText(socket, {
          type: "ready",
          v: attach.v,
          align: attach.alignMode ? 1 : 0,
          platform: process.platform,
          session: record.id,
          addr: record.addr,
          title: record.title,
          lane: record.lane,
          exited: record.exited,
          // The session's authoritative ctx anchors — a re-attaching pane
          // adopts these so its copied ref matches the host, not its own
          // (possibly fresh-after-layout-loss) tid.
          labels: { t: record.labels?.t ?? null, conv: record.labels?.conv ?? null },
          ctx: record.info().ctx,
          replayBytes: attach.alignMode ? 0 : record.replayLen
        });
        recoverAttach({
          alignMode: attach.alignMode,
          align: () => attach.align(),
          replay: () => record.replayInto(socket, (s, chunk) => attach.data(chunk))
        });
      } catch (err) {
        sendText(socket, { type: "error", kind: err?.kind ?? "invalid", message: String(err?.message ?? err) });
        sendClose(socket, 1008, "open failed");
      }
    }
  };
  const HANDLERS = {
    "dnt.stream": streamHandler,
    "dnt.mcp": async (req, res) => {
      if (req.method !== "POST") {
        res.writeHead(405).end();
        return;
      }
      const body = await readBody(req, 512 * 1024);
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }));
        return;
      }
      const tool = Array.isArray(parsed) ? void 0 : parsed?.params?.name;
      mcp.audit({ op: "mcp.req", method: Array.isArray(parsed) ? "batch" : parsed?.method, ...tool ? { tool } : {} });
      const reply = await mcp.handleRpc(parsed);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(reply === void 0 ? "" : JSON.stringify(reply));
    },
    "dnt.sessions": async (req, res) => {
      const rows = registry.list();
      const busy = await Promise.all(rows.map((r) => registry.resolve(r.id)?.isBusy?.() ?? Promise.resolve(false)));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ sessions: rows.map((r, i) => ({ ...r, busy: !!busy[i] })) }));
    },
    // SSE event stream: subscribe → snapshot first frame, then live events.
    // ?since=<seq> resumes from a position; falling behind the ring answers
    // with {missed:true,snapshot}. Agents can poll the same data via
    // term.events without holding a connection.
    "dnt.events": async (req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      const since = Number(url.searchParams.get("since")) || 0;
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive"
      });
      const unsub = bus.subscribe((ev) => {
        try {
          res.write(`data: ${JSON.stringify(ev)}

`);
        } catch {
        }
      }, { since });
      req.on("close", unsub);
    },
    "dnt.health": async (req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, lanes: laneStatus(), sessions: registry.count() }));
    },
    "dnt.session.close": async (req, res) => {
      const m = (req.url ?? "").match(/\/session\/([^/]+)\/close$/);
      if (req.method !== "POST" || !m) {
        res.writeHead(404).end();
        return;
      }
      const ok2 = await registry.close(decodeURIComponent(m[1]), "route");
      res.writeHead(ok2 ? 200 : 404, { "content-type": "application/json" });
      res.end(JSON.stringify({ closed: ok2 }));
    },
    // Read-only whole-process perf view; only ?since is accepted (T-O-PRE1116-10).
    "dnt.perf-review.host": (req, res) => handleHostRead(req, res, ensurePerfReviewHost())
  };
  const registrar = createWebRegistrar({
    plugin: "dsh-nano-terminal",
    bindings: BINDING_TABLE.map((b) => ({ ...b, handler: HANDLERS[b.id] })),
    observe: (event) => globalThis[Symbol.for("dsh.perfReviewHost.v2")]?.observe?.(event)
  });
  return registrar.registerAll(ctx);
}
async function readBody(req, cap) {
  const chunks = [];
  let len = 0;
  for await (const c of req) {
    len += c.length;
    if (len > cap) throw new Error("body too large");
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export {
  registerWebRoutes
};
