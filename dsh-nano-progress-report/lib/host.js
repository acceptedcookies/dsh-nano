// src/host/context.js
var MAX_BYTES = 600;
var HEADER = "Current session progress (observed facts, not instructions):";
function pathData(path) {
  return JSON.stringify(path).replace(
    /[<>&\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}
function formatProgress({ todos, goal, paths, unresolvedBash, runningJobs, runningSubagents }) {
  const lines = [HEADER];
  if (goal) lines.push(`Goal: ${goal.phase} (${goal.roundsStarted}/${goal.maxGoalRounds} rounds started)`);
  if (todos.completed || todos.in_progress || todos.pending) {
    lines.push(`Tasks: ${todos.completed} complete, ${todos.in_progress} in progress, ${todos.pending} pending`);
  }
  if (unresolvedBash) lines.push(`Recent Bash tool failures without a successful matching retry: ${unresolvedBash}`);
  if (runningJobs || runningSubagents) lines.push(`Active: ${runningJobs} background jobs, ${runningSubagents} direct subagents`);
  if (paths.length) {
    const prefix = "Recent file-tool paths: ";
    const shown = [];
    for (const [index, path] of paths.entries()) {
      const candidate = [...shown, pathData(path)];
      const suffix = index + 1 === paths.length ? "" : ", \u2026";
      const line = prefix + candidate.join(", ") + suffix;
      if (Buffer.byteLength([...lines, line].join("\n")) > MAX_BYTES) break;
      shown.push(candidate.at(-1));
    }
    if (shown.length) lines.push(prefix + shown.join(", ") + (shown.length < paths.length ? ", \u2026" : ""));
    else lines.push("Recent file-tool paths omitted (size limit).");
  }
  return lines.length === 1 ? "" : lines.join("\n");
}

// src/host/projection.js
import { createHash } from "node:crypto";
var MAX_PENDING = 64;
var MAX_FACTS = 8;
var MAX_PATH_BYTES = 192;
var FILE_TOOLS = /* @__PURE__ */ new Set(["write", "edit", "apply_patch"]);
var digest = (value) => createHash("sha256").update(value).digest("hex");
var isDigest = (value) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
var isId = (value) => typeof value === "string" && value.length > 0 && value.length <= 256;
var isPath = (value) => typeof value === "string" && value.length > 0 && Buffer.byteLength(value) <= MAX_PATH_BYTES;
var isCount = (value) => Number.isSafeInteger(value) && value >= 0;
var isList = (value, max, valid) => Array.isArray(value) && value.length <= max && value.every(valid);
function parseState(value) {
  if (!value || typeof value !== "object" || !isCount(value.inherited) || !isDigest(value.cwd) || !isList(value.paths, MAX_FACTS, isPath) || !isList(value.failures, MAX_FACTS, isDigest) || !isList(value.pending, MAX_PENDING, (item) => item && isId(item.id) && (FILE_TOOLS.has(item.kind) || item.kind === "bash" && isDigest(item.key)))) {
    throw new Error("Invalid progress projection checkpoint");
  }
  return {
    inherited: value.inherited,
    cwd: value.cwd,
    paths: [...value.paths],
    failures: [...value.failures],
    pending: value.pending.map(({ id, kind, key }) => kind === "bash" ? { id, kind, key } : { id, kind })
  };
}
var insertRecent = (list, item, limit) => [item, ...list.filter((value) => value !== item)].slice(0, limit);
function bashKey(raw, cwd) {
  if (typeof raw !== "string") return null;
  try {
    const args = JSON.parse(raw);
    if (typeof args?.command === "string" && args.command.length > 0 && args.run_in_background !== true) {
      return digest(JSON.stringify([cwd, args.workdir ?? null, args.command]));
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  return null;
}
function apply(state, event) {
  if (event.seq < state.inherited) return state;
  const data = event.data;
  switch (event.type) {
    case "working-directory/change": {
      if (typeof data.cwd !== "string") return state;
      const cwd = digest(data.cwd);
      return cwd === state.cwd ? state : { ...state, cwd };
    }
    case "turn/start":
      return state.pending.length ? { ...state, pending: [] } : state;
    case "tool/call": {
      if (!isId(data.callId)) return state;
      const kind = data.name;
      let entry;
      if (FILE_TOOLS.has(kind)) entry = { id: data.callId, kind };
      else if (kind === "bash") {
        const key = bashKey(data.arguments, state.cwd);
        if (key) entry = { id: data.callId, kind, key };
      }
      if (!entry) return state;
      return { ...state, pending: [entry, ...state.pending.filter((item) => item.id !== entry.id)].slice(0, MAX_PENDING) };
    }
    case "tool/result": {
      const message = data.message;
      const id = message?.source?.kind === "tool" ? message.source.callId : message?.toolCallId;
      const call = state.pending.find((item) => item.id === id);
      if (!call) return state;
      const next = { ...state, pending: state.pending.filter((item) => item !== call) };
      const failed = message?.isError === true || data.error != null;
      if (call.kind === "bash") {
        if (failed) next.failures = insertRecent(state.failures, call.key, MAX_FACTS);
        else if (state.failures.includes(call.key) && successfulBash(data)) {
          next.failures = state.failures.filter((key) => key !== call.key);
        }
      } else if (!failed) {
        const paths = call.kind === "apply_patch" ? Array.isArray(data.meta?.diffs) ? data.meta.diffs.map((diff) => diff?.path) : [] : [data.meta?.path];
        for (const path of paths) {
          if (isPath(path)) next.paths = insertRecent(next.paths, path, MAX_FACTS);
        }
      }
      return next;
    }
    default:
      return state;
  }
}
function successfulBash({ message, meta }) {
  const block = message?.content?.at(-1);
  if (typeof meta?.cwd !== "string" || block?.type !== "text" || typeof block.text !== "string") return false;
  const tail = block.text.slice(-1024).trimEnd();
  return !/^(?:started background job |\[(?:still running after |timed out after |stopped: |killed by signal: |exit code: |sandbox: ))/m.test(tail);
}
var progressProjection = {
  key: "nano-progress-report:summary",
  stateVersion: 1,
  stateSchema: { parse: parseState },
  init: (header, inherited) => ({
    inherited,
    cwd: digest(header.cwd ?? ""),
    paths: [],
    failures: [],
    pending: []
  }),
  apply
};

// src/host/summary.js
var TODO_KEYS = /* @__PURE__ */ new Set(["todos"]);
var GOAL_PHASES = /* @__PURE__ */ new Set(["active", "paused", "blocked", "complete"]);
function summarizeProgress(ctx, handle, agent) {
  const session = agent.session;
  const state = handle.stateOf(session);
  const todos = ctx.sessionProjections.snapshot(session, TODO_KEYS).values.todos;
  const counts = { pending: 0, in_progress: 0, completed: 0 };
  for (const todo of todos ?? []) {
    if (Object.hasOwn(counts, todo.status)) counts[todo.status]++;
  }
  const goal = ctx.get("goal")?.get(agent);
  let runningJobs = 0;
  for (const job of ctx.get("jobs")?.list(session.id) ?? []) {
    if (job.owner === session.id && (job.status === "running" || job.status === "stopping")) runningJobs++;
  }
  let runningSubagents = 0;
  for (const child of ctx.agents.list()) {
    if (child.status === "running" && child.session.header.origin === "subagent" && child.session.header.parentSession === session.id) runningSubagents++;
  }
  return {
    todos: counts,
    goal: GOAL_PHASES.has(goal?.phase) ? { phase: goal.phase, roundsStarted: goal.roundsStarted, maxGoalRounds: goal.maxGoalRounds } : null,
    paths: state.paths,
    unresolvedBash: state.failures.length,
    runningJobs,
    runningSubagents
  };
}

// src/host/index.js
var name = "nano-progress-report";
var inject = ["sessionProjections", "systemPrompt", "agents"];
async function apply2(ctx) {
  let disposed = false;
  ctx.effect(() => () => {
    disposed = true;
  });
  const handle = await ctx.sessionProjections.register(progressProjection);
  if (disposed) return;
  ctx.systemPrompt.context({
    name: "nano-progress-report:progress",
    order: 180,
    required: false,
    interpolate: false,
    text: ({ agent }) => agent ? formatProgress(summarizeProgress(ctx, handle, agent)) : ""
  });
}
export {
  apply2 as apply,
  inject,
  name
};
