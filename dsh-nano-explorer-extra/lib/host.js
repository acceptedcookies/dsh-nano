// src/host/routes.js
import { watch } from "node:fs";

// ../packages/dsh-performance-review/src/state.js
var LIB_VERSION = "0.1.0";
var NAME_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
var RESERVOIR_CAP = 64;
function createSpanRow() {
  return { n: 0, window: [], reservoir: [] };
}

// ../packages/dsh-performance-review/src/host.js
var WRITE_INTERVAL_MS = 3e4;
var WINDOW_SAMPLE_CAP = 512;
var isPromiseLike = (value) => value !== null && typeof value === "object" && typeof value.then === "function";
function hostSnapshot(state) {
  const plugins = {};
  for (const [pluginId, row] of state.plugins) {
    const spans = {};
    for (const [name2, span] of row.spans) {
      spans[name2] = {
        n: span.n,
        samples: [...span.reservoir],
        windowN: span.window.length,
        windowSamples: [...span.window]
      };
    }
    plugins[pluginId] = { version: row.version ?? null, spans };
  }
  return {
    version: 1,
    enabled: state.enabled,
    observerVersion: LIB_VERSION,
    contributors: state.contributors.map((c) => ({ ...c })),
    sinceStart: state.sinceStart,
    writtenAt: (/* @__PURE__ */ new Date()).toISOString(),
    plugins,
    structure: { hostWriteErrors: state.writeErrors }
  };
}
function takeWindow(state) {
  const snap = hostSnapshot(state);
  const plugins = {};
  for (const [pluginId, row] of state.plugins) {
    const spans = {};
    for (const [name2, span] of row.spans) {
      spans[name2] = { n: span.window.length, samples: [...span.window] };
    }
    plugins[pluginId] = { version: row.version ?? null, spans };
  }
  for (const row of state.plugins.values()) {
    for (const span of row.spans.values()) span.window.length = 0;
  }
  return { ...snap, window: true, plugins };
}
function createPerfReviewHost(env = {}) {
  const processRef = env.process ?? globalThis.process;
  const state = {
    enabled: env.forceEnabled !== void 0 ? env.forceEnabled === true : null,
    plugins: /* @__PURE__ */ new Map(),
    contributors: [],
    writeErrors: 0,
    sinceStart: (/* @__PURE__ */ new Date()).toISOString(),
    writer: null
  };
  const dataDir = () => processRef.env?.DSH_DATA_DIR ?? processRef.env?.DSH_HOME ?? null;
  const writeFile = async () => {
    const fs = env.fs ?? await import("node:fs/promises");
    const path = env.path ?? await import("node:path");
    const dir = dataDir() ?? `${processRef.env?.HOME ?? ""}/.dsh`;
    const target = path.join(dir, "plugins", "perf-review");
    try {
      await fs.mkdir(target, { recursive: true });
      await fs.writeFile(path.join(target, "host.json"), JSON.stringify(hostSnapshot(state), null, 2));
    } catch {
      state.writeErrors += 1;
    }
  };
  const startWriter = () => {
    if (state.writer !== null) return;
    const setIntervalRef = env.setInterval ?? setInterval;
    state.writer = setIntervalRef(() => {
      void writeFile();
    }, WRITE_INTERVAL_MS);
    if (typeof state.writer?.unref === "function") state.writer.unref();
    try {
      processRef.once?.("beforeExit", () => {
        void writeFile();
      });
    } catch {
    }
  };
  const decideEnabled = () => {
    if (state.enabled === null) {
      state.enabled = env.forceEnabled !== void 0 ? env.forceEnabled === true : processRef.env?.DSH_PERF_REVIEW === "1";
      if (state.enabled) startWriter();
    }
    return state.enabled;
  };
  const recordSpan = (row, name2, t0, t1) => {
    if (!NAME_RE.test(name2)) return;
    let span = row.spans.get(name2);
    if (span === void 0) {
      span = createSpanRow();
      row.spans.set(name2, span);
    }
    span.n += 1;
    const ms = t1 - t0;
    span.window.push(ms);
    while (span.window.length > WINDOW_SAMPLE_CAP) span.window.shift();
    if (span.reservoir.length < RESERVOIR_CAP) span.reservoir.push(ms);
    else {
      const slot = Math.floor(Math.random() * span.n);
      if (slot < RESERVOIR_CAP) span.reservoir[slot] = ms;
    }
  };
  const disabledApi = () => ({
    hostSpan(_name, fn) {
      return fn();
    },
    count() {
    },
    // Diagnostic access stays available even when collection is off: the
    // browser poll then sees `{enabled:false}` rather than a 404.
    snapshot: () => hostSnapshot(state),
    takeWindow: () => takeWindow(state)
  });
  const hostJoin = (pluginId, impl = {}) => {
    decideEnabled();
    let row = state.plugins.get(pluginId);
    if (row === void 0) {
      row = { version: impl.version ?? null, spans: /* @__PURE__ */ new Map() };
      state.plugins.set(pluginId, row);
    }
    state.contributors.push({ pluginId, libVersion: impl.libVersion ?? LIB_VERSION });
    if (!state.enabled) return disabledApi();
    const clock = env.performance ?? globalThis.performance;
    const now = () => clock.now();
    return {
      hostSpan(name2, fn) {
        if (!NAME_RE.test(name2)) return fn();
        const t0 = now();
        let result;
        try {
          result = fn();
        } catch (error) {
          recordSpan(row, name2, t0, now());
          throw error;
        }
        if (isPromiseLike(result)) {
          return result.finally(() => recordSpan(row, name2, t0, now()));
        }
        recordSpan(row, name2, t0, now());
        return result;
      },
      count() {
      },
      snapshot: () => hostSnapshot(state),
      takeWindow: () => takeWindow(state)
    };
  };
  return {
    hostJoin,
    snapshot: () => hostSnapshot(state),
    takeWindow: () => takeWindow(state),
    flush: () => writeFile(),
    _state: () => state,
    libVersion: LIB_VERSION
  };
}
function ensurePerfReviewHost(env = {}) {
  const global = env.global ?? globalThis;
  if (global.__perfReviewHost == null) global.__perfReviewHost = createPerfReviewHost(env);
  return global.__perfReviewHost;
}

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
  function registerRoutes3(ctx, specs) {
    const conn = ctx.get("connection");
    if (!conn) throw new RouteGuardError("no-connection", "no connection service");
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
  return { registerRoutes: registerRoutes3, inventory, lookup };
}
function registerRoutes(ctx, specs, { table, plugin } = {}) {
  return createGuard({ table, plugin }).registerRoutes(ctx, specs);
}

