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
      // 'prefix' rows match a whole subtree; the guard registers them with the
      // matching webServer kind instead of forcing every route to be exact.
      match: row.match === "prefix" ? "prefix" : "exact",
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
      const kind = row.match === "prefix" ? "prefix" : ROUTE_KIND;
      const register = () => ctx.get("webServer").register({ kind, path: spec.path, handler });
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
export {
  registerRoutes
};
