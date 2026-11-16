# PRE-1116 Q&A · progressive（performance-review-enhancement 下一阶段 · 业主决策册）

> **范围（scope）**：`PRE-1116` = performance-review-enhancement 的下一阶段。专项完成 [PRE-1116-initial-assessment.md](PRE-1116-initial-assessment.md)（下称「初评」）定义的 `packages/dsh-performance-review`（下称 DNPR）升级与消债工作。
> **qna 位点**：`pre-charter（多轮）`。结构：2 轮 × 2 题 foundational（Q1–Q4）→ 每轮 3 题 executional，直到执行层真相全部冻结 → 输出正式计划。
> **角色配置**：提问 `Droid（架构 agent）` · second-opinion `none` · 裁决 `owner`（[业主]）
> **second-opinion 模式**：自 Round 1 起 `retired`（业主指令：不提供 second opinion 槽位）。
> **下游消费者**：**PRE-1116 计划** §2 CITE（[业主] 2026-11-16 确认计划名；原指令中的「DNLS01」为笔误）；spec rev5（`docs/specs/dsh-nano-performance-review/spec-26nov.md`）登记。
> **基线**：`main` @ `77955e5`；证据按本基线读源码核对。提问时工作区有不属于 DNPR 的未提交文件，证据不取自那些文件。`dsh-nano-model-selector/index.js` 在初评之后有外部改动，catalog 路由行号已按新版重核（`:176-189`）。交付不得覆盖 [业主] 未提交文件；必须先落地的清单见 `11.3`，不以文中出现过的「11 个」「22 个」计数为准。
> **文档状态**：`已冻结`（2026-11-16 最终收口）。Round 1–5 全部冻结；`T-O-PRE1116-B01–B11` 与 `01–13` 均已锁定。第 5 轮已完成最终总结与全册一致性审计。**冻结不是实施完成，也不是 implementation grant。**

---

## 0. 分轮状态总览

| 轮次 | 题号区间 | 类型 | 焦点 | second-opinion | 状态 |
|------|----------|------|------|----------------|------|
| Baseline | `T-O-PRE1116-B01–B11` | baseline | 从业主心智模型、仓根原则与已冻结前序真相继承的基线 | retired | 随本文件冻结 |
| Round 1 | `Q1–Q2` | foundational | 观测从哪里进入（接入模型与身份）· 报告对谁负责（报告合同演进与判定真源） | retired | **已冻结**（→ `T-O-PRE1116-01/02`） |
| Round 2 | `Q3–Q4` | foundational | 宿主数据从哪个面读（读取面拓扑与窗口）· 判定依据由谁作者（性能声明） | retired | **已冻结**（→ `T-O-PRE1116-03/04`） |
| Round 3 | `Q5–Q7` | executional | 合同级形状：身份键 · 观测事件 · 多拷贝协议 | retired | **已冻结**（→ `T-O-PRE1116-05/06/07`） |
| Round 4 | `Q8–Q10` | executional | 读侧合同：v2 报告与读/切窗/游标 · 性能声明格式与投递 · 宿主读取面落地与残余退役 | retired | **已冻结**（→ `T-O-PRE1116-08/09/10`） |
| Round 5 | `Q11–Q13` | executional（**最后一轮**） | 交付层：交付批次与验收 · 手写观测与开关逐项处置 · 采纳范围与非目标登记 | retired | **已冻结**（→ `T-O-PRE1116-11/12/13`） |

不再预排 Round 6。上表「已冻结」与文首状态、§1 台账、§12 收口是同一状态；历史中场评估里的「进行 / 留给 executional」是提问时点的话，现行读法以 §1.3 为准。

---

## 1. ★ Truth-Gate 台账（已锁定真值 · NORMATIVE · append-only across rounds）

> 命名空间：`T-O-PRE1116-*`，与正式计划 §2 共用。`B` 前缀为 baseline 真相：它们不是新裁决，而是把业主已确立的心智模型、仓根原则、前序已冻结真相在本阶段显式锚定，作为后续提问的约束。业主可在本文件追加修订推翻任一条。

### 1.1 Baseline（随本文件冻结）

| Truth-ID | 子类型 | 已锁定真相（一句话） | 来源 | 下游约束 |
|----------|--------|----------------------|------|----------|
| `T-O-PRE1116-B01` | baseline | 本阶段名为 `PRE-1116`，工作对象是初评 §3 台账（42 项）与 §8 P0/P1/P2 工作项；初评是**证据输入**，不是合同，其中的推荐不因写进初评而生效 | 业主本轮指令；初评 §0、§8 | 计划只能引用本文件冻结的 T-O 作为方向依据 |
| `T-O-PRE1116-B02` | baseline | DNPR 的计量核心保留、不重写：Event Timing 按 `interactionId` 归并与三段、span 区间并集、窗口归因、`root()` 最深者胜 | 初评 §9、S1；`client.js:246-269`、`aggregate.js:51-100`、`client.js:104-184`；DNPR 单测 63/63 | 增强只改外壳（身份/接入/送达/报告），不推翻计量算法 |
| `T-O-PRE1116-B03` | baseline | 推荐方案的判据 = 仓根五原则（插件中立、上层建筑归 host、不得侧载、单一真源、不得擅自扩约）+ 本阶段四原则：**能硬切就不双写、能彻底退役就不兼容、平台保持中立、不耦合私域** | 仓根 `AGENTS.md` 核心工作原则；业主本轮指令 | 每题推荐须逐条过此判据 |
| `T-O-PRE1116-B04` | baseline | DNPR 保持独立构建期共享库，不并入 `dsh-interface`；`dsh-interface` 与 `dsh-host-route-guard` 不 import DNPR；观测能力只能以参数**注入**门面 | `contract-and-facade-1115-qna.md:401`、`:680`；`packages/dsh-interface/AGENTS.md` 三出口纪律（host 出口「不得持有跨实例全局态」） | 任何门面观测方案必须是注入式、门面零 DNPR 依赖 |
| `T-O-PRE1116-B05` | baseline | DNPR 的职责是观测与聚合；它**不是**业务错误合同真源，**不是** durable 审计权威。失败分类沿用 CF1115 已冻的五类（`cancelled/transport/http/protocol/domain`），不另造错误枚举；[DNMSC] 账本仍由 companion bundle 唯一写入 | `contract-and-facade-1115-eval.md:187`；`packages/dsh-interface/src/contracts/jsonOutcome.js`；`dsh-nano-model-selector/AGENTS.md`「账本唯一写入方是 companion bundle」 | DNPR 只读计时与结果，不复制决策记录、不成为错误真源 |
| `T-O-PRE1116-B06` | baseline | 观测不改行为：关闭时为恒等包装、零成本；观测失败不得让插件卸载或改变行为；预算失败只影响 lab 退出码 | `spec-26nov.md:24`；初评 §1.2 | 任何新钩子都必须证明「未开启/未注入时行为不变」 |
| `T-O-PRE1116-B07` | baseline | 隐私与本机边界不变：不外发、不装 OTel、不接 session-telemetry/product-analytics；不记录按键内容、文件路径、session id、提示词 | `spec-26nov.md:28-33` | 新增证据字段必须脱敏；新访问面只读本机 |
| `T-O-PRE1116-B08` | baseline | 请求级配对（浏览器↔宿主 traceId）**在另行裁决前仍是非目标** | `spec-26nov.md:36` | 本轮题目不预设关联方案 |
| `T-O-PRE1116-B09` | baseline | 门禁分层纪律不变：硬门禁只留低方差结构项，新指标先进 audit，稳定后才可提为硬门禁 | `spec-26nov.md:277-289`；`lab/budgets.mjs:43,56` | 本阶段不得扩大硬门禁范围（业主另批除外） |
| `T-O-PRE1116-B10` | baseline | 初评已核实的缺陷 D1–D9 作为事实输入：D1 [DNK] 每 10 s 破坏性 `report()`（`dsh-nano-kitesurf/src/client/index.js:56-63`）；D2 [DNK] 打开全进程宿主观测（`dsh-nano-kitesurf/index.js:420-421`）；D3 `configure()` 先到先得且不校验（`client.js:567-590`）；D4 contributors 无界（`client.js:528`）；D5 宿主错误只认 throw（`host.js:262-272`，反例 `dsh-nano-model-selector/index.js:176-189`）；D6 宿主 errors/events 止于合并层（`aggregate.js:287-293`）；D7 `LIB_VERSION` 恒定（`state.js:9`）；D8 宿主单例升级丢状态（`host.js:325-341`）；D9 lab 残留退役场景（`lab/scenarios.mjs:16,179`、`lab/budgets.mjs:242`） | 初评 §3、§6 | 修复路径由后续题决定，事实本身不再复议 |
| `T-O-PRE1116-B11` | baseline | [DNK]→[DNLS] 的性能数据通道（[DNK] `configure` 指向 [DNLS]、POST 到 `dsh-nano-local-sandbox/src/host/routes.js:1137-1146`）属于插件间专有通道，按「不得侧载」是**退役对象**，不讨论保留或兼容 | 仓根 `AGENTS.md`「不得侧载」；初评 L-B03、FC-3 | 计划中该通道只有退役项，没有改造项 |

### 1.2 Round 裁决（append-only）

| Truth-ID | 子类型 | 已锁定真相（一句话） | 来源（Round / Q） | 驱动了哪些后续题 | 下游约束 |
|----------|--------|----------------------|--------------------|------------------|----------|
| `T-O-PRE1116-01` | foundational | **观测以合同面为主轴，经 CF1115 门面注入。** 细则：**01.1** route-guard `createGuard`、`createWebRegistrar`（含 prefix 与 upgrade）、`createJsonClient`、`createMcpToolset` 各增一个可选观测注入口；这是经 [业主] 批准的公共合同扩展，本条是唯一登记。**01.2** 门面纪律：可选纯回调；未注入时行为与现状等价（先补测试再改代码）；回调异常被门面吞掉、不影响响应；门面不 import DNPR、不持全局态。**01.3** 观测身份取自门面的声明记录（registrar binding、guard 表行、jsonClient operation、MCP tool schema），DNPR 不从 URL/路径/工具名文本反推；键格式，以及表行和浏览器 operation 缺少稳定 id 时的补法，留给 executional 轮。**01.4** 结果取门面已掌握的真实结果：guard 四条出口（rejection、405、正常返回的 statusCode、throw→500）、JsonOutcome 五类、MCP `isError`+`kind`；不另造枚举。**01.5** DNPR 提供门面可直接接收的观测适配器；合同面行与手写 span 分属不同命名空间、各自配额。**01.6** 插件接入收敛为一次声明加统一的浏览器 join helper；四份 `src/client/perf.js` 样板与 [DNK] 手写懒 join 退役。**01.7** 与合同面整面重合的手写 `hostSpan` 硬切退役、不双写（候选：[DNMS] `catalog`、[DNN] `read`/`save`，逐个判定在 executional 轮）；子阶段 span 与浏览器 UI 内部 span/track/count 保留。**01.8** 共享包零插件名：交互目标桶改为插件声明，删除 `BUCKET_ATTRS` 中的插件属性（含退役的 `data-nano-shared-workspace`）。**01.9** 现有 `onCall` 是否并入统一观测口，在 executional 轮按「能彻底退役就不兼容」判定 | Round 1 / Q1（[业主] 2026-11-16 同意推荐 B） | Q3、Q4 | 计划 §2；spec rev5；门面 JSDoc 只 CITE 本条 |
| `T-O-PRE1116-02` | foundational | **报告合同一次硬切到 schema v2；判定收进包内；读与切窗分离。** 细则：**02.1** `REPORT_VERSION` 1→2 在同一变更集内切换，同批改完全部仓内读者（`lab/{run,scenarios,budgets,candidates,diagnose-inp,diagnose-render}.mjs`、`lab/baseline/baseline.json`、`markdown.js`、DNPR 测试、[DNK]/[DNLS] e2e）；不留 v1 读取分支、不写转换器；基线按三次稳定性运行重录。**02.2** v2 设计轴：agent 是第一读者；键稳定、自解释；notes 只在相关时出现并带稳定 id；带证据（最慢交互、最重帧、宿主错误与事件、结构异常对象）；分位数行标明 window/cumulative 与样本数；合同面行独立成区；体积上限 256 KB。**02.3** 判定单一真源是 DNPR 包内纯函数 `diagnose()`；`lab/budgets.mjs` 的 `evaluate` 改为调用它，lab 只保留退出码与 I/O；硬门禁/audit 分层原样迁入，本决定不改阈值。**02.4** 读与切窗是两个显式动词：读无副作用，任何读者可用；切窗只用于 lab 场景边界，插件代码禁止调用并由测试拦截；`report()` 的「读即清窗」语义退役，不留同名别名。**02.5** v1/v2 多拷贝共存必须被识别并在结构计数里报出，与 D7/D8 修复同批交付。**02.6** 初评台账调整：P0-09 取消并入 v2；P0-01 改为两动词方案；P2-01~P2-04 的前置改为本条。**02.7** 留给 executional 轮：v2 字段形状、动词名、findings 结构、`diagnose()` 是否进浏览器产物（用 `--measure-footprint` 量化）；阈值与期望的作者源交 Round 2 Q4 | Round 1 / Q2（[业主] 2026-11-16 同意推荐 B） | Q3、Q4 | 计划 §2；spec rev5 §6.5 |
| `T-O-PRE1116-03` | foundational | **宿主数据由 DNPR 提供只读全进程视图，多入口挂载；宿主侧以游标取代排空。** 细则：**03.1** 宿主读取实现只有一份，在 DNPR 宿主出口（只读 handler 加注册声明片段），返回全进程宿主快照，形状服从 `02`（v2）。**03.2** 每个有页面植入的插件在自己前缀下挂载这条路由，经 guard/registrar 注册（自动受鉴权围栏与 `01` 观测约束）；每个入口在 `security/route-sensitivity.json` 登记一行 `read:host`、不绑定 session；只做宿主的插件不挂载，它们的行经全进程快照可见；[DNK] 是否挂首条宿主路由留给 executional 轮。**03.3** 页面单例多源接入：各插件 join 时登记自己的入口；对返回做形状校验，不合格计入结构计数；同一时刻只轮询一个健康入口；「先到先得」退役。**03.4** 宿主侧取消排空：`takeWindow()` 退役、不留兼容；窗口由读者传入的单调游标界定；宿主侧没有切窗动词；多读者互不干扰；游标形状、样本保留上限与游标失效语义留给 executional 轮。**03.5** 同批退役：[DNEE] 现路由的 `mode=window` 语义与独占地位；[DNLS] `/perf-review/host`、`/perf-report` 两条路由、代码与路由表行（`B11`）；[DNK] 指向 [DNLS] 的 `configure` 与 10 s 推送；[DNMS]/[DNN]「[DNEE] 负责轮询」的隐式依赖。**03.6** 敏感度：不新增数据类别；L-E04 的已接受发现从「排空全进程」改为「只读全进程」，路由表 justification 随之更新。**03.7** 留给 executional 轮：路由路径名、页面轮询频率、`host.json`/`host-snapshots.jsonl` 写盘器的去留 | Round 2 / Q3（[业主] 2026-11-16 同意推荐 B） | Q5、Q7 | 计划 §2；spec rev5；`security/route-sensitivity.json` |
| `T-O-PRE1116-04` | foundational | **判定依据由每个插件的性能声明作者，构建期烘焙；DNPR 与 lab 插件中立。** 细则：**04.1** 每个插件一份性能声明，是本插件下列四类内容的唯一作者源：手写观测键（span/track/usage 名与 track kind）、插件级预算行（标明 hard/audit）、场景归属与期望、交互目标桶；合同面只引用身份、不复述。**04.2** 植入代码从烘焙出的常量取名，不在调用处另写字符串；每个插件的测试做三方对账（声明 ↔ 实际植入调用 ↔ 门面 inventory），任何一方不一致都让测试失败。**04.3** 声明在构建期按 `dsh-interface/build` 的确定性方式烘焙进 `lib/`；报告能识别所用声明的版本。**04.4** DNPR `diagnose()` 只内置插件中立的页级规则；插件级规则全部来自声明；DNPR 与 lab 源码中不出现任何插件名。**04.5** lab 的场景列表与预算由声明生成；`lab/budgets.mjs`、`lab/scenarios.mjs` 中写死的插件名单退役，D9 随之根治。**04.6** `spec-26nov.md` §6.7 植入表与 §7 插件级行退役，改为指向各插件声明；spec 只保留机制与页级规则。**04.7** 阈值与门禁级别原样迁移（`B09`）；验收口径是旧 `evaluate` 与新 `diagnose()` 对同一批基线结论一致。**04.8** 留给 executional 轮：声明的文件名、字段与格式；声明是否随浏览器产物发布（与 `02.7` 一并用 `--measure-footprint` 量化） | Round 2 / Q4（[业主] 2026-11-16 同意推荐 B） | Q5、Q7 | 计划 §2；spec rev5 §6.7/§7 |
| `T-O-PRE1116-05` | execution | **合同面身份由路由账本显式作者，host、浏览器、MCP 三侧共用同一个 id。** 细则：**05.1** `security/route-sensitivity.json` 每行增加 `id`、`channel`、`match` 三个字段，账本完整描述全部 web 合同面（含 [DNN] fx/sdk prefix 行、[DNT] upgrade/prefix 行）；`id` 与 `sensitivity` 同属人工审定字段，`scripts/gen-route-sensitivity.mjs` 合并时保留（沿用 `:7` 机制）。**05.2** id 是语义名 `<插件缩写>.<面名>`（小写、点分）；初值沿用已在用的 `dnee.*`、`dnn.*`、`dnt.*`，其余插件一次性命名，由 [业主] 抽查；命名后不随路径变化，改名即视为新面。**05.3** 8 个插件统一经 `bindingTableModule` 从账本烘焙带 id 的 `lib/bindings.js`；同批退役 [DNEE] 路径推导（`build-client.mjs:26-29`）、[DNN]/[DNT] 手写 `lib/bindings.js`（改为生成物）、`routeTableModule` 与各插件 `lib/route-table.js`。**05.4** guard 路由记录增加 `id`（`route-guard.js:211-220`），registrar 沿用 `binding.id`；两条注册路径的观测事件都携带它。**05.5** 浏览器产物只烘焙本插件的 binding id 常量（仅 id 与 path）；operation 记录必须携带 `bindingId`；缺 id 的 operation 不按 URL 建键，只计入结构计数。**05.6** MCP tool 身份就是 schema 方法名，schema 是唯一作者。**05.7** 合同面行键使用独立规则（允许点分，示意 `^[a-z0-9][a-z0-9.-]{0,63}$`），与手写 span 的 `NAME_RE`（`state.js:13`）分开。**05.8** 账本 id 即将来 `FamilyDefinition` 的 `bindingId`；某插件迁入合同族时作者源按 `FamilyDefinition.js:23-24` 转移一次，id 不变，观测历史不断。**05.9** `security/route-inventory.md` 的生成与各包 AGENTS 的路由说明同批更新 | Round 3 / Q5（[业主] 2026-11-16 同意推荐 B） | Q8、Q9、Q10 | 计划 §2；`security/route-sensitivity.json` 字段说明；`dsh-interface/build` JSDoc |
| `T-O-PRE1116-06` | execution | **四门面共用一份观测事件合同；`onCall` 退役。** 细则：**06.1** `createGuard`、`createWebRegistrar`、`createJsonClient`、`createMcpToolset` 的可选观测参数统一命名为 `observe`；事件形状与结果闭集作为纯定义放在 `dsh-interface/contracts`，DNPR 只消费、不定义。**06.2** 事件字段集为 `{surface, id, plugin, outcome, ms, status?, kind?}`，`surface ∈ http / upgrade / json / mcp`，`id` 取 `05`；事件**不**携带 URL、query、请求正文、header、session id、错误消息文本（`B07`）。**06.3** 结果闭集：`http` = `ok / rejected / method / failed`；`upgrade` = `accepted / rejected / method`；`json` = `ok` 或 `FAILURE_KIND` 五类（`B05`）；`mcp` = `ok / error（带 kind）/ rejected`。闭集是公共合同，新增值须 [业主] 批准。**06.4** 每次调用结束时同步调用一次 `observe`，不 await；回调异常被门面吞掉；计时用 `globalThis.performance.now()`，不引入 `node:*`；`ms` 计到 handler/调用返回为止，SSE 等长连接只计建立段，门面不推断连接寿命。**06.5** 未注入时门面不读时钟、不构造事件；先补「未注入时响应逐字一致」的测试，再改代码（`01.2`）。**06.6** `onCall` 退役，不留别名，JSDoc 同步删除；[DNT] 自有审计不受影响。**06.7** `http` 面 `ok` 只表示 handler 没有 throw；读者必须同时看 `status`，v2 报告按状态类分维度呈现（交 Round 4 Q8） | Round 3 / Q6（[业主] 2026-11-16 同意推荐 B） | Q8 | 计划 §2；`dsh-interface/contracts` 定义文件；四门面 JSDoc 只 CITE 本条 |
| `T-O-PRE1116-07` | execution | **多拷贝协议：协议主版本隔离单例，构建戳取代手写版本，同协议不迁移状态。** 细则：**07.1** 页面 `window.__perfReview` 与宿主 `globalThis.__perfReviewHost` 两个键退役，改为带协议主版本的键（示意 `__dnpr_v2` / `__dnprHost_v2`，名字实现时定）；v2 代码不读取、不修改、不升级旧键上的对象。**07.2** v2 单例安装时检查旧键，存在即在结构计数记一条（示意 `legacyCopies`），在 v2 报告与 `diagnose()` findings 中可见（`02.5`）；旧拷贝照常按旧协议运行。**07.3** 同协议内先到者提供实现，后到者复用；宿主就地升级分支（`host.js:315-345`）整体退役；同协议对外 API 只增不改，不兼容改动即协议号 +1（下一次硬切）。**07.4** 各插件构建时经 esbuild define 注入 DNPR 源码内容哈希作为构建戳（沿用 `__NXE_VERSION__` 先例）；`LIB_VERSION`、join/hostJoin 的 `libVersion` 参数、`observerVersion` 字段退役、不兼容；lab 版本指纹改用协议号与构建戳。**07.5** contributors 按 `pluginId@build` 去重存储（修 D4）；报告列出各插件构建戳与声明哈希（`04.3`）；同协议出现多于一个构建戳即一条 audit 级 finding「同协议倾斜」。**07.6** 页面与宿主两侧单例使用同一套协议键与构建戳规则；`03.3` 的多源接入在 v2 单例内部实现。**07.7** 内容哈希的计算范围在实现时固定，并由测试锁定「同一份源码得到同一个戳」 | Round 3 / Q7（[业主] 2026-11-16 同意推荐 B） | Q8、Q9、Q10 | 计划 §2；DNPR README；8 个插件构建脚本 |
| `T-O-PRE1116-08` | execution | **v2 报告按来源分区；页面只有读与切窗两个动词；宿主按样本序号游标界定窗口。** 细则：**08.1** 顶层 `schema: "dnpr.report/2"`；分区为 `meta`、`page`、`plugins.<id>.{hand, contract, host}`、`evidence`、`structure`、`notes`；`meta` 含 `protocol`、`contributors[{plugin, build, decl}]`、`window{startedAt, ms}`、`host{source, epoch, from, to, truncated}`。**08.2** 每个分位数行带 `basis`（`window` / `cumulative`）与 `n`；合同面行按 `06.3` 闭集计 `outcomes`，并按状态类 `2xx/3xx/4xx/5xx` 计数（落实 `06.7`）；`host` 行带 `errors`（修 D6）。**08.3** `evidence` 为固定上限数组（示意：交互 5、帧 5、宿主错误 20）；超过 256 KB 时先裁证据并计 `structure.oversize`；`structure` 新增 `legacyCopies`、`badShape`、`missingBindingId`、`oversize`。**08.4** 说明只在相关时输出，带稳定 id；无条件说明（`aggregate.js:239-243`）移入 DNPR 说明词表。**08.5** 判定不进报告：`diagnose(report, {declarations, baseline})` 是 DNPR 的 Node 侧纯函数出口，返回 `{verdict, findings[{id, gate, plugin, subject, value, limit, basis}]}`；浏览器产物不含 `diagnose` 与预算表。**08.6** 页面动词：`read(meta?, {host?})` 无副作用；`cutWindow()` 清空窗口累加器（含 usage 窗口列）并前移宿主起点游标，只允许 lab 调用，插件源码出现即测试失败；`report`、`reset`、`resetCounters`、`configure`、`setHostSnapshotProvider` 退役、不留别名；usage 报 `window` 与 `total` 两列。**08.7** 宿主游标 `{epoch, seq}`，序列化为 `"<epoch>.<seq>"`；`epoch` 在单例创建时随机生成；`seq` 进程内单调，手写 span 与合同面事件共用；样本与事件都带 `seq`；容量沿用现值（窗口 512、reservoir 64、事件 32）。**08.8** 带 `since` 时返回 `seq > since` 的样本（`basis = window`），不带时返回累计视图（`basis = cumulative`），两者都返回 `next`；`epoch` 不符时返回累计视图并标 `truncated: ['epoch']`；某键缓冲已丢掉 `since` 之后的样本时，该键标截断并给出丢失条数，`diagnose()` 产出 audit 级 finding；以上都返回 200；游标格式不合法返回 400；宿主没有切窗动词。**08.9** lab 流程：开始时 `cutWindow()` 并记下宿主 `next`；结束时取 `?since=<起点>` 视图传给 `read()`；`diffHostSnapshots`、`mergeHostSnapshot` 退役 | Round 4 / Q8（[业主] 2026-11-16 同意推荐 B） | Q11、Q12 | 计划 §2；spec rev5 §6.5；DNPR README |
| `T-O-PRE1116-09` | execution | **性能声明是每插件一份 JSON 加场景驱动模块；运行时只带键名、目标桶与声明哈希。** 细则：**09.1** 位置 `src/perf/declaration.json`，顶层带 `schema: "dnpr.declaration/1"` 与 `plugin`；DNPR 纯函数 `validateDeclaration()`（无 I/O）由构建与 lab 先行校验，校验失败即构建失败。**09.2** 字段：`keys{spans, tracks[{name, kind}], usage, hostSpans}`、`buckets[{attr, bucket}]`、`contract[id…]`（只引用 `05`）、`scenarios[{id, driver}]`、`budgets[{id, scenario, subject, rule, gate}]`。**09.3** 规则闭集为 `max`、`min`、`eq`、`relBaseline{factor, floor, initial}`，加可选 `minSamples`；`gate ∈ hard / audit`；词汇归 DNPR，扩展走 DNPR 变更，不在 lab 临时写。**09.4** 通用页级规则与通用插件级红线（`native.*` ≤ 50 ms、≥ 8 样本）内置于 `diagnose()`；按轨道名写死的规则（`lab/budgets.mjs:204-252`）全部迁入对应插件的声明。**09.5** 进运行时：键名常量、交互目标桶（join 时登记，取代 `BUCKET_ATTRS`）、声明哈希（esbuild define，进入 `contributors.decl`）；不进运行时：`budgets`、`scenarios`、`contract`。**09.6** 体积变化用 `--measure-footprint` 量化并写入计划；`nanoCombined.clientJsBytes ≤ baseline × 1.1` 硬门禁照常生效，不新增门禁（`B09`）。**09.7** 三方对账由 DNPR `test-helpers` 的插件中立助手完成：植入代码引用的键名常量集合必须等于声明键集合；`contract` 中每个 id 必须存在于本插件的绑定表或 MCP schema。**09.8** lab 枚举各插件声明生成场景列表；页级场景 `idle-10s`、`composer-type`、`observer-purity` 留在 lab；插件场景步骤从声明引用的驱动模块载入；`lab/{budgets,scenarios,run}.mjs` 中插件名与轨道名清零；驱动接口形状在实现时定 | Round 4 / Q9（[业主] 2026-11-16 同意推荐 B） | Q11、Q12、Q13 | 计划 §2；spec rev5 §6.7/§7；DNPR README |
| `T-O-PRE1116-10` | execution | **宿主读取路由统一落地；写盘器与 [DNK] 的第二读取面退役。** 细则：**10.1** 路径 `GET /<插件前缀>/perf-review/host`，账本 id `<缩写>.perf-review.host`，capability `read:host`、不绑定 session；handler 与注册片段由 DNPR 宿主出口提供，经 guard/registrar 注册并产生 `06` 观测事件。**10.2** 只接受 GET 与 `since` 参数；`mode` 及其他任何参数返回 400。**10.3** 页面轮询每 5 秒一次，只在采集开启且页面可见时进行；同一时刻只轮询一个健康入口，连续失败后切到下一个；轮询带 `since`，起点随 `cutWindow()` 前移；lab 不依赖轮询。**10.4** `host.json` 与 `host-snapshots.jsonl` 写盘逻辑、30 秒定时器、`beforeExit` 钩子、`flush()`、`structure.hostWriteErrors` 及其测试一并删除；DNPR README 与 `INTRODUCTION.md` 同步。**10.5** [DNK] 不挂宿主路由，保持包合同「只登记技能，不注册页面路由」；页面上没有任何宿主入口时，报告 `meta.host.source = null` 并输出 `note.host-source-absent`。**10.6** [DNK] `buildDiagnostics()` 中的 `perf` 字段、`src/host/perf.js` 的 `perfSnapshot` 导出、`traced` 中未定义的 `PERF_ROUTE` 分支同批删除。**10.7** 账本同步：[DNEE] 行 justification 改为「只读全进程视图」；[DNLS] 两行随 `03.5` 删除；新增入口各登记一行 | Round 4 / Q10（[业主] 2026-11-16 同意推荐 B） | Q11、Q12、Q13 | 计划 §2；`security/route-sensitivity.json`；[DNEE]/[DNK] AGENTS |
| `T-O-PRE1116-11` | execution | **三个按序 worktree：W1 只落未使用的观测口，W2 落身份，W3 一次硬切。** 细则：**11.1** 分支只建在 `.agents/worktrees/`，合并后按 [业主] 要求删除。W1 `pre1116-facade-observe` 只落 `06`：`dsh-interface/contracts` 增加观测事件与结果闭集；四门面加可选 `observe`；`onCall` 退役、不留别名；先补「未注入时响应逐字一致」测试再改代码；重建消费方产物（含 [DNT] `lib/mcp.js` 的 `onCall` 副本）。本批不注入任何观测器，运行中的插件行为不变。W2 `pre1116-binding-ids` 只落 `05`。W3 `pre1116-dnpr-v2` 落 `07`–`10` 与 `12`、`13` 的全部落点，内部按 `11.5` 的顺序提交，整体一次合并。**11.2** 顺序读法：`05` 的 id 是 `06` 事件被发出、被消费的前提，不是 W1 落地可选参数的前提。W1、W2 合并后仍无人调用 `observe`，不产生带 id 的事件。第一条带 id 的事件、合同面行、声明 `contract` 引用和读取路由 id 都在 W3，且 W3 不得早于 W1 与 W2 都已合并。三批之间没有双写期，产品代码不留 v1 分支。**11.3** 前置清单按文件身份，不按 `git status` 条数：`security/route-sensitivity.json`、`scripts/route-scan.mjs`、`dsh-nano-model-selector/index.js`、`dsh-nano-model-selector/lib/route-guard.js`、`dsh-nano-model-selector/lib/route-table.js`、`dsh-nano-model-selector/src/host/route-table.js` 必须先由 [业主] 提交落地。题面「22 个文件」只是提问时的计数，不是合同。W1、W2、W3 都不得覆盖 [业主] 尚未提交的文件。W1 可以重建不在清单上的消费方产物；若 `observe` 必须写入清单上的 [DNMS] vendored guard，该重建推迟到清单落地之后，不在脏文件上覆盖。[DNMS] `catalog` 的处置在 W3，以已提交版本为准。**11.4** W2 内容：账本补 `id`/`channel`/`match`；先交命名表由 [业主] 抽查，通过后再烘焙（`05.2`）；烘焙范围以 `13.6` 为准，不含 [DNMSC]；`routeTableModule` 与各 `lib/route-table.js` 退役；guard 记录带 `id`；`route-inventory.md` 与各包 AGENTS 路由说明同步（`05.9`）。验收：路由条数、方法、敏感度与改动前逐条相同。**11.5** W3 内部顺序：① DNPR 核心（`07` 的协议键与构建戳，注入范围 `13.6`；`08`；`diagnose()` 与 `09.3` 词汇；`09.1`/`09.7`；`10.1`；`10.4`）。② 采纳范围内的插件：声明、键名常量、门面适配器、页面 join 改 v2、三份 `src/client/perf.js` 与 [DNK] 懒 join 退役（`13.6`）、`12` 与 `13`。③ [DNEE] `mode=window`、[DNLS] 两条 perf 路由、[DNK] `configure`/10 s 推送/诊断 `perf` 字段（`03.5`、`10.6`）。④ lab 改为声明驱动，读者按 v2 重写（`02.1`、`09.8`）。⑤ `11.7` 对照通过后删除旧 `evaluate`。⑥ 基线三次稳定性运行重录，`--measure-footprint`（`09.6`）。⑦ 文档落点 `13.5`。**11.6** 验收只用现有检查，不新增 release-gate，不改 `RELEASE.md`，不定版本号与发布节奏。W1：`dsh-interface` 与 `dsh-host-route-guard` 单测，`node scripts/test-all.mjs --build`。W2：`gen-route-sensitivity`、`check-route-sensitivity`、`route-scan`、`check-clean-lib`，加路由逐条对照，`test-all --build`。W3：`test-all --build`、DNPR 单测、`lab --arm purity`、全部场景 `--repeats 3` 连续三次退出码 0、`--inject-delay`/`--inject-failure` 仍退出码 1 并点名、本机按 `RELEASE.md` 部署后在真实页面读一次 v2 报告与宿主视图。**11.7** `04.7` 对照在删除旧 `evaluate` 之前做：同一机器、同一组场景，v1 产物与 v2 产物各 `--repeats 3`，按「旧规则 → 新规则 id」比较通过/失败，不比较数值；不一致即阻塞合并。结果表写入 PRE-1116 计划收尾记录，然后删除旧 `evaluate`。不写转换器。**11.8** 三批都是真相层的交付形状，不是本次开工或合并的授权。 | Round 5 / Q11（[业主] 2026-11-16 同意推荐 B） | 无（最终轮） | 计划 §2 只 CITE 本条的批次、顺序与验收 |
| `T-O-PRE1116-12` | execution | **一条规则处置全部 9 个手写宿主 span；动态名封闭；`traceId` 与插件采集开关退役。** 细则：**12.1** 判定规则写入 spec rev5，以后新增 span 按此判断，不再开 QnA：包住单一工作模式路由 handler 主体的（只差正文或会话解析）与合同面行是同一件事，硬切退役、不双写；多模式中的一种、多 action 中的一个、或不在路由里的后台/生命周期，是子阶段，保留，写入声明 `keys.hostSpans`。**12.2** 退役 5 个，不得出现在 `keys.hostSpans`，改由 `contract` 引用对应路由 id，基线里的 `hostSpan.<name>` 随 `02.1` 重录消失：[DNMS] `catalog`、[DNN] `read`、[DNN] `save`、[DNEE] `list`、[DNCS] `sessions`。保留 4 个：[DNEE] `git-status`、[DNEE] `stats`、[DNCS] `self`、[DNK] `kite-warmup`。这 9 个是全集；§7.5 点名的 3 个只是当时的候选。**12.3** D5 收口：路由成败以合同面行的 `06.3` outcome 和 `08.2` 状态类为准，不再看手写 span 是否 throw。[DNMS] catalog 的 catch→500 只体现在合同面 `status`。保留的子阶段 span 不承担路由成败。**12.4** [DNN] 动态名：声明列出流水线步骤的封闭 span 名单；植入只经烘焙常量的「步骤 → 名字」映射取名，调用处不另写字符串（`04.2`）。映射中没有的步骤不计时，计入 `structure.unmappedKey`。该字段追加进 `08.3` 的 `structure` 闭集，与 `legacyCopies`、`badShape`、`missingBindingId`、`oversize` 并列，不塞进既有字段。`09.7` 对账覆盖这张映射。**12.5** 退役且不留兼容：DNPR `hostSpan` 的 `ctx`、`lastTraceId`、事件 `traceId`；[DNK] 包装里的 `incidentId` 传递；`traced()` 的 `perfCount('route-err-*')` 与 `perfCount('route-slow-*')`。[DNK] 自有 incidentId 与 operations 环形缓冲不改。`src/host/perf.js` 不整文件删除：`hostSpan` 留下承接 `kite-warmup`；`setPerfEnabled` 按 `12.6` 删除；`perfSnapshot` 按 `10.6` 删除；`perfCount` 若再无调用方则导出一并删除。`10.6` 的 `buildDiagnostics().perf` 与未定义 `PERF_ROUTE` 分支仍同批删除。**12.6** D2 收口。采集开关只认运维入口：宿主 `DSH_PERF_REVIEW=1`，页面 `?perf-review=1` 或 `localStorage['dsh-perf-review']='1'`。退役且不留别名：[DNK] 配置项 `perfReview` 及其解析、`setPerfEnabled` 调用、对 `process.env.DSH_PERF_REVIEW` 的改写、`setPerfEnabled` 导出、DNPR `setEnabled`。任何插件不得替宿主进程打开采集。[DNK] AGENTS「配置与状态」删除该项。**12.7** 页面 UI 的 span/track/count 仍按 `01.7` 保留，动态名只受 `12.4` 约束。`catalog` 以 `11.3` 落地后的已提交版本为准。 | Round 5 / Q12（[业主] 2026-11-16 同意推荐 B） | 无（最终轮） | spec rev5 判定规则；D2、D5 收口 |
| `T-O-PRE1116-13` | execution | **有合同面的插件接入观测；读取入口 3 个；四项非目标；spec rev5 是机制唯一文档。** 细则：**13.1** 门面观测接入 6 个：[DNEE]、[DNN]、[DNMS]、[DNCS]、[DNT]、[DNLS]。各自把 DNPR 适配器注入所用门面（`01.1`、`06.1`）。[DNT]、[DNLS] 新增 DNPR 构建期依赖，只做合同面观测，不加手写植入，不加入页面单例。统一浏览器 join helper 只替换有页面植入的 4 处接入：三份 `src/client/perf.js` 与 [DNK] 懒 join（`13.6`）。**13.2** 声明 7 份：上述 6 个加 [DNK]，位置与形状服从 `09`。只有合同面的插件 `keys` 为空、`contract` 只引用 `05` 的 id，空键集合必须等于空植入集合。[DNK] 无合同面（`10.5`），声明只含页面 span/track/usage 与 `kite-warmup`，`contract` 为空。[DNMSC] 不接入、不声明、不依赖 DNPR；账本仍只由它自己写（`B05`）。**13.3** 读取入口只有 3 个：[DNEE]、[DNN]、[DNMS]，各一条 `GET /<前缀>/perf-review/host`（`10.1`）。[DNEE] 既有行就是这条路径，只更新 justification 为「只读全进程视图」并去掉 `mode=window`，不另增第二行；新增行只有 [DNN]、[DNMS]。[DNK] 有页面植入但不挂（`10.5`），这是 `03.2` 留口的关闭，不是第二套拓扑。[DNCS]、[DNT]、[DNLS] 无页面植入，不挂。中场评估 II「约 6 个入口」作废，现行是 3。无宿主入口时 `meta.host.source = null`，并输出 `note.host-source-absent`（`10.5`）。**13.4** 非目标，重开必须由 [业主] 新开 QnA，实现不得自行补上：请求级关联保持非目标（`B08`），`traceId` 已由 `12.5` 退役；不新增 MCP 工具、专用 agent 路由或推送通道，agent 只读已鉴权的 `10.1` 路由、页面 `read()` 或 lab 产物，新 lane 须另行裁决；LoAF 脚本归因维持 spec §3.1 的否决；新 track kind 与新手写植入（含 [DNT] wasm 终端、[DNMSC] 压缩引擎）本阶段不加，将来只在该插件自己的声明里加键，新指标先进 audit（`B09`）。**13.5** `docs/specs/dsh-nano-performance-review/spec-26nov.md` 原地升 rev5，是机制唯一文档：§6.5 换 v2，§6.7 与 §7 改为指向各插件声明（`04.6`），写入 `12.1` 与 `13.4`。DNPR README、`INTRODUCTION.md`、`lab/README.md` 只留用法和指向 spec 的链接，删掉与 spec 重复的机制句（含「四个包」「report() 返回并清空窗口」）。各包 AGENTS 只写本包事实：读取路由、DNPR 依赖、[DNK] 配置项删除、[DNT]/[DNLS] 新依赖。[DNK] AGENTS 不得再把 `/perf-review/host` 或 `mode=window` 写成自己的路由。PRE-1116 计划只 CITE §1，不复述真相。**13.6** 前序数量词的现行外延，旧行不改字：`01.6` 的「四份 `src/client/perf.js`」指 [DNEE]、[DNMS]、[DNN] 三份现存样板，加上 [DNK] 手写懒 join；没有第四份，不得为凑数新建。`04.1` 的「每个插件一份声明」和 `07.4` 的「8 个插件」构建戳，外延是 `13.2` 的 7 个插件，在同一个 W3 里同批注入，不含 [DNMSC]；内容哈希、同协议不迁移、多戳即 audit 这些规则不变。`05.3` 的「8 个插件统一烘焙」外延是有 web 合同面、或今日持有 `lib/route-table.js` / `lib/bindings.js` 的插件：[DNEE]、[DNN]、[DNMS]、[DNCS]、[DNT]、[DNLS]、[DNK]。[DNMSC] 两者都没有，不烘焙、不新建空绑定表。[DNLS] 今日没有 `scripts/build-client.mjs`，W2 仍要为它补上账本烘焙并退役 `lib/route-table.js`，不因此排除出 `05`。 | Round 5 / Q13（[业主] 2026-11-16 同意推荐 B） | 无（最终轮） | spec rev5 非目标与文档落点；计划只 CITE |

