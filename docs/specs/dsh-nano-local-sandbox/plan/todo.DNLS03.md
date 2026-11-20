# DNLS03 Action Todo — 受管 sandbox 控制面
[执行计划](DNLS03-managed-sandbox-control.md) · [真相层](../qna/DNLS03-qna-truth.md) · [决策来源](../qna/DNLS03-qna.md)

当前追踪：§8「补充阶段 S1–S6」。执行项、DAG、证据与终态都登记在该节；原 [`DNLS03/control-redesign`](todo.DNLS03-control-redesign.md) 清单转为它的 P2/P4 输入，`266bbda` 起的开发站启停成功不代表补充阶段通过。原发车附件（附件 A、附件 B）不变。

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

## 7. [DNK01] 并线：`kitesurf-http-render` 合入

[业主] 2026-11-20 裁决把 kitesurf 线合入本分支、在此共同收口，并按并线评估的推荐执行。合并方式为 `--no-ff`（父提交 `77e217e` 与 `c1d7c9c`），保留 [DNK01 问答](../../dsh-nano-kitesurf/qna/DNK01-1120-qna.md)引用的提交号；kitesurf 的分出点比本分支晚 5 个 [DNPR] 纯文档提交，随合并一并进入。kitesurf 工作树与分支在合并后退役。

**`/res` 的本次处置（[业主] 裁决，唯一登记处）。** `DNK01 T-O-5` 的代理不是对象动作：iframe 子资源请求带不上 `X-DNLS-Contract` 与 `sandboxId`，响应也不是 JSON。合并时：`object-pages.js` 不把 `dnls.res` 收为对象能力，台账行由 `managed-routes` 以 `sandbox.provider_unsupported` 失败关闭；受管 `/dom` 以 `buildSrcDoc(..., { proxy: false })` 保留真实地址，不把文档改写到不可用的代理上。`res-proxy.js` 及其单测保留，未接入受管宿主。

- [ ] **K-01** `/res` 归属 — 待 [业主] 在两者中裁决后，于 `DNK01` 或 `DNLS03` 问答一处追加：(a) `dnls.control/1` 之外的宿主路由，仅准入，同时决定是否拒绝宿主回环地址；(b) 按对象经沙箱网络取资源（与 `DNLS03 T-O-41` 及 `DNK01 T-O-4` 的路径形态冲突，需改约）。注意引擎在容器内解析 `localhost`，宿主侧代理解析的是另一台机器
- [ ] **K-02** `DNK01 T-O-1` `sandbox.open` — 作为对象能力实现：`arguments.sandboxId` 选目标、计入写调用；台账所引 `routes.js:1679` 是旧行号，以 `/open` 页面路由与 `object-pages.js` 为准
- [ ] **K-03** `DNK01 T-O-2`/`T-O-3` — 在 `profiles/kitesurf/mcp-bridge.mjs` 实现 `/control.relay` 与 relay 写拒绝；桥属镜像配方，改动后须重建镜像并对开发对象换代
- [ ] **K-04** `DNK01 T-O-6` 隧道 hint 与 `networking` 字段 — `/open`（及 K-01 落地后的 `/res`）附 hint，不改状态码
- [ ] **K-05** 受管模式下 `object-pages.js` 失败体只保留 `errorId`，[DNK] 打开失败对话框收不到 `engineLog`；决定接受降级或放宽 `redact`
- [ ] **K-06** 开发站复验 — kitesurf 证据册 E1–E15 取自生产旧版 [DNLS]，不移用于合并态；在 `dsh-dev` 经显式对象选择重放仍适用的项
- [ ] **K-07** 发布配对 — 合并后的 [DNK] 依赖 `dnls.control/1` 提供方；生产当前是 kitesurf 版 [DNK] 加旧 [DNLS]，两者须同批升级

合并态软件回归（2026-11-20，本分支工作树）：[DNLS] 468/468、[DNK] 52/52、[DNT] 272/272、`dsh-host-route-guard` 15/15；`check-route-sensitivity`（99 路由 0 漂移）、`check-feature-contract`、`check-clean-lib`、`check-client-rules` 通过，`check-ui-rules` 仅告警（新增 1 条来自 [DNK] 打开失败对话框的修复按钮）。新增断言：受管能力不含 `dnls.res` 且其路由返回 `sandbox.provider_unsupported`；`proxy: false` 时 https 与 http 引用保持原地址。未部署开发站。
## 8. 补充阶段 S1–S6（`DNLS03&extra`）· action-todo

