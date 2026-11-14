# mcp-bridge — `sandbox.*` 原生工具与桥健康

`ws://127.0.0.1:<mcpPort>/mcp` 是容器内 WebSocket→`agent-browser mcp` 桥，不是 HTTP API。`kite.mcpPort` 只在新容器创建时变，`configure` 单独不改它。

## 帧与握手

MCP-over-WS：**每个文本帧一条完整 JSON-RPC**，无 `\n` 终止符（帧内 `\n` 仅兼容批量）。`agent-browser mcp` 模式直接对 newline-delimited initialize 应答。裸 JSON-RPC 走 WS 时按帧发，不要依赖尾部 `\n`。

`GET http://127.0.0.1:<mcpPort>/health`（plain HTTP，Origin allowlisted）报 `{ ok, mcp, conns, accepted, rejected, uptimeMs, control, diagnosticsPushedAt }`——把 agent 指到 `ws://…/mcp` 前先验它。

## `sandbox.*` 原生工具（33 个 `agent_browser_*` 之外）

宿主每 30s（失败时立即）把诊断快照推给桥，工具读这份推送。

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
| `sandbox.control` | 写所有权 `{action:status|claim|release}`（`self={connId,clientName}`） |
| `sandbox.selftest` | 引擎健康自检结果 |
| `sandbox.network` | 网络生命周期最近项 |
| `sandbox.ports` | 端口报告：configured/effective/container.published/free/lastRepair |
| `sandbox.recovery_plan` | 分步自愈计划 |
| `sandbox.bridge_health` | 桥自身 liveness |

推送是**快照**（非 live）。`kitesurf.diag.stale` = 宿主还没推：等几秒或先在已登录页面 `GET /nano-local-sandbox/diagnostics` 让宿主推一份。`snapshot`/`dom`/`elements`/`history` 同理（`*` 各自的 `.stale`）——live 值永远走宿主路由。

MCP 的 `-32601/-32602/-32700` 是 JSON-RPC 协议错，`kitesurf.*` 是业务错，互不等价。

## 写所有权（`sandbox.control`）

人机共存时同一页面只能一个写者。`claim` 认领、`release` 释放、`status` 读当前 writer。锁是**粘性**的：首写/`claim` 认领，`release`/断线才放；`B` 在非 owner 时写被 `kitesurf.control.busy` 拒（**拒非排队**），`B release` 不偷锁。
