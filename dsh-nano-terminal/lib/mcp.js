// src/host/mcp.js
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ../../../../packages/dsh-interface/src/contracts/webBinding.js
var CHANNEL = Object.freeze({ HTTP: "http", UPGRADE: "upgrade" });
var MATCH = Object.freeze({ EXACT: "exact", PREFIX: "prefix" });
var CHANNELS = new Set(Object.values(CHANNEL));
var MATCHES = new Set(Object.values(MATCH));

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
var OUTCOMES = {
  http: new Set(HTTP_OUTCOMES),
  upgrade: new Set(UPGRADE_OUTCOMES),
  json: new Set(JSON_OUTCOMES),
  mcp: new Set(MCP_OUTCOMES)
};

// ../../../../packages/dsh-interface/src/host/emitObserve.js
function observeStamp(observe) {
  if (typeof observe !== "function") return null;
  return globalThis.performance.now();
}
function emitObserve(observe, event) {
  if (typeof observe !== "function") return;
  try {
    const ret = observe(event);
    if (ret != null && typeof ret.then === "function") ret.then(() => {
    }, () => {
    });
  } catch {
  }
}

// ../../../../packages/dsh-interface/src/host/createMcpToolset.js
var MCP_NOTIFICATIONS = "notifications/";
function createMcpToolset({ schema: schema2, dispatch, protocolVersion = "2025-06-18", serverInfo = {}, observe, plugin } = {}) {
  if (schema2 == null || !Array.isArray(schema2.methods)) {
    throw new TypeError("createMcpToolset requires a schema with a methods array");
  }
  if (typeof dispatch !== "function") {
    throw new TypeError("createMcpToolset requires a dispatch(name,args) function");
  }
  const tools = schema2.methods.map((m) => ({ name: m.name, description: m.description, inputSchema: m.params }));
  const toolMap = Object.fromEntries(tools.map((t) => [t.name, t]));
  function rpcReply(id, result, error) {
    return error ? { jsonrpc: "2.0", id, error } : { jsonrpc: "2.0", id, result };
  }
  async function handleRpc(body) {
    const list = Array.isArray(body) ? body : [body];
    const out = [];
    for (const msg of list) {
      if (!msg || msg.jsonrpc !== "2.0") {
        out.push(rpcReply(msg?.id ?? null, null, { code: -32600, message: "invalid request" }));
        continue;
      }
      if (msg.method === "initialize") {
        out.push(rpcReply(msg.id, {
          protocolVersion,
          capabilities: { tools: {}, "dnt.events": { types: schema2["x-events"] } },
          serverInfo: { name: "mcp", version: "0.0.0", ...serverInfo }
        }));
        continue;
      }
      if (typeof msg.method === "string" && msg.method.startsWith(MCP_NOTIFICATIONS)) continue;
      if (msg.method === "ping") {
        out.push(rpcReply(msg.id, {}));
        continue;
      }
      if (msg.method === "tools/list") {
        out.push(rpcReply(msg.id, { tools }));
        continue;
      }
      if (msg.method === "tools/call") {
        const t0 = observeStamp(observe);
        const { name, arguments: args } = msg.params ?? {};
        const id = typeof name === "string" && name !== "" ? name : null;
        let sent = false;
        const finish = (outcome, kind) => {
          if (sent || t0 == null) return;
          sent = true;
          const event = {
            surface: "mcp",
            id,
            plugin: plugin ?? null,
            outcome,
            ms: globalThis.performance.now() - t0
          };
          if (kind !== void 0) event.kind = kind;
          emitObserve(observe, event);
        };
        if (!toolMap[name]) {
          out.push(rpcReply(msg.id, null, { code: -32602, message: `unknown tool '${name}'` }));
          finish("rejected");
          continue;
        }
        try {
          const result = await dispatch(name, args ?? {});
          out.push(rpcReply(msg.id, {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            structuredContent: result
          }));
          finish("ok");
        } catch (e) {
          out.push(rpcReply(msg.id, {
            content: [{ type: "text", text: String(e?.message ?? e) }],
            isError: true,
            /* stable kind travels on structuredContent so callers map errors
               without parsing message text. The observe event does not. */
            structuredContent: { kind: e?.kind ?? "invalid", message: String(e?.message ?? e) }
          }));
          const kind = typeof e?.kind === "string" && e.kind !== "" ? e.kind : "invalid";
          finish("error", kind);
        }
        continue;
      }
      out.push(rpcReply(msg.id ?? null, null, { code: -32601, message: `unknown method '${msg.method}'` }));
    }
    return Array.isArray(body) ? out : out[0];
  }
  return { handleRpc, tools };
}

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

