# DNLS v1.2 — 通用本地 Sandbox、DNT 终端接入与 DNK 浏览器驱动设计

> **文档类型**：架构分析 + 业主原则落地 + 工作分簇台账 + 测试收口设计
> **文档状态**：`draft — 待 [业主] 复核`（本文不直接产生实现承诺，不修改代码/配置/profile）
> **建档时间**：`2026-11-18 23:20`（Asia/Shanghai）
> **代码基线**：仓库 `main`，HEAD `55b5b6e04115671623d80f14c4823308f3b6a37e`
> **上游事实基线**：[dsh-nano-local-sandbox-v1.1.md](dsh-nano-local-sandbox-v1.1.md) · [DNLS01-qna.md](qna/DNLS01-qna.md) · [dsh-nano-local-sandbox-v0.9.md](dsh-nano-local-sandbox-v0.9.md)
> **读者**：[业主]、[DNLS]/[DNT]/[DNK] 后续实施 agent
> **边界**：本文只做设计、合规判断与工作锚定；任何公共合同（新 lane、新 route、新 error kind、新 tool 字段）必须由 [业主] 在 [真相层] durable 冻结后才进入实现。

---

## 0. 结论摘要

### 0.1 一句话结论

**[DNLS] 近期的方向是对的：从「Kitesurf 容器宿主」继续下沉为「本地通用 sandbox 平台 + Kitesurf profile driver」；但当前 `main@55b5b6e` 仍有大量 Kitesurf 业务语义直接写在 DNLS 核心，MCP 面仍存在第二套实现，DNT 的容器终端入口尚未形成正式的 DSH 层代理，DNK 也尚未拿到稳定的通用浏览器驱动合同。v1.2 的核心工作不是继续加 route，而是把「业务真源、通用合同、profile driver、终端代理」四条边界重新切干净。**

### 0.2 对五条原则的总体判断

| 原则 | 当前状态 | 结论 |
|---|---|---|
| 1. 真源唯一、各业务单元持有各自真源 | 部分合规 | `observe.js` 的快照方向正确；`mcp-sandbox.js` 的占位工具、DNK/DNT 各自另存的状态、DNT 写 DNLS 审计路径仍是第二真源 |
| 2. DNLS 是无状态 backend、承载多种业务、不得侧载 | 不合规 | DNLS `src/host` 直接包含 Kitesurf runtime/reconciliation/history/settings 语义；未来 xray/gateway/S3 无法在不改核心的情况下接入 |
| 3. 兄弟单位使用通用协议/接口 | 部分不合规 | `term.session.*` 与 `sandbox.*` 有通用外形，但字段/错误/身份仍是 DNLS 私有约定；DNT `McpLane`、DNK 的 route 常量与 profile 语义耦合 |
| 4. DNT 在合理授权下把 container terminal 代理到 DSH 层 | 未完成 | DNT 只有浏览器侧 `McpLane`，没有 DSH 宿主侧的 terminal proxy 入口；多 pane 会被 DNLS 的 `sessionId` key 合并成同一 PTY |
| 5. DNK 有足够接口和驱动支撑业务 | 部分完成 | DNK UI 依赖的浏览器能力大多已有路由，但 driver 仍在 DNLS 核心且 MCP 面大量占位，不足以称为稳定接口 |

### 0.3 本文回答什么

1. 回顾 `main@55b5b6e` 上近期 DNLS 升级的动因、代码影响与合规性。
2. 回顾 [DNT] 当前代码事实及其对 DNLS 内部直连 terminal 的要求。
3. 回顾 [DNK] 当前代码事实及其对 DNLS 接口/驱动的要求。
4. 把 [业主] 五条原则转成可验收的工程判据，指出当前合规、不合规、缺口与盲点。
5. 按业务簇建立完整工作清单（带 `file:line` 锚点）。
6. 给出本次工作新增/改动的测试与完整收口目标。

---

## 1. [业主] 心智模型与五条原则

### 1.1 原文记载

> 1. 真源只能有一份。各自业务单元持有各自的真源。所有的 contract 和 facade 通用相同的原则。但逻辑业务真源各自持有
> 2. 业务不能侧载。也就是说 DNLS 是一个本地通用的 sandbox，里面要承载多种业务，不止有 workerd 内运行的 kitesurf。所有功能，开发的考虑，必须基于 DNLS 是一个无状态的 backend，只作为我们其他插件的底层依靠
> 3. 兄弟单位通用。所有构建的协议，接口必须是通用的。这是上面业务不能侧载的具体表现。
> 4. 我们的 DNT 需要有入口可以在合理授权下，将 container 中的 terminal 代理到 deepseek-harness 层，并进行终端的操作
> 5. 我们的 DNK 层需要有足够的接口和驱动，能够支持其对应业务

### 1.2 原则的工程化拆解

| 编号 | 原则 | 工程语义 | 可验收判据 |
|---|---|---|---|
| P1 | 真源唯一、各业务单元持有各自真源 | 每个业务单元只有一份 canonical 可写状态；DNLS 不复制消费者的业务模型；消费者不复制 DNLS 的物理状态 | `observe.js` 只有一份快照；MCP/REST/bridge 不各自造布尔值；DNK 的 pins/notes、DNT 的 layout/ctx 只由各自宿主持有 |
| P2 | DNLS 是无状态 backend、承载多业务、不得侧载 | DNLS 只持有与 instance 绑定的运行态/物理状态，不持有 Kitesurf 或其他消费者的业务逻辑；新增业务 = 新增 profile driver，不改 DNLS 核心 | `src/host` 不得出现 `kitesurf` / `workerd` / `wrangler` / `agent-browser` 等业务词；`profiles/<id>/` 才是业务实现；profile 可插拔 |
| P3 | 兄弟单位通用协议/接口 | 所有跨插件通道都是登记过的通用合同；不 import 对方 `src/`、不硬编对方私有路径、不建立第三通道 | `spawn('container')` 只在 `backend-apple.js`；DNT 不 import DNLS；DNK 不 import DNLS；所有 route/tool 在 `security/feature-contract.json` 与 `lib/bindings.js` 登记 |
| P4 | DNT 有合理授权下的 container terminal → DSH 代理入口 | DNT 宿主能创建「代理终端」session，DNT 的 `term.*` 工具可对 container PTY 执行 `send/read/wait/keys/resize/close`；授权绑定到 DSH session/instance，不暴露裸 loopback | DNT 有正式 proxy 入口；鉴权失败 401；跨 session 拒绝；代理 session 有 owner/instanceId；浏览器不直接持有 attach token |
| P5 | DNK 有足够接口和驱动 | DNK 的浏览器业务（导航、截图、DOM、元素、设置、历史、网络、诊断、恢复）都能通过通用 driver 合同完成；不用 DNK 自己实现 engine/runtime | DNK 源码中不再有 container/runtime 代码；DNK 的每个 UI 行为都有对应 DNLS profile driver 合同；driver 契约测试覆盖 |

### 1.3 五个判据的优先顺序

当原则冲突时，按以下顺序裁决：

1. **P2（DNLS 通用、无状态）** 决定边界：不能为了一个消费者把 Kitesurf 语义写进 DNLS 核心。
2. **P1（真源唯一）** 决定数据放置：谁的业务谁持有，DNLS 只持有物理/运行态。
3. **P3（通用合同）** 决定接口形状：新增字段/route/tool 先登记，不从实现反推。
4. **P4（DNT 入口）** 和 **P5（DNK 驱动）** 是消费者需求，必须通过 P2/P3 的合同实现，不能反过来改变 DNLS 核心。

### 1.4 Contract 与 Facade 的共同规则

「所有的 contract 和 facade 通用相同的原则」在本设计中拆成五条硬规则：

| 规则 | 含义 | 反例（当前） |
|---|---|---|
| F1 合同是唯一形状 | 一份合同只有一份 schema/枚举/错误定义；HTTP、MCP、bridge 都是同一合同的 transport 投影 | `mcp-sandbox.js` 的 `sandbox.diagnostics` 与 REST `/diagnostics` 各自实现 |
| F2 Facade 只投影、不存储 | facade 可以裁剪/重组字段，但不得持有第二份可写状态或第二个健康布尔值 | 旧 `healthy && rowsOk`；`mcp-sandbox` 的 `state.diagnostics` |
| F3 业务单元持有自己的 facade | DNK 的 Design Mode facade 归 DNK；DNT 的 terminal facade 归 DNT；DNLS 只提供通用 sandbox facade | DNK 直接拼 `/nano-local-sandbox/*` 业务语义；DNT 写 DNLS audit |
| F4 跨插件只认合同 | 不 import 对方 `src/`；不硬编对方私有路径/端口；地址由 `instance.endpoints`/`attach.url` 动态返回 | DNT `McpLane` 没有 pane identity；DNK route 常量直接绑定 Kitesurf |
| F5 变更先登记 | 新 route、新 tool、新字段、新 lane、新 error kind 先写合同台账，再实现 | `term.session.create` 的 `lane/shell/title` 已 advertise 但未实现 |

---

## 2. 基线、近期升级与代码事实

### 2.1 基线

| 项 | 值 |
|---|---|
| 仓库 | `/Users/seanz/Documents/dsh-plugins` |
| 分支 | `main` |
| HEAD | `55b5b6e04115671623d80f14c4823308f3b6a37e` |
| 工作树 | `main` 自身干净；`kitesurf-delivery-review` 工作树存在未提交改动（见 §2.3）；`main` 另有无关的 `dsh-nano-model-selector` 未提交改动，不属于本文范围 |
| 本文证据规则 | 所有 `file:line` 为 HEAD `55b5b6e` 快照；行号漂移时以「路径 + 符号名」为准 |

### 2.2 近期 DNLS 升级（按提交与当前代码锚点）

#### 2.2.1 `74d734f` — 观察快照单一化与容器内 PTY 终端

**动因**：旧的 `/status`、`/ports`、`/diagnostics` 与 MCP `sandbox.*` 各自维护 `ok/healthy/ready` 布尔值，面板用 `healthy && rowsOk` 二次合成，导致「容器 running 但页面不可用」仍显示 OK；同时 DNT 的 `term.session.*` 只有测试桩，没有真正容器 PTY。

