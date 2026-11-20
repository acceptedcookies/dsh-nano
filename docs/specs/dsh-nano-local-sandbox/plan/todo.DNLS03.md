# DNLS03 Action Todo — 受管 sandbox 控制面
[执行计划](DNLS03-managed-sandbox-control.md) · [真相层](../qna/DNLS03-qna-truth.md) · [决策来源](../qna/DNLS03-qna.md)

## 1. 目标与边界
[业主] 本次 directive 是实现、测试及分组提交的授权，不是重新裁决 T-O-33 至 T-O-54。只交付计划 §2 的 Case 1/3 和点名的消费面；不改官方 pin、第三方与 local 协议，不做 Case 2/4、远端 provider、版本、tag 或发布。计划不依赖 workers 上线。

## 2. 顺序锁
P0 → P1 → P2 → P3；P3 → P4 → P5；P3 → P6；(P1, P6) → P7；(P5, P7) → P8 → 日志与 closure → 三路独立审查 → 核实、修复与交接。本轮串行调度 P0 至 P8。每个 block 须先有前序出口证据；P0 任一测量锚不符即停工回问答。每一 Phase 完成当即回写状态、UTC、提交与点名测试证据；缺证不打勾，宿主依赖不冒充可用。

## 3. 工作台账

### Phase 0
- [x] **P0-01** 语义 worktree — `.agents/worktrees/dnls03-managed-sandbox-control`；后续改动不落在当前 `main` 工作区（`DNLS03-T00`）— 已收口：worktree 位于 `18ea26f`（`git worktree list` / 分支 `dnls03-managed-sandbox-control`），UTC `2026-11-19T16:09:42Z`
- [x] **P0-02** 复核测量锚 — `DNLS03-T00`，`observed-OK-at-closure`，2026-11-19T16:13:58Z；27/27 符号命中、0 skip。命令见 §4。非产品验收。

### Phase 1
- [x] **P1-01** 控制台账 — `src/host/control-registry.js`（新）；`profile-drivers.js:152` `stateRootFor`；每 env 一份 `registry.json`，同目录临时文件后原子替换（`DNLS03-T01`）
- [x] **P1-02** 身份上移 — `instance-registry.js:18,28-43`；`sandboxId` 分配一次；session 只是使用绑定（`DNLS03-T02`）
- [x] **P1-03** 单写者 — `control-registry.js`；第二宿主写者被拒，无最后写入者胜出（`DNLS03-T03`）
- [x] **P1-04** 重启对账 — `control-registry.js`；损坏、缺失有存量、版本不识别时不空表认领（`DNLS03-T04`）

### Phase 2
- [x] **P2-01**（staged-router 层 PASS；公开激活待原子同切） 合同发现 — `routes.js` `registerRoutes`；`mcp-sandbox.js:189-229`；`GET /contract` 与 `sandbox.contract` 同源返回版本与能力，不授权（`DNLS03-T10`）
- [x] **P2-02**（staged-router 层 PASS；公开激活待原子同切） 派发前配对 — `routes.js` 对象路由入口；`mcp-sandbox.js` tools/call 前；缺头或版本不符在访问对象前拒绝（`DNLS03-T11`）
- [x] **P2-03**（staged-router 层 PASS；公开激活待原子同切） 七项错误 — `error-catalog.js:15,88-110`；七个 `sandbox.*` 不随 active profile 改前缀（`DNLS03-T12`）
- [x] **P2-04**（staged-router 层 PASS；公开激活待原子同切） 单目标 — `routes.js` 对象 handler；`mcp-sandbox.js:229`；缺失、空、重复、冲突、sessionId 兜底都不执行（`DNLS03-T13`）
- [x] **P2-05**（staged-router 层 PASS；公开激活待原子同切） 绑定投影 — `lib/bindings.js:12-34`；`src/perf/declaration.json:11-41`；新路由进既有 bake；`dnls.control` 绑定 id 保持为 `/control`（`DNLS03-T14`）

### Phase 3
- [x] **P3-01**（staged 层 PASS；公开激活待原子同切） 操作文档 — `control-registry.js`；`routes.js` lifecycle；`(主体,requestId)` 去重；未结束 202；派发后取消返回现态（`DNLS03-T20`）
- [x] **P3-02**（staged 层 PASS；公开激活待原子同切） 断线 ≠ 取消 — `routes.js:1469-1471,2268-2270`；客户端断连不再把操作标成 `cancelled`（`DNLS03-T21`）
- [x] **P3-03**（staged 层 PASS；公开激活待原子同切） 主体与对象授权 — 新 `src/host/object-authz.js`，挂在对象路由之前；只调用 `connection.admit`（pin `rpc.ts:240`，不改 pin）；404/403 分开；审计无 attach URL 与输入（`DNLS03-T22`）

