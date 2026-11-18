#!/usr/bin/env node
// dncs remote resource bridge — no secrets, no Chat


// src/remote/entry.mjs
import { realpathSync as realpathSync4, statSync as statSync2 } from "node:fs";
import { fileURLToPath } from "node:url";

// src/remote/filesystem.js
import { mkdirSync, readdirSync, openSync, readSync, closeSync, renameSync, rmdirSync, realpathSync as realpathSync2, statSync, unlinkSync, writeFileSync, existsSync as existsSync2 } from "node:fs";
import { dirname as dirname2, join as join2 } from "node:path";
import { randomBytes } from "node:crypto";

// src/remote/path-policy.js
import { realpathSync, lstatSync, existsSync } from "node:fs";
import { dirname, join, posix } from "node:path";
function assertInside(rootReal, candidateReal) {
  const root = rootReal.endsWith("/") ? rootReal.slice(0, -1) : rootReal;
  const path = candidateReal.endsWith("/") && candidateReal !== "/" ? candidateReal.slice(0, -1) : candidateReal;
  if (path === root) return;
  if (!path.startsWith(`${root}/`)) {
    const error = new Error("path escapes workspace root");
    error.reason = "workspace-denied";
    throw error;
  }
}
function resolveUnderRoot(rootReal, rel) {
  const relative = String(rel ?? "");
  if (relative.includes("\0")) {
    const error = new Error("path must not contain NUL");
    error.reason = "invalid-request";
    throw error;
  }
  const joined = posix.isAbsolute(relative) ? join(rootReal, relative.replace(/^\//, "")) : join(rootReal, relative);
  if (existsSync(joined)) {
    const lst = lstatSync(joined);
    if (lst.isSymbolicLink()) {
      const target = realpathSync(joined);
      assertInside(rootReal, target);
      return { joined, exists: true, lstat: lst, real: target };
    }
    const real = realpathSync(joined);
    assertInside(rootReal, real);
    return { joined, exists: true, lstat: lst, real };
  }
  const parent = dirname(joined);
  if (!existsSync(parent)) {
    const error = new Error("parent path does not exist");
    error.reason = "workspace-not-found";
    throw error;
  }
  const parentReal = realpathSync(parent);
  assertInside(rootReal, parentReal);
  return { joined, parentReal, exists: false, lstat: null };
}

// src/remote/filesystem.js
function versionOf(stat) {
  return `${stat.ino}-${stat.mtimeMs}-${stat.size}`;
}
function kindOf(stat) {
  if (stat.isDirectory()) return "directory";
  if (stat.isSymbolicLink()) return "symlink";
  if (stat.isFile()) return "file";
  return "other";
}
function createFilesystem(rootInput, { maxPage = 64 * 1024 } = {}) {
  const rootReal = realpathSync2(rootInput);
  const inspect = () => {
    const st = statSync(rootReal);
    return {
      root: rootReal,
      kind: "directory",
      version: versionOf(st)
    };
  };
  return {
    inspect,
    list({ path, limit = 200, cursor }) {
      const resolved = resolveUnderRoot(rootReal, path);
      if (!resolved.exists) {
        const error = new Error("not found");
        error.reason = "workspace-not-found";
        throw error;
      }
      const st = statSync(resolved.real);
      if (!st.isDirectory()) {
        const error = new Error("not a directory");
        error.reason = "workspace-denied";
        throw error;
      }
      const names = readdirSync(resolved.real).sort();
      let start2 = 0;
      if (cursor) {
        const idx = names.indexOf(cursor);
        if (idx === -1) {
          const error = new Error("unknown list cursor");
          error.reason = "invalid-request";
          throw error;
        }
        start2 = idx + 1;
      }
      const slice = names.slice(start2, start2 + limit);
      const entries = slice.map((name) => {
        const child = join2(resolved.real, name);
        try {
          const info = statSync(child);
          return { name, kind: kindOf(info), size: info.isFile() ? info.size : void 0, version: versionOf(info) };
        } catch {
          return { name, kind: "other" };
        }
      });
      const truncated = start2 + slice.length < names.length;
      return {
        entries,
        truncated,
        nextCursor: truncated ? slice.at(-1) : void 0
      };
    },
    stat({ path }) {
      const resolved = resolveUnderRoot(rootReal, path);
      if (!resolved.exists) {
        const error = new Error("not found");
        error.reason = "workspace-not-found";
        throw error;
      }
      const info = resolved.lstat.isSymbolicLink() ? resolved.lstat : statSync(resolved.real);
      return {
        kind: kindOf(info),
        resolvedPath: resolved.real ?? resolved.joined,
        version: versionOf(info),
        size: info.isFile() ? info.size : void 0,
        linkTarget: resolved.lstat.isSymbolicLink() ? resolved.real : void 0
      };
    },
    read({ path, offset = 0, length = maxPage }) {
      const resolved = resolveUnderRoot(rootReal, path);
      if (!resolved.exists) {
        const error = new Error("not found");
        error.reason = "workspace-not-found";
        throw error;
      }
      const info = statSync(resolved.real);
      if (!info.isFile()) {
        const error = new Error("not a file");
        error.reason = "workspace-denied";
        throw error;
      }
      const fd = openSync(resolved.real, "r");
      try {
        const slice = Buffer.alloc(Math.min(length, maxPage));
        const n = readSync(fd, slice, 0, slice.length, offset);
        return {
          bytes: slice.subarray(0, n).toString("base64"),
          offset,
          eof: offset + n >= info.size,
          version: versionOf(info)
        };
      } finally {
        closeSync(fd);
      }
    },
    write({ path, bytes, expectedVersion, createOnly }) {
      const resolved = resolveUnderRoot(rootReal, path);
      const payload = Buffer.from(bytes, "base64");
      if (payload.length > maxPage) {
        const error = new Error("write exceeds page");
        error.reason = "workspace-limit";
        throw error;
      }
      if (resolved.exists) {
        if (createOnly) {
          const error = new Error("already exists");
          error.reason = "workspace-conflict";
          throw error;
        }
        const info2 = statSync(resolved.real);
        if (expectedVersion && versionOf(info2) !== expectedVersion) {
          const error = new Error("version conflict");
          error.reason = "workspace-conflict";
          throw error;
        }
      } else if (expectedVersion) {
        const error = new Error("version conflict");
        error.reason = "workspace-conflict";
        throw error;
      }
      const dir = dirname2(resolved.joined);
      const tmp = join2(dir, `.dncs-${randomBytes(6).toString("hex")}.tmp`);
      writeFileSync(tmp, payload, { mode: 384 });
      renameSync(tmp, resolved.joined);
      const info = statSync(resolved.joined);
      return { version: versionOf(info), bytes: payload.length };
    },
    mkdir({ path }) {
      const resolved = resolveUnderRoot(rootReal, path);
      if (resolved.exists) {
        const error = new Error("already exists");
        error.reason = "workspace-conflict";
        throw error;
      }
      mkdirSync(resolved.joined);
      return { created: true };
    },
    rename({ from, to }) {
      const src = resolveUnderRoot(rootReal, from);
      if (!src.exists) {
        const error = new Error("not found");
        error.reason = "workspace-not-found";
        throw error;
      }
      const dst = resolveUnderRoot(rootReal, to);
      if (dst.exists) {
        const error = new Error("destination exists");
        error.reason = "workspace-conflict";
        throw error;
      }
      renameSync(src.real ?? src.joined, dst.joined);
      const info = statSync(dst.joined);
      return { destinationVersion: versionOf(info) };
    },
    remove({ path, expectedVersion }) {
      const resolved = resolveUnderRoot(rootReal, path);
      if (!resolved.exists) {
        const error = new Error("not found");
        error.reason = "workspace-not-found";
        throw error;
      }
      const info = resolved.lstat;
      if (expectedVersion && versionOf(info) !== expectedVersion) {
        const error = new Error("version conflict");
        error.reason = "workspace-conflict";
        throw error;
      }
      if (info.isSymbolicLink()) {
        unlinkSync(resolved.joined);
      } else if (info.isDirectory()) {
        const names = readdirSync(resolved.real);
        if (names.length > 0) {
          const error = new Error("directory is not empty");
          error.reason = "workspace-denied";
          throw error;
        }
        rmdirSync(resolved.real);
      } else {
        unlinkSync(resolved.joined);
      }
      return { removed: true };
    }
  };
}

// src/remote/processes.js
import { spawn } from "node:child_process";
import { randomBytes as randomBytes2 } from "node:crypto";
import { realpathSync as realpathSync3 } from "node:fs";
import { join as join3 } from "node:path";
function createProcessTable(rootInput, { maxProcesses = 4, maxPage = 64 * 1024 } = {}) {
  const rootReal = realpathSync3(rootInput);
  const table = /* @__PURE__ */ new Map();
  const get = (handle) => {
    const rec = table.get(handle);
    if (!rec) {
      const error = new Error("unknown processHandle");
      error.reason = "workspace-not-found";
      throw error;
    }
    return rec;
  };
  return {
    reset() {
      for (const rec of table.values()) {
        try {
          rec.child.kill("SIGKILL");
        } catch {
        }
      }
      table.clear();
    },
    start({ argv, cwd, envPatch }) {
      if (table.size >= maxProcesses) {
        const error = new Error("process limit");
        error.reason = "workspace-limit";
        throw error;
      }
      const resolved = resolveUnderRoot(rootReal, cwd ?? ".");
      const cwdReal = resolved.real ?? resolved.joined;
      const handle = `p-${randomBytes2(12).toString("hex")}`;
      const stdout = [];
      const stderr = [];
      let stdoutBytes = 0;
      let stderrBytes = 0;
      const env = { PATH: process.env.PATH, HOME: process.env.HOME, LANG: process.env.LANG };
      for (const [key, value] of Object.entries(envPatch ?? {})) {
        if (key === "SSH_AUTH_SOCK" || key.startsWith("DSH_") || /TOKEN|SECRET|KEY/.test(key)) continue;
        if (typeof value === "string") env[key] = value;
      }
      const child = spawn(argv[0], argv.slice(1), {
        cwd: cwdReal,
        env,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"]
      });
      const rec = {
        handle,
        child,
        argv,
        cwd: cwdReal,
        stdout,
        stderr,
        stdoutBytes,
        stderrBytes,
        exit: null,
        unknown: false
      };
      child.stdout.on("data", (chunk) => {
        stdout.push(Buffer.from(chunk));
        rec.stdoutBytes += chunk.length;
      });
      child.stderr.on("data", (chunk) => {
        stderr.push(Buffer.from(chunk));
        rec.stderrBytes += chunk.length;
      });
      child.on("close", (code, signal) => {
        rec.exit = { code, signal: signal ?? null };
      });
      child.on("error", () => {
        rec.unknown = true;
      });
      table.set(handle, rec);
      return { processHandle: handle };
    },
    read({ processHandle, stdoutOffset = 0, stderrOffset = 0, limit = maxPage }) {
      const rec = get(processHandle);
      const out = Buffer.concat(rec.stdout);
      const err = Buffer.concat(rec.stderr);
      const stdoutChunk = out.subarray(stdoutOffset, stdoutOffset + limit);
      const stderrChunk = err.subarray(stderrOffset, stderrOffset + limit);
      const stdoutTruncated = rec.stdoutBytes > stdoutOffset + stdoutChunk.length && stdoutChunk.length === limit;
      return {
        stdout: stdoutChunk.toString("base64"),
        stderr: stderrChunk.toString("base64"),
        stdoutNext: stdoutOffset + stdoutChunk.length,
        stderrNext: stderrOffset + stderrChunk.length,
        truncated: stdoutTruncated || rec.stderrBytes > stderrOffset + stderrChunk.length,
        exit: rec.exit,
        unknown: rec.unknown
      };
    },
    wait({ processHandle, timeoutMs = 0 }) {
      const rec = get(processHandle);
      if (rec.exit) return { running: false, exit: rec.exit };
      if (!timeoutMs) return { running: true };
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ running: true }), timeoutMs);
        rec.child.once("close", (code, signal) => {
          clearTimeout(timer);
          rec.exit = { code, signal: signal ?? null };
          resolve({ running: false, exit: rec.exit });
        });
      });
    },
    terminate({ processHandle }) {
      const rec = get(processHandle);
      try {
        rec.child.kill("SIGTERM");
        return { stop: "signaled" };
      } catch {
        rec.unknown = true;
        return { stop: "unknown" };
      }
    },
    join(path) {
      return join3(rootReal, path);
    }
  };
}

