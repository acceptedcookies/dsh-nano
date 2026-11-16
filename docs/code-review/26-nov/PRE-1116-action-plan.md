# Nano-Agent 行动计划 · PRE-1116 DNPR 升级与消债

> 服务业务簇: `performance-review-enhancement`（[DNPR] 外壳升级：合同面观测、身份、schema v2 一次硬切）
> 计划对象: `1116 · PRE-1116`（三个按序 worktree：`pre1116-facade-observe` / `pre1116-binding-ids` / `pre1116-dnpr-v2`）
> 类型: `upgrade | refactor | migration | remove`
> 作者: `PRE-1116 计划 agent（lead）`
> 时间: `2026-11-16`
> 文件位置: `docs/code-review/26-nov/PRE-1116-action-plan.md`
> 推定 slug（文件名不带；`工作波次` 为空，见发车 INFO#3 / INFO#4）: `facade-observe-binding-v2`
> 上游前序 / closure:
> - `docs/code-review/26-nov/PRE-1116-qna.md`（decision provenance；Baseline `B01`–`B11` + Q1–Q13 全选 B）
> - `docs/code-review/26-nov/PRE-1116-qna-truth.md`（`PRE1116-TRUTH` v0.1.1，`🔒 FROZEN · NOT IMPLEMENTATION CLOSURE · NOT IMPLEMENTATION GRANT`）
> 下游交接:
> - **（另立）`ImplementationGrant`** —— 本 AP 不签发、不替代。`T-O-PRE1116-11` / `11.8`：三批是真相层的交付形状，不是开工或合并授权。truth §0.1「足以写下游计划: YES / 足以签发 implementation grant: NO」。
> - 对照运行的结果表（`11.7`）在实施收尾时写入本计划的执行记录，不在本文预填。
> 关联设计 / 调研文档:
> - `docs/code-review/26-nov/PRE-1116-initial-assessment.md`（初评；§3 台账与 §8 工作项是债务索引。`T-O-PRE1116-B01`：初评推荐不是合同）
> - `docs/specs/dsh-nano-performance-review/spec-26nov.md`（现行机制文档；实施时按 `04.6` / `13.5` 原地升 rev5。升版前的「四个包」「`report()` 返回并清空窗口」不是现行合同）
> 冻结决策来源:
> - `PRE-1116-qna-truth.md` §1 总表 + §2 内核 + §4.4 `AF-1`–`AF-13`（只读引用；本 action-plan 不填写 Q/A、不复制规则句、不改口）
> grounding 来源:
> - 初评 `file:line` 测量 + 本 AP 撰写时对 `HEAD e228445` 的符号复核（无独立 eval-reference-anchor）→ **§7 内置锚区即本 AP 的 grounding 真源**
> 关联 reference-anchor: `见 §7 内置锚区（含 §7.0 快照说明）`
> 文档状态: `draft`
>
> 词汇锚定约定：本 AP 自著行文中的核心词汇（[业主]、[真相层]、[dsh]、[dsh-nano]、[DNPR] 与 8 个活跃插件缩写 [DNEE]/[DNK]/[DNMS]/[DNMSC]/[DNN]/[DNT]/[DNLS]/[DNCS]）按根 `AGENTS.md` 核心词汇台账带 `[]` 锚定。`file:line` 路径、包名、`T-O` / 条款号、Test-ID、worktree 名与代码块内的标识符保持裸写。
>
> **冲突规则**：初评、中场评估、本文测量与冻结条款不一致时，以 [`PRE-1116-qna-truth.md`](./PRE-1116-qna-truth.md) 为准；该台账与 [`PRE-1116-qna.md`](./PRE-1116-qna.md) 不一致时以问答为 provenance。步骤可以点名字段与符号，方便施工；规则句仍以真相层为准。与真相层冲突时删步骤，不改真相层，也不把本文的转写当成可以脱离条款号单独执行的第二合同。
>
> **审查回写**（2026-11-16）：对抗审查见 `.anote/reviews/PRE/1116/na/6291/`。已吸收的 blocker：`11.5` ③ 不得提前进 P3-04；[DNLS] perf 分支行号漂移；`structure` 不是只剩 5 个新键；T05/T12/T20/T10/T16/T19 的判定列补上能失败的负例。未吸收的「改松」要求：没有。T01 的逐字比较、T03 扫 `lib/`、T23 必须有 v1 列，保持原硬度。

---

## 0. 执行背景与目标

> **纪律**：本文件只消费已冻结结论。Q1–Q13 已全部关闭（`AF-1`：旧行里的「留给 executional」一律读作已关闭留口，不是 OPEN）。本 AP 不新开 Q/A。实施期若真出现新的公共合同变更，回到原问答 append-only supersession，本 AP 保持 `draft`。
>
> **授权边界（贯穿全文）**：本文是 truth §0.1 箭头图里的「PRE-1116 计划（只 CITE）」节点，**不是** implementation grant，不是 build / deploy / secret / provider / 远端动作授权，不新增 release-gate，不改 `RELEASE.md`（`11.6` / `11.8` / 权威边界 6）。`FROZEN` 不表示代码已改、测试已绿、基线已重录、spec 已升 rev5、或 worktree 已合并。因此：**全部工作项是待执行的施工规划；当前 0 项已开工、0 项 PASS、0 项销账**。§8 的四元组是执行期必须产出的证据形状，不是既成事实。§10 收口状态一律 `未观察`。文档状态保持 `draft`：审查回写不把它改成 `executing` 或 `executed`。

- **服务业务簇**：`performance-review-enhancement`
- **计划对象**：`1116 · 把 [DNPR] 从「四个 UI 插件的植入库」外壳，一次硬切成「合同面身份 + schema v2 + 只读宿主视图」；计量核心不重写`
- **本次计划解决的问题**：
  - 把 `T-O-PRE1116-B01`–`B11` 与 `01`–`13`（含 `01.1`–`13.6` 与 `AF-1`–`AF-13` 的收口读法）投影成三个按序 worktree 上可施工、可验证、可销账的工作项（`11.1` / `11.5`）。
  - 先落未使用的观测口（`06`），再落身份（`05`），最后一次硬切报告、声明、读取路由与退役面（`07`–`10`、`12`、`13`）。三批之间没有双写期，产品代码不留 v1 分支（`11.2`）。
  - 用防假绿测试台账锁住「未注入时逐字不变」「命名表先于烘焙」「读不清窗」「对照比的是通过/失败而不是数值」这些最容易被绿灯冒充的收口。
- **本次计划的直接产出**：
  - 一份 `draft` 状态的三 Phase 执行计划（本文）：3 个 Phase、18 个工作项、28 个 Test-ID。
  - 每个工作项三件齐全（涉及文件 file:line、收口目标、测试映射）；净新 / 高风险项在 §4 拆成有序子步。
  - §7 内置锚区（含信任边界落点）与 §8.6 逐 Test-ID 防假绿侦测。
- **本计划不重新讨论的设计结论**（只 CITE）：
  - 计量核心保留、不重写（来源：`T-O-PRE1116-B02`）。
  - 门面只接受注入，不 import [DNPR]；未注入时行为不变（来源：`T-O-PRE1116-B04` / `B06` / `01.2` / `06.5`）。
  - 报告一次硬切到 schema v2；`report()` 读即清窗退役、不留同名别名（来源：`T-O-PRE1116-02` / `08.6`）。初评 P0-01 的 `peek()`、P0-09 的 v1 加字段，按 `02.6` 取消，不执行。
  - 三个 worktree 的批次、顺序与验收只按 `T-O-PRE1116-11`；范围只按 `T-O-PRE1116-13`（7 份声明、3 个读取入口、[DNMSC] 不接入）。

---

## 1. 执行综述

### 1.1 总体执行方式

本 AP 采用**「先未使用的观测口，后身份，最后一次硬切；测试先于改行为；对照先于删除旧判定」**。Phase 与 `11.1` 的三个 worktree 一一对应，不另设第四批，也不把初评 §8 的 P0/P1/P2 当成阶段。Phase 1 只落 `06`（事件定义 + 四门面可选 `observe` + `onCall` 退役），不注入任何观测器。Phase 2 只落 `05`（账本 id，先交命名表由 [业主] 抽查，通过后再烘焙）。Phase 3 是单一 worktree `pre1116-dnpr-v2` 的一次合并，内部按 `11.5` ①–⑦ 顺序提交，整体一次合并。三批都建在 `.agents/worktrees/`，合并后按 [业主] 要求删除（`11.1`）。本文不授权创建这些 worktree。

### 1.2 Phase 总览

| Phase | 名称 | 规模 | 目标摘要 | 依赖前序 |
|------|------|------|----------|----------|
| Phase 1 | W1 · `pre1116-facade-observe`（只落 `06`） | `M` | 观测事件与结果闭集进 `dsh-interface/contracts`；四门面可选 `observe`；`onCall` 退役；先补「未注入时逐字一致」再改代码；重建不在 `11.3` 清单上的消费方产物。不注入观测器 | `-`（`06`；`11.2`：id 不是本批落地可选参数的前提） |
| Phase 2 | W2 · `pre1116-binding-ids`（只落 `05`） | `L` | 账本补 `id`/`channel`/`match`；命名表经 [业主] 抽查后才烘焙；`routeTableModule` 与现存 `lib/route-table.js` 退役；guard 记录带 `id`；路由条数/方法/敏感度与改动前逐条相同 | Phase 1 已合并，且 `11.3` 六文件已由 [业主] 提交 |
| Phase 3 | W3 · `pre1116-dnpr-v2`（`07`–`10` + `12` + `13`，一次合并） | `XL` | 协议键与构建戳、v2 报告、`diagnose()`、声明、三入口只读宿主视图、9 个手写 span 处置、侧载通道退役、lab 改声明驱动、对照后删旧 `evaluate`、基线重录、spec rev5 | Phase 1 与 Phase 2 都已合并（`11.2`：W3 不得更早） |

> 说明：`规模` 只是描述性提示，不是开工闸。Phase 3 内部的 ①–⑦ 是**同一个 worktree 里的提交顺序**，不是三次合并，也不是可并行的独立 Phase。P3 编号对齐这个顺序，但有两处不许并进同一次提交：P3-04（①）不得删 [DNEE] 的 `mode=window`（那是 ③ / P3-07）；P3-09 拆成两次提交，⑤ 对照并删除 `evaluate` 在前，⑥ 重录基线在后。

### 1.3 Phase 说明

1. **Phase 1 — W1 · 未使用的观测口**
   - **核心目标**：四门面具备可选 `observe`，事件形状与结果闭集有唯一作者（`dsh-interface/contracts`），`onCall` 无别名残留；运行中的插件因为没有人传入 `observe`，行为不变（`11.1` / `06.5`）。
   - **为什么先做**：`06` 是公共合同扩展的唯一登记（`01.1`）。它不依赖账本 id 已经写进生产路由记录（`11.2` / `AF-8`）。先把「不传回调时逐字不变」锁进测试，后面的注入才有对照基线。
2. **Phase 2 — W2 · 合同面身份**
   - **核心目标**：web 合同面的 id 只由 `security/route-sensitivity.json` 作者；host / 浏览器 / MCP 以后共用这一个 id（`05`）。烘焙范围是 `13.6` 点名的 7 个插件，不含 [DNMSC]。
   - **为什么放在这里**：id 是「发出并消费带 id 的事件」的前提，但事件的第一批真实消费在 Phase 3。Phase 2 合并后仍然没有人调用 `observe`（`11.2`）。
3. **Phase 3 — W3 · 一次硬切**
   - **核心目标**：在 W1+W2 之上，按 `11.5` 把协议单例、v2 报告、声明、读取路由、span 处置、退役与文档一次切完。不留 v1 读取分支，不写转换器（`02.1`）。
   - **为什么放在这里**：声明的 `contract` 引用、读取路由的账本 id、合同面行，都要等 id 与 `observe` 都已合并（`11.2`）。旧 `evaluate` 必须等 `11.7` 对照通过后才删除（`11.5` ⑤）。

### 1.4 执行策略说明

- **执行顺序原则**：worktree 严格 W1 → W2 → W3。W3 内部严格 `11.5` ①→⑦。命名表抽查（`05.2` / `AF-10`）挡在烘焙之前。`11.7` 对照挡在删除旧 `evaluate` 之前。
- **风险控制原则**：每批开始前重读工作区，`11.3` 清单上仍脏的文件不覆盖。W1 若必须改 [DNMS] `lib/route-guard.js`，推迟到该清单落地之后。门面不 import [DNPR]。观测回调异常被吞掉。未传 `observe` 时不读时钟。
- **测试推进原则**：短途（未注入逐字一致、闭集、退役 grep、声明校验、三方对账）在开发中持续跑；spike 按 Phase 收口；mega 只放在 `11.6` 已经点名的 lab 三次稳定性与注入红线，不另造 soak 仪式（§8.4）。
- **文档同步原则**：机制句只进 spec rev5（`13.5`）。README / `INTRODUCTION.md` / `lab/README.md` / 各包 AGENTS 只留用法、本包事实与指向 spec 的链接。本 AP 只 CITE，不把规则句再抄进 spec。
- **回滚 / 降级原则**：三批各自是独立合并。W1/W2 合并后产品行为不变，回滚即回到合并前。W3 是一次硬切，不提供 v1 兼容读路径；W3 未合并前不删除旧 `evaluate`、不重录基线。失败的 W3 在合并前留在 worktree，不把半套 v2 写进 `main`。

### 1.5 本次 action-plan 影响结构图

```text
PRE-1116
├── Phase 1  W1 未使用的观测口（无人注入）
│   ├── packages/dsh-interface/src/contracts/   事件形状 + 结果闭集（DNPR 不定义）
│   ├── createGuard / createWebRegistrar / createJsonClient / createMcpToolset
│   │     可选 observe；onCall 删除
│   └── 消费方产物重建（跳过 11.3 清单上仍脏的 [DNMS] vendored guard）
├── Phase 2  W2 身份（仍无人发带 id 的生产事件）
│   ├── security/route-sensitivity.json + gen/scan 保留人工审定 id
│   ├── 命名表 → [业主] 抽查 → bindingTableModule 烘焙 7 个插件
│   ├── routeTableModule 与现存 lib/route-table.js 退役
│   └── guard 冻结记录增加 id；route-inventory 与路由说明同步
└── Phase 3  W3 一次硬切（11.5 ①–⑦，一次合并）
    ├── DNPR：协议键、构建戳、read/cutWindow、游标、diagnose、声明校验
    ├── 7 份 src/perf/declaration.json + 适配器注入 + 4 处页面 join 替换
    ├── 3 个 GET /<prefix>/perf-review/host；写盘器删除
    ├── 5 个手写 hostSpan 退役 / 4 个保留；[DNK]→[DNLS] 通道退役
    ├── lab 声明驱动；11.7 对照后删除旧 evaluate；基线重录
    └── spec rev5 与各包事实文档
```

---

## 2. In-Scope / Out-of-Scope

### 2.1 In-Scope（本次 action-plan 明确要做）

- **[S1]** W1：`06` 的事件合同、四门面可选 `observe`、`onCall` 无别名退役、未注入逐字一致、消费方产物重建（`11.1`）。
- **[S2]** W2：`05` 的账本 id / channel / match、命名表抽查后的烘焙、guard 记录带 id、`routeTableModule` 与现存 route-table 退役、路由条数/方法/敏感度逐条对照（`11.4`）。烘焙外延按 `13.6` / `AF-4`： [DNEE]、[DNN]、[DNMS]、[DNCS]、[DNT]、[DNLS]、[DNK]。[DNLS] 补烘焙入口。
- **[S3]** W3：`07`–`10`、`12`、`13` 的全部落点，含 7 份声明、3 个读取入口、9 个手写宿主 span 的一条规则、spec rev5、`11.6` 点名的现有检查与 lab 验收。
- **[S4]** 计量核心的回归锁：Event Timing 归并与三段、span 区间并集、窗口归因、`pickOwner` 最深者胜（`B02`）。硬切外壳时用冻结向量保住这些算法，不重写它们。