### 1.3 收口读法（Round 5 冻结时追加 · 不改旧行原文）

> 旧行里的「留给 executional」是该轮冻结时的留口，不是现在仍未决。数量词「8 个插件」「四份 perf.js」「约 6 个入口」以 `13.6`、`13.3` 的外延为准。实现时才固定的名字不是 OPEN 业主题。

| 旧句 | 现行读法 | 关闭于 |
|------|----------|--------|
| `01.3` 键格式与缺 id 的补法留给 executional | 账本 id、浏览器 `bindingId`、MCP 方法名 | `05` |
| `01.7` 候选 span 逐个判定留给 executional | 全集 9 个的逐点结论；§7.5 的 3 个名字不是全集 | `12.1`–`12.2` |
| `01.9` `onCall` 是否并入，留给 executional | 退役，不留别名 | `06.6` |
| `02.7` 字段、动词、findings、`diagnose()` 是否进浏览器 | v2 形状与「判定不进浏览器产物」 | `08`；作者源另由 `04` 关闭 |
| `03.2` [DNK] 是否挂首条宿主路由 | 不挂。有页面植入不等于有宿主前缀 | `10.5`、`13.3` |
| `03.3` 宿主返回形状不合格「计入结构计数」 | 计入 `structure.badShape`，不另造字段 | `08.3` |
| `03.4` 游标形状、保留上限、失效语义 | `{epoch, seq}`、容量沿用现值、失效见 `08.8` | `08.7`–`08.8` |
| `03.7` 路径、轮询、写盘器去留 | `10.1`–`10.4` | `10` |
| `04.8` 声明文件名、字段、是否进运行时 | `src/perf/declaration.json`；运行时只带键名、目标桶、声明哈希 | `09` |
| `05.3` / `07.4` / `01.6` / `04.1` 的「8 个」「每个插件」「四份」 | 外延改按采纳范围，规则本身不改 | `13.6` |
| `08.3` 的 `structure` 四字段 | 闭集追加 `unmappedKey`，旧四字段不改语义 | `12.4` |
| 中场评估 II「约 6 个入口」 | 作废，现行 3 个 | `13.3` |
| `07.1` 协议键名、`07.7` 哈希范围、`09.8` 驱动接口形状、`08.3` 证据条数里的「示意」 | 实现时固定，并用测试锁定；不得为此再开一轮 | 不是 OPEN |
| `05.2` 命名表交 [业主] 抽查 | 实施检查点。抽查前不得烘焙。不是未决真相 | `11.4` |

---

## 2. Round 1 —— 观测从哪里进入，报告对谁负责（`Q1–Q2` · foundational）

> 本轮 second-opinion 模式：`retired`。
> **为什么 Round 1 只问这两题**：初评 §5 拆出的 12 个功能簇里，其余 10 个都依赖两件事的方向：①「观测以什么为单位、从哪里进入插件」决定了身份模型、覆盖面、样板与键配额（FC-1/4/5/6/7）；②「报告合同怎样演进、判定归谁」决定了证据、诊断、读口与 lab（FC-8/9/10/12）。两题不回答，后续任何 executional 题都会预设立场。快照路由归属、新场景面、请求关联、agent 访问面等问题不在本轮，等这两题冻结后再根据中场评估提出。
> **本轮驱动真相**：Baseline `B01–B11`。

---

### Q1 — DNPR 的观测从哪里进入：插件手写，还是合同面注入？（驱动真相：`B03`、`B04`、`B05`、`B10` · 来源：初评 §4、FC-1、FC-4、FC-5、FC-7）

- **影响范围**：`packages/dsh-host-route-guard`、`packages/dsh-interface/src/host/{createWebRegistrar,createJsonClient,createMcpToolset}.js`、`packages/dsh-performance-review/src/{client,host,state}.js`、全部 8 个活跃插件的接入代码（`src/client/perf.js` 及宿主 `hostSpan` 调用点）。
- **为什么必须确认**：这是初评 G-C01（门面新增可选参数 = 公共合同扩展）的前置。按「不得擅自扩约」，agent 不能自行给全部路由的唯一注册入口加参数。同时它决定后续键模型、覆盖面、[DNT] 接入方式是否成立。
- **当前建议 / 倾向**（Droid）：**B — 合同面注入为主轴**。
- **Reasoning**：CF1115 已经把全部路由、全部浏览器 JSON 调用、全部 MCP 调用收进三处门面，门面手里同时有「这是哪个面」和「结果是什么」。在这里注入一个可选观测器，一次覆盖全部合同面，并从真实状态码取错误，D5 随之根治。手写埋点退为补充，只量合同面看不到的 UI 内部工作。

#### 【对本问题的解读】

问题本质不是「加不加钩子」，而是**观测的基本单位**：

- 现状的单位是「插件作者在某段代码外包的一个名字」。覆盖面取决于作者记得包哪里，身份是自由字符串，结果只有「抛没抛异常」。
- CF1115 之后，系统里出现了第二种单位：**合同面**（一条注册的路由 binding、一个 JSON operation、一个 MCP tool）。它有声明、有身份、有结果分类，而且全部经过三处门面。

本题要业主决定：DNPR 以后以哪种单位为主轴。它同时决定三件事：

1. 门面要不要开一个注入口（G-C01）。
2. 身份由谁定义：DNPR 自己命名，还是沿用门面已有的声明身份。
3. 已有的手写 span 怎么处理：保留、并存，还是对重合部分硬切退役。

本题**不**冻结回调签名、字段名、键格式、报告行形状。这些属于 executional 轮，并受 Q2 的报告合同约束。

#### 【可选选项清单】

| 选项 | 内容 | 门面改动 | 身份来源 | 结果来源 |
|---|---|---|---|---|
| **A** 维持手写 | 插件在 handler 内手写 `hostSpan`/`span`，靠样板 helper 降低出错率；门面不动 | 无 | 插件自由命名（`NAME_RE`） | 只认 throw |
| **B** 合同面注入为主轴（**推荐**） | 三处门面各增一个可选观测注入口；DNPR 提供适配器；身份取门面的声明记录；手写埋点只用于合同面以外，与合同面整面重合的手写 span 硬切退役 | route-guard、registrar、jsonClient、mcpToolset 各一处可选参数 | 门面声明（binding / 表行 / operation / tool） | 真实状态码 / JsonOutcome 五类 / MCP `isError`+`kind` |
| **C** 运行时旁观 | 不改门面，DNPR 在运行时包裹 `webServer.register`、`fetch`，或从 Resource Timing 推断 | 无（运行时打补丁） | 从 URL/路径文本推断 | 从响应推断 |
| **D** 门面内建观测 | 让门面直接依赖 DNPR，或把 DNPR 并入 `dsh-interface` | 门面 import DNPR | 门面声明 | 同 B |

#### 【推荐选项的详细执行说明与分析】（B）

1. **门面侧：只开注入口，不加行为。**
   - `createGuard({ table, plugin, observe? })`：在 `route-guard.js:223-241` 的 handler 包装里，请求结束时同步调用一次 `observe`，覆盖 rejection、405、正常返回、throw→500 四条出口。
   - `createWebRegistrar({ plugin, bindings, observe? })`：透传给内部 `createGuard`（`createWebRegistrar.js:80`），并在 prefix 包装（`:86-101`）与 upgrade 包装（`:106-116`）各补同样的出口。
   - `createJsonClient({ fetch, resolveUrl, observe? })`：在 `call()` 的每个 return 点（`createJsonClient.js:56-107`）回报一次结果，结果直接用已冻的 `FAILURE_KIND`。
   - `createMcpToolset`：在 dispatch 结束时（`createMcpToolset.js:73-87`）回报时长与 `isError`/`structuredContent.kind`。现有 `onCall` 是否并入统一的观测口，按「能彻底退役就不兼容」原则在 executional 轮定。
   - 共同纪律：观测器是可选的纯回调；未注入时代码路径与现状等价；回调抛错被门面吞掉，不影响响应（`B06`）。门面不 import DNPR、不持全局态（`B04`）。
2. **身份侧：DNPR 不命名合同面。** 观测身份直接取门面已持有的声明记录：registrar 的 binding、guard 的表行、jsonClient 的 operation、MCP 的 tool schema 条目。DNPR 不从 URL、路径、工具名文本反推身份。身份的具体键格式（以及表行、operation 缺少稳定 id 时怎么补）留给 executional 轮。
3. **DNPR 侧：提供适配器，承接配额与聚合。** `hostJoin()`/`join()` 返回的对象额外提供门面可直接接收的观测器。合同面行与手写 span 分属不同命名空间、各自配额，避免自动埋点挤爆 `MAX_SPAN_KEYS=32`（`state.js:15`）。行形状由 Q2 决定。
4. **插件侧：接入收敛为一次声明。** 每个插件在注册路由、创建 jsonClient、创建 toolset 时把观测器传进去，加上一次统一的浏览器 join helper。四份逐字重复的 `src/client/perf.js` 与 [DNK] 的手写懒 join 退役（D4 根因）。
5. **手写埋点的去留（硬切规则）：**
   - 与某个合同面**整面重合**的手写 `hostSpan` 退役，不双写。候选：[DNMS] `catalog`（`dsh-nano-model-selector/index.js:176`）、[DNN] `read`/`save`（`dsh-nano-notepad/index.js:290,306`）。逐个判定留给 executional 轮。
   - 量**子阶段**的手写 span 保留，因为门面看不到 handler 内部，例如 [DNEE] `git-status` 在 status 路由内部（`dsh-nano-explorer-extra/src/host/routes.js:360`）。
   - 浏览器 UI 内部的 `span/track/count`（render、track 等）不受影响，它们本来就不是合同面。
6. **共享包中立化随之落地。** 交互目标桶从共享包里写死的插件属性（`client.js:86-89`，含退役的 `data-nano-shared-workspace`）改为插件声明。共享包里不再出现任何插件名。
7. **合同登记：** 注入口本身是公共合同扩展。若业主选 B，本题答复即为登记真源（`B10` 规则：一个决定只登记一次），spec rev5 与门面 JSDoc 只 CITE 本条。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

| 证据 | 位置 | 说明 |
|---|---|---|
| 全部路由已收口到两条注册路径 | registrar：[DNEE] `src/host/routes.js:651`、[DNN] `index.js:355`、[DNT] `src/host/web-routes.js:198`；guard 直用：[DNCS] `index.js:485`、[DNMS] `index.js:573`、[DNK] `index.js:676`、[DNLS] `index.js:19` | 7 个有宿主路由的插件全部经过 guard 内核，一处注入即全覆盖 |
| 合同面数量远大于手写埋点 | `security/route-sensitivity.json` 共 86 行（[DNLS] 31、[DNEE] 18、[DNN] 14、[DNCS] 12、[DNMS] 6、[DNT] 5；[DNK] 路由不在此文件，经同一 guard 注册）；手写 `hostSpan` 全仓只有 9 处（上文 5. 及 [DNK] `index.js:436`、[DNCS] `index.js:143,402`、[DNEE] `routes.js:303,566`） | 覆盖率从约 10% 变为全覆盖 |
| 浏览器与 MCP 也已收口 | `createJsonClient`：[DNEE] `src/client/jsonClient.js:13`、[DNN] `:4`、[DNMS] `:8`；`createMcpToolset`：[DNT] `src/host/mcp.js:190` | 三类交互各只有一个实现 |
| 门面已经掌握结果 | guard：rejection / 405 / throw→500（`route-guard.js:224-240`）；jsonClient：五类判别矩阵（`createJsonClient.js:20-28`）；MCP：`isError`+`kind`（`createMcpToolset.js:79-86`） | D5「错误只认 throw」被结构性消除 |
| 注入式符合已冻边界 | `contract-and-facade-1115-qna.md:401`（不因归口合并性能库）；`packages/dsh-interface/AGENTS.md`（host 出口只注入 ctx） | 注入口方向与 `B04` 一致 |
| 现有唯一钩子形态已被接受 | `createMcpToolset.js:27,72` 的 `onCall` 已是「可选回调」先例 | B 是把已有先例补完整，不是新范式 |

**A（维持手写）的反例**

- D5 已在生产路径出现：[DNMS] catalog 在 `hostSpan` 内部 catch 后回 500（`dsh-nano-model-selector/index.js:180-188`），`hostSpan` 只看到 resolve，记为成功（`host.js:268-271`）。手写模式下，凡是「catch 后回 JSON 错误」的仓库惯例写法都是假阴性。
- 覆盖取决于作者记忆：[DNEE] 18 行路由只有 3 处 span，`/commit`、`/pull`、`/push`、`/fetch`、`/checkout` 等最慢的路径不可见；[DNT]、[DNLS] 零埋点。
- 样板复制已经出错过：[DNK] 没照抄样板，同时触发 D1、D3、D4（初评 W3）。

**C（运行时旁观）的反例**

