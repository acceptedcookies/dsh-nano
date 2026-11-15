// src/host/pipeline.js
import { readFileSync } from "node:fs";
import { join } from "node:path";

// src/host/pipeline-s3.js
import { createHash, createHmac } from "node:crypto";
var UA = "dsh-nano-notepad/0.1.0 spike";
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
  for (const [name, value] of Object.entries(params)) {
    if (value !== void 0) url.searchParams.set(name, value);
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

// src/host/pipeline-claim.js
var CLAIM_TTL_MS = 9e4;
var CAS_ATTEMPTS = 4;
var CLAIM_KEYS = /* @__PURE__ */ new Set(["writerId", "acquiredAt", "expiresAt", "heartbeatRev"]);
var SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
function validClaim(obj) {
  if (obj === null || typeof obj !== "object") return false;
  for (const key of Object.keys(obj)) if (!CLAIM_KEYS.has(key)) return false;
  if (typeof obj.writerId !== "string" || obj.writerId === "") return false;
  if (typeof obj.acquiredAt !== "string") return false;
  if (typeof obj.expiresAt !== "number" || !Number.isFinite(obj.expiresAt)) return false;
  if (obj.heartbeatRev !== void 0 && !Number.isInteger(obj.heartbeatRev)) return false;
  return true;
}
async function casPut(s3, key, value, etag) {
  return etag === void 0 ? s3.putJson(key, value, { ifNoneMatch: "*" }) : s3.putJson(key, value, { ifMatch: etag });
}
async function acquireClaim(s3, key, writerId, heartbeatRev = 0) {
  if (!SESSION_ID_RE.test(key)) {
    return { acquired: false, reason: "schema:badKey", key };
  }
  const claimKey = `claims/${key}.json`;
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const got = await s3.getJson(claimKey, { withMeta: true });
    const existing = validClaim(got?.value) ? got.value : void 0;
    const etag = got?.value === void 0 ? void 0 : got.etag;
    const now = Date.now();
    if (existing !== void 0 && existing.writerId !== writerId && existing.expiresAt > now) {
      return { acquired: false, holder: existing.writerId, heartbeatRev: existing.heartbeatRev ?? 0, key };
    }
    const claim = {
      writerId,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: now + CLAIM_TTL_MS,
      heartbeatRev
    };
    const put = await casPut(s3, claimKey, claim, etag);
    if (put?.conflict === true) continue;
    return { acquired: true, heartbeatRev, expiresAt: claim.expiresAt, key };
  }
  return { acquired: false, holder: null, heartbeatRev, raced: true, key };
}
async function renewClaim(s3, key, writerId) {
  if (!SESSION_ID_RE.test(key)) return { renewed: false, reason: "schema:badKey", key };
  const claimKey = `claims/${key}.json`;
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const got = await s3.getJson(claimKey, { withMeta: true });
    const existing = validClaim(got?.value) ? got.value : void 0;
    const now = Date.now();
    if (existing === void 0 || existing.writerId !== writerId || !(existing.expiresAt > now)) {
      return { renewed: false, holder: existing?.writerId ?? null, expiresAt: existing?.expiresAt ?? null, key };
    }
    const expiresAt = now + CLAIM_TTL_MS;
    const put = await casPut(s3, claimKey, {
      ...existing,
      expiresAt,
      heartbeatRev: (existing.heartbeatRev ?? 0) + 1
    }, got.etag);
    if (put?.conflict === true) continue;
    return { renewed: true, holder: writerId, expiresAt, key };
  }
  return { renewed: false, holder: writerId, expiresAt: null, raced: true, key };
}
async function readClaim(s3, key) {
  const got = await s3.getJson(`claims/${key}.json`, { withMeta: true });
  return got === void 0 ? void 0 : { value: got.value, etag: got.etag };
}
async function releaseClaim(s3, key) {
  await s3.del(`claims/${key}.json`);
}

