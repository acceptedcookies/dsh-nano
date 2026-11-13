# Route inventory — 35 active host routes + retired NSW history

> **⛔ DEPRECATED（2026-11-12）**：`dsh-nano-shared-workspace` 已退役并移至 [`deprecated/`](../deprecated/README.md)。本文件保留它的历史清单**仅供回溯**；现行活跃路由是 notepad 7 + explorer-extra 17 + model-selector 3 + kitesurf 8 = **35 条**。`security/route-sensitivity.json` 与 `security/feature-contract.json` 已移除 NSW 条目，`scripts/route-scan.mjs` 不再扫描它。

Static enumeration of every `webServer.register` path across the (formerly four) plugins, in registration order. Source of truth for paths/methods/bodyLimit: `scripts/route-scan.mjs` → `security/route-sensitivity.json` (sensitivity) and `security/feature-contract.json` (contract). Re-run `node scripts/gen-route-sensitivity.mjs` after any registration change; `node scripts/check-route-sensitivity.mjs` must report 0 drift.

`bodyLimit` = route-level cap (max over methods; GET/HEAD accept no body). `session` = takes a sessionId. Sensitivity per T-O-2: L0 read-only/no-secret · L1 bounded workspace write · L2 host-level capability · L3 operator config (none — no page route is operator-only).

## dsh-nano-notepad — 7 (`index.js:60-66` constants, all POST)

| path | methods | sensitivity | capability | bodyLimit | session | what it does |
|---|---|---|---|---|---|---|
| /nano-notepad/save | POST | L2 | write:host | 8388608 | – | native save dialog (osascript) → write chosen path |
| /nano-notepad/read | POST | L2 | read:host | 8388608 | – | read any UTF-8 host text file ≤2MiB |
| /nano-notepad/fetch-mp | POST | L2 | net:fetch | 8388608 | – | outbound fetch of mp.weixin.qq.com article |
| /nano-notepad/s3/status | POST | L2 | s3:credentials | 33554432 | – | active profile + ledger (accessKeyId, endpoint) |
| /nano-notepad/s3/test | POST | L2 | credential:probe | 33554432 | – | signed S3 probe with stored creds |
| /nano-notepad/s3/object | POST | L2 | s3:write | 33554432 | – | generic signed S3 get/put/delete/head |
| /nano-notepad/s3/config | POST | L2 | s3:credentials | 33554432 | – | write endpoint/bucket/secret profiles (0600) |

## dsh-nano-explorer-extra — 17 (`src/host/routes.js` route map)

| path | methods | sensitivity | capability | bodyLimit | session | what it does |
|---|---|---|---|---|---|---|
| /nano-explorer-extra/status | GET | L0 | proc:git | 0 | ✓ | git status/stats for a session workspace |
| /nano-explorer-extra/commit | POST | L2 | proc:git | 65536 | ✓ | git add --all + commit (host exec) |
| /nano-explorer-extra/pull | POST | L2 | proc:git | 65536 | ✓ | git pull --ff-only (exec + net) |
| /nano-explorer-extra/push | POST | L2 | proc:git | 65536 | ✓ | git push [-u remote HEAD] (exec + net) |
| /nano-explorer-extra/remote | POST | L2 | proc:git | 65536 | ✓ | git remote add/set-url/remove (exec) |
| /nano-explorer-extra/author | POST | L1 | proc:git | 65536 | ✓ | git config user.name/email (repo-local) |
| /nano-explorer-extra/ssh-key | POST | L1 | proc:git | 65536 | ✓ | core.sshCommand bind in .git/config |
| /nano-explorer-extra/checkout | POST | L2 | proc:git | 65536 | ✓ | git checkout (exec, may trigger filters) |
| /nano-explorer-extra/create-file | POST | L1 | write:workspace | 65536 | ✓ | create file in workspace |
| /nano-explorer-extra/create-folder | POST | L1 | write:workspace | 65536 | ✓ | mkdir in workspace |
| /nano-explorer-extra/rename | POST | L1 | write:workspace | 65536 | ✓ | rename in workspace |
| /nano-explorer-extra/move | POST | L1 | write:workspace | 65536 | ✓ | move in workspace |
| /nano-explorer-extra/delete | POST | L1 | write:workspace | 65536 | ✓ | delete in workspace (root refused) |
| /nano-explorer-extra/ignored | POST | L0 | read:workspace | 65536 | ✓ | git check-ignore read |
| /nano-explorer-extra/list | POST | L2 | read:host | 65536 | ✓ | list arbitrary host dir (unfenced) |
| /nano-explorer-extra/perf-review/host | GET | L2 | read:host | 0 | – | process-global perf snapshot/window drain |
| /nano-explorer-extra/read | POST | L2 | read:host | 65536 | ✓ | read any UTF-8 host file ≤1MiB |

## dsh-nano-kitesurf — 9 (`index.js` route constants + spec array)

