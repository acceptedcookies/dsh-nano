// src/host/routes.js
import { mkdir as mkdir2, opendir } from "node:fs/promises";
import { homedir } from "node:os";
import { basename as basename2, dirname as dirname2, isAbsolute, join as join3, resolve as resolve3 } from "node:path";

// src/host/credentials.js
var IDENTITY_REF = "DSH_NSW_IDENTITY";
var USERNAME_REF = "DSH_NSW_USERNAME";
async function readIdentity(ctx) {
  const credentials = ctx.get("credentials");
  if (credentials === void 0 || credentials === null) return void 0;
  const resolved = await credentials.resolve(IDENTITY_REF);
  if (resolved === void 0) return void 0;
  const raw = resolved.value;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        username: typeof parsed.username === "string" ? parsed.username : void 0,
        token: typeof parsed.token === "string" && parsed.token !== "" ? parsed.token : void 0,
        accessKey: typeof parsed.accessKey === "string" && parsed.accessKey !== "" ? parsed.accessKey : void 0,
        configured: true,
        source: resolved.source
      };
    }
  } catch {
  }
  return { token: raw, configured: true, source: resolved.source };
}
async function writeIdentity(ctx, next) {
  const credentials = ctx.get("credentials");
  if (credentials === void 0 || credentials === null) {
    throw new Error("credentials service is unavailable");
  }
  const current = await readIdentity(ctx) ?? {};
  const record = {
    username: next.username ?? current.username,
    token: next.token ?? current.token,
    accessKey: next.accessKey ?? current.accessKey
  };
  if (typeof record.username !== "string" || record.username.trim() === "") {
    throw new Error("username is required");
  }
  const hasSecret = typeof record.token === "string" && record.token !== "" || typeof record.accessKey === "string" && record.accessKey !== "";
  if (!hasSecret) throw new Error("a MinIO token (AK:SK or secret key) is required");
  await credentials.set(IDENTITY_REF, JSON.stringify(record));
  await credentials.set(USERNAME_REF, record.username.trim());
}
async function clearIdentity(ctx) {
  const credentials = ctx.get("credentials");
  if (credentials === void 0 || credentials === null) return;
  await credentials.unset(IDENTITY_REF);
  await credentials.unset(USERNAME_REF);
}