// ../packages/dsh-interface/src/contracts/FamilyDefinition.js
var FamilyError = class extends Error {
  constructor(reason, detail) {
    super(detail ? `family: ${reason} \u2014 ${detail}` : `family: ${reason}`);
    this.name = "FamilyError";
    this.reason = reason;
    this.detail = detail;
  }
};
var isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);
var req = (cond, reason, detail) => {
  if (!cond) throw new FamilyError(reason, detail);
};
function defineFamily(def) {
  req(isObj(def), "bad-shape", "FamilyDefinition must be an object");
  req(typeof def.contractId === "string" && def.contractId !== "", "missing-contractId");
  const authorityRefs = def.authorityRefs;
  req(isObj(authorityRefs) || Array.isArray(authorityRefs), "missing-authorityRefs");
  const refEntries = Array.isArray(authorityRefs) ? authorityRefs.map((verdict, i) => [i, verdict]) : Object.entries(authorityRefs);
  for (const [name, verdict] of refEntries) {
    req(
      verdict === true || isObj(verdict) && verdict.approved === true,
      "unapproved-authority",
      `authorityRefs[${name}] is not an approved source`
    );
  }
  const operations = def.operations, bindings = def.bindings, providers = def.providers;
  req(isObj(operations) && Object.keys(operations).length > 0, "missing-operations");
  req(isObj(bindings) && Object.keys(bindings).length > 0, "missing-bindings");
  req(isObj(providers) && Object.keys(providers).length > 0, "missing-providers");
  for (const [opId, op2] of Object.entries(operations)) {
    req(isObj(op2), "bad-operation", `operations.${opId}`);
    req(op2.input !== void 0 && op2.output !== void 0, "missing-io", `operations.${opId} needs input/output`);
  }
  for (const [bId, b] of Object.entries(bindings)) {
    req(isObj(b), "bad-binding", `bindings.${bId}`);
    req(Array.isArray(b.operationIds) && b.operationIds.length > 0, "missing-operationIds", `bindings.${bId}`);
    for (const opId of b.operationIds) {
      req(operations[opId] !== void 0, "unknown-operation", `bindings.${bId} references undeclared operation ${opId}`);
    }
    if (b.operationIds.length > 1) {
      req(
        isObj(b.dispatch) && isObj(b.dispatch.cases),
        "missing-dispatch",
        `bindings.${bId} has ${b.operationIds.length} operations but no dispatch.cases selector`
      );
    }
  }
  for (const [pId, p] of Object.entries(providers)) {
    req(isObj(p) && typeof p.plugin === "string", "bad-provider", `providers.${pId}`);
    req(Array.isArray(p.supports), "missing-supports", `providers.${pId}`);
    for (const s of p.supports) {
      req(isObj(s) && typeof s.bindingId === "string", "bad-support", `providers.${pId}.supports`);
      req(bindings[s.bindingId] !== void 0, "unknown-binding", `providers.${pId}.supports \u2192 ${s.bindingId}`);
      for (const opId of s.operationIds ?? []) {
        req(operations[opId] !== void 0, "unknown-operation", `providers.${pId}.supports \u2192 ${opId}`);
      }
    }
  }
  return Object.freeze(def);
}

