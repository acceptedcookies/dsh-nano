# `PRE-1116` — QnA Truth Ledger

> **Ledger ID**：`PRE1116-TRUTH`
> **范围**：performance-review-enhancement 下一阶段（DNPR 升级与消债）的已冻结真相（只列已有 ID：`T-O-PRE1116-B01`–`B11` 与 `T-O-PRE1116-01`–`13`，共 24 条；其中 `01`–`13` 含 99 条细则）
> **文档性质**：`frozen-truth ledger / compact consumption entry`（问答是 decision provenance；本文不是第二真源）
> **状态**：`🔒 FROZEN · baseline 11 条 + foundational 4 条（Q1–Q4）+ executional 9 条（Q5–Q13）· Q1–Q13 全选 B · NOT IMPLEMENTATION CLOSURE · NOT IMPLEMENTATION GRANT`
> **日期**：`2026-11-16`
> **Owner decision provenance**：[`PRE-1116-qna.md`](./PRE-1116-qna.md)（Baseline `B01`–`B11` 随文件冻结 + Round 1–5 逐轮「同意推荐 B」；Q1/Q2→`01`/`02`，Q3/Q4→`03`/`04`，Q5–Q7→`05`–`07`，Q8–Q10→`08`–`10`，Q11–Q13→`11`–`13`；second-opinion 全程 `retired`）
> **上游已冻法律（只 CITE，本文不 supersede）**：[`contract-and-facade-1115-qna.md`](./contract-and-facade-1115-qna.md) 的门面边界（PRE 问答点名 `:401`、`:680`：不因归口把性能库并进门面；`dsh-interface` host 出口不持跨实例全局态）、CF1115 已冻失败五类、仓根 `AGENTS.md` 核心原则与 worktree 约定
> **形成史输入（测量，不裁决）**：[`PRE-1116-initial-assessment.md`](./PRE-1116-initial-assessment.md)（初评；42 项台账与 D1–D9 是证据，其中的推荐不是合同）、问答内各轮中场评估与 `file:line` 调查
> **Review HEAD**：`77955e5`（问答基线 `main @ 77955e5`；行号为该时点快照，漂移时以「路径 + 符号名」为准）。`e228445` 复核时，被引用的代码与规格文件相对该基线无 diff。
> **远端 / paid**：`none`（`remote_ops=0`）

## 0. 权威边界（必须有）

本文是 [`PRE-1116-qna.md`](./PRE-1116-qna.md) 的精炼消费入口，也是下游直接 CITE 的引用面。本文：

1. 只登记 [业主] 已经接受的 `T-O-PRE1116-B01`–`B11` 与 `01`–`13`，连同问答 §1.2 的 `01.1`–`13.6`。不新建 Truth-ID，不改变 [业主] 结论，不把摘要升级成新法律。
2. 不保留问题解读、候选方案、推荐论证、证据表或中场推演。这些留在问答原文。
3. 与问答的台账、§1.3 读法或业主回答不一致时 fail-closed，以问答为 provenance，并修订本台账。
4. 下游只能引用或细化本台账；细化不得改写规则句。不得把未选中的选项（维持手写、运行时旁观、门面内建、v1 原地扩展、双轨、按插件逐个迁移、宿主 span 全留或全废、维持现有 5 包依赖、把 [DNMSC] 纳入等），或已被 §1.3 改读的暂行句，再当成现行合同。
5. `FROZEN` 不表示代码已改、测试已绿、基线已重录、spec 已升 rev5、或 worktree 已合并。
6. 本文不构成 implementation、build、deploy、secret、provider 或任何远端动作的 grant。不新增 release-gate，不改 `RELEASE.md`。
7. 测量层是当时的 HEAD 事实，`T-O` 是目标态。施工落地后不回改测量层。问答里的「11 个」「22 个」是时点计数，不是合同；「四份」「8 个插件」「约 6 个入口」仍是合同，现行外延以 `13.6`、`13.3` 为准。
8. 推翻任一旧行，只能在原问答里 append-only supersession。不得改旧行，不得在下游文档里改写，不得回改更早的台账。

### 0.1 总体裁决（必须有）

```text
baseline     T-O-PRE1116-B01..B11:   FROZEN（随 PRE-1116 问答冻结，2026-11-16）
foundational T-O-PRE1116-01..04:     FROZEN（Round 1–2，业主逐轮同意推荐 B）
executional  T-O-PRE1116-05..13:     FROZEN（Round 3–5，业主逐轮同意推荐 B）
OPEN owner decisions:                0（无 Round 6；§1.3 留口已全部关闭或标成实现细项）
足以写下游计划:                       YES（PRE-1116 计划只 CITE 本台账）
足以签发 implementation grant:        NO
remote / deploy / live:              NOT CLAIMED
```

```text
PRE-1116-qna.md（已冻结，decision provenance）
  → 本台账（引用面，只投影已选中那一格）
  → PRE-1116 计划（只 CITE；不填写 Q/A，不改规则句）
  → （另立）ImplementationGrant
```

## 1. Truth-Gate 总表（必须有）

> 一行一个已有 ID。内核只写已选中的那一格，不写落选项。细则在 §2 按原序号投影。

| Truth-ID | 领域 | 冻结核心 | 来源 |
|----------|------|----------|------|
| `T-O-PRE1116-B01` | 范围 | 阶段名 `PRE-1116`；初评是证据不是合同 | Baseline |
| `T-O-PRE1116-B02` | 计量 | 计量核心保留不重写 | Baseline |
| `T-O-PRE1116-B03` | 判据 | 仓根五原则 + 本阶段四原则 | Baseline |
| `T-O-PRE1116-B04` | 边界 | DNPR 独立；门面只接受注入，不 import DNPR | Baseline |
| `T-O-PRE1116-B05` | 职责 | DNPR 不是错误真源，也不是审计权威；五类失败不另造 | Baseline |
| `T-O-PRE1116-B06` | 行为 | 未注入时行为不变；观测失败不改变插件行为 | Baseline |
| `T-O-PRE1116-B07` | 隐私 | 不外发、不装 OTel、不记内容与 session id | Baseline |
| `T-O-PRE1116-B08` | 非目标 | 请求级配对在另行裁决前仍是非目标 | Baseline |
| `T-O-PRE1116-B09` | 门禁 | 不扩大硬门禁；新指标先进 audit | Baseline |
| `T-O-PRE1116-B10` | 事实 | D1–D9 是事实输入，不再复议 | Baseline |
| `T-O-PRE1116-B11` | 退役 | [DNK]→[DNLS] 性能通道只退役，不改造 | Baseline |
| `T-O-PRE1116-01` | 接入 | 观测以合同面为主轴，经 CF1115 门面注入 | Round 1 / Q1-B |
| `T-O-PRE1116-02` | 报告 | 报告一次硬切到 schema v2；判定收进包内；读与切窗分离 | Round 1 / Q2-B |
| `T-O-PRE1116-03` | 宿主读面 | DNPR 提供只读全进程视图，多入口挂载；游标取代排空 | Round 2 / Q3-B |
| `T-O-PRE1116-04` | 声明作者 | 判定依据由每插件性能声明作者，构建期烘焙；DNPR 与 lab 中立 | Round 2 / Q4-B |
| `T-O-PRE1116-05` | 身份 | 合同面身份由路由账本作者；host、浏览器、MCP 共用同一个 id | Round 3 / Q5-B |
| `T-O-PRE1116-06` | 事件 | 四门面共用一份观测事件合同；`onCall` 退役 | Round 3 / Q6-B |
| `T-O-PRE1116-07` | 多拷贝 | 协议主版本隔离单例；构建戳取代手写版本；同协议不迁移状态 | Round 3 / Q7-B |
| `T-O-PRE1116-08` | v2 形状 | 报告按来源分区；页面只有读与切窗；宿主按样本序号游标界定窗口 | Round 4 / Q8-B |
| `T-O-PRE1116-09` | 声明格式 | 每插件一份 JSON 加场景驱动；运行时只带键名、目标桶与声明哈希 | Round 4 / Q9-B |
| `T-O-PRE1116-10` | 读取路由 | 宿主读取路由统一落地；写盘器与 [DNK] 第二读取面退役 | Round 4 / Q10-B |
| `T-O-PRE1116-11` | 交付 | 三个按序 worktree：W1 未使用的观测口，W2 身份，W3 一次硬切 | Round 5 / Q11-B |
| `T-O-PRE1116-12` | 逐点 | 9 个手写宿主 span 按一条规则处置；动态名封闭；采集开关只认运维入口 | Round 5 / Q12-B |
| `T-O-PRE1116-13` | 范围 | 6 个合同面插件接入；3 个读取入口；四项非目标；spec rev5 为机制唯一文档 | Round 5 / Q13-B |

