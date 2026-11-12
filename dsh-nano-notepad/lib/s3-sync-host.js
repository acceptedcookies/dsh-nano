// src/host/s3-sync.js
import { existsSync, readFileSync as readFileSync2, writeFileSync as writeFileSync2, chmodSync, mkdirSync as mkdirSync2 } from "node:fs";
import { dirname as dirname2, join } from "node:path";

// ../packages/dsh-s3-client/src/sign.js
import { createHmac, createHash } from "node:crypto";
var encoder = new TextEncoder();
function sha256Hex(data) {
  return createHash("sha256").update(data).digest("hex");
}
var EMPTY_PAYLOAD = sha256Hex("");
function uriEncode(input, encodeSlash) {
  let out = "";
  for (const byte of encoder.encode(input)) {
    const c = String.fromCharCode(byte);
    if (/[A-Za-z0-9\-._~]/.test(c) || c === "/" && !encodeSlash) out += c;
    else out += "%" + byte.toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}
function canonicalQuery(params) {
  if (!params) return "";
  return Object.entries(params).flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map((v) => [uriEncode(String(key), true), uriEncode(String(v ?? ""), true)])).sort((a, b) => a[0] === b[0] ? a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0 : a[0] < b[0] ? -1 : 1).map(([k, v]) => `${k}=${v}`).join("&");
}
function hmac(key, data) {
  return createHmac("sha256", key).update(data).digest();
}
function signRequest({ method, path, query, host, headers = {}, payload, region, service, accessKeyId, secretAccessKey, sessionToken, includePayloadHash = true, now = /* @__PURE__ */ new Date() }) {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = payload === void 0 ? EMPTY_PAYLOAD : sha256Hex(payload);
  const signed = /* @__PURE__ */ new Map();
  for (const [name, value] of Object.entries(headers)) signed.set(name.toLowerCase().trim(), String(value).trim());
  signed.set("host", host);
  signed.set("x-amz-date", amzDate);
  if (includePayloadHash) signed.set("x-amz-content-sha256", payloadHash);
  if (sessionToken) signed.set("x-amz-security-token", sessionToken);
  const names = [...signed.keys()].sort();
  const canonicalHeaders = names.map((n) => `${n}:${signed.get(n).replace(/\s+/g, " ")}
`).join("");
  const signedHeaders = names.join(";");
  const canonicalRequest = [
    method.toUpperCase(),
    uriEncode(path.startsWith("/") ? path : `/${path}`, false),
    canonicalQuery(query),
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  const out = {};
  for (const [name, value] of Object.entries(headers)) out[name] = value;
  out["x-amz-date"] = amzDate;
  if (includePayloadHash) out["x-amz-content-sha256"] = payloadHash;
  if (sessionToken) out["x-amz-security-token"] = sessionToken;
  out["authorization"] = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { headers: out, signedHeaders };
}

// ../packages/dsh-s3-client/src/rate.js
function createRateLimiter({ rps = 10, burst, kbps = 512, concurrency = 2 } = {}) {
  const reqCap = burst ?? Math.max(1, Math.round(rps * 2));
  const byteCap = Math.max(1, Math.round(kbps * 1024));
  let reqTokens = reqCap;
  let byteTokens = byteCap;
  let lastRefill = Date.now();
  let inFlight = 0;
  const waiters = [];
  function refill() {
    const now = Date.now();
    const secs = (now - lastRefill) / 1e3;
    if (secs <= 0) return;
    lastRefill = now;
    reqTokens = Math.min(reqCap, reqTokens + secs * rps);
    byteTokens = Math.min(byteCap, byteTokens + secs * byteCap);
  }
  function pump() {
    refill();
    while (waiters.length > 0 && inFlight < concurrency && reqTokens >= 1) {
      reqTokens -= 1;
      inFlight += 1;
      waiters.shift()();
    }
    if (waiters.length > 0 && inFlight < concurrency && reqTokens < 1) {
      const waitMs = Math.max(10, Math.ceil((1 - reqTokens) / rps * 1e3));
      setTimeout(pump, waitMs).unref?.();
    }
  }
  return {
    /** Waits for a request slot. Call `done()` when the request finishes. */
    acquire() {
      return new Promise((resolve) => {
        waiters.push(resolve);
        pump();
      });
    },
    /** Releases one in-flight slot and drains queued waiters. */
    done() {
      inFlight = Math.max(0, inFlight - 1);
      pump();
    },
    /** Charges upload bandwidth; returns ms to wait before sending more. */
    chargeUpload(bytes) {
      refill();
      byteTokens -= bytes;
      if (byteTokens >= 0) return 0;
      return Math.ceil(-byteTokens / byteCap * 1e3);
    },
    /** Snapshot for status reporting. */
    stats() {
      refill();
      return { inFlight, queued: waiters.length, reqTokens: Math.floor(reqTokens), byteTokens: Math.floor(byteTokens) };
    }
  };
}

// ../packages/dsh-s3-client/src/ledger.js
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
var LEDGER_VERSION = 1;
function today(now = /* @__PURE__ */ new Date()) {
  return now.toISOString().slice(0, 10);
}
function thisMonth(now = /* @__PURE__ */ new Date()) {
  return now.toISOString().slice(0, 7);
}
function createLedger(file) {
  let data = { version: LEDGER_VERSION, objects: 0, bytes: 0, ops: {}, dailyUp: {}, monthlyOps: {}, updatedAt: null };
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (parsed && parsed.version === LEDGER_VERSION) data = { ...data, ...parsed };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  let pending = Promise.resolve();
  function persist() {
    data.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const snapshot = JSON.stringify(data, null, 2);
    pending = pending.then(() => {
      mkdirSync(dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, snapshot, { mode: 384 });
      renameSync(tmp, file);
    });
    return pending;
  }
  function bump(map, key, delta = 1) {
    map[key] = (map[key] ?? 0) + delta;
  }
  return {
    /** Record one API op: 'put' | 'get' | 'delete' | 'list' | 'head' | custom. */
    recordOp(op, { bytes = 0, up = false } = {}) {
      bump(data.ops, op);
      bump(data.monthlyOps, `${thisMonth()}:${op}`);
      if (up && bytes > 0) bump(data.dailyUp, today(), bytes);
      return persist();
    },
    /** Reconcile object totals after a LIST (authoritative bucket view). */
    reconcile({ objects, bytes }) {
      data.objects = objects;
      data.bytes = bytes;
      return persist();
    },
    /** Read-only snapshot for /status. */
    snapshot() {
      return {
        objects: data.objects,
        bytes: data.bytes,
        ops: { ...data.ops },
        dailyUpBytes: data.dailyUp[today()] ?? 0,
        monthlyOps: { ...data.monthlyOps },
        updatedAt: data.updatedAt
      };
    },
    file
  };
}

// ../packages/dsh-s3-client/src/client.js
function xmlTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? decodeXml(match[1]) : void 0;
}
function xmlAll(xml, tag) {
  return [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g"))].map((m) => decodeXml(m[1]));
}
function decodeXml(text) {
  return text.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function cleanEtag(value) {
  return typeof value === "string" ? value.replace(/^W\//, "").replaceAll('"', "") : null;
}
var S3Error = class extends Error {
  /** @param {string} op @param {number} status @param {string} body */
  constructor(op, status, body) {
    const code = xmlTag(body, "Code") ?? `HTTP ${status}`;
    const message = xmlTag(body, "Message") ?? body.slice(0, 200);
    super(`s3 ${op} failed: ${code} ${message}`);
    this.name = "S3Error";
    this.op = op;
    this.status = status;
    this.code = code;
  }
};
function createS3Client(config) {
  const {
    endpoint,
    region,
    bucket,
    prefix = "",
    accessKeyId,
    secretAccessKey,
    sessionToken,
    pathStyle = false,
    requestTimeoutMs = 3e4,
    limits = {},
    ledgerFile,
    fetchImpl = globalThis.fetch?.bind(globalThis),
    sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  } = config;
  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("s3 client requires endpoint, region, bucket, accessKeyId, secretAccessKey");
  }
  if (!fetchImpl) throw new Error("s3 client needs a fetch implementation (Node >= 18)");
  const base = endpoint.replace(/\/+$/, "");
  const limiter = createRateLimiter(limits);
  const ledger = ledgerFile ? createLedger(ledgerFile) : null;
  const key = (name) => prefix ? `${prefix.replace(/\/+$/, "")}/${name}` : name;
  function locate(objectKey) {
    if (pathStyle) return { url: `${base}/${bucket}/${objectKey}`, host: new URL(base).host, path: `/${bucket}/${objectKey}` };
    const host = `${bucket}.${new URL(base).host}`;
    return { url: `https://${host}/${objectKey}`, host, path: `/${objectKey}` };
  }
  async function request(op, method, objectKey, { query, headers = {}, body, unsignedOk = [] } = {}) {
    await limiter.acquire();
    try {
      const { url, host, path } = locate(objectKey);
      const signed = signRequest({
        method,
        path,
        query,
        host,
        headers,
        payload: body ?? new Uint8Array(0),
        region,
        service: "s3",
        accessKeyId,
        secretAccessKey,
        sessionToken
      });
      const qs = query ? "?" + Object.entries(query).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map((v2) => `${encodeURIComponent(k)}=${encodeURIComponent(v2 ?? "")}`)).join("&") : "";
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
      let res;
      try {
        res = await fetchImpl(url + qs, { method, headers: { host, ...headers, ...signed.headers }, body, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
      ledger?.recordOp(op, { bytes: body?.byteLength ?? 0, up: method === "PUT" });
      if (res.status >= 300) {
        if (unsignedOk.includes(res.status)) return res;
        throw new S3Error(op, res.status, await res.text().catch(() => ""));
      }
      return res;
    } finally {
      limiter.done();
      if (body?.byteLength) {
        const wait = limiter.chargeUpload(body.byteLength);
        if (wait > 0) await sleep(wait);
      }
    }
  }
  return {
    key,
    limiter,
    ledger,
    /** PUT one object. `ifMatch` carries an ETag for conditional writes (manifest CAS). */
    async putObject(name, body, { contentType = "application/octet-stream", ifMatch, metadata } = {}) {
      const objectKey = key(name);
      const headers = { "content-type": contentType, ...ifMatch ? { "if-match": ifMatch } : {} };
      if (metadata) for (const [k, v] of Object.entries(metadata)) headers[`x-amz-meta-${k}`] = String(v);
      const res = await request("put", "PUT", objectKey, { headers, body });
      return { etag: cleanEtag(res.headers.get("etag")), sha256: sha256Hex(body) };
    },
    /** GET one object; returns null on 404. */
    async getObject(name) {
      const res = await request("get", "GET", key(name), { unsignedOk: [404] });
      if (res.status === 404) return null;
      return { body: new Uint8Array(await res.arrayBuffer()), etag: cleanEtag(res.headers.get("etag")), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
    },
    /** HEAD one object; returns null on 404. */
    async headObject(name) {
      const res = await request("head", "HEAD", key(name), { unsignedOk: [404] });
      if (res.status === 404) return null;
      return { etag: cleanEtag(res.headers.get("etag")), bytes: Number(res.headers.get("content-length") ?? 0), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
    },
    async deleteObject(name) {
      await request("delete", "DELETE", key(name));
    },
    /**
     * ListObjectsV2 under the configured prefix; paginates automatically.
     * @returns {Promise<{objects: Array<{key:string, bytes:number, etag:string, updatedAt:string}>, truncated:boolean}>}
     */
    async listObjects({ maxKeys = 1e3, under } = {}) {
      const objects = [];
      let truncated = false;
      let token;
      do {
        const query = { "list-type": "2", "max-keys": String(maxKeys), prefix: key(under ?? "") };
        if (token) query["continuation-token"] = token;
        const res = await request("list", "GET", "", { query });
        const xml = await res.text();
        for (const block of xmlAll(xml, "Contents")) {
          const raw = xmlTag(block, "Key");
          objects.push({ key: raw, bytes: Number(xmlTag(block, "Size") ?? 0), etag: cleanEtag(xmlTag(block, "ETag")) ?? "", updatedAt: xmlTag(block, "LastModified") ?? "" });
        }
        truncated = xmlTag(xml, "IsTruncated") === "true";
        token = xmlTag(xml, "NextContinuationToken");
      } while (truncated && token);
      return { objects, truncated };
    },
    /** Connectivity probe: write/delete a tiny object. Names are unprefixed —
     *  putObject/deleteObject apply `key()` themselves, so pre-keying here
     *  would double the prefix and leave the probe behind on failure. */
    async test() {
      const t0 = Date.now();
      const probe = `_probe-${t0}.txt`;
      const put = await this.putObject(probe, new TextEncoder().encode("dsh-s3-probe"), { contentType: "text/plain" });
      await this.deleteObject(probe);
      return { ok: true, latencyMs: Date.now() - t0, etag: put.etag };
    },
    /** Status payload for a /status route. */
    status() {
      return { bucket, endpoint, prefix, limits: limiter.stats(), ledger: ledger?.snapshot() ?? null };
    }
  };
}

// ../packages/dsh-remote-data-schema/src/reject.js
var SchemaReject = class extends Error {
  constructor(reason, detail = "") {
    super(detail ? `${reason}: ${detail}` : String(reason));
    this.name = "SchemaReject";
    this.reason = String(reason);
  }
};
function reject(field, detail = "") {
  throw new SchemaReject(`schema:${field}`, detail);
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
function checkKeys(obj, allowed, field) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) reject(field, `unknown field "${key}"`);
  }
}
function needString(value, field, { min = 1, max = MAX_STRING, control = true } = {}) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    reject(field, `${field} must be a ${min}..${max} char string`);
  }
  if (control && CONTROL_RE.test(value)) reject(field, `${field} contains a control character`);
  return value;
}
function needInt(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    reject(field, `${field} must be an integer in ${min}..${max}`);
  }
  return value;
}
function needIso(value, field) {
  const s = needString(value, field, { min: 1, max: 64 });
  if (Number.isNaN(Date.parse(s))) reject(field, `${field} is not a parseable timestamp`);
  return s;
}
function needMemberId(value, field) {
  const s = needString(value, field, { min: 3, max: 128 });
  const at = s.lastIndexOf("@");
  if (at <= 0 || at === s.length - 1) reject(field, `${field} is not a member id`);
  if (s.includes("..") || s.includes("/") || s.includes("\\")) {
    reject(field, `${field} contains a path segment`);
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(s.slice(at + 1))) {
    reject(field, `${field} instance suffix has a bad charset`);
  }
  return s;
}
function needLocalPath(value, field) {
  const s = needString(value, field, { min: 1, max: MAX_STRING });
  const windows = WINDOWS_ABS_RE.test(s);
  let body;
  if (s.startsWith("/")) body = s.slice(1);
  else if (windows) body = s.slice(3);
  else reject(field, `${field} must be an absolute path`);
  if (body === "") return s;
  for (const seg of body.split(s.startsWith("/") ? "/" : /[\\/]/)) {
    if (seg === ".." || seg === ".") reject(field, `${field} must not contain "${seg}"`);
    if (seg === "") reject(field, `${field} has an empty segment`);
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
function needBytes(value, field, { max = MAX_FILE_BYTES } = {}) {
  let bytes;
  if (typeof value === "string") bytes = Buffer.from(value, "utf8");
  else if (value instanceof Uint8Array || Buffer.isBuffer(value)) bytes = Buffer.from(value);
  else reject(field, `${field} must be a string or byte buffer`);
  if (bytes.byteLength > max) reject(field, `${field} exceeds ${max} bytes`);
  return bytes;
}
function decodeUtf8(bytes, field) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    reject(field, `${field} is not valid UTF-8`);
  }
}
function strictBase64(text, field) {
  const s = needString(text, field, { min: 0, max: Math.ceil((MAX_IMAGE_BYTES + 2) / 3) * 4 });
  if (!BASE64_RE.test(s) || s.length % 4 !== 0) reject(field, `${field} is not base64`);
  const bytes = Buffer.from(s, "base64");
  if (s.length > 0 && bytes.toString("base64") !== s) reject(field, `${field} is not base64`);
  return bytes;
}
var MANIFEST_KEYS = /* @__PURE__ */ new Set(["schemaVersion", "rev", "updatedAt", "files", "images"]);
var FILE_ENTRY_KEYS = /* @__PURE__ */ new Set(["name", "parentId", "workspaceId", "sha256", "bytes", "updatedAt"]);
var IMAGE_ENTRY_KEYS = /* @__PURE__ */ new Set(["id", "mime", "byteLength"]);
function validateManifestEntry(entry) {
  if (!isObj(entry)) reject("files", "file entry must be an object");
  checkKeys(entry, FILE_ENTRY_KEYS, "files");
  const name = needString(entry.name, "name", { min: 1, max: MAX_NAME });
  if (name.includes("/") || name.includes("\\")) reject("name", "name must not contain a path separator");
  needString(entry.sha256, "sha256", { min: 64, max: 64 });
  if (!SHA256_RE.test(entry.sha256)) reject("sha256", "sha256 must be 64 lowercase hex");
  for (const field of ["parentId", "workspaceId"]) {
    const v = entry[field];
    if (v === void 0 || v === null) continue;
    if (typeof v !== "string" || !FILE_ID_RE.test(v)) reject(field, `${field} must be null or a file id`);
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
  for (const field of ["files", "images"]) {
    if (!isObj(obj[field])) reject(field, `${field} must be an object`);
    if (Object.keys(obj[field]).length > MAX_ENTRIES) reject(field, `${field} has too many entries`);
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

// src/host/s3-sync.js
var LIMITS = { rps: 10, burst: 20, kbps: 512, concurrency: 2 };
var STORE_VERSION = 1;
var FILE_KEY_SCHEMA_RE = /^files\/([A-Za-z0-9_-]{1,128})\.md$/;
var IMAGE_KEY_SCHEMA_RE = /^images\/([0-9a-f]{64})$/;
function kindOfKey(key) {
  if (key === "manifest.json") return "manifest";
  if (FILE_KEY_SCHEMA_RE.test(key)) return "file";
  if (IMAGE_KEY_SCHEMA_RE.test(key)) return "image";
  return null;
}
function validateRemoteBody(kind, key, body, { v } = {}) {
  let payload = body;
  if (kind === "manifest" || kind === "image") {
    try {
      payload = JSON.parse(Buffer.from(body).toString("utf8"));
    } catch (error) {
      throw new SchemaReject(`schema:${kind}`, `body is not valid JSON: ${messageOf(error)}`);
    }
  }
  validate(kind, payload, { v, context: { key } });
}
function messageOf(value) {
  return value instanceof Error ? value.message : String(value);
}
function parseEnvFile(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    out[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return out;
}
function loadS3Config() {
  let source = process.env;
  let sourceName = "process.env";
  if (!process.env.S3_NOTEPAD_ACCESS_KEY) {
    const file = process.env.DSH_NP_S3_ENV || join(process.env.DSH_HOME || process.env.HOME || ".", "nano-notepad.env");
    if (existsSync(file)) {
      source = parseEnvFile(readFileSync2(file, "utf8"));
      sourceName = file;
    }
  }
  const config = {
    endpoint: source.S3_NOTEPAD_ENDPOINT,
    region: source.S3_NOTEPAD_REGION || "shv1",
    bucket: source.S3_NOTEPAD_BUCKET,
    accessKeyId: source.S3_NOTEPAD_ACCESS_KEY,
    secretAccessKey: source.S3_NOTEPAD_SECRET_KEY,
    prefix: source.S3_NOTEPAD_PREFIX || "notepad/",
    pathStyle: source.S3_NOTEPAD_PATH_STYLE === void 0 ? true : String(source.S3_NOTEPAD_PATH_STYLE) === "true",
    source: sourceName
  };
  config.complete = Boolean(config.endpoint && config.region && config.bucket && config.accessKeyId && config.secretAccessKey);
  return config;
}
function home() {
  return process.env.DSH_HOME || process.env.HOME || ".";
}
function normalizeProfile(input, existing) {
  const source = input && typeof input === "object" ? input : {};
  const str = (key, fallback, max = 256) => {
    const value = source[key] === void 0 ? fallback : String(source[key]).trim();
    if (value.length > max) throw new Error(`${key} is too long`);
    return value;
  };
  const id = str("id", existing?.id || `p-${Date.now().toString(36)}`, 64);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("id may only contain letters, digits, - and _");
  const endpoint = str("endpoint", existing?.endpoint);
  if (endpoint && !/^https?:\/\//i.test(endpoint)) throw new Error("endpoint must start with http:// or https://");
  const bucket = str("bucket", existing?.bucket);
  const secret = source.secretAccessKey ? String(source.secretAccessKey) : existing?.secretAccessKey ?? "";
  return {
    id,
    label: str("label", existing?.label || bucket || "Endpoint", 80) || bucket || "Endpoint",
    endpoint,
    region: str("region", existing?.region || "us-east-1", 64) || "us-east-1",
    bucket,
    prefix: str("prefix", existing?.prefix ?? "", 128),
    pathStyle: source.pathStyle === void 0 ? existing?.pathStyle ?? true : Boolean(source.pathStyle),
    accessKeyId: str("accessKeyId", existing?.accessKeyId),
    secretAccessKey: secret,
    sessionToken: str("sessionToken", existing?.sessionToken ?? "", 2048)
  };
}
function publicProfile(profile, activeId) {
  return {
    id: profile.id,
    label: profile.label,
    endpoint: profile.endpoint,
    region: profile.region,
    bucket: profile.bucket,
    prefix: profile.prefix,
    pathStyle: profile.pathStyle,
    accessKeyId: profile.accessKeyId,
    hasSecret: Boolean(profile.secretAccessKey),
    active: profile.id === activeId
  };
}
function createProfileStore() {
  const file = process.env.DSH_NP_S3_PROFILES || join(home(), "nano-notepad-s3.json");
  let data;
  try {
    data = JSON.parse(readFileSync2(file, "utf8"));
  } catch {
    data = null;
  }
  if (!data || data.version !== STORE_VERSION || !Array.isArray(data.profiles)) {
    const seed = loadS3Config();
    data = {
      version: STORE_VERSION,
      activeId: "env-default",
      profiles: seed.complete ? [normalizeProfile({
        id: "env-default",
        label: "\u9ED8\u8BA4\u7AEF\u70B9",
        endpoint: seed.endpoint,
        region: seed.region,
        bucket: seed.bucket,
        prefix: seed.prefix,
        pathStyle: seed.pathStyle,
        accessKeyId: seed.accessKeyId,
        secretAccessKey: seed.secretAccessKey
      })] : [],
      pending: null
    };
    persist();
  }
  if (data.pending) {
    data.activeId = data.pending.fromId;
    data.pending = null;
    persist();
  }
  function persist() {
    mkdirSync2(dirname2(file), { recursive: true });
    writeFileSync2(file, JSON.stringify(data, null, 2), { mode: 384 });
    try {
      chmodSync(file, 384);
    } catch {
    }
  }
  return {
    file,
    list() {
      return data.profiles.map((p) => publicProfile(p, data.activeId));
    },
    activeId() {
      return data.activeId;
    },
    pending() {
      return data.pending;
    },
    active() {
      return data.profiles.find((p) => p.id === data.activeId) ?? null;
    },
    get(id) {
      return data.profiles.find((p) => p.id === id) ?? null;
    },
    save(input) {
      const existing = input?.id ? data.profiles.find((p) => p.id === input.id) : null;
      const profile = normalizeProfile(input, existing);
      const duplicate = data.profiles.find((p) => p.id === profile.id && p !== existing);
      if (duplicate) throw new Error("profile id already exists");
      if (existing) Object.assign(existing, profile);
      else data.profiles.push(profile);
      if (data.profiles.length === 1) data.activeId = profile.id;
      persist();
      return publicProfile(profile, data.activeId);
    },
    remove(id) {
      if (id === data.activeId) throw new Error("cannot delete the active endpoint");
      const before = data.profiles.length;
      data.profiles = data.profiles.filter((p) => p.id !== id);
      if (data.profiles.length === before) throw new Error("endpoint not found");
      persist();
    },
    beginSwitch(targetId) {
      if (!this.get(targetId)) throw new Error("target endpoint not found");
      data.pending = { fromId: data.activeId, targetId, at: Date.now() };
      data.activeId = targetId;
      persist();
      return data.pending;
    },
    commitSwitch() {
      data.pending = null;
      persist();
    },
    abortSwitch() {
      if (data.pending) data.activeId = data.pending.fromId;
      data.pending = null;
      persist();
    }
  };
}
function buildEngine(profile, ledgerFile) {
  let client = null;
  let lastError = null;
  let lastSuccessAt = null;
  const stats = { put: 0, get: 0, delete: 0, list: 0, head: 0, bytesUp: 0, bytesDown: 0 };
  const config = profile;
  if (profile && profile.endpoint && profile.bucket && profile.accessKeyId && profile.secretAccessKey) {
    try {
      client = createS3Client({
        endpoint: profile.endpoint,
        region: profile.region,
        bucket: profile.bucket,
        prefix: profile.prefix,
        accessKeyId: profile.accessKeyId,
        secretAccessKey: profile.secretAccessKey,
        sessionToken: profile.sessionToken || void 0,
        pathStyle: profile.pathStyle,
        limits: LIMITS,
        ledgerFile
      });
    } catch (error) {
      lastError = messageOf(error);
    }
  }
  function succeed() {
    lastSuccessAt = (/* @__PURE__ */ new Date()).toISOString();
    lastError = null;
  }
  function fail(error) {
    lastError = messageOf(error);
    throw error;
  }
  return {
    get ready() {
      return Boolean(client);
    },
    status() {
      return {
        ok: Boolean(client),
        config: config ? {
          id: config.id,
          label: config.label,
          endpoint: config.endpoint,
          region: config.region,
          bucket: config.bucket,
          prefix: config.prefix,
          pathStyle: config.pathStyle,
          hasSecret: Boolean(config.secretAccessKey)
        } : null,
        limits: client?.limiter.stats() ?? null,
        ledger: client?.ledger?.snapshot() ?? null,
        stats: { ...stats },
        lastError,
        lastSuccessAt
      };
    },
    async test() {
      if (!client) return { ok: false, reason: "not-configured" };
      try {
        const result = await client.test();
        succeed();
        return result;
      } catch (error) {
        return { ok: false, reason: "failed", message: fail(error) };
      }
    },
    async object({ op, key, under, bodyB64, contentType, ifMatch }) {
      if (!client) throw new Error("s3 client is not configured");
      if (op !== "list" && (typeof key !== "string" || key.length > 512 || key.includes(".."))) throw new Error("invalid object key");
      if (under && (typeof under !== "string" || under.length > 512 || under.includes(".."))) throw new Error("invalid under prefix");
      const kind = op === "put" || op === "get" ? kindOfKey(key) : null;
      try {
        switch (op) {
          case "put": {
            if (typeof bodyB64 !== "string") throw new Error("put requires bodyB64");
            const body = Buffer.from(bodyB64, "base64");
            if (kind) validateRemoteBody(kind, key, body, { v: 1 });
            const out = await client.putObject(key, body, { contentType, ifMatch });
            stats.put += 1;
            stats.bytesUp += body.length;
            succeed();
            return out;
          }
          case "get": {
            const got = await client.getObject(key);
            stats.get += 1;
            if (!got) {
              succeed();
              return null;
            }
            stats.bytesDown += got.body.byteLength;
            if (kind) validateRemoteBody(kind, key, got.body);
            succeed();
            return { bodyB64: Buffer.from(got.body).toString("base64"), etag: got.etag, contentType: got.contentType };
          }
          case "head": {
            const head = await client.headObject(key);
            stats.head += 1;
            succeed();
            return head;
          }
          case "delete": {
            await client.deleteObject(key);
            stats.delete += 1;
            succeed();
            return { ok: true };
          }
          case "list": {
            const out = await client.listObjects(under ? { under } : {});
            stats.list += 1;
            if (!under) void client.ledger?.reconcile({
              objects: out.objects.length,
              bytes: out.objects.reduce((sum, item) => sum + item.bytes, 0)
            });
            succeed();
            return out;
          }
          default:
            throw new Error(`unknown s3 op: ${op}`);
        }
      } catch (error) {
        if (error instanceof SchemaReject) {
          lastError = error.message;
          return { ok: false, reason: error.reason };
        }
        fail(error);
      }
    }
  };
}
async function probeProfile(profile) {
  if (!profile || !profile.endpoint || !profile.accessKeyId || !profile.secretAccessKey) {
    return { ok: false, reason: "incomplete", message: "endpoint / access key / secret are required" };
  }
  const probe = buildEngine(profile, void 0);
  try {
    const tested = await probe.test();
    if (!tested.ok) return { ok: false, reason: "unreachable", message: tested.message || "connectivity probe failed" };
    const got = await probe.object({ op: "get", key: "manifest.json" });
    let manifest = null;
    if (got?.ok === false) {
      manifest = { rev: 0, updatedAt: null, files: [], images: 0, corrupt: true, reason: got.reason };
    } else if (got?.bodyB64) {
      try {
        const parsed = JSON.parse(Buffer.from(got.bodyB64, "base64").toString("utf8"));
        manifest = {
          rev: parsed.rev ?? 0,
          updatedAt: parsed.updatedAt ?? null,
          files: Object.entries(parsed.files ?? {}).map(([id, entry]) => ({
            id,
            name: entry.name ?? "",
            sha256: entry.sha256 ?? "",
            bytes: entry.bytes ?? 0
          })),
          images: Object.keys(parsed.images ?? {}).length
        };
      } catch {
        manifest = { rev: 0, updatedAt: null, files: [], images: 0, corrupt: true };
      }
    }
    return { ok: true, latencyMs: tested.latencyMs, bucket: profile.bucket, manifest };
  } catch (error) {
    return { ok: false, reason: "failed", message: messageOf(error) };
  }
}
function createSyncEngine() {
  const store = createProfileStore();
  const ledgerFile = join(home(), "nano-notepad-s3-ledger.json");
  let engine = buildEngine(store.active(), ledgerFile);
  function rebuild() {
    engine = buildEngine(store.active(), ledgerFile);
  }
  return {
    get ready() {
      return engine.ready;
    },
    status() {
      return { ...engine.status(), activeId: store.activeId(), pending: store.pending(), profiles: store.list() };
    },
    test() {
      return engine.test();
    },
    object(body) {
      return engine.object(body);
    },
    /** All /s3/config actions. Secrets are write-only and never returned. */
    async config(payload) {
      const action = String(payload?.action ?? "");
      switch (action) {
        case "list":
          return { ok: true, profiles: store.list(), activeId: store.activeId(), pending: store.pending() };
        case "save": {
          const saved = store.save(payload.profile);
          if (saved.active) rebuild();
          return { ok: true, profile: saved, profiles: store.list(), activeId: store.activeId() };
        }
        case "delete":
          store.remove(String(payload.id ?? ""));
          return { ok: true, profiles: store.list(), activeId: store.activeId() };
        case "probe":
          return probeProfile(store.get(String(payload.id ?? "")));
        case "testOne":
          return probeProfile(store.get(String(payload.id ?? "")));
        case "beginSwitch": {
          const pending = store.beginSwitch(String(payload.id ?? ""));
          rebuild();
          return { ok: true, pending, activeId: store.activeId() };
        }
        case "commitSwitch":
          store.commitSwitch();
          return { ok: true, activeId: store.activeId(), pending: null };
        case "abortSwitch":
          store.abortSwitch();
          rebuild();
          return { ok: true, activeId: store.activeId(), pending: null };
        default:
          throw new Error(`unknown s3 config action: ${action}`);
      }
    }
  };
}
export {
  createProfileStore,
  createSyncEngine,
  loadS3Config
};
