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
async function runGit(ctx, config, request) {
  const { cwd, policy, args, signal, allowedExitCodes = [0] } = request;
  const scope = budget(signal, config.gitTimeoutMs);
  try {
    const program = await ctx.subprocess.resolveExecutable(config.gitCommand, void 0, scope.signal);
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
function letterOf(x, y) {
  if (x === "R" || y === "R") return "R";
  if (x === "D" || y === "D") return "D";
  if (x === "A" || y === "A") return "A";
  if (x === "M" || y === "M" || x === "T" || y === "T") return "M";
  if (x === "C" || y === "C") return "A";
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
      const letter = letterOf(xy[0], xy[1]);
      if (letter !== void 0 && path !== "") result.files.push({ path, status: letter });
      continue;
    }
    if (kind === "2") {
      const fields = record.split(" ");
      const xy = fields[1] ?? "..";
      const [path] = fields.slice(9).join(" ").split("	");
      const letter = letterOf(xy[0], xy[1]) ?? "R";
      if (path !== void 0 && path !== "") result.files.push({ path, status: letter });
      continue;
    }
    if (kind === "?") {
      result.files.push({ path: record.slice(2), status: "?" });
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
async function readStatus(ctx, config, request) {
  const probe = await runGit(ctx, config, { ...request, args: ["rev-parse", "--show-toplevel"], allowedExitCodes: [0, 128] });
  if (probe.exitCode !== 0) {
    if (NOT_A_CHECKOUT.test(probe.stderr)) return void 0;
    throw new Error(`git rev-parse failed: ${firstLine(probe.stderr)}`);
  }
  const root = probe.stdout.trim();
  const status = await runGit(ctx, config, {
    ...request,
    args: ["status", "--porcelain=v2", "--branch", "--untracked-files=normal", "-z"]
  });
  return { root, ...parseStatus(status.stdout) };
}
async function commitAll(ctx, config, request) {
  const { message } = request;
  await runGit(ctx, config, { ...request, args: ["add", "--all"] });
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

// src/host/listing.js
async function listDirectory(fs, request, limits, signal) {
  const { workspaceRoot, path, followSymlinks, allowOutsideWorkspace } = request;
  const requested = absoluteOf(workspaceRoot, path);
  const lexicalInside = isLexicallyInside(workspaceRoot, requested);
  if (!lexicalInside && !allowOutsideWorkspace) {
    return {
      ok: false,
      code: "outside-workspace",
      message: `"${path}" is outside the workspace`,
      path
    };
  }
  if (!followSymlinks) {
    const link = await fs.lstat(requested, {}, signal).catch(() => void 0);
    if (link?.type === "symlink") {
      return { ok: false, code: "symlink-disabled", message: `"${path}" is a symbolic link and following is off`, path };
    }
  }
  let target;
  try {
    target = await fs.resolve(requested, { signal });
  } catch (error) {
    return { ok: false, code: "not-found", message: messageOf(error), path };
  }
  const resolved = fs.processPath(target);
  const resolvedOutside = !isLexicallyInside(workspaceRoot, resolved);
  if (resolvedOutside && !allowOutsideWorkspace) {
    return {
      ok: false,
      code: "outside-workspace",
      message: `"${path}" resolves outside the workspace`,
      path,
      outside: true
    };
  }
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
    outside: resolvedOutside,
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
  if (normalizedPath.startsWith("/") || /^[A-Za-z]:\//u.test(normalizedPath)) return trimSlash(normalizedPath);
  return `${normalizedRoot}/${normalizedPath}`.replace(/\/{2,}/gu, "/");
}
function trimSlash(path) {
  const trimmed = path.replace(/\\/gu, "/").replace(/\/+$/u, "");
  return trimmed === "" ? "/" : trimmed;
}
function isLexicallyInside(root, candidate) {
  const base = trimSlash(root);
  const target = trimSlash(candidate);
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
function assertInside(fs, workspaceRoot, path) {
  if (!isLexicallyInside(workspaceRoot, path)) throw new Error(`"${path}" is outside the workspace`);
}
async function createFile(fs, request, signal) {
  const { workspaceRoot, directory, name: name2, sandboxPolicy } = request;
  const finalName = validateName(name2);
  const parent = absoluteOf(workspaceRoot, directory);
  assertInside(fs, workspaceRoot, parent);
  const path = `${parent}/${finalName}`;
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
  assertInside(fs, workspaceRoot, source);
  const parent = source.slice(0, source.lastIndexOf("/")) || "/";
  const destination = `${parent}/${finalName}`;
  if (source === destination) return { path: source };
  const existing = await fs.lstat(destination, {}, signal).catch(() => void 0);
  if (existing !== void 0) throw new Error(`"${finalName}" already exists in this folder`);
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
  assertInside(fs, workspaceRoot, parent);
  const path = `${parent}/${finalName}`;
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

// src/host/stats.js
async function statisticsOf(fs, root, options, signal) {
  const { maxDepth, maxEntries, excludeGit } = options;
  const totals = { files: 0, directories: 0, bytes: 0, truncated: false };
  let seen = 0;
  const walk = async (path, depth) => {
    if (totals.truncated) return;
    signal?.throwIfAborted();
    if (depth > maxDepth) {
      totals.truncated = true;
      return;
    }
    let children;
    try {
      children = await fs.listDir(await fs.resolve(path, { signal }), signal);
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
      if (excludeGit && child.name === ".git") continue;
      if (child.type === "directory") {
        totals.directories += 1;
        await walk(child.target === void 0 ? joinPath(path, child.name) : fs.processPath(child.target), depth + 1);
      } else if (child.type === "file") {
        totals.files += 1;
        if (typeof child.size === "number") totals.bytes += child.size;
      }
    }
  };
  await walk(root, 1);
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
function sendJson(res, status, payload) {
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
function createRoutes(ctx, config) {
  const fs = () => ctx.fs;
  const external = (request) => runExternal(ctx, config, request);
  return {
    "/status": {
      method: "GET",
      async run(req) {
        const url = new URL(String(req.url), "http://localhost");
        const { root, policy } = await scopeOf(ctx, url.searchParams.get("sessionId") ?? "");
        if (url.searchParams.get("only") === "stats") {
          const stats = await statisticsOf(fs(), root, {
            maxDepth: config.statsMaxDepth,
            maxEntries: config.statsMaxEntries,
            excludeGit: config.statsExcludeGit
          });
          return { root, stats };
        }
        let git = null;
        let gitError;
        try {
          git = await readStatus(ctx, config, { cwd: root, policy, signal: void 0 }) ?? null;
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
        return { subject };
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
    "/ignored": {
      method: "POST",
      async run(req) {
        const body = await jsonBody(req);
        const { root, policy } = await scopeOf(ctx, body.sessionId);
        const paths = Array.isArray(body.paths) ? body.paths.filter((item) => typeof item === "string") : [];
        const ignored = await ignoredAmong(ctx, config, { cwd: root, policy, paths, signal: void 0 });
        return { ignored };
      }
    },
    "/list": {
      method: "POST",
      async run(req) {
        const body = await jsonBody(req);
        const { root } = await scopeOf(ctx, body.sessionId);
        return listDirectory(fs(), {
          workspaceRoot: root,
          path: typeof body.path === "string" ? body.path : "",
          followSymlinks: body.followSymlinks !== false,
          allowOutsideWorkspace: body.allowOutsideWorkspace === true
        }, { maxEntries: config.listingMaxEntries });
      }
    }
  };
}
function registerRoutes(ctx, routes) {
  const connection = () => ctx.get("connection");
  const disposers = [];
  for (const [suffix, route] of Object.entries(routes)) {
    disposers.push(ctx.webServer.register({
      kind: "exact",
      path: `${PREFIX}${suffix}`,
      handler: async (req, res) => {
        const rejection = connection()?.requestRejection(req);
        if (rejection !== void 0) {
          res.statusCode = rejection;
          res.end();
          return;
        }
        if (req.method !== route.method) {
          res.setHeader("allow", route.method);
          sendJson(res, 405, { error: `method ${req.method} is not allowed` });
          return;
        }
        try {
          sendJson(res, 200, await route.run(req));
        } catch (error) {
          sendJson(res, 400, { error: messageOf2(error) });
        }
      }
    }));
  }
  return disposers;
}

// src/host/entry.js
var name = "nano-explorer-extra";
var inject = ["fs", "sessions", "webServer", "subprocess", "sandbox", "sandboxPolicy", "connection"];
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
        gitTimeoutMs: number("gitTimeoutMs", 1e4, 1e3, 6e4),
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
    const disposers = registerRoutes(ctx, routes);
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, "nano-explorer-extra: routes");
}
export {
  Config,
  apply,
  inject,
  name
};
