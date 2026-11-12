// src/host/routes.js
import { mkdir as mkdir4, opendir } from "node:fs/promises";
import { homedir as homedir2 } from "node:os";
import { basename as basename2, dirname as dirname2, isAbsolute as isAbsolute3, join as join4, resolve as resolve4 } from "node:path";

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
  if (typeof extra.ifMatch === "string") headers["if-match"] = extra.ifMatch.replace(/^W\//, "");
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
  if (typeof extra.ifMatch === "string") sent["if-match"] = extra.ifMatch.replace(/^W\//, "");
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers: sent,
      body: payload === "" ? void 0 : payload,
      signal: AbortSignal.timeout(12e4)
    });
    const ms = Date.now() - started;
    if (!res.ok || ms > 3e3) {
      console.warn(`[nsw:s3] ${method} ${keyPath} -> HTTP ${res.status} ${ms}ms${payload === "" ? "" : ` ${payload.length}B`}`);
    }
    return res;
  } catch (error) {
    console.warn(`[nsw:s3] ${method} ${keyPath} -> ${error instanceof Error ? error.message : String(error)} ${Date.now() - started}ms`);
    throw error;
  }
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
    /**
     * GET one object; `undefined` when 404.
     * `opts.withMeta: true` returns `{value, etag}` instead of the bare value
     * — the etag is the CAS token `putJson(key, v, {ifMatch: etag})` consumes
     * (P2-04 claim read-modify-write).
     */
    async getJson(key, opts) {
      const res = await request(config, keys, "GET", `${bucketPath(config)}/${key}`);
      if (res.status === 404) return void 0;
      if (!res.ok) throw new Error(`S3 GET ${key} failed: HTTP ${res.status}`);
      const value = await res.json();
      if (opts?.withMeta !== true) return value;
      return { value, etag: res.headers.get("etag")?.replace(/^W\//, "") ?? void 0 };
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
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

// ../packages/dsh-remote-data-schema/src/reject.js
var SchemaReject = class extends Error {
  constructor(reason, detail = "") {
    super(detail ? `${reason}: ${detail}` : String(reason));
    this.name = "SchemaReject";
    this.reason = String(reason);
  }
};
function reject(field2, detail = "") {
  throw new SchemaReject(`schema:${field2}`, detail);
}

// ../packages/dsh-remote-data-schema/src/schema/v1.js
var MAX_FILE_BYTES = 2 * 1024 * 1024;
var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
var MAX_COMMITTED_BYTES = 2 * 1024 * 1024 * 1024;
var PART_BYTES = 64 * 1024;
var MAX_DEPTH = 32;
var SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
var WORKSPACE_ID_RE = /^[A-Za-z0-9]{16}$/;
var MAX_ENTRIES = 1024;
var MAX_TREE_FILES = 4096;
var MAX_STRING = 4096;
var MAX_NAME = 512;
var MAX_TITLE = 1024;
var MAX_PARTS = MAX_COMMITTED_BYTES / PART_BYTES;
var SHA256_RE = /^[0-9a-f]{64}$/;
var FILE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
var INSTANCE_RE = /^[A-Za-z0-9_-]{1,64}$/;
var PROJECT_DIR_RE = /^--[^\n\r]{0,252}--$/;
var IMAGE_MIMES = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
var BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;
var CONTROL_RE = /[\u0000-\u001f\u007f]/;
var WINDOWS_ABS_RE = /^[A-Za-z]:[\\/]/;
var FILE_KEY_RE = /^files\/([A-Za-z0-9_-]{1,128})\.md$/;
var SUPPORTED_KINDS = Object.freeze([
  "manifest",
  "file",
  "image",
  "marker",
  "session-meta",
  "tree-head"
]);
var isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
function assertDepth(value) {
  const stack = [[value, 0]];
  while (stack.length) {
    const [node, depth] = stack.pop();
    if ((isObj(node) || Array.isArray(node)) && node !== null) {
      if (depth + 1 > MAX_DEPTH) reject("depth", `nesting exceeds ${MAX_DEPTH}`);
      for (const child of Object.values(node)) {
        if (child !== null && typeof child === "object") stack.push([child, depth + 1]);
      }
    }
  }
}
function checkKeys(obj, allowed, field2) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) reject(field2, `unknown field "${key}"`);
  }
}
function needString(value, field2, { min = 1, max = MAX_STRING, control = true } = {}) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    reject(field2, `${field2} must be a ${min}..${max} char string`);
  }
  if (control && CONTROL_RE.test(value)) reject(field2, `${field2} contains a control character`);
  return value;
}
function needInt(value, field2, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    reject(field2, `${field2} must be an integer in ${min}..${max}`);
  }
  return value;
}
function needIso(value, field2) {
  const s = needString(value, field2, { min: 1, max: 64 });
  if (Number.isNaN(Date.parse(s))) reject(field2, `${field2} is not a parseable timestamp`);
  return s;
}
function needMemberId(value, field2) {
  const s = needString(value, field2, { min: 3, max: 128 });
  const at = s.lastIndexOf("@");
  if (at <= 0 || at === s.length - 1) reject(field2, `${field2} is not a member id`);
  if (s.includes("..") || s.includes("/") || s.includes("\\")) {
    reject(field2, `${field2} contains a path segment`);
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(s.slice(at + 1))) {
    reject(field2, `${field2} instance suffix has a bad charset`);
  }
  return s;
}
function needLocalPath(value, field2) {
  const s = needString(value, field2, { min: 1, max: MAX_STRING });
  const windows = WINDOWS_ABS_RE.test(s);
  let body;
  if (s.startsWith("/")) body = s.slice(1);
  else if (windows) body = s.slice(3);
  else reject(field2, `${field2} must be an absolute path`);
  if (body === "") return s;
  for (const seg of body.split(s.startsWith("/") ? "/" : /[\\/]/)) {
    if (seg === ".." || seg === ".") reject(field2, `${field2} must not contain "${seg}"`);
    if (seg === "") reject(field2, `${field2} has an empty segment`);
  }
  return s;
}
function needRel(value) {
  const s = needString(value, "rel", { min: 1, max: MAX_STRING });
  if (s.includes("\\")) reject("rel", 'rel must use "/" separators');
  if (s.startsWith("/") || WINDOWS_ABS_RE.test(s) || s.includes(":")) {
    reject("rel", "rel must be a relative path");
  }
  for (const seg of s.split("/")) {
    if (seg === ".." || seg === ".") reject("rel", `rel must not contain "${seg}"`);
    if (seg === "") reject("rel", "rel has an empty segment");
  }
  return s;
}
function needBytes(value, field2, { max = MAX_FILE_BYTES } = {}) {
  let bytes;
  if (typeof value === "string") bytes = Buffer.from(value, "utf8");
  else if (value instanceof Uint8Array || Buffer.isBuffer(value)) bytes = Buffer.from(value);
  else reject(field2, `${field2} must be a string or byte buffer`);
  if (bytes.byteLength > max) reject(field2, `${field2} exceeds ${max} bytes`);
  return bytes;
}
function decodeUtf8(bytes, field2) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    reject(field2, `${field2} is not valid UTF-8`);
  }
}
function strictBase64(text, field2) {
  const s = needString(text, field2, { min: 0, max: Math.ceil((MAX_IMAGE_BYTES + 2) / 3) * 4 });
  if (!BASE64_RE.test(s) || s.length % 4 !== 0) reject(field2, `${field2} is not base64`);
  const bytes = Buffer.from(s, "base64");
  if (s.length > 0 && bytes.toString("base64") !== s) reject(field2, `${field2} is not base64`);
  return bytes;
}
var MANIFEST_KEYS = /* @__PURE__ */ new Set(["schemaVersion", "rev", "updatedAt", "files", "images"]);
var FILE_ENTRY_KEYS = /* @__PURE__ */ new Set(["name", "parentId", "workspaceId", "sha256", "bytes", "updatedAt"]);
var IMAGE_ENTRY_KEYS = /* @__PURE__ */ new Set(["id", "mime", "byteLength"]);
function validateManifestEntry(entry) {
  if (!isObj(entry)) reject("files", "file entry must be an object");
  checkKeys(entry, FILE_ENTRY_KEYS, "files");
  const name2 = needString(entry.name, "name", { min: 1, max: MAX_NAME });
  if (name2.includes("/") || name2.includes("\\")) reject("name", "name must not contain a path separator");
  needString(entry.sha256, "sha256", { min: 64, max: 64 });
  if (!SHA256_RE.test(entry.sha256)) reject("sha256", "sha256 must be 64 lowercase hex");
  for (const field2 of ["parentId", "workspaceId"]) {
    const v = entry[field2];
    if (v === void 0 || v === null) continue;
    if (typeof v !== "string" || !FILE_ID_RE.test(v)) reject(field2, `${field2} must be null or a file id`);
  }
  needInt(entry.bytes, "bytes", { min: 0 });
  needInt(entry.updatedAt, "updatedAt", { min: 0 });
  return entry;
}
function validateImageEntry(entry, sha) {
  if (!isObj(entry)) reject("images", "image entry must be an object");
  checkKeys(entry, IMAGE_ENTRY_KEYS, "images");
  needString(entry.id, "id", { min: 1, max: 128 });
  if (!FILE_ID_RE.test(entry.id)) reject("id", "image id has a bad charset");
  if (!IMAGE_MIMES.has(entry.mime)) reject("mime", `unsupported mime "${entry.mime}"`);
  needInt(entry.byteLength, "byteLength", { min: 0, max: MAX_IMAGE_BYTES });
  void sha;
  return entry;
}
function validateManifest(obj) {
  if (!isObj(obj)) reject("manifest", "manifest must be an object");
  checkKeys(obj, MANIFEST_KEYS, "manifest");
  if (obj.schemaVersion !== void 0 && obj.schemaVersion !== 1) {
    reject("schemaVersion", "schemaVersion must be 1");
  }
  needInt(obj.rev, "rev", { min: 0 });
  needIso(obj.updatedAt, "updatedAt");
  for (const field2 of ["files", "images"]) {
    if (!isObj(obj[field2])) reject(field2, `${field2} must be an object`);
    if (Object.keys(obj[field2]).length > MAX_ENTRIES) reject(field2, `${field2} has too many entries`);
  }
  for (const [id, entry] of Object.entries(obj.files)) {
    if (!FILE_ID_RE.test(id) || id.includes("..")) reject("files", `file id "${id}" has a bad charset`);
    validateManifestEntry(entry);
  }
  for (const [sha, entry] of Object.entries(obj.images)) {
    if (!SHA256_RE.test(sha)) reject("images", `image key "${sha}" is not a sha256`);
    validateImageEntry(entry, sha);
  }
  return { ok: true };
}
function validateFile(obj, ctx) {
  const { key, id, manifest } = ctx ?? {};
  let content = obj;
  let localId = id;
  let localKey = key;
  if (isObj(obj) && !(obj instanceof Uint8Array)) {
    checkKeys(obj, /* @__PURE__ */ new Set(["content", "id", "key"]), "file");
    if (obj.id !== void 0) localId = obj.id;
    if (obj.key !== void 0) localKey = obj.key;
    content = obj.content;
  }
  if (localKey !== void 0) {
    if (typeof localKey !== "string" || localKey.length > 512) reject("key", "key must be a \u2264512 char string");
    const match = FILE_KEY_RE.exec(localKey);
    if (match === null) reject("key", `key "${localKey}" is not files/<id>.md`);
    if (localId !== void 0 && localId !== match[1]) reject("id", "id does not match the key");
    localId = match[1];
  }
  if (localId !== void 0 && (typeof localId !== "string" || !FILE_ID_RE.test(localId) || localId.includes(".."))) {
    reject("id", `file id "${localId}" has a bad charset`);
  }
  if (manifest !== void 0) {
    if (!isObj(manifest.files)) reject("manifest", "manifest has no files index");
    if (localId === void 0 || !Object.hasOwn(manifest.files, localId)) {
      reject("id", "file id is not listed in the manifest");
    }
  }
  const bytes = needBytes(content, "content", { max: MAX_FILE_BYTES });
  decodeUtf8(bytes, "content");
  return { ok: true };
}
var IMAGE_KEYS = /* @__PURE__ */ new Set(["mime", "base64"]);
function validateImage(obj) {
  if (!isObj(obj)) reject("image", "image must be an object");
  checkKeys(obj, IMAGE_KEYS, "image");
  if (!IMAGE_MIMES.has(obj.mime)) reject("mime", `unsupported mime "${obj.mime}"`);
  const bytes = strictBase64(obj.base64, "base64");
  if (bytes.byteLength > MAX_IMAGE_BYTES) reject("base64", `image exceeds ${MAX_IMAGE_BYTES} bytes`);
  return { ok: true };
}
var MARKER_KEYS = /* @__PURE__ */ new Set(["v", "workspaceId", "title", "pathHint", "createdAt", "createdBy", "members"]);
var MEMBER_KEYS = /* @__PURE__ */ new Set(["username", "instance", "localPath", "joinedAt"]);
function validateMarker(obj) {
  if (!isObj(obj)) reject("marker", "marker must be an object");
  checkKeys(obj, MARKER_KEYS, "marker");
  if (obj.v !== 1) reject("v", "marker v must be 1");
  const workspaceId = needString(obj.workspaceId, "workspaceId", { min: 16, max: 16 });
  if (!WORKSPACE_ID_RE.test(workspaceId)) reject("workspaceId", "workspaceId must be 16 alphanumerics");
  needString(obj.title, "title", { min: 0, max: MAX_TITLE });
  needString(obj.pathHint, "pathHint", { min: 0, max: MAX_STRING });
  needIso(obj.createdAt, "createdAt");
  needMemberId(obj.createdBy, "createdBy");
  if (!isObj(obj.members)) reject("members", "members must be an object");
  const ids = Object.keys(obj.members);
  if (ids.length === 0) reject("members", "members must not be empty");
  if (ids.length > MAX_ENTRIES) reject("members", "members has too many entries");
  for (const [memberId, member] of ids.map((id) => [id, obj.members[id]])) {
    needMemberId(memberId, "members");
    if (!isObj(member)) reject("members", `member "${memberId}" must be an object`);
    checkKeys(member, MEMBER_KEYS, "members");
    needString(member.username, "username", { min: 1, max: 128 });
    needString(member.instance, "instance", { min: 1, max: 64 });
    if (!INSTANCE_RE.test(member.instance)) reject("instance", "instance has a bad charset");
    needLocalPath(member.localPath, "localPath");
    needIso(member.joinedAt, "joinedAt");
  }
  return { ok: true };
}
var SESSION_META_KEYS = /* @__PURE__ */ new Set([
  "v",
  "sessionId",
  "writerId",
  "writerName",
  "rev",
  "formatVersion",
  "committedBytes",
  "uncompressedSeqBytes",
  "eventCount",
  "title",
  "projectDir",
  "cwd",
  "createdAt",
  "mtime",
  "deleted",
  "attachmentRefs",
  "parts"
  // optional: writers do not emit it; consumers may pass part sizes
]);
function validatePartSizes(parts, committedBytes) {
  if (!Array.isArray(parts)) reject("parts", "parts must be an array of byte sizes");
  const max = Math.ceil(committedBytes / PART_BYTES);
  if (parts.length > max) reject("parts", `parts exceed ceil(committedBytes/${PART_BYTES})`);
  if (parts.length > MAX_PARTS) reject("parts", "too many parts");
  for (const size of parts) needInt(size, "parts", { min: 0, max: PART_BYTES });
}
function validateSessionMeta(obj, ctx) {
  if (!isObj(obj)) reject("session-meta", "session meta must be an object");
  checkKeys(obj, SESSION_META_KEYS, "session-meta");
  if (obj.v !== 1) reject("v", "session meta v must be 1");
  const sessionId = needString(obj.sessionId, "sessionId", { min: 1, max: 128 });
  if (!SESSION_ID_RE.test(sessionId)) reject("sessionId", "sessionId has a bad charset");
  needMemberId(obj.writerId, "writerId");
  needString(obj.writerName, "writerName", { min: 1, max: 128 });
  needInt(obj.rev, "rev", { min: 0 });
  needInt(obj.formatVersion, "formatVersion", { min: 1, max: 4 });
  needInt(obj.committedBytes, "committedBytes", { min: 0, max: MAX_COMMITTED_BYTES });
  needInt(obj.uncompressedSeqBytes, "uncompressedSeqBytes", { min: 0 });
  needInt(obj.eventCount, "eventCount", { min: 0 });
  needString(obj.title, "title", { min: 0, max: MAX_TITLE });
  const projectDir = needString(obj.projectDir, "projectDir", { min: 2, max: 255 });
  if (!PROJECT_DIR_RE.test(projectDir)) reject("projectDir", "projectDir must be the --slug-- key form");
  needString(obj.cwd, "cwd", { min: 1, max: MAX_STRING });
  needIso(obj.createdAt, "createdAt");
  needIso(obj.mtime, "mtime");
  if (typeof obj.deleted !== "boolean") reject("deleted", "deleted must be a boolean");
  if (!Array.isArray(obj.attachmentRefs)) reject("attachmentRefs", "attachmentRefs must be an array");
  if (obj.attachmentRefs.length > MAX_ENTRIES) reject("attachmentRefs", "too many attachment refs");
  for (const ref of obj.attachmentRefs) {
    if (!isObj(ref) && !(typeof ref === "string" && ref.length <= 512)) {
      reject("attachmentRefs", "attachment ref must be an object or a short string");
    }
  }
  if (obj.parts !== void 0) validatePartSizes(obj.parts, obj.committedBytes);
  if (ctx?.parts !== void 0) validatePartSizes(ctx.parts, obj.committedBytes);
  return { ok: true };
}
var TREE_HEAD_KEYS = /* @__PURE__ */ new Set(["v", "generation", "parent", "writerId", "files", "conflicts", "at"]);
var TREE_FILE_KEYS = /* @__PURE__ */ new Set(["rel", "sha256", "size"]);
function validateTreeHead(obj) {
  if (!isObj(obj)) reject("tree-head", "tree head must be an object");
  checkKeys(obj, TREE_HEAD_KEYS, "tree-head");
  if (obj.v !== 1) reject("v", "tree head v must be 1");
  needInt(obj.generation, "generation", { min: 0 });
  if (obj.parent !== null) needInt(obj.parent, "parent", { min: 0 });
  needMemberId(obj.writerId, "writerId");
  if (!Array.isArray(obj.files)) reject("files", "files must be an array");
  if (obj.files.length > MAX_TREE_FILES) reject("files", "too many files");
  for (const file of obj.files) {
    if (!isObj(file)) reject("files", "file row must be an object");
    checkKeys(file, TREE_FILE_KEYS, "files");
    needRel(file.rel);
    needString(file.sha256, "sha256", { min: 64, max: 64 });
    if (!SHA256_RE.test(file.sha256)) reject("sha256", "sha256 must be 64 lowercase hex");
    needInt(file.size, "size", { min: 0, max: MAX_FILE_BYTES });
  }
  if (!Array.isArray(obj.conflicts)) reject("conflicts", "conflicts must be an array");
  for (const rel of obj.conflicts) needRel(rel);
  needIso(obj.at, "at");
  return { ok: true };
}
var KIND_VALIDATORS = {
  manifest: validateManifest,
  file: validateFile,
  image: validateImage,
  marker: validateMarker,
  "session-meta": validateSessionMeta,
  "tree-head": validateTreeHead
};
function validateV1(kind, obj, ctx) {
  if (!SUPPORTED_KINDS.includes(kind)) {
    throw new SchemaReject("schema:kind", `unknown kind "${kind}"`);
  }
  assertDepth(obj);
  return KIND_VALIDATORS[kind](obj, ctx);
}