// src/contracts/codec-util.js
function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function rejectUnknown(input, allowed) {
  if (!isPlainObject(input)) {
    const error = new Error("request must be a JSON object");
    error.reason = "invalid-request";
    throw error;
  }
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      const error = new Error(`unknown field ${key}`);
      error.reason = "invalid-request";
      throw error;
    }
  }
  return input;
}
function requireString(value, name, { min = 1, max = 4096 } = {}) {
  if (typeof value !== "string") {
    const error = new Error(`${name} must be a string`);
    error.reason = "invalid-request";
    throw error;
  }
  if (value.length < min || value.length > max) {
    const error = new Error(`${name} length out of range`);
    error.reason = "invalid-request";
    throw error;
  }
  return value;
}
function optionalBoolean(value, name) {
  if (value === void 0) return void 0;
  if (typeof value !== "boolean") {
    const error = new Error(`${name} must be a boolean`);
    error.reason = "invalid-request";
    throw error;
  }
  return value;
}
function optionalInteger(value, name, { min, max } = {}) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    const error = new Error(`${name} must be an integer`);
    error.reason = "invalid-request";
    throw error;
  }
  if (min !== void 0 && value < min) {
    const error = new Error(`${name} is below ${min}`);
    error.reason = "invalid-request";
    throw error;
  }
  if (max !== void 0 && value > max) {
    const error = new Error(`${name} is above ${max}`);
    error.reason = "invalid-request";
    throw error;
  }
  return value;
}
function decodeBase64(value, name) {
  if (typeof value !== "string" || value === "") {
    const error = new Error(`${name} must be base64`);
    error.reason = "invalid-request";
    throw error;
  }
  if (value.includes("\0") || /[^A-Za-z0-9+/=]/.test(value)) {
    const error = new Error(`${name} is not valid base64`);
    error.reason = "invalid-request";
    throw error;
  }
  return value;
}
function resourceOk(data) {
  return { ok: true, data };
}
function resourceFail(reason, message) {
  return { ok: false, reason, message: String(message ?? reason).slice(0, 300) };
}

