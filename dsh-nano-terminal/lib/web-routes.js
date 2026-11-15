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
var PLUGIN = "dsh-nano-terminal";
var BINDING_TABLE = [
  { id: "dnt.mcp", plugin: PLUGIN, channel: "http", match: "exact", path: "/dsh-nano-terminal/mcp", methods: ["POST"], bodyLimit: 524288, sensitivity: "L2", capability: "proc:terminal", sessionBinding: true, justification: "mcp" },
  { id: "dnt.sessions", plugin: PLUGIN, channel: "http", match: "exact", path: "/dsh-nano-terminal/sessions", methods: ["GET"], bodyLimit: 0, sensitivity: "L1", capability: "read:host", sessionBinding: true, justification: "sessions" },
  { id: "dnt.events", plugin: PLUGIN, channel: "http", match: "exact", path: "/dsh-nano-terminal/events", methods: ["GET"], bodyLimit: 0, sensitivity: "L1", capability: "read:host", sessionBinding: true, justification: "events" },
  { id: "dnt.health", plugin: PLUGIN, channel: "http", match: "exact", path: "/dsh-nano-terminal/health", methods: ["GET"], bodyLimit: 0, sensitivity: "L0", capability: "read:host", sessionBinding: false, justification: "health" },
  { id: "dnt.session.close", plugin: PLUGIN, channel: "http", match: "prefix", path: "/dsh-nano-terminal/session", methods: ["POST"], bodyLimit: 0, sensitivity: "L2", capability: "proc:terminal", sessionBinding: true, justification: "session close" },
  { id: "dnt.stream", plugin: PLUGIN, channel: "upgrade", match: "exact", path: "/dsh-nano-terminal/stream", methods: ["GET"], bodyLimit: 0, sensitivity: "L2", capability: "proc:terminal", sessionBinding: true, justification: "ws data plane" }
];

// src/host/web-routes.js
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
            void record.writeInput(fr.payload, "human").then((r) => {
              if (r?.held) attach.channel(1, FR_KIND.HELD);
            }).catch(() => {
            });
          } else if (fr.kind === FR_KIND.AUTO_INPUT) {
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
        } else if (msg.type === "open") {
          record = await registry.create({
            sessionId: msg.owner,
            shell: msg.shell,
            args: msg.args,
            cwd: msg.cwd,
            cols: msg.cols,
            rows: msg.rows,
            title: msg.title,
            owner: msg.owner
          });
        } else {
          throw new Error('expected {type:"open"}');
        }
        if (record.pending) await registry.spawnPending(record);
        const wantV2 = msg.v === 2 || url.searchParams.get("v") === "2";
        attach = new Attach(socket, record);
        attach.v = wantV2 ? 2 : 1;
        record.attached.set(socket, attach);
        socket.once("close", () => {
          record?.detach(socket);
          record?.attached.delete(socket);
        });
        ready = true;
        sendText(socket, {
          type: "ready",
          v: attach.v,
          session: record.id,
          addr: record.addr,
          title: record.title,
          lane: record.lane,
          exited: record.exited,
          replayBytes: record.replayLen
        });
        record.replayInto(socket, (s, chunk) => attach.data(chunk));
      } catch (err) {
        sendText(socket, { type: "error", message: String(err?.message ?? err) });
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
      mcp.audit({ op: "mcp.req", method: Array.isArray(parsed) ? "batch" : parsed?.method });
      const reply = await mcp.handleRpc(parsed);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(reply === void 0 ? "" : JSON.stringify(reply));
    },
    "dnt.sessions": async (req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ sessions: registry.list() }));
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
      const ok = await registry.close(decodeURIComponent(m[1]), "route");
      res.writeHead(ok ? 200 : 404, { "content-type": "application/json" });
      res.end(JSON.stringify({ closed: ok }));
    }
  };
  const registrar = createWebRegistrar({
    plugin: "dsh-nano-terminal",
    bindings: BINDING_TABLE.map((b) => ({ ...b, handler: HANDLERS[b.id] }))
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
