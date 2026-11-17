# `ACE-1117` — QnA Truth Ledger

> **Ledger ID**：`ACE1117-TRUTH`
> **范围**：[DNMSC] / [DNMS] 异步压缩面在 DNMS01 收口之后的执行阶段真相（只列已有 ID：`T-O-ACE1117-B01`–`B13` 与 `T-O-ACE1117-01`–`11`，共 24 条；其中 `01`–`11` 含 62 条细则。`CORR-1` 是收口后的读法更正，不是新 ID）
> **文档性质**：`frozen-truth ledger / compact consumption entry`（问答是 decision provenance；本文不是第二真源）
> **状态**：`🔒 FROZEN · baseline 13 条 + foundational 7 条（Q1–Q4、Q8–Q10）+ executional 3 条（Q5–Q7）+ closure 1 条 · NOT IMPLEMENTATION CLOSURE · NOT IMPLEMENTATION GRANT`
> **日期**：`2026-11-17`
> **Owner decision provenance**：[ACE-1117-qna.md](ACE-1117-qna.md)（Baseline `B01`–`B13` 随文件冻结；Round 1–3 逐轮同意推荐，Q1/Q2/Q3/Q5/Q6/Q7 → `01`–`03`、`05`–`07` 选 B，Q4 → `04` 选 C；Round 4 由 [业主] 指定为 foundational 级收口，Q8–Q10 → `08`–`10` 选 B；§9 收口登记 `11`；§9.7 `CORR-1`。second-opinion 全程 `retired`）
> **上游已冻法律（只 CITE，本文不 supersede）**：[DNMS01-qna-truth.md](../../specs/dsh-nano-model-selector/qna/DNMS01-qna-truth.md) 中**未被 §2.9 接替表点名的行**继续有效（开关与交付经 `B07`；`-10` 的组合层互斥；`-15` 的严格顺序；`-13` 的 DC-1 与 `B≤H` 拒绝；`-17`；`-18③④⑤⑦⑧⑨`；`-20` 的切换确认；`-21①`；`-22` 不设 Round 6）；`T-O-DNMS01-6` 的四原则读法；`T-O-DNMS01-7`；`T-O-PRE1116-13.2` / `13.4`（[DNMSC] 不接入 DNPR）；仓根 `AGENTS.md` 七条核心原则与 worktree 约定
> **形成史输入（测量，不裁决）**：[ACE-1117-risk-assessment.md](ACE-1117-risk-assessment.md)（评估；R01–R50 与 §7 工作台账是证据，其中的推荐、方案编号、Q-ACE 不是合同）；问答 §3 / §5 / §7 中场评估与 §9.3 审计
> **Review HEAD**：`fb7264d`（问答基线 `main @ fb7264d`；2026-11-17 三路复核时 HEAD 仍是这一提交；宿主口径 `@deepseek-ai/dsh@0.2.2-rc.1`；行号为该时点快照。内核里与问答同文的行号不改字；标偏或过宽的，引用时以 `AF-14` 的符号为准）
> **远端 / paid**：`none`（`remote_ops=0`）

## 0. 权威边界（必须有）

本文是 [ACE-1117-qna.md](ACE-1117-qna.md) 的精炼消费入口，也是下游直接 CITE 的引用面。文中「本册」专指该问答，不指本台账。新裁决只追加在问答里，再投影到本台账。本文：

1. 只登记 [业主] 已经接受的 `T-O-ACE1117-B01`–`B13` 与 `01`–`11`，连同问答 §1 的 ①–⑧ 细则、§9.4 覆盖矩阵、§9.5 接替指针最终表，以及 §9.7 `CORR-1`。不新建 Truth-ID，不改变 [业主] 结论，不把摘要升级成新法律。
2. 不保留问题解读、候选方案、推荐论证、证据表或中场推演。这些留在问答原文。
3. 与问答的台账、§9.5 / §9.7 或业主回答不一致时 fail-closed，以问答为 provenance，并修订本台账。Q10 题面⑦的指针表有一处误列，以问答 §9.5 为准，§2.9 只是投影，题面不改字。就该误列的那一格而言，严格顺序不被接替，被接替的只有 S=0.80；`-15` 的 7 字段、pinned「保留量」语义、不新建 audit 仍以最终表的另行为准，不因这句「只有」而消失。
4. 下游只能引用或细化本台账；细化不得改写规则句。不得把未选中的选项再当成现行合同：Q1 的回退代码 / 续开 DNMS01 Round 6 / 文档追认代码；Q2 的忠实移植 / 只在外围告知 / 搬 [nano-agent] 语义栈；Q3 的现状节点算法加硬上限、严格 turn 原子、只对齐 step（第三级平衡节点本身不在禁止之列）；Q4 的静默、只改帧、帧加 `notice` 与临时状态、改靠宿主 `dsh-tool-session-query` 而不注册本插件工具；Q5 的追认无互斥、回退 `-18` 调度、全程 durable 锁；Q6 的账本末条加时间窗口、删账本只在打开时拉一次、新建推送路由；Q7 的全文覆盖、不可调整、全文覆盖加结构校验、手抄双份；Q8 的外推到边界、改比例字段、删除 pinned 字段；Q9 的工具进 isolate、关键字检索、推迟注册；Q10 的全部追认、全部回退 DNMS01、把 S 改成可写。也不得把已被接替的 DNMS01 旧句，或 `CORR-1` 更正前的 `disarmed` 理由句，再当成现行合同。
5. `FROZEN` 不表示代码已改、测试已绿、计划已落地，或 `-11③` 的实施期委托项已取定。DNMS01 侧的接替指针（`AMEND-4`–`AMEND-6`）已按 `-01②` 写入，那只是指针，不是第二份真相正文。
6. 本文不构成 implementation、build、deploy、secret、provider 或任何远端动作的 grant。不新增 release-gate，不改 `RELEASE.md`，不定版本号与发布节奏。发布授权归 [业主]。
7. 测量层是当时的 HEAD 事实，`T-O` 是目标态。施工落地后不回改测量层。`B10` 的计数与时延是快照事实，不是目标 SLA。
8. 推翻任一旧行，只能在原问答里 append-only supersession。不得改旧行，不得在下游文档里改写，不得回改 DNMS01 更早的台账正文。

细则编号只用问答里的 ①②③。本文不另编 `08.2` 这类序号。下游点名写 `T-O-ACE1117-08②`。

### 0.1 总体裁决（必须有）

```text
baseline      T-O-ACE1117-B01..B13:  FROZEN（随 ACE-1117 问答冻结，2026-11-17）
foundational  T-O-ACE1117-01..04:    FROZEN（Round 1–2；Q1–Q3 同意推荐 B，Q4 同意推荐 C）
executional   T-O-ACE1117-05..07:    FROZEN（Round 3，同意推荐 B）
foundational  T-O-ACE1117-08..10:    FROZEN（Round 4，[业主] 指定为 foundational 级收口，同意推荐 B）
closure       T-O-ACE1117-11:        FROZEN（§9 收口登记；本行不是新裁决）
post-freeze   CORR-1:                读法更正（只改 -11② 里 disarmed 的理由；结论不变；原行不改字）
OPEN owner decisions:                0（不设 Round 5；残留按 -11④ 显式 defer）
足以写下游计划:                        YES（ACE-1117 计划 §2 只 CITE 本台账）
足以签发 implementation grant:        NO
remote / deploy / live:              NOT CLAIMED
```

```text
ACE-1117-qna.md（已冻结，decision provenance）
  → 本台账（引用面，只投影已选中那一格）
  → ACE-1117 计划（只 CITE；不填写 Q/A，不改规则句）
  → （另立）ImplementationGrant
```

## 1. Truth-Gate 总表（必须有）

> 一行一个已有 ID。内核只写已选中的那一格，不写落选项。细则在 §2 按原序号投影。