## 2. 规范内核（必须有）

> 按业务簇分组。每条只有来源与已冻结的内核；不落选项、不搬推荐理由、不搬证据表。
> 密度跟源头走：`B01`–`B11` 是一句到几句，收成短段；`01.1`–`13.6` **原样投影**问答台账里的序号，因为下游会点名。

### 2.1 基线（随问答冻结）

#### `T-O-PRE1116-B01` —— 阶段与证据地位
> **来源**：业主本轮指令；初评 §0、§8 ｜ **驱动后续**：后续各轮的约束，不是新裁决

本阶段名为 `PRE-1116`。工作对象是初评 §3 台账（42 项）与 §8 P0/P1/P2 工作项。初评是证据输入，不是合同；写进初评的推荐不因此生效。

> **下游约束**：计划只能引用 [`PRE-1116-qna.md`](./PRE-1116-qna.md) 冻结的 T-O 作为方向依据。

#### `T-O-PRE1116-B02` —— 计量核心不重写
> **来源**：初评 §9、S1；`client.js:246-269`、`aggregate.js:51-100`、`client.js:104-184`；DNPR 单测 63/63 ｜ **驱动后续**：后续各轮的约束，不是新裁决

DNPR 的计量核心保留、不重写：Event Timing 按 `interactionId` 归并与三段、span 区间并集、窗口归因、`root()` 最深者胜。

> **下游约束**：增强只改外壳（身份、接入、送达、报告），不推翻计量算法。

#### `T-O-PRE1116-B03` —— 判据
> **来源**：仓根 `AGENTS.md` 核心工作原则；业主本轮指令 ｜ **驱动后续**：后续各轮的约束，不是新裁决

判据是仓根五原则（插件中立、上层建筑归 host、不得侧载、单一真源、不得擅自扩约）加上本阶段四原则：能硬切就不双写、能彻底退役就不兼容、平台保持中立、不耦合私域。

> **下游约束**：每题推荐须逐条过此判据。

#### `T-O-PRE1116-B04` —— DNPR 保持独立，观测只注入
> **来源**：`contract-and-facade-1115-qna.md:401`、`:680`；`packages/dsh-interface/AGENTS.md` 三出口纪律（host 出口「不得持有跨实例全局态」） ｜ **驱动后续**：后续各轮的约束，不是新裁决

DNPR 保持独立构建期共享库，不并入 `dsh-interface`。`dsh-interface` 与 `dsh-host-route-guard` 不 import DNPR。观测能力只能以参数注入门面。

> **下游约束**：任何门面观测方案必须是注入式，门面零 DNPR 依赖。

#### `T-O-PRE1116-B05` —— DNPR 不是错误真源，也不是审计权威
> **来源**：`contract-and-facade-1115-eval.md:187`；`packages/dsh-interface/src/contracts/jsonOutcome.js`；`dsh-nano-model-selector/AGENTS.md`「账本唯一写入方是 companion bundle」 ｜ **驱动后续**：后续各轮的约束，不是新裁决

DNPR 的职责是观测与聚合。它不是业务错误合同真源，也不是 durable 审计权威。失败分类沿用 CF1115 已冻的五类（`cancelled` / `transport` / `http` / `protocol` / `domain`），不另造错误枚举。[DNMSC] 账本仍由 companion bundle 唯一写入。

> **下游约束**：DNPR 只读计时与结果，不复制决策记录、不成为错误真源。

#### `T-O-PRE1116-B06` —— 观测不改行为
> **来源**：`spec-26nov.md:24`；初评 §1.2 ｜ **驱动后续**：后续各轮的约束，不是新裁决

关闭时为恒等包装、零成本。观测失败不得让插件卸载或改变行为。预算失败只影响 lab 退出码。

> **下游约束**：任何新钩子都必须证明未开启、未注入时行为不变。

#### `T-O-PRE1116-B07` —— 隐私与本机边界
> **来源**：`spec-26nov.md:28-33` ｜ **驱动后续**：后续各轮的约束，不是新裁决

不外发、不装 OTel、不接 session-telemetry / product-analytics。不记录按键内容、文件路径、session id、提示词。

> **下游约束**：新增证据字段必须脱敏；新访问面只读本机。

#### `T-O-PRE1116-B08` —— 请求级配对仍是非目标
> **来源**：`spec-26nov.md:36` ｜ **驱动后续**：后续各轮的约束，不是新裁决

浏览器与宿主的请求级配对，在另行裁决前仍是非目标。

> **下游约束**：本轮题目不预设关联方案。

#### `T-O-PRE1116-B09` —— 门禁分层
> **来源**：`spec-26nov.md:277-289`；`lab/budgets.mjs:43,56` ｜ **驱动后续**：后续各轮的约束，不是新裁决

硬门禁只留低方差结构项。新指标先进 audit，稳定后才可提为硬门禁。

> **下游约束**：本阶段不得扩大硬门禁范围（业主另批除外）。

#### `T-O-PRE1116-B10` —— D1–D9 是事实，不再复议
> **来源**：初评 §3、§6 ｜ **驱动后续**：后续各轮的约束，不是新裁决

初评已核实的 D1–D9 作为事实输入，事实本身不再复议。D1 [DNK] 每 10 秒破坏性 `report()`（`dsh-nano-kitesurf/src/client/index.js`）；D2 [DNK] 打开全进程宿主观测（`dsh-nano-kitesurf/index.js`）；D3 `configure()` 先到先得且不校验（DNPR `client.js`）；D4 contributors 无界（DNPR `client.js`）；D5 宿主错误只认 throw（DNPR `host.js`，反例 [DNMS] `index.js`）；D6 宿主 errors/events 止于合并层（DNPR `aggregate.js`）；D7 `LIB_VERSION` 恒定（DNPR `state.js`）；D8 宿主单例升级丢状态（DNPR `host.js`）；D9 lab 残留退役场景（`lab/scenarios.mjs`、`lab/budgets.mjs`）。行号留在问答。

> **下游约束**：修复路径由后续题决定，事实本身不再复议。现行关闭点见 `AF-7`，不把「后续题」读成仍未决。

#### `T-O-PRE1116-B11` —— 插件间性能通道只退役
> **来源**：仓根 `AGENTS.md`「不得侧载」；初评 L-B03、FC-3 ｜ **驱动后续**：后续各轮的约束，不是新裁决

[DNK]→[DNLS] 的性能数据通道（[DNK] `configure` 指向 [DNLS]，POST 到 `dsh-nano-local-sandbox/src/host/routes.js:1137-1146`）是插件间专有通道。按「不得侧载」，它只有退役，没有改造或兼容。

> **下游约束**：计划中该通道只有退役项，没有改造项。


### 2.2 观测接入与报告合同（foundational）

#### `T-O-PRE1116-01` —— 观测以合同面为主轴，经 CF1115 门面注入
> **来源**：Round 1 / Q1（[业主] 2026-11-16 同意推荐 B） ｜ **驱动后续**：Q3、Q4