// src/contracts/workspace-family.js
var WORKSPACE_FAILURES = Object.freeze([
  "invalid-request",
  "workspace-unavailable",
  "workspace-scope-expired",
  "workspace-denied",
  "workspace-not-found",
  "workspace-conflict",
  "workspace-limit",
  "workspace-failed",
  "workspace-outcome-unknown"
]);
var HTTP_STATUS_FOR_REASON = Object.freeze({
  "invalid-request": 422,
  "workspace-unavailable": 503,
  "workspace-scope-expired": 409,
  "workspace-denied": 403,
  "workspace-not-found": 404,
  "workspace-conflict": 409,
  "workspace-limit": 413,
  "workspace-failed": 502,
  "workspace-outcome-unknown": 502
});
var CONSTRAINTS = Object.freeze({
  maxFrameBytes: 1024 * 1024,
  maxFilePageBytes: 64 * 1024,
  maxInFlight: 8,
  maxProcesses: 4,
  readTimeoutMs: 2e4,
  mcpProtocol: "2025-06-18"
});
var op = (semanticsRef) => ({
  input: { type: "object" },
  output: { type: "object" },
  failures: WORKSPACE_FAILURES.slice(),
  semanticsRef
});
var RESOURCE_OPERATION_IDS = Object.freeze([
  "workspace.inspect",
  "fs.list",
  "fs.stat",
  "fs.read",
  "fs.write",
  "fs.mkdir",
  "fs.rename",
  "fs.remove",
  "process.start",
  "process.read",
  "process.wait",
  "process.terminate"
]);
function pathField(input) {
  const path = requireString(input.path, "path", { min: 1, max: 4096 });
  if (path.includes("\0")) {
    const error = new Error("path must not contain NUL");
    error.reason = "invalid-request";
    throw error;
  }
  return path;
}
var RESOURCE_CODECS = Object.freeze({
  "workspace.inspect": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set());
      return {};
    }
  },
  "fs.list": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["path", "cursor", "limit"]));
      return {
        path: pathField(input),
        cursor: input.cursor === void 0 ? void 0 : requireString(input.cursor, "cursor", { min: 1, max: 512 }),
        limit: optionalInteger(input.limit, "limit", { min: 1, max: 2e3 })
      };
    }
  },
  "fs.stat": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["path"]));
      return { path: pathField(input) };
    }
  },
  "fs.read": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["path", "offset", "length"]));
      const length = optionalInteger(input.length, "length", { min: 1, max: CONSTRAINTS.maxFilePageBytes }) ?? CONSTRAINTS.maxFilePageBytes;
      const offset = optionalInteger(input.offset, "offset", { min: 0 }) ?? 0;
      return { path: pathField(input), offset, length };
    }
  },
  "fs.write": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["path", "bytes", "expectedVersion", "createOnly"]));
      const bytes = decodeBase64(input.bytes, "bytes");
      if (Math.ceil(bytes.length * 0.75) > CONSTRAINTS.maxFilePageBytes) {
        const error = new Error("write exceeds 64 KiB page");
        error.reason = "workspace-limit";
        throw error;
      }
      return {
        path: pathField(input),
        bytes,
        expectedVersion: input.expectedVersion === void 0 ? void 0 : requireString(input.expectedVersion, "expectedVersion", { min: 1, max: 256 }),
        createOnly: optionalBoolean(input.createOnly, "createOnly") === true
      };
    }
  },
  "fs.mkdir": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["path"]));
      return { path: pathField(input) };
    }
  },
  "fs.rename": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["from", "to", "expectedVersion", "overwrite"]));
      if (input.overwrite === true) {
        const error = new Error("overwrite is not supported");
        error.reason = "invalid-request";
        throw error;
      }
      return {
        from: requireString(input.from, "from"),
        to: requireString(input.to, "to"),
        expectedVersion: input.expectedVersion === void 0 ? void 0 : requireString(input.expectedVersion, "expectedVersion", { min: 1, max: 256 }),
        overwrite: false
      };
    }
  },
  "fs.remove": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["path", "expectedVersion", "recursive"]));
      if (input.recursive === true) {
        const error = new Error("recursive delete is not supported");
        error.reason = "invalid-request";
        throw error;
      }
      return {
        path: pathField(input),
        expectedVersion: input.expectedVersion === void 0 ? void 0 : requireString(input.expectedVersion, "expectedVersion", { min: 1, max: 256 }),
        recursive: false
      };
    }
  },
  "process.start": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["argv", "cwd", "envPatch"]));
      if (!Array.isArray(input.argv) || input.argv.length === 0) {
        const error = new Error("argv must be a non-empty array");
        error.reason = "invalid-request";
        throw error;
      }
      const argv = input.argv.map((item, i) => requireString(item, `argv[${i}]`, { min: 1, max: 4096 }));
      if (argv.some((item) => item.includes("\0"))) {
        const error = new Error("argv must not contain NUL");
        error.reason = "invalid-request";
        throw error;
      }
      const envPatch = input.envPatch;
      if (envPatch !== void 0) {
        if (!envPatch || typeof envPatch !== "object" || Array.isArray(envPatch)) {
          const error = new Error("envPatch must be an object");
          error.reason = "invalid-request";
          throw error;
        }
        for (const [key, value] of Object.entries(envPatch)) {
          if (typeof key !== "string" || typeof value !== "string") {
            const error = new Error("envPatch values must be strings");
            error.reason = "invalid-request";
            throw error;
          }
        }
      }
      return {
        argv,
        cwd: input.cwd === void 0 ? "." : requireString(input.cwd, "cwd"),
        envPatch
      };
    }
  },
  "process.read": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["processHandle", "stdoutOffset", "stderrOffset", "limit"]));
      return {
        processHandle: requireString(input.processHandle, "processHandle", { min: 8, max: 128 }),
        stdoutOffset: optionalInteger(input.stdoutOffset, "stdoutOffset", { min: 0 }) ?? 0,
        stderrOffset: optionalInteger(input.stderrOffset, "stderrOffset", { min: 0 }) ?? 0,
        limit: optionalInteger(input.limit, "limit", { min: 1, max: CONSTRAINTS.maxFilePageBytes }) ?? CONSTRAINTS.maxFilePageBytes
      };
    }
  },
  "process.wait": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["processHandle", "timeoutMs"]));
      return {
        processHandle: requireString(input.processHandle, "processHandle", { min: 8, max: 128 }),
        timeoutMs: optionalInteger(input.timeoutMs, "timeoutMs", { min: 0, max: 12e4 }) ?? 0
      };
    }
  },
  "process.terminate": {
    decode(input = {}) {
      rejectUnknown(input, /* @__PURE__ */ new Set(["processHandle"]));
      return { processHandle: requireString(input.processHandle, "processHandle", { min: 8, max: 128 }) };
    }
  }
});
var WORKSPACE_FAMILY = defineFamily({
  contractId: "dncs.workspace.v1",
  authorityRefs: {
    "docs/specs/dsh-nano-cloud-session/design-1119.md#R1": { approved: true },
    "docs/specs/dsh-nano-cloud-session/design-1119.md#R2": { approved: true },
    "docs/specs/dsh-nano-cloud-session/design-1119.md#R3": { approved: true },
    "docs/specs/dsh-nano-cloud-session/design-1119.md#R4": { approved: true },
    "docs/specs/dsh-nano-cloud-session/design-1119.md#R5": { approved: true }
  },
  operations: {
    "workspace.connect": op("workspace/connect"),
    "workspace.status": op("workspace/status"),
    "workspace.disconnect": op("workspace/disconnect"),
    "workspace.inspect": op("workspace/inspect"),
    "fs.list": op("fs/list"),
    "fs.stat": op("fs/stat"),
    "fs.read": op("fs/read"),
    "fs.write": op("fs/write"),
    "fs.mkdir": op("fs/mkdir"),
    "fs.rename": op("fs/rename"),
    "fs.remove": op("fs/remove"),
    "process.start": op("process/start"),
    "process.read": op("process/read"),
    "process.wait": op("process/wait"),
    "process.terminate": op("process/terminate")
  },
  bindings: {
    "http.workspace": {
      operationIds: ["workspace.connect", "workspace.status", "workspace.disconnect", "workspace.inspect"],
      transport: "http",
      path: "/nano-cloud-session/workspace",
      methods: ["POST"],
      bodyLimit: 65536,
      dispatch: { field: "op", cases: {
        connect: "workspace.connect",
        status: "workspace.status",
        disconnect: "workspace.disconnect",
        inspect: "workspace.inspect"
      } }
    },
    "http.resources": {
      operationIds: RESOURCE_OPERATION_IDS.slice(),
      transport: "http",
      path: "/nano-cloud-session/resources",
      methods: ["POST"],
      bodyLimit: 131072,
      dispatch: { field: "op", cases: Object.fromEntries(RESOURCE_OPERATION_IDS.map((id) => [id, id])) }
    },
    "mcp.resources": {
      operationIds: RESOURCE_OPERATION_IDS.slice(),
      transport: "mcp-stdio",
      protocol: CONSTRAINTS.mcpProtocol,
      dispatch: { field: "name", cases: Object.fromEntries(RESOURCE_OPERATION_IDS.map((id) => [id, id])) }
    }
  },
  providers: {
    devin: {
      plugin: "dsh-nano-cloud-session",
      supports: [
        { bindingId: "http.workspace" },
        { bindingId: "http.resources" },
        { bindingId: "mcp.resources" }
      ],
      constraintsRef: "dncs.devin.ssh"
    }
  }
});
function mcpToolsList() {
  return RESOURCE_OPERATION_IDS.map((name) => ({
    name,
    description: name,
    inputSchema: { type: "object", additionalProperties: false }
  }));
}