// src/host/wait.js
var POLL_MS = 200;
function waitFor(rec, registry, bus, { output = null, children = null, timeoutMs = 18e4 } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const seen = /* @__PURE__ */ new Set();
    const finish = (reason, extra = {}) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearInterval(poll);
      unsub();
      resolve({ reason, turn: rec.turn, ...extra });
    };
    const unsub = bus.subscribe((ev) => {
      if (ev.type !== "snapshot") {
        if (ev.addr === rec.addr && ev.type === "finished") return finish("exit");
        if (ev.addr === rec.addr && ev.type === "status") {
          if (ev.status?.state !== "working" && rec.status?.state !== "working") return finish("status");
          if (ev.status?.state !== "working") return finish("status");
        }
        if (ev.addr === rec.addr && ev.type === "message") return finish("message");
        if (children && (ev.type === "status" || ev.type === "finished" || ev.type === "message")) {
          checkChildren();
        }
        return;
      }
    });
    const checkChildren = () => {
      if (!children) return;
      const kids = registry.childrenOf(rec);
      if (children === "all") {
        if (kids.length && kids.every((k) => k.exited || k.status?.state !== "working")) finish("children");
      } else if (children === "any") {
        for (const k of kids) {
          if (seen.has(k.id)) continue;
          if (k.exited || k.status?.state && k.status.state !== "working") {
            seen.add(k.id);
            finish("children", { child: k.addr });
          }
        }
      }
    };
    const poll = setInterval(() => {
      if (done) return;
      if (rec.exited) return finish("exit");
      if (rec.status && rec.status.state !== "working") return finish("status");
      if (output) {
        const text = rec.screenText(60, "detection");
        if (text.includes(output)) return finish("output");
      }
      checkChildren();
    }, POLL_MS);
    poll.unref?.();
    const timer = setTimeout(() => finish("timeout"), timeoutMs);
    timer.unref?.();
    if (rec.exited) return finish("exit");
    if (rec.status && rec.status.state !== "working") return finish("status");
    checkChildren();
  });
}
var NAMED_KEYS = {
  enter: "\r",
  esc: "\x1B",
  tab: "	",
  backspace: "\x7F",
  "ctrl+c": "",
  "ctrl+d": "",
  "ctrl+z": "",
  "ctrl+u": "",
  up: "\x1B[A",
  down: "\x1B[B",
  right: "\x1B[C",
  left: "\x1B[D",
  f1: "\x1BOP",
  f2: "\x1BOQ",
  f3: "\x1BOR",
  f4: "\x1BOS",
  f5: "\x1B[15~",
  f6: "\x1B[17~",
  f7: "\x1B[18~",
  f8: "\x1B[19~",
  f9: "\x1B[20~",
  f10: "\x1B[21~",
  f11: "\x1B[23~",
  f12: "\x1B[24~"
};