| 条款 | 已冻结内核 |
|------|------------|
| `01.1` | route-guard `createGuard`、`createWebRegistrar`（含 prefix 与 upgrade）、`createJsonClient`、`createMcpToolset` 各增一个可选观测注入口；这是经 [业主] 批准的公共合同扩展，本条是唯一登记。 |
| `01.2` | 门面纪律：可选纯回调；未注入时行为与现状等价（先补测试再改代码）；回调异常被门面吞掉、不影响响应；门面不 import DNPR、不持全局态。 |
| `01.3` | 观测身份取自门面的声明记录（registrar binding、guard 表行、jsonClient operation、MCP tool schema），DNPR 不从 URL/路径/工具名文本反推；键格式，以及表行和浏览器 operation 缺少稳定 id 时的补法，留给 executional 轮。 |
| `01.4` | 结果取门面已掌握的真实结果：guard 四条出口（rejection、405、正常返回的 statusCode、throw→500）、JsonOutcome 五类、MCP `isError`+`kind`；不另造枚举。 |
| `01.5` | DNPR 提供门面可直接接收的观测适配器；合同面行与手写 span 分属不同命名空间、各自配额。 |
| `01.6` | 插件接入收敛为一次声明加统一的浏览器 join helper；四份 `src/client/perf.js` 样板与 [DNK] 手写懒 join 退役。 |
| `01.7` | 与合同面整面重合的手写 `hostSpan` 硬切退役、不双写（候选：[DNMS] `catalog`、[DNN] `read`/`save`，逐个判定在 executional 轮）；子阶段 span 与浏览器 UI 内部 span/track/count 保留。 |
| `01.8` | 共享包零插件名：交互目标桶改为插件声明，删除 `BUCKET_ATTRS` 中的插件属性（含退役的 `data-nano-shared-workspace`）。 |
| `01.9` | 现有 `onCall` 是否并入统一观测口，在 executional 轮按「能彻底退役就不兼容」判定 |

> **下游约束**：计划 §2；spec rev5；门面 JSDoc 只 CITE 本条

#### `T-O-PRE1116-02` —— 报告合同一次硬切到 schema v2；判定收进包内；读与切窗分离
> **来源**：Round 1 / Q2（[业主] 2026-11-16 同意推荐 B） ｜ **驱动后续**：Q3、Q4

| 条款 | 已冻结内核 |
|------|------------|
| `02.1` | `REPORT_VERSION` 1→2 在同一变更集内切换，同批改完全部仓内读者（`lab/{run,scenarios,budgets,candidates,diagnose-inp,diagnose-render}.mjs`、`lab/baseline/baseline.json`、`markdown.js`、DNPR 测试、[DNK]/[DNLS] e2e）；不留 v1 读取分支、不写转换器；基线按三次稳定性运行重录。 |
| `02.2` | v2 设计轴：agent 是第一读者；键稳定、自解释；notes 只在相关时出现并带稳定 id；带证据（最慢交互、最重帧、宿主错误与事件、结构异常对象）；分位数行标明 window/cumulative 与样本数；合同面行独立成区；体积上限 256 KB。 |
| `02.3` | 判定单一真源是 DNPR 包内纯函数 `diagnose()`；`lab/budgets.mjs` 的 `evaluate` 改为调用它，lab 只保留退出码与 I/O；硬门禁/audit 分层原样迁入，本决定不改阈值。 |
| `02.4` | 读与切窗是两个显式动词：读无副作用，任何读者可用；切窗只用于 lab 场景边界，插件代码禁止调用并由测试拦截；`report()` 的「读即清窗」语义退役，不留同名别名。 |
| `02.5` | v1/v2 多拷贝共存必须被识别并在结构计数里报出，与 D7/D8 修复同批交付。 |
| `02.6` | 初评台账调整：P0-09 取消并入 v2；P0-01 改为两动词方案；P2-01~P2-04 的前置改为本条。 |
| `02.7` | 留给 executional 轮：v2 字段形状、动词名、findings 结构、`diagnose()` 是否进浏览器产物（用 `--measure-footprint` 量化）；阈值与期望的作者源交 Round 2 Q4 |

> **下游约束**：计划 §2；spec rev5 §6.5

### 2.3 宿主读取面与判定作者（foundational）

#### `T-O-PRE1116-03` —— 宿主数据由 DNPR 提供只读全进程视图，多入口挂载；宿主侧以游标取代排空
> **来源**：Round 2 / Q3（[业主] 2026-11-16 同意推荐 B） ｜ **驱动后续**：Q5、Q7

| 条款 | 已冻结内核 |
|------|------------|
| `03.1` | 宿主读取实现只有一份，在 DNPR 宿主出口（只读 handler 加注册声明片段），返回全进程宿主快照，形状服从 `02`（v2）。 |
| `03.2` | 每个有页面植入的插件在自己前缀下挂载这条路由，经 guard/registrar 注册（自动受鉴权围栏与 `01` 观测约束）；每个入口在 `security/route-sensitivity.json` 登记一行 `read:host`、不绑定 session；只做宿主的插件不挂载，它们的行经全进程快照可见；[DNK] 是否挂首条宿主路由留给 executional 轮。 |
| `03.3` | 页面单例多源接入：各插件 join 时登记自己的入口；对返回做形状校验，不合格计入结构计数；同一时刻只轮询一个健康入口；「先到先得」退役。 |
| `03.4` | 宿主侧取消排空：`takeWindow()` 退役、不留兼容；窗口由读者传入的单调游标界定；宿主侧没有切窗动词；多读者互不干扰；游标形状、样本保留上限与游标失效语义留给 executional 轮。 |
| `03.5` | 同批退役：[DNEE] 现路由的 `mode=window` 语义与独占地位；[DNLS] `/perf-review/host`、`/perf-report` 两条路由、代码与路由表行（`B11`）；[DNK] 指向 [DNLS] 的 `configure` 与 10 s 推送；[DNMS]/[DNN]「[DNEE] 负责轮询」的隐式依赖。 |
| `03.6` | 敏感度：不新增数据类别；L-E04 的已接受发现从「排空全进程」改为「只读全进程」，路由表 justification 随之更新。 |
| `03.7` | 留给 executional 轮：路由路径名、页面轮询频率、`host.json`/`host-snapshots.jsonl` 写盘器的去留 |

> **下游约束**：计划 §2；spec rev5；`security/route-sensitivity.json`

#### `T-O-PRE1116-04` —— 判定依据由每个插件的性能声明作者，构建期烘焙；DNPR 与 lab 插件中立
> **来源**：Round 2 / Q4（[业主] 2026-11-16 同意推荐 B） ｜ **驱动后续**：Q5、Q7

| 条款 | 已冻结内核 |
|------|------------|
| `04.1` | 每个插件一份性能声明，是本插件下列四类内容的唯一作者源：手写观测键（span/track/usage 名与 track kind）、插件级预算行（标明 hard/audit）、场景归属与期望、交互目标桶；合同面只引用身份、不复述。 |
| `04.2` | 植入代码从烘焙出的常量取名，不在调用处另写字符串；每个插件的测试做三方对账（声明 ↔ 实际植入调用 ↔ 门面 inventory），任何一方不一致都让测试失败。 |
| `04.3` | 声明在构建期按 `dsh-interface/build` 的确定性方式烘焙进 `lib/`；报告能识别所用声明的版本。 |
| `04.4` | DNPR `diagnose()` 只内置插件中立的页级规则；插件级规则全部来自声明；DNPR 与 lab 源码中不出现任何插件名。 |
| `04.5` | lab 的场景列表与预算由声明生成；`lab/budgets.mjs`、`lab/scenarios.mjs` 中写死的插件名单退役，D9 随之根治。 |
| `04.6` | `spec-26nov.md` §6.7 植入表与 §7 插件级行退役，改为指向各插件声明；spec 只保留机制与页级规则。 |
| `04.7` | 阈值与门禁级别原样迁移（`B09`）；验收口径是旧 `evaluate` 与新 `diagnose()` 对同一批基线结论一致。 |
| `04.8` | 留给 executional 轮：声明的文件名、字段与格式；声明是否随浏览器产物发布（与 `02.7` 一并用 `--measure-footprint` 量化） |

