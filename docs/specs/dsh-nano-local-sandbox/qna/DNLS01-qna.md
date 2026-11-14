# DNLS01 QNA · [真相层] 对账册（渐进式 · 多轮 append）

> **范围（scope）**：`docs/specs/dsh-nano-local-sandbox/dsh-nano-local-sandbox-v1.1.md` 所定义的 [DNLS] 全部任务的执行层真相锁定；本阶段专项完成该 eval 内的全部任务，最终输出为《DNLS01 计划》。本文只负责「方向怎么钉死、执行层怎么冻结」，不在本文改 eval 的 verdict / 价值判断。
> **qna 位点**：`pre-charter（多轮 deep-dive）`
> **角色配置（自填）**：提问 `DNLS01 架构 agent（lead）` · second-opinion `none` · 裁决 `[业主]`
> **second-opinion 模式（逐轮）**：`waived`（按 [业主] 指示，全程不提供 second-opinion 槽位；本文不设该栏）
> **下游消费者**：`DNLS01 计划`（planning §2 以本文 §1 Truth-Gate 的 `T-O-*` 为唯一 CITE 源）
> **文档状态**：`frozen`（**全轮收口 · 2026-11-14**）：Q1–Q10 → `T-O-9`–`T-O-18`，§1 Truth-Gate 共 **18 条 `T-O` 全部冻结**；STEP.1 全文梳理 / STEP.2 修复与冻结 / STEP.3 状态翻转均已完成；Round 5 触发条件未成立。冻结后任何变更按 §9「变更控制」追加，不改已冻结行。
>
> **campaign 结构（[业主] 已给定的框架参数，非本轮题目）**：`2 轮 × 2-QNA = 4 个 foundational-qna` → 转入 `每轮 3-QNA 的 executional-qna`，直至执行层真相全部冻结 → 输出《DNLS01 计划》。
>
> **本轮纪律声明（不可降级）**：
> 1. Round 1–Round 4（Q1–Q10）全部由 [业主] 全数冻结；本文为**收口轮、无后续轮次**。`§6.5.4` 的 Round 5 触发条件经 `§7.5.4` 复核**未成立**。
> 2. 四轮题目均基于上一轮冻结后的中场评估 + 新一轮代码检索与 Reasoning 提出；`§3` / `§5` / `§6.5` / `§7.5` 中场评估**均已补写实质内容**。
> 3. 每题含 4 组有效信息：`【对本问题的解读】` / `【可选选项清单】` / `【推荐选项的详细执行说明】` / `【推荐选项的支持证据 / 其他选项的反例】`。
> 4. 每轮提问前均在本仓库展开代码检索，证据精确到 `file:line`（Round 1 见 §2.0，Round 2 见 §4.0，Round 3 见 §6.0，Round 4 见 §7.0）。
> 5. 推荐方案一律按**长期治理**原则：`能硬切就不要双写` / `能彻底退役就不要提供兼容` / `平台保持中立` / `不得耦合私域`。
>
> **证据快照**：HEAD `9aee891`（`入库 DNLS v1.1 评估档`）。⚠️ 仓库处于活跃开发中（前序文档已被重命名为 [`dsh-nano-local-sandbox-v0.9.md`](../dsh-nano-local-sandbox-v0.9.md)，2433 行；本文引用的 `file:line` 为该 HEAD 快照，行号漂移时以「路径 + 符号名」为准）。

---

## 0. 分轮状态总览

| 轮次 | 题号区间 | 焦点 | second-opinion | 状态 |
|------|----------|------|----------------|------|
| Round 1 | `Q1–Q2` | **foundational**：[DNLS] 的注册形态与权威边界（Q1）；所有权切割方式（Q2） | `waived` | **已冻结（`T-O-9` / `T-O-10`）** |
| Round 2 | `Q3–Q4` | **foundational**：消费者接入面分工（Q3）；实例 scope 与 policy 边界（Q4） | `waived` | **已冻结（`T-O-11` / `T-O-12`）** |
| Round 3 | `Q5–Q7` | **executional**：profile manifest 与构建配方（Q5）；instance registry 与 `policyFingerprint`（Q6）；四 L2 契约面与错误 / 台账单一真源（Q7） | `waived` | **已冻结（`T-O-13` / `T-O-14` / `T-O-15`）** |
| Round 4 | `Q8–Q10` | **executional（收口轮）**：CDP driver socket 生命周期（Q8）；terminal driver 与工具面公共契约（Q9）；对等验收 / 审计 / 门禁 / 收口判据（Q10） | `waived` | **已冻结（`T-O-16` / `T-O-17` / `T-O-18`）** |
| Round 5+ | — | **未开启（已收口）** | `waived` | `§6.5.4` 触发条件经 `§7.5.4` 复核未成立；本 QNA 全轮冻结，不再续轮 |