### 2.2 Out-of-Scope（本次 action-plan 明确不做）

- **[O1]** 初评里未被冻结、或被后续条款改读的推荐：`peek()` 同名保留、v1 行内加字段（P0-09，`02.6` 取消）、宿主单例就地升级并复制状态（`07.3` 退役 `host.js` 升级分支）、`onCall` 旧语义保留（`06.6` 退役）、[DNMSC] episode 计时或空绑定表（`13.2` / `AF-3` / `AF-4`）、[DNT] wasm / WS / SSE 新手写植入与新 track kind（`13.4`）、请求级关联与 `traceId`（`B08` / `12.5` / `13.4`）、LoAF 区间归因（`13.4`）、新的 MCP 工具或 agent 推送通道（`13.4`）、F21.4 `Snapshot` 形状扩用（判定形状以 `08.5` 为准，不另抄 Snapshot）。
- **[O2]** 第四份 `src/client/perf.js`、第 4 个及以后的读取入口、[DNK] 挂宿主路由（`13.3` / `13.6` / `AF-2` / `AF-5`）。
- **[O3]** v1 读取分支、报告转换器、生产双写、`takeWindow()` 兼容别名、`report()` / `reset` / `configure` / `setHostSnapshotProvider` 别名（`02.1` / `08.6` / `03.4`）。
- **[O4]** 扩大硬门禁、新 release-gate、改 `RELEASE.md`、定版本号（`B09` / `11.6`）。本 AP 本身的撰写、以及未来的实施，都不构成远端或 live 授权；`11.6` 里「本机部署后读一次」只在另立 grant 之后才成为可执行步骤，在本文保持 `未观察`。
- **[O5]** 重写计量算法；把 [DNPR] 并入 `dsh-interface`；让门面 import [DNPR]；让 [DNPR] 成为错误真源或取代 [DNMSC] 账本（`B02` / `B04` / `B05`）。

### 2.3 边界判定表

| 项目 | 判定 | 理由 | 重评条件 |
|------|------|------|----------|
| 四门面 `observe` 可选参数 | `in-scope`（Phase 1） | `01.1` 是这条公共扩展的唯一登记 | 不得在 W1 顺便注入生产观测器 |
| 账本 `id`/`channel`/`match` | `in-scope`（Phase 2） | `05.1`–`05.4` | 命名表未经 [业主] 抽查不得烘焙（`AF-10`） |
| schema v2、`read`/`cutWindow`、游标、`diagnose` | `in-scope`（Phase 3） | `02` / `08` / `09` | 不得拆成 v1 过渡 PR |
| [DNK]→[DNLS] `/perf-report` 与 `/perf-review/host` | `in-scope` 只退役 | `B11` / `03.5` | 不改造、不兼容 |
| [DNMSC] | `out-of-scope` | `13.2` | 新 QnA 之前不得加依赖、声明或空绑定表 |
| 请求级配对 / 新 agent lane / LoAF 拆分 / 新 track kind | `out-of-scope` | `13.4` | 只能由 [业主] 新开 QnA |
| `11.3` 六文件上的未提交改动 | `defer / 不得覆盖` | `11.3` | [业主] 提交之后，执行批次才可以改这些路径 |
| 开工与合并 | `defer / 未授权` | `11.8` | 另立 ImplementationGrant |

---

## 3. 业务工作总表

> 编号 `P1-*` 属于 Phase 1（W1），`P2-*` 属于 Phase 2（W2），`P3-*` 属于 Phase 3（W3）。W3 的编号顺序就是 `11.5` 的提交顺序，不是可打乱的并行清单。
>
> 行号以符号为准。初稿锚点 `e228445`；审查回写时 [DNLS] `routes.js` 的 perf 分支已不在 `:1137-1146`（见 §7.0）。`B-HEAD`：漂移时以路径 + 符号名为准，不回改 [真相层]。

| 编号 | 所属 Phase | 工作项 | 类型 | 涉及文件（file:line） | 收口目标 | 测试映射 | 风险 |
|------|------------|--------|------|------------------------|----------|----------|------|
| P1-01 | Phase 1 | 观测事件与结果闭集 | `add` | 🆕 `packages/dsh-interface/src/contracts/observeEvent.js`；`src/contracts/index.js:1-29`；消费 `jsonOutcome.js:19-30` | 闭集与事件字段只有这一份纯定义；[DNPR] 不定义它 | `PRE1116-T02` | `high` |
| P1-02 | Phase 1 | 四门面可选 `observe` | `update` | `route-guard.js:150-241`；`createWebRegistrar.js:35-118`；`createJsonClient.js:48-107`；`createMcpToolset.js:30-88` | 未传入时响应逐字一致且不读时钟；传入时结束时同步调用一次，异常被吞 | `PRE1116-T01` `PRE1116-T02` `PRE1116-T20` | `high` |
| P1-03 | Phase 1 | `onCall` 退役并重建允许范围内的产物 | `remove` | `createMcpToolset.js:27-30,72`；`dsh-nano-terminal/lib/mcp.js:29,72`；以及 §5.1 列出的内联副本 | 源码与已重建产物中无 `onCall` 标识符、无别名；[DNT] 自有审计逻辑不改语义 | `PRE1116-T03` `PRE1116-T04` | `high` |
| P2-01 | Phase 2 | 账本补字段且合并时保留 | `update` | `security/route-sensitivity.json` 的全部 `routes[]`（不要写成 `:1-20`；文件长于表头）；`scripts/gen-route-sensitivity.mjs:6-8,33-39`；`scripts/route-scan.mjs:56` 与 `:59` | 每行有人工审定的 `id`/`channel`/`match`；再生成不改写这三字段，也不从 path 推导；旧字段逐条相同；upgrade 不被 `:59` 丢掉 | `PRE1116-T05` `PRE1116-T27` | `high` |
| P2-02 | Phase 2 | 命名表与抽查闸 | `add` | 🆕 `security/perf-binding-ids.md`（命名表，抽查件） | 烘焙脚本在命名表与账本 id 不一致时失败；绿灯不等于 [业主] 已抽查 | `PRE1116-T06` | `high` |
| P2-03 | Phase 2 | 烘焙绑定表并退役 route-table | `migrate` | `build/index.js:27-68`；`dsh-nano-explorer-extra/scripts/build-client.mjs:25-44`；[DNN]/[DNT] `lib/bindings.js`；现存 `lib/route-table.js`（§7.1 A-14）；[DNLS] 新建 `scripts/build-client.mjs` | 7 个插件的 `lib/bindings.js` 只来自账本；id 不随路径重算；[DNMSC] 不出现绑定表；`routeTableModule` 删除 | `PRE1116-T07` | `high` |
| P2-04 | Phase 2 | guard 记录带 id；清单与路由说明 | `update` | `route-guard.js:211-220,262-266`；`security/route-inventory.md`；各包 AGENTS 的路由节 | `inventory()` 行含账本 id；路由说明不再把生成物说成手写第二作者 | `PRE1116-T08` | `medium` |
| P3-01 | Phase 3 | 协议键、构建戳、不迁移状态 | `refactor` | `client.js:662-665`；`host.js:315-345`；`state.js:9-10`；7 个插件的构建脚本（`__NXE_VERSION__` 同类 define 落点） | v2 不读不写旧键；旧键存在只记 `legacyCopies`；同协议不就地升级 | `PRE1116-T09` `PRE1116-T10` `PRE1116-T21` | `high` |
| P3-02 | Phase 3 | v2 报告、两动词、宿主游标 | `refactor` | `client.js:537-652`；`aggregate.js:143-310`；`host.js:54-111,252-294`；`state.js:13-20` | 页面只有 `read` 与 `cutWindow`；宿主以 `{epoch,seq}` 界定窗口且不排空；分位行带 `basis` 与 `n` | `PRE1116-T11` `PRE1116-T12` `PRE1116-T13` | `high` |
| P3-03 | Phase 3 | `diagnose`、声明词汇、校验与三方对账 | `add` | 🆕 `packages/dsh-performance-review/src/diagnose.js`、`src/declaration.js`；`lab/budgets.mjs:43-56,204-252`；`test-helpers/index.mjs` | 判定只有 Node 侧纯函数；浏览器产物不含预算表；插件名不出现在 [DNPR] 与 lab 源码 | `PRE1116-T14` `PRE1116-T15` | `high` |
| P3-04 | Phase 3 | 只读 handler、写盘器退役、先挂 [DNN]/[DNMS] | `add` / `remove` | `host.js:19,113-176`；🆕 DNPR 宿主出口的只读 handler；[DNN] `index.js:355` 一带与 [DNMS] `index.js:573-580` 的注册点。**不含** [DNEE] `routes.js:573-585` | ① 交付 `10.1`/`10.4`：handler 存在，写盘链删除，[DNN]/[DNMS] 挂上新路由。[DNEE] 的排空留到 P3-07 | `PRE1116-T13` `PRE1116-T19` | `high` |
| P3-05 | Phase 3 | 七份声明、适配器、join 替换 | `migrate` | 三份 `src/client/perf.js`；`dsh-nano-kitesurf/src/client/index.js:35-64`；六插件门面调用点（§7.1 A-23）；🆕 各包 `src/perf/declaration.json` | 4 处旧页面接入消失且不新建第五处；6 个合同面插件的生产调用传入 `observe`；[DNK] `contract` 为空；[DNMSC] 零依赖。T04 只证明 W1，不证明本项 | `PRE1116-T16` `PRE1116-T15` | `high` |
| P3-06 | Phase 3 | 9 个手写 span、动态名、采集开关 | `remove` / `update` | §7.1 A-24 的 9 个调用点；`host.js:45,221,252`；`dsh-nano-kitesurf/index.js:304-353,416-421`；`src/host/perf.js` 的符号 `hostSpan`（留）与 `setPerfEnabled` / `perfSnapshot`（删），不要按 `:17-31` 整段删；`fx-pipeline.js:132` | 退役 5 名不出现在 `keys.hostSpans`；保留 4 名；动态步骤走封闭映射；插件不再写 `process.env.DSH_PERF_REVIEW` | `PRE1116-T17` `PRE1116-T18` | `high` |
| P3-07 | Phase 3 | ③ 排空与侧载退役（`11.5` ③，不提前） | `remove` | [DNEE] `routes.js:573-585`（符号 `mode=window` / `takeWindow`）；[DNLS] `routes.js` 的 `endsWith('/perf-report')` 与 `endsWith('/perf-review/host')`（撰写复核时在 `:1169-1178`，**不是** `:1137-1146`）；`dsh-nano-kitesurf/src/client/index.js:36,54-64`；`index.js:328,628`；`lib/diagnostics.js:63` | 本项是 `11.5` ③ 的唯一点：排空删除、[DNEE] justification 改只读、[DNLS] 两分支与账本行删除、[DNK] configure / POST / `perf` 字段 / `PERF_ROUTE` 删除。合并前 main 上看不到半套 | `PRE1116-T19` | `high` |
| P3-08 | Phase 3 | lab 声明驱动与 v2 读者 | `refactor` | `lab/scenarios.mjs:10-18,76-112,199-200`；`lab/run.mjs`；`lab/budgets.mjs`；`lab/diagnose-inp.mjs:87-89`；两份 e2e（§7.1 A-27） | 场景与预算来自声明；页级三场景仍在 lab；读者不再调用 `report()` | `PRE1116-T22` `PRE1116-T12` | `high` |
| P3-09 | Phase 3 | 对照后删除旧 `evaluate`；基线与体积 | `remove` | `lab/budgets.mjs:43`；`lab/baseline/baseline.json` | 同一机器同一组场景，v1 与 v2 各 `--repeats 3`，只比通过/失败 id；不一致则不删旧函数、不合并 | `PRE1116-T23` `PRE1116-T24` | `high` |
| P3-10 | Phase 3 | spec rev5 与事实文档 | `update` | `docs/specs/dsh-nano-performance-review/spec-26nov.md`；DNPR README；`INTRODUCTION.md`；`lab/README.md`；七个在册插件 AGENTS 的本包事实句 | 机制只在 spec；包文档不再写「四个包」「report() 清空窗口」「[DNK] 拥有 `/perf-review/host`」 | `PRE1116-T25` | `medium` |

---

## 4. Phase 业务表格

### 4.1 Phase 1 — W1 · 未使用的观测口

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P1-01 | 事件合同 | a) 在 `contracts` 新增纯模块，导出事件字段闭集、四个 surface 的 outcome 闭集，以及一个无 I/O 的 `assertObserveEvent(event)`。不引入 `node:*` / DOM / store。b) `surface` 只允许 `http` / `upgrade` / `json` / `mcp`。c) 字段只允许 `{surface, id, plugin, outcome, ms, status?, kind?}`；类型层不提供 url / query / body / header / session / message 槽位。d) `json` 的失败类直接引用 `FAILURE_KIND`（`jsonOutcome.js:19-30`），不另造枚举。e) `http` 的 `ok` 在契约注释中写明「只表示 handler 没有 throw，读者必须同时看 status」（`06.7`），报告分维度留到 Phase 3。f) 从 `contracts/index.js` 再导出。g) **依赖方向**：`dsh-interface/package.json` 已经依赖 `dsh-host-route-guard`，route-guard 的 `package.json` 没有反向依赖。`createGuard` 不得 `import` 本模块，否则成环。guard 只组一个普通对象；「这份对象过 `assertObserveEvent`」由 `dsh-interface` 的测试把 guard 夹具送进校验器来锁定，不在 route-guard 里复制第二份闭集。同包的 registrar / json / mcp 可以直接 import 本模块。 | 🆕 `packages/dsh-interface/src/contracts/observeEvent.js`；`src/contracts/index.js:5-29`；`src/contracts/jsonOutcome.js:19-32`；`packages/dsh-interface/package.json`（依赖方向只读，不新增对 route-guard 以外的边）；`packages/dsh-host-route-guard/package.json` | 单测能枚举闭集；多写字段或 outcome 被拒绝；route-guard 源码不出现 `dsh-interface` | `PRE1116-T02` | 闭集测试拒绝未知 surface / outcome；模块源码无 `node:` 导入；route-guard 无新依赖 |
| P1-02 | 四门面注入口 | a) **先写**未注入对照：对现有 `route-guard.test.mjs`、`registrar.test.mjs`、`json-outcome.test.mjs` 与 MCP 调度测试，记录 status、header 列表、原始 body 字符串。b) `createGuard({table, plugin, observe?})`：在 `route-guard.js:223-241` 的四条出口（rejection、405、handler 正常返回、throw→500）**返回前**各同步调用一次；未传 `observe` 时不调用 `performance.now()`、不分配事件对象。c) `createWebRegistrar` 把同一个 `observe` 传给内部 `createGuard`（`:80`），并在 prefix handler（`:86-101`）与 upgrade handler（`:106-116`）用同一出口规则调用；upgrade 的非 GET 走 `method`，拒绝走 `rejected`，握手成功走 `accepted`；SSE/长连接只计到 handler 返回，不包住连接寿命。d) `createJsonClient` 在 `call` 的每个 return 点（`:56-106`）结束时回调；`id` 只取 `operation.bindingId`。没有时事件仍带 `id` 键且值为 `null`，不得省略该键，也不得把 `resolveUrl` 的结果写进 `id`。Phase 3 的 [DNPR] 看到 `id === null` 时不建合同面行，只计 `missingBindingId`。回调若返回永不 resolve 的 Promise，门面也不 `await`，响应仍在同一次调用里写完，且同一出口只回调一次。e) `createMcpToolset` 在 `tools/call` 成功、dispatch 抛错、未知 tool 三条路径的**结束**时回调；`id` 是 schema 方法名；删除调用前的 `onCall?.(...)`（`:72`）归 P1-03，但计时点不要留在 dispatch 之前。f) 回调包在门面自己的 try/catch 里，异常吞掉，响应仍按原路径写完。g) `ms` 用 `globalThis.performance.now()`，不 `import 'node:perf_hooks'`。 | `packages/dsh-host-route-guard/src/route-guard.js:150-277`；`packages/dsh-interface/src/host/createWebRegistrar.js:35-158`；`createJsonClient.js:48-110`；`createMcpToolset.js:30-96` | 不传 `observe` 时四门面响应与改前夹具逐字相同；传入抛错的 `observe` 时响应仍相同；事件里没有 denylist 字段 | `PRE1116-T01` `PRE1116-T02` `PRE1116-T20` | T01 的逐字 diff 为空；T02 覆盖四条 http 出口、upgrade 三态、json 五类+ok、mcp 三态 |
| P1-03 | 退役 onCall 与重建副本 | a) 删除 `onCall` 参数、调用与 JSDoc（`createMcpToolset.js:27-30`），不留 `onCall` → `observe` 的别名。b) 重建**不在** `11.3` 清单上、且源码内联了这些门面的产物：`dsh-nano-terminal/lib/mcp.js`、`dsh-nano-terminal/lib/web-routes.js`、`dsh-nano-notepad/lib/web-registrar.js`、`dsh-nano-explorer-extra/lib/host.js`、`dsh-nano-local-sandbox/lib/route-guard.js`、`dsh-nano-kitesurf/lib/route-guard.js`、`dsh-nano-cloud-session/lib/route-guard.js`，以及内联了 `createJsonClient` 的 [DNEE]/[DNN]/[DNMS] `lib/client.js`。c) [DNMS] `lib/route-guard.js` 在 `11.3` 清单上：清单文件仍脏则**不覆盖**；清单已干净才重建。d) 全仓 `src/` 与上述 `lib/` 中不得再出现把观测器传进门面的生产调用。e) [DNT] `src/host/mcp.js` 若只是不传 `onCall`，保持不传；不要改它的工具审计语义。 | 上列文件；生产调用点见 §7.1 A-23（本阶段只确认它们**尚未**出现 `observe:`） | `onCall` 标识符为 0；`node scripts/test-all.mjs --build` 按 `11.6` 的 W1 口径跑通；没有插件传入 `observe` | `PRE1116-T03` `PRE1116-T04` | grep 门禁 0 命中；T04 证明生产调用点没有 `observe:` |