// src/host/route-table.js
var PLUGIN = "dsh-nano-explorer-extra";
var ROUTE_TABLE = [
  {
    "plugin": "dsh-nano-explorer-extra",
    "path": "/nano-explorer-extra/status",
    "methods": [
      "GET"
    ],
    "sensitivity": "L0",
    "capability": "proc:git",
    "bodyLimit": 0,
    "sessionBinding": true,
    "justification": "dsh-nano-explorer-extra/src/host/routes.js:226 \u2014 read-only git status/stats for one session workspace; returns no secrets. scopeOf resolves caller-supplied sessionId (finding scopeof-cross-session, harden) \u2014 session-scoped read by design."
  },
  {
    "plugin": "dsh-nano-explorer-extra",
    "path": "/nano-explorer-extra/commit",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "proc:git",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-explorer-extra/src/host/routes.js:261 \u2014 runs `git add --all` + `git commit` as the host user; executes a process and can invoke attacker-controlled .git filter drivers (finding git-config-filter-exec). Host-level exec."
  },
  {
    "plugin": "dsh-nano-explorer-extra",
    "path": "/nano-explorer-extra/pull",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "proc:git",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-explorer-extra/src/host/routes.js:273 \u2014 `git pull --ff-only`: host process exec + outbound net to the configured remote + merge writes into the workspace."
  },
  {
    "plugin": "dsh-nano-explorer-extra",
    "path": "/nano-explorer-extra/checkout",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "proc:git",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-explorer-extra/src/host/routes.js:285 \u2014 `git checkout` as the host user; process exec that can rewrite workspace files and trigger smudge filters."
  },
  {
    "plugin": "dsh-nano-explorer-extra",
    "path": "/nano-explorer-extra/create-file",
    "methods": [
      "POST"
    ],
    "sensitivity": "L1",
    "capability": "write:workspace",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-explorer-extra/src/host/routes.js:297 + mutate.js \u2014 bounded write of a new file inside the session workspace after resolve+policy check; symlink-escape fence is the P2 harden item."
  },
  {
    "plugin": "dsh-nano-explorer-extra",
    "path": "/nano-explorer-extra/create-folder",
    "methods": [
      "POST"
    ],
    "sensitivity": "L1",
    "capability": "write:workspace",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-explorer-extra/src/host/routes.js:310 + mutate.js \u2014 bounded mkdir inside the session workspace; same realpath-fence hardening as the other mutations."
  },
  {
    "plugin": "dsh-nano-explorer-extra",
    "path": "/nano-explorer-extra/rename",
    "methods": [
      "POST"
    ],
    "sensitivity": "L1",
    "capability": "write:workspace",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-explorer-extra/src/host/routes.js:324 + mutate.js \u2014 rename/move inside the workspace; bounded write once realpath fencing is in place."
  },
  {
    "plugin": "dsh-nano-explorer-extra",
    "path": "/nano-explorer-extra/move",
    "methods": [
      "POST"
    ],
    "sensitivity": "L1",
    "capability": "write:workspace",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-explorer-extra/src/host/routes.js:340 + mutate.js \u2014 move entries inside the workspace; bounded write (symlink-escape fence pending)."
  },
  {
    "plugin": "dsh-nano-explorer-extra",
    "path": "/nano-explorer-extra/delete",
    "methods": [
      "POST"
    ],
    "sensitivity": "L1",
    "capability": "write:workspace",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-explorer-extra/src/host/routes.js:358 + mutate.js \u2014 delete inside the workspace (root itself refused); bounded write once fenced."
  },
  {
    "plugin": "dsh-nano-explorer-extra",
    "path": "/nano-explorer-extra/ignored",
    "methods": [
      "POST"
    ],
    "sensitivity": "L0",
    "capability": "read:workspace",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-explorer-extra/src/host/routes.js:373 \u2014 `git check-ignore` style read over workspace paths; no write, no secret."
  },
  {
    "plugin": "dsh-nano-explorer-extra",
    "path": "/nano-explorer-extra/list",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-explorer-extra/src/host/routes.js:384 \u2014 directory listing never fenced to the workspace (finding nxe:routes-read-arbitrary-file, accepted); enumerates arbitrary host dirs = host-level read."
  },
  {
    "plugin": "dsh-nano-explorer-extra",
    "path": "/nano-explorer-extra/perf-review/host",
    "methods": [
      "GET"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 0,
    "sessionBinding": false,
    "justification": "dsh-nano-explorer-extra/src/host/routes.js:400 \u2014 process-global perf reservoir; mode=window drains samples across all plugins/sessions (finding perf-review-window-drain, accepted). Cross-session process state, not session-scoped."
  },
  {
    "plugin": "dsh-nano-explorer-extra",
    "path": "/nano-explorer-extra/read",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-explorer-extra/src/host/routes.js:412 \u2014 returns any UTF-8 host file up to 1 MiB; client may pass allowOutsideWorkspace:true to skip the fence (finding routes-read-arbitrary-file, accepted). Host-level read."
  }
];

// src/host/git.js
var GIT_TOMBSTONES = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_COMMON_DIR",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_CONFIG",
  "GIT_CONFIG_PARAMETERS",
  "GIT_CONFIG_COUNT",
  "GIT_CEILING_DIRECTORIES",
  "GIT_PREFIX",
  "GIT_SHALLOW_FILE",
  "GIT_GRAFT_FILE",
  "GIT_REPLACE_REF_BASE",
  "GIT_ATTR_SOURCE"
];
var GIT_PREFIX = ["--no-optional-locks", "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false"];
var LINEFEED = String.fromCharCode(10);
var NOT_A_CHECKOUT = /not a git repository|must be run in a work tree/i;
async function remoteDivergence(ctx, config, request) {
  const read = async (range) => {
    const result = await runGit(ctx, config, {
      ...request,
      args: ["diff", "--name-status", "--no-renames", range],
      allowedExitCodes: [0, 128]
    }).catch(() => void 0);
    if (result === void 0 || result.exitCode !== 0) return void 0;
    const entries = [];
    for (const line of result.stdout.split("\n")) {
      if (line.trim() === "") continue;
      const [letter, ...rest] = line.split("	");
      const path = rest.join("	");
      if (path === "") continue;
      const status = letter.startsWith("A") ? "A" : letter.startsWith("D") ? "D" : letter.startsWith("R") ? "R" : "M";
      entries.push({ path, status });
    }
    return entries;
  };
  const base = await runGit(ctx, config, {
    ...request,
    args: ["merge-base", "HEAD", "@{u}"],
    allowedExitCodes: [0, 128]
  }).catch(() => void 0);
  if (base === void 0 || base.exitCode !== 0) return void 0;
  const forkPoint = base.stdout.trim();
  if (forkPoint === "") return void 0;
  const pushed = await read(`${forkPoint}..HEAD`);
  const pulled = await read(`${forkPoint}..@{u}`);
  if (pushed === void 0 && pulled === void 0) return void 0;
  return { pushed: pushed ?? [], pulled: pulled ?? [] };
}
function gitEnvironment() {
  const env = {};
  for (const key of GIT_TOMBSTONES) env[key] = void 0;
  env.GIT_TERMINAL_PROMPT = "0";
  env.GIT_OPTIONAL_LOCKS = "0";
  env.GIT_NO_LAZY_FETCH = "1";
  env.LC_ALL = "C";
  return env;
}
function budget(parent, ms) {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(new Error("git command timed out")), ms);
  timer.unref?.();
  const signal = parent === void 0 ? stop.signal : AbortSignal.any([parent, stop.signal]);
  return { signal, dispose: () => {
    clearTimeout(timer);
  } };
}
var resolvedProgram = /* @__PURE__ */ new Map();
async function runGit(ctx, config, request) {
  const { cwd, policy, args, signal, allowedExitCodes = [0] } = request;
  const scope = budget(signal, config.gitTimeoutMs);
  try {
    let program = resolvedProgram.get(config.gitCommand);
    if (program === void 0) {
      program = await ctx.subprocess.resolveExecutable(config.gitCommand, void 0, scope.signal);
      resolvedProgram.set(config.gitCommand, program);
    }
    const command = [program, ...GIT_PREFIX, ...args];
    const argv = policy !== void 0 && policy.mode !== "danger-full-access" ? (await ctx.sandbox.confine(command, policy, scope.signal)).argv : command;
    scope.signal.throwIfAborted();
    const child = ctx.subprocess.spawn({
      argv,
      cwd,
      env: gitEnvironment(),
      signal: scope.signal,
      graceMs: 5e3,
      stdio: {
        stdin: "ignore",
        stdout: { maxBytes: config.maxGitOutputBytes },
        stderr: { maxBytes: 65536 }
      }
    });
    try {
      const outcome = await child.done;
      scope.signal.throwIfAborted();
      const stdout = child.collected.stdout.readFrom(0);
      const stderr = child.collected.stderr.readFrom(0);
      if (outcome.exitCode === null || !allowedExitCodes.includes(outcome.exitCode)) {
        throw new Error(`git ${args[0]} failed (${outcome.signal ?? outcome.exitCode}): ${firstLine(stderr.text)}`);
      }
      if (stdout.lossy) throw new Error(`git ${args[0]} output exceeds maxGitOutputBytes`);
      return { stdout: stdout.text, stderr: stderr.text, exitCode: outcome.exitCode };
    } finally {
      child.terminate();
      await child.waitForExit().catch(() => {
      });
    }
  } finally {
    scope.dispose();
  }
}
function firstLine(text) {
  return text.split(/\r?\n/u).map((line) => line.trim()).find((line) => line.length > 0) ?? "no diagnostic";
}
function sidesOf(x, y) {
  const letter = (c) => {
    if (c === void 0 || c === " " || c === ".") return void 0;
    if (c === "C") return "A";
    if (c === "T") return "M";
    if (c === "R" || c === "D" || c === "A" || c === "M" || c === "U") return c;
    return void 0;
  };
  return { staged: letter(x), unstaged: letter(y) };
}
function letterOf(staged, unstaged) {
  const both = [staged, unstaged];
  if (both.includes("R")) return "R";
  if (both.includes("D")) return "D";
  if (both.includes("U")) return "U";
  if (both.includes("A")) return "A";
  if (both.includes("M")) return "M";
  return void 0;
}
function parseStatus(stdout) {
  const records = stdout.split("\0");
  const result = { branch: null, detached: false, upstream: null, ahead: 0, behind: 0, files: [], ignored: [] };
  for (const record of records) {
    if (record === "") continue;
    if (record.startsWith("# ")) {
      const space = record.indexOf(" ", 2);
      const key = record.slice(2, space);
      const value = record.slice(space + 1);
      if (key === "branch.head") {
        if (value === "(detached)") result.detached = true;
        else result.branch = value;
      } else if (key === "branch.upstream") result.upstream = value;
      else if (key === "branch.ab") {
        const [ahead, behind] = value.split(" ");
        result.ahead = Number.parseInt(String(ahead).replace("+", ""), 10) || 0;
        result.behind = Number.parseInt(String(behind).replace("-", ""), 10) || 0;
      }
      continue;
    }
    const kind = record[0];
    if (kind === "1") {
      const fields = record.split(" ");
      const xy = fields[1] ?? "..";
      const path = fields.slice(8).join(" ");
      const sides = sidesOf(xy[0], xy[1]);
      const letter = letterOf(sides.staged, sides.unstaged);
      if (letter !== void 0 && path !== "") result.files.push({ path, status: letter, ...sides });
      continue;
    }
    if (kind === "2") {
      const fields = record.split(" ");
      const xy = fields[1] ?? "..";
      const [path] = fields.slice(9).join(" ").split("	");
      const sides = sidesOf(xy[0], xy[1]);
      const letter = letterOf(sides.staged, sides.unstaged) ?? "R";
      if (path !== void 0 && path !== "") result.files.push({ path, status: letter, ...sides });
      continue;
    }
    if (kind === "?") {
      result.files.push({ path: record.slice(2).replace(/\/$/u, ""), status: "?" });
      continue;
    }
    if (kind === "u") {
      const fields = record.split(" ");
      const path = fields.slice(10).join(" ");
      if (path !== "") result.files.push({ path, status: "U" });
      continue;
    }
    if (kind === "!") result.ignored.push(record.slice(2).replace(/\/$/u, ""));
  }
  return result;
}
function parseLog(stdout) {
  const commits = [];
  for (const line of stdout.split("\n")) {
    if (line.trim() === "") continue;
    const parts = line.split("");
    const hash = parts[0] ?? "";
    if (hash === "") continue;
    const time = Number.parseInt(parts[1] ?? "", 10);
    const subject = parts[2] ?? "";
    const refs = [];
    for (const raw of (parts[3] ?? "").split(",")) {
      const name2 = raw.trim().replace(/^HEAD -> /u, "").replace(/^tag: /u, "");
      if (name2 === "" || name2 === "HEAD" || refs.includes(name2)) continue;
      refs.push(name2);
      if (refs.length === 3) break;
    }
    commits.push({ hash, time: Number.isFinite(time) ? time : 0, subject, refs });
  }
  return commits;
}
async function readHistory(ctx, config, request) {
  const result = await runGit(ctx, config, {
    ...request,
    args: ["log", "-n", "24", "--pretty=format:%h%x1f%ct%x1f%s%x1f%D"],
    allowedExitCodes: [0, 128]
  }).catch(() => void 0);
  if (result === void 0 || result.exitCode !== 0) return [];
  return parseLog(result.stdout);
}
async function readStatus(ctx, config, request) {
  const probe = await runGit(ctx, config, { ...request, args: ["rev-parse", "--show-toplevel"], allowedExitCodes: [0, 128] });
  if (probe.exitCode !== 0) {
    if (NOT_A_CHECKOUT.test(probe.stderr)) return void 0;
    throw new Error(`git rev-parse failed: ${firstLine(probe.stderr)}`);
  }
  const root = probe.stdout.trim();
  const args = [
    "status",
    "--porcelain=v2",
    "--branch",
    // `--untracked-files=normal` reports a wholly untracked directory as one entry: on a workspace
    // with a large generated tree that difference is 49 KB versus 32 MB of output, and the tree
    // only ever draws the directories that were reported.
    "--untracked-files=normal",
    "-z"
  ];
  const detail = request.detail === "drawer" ? "drawer" : "status";
  const [status, stash, worktrees] = await Promise.all([
    runGit(ctx, config, { ...request, args }),
    runGit(ctx, config, {
      ...request,
      args: ["stash", "list", "--format=%gd"],
      allowedExitCodes: [0, 128]
    }).catch(() => void 0),
    detail === "drawer" ? listWorktrees(ctx, config, request) : Promise.resolve(void 0)
  ]);
  const parsed = parseStatus(status.stdout);
  const stashed = stash === void 0 || stash.exitCode !== 0 ? 0 : stash.stdout.split("\n").filter((line) => line.trim() !== "").length;
  const [branches, history, remote] = await Promise.all([
    detail === "drawer" ? listBranches(ctx, config, request, worktrees ?? []) : Promise.resolve([]),
    detail === "drawer" ? readHistory(ctx, config, request) : Promise.resolve([]),
    typeof parsed.upstream !== "string" || parsed.upstream === "" ? Promise.resolve(void 0) : remoteDivergence(ctx, config, request)
  ]);
  const conflicts = parsed.files.filter((file) => file.status === "U").map((file) => file.path);
  return {
    root,
    ...parsed,
    stashed,
    worktrees: worktrees ?? [],
    branches,
    history,
    conflicts,
    ...remote === void 0 ? {} : { remote }
  };
}
async function readScopedStatus(ctx, config, request) {
  const probe = await runGit(ctx, config, { ...request, args: ["rev-parse", "--show-toplevel"], allowedExitCodes: [0, 128] });
  if (probe.exitCode !== 0) {
    if (NOT_A_CHECKOUT.test(probe.stderr)) return void 0;
    throw new Error(`git rev-parse failed: ${firstLine(probe.stderr)}`);
  }
  const root = probe.stdout.trim();
  const status = await runGit(ctx, config, {
    ...request,
    args: [
      "status",
      "--porcelain=v2",
      "--branch",
      "--untracked-files=all",
      "-z",
      "--",
      request.path
    ]
  });
  const parsed = parseStatus(status.stdout);
  return { root, files: parsed.files };
}
async function commitAll(ctx, config, request) {
  const { message } = request;
  await runGit(ctx, config, { ...request, args: ["add", "--all"] });
  const staged = await runGit(ctx, config, { ...request, args: ["diff", "--cached", "--name-only"] });
  if (String(staged.stdout).split("\n").some((line) => /(?:^|\/)\.git(?:\/|$)/u.test(line.trim()))) {
    throw new Error("refusing to commit: a .git path entered the index");
  }
  const committed = await runGit(ctx, config, { ...request, args: ["commit", "--message", message] });
  return firstLine(committed.stdout);
}
async function ignoredAmong(ctx, config, request) {
  const paths = (request.paths ?? []).filter((path) => typeof path === "string" && path !== "");
  if (paths.length === 0) return [];
  const scope = budget(request.signal, config.gitTimeoutMs);
  try {
    const program = await ctx.subprocess.resolveExecutable(config.gitCommand, void 0, scope.signal);
    const command = [program, ...GIT_PREFIX, "check-ignore", "--stdin"];
    const argv = request.policy !== void 0 && request.policy.mode !== "danger-full-access" ? (await ctx.sandbox.confine(command, request.policy, scope.signal)).argv : command;
    const child = ctx.subprocess.spawn({
      argv,
      cwd: request.cwd,
      env: gitEnvironment(),
      signal: scope.signal,
      graceMs: 5e3,
      stdio: {
        // Paths travel on stdin: never through a shell, never through argv length limits.
        stdin: { data: paths.join(LINEFEED) + LINEFEED },
        stdout: { maxBytes: config.maxGitOutputBytes },
        stderr: { maxBytes: 65536 }
      }
    });
    try {
      const outcome = await child.done;
      if (outcome.exitCode !== 0 && outcome.exitCode !== 1) return [];
      const stdout = child.collected.stdout.readFrom(0).text;
      return stdout.split(LINEFEED).map((item) => item.trim()).filter((item) => item !== "");
    } finally {
      child.terminate();
      await child.waitForExit().catch(() => {
      });
    }
  } catch {
    return [];
  } finally {
    scope.dispose();
  }
}
async function listWorktrees(ctx, config, request) {
  const result = await runGit(ctx, config, {
    ...request,
    args: ["worktree", "list", "--porcelain"],
    allowedExitCodes: [0, 128]
  }).catch(() => void 0);
  if (result === void 0 || result.exitCode !== 0) return [];
  const rows = [];
  let current = null;
  for (const line of result.stdout.split("\n")) {
    if (line.trim() === "") {
      if (current !== null) rows.push(current);
      current = null;
      continue;
    }
    const space = line.indexOf(" ");
    const key = space === -1 ? line : line.slice(0, space);
    const value = space === -1 ? "" : line.slice(space + 1);
    current ??= { path: "", head: "", branch: null, detached: false, bare: false };
    if (key === "worktree") current.path = value;
    else if (key === "HEAD") current.head = value;
    else if (key === "branch") current.branch = value.replace(/^refs\/heads\//u, "");
    else if (key === "detached") current.detached = true;
    else if (key === "bare") current.bare = true;
  }
  if (current !== null) rows.push(current);
  return rows.filter((row) => row.path !== "");
}
async function pullUpstream(ctx, config, request) {
  const result = await runGit(ctx, config, {
    ...request,
    args: ["pull", "--ff-only"],
    allowedExitCodes: [0, 1, 128]
  });
  if (result.exitCode !== 0) {
    const detail = firstLine(result.stderr) || firstLine(result.stdout);
    throw new Error(detail === "" ? "git pull failed" : detail);
  }
  return firstLine(result.stdout) || firstLine(result.stderr);
}
async function listBranches(ctx, config, request, knownWorktrees) {
  const [result, worktrees] = await Promise.all([
    runGit(ctx, config, {
      ...request,
      args: ["for-each-ref", "--format=%(refname:short)%09%(HEAD)%09%(upstream:short)%09%(objectname:short)", "refs/heads"],
      allowedExitCodes: [0, 128]
    }).catch(() => void 0),
    knownWorktrees === void 0 ? listWorktrees(ctx, config, request) : Promise.resolve(knownWorktrees)
  ]);
  if (result === void 0 || result.exitCode !== 0) return [];
  const held = new Set(worktrees.map((row) => row.branch).filter((name2) => typeof name2 === "string"));
  const rows = [];
  for (const line of result.stdout.split("\n")) {
    if (line.trim() === "") continue;
    const [name2, head, upstream, commit] = line.split("	");
    if (name2 === void 0 || name2 === "") continue;
    rows.push({
      name: name2,
      current: head === "*",
      upstream: upstream === void 0 || upstream === "" ? null : upstream,
      commit: commit ?? "",
      // The current branch is of course held by this worktree; that is not a conflict.
      inOtherWorktree: held.has(name2) && head !== "*"
    });
  }
  return rows;
}
async function checkoutBranch(ctx, config, request) {
  const { branch } = request;
  const name2 = typeof branch === "string" ? branch.trim() : "";
  if (name2 === "") throw new Error("a branch name is required");
  if (name2.startsWith("-")) throw new Error("a branch name must not begin with a dash");
  const result = await runGit(ctx, config, {
    ...request,
    args: ["checkout", name2],
    allowedExitCodes: [0, 1, 128]
  });
  if (result.exitCode !== 0) {
    const detail = firstLine(result.stderr) || firstLine(result.stdout);
    throw new Error(detail === "" ? "git checkout failed" : detail);
  }
  return { branch: name2 };
}

// src/host/listing.js
async function listDirectory(fs, request, limits, signal) {
  const { workspaceRoot, path } = request;
  const requested = absoluteOf(workspaceRoot, path);
  let target;
  try {
    target = await fs.resolve(requested, { signal });
  } catch (error) {
    const link = await fs.lstat(requested, {}, signal).catch(() => void 0);
    if (link?.type === "symlink") {
      return { ok: false, code: "broken-link", message: `"${path}" points at a missing target`, path, target: requested };
    }
    return { ok: false, code: "not-found", message: messageOf(error), path };
  }
  const resolved = fs.processPath(target);
  const outside = !isLexicallyInside(workspaceRoot, resolved);
  const info = await fs.stat(target, signal).catch(() => void 0);
  if (info === void 0) return { ok: false, code: "not-found", message: `"${path}" does not exist`, path };
  if (info.type !== "directory") {
    return { ok: false, code: "not-directory", message: `"${path}" is not a directory`, path };
  }
  let children;
  try {
    children = await fs.listDir(target, signal);
  } catch (error) {
    return { ok: false, code: "unreadable", message: messageOf(error), path };
  }
  const capped = children.slice(0, limits.maxEntries);
  const entries = [];
  for (const child of capped) {
    const childRequested = `${trimSlash(requested)}/${child.name}`;
    const childInfo = await fs.lstat(childRequested, {}, signal).catch(() => void 0);
    const symlink = childInfo?.type === "symlink";
    entries.push({
      name: child.name,
      type: child.type,
      ...typeof child.size === "number" ? { size: child.size } : {},
      ...symlink ? { symlink: true } : {},
      // `listDir` returns the child's own resolved target, so the badge follows where the link points
      // rather than what its name suggests.
      ...symlink && child.target !== void 0 && !isLexicallyInside(workspaceRoot, fs.processPath(child.target)) ? { outside: true } : {}
    });
  }
  return {
    ok: true,
    path,
    resolvedPath: resolved,
    outside,
    entries,
    truncated: children.length > limits.maxEntries
  };
}
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
function absoluteOf(root, path) {
  const normalizedRoot = trimSlash(root);
  const normalizedPath = path.replace(/\\/gu, "/");
  if (normalizedPath === "") return normalizedRoot;
  const composed = normalizedPath.startsWith("/") || /^[A-Za-z]:\//u.test(normalizedPath) ? trimSlash(normalizedPath) : `${normalizedRoot}/${normalizedPath}`.replace(/\/{2,}/gu, "/");
  return foldSegments(composed);
}
function trimSlash(path) {
  const trimmed = path.replace(/\\/gu, "/").replace(/\/+$/u, "");
  return trimmed === "" ? "/" : trimmed;
}
function foldSegments(path) {
  const absolute = path.startsWith("/");
  const out = [];
  for (const segment of path.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      out.pop();
      continue;
    }
    out.push(segment);
  }
  return `${absolute ? "/" : ""}${out.join("/")}`;
}
function isLexicallyInside(root, candidate) {
  const base = foldSegments(trimSlash(root));
  const target = foldSegments(trimSlash(candidate));
  if (base === target) return true;
  const separator = base === "/" ? "" : "/";
  return target.startsWith(`${base}${separator}`);
}