- 身份推断违反已冻规则：`FamilyDefinition.js:20-21` 规定身份「never inferred from path/tool-name/plugin-name」。
- 运行时包裹 `webServer` 有已实测的失效模式：`route-guard.js:243-250` 记录 cordis Context Proxy 会把服务解析到影子实例，注册「成功」但从不生效。旁观式包裹更容易落进这个坑。
- 旁观方案在 spec 层已被否决：`spec-26nov.md:50-52`（独立观测者看不到路由函数，「业主要的是植入」）。
- 浏览器侧 Resource Timing 拿不到业务结果（domain 失败是 2xx/4xx 带 body），无法区分五类失败。

**D（门面内建）的反例**

- 直接违反 `contract-and-facade-1115-qna.md:401`、`:680` 与 `contract-and-facade-1115-eval.md:187`。
- DNPR 依赖进程级单例（`globalThis.__perfReviewHost`、`window.__perfReview`），并入 host 出口会违反「不得持有跨实例全局态」。
- route-guard 包约束「不要加业务逻辑，必须极简可测」：内建观测会让全部路由的唯一入口带上聚合逻辑。

**B 的诚实风险**

- 浏览器侧 operation 目前没有稳定身份：[DNEE] `opFor(path)` 按路径现场造 operation（`dsh-nano-explorer-extra/src/client/jsonClient.js:19-38`），没有 operationId。B 成立后，浏览器侧身份需要在 executional 轮单独解决，不能偷偷退回「按路径命名」。
- guard 表行以 `path` 为键（`route-guard.js:174,210-220`），没有独立 id 字段。路由身份是否就用表行的 path，需要在 executional 轮定，并说明为何不违反 `FamilyDefinition.js:20-21`（表行本身就是声明记录，不是从请求 URL 推断）。
- 注入口改动的是全部路由的唯一入口，必须先补「未注入时行为不变」的测试，再改代码。

- **问题**：PRE-1116 中，DNPR 的观测是否改为**以合同面为主轴、经 CF1115 三处门面以可选参数注入**（选项 B）：门面只开注入口、不依赖 DNPR；身份沿用门面的声明记录；与合同面整面重合的手写 `hostSpan` 硬切退役，手写埋点只保留给合同面以外的子阶段与 UI 内部？还是选择 A / C / D？
- **业主回答**：✅ 同意推荐 **B**（[业主] 2026-11-16）→ 🔒 `T-O-PRE1116-01`

---

### Q2 — 报告合同怎样演进：原地加字段，还是硬切到面向 agent 的 v2？判定归谁？（驱动真相：`B02`、`B03`、`B05`、`B09`、`B10` · 来源：初评 §5.1 第三行、FC-8、FC-9、FC-10、G-C02/G-C03、L-D06）

- **影响范围**：`packages/dsh-performance-review/src/{state,aggregate,client,host,markdown}.js`；`lab/{run,scenarios,budgets,candidates,diagnose-inp,diagnose-render}.mjs` 与 `lab/baseline/baseline.json`；[DNK]/[DNLS] 自带 e2e；`spec-26nov.md` §6.5。
- **为什么必须确认**：业主方向第三条是「更 verbose、agentic friendly、更精确的诊断」。现有报告 schema v1 是 spec 冻结的公共合同（`spec-26nov.md:177-222`），任何字段语义变化、读口语义变化、判定位置迁移都属于扩约。初评 P0-09（v1 原地加字段）、P0-01（新增 `peek()`）都默认了「v1 继续存在」，这个默认本身需要业主裁决。
- **当前建议 / 倾向**（Droid）：**B — 一次硬切到 schema v2；判定收进 DNPR 包内单一真源；读与切窗拆成两个显式动词。**
- **Reasoning**：v1 是为「lab 一个读者、四个 UI 插件」设计的。它的问题不在缺几个字段，而在**语义**：只有分位数没有证据、notes 恒输出、宿主分位数口径混排、唯一读口带副作用、判定不在报告里。语义问题靠加字段修不了，加字段只会让同一个键有两种含义。报告的读者全部在仓内、只落本机，硬切成本是可数的。

#### 【对本问题的解读】

本题有三个相互绑定的子决定，必须一起答，否则会互相拖累：

1. **演进方式**：v1 原地扩展，还是 v2 一次切换。
2. **判定真源**：「是否合格」由谁算。现在只有 `lab/budgets.mjs` 能判（`evaluate` `:43`），报告本身不知道自己是否合格。
3. **读口语义**：`report()` 是唯一读口，并且必定清窗（`client.js:602-636`）。任何非 lab 读者都会切掉别人的窗口（D1）。

本题**不**冻结 v2 的具体字段、键格式、findings 结构、动词名称、阈值表归宿。这些进入 executional 轮，并受 Q1 的身份模型约束。本题只冻结**方向和退役范围**。

#### 【可选选项清单】

| 选项 | 演进方式 | 判定真源 | 读口 |
|---|---|---|---|
| **A** v1 原地扩展 | 在 v1 行内追加字段（初评 P0-09 路线），旧字段语义不动 | 仍在 `lab/budgets.mjs` | 新增 `peek()`，`report()` 保持破坏性 |
| **B** v2 硬切（**推荐**） | `REPORT_VERSION` 1→2 一次切换；全部仓内读者同批切；不留 v1 读取分支、不做转换器；基线重录 | DNPR 包内 `diagnose()`，lab 改为调用它 | 读（无副作用）与切窗（仅 lab）拆成两个显式动词；`report()` 旧语义退役，不保留别名 |
| **C** 双轨 | v1 不动，另出一份 v2「agent 视图」并行产出 | 两套（lab 判 v1，包内判 v2） | 两套 |
| **D** 只改呈现 | JSON 不动，只把 `markdown.js` 写得更详细 | 不变 | 不变 |

#### 【推荐选项的详细执行说明与分析】（B）

1. **一次切换，同批改完全部读者。** 改动清单在计划里列全，同一变更集内完成：
   - 生产方：`state.js:10`（`REPORT_VERSION`）、`aggregate.js:143-310`（`buildReport`/`mergeHostSnapshot`）、`client.js` 读口、`host.js` 快照、`markdown.js:18-124`。
   - 读者：`lab/run.mjs`、`lab/scenarios.mjs:84,200`、`lab/budgets.mjs`、`lab/candidates.mjs`、`lab/diagnose-inp.mjs:89`、`lab/diagnose-render.mjs`、`lab/baseline/baseline.json`（重录）、[DNK] `scripts/e2e-ego.mjs:392`、[DNLS] `scripts/e2e-ego.mjs:407`、DNPR 单测（`client.test.mjs:335` 等）。
   - 不保留 v1 读取分支，不写 v1→v2 转换器，不让 lab 同时认两种版本。
2. **v2 的设计轴（本题只冻结方向，字段留 executional）：**
   - **读者是 agent**：键稳定、自解释；notes 只在相关时出现并带稳定 id（现状五条恒输出，`aggregate.js:239-243`）。
   - **带证据**：不只给分位数，还给最慢交互、最重帧、宿主错误与事件、结构异常对象（现状在 `aggregate.js:143-269`、`:287-293` 被丢弃）。
   - **口径显式**：每个分位数行标明 window/cumulative 与样本数（现状宿主 reservoir 与页面窗口混排，`aggregate.js:115-128`）。
   - **合同面行**承接 Q1 的观测，与手写 span 分开命名空间与配额（若 Q1 选 B）。
   - **体积上限**沿用 256 KB（`spec-26nov.md:222`）。
3. **判定收进包内，成为单一真源。** DNPR 新增纯函数 `diagnose(report, …) → findings[]`，`lab/budgets.mjs` 的 `evaluate` 改为调用它，lab 只保留退出码与 I/O。判定只有一份实现；硬门禁与 audit 的分层纪律原样迁入（`B09`），本题不改任何阈值。
4. **读与切窗分离，旧语义退役。**
   - 一个无副作用的读动词：任何读者（插件、e2e、agent）都可以调用，不 flush、不 reset。
   - 一个显式的切窗动词，只给 lab 的场景边界用；插件代码禁止调用（测试层面拦截）。
   - `report()` 当前的「读即清窗」语义退役，不保留同名别名。这样残留的旧调用会立即失败，不会悄悄继续清别人的窗口。
5. **多拷贝共存的版本判别。** 页面与宿主单例由先到的 bundle 建立（`client.js:662-666`、`host.js:315-345`）。v2 必须能识别「同页存在 v1 拷贝」并在结构计数里报出来，而不是混写。具体机制留给 executional 轮。这一条与 D7/D8 的修复同批完成。
6. **对初评台账的影响**（若选 B）：
   - P0-09「v1 行内加字段」取消，并入 v2。
   - P0-01「新增 `peek()`」改为读/切窗两动词方案。
   - P2-01~P2-04 的前置从「Q-02 裁决」变为本题，P2-05/06 仍待后续轮。
   - P0-02/P0-04/P0-05/P0-08 等不涉报告形状的修复不受影响。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据（硬切可行）**

| 证据 | 位置 | 说明 |
|---|---|---|
| 报告只落本机，没有仓外消费者 | `spec-26nov.md:29`（「v1 报告只落在本机」）；`B07` | 不存在需要兼容的外部读者 |
| 版本号只有一处断言 | 全仓 grep `REPORT_VERSION`/`report.version`：`state.js:10`、`aggregate.js:15,249`、`client.test.mjs:335` | 切换点集中 |
| 全部读者可枚举 | `report()` 调用：`lab/scenarios.mjs:84,200`、`lab/diagnose-inp.mjs:89`、DNPR 测试；字段读者：`lab/{run,budgets,candidates}.mjs`、`markdown.js`；e2e 两处 | 同批切换的工作量是有限、可列清的 |
| lab 已有版本指纹拒绝机制 | `lab/budgets.mjs:286-296`（`versionsFrom`/`versionsMatch`，不匹配退出码 2） | v1 基线遇到 v2 报告会被拒绝，强制重录，不会出现静默错比 |
| 判定在 lab 而不在包内 | `lab/budgets.mjs:43`（`evaluate`）；L-D06 | agent 拿到报告也不知道是否合格，必须读 lab 源码 |

**A（v1 原地扩展）的反例**

- 语义问题加字段修不了：宿主 `hostSpan.p95` 在 snapshot 模式是累计 reservoir，在 window 模式是窗口值（`aggregate.js:115-128` 对比 `host.js` takeWindow），同一个键两种含义。只有改语义才能消除，而这在 v1 内就是破坏性变更。
- notes 恒输出（`aggregate.js:239-243`）。改成条件输出会改变现有读者看到的内容，等于在 v1 名下做 v2 的事。
- 读口保持破坏性等于保留 D1 的根因：只要 `report()` 还清窗，下一个插件或 agent 仍可能重犯。
- 违反「能硬切就不双写」：v1 永远背着历史字段，后续每次增强都要回答「旧字段怎么办」。

**C（双轨）的反例**

- 直接违反「能硬切就不双写」与「单一真源」：两份报告形状 + 两套判定，同一次运行可能得出两个结论。
- 双轨的维护成本落在每一个读者身上，而读者全部在仓内，并没有必须保留旧形状的理由。

**D（只改呈现）的反例**

- `markdown.js` 是 JSON 的派生物（`markdown.js:18-124` 全部从 report 读字段）。JSON 里没有的证据，markdown 也写不出来。
- agent 读的是 JSON，呈现层的改进对「agentic friendly」没有贡献，也不触及 D1 和判定真源问题。

**B 的诚实风险**

- 基线必须重录，切换后第一批 lab 数据没有历史可比。需要在计划里安排 v2 基线的三次稳定性运行（沿用 `B09`）。
- 同页 v1/v2 拷贝共存是真实风险：只要有一个插件没有用新 DNPR 重新构建并安装，就会出现。版本判别机制必须与切换同批交付，不能后补。
- `diagnose()` 进包后，包体积会增加，而 DNPR 会被打进每个插件的 `lib/client.js`。`diagnose()` 是否进浏览器产物，还是只在宿主或 lab 使用，需要在 executional 轮定，并用 `--measure-footprint` 量化。

- **问题**：PRE-1116 中，报告合同是否**一次硬切到 schema v2**（选项 B）：全部仓内读者同批切换，不保留 v1 读取分支与转换器；「是否合格」的判定收进 DNPR 包内单一函数，lab 改为调用；读（无副作用）与切窗（仅 lab）拆为两个显式动词，`report()` 旧语义退役、不留别名？还是选择 A / C / D？
- **业主回答**：✅ 同意推荐 **B**（[业主] 2026-11-16）→ 🔒 `T-O-PRE1116-02`

---

## 3. ★ 中场评估 I（Round 1 → Round 2）

### 3.1 对 Round 1 的判定

- [业主] 于 2026-11-16 对 Q1、Q2 均裁定**同意推荐 B**，没有附加条件。两题都已决断，没有 🟡 残留。
- 更关键的是 Q1。它决定「行」从哪里来、身份是谁。Q2 v2 报告里的合同面行、配额划分、证据引用，都以 Q1 的身份模型为前提。
- 两条裁决合起来，把 DNPR 从「插件手写名字 + lab 专用报告」改成「合同面注入 + 面向 agent 的报告 + 包内单一判定」。但两条都留下了**跨进程与跨作者**的空白，这就是 Round 2 的来源（见 3.4）。

### 3.2 本轮已锁定真相

- `T-O-PRE1116-01`（观测接入模型）与 `T-O-PRE1116-02`（报告合同 v2 硬切）已写入 §1.2，并按细则编号 `01.1–01.9`、`02.1–02.7` 展开。计划与 spec rev5 只引用细则编号。

### 3.3 诚实反方制衡

| 风险 | 来自 | 现状证据 | 处置 |
|---|---|---|---|
| 浏览器侧 operation 没有稳定身份 | 01.3 | [DNEE] `opFor(path)` 现场造 operation（`dsh-nano-explorer-extra/src/client/jsonClient.js:19-38`） | 进 executional 轮；禁止退回按路径命名 |
| guard 表行以 path 为键，无独立 id | 01.3 | `route-guard.js:174,210-220`；`dsh-interface/src/build/index.js:52-60` 的 `routeTableModule` 不带 id，而 `bindingTableModule`（`:27-50`）强制 id | 进 executional 轮；须说明为何不违反 `FamilyDefinition.js:20-21` |
| 改动全部路由的唯一入口 | 01.1/01.2 | `packages/dsh-host-route-guard/AGENTS.md`「必须极简可测」 | 先补「未注入时行为不变」测试再改 |
| 同页 v1/v2 拷贝共存 | 02.5 | 页面单例先到先得（`client.js:662-666`），宿主升级分支有缺陷（`host.js:325-341`） | 与 D7/D8 同批交付 |
| `diagnose()` 抬高每个插件的产物体积 | 02.3 | DNPR 打进每个插件的 `lib/client.js`（各包 AGENTS「前置」第 6 条） | executional 轮用 `--measure-footprint` 量化后定 |
| 基线重录后短期无历史可比 | 02.1 | `lab/budgets.mjs:286-296` 版本不符直接退出码 2 | 计划安排 v2 基线三次稳定性运行 |
| [DNK] 宿主没有路由，[DNLS] 没有浏览器面 | 01.1 | `dsh-nano-kitesurf/lib/route-table.js`（`ROUTE_TABLE = []`）；`dsh-nano-local-sandbox/AGENTS.md`「浏览器入口：无」 | 影响宿主数据如何送达页面，进入 Q3 |

### 3.4 为什么提出 Round 2（注入哪些题 + 由哪条 T-O 驱动）

本轮之后做了新一轮代码调查（证据见各题），结论是还剩两处 foundational 级别的空白。Round 1 的两条裁决都依赖它们，但都没有覆盖：

1. **Q3：宿主数据怎样到达读者。** `02.2` 要求报告带宿主证据，`02.4` 要求读取无副作用、切窗只给 lab。但宿主进程到读者的唯一合规桥，是 [DNEE] 一条会**排空全进程窗口**的路由（`dsh-nano-explorer-extra/src/host/routes.js:573-585` → `host.js:93-111`），其余插件以注释形式依赖它；另一条是 `B11` 已判定退役的侧载。`01.8` 又要求共享包与读取面插件中立。Round 1 冻结了「读什么、怎么读」，没有冻结「从哪个面读」。这是公共面（路由表 + 敏感度）变更，必须由业主决定。
2. **Q4：判定所依据的期望与阈值由谁作者。** `02.3` 把判定收进包内单一函数，`01.3` 规定合同面身份来自门面声明，`01.8` 规定共享包里不出现插件名。可是现在插件级阈值、植入期望、场景名单都写死在 `lab/budgets.mjs`、`lab/scenarios.mjs` 和 spec §6.7，而且已经漂移（仍引用 4 天前退役的插件）。`diagnose()` 进包之后，如果没有一个插件自有的作者源，它要么认识每个插件（违反 `01.8`），要么无从判定。这是新增作者源的问题，触及「单一真源」与 CF1115「不新增第二作者源」，必须由业主决定。

其余未定点，包括新场景面范围（[DNT]/[DNMSC]）、请求级关联（`B08`）、agent 访问面、LoAF 归因研究，都依赖 Q3/Q4 的答案才能判断层级，本轮不提出。
---

## 4. Round 2 —— 宿主数据从哪个面读，判定依据由谁作者（`Q3–Q4` · foundational）

> 本轮 second-opinion 模式：`retired`。每题标明驱动真相（锁死③）。

---

### Q3 — 宿主观测数据怎样到达读者：谁提供读取面，窗口怎样界定？（**驱动真相：`T-O-PRE1116-02.2`、`02.4`、`01.8`、`B11`、`B06`** · 来源：初评 FC-3、L-B03、L-E04、G-C06、Q-03）

- **影响范围**：`packages/dsh-performance-review/src/host.js`（`snapshot`/`takeWindow`/writer）、`src/client.js`（`configure` 与宿主快照合并）；[DNEE] `src/host/routes.js:573-585` 及路由表行；[DNLS] `src/host/routes.js:8,1137-1146` 及两条路由表行；[DNK] `src/client/index.js:35-36,54-64`；[DNMS]/[DNN] `src/client/perf.js` 的隐式依赖；`lab/scenarios.mjs:62-67`；`security/route-sensitivity.json`。
- **为什么必须确认**：`02.2` 要求 v2 报告带宿主错误与事件证据，`02.4` 要求任何读取都无副作用，`01.8` 要求插件中立。现有宿主桥同时违反三条：它属于某一个插件、会排空全进程、其他插件依赖它存在。新增、迁移或退役宿主路由，会改变 `security/route-sensitivity.json` 的公共面，需要业主批准。
- **当前建议 / 倾向**（Droid）：**B — 由 DNPR 提供一份只读的全进程宿主视图，每个有页面植入的插件在自己前缀下挂载它；页面单例多源接入、形状校验；宿主侧取消排空，改用游标界定窗口。**
- **Reasoning**：宿主数据的真源只有一份，就是进程单例 `globalThis.__perfReviewHost`（spec §3.3 已定）。读取面只是这份真源的窗口。只要窗口只读、无副作用、内容等价，多一个入口并不制造第二份真源；卸载任何一个插件也不会让其他插件看不到宿主数据。真正需要退役的是「排空」这个动作，以及「某个插件独占读取面」这种依赖。

#### 【对本问题的解读】

本题有三个绑定的子问题：

1. **谁提供读取面**：某一个插件独占（现状），每个插件各自提供，新建专职插件，还是不走 HTTP。
2. **读取面返回什么范围**：全进程宿主快照，还是只返回本插件那一行。
3. **场景窗口怎样界定**：读取时排空（现状 `takeWindow`），还是由读者传入起点（游标），宿主不清任何东西。

本题**不**冻结路由路径名、游标字段、样本保留上限、页面轮询频率、host.json 写盘器的去留。这些进入 executional 轮。

现状事实：

| 事实 | 证据 |
|---|---|
| 唯一合规桥属于 [DNEE]，`mode=window` 调 `takeWindow()` | `dsh-nano-explorer-extra/src/host/routes.js:573-585` |
| `takeWindow()` 清空**所有插件**的窗口样本 | `packages/dsh-performance-review/src/host.js:93-111`（`:107-109` 清空） |
| 路由表登记为已接受的发现「drains samples across all plugins/sessions」 | `dsh-nano-explorer-extra/src/host/route-table.js:198-209` |
| [DNMS]、[DNN] 明文依赖 [DNEE] 存在 | `dsh-nano-model-selector/src/client/perf.js:7-8`；`dsh-nano-notepad/src/client/perf.js:7-9` |
| 页面单例先到先得、不校验形状 | `client.js:562-590`（`:573` 拒绝后来者，`:582` 只判 object） |
| [DNK] 把页面单例指向 [DNLS]，[DNLS] 回 `{ok,spans}` | `dsh-nano-kitesurf/src/client/index.js:36`；`dsh-nano-local-sandbox/src/host/routes.js:1143-1145` |
| [DNK] 宿主没有任何路由；[DNLS] 没有浏览器面 | `dsh-nano-kitesurf/lib/route-table.js`（`ROUTE_TABLE = []`）；`dsh-nano-local-sandbox/AGENTS.md` 身份表 |
| lab 在场景首尾调用排空 | `lab/scenarios.mjs:62-67` |
| 宿主写盘器每 30 s 一次 | `host.js:13-19,168-176` |

#### 【可选选项清单】

| 选项 | 谁提供 | 范围 | 窗口 |
|---|---|---|---|
| **A** 维持 [DNEE] 独占 | [DNEE] 一条路由 | 全进程 | 排空 |
| **B** DNPR 视图 · 多入口挂载（**推荐**） | DNPR 提供只读 handler 与声明片段；每个有页面植入的插件在自己前缀下挂载 | 全进程（只读） | 游标；宿主不排空 |
| **C** 每插件只报本插件行 | 每个插件各自一条 | 仅本插件 | 游标或排空 |
| **D** 不走 HTTP | 无路由；lab/agent 读 `host.json` | 全进程 | 文件 diff |
| **E** 专职观测插件 | 新建一个插件独占读取面 | 全进程 | 任意 |

#### 【推荐选项的详细执行说明与分析】（B）

1. **DNPR 提供唯一的读取实现。** DNPR 宿主出口提供一个只读 handler，以及注册所需的声明片段。它返回整进程宿主快照，形状服从 `02` 的 v2 合同。插件不各自实现读取逻辑，只负责挂载。
2. **每个有页面植入的插件在自己前缀下挂载。** 路由经 guard/registrar 注册，因此自动受鉴权围栏约束，并自动获得 `01` 的合同面观测。每个插件在 `security/route-sensitivity.json` 登记一行（`read:host`，不绑定 session）。只做宿主的插件（[DNLS]、[DNMSC]、[DNK] 宿主侧）不需要路由：它们的行天然出现在任意入口返回的全进程快照里。
3. **页面单例多源接入。** 每个插件 join 时登记自己的入口；单例对返回做形状校验，不合格计入结构计数（D3 根治）；任一入口可用即可，因为所有入口读的是同一个单例。「先到先得」退役，同一时刻只轮询一个健康入口，避免 N 倍轮询。
4. **宿主侧取消排空。** `takeWindow()` 退役，不保留兼容。窗口改由读者传入的游标（单调序号）界定：lab 在场景首尾各记一次游标，宿主返回区间内的样本，不清任何状态。这样 lab、页面、agent 可以同时读，互不干扰，与 `02.4` 的「读无副作用」在宿主侧对齐。宿主侧没有切窗动词。
5. **同批退役：**
   - [DNEE] 现路由的 `mode=window` 排空语义，以及「[DNEE] 是唯一来源」的地位（路由由统一挂载替换，路径名在 executional 轮定）。
   - [DNLS] `/perf-review/host`、`/perf-report` 两条路由、代码与路由表行（`B11`）。
   - [DNK] 指向 [DNLS] 的 `configure` 与 10 s 推送（D1/D3）。
   - [DNMS]、[DNN] 注释所代表的「[DNEE] 负责轮询」隐式依赖。
6. **敏感度口径：** 新入口暴露的数据类别与今天 [DNEE] 路由完全相同（span 名、毫秒、计数、错误时间），不新增数据类别。初评 L-E04 的「已接受发现」从「排空全进程」变为「只读全进程」，风险下降。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

- 真源本来就只有一份：宿主单例是进程级的（`host.js:303-345`，spec §3.3）。多入口读同一单例，不构成第二份可写副本，符合「单一真源」。
- 多入口才能覆盖没有路由或没有页面的插件：[DNK] 宿主 `ROUTE_TABLE = []`，[DNLS] 没有浏览器面。B 用全进程快照让它们的宿主行照常可见。
- 排空是今天多读者互相干扰的根因：`host.js:107-109` 一次清空全部插件的窗口。游标方案让「读」在宿主侧也没有副作用，和 `02.4` 一致。
- 宿主已有可用的基础：每个 span 有事件环（`host.js:22-23,230-231`）和有界窗口列表（`host.js:20-21,223-224`）。游标只需要给样本加单调序号，不需要新的存储类别。

**A（维持 [DNEE] 独占）的反例**

- 违反 `01.8`：[DNMS]、[DNN] 的正确性依赖 [DNEE] 是否安装（`dsh-nano-model-selector/src/client/perf.js:7-8`、`dsh-nano-notepad/src/client/perf.js:7-9`）。卸载 [DNEE]，页面就失去全部宿主数据。
- 违反 `02.4`：`mode=window` 是破坏性读，lab 之外任何人调用都会切掉 lab 的宿主窗口。
- 路由表已把它登记为「已接受」的风险（`route-table.js:208`），维持现状等于把一个临时接受的缺陷永久化。

**C（每插件只报本插件行）的反例**

- [DNLS]（没有浏览器面）、[DNMSC]（host-only）、[DNK] 宿主（没有路由）的宿主行将**永远**进不了页面报告，违背 `02.2` 的宿主证据要求。
- 为了补这个洞，要么给这些插件新开浏览器面或路由（扩大公共面），要么让别的插件代报（又回到跨插件依赖）。

**D（不走 HTTP）的反例**

- `02.2` 要求报告本身带宿主证据。页面里构建报告时拿不到磁盘文件（`aggregate.js:274-277` 的注释已说明这一点）。
- `host.json` 每 30 s 才写一次（`host.js:19`），场景级窗口无法对齐。
- agent 在会话沙箱里通常读不到 `$DSH_HOME`；lab 指向非本机实例时也读不到。

**E（专职观测插件）的反例**

- spec 明文否决：`spec-26nov.md:35`「不做第五个 overlay 插件」；`spec-26nov.md:50-52` 否决独立观测插件。
- 它把「单一插件独占」从 [DNEE] 换成另一个插件，依赖问题原样保留。

**B 的诚实风险**

- `read:host` 入口从 1 个变成约 6 个（[DNN]、[DNEE]、[DNMS]、[DNCS]、[DNT]，以及 [DNK] 若保留页面植入则需新增其第一条宿主路由）。每一条都要进路由清单并经审查。[DNK] 首条宿主路由的取舍需要在 executional 轮单独说明。
- 每个入口都暴露全进程数据。若业主认为「插件 X 的路由返回插件 Y 的计时」本身就不可接受，那就只剩 C，并接受 C 的覆盖缺口。
- 游标方案要求宿主为样本保留足够长的历史，否则 lab 场景过长时起点游标会失效。上限与失效语义需要在 executional 轮定。

- **问题**：PRE-1116 中，宿主观测数据是否改为**由 DNPR 提供一份只读的全进程宿主视图，由每个有页面植入的插件在自己前缀下挂载**（选项 B）：页面单例多源接入并做形状校验；宿主侧 `takeWindow()` 排空退役，改为读者传入游标界定窗口；[DNEE] 的独占地位与排空语义、[DNLS] 两条性能路由、[DNK] 的推送与指向同批退役？还是选择 A / C / D / E？
- **业主回答**：✅ 同意推荐 **B**（[业主] 2026-11-16）→ 🔒 `T-O-PRE1116-03`