| Truth-ID | 领域 | 冻结核心 | 来源 |
|----------|------|----------|------|
| `T-O-ACE1117-B01` | 范围 | 阶段名 `ACE-1117`；评估是证据不是合同 | Baseline |
| `T-O-ACE1117-B02` | 判据 | 仓根七原则 + 本阶段四原则；不兼容指合同面，硬切指切换时刻原子 | Baseline |
| `T-O-ACE1117-B03` | 必答 | [业主] 四项担心是必答范围：语义切点、模型心跳与 inspection、UI 心跳、专用 prompt | Baseline |
| `T-O-ACE1117-B04` | 参照 | [nano-agent] 只作语义参照，不 import、不侧载，FT-* 不是合同 | Baseline |
| `T-O-ACE1117-B05` | 宿主边界 | 只经宿主公开面工作；宿主缺口只登记不修补；不改宿主、不嫁接 DOM | Baseline |
| `T-O-ACE1117-B06` | 权威 | 一次压缩的权威是 session journal 括号；账本、runtime、UI 都是派生 | Baseline |
| `T-O-ACE1117-B07` | 开关 | ON/OFF 唯一 canonical 仍是 bundle 成员资格；默认 OFF；语义只在 ON 态生效 | Baseline |
| `T-O-ACE1117-B08` | 性能 | [DNMSC] 不接入 DNPR；压缩 UI 的量测只落在 [DNMS] | Baseline |
| `T-O-ACE1117-B09` | UI | nano-ui 纪律不变；宿主 primitive → nano-ui → `nano-ui-exempt` | Baseline |
| `T-O-ACE1117-B10` | 运行事实 | desktop 实测作为输入不再复议；242/260 切在 turn 中间、39/260 尾部无 user | Baseline |
| `T-O-ACE1117-B11` | 代码缺陷 | 缺陷清单只作不再复议的输入；修法已落在 §2.9，不再另题 | Baseline |
| `T-O-ACE1117-B12` | 改约 | 推翻 DNMS01 旧行只能 append-only，沿 `AMEND-1..3` 先例 | Baseline |
| `T-O-ACE1117-B13` | 仪式 | 不新增 release-gate，不改 `RELEASE.md`；验收只用既有检查 | Baseline |
| `T-O-ACE1117-01` | 真源 | `ACE-1117-qna.md` 是唯一 provenance；本台账只投影；DNMS01 只追加指针；漂移已落在覆盖矩阵 | Round 1 / Q1-B |
| `T-O-ACE1117-02` | 主权 | 协议层复用宿主公开协议；语义层归 [DNMSC]；五条安全不变量不可放弃 | Round 1 / Q2-B |
| `T-O-ACE1117-03` | 切点 | turn → step → 平衡节点，取满足预算的最高一级；四条 lane 共用一个选择器 | Round 2 / Q3-B |
| `T-O-ACE1117-04` | 知情面 | checkpoint 帧是告知模型的唯一载体；只告知已提交事实；新增一个只读 inspection 工具 | Round 2 / Q4-C |
| `T-O-ACE1117-05` | 生命周期 | 采纳 arm 即起摘要、下一 step 边界或 idle 提交；engine 内互斥；抢占不计 circuit | Round 3 / Q5-B |
| `T-O-ACE1117-06` | 观测 | 账本是遥测不是权威；已提交事实走 projection；在途状态按事件拉取；常驻定时器退役 | Round 3 / Q6-B |
| `T-O-ACE1117-07` | prompt | 内置异步 prompt 是唯一真源；全文覆盖退役为只能附加；[DNMS] 副本构建生成 | Round 3 / Q7-B |
| `T-O-ACE1117-08` | 预算与帧 | pinned 改为目标保留量；上限由回落线推导并预留 8192；帧写固定字段 | Round 4 / Q8-B |
| `T-O-ACE1117-09` | 工具 | `inspect_checkpoint` 独立成行，不进 isolate；分页；单条 2000、单次 24000 | Round 4 / Q9-B |
| `T-O-ACE1117-10` | 阈值与验收 | S=0.90 并退役读时兼容；严格顺序是回退保留；顶栏入口；文案不作合同、切换确认保留、缓存键退役；覆盖 base 扁平行；只用既有检查 | Round 4 / Q10-B |
| `T-O-ACE1117-11` | 收口 | 接替指针以最终表为准；派生读法、实施期委托与显式 defer；不是新裁决 | §9 收口审计 |

## 2. 规范内核（必须有）

> 按业务簇分组。每条只有来源与已冻结的内核；不落选项、不搬推荐理由、不搬证据表。
> 密度跟源头走：`B01`–`B13` 是一句到几句，收成短段；`01`–`11` 的 ①②③ **原样投影**，因为下游会点名。

### 2.1 基线（随问答冻结）

#### `T-O-ACE1117-B01` —— 阶段与证据地位

> **来源**：`[业主] 本轮指令；评估 §0、§4、§7` ｜ **驱动后续**：后续各题的约束，不是新裁决

本阶段名为 `ACE-1117`。工作对象是评估 §4 风险全清单（R01–R50，业务簇 C1–C7）与 §7 工作台账（P0 7 项、P1 8 项、P2 7 项）。评估是证据输入，不是合同；写进评估的推荐、方案编号、Q-ACE 裁决项不因此生效。

> **下游约束**：计划只能以本文件冻结的 `T-O-ACE1117-*` 作为方向依据。

#### `T-O-ACE1117-B02` —— 判据

> **来源**：`仓根 AGENTS.md 核心工作原则；T-O-DNMS01-6` ｜ **驱动后续**：后续各题的约束，不是新裁决

判据 = 仓根七原则（插件中立、上层建筑归 host、不得侧载、单一真源、不得擅自扩约、不得过度仪式、worktree）+ 本阶段四原则：能硬切就不双写、能彻底退役就不兼容、平台保持中立、不耦合私域，并服从「长期治理、拒绝 hotfix」。四原则读法沿用 `T-O-DNMS01-6`：「不兼容」指合同面而非 UX 回退，「硬切」指切换时刻原子、无重叠。

> **下游约束**：每题推荐须逐条过此判据。

#### `T-O-ACE1117-B03` —— 四项担心是必答范围

> **来源**：`[业主] 本轮指令；评估 §5.1–§5.4` ｜ **驱动后续**：Q3–Q10 的落点，不是做法本身

[业主] 本轮提出的四项担心是本阶段必答范围：① 保留尾部按语义边界截取，而不是按 token 绝对值硬切；② 异步压缩的 arm 时序与对话时序中，对 LLM AGENT 的心跳管理（告知已压缩、上下文已替换、什么变了、什么没变）以及 checkpoint 内容的 inspection 工具；③ UI 上的心跳管理（async 设置、async 诊断、对话内心流）；④ 异步压缩专用默认 PROMPT 的管理。怎么做由后续题裁决，但计划不得遗漏任一项。

> **下游约束**：四项的现行落点见 §2.9 覆盖矩阵，不再当作未决。

#### `T-O-ACE1117-B04` —— [nano-agent] 只作语义参照

> **来源**：`T-O-DNMS01-7；评估 §1.1；仓根「插件中立」「不得侧载」` ｜ **驱动后续**：后续各题的约束，不是新裁决

[nano-agent] 只作语义参照：不 import 代码、不复制 D1/Queue/DO/cron、不建侧载通道（继承 `T-O-DNMS01-7`）。[nano-agent] 的 `docs/truth/context/frozen/` 仍为 Owner freeze PENDING，其 FT-* 不是 [dsh-nano] 的合同来源。评估中引用的 nano 设计，只有经本册冻结为 `T-O-ACE1117-*` 才生效。

> **下游约束**：任何方案不得以「nano 已经这样做」作为唯一理由。

#### `T-O-ACE1117-B05` —— 宿主边界不变

> **来源**：`宿主 compaction 包根导出；T-O-DNMS01-3；[DNMS] AGENTS.md「上层建筑归 host」` ｜ **驱动后续**：后续各题的约束，不是新裁决

[DNMSC] 只经宿主公开面工作：`ctx.compaction` seam 及其包根导出（`CompactionEngine`、`CompactionId`、`ManualCompactionError`、`compactCheckpointSource`、`isCompactCheckpointSource`、`toolPairingBalancedAfter/Before`）、`agent/*` 钩子、session journal 与 `surfaceOp.replace`。宿主缺口（如 `CompactionNodeView` 无异步变体）只登记、不修补。不改宿主文件、不嫁接宿主 DOM。

> **下游约束**：方案不得依赖宿主未导出实现或改写宿主行为。

#### `T-O-ACE1117-B06` —— durable 真值分层不变

> **来源**：`T-O-DNMS01-2、T-O-DNMS01-16；[DNMSC] AGENTS.md Audit ledger` ｜ **驱动后续**：`-04`、`-06`

一次压缩的权威是 session journal 的 `compaction/start → compaction/summary → checkpoint user/message（surfaceOp.replace + compactCheckpointSource）→ compaction/end` 括号。任何账本、runtime 字段、UI 状态都是派生，不作恢复读源。