### 4.2 Phase 2 — W2 · 合同面身份

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P2-01 | 账本字段 | a) 给 `security/route-sensitivity.json` 每一行加上 `id`、`channel`、`match`。初值沿用已经在绑定表里的 `dnee.*` / `dnn.*` / `dnt.*`（`dsh-nano-explorer-extra/lib/bindings.js`、`dsh-nano-notepad/lib/bindings.js`、`dsh-nano-terminal/lib/bindings.js`）；其余插件的名字进命名表，不在本步私下拍板后就烘焙。b) `gen-route-sensitivity.mjs` 今天只保留 sensitivity / capability / sessionBinding / justification（`:6-8`）。把 `id`、`channel`、`match` 并入同一保留集；新路径没有 id 时失败，而不是从 path 后缀推导。c) 覆盖全部 web 面，含 [DNN] `/nano-notepad/fx/sdk`（账本约 `:1062`，prefix）与 [DNT] upgrade/prefix 行（绑定表现状在 `dsh-nano-terminal/lib/bindings.js:6-11`）。d) 不改 path、methods、sensitivity、capability、bodyLimit、sessionBinding 的取值。purpose 文案里的「26 total」「43 total」是过期计数，不是合同，不要拿它当条数断言。 | `security/route-sensitivity.json`；`scripts/gen-route-sensitivity.mjs:1-39`；`scripts/route-scan.mjs:56` 与 `:59`（`:59` 的 `channel !== 'http'` 会丢掉 upgrade，必须改掉，否则 `dnt.stream` 进不了账本）；`scripts/check-route-sensitivity.mjs` | 再跑 gen --write 后，`id`/`channel`/`match` 与审定快照逐条相等，不是被排除在 diff 之外；缺 `id` 时 gen 非 0，且产物里不出现由 path 拼出的 id | `PRE1116-T05` `PRE1116-T27` | 旧字段不漂，三个新字段也不被重写；`route-scan` 实际跑过且 upgrade 行仍在 |
| P2-02 | 命名表抽查闸 | a) 把拟用的 `<缩写>.<面名>` 全表写成 `security/perf-binding-ids.md`，一栏现有 id（若有）、一栏拟用 id、一栏 path。b) 烘焙入口若发现账本 id 与该表不一致，直接失败。c) **停在这里等 [业主] 抽查**。测试变绿只说明机器比对一致，不能代替抽查记录。抽查通过前，P2-03 不得提交烘焙结果。 | 🆕 `security/perf-binding-ids.md`；各包 `scripts/build-client.mjs` 的烘焙入口 | 缺表或 id 不一致时构建失败；抽查记录写在实施日志，不写进测试断言 | `PRE1116-T06` | 负例：改一个 path 后缀但保持 id，烘焙结果 id 不变；负例：删表，构建失败 |
| P2-03 | 统一烘焙 | a) 7 个插件改为调用 `bindingTableModule`（`build/index.js:27-50`，它已经拒绝空 id 与重复 id）。b) 删除 `routeTableModule`（`:52-68`）及其测试引用。c) 退役 [DNEE] 路径推导（`build-client.mjs:25-29` 的 `` dnee${path.slice} ``）。d) [DNN] 与 [DNT] 的手写 `lib/bindings.js` 改为生成物，停止手改。e) 删除仍然存在的 route-table 作者文件与生成物：`dsh-nano-local-sandbox/lib/route-table.js`、`dsh-nano-cloud-session/src/host/route-table.js` 与 `lib/route-table.js`、`dsh-nano-kitesurf/src/host/route-table.js` 与 `lib/route-table.js`、`dsh-nano-model-selector/src/host/route-table.js` 与 `lib/route-table.js`、`dsh-nano-explorer-extra/src/host/route-table.js`。调用点改读 `lib/bindings.js`。[DNN] 今天已经没有 `lib/route-table.js`（`scripts/build-client.mjs` 头注释写明 path-keyed 表已退役）——不得为凑数建回。f) [DNLS] 没有 `scripts/build-client.mjs`，本步补一个**只烘焙绑定表**的脚本，不新增浏览器 client。g) [DNK] 账本行数为 0 是合法状态（`build-client.mjs:14-19`）；`index.js:11,561,677` 对 `ROUTE_TABLE` 的 import、`length >= 15` 自检与 `registerRoutes` 要改成「本包不注册页面路由」，但**不要**在本步动 `setPerfEnabled`（那是 P3-06）。h) [DNMSC] 不建 `lib/bindings.js`，构建脚本不注入。i) 宿主 `lib/bindings.js` 可以含账本行的登记字段。打进**浏览器**产物的常量只有本插件的 `id` 与 `path`（`05.5`）。`bindingTableModule` 的 `LEDGER_FIELDS`（`build/index.js:17-20`）含 justification 等字段，那份全行输出不得原样打进页面包。operation 记录带 `bindingId`。 | 上列构建脚本与 route-table 路径；`packages/dsh-interface/src/build/index.js:27-68`；`dsh-nano-kitesurf/index.js:11,561,677` | 两次烘焙字节相同；id 与命名表一致；`routeTableModule` 标识符为 0；[DNMSC] 无新文件 | `PRE1116-T07` | `check-clean-lib` 与路由逐条对照通过 |
| P2-04 | 记录与说明 | a) `route-guard.js:211-220` 的冻结 `route` 增加 `id`（来自行上的账本 id，不从 path 推导）。`inventory()` 的 JSDoc（`:262-266`）同步。b) registrar 继续用已有 `binding.id`，不另起一套。c) 重新生成 `security/route-inventory.md`。d) 各包 AGENTS 里「路由从哪来」的句子改成指向账本 id；不在本步重写性能机制。 | `packages/dsh-host-route-guard/src/route-guard.js:211-270`；`security/route-inventory.md`；在册插件 AGENTS 的路由来源句 | 生产注册记录的 id 等于账本；说明与生成物一致 | `PRE1116-T08` | inventory 每行有 id；与账本 path 集合相等 |

### 4.3 Phase 3 — W3 · 一次硬切