---

### Q4 — 判定依据（植入期望、插件级阈值、场景归属）由谁作者、放在哪里？（**驱动真相：`T-O-PRE1116-01.3`、`01.5`、`01.8`、`02.3`、`B09`** · 来源：初评 FC-12、L-C07、L-E01、L-E03、P1-13）

- **影响范围**：`lab/budgets.mjs`、`lab/scenarios.mjs`、`lab/run.mjs`；`packages/dsh-performance-review` 新增的 `diagnose()`；各插件 `scripts/build-client.mjs` 与植入代码；`spec-26nov.md` §6.7 与 §7 插件级行。
- **为什么必须确认**：`02.3` 规定判定只有一份实现，并且在 DNPR 包内。`01.8` 规定共享包里不出现插件名。`01.3` 规定合同面身份来自门面声明，不得另起。三条同时成立时，「`card-wake` 的 live 不得超过 4」这类插件级规则必须有一个**插件自有**的作者源，否则 `diagnose()` 要么认识每个插件，要么无从判定。新增作者源会触及「单一真源」与 CF1115「不新增第二作者源」，需要业主决定。
- **当前建议 / 倾向**（Droid）：**B — 每个插件一份性能声明，作为本插件「非合同面观测键 + 插件级预算 + 场景期望 + 交互目标桶」的唯一作者源；合同面只引用、不复述；构建期烘焙进产物；DNPR 与 lab 只保留插件中立的页级规则。**
- **Reasoning**：今天的判定依据分散在三处：lab 脚本、spec 正文和植入代码里的字符串，而且已经漂移。路由表早已走通「声明 → 构建期常量 → 运行时只读」这条路（各插件 `build-client.mjs` 从 `security/route-sensitivity.json` 烘焙路由表）。性能声明走同一条路，判定依据就能和插件一起版本化、一起安装，共享包也不需要认识任何插件。

#### 【对本问题的解读】

本题决定的是**判定依据的作者归属**，有三个子问题：

1. **依据放在谁那里**：集中在 DNPR/lab，还是分散到每个插件。
2. **和合同面声明是什么关系**：并入 CF1115 的合同族记录，还是另起一份只覆盖非合同面的声明。
3. **作者源和植入代码怎样保持一致**：靠人工对照，还是植入代码直接引用声明。

本题**不**冻结声明的文件名、字段、格式，不改任何阈值数值（`B09`）。是否把声明随产物带到浏览器运行时（与 `02` 遗留的产物体积问题相关），留给 executional 轮量化后决定。

现状事实：

| 事实 | 证据 |
|---|---|
| 插件级阈值写死在 lab | `lab/budgets.mjs:231-241`（`card-wake`）、`:242-252`（`sidebar-graft`/`sidebar-dedupe`/`ctia-watch`） |
| 已退役插件仍在 lab 名单里 | `lab/budgets.mjs:242`；`lab/scenarios.mjs:16`（`shared-open`）；退役日期 `client.js:83-84`（2026-11-12） |
| spec 正文是事实上的命名权威 | [DNEE]「hostSpan names stay inside the spec's v1 set」（`dsh-nano-explorer-extra/src/host/routes.js:329`）；植入表含退役插件（`spec-26nov.md:251,260`） |
| 页级阈值与插件无关 | `lab/budgets.mjs:22-32`（`INPUT_DELAY_P95_LIMIT_MS` 等） |
| 构建期烘焙已有先例 | `packages/dsh-interface/src/build/index.js:27-50`（`bindingTableModule`，强制稳定 id、确定性序列化）；[DNMS] `scripts/build-client.mjs:12-31` 从 `security/route-sensitivity.json` 烘焙路由表 |
| 合同族记录的边界 | `FamilyDefinition.js:18-24`（纯合同、不得作第二作者）；`packages/dsh-interface/AGENTS.md`「不要建通用 IDL/注册中心……不要新增第二作者源」 |
| rev4.1 硬门禁含插件语义的绝对规则 | `spec-26nov.md:300-305`（`card-follow` live=0、`hold` live=0、`git-poll` live=挂载 pane 数） |

#### 【可选选项清单】

| 选项 | 依据放在哪里 | 与合同面的关系 | 一致性 |
|---|---|---|---|
| **A** 维持分散 | lab 脚本 + spec 正文 + 代码字符串 | 无关联 | 人工对照 |
| **B** 每插件性能声明（**推荐**） | 每个插件一份，构建期烘焙 | 只引用合同面身份，不复述 | 植入代码引用声明；测试三方对账 |
| **C** 集中式清单 | DNPR 或 lab 里一份全仓清单 | 可引用 | 人工或测试 |
| **D** 并入 CF1115 合同族 | `FamilyDefinition`/绑定表增加性能字段 | 同一记录 | 构建期 |
| **E** 不声明 | 纯运行时观测 + 相对基线 | 无 | 无 |

#### 【推荐选项的详细执行说明与分析】（B）

1. **声明只覆盖合同面以外的东西。** 每个插件在作者树里放一份性能声明，内容限于：
   - 手写观测键（span/track/usage 的名字与 track kind）；
   - 插件级预算行（引用上述键或合同面身份，标明 hard/audit 级别）；
   - 场景归属与期望（哪个场景必须出现哪些行）；
   - 交互目标桶（落实 `01.8`）。

   合同面清单**不**复述：路由、operation、tool 已在门面声明里存在（`01.3`），声明只用其身份引用。
2. **植入代码引用声明，名字只有一个作者。** 植入调用从烘焙出的常量取名，不在调用处另写字符串。测试做三方对账：声明 ↔ 实际植入调用 ↔ 门面 inventory。声明了未植入、植入了未声明、合同面未被观测，都让测试失败。
3. **构建期烘焙。** 沿用 `dsh-interface/build` 的确定性序列化方式，由各插件 `build-client.mjs` 把声明烤成常量进 `lib/`。插件安装后，判定依据和插件版本一致；版本倾斜时，报告能看出是哪份声明。
4. **DNPR 与 lab 保持插件中立。**
   - DNPR 的 `diagnose()` 只内置插件中立的页级规则（`inputDelayP95`/`processingP95` 50 ms、`structure.*` 全 0、purity 等，来自 `lab/budgets.mjs:22-32` 与 spec §7）。
   - 插件级规则全部来自各插件声明。DNPR 与 lab 源码里不出现任何插件名。
   - lab 的场景列表与预算由声明生成，`budgets.mjs` 与 `scenarios.mjs` 中写死的插件名单退役；`shared-open`、`sidebar-*` 随之消失（D9 根治，不再需要单独清理项）。
5. **spec 退为机制说明。** `spec-26nov.md` §6.7 植入表与 §7 插件级行退役，改为「见各插件性能声明」。spec 只保留机制与页级规则，从此不再是任何名字的权威。
6. **阈值原样迁移。** 本题不改变任何阈值或门禁级别（`B09`）。迁移是逐条搬运，并用「旧 evaluate 与新 diagnose 对同一批基线结论一致」验收（初评 P2-04 的验收口径）。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

- 漂移已经发生：插件 2026-11-12 退役（`client.js:83-84`），`lab/budgets.mjs:242`、`lab/scenarios.mjs:16`、`spec-26nov.md:251,260` 仍在引用。依据与插件分离存放，删插件时没有任何机制提醒。
- spec 正在充当命名权威：`dsh-nano-explorer-extra/src/host/routes.js:329` 让代码「待在 spec 的 v1 集合里」。文档成了代码的作者源，正好与「不得由实现反推合同」相反方向地制造了第二作者。
- 烘焙路径已验证：路由表从 `security/route-sensitivity.json` 烘焙进每个插件（[DNMS] `scripts/build-client.mjs:12-31`），`bindingTableModule` 已提供确定性输出（`dsh-interface/src/build/index.js:7-15,27-50`）。B 不需要新的构建机制。
- 与 `01.3` 不冲突：合同面身份只引用、不复述，因此不形成第二作者源。

**A（维持分散）的反例**

- 违反 `02.3`：`diagnose()` 进包后，如果插件级规则仍在 lab，判定就有两份（包内页级 + lab 插件级）。
- 违反 `01.8`：lab 和 spec 必须认识每个插件，新增插件就要改共享位置。

**C（集中式清单）的反例**

- 和写死桶属性是同一种病：`client.js:86-89` 的 `BUCKET_ATTRS` 正是因为集中存放才残留了退役插件。
- 新插件接入要改共享包或 lab，违反「新插件只改自身」（初评 §5.1 判定标准）。

**D（并入合同族）的反例**

- `FamilyDefinition.js:18-24` 把合同族限定为纯合同语义。track、render span、DOM 桶都不是合同族的操作。
- `packages/dsh-interface/AGENTS.md` 禁止建通用 IDL 或注册中心。把观测策略塞进合同记录，会把 DNPR 的演进节奏绑到合同族上，也违背 `B04`（DNPR 独立）。

**E（不声明）的反例**

- rev4.1 的硬门禁里有插件语义的绝对规则（`spec-26nov.md:300-305`），无法从相对基线推出。
- 没有期望就无法发现「漏植入」：插件少了一行，相对基线只会看到「没有数据」，不会报错。

**B 的诚实风险**

- 声明进入运行时产物会增加体积。是否随 `lib/client.js` 发布，需要与 `02` 的 `diagnose()` 体积问题一起用 `--measure-footprint` 量化。
- 三方对账需要每个插件的测试都跑；只在 DNPR 包内跑不足以发现插件侧漂移。
- 用 path 为键的 guard 表行引用合同面身份，受 Round 1 反方制衡中「表行无独立 id」的影响，需要和那一项一起在 executional 轮解决。

- **问题**：PRE-1116 中，判定依据是否改为**每个插件一份性能声明**（选项 B）：只覆盖非合同面观测键、插件级预算、场景期望与交互目标桶，合同面只引用身份不复述；植入代码引用声明、测试三方对账；构建期烘焙进产物；DNPR 与 lab 只保留插件中立的页级规则，lab 名单与 spec §6.7/§7 插件级行退役？还是选择 A / C / D / E？
- **业主回答**：✅ 同意推荐 **B**（[业主] 2026-11-16）→ 🔒 `T-O-PRE1116-04`

---

## 5. ★ 中场评估 II（Round 2 → Round 3）

### 5.1 对 Round 2 的判定

- [业主] 于 2026-11-16 对 Q3、Q4 均裁定**同意推荐 B**，没有附加条件；两题都已决断，没有残留。
- [业主] 同时确认：本阶段名称为 `PRE-1116`，原指令中的「DNLS01 计划」是笔误，正式计划名为 **PRE-1116 计划**。文首「下游消费者」已更正。
- 更关键的是 Q3。它确定了跨进程的拓扑：宿主真源只有一份，读取面是多个等价的只读窗口，排空动作彻底退役。Q4 则补上了 `02.3`「判定进包」缺的作者源。
- 至此 4 个 foundational 真相（`01–04`）全部冻结：观测从哪里进来，报告是什么样的合同，宿主数据从哪里读，判定依据谁来写。方向已经钉死，可以转入 executional 轮。

### 5.2 本轮已锁定真相

- `T-O-PRE1116-03`（细则 `03.1–03.7`）与 `T-O-PRE1116-04`（细则 `04.1–04.8`）已写入 §1.2。

### 5.3 诚实反方制衡

| 风险 | 来自 | 现状证据 | 处置 |
|---|---|---|---|
| `read:host` 入口约增至 6 个 | 03.2 | 现仅 [DNEE] 一条（`dsh-nano-explorer-extra/src/host/route-table.js:198-209`） | 每条进路由清单审查；[DNK] 首条宿主路由单列 |
| 任一入口都暴露全进程计时 | 03.1 | 与现 [DNEE] 路由同一数据类别 | 业主已接受；justification 同步更新 |
| 游标起点失效 | 03.4 | 宿主窗口上限 512、事件环 32（`host.js:20-23`） | executional 轮定保留上限与失效语义 |
| 声明进入运行时会增加体积 | 04.8 | DNPR 打进每个插件产物 | 与 `02.7` 一起量化 |
| **三方对账、声明引用和 v2 合同面行都依赖一个稳定的合同面身份，而这个身份目前不存在** | 01.3、04.1、04.2 | 路由账本没有 `id` 字段；三个插件各用不同方式产生 id；浏览器 operation 没有 id（详见 Q5） | 进入 Round 3（Q5） |

### 5.4 为什么提出 Round 3（executional · 注入哪些题 + 由哪条 T-O 驱动）

foundational 已经完成。新一轮代码调查发现：在写任何一行实现之前，有三个**合同级的形状**必须先定。后面所有工作项都要引用它们；任何一个不定，都会让实现反过来推导合同，违反「不得由实现反推合同」。

1. **Q5 合同面身份键**（驱动：`01.3`、`01.5`、`03.2`、`04.1`、`04.2`）。`04.2` 的三方对账、`04.1` 的预算引用、`02.2` 的合同面行都以它为键。调查发现路由账本没有 id，三类插件的 id 来源各不相同，浏览器 operation 完全没有 id，`FamilyDefinition` 尚无任何插件采用。
2. **Q6 门面观测事件合同**（驱动：`01.1`、`01.2`、`01.4`、`01.9`）。这是本阶段唯一一处修改 CF1115 门面的公共合同。参数名、事件字段、结果闭集、调用时机、`onCall` 的去留都要先冻结。调查发现 `onCall` 全仓零消费者，而且长连接路由的计时口径需要明确。
3. **Q7 多拷贝协议与版本判别**（驱动：`02.5`、`03.1`、`03.3`、`04.3`，以及事实 D4/D7/D8）。v2 硬切成立的前提，是 v2 能和残留的 v1 拷贝安全共存并把倾斜报出来。调查发现版本号从未变过，两个单例的版本轴互不一致，宿主就地升级分支本身就是 D8 的来源。

其余 executional 事项留待后续轮，根据 Round 3 的答案再定：v2 字段形状与读/切窗动词、游标形状、声明格式与运行时打包、迁移批次与 worktree 切分、[DNT]/[DNMSC] 新场景面、请求级关联（`B08`）、agent 访问面。
---

## 6. Round 3 —— 合同级形状：身份键、观测事件、多拷贝协议（`Q5–Q7` · executional）

> 本轮 second-opinion 模式：`retired`。每题标明驱动真相（锁死③）。

---

### Q5 — 合同面身份键：谁作者、长什么样、怎样到达三侧？（**驱动真相：`T-O-PRE1116-01.3`、`01.5`、`03.2`、`04.1`、`04.2`** · 来源：中场评估 I/II 反方制衡）

- **影响范围**：`security/route-sensitivity.json` 与 `scripts/gen-route-sensitivity.mjs`；8 个插件的 `scripts/build-client.mjs` 与 `lib/{bindings,route-table}.js`；`packages/dsh-interface/src/build/index.js`；`packages/dsh-host-route-guard/src/route-guard.js`（路由记录字段）；三个插件的 `src/client/jsonClient.js`；DNPR 合同面行的键规则。
- **为什么必须确认**：`01.3` 规定观测身份取自门面声明、不从路径推断。`04.1`/`04.2` 规定性能声明引用合同面身份并做三方对账。但「门面声明里的身份」今天只在部分插件存在，来源互不相同，浏览器侧完全没有。不先定身份键，三方对账无法实现，v2 合同面行也没有键。
- **当前建议 / 倾向**（Droid）：**B — 路由账本增加显式 `id` 字段，作为全部 web 合同面身份的唯一作者；全部插件统一由账本烘焙带 id 的绑定表；浏览器 operation 引用烘焙出的 binding id；MCP 沿用 schema 方法名；合同面行使用独立键规则。**
- **Reasoning**：身份必须有且只有一个作者。路由账本已经是全部路由的唯一登记处（敏感度、能力、正文上限都在这里人工审定），把 id 也放在这里，是在已有的单一真源上补一个字段，不另起作者。现在三种 id 来源中，两种是第二作者（手写 `bindings.js`），一种是从路径推导，都应该随之退役。

#### 【对本问题的解读】

本题要定四件事：

1. **作者在哪里**：账本、代码，还是 CF1115 合同族记录。
2. **id 长什么样**：语义名还是路径推导，键规则是什么。
3. **怎样到达 host 侧**：guard 直用和 registrar 两条注册路径都要拿到 id。
4. **怎样到达浏览器侧和 MCP 侧**：浏览器 operation 怎样携带 id，MCP 用什么。

本题**不**决定 guard 直用的插件是否迁到 registrar（`01.1` 已覆盖两条路径），也不改任何路径、方法或敏感度。

现状事实：

| 事实 | 证据 |
|---|---|
| 账本行字段只有 `plugin,path,methods,sensitivity,capability,bodyLimit,sessionBinding,justification`，没有 `id`，也没有 `channel/match` | `security/route-sensitivity.json`（86 行全部无 channel/match）；`scripts/gen-route-sensitivity.mjs:7`（人工审定字段合并时保留） |
| [DNEE] 在构建期从路径推导 id | `dsh-nano-explorer-extra/scripts/build-client.mjs:26-29`（`dnee${suffix}`） |
| [DNN]、[DNT] 手写 `lib/bindings.js` 并提交入库，与账本并行 | `dsh-nano-notepad/scripts/build-client.mjs:9-11`；`dsh-nano-notepad/lib/bindings.js` 头注释「derived from the route-sensitivity ledger plus the fx/sdk prefix surface」；`dsh-nano-terminal/lib/bindings.js` 头注释「Replaces lib/route-table.js」 |
| [DNMS]、[DNCS]、[DNK]、[DNLS] 烘焙不带 id 的路由表 | [DNMS] `scripts/build-client.mjs:12-31`；[DNCS] `scripts/build-client.mjs:18-26`；[DNK] `scripts/build-client.mjs:18-24` |
| guard 路由记录没有 id 字段 | `route-guard.js:211-220` |
| 构建出口：`bindingTableModule` 强制稳定 id，`routeTableModule` 自称兼容助手 | `packages/dsh-interface/src/build/index.js:31-33`、`:52` |
| 浏览器 operation 现场构造，没有 id | [DNEE] `src/client/jsonClient.js:19-38`；[DNN] `src/client/jsonClient.js:11-33`；[DNMS] `src/client/jsonClient.js:14-37` |
| `defineFamily` 只在测试中使用，没有插件采用 | 全仓 grep：仅 `packages/dsh-interface/test/family-definition.test.mjs` |
| MCP 工具名来自 schema 单源 | `dsh-nano-terminal/AGENTS.md`「TOOLS 由 `schema/dnt-mcp.openrpc.json` 单源生成」；`createMcpToolset.js:38-40` |
| 手写 span 键规则禁止 `.` | `state.js:13` |

#### 【可选选项清单】

| 选项 | 作者 | id 形态 | 浏览器侧 |
|---|---|---|---|
| **A** 路径即身份 | 无需作者 | `method + path` | 用请求 URL |
| **B** 账本显式 id（**推荐**） | `security/route-sensitivity.json` 新增 `id`（及 `channel/match`） | 语义名 `<插件缩写>.<面名>` | operation 携带烘焙的 `bindingId` |
| **C** 构建期从路径推导 | 各插件构建脚本（推广 [DNEE] 规则） | 路径变换 | 同 B，但 id 由路径算出 |
| **D** 先全面采用 FamilyDefinition | 每插件写合同族记录 | `contractId × operationId/bindingId` | `projectOperations` |

#### 【推荐选项的详细执行说明与分析】（B）

1. **账本补字段。** `security/route-sensitivity.json` 每行增加 `id`，同时补上 `channel`、`match`，让账本完整描述全部 web 合同面（含 [DNN] 的 fx/sdk prefix 与 [DNT] 的 upgrade/prefix 行）。`id` 与 `sensitivity` 一样属于人工审定字段，`gen-route-sensitivity.mjs` 合并时保留（沿用 `:7` 的机制）。初值沿用已经在用的 id（`dnee.*`、`dnn.*`、`dnt.*`），其余插件一次性命名，命名后不随路径变化。
2. **统一烘焙，同批退役第二作者。** 全部 8 个插件的构建都从账本经 `bindingTableModule` 烘焙 `lib/bindings.js`（强制 id、确定性输出）。同批退役：[DNEE] 的路径推导（`build-client.mjs:26-29`）；[DNN]、[DNT] 手写的 `lib/bindings.js`（改为生成物）；`routeTableModule` 与四个插件的 `lib/route-table.js`。
3. **host 侧带 id。** guard 的路由记录增加 `id`（`route-guard.js:211-220` 冻结记录多一个字段），registrar 已有 `binding.id`。两条路径的观测事件都携带它。
4. **浏览器侧引用 id。** 各插件构建时把本插件的 binding id 常量烘焙进浏览器产物（只含 id 与 path，不含敏感度等字段）。operation 记录必须携带 `bindingId`；`createJsonClient` 的观测事件报告这个 id。缺 id 的 operation 不按 URL 建键，只计入结构计数。
5. **MCP 侧不另起。** tool 身份就是 schema 方法名（如 `term.session.read`）。schema 已是唯一作者。
6. **键规则独立。** 合同面行键使用独立规则（示意 `^[a-z0-9][a-z0-9.-]{0,63}$`），允许点分，与手写 span 的 `NAME_RE` 分开（落实 `01.5`）。
7. **与 CF1115 合同族前向兼容。** 账本 `id` 就是将来的 `bindingId`。某个插件以后迁到 `FamilyDefinition` 时，作者源按 `FamilyDefinition.js:23-24`「每族迁移一次」转移，账本退为派生物，id 不变，观测历史不断。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

- 账本已是唯一登记处：人工审定字段在合并时保留（`gen-route-sensitivity.mjs:7`），四个插件已经从它烘焙路由表。加一个字段，不新增作者。
- 退掉两个第二作者：[DNN]、[DNT] 手写 `bindings.js` 与账本并行维护，正是「单一真源」要消除的形态。
- 构建出口已经准备好：`bindingTableModule` 强制 id（`build/index.js:31-33`）；`routeTableModule` 自称兼容助手（`:52`），按「能彻底退役就不兼容」应退役。
- 前向兼容 CF1115：`FamilyDefinition.js:23-24` 允许旧账本在迁移后保留为派生物，B 的 id 可以原样成为 `bindingId`。

**A（路径即身份）的反例**

- 直接违反 `01.3` 与 `FamilyDefinition.js:20-21`「never inferred from path」。
- prefix 绑定下真实 URL 含会话 id：[DNT] `/session/<id>/close`（`web-routes.js:186-195`）。按 URL 建键会把 session id 写进报告，违反 `B07`。
- 路径改名会切断观测历史。

**C（构建期路径推导）的反例**

- 本质仍是从路径推断身份，只是换到构建期做，同样违反 `01.3`。
- 推导规则只适用于 http+exact。[DNEE] 的规则（`build-client.mjs:27-29`）无法表达 prefix/upgrade，也无法表达一条绑定多个操作。

**D（先全面采用 FamilyDefinition）的反例**

- 目前零采用（只有测试用到 `defineFamily`）。让 PRE-1116 等待 8 个插件完成合同族迁移，会把本阶段阻塞在另一项未排期的工作上。
- B 与 D 不冲突：B 的 id 就是 D 的 `bindingId`，D 将来落地时作者迁移一次即可。

**B 的诚实风险**

- 账本格式变化会影响 `security/route-inventory.md` 的生成与各包 AGENTS 中的路由行数说明，需要同批更新。
- 约 50 行需要一次性命名，命名质量需要 [业主] 抽查。
- 浏览器产物会多出一份 id 常量（体积很小，但计入 `02.7` 的产物体积测量）。

- **问题**：PRE-1116 中，合同面身份是否采用选项 B：路由账本增加 `id`（及 `channel/match`）作为全部 web 合同面身份的唯一作者；8 个插件统一由账本烘焙带 id 的绑定表，[DNEE] 路径推导、[DNN]/[DNT] 手写 `bindings.js`、`routeTableModule` 与 `route-table.js` 同批退役；guard 路由记录带 id；浏览器 operation 引用烘焙的 `bindingId`；MCP 沿用 schema 方法名；合同面行使用独立键规则？还是选择 A / C / D？
- **业主回答**：✅ 同意推荐 B（[业主] 2026-11-16）→ 已冻结为 `T-O-PRE1116-05`

---

### Q6 — 门面观测事件合同：参数、字段、结果闭集、时机，`onCall` 怎么处理？（**驱动真相：`T-O-PRE1116-01.1`、`01.2`、`01.4`、`01.9`、`B07`** · 来源：初评 G-F01~G-F05、G-C01）

- **影响范围**：`packages/dsh-host-route-guard/src/route-guard.js`；`packages/dsh-interface/src/host/{createWebRegistrar,createJsonClient,createMcpToolset}.js`；`packages/dsh-interface/src/contracts/`（事件形状定义）；对应测试 `route-guard.test.mjs`、`registrar.test.mjs`、`json-outcome.test.mjs`、`mcp-toolset.test.mjs`；[DNT] `lib/mcp.js` 产物。
- **为什么必须确认**：`01.1` 批准了注入口，但没有定义注入的是什么。这是本阶段唯一一处修改 CF1115 门面的公共合同，字段与结果闭集一旦被 DNPR 和 v2 报告消费，就不能由实现随意扩展（「不得擅自扩约」）。
- **当前建议 / 倾向**（Droid）：**B — 四个门面统一使用参数 `observe`，接收一种定义在 `dsh-interface/contracts` 的观测事件；按面划分的结果闭集；调用结束时同步调用一次；不携带任何请求内容；`onCall` 退役不留别名。**
- **Reasoning**：一种事件形状让 DNPR 只写一个适配器，也让 v2 报告的「结果」维度在四类面上口径一致。事件只带身份、结果和毫秒，不带请求对象，DNPR 就没有机会、也没有必要去解析 URL。`onCall` 没有任何消费者，保留它只会让门面有两个钩子。

#### 【对本问题的解读】

本题要定六件事：参数名；事件字段；每类面的结果闭集；调用时机与计时口径；未注入时的成本；`onCall` 的去留。

本题**不**定 DNPR 如何把事件聚合成 v2 行（属于后续 v2 字段题），也不定长连接（WebSocket/SSE）的生命周期指标（属于 [DNT] 新场景面题）。

现状事实：

| 事实 | 证据 |
|---|---|
| guard 的四条出口：rejection、405、正常返回、throw→500 | `route-guard.js:223-241` |
| registrar prefix 同样四条出口；upgrade 三条（非 GET、rejection、交给 handler） | `createWebRegistrar.js:86-101`、`:105-117` |
| jsonClient 每次调用有 7 个 return 点，结果是 ok 或五类失败之一 | `createJsonClient.js:56-107`、`:20-28` |
| MCP 工具调用：未知工具 -32602、成功、throw→`isError`+`kind` | `createMcpToolset.js:66-88` |
| `onCall` 在 dispatch 之前触发，只带 `{op,name}`；全仓没有任何调用方传入 | `createMcpToolset.js:27,72`；全仓 grep 仅定义处与 [DNT] `lib/mcp.js:29,72` 产物副本；[DNT] 创建 toolset 时未传（`src/host/mcp.js:190-195`） |
| [DNT] 有自己的审计，不依赖 `onCall` | `src/host/web-routes.js:154`（`mcp.audit`）；`src/host/mcp.js:60,73,79` |
| SSE handler 写完响应头即返回，连接在之后持续 | [DNT] `src/host/web-routes.js:167-181` |
| 门面目前不读时钟 | `packages/dsh-interface/src/host` grep `performance\|hrtime\|Date.now` 无结果 |
| handler 内部 catch 后自行返回 500，guard 看不到 throw | [DNMS] `index.js:180-188` |

