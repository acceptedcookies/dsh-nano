# scripts/eval — 共享工作区端到端评估脚本（已归档）

> **⛔ DEPRECATED（2026-11-12）**：`dsh-nano-shared-workspace` 已由 [业主] 裁决退役，源码移至 [`deprecated/dsh-nano-shared-workspace/`](../../deprecated/README.md)。本目录全部脚本都是为它写的双端评估（`dsh-dev.local` + desktop），`lib.mjs` / `join-cas.mjs` 的源码 import 已改指归档路径。
>
> - **不再纳入 CI、不参与发布门禁、不作为现行能力的验收依据。**
> - `clients.mjs` / `desktop-auth.mjs` 里的 `PREFIX = '/nano-shared-workspace'` 是当时的 HTTP 路由前缀，保留供历史复现；现行宿主不应再注册这些路由。
> - 历史执行记录见 [`docs/eval/26-nov/DNSW-1112-automation.md`](../../docs/eval/26-nov/DNSW-1112-automation.md)。

| 脚本 | 当时的用途 |
|---|---|
| `clients.mjs` / `desktop-auth.mjs` / `desktop-cdp.mjs` | dev + desktop 双端 HTTP 客户端与鉴权 |
| `lib.mjs` | `.env.s3` 装载、S3 客户端、round-trip 助手 |
| `multi-user-files.mjs` | 双端文件同步 26 条回归（最后一轮 26/26 PASS） |
| `multi-user-leases.mjs` / `join-cas.mjs` / `race-markers.mjs` | claim 租约、marker CAS、竞态 |
| `session-sync.mjs` / `negative-cases.mjs` / `scale-and-perf.mjs` | 会话同步、负例、规模与性能 |