> 文档性质：`action-todo`（DAG-guided execution）。执行对象是[执行计划](DNLS03-managed-sandbox-control.md)文末「DNLS03 补充计划 · W1 / W2 / W3（S1–S6）」。
> 目标：按 S1 → S6 完成补充阶段的编码、测试、现场取证与文档回填。
> In-scope：补充计划 §3 的 23 个工作项，编号 `S1-01`–`S1-13`、`S2-01`、`S3-01`–`S3-02`、`S4-01`–`S4-02`、`S5-01`–`S5-03`、`S6-01`–`S6-02`。
> Out-of-scope：桌面切换与桌面回滚、删除镜像、新增裁决或新阶段名、另立计划文件、把问答或本补充计划打进合并提交。
> 上游依据：[真相层](../qna/DNLS03-extra-qna-truth.md)（`T-O-55`–`T-O-71`，`FROZEN`；`NOT IMPLEMENTATION GRANT`）与补充计划 §2.4 的 CITE 表。
> authority / owner：[业主]。授权边界只到真相层已写明的开发站五类（`T-O-65`）与生产六类（`T-O-70`）。模型消息至多 6 条，一次完整重放上限 20 条，不提高。
> 基线：测量提交 `3e7a775`；分支 `dnls03-managed-sandbox-control`；开发站 `DSH_HOME=/Users/seanz/.dsh-dev`，`dsh` 为 `/Users/seanz/.dsh-runtimes/0.2.2-rc.5/bin/dsh`。
> 文档状态：`active` · 执行状态：`in-progress`
>
> **跟踪节写在本文件、而不是 `todo.DNLS03&extra.md` 的理由**：发车 STEP.0 的工作项目名是 `DNLS03&extra`，但 `T-O-55` 与「单一真源」禁止另立阶段或计划文件，补充计划 `S1-02` 也明写「`todo.DNLS03.md` 增加『补充阶段 S1–S6』」。因此本节是唯一执行跟踪，发车原文见文末附件 B。
>
> **本轮开工前的工作树处置（WARN#1）**：开工前有 3 项未提交内容，都是文档，不含产品代码——补充计划的附录与修订，以及两份新增的 extra 问答。已在当前分支落一笔普通提交 `27c43a9`。该提交早于 `S1-01` 的并入提交；补充计划 `S1-13 c)` 要求「问答与补充计划放在合并提交之后的第一个普通提交」，两者的共同约束是「并入提交本身不携带问答与本计划」，一笔独立的文档提交满足这一点，此处按 WARN#1 的干净工作树要求先落盘，偏差已记录。

### 8.1 核心脊

- **目标与边界**：交付补充计划 S1–S6 的代码、测试、现场证据与三处文档回填。不改官方 pin，不新增裁决，不扩授权，不碰桌面与镜像删除。
- **权威与决策**：已冻结的是[真相层](../qna/DNLS03-extra-qna-truth.md) 的 `T-O-55`–`T-O-71` 与 `R-1`–`R-12`。执行中若与冻结句冲突，停手回 [业主]，不在本节悄悄裁决。
- **完成定义**：`S1-01`–`S6-02` 全部勾选，且每个勾选都带 `DNLS03X-T*` 的通过证据；W3 另需 [业主] 在 P2 行的结论。
- **证据原则**：每项都要有四元组（操作号或命令、对象 ID 或文件、时间 UTC、结论）。「测试退出码 0」「文件在磁盘上」「页面能打开」都不能单独充当通过证据；夹具通过不是 W1 通过。
- **执行回写**：每完成一项，立即把本节 `- [ ]` 改为 `- [x]`，并补齐执行状态、UTC 和证据引用。未做、失败、被阻塞的项保持未勾选并写明原因。
- **交接原则**：被宿主依赖阻塞的项登记为宿主依赖，不冒充可用；不能完成的项写明下一动作与承接方。

### 8.2 依赖关系 / DAG

```text
S1-01 并入 main
  ├─▶ S1-02 跟踪与指针 ──────────────┐
  ├─▶ S1-03 终端主体 ─┐              │
  ├─▶ S1-04 写闸 ─────┴─▶ S1-05 四个工具
  ├─▶ S1-06 公开引用 ──▶ S1-07 页签与 drivers
  ├─▶ S1-08 删除 /res                │
  ├─▶ S1-09 失败体                    │
  ├─▶ S1-10 外壳回迁                  │
  └─▶ S1-11 删旧脚本                  │
                        S1-12 台账初值 ◀┘（需 S1-02 与全部代码项）
                                  │
                            S1-13 S1 出口（不部署）
                                  │
                            S2-01 一次构建
                                  │
                    S3-01 清场 ──▶ S3-02 新建一个
                                  │
                    S4-01 重放 ──▶ S4-02 八张截图
                                  │
                    S5-01 复跑 ──▶ S5-02 P2 返工 ──▶ S5-03 合入 main
                                  │
                    S6-01 生产六步 ──▶ S6-02 回填与删树
```