// ../packages/dsh-remote-data-schema/src/schema/v0.js
function validateV0(kind, obj) {
  if (!SUPPORTED_KINDS.includes(kind)) {
    throw new SchemaReject("schema:kind", `unknown kind "${kind}"`);
  }
  if (kind !== "manifest") {
    throw new SchemaReject("schema:v", `${kind} does not accept schema version 0`);
  }
  assertDepth(obj);
  return { ok: true, compat: "v0-backfill" };
}

// ../packages/dsh-remote-data-schema/src/index.js
var VALIDATORS = {
  1: validateV1,
  0: validateV0
};
var UNVERSIONED_DEFAULT = { manifest: 0, file: 1, image: 1, marker: 1, "session-meta": 1, "tree-head": 1 };
var V0_KINDS = /* @__PURE__ */ new Set(["manifest"]);
function detectVersion(kind, obj) {
  if (obj && typeof obj === "object") {
    if (typeof obj.schemaVersion === "number") return obj.schemaVersion;
    if (typeof obj.v === "number") return obj.v;
  }
  return UNVERSIONED_DEFAULT[kind] ?? 0;
}
function validate(kind, obj, { v, context } = {}) {
  if (typeof kind !== "string" || !SUPPORTED_KINDS.includes(kind)) {
    throw new SchemaReject("schema:kind", `unknown kind "${kind}"`);
  }
  const version = v ?? detectVersion(kind, obj);
  const run = VALIDATORS[version];
  if (!run) {
    throw new SchemaReject("schema:unknown-version", `${kind} schema version ${version}`);
  }
  if (version === 0 && !V0_KINDS.has(kind)) {
    throw new SchemaReject("schema:v", `${kind} does not accept schema version 0`);
  }
  const result = run(kind, obj, context);
  return { v: version, ...result };
}