// src/remote/mcp-stdio.js
var PROTOCOL = CONSTRAINTS.mcpProtocol;
var MAX_FRAME = CONSTRAINTS.maxFrameBytes;
function send(stream, message) {
  stream.write(`${JSON.stringify(message)}
`);
}
function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}
function toolResult(structured, isError = false) {
  return {
    ...isError ? { isError: true } : {},
    content: [{ type: "text", text: JSON.stringify(structured) }],
    structuredContent: structured
  };
}
function createMcpServer({ fs, processes, inspectFacts, stdin = process.stdin, stdout = process.stdout, stderr = process.stderr }) {
  let initialized = false;
  let generation = 0;
  const cancelled = /* @__PURE__ */ new Set();
  const inFlight = /* @__PURE__ */ new Map();
  let buffer = "";
  const tools = new Set(RESOURCE_OPERATION_IDS);
  async function callTool(name, args, id) {
    if (!tools.has(name)) {
      return toolResult(resourceFail("invalid-request", `unknown tool ${name}`), true);
    }
    const codec = RESOURCE_CODECS[name];
    const decoded = codec.decode(args ?? {});
    if (cancelled.has(id)) {
      return toolResult(resourceFail("workspace-failed", "cancelled"), true);
    }
    if (name === "workspace.inspect") {
      return toolResult(resourceOk({
        ...inspectFacts(),
        generation,
        pty: { supported: false, reason: "NATIVE_UNAVAILABLE" },
        forward: { supported: false, reason: "NATIVE_UNAVAILABLE" }
      }));
    }
    if (name.startsWith("fs.")) {
      const method = name.slice(3);
      const data = await fs[method](decoded);
      return toolResult(resourceOk(data));
    }
    if (name.startsWith("process.")) {
      const method = name.slice(8);
      const data = await processes[method](decoded);
      return toolResult(resourceOk(data));
    }
    return toolResult(resourceFail("invalid-request", `unhandled ${name}`), true);
  }
  async function handle(message) {
    if (message === null || typeof message !== "object" || message.jsonrpc !== "2.0") {
      send(stdout, rpcError(message?.id ?? null, -32600, "invalid jsonrpc"));
      return;
    }
    if (message.method === void 0 && message.id !== void 0) return;
    const { id, method, params } = message;
    if (method === "notifications/cancelled") {
      cancelled.add(params?.requestId);
      return;
    }
    if (method === "notifications/initialized") {
      return;
    }
    if (method === "ping") {
      send(stdout, rpcResult(id, {}));
      return;
    }
    if (method === "initialize") {
      generation += 1;
      processes.reset?.();
      initialized = true;
      send(stdout, rpcResult(id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: "dncs-devin-workspace", version: "0.1.0" }
      }));
      return;
    }
    if (!initialized) {
      send(stdout, rpcError(id, -32002, "not initialized"));
      return;
    }
    if (method === "tools/list") {
      send(stdout, rpcResult(id, { tools: mcpToolsList() }));
      return;
    }
    if (method === "tools/call") {
      if (inFlight.size >= CONSTRAINTS.maxInFlight) {
        send(stdout, rpcResult(id, toolResult(resourceFail("workspace-limit", "too many in-flight requests"), true)));
        return;
      }
      const name = params?.name;
      const args = params?.arguments ?? {};
      const work = (async () => {
        try {
          const result = await callTool(name, args, id);
          send(stdout, rpcResult(id, result));
        } catch (error) {
          const reason = error?.reason ?? "workspace-failed";
          send(stdout, rpcResult(id, toolResult(resourceFail(reason, error?.message ?? reason), true)));
        } finally {
          inFlight.delete(id);
        }
      })();
      inFlight.set(id, work);
      return;
    }
    send(stdout, rpcError(id, -32601, `unknown method ${method}`));
  }
  stdin.setEncoding("utf8");
  stdin.on("data", (chunk) => {
    if (chunk.length > MAX_FRAME) {
      stderr.write("frame too large\n");
      return;
    }
    buffer += chunk;
    if (buffer.length > MAX_FRAME * 2) {
      buffer = "";
      stderr.write("buffer overflow\n");
      return;
    }
    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.trim() === "") continue;
      if (Buffer.byteLength(line) > MAX_FRAME) {
        stderr.write("line too large\n");
        continue;
      }
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        send(stdout, rpcError(null, -32700, "parse error"));
        continue;
      }
      void handle(message);
    }
  });
  return { handle };
}