> 下表的工作内容按 `11.5` 排序。实施时每个编号至少一次提交，但只在 ①–⑦ 全部完成且 `11.7` 通过后才合并这一个 worktree。

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P3-01 | 协议与构建戳 | a) 页面单例与宿主单例改挂带协议主版本的键；实现时把键名定死并写进测试（`AF-10`，示意名不是第二轮裁决）。b) 删除 `ensurePerfReviewHost` 的就地升级分支（`host.js:325-343`）。`:318-321` 的「空则安装」与同协议后到者复用留在新键上，不迁移旧键里的对象。c) 安装时若发现旧键 `window.__perfReview` 或 `globalThis.__perfReviewHost`，只把结构计数 `legacyCopies` +1，不读、不改、不删旧对象。d) 构建戳是 [DNPR] 源码内容哈希，经 esbuild define 注入；哈希范围在测试里锁定「同一源码同一戳」。e) `LIB_VERSION`（`state.js:9`）、`observerVersion`、join/hostJoin 的 `libVersion` 参数删除，不留兼容读取。f) contributors 以 `pluginId@build` 去重（替换 `client.js:528` 与 `host.js:247` 的无界 push）。同协议多于一个构建戳时，`diagnose()` 出一条 audit finding。g) 注入范围只有 `13.2` 的 7 个插件，同一个 W3，不含 [DNMSC]。 | `packages/dsh-performance-review/src/client.js:525-528,602-665`；`src/host.js:240-247,303-345`；`src/state.js:9-10`；七个插件 `scripts/build-client.mjs`（[DNLS] 用 P2-03 新建的那个，只注入宿主侧） | 两个旧键上的对象在 v2 调用后字段不变；contributors 不随重复 join 变长；双构建戳出现 audit，不出现状态搬家 | `PRE1116-T09` `PRE1116-T10` | 负例夹具：旧单例缺 `_state` 时，v2 既不接过它的 Map，也不沿用它的 writer |
| P3-02 | 报告与游标 | a) `REPORT_VERSION` / 顶层改为 `schema: "dnpr.report/2"`，分区按 `08.1`，不在本文再发明字段。b) 用 `read(meta?, {host?})` 替换 `report`（`client.js:602-635`）：不调用今天的 `resetWindow`（`:538-560`），不把 pending 交互强行结算到「现在+60s」以外的破坏性切窗。c) `cutWindow()` 清空窗口累加器（含 usage 窗口列）并前移宿主起点游标；只允许 lab 调用。d) 删除导出 `report`、`reset`、`resetCounters`、`configure`、`setHostSnapshotProvider`（`:638-644`），不留别名。e) 宿主删除 `takeWindow`（`host.js:93-111`）与对外 `setEnabled`。样本带 `seq`；`since` / `epoch` 行为按 `08.7`–`08.8`，容量沿用窗口 512、reservoir 64、事件 32。f) 分位行带 `basis` 与 `n`；合同面 `outcomes` 用 `06.3` 闭集，状态类 `2xx/3xx/4xx/5xx`；`host` 行带 `errors`。g) `evidence` 上限在实现时定死并测试（`AF-10`）；超 256 KB 先裁证据并计 `structure.oversize`。h) 在 `state.js:95-108` 已有的 `rootErrors` / `badNames` / `overflowSpans` / `overflowUsage` / `observerErrors` / `observersMissing` 上**新增** `legacyCopies`、`badShape`、`missingBindingId`、`oversize`、`unmappedKey`。这不是「闭集只剩这 5 个」。`unmappedKey` 不并进 `badShape`（`AF-6`）。`10.4` 只删 `hostWriteErrors`。`pickOwner` 仍写 `rootErrors`（`client.js:160` 一带），不要为了新键把它删掉。i) 同批删除 `diffHostSnapshots`（`aggregate.js:319`）与 `mergeHostSnapshot`（`:281`）。j) 某键的缓冲已经丢掉 `since` 之后的样本时，该键标截断并给出丢失条数，`diagnose()` 出 audit，响应仍是 200（`08.8`）。k) `aggregate.js:239-243` 五条无条件 note 移出报告；`:227-237` 与 `:244-246` 的条件 note 不要一起删。 | `src/client.js:86-91,520-665`；`src/aggregate.js:115-128,143-310`；`src/host.js:54-111,187-198,252-294`；`src/state.js:9-20,95-108,215-239`；`src/markdown.js` | 连续两次 `read()` 深相等；`cutWindow()` 之后窗口列清空但累计列还在；非法游标 400；epoch 不符时 200 且 `truncated` 含 `epoch` | `PRE1116-T11` `PRE1116-T12` `PRE1116-T13` `PRE1116-T21` | 插件 `src/` grep 到 `report(` / `takeWindow(` / `configure(` 即失败 |
| P3-03 | 判定与声明工具 | a) `diagnose(report, {declarations, baseline})` 返回 `{verdict, findings[{id, gate, plugin, subject, value, limit, basis}]}`（`08.5`）。只内置页级中立规则与 `09.4` 的通用红线；不内置插件名。b) `validateDeclaration()` 无 I/O，失败即构建失败。规则闭集只含 `09.3`。c) `test-helpers` 提供三方对账：植入引用的键名常量集合 = 声明键集合；`contract` 里每个 id 存在于该插件绑定表或 MCP schema。d) 浏览器打包入口不得引用 `diagnose.js` 与预算数据。e) 旧 `evaluate`（`lab/budgets.mjs:43`）这个编号**先不删**，留到 P3-09。 | 🆕 `src/diagnose.js`、`src/declaration.js`；`test-helpers/index.mjs`；`lab/budgets.mjs:43,204-252` | 未知规则、插件名泄漏、键集合漂移都失败；浏览器 bundle 源映射里没有 `diagnose` | `PRE1116-T14` `PRE1116-T15` | 用一份不含插件名的页级报告能跑出 hard/audit；用一份带插件预算的声明能跑出插件级 finding |
| P3-04 | 宿主读面 | a) 在 [DNPR] 宿主出口提供只读 handler 与注册片段：`GET /<prefix>/perf-review/host`，只接受 `since`，其他参数包括 `mode` 返回 400。b) 本提交（`11.5` ①）只给 [DNN] 与 [DNMS] 新增账本行并挂上这个 handler。id 形如 `<缩写>.perf-review.host`，capability `read:host`，`sessionBinding: false`。**不要**在这一提交里改 [DNEE] `routes.js:577-584` 的 `takeWindow()`，也不要另增第二条 [DNEE] 路由。排空的删除、justification 改成「只读全进程」、以及「恰好 3 条都不再排空」留到 P3-07（`11.5` ③）。W3 一次合并之后，main 上不会留下半套排空。c) 页面轮询每 5 秒、仅在采集开且页面可见时、同一时刻一个健康入口、失败再切；请求带 `since`，起点随 `cutWindow()` 前移；lab 不依赖轮询（`10.3`）。形状不合格计 `structure.badShape`。无入口时 `meta.host.source = null` 且输出 `note.host-source-absent`。d) 删除写盘：`WRITE_INTERVAL_MS`（`host.js:19`）、`writeFile`（`:131-166`）、`beforeExit`（`:174`）、`flush`、`structure.hostWriteErrors` 及对应测试。跑完夹具不产生 `host.json` / `host-snapshots.jsonl`。 | `src/host.js:19-25,113-176,289-294`；[DNN] `index.js` 注册区（`createWebRegistrar` 在 `:355`）；[DNMS] `index.js:573-580`。本行**不含** [DNEE] `routes.js:573-585` | 两个读者用不同 `since` 互不删样本；无入口时 `meta.host.source = null` 且有 `note.host-source-absent`；写盘夹具不产生 `host.json` | `PRE1116-T13` `PRE1116-T19` | 本提交不要求「恰好 3 条都已不排空」。那条断言属于 P3-07 的 T19 |
| P3-05 | 插件接入 | a) 7 份 `src/perf/declaration.json`。顶层必须有 `09.1` 的 `schema` 与 `plugin`，其余字段只来自 `09.2`，不要把顶层削掉。[DNK] 的 `contract` 是空数组，`keys` 只含页面键与 `kite-warmup`（`13.2`）。[DNT]/[DNLS] 的 `keys` 为空。运行时只烘焙键名常量、目标桶、声明哈希。页面 UI 的 span/track 除 `12.4` 的动态名外不改。b) 统一浏览器 join helper 只替换 4 处：[DNEE]/[DNMS]/[DNN] `src/client/perf.js` 与 [DNK] `src/client/index.js:35-52` 的懒 join。不新建第四份 `perf.js`，也不给 [DNCS] 新加页面 join。c) 6 个合同面插件把适配器传给自己已经在用的门面（`observe` 参数）。[DNT] 与 [DNLS] 只加构建期 [DNPR] 依赖与合同面观测，不加入页面单例，不加手写 span。d) 目标桶由声明登记，删除 `BUCKET_ATTRS`（`client.js:86-91`）和 `targetBucket` 里的插件属性（`state.js:225-236`），共享包只留原生桶。e) 包名映射不再作为合同面身份；`packageNameToPluginId`（`state.js:215-219`）若仍被 LoAF 的 combo 归类使用，只保留 spec §3.1 已有的「不拆 combo」行为，不拿它给合同面建键。 | 三份 `src/client/perf.js`；`dsh-nano-kitesurf/src/client/index.js:35-64`；`createWebRegistrar` / `createJsonClient` / `createGuard` / `createMcpToolset` 的生产调用（§7.1 A-23）；七份 `package.json` 依赖 | 共享包源码 grep 不到插件包名；[DNMSC] 的 `package.json` 无 `dsh-performance-review` | `PRE1116-T16` `PRE1116-T15` | 三方对账对 7 份声明全绿；空 `keys` 的合同面插件没有手写 `span(` / `track(` |
| P3-06 | span 与开关 | a) 按 `12.1` 的规则处置，全集只有这 9 个（`12.2`）：退役 [DNMS] `catalog`（`index.js:176-189`）、[DNN] `read`/`save`（`index.js:290,306`）、[DNEE] `list`（`routes.js:566`）、[DNCS] `sessions`（`index.js:402`）。保留 [DNEE] `git-status`（`:360`）、[DNEE] `stats`（`:303`）、[DNCS] `self`（`index.js:143`）、[DNK] `kite-warmup`（`index.js:436`）。b) 退役名不得写入 `keys.hostSpans`；它们的合同面 id 放进声明 `contract`。c) [DNN] `fx-pipeline.js:132` 的 `` fx-stage-${stage.step} `` 改为声明里的封闭映射；映射没有的步骤不计时，`structure.unmappedKey` +1。d) 删除 `hostSpan` 的 `ctx` / `traceId` / `incidentId`（签名在 `host.js:252`）。`lastTraceId` 的读写在 `host.js:45` 与 `:221`（`recordSpan` 约 `:230`），一并删除，不要只删签名。以及 [DNK] `traced` 里的 `incidentId` 传递与 `perfCount('route-err-*'|'route-slow-*')`（`index.js:318-352`）。[DNK] 自己的 incident 环与 operations 缓冲保留。e) `src/host/perf.js` 不整文件删：按符号留下 `hostSpan` 给 `kite-warmup`，删除 `setPerfEnabled` 与 `perfSnapshot`。不要按 `:17-31` 整段删，那会把要留的 `hostSpan` 一起删掉。三个运维入口（环境变量、`?perf-review=1`、`localStorage['dsh-perf-review']='1'`）在删除 `setEnabled` 之后仍能单独打开采集。f) 采集开关只认 `DSH_PERF_REVIEW=1`、`?perf-review=1`、`localStorage['dsh-perf-review']='1'`。删除 [DNK] `perfReview` 配置、`index.js:420-421` 对 `process.env` 的改写、`setEnabled` 导出。 | 上列调用点；`packages/dsh-performance-review/src/host.js:252-286`；`dsh-nano-kitesurf/AGENTS.md`「配置与状态」里的 `perfReview` 示例 | catalog 的 catch→500 只出现在合同面 `status` 的 5xx，不再要求手写 span 的 `err`；默认 `apply()` 后宿主采集仍是关的，且不写环境变量 | `PRE1116-T17` `PRE1116-T18` | 源码搜索退役的 5 个 span 名在 `src/` 为 0；`process.env.DSH_PERF_REVIEW =` 在插件 `src/` 与 `index.js` 为 0 |
| P3-07 | 退役侧载与第二读面 | a) 本项才是 `11.5` ③，不要在 P3-04 提前做。删除 [DNLS] 里 `endsWith('/perf-report')` 与 `endsWith('/perf-review/host')` 两个分支。撰写复核时它们在 `dsh-nano-local-sandbox/src/host/routes.js:1169-1178`；`:1137-1146` 已经是健康快照与 `/network` 的开头，**按旧行号删会删错**。文件头常量仍是 `:8-9`。同时删账本里这两条 path。把 [DNEE] `routes.js:577-584` 的 `mode=window` / `takeWindow()` 换成 P3-04 的只读 handler，更新既有账本行的 justification，不另增第二行。b) 删除 [DNK] `configure({ hostSnapshotUrl })`（`src/client/index.js:36`）与 10 秒 `report()`+POST（`:54-64`）。c) 删除 `buildDiagnostics()` 的 `perf` 字段（`index.js:628`）与 `traced` 里对未定义 `PERF_ROUTE` 的比较（`:328`）。d) 删除 `lib/diagnostics.js:63` 把 `mode=window` 说成 [DNK] 路由的目录项。e) [DNMS]/[DNN] `src/client/perf.js` 里「[DNEE] 负责轮询」的注释与单源假设，随 P3-05 的多源接入一起删除。 | 上列路径；`dsh-nano-kitesurf/lib/diagnostics.js:63`；`dsh-nano-local-sandbox/test/deferrals.test.mjs:17` 中的 `nxe:perf-review-window-drain` 若仍把排空当现行发现，改为「只读全进程」或删除过期断言 | 全仓 `src/` 不再 POST `/perf-report`；账本没有 [DNLS] 这两条 | `PRE1116-T19` | 路由对照：删除的是这两条，其他 [DNLS] 路由的方法与敏感度不动 |
| P3-08 | lab 读者 | a) `SCENARIOS`（`lab/scenarios.mjs:10-18`）去掉 `shared-open`；页级 `idle-10s` / `composer-type` / `observer-purity` 留在 lab；插件场景改从声明的 `driver` 加载。b) `lab/budgets.mjs`、`scenarios.mjs`、`run.mjs` 源码中的插件名与轨道名清零（`09.8`）。c) `diagnose-inp.mjs:87-89`、`lab/candidates.mjs:23-40`（它读 v1 `plugin.hostSpan`）与两份 e2e（`dsh-nano-kitesurf/scripts/e2e-ego.mjs:392`、`dsh-nano-local-sandbox/scripts/e2e-ego.mjs:407`）改为读 v2 的 `host` 行与 `read()`。`lab/diagnose-render.mjs` 不读 `__perfReview` 或 `plugin.hostSpan`，本步不改它。d) lab 开始时 `cutWindow()` 并记下宿主 `next`，结束时 `?since=` 再交给 `read()`。页级 `idle-10s`、`composer-type`、`observer-purity` 必须留在 `SCENARIOS` 源码数组里。 | `lab/*.mjs`；两份 `scripts/e2e-ego.mjs` | `--scenario all` 不含 `shared-open`；e2e 不再依赖破坏性读 | `PRE1116-T22` `PRE1116-T12` | grep lab 与 e2e 的 `.__perfReview.report` 为 0 |
| P3-09 | 对照、删旧判定、重录 | 本项是两次提交，不要并成一次。提交 ⑤：a) 在删除 `evaluate` **之前**，同一机器、同一组场景，v1 产物与 v2 产物各 `--repeats 3`。按「旧规则 → 新规则 id」比通过/失败，不比毫秒数（`11.7`）。b) 不一致则停止，不合并，也不进入提交 ⑥。一致则把结果表留到实施记录，再删 `evaluate`。提交 ⑥：c) 基线按三次稳定性运行重录 `lab/baseline/baseline.json`。三次 argv 都必须是全场景 `--repeats 3`，不能用三次 purity 顶替。d) `--measure-footprint` 量化 `nanoCombined.clientJsBytes`，硬门禁仍是 `≤ baseline × 1.1`（`09.6`），不新增门禁。e) `--arm purity` 退出码 0；`--inject-delay` 与 `--inject-failure` 各自退出码 1 **并且** stdout 含各自的 subject。 | `lab/budgets.mjs:43`；`lab/baseline/baseline.json`；`lab/run.mjs` | 对照表存在且无不一致行；旧 `evaluate` 标识符在删除步骤之后才为 0 | `PRE1116-T23` `PRE1116-T24` | 缺对照表时禁止删除 `evaluate` 的提交进入合并分支 |
| P3-10 | 文档 | a) `spec-26nov.md` 原地升 rev5：§6.5 换 v2，§6.7 与 §7 改为指向各插件声明，写入 `12.1` 的判定规则与 `13.4` 的非目标。b) DNPR README、`INTRODUCTION.md`、`lab/README.md` 删除与 spec 重复的机制句。c) 各包 AGENTS 只改本包事实：谁依赖 [DNPR]、谁挂读取路由、[DNK] 删除 `perfReview` 配置段、[DNT]/[DNLS] 写上新的构建期依赖。[DNK] AGENTS 今天的使用表把 `GET/POST /perf-review/host` 与 `mode=window` 写成了本包路由（与 `index.js`「不注册页面路由」和 `10.5` 冲突）——改成不拥有这些路由。d) 不改 `RELEASE.md`。 | `docs/specs/dsh-nano-performance-review/spec-26nov.md`；各 README；七个插件 `AGENTS.md` 的事实句 | 文档搜索不再把 `report()` 清空窗口或 [DNK] 拥有 perf 路由写成现行事实 | `PRE1116-T25` | 抽查清单里的过期句为 0；spec 的非目标节能对上 `13.4` 的四项 |

---

## 5. Phase 详情

### 5.1 Phase 1 — W1 · `pre1116-facade-observe`

- **Phase 目标**：落地 `06`，且生产路径上零观测器。
- **本 Phase 对应编号**：`P1-01` / `P1-02` / `P1-03`
- **本 Phase 新增文件**：`packages/dsh-interface/src/contracts/observeEvent.js`；对应单测放在 `packages/dsh-interface/test/` 与 `packages/dsh-host-route-guard/test/` 的现有文件旁，不新建第二套测试运行器。
- **本 Phase 修改文件**：`packages/dsh-interface/src/contracts/index.js`；`packages/dsh-interface/src/host/createWebRegistrar.js`；`createJsonClient.js`；`createMcpToolset.js`；`packages/dsh-host-route-guard/src/route-guard.js`；§4.1 P1-03 列出的 `lib/` 副本。
- **本 Phase 删除文件**：无整文件删除。删除的是 `onCall` 参数与调用。
- **本 Phase 明确不改**：`security/route-sensitivity.json`、任何插件的 `observe:` 生产注入、[DNPR] 报告 schema、`11.3` 清单上仍脏的文件。guard 冻结记录的 `id` 字段留到 Phase 2（`05.4` 不属于 W1）。W1 的测试夹具可以自带 `id`，生产账本还不带。
- **具体功能预期**：
  1. 不传 `observe` 时，http exact 的 rejection / 405 / 200 / 500、prefix 的同样四态、upgrade 的 accepted / rejected / method、json 的 ok 与五类失败、mcp 的 ok / error / rejected，其 status、header、原始 body 与改前逐字相同。
  2. 不传 `observe` 时，`performance.now` 的调用次数不因这次改动增加。
  3. 传入的 `observe` 在每次调用结束时同步收到至多一次事件；门面不 `await` 它。
  4. `observe` 抛错时，响应与不抛错时逐字相同。
  5. 事件对象的键集是 `{surface, id, plugin, outcome, ms}` 加上可选 `status` / `kind`。即使用户 handler 的 Error message 里含有路径或 token，事件里也不出现该字符串。
  6. `onCall` 在 `packages/dsh-interface/src` 与 `dsh-nano-terminal/lib/mcp.js` 中为 0，且没有 `observe` 的别名参数。
  7. 全仓生产调用（不含测试夹具）没有 `observe:`。因此本阶段不会产生带 id 的生产事件（`11.2`）。
- **对应测试台账项**：`PRE1116-T01` / `T02` / `T03` / `T04` / `T20`（T20 的攻击向量在本阶段先锁门面；宿主读路由的部分在 Phase 3 补跑）
- **收口标准**：`11.6` 的 W1 口径——`dsh-interface` 与 `dsh-host-route-guard` 单测，加 `node scripts/test-all.mjs --build`。
- **本 Phase 风险提醒**：内联进 `lib/*.js` 的旧门面若漏重建，源码测试是绿的、运行中的宿主仍是旧副本。T03 必须扫 `lib/`，不能只扫 `packages/`。

### 5.2 Phase 2 — W2 · `pre1116-binding-ids`

- **Phase 目标**：落地 `05`，路由的方法与敏感度一条不漂。
- **本 Phase 对应编号**：`P2-01` / `P2-02` / `P2-03` / `P2-04`
- **本 Phase 新增文件**：`security/perf-binding-ids.md`；`dsh-nano-local-sandbox/scripts/build-client.mjs`（只烘焙绑定表）。
- **本 Phase 修改文件**：`security/route-sensitivity.json`；`scripts/gen-route-sensitivity.mjs`；`scripts/route-scan.mjs`；`packages/dsh-interface/src/build/index.js`；`packages/dsh-host-route-guard/src/route-guard.js`；七个插件的构建脚本与 `lib/bindings.js`；`dsh-nano-kitesurf/index.js` 里与 `ROUTE_TABLE` 相关的行（不动 `setPerfEnabled`）。
- **本 Phase 删除文件**：`routeTableModule` 所在导出；§4.2 列出的现存 `route-table.js`。不删除 [DNN] 已经不存在的文件。
- **具体功能预期**：
  1. 改动前后，账本 path 集合、每条的 methods、sensitivity、capability、bodyLimit、sessionBinding 逐字段相等。
  2. 每条都有非空 `id`，且与命名表一致；id 字符形态在实现时定死并测试（`05.7` 的正则是示意，`AF-10`）。
  3. 把某条的 path 改掉、id 不变，烘焙产物的 id 仍然是旧 id。从 path 推导 id 的 [DNEE] 代码不复存在。
  4. `bindingTableModule` 对同一输入两次输出字节相同；缺 id 或重复 id 抛错。
  5. guard `inventory()` 的 `id` 等于表行 `id`。两条注册路径都会把这个 id 放进以后的观测事件，但本阶段生产代码仍不传 `observe`。
  6. [DNMSC] 目录下没有新建的 `lib/bindings.js` 或 `src/perf/`。
  7. [DNLS] 能从账本烘焙出带 id 的绑定表，同时仍然没有浏览器 client。
- **对应测试台账项**：`PRE1116-T05` / `T06` / `T07` / `T08`
- **收口标准**：`11.6` 的 W2 口径——`gen-route-sensitivity`、`check-route-sensitivity`、`route-scan`、`check-clean-lib`、路由逐条对照、`test-all --build`。另加一条人工闸：命名表抽查记录。没有抽查记录不得合并。
- **本 Phase 风险提醒**：`11.3` 的六文件（`security/route-sensitivity.json`、`scripts/route-scan.mjs`、[DNMS] `index.js`、`lib/route-guard.js`、`lib/route-table.js`、`src/host/route-table.js`）正是本阶段要碰的对象。撰写时（`e228445`）这六条路径相对 HEAD 没有未提交 diff——这只是当时的测量，不是闸门已通过。执行前必须再查；仍脏则本 Phase 不得开工。

### 5.3 Phase 3 — W3 · `pre1116-dnpr-v2`