> **下游约束**：计划 §2；spec rev5 §6.7/§7

### 2.4 身份、事件与多拷贝（executional）

#### `T-O-PRE1116-05` —— 合同面身份由路由账本显式作者，host、浏览器、MCP 三侧共用同一个 id
> **来源**：Round 3 / Q5（[业主] 2026-11-16 同意推荐 B） ｜ **驱动后续**：Q8、Q9、Q10

| 条款 | 已冻结内核 |
|------|------------|
| `05.1` | `security/route-sensitivity.json` 每行增加 `id`、`channel`、`match` 三个字段，账本完整描述全部 web 合同面（含 [DNN] fx/sdk prefix 行、[DNT] upgrade/prefix 行）；`id` 与 `sensitivity` 同属人工审定字段，`scripts/gen-route-sensitivity.mjs` 合并时保留（沿用 `:7` 机制）。 |
| `05.2` | id 是语义名 `<插件缩写>.<面名>`（小写、点分）；初值沿用已在用的 `dnee.*`、`dnn.*`、`dnt.*`，其余插件一次性命名，由 [业主] 抽查；命名后不随路径变化，改名即视为新面。 |
| `05.3` | 8 个插件统一经 `bindingTableModule` 从账本烘焙带 id 的 `lib/bindings.js`；同批退役 [DNEE] 路径推导（`build-client.mjs:26-29`）、[DNN]/[DNT] 手写 `lib/bindings.js`（改为生成物）、`routeTableModule` 与各插件 `lib/route-table.js`。 |
| `05.4` | guard 路由记录增加 `id`（`route-guard.js:211-220`），registrar 沿用 `binding.id`；两条注册路径的观测事件都携带它。 |
| `05.5` | 浏览器产物只烘焙本插件的 binding id 常量（仅 id 与 path）；operation 记录必须携带 `bindingId`；缺 id 的 operation 不按 URL 建键，只计入结构计数。 |
| `05.6` | MCP tool 身份就是 schema 方法名，schema 是唯一作者。 |
| `05.7` | 合同面行键使用独立规则（允许点分，示意 `^[a-z0-9][a-z0-9.-]{0,63}$`），与手写 span 的 `NAME_RE`（`state.js:13`）分开。 |
| `05.8` | 账本 id 即将来 `FamilyDefinition` 的 `bindingId`；某插件迁入合同族时作者源按 `FamilyDefinition.js:23-24` 转移一次，id 不变，观测历史不断。 |
| `05.9` | `security/route-inventory.md` 的生成与各包 AGENTS 的路由说明同批更新 |

> **下游约束**：计划 §2；`security/route-sensitivity.json` 字段说明；`dsh-interface/build` JSDoc

#### `T-O-PRE1116-06` —— 四门面共用一份观测事件合同；`onCall` 退役
> **来源**：Round 3 / Q6（[业主] 2026-11-16 同意推荐 B） ｜ **驱动后续**：Q8

| 条款 | 已冻结内核 |
|------|------------|
| `06.1` | `createGuard`、`createWebRegistrar`、`createJsonClient`、`createMcpToolset` 的可选观测参数统一命名为 `observe`；事件形状与结果闭集作为纯定义放在 `dsh-interface/contracts`，DNPR 只消费、不定义。 |
| `06.2` | 事件字段集为 `{surface, id, plugin, outcome, ms, status?, kind?}`，`surface ∈ http / upgrade / json / mcp`，`id` 取 `05`；事件**不**携带 URL、query、请求正文、header、session id、错误消息文本（`B07`）。 |
| `06.3` | 结果闭集：`http` = `ok / rejected / method / failed`；`upgrade` = `accepted / rejected / method`；`json` = `ok` 或 `FAILURE_KIND` 五类（`B05`）；`mcp` = `ok / error（带 kind）/ rejected`。闭集是公共合同，新增值须 [业主] 批准。 |
| `06.4` | 每次调用结束时同步调用一次 `observe`，不 await；回调异常被门面吞掉；计时用 `globalThis.performance.now()`，不引入 `node:*`；`ms` 计到 handler/调用返回为止，SSE 等长连接只计建立段，门面不推断连接寿命。 |
| `06.5` | 未注入时门面不读时钟、不构造事件；先补「未注入时响应逐字一致」的测试，再改代码（`01.2`）。 |
| `06.6` | `onCall` 退役，不留别名，JSDoc 同步删除；[DNT] 自有审计不受影响。 |
| `06.7` | `http` 面 `ok` 只表示 handler 没有 throw；读者必须同时看 `status`，v2 报告按状态类分维度呈现（交 Round 4 Q8） |

> **下游约束**：计划 §2；`dsh-interface/contracts` 定义文件；四门面 JSDoc 只 CITE 本条

#### `T-O-PRE1116-07` —— 多拷贝协议：协议主版本隔离单例，构建戳取代手写版本，同协议不迁移状态
> **来源**：Round 3 / Q7（[业主] 2026-11-16 同意推荐 B） ｜ **驱动后续**：Q8、Q9、Q10

| 条款 | 已冻结内核 |
|------|------------|
| `07.1` | 页面 `window.__perfReview` 与宿主 `globalThis.__perfReviewHost` 两个键退役，改为带协议主版本的键（示意 `__dnpr_v2` / `__dnprHost_v2`，名字实现时定）；v2 代码不读取、不修改、不升级旧键上的对象。 |
| `07.2` | v2 单例安装时检查旧键，存在即在结构计数记一条（示意 `legacyCopies`），在 v2 报告与 `diagnose()` findings 中可见（`02.5`）；旧拷贝照常按旧协议运行。 |
| `07.3` | 同协议内先到者提供实现，后到者复用；宿主就地升级分支（`host.js:315-345`）整体退役；同协议对外 API 只增不改，不兼容改动即协议号 +1（下一次硬切）。 |
| `07.4` | 各插件构建时经 esbuild define 注入 DNPR 源码内容哈希作为构建戳（沿用 `__NXE_VERSION__` 先例）；`LIB_VERSION`、join/hostJoin 的 `libVersion` 参数、`observerVersion` 字段退役、不兼容；lab 版本指纹改用协议号与构建戳。 |
| `07.5` | contributors 按 `pluginId@build` 去重存储（修 D4）；报告列出各插件构建戳与声明哈希（`04.3`）；同协议出现多于一个构建戳即一条 audit 级 finding「同协议倾斜」。 |
| `07.6` | 页面与宿主两侧单例使用同一套协议键与构建戳规则；`03.3` 的多源接入在 v2 单例内部实现。 |
| `07.7` | 内容哈希的计算范围在实现时固定，并由测试锁定「同一份源码得到同一个戳」 |

> **下游约束**：计划 §2；DNPR README；8 个插件构建脚本

### 2.5 读侧合同：报告、声明、路由（executional）

#### `T-O-PRE1116-08` —— v2 报告按来源分区；页面只有读与切窗两个动词；宿主按样本序号游标界定窗口
> **来源**：Round 4 / Q8（[业主] 2026-11-16 同意推荐 B） ｜ **驱动后续**：Q11、Q12