### Phase 4
- [x] **P4-01**（staged 层 PASS；公开激活待原子同切） create/attach 分离 — `term-bridge.js`；`terminal-driver.js`；create 与 list 的返回值没有 URL，attach 只回冻结 `{attach:{protocol:'dnt-ws-v2',url}}`（`DNLS03-T30`）
- [x] **P4-02**（staged 层 PASS；公开激活待原子同切） 环境内 broker — `profiles/terminal/pty-entry.mjs` + `pty-worker.py`；`backend-apple.js` `terminalRpc`；真实两宿主进程证明：SIGKILL 宿主 A 后宿主 B 重开同一台账，attach/输入命中同一 shell（`DNLS03-T31`）
- [x] **P4-03**（staged 层 PASS；公开激活待原子同切） 创建键 — `term-bridge.js` + `control-registry.js` `reserveTerminal`；同参返原引用；已结束不复活；attach 失联不 spawn；create 应答须 `{ok:true}` 且 terminalId 一致（`DNLS03-T32`）

### Phase 5
- [x] **P5-01** 已验证 v2 open/ready、对齐、逐连接流控；宿主公开激活待同切（`DNLS03-T40`）。
- [x] **P5-02** 已验证 locator 发放、upgrade、传输期间核权及撤权 detach；未进行生产部署（`DNLS03-T41`）。
- [x] **P5-03** [DNT] `McpLane` 按公告合同消费，local 与第三方仍使用原协议；已重建 client（`DNLS03-T42`）。

### Phase 6
- [x] **P6-01** 服务预留与 inspect 实际映射（`DNLS03-T50`）；实测相邻端口不被请求，映射消失停止请求。
- [x] **P6-02** 保存候选不启停；核实换代后原子提交操作、代次与 `appliedRevision` 回执（`DNLS03-T51`）。
- [x] **P6-03** 单写者分钟库；三个窗口共用一份槽，断段不插值（`DNLS03-T52`）。

### Phase 7
- [x] **P7-01** fleet 窄行、按需进程与已验证发布者的公开健康投影（`DNLS03-T60`）。宿主没有提供来源就不发现其他 env；没有健康证据就是 unknown。
- [x] **P7-02** 同一台账原子判额；连续空闲窗只 stop，保留行、端口和卷（`DNLS03-T61`）。实际 kitesurf driver 没有持续空闲证明，不自动回收。

### Phase 8
- [ ] **P8-01** 管理出口（宿主依赖）：rc.5 的 `sidebarRight` 只能打开已挂载 session 的 [dsh工作台] 页签。未注册 `/sandbox`，未提供同包页签，未用全局中央面板替代。T70 无槽位分支 PASS；有槽位分支未观察。
- [x] **P8-02** 已有终端的公开资源交接：[DNLS] 的获准 list 给地址，[DNT] 正式注册资源处理器；T71 验证同一手势重试不重复 create。无来源页时只支持手动交接，不声称已点击打开。
- [x] **P8-03** `AGENTS.md`、[DNK]/[DNT] 消费说明及升级说明同切。T72 检查版本、engines 和包规。