- **Phase 目标**：一次合并落地 `07`–`10`、`12`、`13`。
- **本 Phase 对应编号**：`P3-01` … `P3-10`（提交顺序不可交换到「先删 evaluate」）
- **本 Phase 新增文件**：`packages/dsh-performance-review/src/diagnose.js`、`src/declaration.js`；七份 `src/perf/declaration.json` 与对应驱动模块；DNPR 宿主出口的只读 handler（放在包内，由三插件注册，不在每个插件复制一份实现）。
- **本 Phase 修改文件**：§4.3 表内全部路径；七个插件的 `lib/` 由各自构建脚本重生。
- **本 Phase 删除文件**：三份 `src/client/perf.js`（由 helper 取代，不留空壳）；[DNLS] 两条 perf 路由的实现与账本行；写盘器相关测试夹具。`dsh-nano-kitesurf/src/host/perf.js` **不**整文件删除（`AF-9`）。
- **具体功能预期**：
  1. v2 代码不读取、不修改、不升级 `window.__perfReview` 与 `globalThis.__perfReviewHost`。旧键仍在时，`structure.legacyCopies >= 1`，且旧对象的字段快照不变。
  2. `read()` 调用两次，窗口内样本、usage 窗口列、宿主 `seq` 都不动。`cutWindow()` 之后窗口列空、累计列仍可读，宿主下一次 `since` 从新起点开始。
  3. 插件源码出现 `cutWindow` 或已退役动词，测试失败。lab 是唯一允许的调用方。
  4. 合同面行与手写 span 不共用 32 键配额；点分 id 能作为合同面键；手写名仍然受 `NAME_RE`（`state.js:13`）约束。
  5. 形状不合格的宿主响应不进入插件行，只增加 `structure.badShape`。缺 `bindingId` 的浏览器 operation 不按 URL 建键，只增加 `missingBindingId`。
  6. 保留的 4 个 hostSpan 出现在对应声明的 `keys.hostSpans`；退役的 5 个不出现。 [DNMS] catalog 内部 catch 后仍返回 500，合同面行的状态类记 5xx，手写 `catalog` span 不存在。
  7. 默认启动不把 `DSH_PERF_REVIEW` 写成 `1`。只有运维入口能打开采集。
  8. 读取路由恰好 3 条，都是 GET、`read:host`、不绑 session。`mode=window` 返回 400，宿主样本数不变。
  9. `diagnose()` 不在浏览器产物里。页级规则不点名插件。`lab/budgets.mjs` 在 P3-09 之后只剩退出码与 I/O，阈值来自声明与页级规则。
  10. `11.7` 对照不一致时，旧 `evaluate` 还在，基线文件不被 v2 覆盖，worktree 不合并。
  11. [DNMSC] 的依赖、声明、绑定表、构建戳都不变。
  12. 计量夹具（归并、三段、并集、`pickOwner`）在外壳换成 `read()` 之后仍得到与冻结向量相同的归属结果（`B02`）。
- **对应测试台账项**：`PRE1116-T09`–`T26`
- **收口标准**：`11.6` 的 W3 口径，外加 `11.7` 对照表。本机真实页面读一次 v2 报告是 `PRE1116-T26`，在没有 ImplementationGrant 时保持 `未观察`，不得用单测代替。
- **本 Phase 风险提醒**：W3 同时改账本、七个插件和 lab。漏掉一个 v1 读者（e2e、`diagnose-inp.mjs`、插件测试里的 `report()`）会在合并后才爆。T12 的 grep 范围必须包含 `lab/`、`scripts/e2e-ego.mjs` 与各包 `src/`，不能只扫 [DNPR]。

---

## 6. 依赖的冻结设计决策（只读引用）

| 决策 / Q ID | 冻结来源 | 本计划中的影响 | 若不成立的处理 |
|-------------|---------|----------------|----------------|
| `T-O-PRE1116-B01`–`B11` | truth §2.1 | 阶段名、计量不重写、五原则、注入边界、非目标、D1–D9 不再复议、侧载只退役 | 与本文冲突时以台账为准并停在 `draft` |
| `T-O-PRE1116-01` / `06` | Q1-B / Q6-B | Phase 1 的唯一产品改动 | 不得改成运行时旁观或门面内建 [DNPR] |
| `T-O-PRE1116-02` / `08` | Q2-B / Q8-B | Phase 3 报告与动词；取消初评 P0-09 | 不得留 v1 分支或 `peek` 别名 |
| `T-O-PRE1116-03` / `10` | Q3-B / Q10-B | 3 个读入口、游标、写盘器退役、[DNK] 不挂路由 | 不得做第 4 入口或继续排空 |
| `T-O-PRE1116-04` / `09` | Q4-B / Q9-B | 声明作者与 lab 生成 | 不得把插件名写回 [DNPR] 或 lab |
| `T-O-PRE1116-05` | Q5-B | Phase 2；`AF-4` 的 7 插件外延 | 未抽查不得烘焙 |
| `T-O-PRE1116-07` | Q7-B | 协议键与构建戳；`AF-3` 不含 [DNMSC] | 不得就地升级旧单例 |
| `T-O-PRE1116-11` | Q11-B | 三 worktree、顺序、`11.3` 脏文件、`11.6` 验收、`11.7` 对照、`11.8` 不授权 | 不得并行合并 W3，不得把本文当 grant |
| `T-O-PRE1116-12` | Q12-B | 9 个 span 的全集与开关退役 | 不得再开一轮挑选「要不要双写 catalog」 |
| `T-O-PRE1116-13` | Q13-B | 6+1 声明、3 入口、四项非目标、文档落点、数量词外延 | 不得把「约 6 个入口」或「8 个插件含 [DNMSC]」写回实施范围 |
| `AF-1`–`AF-13` | truth §4.4 | 留口关闭、行号收窄、§1 含内核 | 不得按旧行「留给 executional」把已关闭项当成 OPEN |

---

## 7. 内置 Reference-Anchor 锚区

### 7.0 快照

- 问答基线 `77955e5`；初稿锚点 `e228445`。审查回写时工作区 `HEAD dd3c696`，`e228445` 仍是其祖先。被点名的代码文件里，相对 `e228445` 只有 `dsh-nano-local-sandbox/src/host/routes.js` 有 diff。其余符号行号仍对（`createGuard` `:150`、handler `:223-241`、`ensurePerfReviewHost` `:315-345`、`NAME_RE` `state.js:13`、`BUCKET_ATTRS` `client.js:86-91`）。[DNLS] 的两个 perf 分支以符号 `endsWith('/perf-report')` / `endsWith('/perf-review/host')` 为准，回写时在 `:1169-1178`，不要再用 `:1137-1146`。
- `AF-12` 的收窄继续有效：最深者胜是 `pickOwner`（`client.js:152-184`），不是 `:104` 起的全部函数；就地升级退役范围是 `host.js:325-343`，不是 `:318-321` 与 `:344`。
- 账本 purpose 字符串里的路由总数（`route-sensitivity.json:3` 的「26 total」，`gen-route-sensitivity.mjs:36` 的「43 total」）与当前 `routes[]` 长度不一致。那是过期说明，不是 `11.4` 的对照基准。对照基准是**改动前文件的逐条 path/methods/sensitivity**。

### 7.1 锚表

| 锚 ID | `path:line` | 落点 | 本 AP 用途 | 处置 | 备注 |
|-------|-------------|------|------------|------|------|
| A-1 | `packages/dsh-interface/src/contracts/jsonOutcome.js:19-32` | 五类失败 | P1-01 的 `json` outcome | `✅ 复用` | 不另造枚举（`B05`） |
| A-2 | `packages/dsh-interface/src/contracts/index.js:1-29` | contracts 出口 | P1-01 再导出 | `✅ 复用` | 保持无 `node:*` |
| A-3 | `packages/dsh-interface/src/contracts/FamilyDefinition.js:20-24` | 身份不从 path 推断；作者源只转移一次 | P2 的 id 纪律；`05.8` 只 CITE | `✅ 复用` | 本 AP 不迁移合同族 |
| A-4 | `packages/dsh-host-route-guard/src/route-guard.js:150-241` | 注册与四条出口 | P1-02 插入 `observe`；P2-04 给 `:211-220` 加 `id` | `✅ 复用` | 未传 observe 时这 90 行的对外响应不变 |
| A-5 | `packages/dsh-interface/src/host/createWebRegistrar.js:35-158` | prefix `:86-103`、upgrade `:104-118`、内部 guard `:80` | P1-02 透传 `observe` | `✅ 复用` | http+exact 不复制第二套包装 |
| A-6 | `packages/dsh-interface/src/host/createJsonClient.js:48-107` | `call` 的全部分支 | P1-02 | `✅ 复用` | 禁止用 URL 当 id |
| A-7 | `packages/dsh-interface/src/host/createMcpToolset.js:27-72` | `onCall` 在 dispatch 之前 | P1-03 删除；结束回调归 P1-02 | `♻️ 重 substrate` | 不留别名 |
| A-8 | `dsh-nano-terminal/lib/mcp.js:29,72` | `onCall` 的内联副本 | P1-03 重建 | `♻️ 重 substrate` | 不在 `11.3` 清单上 |
| A-9 | `packages/dsh-interface/src/build/index.js:27-68` | `bindingTableModule` / `routeTableModule` | P2-03：留前者，删后者 | `♻️ 重 substrate` | 前者已强制稳定 id |
| A-10 | `scripts/gen-route-sensitivity.mjs:6-8` | 人工字段合并保留 | P2-01 把 id/channel/match 并入保留集 | `✅ 复用` | 机制沿用，不新写一套合并器 |
| A-11 | `dsh-nano-explorer-extra/scripts/build-client.mjs:25-29` | 从 path 推导 `dnee.*` | P2-03 退役 | `⛔ 别碰式删除` | 初值抄现有 id，之后以账本为准 |
| A-12 | `dsh-nano-notepad/lib/bindings.js:6-19`；`dsh-nano-terminal/lib/bindings.js:6-11` | 手写绑定表 | P2-03 改为生成物 | `♻️ 重 substrate` | 初值沿用这些 id |
| A-13 | `dsh-nano-notepad/scripts/build-client.mjs:9` | 已声明 path-keyed ROUTE_TABLE 退役 | P2-03 的反例 | `✅ 复用` | 不要建回 `lib/route-table.js` |
| A-14 | 现存 route-table：`dsh-nano-local-sandbox/lib/route-table.js`；`dsh-nano-cloud-session/src/host/route-table.js` 与 `lib/route-table.js`；`dsh-nano-kitesurf/src/host/route-table.js` 与 `lib/route-table.js`；`dsh-nano-model-selector/src/host/route-table.js` 与 `lib/route-table.js`；`dsh-nano-explorer-extra/src/host/route-table.js` | 第二作者 | P2-03 删除 | `⛔ 退役` | [DNK] 的表今天是空数组（`src/host/route-table.js:4`），空也要退役 |
| A-15 | `packages/dsh-performance-review/src/client.js:152-184` | `pickOwner` | P3 回归，不改算法 | `✅ 复用` | `B02` / `AF-12` |
| A-16 | `packages/dsh-performance-review/src/client.js:246-269` 与 `aggregate.js:51-100` | 归并与区间并集 | 同上 | `✅ 复用` | 外壳改动词时保住向量 |
| A-17 | `packages/dsh-performance-review/src/client.js:86-91,528,538-665` | 桶、contributors、reset、configure、report、旧键 | P3-01/P3-02/P3-05 | `♻️ 重 substrate` | `report` 不留别名 |
| A-18 | `packages/dsh-performance-review/src/host.js:19,93-176,252-345` | 写盘、takeWindow、traceId、升级分支 | P3-01/P3-02/P3-04/P3-06 | `♻️ 重 substrate` | `:325-343` 整段退役 |
| A-19 | `packages/dsh-performance-review/src/state.js:9-20,215-239` | 版本、NAME_RE、配额、targetBucket | P3-02/P3-05 | `♻️ 重 substrate` | 合同面键与 `NAME_RE` 分开 |
| A-20 | `packages/dsh-performance-review/src/aggregate.js:227-243,281-310,319` | 无条件 notes、`mergeHostSnapshot`、`diffHostSnapshots` | P3-02 | `♻️ 重 substrate` | `:239-243` 改条件触发；`:227-237` 与 `:244-246` 保留；`:319` 的 v1 diff 同批删除 |
| A-21 | `lab/budgets.mjs:43,204-252`；`lab/scenarios.mjs:10-18` | 旧判定与写死场景 | P3-08/P3-09 | `♻️ 重 substrate` | `evaluate` 最后才删 |
| A-22 | 读路由现状：`dsh-nano-explorer-extra/src/host/routes.js:573-585`（唯一已有来源，但是排空）；[DNN] `index.js:355` 与 [DNMS] `index.js:573-580` 尚无这条路由 | P3-04 只挂 [DNN]/[DNMS]；[DNEE] 排空留到 P3-07 | `♻️ 重 substrate` | 实现只有一份，在 [DNPR]。不要在 ① 改 [DNEE] 这 13 行 |
| A-23 | 门面生产调用：`dsh-nano-explorer-extra/src/host/routes.js:651`；`dsh-nano-notepad/index.js:355`；`dsh-nano-terminal/src/host/web-routes.js:198`；`dsh-nano-explorer-extra/src/client/jsonClient.js:13`；`dsh-nano-notepad/src/client/jsonClient.js:4`；`dsh-nano-model-selector/src/client/jsonClient.js:8`；[DNLS]/[DNCS]/[DNK]/[DNMS] 的 `registerRoutes` / `createGuard` | P1 确认无人传 `observe`；P3-05 才注入 | `✅ 复用` | W1 不改这些调用的参数 |
| A-24 | 9 个 hostSpan：`dsh-nano-model-selector/index.js:176`；`dsh-nano-notepad/index.js:290,306`；`dsh-nano-explorer-extra/src/host/routes.js:303,360,566`；`dsh-nano-cloud-session/index.js:143,402`；`dsh-nano-kitesurf/index.js:436` | P3-06 全集 | `♻️ 重 substrate` | 不是「当时点名的 3 个」 |
| A-25 | `dsh-nano-notepad/src/client/fx-pipeline.js:132` | 动态 `` fx-stage-${step} `` | P3-06 封闭映射 | `♻️ 重 substrate` | 未映射 → `unmappedKey` |
| A-26 | `dsh-nano-kitesurf/src/client/index.js:36-64`；`dsh-nano-kitesurf/index.js:304-353,416-421,628`；`src/host/perf.js` 的 `setPerfEnabled` / `perfSnapshot`（`hostSpan` 留下）；`lib/diagnostics.js:63` | D1/D2/侧载/未定义 `PERF_ROUTE` | P3-06/P3-07 | `⛔ 退役` | 不要按 `:17-31` 整段删。`PERF_ROUTE` 无定义，只删比较分支 |
| A-27 | `dsh-nano-local-sandbox/src/host/routes.js:8-9` 与 `endsWith('/perf-report'|'perf-review/host')`（回写时 `:1169-1178`）；`scripts/e2e-ego.mjs:407-408`；`dsh-nano-kitesurf/scripts/e2e-ego.mjs:392-393`；`lab/candidates.mjs:23-40` | 第二读面、v1 `plugin.hostSpan` 读者、依赖 `report()` 的 e2e | P3-07/P3-08 | `⛔ 退役` | 不要按 `:1137-1146` 删。e2e 改 `read()`。`lab/diagnose-render.mjs` 不读 DNPR，不改 |
| A-28 | `packages/dsh-performance-review/test/validity.test.mjs` 与 `test/client.test.mjs`、`test/host.test.mjs` | 63 条计量锁的载体 | P3 改动词后重放向量 | `🔱 fork` | 不许为了绿灯删断言 |
| A-29 | 🆕 `packages/dsh-interface/src/contracts/observeEvent.js`；🆕 `packages/dsh-performance-review/src/diagnose.js`；🆕 `src/declaration.js`；🆕 七份 `src/perf/declaration.json` | 本 AP 新建点 | P1-01 / P3-03 / P3-05 | `🆕 净新` | 声明不进浏览器产物 |