| 条款 | 已冻结内核 |
|------|------------|
| `08.1` | 顶层 `schema: "dnpr.report/2"`；分区为 `meta`、`page`、`plugins.<id>.{hand, contract, host}`、`evidence`、`structure`、`notes`；`meta` 含 `protocol`、`contributors[{plugin, build, decl}]`、`window{startedAt, ms}`、`host{source, epoch, from, to, truncated}`。 |
| `08.2` | 每个分位数行带 `basis`（`window` / `cumulative`）与 `n`；合同面行按 `06.3` 闭集计 `outcomes`，并按状态类 `2xx/3xx/4xx/5xx` 计数（落实 `06.7`）；`host` 行带 `errors`（修 D6）。 |
| `08.3` | `evidence` 为固定上限数组（示意：交互 5、帧 5、宿主错误 20）；超过 256 KB 时先裁证据并计 `structure.oversize`；`structure` 新增 `legacyCopies`、`badShape`、`missingBindingId`、`oversize`。 |
| `08.4` | 说明只在相关时输出，带稳定 id；无条件说明（`aggregate.js:239-243`）移入 DNPR 说明词表。 |
| `08.5` | 判定不进报告：`diagnose(report, {declarations, baseline})` 是 DNPR 的 Node 侧纯函数出口，返回 `{verdict, findings[{id, gate, plugin, subject, value, limit, basis}]}`；浏览器产物不含 `diagnose` 与预算表。 |
| `08.6` | 页面动词：`read(meta?, {host?})` 无副作用；`cutWindow()` 清空窗口累加器（含 usage 窗口列）并前移宿主起点游标，只允许 lab 调用，插件源码出现即测试失败；`report`、`reset`、`resetCounters`、`configure`、`setHostSnapshotProvider` 退役、不留别名；usage 报 `window` 与 `total` 两列。 |
| `08.7` | 宿主游标 `{epoch, seq}`，序列化为 `"<epoch>.<seq>"`；`epoch` 在单例创建时随机生成；`seq` 进程内单调，手写 span 与合同面事件共用；样本与事件都带 `seq`；容量沿用现值（窗口 512、reservoir 64、事件 32）。 |
| `08.8` | 带 `since` 时返回 `seq > since` 的样本（`basis = window`），不带时返回累计视图（`basis = cumulative`），两者都返回 `next`；`epoch` 不符时返回累计视图并标 `truncated: ['epoch']`；某键缓冲已丢掉 `since` 之后的样本时，该键标截断并给出丢失条数，`diagnose()` 产出 audit 级 finding；以上都返回 200；游标格式不合法返回 400；宿主没有切窗动词。 |
| `08.9` | lab 流程：开始时 `cutWindow()` 并记下宿主 `next`；结束时取 `?since=<起点>` 视图传给 `read()`；`diffHostSnapshots`、`mergeHostSnapshot` 退役 |

> **下游约束**：计划 §2；spec rev5 §6.5；DNPR README

#### `T-O-PRE1116-09` —— 性能声明是每插件一份 JSON 加场景驱动模块；运行时只带键名、目标桶与声明哈希
> **来源**：Round 4 / Q9（[业主] 2026-11-16 同意推荐 B） ｜ **驱动后续**：Q11、Q12、Q13

| 条款 | 已冻结内核 |
|------|------------|
| `09.1` | 位置 `src/perf/declaration.json`，顶层带 `schema: "dnpr.declaration/1"` 与 `plugin`；DNPR 纯函数 `validateDeclaration()`（无 I/O）由构建与 lab 先行校验，校验失败即构建失败。 |
| `09.2` | 字段：`keys{spans, tracks[{name, kind}], usage, hostSpans}`、`buckets[{attr, bucket}]`、`contract[id…]`（只引用 `05`）、`scenarios[{id, driver}]`、`budgets[{id, scenario, subject, rule, gate}]`。 |
| `09.3` | 规则闭集为 `max`、`min`、`eq`、`relBaseline{factor, floor, initial}`，加可选 `minSamples`；`gate ∈ hard / audit`；词汇归 DNPR，扩展走 DNPR 变更，不在 lab 临时写。 |
| `09.4` | 通用页级规则与通用插件级红线（`native.*` ≤ 50 ms、≥ 8 样本）内置于 `diagnose()`；按轨道名写死的规则（`lab/budgets.mjs:204-252`）全部迁入对应插件的声明。 |
| `09.5` | 进运行时：键名常量、交互目标桶（join 时登记，取代 `BUCKET_ATTRS`）、声明哈希（esbuild define，进入 `contributors.decl`）；不进运行时：`budgets`、`scenarios`、`contract`。 |
| `09.6` | 体积变化用 `--measure-footprint` 量化并写入计划；`nanoCombined.clientJsBytes ≤ baseline × 1.1` 硬门禁照常生效，不新增门禁（`B09`）。 |
| `09.7` | 三方对账由 DNPR `test-helpers` 的插件中立助手完成：植入代码引用的键名常量集合必须等于声明键集合；`contract` 中每个 id 必须存在于本插件的绑定表或 MCP schema。 |
| `09.8` | lab 枚举各插件声明生成场景列表；页级场景 `idle-10s`、`composer-type`、`observer-purity` 留在 lab；插件场景步骤从声明引用的驱动模块载入；`lab/{budgets,scenarios,run}.mjs` 中插件名与轨道名清零；驱动接口形状在实现时定 |

> **下游约束**：计划 §2；spec rev5 §6.7/§7；DNPR README

#### `T-O-PRE1116-10` —— 宿主读取路由统一落地；写盘器与 [DNK] 的第二读取面退役
> **来源**：Round 4 / Q10（[业主] 2026-11-16 同意推荐 B） ｜ **驱动后续**：Q11、Q12、Q13

| 条款 | 已冻结内核 |
|------|------------|
| `10.1` | 路径 `GET /<插件前缀>/perf-review/host`，账本 id `<缩写>.perf-review.host`，capability `read:host`、不绑定 session；handler 与注册片段由 DNPR 宿主出口提供，经 guard/registrar 注册并产生 `06` 观测事件。 |
| `10.2` | 只接受 GET 与 `since` 参数；`mode` 及其他任何参数返回 400。 |
| `10.3` | 页面轮询每 5 秒一次，只在采集开启且页面可见时进行；同一时刻只轮询一个健康入口，连续失败后切到下一个；轮询带 `since`，起点随 `cutWindow()` 前移；lab 不依赖轮询。 |
| `10.4` | `host.json` 与 `host-snapshots.jsonl` 写盘逻辑、30 秒定时器、`beforeExit` 钩子、`flush()`、`structure.hostWriteErrors` 及其测试一并删除；DNPR README 与 `INTRODUCTION.md` 同步。 |
| `10.5` | [DNK] 不挂宿主路由，保持包合同「只登记技能，不注册页面路由」；页面上没有任何宿主入口时，报告 `meta.host.source = null` 并输出 `note.host-source-absent`。 |
| `10.6` | [DNK] `buildDiagnostics()` 中的 `perf` 字段、`src/host/perf.js` 的 `perfSnapshot` 导出、`traced` 中未定义的 `PERF_ROUTE` 分支同批删除。 |
| `10.7` | 账本同步：[DNEE] 行 justification 改为「只读全进程视图」；[DNLS] 两行随 `03.5` 删除；新增入口各登记一行 |

> **下游约束**：计划 §2；`security/route-sensitivity.json`；[DNEE]/[DNK] AGENTS

### 2.6 交付、逐点处置与范围（executional）

#### `T-O-PRE1116-11` —— 三个按序 worktree：W1 只落未使用的观测口，W2 落身份，W3 一次硬切
> **来源**：Round 5 / Q11（[业主] 2026-11-16 同意推荐 B） ｜ **驱动后续**：无（最终轮）

