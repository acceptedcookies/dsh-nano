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
async function readJsonBody(req, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
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
function registerRoutes(ctx, specs, { table, plugin } = {}) {
  return createGuard({ table, plugin }).registerRoutes(ctx, specs);
}

// src/host/route-table.js
var PLUGIN = "dsh-nano-notepad";
var ROUTE_TABLE = [
  {
    "plugin": "dsh-nano-notepad",
    "path": "/nano-notepad/save",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "write:host",
    "bodyLimit": 8388608,
    "sessionBinding": false,
    "justification": "dsh-nano-notepad/index.js:60,251 \u2014 spawns osascript (subprocess) to show a native save dialog, then writes the chosen path; user-driven but writes anywhere the user picks = host-level write + proc exec."
  },
  {
    "plugin": "dsh-nano-notepad",
    "path": "/nano-notepad/read",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 8388608,
    "sessionBinding": false,
    "justification": "dsh-nano-notepad/index.js:61,257 \u2014 reads any UTF-8 host text file up to MAX_READ_BYTES (2 MiB) with no workspace confinement (finding nano-notepad/read-arbitrary-md-read, accepted); out-of-workspace host read."
  },
  {
    "plugin": "dsh-nano-notepad",
    "path": "/nano-notepad/fetch-mp",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "net:fetch",
    "bodyLimit": 8388608,
    "sessionBinding": false,
    "justification": "dsh-nano-notepad/index.js:62,274 \u2014 outbound fetch of a submitted URL (mp allowlist upstream) from the host; redirect-follow SSRF surface (finding fetch-mp-redirect-ssrf). Arbitrary outbound net."
  },
  {
    "plugin": "dsh-nano-notepad",
    "path": "/nano-notepad/s3/status",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "s3:credentials",
    "bodyLimit": 33554432,
    "sessionBinding": false,
    "justification": "dsh-nano-notepad/index.js:63,299-314 \u2014 returns active S3 profile state incl. endpoint + accessKeyId + usage ledger read from ${DSH_HOME}/nano-notepad-s3.json; read-only but discloses credential/store metadata (host-level), no secret plaintext."
  },
  {
    "plugin": "dsh-nano-notepad",
    "path": "/nano-notepad/s3/test",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "credential:probe",
    "bodyLimit": 33554432,
    "sessionBinding": false,
    "justification": "dsh-nano-notepad/index.js:64,299 \u2014 signs a real outbound S3 probe with stored credentials (dsh-s3-client SigV4 + limiter); exercises stored secrets + outbound net."
  },
  {
    "plugin": "dsh-nano-notepad",
    "path": "/nano-notepad/s3/object",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "s3:write",
    "bodyLimit": 33554432,
    "sessionBinding": false,
    "justification": "dsh-nano-notepad/index.js:65,299 \u2014 generic signed S3 get/put/delete/head on the active profile (remote-data ingress for sync; P0 remote-cross boundary + SSRF). Credentials + outbound net."
  },
  {
    "plugin": "dsh-nano-notepad",
    "path": "/nano-notepad/s3/config",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "s3:credentials",
    "bodyLimit": 33554432,
    "sessionBinding": false,
    "justification": "dsh-nano-notepad/index.js:66,317 \u2014 writes endpoint/bucket/secret profiles to ${DSH_HOME}/nano-notepad-s3.json (0600) and probes them; endpoint-SSRF oracle + credential write (finding s3-config-endpoint-ssrf, accepted)."
  }
];
export {
  PLUGIN,
  ROUTE_TABLE,
  RouteGuardError,
  createGuard,
  readJsonBody,
  registerRoutes,
  sendJson
};