> **下游约束**：新增观测或心跳面不得成为第二权威。

#### `T-O-ACE1117-B07` —— 开关与交付形态不变

> **来源**：`T-O-DNMS01-9、-12、-14、-17` ｜ **驱动后续**：后续各题的约束，不是新裁决

ON/OFF 唯一 canonical 是 `dsh.profile.bundles` 成员资格。install ≠ 接管、默认 OFF。一仓两包。OFF 态 [dsh] 原生 `compaction-basic` 全部回来。本阶段任何语义只在 ON 态生效。

> **下游约束**：不得引入第二个开关或 OFF 态残留行为。`B07` 只继承 `-17` 原文，不裁决 R-16.5（见 `-11④`）。

#### `T-O-ACE1117-B08` —— [DNMSC] 不接入 DNPR

> **来源**：`T-O-PRE1116-13.2、13.4；spec-26nov.md` ｜ **驱动后续**：`-06③`

[DNMSC] 不接入 DNPR：不加性能声明、不加 DNPR 依赖、不加构建戳。压缩 UI 的性能量测只能落在 [DNMS] 自己的声明里，新指标先进 audit。

> **下游约束**：perf 对齐只动 [DNMS]。

#### `T-O-ACE1117-B09` —— nano-ui 纪律不变

> **来源**：`仓根「UI 宿主优先」；docs/specs/dsh-nano-ui/DESIGN.md` ｜ **驱动后续**：`-06`、`-10③④`

`docs/specs/dsh-nano-ui/DESIGN.md` 是唯一规格。顺序是宿主 primitive → nano-ui → 插件内实现并标 `nano-ui-exempt`。不嫁接宿主 DOM、不写十六进制色值、不以 unicode 作图标。

> **下游约束**：压缩 UI 改造必须过 `check-ui-rules` 与 DESIGN §10 登记。

#### `T-O-ACE1117-B10` —— 已核实的运行事实，不再复议

> **来源**：`评估 §2.3；/tmp/dnms-evidence/turnsplit.json、retain.json、sessions.json` ｜ **驱动后续**：修复路径由后续题决定；事实本身不再复议

desktop 174 会话、265 次压缩、260 次提交（98.1%）。异步 10 次 9 成功。7 次 arm 全部落在首次越过 B 的那一步。260 次提交后 orphan tool pair 为 0、摘要期间新追加消息 0 丢失。242/260 切在 turn 中间、39/260 保留尾部无 user 消息。当前构建异步 claim→commit 为 15–76 s（一例 340 s 由卡住的 step 造成）。7 次异步摘要均为真实 LLM 调用（输出 3.0k–4.2k tokens）。同步 FULL 阻塞 p50 31 s、最长 194 s。

> **下游约束**：这些数字是测量输入。验收对照的是其中「turn 中间切点 242/260」「尾部无 user 39/260」（`-10⑥`），不是把整组时延写成合同。

#### `T-O-ACE1117-B11` —— 已核实的代码缺陷，不再复议

> **来源**：`评估 §4.1 R26–R36、R13–R15` ｜ **驱动后续**：修复路径由后续题决定

作为输入、不再复议的缺陷：idle 提交死路径（`host-compaction.js:177` 对 `:304`）；摘要期间不持 durable 锁（`:376`；`compact-region.js:592-595,609-645`）；超时只发 abort（`:315`）；`MAX_CLAIM_ATTEMPTS` 死常量（`:68`）；非 transient 失败无防抖（`:484,488-495`）；episode 只在内存且永不删除（`:95`）；`info.context` 缺失静默不压缩（`:596`）；账本只覆盖异步 lane；`armed` 在 UI 不可达；runtime 不按 `sessionId` 取（`dsh-nano-model-selector/index.js:428`）。

> **下游约束**：落点见 §2.9 覆盖矩阵。「账本只覆盖异步 lane」的现行读法被 `-11②` 消解，不按本条字面继续当目标态。

#### `T-O-ACE1117-B12` —— 推翻 DNMS01 只能 append-only

> **来源**：`DNMS01-qna-truth.md §0 第 8 条、§4.5 AMEND-1..3` ｜ **驱动后续**：`-01②`

推翻 `T-O-DNMS01-*` 的任一旧行，只能 append-only：不改旧行原文、不在下游文档里改写。DNMS01 已有先例 `AMEND-1..3`。

> **下游约束**：接替只写「旧行 / 项 → 新 truth-id」，不复述新真相。

#### `T-O-ACE1117-B13` —— 不过度仪式

> **来源**：`仓根「不得过度仪式」；T-O-DNMS01-19⑤` ｜ **驱动后续**：`-10⑥`

不新增 release-gate，不改 `RELEASE.md` 的发布流程，不定版本号与发布节奏。验收只用既有测试、既有检查脚本与只读证据重放。发布授权归 [业主]。

> **下游约束**：计划的验收栏只引用既有检查。

### 2.2 真源与语义主权

#### `T-O-ACE1117-01` —— 本册接替异步压缩面的真源

> **来源**：`Round 1 / Q1（[业主] 同意推荐 B）` ｜ **驱动后续**：全部后续题的合同来源；漂移处置分别关闭于 `-05`–`-10`

| 条款 | 已冻结内核 |
|------|------------|
| `①` | 本册 `ACE-1117-qna.md` 是 [DNMSC] / [DNMS] 异步压缩面一切新裁决的唯一 provenance。ACE-1117 计划 §2 只 CITE `T-O-ACE1117-*`。`T-O-DNMS01-*` 中未被接替的行继续有效（开关与交付形态经 `B07` 显式继承）。 |
| `②` | 接替指针 append-only：全轮冻结时一次性在 `DNMS01-qna.md` 末尾追加「ACE-1117 接替」表、在 `DNMS01-qna-truth.md` §4.5 按 `AMEND-1..3` 先例追加 `AMEND-4…` 行。两处都只写「旧行 / 项 → 新 truth-id」，不复述新真相、不改旧行原文。 |
| `③` | D1–D10 漂移不设默认立场：每处在所属簇的 executional 题中按「采纳并登记 / 回退到 DNMS01 / 重设计」三类之一裁决。`-11`「clamp 进 durable audit」与 `-15`「不静默 clamp、不新建 audit」的内部矛盾随 D2 / D4 所属题一并消解，指针同时指向两行。 |
| `④` | 冻结期纪律：本册冻结前不新增漂移、不做 hotfix 式回退。`B11` 所列纯缺陷修复同样等计划落地后统一进行。 |
| `⑤` | `async-compaction.md` 不再修订。`closure/DNMS01-closure.md` 的过时陈述随计划收尾统一修订。 |

> **下游约束**：计划不得以现行代码或 DNMS01 旧行单独作为合同来源。任何漂移处置必须引用一条 `T-O-ACE1117-*`。最终指针表以问答 §9.5 为准，§2.9 是投影，不用 Q10 题面那张误列表。

#### `T-O-ACE1117-02` —— 协议层复用，语义层自有

> **来源**：`Round 1 / Q2（[业主] 同意推荐 B）` ｜ **驱动后续**：`-03`、`-04`；`-02④` 由 `-04③` 终止

| 条款 | 已冻结内核 |
|------|------------|
| `①` | 协议层原样复用宿主公开协议、不分叉：`CompactionEngine` 三方法、`compaction/start → summary → checkpoint user/message（surfaceOp.replace + compactCheckpointSource）→ end` 括号、六失败码、`sourceCommandId`、shrink 校验、表面稳定性断言、no-cap 维持 `-16` 原文。协议层必需的宿主私有原语副本（`BlockAssembler`、`errorChain` 等）保留，改为「来源版本 + 内容 hash」由测试锁定。 |
| `②` | 语义层由 [DNMSC] 自有、以 `T-O-ACE1117-*` 为合同：切点选择（`compact-region.js:357-386`）、摘要指令（`:190-225`）、checkpoint 帧文本（`:248-258`）、模型告知内容，不再以「与 `compaction-basic` 逐字一致」为约束。对应「verbatim port」标注与宿主副本退役重写，来源注释改为本册 truth-id。[DNMS] `lib/compact-prompt.js` 手抄副本进入单一真源处置。 |
| `③` | 不可放弃的安全不变量：tool-call / tool-result 不拆（用包根 `toolPairingBalancedBefore/After`）；surface 头部 `system/message` 不被遮蔽；单个 surface 节点不切半；shrink 校验与稳定性断言照旧；OFF 态零影响。 |
| `④` | 新增 model-facing 工具不在本题放开，仍受 DNMS01 `-11`、`-13` 否决约束，直到专题裁决。 |
| `⑤` | [nano-agent] 只作语义参照（`B04`）。本条限定 `-16`「按 [dsh] 契约重实现」的读法：协议层按契约，语义层按本册。 |