### 收口测试与工作方法收尾
- [x] **DNLS03-T80** mega — 2026-11-19T19:05:14Z，`node --test dsh-nano-local-sandbox/test/dnls03-journey.mega.test.mjs`，1/1 PASS。调用实际包 `apply`、回环 HTTP、真实台账和 profile；Apple backend、`ctx.effect` 与可信具名主体是夹具。共享 owner 被拒且 broker 计数不变。
- [x] **DNLS03-T81** N=20 受控屏障：第二写者被拒、过期复核时新使用或新 PTY 登记成功，未发 stop。此项不替代 WS upgrade 测试。
- [x] **STEP.5** — 工作日志已回填至执行计划 §11，逐项证据记录在 §10.2。
- [x] **STEP.6** — 本地候选 closure：`../closure/DNLS03-closure.md`，不宣告完整交付。
- [x] **STEP.7** — 真相、完成度与防假绿三路 PROMPT、报告和复核结论已落盘 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/`。
- [x] **STEP.8** — 修复并复测后的代码提交 `b3ad7e5`；三路在该快照上复核 closure，一致支持 No-Go。需宿主能力的工作保持未验收。

## 4. 执行记录与证据
执行状态：P4 staged 完成（公开激活待原子同切）。开工点 `18ea26f`。主工作区保存原状：`9061673` [DNPR]，`909fa3f` 已移除的清单，`18ea26f` 计划与问答。`git fetch origin main` 后本地无落后提交。每笔 PASS 记录提交、命令、观测与 UTC；测试 ID 的否证以计划 §8.1、§8.5 为准。

- 横向：`index.apply → registerRoutes → routeSpecs`。现 `/mcp` 的 `buildOwners` 在同一 env 的现场上按 session 登记实例；`callTermTool` 的 create/list 走宿主 `active` 表；`observeOnce` 读 inspect，而 bridge 定位仍从 engine 推导。目标是替换权威来源，不是增加旁路台账。
- 历史图谱（按职责演进，不表示直接父子）：`2b9ac0f` session 实例/空闲回收 → `ed99c71` 实际路由接线 → `74d734f` 容器 PTY 与观察快照 → `ede7e45` PTY resize/错误边界 → `43e83d1` kernel/driver 切割 → `d0ddac4` 状态卷归 kernel 分配 → `1e41d91` 计划取样。`git diff 1e41d91 18ea26f -- dsh-nano-local-sandbox dsh-nano-terminal dsh-nano-kitesurf` 无源码差异。
- 正反例：唯一锚表为计划 §7.1；`test/lifecycle.spike.test.mjs` 的删行、`test/term-bridge.test.mjs` 的 create 发 URL 是旧语义；`threat.spike.test.mjs` 的 local 协议不是它们的替代断言。`context/apple-container`、`context/deepseek-harness` 仅供参考，不是构建输入。
- T00：从 worktree 根执行 `DNLS_MEASURE_HOST_PIN="$(git rev-parse --path-format=absolute --git-common-dir)/../.dependencies/pinned/deepseek-harness" node --test dsh-nano-local-sandbox/test/once/dnls03-anchors.once.test.mjs`。一次性历史测量，不加入包测试；以本阶段提交重现。A-23 命中 `admit(request)`；当前 pin `9c2670d` / [dsh] rc.5，与 Q41 原取样 rc.1 `66491b0` 的 `rpc.ts`、`rpc-host.ts`、`peer.ts` Git blob 分别同为 `aec79d0`、`88e7b48`、`3978399`。不推论运行时的业务权限或页签已可用。
- Phase 0 提交 `ba55bf7`；Phase 1 提交 `e32697b`。Phase 1 内核（不声明公开路由已切）：2026-11-19T16:22:30Z，`node --test dsh-nano-local-sandbox/test/control-registry.test.mjs dsh-nano-local-sandbox/test/instances-ensure.test.mjs`，26 pass / 0 fail；T01 文件字节可重开、原子写失败不报成功；T02 两个 session 释放后重开同一对象；T03 子进程持锁时第二写者失败，进程退出后原行可读；T04 有卷无账、损坏及不明代次失败关闭。原有 session 路由和旧用例等待原子同切，不作 T02 或产品交付证据。
- Phase 2 提交 `589c8ea`。Phase 2 staged 派发（公开激活待原子同切）：2026-11-19T16:43:44Z，`node --test dsh-nano-local-sandbox/test/{contract-version,target-dispatch,error-catalog,route-scan-coverage}.test.mjs`，22 pass / 0 fail；projection+bake 复跑零漂移。最近聚焦复跑 2026-11-19T16:44:49Z，`node --test dsh-nano-local-sandbox/test/contract-version.test.mjs`，10 pass / 0 fail；T10 HTTP/MCP 发现同源且不触对象；T11 admit 信封（rejection/peer/signal.aborted/未知形状）、版本配对、七项错误、信封清洗；T13 单目标与重复键/转义键/越限体拒于 execute 前。
- Phase 3 staged 生命周期与对象授权（公开激活待原子同切；登记时生命周期/授权文件未入库，提交引用待下一阶段回填）：2026-11-19T16:59:33Z，`node --test dsh-nano-local-sandbox/test/{lifecycle-operation,object-authz,control-registry,delivery-guard}.test.mjs`，75 pass / 0 fail。最近聚焦复跑 2026-11-19T17:02:44Z，`node --test dsh-nano-local-sandbox/test/lifecycle-operation.test.mjs`，21 pass / 0 fail；T20 意图单次落盘先于特权调用、同键同参返原、断连事件不取消在途操作、代次不符/中途替换/删除不确定一律 indeterminate 不置墓碑、墓碑内同提交者可读已完成操作、真实 `backend-apple.js` 仅对精确缺失诊断返回 null；T21 断连记 `disconnected`；T22 可见/可用分级、终端非通配、审计白名单无 URL。
- Phase 4 staged 终端 broker（公开激活待原子同切；文件未入库，基于 Phase 3 提交 `ac025df` 的工作树）：2026-11-19T17:38:00Z，`node --test dsh-nano-local-sandbox/test/{term-bridge,terminal-contract,term-broker.spike,profile-load}.test.mjs`，15 pass / 0 fail。T30 create/list 无 URL、attach 仅冻结 `dnt-ws-v2` 形状且拒绝 token/userinfo/socket 定位符；T31 真实两宿主进程：宿主 A（`openControlRegistry` + `createTerminalOwner` + 夹具 `createWorker`）建立 shell 导出 `DNLS_PROOF` 并打印 nonce-PID，SIGKILL A 后宿主 B 重开同一台账，attach 原 terminalId 并输入新 nonce，实测两端 shell PID 同为 91805、`proof-ev9401` 环境变量存活、无 respawn、close 后 socket 消失；T32 `(principal,openId)` 去重同参返原引用、已结束不复活、失联 attach 503 不 spawn、create 应答校验 `{ok:true}` + terminalId 一致。worker 绑 socket 先于 fork、单事件循环 waitpid、HUP→KILL 有界、PTY EOF 注销主 fd 不空转、AF_UNIX 有界出站缓冲增量写、`bytes_b64` 二进制安全 read、无效 cwd 拒绝、回收后不再对可能复用 PID 发信号；生产 CLI 仅固定常量，测试经 `createWorker`/`callWorker` 导入夹具；配方 digest/tag 按 `recipeDigest` 重算 `216aa53e4c48`（pin 不变）。

- Phase 5 staged 托管数据面（公开激活待原子同切；文件未入库，基于 Phase 4 提交 `6f84933` 的工作树）：2026-11-19T17:46:28Z，`node --test dsh-nano-local-sandbox/test/{term-wire-v2,term-attach-authz,term-broker.spike,threat.spike}.test.mjs`，22 pass / 0 fail；DNT `node --test test/{lanes-sandbox,keep-alive}.test.mjs` 26 pass / 0 fail，`npm run build` 重建 `lib/client.js`。复审修复后聚焦复跑 2026-11-19T18:06:32Z，`node --test dsh-nano-local-sandbox/test/{term-wire-v2,term-attach-authz,object-authz}.test.mjs` 16 pass / 0 fail；`node --test dsh-nano-terminal/test/lanes-sandbox.test.mjs` 13 pass / 0 fail。T40 一次性 locator 仅 exact-path registerUpgrade（无监听/令牌/串），严格 open/ready、SNAPSHOT 先于 DATA、逐连接 CREDIT、序列化 socket 任务、严格环位 `from===seq ∧ seq===from+len` 缺口 realign 不回放、空闲轮询 ≥1s、几何/序号先验再 u32 序列化、bufferedAmount 上限；T41 issue/upgrade/每批 RPC 双侧 admit 同一 IncomingMessage + 活观察，`ref.principal` 易主即废、撤权/世代漂移 1008 detach 不杀 PTY、协议错 1002、pending 恰一次消费、dispose 有界静默；worker `pyte` 快照与环同窗一致。T42 [DNT] McpLane 仅 sandbox 分支：选择以 `contractVersion` 宣告（T-O-45，不按 URL/插件名）、同源 http 端点 + 同源 ws 校验、`sandbox.contract` 精确版本 + 非发现结果必须带合同信封、显式 terminalId 仅 attach 救回、无 terminalId 须显式 paneId/openId create 一次、传输断开最多一次新 attach 不重建不回放、`alignMode`/`streamReady` 门控、1008 不重连、close 仅 detach；第三方与 local 线原样。`resolveOwnerPrincipal` 仅认真实 live AbortSignal。

校时：17:46:28Z 首轮为 21/21 与 20/20；上列 22/22 与 26/26 是 18:02:46Z 复审后的结果。

- Phase 6 staged 代码流 P6-01/02 部分落地（公开激活待原子同切；基于 Phase 5 提交 `b7f3d34` 工作树）：2026-11-19T18:14:35Z，`node --test test/{service-ports,managed-revision,lifecycle-operation,control-registry}.test.mjs`，47 pass / 0 fail。已落地：台账行 schema 增 `ports[]`（{serviceId,containerPort,hostPort,protocol,hostAddress} 环回/tcp|udp/无重复元组，墓碑释放、重开拒绝活行冲突）、`managedAt` epoch-ms、`desiredRevision`、`appliedRevision`、`saveRevision`/`applyRevision`、create intent 内同步全量端口分配（跨 profile 扫活行）、adopt 精确发布元组、operation.args 持久化规范化参数；`managed-profile.js` `createManagedProfileSource`/`serviceMappings`（driver 装载、服务声明验证 cwd/protocol/role、env 端口池 prod/dev/desktop 不相交、覆盖限值校验、preflight/verifySpec/createSpec/resolveCwd/portPlan 接缝）；`profile.yaml` 服务 decl 增 protocol/cwd/role 与 isolation.limits；observation 保留 publications/resources/mounts/imageDigest/creationDate/observedAt（PublishPort 拒绝 count>1/通配/非环回）；`backend.imageEvidence(tag)`（ImageResource 长度1 descriptor.digest sha256）；lifecycle create 走 createSpec+verifySpec+按 desiredRevision 落 applied 凭据，recreate 显式 expectedRevision/interruptTerminals/preserveVolume 预检→验停→终断终端→验缺席→同 locator/volume/ports 重建→verifySpec 后先绑世代再记 applied 凭据，partial 一律 indeterminate 不伪造。阻塞未落地：routes.js bridgeControlBase/ensureBase/observeOnce 全面改经 verified publications 与移除 +1/hostname 回退（2582 行大手术未做）、docs bindings +1 安全论证文本、term-bridge resolveCwd 走服务 cwd allowlist、capability 路由对外暴露 revision/service 面。recipe digest 不受影响（yaml 与 driver 在配方外）。

## 5. 交接
Phase 5 提交 `b7f3d34`。Phase 6 内核验证完成；下游待 Phase 7 与 Phase 8 的公开同切。记录均来自独立工作树，不是 Apple 实机部署证明：

- T50：2026-11-19T18:23:21Z，`node --test dsh-nano-local-sandbox/test/{loop3-gaps,routes,instances-ensure,elements-route,dom-health-routes,navigation-route,network-route,page-routes,lifecycle-route,adopt-running,kitesurf-runtime,repin-reconciliation,delivery-guard}.test.mjs`，131 pass / 0 fail。`/control` 只命中 `engine+2`，`engine+1` 接收零请求；另有真实回环监听验证撤掉映射后无后续流量。
- T51：2026-11-19T18:28:54Z，`node --test dsh-nano-local-sandbox/test/{environment-owner,term-bridge,managed-revision,lifecycle-operation,service-ports}.test.mjs`，50 pass / 0 fail / 0 skip。实际 profile 与 MCP 路由组合；保存不调 backend，第二次用旧修订返回 409；实测资源不符保留最后回执。较早的 47 项仅是内核夹具，不作为端到端证明。
- T52：2026-11-19T18:24:20Z，`node --test dsh-nano-local-sandbox/test/usage-minutes.test.mjs`，2 pass / 0 fail / 0 skip。删除临时库中的一分钟后，CPU 不跨缺口；第二写者被拒，读窗口不采样。

Phase 6 提交 `3f87460`。Phase 7 内核测试（基线 `3f87460`，提交以本文件所在 Phase 7 提交为准）：

- T60：2026-11-19T18:37:29Z，`node --test dsh-nano-local-sandbox/test/{fleet-projection,environment-owner,route-scan-coverage}.test.mjs`，24 pass / 0 fail。无权或访问中换代时不返回 PID，进程字段有白名单；宿主未配置的 env 不计数。
- T60：2026-11-19T18:47:10Z，`node --test dsh-nano-local-sandbox/test/{bridge-projection,environment-owner,profile-load}.test.mjs`，16 pass / 0 fail。桥的 HTTP 端不能发布；宿主使用只读镜像助手，更新顺序或身份不符不改旧投影。镜像配方 digest `sha256:6c62ed8a7153ab40bc59ba2434c83cac667e2c27391502b7a381e337bcba7f4b`，未构建或部署镜像。
- T61/T81：2026-11-19T18:44:54Z，`node --test dsh-nano-local-sandbox/test/{quota-idle,lifecycle.spike,registry-race.soak}.test.mjs`，23 pass / 0 fail / 0 skip（含 20 个竞态子例）。
- T50 补证：2026-11-19T18:41:19Z，`node --test dsh-nano-local-sandbox/test/{cdp-transport,loop3-gaps,dom-health-routes,page-routes}.test.mjs`，32 pass / 0 fail。Phase 6 只证实 `/control`，复查另发现 CDP transport 有相邻端口推断；已移除该推断及 relay 失败后的直连。

Phase 7 提交 `b33a2a8`。Phase 8 的真实入口只注册 managed 分派器。独立静态审查发现 inspect/processes 未配 HTTP、列表层级用错、WS 数据面关停太晚以及共享 owner 不足以证明终端归属；在当前切割提交修复。完整回归：2026-11-19T19:05:58Z [DNLS] `npm test` 433/433，19:07:17Z [DNK] `npm test` 51/51；19:07:37Z [DNT] T42 定向 33/33，19:07:46Z 沙箱 wire + local 威胁回归 20/20。四次均 0 fail、0 skip。无真实容器和部署。审查在 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/`，最终裁定在 `../closure/DNLS03-closure.md`。