| path | methods | sensitivity | capability | bodyLimit | session | what it does |
|---|---|---|---|---|---|---|
| /nano-kitesurf/status | GET, HEAD | L0 | read:kitesurf | 0 | – | probe engine /health + kite phase |
| /nano-kitesurf/last | GET, HEAD | L2 | read:host | 0 | – | last pick element packet (page content) |
| /nano-kitesurf/open | POST | L2 | net:kitesurf | 4096 | – | Page.navigate the engine to a URL |
| /nano-kitesurf/shot | POST | L2 | read:host | 4096 | – | Page.captureScreenshot (page content) |
| /nano-kitesurf/history | POST | L2 | net:kitesurf | 4096 | – | Page.getNavigationHistory + navigateToHistoryEntry (real back/forward) |
| /nano-kitesurf/pick | POST | L2 | read:host | 4096 | – | Runtime.evaluate element probe (click, selector nav, preview) |
| /nano-kitesurf/edit | POST | L2 | write:engine | 8192 | – | Runtime.evaluate live text edit on a named element |
| /nano-kitesurf/settings | POST | L1 | write:kitesurf | 4096 | – | in-memory UA/viewport emulation |
| /nano-kitesurf/perf-review/host | GET, HEAD, POST | L2 | read:host | 0 | – | perf snapshot; POST mode=window drains |
| /nano-kitesurf/kite | POST | L2 | proc:kitesurf | 4096 | – | init lock / container start-stop / configure |
| /nano-kitesurf/console | GET, HEAD, POST | L2 | read:host | 4096 | – | page console/exception/network ring; POST clear |
| /nano-kitesurf/operations | GET, HEAD, POST | L2 | read:host | 4096 | – | every route call trace (status/errorId/duration); POST clear |
| /nano-kitesurf/diagnostics | GET, HEAD | L2 | read:host | 0 | – | one-shot status + targets + console + trace + error catalogue + hints |
| /nano-kitesurf/targets | GET, HEAD | L2 | read:host | 0 | – | Target.getTargets (page target ids/urls) |
| /nano-kitesurf/evaluate | POST | L2 | write:engine | 4096 | – | bounded Runtime.evaluate in the engine page |
| /nano-kitesurf/ports | GET, HEAD | L2 | read:host | 0 | – | configured vs effective ports, publishedPorts, occupancy, last repair |
| /nano-kitesurf/recover | POST | L2 | proc:kitesurf | 4096 | – | suspend+resume self-heal, returns engine state |

## ⛔ DEPRECATED · dsh-nano-shared-workspace — 21（历史，非现行）

> 该插件 2026-11-12 退役，源码在 [`deprecated/dsh-nano-shared-workspace/`](../deprecated/README.md)。以下 21 行**不再是门禁输入**，请勿据此更新 `route-sensitivity.json` / `feature-contract.json`。

| path | methods | sensitivity | capability | bodyLimit | session | what it does |
|---|---|---|---|---|---|---|
| /nano-shared-workspace/settings | GET | L0 | credential:read | 0 | – | masked identity + endpoint/bucket/region |
| /nano-shared-workspace/settings/test | POST | L2 | credential:probe | 65536 | – | signed S3 LIST probe with creds |
| /nano-shared-workspace/settings/update | PUT | L2 | credential:write | 65536 | – | write identity to credentials store |
| /nano-shared-workspace/settings/clear | POST | L2 | credential:write | 65536 | – | delete stored identity |
| /nano-shared-workspace/status | GET | L0 | read:host | 0 | – | local sync/status probe |
| /nano-shared-workspace/workspaces | GET | L0 | s3:read | 0 | – | list member workspaces (markers) |
| /nano-shared-workspace/workspaces/create | POST | L2 | s3:write | 65536 | – | PUT new workspace marker |
| /nano-shared-workspace/workspaces/join | POST | L2 | write:host | 65536 | – | CAS merge member row into marker |
| /nano-shared-workspace/workspaces/delete | POST | L2 | s3:write | 65536 | – | delete cloud marker after member check |
| /nano-shared-workspace/sync | POST | L2 | s3:write | 65536 | – | trigger signed sync cycle |
| /nano-shared-workspace/tree/pull | POST | L2 | write:host | 65536 | – | write remote tree (incl .git) to localPath |
| /nano-shared-workspace/tree/push | POST | L2 | s3:write | 65536 | – | read replica + PUT generations |
| /nano-shared-workspace/sessions/bind | POST | L2 | write:host | 65536 | ✓ | bind session to workspace/localPath |
| /nano-shared-workspace/sessions/claim | POST | L2 | s3:write | 65536 | ✓ | acquireClaim write to S3 (ETag CAS) |
| /nano-shared-workspace/sessions/heartbeat | POST | L2 | s3:write | 65536 | ✓ | renew lease + heartbeatRev |
| /nano-shared-workspace/sessions/lease | POST | L2 | s3:write | 65536 | ✓ | mutate remote lease/expiresAt |
| /nano-shared-workspace/sessions | GET | L0 | s3:read | 0 | – | list remote session records |
| /nano-shared-workspace/mkdir | POST | L2 | write:host | 65536 | – | mkdir at any writable absolute path |
| /nano-shared-workspace/ls | POST | L2 | read:host | 65536 | – | list any absolute host path |
| /nano-shared-workspace/transcript | POST | L2 | s3:read | 65536 | ✓ | fetch/decompress remote session body |
| /nano-shared-workspace/materialize | POST | L2 | write:host | 65536 | ✓ | write remote session into local tree |

## dsh-nano-model-selector — 3 (`index.js:28-30` constants)

| path | methods | sensitivity | capability | bodyLimit | session | what it does |
|---|---|---|---|---|---|---|
| /nano-model-selector/catalog | GET, HEAD | L0 | read:host | 0 | – | enriched LLM model catalog |
| /nano-model-selector/media-engines | GET, HEAD | L0 | read:host | 0 | – | scan local media CLIs |
| /nano-model-selector/media-engine | GET, HEAD, PUT | L2 | write:host | 16384 | – | GET engine state; PUT writes media-engine.json + re-registers /imagine |

**历史 Totals（含退役 NSW 节）: 55 paths · 现行活跃 = 35 条（L0 5 · L1 8 · L2 22 · L3 0 — 口径见 route-sensitivity.json）。** bodyLimit values: notepad /save+/read+/fetch-mp = MAX_SAVE_BYTES 8388608 (8 MiB), /s3/* = MAX_S3_BODY_BYTES 33554432 (32 MiB); explorer + nsw = 64 KiB (65536); model-selector GET/HEAD = 0, /media-engine PUT = 16384.
