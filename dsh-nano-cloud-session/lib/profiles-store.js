// src/host/profiles.js
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
var STORE_VERSION = 1;
var STORE_FILE = "nano-cloud-session.json";
var ENV_FILE = "nano-cloud-session.env";
var DEFAULT_BASE_URL = "https://api.devin.ai";
function home() {
  return process.env.DSH_HOME || process.env.HOME || ".";
}
function storePath() {
  return join(home(), STORE_FILE);
}
function envPath() {
  return join(home(), ENV_FILE);
}
function readEnvFile(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
  }
  return out;
}
function seedFromEnv() {
  const file = readEnvFile(envPath());
  const pick = (key) => process.env[key] || file[key] || "";
  const token = pick("DEVIN_API_TOKEN");
  const orgId = pick("DEVIN_ORG_ID");
  const baseUrl = pick("DEVIN_API_BASE") || DEFAULT_BASE_URL;
  if (!token) return { complete: false };
  return { complete: true, token, orgId, baseUrl };
}
function normalizeBaseUrl(value) {
  const raw = String(value ?? "").trim() || DEFAULT_BASE_URL;
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("baseUrl must be a valid URL");
  }
  if (url.protocol !== "https:") throw new Error("baseUrl must be https");
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return (url.origin + url.pathname).replace(/\/+$/, "");
}
function normalizeProfile(input, { existing } = {}) {
  if (!input || typeof input !== "object") throw new Error("profile must be an object");
  const label = String(input.label ?? "").trim();
  if (!label || label.length > 80) throw new Error("label is required (max 80 chars)");
  const orgId = String(input.orgId ?? "").trim();
  if (!/^org-[A-Za-z0-9-]*$/.test(orgId)) throw new Error("orgId must look like org-\u2026");
  const profile = {
    id: existing?.id ?? (String(input.id ?? "").trim() || `dncs-${randomBytes(4).toString("hex")}`),
    label,
    carrier: "devin",
    orgId,
    baseUrl: normalizeBaseUrl(input.baseUrl),
    secret: existing?.secret ?? "",
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now()
  };
  const secret = input.secret !== void 0 ? String(input.secret) : null;
  if (secret !== null && secret !== "") profile.secret = secret;
  if (!profile.secret) throw new Error("token is required");
  return profile;
}
function publicProfile(p, activeId) {
  return {
    id: p.id,
    label: p.label,
    carrier: p.carrier,
    orgId: p.orgId,
    baseUrl: p.baseUrl,
    hasSecret: Boolean(p.secret),
    active: p.id === activeId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
}
function load() {
  if (!existsSync(storePath())) {
    return { version: STORE_VERSION, activeId: null, profiles: [] };
  }
  let data;
  try {
    data = JSON.parse(readFileSync(storePath(), "utf8"));
  } catch {
    throw new Error(`${STORE_FILE} is not valid JSON`);
  }
  if (!data || data.version !== STORE_VERSION || !Array.isArray(data.profiles)) {
    throw new Error(`${STORE_FILE} version/shape mismatch`);
  }
  return data;
}
function save(data) {
  mkdirSync(dirname(storePath()), { recursive: true });
  const tmp = `${storePath()}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 384 });
  renameSync(tmp, storePath());
}
function createProfileStore() {
  let data = load();
  let seeded = false;
  if (data.profiles.length === 0) {
    const seed = seedFromEnv();
    if (seed.complete) {
      const profile = normalizeProfile({ label: "default (env)", orgId: seed.orgId, baseUrl: seed.baseUrl, secret: seed.token });
      data.profiles.push(profile);
      data.activeId = profile.id;
      save(data);
      seeded = true;
    }
  }
  return {
    seededFromEnv: seeded,
    list() {
      return data.profiles.map((p) => publicProfile(p, data.activeId));
    },
    active() {
      return data.profiles.find((p) => p.id === data.activeId) ?? null;
    },
    get(id) {
      return data.profiles.find((p) => p.id === id) ?? null;
    },
    saveProfile(input) {
      const existing = input?.id ? data.profiles.find((p) => p.id === input.id) : null;
      const profile = normalizeProfile(input, { existing });
      const duplicate = data.profiles.find((p) => p.id === profile.id && p !== existing);
      if (duplicate) throw new Error("profile id already exists");
      if (existing) Object.assign(existing, profile);
      else data.profiles.push(profile);
      if (data.profiles.length === 1) data.activeId = profile.id;
      save(data);
      return publicProfile(profile, data.activeId);
    },
    removeProfile(id) {
      const before = data.profiles.length;
      data.profiles = data.profiles.filter((p) => p.id !== id);
      if (data.profiles.length === before) throw new Error("profile not found");
      if (data.activeId === id) data.activeId = data.profiles[0]?.id ?? null;
      save(data);
    },
    activate(id) {
      if (!data.profiles.find((p) => p.id === id)) throw new Error("profile not found");
      data.activeId = id;
      save(data);
    }
  };
}
export {
  createProfileStore
};
