// src/host/profiles.js
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";

// src/contracts/codec-util.js
function omitUndefined(object) {
  const out = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== void 0) out[key] = value;
  }
  return out;
}

// src/providers/devin/profile-codec.js
var PROVIDER_KEY = "devin";
var DEFAULT_BASE_URL = "https://api.devin.ai";
var ProfileCodecError = class extends Error {
  constructor(message, reason = "invalid-request") {
    super(message);
    this.name = "ProfileCodecError";
    this.reason = reason;
    this.status = 422;
  }
};
function originOf(baseUrl) {
  let url;
  try {
    url = new URL(String(baseUrl ?? ""));
  } catch {
    throw new ProfileCodecError("baseUrl must be a valid URL");
  }
  return url.origin;
}
function normalizeBaseUrl(value) {
  const raw = String(value ?? "").trim() || DEFAULT_BASE_URL;
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new ProfileCodecError("baseUrl must be a valid URL");
  }
  if (url.protocol !== "https:") throw new ProfileCodecError("baseUrl must be https");
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return (url.origin + url.pathname).replace(/\/+$/, "");
}
function decodeProfileSave(input, { existing } = {}) {
  if (!input || typeof input !== "object") throw new ProfileCodecError("profile must be an object");
  const label = String(input.label ?? "").trim();
  if (!label || label.length > 80) throw new ProfileCodecError("label is required (max 80 chars)");
  const orgId = String(input.orgId ?? "").trim();
  if (!/^org-[A-Za-z0-9-]*$/.test(orgId)) throw new ProfileCodecError("orgId must look like org-\u2026");
  const baseUrl = normalizeBaseUrl(input.baseUrl ?? existing?.baseUrl);
  const next = {
    id: existing?.id ?? (String(input.id ?? "").trim() || null),
    label,
    carrier: "devin",
    providerKey: PROVIDER_KEY,
    orgId,
    baseUrl,
    secret: existing?.secret ?? "",
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now()
  };
  const originChanged = existing?.baseUrl ? originOf(existing.baseUrl) !== originOf(baseUrl) : false;
  const secret = input.secret !== void 0 ? String(input.secret) : null;
  if (originChanged && (secret === null || secret === "")) {
    throw new ProfileCodecError("changing baseUrl origin requires rebinding the token");
  }
  if (secret !== null && secret !== "") {
    if (!/^cog_[A-Za-z0-9_-]{8,}$/.test(secret)) {
      throw new ProfileCodecError("token must look like cog_\u2026 (Devin PAT or service user key)");
    }
    next.secret = secret;
  }
  if (!next.secret) throw new ProfileCodecError("token is required");
  return next;
}
function publicProfile(profile, activeId) {
  return omitUndefined({
    id: profile.id,
    label: profile.label,
    carrier: profile.carrier,
    providerKey: PROVIDER_KEY,
    orgId: profile.orgId,
    baseUrl: profile.baseUrl,
    hasSecret: Boolean(profile.secret),
    active: profile.id === activeId,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  });
}

// src/host/profiles.js
var STORE_VERSION = 1;
var STORE_FILE = "nano-cloud-session.json";
var ENV_FILE = "nano-cloud-session.env";
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
function load() {
  if (!existsSync(storePath())) {
    return { version: STORE_VERSION, activeId: null, profiles: [], configEpoch: 0, profileEpochs: {} };
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
  if (!Number.isInteger(data.configEpoch)) data.configEpoch = 0;
  if (!data.profileEpochs || typeof data.profileEpochs !== "object") data.profileEpochs = {};
  return data;
}
function save(data) {
  mkdirSync(dirname(storePath()), { recursive: true });
  const tmp = `${storePath()}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 384 });
  renameSync(tmp, storePath());
}
function createProfileStore({ onEpoch } = {}) {
  let data = load();
  let seeded = false;
  data.profileEpochs = data.profileEpochs ?? {};
  const bump = (profileId) => {
    data.configEpoch = (data.configEpoch ?? 0) + 1;
    if (profileId) data.profileEpochs[profileId] = data.configEpoch;
    onEpoch?.(data.configEpoch, profileId);
  };
  if (data.profiles.length === 0) {
    const seed = seedFromEnv();
    if (seed.complete) {
      const profile = decodeProfileSave({ label: "default (env)", orgId: seed.orgId, baseUrl: seed.baseUrl, secret: seed.token });
      profile.id = `dncs-${randomBytes(4).toString("hex")}`;
      data.profiles.push(Object.freeze({ ...profile }));
      data.activeId = profile.id;
      save(data);
      seeded = true;
    }
  }
  return {
    seededFromEnv: seeded,
    configEpoch: () => data.configEpoch ?? 0,
    profileEpoch: (id) => data.profileEpochs?.[id] ?? 0,
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
      let profile;
      try {
        profile = decodeProfileSave(input, { existing });
      } catch (error) {
        if (error instanceof ProfileCodecError) throw error;
        throw error;
      }
      if (!profile.id) profile.id = `dncs-${randomBytes(4).toString("hex")}`;
      const duplicate = data.profiles.find((p) => p.id === profile.id && p !== existing);
      if (duplicate) throw new Error("profile id already exists");
      const frozen = Object.freeze({ ...profile });
      if (existing) {
        data.profiles = data.profiles.map((p) => p === existing ? frozen : p);
      } else {
        data.profiles = [...data.profiles, frozen];
      }
      if (data.profiles.length === 1) data.activeId = frozen.id;
      bump(frozen.id);
      save(data);
      return publicProfile(frozen, data.activeId);
    },
    removeProfile(id) {
      const before = data.profiles.length;
      data.profiles = data.profiles.filter((p) => p.id !== id);
      if (data.profiles.length === before) throw new Error("profile not found");
      if (data.activeId === id) data.activeId = data.profiles[0]?.id ?? null;
      bump(id);
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
  DEFAULT_BASE_URL,
  createProfileStore,
  envPath,
  storePath
};