| 条款 | 已冻结内核 |
|------|------------|
| `11.1` | 分支只建在 `.agents/worktrees/`，合并后按 [业主] 要求删除。W1 `pre1116-facade-observe` 只落 `06`：`dsh-interface/contracts` 增加观测事件与结果闭集；四门面加可选 `observe`；`onCall` 退役、不留别名；先补「未注入时响应逐字一致」测试再改代码；重建消费方产物（含 [DNT] `lib/mcp.js` 的 `onCall` 副本）。本批不注入任何观测器，运行中的插件行为不变。W2 `pre1116-binding-ids` 只落 `05`。W3 `pre1116-dnpr-v2` 落 `07`–`10` 与 `12`、`13` 的全部落点，内部按 `11.5` 的顺序提交，整体一次合并。 |
| `11.2` | 顺序读法：`05` 的 id 是 `06` 事件被发出、被消费的前提，不是 W1 落地可选参数的前提。W1、W2 合并后仍无人调用 `observe`，不产生带 id 的事件。第一条带 id 的事件、合同面行、声明 `contract` 引用和读取路由 id 都在 W3，且 W3 不得早于 W1 与 W2 都已合并。三批之间没有双写期，产品代码不留 v1 分支。 |
| `11.3` | 前置清单按文件身份，不按 `git status` 条数：`security/route-sensitivity.json`、`scripts/route-scan.mjs`、`dsh-nano-model-selector/index.js`、`dsh-nano-model-selector/lib/route-guard.js`、`dsh-nano-model-selector/lib/route-table.js`、`dsh-nano-model-selector/src/host/route-table.js` 必须先由 [业主] 提交落地。题面「22 个文件」只是提问时的计数，不是合同。W1、W2、W3 都不得覆盖 [业主] 尚未提交的文件。W1 可以重建不在清单上的消费方产物；若 `observe` 必须写入清单上的 [DNMS] vendored guard，该重建推迟到清单落地之后，不在脏文件上覆盖。[DNMS] `catalog` 的处置在 W3，以已提交版本为准。 |
| `11.4` | W2 内容：账本补 `id`/`channel`/`match`；先交命名表由 [业主] 抽查，通过后再烘焙（`05.2`）；烘焙范围以 `13.6` 为准，不含 [DNMSC]；`routeTableModule` 与各 `lib/route-table.js` 退役；guard 记录带 `id`；`route-inventory.md` 与各包 AGENTS 路由说明同步（`05.9`）。验收：路由条数、方法、敏感度与改动前逐条相同。 |
| `11.5` | W3 内部顺序：① DNPR 核心（`07` 的协议键与构建戳，注入范围 `13.6`；`08`；`diagnose()` 与 `09.3` 词汇；`09.1`/`09.7`；`10.1`；`10.4`）。② 采纳范围内的插件：声明、键名常量、门面适配器、页面 join 改 v2、三份 `src/client/perf.js` 与 [DNK] 懒 join 退役（`13.6`）、`12` 与 `13`。③ [DNEE] `mode=window`、[DNLS] 两条 perf 路由、[DNK] `configure`/10 s 推送/诊断 `perf` 字段（`03.5`、`10.6`）。④ lab 改为声明驱动，读者按 v2 重写（`02.1`、`09.8`）。⑤ `11.7` 对照通过后删除旧 `evaluate`。⑥ 基线三次稳定性运行重录，`--measure-footprint`（`09.6`）。⑦ 文档落点 `13.5`。 |
| `11.6` | 验收只用现有检查，不新增 release-gate，不改 `RELEASE.md`，不定版本号与发布节奏。W1：`dsh-interface` 与 `dsh-host-route-guard` 单测，`node scripts/test-all.mjs --build`。W2：`gen-route-sensitivity`、`check-route-sensitivity`、`route-scan`、`check-clean-lib`，加路由逐条对照，`test-all --build`。W3：`test-all --build`、DNPR 单测、`lab --arm purity`、全部场景 `--repeats 3` 连续三次退出码 0、`--inject-delay`/`--inject-failure` 仍退出码 1 并点名、本机按 `RELEASE.md` 部署后在真实页面读一次 v2 报告与宿主视图。 |
| `11.7` | `04.7` 对照在删除旧 `evaluate` 之前做：同一机器、同一组场景，v1 产物与 v2 产物各 `--repeats 3`，按「旧规则 → 新规则 id」比较通过/失败，不比较数值；不一致即阻塞合并。结果表写入 PRE-1116 计划收尾记录，然后删除旧 `evaluate`。不写转换器。 |
| `11.8` | 三批都是真相层的交付形状，不是本次开工或合并的授权。 |

> **下游约束**：计划 §2 只 CITE 本条的批次、顺序与验收

#### `T-O-PRE1116-12` —— 一条规则处置全部 9 个手写宿主 span；动态名封闭；`traceId` 与插件采集开关退役
> **来源**：Round 5 / Q12（[业主] 2026-11-16 同意推荐 B） ｜ **驱动后续**：无（最终轮）

| 条款 | 已冻结内核 |
|------|------------|
| `12.1` | 判定规则写入 spec rev5，以后新增 span 按此判断，不再开 QnA：包住单一工作模式路由 handler 主体的（只差正文或会话解析）与合同面行是同一件事，硬切退役、不双写；多模式中的一种、多 action 中的一个、或不在路由里的后台/生命周期，是子阶段，保留，写入声明 `keys.hostSpans`。 |
| `12.2` | 退役 5 个，不得出现在 `keys.hostSpans`，改由 `contract` 引用对应路由 id，基线里的 `hostSpan.<name>` 随 `02.1` 重录消失：[DNMS] `catalog`、[DNN] `read`、[DNN] `save`、[DNEE] `list`、[DNCS] `sessions`。保留 4 个：[DNEE] `git-status`、[DNEE] `stats`、[DNCS] `self`、[DNK] `kite-warmup`。这 9 个是全集；§7.5 点名的 3 个只是当时的候选。 |
| `12.3` | D5 收口：路由成败以合同面行的 `06.3` outcome 和 `08.2` 状态类为准，不再看手写 span 是否 throw。[DNMS] catalog 的 catch→500 只体现在合同面 `status`。保留的子阶段 span 不承担路由成败。 |
| `12.4` | [DNN] 动态名：声明列出流水线步骤的封闭 span 名单；植入只经烘焙常量的「步骤 → 名字」映射取名，调用处不另写字符串（`04.2`）。映射中没有的步骤不计时，计入 `structure.unmappedKey`。该字段追加进 `08.3` 的 `structure` 闭集，与 `legacyCopies`、`badShape`、`missingBindingId`、`oversize` 并列，不塞进既有字段。`09.7` 对账覆盖这张映射。 |
| `12.5` | 退役且不留兼容：DNPR `hostSpan` 的 `ctx`、`lastTraceId`、事件 `traceId`；[DNK] 包装里的 `incidentId` 传递；`traced()` 的 `perfCount('route-err-*')` 与 `perfCount('route-slow-*')`。[DNK] 自有 incidentId 与 operations 环形缓冲不改。`src/host/perf.js` 不整文件删除：`hostSpan` 留下承接 `kite-warmup`；`setPerfEnabled` 按 `12.6` 删除；`perfSnapshot` 按 `10.6` 删除；`perfCount` 若再无调用方则导出一并删除。`10.6` 的 `buildDiagnostics().perf` 与未定义 `PERF_ROUTE` 分支仍同批删除。 |
| `12.6` | D2 收口。采集开关只认运维入口：宿主 `DSH_PERF_REVIEW=1`，页面 `?perf-review=1` 或 `localStorage['dsh-perf-review']='1'`。退役且不留别名：[DNK] 配置项 `perfReview` 及其解析、`setPerfEnabled` 调用、对 `process.env.DSH_PERF_REVIEW` 的改写、`setPerfEnabled` 导出、DNPR `setEnabled`。任何插件不得替宿主进程打开采集。[DNK] AGENTS「配置与状态」删除该项。 |
| `12.7` | 页面 UI 的 span/track/count 仍按 `01.7` 保留，动态名只受 `12.4` 约束。`catalog` 以 `11.3` 落地后的已提交版本为准。 |

> **下游约束**：spec rev5 判定规则；D2、D5 收口

#### `T-O-PRE1116-13` —— 有合同面的插件接入观测；读取入口 3 个；四项非目标；spec rev5 是机制唯一文档
> **来源**：Round 5 / Q13（[业主] 2026-11-16 同意推荐 B） ｜ **驱动后续**：无（最终轮）

