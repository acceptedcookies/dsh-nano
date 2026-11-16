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
        plugin: row.plugin
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
function registerRoutes(ctx, specs, { table, plugin, observe } = {}) {
  return createGuard({ table, plugin, observe }).registerRoutes(ctx, specs);
}

// src/host/route-table.js
var PLUGIN = "dsh-nano-cloud-session";
var ROUTE_TABLE = [
  {
    "plugin": "dsh-nano-cloud-session",
    "path": "/nano-cloud-session/status",
    "methods": [
      "POST"
    ],
    "sensitivity": "L0",
    "capability": "read:none",
    "bodyLimit": 16384,
    "sessionBinding": false,
    "justification": "dsh-nano-cloud-session/index.js \u2014 carrier profile \u5217\u8868\uFF08\u8131\u654F\uFF0ChasSecret \u4EC5\u5E03\u5C14\uFF09\u4E0E activeId\uFF1B\u65E0 secret \u51FA\u53C2\u3002"
  },
  {
    "plugin": "dsh-nano-cloud-session",
    "path": "/nano-cloud-session/config",
    "methods": [
      "POST"
    ],
    "sensitivity": "L3",
    "capability": "write:operator",
    "bodyLimit": 16384,
    "sessionBinding": false,
    "justification": "dsh-nano-cloud-session/index.js \u2014 profile CRUD + activate + test\uFF1Atoken \u5199\u5165\u5BBF\u4E3B profile \u6587\u4EF6\uFF080600\uFF09\u4E0E\u89E6\u53D1 upstream /v3/self\uFF1B\u64CD\u4F5C\u5458\u914D\u7F6E\u9762\u3002"
  },
  {
    "plugin": "dsh-nano-cloud-session",
    "path": "/nano-cloud-session/sessions",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "net:fetch",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "dsh-nano-cloud-session/index.js \u2014 \u7ECF\u5BBF\u4E3B\u4EE3\u7406 GET /v3/organizations/{org}/sessions\uFF1B\u643A\u5E26 PAT \u7684\u51FA\u7AD9\u8BF7\u6C42\u3002"
  },
  {
    "plugin": "dsh-nano-cloud-session",
    "path": "/nano-cloud-session/session",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "net:fetch",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "dsh-nano-cloud-session/index.js \u2014 \u4F1A\u8BDD\u8BE6\u60C5/\u6D88\u606F\u6D41/attachments/insights/tags/get+set_tags \u4EE3\u7406\u3002"
  },
  {
    "plugin": "dsh-nano-cloud-session",
    "path": "/nano-cloud-session/create",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "net:fetch+spawn:remote",
    "bodyLimit": 262144,
    "sessionBinding": false,
    "justification": "dsh-nano-cloud-session/index.js \u2014 \u521B\u5EFA Devin cloud session\uFF08\u6D88\u8017 ACU\u3001\u542F\u52A8\u8FDC\u7AEF VM\u3001\u53EF\u5E26 prompt/repos/devin_mode/max_acu_limit \u7B49\uFF09\u3002"
  },
  {
    "plugin": "dsh-nano-cloud-session",
    "path": "/nano-cloud-session/message",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "net:fetch+spawn:remote",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "dsh-nano-cloud-session/index.js \u2014 \u5411\u65E2\u6709 session \u6295\u9012\u7528\u6237\u6D88\u606F\uFF0C\u53EF\u5524\u9192/\u63A5\u7BA1 session\u3002"
  },
  {
    "plugin": "dsh-nano-cloud-session",
    "path": "/nano-cloud-session/archive",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "net:fetch+write:remote",
    "bodyLimit": 16384,
    "sessionBinding": false,
    "justification": "dsh-nano-cloud-session/index.js \u2014 \u5F52\u6863 session\u3002"
  },
  {
    "plugin": "dsh-nano-cloud-session",
    "path": "/nano-cloud-session/unarchive",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "net:fetch+write:remote",
    "bodyLimit": 16384,
    "sessionBinding": false,
    "justification": "dsh-nano-cloud-session/index.js \u2014 \u53D6\u6D88\u5F52\u6863\u3002"
  },
  {
    "plugin": "dsh-nano-cloud-session",
    "path": "/nano-cloud-session/terminate",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "net:fetch+write:remote",
    "bodyLimit": 16384,
    "sessionBinding": false,
    "justification": "dsh-nano-cloud-session/index.js \u2014 DELETE upstream = \u4E2D\u6B62\uFF08\u5B58\u6D3B session \u2192 suspended\uFF0C\u975E\u786C\u5220\u3001\u4E0D\u81EA\u52A8\u5F52\u6863\uFF1B\u5F52\u6863\u9700\u53E6\u8D70 /archive\uFF09\u3002"
  },
  {
    "plugin": "dsh-nano-cloud-session",
    "path": "/nano-cloud-session/ssh",
    "methods": [
      "POST"
    ],
    "sensitivity": "L0",
    "capability": "read:none",
    "bodyLimit": 16384,
    "sessionBinding": false,
    "justification": "dsh-nano-cloud-session/index.js \u2014 \u8FD4\u56DE ssh \u547D\u4EE4\u4E32\u4E0E enroll \u63D0\u793A\u7684\u7EAF\u4FE1\u606F\u8DEF\u7531\uFF1B\u4E0D spawn\u3002"
  },
  {
    "plugin": "dsh-nano-cloud-session",
    "path": "/nano-cloud-session/catalog",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "net:fetch",
    "bodyLimit": 16384,
    "sessionBinding": false,
    "justification": "dsh-nano-cloud-session/index.js \u2014 \u7ECF\u5BBF\u4E3B\u4EE3\u7406 /v3/organizations/{org}/playbooks|secrets|knowledge/notes|repositories\uFF1B\u53EA\u8BFB\u76EE\u5F55\uFF0C\u643A\u5E26 PAT \u51FA\u7AD9\u3002"
  },
  {
    "plugin": "dsh-nano-cloud-session",
    "path": "/nano-cloud-session/upload",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "net:fetch+write:remote",
    "bodyLimit": 33554432,
    "sessionBinding": false,
    "justification": "dsh-nano-cloud-session/index.js \u2014 \u628A base64 \u9644\u4EF6\u7ECF\u5BBF\u4E3B multipart \u4E0A\u4F20\u5230 /v3/organizations/{org}/attachments\uFF1B16 MiB \u6587\u4EF6\u4E0A\u9650\u300132 MiB JSON \u4FE1\u5C01\u3002"
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