// src/host/workspaces.js
var hash16 = (input) => createHash2("sha256").update(input).digest("hex").slice(0, 16);
function parseMarker(row, key) {
  if (row === void 0) return void 0;
  try {
    validate("marker", row);
  } catch (error) {
    if (error instanceof SchemaReject) return void 0;
    throw error;
  }
  if (row.workspaceId !== basename(key, ".json")) return void 0;
  return row;
}
async function readMarker(s3, key) {
  const row = await s3.getJson(key).catch(() => void 0);
  return parseMarker(row, key);
}
async function readMarkerWithMeta(s3, key) {
  const got = await s3.getJson(key, { withMeta: true }).catch(() => void 0);
  return got === void 0 ? void 0 : { marker: parseMarker(got.value, key), etag: got.etag };
}
var MARKER_CAS_ATTEMPTS = 4;
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
var pinHome = () => process.env.DSH_HOME ?? join(homedir(), ".dsh");
var pinPath = (workspaceId) => join(pinHome(), "nsw-pins", `${workspaceId}.json`);
async function pinDir() {
  const dir = join(pinHome(), "nsw-pins");
  await mkdir(dir, { recursive: true });
  return dir;
}
async function pinWorkspaceLocalPath(workspaceId, localPath) {
  if (typeof workspaceId !== "string" || !WORKSPACE_ID_RE.test(workspaceId)) return;
  const file = join(await pinDir(), `${workspaceId}.json`);
  await writeFile(file, JSON.stringify({ workspaceId, localPath, pinnedAt: (/* @__PURE__ */ new Date()).toISOString() }));
}
async function unpinWorkspaceLocalPath(workspaceId) {
  if (typeof workspaceId !== "string" || !WORKSPACE_ID_RE.test(workspaceId)) return;
  await rm(pinPath(workspaceId), { force: true });
}
async function readWorkspacePin(workspaceId) {
  if (typeof workspaceId !== "string" || !WORKSPACE_ID_RE.test(workspaceId)) return void 0;
  try {
    const row = JSON.parse(await readFile(pinPath(workspaceId), "utf8"));
    if (row?.workspaceId !== workspaceId || typeof row?.localPath !== "string" || row.localPath === "") return void 0;
    return row.localPath;
  } catch {
    return void 0;
  }
}
async function trustedMember(marker, identity, me) {
  const own = ownMember(marker, identity, me);
  if (own === void 0) return void 0;
  const pin = await readWorkspacePin(marker.workspaceId);
  if (pin === void 0) return void 0;
  if (own.member.localPath !== pin) {
    console.warn(`[nsw] remote localPath diverges from local pin for ${marker.workspaceId} \u2014 using pinned ${pin} (remote claims ${own.member.localPath})`);
    return { ...own, member: { ...own.member, localPath: pin } };
  }
  return own;
}
function ownMember(marker, identity, me) {
  const memberId = memberKeyOf(identity, me);
  const member = marker?.members?.[memberId];
  if (member === void 0 || member === null || typeof member !== "object") return void 0;
  if (member.instance !== me) return void 0;
  return { memberId, member };
}
async function createWorkspace(s3, ctx, identity, { name: name2, localPath, requestId }) {
  const me = await instanceId(ctx);
  const memberId = memberKeyOf(identity, me);
  const idempotent = typeof requestId === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(requestId);
  const workspaceId = idempotent ? hash16(`${memberId}:${requestId}`) : randomBytes(8).toString("hex");
  const key = `workspaces/${workspaceId}.json`;
  const marker = {
    v: 1,
    workspaceId,
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
  const put = await s3.putJson(key, marker, idempotent ? { ifNoneMatch: "*" } : {});
  if (put?.conflict === true) {
    const existing = await readMarker(s3, key);
    if (existing === void 0 || existing.createdBy !== memberId || existing.title !== name2) {
      throw new Error("workspace id collision; retry with a fresh request");
    }
    await pinWorkspaceLocalPath(workspaceId, existing.members[memberId].localPath ?? localPath);
    return { ...existing, deduplicated: true };
  }
  await pinWorkspaceLocalPath(workspaceId, localPath);
  return marker;
}
async function joinWorkspace(s3, ctx, identity, { workspaceId, localPath }) {
  if (typeof workspaceId !== "string" || !WORKSPACE_ID_RE.test(workspaceId)) {
    throw new SchemaReject("schema:workspaceId", "workspaceId has a bad charset");
  }
  const key = `workspaces/${workspaceId}.json`;
  const me = await instanceId(ctx);
  const memberId = memberKeyOf(identity, me);
  for (let attempt = 0; attempt < MARKER_CAS_ATTEMPTS; attempt += 1) {
    const got = await readMarkerWithMeta(s3, key);
    if (got?.marker === void 0) throw new Error("shared workspace not found");
    if (typeof got.etag !== "string" || got.etag === "") {
      throw new Error("shared workspace has no ETag; refusing an unsafe join");
    }
    const members = { ...got.marker.members ?? {} };
    if (members[memberId] === void 0) {
      members[memberId] = { username: identity.username, instance: me, joinedAt: (/* @__PURE__ */ new Date()).toISOString() };
    }
    members[memberId].localPath = localPath;
    const marker = { ...got.marker, members };
    const put = await s3.putJson(key, marker, { ifMatch: got.etag });
    if (put?.conflict === true) continue;
    await pinWorkspaceLocalPath(workspaceId, localPath);
    return marker;
  }
  throw new Error("another client is updating this workspace; retry the join");
}
async function listWorkspaces(s3) {
  const { keys } = await s3.list("workspaces/");
  const rows = [];
  for (const key of keys) {
    if (!key.endsWith(".json")) continue;
    const row = await readMarker(s3, key);
    if (row !== void 0) rows.push(row);
  }
  return rows;
}
async function matchWorkspace(cwd, markers, { identity, me, legacyCache } = {}) {
  if (identity === void 0 || me === void 0) return null;
  let legacy;
  if (legacyCache !== void 0 && legacyCache.has(cwd)) {
    legacy = legacyCache.get(cwd);
  } else {
    legacy = await workspaceIdFor(cwd);
    legacyCache?.set(cwd, legacy);
  }
  let prefixBest = null;
  for (const marker of markers) {
    const own = await trustedMember(marker, identity, me);
    if (own === void 0) continue;
    if (marker.workspaceId === legacy) return marker;
    const localPath = own.member.localPath;
    if (typeof localPath !== "string" || localPath === "") continue;
    if (cwd === localPath || cwd.startsWith(`${localPath}/`)) {
      const length = localPath.length;
      const bestLength = prefixBest?.__matchLength ?? -1;
      const older = prefixBest === null || String(marker.createdAt ?? "") < String(prefixBest.createdAt ?? "");
      if (length > bestLength || length === bestLength && older) {
        prefixBest = { ...marker, __matchLength: length };
      }
    }
  }
  return prefixBest;
}

// src/host/session-io.js
import { lstat, mkdir as mkdir2, readdir, readFile as readFile2, realpath, stat, writeFile as writeFile2 } from "node:fs/promises";
import { isAbsolute, join as join2, resolve as resolve2, sep } from "node:path";
import { promisify } from "node:util";
import { constants, zstdCompress, zstdDecompress } from "node:zlib";
var zstdCompressAsync = promisify(zstdCompress);
var zstdDecompressAsync = promisify(zstdDecompress);
var zstdFrame = (bytes) => zstdCompressAsync(bytes, { params: { [constants.ZSTD_c_checksumFlag]: 1 } });
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
var sessionDir = (home) => join2(home, "sessions");
var ZSTD_MAGIC = Buffer.from([40, 181, 47, 253]);
function frameOffsets(buf) {
  const offsets = [];
  for (let i = buf.indexOf(ZSTD_MAGIC, 0); i !== -1; i = buf.indexOf(ZSTD_MAGIC, i + 1)) {
    offsets.push(i);
  }
  return offsets;
}
async function decode(buf) {
  try {
    const offsets = frameOffsets(buf);
    if (offsets.length <= 1) return (await zstdDecompressAsync(buf)).toString("utf8");
    const texts = await Promise.all(offsets.map((start, i) => {
      const end = i + 1 < offsets.length ? offsets[i + 1] : buf.length;
      return zstdDecompressAsync(buf.subarray(start, end)).then((part) => part.toString("utf8"));
    }));
    return texts.join("");
  } catch {
    return void 0;
  }
}
async function summarize(buf) {
  const text = await decode(buf);
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
async function listLocalSessions(dshHome) {
  const root = sessionDir(dshHome);
  const out = [];
  let projects = [];
  try {
    projects = await readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const project of projects) {
    if (!project.isDirectory()) continue;
    let sessions = [];
    try {
      sessions = await readdir(join2(root, project.name), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const dir of sessions) {
      if (!dir.isDirectory() || !dir.name.startsWith("session-")) continue;
      const filePath = join2(root, project.name, dir.name, "session.v4.jsonl.zstd");
      try {
        const info = await stat(filePath);
        out.push({
          sessionId: dir.name,
          projectDir: project.name,
          filePath,
          sizeBytes: info.size,
          mtimeMs: info.mtimeMs
        });
      } catch {
      }
    }
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
}
var CLAIM_KEYS = /* @__PURE__ */ new Set(["writerId", "acquiredAt", "expiresAt", "heartbeatRev"]);
function claimExpiryIsSane(expiresAt) {
  return typeof expiresAt === "number" && Number.isFinite(expiresAt) && expiresAt <= Date.now() + CLAIM_TTL_MS * 2;
}
function validClaim(obj) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return false;
  for (const key of Object.keys(obj)) if (!CLAIM_KEYS.has(key)) return false;
  if (typeof obj.writerId !== "string" || obj.writerId === "") return false;
  if (typeof obj.acquiredAt !== "string" || Number.isNaN(Date.parse(obj.acquiredAt))) return false;
  if (!claimExpiryIsSane(obj.expiresAt)) return false;
  if (obj.heartbeatRev !== void 0 && !Number.isInteger(obj.heartbeatRev)) return false;
  return true;
}
async function casPut(s3, key, value, etag) {
  return etag === void 0 ? s3.putJson(key, value, { ifNoneMatch: "*" }) : s3.putJson(key, value, { ifMatch: etag });
}
var CAS_ATTEMPTS = 4;
async function acquireClaim(s3, ctx, sessionId, writerId, heartbeatRev) {
  if (!SESSION_ID_RE.test(sessionId)) throw new SchemaReject("schema:sessionId", "claim sessionId has a bad charset");
  const key = `claims/${sessionId}.json`;
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const got = await s3.getJson(key, { withMeta: true }).catch(() => void 0);
    const existing = validClaim(got?.value) ? got.value : void 0;
    const etag = got?.value === void 0 ? void 0 : got.etag;
    const now = Date.now();
    if (existing !== void 0 && existing.writerId !== writerId && existing.expiresAt > now) {
      return { acquired: false, holder: existing.writerId, heartbeatRev: existing.heartbeatRev ?? 0 };
    }
    if (existing !== void 0 && existing.writerId === writerId && existing.expiresAt > now + CLAIM_TTL_MS / 2) {
      return { acquired: true, heartbeatRev: existing.heartbeatRev ?? heartbeatRev, expiresAt: existing.expiresAt, reused: true };
    }
    const claim = {
      writerId,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: now + CLAIM_TTL_MS,
      heartbeatRev
    };
    const put = await casPut(s3, key, claim, etag);
    if (put?.conflict === true) continue;
    return { acquired: true, heartbeatRev, expiresAt: claim.expiresAt };
  }
  return { acquired: false, holder: null, heartbeatRev };
}
async function renewClaim(s3, sessionId, writerId) {
  if (!SESSION_ID_RE.test(sessionId)) throw new SchemaReject("schema:sessionId", "claim sessionId has a bad charset");
  const key = `claims/${sessionId}.json`;
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const got = await s3.getJson(key, { withMeta: true }).catch(() => void 0);
    const existing = validClaim(got?.value) ? got.value : void 0;
    const now = Date.now();
    if (existing === void 0 || existing.writerId !== writerId || !(existing.expiresAt > now)) {
      return { renewed: false, holder: existing?.writerId ?? null, expiresAt: existing?.expiresAt ?? null };
    }
    const expiresAt = now + CLAIM_TTL_MS;
    const put = await casPut(s3, key, {
      ...existing,
      expiresAt,
      heartbeatRev: (existing.heartbeatRev ?? 0) + 1
    }, got.etag);
    if (put?.conflict === true) continue;
    return { renewed: true, holder: writerId, expiresAt };
  }
  return { renewed: false, holder: writerId, expiresAt: null };
}
async function pushSession(s3, ctx, identity, local, markers, state, legacyCache) {
  if (!SESSION_ID_RE.test(local.sessionId)) return { sessionId: local.sessionId, outcome: "skip:schema:sessionId" };
  const seen = state.bySession.get(local.sessionId);
  if (seen !== void 0 && seen.mtimeMs === local.mtimeMs && seen.size === local.sizeBytes && typeof seen.workspaceId === "string") {
    return { sessionId: local.sessionId, workspaceId: seen.workspaceId, outcome: "unchanged" };
  }
  const me = await instanceId(ctx);
  const writerId = `${identity.username}@${me.slice(0, 8)}`;
  const buf = await readFile2(local.filePath);
  const head = await summarize(buf);
  if (head.cwd === null) return { sessionId: local.sessionId, outcome: "skip:unparsable" };
  const marker = await matchWorkspace(head.cwd, markers, { identity, me, legacyCache });
  if (marker === null) return { sessionId: local.sessionId, outcome: "skip:not-shared" };
  const workspaceId = marker.workspaceId;
  const metaKey = `workspaces/${workspaceId}/sessions/${local.sessionId}/meta.json`;
  const remote = await s3.getJson(metaKey).catch(() => void 0);
  if (remote !== void 0) {
    try {
      validate("session-meta", remote);
    } catch (error) {
      if (error instanceof SchemaReject) return { sessionId: local.sessionId, outcome: `skip:${error.reason}` };
      throw error;
    }
    if (remote.sessionId !== local.sessionId) {
      return { sessionId: local.sessionId, outcome: "skip:schema:sessionId" };
    }
    if (remote.writerId !== writerId) {
      return { sessionId: local.sessionId, outcome: "skip:foreign-writer" };
    }
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
    for (let index = Math.floor(committed / CHUNK); index * CHUNK < buf.length; index += 1) {
      const slice = buf.subarray(index * CHUNK, Math.min((index + 1) * CHUNK, buf.length));
      await s3.putBytes(`workspaces/${workspaceId}/sessions/${local.sessionId}/body/${index}.part`, slice);
      written += slice.length;
    }
  }
  const unchanged = remote !== void 0 && buf.length === remote.committedBytes && (head.events ?? 0) === remote.eventCount && (head.title ?? "") === (remote.title ?? "");
  if (unchanged) {
    tracked.pushedBytes = buf.length;
    tracked.mtimeMs = local.mtimeMs;
    tracked.size = buf.length;
    tracked.workspaceId = workspaceId;
    state.bySession.set(local.sessionId, tracked);
    return { sessionId: local.sessionId, workspaceId, outcome: "unchanged" };
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
  tracked.mtimeMs = local.mtimeMs;
  tracked.size = buf.length;
  tracked.workspaceId = workspaceId;
  state.bySession.set(local.sessionId, tracked);
  return {
    sessionId: local.sessionId,
    outcome: written > 0 ? `pushed:${written}b` : "fresh",
    workspaceId
  };
}
async function syncAll(s3, ctx, identity, dshHome, state, knownMarkers) {
  const markers = knownMarkers ?? await listWorkspaces(s3);
  const results = [];
  const legacyCache = /* @__PURE__ */ new Map();
  for (const local of await listLocalSessions(dshHome)) {
    try {
      results.push(await pushSession(s3, ctx, identity, local, markers, state, legacyCache));
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
    if (!WORKSPACE_ID_RE.test(workspaceId)) continue;
    const inner = await s3.list(`workspaces/${workspaceId}/sessions/`).catch(() => ({ prefixes: [] }));
    for (const sessionPrefix of inner.prefixes ?? []) {
      const sessionId = sessionPrefix.replace(/\/$/, "").split("/").pop();
      if (!SESSION_ID_RE.test(sessionId)) continue;
      const meta = await s3.getJson(`workspaces/${workspaceId}/sessions/${sessionId}/meta.json`).catch(() => void 0);
      if (meta === void 0) continue;
      try {
        validate("session-meta", meta);
      } catch (error) {
        if (error instanceof SchemaReject) continue;
        throw error;
      }
      if (meta.sessionId !== sessionId) continue;
      out.push({ workspaceId, ...meta });
    }
  }
  return out;
}
async function readSessionMeta(s3, workspaceId, sessionId) {
  const meta = await s3.getJson(`workspaces/${workspaceId}/sessions/${sessionId}/meta.json`);
  if (meta === void 0) return void 0;
  validate("session-meta", meta);
  if (meta.sessionId !== sessionId) {
    throw new SchemaReject("schema:sessionId", "meta sessionId does not match its key");
  }
  return meta;
}
async function readBodyParts(s3, workspaceId, sessionId, meta) {
  const parts = Math.ceil(meta.committedBytes / CHUNK);
  const buffers = [];
  for (let index = 0; index < parts; index += 1) {
    const part = await s3.getBytes(`workspaces/${workspaceId}/sessions/${sessionId}/body/${index}.part`);
    if (part === void 0) throw new Error(`missing body part ${index}`);
    if (part.length > PART_BYTES) {
      throw new SchemaReject("schema:parts", `body part ${index} exceeds ${PART_BYTES} bytes`);
    }
    buffers.push(part);
  }
  return Buffer.concat(buffers);
}
async function fetchTranscript(s3, workspaceId, sessionId) {
  if (!WORKSPACE_ID_RE.test(workspaceId)) throw new SchemaReject("schema:workspaceId", "workspaceId has a bad charset");
  if (!SESSION_ID_RE.test(sessionId)) throw new SchemaReject("schema:sessionId", "sessionId has a bad charset");
  const meta = await readSessionMeta(s3, workspaceId, sessionId);
  if (meta === void 0) throw new Error("no such session");
  const text = await decode(await readBodyParts(s3, workspaceId, sessionId, meta));
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
  if (!WORKSPACE_ID_RE.test(workspaceId)) throw new SchemaReject("schema:workspaceId", "workspaceId has a bad charset");
  if (!SESSION_ID_RE.test(sessionId)) throw new SchemaReject("schema:sessionId", "sessionId has a bad charset");
  if (typeof localPath !== "string" || !isAbsolute(localPath) || resolve2(localPath) !== localPath) {
    throw new SchemaReject("schema:localPath", "localPath must be an absolute normalized path");
  }
  const meta = await readSessionMeta(s3, workspaceId, sessionId);
  if (meta === void 0) throw new Error("no such session");
  const text = await decode(await readBodyParts(s3, workspaceId, sessionId, meta));
  if (text === void 0) throw new Error("artifact failed to decode");
  const newline = text.indexOf("\n");
  if (newline < 0) throw new Error("remote artifact has no session header");
  const header = JSON.parse(text.slice(0, newline));
  if (header?.type !== "session" || header.id !== sessionId) throw new Error("remote artifact header does not match the session");
  header.cwd = localPath;
  const headerFrame = await zstdFrame(Buffer.from(`${JSON.stringify(header)}
`));
  const rest = text.slice(newline + 1);
  const body = rest === "" ? Buffer.alloc(0) : await zstdFrame(Buffer.from(rest.endsWith("\n") ? rest : `${rest}
`));
  const sessionsRoot = resolve2(dshHome, "sessions");
  const projectRoot = join2(sessionsRoot, projectKey(localPath));
  const dir = join2(projectRoot, sessionId);
  await mkdir2(dir, { recursive: true });
  let realDir;
  let realRoot;
  try {
    ;
    [realDir, realRoot] = await Promise.all([realpath(dir), realpath(sessionsRoot)]);
  } catch {
    throw new Error("materialize target failed the realpath fence");
  }
  if (!(realDir === realRoot || realDir.startsWith(realRoot + sep)) || (await lstat(dir)).isSymbolicLink()) {
    throw new Error("materialize target escaped the session tree");
  }
  const path = join2(dir, "session.v4.jsonl.zstd");
  try {
    if ((await lstat(path)).isSymbolicLink()) throw new Error("materialize target is a symlink");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await writeFile2(path, Buffer.concat([headerFrame, body]));
  return { sessionId, cwd: localPath, path };
}

// src/host/tree.js
import { createHash as createHash3 } from "node:crypto";
import { lstat as lstat2, mkdir as mkdir3, readFile as readFile3, readdir as readdir2, realpath as realpath2, unlink, writeFile as writeFile3 } from "node:fs/promises";
import { dirname, isAbsolute as isAbsolute2, join as join3, relative, resolve as resolve3, sep as sep2 } from "node:path";
var SKIP = /* @__PURE__ */ new Set([".git", "node_modules", ".nsw", ".ds_store", "imagine"]);
var MAX_FILE = 2 * 1024 * 1024;
var MAX_FILES = 200;
var headKey = (id) => `workspaces/${id}/tree/HEAD.json`;
var genKey = (id, n) => `workspaces/${id}/tree/generations/${n}.json`;
var blobKey = (id, sha) => `workspaces/${id}/tree/blobs/${sha}`;
var sha256 = (buf) => createHash3("sha256").update(buf).digest("hex");
async function replicaRoot(localPath) {
  if (typeof localPath !== "string" || !isAbsolute2(localPath) || resolve3(localPath) !== localPath) {
    throw new SchemaReject("schema:localPath", "localPath must be an absolute normalized path");
  }
  const root = resolve3(localPath);
  try {
    if ((await lstat2(root)).isSymbolicLink()) {
      throw new SchemaReject("schema:localPath", "localPath must not be a symlink");
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir3(root, { recursive: true });
  return realpath2(root);
}
var skippedRel = (rel) => SKIP.has(String(rel).split("/")[0].toLowerCase());
async function inside(root, rel) {
  if (typeof rel !== "string" || rel === "") return void 0;
  try {
    root = await realpath2(root);
  } catch {
    return void 0;
  }
  const dest = resolve3(root, rel);
  if (!dest.startsWith(root + sep2)) return void 0;
  if (skippedRel(rel)) return void 0;
  try {
    if ((await lstat2(dest)).isSymbolicLink()) return void 0;
  } catch (error) {
    if (error?.code !== "ENOENT") return void 0;
  }
  let probe = dirname(dest);
  for (; ; ) {
    let st;
    try {
      st = await lstat2(probe);
    } catch {
      st = void 0;
    }
    if (st !== void 0) {
      if (st.isSymbolicLink() || !st.isDirectory()) return void 0;
      break;
    }
    const parent = dirname(probe);
    if (parent === probe) return void 0;
    probe = parent;
    if (probe !== root && !probe.startsWith(root + sep2)) return void 0;
  }
  try {
    if (await realpath2(probe) !== probe) return void 0;
  } catch {
    return void 0;
  }
  return dest;
}
async function scan(root) {
  const files = [];
  const walk = async (dir) => {
    let names = [];
    try {
      names = await readdir2(dir);
    } catch {
      return;
    }
    for (const name2 of names) {
      if (SKIP.has(name2.toLowerCase()) || files.length >= MAX_FILES) continue;
      const abs = join3(dir, name2);
      let st;
      try {
        st = await lstat2(abs);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) await walk(abs);
      else if (st.isFile() && st.size <= MAX_FILE) {
        const buf = await readFile3(abs);
        files.push({
          rel: relative(root, abs).split("\\").join("/"),
          sha256: sha256(buf),
          size: buf.length
        });
      }
    }
  };
  await walk(root);
  files.sort((a, b) => a.rel.localeCompare(b.rel));
  return files;
}
function byRel(files) {
  return new Map((files ?? []).map((file) => [file.rel, file]));
}
function isText(buf) {
  return !buf.includes(0);
}
async function readRel(root, rel) {
  const dest = await inside(root, rel);
  if (dest === void 0) return void 0;
  try {
    return await readFile3(dest);
  } catch {
    return void 0;
  }
}
async function dissolve(root, parent, remote, local) {
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
    const localBuf = ls !== void 0 ? await readRel(root, rel) : void 0;
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
  return { files, conflicts };
}
async function materializePending(s3, workspaceId, dissolved) {
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
    out.push({ rel: file.rel, sha256: sha256(merged), size: merged.length, buf: merged, writeToReplica: true });
  }
  return out;
}
async function writePending(root, files) {
  for (const file of files) {
    if (file.writeToReplica !== true) continue;
    const dest = await inside(root, file.rel);
    if (dest === void 0) continue;
    await mkdir3(dirname(dest), { recursive: true });
    await writeFile3(dest, file.buf);
  }
}
function basePath(dshHome, workspaceId) {
  return join3(dshHome, "nsw", `${workspaceId}.json`);
}
async function loadBase(dshHome, workspaceId) {
  try {
    return JSON.parse(await readFile3(basePath(dshHome, workspaceId), "utf8"));
  } catch {
    return { generation: 0, files: [] };
  }
}
async function saveBase(dshHome, workspaceId, record) {
  const dest = basePath(dshHome, workspaceId);
  await mkdir3(dirname(dest), { recursive: true });
  await writeFile3(dest, JSON.stringify({ generation: record.generation, files: record.files }));
}
var BLOB_CONCURRENCY = 8;
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (; ; ) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
async function ensureBlobs(s3, workspaceId, root, files, knownShas) {
  const uploads = [];
  for (const file of files) {
    if (knownShas !== void 0 && knownShas.has(file.sha256)) continue;
    const buf = file.buf ?? await readRel(root, file.rel);
    if (buf === void 0) continue;
    uploads.push({ key: blobKey(workspaceId, file.sha256), buf });
  }
  await mapLimit(uploads, BLOB_CONCURRENCY, ({ key, buf }) => s3.putBytes(key, buf));
  return uploads.length;
}
async function pullWorkspace(s3, dshHome, workspaceId, localPath) {
  if (!WORKSPACE_ID_RE.test(workspaceId)) throw new SchemaReject("schema:workspaceId", "workspaceId has a bad charset");
  const head = await s3.getJson(headKey(workspaceId));
  if (head === void 0) return { ok: true, generation: 0, files: 0 };
  const root = await replicaRoot(localPath);
  validate("tree-head", head);
  const base = await loadBase(dshHome, workspaceId);
  const next = new Set((head.files ?? []).map((file) => file.rel));
  for (const old of base.files ?? []) {
    if (next.has(old.rel)) continue;
    const dest = await inside(root, old.rel);
    if (dest === void 0) continue;
    try {
      await unlink(dest);
    } catch {
    }
  }
  const downloads = [];
  for (const file of head.files ?? []) {
    const dest = await inside(root, file.rel);
    if (dest === void 0) continue;
    const have = await readRel(root, file.rel);
    if (have !== void 0 && sha256(have) === file.sha256) continue;
    downloads.push({ dest, key: blobKey(workspaceId, file.sha256) });
  }
  const blobs = await mapLimit(downloads, BLOB_CONCURRENCY, ({ key }) => s3.getBytes(key));
  for (let index = 0; index < downloads.length; index += 1) {
    const blob = blobs[index];
    if (blob === void 0) continue;
    await mkdir3(dirname(downloads[index].dest), { recursive: true });
    await writeFile3(downloads[index].dest, blob);
  }
  await saveBase(dshHome, workspaceId, head);
  return { ok: true, generation: head.generation ?? 0, files: (head.files ?? []).length, conflicts: head.conflicts ?? [] };
}
async function pushWorkspace(s3, dshHome, workspaceId, localPath, writerId, attempt = 0) {
  if (!WORKSPACE_ID_RE.test(workspaceId)) throw new SchemaReject("schema:workspaceId", "workspaceId has a bad charset");
  const root = await replicaRoot(localPath);
  const got = await s3.getJson(headKey(workspaceId), { withMeta: true });
  const head = got?.value;
  if (head !== void 0) {
    validate("tree-head", head);
  }
  const base = await loadBase(dshHome, workspaceId);
  const local = await scan(root);
  const remote = (head?.files ?? []).filter((file) => !skippedRel(file.rel));
  const same = JSON.stringify(local.map(({ rel, sha256: sha, size }) => ({ rel, sha256: sha, size }))) === JSON.stringify(remote.map(({ rel, sha256: sha, size }) => ({ rel, sha256: sha, size })));
  if (same && head !== void 0) return { ok: true, generation: head.generation, files: remote.length, unchanged: true, conflicts: [] };
  let parentFiles = base.files ?? [];
  if (head !== void 0 && base.generation !== head.generation) {
    const parent = head.parent ? await s3.getJson(genKey(workspaceId, head.parent)) : void 0;
    if (parent !== void 0) {
      validate("tree-head", parent);
      parentFiles = parent.files ?? [];
    }
  }
  const dissolved = await dissolve(root, parentFiles, remote, local);
  const files = await materializePending(s3, workspaceId, dissolved);
  const knownShas = /* @__PURE__ */ new Set([
    ...(head?.files ?? []).map((file) => file.sha256),
    ...parentFiles.map((file) => file.sha256)
  ]);
  const uploaded = await ensureBlobs(s3, workspaceId, root, files, knownShas);
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
  const MAX_ATTEMPTS = 3;
  const genPut = await s3.putJson(genKey(workspaceId, generation), record, { ifNoneMatch: "*" });
  if (genPut?.conflict === true) {
    if (attempt >= MAX_ATTEMPTS) throw new Error("tree generation is racing another writer; retry the push");
    return pushWorkspace(s3, dshHome, workspaceId, localPath, writerId, attempt + 1);
  }
  const headPut = await s3.putJson(
    headKey(workspaceId),
    record,
    got?.etag === void 0 ? { ifNoneMatch: "*" } : { ifMatch: got.etag }
  );
  if (headPut?.conflict === true) {
    if (attempt >= MAX_ATTEMPTS) throw new Error("tree HEAD changed during push; retry the push");
    return pushWorkspace(s3, dshHome, workspaceId, localPath, writerId, attempt + 1);
  }
  await writePending(root, files);
  await saveBase(dshHome, workspaceId, record);
  return { ok: true, generation, files: record.files.length, conflicts: dissolved.conflicts, uploaded };
}
async function purgeWorkspaceObjects(s3, workspaceId, { maxDepth = 8, maxKeys = 5e3 } = {}) {
  if (!WORKSPACE_ID_RE.test(workspaceId)) throw new SchemaReject("schema:workspaceId", "workspaceId has a bad charset");
  let deleted = 0;
  let visited = 0;
  const seen = /* @__PURE__ */ new Set();
  const walk = async (prefix, depth) => {
    if (depth > maxDepth || visited >= maxKeys || seen.has(prefix)) return;
    seen.add(prefix);
    const page = await s3.list(prefix).catch(() => void 0);
    if (page === void 0) return;
    for (const key of page.keys ?? []) {
      if (visited >= maxKeys) return;
      visited += 1;
      await s3.del(key).catch(() => {
      });
      deleted += 1;
    }
    for (const child of page.prefixes ?? []) {
      if (child === prefix) continue;
      await walk(child, depth + 1);
    }
  };
  await walk(`workspaces/${workspaceId}/`, 0);
  return { keys: deleted, truncated: visited >= maxKeys };
}
async function registerIdentity(s3, identity) {
  if (typeof identity?.username !== "string" || identity.username === "") return { ok: false };
  const key = `identities/${encodeURIComponent(identity.username)}.json`;
  const existing = await s3.getJson(key);
  if (existing !== void 0) return { ok: true, existed: true };
  await s3.putJson(key, { username: identity.username, claimedAt: (/* @__PURE__ */ new Date()).toISOString() });
  return { ok: true, existed: false };
}

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
  const writeFile4 = async () => {
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
      void writeFile4();
    }, WRITE_INTERVAL_MS);
    if (typeof state.writer?.unref === "function") state.writer.unref();
    try {
      processRef.once?.("beforeExit", () => {
        void writeFile4();
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
    flush: () => writeFile4(),
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
      for (const field2 of ["sensitivity", "capability", "sessionBinding"]) {
        if (spec[field2] !== void 0 && row[field2] !== spec[field2]) {
          throw new RouteGuardError("route-drift", `${spec.path}: ${field2} declares "${spec[field2]}" but the table row has "${row[field2]}"`);
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
var PLUGIN = "dsh-nano-shared-workspace";
var ROUTE_TABLE = [
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/settings",
    "methods": [
      "GET"
    ],
    "sensitivity": "L0",
    "capability": "credential:read",
    "bodyLimit": 0,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:123 \u2014 returns masked identity + deployment config (endpoint/bucket/region), secret masked by mask(); read-only, no plaintext secret."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/settings/test",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "credential:probe",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:130 \u2014 real signed S3 LIST probe using submitted/stored credentials against the configured endpoint; exercises secrets + outbound net."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/settings/update",
    "methods": [
      "PUT"
    ],
    "sensitivity": "L2",
    "capability": "credential:write",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:154 \u2014 writes identity {username,token,accessKey} to the host credentials store (DSH_NSW_IDENTITY/USERNAME refs); page-callable credential write."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/settings/clear",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "credential:write",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:173 \u2014 deletes the stored identity from the credentials store and drops the settings cache; credential mutation."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/status",
    "methods": [
      "GET"
    ],
    "sensitivity": "L0",
    "capability": "read:host",
    "bodyLimit": 0,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:181 \u2014 local sync/status probe (registered identity presence + counters); read-only, no secret plaintext."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/workspaces",
    "methods": [
      "GET"
    ],
    "sensitivity": "L0",
    "capability": "s3:read",
    "bodyLimit": 0,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:194 \u2014 lists workspace markers the member belongs to; read-only S3 marker enumeration, no secret, remote-cross boundary is the data side not the route."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/workspaces/create",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "s3:write",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:210 \u2014 PUTs a new workspace marker to S3 and registers the local replica; signed write + member.localPath handling."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/workspaces/join",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "write:host",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:224 \u2014 accepts a caller-supplied localPath and materializes the remote workspace into it (P0 workspaceId/localPath traversal + arbitrary-fs-write findings); host fs write driven by remote data."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/workspaces/delete",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "s3:write",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "DASW-1112: deletes a workspace marker on S3 after a member check; signed DELETE + local pin removal. Local replica directory is preserved; remote tree/session objects under the id are orphaned."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/sync",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "s3:write",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:238 \u2014 triggers a signed S3 sync cycle (pull + push) using stored identity; outbound net + remote object writes."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/tree/pull",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "write:host",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:263 \u2014 writes the remote file tree (incl. .git/*) into member.localPath on the host (finding remote-member-localPath-arbitrary-fs-write); host fs write from remote data."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/tree/push",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "s3:write",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:278 \u2014 reads the local replica tree and PUTs generations to S3; host fs read + signed outbound write."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/sessions/bind",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "write:host",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:296 \u2014 binds a session to a workspace/localPath and writes binding state; cross-session host write."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/sessions/claim",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "s3:write",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:310 \u2014 acquireClaim writes session meta to S3 (read-modify-write, no CAS = P0 race); signed remote write + session takeover surface."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/sessions/heartbeat",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "s3:write",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:333 \u2014 renews the claim lease + bumps heartbeatRev on the remote session object; signed S3 write."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/sessions/lease",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "s3:write",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:357 \u2014 renewClaim mutates the remote lease/expiresAt for a session; signed S3 write affecting other members' view."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/sessions",
    "methods": [
      "GET"
    ],
    "sensitivity": "L0",
    "capability": "s3:read",
    "bodyLimit": 0,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:375 \u2014 lists remote session records for the member's workspaces; read-only enumeration, no secret plaintext."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/mkdir",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "write:host",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:388 \u2014 creates a directory at any writable absolute host path (finding ls-mkdir-any-absolute-path, accepted); host-level write."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/ls",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "read:host",
    "bodyLimit": 65536,
    "sessionBinding": false,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:406 \u2014 lists directory entries for any absolute host path (same finding, accepted); host-level read/enumeration."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/transcript",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "s3:read",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:433 \u2014 fetchTranscript reads a remote session body and can decompress/fetch it onto the host (remote meta unbounded-fetch finding); remote object ingress + host write."
  },
  {
    "plugin": "dsh-nano-shared-workspace",
    "path": "/nano-shared-workspace/materialize",
    "methods": [
      "POST"
    ],
    "sensitivity": "L2",
    "capability": "write:host",
    "bodyLimit": 65536,
    "sessionBinding": true,
    "justification": "dsh-nano-shared-workspace/src/host/routes.js:447 \u2014 writes a remote session into the local session tree under a caller/sessionId-derived path (materialize-sessionId-path-traversal finding); host fs write from remote data."
  }
];

// src/host/routes.js
var PREFIX = "/nano-shared-workspace";
var badId = (name2) => new Error(`${name2} has an invalid charset`);
var assertWorkspaceId = (value) => {
  if (typeof value !== "string" || !WORKSPACE_ID_RE.test(value)) throw badId("workspaceId");
  return value;
};
var assertSessionId = (value) => {
  if (typeof value !== "string" || !SESSION_ID_RE.test(value)) throw badId("sessionId");
  return value;
};
var assertLocalPath = (value) => {
  if (typeof value !== "string" || !isAbsolute3(value) || resolve4(value) !== value) {
    throw new Error("localPath must be an absolute normalized path");
  }
  return value;
};
var localMember = async (marker, identity, instance) => instance === "" ? void 0 : (await trustedMember(marker, identity, instance))?.member;
function messageOf(error) {
  const raw = error instanceof Error ? error.message : String(error);
  const code = /<Code>([^<]+)<\/Code>/.exec(raw)?.[1];
  const status = /HTTP (\d{3})/.exec(raw)?.[1];
  if (code !== void 0) return `S3 ${status ?? ""} ${code}`.trim();
  const clean = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > 180 ? `${clean.slice(0, 177)}\u2026` : clean;
}
function sendJson2(res, status, body) {
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
var SETTINGS_TTL_MS = 6e4;
function createRoutes(ctx, config) {
  const review = ensurePerfReviewHost().hostJoin("nano-shared-workspace", {
    version: true ? "0.2.0" : void 0,
    // This host bundle's own copy of the library version (A3 / §10.4.4).
    libVersion: LIB_VERSION
  });
  const dshHome = process.env.DSH_HOME ?? `${homedir2()}/.dsh`;
  const syncState = { bySession: /* @__PURE__ */ new Map() };
  let settingsCache;
  let settingsPending;
  let settingsEpoch = 0;
  const dropSettingsCache = () => {
    settingsCache = void 0;
    settingsEpoch += 1;
  };
  const loadSettings = () => {
    const now = Date.now();
    if (settingsCache !== void 0 && now < settingsCache.until) return settingsCache.body;
    if (settingsPending !== void 0 && settingsPending.epoch === settingsEpoch) return settingsPending.promise;
    const epoch = settingsEpoch;
    const promise = (async () => {
      const identity = await readIdentity(ctx);
      let registered = false;
      let probed = true;
      if (identity?.configured === true && identity.username) {
        try {
          const client = createS3(config, identity);
          const row = await client.getJson(`identities/${encodeURIComponent(identity.username)}.json`);
          registered = row !== void 0;
        } catch {
          registered = false;
          probed = false;
        }
      }
      const body = {
        endpoint: config.endpoint,
        bucket: config.bucket,
        registered,
        region: config.region,
        username: identity?.username ?? null,
        configured: identity?.configured === true,
        credentialSource: identity?.source ?? null,
        maskedSecret: mask(identity?.accessKey ?? identity?.token) ?? null
      };
      if (probed && epoch === settingsEpoch) settingsCache = { until: Date.now() + SETTINGS_TTL_MS, body };
      return body;
    })().finally(() => {
      if (settingsPending?.epoch === epoch) settingsPending = void 0;
    });
    settingsPending = { epoch, promise };
    return promise;
  };
  const s3 = async () => {
    const identity = await readIdentity(ctx);
    if (identity?.configured !== true) throw new Error("join identity is not configured");
    return { client: createS3(config, identity), identity };
  };
  return {
    "/settings": {
      method: "GET",
      run() {
        return review.hostSpan("settings", () => loadSettings());
      }
    },
    // Real bucket probe for the staged keys: one signed LIST. Nothing is stored.
    "/settings/test": {
      method: "POST",
      async run(req) {
        const body = JSON.parse(await readBody(req) || "{}");
        const username = field(body?.username);
        const token = field(body?.token);
        const accessKey = field(body?.accessKey);
        const current = await readIdentity(ctx) ?? {};
        const candidate = {
          username: username ?? current.username,
          token: token ?? current.token,
          accessKey: accessKey ?? current.accessKey
        };
        if (candidate.token === void 0) return { ok: false, error: "Access Key and Secret Key are required" };
        if (candidate.username === void 0) return { ok: false, error: "username is required" };
        try {
          const client = createS3(config, candidate);
          await client.list("");
          return { ok: true, bucket: config.bucket, region: config.region };
        } catch (error) {
          return { ok: false, error: messageOf(error) };
        }
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
        dropSettingsCache();
        return { ok: true };
      }
    },
    "/settings/clear": {
      method: "POST",
      async run() {
        await clearIdentity(ctx);
        dropSettingsCache();
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
        return review.hostSpan("workspaces", async () => {
          const identity = await readIdentity(ctx);
          if (identity?.configured !== true) return { workspaces: [] };
          const client = createS3(config, identity);
          await registerIdentity(client, identity).then((result) => {
            if (result?.ok === true && result.existed === false) dropSettingsCache();
          }).catch(() => {
          });
          const rows = await listWorkspaces(client);
          return { workspaces: rows };
        });
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
        assertLocalPath(localPath);
        const requestId = typeof body?.requestId === "string" ? body.requestId : void 0;
        const marker = await createWorkspace(client, ctx, identity, { name: name2, localPath, requestId });
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
        const workspaceId = assertWorkspaceId(body.workspaceId);
        const localPath = assertLocalPath(body.localPath.trim());
        const marker = await joinWorkspace(
          client,
          ctx,
          identity,
          { workspaceId, localPath }
        );
        return { ok: true, workspace: marker };
      }
    },
    // Delete the cloud marker. The local replica directory is left in place;
    // remote tree/session objects under this id are orphaned (documented gap).
    "/workspaces/delete": {
      method: "POST",
      async run(req) {
        const { client, identity } = await s3();
        const body = JSON.parse(await readBody(req) || "{}");
        const workspaceId = assertWorkspaceId(body?.workspaceId);
        const key = `workspaces/${workspaceId}.json`;
        const marker = await readMarker(client, key);
        if (marker === void 0) return { ok: false, error: "shared workspace not found" };
        const isMember = Object.values(marker.members ?? {}).some((member) => member?.username === identity.username);
        if (!isMember) return { ok: false, error: "only members can delete this shared workspace" };
        await client.del(key);
        await unpinWorkspaceLocalPath(workspaceId);
        const purged = await purgeWorkspaceObjects(client, workspaceId).catch(() => void 0);
        return { ok: true, workspaceId, purged: purged ?? null };
      }
    },
    "/sync": {
      method: "POST",
      async run() {
        const { client, identity } = await s3();
        const markers = await listWorkspaces(client);
        const results = await syncAll(client, ctx, identity, dshHome, syncState, markers);
        const instance = await instanceId(ctx);
        const me = instance.slice(0, 8);
        const trees = [];
        for (const marker of markers) {
          const member = await localMember(marker, identity, instance);
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
        if (workspaceId !== "") assertWorkspaceId(workspaceId);
        const marker = (await listWorkspaces(client)).find((row) => row.workspaceId === workspaceId);
        if (marker === void 0) return { ok: false, error: "shared workspace not found" };
        const member = await localMember(marker, identity, await instanceId(ctx));
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
        if (workspaceId !== "") assertWorkspaceId(workspaceId);
        const marker = (await listWorkspaces(client)).find((row) => row.workspaceId === workspaceId);
        if (marker === void 0) return { ok: false, error: "shared workspace not found" };
        const instance = await instanceId(ctx);
        const member = await localMember(marker, identity, instance);
        if (typeof member?.localPath !== "string" || member.localPath === "") return { ok: false, error: "join this shared workspace before syncing files" };
        return pushWorkspace(client, dshHome, workspaceId, member.localPath, `${identity.username}@${instance.slice(0, 8)}`);
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
        assertSessionId(sessionId);
        assertLocalPath(localPath);
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
        assertWorkspaceId(workspaceId);
        assertSessionId(sessionId);
        const marker = (await listWorkspaces(client)).find((row) => row.workspaceId === workspaceId);
        if (marker === void 0) return { ok: false, error: "shared workspace not found" };
        const instance = await instanceId(ctx);
        const member = await localMember(marker, identity, instance);
        if (typeof member?.localPath !== "string" || member.localPath === "") return { ok: false, error: "join this shared workspace before opening its sessions" };
        const claim = await acquireClaim(client, ctx, sessionId, `${identity.username}@${instance.slice(0, 8)}`, 1);
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
        assertSessionId(sessionId);
        if (workspaceId !== "") assertWorkspaceId(workspaceId);
        const instance = await instanceId(ctx);
        const writerId = `${identity.username}@${instance.slice(0, 8)}`;
        const renewed = await renewClaim(client, sessionId, writerId);
        if (renewed.renewed !== true) return { ok: false, busy: true, holder: renewed.holder, expiresAt: renewed.expiresAt };
        let tree = null;
        if (workspaceId !== "") {
          const marker = (await listWorkspaces(client)).find((row) => row.workspaceId === workspaceId);
          const member = await localMember(marker, identity, instance);
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
        assertSessionId(sessionId);
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
        return review.hostSpan("remote-sessions", async () => {
          const { client } = await s3();
          return { sessions: await listRemoteSessions(client) };
        });
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
        const parent = typeof body?.parent === "string" && isAbsolute3(body.parent) ? resolve4(body.parent) : void 0;
        const name2 = typeof body?.name === "string" ? body.name.trim() : "";
        if (parent === void 0) return { ok: false, error: "parent must be an absolute path" };
        if (name2 === "" || name2 === "." || name2 === ".." || /[/\\]/.test(name2)) {
          return { ok: false, error: "name must be a single path segment" };
        }
        const target = join4(parent, name2);
        await mkdir4(target, { recursive: false });
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
        const home = homedir2();
        const path = typeof body?.path === "string" && isAbsolute3(body.path) ? resolve4(body.path) : home;
        const dir = await opendir(path);
        const entries = [];
        try {
          for (; ; ) {
            const dirent = await dir.read();
            if (dirent === null) break;
            if (!dirent.isDirectory() && !dirent.isSymbolicLink()) continue;
            entries.push({ name: dirent.name, path: join4(path, dirent.name), hidden: dirent.name.startsWith(".") });
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
        assertWorkspaceId(body.workspaceId);
        assertSessionId(body.sessionId);
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
        const workspaceId = assertWorkspaceId(body.workspaceId);
        const sessionId = assertSessionId(body.sessionId);
        const marker = (await listWorkspaces(client)).find((row) => row.workspaceId === workspaceId);
        if (marker === void 0) return { ok: false, error: "shared workspace not found" };
        const member = await localMember(marker, identity, await instanceId(ctx));
        const localPath = member?.localPath;
        if (typeof localPath !== "string" || localPath === "") {
          return { ok: false, error: "join this shared workspace before opening its sessions" };
        }
        const landed = await materializeSession(client, dshHome, {
          workspaceId,
          sessionId,
          localPath
        });
        return { ok: true, ...landed };
      }
    }
  };
}
function registerRoutes2(ctx, routes) {
  const specs = Object.entries(routes).map(([suffix, route]) => ({
    path: `${PREFIX}${suffix}`,
    methods: [route.method],
    handler: async (req, res) => {
      const started = Date.now();
      try {
        const body = await route.run(req);
        const ms = Date.now() - started;
        if (ms > 2e3) console.warn(`[nsw:route] ${route.method} ${suffix} -> 200 ${ms}ms`);
        sendJson2(res, 200, body);
      } catch (error) {
        console.error(`[nsw:route] ${route.method} ${suffix} -> 400 ${Date.now() - started}ms :: ${messageOf(error)}`);
        sendJson2(res, 400, { error: messageOf(error) });
      }
    }
  }));
  return registerRoutes(ctx, specs, { table: ROUTE_TABLE, plugin: PLUGIN });
}
function startBackgroundSync(ctx, config) {
  if (config.backgroundSyncMs === 0) return () => {
  };
  const review = ensurePerfReviewHost().hostJoin("nano-shared-workspace", {
    version: true ? "0.2.0" : void 0,
    libVersion: LIB_VERSION
  });
  const dshHome = process.env.DSH_HOME ?? `${homedir2()}/.dsh`;
  const syncState = { bySession: /* @__PURE__ */ new Map() };
  let running = false;
  const tick = () => review.hostSpan("sync-tick", async () => {
    if (running) return;
    running = true;
    try {
      const identity = await readIdentity(ctx);
      if (identity?.configured !== true) return;
      const client = createS3(config, identity);
      const instance = await instanceId(ctx);
      await syncAll(client, ctx, identity, dshHome, syncState).catch(() => {
      });
      for (const marker of await listWorkspaces(client)) {
        const member = await localMember(marker, identity, instance);
        if (typeof member?.localPath !== "string" || member.localPath === "") continue;
        await pushWorkspace(client, dshHome, marker.workspaceId, member.localPath, `${identity.username}@${instance.slice(0, 8)}`).catch(() => {
        });
      }
    } finally {
      running = false;
    }
  });
  const timer = setInterval(() => {
    tick().catch(() => {
    });
  }, config.backgroundSyncMs);
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
      const required = (key) => {
        const candidate = source[key];
        if (typeof candidate !== "string" || candidate.trim() === "") {
          issues.push({ message: `${key} is required` });
          return "";
        }
        return candidate.trim();
      };
      const endpoint = required("endpoint");
      const bucket = required("bucket");
      const region = required("region");
      const prefix = source.prefix === void 0 ? "" : source.prefix;
      if (typeof prefix !== "string" || !/^[A-Za-z0-9\-_/]*$/.test(prefix)) {
        issues.push({ message: "prefix must be a simple S3 key prefix" });
      }
      const rawInterval = source.backgroundSyncMs === void 0 ? 3e4 : source.backgroundSyncMs;
      if (!Number.isInteger(rawInterval) || rawInterval < 0 || rawInterval > 864e5) {
        issues.push({ message: "backgroundSyncMs must be an integer between 0 and 86400000" });
      }
      if (issues.length > 0) return { issues };
      return { value: { endpoint, bucket, region, prefix: prefix ?? "", backgroundSyncMs: rawInterval } };
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
    const disposers = registerRoutes2(ctx, routes);
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