| 节点 | depends on | entry condition | exit condition | failure / blocked 路径 |
|------|------------|-----------------|----------------|------------------------|
| `S1-01` | 工作树干净 | 文档提交 `27c43a9` 已在分支上 | 并入提交只含并入与账本重建；两条 check 0 漂移 | 冲突出现在三个账本之外即停，不回退到 rebase |
| `S1-02` | `S1-01` | 并入已完成 | 本节存在；`todo.DNLS03.md:4` 指向本节；closure 两段横幅换一行 | 旧正文被改写即判失败 |
| `S1-03` | `S1-01` | — | owner 同代次可 create/attach；非 owner 仍拒 | 只改测试凑旧拒绝即判失败 |
| `S1-04` | `S1-01` | — | 代次凭据认出宿主；读白名单放行；`relay.conns` 只计 agent | 把 `publishHealth` 当凭据、按 `:79` 改 Origin 即判失败 |
| `S1-05` | `S1-03`、`S1-04` | — | 四个工具经 `tools.register`；接管中打开在 [DNLS] 分派器被拒 | 在桥上做拒绝、手改 `SKILL.md` 即判失败 |
| `S1-06` | `S1-01` | — | 不再调用 `kitesurf()` / `openKitesurf` / 私有 kind | 地址编码 URL 或 token 即判失败 |
| `S1-07` | `S1-06` | — | 引用页签锁定；`drivers` 只读；不可见即停全部定时请求 | 只删 `setInterval` 即判失败 |
| `S1-08` | `S1-01` | — | `/res` 与 `res.*` 消失；无墓碑；隧道 hint 只在 `/open` | 留别名或墓碑即判失败 |
| `S1-09` | `S1-01` | — | 内核失败带 `error`/`hint`；派发前只有 `errorId`；无 `incidentId` | 只断言「有 errorId」即判失败 |
| `S1-10` | `S1-01` | — | nano-ui 不再导出外壳；U10 计数等于 DESIGN §10 | 去凑第二个使用方即判失败 |
| `S1-11` | `S1-01` | — | 六条路径都不存在；`test:e2e` 消失 | 留别名即判失败 |
| `S1-12` | `S1-02` 与全部 S1 代码项 | — | 点名行与普查行逐行有终态 | 留「开放」即判失败 |
| `S1-13` | `S1-01`–`S1-12` | — | 三包 `npm test` 与 `check-*` 全绿；开发站未写、未重启、未发模型消息 | 任一红即停 |
| `S2-01` | `S1-13` | 三包全绿 | 记下 digest 与三包 SHA；只经 confine 构建一次 | 无 `ctx.sandbox` 即失败关闭 |
| `S3-01` | `S2-01` | — | 两个旧 UUID 的容器与精确卷都不在；审计与台账还在 | 任一步未证实即写「未清场」 |
| `S3-02` | `S3-01` | — | 新 ID、新卷、挂载三者都对上；只剩一个受管对象卷 | 半截或保卷重建不得 PASS |
| `S4-01` | `S3-02` | 安装 S2 候选 | 每条真机行各自通过；消息数 ≤ 20 | 失败行留到 `S5-01` |
| `S4-02` | `S4-01` | 同一对象同一 SHA | 八张 `p2-*.png` 齐 | 没有 [业主] 结论时状态是 `未观察` |
| `S5-01` | `S4-01` | 有失败行 | 只复跑失败行；对象 ID 不变 | 重跑未失败行刷绿即判失败 |
| `S5-02` | `S5-01` | — | P2 只有一处结论；镜像 digest 不变 | 顺手改别的插件即判失败 |
| `S5-03` | `S5-01`、`S5-02` | P2 已通过 | main 测试绿；重建 SHA 与 S5 复跑逐包一致 | 不一致即停，不得写回基准 |
| `S6-01` | `S5-03` | SHA 已比对通过 | 五项只读验收通过；镜像仍在 | 留存目录删除后才失败即停手报告 |
| `S6-02` | `S6-01` | — | 三处回填在删树之前写完 | 删树早于回填即判失败 |

### 8.3 工作项清单

- [x] `S1-01` — 并入 main 并重建三个 security 账本
  - **落点 / 对象**：本工作树；`security/route-sensitivity.json`、`security/feature-contract.json`、`security/perf-binding-ids.md`
  - **完成判据**：`git merge --no-ff main` 只做一次；冲突只出现在三个账本并经仓内脚本重建；两条 check 0 漂移；无 rebase；这一笔不带问答与本计划
  - **验证映射**：`DNLS03X-T01` · **依赖**：无（S1 首项）
  - **执行状态**：`complete` · **执行时间**：`2026-11-20T15:16Z` · **证据 / 备注**：并入 `805df28`，三账本无冲突；`check-route-sensitivity` 100 路由 0 漂移、`check-feature-contract` 101 路由；三包 468/52/272 全绿；并入提交不含 `qna/` 与补充计划
- [x] `S1-02` — 跟踪节、旧文档指针、closure 两段横幅
  - **落点 / 对象**：`plan/todo.DNLS03.md:4`、`plan/todo.DNLS03-control-redesign.md` 文首、`closure/DNLS03-closure.md:1` 与 `:7`、`docs/specs/dsh-nano-kitesurf/` 七份旧文档、DNK01 台账状态行与部署快照
  - **完成判据**：唯一的跟踪节存在，`todo.DNLS03.md:4` 指向本节；closure 两段横幅都换成一行且 §0 未改；七份旧文档只有文首指针；DNK01 只追加 `T-O-63/64/66/68` 的指针
  - **验证映射**：`DNLS03X-T02` · **依赖**：`S1-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-20T15:41Z` · **证据 / 备注**：closure `:1` 与 `:7` 两段横幅并成一行；redesign 文首加冻结指针；七份旧文档各加一行指针；DNK01 文头加四 ID 指针（状态行与部署快照并为一条：同一文件同一头块，重复两行无信息增量）；`todo.DNLS03.md:4` 改指本节
- [x] `S1-03` — owner 可持有自己的沙箱终端
  - **落点 / 对象**：`src/host/object-authz.js:49-57`、`AGENTS.md:96`、`test/dnls03-journey.mega.test.mjs:117-123`、`src/client/i18n.js:329`
  - **完成判据**：`principalKey` 为 `owner` 且代次匹配时可 create/attach；非 owner kind 仍 403；journey 断言改为同代次允许并另留一条非 owner 拒绝；AGENTS 写明两个浏览器标签不是跨用户证明
  - **验证映射**：`DNLS03X-T03` · **依赖**：`S1-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-20T15:26Z` · **证据 / 备注**：改 `object-authz.js` 的 `resolveOwnerPrincipal`：owner 的 `canUse` 放行 `terminal.*`，归属与代次仍由 `authorize` 逐条校验；journey T80 增「owner 自持终端可 attach」「他人终端仍拒」「非 owner kind 仍拒」；`object-authz.test` 断言同步；`AGENTS.md` 改口；DNLS 468/468
