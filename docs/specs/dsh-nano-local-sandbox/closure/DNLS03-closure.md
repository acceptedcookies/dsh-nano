# [DNLS] DNLS03：受管沙箱控制面

> Close-type：`close-with-known-issues`（本地交接记录，不是全量验收）。分支：`dnls03-managed-sandbox-control`。代码快照：`b3ad7e5`。日期：2026-11-19 UTC。

## 0. 判定

**公开控制合同已切换；整体 `No-Go`。** 已验证独立对象身份、原 PTY 连续性和公开端点从发现到 attach 的夹具旅程。未验证无 session 的 [dsh工作台] 管理页；默认宿主不提供能区分个人终端归属的可信身份，因而不发 attach 地址。不把这两项写成已交付。

## 1. 工作项

| 工作项 | 代码 | 交付边界 |
|---|---|---|
| P0–P1：测量与台账 | `ba55bf7`、`e32697b` | 环境单写者，原子持久登记；显示名、session、locator 不是对象主键。接管保留实挂卷的内核已验证，未交付操作者接管入口 |
| P2–P3：合同与操作 | `589c8ea`、`ac025df` | HTTP/MCP 单目标、宿主准入与对象授权、持久操作与幂等；超时不重发 |
| P4–P5：终端 | `6f84933`、`b7f3d34` | guest broker 保留原执行；create 无 URL，attach 单独核权；v2 不降级，revocation/detach 不结束 PTY |
| P6–P7：投影与自治 | `3f87460`、`b33a2a8` | 实测端口、资源修订、UTC 分钟库、授权 fleet、对象配额；缺连续空闲证明则不自动停 |
| P8：提供者与消费端 | `b3ad7e5` | 真实包入口启用受管路由；[DNK] 先选对象，[DNT] 识别已存在的终端资源；缺宿主工作区槽位时不造第二页 |
| STEP.5–8：记录与审查 | [计划 §10–11](../plan/DNLS03-managed-sandbox-control.md)、[todo](../plan/todo.DNLS03.md) | 分项证据、三路独立静态审查、修复与已知缺口 |

## 2. 验证矩阵

以下时点均为 2026-11-19 UTC。命令从 worktree 根执行，除非标明包内路径。逐 Test-ID 证据在计划 §10.2，不以子测试总数代替。

| UTC | 命令 / 代码快照 | 观察 |
|---|---|---|
| 17:38:00 | `node --test dsh-nano-local-sandbox/test/{term-bridge,terminal-contract,term-broker.spike,profile-load}.test.mjs`；`6f84933` | 15/15；杀掉宿主进程后，原 terminalId 接受新输入，读回先前变量和同一 PID `91805` |
| 18:44:54 | `node --test dsh-nano-local-sandbox/test/{quota-idle,lifecycle.spike,registry-race.soak}.test.mjs`；`b33a2a8` | 23/23；20 轮受控竞态，不误停、不删行 |
| 19:05:14 | `node --test dsh-nano-local-sandbox/test/dnls03-journey.mega.test.mjs`；`b3ad7e5` | 1/1；以 sessionId 代替 sandboxId 被拒、同一对象 create/操作/inspect/服务/usage、资源引用、单次终端创建、单独 attach；共享 owner 请求被拒且 broker 调用数不变 |
| 19:05:58 | `npm test --prefix dsh-nano-local-sandbox`；`b3ad7e5` | 433 pass，0 fail，0 skip。含 pack 实际文件清单及 T70 无槽位分支 |
| 19:07:17 | `npm test --prefix dsh-nano-kitesurf`；`b3ad7e5` | 51 pass，0 fail，0 skip |
| 19:07:37 | `node --test dsh-nano-terminal/test/{sandbox-resource,lanes-sandbox,keep-alive}.test.mjs`；`b3ad7e5` | 33 pass，0 fail，0 skip；不是整个 [DNT] 包全绿声明 |
| 19:07:46 | `node --test dsh-nano-local-sandbox/test/{term-wire-v2,term-attach-authz,threat.spike}.test.mjs`；`b3ad7e5` | 20 pass，0 fail，0 skip |

## 3. 硬闸

T31 是真实本地 PTY 进程测试，不是截图恢复；T40/T42 分别验证沙箱拒绝 v1 和既有协议回归；T50 非相邻端口，T61 停止保 ID，T81 固定 N=20。T80 是包入口与真实回环传输，但使用受控宿主服务与 Apple backend 替身。**T70 的无槽位分支通过；有槽位的真实打开、聚焦和关闭未观察。** 按计划 §10.1、§10.4，不标 `executed`。