| 条款 | 已冻结内核 |
|------|------------|
| `13.1` | 门面观测接入 6 个：[DNEE]、[DNN]、[DNMS]、[DNCS]、[DNT]、[DNLS]。各自把 DNPR 适配器注入所用门面（`01.1`、`06.1`）。[DNT]、[DNLS] 新增 DNPR 构建期依赖，只做合同面观测，不加手写植入，不加入页面单例。统一浏览器 join helper 只替换有页面植入的 4 处接入：三份 `src/client/perf.js` 与 [DNK] 懒 join（`13.6`）。 |
| `13.2` | 声明 7 份：上述 6 个加 [DNK]，位置与形状服从 `09`。只有合同面的插件 `keys` 为空、`contract` 只引用 `05` 的 id，空键集合必须等于空植入集合。[DNK] 无合同面（`10.5`），声明只含页面 span/track/usage 与 `kite-warmup`，`contract` 为空。[DNMSC] 不接入、不声明、不依赖 DNPR；账本仍只由它自己写（`B05`）。 |
| `13.3` | 读取入口只有 3 个：[DNEE]、[DNN]、[DNMS]，各一条 `GET /<前缀>/perf-review/host`（`10.1`）。[DNEE] 既有行就是这条路径，只更新 justification 为「只读全进程视图」并去掉 `mode=window`，不另增第二行；新增行只有 [DNN]、[DNMS]。[DNK] 有页面植入但不挂（`10.5`），这是 `03.2` 留口的关闭，不是第二套拓扑。[DNCS]、[DNT]、[DNLS] 无页面植入，不挂。中场评估 II「约 6 个入口」作废，现行是 3。无宿主入口时 `meta.host.source = null`，并输出 `note.host-source-absent`（`10.5`）。 |
| `13.4` | 非目标，重开必须由 [业主] 新开 QnA，实现不得自行补上：请求级关联保持非目标（`B08`），`traceId` 已由 `12.5` 退役；不新增 MCP 工具、专用 agent 路由或推送通道，agent 只读已鉴权的 `10.1` 路由、页面 `read()` 或 lab 产物，新 lane 须另行裁决；LoAF 脚本归因维持 spec §3.1 的否决；新 track kind 与新手写植入（含 [DNT] wasm 终端、[DNMSC] 压缩引擎）本阶段不加，将来只在该插件自己的声明里加键，新指标先进 audit（`B09`）。 |
| `13.5` | `docs/specs/dsh-nano-performance-review/spec-26nov.md` 原地升 rev5，是机制唯一文档：§6.5 换 v2，§6.7 与 §7 改为指向各插件声明（`04.6`），写入 `12.1` 与 `13.4`。DNPR README、`INTRODUCTION.md`、`lab/README.md` 只留用法和指向 spec 的链接，删掉与 spec 重复的机制句（含「四个包」「report() 返回并清空窗口」）。各包 AGENTS 只写本包事实：读取路由、DNPR 依赖、[DNK] 配置项删除、[DNT]/[DNLS] 新依赖。[DNK] AGENTS 不得再把 `/perf-review/host` 或 `mode=window` 写成自己的路由。PRE-1116 计划只 CITE §1，不复述真相。 |
| `13.6` | 前序数量词的现行外延，旧行不改字：`01.6` 的「四份 `src/client/perf.js`」指 [DNEE]、[DNMS]、[DNN] 三份现存样板，加上 [DNK] 手写懒 join；没有第四份，不得为凑数新建。`04.1` 的「每个插件一份声明」和 `07.4` 的「8 个插件」构建戳，外延是 `13.2` 的 7 个插件，在同一个 W3 里同批注入，不含 [DNMSC]；内容哈希、同协议不迁移、多戳即 audit 这些规则不变。`05.3` 的「8 个插件统一烘焙」外延是有 web 合同面、或今日持有 `lib/route-table.js` / `lib/bindings.js` 的插件：[DNEE]、[DNN]、[DNMS]、[DNCS]、[DNT]、[DNLS]、[DNK]。[DNMSC] 两者都没有，不烘焙、不新建空绑定表。[DNLS] 今日没有 `scripts/build-client.mjs`，W2 仍要为它补上账本烘焙并退役 `lib/route-table.js`，不因此排除出 `05`。 |

> **下游约束**：spec rev5 非目标与文档落点；计划只 CITE

## 3. 收口（必须有）

- 形成史文档（初评、各轮中场评估、问答修订历史）只作测量指针，不在本文产生新裁决。
- 本文没有新建 Truth-ID。`01.1`–`13.6` 与 `B01`–`B11` 都来自问答 §1，不是本文新编。
- 与 [`PRE-1116-qna.md`](./PRE-1116-qna.md) 冲突时以该问答为准，并修订本台账。问答 §1.3 的收口读法优先于旧行里的「留给 executional」字面。
- 下游 PRE-1116 计划不填写 Q/A，不修改本台账的规则句。spec rev5、门面 JSDoc、各包 AGENTS 只 CITE，不另写一套决定。
- 需要推翻时，回到原问答追加 supersession，再投影到本台账的对应行。

## 4. 启用的插件

> 只列触发成立的插件。P5 修正案未触发：数量词外延和留口关闭都写在同一份已冻结问答的 §1.2 / §1.3 里，不是事后另立、且不回改正文的修正案。

### 4.1 P1 · 基线事实层（测量指针，非新 `T-O`，本台账只 CITE）

| 事实 ID | 一句话 | 出处 |
|---------|--------|------|
| `B-HEAD` | 证据行号锚定问答基线 `77955e5`。`e228445` 复核时被引代码与规格文件无 diff，行号仍指向同一符号；此后漂移以路径 + 符号名为准，不回改目标句 | 问答文首基线；本轮行号审查 |
| `B-CENSUS` | 「11 个未提交文件」「22 个文件」是提问时点的计数，不是合同。「四份 perf.js」「8 个插件」「约 6 个入口」的现行外延以 `13.6`、`13.3` 为准 | 问答文首、Q11 `11.3`、§1.3 |
| `B-ASSESS` | 初评 §3 的 42 项与 §8 工作项是债务索引；初评推荐未经本问答冻结的，不得当合同 | `B01`；初评 §0、§8 |
| `B-AUDIT` | 问答 §11 的一致性审计只修文档读法（状态、外延、结构计数字段、章节指针），不证明产品行为，也不新增 Truth-ID | 问答 §11.C、§1.3 |

> **裁决效力点名**：`B-CENSUS` 只否定「11 / 22」这两个计数的合同地位；「四份 / 8 / 约 6」不因并写在这里就失效，外延仍是 `13.6`、`13.3`。`B-ASSESS` 否定未经冻结的初评推荐。`B-HEAD` 只约束行号，不约束目标态。

### 4.2 P2 · 权威次序

[`PRE-1116-qna.md`](./PRE-1116-qna.md)（decision provenance：§1 台账 + §1.3 读法 + 业主回答）> **本台账（投影面）** > PRE-1116 计划 / spec rev5 / 门面 JSDoc / 各包 AGENTS（只 CITE）> ImplementationGrant。不一致时回到问答修订本台账，不得反向改问答。初评、中场评估和 `file:line` 是测量，不是 [业主] 真相。`FROZEN` 不是代码 PASS。旧行里的「留给 executional」一律按 §4.4 读，不按字面当成仍未决。

### 4.3 P3 · 与上游真相的关系

