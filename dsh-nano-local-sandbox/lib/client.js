window.__ModuleLoader__.load({
	id: "dsh-nano-local-sandbox",
	factory: (require) => {
var __dnlsClient = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/client/managed.js
  var managed_exports = {};
  __export(managed_exports, {
    CONTRACT_HEADER: () => CONTRACT_HEADER,
    CONTRACT_META: () => CONTRACT_META,
    CONTRACT_VERSION: () => CONTRACT_VERSION,
    createDnlsClient: () => createDnlsClient,
    createTicket: () => createTicket
  });
  function refuse(code, message) {
    const error = new Error(message);
    error.errorId = `dnls.client.${code}`;
    error.restricted = true;
    throw error;
  }
  function createTicket() {
    let seq = 0;
    let alive = true;
    return {
      take() {
        seq += 1;
        const mine = seq;
        return () => alive && seq === mine;
      },
      kill() {
        alive = false;
        seq += 1;
      }
    };
  }
  function createDnlsClient({ fetch: impl, origin } = {}) {
    const doFetch = impl ?? globalThis.fetch?.bind(globalThis);
    if (typeof doFetch !== "function") throw new Error("dnls client requires fetch");
    const base = new URL(origin ?? globalThis.location?.origin);
    if (!base.origin || base.origin === "null") throw new Error("dnls client requires an origin");
    let contract = null;
    const announced = (capabilityId) => {
      if (!contract) refuse("discovery", "contract discovery has not run");
      if (!contract.capabilities.includes(capabilityId)) {
        refuse("capability", `${capabilityId} is not announced`);
      }
    };
    async function request(path, { method = "GET", query, body, signal, sandboxId, envelope = "dnls" } = {}) {
      if (!path.startsWith(PREFIX) || path.includes("..")) refuse("path", `unexpected path ${path}`);
      const url = new URL(path, base);
      if (url.origin !== base.origin) refuse("origin", "requests stay on the pane origin");
      for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== void 0 && value !== null) url.searchParams.set(key, String(value));
      }
      const res = await doFetch(url.href, {
        method,
        credentials: "same-origin",
        redirect: "error",
        headers: {
          [CONTRACT_HEADER]: CONTRACT_VERSION,
          accept: "application/json",
          ...body !== void 0 ? { "content-type": "application/json" } : {}
        },
        body: body === void 0 ? void 0 : JSON.stringify(body),
        signal
      });
      const parsed = await res.json().catch(() => null);
      if (!res.ok) {
        const error = new Error(parsed?.error ?? `request failed (${res.status})`);
        error.errorId = parsed?.errorId ?? "dnls.client.http";
        error.status = res.status;
        throw error;
      }
      if (parsed === null || typeof parsed !== "object") refuse("shape", "malformed response body");
      if (envelope === "jsonrpc") return parsed;
      if (res.headers.get(CONTRACT_HEADER) !== CONTRACT_VERSION) refuse("contract", "response contract header mismatch");
      if (parsed.contractVersion !== CONTRACT_VERSION) refuse("contract", "response contract mismatch");
      if (sandboxId && parsed.sandboxId !== sandboxId) {
        refuse("target", "response names a different sandbox");
      }
      if (parsed.ok === false) {
        const error = new Error(parsed.error ?? "request failed");
        error.errorId = parsed.errorId ?? "dnls.client.refused";
        throw error;
      }
      return parsed;
    }
    async function mcpCall(name, args, { signal } = {}) {
      announced("sandbox.profile.list");
      const parsed = await request(`${PREFIX}mcp`, {
        method: "POST",
        body: {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name,
            arguments: args,
            _meta: { [CONTRACT_META]: CONTRACT_VERSION }
          }
        },
        signal,
        envelope: "jsonrpc"
      });
      if (parsed?.jsonrpc !== "2.0" || parsed.id !== 1) refuse("mcp", "invalid jsonrpc envelope");
      const result = parsed?.result;
      if (!result || typeof result !== "object" || result.isError === true) {
        refuse("mcp", "profile list refused");
      }
      if (result.structuredContent?.contractVersion !== CONTRACT_VERSION) {
        refuse("contract", "response contract mismatch");
      }
      return result.structuredContent ?? {};
    }
    return {
      /** The only request that runs before discovery; resets announced caps. */
      async discover({ signal } = {}) {
        contract = null;
        const res = await doFetch(new URL(CONTRACT_PATH, base).href, {
          method: "GET",
          credentials: "same-origin",
          redirect: "error",
          headers: { accept: "application/json" },
          signal
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || res.headers.get(CONTRACT_HEADER) !== CONTRACT_VERSION || body?.contractVersion !== CONTRACT_VERSION || !Array.isArray(body.capabilities)) {
          refuse("contract", "unknown control contract");
        }
        contract = { capabilities: body.capabilities };
        return contract;
      },
      capabilities: () => contract ? [...contract.capabilities] : null,
      /** Flat `sandbox.list` payload: `{envs, rows, total, complete}`. */
      async listSandboxes({ signal } = {}) {
        const cap = PATH_CAPS.get(`${PREFIX}sandboxes`);
        announced(cap);
        const body = await request(`${PREFIX}sandboxes`, { signal });
        if (!Array.isArray(body.rows)) refuse("shape", "invalid sandbox list");
        return { envs: body.envs, rows: body.rows, total: body.total, complete: body.complete };
      },
      async inspect(sandboxId, { window: usageWindow = "24h", signal } = {}) {
        assertSandboxId(sandboxId);
        announced(PATH_CAPS.get(`${PREFIX}inspect`));
        if (!INSPECT_WINDOWS.has(usageWindow)) refuse("params", "unknown usage window");
        return request(`${PREFIX}inspect`, {
          query: { sandboxId, window: usageWindow },
          signal,
          sandboxId
        });
      },
      async processes(sandboxId, { limit, signal } = {}) {
        assertSandboxId(sandboxId);
        announced(PATH_CAPS.get(`${PREFIX}processes`));
        return request(`${PREFIX}processes`, {
          query: { sandboxId, ...Number.isInteger(limit) ? { limit } : {} },
          signal,
          sandboxId
        });
      },
      /** Object lifecycle POST. `create` is target-none: it must not carry a selector. */
      async lifecycle({ action, sandboxId, name, profileId, requestId, signal } = {}) {
        announced(PATH_CAPS.get(`${PREFIX}lifecycle`));
        if (typeof requestId !== "string" || requestId.length === 0) refuse("params", "requestId required");
        const body = { action, requestId };
        const query = {};
        if (action === "create") {
          if (sandboxId !== void 0) refuse("target", "create never carries a selector");
          if (typeof name !== "string" || name.length === 0) refuse("params", "name required");
          body.name = name;
          if (profileId !== void 0) body.profileId = profileId;
        } else {
          assertSandboxId(sandboxId);
          query.sandboxId = sandboxId;
        }
        const answer = await request(`${PREFIX}lifecycle`, { method: "POST", query, body, signal, sandboxId });
        if (typeof answer.operationId !== "string" || answer.operationId.length === 0) {
          refuse("receipt", "missing operation receipt");
        }
        if (action === "create" && !SANDBOX_ID.test(answer.sandboxId ?? "")) {
          refuse("receipt", "create answered without a valid sandboxId");
        }
        return answer;
      },
      /** Exact operation read by sandboxId + operationId on the paired route. */
      async readOperation(sandboxId, operationId, { signal } = {}) {
        assertSandboxId(sandboxId);
        if (typeof operationId !== "string" || operationId.length === 0) {
          refuse("params", "operationId required");
        }
        announced(PATH_CAPS.get(`${PREFIX}operations`));
        const answer = await request(`${PREFIX}operations`, {
          query: { sandboxId, operationId },
          signal,
          sandboxId
        });
        if (answer.operationId !== operationId) refuse("target", "response names a different operation");
        return answer;
      },
      /** Authorized profiles via the `sandbox.profile.list` MCP tool. */
      async listProfiles({ signal } = {}) {
        const out = await mcpCall("sandbox.profile.list", {}, { signal });
        if (!Array.isArray(out.profiles)) refuse("shape", "invalid profile list");
        return out.profiles;
      }
    };
  }
  var CONTRACT_VERSION, CONTRACT_HEADER, CONTRACT_META, PREFIX, CONTRACT_PATH, SANDBOX_ID, INSPECT_WINDOWS, PATH_CAPS, assertSandboxId;
  var init_managed = __esm({
    "src/client/managed.js"() {
      CONTRACT_VERSION = "dnls.control/1";
      CONTRACT_HEADER = "x-dnls-contract";
      CONTRACT_META = "dnls/contract";
      PREFIX = "/nano-local-sandbox/";
      CONTRACT_PATH = `${PREFIX}contract`;
      SANDBOX_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      INSPECT_WINDOWS = /* @__PURE__ */ new Set(["24h", "7d", "30d"]);
      PATH_CAPS = /* @__PURE__ */ new Map([
        [`${PREFIX}sandboxes`, "sandbox.list"],
        [`${PREFIX}inspect`, "sandbox.inspect"],
        [`${PREFIX}processes`, "sandbox.processes"],
        [`${PREFIX}lifecycle`, "sandbox.lifecycle"],
        [`${PREFIX}operations`, "sandbox.operations"]
      ]);
      assertSandboxId = (sandboxId) => {
        if (typeof sandboxId !== "string" || !SANDBOX_ID.test(sandboxId)) {
          refuse("target", "a sandboxId uuid is required");
        }
      };
    }
  });

  // src/client/i18n.js
  var i18n_exports = {};
  __export(i18n_exports, {
    copyFor: () => copyFor,
    fill: () => fill
  });
  function copyFor(language) {
    return language === "zh" ? ZH : EN;
  }
  function fill(template, params) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => String(params?.[key] ?? ""));
  }
  var EN, ZH;
  var init_i18n = __esm({
    "src/client/i18n.js"() {
      EN = {
        typeLabel: "Sandboxes",
        typeDescription: "Managed local sandboxes: overview and lifecycle control.",
        overview: "Overview",
        control: "Control",
        loading: "Loading\u2026",
        refresh: "Refresh",
        failed: "Request failed",
        empty: "No managed sandboxes are visible to this session.",
        pick: "Select a sandbox to control it",
        sandboxPick: "Pick a sandbox\u2026",
        create: "Create sandbox",
        createName: "Name",
        createProfile: "Profile",
        createSubmit: "Create",
        creating: "Creating\u2026",
        noProfiles: "No installable profiles were listed.",
        fieldName: "Name",
        fieldProfile: "Profile",
        fieldEnv: "Environment",
        fieldState: "Observed state",
        fieldRevision: "Revision",
        fieldServices: "Services",
        fieldPorts: "Host ports",
        fieldNone: "\u2014",
        processes: "Show processes",
        processesHide: "Hide processes",
        processesEmpty: "No guest processes reported.",
        start: "Start",
        stop: "Stop",
        restart: "Restart",
        confirmTitle: "Confirm {action}",
        confirmBody: "Run {action} on sandbox {name}?",
        confirmGo: "Confirm",
        cancel: "Cancel",
        opAccepted: "Operation accepted",
        opState: "Operation {operationId}: {state}",
        opRecheck: "Recheck operation",
        opPending: "pending \u2014 press recheck; the request is never resent automatically",
        sessionRequired: "This pane needs a mounted session.",
        listShort: "{shown}/{total} visible",
        health: "Health",
        observedAt: "Observed at",
        desiredRev: "desired",
        appliedRev: "applied",
        fieldGeneration: "Generation",
        usageStates: "States",
        usageMemory: "Memory",
        usageCpu: "CPU",
        stateRunning: "running",
        stateStopped: "stopped",
        stateFailed: "failed",
        stateMissing: "missing",
        expected: "expected",
        valid: "valid",
        mean: "mean",
        peak: "peak",
        profileNotReady: "not ready"
      };
      ZH = {
        typeLabel: "\u6C99\u7BB1",
        typeDescription: "\u6258\u7BA1\u672C\u5730\u6C99\u7BB1\uFF1A\u603B\u89C8\u4E0E\u751F\u547D\u5468\u671F\u63A7\u5236\u3002",
        overview: "\u603B\u89C8",
        control: "\u63A7\u5236",
        loading: "\u52A0\u8F7D\u4E2D\u2026",
        refresh: "\u5237\u65B0",
        failed: "\u8BF7\u6C42\u5931\u8D25",
        empty: "\u5F53\u524D\u4F1A\u8BDD\u770B\u4E0D\u5230\u4EFB\u4F55\u6258\u7BA1\u6C99\u7BB1\u3002",
        pick: "\u9009\u62E9\u4E00\u4E2A\u6C99\u7BB1\u540E\u8FDB\u884C\u63A7\u5236",
        sandboxPick: "\u9009\u62E9\u6C99\u7BB1\u2026",
        create: "\u521B\u5EFA\u6C99\u7BB1",
        createName: "\u540D\u79F0",
        createProfile: "Profile",
        createSubmit: "\u521B\u5EFA",
        creating: "\u521B\u5EFA\u4E2D\u2026",
        noProfiles: "\u6CA1\u6709\u5217\u51FA\u53EF\u5B89\u88C5\u7684 profile\u3002",
        fieldName: "\u540D\u79F0",
        fieldProfile: "Profile",
        fieldEnv: "\u73AF\u5883",
        fieldState: "\u89C2\u6D4B\u72B6\u6001",
        fieldRevision: "\u4FEE\u8BA2",
        fieldServices: "\u670D\u52A1",
        fieldPorts: "\u5BBF\u4E3B\u673A\u7AEF\u53E3",
        fieldNone: "\u2014",
        processes: "\u67E5\u770B\u8FDB\u7A0B",
        processesHide: "\u6536\u8D77\u8FDB\u7A0B",
        processesEmpty: "\u6CA1\u6709\u6765\u5BBE\u8FDB\u7A0B\u8BB0\u5F55\u3002",
        start: "\u542F\u52A8",
        stop: "\u505C\u6B62",
        restart: "\u91CD\u542F",
        confirmTitle: "\u786E\u8BA4{action}",
        confirmBody: "\u5BF9\u6C99\u7BB1 {name} \u6267\u884C {action}\uFF1F",
        confirmGo: "\u786E\u8BA4",
        cancel: "\u53D6\u6D88",
        opAccepted: "\u64CD\u4F5C\u5DF2\u53D7\u7406",
        opState: "\u64CD\u4F5C {operationId}\uFF1A{state}",
        opRecheck: "\u91CD\u67E5\u64CD\u4F5C",
        opPending: "\u5904\u7406\u4E2D\u2014\u2014\u8BF7\u70B9\u91CD\u67E5\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u91CD\u53D1\u8BF7\u6C42",
        sessionRequired: "\u6B64\u9762\u677F\u9700\u8981\u4E00\u4E2A\u5DF2\u6302\u8F7D\u7684\u4F1A\u8BDD\u3002",
        listShort: "\u53EF\u89C1 {shown}/{total}",
        health: "\u5065\u5EB7\u5EA6",
        observedAt: "\u89C2\u6D4B\u65F6\u95F4",
        desiredRev: "\u671F\u671B",
        appliedRev: "\u5DF2\u5E94\u7528",
        fieldGeneration: "\u4E16\u4EE3",
        usageStates: "\u72B6\u6001\u5206\u5E03",
        usageMemory: "\u5185\u5B58",
        usageCpu: "CPU",
        stateRunning: "\u8FD0\u884C",
        stateStopped: "\u505C\u6B62",
        stateFailed: "\u5931\u8D25",
        stateMissing: "\u7F3A\u5931",
        expected: "\u5E94\u6709",
        valid: "\u6709\u6548",
        mean: "\u5747\u503C",
        peak: "\u5CF0\u503C",
        profileNotReady: "\u672A\u5C31\u7EEA"
      };
    }
  });

  // src/client/format.js
  var format_exports = {};
  __export(format_exports, {
    DASH: () => DASH,
    formatBytes: () => formatBytes,
    formatCores: () => formatCores,
    serviceAddress: () => serviceAddress,
    serviceLine: () => serviceLine,
    serviceSummary: () => serviceSummary
  });
  function formatBytes(value) {
    if (value === null || value === void 0 || !Number.isFinite(value)) return null;
    if (value >= 1 << 30) return `${(value / (1 << 30)).toFixed(1)} GiB`;
    if (value >= 1 << 20) return `${(value / (1 << 20)).toFixed(1)} MiB`;
    return `${Math.round(value / 1024)} KiB`;
  }
  function formatCores(value) {
    if (value === null || value === void 0 || !Number.isFinite(value)) return null;
    return `${Number(value).toFixed(3)} cores`;
  }
  function serviceAddress(service) {
    if (service?.published !== true) return null;
    if (typeof service.hostAddress !== "string" || service.hostAddress === "") return null;
    if (!Number.isInteger(service.hostPort)) return null;
    return `${service.hostAddress}:${service.hostPort}`;
  }
  function serviceLine(service) {
    if (!service || typeof service.serviceId !== "string") return null;
    const head = `${service.serviceId}:${service.containerPort}${service.protocol ? ` ${service.protocol}` : ""}`;
    const addr = serviceAddress(service);
    return [head, addr ? `\u2192 ${addr}` : null, service.health ?? null].filter(Boolean).join(" ");
  }
  function serviceSummary(services) {
    if (!Array.isArray(services)) return "";
    return services.map((entry) => typeof entry === "string" ? entry : entry?.serviceId).filter((id) => typeof id === "string" && id.length > 0).join(", ");
  }
  var DASH;
  var init_format = __esm({
    "src/client/format.js"() {
      DASH = "\u2014";
    }
  });

  // src/client/index.jsx
  var index_exports = {};
  __export(index_exports, {
    apply: () => apply,
    inject: () => inject
  });
  var React = __require("react");
  var primitives = __require("@deepseek-ai/dsh-client-ui-primitives");
  var { createDnlsClient: createDnlsClient2, createTicket: createTicket2 } = (init_managed(), __toCommonJS(managed_exports));
  var { copyFor: copyFor2, fill: fill2 } = (init_i18n(), __toCommonJS(i18n_exports));
  var { formatBytes: formatBytes2, formatCores: formatCores2, serviceLine: serviceLine2, serviceSummary: serviceSummary2 } = (init_format(), __toCommonJS(format_exports));
  var h = React.createElement;
  var KIND = "dnls-sandbox";
  var box = {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 12,
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflowWrap: "anywhere",
    color: "var(--dsw-alias-label-primary)",
    font: "var(--dsw-font-xxs-12)"
  };
  var row = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", minWidth: 0 };
  var field = { display: "grid", gridTemplateColumns: "minmax(0,110px) minmax(0,1fr)", gap: "2px 10px" };
  var muted = { color: "var(--dsw-alias-label-tertiary)" };
  var card = { border: ".5px solid var(--dsw-alias-border-l2)", borderRadius: 6, padding: 8, minWidth: 0 };
  var errorStyle = { color: "var(--dsw-alias-status-error)" };
  function Field({ label, value }) {
    return h(
      "div",
      { style: field },
      h("span", { style: muted }, label),
      h("span", null, value ?? "\u2014")
    );
  }
  function ConfirmBar({ copy, action, name, busy, onConfirm, onCancel }) {
    return h(
      "div",
      { style: { ...row, ...card } },
      h(
        "span",
        { style: { flex: 1, minWidth: 0 } },
        fill2(copy.confirmBody, { action: copy[action] ?? action, name })
      ),
      h(primitives.Button, { variant: "primary", size: "sm", disabled: busy, onClick: onConfirm }, copy.confirmGo),
      h(primitives.Button, { variant: "ghost", size: "sm", disabled: busy, onClick: onCancel }, copy.cancel)
    );
  }
  function ServiceLine({ service }) {
    return h("div", null, serviceLine2(service));
  }
  function DnlsPane({ sessionId, copy }) {
    const [view, setView] = React.useState("overview");
    const [phase, setPhase] = React.useState("loading");
    const [error, setError] = React.useState(null);
    const [rows, setRows] = React.useState(null);
    const [total, setTotal] = React.useState(null);
    const [selection, setSelection] = React.useState(null);
    const [detail, setDetail] = React.useState(null);
    const [usageWindow, setUsageWindow] = React.useState("24h");
    const [procs, setProcs] = React.useState(null);
    const [procsBusy, setProcsBusy] = React.useState(false);
    const [pendingAction, setPendingAction] = React.useState(null);
    const [receipt, setReceipt] = React.useState(null);
    const [opBody, setOpBody] = React.useState(null);
    const [busy, setBusy] = React.useState(false);
    const [createOpen, setCreateOpen] = React.useState(false);
    const [profiles, setProfiles] = React.useState(null);
    const [profilesFailed, setProfilesFailed] = React.useState(false);
    const [createName, setCreateName] = React.useState("");
    const [createProfile, setCreateProfile] = React.useState("");
    const [bootSeq, setBootSeq] = React.useState(0);
    const channels = React.useRef({});
    const clientRef = React.useRef(null);
    const writeLock = React.useRef(false);
    const nameId = React.useId();
    const profileId = React.useId();
    const ticket = (key) => {
      const map = channels.current;
      if (!map[key]) map[key] = createTicket2();
      return map[key].take();
    };
    const invalidate = (...keys) => {
      for (const key of keys) channels.current[key]?.take();
    };
    const killAll = () => {
      for (const channel of Object.values(channels.current)) channel.kill();
      channels.current = {};
    };
    const client = () => clientRef.current;
    const run = React.useCallback(async (work, stale) => {
      try {
        await work();
      } catch (cause) {
        if (!stale || stale()) setError(cause);
      }
    }, []);
    const loadList = React.useCallback(() => {
      const stale = ticket("list");
      setError(null);
      run(async () => {
        const list = await client().listSandboxes();
        if (!stale()) return;
        setRows(list.rows);
        setTotal(list.total);
      }, stale);
    }, [run]);
    React.useEffect(() => {
      if (!sessionId) return void 0;
      channels.current = {};
      writeLock.current = false;
      setPhase("loading");
      setError(null);
      setRows(null);
      setTotal(null);
      setSelection(null);
      setDetail(null);
      setProcs(null);
      setReceipt(null);
      setOpBody(null);
      const instance = createDnlsClient2({});
      clientRef.current = instance;
      const stale = ticket("list");
      (async () => {
        try {
          await instance.discover();
          if (!stale()) return;
          const list = await instance.listSandboxes();
          if (!stale()) return;
          setRows(list.rows);
          setTotal(list.total);
          setPhase("ready");
        } catch (cause) {
          if (stale()) {
            setError(cause);
            setPhase("failed");
          }
        }
      })();
      return () => {
        killAll();
        clientRef.current = null;
      };
    }, [sessionId, bootSeq, run]);
    function choose(sandboxId) {
      if (writeLock.current) return;
      const found = (rows ?? []).find((entry) => entry.sandboxId === sandboxId);
      if (!found) return;
      invalidate("detail", "process", "operation", "profiles");
      setSelection({ sandboxId: found.sandboxId, name: found.name ?? found.sandboxId });
      setDetail(null);
      setProcs(null);
      setPendingAction(null);
      setOpBody(null);
      setReceipt(null);
      setError(null);
      setProcsBusy(false);
      setCreateOpen(false);
    }
    const loadDetail = React.useCallback(() => {
      if (!selection) return;
      const target = selection.sandboxId;
      const stale = ticket("detail");
      run(async () => {
        const answer = await client().inspect(target, { window: usageWindow });
        if (!stale()) return;
        setDetail(answer);
      }, stale);
    }, [selection?.sandboxId, usageWindow, run]);
    React.useEffect(() => {
      if (!selection || view !== "control" || detail) return void 0;
      loadDetail();
      return void 0;
    }, [selection?.sandboxId, view, usageWindow, detail, loadDetail]);
    function refresh() {
      if (phase === "failed") {
        setBootSeq((n) => n + 1);
        return;
      }
      if (view === "control" && selection) {
        setDetail(null);
      } else {
        loadList();
      }
    }
    function submitLifecycle(action, extra = {}) {
      if (writeLock.current) return;
      writeLock.current = true;
      const stale = ticket("write");
      setBusy(true);
      setError(null);
      run(async () => {
        const body = await client().lifecycle({
          action,
          requestId: crypto.randomUUID(),
          ...extra
        });
        if (!stale()) return;
        const record = {
          operationId: body.operationId,
          sandboxId: extra.sandboxId ?? body.sandboxId,
          action
        };
        setReceipt(record);
        setPendingAction(null);
        setCreateOpen(false);
        setOpBody(body);
        if (action === "create") loadList();
      }, stale).finally(() => {
        writeLock.current = false;
        if (stale()) setBusy(false);
      });
    }
    function confirmPending() {
      if (!selection || !pendingAction) return;
      submitLifecycle(pendingAction, { sandboxId: selection.sandboxId });
    }
    function recheck() {
      if (!receipt?.operationId || !receipt.sandboxId || !client()) return;
      const stale = ticket("operation");
      run(async () => {
        const body = await client().readOperation(receipt.sandboxId, receipt.operationId);
        if (!stale()) return;
        setOpBody(body);
      }, stale);
    }
    function loadProcesses() {
      if (!selection) return;
      const target = selection.sandboxId;
      const stale = ticket("process");
      setProcsBusy(true);
      setError(null);
      run(async () => {
        const body = await client().processes(target);
        if (!stale()) return;
        setProcs(body);
      }, stale).finally(() => {
        if (stale()) setProcsBusy(false);
      });
    }
    function openCreate() {
      setCreateOpen(true);
      setProfiles(null);
      setProfilesFailed(false);
      const stale = ticket("profiles");
      run(async () => {
        try {
          const list = await client().listProfiles();
          if (!stale()) return;
          setProfiles(list);
          if (list.length === 1 && list[0].ready !== false) setCreateProfile(list[0].id);
        } catch (cause) {
          if (!stale()) return;
          setProfiles([]);
          setProfilesFailed(true);
          throw cause;
        }
      }, stale);
    }
    if (!sessionId) return null;
    const sandboxName = selection?.name ?? selection?.sandboxId ?? "";
    const selectedProfile = (profiles ?? []).find((p) => p.id === createProfile);
    const createBlocked = busy || !createName || !createProfile || selectedProfile?.ready === false;
    const header = h(
      "div",
      { style: row },
      h(primitives.Button, {
        variant: view === "overview" ? "primary" : "ghost",
        size: "sm",
        "aria-pressed": view === "overview",
        title: copy.overview,
        onClick: () => setView("overview")
      }, copy.overview),
      h(primitives.Button, {
        variant: view === "control" ? "primary" : "ghost",
        size: "sm",
        "aria-pressed": view === "control",
        title: copy.control,
        disabled: !selection,
        onClick: () => setView("control")
      }, copy.control),
      h("span", { style: { flex: 1 } }),
      h(primitives.Button, { variant: "ghost", size: "sm", onClick: refresh }, copy.refresh)
    );
    const errorBox = error ? h(
      "div",
      { "data-dnls-error": "1", style: errorStyle, role: "alert" },
      `${error?.errorId ? `${error.errorId} ` : ""}${error?.message ?? error}`
    ) : null;
    const receiptBox = receipt ? h(
      "div",
      { "data-dnls-receipt": "1", style: { ...row, ...card } },
      h(
        "span",
        { style: { flex: 1, minWidth: 0 } },
        fill2(copy.opState, {
          operationId: receipt.operationId,
          state: opBody?.state ?? copy.opPending
        })
      ),
      h(primitives.Button, { variant: "ghost", size: "sm", onClick: recheck }, copy.opRecheck)
    ) : null;
    const overview = () => {
      if (phase === "loading" && rows === null) return h("div", { "data-dnls-loading": "1" }, copy.loading);
      const picker = h(
        "div",
        { style: row },
        h(
          "select",
          {
            "data-dnls-sandbox-select": "1",
            "aria-label": copy.sandboxPick,
            value: selection?.sandboxId ?? "",
            disabled: busy,
            onChange: (event) => {
              if (event.target.value) choose(event.target.value);
            },
            style: { flex: 1, minWidth: 0 }
          },
          h("option", { value: "", disabled: true }, copy.sandboxPick),
          (rows ?? []).map((entry) => h(
            "option",
            { key: entry.sandboxId, value: entry.sandboxId },
            `${entry.name || entry.sandboxId.slice(0, 8)} \xB7 ${entry.envId ?? "\u2014"} \xB7 ${entry.observedState ?? "unknown"}`
          ))
        ),
        h(primitives.Button, { variant: "ghost", size: "sm", disabled: busy, onClick: openCreate }, copy.create)
      );
      const list = (rows ?? []).map((entry) => h(
        "div",
        {
          key: entry.sandboxId,
          "data-dnls-row": entry.sandboxId,
          style: card
        },
        h(Field, { label: copy.fieldName, value: entry.name ?? entry.sandboxId }),
        h(Field, { label: copy.fieldProfile, value: entry.profileId }),
        h(Field, { label: copy.fieldEnv, value: entry.envId }),
        h(Field, { label: copy.fieldState, value: entry.observedState }),
        h(Field, { label: copy.fieldServices, value: serviceSummary2(entry.services) || void 0 })
      ));
      const createForm = createOpen ? h(
        "div",
        { "data-dnls-create": "1", style: { ...card, display: "grid", gap: 8 } },
        h(
          "div",
          { style: field },
          h("label", { htmlFor: nameId }, copy.createName),
          h("input", {
            id: nameId,
            "data-dnls-create-name": "1",
            value: createName,
            disabled: busy,
            onChange: (event) => setCreateName(event.target.value)
          })
        ),
        h(
          "div",
          { style: field },
          h("label", { htmlFor: profileId }, copy.createProfile),
          profiles === null ? h("span", { style: muted }, copy.loading) : h(
            "select",
            {
              id: profileId,
              "data-dnls-create-profile": "1",
              value: createProfile,
              disabled: busy,
              onChange: (event) => setCreateProfile(event.target.value)
            },
            h("option", { value: "", disabled: true }, copy.sandboxPick),
            profiles.map((p) => h(
              "option",
              { key: p.id, value: p.id, disabled: p.ready === false },
              `${p.id}${p.ready === false ? ` \xB7 ${copy.profileNotReady}` : ""}`
            ))
          )
        ),
        profiles !== null && profiles.length === 0 ? h("div", { style: muted }, copy.noProfiles) : null,
        profilesFailed ? h("div", { style: errorStyle }, copy.failed) : null,
        h(
          "div",
          { style: row },
          h(primitives.Button, {
            variant: "primary",
            size: "sm",
            disabled: createBlocked,
            onClick: () => submitLifecycle("create", { name: createName, profileId: createProfile })
          }, busy ? copy.creating : copy.createSubmit),
          h(primitives.Button, { variant: "ghost", size: "sm", disabled: busy, onClick: () => setCreateOpen(false) }, copy.cancel)
        )
      ) : null;
      return h(
        React.Fragment,
        null,
        picker,
        total !== null ? h("div", { style: muted }, fill2(copy.listShort, { shown: (rows ?? []).length, total })) : null,
        rows !== null && rows.length === 0 && !createOpen ? h("div", { "data-dnls-empty": "1", style: muted }, copy.empty) : null,
        !selection && (rows ?? []).length > 0 ? h("div", { style: muted }, copy.pick) : null,
        createForm,
        list
      );
    };
    const usageBox = (usage) => usage && h(
      "div",
      { "data-dnls-usage": "1", style: card },
      h(
        "div",
        { style: row },
        ["24h", "7d", "30d"].map((w) => h(primitives.Button, {
          key: w,
          variant: usageWindow === w ? "primary" : "ghost",
          size: "sm",
          "aria-pressed": usageWindow === w,
          disabled: busy,
          onClick: () => {
            setDetail(null);
            setUsageWindow(w);
          }
        }, w))
      ),
      h(Field, {
        label: copy.usageStates,
        value: `${copy.stateRunning} ${usage.states?.running ?? 0} \xB7 ${copy.stateStopped} ${usage.states?.stopped ?? 0} \xB7 ${copy.stateFailed} ${usage.states?.failed ?? 0} \xB7 ${copy.stateMissing} ${usage.states?.missing ?? 0}`
      }),
      h(Field, {
        label: copy.usageMemory,
        value: `${copy.expected} ${usage.memory?.expected ?? "\u2014"} \xB7 ${copy.valid} ${usage.memory?.valid ?? "\u2014"} \xB7 ${copy.mean} ${formatBytes2(usage.memory?.mean) ?? "\u2014"} \xB7 ${copy.peak} ${formatBytes2(usage.memory?.peak) ?? "\u2014"}`
      }),
      h(Field, {
        label: copy.usageCpu,
        value: `${copy.expected} ${usage.cpu?.expected ?? "\u2014"} \xB7 ${copy.valid} ${usage.cpu?.valid ?? "\u2014"} \xB7 ${copy.mean} ${formatCores2(usage.cpu?.mean) ?? "\u2014"} \xB7 ${copy.peak} ${formatCores2(usage.cpu?.peak) ?? "\u2014"}`
      })
    );
    const control = () => {
      if (!selection) return h("div", { style: muted }, copy.pick);
      const services = detail?.services ?? [];
      return h(
        React.Fragment,
        null,
        h("div", { style: { fontWeight: 600 } }, sandboxName),
        h(Field, { label: "sandboxId", value: detail?.sandboxId ?? selection.sandboxId }),
        h(Field, { label: copy.fieldEnv, value: detail?.envId }),
        h(Field, { label: copy.fieldState, value: detail?.observedState ?? copy.loading }),
        h(Field, { label: copy.health, value: detail?.health }),
        h(Field, { label: copy.fieldGeneration, value: detail?.generation }),
        h(Field, { label: copy.fieldRevision, value: detail ? `${copy.desiredRev} ${detail.desiredRevision ?? "\u2014"} \xB7 ${copy.appliedRev} ${detail.appliedRevision ?? "\u2014"}` : void 0 }),
        h(Field, { label: copy.observedAt, value: detail?.observedAt }),
        services.length > 0 ? h("div", { style: card }, services.map((service) => h(ServiceLine, { key: service.serviceId, service }))) : null,
        usageBox(detail?.usage),
        h(
          "div",
          { style: row },
          h(primitives.Button, { variant: "ghost", size: "sm", disabled: busy, onClick: () => setPendingAction("start") }, copy.start),
          h(primitives.Button, { variant: "ghost", size: "sm", disabled: busy, onClick: () => setPendingAction("stop") }, copy.stop),
          h(primitives.Button, { variant: "ghost", size: "sm", disabled: busy, onClick: () => setPendingAction("restart") }, copy.restart),
          h(primitives.Button, {
            variant: "ghost",
            size: "sm",
            disabled: procsBusy || busy,
            onClick: () => procs ? setProcs(null) : loadProcesses()
          }, procs ? copy.processesHide : copy.processes)
        ),
        pendingAction ? h(ConfirmBar, {
          copy,
          action: pendingAction,
          name: sandboxName,
          busy,
          onConfirm: confirmPending,
          onCancel: () => setPendingAction(null)
        }) : null,
        procs ? h(
          "div",
          { "data-dnls-processes": "1", style: card },
          (procs.processes ?? []).length === 0 ? h("div", { style: muted }, copy.processesEmpty) : (procs.processes ?? []).map((p) => h(
            "div",
            { key: p.pid },
            `${p.pid} ${p.name ?? ""} ${p.state ?? ""} ${p.rssBytes != null ? `${p.rssBytes}B` : ""}`
          ))
        ) : null
      );
    };
    return h(
      "div",
      { "data-dnls-pane": "1", style: box },
      header,
      errorBox,
      receiptBox,
      view === "overview" ? overview() : control()
    );
  }
  var inject = ["slots", "sidebarRightTabs", "locale"];
  function apply(ctx) {
    const zh = () => ctx.locale?.getSnapshot?.().active?.startsWith("zh") === true;
    const copy = () => copyFor2(zh() ? "zh" : "en");
    const Pane = (props) => h(DnlsPane, { sessionId: props.sessionId, copy: copy() });
    ctx.effect(() => ctx.sidebarRightTabs.register({
      id: KIND,
      kind: KIND,
      priority: "extension",
      keepMounted: true,
      multiple: false,
      title: () => copy().typeLabel,
      guide: [{
        id: KIND,
        order: 45,
        title: () => copy().typeLabel,
        description: () => copy().typeDescription
      }]
    }));
    ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
      name: "sidebar.right.pane.tab",
      key: KIND
    }, Pane)));
    ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
      name: "sidebar.right.pane.tab.title",
      key: KIND
    }, function DnlsTitle() {
      return copy().typeLabel;
    })));
  }
  return __toCommonJS(index_exports);
})();
		return __dnlsClient;
	}
});