### 7.2 反例 ledger ⛔

| ⛔ | 反例 / 陷阱 | 为什么 |
|----|-------------|--------|
| ⛔1 | 按初评 P0 先做 `peek()`、保留 `report()`、给 v1 加 errors 字段 | `02.6` / `08.6` 已取消这条路径 |
| ⛔2 | W1 就给生产路由注入 `observe`，或在 W2 之前发带 id 的生产事件 | `11.1` / `11.2` |
| ⛔3 | 从 URL、path 后缀或工具名文本生成合同面 id | `01.3` / `05` / `FamilyDefinition.js:20-21` |
| ⛔4 | 命名表没经 [业主] 抽查就提交烘焙产物 | `05.2` / `AF-10`。测试绿 ≠ 抽查完成 |
| ⛔5 | 给 [DNMSC] 加依赖、声明、空 `lib/bindings.js` 或构建戳 | `13.2` / `AF-3` / `AF-4` |
| ⛔6 | 新建第四份 `perf.js`，或给 [DNCS] 补一套页面 join | `13.6` / `AF-2`。页面 helper 只替换现有 4 处 |
| ⛔7 | 让 [DNK] 挂第 4 条宿主读路由，或保留 [DNLS] 的 perf 路由做兼容 | `10.5` / `13.3` / `B11` |
| ⛔8 | `onCall` 留别名；`report` / `takeWindow` / `setEnabled` / `configure` 留别名 | `06.6` / `08.6` / `12.6` |
| ⛔9 | 就地升级旧 `__perfReviewHost` 并沿用旧 writer | `07.3` 退役 `:325-343`；这正是 D8 |
| ⛔10 | 手写 span 与合同面行双写 `catalog` / `read` / `save` / `list` / `sessions` | `12.2` |
| ⛔11 | 整文件删除 `dsh-nano-kitesurf/src/host/perf.js` | `AF-9`：`hostSpan` 留下承接 `kite-warmup` |
| ⛔12 | 门面 `import` [DNPR]，或 [DNPR] 定义 outcome 闭集；route-guard `import` `dsh-interface` | `B04` / `06.1`。闭集作者在 contracts，但 `dsh-interface` 已经依赖 route-guard（`packages/dsh-interface/package.json`），反向 import 会成环。guard 组普通对象，由 interface 测试调用 `assertObserveEvent` 锁定同一份闭集 |
| ⛔13 | 把 `diagnose` 或预算表打进浏览器产物 | `08.5` / `09.5` |
| ⛔14 | `11.7` 用毫秒数相等当作通过；或没跑 v1 对照就删 `evaluate` | `11.7` |
| ⛔15 | 覆盖 `11.3` 清单上 [业主] 尚未提交的文件 | `11.3` |
| ⛔16 | 把本 AP 或 W1–W3 的合并当成已授权 | `11.8` |
| ⛔17 | 新增 soak / release-gate，或改 `RELEASE.md` | `11.6` / 仓根「不得过度仪式」 |
| ⛔18 | 观测事件携带 URL、正文、header、session id、错误消息 | `06.2` / `B07` |
| ⛔19 | 插件代码写 `process.env.DSH_PERF_REVIEW` | `12.6`。现状违例在 `dsh-nano-kitesurf/index.js:421` |

### 7.3 上游真源指针 + 安全项威胁模型

- **独立 reference-anchor**：无。§7 是本 AP 的 grounding 真源。
- **上游只消费、不回改**：CF1115 问答关于「不把性能库并进门面 / host 出口不持跨实例全局态」的边界；`FAILURE_KIND`；[DNMSC] 账本唯一写入方。见 truth §4.3。
- **信任边界（没有单独的威胁模型文件；下列条款就是边界，测试必须打到，不得只跑 happy path）**：
  1. **回调不得改写响应，也不得成为第二条鉴权。** 观测包在既有 rejection / 405 / 500 之后，异常被吞（`01.2` / `06.4`）。落点 A-4 / A-5。测试 `PRE1116-T01` `PRE1116-T20`。
  2. **事件不是日志通道。** 禁止 URL、query、正文、header、session id、错误文本（`06.2` / `B07`）。测试 `PRE1116-T02` `PRE1116-T20`：handler 抛出含假 token 的 Error，断言事件 JSON 不含该子串。
  3. **宿主读路由是跨插件的进程内计时视图，不是内容视图。** capability `read:host`、不绑 session（`10.1` / `03.6`）。它替换今天的「排空全进程」（`routes.js:581-582`），不得继续提供排空。证据区不得出现按键内容、路径、session id（`B07`）。测试 `PRE1116-T13` `PRE1116-T19` `PRE1116-T20`。
  4. **插件不得替整个宿主打开采集。** `12.6`。测试 `PRE1116-T18`。
  5. **插件间不得再有性能专有通道。** `B11`。测试 `PRE1116-T19`。
  6. **一个读者不能毁掉另一个读者的窗口。** 游标取代 `takeWindow`（`03.4` / `08.8`）。测试 `PRE1116-T13`。

---

## 8. 测试台账

> 全部 Test-ID 在本文撰写时都是**未执行**。下表「PASS 证据」列写的是执行期必须留下的四元组形状，不是已经发生的 PASS。收口状态见 §10，一律 `未观察`。

### 8.1 测试清单（主表）

| Test-ID | 测试项 | 类型 | 层 | 来源 | 映射 | PASS 证据（四元组形状） |
|---------|--------|------|----|------|------|-------------------------|
| `PRE1116-T01` | 未注入 `observe` 时四门面响应逐字一致，且不读时钟 | `短途` | `契约` | `🔱 fork` `route-guard.test.mjs`、`registrar.test.mjs`、`json-outcome.test.mjs` + 新增逐字与 `performance.now` 断言 | P1-02 → 未注入行为不变 | `commit + 测试名 + 逐字 diff 空 + UTC` |
| `PRE1116-T02` | 事件闭集、四出口、异常被吞、denylist 字段不存在 | `短途` | `unit` | `🆕` `packages/dsh-interface/test/observe-event.test.mjs` 与 guard/registrar/json/mcp 的 observe 用例 | P1-01/P1-02 → 事件合同可执行 | `commit + 用例名 + UTC` |
| `PRE1116-T03` | `onCall` 在 src 与指定 lib 副本中为 0，无别名 | `短途` | `契约` | `🆕` 脚本断言（可放在 interface 测试内，用 `fs` 读源码） | P1-03 → 退役无残留 | `commit + grep 0 命中 + UTC` |
| `PRE1116-T04` | 生产代码没有 `observe:`；W1 的 `test-all --build` | `短途` | `回归` | `♻️` `node scripts/test-all.mjs --build` + `🆕` 生产调用 grep | P1-03 → 运行中插件行为不变 | `commit + test-all 退出码 0 + grep 0 + UTC` |
| `PRE1116-T05` | 账本旧字段逐条不变；`id`/`channel`/`match` 再生成后仍等于审定快照；缺 id 失败且不从 path 推导 | `短途` | `契约` | `🔱 fork` `scripts/check-route-sensitivity.mjs` + 改前快照 | P2-01 → 三个审定字段也在对照里 | `commit + 旧字段 diff 空 + 三字段相等 + 缺 id 非 0 + UTC` |
| `PRE1116-T06` | 缺命名表或 id 与表不一致时烘焙失败；path 变化不改 id | `短途` | `unit` | `🆕` 烘焙负例 | P2-02 → 机器闸存在，且不冒充抽查 | `commit + 负例名 + UTC` |
| `PRE1116-T07` | 烘焙字节稳定；`routeTableModule` 与 route-table 文件为 0；[DNMSC] 无绑定表；[DNLS] 有烘焙且无浏览器 client | `短途` | `契约` | `♻️` `check-clean-lib` + `🆕` 文件存在性断言 | P2-03 → 单一作者 | `commit + check-clean-lib + UTC` |
| `PRE1116-T08` | guard inventory 的 id 等于账本；route-inventory 与账本 path 集合相等 | `短途` | `契约` | `🔱 fork` `route-guard.test.mjs` + inventory 生成 | P2-04 → 两条注册路径都能带上 id | `commit + 测试名 + UTC` |
| `PRE1116-T09` | 旧键隔离：v2 不读不改旧对象；`legacyCopies` 增加；升级分支不搬家 | `短途` | `unit` | `🆕` `packages/dsh-performance-review/test/protocol.test.mjs` | P3-01 → `07.1`–`07.3` | `commit + 测试名 + UTC` |
| `PRE1116-T10` | 同一源码同一构建戳；contributors 去重；两个构建戳恰好一条协议倾斜 audit，且戳 A 的样本对戳 B 的 `read()` 不可见 | `短途` | `unit` | `🆕` 同文件 | P3-01 → `07.4`–`07.5` | `commit + 双戳用例名 + UTC` |
| `PRE1116-T11` | v2 分区、`basis`/`n`、outcomes、状态类、evidence 上限、oversize、条件 note | `短途` | `unit` | `🔱 fork` `aggregate.test.mjs` / `markdown.test.mjs` | P3-02 → `08` | `commit + 测试名 + UTC` |
| `PRE1116-T12` | 有样本时 `read` 两次不变；`cutWindow` 后窗口列空、累计列不变、宿主 `since` 前移；插件 `src/` 的 `cutWindow` 为 0，`lab/` 允许 | `短途` | `契约` | `🆕` client 测试 + 两套范围的 grep | P3-02/P3-08 → `08.6` | `commit + 两套 grep + UTC` |
| `PRE1116-T13` | 游标：`since`、epoch 不符、非法 400、双读者、`mode` 400 且样本数不变 | `短途` | `unit` | `🆕` host 测试 | P3-02/P3-04 → `08.7`–`08.8` / `10.2` | `commit + 测试名 + UTC` |
| `PRE1116-T14` | `diagnose` 页级规则无插件名；浏览器 bundle 不含 `diagnose` / budgets | `短途` | `unit` | `🆕` `test/diagnose.test.mjs` + bundle 源码扫描 | P3-03 → `08.5` / `04.4` | `commit + 扫描 0 命中 + UTC` |
| `PRE1116-T15` | `validateDeclaration` 失败即失败；三方对账；`badShape` / `missingBindingId` / `unmappedKey` 真的 +1 | `短途` | `unit` | `🆕` declaration 测试 + `♻️` test-helpers | P3-03/P3-05 → `09.1` / `09.7` / `12.4` | `commit + 负例名 + UTC` |
| `PRE1116-T16` | 恰好 7 份声明；6 个合同面插件的生产调用都传入 `observe`，少一处失败；[DNMSC] 无声明无依赖；4 处 join 被替换且不新建第五处 | `短途` | `契约` | `🆕` 仓库结构断言。T04 只属于 W1，不能代替本项 | P3-05 → `13.1`–`13.2` / `13.6` | `commit + 六个调用点名单 + UTC` |
| `PRE1116-T17` | 5 个退役 span 名在 `src/` 为 0；4 个保留名在声明里；catalog 500 只出现在合同面状态类 | `短途` | `集成` | `🆕` 夹具驱动 guard observe + 声明对账 | P3-06 → `12.2` / `12.3` | `commit + 测试名 + UTC` |
| `PRE1116-T18` | 默认不写 `DSH_PERF_REVIEW`；`setEnabled` / `perfReview` 标识符在 [DNK] 为 0；运维入口仍能打开 | `短途` | `unit` | `🔱 fork` `host.test.mjs` 的启用用例（改成只认环境变量） | P3-06 → `12.6` | `commit + 测试名 + UTC` |
| `PRE1116-T19` | 写盘链为 0 且不产生 `host.json`；[DNLS] 两条 perf 路由按符号删除且其余不漂；[DNK] 的 `hostSnapshotUrl` / `PERF_ROUTE` / 诊断 `perf` 键为 0；`read:host` 恰好 [DNEE]/[DNN]/[DNMS] 三条 | `短途` | `契约` | `🔱 fork` T05 的账本快照 + 符号 grep | P3-04（写盘）/ P3-07（③ 排空与侧载） | `commit + 符号对照 + UTC` |
| `PRE1116-T20` | 攻击向量：假 token 不进事件；observe 抛错不改 status；读路由不回路径/session；插件不能打开全进程采集 | `短途` | `unit` | `🆕` 与 T02/T13/T18 共享夹具，单独命名以免被 happy path 淹没 | P1-02/P3-04/P3-06 → §7.3 | `commit + 攻击用例名 + UTC` |
| `PRE1116-T21` | 计量核心冻结向量：归并、三段、并集、`pickOwner` 与改动词前的期望字面量一致。范围是 DNPR 现有 6 个测试文件，不只 validity/client | `短途` | `回归` | `🔱 fork` `test/{validity,client,host,state,aggregate,markdown}.test.mjs` | S4 / `B02` → 算法不漂 | `commit + 向量名 + UTC` |
| `PRE1116-T22` | lab 不再写死插件场景名单；`shared-open` 消失；页级三场景仍在；读者用 `read` | `短途` | `契约` | `🆕` 对 `lab/*.mjs` 的源码断言（不启动浏览器） | P3-08 → `09.8` / `04.5` | `commit + 断言名 + UTC` |
| `PRE1116-T23` | `11.7` 对照：v1 与 v2 各 `--repeats 3`，只比通过/失败 id；`--inject-delay` / `--inject-failure` 退出码 1 且点名；`--arm purity` 退出码 0 | `mega` | `live` | `♻️` 现有 lab 入口，输出改成对照表 | P3-09 → `11.7` / `04.7` / `11.6` | `commit + 对照表路径 + 三次退出码 + UTC` |
| `PRE1116-T24` | 三次稳定性重录后硬门禁仍绿；footprint 字节数 ≤ 新基线 × 1.1，字节数写进记录 | `mega` | `live` | `♻️` `lab/run.mjs --measure-footprint` | P3-09 → `09.6` / `02.1` | `commit + 字节数 + 三次退出码 0 + UTC` |
| `PRE1116-T25` | 过期机制句为 0：`report()` 清空窗口、四个包、[DNK] 拥有 perf 路由、`mode=window` 排空 | `短途` | `契约` | `🆕` 文档 grep 清单 | P3-10 → `13.5` | `commit + 清单 0 命中 + UTC` |
| `PRE1116-T26` | 按 `RELEASE.md` 部署后，在真实页面读到一份 v2 报告和一份宿主 `since` 视图 | `spike` | `live` | `♻️` `11.6` 已点名的人工步骤 | P3-04/P3-09 → 本机读一次 | `commit + 报告 schema 字段 + UTC`。**无 grant 时不得执行，保持未观察** |
| `PRE1116-T27` | W2 实际跑 `scripts/route-scan.mjs`。脚本自己报出的漂移类为 0。期望不是 purpose 里的「26」或「43」 | `短途` | `契约` | `♻️` 现有脚本，不新造门禁 | P2-01 → `11.6` 已点名 | `commit + 脚本退出码 0 + 漂移类名 + UTC` |
| `PRE1116-T28` | W2 与 W3 各跑一次 `node scripts/test-all.mjs --build`，退出码 0 | `短途` | `回归` | `♻️` `11.6` 已点名的命令 | P2-04 / P3-09 的伴随，不销其他 Test-ID | `commit + 两次 argv + 两次退出码 + UTC`。退出码 0 **不得**把 T01–T25 标成已过，也不得把 T26 改成已观察 |

### 8.2 复用台账