**落地**：
- 新增 [observe.js](../../../dsh-nano-local-sandbox/src/host/observe.js#L30-L85)：`projectSnapshot` 统一输出 `v/epoch/observedAt/planes/ready/live/degraded/healthy`，`healthy` 直接等于 `ready`（[observe.js:75](../../../dsh-nano-local-sandbox/src/host/observe.js#L75)）。
- `ready` 不含 `terminal` 面（[observe.js:45-49](../../../dsh-nano-local-sandbox/src/host/observe.js#L45-L49)），终端缺席不会把环境灯打红。
- 新增 [term-bridge.js](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L23-L82) 与 [term-ws.js](../../../dsh-nano-local-sandbox/src/host/term-ws.js#L1-L160)：容器 PTY 经回环 WS，`attach.protocol='dnt-ws-v1'`。
- [backend-apple.js:236-257](../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L236-L257) 用宿主 Python PTY 包装 `container exec -it <name> /bin/sh`，`child.resize` 通过 fd 3 下发。

**影响**：
- DNK 面板改读 `planes`/`ready`（[dsh-nano-kitesurf/src/client/index.js:1882-1990](../../../dsh-nano-kitesurf/src/client/index.js#L1882-L1990)）。
- DNT `McpLane` 改为只接受绝对 `ws|wss`、至多重连一次、不发送 `v:2`（[dsh-nano-terminal/src/client/lanes.js:199-338](../../../dsh-nano-terminal/src/client/lanes.js#L199-L338)）。
- **未完成的部分**：`mcp-sandbox.js` 的 `sandbox.diagnostics/dom/targets/elements` 仍是占位（见 §2.2.6）；DNT `McpLane` 没有 pane 身份；DNLS `term.session.create` schema 仍不诚实（见 §3）。

#### 2.2.2 `ede7e45` — 终端错误沿用 DNT 冻结 kind、PTY resize、并发探测合并

**动因**：DNT 的 `term.*` 有 13 个稳定 error kind；DNLS 若发明自己的 `errorId`，DNT `decodeMcpReply` 无法稳定呈现。PTY 初始尺寸与后续 resize 必须真实到达容器内 PTY，否则 TUI 会错位。

**落地**：
- [term-bridge.js:7-13](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L7-L13) 使用 `needs_target/not_found/unavailable/spawn_failed` 及 HTTP 状态；`policy-stale` 保留 `sandbox.instance.policy-stale`（[term-bridge.js:27](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L27)）。
- [backend-apple.js:194-234](../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L194-L234) 的 `PTY_PY` 监听 fd 3，`spawnPtyProcess` 把 `rows cols` 写入 fd 3（[:245-256](../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L245-L256)）。
- `envSnapshot` 对同一会话的并发读取合并（见 `routes.js` 的 snapshot 缓存/单飞逻辑；该提交记录）。

**影响**：DNT 的 `McpLane` 能稳定显示「容器未运行 / spawn 失败 / 缺 session」三类错误；但 DNLS 的 `term.*` 仍只有 8 个工具，且没有 `term.session.stats`/`health`/`ctx` 等 DNT 全部能力（见 §3.3）。

#### 2.2.3 `9b6287f` — Kitesurf repin 官方 `39feadf`，适配收回 DNLS driver

**动因**：Kitesurf 之前在自己的 `runtime/` 里带本地补丁（history/KV），来源不可审计；DNK 的容器生命周期也与 DNLS 重叠。需要把 pin 改为官方提交、把 Kitesurf runtime/历史/设置适配收进 DNLS，DNK 退化为 UI。

**落地**（当前 HEAD 可见）：
- [profiles/kitesurf/profile.yaml:7-16](../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L7-L16)：`build.image` 绑定官方 pin `39feadf…` + 配方摘要；`checkout.ref` 同源；`digest` 固定。
- [kitesurf-runtime.js:47-100](../../../dsh-nano-local-sandbox/src/host/kitesurf-runtime.js#L47-L100)：`kitesurfImage` 拒绝 `:latest`；`kitesurfRuntimeRoot` 使用 `DSH_HOME/artifacts/kitesurf/<ref>/runtime`；`assertKitesurfRuntime` 校验 artifact receipt 和 runtime 文件；`kitesurfMounts` 只接受派生 runtime。
- [kitesurf-reconciliation.js:1-100](../../../dsh-nano-local-sandbox/src/host/kitesurf-reconciliation.js#L1-L100)：`recipeDrift` / `recreatePorts` 只看 profile 与 inspect 可观测字段，不因 `entrypoint` 的环境变量误判。
- [browser-history-adapter.js:1-101](../../../dsh-nano-local-sandbox/src/host/browser-history-adapter.js#L1-L101)：浏览历史投影/删除/清空，canonical 为 `session.history`。
- [browser-settings-adapter.js:1-190](../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L1-L190)：`viewport/userAgent/media/extraHeaders/locale/geolocation/colorScheme/cookies` 白名单与事务回滚。
- [routes.js:530-624](../../../dsh-nano-local-sandbox/src/host/routes.js#L530-L624)：`prepareEnvironment` 先校验 runtime/receipt，缺 runtime/image 不销毁旧容器；资源漂移才 recreate。
- [routes.js:802-874](../../../dsh-nano-local-sandbox/src/host/routes.js#L802-L874)：MCP owners 从同一 `session/deps/backend` 构造。

**影响**：
- **正向**：pin 官方化、runtime 与镜像可追溯、Kitesurf 的 history/settings 从 DNK 收进 DNLS，DNK 不再持有容器。
- **负向/未收口**：`kitesurf-runtime.js`、`kitesurf-reconciliation.js`、`browser-*-adapter.js` 仍在 `src/host/`，不是 `profiles/kitesurf/`；`src/host` 直接出现 `kitesurf` 业务词，违反 P2。见 §5。
- **交付缺口**：runtime 是 `DSH_HOME/artifacts/...` 的派生目录，当前包 `files` 不包含它；`assertKitesurfRuntime` 的失败关闭是对的，但安装/部署没有在包内闭环。

#### 2.2.4 `d375d46` / `9ded627` / `e1f94b0` / `9056d5b` / `11a07bf` — DNK DevTools / 模拟 / 网络

**动因**：DNK 的 `设置`、`Network`、`Console`、`Elements` 页面需要真实 driver 语义；旧实现只回显设置、只记录 requestStarted、没有 response body，导致 DNK 面板「看起来有字段、实际不生效」。

**落地**：
- [routes.js:1328-1344](../../../dsh-nano-local-sandbox/src/host/routes.js#L1328-L1344) `/settings` 调 `applyBrowserSettings`，返回真实 settings。
- [browser-settings-adapter.js:150-190](../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L150-L190) 事务性回滚；设置只在全部 CDP 成功后写入 `session`。
- [cdp-elements.js:232-375](../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L232-L375) Network 生命周期：requestWillBeSent / responseReceived / loadingFinished / loadingFailed；`resourceType`、`durationMs`、`encodedDataLength`、`redirectCount`。
- [routes.js:1450-1490](../../../dsh-nano-local-sandbox/src/host/routes.js#L1450-L1490) `/network` 支持 `limit/failedOnly/since`、`POST {clear:true}`；`/network?id=` 读响应体。
- [cdp-elements.js:175-375](../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L175-L375) `resetClient` 生成 `gap` 记录与 `cdpGeneration`，避免重连后把旧网络当连续。

**影响**：DNK 的 DevTools 数据来源更真实；但 `browser-settings-adapter` 的「设置回显 = 生效」历史问题只能靠真实 HTTP echo / page evaluation 测试防回归，不能只看返回值（见 §8 防假绿）。

#### 2.2.5 `b3fcccc` / `5da480b` / `62a5342`

- `b3fcccc`：容器规格只认 profile，资源漂移触发 recreate；当前 [routes.js:560-590](../../../dsh-nano-local-sandbox/src/host/routes.js#L560-L590) 使用 `recipe.resources`，不再接受 DNK config 的 cpus/memory。
- `5da480b`：`container logs` 截断用 `-n`，当前 [backend-apple.js:155-160](../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L155-L160) 是 `['logs','-n',tail,name]`。
- `62a5342`：DNK 引擎日志进面板；当前 `/logs` 路由见 [routes.js:1071-1087](../../../dsh-nano-local-sandbox/src/host/routes.js#L1071-L1087)。

这些是低风险的诊断/生命周期改进，方向正确；但 `/logs` 和 `/kite` 等仍是 Kitesurf 专属路由，后续应归入 profile driver（见 §7 CL-C）。

#### 2.2.6 当前 MCP `sandbox.*` 仍是第二套实现（重要缺口）

`mcp-sandbox.js` 的文档声称「每个工具都接真实 domain owner」，但 `buildOwners` 没有提供对应 owner：

| 工具 | 当前实现 | 事实 |
|---|---|---|
| `sandbox.diagnostics` | `o.state?.diagnostics ?? null`（[mcp-sandbox.js:69-72](../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L69-L72)） | `buildOwners` 没有 `state.diagnostics`，返回 `null`；REST `/diagnostics` 有完整文档 |
| `sandbox.console` | `o.state?.console?.tail?.()`（[:73-76](../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L73-L76)） | `session.console` 是数组，没有 `.tail()`；返回 `[]` |
| `sandbox.targets` | `o.targets?.list?.()`（[:85-88](../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L85-L88)） | `buildOwners.targets` 只返回 `{url: session.httpBase}`，不是 `Target.getTargets` |
| `sandbox.dom` | `o.page?.dom?.()`（[:93-96](../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L93-L96)） | `buildOwners.page.dom` 只返回 `{url: base}`，没有 DOM |
| `sandbox.elements` | `o.page?.elements?.()`（[:97-100](../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L97-L100)） | `buildOwners.page.elements` 返回 `null` |
| `sandbox.network` | `o.state?.network`（[:105-108](../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L105-L108)） | 直接返回原始数组，不筛 `gap`、不做 `failedOnly` |
| `sandbox.ports` | `o.ports?.list?.()`（[:109-112](../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L109-L112)） | `envSnapshot` 是真实快照，方向正确 |

这正是 P1「真源唯一」的反例：**HTTP 面是事实，MCP 面是另一个合成世界**。DNK delivery-review 工作树的 `diagnosticsPayload`/`buildOwners` 改写是正确方向，但尚未合入 HEAD（见 §2.3）。

### 2.3 DNK 发起的未合入工作树：`kitesurf-delivery-review`

当前 `main` 之外存在工作树 `.agents/worktrees/kitesurf-delivery-review`，其代码状态不是 `main` 的一部分：

- 工作树 HEAD 仍为 `55b5b6e`，但 `git status` 显示大量修改：`dsh-nano-local-sandbox/index.js`、`profiles/kitesurf/Dockerfile`、`profiles/kitesurf/mcp-bridge.mjs`、`profiles/kitesurf/profile.yaml`、`backend-apple.js`、`browser-settings-adapter.js`、`cdp-elements.js`、`mcp-sandbox.js`、`observe.js`、`routes.js` 以及多个测试。
- 主要改动：
  - `index.js` 新增 `startDiagnosticsPush(session, finalDeps)`，把诊断快照推给容器 bridge（工作树 `index.js:10-25`）。
  - `profiles/kitesurf/mcp-bridge.mjs` 新增 CDP relay：`AGENT_BROWSER_CDP=ws://127.0.0.1:8791/cdp`，所有 agent-browser 子进程共享一条 upstream engine socket 和一个 page（工作树 `mcp-bridge.mjs` 约 85-330 行）。
  - `routes.js` 新增 `diagnosticsPayload`（一个 diagnostics 文档）、`buildOwners.diagnostics.read`、真实 `page.dom/elements`、`lastDom`、`browserStatePath/persistBrowserState/restoreBrowserState`、console seq、network merge、`/evaluate` 真实 body 读取。
  - `browser-settings-adapter.js` 新增 pre-navigation shim、locale/geolocation/colorScheme 可清除、cookie 删除、capabilityNotes。
- 该工作树的审查文档 [1119-delivery-gaps.md](../../../.agents/worktrees/kitesurf-delivery-review/docs/specs/dsh-nano-kitesurf/1119-delivery-gaps.md) 的 verdict 是 **NOT READY FOR DELIVERY**；其 §2.1 记录 DNLS 当前离线套件 210/212（2 个失败）、DNK 74/74，并明确「9/9 GUI smoke 和 74/74 单测不能推翻本轮真实复现的阻断缺陷」。

**判断**：这批改动的技术方向（MCP/REST 同源、真实 MCP owner、共享 CDP 页、设置真实生效）值得吸收；但它们是 **DNK 在 DNLS 代码上的未提交写入**，不是已交付实现。v1.2 必须把它们当作「缺陷输入/候选实现」，由 DNLS 重新立项、评审、落合同，不能直接当作基线。

### 2.4 近期升级的净结论

| 维度 | 结论 |
|---|---|
| 物理 runtime | 明显进步：pin 官方、profile recipe、runtime receipt、reconciliation、缺资源失败关闭 |
| 浏览器 driver | 明显进步：settings/history/network/console 从 DNK 收回 DNLS；但代码位置仍在核心 |
| 观测 | 明显进步：单一 snapshot/epoch/ready；但 MCP 侧尚未同源 |
| 终端 | 基础正确：dnt-ws-v1、容器 PTY、错误 kind、resize；但 DNT 契约不完整、多 pane 身份缺失 |
| 治理 | 退步/风险：DNK 直接改 DNLS 核心 20+ 文件；DNLS 核心出现 Kitesurf 业务词；MCP 第二真源 |

---

## 3. [DNT] 当前代码事实与对 DNLS 的要求

### 3.1 DNT 当前事实

DNT 近期已经形成了完整的「终端产品面」：`/nano-terminal` 是 canonical slash 命令，`term.*` MCP 工具约 25 个，支持 `term.ctx` 的 `[ DNT:{conv8}@{term8} ]` 引用、busy 状态、pinned/busy 关闭二次确认、`term.session.stats/health/audit/events`，`LocalLane` 使用 `dnt-ws-v2` framed channel。**这些是 DNT 自己的业务真源/业务能力，不属于 DNLS；DNLS 只需提供 DNT `McpLane` 消费的通用 terminal server 合同。** 下面只列与 DNLS 直连相关的代码事实。

1. **DNT 只有 `local` / `mcp` 两条客户端 lane，没有 `sandbox` / `isolate` lane。** [dsh-nano-terminal/AGENTS.md](../../../dsh-nano-terminal/AGENTS.md#L147) 明确「两条 lane：local（宿主 subprocess.spawnTerminal） / mcp（连接远端 MCP terminal 端点，用返回的 attach.url）」。`term.session.create` 的 host 实现只接受 `lane: local`，其他 lane 返回 `incompatible`（[src/host/mcp.js:113-127](../../../dsh-nano-terminal/src/host/mcp.js#L113-L127)、[schema:50-57](../../../dsh-nano-terminal/schema/dnt-mcp.openrpc.json#L50-L57)）。

2. **`LocalLane` 与 `McpLane` 是两种协议。** `LocalLane` 走 `/dsh-nano-terminal/stream`，支持 `dnt-ws-v2`、credit、snapshot、align；`McpLane` 走远端 MCP HTTP endpoint，拿 `attach.url` 后使用 `dnt-ws-v1` 裸流（[src/client/lanes.js:60-180](../../../dsh-nano-terminal/src/client/lanes.js#L60-L180)、[:199-338](../../../dsh-nano-terminal/src/client/lanes.js#L199-L338)）。

3. **`McpLane` 的协议细节**：
   - `open()` POST `tools/call`，参数只有 `{cols, rows, sessionId}`（[:214-225](../../../dsh-nano-terminal/src/client/lanes.js#L214-L225)）。
   - 只取 `result.id`，要求 `attach.url` 是绝对 `ws|wss`（[:230-247](../../../dsh-nano-terminal/src/client/lanes.js#L230-L247)）。
   - WS `onopen` 发送文本 `{type:'open', session:id}`（[:267](../../../dsh-nano-terminal/src/client/lanes.js#L267)）。
   - 二进制直接作为 PTY 输出；文本 `ready/error/exit`；`resize` 发文本（[:268-316](../../../dsh-nano-terminal/src/client/lanes.js#L268-L316)）。
   - 断开后最多再重连一次，固定 2 秒；不重放已写字节（[:249-305](../../../dsh-nano-terminal/src/client/lanes.js#L249-L305)）。
   - `close()` 发送 `term.session.close`（[:318-331](../../../dsh-nano-terminal/src/client/lanes.js#L318-L331)）。

4. **DNT 的 MCP pane 是二等窗格**：tab 菜单对 `lane === 'mcp'` 禁用「复制终端上下文引用」（[NanoTerm.jsx:609-612](../../../dsh-nano-terminal/src/client/NanoTerm.jsx#L609-L612)）；`McpLane` 没有 `tid`/`conv`/`ctx`，而 `TermPane` 构造 lane 时只传 `cols/rows/sessionId`（[NanoTerm.jsx:917](../../../dsh-nano-terminal/src/client/NanoTerm.jsx#L917)）。

5. **DNT 宿主存在对 DNLS 的侧写**：`dsh-nano-terminal/index.js:39` 把 `auditPath` 设为 `join(home, 'nano-local-sandbox', 'term.audit')`。这违反「各业务单元持有各自真源」：DNT 的审计写进 DNLS 目录，DNLS 变成 DNT 的第二个状态持有者（或反过来）。

### 3.2 DNT 对 DNLS 的 terminal 要求（R-T 系列）

| ID | 要求 | 依据/当前状态 |
|---|---|---|
| R-T1 | DNLS 提供可配置的 MCP terminal server URL；DNT `McpLane` 只 POST JSON-RPC `tools/call`，不要求 DNT 知道 `/nano-local-sandbox/mcp` | 当前 `McpLane` 接受任意 `spec.url`；DNLS 有 `/nano-local-sandbox/mcp`，但 DNT 没有自动发现入口 |
| R-T2 | `term.session.create` 接收 DNT 的 `sessionId`（owner）和 `cols/rows`，返回 `{id, attach:{protocol:'dnt-ws-v1', url}}` | DNLS [term-bridge.js:23-31](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L23-L31) 有；但 schema/身份问题见 §3.3 |
| R-T3 | `attach.url` 必须是已经 listen 的绝对 `ws/wss`，不要求 DNT 改 query/降协议 | DNLS [term-bridge.js:44-82](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L44-L82) 满足；DNT [lanes.js:242-247](../../../dsh-nano-terminal/src/client/lanes.js#L242-L247) 只接受绝对 ws/wss |
| R-T4 | WS open 文本 `{type:'open',session}`；服务端 `ready`；二进制输出；文本 `resize`；`exit`；ping/pong | DNLS `term-ws` 具备 ready/resize/exit/ping 的基础；但 DNT 收到的 `ready` 无初始屏幕 |
| R-T5 | 同一终端 ID 幂等复用一张 PTY；`term.session.close` 关闭 PTY 和 socket | DNLS `active` Map 按 `sessionId` 复用；见 `term-bridge.js:4-5,29-31,109-118` |
| R-T6 | 错误使用 DNT 冻结 kind：`needs_target/not_found/unavailable/spawn_failed/incompatible/invalid`；MCP `result.isError` + `structuredContent` | DNLS 当前只实现 `needs_target/not_found/unavailable/spawn_failed` + `policy-stale`；`callTermTool` 没有校验 `invalid`；见 §3.3 |
| R-T7 | 多 pane 必须彼此独立；DNT 一个 dsh 会话内的多个窗格 = 多个 PTY | **当前不满足**：DNT `McpLane` 只传 `sessionId`，DNLS `active` 以 `sessionId` 为 key；同会话窗格会合并 |
| R-T8 | 重连/重新 attach 不能丢屏；至少应提供初始 screen 或可读回放 | **当前不满足**：`term-bridge` `open` 只回 `ready`，没有 `screen`/snapshot；DNT `McpLane` 重连后空屏 |
| R-T9 | DNT 桌面壳/远端宿主可达：`McpLane` 需要 `streamBase()` 或 host 代理，不能直接假设 `ws://127.0.0.1` | **当前不满足**：`LocalLane` 使用 `streamBase()`（[lanes.js:17-25,71](../../../dsh-nano-terminal/src/client/lanes.js#L17-L25)），`McpLane` 没有 |
| R-T10 | DNT 的 DSH 层代理入口：在授权下把 container terminal 代理成 DNT session，`term.*` 可操作 | **当前没有**：`McpLane` 只是浏览器侧连接；DNT host MCP 不暴露 remote/proxy session；`term.*` 只操作本机 registry |

### 3.3 DNT 要求 vs DNLS 当前 terminal 的差距

| 差距 | 具体代码事实 | 影响 |
|---|---|---|
| 身份字段不诚实 | [terminal-driver.js:19-27](../../../dsh-nano-local-sandbox/src/host/terminal-driver.js#L19-L27) 的 `term.session.create` schema 没有 `required: ['sessionId']`，也没有 `name` / `paneId`；运行时 [term-bridge.js:24-26](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L24-L26) 又强制 sessionId | `tools/list` 广告与实现不一致；DNT 无法传 pane identity |
| 参数被静默忽略 | [routes.js:907-931](../../../dsh-nano-local-sandbox/src/host/routes.js#L907-L931) 的 `callTermTool` 只读 `sessionId/cols/rows`；`lane/shell/title` 被忽略 | 客户端以为设置了 lane/shell，实际没有；违反 P3 |
| 无输入校验 | `callTermTool` 未调用 [terminal-driver.js:39-65](../../../dsh-nano-local-sandbox/src/host/terminal-driver.js#L39-L65) 的 `validateTermCall` | `term.session.resize` 可接受越界/额外字段；错误 kind 不出现 `invalid` |
| 多 pane 合并 | [term-bridge.js:4-5](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L4-L5) `active = new Map()`；[term-bridge.js:29-31](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L29-L31) 按 `sessionId` 返回 existing URL | 同一 dsh 会话的两个 DNT pane 共用一个 PTY，输入/输出/resize 串线 |
| 无初始屏幕 | [term-bridge.js:44-82](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L44-L82) 只在 `onText` 收到 `open` 时发 `{type:'ready'}`；没有发送 `row.output` | DNT `McpLane` 重连后屏幕为空，直到新输出 |
| 错误映射不完整 | [term-bridge.js:7-13](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L7-L13) 只有 4 个 kind；`invalid`/`incompatible` 未在 term 路径使用 | DNT `decodeMcpReply` 的稳定 kind 面不完整 |
| DNT 侧无 proxy | [dsh-nano-terminal/index.js:33-75](../../../dsh-nano-terminal/index.js#L33-L75) 只创建本机 `SessionRegistry` 和 MCP；`McpLane` 在浏览器侧 | DSH agent 不能通过 DNT host 的 `term.*` 操作 container terminal |

---

## 4. [DNK] 当前代码事实与接口要求

### 4.1 DNK 当前事实

1. **DNK 已退化为前端消费者**：当前 `dsh-nano-kitesurf/index.js` 的 `bringUp` 只验证 `engineTargets`，不再自建容器（[index.js:410-421](../../../dsh-nano-kitesurf/index.js#L410-L421)）；`portReport` 的 `published`/`containerState` 为 `null`，`healthy:false`（[index.js:442-493](../../../dsh-nano-kitesurf/index.js#L442-L493)）。方向正确。

2. **DNK 依赖的 HTTP 面非常宽**：`src/client/index.js` 头部常量至少有 `status/open/shot/pick/edit/settings/history/ports/recover/diagnostics/console/network/elements/browse-history/logs/dom/control/kite` 等（[src/client/index.js:14-32](../../../dsh-nano-kitesurf/src/client/index.js#L14-L32)）；`index.js` 宿主还有 `bringUp`、`portReport`、`statusOf` 等辅助逻辑。

3. **DNK 的业务逻辑**：
   - 页面导航/截图：`captureNavigation` 一次 `open` + 一次 `shot`，不自动重试（[src/shared/navigation.js:1-18](../../../dsh-nano-kitesurf/src/shared/navigation.js#L1-L18)）。
   - 面板健康：`EnvPanel` 读 `/ports` 的 `v/epoch/planes`，`healthy = !contractMismatch && snap.ready`（[src/client/index.js:1882-1990](../../../dsh-nano-kitesurf/src/client/index.js#L1882-L1990)）。
   - `planeRows` 只从 `snap.planes` 取五行，terminal 不参与灯（[src/client/index.js:44-59](../../../dsh-nano-kitesurf/src/client/index.js#L44-L59)）。
   - Design Mode 的 pins、notes、截图坐标、i18n 仍是 DNK 的领域资产（保留在 DNK）。

4. **DNK 仍直接改 DNLS**：`9b6287f` 的 stat 显示它修改了 `dsh-nano-local-sandbox` 的 Dockerfile/entrypoint/profile/runtime/settings/history/routes/tests 共 20+ 文件；`kitesurf-delivery-review` 工作树继续修改 DNLS 核心。技术上这是「把 Kitesurf 适配收回 driver」，流程上是 **DNK 在替 DNLS 写核心**，不符合 P1/P2 的 owner 边界。

### 4.2 DNK 对 DNLS 的接口要求（R-D 系列）

| ID | 要求 | 对应 DNK 行为 | 当前状态 |
|---|---|---|---|
| R-D1 | 实例生命周期：ensure/adopt/start/stop/recover，返回 `instanceId`、`profileId`、`endpoints` | DNK 空态一键准备、容器状态灯 | `prepareEnvironment` 有，但仍是 `/kite`/`/recover` 的 Kitesurf 路由；registry 仍以 env container 为主 |
| R-D2 | 页面导航：`open(url)` + `shot()` 返回 `url/data/mimeType`，失败明确 `navigate.failed` | `captureNavigation` | 有 `/open`、`/shot`；但 `/open` 不保证渲染成功，`captureNavigation` 只检查非 blank/data |
| R-D3 | DOM/元素：`dom`、`elements`、`snapshot`、`refs`、`pick`、`edit`、`wait`、`interact` | Design Mode 点选/改字/等待 | 路由存在；`sandbox.dom/elements` MCP 是占位；部分 `pick`/`snapshot` 语义不完整 |
| R-D4 | 观测：`status`、`diagnostics`、`console`、`network`、`operations`、`targets`、`logs`、`selftest` | 环境灯/诊断/DevTools | REST 大体有；MCP `sandbox.*` 多占位；`startDiagnosticsPush` 未在 HEAD |
| R-D5 | 浏览器设置：`viewport/userAgent/media/extraHeaders/locale/geolocation/colorScheme/cookies`，真实生效且可清除 | 设置面板 | `browser-settings-adapter` 有；当前 main 的 locale/DPR/cookie 清除仍有缺口，DNK worktree 在修 |
| R-D6 | 浏览历史：列表/删除/清空，durable per instance | 历史侧栏 | `browser-history-adapter` 有；canonical 仍在 `session.history` 内存，未落到 `stateVolume`（worktree 才加 `browserStatePath`） |
| R-D7 | 浏览器 control：`GET/POST /control` HITL writer/humanHold | 人机共享页 | 有 `/control`；但 bridge 的 CDP relay 在 worktree，main 尚未收口 |
| R-D8 | 浏览器 driver 不得是 DNK 内部实现：DNK 只消费通用 `BrowserDriver` 合同，不 import DNLS 模块、不硬编 Kitesurf 业务语义 | 所有 DNK UI | 当前 DNK 直接拼 `/nano-local-sandbox/*`，DNLS 核心也直接实现 Kitesurf 语义；无通用 `BrowserDriver` 合同 |

### 4.3 DNK 要求 vs DNLS 当前实现的差距

| 差距 | 代码事实 | 影响 |
|---|---|---|
| 没有 profile driver 边界 | `src/host/kitesurf-runtime.js`、`kitesurf-reconciliation.js`、`browser-settings-adapter.js`、`browser-history-adapter.js` 都在 `src/host/`，文件名直接含 `kitesurf`/`browser` | 新增 xray/gateway/S3 必须复制这些文件，违反 P2 |
| 路由仍是 Kitesurf 业务 | [routes.js:530-624](../../../dsh-nano-local-sandbox/src/host/routes.js#L530-L624) 的 `prepareEnvironment` 直接调 `kitesurfRecipe`/`kitesurfImage`；`/kite`、`/settings`、`/browse-history` 是 Kitesurf 专属 | DNLS 核心无法以同一套 API 服务其他 profile |
| MCP 与 REST 不一致 | §2.2.6 | DNK/agent 看到不同世界，违反 P1 |
| 历史/设置不持久 | `session.history` / `session.browserSettings` 仅内存；没有 stateVolume 写入（main HEAD） | 宿主重启后历史/设置丢；DNK 体验不一致 |
| DNK 直接改 DNLS | `9b6287f` 与 delivery-review 工作树 | 没有 DNLS 合同评审，导致核心业务词不断增加 |

---

## 5. 合规性评估：原则 vs 当前代码

### 5.1 总表

| 原则 | 合规 | 证据 | 不合规/缺口 |
|---|---|---|---|
| P1 真源唯一 | **部分** | [observe.js:30-85](../../../dsh-nano-local-sandbox/src/host/observe.js#L30-L85) 一份 snapshot；`:75 healthy=ready`；DNK `EnvPanel` 只读 `snap.ready`（[src/client/index.js:1986](../../../dsh-nano-kitesurf/src/client/index.js#L1986)） | `mcp-sandbox.js` 的 `sandbox.diagnostics/console/targets/dom/elements` 仍是第二套（§2.2.6）；`browserSettings/history` 在 `session` 内存中，没有单一 durable 副本；`term` snapshot 的 `terminal` 状态来自 `deps.termPolicyStale` 测试开关（[routes.js:376-378](../../../dsh-nano-local-sandbox/src/host/routes.js#L376-L378)） |
| P2 DNLS 通用、无状态 | **不合规** | `backend-apple.js` 是通用 backend；`instance-registry` 是通用 registry | `src/host/kitesurf-runtime.js`、`kitesurf-reconciliation.js`、`browser-settings-adapter.js`、`browser-history-adapter.js` 在核心；`routes.js:530-624` 直接依赖 Kitesurf recipe；`profiles/kitesurf` 之外的业务无法接入 |
| P3 兄弟单位通用 | **部分不合规** | `term.session.*` 与 `sandbox.*` 的外形是通用 MCP/HTTP；`dnt-ws-v1` 是 DNT 冻结协议 | DNT `McpLane` 没有 pane identity；DNT 写 `nano-local-sandbox/term.audit`（[dsh-nano-terminal/index.js:39](../../../dsh-nano-terminal/index.js#L39)）；DNK route 常量与 Kitesurf profile 语义直接绑定；`mcp-sandbox.js` 的 domain errorId 是 `kitesurf.*` 混在 `sandbox.*` 工具里 |
| P4 DNT terminal 代理 | **未完成** | DNT `McpLane` 的 create/attach/close 基础链路在；DNLS `term-bridge` 能返回 `attach.url` | 没有 DNT host proxy；`McpLane` 同会话多 pane 共用 PTY；无初始屏幕；无 `streamBase`；无 DSH 授权层 |
| P5 DNK 接口/驱动 | **部分** | DNK 的 UI 已经有大量 REST 路由；`EnvPanel` 已改 `ready/planes` | 没有通用 `BrowserDriver` 合同；MCP 仍是占位；history/settings 未 durable；DNK 仍直接消费 Kitesurf 专属 route 语义 |

### 5.2 当前明确合规的部分

1. **容器特权唯一**：`spawn('container')`/`execFile('container')` 只在 `backend-apple.js`（[backend-apple.js:1-28](../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L1-L28)），`test/container-spawn-sites.test.mjs` 静态扫描保护。
2. **DNK 不再启动容器**：`bringUp` 只测 CDP（[dsh-nano-kitesurf/index.js:410-421](../../../dsh-nano-kitesurf/index.js#L410-L421)），`portReport` 的 `healthy:false`（[:442-493](../../../dsh-nano-kitesurf/index.js#L442-L493)）。
3. **`ready` 与 `healthy` 单一公式**：`healthy = ready`（[observe.js:75](../../../dsh-nano-local-sandbox/src/host/observe.js#L75)），`terminal` 不参与 ready（[:45-49](../../../dsh-nano-local-sandbox/src/host/observe.js#L45-L49)）。
4. **profile 作为物理真源**：`profile.yaml` 的 image/pin/digest/resources 是唯一构建配置（[profile.yaml:7-36](../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L7-L36)）；`kitesurf-runtime.js` 失败关闭（[:47-89](../../../dsh-nano-local-sandbox/src/host/kitesurf-runtime.js#L47-L89)）。
5. **DNT 没有新增 sandbox lane**：DNT 的 `mcp` 只是客户端连接模式，`term.session.create` 非 local 拒绝（[dsh-nano-terminal/src/host/mcp.js:113-127](../../../dsh-nano-terminal/src/host/mcp.js#L113-L127)），符合 P3 的形式。

### 5.3 明确不合规/高风险的部分

1. **核心业务词污染**：`src/host` 直接存在 `kitesurf`/`browser-settings`/`browser-history`，且 `routes.js` 直接调用 `kitesurfRecipe`（[routes.js:530-536](../../../dsh-nano-local-sandbox/src/host/routes.js#L530-L536)）。这使 DNLS 不是通用 sandbox，而是 Kitesurf 专用后端。
2. **MCP 第二真源**：§2.2.6 列出的 5 个工具返回空/假数据，但 HTTP 面返回真实值；同一 `/nano-local-sandbox/mcp` 与 `/diagnostics` 可对同一时刻给出不同世界。
3. **DNT 审计侧载**：`dsh-nano-terminal/index.js:39` 将 DNT 的 `term.audit` 写到 `nano-local-sandbox` 目录；DNT 与 DNLS 的审计真源重叠。
4. **DNT 多 pane 串线**：`McpLane` 只传 `sessionId`，DNLS `active` 按 `sessionId` 复用；同一 dsh 会话两个 pane 会共享一张 PTY。这是 P4 的硬阻塞。
5. **DNT 屏幕重连丢失**：DNLS `term-bridge` 的 `open` 只回 `ready`，没有初始屏幕；DNT `McpLane` 没有 `term.session.read` 回放。
6. **DNK 直接改 DNLS**：`9b6287f` 和未提交 delivery-review 工作树。技术方向对，但流程违反「各业务单元持有各自真源」——DNK 的业务需求不应直接改 DNLS 核心实现。
7. **runtime 交付缺口**：`kitesurfRuntimeRoot` 依赖 `DSH_HOME/artifacts`，但 `package.json files` 不含 runtime；新安装/换机时 `assertKitesurfRuntime` 失败是正确失败关闭，但没有安装/部署闭环。

### 5.4 盲点

| # | 盲点 | 说明 |
|---|---|---|
| B1 | 把「无状态」误解为「DNLS 不能有运行态」 | DNLS 必须持有 instance registry、PTY、CDP socket 等运行态；关键是 **不持有消费者的业务模型/UI 状态** |
| B2 | 把「通用」误解为「只有抽象接口」 | 通用不等于没有业务；Kitesurf 业务应放在 `profiles/kitesurf` driver，核心只提供 driver host |
| B3 | 把「DNT 不新增 lane」误解为「DNT 不需要改」 | DNT 现有 `McpLane` 缺 pane identity、初始屏、桌面 transport、DSH proxy；这些是 DNT 侧合同工作 |
| B4 | 把「DNK 有接口」误解为「DNK 可以继续直接调 Kitesurf 路由」 | DNK 需要的是通用 `BrowserDriver` 合同；Kitesurf-specific 路由应是 profile driver 的实现，不是核心 |
| B5 | 测试数量替代测试真实性 | DNK audit 已证明 74/74 + 9/9 smoke 仍可伴随 P0；必须以真实浏览器、真实 HTTP/WS、真实容器验证 |
| B6 | MCP `tools/list` 当作合同 | 当前 `term.session.create` schema 没有 required；`mcp-sandbox` 参数校验只是浅层；目录与实现不一致 |
| B7 | `attach.url` 的 browser/desktop 可达性 | DNT `McpLane` 不像 `LocalLane` 用 `streamBase`；HTTPS/`dsh-app://` 下 `ws://127.0.0.1` 需实测 |
| B8 | 审计/持久状态归属 | DNT 写 DNLS `term.audit`；DNK/DNLS history/settings 双份；需要按业务单元重新分配 |
| B9 | 未合入 DNK 工作树的污染 | `kitesurf-delivery-review` 的未提交改动可能被误当成 main；必须显式区分 |
| B10 | 权限边界 | DNT proxy 若无 session/instance 授权，会变成任意本地 terminal 代理；必须使用 `requestRejection` + session owner |

---

## 6. 目标设计

### 6.1 分层模型

```text
L3 消费者（各自持有业务真源）
  [DNK]  Design Mode UI / pins / notes / 截图坐标
  [DNT]  终端 UI / layout / ctx refs / 本机 session
  xray / gateway / local-s3（未来）

L2 通用合同（跨插件唯一入口）
  - ProfileContract       profile 声明 + 能力
  - InstanceContract      instanceId/profileId/sessionId/endpoints/stateVolume
  - SandboxSnapshot       单一 v/epoch/planes/ready
  - BrowserDriver         通用浏览器能力（open/shot/dom/snapshot/pick/settings/history/network/...）
  - TerminalContract      term.session.* + dnt-ws-v1 + attach
  - ErrorContract         稳定 kind/status/catalog
  - AuditContract         每业务单元自己的 audit 域

L1.5 Profile Drivers（业务实现，可插拔）
  profiles/kitesurf/driver/*       Kitesurf engine/browser/runtime
  profiles/xray/driver/*           未来
  profiles/gateway/driver/*        未来
  profiles/local-s3/driver/*       未来

L1 DNLS Kernel（通用、无业务词）
  ProfileRegistry · InstanceRegistry · Backend(Apple/NVX) · StateVolume
  SandboxPolicyAdapter · TerminalBroker · Observation · RouteGuard
```

### 6.2 不变量（I-1 至 I-7）

| ID | 不变量 | 验收 |
|---|---|---|
| I-1 | DNLS `src/host` 不出现 `kitesurf`/`workerd`/`wrangler`/`agent-browser`/`browser-settings` 等 profile 业务词 | 静态扫描 `src/host` 零命中（`profiles/` 例外） |
| I-2 | 每个业务单元只持有一份 canonical；DNLS 不复制 DNK/DNT 业务状态 | `pins/notes/layout/ctx` 只在各自插件；DNLS 只保存 profile driver 的 `stateVolume` |
| I-3 | 跨插件只经登记合同；不 import 对方 `src/`、不硬编私有路径 | `spawn('container')` 只在 `backend-apple.js`；DNT/DNK 无 DNLS import；route/tool 全登记 |
| I-4 | profile 业务在 `profiles/<id>/driver/`，L1 只为 driver 提供 host | 新增 profile 不改 `src/host/*.js` |
| I-5 | 观测只有一份 Snapshot；HTTP/MCP/bridge 从同一函数投影 | `/ports`、`/diagnostics`、`sandbox.diagnostics`、bridge push 的 `v/epoch/planes` 一致 |
| I-6 | terminal 只经通用 `attach.url`；DNT 不新增 sandbox lane；DNT 不写 DNLS 目录 | DNT `makeLane` 仍 local/mcp；DNT audit 归 DNT 自己 |
| I-7 | 缺 runtime、缺 policy、缺授权一律失败关闭；不静默降级 | `assertKitesurfRuntime` 缺文件失败；DNT proxy 未授权 401；`policy-stale` 409 |

### 6.3 合同簇

| 合同 | 所有者 | 消费者 | 当前锚点 | 目标 |
|---|---|---|---|---|
| `C-PROFILE` | DNLS | 所有 | [profile.yaml:1-60](../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L1-L60) · [profile-registry.js](../../../dsh-nano-local-sandbox/src/host/profile-registry.js) | `profileId/version/platform/backend/scope/build/runtime/driver`；driver 入口显式 |
| `C-INSTANCE` | DNLS | DNK/DNT/未来 | [instance-registry.js:27-80](../../../dsh-nano-local-sandbox/src/host/instance-registry.js#L27-L80) | `ensure(profileId, sessionId, policy)`、`instanceId`、`endpoints`、`stateVolume`、`policyFingerprint` |
| `C-SNAPSHOT` | DNLS | DNK/DNT/agent | [observe.js:30-85](../../../dsh-nano-local-sandbox/src/host/observe.js#L30-L85) | 一份 `v/epoch/observedAt/subject/planes/ready/degraded`；`healthy=ready` |
| `C-BROWSER` | DNLS profile driver | DNK | [routes.js:1328-1490](../../../dsh-nano-local-sandbox/src/host/routes.js#L1328-L1490) | 通用 `BrowserDriver`：navigate/shot/dom/elements/pick/edit/wait/settings/history/network/console/targets/diagnostics/logs/selftest |
| `C-TERMINAL` | DNLS | DNT | [terminal-driver.js:19-27](../../../dsh-nano-local-sandbox/src/host/terminal-driver.js#L19-L27) · [term-bridge.js:23-82](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L23-L82) | `term.session.*` 8 工具、`profileId/instanceId/sessionId/paneId`、`dnt-ws-v1`、错误 kind、初始屏幕 |
| `C-DNT-PROXY` | DNT | DSH agent | —（DNT 当前无） | DNT host proxy session：`term.proxy.create`/`term.proxy.close` 或等价 route；授权 + 代理 |
| `C-ERROR` | DNLS | 所有 | [error-catalog.js](../../../dsh-nano-local-sandbox/src/host/error-catalog.js) | `sandbox.*` 通用错误 + profile 业务错误命名空间分离；DNT 13 kind 可与 `term.*` 对齐 |
| `C-AUDIT` | 各自 | 各自 | DNT [index.js:39](../../../dsh-nano-terminal/index.js#L39) 写 DNLS 目录 | DNT 自己的 `dsh-nano-terminal.state/term.audit`；DNLS terminal audit 只记 DNLS 物理操作 |
| `C-ROUTE` | DNLS | 所有 | [lib/bindings.js](../../../dsh-nano-local-sandbox/lib/bindings.js) | 通用 profile/instance route；`security/feature-contract.json` 与 `bindings` 单一来源 |

### 6.4 无状态模型

**DNLS 允许持有的状态**：

- `InstanceRegistry`：`instanceId/profileId/sessionId/policyFingerprint/phase/endpoints/stateVolume`，是物理实例真源。
- `TerminalBroker`：`terminalId -> PTY/WS`，运行态，不做业务持久化。
- `ProfileDriver` 的 **per-instance** 状态：通过 `stateVolume` 持久化，driver 自己的格式；例如 Kitesurf 的 history/settings。
- `SandboxSnapshot`：每次探测生成，不做第二份持久化。

**DNLS 不允许持有的状态**：

- DNK 的 `pins/notes/selected element/lastPick`、DNT 的 `layout/ctx refs/local session metadata`；
- 任何一个消费者关于「工作区/会话」的业务模型；
- 跨 instance 的全局单例（CDP socket、browser page、history）。

**实现建议**：

- `ProfileDriver` 接口：`create(instance)`, `start(instance)`, `stop(instance)`, `status(instance)`, `snapshot(instance)`, `browser(instance)`, `terminal(instance)`, `state(instance)`。
- `stateVolume` 由 `instance-registry` 分配（当前 [instance-registry.js:46-66](../../../dsh-nano-local-sandbox/src/host/instance-registry.js#L46-L66) 已有 `stateVolume`），driver 不得使用全局 `~/.dsh-kitesurf-state`。
- `session` 对象只作为请求上下文（`sessionId`、`instanceId`、`phase`），不存放业务历史；业务历史迁移到 driver stateVolume。

### 6.5 授权模型

DNT 的 container terminal 代理必须满足：

1. **入口**：DNT host 的 authenticated route/tool，例如 `POST /dsh-nano-terminal/proxy`（具体名称由 [业主] 冻结）；不得由浏览器直接持有 DNLS attach token。
2. **主体**：`sessionId`（DSH session）+ `instanceId`（DNLS）+ `profileId`；DNT 必须校验请求者能访问该 session/instance。
3. **凭证**：DNLS `attach.url` 的 token 只在 DNT host 内部使用；DNT browser 只拿 DNT 自己的 stream session URL。
4. **审计**：DNT 记录 proxy open/close/attach；DNLS 记录 PTY open/close；各自一份，不互写目录。
5. **失败关闭**：无 session、无 instance、无授权 → 401/403；DNLS policy-stale → 409；容器未运行 → 409 `unavailable`。

推荐的目标流程（名称待 [业主] 冻结）：

```text
DSH agent / DNT UI
  → DNT host: POST /dsh-nano-terminal/proxy {sessionId, profileId, instanceId, cols, rows}
      → 校验 DSH session + instance 授权
      → DNLS MCP tools/call: term.session.create {profileId, instanceId, sessionId, paneId}
      → DNLS 返回 attach.url（只留在 DNT host 内部）
      → DNT host 建立 WS client 连 attach.url
      → DNT registry 创建 proxy session（owner=sessionId, instance=instanceId）
      → DNT 返回自己的 stream URL / session id
  → DNT UI 或 DSH agent 走 DNT 的 term.send/read/wait/keys/resize/close
```

这样 DNT 的 `term.*` 工具面不变，DNLS 仍是通用 terminal server，浏览器不直接持有 DNLS token；授权和审计都落在 DNT host。

---

## 7. 工作分簇与详细清单

> 说明：下列「当前锚点」全部是 `main@55b5b6e` 的事实；「动作」是目标工作，不代表已实现。任何新增公共字段/route/tool 都必须在 §9 的 [业主] 决策后实施。

### 7.0 建议执行顺序（先合同、再内核、后消费者）

1. **合同冻结**：A1、E3、Q1–Q4，先把 profile/instance/browser/terminal 的通用形状与 owner 定下来。
2. **核心去 Kitesurf 化**：A2、A3、A4、A6、A7、A8，把业务词从 `src/host` 移到 `profiles/kitesurf/driver`。
3. **终端闭环**：B1、B2、B3、B4，先把多 pane、schema、错误、初始屏幕做对；再 B5–B8 接 DNT host proxy。
4. **DNK 浏览器驱动**：C1–C7，按 DNK 的实际 UI 行为逐项落 driver，不先改 DNK UI。
5. **观测与 MCP 同源**：D1–D5，确保所有消费者看到同一份真相。
6. **交付与验收**：F1–F5 + §8 的全量测试；最后才讨论发布。

### 7.1 CL-A — DNLS 平台内核（通用、无状态）

| ID | 工作项 | 当前锚点 | 动作 / 产出 | 验收 |
|---|---|---|---|---|
| A1 | 冻结 v1.2 通用合同与 owner 边界 | 本文；[AGENTS.md](../../../AGENTS.md) 六原则；[qna/DNLS01-qna.md](qna/DNLS01-qna.md) T-O-9/T-O-10/T-O-17 | 把 `C-PROFILE/C-INSTANCE/C-SNAPSHOT/C-BROWSER/C-TERMINAL/C-ERROR` 写入合同台账；明确 DNLS 核心不出现业务词 | 合同清单与 `lib/bindings.js`/`security/feature-contract.json` 一致；owner 签字 |
| A2 | 拆分 `src/host` 中的 Kitesurf 业务 | [kitesurf-runtime.js](../../../dsh-nano-local-sandbox/src/host/kitesurf-runtime.js#L47-L100) · [kitesurf-reconciliation.js](../../../dsh-nano-local-sandbox/src/host/kitesurf-reconciliation.js#L1-L100) · [browser-settings-adapter.js](../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L1-L190) · [browser-history-adapter.js](../../../dsh-nano-local-sandbox/src/host/browser-history-adapter.js#L1-L101) | 迁移到 `profiles/kitesurf/driver/`；`src/host` 只保留 `ProfileDriver` host/registry/backend | `src/host` 不含 `kitesurf`/`wrangler`/`agent-browser` 业务词；新增 fake profile 不改核心 |
| A3 | Profile Registry 泛化 | [profile-registry.js](../../../dsh-nano-local-sandbox/src/host/profile-registry.js) · [profile.yaml:1-60](../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L1-L60) | 支持多个 profile（kitesurf/xray/gateway/local-s3）；profile manifest 增加 `driver` 入口与 capability 列表 | `sandbox.profile.list/describe` 能列出多 profile；缺字段失败关闭 |
| A4 | Instance Registry 泛化 | [instance-registry.js:27-80](../../../dsh-nano-local-sandbox/src/host/instance-registry.js#L27-L80) | `ensure(profileId, sessionId, policy)`；`endpoints` 来自 backend/driver；`stateVolume` 由 profile 驱动 | 两个 profile 各自实例互不串；`policyFingerprint` 仅 per instance |
| A5 | Backend 抽象保持通用 | [backend-apple.js:50-191](../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L50-L191) | backend 只暴露 `create/start/stop/remove/inspect/exec/logs/openPty`；Apple/NVX 差异封装 | `src/host` 无 Apple 专有名词泄漏到 L2；NVX 可替换 |
| A6 | 通用 route facade | [routes.js:530-624](../../../dsh-nano-local-sandbox/src/host/routes.js#L530-L624) · [routes.js:1328-1490](../../../dsh-nano-local-sandbox/src/host/routes.js#L1328-L1490) | 设计 `/profiles/:profileId/instances/:instanceId/...` 通用 route；Kitesurf 业务路由移入 profile driver；旧 route 是否保留需 [业主] 决策 | 路由可由 profileId/instanceId 路由；无 Kitesurf 名字出现在核心 |
| A7 | 无状态边界 | [dsh-nano-local-sandbox/index.js:17-26](../../../dsh-nano-local-sandbox/index.js#L17-L26) · `session` 默认值 | 定义 `RuntimeState`/`BusinessState`；`session.history/browserSettings/lastDom` 迁到 profile driver/stateVolume；`session` 只保留请求上下文 | 宿主重启后业务状态由 driver 恢复；DNLS 不复制 DNK/DNT 业务状态 |
| A8 | Error 命名空间拆分 | [error-catalog.js](../../../dsh-nano-local-sandbox/src/host/error-catalog.js) · [mcp-sandbox.js:81-83](../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L81-L83) | `sandbox.*` 只放通用错误；`kitesurf.*` 放 profile 错误；DNT `term.*` kind 统一映射 | 每一个 errorId 有唯一 catalog 行；无跨命名空间混用 |

### 7.2 CL-B — 终端簇（DNLS TerminalBroker + DNT 代理）

| ID | 工作项 | 当前锚点 | 动作 / 产出 | 验收 |
|---|---|---|---|---|
| B1 | 冻结 `C-TERMINAL` v2 字段 | [terminal-driver.js:19-27](../../../dsh-nano-local-sandbox/src/host/terminal-driver.js#L19-L27) · [term-bridge.js:23-82](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L23-L82) | 在 [业主] 批准后增加 `profileId/instanceId/sessionId/paneId`；`sessionId` 只作 owner，`paneId` 作 PTY key；保留 8 工具形状 | schema required/enum/bounds 与实现一致；`term.session.create` 不再以 sessionId 作唯一 key |
| B2 | 多 pane 隔离 | [term-bridge.js:4-5,29-31](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L4-L5) · [dsh-nano-terminal/src/client/lanes.js:200-223](../../../dsh-nano-terminal/src/client/lanes.js#L200-L223) · [NanoTerm.jsx:917](../../../dsh-nano-terminal/src/client/NanoTerm.jsx#L917) | DNT `McpLane` 传 `paneId/tid`、可选 `name`；DNLS `active` 用 `(instanceId, paneId)` key；创建幂等 | 同一 dsh 会话两个 DNT pane：各自 PTY、输入/输出/resize 不串；关闭一个不影响另一个 |
| B3 | 输入校验与错误 kind | [routes.js:907-931](../../../dsh-nano-local-sandbox/src/host/routes.js#L907-L931) · [terminal-driver.js:39-65](../../../dsh-nano-local-sandbox/src/host/terminal-driver.js#L39-L65) | `callTermTool` 先 `validateTermCall`；补 `invalid`/`incompatible`；`term.session.create` 拒绝非 local lane；`cols/rows` 2..512 | 非法 lane/越界/额外字段返回 `invalid`/`incompatible`；不 spawn |
| B4 | 初始屏幕与重连 | [term-bridge.js:44-82](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L44-L82) · [dsh-nano-terminal/src/client/lanes.js:249-305](../../../dsh-nano-terminal/src/client/lanes.js#L249-L305) | DNLS `open` 后发送 `screen`（ANSI 重放）或 DNT `ready` 后调 `term.session.read`；DNT 先应用快照再接 live | DNT 断线重连后仍显示最后屏幕；无重复输出/乱码 |
| B5 | DNT host proxy 入口 | [dsh-nano-terminal/index.js:33-75](../../../dsh-nano-terminal/index.js#L33-L75) · [dsh-nano-terminal/src/host/mcp.js:113-127](../../../dsh-nano-terminal/src/host/mcp.js#L113-L127) | 增加 DNT host `term.proxy.create/close`（名称由 [业主] 冻结）；代理 session 进入 DNT registry；`term.send/read/wait/keys/resize/close` 可操作；使用 DNLS `attach.url` | DSH agent 能通过 DNT `term.*` 操作 container terminal；未授权 401；跨 session 拒绝 |
| B6 | DNT `McpLane` transport | [lanes.js:199-338](../../../dsh-nano-terminal/src/client/lanes.js#L199-L338) | 补 `streamBase()` 处理（T-O-17 已冻结）；`McpLane` 收到 `attach.url` 后按桌面 transport 重写；保持 absolute ws/wss 校验 | dsh 桌面壳/web 均可连接；不破坏 raw `dnt-ws-v1` |
| B7 | DNT audit 归位 | [dsh-nano-terminal/index.js:39](../../../dsh-nano-terminal/index.js#L39) | 把 `term.audit` 移到 `dsh-nano-terminal.state/term.audit`；DNLS terminal audit 只写 DNLS 自己的目录 | DNT 不再写 `nano-local-sandbox/*`；两边 audit 各自可读 |
| B8 | PTY 生命周期 | [term-bridge.js:109-126](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L109-L126) | socket 断/页面崩溃时策略明确：保留（可重连）或 TTL 回收；`term.session.close` 幂等；`term.list` 显示 owner/instance/pane | 无孤儿 PTY；重连可恢复；`close` 重复调用不报错 |
| B9 | 终端测试矩阵 | [test/term-bridge.test.mjs](../../../dsh-nano-local-sandbox/test/term-bridge.test.mjs) 当前覆盖 8 个用例 | 增加多 pane、proxy、重连屏幕、错误 kind、真实容器 PTY、DNT E2E | 见 §8 |

### 7.3 CL-C — 浏览器簇（DNLS BrowserDriver + DNK 消费）

| ID | 工作项 | 当前锚点 | 动作 / 产出 | 验收 |
|---|---|---|---|---|
| C1 | 通用 `BrowserDriver` 接口 | DNK [src/client/index.js:14-32](../../../dsh-nano-kitesurf/src/client/index.js#L14-L32) 的 18 组 route 常量；DNLS [routes.js:1328-1490](../../../dsh-nano-local-sandbox/src/host/routes.js#L1328-L1490) | 定义 driver 方法：`open/shot/dom/elements/snapshot/refs/pick/edit/wait/interact/settings/history/network/console/operations/targets/diagnostics/logs/selftest/control` | DNK 每个 UI 行为有对应 driver 方法；无 Kitesurf 核心 route |
| C2 | Kitesurf driver 实现 | [kitesurf-runtime.js](../../../dsh-nano-local-sandbox/src/host/kitesurf-runtime.js) · [browser-settings-adapter.js](../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js) · [browser-history-adapter.js](../../../dsh-nano-local-sandbox/src/host/browser-history-adapter.js) | 迁到 `profiles/kitesurf/driver/`；保留现有行为与测试；通过 `ProfileDriver` 注册 | 新增 profile 不复制这些文件；Kitesurf driver 独立测试 |
| C3 | 导航真实成功判据 | [src/shared/navigation.js:1-18](../../../dsh-nano-kitesurf/src/shared/navigation.js#L1-L18) · [cdp-elements.js:146-163](../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L146-L163) | 一次 `open` + 一次 `shot`；不要客户端自动重试；`navigate.failed` 只在无 data/blank/URL 不符时返回；`Page.navigate` 结果与可见 DOM 双验 | 失败页面不会被 `ok:true` 掩盖；重定向正常；无重放 |
| C4 | DOM/元素/ref 完整性 | [routes.js:1105-1160](../../../dsh-nano-local-sandbox/src/host/routes.js#L1105-L1160) · [mcp-sandbox.js:93-100](../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L93-L100) | DOM 返回真实 html/bytes；elements 返回真实树；snapshot/refs 支持 `@N`；`pick`/`edit` 解析 `@N` | 真实浏览器：snapshot→refs→pick→edit 闭环；MCP `sandbox.dom/elements` 与 REST 同源 |
| C5 | 设置真实生效 | [browser-settings-adapter.js:150-190](../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L150-L190) | 保留事务/回滚；补 locale 在首脚本前生效、DPR/mobile 能力注记、cookie 真实删除、geolocation 可清除 | HTTP echo / page evaluate 证明值；清除后恢复；不能只测回显 |
| C6 | 历史 durable | [browser-history-adapter.js:1-101](../../../dsh-nano-local-sandbox/src/host/browser-history-adapter.js#L1-L101) | 写入 `stateVolume/browser-state.json`；重启恢复；删除/清空持久化；单一 canonical | 宿主重启后历史保留；无第二份 JSONL |
| C7 | 网络/Console 增量 | [cdp-elements.js:232-375](../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L232-L375) | console seq；network merge（pending→failed）；`gap` 过滤；`failedOnly`；`since` 语义 | 打开中的 pane 能收到新增日志；failed 状态更新；无 `0ms` 伪造 |
| C8 | DNK 面板消费 | [dsh-nano-kitesurf/src/client/index.js:1882-1990](../../../dsh-nano-kitesurf/src/client/index.js#L1882-L1990) | 继续只读 snapshot `ready/planes`；`v` 缺失/!=1 显示合同不匹配；`epoch` 不变不重绘；1.5s/12s | DNK 不读 `healthy && rowsOk`；`v` 不匹配文案；无额外 status 合成 |
| C9 | DNK 测试/技能 | DNK `test/*.mjs`、`skills/*` | 用真实 DNLS driver 做 UI 级验证；技能正文只教通用 `BrowserDriver`/`sandbox.*` | DNK 不持有 container/runtime；技能无私有路径 |

### 7.4 CL-D — 观测、诊断与错误

| ID | 工作项 | 当前锚点 | 动作 / 产出 | 验收 |
|---|---|---|---|---|
| D1 | Snapshot v2 通用化 | [observe.js:30-85](../../../dsh-nano-local-sandbox/src/host/observe.js#L30-L85) | `subject` 增加 `instanceId/profileId`；planes 拆 `container/engine/driver` + profile detail；`v=2` 由 [业主] 冻结 | DNK/DNT 可按 v2 读取；旧 v1 只做只读迁移（若 [业主] 允许） |
| D2 | MCP/REST/bridge 同源 | [mcp-sandbox.js:69-111](../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L69-L111) · [routes.js:1349-1430](../../../dsh-nano-local-sandbox/src/host/routes.js#L1349-L1430) | 实现 `diagnosticsPayload` 单一函数；`buildOwners.diagnostics.read`、HTTP `/diagnostics`、bridge push 共用 | 同一时刻 `v/epoch/planes` 一致；`sandbox.diagnostics` 不为 null |
| D3 | `sandbox.*` 真实 owner | [routes.js:802-874](../../../dsh-nano-local-sandbox/src/host/routes.js#L802-L874) | `page.dom/elements` 真实 CDP；`targets.list` 真 `Target.getTargets`；`console/network` 数组/seq；`ports` 快照 | 20 个工具全部有真实数据；空状态是明确 error，不是 `[]`/`null` 假成功 |
| D4 | 诊断 push | [profiles/kitesurf/mcp-bridge.mjs](../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs)（当前无 `startDiagnosticsPush`） | 将 DNK worktree 的 `startDiagnosticsPush` 作为候选，但由 DNLS 审核；push 只带 `v/epoch`，bridge 不另存 canonical | bridge `sandbox.*` 无 `diag.stale`；push 断开不影响 REST truth |
| D5 | 错误/审计单源 | [error-catalog.js](../../../dsh-nano-local-sandbox/src/host/error-catalog.js) · DNT `term.audit` | `ERROR_CATALOG` 只一处；DNT/DNLS audit 分目录；`term.*` kind 映射表 | 无重复 errorId；审计可追溯；无跨插件写 |

### 7.5 CL-E — 合同治理、路由与安全

| ID | 工作项 | 当前锚点 | 动作 / 产出 | 验收 |
|---|---|---|---|---|
| E1 | 通用 route 账本 | [lib/bindings.js](../../../dsh-nano-local-sandbox/lib/bindings.js)（当前 30 条 `BINDING_TABLE`） · [security/feature-contract.json](../../../security/feature-contract.json) | 重新登记 profile/instance/browser/terminal 通用 route；Kitesurf 专属 route 移入 profile 命名空间 | `check-route-sensitivity`/`check-feature-contract` exit 0；route inventory 一致 |
| E2 | RouteGuard 统一 | [lib/route-guard.js](../../../dsh-nano-local-sandbox/lib/route-guard.js) | 所有 HTTP/WS upgrade 走 `registerRoutes`/`requestRejection`/`sessionBinding`；DNT proxy route 也走 guard | 未授权 401；跨 session 拒绝；无裸注册 |
| E3 | Profile manifest 校验 | [profile-registry.js](../../../dsh-nano-local-sandbox/src/host/profile-registry.js) · [profile.yaml](../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml) | 必填 `id/version/platform/backend/scope/build/runtime/driver/capabilities/health`；缺一拒绝；`driver` 入口显式 | 无效 profile 启动失败；`sandbox.profile.list` 只列 ready |
| E4 | 无侧载静态扫描 | [test/container-spawn-sites.test.mjs](../../../dsh-nano-local-sandbox/test/container-spawn-sites.test.mjs) · [test/residue.test.mjs](../../../dsh-nano-local-sandbox/test/residue.test.mjs) | 扩展扫描：`src/host` 无 `kitesurf` 业务词；DNT/DNK 不 import DNLS `src`；DNT audit 不进 DNLS 目录 | 扫描全绿；新增 profile 不需改核心 |
| E5 | 文档/技能/AGENTS | [dsh-nano-local-sandbox/AGENTS.md](../../../dsh-nano-local-sandbox/AGENTS.md) · [dsh-nano-terminal/AGENTS.md](../../../dsh-nano-terminal/AGENTS.md) · [dsh-nano-kitesurf/AGENTS.md](../../../dsh-nano-kitesurf/AGENTS.md) | 更新三包合同；DNK/DNT 只消费通用合同；新增 `driver` 文档 | 文档与合同一致；skill 不含硬编私有路径 |

### 7.6 CL-F — 交付、构建与测试

| ID | 工作项 | 当前锚点 | 动作 / 产出 | 验收 |
|---|---|---|---|---|
| F1 | runtime 产物交付 | [kitesurf-runtime.js:55-89](../../../dsh-nano-local-sandbox/src/host/kitesurf-runtime.js#L55-L89) · [package.json files](../../../dsh-nano-local-sandbox/package.json) | 明确 runtime 由 DNLS build/deploy 产出到 `DSH_HOME/artifacts/<profile>/<ref>/runtime`；安装/升级流程携带 receipt；不要在 DNK 构建 | 新机器安装后 `assertKitesurfRuntime` 通过；缺 runtime 失败前不销毁容器 |
| F2 | 包文件/ manifest | [pack-manifest.json](../../../dsh-nano-local-sandbox/test/artifacts/pack-manifest.json) | 新增 profile driver/runtime 文件；`npm pack --dry-run` 含所有运行时；不含 `linux-prefix` 源树 | pack-manifest 测试绿；包可安装 |
| F3 | Profile build 工具 | [profile.yaml:7-16](../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L7-L16) · `scripts/`（当前无 build-kitesurf-image） | 增加 profile build/materialize 脚本；pin/digest 校验；不写回 pin | 构建脚本可复现；receipt 与 image digest 对齐 |
| F4 | 测试与防假绿 | 见 §8 | 新增合同/集成/E2E；把 `ok:true` 断言换成真实行为断言 | 测试能捕获 MCP 占位、空 DOM、设置回显、低字节截图 |
| F5 | 迁移与回滚 | T-O-10 硬切；`kitesurf-delivery-review` 未提交 | 明确三段时序与快照/tarball；不建双轨；未合入工作树不直接合 | 迁移后无旧容器资产；可回滚到快照 |

---

## 8. 测试计划与收口目标

### 8.1 新增测试

| 测试文件 | 覆盖 | 对应工作项 |
|---|---|---|
| `dsh-nano-local-sandbox/test/contracts/terminal-contract.test.mjs` | `term.session.*` schema required/enum/bounds；`paneId` 独立；错误 kind；`term.session.create` 拒绝非 local lane；`term.session.resize` 越界 `invalid` | B1/B3 |
| `dsh-nano-local-sandbox/test/contracts/snapshot-contract.test.mjs` | `observe.projectSnapshot` 的 `healthy=ready`；terminal 不入 ready；`epoch` 稳定性；`v/epoch` 跨 REST/MCP/bridge 一致 | D1/D2 |
| `dsh-nano-local-sandbox/test/contracts/profile-contract.test.mjs` | profile manifest 必填；缺 `driver`/`runtime` 失败；多 profile 列表；`profileId` 解析 | A2/A3/E3 |
| `dsh-nano-local-sandbox/test/contracts/no-business-core.test.mjs` | `src/host` 无 `kitesurf`/`wrangler`/`agent-browser` 业务词；`profiles/kitesurf/driver` 例外；无私有 import | A2/E4 |
| `dsh-nano-local-sandbox/test/integration/terminal-multi-pane.test.mjs` | 同一 dsh session 两个 pane：不同 PTY、输入/输出/resize 隔离；关闭一个不影响另一个 | B2 |
| `dsh-nano-local-sandbox/test/integration/terminal-reconnect.test.mjs` | WS 断开→DNT 重连一次→初始屏幕/screen 可见；不重放已写字节；`exit` | B4/B8 |
| `dsh-nano-local-sandbox/test/integration/terminal-proxy.test.mjs` | DNT host proxy：未授权 401；授权 session 可 `term.send/read/wait/keys/resize/close`；proxy 关闭清理 PTY | B5/B7 |
| `dsh-nano-local-sandbox/test/integration/mcp-rest-parity.test.mjs` | 20 个 `sandbox.*` 与 REST 同一快照/同值；`sandbox.diagnostics` 非 null；`sandbox.dom/elements/targets` 真实 | D2/D3 |
| `dsh-nano-local-sandbox/test/integration/browser-driver.test.mjs` | 导航/截图/dom/snapshot/refs/pick/edit；设置真实 HTTP echo；history 持久；network pending→failed | C3-C7 |
| `dsh-nano-local-sandbox/test/integration/fresh-install-runtime.test.mjs` | 缺 runtime/receipt 失败且不 stop 健康 container；带 receipt 通过；profile resource drift 重建 | F1/F3 |
| `dsh-nano-kitesurf/test/panel-snapshot.test.mjs` | `EnvPanel` 只读 `ready/planes`；`v` 缺失显示 contract mismatch；epoch 不变不重绘 | C8 |
| `dsh-nano-terminal/test/mcp-lane-contract.test.mjs` | `McpLane` absolute ws/wss、query 不改、`open` 无 `v:2`、单次重连、`paneId` 传参、`streamBase` | B2/B6 |
| `dsh-nano-terminal/test/proxy.test.mjs` | DNT host proxy 授权/生命周期/审计；DNT audit 不写 DNLS 目录 | B5/B7 |

### 8.2 改动/加强既有测试

| 文件 | 改动 |
|---|---|
| `dsh-nano-local-sandbox/test/term-bridge.test.mjs` | 当前 `term.session.create` 用 `sessionId` 作 key 的测试改写为 `paneId`/多 pane；增加 non-local lane、越界、缺 required、初始 screen、proxy |
| `dsh-nano-local-sandbox/test/mcp-tools.spike.test.mjs` | `sandbox.diagnostics/console/targets/dom/elements` 不再接受 `null`/`[]` 占位；断言真实 owner |
| `dsh-nano-local-sandbox/test/dom-health-routes.test.mjs` | 增加 DOM/elements 与 MCP 同源；`ready`/`healthy` 不因 terminal 变化 |
| `dsh-nano-local-sandbox/test/lifecycle-route.test.mjs` | `prepareEnvironment` 的 runtime 缺失失败路径；profile resource drift；不销毁旧 container |
| `dsh-nano-local-sandbox/test/route-scan-coverage.test.mjs` | 通用 route/profile route 登记；DNT proxy route 入账 |
| `dsh-nano-local-sandbox/test/residue.test.mjs` | 从「six historical documents」改为「historical documents」；新增 `src/host` 无 Kitesurf 业务词扫描（与 E4 合并） |
| `dsh-nano-kitesurf/test/navigation.test.mjs` | `captureNavigation` 一次 open/shot；无自动重试；`navigate.failed` 只在无 data/blank 时 |
| `dsh-nano-terminal/test/run.mjs` | 接入 `mcp-lane-contract`/proxy 测试；`term.audit` 路径改到 DNT state dir |

### 8.3 防假绿要求

1. **禁止只断言 `ok:true`**：`ok` 只表示调用完成；必须断言 `ready/planes`、真实 DOM、真实 HTTP echo、真实屏幕内容。
2. **真实宿主/真实容器**：终端测试必须用 `container exec` 真 PTY（至少一个 marker 来回），不能只用 `/bin/cat` 替代全部；浏览器测试必须对可控页面做 visible marker + DOM state。
3. **多 pane 串线反例**：两个 pane 同时 `echo A` / `echo B`，断言输出互不污染；这是当前 DNLS 必失败、修复后必通过的核心反例。
4. **MCP/REST 同源反例**：同时调用 `/diagnostics` 与 `sandbox.diagnostics`，断言 `epoch/planes` 相同；当前 main 的 `sandbox.diagnostics=null` 必须变红。
5. **设置真实生效反例**：设置 UA/headers 用 HTTP echo 页面；设置 locale 用页面首个脚本读取 `navigator.language`；设置 cookie 清除后检查 `document.cookie`/HTTP header。
6. **截图非空**：不能只断言 base64 长度 > 0；解码后检查尺寸/像素/可见文本（至少一个可控页面）。
7. **测试标题与断言一致**：禁止标题写旧行为、断言已放水；`term.session.create` 测试必须断言 `paneId`/required，而不是只断言 `ok:false`。
8. **不新增 release-gate**：测试是质量证据，不是发布门禁；不扩大 `scripts/` 的 gate 数量（[AGENTS.md:39](../../../AGENTS.md#L39)）。

### 8.4 完整收口目标（G1–G8）

| 目标 | 判据 |
|---|---|
| **G1 DNLS 合同绿** | `node --test dsh-nano-local-sandbox/test/*.mjs` 退出 0；新增 `contracts/*` 全绿；无 `src/host` Kitesurf 业务词 |
| **G2 DNT 内部直连** | DNT `McpLane` 对 DNLS endpoint 可建单 pane；同一 dsh 会话两个 pane 各自 PTY；`term.session.create` 返回 `attach.url` 可连；`term.session.close` 清 PTY |
| **G3 DNT DSH 代理** | DNT host `term.proxy.*` 在授权下可代理 container terminal；`term.send/read/wait/keys/resize/close` 对代理 session 可用；未授权 401；DNT audit 不写 DNLS 目录 |
| **G4 DNK 业务可用** | DNK UI 的导航/截图/DOM/元素/pick/edit/settings/history/network/diagnostics 全部通过通用 driver 合同；真实页面 marker/HTTP echo 证明 |
| **G5 MCP/REST 同源** | 20 个 `sandbox.*` 与 REST 对同一 instance 的 `v/epoch/planes` 一致；`sandbox.diagnostics` 非 null；`sandbox.dom/elements/targets` 非占位 |
| **G6 新装可交付** | 新 `DSH_HOME` 下安装后 runtime receipt 校验通过；缺 runtime 失败且不销毁健康容器；`npm pack --dry-run` 含全部运行时 |
| **G7 边界与台账** | `spawn('container')` 只在 `backend-apple.js`；DNT/DNK 无 DNLS 私有 import；`check-route-sensitivity` / `check-feature-contract` / `pack-manifest` 绿；三份台账数字一致 |
| **G8 文档一致** | 三份 `AGENTS.md`、`README.md`、`dsh-nano-local-sandbox-v1.2.md`、skill 正文与合同一致；无「旧版 route/别名」残留 |

---

## 9. 待 [业主] 决定的事项（不得由实现反推）

> **登记状态**：Q1 / Q4 / Q5 / Q7 已由 [业主] 于 2026-11-19 按推荐冻结，唯一登记见 [qna/DNLS02-qna.md](qna/DNLS02-qna.md)（`T-O-19` / `T-O-20` / `T-O-21` / `T-O-22`）；kernel / driver 切割与错误命名空间见 `T-O-23` / `T-O-24`。Q2 / Q3 / Q6 / Q8 仍待决定。

| ID | 决策 | 为什么必须先定 |
|---|---|---|
| Q1 | 是否批准 v1.2 的 **profile-scoped route 命名空间**（`/profiles/:profileId/instances/:instanceId/...`），还是保留 `/nano-local-sandbox/*` 作为兼容 facade | 影响 DNK/DNT 全部消费面与安全台账；属于公共合同变更 |
| Q2 | `term.session.create` 是否扩展 `profileId/instanceId/sessionId/paneId` 字段，以及是否保持 8 工具形状 | 影响 DNT `McpLane`、DNT schema、多 pane；T-O-17 已冻结基础形状，扩展需 [业主] 追加 |
| Q3 | DNT host proxy 的正式入口名称/授权粒度（`term.proxy.create` vs HTTP route；是否按 DSH session/instance 双键） | 新增 DNT 公共面，属「不得擅自扩约」 |
| Q4 | DNK `BrowserDriver` 是否通过 HTTP route、MCP tool 或两者同时暴露 | 影响 DNK 改动量、合同台账、性能 |
| Q5 | Kitesurf driver 的目录/发布形态：`profiles/kitesurf/driver/` 是否随 DNLS 包发布，runtime 是否单独 artifact | 影响 `files`/pack/安装/升级 |
| Q6 | DNT 的审计归位到 `dsh-nano-terminal.state` 是否批准（当前写 DNLS 目录） | 涉及 DNT 状态布局与迁移 |
| Q7 | DNK delivery-review 未提交改动的归属：由 DNK 继续提交，还是转交 DNLS 作为实现输入 | 影响 owner 边界与提交历史 |
| Q8 | 是否接受在完成前保留 `main` 现状（MCP 占位）作为已知基线，不发布 | 影响交付声明和测试门禁 |

---

## 10. 总结

1. **近期 DNLS 升级的正确部分**：物理 runtime 单一配方、pin 官方化、runtime receipt、reconciliation、history/settings 收进 driver、snapshot/`ready` 单一化、容器 PTY。它们把 DNLS 从「DNK 的容器代码」推向「本地 sandbox 平台」。
2. **当前不合规的核心**：Kitesurf 业务仍在 `src/host`；MCP `sandbox.*` 仍是第二套实现；DNT audit 写 DNLS 目录；DNT `McpLane` 多 pane 共用 `sessionId` PTY；DNK 直接改 DNLS 核心。它们分别违反 P1/P2/P3/P4/P5。
3. **v1.2 的设计目标**：把 DNLS 做成**通用、无状态、可插拔 profile driver** 的 backend；把 `BrowserDriver` 和 `TerminalBroker` 做成通用合同；把 DNK 的浏览器业务放进 `profiles/kitesurf/driver`；把 DNT 的 container terminal 代理做成 DSH 侧授权入口；把 DNT/DNK 的业务真源留在各自插件。
4. **最重要的是先做 A2/A3/A4（核心去 Kitesurf 化）和 B1/B2/B5（terminal 身份 + DNT proxy）**；其余 C/D/E/F 在此基础上落地。否则继续加 route 只会把业务侧载固化。
5. **当前不能宣布交付**：`main@55b5b6e` 的 MCP 占位、DNT proxy 缺失、多 pane 串线、runtime 交付缺口都是硬缺口；DNK delivery-review 自己也给出 **NOT READY**。v1.2 是下一轮工作的设计基线，不是完成声明。

---

## 附录 A — 提交索引（HEAD `55b5b6e`）

| 提交 | 主题 | 本文引用 |
|---|---|---|
| `74d734f` | DNLS 观察快照单一化与容器内 PTY 终端；DNK/DNT 消费侧对齐 | §2.2.1 |
| `ede7e45` | DNLS 终端后续：错误沿用 dnt 冻结 kind、PTY resize、重叠观察共享一次探测 | §2.2.2 |
| `9b6287f` | Kitesurf repin 官方 `39feadf`；runtime/reconciliation/history/settings 收归 DNLS driver | §2.2.3 |
| `b3fcccc` | DNLS 容器规格只认 profile，改完按一键准备环境重建 | §2.2.5 |
| `5da480b` | DNLS container logs 截断参数 `-n` | §2.2.5 |
| `d375d46` | DNLS `/settings` 真实实现 userAgent/media/extraHeaders | §2.2.4 |
| `9ded627` | DNLS Network 生命周期、查询/清空 | §2.2.4 |
| `e1f94b0` | DNLS 浏览器模拟驱动适配（locale/geolocation/colorScheme/cookies） | §2.2.4 |
| `9056d5b` | DNLS 模拟 Cookie 写入引擎 cookie jar | §2.2.4 |
| `11a07bf` | DNLS 网络请求详情与响应体 | §2.2.4 |
| `kitesurf-delivery-review`（未提交工作树） | DNK 交付审查：`startDiagnosticsPush`、CDP relay、diagnosticsPayload、真实 MCP owner、browser state、console/network/evaluate 修复 | §2.3 |

## 附录 B — 关键文件锚点索引

| 主题 | 文件 |
|---|---|
| 观察快照 | [observe.js](../../../dsh-nano-local-sandbox/src/host/observe.js) |
| 实例注册 | [instance-registry.js](../../../dsh-nano-local-sandbox/src/host/instance-registry.js) |
| 策略映射 | [policy-adapter.js](../../../dsh-nano-local-sandbox/src/host/policy-adapter.js) |
| Kitesurf runtime | [kitesurf-runtime.js](../../../dsh-nano-local-sandbox/src/host/kitesurf-runtime.js) |
| Kitesurf reconciliation | [kitesurf-reconciliation.js](../../../dsh-nano-local-sandbox/src/host/kitesurf-reconciliation.js) |
| 浏览器设置 | [browser-settings-adapter.js](../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js) |
| 浏览历史 | [browser-history-adapter.js](../../../dsh-nano-local-sandbox/src/host/browser-history-adapter.js) |
| HTTP/MCP 路由 | [routes.js](../../../dsh-nano-local-sandbox/src/host/routes.js) |
| MCP 工具定义 | [mcp-sandbox.js](../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js) |
| 终端桥 | [term-bridge.js](../../../dsh-nano-local-sandbox/src/host/term-bridge.js) |
| 终端 WebSocket | [term-ws.js](../../../dsh-nano-local-sandbox/src/host/term-ws.js) |
| 终端工具 schema | [terminal-driver.js](../../../dsh-nano-local-sandbox/src/host/terminal-driver.js) |
| Apple backend | [backend-apple.js](../../../dsh-nano-local-sandbox/src/host/backend-apple.js) |
| Kitesurf profile | [profile.yaml](../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml) |
| DNT lanes | [lanes.js](../../../dsh-nano-terminal/src/client/lanes.js) |
| DNT MCP | [mcp.js](../../../dsh-nano-terminal/src/host/mcp.js) |
| DNT schema | [dnt-mcp.openrpc.json](../../../dsh-nano-terminal/schema/dnt-mcp.openrpc.json) |
| DNK UI | [index.js](../../../dsh-nano-kitesurf/src/client/index.js) |
| DNK host | [index.js](../../../dsh-nano-kitesurf/index.js) |
| DNK navigation | [navigation.js](../../../dsh-nano-kitesurf/src/shared/navigation.js) |