#### 【可选选项清单】

| 选项 | 内容 |
|---|---|
| **A** 各门面各自定义 | guard 回调 `{path,status,ms}`，jsonClient 回调 outcome，MCP 保留 `onCall` 再加 `onResult` |
| **B** 统一观测事件合同（**推荐**） | 参数统一为 `observe`；事件形状与结果闭集定义在 `dsh-interface/contracts`；`onCall` 退役 |
| **C** 回调接收原始对象 | 把 `req/res`、operation、JSON-RPC 消息交给回调，由 DNPR 自取所需 |
| **D** 全局事件通道 | 门面向 `node:diagnostics_channel` 或全局总线发事件，DNPR 订阅 |

#### 【推荐选项的详细执行说明与分析】（B）

1. **参数与定义位置。** 四个门面的可选参数统一命名为 `observe`。事件形状与结果闭集作为纯定义放进 `dsh-interface/contracts`（三侧共享的词汇，无 I/O，符合三出口纪律）。DNPR 只消费，不定义。
2. **事件字段（最小集）。**
   ```js
   // 示意：字段集合本题冻结，具体常量名在实现时按此落地
   { surface: 'http' | 'upgrade' | 'json' | 'mcp',
     id,        // Q5 的合同面身份；MCP 为 tool 名
     plugin,    // 门面已持有的 plugin 标识
     outcome,   // 见第 3 条闭集
     ms,        // 门面测得的毫秒
     status?,   // http：res.statusCode；json：httpStatus（有则带）
     kind? }    // mcp 失败时的 structuredContent.kind
   ```
   事件**不**携带 URL、query、请求正文、header、session id、错误消息文本（`B07`）。
3. **结果闭集（按面）。**
   - `http`（guard、registrar exact/prefix）：`ok`（handler 正常返回）、`rejected`（requestRejection）、`method`（405）、`failed`（handler throw→500）。handler 自己写的 4xx/5xx 由 `status` 体现，这正是 D5 的根治点。
   - `upgrade`：`accepted`（交给 handler）、`rejected`、`method`。`ms` 只计握手段。
   - `json`：`ok` 或 `FAILURE_KIND` 五类之一，直接复用已冻结枚举（`B05`）。
   - `mcp`：`ok`、`error`（带 `kind`）、`rejected`（未知工具等协议层拒绝）。
4. **时机与计时。** 每次调用结束时同步调用一次 `observe`，不 await。门面用 `globalThis.performance.now()` 计时，不引入 `node:*`。回调异常被门面吞掉（`01.2`）。`ms` 的口径是「到 handler/调用返回为止」：SSE 这类长连接的 handler 写完头就返回（[DNT] `web-routes.js:167-181`），`ms` 只是建立时长；门面不推断连接寿命。
5. **未注入零成本。** 未传 `observe` 时，门面不读时钟、不构造事件。测试锁定「未注入时响应与现状逐字一致」，先写测试再改代码（`01.2`）。
6. **`onCall` 退役。** 全仓零消费者，由 `observe` 取代，不保留别名，JSDoc 同步删除。[DNT] 自有审计不受影响。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

- `onCall` 零消费者（grep 仅定义处与 [DNT] 产物副本，[DNT] 源码未传），退役没有迁移成本，符合「能彻底退役就不兼容」。
- 结果信息门面早已掌握（`route-guard.js:224-240`、`createJsonClient.js:20-28`、`createMcpToolset.js:79-86`），B 只是把它交出去，不新增判定逻辑，符合 route-guard「不要加业务逻辑」。
- 统一形状让 v2 报告的结果维度（`02.2`）在四类面上可比；`json` 面直接复用五类枚举，不另造（`B05`）。
- 事件里没有请求对象，DNPR 无从解析 URL，结构上保证 `01.3` 与 `B07`。

**A（各门面各自定义）的反例**

- 四种形状意味着 DNPR 要写四个适配器，v2 报告的结果维度在四类面上口径各异，`02.2` 的「键稳定、自解释」无法保证。
- 保留 `onCall` 再加 `onResult`，门面同时存在两个钩子，违反「能彻底退役就不兼容」。

**C（回调接收原始对象）的反例**

- DNPR 拿到 `req` 就能读 URL、header、正文，`01.3`（不从路径推断）与 `B07`（不记路径、session id）只能靠自觉维持。
- 把 Node 的 `req/res` 形状变成门面合同的一部分，浏览器侧与宿主侧无法统一。

**D（全局事件通道）的反例**

- `diagnostics_channel` 是进程级全局状态，违反 `dsh-interface` host 出口「不得持有跨实例全局态」，也违反 contracts「无 `node:*`」。
- 浏览器没有对等机制。
- 门面与 DNPR 的连接从「显式注入」变成「隐式订阅」，违背 `B04` 的注入式约束。

**B 的诚实风险**

- 结果闭集成为公共合同，以后新增值需要 [业主] 批准。
- `http` 面的 `ok` 只表示「handler 没有 throw」，handler 写 500 时 `outcome=ok, status=500`。读者必须同时看 `status`，v2 报告需要按状态类分维度呈现（后续 v2 字段题处理）。
- 门面多一次 `performance.now()` 调用，只在注入时发生。

- **问题**：PRE-1116 中，门面观测事件合同是否采用选项 B：四门面统一参数 `observe`；事件形状 `{surface,id,plugin,outcome,ms,status?,kind?}` 与按面划分的结果闭集定义在 `dsh-interface/contracts`；不携带任何请求内容；调用结束时同步调用一次、异常被吞、计时到 handler 返回为止；未注入零成本；`onCall` 退役不留别名？还是选择 A / C / D？
- **业主回答**：✅ 同意推荐 B（[业主] 2026-11-16）→ 已冻结为 `T-O-PRE1116-06`

---

### Q7 — 多拷贝协议与版本判别：v2 怎样与残留拷贝共存，倾斜怎样可见？（**驱动真相：`T-O-PRE1116-02.5`、`03.1`、`03.3`、`04.3`，事实 D4/D7/D8（`B10`）** · 来源：初评 FC-2、L-B04~L-B06）

- **影响范围**：`packages/dsh-performance-review/src/{client,host,state}.js`（单例安装、contributors、版本常量）；8 个插件的 `scripts/build-client.mjs`（构建戳注入）与植入代码（`libVersion` 参数）；`lab/budgets.mjs:286-301`（版本指纹）。
- **为什么必须确认**：DNPR 被打进 8 个插件的产物，每个插件单独安装（各包 AGENTS「唯一命令 `dsh plugin --profile web add <spec>`」）。只要有一个插件没有重建，同一页面或进程里就会同时存在 v1 和 v2 拷贝。`02.5` 要求识别并报出共存，但现有单例协议无法区分版本。这决定了 v2 硬切能否安全落地。
- **当前建议 / 倾向**（Droid）：**B — 单例键带协议主版本，v2 不读取、不修改、不升级任何旧对象；同协议内先到者提供实现、后到者复用，不做就地升级；构建期注入 DNPR 内容哈希作为构建戳，`LIB_VERSION` 与 `libVersion` 参数退役；contributors 按插件与构建戳去重；倾斜进入报告。**
- **Reasoning**：今天的单例协议既不知道对方是哪个版本，又试图在不同版本之间迁移状态，D8 就出在这里。硬切的正确做法是不同协议互不接触，各自独立，同时把「存在旧协议」作为一条事实报出来。同协议内只需要知道「有几种构建」，不需要任何迁移逻辑。

#### 【对本问题的解读】

本题要定四件事：

1. **不同协议怎样共存**：隔离、接管，还是拒绝。
2. **同协议多拷贝怎样共存**：复用、接管，还是迁移状态。
3. **版本信号从哪里来**：手写常量，还是构建期自动生成。
4. **倾斜怎样可见**：contributors 怎样存，报告里怎样呈现。

本题**不**定 v2 报告字段的具体名字，只定这些信息必须进入报告。

现状事实：

| 事实 | 证据 |
|---|---|
| 页面单例先到先得，不检查版本 | `client.js:662-666` |
| 宿主单例在旧对象缺 API 时就地升级：缺 `_state` 时状态全丢，有 `_state` 时沿用旧 writer（旧闭包写旧状态） | `host.js:315-345`（`:328`、`:338`） |
| `LIB_VERSION` 恒为 `'0.1.0'`，与包版本相同且从未变化 | `state.js:9`；`packages/dsh-performance-review/package.json:3` |
| 宿主快照自称 `version: 2`，报告是 `REPORT_VERSION = 1`，两个版本轴互不对应 | `host.js:75`；`state.js:10` |
| lab 版本指纹用的 `observerVersion` 就是 `LIB_VERSION`，因此永远相等 | `lab/budgets.mjs:291,300`；`client.js:620` |
| contributors 每次 join 都追加，无界 | `client.js:528`；`host.js:247` |
| 8 份独立打包 | [DNMS] `scripts/build-client.mjs:72-78`、[DNCS] `:57-59`、[DNN] `:50-56`（宿主 bundle）；[DNEE]/[DNK] 宿主源码直接 import（`src/host/routes.js:4`、`src/host/perf.js:3`） |
| 构建期 define 已有先例 | [DNEE] `scripts/build-client.mjs:65-67`（`__NXE_VERSION__`）；[DNMS] `:55` |

#### 【可选选项清单】

| 选项 | 跨协议 | 同协议 | 版本信号 |
|---|---|---|---|
| **A** 维持先到先得，修补 D8 | 混用同一对象 | 就地升级（修 bug） | 手写 `LIB_VERSION` |
| **B** 协议键隔离 + 构建戳（**推荐**） | 不同键、互不接触，旧协议存在即计数 | 先到者提供实现，后到者复用；不升级、不迁移 | 构建期 DNPR 内容哈希 |
| **C** 最新者接管 | 新版替换旧对象并迁移状态 | 同左 | 语义化版本比较 |
| **D** 依赖发布流程 | 不处理，要求全部插件同批重建安装 | 同左 | 不需要 |

#### 【推荐选项的详细执行说明与分析】（B）

1. **协议主版本进单例键。** 页面 `window.__perfReview` 与宿主 `globalThis.__perfReviewHost` 两个键退役，改为带协议主版本的键（示意 `__dnpr_v2`、`__dnprHost_v2`，名字在实现时定）。v2 代码不读取、不修改、不升级任何旧键上的对象。
2. **旧协议存在即报出。** v2 单例安装时检查旧键；存在则在结构计数里记一条（示意 `legacyCopies`），v2 报告与 `diagnose()` 的 findings 中可见（`02.5`）。旧拷贝照常按旧协议运行，互不干扰。
3. **同协议：复用，不升级。** 同一协议号下，先到的拷贝提供实现，后到的拷贝复用它。宿主就地升级分支（`host.js:315-345`）整体退役，不再有跨版本状态迁移。同协议内单例对外 API 只增不改；需要不兼容改动时协议号 +1，也就是下一次硬切。
4. **构建戳取代手写版本。** 各插件构建时，把 DNPR 源码的内容哈希经 esbuild define 注入（沿用 `__NXE_VERSION__` 先例）。`LIB_VERSION` 常量、join/hostJoin 的 `libVersion` 参数、`observerVersion` 字段退役（不兼容）。lab 版本指纹改用协议号与构建戳。
5. **contributors 有界去重。** 按 `pluginId@build` 去重存储（修 D4）。报告列出各插件的构建戳与声明哈希（`04.3`）。同协议下出现多于一个构建戳，即为一条 audit 级 finding「同协议倾斜」。
6. **页面与宿主同一规则。** 两侧单例使用同一套协议键与构建戳规则，`03.3` 的多源接入在 v2 单例内部实现。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

- D8 正是「跨版本迁移状态」失败的实例：`host.js:328` 缺 `_state` 时全丢，`:338` 沿用旧 writer 写旧状态。B 不迁移，就没有这一类缺陷。
- 版本信号目前完全失效：`LIB_VERSION` 从未变化（`state.js:9`、`package.json:3`），lab 指纹因此永远相等（`budgets.mjs:291,300`）。内容哈希由构建自动产生，不依赖人记得改版本号。
- 插件逐个安装是常态（各包 AGENTS 的安装命令按包执行），共存不是理论风险。
- define 注入已有先例（[DNEE] `build-client.mjs:65-67`、[DNMS] `:55`），不需要新的构建机制。

**A（维持先到先得，修补 D8）的反例**

- v1 与 v2 共用同一个对象，v2 的字段与动词（`02.4`）会被 v1 拷贝调用或覆盖，`02.5` 要求的识别无从谈起。
- 修补 D8 属于 hotfix：保留跨版本迁移这个机制本身，下一次版本变化还会再出同类问题。

**C（最新者接管）的反例**

- 迁移状态要求新代码理解旧对象的内部形状，这就是兼容代码，违反「能彻底退役就不兼容」。
- 按语义化版本判断「谁更新」，而现有版本号恒定不变，没有可比的依据。

**D（依赖发布流程）的反例**

- 安装按包进行，部分升级会发生；D 下倾斜完全不可见，违反 `02.5`。
- 「不得过度仪式」也不允许为此强加全量重装的发布门禁。

**B 的诚实风险**

- 过渡期内，页面上可能同时运行 v1 与 v2 两套 PerformanceObserver。开启采集时成本翻倍，直到所有插件重建安装。`legacyCopies` 会把这一点报出来。
- 8 个插件的构建脚本都要改（注入构建戳），植入代码要去掉 `libVersion` 参数，属于必须同批完成的机械改动。
- 内容哈希的计算范围（只算 `src/`，还是包含 `package.json`）需要在实现时固定，否则同一份代码可能产生不同的戳。

- **问题**：PRE-1116 中，多拷贝协议是否采用选项 B：单例键带协议主版本，v2 不读取、不修改、不升级旧对象，旧协议存在即计数报出；同协议先到者提供实现、后到者复用，宿主就地升级分支退役；构建期注入 DNPR 内容哈希作为构建戳，`LIB_VERSION`、`libVersion` 参数与 `observerVersion` 退役；contributors 按 `pluginId@build` 去重，多构建戳即同协议倾斜 finding？还是选择 A / C / D？
- **业主回答**：✅ 同意推荐 B（[业主] 2026-11-16）→ 已冻结为 `T-O-PRE1116-07`

---

## 7. ★ 中场评估 III（Round 3 → Round 4）

### 7.1 对 Round 3 的判定

- [业主] 于 2026-11-16 对 Q5、Q6、Q7 均裁定**同意推荐 B**，没有附加条件；三题都已决断，没有残留。
- Round 3 定下了三个合同级的形状，后面所有工作项都会引用它们：
  - **身份**：合同面的 id 只有一个作者（路由账本），host、浏览器、MCP 三侧引用同一个 id（`05`）。
  - **事件**：四个门面交给 DNPR 的是同一种事件，结果取值是固定的闭集，不带任何请求内容（`06`）。
  - **共存**：v2 与残留的 v1 拷贝互不接触，版本信号由构建自动产生，倾斜进入报告（`07`）。
- 这三条都是「写入侧」的合同：数据怎样产生、怎样带上身份、怎样在多拷贝下不打架。「读取侧」的合同（报告长什么样、怎样读、怎样切窗口、依据从哪里来、从哪个路由读）还没有定形，这是 Round 4 的焦点。

### 7.2 本轮已锁定真相

- `T-O-PRE1116-05`（细则 `05.1–05.9`）、`T-O-PRE1116-06`（细则 `06.1–06.7`）、`T-O-PRE1116-07`（细则 `07.1–07.7`）已写入 §1.2。

### 7.3 诚实反方制衡

| 风险 | 来自 | 现状证据 | 处置 |
|---|---|---|---|
| 账本约 50 行一次性命名，命名质量决定 v2 报告可读性 | 05.2 | 账本 86 行，现只有 [DNEE]/[DNN]/[DNT] 有 id | 计划中单列「命名表」工作项，[业主] 抽查后再烘焙 |
| `http` 面 `ok` + `status=500` 的组合容易被误读 | 06.7 | [DNMS] handler 自行 catch 后写 500（`dsh-nano-model-selector/index.js:180-188`） | 进入 Round 4 Q8：v2 合同面行按状态类分维度 |
| 过渡期 v1、v2 两套观察器同时运行，开启采集时成本翻倍 | 07.2 | 8 个插件逐个安装 | `legacyCopies` 报出；不加发布门禁（「不得过度仪式」） |
| **读取侧仍在用 v1 语义**：`report()` 读即清窗、宿主 `takeWindow()` 排空、lab 用 `?mode=window` 首尾各调一次、`diffHostSnapshots` 只能给出累计分位数 | 02.4、03.4 | `client.js:602-636`、`host.js:93-111`、`lab/scenarios.mjs:62-66,114,190`、`aggregate.js:312-333` | 进入 Round 4 Q8 |
| **判定依据仍写死在 lab**：预算按轨道名硬编码，场景按插件写死 | 04.1、04.5 | `lab/budgets.mjs:204-252`、`lab/scenarios.mjs:117-187`、`lab/run.mjs:55,68,93,259` | 进入 Round 4 Q9 |
| **宿主读取面的落地细节未定**：路径、参数、轮询、写盘器、[DNK] 是否挂路由；另有一条未登记的整进程快照外送 | 03.2、03.7 | `host.js:131-176`、`client.js:567-590`、`dsh-nano-kitesurf/index.js:628,641,651` | 进入 Round 4 Q10 |

### 7.4 为什么提出 Round 4（executional · 注入哪些题 + 由哪条 T-O 驱动）

写入侧合同已冻结。新一轮代码调查确认：读取侧还有三组形状必须先定，否则实现会反推合同。

1. **Q8 v2 报告与读侧动词、宿主游标**（驱动：`02.2`、`02.4`、`02.7`、`03.4`、`06.7`、`07.2`、`07.5`）。`02` 只定了方向（agent 优先、读与切窗分离），`03.4` 只定了「游标取代排空」。字段布局、动词名、游标形状与失效语义、`diagnose()` 是否进浏览器，都是 executional 轮留下的口子。
2. **Q9 性能声明的格式与投递**（驱动：`04.1–04.8`、`05.7`、`07.4`、`07.5`）。`04` 定了「每插件一份声明，构建期烘焙」，`04.8` 把文件名、字段、格式、是否进运行时留到 executional 轮。调查发现 lab 的「插件中立」只是表面：预算按轨道名硬编码，对所有插件循环套用。
3. **Q10 宿主读取路由的落地与残余退役**（驱动：`03.1`、`03.2`、`03.5`、`03.7`、`05.2`、`07.3`、`B05`、`B07`、`B11`）。`03.7` 留下了路径名、轮询频率、写盘器去留，`03.2` 留下了 [DNK] 是否挂首条宿主路由。调查另外发现 [DNK] 把整进程快照推进容器内的 MCP bridge，这是 `03.5` 清单之外的第二个读取面。

### 7.5 能否在 Round 4 完成真相层冻结

**判断：不能。还需要 Round 5，预计是最后一轮。**

Round 4 冻结后，方向层与合同层将全部钉死。剩下的是交付层的三类事项，它们依赖 Round 4 的答案，不能提前到本轮：

| 残余事项 | 为什么不能并入 Round 4 | 依赖 |
|---|---|---|
| 迁移批次、worktree 切分与验收口径（哪些改动必须同批，哪些可以分批，旧 `evaluate` 与新 `diagnose()` 的对照怎样跑） | 批次边界取决于 Q8 的读者改动面与 Q9 的声明烘焙方式 | `02.1`、`04.7`、`05.3`、`06.5`、Q8、Q9 |
| `01.7` 的逐个硬切判定（[DNMS] `catalog`、[DNN] `read`/`save` 与合同面行是否整面重合） | 需要按 `06` 的事件口径逐条核对 span 与合同面的覆盖范围 | `01.7`、`05`、`06` |
| 非目标的显式 defer 登记（请求级关联 `B08`、[DNT]/[DNMSC] 新场景面与 track kind、agent 访问面、LoAF 归因研究） | 是否 defer、defer 到哪里，要看 v2 报告和读取面最终提供了什么 | `B08`、Q8、Q10 |

如果 Round 4 的回答没有引出新的合同级问题，Round 5 用一轮 3 题处理上表，然后进入 §10 收口并撰写 **PRE-1116 计划**。

> **时点注记（Round 5 冻结时追加）**：上段是 Round 3 结束时的判断，原文保留。章节后来重编号，收口在 §12，不在 §10。表中 3 个候选 span 不是全集，全集是 `12.2` 的 9 个。该判断已兑现：Round 5 三题已冻结，见 §11、§12。

---

## 8. Round 4 —— 读侧合同：报告、声明、读取面（`Q8–Q10` · executional）

> 本轮 second-opinion 模式：`retired`。每题标明驱动真相（锁死③）。

---

### Q8 — v2 报告与读侧动词、宿主游标：字段怎样分区，怎样读，窗口怎样界定？（**驱动真相：`T-O-PRE1116-02.2`、`02.4`、`02.7`、`03.4`、`06.7`、`07.2`、`07.5`** · 来源：初评 FC-8~FC-10、L-B03；中场评估 III 反方制衡）

- **影响范围**：`packages/dsh-performance-review/src/{client,host,aggregate,state,markdown}.js`；新增 DNPR 纯函数出口 `diagnose`；`lab/{run,scenarios,budgets,candidates,diagnose-inp,diagnose-render}.mjs`；`lab/baseline/baseline.json`；`spec-26nov.md` §6.5；DNPR 测试。
- **为什么必须确认**：`02` 定了「硬切到 v2、agent 优先、读与切窗两个动词、判定进包」，`03.4` 定了「宿主用游标取代排空」。但 v2 的分区、动词名、游标形状、游标失效时怎么办、`diagnose()` 是否进浏览器产物，都没有定。这些是 `02.1` 要求「同批改完全部读者」的前提：读者改成什么样，取决于本题。
- **当前建议 / 倾向**（Droid）：**B — v2 报告按「来源」分区（页级 / 手写 / 合同面 / 宿主 / 证据 / 结构），每个分位数行带 `basis` 与 `n`；说明只在相关时出现并带稳定 id；判定不进报告，由 Node 侧 `diagnose(report, inputs)` 产出 findings；页面动词为 `read()` 与 `cutWindow()`；宿主游标为 `{epoch, seq}`，按样本序号界定窗口，失效时如实标注截断、不报错。**
- **Reasoning**：分区让 agent 一眼知道一行数据从哪里来、有多可信；`basis` 把「窗口精确」和「累计近似」区分开，这正是 v1 混在一起的地方。判定留在 Node 侧，浏览器产物不背预算表。宿主用序号而不是时间界定窗口，多读者互不干扰，也不受时钟跳变影响。

#### 【对本问题的解读】

本题要定五件事：

1. **v2 顶层分区与必备字段**（字段集合本题冻结，常量名实现时落地）。
2. **说明（notes）与判定（findings）的位置**。
3. **页面侧的动词**：读、切窗、计数清零、宿主源接入分别叫什么，哪些退役。
4. **宿主游标的形状、样本保留与失效语义**。
5. **`diagnose()` 是否进浏览器产物**（`02.7`）。

本题**不**定声明格式（Q9），也不定宿主路由的路径与轮询（Q10）。

现状事实：

| 事实 | 证据 |
|---|---|
| v1 报告是「页级 + 按插件平铺」，手写 span、宿主 span 混在同一插件行里，没有合同面区 | `aggregate.js:194-221`、`:248-268`；`spec-26nov.md:179-220` |
| 页面 `report()` 读完即 `resetWindow()`，读有副作用 | `client.js:602-636`（`:634`） |
| 页面另有 `reset`、`resetCounters`、`configure`、`setHostSnapshotProvider` 四个入口 | `client.js:537-600`、`:638-652` |
| 7 条说明里有 5 条无条件输出，与本次数据无关 | `aggregate.js:239-243` |
| 宿主 `takeWindow()` 读完清空所有 span 的窗口，全进程只能有一个读者 | `host.js:93-111`（`:107-109`） |
| 宿主每个 span 保留最近 512 个窗口样本、64 个累计样本、32 条事件 | `host.js:21-23`、`:223-231`；`state.js:20` |
| 宿主事件只带 ISO 时间戳，毫秒精度，同毫秒多条无法区分 | `host.js:218`、`:230` |
| 合并层只取 `n/p50/p95`，宿主 errors 与事件在这里丢掉（D6） | `aggregate.js:281-310`（`:289-293`） |
| 累计快照相减只能得到精确 `n`，分位数仍是累计的 | `aggregate.js:312-333`（`:314-317`） |
| lab 在场景首尾各调一次 `?mode=window`，靠排空界定窗口 | `lab/scenarios.mjs:62-66`、`:114`、`:190`、`:198-204` |
| lab 判定直接读 v1 字段路径 | `lab/budgets.mjs:14-18`、`:119-252` |
| DNPR 在 [DNEE] 浏览器产物中精确占 15503 B | `lab/README.md:92`；`INTRODUCTION.md:716` |

#### 【可选选项清单】

| 选项 | 报告形状 | 页面动词 | 宿主窗口 | 判定位置 |
|---|---|---|---|---|
| **A** v1 换号 | 沿用 v1 布局，加 `contract` 子键 | `read()` + `cutWindow()` | 保留累计快照相减（`diffHostSnapshots`） | Node 侧 |
| **B** 按来源分区 + 序号游标（**推荐**） | 页级 / 手写 / 合同面 / 宿主 / 证据 / 结构六区，分位数带 `basis`+`n` | `read()` + `cutWindow()`，其余入口退役 | `{epoch, seq}` 游标，按样本序号切 | Node 侧 `diagnose()`，不进浏览器 |
| **C** 时间游标 | 同 B | 同 B | `since=<ISO 时间>` | 同 B |
| **D** 页面也改游标 | 同 B | 只有 `read({since})`，无切窗动词 | 同 B | 同 B |

#### 【推荐选项的详细执行说明与分析】（B）

1. **顶层分区。** 示意（字段集合冻结，常量名实现时定）：
   ```jsonc
   {
     "schema": "dnpr.report/2",
     "meta": {
       "generatedAt", "scenario", "arm", "dshVersion", "chromeMajor", "gitSha",
       "protocol": 2,                                       // 07.1
       "contributors": [{ "plugin", "build", "decl" }],     // 07.5 / 04.3
       "window": { "startedAt", "ms" },
       "host": { "source": "<bindingId>|null", "epoch", "from", "to", "truncated": [] }
     },
     "page":     { /* v1 page 字段沿用原名 + 样本数 */ },
     "plugins": {
       "<pluginId>": {
         "hand":     { "spans", "tracks", "usage", "own", "native", "profiler" },   // 04.1 声明作者的键
         "contract": { "<id>": { "surface", "n", "outcomes": {}, "status": { "2xx", "3xx", "4xx", "5xx" },
                                 "p50", "p95", "max", "basis" } },                  // 05 / 06
         "host":     { "<name>": { "n", "p50", "p95", "max", "errors", "basis" } }
       }
     },
     "evidence": { "slowInteractions": [], "heavyFrames": [], "hostErrors": [] },   // 02.2
     "structure": { /* v1 计数 + legacyCopies + badShape + missingBindingId + oversize */ },
     "notes": [{ "id": "note.span-after-window", "text": "…" }]
   }
   ```
   - 合同面行按 `06.3` 的结果闭集计数，并按状态类分维度（落实 `06.7`）。
   - 每个分位数行都带 `basis`（`window` = 窗口精确样本；`cumulative` = 累计 reservoir 近似）和 `n`。
   - `evidence` 各数组有固定上限（示意：交互 5、帧 5、宿主错误 20），超过 256 KB 时先裁证据，再计 `structure.oversize`。
