> # ⛔ DEPRECATED — 2026-11-12
>
> 本插件已由 [业主] 裁决退役，整体移至 [`deprecated/dsh-nano-shared-workspace/`](../README.md)。
> **不再维护、不参与构建门禁、不进 tarball、不列入 [RELEASE.md] 的发布包清单，安装侧不要再 `dsh plugin add`。**
> 原因：对象级 S3 + 15s 轮询的拓扑无法适应多用户同步（成本 = 会话数 × WAN RTT，且 ≥15s 盲区）；方向改为 [spark] 本地中心点（`rshared` 共享卷做文件层 [单一真源] + SQLite/SSE 做状态协调）。
> 本文件以下内容是**退役时的历史快照**，仅供回溯，不代表现行能力或合同。
> 完整说明见 [`deprecated/README.md`](../README.md)。

# dsh-nano-shared-workspace

共享工作区：把 dsh 会话同步到 S3 真源（MinIO），多台客户端按 `username + Token` 身份访问同一 workspace 的远端会话列表。

规格：历史草案，见仓库根 `docs/specs/dsh-nano-shared-workspace/spec.md`（注意：插件移动后相对路径已变，按仓库根解析）。

## 当前形态（Phase-0 骨架）

- 侧栏「工作区」上方的镜像「共享工作区」区块（`shell.overlay` + DOM graft）
- 设置弹窗（`dsh-nano-ui` 的 `NanoDialog`）：用户名 / MinIO Token / 可选 accessKey
- 凭据走 `ctx.credentials`（`DSH_NSW_IDENTITY` / `DSH_NSW_USERNAME`，env 兜底）
- Host 路由：`GET/PUT /nano-shared-workspace/settings`、`POST /settings/clear`、`GET /status`

## 前置 / 构建

本包有两条构建期 `file:` 源码依赖，都不发布、不单独安装：已有的
`dsh-nano-ui`（`file:../packages/dsh-nano-ui`）与 `dsh-performance-review`
（`file:../packages/dsh-performance-review`）。`npm install` 把它们按
`<parent>/packages/<name>` 解析；`npm run build` 把 `dsh-nano-ui` 和
`dsh-performance-review/client` 打进 `lib/client.js`，把
`dsh-performance-review/host` 打进 `lib/host.js`。运行中的实例只读这两份
`lib/` 产物，不单独加载这两个包。改了 `src/` 后需重新构建。

`dsh-performance-review` 默认是恒等包装：开关关闭时 `join` / `span` / `track` /
`count` / `hostSpan` 都直接调原函数，不打点、不计时，功能路径与植入前一致。
浏览器侧 `?perf-review=1`（或 `localStorage['dsh-perf-review'] === '1'`）开启
客户端采集（`sidebar-graft` / `sidebar-dedupe` 常驻观察器、`hold` 心跳、以及
`section-render` / `apply-separate` 与 `section-open` / `workspace-join` 计数）；
宿主侧 `DSH_PERF_REVIEW=1` 开启路由墙钟采集（`sync-tick`、`settings`、
`remote-sessions`、`workspaces` 读路径）。两个开关彼此独立，默认都关闭。

```sh
npm install
npm run build
```

确认 `lib/client.js` 与 `lib/host.js` 非空后再分发。
