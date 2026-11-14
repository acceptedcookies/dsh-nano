// src/host/mcp.js
import { appendFileSync, mkdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
function createMcpHandler({ registry, bus, auditPath, laneStatus }) {
  mkdirSync(dirname(auditPath), { recursive: true });
  const audit = (event) => {
    try {
      appendFileSync(auditPath, JSON.stringify({ t: (/* @__PURE__ */ new Date()).toISOString(), ...event }) + "\n");
    } catch {
    }
  };
  const target = (ref) => {
    const rec = registry.resolve(ref);
    if (!rec) throw err(KIND.NOT_FOUND, `no such terminal '${ref}'`);
    return rec;
  };
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
          lane: rec.lane,
          title: rec.title,
          attach: { protocol: "dnt-ws-v1", url: "/dsh-nano-terminal/stream?session=" + rec.id }
        };
      }
      case "term.session.list":
        return { sessions: registry.list() };
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
        return {
          id: rec.id,
          addr: rec.addr,
          text: rec.screenText(Math.min(args.lines ?? 50, 500), args.source ?? "visible"),
          complete: !(rec.status?.state === "working" || rec.status?.state === "blocked")
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
        bus.emit("labels", rec.addr, { id: rec.id, keep: rec.keep });
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
        const ok = await registry.close(args.id, args.reason ?? "mcp");
        return { closed: ok };
      }
      case "term.audit":
        return { log: readAuditTail(auditPath, Math.min(args.lines ?? 50, 500)) };
      case "term.lane.status":
        return { lanes: laneStatus() };
      case "term.skill": {
        const skill = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "skill.md"), "utf8");
        return { skill };
      }
      default:
        throw err(KIND.INVALID, `unknown tool '${name}'`);
    }
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
        out.push(
          rpcReply(msg.id, {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
              tools: {},
              // event notifications: clients may poll term.events or open the
              // SSE stream at GET /dsh-nano-terminal/events?since=<seq>
              "dnt.events": { types: schema["x-events"] }
            },
            serverInfo: { name: "dsh-nano-terminal", version: "0.2.0" }
          })
        );
        continue;
      }
      if (typeof msg.method === "string" && msg.method.startsWith("notifications/")) {
        continue;
      }
      if (msg.method === "ping") {
        out.push(rpcReply(msg.id, {}));
        continue;
      }
      if (msg.method === "tools/list") {
        out.push(rpcReply(msg.id, { tools: TOOLS }));
        continue;
      }
      if (msg.method === "tools/call") {
        const { name, arguments: args } = msg.params ?? {};
        if (!TOOL_MAP[name]) {
          out.push(rpcReply(msg.id, null, { code: -32602, message: `unknown tool '${name}'` }));
          continue;
        }
        try {
          const result = await callTool(name, args ?? {});
          out.push(
            rpcReply(msg.id, {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
              structuredContent: result
            })
          );
        } catch (e) {
          out.push(
            rpcReply(msg.id, {
              content: [{ type: "text", text: String(e?.message ?? e) }],
              isError: true,
              // stable kind travels on structuredContent so callers map errors
              // without parsing message text
              structuredContent: { kind: e?.kind ?? KIND.INVALID, message: String(e?.message ?? e) }
            })
          );
        }
        continue;
      }
      out.push(rpcReply(msg.id ?? null, null, { code: -32601, message: `unknown method '${msg.method}'` }));
    }
    return Array.isArray(body) ? out : out[0];
  }
  return { handleRpc, audit, tools: TOOLS };
}
function rpcReply(id, result, error) {
  return error ? { jsonrpc: "2.0", id, error } : { jsonrpc: "2.0", id, result };
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