> **下游约束**：语义层任何新行为必须先有 `T-O-ACE1117-*`。改语义不得触碰协议层与安全不变量。

### 2.3 切点语义与预算

#### `T-O-ACE1117-03` —— 分级语义切点

> **来源**：`Round 2 / Q3（[业主] 同意推荐 B）` ｜ **驱动后续**：`-07①`（step 补偿）、`-08`（预算数值）

| 条款 | 已冻结内核 |
|------|------------|
| `①` | 切点按 turn 边界 → step 边界 → 平衡节点边界三级选择，取满足预算约束的最高一级。边界来自宿主公开事件 `turn/start`、`step/start`（`@deepseek-ai/dsh-session/lib/types/types.d.ts:268-292`）。 |
| `②` | 保留预算从「累计到 `>=` 即停」的硬上限改为目标值，受上限（不得妨碍该 lane 的回落要求，例如同步 FULL 必须降到阈值以下）与下限（保留尾部不得为空）约束。目标、上下限的数值与公式留给 executional 题。 |
| `③` | async、同步 FULL、overflow、手动 `/compact` 四条 lane 共用同一个选择器，只传入不同预算。旧节点算法直接退役，不保留为可选模式。 |
| `④` | 每次选择记录实际边界级别（turn / step / node）与保留量。观测面落点按 `-01③` 另题裁决。 |
| `⑤` | 降级到 step 级时必须有语义补偿（当前 turn 的开场请求不能只剩转述）。补偿方式由 `-04` 与 prompt 簇裁决。 |
| `⑥` | `-02③` 的安全不变量与 `validateSurfaceRegion`（`compact-region.js:388-406`）校验不变。 |

> **下游约束**：计划不得保留节点算法作为并行模式。任何 lane 不得绕过统一选择器。`②④⑤` 的留口已关闭，见 §4.4。

#### `T-O-ACE1117-08` —— 切点预算与 checkpoint 帧

> **来源**：`Round 4 / Q8（[业主] 同意推荐 B）` ｜ **驱动后续**：无

| 条款 | 已冻结内核 |
|------|------------|
| `①` | 目标值：`pinnedAsyncTokens`、`pinnedFullTokens` 保留名称，语义从「保留量」改为「目标保留量」。async 目标 `effectivePin = min(pinnedAsyncTokens, floor(0.15·W))`，arm 时冻结。同步 FULL、手动 `/compact`、overflow 目标为 `pinnedFullTokens`，safety-only 时为 0（由下限兜底）。面板文案改为「目标」。`PIN_FRACTION`、`windowMin`、DC-1 不变。 |
| `②` | 上限 = `floor(回落线 × W) − system 头部 tokens − 8192`。async 回落线为 H。同步 FULL、手动、overflow 沿用现有判定（safety-only 为 S，否则为 B，`host-compaction.js:559`）。8192 为 checkpoint 预留常量，写在选择器内并由测试锁定。目标高于上限时按上限选，属选择器内部取值、不改写策略文件，不是 `-15` 所禁止的 clamp。 |
| `③` | 下限：保留尾部至少一个完整平衡节点。 |
| `④` | 选择规则：候选 = 保留量落在 [下限, 上限] 内的边界。依次在 turn、step、平衡节点三级中选保留量离目标最近者，同距取保留更多者。上限小于下限或三级均无候选时返回 null，各 lane 后续行为与现状一致（async 记 `no-range`，FULL 按 `requireBelowThreshold` 报错）。实际级别与保留量写入账本（`-03④`、`-06①`）。 |
| `⑤` | 帧（替换 `CHECKPOINT_PREAMBLE`，英文）：固定字段为替换条数、替换估计 tokens、保留尾部起始级别、本次 `compactionId`、inspection 工具名。说明「此前一段对话已被下方摘要替换以释放上下文；checkpoint 之后的消息是未改动的原文；需要原文时按 `compactionId` 用工具查看」。不写时间戳、模型名、prompt 版本。保留 `<compacted-summary>` 标签。帧中 node 级边界对模型表述为 `message`，账本仍记 `node`。帧与 `-07①` 的 prompt 结构要求由同一组测试锁定。 |
| `⑥` | 接替 DNMS01 `-15` 中 pinned 两字段的「保留量」语义。 |

> **下游约束**：任何 lane 不得以固定保留量绕过上下限。帧不得写入未提交的事实或易变字段。

### 2.4 模型知情面与 inspection

#### `T-O-ACE1117-04` —— checkpoint 帧是唯一告知载体

> **来源**：`Round 2 / Q4（[业主] 同意推荐 C）` ｜ **驱动后续**：`-06`（临时状态只给人看）、`-07`（指令与帧一致）、`-08⑤`、`-09`

| 条款 | 已冻结内核 |
|------|------------|
| `①` | checkpoint 帧是告知模型的唯一载体。帧不再要求「不承认」，改为说明已压缩、替换范围、保留起点与查回方式。摘要指令不得与帧矛盾（`compact-region.js:222` 一条随 prompt 簇重写）。不另发 `notice` 或其他 sourced 消息表述同一次压缩。 |
| `②` | 模型只被告知已提交的压缩。armed / running / failed 等临时状态不进入模型上下文，只给人看。 |
| `③` | 新增一个只读 inspection 工具（本仓首个 model-facing 工具）：只读；只看本会话；数据只来自 checkpoint 已记录的 `sourceEventSeqs`（`compact-region.js:504-507`）；不建索引、不存副本、不新增 durable 状态；仅当当前 surface 存在本插件写入的 checkpoint 时由 `ctx.tools.register` 的 `when` 条件暴露；OFF 态随 bundle 消失。 |
| `④` | 本条是该公共合同变更的唯一登记。全轮冻结时按 `-01②` 为 DNMS01 `-11`、`-13` 中「不新增 model-facing tool」追加接替指针。DNMS01 其余否决不受影响。 |
| `⑤` | 帧文本与字段、工具名称与参数 schema、输出大小控制留给 executional 题。 |

> **下游约束**：同一次压缩只能有一个模型可见表述。工具不得写入、不得跨会话。`⑤` 的留口已由 `-08⑤` 与 `-09` 关闭。

#### `T-O-ACE1117-09` —— `inspect_checkpoint` 合同

> **来源**：`Round 4 / Q9（[业主] 同意推荐 B）` ｜ **驱动后续**：无

| 条款 | 已冻结内核 |
|------|------------|
| `①` | 注册位置：[DNMSC] 新增子路径导出 `./tools`，在 patch 中作为独立行（`name: dsh-nano-model-selector-compaction/tools`）挂在每个被覆盖组合的工具行区，不进 `id: compaction` isolate 组（与 DNMS01 R-16.4「不得向 isolate 内 inject 白名单外服务」一致）。与 Provider 行由同一 `cordis.patch.yml` 写入、由 `gen-mutex-patch.mjs` 同时生成，OFF 时一并移除。只经 session 公开读面（`eventAt`、`deriveEventMessage`）工作，不读 Provider 内存，不建插件间通道。 |
| `②` | 名称与描述：`inspect_checkpoint`。描述为「只读查看某次上下文压缩替换掉的原始消息，`compactionId` 取自 checkpoint 帧」。 |
| `③` | 暴露条件：`when` 仅在当前 surface 存在本插件写入的 checkpoint 时返回 true。本插件 checkpoint 的识别方式在实施时从 `compaction/start` 记录确定并由测试锁定。 |
| `④` | 参数：`compactionId`（必填，可指向本会话中本插件写入的任一 checkpoint，含已被再次压缩的旧 checkpoint）；`offset`（默认 0）；`limit`（默认 20，上限 50），按原始消息条数分页。 |
| `⑤` | 输出：头部写 `compactionId`、原始消息总条数、本页范围、下一页 `offset`。正文只来自该 checkpoint `sourceEventSeqs` 中的被遮蔽段（不含括号自身的 `compaction/start`、`compaction/summary` 事件）。每条消息写角色与文本，工具调用写名称与参数，单条工具结果超过 2000 字符截断并注明原长，非文本内容写占位说明。单次输出总上限 24000 字符，达到即停并给出下一页位置。spill-policy 只作宿主通用兜底。 |
| `⑥` | 执行属性：只读，`isConcurrencySafe` 返回 true，不声明 `timeoutMs`。`presentCall` / `presentResult` 呈现「查看压缩前原文」与范围。 |
| `⑦` | 错误：`compactionId` 不属于本会话或不是本插件 checkpoint 时返回工具错误，并列出当前 surface 中可用的 `compactionId`。 |
| `⑧` | 本条兑现 `-04③⑤`。工具名与参数自此为公共合同，修改须回本册追加裁决。 |