2. **说明只在相关时出现。** 无条件的 5 条说明（`aggregate.js:239-243`）移入 DNPR 的说明词表（按 id 查文本），报告只输出本次数据触发的说明。
3. **判定不进报告。** `diagnose(report, { declarations, baseline })` 是 DNPR 的 Node 侧纯函数出口，返回 `{ verdict, findings: [{ id, gate: 'hard'|'audit'|'info', plugin, subject, value, limit, basis }] }`。lab 写盘时把报告与诊断结果并列。浏览器产物不包含 `diagnose`，也不包含预算表（`02.7`，与 Q9 第 4 条一致）。
4. **页面动词。**
   - `read(meta?, { host? })`：无副作用，任何读者可用；`host` 由 lab 传入游标切好的宿主视图，缺省用页面轮询到的视图。
   - `cutWindow()`：清空窗口累加器（含 usage 的窗口列），并把页面的宿主起点游标前移到最新值；只允许 lab 调用，插件源码出现即测试失败（`02.4`）。
   - 退役、不留别名：`report`、`reset`、`resetCounters`（usage 改为 `window` 与 `total` 两列，切窗只清窗口列）、`configure`、`setHostSnapshotProvider`（宿主源由 join 时登记，`03.3`）。
5. **宿主游标。**
   - 形状 `{ epoch, seq }`，序列化为 `"<epoch>.<seq>"`。`epoch` 是宿主单例创建时生成的随机标识；`seq` 是进程内单调递增的样本序号，手写 span 与合同面事件共用一个计数器。
   - 每个样本和事件带上 `seq`；保留上限沿用现值（窗口 512、reservoir 64、事件 32），本题不改容量。
   - 读：带 `since` 时返回 `seq > since` 的样本，`basis = window`；不带时返回累计视图，`basis = cumulative`。两种都返回 `next`。
   - 失效：`epoch` 不符（进程重启）时返回累计视图并标 `truncated: ['epoch']`；某个键的环形缓冲已经丢掉了 `since` 之后的样本时，该键标截断并给出丢失条数，`diagnose()` 产出 audit 级 finding。两种情况都返回 200，不当作错误。格式不合法的游标返回 400。
   - 宿主侧没有切窗动词（`03.4`），多读者各持游标，互不干扰。
6. **lab 流程。** 场景开始：页面 `cutWindow()`，记下宿主 `next`。场景结束：取宿主 `?since=<起点>` 视图，传给页面 `read()`。`diffHostSnapshots`、`mergeHostSnapshot` 退役，由 v2 组装逻辑取代。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

- v1 的可信度问题集中在「窗口与累计混在一起」：`diffHostSnapshots` 自己承认分位数是累计的（`aggregate.js:314-317`），lab 只好靠排空换取精确窗口（`lab/scenarios.mjs:114`）。B 用 `basis` 把两者显式分开，用游标取代排空。
- 宿主已经按样本保留窗口数组（`host.js:223-224`），给每个样本加序号只是补一个整数，不改变容量与算法（`B02`）。
- 说明里 5 条与数据无关（`aggregate.js:239-243`），每份报告都重复，agent 读到的有效信息被稀释，违反 `02.2`「notes 只在相关时出现」。
- 合并层丢掉 errors 与事件（`aggregate.js:289-293`，D6）。B 的 `host` 行带 `errors`，`evidence.hostErrors` 带事件，D6 在 v2 中根治。
- DNPR 在浏览器产物中已占 15503 B（`lab/README.md:92`）。`diagnose()` 与预算表留在 Node 侧，浏览器只付采集成本。

**A（v1 换号）的反例**

- 保留累计相减就保留了「宿主分位数不是窗口的」这个缺陷，`02.2`「分位数行标明 window/cumulative」只能永远标 cumulative。
- 手写 span 与合同面行混在同一插件行里，违反 `01.5`「分属不同命名空间」。

**C（时间游标）的反例**

- 宿主事件时间戳只到毫秒（`host.js:218`），同一毫秒的多条样本无法用时间切开。
- 墙钟会被 NTP 校正或手动调整，窗口边界会漂移；序号不受影响。

**D（页面也改游标）的反例**

- 直接推翻 `02.4` 已冻结的「读与切窗两个显式动词」。
- 页面侧的交互、LoAF、track 累加器不是样本日志（`state.js:67-93`），改成游标需要为每类数据保留带序号的日志，内存与复杂度明显上升，收益只有 lab 一个读者。

**B 的诚实风险**

- 全部 lab 读者（`budgets`、`candidates`、两个 `diagnose-*`）都要按新路径重写，与 `02.1` 同批完成。
- 宿主环形缓冲按键截断，长时间不读时游标必然失效；这是如实暴露，不是缺陷，但读者要学会看 `truncated`。
- 证据数组的上限是新的固定常量，需要在实现时用真实场景确认 256 KB 内有余量。

- **问题**：PRE-1116 中，v2 报告与读侧合同是否采用选项 B：报告按页级/手写/合同面/宿主/证据/结构分区，分位数行带 `basis` 与 `n`，合同面行按结果闭集与状态类计数；说明只在相关时出现并带 id；判定由 Node 侧 `diagnose()` 产出、不进浏览器产物；页面动词为 `read()` 与 `cutWindow()`，`report/reset/resetCounters/configure/setHostSnapshotProvider` 退役；宿主游标为 `{epoch, seq}`，按样本序号界定窗口，失效时标注截断、返回 200；`diffHostSnapshots`、`mergeHostSnapshot` 退役？还是选择 A / C / D？
- **业主回答**：✅ 同意推荐 B（[业主] 2026-11-16）→ 已冻结为 `T-O-PRE1116-08`

---

### Q9 — 性能声明的格式与投递：写成什么文件，有哪些字段，哪些内容进运行时？（**驱动真相：`T-O-PRE1116-04.1–04.8`、`05.7`、`07.4`、`07.5`、`B09`** · 来源：初评 FC-12、L-C07、L-E01、L-E03、P1-13）

- **影响范围**：每个有植入的插件新增声明文件与 lab 场景驱动；8 个插件 `scripts/build-client.mjs`；四份 `src/client/perf.js` 与 [DNK] `src/host/perf.js`；DNPR 新增声明校验纯函数与共享对账测试助手（`test-helpers/`）；`packages/dsh-performance-review/src/{client,state}.js`（`BUCKET_ATTRS`、`targetBucket`）；`lab/{budgets,scenarios,run}.mjs`；`spec-26nov.md` §6.7、§7。
- **为什么必须确认**：`04` 定了「每插件一份声明，四类内容的唯一作者，构建期烘焙，DNPR 与 lab 插件中立」，`04.8` 把文件名、字段、格式、是否进运行时留到本轮。格式决定 lab 能否不执行插件代码就读到依据，字段决定现有阈值能否原样迁移（`04.7`），运行时投递决定浏览器产物体积。
- **当前建议 / 倾向**（Droid）：**B — 每个插件一份 JSON 声明 `src/perf/declaration.json`（带 schema 版本），由 DNPR 纯函数校验；插件自有的场景步骤写在同目录的驱动模块里，由声明按路径引用；预算规则使用 DNPR 定义的闭集词汇；构建期只把键名常量、交互目标桶与声明哈希烘焙进运行时，预算与场景只在 lab 侧读取。**
- **Reasoning**：声明是数据，不是代码。JSON 让 lab 不必执行插件代码就能读到依据，也让「三方对账」可以用静态比较完成。场景步骤必须是代码（要操作页面），所以单独成模块，由声明引用。运行时只拿植入真正需要的东西（键名、桶），预算表不进浏览器。

#### 【对本问题的解读】

本题要定五件事：

1. **文件形态与位置**：JSON、JS 模块、`package.json` 字段，还是仓根集中表。
2. **字段集合**：键、桶、合同面引用、场景、预算。
3. **预算规则词汇**：能否原样表达现有全部阈值（`04.7`）。
4. **烘焙与投递**：哪些进浏览器/宿主产物，哪些只在 lab 侧。
5. **三方对账怎样实现**（`04.2`）。

本题**不**定迁移批次（Round 5），也不改任何阈值（`B09`、`04.7`）。

现状事实：

| 事实 | 证据 |
|---|---|
| lab 的插件级规则按**轨道名**写死，对所有插件循环套用：`card-follow`、`hold`、`git-poll`、`card-wake`、`sidebar-graft`、`sidebar-dedupe`、`ctia-watch` | `lab/budgets.mjs:204-252` |
| 通用的插件级红线（`native.spanMsP95`/`trackMsP95` ≤ 50 ms，≥ 8 样本）对每个插件一视同仁 | `lab/budgets.mjs:177-201` |
| 规则形态只有几种：绝对上限、等于、相对基线 × 倍数 + 下限、首次基线绝对值、最小样本数、hard/audit 两级 | `lab/budgets.mjs:182`、`:196`、`:209-210`、`:222-227`、`:234-239`、`:262`、`:272` |
| 场景步骤是写死在 lab 的页面操作代码，按插件分支 | `lab/scenarios.mjs:117-187` |
| lab 其他位置也写死 [DNEE] | `lab/run.mjs:55,68,93,259` |
| 交互目标桶写死在共享包，含已退役插件属性 | `client.js:83-91`；`state.js:225-239` |
| 植入键名散落在 spec 表格与调用处字符串中 | `spec-26nov.md:246-260`；四份 `src/client/perf.js` |
| 插件发布物只含 `lib/` 等运行时文件，`src/` 是作者树、不进 tarball | `dsh-nano-explorer-extra/package.json:18-26`；各包 AGENTS「`src/` 作者树」 |
| `dsh-interface/build` 已有把声明表确定性烘焙成产物常量的出口 | `packages/dsh-interface/src/build/index.js:27` |
| DNPR 已有插件中立的共享测试助手目录 | `packages/dsh-performance-review/test-helpers/index.mjs` |

#### 【可选选项清单】

| 选项 | 形态与位置 | 场景步骤 | 运行时投递 |
|---|---|---|---|
| **A** JS 模块声明 | `src/perf/declaration.mjs`，`definePerfDeclaration({...})` | 与声明写在同一模块 | 整个模块打进产物 |
| **B** JSON 声明 + 场景驱动模块（**推荐**） | `src/perf/declaration.json`（`schema: dnpr.declaration/1`） | `src/perf/scenarios/<id>.mjs`，声明按路径引用 | 只烘焙键名常量、目标桶、声明哈希 |
| **C** `package.json` 字段 | `dsh.perf` 或 `perfReview` 字段 | 无处安放 | 随 tarball 发布 |
| **D** 仓根集中表 | `perf/declarations.json`，全部插件一份 | lab 内 | 同 B |

#### 【推荐选项的详细执行说明与分析】（B）

1. **位置与形态。** 每个有植入的插件一份 `src/perf/declaration.json`，顶层带 `schema: "dnpr.declaration/1"` 与 `plugin`。DNPR 提供纯函数 `validateDeclaration()`（无 I/O），构建与 lab 都先校验再使用；校验失败让构建失败。
2. **字段集合**（本题冻结字段，具体键名实现时落地）：
   ```jsonc
   {
     "schema": "dnpr.declaration/1",
     "plugin": "nano-explorer-extra",
     "keys": {
       "spans":     ["apply-status", "git-refresh"],
       "tracks":    [{ "name": "git-poll", "kind": "interval" }],
       "usage":     ["files-expand"],
       "hostSpans": ["git-status", "list", "stats"]
     },
     "buckets":   [{ "attr": "data-nxe", "bucket": "files-row" }],
     "contract":  ["dnee.status", "dnee.list"],                  // 只引用 05 的 id
     "scenarios": [{ "id": "files-expand", "driver": "./scenarios/files-expand.mjs" }],
     "budgets": [
       { "id": "git-poll-live", "scenario": "idle-10s", "subject": "hand.tracks.git-poll.live",
         "rule": { "op": "min", "value": 1 }, "gate": "hard" }
     ]
   }
   ```
3. **预算规则闭集。** DNPR 定义规则词汇：`max`、`min`、`eq`、`relBaseline { factor, floor, initial }`，以及可选 `minSamples`；每条规则标 `gate: hard | audit`。这套词汇足以表达 `lab/budgets.mjs` 的全部现有规则；验收口径沿用 `04.7`（旧 `evaluate` 与新 `diagnose()` 对同一批基线结论一致）。通用页级规则与通用插件级红线（`native.*` ≤ 50 ms）属于插件中立规则，留在 `diagnose()` 内置（`04.4`）；按轨道名写死的规则全部迁入对应插件的声明。
4. **烘焙与投递。**
   - 进运行时：键名常量（植入代码只从常量取名，`04.2`）、交互目标桶（join 时登记给页面单例，取代 `BUCKET_ATTRS`，`01.8`）、声明哈希（esbuild define，进入 `contributors.decl`，`07.5`）。
   - 不进运行时：`budgets`、`scenarios`、`contract` 引用。它们只由 lab 与 `diagnose()` 在 Node 侧读取。
   - 体积变化用 `--measure-footprint` 量化并写入计划；现有 `nanoCombined.clientJsBytes ≤ baseline × 1.1` 硬门禁照常生效，不新增门禁（`B09`）。
5. **三方对账。** DNPR `test-helpers` 提供一个插件中立的对账助手，每个插件的测试调用一次：
   - 声明 ↔ 植入：植入代码引用的键名常量集合必须等于声明的键集合；
   - 声明 ↔ 门面：`contract` 中每个 id 必须存在于本插件烘焙的绑定表或 MCP schema（`05`）；
   - 任何一方多出或缺少都让测试失败。
6. **lab 改为声明驱动。** lab 枚举各插件声明生成场景列表；页级场景（`idle-10s`、`composer-type`、`observer-purity`）留在 lab，插件场景的步骤从声明引用的驱动模块载入。`lab/budgets.mjs`、`lab/scenarios.mjs`、`lab/run.mjs` 中的插件名与轨道名清零（`04.5`）。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

- 现有规则只有少数几种形态（`lab/budgets.mjs:182,196,209-210,222-227,234-239,262,272`），一个小的闭集词汇就能全部表达，`04.7`「原样迁移」可以逐条对照验收。
- 「插件中立」目前是假象：`lab/budgets.mjs:204-252` 对每个插件循环检查 `card-follow`、`git-poll` 等名字，实际上是把 [DNEE]、[DNN] 的轨道名写进了共享代码。迁入声明后，lab 才真正不认识任何插件。
- `src/` 不进发布物（`dsh-nano-explorer-extra/package.json:18-26`），声明放在 `src/perf/` 不会增加安装体积，运行时只拿烘焙出的常量。
- JSON 不可执行，lab 读声明不需要加载插件代码；对账可以用静态集合比较完成。
- 烘焙机制已存在（`dsh-interface/build/index.js:27`），不需要新的构建机制。

**A（JS 模块声明）的反例**

- 声明可以写逻辑，作者源就可能变成「代码里算出来的值」，对账只能运行时完成。
- lab 读依据必须 import 插件代码，插件代码的副作用会进入 lab 进程。
- 整个模块打进产物，预算表也跟着进浏览器。

**C（`package.json` 字段）的反例**

- `package.json` 是 dsh 的安装清单，`dsh.*` 命名空间归宿主解释（`dsh.client`、`dsh.bundle`）；在其中加私有字段属于侵占宿主合同面，违反「上层建筑归 host」与「平台中立」。
- 随 tarball 发布，预算表进入每一台安装机器。
- 场景步骤是代码，无处安放。

**D（仓根集中表）的反例**

- 违反 `04.1`「每个插件一份」。
- 各包 AGENTS 要求「只处理这一个包」，集中表让单包的性能依据依赖仓根文件，单包自洽被打破。

**B 的诚实风险**

- 场景驱动模块从 lab 内联代码（`lab/scenarios.mjs:117-187`）拆出，需要一个最小的驱动接口（接收页面句柄与 lab 助手）；接口形状在实现时定。
- 规则闭集是 DNPR 内部词汇，以后出现新的规则形态需要扩展 DNPR，而不是在 lab 里临时写。
- 运行时多出键名常量与桶表，体积很小，但要计入产物体积测量。

- **问题**：PRE-1116 中，性能声明是否采用选项 B：每个插件一份 `src/perf/declaration.json`（`schema: dnpr.declaration/1`），字段为键、桶、合同面引用、场景、预算，由 DNPR 纯函数校验；插件场景步骤写在声明引用的驱动模块中；预算使用 DNPR 闭集规则词汇（`max/min/eq/relBaseline` + `minSamples` + `gate`），通用规则留在 `diagnose()` 内置，轨道名规则迁入声明；运行时只烘焙键名常量、目标桶与声明哈希，预算与场景只在 Node 侧读取；对账由 DNPR 共享测试助手完成；lab 中插件名与轨道名清零？还是选择 A / C / D？
- **业主回答**：✅ 同意推荐 B（[业主] 2026-11-16）→ 已冻结为 `T-O-PRE1116-09`

---

### Q10 — 宿主读取路由的落地与残余退役：路径、参数、轮询、写盘器、[DNK] 怎么处理？（**驱动真相：`T-O-PRE1116-03.1`、`03.2`、`03.5`、`03.7`、`05.2`、`07.3`、`B05`、`B07`、`B11`** · 来源：初评 L-B03、L-E04、G-C06；中场评估 III 反方制衡）

- **影响范围**：DNPR 宿主出口（只读 handler 与注册声明片段）；`security/route-sensitivity.json` 中各插件的读取行；[DNEE] `src/host/routes.js` 与 `src/client/perf.js`；DNPR `host.js` 写盘器；DNPR `client.js` 宿主轮询；[DNK] `index.js`、`src/host/perf.js`、`src/client/index.js`；[DNLS] `src/host/routes.js` 两条 perf 路由（`03.5` 已定退役）；DNPR README 与 `INTRODUCTION.md` 相关段落。
- **为什么必须确认**：`03` 定了「一份只读 handler，多入口挂载，游标取代排空」，`03.7` 把路径名、页面轮询频率、`host.json`/`host-snapshots.jsonl` 写盘器的去留留到本轮，`03.2` 把 [DNK] 是否挂首条宿主路由留到本轮。调查还发现 [DNK] 把整进程快照推进容器内的 MCP bridge，这是 `03.5` 退役清单之外的第二个读取面，需要裁决。
- **当前建议 / 倾向**（Droid）：**B — 路径统一为 `/<插件前缀>/perf-review/host`，id 为 `<缩写>.perf-review.host`，只接受 GET 与 `since` 参数，`mode` 等其他参数返回 400；页面每 5 秒轮询一个健康入口，仅在采集开启且页面可见时轮询；`host.json`/`host-snapshots.jsonl` 写盘器整体退役；[DNK] 不挂宿主路由，其诊断包中的 `perf` 字段与死代码同批退役。**
- **Reasoning**：沿用 [DNEE] 已经在用的路径，入口数量增加但名字不变，读者只需要换前缀。写盘器在仓内没有读者，却每 30 秒重写一个最大 8 MB 的文件。[DNK] 的包合同明确「不注册页面路由」，它的宿主数据通过其他插件的入口可见；而它推给容器的整进程快照，既是第二个读取面，又把其他插件的计时送出了宿主进程。

#### 【对本问题的解读】

本题要定五件事：

1. **路径、id 与参数**。
2. **页面轮询的频率与条件**。
3. **写盘器的去留**。
4. **[DNK] 是否挂首条宿主路由**。
5. **[DNK] 诊断包中整进程快照的去留**，以及相关死代码。

本题**不**改敏感度分级（`03.6` 已定），也不定迁移批次。

现状事实：

| 事实 | 证据 |
|---|---|
| 现有唯一的标准读取路由是 [DNEE] `GET /nano-explorer-extra/perf-review/host`，`mode=window` 排空 | `dsh-nano-explorer-extra/src/host/routes.js:573-585`；`security/route-sensitivity.json:282-293` |
| 账本 justification 仍写「mode=window drains samples」 | `security/route-sensitivity.json:292` |
| [DNLS] 两条 perf 路由允许 GET/HEAD/POST 且绑定 session，存的是 [DNK] 推来的报告 | `security/route-sensitivity.json:561-586`；`dsh-nano-local-sandbox/src/host/routes.js:1137-1146` |
| 页面轮询固定每 5 秒一次，只看是否开启，不看页面是否可见，先到先得 | `client.js:567-590`（`:573`、`:588`） |
| 写盘器在开启后每 30 秒写一次 `host.json`，并读入、截断、重写整个 `host-snapshots.jsonl`（上限 8 MB） | `host.js:19`、`:25`、`:131-176`（`:152-162`） |
| 写盘产物在仓内没有任何读者：lab 已改走路由 | 全仓 grep：仅 `host.test.mjs:70-79` 与文档；`INTRODUCTION.md:716`「宿主数据靠 `GET …?mode=window`」 |
| [DNK] 路由表为空，`registerRoutes` 传空数组；包合同写明「只登记技能，不注册页面路由」 | `dsh-nano-kitesurf/lib/route-table.js:4`；`dsh-nano-kitesurf/index.js:676-677`；`dsh-nano-kitesurf/AGENTS.md` 交付物表 |
| [DNK] 诊断包含 `perf: perfSnapshot()`，即整进程宿主快照（所有插件），每 30 秒及每次请求后推到容器内 MCP bridge | `dsh-nano-kitesurf/index.js:628`、`:635-653`；`src/host/perf.js:31-33` |
| [DNK] `traced` 中引用未定义的 `PERF_ROUTE`，因路由表为空从未执行 | `dsh-nano-kitesurf/index.js:325-328`（全包 grep 无定义） |
| [DNK] 页面植入把宿主源指向 [DNLS] 并每 10 秒推送（`03.5` 已定退役） | `dsh-nano-kitesurf/src/client/index.js:36`、`:54-62` |

#### 【可选选项清单】

| 选项 | 路径与参数 | 轮询 | 写盘器 | [DNK] |
|---|---|---|---|---|
| **A** 最小改动 | 沿用路径，保留 `mode` 参数（忽略） | 每 5 秒，不看可见性 | 保留 | 不挂路由；诊断包 `perf` 保留 |
| **B** 统一路径 + 严格参数 + 退役写盘器（**推荐**） | `/<前缀>/perf-review/host`，只认 `since`，其他参数 400 | 每 5 秒，仅开启且可见时；单健康入口 | 退役 | 不挂路由；`perf` 字段与死代码退役 |
| **C** 新路径 + 保留时间序列 | 改名如 `/<前缀>/perf/host-view` | 同 B | 保留 jsonl 作历史 | 同 B |
| **D** [DNK] 挂首条路由 | 同 B | 同 B | 退役 | [DNK] 新增 `/nano-kitesurf/perf-review/host` |

#### 【推荐选项的详细执行说明与分析】（B）

1. **路径与 id。** 每个有页面植入、且已有宿主路由的插件挂载 `GET /<插件前缀>/perf-review/host`，账本 id 为 `<缩写>.perf-review.host`（`05.2`），capability `read:host`、不绑定 session（`03.2`）。handler 与注册片段由 DNPR 宿主出口提供（`03.1`），经 guard/registrar 注册，自动产生 `06` 观测事件。
2. **参数严格。** 只接受 `since`（Q8 定义的游标）。`mode` 及任何其他参数返回 400，让未重建的旧读者明确失败，而不是静默拿到累计视图。只接受 GET。
3. **页面轮询。** 仍为每 5 秒一次；只在采集开启且 `document.visibilityState !== 'hidden'` 时轮询；同一时刻只轮询一个健康入口（`03.3`），连续失败后切到下一个入口；轮询带 `since`，起点随 `cutWindow()` 前移。lab 不依赖轮询，直接用游标取精确窗口。
4. **写盘器退役。** `host.json` 与 `host-snapshots.jsonl` 的写盘逻辑、30 秒定时器、`beforeExit` 钩子、`flush()`、`structure.hostWriteErrors` 及其测试一并删除；DNPR README 与 `INTRODUCTION.md` 同步更新。DNPR 不是 durable 审计权威（`B05`），宿主数据只经读取路由提供。
5. **[DNK] 不挂宿主路由。** [DNK] 保持「只登记技能，不注册页面路由」的包合同。它的页面植入照常 join，不登记宿主入口；它的宿主 span 通过任何其他插件的入口可见（整进程视图）。页面上没有任何宿主入口时，报告的 `meta.host.source` 为 `null`，并输出说明 `note.host-source-absent`。
6. **[DNK] 诊断包 `perf` 字段退役。** `buildDiagnostics()` 中的 `perf: perfSnapshot()` 删除；`src/host/perf.js` 的 `perfSnapshot` 导出删除；`traced` 中未定义的 `PERF_ROUTE` 分支一并删除。[DNK] 的 console、operations、selftest 等诊断内容不受影响。
7. **账本与说明同步。** [DNEE] 行 justification 由「mode=window drains」改为「只读全进程视图」（`03.6`）；[DNLS] 两行随 `03.5` 删除；新增入口各登记一行。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

- 路径沿用 [DNEE] 现名（`routes.js:577`、账本 `:284`），lab 与文档的改动只是换前缀和换参数，不引入新名字。
- 写盘器没有读者（全仓 grep 仅测试与文档），lab 已改走路由（`INTRODUCTION.md:716`）；而它每 30 秒读入并重写最大 8 MB 的 jsonl（`host.js:152-162`），是纯成本。按「能彻底退役就不兼容」应整体删除。
- 宿主出口纪律要求「不得写文件」（`packages/dsh-interface/AGENTS.md` host 出口）；DNPR 不受该出口约束，但写盘器与 `B05`「不是 durable 审计权威」的定位相悖。
- 页面隐藏时轮询没有读者价值；当前轮询不看可见性（`client.js:588`）。
- [DNK] 路由表为空、包合同明示不注册页面路由（`lib/route-table.js:4`、`index.js:676-677`、AGENTS 交付物表），为了观测去开第一条路由，等于为观测改变插件的合同边界。
- [DNK] 推送的 `perfSnapshot()` 是整进程快照（`src/host/perf.js:31-33`），含其他插件的 span，每 30 秒送进容器内的 MCP bridge（`index.js:635-653`）。这既是 `03.1`「宿主读取实现只有一份」之外的第二个读取面，也让其他插件的计时离开宿主进程，与 `B07` 的本机边界和「不得侧载」相冲突。

**A（最小改动）的反例**

- 静默忽略 `mode` 会让旧 lab 读者拿到累计视图却以为是窗口，结论悄悄失真。
- 保留无读者的写盘器，违反「能彻底退役就不兼容」。
- 保留 [DNK] 的 `perf` 推送，`03.1` 的单一读取面不成立。

**C（新路径 + 保留时间序列）的反例**

- 改名没有收益，只增加文档与 lab 的改动量。
- 保留 jsonl 作「历史」，等于让 DNPR 承担 durable 时间序列职责，违反 `B05`。

**D（[DNK] 挂首条路由）的反例**

- 改变 [DNK] 包合同（AGENTS「只登记技能，不注册页面路由」），为观测扩大插件的路由面与安全审查面。
- [DNK] 页面植入的宿主数据已经可以从其他入口取得；只有在页面上**只装 [DNK]** 时才没有入口，此时报告如实给出 `source: null`，不需要为这个边缘情况新增路由。

**B 的诚实风险**