// src/remote/entry.mjs
import os from "node:os";
function runningAsCli() {
  try {
    const self = realpathSync4(fileURLToPath(import.meta.url));
    const invoked = process.argv[1] ? realpathSync4(process.argv[1]) : "";
    return self === invoked;
  } catch {
    return false;
  }
}
function arg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}
function start(rootArg) {
  if (!rootArg) {
    process.stderr.write("missing --root\n");
    process.exit(2);
  }
  let rootReal;
  try {
    rootReal = realpathSync4(rootArg);
    if (!statSync2(rootReal).isDirectory()) throw new Error("not a directory");
  } catch (error) {
    process.stderr.write(`invalid root: ${error.message}
`);
    process.exit(2);
  }
  const fs = createFilesystem(rootReal);
  const processes = createProcessTable(rootReal);
  createMcpServer({
    fs,
    processes,
    inspectFacts: () => ({
      root: rootReal,
      os: `${os.platform()}-${os.arch()}`,
      runtime: { node: process.versions.node, execPath: process.execPath },
      user: os.userInfo().username,
      home: os.homedir(),
      cwd: process.cwd(),
      pty: { supported: false, reason: "NATIVE_UNAVAILABLE" },
      forward: { supported: false, reason: "NATIVE_UNAVAILABLE" }
    })
  });
}
if (runningAsCli()) start(arg("--root"));
export {
  createFilesystem,
  createMcpServer,
  createProcessTable
};
