# mcp-bridge — `sandbox.*` 原生工具与桥健康

`ws://127.0.0.1:<mcpPort>/mcp` 是容器内 WebSocket→`agent-browser mcp` 桥，不是 HTTP API。`kite.mcpPort` 只在新容器创建时变，`configure` 单独不改它。

## 帧与握手

MCP-over-WS：**每个文本帧一条完整 JSON-RPC**，无 `\n` 终止符（帧内 `\n` 仅兼容批量）。`agent-browser mcp` 模式直接对 newline-delimited initialize 应答。裸 JSON-RPC 走 WS 时按帧发，不要依赖尾部 `\n`。

`GET http://127.0.0.1:<mcpPort>/health`（plain HTTP，Origin allowlisted）报 `{ ok, mcp, conns, accepted, rejected, uptimeMs, control, diagnosticsPushedAt }`——把 agent 指到 `ws://…/mcp` 前先验它。

## `sandbox.*` 原生工具（33 个 `agent_browser_*` 之外）

宿主每 15s（失败时立即）把诊断快照推给桥，工具读这份推送。

> **面划分（真源）**：WS 桥暴露读/诊断 + 写锁共 15 个 `sandbox.*`（`sandbox.control` 的 status/claim/release/takeover 都在 WS 上）。**没有的是容器/实例管理面**——`sandbox.instance.ensure`、`sandbox.profile.*`、`sandbox.state`、`sandbox.evaluate`、`sandbox.settings` 等宿主 HTTP MCP 工具 **不在 WS 上**，要走宿主的鉴权 HTTP 路由 `/nano-local-sandbox/*`（或宿主 HTTP MCP）。同名工具语义一致（读同一份推送文档），目录大小不同是刻意的：WS agent 没有容器/实例管理权。写页面行为统一走 `agent_browser_*`（click/type/navigate/eval/…），受写锁约束；`sandbox.interact` 只在写锁判定里出现，不是可调用工具。

| 工具 | 作用 |
|---|---|
| `sandbox.diagnostics` | 一击全量诊断（**先调它**，给 `hints`） |
| `sandbox.console` | 页面 console/exception/network 环形缓冲 |
| `sandbox.operations` | 每次路由调用 trace（route/status/errorId/耗时） |
| `sandbox.error_catalog` | errorId→status→原因→下一步整表 |
| `sandbox.targets` | 引擎 Target.getTargets（附着页） |
| `sandbox.history` | 持久浏览历史最近 30 条 |
| `sandbox.dom` | 最后抓取的 DOM 文本（推送，非 live） |
| `sandbox.elements` | 最后抓取的元素列表（推送） |
| `sandbox.snapshot` | a11y-lite 树 + `@N` ref 表 + treePreview（推送，`liveSnapshot`/`resolveRef` 指 host 路由） |
| `sandbox.control` | 写所有权 `{action:status|claim|release|takeover}`（`self={connId,clientName}`） |
| `sandbox.selftest` | 引擎健康自检结果 |
| `sandbox.network` | 网络生命周期最近项 |
| `sandbox.ports` | 端口报告：configured/effective/container.published/free/lastRepair |
| `sandbox.recovery_plan` | 分步自愈计划 |
| `sandbox.bridge_health` | 桥自身 liveness |

推送是**快照**（非 live）。`kitesurf.diag.stale` = 宿主还没推：等几秒或先在已登录页面 `GET /nano-local-sandbox/diagnostics` 让宿主推一份。`snapshot`/`dom`/`elements`/`history` 同理（`*` 各自的 `.stale`）——live 值永远走宿主路由。

MCP 的 `-32601/-32602/-32700` 是 JSON-RPC 协议错，`kitesurf.*` 是业务错，互不等价。

## 写所有权（`sandbox.control`）

人机共存时同一页面只能一个写者。`claim` 认领、`release` 释放、`status` 读当前 writer。锁是**粘性**的：首写/`claim` 认领，`release`/断线才放；`B` 在非 owner 时写被 `kitesurf.control.busy` 拒（**拒非排队**），`B release` 不偷锁。

## 人工接管（humanHold / takeover）— HITL

`takeover` 是**人工专属**的抢占：置 `humanHold.active` 并**驱逐**当前 writer。之后**所有**非 owner（`clientInfo.name` ≠ `humanHold.owner`）的 agent 写类 `tools/call` 被拒 `kitesurf.control.held`（**拒非排队**，比 busy 更高一级——不是「另一个 writer」，是「人在开」）。`status`/`sandbox.*` 读不受限。owner 自己写放行（pane 用 `owner:'kitesurf-pane'`）。

- 人在 pane 点「接管」= `POST /control {action:takeover, owner:'kitesurf-pane'}`；点「停止写入」=`{action:release}`。等价 MCP 路径是 `sandbox.control {action:takeover}`（给在 WS 内的人工侧 client，agent 不应调 takeover——它是人工动作）。
- **幂等**：重复 `takeover`/`release` 同结果幂等；`release` 只清 hold、不偷回 writer（writer 由下次写重争）。
- **竞态**：hold 置位与在飞写入不互斥——在飞的 `tools/call` 正常完成（写入已发生），**下一次**写才被拒；`humanHold` 不绑定 socket，持锁 writer 断线 hold 仍在。
- **re-take**：`release` 后 hold 清除，agent 下次写自动重争 writer（粘性锁照旧）。
- `lastAction` = 最后一次**放行**的写 `{tool,owner,at,ok}`；held/busy 的拒绝**不**记 `lastAction`（记了会骗 pane 有动作）。pane 轮询渲染为动作 toast。
- `POST http://127.0.0.1:<mcpPort>/control` 接受 `{action,owner?,note?}`，GET 返回同 `sandbox.control status`；`/health` 里 `control.{writer,owner,humanHold,lastAction,lastCallAt}`。
- agent 收到 `kitesurf.control.held`：**停写**，把控制权交还人；不要 retry 不要 `claim`——`claim` 在 hold 下被 `kitesurf.control.held` 拒（owner ≠ 你）。等 `status` 里 `humanHold.active:false` 再继续。