- [x] `S1-04` — 代次凭据、读白名单、relay 记账
  - **落点 / 对象**：`profiles/kitesurf/mcp-bridge.mjs:731-797,933,1045-1076`、`src/host/backend-apple.js:484-498`
  - **完成判据**：每代次随机凭据经 root/stdin/`env -i` 投放；宿主类接管中写成功；agent 类被拒且 `lastAt` 不变；无凭据 `POST /control` 403；换代后旧凭据失效；凭据不入任何响应；`relay.conns` 只计 agent 类；`:79` 的 `originAllowed` 不改
  - **验证映射**：`DNLS03X-T04` · **依赖**：`S1-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-20T16:05Z` · **证据 / 备注**：代次随机凭据：`src/host/bridge-credential.js` 生成、`backend-apple.js` 经 root+stdin+`env -i` 投放、桥 `isHostConnection` 逐次比对、guest helper `profiles/terminal/relay-credential.mjs` 经 `PACKAGE_RECIPE` 入镜像配方；agent 写被拒不动 `lastAt`；无凭据 `POST /control` 403；DNLS 469/469
- [x] `S1-05` — 四个模型工具与打开前拒绝
  - **落点 / 对象**：`index.js:19-35`（inject 增加 `tools`）、`src/host/routes.js:2`、`dsh-nano-kitesurf/lib/skill.js:38,82-83`、`src/skill/kitesurf-cdp/references/observability.md:26`
  - **完成判据**：四个工具经 `tools.register` 注册、主体走组合层适配器、缺 `sandboxId` 拒绝、结果经同一 `redact`；接管中模型工具与 `/mcp` 在 [DNLS] 分派器以 `kitesurf.control.held` 拒绝且只有 `errorId`；HTTP `/open` 不受此闸；卸载即注销；skill 改真源后经构建生成 `skills/`
  - **验证映射**：`DNLS03X-T05` · **依赖**：`S1-03`、`S1-04`
  - **执行状态**：`complete` · **执行时间**：`2026-11-21T00:39Z` · **证据 / 备注**：`index.js` 的 inject 增 `tools`，四个工具经 `tools.register` 注册并与 HTTP/`/mcp` 共用同一 `execute`；接管中工具与 `/mcp` 打开在分派器以 `kitesurf.control.held` 拒绝（派发前、只有 `errorId`），HTTP `/open` 仍达内核；缺 `sandboxId`、不可见与不存在一致、`redact`、卸载注销均有断言；DNLS 487/487
- [x] `S1-06` — 公开对象引用硬切
  - **落点 / 对象**：`src/client/index.jsx:393-394,835-838`、`src/client/i18n.js:102-103,319-320`、`src/host/terminal-resource.js:1-13`、[DNK] `src/client/index.js` 的 `patterns`/`canOpen` 注册处
  - **完成判据**：`kitesurf()`、`openKitesurf`、`openWorkspaceHint`、`workspaceMissing`、`'dnt-sandbox-terminal'` 判断都消失；`dsh-resource://sandbox/<envId>/<sandboxId>` 校验与 `terminal-resource.js` 同组；地址不编码 URL、session、token；零/一/多候选与核实失败都有断言
  - **验证映射**：`DNLS03X-T06` · **依赖**：`S1-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-21T00:02Z` · **证据 / 备注**：删 `kitesurf()`/`openKitesurf`/`openWorkspaceHint`/`workspaceMissing`/私有 kind；新增 `dsh-resource://sandbox/<envId>/<sandboxId>`（复用同一组正则）；`candidates`→`openResource` 交接；[DNK] 先 `contract` 再定向 `inspect`，失败不改投；DNLS 480/480、DNK 60/60
- [x] `S1-07` — 引用页签、`drivers`、隐藏即停
  - **落点 / 对象**：`profiles/kitesurf/profile.yaml:84-86`、`src/host/fleet-projection.js:222`、[DNK] `src/client/index.js:608-611,2030-2110,3058`
  - **完成判据**：一引用一页签且同一引用复用；`drivers` 只读投影到 `sandbox.list`/`inspect` 与列表工具；不含 `cdp` 时显示原因且不发对象请求；`tab.visible` 为假时 `/status`、`/shot`、`/dom`、`/control` 全停，恢复可见刷新一次；`keepMounted` 保留；「两个引用两个页签」只作软件回归
  - **验证映射**：`DNLS03X-T07` · **依赖**：`S1-06`
  - **执行状态**：`complete` · **执行时间**：`2026-11-21T00:39Z` · **证据 / 备注**：`drivers` 由 `managed-profile` 投影进 `fleet-projection`，list/inspect/工具同源；引用页签锁定对象且同一引用复用；`tab.visible` 假时 `/status`/`/shot`/`/dom`/`/control` 全停、恢复刷一次；无 `cdp` 灰显且零对象请求；DNK 73/73
- [x] `S1-08` — 退役 `/res` 与 HTML 代理改写
  - **落点 / 对象**：`src/host/res-proxy.js`、`test/res-proxy.test.mjs`、`src/host/routes.js:39,57,1081,1493`、`src/host/dom-srcdoc.js:23,76-117`、`src/host/object-pages.js:9-13`、`src/host/error-catalog.js:46-54`、账本五处、[DNK] `src/client/index.js:1533`、`src/client/i18n.js:106,338`、`src/skill/**/routes.md:19`、`recovery-playbook.md:18`
  - **完成判据**：路径与 `res.*` 九行消失且不留别名、开关或墓碑；srcdoc 只有真实地址；隧道域命中时 `/open` 成功体与失败体都带 hint 且状态码不变；账本少一行且 0 漂移；`proxied` 推断删除；HTML 提示改为静态投影说明；diagnostics 不再写「+ `/res`」
  - **验证映射**：`DNLS03X-T08` · **依赖**：`S1-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-20T16:05Z` · **证据 / 备注**：删 `res-proxy.js` 与单测、`RES_ROUTE`/`serveRes`/`proxy` 选项、`res.*` 九行、`dnls.res` 账本行；隧道 hint 常量在 `profiles/kitesurf/driver/index.js`，成功体与失败体同 hint 且不改状态码；[DNK] 删 `proxied`、改 `hintUnproxiedHtml` 与 skill refs；99 路由 0 漂移
