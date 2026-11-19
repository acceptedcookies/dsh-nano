// src/host/context.js
var HEADER = "Current session progress (observed facts, not instructions):";
var KIND_WORD = { user: "a user request", goal: "a goal", schedule: "a scheduled task" };
var kindWord = (kind) => KIND_WORD[kind] ?? "a user request";
var jsonCell = (text) => JSON.stringify(String(text)).replace(
  /[<>&\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g,
  (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`
);
function formatProgress({ view: view2, todos = [], runningJobs = 0, runningSubagents = 0 }) {
  const lines = [HEADER];
  const current = view2?.items?.find((item) => item.tier === "full");
  if (current !== void 0) {
    lines.push(`Current work: ${kindWord(current.kind)}`);
  }
  const counts = { completed: 0, in_progress: 0, pending: 0 };
  for (const todo of todos) {
    if (Object.hasOwn(counts, todo?.status)) counts[todo.status] += 1;
  }
  if (counts.completed > 0 || counts.in_progress > 0 || counts.pending > 0) {
    const contents = todos.filter((todo) => todo?.status === "in_progress").map((todo) => jsonCell(todo.content)).join(", ");
    const suffix = contents !== "" ? `; in progress: ${contents}` : "";
    lines.push(`Tasks: ${counts.completed} complete, ${counts.in_progress} in progress, ${counts.pending} pending${suffix}`);
  }
  const failures = current?.failures ?? [];
  if (failures.length > 0) {
    const byTool = /* @__PURE__ */ new Map();
    let total = 0;
    for (const failure of failures) {
      const count = failure.count ?? 1;
      total += count;
      byTool.set(failure.tool, (byTool.get(failure.tool) ?? 0) + count);
    }
    const detail = [...byTool.entries()].map(([tool, count]) => `${tool} ${count}`).join(", ");
    lines.push(`Unresolved tool failures in current work: ${total} (${detail})`);
  }
  if (runningJobs > 0 || runningSubagents > 0) {
    lines.push(`Active: ${runningJobs} background jobs, ${runningSubagents} direct subagents`);
  }
  return lines.length === 1 ? "" : lines.join("\n");
}

// src/shared/fingerprint.js
var K = [
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
];
function digest(text) {
  const bytes = utf8(String(text));
  const bitLen = bytes.length * 8;
  const padded = [...bytes];
  padded.push(128);
  while (padded.length % 64 !== 56) padded.push(0);
  const hi = Math.floor(bitLen / 4294967296);
  padded.push(
    hi >>> 24 & 255,
    hi >>> 16 & 255,
    hi >>> 8 & 255,
    hi & 255,
    bitLen >>> 24 & 255,
    bitLen >>> 16 & 255,
    bitLen >>> 8 & 255,
    bitLen & 255
  );
  const h = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225];
  const w = new Int32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = padded[off + i * 4] << 24 | padded[off + i * 4 + 1] << 16 | padded[off + i * 4 + 2] << 8 | padded[off + i * 4 + 3];
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ w[i - 15] >>> 3;
      const s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ w[i - 2] >>> 10;
      w[i] = w[i - 16] + s0 + w[i - 7] + s1 | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rot(e, 6) ^ rot(e, 11) ^ rot(e, 25);
      const ch = e & f ^ ~e & g;
      const t1 = hh + s1 + ch + K[i] + w[i] | 0;
      const s0 = rot(a, 2) ^ rot(a, 13) ^ rot(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const t2 = s0 + maj | 0;
      hh = g;
      g = f;
      f = e;
      e = d + t1 | 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 | 0;
    }
    h[0] = h[0] + a | 0;
    h[1] = h[1] + b | 0;
    h[2] = h[2] + c | 0;
    h[3] = h[3] + d | 0;
    h[4] = h[4] + e | 0;
    h[5] = h[5] + f | 0;
    h[6] = h[6] + g | 0;
    h[7] = h[7] + hh | 0;
  }
  return h.map((word) => (word >>> 0).toString(16).padStart(8, "0")).join("");
}
var rot = (word, bits) => word >>> bits | word << 32 - bits | 0;
function utf8(text) {
  const out = [];
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i);
    if (code >= 55296 && code <= 56319 && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 56320 && next <= 57343) {
        code = 65536 + (code - 55296 << 10) + (next - 56320);
        i += 1;
      }
    }
    if (code < 128) out.push(code);
    else if (code < 2048) out.push(192 | code >> 6, 128 | code & 63);
    else if (code < 65536) out.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63);
    else out.push(240 | code >> 18, 128 | code >> 12 & 63, 128 | code >> 6 & 63, 128 | code & 63);
  }
  return out;
}
var isDigest = (value) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
function parseArgsRaw(raw) {
  if (raw === null || raw === void 0) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return null;
  }
}
var NON_IDENTITY_KEYS = /* @__PURE__ */ new Set(["description", "justification", "reason"]);
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (NON_IDENTITY_KEYS.has(key)) continue;
      out[key] = canonicalize(value[key]);
    }
    return out;
  }
  return value;
}
function bashFingerprint(raw, cwd) {
  const args = parseArgsRaw(raw);
  if (args === null) return null;
  if (typeof args.command === "string" && args.command.length > 0 && args.run_in_background !== true) {
    return digest(JSON.stringify([cwd ?? null, args.workdir ?? null, args.command]));
  }
  return null;
}
function fileFingerprints(raw, meta) {
  return callPaths(raw, meta).map((path) => digest(`file:${path}`));
}
function callPaths(raw, meta) {
  const args = parseArgsRaw(raw) ?? {};
  let paths = [];
  if (Array.isArray(meta?.diffs)) paths = meta.diffs.map((diff) => diff?.path);
  else if (meta?.path !== void 0) paths = [meta.path];
  if (paths.every((path) => typeof path !== "string" || path === "")) {
    const argPath = args.file_path ?? args.path;
    paths = typeof argPath === "string" && argPath !== "" ? [argPath] : [];
  }
  return paths.filter((path) => typeof path === "string" && path !== "");
}
function callFingerprints(name2, raw, { cwd = null, meta = null } = {}) {
  if (name2 === "bash") {
    const key = bashFingerprint(raw, cwd);
    return key === null ? [] : [key];
  }
  if (name2 === "write" || name2 === "edit" || name2 === "apply_patch") {
    const keys = fileFingerprints(raw, meta);
    if (keys.length > 0) return keys;
  }
  const args = parseArgsRaw(raw);
  if (args === null) return [];
  return [digest(`call:${name2}:${JSON.stringify(canonicalize(args))}`)];
}
function successfulBash({ message, meta } = {}) {
  const block = message?.content?.at(-1);
  if (typeof meta?.cwd !== "string" || block?.type !== "text" || typeof block.text !== "string") return false;
  const tail = block.text.slice(-1024).trimEnd();
  return !/^(?:started background job |\[(?:still running after |timed out after |stopped: |killed by signal: |exit code: |sandbox: ))/m.test(tail);
}

// src/shared/open.js
function openKind(sourceKind) {
  switch (sourceKind) {
    case "user":
    case "goal":
    case "schedule":
      return sourceKind;
    default:
      return null;
  }
}

// src/host/ledger.js
var LEDGER_KEY = "nano-progress-report:ledger";
var STATE_VERSION = 1;
var FULL_MAX = 16;
var SKELETON_MAX = 64;
var ITEMS_MAX = FULL_MAX + SKELETON_MAX;
var FILES_MAX = 32;
var FAILURES_MAX = 16;
var TASKS_MAX = 32;
var PENDING_MAX = 64;
var TEXT_MAX_BYTES = 200;
var PATH_MAX_BYTES = 192;
var FILE_TOOLS = /* @__PURE__ */ new Set(["write", "edit", "apply_patch"]);
var utf8Slice = (text, maxBytes) => {
  const buf = Buffer.from(String(text), "utf8");
  return buf.length <= maxBytes ? buf.toString("utf8") : buf.subarray(0, maxBytes).toString("utf8");
};
function messageText(data) {
  const content = data?.content ?? data?.message?.content ?? data?.text;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts = [];
    for (const block of content) {
      if (block && typeof block.text === "string") parts.push(block.text);
      else if (typeof block === "string") parts.push(block);
    }
    return parts.join("\n");
  }
  return "";
}
var newItem = (seq, kind, text) => ({
  id: seq,
  tier: "full",
  kind,
  title: utf8Slice(text, TEXT_MAX_BYTES),
  endReason: null,
  awaiting: 0,
  firstSeq: seq,
  lastSeq: seq,
  calls: 0,
  failedCalls: 0,
  files: [],
  failures: [],
  tasks: [],
  jobs: [],
  truncated: { files: 0, failures: 0, tasks: 0 }
});
var skeletonOf = (item) => ({
  id: item.id,
  tier: "skeleton",
  kind: item.kind,
  title: item.title,
  endReason: item.endReason,
  firstSeq: item.firstSeq,
  lastSeq: item.lastSeq,
  calls: item.calls,
  failedCalls: item.failedCalls,
  filesCount: item.files.length,
  tasksCount: item.tasks.length
});
function patchItem(state, item, next) {
  const index = state.items.indexOf(item);
  const items = state.items.slice();
  items[index] = next;
  return { ...state, items };
}
var touch = (state, seq) => state.firstSeq === null ? { ...state, firstSeq: seq, asOfSeq: seq } : { ...state, asOfSeq: seq };
function rebalance(items) {
  const next = items.slice();
  let full = 0;
  for (const item of next) if (item.tier === "full") full += 1;
  for (let i = next.length - 1; i >= 0 && full > FULL_MAX; i -= 1) {
    if (next[i].tier !== "full") continue;
    next[i] = skeletonOf(next[i]);
    full -= 1;
  }
  let evicted = 0;
  while (next.length > ITEMS_MAX) {
    next.pop();
    evicted += 1;
  }
  return { items: next, evicted };
}
function apply(state, event) {
  if (event.seq < state.inherited) return state;
  const seq = event.seq;
  const data = event.data ?? {};
  switch (event.type) {
    case "turn/start": {
      let next = {
        ...touch(state, seq),
        turn: state.turn + 1,
        turnOpen: true,
        pending: {}
      };
      const current = next.items[0];
      if (current !== void 0) {
        next = patchItem(next, current, { ...current, lastSeq: seq });
      }
      return next;
    }
    case "turn/end": {
      const reason = typeof data.reason === "string" ? data.reason : data.reason?.kind ?? "completed";
      let next = touch({ ...state, turnOpen: false }, seq);
      const current = next.items[0];
      if (current !== void 0) {
        next = patchItem(next, current, { ...current, endReason: reason, lastSeq: seq });
      }
      return next;
    }
    case "working-directory/change": {
      if (typeof data.cwd !== "string") return state;
      const cwd = digest(data.cwd);
      return cwd === state.cwd ? state : { ...touch(state, seq), cwd };
    }
    case "user/message": {
      const kind = openKind(data.source?.kind);
      if (kind !== null) {
        const { items, evicted } = rebalance([newItem(seq, kind, messageText(data)), ...state.items]);
        const next = { ...touch(state, seq), items };
        return evicted > 0 ? { ...next, truncated: { ...next.truncated, items: next.truncated.items + evicted } } : next;
      }
      const current = state.items[0];
      if (current === void 0) return state;
      return touch(patchItem(state, current, { ...current, lastSeq: seq }), seq);
    }
    case "tool/call": {
      const callId = data.callId;
      if (callId === void 0 || callId === null || typeof data.name !== "string") return state;
      const id = String(callId);
      const args = data.arguments ?? null;
      const pending = {
        ...state.pending,
        [id]: {
          name: data.name,
          keys: callFingerprints(data.name, args, { cwd: state.cwd }),
          paths: FILE_TOOLS.has(data.name) ? callPaths(args, null) : [],
          seq
        }
      };
      const entries = Object.entries(pending);
      if (entries.length > PENDING_MAX) {
        entries.sort((a, b) => a[1].seq - b[1].seq);
        for (const [key] of entries.slice(0, entries.length - PENDING_MAX)) delete pending[key];
      }
      return { ...touch(state, seq), pending };
    }
    case "tool/result": {
      const message = data.message;
      const rawId = message?.source?.kind === "tool" ? message.source.callId : message?.toolCallId;
      if (rawId === void 0 || rawId === null) return state;
      const call = state.pending[String(rawId)];
      if (call === void 0) return state;
      const pending = { ...state.pending };
      delete pending[String(rawId)];
      const failed = message?.isError === true || data.error != null;
      const item = state.items[0];
      if (item === void 0 || item.tier !== "full") {
        const unattributed = {
          ...state.unattributed,
          calls: state.unattributed.calls + 1,
          failures: state.unattributed.failures + (failed ? 1 : 0)
        };
        return { ...touch(state, seq), pending, unattributed };
      }
      let patch = { ...item, calls: item.calls + 1, lastSeq: seq };
      if (failed) {
        patch = { ...patch, failedCalls: patch.failedCalls + 1 };
        const metaPaths = callPaths(null, data.meta);
        const path = metaPaths[0] ?? call.paths[0] ?? null;
        const entries = call.keys.length > 0 ? call.keys.map((key) => ({ tool: call.name, key, path: FILE_TOOLS.has(call.name) ? path : null })) : [{ tool: call.name, key: null, path: null }];
        let failures = patch.failures;
        let truncated = patch.truncated.failures;
        for (const entry of entries) {
          const index = failures.findIndex((f) => f.tool === entry.tool && f.key === entry.key);
          if (index < 0) {
            failures = [...failures, {
              ...entry,
              count: 1,
              firstSeq: seq,
              lastSeq: seq,
              callId: String(rawId)
            }];
          } else {
            failures = failures.map((f, i) => i === index ? { ...f, count: f.count + 1, lastSeq: seq, callId: String(rawId) } : f);
          }
        }
        if (failures.length > FAILURES_MAX) {
          truncated += failures.length - FAILURES_MAX;
          failures = failures.slice(failures.length - FAILURES_MAX);
        }
        patch = { ...patch, failures, truncated: { ...patch.truncated, failures: truncated } };
      } else {
        const clears = call.name === "bash" ? successfulBash(data) ? call.keys : [] : call.keys;
        if (clears.length > 0) {
          const cleared = new Set(clears);
          const kept = patch.failures.filter((f) => f.key === null || !cleared.has(f.key));
          if (kept.length !== patch.failures.length) patch = { ...patch, failures: kept };
        }
        if (FILE_TOOLS.has(call.name)) {
          const metaPaths = callPaths(null, data.meta);
          const paths = metaPaths.length > 0 ? metaPaths : call.paths;
          let files = patch.files;
          let truncated = patch.truncated.files;
          for (const path of paths) {
            if (Buffer.byteLength(path) > PATH_MAX_BYTES) continue;
            const index = files.findIndex((f) => f.path === path);
            files = index < 0 ? [...files, { path, firstSeq: seq, lastSeq: seq }] : files.map((f, i) => i === index ? { ...f, lastSeq: seq } : f);
          }
          if (files.length > FILES_MAX) {
            truncated += files.length - FILES_MAX;
            files = files.slice().sort((a, b) => b.lastSeq - a.lastSeq).slice(0, FILES_MAX).sort((a, b) => a.firstSeq - b.firstSeq || a.lastSeq - b.lastSeq);
          }
          patch = { ...patch, files, truncated: { ...patch.truncated, files: truncated } };
        }
      }
      return touch(patchItem(state, item, patch), seq);
    }
    case "todo/write": {
      const item = state.items[0];
      if (item === void 0 || item.tier !== "full") return state;
      const todos = Array.isArray(data.todos) ? data.todos : [];
      const now = event.time ?? 0;
      const byContent = new Map(item.tasks.map((task) => [task.content, task]));
      let tasks = [];
      for (const todo of todos) {
        if (todo === null || typeof todo.content !== "string" || todo.content === "") continue;
        const status = todo.status === "completed" || todo.status === "in_progress" ? todo.status : "pending";
        const prev = byContent.get(todo.content);
        if (prev === void 0) {
          tasks.push({ content: utf8Slice(todo.content, TEXT_MAX_BYTES), status, firstSeq: seq });
          byContent.set(todo.content, tasks[tasks.length - 1]);
          continue;
        }
        const next = { ...prev, status };
        if (status === "completed" && prev.completedSeq === void 0) {
          next.completedSeq = seq;
          next.completedAt = now;
        }
        tasks.push(next);
      }
      let truncated = item.truncated.tasks;
      if (tasks.length > TASKS_MAX) {
        truncated += tasks.length - TASKS_MAX;
        tasks = tasks.slice().sort((a, b) => b.firstSeq - a.firstSeq).slice(0, TASKS_MAX).sort((a, b) => a.firstSeq - b.firstSeq);
      }
      return touch(patchItem(state, item, {
        ...item,
        tasks,
        lastSeq: seq,
        truncated: { ...item.truncated, tasks: truncated }
      }), seq);
    }
    case "approval/asked": {
      const id = data.id;
      if (id === void 0 || id === null) return state;
      const approvals = { ...state.approvals, [String(id)]: state.items[0]?.id ?? null };
      let next = { ...touch(state, seq), approvals };
      const item = next.items[0];
      if (item !== void 0 && item.tier === "full") {
        next = patchItem(next, item, { ...item, awaiting: item.awaiting + 1, lastSeq: seq });
      }
      return next;
    }
    case "approval/decided": {
      const key = data.id === void 0 || data.id === null ? null : String(data.id);
      if (key === null || !(key in state.approvals)) return state;
      const itemId = state.approvals[key];
      const approvals = { ...state.approvals };
      delete approvals[key];
      let next = { ...touch(state, seq), approvals };
      const item = next.items.find((entry) => entry.id === itemId);
      if (item !== void 0 && item.tier === "full" && item.awaiting > 0) {
        next = patchItem(next, item, { ...item, awaiting: item.awaiting - 1, lastSeq: seq });
      }
      return next;
    }
    case "job/registered": {
      if (data.jobId === void 0 || data.jobId === null) return state;
      const item = state.items[0];
      if (item === void 0 || item.tier !== "full") {
        return {
          ...touch(state, seq),
          unattributed: { ...state.unattributed, jobs: state.unattributed.jobs + 1 }
        };
      }
      const entry = {
        jobId: String(data.jobId),
        label: utf8Slice(String(data.label ?? data.kind ?? data.jobId), TEXT_MAX_BYTES),
        status: "running",
        firstSeq: seq,
        callId: data.callId === void 0 ? void 0 : String(data.callId)
      };
      const jobs = [...item.jobs.filter((job) => job.jobId !== entry.jobId), entry];
      return touch(patchItem(state, item, { ...item, jobs, lastSeq: seq }), seq);
    }
    case "job/settled": {
      if (data.jobId === void 0 || data.jobId === null) return state;
      const jobId = String(data.jobId);
      const status = data.status === "failed" || data.status === "killed" ? "failed" : "done";
      let changed = false;
      const items = state.items.map((item) => {
        const index = item.jobs?.findIndex((job) => job.jobId === jobId) ?? -1;
        if (index < 0) return item;
        changed = true;
        return {
          ...item,
          lastSeq: seq,
          jobs: item.jobs.map((job, i) => i === index ? { ...job, status } : job)
        };
      });
      return changed ? { ...touch(state, seq), items } : state;
    }
    case "goal/change": {
      const current = state.items[0];
      if (current === void 0) return state;
      return touch(patchItem(state, current, { ...current, lastSeq: seq }), seq);
    }
    default:
      return state;
  }
}
function itemStatus(item, isCurrent, state) {
  if (item.tier !== "full") return item.endReason ?? "completed";
  if (item.awaiting > 0) return "waiting";
  if (isCurrent && state.turnOpen) return "in progress";
  if (item.endReason !== null) return item.endReason;
  return "in progress";
}
function itemView(item, index, state) {
  if (item.tier !== "full") {
    return {
      tier: "skeleton",
      kind: item.kind,
      title: item.title,
      status: itemStatus(item, false, state),
      endReason: item.endReason,
      firstSeq: item.firstSeq,
      lastSeq: item.lastSeq,
      counts: {
        calls: item.calls,
        failures: item.failedCalls,
        files: item.filesCount,
        tasks: item.tasksCount
      }
    };
  }
  return {
    tier: "full",
    kind: item.kind,
    title: item.title,
    status: itemStatus(item, index === 0, state),
    endReason: item.endReason,
    firstSeq: item.firstSeq,
    lastSeq: item.lastSeq,
    files: item.files,
    failures: item.failures.map(({ tool, key, path, count, firstSeq, lastSeq, callId }) => ({ tool, key, path, count, firstSeq, lastSeq, callId })),
    tasks: item.tasks,
    jobs: item.jobs,
    counts: {
      calls: item.calls,
      failures: item.failedCalls,
      files: item.files.length,
      tasks: item.tasks.length,
      jobs: item.jobs.length
    },
    truncated: item.truncated
  };
}
var isCount = (value) => Number.isSafeInteger(value) && value >= 0;
var isPath = (value) => typeof value === "string" && Buffer.byteLength(value) <= PATH_MAX_BYTES;
var isText = (value) => typeof value === "string" && Buffer.byteLength(value) <= TEXT_MAX_BYTES;
function parseItem(value) {
  if (!value || typeof value !== "object" || !isCount(value.id) || value.tier !== "full" && value.tier !== "skeleton" || typeof value.kind !== "string" || !isText(value.title) || !isCount(value.firstSeq) || !isCount(value.lastSeq)) {
    throw new Error("Invalid progress ledger item");
  }
  const base = {
    id: value.id,
    tier: value.tier,
    kind: value.kind,
    title: value.title,
    endReason: typeof value.endReason === "string" ? value.endReason : null,
    firstSeq: value.firstSeq,
    lastSeq: value.lastSeq,
    calls: isCount(value.calls) ? value.calls : 0,
    failedCalls: isCount(value.failedCalls) ? value.failedCalls : 0
  };
  if (value.tier !== "full") {
    return {
      ...base,
      filesCount: isCount(value.filesCount) ? value.filesCount : 0,
      tasksCount: isCount(value.tasksCount) ? value.tasksCount : 0
    };
  }
  return {
    ...base,
    awaiting: isCount(value.awaiting) ? value.awaiting : 0,
    files: (value.files ?? []).filter((f) => f && isPath(f.path) && isCount(f.firstSeq) && isCount(f.lastSeq)).map((f) => ({ path: f.path, firstSeq: f.firstSeq, lastSeq: f.lastSeq })),
    failures: (value.failures ?? []).filter((f) => f && typeof f.tool === "string" && (f.key === null || isDigest(f.key)) && isCount(f.firstSeq) && isCount(f.lastSeq) && isCount(f.count)).map((f) => ({
      tool: f.tool,
      key: f.key,
      path: typeof f.path === "string" && Buffer.byteLength(f.path) <= PATH_MAX_BYTES ? f.path : null,
      count: f.count,
      firstSeq: f.firstSeq,
      lastSeq: f.lastSeq,
      callId: String(f.callId ?? "")
    })),
    tasks: (value.tasks ?? []).filter((t) => t && isText(t.content) && isCount(t.firstSeq)).map((t) => ({
      content: t.content,
      status: t.status === "completed" || t.status === "in_progress" ? t.status : "pending",
      firstSeq: t.firstSeq,
      ...t.completedSeq !== void 0 ? { completedSeq: t.completedSeq, completedAt: t.completedAt } : {}
    })),
    jobs: (value.jobs ?? []).filter((j) => j && typeof j.jobId === "string").map((j) => ({
      jobId: j.jobId,
      label: j.label ?? "",
      status: j.status ?? "running",
      firstSeq: isCount(j.firstSeq) ? j.firstSeq : 0,
      ...j.callId !== void 0 ? { callId: String(j.callId) } : {}
    })),
    truncated: {
      files: isCount(value.truncated?.files) ? value.truncated.files : 0,
      failures: isCount(value.truncated?.failures) ? value.truncated.failures : 0,
      tasks: isCount(value.truncated?.tasks) ? value.truncated.tasks : 0
    }
  };
}
function parseState(value) {
  if (!value || typeof value !== "object" || value.v !== STATE_VERSION || !isCount(value.inherited) || !isDigest(value.cwd) || !Array.isArray(value.items) || value.items.length > ITEMS_MAX || value.items.filter((item) => item?.tier === "full").length > FULL_MAX || !value.pending || typeof value.pending !== "object" || Array.isArray(value.pending) || !value.approvals || typeof value.approvals !== "object" || Array.isArray(value.approvals) || !value.unattributed || typeof value.unattributed !== "object" || !value.truncated || typeof value.truncated !== "object") {
    throw new Error("Invalid progress ledger checkpoint");
  }
  const pending = {};
  for (const [id, call] of Object.entries(value.pending)) {
    if (call && typeof call.name === "string" && isCount(call.seq) && Array.isArray(call.keys) && call.keys.every(isDigest) && Array.isArray(call.paths) && call.paths.every(isPath)) {
      pending[id] = { name: call.name, keys: [...call.keys], paths: [...call.paths], seq: call.seq };
    }
  }
  const approvals = {};
  for (const [id, itemId] of Object.entries(value.approvals)) {
    if (isCount(itemId) || itemId === null) approvals[id] = itemId;
  }
  return {
    v: STATE_VERSION,
    inherited: value.inherited,
    cwd: value.cwd,
    firstSeq: isCount(value.firstSeq) ? value.firstSeq : null,
    asOfSeq: isCount(value.asOfSeq) ? value.asOfSeq : value.inherited,
    turn: isCount(value.turn) ? value.turn : 0,
    turnOpen: value.turnOpen === true,
    items: value.items.map(parseItem),
    pending,
    approvals,
    unattributed: {
      calls: isCount(value.unattributed.calls) ? value.unattributed.calls : 0,
      failures: isCount(value.unattributed.failures) ? value.unattributed.failures : 0,
      jobs: isCount(value.unattributed.jobs) ? value.unattributed.jobs : 0
    },
    truncated: {
      items: isCount(value.truncated.items) ? value.truncated.items : 0
    }
  };
}
var itemViewCache = /* @__PURE__ */ new WeakMap();
var stateViewCache = /* @__PURE__ */ new WeakMap();
function cachedItemView(item, index, state) {
  const key = index === 0 ? { item, isCurrent: true, turnOpen: state.turnOpen } : null;
  if (index !== 0) {
    let view3 = itemViewCache.get(item);
    if (view3 === void 0) {
      view3 = itemView(item, index, state);
      itemViewCache.set(item, view3);
    }
    return view3;
  }
  if (key !== null && item.tier === "full") {
    let slot = itemViewCache.get(item);
    if (slot === void 0 || slot.turnOpen !== state.turnOpen) {
      slot = { turnOpen: state.turnOpen, view: itemView(item, index, state) };
      itemViewCache.set(item, slot);
    }
    return slot.view;
  }
  let view2 = itemViewCache.get(item);
  if (view2 === void 0) {
    view2 = itemView(item, index, state);
    itemViewCache.set(item, view2);
  }
  return view2;
}
function view(state) {
  let v = stateViewCache.get(state);
  if (v !== void 0) return v;
  v = {
    v: 1,
    asOfSeq: state.asOfSeq,
    inherited: state.inherited,
    coverage: { firstSeq: state.firstSeq, lastSeq: state.asOfSeq },
    unattributed: state.unattributed,
    truncated: state.truncated,
    items: state.items.map((item, index) => cachedItemView(item, index, state))
  };
  stateViewCache.set(state, v);
  return v;
}
var viewSchema = {
  parse(value) {
    if (!value || typeof value !== "object" || value.v !== 1 || !Array.isArray(value.items)) {
      throw new Error("Invalid progress ledger view");
    }
    return value;
  }
};
var progressLedger = {
  key: LEDGER_KEY,
  stateVersion: STATE_VERSION,
  stateSchema: { parse: parseState },
  init: (header, inherited) => ({
    v: STATE_VERSION,
    inherited,
    cwd: digest(header?.cwd ?? ""),
    firstSeq: null,
    asOfSeq: inherited,
    turn: 0,
    turnOpen: false,
    items: [],
    pending: {},
    approvals: {},
    unattributed: { calls: 0, failures: 0, jobs: 0 },
    truncated: { items: 0 }
  }),
  apply,
  wire: { viewSchema, view, summary: false }
};

// src/host/read-progress.js
var MAX_BYTES = 16 * 1024;
var OVERVIEW_MAX_LINES = 80;
var READ_PROGRESS_NAME = "read_progress";
var clip = (text) => {
  const buf = Buffer.from(text, "utf8");
  return buf.length <= MAX_BYTES ? buf.toString("utf8") : `${buf.subarray(0, MAX_BYTES - 40).toString("utf8")}
[truncated at 16 KiB]`;
};
var taskDone = (item) => item.tier === "full" ? item.tasks.filter((task) => task.status === "completed").length : 0;
function overview(view2) {
  const items = view2.items ?? [];
  const full = items.filter((item) => item.tier === "full");
  const skeletons = items.filter((item) => item.tier === "skeleton");
  const lines = [
    `asOfSeq ${view2.asOfSeq} \xB7 ${items.length} work items (${full.length} full, ${skeletons.length} skeleton)`
  ];
  for (const item of items.slice(0, OVERVIEW_MAX_LINES)) {
    const counts = item.counts ?? {};
    const tasks = item.tier === "full" ? `${taskDone(item)}/${item.tasks.length}` : `${counts.tasks ?? 0}`;
    lines.push(`item ${item.firstSeq} \xB7 ${kindWord(item.kind)} \xB7 ${item.status} \xB7 tasks ${tasks} \xB7 files ${counts.files ?? 0} \xB7 unresolved failures ${counts.failures ?? 0}`);
  }
  const un = view2.unattributed ?? { calls: 0, failures: 0, jobs: 0 };
  const coverage = view2.coverage ?? { firstSeq: null, lastSeq: view2.asOfSeq };
  lines.push(`cumulative \xB7 ${items.length} items (${full.length} full, ${skeletons.length} skeleton) \xB7 unattributed ${un.calls} calls, ${un.failures} failures, ${un.jobs} jobs \xB7 coverage seq ${coverage.firstSeq ?? "none"}\u2013${coverage.lastSeq}`);
  return clip(lines.join("\n"));
}
function itemDetail(view2, itemId) {
  const item = (view2.items ?? []).find((entry) => entry.firstSeq === itemId);
  if (item === void 0) {
    throw new Error(`Unknown work item ${itemId}. Omit item for the overview.`);
  }
  if (item.tier !== "full") {
    const counts = item.counts ?? {};
    return clip(`item ${item.firstSeq} \xB7 ${kindWord(item.kind)} \xB7 ${item.status} \xB7 skeleton: calls ${counts.calls ?? 0}, failures ${counts.failures ?? 0}, files ${counts.files ?? 0}, tasks ${counts.tasks ?? 0} \xB7 detail not retained`);
  }
  const lines = [`item ${item.firstSeq} \xB7 ${kindWord(item.kind)} \xB7 ${item.status}`];
  for (const task of item.tasks) {
    lines.push(`task ${task.status} ${task.content}`);
  }
  for (const file of item.files) {
    lines.push(`file ${file.path} seq ${file.firstSeq}${file.lastSeq !== file.firstSeq ? `\u2013${file.lastSeq}` : ""}`);
  }
  for (const failure of item.failures) {
    const path = failure.path ?? "-";
    const seqs = failure.firstSeq === failure.lastSeq || failure.lastSeq === void 0 ? `${failure.firstSeq ?? failure.seq}` : `${failure.firstSeq ?? failure.seq}\u2013${failure.lastSeq}`;
    lines.push(`failure ${failure.tool} ${path} \xD7${failure.count ?? 1} seq ${seqs}`);
  }
  const unresolved = item.failures.reduce((total, f) => total + (f.count ?? 1), 0);
  const recovered = Math.max(0, (item.counts?.failures ?? unresolved) - unresolved);
  if (recovered > 0) lines.push(`recovered failures: ${recovered}`);
  if (item.truncated !== void 0) {
    const extra = (item.truncated.files ?? 0) + (item.truncated.failures ?? 0) + (item.truncated.tasks ?? 0);
    if (extra > 0) lines.push(`\u53E6\u6709 ${extra} \u6761\u672A\u4FDD\u7559`);
  }
  return clip(lines.join("\n"));
}
function viewOfSession(ledger, session) {
  const state = ledger.stateOf(session);
  if (state === void 0) return void 0;
  return ledger.wire?.view === void 0 ? state : ledger.wire.view(state);
}
function makeReadProgressDefinition(ledger) {
  return {
    name: READ_PROGRESS_NAME,
    description: "Read this session's progress record: work items started by user requests, goals, and scheduled tasks, with their tasks, changed files, and tool failures that no later identical call fixed. Omit item for an overview of recent work items; pass an item id from the overview for its details.",
    parameters: {
      type: "object",
      properties: {
        item: {
          type: "integer",
          minimum: 0,
          description: "Work item id from the overview. Omit for the overview."
        }
      },
      additionalProperties: false
    },
    output: { schema: { type: "string" } },
    isConcurrencySafe: () => true,
    presentCall: (args) => args?.item === void 0 || args?.item === null ? "\u67E5\u770B\u8FDB\u5EA6\u6982\u89C8" : `\u67E5\u770B\u5DE5\u4F5C\u9879 ${args.item}`,
    presentResult: () => "\u67E5\u770B\u8FDB\u5EA6",
    when: ({ agent }) => {
      if (agent === void 0 || agent === null) return false;
      const state = ledger.stateOf(agent.session);
      return state !== void 0 && Array.isArray(state.items) && state.items.length > 0;
    },
    execute(args, exec) {
      const session = exec?.agent?.session;
      if (session === void 0) {
        throw new Error("read_progress: no session context for this call");
      }
      const view2 = viewOfSession(ledger, session);
      if (view2 === void 0) {
        throw new Error("read_progress: no ledger for this session");
      }
      return args?.item === void 0 || args?.item === null ? overview(view2) : itemDetail(view2, args.item);
    }
  };
}

// src/host/index.js
var name = "nano-progress-report";
var inject = ["sessionProjections", "systemPrompt", "agents", "tools"];
async function apply2(ctx) {
  let disposed = false;
  ctx.effect(() => () => {
    disposed = true;
  });
  const ledger = await ctx.sessionProjections.register(progressLedger);
  if (disposed) return;
  const definition = makeReadProgressDefinition(ledger);
  ctx.tools.register(definition);
  ctx.systemPrompt.context({
    name: "nano-progress-report:progress",
    order: 180,
    required: false,
    interpolate: false,
    text: ({ agent }) => {
      if (agent === void 0 || agent === null) return "";
      const session = agent.session;
      const state = ledger.stateOf(session);
      if (state === void 0) return "";
      const view2 = ledger.wire.view(state);
      const todos = ctx.sessionProjections.snapshot(session, ["todos"]).values.todos ?? [];
      let runningJobs = 0;
      for (const job of ctx.get("jobs")?.list(session.id) ?? []) {
        if (job.owner === session.id && (job.status === "running" || job.status === "stopping")) runningJobs += 1;
      }
      let runningSubagents = 0;
      for (const child of ctx.agents.list()) {
        if (child.status === "running" && child.session.header.origin === "subagent" && child.session.header.parentSession === session.id) runningSubagents += 1;
      }
      return formatProgress({ view: view2, todos, runningJobs, runningSubagents });
    }
  });
}
export {
  apply2 as apply,
  inject,
  name
};