// src/host/mutate.js
var BAD_NAME = /[/\\\0]/u;
function validateName(name2) {
  if (typeof name2 !== "string") throw new Error("name must be a string");
  const trimmed = name2.trim();
  if (trimmed === "") throw new Error("name must not be empty");
  if (trimmed === "." || trimmed === "..") throw new Error("name must not be a relative path segment");
  if (BAD_NAME.test(trimmed)) throw new Error("name must not contain a path separator");
  return trimmed;
}
function sameEntryIgnoringCase(source, destination) {
  return source !== destination && source.toLowerCase() === destination.toLowerCase();
}
function foldRoot(root) {
  return root.replace(/\\/gu, "/").replace(/\/+$/u, "") || "/";
}
async function assertInside(fs, workspaceRoot, path, signal) {
  if (!isLexicallyInside(workspaceRoot, path)) throw new Error(`"${path}" is outside the workspace`);
  if (isLexicallyInside(`${workspaceRoot.replace(/\/+$/u, "")}/.git`, path) || /\/\.git(?:\/|$)/u.test(path)) {
    throw new Error("writes inside .git are refused");
  }
  const rootTarget = await fs.resolve(workspaceRoot, { signal }).catch((error) => {
    throw new Error(`cannot verify workspace root \u2014 write refused (${error.message})`);
  });
  const pathTarget = await fs.resolve(path, { signal }).catch((error) => {
    throw new Error(`cannot verify target path \u2014 write refused (${error.message})`);
  });
  const realRoot = fs.processPath(rootTarget).replace(/\/+$/u, "");
  const realPath = fs.processPath(pathTarget);
  if (/\/\.git(?:\/|$)/u.test(realPath)) throw new Error("writes inside .git are refused");
  if (!isLexicallyInside(realRoot, realPath)) throw new Error(`"${path}" is outside the workspace`);
}
async function createFile(fs, request, signal) {
  const { workspaceRoot, directory, name: name2, sandboxPolicy } = request;
  const finalName = validateName(name2);
  const parent = absoluteOf(workspaceRoot, directory);
  await assertInside(fs, workspaceRoot, parent, signal);
  const path = `${parent}/${finalName}`;
  await assertInside(fs, workspaceRoot, path, signal);
  const target = await fs.resolve(path, { signal });
  try {
    await fs.writeText(target, "", { kind: "createIfAbsent" }, signal, sandboxPolicy);
  } catch (error) {
    throw translate(error, path);
  }
  return { path };
}
async function rename(fs, ctx, config, request, signal) {
  const { workspaceRoot, path, name: name2, kind, sandboxPolicy, session, runExternal: runExternal2 } = request;
  const finalName = validateName(name2);
  const source = absoluteOf(workspaceRoot, path);
  await assertInside(fs, workspaceRoot, source, signal);
  const parent = source.slice(0, source.lastIndexOf("/")) || "/";
  const destination = `${parent}/${finalName}`;
  await assertInside(fs, workspaceRoot, destination, signal);
  if (source === destination) return { path: source };
  const existing = await fs.lstat(destination, {}, signal).catch(() => void 0);
  if (existing !== void 0 && !sameEntryIgnoringCase(source, destination)) {
    throw new Error(`"${finalName}" already exists in this folder`);
  }
  if (sameEntryIgnoringCase(source, destination)) {
    const staging = `${parent}/.nxe-case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await runExternal2({
      session,
      sandboxPolicy,
      cwd: parent,
      argv: ["mv", "--", source, staging],
      args: ["mv"]
    });
    await runExternal2({
      session,
      sandboxPolicy,
      cwd: parent,
      argv: ["mv", "--", staging, destination],
      args: ["mv"]
    });
    return { path: destination };
  }
  if (kind === "file" && await isTextFile(fs, source, signal)) {
    const from = await fs.resolve(source, { signal });
    const to = await fs.resolve(destination, { signal });
    try {
      await fs.moveFile(from, to, {}, signal, sandboxPolicy);
    } catch (error) {
      throw translate(error, source);
    }
    return { path: destination };
  }
  await runExternal2({
    session,
    sandboxPolicy,
    cwd: parent,
    argv: ["mv", "--", source, destination],
    args: ["mv"]
  });
  return { path: destination };
}
async function createFolder(fs, request, runExternal2) {
  const { workspaceRoot, directory, name: name2, sandboxPolicy, session } = request;
  const finalName = validateName(name2);
  const parent = absoluteOf(workspaceRoot, directory);
  await assertInside(
    fs,
    workspaceRoot,
    parent,
    /* signal */
    void 0
  );
  const path = `${parent}/${finalName}`;
  await assertInside(
    fs,
    workspaceRoot,
    path,
    /* signal */
    void 0
  );
  const existing = await fs.lstat(path).catch(() => void 0);
  if (existing !== void 0) throw new Error(`"${finalName}" already exists in this folder`);
  await runExternal2({ session, sandboxPolicy, cwd: parent, argv: ["mkdir", "--", path], args: ["mkdir"] });
  return { path };
}
async function isTextFile(fs, path, signal) {
  try {
    const target = await fs.resolve(path, { signal });
    const head = await fs.readByteRange(target, { offset: 0, length: 8192 }, signal);
    if (head.includes(0)) return false;
    new TextDecoder("utf-8", { fatal: true }).decode(head);
    return true;
  } catch {
    return false;
  }
}
function translate(error, path) {
  const code = error?.code ?? error?.name;
  if (code === "FS_NOT_OBSERVED") return new Error(`"${path}" already exists`);
  if (typeof code === "string" && code.startsWith("FS_")) return new Error(`${path}: ${error.message}`);
  return error;
}
async function removeEntry(fs, request, signal) {
  const { workspaceRoot, path, kind, sandboxPolicy, session, runExternal: runExternal2 } = request;
  if (typeof path !== "string" || path.trim() === "") throw new Error("a path is required");
  const target = absoluteOf(workspaceRoot, path);
  await assertInside(fs, workspaceRoot, target, signal);
  const normalizedRoot = workspaceRoot.replace(/\/+$/u, "");
  const normalizedTarget = target.replace(/\/+$/u, "");
  if (normalizedTarget === normalizedRoot) throw new Error("the workspace root cannot be deleted");
  const existing = await fs.lstat(target, {}, signal).catch(() => void 0);
  if (existing === void 0) throw new Error(`"${path}" does not exist`);
  const directory = kind === "directory" || existing.isDirectory === true;
  const parent = normalizedTarget.slice(0, normalizedTarget.lastIndexOf("/")) || "/";
  await runExternal2({
    session,
    sandboxPolicy,
    cwd: parent,
    argv: directory ? ["rm", "-rf", "--", normalizedTarget] : ["rm", "-f", "--", normalizedTarget],
    args: ["rm"]
  });
  return { path: normalizedTarget, directory };
}
async function moveEntry(fs, ctx, config, request, signal) {
  const { workspaceRoot, path, directory, sandboxPolicy, session, runExternal: runExternal2 } = request;
  if (typeof path !== "string" || path.trim() === "") throw new Error("a path is required");
  const source = absoluteOf(workspaceRoot, path).replace(/\/+$/u, "");
  await assertInside(fs, workspaceRoot, source, signal);
  if (source === workspaceRoot.replace(/\/+$/u, "")) throw new Error("the workspace root cannot be moved");
  const info = await fs.lstat(source, {}, signal).catch(() => void 0);
  if (info === void 0) throw new Error(`"${path}" does not exist`);
  const name2 = source.slice(source.lastIndexOf("/") + 1);
  const sourceParent = source.slice(0, source.lastIndexOf("/")) || "/";
  const destinationDir = absoluteOf(workspaceRoot, typeof directory === "string" ? directory : "");
  await assertInside(fs, workspaceRoot, destinationDir, signal);
  const resolvedDirTarget = await fs.resolve(destinationDir, { signal });
  const resolvedDir = fs.processPath(resolvedDirTarget).replace(/\/+$/u, "");
  const realRootTarget = await fs.resolve(workspaceRoot, { signal }).catch(() => void 0);
  const realRoot = realRootTarget === void 0 ? foldRoot(workspaceRoot) : fs.processPath(realRootTarget).replace(/\/+$/u, "");
  if (/\/\.git(?:\/|$)/u.test(resolvedDir)) throw new Error("writes inside .git are refused");
  if (!isLexicallyInside(realRoot, resolvedDir)) throw new Error(`"${directory}" resolves outside the workspace`);
  const dirInfo = await fs.stat(resolvedDirTarget, {}, signal).catch(() => void 0);
  if (dirInfo === void 0 || dirInfo === null || dirInfo.type !== "directory") throw new Error(`"${directory}" is not a folder`);
  if (resolvedDir === sourceParent) return { path: source };
  if (isLexicallyInside(source, resolvedDir)) throw new Error("a folder cannot be moved into itself");
  const destination = `${resolvedDir}/${name2}`;
  if (/\/\.git(?:\/|$)/u.test(destination)) throw new Error("writes inside .git are refused");
  if (!isLexicallyInside(realRoot, destination)) throw new Error(`"${name2}" would move outside the workspace`);
  const existing = await fs.lstat(destination, {}, signal).catch(() => void 0);
  if (existing !== void 0) throw new Error(`"${name2}" already exists in that folder`);
  await runExternal2({
    session,
    sandboxPolicy,
    cwd: resolvedDir,
    argv: ["mv", "--", source, destination],
    args: ["mv"]
  });
  return { path: destination };
}

// src/host/stats.js
async function statisticsOf(fs, root, options, signal) {
  const { maxDepth, maxEntries, excludeGit } = options;
  const totals = { files: 0, directories: 0, bytes: 0, truncated: false };
  let seen = 0;
  const walk = async (path, depth, needsResolve) => {
    if (totals.truncated) return;
    signal?.throwIfAborted();
    if (depth > maxDepth) {
      totals.truncated = true;
      return;
    }
    let children;
    try {
      children = await fs.listDir(needsResolve ? await fs.resolve(path, { signal }) : path, signal);
    } catch {
      return;
    }
    for (const child of children) {
      if (totals.truncated) return;
      seen += 1;
      if (seen > maxEntries) {
        totals.truncated = true;
        return;
      }
      if (seen % 200 === 0) await new Promise((resolve) => setImmediate(resolve));
      if (excludeGit && child.name === ".git") continue;
      if (child.type === "directory") {
        totals.directories += 1;
        const viaLink = child.target !== void 0;
        await walk(viaLink ? fs.processPath(child.target) : joinPath(path, child.name), depth + 1, viaLink);
      } else if (child.type === "file") {
        totals.files += 1;
        if (typeof child.size === "number") totals.bytes += child.size;
      }
    }
  };
  await walk(root, 1, true);
  return totals;
}
function joinPath(parent, name2) {
  const trimmed = parent.replace(/[/\\]+$/u, "");
  return `${trimmed}/${name2}`;
}

// src/host/routes.js
var PREFIX = "/nano-explorer-extra";
var MAX_BODY_BYTES = 64 * 1024;
async function jsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error("request body is too large");
    chunks.push(chunk);
  }
  if (total === 0) return {};
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("request body must be a JSON object");
  return parsed;
}
function sendJson2(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}
function messageOf2(error) {
  return error instanceof Error ? error.message : String(error);
}
async function scopeOf(ctx, sessionId) {
  if (typeof sessionId !== "string" || sessionId === "") throw new Error("sessionId is required");
  const live = ctx.get("sessions")?.get(sessionId);
  const header = live?.header ?? (await ctx.get("sessionPersistence")?.stat(sessionId))?.header;
  if (header === void 0 || header === null) throw new Error(`unknown session "${sessionId}"`);
  const root = header.cwd ?? ctx.get("sandboxPolicy")?.workspaceRoot;
  const livePolicy = live === void 0 ? void 0 : ctx.get("sandboxPolicy")?.resolve({ session: live });
  const policy = livePolicy ?? (root === void 0 ? void 0 : { ...ctx.get("sandboxPolicy")?.resolve({}), workspaceRoot: root });
  if (typeof root !== "string" || root === "") throw new Error("this session has no working directory");
  const ownRoot = ctx.get("sandboxPolicy")?.workspaceRoot;
  if (typeof ownRoot === "string" && ownRoot !== "" && root !== ownRoot) {
    console.warn(`[nxe] scopeOf cross-session: session "${sessionId}" adopted workspace "${root}" (own "${ownRoot}")`);
  } else if (ownRoot === void 0) {
    console.info(`[nxe] scopeOf: session "${sessionId}" adopted workspace "${root}" (no host own-root baseline)`);
  }
  return { session: live, root, policy };
}
async function runExternal(ctx, config, request) {
  const { argv, cwd, session, sandboxPolicy: policy } = request;
  if (typeof cwd !== "string" || cwd === "" || !cwd.startsWith("/")) throw new Error(`${argv[0]} needs an absolute working directory, got ${JSON.stringify(cwd)}`);
  const subprocess = ctx.get("subprocess");
  const sandbox = ctx.get("sandbox");
  if (subprocess === void 0 || subprocess === null) throw new Error("this deployment has no subprocess service");
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(new Error("command timed out")), config.gitTimeoutMs);
  timer.unref?.();
  try {
    const program = await subprocess.resolveExecutable(argv[0], void 0, stop.signal);
    const command = [program, ...argv.slice(1)];
    const confined = sandbox !== void 0 && sandbox !== null && policy !== void 0 && policy.mode !== "danger-full-access" ? (await sandbox.confine(command, policy, stop.signal)).argv : command;
    const child = subprocess.spawn({
      argv: confined,
      cwd,
      signal: stop.signal,
      graceMs: 5e3,
      stdio: { stdin: "ignore", stdout: { maxBytes: 65536 }, stderr: { maxBytes: 65536 } }
    });
    try {
      const outcome = await child.done;
      const stderr = child.collected.stderr.readFrom(0).text;
      if (outcome.exitCode !== 0) {
        const line = stderr.split(/\r?\n/u).map((item) => item.trim()).find((item) => item.length > 0);
        throw new Error(line ?? `${argv[0]} failed (${outcome.signal ?? outcome.exitCode})`);
      }
    } finally {
      child.terminate();
      await child.waitForExit().catch(() => {
      });
    }
  } finally {
    clearTimeout(timer);
  }
}
var memo = /* @__PURE__ */ new Map();
var MEMO_MS = 3e3;
var STATS_MEMO_MS = 45 * 1e3;
function memoized(key, read, ttl = MEMO_MS) {
  const hit = memo.get(key);
  const now = Date.now();
  if (hit !== void 0 && now - hit.at < ttl) return hit.value;
  const value = Promise.resolve().then(read);
  memo.set(key, { at: now, value });
  value.catch(() => {
    memo.delete(key);
  });
  if (memo.size > 64) {
    for (const [entryKey, entry] of memo) if (now - entry.at >= MEMO_MS) memo.delete(entryKey);
  }
  return value;
}
function forgetReads(root) {
  for (const key of memo.keys()) {
    if (key.startsWith(`status:${root}:`) || key.startsWith(`ignored:${root}:`) || key === `stats:${root}`) memo.delete(key);
  }
}
var watchers = /* @__PURE__ */ new Map();
var watchTimers = /* @__PURE__ */ new Map();
function watchRoot(root) {
  if (watchers.has(root)) return;
  const entries = [];
  const invalidate = () => {
    clearTimeout(watchTimers.get(root));
    watchTimers.set(root, setTimeout(() => {
      watchTimers.delete(root);
      forgetReads(root);
    }, 1e3));
  };
  try {
    entries.push(watch(root, { recursive: true }, invalidate));
  } catch {
    try {
      entries.push(watch(`${root}/.git`, invalidate));
    } catch {
    }
  }
  watchers.set(root, entries);
}
function disposeRootWatchers() {
  for (const entries of watchers.values()) for (const entry of entries) try {
    entry.close();
  } catch {
  }
  watchers.clear();
  for (const timer of watchTimers.values()) clearTimeout(timer);
  watchTimers.clear();
}
function createRoutes(ctx, config) {
  const fs = () => ctx.fs;
  const external = (request) => runExternal(ctx, config, request);
  const review = ensurePerfReviewHost().hostJoin("nano-explorer-extra", {
    version: true ? "0.2.0" : void 0,
    // This host bundle's own copy of the library version (A3 / §10.4.4).
    libVersion: LIB_VERSION
  });
  return {
    "/status": {
      method: "GET",
      async run(req) {
        const url = new URL(String(req.url), "http://localhost");
        const { root, policy } = await scopeOf(ctx, url.searchParams.get("sessionId") ?? "");
        watchRoot(root);
        if (url.searchParams.get("only") === "stats") {
          const stats = await review.hostSpan("stats", () => memoized(`stats:${root}`, () => statisticsOf(fs(), root, {
            maxDepth: config.statsMaxDepth,
            maxEntries: config.statsMaxEntries,
            excludeGit: config.statsExcludeGit
          }), STATS_MEMO_MS));
          return { root, stats };
        }
        let git = null;
        let gitError;
        try {
          const scopedPath = url.searchParams.get("path") ?? void 0;
          const detail = url.searchParams.get("detail") === "drawer" ? "drawer" : void 0;
          git = await review.hostSpan("git-status", () => memoized(`status:${root}:${scopedPath ?? ""}:${detail ?? ""}`, () => scopedPath === void 0 ? readStatus(ctx, config, { cwd: root, policy, signal: void 0, detail }) : readScopedStatus(ctx, config, { cwd: root, policy, signal: void 0, path: scopedPath }))) ?? null;
        } catch (error) {
          gitError = messageOf2(error);
        }
        return { root, git, ...gitError === void 0 ? {} : { gitError } };
      }
    },
    "/commit": {
      method: "POST",
      async run(req) {
        const body = await jsonBody(req);
        const { session, root, policy } = await scopeOf(ctx, body.sessionId);
        const message = typeof body.message === "string" ? body.message.trim() : "";
        if (message === "") throw new Error("a commit message is required");
        const subject = await commitAll(ctx, config, { cwd: root, policy, message, signal: void 0 });
        forgetReads(root);
        return { subject };
      }
    },
    "/pull": {
      method: "POST",
      async run(req) {
        const body = await jsonBody(req);
        const { root, policy, session } = await scopeOf(ctx, body.sessionId);
        const summary = await pullUpstream(ctx, config, {
          cwd: root,
          policy,
          session,
          signal: void 0
        });
        forgetReads(root);
        return { summary };
      }
    },
    "/checkout": {
      method: "POST",
      async run(req) {
        const body = await jsonBody(req);
        const { root, policy, session } = await scopeOf(ctx, body.sessionId);
        const switched = await checkoutBranch(ctx, config, {
          cwd: root,
          policy,
          session,
          branch: body.branch,
          signal: void 0
        });
        forgetReads(root);
        return switched;
      }
    },
    "/create-file": {
      method: "POST",
      async run(req) {
        const body = await jsonBody(req);
        const { root, policy } = await scopeOf(ctx, body.sessionId);
        return createFile(fs(), {
          workspaceRoot: root,
          directory: typeof body.directory === "string" ? body.directory : "",
          name: body.name,
          sandboxPolicy: policy
        });
      }
    },
    "/create-folder": {
      method: "POST",
      async run(req) {
        const body = await jsonBody(req);
        const { session, root, policy } = await scopeOf(ctx, body.sessionId);
        return createFolder(fs(), {
          workspaceRoot: root,
          directory: typeof body.directory === "string" ? body.directory : "",
          name: body.name,
          sandboxPolicy: policy,
          session
        }, external);
      }
    },
    "/rename": {
      method: "POST",
      async run(req) {
        const body = await jsonBody(req);
        const { session, root, policy } = await scopeOf(ctx, body.sessionId);
        return rename(fs(), ctx, config, {
          workspaceRoot: root,
          path: body.path,
          name: body.name,
          kind: body.kind === "directory" ? "directory" : "file",
          sandboxPolicy: policy,
          session,
          runExternal: external
        });
      }
    },
    "/move": {
      method: "POST",
      async run(req) {
        const body = await jsonBody(req);
        const { session, root, policy } = await scopeOf(ctx, body.sessionId);
        const moved = await moveEntry(fs(), ctx, config, {
          workspaceRoot: root,
          path: body.path,
          directory: body.directory,
          sandboxPolicy: policy,
          session,
          runExternal: external
        });
        forgetReads(root);
        return moved;
      }
    },
    "/delete": {
      method: "POST",
      async run(req) {
        const body = await jsonBody(req);
        const { session, root, policy } = await scopeOf(ctx, body.sessionId);
        return removeEntry(fs(), {
          workspaceRoot: root,
          path: body.path,
          kind: body.kind === "directory" ? "directory" : "file",
          sandboxPolicy: policy,
          session,
          runExternal: external
        }, void 0);
      }
    },
    "/ignored": {
      method: "POST",
      async run(req) {
        const body = await jsonBody(req);
        const { root, policy } = await scopeOf(ctx, body.sessionId);
        const paths = Array.isArray(body.paths) ? body.paths.filter((item) => typeof item === "string") : [];
        const ignored = await memoized(`ignored:${root}:${paths.join("|")}`, () => ignoredAmong(ctx, config, { cwd: root, policy, paths, signal: void 0 }));
        return { ignored };
      }
    },
    "/list": {
      method: "POST",
      async run(req) {
        const body = await jsonBody(req);
        const { root } = await scopeOf(ctx, body.sessionId);
        return review.hostSpan("list", () => listDirectory(fs(), {
          workspaceRoot: root,
          path: typeof body.path === "string" ? body.path : "",
          allowOutsideWorkspace: body.allowOutsideWorkspace === true
        }, { maxEntries: config.listingMaxEntries }));
      }
    },
    /* A1: the browser cannot read host.json from disk. This route is the
       bridge. `mode=window` drains the per-scenario window (lab calls it at
       scenario start and end); the default returns a non-destructive
       cumulative snapshot for the page's low-frequency poll. */
    "/perf-review/host": {
      method: "GET",
      async run(req) {
        const url = new URL(String(req.url), "http://localhost");
        return url.searchParams.get("mode") === "window" ? review.takeWindow() : review.snapshot();
      }
    },
    /* Read one file as UTF-8, capped — enough to seed a notepad note.
       Same lexical + resolved boundary checks the lister uses, so a symlink
       out of the workspace cannot be smuggled through an allow flag. */
    "/read": {
      method: "POST",
      async run(req) {
        const body = await jsonBody(req);
        const { root } = await scopeOf(ctx, body.sessionId);
        const path = typeof body.path === "string" ? body.path : "";
        const requested = absoluteOf(root, path);
        if (!isLexicallyInside(root, requested) && body.allowOutsideWorkspace !== true) {
          throw new Error(`"${path}" is outside the workspace`);
        }
        const target = await fs().resolve(requested);
        const resolved = fs().processPath(target);
        if (!isLexicallyInside(root, resolved) && body.allowOutsideWorkspace !== true) {
          throw new Error(`"${path}" resolves outside the workspace`);
        }
        const info = await fs().stat(target);
        if (info === void 0 || info === null) throw new Error(`"${path}" does not exist`);
        if (info.type !== "file") throw new Error(`"${path}" is not a file`);
        const limit = 1 * 1024 * 1024;
        if (info.size > limit) throw new Error(`"${path}" is larger than ${limit} bytes`);
        const bytes = await fs().readByteRange(target, { offset: 0, length: limit });
        try {
          new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        } catch {
          throw new Error(`"${path}" is not UTF-8 text`);
        }
        return { ok: true, content: new TextDecoder("utf-8").decode(bytes) };
      }
    }
  };
}
function registerRoutes2(ctx, routes) {
  const specs = Object.entries(routes).map(([suffix, route]) => ({
    path: `${PREFIX}${suffix}`,
    methods: [route.method],
    handler: async (req, res) => {
      try {
        sendJson2(res, 200, await route.run(req));
      } catch (error) {
        sendJson2(res, 400, { error: messageOf2(error) });
      }
    }
  }));
  return registerRoutes(ctx, specs, { table: ROUTE_TABLE, plugin: PLUGIN });
}

// src/host/entry.js
var name = "nano-explorer-extra";
var inject = ["fs", "sessions", "webServer", "subprocess", "sandbox", "sandboxPolicy", "connection", "sessionPersistence"];
var Config = {
  "~standard": {
    version: 1,
    vendor: "dsh-nano-explorer-extra",
    validate(value) {
      const source = value && typeof value === "object" ? value : {};
      const issues = [];
      const number = (key, fallback, min, max) => {
        const candidate = source[key];
        if (candidate === void 0) return fallback;
        if (typeof candidate !== "number" || !Number.isInteger(candidate) || candidate < min || candidate > max) {
          issues.push({ message: `${key} must be an integer from ${min} to ${max}` });
          return fallback;
        }
        return candidate;
      };
      const flag = (key, fallback) => {
        const candidate = source[key];
        if (candidate === void 0) return fallback;
        if (typeof candidate !== "boolean") {
          issues.push({ message: `${key} must be a boolean` });
          return fallback;
        }
        return candidate;
      };
      const gitCommand = source.gitCommand ?? "git";
      if (typeof gitCommand !== "string" || gitCommand.trim() === "") {
        issues.push({ message: "gitCommand must be a non-empty string" });
      }
      const fields = {
        gitTimeoutMs: number("gitTimeoutMs", 3e4, 1e3, 12e4),
        maxGitOutputBytes: number("maxGitOutputBytes", 8 * 1024 * 1024, 64 * 1024, 64 * 1024 * 1024),
        statsMaxDepth: number("statsMaxDepth", 32, 1, 128),
        statsMaxEntries: number("statsMaxEntries", 5e4, 1e3, 1e6),
        statsDebounceMs: number("statsDebounceMs", 2e3, 0, 3e4),
        statsExcludeGit: flag("statsExcludeGit", true),
        symlinkMaxHops: number("symlinkMaxHops", 16, 1, 64),
        listingMaxEntries: number("listingMaxEntries", 2e3, 50, 2e4)
      };
      if (issues.length > 0) return { issues };
      return { value: { gitCommand, ...fields } };
    }
  }
};
function apply(ctx, raw) {
  const resolved = Config["~standard"].validate(raw ?? {});
  if (resolved.issues !== void 0) {
    throw new Error(`nano-explorer-extra: invalid configuration: ${resolved.issues.map((item) => item.message).join("; ")}`);
  }
  const config = resolved.value;
  const routes = createRoutes(ctx, config);
  ctx.effect(() => {
    const disposers = registerRoutes2(ctx, routes);
    return () => {
      for (const dispose of disposers) dispose();
      disposeRootWatchers();
    };
  }, "nano-explorer-extra: routes");
}
export {
  Config,
  apply,
  inject,
  name
};