| 上游 ID | 关系 | 回改上游正文 |
|---------|------|----------------|
| CF1115 问答 `:401`、`:680`（不因归口合并性能库；host 出口不持跨实例全局态） | 只消费。`01` 的 `observe` 是在这条边界内、经 [业主] 批准的唯一公共合同扩展登记 | 否 |
| CF1115 已冻失败五类 `cancelled/transport/http/protocol/domain` | 只消费。`06.3` 的 `json` 面直接引用，不另造枚举 | 否 |
| [DNMSC] 账本唯一写入方是 companion bundle | 只消费。`13.2` 明确 [DNMSC] 不接入、不声明、不依赖 DNPR | 否 |
| 仓根 `AGENTS.md` 核心原则与 `.agents/worktrees` 约定 | 只消费。`11.1` 的分支位置与合并后删除沿用，不迁移登记源 | 否 |
| `docs/specs/dsh-nano-performance-review/spec-26nov.md` 现行机制章 | 实施时按 `04.6`、`13.5` 原地升 rev5，改为只保留机制与页级规则并指向各插件声明。升版前的「四个包」「`report()` 返回并清空窗口」不是现行合同 | 否（升版发生在 W3 文档提交，不在本台账） |

### 4.4 P4 · 冻结审计注记（append-only，不改内核原句）

> `AF-1`：`01.3`、`01.7`、`01.9`、`02.7`、`03.2`、`03.4`、`03.7`、`04.8` 里的「留给 executional」**一律读作已经关闭的留口**，不是 OPEN。按此顺序关闭于 `05`、`12.1`–`12.2`、`06.6`、`08`（作者源另见 `04`）、`10.5`/`13.3`、`08.7`–`08.8`、`10`、`09`。不得按顿号 1:1 把 `04` 插进 `08` 后面，否则 `03.2` 会被读成关在声明、`04.8` 会被读成关在读取路由。
>
> `AF-2`：`01.6` 的「四份 `src/client/perf.js`」**一律读作** [DNEE]、[DNMS]、[DNN] 三份现存样板，加上 [DNK] 手写懒 join。没有第四份，不得为凑数新建（`13.6`）。
>
> `AF-3`：`04.1` 的「每个插件一份声明」、`07.4` 正文的「各插件」，以及 §2 `07` 下游约束里的「8 个插件构建脚本」，**一律读作** `13.2` 的 7 个插件（6 个合同面插件加 [DNK]），同一个 W3 内同批注入，不含 [DNMSC]。这句「8」不在 `07.4` 正文里，不能据此给 [DNMSC] 注入构建戳。内容哈希、同协议不迁移、多戳即 audit 这些规则不改。`07` 的下游句保持问答原文，不在本台账改字。
>
> `AF-4`：`05.3` 的「8 个插件统一烘焙」**一律读作**有 web 合同面、或今日持有 `lib/route-table.js` / `lib/bindings.js` 的 7 个插件：[DNEE]、[DNN]、[DNMS]、[DNCS]、[DNT]、[DNLS]、[DNK]。[DNMSC] 不烘焙、不新建空绑定表。[DNLS] 今日没有 `scripts/build-client.mjs`，W2 仍要补烘焙入口并退役 `lib/route-table.js`。
>
> `AF-5`：`03.2` 的「每个有页面植入的插件都挂路由」把 [DNK] 留成了口。**一律读作不挂**（`10.5`、`13.3`）。中场评估 II 的「约 6 个入口」作废，现行 3 个：[DNEE]、[DNN]、[DNMS]。[DNEE] 更新既有行，不另增第二行。
>
> `AF-6`：`03.3` 的形状不合格**一律计入** `structure.badShape`。`12.4` 的未映射步骤**一律计入** `structure.unmappedKey`。后者追加进 `08.3` 的闭集，不占用 `badShape`，也不塞进 `legacyCopies` / `missingBindingId` / `oversize`。
>
> `AF-7`：`B10` 的「修复路径由后续题决定」**一律读作已关闭**。D1→`03.5`、`08.6`、`11.5` ③；D2→`12.6`；D3→`03.3`、`08.6`；D4→`07.5`；D5→`06.3`、`08.2`、`12.3`；D6→`08.2`、`08.9`；D7→`07.4`；D8→`07.3`；D9→`04.5`、`09.8`。
>
> `AF-8`：题面「`05` 必须先于 `06`」**一律读作** id 是发出并消费事件的前提，不是 W1 落地可选参数的前提（`11.2`）。W3 之前没有人发带 id 的事件。
>
> `AF-9`：`10.6` 删除 `perfSnapshot` 与 `12.6` 删除 `setPerfEnabled` **一律读作** `12.5`：`src/host/perf.js` 不整文件删除，`hostSpan` 留下承接 `kite-warmup`。
>
> `AF-10`：`07.1` 的协议键名、`07.7` 的哈希范围、`09.8` 的驱动接口形状、`05.7` 与 `08.3` 里标了「示意」的正则和证据条数，**一律读作实现时固定并加测试锁定**，不是缺一轮 [业主] 裁决。`05.2` 的命名表抽查是实施检查点，抽查前不得烘焙。
>
> `AF-11`：问答 §7.5「进入 §10 收口」**一律读作重编号前的时点句**。收口在问答 §12。该判断已经兑现，不构成未决轮次。
>
> `AF-12`：三处行号跨度比符号宽，句子不改（与问答同文），符号以下面为准。`B02` 的 `client.js:104-184` 里，最深者胜是 `pickOwner`（`packages/dsh-performance-review/src/client.js:152-184`），不是从 `:104` 起的全部函数。`07.3` 的 `host.js:315-345` 里，就地升级分支是 `ensurePerfReviewHost` 的 `:325-343`；`:318-321` 与 `:344` 是先到者安装和后到者复用，不在退役范围内。`B07` 的 `spec-26nov.md:28-33` 里，本条内核只对应 `:28-29` 与 `:33`；`:30-32` 是同节其他非目标。`e228445` 上这些文件相对 `77955e5` 无 diff，不是事后漂移。
>
> `AF-13`：`13.5` 的「PRE-1116 计划只 CITE §1」里的 §1 **一律读作问答的 Truth-Gate**（含全部细则）。在本台账，那是 §1 总表加 §2 内核，不是只 CITE 总表。计划仍不改写规则句。

### 4.5 P6 · 残项、不得重开、授权边界

- **残项**：W1–W3 的实现、对照运行、基线三次重录、体积测量、spec rev5，以及 `11.3` 六条未提交文件先由 [业主] 落地。**阻塞当前真相出口：NO**。`11.3` 未提交则 W2/W3 的前置不满足；即使清单已提交，本台账仍不构成开工或合并授权（`11.8`）。
- **不得重开**：Q1–Q13 未选中的 A/C/D；v1 读取分支与转换器；生产双写；`report()` 读即清窗；`takeWindow()`；`onCall`；`traceId`；[DNK] `perfReview` 与 DNPR `setEnabled`；[DNMSC] 接入或空绑定表；第四份 `perf.js`；第 4 个及以后的读取入口；请求级关联、新访问通道、LoAF 归因、新 track kind 与新手写植入（`13.4`，重开须新 QnA）。不设 Round 6。
- **仍然不授权**：implementation grant、远端、deploy、live、新增 release-gate、改 `RELEASE.md`、在脏工作区上覆盖 [业主] 未提交文件。

## 修订

| 版本 | 日期 | 变更 |
|------|------|------|
| `0.1.0` | 2026-11-16 | 首版：从已冻结的 `PRE-1116-qna.md` 投影 24 条 `T-O` 与 99 条细则；启用 P1/P2/P3/P4/P6。未新建 Truth-ID，未改问答，未授权实施 |
| `0.1.1` | 2026-11-16 | 三路审查后修订：`AF-1` 关闭点按问答 §1.3 重新配对；「11/22」与「四份/8/约 6」拆开；`AF-3` 点名 `07` 下游的「8 个插件」仍读作 7 个且不含 [DNMSC]；基线 `B01`/`B03`/`B05`/`B08`–`B11` 的义务句改回问答，不另写下游；`AF-12` 收窄三处过宽行号的符号读法（文件相对 `77955e5` 无 diff，不改原句）；`AF-13` 说明 `13.5` 的 §1 含 §2 内核；`11.3` 落地不等于开工授权。99 条细则未改字 |