| 既有用例 | 处置 | 改动 | 起跑线状态 |
|----------|------|------|------------|
| `packages/dsh-host-route-guard/test/route-guard.test.mjs` | `🔱 fork` | 加未注入逐字对照；夹具补 id 只在 Phase 2 | 已存在。撰写时未重跑 |
| `packages/dsh-interface/test/registrar.test.mjs` | `🔱 fork` | prefix/upgrade 的 observe 与未注入对照 | 已存在 |
| `packages/dsh-interface/test/json-outcome.test.mjs` | `🔱 fork` | 五类失败都要出现在 observe 的 outcome 上 | 已存在 |
| `packages/dsh-interface/test/discipline.test.mjs` | `♻️ 沿用` | 确认 contracts 新文件仍无 `node:*`；删除 `routeTableModule` 后更新只引用 `bindingTableModule` 的断言（`:61`） | 已存在 |
| `packages/dsh-performance-review/test/validity.test.mjs` 等 6 个测试文件（初评 63 条） | `🔱 fork` | 动词从 `report`/`takeWindow` 换成 `read`/`cutWindow`；**期望向量不放宽** | 初评记录 63/63。本文不把该记录当成 W3 已绿 |
| `scripts/check-route-sensitivity.mjs`、`scripts/check-clean-lib.mjs`、`scripts/route-scan.mjs` | `♻️ 沿用` | Phase 2 起它们必须认识新字段，而不是把 id 当成漂移 | 已存在 |
| `lab/run.mjs` 的 purity / inject / repeats | `♻️ 沿用` | 读者改 v2；退出码语义不变 | 需本机 lab，本文不声称已跑 |
| `dsh-nano-kitesurf/scripts/e2e-ego.mjs:392`、`dsh-nano-local-sandbox/scripts/e2e-ego.mjs:407` | `🔱 fork` | `report()` 改为 `read()`；不再请求 [DNLS] perf 路由 | 已存在，且今天依赖破坏性读 |

### 8.3 分层与跑法

| 类型 | 跑法 / 频率 | 主要层 | 触发时机 |
|------|-------------|--------|----------|
| 短途 | `node --test` 于 `dsh-interface`、`dsh-host-route-guard`、`dsh-performance-review`；加上账本与 grep 断言 | unit · 契约 · 回归 | 每个提交 |
| spike | `PRE1116-T26` 只在 grant 之后，按 `RELEASE.md` 做一次 | live | W3 合并条件之一，但是**授权外**直到 grant 出现 |
| mega | `lab --arm purity`；全部场景 `--repeats 3` 连续三次退出码 0；inject 两次退出码 1；`11.7` 对照 | live | Phase 3 的 ⑤⑥，合并前 |
| soak | **不新增** | — | 见 §8.4 |

### 8.4 测试缺口

- 不覆盖多小时 race soak。双读者互不排空由 `PRE1116-T13` 的确定性单测覆盖。新增 soak 会变成 `11.6` 没有点名的门禁（`⛔17`）。
- 不覆盖请求级 trace 关联、LoAF 按包拆分、[DNT] wasm/WS/SSE 手写植入、[DNMSC] 账本计时（`13.4` / `13.2`）。这些不是「还没写测试」，是非目标。
- 不覆盖「命名表已被 [业主] 看过」。`PRE1116-T06` 只证明机器会拒绝缺表。抽查是人工闸，写在合并说明里，不能被测试绿灯替换。
- `PRE1116-T26` 在没有 ImplementationGrant 时不跑，也不许用 jsdom 冒充。

### 8.5 测试保真（防假绿 · 刻死）

- 每个 PASS 必带四元组。`node --test` 的通过条数本身不是证据。
- `degraded` 必须带机器可读 reason。把既有失败说成与本 AP 无关时，必须给出改动前就失败的 git 证据。
- 安全项 `PRE1116-T20` 不得只断言 200。
- 禁止为了绿灯删除 `validity.test.mjs` 里的归属断言、放宽 `NAME_RE`、或把 `inject-failure` 的期望退出码改成 0。
- 禁止用「测试文件存在」代替「负例真的失败过一次」。每个 `🆕` 负例都要有一条断言在错误实现下会失败——见 §8.6 的「假绿手法」。

### 8.6 逐 Test-ID 防假绿侦测

| Test-ID | 假绿手法（审查时按这个打） | 怎样才算没被骗 |
|---------|---------------------------|----------------|
| T01 | 只比 `statusCode`；JSON.parse 后比对象，丢掉键顺序与多余空格；忘记 405 的 `Allow` 头；忘了 upgrade 的 socket 被关掉 | 比较原始 body 字符串 + 排序后的 header 对 + status。另有一条 `performance.now` 调用计数差为 0 |
| T02 | 只测 happy path 的 `ok`；把「函数被调用」当成形状正确；denylist 只查键名、不查值里嵌的 token；为了「共用模块」让 route-guard import `dsh-interface`，成环却仍然绿灯；闭集校验只测合法样本 | 四条 http 出口、upgrade 三态、json 六种结果、mcp 三态都过 `assertObserveEvent`。未知 surface、未知 outcome、多余字段各有一条拒绝。Error message 中的标记串不出现在 `JSON.stringify(event)`。`packages/dsh-host-route-guard/src` grep `dsh-interface` 为 0。[DNPR] 源码不出现第二份 outcome 闭集 |
| T03 | 只 grep `packages/`，漏掉 `lib/mcp.js` 与内联 `lib/web-routes.js`；允许 `onCall = observe` 别名 | 清单路径逐个读源码；别名（`onCall` 作为形参或解构）也算命中 |
| T04 | `test-all` 绿了但插件源码已经传入 `observe`，于是「行为不变」是假的 | grep 生产 `observe:` 为 0 是独立断言，不由测试进程退出码代替 |
| T05 | 用 purpose 文案里的「26」或「43」当期望条数；只比路由条数不比 sensitivity；把 `id`/`channel`/`match` 排除在 deep-equal 之外，于是 gen 可以改写审定值 | 旧字段与改动前快照逐字段相等。`gen --write` 之后这三个字段也与审定快照逐条相等。缺 `id` 的运行必须非 0，且产物里不得出现由 path 拼出的 id |
| T06 | 测试自己把命名表写出来再烘焙，然后声称 [业主] 已同意；或断言「文件存在」；一条非 0 同时冒充三个负例 | 三个负例分开失败：缺表非 0；id 与表不一致非 0；只改 path 后缀时烘焙出的 id 不变。测试名里禁止出现「owner approved」。抽查看合并说明，不看本测试 |
| T07 | 空文件也算「有 bindings.js」；[DNMSC] 只查 `package.json` 不查目录；[DNLS] 烘焙脚本顺手生成了 client bundle；两次烘焙没比字节 | 同一输入两次烘焙字节相同；`routeTableModule` 标识符为 0；恰好 7 份宿主 `lib/bindings.js` 且每份含账本 id；页面产物只含 `id` 与 `path`，不含 justification。`dsh-nano-model-selector-compaction/**/bindings.js` 为 0；[DNLS] 无新 `lib/client.js` |
| T08 | inventory 有 `id: undefined` 也算有字段 | `id` 非空且等于该 path 的账本 id |
| T09 | 把旧键读出来再写回，测试只检查「没抛错」 | 旧对象在调用前后 `JSON` 快照相同；v2 状态 Map 与旧 Map 不是同一个引用 |
| T10 | 哈希断言写成 `typeof stamp === 'string'`；重复 join 长度不变就当成双戳也测过了 | 同一输入两次戳相等；改一个源码字节后不等。两个构建戳恰好一条协议倾斜 audit，且戳 A 的样本对戳 B 的 `read()` 不可见。重复 join 后 contributors 长度不变是另一条，不能代替双戳 |
| T11 | 只断言 `schema` 字符串等于 v2，不造超限证据、不造无条件 note 的空报告；不查 `basis`/`n` | 分位行有 `basis` 与 `n`。非法 outcome 不进 `outcomes`。空报告的 notes 为空数组。evidence 超过 256 KB 时 `structure.oversize` 增加且正文被裁。epoch 不符时响应 200，`truncated` 含 `epoch`，返回的是累计视图不是空窗口 |
| T12 | `read` 的测试在调用前没有样本，所以「没变化」是真空的；grep 漏 `lab/`；`cutWindow` 只断言「调用了」；插件 `src/` 里出现 `cutWindow` 也被同一条 grep 放过 | 先写入已知样本再 `read` 两次，窗口列与宿主 `seq` 不变。再 `cutWindow`：窗口列空、累计列不变、宿主下一次 `since` 前移。插件 `src/` 的 `cutWindow` 为 0；`lab/` 允许。两套范围分开断言。退役动词的 grep 覆盖 `lab/` 与 `scripts/e2e-ego.mjs` |
| T13 | 两个读者用同一个 `since`，看不出互相删除；`mode=window` 返回 400 但实现仍然清空了数组 | 断言 400 之后 `seq` 与样本条数不变；读者 A 的 since 不影响读者 B 能看到的更早样本 |
| T14 | 在 Node 里 import 了 `diagnose` 就当浏览器也没打包它 | 扫描浏览器 esbuild 入口的产物文本，而不是扫描 Node 测试 |
| T15 | 对账函数把空集等于空集当成唯一用例，于是漏植的键也能过；结构计数只断言字段存在且为 0；非法声明只在单测里 throw，构建脚本仍然 0 | 必须有「声明有键、代码没有」与「代码有键、声明没有」两个失败例；`unmappedKey` 从 0 变 1。把非法声明交给构建入口时退出码非 0 |
| T16 | 把 `deprecated/` 里的第四份 `perf.js` 算进「已删除」或算进「已新建」；用 T04「生产 `observe:` 为 0」来证明 W3 已经注入 | 计数范围是八个活跃插件目录，排除 `deprecated/` 与 `.anote/`。六个合同面插件的生产调用都传入 `observe`，少一处失败。T04 只属于 W1，不能当本项的通过条件 |
| T17 | 只 grep 字符串 `hostSpan('catalog'`，漏掉换行或变量间接调用；500 用例没有真的走 catch；只测一个退役名 | catalog 夹具真走内部 catch：合同面 `status` 落在 5xx，且报告里没有名为 `catalog` 的手写 span。退役的 5 个名字都不在对应声明的 `keys.hostSpans`；保留的 4 个都在 |
| T18 | 测试里先把环境变量设成 1，再断言「开关工作」，从而没测默认关闭；或只删了 `setPerfEnabled` 的导出但 `index.js:421` 还在；三个入口只测了其中一个 | 默认 `apply` 夹具下 `enabled === false` 且 `process.env.DSH_PERF_REVIEW` 不被赋值。环境变量、`?perf-review=1`、`localStorage['dsh-perf-review']='1'` 各自单独打开采集。源码搜索赋值语句 |
| T19 | 删路由测试只看 [DNLS] 文件变短；按 `:1137-1146` 删到健康快照；写盘函数改名后仍写 `host.json`；诊断对象还留着 `perf` 键 | 按符号删除 `endsWith('/perf-report')` 与 `endsWith('/perf-review/host')`，不是按旧行号。账本被删 path 恰好这两条，其余 methods/sensitivity 不变。`writeFile` / `beforeExit` / `flush` / `hostWriteErrors` 为 0，夹具不产生 `host.json`。[DNK] 的 `hostSnapshotUrl`、`PERF_ROUTE`、诊断 `perf` 键为 0。`read:host` 的 perf-review host 恰好是 [DNEE]、[DNN]、[DNMS] |
| T20 | 与 T02 共用一个「被调用了」断言；用例名里写了 denylist 但没有子串断言；抛错只比 status；无 `bindingId` 时把 URL 写进 `id` | `observe` 抛错时，原始 body、排序后的 header 对、status 都与不抛错相同。URL、query、header、session、Error message 五个不同标记都不得出现在 `JSON.stringify(event)`。无 `bindingId` 时 `id` 为 `null`，不得等于 URL。读路由响应体不含夹具里的假路径与假 session id。用例名不算断言 |
| T21 | 迁移到 `read()` 时把期望从「最深 root」放宽成「任一 root」；只锁 `validity.test.mjs`，其余五个测试文件被删断言 | 向量表与改动前 `test/{validity,client,host,state,aggregate,markdown}.test.mjs` 的期望字面量一致，diff 只能出现在动词名。删断言或放宽 `NAME_RE` 即失败 |
| T22 | 运行时过滤掉 `shared-open`，源码数组还留着；lab 文件用字符串拼接把插件名藏起来；页级三场景被删掉后数组仍然不含插件名，于是也绿 | `SCENARIOS` 源码数组不含 `shared-open`，且仍含 `idle-10s`、`composer-type`、`observer-purity`。`lab/budgets.mjs`、`scenarios.mjs`、`run.mjs` 的插件包名 grep 为 0。`lab/candidates.mjs` 不再读 v1 `plugin.hostSpan` |
| T23 | 只跑 v2 三次退出码 0；inject 用例只断言「退出码不是 0」；对照表手写一行「一致」；一条点名、另一条只非 0 | 报告里同时有 v1 与 v2 的通过/失败 id 列，行数等于规则数，不比毫秒。`--inject-delay` 与 `--inject-failure` 都是退出码 1，且各自 stdout 含自己的 subject。缺 v1 列即失败 |
| T24 | 打印「footprint ok」但不记录字节；基线用单次运行覆盖；三次退出码来自 purity 而不是全场景 `--repeats 3` | 记录里有三次 argv，三次都是全场景 `--repeats 3`，以及一次来自工具输出的字节数。不比毫秒，不新增门禁 |
| T25 | grep 排除了 `AGENTS.md`；或只搜中文「清空窗口」漏掉英文 `resetWindow` 的文档承诺 | 清单同时含 `docs/specs/.../spec-26nov.md` 以外的 README 与 [DNK] `AGENTS.md`。spec 自身允许出现这些词作为「已退役」的一句，包 README 不允许把它们写成现行行为 |
| T26 | 用 `page.evaluate` 的单测或本地 fixture 充当「真实页面」；在未部署时把状态写成 `observed-OK`；用 T28 的 `test-all` 退出码 0 把本项改成已观察 | 没有 grant 就保持 `未观察`。有 grant 时证据里要有部署所用的 profile 与报告里的 `schema` 字段，不能是单元测试日志。T28 的退出码不得改本项状态 |
| T27 | 把 purpose 里的「26」「43」写成 `route-scan` 的期望条数；脚本没跑，只断言文件存在 | 实际执行 `scripts/route-scan.mjs`。脚本报出的漂移类为 0。upgrade 行（含 `dnt.stream`）仍被扫到。期望不取自过期总数 |
| T28 | 用一次 `test-all --build` 退出码 0 把 T01–T25 全部销掉，或把 T26 改成已观察 | W2 与 W3 各有一次 argv 与退出码 0。这次绿灯不关闭任何其他 Test-ID，也不改变 T26 的 `未观察` |

---

## 9. 风险、依赖与完成后状态

### 9.1 风险与依赖

| 风险 / 依赖 | 描述 | 当前判断 | 应对方式 |
|-------------|------|----------|----------|
| `11.3` 脏文件 | W2/W3 的路径与 [业主] 未提交工作重叠 | `high`（流程上）；撰写时六路径相对 `e228445` 无未提交 diff，只是时点测量 | 每批开工前重查。仍脏则停。W1 不写这六路径；[DNMS] vendored guard 的重建顺延 |
| 内联 `lib/` 副本漏重建 | 源码绿、宿主仍跑旧 `onCall` / 旧 guard | `high` | T03/T04 扫 `lib/` |
| 命名抽查被测试替代 | agent 自写命名表后立刻烘焙 | `high` | T06 不证明抽查；合并说明缺抽查记录则 Phase 2 不算收口 |
| W3 半套合并 | 先删 `evaluate` 或先重录基线，对照失败已无法回退 | `high` | `11.5` ⑤ 在 ⑥ 之前；对照失败禁止合并 |
| 计量回归被外壳改动掩盖 | `read()` 顺手改了归并窗口 | `medium` | T21 冻结向量 |
| 账本说明里的过期总数 | 有人把「26」「43」写成断言，W2 被假红或假绿 | `medium` | T05 只用改前快照 |
| 无 grant 却去部署 | `11.6` 的本机阅读被提前执行 | `medium` | T26 保持 `未观察`；本文不授权 |
| [DNK] AGENTS 与代码不一致 | 文档今天把 [DNLS] 的路由写成 [DNK] 的 | `low`（事实已核对） | P3-10 改事实句，不在 W1/W2 扩写 |