// src/host/notes.js
var MAX_NOTE = 32 * 1024;
var noteSeq = 0;
function makeEnvelope(fromAddr, body, id = null) {
  const nid = id ?? `n${++noteSeq}`;
  return `<dnt from=${fromAddr} id=${nid}>
${body}
</dnt>
`;
}
async function sendNote(registry, fromRef, toRef, body) {
  if (!body?.trim()) throw err(KIND.INVALID, "empty note");
  if (body.length > MAX_NOTE) throw err(KIND.INVALID, `note exceeds ${MAX_NOTE} bytes`);
  const to = registry.resolve(toRef);
  if (!to) throw err(KIND.NOT_FOUND, `no such terminal '${toRef}'`);
  if (to.exited) throw err(KIND.FINISHED, "target exited");
  if (!to.handle) throw err(KIND.UNAVAILABLE, "target not spawned (attach to wake)");
  const from = registry.resolve(fromRef);
  const fromAddr = from?.addr ?? String(fromRef ?? "external");
  const env = makeEnvelope(fromAddr, body);
  const paste = (to.mirror?.modes?.() ?? 0) & 1 << 3;
  const payload = `${paste ? "\x1B[200~" : ""}${env}${paste ? "\x1B[201~" : ""}`;
  await to.gate.submit(() => to.handle.write(payload), { kind: "note" });
  registry.bus?.emit("message", to.addr, { id: to.id, from: fromAddr, note: true });
  registry.audit?.({ op: "note", from: fromAddr, to: to.addr, bytes: env.length });
  return env.match(/id=([^ >]+)/)?.[1] ?? `n${noteSeq}`;
}

// src/host/templates.js
var TEMPLATES = {
  // fire a command, wait for its next turn end (or exit), return screen tail
  "run-command": {
    summary: "send a command, wait for the turn to finish, return output",
    params: ["cmd", "timeout?"],
    async run(rec, registry, bus, waitFor2, args, timeoutMs) {
      await rec.agentSend(args.cmd, { enter: true });
      const w = await waitFor2(rec, registry, bus, { timeoutMs });
      return { turn: rec.turn, reason: w.reason, output: rec.screenText(200, "recent") };
    }
  },
  // tail a long-running command: wait for an output pattern instead of a turn
  "wait-output": {
    summary: "send a command, wait for a screen pattern (not a turn end)",
    params: ["cmd", "output", "timeout?"],
    async run(rec, registry, bus, waitFor2, args, timeoutMs) {
      if (!args.output) throw err(KIND.INVALID, "wait-output needs {output}");
      await rec.agentSend(args.cmd, { enter: true });
      const w = await waitFor2(rec, registry, bus, { output: args.output, timeoutMs });
      return { turn: rec.turn, reason: w.reason, output: rec.screenText(60, "detection") };
    }
  },
  // REPL loop: send one expression, wait for the prompt line back
  repl: {
    summary: "send an expression into a running REPL, wait for the next prompt",
    params: ["expr", "prompt?", "timeout?"],
    async run(rec, registry, bus, waitFor2, args, timeoutMs) {
      const prompt = args.prompt ?? ">";
      await rec.agentSend(args.expr, { enter: true });
      const w = await waitFor2(rec, registry, bus, { output: prompt, timeoutMs });
      return { turn: rec.turn, reason: w.reason, output: rec.screenText(40, "detection") };
    }
  }
};
function templateList() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({ id, summary: t.summary, params: t.params }));
}
async function templateRun(rec, registry, bus, waitFor2, name, args, timeoutMs) {
  const t = TEMPLATES[name];
  if (!t) throw err(KIND.INVALID, `unknown template '${name}' \u2014 see term.template.list`);
  if (rec.exited) throw err(KIND.FINISHED, "terminal exited");
  return t.run(rec, registry, bus, waitFor2, args ?? {}, timeoutMs);
}