> **下游约束**：工具不得写入、不得跨会话、不得建索引或副本。不得把工具注册进 isolate 组。`③` 的识别方式是实施期委托，见 `-11③`。

### 2.5 episode 生命周期与互斥

#### `T-O-ACE1117-05` —— 采纳 D6 调度，补上 engine 内互斥

> **来源**：`Round 3 / Q5（[业主] 同意推荐 B）` ｜ **驱动后续**：`-08`（各 lane 预算上限）；接替指针在 `-11①`

| 条款 | 已冻结内核 |
|------|------------|
| `①` | 调度采纳 D6：B 线越线即 arm，同一 pre-step 起摘要；摘要完成后在下一个 step 边界、请求组装前提交；turn 先结束时，agent 进入 idle 且摘要就绪即经 `agent.runMaintenance` 提交，不等下一条用户消息。`armed` 的 idle 分支（`host-compaction.js:177`）退役，文件头 `:8-12` 改为描述实际调度。 |
| `②` | 互斥：durable 括号仍只在提交瞬间打开，提交时复查未配对括号（`compact-region.js:639-645`）。新增 engine 内 session 级互斥，在途 episode 对所有入口可见。手动 `/compact` 与同步 FULL（S 线、DC-1、post-adoption over-health、换模型、overflow）先撤销在途 episode 再执行。async arm 在任何 lane 活跃时跳过。被抢占的 episode 记为 `preempted`，不计入 circuit。 |
| `③` | 失败处理：超时到点立即结算为 `timeout`，迟到结果丢弃；非 transient 失败按 turn 去抖；无窗口信息记录 `skip`（`no-window`）。 |
| `④` | episode 结算且 circuit 关闭时删除条目。`MAX_CLAIM_ATTEMPTS`、`claimAttempts` 退役。 |
| `⑤` | 接替 DNMS01 `-18①②`。`-18③④⑤⑦⑧⑨` 保留。 |

> **下游约束**：任何 lane 不得绕过 engine 内互斥。抢占不得计入 circuit。episode 状态机必须在有限时间内回到 `none`。超时数值不在本条，沿用 120 s 见 `-11②`。`disarmed` 的现行读法见 `CORR-1`，不在本条另立原因。

### 2.6 观测与 UI 心跳

#### `T-O-ACE1117-06` —— 已提交走 projection，在途走账本

> **来源**：`Round 3 / Q6（[业主] 同意推荐 B）` ｜ **驱动后续**：`-10③④`（入口与文案）

| 条款 | 已冻结内核 |
|------|------------|
| `①` | 账本采纳为引擎决策遥测（D4）：[DNMSC] 唯一写入、[DNMS] 只读、best-effort、轮转，不作权威、不作恢复读源。`-11`「clamp 进 durable audit」与 `-15`「不新建 durable audit 文件」按「不建权威审计、策略写入一律 400 拒绝不 clamp」消解。记录补充边界级别与保留量、`preempted`、`timeout`、`no-window`。 |
| `②` | 已提交事实走宿主 projection：[DNMS] 注册 session projection，折叠 `compaction/summary`、`compaction/end`、`compaction/prune` 得到 `lastCompaction`（兑现 `-21①`，替换 `index.js:428` 的 `null` 占位）。客户端用 `useProjection` 读取，零轮询。徽标 committed 态由 projection 推导，不再用 10 分钟时间窗口。projection 不可注册时按 `-21①` 的退化路径处理，不新增轮询。 |
| `③` | 在途状态只来自账本：客户端只有一个共享 store。在打开面板或对话框、`useSessionStatus.running` 变化、projection 推送时拉取。仅当会话运行中且有在途 episode 时以单一节奏续拉，落定即停。节奏写入 [DNMS] 性能声明（`B08`）。 |
| `④` | 4 个常驻定时器退役（`ModelSelector.jsx:298`；`AsyncStatusBadge.jsx:22-24,52`；`CompactPanel.jsx:102`；`AsyncHistoryDialog.jsx:37,103`）。bundle 库存只在打开面板与切换开关后读取。 |
| `⑤` | 接替 DNMS01 `-19①`、`-21④`，消解 `-11` / `-15`。`-21①` 要求落地。 |

> **下游约束**：临时状态不得写入 journal 或模型上下文。客户端不得新增常驻定时器。账本不得成为第二权威。续拉节奏与账本新字段格式是实施期委托，见 `-11③`。

### 2.7 prompt 单一真源

#### `T-O-ACE1117-07` —— 内置 prompt 承载合同，用户只能附加

> **来源**：`Round 3 / Q7（[业主] 同意推荐 B）` ｜ **驱动后续**：`-08⑤`（帧与 prompt 同一组测试）；`-15` 字段清单指针指向本条 `②`

| 条款 | 已冻结内核 |
|------|------------|
| `①` | 内置异步专用 prompt 是唯一真源，归 [DNMSC]：与帧一致、删除「不提压缩」（`compact-region.js:222`）、知道保留尾部存在、step 级降级时原文保留当前 turn 的开场用户请求、保留结构化段落与 prior checkpoint 合并规则（`:195-224`）。这些结构要求由测试锁定。摘要输入（system + 被遮蔽段 + tools，`:526-537`）不变。 |
| `②` | 全文覆盖退役（D3）：删除 `summaryPrompt`，改为只能追加在内置 prompt 专门段落之后的「附加要求」字段。硬切不迁移，含旧字段的文件被判 `invalid-schema` 并进入可见的 safety-only degraded。字段名与长度上限在实施时确定。`-15` 字段清单按 `-01②` 追加接替指针。 |
| `③` | `promptVersion` 继续是实际发送指令（内置 + 附加要求）的 sha256 前 8 位。 |
| `④` | 共享模块单一真源（D11）：prompt 与 `compact-policy.js` 以 [DNMSC] 为唯一来源，[DNMS] 副本由构建脚本生成（沿用 `lib/bindings.js` 烘焙模式），文件头标明生成文件，测试比较内容 hash。手抄的 `dsh-nano-model-selector/lib/compact-prompt.js` 退役。 |
| `⑤` | 面板显示只读内置 prompt、版本指纹与附加要求编辑框。「恢复默认」即清空附加要求。 |

> **下游约束**：任何用户输入不得删除或替换内置 prompt 的结构要求。[DNMS] 不得手改生成副本。字段名与长度上限是实施期委托，见 `-11③`，实施时不再另写指针。

### 2.8 阈值、组合覆盖与验收

#### `T-O-ACE1117-10` —— 剩余漂移、入口与既有检查

> **来源**：`Round 4 / Q10（[业主] 同意推荐 B）` ｜ **驱动后续**：无

