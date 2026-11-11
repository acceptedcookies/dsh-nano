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

// src/host/s3-sync.js
var LIMITS = { rps: 10, burst: 20, kbps: 512, concurrency: 2 };
var STORE_VERSION = 1;
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
      try {
        switch (op) {
          case "put": {
            if (typeof bodyB64 !== "string") throw new Error("put requires bodyB64");
            const body = Buffer.from(bodyB64, "base64");
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
    if (got?.bodyB64) {
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
