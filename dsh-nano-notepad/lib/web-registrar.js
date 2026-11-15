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
      plugin: row.plugin ?? plugin
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
function createGuard({ table, plugin } = {}) {
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
        plugin: row.plugin
      });
      records.push(route);
      const handler = async (req, res) => {
        const rejection = conn.requestRejection?.(req);
        if (rejection !== void 0) {
          res.statusCode = rejection;
          res.end();
          return;
        }
        if (!route.methods.includes(String(req.method ?? "").toUpperCase())) {
          res.setHeader("allow", route.methods.join(", "));
          sendJson(res, 405, { ok: false, reason: "method-not-allowed" });
          return;
        }
        try {
          await spec.handler(req, res, route);
        } catch (error) {
          const reason = error instanceof RouteGuardError ? error.reason : "failed";
          sendJson(res, 500, { ok: false, reason });
        }
      };
      const register = () => ctx.webServer.register({ kind: ROUTE_KIND, path: spec.path, handler });
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

// ../packages/dsh-interface/src/contracts/webBinding.js
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

// ../packages/dsh-interface/src/host/createWebRegistrar.js
function createWebRegistrar({ plugin, bindings } = {}) {
  const normalized = normalizeBindings(bindings ?? [], { plugin });
  const effective = [];
  let disposed = false;
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
        const view = { ...ctx, effect: void 0 };
        const guard = createGuard({ table: byChannel.httpExact, plugin });
        const ds = guard.registerRoutes(view, byChannel.httpExact);
        disposers.push(...ds);
      }
      for (const b of byChannel.httpPrefix) {
        const handler = async (req, res) => {
          const rejection = conn.requestRejection?.(req);
          if (rejection !== void 0) {
            res.statusCode = rejection;
            res.end();
            return;
          }
          if (!b.methods.includes(String(req.method ?? "").toUpperCase())) {
            res.setHeader("allow", b.methods.join(", "));
            sendJson(res, 405, { ok: false, reason: "method-not-allowed" });
            return;
          }
          try {
            await b.handler(req, res, bindingRecord(b));
          } catch (error) {
            const reason = error instanceof RouteGuardError ? error.reason : "failed";
            sendJson(res, 500, { ok: false, reason });
          }
        };
        disposers.push(ctx.webServer.register({ kind: "prefix", path: b.path, handler }));
      }
      for (const b of byChannel.upgradeExact) {
        const handler = (req, socket) => {
          const rejection = conn.requestRejection?.(req);
          if (rejection !== void 0) {
            try {
              socket.end();
            } catch {
            }
            return;
          }
          return b.handler(req, socket, bindingRecord(b));
        };
        disposers.push(ctx.webServer.registerUpgrade({ path: b.path, handler }));
      }
    } catch (error) {
      rollback();
      throw error;
    }
    for (const b of normalized) effective.push(bindingRecord(b));
    const disposeAll = () => {
      if (disposed) return;
      disposed = true;
      rollback();
    };
    if (typeof ctx.effect === "function") {
      ctx.effect(() => disposeAll(), `web-registrar: ${plugin ?? "plugin"} dispose`);
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

// lib/bindings.js
var PLUGIN = "dsh-nano-notepad";
var BINDING_TABLE = [
  { id: "dnn.save", plugin: PLUGIN, channel: "http", match: "exact", path: "/nano-notepad/save", methods: ["POST"], bodyLimit: 8388608, sensitivity: "L2", capability: "write:host", sessionBinding: false, justification: "native save dialog \u2192 host write + proc exec" },
  { id: "dnn.read", plugin: PLUGIN, channel: "http", match: "exact", path: "/nano-notepad/read", methods: ["POST"], bodyLimit: 8388608, sensitivity: "L2", capability: "read:host", sessionBinding: false, justification: "out-of-workspace host text read" },
  { id: "dnn.fetch-mp", plugin: PLUGIN, channel: "http", match: "exact", path: "/nano-notepad/fetch-mp", methods: ["POST"], bodyLimit: 8388608, sensitivity: "L2", capability: "net:fetch", sessionBinding: false, justification: "outbound fetch mp allowlist; redirect SSRF" },
  { id: "dnn.s3.status", plugin: PLUGIN, channel: "http", match: "exact", path: "/nano-notepad/s3/status", methods: ["POST"], bodyLimit: 33554432, sensitivity: "L2", capability: "s3:credentials", sessionBinding: false, justification: "S3 profile state incl endpoint/accessKeyId" },
  { id: "dnn.s3.test", plugin: PLUGIN, channel: "http", match: "exact", path: "/nano-notepad/s3/test", methods: ["POST"], bodyLimit: 33554432, sensitivity: "L2", capability: "credential:probe", sessionBinding: false, justification: "signed S3 probe; exercises stored secrets" },
  { id: "dnn.s3.object", plugin: PLUGIN, channel: "http", match: "exact", path: "/nano-notepad/s3/object", methods: ["POST"], bodyLimit: 33554432, sensitivity: "L2", capability: "s3:write", sessionBinding: false, justification: "signed S3 get/put/delete/head" },
  { id: "dnn.s3.config", plugin: PLUGIN, channel: "http", match: "exact", path: "/nano-notepad/s3/config", methods: ["POST"], bodyLimit: 33554432, sensitivity: "L2", capability: "s3:credentials", sessionBinding: false, justification: "S3 endpoint/bucket/secret profiles write+probe" },
  { id: "dnn.fx-core.wasm", plugin: PLUGIN, channel: "http", match: "exact", path: "/nano-notepad/fx-core.wasm", methods: ["GET", "HEAD"], bodyLimit: 0, sensitivity: "L1", capability: "static:asset", sessionBinding: false, justification: "vendored fx-core.wasm static asset" },
  { id: "dnn.fx.models", plugin: PLUGIN, channel: "http", match: "exact", path: "/nano-notepad/fx/models", methods: ["GET"], bodyLimit: 0, sensitivity: "L2", capability: "read:model-catalog", sessionBinding: false, justification: "ctx.llm provider~model catalog read" },
  { id: "dnn.fx.chat", plugin: PLUGIN, channel: "http", match: "exact", path: "/nano-notepad/fx/chat/completions", methods: ["POST"], bodyLimit: 33554432, sensitivity: "L2", capability: "llm:generate", sessionBinding: false, justification: "OpenAI\u2192GenerateOptions bridge on ctx.llm" },
  { id: "dnn.pipeline.s3", plugin: PLUGIN, channel: "http", match: "exact", path: "/nano-notepad/pipeline/s3", methods: ["POST"], bodyLimit: 33554432, sensitivity: "L2", capability: "s3:write", sessionBinding: false, justification: "pipeline-bucket signed ops + CAS" },
  { id: "dnn.pipeline.claim", plugin: PLUGIN, channel: "http", match: "exact", path: "/nano-notepad/pipeline/claim", methods: ["POST"], bodyLimit: 4096, sensitivity: "L2", capability: "s3:write", sessionBinding: false, justification: "claim lease lifecycle ETag CAS" },
  { id: "dnn.rpc", plugin: PLUGIN, channel: "http", match: "exact", path: "/nano-notepad/rpc", methods: ["POST"], bodyLimit: 4096, sensitivity: "L1", capability: "s3:read", sessionBinding: false, justification: "A3 cross-plugin read surface (internal MCP/RPC)" },
  { id: "dnn.fx.sdk", plugin: PLUGIN, channel: "http", match: "prefix", path: "/nano-notepad/fx/sdk", methods: ["GET"], bodyLimit: 0, sensitivity: "L1", capability: "static:asset", sessionBinding: false, justification: "libfx ESM + sqlite/pdf asset prefix (basename-only)" }
];
export {
  BINDING_TABLE,
  BindingError,
  PLUGIN,
  createWebRegistrar
};