| 条款 | 已冻结内核 |
|------|------------|
| `①` | D1 → 采纳 S=0.90。S 只读，PUT 携带即 400。删除 `LEGACY_SAFETY_RATIO` 读时兼容（`compact-policy.js:24-25`）。S≠0.90 的文件判 `invalid-range` 并进入可见 safety-only degraded。 |
| `②` | D2 → 回退严格顺序 `effectivePin/W < H < B < S < 1`。`H >= B`、`B >= S` 一律 400 不写。第一个不等式不满足时仍按 DC-1 标记 full-only、不拒绝写入（`-13`、`-15` 原读法不变）。删除 `compact-policy.js:13-14` 的「等号合法」注释，`DETAIL.zh.md:15` 与 `:16` 收敛为严格顺序，`test/compact-policy.test.mjs` 的等号用例改为拒绝用例。 |
| `③` | D8 → 采纳顶栏入口。位置、显示条件（仅 companion 已安装时）与水位图标按 [DNMS] `AGENTS.md` 面板入口节登记。rail 保持模型分类用途。 |
| `④` | D9 → 重设计。i18n key 的数量与名称不作合同，只要求中英两份完整对应。补开关切换确认。`-20`「切换确认与四类结果」保留。localStorage 缓存键要求退役。 |
| `⑤` | D10 → 回退覆盖 base 扁平行。`gen-mutex-patch.mjs` 以 `config.plugins` 全重放为互斥机制，覆盖 base 扁平行与 4 个 preset 组。ON 态 base 扁平 `compaction-basic` 为 `disabled`。Provider 行与 `-09` 的工具行同步写入。sdk、acp 等非 web 组合不在本包范围。现有 `VERSION_GUARDED_ROWS` 机制不变。 |
| `⑥` | 验收只用既有入口，必要时在既有测试文件内增改用例，不新增 release-gate、不改 `RELEASE.md`：[DNMSC] `test/compact-policy.test.mjs`、`async-takeover.test.mjs`、`host-cordis-smoke.test.mjs`；[DNMS] `test/` 下既有测试（`async-history`、`history-format`、`water-line` 等）；仓根 `scripts/check-ui-rules`、`check-client-rules`、`check-route-sensitivity`、`check-feature-contract`、`check-clean-lib`、`test-all`。只读证据重放按评估 §2.3 的方法对新构建会话重跑，对照 `B10` 的「turn 中间切点 242/260」「尾部无 user 39/260」。`/tmp/dnms-evidence/` 脚本只是当次工具、不是交付物。 |
| `⑦` | DNMS01 收尾：接替指针按 §9.5 最终表一次性写入（`-01②`）。`closure/DNMS01-closure.md` 随计划收尾修订（`:20` 唤醒消息描述改为指向 `-05`，`:74` 待移动项按原计划处理）。 |

> **下游约束**：计划不得重新引入等号、S 读时兼容或客户端缓存键。验收不得新增 gate。严格顺序继续有效，不得再判成被接替。`⑦` 所指的表以问答 §9.5 为准，§2.9 是投影，不是 Q10 题面那张表。

### 2.9 收口登记

#### `T-O-ACE1117-11` —— 全册审计的读法、委托与残留

> **来源**：`收口审计（问答 §9.3）` ｜ **驱动后续**：无。本行不是新裁决
>
> `-11②` 里 `disarmed` 的理由原句不是现行合同。引用理由只以 §4.5 `CORR-1` 为准。格内结论句（保留、不计 circuit、与 `preempted` 同类）不变。原句不删。

| 条款 | 已冻结内核 |
|------|------------|
| `①` | 接替指针最终表以问答 §9.5 为准（下表即其投影）。它修正 Q10 题面⑦表的一处误列：就该误列的那一格而言，DNMS01 `-15` 的严格顺序被 `-10②` 回退保留、不被接替，被接替的只有 S=0.80。7 字段、pinned 语义、不新建 audit 仍是最终表的另几行。另补 `-16` 读法限定（`-02⑤`）、`-20` 的 S 文案与 R-16.1 / .3 / .6 三项。 |
| `②` | 派生读法：账本记录四条 lane 的每次选择（由 `-03③④` 与 `-06①` 推出，消解 `B11`「账本只覆盖异步 lane」）。`EPISODE_TIMEOUT_MS` 沿用现值 120 s（`host-compaction.js:66`，`-05` 未改数值）。现行「抬高 B 使在途 episode 撤销」（`disarmed`）属于 [业主] 显式意图，与 `preempted` 同类结算、不计入 circuit。`-02④` 的「model-facing 工具暂不放开」已由其自带的「直到专题裁决」条款随 `-04③` 终止。 |
| `③` | 实施期委托项（已冻真相明确交给实施，确定时不构成合同变更、不回本册登记）：在途续拉节奏（`-06③`，写入 [DNMS] 性能声明）；附加要求字段名与长度上限（`-07②`；`-15` 字段清单的指针已指向 `-07②`，无需再写指针）；本插件 checkpoint 的识别方式（`-09③`）；账本新增字段的具体格式（`-06①`）。 |
| `④` | 残留去向：DNMS01 Round 16 中 R-16.2（vendored seam 与 `ManualCompactionError` 类身份）、R-16.5（`dsh plugin add` 默认 ON 与 `-17` 默认 OFF 的矛盾）、R-17（preset 重放跨版本守卫）、R-18（客户端宿主导出守卫）不属于本册合同面，显式 defer。`B07` 只继承 `-17` 原文，不裁决 R-16.5。此后若需裁决，只能在本册 append-only 追加或由 [业主] 另立战役。DNMS01 R-16 所预留的 `T-O-DNMS01-23` / `-24` 不再启用（同时符合 `-22`「不设 Round 6」）。 |
| `⑤` | [业主] 四项担心（`B03`）、漂移 D1–D11、`B11` 缺陷的落点见下面覆盖矩阵的三张表（担心、漂移、`B11`），全部已有归属。 |

`②` 里 `disarmed` 的理由句不按字面引用。现行读法是 §4.5 `CORR-1`：disarm = 在途期间压缩条件消失，它不是失败。结论句不动：保留该行为，不计入 circuit，与 `preempted` 同类结算。原行不改字。

**接替指针最终表**（投影问答 §9.5，非新裁决）

| DNMS01 旧行 / 项 | 接替（或读法限定） |
|------------------|--------------------|
| `T-O-DNMS01-11`「clamp 进 durable audit」 | `T-O-ACE1117-06①` |
| `T-O-DNMS01-11`、`-13`「不新增 model-facing tool」 | `T-O-ACE1117-04④`、`-09` |
| `T-O-DNMS01-15` S=0.80 | `T-O-ACE1117-10①` |
| `T-O-DNMS01-15` 7 字段 schema | `T-O-ACE1117-07②` |
| `T-O-DNMS01-15` pinned 两字段「保留量」语义 | `T-O-ACE1117-08①⑥` |
| `T-O-DNMS01-15`「不新建 durable audit 文件」 | `T-O-ACE1117-06①` |
| `T-O-DNMS01-16`「按协议重实现」的适用范围 | `T-O-ACE1117-02⑤`（读法限定：协议层按契约，语义层按本册；不是整条作废） |
| `T-O-DNMS01-18①` 调度 | `T-O-ACE1117-05①` |
| `T-O-DNMS01-18②` one-active 的实现方式 | `T-O-ACE1117-05②` |
| `T-O-DNMS01-19①`「不建 audit」 | `T-O-ACE1117-06①` |
| `T-O-DNMS01-20` rail 第 4 图标入口 | `T-O-ACE1117-10③` |
| `T-O-DNMS01-20` 18 个 i18n key、localStorage 缓存键 | `T-O-ACE1117-10④` |
| `T-O-DNMS01-20` S 只读 0.80 文案 | `T-O-ACE1117-10①` |
| `T-O-DNMS01-21④` 客户端零轮询 | `T-O-ACE1117-06③④` |
| `DNMS01-qna.md` R-16.1 全重放互斥机制 | `T-O-ACE1117-10⑤` |
| `DNMS01-qna.md` R-16.3 异步车道 commit 归属 | `T-O-ACE1117-05①` |
| `DNMS01-qna.md` R-16.6 adoption-wake 可见性 | `T-O-ACE1117-04①`、`-05①` |
| `DNMS01-qna.md` R-16.2、R-16.5、R-17、R-18 | `T-O-ACE1117-11④`（显式 defer） |

未列出的 DNMS01 行（含 `-10`、`-13` 的 DC-1 与 `B≤H` 拒绝、`-15` 的严格顺序、`-17`、`-18③④⑤⑦⑧⑨`、`-20` 的切换确认、`-21①`）继续有效。

**覆盖矩阵**（投影问答 §9.4，非新裁决）

| [业主] 担心（`B03`） | 落点 |
|----------------------|------|
| ① 保留尾部按语义边界 | `-03`、`-08` |
| ② arm 时序、对模型的告知、inspection | `-04`、`-05`、`-08⑤`、`-09` |
| ③ UI 心跳（设置、诊断、对话内心流） | `-06`、`-07⑤`、`-10③④` |
| ④ 异步专用 prompt 管理 | `-07` |