## 4. 待交接项

| 边界 | 当前行为 | 再验条件 |
|---|---|---|
| 无 session 的右侧页签 | 不注册 `/sandbox`，不用中央面板或假 session 替代。能通过 API 管理不等于有管理页 | [dsh] 提供 [dsh工作台] 的正式无 session 注册与聚焦入口；从真实宿主验证同页、窄屏与卸载 |
| 个人终端主体 | pin 中 `rpc-host.ts` 给浏览器共享 `{kind:'owner'}`；`peer.ts` 的 signal 随 Peer scope 销毁。可证明宿主管理身份，但不可证明个人终端归属；默认终端请求拒绝 | 宿主提供可信、稳定、可撤销的对象级授权映射，用不同真人主体验证撤权和重新 attach |
| 旧环境接管与使用绑定 | 台账内核能验证同 locator/generation/volume 后幂等登记；缺生产入口时不接管、不迁卷。`createUseBindings` 的显式绑定与释放是内核证据，不是宿主会话事件接线证明 | [业主] 明确从哪个受信操作者入口传入接管意图与授权范围；实际宿主提供获准的绑定/释放来源 |
| 部署与视觉验证 | 未启动 Apple 容器、未构建镜像、未更改已安装 profile；未取得安装宿主的桌面/390 CSS px 渲染证据 | 独立、非生产的真实宿主组合与视觉验证；真实镜像须另行安排。没有发布或 tag 授权推论 |

## 5. 审查与修复

审查对象是 `b33a2a8` 加 Phase 8 工作树；PROMPT、三份独立报告摘录和 T42 原始日志位于工作区 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/`。报告有不同取样时点，以文件和可重跑断言核实，而非多数表决。

- **真相对账**：补注册 inspect/processes HTTP 路由、拒绝接管墓碑、禁止共享 owner 按终端主体使用、补 `term.session.list` 的受限资源地址。MCP 上限指完整信封，不改约增加传输上限或 locator TTL。
- **完成度**：补真实包入口 T80；校正 [DNK] 使用 flat `rows`；删除旧 session-primary 的正向验收；补包规、T72 与[升级说明](../DNLS03-upgrade.md)。其他裸 `routeSpecs` 测试只说明底层 handler 行为，不能代替 T80。
- **权限与关停**：先关闭 WS 入口/数据面，再 drain 与释放台账；异步终端调用后重新核权，进程与 fleet 在返回前复核可见性和代次；复用的 CDP socket 逐请求核验，不继承首个 opener 的权限。没有真实 Loader 热卸载的证明。

三路在 `b3ad7e5` 与本 closure 上逐项复核，均支持 No-Go。页面 CDP socket 在在途任务结束后释放；真宿主的 heartbeat/Peer 失效时序没有实测。终端资源 list 已可达，但管理页上的交互手势仍无宿主接线点。两份原始包测试日志与 T42 日志保存在同一审查目录；目录按仓库规则仅在独立 worktree 本地保存。

## 6. Handoff

原始[业主]发车指令完整保存在 todo 附件。交接物是本地分支的候选提交和复测入口，不是 `main` 已集成。宿主依赖未满足时，以 403 或明确的不可用状态停住；不得以 `peer.id`、token、自动选目标或隐式建 session 代替。

## 7. 不变量

没有更改官方 pin、依赖清单、`vendor/`、包版本或 `engines.dsh`；未把 [DNPR] 并行工作并入分支。当前配方清单的 digest 为 `sha256:6c62ed8a7153ab40bc59ba2434c83cac667e2c27391502b7a381e337bcba7f4b`，不是已构建镜像的 digest。T42 只按[业主]确认的「仅保护既有协议」解释。

## 8. 价值与负债

可独立寻址和持久化的对象、操作和终端引用已取代会话主键。尚未取得证据的是安装宿主能否为每个终端提供独立主体，以及无 session 时的右栏交互；这些缺口不能靠更多模块级 PASS 消除。

## 9. 最终状态

**本地候选可审阅，整体未通过验收。** 不合并、不推送、不部署。不把本次证据推广到其他宿主、跨主机资源、Case 2/4 或生产镜像。