- [x] `S1-09` — 失败投影收口
  - **落点 / 对象**：`src/host/object-pages.js:137`、`src/host/routes.js:1122-1128`、[DNK] `src/client/index.js:1436-1439`
  - **完成判据**：至少一例内核失败同时带 `error` 与 `hint`，键只有 `ok`/`errorId`/`error`/`hint`；`error` 按 240 字截断；另有一例派发前失败只有 `errorId` 且无 `hint`；失败体无 `incidentId`、操作行仍有；[DNK] 的 `engineLog` 死分支与 `openErrorLoopback` 删除
  - **验证映射**：`DNLS03X-T09` · **依赖**：`S1-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-21T00:41Z` · **证据 / 备注**：内核失败投影四键 `ok/errorId/error/hint`、`error` 240 截断、派发前只有 `errorId`、失败体无 `incidentId` 而操作行保留；[DNK] 删 `engineLog` 死分支与 `openErrorLoopback`；DNLS 487/487
- [ ] `S1-10` — 外壳退回 [DNLS]
  - **落点 / 对象**：`packages/dsh-nano-ui/src/shell.js:9,103`、`packages/dsh-nano-ui/index.js:18`、`src/client/index.jsx:12,762`、`docs/specs/dsh-nano-ui/DESIGN.md:153,210-216`
  - **完成判据**：`WorkbenchShell`、`StatusDock` 移回 [DNLS] client；nano-ui 入口不再导出；DESIGN §6 删该行、§10 为自绘控件登记 `nano-ui-exempt`；U10 计数等于 §10 行数；不去凑第二个使用方
  - **验证映射**：`DNLS03X-T10` · **依赖**：`S1-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [x] `S1-11` — 旧验收脚本整批删除
  - **落点 / 对象**：[DNK] `scripts/e2e-ego.mjs`、`eval-design-mode.mjs`、`eval-ego-vs-dnk.mjs`、`eval-proto-mcp.mjs`、`test/e2e-script.test.mjs`、仓根 `scripts/gui-smoke-kitesurf.sh`、`package.json:11`、`RELEASE.md:97`
  - **完成判据**：六条路径都不存在；`test:e2e` 消失；`RELEASE.md:97` 改写且不新增必跑项；不留别名；历史文档里的脚本名不回改
  - **验证映射**：`DNLS03X-T11` · **依赖**：`S1-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-20T15:52Z` · **证据 / 备注**：删六条路径（四份 `scripts/*.mjs`、`test/e2e-script.test.mjs`、仓根 `gui-smoke-kitesurf.sh`）；`package.json` 删 `test:e2e`；`RELEASE.md` 删该句且未新增必跑项；[DNK] 51/51；两条 check 0 漂移
- [ ] `S1-12` — 收口台账终态初值
  - **落点 / 对象**：本节下方的终态表；`plan/todo.DNLS03.md:126` 的旧 `/res` 句不改，由新节取代
  - **完成判据**：点名行（含 `K-02`）都有终态且属于四种允许值；普查行逐行复核后不留「开放」；可见行的证据栏写「待 S4」或「待 S6」
  - **验证映射**：`DNLS03X-T12` · **依赖**：`S1-02` 与 `S1-03`–`S1-11`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `S1-13` — S1 出口，仍不部署
  - **落点 / 对象**：三包 `npm test` 与 `check-*`
  - **完成判据**：三包全绿且 `check-*` 通过；开发站未被写、未被重启、未发模型消息；`S1-13 c)` 的文档提交已在分支上（见本节开头的偏差记录）
  - **验证映射**：`DNLS03X-T13` · **依赖**：`S1-01`–`S1-12`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `S2-01` — 一次镜像与三包构建
  - **落点 / 对象**：`scripts/build-profile.mjs`（经 `ctx.sandbox.confine`）、`profiles/kitesurf/profile.yaml:10-14`
  - **完成判据**：只在同一阶段内构建；记下镜像 digest 与三包 tarball SHA-256；不创建对象、不清场；无 `ctx.sandbox` 即失败关闭
  - **验证映射**：`DNLS03X-T20` · **依赖**：`S1-13`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `S3-01` — 清场两个点名对象
  - **落点 / 对象**：`~/.dsh-dev/nano-local-sandbox/state/kitesurf/`、两个旧 UUID `7ef19658-39c7-43e7-8dc8-d387a45a9d83`、`75bfac14-8cd4-4978-a101-32cb7115d988`
  - **完成判据**：先核对绑定与挂载，容器证实不存在之后才删各自精确卷；台账与 `term.audit` 不删；半截即写「未清场」
  - **验证映射**：`DNLS03X-T30` · **依赖**：`S2-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `S3-02` — 只建一个新对象
  - **落点 / 对象**：同清场顺序末两步
  - **完成判据**：新 ID、新卷、挂载三者都对上；该 profile 只剩一个受管对象卷且不是两个旧目录；保卷 `recreate` 不算这一步
  - **验证映射**：`DNLS03X-T31` · **依赖**：`S3-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `S4-01` — 一次完整真机重放（W1 → W2 → W3）
  - **落点 / 对象**：`.anote/reviews/dsh-nano-local-sandbox/DNLS03/`；场景 U1–U9、A1–A3 与 U7
  - **完成判据**：每条真机行各自有通过结论，带操作号、对象 ID 或截图名、session 标识、UTC；模型消息至多 6 条；加载字节与 tarball 一致
  - **验证映射**：`DNLS03X-T40` · **依赖**：`S3-02`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `S4-02` — 八张设计截图
  - **落点 / 对象**：同上目录，`p2-<视图>-<dark|light|390>.png`
  - **完成判据**：八张齐、每张带参考行与 client SHA；不截会话内容；[业主] 的结论只写在 P2 行
  - **验证映射**：`DNLS03X-T41` · **依赖**：`S4-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `S5-01` — 只复跑失败行
  - **落点 / 对象**：失败行的代码与本节对应工作项
  - **完成判据**：不第二次清场；换镜像只在同一对象换代；agent 行复跑仍受同一 20 条上限；对象 ID 不变
  - **验证映射**：`DNLS03X-T50` · **依赖**：`S4-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `S5-02` — P2 设计返工
  - **落点 / 对象**：`dsh-nano-local-sandbox/src/client/`
  - **完成判据**：只改 [DNLS] client；只重装 [DNLS] 并重启开发 Web；镜像 digest 不变；与 agent 无关的返工不发模型消息
  - **验证映射**：`DNLS03X-T51` · **依赖**：`S5-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `S5-03` — 合入 main
  - **落点 / 对象**：主工作区；不覆盖未提交文件
  - **完成判据**：`--no-ff` 合入且提交信息为 `merge(dnls): …`；main 上三包测试与 `check-*` 绿；按合并提交重建的三包与 S5 复跑逐一比对一致；不一致即停且不写回基准
  - **验证映射**：`DNLS03X-T52` · **依赖**：`S5-01`、`S5-02`，且 P2 已通过
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `S6-01` — 生产 web 六步切换
  - **落点 / 对象**：`~/.dsh`；三包目录、`~/.dsh/nano-local-sandbox/state/kitesurf/`、容器 `kitesurf`
  - **完成判据**：使用 `S5-03` 的比对结果不再重建；删除前核对 ID/镜像/挂载；状态根无其他条目且 `term.audit` 仍在；一次 `plugin add` 三个 tarball 加一次重启；五项只读验收都通过后才删留存目录；不删镜像、不碰桌面
  - **验证映射**：`DNLS03X-T60` · **依赖**：`S5-03`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `S6-02` — 回填并删除工作树
  - **落点 / 对象**：本计划 §11、本节、`closure/DNLS03-closure.md` §0、三份 `AGENTS.md`
  - **完成判据**：三处回填在删树之前写完；其余 closure 各节保留 `b3ad7e5` 快照并注明；三份 AGENTS 各加一行且不进 RELEASE 必跑项
  - **验证映射**：`DNLS03X-T61` · **依赖**：`S6-01`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`

### 8.4 验收与证据

判定细则以补充计划 §8.1 的 Test-ID 表为准；本表只登记执行结果。

| Check ID | 验证什么 | 方法 / 命令 / 产物 | 预期 | 实际结果 | 状态 |
|----------|----------|--------------------|------|----------|------|
| `DNLS03X-T01` | 并入后账本 0 漂移且并入提交不含问答 | `check-route-sensitivity`、`check-feature-contract` + `git show --stat` | 0 漂移；提交只含并入与三账本 | 未执行 | pending |
| `DNLS03X-T02` | 跟踪节与指针；closure 两段横幅只剩一行 | 人工 `git diff -U0` | 旧正文未被改写 | 未执行 | pending |
| `DNLS03X-T03` | owner 同代次 create/attach；非 owner 拒绝 | `node --test test/dnls03-journey.mega.test.mjs` | 两条断言都过 | 未执行 | pending |
| `DNLS03X-T04` | 代次凭据、读白名单、`relay.conns` | 现有 bridge 测试 + 新增攻击用例 | 缺任一条不 PASS | 未执行 | pending |
| `DNLS03X-T05` | 四个工具与三入口打开差异 | 三入口同夹具 | 拒绝在内核之前且只有 `errorId` | 未执行 | pending |
| `DNLS03X-T06` | 地址语法与候选分支；源码无私有入口 | 资源地址单测 + 源码扫描 | 扫描 0 命中 | 未执行 | pending |
| `DNLS03X-T07` | 页签复用、`drivers`、隐藏即停 | fork [DNK] pane 测试 | 四类定时请求全停 | 未执行 | pending |
| `DNLS03X-T08` | `/res` 与代理改写消失；隧道 hint 不换状态码 | 改三份旧断言 + 账本 check | 无墓碑；hint 双向 | 未执行 | pending |
| `DNLS03X-T09` | 失败投影白名单 | 投影单测 | 同时带 `error` 与 `hint` 的一例存在 | 未执行 | pending |
| `DNLS03X-T10` | 外壳回迁与 U10 计数 | `check-ui-rules --plugin DNLS --json` | 计数等于 DESIGN §10 | 未执行 | pending |
| `DNLS03X-T11` | 六条删除路径与 RELEASE 改写 | 存在性断言 | 六条都不在 | 未执行 | pending |
| `DNLS03X-T12` | 台账逐行终态 | 人工逐行核对 | 无「开放」 | 未执行 | pending |
| `DNLS03X-T13` | 三包测试与检查；未部署 | 三包 `npm test` + `check-*` | 全绿且日志写「未部署」 | 未执行 | pending |
| `DNLS03X-T20` | 一次构建的 digest 与三包 SHA | `build-profile.mjs` 经 confine | 记录齐全；只一次 | 未执行 | pending |
| `DNLS03X-T30` | 清场顺序与残留 | 现场核对容器、卷、审计 | 三者都被记录 | 未执行 | pending |
| `DNLS03X-T31` | 新对象三要素 | 现场核对 | 新 ID + 新卷 + 挂载 | 未执行 | pending |
| `DNLS03X-T40` | 每条真机行独立通过 | ego-browser + session 证据 | 逐行通过；消息 ≤ 20 | 未执行 | pending |
| `DNLS03X-T41` | 八张截图 | 文件名 + SHA | 八张齐 | 未执行 | pending |
| `DNLS03X-T50` | 只复跑失败行 | 对比 S4 记录 | 未失败行不重跑 | 未执行 | pending |
| `DNLS03X-T51` | P2 返工不换镜像 | 返工前后 digest | digest 不变 | 未执行 | pending |
| `DNLS03X-T52` | main 上的比对 | `npm test` + 重建 SHA 对比 | 逐包一致 | 未执行 | pending |
| `DNLS03X-T60` | 生产六步与五项只读验收 | 现场核对 + contract 响应 | 五项都过；镜像仍在 | 未执行 | pending |
| `DNLS03X-T61` | 回填先于删树 | 三处 diff 与删树时间 | 回填在前 | 未执行 | pending |

- **状态词**：`pass | partial | pending | blocked | not-applicable`。后四类都要写原因。
- **真实成功**：部署与 live 能力不得只凭 HTTP 状态、计数、health 或空结果抬绿；W1 只认 `dsh-dev` 上 U1 的通过。

### 8.5 当前状态与交接

- **当前节点 / 已完成**：`S1-01` 待开工 / 无
- **下一动作**：在本工作树执行 `git merge --no-ff main`，只处理三个 security 账本
- **当前阻塞**：无
- **待 owner / 外部决定**：U7 八张图的 P2 设计结论（到 `S4-02` 才需要）；桌面切换继续推迟，不需本轮处理
- **最终交接目标**：`S6-02` 之后的工作树删除与 [业主] 验收

| Item / node | 当前状态 | 原因或证据 | 下一动作 | 责任 / 承接方 | 重开条件 |
|-------------|----------|------------|----------|---------------|----------|
| `S1-01`–`S1-13` | `not-started` | 工作树已干净，`27c43a9` 已落盘 | 依次执行 S1 | lead | 三条账本以外出现冲突 |
| `S2-01`–`S3-02` | `not-started` | 等 S1 出口 | S1-13 通过后开工 | lead | 无 `ctx.sandbox` 时失败关闭 |
| `S4-01`–`S5-03` | `not-started` | 等新对象 | S3-02 通过后开工 | lead | 真机行失败则转 `S5-01` |
| `S6-01`–`S6-02` | `not-started` | 等 main 上的比对 | `S5-03` 通过后开工 | lead | SHA 不一致即停 |
| P2 设计结论 | `deferred` | 需 [业主] 看八张图 | `S4-02` 交付后请 [业主] 裁决 | [业主] | 图未齐 |
| P4 实机 | `deferred` | 等新对象与 S2 制品 | `S3-02` 通过后按补充计划 §4.4 执行 | lead | 无对象时的半截不算完成 |

### 8.6 已启用插件

#### `P-CTX` — Context / rebaseline

- **触发理由**：补充计划跨多阶段，且有大量 file:line 锚点会随并入 main 漂移。
- **本任务最低要求**：每次改代码前以 `git rev-parse HEAD` 与符号名重新对齐锚点；行号漂移以「路径 + 符号名」为准。
- **实际记录**：基线 `3e7a775`，文档提交 `27c43a9`。
- **证据 / 状态 / handoff**：并入 main 后重算一次锚点。

#### `P-SCOPE` — Scope / no-sideload

- **触发理由**：涉及容器特权、宿主路由、`.dsh` 生产目录与三个 security 账本。
- **本任务最低要求**：容器 CLI 只在 `backend-apple.js`；构建只经 `ctx.sandbox.confine`；不硬编 base-url 或密钥；不跨插件建专有通道。
- **实际记录**：S1 全程不部署；S6 只动 `~/.dsh` 的三包与状态根。
- **证据 / 状态 / handoff**：越界即停手回 [业主]。

#### `P-TEST` — Test ledger

- **触发理由**：23 个 Test-ID 跨单测、契约、live 三层。
- **本任务最低要求**：每个 PASS 都有四元组；夹具不等于真机；旧 e2e 与 E1–E15 不得移用。
- **实际记录**：见 §8.4。
- **证据 / 状态 / handoff**：见补充计划 §8.1。

#### `P-LIVE` — Live / root

- **触发理由**：S2–S6 要动容器、镜像、开发站与生产 `~/.dsh`。
- **本任务最低要求**：只执行 `T-O-65` 五类与 `T-O-70` 六类；模型消息至多 6 条；S6 不外发模型消息。
- **实际记录**：未开始。
- **证据 / 状态 / handoff**：超出清单即停手另请 [业主]。

#### `P-EXEC` — Execution log

- **触发理由**：多阶段、多轮、计划与实际必有偏差。
- **本任务最低要求**：append-only 记录偏差、first-red 与实际证据；偏差不藏。
- **实际记录**：文档提交提前于并入提交的偏差已记在 §8 开头。
- **证据 / 状态 / handoff**：随每阶段追加。

#### `P-CLOSE` — Closure / handoff

- **触发理由**：STEP.6 要求按 `closure模板` 更新 `closure/DNLS03-closure.md`。
- **本任务最低要求**：S1 只换文首两段横幅；§0 留到 S6 之后一次改写；其余各节保留 `b3ad7e5` 快照。
- **实际记录**：未开始。
- **证据 / 状态 / handoff**：`S6-02`。

### 8.7 Todo 自检

- [x] 核心脊齐全；目标、边界、authority、完成定义与下一步没有歧义。
- [x] DAG 的依赖、入口、出口、失败路径可读，且没有机械复制示例 block。
- [x] 每个 Item 都是 checkbox，初始 `not-started` 且未勾选。
- [ ] 每个 Item 的 Check-ID 都有实际证据（执行中逐项补齐）。
- [x] 适用插件已启用，不适用插件未保留。
- [x] 未把计划、可达性或计数写成完成；未完成项已有下一动作与承接方。

## 附件 A：原始发车指令（directive-1）
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

## 附件 B：补充阶段发车指令（directive-2）
登记 ID：`DNLS03-managed-sandbox-control/directive-2`。以下为本次授权原文，引用此处，不另建授权副本。

```text
# 工作范围与目标
仓库与分支: dsh-nano / main
目标: 按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作

## 本次工作涉及的编号
| 工作插件 | 工作波次 | 工作项目 | 子项阶段 |
|-------|-------|-------|-------|
| `dsh-nano-local-sandbox` | N/A | `DNLS03&extra` | N/A |

---
## 原则
WARN#1 - 开始 `编码` 执行前, 必须保证工作树干净。如果工作树中有未保存的内容, 你会对内容进行分析, 然后在当前分支下完成 commit
WARN#2 - `业主授权`: 必须阅读 AGENTS.md 对应文档的指导下进行工作
WARN#3 - 每一个 [执行计划] 中的 Phase 完成后, 你需要回到 todo.{工作项目}.md 中, 更新 checkbox 并登记执行状态, 不得在所有工作完成后一次性 tick 全部的 boxes
INFO#1 - 必须按照 [执行计划] 中的 DAG 中明确要求, 构建执行顺序。在构建 todo 文档的时候, 必须严格进行顺序 block 限制
INFO#2 - 工作波次是可选项。如果存在, 则下面的对应目录层级可以增加。如果没有指定, 则忽略这个层级
INFO#3 - 代码审查子代理的的 `专用审查PROMPT` 以及审查产出的 review 报告, 需要落盘于 [.anote/reviews/{工作阶段}/{工作项目}] 文件夹
INFO#4 - 按照 [执行计划], 在 `业主授权` 规范下, 有权对 workers 集群进行 live migration + rebuild + deploy , 并授权你在当前 `工作阶段` + `工作项目` 的框架内完成 digest 的创建与 SSOT 建立

---
## 上游必读文件
**执行计划**: [.agents/worktrees/dnls03-managed-sandbox-control/docs/specs/dsh-nano-local-sandbox/plan/DNLS03-managed-sandbox-control.md]
真相层: [.agents/worktrees/dnls03-managed-sandbox-control/docs/specs/dsh-nano-local-sandbox/qna/DNLS03-extra-qna-truth.md]

---
## 工作方法
STEP.0 - 在 [执行计划] 位于的目录内, 在 `todo计划模板` 规范下创建 todo.{工作项目}.md 这个跟踪对象, 以 DAG + checkbox 的创建任务执行的跟踪文件. 你会将本次发车的完整指令, 作为附件, 注入在 todo 文档底部
STEP.1 - 重新拉取本阶段使用的全部上游必读文件, 并对工作区域的代码进行梳理, 从结构上理解当前工作区域的性质, 业务流转的方向, 建立对当前业务的横向层面认知
STEP.2 - 在建立横向认知后, 对重点代码的 git 历史进行回溯, 建立起从时间轴纵向上, 对焦点代码的历史沿革的认知。创建对 git HASH 映射关系的图谱
STEP.3 - 从横向和纵向上建立执行关系后, 判断是否存在对应的 reference-anchor, 是否拥有正例/反例可供参考, 是否在 context/ 内存在对应的参考系可以进行借鉴
STEP.4 - 在获得全部上下文后, 你会严格在 [工作目标] 的范围内, 按照 [执行计划] 中的详细要求, 进行完整, 完全的代码开发, 静态审查, 以及测试收口工作。在执行期间内每完成一个 Phase, 就对当前阶段对应的代码完成分组 commit
STEP.5 - 全部编码工作完成后, 使用 `工作日志模板` 创建 [工作日志] 并回填至 [执行计划] 文档的底部
STEP.6 - 按照 todo 中的安排, 完成全部的工作后, 按照 `closure模板` 要求, 输出本阶段 closure 文件至 [.agents/worktrees/dnls03-managed-sandbox-control/docs/specs/dsh-nano-local-sandbox/closure/DNLS03-closure.md]
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
> 界定好边界后，继续在 [.agents/worktrees/dnls03-managed-sandbox-control] 工作树内，完成 DNLS03&extra 的开发
```

### 附件 B 的边界登记
- 工作项目名 `DNLS03&extra` 只作登记名；阶段名仍是 `DNLS03` 补充阶段，不另立阶段或计划文件（`T-O-55`）。
- STEP.6 的目标路径在发车里写作 `closure/DNLS03-closure.md`，与仓内既有唯一终判文件一致，直接沿用。
- 发车 `INFO#4` 的 live/rebuild/deploy 权限，按真相层收窄为 `T-O-65` 的开发站五类与 `T-O-70` 的生产六类；不因此新增第七类，也不覆盖桌面与镜像删除。