| 漂移 | 处置 | truth |
|------|------|-------|
| D1 S 值 | 采纳 0.90 | `-10①` |
| D2 等号 | 回退严格 | `-10②` |
| D3 `summaryPrompt` | 重设计为附加要求 | `-07②` |
| D4 账本 | 采纳为遥测 | `-06①` |
| D5 轮询 | 重设计为双通道 | `-06②③④` |
| D6 调度 | 采纳 | `-05①` |
| D7 durable 锁 | 重设计为提交时括号 + engine 内互斥 | `-05②` |
| D8 入口 | 采纳顶栏 | `-10③` |
| D9 i18n / 缓存 | 重设计 | `-10④` |
| D10 组合覆盖 | 回退覆盖 base | `-10⑤` |
| D11 策略模块双份 | 单一来源构建生成 | `-07④` |

| `B11` 缺陷 | 落点 |
|------------|------|
| idle 提交死路径 | `-05①` |
| 摘要期间不持锁 | `-05②` |
| 超时只发 abort | `-05③` |
| `MAX_CLAIM_ATTEMPTS` 死常量 | `-05④` |
| 非 transient 失败无防抖 | `-05③` |
| episode 永不删除 | `-05④` |
| `info.context` 缺失静默 | `-05③`（`no-window`） |
| 账本只覆盖异步 lane | `-11②` |
| `armed` 在 UI 不可达 | `-05①`（arm 即进入 running）、`-06③` |
| runtime 不按 `sessionId` 取 | `-06②` |

> **下游约束**：计划只能引用本行的读法与清单。不得把委托项升级为新合同，也不得在 DNMS01 内重开残留项。

## 3. 收口（必须有）

- 形成史文档（评估、各轮中场评估、问答修订历史、§9.3 审计过程）只作测量指针，不在本文产生新裁决。
- 本文没有新建 Truth-ID。`B01`–`B13`、`01`–`11` 与 `CORR-1` 都来自问答 §1 与 §9.7。
- 与 [ACE-1117-qna.md](ACE-1117-qna.md) 冲突时以该问答为准，并修订本台账。§9.5 的最终表优先于 Q10 题面⑦，也优先于本台账里任何「只有 S=0.80」的缩句。`CORR-1` 优先于 `-11②` 里 `disarmed` 的理由原句；抄内核时不得把「抬高 B = [业主] 显式意图」当成现行理由。
- 下游 action-plan 不填写 Q/A，不修改本台账的规则句。计划 §2 只 CITE 本台账的 §1 总表与 §2 内核，不另写一套决定。内核里「留给 executional / 另题」按 `AF-4` 读作已关闭，不得当 OPEN 抄进计划。Q8–Q10 维持 foundational，不得降成可改细节。行号标偏处按 `AF-14` 读，不改目标句。
- 需要推翻时，回到原问答追加 supersession，再投影到本台账的对应行。不设 Round 5。

## 4. 启用的插件

> 只列触发成立的插件。六项全部触发：基线里有不产生新 ID 的测量；本册、DNMS01、评估与代码之间会有人读错谁压谁；本战役改了上游若干行的读法；冻结审计留下必须改读、但不改原句的注记；`CORR-1` 是事后更正；交接面有明确不做的项。

### 4.1 P1 · 基线事实层（测量指针，非新 `T-O`，本台账只 CITE）

| 事实 ID | 一句话 | 出处 |
|---------|--------|------|
| `B-HEAD` | 证据行号锚定问答基线 `main @ fb7264d`。2026-11-17 复核时 HEAD 仍是这一提交，标偏的是快照当时就偏，不是事后漂移。宿主 `@deepseek-ai/dsh@0.2.2-rc.1`。desktop profile `~/.dsh-desktop` 只读。`/tmp/dnms-evidence/` 是当次工具，不是交付物。引用行号以 `AF-14` 为准，不回改目标句 | 问答文首；`AF-14` |
| `B-ASSESS` | 评估的推荐、方案编号、Q-ACE 不是合同。R01–R50 与 §7 台账只是工作对象索引 | `B01` |
| `B-MEASURE` | `B10` 的计数与时延、`B11` 的缺陷清单是冻结了的测量输入，不是目标态 SLA。施工后不回改 | `B10`、`B11` |
| `B-AUDIT` | §9.3 审计只修读法并登记 `-11`。中场评估里的「预计」「待」是当时判断，按 append-only 留在问答里，不产生新裁决 | 问答 §9.3；修订历史 v1.0 |

> **裁决效力点名**：`B-ASSESS` 否定未经本册冻结的评估推荐。`B-MEASURE` 只保住「不再复议」，不把 15–76 s、242/260 写成必须命中的合同；验收要对照的两个比例在 `-10⑥`。`B-HEAD` 只约束行号。

### 4.2 P2 · 权威次序

[ACE-1117-qna.md](ACE-1117-qna.md)（decision provenance：§1 台账 + §9.5 最终表 + §9.7 `CORR-1` + 业主回答）> **本台账（投影面）** > ACE-1117 计划 / 各包 AGENTS（只 CITE）> ImplementationGrant。不一致时回到问答修订本台账，不得反向改问答。

同一事项上：本册新裁决压过被接替的 DNMS01 旧句；未被接替的 DNMS01 行压过现行代码与评估推荐。评估、中场 `file:line` 与 desktop 计数是测量，不是 [业主] 真相。`FROZEN` 不是代码 PASS。Q10 题面⑦里「`-15` 严格顺序被接替」一律作废。`-11②` 里 `disarmed` 的理由原句一律按 `CORR-1` 读。

### 4.3 P3 · 与上游真相的关系

| 上游 ID | 关系 | 回改上游正文 |
|---------|------|----------------|
| §2.9 接替表所列的 `T-O-DNMS01-*` 项与 R-16.1 / .3 / .6 | 接替或读法限定。指针已写入 `DNMS01-qna.md` 末尾与 `DNMS01-qna-truth.md` §4.5 `AMEND-4`–`AMEND-6`。新真相正文只在 `ACE-1117-qna.md`，本台账只投影 | 否 |
| 接替表未列出的 DNMS01 行 | 只消费，继续有效。点名继续有效的有 `-10`、`-13` 的 DC-1 与 `B≤H`、`-15` 的严格顺序、`-17`、`-18③④⑤⑦⑧⑨`、`-20` 的切换确认、`-21①` | 否 |
| `T-O-DNMS01-6` | 只消费。`B02` 沿用其「不兼容 / 硬切」读法 | 否 |
| `T-O-DNMS01-7` | 只消费。`B04`、`-02⑤` 维持只作语义参照 | 否 |
| `T-O-DNMS01-22` | 只消费。不设 Round 6。预留的 `T-O-DNMS01-23` / `-24` 不再启用 | 否 |
| `T-O-PRE1116-13.2`、`13.4` | 只消费。`B08`：[DNMSC] 不接入、不声明、不依赖 DNPR | 否 |
| 仓根 `AGENTS.md` 七原则、UI 宿主优先、`.agents/worktrees` | 只消费（`B02`、`B09`、`B13`） | 否 |
| `docs/specs/dsh-nano-ui/DESIGN.md` | 只消费（`B09`） | 否 |
| `async-compaction.md` | 形成史。`-01⑤` 不再修订 | 否 |
| `closure/DNMS01-closure.md` | 计划收尾时按 `-10⑦` 修订过时陈述。本台账不改它 | 否 |

### 4.4 P4 · 冻结审计注记（append-only，不改内核原句）