## 6. [业主] 补充验收：开发实例

2026-11-20 UTC，[业主] 要求在 `dsh-dev` 重新构建、部署并深测依赖 [DNLS] 的插件，同时交付已有 session 的 [dsh工作台] dashboard 和 control 页面。这不是无 session 页签授权，也不改变 sandbox 的物理身份。以 `085a858` 为补充工作的基线。

- [x] 识别开发实例和消费端：开发 Web、mDNS 和 tokenbroker 正在运行；`~/.dsh-dev/profiles/web` 注册十个 nano 包。扫描已装插件公开 [DNLS] 路由和工具名，直接调用者为 [DNK] 和 [DNT]。未把其余七个插件的功能视为已验证。
- [x] 已登录开发站基线：旧 `/status`、`/ports`、[DNT] `/health` 返回 200，`engineAlive=true`，terminal health 公告 local/mcp；旧 MCP 有 28 个工具、有 `sandbox.instance.ensure`，无 `sandbox.contract`，`GET /contract` 返回 404。三个已装文件的 SHA-256 都不同于候选版。仅此不能证明新版本兼容。
- [x] 重建缺少的 Apple 镜像：原 pin `39feadfb9a3e6c14b40cf170a559ce417d0fce5d` 的开发 runtime 已就绪；`build-profile.mjs --check` 起初退出 3。使用新临时 build context、真实 rc.5 宿主 confinement 构建，复查 `ready: true`。`container image inspect` 实测新镜像 digest `sha256:4421d6004e216665e20a8534deb711782d2595d21edbf8e90fcbb76312b8d2cc`（不是配方摘要）。
- [x] 真实 Apple backend 只读探针：观察到 `kitesurf-dev` 代次 `678873f64dfca11ef49aa25e48bc8c71`，旧镜像 digest `sha256:c97bfe17140afa82bd76c6c35b180801f5300c931ec207eb7629848ac9e26808`，端口 8800/8801 和三项实挂。已识别安装版 debug CLI 的固定首行提示导致严格缺失判据误报未知；修正后再次以独立随机不存在名访问实际 CLI，返回 `null`，未删除任何对象。
- [x] 三包重建。[DNLS] 注册同包、已挂载 session 的正式右栏 `dnls-sandbox` 页签；总览列出可见对象，控制页按显式选择显示 inspect、服务、分钟覆盖、进程和生命周期回执。实现测试运行：[DNLS] 包 443/443（PTY 快照用例首次并发失败，单跑及复跑通过）；[DNK] 包 51/51；[DNT] 包 272/272。随后收紧响应合同、修复服务字段与读取竞态，[DNLS] 再构建且 `client-pane/identity/dnls03-docs` 定向 16/16；不是对最终版再次全量运行的声明。
- [x] 使用开发站实际使用的 `~/.dsh-runtimes/0.2.2-rc.5/bin/dsh`，以独立临时 `DSH_HOME` 实际 `plugin --profile web add -w` 三个 tarball，再启动 web profile。回环站 `/contract`、`/sandboxes` 均返回正式版本、200，列表空。通过宿主 `session/create` 创建真实测试会话，不发送模型消息。从 [dsh工作台] 正式向导点击「沙箱」，看到总览、禁用的控制按钮和空态；点创建表单，经实际 MCP 加载可用 `kitesurf` profile，未提交写操作。最终打包 SHA-256 前缀：[DNLS] `146e87314fea`、[DNK] `8fc2672bf1f0`、[DNT] `5528ace1cab4`。不冒充运行中的开发站或非空对象的真实控制验收。
- [x] 重新锚定（基线 `a3f081f`）：[业主] 要求彻底删除旧开发实例及其数据，不备份、不迁移，不把保卷当作切换条件。复查中断现场：`kitesurf-dev` 已 stopped，仍在 Apple 容器清单里；原挂载目录仍在。其他实例不在范围内。
- [x] 2026-11-20 UTC：复核旧容器 ID、镜像、创建时间、stopped 和实际挂载后，`container delete kitesurf-dev` 成功；再用全量 inspect 清单验证其他容器均不挂载旧卷，然后删除 `~/.dsh-dev/nano-local-sandbox/state/kitesurf/kitesurf-dev` 和空的 profile 父目录。复验旧容器与卷均不存在，state 根为空，未备份、未造台账。
- [x] 三个候选 tarball 安装到 `~/.dsh-dev` 的 web profile（稳定制品位于 `artifacts/dnls03/a3f081f`）。核对实际解析出的三个浏览器包 SHA-256 与 worktree 一致、[DNLS] 生产依赖 `ws` 可解析；仅 kickstart `ai.deepseek.dsh.dev.web`。真实 HTTPS 开发站 `/contract`、空 `/sandboxes` 均为 200，响应头和正文均为 `dnls.control/1`。
- [x] 正式 HTTPS 开发站：新 `sandboxId` 为 `7ef19658-39c7-43e7-8dc8-d387a45a9d83`（`dnls03-dev`），create 操作 `2b1dbf37-05fa-40db-b979-22b97dc8da52` 由 202 经精确查询得到 `succeeded/verify`。Apple 容器 `dnls-4e589664-34b9-468c-94a9-3e6089c9903b`，同名 UUID 状态目录按 sandboxId 而非容器 locator 创建，未复用旧卷。
- [x] [dsh工作台] 显式选对象后，控制页显示真实代次 `2cff00ff01a4e813ea1d8eb39c2d1b93`、已发布 `127.0.0.1:8940/8941`、来宾进程。页面点击停止、确认、重查：操作 `781c06d4-6f0f-4d3a-bf81-2c13fc83ca9d` 成功且 inspect 变为 stopped；再启动操作 `126ea9ab-ca5b-4c83-baa9-7852727a36db` 成功，原对象及代次返回 running。`sandbox.services` 实测走声明的 MCP 工具，返回两个已发布项，不是虚构的 HTTP `/services`。
- [x] [DNK] 的选择器初始为空，选择该对象后从页内示例入口实际打开 example.com。定向 `/dom` 回显相同 sandboxId、含 `Example Domain`；关闭 HTML 模式后页面实际解码截图为 653 x 959。未用裸端口或相邻端口回退。
- [x] [DNT] local 通过实际 MCP 创建专用 `/bin/sh` PTY，写入 `731` 后读回 `DNLS-result-742`，关闭自己创建的终端后健康端点报告零会话。生产 shared owner 对受管 `term.session.list` 和 `term.session.create` 都得到 403，未返回 terminalId 或 locator。未将拒绝误记为可交互的 managed 终端。
- [x] 实测调试并再部署：修复已确认操作后详情和进程表过期、失败的 inspect 无法手动重试，以及窄屏中刷新/重查按钮超出可视区。构建通过，`node --test dsh-nano-local-sandbox/test/client-pane.test.mjs` 15/15；部署的新 [DNLS] tarball SHA-256 `8544969be5c1131832aa662deabb8334fbc0436f00446f143894336c6e842e05`，三包实际加载的 client 字节与 worktree 再次核对一致。
- [x] 重启开发 Web 后原对象仍在。新版页面加载进程表，stop `677f3273-e5f2-4503-a937-a14e87af04e3` 成功后仅点击重查，页面即变为 stopped 且旧进程区消失。390 CSS px 下页面宽度 390；刷新、重查、启停及重启按钮最右边界均不超过 188 px。start `fd431676-6dad-41fe-a728-3d78e67784da` 成功，页面回到 running；最后 `/status` 的 `engineAlive=true`，原 UUID 和代次未变。没有因修复而重新建卷或再创建沙箱。