### 9.2 约束与前提

- **技术前提**：门面保持「不 import [DNPR]、不持跨实例全局态」。[DNPR] 继续是独立构建期库。计量算法的代码路径只允许为了接上 `read`/`cutWindow` 做调用点调整，不允许改 `pickOwner`、interaction 归并和 span 并集的判定。
- **运行时前提**：W1 与 W2 合并后，采集开关与报告形状仍是今天的 v1，因为没有人传 `observe`，也没有人切到 v2 单例。W3 合并是用户可见的硬切。
- **组织协作前提**：Phase 2 的命名表要 [业主] 抽查。Phase 3 的 `11.7` 要同一台机器。两者都不是本文能代签的。
- **上线 / 合并前提**：另立 ImplementationGrant 之后，才允许建 `.agents/worktrees/` 里的三个分支、合并、以及 T26 的本机部署。不新增 release-gate，不改 `RELEASE.md`。

### 9.3 文档同步要求

- 需要同步更新的设计文档：`docs/specs/dsh-nano-performance-review/spec-26nov.md` 原地升 rev5（P3-10，`13.5`）。
- 需要同步更新的说明文档 / README：DNPR README、`INTRODUCTION.md`、`lab/README.md`、在册插件 AGENTS 的本包事实句。
- 需要同步更新的测试说明：`lab/README.md` 里对 `report()` 与场景名单的描述，随 P3-08 一起改，不另写一套机制。
- 退役清单（代码、注释、头注、行号锚、文档句）：
  - 代码：`onCall`、`report`/`reset`/`resetCounters`/`configure`/`setHostSnapshotProvider`/`takeWindow`/`setEnabled`、五条退役 hostSpan、[DNLS] 两条 perf 路由、[DNK] 10 秒上报、`routeTableModule`、路径推导 id。
  - 注释与头注：`client.js:562-565` 的「先到先得」、`routes.js:573-576` 的 `mode=window`、`host.js:303-313` 的就地升级说明、[DNMS]/[DNN] perf.js 的「[DNEE] 负责轮询」。
  - 行号锚：spec 与 README 里指向旧 `report()` 行号的句子，随 rev5 改写或删除，不保留失效锚。
  - 文档句：`13.5` 点名的「四个包」「report() 返回并清空窗口」、[DNK] AGENTS 使用表中的 perf 路由、配置示例里的 `perfReview`。

### 9.4 完成后的预期状态

1. `main` 上若三批都已按 grant 合并：生产代码没有 v1 报告读者，宿主读面是 3 条只读路由，合同面事件使用账本 id，[DNMSC] 仍不依赖 [DNPR]。
2. 计量核心的冻结向量仍然成立。
3. spec rev5 是机制的唯一叙述；本 AP 保持「只 CITE」的计划，不升格成第二份真相。
4. 在 grant 出现之前，上述三条都**还不是**仓库现状。现状仍是初评所测量的 v1 外壳。

---

## 10. 收口（Definition of Done = 测试台账全 PASS 映射）

> 撰写时 0 项 PASS。下表状态全部是 `未观察`。把任一格改成 `verified` 只能发生在对应四元组已经写进实施记录之后。

### 10.1 收口硬闸

1. W1：未注入逐字一致，且生产无 `observe:`（由 `PRE1116-T01`、`PRE1116-T04` 证明）。
2. W2：路由旧字段与审定 `id`/`channel`/`match` 逐条不变（由 `PRE1116-T05`、`PRE1116-T27` 证明机器部分）。命名表抽查记录是人工闸，T06 变绿不得把这一格改成 `verified`。
3. W3：`11.7` 对照无不一致行之后才删除旧 `evaluate`（由 `PRE1116-T23` 证明）。
4. W3：purity 与三次 `--repeats 3` 退出码 0，两次 inject 退出码 1 且点名（由 `PRE1116-T23`、`PRE1116-T24` 证明）。
5. 无 grant 时 `PRE1116-T26` 保持 `未观察` 不得把整份计划标成 `executed`（`11.8`）。

没有 soak 硬闸。不把「未新增 soak」写成失败。

### 10.2 收口映射表

| 收口目标 | 工作项 | Test-ID | PASS 证据（四元组） | 状态 |
|----------|--------|---------|---------------------|------|
| 未注入时行为不变 | P1-02 | `PRE1116-T01` | 待执行 | `未观察` |
| 事件合同与 denylist | P1-01 / P1-02 | `PRE1116-T02` `PRE1116-T20` | 待执行 | `未观察` |
| `onCall` 无残留且无人注入 | P1-03 | `PRE1116-T03` `PRE1116-T04` | 待执行 | `未观察` |
| 账本旧字段不漂，且审定三字段不被重写 | P2-01 | `PRE1116-T05` `PRE1116-T27` | 待执行 | `未观察` |
| 命名表经 [业主] 抽查 | P2-02 | 人工记录。`PRE1116-T06` 只证明机器会拒绝缺表，不得把本行改成 `verified` | 待抽查 | `未观察` |
| 烘焙闸与单一作者 | P2-02 / P2-03 | `PRE1116-T06` `PRE1116-T07` | 待执行 | `未观察` |
| inventory 带 id | P2-04 | `PRE1116-T08` | 待执行 | `未观察` |
| 旧单例隔离与构建戳 | P3-01 | `PRE1116-T09` `PRE1116-T10` | 待执行 | `未观察` |
| v2 形状与无损读 | P3-02 | `PRE1116-T11` `PRE1116-T12` | 待执行 | `未观察` |
| 游标不排空 | P3-02 / P3-04 | `PRE1116-T13` | 待执行 | `未观察` |
| 判定中立且不进浏览器 | P3-03 | `PRE1116-T14` `PRE1116-T15` | 待执行 | `未观察` |
| 范围外延（7 声明 / 无 DNMSC / 4 处 join） | P3-05 | `PRE1116-T16` | 待执行 | `未观察` |
| 9 span 与采集开关 | P3-06 | `PRE1116-T17` `PRE1116-T18` | 待执行 | `未观察` |
| 侧载退役与 3 入口 | P3-04 / P3-07 | `PRE1116-T19` `PRE1116-T20` | 待执行 | `未观察` |
| 计量核心未改 | S4 | `PRE1116-T21` | 待执行 | `未观察` |
| lab 不再写死插件名单 | P3-08 | `PRE1116-T22` | 待执行 | `未观察` |
| 对照、注入红线、体积 | P3-09 | `PRE1116-T23` `PRE1116-T24` | 待执行 | `未观察` |
| 文档不再教 v1 机制 | P3-10 | `PRE1116-T25` | 待执行 | `未观察` |
| 本机真实读数 | P3-04 / `11.6` | `PRE1116-T26` | 待 grant | `未观察` |
| W2 `route-scan` 与 W2/W3 `test-all --build` | P2-01 / P2-04 / P3-09 | `PRE1116-T27` `PRE1116-T28` | 待执行 | `未观察` |

### 10.3 Definition of Done

| 维度 | 完成定义 |
|------|----------|
| 功能 | `11.5` ①–⑦ 都落在同一个 W3 合并里；W1/W2 已先合并；生产无 v1 读者、无 `onCall`、无 [DNLS] perf 通道 |
| 测试 | §8 除 T26 以外的项都有四元组 PASS；T23/T24 是退出硬闸；T26 在 grant 前保持未观察，因此**整份 AP 在 grant 前不能标 `executed`** |
| 文档 | spec rev5 是机制唯一文档；本 AP 仍只 CITE |
| 风险收敛 | `11.3` 没有脏覆盖；命名抽查有记录；`11.7` 无不一致行 |
| 可交付性 | 三批 worktree 按 [业主] 要求删除；无新 release-gate |

### 10.4 NOT-成功识别

- 任一退出硬闸（T23、T24）为 `degraded` 或 `未观察` → 不得把 W3 标成已合并成功。
- T26 `未观察` 而其余全绿 → 状态最多是「代码已合并、本机阅读未做」，不是 `executed`。在 grant 不存在时，连「代码已合并」也不成立。
- 只有测试条数、没有负例名与四元组 → 按假绿处理，不销账。
- `PRE1116-T28` 退出码 0 不得把 T01–T25 或 T26 改成已观察。
- 命名表抽查记录缺失时，T06 即使全绿，P2-02 仍是 `未观察`。
- 对照表缺失却已经删除 `evaluate` → 该提交不合格，不能当作 `11.5` ⑤ 完成。

---

## 11. 执行日志回填

文档状态为 `draft`，本节不回填执行。实施完成后另用 append 模板；residual 不回写本阶段的规则句。

### 11.1 执行日志回填（PRE-1116）

> 执行者：`workbuddy/deepseek-v4.1-flash`（agent）
> 执行时间：`2026-11-16T15:05Z` 起，`2026-11-17T01:10Z` 本轮回填
> 文档状态：`draft → executing`（未到 `executed`：live 门未跑）
> 代码改动统计：W1 22 文件 / W2 69 文件 / W3 见下；`schema` 从 v1 升到 `dnpr.report/2`

- **实际执行摘要**：W1 落 `06`（四门面可选 `observe`、`onCall` 退役）；W2 落 `05`（87 行账本身份、命名表烘焙闸、`routeTableModule` 与 `route-table.js` 退役）；W3 落 `07`–`10` 的代码面（协议键、v2 报告、`read`/`cutWindow`、宿主只读读面、七份声明、9 span 处置、排空与侧载退役、lab 声明驱动）。`P1-01`–`P2-03` 完成；`P2-04` 的 `route-inventory.md` 未改；`P3-09` 的对照与基线重录未做；`P3-10` 由同批文档回填。
- **Phase 偏差（计划 vs 实际）**：
  - `P3-01`（计划偏差）：`LIB_VERSION` 与 `libVersion` 先保留，后在同批内完整退役；`observerVersion` 已不再写入。构建戳改用 `scripts/dnpr-build-stamp.mjs` 的内容哈希，经 `scripts/dnpr-define.mjs` 注入七个插件。
  - `P3-02`（substrate-fit）：v2 顶层采用 `schema: "dnpr.report/2"` + `meta/page/plugins/evidence/structure/notes`（`08.1`），不再保留 v1 的 `generatedAt/audits` 顶层键。
  - `P3-04`（计划偏差）：[DNEE] 的 `mode=window` 没有留在 ①，已按 `11.5` ③ 与 [DNLS]/[DNK] 侧载一并删除。
  - `P3-05`（substrate-fit）：七份声明使用 `keys/buckets/contract/scenarios/budgets`；运行时切片由 `scripts/bake-declaration.mjs` 只烘焙 `KEYS/BUCKETS/DECL_HASH`。
  - `P3-08`（计划偏差）：`lab/budgets.mjs` 的旧逐轨道规则迁入 [DNEE]/[DNN] 声明；`evaluate` 保留为 `diagnose()` 的 lab 适配层，等待 `P3-09` ⑤ 的对照。
  - `P3-09`（顺序调整）：未执行。没有 `lab/config.local.json`，本轮不驱动真实浏览器；`evaluate` 未删，基线未重录。
- **阻塞与处理**：
  - `P3-09` 对照与 `P3-10` 的 live 证据：无本机 grant，按 `T26` 同口径保持 `未观察`。
  - `PRE1116-T28`：`dsh-nano-s3-client` 的三条 rate 用例在 `main` 与 W3 都报 `Promise resolution is still pending…`（Node 22.23.4；`main` 同样 13 pass / 3 cancelled），属 pre-existing 环境失败，不计入本阶段引入。
- **测试发现**：
  - DNPR 包：`npm test` 82/82。
  - [DNLS]：`npm test` 95/95。
  - `packages/dsh-interface`：58/58。
  - `node scripts/check-route-sensitivity.mjs`：87 routes, 0 drift；`check-feature-contract`：87 routes。
  - `node scripts/check-clean-lib.mjs`：74 runtime artifacts。
  - 对抗审查见 `.anote/reviews/PRE/1116/`（三路）。
- **后续 handoff**：`P3-09`（对照表 + 基线 + 删 `evaluate`）、`P3-10` 的 spec rev5 已在同批文档落盘但 live 证据待补、`T26` 本机页面阅读、合并到 `main` 与 worktree 删除均由 [业主] 决定。

### 11.2 逐工作项状态

| 工作项 | 状态 | PR / commit | 实际落点 | 备注 |
|--------|------|-------------|----------|------|
| `P1-01` | ✅ done | `fee3a42` | `packages/dsh-interface/src/contracts/observeEvent.js`；四门面 | T01–T04 |
| `P1-02` | ✅ done | `fee3a42` | `packages/dsh-interface/src/host/emitObserve.js` | 同步、吞异常、不读时钟 |
| `P1-03` | ✅ done | `fee3a42` | 七插件 `lib/` 重建 | `onCall` 0 命中 |
| `P2-01` | ✅ done | `ce29091` | `security/route-sensitivity.json` | 87 行含 upgrade |
| `P2-02` | ✅ done | `ce29091` | `security/perf-binding-ids.md`、`scripts/bake-plugin-bindings.mjs` | 缺 id / 表不一致即失败 |
| `P2-03` | ✅ done | `ce29091` | 七份 `lib/bindings.js`；`routeTableModule` 删除 | 空 [DNK] 表合法 |
| `P2-04` | 🟩 partial | `ce29091` | `packages/dsh-host-route-guard/src/route-guard.js` | `route-inventory.md` 未改 |
| `P3-01` | ✅ done | `dcddf80` + 本批 | `state.js`、七插件构建脚本 | `__DNPR_BUILD__` 内容哈希 |
| `P3-02` | ✅ done | `dcddf80` + 本批 | `aggregate.js`、`client.js`、`host.js` | 顶层 `dnpr.report/2` |
| `P3-03` | ✅ done | `dcddf80` | `src/diagnose.js`、`src/declaration.js` | 浏览器出口不含 |
| `P3-04` | ✅ done | `2c1874b` | `handleHostRead`；[DNN]/[DNMS] 路由 | 只接受 `since` |
| `P3-05` | ✅ done | `77fa108` + 本批 | 七份 declaration；`bake-declaration.mjs` | 4 处页面 join 统一传 `buckets/decl/hostRoute` |
| `P3-06` | ✅ done | `dd5e2dd` | 9 个 hostSpan 处置 | 5 退役 / 4 保留 |
| `P3-07` | ✅ done | `bd3422c` | [DNEE]/[DNLS]/[DNK] 排空与侧载 | 账本 87 行 |
| `P3-08` | ✅ done | 本批 | `lab/declarations.mjs`、`lab/drivers/*`、`lab/budgets.mjs` | 插件名/轨道名清零 |
| `P3-09` | ⏸ live-pending | - | - | 未跑真实浏览器对照 |
| `P3-10` | 🟩 partial | 本批 | spec rev5、README、AGENTS 事实句 | live 句仍待 T26 |

### 11.3 关键指标演进

| 指标 | `main`（W0） | 本分支 W3 | Δ |
|------|--------------|-----------|---|
| 账本路由行 | 87（无 id） | 87（全部 id/channel/match） | 0 行，身份从 path 推导改为审定 |
| DNPR 单测 | 60 | 82 | +22 |
| `routeTableModule` 标识符 | 存在 | 0 | 退役 |
| `onCall` 标识符 | 存在 | 0 | 退役 |
| `report()` 页面动词 | 存在 | 0（`read`） | 硬切 |
| 写盘器 / `host.json` | 存在 | 0 | 退役 |

### 11.4 pre-existing 失败

| 失败项 | 证据（git / 命令） | 判断 |
|--------|---------------------|------|
| `packages/dsh-s3-client` 3 条 rate 用例 `cancelled` | `main` checkout 同命令：13 pass / 3 cancelled；worktree 相同 | pre-existing, non-blocking |
| `deprecated/dsh-nano-shared-workspace` 缺 `node_modules` | worktree 未安装 `deprecated/` 依赖；`main` checkout 有 | 环境搭建，已用符号链接补齐后 security gate 8/8 |