> **分轮纪律**：Q 编号 append 续编、不回收；每轮一个 focus；下一轮题目必须能回答「它由 §1 哪条 `T-O` 钉死方向后、为补哪个未定点而问」。**本文件含 Round 1–Round 4 共 10 题、§1 共 18 条 `T-O`，全部已冻结；不含 Round 5+ 任何题目**。
>
> **术语锚定**：按仓根 [`AGENTS.md:11`](../../../../AGENTS.md#L11)，本文全程使用 `[业主]`、`[dsh]`、`[dsh-nano]`、`[DNLS]`、`[DNK]`、`[DNT]`、`[真相层]`、`[dsh工作台]` 等方括号锚定。`[DNLS]` 的单一名字与「登记进 [`AGENTS.md:23-29`](../../../../AGENTS.md#L23-L29)」动作已由 Q1 / `T-O-9` 冻结；**该登记动作由《DNLS01 计划》承接实施**（全轮冻结 ≠ 实现完成，见 §7.5.3）。

---

## 1. ★ Truth-Gate 台账（已锁定真值 · NORMATIVE · append-only across rounds）`[核心·锁死]`

> **渐进引擎**：本表是下游《DNLS01 计划》§2 的唯一 CITE 源。`T-O-*` 与 planning §2 共命名空间，**qna 只产 `T-O`**；`T-R` 来自 reference-anchor，不进本表。
>
> **baseline（Round 0）**：按 [业主] 指示，先把前序讨论中**已确定、不再提问**的真相冻结为 `T-O-1`–`T-O-8`，作为后续所有问题的 baseline。后续问题一律标注「驱动真相」。
> **全轮裁决结果**：[业主] 已全数同意四轮推荐，Q1 → `T-O-9`、Q2 → `T-O-10`、Q3 → `T-O-11`、Q4 → `T-O-12`、Q5 → `T-O-13`、Q6 → `T-O-14`、Q7 → `T-O-15`、Q8 → `T-O-16`、Q9 → `T-O-17`、Q10 → `T-O-18`（**全部已冻结**）。`T-O-1`–`T-O-8` 为 Round 0 baseline。无待预填条目。

| Truth-ID | 子类型 | 已锁定真相（一句话） | 来源（Round / Q） | 驱动了哪些后续题 | 下游约束 |
|----------|--------|----------------------|--------------------|------------------|----------|
| `T-O-1` | `foundational` | **首期完全在 macOS 下工作；x86 / Windows / NVX 全部后置，待 macOS 内部适配完成后再转向 Windows 支持。** | [业主] 指令 1（2026-11-14） | Round 1 Q1、Q2；后续全部轮次 | [DNLS] 首期不实现 NVX；但 backend 抽象须按「两种实现都装得下」设计（`dsh-nano-local-sandbox-v1.1.md:5.2 A-1/A-2`） |
| `T-O-2` | `foundational` | **[DNLS] 是唯一持有 mac container 特权的平台层；[DNK]、[DNT] 及未来 xray / gateway / 本地 S3 全部是消费者，代码里不得再出现 container 权限。** | [业主] 指令 2、3、4 + `dsh-nano-local-sandbox-v1.1.md:1.4` | Round 1 Q1、Q2 | 特权唯一（B3 边界）；全仓 `spawn('container')` 只允许出现在 [DNLS] |
| `T-O-3` | `foundational` | **[DNK] 废弃自身打包 / 唤醒 / 启动 / 重启 container 的能力，退化为纯粹前端消费者 + CDP driver 对接人；Kitesurf 版本、workerd、KV / D1 等 v8 isolate 下的构建均由 [DNLS] 提供后端能力与维护。** | [业主] 指令 3 + `dsh-nano-local-sandbox-v1.1.md:1.3 R6/R7/R8` | Round 1 Q2 | 版本 pin、镜像 digest、checkout ref、state 目录归 [DNLS] 单一真源 |
| `T-O-4` | `foundational` | **[DNLS] 提供完整 MCP 与 CDP 驱动；未来 xray / gateway / 本地 S3 及 [DNT] 对 sandbox 的直接连接与 terminal 操控，全部在 [DNLS] 下发展，不另起平台。** | [业主] 指令 4 + `dsh-nano-local-sandbox-v1.1.md:1.3 R9/R10/R11` | Round 1 Q1；后续 executional 轮次 | 新增后端服务 = 新增一份 profile，不改 L1 核心 |
| `T-O-5` | `foundational` | **[`dsh-nano-local-sandbox-v0.9.md`](../dsh-nano-local-sandbox-v0.9.md) 与 [`dsh-nano-local-sandbox-v1.1.md`](../dsh-nano-local-sandbox-v1.1.md) 是本次事实基线；v0.9 的原生沙箱实测、Apple container 规格、能力对照表、L0/L1/S3 权限分层、脚本契约可直接继承（`v1.1 §6.4`），需修订的只是「不打包运行时 / 2 个包 / 未实跑」三类结论（`v1.1 §6.5`）。** | 前序 eval（`v0.9` 2433 行 / `v1.1` 1244 行） | Round 1 Q1、Q2 | 不重做已登记的事实调查；只在真相冲突处回填修订 |
| `T-O-6` | `foundational` | **[dsh] 原生 sandbox 是 same-world 的文件效果围栏，不覆盖网络 / 进程 / syscall / 设备 / 凭证；container / microVM / remote executor 必须「替换整个能力实现」，不得注册为 `ctx.sandbox` 的 `SandboxProvider`。** | 安装版 `dsh-sandbox/README.md:12,32,167` · `v0.9 §7.1 L1337-1360`、`§8A.4 L1767-1789`、`§2.8 L350-351` | Round 1 Q1 | `SandboxMode` 三档不扩成四档；`sandbox_permissions` 不广告（`v0.9 §8A.6 L1809-1813`） |
| `T-O-7` | `foundational` | **仓规六原则与词汇锚定是硬约束**：[`AGENTS.md:34`](../../../../AGENTS.md#L34) 插件中立、[`:35`](../../../../AGENTS.md#L35) 上层建筑归 host、[`:36`](../../../../AGENTS.md#L36) 不得侧载、[`:37`](../../../../AGENTS.md#L37) 单一真源、[`:38`](../../../../AGENTS.md#L38) 不得擅自扩约、[`:39`](../../../../AGENTS.md#L39) 不得过度仪式；插件清单在 [`:23-29`](../../../../AGENTS.md#L23-L29)。 | 仓根 `AGENTS.md` | 全部轮次 | 新 lane / error 枚举 / retry 义务 / 新凭证面须 [业主] durable 决定；禁止私有模块 import、硬编 base-url |
| `T-O-8` | `foundational` | **本阶段长期治理四原则（[业主] 本轮新给）**：`能硬切就不要双写`、`能彻底退役就不要提供兼容`、`平台保持中立`、`不得耦合私域`。**该原则优先于 `v1.1` 中的保守迁移建议**（`Q5 保留 façade` / `C6-4` / `C7-2 双轨`）。 | [业主] 指令（2026-11-14，本轮） | Round 1 Q1、Q2 | 不建双轨开关、不留兼容 façade、不留状态双写、不为单一消费者开私有后门 |
| `T-O-9` | `foundational` | **[DNLS] 以「仓内独立 overlay 插件」形态落地**：包名 `dsh-nano-local-sandbox`、插件 id `nano-local-sandbox`、缩写 `[DNLS]` 登记进 `AGENTS.md:23-29`（**单一名字**，取消 `v1.1 §0.4` 双名歧义）；装配复用 `package.json` + `cordis.patch.yml` + `inject`（`name` 必须是包名）；对外只经四个登记的 L2 标准契约面 —— `mcp-server`（`sandbox_*` 工具族）/ `http-routes`（`/nano-local-sandbox/*`）/ `cdp-driver` / `terminal-driver`；`ctx.sandboxPolicy.resolve({session})` **只读**注入，用于三档→挂载映射与 `policyFingerprint`，网络 / 进程 / 设备 / 资源策略由 profile 自己声明、**不广告 `sandbox_permissions`**；Apple / NVX 差异封在 L1 `backend` 内部接口，L2 契约不得出现 Apple 专有名词；**明确不实现 `SandboxProvider`、不替换 `ctx.shell` / `ctx.fs` / `ctx.subprocess`、不为任何消费者建私有通道或硬编私有路径**（`attach` 由 server 显式返回 `attach.url`）；特权入口唯一，`spawn('container')` 只在 `backend-apple`，构建步骤走 S3 `ctx.sandbox.confine` 或 per-call 批准提权；`inject` 不含消费者标识。 | `Round 1 / Q1`（[业主] 选 A，与推荐一致） | Round 2 Q3、Q4；后续全部 executional 题 | 《DNLS01 计划》的 `plugin-identity` / `backend` / `policy-adapter`；`AGENTS.md:23-29` 登记动作 |
| `T-O-10` | `foundational` | **所有权切割采用「硬切 + 彻底退役」**：三段时序 = ① [DNLS] 独立跑通（不动 [DNK]）→ ② 对等验收（e2e 在 [DNLS] 后端全绿）→ ③ 一次性硬切，**没有第四段兼容层**。硬切删除 [DNK] 全部容器资产（`lib/container-engine.js`、`lib/nano-kite.js`、`runtime/*`、`package.json:37-39` files、`index.js:17/429` 容器调用、容器相关路由常量与 handler、`AGENTS.md` 交付物表、`security/route-sensitivity.json:436-445/532` 的 `proc:kitesurf` 行）；**不保留 `/nano-kitesurf/*` façade、不设双轨开关、不留 `history` 双写**（`index.js:640-641,1008,1017,1019` 收敛为 [DNLS] `state-service` 一份 canonical）、不留 `kitesurf_*` 工具别名、不留 `KITESURF_CHECKOUT` / `config.checkout` 配置键；[DNT] 的 `dnt-agent` stub、`isolate` echo 占位、`attach.path` 双侧硬编按同一原则处置；台账与门禁一次性对齐（修 `scripts/route-scan.mjs:210-212` 8-vs-24、扫描器覆盖 [DNLS]/[DNT]）。**保留 `v1.1 L109`（I-5 合同先行）与 `:968`（C4/C5 在 C6 之前）作为时序护栏；`v1.1 :152/:502/:1077/:1087/:969` 的兼容策略被 `T-O-8` 显式作废，但 `v1.1` 的事实登记与 §6.4 可继承结论仍有效。** | `Round 1 / Q2`（[业主] 选 A，与推荐一致） | Round 2 Q3、Q4；后续全部 executional 题 | 《DNLS01 计划》的删除清单 / 状态与合同收敛 / 验收 G2–G4、G7 |
| `T-O-11` | `foundational` | **消费者接入面采用「双线分工、单一契约面」**：agent / 模型侧只经 [DNK] 内部 skill 调 [DNLS] 的 `sandbox_*` MCP 工具（skill 是**模型侧指令真源**，不承载运行时数据、不是传输层）；UI / 宿主侧经登记的 `http-routes` + `cdp-driver` 直连 [DNLS]（地址由 `instance.endpoints` 动态返回，**不经过模型回合**）；`terminal-driver` 服务 [DNT] client；四个 L2 面、两类主体、**零私有通道**。两面共用同一份 `ERROR_CATALOG` 与 `sandbox_*` 工具目录（error 枚举 / 幂等法则 / retry 义务只一份登记）；**skill 本身不是兼容层**，按 [业主] 指令 3 保留，但按 `T-O-10` 彻底退役 `kitesurf_*` 13 工具别名与 `/nano-kitesurf/*` 路径；[DNK] client 的 19 个路由常量与全部 `fetch` 一次性改指 `/nano-local-sandbox/*`；禁 `lib/` 互 import、硬编 base-url、`window.__nks*` 私有全局总线；`attach` 用 server 返回的 `attach.url`。 | `Round 2 / Q3`（[业主] 选 A，与推荐一致） | Round 3 Q5、Q6、Q7；后续 executional 轮次 | 《DNLS01 计划》的调用主体矩阵 / 技能真源 / 契约单一 / 验收 |
| `T-O-12` | `foundational` | **实例粒度与 [dsh] policy 粒度同构**：`instance.scope` 是 profile manifest 的**必填声明字段**（`shared` / `session`，无默认值），L1 `instance-registry` 原生支持两者且**不硬编**；首期 kitesurf profile 声明 `session`，完整兑现 `ctx.sandboxPolicy.resolve({session})` 的 `sessionId` / `workspaceRoot` / `additionalWritableRoots`，`policyFingerprint = hash(sessionId, mode, workspaceRoot, extraRoots)` 写入 instance 记录；策略切换按 `recreate` 或返回 `policy-stale`，**不广告 `sandbox_permissions`**（`v0.9 §8A.6 L1809-1813`）；KV / D1 `stateVolume` 与 CDP socket 均 per-instance，`history` 一份 canonical；`SandboxMode` 仍三档，网络 / 进程 / 设备 / 资源由 profile 独立声明、不并入 policy 词汇（`T-O-6`）；资源上限 / `maxInstances` / 空闲回收由 profile 声明，靠生命周期治理而非降级 `shared` 规避 4 GB / 实例代价；[DNLS] 路由台账 `sessionBinding` 显式为 `true`；[DNK] UI 按 `sessionId` 绑定 `instanceId`，硬切时删除「全局共享单页」假设。**该决策显式修正 `v1.1 :149`（Q2 首期 shared）与 `:977`（RK2 缓解项）的保守假设。** | `Round 2 / Q4`（[业主] 选 A，与推荐一致） | Round 3 Q5、Q6、Q7；后续 executional 轮次 | 《DNLS01 计划》的 `P-schema` / `instance-registry` / `policy-adapter` / `state-service` / `cdp-driver`；验收 |
| `T-O-13` | `execution` | **profile manifest 单一真源**：`profiles/kitesurf/profile.yaml` 为唯一权威，必填字段含 `id/version/platform[]/backend/scope(首期 session)/build{base,npmPrefix 精确版本,checkout{ref,verify},digest}/runtime{user,entrypoint,services,state,isolation}/policyMapping/capabilities/health`，**无默认值、缺一拒绝加载**；构建配方（`Dockerfile`/`entrypoint.sh`/`linux-prefix` 生成命令）归入 profile 目录并由 digest 校验；SHA256 / digest / `checkout.ref` 任一校验失败即**失败关闭**，不降级、不用 `latest`、不 `curl \| sh`（`v0.9 §8C.6 L2116-2127`）；禁用 `container machine`（`v0.9 §5.9.5 L993-1011`）；pin 官方稳定版（本机 `container CLI c05a560 (debug)` 不作发布基线）；**彻底退役 `KITESURF_CHECKOUT` / `config.checkout` / `nano-kitesurf.lock.json` / 全局 `~/.dsh-kitesurf-state`（改 per-instance `stateVolume`）**，零兼容键、零回退路径；`createArgs` 全部参数化、容器名不再硬编；`platform[]` 预留 NVX 后置取值而不改 L2 契约（`T-O-1`）。 | `Round 3 / Q5`（[业主] 选 A，与推荐一致） | Round 4 Q8、Q9、Q10 | 《DNLS01 计划》的 `P-schema` / `profile-registry` / `build-recipe`；验收 G3 |
| `T-O-14` | `execution` | **instance registry 执行语义**：`instanceId` 绑定 `sessionId`，`ensure(profileId, sessionId, policy)` 幂等；`policyFingerprint = hash(sessionId, mode, workspaceRoot, extraRoots)` 写入记录；`sandbox/mode` 切换导致不等时返回 `policy-stale`（附 `expectedFingerprint`）并由上层显式 `recreate`，**不广告 `sandbox_permissions`、不实现运行时原地改挂载、不实现 `SandboxProvider`、不扩 `SandboxMode` 三档**（关闭 `v0.9 §8B.6` 升级语义 A/B 遗留）；`phase` 机与 `adopt/degrade` 提升为 per-instance；`endpoints` 由 registry 动态返回；按需创建 + `idleTimeoutMs` 空闲回收 + `maxInstances/memory/cpus` 由 profile 声明（照 [DNT] `lib/sessions.js:123,203-211`）；`spawn('container')` **只在 `backend-apple`**，构建步骤经 S3 `ctx.sandbox.confine(argv, fixedPolicy)` 或 per-call 批准提权，不留静默 S2（`v0.9 §8.8 L1718` 一票否决）；`T-O-10` 三段时序不变。 | `Round 3 / Q6`（[业主] 选 A，与推荐一致） | Round 4 Q8、Q9、Q10 | 《DNLS01 计划》的 `instance-registry` / `policy-adapter` / `state-service`；验收 G5、G6 |
| `T-O-15` | `execution` | **四 L2 契约面与错误 / 台账「只有一份」**：`mcp-server` 用 `sandbox_*` 工具族取代 13 个 `kitesurf_*` 且**零别名**，`tools/list` 由 server 一处生成、`answerNativeTool` 改为读 L1 自身状态（消除宿主推快照倒挂）；`http-routes` 全部 `/nano-local-sandbox/*` 经 `registerRoutes` + `requestRejection`、`sessionBinding: true`、WS upgrade 等价准入；`cdp-driver` / `terminal-driver` 本轮只冻结「CDP socket 归 [DNLS] 持有 / `attach` 由 server 返回 `attach.url`」两条原则（帧细节留 Round 4+）；`ERROR_CATALOG` 一份真源四处派生并**补录 7 个未收录 errorId**（`shot.fit`/`shot.empty`/`history.body`/`network.query`/`dom.empty\|blank`/`elements.empty`），按 `AGENTS.md:38` 作为公共合同变更由 [业主] 登记；三份安全台账与 `scripts/route-scan.mjs` 一次性对齐（修 8-vs-24、扫描器覆盖 [DNLS]/[DNT]、删 `proc:kitesurf`）、两门禁恢复 `exit 0`、**不新增 release-gate**（`AGENTS.md:39`）；`kitesurf_*` / `/nano-kitesurf/*` / `proc:kitesurf` 全仓零残留。 | `Round 3 / Q7`（[业主] 选 A，与推荐一致） | Round 4 Q8、Q9、Q10 | 《DNLS01 计划》的 `mcp-server` / `http-routes` / `observability` / `contract-ledger`；验收 G2、G4、G7 |
| `T-O-16` | `execution` | **CDP driver 生命周期**：每个 session 实例一条上游 CDP socket，由 [DNLS] `cdp-driver` 长期持有 keeper（`Map<instanceId,{ws,page,lastUrl,phase}>` + 重连 / 恢复策略）；[DNK] UI 与 `agent-browser mcp` 仅为**下游客户端**，经 `instance.endpoints.cdp` 动态取址、不持有生命周期；明确「socket 关闭 = 该实例页面回 `about:blank`」，重连后按 `lastUrl` 恢复或返回明确 `page-lost` errorId（进 `sandbox_*` error 目录），不静默假装页面还在；`suspend`/stop 沿用「先停实例再丢 socket」有序关闭（`index.js:401-406`）；**不跨实例共享 socket、不在消费者内存保留全局 `live`/`verifiedBase` 单例**（`lib/engine.js:207,369`）；`useLive` 只重连 transport 类错误、`timeout` / 确定性错误不重跑的纪律不变；`verifiedBase` 按实例校验 `/health` 的 `kitesurf` 前缀。 | `Round 4 / Q8`（[业主] 选 A，与推荐一致） | 收口 | 《DNLS01 计划》的 `cdp-driver`；验收 G1 增量用例 |
| `T-O-17` | `execution` | **terminal driver 与工具面公共契约**：复用 `term.session.*` 8 工具形状并冻结 inputSchema（`additionalProperties:false`、required 显式、`lines≤500`、`cols/rows 2..512`）；`term.session.create` 只返回 `attach:{protocol:'dnt-ws-v1', url:<按 instance.endpoints 动态生成>}`，删除 `attach.path` 与客户端硬编兜底（`lib/mcp.js:96`、`src/client/lanes.js:140`）；`dnt-ws-v1` 修 `0x09`→`0x0A` pong（用 `encodeFrame`）、接线 `sendPing` 并补客户端发送方与 idle 超时；`sandbox_*` 与 `term.session.*` 共用**一份**幂等法则（按 `instanceId`/`sessionId` 幂等）、retry 义务（仅 transport 重连一次，`timeout`/确定性错误不重跑）、error 枚举（`ERROR_CATALOG`）；**[DNT] 不新增专有 `sandbox` lane** —— 通用 `McpLane` 换 URL 接入 [DNLS]，lane enum / `makeLane` / health 三 lane / `AGENTS.md:106` / UI / retry 五处均不改，`streamBase()` 桌面特例补到 `McpLane`；真 PTY 由 [DNLS] `profiles/terminal/` 实现，`crates/dnt-agent` stub 与 `IsolateLane` echo 占位彻底退役（`T-O-10`），[DNT] 保留 `local` lane；`term.audit` 归 [DNLS] 一份。 | `Round 4 / Q9`（[业主] 选 A，与推荐一致） | 收口 | 《DNLS01 计划》的 `terminal-driver` / `dnt-consumer`；验收 |
| `T-O-18` | `execution` | **第 4 轮为收口轮 + 验收 / 收口判据**：① e2e **以现有 20/20 为基线、增量后全绿为准**，增量**七类**用例（双会话不串味 / 切 mode 的 `policy-stale`+`recreate` / **无 agent 会话时 UI 可用** / socket 断开只影响对应实例且 `lastUrl` 恢复或 `page-lost` / 模型侧只用 skill+`sandbox_*` 排障 / 无第三通道且 `kitesurf_*`、`/nano-kitesurf/*` 零残留 / **资源治理可验收形态**：`maxInstances` 上限生效、`idleTimeoutMs` 空闲回收、冷启动预热策略显式化 —— 兑现 `§5.4` / `§6.5.3` 承诺）；② `recordOperation` / `runSelfTest` 11 项 / [DNT] `audit.jsonl` / `term.audit` 收归 [DNLS] `observability` 一份；③ **三门禁**（`check-route-sensitivity` / `check-feature-contract` / 本轮新发现的 `check-clean-lib.mjs`）恢复 `exit 0`、修 `route-scan.mjs:210-212` 8-vs-24 且扫描器覆盖 [DNLS]/[DNT]、[DNT] 端点入账、三份台账数字一致、`npm pack --dry-run` 含全部运行时产物、三份 `AGENTS.md` + `AGENTS.md:23-29` + `README.md:3` 同步、worktree 按 `AGENTS.md:40` 用后删除；**不新增 release-gate**（`AGENTS.md:39`）；`T-O-10` 无回退路径的缓解手段为**快照 commit + tarball 校验**（`§3.3`）；④ U9（backend 参数 / 挂载矩阵具体值 / 预热策略具体数值）判定为《DNLS01 计划》实施细节、U10（NVX / 未来 profile）按 `T-O-1` 显式 defer 进 `accepted-risks.json` 式台账，二者**不计 OPEN 残题**；⑤ 收口判据 = §1 全 18 条 `T-O` 冻结 + Q1–Q10 全有业主回答 + 无 OPEN 残题（或已 defer）+ `§6.5.4` Round 5 触发条件未成立。**门禁修复与三份台账对齐必须在 `T-O-10` 三段时序的「② 对等验收」之前完成**（无回退路径下门禁未绿不得进入硬切）—— 此条补齐 STEP.1 识别的时序欠登记。 | `Round 4 / Q10`（[业主] 选 A，与推荐一致） | 收口 | 《DNLS01 计划》§2 CITE；验收 G1–G8 |

> **★ 收口修订注记（STEP.1 → STEP.2；append-only，不改已冻结 `T-O` 行）**：
> - **R-1 门禁数修订**：`T-O-15` 冻结时（Round 3）登记「**两门禁**恢复 `exit 0`」，为当时事实；Round 4 `§7.0` 第 14 条新发现第三个门禁 [`scripts/check-clean-lib.mjs:1-15`](../../../../scripts/check-clean-lib.mjs#L1)（T-O-13 / P1-04）。**现行口径以 `T-O-18` 的「三门禁」为准**；Q2 / Q7 / §5.3 等历史段落里的「两门禁」是提问时点的事实陈述，按 append-only 保留，不构成现行冲突。
> - **R-2 errorId 命名空间登记**：`T-O-15` 的「零残留」明确限定为三样 —— `kitesurf_*` 工具名、`/nano-kitesurf/*` 路由路径、`proc:kitesurf` 能力标签；**errorId 命名空间不在其中**。Q7 补录的 7 个 id 全名为 `kitesurf.shot.fit` / `kitesurf.shot.empty` / `kitesurf.history.body` / `kitesurf.network.query` / `kitesurf.dom.empty` / `kitesurf.dom.blank` / `kitesurf.elements.empty`（`Q7 执行说明第 4 条`），收归 [DNLS] `ERROR_CATALOG` 后**保留 `kitesurf.*` 业务域前缀**，不随零残留迁移、不改名。此条补齐 STEP.1 识别的命名空间欠登记，消除「补录的 id 是否也要删」的竞态。
> - **R-3 待登记语气失效**：`T-O-15` / Q7 / Q9 中「按 `AGENTS.md:38` **须 [业主] 登记** / 由 [业主] 登记」为**冻结前的待办语气**。[业主] 已同意 Q7 / Q9 全部推荐，且本 QNA 冻结本身即 `AGENTS.md:38` 认可的 durable 登记形式（「QnA 中冻结的真相」）—— 故 error 枚举、幂等法则、retry 义务三项公共合同变更**已由 Q7 / Q9 冻结完成登记**；**除 R-2 / R-5 已登记清单外，收口后无待登记项**。结论性语句已改过去时；题面 / 历史问句按 append-only 保留。
> - **R-4 历史数字时点**：`§6.5.4` 的「§1 已有 12 条…共 15 条」与「拟收口轮」是 **Round 3 冻结时点**的评估陈述，按 append-only 保留；收口后的现行数字为 **18 条 `T-O` / 10 题 / 4 轮**，见 §8。
> - **R-5 新增 errorId、可验收清单与资源治理的完整登记（STEP.1 独立对抗复核追加 · 阻塞项 · STEP.2 补修）**：① 后冻真相引入两个新 errorId —— `policy-stale`（`T-O-14`，附 `expectedFingerprint`）、`page-lost`（`T-O-16`，CDP 重连无法恢复页面时返回）。二者**已由 Q6 / Q8 冻结 + [业主] 同意完成 `AGENTS.md:38` 的 durable 登记**；全名统一为 `sandbox.instance.policy-stale` / `sandbox.cdp.page-lost`（`sandbox.*` 命名空间，与 R-2 的 `kitesurf.*` 业务域前缀并存、互不迁移），状态码由 `ERROR_CATALOG → ERROR_STATUS` 既有前缀表派生（前者归状态冲突族 409、后者归引擎不可达族 502），**实施时只在单一真源表落一行，不由实现反推**；`sandbox_*` 工具族完整 20 项清单已在 `Q7 执行说明第 1 条` 冻结，为 `T-O-15` 的验收附件，不另立真源。② `§5.4` / `§6.5.3` 承诺的 `maxInstances` / `idleTimeoutMs` / 冷启动预热策略已在 `T-O-18` ① 增列为**第七类 e2e 增量用例**（可验收形态），其**具体数值**并入 U9 defer，兑现「不能只写原则」。③ `T-O-10` 无回退路径的缓解手段（快照 commit + tarball 校验，`§3.3`）已在 `T-O-18` ③ 登记。④ `nano-kitesurf.lock.json` 口径统一为**删除文件本身**；如需回执由 [DNLS] instance registry 记录，不复用旧 lock 文件（`AGENTS.md:37`）。⑤ §1 行内 Round 3 时点的「帧细节留 Round 4+」「两门禁」「由 [业主] 登记」等措辞，一律以本收口修订注记 R-1 / R-3 为准（append-only 不改原行）；`T-O-16` 承 `T-O-12` per-instance 语义、非另立决定；`T-O-10` 删除清单的 skill 豁免（机制保留 / 旧正文退役）见 `T-O-11`。

> **冲突裁决口径**：`T-O-8` 与 `v1.1 §1.5 Q5`、`:1077`、`:1087` 冲突时，以本表 `T-O-8` 为准（`qna` 单一真源地位）。但 `v1.1 L109`（I-5 合同先行）与 `:968`（C4/C5 在 C6 之前）属于**时序**而非兼容策略，仍成立 —— 见 Q2「对本问题的解读」第 2 条。

---

## 2. Round 1 —— foundational：平台身份与所有权切割（`Q1–Q2`）· 已冻结

> 本轮 second-opinion 模式：`waived`（不设槽位）。本轮两题均由 §1 baseline 真相驱动，题号 `Q1`/`Q2`，**已全数冻结**；Round 2 题目见 §4。

### 2.0 本轮提问前的代码检索清单（证据基础）

| # | 检索 / 阅读对象（`file:line`） | 结论（用于本轮） |
|---|---|---|
| 1 | [`AGENTS.md:23-29`](../../../../AGENTS.md#L23-L29)、[`:34-40`](../../../../AGENTS.md#L34-L40) | 现行活跃插件只有 `[DNEE]/[DNK]/[DNMS]/[DNN]/[DNT]` 5 个，`[DNLS]` 不在清单内；六条硬原则逐字点名「新 lane / 新凭证面 / 不得侧载 / 单一真源」。Q1 的身份登记与 Q2 的切割方式都受此约束。 |
| 2 | [`INTRODUCTION.md:14`](../../../../INTRODUCTION.md#L14)、[`:225`](../../../../INTRODUCTION.md#L225)、[`:282`](../../../../INTRODUCTION.md#L282)、[`:319`](../../../../INTRODUCTION.md#L319)、[`:338-345`](../../../../INTRODUCTION.md#L338) | 本仓插件形态 = 一个 npm 包 = 一个 bundle：`dsh.bundle.patch` 插宿主 Cordis entry 树，宿主半侧 `index.js` + 浏览器半侧 `lib/client.js`；定位是「overlay 插件，不改核心」；`Config` 来自 patch 层。这是 Q1 选项 A 的既有形态证据。 |
| 3 | [`dsh-nano-kitesurf/package.json:2-7,13-19,20-41,42-57`](../../../../dsh-nano-kitesurf/package.json#L2)、[`dsh-nano-kitesurf/cordis.patch.yml:3-5`](../../../../dsh-nano-kitesurf/cordis.patch.yml#L3)、[`dsh-nano-kitesurf/index.js:20-21`](../../../../dsh-nano-kitesurf/index.js#L20) | 现有独立插件的完整装配：`name`/`main`/`exports`/`files`/`engines.dsh`/`dsh.client.inject`；`cordis.patch.yml` 的 `name` 必须是包名而非绝对路径；`inject = ['webServer','connection','skills']`。Q1 选项 A 可直接复用。 |
| 4 | [`packages/dsh-host-route-guard/package.json:5`](../../../../packages/dsh-host-route-guard/package.json#L5) | description 明写 `Build-time shared library... Not a plugin; bundled into each plugin's lib/ artifacts via esbuild (devDependency, never resolved at runtime)`。证明「共享包 ≠ 宿主注入服务」，Q1 选项 B/C 不能拿共享包当先例。 |
| 5 | [`dsh-nano-terminal/index.js:21`](../../../../dsh-nano-terminal/index.js#L21)、[`:23`](../../../../dsh-nano-terminal/index.js#L23)、[`:25`](../../../../dsh-nano-terminal/index.js#L25)；[`dsh-nano-terminal/lib/sessions.js:154-163`](../../../../dsh-nano-terminal/lib/sessions.js#L154) | 消费者通过 `inject` 声明 host 服务、用 `ctx.subprocess.spawnTerminal` 消费，**不持有也不替换** host seam。Q1 的「消费者形态」实证。 |
| 6 | 安装版 `@deepseek-ai/dsh-sandbox/README.md:12,32,166-170`；[`v0.9 §7.1 L1337-1360`](../dsh-nano-local-sandbox-v0.9.md#L1337)、[`§8A.4 L1767-1789`](../dsh-nano-local-sandbox-v0.9.md#L1767)、[`§2.8 L350-351`](../dsh-nano-local-sandbox-v0.9.md#L350) | `Same-world confinement only`；`confine(argv) → ConfinedArgv` 预设命令在宿主 spawn；「单接口跨容器/VM 已被否决」「environment-coherent groups remains undecided」；「持续稳定声明接入的路径不是实现 `SandboxProvider`」。Q1 排除选项 B 的核心证据。 |
| 7 | [`security/route-sensitivity.json:436-445`](../../../../security/route-sensitivity.json#L436)、[`:532`](../../../../security/route-sensitivity.json#L532) | `/nano-kitesurf/kite` 与 `/recover` 是 `L2 / proc:kitesurf`，justification 明写 `start/resume spawn container run and bind-mount a host dir`。**这是 container 特权目前实物落在 [DNK] 插件路由上的铁证**，Q2 必须删除/迁移这些行。 |
| 8 | [`dsh-nano-kitesurf/lib/container-engine.js:18-19`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L18)、[`:38`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L38)、[`:85-88`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L85)、[`:178`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L178)、[`:329`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L329)；[`dsh-nano-kitesurf/index.js:17`](../../../../dsh-nano-kitesurf/index.js#L17)、[`:429`](../../../../dsh-nano-kitesurf/index.js#L429) | 容器名 / 镜像 tag 是模块级常量；`createArgs` 硬编 8787/8791；`spawnFn('container', ...)` 在 `:88`，`execFile('container', ['inspect','kitesurf'])` 在 `:429` —— **特权有两处调用点且都在 [DNK]**。Q2 硬切清单的依据。 |
| 9 | [`dsh-nano-kitesurf/index.js:640-641`](../../../../dsh-nano-kitesurf/index.js#L640)、[`:1008`](../../../../dsh-nano-kitesurf/index.js#L1008)、[`:1017`](../../../../dsh-nano-kitesurf/index.js#L1017)、[`:1019`](../../../../dsh-nano-kitesurf/index.js#L1019)；[`dsh-nano-kitesurf/lib/engine.js:1256,1266`](../../../../dsh-nano-kitesurf/lib/engine.js#L1256)；[`dsh-nano-kitesurf/lib/history.js:4-8`](../../../../dsh-nano-kitesurf/lib/history.js#L4)；[`dsh-nano-kitesurf/runtime/mcp-bridge.mjs:209`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L209) | `history` 同时写 `history.jsonl` 与引擎 KV（`source: workerd-kv` / `plugin-store` 双读源），而 `history.js:4-8` 与 `mcp-bridge.mjs:209` 却断言「workerd 无 D1/KV binding」—— **双写已产生可观测的真相分裂**。Q2「不双写」的直接反例。 |
| 10 | [`dsh-nano-kitesurf/lib/skill.js:212`](../../../../dsh-nano-kitesurf/lib/skill.js#L212)、[`dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md:224`](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L224)；[`runtime/mcp-bridge.mjs:163-254`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L163) | 技能正文写「还有 6 个 `kitesurf_*`」却列 8 个名字，`KITESURF_TOOLS` 实际 13 个 —— 生成物与真源分裂的现实代价。Q2 不留旧技能正文的依据。 |
| 11 | [`dsh-nano-terminal/lib/mcp.js:96`](../../../../dsh-nano-terminal/lib/mcp.js#L96)、[`dsh-nano-terminal/src/client/lanes.js:140`](../../../../dsh-nano-terminal/src/client/lanes.js#L140)；[`dsh-nano-terminal/crates/dnt-agent/src/main.rs:1-7`](../../../../dsh-nano-terminal/crates/dnt-agent/src/main.rs#L1)、[`dsh-nano-terminal/src/client/lanes.js:200-251`](../../../../dsh-nano-terminal/src/client/lanes.js#L200) | `attach.path` 在 server 与 client 双侧硬编 `/dsh-nano-terminal/stream`（私有命名空间烤进跨插件合同）；`dnt-agent` 只有 7 行 stub；`isolate` 是 echo REPL 占位。Q1「不得耦合私域」与 Q2 [DNT] 同原则处置的证据。 |
| 12 | [`scripts/route-scan.mjs:210-212`](../../../../scripts/route-scan.mjs#L210)、[`:222-229`](../../../../scripts/route-scan.mjs#L222) | `expected 8 kitesurf route specs, parsed 24` 硬编码导致 `check-route-sensitivity.mjs` / `check-feature-contract.mjs` 当前均 `exit 1`；扫描器只覆盖 4 个插件、[DNT] 在三份安全台账中 0 条。Q2「兼容/漂移会持续制造台账债务」的证据。 |
| 13 | [`dsh-nano-local-sandbox-v1.1.md:109`](../dsh-nano-local-sandbox-v1.1.md#L109)、[`:151-152`](../dsh-nano-local-sandbox-v1.1.md#L151)、[`:502`](../dsh-nano-local-sandbox-v1.1.md#L502)、[`:968-969`](../dsh-nano-local-sandbox-v1.1.md#L968)、[`:1077`](../dsh-nano-local-sandbox-v1.1.md#L1077)、[`:1087`](../dsh-nano-local-sandbox-v1.1.md#L1087)、[`:1102-1124`](../dsh-nano-local-sandbox-v1.1.md#L1102) | `I-5` 合同先行与 `C4/C5 在 C6 之前` 属**时序**（仍成立）；`Q5 保留 façade` / `C6-4` / `C7-2 双轨` / To-Be 图里的 `DNKH2 façade` 节点属**兼容策略**（被 `T-O-8` 取代）。§8.9 列出 15 个待冻结合约单位。Q2 必须显式区分这两类。 |

---

### Q1 — [DNLS] 的注册形态与权威边界：独立插件 + 标准契约，还是宿主能力替换？
（**驱动真相：`T-O-2` + `T-O-4` + `T-O-6` + `T-O-7` + `T-O-8`** · 来源：`v1.1 §1.2 / §1.5 Q1,Q4 / §6.3 差异 b,g / §8.9`；`v0.9 §7.1 / §8A.4`；`AGENTS.md:34-38`）

- **影响范围**：[DNLS] 的包身份、`cordis.patch.yml` 行、`inject` 清单、`Config` 形状；跨插件通道形式（MCP / HTTP / CDP / WS 还是 host seam）；`ctx.sandboxPolicy` 的接入方式；backend 抽象的封装边界；[`AGENTS.md:23-29`](../../../../AGENTS.md#L23-L29) 的插件清单；后续**全部** executional 题的选项空间。
- **为什么必须确认**：这是整个 DNLS01 的分水岭。[业主] 指令 2 说「通过 [dsh] 原生 policy 进行适配与部署」，但「适配」有两种互斥读法：① 注入 `ctx.sandboxPolicy` 做**只读 resolve + 挂载映射**；② 把 [DNLS] 注册成 `ctx.sandbox` 的 `SandboxProvider` 或替换 `ctx.shell/fs/subprocess`。安装版 `dsh-sandbox` 与 `v0.9` 已明确排除 ②，且 ② 会把 `SandboxMode` 三档扩成四档、触及 [`AGENTS.md:38`](../../../../AGENTS.md#L38)「不得擅自扩约」。同时 [DNLS] 若以「宿主注入服务」形态存在，平台就与某个 [dsh] 版本内部 seam 绑死，违反 `T-O-8` 的「平台保持中立」。**这个前提不先冻结，后面每个执行题（profile schema、instance、MCP 工具面、policy adapter）都会重复争论同一件事。**
- **当前建议 / 倾向**（`DNLS01 架构 agent`）：**选 A** —— [DNLS] 是一个仓内独立 overlay 插件，通过登记过的标准契约向所有消费者提供服务；`ctx.sandboxPolicy` 只读注入；Apple / NVX 差异封在 L1 内部 backend 抽象里；**不实现 `SandboxProvider`、不替换 `ctx.shell/fs/subprocess`、不建任何消费者私有通道**。
- **Reasoning**：① 形态上，本仓既有装配就是 `package.json + cordis.patch.yml + inject`（`INTRODUCTION.md:14`），共享包明确「Not a plugin」（`packages/dsh-host-route-guard/package.json:5`），所以「独立插件」不是新发明而是复用既有合同；② 契约上，`T-O-6` 已排除 `SandboxProvider`，`v0.9 §8A.4 L1789` 给出「语义污染」的明确理由；③ 治理上，`T-O-7` 的插件中立 / 上层建筑归 host / 不得侧载，与 `T-O-8` 的平台中立 / 不得耦合私域，共同要求 [DNLS] 不侵入 host seam、不为 [DNK] 或 [DNT] 开后门；④ 扩展性上，只有把平台差异封在 backend 内部，NVX 后置接入才不需要改 L2 合同（`v1.1 §5.2 A-1/A-2`）。选 A 不是保守，是唯一同时满足四条治理原则的形态。
- **问题（请 [业主] 裁决）**：**你是否确认：[DNLS] 以「仓内独立 overlay 插件」形态落地（包名 `dsh-nano-local-sandbox`、插件 id `nano-local-sandbox`、缩写 `[DNLS]` 登记进 `AGENTS.md:23-29`），只经登记的 MCP / HTTP / CDP / WS 标准契约对外服务，`ctx.sandboxPolicy` 只读注入用于 policy 映射，平台差异封在 backend 抽象内部 —— 明确不注册 `SandboxProvider`、不替换 `ctx.shell` / `ctx.fs` / `ctx.subprocess`、不为任何单一消费者建立私有通道？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 已冻结为 T-O-9`（[业主] 2026-11-14：同意第 1 轮全部推荐）

**【对本问题的解读】**

1. 本问裁决的不是「叫什么名字」，而是 **「[DNLS] 在 [dsh] 组合里是哪一类东西」**。名字只是同一决定下的登记动作；真正要冻结的是**权威边界**：谁持有 container 特权、谁定义跨插件合同、谁读 [dsh] policy、谁对版本与镜像负责。
2. 「平台保持中立」在本问里有两个可验收含义：① [DNLS] 不与 `dsh-mini` / self-host [nano-agent] / 单一 [dsh] 内部 seam 耦合（[`AGENTS.md:34`](../../../../AGENTS.md#L34)）；② L2 契约里不出现 Apple 专有名词（`container` / `vmnet` / `virtiofs` / `kitesurf`），NVX 接入只填 backend 能力矩阵的一列，不改合同（`v1.1 §5.2 A-1`）。
3. 「不得耦合私域」在本问里也有两个可验收含义：① 不建 [DNK]↔[DNLS] / [DNT]↔[DNLS] 的私有模块 import 或专有地址常量（[`AGENTS.md:36`](../../../../AGENTS.md#L36)）；② 不把某一消费者的私有命名空间烤进平台合同 —— `lib/mcp.js:96` 与 `src/client/lanes.js:140` 双侧硬编 `/dsh-nano-terminal/stream` 就是现成反例。
4. 「通过 [dsh] 原生 policy 适配与部署」在选 A 下被解释为：`ctx.sandboxPolicy.resolve({session})` → `SandboxExecutionPolicy{mode, workspaceRoot, additionalWritableRoots, sessionId}` → profile 挂载矩阵 + `policyFingerprint`（`v1.1 §5.3/§5.4`）。**网络 / 进程 / 设备 / 资源策略由 profile 自己声明，不得假称由 `SandboxMode` 覆盖**（`dsh-sandbox/README.md:166`）。审批、`sandbox/mode` 事件、权限预设仍归 [dsh]（[`AGENTS.md:35`](../../../../AGENTS.md#L35)）。
5. 「上层建筑归 host」与 [业主] 指令 2「权限收归 [DNLS]」并不矛盾：收归的是 **container CLI 的调用权与镜像/卷/版本的所有权**，不是 [dsh] 的审批与会话策略。Q1 冻结后，这一分工写进 `plugin-identity` 合约单位。

**【可选选项清单】**

| 选项 | 内容 | 优点 | 缺点 / 反例 | 结论 |
|---|---|---|---|---|
| **A** | **独立 overlay 插件 + 标准契约**：`package.json` / `cordis.patch.yml` / `inject`；对外只走 `mcp-server` / `http-routes` / `cdp-driver` / `terminal-driver` 四个登记面；`ctx.sandboxPolicy` 只读注入；backend 抽象隔离平台差异；不实现 `SandboxProvider`、不替换 host seam | 复用本仓既有装配与安装链（`INTRODUCTION.md:14,319`）；平台中立、可换 backend 不改合同；消费者零私有耦合；与 `T-O-6` 一致 | 需要新写 4 个 L2 合同并在 [业主] 处冻结；插件清单要新增一行 | **推荐** |
| **B** | **宿主能力替换 / capability group**：替换 `ctx.shell` / `ctx.fs` / `ctx.subprocess`，或注册 `ctx.sandbox` 的 `SandboxProvider`，让 [DNLS] 成为 [dsh] 的执行世界 | 看似「更原生」，模型侧无需新 MCP 工具 | ① `dsh-sandbox/README.md:12,32,167` 明写 `Same-world confinement only`、container「replace whole capabilities instead of registering here」；② `v0.9 §7.1 L1358` / `§8A.4 L1789` 明写 `confine(argv)` 预设命令在宿主 spawn，VM 模型会造成语义污染；③ `v0.9 §2.8 L350-351` 登记「单接口跨容器/VM 已被否决」「environment-coherent groups remains undecided」；④ 把 `SandboxMode` 三档扩成四档 / 动 `sandbox_permissions` = 违反 [`AGENTS.md:38`](../../../../AGENTS.md#L38) | 不推荐 |
| **C** | **混合形态**：插件控制面 + 部分 host seam 替换（例如 terminal 走 `ctx.subprocess`、容器走插件） | 短期可少写一个 driver | 形成两套执行世界、两份状态权威，违反 [`AGENTS.md:37`](../../../../AGENTS.md#L37) 单一真源；「平台中立」被打破（[DNLS] 与特定 host seam 版本绑死）；`v0.9 §8A.4 L1779-1787` 明确把 sibling provider 标为「未来，非 v1」 | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **冻结包身份（单一真源）**：`name: dsh-nano-local-sandbox`、`version` 读 `package.json`、`engines.dsh: ">=0.2.2-rc.1 <0.3.0"`（对齐现有 5 个插件，`dsh-nano-kitesurf/package.json:42-43`）；插件 id `nano-local-sandbox`；缩写 `[DNLS]` 追加到 [`AGENTS.md:23-29`](../../../../AGENTS.md#L23-L29)。**明确取消 `v1.1 §0.4` 里「`dsh-nano-sandbox` 是否另一个包」的歧义，只保留一个名字。**
2. **复用既有装配**：`cordis.patch.yml` 用 `- insert: - id: nano-local-sandbox / name: dsh-nano-local-sandbox`（照 `dsh-nano-kitesurf/cordis.patch.yml:3-5`，`name` 必须是包名）；`exports` 声明 `.` / `./client` / `./package.json`；`files` 只列运行时产物；`npm pack --dry-run` 进验收（`INTRODUCTION.md:14`）。
3. **`inject` 只声明平台自身所需 host 服务**，候选：`webServer`、`connection`、`skills`、`subprocess`、`sandboxPolicy`、`sessions`、`workingDirectory`。**不得出现任何消费者标识**；`requestRejection` 由 `registerRoutes` 统一施加（`packages/dsh-host-route-guard/src/route-guard.js:223-234`），WS upgrade 也必须有等价准入（对比 [DNT] `index.js:23` 缺 `connection` 的缺口）。
4. **四个 L2 面登记为唯一对外通道**：`mcp-server`（`sandbox_*` 工具族）、`http-routes`（`/nano-local-sandbox/*`）、`cdp-driver`（endpoint + targets + evaluate）、`terminal-driver`（`term.session.*` + `dnt-ws-v1`）。**禁止**跨插件 `lib/` 互 import、禁止硬编消费者私有路径；`attach` 由 server 显式返回 `attach.url`，取代 `lib/mcp.js:96` / `src/client/lanes.js:140` 的双侧硬编。
5. **policy 接入只读**：`ctx.sandboxPolicy.resolve({session})` 是唯一输入；三档 → 挂载矩阵（`v1.1 §8B.7` / `v0.9 §8B.7 L1919-1927`）；`policyFingerprint` 处理「会话可切 mode vs 容器创建时固定」（`v0.9 §8A.6 L1809-1813` 的 R3）；**不广告 `sandbox_permissions`**、不写 `sandbox/mode` 事件、不实现 `confine()`。
6. **backend 抽象隔离平台差异**：`backend` 为 L1 内部接口（非跨插件契约），11 项能力见 `v1.1 §5.2`；Apple 专有名词只出现在 `backend-apple` 模块内；`backend-nvx` 首期只留接口 + 空实现，用「假 NVX backend」跑接口测试证明 L2 合同不需要改（G8）。
7. **特权入口唯一**：全仓 `spawn('container')` / `execFile('container')` 只允许出现在 `backend-apple` 一个模块（现状有 `lib/container-engine.js:88` 与 `index.js:429` 两处，且都在 [DNK]）；构建步骤经 `ctx.sandbox.confine(argv, fixedPolicy)`（S3 底座，`v0.9 §8C.5.2 L2063-2065`）或 per-call 批准提权，不留静默 S2（`v0.9 §8.8 L1718` 一票否决）。
8. **验收口径**：① `AGENTS.md:23-29` 含 `[DNLS]` 且全仓只有一个包名；② 全仓 grep 无 `SandboxProvider` 实现、无 `ctx.shell/fs/subprocess` 替换；③ [DNLS] 的 `inject` 与四个 L2 面均不含消费者标识；④ 假 NVX backend 跑通接口测试且 L2 合同零改动。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的形态证据**：[`INTRODUCTION.md:14`](../../../../INTRODUCTION.md#L14)「一个 npm 包做成组合包，`cordis.patch.yml` 插宿主 entry 树，宿主半侧 `index.js` + 浏览器半侧 `lib/client.js`」；[`:225`](../../../../INTRODUCTION.md#L225)「overlay 插件：不改核心，靠 patch 插入自己的宿主行」；[`dsh-nano-kitesurf/package.json:45-57`](../../../../dsh-nano-kitesurf/package.json#L45) 与 [`cordis.patch.yml:3-5`](../../../../dsh-nano-kitesurf/cordis.patch.yml#L3) 是现成可复制的装配；[`dsh-nano-terminal/index.js:21,23`](../../../../dsh-nano-terminal/index.js#L21) 证明消费者通过 `inject` 声明 host 服务而不替换它。
- **支持 A 的「共享包不是 host 服务」证据**：[`packages/dsh-host-route-guard/package.json:5`](../../../../packages/dsh-host-route-guard/package.json#L5) — `Not a plugin; bundled into each plugin's lib/ artifacts via esbuild (devDependency, never resolved at runtime)`。选项 B/C 不能把构建期共享包当作「宿主注入服务」的先例。
- **支持 A 的 policy 证据（排除 B）**：安装版 `@deepseek-ai/dsh-sandbox/README.md:12`（`This is same-world confinement... use a container, microVM, or remote executor when the whole environment must be isolated`）、`:32`（`replaces the whole ctx.shell/ctx.fs capability rather than adding a backend here`）、`:166-170`（文件效果是全部词汇 / same-world only / 每 context 一个 provider）；[`v0.9 §7.1 L1341-1343,1358-1360`](../dsh-nano-local-sandbox-v0.9.md#L1337)、[`§8A.4 L1777-1789`](../dsh-nano-local-sandbox-v0.9.md#L1767)、[`§2.8 L350-351`](../dsh-nano-local-sandbox-v0.9.md#L350)。
- **支持 A 的治理证据**：[`AGENTS.md:34`](../../../../AGENTS.md#L34) 插件中立、[`:35`](../../../../AGENTS.md#L35) 上层建筑归 host、[`:36`](../../../../AGENTS.md#L36) 不得侧载、[`:38`](../../../../AGENTS.md#L38) 不得擅自扩约。
- **反例 B（注册 SandboxProvider / 替换 seam）**：`v0.9 §8A.6 L1811` 明写「R3 不是精度问题，是契约形状问题」；`v0.9 §8A.4 L1789` 明写「强行实现会造成语义污染」；把 `SandboxMode` 扩成四档或改 `sandbox_permissions` 属于 [`AGENTS.md:38`](../../../../AGENTS.md#L38) 逐字点名的公共合同变更，须 [业主] 决定 —— 本问若选 B，等于由实现反推合同。
- **反例 C（混合）**：`v0.9 §8A.4 L1781-1787` 把 `NvxBashExecutor` / `NvxSubprocessRuntime` / `NvxFileSystem` 全部标注「未来，非 v1」，并写 `ctx.sandbox → 不挂载（或只挂 facts-only provider）`；混合会产生两套执行世界与两份状态权威，违反 [`AGENTS.md:37`](../../../../AGENTS.md#L37)。
- **反例「私有通道」**：[`dsh-nano-terminal/lib/mcp.js:96`](../../../../dsh-nano-terminal/lib/mcp.js#L96) 与 [`src/client/lanes.js:140`](../../../../dsh-nano-terminal/src/client/lanes.js#L140) 把 `/dsh-nano-terminal/stream` 双侧硬编进跨插件合同 —— 这是「不得耦合私域」在现有代码里已经发生一次的代价，选 A 时必须一并校正（见 Q2 执行说明第 5 条）。

---

### Q2 — 所有权切割方式：硬切 + 彻底退役，还是双轨 + 兼容？
（**驱动真相：`T-O-2` + `T-O-3` + `T-O-5` + `T-O-7` + `T-O-8`** · 来源：`v1.1 §1.3 R6 / §1.5 Q5 / §6.3 差异 a / §7.3 / §8.10 / §9.2 D2`；[业主] 指令 3；`AGENTS.md:37-39`）

- **影响范围**：[DNK] 的 `runtime/`、容器 CLI、相位机、24 条宿主路由、技能正文、`package.json files`、`AGENTS.md` 交付物表、`security/*` 台账；`history` 的 canonical 归属；[DNT] 的 `local` / `mcp` / `isolate` 三车道与 `dnt-agent` stub；`scripts/route-scan.mjs` 门禁；**后续全部 executional 题的形状**（是否要设计兼容层、双写同步、迁移期台账）。
- **为什么必须确认**：`v1.1`（前序评估）在 `Q5`、`C6-4`、`C7-2`、To-Be 图 `DNKH2` 节点里给的是**保守迁移建议**：保留 `/nano-kitesurf/*` façade、做双轨开关、G1 前不删旧码。但 [业主] 本轮明确给出 `能硬切就不要双写`、`能彻底退役就不要提供兼容`、`平台保持中立`、`不得耦合私域` 四条长期治理原则（`T-O-8`），**直接推翻该保守建议**。若不先冻结这条真相，后续每个执行题都会分裂成「新契约 + 旧兼容」两套设计，最终把 `v1.1 §8.9` 的 15 个合约单位变成 30 个，并把 `history` 双写、`lib/skill.js:212` 漂移、`route-scan` 8-vs-24 这类**已经可观测的债务**原样搬进 [DNLS]。
- **当前建议 / 倾向**（`DNLS01 架构 agent`）：**选 A** —— [DNLS] 独立跑通并提供标准契约后，**一次性硬切**：删除 [DNK] 全部容器资产与容器路由，不保留兼容 façade、不做双轨开关、不留状态双写、不留旧技能正文；[DNK] client 直接改调 [DNLS] 契约；[DNT] 的 stub / 占位车道按同一原则彻底退役或明确降级命名。**这是对 `v1.1` 保守建议的显式修正，须写入台账。**
- **Reasoning**：① 治理优先：四条原则中前两条直接指向 A；② 现状反证：双写已经造成真相分裂（`index.js:640-641,1008,1017,1019` 双写 + `lib/history.js:4-8` / `mcp-bridge.mjs:209` 断言相反），兼容/漂移已经造成门禁 `exit 1`（`scripts/route-scan.mjs:210-212`），保留兼容层等于把债务制度化；③ 单一真源：[`AGENTS.md:37`](../../../../AGENTS.md#L37) 只允许一份 durable 权威 + consumption receipt；④ 不擅自扩约：留两套 HTTP 契约 / 两套 MCP 工具名 = 公共合同双份登记，违反 [`:38`](../../../../AGENTS.md#L38)「同一决定只许一份登记真源」；⑤ 不过度仪式：双轨开关与迁移期台账会增加未授权的门禁复杂度（[`:39`](../../../../AGENTS.md#L39)）。**但硬切不等于立刻拆** —— 时序护栏见「对本问题的解读」第 2 条。
- **问题（请 [业主] 裁决）**：**你是否确认：DNLS01 采用「硬切 + 彻底退役」的所有权切割 —— [DNLS] 独立跑通并经对等验收后，一次性删除 [DNK] 全部容器资产与容器路由、不保留 `/nano-kitesurf/*` 兼容 façade、不设双轨开关、不留 `history` 双写、不留旧技能正文与旧配置键；[DNT] 的 stub 车道与私有 `attach.path` 按同一原则处置 —— 同时保留 `v1.1 I-5` 的时序护栏（DNLS 先构建完毕并提供标准 MCP 与接口，才做删除）？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 已冻结为 T-O-10`（[业主] 2026-11-14：同意第 1 轮全部推荐）

**【对本问题的解读】**

1. **「硬切」是切割方式，不是时序。** `v1.1 L109`（I-5）与 `:968`（C4/C5 在 C6 之前）、以及 [业主] 指令 3 原文「DNLS 构建完毕，并提供标准的 mcp 与接口后，废弃其自身内部打包、唤醒、启动、重启 container 的能力」仍然**完全成立**。禁止的是「先拆后补」，不是「先验收后切」。选 A 的时序是三段：**① [DNLS] 独立跑通（不动 [DNK]）→ ② 对等验收（e2e 在 [DNLS] 后端全绿）→ ③ 一次性硬切（删除 + 改调用目标 + 重写技能 + 清台账）**；**没有第四段「兼容层」**。
2. **「不双写」指状态真源，不是指同时运行两个进程。** `history.jsonl` 与 workerd KV 目前各写一遍（[`index.js:640-641`](../../../../dsh-nano-kitesurf/index.js#L640)、[`:1008`](../../../../dsh-nano-kitesurf/index.js#L1008)），读源还要按 `source: workerd-kv` / `plugin-store` 二选一（[`:1017`](../../../../dsh-nano-kitesurf/index.js#L1017)、[`:1019`](../../../../dsh-nano-kitesurf/index.js#L1019)）。选 A 后只保留 [DNLS] `state-service` 一份 canonical；另一份最多作为 consumption receipt（identity + hash + consumed_at，不作恢复读源），符合 [`AGENTS.md:37`](../../../../AGENTS.md#L37)。
3. **「不兼容」指合同面，不是指用户体验回退。** 不保留 `/nano-kitesurf/*` 路径别名、不保留 `kitesurf_*` MCP 工具别名、不保留 `KITESURF_CHECKOUT` / `config.checkout` 配置键、不保留 `nano-kitesurf.lock.json` 作为恢复读源。这些名字要从 `lib/route-table.js`、三份 `security/*` 台账、`skills/*/SKILL.md` 一并删除，避免「台账声明了已不存在的特权」（[`security/route-sensitivity.json:436-445`](../../../../security/route-sensitivity.json#L436) 的 `proc:kitesurf` 行就是典型）。
4. **「平台保持中立 / 不得耦合私域」在切割上的含义**：[DNLS] 不因 [DNK] 而保留 `/nano-kitesurf/*`、不因 [DNT] 而烤入 `/dsh-nano-terminal/stream`（[`lib/mcp.js:96`](../../../../dsh-nano-terminal/lib/mcp.js#L96)、[`src/client/lanes.js:140`](../../../../dsh-nano-terminal/src/client/lanes.js#L140)）；所有 endpoint 由 [DNLS] 自己命名、由 `instance.endpoints` 动态返回。
5. **选 A 会显式修正 `v1.1` 的若干结论**（不是推翻评估，是替换其中被 `T-O-8` 覆盖的兼容策略）：`:152`（Q5 假设保留 façade）、`:502`（To-Be 图 `DNKH2 façade` 节点）、`:1077`（C6-4 façade 兼容）、`:1087`（C7-2 双轨开关）、`:969`（C6 内部双轨）。**`v1.1` 的事实登记、能力对照、责任边界分析仍然有效**（`T-O-5`）。

**【可选选项清单】**

| 选项 | 内容 | 优点 | 缺点 / 反例 | 结论 |
|---|---|---|---|---|
| **A** | **硬切 + 彻底退役**：DNLS 独立跑通 + 对等验收后，一次性删除 [DNK] 容器资产 / 容器路由 / 旧技能 / 旧配置键；无 façade、无双轨、无状态双写、无工具别名；[DNT] 同原则处置 | 单一真源、合同一份、台账干净；符合四条长期治理原则；债务不搬进新平台 | 删除面大，须严格守住「先验收后切」时序；已装 profile 需随新版重装 | **推荐** |
| **B** | **双轨 + 兼容 façade**（`v1.1` 保守建议）：保留 `/nano-kitesurf/*` 转发层、双轨开关，迁移期零破坏 | 过渡期风险最低、e2e 不改 URL | ① 直接违反 `T-O-8`；② 需在 `lib/route-table.js` 与三份 `security/*` 同时维护新+旧两套路由；③ `proc:kitesurf` 继续挂在已无能力的 [DNK] 上，形成「台账声明不存在的特权」；④ `scripts/route-scan.mjs:210-212` 的 8-vs-24 漂移会被制度化 | 不推荐（**被 `T-O-8` 覆盖**） |
| **C** | **渐进退役**：保留一个版本的兼容层，下个版本再删 | 看似兼顾两边 | 一个版本内仍要双写状态与双套合同，只是把删除延后；「能彻底退役就不要提供兼容」不打折执行；且会新增一个未经 [业主] 授权的发布门禁（[`AGENTS.md:39`](../../../../AGENTS.md#L39)） | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **三段时序（守 `I-5`，但不是双轨）**：① [DNLS] 独立 ensure/start/health 一个 kitesurf profile，**不改 [DNK] 一行**；② 以 [DNK] 现有 `scripts/e2e-ego.mjs`（最新 20/20）做对等验收，全部断言在 [DNLS] 后端上通过；③ 一次性硬切。**禁止在 ① 与 ② 之间加入「两套路由同时在线」的第四态。**
2. **[DNK] 删除清单（`file:line` 级）**：`lib/container-engine.js`（[`container-engine.js:18-19` 常量](../../../../dsh-nano-kitesurf/lib/container-engine.js#L18)、`:38 createArgs`、`:85-88 runContainer`、`:178 ensure`、`:329 statePath`）、`lib/nano-kite.js`、`runtime/Dockerfile` / `entrypoint.sh` / `mcp-bridge.mjs` / `linux-prefix/`、`package.json:37-39` 的 `files` 项、[`index.js:17`](../../../../dsh-nano-kitesurf/index.js#L17) 的容器 import、[`index.js:429`](../../../../dsh-nano-kitesurf/index.js#L429) 的 `execFile('container','inspect')`、容器相关路由常量与 handler（`/kite` / `/ports` / `/recover` / `/selftest` 中的容器检查）、`AGENTS.md` 交付物表、[`security/route-sensitivity.json:436-445`](../../../../security/route-sensitivity.json#L436) 与 `:532` 的 `proc:kitesurf` 行。
3. **[DNK] 保留清单（领域资产，不属 sandbox）**：`src/client/index.js`（右工作区 UI / Design Mode）、`src/shared/note.js`（note 预算）、`src/shared/shot-point.js`（坐标换算）、`src/client/i18n.js`、`lib/dom.js:140-151`（srcdoc 构建）、`index.js:883-911`（context ref 环）、`lastPick`。这些按 `v1.1 §8.10` 保留。
4. **状态与合同收敛**：`history` 只留 [DNLS] `state-service` 一份 canonical，删除 `history.jsonl` 与 `index.js:640-641,1008,1017,1019` 的双写/双读分支；`nano-kitesurf.lock.json` 降为 consumption receipt 或删除；`~/.dsh-kitesurf-state` 归 [DNLS]；`kitesurf_*` 13 工具 → `sandbox_*` 工具族，**不留别名**；[`lib/skill.js:212`](../../../../dsh-nano-kitesurf/lib/skill.js#L212) 的「6 个 / 8 个 / 13 个」漂移随真源重建一并修正。
5. **[DNT] 同原则处置**：`dnt-agent`（[`crates/dnt-agent/src/main.rs:1-7`](../../../../dsh-nano-terminal/crates/dnt-agent/src/main.rs#L1) 7 行 stub）由 [DNLS] `profiles/terminal/` 实现真 PTY，不在 [DNT] 保留占位；`isolate` echo REPL（[`src/client/lanes.js:200-251`](../../../../dsh-nano-terminal/src/client/lanes.js#L200)）不保留「假装隔离」的命名，或彻底退役或明确降级为 demo；`attach.path` 双侧硬编改为 server 显式返回 `attach.url`；`local` lane 作为宿主本地终端保留（`lib/sessions.js:146-178`）。
6. **台账与门禁一次性对齐**：删除 [DNK] 容器路由在三份 `security/*` 的行；修 [`scripts/route-scan.mjs:210-212`](../../../../scripts/route-scan.mjs#L210) 的 8-vs-24 硬编码；把 [DNLS] 与 [DNT] 加入 [`scripts/route-scan.mjs:222-229`](../../../../scripts/route-scan.mjs#L222) 扫描范围；`check-route-sensitivity.mjs` / `check-feature-contract.mjs` 恢复 `exit 0`。**不留「旧路由兼容行」。**
7. **验收口径**：① 全仓 `spawn('container')` / `execFile('container')` / `kitesurf-engine` / `linux-prefix` 只出现在 [DNLS]（`v1.1` G2）；② `history` 无第二份可写副本（G3）；③ `lib/route-table.js` 与三份台账中无 `/nano-kitesurf/*` 别名、无 `proc:kitesurf` 残留（G4）；④ [DNK] 52/52 + [DNT] 6/6 + e2e 20/20 + 两门禁 `exit 0`（G7）。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的治理证据（本轮最高优先级）**：`T-O-8` = [业主] 本轮指令「能硬切就不要双写、能彻底退役就不要提供兼容、平台保持中立、不得耦合私域」；[`AGENTS.md:37`](../../../../AGENTS.md#L37) 单一真源（只许一份 durable 权威 + consumption receipt）、[`:38`](../../../../AGENTS.md#L38)「同一决定只许一份登记真源」、[`:39`](../../../../AGENTS.md#L39) 不得过度仪式。
- **支持 A 的双写反证（现状已分裂）**：[`index.js:640-641`](../../../../dsh-nano-kitesurf/index.js#L640) 一次 `/open` 同时写本地 JSONL 与引擎 KV；[`:1008`](../../../../dsh-nano-kitesurf/index.js#L1008) clear 也双清；[`:1017`](../../../../dsh-nano-kitesurf/index.js#L1017) / [`:1019`](../../../../dsh-nano-kitesurf/index.js#L1019) 按 `workerd-kv` / `plugin-store` 二选一读；而 [`lib/history.js:4-8`](../../../../dsh-nano-kitesurf/lib/history.js#L4) 与 [`runtime/mcp-bridge.mjs:209`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L209) 断言「workerd 无 D1/KV binding」—— 文档与代码自相矛盾，双写已产生可观测的真相分裂。
- **支持 A 的「双份真源代价」证据**：[`lib/skill.js:212`](../../../../dsh-nano-kitesurf/lib/skill.js#L212) 写「6 个 `kitesurf_*`」却列 8 个名字，而 [`runtime/mcp-bridge.mjs:163-254`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L163) 实际 13 个；[`scripts/route-scan.mjs:210-212`](../../../../scripts/route-scan.mjs#L210) 把 8 个常量烤死导致 `expected 8 ... parsed 24`，两门禁 `exit 1`。
- **支持 A 的特权实物证据**：[`security/route-sensitivity.json:436-445`](../../../../security/route-sensitivity.json#L436) 的 justification 明写 `start/resume spawn container run and bind-mount a host dir`，`capability: proc:kitesurf` 挂在 [DNK]；[`lib/container-engine.js:88`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L88) 与 [`index.js:429`](../../../../dsh-nano-kitesurf/index.js#L429) 是两处真实调用点。留兼容层就会让「已无能力的插件」继续在台账上持有 `proc:kitesurf`。
- **反例 B（`v1.1` 保守建议，须显式修正）**：[`dsh-nano-local-sandbox-v1.1.md:152`](../dsh-nano-local-sandbox-v1.1.md#L152)（Q5 假设保留 façade）、[`:502`](../dsh-nano-local-sandbox-v1.1.md#L502)（To-Be 图 `DNKH2` 兼容转发节点）、[`:1077`](../dsh-nano-local-sandbox-v1.1.md#L1077)（C6-4 façade 兼容）、[`:1087`](../dsh-nano-local-sandbox-v1.1.md#L1087)（C7-2 双轨开关）、[`:969`](../dsh-nano-local-sandbox-v1.1.md#L969)（C6 内部双轨）。这些是**兼容策略**，被 `T-O-8` 覆盖；`v1.1` 的事实登记与 `§6.4` 可继承结论不受影响（`T-O-5`）。
- **反例 C（渐进退役）**：一个版本的兼容层仍要求状态双写与双套合同，只是把删除延后；且会引入「兼容层何时删」的额外门禁，属 [`AGENTS.md:39`](../../../../AGENTS.md#L39) 未授权仪式。
- **时序护栏（不是反例，是边界条件）**：[`v1.1 L109`](../dsh-nano-local-sandbox-v1.1.md#L109)（I-5：L3 废弃动作以 L2 已提供标准 MCP 与接口为前置）、[`:968`](../dsh-nano-local-sandbox-v1.1.md#L968)（C4/C5 在 C6 之前，先拆后补禁止）、[业主] 指令 3 原文。**选 A 不推翻时序；它只取消「兼容层 / 双轨 / 双写」三种策略。**

---

## 3. ★ 中场评估 I（Round 1 → Round 2）`[核心·锁死]`

> **本段为 Round 1 冻结后的承重评估（锁死②）。** [业主] 于 2026-11-14 全数同意 Q1 / Q2 推荐（均选 A），据此固化 `T-O-9` / `T-O-10`；随后 agent **重新展开代码检索**（§4.0）与 Reasoning，才提出 Round 2 的 Q3 / Q4。

### 3.1 对 Round 1 的判定

- **Q1 已决断**：[业主] 选 A —— [DNLS] 为仓内独立 overlay 插件，只经四个登记 L2 契约面服务，`ctx.sandboxPolicy` 只读注入，不实现 `SandboxProvider`、不替换 host seam、不建私有通道。无遗留。
- **Q2 已决断**：[业主] 选 A —— 硬切 + 彻底退役，无 façade / 双轨 / 双写 / 工具别名；保留 `v1.1 L109` 与 `:968` 的**时序**护栏。无遗留。
- **最关键的一手是 Q2**：它把 `v1.1` 的保守迁移建议（`:152` Q5 保留 façade、`:502` To-Be 图 `DNKH2`、`:1077` C6-4、`:1087` C7-2 双轨、`:969` C6 内部双轨）显式作废，使后续所有 executional 题**不再需要设计兼容层、双写同步、迁移期台账**。`v1.1` 的事实登记、`§6.4` 可继承结论、`§8.9` 合约单位清单继续有效（`T-O-5`）。
- **两题共同收窄了 Round 2 的问题空间**：`T-O-9` 钉死「平台是什么」，`T-O-10` 钉死「怎么切」；剩下的 foundational 未定点只剩「谁从哪条通道进来」与「实例按什么粒度存在」两类。

### 3.2 本轮已锁定真相

- `T-O-9`（Q1）：独立插件 + 四 L2 标准契约 + policy 只读注入 + backend 抽象 + 特权入口唯一 + 不实现 `SandboxProvider`。
- `T-O-10`（Q2）：三段时序硬切、[DNK] 容器资产删除清单、状态/合同/台账一次性收敛、[DNT] 同原则处置、G2–G4/G7 验收。
- **冲突裁决已登记**：`T-O-8` > `v1.1` 兼容策略；`v1.1 I-5` / `:968` 时序护栏仍成立。

### 3.3 诚实反方制衡（不掩盖）

- **Q1 的代价**：所有跨插件通信都要经登记契约，[DNK] UI 的同步点选/截图从「同进程直连」变成「宿主 HTTP/CDP 往返」，延迟可能上升；且 `ctx.sandboxPolicy` 只读意味着 [DNLS] **不能**改变会话模式，策略切换只能靠 `policyFingerprint` + 重建/拒绝（这正是 Q4 要处理的）。若后续实测延迟不可接受，正确做法是优化契约而非开私有后门（`T-O-9` 禁止）。
- **Q2 的代价**：一次性硬切的删除面大、已装 profile 需随新版重装、**没有可回退的旧路径**。这把全部风险压到「② 对等验收」的完备性上 —— e2e 覆盖不全就硬切，将无法回滚。因此 Q2 的「三段时序」必须由 executional 轮次把验收清单钉死，不能靠「先上线再补」。
- **漂移风险更尖锐**：`v1.1 §7.4 RK8` 登记的活跃开发漂移，在无兼容层的硬切下没有缓冲；双轨期间冻结 [DNK] 容器面这一缓解手段已被 `T-O-10` 取消，需另找替代（例如快照 commit + tarball 校验）。
- **不掩盖的一点**：`T-O-9` 选 A 排除了 capability group，也就放弃了「模型侧无需新 MCP 工具」的便利；`sandbox_*` 工具族与技能正文的重写工作量是实打实的。

### 3.4 为什么提出 Round 2（注入哪些题 + 由哪条 `T-O` 驱动）

`T-O-9` / `T-O-10` 钉死方向后，剩两个必须 foundational 冻结的未定点：

| 题 | 由哪条 `T-O` 驱动 | 钉死后仍剩的未定点 |
|---|---|---|
| **Q3** 消费者接入面分工 | `T-O-3`（[DNK] 退化为纯前端 + CDP 对接人）、`T-O-4`（[DNLS] 提供完整 MCP 与 CDP 驱动）、`T-O-9`（四个登记 L2 面）、`T-O-10`（不留兼容别名）、`T-O-7`（不得侧载 / 不得擅自扩约） | [业主] 指令 3「[DNK] 只能通过其内部的 skill 与 [DNLS] 对接」的**准确含义**：skill 是模型侧指令层，还是运行时唯一通道？四个 L2 面里哪些给 agent、哪些给 UI？不冻结会让 executional 阶段的 MCP 工具面 / HTTP 面 / 技能正文各自长出一套，形成第三、第四条私有通道 |
| **Q4** 实例 scope 与 policy 边界 | `T-O-6`（`SandboxMode` 三档、不扩约）、`T-O-9`（`resolve({session})` 只读注入）、`T-O-2`（特权唯一）、`T-O-10`（不双写 / 单一真源）、`T-O-1`（backend 抽象按两种实现设计） | 安装版 `ctx.sandboxPolicy.resolve({session})` 是 **per-session** 的，而 [DNK] 现状是**全局单例**（单容器 / 单 CDP socket / 单页 / 单 state 目录）；scope 不冻结会让 instance 模型、KV/D1、CDP driver、[DNK] UI 全部返工（`v1.1 :977` RK2 已登记为**高风险**、`:1200` 判「合同风险高于技术风险」） |

> 两题均属 **foundational**：它们决定后续全部 executional 题（profile schema / instance registry / MCP 工具面 / CDP driver / terminal driver / policy adapter / state service / error catalog / 台账）的形状，而非某个字段的取值。Round 3+ 的 executional 题目本轮仍不预设。

---

## 4. Round 2 —— foundational：接入面分工与实例边界（`Q3–Q4`）· 已冻结

> 本轮 second-opinion 模式：`waived`（不设槽位）。**两题均由 §1 已冻结真相驱动**（题头逐一标注），并按 §3.4 中场评估的结论提出；本轮代码检索见 §4.0。**两题已全数冻结**；Round 3 题目见 §6。

### 4.0 本轮提问前的代码检索清单（证据基础 · Round 1 冻结后重新展开）

| # | 检索 / 阅读对象（`file:line`） | 结论（用于本轮） |
|---|---|---|
| 1 | [`dsh-nano-kitesurf/index.js:582-598`](../../../../dsh-nano-kitesurf/index.js#L582) | `ctx.skills.register` 注册 `kitesurfSkill()` / `nanoKiteSkill()`，`invocation: {modelInvocable: true, userInvocable: true}`、`source: 'runtime'`、`provider: 'nano-kitesurf'` —— **技能本来就是给 agent 的指令面**，不是 UI 数据通道。Q3 的正面证据。 |
| 2 | [`dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md:40-59`](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L40)、[`dsh-nano-kitesurf/skills/nano-kite/SKILL.md:9-19`](../../../../dsh-nano-kitesurf/skills/nano-kite/SKILL.md#L9) | 技能正文教 agent「读 `GET /status` 的 `kite.cdp`」「用 `agent-browser --cdp`」「`POST /kite {action}`」—— 内容是**契约指引 + 排障命令**，不承载页面渲染数据。Q3 的正面证据。 |
| 3 | [`dsh-nano-kitesurf/src/client/index.js:12-30`](../../../../dsh-nano-kitesurf/src/client/index.js#L12)、[`:58`](../../../../dsh-nano-kitesurf/src/client/index.js#L58)、[`:238`](../../../../dsh-nano-kitesurf/src/client/index.js#L238)、[`:395`](../../../../dsh-nano-kitesurf/src/client/index.js#L395)、[`:711`](../../../../dsh-nano-kitesurf/src/client/index.js#L711)、[`:1180`](../../../../dsh-nano-kitesurf/src/client/index.js#L1180)、[`:1355`](../../../../dsh-nano-kitesurf/src/client/index.js#L1355)、[`:1413-1419`](../../../../dsh-nano-kitesurf/src/client/index.js#L1413) | client 定义 19 个 `/nano-kitesurf/*` 常量并直接 `fetch(...)`：挂载探活、DOM 渲染、DevTools 轮询、历史对话框 —— **UI 同步调用完全不经过技能或模型回合**。Q3 反例 B 的证据，也是 `T-O-10` 硬切要改的目标。 |
| 4 | [`dsh-nano-terminal/src/client/index.js:180-181`](../../../../dsh-nano-terminal/src/client/index.js#L180)、[`dsh-nano-terminal/index.js:196-230`](../../../../dsh-nano-terminal/index.js#L196) | `/dnt` 走 `ctx.commandUi`（UI 侧）、`/term` 走 `ctx.commands`（agent / 脚本侧）—— **本仓已有「UI 命令面 / agent 命令面双线」的既成先例**。Q3 选项 A 的同构依据。 |
| 5 | 安装版 `@deepseek-ai/dsh-mcp-client/README.md:12,28,74,78` | MCP 工具以 `mcp__<serverName>__<tool>` 注册进**模型**的工具列表；`dsh-mcp-client` 的定位是「让模型像用原生工具一样用外部 MCP server」。Q3：MCP 是模型侧通道的既有形态。 |
| 6 | [`dsh-nano-kitesurf/runtime/mcp-bridge.mjs:163-254`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L163)、[`lib/skill.js:212`](../../../../dsh-nano-kitesurf/lib/skill.js#L212) | 13 个 `kitesurf_*` 工具由容器内桥应答，而技能正文写「6 个」却列 8 个 —— **同一份契约在模型侧与运行时侧已经漂移**。Q3「契约单一、不留别名」的反例。 |
| 7 | [`AGENTS.md:36`](../../../../AGENTS.md#L36)、[`:37`](../../../../AGENTS.md#L37)、[`:38`](../../../../AGENTS.md#L38) | 不得侧载（禁专有通道 / 硬编 base-url）、单一真源、不得擅自扩约（error 枚举 / idempotency / retry 义务 / 新 lane 须 [业主] 决定）。Q3 禁止「第三通道」与 Q4 禁止「两套状态权威」的硬约束。 |
| 8 | 安装版 `@deepseek-ai/dsh-sandbox-policy/README.md:47-49,61-63,79-85` | `mode` 是部署默认、`workspaceRoot` 来自 session immutable cwd；`sandbox/mode` **per-session 事件**且「two sessions never see each other's state」；`resolve({session, mode})` 返回一份 per-call policy，优先序为「显式授权 > 会话覆盖 > 部署默认」。Q4 的核心输入。 |
| 9 | 安装版 `@deepseek-ai/dsh/docs/subsystems/sandbox.md:51-72,85-87` | `SandboxExecutionPolicy` 含 `sessionId?: SessionId`，注释明写「Backends key per-session state off it」；`:87` 明写「permits concurrent sessions… to ask the same provider for different boundaries」。Q4：per-session 是平台契约，不是可选实现。 |
| 10 | [`dsh-nano-kitesurf/lib/engine.js:207`](../../../../dsh-nano-kitesurf/lib/engine.js#L207)、[`:369`](../../../../dsh-nano-kitesurf/lib/engine.js#L369)、[`:465-489`](../../../../dsh-nano-kitesurf/lib/engine.js#L465) | 模块级 `live = null` 单 CDP socket、`verifiedBase` 单 origin、`pageHandle` 只取 `pages[0]` 单 page target —— **[DNK] 现状是全局单例**。Q4 与 `T-O-9` 的冲突实物。 |
| 11 | [`dsh-nano-kitesurf/lib/container-engine.js:18`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L18)、[`:328-331`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L328)、[`lib/nano-kite.js:36-38`](../../../../dsh-nano-kitesurf/lib/nano-kite.js#L36)、[`runtime/Dockerfile:34-36`](../../../../dsh-nano-kitesurf/runtime/Dockerfile#L34) | 单一容器名、单一 `~/.dsh-kitesurf-state` 目录、单一 `phase/httpBase/mcpPort`、单一容器内端口 —— 四处全局单例。Q4 反例 B 的现状证据。 |
| 12 | [`dsh-nano-terminal/lib/sessions.js:131`](../../../../dsh-nano-terminal/lib/sessions.js#L131)、[`:144`](../../../../dsh-nano-terminal/lib/sessions.js#L144)、[`:151`](../../../../dsh-nano-terminal/lib/sessions.js#L151)、[`:168`](../../../../dsh-nano-terminal/lib/sessions.js#L168)、[`:179-182`](../../../../dsh-nano-terminal/lib/sessions.js#L179) | `SessionRegistry` 用 `Map` 按 id 管理会话，`sessionId` / `owner` 入参，`resolveCwd` 经 `ctx.sessions?.get?.(sessionId)` → `ctx.workingDirectory.get(session)` —— **本仓已实现 per-session 实例模型**。Q4 选项 A 的正面先例。 |
| 13 | [`security/route-sensitivity.json`](../../../../security/route-sensitivity.json) （35 处 `"sessionBinding": false`，如 [`:15`](../../../../security/route-sensitivity.json#L15)、[`:27`](../../../../security/route-sensitivity.json#L27)） | 当前全部活跃路由都**没有** session 绑定；`sessionBinding` 只是台账元数据、运行时不强制（`packages/dsh-host-route-guard/AGENTS.md:37`）。Q4：[DNLS] 路由台账须显式声明 session 语义，不能沿用 `false`。 |
| 14 | [`dsh-nano-local-sandbox-v1.1.md:149`](../dsh-nano-local-sandbox-v1.1.md#L149)、[`:687-702`](../dsh-nano-local-sandbox-v1.1.md#L687)、[`:977`](../dsh-nano-local-sandbox-v1.1.md#L977)、[`:1200`](../dsh-nano-local-sandbox-v1.1.md#L1200)、[`:1223`](../dsh-nano-local-sandbox-v1.1.md#L1223) | `Q2 shared/session` 未决、`§5.4` instance 模型草稿含可选 `sessionId?` 与 `policyFingerprint`、`RK2` 登记为**高风险**、「合同风险高于技术风险」、`§9.5 Q2` 待拍板。Q4 是这些残题的 foundational 收口。 |

---

### Q3 — 消费者接入面的分工与权威：skill 是模型侧指令层，还是运行时唯一通道？
（**驱动真相：`T-O-3` + `T-O-4` + `T-O-9` + `T-O-10` + `T-O-7`** · 来源：[业主] 指令 3；`v1.1 §1.5 Q3 / §4.4 / §8.9`；`AGENTS.md:36-38`）

- **影响范围**：四个 L2 契约面分别服务哪类主体；[DNK] 技能正文（`lib/skill.js` / `skills/*/SKILL.md`）与 `ctx.skills.register`；[DNK] client 的 19 个路由常量与全部 `fetch` 调用目标（硬切后）；`sandbox_*` MCP 工具面形状；`http-routes` 的鉴权与 error 枚举；后续**全部** executional 题（MCP 工具面 / HTTP 面 / 技能正文 / 错误目录）。
- **为什么必须确认**：[业主] 指令 3 原文「后续 [DNK] 只能通过其内部的 skill，与 [DNLS] 进行对接」。`T-O-9` 已冻结「对外只经四个登记的 L2 标准契约面」，但**没有**说清 agent 侧与 UI 侧各走哪一面。若按字面把 skill 当唯一通道，则面板挂载探活（`src/client/index.js:395`）、DOM 渲染（`:711`）、DevTools 轮询（`:1413-1419`）、hover 预览（`preview:true` pick）都要过一次 LLM 回合 —— 延迟与成本不可接受，且**无 agent 会话时 UI 完全不可用**；若把 skill 完全退役，又违反 [业主] 明确要求保留的对接面。这个分工不冻结，executional 阶段的 MCP 工具面、HTTP 面、技能正文会各自长出一套，最终形成第三 / 第四条私有通道，正面违反 `T-O-9` 与 [`AGENTS.md:36`](../../../../AGENTS.md#L36)。
- **当前建议 / 倾向**（`DNLS01 架构 agent`）：**选 A** —— **双线分工、单一契约面**：agent / 模型侧经 [DNK] 内部 skill 调 [DNLS] 的 `sandbox_*` MCP 工具；UI / 宿主侧经登记的 `http-routes` + `cdp-driver` **直连** [DNLS]（地址由 `instance.endpoints` 动态返回），不经过模型回合。skill 是**模型侧指令真源**，不是运行时传输层；两者共用同一份契约与错误目录；**禁止第三条通道**。
- **Reasoning**：① 代码事实：技能注册在 `index.js:582-598` 且 `modelInvocable: true`，正文是「读哪个契约、调哪个工具、怎么排障」（`SKILL.md:40-59`），而 UI 侧 19 个常量 + 十余处 `fetch` 从来是同步直连 —— **双线是既成事实，不是新发明**；② 同构先例：[DNT] 的 `/dnt`（`ctx.commandUi` UI 侧）与 `/term`（`ctx.commands` agent 侧）本就分线（`src/client/index.js:180-181` / `index.js:196-230`）；③ 平台事实：安装版 `dsh-mcp-client/README.md:12,74` 说明 MCP 工具注册到**模型**工具列表，MCP 天然是模型侧通道；④ 治理：`T-O-10` 要求 `kitesurf_*` 工具别名与 `/nano-kitesurf/*` 路径彻底退役，但 **skill 本身不是兼容层**，它是 [业主] 指定的对接面，必须保留并改写正文；⑤ 单一真源：MCP 与 HTTP 共用一份 `ERROR_CATALOG` 与 `sandbox_*` 工具目录，error 枚举 / 幂等法则 / retry 义务只有一份登记（[`AGENTS.md:38`](../../../../AGENTS.md#L38)）。
- **问题（请 [业主] 裁决）**：**你是否确认采用「双线分工、单一契约面」：agent / 模型侧只经 [DNK] 内部 skill 调 [DNLS] 的 `sandbox_*` MCP 工具（skill 是模型侧指令真源，不承载运行时数据）；UI / 宿主侧经 `http-routes` + `cdp-driver` 直连 [DNLS]（不经过模型回合）；两面共用同一份契约与 error 目录，禁止第三条私有通道；同时按 `T-O-10` 彻底退役 `kitesurf_*` 工具别名与 `/nano-kitesurf/*` 路径？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 已冻结为 T-O-11`（[业主] 2026-11-14：同意第 2 轮全部推荐）

**【对本问题的解读】**

1. 本问裁决的不是「要不要 skill」，而是 **「skill 在拓扑里属于哪一层」**。`T-O-9` 已经把 [DNLS] 对外面定为四个 L2 契约；本问要冻结的是**这四个面的调用主体矩阵**，以及 skill 与它们的关系。
2. 「只能通过 skill 对接」在本问的推荐解读下 = **模型侧的接入面被收窄为 skill + MCP**（模型不再直接读容器状态、不再直接调 `container`、不再靠猜端点）；而 UI 侧走的是同一份登记的 `http-routes` / `cdp-driver` 契约，**不是**绕过 [DNLS]，因此不违反「只能通过 skill 对接」的治理意图。
3. **skill 不是兼容层**。`T-O-10` 的「彻底退役」针对的是旧容器资产、旧路径别名、旧工具别名、旧配置键；skill 是 [业主] 指令 3 明确要求保留的对接面。把 skill 一起退役（选项 C）会误用 `T-O-8`。
4. 「不得耦合私域」在本问的可验收含义：不得出现 `window.__nks*` 之类私有全局作为跨插件总线、不得 `import` 另一插件的 `lib/`、不得硬编 `/nano-local-sandbox` 之外的消费者私有路径；`attach` 一律用 `attach.url`（`T-O-9`）。
5. **契约单一 ≠ 通道单一**：允许两条主体通道（MCP / HTTP），但 error 枚举、幂等法则、retry 义务、`sandbox_*` 工具目录、`ERROR_CATALOG` **全系统只有一份**。当前 `lib/skill.js:212` 写「6 个」而 `mcp-bridge.mjs:163-254` 有 13 个，正是「同一契约两份表述」的现实代价。

**【可选选项清单】**

| 选项 | 内容 | 优点 | 缺点 / 反例 | 结论 |
|---|---|---|---|---|
| **A** | **双线分工、单一契约面**：agent 侧 = skill → `sandbox_*` MCP；UI / 宿主侧 = `http-routes` + `cdp-driver` 直连；共用一份契约与 error 目录；禁第三通道 | 复用既成事实与本仓先例；无 agent 会话时 UI 仍可用；模型侧有排障入口；契约单一可审计 | 需要明确两面各自的工具/路由清单，并在 executional 轮次冻结 | **推荐** |
| **B** | **skill 为唯一通道**（字面理解）：UI 的每次点选 / 截图 / 渲染都经一次模型回合 | 字面最贴合 [业主] 原话 | [`src/client/index.js:395`](../../../../dsh-nano-kitesurf/src/client/index.js#L395) 的挂载探活、[`:711`](../../../../dsh-nano-kitesurf/src/client/index.js#L711) 的 DOM 渲染、[`:1413-1419`](../../../../dsh-nano-kitesurf/src/client/index.js#L1413) 的 DevTools 轮询都会变成模型调用；无 agent 会话时面板打不开；hover 预览每次触发 LLM | 不推荐 |
| **C** | **skill 完全退役**，全部走标准契约，[DNK] 不再有技能 | 通道最少 | 违反 [业主] 指令 3「只能通过其内部的 skill 与 [DNLS] 对接」；[`index.js:582-598`](../../../../dsh-nano-kitesurf/index.js#L582) 的 `ctx.skills.register` 是现有合同面，退役后模型侧失去排障入口；误用 `T-O-8`（skill 不是兼容层） | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **冻结调用主体矩阵（executional 轮次的输入）**：`sandbox_*` MCP 工具面（主体 = agent / 模型，经 skill）· `http-routes`（主体 = Web 页面 / UI）· `cdp-driver`（主体 = [DNK] client 与 `agent-browser`，经 `instance.endpoints` 动态取得）· `terminal-driver`（主体 = [DNT] client）。**四个面、两类主体、零私有通道。**
2. **技能正文由单一真源重建**：`lib/skill.js` 生成 `skills/*/SKILL.md`，内容改为「读 [DNLS] `sandbox_*` 工具 + `GET /nano-local-sandbox/status` 取 `instance.endpoints`」；`kitesurf-cdp` 保留 design-mode / CDP 排障语义，`nano-kite` 改为 `instance.*` 生命周期工具指引；**`kitesurf_*` 13 工具不留别名**（`T-O-10`）；修正 [`lib/skill.js:212`](../../../../dsh-nano-kitesurf/lib/skill.js#L212) 的 6/8/13 漂移；`npm test` 逐字符校验真源与产物。
3. **[DNK] client 一次性硬切**：[`src/client/index.js:12-30`](../../../../dsh-nano-kitesurf/src/client/index.js#L12) 的 19 个 `/nano-kitesurf/*` 常量与全部 `fetch` 调用点改指 `/nano-local-sandbox/*`（`T-O-10` 无 façade、无别名）；[`index.js:582-598`](../../../../dsh-nano-kitesurf/index.js#L582) 的技能注册保留但 `provider` / 正文改指 [DNLS]。
4. **禁止第三条通道（可静态验收）**：无 `lib/` 互 import、无硬编 base-url（[`AGENTS.md:36`](../../../../AGENTS.md#L36)）、无 `window.__nks*` / `window.__dnt*` 跨插件全局总线；`attach` 由 server 显式返回 `attach.url`，取代 [`lib/mcp.js:96`](../../../../dsh-nano-terminal/lib/mcp.js#L96) / [`src/client/lanes.js:140`](../../../../dsh-nano-terminal/src/client/lanes.js#L140) 的双侧硬编。
5. **权威划分**：skill 正文 = 模型侧**指令**真源；运行时状态真源 = [DNLS]（`T-O-2` / `T-O-9`）；[DNK] 只保留 `lastPick` / context ref 等**领域态**（`v1.1 §8.10`）；`ERROR_CATALOG` 与 `sandbox_*` 工具目录只此一份，MCP 与 HTTP 双向派生（[`AGENTS.md:37`](../../../../AGENTS.md#L37)）。
6. **不擅自扩约**：`sandbox_*` 工具面、error 枚举、幂等法则、客户端 retry 义务属公共合同，按 [`AGENTS.md:38`](../../../../AGENTS.md#L38) 须由 [业主] 在 executional 轮次逐项冻结，不由实现反推；[DNT] 若新增 `sandbox` lane 同属「新 lane」。
7. **验收口径**：① **无 agent 会话时** UI 仍能打开面板、点选、截图、渲染、DevTools 轮询；② 模型侧只用 skill + MCP 即可完成排障 / 生命周期操作；③ 全仓静态扫描无第三条跨插件通道；④ 技能真源与产物逐字符一致；⑤ `kitesurf_*` / `/nano-kitesurf/*` 零残留。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的既成事实**：[`dsh-nano-kitesurf/index.js:582-598`](../../../../dsh-nano-kitesurf/index.js#L582) `ctx.skills.register`（`modelInvocable: true`）；[`skills/kitesurf-cdp/SKILL.md:40-59`](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L40) 教 agent 读 `kite.cdp` 并用 `agent-browser --cdp`；[`skills/nano-kite/SKILL.md:9-19`](../../../../dsh-nano-kitesurf/skills/nano-kite/SKILL.md#L9) 教 `POST /kite {action}` —— 技能一直是「契约指引 + 排障命令」。
- **支持 A 的 UI 侧事实**：[`src/client/index.js:12-30`](../../../../dsh-nano-kitesurf/src/client/index.js#L12) 19 个路由常量；[`:238`](../../../../dsh-nano-kitesurf/src/client/index.js#L238) 通用 `fetch(path, ...)`、[`:395`](../../../../dsh-nano-kitesurf/src/client/index.js#L395) `fetch(STATUS)`、[`:711`](../../../../dsh-nano-kitesurf/src/client/index.js#L711) `fetch(DOM)`、[`:1413-1419`](../../../../dsh-nano-kitesurf/src/client/index.js#L1413) Console / Network / Elements 轮询 —— UI 同步链路与技能完全解耦。
- **支持 A 的同构先例**：[`dsh-nano-terminal/src/client/index.js:180-181`](../../../../dsh-nano-terminal/src/client/index.js#L180) `/dnt` 走 `ctx.commandUi`（UI 侧）；[`dsh-nano-terminal/index.js:196-230`](../../../../dsh-nano-terminal/index.js#L196) `/term` 走 `ctx.commands`（agent / 脚本侧）。安装版 `dsh-mcp-client/README.md:12,28,74,78` 说明 MCP 工具以 `mcp__<serverName>__<tool>` 进入**模型**工具列表。
- **支持 A 的治理证据**：[`AGENTS.md:36`](../../../../AGENTS.md#L36) 不得侧载、[`:37`](../../../../AGENTS.md#L37) 单一真源、[`:38`](../../../../AGENTS.md#L38) 不得擅自扩约；`T-O-9`（四 L2 面、无私有通道）、`T-O-10`（别名退役）。
- **反例 B（skill 唯一通道）**：[`src/client/index.js:395`](../../../../dsh-nano-kitesurf/src/client/index.js#L395) 是面板挂载时的状态探测，[`:711`](../../../../dsh-nano-kitesurf/src/client/index.js#L711) 是 DOM 渲染路径；若都经 LLM 回合，面板在无 agent 会话时无法打开，且 `v1.1 §3.2` 的 hover 预览（`preview:true` pick）每次都触发模型调用。
- **反例 C（skill 退役）**：[业主] 指令 3 明确「[DNK] 只能通过其内部的 skill 与 [DNLS] 对接」；`T-O-8` 的「彻底退役」对象是旧容器资产与兼容别名，不是 [业主] 指定的对接面。
- **反例「契约两份表述」**：[`lib/skill.js:212`](../../../../dsh-nano-kitesurf/lib/skill.js#L212) 写「6 个 `kitesurf_*`」却列 8 个名字，[`runtime/mcp-bridge.mjs:163-254`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L163) 实际 13 个；`T-O-10` 要求收敛为一份 `sandbox_*` 目录。

---

### Q4 — 实例 scope 与 policy 边界：`shared` 单实例，还是 `session` 实例？
（**驱动真相：`T-O-1` + `T-O-2` + `T-O-6` + `T-O-9` + `T-O-10`** · 来源：安装版 `dsh-sandbox-policy/README.md:47-49,61-63,79-85`、`dsh/docs/subsystems/sandbox.md:51-72,85-87`；`v1.1 §1.5 Q2 / §5.4 / §7.4 RK2 / §9.5 Q2`；`AGENTS.md:37-38`）

- **影响范围**：profile manifest 是否新增 `scope` 字段；`instance-registry` 的创建 / 查找 / 回收语义；`policy-adapter` 是否完整兑现 `SandboxExecutionPolicy.sessionId` 与 per-session `workspaceRoot`；KV / D1 state 卷是共享还是 per-instance；`cdp-driver` 的 socket 数量与页面归属；[DNK] UI 是否按会话绑定 `instanceId`；容器资源水位（当前 4 GB / 实例）与 e2e 验收形态；后续**全部** executional 题的形状。
- **为什么必须确认**：`T-O-9` 冻结了 `ctx.sandboxPolicy.resolve({session})` **只读注入**，而安装版契约明确该 resolve 是 **per-session** 的：`sessionId` 来自调用会话、`workspaceRoot` 来自 session immutable cwd、`sandbox/mode` 是 per-session 事件且「two sessions never see each other's state」（`sandbox-policy/README.md:61-63,79-85`），`dsh/docs/subsystems/sandbox.md:65-71` 明写「Backends key per-session state off it」。但 [DNK] 现状是**全局单例**：单 `live` socket（[`lib/engine.js:207`](../../../../dsh-nano-kitesurf/lib/engine.js#L207)）、单 `verifiedBase`（`:369`）、单 page target（[`:465-489`](../../../../dsh-nano-kitesurf/lib/engine.js#L465) 只取 `pages[0]`）、单容器名（[`lib/container-engine.js:18`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L18)）、单 state 目录（[`:328-331`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L328)）、单 `phase/httpBase/mcpPort`（[`lib/nano-kite.js:36-38`](../../../../dsh-nano-kitesurf/lib/nano-kite.js#L36)）；且 [`security/route-sensitivity.json`](../../../../security/route-sensitivity.json) 35 处 `sessionBinding: false`。若不冻结 scope，[DNLS] 要么把 `resolve({session})` 的 session 维度**架空**（只剩部署默认），要么在 xray / gateway / NVX 接入时整体返工 —— 这正是 [`v1.1 :977`](../dsh-nano-local-sandbox-v1.1.md#L977) 把 RK2 登记为**高风险**、[`:1200`](../dsh-nano-local-sandbox-v1.1.md#L1200) 判「合同风险高于技术风险」的原因。
- **当前建议 / 倾向**（`DNLS01 架构 agent`）：**选 A** —— **`instance.scope` 是 profile manifest 的声明字段（`shared` / `session`，必填无默认值），L1 的 instance 模型原生支持两者且不硬编；首期 kitesurf profile 声明 `session`**，严格兑现 per-session policy；`policyFingerprint = hash(sessionId, mode, workspaceRoot, extraRoots)`；策略切换按 `recreate` 或 `policy-stale` 处理，不广告 `sandbox_permissions`；资源上限与空闲回收由 profile 声明。
- **Reasoning**：① **长期治理 / 拒绝 hotfix**：选项 B 是把旧全局单例形态改名搬进平台并称「首期妥协」，一旦多 profile 或 NVX 接入就要重做 instance 模型（`T-O-1` 已要求 backend 抽象按两种实现设计）；A 让平台不写死，由 profile 自己声明 scope，才是「平台保持中立」。② **严格兑现 `T-O-9`**：`resolve({session})` 的 `sessionId` / `workspaceRoot` 不再被架空，三档映射真正落到每个会话的挂载矩阵。③ **单一真源 / 不双写**：选项 C 的「共享引擎 + per-session 挂载」会同时持有两处状态权威，违反 [`AGENTS.md:37`](../../../../AGENTS.md#L37) 与 `T-O-10`。④ **可实现性有本仓先例**：[DNT] `SessionRegistry`（[`lib/sessions.js:131,144,151,168,179-182`](../../../../dsh-nano-terminal/lib/sessions.js#L131)）已经是 per-session（Map / `sessionId` / `owner` / `resolveCwd` 经 `ctx.sessions.get`）。⑤ 代价诚实登记：4 GB / 实例、[DNK] UI 改造、e2e 改写、CDP socket 数量上升 —— 由「按需创建 + 空闲回收 + profile 资源声明」缓解，**不靠共享单例规避**（那是 hotfix）。
- **问题（请 [业主] 裁决）**：**你是否确认：`instance.scope` 作为 profile manifest 的必填声明字段（`shared` / `session`，无默认值）、L1 不硬编；首期 kitesurf profile 声明 `session`，完整兑现 `ctx.sandboxPolicy.resolve({session})` 的 `sessionId` / `workspaceRoot` / `additionalWritableRoots`，`policyFingerprint` 绑定四元组，KV / D1 与 CDP socket 均 per-instance；策略切换按 `recreate` / `policy-stale` 处理且不广告 `sandbox_permissions`；资源上限与空闲回收由 profile 声明？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 已冻结为 T-O-12`（[业主] 2026-11-14：同意第 2 轮全部推荐）

**【对本问题的解读】**

1. 本问裁决的不是「首期开几个容器」，而是 **「instance 的粒度与 [dsh] policy 的粒度是否同构」**。`T-O-9` 把 `resolve({session})` 定为唯一 policy 输入后，若实例是全局 `shared`，该函数返回的 `sessionId` 与 per-session `workspaceRoot` 就没有落点 —— 等于只读了一个被削掉维度的 policy。
2. **`shared` 与 `session` 不是互斥的两种平台，而是 profile 的一个字段**：xray / gateway / 本地 S3 未来可能声明 `shared`，kitesurf 首期声明 `session`。把平台写死成任一种，都会在第二个 profile 出现时返工 —— 这是「平台保持中立」的具体含义。
3. **「不双写」在本问的含义**：一个 session 实例 = 一份 `stateVolume` + 一份 CDP socket + 一份 `policyFingerprint`；不允许「共享引擎进程 + per-session 挂载表」这种两套权威（`T-O-10` / [`AGENTS.md:37`](../../../../AGENTS.md#L37)）。
4. **`SandboxMode` 的边界仍按 `T-O-6`**：三档只映射**文件效果**（挂载 ro/rw）；网络 / 进程 / 设备 / 资源由 profile 自己声明，**不**塞进 `SandboxMode` 词汇、不扩成四档、不广告 `sandbox_permissions`（`v0.9 §8A.6 L1809-1813`）。
5. **时序不冲突**：`T-O-10` 的三段时序护栏仍然成立 —— 选 A 只是把「② 对等验收」的判据从「单实例全绿」变成「session 实例全绿」，不改变「DNLS 先跑通再硬切」。
6. **代价必须诚实登记**：容器 4 GB / 实例（[`v1.1 :149`](../dsh-nano-local-sandbox-v1.1.md#L149)）、[DNK] UI 需按会话绑定实例、e2e 需改写、CDP socket 数量上升。这些靠生命周期治理缓解，不靠降级成 `shared` 规避。

**【可选选项清单】**

| 选项 | 内容 | 优点 | 缺点 / 反例 | 结论 |
|---|---|---|---|---|
| **A** | **`scope` 由 profile 声明（必填），L1 原生支持两者；首期 kitesurf 声明 `session`** | 平台不写死，第二 / 第 N 个 profile 零返工；严格兑现 `resolve({session})`；单一真源；`policyFingerprint` 可审计 | 4 GB / 实例、[DNK] UI 按会话绑定、e2e 改写、socket 数上升；需 profile 声明资源上限与空闲回收 | **推荐** |
| **B** | **全局 `shared` 单实例**（把当前 Kitesurf 形态直接搬进 [DNLS]），policy 只在部署层映射 | 改动最小、单页体验不变、内存恒定 | ① 把 `sandbox-policy/README.md:61-63` 的 per-session mode、`sandbox.md:65-71` 的 `sessionId` 语义架空；② 是 `T-O-8` 要拒绝的 hotfix，多 profile / NVX 阶段必返工；③ [`v1.1 :149`](../dsh-nano-local-sandbox-v1.1.md#L149) 的「首期按 shared」正是本轮应修正的保守假设 | 不推荐 |
| **C** | **混合**：共享引擎进程 + per-session 挂载 / 状态表 | 试图兼顾内存与隔离 | 「共享引擎 + per-session 状态」= 两套状态权威，违反 [`AGENTS.md:37`](../../../../AGENTS.md#L37) 单一真源与 `T-O-10` 不双写；容器挂载创建时固定，per-session 挂载表无法在不重建的情况下生效（[`v1.1 :701`](../dsh-nano-local-sandbox-v1.1.md#L701) R3 已登记） | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **profile manifest 增加 `scope: shared | session`（必填、无默认值）**：拒绝静默兜底；`profile-registry` 校验该字段；`instanceId` 对 session 实例绑定 `sessionId`，对 shared 实例绑定 `profileId`。**L1 `instance-registry` 不硬编码任一分支。**
2. **`policy-adapter` 完整兑现 `SandboxExecutionPolicy`**：输入 `{mode, workspaceRoot, additionalWritableRoots, sessionId}` → 该实例的挂载矩阵；`policyFingerprint = hash(sessionId, mode, workspaceRoot, extraRoots)` 写入 instance 记录；`sandbox/mode` 运行时切换（安装版 `sandbox-policy/README.md:61-63`）时按 `recreate` 或返回 `policy-stale`，**不广告 `sandbox_permissions`**（`v0.9 §8A.6 L1809-1813`）。网络 / 进程 / 设备 / 资源策略由 profile 独立字段声明，不并入 `SandboxMode`（`T-O-6`）。
3. **`state-service` per-instance**：KV / D1 卷句柄归 `instance.stateVolume`，取代单一 `~/.dsh-kitesurf-state`（[`lib/container-engine.js:328-331`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L328)）；`history` 按 instance 隔离且只有一份 canonical（`T-O-10`）；consumption receipt 只记 identity + version/hash + consumed_at。
4. **`cdp-driver` per-instance**：每个 session 实例一条 CDP socket + 一个 page target；删除 [DNK] 的全局 `live` / `verifiedBase` 单例（[`lib/engine.js:207,369`](../../../../dsh-nano-kitesurf/lib/engine.js#L207)）；由 [DNLS] 持有 socket keeper 或在合同中明确「socket 关闭 = 该实例页面回 `about:blank`」（`v1.1 §3.2`）。
5. **资源与生命周期由 profile 声明**：`maxInstances` / `idleTimeoutMs` / `memory` / `cpus`；按需创建 + 空闲回收，避免 N × 4 GB 常驻；[DNLS] 路由台账把 `sessionBinding` 显式声明为 `true`（对比当前 35 处 `false`），并纳入 `scripts/route-scan.mjs` 扫描范围。
6. **[DNK] consumer 按 session 绑定**：UI 从 `instance.endpoints` 动态取 CDP / HTTP 地址；硬切时一并删除「全局共享单页」假设（`T-O-10`）；`v1.1 §5.4` 的 `sessionId?` 从可选改为 scope 决定的必填 / 不适用。
7. **验收口径**：① 两个不同 session 的 `workspaceRoot` / `mode` 不同 → 各自实例挂载矩阵不同且互不串味；② 某 session 切换 mode → 有确定的 `policyFingerprint` 响应且不影响其他实例；③ KV / D1 / CDP 页面不跨实例；④ e2e 在 session 实例形态下全绿；⑤ `SandboxMode` 仍为三档、无 `sandbox_permissions`。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的平台契约**：安装版 `@deepseek-ai/dsh-sandbox-policy/README.md:47-49`（`mode` 是部署默认、`workspaceRoot` 来自 session cwd）、`:61-63`（per-session `sandbox/mode` 事件，「two sessions never see each other's state」）、`:79-85`（`resolve({session, mode})` 优先序）；`@deepseek-ai/dsh/docs/subsystems/sandbox.md:51-72`（`SandboxExecutionPolicy` 含 `sessionId?`）、`:65-69`（「Backends key per-session state off it」）、`:85-87`（并发 session 可向同一 provider 请求不同边界）。
- **支持 A 的本仓正面先例**：[`dsh-nano-terminal/lib/sessions.js:131`](../../../../dsh-nano-terminal/lib/sessions.js#L131) `Map` 注册表、[`:144`](../../../../dsh-nano-terminal/lib/sessions.js#L144) `sessionId` 入参、[`:168`](../../../../dsh-nano-terminal/lib/sessions.js#L168) `owner`、[`:179-182`](../../../../dsh-nano-terminal/lib/sessions.js#L179) `resolveCwd` 经 `ctx.sessions?.get?.(sessionId)` → `ctx.workingDirectory.get(session)`。
- **支持 A 的治理证据**：[`AGENTS.md:37`](../../../../AGENTS.md#L37) 单一真源、[`:38`](../../../../AGENTS.md#L38) 不得擅自扩约；[`AGENTS.md:34`](../../../../AGENTS.md#L34) 插件中立；`T-O-1`（backend 抽象按两种实现设计）、`T-O-10`（不双写）。
- **反例 B（`shared`）的现状证据**：[`lib/engine.js:207`](../../../../dsh-nano-kitesurf/lib/engine.js#L207) 单 `live`、[`:369`](../../../../dsh-nano-kitesurf/lib/engine.js#L369) 单 `verifiedBase`、[`:465-489`](../../../../dsh-nano-kitesurf/lib/engine.js#L465) 只取 `pages[0]`；[`lib/container-engine.js:18`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L18) 单容器名、[`:328-331`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L328) 单 state 目录；[`lib/nano-kite.js:36-38`](../../../../dsh-nano-kitesurf/lib/nano-kite.js#L36) 单 `phase/httpBase/mcpPort`；[`runtime/Dockerfile:34-36`](../../../../dsh-nano-kitesurf/runtime/Dockerfile#L34) 单容器内端口；[`security/route-sensitivity.json:15,27`](../../../../security/route-sensitivity.json#L15) 等 35 处 `sessionBinding: false`。
- **反例 B 的治理判断**：[`v1.1 :149`](../dsh-nano-local-sandbox-v1.1.md#L149)「首期按 shared 做平台化」与 [`:977`](../dsh-nano-local-sandbox-v1.1.md#L977) RK2 缓解项，是 `v1.1` 在 `T-O-8` 给出前的保守假设；[`:1200`](../dsh-nano-local-sandbox-v1.1.md#L1200) 已判「合同风险高于技术风险」。本轮按长期治理原则修正。
- **反例 C（混合）**：[`v1.1 :701`](../dsh-nano-local-sandbox-v1.1.md#L701) R3 明写「容器挂载创建时固定 vs 会话运行时切换」是契约形状冲突；共享引擎 + per-session 状态会同时持有两处权威，违反 [`AGENTS.md:37`](../../../../AGENTS.md#L37)。
- **代价登记（不掩盖）**：[`v1.1 :149`](../dsh-nano-local-sandbox-v1.1.md#L149) 记 4 GB / 实例；[`§5.4 :687-700`](../dsh-nano-local-sandbox-v1.1.md#L687) 的 instance 字段表是草稿；[`:1223`](../dsh-nano-local-sandbox-v1.1.md#L1223) 把 Q2 列为待拍板。选 A 后这些由 executional 轮次逐项冻结，不由实现反推合同。

---

## 5. ★ 中场评估 II（Round 2 → Round 3）`[核心·锁死]`

> **本段为 Round 2 冻结后的承重评估（锁死②）。** [业主] 于 2026-11-14 全数同意 Q3 / Q4 推荐（均选 A），据此固化 `T-O-11` / `T-O-12`；随后 agent **重新展开代码检索**（§6.0）与 Reasoning，才提出 Round 3 的 Q5 / Q6 / Q7（首批 executional-qna）。

### 5.1 对 Round 2 的判定

- **Q3 已决断**：[业主] 选 A —— 双线分工、单一契约面；skill 是模型侧指令真源，UI/宿主侧经 `http-routes` + `cdp-driver` 直连，零私有通道，`kitesurf_*` 与 `/nano-kitesurf/*` 别名彻底退役。无遗留。
- **Q4 已决断**：[业主] 选 A —— `scope` 为 profile 必填声明、L1 不硬编、首期 kitesurf 声明 `session`，完整兑现 `resolve({session})`，`policyFingerprint` 四元组，per-instance KV/D1 与 CDP socket，不广告 `sandbox_permissions`。无遗留。
- **最关键的一手是 Q4**：它把 `v1.1 :149`「首期按 shared」与 `:977` RK2 缓解项的保守假设显式修正，使 [DNLS] 的 instance 模型从第一天就与 [dsh] per-session policy 同构，避免第二个 profile / NVX 阶段返工（`T-O-1`）。
- **Q3 与 Q4 共同把问题空间从「方向」压到「合同」**：`T-O-11` 钉死「谁从哪条通道进来」，`T-O-12` 钉死「实例按什么粒度存在」；剩下的全部是执行层字段、清单、命名与台账问题 —— 正是 executional 轮次的范围。

### 5.2 本轮已锁定真相

- `T-O-11`（Q3）：调用主体矩阵（四 L2 面 / 两类主体）、skill 非兼容层、契约与 error 目录单一、别名退役、禁第三通道、`attach.url`。
- `T-O-12`（Q4）：`scope` 必填声明、首期 `session`、四元组 fingerprint、策略切换 `recreate`/`policy-stale`、per-instance state 与 socket、三档 policy 边界、资源生命周期治理、显式修正 `v1.1` 保守假设。
- **冲突裁决已登记**：`T-O-8` > `v1.1` 兼容策略；`v1.1 I-5` / `:968` 时序护栏仍成立；`v1.1 :149` / `:977` 的 shared 假设被 `T-O-12` 取代。

### 5.3 诚实反方制衡（不掩盖）

- **Q3 的代价**：`sandbox_*` 工具族、技能正文、[DNK] client 19 个路由常量与全部 `fetch` 都要重写；`tools/list` 从「33 + 13」变成「33 + `sandbox_*`」，任何遗漏都会在模型侧表现为「工具不存在」。且两面共用一份 error 目录意味着 `ERROR_CATALOG` 的**任何**变更都同时影响 agent 与 UI，回归面变大。
- **Q4 的代价最重**：4 GB / 实例、[DNK] UI 按会话绑定、e2e 改写、CDP socket 数量上升、`stateVolume` 按实例切分；「按需创建 + 空闲回收」若实现不当，会出现会话切换时频繁冷启动（[DNK] 冷建容器实测约 100s，`v1.1 §2.4`）。这必须由 executional 轮次把 `maxInstances` / `idleTimeoutMs` / 预热策略钉死，不能只写原则。
- **Q4 与 `T-O-10` 的张力**：硬切三段时序的「② 对等验收」原本是单实例 e2e 20/20；改成 session 实例后，验收必须新增「双会话不串味」「切 mode 有确定响应」两类用例，否则硬切后无法证明正确性，且无回退路径。
- **不掩盖的一点**：`T-O-12` 选 `session` 放弃了「保持当前单页体验」的便利；[dsh工作台] 的 Kitesurf 面板从「一个全局页面」变成「每会话一个页面」，这是产品形态的可见变化，须在计划中明示。

### 5.4 为什么提出 Round 3（注入哪些题 + 由哪条 `T-O` 驱动）

`T-O-11` / `T-O-12` 钉死后，执行层剩下三个**必须最先冻结的合同基座**（其余如 CDP keeper 帧语义、terminal 具体工具参数、e2e 用例清单留给 Round 4+）：

| 题 | 由哪条 `T-O` 驱动 | 钉死后仍剩的未定点 |
|---|---|---|
| **Q5** profile manifest 与构建配方 | `T-O-3`（构建归 [DNLS]）、`T-O-9`（backend 抽象 / 特权唯一）、`T-O-10`（单一真源 / 别名退役）、`T-O-12`（`scope` 必填）、`T-O-1`（NVX 后置但抽象要留）、`T-O-5`（`v0.9 §8C.6` 脚本契约可继承） | 版本真源目前**分散在四处**（Dockerfile / `linux-prefix/package.json` / 外部 checkout / `wrangler.jsonc`），且 `linux-prefix` 用 caret 范围；不冻结 manifest 字段，Q6 无 `profileVersion`/digest 可绑、Q7 无 `artifacts` 真源 |
| **Q6** instance registry 与 `policyFingerprint` | `T-O-12`（session scope / 四元组 / 不广告）、`T-O-9`（policy 只读 / 特权唯一 / S3）、`T-O-6`（三档不扩约）、`T-O-10`（硬切 / 不双写）、`T-O-2`（特权唯一） | `v0.9 §8B.6` 的升级语义 A/B 在新方向下仍未关闭；`v1.1 §5.4 L701` 登记 R3 是「契约形状」冲突；[DNK] 相位机 / bringUp / 端口韧性 / `/recover` 全是单例实现，须提升为 per-instance |
| **Q7** 四 L2 契约面与错误 / 台账单一真源 | `T-O-11`（单一契约面 / 别名退役）、`T-O-9`（四 L2 面）、`T-O-10`（台账一次性对齐）、`T-O-7`（不得擅自扩约 / 不得侧载 / 单一真源）、`T-O-8`（彻底退役） | 契约本身已分裂：13 个 `kitesurf_*` vs 技能正文「6 个」列 8 个；`ERROR_CATALOG` 漏 7 个 errorId；`route-scan.mjs` 8-vs-24 使两门禁 `exit 1`；[DNT] 在三份安全台账 0 条 |

> 三题均属 **executional**：它们冻结的是字段、清单、命名、错误枚举与台账行，而非方向。`T-O-11` 已把「契约只有一份」定死，因此 Q7 若出现「四面各一份 error 表」即直接违规。CDP socket keeper 的具体帧语义、`term.session.*` 参数细目、`dnt-ws-v1` 的 ping 修复、e2e 用例清单等，本轮**不预设**，留 Round 4+。

---

## 6. Round 3 —— executional：三个合同基座（`Q5–Q7`）· 已冻结

> 本轮 second-opinion 模式：`waived`（不设槽位）。**三题均由 §1 已冻结真相驱动**（题头逐一标注），并按 §5.4 中场评估 II 的结论提出；本轮代码检索见 §6.0。**三题已全数冻结**；Round 4 题目见 §7。

### 6.0 本轮提问前的代码检索清单（证据基础 · Round 2 冻结后重新展开）

| # | 检索 / 阅读对象（`file:line`） | 结论（用于本轮） |
|---|---|---|
| 1 | [`dsh-nano-kitesurf/runtime/Dockerfile:10,16,30,32-36,39`](../../../../dsh-nano-kitesurf/runtime/Dockerfile#L10) | 基础镜像 `node:22-bookworm-slim`、`COPY linux-prefix`、`USER node`、四项 env 端口、`tini` 入口 —— 镜像契约散在 Dockerfile 字面值里，不是数据。Q5 的现状证据。 |
| 2 | [`dsh-nano-kitesurf/runtime/linux-prefix/package.json`](../../../../dsh-nano-kitesurf/runtime/linux-prefix/package.json) | `agent-browser: ^0.42.0`、`wrangler: ^4.161.0` —— **caret 范围，不是精确 pin**，与 `v0.9 §8C.6 L2116-2127`「锁精确版本」直接冲突。Q5 的反例。 |
| 3 | [`dsh-nano-kitesurf/lib/container-engine.js:38-53`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L38)、[`:60-71`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L60)、[`:329-331`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L329)；[`index.js:116`](../../../../dsh-nano-kitesurf/index.js#L116)、[`:133-144`](../../../../dsh-nano-kitesurf/index.js#L133)、[`:413`](../../../../dsh-nano-kitesurf/index.js#L413) | `createArgs` 硬编 8787/8791；`checkoutPath` 依赖宿主全局 `KITESURF_CHECKOUT`；`statePath` 单一全局目录；`effectiveCheckout` 是 `config > env > persistedCheckout()` **三级真源**；`rememberCheckout` 把回执写进 lock。Q5「彻底退役旧配置键」的直接对象。 |
| 4 | [`dsh-nano-kitesurf/runtime/entrypoint.sh:23-34`](../../../../dsh-nano-kitesurf/runtime/entrypoint.sh#L23)；[`runtime/Dockerfile:1-9`](../../../../dsh-nano-kitesurf/runtime/Dockerfile#L1) | `wrangler dev --env local -c wrangler.jsonc --persist-to "$state"`；Alpine `__res_init` 缺失的实测硬约束写在注释里。Q5 构建配方要保留的证据。 |
| 5 | [`v0.9 §8C.6 L2116-2127`](../dsh-nano-local-sandbox-v0.9.md#L2116)、[`§5.9.5 L993-1011`](../dsh-nano-local-sandbox-v0.9.md#L993)、[`§5.9.1`](../dsh-nano-local-sandbox-v0.9.md#L929) | 脚本契约四要求（精确版本 / SHA256 / 失败关闭 / 记录安装内容）；`container machine` 五条反隔离行为与「只用 `run`/`exec`」禁令；官方稳定版 1.7.1。Q5 推荐的可继承依据（`T-O-5`）。 |
| 6 | `container --version`（本机实跑） | `container CLI version c05a560 (build: debug, commit: c05a560)` —— **debug build**，不能作为发布基线。Q5「pin 官方稳定版」的实证。 |
| 7 | [`v1.1 §5.3 L631`](../dsh-nano-local-sandbox-v1.1.md#L631)、[`§5.5 L703`](../dsh-nano-local-sandbox-v1.1.md#L703)、[`§8.9 L1102`](../dsh-nano-local-sandbox-v1.1.md#L1102)、[`§8.11 L1147`](../dsh-nano-local-sandbox-v1.1.md#L1147)、[`§9.4 L1203`](../dsh-nano-local-sandbox-v1.1.md#L1203) | profile schema 草稿、S1–S16 spec、15 个待冻结合约单位、仓级门禁现状、DoD 建议。Q5/Q6/Q7 的草稿来源（**不是合同**）。 |
| 8 | [`dsh-nano-kitesurf/lib/nano-kite.js:31-38,48-115`](../../../../dsh-nano-kitesurf/lib/nano-kite.js#L31)；[`index.js:345-354`](../../../../dsh-nano-kitesurf/index.js#L345)、[`:357-406`](../../../../dsh-nano-kitesurf/index.js#L357)、[`:421-461`](../../../../dsh-nano-kitesurf/index.js#L421)、[`:522-523`](../../../../dsh-nano-kitesurf/index.js#L522)、[`:610-611`](../../../../dsh-nano-kitesurf/index.js#L610)、[`:913-961`](../../../../dsh-nano-kitesurf/index.js#L913) | 相位机 `createNanoKite` 是**单例闭包**（单 `phase/httpBase/mcpPort`）；`bringUp` / `sleepEngine` / `portReport` / 三处 `adopt()`/`degrade()` / `/recover` 全绑在这一个实例上。Q6 要提升为 per-instance 的对象。 |
| 9 | [`dsh-nano-kitesurf/lib/container-engine.js:18`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L18)、[`:88`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L88)、[`:132-168`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L132)、[`:178-309`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L178)；[`index.js:429`](../../../../dsh-nano-kitesurf/index.js#L429) | 单容器名常量、两处 `container` CLI 调用点（`spawnFn` 与 `execFile`）、端口探测与 adopt/repair 韧性、`ensure` 全流程。Q6「特权入口唯一 + 参数化」的对象。 |
| 10 | [`dsh-nano-terminal/lib/sessions.js:123`](../../../../dsh-nano-terminal/lib/sessions.js#L123)、[`:131`](../../../../dsh-nano-terminal/lib/sessions.js#L131)、[`:144`](../../../../dsh-nano-terminal/lib/sessions.js#L144)、[`:168`](../../../../dsh-nano-terminal/lib/sessions.js#L168)、[`:179-182`](../../../../dsh-nano-terminal/lib/sessions.js#L179)、[`:203-211`](../../../../dsh-nano-terminal/lib/sessions.js#L203) | `idleTimeoutMs=30min`、`Map` 注册表、`sessionId` / `owner`、`resolveCwd` 经 `ctx.sessions.get`、`sweep()` 空闲回收 —— **本仓已实现的 per-session + 空闲回收先例**。Q6 推荐 A 的正面依据。 |
| 11 | 安装版 `@deepseek-ai/dsh-sandbox-policy/README.md:61-63,79-85`；`@deepseek-ai/dsh/docs/subsystems/sandbox.md:65-71,85-87`；[`v0.9 §8B.6 L1908-1917`](../dsh-nano-local-sandbox-v0.9.md#L1908)、[`§8A.6 L1809-1813`](../dsh-nano-local-sandbox-v0.9.md#L1809)、[`§8C.5.2 L2063-2065`](../dsh-nano-local-sandbox-v0.9.md#L2063) | session mode 运行时可切且 per-session；`sessionId` 让 backend key per-session state；升级语义 A/B 待拍板；R3 结论「不广告 `sandbox_permissions`」；S3 `ctx.sandbox.confine` 固定 policy。Q6 的输入与边界。 |
| 12 | [`dsh-nano-kitesurf/runtime/mcp-bridge.mjs:163-254`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L163)、[`:256-272`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L256)；[`lib/skill.js:212`](../../../../dsh-nano-kitesurf/lib/skill.js#L212)、[`skills/kitesurf-cdp/SKILL.md:224`](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L224) | 13 个 `kitesurf_*` 工具由容器内桥应答，而技能正文写「6 个」却列 8 个名字 —— **同一契约两份表述**。Q7 的反例与「零别名」对象。 |
| 13 | [`dsh-nano-kitesurf/lib/diagnostics.js:41`](../../../../dsh-nano-kitesurf/lib/diagnostics.js#L41)、[`:72`](../../../../dsh-nano-kitesurf/lib/diagnostics.js#L72)、[`:171`](../../../../dsh-nano-kitesurf/lib/diagnostics.js#L171)、[`:187`](../../../../dsh-nano-kitesurf/lib/diagnostics.js#L187)；[`index.js:13`](../../../../dsh-nano-kitesurf/index.js#L13)、[`:208-236`](../../../../dsh-nano-kitesurf/index.js#L208)；[`v1.1 §2.9`](../dsh-nano-local-sandbox-v1.1.md#L312) | `ERROR_CATALOG` 一处定义 → `ERROR_STATUS` / diagnostics / 技能三处派生；代码抛出的 7 个 errorId 未收录（落默认 502）。Q7「error 枚举一份登记 + 补录」的依据。 |
| 14 | [`index.js:23-46`](../../../../dsh-nano-kitesurf/index.js#L23)、[`:600`](../../../../dsh-nano-kitesurf/index.js#L600)、[`:1111`](../../../../dsh-nano-kitesurf/index.js#L1111)；[`lib/route-table.js:1-315`](../../../../dsh-nano-kitesurf/lib/route-table.js#L1)；[`packages/dsh-host-route-guard/src/route-guard.js:150`](../../../../packages/dsh-host-route-guard/src/route-guard.js#L150)、[`:165-166`](../../../../packages/dsh-host-route-guard/src/route-guard.js#L165)、[`:224`](../../../../packages/dsh-host-route-guard/src/route-guard.js#L224)、[`:279`](../../../../packages/dsh-host-route-guard/src/route-guard.js#L279) | 24 个路由常量 + `registerRoutes` 唯一入口；guard 启动期 `no-request-rejection` fail-closed、每请求 `requestRejection`。Q7 的注册与鉴权基线。 |
| 15 | [`security/route-sensitivity.json:441,532`](../../../../security/route-sensitivity.json#L441)；三份台账中 `dsh-nano-terminal` **0 条**；[`scripts/route-scan.mjs:210-212`](../../../../scripts/route-scan.mjs#L210)、[`:222-229`](../../../../scripts/route-scan.mjs#L222) | `proc:kitesurf` 仍挂在 [DNK]（要删）；[DNT] 完全在台账链外；`expected 8 ... parsed 24` 使两门禁 `exit 1`；扫描器只覆盖 4 插件。Q7「台账一次性对齐」的对象（`v1.1 §8.11`）。 |
| 16 | [`dsh-nano-terminal/lib/mcp.js:6-78`](../../../../dsh-nano-terminal/lib/mcp.js#L6)、[`:96`](../../../../dsh-nano-terminal/lib/mcp.js#L96)；[`src/client/lanes.js:140`](../../../../dsh-nano-terminal/src/client/lanes.js#L140)；[`AGENTS.md:36-39`](../../../../AGENTS.md#L36) | 8 个 `term.session.*` 工具形状可复用；`attach.path` 双侧硬编 `/dsh-nano-terminal/stream`（须改 `attach.url`）；仓规不得侧载 / 单一真源 / 不得擅自扩约 / 不得过度仪式。Q7 的 [DNT] 面与治理约束。 |

---

### Q5 — profile manifest v1 与构建配方：版本真源如何收敛？
（**驱动真相：`T-O-1` + `T-O-3` + `T-O-5` + `T-O-9` + `T-O-10` + `T-O-12`** · 来源：`v1.1 §2.2 / §5.3 / §8.9`；`v0.9 §5.9.5 / §8C.6`；`AGENTS.md:37-38`）

- **影响范围**：`P-schema` / `profile-registry` / `build-recipe` / `profiles/kitesurf/` 四个合约单位；`package.json files` 与 `AGENTS.md` 交付物表；`createArgs` 的参数化；`KITESURF_CHECKOUT` / `config.checkout` / lock 回执 / 全局 state 目录的退役；后续 **Q6 / Q7 及所有 driver 类 executional 题**的输入。
- **为什么必须确认**：`T-O-3` / `T-O-12` 把「构建与 `scope`」定到 profile，但**版本真源目前分散在至少四处**：[`Dockerfile:10,16,32-36`](../../../../dsh-nano-kitesurf/runtime/Dockerfile#L10)、[`runtime/linux-prefix/package.json`](../../../../dsh-nano-kitesurf/runtime/linux-prefix/package.json)（且是 `^0.42.0` / `^4.161.0` caret 范围）、外部 `KITESURF_CHECKOUT`（[`lib/container-engine.js:60-71`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L60)）、`wrangler.jsonc` + `--persist-to`（[`entrypoint.sh:23-34`](../../../../dsh-nano-kitesurf/runtime/entrypoint.sh#L23)）；外加 [`index.js:413`](../../../../dsh-nano-kitesurf/index.js#L413) 的 `config > env > persistedCheckout()` **三级真源**与 [`index.js:133-144`](../../../../dsh-nano-kitesurf/index.js#L133) 的 lock 回执。`v0.9 §8C.6 L2116-2127` 要求「锁精确版本 / 校验 SHA256 / 失败关闭 / 记录安装内容」，现状全部不满足。不冻结 manifest 字段，Q6 的 instance 没有 `profileVersion` / digest 可绑，Q7 的 `artifacts` 没有真源，`T-O-10` 的硬切删除清单也无从验收。
- **当前建议 / 倾向**（`DNLS01 架构 agent`）：**选 A** —— `profiles/kitesurf/profile.yaml` 一份权威、必填字段无默认、精确版本 pin + digest + SHA256 失败关闭、构建配方归入 profile、`container machine` 禁用、pin 官方稳定版；**彻底退役 `KITESURF_CHECKOUT` / `config.checkout` / `nano-kitesurf.lock.json` / 全局 state 目录**，不留兼容键。
- **Reasoning**：① `T-O-10` 单一真源 + 硬切：分散真源与三级 checkout 优先正是「双写」的典型，必须收敛；② `T-O-12` 已把 `scope` 定为必填字段，manifest 自然成为其余必填字段的宿主；③ `T-O-5` 让 `v0.9 §8C.6` 的脚本契约可直接继承，无需重新论证；④ `T-O-1` 要求 backend 抽象按两种实现设计，manifest 的 `platform` 字段未来加 `win32/x86_64` 不应改动 L2 契约；⑤ `T-O-9` 特权唯一要求 `spawn('container')` 只在 `backend-apple`，构建配方必须随 profile 走而不能留在消费者；⑥ 本机 `container CLI c05a560 (debug)` 不是发布基线，`v0.9 §5.9.1` 已记稳定版 1.7.1。
- **问题（请 [业主] 裁决）**：**你是否确认：`profiles/kitesurf/profile.yaml` 作为唯一权威 manifest（必填字段含 `scope: session`、精确版本 pin、`checkout.ref` immutable commit、`build.digest` sha256、`runtime/isolation/policyMapping/capabilities/health`），构建配方归入 profile 且 SHA256 校验失败即拒绝、禁用 `container machine`、pin 官方稳定版；并彻底退役 `KITESURF_CHECKOUT` / `config.checkout` / `nano-kitesurf.lock.json` / 全局 `~/.dsh-kitesurf-state`，不留任何兼容键或回退路径？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 已冻结为 T-O-13`（[业主] 2026-11-14：同意第 3 轮全部推荐）

**【对本问题的解读】**

1. 本问冻结的是 **「profile 是什么数据」**，不是「怎么建容器」。`T-O-12` 已定 `scope` 必填；本问把其余必填字段、版本 pin 的形状、构建配方的归属一并钉死，使 `profileVersion` / `digest` 成为 Q6/Q7 可引用的稳定标识。
2. **「精确 pin」针对的是 caret 范围**：`linux-prefix/package.json` 的 `^0.42.0` / `^4.161.0` 会在不同时间解析出不同版本，与 `v0.9 §8C.6`「锁精确版本」直接冲突；`checkout.ref` 同理必须指向 immutable commit 而非目录路径。
3. **「失败关闭」是可验收的**：digest / SHA256 / `packages/engine/wrangler.jsonc` 存在性任一校验失败即拒绝构建，不降级、不用 `latest`、不 `curl \| sh`（[`lib/container-engine.js:60-71`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L60) 已有「缺失即 400」的雏形，可提升）。
4. **退役对象与兼容无关**：`KITESURF_CHECKOUT` / `config.checkout` / lock 回执是 [DNK] 的宿主全局配置与恢复读源，按 `T-O-10` 属于硬切删除清单；保留它们等于保留第二份真源（`T-O-8` 明确拒绝）。
5. **`container machine` 是安全禁令不是偏好**：`v0.9 §5.9.5 L993-1011` 登记了五条反隔离行为（自动 rw 挂 `$HOME`、转发 `SSH_AUTH_SOCK`、`--cap-add ALL`、免密 sudo、自带 `/sbin/init`），必须写进 profile 静态校验，不能靠文档提醒。
6. **`platform` 字段是 NVX 后置的接口预留**：`T-O-1` 不要求首期实现 NVX，但 manifest 不能把 `darwin/arm64` 写死成唯一取值 —— 这是「平台保持中立」在字段层的体现。

**【可选选项清单】**

| 选项 | 内容 | 优点 | 缺点 / 反例 | 结论 |
|---|---|---|---|---|
| **A** | **manifest 单一真源 + 精确 pin + SHA256 失败关闭 + 构建配方归 profile + 旧配置键彻底退役** | 单一真源可审计；`profileVersion`/digest 可绑；符合 `T-O-10`/`T-O-8`/`v0.9 §8C.6`；NVX 后置只加 `platform` 取值 | 需重写 `createArgs` 参数化与 `checkoutPath`；构建期校验要新增 | **推荐** |
| **B** | **沿用分散真源，只加一个薄 manifest 做索引** | 改动最小 | 双写：`Dockerfile` / `linux-prefix` / checkout / `wrangler.jsonc` 仍是四份真源，manifest 只是第五份表述；违反 `T-O-10` 与 [`AGENTS.md:37`](../../../../AGENTS.md#L37)；是 `T-O-8` 要拒绝的 hotfix | 不推荐 |
| **C** | **manifest + 保留旧配置键兼容一个版本** | 过渡平滑 | 违反 `T-O-8`「能彻底退役就不要提供兼容」；[`index.js:413`](../../../../dsh-nano-kitesurf/index.js#L413) 的三级优先会与 manifest 形成两套解析路径 | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **冻结必填字段（无默认值，缺一即拒绝加载）**：`id` / `version` / `platform[]`（首期 `darwin/arm64`）/ `backend` / `scope`（`T-O-12` 必填，首期 `session`）/ `build{base, npmPrefix{agent-browser, wrangler} 精确版本, checkout{ref, verify}, digest}` / `runtime{user, entrypoint, services[{id, port, command}], state{kv}, isolation{mounts, network, resources}}` / `policyMapping{read-only, workspace-write, danger-full-access}` / `capabilities{drivers, tools}` / `health{engine, bridge, selftest}`。
2. **构建配方归入 `profiles/kitesurf/`**：`Dockerfile` + `entrypoint.sh` + `linux-prefix` 生成命令（`npm install --os=linux --cpu=arm64 --ignore-scripts`）；[`Dockerfile:1-9`](../../../../dsh-nano-kitesurf/runtime/Dockerfile#L1) 的 Alpine `__res_init` 实测约束作为注释保留；[`entrypoint.sh:10-12`](../../../../dsh-nano-kitesurf/runtime/entrypoint.sh#L10) 的 bridge 监督循环与 `:32-34` 的 `--persist-to` 随 profile 走。
3. **失败关闭**：`profile-registry` 加载时校验 `digest` / SHA256 / `checkout.ref` 存在性 / `wrangler.jsonc`；任一失败即拒绝该 profile，**不降级到旧路径、不使用 `latest`、不 `curl \| sh`**（`v0.9 §8C.6 L2116-2127`）。
4. **硬切退役清单（`file:line`）**：`KITESURF_CHECKOUT`（[`lib/container-engine.js:60-71`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L60)）、`config.checkout`（[`index.js:413`](../../../../dsh-nano-kitesurf/index.js#L413)）、`persistedCheckout` 回执（[`index.js:116,133-144`](../../../../dsh-nano-kitesurf/index.js#L116)）、全局 `~/.dsh-kitesurf-state`（[`lib/container-engine.js:329-331`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L329)，改 per-instance `stateVolume`，`T-O-12`）、`nano-kitesurf.lock.json`。**零兼容键、零回退路径。**
5. **安全禁令入静态校验**：`container machine` 禁用（`v0.9 §5.9.5`）；只允许 `container run` / `exec`；`USER node`、loopback 发布、checkout 只读挂载、`state` 可写卷按 profile `isolation` 生成，`createArgs`（[`lib/container-engine.js:38-53`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L38)）全部参数化，容器名不再用模块级常量（`:18`）。
6. **稳定版 pin**：`container` 运行时版本写进 profile 的 `build.base`/前置校验；本机 `c05a560 (debug)` 只作开发实例，不作发布基线；`v0.9 §5.9.1` 记官方稳定版 1.7.1。
7. **验收口径**：`profile.list/describe` 返回字段齐备且 `scope: session`；改动任一版本 pin → digest 变化且重建被拒；全仓 grep 无 `KITESURF_CHECKOUT` / `config.checkout` / caret 版本；`npm pack --dry-run` 不含 `linux-prefix/` 运行时产物；`container machine` 静态校验失败即拒绝。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的现状证据（真源分散）**：[`Dockerfile:10,16,30,32-36,39`](../../../../dsh-nano-kitesurf/runtime/Dockerfile#L10)、[`runtime/linux-prefix/package.json`](../../../../dsh-nano-kitesurf/runtime/linux-prefix/package.json)（caret）、[`lib/container-engine.js:38-53,60-71,329-331`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L38)、[`index.js:116,133-144,413`](../../../../dsh-nano-kitesurf/index.js#L116)、[`entrypoint.sh:23-34`](../../../../dsh-nano-kitesurf/runtime/entrypoint.sh#L23)。
- **支持 A 的可继承依据（`T-O-5`）**：[`v0.9 §8C.6 L2116-2127`](../dsh-nano-local-sandbox-v0.9.md#L2116) 脚本契约四要求；[`§5.9.5 L993-1011`](../dsh-nano-local-sandbox-v0.9.md#L993) `container machine` 禁令；[`§5.9.1`](../dsh-nano-local-sandbox-v0.9.md#L929) 稳定版 1.7.1；[`v1.1 §5.3 L631`](../dsh-nano-local-sandbox-v1.1.md#L631) schema 草稿、[`§8.9 L1102`](../dsh-nano-local-sandbox-v1.1.md#L1102) 合约单位。
- **支持 A 的治理证据**：[`AGENTS.md:37`](../../../../AGENTS.md#L37) 单一真源、[`:38`](../../../../AGENTS.md#L38) 不得擅自扩约；`T-O-3`（构建归 [DNLS]）、`T-O-9`（特权唯一 / backend 抽象）、`T-O-10`（硬切 / 别名退役）、`T-O-12`（`scope` 必填 / per-instance state）、`T-O-1`（NVX 后置但抽象要留）。
- **反例 B（薄索引）**：`lib/skill.js:212` 写「6 个」却列 8 个、实际 13 个 —— 已经证明「真源 + 索引」两份表述必然漂移；[`AGENTS.md:37`](../../../../AGENTS.md#L37) 只允许一份 durable、可写、可被 runtime 当权威读取的副本。
- **反例 C（保留兼容键）**：[`index.js:413`](../../../../dsh-nano-kitesurf/index.js#L413) 的 `config > env > persistedCheckout()` 三级优先本身就是「三份真源」的现成反例；`T-O-8` 明确「能彻底退役就不要提供兼容」。
- **debug build 实证**：本机 `container --version` = `c05a560 (build: debug)`，不能作为发布基线 —— 支持「pin 官方稳定版」。

---

### Q6 — instance registry 与 `policyFingerprint`：策略切换与生命周期如何执行？
（**驱动真相：`T-O-2` + `T-O-6` + `T-O-9` + `T-O-10` + `T-O-12`** · 来源：安装版 `sandbox-policy/README.md:61-63,79-85`、`sandbox.md:65-71`；`v0.9 §8A.6 / §8B.6 / §8C.5.2`；`v1.1 §5.4`；[DNT] `lib/sessions.js`）

- **影响范围**：`instance-registry` / `policy-adapter` / `state-service` / `cdp-driver`；`instance.ensure/start/stop/restart/status` MCP 工具；`endpoints` 动态返回；[DNK] UI 的 session 绑定；资源水位与空闲回收；`spawn('container')` 的唯一落点；后续全部 driver 类 executional 题。
- **为什么必须确认**：`T-O-12` 定了 `scope=session` 与四元组 fingerprint，但**没定策略切换时到底怎么做**。[`v0.9 §8B.6 L1908-1917`](../dsh-nano-local-sandbox-v0.9.md#L1908) 的升级语义 A/B 在新方向下仍未关闭；[`v1.1 §5.4 L701`](../dsh-nano-local-sandbox-v1.1.md#L701) 明写 R3 是「契约形状」冲突；安装版 `sandbox-policy/README.md:61-63` 允许 session 运行时切 mode，而容器挂载创建时固定。同时 [DNK] 的相位机（[`lib/nano-kite.js:31-128`](../../../../dsh-nano-kitesurf/lib/nano-kite.js#L31)）、`bringUp`（[`index.js:357-400`](../../../../dsh-nano-kitesurf/index.js#L357)）、端口韧性（[`lib/container-engine.js:178-309`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L178)）、`portReport`（[`index.js:421-461`](../../../../dsh-nano-kitesurf/index.js#L421)）、`/recover`（[`:913-961`](../../../../dsh-nano-kitesurf/index.js#L913)）全是**单例**实现，必须提升为 per-instance 且保留 `adopt`/`degrade` 语义。不冻结，Q5 的 `digest` 与 Q7 的 `endpoints` 都没有落点。
- **当前建议 / 倾向**（`DNLS01 架构 agent`）：**选 A** —— `instanceId` 绑定 `sessionId`、`ensure` 幂等、四元组 `policyFingerprint` 写入记录、`sandbox/mode` 切换返回 `policy-stale` 并由上层显式 `recreate`（**不广告 `sandbox_permissions`**）、相位机 + adopt/degrade 提升为 per-instance、按需创建 + `idleTimeoutMs` 空闲回收 + `maxInstances` 上限、`endpoints` 动态返回、`spawn('container')` 只在 `backend-apple` 且构建步骤经 S3 `ctx.sandbox.confine`。
- **Reasoning**：① `v0.9 §8A.6 L1809-1813` 已给出 R3 的正确处置「不广告 `sandbox_permissions`，把升级建模为换一个更宽的 VM」，`T-O-6` 也定死三档不扩约 —— `policy-stale` + 显式 `recreate` 是唯一自洽映射；② 「原地热改挂载」（选项 B）在容器创建时固定的前提下做不到，是假承诺 = hotfix；③ [DNT] `lib/sessions.js:123,131,203-211` 已实现 per-session `Map` + 30min 空闲 sweep，证明按需创建 / 回收在本仓可行；④ `T-O-9` 特权唯一要求把两处 `container` CLI 调用（[`lib/container-engine.js:88`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L88)、[`index.js:429`](../../../../dsh-nano-kitesurf/index.js#L429)）收敛到 `backend-apple` 一个模块；⑤ `T-O-10` 硬切三段时序仍是前置，本问不改变它。
- **问题（请 [业主] 裁决）**：**你是否确认：`instanceId` 绑定 `sessionId`、`ensure` 幂等、`policyFingerprint = hash(sessionId, mode, workspaceRoot, extraRoots)` 写入记录；`sandbox/mode` 切换导致 fingerprint 不等时返回 `policy-stale`（附期望值）并由上层显式 `recreate`，不广告 `sandbox_permissions`、不实现运行时原地改挂载；相位机与 `adopt`/`degrade` 提升为 per-instance，`endpoints` 由 registry 动态返回；按需创建 + `idleTimeoutMs` 空闲回收 + `maxInstances` 资源上限由 profile 声明；`spawn('container')` 只在 `backend-apple`，构建步骤经 `ctx.sandbox.confine` 固定 policy？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 已冻结为 T-O-14`（[业主] 2026-11-14：同意第 3 轮全部推荐）

**【对本问题的解读】**

1. 本问冻结的是 **`T-O-12` 的执行语义**：四元组怎么算、策略变化怎么响应、实例怎么创建/复用/回收、端点怎么给出去。「scope=session」是方向，本问是落地。
2. **`policy-stale` 不是错误隐藏，是显式合同**：返回一个带 `expectedFingerprint` 的业务错误（进 Q7 的 `sandbox_*` error 目录），由上层决定是否 `recreate`；这与 `v0.9 §8B.6` 选项 B「换一个更宽的 VM」同构，但避免了「同调用重试」的语义错配。
3. **「不广告 `sandbox_permissions`」是 `T-O-6` 的延伸**：`SandboxMode` 仍三档，[DNLS] 不注册 `SandboxProvider`、不扩成四档、不改写 [dsh] 的 `ESCALATION_TARGETS`（`v0.9 §8A.6 L1811`）。
4. **`adopt`/`degrade` 的语义要保留**：宿主重启后 `/health` 已活但内存相位是 `idle` → `adopt`；引擎死在底下 → `degrade`（[`index.js:522-523,610-611,926-927`](../../../../dsh-nano-kitesurf/index.js#L522) 三处调用）。这两条是 [DNK] 用实测换来的相位校准，不能因提升为 per-instance 而丢掉。
5. **资源治理 ≠ 降级 `shared`**：`T-O-12` 已拒绝用共享单例规避 4 GB / 实例；本问用「按需创建 + 空闲回收 + `maxInstances`」在 **session 粒度内** 治理，不改变粒度。
6. **`endpoints` 动态返回是 `T-O-11` 的前提**：UI / 宿主侧直连靠它取 CDP / HTTP 地址；硬编端口（[`lib/container-engine.js:40-41`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L38)）必须一并参数化。

**【可选选项清单】**

| 选项 | 内容 | 优点 | 缺点 / 反例 | 结论 |
|---|---|---|---|---|
| **A** | **fingerprint 驱动 + `policy-stale`/`recreate` + 按需创建与空闲回收 + 特权入口唯一** | 与 `T-O-12` / `T-O-6` / `v0.9 §8A.6` 一致；可审计；有本仓 per-session 先例；不改 [dsh] 合同 | 切 mode 需重建实例（冷启动代价）；`maxInstances` / `idleTimeoutMs` 需按实测调参 | **推荐** |
| **B** | **运行时原地改挂载**以即时兑现 mode 切换 | 看似无需重建 | 容器挂载创建时固定（[`v1.1 §5.4 L701`](../dsh-nano-local-sandbox-v1.1.md#L701) R3）；Apple container 无热改挂载能力；是「做不到的承诺」= hotfix，违反 `T-O-8` | 不推荐 |
| **C** | **不记 fingerprint**，每次调用重新 `resolve` 比对 | 实现最简 | 无审计轨迹、并发下会漂移；`v0.9 §8A.2 L1742-1753` 要求四字段可验证；违反 [`AGENTS.md:37`](../../../../AGENTS.md#L37) 单一真源 | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **instance 记录字段**：`instanceId` / `profileId + profileVersion`（Q5 的 digest）/ `scope` / `sessionId?` / `phase` / `policyFingerprint` / `endpoints{cdp, mcp, engine, terminal}` / `stateVolume` / `artifacts{digest, buildAt, pins}` / `audit` / `createdAt, lastAttach, idleTimeoutMs`。
2. **`ensure(profileId, sessionId, policy)` 幂等**：先算 fingerprint；命中即复用同一实例；未命中按 Q5 的 profile 创建；**绝不静默复用不同 policy 的实例**；`instance.status` 返回全部字段。
3. **策略切换**：`sandbox/mode` 事件（安装版 `sandbox-policy/README.md:61-63`）→ 计算新 fingerprint → 与记录不等则 `policy-stale`（明确 errorId + `expectedFingerprint`），上层显式 `recreate`；**不广告 `sandbox_permissions`**、不实现 `SandboxProvider`、不扩 `SandboxMode`（`T-O-6`）。
4. **生命周期提升**：`phase` 机（[`lib/nano-kite.js:31-38,48-115`](../../../../dsh-nano-kitesurf/lib/nano-kite.js#L31)）由单例闭包改为 per-instance；`adopt`/`degrade`（[`index.js:522-523,610-611,926-927`](../../../../dsh-nano-kitesurf/index.js#L522)）保留语义；`bringUp`（[`:357-400`](../../../../dsh-nano-kitesurf/index.js#L357)）、`sleepEngine`（[`:401-406`](../../../../dsh-nano-kitesurf/index.js#L401)）、端口韧性（[`lib/container-engine.js:132-168,178-309`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L132)）参数化，容器名不再硬编（[`:18`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L18)）。
5. **回收与资源**：`sweep` 照 [DNT] [`lib/sessions.js:123,203-211`](../../../../dsh-nano-terminal/lib/sessions.js#L123)（默认 30min 无 attach 即关）；`maxInstances` / memory / cpus 由 Q5 的 profile `isolation.resources` 声明；session 结束时 `stateVolume` 按 retention 策略处理，**不跨实例**（`T-O-12`）。
6. **特权入口唯一**：`spawn('container')` 只出现在 `backend-apple`；硬切删除 [DNK] 的两处（[`lib/container-engine.js:88`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L88)、[`index.js:429`](../../../../dsh-nano-kitesurf/index.js#L429)）；构建步骤经 `ctx.sandbox.confine(argv, fixedPolicy)`（S3，`v0.9 §8C.5.2 L2063-2065`）或 per-call 批准提权，**不留静默 S2**、不绕过 `v0.9 §8.8 L1718` 一票否决。
7. **验收口径**：两个 session 的 `workspaceRoot` / `mode` 不同 → 不同实例、挂载矩阵不同、互不串味；某 session 切 mode → `policy-stale` 且不影响其他实例；空闲实例被回收；`instance.status` 返回动态 endpoints 且无硬编端口；全仓 `container` CLI 只在 `backend-apple`；`T-O-10` 三段时序不因本问改变。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的平台与可继承依据**：安装版 `sandbox-policy/README.md:61-63,79-85`、`sandbox.md:65-71,85-87`；[`v0.9 §8A.6 L1809-1813`](../dsh-nano-local-sandbox-v0.9.md#L1809)（R3 不广告 `sandbox_permissions`）、[`§8B.6 L1908-1917`](../dsh-nano-local-sandbox-v0.9.md#L1908)（升级语义 A/B）、[`§8C.5.2 L2063-2065`](../dsh-nano-local-sandbox-v0.9.md#L2063)（S3 固定 policy）；[`v1.1 §5.4 L687-702`](../dsh-nano-local-sandbox-v1.1.md#L687)（instance 草稿 + R3 冲突登记）。
- **支持 A 的 [DNK] 单例证据（提升对象）**：[`lib/nano-kite.js:31-38`](../../../../dsh-nano-kitesurf/lib/nano-kite.js#L31)、[`index.js:345-354,357-406,421-461,522-523,610-611,913-961`](../../../../dsh-nano-kitesurf/index.js#L345)、[`lib/container-engine.js:18,88,178-309`](../../../../dsh-nano-kitesurf/lib/container-engine.js#L18)。
- **支持 A 的 [DNT] 正面先例**：[`lib/sessions.js:123`](../../../../dsh-nano-terminal/lib/sessions.js#L123) `idleTimeoutMs=30min`、[`:131`](../../../../dsh-nano-terminal/lib/sessions.js#L131) `Map`、[`:144`](../../../../dsh-nano-terminal/lib/sessions.js#L144) `sessionId`、[`:168`](../../../../dsh-nano-terminal/lib/sessions.js#L168) `owner`、[`:179-182`](../../../../dsh-nano-terminal/lib/sessions.js#L179) `resolveCwd`、[`:203-211`](../../../../dsh-nano-terminal/lib/sessions.js#L203) `sweep()`。
- **反例 B（原地热改挂载）**：[`v1.1 §5.4 L701`](../dsh-nano-local-sandbox-v1.1.md#L701) 明写 R3 是契约形状冲突；`v0.9 §8B.6` 明写「两个运行时的策略都在**创建时固定**」；Apple container 的 bind mount 无热改能力。
- **反例 C（不记 fingerprint）**：`v0.9 §8A.2 L1742-1753` 要求审计四字段可验证；[`AGENTS.md:37`](../../../../AGENTS.md#L37) 单一真源；无 fingerprint 会让「同一次 ensure 到底复用了哪个策略」不可回溯。
- **治理证据**：`T-O-2`（特权唯一）、`T-O-6`（三档不扩约）、`T-O-9`（policy 只读 / S3）、`T-O-10`（硬切 / 不双写）、`T-O-12`（session 粒度）。

---

### Q7 — 四个 L2 契约面与错误 / 台账：如何做到「只有一份」？
（**驱动真相：`T-O-7` + `T-O-8` + `T-O-9` + `T-O-10` + `T-O-11`** · 来源：`v1.1 §2.9 / §3.4 / §8.11 / §8.9`；`AGENTS.md:36-39`；`runtime/mcp-bridge.mjs` / `lib/diagnostics.js` / `security/*` / `scripts/route-scan.mjs`）

- **影响范围**：`mcp-server`（`sandbox_*` 工具族）/ `http-routes` / `cdp-driver` / `terminal-driver` 四面的命名与清单；`ERROR_CATALOG` 与 7 个未收录 id；`lib/route-table.js` / guard / 三份 `security/*` / `scripts/route-scan.mjs`；`lib/skill.js` 与 `skills/*/SKILL.md` 单一真源；[DNT] 的 8 个 `term.session.*` 与 `attach.url`；后续全部 executional 题（CDP keeper / terminal 细节留给 Round 4+）。
- **为什么必须确认**：`T-O-11` 定了「两面共用一份契约与 error 目录、零别名」，但**现状的契约本身就是分裂的**：[`runtime/mcp-bridge.mjs:163-254`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L163) 有 13 个 `kitesurf_*`，而 [`lib/skill.js:212`](../../../../dsh-nano-kitesurf/lib/skill.js#L212) / [`skills/kitesurf-cdp/SKILL.md:224`](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L224) 写「6 个」却列 8 个；[`lib/diagnostics.js:41-72`](../../../../dsh-nano-kitesurf/lib/diagnostics.js#L41) 的 `ERROR_CATALOG` 有 7 个代码里抛出的 errorId 未收录（落默认 502，`v1.1 §2.9`）；[`index.js:23-46`](../../../../dsh-nano-kitesurf/index.js#L23) 有 24 个路由常量、`lib/route-table.js` 315 行，而 [`scripts/route-scan.mjs:210-212`](../../../../scripts/route-scan.mjs#L210) 把 8 个常量烤死导致两门禁 `exit 1`、[`:222-229`](../../../../scripts/route-scan.mjs#L222) 只扫 4 个插件、[DNT] 在三份安全台账中 **0 条**。不冻结「一面一清单 + 一份 error 目录 + 一次台账对齐」，Q5/Q6 的产物会各自长出第二份表述。
- **当前建议 / 倾向**（`DNLS01 架构 agent`）：**选 A** —— 四个 L2 面各冻结一份工具 / 路由清单；13 个 `kitesurf_*` → `sandbox_*` 工具族且**零别名**；`ERROR_CATALOG` 一份真源并补录 7 个 id（按 [`AGENTS.md:38`](../../../../AGENTS.md#L38) 已由 Q7 冻结登记为公共合同变更）；`http-routes` 全部经 `registerRoutes` + `requestRejection`；`cdp-driver` / `terminal-driver` 本轮只冻结「socket 由 [DNLS] 持有 / `attach` 由 server 显式返回 `attach.url`」两条原则；三份安全台账 + `route-scan.mjs` 一次性对齐；`kitesurf_*` / `/nano-kitesurf/*` / `proc:kitesurf` 零残留。
- **Reasoning**：① `T-O-11` 已把「契约只有一份」定死，四面各维护一份 error 表（选项 C）直接违规；② `T-O-10` 要求别名与台账一次性退役，保留 `kitesurf_*` 过渡（选项 B）违反 `T-O-8`；③ [`AGENTS.md:38`](../../../../AGENTS.md#L38) 逐字点名「error 枚举、idempotency 法则、客户端 retry 义务、新 lane、新凭证面」须 [业主] durable 决定，因此本问把「补录哪 7 个 id / `sandbox_*` 工具清单」作为**待登记内容**而非由实现反推；④ `T-O-9` 特权唯一要求 `registerRoutes`（[`packages/dsh-host-route-guard/src/route-guard.js:279`](../../../../packages/dsh-host-route-guard/src/route-guard.js#L279)）成为唯一注册入口，WS upgrade 也必须有等价准入（[DNT] 当前缺口）；⑤ 倒挂消失：现状 [DNK] 宿主把快照 POST 给容器内 bridge 再由 `kitesurf_*` 应答（`v1.1 §3.3`），收归后状态与工具同在 L1，无需外部推送。
- **问题（请 [业主] 裁决）**：**你是否确认：四个 L2 面各冻结一份清单、`kitesurf_*` → `sandbox_*` 且零别名、`ERROR_CATALOG` 一份真源并补录 7 个未收录 errorId（作为公共合同变更由您登记）、`http-routes` 全部经 `registerRoutes` + `requestRejection`、CDP socket 归 [DNLS] 持有且 `attach` 由 server 返回 `attach.url`、三份安全台账与 `route-scan.mjs` 一次性对齐并覆盖 [DNLS]/[DNT]、`kitesurf_*` / `/nano-kitesurf/*` / `proc:kitesurf` 全仓零残留？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 已冻结为 T-O-15`（[业主] 2026-11-14：同意第 3 轮全部推荐）

**【对本问题的解读】**

1. 本问冻结的是 **「一份契约」的可验收形态**：工具清单、路由清单、error 目录、台账行各只有一处定义，其余全部是生成物 / 派生（[`AGENTS.md:37`](../../../../AGENTS.md#L37)）。
2. **「零别名」是 `T-O-10` 的直接推论**：`kitesurf_*` 13 工具、`/nano-kitesurf/*` 24 路由、`KITESURF_CHECKOUT`、`proc:kitesurf` 都是旧所有权的名字，留任一即留第二份真源。
3. **error 枚举补录是「扩约」不是「修 bug」**：7 个 id 落默认 502 与 [`dsh-nano-kitesurf/AGENTS.md:116`](../../../../dsh-nano-kitesurf/AGENTS.md#L116)「输入类 400」承诺不符；按 [`AGENTS.md:38`](../../../../AGENTS.md#L38)，新增 / 修改 error 枚举须 [业主] durable 决定，本 QNA 只列出清单、不由实现反推。
4. **本轮只冻结原则，不冻结帧细节**：CDP socket keeper 的具体保活语义、`term.session.*` 的逐参数 schema、`dnt-ws-v1` 的 `0x09` ping 缺陷（[`dsh-nano-terminal/index.js:65-68`](../../../../dsh-nano-terminal/index.js#L65)）、`sandbox_*` 每个工具的 inputSchema，均留 Round 4+ 的 executional 题；本轮只定「谁持有」「地址怎么给」。
5. **`sessionBinding: true` 是 `T-O-12` 在台账层的落地**：当前三份台账 35 处 `false`，[DNLS] 路由必须显式声明 session 语义（虽 guard 运行时不强制，但台账是审计真源）。
6. **门禁修复属「实施前硬前置」**：两门禁当前 `exit 1`（`v1.1 §8.11 L1147`），若不一次性对齐，Q5/Q6 的产物无法通过任何回归验证 —— 但按 [`AGENTS.md:39`](../../../../AGENTS.md#L39)「不得过度仪式」，本问只要求恢复既有门禁，不新增 release-gate。

**【可选选项清单】**

| 选项 | 内容 | 优点 | 缺点 / 反例 | 结论 |
|---|---|---|---|---|
| **A** | **一面一清单 + `sandbox_*` 零别名 + error 目录一份登记 + guard 统一 + 台账一次对齐** | 与 `T-O-11`/`T-O-10`/`T-O-7` 完全一致；可静态验收；倒挂消失 | 需重写 13 工具、24 路由、技能正文、三份台账与扫描器；改动面最大 | **推荐** |
| **B** | **保留 `kitesurf_*` 别名过渡一个版本** | 模型侧短期无感 | 违反 `T-O-8`「能彻底退役就不要提供兼容」与 `T-O-10`；`lib/route-table.js` 与三份台账要同时维护新+旧两套；`scripts/route-scan.mjs` 的 8-vs-24 漂移被制度化 | 不推荐 |
| **C** | **四个 L2 面各自维护一份 error / 工具表** | 各面自治 | 直接违反 `T-O-11` 单一契约面与 [`AGENTS.md:37`](../../../../AGENTS.md#L37)；`lib/skill.js:212` 的 6/8/13 漂移会被制度化 | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **`mcp-server` 工具清单（`sandbox_*`，零别名）**：`sandbox.profile.list/describe`、`sandbox.instance.ensure/start/stop/restart/status`、`sandbox.diagnostics`、`sandbox.console`、`sandbox.operations`、`sandbox.error_catalog`、`sandbox.targets`、`sandbox.history`、`sandbox.dom`、`sandbox.elements`、`sandbox.selftest`、`sandbox.network`、`sandbox.ports`、`sandbox.recovery_plan`、`sandbox.bridge_health`，取代 [`mcp-bridge.mjs:163-254`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L163) 的 13 个 `kitesurf_*`；`tools/list` 由 server 一处生成；`answerNativeTool`（[`:272`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L272)）从「读宿主推来的快照」改为「L1 直接读自身状态」（消除 `v1.1 §3.3` 倒挂）。`agent_browser_*` 33 工具保留为 CDP profile 驱动。
2. **`http-routes` 清单与注册**：`/nano-local-sandbox/*` 路径清单；`lib/route-table.js` 由 `security/route-sensitivity.json` 构建期生成（`packages/dsh-host-route-guard/AGENTS.md:20-24`）；全部经 `registerRoutes`（[`route-guard.js:279`](../../../../packages/dsh-host-route-guard/src/route-guard.js#L279)），启动期 `no-request-rejection` fail-closed（[`:165-166`](../../../../packages/dsh-host-route-guard/src/route-guard.js#L165)）、每请求 `requestRejection`（[`:224`](../../../../packages/dsh-host-route-guard/src/route-guard.js#L224)）；WS upgrade 补等价准入（[DNT] 当前缺口）；`sessionBinding: true`（`T-O-12`）。
3. **`cdp-driver` / `terminal-driver` 本轮只冻结两条原则**：CDP socket 由 [DNLS] 持有（不留在消费者内存单例 [`lib/engine.js:207`](../../../../dsh-nano-kitesurf/lib/engine.js#L207)）；`attach` 由 server 显式返回 `attach.url`，取代 [`dsh-nano-terminal/lib/mcp.js:96`](../../../../dsh-nano-terminal/lib/mcp.js#L96) / [`src/client/lanes.js:140`](../../../../dsh-nano-terminal/src/client/lanes.js#L140) 双侧硬编 `/dsh-nano-terminal/stream`。`term.session.*` 8 工具形状（[`lib/mcp.js:6-78`](../../../../dsh-nano-terminal/lib/mcp.js#L6)）可复用，参数细目留 Round 4+。
4. **`ERROR_CATALOG` 一份真源 + 补录 7 个 id**：真源 [`lib/diagnostics.js:41`](../../../../dsh-nano-kitesurf/lib/diagnostics.js#L41) → `ERROR_STATUS`（[`:72`](../../../../dsh-nano-kitesurf/lib/diagnostics.js#L72)）/ diagnostics 注入（[`:187`](../../../../dsh-nano-kitesurf/lib/diagnostics.js#L187)）/ [`index.js:214`](../../../../dsh-nano-kitesurf/index.js#L214) `statusOf_error` / `lib/skill.js` 技能注入，四处派生逐字符校验。补录清单：`kitesurf.shot.fit`（`index.js:665`）、`kitesurf.shot.empty`（`lib/engine.js:921`）、`kitesurf.history.body`（`index.js:997`）、`kitesurf.network.query`（`index.js:1077`）、`kitesurf.dom.empty/blank`（`lib/engine.js:1171,1175`）、`kitesurf.elements.empty`（`lib/engine.js:1193`）—— **按 [`AGENTS.md:38`](../../../../AGENTS.md#L38) 已由 Q7 冻结 + 本 QNA 冻结完成 error 枚举变更的 durable 登记**（见 §1 收口修订注记 R-2/R-3）。
5. **台账与门禁一次性对齐（`T-O-10`）**：删除 `security/route-sensitivity.json` 的 `proc:kitesurf` 行（[`:441`](../../../../security/route-sensitivity.json#L441)、[`:532`](../../../../security/route-sensitivity.json#L532)）与全部 `/nano-kitesurf/*` 行；修 [`scripts/route-scan.mjs:210-212`](../../../../scripts/route-scan.mjs#L210) 的 8-vs-24 硬编码、[`:222-229`](../../../../scripts/route-scan.mjs#L222) 扫描器加入 [DNLS]/[DNT]；[DNT] 端点入账（当前三份台账 0 条）；`feature-contract.json` / `route-inventory.md` 数字一致；两门禁恢复 `exit 0`。**不新增 release-gate**（[`AGENTS.md:39`](../../../../AGENTS.md#L39)）。
6. **不擅自扩约**：`sandbox_*` 工具面、error 枚举、幂等法则、retry 义务、[DNT] 新 `sandbox` lane 均按 [`AGENTS.md:38`](../../../../AGENTS.md#L38) 由 [业主] 在后续 executional 轮次逐项冻结；技能正文由 `lib/skill.js` 单一真源生成、`npm test` 逐字符校验（修正 `:212` 的 6/8/13 漂移）。
7. **验收口径**：`tools/list` 只含 `sandbox_*` + `agent_browser_*`、零 `kitesurf_*`；`ERROR_CATALOG` 覆盖全部代码抛出的 errorId 且四处派生一致；`kitesurf_*` / `/nano-kitesurf/*` / `proc:kitesurf` 全仓零残留；两门禁 `exit 0`；`sessionBinding: true`；技能真源与产物逐字符一致；`attach.url` 无硬编路径。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的契约分裂证据**：[`runtime/mcp-bridge.mjs:163-254,256-272`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L163)；[`lib/skill.js:212`](../../../../dsh-nano-kitesurf/lib/skill.js#L212) / [`skills/kitesurf-cdp/SKILL.md:224`](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L224)（6 vs 8 vs 13）；`v1.1 §2.9` 登记的 7 个未收录 errorId。
- **支持 A 的单一真源机制**：[`lib/diagnostics.js:41,72,171,187`](../../../../dsh-nano-kitesurf/lib/diagnostics.js#L41)、[`index.js:13,208-236`](../../../../dsh-nano-kitesurf/index.js#L13)；[`index.js:23-46,600,1111`](../../../../dsh-nano-kitesurf/index.js#L23)、[`lib/route-table.js:1-315`](../../../../dsh-nano-kitesurf/lib/route-table.js#L1)、[`route-guard.js:150,165-166,224,279`](../../../../packages/dsh-host-route-guard/src/route-guard.js#L150)。
- **支持 A 的台账 / 门禁证据**：[`security/route-sensitivity.json:441,532`](../../../../security/route-sensitivity.json#L441)、[DNT] 三份台账 0 条、[`scripts/route-scan.mjs:210-212,222-229`](../../../../scripts/route-scan.mjs#L210)、[`v1.1 §8.11 L1147`](../dsh-nano-local-sandbox-v1.1.md#L1147)。
- **支持 A 的 [DNT] 面**：[`lib/mcp.js:6-78,96`](../../../../dsh-nano-terminal/lib/mcp.js#L6)、[`src/client/lanes.js:140`](../../../../dsh-nano-terminal/src/client/lanes.js#L140)；`v1.1 §3.3` 记录的「宿主推快照给容器内桥」倒挂。
- **支持 A 的治理证据**：[`AGENTS.md:36`](../../../../AGENTS.md#L36) 不得侧载、[`:37`](../../../../AGENTS.md#L37) 单一真源、[`:38`](../../../../AGENTS.md#L38) 不得擅自扩约、[`:39`](../../../../AGENTS.md#L39) 不得过度仪式；`T-O-11`（单一契约面 / 别名退役）、`T-O-10`（台账一次对齐）、`T-O-9`（四 L2 面）、`T-O-8`（彻底退役）。
- **反例 B（别名过渡）**：`T-O-8` 明确拒绝兼容；Q2 已判「留 façade 就要在 `lib/route-table.js` 与三份台账同时维护新+旧两套」；`scripts/route-scan.mjs:210-212` 的 8-vs-24 正是这种漂移的现存产物。
- **反例 C（四面各一份 error 表）**：`lib/skill.js:212` 的 6/8/13 漂移会被制度化；违反 `T-O-11` 与 [`AGENTS.md:37`](../../../../AGENTS.md#L37)。
- **反例「倒挂」**：[`index.js:558-578`](../../../../dsh-nano-kitesurf/index.js#L558) 宿主每 30s 把快照 POST 给容器内 bridge，13 个 `kitesurf_*` 靠外部快照应答；[DNLS] 收归后状态与工具同在 L1，该倒挂自然消失（`v1.1 §3.3`）。

---

### 6.5 ★ 中场评估 III（Round 3 → Round 4）`[核心·锁死]`

> **本段为 Round 3 冻结后的承重评估（锁死②）。** [业主] 于 2026-11-14 全数同意 Q5 / Q6 / Q7 推荐（均选 A），据此固化 `T-O-13` / `T-O-14` / `T-O-15`；随后 agent **重新展开代码检索**（§7.0）与 Reasoning，才提出 Round 4 的 Q8 / Q9 / Q10。

#### 6.5.1 对 Round 3 的判定

- **Q5 已决断**：[业主] 选 A —— manifest 单一真源、精确 pin、SHA256 失败关闭、构建配方归 profile、旧配置键彻底退役。无遗留。
- **Q6 已决断**：[业主] 选 A —— 四元组 fingerprint、`policy-stale`/`recreate`、按需创建与空闲回收、特权入口唯一；**并关闭了 `v0.9 §8B.6` 遗留的升级语义 A/B 待拍板**。无遗留。
- **Q7 已决断**：[业主] 选 A —— 一面一清单、零别名、`ERROR_CATALOG` 一份、台账一次对齐。无遗留。
- **最关键的一手是 Q7**：它把「契约只有一份」从原则变成**可静态验收的清单**，并显式把帧细节 defer 到 Round 4，使本轮的问题空间第一次收敛到「可以数得清」的十条以内（见 6.5.4）。

#### 6.5.2 本轮已锁定真相

- `T-O-13`（Q5）：`P-schema` 必填字段 / 精确 pin / 失败关闭 / 旧键退役 / `platform[]` 预留。
- `T-O-14`（Q6）：`ensure` 幂等 / 四元组 fingerprint / `policy-stale`+`recreate` / 空闲回收 / `spawn` 只在 `backend-apple` / S3 `confine`。
- `T-O-15`（Q7）：`sandbox_*` 零别名 / `ERROR_CATALOG` 一份并补录 7 id / guard 统一 / 三台账与 `route-scan` 一次对齐 / 零残留。
- **冲突裁决已登记**：补录 7 个 errorId 属 `AGENTS.md:38` 的公共合同变更，**已由 Q7 冻结 + 本 QNA 冻结完成 durable 登记**；台账只列清单，不由实现反推（见 §1 收口修订注记 R-3）。

#### 6.5.3 诚实反方制衡（不掩盖）

- **Q5 的代价**：精确 pin + digest 意味着每次升级组件都要改 manifest、重算 digest、重建镜像（发布摩擦）；`container machine` 禁令放弃了一部分运维便利。这是 `T-O-8` 长期治理刻意选择的代价，不是缺陷。
- **Q6 的代价最需盯住**：`policy-stale` + `recreate` 意味着切 mode 要付冷启动（[DNK] 冷建容器实测约 100s，`v1.1 §2.4`）；若 `idleTimeoutMs` 太短，会话切换会频繁重建，体验下降。**`maxInstances` / `idleTimeoutMs` / 预热策略必须由 Round 4 的验收清单覆盖**，不能只写原则。
- **Q7 的代价**：零别名 + 台账一次对齐改动面最大（13 工具、24 路由、技能正文、三份台账、扫描器）；`ERROR_CATALOG` 补录 7 个 id 是**扩约**，本轮仅列为待登记内容。且「CDP socket 归 [DNLS] 持有」目前只是原则 —— keeper 实现不当会直接丢页（`skills/kitesurf-cdp/SKILL.md:65-68`）。
- **不掩盖的硬前置**：`v1.1 §8.11` 记录的两门禁 `exit 1`、[DNT] 三份台账 0 条；在 `T-O-10` 无回退路径的硬切下，这些必须在「② 对等验收」之前清干净。
- **本轮新发现的第三个门禁**：`scripts/check-clean-lib.mjs`（T-O-13 / P1-04，扫 bare specifier）此前未被 `v1.1 §8.11` 计入 —— Round 4 的门禁清单须按**三个**而非两个来对齐。

#### 6.5.4 为什么提出 Round 4 + **「第 4 轮能否完成真相层冻结」的判断**（回答 [业主] 本轮附加问题）

**剩余执行层未定点盘点**（Q7 显式 defer 的帧细节 + `T-O` 未展开的面 + 验收/收口）：

| # | 未定点 | 出处 | Round 4 归属 |
|---|---|---|---|
| U1 | CDP socket keeper 语义 / 页面丢失规则 / 多实例 socket | Q7「帧细节留 Round 4+」；`v1.1 §3.2` | **Q8** |
| U2 | `term.session.*` 逐参数 schema / `attach.url` 完整形状 | Q7 明写留 Round 4+ | **Q9** |
| U3 | `dnt-ws-v1` 帧层（`0x09` ping 缺陷、客户端 ping 发送方） | `dsh-nano-terminal/index.js:65-68`、`lib/ws.js:58-60` | **Q9** |
| U4 | `sandbox_*` 工具 inputSchema / 幂等法则 / retry 义务 / 是否新增 `sandbox` lane | Q7「由 [业主] 在后续 executional 轮次逐项冻结」；`AGENTS.md:38` | **Q9** |
| U5 | e2e 对等验收用例清单（session 实例、双会话不串味、切 mode、无 agent 会话时 UI 可用） | Q5/Q6/Q7 验收口径；`v1.1 §9.4` | **Q10** |
| U6 | 审计事件流 / selftest / perf 的归属与形状 | `T-O-3` / `T-O-15` 未展开 | **Q10** |
| U7 | 三门禁、tarball、三份 `AGENTS.md`、仓根清单、README 同步 | `v1.1 §8.11`、`AGENTS.md:39,40`、`RELEASE.md` | **Q10** |
| U8 | 收口判据：什么算「执行层真相全部冻结」；U9 / U10 如何 defer | 模板 §7 收口判据 | **Q10** |
| U9 | backend 11 能力逐项参数 / policy 三档挂载矩阵的**具体数值** | Q5/Q6 给了字段与原则，未给具体值 | **判定属《DNLS01 计划》实施细节，不是真相层**：真相层只需冻结「由谁定义、在哪定义」，Q5/Q6 已冻结 |
| U10 | NVX 回顾 / xray / gateway / 本地 S3 | `T-O-1` 明确后置 | **按 `T-O-1` 显式 defer 并登记**（`security/accepted-risks.json` 是现成 defer 台账），不算 OPEN 残题 |

**判断：`可以` 在 Round 4 完成真相层冻结。** 三条理由：

1. Q1–Q7 已把**方向**（4 个 foundational）与**三个合同基座**（3 个 executional）全部钉死；§1 已有 12 条冻结真相，追加 `T-O-13`–`T-O-15` 后共 15 条。
2. 剩余 U1–U8 全是「字段 / 清单 / 协议帧 / 验收用例 / 台账行」级，属 executional，且可由 Q8 / Q9 / Q10 三题完整覆盖；U9 是计划层细节、U10 是 `T-O-1` 已裁决的范围外事项，按模板 §7「残题显式 defer 并登记」即可收口，**不构成 OPEN 残题**。
3. 逐题驱动真相已闭合：Q8 ← `T-O-11/12/15/9`；Q9 ← `T-O-15/11/7/10/12`；Q10 ← `T-O-10/13/14/15/7/8/1`。

**需要 Round 5 的唯一触发条件**：Q8 / Q9 / Q10 任一题暴露出与已冻结 `T-O` **不可调和的 foundational 级冲突**（例如 CDP keeper 与 `T-O-12` per-instance 语义互斥、或工具面幂等法则要求推翻 `T-O-11` 的单一契约面）。届时必须先在本文件追加修订真相、再开一轮；**严禁**把 foundational 冲突降级成 executional 字段处理。该条件由 Q10 的收口判据显式登记，供 [业主] 一并裁决。

> 因此 §0 把 Round 4 标为「**拟收口轮**」、Round 5+ 标为「仅当上述触发条件成立才开启」。Q8 / Q9 / Q10 之后若 [业主] 全数同意推荐，本 QNA 即可按 §8 收口并交接《DNLS01 计划》。**（本段为 Round 3 冻结时点陈述；该条件已于 2026-11-14 达成，收口结论见 §7.5.4 / §8 — 见 R-4）**

---

## 7. Round 4 —— executional：驱动层收束与收口（`Q8–Q10`）· 已冻结（收口轮）

> 本轮 second-opinion 模式：`waived`（不设槽位）。**三题均由 §1 已冻结真相驱动**（题头逐一标注），并按 §6.5 中场评估 III 的结论提出；本轮代码检索见 §7.0。**三题已全数冻结，本轮为收口轮**；`§6.5.4` 的 Round 5 触发条件经 `§7.5.4` 复核**未成立**，不再续轮。

### 7.0 本轮提问前的代码检索清单（证据基础 · Round 3 冻结后重新展开）

| # | 检索 / 阅读对象（`file:line`） | 结论（用于本轮） |
|---|---|---|
| 1 | [`dsh-nano-kitesurf/lib/engine.js:207`](../../../../dsh-nano-kitesurf/lib/engine.js#L207)、[`:348-360`](../../../../dsh-nano-kitesurf/lib/engine.js#L348)、[`:369`](../../../../dsh-nano-kitesurf/lib/engine.js#L369)、[`:388-463`](../../../../dsh-nano-kitesurf/lib/engine.js#L388)、[`:465-489`](../../../../dsh-nano-kitesurf/lib/engine.js#L465)、[`:499-515`](../../../../dsh-nano-kitesurf/lib/engine.js#L499) | 模块级 `live = null` 单 CDP socket、`dropLive`/`releaseEngine`、`verifiedBase` 单 origin、`connectLive` 帧协议、`pageHandle` 只取 `pages[0]`、`useLive` 只重连 transport 类错误 —— **[DNK] 的 CDP 生命周期全在消费者宿主内存里**。Q8 要收归的对象。 |
| 2 | [`dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md:63-68`](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L63)、[`lib/nano-kite.js:13`](../../../../dsh-nano-kitesurf/lib/nano-kite.js#L13) | 「one page per socket」「NEVER `agent-browser close`」「closing the browser socket drops the page to `about:blank`」「suspend/resume 也丢页」—— **页面归属与 socket 生命周期强绑定**。Q8 的硬约束。 |
| 3 | [`dsh-nano-kitesurf/runtime/entrypoint.sh:12`](../../../../dsh-nano-kitesurf/runtime/entrypoint.sh#L12)、[`runtime/Dockerfile:36`](../../../../dsh-nano-kitesurf/runtime/Dockerfile#L36)、[`runtime/mcp-bridge.mjs:19`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L19)、[`:363`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L363) | bridge 监督循环；`AGENT_BROWSER_CDP` 指向容器内同一 CDP；每连接 spawn 一个 `agent-browser mcp` 子进程 —— **`agent-browser` 是下游客户端，不持有引擎生命周期**。Q8 选项 A 的既成拓扑。 |
| 4 | [`dsh-nano-kitesurf/index.js:401-406`](../../../../dsh-nano-kitesurf/index.js#L401) | `sleepEngine` 先 `stopLocalContainer` 再 `releaseEngine()`，注释说明「停失败时相位仍 running 且 socket 还在」—— 有序关闭的实测经验。Q8 要保留的语义。 |
| 5 | [`v1.1 §3.2`](../dsh-nano-local-sandbox-v1.1.md#L331)、[`§9.3 D5`](../dsh-nano-local-sandbox-v1.1.md#L1185)、[`§7.4 RK4`](../dsh-nano-local-sandbox-v1.1.md#L975) | 前序把「CDP socket 关闭丢页 / L1 未定义 keeper」登记为**高风险**；Q7 只冻结了「socket 归 [DNLS] 持有」原则。Q8 补细节。 |
| 6 | [`dsh-nano-terminal/lib/mcp.js:6-78`](../../../../dsh-nano-terminal/lib/mcp.js#L6)、[`:96`](../../../../dsh-nano-terminal/lib/mcp.js#L96)、[`:130-186`](../../../../dsh-nano-terminal/lib/mcp.js#L130) | 8 个 `term.session.*` 工具形状、`attach.path` 硬编、`handleRpc` 的 batch / `tools/call` / `structuredContent` —— Q9 可复用的契约骨架。 |
| 7 | [`dsh-nano-terminal/lib/ws.js:7-23`](../../../../dsh-nano-terminal/lib/ws.js#L7)、[`:24-60`](../../../../dsh-nano-terminal/lib/ws.js#L24)、[`:61-115`](../../../../dsh-nano-terminal/lib/ws.js#L61)；[`index.js:60-90`](../../../../dsh-nano-terminal/index.js#L60) | RFC6455 握手 / 帧编码 / `FrameParser`；**`0x09` ping 回写裸 payload 无 `0x0A` 帧头**（`:65-68`），客户端无 ping 发送方，`sendPing` 未接线。Q9 的协议缺陷。 |
| 8 | [`dsh-nano-terminal/src/client/lanes.js:17-22`](../../../../dsh-nano-terminal/src/client/lanes.js#L17)、[`:24-105`](../../../../dsh-nano-terminal/src/client/lanes.js#L24)、[`:107-198`](../../../../dsh-nano-terminal/src/client/lanes.js#L107)、[`:202-251`](../../../../dsh-nano-terminal/src/client/lanes.js#L202)、[`:253-263`](../../../../dsh-nano-terminal/src/client/lanes.js#L253) | `streamBase()` 桌面特例、三 lane、`makeLane` switch —— **加 `sandbox` 分支会改动「新 lane」合同**（`AGENTS.md:38`）；`McpLane` 已是通用 MCP client，只需换 URL。Q9 选项 A 的依据。 |
| 9 | [`dsh-nano-terminal/lib/sessions.js:123`](../../../../dsh-nano-terminal/lib/sessions.js#L123)、[`:203-211`](../../../../dsh-nano-terminal/lib/sessions.js#L203)；[`crates/dnt-agent/src/main.rs:1-7`](../../../../dsh-nano-terminal/crates/dnt-agent/src/main.rs#L1) | 30min 空闲 sweep；`dnt-agent` 仍是 7 行 stub（「Real PTY 与完整 MCP 工具面延到 v2」）。Q9 与 `T-O-3`（真 PTY 归 [DNLS]）的落点。 |
| 10 | [`dsh-nano-terminal/AGENTS.md:91-98`](../../../../dsh-nano-terminal/AGENTS.md#L91)、[`:106`](../../../../dsh-nano-terminal/AGENTS.md#L106) | `/term new/list/close/attach` 与「三条 lane」的包合同 —— 任何 lane 枚举变更都须同步该文档。Q9 的合同面。 |
| 11 | [`dsh-nano-kitesurf/runtime/mcp-bridge.mjs:163-254`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L163)、[`lib/diagnostics.js:41-72`](../../../../dsh-nano-kitesurf/lib/diagnostics.js#L41) | 工具 `inputSchema` 的既有形状（`additionalProperties:false`、`limit` 界）与 `ERROR_CATALOG` 一份真源 —— Q9 冻结 `sandbox_*` / `term.session.*` 参数与幂等 / retry 义务时可复用，不必新发明。 |
| 12 | [`AGENTS.md:38`](../../../../AGENTS.md#L38) | 逐字点名「error 枚举、idempotency 法则、客户端 retry 义务、**新 lane**、新凭证面」须 [业主] durable 决定 —— Q9 必须把「不新增 lane」与「幂等/retry 一份登记」显式提交裁决。 |
| 13 | [`dsh-nano-kitesurf/package.json:9-11`](../../../../dsh-nano-kitesurf/package.json#L9)、[`scripts/e2e-ego.mjs`](../../../../dsh-nano-kitesurf/scripts/e2e-ego.mjs)、`test/*.mjs`（8 个） | `npm test`（52/52）与 `test:e2e`（最新 20/20）是唯一现成回归资产；`T-O-12` 改成 session 实例后，e2e 必须新增双会话 / 切 mode 用例。Q10 的验收基线。 |
| 14 | [`scripts/check-clean-lib.mjs:1-15`](../../../../scripts/check-clean-lib.mjs#L1)、[`scripts/check-route-sensitivity.mjs`](../../../../scripts/check-route-sensitivity.mjs)、[`scripts/check-feature-contract.mjs`](../../../../scripts/check-feature-contract.mjs)、[`scripts/route-scan.mjs:210-212`](../../../../scripts/route-scan.mjs#L210)、[`:222-229`](../../../../scripts/route-scan.mjs#L222) | **本轮新发现第三个门禁** `check-clean-lib.mjs`（T-O-13 / P1-04，扫 bare specifier），此前 `v1.1 §8.11` 只计两个；`route-scan` 的 8-vs-24 硬编码与 4 插件扫描器仍是阻塞项。Q10 门禁清单按**三个**对齐。 |
| 15 | [`security/accepted-risks.json:1-14`](../../../../security/accepted-risks.json#L1)、[`RELEASE.md:1-9`](../../../../RELEASE.md#L1)、[`README.md:3`](../../../../README.md#L3)、[`AGENTS.md:39-40`](../../../../AGENTS.md#L39)、[`v1.1 §9.4 L1203-1218`](../dsh-nano-local-sandbox-v1.1.md#L1203) | `accepted-risks.json` 是「残题显式 defer 并登记」的现成台账；README 仍写「三个活跃插件」（已过时）；不得发布未经允许的 release-gate；worktree 约束；DoD 十条。Q10 收口判据与发布姿态的依据。 |

---

### Q8 — CDP driver 的 socket 生命周期与页面归属：谁持有 keeper？
（**驱动真相：`T-O-3` + `T-O-9` + `T-O-11` + `T-O-12` + `T-O-15`** · 来源：`v1.1 §3.2 / §7.4 RK4 / §9.3 D5`；`lib/engine.js`；`skills/kitesurf-cdp/SKILL.md:63-68`）

- **影响范围**：`cdp-driver` 的 socket 表与重连策略；`instance.endpoints.cdp` 的返回形状；[DNK] UI 与 `agent-browser mcp` 的接入方式；`suspend/resume` / 容器重建 / 宿主重启后的页面恢复语义；`T-O-12` per-instance 在 CDP 面的兑现；Q10 的 e2e 用例。
- **为什么必须确认**：`T-O-15` 只冻结了「CDP socket 归 [DNLS] 持有」这一**原则**，`v1.1 §9.3 D5` 与 `§7.4 RK4` 仍把「L1 未定义 keeper」列为高风险。而 [DNK] 现状是消费者宿主内存里的**单条** `live` socket（[`lib/engine.js:207`](../../../../dsh-nano-kitesurf/lib/engine.js#L207)）+ 单 `verifiedBase`（[`:369`](../../../../dsh-nano-kitesurf/lib/engine.js#L369)）+ 单 `pages[0]`（[`:465-489`](../../../../dsh-nano-kitesurf/lib/engine.js#L465)），`skills/kitesurf-cdp/SKILL.md:65-68` 明写「socket 关闭 = 页面回 `about:blank`」「NEVER `agent-browser close`」。`T-O-12` 已定 per-instance，若不冻结 keeper 语义，会出现「多个 session 实例抢同一 socket」「面板重挂载白屏」「`agent-browser` 子进程 idle 掉线把用户页面清空」三种失败，且无回退路径（`T-O-10`）。
- **当前建议 / 倾向**（`DNLS01 架构 agent`）：**选 A** —— **每个 session 实例一条上游 CDP socket，由 [DNLS] `cdp-driver` 长期持有 keeper**；[DNK] UI 与 `agent-browser mcp` 都是**下游客户端**，不持有生命周期；明确「socket 关闭 = 该实例页面回 `about:blank`」并由 [DNLS] 负责重连与恢复策略；`suspend` 按 `index.js:401-406` 的有序关闭语义执行；不跨实例共享 socket。
- **Reasoning**：① `T-O-12` 已把实例粒度定为 `session`，CDP socket 必须同粒度，否则 per-instance 在驱动层被架空；② `T-O-9` 特权唯一 + `T-O-3` [DNK] 纯前端化要求 socket 生命周期离开消费者内存；③ 现有拓扑本来就是「容器内 workerd 暴露 CDP / `agent-browser` 经 `AGENT_BROWSER_CDP` 附上去」（[`Dockerfile:36`](../../../../dsh-nano-kitesurf/runtime/Dockerfile#L36)、[`mcp-bridge.mjs:363`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L363)），把 keeper 放在 [DNLS] 只是把既成事实显式化，不是新发明；④ `T-O-11` 双线分工要求 UI 与 agent 都经登记契约取端点，keeper 归 [DNLS] 才能提供稳定的 `instance.endpoints.cdp`；⑤ 拒绝「无 keeper 各自直连」（选项 B）是 `SKILL.md:65-68` 的硬约束，不是偏好。
- **问题（请 [业主] 裁决）**：**你是否确认：每个 session 实例一条上游 CDP socket、由 [DNLS] `cdp-driver` 长期持有 keeper；[DNK] UI 与 `agent-browser mcp` 只作下游客户端，经 `instance.endpoints.cdp` 动态取址、不持有 socket 生命周期；明确「socket 关闭 = 该实例页面回 `about:blank`」并由 [DNLS] 负责重连与恢复；`suspend` 沿用「先停实例再丢 socket」的有序关闭；不跨实例共享 socket、不在消费者内存保留全局 `live` 单例？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 已冻结为 T-O-16`（[业主] 2026-11-14：同意第 4 轮全部推荐）

**【对本问题的解读】**

1. 本问冻结的是 **`T-O-15` 遗留的帧/生命周期细节 U1**：keeper 在哪、socket 有几条、页面归属谁、断开怎么恢复。Q7 已把所有权原则定死，本问只补执行语义。
2. **「keeper」不是新进程**：它是 [DNLS] 内 `cdp-driver` 维护的 `Map<instanceId, socket>` + 重连/恢复策略；[DNLS] 不启动浏览器进程，引擎仍由容器内 workerd 提供（`T-O-9`）。
3. **「页面丢失」要写进合同而非隐藏**：Kitesurf 的页面绑定 socket 是引擎事实（`SKILL.md:65-68`）。选 A 不等于「永不丢页」；它要求 [DNLS] 明确记录每个实例的 `lastUrl` 并在重连后按策略恢复或显式回报 `page-lost`，让 [DNK] UI 不再靠猜。
4. **`agent-browser` 的角色不变**：仍是 MCP 工具提供方 + CDP 客户端（`mcp-bridge.mjs:1-4`）；它经 keeper 提供的端点附着，**不得** `close`、`--pin-tab` 或多 target（`SKILL.md:66-67`）。
5. **不跨实例共享**是 `T-O-12` 的直接推论：共享 socket 会让两个 session 的页面互相覆盖，等于把「双会话不串味」的验收判据提前破坏。
6. **有序关闭要保留**：[`index.js:401-406`](../../../../dsh-nano-kitesurf/index.js#L401) 的「停失败时相位仍 running 且 socket 还在」是实测换来的相位校准，提升为 per-instance 后不能丢。

**【可选选项清单】**

| 选项 | 内容 | 优点 | 缺点 / 反例 | 结论 |
|---|---|---|---|---|
| **A** | **per-instance 一条上游 socket，[DNLS] 持有 keeper；消费者为下游客户端；显式页面丢失与重连策略** | 与 `T-O-12` 同粒度；`T-O-9`/`T-O-3` 所有权一致；`endpoints.cdp` 稳定可动态返回；沿用既成拓扑 | 需实现 socket 表、重连与恢复策略；e2e 要覆盖丢页/恢复 | **推荐** |
| **B** | **每个消费者各自直连容器 CDP，无 keeper** | 少一层 | Kitesurf「一页一 socket」，多连接互相抢页面；[`skills/kitesurf-cdp/SKILL.md:65-68`](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L65) 明令禁止；`agent-browser` daemon idle 会清空用户页面 | 不推荐 |
| **C** | **把 [DNK] 的全局 `live` 单例原样搬进 [DNLS]（全宿主一条 socket）** | 改动最小 | 违反 `T-O-12` per-instance；多 session 共享同一页面；是 `T-O-8` 要拒绝的「改名 hotfix」 | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **`cdp-driver` 状态**：`Map<instanceId, { ws, page:{targetId, sessionId}, lastUrl, lastActivity, phase }>`；`verifiedBase` 按实例校验 `/health` 的 `kitesurf` 前缀（[`lib/engine.js:371-386`](../../../../dsh-nano-kitesurf/lib/engine.js#L371) 提升为 per-instance）。
2. **连接与附着**：复用 [`connectLive`](../../../../dsh-nano-kitesurf/lib/engine.js#L388) 的帧协议（`id → pending Map`、`CALL_MS/CONNECT_MS/NAVIGATE_MS`）、[`pageHandle`](../../../../dsh-nano-kitesurf/lib/engine.js#L465) 的 `Target.getTargets → attachToTarget(flatten:true) → Page/Runtime/DOM/CSS/Log/Network.enable`；`useLive`（[`:499-515`](../../../../dsh-nano-kitesurf/lib/engine.js#L499)）只重连 transport 类错误的纪律不变。
3. **keeper 职责**：连接断开时按 `transport` 类错误自动重连一次（不含 timeout / 确定性错误）；记录 `lastUrl`；重连后按策略恢复页面或对该实例返回 `page-lost`（明确 errorId，进 `T-O-15` 的 `sandbox_*` error 目录）；**不静默假装页面还在**。
4. **消费者接入**：`instance.endpoints.cdp` 由 registry 动态返回（`T-O-14`）；[DNK] UI 与 `agent-browser mcp` 都从该字段取址；`AGENT_BROWSER_CDP` 由 [DNLS] 按实例注入 bridge 子进程，不写死容器端口（`T-O-13` 参数化）。
5. **关闭语义**：`suspend` / stop 按「先停实例再丢 socket」（[`index.js:401-406`](../../../../dsh-nano-kitesurf/index.js#L401)）；`adopt`/`degrade`（`T-O-14`）保持相位校准；容器重建后 socket 表按 `instanceId` 重建，不复用旧 `sessionId`。
6. **硬切删除**：[DNK] 的全局 `live`（[`lib/engine.js:207`](../../../../dsh-nano-kitesurf/lib/engine.js#L207)）、`verifiedBase`（`:369`）、`releaseEngine` 的宿主侧所有权一并删除；消费者不保留任何 socket 状态（`T-O-3`）。
7. **验收口径**：两个 session 实例各有独立 socket 且页面互不覆盖；拔掉一条 socket 只影响对应实例；重连后 `lastUrl` 可恢复或明确 `page-lost`；`instance.endpoints.cdp` 无硬编地址；e2e 覆盖「面板重挂载」「suspend→resume」后页面状态。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的现状证据**：[`lib/engine.js:207,348-360,369,388-463,465-489,499-515`](../../../../dsh-nano-kitesurf/lib/engine.js#L207)（全在消费者内存的单例）；[`index.js:401-406`](../../../../dsh-nano-kitesurf/index.js#L401)（有序关闭）；[`runtime/Dockerfile:36`](../../../../dsh-nano-kitesurf/runtime/Dockerfile#L36) / [`mcp-bridge.mjs:19,363`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L19)（`agent-browser` 本就是下游客户端）；[`runtime/entrypoint.sh:12`](../../../../dsh-nano-kitesurf/runtime/entrypoint.sh#L12)（监督循环先例）。
- **支持 A 的硬约束**：[`skills/kitesurf-cdp/SKILL.md:63-68`](../../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L63)（一页一 socket / 禁 `close` / 禁多 target / suspend 丢页）；[`lib/nano-kite.js:13`](../../../../dsh-nano-kitesurf/lib/nano-kite.js#L13) PITFALLS；[`v1.1 §9.3 D5`](../dsh-nano-local-sandbox-v1.1.md#L1185) / [`§7.4 RK4`](../dsh-nano-local-sandbox-v1.1.md#L975) 把 keeper 未定义登记为高风险。
- **治理证据**：`T-O-3`（[DNK] 纯前端）、`T-O-9`（特权唯一 / backend 抽象）、`T-O-11`（端点动态返回 / 零私有通道）、`T-O-12`（per-instance）、`T-O-15`（socket 归 [DNLS] 持有）。
- **反例 B**：`SKILL.md:65-68` 明写「NEVER `agent-browser close`」「closing the browser socket drops the page to `about:blank`」；多消费者直连必然触发。
- **反例 C**：`T-O-12` 已定 session 粒度；全局单例会让「双会话不串味」（Q10 验收项）不可能通过；`T-O-8` 拒绝把旧形态改名搬进平台。

---

### Q9 — terminal driver 与工具面公共契约：`term.session.*` / `dnt-ws-v1` / 幂等 / retry / 新 lane
（**驱动真相：`T-O-7` + `T-O-10` + `T-O-11` + `T-O-12` + `T-O-15`** · 来源：`dsh-nano-terminal/lib/mcp.js`、`lib/ws.js`、`index.js:60-90`、`src/client/lanes.js`；`AGENTS.md:38`）

- **影响范围**：`terminal-driver` 的 8 个 `term.session.*` inputSchema 与 `attach.url` 完整形状；`dnt-ws-v1` 帧层修复；`sandbox_*` 工具面与 `term.session.*` 共用的幂等法则 / retry 义务 / error 枚举；[DNT] 的 lane 枚举与 `AGENTS.md:106` 包合同；`crates/dnt-agent` 的落位；Q10 的验收用例。
- **为什么必须确认**：`T-O-15` 把 `attach.path` 双侧硬编改为 `attach.url` 原则后，**U2/U3/U4 仍未定**：[`lib/mcp.js:96`](../../../../dsh-nano-terminal/lib/mcp.js#L96) 仍返回 `{protocol:'dnt-ws-v1', path:'/dsh-nano-terminal/stream'}`；[`index.js:65-68`](../../../../dsh-nano-terminal/index.js#L65) 的 `0x09` ping 回写裸 payload（无 `0x0A` 帧头）、客户端无 ping 发送方、`sendPing`（[`lib/ws.js:58-60`](../../../../dsh-nano-terminal/lib/ws.js#L58)）未接线；`AGENTS.md:38` 逐字点名「新 lane / error 枚举 / idempotency 法则 / 客户端 retry 义务」须 [业主] durable 决定。若此刻由实现顺手加一个 `sandbox` lane 分支，会把 `McpLane` 这个**通用 MCP client** 退化成两插件专有通道，正面违反 `T-O-11` 零私有通道与 `T-O-7`。
- **当前建议 / 倾向**（`DNLS01 架构 agent`）：**选 A** —— 复用 `term.session.*` 8 工具形状并冻结 inputSchema；`attach` 只返回 `attach.url`；修 `dnt-ws-v1` 的 `0x09` → `0x0A` 并补客户端 ping；`sandbox_*` 与 `term.session.*` 共用**一份**幂等法则 / retry 义务 / error 枚举（按 `AGENTS.md:38` 已由 Q9 冻结登记）；**[DNT] 不新增专有 `sandbox` lane**，由现有 `McpLane` 指向 [DNLS] 的 URL 即可；`dnt-agent` 真 PTY 归 [DNLS] `profiles/terminal/`（`T-O-3`），[DNT] 保留 `local` lane。
- **Reasoning**：① `Q3`/`T-O-11` 已把 `McpLane` 定为「通用 MCP client」，它本来就是从 `this.url` 构造 ws URL（[`lanes.js:140-145`](../../../../dsh-nano-terminal/src/client/lanes.js#L140)），换 URL 即可接入 [DNLS]，**不需要**新 lane —— 这是最省改动且最符合「平台保持中立 / 不得耦合私域」的路径；② 新 lane 会同时改动 [`lib/mcp.js:13`](../../../../dsh-nano-terminal/lib/mcp.js#L13) enum、[`lanes.js:253-263`](../../../../dsh-nano-terminal/src/client/lanes.js#L253) switch、[`index.js:40-44`](../../../../dsh-nano-terminal/index.js#L40) health 三 lane、[`AGENTS.md:106`](../../../../dsh-nano-terminal/AGENTS.md#L106) 包合同、`NanoTerm.jsx` UI 与 retry 常量，属 `AGENTS.md:38` 明令须 [业主] 决定的「新 lane」；③ 协议缺陷（0x09）带进平台就是 hotfix，违反 `T-O-8`；④ `T-O-10` 要求 stub / 占位彻底退役，`crates/dnt-agent/src/main.rs:1-7` 与 `IsolateLane`（[`lanes.js:202-251`](../../../../dsh-nano-terminal/src/client/lanes.js#L202)）不能原样搬进 [DNLS]。
- **问题（请 [业主] 裁决）**：**你是否确认：复用 `term.session.*` 8 工具形状并冻结 inputSchema、`attach` 只返回 `attach.url`、`dnt-ws-v1` 修 `0x09`→`0x0A` 且补客户端 ping、`sandbox_*` 与 `term.session.*` 共用一份幂等/retry/error 契约（作为公共合同变更由您登记）；[DNT] 不新增专有 `sandbox` lane、由现有通用 `McpLane` 指向 [DNLS] URL，真 PTY 由 [DNLS] `profiles/terminal/` 实现、`dnt-agent` stub 与 `isolate` 占位彻底退役？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 已冻结为 T-O-17`（[业主] 2026-11-14：同意第 4 轮全部推荐）

**【对本问题的解读】**

1. 本问收口 **U2/U3/U4**：参数、帧协议、以及「工具面公共契约」这个 `AGENTS.md:38` 点名的扩约面。Q7 已定 `sandbox_*` 命名与 error 目录一份，本问补「每个工具怎么调、失败怎么重试」。
2. **「不新增 lane」是本问最关键的治理判断**：`McpLane` 是通用 MCP client，[DNLS] 只是另一个 MCP server；为它开专用分支 = 私有通道 + 新 lane 双重违规。换 URL 即可，且 `McpLane` 已有 `attach.url` 优先逻辑（[`lanes.js:140`](../../../../dsh-nano-terminal/src/client/lanes.js#L140)）。
3. **幂等 / retry 是「一份登记」而非「每工具各写」**：`ensure` 幂等（`T-O-14`）、`timeout` 不重跑、`transport` 类才重连一次（`lib/engine.js:499-515` 的既有纪律）应统一适用于 `sandbox_*` 与 `term.session.*`；按 `AGENTS.md:38`，这份登记须 [业主] 裁决。
4. **协议修复不是「顺手改」**：`0x09` 回裸 payload 属 RFC6455 违规，若留到平台里会以「历史兼容」之名长期存在（`T-O-8` 拒绝 hotfix）。`sendPing`（`lib/ws.js:58-60`）已导出但从未接线，正好补上客户端发送方。
5. **stub / 占位彻底退役**：`dnt-agent` 7 行 stub 与 `IsolateLane` echo REPL 是 [DNT] 的 scaffold，[DNLS] 的 `profiles/terminal/` 必须实现真 PTY（`T-O-3`）；[DNT] 保留 `local` lane 作为宿主本地终端（[`lib/sessions.js:146-178`](../../../../dsh-nano-terminal/lib/sessions.js#L146)）。
6. **`term.audit` / `term.lane.status` 归属**：审计事件流归 [DNLS] 一份（Q10 细化），`lane.status` 由 [DNLS] 返回自己实现的 lane，不沿用 [DNT] 的三 lane 文案。

**【可选选项清单】**

| 选项 | 内容 | 优点 | 缺点 / 反例 | 结论 |
|---|---|---|---|---|
| **A** | **复用 8 工具 + `attach.url` + 帧层修复 + 一份幂等/retry/error 契约 + 不新增 lane + 真 PTY 归 [DNLS]** | 改动最小且最中立；避开「新 lane」扩约；消除协议缺陷；stub 彻底退役 | 需同步 [DNT] `AGENTS.md:106` 与 health 文案；`term.session.*` 参数须逐项登记 | **推荐** |
| **B** | **新增 [DNT] 专有 `sandbox` lane 分支 + 专用地址常量** | 语义直观 | 违反 `T-O-11` 零私有通道；属 `AGENTS.md:38`「新 lane」须裁决却由实现反推；要改 enum / switch / health / UI / retry 五处；`McpLane` 通用性被破坏 | 不推荐 |
| **C** | **保留 `dnt-ws-v1` 现状（不修 `0x09`）与 stub / `isolate` 占位** | 零改动 | RFC6455 违规带进平台；`T-O-10` 要求 stub 彻底退役；`isolate` 继续「假装隔离」；是 `T-O-8` 拒绝的 hotfix | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **冻结 `term.session.*` 8 工具 inputSchema**（沿用 [`lib/mcp.js:6-78`](../../../../dsh-nano-terminal/lib/mcp.js#L6) 形状：`additionalProperties:false`、`required` 显式、`lines` 默认 50 且上限 500、`cols/rows` 2..512）；`term.session.create` 的 `lane` 只保留 `local` 与 [DNLS] 提供的 sandbox 目标，**不**在 [DNT] 侧新增枚举。
2. **`attach` 形状**：`term.session.create` 只返回 `attach: { protocol:'dnt-ws-v1', url:<由 DNLS 按 instance.endpoints 动态生成的完整 ws 地址> }`；删除 [`lib/mcp.js:96`](../../../../dsh-nano-terminal/lib/mcp.js#L96) 的 `path` 与 [`lanes.js:140`](../../../../dsh-nano-terminal/src/client/lanes.js#L140) 的硬编兜底；`?session=<id>` 由 server 一并给出。
3. **`dnt-ws-v1` 帧层修复**：`0x09` → 回 `0x0A` pong 帧（用 [`lib/ws.js:24-41`](../../../../dsh-nano-terminal/lib/ws.js#L24) `encodeFrame`）；接线 `sendPing`（[`:58-60`](../../../../dsh-nano-terminal/lib/ws.js#L58)）并补客户端发送方与 `idle` 超时（照 [DNK] bridge 的 `IDLE_MS` 先例）；`0x08` close 回握、分片重组、`MAX_FRAME` 上限沿用 [`lib/ws.js:61-115`](../../../../dsh-nano-terminal/lib/ws.js#L61)。
4. **一份公共契约（已由 Q9 冻结登记）**：`sandbox_*` 与 `term.session.*` 共用 ① 幂等法则（`ensure`/`create` 按 `instanceId`/`sessionId` 幂等，重复调用返回同一 id）；② retry 义务（仅 transport 类重连一次，`timeout`/确定性错误绝不重跑 —— 沿用 [`lib/engine.js:499-515`](../../../../dsh-nano-kitesurf/lib/engine.js#L499)）；③ error 枚举（`ERROR_CATALOG` 一份，`T-O-15` 已冻结）。按 [`AGENTS.md:38`](../../../../AGENTS.md#L38) 已由 Q9 冻结完成公共合同变更的 durable 登记，**不由实现反推**。
5. **不新增 lane**：[DNT] `McpLane`（[`lanes.js:107-198`](../../../../dsh-nano-terminal/src/client/lanes.js#L107)）以配置中的 [DNLS] MCP URL 接入；`makeLane`（[`:253-263`](../../../../dsh-nano-terminal/src/client/lanes.js#L253)）、lane enum（[`lib/mcp.js:13`](../../../../dsh-nano-terminal/lib/mcp.js#L13)）、health 三 lane（[`index.js:40-44`](../../../../dsh-nano-terminal/index.js#L40)）与 [`AGENTS.md:106`](../../../../dsh-nano-terminal/AGENTS.md#L106) **均不新增分支**；`streamBase()` 桌面特例（[`lanes.js:17-22`](../../../../dsh-nano-terminal/src/client/lanes.js#L17)）补到 `McpLane` 上（`v1.1 §3.5` 已登记该缺口）。
6. **真 PTY 与退役**：`crates/dnt-agent` 迁入 [DNLS] `profiles/terminal/` 并实现真 PTY + 8 工具 server 侧（取代 [`main.rs:1-7`](../../../../dsh-nano-terminal/crates/dnt-agent/src/main.rs#L1) 的 stub）；`IsolateLane`（[`lanes.js:202-251`](../../../../dsh-nano-terminal/src/client/lanes.js#L202)）与 `isolate` 文案彻底退役（`T-O-10`）；`term.audit` 的 `audit.jsonl`（[`index.js:31`](../../../../dsh-nano-terminal/index.js#L31)、[`lib/mcp.js:81-87`](../../../../dsh-nano-terminal/lib/mcp.js#L81)）归 [DNLS] 一份（Q10 细化）。
7. **验收口径**：`term.session.create` 返回 `attach.url` 且全仓无 `/dsh-nano-terminal/stream` 硬编；`0x09` 探测收到 `0x0A` 帧；`tools/list` 无 `sandbox` lane 分支；两个 session 的 terminal 互不串味；`npm test` 8 工具 schema 与幂等/retry 单测通过；[DNT] `AGENTS.md` 与 health 文案同步。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的可复用形状**：[`dsh-nano-terminal/lib/mcp.js:6-78,96,130-186`](../../../../dsh-nano-terminal/lib/mcp.js#L6)；[`lib/ws.js:7-23,24-60,61-115`](../../../../dsh-nano-terminal/lib/ws.js#L7)；[`lib/sessions.js:123,203-211`](../../../../dsh-nano-terminal/lib/sessions.js#L123)；[`runtime/mcp-bridge.mjs:163-254`](../../../../dsh-nano-kitesurf/runtime/mcp-bridge.mjs#L163) 的 `inputSchema` 与上限写法；[`lib/diagnostics.js:41-72`](../../../../dsh-nano-kitesurf/lib/diagnostics.js#L41) 的 error 单一真源。
- **支持 A 的「不新增 lane」依据**：[`src/client/lanes.js:107-198,140-145,253-263`](../../../../dsh-nano-terminal/src/client/lanes.js#L107)（`McpLane` 已从 `this.url` 构造，是通用 client）；[`dsh-nano-terminal/AGENTS.md:91-98,106`](../../../../dsh-nano-terminal/AGENTS.md#L91)（包合同的三 lane / `/term`）；[`AGENTS.md:38`](../../../../AGENTS.md#L38)（新 lane 须 [业主] 决定）。
- **支持 A 的治理证据**：`T-O-11`（零私有通道 / 契约单一）、`T-O-10`（stub 彻底退役）、`T-O-12`（session 粒度）、`T-O-3`（真 PTY 归 [DNLS]）、`T-O-8`（拒绝 hotfix）。
- **反例 B（新增 lane）**：要同时改 [`lib/mcp.js:13`](../../../../dsh-nano-terminal/lib/mcp.js#L13) / [`lanes.js:253-263`](../../../../dsh-nano-terminal/src/client/lanes.js#L253) / [`index.js:40-44`](../../../../dsh-nano-terminal/index.js#L40) / `NanoTerm.jsx` UI / `OPEN_RETRIES` retry 五处；属 `AGENTS.md:38` 明令「不得由实现反推合同」。
- **反例 C（保留现状）**：[`index.js:65-68`](../../../../dsh-nano-terminal/index.js#L65) 的裸 payload pong、`sendPing` 未接线（[`lib/ws.js:58-60`](../../../../dsh-nano-terminal/lib/ws.js#L58)）、[`crates/dnt-agent/src/main.rs:1-7`](../../../../dsh-nano-terminal/crates/dnt-agent/src/main.rs#L1) 的 7 行 stub、[`lanes.js:202-251`](../../../../dsh-nano-terminal/src/client/lanes.js#L202) 的 echo REPL —— 都是 `T-O-10` 删除清单上的对象。

---

### Q10 — 对等验收、审计 / 门禁 / 发布与**收口判据**：第 4 轮能否冻结？
（**驱动真相：`T-O-1` + `T-O-7` + `T-O-8` + `T-O-10` + `T-O-13` + `T-O-14` + `T-O-15`** · 来源：`v1.1 §5.6 G1–G8 / §8.11 / §9.4`；`scripts/check-*.mjs`；`security/accepted-risks.json`；`RELEASE.md`；`AGENTS.md:39-40`）

- **影响范围**：`T-O-10` 三段时序里「② 对等验收」的**具体用例清单**；审计事件流 / selftest / perf 的归属；三个门禁与三份安全台账；tarball / 三份 `AGENTS.md` / 仓根插件清单 / README 同步；`U9`（实施细节）与 `U10`（后置范围）的 defer 登记；**§8 收口判据与是否需要 Round 5**。
- **为什么必须确认**：`T-O-10` 定的是「一次性硬切、无回退路径」，这把全部风险压到「② 对等验收」的完备性上（§3.3 已诚实登记）。而现状：`scripts/e2e-ego.mjs` 只有单实例形态的 20/20、`v1.1 §9.4` 的 DoD 十条是**建议**、`scripts/route-scan.mjs:210-212` 让两门禁 `exit 1`、本轮又发现第三个门禁 `scripts/check-clean-lib.mjs:1-15`、`README.md:3` 仍写「三个活跃插件」、[DNT] 在三份台账 0 条。若不冻结验收清单与收口判据，就无法回答 [业主] 本轮的附加问题 —— 「第 4 轮能否完成真相层冻结」。
- **当前建议 / 倾向**（`DNLS01 架构 agent`）：**选 A** —— **确认第 4 轮为收口轮**：冻结四类验收清单 + 审计归属 + 三门禁/发布姿态 + U9/U10 的 defer 登记 + 收口判据；**不新增 release-gate**（`AGENTS.md:39`）；NVX / 未来 profile 按 `T-O-1` 显式 defer，不算 OPEN 残题。
- **Reasoning**：① §6.5.4 已逐条盘点 U1–U10，Q8/Q9/Q10 覆盖 U1–U8，U9 属计划实施细节、U10 属 `T-O-1` 已裁决的范围外 —— 模板 §7 允许「残题显式 defer 并登记」收口；② `security/accepted-risks.json:1-14` 是本仓现成的 defer 台账，不需要新仪式（`AGENTS.md:39` 不得过度仪式）；③ 把「backend 参数数值 / 挂载矩阵具体值」再开一轮问，是把实施细节误升为真相层，属过度仪式（选项 B）；④ 把 NVX 拉进本轮违反 `T-O-1` 且无 Windows 主机（选项 C）；⑤ 三门禁而非两门禁，是本轮新检索修正的事实（§7.0 第 14 条）。
- **问题（请 [业主] 裁决）**：**你是否确认：Round 4 为收口轮 —— 冻结「① e2e 对等验收清单（含双会话不串味、切 mode 的 `policy-stale`、无 agent 会话时 UI 可用、丢页/恢复、无第三通道）；② 审计事件流 / selftest / perf 归 [DNLS] 一份；③ 三门禁恢复 `exit 0`、tarball 与三份 `AGENTS.md` / 仓根清单 / README 同步、不新增 release-gate；④ U9 判定为《DNLS01 计划》实施细节、U10 按 `T-O-1` 显式 defer 进 `accepted-risks.json` 式台账；⑤ 收口判据 = §1 全 `T-O` 冻结 + 无 OPEN 残题（或残题显式 defer）」，并同意「仅当出现不可调和的 foundational 冲突才开 Round 5」？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 已冻结为 T-O-18`（[业主] 2026-11-14：同意第 4 轮全部推荐）

**【对本问题的解读】**

1. 本问同时收口 **U5/U6/U7/U8** 并直接回答 [业主] 的附加问题。**「能否冻结」不是预测，是一个可裁决的合同**：只要 U9/U10 被正确分类、且 Q8/Q9/Q10 不浮现 foundational 冲突，第 4 轮即可收口。
2. **U9 为什么不是真相层**：Q5 已冻结「manifest 是唯一真源、必填字段、精确 pin」，Q6 已冻结「fingerprint 四元组、`policy-stale`/`recreate`」—— 真相层关心的是「**由谁定义、在哪定义、按什么规则裁决**」；`memory: 4G`、`--mount` 的具体字符串这类数值属《DNLS01 计划》的实施细节，改数值不需要追加 `T-O`。
3. **U10 为什么不算 OPEN 残题**：`T-O-1` 已由 [业主] 裁决「macOS 首期、NVX 后置」，`T-O-4` 已定「未来 profile 同平台发展」。它们是**已裁决的范围外事项**，按模板 §7「残题显式 defer 并登记」写入台账即可，不是「尚未决定」。
4. **「不新增 release-gate」是硬约束**：[`AGENTS.md:39`](../../../../AGENTS.md#L39) 禁止发布未经 [业主] 允许的门禁；本问只要求**恢复既有三门禁**到 `exit 0`，把 [DNLS]/[DNT] 纳入既有扫描器，不新设 CI 关卡。
5. **三门禁是本轮修正的事实**：`scripts/check-clean-lib.mjs`（T-O-13 / P1-04）此前未计入 `v1.1 §8.11`；Q10 的门禁清单按三个对齐，避免收口后仍有未绿门禁。
6. **审计一份真源**：[DNK] `recordOperation`（[`lib/diagnostics.js:103`](../../../../dsh-nano-kitesurf/lib/diagnostics.js#L103)）、[DNT] `audit.jsonl`（[`index.js:31`](../../../../dsh-nano-terminal/index.js#L31)）、`runSelfTest`（[`index.js:472-516`](../../../../dsh-nano-kitesurf/index.js#L472)）收归 [DNLS] 一份；`term.audit` 由 [DNLS] 应答，不双写（`T-O-15`）。

**【可选选项清单】**

| 选项 | 内容 | 优点 | 缺点 / 反例 | 结论 |
|---|---|---|---|---|
| **A** | **第 4 轮收口**：冻结四类验收 + 审计归属 + 三门禁/发布 + U9/U10 defer + 收口判据；仅 foundational 冲突才开 Round 5 | 与 §6.5.4 盘点一致；符合模板 §7；避免过度仪式；直接回答 [业主] 问题 | 要求 Q8/Q9/Q10 全数冻结且不浮现新冲突 | **推荐** |
| **B** | **再开 Round 5** 逐项问 backend 11 能力参数 / 三档挂载矩阵具体数值 | 看似更完备 | 把实施细节误升为真相层；违反 [`AGENTS.md:39`](../../../../AGENTS.md#L39) 不得过度仪式；Q5/Q6 已冻结「由谁定义」，再问数值没有裁决价值 | 不推荐 |
| **C** | **把 NVX 回顾 / xray / gateway / 本地 S3 也拉进本轮冻结** | 范围最大 | 违反 `T-O-1`（macOS 首期、Windows 后置）；前序 §9.6 待办 #3「Windows x86_64 主机」仍未提供；无实证基础 | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **① e2e 对等验收清单（在现有 20/20 上增量，不另起套件）**：保留 [`scripts/e2e-ego.mjs`](../../../../dsh-nano-kitesurf/scripts/e2e-ego.mjs) 的既有断言；**新增** ① 两个不同 session 的 `workspaceRoot`/`mode` 不同 → 各自实例、页面、terminal 互不串味；② 某 session 切 mode → `policy-stale` + `recreate`，其他实例不受影响；③ **无 agent 会话时** UI 仍能打开面板 / 点选 / 截图 / DevTools 轮询（`T-O-11`）；④ socket 断开只影响对应实例，重连后 `lastUrl` 恢复或显式 `page-lost`（Q8）；⑤ 模型侧只用 skill + `sandbox_*` MCP 即可排障；⑥ 全仓静态扫描无第三条跨插件通道、`kitesurf_*`/`/nano-kitesurf/*` 零残留。
2. **② 审计 / selftest / perf 一份**：`recordOperation`（[`lib/diagnostics.js:103`](../../../../dsh-nano-kitesurf/lib/diagnostics.js#L103)）、`runSelfTest` 11 项（[`index.js:472-516`](../../../../dsh-nano-kitesurf/index.js#L472)）、[DNT] `audit.jsonl`（[`index.js:31`](../../../../dsh-nano-terminal/index.js#L31)、[`lib/mcp.js:81-87`](../../../../dsh-nano-terminal/lib/mcp.js#L81)）全部收归 [DNLS] `observability`；`term.audit` 由 [DNLS] 应答；`ERROR_CATALOG` 仍一份（`T-O-15`）。
3. **③ 三门禁与发布姿态**：`check-route-sensitivity.mjs` / `check-feature-contract.mjs` / **`check-clean-lib.mjs`** 三者 `exit 0`；修 [`route-scan.mjs:210-212`](../../../../scripts/route-scan.mjs#L210) 的 8-vs-24、[`:222-229`](../../../../scripts/route-scan.mjs#L222) 扫描器加入 [DNLS]/[DNT]；[DNT] 端点入账、三份台账数字一致；`npm pack --dry-run` 含全部运行时产物（[`RELEASE.md:1-9`](../../../../RELEASE.md#L1)）；[DNK]/[DNT]/[DNLS] 三份 `AGENTS.md`、[`AGENTS.md:23-29`](../../../../AGENTS.md#L23-L29) 插件清单、[`README.md:3`](../../../../README.md#L3)（现仍写「三个活跃插件」）同步；worktree 按 [`AGENTS.md:40`](../../../../AGENTS.md#L40) 用后删除。**不新增 release-gate**。
4. **④ U9 / U10 的 defer 登记**：在 `security/accepted-risks.json` 式台账（[`:1-14`](../../../../security/accepted-risks.json#L1) 是现成先例）登记两条 —— `U9: backend 参数 / 挂载矩阵具体值 → 《DNLS01 计划》实施细节，非真相层`；`U10: NVX 回顾 / xray / gateway / 本地 S3 → 按 T-O-1 后置，触发条件见 v1.1 §5.7`。二者**不计入 OPEN 残题**。
5. **⑤ 收口判据（写入 §8）**：§1 Truth-Gate 全 `T-O`（`T-O-1`–`T-O-18`）冻结；Q1–Q10 全部有「业主回答」；无 OPEN 残题，或残题已按 ④ 显式 defer 并登记；`§6.5.4` 的 Round 5 触发条件未成立。达成后交接《DNLS01 计划》§2 CITE。
6. **Round 5 触发条件（须 [业主] 一并确认）**：Q8/Q9/Q10 任一题暴露与已冻结 `T-O` **不可调和的 foundational 级冲突** → 先在本文件追加修订真相、再开一轮；**严禁**把 foundational 冲突降级为 executional 字段处理。
7. **验收口径**：G1–G8（`v1.1 §5.6`）与 §9.4 DoD 十条全部满足；三门禁 `exit 0`；e2e **20/20 基线 + 七类增量用例**全绿；`accepted-risks.json` 含 U9/U10 两条 defer；无新增 release-gate；§1 共 18 条 `T-O` 且全部 `已冻结`。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的收口依据**：§6.5.4 的 U1–U10 盘点表；模板 §7「无 OPEN 残题（或残题显式 defer 并登记）」；[`security/accepted-risks.json:1-14`](../../../../security/accepted-risks.json#L1) 现成 defer 台账；[`v1.1 §9.4 L1203-1218`](../dsh-nano-local-sandbox-v1.1.md#L1203) 的 DoD 十条（本问把它从「建议」升为冻结清单）。
- **支持 A 的验收资产**：[`dsh-nano-kitesurf/package.json:9-11`](../../../../dsh-nano-kitesurf/package.json#L9)、`scripts/e2e-ego.mjs`（20/20）、`test/*.mjs` 8 个（52/52）、[`dsh-nano-terminal/test/run.mjs`](../../../../dsh-nano-terminal/test/run.mjs)（6/6）。
- **支持 A 的门禁/发布证据**：[`scripts/check-clean-lib.mjs:1-15`](../../../../scripts/check-clean-lib.mjs#L1)（本轮新发现的第三门禁）、[`scripts/route-scan.mjs:210-212,222-229`](../../../../scripts/route-scan.mjs#L210)、[`v1.1 §8.11 L1147`](../dsh-nano-local-sandbox-v1.1.md#L1147)、[`RELEASE.md:1-9`](../../../../RELEASE.md#L1)、[`README.md:3`](../../../../README.md#L3)、[`AGENTS.md:39-40`](../../../../AGENTS.md#L39)。
- **治理证据**：`T-O-1`（NVX 后置）、`T-O-7` / `AGENTS.md:39`（不得过度仪式）、`T-O-8`（长期治理）、`T-O-10`（三段时序 / 无回退）、`T-O-13/14/15`（三个合同基座）。
- **反例 B（再开一轮问数值）**：Q5 已冻结「manifest 唯一真源 + 必填字段」、Q6 已冻结「fingerprint 四元组 + `policy-stale`」；再问 `memory: 4G` 这类数值没有裁决价值，且违反 `AGENTS.md:39`。
- **反例 C（拉 NVX 进本轮）**：`T-O-1` 明确后置；`v0.9 §9.6` 待办 #3「提供 Windows x86_64 主机」仍未提供；无实证基础的问题不能冻结为真相。
- **反例「新增门禁」**：`AGENTS.md:39` 禁止发布未经 [业主] 允许的 release-gate；本问只恢复既有三门禁，不新设关卡。

---

### 7.5 ★ 中场评估 IV（Round 4 → 收口）`[核心·锁死]`

> **本段为 Round 4 冻结后的收口复核（锁死②）。** [业主] 于 2026-11-14 全数同意 Q8 / Q9 / Q10 推荐（均选 A），据此固化 `T-O-16` / `T-O-17` / `T-O-18`；agent 已按 §8 判据逐条复核，结论见 7.5.4。

#### 7.5.1 对 Round 4 的判定

- **Q8 已决断**：[业主] 选 A —— per-instance 一条上游 CDP socket、[DNLS] 持有 keeper、消费者为下游客户端、显式 `page-lost` / `lastUrl` 恢复、有序关闭、无全局单例。无遗留。
- **Q9 已决断**：[业主] 选 A —— 复用 `term.session.*` 8 工具、`attach.url`、修 `0x09`→`0x0A`、一份幂等/retry/error 契约、**不新增专有 `sandbox` lane**、真 PTY 归 [DNLS]、stub 与 `isolate` 占位退役。无遗留。
- **Q10 已决断**：[业主] 选 A —— **第 4 轮为收口轮**；四类验收 + 三门禁/发布姿态 + U9/U10 defer + 收口判据全部冻结。无遗留。
- **最关键的一手是 Q10**：它把「能否在第 4 轮完成真相层冻结」从预测变成**可裁决的合同**，并把 U9（计划实施细节）与 U10（`T-O-1` 已裁决的范围外事项）正确分类，使本 QNA 无需第 5 轮即可收口。

#### 7.5.2 本轮已锁定真相

- `T-O-16`（Q8）：`cdp-driver` keeper / 页面归属 / 重连恢复 / 不跨实例共享 / 硬切删除消费者单例。
- `T-O-17`（Q9）：`term.session.*` 参数 / `attach.url` / `dnt-ws-v1` 帧层修复 / 一份公共契约 / 不新增 lane / 真 PTY 与 stub 退役。
- `T-O-18`（Q10）：e2e 20/20 基线 + **七类增量用例**（含资源治理） / 审计一份 / 三门禁与发布 + 快照缓解 / U9-U10 defer / 收口判据 / **门禁修复必须早于 `T-O-10` ② 对等验收**。
- **STEP.2 修订已入 §1 收口修订注记**：R-1 两/三门禁时点差、R-2 errorId 命名空间欠登记、R-3 待登记语气失效、R-4 历史数字时点。§1 现共 **18 条 `T-O`**（`T-O-1`–`T-O-18`），全部已冻结。

#### 7.5.3 诚实反方制衡（不掩盖）

- **Q8 的代价**：每实例一条 socket + 恢复策略，连接数与内存上升；`page-lost` 若与 [DNK] UI 的期望不一致，会出现「用户以为页面还在」的争议。这要求 e2e 增量用例覆盖丢页/恢复（Q10 已冻结），不能只靠 keeper 自称可靠。
- **Q9 的代价**：`McpLane` 的桌面 `streamBase()` 缺口要补；`dnt-ws-v1` 帧层修复需要协议回归；`dnt-agent` 从 7 行 stub 到真 PTY 有实质实现量。「不新增 lane」省下的是合同扩约，不是实现工作量。
- **Q10 的代价**：U9/U10 defer 把实施细节与 NVX 回顾交给《DNLS01 计划》承接；`check-clean-lib.mjs` 是收口前才发现的第三门禁 —— 若实施期再发现第四门禁，按 §9「变更控制」追加修订，**不得**静默改已冻结真相。
- **不掩盖的一点**：**全轮冻结 ≠ 实现完成**。本 QNA 只钉真相与合同，未创建 [DNLS] 包、未改任何代码 / 配置 / profile；`v0.9` / `v1.1` 的 eval 结论仍是事实基线（`T-O-5`）。所有 `file:line` 为 HEAD `9aee891` 快照（Round 4 复核于 `a25944f`），行号漂移时以「路径 + 符号名」为准。
- **Round 5 触发条件的复核结论**：Q8/Q9/Q10 未暴露与已冻结 `T-O` 不可调和的 foundational 冲突；CDP keeper 与 `T-O-12` per-instance 同构、工具面幂等法则与 `T-O-11` 单一契约面一致。**条件未成立**。

#### 7.5.4 收口判据复核 / 是否开启 Round 5

| 判据（`T-O-18` ⑤ / 模板 §7） | 复核结果 |
|---|---|
| §1 Truth-Gate 全 `T-O` 冻结 | ✅ `T-O-1`–`T-O-18` 共 18 条，全部有来源与业主回答 |
| Q1–Q10 全部有「业主回答」 | ✅ 10 条，均为「已确认：选 A（与推荐一致）」 |
| 无 OPEN 残题，或残题显式 defer 并登记 | ✅ U1–U8 由 Q8/Q9/Q10 覆盖；U9/U10 由 `T-O-18` ④ 显式 defer（写入 `accepted-risks.json` 式台账） |
| `§6.5.4` Round 5 触发条件未成立 | ✅ 见 7.5.3 复核结论 |
| 「门禁修复早于 ② 对等验收」已登记 | ✅ `T-O-18` 明文，无时序竞态 |
| STEP.1 冲突 / 竞态 / 欠登记已处置 | ✅ §1 收口修订注记 **R-1–R-5** + 正文时态同步 |
| 新增 errorId（`policy-stale` / `page-lost`）已完整登记 | ✅ R-5：全名 / 命名空间 / 状态码派生规则 / 所属目录，已由 Q6 / Q8 冻结完成 durable 登记 |
| 资源治理验收（`maxInstances` / `idleTimeoutMs` / 预热策略）已兑现 | ✅ `T-O-18` ① 第七类增量用例 + U9 只 defer 具体数值，`§5.4` / `§6.5.3` 承诺已兑现 |

> **结论：不开启 Round 5，本 QNA 全轮收口。** 交接《DNLS01 计划》§2 CITE。

---

## 8. 收口（全轮冻结）· 已冻结

### 8.1 STEP.1 全文梳理结论（[业主] 要求的三项判断）

| 判断项 | 结论 | 依据 / 处置 |
|---|---|---|
| **是否存在内部冲突** | **否**。18 条 `T-O` 之间无互相矛盾：`T-O-10`（硬切）与 `T-O-11`（skill 保留）区分了「机制保留」与「旧正文退役」；`T-O-12`（session 粒度）与 `T-O-16`（per-instance socket）同构；`T-O-14`（不广告 `sandbox_permissions`）与 `T-O-6`（三档不扩约）一致 | §1 全表 + 各轮中场评估 |
| **是否引入文档内部竞态** | **发现 5 处时点差 / 欠登记（含独立对抗复核追加 2 处），STEP.2 已全部消除**：① 两门禁 vs 三门禁（R-1，`T-O-18` 覆盖）；② errorId 命名空间与「零残留」范围（R-2）；③ 门禁修复与 `T-O-10` 三段时序先后（`T-O-18` 明文）；④ 新增 `policy-stale` / `page-lost` 未进冻结 error 枚举（R-5）；⑤ 资源治理验收承诺未兑现（R-5 + `T-O-18` ① 第七类用例） | §1 收口修订注记 R-1–R-5 + `T-O-18` + §7.5.4 复核表 |
| **应登记细节是否全部完整登记** | **是（STEP.2 补齐后）**：Q8/Q9/Q10 全量细节 → `T-O-16/17/18`；7 个 `kitesurf.*` errorId 全名与命名空间 → R-2；2 个 `sandbox.*` 新增 errorId 全名 / 状态码 / 目录 → R-5；`sandbox_*` 20 项工具清单 → `Q7 执行说明第 1 条` 冻结附件；三门禁清单 → `T-O-18`；资源治理验收 → `T-O-18` ① 第七类用例；`AGENTS.md:38` 公共合同变更的登记状态 → R-3 / R-5（已由 Q6/Q7/Q8/Q9 冻结完成）；变更控制条款 → §9 | §1 + §7.5.4 + §9 |

### 8.2 冻结判据逐条核对

| # | 判据 | 状态 |
|---|---|---|
| 1 | 方向钉死（4 个 foundational-qna 全冻结） | ✅ Q1–Q4 → `T-O-9`–`T-O-12` |
| 2 | 执行层真相冻结（6 个 executional-qna 全冻结） | ✅ Q5–Q10 → `T-O-13`–`T-O-18` |
| 3 | §1 Truth-Gate 全 `T-O` 冻结 | ✅ 18 条，append-only |
| 4 | 无 OPEN 残题（或显式 defer 并登记） | ✅ U9 / U10 已 defer，`T-O-18` ④ |
| 5 | Round 5 触发条件未成立 | ✅ §7.5.3 / §7.5.4 |
| 6 | 新增 errorId 与资源治理判据已入冻结台账 | ✅ R-5 + `T-O-18` ① 第七类用例，§7.5.4 复核通过 |
| 7 | 文档状态 = `frozen` | ✅ STEP.3 翻转完成（2026-11-14） |

### 8.3 交接

- **§1 Truth-Gate 台账 → 《DNLS01 计划》§2 唯一 CITE 源**（`T-O-1`–`T-O-18`）。
- **下一步**：撰写《DNLS01 计划》—— 本阶段专项（完成 `v1.1` eval 定义的 [DNLS] 全部任务）的最终输出。
- **范围外 / 已 defer**：U9（backend 参数与挂载矩阵具体值）归计划实施细节；U10（NVX 回顾 / xray / gateway / 本地 S3）按 `T-O-1` 后置，触发条件见 `v1.1 §5.7`。二者均须在计划中显式登记，不得静默遗漏。
- **变更控制**：本文件冻结后，任何新增 / 修订按 §9「变更控制」追加，不改已冻结行。

---

## 9. 使用约束

- 严格遵循 [`.adocs/templates/qna-progressive.md`](../../../../.adocs/templates/qna-progressive.md)：Q 编号 append 续编不回收、每轮一个 focus、§1 Truth-Gate 逐轮累积、轮间中场评估承重、下一轮每题标驱动真相。
- **second-opinion 全程 `waived`**：本文及后续各轮均不设该栏（[业主] 指示）。
- **严禁预设**：上一轮未冻结前，不得写入下一轮题目；下一轮题目须基于中场评估后的新事实调查与 Reasoning 提出。
- **证据纪律**：所有问题提出前先出 `2.x` 检索清单，`file:line` 精确到符号；仓库活跃开发时以「路径 + 符号名」为准。
- **推荐方案纪律**：一律按长期治理四原则（`T-O-8`）给推荐，不由实现反推合同、不把「测试要求如此」当合同来源（[`AGENTS.md:38`](../../../../AGENTS.md#L38)）。
- **qna 只产 `T-O`**；`T-R` 来自 reference-anchor，不进 §1。
- **单一真源**：[业主] 只在本文件填「业主回答」；冻结后引用方只引 `Q 编号 + 业主回答`；推翻在本文件追加修订，不改已冻结行。
- **变更控制（冻结后）**：本文件状态为 `frozen` 后，任何新增 / 变更一律按「在本文件追加修订 + 更新修订历史」执行，**不得静默修改**已冻结的 `T-O` 行、业主回答或中场评估结论；下游《DNLS01 计划》§2 只 CITE §1 台账。

---

## 修订历史

| 版本 | 日期 | 作者 | 主要变更 |
|------|------|------|----------|
| v0.1 | 2026-11-14 | `DNLS01 架构 agent（lead）` | 初稿：按 `qna-progressive` 建立骨架；冻结 `T-O-1`–`T-O-8` baseline；提出 Round 1 两个 foundational-qna（Q1 注册形态与权威边界 / Q2 所有权切割方式），各含 4 组信息与 `file:line` 证据；second-opinion 全程 waived；Round 2+ 未预设 |
| v0.2 | 2026-11-14 | `DNLS01 架构 agent（lead）` | [业主] 全数同意 Round 1 推荐：Q1/Q2 冻结为 `T-O-9`/`T-O-10`，补写 §3 中场评估 I；基于**新一轮代码检索与 Reasoning（§4.0）**提出 Round 2 两个 foundational-qna（Q3 消费者接入面分工 / Q4 实例 scope 与 policy 边界），逐题标驱动真相、各含 4 组信息；Round 3+ 仍未预设 |
| v0.3 | 2026-11-14 | `DNLS01 架构 agent（lead）` | [业主] 全数同意 Round 2 推荐：Q3/Q4 冻结为 `T-O-11`/`T-O-12`，补写 §5 中场评估 II；基于**新一轮代码检索与 Reasoning（§6.0）**提出 Round 3 三个 executional-qna（Q5 profile manifest 与构建配方 / Q6 instance registry 与 policyFingerprint / Q7 四 L2 契约面与错误台账单一真源），逐题标驱动真相、各含 4 组信息；Round 4+ 仍未预设 |
| v0.4 | 2026-11-14 | `DNLS01 架构 agent（lead）` | [业主] 全数同意 Round 3 推荐：Q5/Q6/Q7 冻结为 `T-O-13`/`T-O-14`/`T-O-15`，补写 §6.5 中场评估 III（含**「第 4 轮能否收口」判断**）；基于**新一轮代码检索与 Reasoning（§7.0）**提出 Round 4 三个 executional-qna（Q8 CDP socket 生命周期 / Q9 terminal driver 与工具面公共契约 / Q10 对等验收与收口判据），逐题标驱动真相、各含 4 组信息；Round 5+ 仍未预设 |
| v0.5 | 2026-11-14 | `DNLS01 架构 agent（lead）` | **STEP.1 全文一致性审查**（含独立对抗复核）：识别并登记 R-1 两/三门禁时点差、R-2 errorId 命名空间欠登记、R-3 待登记语气失效、R-4 历史数字时点；**STEP.2** 修复上述叙事不一致 / 欠更新 / 欠登记，冻结 Q8/Q9/Q10 → `T-O-16`/`T-O-17`/`T-O-18`（§1 共 18 条），补写 §7.5 中场评估 IV 与 §8 收口复核；**STEP.2 补修**（独立对抗复核追加的 3 个阻塞项）：R-5 登记 `policy-stale` / `page-lost` 两个新增 errorId 全名 / 命名空间 / 状态码、`T-O-18` ① 增列第七类资源治理用例、统一 20/20 基线 / G1–G8 章节 / lock 口径 / 断链路径；**STEP.3** 状态已翻转为 `frozen` 并通知 [业主] |