// src/host/mcp.js
var PROTOCOL_VERSION = "2025-06-18";
var schema = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "schema", "dnt-mcp.openrpc.json"), "utf8")
);
var TOOLS = schema.methods.map((m) => ({
  name: m.name,
  description: m.description,
  inputSchema: m.params
}));
var TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.name, t]));
function createMcpHandler({ ctx, registry, bus, auditPath, laneStatus, writeAudit }) {
  const audit = (event) => {
    if (typeof writeAudit === "function") writeAudit(event);
  };
  void auditPath;
  const target = (ref) => {
    const rec = registry.resolve(ref);
    if (!rec) throw err(KIND.NOT_FOUND, `no such terminal '${ref}'`);
    return rec;
  };
  async function processStats(rec) {
    if (process.platform === "win32" || !rec.handle?.pid) return { processes: null };
    try {
      const handle = ctx.subprocess.spawn({
        argv: ["/bin/ps", "-o", "pid=,ppid=,pcpu=,rss=,stat=,etime=,command=", "-ax"],
        cwd: "/",
        stdio: { stdin: "ignore", stdout: { maxBytes: 512 * 1024 }, stderr: { maxBytes: 8 * 1024 } },
        graceMs: 5e3
      });
      await handle.done.catch(() => {
      });
      const collected = handle.collected?.stdout?.readFrom(0);
      const text = collected?.text ?? "";
      const truncated = !!(collected && (collected.truncated || collected.hitLimit || text.length >= 512 * 1024));
      const rows = text.trim().split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
        const parts = line.split(/\s+/);
        return {
          pid: Number(parts[0]),
          ppid: Number(parts[1]),
          pcpu: Number(parts[2]),
          rssKb: Number(parts[3]),
          stat: parts[4] ?? null,
          etime: parts[5] ?? null,
          command: parts.slice(6).join(" ") || null
        };
      }).filter((p) => Number.isFinite(p.pid));
      const byParent = /* @__PURE__ */ new Map();
      for (const p of rows) {
        const list = byParent.get(p.ppid) ?? [];
        list.push(p);
        byParent.set(p.ppid, list);
      }
      const processes = [];
      const queue = [rec.handle.pid];
      const seen = /* @__PURE__ */ new Set();
      while (queue.length) {
        const pid = queue.shift();
        if (seen.has(pid)) continue;
        seen.add(pid);
        const rec2 = rows.find((r) => r.pid === pid);
        if (rec2) processes.push(rec2);
        for (const child of byParent.get(pid) ?? []) queue.push(child.pid);
      }
      return { processes, truncated };
    } catch {
      return { processes: null };
    }
  }
  async function callTool(name, args = {}) {
    switch (name) {
      case "term.session.create": {
        if (args.lane && args.lane !== "local") {
          throw err(KIND.INCOMPATIBLE, `lane '${args.lane}' has no local backend on this host; connect to its own MCP endpoint`);
        }
        const rec = await registry.create(args);
        audit({ op: "mcp.create", id: rec.id, addr: rec.addr, by: "tool" });
        return {
          id: rec.id,
          addr: rec.addr,
          ctx: rec.info().ctx,
          // `[ DNT:{conv8}@{term8} ]` when t+conv labels set
          lane: rec.lane,
          title: rec.title,
          labels: rec.labels,
          attach: { protocol: "dnt-ws-v1", url: `/dsh-nano-terminal/stream?session=${rec.id}` }
        };
      }
      case "term.session.list":
        return { sessions: registry.list() };
      case "term.ctx": {
        const ref = String(args.ref ?? "");
        const rec = registry.resolve(ref);
        if (!rec) throw err(KIND.NOT_FOUND, `no terminal matches '${ref}'`);
        audit({ op: "mcp.ctx", id: rec.id, addr: rec.addr, ref });
        return {
          id: rec.id,
          addr: rec.addr,
          ctx: rec.info().ctx,
          title: rec.title,
          lane: rec.lane,
          owner: rec.owner,
          phase: rec.phase,
          labels: rec.labels,
          attached: rec.sockets.size,
          exited: rec.exited
        };
      }
      case "term.session.input": {
        const rec = target(args.id);
        audit({ op: "mcp.input", id: rec.id, addr: rec.addr, bytes: args.data.length });
        await rec.writeInput(args.data, "agent");
        return { ok: true };
      }
      case "term.send": {
        const rec = target(args.id);
        audit({ op: "mcp.send", id: rec.id, addr: rec.addr, bytes: args.data.length, force: !!args.force });
        const r = await rec.agentSend(args.data, {
          enter: args.enter !== false,
          force: !!args.force,
          cond: args.if ?? null
        });
        if (args.wait) {
          const w = await waitFor(rec, registry, bus, { timeoutMs: (args.timeout ?? 180) * 1e3 });
          return { ok: true, turn: r.turn, wait: w };
        }
        return { ok: true, turn: r.turn };
      }
      case "term.keys": {
        const rec = target(args.id);
        if (rec.exited) throw err(KIND.FINISHED, "terminal exited");
        if (!rec.handle && rec.pending) await registry.spawnPending(rec);
        if (!rec.handle) throw err(KIND.UNAVAILABLE, "terminal has no live backend");
        if (rec.status?.state === "blocked" && !args.force) throw err(KIND.BLOCKED, "terminal reports blocked");
        const bytes = [];
        for (const k of args.keys ?? []) {
          const seq = NAMED_KEYS[k];
          if (seq === void 0) throw err(KIND.INVALID, `unknown key '${k}'`);
          bytes.push(seq);
        }
        await rec.gate.submit(() => rec.handle.write(bytes.join("")));
        return { ok: true };
      }
      case "term.interrupt": {
        const rec = target(args.id);
        if (rec.exited) throw err(KIND.FINISHED, "terminal exited");
        if (!rec.handle && rec.pending) await registry.spawnPending(rec);
        if (!rec.handle) throw err(KIND.UNAVAILABLE, "terminal has no live backend");
        audit({ op: "mcp.interrupt", id: rec.id, addr: rec.addr });
        const key = rec.status ? "\x1B" : "";
        const turnBefore = rec.turn;
        await rec.gate.submit(() => rec.handle.write(key), { urgent: true });
        const w = await waitFor(rec, registry, bus, { timeoutMs: (args.timeout ?? 10) * 1e3 });
        const result = w.reason === "exit" ? "exited" : w.reason === "status" || rec.turn > turnBefore ? "stopped" : w.reason === "timeout" ? "still_working" : "unknown";
        return { result };
      }
      case "term.wait": {
        const rec = target(args.id);
        audit({ op: "mcp.wait", id: rec.id, addr: rec.addr, output: args.output });
        return waitFor(rec, registry, bus, {
          output: args.output ?? null,
          children: args.children ?? null,
          timeoutMs: (args.timeout ?? 180) * 1e3
        });
      }
      case "term.session.read": {
        const rec = target(args.id);
        if (!rec.handle && rec.pending) await registry.spawnPending(rec);
        const lines = Number.isFinite(Number(args.lines)) ? Math.min(Math.max(Math.floor(Number(args.lines)), 0), 500) : 50;
        return {
          id: rec.id,
          addr: rec.addr,
          text: rec.screenText(lines, args.source ?? "visible"),
          complete: !(rec.status?.state === "working" || rec.status?.state === "blocked")
        };
      }
      case "term.session.copy": {
        const rec = target(args.id);
        if (!rec.handle && rec.pending) await registry.spawnPending(rec);
        const lines = Number.isFinite(Number(args.lines)) ? Math.min(Math.max(Math.floor(Number(args.lines)), 0), 2e3) : 200;
        const text = rec.screenText(lines, args.source ?? "visible");
        audit({ op: "mcp.copy", id: rec.id, addr: rec.addr, lines: text.split("\n").length });
        return { id: rec.id, addr: rec.addr, text };
      }
      case "term.session.screenshot": {
        const rec = target(args.id);
        if (!rec.handle && rec.pending) await registry.spawnPending(rec);
        const view = rec.alignView();
        audit({ op: "mcp.screenshot", id: rec.id, addr: rec.addr });
        return {
          id: rec.id,
          addr: rec.addr,
          ctx: rec.info().ctx,
          ...view,
          title: rec.title,
          status: rec.status
        };
      }
      case "term.session.clear": {
        const rec = target(args.id);
        if (rec.exited) throw err(KIND.FINISHED, "terminal exited");
        if (!rec.handle && rec.pending) await registry.spawnPending(rec);
        if (!rec.handle) throw err(KIND.UNAVAILABLE, "terminal has no live backend");
        audit({ op: "mcp.clear", id: rec.id, addr: rec.addr });
        await rec.gate.submit(() => rec.handle.write("\f"));
        return { ok: true };
      }
      case "term.session.stats": {
        const rec = target(args.id);
        const [stats, foreground] = await Promise.all([
          processStats(rec),
          rec.handle?.inspectForeground?.().catch(() => void 0) ?? Promise.resolve(void 0)
        ]);
        return {
          id: rec.id,
          addr: rec.addr,
          ctx: rec.info().ctx,
          pid: rec.handle?.pid ?? null,
          ...stats,
          foreground: foreground ?? null,
          activity: (rec.handle ? await rec.handle.inspectActivity?.().catch(() => null) : null) ?? null,
          status: rec.status,
          phase: rec.phase,
          exited: rec.exited,
          cols: rec.meta?.cols ?? null,
          rows: rec.meta?.rows ?? null
        };
      }
      case "term.session.resize": {
        const rec = target(args.id);
        await rec.resize(args.cols, args.rows);
        return { ok: true };
      }
      case "term.session.keep": {
        const rec = target(args.id);
        rec.keep = args.keep !== false;
        audit({ op: "mcp.keep", id: rec.id, addr: rec.addr, keep: rec.keep });
        bus.emit("labels", rec.addr, { id: rec.id, keep: rec.keep, labels: rec.labels });
        return { ok: true, keep: rec.keep };
      }
      case "term.session.label": {
        const rec = target(args.id);
        const labels = rec.setLabels(args.set, args.unset);
        return { ok: true, labels };
      }
      case "term.session.note": {
        const rec = target(args.id);
        const id = await sendNote(registry, args.from, rec.id, args.body);
        return { ok: true, id };
      }
      case "term.template.list":
        return { templates: templateList() };
      case "term.template.run": {
        const rec = target(args.id);
        const r = await templateRun(rec, registry, bus, waitFor, args.template, args.args, (args.timeout ?? 180) * 1e3);
        return { ok: true, ...r };
      }
      case "term.events":
        return bus.since(args.since ?? 0);
      case "term.session.close": {
        const ok2 = await registry.close(args.id, args.reason ?? "mcp");
        return { closed: ok2 };
      }
      case "term.audit":
        return { log: readAuditTail(auditPath, Math.min(args.lines ?? 50, 500)) };
      case "term.lane.status":
        return { lanes: laneStatus() };
      case "term.health": {
        const sessions = registry.list();
        const alive = sessions.filter((s) => !s.exited);
        return {
          ok: true,
          lanes: laneStatus(),
          sessions: {
            total: sessions.length,
            alive: alive.length,
            exited: sessions.length - alive.length,
            working: sessions.filter((s) => s.status?.state === "working").length,
            blocked: sessions.filter((s) => s.status?.state === "blocked").length
          },
          list: sessions.map((s) => ({ addr: s.addr, ctx: s.ctx, phase: s.phase, status: s.status?.state ?? null, attached: s.attached, exited: !!s.exited }))
        };
      }
      case "term.skill": {
        const skill = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "skill.md"), "utf8");
        return { skill };
      }
      default:
        throw err(KIND.INVALID, `unknown tool '${name}'`);
    }
  }
  const toolset = createMcpToolset({
    schema,
    dispatch: (name, args) => callTool(name, args),
    protocolVersion: PROTOCOL_VERSION,
    serverInfo: { name: "dsh-nano-terminal", version: "0.2.0" },
    plugin: "dsh-nano-terminal",
    observe: (event) => globalThis[Symbol.for("dsh.perfReviewHost.v2")]?.observe?.(event)
  });
  return { handleRpc: (body) => toolset.handleRpc(body), audit, tools: TOOLS };
}
function readAuditTail(path, lines) {
  try {
    const text = readFileSync(path, "utf8");
    return text.trim().split("\n").slice(-lines);
  } catch {
    return [];
  }
}
export {
  TOOLS,
  createMcpHandler
};
