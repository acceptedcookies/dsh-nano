# dnls-observe-pty 台账

工作树 `.agents/worktrees/dnls-observe-pty`。不改冻结 QNA。不加第四门禁、第四种 SandboxMode、sandbox lane、308，也不恢复已经删掉的旧 kitesurf 路由前缀。容器 CLI 只在 `backend-apple.js`。

## P0

- P0-1 一份快照。`envSnapshot` 不再有 deep 开关。`/status` `/ports` `/diagnostics` `/recover` 与 MCP `sandbox.instance.status` `sandbox.ports` `sandbox.selftest` 返回同一份 `v` `epoch` `observedAt` `planes`。`ok` 只表示调用完成。能否打开页面只用 `ready`。selftest 的 11 项仍严格，并附上同一份快照。面 id：`container|engine|page|dom|bridge`。中文 label 只用于显示。
- P0-2 引擎存活是 CDP。`planes.engine.state` 只许 `down|http-only|cdp`。`live` 仅当 `Browser.getVersion` 在 1.5s 内返回。HTTP 成功且 CDP 失败是 `http-only`。`resetClient` 令 `cdpGeneration` 加一，并在网络环插入一条缺口。空闲超过 25s 才保活。`alive:false` 不得被短路当成可用。
- P0-3 [DNK] 面板只读快照的 `ready` 与 `planes`。禁止 `healthy && rowsOk`。`buildId` 取自同一份快照。1.5s 节拍（隐藏 12s），`epoch` 不变不重绘。未知 `v` 显示观察合同不匹配。

## P1

- P1-1 准备环境按面行动。缺失才创建，停止才启动，仅已在运行且 `http-only` 才 `stop+start` 一次。刚创建或刚启动的这一轮不 stop。空白页不重启。不调用 `backend.restart`。`/recover` 的 `action` 只许 `noop|created|started|restarted`。`ok:true` 不表示就绪。
- P1-2 一只容器。注册表不再从 20000 编端口，成功应答没有 `endpoints.terminal`。`heldBy` 只留 `this-container|free`。[DNK] `bringUp` 不再对 `127.0.0.1:8787/health` 判断健康。

## P2

- P2-1 八个 `term.session.*` 与二十个 `sandbox.*` 同挂 `/nano-local-sandbox/mcp`。`sessionId` 必填，不得变成 `term-1`。同一会话一张活动 PTY。`attach.protocol=dnt-ws-v1`，`attach.url` 是正在听的绝对地址。容器未运行或 `sandbox.instance.policy-stale` 不回 URL。快照的 `terminal` 面不参与 `ready`。
- P2-2 [DNT] `McpLane` 只接受绝对 `ws|wss`，不改 query，不降级 `wss`，不发送 `v:2`，传输重连至多一次。菜单去掉「新建隔离实例」，不再出现 `http://container:PORT/mcp`。