## 附件：原始发车指令
登记 ID：`DNLS03-managed-sandbox-control/directive-1`。以下为本次授权原文，引用此处，不另建授权副本。

```text
# 工作范围与目标
仓库与分支: dsh-nano / main
目标: 按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作

## 本次工作涉及的编号
| 工作插件 | 工作波次 | 工作项目 | 子项阶段 |
|-------|-------|-------|-------|
| `dsh-nano-local-sandbox` | N/A | `DNLS03` | N/A |

---

## 原则
WARN#1 - 开始 `编码` 执行前, 必须保证工作树干净。如果工作树中有未保存的内容, 你会对内容进行分析, 然后在当前分支下完成 commit
WARN#2 - `业主授权`: 必须阅读 AGENTS.md 对应文档的指导下进行工作. 所有的工作必须建立独立的工作区
WARN#3 - 每一个 [执行计划] 中的 Phase 完成后, 你需要回到 todo.{工作项目}.md 中, 更新 checkbox 并登记执行状态, 不得在所有工作完成后一次性 tick 全部的 boxes
INFO#1 - 必须按照 [执行计划] 中的 DAG 中明确要求, 构建执行顺序。在构建 todo 文档的时候, 必须严格进行顺序 block 限制
INFO#2 - 工作波次是可选项。如果存在, 则下面的对应目录层级可以增加。如果没有指定, 则忽略这个层级
INFO#3 - 代码审查子代理的的 `专用审查PROMPT` 以及审查产出的 review 报告, 需要落盘于 [.anote/reviews/{工作阶段}/{工作项目}] 文件夹
INFO#4 - 按照 [执行计划], 在 `业主授权` 规范下, 有权对 workers 集群进行 live migration + rebuild + deploy , 并授权你在当前 `工作阶段` + `工作项目` 的框架内完成 digest 的创建与 SSOT 建立

---

## 上游必读文件
最终执行计划: [docs/specs/dsh-nano-local-sandbox/plan/DNLS03-managed-sandbox-control.md]
真相层: [docs/specs/dsh-nano-local-sandbox/qna/DNLS03-qna-truth.md]

---

## 工作方法
STEP.0 - 在 [执行计划] 位于的目录内, 在 `todo计划模板` 规范下创建 todo.{工作项目}.md 这个跟踪对象, 以 DAG + checkbox 的创建任务执行的跟踪文件. 你会将本次发车的完整指令, 作为附件, 注入在 todo 文档底部
STEP.1 - 重新拉取本阶段使用的全部上游必读文件, 并对工作区域的代码进行梳理, 从结构上理解当前工作区域的性质, 业务流转的方向, 建立对当前业务的横向层面认知
STEP.2 - 在建立横向认知后, 对重点代码的 git 历史进行回溯, 建立起从时间轴纵向上, 对焦点代码的历史沿革的认知。创建对 git HASH 映射关系的图谱
STEP.3 - 从横向和纵向上建立执行关系后, 判断是否存在对应的 reference-anchor, 是否拥有正例/反例可供参考, 是否在 context/ 内存在对应的参考系可以进行借鉴
STEP.4 - 在获得全部上下文后, 你会严格在 [工作目标] 的范围内, 按照 [执行计划] 中的详细要求, 进行完整, 完全的代码开发, 静态审查, 以及测试收口工作。在执行期间内每完成一个 Phase, 就对当前阶段对应的代码完成分组 commit
STEP.5 - 全部编码工作完成后, 使用 `工作日志模板` 创建 [工作日志] 并回填至 [执行计划] 文档的底部
STEP.6 - 按照 todo 中的安排, 完成全部的工作后, 按照 `closure模板` 要求, 输出本阶段 closure 文件至 docs/specs/{工作插件}/closure/{工作波次}/{工作项目}-closure.md
STEP.7 - 你会定制不少于3路从 **真相层对账**, **工作完成度**, **防测试假绿,防业务侧载** 等工作面的审查子代理, 对当前 todo 内已完成工作内容进行深度审查。审查开始前, 请为每一路子代理, 定制其专用的 Comprehensive 进攻性 `专用审查PROMPT`, 以便让子代理载入本次工作的 [执行计划] 后, 对我们本次执行展开深度, 专注, 全面地展开工作质量与数量的全面回顾
STEP.8 - 回收子代理的代码审查报告, 在汇聚, 分析, 整理, 核实全部子代理的分析后, 执行更新或修复。修复完成后再次进入 测试↔修复 循环, 直至完成本工作项目的收口。并更新 closure 文件

---

## 使用到的模板
`closure模板` = [.adocs/templates/closure.md]
`工作日志模板` = [.adocs/templates/code-execution-log.md]
`todo计划模板` = [.adocs/templates/action-todo.md]

---
# 发车指令
基于我的上述要求, 请立刻按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作
> Step.0 中的 todo 需要保留完整业主发车指令, 并注册本 directive
```
