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
  return {
    "/settings": {
      method: "GET",
      async run() {
        const identity = await readIdentity(ctx);
        return {
          endpoint: config.endpoint,
          bucket: config.bucket,
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

// src/host/entry.js
var name = "nano-shared-workspace";
var inject = ["webServer", "connection", "credentials"];
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
    return () => {
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