// src/host/s3.js
import { createHash, createHmac } from "node:crypto";
var UA = "dsh-nano-shared-workspace/0.1.0";
var sha256Hex = (data) => createHash("sha256").update(data).digest("hex");
var hmac = (key, data) => createHmac("sha256", key).update(data).digest();
var hmacHex = (key, data) => createHmac("sha256", key).update(data).digest("hex");
var encodeSegment = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
function signingPair(identity) {
  if (typeof identity?.accessKey === "string" && identity.accessKey !== "") {
    return { accessKey: identity.accessKey, secretKey: identity.token };
  }
  const token = identity?.token;
  if (typeof token === "string" && token.includes(":")) {
    const at = token.indexOf(":");
    return { accessKey: token.slice(0, at), secretKey: token.slice(at + 1) };
  }
  return void 0;
}
async function request(config, keys, method, keyPath, params = {}, body = void 0, extra = {}) {
  const url = new URL(config.endpoint.replace(/\/+$/, "") + "/" + keyPath.split("/").map(encodeSegment).join("/"));
  for (const [name2, value] of Object.entries(params)) {
    if (value !== void 0) url.searchParams.set(name2, value);
  }
  const payload = body === void 0 ? "" : body;
  const payloadHash = sha256Hex(payload);
  const now = /* @__PURE__ */ new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const host = url.host;
  const headers = {
    host,
    "user-agent": UA,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate
  };
  if (typeof config.sessionToken === "string") headers["x-amz-security-token"] = config.sessionToken;
  if (typeof extra.ifNoneMatch === "string") headers["if-none-match"] = extra.ifNoneMatch;
  if (typeof extra.ifMatch === "string") headers["if-match"] = extra.ifMatch;
  const signedNames = Object.keys(headers).sort();
  const canonicalHeaders = signedNames.map((n) => `${n}:${headers[n]}
`).join("");
  const signedHeaders = signedNames.join(";");
  const canonicalRequest = [
    method,
    url.pathname,
    // SigV4 wants the query already URL-encoded, key=value, sorted.
    [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&"),
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${keys.secretKey}`, dateStamp);
  const kRegion = hmac(kDate, config.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmacHex(kSigning, stringToSign);
  const sent = {
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    "user-agent": UA,
    authorization: `AWS4-HMAC-SHA256 Credential=${keys.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
  if (typeof extra.ifNoneMatch === "string") sent["if-none-match"] = extra.ifNoneMatch;
  if (typeof extra.ifMatch === "string") sent["if-match"] = extra.ifMatch;
  return fetch(url, {
    method,
    headers: sent,
    body: payload === "" ? void 0 : payload
  });
}
function keysOrThrow(identity) {
  const keys = signingPair(identity);
  if (keys === void 0 || keys.secretKey === void 0 || keys.secretKey === "") {
    throw new Error('token must be "AccessKey:SecretKey" or paired with the accessKey field');
  }
  return keys;
}
var bucketPath = (config) => `${config.bucket}${config.prefix === "" ? "" : `/${config.prefix}`}`;
function parseListXml(xml) {
  const pickAll = (tag) => [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))].map((m) => m[1]);
  return {
    keys: pickAll("Key"),
    prefixes: pickAll("Prefix"),
    isTruncated: /<IsTruncated>true</.test(xml)
  };
}
function createS3(config, identity) {
  const keys = keysOrThrow(identity);
  return {
    /** PUT a JSON object under the bucket prefix. */
    async putJson(key, value, extra) {
      const res = await request(config, keys, "PUT", `${bucketPath(config)}/${key}`, {}, JSON.stringify(value), extra);
      if (res.status === 412) return { conflict: true };
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`S3 PUT ${key} failed: HTTP ${res.status} ${body.slice(0, 200)}`);
      }
      return { conflict: false };
    },
    /** PUT raw bytes (session artifact slices). */
    async putBytes(key, buf, extra) {
      const res = await request(config, keys, "PUT", `${bucketPath(config)}/${key}`, {}, buf, extra);
      if (res.status === 412) return { conflict: true };
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`S3 PUT ${key} failed: HTTP ${res.status} ${body.slice(0, 200)}`);
      }
      return { conflict: false };
    },
    /** GET raw bytes; `undefined` when 404. */
    async getBytes(key) {
      const res = await request(config, keys, "GET", `${bucketPath(config)}/${key}`);
      if (res.status === 404) return void 0;
      if (!res.ok) throw new Error(`S3 GET ${key} failed: HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    },
    /** GET one object; `undefined` when 404. */
    async getJson(key) {
      const res = await request(config, keys, "GET", `${bucketPath(config)}/${key}`);
      if (res.status === 404) return void 0;
      if (!res.ok) throw new Error(`S3 GET ${key} failed: HTTP ${res.status}`);
      return res.json();
    },
    /** DELETE one object; 204/404 both mean "gone". */
    async del(key) {
      const res = await request(config, keys, "DELETE", `${bucketPath(config)}/${key}`);
      if (!res.ok && res.status !== 404) {
        throw new Error(`S3 DELETE ${key} failed: HTTP ${res.status}`);
      }
    },
    /** List object keys and common prefixes under `prefix` (single page, v1 cap). */
    async list(prefix) {
      const res = await request(config, keys, "GET", `${bucketPath(config)}/`, {
        "list-type": "2",
        delimiter: "/",
        "max-keys": "1000",
        prefix: `${config.prefix === "" ? "" : `${config.prefix}/`}${prefix}`
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`S3 LIST ${prefix} failed: HTTP ${res.status} ${body.slice(0, 200)}`);
      }
      return parseListXml(await res.text());
    }
  };
}

// src/host/workspaces.js
import { execFile } from "node:child_process";
import { createHash as createHash2, randomBytes, randomUUID } from "node:crypto";
import { basename, resolve } from "node:path";
var hash16 = (input) => createHash2("sha256").update(input).digest("hex").slice(0, 16);
var INSTANCE_REF = "DSH_NSW_INSTANCE_ID";
async function instanceId(ctx) {
  const credentials = ctx.get("credentials");
  const resolved = await credentials?.resolve(INSTANCE_REF);
  if (typeof resolved?.value === "string" && resolved.value !== "") return resolved.value;
  const generated = randomUUID();
  await credentials?.set(INSTANCE_REF, generated);
  return generated;
}
function remoteUrl(path) {
  return new Promise((resolvePromise) => {
    execFile("git", ["-C", path, "remote", "get-url", "origin"], { timeout: 5e3 }, (error, stdout) => {
      resolvePromise(error === null && stdout.trim() !== "" ? stdout.trim() : void 0);
    });
  });
}
async function workspaceIdFor(path) {
  const remote = await remoteUrl(path);
  if (remote !== void 0) return hash16(remote.replace(/\.git$/, ""));
  const leaf = basename(resolve(path));
  return hash16(leaf === "" ? resolve(path) : leaf);
}
var memberKeyOf = (identity, me) => `${identity.username}@${me.slice(0, 8)}`;
async function createWorkspace(s3, ctx, identity, { name: name2, localPath }) {
  const me = await instanceId(ctx);
  const memberId = memberKeyOf(identity, me);
  const marker = {
    v: 1,
    workspaceId: randomBytes(8).toString("hex"),
    title: name2,
    pathHint: name2,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    createdBy: memberId,
    members: {
      [memberId]: {
        username: identity.username,
        instance: me,
        localPath,
        joinedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    }
  };
  await s3.putJson(`workspaces/${marker.workspaceId}.json`, marker);
  return marker;
}
async function joinWorkspace(s3, ctx, identity, { workspaceId, localPath }) {
  const key = `workspaces/${workspaceId}.json`;
  const existing = await s3.getJson(key);
  if (existing === void 0) throw new Error("shared workspace not found");
  const me = await instanceId(ctx);
  const memberId = memberKeyOf(identity, me);
  const members = { ...existing.members ?? {} };
  if (members[memberId] === void 0) {
    members[memberId] = { username: identity.username, instance: me, joinedAt: (/* @__PURE__ */ new Date()).toISOString() };
  }
  members[memberId].localPath = localPath;
  const marker = { ...existing, members };
  await s3.putJson(key, marker);
  return marker;
}
async function listWorkspaces(s3) {
  const { keys } = await s3.list("workspaces/");
  const rows = [];
  for (const key of keys) {
    if (!key.endsWith(".json")) continue;
    const row = await s3.getJson(key).catch(() => void 0);
    if (row !== void 0 && typeof row === "object" && typeof row.workspaceId === "string") rows.push(row);
  }
  return rows;
}
async function matchWorkspace(cwd, markers) {
  const legacy = await workspaceIdFor(cwd);
  let prefixBest = null;
  for (const marker of markers) {
    if (marker.workspaceId === legacy) return marker;
    for (const member of Object.values(marker.members ?? {})) {
      const localPath = member?.localPath;
      if (typeof localPath !== "string" || localPath === "") continue;
      if (cwd === localPath || cwd.startsWith(`${localPath}/`)) {
        if (prefixBest === null || localPath.length > (prefixBest.__matchLength ?? 0)) {
          prefixBest = { ...marker, __matchLength: localPath.length };
        }
      }
    }
  }
  return prefixBest;
}

// src/host/session-io.js
import { mkdir, writeFile } from "node:fs/promises";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { constants, zstdCompressSync, zstdDecompressSync } from "node:zlib";
var zstdFrame = (bytes) => zstdCompressSync(bytes, { params: { [constants.ZSTD_c_checksumFlag]: 1 } });
function projectKey(cwd) {
  if (cwd.length === 0) throw new Error("cannot encode an empty project path");
  let readable = "";
  let separatorRun = false;
  for (let i = 0; i < cwd.length; i += 1) {
    const code = cwd.charCodeAt(i);
    const ch = String.fromCharCode(code);
    if (ch === "/" || ch === "\\" || ch === ":") {
      if (!separatorRun) readable += "-";
      separatorRun = true;
    } else if (ch !== "~" && /^[A-Za-z0-9._-]$/.test(ch)) {
      readable += ch;
      separatorRun = false;
    } else {
      readable += `~${code.toString(16).toUpperCase().padStart(4, "0")}`;
      separatorRun = false;
    }
  }
  const slug = readable.replace(/^-+/, "") || "root";
  return `--${slug.slice(0, 251)}--`;
}
var CHUNK = 64 * 1024;
var CLAIM_TTL_MS = 9e4;
var sessionDir = (home) => join(home, "sessions");
function decode(buf) {
  try {
    return zstdDecompressSync(buf).toString("utf8");
  } catch {
    return void 0;
  }
}
function summarize(buf) {
  const text = decode(buf);
  if (text === void 0) return { broken: true };
  let title = null;
  let createdAt = null;
  let cwd = null;
  let id = null;
  let events = 0;
  for (const line of text.split("\n")) {
    if (line === "") continue;
    events += 1;
    if (events > 4e3) break;
    try {
      const event = JSON.parse(line);
      if (event?.type === "session" && id === null) {
        id = typeof event.id === "string" ? event.id : null;
        cwd = typeof event.cwd === "string" ? event.cwd : null;
        createdAt = typeof event.createdAt === "number" ? event.createdAt : null;
      }
      if (event?.type === "session/title" && typeof event?.data?.title === "string") {
        title = event.data.title;
      }
    } catch {
    }
  }
  return { id, title, cwd, createdAt, events };
}
function listLocalSessions(dshHome) {
  const root = sessionDir(dshHome);
  const out = [];
  let projects = [];
  try {
    projects = readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const project of projects) {
    if (!project.isDirectory()) continue;
    let sessions = [];
    try {
      sessions = readdirSync(join(root, project.name), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const dir of sessions) {
      if (!dir.isDirectory() || !dir.name.startsWith("session-")) continue;
      const filePath = join(root, project.name, dir.name, "session.v4.jsonl.zstd");
      try {
        const stat = statSync(filePath);
        out.push({
          sessionId: dir.name,
          projectDir: project.name,
          filePath,
          sizeBytes: stat.size,
          mtimeMs: stat.mtimeMs
        });
      } catch {
      }
    }
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
}
async function acquireClaim(s3, ctx, sessionId, writerId, heartbeatRev) {
  const key = `claims/${sessionId}.json`;
  const existing = await s3.getJson(key).catch(() => void 0);
  const now = Date.now();
  if (existing !== void 0 && existing.writerId !== writerId && typeof existing.expiresAt === "number" && existing.expiresAt > now) {
    return { acquired: false, holder: existing.writerId, heartbeatRev: existing.heartbeatRev ?? 0 };
  }
  await s3.putJson(key, {
    writerId,
    acquiredAt: new Date(now).toISOString(),
    expiresAt: now + CLAIM_TTL_MS,
    heartbeatRev
  });
  return { acquired: true, heartbeatRev, expiresAt: now + CLAIM_TTL_MS };
}
async function renewClaim(s3, sessionId, writerId) {
  const key = `claims/${sessionId}.json`;
  const existing = await s3.getJson(key).catch(() => void 0);
  const now = Date.now();
  if (existing === void 0 || existing.writerId !== writerId || !(existing.expiresAt > now)) {
    return { renewed: false, holder: existing?.writerId ?? null, expiresAt: existing?.expiresAt ?? null };
  }
  const expiresAt = now + CLAIM_TTL_MS;
  await s3.putJson(key, {
    ...existing,
    expiresAt,
    heartbeatRev: (existing.heartbeatRev ?? 0) + 1
  });
  return { renewed: true, holder: writerId, expiresAt };
}
async function pushSession(s3, ctx, identity, local, markers, state) {
  const me = await instanceId(ctx);
  const writerId = `${identity.username}@${me.slice(0, 8)}`;
  const buf = readFileSync(local.filePath);
  const head = summarize(buf);
  if (head.cwd === null) return { sessionId: local.sessionId, outcome: "skip:unparsable" };
  const marker = await matchWorkspace(head.cwd, markers);
  if (marker === null) return { sessionId: local.sessionId, outcome: "skip:not-shared" };
  const workspaceId = marker.workspaceId;
  const metaKey = `workspaces/${workspaceId}/sessions/${local.sessionId}/meta.json`;
  const remote = await s3.getJson(metaKey).catch(() => void 0);
  if (remote !== void 0 && remote.writerId !== writerId) {
    return { sessionId: local.sessionId, outcome: "skip:foreign-writer" };
  }
  const tracked = state.bySession.get(local.sessionId) ?? { heartbeatRev: 0, pushedBytes: 0 };
  const claim = await acquireClaim(s3, ctx, local.sessionId, writerId, tracked.heartbeatRev + 1);
  if (!claim.acquired) {
    return { sessionId: local.sessionId, outcome: `skip:lease-held-by-${claim.holder}` };
  }
  tracked.heartbeatRev = claim.heartbeatRev;
  const committed = remote?.committedBytes ?? 0;
  let written = 0;
  if (buf.length > committed) {
    for (let offset = committed; offset < buf.length; offset += CHUNK) {
      const index = Math.floor(offset / CHUNK);
      const slice = buf.subarray(offset, Math.min(offset + CHUNK, buf.length));
      await s3.putBytes(`workspaces/${workspaceId}/sessions/${local.sessionId}/body/${index}.part`, slice);
      written += slice.length;
    }
  }
  const rev = (remote?.rev ?? 0) + 1;
  await s3.putJson(metaKey, {
    v: 1,
    sessionId: local.sessionId,
    writerId,
    writerName: identity.username,
    rev,
    formatVersion: 4,
    committedBytes: buf.length,
    uncompressedSeqBytes: 0,
    eventCount: head.events ?? 0,
    title: head.title ?? "",
    projectDir: local.projectDir,
    cwd: head.cwd,
    createdAt: remote?.createdAt ?? (head.createdAt !== null ? new Date(head.createdAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString()),
    mtime: new Date(local.mtimeMs).toISOString(),
    deleted: false,
    attachmentRefs: []
  });
  tracked.pushedBytes = buf.length;
  state.bySession.set(local.sessionId, tracked);
  return {
    sessionId: local.sessionId,
    outcome: written > 0 ? `pushed:${written}b` : "fresh",
    workspaceId
  };
}
async function syncAll(s3, ctx, identity, dshHome, state) {
  const markers = await listWorkspaces(s3);
  const results = [];
  for (const local of listLocalSessions(dshHome)) {
    try {
      results.push(await pushSession(s3, ctx, identity, local, markers, state));
    } catch (error) {
      results.push({ sessionId: local.sessionId, outcome: `error:${error instanceof Error ? error.message : String(error)}` });
    }
  }
  return results;
}
async function listRemoteSessions(s3) {
  const { prefixes } = await s3.list("workspaces/");
  const out = [];
  for (const wsPrefix of prefixes) {
    const workspaceId = wsPrefix.replace(/^workspaces\//, "").replace(/\/$/, "");
    const inner = await s3.list(`workspaces/${workspaceId}/sessions/`).catch(() => ({ prefixes: [] }));
    for (const sessionPrefix of inner.prefixes ?? []) {
      const sessionId = sessionPrefix.replace(/\/$/, "").split("/").pop();
      const meta = await s3.getJson(`workspaces/${workspaceId}/sessions/${sessionId}/meta.json`).catch(() => void 0);
      if (meta !== void 0) out.push({ workspaceId, ...meta });
    }
  }
  return out;
}
async function fetchTranscript(s3, workspaceId, sessionId) {
  const meta = await s3.getJson(`workspaces/${workspaceId}/sessions/${sessionId}/meta.json`);
  if (meta === void 0) throw new Error("no such session");
  const parts = Math.ceil((meta.committedBytes ?? 0) / CHUNK);
  const buffers = [];
  for (let index = 0; index < parts; index += 1) {
    const part = await s3.getBytes(`workspaces/${workspaceId}/sessions/${sessionId}/body/${index}.part`);
    if (part === void 0) throw new Error(`missing body part ${index}`);
    buffers.push(part);
  }
  const joined = Buffer.concat(buffers);
  const text = decode(joined);
  if (text === void 0) throw new Error("artifact failed to decode");
  const events = [];
  for (const line of text.split("\n")) {
    if (line === "") continue;
    try {
      events.push(JSON.parse(line));
    } catch {
    }
  }
  return { meta, events };
}
async function materializeSession(s3, dshHome, { workspaceId, sessionId, localPath }) {
  const meta = await s3.getJson(`workspaces/${workspaceId}/sessions/${sessionId}/meta.json`);
  if (meta === void 0) throw new Error("no such session");
  const parts = Math.ceil((meta.committedBytes ?? 0) / CHUNK);
  const buffers = [];
  for (let index = 0; index < parts; index += 1) {
    const part = await s3.getBytes(`workspaces/${workspaceId}/sessions/${sessionId}/body/${index}.part`);
    if (part === void 0) throw new Error(`missing body part ${index}`);
    buffers.push(part);
  }
  const text = decode(Buffer.concat(buffers));
  if (text === void 0) throw new Error("artifact failed to decode");
  const newline = text.indexOf("\n");
  if (newline < 0) throw new Error("remote artifact has no session header");
  const header = JSON.parse(text.slice(0, newline));
  if (header?.type !== "session" || header.id !== sessionId) throw new Error("remote artifact header does not match the session");
  header.cwd = localPath;
  const headerFrame = zstdFrame(Buffer.from(`${JSON.stringify(header)}
`));
  const rest = text.slice(newline + 1);
  const body = rest === "" ? Buffer.alloc(0) : zstdFrame(Buffer.from(rest.endsWith("\n") ? rest : `${rest}
`));
  const dir = join(dshHome, "sessions", projectKey(localPath), sessionId);
  await mkdir(dir, { recursive: true });
  const path = join(dir, "session.v4.jsonl.zstd");
  await writeFile(path, Buffer.concat([headerFrame, body]));
  return { sessionId, cwd: localPath, path };
}

// src/host/tree.js
import { createHash as createHash3 } from "node:crypto";
import { mkdirSync, readFileSync as readFileSync2, readdirSync as readdirSync2, statSync as statSync2, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join as join2, relative, resolve as resolve2, sep } from "node:path";
var SKIP = /* @__PURE__ */ new Set([".git", "node_modules", ".nsw", ".DS_Store"]);
var MAX_FILE = 2 * 1024 * 1024;
var MAX_FILES = 200;
var headKey = (id) => `workspaces/${id}/tree/HEAD.json`;
var genKey = (id, n) => `workspaces/${id}/tree/generations/${n}.json`;
var blobKey = (id, sha) => `workspaces/${id}/tree/blobs/${sha}`;
var sha256 = (buf) => createHash3("sha256").update(buf).digest("hex");
function inside(root, rel) {
  const dest = resolve2(root, rel);
  const base = resolve2(root);
  return dest === base || dest.startsWith(base + sep) ? dest : void 0;
}
function scan(root) {
  const files = [];
  const walk = (dir) => {
    let names = [];
    try {
      names = readdirSync2(dir);
    } catch {
      return;
    }
    for (const name2 of names) {
      if (SKIP.has(name2) || files.length >= MAX_FILES) continue;
      const abs = join2(dir, name2);
      let st;
      try {
        st = statSync2(abs);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(abs);
      else if (st.isFile() && st.size <= MAX_FILE) {
        const buf = readFileSync2(abs);
        files.push({
          rel: relative(root, abs).split("\\").join("/"),
          sha256: sha256(buf),
          size: buf.length
        });
      }
    }
  };
  walk(root);
  files.sort((a, b) => a.rel.localeCompare(b.rel));
  return files;
}
function byRel(files) {
  return new Map((files ?? []).map((file) => [file.rel, file]));
}
function isText(buf) {
  return !buf.includes(0);
}
function readRel(root, rel) {
  const dest = inside(root, rel);
  if (dest === void 0) return void 0;
  try {
    return readFileSync2(dest);
  } catch {
    return void 0;
  }
}
function dissolve(root, parent, remote, local) {
  const p = byRel(parent);
  const r = byRel(remote);
  const l = byRel(local);
  const paths = /* @__PURE__ */ new Set([...p.keys(), ...r.keys(), ...l.keys()]);
  const files = [];
  const conflicts = [];
  for (const rel of [...paths].sort()) {
    const ps = p.get(rel)?.sha256;
    const rs = r.get(rel)?.sha256;
    const ls = l.get(rel)?.sha256;
    if (ls === rs) {
      if (ls !== void 0) files.push(l.get(rel));
      continue;
    }
    if (ls === ps) {
      if (rs !== void 0) files.push(r.get(rel));
      continue;
    }
    if (rs === ps || rs === void 0 && ps === void 0) {
      if (ls !== void 0) files.push(l.get(rel));
      continue;
    }
    const localBuf = ls !== void 0 ? readRel(root, rel) : void 0;
    const remoteSha = rs;
    conflicts.push(rel);
    if (localBuf !== void 0 && remoteSha !== void 0 && isText(localBuf)) {
      files.push({ rel, sha256: null, size: 0, pending: "text", remoteSha, localBuf });
    } else if (remoteSha !== void 0) {
      files.push({ rel, sha256: remoteSha, size: r.get(rel).size });
      if (localBuf !== void 0) {
        const side = `${rel}.nsw-local`;
        files.push({ rel: side, sha256: sha256(localBuf), size: localBuf.length, buf: localBuf });
      }
    } else if (ls !== void 0) {
      files.push(l.get(rel));
    }
  }
  return { files, conflicts, writes: [] };
}
async function materializePending(s3, workspaceId, root, dissolved) {
  const out = [];
  for (const file of dissolved.files) {
    if (file.pending !== "text") {
      out.push({ rel: file.rel, sha256: file.sha256, size: file.size, buf: file.buf });
      continue;
    }
    const remoteBuf = await s3.getBytes(blobKey(workspaceId, file.remoteSha));
    const merged = Buffer.from(`<<<<<<< local
${file.localBuf.toString("utf8")}=======
${(remoteBuf ?? Buffer.alloc(0)).toString("utf8")}>>>>>>> remote
`);
    const dest = inside(root, file.rel);
    if (dest !== void 0) {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, merged);
    }
    out.push({ rel: file.rel, sha256: sha256(merged), size: merged.length, buf: merged });
    dissolved.writes.push(file.rel);
  }
  return out;
}
function basePath(dshHome, workspaceId) {
  return join2(dshHome, "nsw", `${workspaceId}.json`);
}
function loadBase(dshHome, workspaceId) {
  try {
    return JSON.parse(readFileSync2(basePath(dshHome, workspaceId), "utf8"));
  } catch {
    return { generation: 0, files: [] };
  }
}
function saveBase(dshHome, workspaceId, record) {
  const dest = basePath(dshHome, workspaceId);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, JSON.stringify({ generation: record.generation, files: record.files }));
}
async function ensureBlobs(s3, workspaceId, root, files) {
  for (const file of files) {
    const buf = file.buf ?? readRel(root, file.rel);
    if (buf === void 0) continue;
    await s3.putBytes(blobKey(workspaceId, file.sha256), buf);
  }
}
async function pullWorkspace(s3, dshHome, workspaceId, localPath) {
  const head = await s3.getJson(headKey(workspaceId));
  if (head === void 0) return { ok: true, generation: 0, files: 0 };
  mkdirSync(localPath, { recursive: true });
  const base = loadBase(dshHome, workspaceId);
  const next = new Set((head.files ?? []).map((file) => file.rel));
  for (const old of base.files ?? []) {
    if (next.has(old.rel)) continue;
    const dest = inside(localPath, old.rel);
    if (dest === void 0) continue;
    try {
      unlinkSync(dest);
    } catch {
    }
  }
  for (const file of head.files ?? []) {
    const dest = inside(localPath, file.rel);
    if (dest === void 0) continue;
    const have = readRel(localPath, file.rel);
    if (have !== void 0 && sha256(have) === file.sha256) continue;
    const blob = await s3.getBytes(blobKey(workspaceId, file.sha256));
    if (blob === void 0) continue;
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, blob);
  }
  saveBase(dshHome, workspaceId, head);
  return { ok: true, generation: head.generation ?? 0, files: (head.files ?? []).length, conflicts: head.conflicts ?? [] };
}
async function pushWorkspace(s3, dshHome, workspaceId, localPath, writerId, attempt = 0) {
  mkdirSync(localPath, { recursive: true });
  const head = await s3.getJson(headKey(workspaceId));
  const base = loadBase(dshHome, workspaceId);
  const local = scan(localPath);
  const remote = head?.files ?? [];
  const same = JSON.stringify(local.map(({ rel, sha256: sha, size }) => ({ rel, sha256: sha, size }))) === JSON.stringify(remote.map(({ rel, sha256: sha, size }) => ({ rel, sha256: sha, size })));
  if (same && head !== void 0) return { ok: true, generation: head.generation, files: remote.length, unchanged: true, conflicts: [] };
  let parentFiles = base.files ?? [];
  if (head !== void 0 && base.generation !== head.generation) {
    const parent = head.parent ? await s3.getJson(genKey(workspaceId, head.parent)) : void 0;
    parentFiles = parent?.files ?? [];
  }
  const dissolved = dissolve(localPath, parentFiles, remote, local);
  const files = await materializePending(s3, workspaceId, localPath, dissolved);
  await ensureBlobs(s3, workspaceId, localPath, files);
  const generation = (head?.generation ?? 0) + 1;
  const record = {
    v: 1,
    generation,
    parent: head?.generation ?? null,
    writerId,
    files: files.map(({ rel, sha256: sha, size }) => ({ rel, sha256: sha, size })),
    conflicts: dissolved.conflicts,
    at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const put = await s3.putJson(genKey(workspaceId, generation), record, { ifNoneMatch: "*" });
  if (put?.conflict === true && attempt < 1) return pushWorkspace(s3, dshHome, workspaceId, localPath, writerId, attempt + 1);
  await s3.putJson(headKey(workspaceId), record);
  saveBase(dshHome, workspaceId, record);
  return { ok: true, generation, files: record.files.length, conflicts: dissolved.conflicts };
}
async function registerIdentity(s3, identity) {
  if (typeof identity?.username !== "string" || identity.username === "") return { ok: false };
  const key = `identities/${encodeURIComponent(identity.username)}.json`;
  const existing = await s3.getJson(key);
  if (existing !== void 0) return { ok: true, existed: true };
  await s3.putJson(key, { username: identity.username, claimedAt: (/* @__PURE__ */ new Date()).toISOString() });
  return { ok: true, existed: false };
}

// src/host/routes.js
var PREFIX = "/nano-shared-workspace";
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(payload);
}
async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 64 * 1024) throw new Error("request body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
var field = (value) => typeof value === "string" && value.trim() !== "" ? value.trim() : void 0;
var mask = (secret) => typeof secret === "string" && secret.length >= 8 ? `${secret.slice(0, 4)}\u2026${secret.slice(-4)}` : void 0;
function createRoutes(ctx, config) {
  const dshHome = process.env.DSH_HOME ?? `${homedir()}/.dsh`;
  const syncState = { bySession: /* @__PURE__ */ new Map() };
  const s3 = async () => {
    const identity = await readIdentity(ctx);
    if (identity?.configured !== true) throw new Error("join identity is not configured");
    return { client: createS3(config, identity), identity };
  };
  return {
    "/settings": {
      method: "GET",
      async run() {
        const identity = await readIdentity(ctx);
        let registered = false;
        if (identity?.configured === true && identity.username) {
          try {
            const client = createS3(config, identity);
            const row = await client.getJson(`identities/${encodeURIComponent(identity.username)}.json`);
            registered = row !== void 0;
          } catch {
            registered = false;
          }
        }
        return {
          endpoint: config.endpoint,
          bucket: config.bucket,
          registered,
          region: config.region,
          username: identity?.username ?? null,
          configured: identity?.configured === true,
          credentialSource: identity?.source ?? null,
          maskedSecret: mask(identity?.accessKey ?? identity?.token) ?? null
        };
      }
    },
    "/settings/update": {
      method: "PUT",
      async run(req) {
        const body = JSON.parse(await readBody(req) || "{}");
        const username = field(body?.username);
        const token = field(body?.token);
        const accessKey = field(body?.accessKey);
        if (username === void 0 && token === void 0 && accessKey === void 0) {
          return { ok: false, error: "nothing to update" };
        }
        await writeIdentity(ctx, { username, token, accessKey });
        try {
          const { client, identity } = await s3();
          await registerIdentity(client, identity);
        } catch {
        }
        return { ok: true };
      }
    },
    "/settings/clear": {
      method: "POST",
      async run() {
        await clearIdentity(ctx);
        return { ok: true };
      }
    },
    "/status": {
      method: "GET",
      async run() {
        const identity = await readIdentity(ctx);
        return {
          configured: identity?.configured === true,
          username: identity?.username ?? null,
          // Phase-0: no sync engine yet. These rows shape the client contract.
          state: identity?.configured === true ? "idle" : "unconfigured",
          sessions: []
        };
      }
    },
    "/workspaces": {
      method: "GET",
      async run() {
        const identity = await readIdentity(ctx);
        if (identity?.configured !== true) return { workspaces: [] };
        const client = createS3(config, identity);
        await registerIdentity(client, identity).catch(() => {
        });
        const rows = await listWorkspaces(client);
        return { workspaces: rows };
      }
    },
    // Cloud canonical first: the marker is created on S3 BEFORE the client
    // picks a local replica path, so the workspace is born remote. The local
    // workspace list is deliberately untouched.
    "/workspaces/create": {
      method: "POST",
      async run(req) {
        const { client, identity } = await s3();
        const body = JSON.parse(await readBody(req) || "{}");
        const name2 = typeof body?.name === "string" && body.name.trim() !== "" ? body.name.trim() : void 0;
        const localPath = typeof body?.localPath === "string" && body.localPath.trim() !== "" ? body.localPath.trim() : void 0;
        if (name2 === void 0 || localPath === void 0) {
          return { ok: false, error: "name and localPath are required" };
        }
        const marker = await createWorkspace(client, ctx, identity, { name: name2, localPath });
        return { ok: true, workspace: marker };
      }
    },
    "/workspaces/join": {
      method: "POST",
      async run(req) {
        const { client, identity } = await s3();
        const body = JSON.parse(await readBody(req) || "{}");
        if (typeof body?.workspaceId !== "string" || typeof body?.localPath !== "string" || body.localPath.trim() === "") {
          return { ok: false, error: "workspaceId and localPath are required" };
        }
        const marker = await joinWorkspace(
          client,
          ctx,
          identity,
          { workspaceId: body.workspaceId, localPath: body.localPath.trim() }
        );
        return { ok: true, workspace: marker };
      }
    },
    "/sync": {
      method: "POST",
      async run() {
        const { client, identity } = await s3();
        const results = await syncAll(client, ctx, identity, dshHome, syncState);
        const me = (await instanceId(ctx)).slice(0, 8);
        const trees = [];
        for (const marker of await listWorkspaces(client)) {
          const member = Object.values(marker.members ?? {}).find((item) => item?.username === identity.username && String(item.instance ?? "").startsWith(me)) ?? Object.values(marker.members ?? {}).find((item) => item?.username === identity.username);
          if (typeof member?.localPath !== "string" || member.localPath === "") continue;
          try {
            trees.push({ workspaceId: marker.workspaceId, ...await pushWorkspace(client, dshHome, marker.workspaceId, member.localPath, `${identity.username}@${me}`) });
          } catch (error) {
            trees.push({ workspaceId: marker.workspaceId, ok: false, error: messageOf(error) });
          }
        }
        return {
          ok: true,
          pushed: results.filter((r) => r.outcome.startsWith("pushed")).length,
          outcomes: results.slice(0, 50),
          trees
        };
      }
    },
    "/tree/pull": {
      method: "POST",
      async run(req) {
        const { client, identity } = await s3();
        const body = JSON.parse(await readBody(req) || "{}");
        const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : "";
        const marker = (await listWorkspaces(client)).find((row) => row.workspaceId === workspaceId);
        if (marker === void 0) return { ok: false, error: "shared workspace not found" };
        const me = (await instanceId(ctx)).slice(0, 8);
        const member = Object.values(marker.members ?? {}).find((item) => item?.username === identity.username && String(item.instance ?? "").startsWith(me)) ?? Object.values(marker.members ?? {}).find((item) => item?.username === identity.username);
        if (typeof member?.localPath !== "string" || member.localPath === "") return { ok: false, error: "join this shared workspace before syncing files" };
        return pullWorkspace(client, dshHome, workspaceId, member.localPath);
      }
    },
    "/tree/push": {
      method: "POST",
      async run(req) {
        const { client, identity } = await s3();
        const body = JSON.parse(await readBody(req) || "{}");
        const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : "";
        const marker = (await listWorkspaces(client)).find((row) => row.workspaceId === workspaceId);
        if (marker === void 0) return { ok: false, error: "shared workspace not found" };
        const me = (await instanceId(ctx)).slice(0, 8);
        const member = Object.values(marker.members ?? {}).find((item) => item?.username === identity.username && String(item.instance ?? "").startsWith(me)) ?? Object.values(marker.members ?? {}).find((item) => item?.username === identity.username);
        if (typeof member?.localPath !== "string" || member.localPath === "") return { ok: false, error: "join this shared workspace before syncing files" };
        return pushWorkspace(client, dshHome, workspaceId, member.localPath, `${identity.username}@${me}`);
      }
    },
    // Harness only enables the composer for a session a Host workspace accounts.
    // The replica workspace stays hidden from the local sidebar; this is not a
    // second source of truth.
    "/sessions/bind": {
      method: "POST",
      async run(req) {
        const body = JSON.parse(await readBody(req) || "{}");
        const localPath = typeof body?.path === "string" ? body.path : "";
        const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
        if (localPath === "" || sessionId === "") return { ok: false, error: "path and sessionId are required" };
        const registry = ctx.get("workspaceRegistry");
        const workspace = await registry.resolveByPath(localPath);
        if (workspace === void 0) return { ok: false, error: "replica is not registered" };
        if (!workspace.sessionIds.includes(sessionId)) await workspace.attachSession(sessionId);
        return { ok: true, workspaceId: workspace.id };
      }
    },
    "/sessions/claim": {
      method: "POST",
      async run(req) {
        const { client, identity } = await s3();
        const body = JSON.parse(await readBody(req) || "{}");
        const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : "";
        const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
        if (workspaceId === "" || sessionId === "") return { ok: false, error: "workspaceId and sessionId are required" };
        const marker = (await listWorkspaces(client)).find((row) => row.workspaceId === workspaceId);
        if (marker === void 0) return { ok: false, error: "shared workspace not found" };
        const me = (await instanceId(ctx)).slice(0, 8);
        const member = Object.values(marker.members ?? {}).find((item) => item?.username === identity.username && String(item.instance ?? "").startsWith(me)) ?? Object.values(marker.members ?? {}).find((item) => item?.username === identity.username);
        if (typeof member?.localPath !== "string" || member.localPath === "") return { ok: false, error: "join this shared workspace before opening its sessions" };
        const claim = await acquireClaim(client, ctx, sessionId, `${identity.username}@${me}`, 1);
        return {
          ok: claim.acquired === true,
          busy: claim.acquired !== true,
          holder: claim.holder ?? null,
          expiresAt: claim.expiresAt ?? null
        };
      }
    },
    "/sessions/heartbeat": {
      method: "POST",
      async run(req) {
        const { client, identity } = await s3();
        const body = JSON.parse(await readBody(req) || "{}");
        const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : "";
        const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
        if (sessionId === "") return { ok: false, error: "sessionId is required" };
        const me = (await instanceId(ctx)).slice(0, 8);
        const writerId = `${identity.username}@${me}`;
        const renewed = await renewClaim(client, sessionId, writerId);
        if (renewed.renewed !== true) return { ok: false, busy: true, holder: renewed.holder, expiresAt: renewed.expiresAt };
        let tree = null;
        if (workspaceId !== "") {
          const marker = (await listWorkspaces(client)).find((row) => row.workspaceId === workspaceId);
          const member = Object.values(marker?.members ?? {}).find((item) => item?.username === identity.username && String(item.instance ?? "").startsWith(me)) ?? Object.values(marker?.members ?? {}).find((item) => item?.username === identity.username);
          if (typeof member?.localPath === "string" && member.localPath !== "") {
            tree = await pushWorkspace(client, dshHome, workspaceId, member.localPath, writerId);
          }
        }
        return { ok: true, expiresAt: renewed.expiresAt, tree };
      }
    },
    "/sessions/lease": {
      method: "POST",
      async run(req) {
        const { client, identity } = await s3();
        const body = JSON.parse(await readBody(req) || "{}");
        const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
        if (sessionId === "") return { ok: false, error: "sessionId is required" };
        const claim = await client.getJson(`claims/${sessionId}.json`);
        const me = (await instanceId(ctx)).slice(0, 8);
        return {
          ok: true,
          holder: claim?.writerId ?? null,
          expiresAt: claim?.expiresAt ?? null,
          heartbeatRev: claim?.heartbeatRev ?? null,
          mine: claim?.writerId === `${identity.username}@${me}`
        };
      }
    },
    "/sessions": {
      method: "GET",
      async run() {
        const { client } = await s3();
        return { sessions: await listRemoteSessions(client) };
      }
    },
    // Host-side mkdir: the directoryPicker/browse backend (which owns
    // `directoryPicker/createDirectory`) is not composed on every instance —
    // the native picker's host lacks it and the remote call 502s. This route
    // always works on our host plugin.
    "/mkdir": {
      method: "POST",
      async run(req) {
        const body = JSON.parse(await readBody(req) || "{}");
        const parent = typeof body?.parent === "string" && isAbsolute(body.parent) ? resolve3(body.parent) : void 0;
        const name2 = typeof body?.name === "string" ? body.name.trim() : "";
        if (parent === void 0) return { ok: false, error: "parent must be an absolute path" };
        if (name2 === "" || name2 === "." || name2 === ".." || /[/\\]/.test(name2)) {
          return { ok: false, error: "name must be a single path segment" };
        }
        const target = join3(parent, name2);
        await mkdir2(target, { recursive: false });
        return { ok: true, path: target };
      }
    },
    // Host-side directory listing — the browse backend also owns
    // `directoryPicker/list`, so call it the same way `/mkdir` is called:
    // one level, dirs only, with breadcrumbs for the dialog's navigation.
    "/ls": {
      method: "POST",
      async run(req) {
        const body = JSON.parse(await readBody(req) || "{}");
        const home = homedir();
        const path = typeof body?.path === "string" && isAbsolute(body.path) ? resolve3(body.path) : home;
        const dir = await opendir(path);
        const entries = [];
        try {
          for (; ; ) {
            const dirent = await dir.read();
            if (dirent === null) break;
            if (!dirent.isDirectory() && !dirent.isSymbolicLink()) continue;
            entries.push({ name: dirent.name, path: join3(path, dirent.name), hidden: dirent.name.startsWith(".") });
          }
        } finally {
          await dir.close();
        }
        entries.sort((a, b) => a.name.localeCompare(b.name));
        const crumbs = [];
        for (let node = path; ; ) {
          crumbs.unshift({ name: node === "/" ? "" : basename2(node), path: node });
          const parent = dirname2(node);
          if (parent === node) break;
          node = parent;
        }
        return { path, home, crumbs, entries, truncated: false };
      }
    },
    "/transcript": {
      method: "POST",
      async run(req) {
        const { client } = await s3();
        const body = JSON.parse(await readBody(req) || "{}");
        if (typeof body?.workspaceId !== "string" || typeof body?.sessionId !== "string") {
          return { ok: false, error: "workspaceId and sessionId are required" };
        }
        const { meta, events } = await fetchTranscript(client, body.workspaceId, body.sessionId);
        return { ok: true, meta, events };
      }
    },
    // Copy a shared session onto this machine's session tree, with cwd rewritten
    // to the local replica, so the Host can open it like any other session.
    "/materialize": {
      method: "POST",
      async run(req) {
        const { client, identity } = await s3();
        const body = JSON.parse(await readBody(req) || "{}");
        if (typeof body?.workspaceId !== "string" || typeof body?.sessionId !== "string") {
          return { ok: false, error: "workspaceId and sessionId are required" };
        }
        const marker = (await listWorkspaces(client)).find((row) => row.workspaceId === body.workspaceId);
        if (marker === void 0) return { ok: false, error: "shared workspace not found" };
        const me = (await instanceId(ctx)).slice(0, 8);
        const member = Object.values(marker.members ?? {}).find((item) => item?.username === identity.username && String(item.instance ?? "").startsWith(me)) ?? Object.values(marker.members ?? {}).find((item) => item?.username === identity.username);
        const localPath = member?.localPath;
        if (typeof localPath !== "string" || localPath === "") {
          return { ok: false, error: "join this shared workspace before opening its sessions" };
        }
        const landed = await materializeSession(client, dshHome, {
          workspaceId: body.workspaceId,
          sessionId: body.sessionId,
          localPath
        });
        return { ok: true, ...landed };
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
          sendJson(res, 400, { error: messageOf(error) });
        }
      }
    }));
  }
  return disposers;
}
function startBackgroundSync(ctx, config) {
  const dshHome = process.env.DSH_HOME ?? `${homedir()}/.dsh`;
  const syncState = { bySession: /* @__PURE__ */ new Map() };
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const identity = await readIdentity(ctx);
      if (identity?.configured !== true) return;
      const client = createS3(config, identity);
      const me = (await instanceId(ctx)).slice(0, 8);
      await syncAll(client, ctx, identity, dshHome, syncState).catch(() => {
      });
      for (const marker of await listWorkspaces(client)) {
        const member = Object.values(marker.members ?? {}).find((item) => item?.username === identity.username && String(item.instance ?? "").startsWith(me)) ?? Object.values(marker.members ?? {}).find((item) => item?.username === identity.username);
        if (typeof member?.localPath !== "string" || member.localPath === "") continue;
        await pushWorkspace(client, dshHome, marker.workspaceId, member.localPath, `${identity.username}@${me}`).catch(() => {
        });
      }
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => {
    tick().catch(() => {
    });
  }, 3e4);
  timer.unref?.();
  return () => clearInterval(timer);
}

// src/host/entry.js
var name = "nano-shared-workspace";
var inject = ["webServer", "connection", "credentials", "workspaceRegistry"];
var Config = {
  "~standard": {
    version: 1,
    vendor: "dsh-nano-shared-workspace",
    validate(value) {
      const source = value && typeof value === "object" ? value : {};
      const issues = [];
      const text = (key, fallback) => {
        const candidate = source[key];
        if (candidate === void 0) return fallback;
        if (typeof candidate !== "string" || candidate.trim() === "") {
          issues.push({ message: `${key} must be a non-empty string` });
          return fallback;
        }
        return candidate.trim();
      };
      const endpoint = text("endpoint", "https://nano-shared-workspace.saobao.com");
      const bucket = text("bucket", "dsh-shared-workspace");
      const region = text("region", "us-east-1");
      const prefix = source.prefix === void 0 ? "" : source.prefix;
      if (typeof prefix !== "string" || !/^[A-Za-z0-9\-_/]*$/.test(prefix)) {
        issues.push({ message: "prefix must be a simple S3 key prefix" });
      }
      if (issues.length > 0) return { issues };
      return { value: { endpoint, bucket, region, prefix: prefix ?? "" } };
    }
  }
};
function apply(ctx, raw) {
  const resolved = Config["~standard"].validate(raw ?? {});
  if (resolved.issues !== void 0) {
    throw new Error(`nano-shared-workspace: invalid configuration: ${resolved.issues.map((item) => item.message).join("; ")}`);
  }
  const config = resolved.value;
  const routes = createRoutes(ctx, config);
  ctx.effect(() => {
    const disposers = registerRoutes(ctx, routes);
    const stopSync = startBackgroundSync(ctx, config);
    return () => {
      stopSync();
      for (const dispose of disposers) dispose();
    };
  }, "nano-shared-workspace: routes");
}
export {
  Config,
  apply,
  inject,
  name
};