> `AF-1`：Q10 题面⑦把 DNMS01 `-15` 的严格顺序列为被接替。**就该误列的那一格而言**，严格顺序**一律读作**不被接替，`-10②` 是回退保留；那一格里被接替的只有 S=0.80。不得把这句「只有」扩成「`-15` 只动了 S」。7 字段、pinned「保留量」语义、不新建 audit 仍以问答 §9.5 的另行为准。权威是问答 §9.5，§2.9 只是投影。题面不改字。
>
> `AF-2`：`-10②` 的「一律 400」**不得读成**全部不等式违反都拒绝写入。`effectivePin/W < H` 不满足时仍是 DC-1 full-only、不拒绝写入。`H >= B` 与 `B >= S` 才是 400 不写。
>
> `AF-3`：`-08②` 选择器内部改按上限取值 **一律读作**不是 `-15` 所禁止的 clamp。不改写策略文件。
>
> `AF-4`：`-03②` 的「数值与公式留给 executional」、`-03④` 的「观测面另题」、`-03⑤` 的「补偿方式另题」、`-04⑤` 的「帧与工具 schema 留给 executional」**一律读作已经关闭**。分别关闭于 `-08`、`-06`、`-07①`、`-08⑤` 与 `-09`。不是 OPEN。
>
> `AF-5`：`-02④`「工具暂不放开，直到专题裁决」**一律读作**已由 `-04③` 终止。不是仍在否决 inspection 工具。
>
> `AF-6`：`B03`「怎么做由后续题裁决」、`B11`「修复路径由后续题决定」**一律读作已关闭**。落点是 §2.9 覆盖矩阵。`B11`「账本只覆盖异步 lane」**一律读作**已被 `-11②` 消解：四条 lane 的每次选择都记账。
>
> `AF-7`：帧里的 `message` 与账本里的 `node` **一律读作**同一个 node 级边界的两种写法（`-08⑤`），不是两套切点。
>
> `AF-8`：`-07②`「字段名与长度上限在实施时确定」**不得读成**实施时再写一次接替指针。指针已经指向 `-07②`（`-11③`）。确定字段名不构成合同变更，不回本册登记。同理适用于续拉节奏、checkpoint 识别方式、账本新字段格式。
>
> `AF-9`：`B07` 继承的「默认 OFF」**不裁决** R-16.5。`dsh plugin add` 默认 ON 与 `-17` 默认 OFF 的矛盾显式 defer。不得用现行安装行为改写 `B07`。
>
> `AF-10`：`-05⑤` 保留清单写了 `-18③④⑤⑦⑧⑨`，没有点名 `-18⑥`。**一律读作** ⑥ 未被接替。它不在 §2.9 接替表内，继续按 DNMS01 `-18⑥` 原文。本注记不新裁决，也不复述那一条。
>
> `AF-11`：`-01` 行尾「D3 并入 Q4」是 Round 1 当时的路线句。D3 **一律读作**已关闭于 `-07②`，不表示仍挂在 Q4。D1 / D2 / D8 / D9 / D10 虽落在被指定为 foundational 级的 Round 4，裁决效力不因此降成可改的执行细节。
>
> `AF-12`：`-11②` 里 `disarmed` 的理由原句「属于 [业主] 显式意图」**一律改读为** `CORR-1`。结论句（保留、不计 circuit、与 `preempted` 同类）不改。内核原句保持不动。
>
> `AF-13`：问答各中场里的「预计」「待」**一律读作**提问当时的判断。全轮已收口，不构成 Round 5 或未决槽。`-01③` 写「executional 题」是 Round 1 的路线句；D1 / D2 / D8 / D9 / D10 已在 Round 4 关闭，不因当时用了 executional 这个词就降成可改细节（同 `AF-11`）。
>
> `AF-14`：下列行号在 `fb7264d` 上就标偏或过宽，不是事后漂移。内核原句与问答同文，不改字。引用代码时以下列为准，不回改目标句。
>
> - `B11` 的 `compact-region.js:592-595,609-645` **不得读成**「不持锁」的实现位置。`:593-595` 是过时注释，写的是锁跨过异步间隙。不持锁的现行位置是 `dsh-nano-model-selector-compaction/lib/compact-region.js:604-609`（`deferStart`）、`:633`（推迟 `append('compaction/start')`）、`:639-645`（`openBracket`）。`host-compaction.js:376` 的 `deferStart: true` 仍准。
> - `-03①` 的 `@deepseek-ai/dsh-session/.../types.d.ts:268-292` 本仓没有这个文件。**不得当成已在 HEAD 复核过的行号**。合同只认宿主公开事件名 `turn/start`、`step/start`。
> - `-08②` 的 `host-compaction.js:559` 只落在 `_compactPressure`：`safetyOnly ? SAFETY_RATIO : bufferSizeAsync`，比较在 `:560`。同步 FULL 与换模型走这里。手动 `compactNow`（`:692-698`）与 overflow（`:534-539`）现行不读该行，`selectCompactableRange` 的 retain 传 0。目标句「safety-only 为 S，否则为 B」不改；不要用 `:559` 去找手动和 overflow 的现状。
> - `B11` 与 `-06②` 的 `index.js:428` **一律读作** `runtime(null, W, null)` 的第一个实参，也就是不按 `sessionId` 取。`lastCompaction` 的折叠在 `dsh-nano-model-selector/lib/compact-runtime.js:111-129` 与 `:159-171`。字面 `lastCompaction: null` 只在 handle 缺失的 `??` 回退里。目标仍是兑现 `-21①`。
> - `-06④` 的徽标定时器只认 `AsyncStatusBadge.jsx:52`（`:22-24` 是间隔常量）。历史对话框只认 `AsyncHistoryDialog.jsx:103`（`:37` 是间隔常量，`:99-102` 是未就绪则不排程的门）。`ModelSelector.jsx:298` 与 `CompactPanel.jsx:102` 仍是 `setInterval`。
> - `-07①` 的 `:195-224` **一律拆读**：结构化段落标题是 `compact-region.js:195-217`；prior checkpoint 合并只有 `:224`。`:222` 仍单列为必须删除的「不提压缩」，不要包进保留跨度。`:526-537` 不动。
> - `-10①` 的 `compact-policy.js:24-25` **一律再包含** [DNMSC] 与 [DNMS] 两份 `lib/compact-policy.js` 的 `readState` `:233-236`。`:24-25` 只是 `LEGACY_SAFETY_RATIO = 0.80` 的声明；读时把 0.80 抬成 0.90 在 `:233-236`。

### 4.5 P5 · 修正案（改的是某条的读法，被修正正文保持不动）

| 修正案 | 改读法的对象 | 生效句 | 旧正文 |
|--------|----------------|--------|--------|
| `CORR-1`（2026-11-17，[业主] 同意追加） | `T-O-ACE1117-11②` 中 `disarmed` 的理由 | disarm = 在途期间压缩条件消失；它不是失败。判定是 episode 在途期间某个 step 边界的 fill 低于 B（`host-compaction.js:614-616`），就撤销在途摘要、丢弃结果、账本记 `drop` / `disarmed`、journal 无痕（`:338-357`）。触发可以是调高 B、换成窗口更大的模型，或 tool-result-pruner 裁剪使 fill 回落。结论不变：保留该行为，不计入 circuit，与 `preempted` 同类结算 | 不回改 |

### 4.6 P6 · 残项、不得重开、授权边界

- **残项**：四项实施期委托（在途续拉节奏、附加要求字段名与长度上限、本插件 checkpoint 的识别方式、账本新增字段的具体格式）；DNMS01 R-16.2、R-16.5、R-17、R-18 显式 defer。**阻塞当前真相出口：NO**。委托项确定时不构成合同变更、不回本册登记。defer 项此后只能在本册 append-only 追加，或由 [业主] 另立战役。
- **不得重开**：Q1–Q10 未选中的选项（§0 第 4 条）；D1–D11 已结算的处置。`-15` 的严格顺序继续有效，不得再判成被接替。不得重开的废弃形态包括：等号合法、S 的 0.80 读时兼容、localStorage 缓存键合同、rail 作为压缩入口、4 个常驻定时器、`summaryPrompt` 全文覆盖、节点算法作为并行模式、第二个开关、工具注册进 isolate、把账本 / runtime / UI 当恢复读源、帧「不承认」、临时状态进入模型上下文、同一次压缩的第二份模型可见表述、`T-O-DNMS01-23` / `-24`、Round 5。
- **仍然不授权**：implementation grant、远端、deploy、live、新增 release-gate、改 `RELEASE.md`、定版本号或发布节奏。发布授权归 [业主]（`B13`）。

## 修订

| 版本 | 日期 | 变更 |
|------|------|------|
| `0.1.0` | 2026-11-17 | 首版：从已冻结的 `ACE-1117-qna.md`（v1.1）投影 24 条 `T-O` 与 62 条细则，并投影 §9.4 覆盖矩阵、§9.5 接替指针最终表与 §9.7 `CORR-1`。启用 P1–P6。未新建 Truth-ID，未改问答，未授权实施 |
| `0.1.1` | 2026-11-17 | 三路只读复核（HEAD 仍为 `fb7264d`）。未新建 Truth-ID，未改问答，未改内核里与问答同文的目标句。补回 `-02②` 三处行号与 `CORR-1` 的 `:614-616`、`:338-357`。总表与 §0 收紧「本册」、Q4 落选 E、严格顺序继续有效、`-16` 只是读法限定。新增 `AF-14`：7 处行号标偏或过宽，引用时改读符号，原句不改 |