- 只装 [DNK] 的页面没有宿主视图；这是有意的取舍，报告会明确说明。
- 删除写盘器后，宿主进程退出即丢失数据；对本阶段的读者（lab、agent）没有影响，因为它们都在进程存活时读取。
- 400 拒绝旧参数会让未重建的旧拷贝轮询失败；它们属于 `07.2` 的 legacy 拷贝，失败只影响其自身的旧报告。

- **问题**：PRE-1116 中，宿主读取路由的落地是否采用选项 B：路径统一为 `/<插件前缀>/perf-review/host`、id `<缩写>.perf-review.host`，只接受 GET 与 `since`，其他参数 400；页面每 5 秒、仅在采集开启且页面可见时轮询一个健康入口；`host.json`/`host-snapshots.jsonl` 写盘器整体退役；[DNK] 不挂宿主路由，诊断包 `perf` 字段、`perfSnapshot` 导出与未定义的 `PERF_ROUTE` 分支同批退役；账本 justification 同步更新？还是选择 A / C / D？
- **业主回答**：✅ 同意推荐 B（[业主] 2026-11-16）→ 已冻结为 `T-O-PRE1116-10`

---

## 9. ★ 中场评估 IV（Round 4 → Round 5）

### 9.1 对 Round 4 的判定

- [业主] 于 2026-11-16 对 Q8、Q9、Q10 均裁定**同意推荐 B**，没有附加条件；三题都已决断，没有残留。
- Round 4 定下了读取侧的三份合同：
  - **报告与读法**（`08`）：v2 按来源分区，每个分位数都说明自己是窗口值还是累计值；页面只有读和切窗两个动作；宿主用样本序号界定窗口，多个读者互不干扰。
  - **判定依据**（`09`）：每个插件一份 JSON 声明，预算规则只用一套固定词汇；运行时只带键名、目标桶和声明哈希。
  - **读取路由**（`10`）：所有入口同名同参，写盘器与 [DNK] 的第二读取面退役。
- 至此方向层（`01–04`）、写入侧合同（`05–07`）、读取侧合同（`08–10`）全部冻结。剩下的只有交付层：按什么批次落地、每一个现存手写观测点怎么处置、本阶段覆盖到哪些插件。

### 9.2 本轮已锁定真相

- `T-O-PRE1116-08`（细则 `08.1–08.9`）、`T-O-PRE1116-09`（细则 `09.1–09.8`）、`T-O-PRE1116-10`（细则 `10.1–10.7`）已写入 §1.2。

### 9.3 诚实反方制衡（本轮新调查的发现）

| 风险 / 发现 | 来自 | 现状证据 | 处置 |
|---|---|---|---|
| **D2 仍然开放**：[DNK] 通过插件配置打开全进程宿主采集，并改写进程环境变量 | `B10` D2 | `dsh-nano-kitesurf/index.js:132,141,416-421`；`src/host/perf.js:26-29`；DNPR `host.js:197-201`（`setEnabled` 唯一调用方是 [DNK]） | 进入 Q12 |
| 手写宿主 span 中有 5 个与合同面整面重合，4 个是子阶段或后台工作 | `01.7` | 见 Q12 现状表 | 进入 Q12 |
| [DNN] 用动态拼接的 span 名 `fx-stage-${step}`，与 `04.2`「只从烘焙常量取名」冲突 | `04.2`、`09.7` | `dsh-nano-notepad/src/client/fx-pipeline.js:128-132`；`panel.js:4611-4617` | 进入 Q12 |
| 宿主 `traceId` 关联的唯一生产者已是死路径 | `B08` | `dsh-nano-kitesurf/index.js:27`、`:304-323`、`:676-677`；DNPR `host.js:252-259` | 进入 Q12 |
| [DNT]、[DNLS] 没有 DNPR 依赖；不接入的话，`06.3` 中 `upgrade` 与 `mcp` 两组结果闭集没有任何生产者 | `06.3`、`01.1` | 依赖 DNPR 的只有 5 个包（[DNK]/[DNMS]/[DNCS]/[DNN]/[DNEE] `package.json`）；`upgrade`/`mcp` 面只在 [DNT]（`src/host/web-routes.js:198`、`src/host/mcp.js:190`） | 进入 Q13 |
| 页面入口数量比中场评估 II 估计的少：同时具备页面植入与宿主路由的插件只有 3 个 | `03.2`、`10.5` | 页面 join 只在 [DNEE]/[DNMS]/[DNN]/[DNK]（`src/client/perf.js`、`dsh-nano-kitesurf/src/client/index.js:35`）；[DNK] 无路由（`10.5`） | 进入 Q13 |
| **工作区存在 [业主] 未提交的改动**，覆盖路由账本、[DNMS] 路由表与 guard、`scripts/route-scan.mjs` | `05.3` | `git status`：`security/route-sensitivity.json`、`scripts/route-scan.mjs`、`dsh-nano-model-selector/{index.js,lib/route-guard.js,lib/route-table.js,src/host/route-table.js}` 等 22 个文件 | 进入 Q11（批次前置条件） |

### 9.4 初评缺陷 D1–D9 的收口对照

| 缺陷 | 收口真相 | 状态 |
|---|---|---|
| D1 [DNK] 每 10 秒破坏性 `report()` | `03.5`、`08.6` | 已冻结 |
| D2 [DNK] 打开全进程宿主采集 | `12.6` | 已冻结 |
| D3 `configure()` 先到先得 | `03.3`、`08.6` | 已冻结 |
| D4 contributors 无界 | `07.5` | 已冻结 |
| D5 宿主错误只认 throw | `06.3`、`08.2`、`12.3` | 已冻结 |
| D6 宿主 errors/events 止于合并层 | `08.2`、`08.9` | 已冻结 |
| D7 `LIB_VERSION` 恒定 | `07.4` | 已冻结 |
| D8 宿主单例升级丢状态 | `07.3` | 已冻结 |
| D9 lab 残留退役场景 | `04.5`、`09.8` | 已冻结 |

> **冻结补记**：D2、D5 两行在 Round 5 冻结时改为「已冻结」。提问时的原文依据仍在 §9.3。

### 9.5 为什么提出 Round 5（最后一轮 · 注入哪些题 + 由哪条 T-O 驱动）

1. **Q11 交付批次、worktree 与验收**（驱动：`02.1`、`04.7`、`05.3`、`05.9`、`06.5`、`07.4`、`08.9`、`09.6`、`09.7`，以及仓根「worktree」「不得过度仪式」）。合同全部冻结后，唯一还没定的是「哪些改动必须同批、按什么顺序合并、怎样证明迁移没有改变结论」。
2. **Q12 现存手写观测与开关的逐项处置**（驱动：`01.7`、`04.2`、`06.3`、`08.2`、`09.7`、`B08`、`B10` 的 D2/D5）。`01.7` 只给了候选，没有逐点结论；调查又发现 D2、动态 span 名、死掉的 `traceId` 生产者三处需要裁决。
3. **Q13 采纳范围与非目标登记**（驱动：`01.1`、`03.2`、`04.1`、`06.3`、`10.5`、`B05`、`B07`、`B08`、`B09`）。要定哪些插件接入门面观测、哪些插件挂读取入口、哪些事项明确不做，以及文档的唯一落点。

### 9.6 收口承诺

Round 5 是最后一轮。Q11–Q13 覆盖了 §7.5 登记的全部残余事项，以及 §9.3 新发现的全部问题。三题冻结后：

- §1 台账中 `T-O-PRE1116-01` 至 `13` 全部冻结；
- 初评 D1–D9 全部有收口真相（§9.4 中的 D2、D5 由 Q12 补齐）；
- 没有 OPEN 残题，明确不做的事项由 Q13 显式登记。

随后进入 §12 收口，撰写 **PRE-1116 计划**。

> **兑现注记（2026-11-16）**：[业主] 已同意 Q11–Q13 推荐 B。上列三条承诺的兑现记录在 §11，收口在 §12。

---

## 10. Round 5 —— 交付层：批次、逐项处置、范围（`Q11–Q13` · executional · 最后一轮）· 已冻结

> 本轮 second-opinion 模式：`retired`。每题标明驱动真相（锁死③）。

---

### Q11 — 交付批次、worktree 与验收：哪些改动必须同批，按什么顺序合并，怎样证明结论不变？（**驱动真相：`T-O-PRE1116-02.1`、`04.7`、`05.3`、`05.9`、`06.5`、`07.4`、`08.9`、`09.6`、`09.7`；仓根「worktree」「不得过度仪式」** · 来源：中场评估 III/IV）

- **影响范围**：`.agents/worktrees/` 下的分支规划；`scripts/test-all.mjs` 与仓库门禁脚本；`lab/` 基线；`RELEASE.md` 的本机部署流程（只使用，不修改）。
- **为什么必须确认**：冻结的真相里同时存在「必须同批」（`02.1` v2 与全部读者同批、`07.4` 8 个插件同批注入构建戳）和「必须先有」（`05` 的 id 是 `06` 事件、`08` 合同面行、`09` 声明引用的前提）两类约束。批次切错，要么出现双写过渡期，要么出现引用不存在的 id。另外，工作区里有 [业主] 未提交的改动，覆盖 `05` 要改的文件。
- **当前建议 / 倾向**（Droid）：**B — 三个按序合并的 worktree：W1 门面观测口（`06`），W2 合同面身份（`05`），W3 v2 硬切（`07`–`10` 与 Q12、Q13 的全部落点）。W2 以 [业主] 未提交改动先落地为前置条件；W3 内部按固定顺序提交、整体一次合并；`04.7` 用一次性的对照运行证明，结果写入计划的收尾记录后删除旧 `evaluate`。**
- **Reasoning**：W1 和 W2 都是「加一个可选能力或字段，未使用时行为不变」，可以独立验证、独立合并，风险低。W3 是真正的硬切，所有新旧不能共存的东西都在这里一次切完，不留过渡态。按序合并保证每个批次引用的东西在它之前都已经存在。

#### 【对本问题的解读】

本题要定四件事：

1. **批次边界**：分几个 worktree，每个包含什么。
2. **顺序与前置条件**：谁先谁后，开工前需要什么已经落地。
3. **每批的验收**：用哪些现有检查，不新增门禁。
4. **`04.7` 的对照方法**：在「不写转换器、不留 v1 分支」（`02.1`）的前提下，怎样证明新旧判定结论一致。

本题**不**改任何合同，也**不**定版本号与发布节奏（属 `RELEASE.md` 的现行流程）。

现状事实：

| 事实 | 证据 |
|---|---|
| worktree 只能建在 `.agents/worktrees/`，用语义分支名，合并后按 [业主] 要求删除 | 仓根 `AGENTS.md`「worktree」 |
| 当前已有 2 个 worktree（`dnt-herdr-borrow`、`notepad-tab-actions`），与本阶段无关 | `git worktree list` |
| 先例：功能分支完成后以一个合并提交并入 main | `git log`：`25def01 Merge dnls-dom-health-multiinstance` |
| 门面的观测口是可选参数，未注入时行为不变（`06.5` 要求先补测试） | `T-O-PRE1116-06.5` |
| 账本 id 是人工审定字段，命名质量需 [业主] 抽查 | `T-O-PRE1116-05.2`；`scripts/gen-route-sensitivity.mjs:7` |
| v2 报告与全部读者必须同批；8 个插件必须同批注入构建戳 | `T-O-PRE1116-02.1`、`07.4` |
| 工作区有 [业主] 未提交改动 22 个文件，含 `security/route-sensitivity.json`、`scripts/route-scan.mjs`、[DNMS] `index.js`、`lib/route-guard.js`、`lib/route-table.js`、`src/host/route-table.js` | `git status --short` |
| 全仓聚合检查已存在：各包 `npm test`、[DNT] smoke、`scripts/check-*.mjs` 门禁，`--build` 可选重建 | `scripts/test-all.mjs:1-60` |
| lab 已有 `--repeats N --write-baseline`、`--measure-footprint`、`--arm purity`、`--inject-delay`/`--inject-failure` | `lab/README.md:35-44,92`；`spec-26nov.md:268-271,289` |

#### 【可选选项清单】

| 选项 | 批次 | 过渡期 | `04.7` 对照 |
|---|---|---|---|
| **A** 一个大批次 | 全部改动一个 worktree | 无 | 同 B |
| **B** 三个按序 worktree（**推荐**） | W1 `06` → W2 `05` → W3 `07`–`10` + Q12/Q13 | 无（W1/W2 未使用时行为不变） | 一次性对照运行，结果入计划收尾记录，随后删除旧 `evaluate` |
| **C** 按插件逐个迁移 | 每个插件一个 worktree，DNPR 同时支持 v1/v2 | 有，v1/v2 双写 | 每插件各自对照 |
| **D** 先声明后硬切 | W3 再拆成「声明 + 常量」与「v2 运行时」两批 | 有，lab 需同时理解 v1 报告与声明 | 两次 |

#### 【推荐选项的详细执行说明与分析】（B）

1. **W1 `pre1116-facade-observe`（`06`）。**
   - 内容：`dsh-interface/contracts` 新增观测事件与结果闭集定义；四个门面加 `observe`；`onCall` 退役；先补「未注入时响应逐字一致」测试再改代码；重建消费方产物（[DNT] `lib/mcp.js` 里有 `onCall` 的副本）。
   - 不注入任何观测，所以对运行中的插件零行为变化。
   - 验收：`dsh-interface` 与 `dsh-host-route-guard` 单测；`node scripts/test-all.mjs --build`。
2. **W2 `pre1116-binding-ids`（`05`）。**
   - **前置条件**：[业主] 工作区中涉及账本、`route-scan.mjs`、[DNMS] 路由表与 guard 的未提交改动先由 [业主] 提交落地。本批不触碰、不合并、不重做这些改动。
   - 内容：账本补 `id/channel/match`；先产出一张命名表交 [业主] 抽查，抽查通过后再烘焙；8 个插件改用 `bindingTableModule`；`routeTableModule` 与各 `lib/route-table.js` 退役；guard 记录带 `id`；`route-inventory.md` 与各包 AGENTS 路由说明同步（`05.9`）。
   - 验收：`gen-route-sensitivity` / `check-route-sensitivity` / `route-scan` / `check-clean-lib`；每个插件的路由条数、方法、敏感度与改动前逐条相同；`test-all --build`。
3. **W3 `pre1116-dnpr-v2`（硬切）。** 内部按以下顺序提交，整体一次合并：
   1. DNPR 核心：协议键与构建戳（`07`）、v2 报告与游标（`08`）、`diagnose()` 与规则词汇（`08.5`、`09.3`）、声明校验与对账助手（`09.1`、`09.7`）、宿主读取 handler（`10.1`）、写盘器退役（`10.4`）。
   2. 各插件：声明文件、键名常量、门面注入观测适配器、页面 join 改 v2、四份 `perf.js` 样板退役、Q12 的逐项处置、Q13 的接入范围。
   3. 退役项：[DNEE] `mode=window`、[DNLS] 两条 perf 路由、[DNK] `configure`/推送/诊断 `perf` 字段（`03.5`、`10.6`）。
   4. lab：改为声明驱动，读者全部按 v2 重写（`02.1`、`09.8`）。
   5. 对照运行（见第 4 条），通过后删除旧 `evaluate`。
   6. 基线按三次稳定性运行重录；`--measure-footprint` 量化体积（`09.6`）。
   7. 文档：spec rev5、DNPR README、`INTRODUCTION.md`、`lab/README.md`、各包 AGENTS（落点见 Q13）。
   - 验收：`test-all --build`；DNPR 单测；`lab --arm purity`；全部场景 `--repeats 3` 连续三次退出码 0；`--inject-delay`/`--inject-failure` 仍能触发退出码 1 并点名；本机按 `RELEASE.md` 部署后在真实页面读取一次 v2 报告与宿主视图。
4. **`04.7` 对照方法。** 在 W3 中、删除旧 `evaluate` 之前做一次：
   - 同一台机器、同一组场景，先用 v1 产物跑 `--repeats 3`，记录每条旧规则的通过/失败；
   - 再用 v2 产物跑同样的场景，记录每条新规则（声明预算 id 与 `diagnose()` 内置规则）的通过/失败；
   - 按「旧规则 → 新规则 id」的映射表逐条比较，结论必须一致；不一致即阻塞合并。
   - 结果表写入 PRE-1116 计划的收尾记录，然后删除旧 `evaluate`。全程没有转换器，也不在产品代码里保留 v1 分支。
5. **合并与清理。** 每个 worktree 合并回 main 后，按 [业主] 要求删除。不新增 release-gate，不改变 `RELEASE.md` 流程。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

- W1 是可选参数加纯定义，`06.5` 已要求「未注入时逐字一致」，可独立证明零行为变化。
- W2 只改作者源与烘焙方式，路由条数、方法、敏感度都不变，有现成门禁脚本逐条核对。
- W3 把所有「新旧不能共存」的改动放在一起，满足 `02.1` 与 `07.4` 的同批要求，没有双写期。
- 顺序满足引用关系：W3 的合同面行、声明 `contract` 引用、读取路由 id 都依赖 W1 的事件与 W2 的 id。
- 前置条件保护 [业主] 的工作：W2 要改的文件正是工作区里未提交的文件；先落地再开工，避免覆盖或合并冲突。
- 已有合并先例（`25def01`）与聚合检查（`scripts/test-all.mjs`），不需要新的流程。

**A（一个大批次）的反例**

- 门面合同扩展、账本字段和 DNPR 硬切混在一个 diff 里，审查面过大，出问题时无法定位是哪一层。
- W1/W2 本可以先合并、先暴露问题，一个大批次让它们都等到最后。

**C（按插件逐个迁移）的反例**

- DNPR 需要同时支持 v1 与 v2，直接违反 `02.1`「不留 v1 读取分支」与「能硬切就不双写」。
- `07.4` 要求 8 个插件同批注入构建戳，逐个迁移做不到。

**D（先声明后硬切）的反例**

- 中间状态下 lab 要同时理解 v1 报告与声明，等于为过渡期写一份临时代码，违反「拒绝 hotfix」。
- 声明里的合同面引用在 v1 报告中没有对应行，三方对账无法在中间状态完成。

**B 的诚实风险**

- W3 体量大；内部提交顺序只能降低审查难度，不能降低体量。
- W2 依赖 [业主] 先提交工作区改动，时间上受此约束。
- 对照运行依赖真实浏览器与已登录实例，结果受环境影响；所以比较的是规则级的通过/失败，不比较数值。

- **问题**：PRE-1116 中，交付是否采用选项 B：三个按序合并的 worktree，W1 `pre1116-facade-observe`（`06`）、W2 `pre1116-binding-ids`（`05`，以 [业主] 未提交改动先落地为前置、命名表先经 [业主] 抽查）、W3 `pre1116-dnpr-v2`（`07`–`10` 与 Q12/Q13 全部落点，内部按固定顺序提交、整体一次合并）；每批只用现有检查验收；`04.7` 用一次性的规则级对照运行证明结论一致，结果写入计划收尾记录后删除旧 `evaluate`；合并后删除 worktree？还是选择 A / C / D？
- **业主回答**：✅ 同意推荐 **B**（[业主] 2026-11-16）→ 🔒 `T-O-PRE1116-11`

---

### Q12 — 现存手写观测与开关逐项怎么处置：哪些 span 硬切，动态名与 `traceId` 怎么办，谁有权打开采集？（**驱动真相：`T-O-PRE1116-01.7`、`04.2`、`06.3`、`08.2`、`09.7`、`B08`、`B10`（D2、D5）** · 来源：初评 FC-5、FC-7；中场评估 IV §9.3）

- **影响范围**：[DNMS] `index.js`；[DNN] `index.js`、`src/client/fx-pipeline.js`、`src/client/panel.js`；[DNEE] `src/host/routes.js`；[DNCS] `index.js`；[DNK] `index.js`、`src/host/perf.js`、AGENTS「配置与状态」；DNPR `src/host.js`（`hostSpan` 的 `ctx` 参数、`traceId` 字段、`setEnabled`）。
- **为什么必须确认**：`01.7` 规定「与合同面整面重合的手写 `hostSpan` 硬切退役、不双写，逐个判定在 executional 轮」，至今没有逐点结论。调查还发现三处需要裁决：D2（[DNK] 打开全进程采集）、[DNN] 的动态 span 名、DNPR 的 `traceId` 关联只剩一个死掉的生产者。
- **当前建议 / 倾向**（Droid）：**B — 用一条判定规则处置全部 9 个手写宿主 span：覆盖单一模式路由 handler 主体的 5 个硬切退役，子阶段与后台工作的 4 个保留；[DNN] 动态名改为声明内的封闭名单与常量映射；`hostSpan` 的 `ctx`/`traceId` 与 [DNK] 路由计数器退役；采集开关只认运维开关，[DNK] 的 `perfReview` 配置、环境变量改写与 DNPR `setEnabled` 退役。**
- **Reasoning**：一条可复核的规则比逐个拍板更稳：将来新增的 span 也按它判断。整面重合的 span 和合同面行测的是同一件事，留着就是双写；而且合同面行带 `status`，正好修掉 D5（handler 自己 catch 后 span 永远记成功）。采集开关属于运维者，不属于任何一个插件；一个插件替整个进程打开采集，正是 D2 的问题所在。

#### 【对本问题的解读】

本题要定五件事：

1. **判定规则**：什么样的手写宿主 span 算「与合同面整面重合」。
2. **9 个手写宿主 span 的逐点结论**。
3. **页面侧动态 span 名**（[DNN] `fx-stage-${step}`）怎样满足 `04.2`。
4. **`traceId` 关联与 [DNK] 路由计数器**的去留。
5. **采集开关的唯一权威**（D2）。

页面侧的 UI 内部 span、track、count 按 `01.7` 保留，本题只处理其中的动态名。

现状事实（手写宿主 span 全集）：

| 插件 | span | 位置 | 包住了什么 | 所在路由的工作模式 |
|---|---|---|---|---|
| [DNMS] | `catalog` | `dsh-nano-model-selector/index.js:176-189`（工作区版本） | 整个 handler，含自身 catch→500 | 单一模式 |
| [DNN] | `read` | `dsh-nano-notepad/index.js:290` | 读取主体（只差正文解析） | 单一模式 |
| [DNN] | `save` | `dsh-nano-notepad/index.js:306` | 另存为主体（只差正文解析） | 单一模式 |
| [DNEE] | `list` | `dsh-nano-explorer-extra/src/host/routes.js:566` | 列目录主体（只差会话解析） | 单一模式 |
| [DNCS] | `sessions` | `dsh-nano-cloud-session/index.js:402` | 上游 list/insights 调用，即整条路由的工作 | 单一模式（两种 op 同名同记） |
| [DNEE] | `git-status` | `routes.js:360` | `/status` 的 git 分支 | 两种模式：`only=stats` 直接回缓存（`:348-353`） |
| [DNEE] | `stats` | `routes.js:303` | 后台统计遍历 | 不是路由 |
| [DNCS] | `self` | `index.js:143` | `/config` 中 `action=test` 的上游调用 | 多 action 路由中的一个 |
| [DNK] | `kite-warmup` | `dsh-nano-kitesurf/index.js:436` | 引擎生命周期预热 | 不是路由 |

其他事实：

| 事实 | 证据 |
|---|---|
| [DNMS] handler 自己 catch 后写 500，span 永远记成功（D5 的实例） | `dsh-nano-model-selector/index.js:180-188` |
| [DNN] 把 `perf` 传进流水线，span 名按步骤动态拼接；未知步骤在计时前已被拒绝，步骤集合是代码里的固定对象 | `dsh-nano-notepad/src/client/panel.js:4611-4617`；`src/client/fx-pipeline.js:128-132` |
| DNPR `hostSpan` 接受 `ctx.traceId/incidentId`，记录 `lastTraceId` 与事件 `traceId` | `host.js:22`、`:45`、`:221`、`:230`、`:252-259` |
| `traceId` 唯一生产者是 [DNK]，其 ALS 上下文只在 `traced()` 中建立，而 `traced()` 包的路由数组为空 | `dsh-nano-kitesurf/index.js:27`、`:304-323`、`:676-677`；`lib/route-table.js:4` |
| [DNK] 路由计数器 `route-err-*`、`route-slow-*` 位于同一条死路径 | `dsh-nano-kitesurf/index.js:346-353` |
| [DNK] 配置项 `perfReview` 默认开启，调用 `setEnabled` 并改写 `process.env.DSH_PERF_REVIEW`，等于替整个宿主进程打开采集（D2） | `dsh-nano-kitesurf/index.js:132`、`:141`、`:416-421`；`src/host/perf.js:26-29`；AGENTS「配置与状态」 |
| DNPR `setEnabled` 的唯一调用方是 [DNK] | `host.js:197-201`；全仓 grep |
| 运维开关已存在：宿主 `DSH_PERF_REVIEW=1`，页面 `?perf-review=1` 或 `localStorage['dsh-perf-review']='1'` | `host.js:187-195`；各包 AGENTS 前置条款 |

#### 【可选选项清单】

| 选项 | 宿主 span | 动态名 | `traceId` | 采集开关 |
|---|---|---|---|---|
| **A** 全部保留 | 9 个都留，与合同面行并存 | 保留 | 保留 | 保留 [DNK] 配置 |
| **B** 规则化处置（**推荐**） | 单一模式整面重合的 5 个退役，其余 4 个保留 | 声明封闭名单 + 常量映射 | 退役 | 只认运维开关 |
| **C** 宿主 span 全部退役 | 9 个都退役，只看合同面 | 合并为一个名字 | 退役 | 只认运维开关 |
| **D** 保留 span、豁免合同面 | 9 个都留，这些路由不注入观测 | 保留 | 保留 | 保留 |

#### 【推荐选项的详细执行说明与分析】（B）

1. **判定规则**（写入 spec rev5，今后新增 span 按此判断）：手写宿主 span 若包住的是**单一工作模式路由 handler 的主体**（只差正文或会话解析），它与合同面行测量的是同一件事，硬切退役；若它是多模式路由中的一种模式、多 action 路由中的一个 action、或者不在路由里（后台、生命周期），它是子阶段，保留。
2. **逐点结论**：
   - 退役（5）：[DNMS] `catalog`、[DNN] `read`、[DNN] `save`、[DNEE] `list`、[DNCS] `sessions`。对应声明的 `keys.hostSpans` 中不出现这些名字，`contract` 中引用对应路由 id；基线中的 `hostSpan.<name>` 行随 `02.1` 的重录消失。
   - 保留（4）：[DNEE] `git-status`、[DNEE] `stats`、[DNCS] `self`、[DNK] `kite-warmup`，写入各自声明的 `keys.hostSpans`。
   - D5 随之收口：[DNMS] catalog 的 500 由合同面行的 `status` 维度体现（`06.3`、`08.2`），不再依赖 throw。
3. **[DNN] 动态名**：在 [DNN] 声明中列出每个流水线步骤对应的 span 名（封闭名单），植入代码通过烘焙常量的「步骤 → 名字」映射取名；映射中没有的步骤不计时、计入结构计数。三方对账（`09.7`）覆盖这张映射。
4. **`traceId` 与路由计数器退役**：
   - DNPR `hostSpan` 的第三个参数 `ctx`、`lastTraceId`、事件中的 `traceId` 删除，不留兼容。
   - [DNK] `hostSpan` 包装中的 `incidentId` 传递、`traced()` 中的 `perfCount('route-err-*')`/`perfCount('route-slow-*')` 删除。
   - [DNK] 自有的 incidentId、operations 环形缓冲属于 [DNK] 诊断，不在本阶段范围，不做改动。