// src/host/pipeline.js
var DEFAULT_PREFIX = "pipeline";
function messageOf(value) {
  return value instanceof Error ? value.message : String(value);
}
function parseEnvFile(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}
function notepadEnvTarget() {
  let source = process.env;
  if (!source.S3_NOTEPAD_ACCESS_KEY && !source.S3_NOTEPAD_TOKEN) {
    try {
      const file = join(process.env.DSH_HOME || process.env.HOME || ".", "nano-notepad.env");
      source = parseEnvFile(readFileSync(file, "utf8"));
    } catch {
      return null;
    }
  }
  const endpoint = source.S3_NOTEPAD_ENDPOINT;
  const bucket = source.S3_NOTEPAD_BUCKET;
  const token = source.S3_NOTEPAD_TOKEN;
  const accessKey = source.S3_NOTEPAD_ACCESS_KEY;
  const secretKey = source.S3_NOTEPAD_SECRET_KEY;
  if (!endpoint || !bucket || !token && !accessKey) return null;
  const identity = accessKey ? { accessKey, token: secretKey } : { token };
  return {
    config: {
      endpoint,
      region: source.S3_NOTEPAD_REGION || "shv1",
      bucket,
      prefix: source.S3_NOTEPAD_PIPELINE_PREFIX || DEFAULT_PREFIX
    },
    identity
  };
}
async function s3Target(ctx, override) {
  if (ctx && ctx._s3ForTest) return ctx._s3ForTest;
  if (override && typeof override === "object") {
    const { endpoint, region = "shv1", bucket, prefix = DEFAULT_PREFIX, token, accessKey } = override;
    if (!endpoint || !bucket || !token && !accessKey) throw new Error("target requires endpoint/bucket + token or accessKey");
    const identity = accessKey ? { accessKey, token } : { token };
    return createS3({ endpoint, region, bucket, prefix }, identity);
  }
  const env = notepadEnvTarget();
  if (env) return createS3(env.config, env.identity);
  const credentials = ctx.get("credentials");
  if (credentials) {
    const resolved = await credentials.resolve("DSH_NP_PIPELINE_IDENTITY");
    if (resolved !== void 0) {
      const raw = typeof resolved === "object" && "value" in resolved ? resolved.value : resolved;
      const identity = typeof raw === "string" ? JSON.parse(raw) : raw;
      return createS3({ endpoint: "https://nano-notepad.saobao.com", region: "shv1", bucket: "dsh-nano-notepad-test", prefix: DEFAULT_PREFIX }, identity);
    }
  }
  throw new Error("pipeline s3 is not configured (S3_NOTEPAD_* / DSH_NP_PIPELINE_IDENTITY)");
}
function sendJson(res, code, body) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
async function readJsonBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (limit !== void 0 && size > limit) throw new Error("request body too large");
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}
function pipelineS3Handler(ctx) {
  return async (req, res, route) => {
    try {
      const body = await readJsonBody(req, route?.bodyLimit);
      const s3 = await s3Target(ctx, body.target);
      const op = String(body.op ?? "");
      const key = typeof body.key === "string" ? body.key : void 0;
      const out = {};
      switch (op) {
        case "put": {
          if (key === void 0) throw new Error("put requires key");
          const extra = {};
          if (typeof body.ifMatch === "string") extra.ifMatch = body.ifMatch;
          if (typeof body.ifNoneMatch === "string") extra.ifNoneMatch = body.ifNoneMatch;
          if (body.bodyB64 !== void 0) {
            out.result = await s3.putBytes(key, Buffer.from(body.bodyB64, "base64"), extra);
          } else {
            out.result = await s3.putJson(key, body.body ?? {}, extra);
          }
          break;
        }
        case "get": {
          if (key === void 0) throw new Error("get requires key");
          if (body.format === "bytes") {
            const bytes = await s3.getBytes(key);
            out.result = bytes === void 0 ? null : { bodyB64: bytes.toString("base64") };
          } else {
            const meta = body.withMeta === true;
            const value = await s3.getJson(key, { withMeta: meta });
            out.result = value === void 0 ? null : value;
          }
          break;
        }
        case "del": {
          if (key === void 0) throw new Error("del requires key");
          await s3.del(key);
          out.result = { ok: true };
          break;
        }
        case "list": {
          out.result = await s3.list(String(body.under ?? ""));
          break;
        }
        case "head": {
          if (key === void 0) throw new Error("head requires key");
          const got = await s3.getJson(key, { withMeta: true });
          out.result = got === void 0 ? null : { etag: got.etag };
          break;
        }
        default:
          throw new Error(`unknown pipeline op: ${op}`);
      }
      sendJson(res, 200, { ok: true, ...out });
    } catch (error) {
      sendJson(res, 500, { ok: false, reason: "failed", message: messageOf(error).slice(0, 200) });
    }
  };
}
var RPC_METHODS = /* @__PURE__ */ new Set(["manifest.get", "corpus.list", "corpus.read", "claim.read"]);
var RPC_READ_KEYS = /^(kb-|art-|sqlite\/|claims\/|corpus-manifest|pipeline-manifest)[A-Za-z0-9._/-]*$/;
function pipelineRpcHandler(ctx) {
  return async (req, res, route) => {
    try {
      const body = await readJsonBody(req, route?.bodyLimit);
      const method = String(body.method ?? "");
      const params = body.params && typeof body.params === "object" ? body.params : {};
      if (!RPC_METHODS.has(method)) {
        sendJson(res, 200, { ok: false, reason: "unknown-method", method });
        return;
      }
      const s3 = await s3Target(ctx, body.target);
      let result;
      switch (method) {
        case "manifest.get": {
          const got = await s3.getJson("sqlite/manifest.json", { withMeta: true });
          result = got === void 0 ? null : { value: got.value, etag: got.etag };
          break;
        }
        case "corpus.list": {
          const under = typeof params.under === "string" ? params.under : "";
          result = await s3.list(under).catch((error) => /HTTP 404|NoSuchKey/.test(messageOf(error)) ? [] : Promise.reject(error));
          break;
        }
        case "corpus.read": {
          const key = String(params.key ?? "");
          if (!RPC_READ_KEYS.test(key)) {
            result = { denied: `key outside read allowlist: ${key}` };
            break;
          }
          if (params.format === "bytes") {
            const bytes = await s3.getBytes(key);
            result = bytes === void 0 ? null : { key, bodyB64: bytes.toString("base64") };
          } else {
            const meta = params.withMeta === true;
            result = await s3.getJson(key, { withMeta: meta }) ?? null;
          }
          break;
        }
        case "claim.read": {
          const key = String(params.key ?? "");
          if (!SESSION_ID_RE_RPC.test(key)) {
            result = { denied: "schema:badKey" };
            break;
          }
          result = await readClaim(s3, key) ?? null;
          break;
        }
      }
      sendJson(res, 200, { ok: true, result });
    } catch (error) {
      sendJson(res, 500, { ok: false, reason: "failed", message: messageOf(error).slice(0, 200) });
    }
  };
}
var SESSION_ID_RE_RPC = /^[A-Za-z0-9_-]{1,128}$/;
function pipelineClaimHandler(ctx) {
  return async (req, res, route) => {
    try {
      const body = await readJsonBody(req, route?.bodyLimit);
      const s3 = await s3Target(ctx, body.target);
      const op = String(body.op ?? "");
      const key = String(body.key ?? "");
      const writerId = String(body.writerId ?? "notepad-fx");
      let result;
      switch (op) {
        case "acquire":
          result = await acquireClaim(s3, key, writerId);
          break;
        case "renew":
          result = await renewClaim(s3, key, writerId);
          break;
        case "read":
          result = await readClaim(s3, key);
          break;
        case "release":
          result = await releaseClaim(s3, key, writerId);
          break;
        default:
          throw new Error(`unknown claim op: ${op}`);
      }
      sendJson(res, 200, { ok: true, result });
    } catch (error) {
      sendJson(res, 500, { ok: false, reason: "failed", message: messageOf(error).slice(0, 200) });
    }
  };
}
export {
  pipelineClaimHandler,
  pipelineRpcHandler,
  pipelineS3Handler
};
