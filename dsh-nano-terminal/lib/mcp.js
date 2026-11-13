// src/host/mcp.js
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
var PROTOCOL_VERSION = "2025-06-18";
var TOOLS = [
  {
    name: "term.session.create",
    description: "Open a terminal session on a lane (local PTY | mcp remote | isolate). Returns session id and attach metadata.",
    inputSchema: {
      type: "object",
      properties: {
        lane: { type: "string", enum: ["local", "mcp", "isolate"], default: "local" },
        sessionId: { type: "string", description: "owning dsh session (for cwd + scoping)" },
        shell: { type: "string" },
        args: { type: "array", items: { type: "string" } },
        cwd: { type: "string" },
        cols: { type: "integer" },
        rows: { type: "integer" },
        title: { type: "string" }
      }
    }
  },
  {
    name: "term.session.list",
    description: "List live terminal sessions with lane, owner, title and exit state.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "term.session.input",
    description: "Write input bytes to a session (utf-8 text; \r for Enter).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" }, data: { type: "string" } },
      required: ["id", "data"]
    }
  },
  {
    name: "term.session.read",
    description: "Read the last N rendered screen lines of a session (wasm mirror).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" }, lines: { type: "integer", default: 50 } },
      required: ["id"]
    }
  },
  {
    name: "term.session.resize",
    description: "Resize a session terminal.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" }, cols: { type: "integer" }, rows: { type: "integer" } },
      required: ["id", "cols", "rows"]
    }
  },
  {
    name: "term.session.close",
    description: "Terminate a session and its process range.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" }, reason: { type: "string" } },
      required: ["id"]
    }
  },
  {
    name: "term.audit",
    description: "Read the audit log (newest last).",
    inputSchema: {
      type: "object",
      properties: { lines: { type: "integer", default: 50 } }
    }
  },
  {
    name: "term.lane.status",
    description: "Report available lanes and their health.",
    inputSchema: { type: "object", properties: {} }
  }
];
var TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.name, t]));
function createMcpHandler({ registry, auditPath, laneStatus }) {
  mkdirSync(dirname(auditPath), { recursive: true });
  const audit = (event) => {
    try {
      appendFileSync(auditPath, JSON.stringify({ t: (/* @__PURE__ */ new Date()).toISOString(), ...event }) + "\n");
    } catch {
    }
  };
  async function callTool(name, args = {}) {
    switch (name) {
      case "term.session.create": {
        if (args.lane && args.lane !== "local") {
          throw rpcError(`lane '${args.lane}' has no local backend on this host; connect to its own MCP endpoint`);
        }
        const rec = await registry.create(args);
        audit({ op: "mcp.create", id: rec.id, by: "tool" });
        return { id: rec.id, lane: rec.lane, title: rec.title, attach: { protocol: "dnt-ws-v1", path: "/dsh-nano-terminal/stream" } };
      }
      case "term.session.list":
        return { sessions: registry.list() };
      case "term.session.input": {
        const rec = registry.get(args.id);
        if (!rec) throw rpcError("no such session");
        audit({ op: "mcp.input", id: args.id, bytes: args.data.length });
        await rec.writeInput(args.data);
        return { ok: true };
      }
      case "term.session.read": {
        const rec = registry.get(args.id);
        if (!rec) throw rpcError("no such session");
        return { id: args.id, text: rec.screenText(Math.min(args.lines ?? 50, 500)) };
      }
      case "term.session.resize": {
        const rec = registry.get(args.id);
        if (!rec) throw rpcError("no such session");
        await rec.resize(args.cols, args.rows);
        return { ok: true };
      }
      case "term.session.close": {
        const ok = await registry.close(args.id, args.reason ?? "mcp");
        return { closed: ok };
      }
      case "term.audit":
        return { log: readAuditTail(auditPath, Math.min(args.lines ?? 50, 500)) };
      case "term.lane.status":
        return { lanes: laneStatus() };
      default:
        throw rpcError(`unknown tool '${name}'`);
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
            capabilities: { tools: {} },
            serverInfo: { name: "dsh-nano-terminal", version: "0.1.0" }
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
        } catch (err) {
          out.push(
            rpcReply(msg.id, {
              content: [{ type: "text", text: String(err?.message ?? err) }],
              isError: true
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
function rpcError(message) {
  const e = new Error(message);
  e.rpc = true;
  return e;
}
function readAuditTail(path, lines) {
  try {
    const { readFileSync: readFileSync2 } = requireFs();
    const text = readFileSync2(path, "utf8");
    return text.trim().split("\n").slice(-lines);
  } catch {
    return [];
  }
}
function requireFs() {
  return { readFileSync };
}
export {
  TOOLS,
  createMcpHandler
};