5. **采集开关唯一权威**：宿主只认运维者设置的 `DSH_PERF_REVIEW=1`，页面只认 `?perf-review=1` 或 `localStorage['dsh-perf-review']='1'`。退役：[DNK] 配置项 `perfReview` 及其解析（`index.js:132,141`）、`setPerfEnabled` 调用与 `process.env` 改写（`:416-421`）、`src/host/perf.js` 的 `setPerfEnabled` 导出、DNPR `setEnabled`（`host.js:197-201`）；[DNK] AGENTS「配置与状态」同步删除该配置项。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

- 5 个退役 span 都包住了单一模式路由的主体（见现状表），合同面行给出同一段时长，并多出结果与状态维度；继续保留就是双写，违反 `01.7` 与「能硬切就不双写」。
- D5 的实例（`dsh-nano-model-selector/index.js:180-188`）证明手写 span 在 handler 自己 catch 的情况下无法反映失败；合同面行由门面读取 `res.statusCode`，没有这个盲区。
- 4 个保留的 span 都测量合同面看不到的东西：`git-status` 只测 `/status` 的一种模式（另一种直接回缓存，`routes.js:348-353`），`stats` 和 `kite-warmup` 根本不在路由里，`self` 只是 `/config` 的一个 action。
- `traceId` 的生产者在空路由数组上（`dsh-nano-kitesurf/index.js:676-677`），上下文从不建立，字段恒为 null；按「能彻底退役就不兼容」删除，同时与 `B08`「请求级配对是非目标」一致。
- `setEnabled` 只有 [DNK] 在用（`host.js:197-201`），删除后 DNPR 的开关只剩运维入口，D2 从机制上消失。

**A（全部保留）的反例**

- 违反 `01.7` 已冻结的「整面重合即硬切」。
- D2、D5 都不会被修复。

**C（宿主 span 全部退役）的反例**

- 违反 `01.7`「子阶段 span 保留」。
- `stats`、`kite-warmup` 不在任何路由里，合同面永远看不到它们；`git-status` 与缓存模式混在同一条合同面行里，会被稀释。

**D（保留 span、豁免合同面）的反例**

- 违反 `01` 的主轴：观测以合同面为主，经门面注入。
- 豁免名单本身就是一份需要维护的第二作者源。

**B 的诚实风险**

- [DNMS] `index.js` 当前有 [业主] 未提交的改动；`catalog` 的处置在 W3 进行，届时以 [业主] 已提交的版本为准（Q11 前置条件）。
- 移除 [DNK] `perfReview` 配置后，以前依赖该配置打开采集的操作习惯需要改为设置运维开关；AGENTS 同步说明。
- [DNN] 的步骤名单需要与流水线步骤对象保持一致，由对账测试保证。

- **问题**：PRE-1116 中，现存手写观测与开关是否采用选项 B：按「单一模式路由 handler 主体即整面重合」的规则，硬切退役 [DNMS] `catalog`、[DNN] `read`/`save`、[DNEE] `list`、[DNCS] `sessions`，保留 [DNEE] `git-status`/`stats`、[DNCS] `self`、[DNK] `kite-warmup`；[DNN] 动态 span 名改为声明封闭名单加常量映射；DNPR `hostSpan` 的 `ctx`/`traceId` 与 [DNK] 路由计数器退役；采集开关只认运维开关，[DNK] `perfReview` 配置、环境变量改写、`setPerfEnabled` 与 DNPR `setEnabled` 退役？还是选择 A / C / D？
- **业主回答**：✅ 同意推荐 **B**（[业主] 2026-11-16）→ 🔒 `T-O-PRE1116-12`

---

### Q13 — 采纳范围与非目标登记：哪些插件接入观测、哪些挂读取入口、哪些事项明确不做，文档落在哪里？（**驱动真相：`T-O-PRE1116-01.1`、`03.2`、`04.1`、`06.3`、`10.5`、`B05`、`B07`、`B08`、`B09`** · 来源：中场评估 II/IV 反方制衡）

- **影响范围**：[DNT]、[DNLS] 的 `package.json`（新增 DNPR 构建期依赖）与宿主门面注册处；全部接入插件的 `src/perf/declaration.json`；`security/route-sensitivity.json` 读取入口行；`docs/specs/dsh-nano-performance-review/spec-26nov.md`（rev5）；DNPR README、`INTRODUCTION.md`、`lab/README.md`、各包 AGENTS。
- **为什么必须确认**：`01.1` 让四个门面都能被观测，但谁去注入由各插件决定。今天只有 5 个包依赖 DNPR；`upgrade` 与 `mcp` 两组结果闭集（`06.3`）只在 [DNT] 有对应的面，[DNT] 不接入，它们就是没有生产者的合同。同时，请求级关联、agent 访问面、LoAF 归因、新 track kind 这些事项需要显式登记「本阶段不做」，否则收口判据「无 OPEN 残题」不成立。
- **当前建议 / 倾向**（Droid）：**B — 凡是经门面注册 web 或 MCP 合同面的插件都接入观测并拥有一份声明（[DNEE]、[DNN]、[DNMS]、[DNCS]、[DNT]、[DNLS]）；[DNK] 只有手写观测；[DNMSC] 不在范围。读取入口只挂在同时具备页面植入与宿主路由的 3 个插件（[DNEE]、[DNN]、[DNMS]）。请求级关联、新访问通道、LoAF 归因、新 track kind 登记为本阶段非目标。spec 原地升级为 rev5，是机制的唯一文档；各包 AGENTS 只写本包事实。**
- **Reasoning**：合同面观测是本阶段的主轴，覆盖面应该由「有没有合同面」决定，而不是由「以前有没有依赖 DNPR」决定。读取入口只需要有页面植入的插件挂，因为只有页面需要从宿主拉数据。明确不做的事写进台账，才能让收口判据成立，也避免实现时悄悄扩约。

#### 【对本问题的解读】

本题要定四件事：

1. **门面观测的接入范围**，以及每个接入插件是否需要声明。
2. **读取入口的挂载清单**（落实 `03.2`、`10.5`）。
3. **本阶段明确不做的事项**，以及重新打开它们的条件。
4. **文档落点**：机制写在哪里，包事实写在哪里，避免两处各写一份。

本题**不**改变任何插件的业务行为，也**不**新增敏感度类别（`03.6`）。

现状事实：

| 事实 | 证据 |
|---|---|
| 经门面注册 web 面的插件：[DNN]、[DNT]、[DNEE] 走 registrar；[DNMS]、[DNCS]、[DNLS] 走 guard；[DNK] 注册空数组 | `dsh-nano-notepad/index.js:355`；`dsh-nano-terminal/src/host/web-routes.js:198`；`dsh-nano-explorer-extra/src/host/routes.js:651`；`dsh-nano-model-selector/index.js:573`；`dsh-nano-cloud-session/index.js:485`；`dsh-nano-local-sandbox/index.js:19`；`dsh-nano-kitesurf/index.js:676-677` |
| MCP 合同面只在 [DNT]；jsonClient 只在 [DNEE]/[DNN]/[DNMS] 的页面侧 | `dsh-nano-terminal/src/host/mcp.js:190`；三个插件 `src/client/jsonClient.js` |
| [DNMSC] 是 host-only companion，没有 web 面；它的账本是自己的审计遥测，唯一写入方是它自己 | `dsh-nano-model-selector-compaction/AGENTS.md`；`B05` |
| 依赖 DNPR 的只有 [DNK]、[DNMS]、[DNCS]、[DNN]、[DNEE] | 各包 `package.json` devDependencies（如 `dsh-nano-explorer-extra/package.json:50`） |
| 页面 join 只在 [DNEE]、[DNMS]、[DNN]、[DNK]；[DNCS]、[DNT] 的浏览器产物不含 DNPR | 四份 `src/client/perf.js` 与 `dsh-nano-kitesurf/src/client/index.js:35`；`dsh-nano-cloud-session/lib/client.js`、`dsh-nano-terminal/lib/client.js` 中 `__perfReview` 出现 0 次 |
| 请求级配对是非目标；被否决的归因方案登记在 spec | `spec-26nov.md:36`、`:38-64`（§3.1–§3.4） |
| 机制说明目前分散在 spec、DNPR README、`INTRODUCTION.md`、`lab/README.md` 与各包 AGENTS，口径已有漂移（例如仍写「四个插件」「report() 返回并清空窗口」） | `INTRODUCTION.md:712-716`；`packages/dsh-performance-review/README.md:9`；`dsh-nano-explorer-extra/AGENTS.md` 路由表 `/perf-review/host` 行 |

#### 【可选选项清单】

| 选项 | 门面观测接入 | 读取入口 | 非目标 | 文档 |
|---|---|---|---|---|
| **A** 维持现有依赖面 | 只有已依赖 DNPR 的 5 个包 | [DNEE]/[DNN]/[DNMS] | 不登记 | 各处各自更新 |
| **B** 按合同面覆盖（**推荐**） | 全部 6 个有合同面的插件，各有声明；[DNK] 只有手写；[DNMSC] 不在范围 | [DNEE]/[DNN]/[DNMS] | 显式登记 4 项 | spec rev5 为机制唯一文档，其余只链接 |
| **C** 全面铺开 | 同 B，另给 [DNT]/[DNMSC] 加手写植入与新 track kind | 同 B | 只登记关联 | 同 B |
| **D** DNPR 成为全部 8 个插件的强制依赖 | 8 个都接入，含 [DNK]、[DNMSC] | 同 B | 同 B | 同 B |

#### 【推荐选项的详细执行说明与分析】（B）

1. **门面观测接入范围**：
   - 接入（6）：[DNEE]、[DNN]、[DNMS]、[DNCS]、[DNT]、[DNLS]。每个插件把 DNPR 的观测适配器注入自己使用的门面（`01.1`、`06.1`）。[DNT]、[DNLS] 新增 DNPR 构建期依赖，只用于合同面观测，不加手写植入。
   - 声明：6 个接入插件与 [DNK] 各有一份声明（`04.1`）。只有合同面的插件，声明只有 `contract` 引用，`keys` 为空；三方对账照常执行（`09.7`）。
   - [DNK]：没有合同面（`10.5`），声明只含页面 span 与 `kite-warmup`。
   - [DNMSC]：没有 web 面，账本是它自己的审计遥测（`B05`），不接入、不声明。
   - 结果：`06.3` 的四组结果闭集都有真实生产者（`upgrade`/`mcp` 来自 [DNT]）。
2. **读取入口挂载清单**：[DNEE]、[DNN]、[DNMS] 各挂一条 `GET /<前缀>/perf-review/host`（`10.1`），账本新增 2 行（[DNN]、[DNMS]），[DNEE] 行更新 justification（`10.7`）。[DNK] 不挂（`10.5`）；[DNCS]、[DNT]、[DNLS] 没有页面植入，不挂（`03.2`）。中场评估 II「约 6 个入口」的估计据此更正为 3 个。
3. **本阶段非目标（显式登记，重新打开须由 [业主] 发起新的 QnA）**：
   - **请求级关联**（`B08`）：保持非目标；`traceId` 已随 Q12 退役。
   - **新的访问通道**：不新增 MCP 工具、不新增专用 agent 路由、不新增推送通道。agent 通过已鉴权页面读取 `10.1` 的读取路由与页面 `read()`，或读取 lab 产物。新增通道属于「新 lane」，按「不得擅自扩约」须另行裁决。
   - **LoAF 脚本归因研究**：维持 spec §3.1 的否决结论，不在本阶段重开。
   - **新 track kind 与新的手写植入**（含 [DNT] wasm 终端、[DNMSC] 压缩引擎）：本阶段不加。将来需要时，由该插件在自己的声明中增加键，不修改共享代码，新指标先进 audit（`B09`）。
4. **文档落点（单一真源）**：
   - `docs/specs/dsh-nano-performance-review/spec-26nov.md` 原地升级为 rev5，是机制的唯一文档：§6.5 换成 v2，§6.7 与 §7 的插件行改为指向各插件声明（`04.6`），新增 Q12 的判定规则与本题的非目标清单。
   - DNPR README、`INTRODUCTION.md`、`lab/README.md` 只保留用法与链接，删除与 spec 重复的机制描述。
   - 各包 AGENTS 只写本包事实：读取路由行、DNPR 依赖条款、[DNK] 配置项删除、[DNT]/[DNLS] 新增依赖条款。
   - PRE-1116 计划只 CITE 本文件 §1 台账，不复述真相。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

- `upgrade` 与 `mcp` 面只存在于 [DNT]（`web-routes.js:198`、`mcp.js:190`）。不接入 [DNT]，`06.3` 中这两组闭集就是没有生产者的合同，违反「不得由实现反推合同」的反面：合同存在却从未被实现验证。
- [DNLS] 是唯一持有容器特权的插件，其路由的结果与耗时对排障价值最高；它已经走 guard（`index.js:19`），接入只是注入一个参数。
- [DNMSC] 没有 web 面，账本已有唯一写入方（`B05`、companion AGENTS），接入既无对象也会制造第二审计源。
- 页面入口只为页面拉宿主数据服务；[DNCS]、[DNT] 浏览器产物中没有 DNPR（`__perfReview` 0 次），挂入口没有读者。
- 文档漂移已经发生（`INTRODUCTION.md:712` 仍写「四个包」「report() 返回并清空窗口」）；只留一份机制文档才能避免下一次漂移。

**A（维持现有依赖面）的反例**

- 覆盖面由历史依赖决定，而不是由合同面决定；`upgrade`/`mcp` 闭集无生产者。
- 不登记非目标，收口判据「无 OPEN 残题」不成立。

**C（全面铺开）的反例**

- 新 track kind 与新手写植入属于新指标，`B09` 要求先进 audit 并单独评估；在本阶段一并加入会扩大硬切的体量。
- [DNMSC] 的手写植入会与它自己的审计账本重叠。

**D（全部 8 个强制依赖）的反例**

- [DNK] 没有合同面、[DNMSC] 没有 web 面，强制依赖只增加产物体积，没有观测对象。
- 违反「不得过度仪式」。

**B 的诚实风险**

- [DNT]、[DNLS] 新增构建期依赖，产物体积小幅增加（仅宿主侧适配器），由 `09.6` 的体积测量覆盖。
- 读取入口只有 3 个：页面上若只装了 [DNK]、[DNCS]、[DNT] 中的插件，就没有宿主视图，报告会如实给出 `source: null`（`10.5`）。
- spec rev5 是一次较大的文档改写，在 W3 的文档提交中完成。

- **问题**：PRE-1116 中，采纳范围是否采用选项 B：[DNEE]、[DNN]、[DNMS]、[DNCS]、[DNT]、[DNLS] 6 个有合同面的插件接入门面观测并各有声明（[DNT]、[DNLS] 新增 DNPR 构建期依赖，只做合同面观测），[DNK] 只有手写观测，[DNMSC] 不在范围；读取入口只挂 [DNEE]、[DNN]、[DNMS] 3 个；请求级关联、新访问通道、LoAF 归因、新 track kind 与新手写植入登记为本阶段非目标，重开须由 [业主] 发起新 QnA；spec 原地升级为 rev5 作为机制唯一文档，其余文档只链接，各包 AGENTS 只写本包事实？还是选择 A / C / D？
- **业主回答**：✅ 同意推荐 **B**（[业主] 2026-11-16）→ 🔒 `T-O-PRE1116-13`

---

## 11. ★ 最终轮总结（Round 5 → 收口）

> 本节小节用 A–H，避免和台账细则 `11.1`–`11.8` 撞号。文中 `11.5` 这类不带 § 的编号都是台账细则。

### 11.A 对 Round 5 的判定

- [业主] 于 2026-11-16 对 Q11、Q12、Q13 均裁定**同意推荐 B**，没有附加条件。三题都已决断，没有残留选项。
- 这一轮定的是交付层，不再改方向：
  - **批次**（`11`）：W1 门面观测口、W2 合同面身份、W3 v2 硬切，按这个顺序合并。W1/W2 未使用时行为不变；所有不能共存的切换都在 W3 一次完成。
  - **逐点**（`12`）：9 个手写宿主 span 按一条规则处置；动态 span 名改成封闭名单；`traceId` 与 [DNK] 的采集开关退役。D2、D5 由此收口。
  - **范围**（`13`）：6 个有合同面的插件接入观测，7 个插件有声明，3 个读取入口。四项非目标写明。spec rev5 是机制的唯一文档。
- 推荐 B 的落选项（A/C/D）不再是并行路线。

### 11.B 本轮已锁定真相

- `T-O-PRE1116-11`（细则 `11.1–11.8`）、`T-O-PRE1116-12`（细则 `12.1–12.7`）、`T-O-PRE1116-13`（细则 `13.1–13.6`）已写入 §1.2。
- 前序留口的现行读法在 §1.3。旧行原文不改。

### 11.C 全册一致性审计

审计范围：全部业主回答、§1 台账、分轮状态、交叉引用、数量词、以及「同一决定会不会被读成两种现状」。没有改代码、没有跑测试。审计不证明产品行为。

题面里的推荐、证据和 Reasoning 保持提问时原文。业主回答、台账新行、§1.3 和本节是冻结记录。条件句（「若选 B」「留给 executional」）由业主回答兑现，不再是待选。

| 检查 | 结果 |
|------|------|
| 业主回答 | Q1–Q13 全部是「同意推荐 B」，与 §1 的 `01`–`13` 一一对应。没有空回答，没有选了 B 又在台账写 A 的行 |
| 留口 | `01.3`、`01.7`、`01.9`、`02.7`、`03.2`、`03.4`、`03.7`、`04.8` 都已有关闭条目，见 §1.3。旧行仍写「留给」，读的时候按 §1.3，不按字面当成未决 |
| 批次顺序 | 题面「`05` 必须先于 `06`」容易读成 W2 必须先于 W1。`11.2` 把它收成：id 是**发出事件**的前提，不是落地可选参数的前提。W3 之前没有人发带 id 的事件，所以没有双写窗口 |
| 脏工作区 | 文首曾写「11 个」、Q11 曾写「22 个」。两个都是当时的 `git status` 计数，不是合同。现行前置是 `11.3` 的文件清单。三批都不得覆盖尚未提交的文件；[DNMS] vendored guard 若要带上 `observe`，推迟到清单落地之后 |
| 插件数量 | `01.6` / `04.1` / `05.3` / `07.4` 的「8 个」「四份」「每个插件」与仓库不符，也和 Q13 的名单冲突。活跃 `src/client/perf.js` 只有 [DNEE]、[DNMS]、[DNN] 三份；[DNMSC] 没有 web 面、没有 route-table、没有 bindings、没有 DNPR 依赖。外延改按 `13.6`，旧句不改字 |
| 读取入口 | `03.2` 的「每个有页面植入的插件都挂」把 [DNK] 留成了口。`10.5` 与 `13.3` 关闭该口：不挂。中场评估 II 的「约 6 个」作废，现行 3 个。[DNEE] 更新既有行，不另增第二行 |
| 结构计数字段 | `03.3` 的形状不合格归 `structure.badShape`。`12.4` 的未映射步骤归新字段 `structure.unmappedKey`，追加进 `08.3` 的闭集，不占用 `badShape` |
| 手写 span | 现状表 9 个全部有归属。没有把 [DNCS] `sessions` 改判成子阶段：业主接受的 B 就是退役，两种 op 不再分计，这是接受推荐，不是漏判 |
| `src/host/perf.js` | `10.6` 删 `perfSnapshot`，`12.6` 删 `setPerfEnabled`，`12.2` 仍要 `hostSpan` 承接 `kite-warmup`。三句合在一起是「不整文件删除」，写在 `12.5`，避免两批各删一半后把文件删掉 |
| 章节指针 | §7.5 写「进入 §10 收口」是重编号前的句子。收口是 §12。已加时点注记，不改原判断 |
| D1–D9 | §9.4 在本轮补齐 D2、D5。九条都指向已冻结细则 |
| 同轮互证 | Q11 的批次包含 Q12/Q13 的落点，Q13 的范围反过来限定 Q11 里「8 个插件」的外延。三题一起冻结，不存在「先冻一题、另一题还是草稿」的窗口 |

没有发现需要推翻任一已选 B 的冲突。上面的修复都是读法、外延和欠登记，不是改选。

### 11.D §9.6 收口承诺核对

| 承诺 | 结果 |
|------|------|
| `T-O-PRE1116-01` 至 `13` 全部冻结 | 已写入 §1.2。Baseline `B01–B11` 仍有效 |
| D1–D9 都有收口真相 | 见 §11.E |
| 没有 OPEN 业主题；明确不做的事项由 Q13 登记 | `13.4` 四项。§11.F 的实现细项不是业主题 |
| 之后写 PRE-1116 计划 | 尚未写。计划只 CITE §1，不在计划里改真相。本文不授权开工 |

### 11.E 初评缺陷 D1–D9 最终对照

| 缺陷 | 收口 |
|------|------|
| D1 [DNK] 每 10 秒破坏性 `report()` | `03.5`、`08.6`、`11.5` ③ |
| D2 [DNK] 打开全进程宿主采集 | `12.6` |
| D3 `configure()` 先到先得 | `03.3`、`08.6` |
| D4 contributors 无界 | `07.5` |
| D5 宿主错误只认 throw | `06.3`、`08.2`、`12.3` |
| D6 宿主 errors/events 止于合并层 | `08.2`、`08.9` |
| D7 `LIB_VERSION` 恒定 | `07.4` |
| D8 宿主单例升级丢状态 | `07.3` |
| D9 lab 残留退役场景 | `04.5`、`09.8` |

### 11.F 不是 OPEN 的实现细项

下面这些在已冻结细则里写明「实现时定」或「示意」。它们不是缺一轮裁决，计划里直接定死并加测试即可：

- 协议单例键的具体字符串（`07.1` 的示意是 `__dnpr_v2` / `__dnprHost_v2`）。
- 构建戳的哈希输入范围（`07.7`：同一份源码必须得到同一个戳）。
- lab 驱动接口的函数形状（`09.8`）。
- 合同面行键的正则文本（`05.7` 是示意；「允许点分、与 `NAME_RE` 分开」已冻结）。
- `evidence` 数组的具体上限（`08.3` 示意交互 5、帧 5、宿主错误 20；「固定上限、超出先裁证据」已冻结）。
- 命名表的逐行 id（`05.2`、`11.4`）。抽查是实施检查点，抽查前不得烘焙。

### 11.G 诚实剩余风险（不挡住真相冻结）

- W3 体量大。内部提交顺序只降低审查难度，不减小 diff。
- W2/W3 开工取决于 `11.3` 清单先落地。这是前置条件，不是未决设计。
- `04.7` 的对照比的是规则通过/失败，不比数值，因为结果受本机环境影响。
- [DNCS] `sessions` 退役后，list 与 insights 不再分开计时，只留合同面行。这是 B 的取舍。
- 去掉 [DNK] `perfReview` 之后，原来靠配置打开采集的习惯要改成运维开关。AGENTS 会写明。
- 读取入口只有 3 个。页面若只装了没有入口的插件，宿主视图是 `source: null`，这是 `10.5` 的如实报告，不是故障。
- [DNT]、[DNLS] 新增构建期依赖会让宿主侧体积略增，由 `09.6` 的测量覆盖，不新增门禁。
- 代码、测试、基线重录、spec rev5 都还没做。冻结不等于债务清零。

### 11.H 交接

真相层到此结束。下一步是另写 **PRE-1116 计划**，§2 只 CITE 本文件 §1。计划不填写 Q/A，不改本台账的规则句。实施、合并、部署、发布都要另有授权；本文没有给出。

---

## 12. 收口（全轮冻结）

**已收口（2026-11-16）。**

- **冻结判据**：方向钉死；§1 中 `B01–B11` 与 `01–13` 全部冻结；没有 OPEN 业主题。明确不做的四项在 `13.4`。实现细项在 §11.F，不构成下一轮。
- **交接**：§1 Truth-Gate 台账 → **PRE-1116 计划** §2 只 CITE；spec rev5 只 CITE。计划不得改写本台账。
- **边界**：`已冻结` 不等于代码已改、测试已绿、基线已重录、或修正案已签署。本文不构成 implementation、build、deploy 或发布的 grant。

---

## 13. 使用约束

- 本文件已冻结，是 PRE-1116 裁决的唯一登记真源。不另写第二份台账。
- 不再预排下一轮。Q 编号不回收。推翻已冻结真相只能在本文件 append-only 追加修订，不改旧行，再把新读法补进 §1.3。
- 下游计划只 CITE §1。与本台账不一致时，以本台账为准，并改计划。
- 题面中的落选项、推荐理由和证据表不是现行合同。现行合同是 §1 里业主已经接受的那一格，加上 §1.3 的读法。

---

## 修订历史

| 版本 | 日期 | 作者 | 主要变更 |
|------|------|------|----------|
| v0.1 | 2026-11-16 | Droid | 初稿：Baseline B01–B11；Round 1 Q1（观测接入模型）、Q2（报告合同演进与判定真源） |
| v0.2 | 2026-11-16 | Droid | Round 1 冻结：[业主] 同意 Q1/Q2 推荐 B，细则写入 `T-O-PRE1116-01`（01.1–01.9）、`T-O-PRE1116-02`（02.1–02.7）；中场评估 I；Round 2 Q3（宿主读取面拓扑与窗口）、Q4（判定依据的作者源） |
| v0.3 | 2026-11-16 | Droid | Round 2 冻结：[业主] 同意 Q3/Q4 推荐 B，细则写入 `T-O-PRE1116-03`（03.1–03.7）、`T-O-PRE1116-04`（04.1–04.8）；计划名更正为 PRE-1116 计划；中场评估 II；Round 3（executional）Q5 合同面身份键、Q6 门面观测事件合同、Q7 多拷贝协议与版本判别 |
| v0.4 | 2026-11-16 | Droid | Round 3 冻结：[业主] 同意 Q5/Q6/Q7 推荐 B，细则写入 `T-O-PRE1116-05`（05.1–05.9）、`T-O-PRE1116-06`（06.1–06.7）、`T-O-PRE1116-07`（07.1–07.7）；中场评估 III（含 §7.5 收口判断：需要 Round 5）；Round 4 Q8 v2 报告与读侧合同、Q9 性能声明格式与投递、Q10 宿主读取路由落地与残余退役；章节重编号 |
| v0.5 | 2026-11-16 | Droid | Round 4 冻结：[业主] 同意 Q8/Q9/Q10 推荐 B，细则写入 `T-O-PRE1116-08`（08.1–08.9）、`T-O-PRE1116-09`（09.1–09.8）、`T-O-PRE1116-10`（10.1–10.7）；中场评估 IV（含 D1–D9 收口对照与收口承诺）；Round 5（最后一轮）Q11 交付批次与验收、Q12 手写观测与开关逐项处置、Q13 采纳范围与非目标登记；章节重编号（§10 Round 5、§11 中场评估 V、§12 收口、§13 使用约束） |
| v0.6 | 2026-11-16 | Droid | Round 5 冻结：[业主] 同意 Q11/Q12/Q13 推荐 B，细则写入 `T-O-PRE1116-11`（11.1–11.8）、`T-O-PRE1116-12`（12.1–12.7）、`T-O-PRE1116-13`（13.1–13.6）；追加 §1.3 收口读法。全册一致性审计后修正状态竞态、数量词外延、结构计数欠登记与章节指针；§11 最终总结（小节 A–H，不与细则 `11.1`–`11.8` 撞号）；文档状态改为 `已冻结`。未改代码、未跑测试、未写计划 |
