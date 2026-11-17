# ACE-1117 Q&A · progressive（async-compaction-enhancement 下一阶段 · 业主决策册）

> **范围（scope）**：`ACE-1117` = async-compaction-enhancement 的下一阶段。专项完成 [ACE-1117-risk-assessment.md](ACE-1117-risk-assessment.md)（下称「评估」）定义的 [DNMSC] `dsh-nano-model-selector-compaction` 与 [DNMS] `dsh-nano-model-selector` 异步压缩面的升级与消债工作。
> **qna 位点**：`pre-charter（多轮）`。结构：2 轮 × 2 题 foundational（Q1–Q4）→ Round 3 三题 executional（Q5–Q7）→ Round 4 三题收口（Q8–Q10，[业主] 指定为 foundational 级）→ 全轮冻结（§9）→ 输出正式计划。
> **角色配置**：提问 `Droid（架构 agent）` · second-opinion `retired` · 裁决 `owner`（[业主]）
> **second-opinion 模式**：自 Round 1 起 `retired`（业主指令：不提供 second opinion 槽位）。
> **下游消费者**：ACE-1117 计划 §2 CITE；被接替的 `T-O-DNMS01-*` 行的 append-only 接替指针（形式见 `T-O-ACE1117-01②`，最终表见 §9.5）。
> **基线**：`main` @ `fb7264d`；证据按本基线读源码核对。宿主证据取自本机安装的 `@deepseek-ai/dsh@0.2.2-rc.1`（下文以 `@deepseek-ai/dsh-compaction*/…` 相对路径书写）。运行证据取自 desktop profile `~/.dsh-desktop`（只读），重放脚本在 `/tmp/dnms-evidence/`，它们是证据，不是交付物。
> **文档状态**：**`已冻结`**（2026-11-17；Baseline `B01–B13` + `T-O-ACE1117-01`–`-11` 全部冻结，全轮收口，见 §9；收口后更正见 §9.7）。**冻结不是实施完成，也不是 implementation grant。**

---

## 0. 分轮状态总览

| 轮次 | 题号区间 | 类型 | 焦点 | second-opinion | 状态 |
|------|----------|------|------|----------------|------|
| Baseline | `T-O-ACE1117-B01–B13` | baseline | 从 [业主] 心智模型、仓根原则、已冻结前序真相与评估事实继承的基线 | retired | **已冻结** |
| Round 1 | `Q1–Q2` | foundational | 真源归属与对账方式 · [DNMSC] 的语义主权边界 | retired | **已冻结**（`T-O-ACE1117-01/02`） |
| Round 2 | `Q3–Q4` | foundational | 保留尾部的语义单位 · 模型知情面的合同形态 | retired | **已冻结**（`T-O-ACE1117-03/04`） |
| Round 3 | `Q5–Q7` | executional | episode 生命周期与互斥 · 观测与 UI 心跳 · prompt 单一真源与管理 | retired | **已冻结**（`T-O-ACE1117-05/06/07`） |
| Round 4 | `Q8–Q10` | foundational 级 · 收口 | 切点预算与 checkpoint 帧 · inspection 工具合同 · 阈值、组合覆盖与收尾 | retired | **已冻结**（`T-O-ACE1117-08/09/10`） |
| 收口 | §9 | closure | 全册审计、覆盖矩阵、DNMS01 接替指针、收口声明 | retired | **已冻结**（`T-O-ACE1117-11`） |

---

## 1. ★ Truth-Gate 台账（已锁定真值 · NORMATIVE · append-only across rounds）

> 命名空间：`T-O-ACE1117-*`，与正式计划 §2 共用。`B` 前缀为 baseline 真相：它们不是新裁决，而是把 [业主] 已确立的心智模型、仓根原则、前序已冻结真相与评估已核实事实在本阶段显式锚定，作为后续提问的约束。[业主] 可在本文件追加修订推翻任一条。

### 1.1 Baseline（随本文件冻结）

| Truth-ID | 子类型 | 已锁定真相（一句话） | 来源 | 下游约束 |
|----------|--------|----------------------|------|----------|
| `T-O-ACE1117-B01` | baseline | 本阶段名为 `ACE-1117`，工作对象是评估 §4 风险全清单（R01–R50，7 个业务簇 C1–C7）与 §7 工作台账（P0 7 项、P1 8 项、P2 7 项）；评估是**证据输入**，不是合同，其中的推荐、方案编号、Q-ACE 裁决项都不因写进评估而生效 | [业主] 本轮指令；评估 §0、§4、§7 | 计划只能以本文件冻结的 `T-O-ACE1117-*` 作为方向依据 |
| `T-O-ACE1117-B02` | baseline | 推荐方案的判据 = 仓根七原则（插件中立、上层建筑归 host、不得侧载、单一真源、不得擅自扩约、不得过度仪式、worktree）+ 本阶段四原则：**能硬切就不双写、能彻底退役就不兼容、平台保持中立、不耦合私域**，并服从「长期治理、拒绝 hotfix」；四原则读法沿用 `T-O-DNMS01-6`：「不兼容」指合同面而非 UX 回退，「硬切」指切换时刻原子、无重叠 | 仓根 `AGENTS.md` 核心工作原则；`docs/specs/dsh-nano-model-selector/qna/DNMS01-qna-truth.md:54` | 每题推荐须逐条过此判据 |
| `T-O-ACE1117-B03` | baseline | [业主] 本轮提出的四项担心是**本阶段必答范围**：① 保留尾部按语义边界截取，而不是按 token 绝对值硬切；② 异步压缩的 arm 时序与对话时序中，对 LLM AGENT 的心跳管理（告知已压缩、上下文已替换、什么变了、什么没变）以及 checkpoint 内容的 inspection 工具；③ UI 上的心跳管理（async 设置、async 诊断、对话内心流）；④ 异步压缩专用默认 PROMPT 的管理。**怎么做由后续题裁决**，但计划不得遗漏任一项 | [业主] 本轮指令；评估 §5.1–§5.4 | 计划须为四项各给出落点或经 [业主] 裁决的显式 defer |
| `T-O-ACE1117-B04` | baseline | [nano-agent] 只作**语义参照**：不 import 代码、不复制 D1/Queue/DO/cron、不建侧载通道（继承 `T-O-DNMS01-7`）；[nano-agent] 的 `docs/truth/context/frozen/` 仍为 Owner freeze PENDING，其 FT-* 不是 [dsh-nano] 的合同来源；评估中引用的 nano 设计，只有经本册冻结为 `T-O-ACE1117-*` 才生效 | `DNMS01-qna-truth.md:55`；评估 §1.1；仓根 `AGENTS.md`「插件中立」「不得侧载」 | 任何推荐不得以「nano 已经这样做」作为唯一理由 |
| `T-O-ACE1117-B05` | baseline | 宿主边界不变：[DNMSC] 只经宿主公开面工作——`ctx.compaction` seam 及其包根导出（`CompactionEngine`、`CompactionId`、`ManualCompactionError`、`compactCheckpointSource`、`isCompactCheckpointSource`、`toolPairingBalancedAfter/Before`）、`agent/*` 钩子、session journal 与 `surfaceOp.replace`；宿主缺口（如 `CompactionNodeView` 无异步变体）只登记、不修补；不改宿主文件、不嫁接宿主 DOM | `@deepseek-ai/dsh-compaction/lib/index.js:175`；`@deepseek-ai/dsh-compaction/lib/types/index.d.ts:14-27,102`；`DNMS01-qna-truth.md:51`；`dsh-nano-model-selector/AGENTS.md`（徽标节「上层建筑归 host」） | 方案不得依赖宿主未导出实现或改写宿主行为 |
| `T-O-ACE1117-B06` | baseline | durable 真值分层不变：一次压缩的权威是 session journal 的 `compaction/start → compaction/summary → checkpoint user/message（surfaceOp.replace + compactCheckpointSource）→ compaction/end` 括号；任何账本、runtime 字段、UI 状态都是派生，不作恢复读源 | `DNMS01-qna-truth.md:50,64`（`-2`、`-16`）；`dsh-nano-model-selector-compaction/AGENTS.md`（Audit ledger 节） | 新增观测或心跳面不得成为第二权威 |
| `T-O-ACE1117-B07` | baseline | 开关与交付形态不变：ON/OFF 唯一 canonical 是 `dsh.profile.bundles` 成员资格；install ≠ 接管、默认 OFF；一仓两包；OFF 态 [dsh] 原生 `compaction-basic` 全部回来，本阶段任何语义只在 ON 态生效 | `DNMS01-qna-truth.md:57,60,62,65`（`-9`、`-12`、`-14`、`-17`） | 不得引入第二个开关或 OFF 态残留行为 |
| `T-O-ACE1117-B08` | baseline | [DNMSC] 不接入 DNPR：不加性能声明、不加 DNPR 依赖、不加构建戳；压缩 UI 的性能量测只能落在 [DNMS] 自己的声明里，新指标先进 audit | `T-O-PRE1116-13.2`、`13.4`（`docs/code-review/26-nov/PRE-1116-qna.md` §1.2）；`docs/specs/dsh-nano-performance-review/spec-26nov.md:43,305` | perf 对齐只动 [DNMS] |
| `T-O-ACE1117-B09` | baseline | nano-ui 纪律不变：`docs/specs/dsh-nano-ui/DESIGN.md` 是唯一规格；宿主 primitive → nano-ui → 插件内实现并标 `nano-ui-exempt` 的顺序；不嫁接宿主 DOM、不写十六进制色值、不以 unicode 作图标 | 仓根 `AGENTS.md`「UI 宿主优先」；`docs/specs/dsh-nano-ui/DESIGN.md:10-28,209-217` | 压缩 UI 改造必须过 `check-ui-rules` 与 §10 登记 |
| `T-O-ACE1117-B10` | baseline | 评估已核实的运行事实作为输入，不再复议：desktop 174 会话、265 次压缩、260 次提交（98.1%）；异步 10 次 9 成功；7 次 arm 全部落在首次越过 B 的那一步；260 次提交后 orphan tool pair 为 0、摘要期间新追加消息 0 丢失；**242/260 切在 turn 中间、39/260 保留尾部无 user 消息**；当前构建异步 claim→commit 为 15–76 s（一例 340 s 由卡住的 step 造成）；7 次异步摘要均为真实 LLM 调用（输出 3.0k–4.2k tokens）；同步 FULL 阻塞 p50 31 s、最长 194 s | 评估 §2.3；`/tmp/dnms-evidence/turnsplit.json`、`retain.json`、`sessions.json` | 修复路径由后续题决定，事实本身不再复议 |
| `T-O-ACE1117-B11` | baseline | 评估已核实的代码缺陷作为输入，不再复议：idle 提交死路径（`host-compaction.js:177` 对 `:304`）；摘要期间不持 durable 锁（`:376`；`compact-region.js:592-595,609-645`）；超时只发 abort（`:315`）；`MAX_CLAIM_ATTEMPTS` 死常量（`:68`）；非 transient 失败无防抖（`:484,488-495`）；episode 只在内存且永不删除（`:95`）；`info.context` 缺失静默不压缩（`:596`）；账本只覆盖异步 lane；`armed` 在 UI 不可达；runtime 不按 `sessionId` 取（`dsh-nano-model-selector/index.js:428`） | 评估 §4.1 R26–R36、R13–R15 | 修复路径由后续题决定 |
| `T-O-ACE1117-B12` | baseline | 推翻 `T-O-DNMS01-*` 的任一旧行，只能 append-only：不改旧行原文、不在下游文档里改写；DNMS01 已有先例 `AMEND-1..3` | `DNMS01-qna-truth.md:25`（§0 第 8 条）、`:306-308` | Q1 的任何选项都必须满足本条 |
| `T-O-ACE1117-B13` | baseline | 不过度仪式：不新增 release-gate，不改 `RELEASE.md` 的发布流程，不定版本号与发布节奏；验收只用既有测试、既有检查脚本与只读证据重放；发布授权归 [业主] | 仓根 `AGENTS.md`「不得过度仪式」；`DNMS01-qna-truth.md:67`（`-19⑤`） | 计划的验收栏只引用既有检查 |

### 1.2 Round 裁决（append-only）

| Truth-ID | 子类型 | 已锁定真相（一句话） | 来源（Round / Q） | 驱动了哪些后续题 | 下游约束 |
|----------|--------|----------------------|--------------------|------------------|----------|
| `T-O-ACE1117-01` | foundational | **【Q1 冻结 · 真源接替】** ① 本册 `ACE-1117-qna.md` 是 [DNMSC]/[DNMS] 异步压缩面一切新裁决的**唯一 provenance**，ACE-1117 计划 §2 只 CITE `T-O-ACE1117-*`；`T-O-DNMS01-*` 中未被接替的行继续有效（开关与交付形态经 `B07` 显式继承）。② **接替指针 append-only**：全轮冻结时一次性在 `DNMS01-qna.md` 末尾追加「ACE-1117 接替」表、在 `DNMS01-qna-truth.md` §4.5 按 `AMEND-1..3` 先例追加 `AMEND-4…` 行，两处都只写「旧行/项 → 新 truth-id」，不复述新真相、不改旧行原文。③ **D1–D10 漂移不设默认立场**：每处在所属簇的 executional 题中按「采纳并登记 / 回退到 DNMS01 / 重设计」三类之一裁决；`-11`「clamp 进 durable audit」与 `-15`「不静默 clamp、不新建 audit」的内部矛盾随 D2/D4 所属题一并消解，指针同时指向两行。④ **冻结期纪律**：本册冻结前不新增漂移、不做 hotfix 式回退；`B11` 所列纯缺陷修复同样等计划落地后统一进行。⑤ `async-compaction.md` 不再修订；`closure/DNMS01-closure.md` 的过时陈述随计划收尾统一修订 | Round 1 / Q1（[业主] 同意推荐 B） | Round 2 Q3、Q4 的漂移处置（D3 并入 Q4 相关的 prompt 面；D1/D2 不在本轮） | 计划不得以现行代码或 DNMS01 旧行单独作为合同来源；任何漂移处置必须引用一条 `T-O-ACE1117-*` |
| `T-O-ACE1117-02` | foundational | **【Q2 冻结 · 分层主权】** ① **协议层原样复用宿主公开协议、不分叉**：`CompactionEngine` 三方法、`compaction/start → summary → checkpoint user/message（surfaceOp.replace + compactCheckpointSource）→ end` 括号、六失败码、`sourceCommandId`、shrink 校验、表面稳定性断言、no-cap 维持 `-16` 原文；协议层必需的宿主私有原语副本（`BlockAssembler`、`errorChain` 等）保留，改为「来源版本 + 内容 hash」由测试锁定。② **语义层由 [DNMSC] 自有、以 `T-O-ACE1117-*` 为合同**：切点选择（`compact-region.js:357-386`）、摘要指令（`:190-225`）、checkpoint 帧文本（`:248-258`）、模型告知内容，不再以「与 `compaction-basic` 逐字一致」为约束；对应「verbatim port」标注与宿主副本退役重写，来源注释改为本册 truth-id；[DNMS] `lib/compact-prompt.js` 手抄副本进入单一真源处置。③ **不可放弃的安全不变量**：tool-call/tool-result 不拆（用包根 `toolPairingBalancedBefore/After`）、surface 头部 `system/message` 不被遮蔽、单个 surface 节点不切半、shrink 校验与稳定性断言照旧、OFF 态零影响。④ 新增 model-facing 工具**不在本题放开**，仍受 DNMS01 `-11`、`-13` 否决约束，直到专题裁决。⑤ [nano-agent] 只作语义参照（`B04`）；本条限定 `-16`「按 [dsh] 契约重实现」的读法：协议层按契约，语义层按本册 | Round 1 / Q2（[业主] 同意推荐 B） | Round 2 Q3（切点语义单位）、Q4（模型知情面与 model-facing 工具专题） | 语义层任何新行为必须先有 `T-O-ACE1117-*`；改语义不得触碰协议层与安全不变量 |
| `T-O-ACE1117-03` | foundational | **【Q3 冻结 · 分级语义切点】** ① 切点按 **turn 边界 → step 边界 → 平衡节点边界** 三级选择，取满足预算约束的最高一级；边界来自宿主公开事件 `turn/start`、`step/start`（`@deepseek-ai/dsh-session/lib/types/types.d.ts:268-292`）。② 保留预算从「累计到 `>=` 即停」的硬上限改为**目标值**，受**上限**（不得妨碍该 lane 的回落要求，例如同步 FULL 必须降到阈值以下）与**下限**（保留尾部不得为空）约束；目标、上下限的数值与公式留给 executional 题。③ async、同步 FULL、overflow、手动 `/compact` **四条 lane 共用同一个选择器**，只传入不同预算；旧节点算法直接退役，不保留为可选模式。④ 每次选择记录实际边界级别（turn / step / node）与保留量；观测面落点按 `-01③` 另题裁决。⑤ 降级到 step 级时**必须有语义补偿**（当前 turn 的开场请求不能只剩转述），补偿方式由 `-04` 与 prompt 簇裁决。⑥ `-02③` 的安全不变量与 `validateSurfaceRegion`（`compact-region.js:388-406`）校验不变 | Round 2 / Q3（[业主] 同意推荐 B） | Round 3 Q7（补偿写进 prompt）；Round 4 切点参数题 | 计划不得保留节点算法作为并行模式；任何 lane 不得绕过统一选择器 |
| `T-O-ACE1117-04` | foundational | **【Q4 冻结 · 模型知情面】** ① **checkpoint 帧是告知模型的唯一载体**：帧不再要求「不承认」，改为说明已压缩、替换范围、保留起点与查回方式；摘要指令不得与帧矛盾（`compact-region.js:222` 一条随 prompt 簇重写）；不另发 `notice` 或其他 sourced 消息表述同一次压缩。② **模型只被告知已提交的压缩**；armed / running / failed 等临时状态不进入模型上下文，只给人看。③ **新增一个只读 inspection 工具**（本仓首个 model-facing 工具）：只读；只看本会话；数据只来自 checkpoint 已记录的 `sourceEventSeqs`（`compact-region.js:504-507`），不建索引、不存副本、不新增 durable 状态；仅当当前 surface 存在本插件写入的 checkpoint 时由 `ctx.tools.register` 的 `when` 条件暴露；OFF 态随 bundle 消失。④ 本条是该公共合同变更的**唯一登记**；全轮冻结时按 `-01②` 为 DNMS01 `-11`、`-13` 中「不新增 model-facing tool」追加接替指针，DNMS01 其余否决不受影响。⑤ 帧文本与字段、工具名称与参数 schema、输出大小控制留给 executional 题 | Round 2 / Q4（[业主] 同意推荐 C） | Round 3 Q6（临时状态只给人看）、Q7（指令与帧一致、补偿）；Round 4 帧字段与工具 schema 题 | 同一次压缩只能有一个模型可见表述；工具不得写入、不得跨会话 |
| `T-O-ACE1117-05` | executional | **【Q5 冻结 · episode 生命周期与互斥】** ① **调度采纳 D6**：B 线越线即 arm，同一 pre-step 起摘要；摘要完成后在下一个 step 边界、请求组装前提交；turn 先结束时，agent 进入 idle 且摘要就绪即经 `agent.runMaintenance` 提交，不等下一条用户消息；`armed` 的 idle 分支（`host-compaction.js:177`）退役，文件头 `:8-12` 改为描述实际调度。② **互斥**：durable 括号仍只在提交瞬间打开，提交时复查未配对括号（`compact-region.js:639-645`）；新增 engine 内 session 级互斥，在途 episode 对所有入口可见；手动 `/compact` 与同步 FULL（S 线、DC-1、post-adoption over-health、换模型、overflow）先撤销在途 episode 再执行；async arm 在任何 lane 活跃时跳过；被抢占的 episode 记为 `preempted`，不计入 circuit。③ **失败处理**：超时到点立即结算为 `timeout`，迟到结果丢弃；非 transient 失败按 turn 去抖；无窗口信息记录 `skip`（`no-window`）。④ episode 结算且 circuit 关闭时删除条目；`MAX_CLAIM_ATTEMPTS`、`claimAttempts` 退役。⑤ 接替 DNMS01 `-18①②`；`-18③④⑤⑦⑧⑨` 保留 | Round 3 / Q5（[业主] 同意推荐 B） | Round 4 Q8（各 lane 的预算上限）；Q10（DNMS01 接替指针） | 任何 lane 不得绕过 engine 内互斥；抢占不得计入 circuit；episode 状态机必须在有限时间内回到 `none` |
| `T-O-ACE1117-06` | executional | **【Q6 冻结 · 观测与 UI 心跳】** ① **账本采纳为引擎决策遥测**（D4）：[DNMSC] 唯一写入、[DNMS] 只读、best-effort、轮转，不作权威、不作恢复读源；`-11`「clamp 进 durable audit」与 `-15`「不新建 durable audit 文件」按「不建权威审计、策略写入一律 400 拒绝不 clamp」消解；记录补充边界级别与保留量、`preempted`、`timeout`、`no-window`。② **已提交事实走宿主 projection**：[DNMS] 注册 session projection，折叠 `compaction/summary`、`compaction/end`、`compaction/prune` 得到 `lastCompaction`（兑现 `-21①`，替换 `index.js:428` 的 `null` 占位）；客户端用 `useProjection` 读取，零轮询；徽标 committed 态由 projection 推导，不再用 10 分钟时间窗口；projection 不可注册时按 `-21①` 的退化路径处理，不新增轮询。③ **在途状态只来自账本**：客户端只有一个共享 store；在打开面板或对话框、`useSessionStatus.running` 变化、projection 推送时拉取；仅当会话运行中且有在途 episode 时以单一节奏续拉，落定即停；节奏写入 [DNMS] 性能声明（`B08`）。④ 4 个常驻定时器退役（`ModelSelector.jsx:298`；`AsyncStatusBadge.jsx:22-24,52`；`CompactPanel.jsx:102`；`AsyncHistoryDialog.jsx:37,103`）；bundle 库存只在打开面板与切换开关后读取。⑤ 接替 DNMS01 `-19①`、`-21④`，消解 `-11`/`-15`；`-21①` 要求落地 | Round 3 / Q6（[业主] 同意推荐 B） | Round 4 Q10（D8 入口、D9 文案与缓存键、接替指针） | 临时状态不得写入 journal 或模型上下文；客户端不得新增常驻定时器；账本不得成为第二权威 |
| `T-O-ACE1117-07` | executional | **【Q7 冻结 · prompt 单一真源与管理】** ① **内置异步专用 prompt 是唯一真源**，归 [DNMSC]：与帧一致、删除「不提压缩」（`compact-region.js:222`）、知道保留尾部存在、step 级降级时原文保留当前 turn 的开场用户请求、保留结构化段落与 prior checkpoint 合并规则（`:195-224`）；这些结构要求由测试锁定；摘要输入（system + 被遮蔽段 + tools，`:526-537`）不变。② **全文覆盖退役**（D3）：删除 `summaryPrompt`，改为只能追加在内置 prompt 专门段落之后的「附加要求」字段；硬切不迁移，含旧字段的文件被判 `invalid-schema` 并进入可见的 safety-only degraded；字段名与长度上限在实施时确定，`-15` 字段清单按 `-01②` 追加接替指针。③ `promptVersion` 继续是实际发送指令（内置 + 附加要求）的 sha256 前 8 位。④ **共享模块单一真源**（D11）：prompt 与 `compact-policy.js` 以 [DNMSC] 为唯一来源，[DNMS] 副本由构建脚本生成（沿用 `lib/bindings.js` 烘焙模式），文件头标明生成文件，测试比较内容 hash；手抄的 `dsh-nano-model-selector/lib/compact-prompt.js` 退役。⑤ 面板显示只读内置 prompt、版本指纹与附加要求编辑框，「恢复默认」即清空附加要求 | Round 3 / Q7（[业主] 同意推荐 B） | Round 4 Q8（帧文本与 prompt 一致）；Q10（`-15` 字段清单接替指针） | 任何用户输入不得删除或替换内置 prompt 的结构要求；[DNMS] 不得手改生成副本 |
| `T-O-ACE1117-08` | foundational | **【Q8 冻结 · 切点预算与 checkpoint 帧】** ① **目标值**：`pinnedAsyncTokens`、`pinnedFullTokens` 保留名称，语义从「保留量」改为「目标保留量」；async 目标 `effectivePin = min(pinnedAsyncTokens, floor(0.15·W))`，arm 时冻结；同步 FULL、手动 `/compact`、overflow 目标为 `pinnedFullTokens`，safety-only 时为 0（由下限兜底）；面板文案改为「目标」；`PIN_FRACTION`、`windowMin`、DC-1 不变。② **上限** = `floor(回落线 × W) − system 头部 tokens − 8192`；async 回落线为 H；同步 FULL、手动、overflow 沿用现有判定（safety-only 为 S，否则为 B，`host-compaction.js:559`）；8192 为 checkpoint 预留常量，写在选择器内并由测试锁定；目标高于上限时按上限选，属选择器内部取值、不改写策略文件，不是 `-15` 所禁止的 clamp。③ **下限**：保留尾部至少一个完整平衡节点。④ **选择规则**：候选 = 保留量落在 [下限, 上限] 内的边界；依次在 turn、step、平衡节点三级中选保留量离目标最近者，同距取保留更多者；上限小于下限或三级均无候选时返回 null，各 lane 后续行为与现状一致（async 记 `no-range`，FULL 按 `requireBelowThreshold` 报错）；实际级别与保留量写入账本（`-03④`、`-06①`）。⑤ **帧**（替换 `CHECKPOINT_PREAMBLE`，英文）：固定字段为替换条数、替换估计 tokens、保留尾部起始级别、本次 `compactionId`、inspection 工具名；说明「此前一段对话已被下方摘要替换以释放上下文；checkpoint 之后的消息是未改动的原文；需要原文时按 `compactionId` 用工具查看」；不写时间戳、模型名、prompt 版本；保留 `<compacted-summary>` 标签；帧中 node 级边界对模型表述为 `message`，账本仍记 `node`；帧与 `-07①` 的 prompt 结构要求由同一组测试锁定。⑥ 接替 DNMS01 `-15` 中 pinned 两字段的「保留量」语义 | Round 4 / Q8（[业主] 同意推荐 B） | — | 任何 lane 不得以固定保留量绕过上下限；帧不得写入未提交的事实或易变字段 |
| `T-O-ACE1117-09` | foundational | **【Q9 冻结 · inspection 工具合同】** ① **注册位置**：[DNMSC] 新增子路径导出 `./tools`，在 patch 中作为独立行（`name: dsh-nano-model-selector-compaction/tools`）挂在每个被覆盖组合的工具行区，不进 `id: compaction` isolate 组（与 DNMS01 R-16.4「不得向 isolate 内 inject 白名单外服务」一致）；与 Provider 行由同一 `cordis.patch.yml` 写入、由 `gen-mutex-patch.mjs` 同时生成，OFF 时一并移除；只经 session 公开读面（`eventAt`、`deriveEventMessage`）工作，不读 Provider 内存，不建插件间通道。② **名称与描述**：`inspect_checkpoint`；描述为「只读查看某次上下文压缩替换掉的原始消息，`compactionId` 取自 checkpoint 帧」。③ **暴露条件**：`when` 仅在当前 surface 存在本插件写入的 checkpoint 时返回 true；本插件 checkpoint 的识别方式在实施时从 `compaction/start` 记录确定并由测试锁定。④ **参数**：`compactionId`（必填，可指向本会话中本插件写入的任一 checkpoint，含已被再次压缩的旧 checkpoint）；`offset`（默认 0）；`limit`（默认 20，上限 50），按原始消息条数分页。⑤ **输出**：头部写 `compactionId`、原始消息总条数、本页范围、下一页 `offset`；正文只来自该 checkpoint `sourceEventSeqs` 中的被遮蔽段（不含括号自身的 `compaction/start`、`compaction/summary` 事件）；每条消息写角色与文本，工具调用写名称与参数，单条工具结果超过 2000 字符截断并注明原长，非文本内容写占位说明；单次输出总上限 24000 字符，达到即停并给出下一页位置；spill-policy 只作宿主通用兜底。⑥ **执行属性**：只读，`isConcurrencySafe` 返回 true，不声明 `timeoutMs`；`presentCall`/`presentResult` 呈现「查看压缩前原文」与范围。⑦ **错误**：`compactionId` 不属于本会话或不是本插件 checkpoint 时返回工具错误，并列出当前 surface 中可用的 `compactionId`。⑧ 本条兑现 `-04③⑤`；工具名与参数自此为公共合同，修改须回本册追加裁决 | Round 4 / Q9（[业主] 同意推荐 B） | — | 工具不得写入、不得跨会话、不得建索引或副本；不得把工具注册进 isolate 组 |
| `T-O-ACE1117-10` | foundational | **【Q10 冻结 · 阈值、组合覆盖与验收】** ① **D1 → 采纳 S=0.90**：S 只读，PUT 携带即 400；删除 `LEGACY_SAFETY_RATIO` 读时兼容（`compact-policy.js:24-25`），S≠0.90 的文件判 `invalid-range` 并进入可见 safety-only degraded。② **D2 → 回退严格顺序** `effectivePin/W < H < B < S < 1`：`H >= B`、`B >= S` 一律 400 不写；第一个不等式不满足时仍按 DC-1 标记 full-only、不拒绝写入（`-13`、`-15` 原读法不变）；删除 `compact-policy.js:13-14` 的「等号合法」注释，`DETAIL.zh.md:15` 与 `:16` 收敛为严格顺序，`test/compact-policy.test.mjs` 的等号用例改为拒绝用例。③ **D8 → 采纳顶栏入口**：位置、显示条件（仅 companion 已安装时）与水位图标按 [DNMS] `AGENTS.md` 面板入口节登记；rail 保持模型分类用途。④ **D9 → 重设计**：i18n key 的数量与名称不作合同，只要求中英两份完整对应；补开关切换确认，`-20`「切换确认与四类结果」保留；localStorage 缓存键要求退役。⑤ **D10 → 回退覆盖 base 扁平行**：`gen-mutex-patch.mjs` 以 `config.plugins` 全重放为互斥机制，覆盖 base 扁平行与 4 个 preset 组；ON 态 base 扁平 `compaction-basic` 为 `disabled`，Provider 行与 `-09` 的工具行同步写入；sdk、acp 等非 web 组合不在本包范围；现有 `VERSION_GUARDED_ROWS` 机制不变。⑥ **验收**只用既有入口，必要时在既有测试文件内增改用例，不新增 release-gate、不改 `RELEASE.md`：[DNMSC] `test/compact-policy.test.mjs`、`async-takeover.test.mjs`、`host-cordis-smoke.test.mjs`；[DNMS] `test/` 下既有测试（`async-history`、`history-format`、`water-line` 等）；仓根 `scripts/check-ui-rules`、`check-client-rules`、`check-route-sensitivity`、`check-feature-contract`、`check-clean-lib`、`test-all`；只读证据重放按评估 §2.3 的方法对新构建会话重跑，对照 `B10` 的「turn 中间切点 242/260」「尾部无 user 39/260」，`/tmp/dnms-evidence/` 脚本只是当次工具、不是交付物。⑦ **DNMS01 收尾**：接替指针按 §9.5 最终表一次性写入（`-01②`）；`closure/DNMS01-closure.md` 随计划收尾修订（`:20` 唤醒消息描述改为指向 `-05`，`:74` 待移动项按原计划处理） | Round 4 / Q10（[业主] 同意推荐 B） | — | 计划不得重新引入等号、S 读时兼容或客户端缓存键；验收不得新增 gate |
| `T-O-ACE1117-11` | closure | **【收口登记 · 全册审计结果】**（本行不是新裁决，只登记 §9.3 审计中由已冻真相直接推出的读法、实施期委托项与残留去向）① **接替指针最终表**以 §9.5 为准；它修正 Q10 题面⑦表的一处误列：DNMS01 `-15` 的严格顺序被 `-10②` 回退保留、**不被接替**，只有 S=0.80 被接替；另补 `-16` 读法限定（`-02⑤`）、`-20` 的 S 文案与 R-16.1/.3/.6 三项。② **派生读法**：账本记录四条 lane 的每次选择（由 `-03③④` 与 `-06①` 推出，消解 `B11`「账本只覆盖异步 lane」）；`EPISODE_TIMEOUT_MS` 沿用现值 120 s（`host-compaction.js:66`，`-05` 未改数值）；现行「抬高 B 使在途 episode 撤销」（`disarmed`）属于 [业主] 显式意图，与 `preempted` 同类结算、不计入 circuit；`-02④` 的「model-facing 工具暂不放开」已由其自带的「直到专题裁决」条款随 `-04③` 终止。③ **实施期委托项**（已冻真相明确交给实施，确定时不构成合同变更、不回本册登记）：在途续拉节奏（`-06③`，写入 [DNMS] 性能声明）、附加要求字段名与长度上限（`-07②`，`-15` 字段清单的指针已指向 `-07②`，无需再写指针）、本插件 checkpoint 的识别方式（`-09③`）、账本新增字段的具体格式（`-06①`）。④ **残留去向**：DNMS01 `Round 16 · [业主] 裁决请求` 中 R-16.2（vendored seam 与 `ManualCompactionError` 类身份）、R-16.5（`dsh plugin add` 默认 ON 与 `-17` 默认 OFF 的矛盾）、R-17（preset 重放跨版本守卫）、R-18（客户端宿主导出守卫）**不属于本册合同面，显式 defer**；`B07` 只继承 `-17` 原文，不裁决 R-16.5；按 `-01①`，上述事项此后若需裁决，只能在本册 append-only 追加或由 [业主] 另立战役，DNMS01 R-16 所预留的 `T-O-DNMS01-23/-24` 不再启用（同时符合 `-22`「不设 Round 6」）。⑤ [业主] 四项担心（`B03`）、漂移 D1–D11、`B11` 缺陷的落点见 §9.4 覆盖矩阵，全部已有归属 | 收口审计（§9.3） | — | 计划只能引用本行的读法与清单，不得把委托项升级为新合同，也不得在 DNMS01 内重开残留项 |

---

## 2. Round 1 —— 真源归属与语义主权（`Q1–Q2` · foundational）

> 本轮 second-opinion 模式：`retired`。
> **为什么 Round 1 只问这两题**：评估 §4.2 的 7 个业务簇里，C1–C6 的每一个方案都要先回答两件事：
> ① **以什么为合同**——DNMS01 冻结真相与现行代码之间已有 10 处漂移（下表），而 [业主] 的四项担心又要求新增 DNMS01 从未覆盖的语义（切点、模型告知、prompt）。不先定「旧真相怎么处置、新真相登记在哪」，任何 executional 题都会在「回退代码」与「追认代码」之间预设立场。
> ② **[DNMSC] 可以拥有哪些语义**——当前 [DNMSC] 把宿主 `compaction-basic` 的切点算法、摘要指令、checkpoint 前言当作「必须逐字一致」的协议。不先定这层归属，C1（切点）、C2（模型告知）、C4（prompt）都无从设计。
> 生命周期调度、观测面形态、UI 刷新模型、inspect 工具是否新增等问题不在本轮，等这两题冻结后再根据中场评估提出。
> **本轮驱动真相**：Baseline `B01–B13`。

---

### Q1 — 异步压缩域的真源如何重建：回退代码、追认代码，还是由 ACE-1117 接替？（驱动真相：`B01`、`B02`、`B03`、`B12` · 来源：评估 §3.4、§5.7、R38–R46）

- **影响范围**：`docs/specs/dsh-nano-model-selector/qna/DNMS01-qna.md`、`DNMS01-qna-truth.md`（22 条 `T-O-DNMS01-*` 中的 `-10`、`-11`、`-15`、`-18`、`-19`、`-20`、`-21` 七条受漂移影响）；[DNMSC] `lib/compact-policy.js`、`lib/host-compaction.js`、`lib/async-history.js`；[DNMS] `index.js` 压缩路由、`src/client/*` 压缩 UI；本册后续全部题目的合同来源。
- **为什么必须确认**：按「不得擅自扩约」与「不得由实现反推合同」，现行代码里未登记的漂移既不能直接写进计划当作事实，也不能由 agent 自行回退。按 `B12`，推翻 DNMS01 旧行必须 append-only。本题决定 ACE-1117 期间「合同从哪里来、旧行怎么标记」。
- **当前建议 / 倾向**（Droid）：**B — ACE-1117 接替异步压缩域的真源；DNMS01 只追加接替指针；漂移逐条裁决，不默认追认、不默认回退。**
- **Reasoning**：DNMS01 是已收口的战役（`-22` 不设 Round 6），而本阶段要新增它从未覆盖的语义。把新裁决集中登记在本册，DNMS01 只追加一张「旧行 → 新 truth-id」指针表，既满足 `B12` 的 append-only，又保证同一决定只登记一次。漂移里既有该回退的（轮询违背已冻性能纪律），也有值得采纳的（账本解决了真实的无痕失败），一刀切回退或追认都会丢掉一边。

#### 【对本问题的解读】

问题不是「某个数值该是 0.80 还是 0.90」，而是**合同的来源与登记位置**。现状是三层互相不一致：

1. **DNMS01 冻结真相**：22 条，最后一条宣布收口、不设 Round 6（`DNMS01-qna-truth.md:70`）。
2. **现行代码**：在冻结之后自行演进出 10 处与真相不符的行为（下表），其中多数只在包内 `AGENTS.md` 或代码注释里说明，没有 [业主] 登记。
3. **[业主] 本轮新需求**（`B03`）：切点语义、模型告知、inspection、专用 prompt，DNMS01 完全没有覆盖，部分甚至与 DNMS01 的否决项冲突（`-11`、`-13` 否决「新增 model-facing tool」，`DNMS01-qna-truth.md:163,186`）。

本题要 [业主] 决定三件事：

- 新裁决登记在哪里（单一真源）；
- DNMS01 被推翻的行怎样标记（满足 `B12`）；
- 现有 10 处漂移的默认处置立场（回退 / 追认 / 逐条裁决）。

本题**不**裁决任何一处漂移的具体去留。具体去留由后续 executional 题按簇裁决。

**漂移清单（现行代码 vs DNMS01 冻结真相）**

| # | 漂移 | DNMS01 冻结 | 现行代码 | 证据 |
|---|------|-------------|----------|------|
| D1 | S 值 | `S=0.80` 只读 | `SAFETY_RATIO = 0.90` | `DNMS01-qna-truth.md:177`；`dsh-nano-model-selector-compaction/lib/compact-policy.js:23`；`dsh-nano-model-selector/src/client/i18n.js:70` |
| D2 | 阈值顺序 | `effectivePin/W < H < B < S < 1` 严格 | 允许 `H == B`、`B == S` | `DNMS01-qna-truth.md:177`；`compact-policy.js:81,83`；`dsh-nano-model-selector-compaction/DETAIL.zh.md:15`（同文件 `:16` 仍写严格顺序，文档自相矛盾）；`test/compact-policy.test.mjs:49` |
| D3 | 策略字段 | 7 字段最小 schema | 8 字段（新增 `summaryPrompt`） | `DNMS01-qna-truth.md:177`；`compact-policy.js:37,47,117-119` |
| D4 | 审计文件 | 不新建 audit 文件，观测五类闭集 | `async-history/<sessionId>.jsonl` 账本 | `DNMS01-qna-truth.md:216`；`dsh-nano-model-selector-compaction/lib/async-history.js:24,48-58` |
| D5 | 客户端刷新 | 零轮询，不设 `setInterval` | 4 条轮询（15 s 常驻、15 s/3 s 徽标、30 s 面板、3 s 对话框） | `DNMS01-qna-truth.md:230`；`dsh-nano-model-selector/src/client/ModelSelector.jsx:298`；`AsyncStatusBadge.jsx:22,24`；`CompactPanel.jsx:102`；`AsyncHistoryDialog.jsx:37` |
| D6 | 调度 | pre-step 只计量 + `agent.followup()` 唤醒，idle 后 `runMaintenance` 执行，下一请求 adoption | pre-step 直接后台起摘要，下一 pre-step 提交；不调 `followup`，`runMaintenance` 只用于手动 | `DNMS01-qna-truth.md:200`；`host-compaction.js:139-152,661-663`；文件头仍写旧语义 `host-compaction.js:8-12` |
| D7 | durable 锁 | `compaction/start` 未配对锁保证 one-active | `deferStart` 使摘要期间不持锁 | `DNMS01-qna-truth.md:200`（`-18②`）；`host-compaction.js:376`；`compact-region.js:592-595` |
| D8 | UI 入口 | rail 第 4 图标（`filter='compact'`） | 顶栏搜索框与关闭按钮之间的按钮 | `DNMS01-qna-truth.md:223`；`ModelSelector.jsx:791-805` |
| D9 | i18n / 缓存 | 18 个 key（含 `compactSwitchConfirm`）、localStorage 缓存键 `dsh-nano-model-selector:async-compact.v1` | 42+ 个 `compact*` key，`compactSwitchConfirm` 缺失，无该缓存键 | `DNMS01-qna-truth.md:163,223`；`src/client/i18n.js:49-122` |
| D10 | 组合覆盖 | 覆盖 base 扁平行 + 4 preset group | 只覆盖 4 preset group | `DNMS01-qna-truth.md:58`；`dsh-nano-model-selector-compaction/scripts/gen-mutex-patch.mjs:20,91-109` |

另有一处**真相内部不一致**：`-11` 写「clamp 进 durable audit」（`DNMS01-qna-truth.md:163`），`-15` 写「不静默 clamp、不新建 durable audit 文件」（`:177`）。接替时须一并消解。

#### 【可选选项清单】

| 选项 | 内容 | 新裁决登记位置 | DNMS01 旧行处置 | 漂移默认立场 |
|---|---|---|---|---|
| **A** 回退代码 | 严格执行 DNMS01：S 回 0.80、顺序严格、删 `summaryPrompt`、删账本、去轮询、恢复 `runMaintenance` 调度、恢复锁、rail 入口、18 key、覆盖 base 扁平行；[业主] 四项担心另起新战役 | 新战役另立 | 不动 | 全部回退 |
| **B** ACE-1117 接替（**推荐**） | 本册是异步压缩域新裁决的唯一 provenance；DNMS01 只追加接替指针；10 处漂移逐条裁决 | 本册 `T-O-ACE1117-*` | `DNMS01-qna.md` 末尾 append 一段接替表 + `DNMS01-qna-truth.md` §4.5 追加 `AMEND-4…` 指针行，均只写「旧行/项 → 新 truth-id」，不复述内容 | 逐条裁决 |
| **C** DNMS01 续开 Round 6+ | 在 `DNMS01-qna.md` 续开修订轮，把漂移与 [业主] 四项担心都作为 DNMS01 的 Q14+ 冻结 | `DNMS01-qna.md` | 原地 append 修订 | 逐条裁决 |
| **D** 文档追认代码 | 把 DNMS01 台账与包文档改成与现行代码一致 | DNMS01 台账（改写） | 改写 | 全部追认 |

#### 【推荐选项的详细执行说明与分析】（B）

1. **单一 provenance**：本册是 [DNMSC] 与 [DNMS] 异步压缩面一切新裁决的唯一来源，产出 `T-O-ACE1117-*`；计划 §2 只 CITE 本册。DNMS01 未被接替的行继续有效（例如 `-12`、`-14`、`-17` 的开关与交付形态，已由 `B07` 显式继承）。
2. **接替指针（满足 `B12`）**：本册全轮冻结时，一次性在两处追加指针，不改旧行原文：
   - `DNMS01-qna.md` 末尾追加「ACE-1117 接替」一节，一张表：`T-O-DNMS01-x 第 n 项 → T-O-ACE1117-y`；
   - `DNMS01-qna-truth.md` §4.5 AMEND 表按 `AMEND-1..3` 先例（`:306-308`）追加 `AMEND-4…` 行，内容同样只是指针。
   指针不复述新真相，因此同一决定只有一份登记（本册）。
3. **漂移逐条裁决，不设默认立场**。每处漂移在对应簇的 executional 题里按三类之一处置：
   - **采纳并登记**：漂移有证据价值且过 `B02` 判据（候选：D4 账本——它解决了括号写入前即失败的无痕问题，见 `dsh-nano-model-selector-compaction/AGENTS.md` Audit ledger 节；D6 调度——当前方式把 claim→commit 从 115–132 s 降到 15–17 s，见 `B10`）；
   - **回退到 DNMS01**：漂移违背已冻纪律（候选：D5 轮询，违背 `-21④` 与 DNPR 轮询纪律；D7 锁，违背 one-active）；
   - **重设计**：漂移所在区域本身要被 [业主] 四项担心重做（候选：D3 `summaryPrompt` 并入 prompt 簇；D8/D9 并入 UI 簇；D1/D2 并入阈值簇）。
   上面的候选分类只是本题的说明，不随本题冻结。
4. **冻结期纪律**：本册冻结前，不在代码里新增漂移，也不对现有漂移做 hotfix 式回退（避免「先改回去、再按裁决改过来」的双改）。评估 §7 中不涉及合同的纯缺陷修复（`B11` 所列）也等计划落地后统一进行。
5. **真相内部不一致**：`-11`「clamp 进 durable audit」与 `-15`「不静默 clamp」的矛盾，在 D2/D4 所属的 executional 题里一并消解，接替指针同时指向两行。
6. **文档处置**：`docs/specs/dsh-nano-model-selector/async-compaction.md` 已由 `-22` supersede，不再修订；`closure/DNMS01-closure.md` 的过时陈述（评估 R46）随 ACE-1117 计划收尾统一修订，QnA 期间不改。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

| 证据 | 位置 | 说明 |
|---|---|---|
| DNMS01 已收口，不设 Round 6 | `DNMS01-qna-truth.md:70`；`DNMS01-qna.md:73` | 续开 DNMS01 需要 [业主] 明确推翻收口条款，而 B 不需要 |
| 推翻只能 append-only，且已有指针式先例 | `DNMS01-qna-truth.md:25`、`:306-308` | B 的指针表与 `AMEND-1..3` 同形 |
| [业主] 四项担心超出 DNMS01 范围 | DNMS01 范围 `-1`（`DNMS01-qna-truth.md:49`）只含开关、水位、接管、micro 边界与按钮 | 切点语义、模型告知、prompt 不是 DNMS01 的修订，是新内容 |
| 新内容与 DNMS01 否决项冲突 | `-11`、`-13` 否决新增 model-facing tool（`DNMS01-qna-truth.md:163,186`） | 若 [业主] 后续放开 inspection 工具，需要一个比 DNMS01 更新的登记位置 |
| 前序战役同构先例 | `PRE-1116-qna.md` §1.1 以 baseline 继承前序已冻真相、§1.2 登记新裁决 | 本仓已验证可行的治理形态 |

**A（回退代码）的反例**

- 回退调度（D6）会让异步提交回到「等整轮结束」：desktop 账本之前与之后的旧构建实测 claim→commit 为 56 min、132 s、115 s，当前构建为 15–17 s（`B10`）。按 `-18①` 字面回退即是性能回归。
- 回退账本（D4）会让括号写入前就失败的 episode 再次无痕（`dsh-nano-model-selector-compaction/AGENTS.md`：「an episode dropped before `prepareCompactionTransaction` … leaves no durable trace at all」）。
- A 仍然解决不了 `B03` 的四项担心，最终还要另起一册登记新语义，等于两次立约。

**C（DNMS01 续开）的反例**

- 违背 DNMS01 自己的收口条款（`-22`「不设 Round 6」），需要先推翻收口本身。
- 把新战役的大量新内容塞进已冻结战役，DNMS01 台账从「22 条 + 3 条 AMEND」变成主体被改写，破坏其作为历史 provenance 的可读性。

**D（文档追认代码）的反例**

- 直接违反仓根 `AGENTS.md`「不得由实现反推合同，不得把『测试要求如此』当合同来源」。
- 违反 `B12`：改写旧行原文。
- 会把违背已冻纪律的漂移（D5 轮询、D7 不持锁）一并合法化。

- **问题**：你是否同意 **B**：① 本册 `ACE-1117-qna.md` 是 [DNMSC]/[DNMS] 异步压缩面新裁决的唯一 provenance，计划只 CITE 本册；② 全轮冻结时在 `DNMS01-qna.md` 末尾与 `DNMS01-qna-truth.md` §4.5 各追加一次只含指针的接替记录，不改旧行；③ D1–D10 十处漂移不设默认立场，在后续 executional 题中逐条按「采纳并登记 / 回退 / 重设计」裁决，`-11` 与 `-15` 的内部矛盾一并消解；④ 本册冻结前不新增漂移、不做 hotfix 式回退？若不同意，请选 A / C / D 或给出修改。
- **业主回答**：同意推荐 **B**（2026-11-17）→ 冻结为 `T-O-ACE1117-01`

---

### Q2 — [DNMSC] 的语义主权边界：忠实移植宿主 `compaction-basic`，还是协议层复用、语义层自有？（驱动真相：`B03`、`B04`、`B05`、`B06`、`B10` · 来源：评估 §5.1、§5.2、§5.4、R01–R03、R07–R09、R20–R23、R47）

- **影响范围**：[DNMSC] `lib/compact-region.js`（切点选择 `:357-386`、摘要指令 `:190-225`、checkpoint 前言与帧 `:248-258`、摘要输入 `:526-537`）、`lib/compaction-seam.js`、`lib/host-compaction.js`；[DNMS] `lib/compact-prompt.js`；后续 C1（切点）、C2（模型告知与 inspection）、C4（prompt）三簇的全部设计空间。
- **为什么必须确认**：当前代码把宿主 `compaction-basic` 的私有实现当作必须逐字一致的协议（文件头「byte-identical wire semantics」「mirrors region.ts line-for-line」，`compact-region.js:1-15`）。[业主] 担心 ①②④ 要求改变的恰好是这些被逐字移植的部分。不先定「哪些是必须复用的协议、哪些是 [DNMSC] 可以自有的语义」，后续题无法提出任何切点、告知或 prompt 方案。
- **当前建议 / 倾向**（Droid）：**B — 分层主权：协议层原样复用宿主公开协议，语义层由 [DNMSC] 自有并以本册为合同。**
- **Reasoning**：宿主对插件公开的合同是 seam 与 durable 括号；切点算法、摘要指令、前言文案是 `compaction-basic` 这个出厂 Provider 的产品行为，不在包根导出里。DNMS01 `-16` 要求「按协议重实现」，列举的协议也只有括号、结果形状、六失败码、`sourceCommandId` 与 shrink 校验。把语义层也当协议，等于把出厂 Provider 的产品选择升级为本插件的合同，而 desktop 证据显示这套语义正是 [业主] 担心的来源。

#### 【对本问题的解读】

[DNMSC] 的代码可以分成两层：

| 层 | 内容 | 当前状态 |
|---|---|---|
| **协议层** | `CompactionEngine` 三方法；`compaction/start → summary → checkpoint user/message（surfaceOp.replace + compactCheckpointSource）→ end` 括号；六失败码；`sourceCommandId`；shrink 校验；表面稳定性断言；tool-pair 平衡；system head 不被遮蔽；no-cap | 按 `-16` 重实现，符合宿主公开协议 |
| **语义层** | 何时触发（水位，已是 [DNMSC] 自有）；**切在哪里**（保留尾部怎么选）；**摘要说什么**（指令）；**checkpoint 帧怎么写**（前言）；**模型被告知什么**；人看到什么 | 切点、指令、前言是宿主 `compaction-basic` 的逐字副本；告知为零 |

本题要 [业主] 决定：语义层的切点、指令、帧文本、模型告知，是继续以「与 `compaction-basic` 逐字一致」为约束，还是由 [DNMSC] 自有、以本册为合同。

本题**不**裁决具体切点规则、帧字段、prompt 结构，也**不**裁决是否新增 model-facing inspection 工具（它与 DNMS01 `-11`、`-13` 的否决项直接相关，需要单独一题）。本题只确定这些问题「归谁定、以什么为约束」。

#### 【可选选项清单】

| 选项 | 内容 | 切点 / 指令 / 帧 | 模型告知 | 与宿主关系 |
|---|---|---|---|---|
| **A** 忠实移植 | 语义层继续逐字跟随 `compaction-basic`；只修生命周期缺陷（`B11`）；宿主升级时重新同步 | 宿主副本 | 无（前言要求「不承认」） | 私有实现分叉，靠注释保持一致 |
| **B** 分层主权（**推荐**） | 协议层原样复用宿主公开协议、不分叉；语义层由 [DNMSC] 自有，以 `T-O-ACE1117-*` 为合同；安全不变量保留；语义层宿主副本退役重写 | [DNMSC] 自有 | 由后续题设计，帧文本与摘要指令可以显式告知 | 只依赖公开协议 |
| **C** 宿主语义 + 外围告知 | 不改切点、指令与帧；只在 UI、账本、文档层补充「已压缩」说明 | 宿主副本 | 只给人看，模型输入不变 | 同 A |
| **D** 移植 [nano-agent] 语义栈 | 把 nano 的 turn 原子组、`<retained>` 合同、边界帧三态、durable lineage 整体搬进 [DNMSC] | 照搬 nano | 照搬 nano | 新增对 nano 设计的结构性依赖 |

#### 【推荐选项的详细执行说明与分析】（B）

1. **协议层：原样复用，不分叉。**
   - 只依赖宿主包根导出（`@deepseek-ai/dsh-compaction/lib/index.js:175`）与 durable 括号（`@deepseek-ai/dsh-compaction-basic/README.md:115,135`）。
   - 六失败码、结果形状、`sourceCommandId`、shrink 校验、稳定性断言、no-cap 维持 `-16` 原文。
   - 协议层必需的宿主私有原语副本（如 `BlockAssembler`、`errorChain`，`compact-region.js:6-15`）保留，但改为标注「来源版本 + 内容 hash」并由测试锁定，宿主升级时由测试发现漂移，而不是靠注释。具体机制留给 executional 题。
2. **语义层：[DNMSC] 自有，以本册为合同。**
   - 切点选择（`compact-region.js:357-386`）、摘要指令（`:190-225`）、checkpoint 前言与帧（`:248-258`）、模型告知内容，不再以「与 `compaction-basic` 逐字一致」为约束，由后续 C1、C2、C4 题按 [业主] 担心重新设计并冻结。
   - 这些位置的「verbatim port」标注与对应的宿主副本退役，重写后由本册 truth-id 作为来源注释。
   - [DNMS] `lib/compact-prompt.js` 的手抄副本随之进入单一真源处置（落点留给 prompt 簇题目）。
3. **安全不变量：无论语义怎么改都必须保留。**
   - tool-call 与 tool-result 不拆开（使用包根导出 `toolPairingBalancedBefore/After`）；
   - surface 头部的 `system/message` 不被遮蔽（`@deepseek-ai/dsh-compaction-basic/README.md:116`，system prompt 位于 surface node 0）；
   - 单个 surface 节点不切半；
   - shrink 校验与稳定性断言照旧；
   - OFF 态零影响（`B07`）。
4. **模型可见面的边界**：帧文本与摘要指令属于语义层，可以按后续裁决显式告知模型「已压缩、替换了什么」。新增 model-facing 工具不在本题放开，仍受 DNMS01 `-11`、`-13` 约束，直到后续专题裁决。
5. **[nano-agent] 的位置**：作为语义参照（turn 原子组、保留清单、边界帧），按 `B04` 只借鉴设计，不照搬 D1 lineage、queue、checkpoint fork 等平台机制。
6. **登记**：若 [业主] 选 B，本题答复即为「[DNMSC] 语义层自有」的唯一登记；它对 `-16`「按 [dsh] 契约重实现」的读法作出限定（协议层按契约，语义层按本册），接替指针在全轮冻结时按 Q1 的方式追加。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

| 证据 | 位置 | 说明 |
|---|---|---|
| 宿主对插件公开的只有 seam 与原语 | `@deepseek-ai/dsh-compaction/lib/index.js:175`（导出 `CompactionEngine`、`CompactionId`、`ManualCompactionError`、`compactCheckpointSource`、`isCompactCheckpointSource`、`toolPairingBalancedAfter/Before`） | `selectCompactableRange`、`COMPACTION_INSTRUCTION`、`frameSummary` 都不在导出里，不是插件合同 |
| DNMS01 要求的「协议」不含语义层 | `DNMS01-qna-truth.md:193`（`-16`：括号序列、`CompactionResult` 形状、六失败码、`sourceCommandId`、shrink 校验「按 [dsh] 契约重实现」） | 切点与指令未被列举，逐字移植是实现选择，不是合同要求 |
| 宿主自己把切点与比例当作产品行为 | `@deepseek-ai/dsh-compaction-basic/README.md:84`（保留「oldest balanced span」以外的尾部）、`:256`（「recovery cannot … split an indivisible non-tool unit」）、`:269`（默认比例「undecided」，无语料依据） | 这是出厂 Provider 的取舍，不是 seam 不变量 |
| 宿主语义正是 [业主] 担心的来源 | `B10`：242/260 切在 turn 中间，39/260 尾部无 user 消息 | 不改语义层，担心 ① 无法消除 |
| 宿主指令与前言阻止模型知情 | `compact-region.js:222`「Do NOT mention … compacted」；`:249`「without acknowledging this checkpoint」 | 不改语义层，担心 ② 无法在模型侧落地 |
| 宿主指令不知道保留尾部存在 | `compact-region.js:210-214`（Current Work / Next Step）；摘要输入只含遮蔽段 `:526-537` | 切 turn 时摘要的「下一步」会与保留尾部冲突，担心 ④ 无法消除 |
| 安全不变量有公开原语支撑 | 包根导出 `toolPairingBalancedBefore/After`；README `:116`（system prompt 位于 surface node 0） | 改语义不需要依赖宿主私有实现 |

**A（忠实移植）的反例**

- 三项担心（①②④）在 A 下都无解：切点、前言、指令被锁死在宿主副本上。
- 「逐字一致」只靠注释维持：prompt 已经有三份（`compact-region.js:190-225`、`dsh-nano-model-selector/lib/compact-prompt.js:2`、宿主 `dsh-compaction-basic/lib/index.js:243-278`），没有任何测试保证一致（评估 R23、R47）。
- A 把出厂 Provider 的产品选择升级成本插件合同，等于让宿主私有实现决定本插件行为，与「上层建筑归 host」的本意相反：host 拥有的是协议，不是插件的语义。

**C（宿主语义 + 外围告知）的反例**

- 模型输入不变，checkpoint 仍要求模型「不承认」，担心 ② 只在 UI 层得到形式上的回应。
- 切点与 prompt 不变，担心 ① ④ 没有被触及。

**D（移植 nano 语义栈）的反例**

- 违反 `B04`：[nano-agent] 真相未冻结，不是合同来源；照搬其 D1 lineage、queue 机制违反 `T-O-DNMS01-7`（`DNMS01-qna-truth.md:55`）。
- nano 的部分机制依赖平台能力（D1 原子 batch、generation CAS、checkpoint fork），在 [dsh] 插件里没有等价公开面，强行复刻会制造第二套 durable 状态，违反单一真源与 `B06`。
- 平台中立原则要求 [dsh-nano] 首先服务官方 [dsh]，不与 [nano-agent] 结构性耦合。

- **问题**：你是否同意 **B**：① [DNMSC] 的协议层（seam 三方法、durable 括号、六失败码、`sourceCommandId`、shrink 与稳定性校验、no-cap）原样复用宿主公开协议，私有原语副本改为「来源版本 + hash」测试锁定；② 语义层（切点选择、摘要指令、checkpoint 帧文本、模型告知内容）由 [DNMSC] 自有，以 `T-O-ACE1117-*` 为合同，不再以「与 `compaction-basic` 逐字一致」为约束，对应宿主副本退役重写；③ tool-pair 不拆、system head 不遮蔽、单节点不切半、shrink 校验、OFF 态零影响为不可放弃的安全不变量；④ 新增 model-facing 工具不在本题放开，另立专题裁决？若不同意，请选 A / C / D 或给出修改。
- **业主回答**：同意推荐 **B**（2026-11-17）→ 冻结为 `T-O-ACE1117-02`

---

## 3. ★ Round 1 总结与中场评估 I（Round 1 → Round 2）

### 3.1 Round 1 判定

| 题 | [业主] 裁决 | 冻结为 | 一句话结论 |
|----|-------------|--------|------------|
| Q1 | 同意推荐 B | `T-O-ACE1117-01` | 本册接替异步压缩域的真源；DNMS01 只追加指针；十处漂移逐条裁决；冻结前不改代码 |
| Q2 | 同意推荐 B | `T-O-ACE1117-02` | 协议层复用宿主公开协议，语义层（切点、指令、帧、告知）归 [DNMSC] 自有；五条安全不变量不可放弃；model-facing 工具另题 |

### 3.2 Round 1 固化了什么

1. **合同来源只有一个**：之后每题的推荐都只能引用 `B01–B13` 与 `T-O-ACE1117-01/02`，不能引用「现行代码就是这样」或「DNMS01 当年这样定」作为单独理由（`-01①`）。
2. **语义层的设计空间打开了**：切点、摘要指令、checkpoint 帧、模型告知不再被宿主 `compaction-basic` 的副本锁死（`-02②`），但协议层与安全不变量是硬边界（`-02①③`）。
3. **有一个问题被显式留给后续**：新增 model-facing 工具（`-02④`），它直接对应 [业主] 担心 ② 中的「checkpoint 内容的 inspection 工具」，又与 DNMS01 `-11`、`-13` 的否决冲突，属于公共合同变更，必须单独裁决。

### 3.3 诚实反方制衡

| 风险 | 来自 | 制衡 |
|------|------|------|
| 语义层自有后，[DNMSC] 与宿主 `compaction-basic` 的行为会长期分叉，宿主升级带来的改进不再自动跟进 | `-02②` | 分叉只在语义层；协议层仍由包根导出与「来源版本 + hash」测试锁定（`-02①`），宿主协议变化会被测试发现。语义层的取舍由本册登记，可追溯、可在后续轮次修订 |
| 冻结期不修缺陷，`B11` 所列问题（idle 死路径、不持锁、无防抖等）会继续存在一段时间 | `-01④` | 这些问题在 ON 态才出现，且 `B07` 保证默认 OFF；desktop 证据显示 260 次提交无 orphan pair、无消息丢失（`B10`），风险可控。与「先 hotfix、再按裁决改一遍」相比，这是更少的双改 |
| 语义层可以改，但改什么还没有约束，后续题可能各自为政 | `-02②` | 正是 Round 2 要解决的：先定切点的语义单位（Q3）与模型知情面的合同形态（Q4），再进入 executional 题 |

### 3.4 新的事实调查（为 Round 2 取证）

Round 1 冻结后，按 `-02` 的分层，对「语义层能用哪些宿主公开面」做了一轮检索：

| 发现 | 证据 | 对 Round 2 的意义 |
|------|------|-------------------|
| 宿主 journal 有显式的 turn 与 step 边界事件：`turn/start`、`turn/end`、`step/start`、`step/end`；一个 step = 一次模型调用加它请求的工具执行 | `@deepseek-ai/dsh-session/lib/types/types.d.ts:268-292` | 切点可以按 turn 或 step 对齐，不需要自己发明边界；这是公开类型，不是宿主私有实现 |
| 当前切点算法只看 token 累计与 tool-pair 平衡，不读 turn/step 边界 | `compact-region.js:368-380` | 这是 `B10` 中 242/260 切在 turn 中间的直接原因 |
| 当前 async 保留预算 = `min(pinnedAsyncTokens, floor(0.15·W))`，在 arm 时冻结；同步 FULL 的保留预算 = `pinnedFullTokens`（S 线 safety-only 时为 0） | `compact-policy.js:27,89`；`host-compaction.js:278,569,649` | 三条 lane 共用同一个切点函数（`host-compaction.js:368` 等），但预算各自取值；切点语义一旦改，三条 lane 同时受影响 |
| 宿主为插件提供了「模型可见、durable、可回放」的上下文注入方式：sourced `user/message`，带 `kind`（生产者）与 `form`（`snapshot` / `notice` 等语义）；`notice` = 「刚发生的一件事，不覆盖任何东西」，必须带 ≤120 字符的 `summary` | `@deepseek-ai/dsh-llm/lib/types/message.d.ts:46-58,75-93,101-114` | 告诉模型「发生了压缩」有宿主原生载体，不需要新 event type |
| 宿主自带插件已在用这种方式：`dsh-time-context` 在 `agent/pre-step` 追加 sourced `UserMessage`；`dsh-repeat-tool-reminder` 用 `additionalContexts` 追加 `form:'notice'` 的提醒；`dsh-agent-instructions` 自持 `<system-reminder>` 帧 | `@deepseek-ai/dsh-time-context/README.md:67`；`@deepseek-ai/dsh-repeat-tool-reminder/README.md:91`；`@deepseek-ai/dsh-agent-instructions/README.md:90` | 同类做法在宿主里已有先例，可以复用模式 |
| checkpoint 消息本身就是一条 sourced `user/message`，`source = {kind:'compact-checkpoint', compactionId, sourceCommandId?}`；帧文本完全由 backend 决定 | `@deepseek-ai/dsh-compaction/lib/types/checkpoint.d.ts:17-31`；`compact-region.js:444,504-507` | checkpoint 自己就是一个模型可见的告知载体；当前帧文本要求模型「不承认」（`:249`），摘要指令要求「不提压缩」（`:222`） |
| 插件可以注册 model-facing 工具：`ctx.tools.register(defineTool(...))`，支持 `when` 条件，每个 step 求值一次，false 时工具对模型不可见 | `@deepseek-ai/dsh-tools/README.md:30,45,69` | inspection 工具在技术上可行，且可以只在需要时出现；但它是公共合同变更（`-02④`） |
| 宿主已有一个实验性的只读会话查询工具包，`session_event_trace` 能查一个事件的位置替换关系，`session_event_read` 能读完整事件；但它是 opt-in，需要 `ctx.sessionQuery` 后端，启用后每个请求都多 5 个工具 schema | `@deepseek-ai/dsh-tool-session-query/README.md:12,28,47-51` | 这说明「让模型查被替换的原文」在宿主生态里是被认可的需求；但依赖它意味着 [DNMSC] 的语义依赖一个默认不装的包 |
| 本仓目前没有任何插件注册 model-facing 工具 | 对 `dsh-nano-*/{index.js,lib,src}` 检索 `ctx.tools`/`registerTool`/`defineTool`，零命中 | 若放开，[DNMSC] 是本仓第一个 model-facing 工具，需要本册单独登记 |

### 3.5 为什么注入 Round 2 这两题

- **Q3（切点的语义单位）**：`-02②` 把切点交给 [DNMSC]，但「按什么单位切、预算是硬上限还是目标」决定了 C1 的全部方案，也决定 C4 摘要指令要不要处理「半个 turn」。它是 [业主] 担心 ① 的根问题。驱动真相：`-02②③`、`B03①`、`B10`。
- **Q4（模型知情面的合同形态）**：`-02②` 允许改帧文本与告知内容，`-02④` 把 model-facing 工具留给专题。两件事都在回答同一个问题：模型通过什么载体、在什么时刻知道上下文被替换、能不能查回原文。它是 [业主] 担心 ② 的根问题，而且涉及公共合同变更，必须是 foundational。驱动真相：`-01①`、`-02②④`、`B03②`、`B04`、`B06`。
- **不在 Round 2 的**：UI 心跳（担心 ③）依赖 Q4 先定「模型侧告知哪些事实」，再决定 UI 侧投影什么；专用 prompt（担心 ④）依赖 Q3 与 Q4 先定「摘要要覆盖什么、帧要说什么」。生命周期与锁、阈值、账本去留属于 executional 范围，按 `-01③` 逐条裁决。

---
## 4. Round 2 —— 切点语义单位与模型知情面（`Q3–Q4` · foundational）

> 本轮 second-opinion 模式：`retired`。
> **为什么 Round 2 只问这两题**：见 §3.5。Q3 回答「保留尾部按什么单位切」（担心 ①），Q4 回答「模型通过什么载体知道上下文被替换、能不能查回原文」（担心 ②）。两题都是 `-02②` 打开的语义层里最底层的合同，UI 心跳（③）与专用 prompt（④）都依赖它们的答案。
> **本轮驱动真相**：`T-O-ACE1117-01`、`T-O-ACE1117-02`；Baseline `B03`、`B04`、`B06`、`B07`、`B10`。

---

### Q3 — 保留尾部的语义单位：继续按 token 硬切，还是按 turn / step 边界分级对齐？（驱动真相：`-02②③`、`B03①`、`B10` · 来源：评估 §5.1、R01–R03）

- **影响范围**：[DNMSC] `lib/compact-region.js` 的 `selectCompactableRange`（`:357-386`）及其全部调用方——async lane（`host-compaction.js:368`）、同步 FULL（`:572`）、overflow（`:537`）、手动 `/compact`（`:692`）；保留预算来源（`compact-policy.js:27,89`；`host-compaction.js:278,569`）；后续 prompt 簇（摘要指令要不要处理「半个 turn」）。
- **为什么必须确认**：`-02②` 已把切点交给 [DNMSC]，但没有规定「按什么单位切、预算是硬上限还是目标」。这决定 C1 的全部方案，也决定四条 lane 是否共用同一套规则。不先定这层，任何 executional 题都只能在「调预算数值」上打转，而 desktop 证据说明问题不在数值，在单位。
- **当前建议 / 倾向**（Droid）：**B — 分级语义边界：turn 边界优先，step 边界兜底，节点边界只作最后兜底；预算从「累计到即停」改为「目标值」；四条 lane 共用一个切点规则。**
- **Reasoning**：宿主 journal 已有公开的 turn/step 边界事件，切点完全可以对齐它们。严格 turn 原子在长自主 turn 下经常找不到切点，会让同步 FULL 直接失败；只升级到 step 原子又解决不了「当前 turn 的开场请求被摘要掉」。分级规则在正常情况下得到 turn 原子的语义，在长 turn 下优雅降级，而且每次降级都可观测、可登记。

#### 【对本问题的解读】

当前切点算法（`compact-region.js:368-380`）只做两件事：

1. 从尾部往前累计节点 token，**一旦 `accumulated >= retainTokens` 立即停**（`:373`）；
2. 如果停的位置会拆开 tool-call/tool-result，就继续往前退（`:377-380`）。

它不读 `turn/start`、`step/start` 等边界事件（`@deepseek-ai/dsh-session/lib/types/types.d.ts:268-292`）。所以切点落在哪里，完全由 token 数决定。desktop 的 260 次提交（`B10`；`/tmp/dnms-evidence/turnsplit.json`）显示：

| 指标 | 值 | 含义 |
|---|---|---|
| 切在 turn 中间 | 242/260（93%） | 一个 turn 的前半段被摘要，后半段原样保留 |
| 保留尾部没有任何 user 消息 | 39/260（15%） | 模型看到的「最近对话」以 assistant 或 tool 结果开头，当前任务的原始请求只剩摘要里的转述 |
| 被摘要掉的「当前 turn 前半段」 | p50 8,863 / p90 27,507 / 最大 66,510 tokens | 不是边角，常常是一整段工作 |
| 保留下来的「当前 turn 后半段」 | p50 5,482 / 最大 32,771 tokens | 模型拿到的是没有开头的半段 |
| 保留尾部首个节点类型（样本） | 多为 `assistant/message` | 切点后第一条是模型自己的中间输出 |

本题要 [业主] 决定三件事：

- **切点单位**：节点（现状）/ step / turn，或分级；
- **预算语义**：硬上限（累计到即停）还是目标值（在目标附近选最近的合法边界）；
- **lane 统一**：async、同步 FULL、overflow、手动 `/compact` 是否共用同一规则。

本题**不**裁决具体预算数值、目标区间宽度、降级时摘要如何保留当前 turn 的开场请求（这些是 executional 题），也不裁决模型被告知什么（Q4）。

#### 【可选选项清单】

| 选项 | 切点单位 | 预算语义 | 找不到合法边界时 | lane |
|---|---|---|---|---|
| **A** 现状 | 节点 + tool-pair 回退 | 硬（累计 `>=` 即停） | 回退到更早的平衡节点 | 共用，但仍是节点语义 |
| **B** 分级语义边界（**推荐**） | ① turn 边界 → ② step 边界 → ③ 平衡节点边界 | 目标值：在目标附近选最近的合法边界，并受上限约束 | 逐级下降；每次下降都记录降级级别 | 四条 lane 共用一个规则，只是预算不同 |
| **C** 严格 turn 原子 | 只在 turn 边界 | 目标值 | 不压缩（async drop；FULL 失败或另走路径） | 共用 |
| **D** step 原子 | 只在 step 边界 | 硬或目标 | 回退到更早的 step 边界 | 共用 |

#### 【推荐选项的详细执行说明与分析】（B）

1. **边界层级**（从高到低，选能满足预算约束的最高一级）：
   - **turn 边界**：切点紧接在某个 `turn/start` 之前，保留尾部从一个完整 turn 的开场 user 消息开始；
   - **step 边界**：当保留完整 turn 会突破上限时（典型是当前 turn 是一个很长的自主 turn），切点落在当前 turn 内某个 `step/start` 之前，不切开任何 step；
   - **平衡节点边界**：只有当单个 step 本身就超过上限时才使用，也就是现状算法；这是宿主 README 已承认的「不可分单元超预算」情况（`@deepseek-ai/dsh-compaction-basic/README.md:256`）。
2. **预算从硬上限改为目标值**：每条 lane 给出一个保留目标。选择器在目标附近找最近的合法边界，允许略多或略少，但受两条约束：
   - **上限**：保留尾部不得大到让本次压缩达不到该 lane 的回落要求（例如同步 FULL 必须降到阈值以下，`host-compaction.js:571-587`）；超限就降一级；
   - **下限**：保留尾部不得为空（`retain = 0` 的 lane 也至少保留到最近的合法边界）。
   目标、上限、下限的具体取值与公式留给 executional 题。
3. **四条 lane 共用一个规则（硬切，不双写）**：async（`:368`）、同步 FULL（`:572`）、overflow（`:537`）、手动 `/compact`（`:692`）调用同一个选择器，只传入不同的预算。不保留「旧节点算法」作为可选模式，旧实现直接退役（`-02②`）。
4. **降级可观测**：每次选择记录实际使用的边界级别（turn / step / node）与保留量；记录落在哪个观测面（账本或 journal 派生）按 `-01③` 在观测簇裁决。
5. **安全不变量不变**（`-02③`）：tool-pair 用包根 `toolPairingBalancedBefore/After` 校验；`system/message` 头部不被遮蔽（`compact-region.js:366`）；`validateSurfaceRegion`（`:388-406`）继续作为最终校验。turn/step 边界只是让候选切点更少、更有语义，不放松任何校验。
6. **降级到 step 级时的语义补偿**：当前 turn 的开场 user 消息会被摘要掉。补偿方式（摘要指令必须原文保留当前请求，或帧中标注「当前 turn 从第 N 步起保留」）属于 prompt 与帧的设计，由 Q4 与后续 prompt 簇题裁决；本题只冻结「step 级降级必须有补偿」这一要求。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

| 证据 | 位置 | 说明 |
|---|---|---|
| turn/step 边界是宿主公开类型 | `@deepseek-ai/dsh-session/lib/types/types.d.ts:268-292`（step = 一次模型调用加它请求的工具执行，`:283`） | 对齐它们不依赖宿主私有实现，符合 `-02①` 与 `B05` |
| 当前算法不读边界 | `compact-region.js:368-380` | 242/260 切在 turn 中间的直接原因 |
| 现状把「当前 turn 前半段」大量摘要掉 | `B10`；`/tmp/dnms-evidence/turnsplit.json`（partialShadow p50 8,863 / p90 27,507） | 问题在单位，不在预算数值；只调 `pinnedAsyncTokens` 解决不了 |
| 宿主承认单元可能超预算 | `@deepseek-ai/dsh-compaction-basic/README.md:256` | 必须有兜底层级，严格原子不可行 |
| 预算现状本身就是近似值 | `compact-policy.js:27,89`（`0.15·W` 上限）；宿主默认比例「undecided」（`@deepseek-ai/dsh-compaction-basic/README.md:269`） | 把预算当硬上限没有依据，当目标值更符合它的来源 |
| 四条 lane 已经共用一个函数 | `host-compaction.js:368,537,572,692` | 统一规则只改一处，没有双写 |

**A（现状）的反例**

- 242/260 切在 turn 中间、39/260 尾部无 user 消息（`B10`），正是 [业主] 担心 ① 的原样。
- 「累计到 `>=` 即停」会把一个大节点的全部 token 算进保留，也会因为差几个 token 把整个 turn 切开，切点对 token 估算误差极敏感。

**C（严格 turn 原子）的反例**

- 39/260 的保留尾部没有 user 消息，说明当时整个保留尾部都落在一个 turn 内；样本中有 tailTokens 81,101、32,771 的长 turn（`turnsplit.json`）。严格 turn 原子在这些场景下找不到切点。
- 同步 FULL 要求必须降到阈值以下，否则抛错（`host-compaction.js:575-586`）；严格 turn 原子会把这类情况变成压缩失败，反而把会话推向 overflow。

**D（step 原子）的反例**

- 解决了「切开 step」，但当前 turn 的开场请求仍会被摘要掉，39/260 的问题基本不变。
- 正常情况下（turn 不长）明明可以在 turn 边界切，D 却放弃了这种更好的语义。

- **问题**：你是否同意 **B**：① 切点按 turn 边界 → step 边界 → 平衡节点边界三级选择，取满足预算约束的最高一级；② 保留预算从「累计到即停」的硬上限改为目标值，受上限（不得妨碍 lane 的回落要求）与下限（不得为空）约束，具体数值留给 executional 题；③ async、同步 FULL、overflow、手动 `/compact` 四条 lane 共用同一个选择器，旧节点算法直接退役；④ 每次选择记录实际边界级别与保留量，观测面落点按 `-01③` 另题裁决；⑤ 降级到 step 级时必须有语义补偿，补偿方式由 Q4 与 prompt 簇裁决；⑥ `-02③` 的安全不变量与 `validateSurfaceRegion` 校验不变？若不同意，请选 A / C / D 或给出修改。
- **业主回答**：同意推荐 **B**（2026-11-17）→ 冻结为 `T-O-ACE1117-03`

---

### Q4 — 模型知情面的合同形态：静默、只改帧，还是帧加只读 inspection 工具？（驱动真相：`-01①`、`-02②④`、`B03②`、`B04`、`B06`、`B07` · 来源：评估 §5.2、R07–R12）

- **影响范围**：[DNMSC] `lib/compact-region.js` 的 checkpoint 帧（`:248-258`）与摘要指令中「不提压缩」一条（`:222`）；可能新增的 model-facing 工具注册（`ctx.tools.register`，本仓首个）；DNMS01 `-11`（`DNMS01-qna-truth.md:163`）与 `-13`（`:186`）中「不新增 model-facing tool」的否决；后续 UI 心跳簇（担心 ③）与 prompt 簇（担心 ④）。
- **为什么必须确认**：新增 model-facing 工具是公共合同变更，按仓根「不得擅自扩约」必须由 [业主] 决定并登记；`-02④` 已明确把它留给专题。同时，帧文本怎么写、要不要另外发通知、要不要告诉模型「正在压缩」，都在回答同一个问题：**模型通过哪个载体、在哪个时刻、知道哪些事实**。不先定这个合同形态，帧、指令、工具、UI 投影会各自设计，出现同一事实多处表述。
- **当前建议 / 倾向**（Droid）：**C — checkpoint 帧是告知模型的唯一载体，只告知 durable 事实；另外新增一个只读、只看本会话、按条件出现的 checkpoint inspection 工具；接替 DNMS01 `-11`、`-13` 中对应的否决。**
- **Reasoning**：checkpoint 消息本身就是一条在替换发生那一刻出现、durable、可回放的模型可见消息，用它告知是零额外载体；再发一条 notice 就是同一事实写两次。模型不应被告知「排队中 / 正在压缩」这类会失败的临时状态，因为模型可见消息会进入 durable 历史。inspection 工具是 [业主] 担心 ② 明确要求的能力；checkpoint 已在 journal 中记录了它替换掉的原始事件序号（`compact-region.js:506`），工具只读这些已有事实，不产生第二份状态。

#### 【对本问题的解读】

当前模型对压缩完全不知情，而且是被要求不知情：

| 位置 | 内容 | 效果 |
|---|---|---|
| 摘要指令 `compact-region.js:222` | 「Do NOT mention this summarization request or that the context was compacted.」 | 摘要正文不说明自己是摘要 |
| checkpoint 前言 `:248-249` | 「Continue the task directly … without acknowledging this checkpoint.」 | 模型被要求假装没有发生替换 |
| 工具 | 本仓没有任何插件注册 model-facing 工具（§3.4） | 模型无法查回被替换的原文 |
| DNMS01 | `-11`、`-13` 都否决新增 model-facing tool（`DNMS01-qna-truth.md:163,186`） | 现有合同禁止 inspection 工具 |

宿主提供了三类可用载体（§3.4）：

1. **checkpoint 帧**：checkpoint 是 `source.kind = 'compact-checkpoint'` 的 sourced `user/message`（`@deepseek-ai/dsh-compaction/lib/types/checkpoint.d.ts:17-31`），帧文本完全由 backend 决定（`compact-region.js:252-258`）。
2. **独立 sourced 通知**：`form: 'notice'`，「刚发生的一件事」，必须带 ≤120 字符摘要（`@deepseek-ai/dsh-llm/lib/types/message.d.ts:53-54,86-88,114`）；宿主插件已有先例（`@deepseek-ai/dsh-repeat-tool-reminder/README.md:91`、`@deepseek-ai/dsh-time-context/README.md:67`）。
3. **model-facing 工具**：`ctx.tools.register(defineTool(...))`，可用 `when` 条件按 step 决定是否可见（`@deepseek-ai/dsh-tools/README.md:30,45,69`）。

本题要 [业主] 决定：

- 用哪个载体告知模型，是否允许多个载体表述同一事实；
- 告知哪类事实：只有 durable 的（已提交的压缩），还是也包括临时状态（armed、running）；
- 是否放开一个 model-facing inspection 工具，以及它的合同边界（只读、范围、出现条件）。

本题**不**裁决帧的具体文本、字段格式、工具名称与参数 schema、输出大小控制（这些是 executional 题），也不裁决 UI 心跳。

#### 【可选选项清单】

| 选项 | 告知载体 | 告知的事实 | inspection 工具 | 与 DNMS01 `-11`/`-13` |
|---|---|---|---|---|
| **A** 静默（现状） | 无；前言要求不承认 | 无 | 无 | 维持 |
| **B** 只改帧 | checkpoint 帧 | 已提交的压缩 | 无 | 维持 |
| **C** 帧 + 只读工具（**推荐**） | checkpoint 帧（唯一载体） | 只有已提交的压缩 | 一个只读、只看本会话、有 checkpoint 时才出现的工具 | 接替对应否决（append-only 指针） |
| **D** 多载体 | checkpoint 帧 + 提交后一条 `notice` + 运行中状态提示 | 已提交 + 临时状态 | 同 C | 接替 |
| **E** 依赖宿主 `dsh-tool-session-query` | checkpoint 帧 | 已提交的压缩 | 借用宿主实验包的 `session_event_read/trace` | 不新增本插件工具，但依赖一个默认不装的包 |

#### 【推荐选项的详细执行说明与分析】（C）

1. **checkpoint 帧是唯一告知载体**：
   - 帧不再要求模型「不承认」，改为明确说明：之前的一段对话已被压缩替换、替换了什么范围、保留尾部从哪里开始、如何查回原文。具体字段与文本留给 executional 题。
   - 摘要指令中「不提压缩」一条（`:222`）必须与帧一致，不得互相矛盾；指令的整体重写在 prompt 簇裁决（`-01③` 的 D3 一并处理）。
   - 不另发 `notice` 或其他 sourced 消息表述同一次压缩：帧与 checkpoint 同时出现、同样 durable，再发一条就是同一事实写两次（硬切，不双写）。
   - Q3 的 step 级降级补偿（`-03⑤` 若冻结）也通过帧或摘要承载，不新增载体。
2. **只告知 durable 事实**：
   - 模型只在压缩**提交后**、通过 checkpoint 得知；armed、running、failed 等临时状态不进入模型上下文。
   - 原因：sourced 消息是 durable 对话内容，会回放、会被后续压缩（`@deepseek-ai/dsh-agent-instructions/README.md:90`）。告诉模型「正在压缩」而之后失败，历史里就留下一条不真实的消息；模型也无法对临时状态采取任何行动。
   - 临时状态只给人看（UI 心跳簇）。
3. **只读 inspection 工具（本仓首个 model-facing 工具）**，foundational 层只冻结以下边界：
   - **只读**：不修改 session、不触发压缩、不写任何文件；
   - **只看本会话**：只能读当前会话中由 checkpoint 替换掉的事件，不跨会话；
   - **数据来源是 journal 已有事实**：checkpoint 追加时已记录 `sourceEventSeqs: [startEvent.seq, summaryEvent.seq, ...shadowedSeqs]`（`compact-region.js:504-507`），工具按这些序号读原始事件；不建索引、不存副本、不新增 durable 状态（`B06`）；
   - **按条件出现**：用 `ctx.tools.register` 的 `when` 条件，只有当前 surface 上存在本插件写入的 checkpoint 时才对模型可见（`@deepseek-ai/dsh-tools/README.md:69`）；没有压缩过的会话不多一个 schema；
   - **只在 ON 态存在**：工具随 [DNMSC] bundle 注册，OFF 态 bundle 卸载，工具一并消失（`B07`）；
   - 工具名、参数、输出格式、大块输出如何控制留给 executional 题。
4. **合同登记**：本题答复即为「新增一个 model-facing 工具」这一公共合同变更的唯一登记；按 `-01②`，全轮冻结时在 DNMS01 接替表中追加 `-11`、`-13` 对应否决项 → 本条 truth-id 的指针。DNMS01 其余否决（不新增 lane、event type、不 import [nano-agent] 代码等）不受影响。
5. **[nano-agent] 的位置**：nano 有 `context_inspect` 与边界帧设计（评估 §1），按 `B04` 只作语义参照，本题的推荐理由不依赖它。

#### 【推荐选项支持证据或其他选项的反例】

**支持 C 的证据**

| 证据 | 位置 | 说明 |
|---|---|---|
| checkpoint 本身就是模型可见、durable 的 sourced 消息 | `@deepseek-ai/dsh-compaction/lib/types/checkpoint.d.ts:17-31`；`compact-region.js:444,504-507` | 帧就是现成载体，告知不需要新消息 |
| 帧文本由 backend 决定 | `compact-region.js:252-258`；`-02②` | 改帧在语义层，不碰协议层 |
| 当前帧与指令主动要求模型不知情 | `compact-region.js:222,249` | 担心 ② 在模型侧的直接原因 |
| journal 已记录被替换事件的序号 | `compact-region.js:506` | inspection 工具只读已有事实，不产生第二份状态 |
| 插件注册条件工具是宿主公开能力 | `@deepseek-ai/dsh-tools/README.md:30,45,69` | 工具可以只在有 checkpoint 时出现，不给普通会话增加成本 |
| 宿主生态认可「让模型查被替换原文」 | `@deepseek-ai/dsh-tool-session-query/README.md:47-51`（`session_event_trace` 查位置替换关系） | 需求本身在宿主里已有先例 |
| sourced 消息是 durable 对话内容 | `@deepseek-ai/dsh-agent-instructions/README.md:90` | 临时状态不应进入模型上下文 |
| 压缩本身已改变 surface | `compact-region.js:504-505`（`surfaceOp.replace`） | 工具在首次压缩后才出现，导致的工具列表变化与 surface 替换同时发生，不额外破坏前缀缓存 |

**A（静默）的反例**

- 担心 ② 原样存在：模型被要求假装没有替换，遇到保留尾部与摘要衔接不上时无从判断原因，也无法查回原文。
- 与 Q3 冲突：若 Q3 冻结 step 级降级必须有补偿，A 下没有任何载体可以承载补偿。

**B（只改帧）的反例**

- 模型知道发生了压缩，但查不回原文；摘要漏掉的精确信息（路径、错误串、数值）只能靠重新执行工具获取，部分信息（用户早先的原话）根本无法恢复。
- [业主] 担心 ② 明确要求 inspection 工具，B 只回答了一半。

**D（多载体）的反例**

- 帧与 notice 表述同一次压缩，是同一事实的两次写入，违反「能硬切就不双写」。
- 运行中状态写进模型上下文，失败后留下不真实的 durable 历史（`B06`），模型也无法据此行动。
- notice 只能在下一次 pre-step 追加，会出现在保留尾部之后，时序上与 checkpoint 分离，模型更难对应。

**E（依赖 `dsh-tool-session-query`）的反例**

- 该包是实验性、opt-in，需要 `ctx.sessionQuery` 后端，web 组合默认不装（`@deepseek-ai/dsh-tool-session-query/README.md:12,28`）；[DNMSC] 的语义会依赖一个大多数用户没有的包。
- 启用后每个请求固定多 5 个工具 schema 与一段系统提示（`:12`），成本远高于一个按条件出现的工具。
- 让本插件的行为由另一个包的存在与否决定，违背「不得侧载」的本意与插件之间相互独立的要求。

- **问题**：你是否同意 **C**：① checkpoint 帧是告知模型的唯一载体，帧不再要求「不承认」，改为说明已压缩、替换范围、保留起点与查回方式，摘要指令不得与帧矛盾，不另发 notice；② 模型只被告知已提交的压缩，armed/running/failed 等临时状态不进入模型上下文；③ 新增一个只读、只看本会话、数据只来自 checkpoint 已记录的 `sourceEventSeqs`、仅在当前 surface 存在本插件 checkpoint 时由 `when` 条件暴露、OFF 态随 bundle 消失的 inspection 工具；④ 本答复是该公共合同变更的唯一登记，全轮冻结时按 `-01②` 为 DNMS01 `-11`、`-13` 的对应否决追加接替指针；⑤ 帧文本、工具名称与 schema、输出大小控制留给 executional 题？若不同意，请选 A / B / D / E 或给出修改。
- **业主回答**：同意推荐 **C**（2026-11-17）→ 冻结为 `T-O-ACE1117-04`

---

## 5. ★ Round 2 总结与中场评估 II（Round 2 → Round 3）

### 5.1 Round 2 判定

| 题 | [业主] 裁决 | 冻结为 | 一句话结论 |
|----|-------------|--------|------------|
| Q3 | 同意推荐 B | `T-O-ACE1117-03` | turn → step → node 三级切点；预算改为目标值；四条 lane 共用一个选择器；step 级降级必须补偿 |
| Q4 | 同意推荐 C | `T-O-ACE1117-04` | checkpoint 帧是唯一告知载体，只告知已提交事实；新增一个只读、本会话、按条件出现的 inspection 工具 |

### 5.2 Round 2 固化了什么

1. **语义层的两根主梁已定**：切点按语义边界（`-03`），模型知情只走 checkpoint 帧加只读工具（`-04`）。之后的题只回答「怎么做」，不再回答「做什么」。
2. **事实分成两类**：已提交的压缩是 durable 事实，可以进模型上下文；armed / running / 无括号失败是临时状态，只能给人看（`-04②`）。这条直接决定 UI 心跳题的边界。
3. **三处语义要求要落到 prompt**：帧与指令一致（`-04①`）、step 级降级补偿（`-03⑤`）、摘要知道保留尾部存在（`-03` 让切点可能落在 turn 内）。prompt 不再是可以随意整段替换的文本，而是承载合同的组件。

### 5.3 诚实反方制衡

| 风险 | 来自 | 制衡 |
|------|------|------|
| 分级切点比现状复杂，边界判定出错会让压缩失败 | `-03①` | `validateSurfaceRegion` 与 tool-pair 校验不变（`-03⑥`）；三级都失败时行为与现状一致（返回 null），不比现状更差 |
| inspection 工具是本仓第一个 model-facing 工具，会给每个压缩过的会话增加一个 schema | `-04③` | `when` 条件只在有 checkpoint 时暴露；首次出现与 surface 替换同时发生，不额外破坏前缀缓存；schema 大小在 Round 4 题中控制 |
| 「只告知已提交事实」意味着模型在摘要进行中毫不知情 | `-04②` | 在途期间模型上下文没有变化，模型不需要知道；替换发生的那一刻帧就到达 |

### 5.4 新的事实调查（为 Round 3 取证）

| 发现 | 证据 | 对 Round 3 的意义 |
|------|------|-------------------|
| arm 后**立即**起摘要：`_armEpisode` 设 `armed` 后，同一调用里 `_beginEpisodeAttempt` 就把 phase 改成 `running` | `host-compaction.js:274,650,663,304` | idle 回落分支只认 `armed`（`:177`），永远不会命中；turn 先于摘要结束时，提交要等下一条用户消息的 pre-step（`:145-152`） |
| 摘要期间不持 durable 锁：`deferStart` 让括号只在提交瞬间存在 | `compact-region.js:604-609,639-645`；`host-compaction.js:376` | 手动 `/compact` 只检查未配对括号（`:688-691`），看不到在途 episode；同步 FULL 在 pre-step 也可能与在途 episode 并发（`:619-623`）；之后 async 提交因 surface 变化失败 |
| surface 变化被归为 transient，计入 circuit | `host-compaction.js:512,488-493` | 自家 lane 抢占导致的失败会让 circuit 打开，抑制后续 async |
| 超时只发 abort，不立即结算 | `host-compaction.js:315-326` | 若流不响应 abort，episode 停在 `running` |
| `MAX_CLAIM_ATTEMPTS` 与 `claimAttempts` 从未递增 | `host-compaction.js:68,280,307` | 死常量 |
| 非 transient 失败（如 `no-range`）后 phase 回 `none`，下一个 step 立即重新 arm | `host-compaction.js:484-496,626-664` | 每个 step 都可能 arm → drop 一次，刷账本、可能重复花摘要费用 |
| episode 表只增不删 | `host-compaction.js:95,108-122` | 长进程内存随会话数增长 |
| 无窗口信息时静默返回 | `host-compaction.js:596` | 没有任何日志或账本记录 |
| 客户端有 4 个刷新定时器：选择器 15 s 常驻、徽标 15 s/3 s、面板 30 s、对话框 3 s | `ModelSelector.jsx:273-300`；`AsyncStatusBadge.jsx:22,24,52`；`CompactPanel.jsx:102`；`AsyncHistoryDialog.jsx:37,99-105` | 违背 `-21④` 零轮询；选择器的 15 s 定时器随页面常驻，与会话无关 |
| 宿主为 session 级 slot 提供 `useProjection`（宿主计算的 projection 值）与 `useSessionStatus`（`running`） | `@deepseek-ai/dsh-client-ui-session/lib/types/client/index.d.ts:29-37,80-88`；徽标所在 slot 是 session 级（`@deepseek-ai/dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts:259-264`） | 已提交事实可以由宿主推送到客户端，不需要轮询 |
| session projection 由插件注册，从已提交的 journal 事件同步折叠，值变化时推送给客户端 | `@deepseek-ai/dsh-session-projection/README.md:12,28,36,133` | 推送通道只覆盖 journal 事实；临时状态不在 journal 里，推不过去 |
| `-21①` 规划的 projection 未落地：`runtime` 用 `null` 占位 | `dsh-nano-model-selector/index.js:428`；`DNMS01-qna-truth.md:230` | 现有观测面与冻结真相再一处漂移 |
| [DNMS] 手抄了一份摘要指令，只靠注释「Must stay equal」保持一致 | `dsh-nano-model-selector/lib/compact-prompt.js:1-2`；`CompactPanel.jsx:7,480,495` | 三份 prompt（宿主、DNMSC、DNMS）没有任何一致性检查 |
| `compact-policy.js` 在两个包里各有一份，内容逐字相同（271 行，`diff` 无差异），无同步机制 | `dsh-nano-model-selector/lib/compact-policy.js`；`dsh-nano-model-selector-compaction/lib/compact-policy.js`；`dsh-nano-model-selector/package.json:27-28` | 新发现的漂移源，记为 **D11**；与 prompt 副本同类 |
| 本仓已有「从单一来源构建时烘焙」的先例：[DNMS] 的 `lib/bindings.js` 由仓根 `security/route-sensitivity.json` 按 id 烘焙 | `dsh-nano-model-selector/AGENTS.md`（交付物表与前置第 7 条） | 共享模块单一真源可以复用这个模式 |
| 本机两个 profile 的 `async-compact.json` 都没有 `summaryPrompt` 字段 | `~/.dsh-desktop/…/async-compact.json`、`~/.dsh/…/async-compact.json`（只读检查） | 全文覆盖功能在本机零使用，硬切成本极低 |
| 策略校验拒绝未知字段与未知 schema | `compact-policy.js:104-110` | 删除或新增字段必须明确处理既有文件，否则会进入 safety-only |

### 5.5 为什么注入 Round 3 这三题

- **Q5（生命周期与互斥）**：评估 P0 中最多的一簇（C5），`B11` 所列缺陷几乎都在这里，D6、D7 两处漂移也在这里。它决定 episode 有哪些状态，是 UI 题的前提。驱动真相：`-01③④`、`-03③`、`B06`、`B11`。
- **Q6（观测与 UI 心跳）**：[业主] 担心 ③。D4 账本与 D5 轮询的去留、`-11`/`-15` 的内部矛盾都在这里消解。驱动真相：`-01③`、`-04②`、`-03④`、`B06`、`B08`、`B09`。
- **Q7（prompt 单一真源与管理）**：[业主] 担心 ④。D3 `summaryPrompt` 的重设计、三份 prompt 副本、新发现的 D11 都在这里。驱动真相：`-02②`、`-03⑤`、`-04①`、`B06`、单一真源原则。

### 5.6 第 4 轮能否完成真相层冻结

**判断：可以，前提是 Round 3 三题按推荐或小幅修改冻结。**

Round 3 冻结后，剩余的执行层未决项可以收进 Round 4 的 3 题，不需要 Round 5：

| 剩余未决项 | 依赖 | 预计归属 |
|------------|------|----------|
| 切点选择器的目标、上限、下限取值；`pinnedAsyncTokens`、`pinnedFullTokens` 两个字段的去留与语义；checkpoint 帧的字段与文本结构 | `-03②`、`-04①⑤` | Round 4 第 1 题 |
| inspection 工具的名称、参数 schema、输出大小控制与呈现 | `-04③⑤` | Round 4 第 2 题 |
| 阈值与收尾：D1（S 值）、D2（等号）、D10（base 扁平行）、D8（入口位置）、D9（i18n 与缓存键）；验收方式（只用既有检查，`B13`）；DNMS01 接替指针表与 closure 文档的收尾 | `-01②③⑤`、`B13` | Round 4 第 3 题 |

**需要 Round 5 的情况**：如果 [业主] 在 Round 3 否决推荐并选了会产生新依赖的方案，例如 Q6 选择严格零轮询（在途状态不可见，需要另题决定是否接受担心 ③ 部分不解），或 Q5 选择回退 DNMS01 调度（需要另题重新处理延迟问题）。这些情况下第 3 题的「阈值与收尾」会被挤出，需要第 5 轮。

---
## 6. Round 3 —— 生命周期、观测与 prompt（`Q5–Q7` · executional）

> 本轮 second-opinion 模式：`retired`。
> **为什么 Round 3 问这三题**：见 §5.5。三题分别对应评估 C5（生命周期）、C3（UI 心跳，担心 ③）、C4（prompt，担心 ④），并按 `-01③` 消化 D3–D7 与新发现的 D11。
> **本轮驱动真相**：`T-O-ACE1117-01`–`04`；Baseline `B06`、`B07`、`B08`、`B09`、`B11`、`B13`。

---

### Q5 — async episode 的生命周期与互斥：采纳现行调度并补上进程内互斥，还是回退 DNMS01，或改用全程 durable 锁？（驱动真相：`-01③④`、`-03③`、`-04②`、`B06`、`B11` · 来源：评估 §5.5、R26–R36；漂移 D6、D7）

- **影响范围**：[DNMSC] `lib/host-compaction.js` 的 episode 状态机（`:95,108-122,259-509`）、pre-step 门（`:139-170,591-667`）、idle 回落（`:174-188`）、手动 `/compact`（`:681-729`）、overflow 与换模型路径（`:192-253`）；`lib/compact-region.js` 的 `deferStart`（`:604-645`）；DNMS01 `-18①②⑦⑧` 的接替指针。
- **为什么必须确认**：D6（调度）与 D7（锁）是现行代码与 `-18` 最大的两处偏离；`B11` 的七项缺陷有六项在这条生命周期上。按 `-01④`，这些问题等计划统一处理，计划需要一个明确的目标状态机。
- **当前建议 / 倾向**（Droid）：**B — 采纳现行调度（arm 即起摘要，下一 step 边界提交），补上 turn 先结束时的 idle 提交；durable 括号仍只在提交瞬间存在，另加 engine 内的 session 级互斥，让所有 lane 看到在途 episode；失败、超时、去抖、回收、死代码一并按统一规则处理。**
- **Reasoning**：现行调度把 claim→commit 从 115–132 s 降到 15–17 s（`B10`），回退就是性能回归。全程 durable 锁会让 S 线 FULL 在摘要期间无法执行，进程崩溃还会留下需要人工处理的未配对括号。缺陷的根源不是「不持 durable 锁」本身，而是其他 lane 看不到在途 episode；补上进程内互斥，再保留提交时的 durable 复查（`compact-region.js:639-645`），就同时得到低延迟和 one-active。

#### 【对本问题的解读】

现行 episode 实际只有三个状态：`none` → `running` → `none`。`armed` 只在同一个同步调用里存在一瞬（`host-compaction.js:274` 设置，`:663` → `:304` 立即改为 `running`）。由此产生的问题：

| # | 问题 | 证据 | 后果 |
|---|------|------|------|
| L1 | idle 回落只认 `armed`，永远不命中 | `:177` | turn 先于摘要结束时，提交要等下一条用户消息（`:145-152`），可能隔几小时 |
| L2 | 其他 lane 看不到在途 episode | 手动 `/compact` 只查未配对括号 `:688-691`；同步 FULL `:619-623`；overflow `:233` | 并发压缩后 async 提交因 surface 变化失败 |
| L3 | 自家抢占导致的失败被算作 transient | `:512,488-493` | circuit 被自己打开，后续 async 被抑制 |
| L4 | 超时只发 abort | `:315-326` | 流不响应时 episode 卡在 `running` |
| L5 | 非 transient 失败无去抖 | `:484-496,626-664` | 每个 step arm → drop 一次 |
| L6 | 死常量 | `:68,280,307` | 误导维护者 |
| L7 | episode 表只增不删 | `:95,108-122` | 长进程内存增长 |
| L8 | 无窗口信息静默返回 | `:596` | 无任何记录 |
| L9 | 文件头仍描述旧调度 | `:8-12` | 文档与代码不一致 |

本题要 [业主] 决定：

- 调度：采纳 D6（arm 即起摘要）还是回退 `-18①`（idle 后 `runMaintenance`）；
- 互斥：durable 括号何时打开，以及在途 episode 如何对其他 lane 可见；
- 失败处理：超时、去抖、抢占分类、回收的统一规则。

本题**不**裁决失败与在途状态如何呈现给人（Q6），也不裁决具体超时数值以外的参数。

#### 【可选选项清单】

| 选项 | 调度 | durable 括号 | 在途对其他 lane 可见 | 缺陷处理 |
|---|---|---|---|---|
| **A** 追认现状 | arm 即起摘要（D6） | 只在提交瞬间（D7） | 否 | 只删死代码 |
| **B** 采纳调度 + 进程内互斥（**推荐**） | arm 即起摘要；下一 step 边界提交；turn 先结束则 idle 时经 `runMaintenance` 提交 | 只在提交瞬间，提交时 durable 复查 | 是，engine 内 session 级互斥 | L1–L9 统一处理 |
| **C** 回退 DNMS01 `-18` | arm 后 `followup`，idle 后 `runMaintenance` 摘要并提交 | 摘要开始即打开，跨 async gap | 是（durable） | 按 `-18` 原文 |
| **D** 全程 durable 锁 + 现行调度 | arm 即起摘要 | arm 时打开 `compaction/start`，提交时关闭 | 是（durable） | L1–L9 处理 |

#### 【推荐选项的详细执行说明与分析】（B）

1. **调度（D6 → 采纳并登记）**：
   - B 线越线时 arm，并在同一 pre-step 起摘要（现行 `:650,663`）；
   - 摘要完成后，在下一个 step 边界、请求组装之前提交（现行 `:145-152`），后续请求立即看到压缩后的 surface；
   - **turn 先结束**：agent 进入 idle 且摘要已就绪（或就绪时 agent 已 idle）时，经 `agent.runMaintenance` 提交，不再等下一条用户消息；修正 `:177` 的判定，`armed` 分支退役；
   - 文件头 `:8-12` 改为描述实际调度，来源注释指向本条 truth-id。
2. **互斥（D7 → 重设计）**：
   - durable 括号仍只在提交瞬间打开（`deferStart`），提交时 `openBracket` 复查未配对括号（`compact-region.js:639-645`），这是跨进程 one-active 的最后保证，保留不变；
   - 新增 **engine 内 session 级互斥**：在途 episode 对本 engine 的所有入口可见；
   - **抢占规则**：
     - 手动 `/compact`（用户显式意图）与同步 FULL（S 线、DC-1、post-adoption over-health、换模型、overflow）进入前，先撤销在途 episode，再执行；
     - async arm 在任何 lane 活跃时跳过；
   - 被抢占的 episode 以独立原因 `preempted` 结束，**不计入 circuit**；只有外部原因导致的 surface 变化才算 transient。
3. **失败处理**：
   - **超时立即结算**：计时器到点时，engine 自己把 episode 结算为 `timeout` 并放弃结果，不再等待流响应 abort；迟到的结果直接丢弃；
   - **按 turn 去抖**：非 transient 失败（`no-range`、`failure`、`unknown`、`degraded`）后，同一 turn 内不再 arm，下一个 turn 才允许；transient 失败维持 `-18⑧` 的 circuit；
   - **无窗口信息**：不再静默返回，记录一条 `skip`（原因 `no-window`），落点按 Q6。
4. **回收与退役**：
   - episode 在结算且 circuit 关闭时从表中删除；circuit 打开的条目保留到恢复条件满足（`-18⑧`）；
   - 退役 `MAX_CLAIM_ATTEMPTS`、`claimAttempts`（`:68,280,307`）与 `armed` 的 idle 分支。
5. **不变的部分**：`-18④` 各入口的失败分型（pre-step 绝不抛等）、`-18⑤` safety-only、`-18⑦` 不自动清理未配对括号、`-18⑨` overflow 重试上限 1，全部保留。
6. **登记**：本题答复接替 `-18①`（调度）与 `-18②`（one-active 的实现方式：durable 括号 + engine 内互斥）；`-18③④⑤⑦⑧⑨` 不受影响。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

| 证据 | 位置 | 说明 |
|---|---|---|
| 现行调度显著降低延迟 | `B10`：旧构建 claim→commit 115–132 s（另一例 56 min），当前 15–17 s | D6 有实测收益，值得登记 |
| 提交时已有 durable 复查 | `compact-region.js:639-645` | 跨进程 one-active 已经有保证，缺的只是 engine 内可见性 |
| 并发冲突的入口都在同一个 engine 内 | 手动 `:688-691`、FULL `:619-623`、overflow `:233`、换模型 `:199` | 进程内互斥能覆盖所有冲突源 |
| 抢占被误算为 transient | `:512,488-493` | 分出 `preempted` 是对现状的直接修正 |
| 超时没有兜底结算 | `:315-326` | 立即结算让状态机在有限时间内一定回到 `none` |
| 宿主允许 maintenance 括号在 idle 时提交 | `compact-region.js:612-614`（deferStart 在提交时按是否有 open turn 决定 owner）；`host-compaction.js:684`（手动路径已用 `runMaintenance`） | idle 提交不需要新机制 |

**A（追认现状）的反例**

- L1–L5 都会继续存在；L2、L3 组合起来，手动 `/compact` 与 async 并发后 circuit 可能被自己打开，用户看到的是 async 莫名停用。
- 把 D7 原样登记，等于承认「其他 lane 看不到在途 episode」是合同，违背 `-18②` one-active 的本意。

**C（回退 DNMS01 `-18`）的反例**

- 回到等整轮结束再摘要，claim→commit 回到 115–132 s 量级（`B10`），async 在用户看来变成串行。
- 摘要开始就打开括号要求会话 idle：`compact-region.js:604-608` 的注释写明，`owner: null` 在 turn 进行中拒绝打开括号。C 无法与「turn 进行中摘要」共存。

**D（全程 durable 锁）的反例**

- 摘要期间（15–76 s，最长一例 340 s）括号一直打开，S 线 FULL 与手动 `/compact` 都会被 `assertNoActiveCompaction` 拒绝（`compact-region.js:571-584`），上下文逼近窗口时无法阻塞压缩，只能等 overflow。
- turn 进行中打开的括号需要绑定 turn owner；摘要跨过 turn 结束时，括号属于一个已经结束的 turn。
- 进程崩溃留下未配对括号，按 `-18⑦` 不自动清理，会话在下一次 end-seed 之前无法压缩（`compact-region.js:571-578`）。

- **问题**：你是否同意 **B**：① 采纳 D6 调度——arm 即起摘要、下一 step 边界提交；turn 先结束时经 `agent.runMaintenance` 在 idle 提交，`armed` 的 idle 分支退役，文件头改为描述实际调度；② durable 括号仍只在提交瞬间打开并复查；新增 engine 内 session 级互斥，手动 `/compact` 与同步 FULL 先撤销在途 episode 再执行，async arm 在任何 lane 活跃时跳过；被抢占的 episode 记为 `preempted`、不计入 circuit；③ 超时到点立即结算为 `timeout`、迟到结果丢弃；非 transient 失败按 turn 去抖；无窗口信息记录 `skip`（`no-window`）；④ episode 结算且 circuit 关闭时删除条目，`MAX_CLAIM_ATTEMPTS`/`claimAttempts` 退役；⑤ 本答复接替 `-18①②`，`-18③④⑤⑦⑧⑨` 保留？若不同意，请选 A / C / D 或给出修改。
- **业主回答**：同意推荐 **B**（2026-11-17）→ 冻结为 `T-O-ACE1117-05`

---

### Q6 — 观测与 UI 心跳：已提交事实与在途状态分别走哪条通道？账本和轮询怎么处置？（驱动真相：`-01③`、`-03④`、`-04②`、`B06`、`B08`、`B09` · 来源：评估 §5.3、R13–R19；漂移 D4、D5，`-21①` 未落地）

- **影响范围**：[DNMS] `src/client/ModelSelector.jsx:273-300`、`AsyncStatusBadge.jsx`、`CompactPanel.jsx:102`、`AsyncHistoryDialog.jsx:37,99-105`、`src/client/history-format.js`；[DNMS] `index.js` 的 `runtime` 与 `history` 读面（`:292-330,410-492`）；[DNMSC] `lib/async-history.js`；DNMS01 `-11`（`:163`）、`-15`（`:177`）、`-19①`（`:216`）、`-21①④`（`:230`）的接替指针。
- **为什么必须确认**：这是 [业主] 担心 ③（async 设置、诊断、对话内心流）。`-04②` 已定临时状态只给人看，但「给人看」用什么通道还没定。现状有 4 个定时器、一个只读账本、一个用 `null` 占位的 `runtime`，与 `-19`、`-21` 都不一致；`-11`、`-15` 关于 audit 的矛盾也要在这里消解（`-01③`）。
- **当前建议 / 倾向**（Droid）：**B — 两条通道：已提交事实由 [DNMS] 注册宿主 session projection 推送，客户端零轮询；在途状态只来自账本，客户端用一个共享 store 按事件拉取，只在会话运行且有在途 episode 时续拉，落定即停。账本采纳为引擎决策遥测；4 个常驻定时器退役。**
- **Reasoning**：宿主已经给 session 级 slot 提供了 `useProjection` 推送通道，它从已提交的 journal 事件折叠，正好覆盖 durable 事实，而且是 `-21①` 本来就规划的做法。在途状态不在 journal 里，推不过去；完全不刷新又满足不了担心 ③。把刷新收窄到「会话正在运行且确有在途 episode」这个窗口，可以去掉全部常驻轮询，同时保留对话内心流。

#### 【对本问题的解读】

需要呈现给人的事实分两类，来源不同：

| 类别 | 例子 | 唯一来源 | 能否由宿主推送 |
|------|------|----------|----------------|
| 已提交事实 | 一次压缩已提交、替换了多少、哪一级边界、失败括号（`compaction/end` 带 error） | session journal（`B06`） | 能：session projection 从已提交事件折叠并推送（`@deepseek-ai/dsh-session-projection/README.md:12,36,133`），客户端用 `useProjection` 读取（`@deepseek-ai/dsh-client-ui-session/lib/types/client/index.d.ts:85-86`） |
| 在途状态 | armed / running、无括号失败（`no-range`、`preempted`、`timeout`）、`skip` | 引擎决策（目前只写进账本） | 不能：不在 journal 里 |

现状：

| 面 | 现状 | 问题 |
|---|---|---|
| 账本 | `async-history/<sessionId>.jsonl`，[DNMSC] 唯一写入，[DNMS] 只读（`async-history.js:24,48-58`；`index.js:292-330`） | 与 `-19①`「不建 audit」、`-15`「不新建 durable audit 文件」字面冲突；但它是无括号失败的唯一痕迹 |
| `runtime` | `runtimeHandle?.runtime(null, W, null)`，`lastCompaction` 为 `null`（`index.js:428`） | `-21①` 的 projection 没有落地 |
| 客户端刷新 | 4 个定时器（§5.4） | 违背 `-21④`；选择器的 15 s 定时器随页面常驻，与是否打开会话无关 |
| committed 态 | 徽标从账本末条推导，10 分钟内显示「已异步压缩」（`dsh-nano-model-selector/AGENTS.md` 徽标节） | 用时间窗口近似一个 durable 事实 |

本题要 [业主] 决定：

- 账本（D4）的去留与定位，以及 `-11`、`-15` 的读法；
- 已提交事实走什么通道；
- 在途状态走什么通道、什么时候刷新；
- 4 个定时器（D5）如何处置。

本题**不**裁决 UI 的视觉形态、入口位置（D8）与文案（D9），这些在 Round 4 收尾题。

#### 【可选选项清单】

| 选项 | 已提交事实 | 在途状态 | 账本 | 定时器 |
|---|---|---|---|---|
| **A** 追认现状 | 账本末条 + 时间窗口 | 账本 + 轮询 | 保留 | 4 个保留 |
| **B** 双通道（**推荐**） | 宿主 session projection 推送，零轮询 | 账本；共享 store 按事件拉取，仅在「会话运行中且有在途 episode」时续拉 | 采纳为引擎决策遥测 | 4 个常驻定时器退役 |
| **C** 严格回退 `-21④` | 宿主 projection 推送 | 只在打开面板或对话框时拉一次 | 删除 | 全部删除 |
| **D** 新建推送路由 | 宿主 projection 推送 | 新增 SSE / 长轮询路由，宿主侧监听账本文件变化 | 保留 | 改为长连接 |

#### 【推荐选项的详细执行说明与分析】（B）

1. **账本（D4 → 采纳并登记）**：
   - 定位为**引擎决策遥测**：[DNMSC] 唯一写入、[DNMS] 只读、best-effort、轮转（`async-history.js:26-27,48-58`），不参与恢复、不作裁决依据（`B06`）；
   - `-11`「clamp 进 durable audit」与 `-15`「不新建 durable audit 文件」的矛盾按以下读法消解：两条都指「不建权威审计」，账本是遥测，不是 audit；策略写入一律 400 拒绝、不 clamp（`-15` 原意保留）；
   - 记录内容增加：`-03④` 的边界级别与保留量；Q5 的 `preempted`、`timeout`、`no-window`。字段细节在实施时按现有 AGENTS.md 账本表格式补齐。
2. **已提交事实走宿主 projection**：
   - [DNMS] 主包注册一个 session projection，从 `compaction/summary`、`compaction/end`、`compaction/prune` 折叠出 `lastCompaction`（兑现 `-21①`，替换 `index.js:428` 的占位）；
   - 客户端 session 级 slot（徽标所在的 `conversation.session.header.utilities` 是 session 级，`slots.d.ts:259-264`）用 `useProjection` 读取，宿主变化时推送，**零轮询**；
   - 徽标的「已异步压缩」改由 projection 推导，不再依赖 10 分钟时间窗口；
   - 若计划期验证 [DNMS] 无法注册 projection，按 `-21①` 已登记的退化路径处理（`session/event` 增量折叠），此时已提交事实并入第 3 条的按事件拉取，不新增轮询。
3. **在途状态走账本，按事件拉取**：
   - 客户端只保留**一个共享 store**，徽标、面板、对话框都从它读，不各自起定时器；
   - 拉取时机：打开面板或对话框时；`useSessionStatus` 的 `running` 发生变化时（`@deepseek-ai/dsh-client-ui-session/lib/types/client/index.d.ts:29-37`）；projection 推送新的已提交事实时；
   - **续拉窗口**：只有当会话 `running === true` 且最近一次拉取显示有在途 episode（armed/running）时，store 以单一节奏续拉；episode 落定或会话停止即停；节奏数值在实施时确定，并写入 [DNMS] 的性能声明（`B08`）；
   - 选择器的 15 s 常驻定时器、徽标 15 s 空闲轮询、面板 30 s 定时器、对话框独立 3 s 定时器全部退役（`ModelSelector.jsx:298`；`AsyncStatusBadge.jsx:22-24,52`；`CompactPanel.jsx:102`；`AsyncHistoryDialog.jsx:37,103`）。
4. **bundle 库存**：只在打开面板与切换开关后读取（路由已有宿主侧快照缓存），不随任何定时器读取。
5. **登记**：本题答复接替 `-19①`（观测面闭集增加账本这一类）、`-21④`（零轮询改为「已提交事实零轮询，在途状态按事件拉取并限定续拉窗口」），并消解 `-11`/`-15`；`-21①` 不变，本题只要求它落地。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

| 证据 | 位置 | 说明 |
|---|---|---|
| 宿主为 session 级 slot 提供 projection 推送 | `@deepseek-ai/dsh-client-ui-session/lib/types/client/index.d.ts:80-88`；`@deepseek-ai/dsh-session-projection/README.md:28,133` | 已提交事实不需要轮询 |
| projection 从已提交 journal 事件折叠 | `@deepseek-ai/dsh-session-projection/README.md:12,36` | 与 `B06` 一致，不产生第二权威 |
| 宿主提供会话运行状态 | `@deepseek-ai/dsh-client-ui-session/lib/types/client/index.d.ts:29-37` | 在途刷新可以由 `running` 变化触发，而不是固定定时 |
| `-21①` 本来就规划 projection | `DNMS01-qna-truth.md:230` | B 是兑现已冻真相，不是新发明 |
| 账本是无括号失败的唯一痕迹 | `async-history.js:7-12`；`dsh-nano-model-selector-compaction/AGENTS.md` 账本节 | 删除账本会让 `no-range`、`preempted` 等失败重新不可见 |
| 选择器定时器与会话无关 | `ModelSelector.jsx:273-300`（`useEffect` 依赖为空数组，随组件常驻） | 最浪费的一个轮询，退役无损 |

**A（追认现状）的反例**

- 4 个定时器与 `-21④`、DNPR 轮询纪律冲突（`B08`），选择器的 15 s 定时器在没有打开任何会话时也在跑。
- 「已异步压缩」靠 10 分钟时间窗口近似 durable 事实：窗口过后事实还在，界面却不显示；宿主重启后窗口内的记录又可能与 journal 不一致。

**C（严格零轮询）的反例**

- 在途状态只在打开面板时可见，会话头部徽标无法显示「正在异步压缩」，担心 ③ 的「对话内心流」无法满足。
- 删除账本会让无括号失败重新不可见，回到 DNMS01 收口后发现的问题（`async-history.js:10-12`）。

**D（新建推送路由）的反例**

- 新增 SSE 或长轮询路由是新的传输面，需要单独登记（「不得擅自扩约」），还要过 route-guard 与 `security/route-sensitivity.json` 登记。
- 宿主侧监听账本文件需要常驻文件监听，[DNMS] 宿主多一份常驻负担；而在途窗口通常只有 15–76 s（`B10`），按事件拉取已经够用。

- **问题**：你是否同意 **B**：① 账本采纳为引擎决策遥测（[DNMSC] 唯一写入、[DNMS] 只读、不作权威），`-11`/`-15` 按「不建权威审计、写入一律拒绝不 clamp」消解，记录补充边界级别与 `preempted`/`timeout`/`no-window`；② [DNMS] 注册 session projection 折叠 `compaction/*` 事件得到 `lastCompaction`，客户端用 `useProjection` 读取，已提交事实零轮询，徽标 committed 态改由 projection 推导；③ 在途状态只来自账本，客户端一个共享 store，在打开面板或对话框、`running` 变化、projection 推送时拉取，仅在「会话运行中且有在途 episode」时以单一节奏续拉，落定即停；④ 4 个常驻定时器全部退役，bundle 库存只在打开面板与切换后读取；⑤ 本答复接替 `-19①`、`-21④`，`-21①` 要求落地？若不同意，请选 A / C / D 或给出修改。
- **业主回答**：同意推荐 **B**（2026-11-17）→ 冻结为 `T-O-ACE1117-06`

---

### Q7 — 异步压缩 prompt 的单一真源与管理：保留全文覆盖，还是内置 prompt 承载合同、用户只能附加？（驱动真相：`-02②`、`-03⑤`、`-04①`、`B06`、单一真源原则 · 来源：评估 §5.4、R20–R25；漂移 D3、D11）

- **影响范围**：[DNMSC] `lib/compact-region.js` 的 `COMPACTION_INSTRUCTION`（`:190-225`）、`instructionText`/`instructionVersion`（`:227-246`）；`lib/host-compaction.js` 的指令解析（`:746-762`）；两个包的 `lib/compact-policy.js`（`summaryPrompt` 字段：`:37,47,107,117-119,129,144,193-194,209`）；[DNMS] `lib/compact-prompt.js`、`CompactPanel.jsx:7,332,480-498`；DNMS01 `-15` 的 7 字段 schema。
- **为什么必须确认**：这是 [业主] 担心 ④。`-03⑤` 与 `-04①` 让 prompt 承载合同要求（与帧一致、step 级降级补偿）；而现行 `summaryPrompt` 可以整段替换内置指令（`compact-region.js:228-230`），一次替换就能删掉这些要求。同时 prompt 有三份副本、策略模块有两份副本（D11），都没有一致性检查。
- **当前建议 / 倾向**（Droid）：**B — 内置异步专用 prompt 是唯一真源，承载 `-03⑤`、`-04①` 的结构要求；全文覆盖（`summaryPrompt`）退役，改为只能追加的「附加要求」；[DNMS] 不再手抄，共享模块（prompt 与策略）改为从 [DNMSC] 单一来源构建时生成，并由测试检查一致。**
- **Reasoning**：prompt 已经从「可替换的文本」变成「承载合同的组件」。全文覆盖让任何一次编辑都可能破坏帧一致性和补偿要求，只能用自然语言校验去防，靠不住。保留一个只能追加的段落，[业主] 仍然可以按自己的偏好调整摘要，但结构要求不会被删掉。本机两个 profile 都没有使用全文覆盖，硬切的实际成本为零。

#### 【对本问题的解读】

当前 prompt 管理的三个问题：

| 问题 | 证据 | 与已冻真相的冲突 |
|------|------|------------------|
| 全文覆盖可以替换整个内置指令 | `compact-region.js:228-230`（非空即整段替换）；`compact-policy.js:117-119`（上限 12000 字符） | 覆盖后的指令可以不提压缩、不做补偿，违反 `-04①`、`-03⑤` |
| 内置指令仍是宿主副本，要求「不提压缩」，不知道保留尾部存在 | `compact-region.js:210-214,222`；摘要输入只含被遮蔽段 `:526-537` | `-04①` 要求与帧一致；`-03` 允许切在 turn 内，「Current Work / Next Step」可能与保留尾部冲突 |
| 副本：prompt 三份，策略模块两份，无一致性检查 | 宿主 `dsh-compaction-basic/lib/index.js:243-278`；`compact-region.js:190-225`；`dsh-nano-model-selector/lib/compact-prompt.js:1-2`；两个包的 `compact-policy.js`（逐字相同） | 违反单一真源；D11 |

本机证据：两个 profile 的 `async-compact.json` 都没有 `summaryPrompt` 字段（§5.4）；`serializePolicy` 在字段为空时不写入（`compact-policy.js:144`）。

本题要 [业主] 决定：

- 内置 prompt 的地位：是否承载合同要求，是否允许被整段替换；
- 用户能调整什么：全文、附加段落，还是不能调整；
- 副本的处置：prompt 与策略模块怎样做到单一真源。

本题**不**裁决内置 prompt 的具体文本（实施时按本题冻结的结构要求编写并由测试锁定），也不裁决帧文本（Round 4）。

#### 【可选选项清单】

| 选项 | 内置 prompt | 用户可调整 | 副本处置 |
|---|---|---|---|
| **A** 追认现状 | 宿主副本 | 全文覆盖（≤12000 字符） | 维持手抄与注释 |
| **B** 内置承载合同 + 只能附加（**推荐**） | 重写为异步专用，承载结构要求 | 只能追加「附加要求」段落；全文覆盖退役 | 从 [DNMSC] 单一来源构建时生成，测试检查一致 |
| **C** 内置承载合同 + 不可调整 | 同 B | 无，只能查看与看版本 | 同 B |
| **D** 保留全文覆盖 + 结构校验 | 同 B | 全文覆盖，但保存时校验必需段落 | 同 B |

#### 【推荐选项的详细执行说明与分析】（B）

1. **内置异步专用 prompt 是唯一真源**（`-02②` 语义层），归 [DNMSC] 所有。实施时按以下结构要求重写，并由测试锁定这些要求存在：
   - 摘要明确自己是 checkpoint，与帧的说明一致；删除「不提压缩」一条（`-04①`）；
   - 知道保留尾部存在：「Current Work」「Next Step」以切点为准描述，不得与切点之后的原文冲突；
   - step 级降级时，**原文保留**当前 turn 的开场用户请求（`-03⑤`）；
   - 保留现有的结构化段落与「合并 prior checkpoint」规则（`compact-region.js:195-224`）。
   - 摘要输入保持 system + 被遮蔽段 + tools（`compact-region.js:526-537`），不改变前缀缓存特性。
2. **全文覆盖退役，改为附加要求（D3 → 重设计）**：
   - 删除 `summaryPrompt` 字段；新增可选的附加要求字段，内容追加在内置 prompt 的专门段落之后，不能删除或替换内置内容；字段名与长度上限在实施时确定，并同步修订 `-15` 的字段清单（接替指针按 `-01②`）；
   - **硬切，不兼容**：校验继续拒绝未知字段（`compact-policy.js:104-110`）。含旧 `summaryPrompt` 的文件会被判为 `invalid-schema`，进入可见的 safety-only degraded（`-18⑤`），由 [业主] 在面板重新保存；不做读时迁移、不做双读。本机零使用，实际影响为零。
3. **版本指纹保留**：`promptVersion` 继续是实际发送指令（内置 + 附加要求）的 sha256 前 8 位（`compact-region.js:244-246`；`host-compaction.js:752-759`），账本与徽标照旧显示。
4. **共享模块单一真源（D11 一并处理）**：
   - prompt 与策略模块的唯一来源在 [DNMSC]；
   - [DNMS] 需要的副本在构建时由脚本生成，文件头标明「生成文件，勿手改」，测试比较生成文件与来源的内容 hash，不一致即失败；
   - 这沿用 [DNMS] 已有的 `lib/bindings.js` 烘焙模式（`dsh-nano-model-selector/AGENTS.md` 前置第 7 条），不在运行时跨包读取，不建插件间通道；
   - 手抄的 `lib/compact-prompt.js` 退役，面板显示内置 prompt 时读取生成副本。
5. **面板管理**：面板显示内置 prompt（只读）、当前版本指纹、附加要求编辑框；「恢复默认」即清空附加要求。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

| 证据 | 位置 | 说明 |
|---|---|---|
| 全文覆盖会整段替换内置指令 | `compact-region.js:228-230` | 合同要求可被一次编辑删除 |
| 内置指令要求不提压缩 | `compact-region.js:222` | 与 `-04①` 冲突，必须重写 |
| 摘要指令不知道保留尾部 | `compact-region.js:210-214,526-537` | `-03` 后切点可能在 turn 内，必须补充 |
| 本机零使用全文覆盖 | 两个 profile 的 `async-compact.json`（§5.4）；`compact-policy.js:144` | 硬切成本为零 |
| 副本只靠注释保持一致 | `dsh-nano-model-selector/lib/compact-prompt.js:1` | 单一真源原则要求消除 |
| 策略模块逐字重复 | 两个包的 `compact-policy.js`（`diff` 无差异）；`dsh-nano-model-selector/package.json:27-28` | D11，与 prompt 同类，同一机制处理 |
| 构建时烘焙有本仓先例 | `dsh-nano-model-selector/AGENTS.md`（`lib/bindings.js` 由仓根账本烘焙） | 不需要新机制 |

**A（追认现状）的反例**

- 全文覆盖与 `-03⑤`、`-04①` 直接冲突：用户写一段不含补偿要求的 prompt，step 级降级就失去补偿。
- 副本继续靠注释维持，下一次修改内置 prompt 时三份文本必然分叉。

**C（不可调整）的反例**

- [业主] 担心 ④ 要求的是 prompt 的「管理」，完全不可调整只剩查看，失去按项目偏好调整摘要（例如强调保留某类信息）的能力。
- B 已经能保护结构要求，C 多出的限制没有换来额外的安全性。

**D（全文覆盖 + 结构校验）的反例**

- 只能用字符串或正则检查自然语言 prompt 是否「包含补偿要求」，既容易误判，也容易被绕过。
- 校验逻辑本身会成为一份需要维护的第二合同，与 `-02②`「语义层以本册为合同」重复。

- **问题**：你是否同意 **B**：① 内置异步专用 prompt 是唯一真源，按「与帧一致、删除不提压缩、知道保留尾部、step 级降级原文保留当前 turn 开场请求、保留结构化段落与 prior checkpoint 合并规则」重写，由测试锁定，摘要输入不变；② `summaryPrompt` 全文覆盖退役，改为只能追加的附加要求字段，硬切不迁移，含旧字段的文件进入可见的 safety-only degraded，`-15` 字段清单按 `-01②` 追加接替指针；③ `promptVersion` 继续是实际发送指令的 sha256 前 8 位；④ prompt 与策略模块（D11）以 [DNMSC] 为唯一来源，[DNMS] 副本构建时生成并由 hash 测试检查，手抄 `compact-prompt.js` 退役；⑤ 面板显示只读内置 prompt、版本指纹与附加要求编辑框？若不同意，请选 A / C / D 或给出修改。
- **业主回答**：同意推荐 **B**（2026-11-17）→ 冻结为 `T-O-ACE1117-07`

---

## 7. ★ Round 3 总结与中场评估 III（Round 3 → Round 4）

### 7.1 Round 3 判定

| 题 | [业主] 裁决 | 冻结为 | 一句话结论 |
|----|-------------|--------|------------|
| Q5 | 同意推荐 B | `T-O-ACE1117-05` | 采纳「arm 即起摘要、下一 step 边界提交」，补 idle 提交；durable 括号只在提交瞬间，另加 engine 内互斥；抢占不计 circuit；超时立即结算 |
| Q6 | 同意推荐 B | `T-O-ACE1117-06` | 账本是遥测不是权威；已提交事实走宿主 projection 零轮询；在途状态按事件拉取、限定续拉窗口；4 个常驻定时器退役 |
| Q7 | 同意推荐 B | `T-O-ACE1117-07` | 内置异步 prompt 是唯一真源并承载结构要求；全文覆盖退役为只能追加；prompt 与策略模块单一来源、构建生成 |

### 7.2 Round 3 固化了什么

1. **运行期主干已定**：episode 有明确的状态机（arm → running → 提交 / `preempted` / `timeout` / 失败），所有 lane 经同一个 engine 内互斥（`-05`）。之后的题不再讨论调度与并发，只讨论每个 lane 传入什么预算。
2. **两条观测通道已定**：durable 事实走 projection，临时状态走账本（`-06`）。[业主] 担心 ③ 有了落点，剩下的只是入口位置与文案（D8、D9）。
3. **prompt 已从「可替换文本」变成「合同组件」**（`-07`）。帧文本是同一合同的另一半，Round 4 定帧时必须与 `-07①` 的结构要求逐项对齐。
4. **漂移处置进度**：D3、D4、D5、D6、D7、D11 已裁决；剩余 D1、D2、D8、D9、D10 全部进入 Round 4。

### 7.3 诚实反方制衡

| 风险 | 来自 | 制衡 |
|------|------|------|
| engine 内互斥只覆盖本进程，同一 profile 起两个宿主进程时仍可能并发 | `-05②` | 提交时的 durable 复查（`compact-region.js:639-645`）保留，跨进程最多导致一次 `preempted` 或 transient 失败，不会写出两个括号 |
| 抢占让 async 摘要的费用白花 | `-05②` | 只有用户显式 `/compact` 与同步 FULL 才抢占；同步 FULL 本身意味着 async 已来不及，继续等待只会更慢 |
| 在途状态仍有一个续拉节奏，不是严格零轮询 | `-06③` | 续拉只在「会话运行中且有在途 episode」时存在，窗口通常 15–76 s（`B10`）；节奏进入 [DNMS] 性能声明接受量测 |
| 删除 `summaryPrompt` 后，已有自定义 prompt 的用户需要重新保存 | `-07②` | 本机两个 profile 零使用；进入的是可见的 safety-only degraded，不是静默失效 |
| 构建生成副本增加一步构建 | `-07④` | 沿用 [DNMS] 已有的 `lib/bindings.js` 烘焙模式，不引入新机制；hash 测试让分叉立即可见 |

### 7.4 新的事实调查（为 Round 4 取证）

| 发现 | 证据 | 对 Round 4 的意义 |
|------|------|-------------------|
| 现行选择器从尾部累计到 `>= retainTokens` 即停，再向前退到平衡节点；没有上限，也不认 turn / step 边界 | `compact-region.js:368-381` | `-03②` 要求的目标值与上下限需要具体公式 |
| async 的保留量是 `effectivePin = min(pinnedAsyncTokens, floor(0.15·W))`，arm 时冻结；同步 FULL 的保留量是 `pinnedFullTokens`，safety-only 时为 0 | `compact-policy.js:27,89`；`host-compaction.js:278,569,649` | 两个字段名都叫 pinned（「固定」），但 `-03②` 之后它们只是目标值，名称与语义需要一并定 |
| 同步 FULL 的回落线：safety-only 用 S，否则用 B；`requireBelowThreshold` 时找不到能降到线下的范围就报错 | `host-compaction.js:559-560,569-578` | 上限可以直接由「该 lane 的回落线」推导，不需要新的用户参数 |
| 宿主 `compaction-basic` 默认阈值 0.8，保留 `retainRatio` 0.16（按消息预算），另扣 65536 headroom | `@deepseek-ai/dsh-compaction-basic/lib/index.js:15,17,63,128-134` | 宿主出厂行同样用「目标保留量 < 阈值」的约束；也是 DNMS01 当初取 S=0.80 的参照 |
| 7 次异步摘要的输出为 3.0k–4.2k tokens | `B10` | checkpoint 在提交后占用的 token 有实测上界，可以作为上限公式里的预留量依据 |
| 帧前言要求模型「不承认 checkpoint」 | `compact-region.js:248-249` | 与 `-04①` 冲突，Round 4 必须给出新帧 |
| 帧用 `<compacted-summary>` 包裹摘要；prompt 的 prior checkpoint 合并规则按这个标签识别旧 checkpoint；宿主客户端不解析该标签，只有 `compaction-basic` 也写同样的标签 | `compact-region.js:187-188,224,254-256`；`@deepseek-ai/dsh-compaction-basic/lib/index.js:234-235` | 标签是 ON/OFF 切换时新旧 checkpoint 能被正确合并的唯一依据，应保留 |
| 提交时手里已有替换范围的条数与 token 数，checkpoint 已记录 `sourceEventSeqs` | `compact-region.js:496-498,504-507` | 帧所需字段都已存在，不需要新增 durable 状态 |
| Provider 行在 `id: compaction` isolate 组内，组的 `isolate` 只隔离 `compaction`、`toolResultPruner`；Provider 当前 inject 为 `llm`、`tokenMeter`、`sessions` | `dsh-nano-model-selector-compaction/cordis.patch.yml:117-137`；`dsh-nano-model-selector-compaction/index.js:3-4,8`（注释写明：isolate 只声明这两项，静态 inject `agents` 会抛错） | 在 isolate 组内注册 model-facing 工具没有先例，本机未验证；inject 组外服务已有抛错先例 |
| 上游把工具做成包的子路径、作为独立行挂在 preset 里：`@deepseek-ai/dsh-plugin-manager/tools`、`@deepseek-ai/dsh-plugin-market/tools` | `dsh-nano-model-selector-compaction/cordis.patch.yml:182-187` | inspection 工具可以沿用「同包子路径 + 独立行」的形态 |
| 工具注册支持 `when` 条件、`timeoutMs`、`isConcurrencySafe`、`presentCall`/`presentResult` | `@deepseek-ai/dsh-tools/lib/types/contracts.d.ts:66,80,90,98,110-118` | `-04③` 的「按条件暴露」与只读并发都有宿主公开面 |
| base 组合挂载了通用 spill-policy | `context/deepseek-harness/packages/bundle/base/cordis.patch.yml:421-425` | 工具输出超长时有宿主通用兜底，但它不是本工具的主要大小控制 |
| 两个本机 profile 的策略：desktop B 0.7 / H 0.35 / S 0.9 / pinnedAsync 140000 / pinnedFull 20000；`~/.dsh` B 0.7 / H 0.35 / S 0.9 / pinnedAsync 120000 / pinnedFull 20000 | `~/.dsh-desktop/plugins/nano-model-selector/async-compact.json`；`~/.dsh/plugins/nano-model-selector/async-compact.json`（只读） | 两份都已是 S=0.90，且都满足严格顺序 `H < B < S` |
| S 改为 0.90 时留了读时兼容：S=0.80 写成的文件照常加载，以常量为准 | `compact-policy.js:23-25` | 「能彻底退役不兼容」要求裁决这段兼容的去留 |
| 「等号合法」只记录在代码注释里（「Owner 2026-11-15」），没有 durable 登记；包文档同一处前后矛盾 | `compact-policy.js:13-14`；`dsh-nano-model-selector-compaction/DETAIL.zh.md:15`（可以相等）对 `:16`（必须低于） | D2 需要在本册正式登记 |
| 入口按钮用的是与 rail 相同的 `filter='compact'` 机制，只是位置在顶栏；按钮图标显示当前水位 | `ModelSelector.jsx:791-805`；`dsh-nano-model-selector/AGENTS.md`（面板入口节） | D8 只是位置之争，不涉及状态机 |
| 客户端没有开关切换确认，`compactSwitchConfirm` 缺失；`-20` 要求「切换确认与四类结果」 | `src/client/` 内无切换确认（仅数值编辑确认 `CompactPanel.jsx:61,248`）；`DNMS01-qna-truth.md:68` | D9 不只是文案数量问题，还缺一个交互 |
| base bundle 有扁平的 `compaction-basic` 与 `command-compact` 行，互斥 patch 生成器只覆盖 4 个 preset | `context/deepseek-harness/packages/bundle/base/cordis.patch.yml:355-356,360-361`；`dsh-nano-model-selector-compaction/scripts/gen-mutex-patch.mjs:20,91-109`；`DNMS01-qna-truth.md:58` | D10 确认存在 |
| closure 文档仍描述已不存在的 `compaction-adoption-wake` 唤醒消息，另有一项「待移动」 | `docs/specs/dsh-nano-model-selector/closure/DNMS01-closure.md:20,74` | 收尾时按 `-01⑤` 统一修订 |

### 7.5 为什么注入 Round 4 这三题

- **Q8（切点预算与 checkpoint 帧）**：`-03②` 留下的目标值与上下限，`-04①⑤` 留下的帧文本与字段。两者都是「选择器与帧」这一个提交动作的参数，放在一题里才能保证帧描述的边界与选择器实际选的边界一致。驱动真相：`-03`、`-04①⑤`、`-05②`、`-07①`。
- **Q9（inspection 工具合同）**：`-04③⑤` 留下的名称、参数、输出控制与注册位置。注册位置涉及组合层（patch 行），必须在 Q10 的组合覆盖之前定。驱动真相：`-04③④⑤`、`B05`、`B07`。
- **Q10（阈值、组合覆盖与收尾）**：剩余漂移 D1、D2、D8、D9、D10，加上验收方式、DNMS01 接替指针表与 closure 收尾。驱动真相：`-01②③⑤`、`-06`、`B07`、`B13`。

三题按 [业主] 指定为 foundational 级：它们各自决定一块合同面的最终形状（选择器与帧、第一个 model-facing 工具、组合与阈值），冻结后计划不再需要任何设计决定。

### 7.6 Round 4 能否收口

**判断：可以。** Q8–Q10 覆盖 §5.6 列出的全部剩余项，且没有发现需要新一轮的依赖。若 [业主] 按推荐或小幅修改冻结，随后：

1. 按 `-01②` 一次性写入 DNMS01 两处接替指针（映射表见 Q10）；
2. 输出正式 ACE-1117 计划，§2 只 CITE `T-O-ACE1117-*`。

**需要 Round 5 的情况**：Q9 选择推迟工具（`-04③` 变成未兑现，需要另题决定担心 ② 的 inspection 部分如何处理）；或 Q10 把 D1/D2 改成需要新参数的方案（例如 S 改为可写）。

---

## 8. Round 4 —— 切点预算、inspection 工具与收尾（`Q8–Q10` · foundational 级 · 收口）

> 本轮 second-opinion 模式：`retired`。
> **为什么 Round 4 问这三题**：见 §7.5。
> **本轮驱动真相**：`T-O-ACE1117-01`–`07`；Baseline `B05`、`B07`、`B08`、`B10`、`B12`、`B13`。

---

### Q8 — 切点预算与 checkpoint 帧：保留量怎么算，帧怎么写？（驱动真相：`-03①②④⑤`、`-04①⑤`、`-05②`、`-07①`、`B10` · 来源：评估 §5.1、§5.2、R01–R03、R07–R09）

- **影响范围**：[DNMSC] `lib/compact-region.js` 的 `selectCompactableRange`（`:357-386`）、`CHECKPOINT_PREAMBLE`/`frameSummary`（`:248-258`）；`lib/host-compaction.js` 各 lane 传入的保留量（`:278,569,649`）；两个包的 `compact-policy.js`（`pinnedAsyncTokens`、`pinnedFullTokens`、`PIN_FRACTION`，`:27,35-36,89`）；DNMS01 `-15` 的 pinned 语义。
- **为什么必须确认**：`-03` 只定了「三级边界 + 目标值 + 上下限」，没有定数值和公式；`-04` 只定了「帧是唯一告知载体」，没有定帧写什么。这两样决定每一次提交的实际行为，不定下来，选择器与帧都无法实现。
- **当前建议 / 倾向**（Droid）：**B — 两个字段保留名称、语义改为目标值；上限由该 lane 的回落线推导，下限为一个完整平衡节点；在 [下限, 上限] 内优先取离目标最近的 turn 边界，其次 step，最后节点。帧用固定字段说明已压缩、替换了多少、保留尾部从哪一级边界开始、怎样查回原文，并保留 `<compacted-summary>` 标签。**
- **Reasoning**：上限只要从 lane 已有的回落线推导，就不需要新的用户参数；改字段名会让两个本机 profile 立即进入 degraded，而语义变化本身已经足够清楚。帧只放提交时已知、对模型有用的事实，标签保留是为了 ON/OFF 切换后新旧 checkpoint 仍能合并。

#### 【对本问题的解读】

一次提交由两个动作组成：**选择器决定切在哪里**，**帧告诉模型切了什么**。现状：

| 面 | 现状 | 与已冻真相的差距 |
|----|------|------------------|
| 选择器 | 尾部累计到 `>= retainTokens` 即停，再退到平衡节点（`compact-region.js:368-381`） | 不认 turn / step（`-03①`）；保留量是硬上限而不是目标（`-03②`）；没有上限 |
| async 保留量 | `effectivePin = min(pinnedAsyncTokens, floor(0.15·W))`（`compact-policy.js:89`），arm 时冻结（`host-compaction.js:278`） | 字段名「pinned」暗示固定保留 |
| FULL 保留量 | `pinnedFullTokens`，safety-only 时为 0（`host-compaction.js:569`） | 保留 0 时尾部可能为空，违反 `-03②` 下限 |
| 帧 | 「不承认 checkpoint」（`compact-region.js:248-249`） | 违反 `-04①` |

本题要 [业主] 决定：

- 目标值从哪里来，两个 pinned 字段是否改名或改形；
- 上限、下限的公式；
- 同一级有多个候选边界时选哪一个；
- 帧包含哪些字段、是否保留 `<compacted-summary>` 标签。

本题**不**裁决阈值 S 与等号（Q10），也不裁决工具本身的 schema（Q9，帧只引用工具名）。

#### 【可选选项清单】

| 选项 | 目标值 | 上下限 | 帧 |
|---|---|---|---|
| **A** 外推到边界 | 字段原样 | 无上限；累计到目标后向前找最近的 turn 边界 | 只删「不承认」一句 |
| **B** 目标值 + lane 回落线（**推荐**） | 保留两个字段名，语义改为目标值；async 仍套 `0.15·W` 上限 | 上限 = lane 回落线 × W − system 头部 − checkpoint 预留；下限 = 一个完整平衡节点 | 固定字段 + 保留标签 |
| **C** 改为比例 | 字段改为比例（类似宿主 `retainRatio` 0.16），schema 硬切 | 同 B | 同 B |
| **D** 不暴露字段 | 删除两个字段，目标完全由 H 与 W 推导 | 同 B | 同 B |

#### 【推荐选项的详细执行说明与分析】（B）

1. **目标值**：
   - async：`effectivePin = min(pinnedAsyncTokens, floor(0.15·W))`，公式不变，arm 时冻结不变；
   - 同步 FULL、手动 `/compact`、overflow：`pinnedFullTokens`；safety-only 时目标为 0（由下限兜底，不再可能保留空尾部）；
   - 两个字段**名称不变**，`-15` 的字段语义从「保留量」改为「目标保留量」，面板文案同步改为「目标」。

2. **上限**（`-03②`「不得妨碍该 lane 的回落要求」）：
   - 公式：`上限 = floor(回落线 × W) − system 头部 tokens − checkpoint 预留`；
   - async 的回落线是 H（提交后 fill 应不高于健康水位）；
   - 同步 FULL 与手动、overflow 的回落线沿用现有判定：safety-only 用 S，否则用 B（`host-compaction.js:559`）；
   - **checkpoint 预留 = 8192 tokens**：依据 `B10` 实测摘要输出 3.0k–4.2k，取约 2 倍余量，作为常量写在选择器内并由测试锁定；
   - 目标值高于上限时，按上限选；这是选择器内部的取值，不改写策略文件，不属于 `-15` 禁止的 clamp。

3. **下限**：保留尾部至少包含一个完整的平衡节点（满足 `toolPairingBalancedBefore`），不得为空。

4. **选择规则**：
   - 候选边界 = 保留量落在 [下限, 上限] 内的所有边界；
   - 先在 turn 边界里选**保留量离目标最近**的一个；没有就在 step 边界里选；再没有就在平衡节点里选；
   - 离目标距离相同时取保留量更大的一个；
   - 上限小于下限、或三级都没有候选：返回 null，各 lane 的后续行为与现状一致（async 记 `no-range`，FULL 按 `requireBelowThreshold` 报错，`host-compaction.js:573-578`）；
   - 实际级别与保留量按 `-03④` 写入账本（`-06①`）。

5. **帧**（替换 `CHECKPOINT_PREAMBLE`，英文，与 prompt 同语言）：
   - 固定字段：替换的条数（`shadowedSeqs.length`）、替换的估计 tokens（`shadowedTokenCount`，`compact-region.js:496-498`）、保留尾部的起始级别（turn / step / message）、本次 `compactionId`、inspection 工具名；
   - 语义：说明「之前的一段对话已被下面的摘要替换，以释放上下文；checkpoint 之后的消息是原文、未改动；需要被替换部分的原文时，用工具按 `compactionId` 查看」；
   - 不写时间戳、模型名、prompt 版本：这些对模型没有用，只会让帧在相同内容下不稳定；
   - **保留 `<compacted-summary>` 标签**：prompt 的合并规则按它识别 prior checkpoint（`compact-region.js:224`），OFF 期间 `compaction-basic` 写的 checkpoint 也用它（`@deepseek-ai/dsh-compaction-basic/lib/index.js:234-235`）；
   - 帧与 `-07①` 的 prompt 结构要求逐项对齐，同一组测试锁定两者。

6. **登记**：本题答复接替 DNMS01 `-15` 中 pinned 两字段的「保留量」语义；`PIN_FRACTION`、`windowMin`、DC-1 不变。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

| 证据 | 位置 | 说明 |
|---|---|---|
| 回落线已存在于各 lane | `host-compaction.js:559-560,577` | 上限不需要新参数 |
| 宿主出厂行同样要求「保留量 < 阈值」 | `@deepseek-ai/dsh-compaction-basic/lib/index.js:132-134` | B 的上限与宿主的约束同构，只是把阈值换成回落线 |
| 摘要输出有实测上界 | `B10`（3.0k–4.2k tokens） | 8192 的预留有证据支撑 |
| 两个本机 profile 都使用这两个字段 | 本机两份 `async-compact.json` | 改名会让两者立即进入 degraded，B 不会 |
| 帧所需字段在提交时都已存在 | `compact-region.js:496-498,504-507` | 不新增 durable 状态 |
| 标签是新旧 checkpoint 合并的依据 | `compact-region.js:224`；`@deepseek-ai/dsh-compaction-basic/lib/index.js:234-235` | 去掉标签会让 ON/OFF 切换后的合并失效 |

**A（外推到边界）的反例**

- 没有上限，向前找 turn 边界可能保留整个长 turn，提交后 fill 仍高于 H，async 白做；同步 FULL 甚至可能降不到线下。直接违反 `-03②`。
- 只删一句的帧不说明替换范围和查回方式，`-04①` 要求的内容不完整。

**C（改为比例）的反例**

- schema 硬切让两个本机 profile 都进入 degraded，换来的只是单位变化；async 已经有 `0.15·W` 的比例上限，比例语义并没有缺失。

**D（不暴露字段）的反例**

- 用户失去调整保留量的能力，而 desktop 已经把 `pinnedAsyncTokens` 从默认 100000 调到 140000，说明这个调节有实际使用。

- **问题**：你是否同意 **B**：① `pinnedAsyncTokens`、`pinnedFullTokens` 保留名称，语义改为目标保留量，async 目标仍为 `min(pinnedAsyncTokens, floor(0.15·W))`；② 上限 = `floor(回落线 × W) − system 头部 − 8192`，async 回落线为 H，同步 FULL/手动/overflow 沿用现有判定（safety-only 为 S，否则为 B）；下限为一个完整平衡节点；③ 在 [下限, 上限] 内按 turn → step → 节点选离目标最近的边界，同距取保留更多者，无候选时行为与现状一致；④ 帧写替换条数、估计 tokens、保留起始级别、`compactionId` 与工具名，不写时间戳与模型名，保留 `<compacted-summary>` 标签，并与 `-07①` 同测锁定；⑤ 本答复接替 `-15` 的 pinned 字段语义？若不同意，请选 A / C / D 或给出修改。
- **业主回答**：同意推荐 **B**（2026-11-17）→ 冻结为 `T-O-ACE1117-08`

---

### Q9 — inspection 工具合同：在哪里注册，叫什么，参数与输出怎么控制？（驱动真相：`-04③④⑤`、`-06`、`B05`、`B07` · 来源：评估 §5.2、R10–R12）

- **影响范围**：[DNMSC] 新增工具模块与包的 `exports`（当前为 `.`、`./icon`、`./locale/*.json`、`./package.json`）；`cordis.patch.yml` 与 `scripts/gen-mutex-patch.mjs`（新增工具行）；帧文本中的工具名（Q8）。
- **为什么必须确认**：这是本仓第一个 model-facing 工具。`-04③` 已定它只读、只看本会话、只读 `sourceEventSeqs`、按条件出现；但注册位置、名称、参数和输出上限都会进入模型可见面，一旦发布就是公共合同。
- **当前建议 / 倾向**（Droid）：**B — 同包子路径 `./tools` 作为独立行，与 Provider 行同在本 bundle 的 patch 里；工具名 `inspect_checkpoint`；参数为 `compactionId` 加分页；单次输出有条数与字符上限，超出给出下一页位置，spill-policy 只作兜底。**
- **Reasoning**：Provider 行在 compaction isolate 组内，那里注册 model-facing 工具既无先例也未验证；上游自己的工具都以「包子路径 + 独立行」挂载。分页让模型按需取原文，不会一次把被压缩掉的内容全部塞回上下文，这恰好是压缩要避免的事。

#### 【对本问题的解读】

需要定的四件事：

| 项 | 约束（已冻） | 待定 |
|----|--------------|------|
| 注册位置 | OFF 态随 bundle 消失（`-04③`、`B07`） | Provider 行内注册，还是独立工具行 |
| 名称与描述 | 模型可见 | 名称、描述文字 |
| 参数 | 只读、只看本会话、数据只来自 `sourceEventSeqs`（`compact-region.js:504-507`） | 如何指定 checkpoint、是否分页 |
| 输出 | 不新增 durable 状态 | 单次大小上限、非文本内容的处理 |

现状事实：Provider 在 `id: compaction` isolate 组内（`dsh-nano-model-selector-compaction/cordis.patch.yml:117-137`），inject 不含 `tools`；上游工具以子路径独立成行（`:182-187`）；宿主工具面提供 `when`、`timeoutMs`、`isConcurrencySafe`、`presentCall`/`presentResult`（`@deepseek-ai/dsh-tools/lib/types/contracts.d.ts:66,80,90,98,110-118`）；base 组合有通用 spill-policy（`context/deepseek-harness/packages/bundle/base/cordis.patch.yml:421-425`）。

本题**不**裁决帧文本（Q8），也不裁决组合覆盖范围（Q10 的 D10；工具行跟随 Provider 行覆盖同样的组合）。

#### 【可选选项清单】

| 选项 | 注册位置 | 参数 | 输出控制 |
|---|---|---|---|
| **A** Provider 行内注册 | isolate 组内的 Provider 行，inject 增加 `tools` | `compactionId` | 一次返回全部原文，超长交给 spill-policy |
| **B** 独立工具行 + 分页（**推荐**） | 同包子路径 `./tools`，作为独立行挂在每个组合里，与 Provider 行同一个 patch | `compactionId` + `offset` + `limit` | 单次条数与字符上限，返回下一页位置；spill-policy 兜底 |
| **C** 独立工具行 + 检索 | 同 B | `compactionId` + 关键字 | 只返回匹配片段 |
| **D** 推迟工具 | 不注册 | — | — |

#### 【推荐选项的详细执行说明与分析】（B）

1. **注册位置**：
   - [DNMSC] 新增子路径导出 `./tools`，在 patch 中作为独立行（`name: dsh-nano-model-selector-compaction/tools`），放在每个被覆盖组合的工具行区，不进 isolate 组；
   - 与 Provider 行由同一个 `cordis.patch.yml` 写入，OFF 时一起移除（`B07`）；生成器 `gen-mutex-patch.mjs` 同时生成两类行；
   - 工具模块与 Provider 同包，只经 session 公开读面工作（`@deepseek-ai/dsh-session/lib/types/index.d.ts` 的 `eventAt`、`deriveEventMessage`），不经 Provider 内存，不建插件间通道。
2. **名称与描述**：`inspect_checkpoint`；描述说明「读取某次上下文压缩替换掉的原始消息，只读」，并说明 `compactionId` 来自 checkpoint 帧。
3. **暴露条件**（`when`）：当前 surface 中存在本插件写入的 checkpoint 时返回 true；本插件 checkpoint 的识别方式在实施时从 `compaction/start` 记录确定，并由测试锁定。
4. **参数**：
   - `compactionId`（必填）：本会话中本插件写入的任一 checkpoint，包括已被后续 checkpoint 再次压缩的旧 checkpoint，这样嵌套的 checkpoint 链也能逐层查回；
   - `offset`（可选，默认 0）、`limit`（可选，默认 20，上限 50）：按原始消息条数分页。
5. **输出**：
   - 头部一行：`compactionId`、原始消息总条数、本页范围、下一页的 `offset`（若有）；
   - 每条消息：角色 + 文本；工具调用写工具名与参数；单条工具结果超过 2000 字符时截断并注明原长；图片等非文本内容写占位说明；
   - 单次输出总上限 24000 字符，达到即停并给出下一页位置；
   - spill-policy 只作为宿主通用兜底，不作为本工具的大小控制手段。
6. **执行属性**：只读，`isConcurrencySafe` 返回 true；不声明 `timeoutMs`（同步读 journal，无外部调用）；`presentCall`/`presentResult` 给出「查看压缩前原文」的标题与范围，方便人在会话里看到模型查了什么。
7. **错误**：`compactionId` 不属于本会话或不是本插件的 checkpoint 时，返回工具错误，并列出当前 surface 中可用的 `compactionId`。
8. **登记**：本题答复兑现 `-04③⑤`；工具名与参数从此是公共合同，后续修改须回本册追加裁决。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

| 证据 | 位置 | 说明 |
|---|---|---|
| 上游工具以子路径独立成行 | `dsh-nano-model-selector-compaction/cordis.patch.yml:182-187` | B 沿用宿主自己的组合形态 |
| Provider 位于 isolate 组，组内注册工具无先例 | `dsh-nano-model-selector-compaction/cordis.patch.yml:117-137` | A 依赖未验证的行为 |
| 宿主工具面支持按条件暴露与并发声明 | `@deepseek-ai/dsh-tools/lib/types/contracts.d.ts:80,110-118` | `-04③` 的要求都有公开面 |
| 原始消息已记录在 checkpoint | `compact-region.js:504-507` | 工具不需要索引或副本 |
| 摘要本身只有 3.0k–4.2k tokens，而被替换的范围可能是数十万 tokens | `B10` | 一次返回全部会把压缩掉的内容塞回上下文，必须分页 |

**A（Provider 行内注册）的反例**

- isolate 组内注册 model-facing 工具在宿主里没有先例，本机未验证；Provider 已因 isolate 不能静态 inject `agents`（`dsh-nano-model-selector-compaction/index.js:3-4`），inject `tools` 很可能遇到同样的问题；一旦宿主调整 isolate 语义，工具还可能静默消失。
- 一次返回全部原文，等于让模型一个调用就撤销压缩；spill-policy 会把超长结果落盘，模型拿到的是另一个间接引用，体验更差。

**C（检索）的反例**

- 关键字检索需要在每次调用时扫描全部原文并做匹配，模型还得先猜关键字；分页读取更可预测。
- 检索可以作为以后的追加参数，不需要现在放进合同。

**D（推迟）的反例**

- `-04③` 已冻结要新增工具，推迟意味着担心 ② 的 inspection 部分不兑现，需要第 5 轮另题处理。

- **问题**：你是否同意 **B**：① 工具以同包子路径 `./tools` 独立成行，与 Provider 行由同一 patch 写入、OFF 时一起移除，不进 isolate 组；② 工具名 `inspect_checkpoint`，只读，`when` 仅在当前 surface 有本插件 checkpoint 时暴露；③ 参数 `compactionId`（必填，可指向本会话本插件的任一 checkpoint）、`offset`、`limit`（默认 20、上限 50）；④ 输出单条工具结果超 2000 字符截断、单次总量上限 24000 字符并给出下一页位置，非文本内容写占位，spill-policy 只兜底；⑤ 工具名与参数从此为公共合同，修改须回本册追加裁决？若不同意，请选 A / C / D 或给出修改。
- **业主回答**：同意推荐 **B**（2026-11-17）→ 冻结为 `T-O-ACE1117-09`

---

### Q10 — 阈值、组合覆盖与收尾：剩余五处漂移怎么定，怎样验收，DNMS01 怎样收尾？（驱动真相：`-01②③⑤`、`-06`、`-07`、`B07`、`B12`、`B13` · 来源：评估 §3.4、§7、R38–R46；漂移 D1、D2、D8、D9、D10）

- **影响范围**：两个包的 `compact-policy.js`（`:13-25,80-85`）、`dsh-nano-model-selector-compaction/DETAIL.zh.md:15-16`、`test/compact-policy.test.mjs`；[DNMS] `src/client/i18n.js`、`ModelSelector.jsx:791-805`、`CompactPanel.jsx`；`scripts/gen-mutex-patch.mjs` 与 `cordis.patch.yml`；`DNMS01-qna.md`、`DNMS01-qna-truth.md` §4.5；`closure/DNMS01-closure.md`。
- **为什么必须确认**：`-01③` 要求每处漂移逐条裁决，这五处是最后的未决项；`-01②` 要求全轮冻结时一次性写入接替指针，指针内容需要 [业主] 确认；`B13` 要求验收只用既有检查，计划需要一张明确的验收清单。
- **当前建议 / 倾向**（Droid）：**B — 逐条处置：D1 采纳 S=0.90 并退役 0.80 读时兼容；D2 回退到严格顺序；D8 采纳顶栏入口；D9 文案集不作合同、补上切换确认、缓存键要求退役；D10 回退到覆盖 base 扁平行。验收只用既有测试、检查脚本与证据重放；冻结后一次性写入接替指针，closure 随计划收尾修订。**
- **Reasoning**：S=0.90 是两个本机 profile 的实际配置，`-05` 之后 async 被 S 线抢占的代价更高，S 留得越高 async 越有机会完成；等号会造成重复 arm 或让 async 永远被 FULL 抢先，必须回退；入口与文案是呈现选择，现状可用且已写进包文档；base 扁平行不覆盖会让 ON 态下仍有一条出厂压缩路径，违反「ON 全接管」。

#### 【对本问题的解读】

| # | 漂移 | DNMS01 | 现状 | 关键事实 |
|---|------|--------|------|----------|
| D1 | S 值 | 0.80 只读（`DNMS01-qna-truth.md:63`） | 0.90，另有 0.80 读时兼容（`compact-policy.js:23-25`） | 两个本机 profile 都是 0.90；宿主出厂阈值 0.8（`@deepseek-ai/dsh-compaction-basic/lib/index.js:15`） |
| D2 | 等号 | 严格 `effectivePin/W < H < B < S < 1` | `H <= B <= S`（`compact-policy.js:81,83`） | 「等号合法」只在代码注释（`:13-14`）；`DETAIL.zh.md:15` 与 `:16` 矛盾 |
| D8 | 入口 | rail 第 4 图标 | 顶栏按钮，图标显示水位（`ModelSelector.jsx:791-805`） | 两者都用 `filter='compact'` |
| D9 | 文案与缓存 | 18 个 key、切换确认、缓存键 `dsh-nano-model-selector:async-compact.v1`（`DNMS01-qna-truth.md:68`） | 42+ 个 key，无切换确认，无缓存键 | `-06` 后已提交事实由 projection 推送 |
| D10 | 组合覆盖 | base 扁平行 + 4 preset（`DNMS01-qna-truth.md:58`） | 只覆盖 4 preset（`gen-mutex-patch.mjs:20,91-109`） | base 有扁平 `compaction-basic`、`command-compact`（`base/cordis.patch.yml:355-356,360-361`） |

另外两件收尾事项：验收清单（`B13`）、DNMS01 接替指针与 closure 修订（`-01②⑤`）。

#### 【可选选项清单】

| 选项 | D1 | D2 | D8 | D9 | D10 |
|---|---|---|---|---|---|
| **A** 全部追认 | 0.90 + 兼容 | 允许等号 | 顶栏 | 现状 | 只覆盖 preset |
| **B** 逐条处置（**推荐**） | 采纳 0.90，退役 0.80 兼容 | 回退严格 | 采纳顶栏 | 文案集不作合同；补切换确认；缓存键退役 | 回退覆盖 base |
| **C** 全部回退 DNMS01 | 0.80 | 严格 | rail | 18 key + 确认 + 缓存键 | 覆盖 base |
| **D** S 改为可写 | 用户可调 | 严格 | 顶栏 | 同 B | 覆盖 base |

#### 【推荐选项的详细执行说明与分析】（B）

1. **D1 → 采纳并登记 S=0.90**：
   - S 仍只读，PUT 携带即 400（`-15` 原意不变）；
   - 删除 `LEGACY_SAFETY_RATIO` 读时兼容（`compact-policy.js:24-25`）：S≠0.90 的文件判为 `invalid-range`，进入可见 safety-only degraded；本机两份文件都是 0.90，影响为零；
   - 文件头注释 `:10` 与 `i18n.js:70` 保持 0.90。
2. **D2 → 回退到严格顺序**：
   - 校验改回 `effectivePin/W < H < B < S < 1`，`H >= B` 或 `B >= S` 一律 400；
   - 理由：`H = B` 时提交后 fill 可以恰好等于 B，下一 step 增长即再次 arm；`B = S` 时 B 线与 S 线同时越过，按 `-05②` 同步 FULL 抢占，async 永远没有机会；
   - 删除 `compact-policy.js:13-14` 的「等号合法」注释，`DETAIL.zh.md:15` 改为与 `:16` 一致，`test/compact-policy.test.mjs` 的等号用例改为拒绝用例；本机两份文件都满足严格顺序。
3. **D8 → 采纳顶栏入口**：位置、显示条件（仅 companion 已安装时）与水位图标按 [DNMS] `AGENTS.md` 面板入口节现状登记；rail 保持模型分类用途。
4. **D9 → 重设计**：
   - i18n key 的数量与名称不作合同，合同只要求中英两份完整对应；
   - 补上**开关切换确认**：切换 bundle 会改写 profile、可能要求重启宿主，属于需要确认的操作；`-20` 的「切换确认与四类结果」保留；
   - localStorage 缓存键要求退役：`-06` 后已提交事实由 projection 推送，在途状态由共享 store 拉取，不再需要客户端持久缓存。
5. **D10 → 回退到覆盖 base 扁平行**：`gen-mutex-patch.mjs` 增加 base 扁平行的互斥覆盖（`compaction-basic` 在 ON 态 `disabled`，Provider 行与 Q9 的工具行同步写入），与 `-10` 原文一致；sdk、acp 等非 web 组合不在本包范围。
6. **验收（`B13`）**：只用以下既有入口，必要时在既有测试文件里增改用例，不新增 release-gate、不改 `RELEASE.md`：
   - [DNMSC]：`test/compact-policy.test.mjs`、`test/async-takeover.test.mjs`、`test/host-cordis-smoke.test.mjs`；
   - [DNMS]：`test/` 下 `async-history`、`history-format`、`water-line` 等既有测试；
   - 仓根脚本：`scripts/check-ui-rules`、`check-client-rules`、`check-route-sensitivity`、`check-feature-contract`、`check-clean-lib`、`test-all`；
   - 只读证据重放：`/tmp/dnms-evidence/` 的统计脚本对新构建产生的会话重跑，对照 `B10` 的「turn 中间切点 242/260」「尾部无 user 39/260」两项看是否下降。
7. **DNMS01 接替指针（`-01②`，本册全轮冻结后一次性写入）**：

   | DNMS01 旧行 / 项 | → 接替 |
   |------------------|--------|
   | `T-O-DNMS01-11`「clamp 进 durable audit」 | `T-O-ACE1117-06①` |
   | `T-O-DNMS01-11`、`-13`「不新增 model-facing tool」 | `T-O-ACE1117-04④`、`-09` |
   | `T-O-DNMS01-15` S=0.80、严格顺序的读法 | `T-O-ACE1117-10①②` |
   | `T-O-DNMS01-15` 7 字段 schema | `T-O-ACE1117-07②` |
   | `T-O-DNMS01-15` pinned 字段语义 | `T-O-ACE1117-08` |
   | `T-O-DNMS01-15`「不新建 durable audit 文件」 | `T-O-ACE1117-06①` |
   | `T-O-DNMS01-18①②` | `T-O-ACE1117-05` |
   | `T-O-DNMS01-19①` | `T-O-ACE1117-06` |
   | `T-O-DNMS01-20` rail 入口、18 key、缓存键 | `T-O-ACE1117-10③④` |
   | `T-O-DNMS01-21④` | `T-O-ACE1117-06` |

   两处（`DNMS01-qna.md` 末尾、`DNMS01-qna-truth.md` §4.5 `AMEND-4…`）都只写这张表，不复述内容（`B12`）。
8. **closure 修订（`-01⑤`）**：随计划收尾统一修订 `closure/DNMS01-closure.md`：`:20` 的唤醒消息描述改为指向 `-05`；`:74` 的待移动项按原计划处理。QnA 期间不改。

#### 【推荐选项支持证据或其他选项的反例】

**支持 B 的证据**

| 证据 | 位置 | 说明 |
|---|---|---|
| 两个本机 profile 都是 S=0.90 且满足严格顺序 | 本机两份 `async-compact.json` | D1 采纳、D2 回退、兼容退役对现有配置零影响 |
| 等号只在代码注释里，没有 durable 登记 | `compact-policy.js:13-14` | 按「不得擅自扩约」须在本册裁决 |
| 包文档自相矛盾 | `DETAIL.zh.md:15-16` | 必须收敛到一种 |
| `B = S` 时 async 被抢占 | `-05②`（同步 FULL 抢占在途 episode） | 等号在新状态机下没有意义 |
| 顶栏入口已写进包文档并显示水位 | `ModelSelector.jsx:791-805`；[DNMS] `AGENTS.md` 面板入口节 | 位置是呈现选择，现状可用 |
| 缺切换确认 | `src/client/` 无切换确认；`DNMS01-qna-truth.md:68` | 切换会改写 profile，确认保留有实际意义 |
| base 扁平行未覆盖 | `base/cordis.patch.yml:355-356`；`gen-mutex-patch.mjs:20,91-109` | ON 态仍有出厂路径，违反 `-10` 与 `B07` |

**A（全部追认）的反例**

- 保留等号会让 `H = B` 的配置重复 arm、`B = S` 的配置 async 失效，`-05` 的状态机无法避免。
- 不覆盖 base 扁平行，ON 态下走 base 组合的会话仍由出厂 `compaction-basic` 压缩，与「ON 全接管」不符。
- 保留 0.80 读时兼容违反「能彻底退役就不兼容」。

**C（全部回退）的反例**

- S 回到 0.80 让两个本机 profile 的 B=0.7 只剩 0.1 的 async 窗口，`-05` 之后 S 线一越过就抢占，async 完成率会下降。
- 缓存键在 `-06` 的双通道之后没有用途，回退只增加一份无用状态。
- 入口搬回 rail 是纯呈现改动，没有带来合同收益。

**D（S 可写）的反例**

- 新增可写字段是公共合同扩张，需要新的校验与面板，超出收口范围；也会产生 Round 5。

- **问题**：你是否同意 **B**：① D1 采纳 S=0.90 只读，退役 0.80 读时兼容；② D2 回退到严格顺序 `effectivePin/W < H < B < S < 1`，删除等号注释、修正 `DETAIL.zh.md`、等号测试改为拒绝；③ D8 采纳顶栏入口；④ D9 i18n key 不作合同、只要求中英完整对应，补开关切换确认，缓存键要求退役；⑤ D10 回退到覆盖 base 扁平行；⑥ 验收只用上列既有测试、检查脚本与只读证据重放；⑦ 本册冻结后按上表一次性写入 DNMS01 两处接替指针，closure 随计划收尾修订？若不同意，请选 A / C / D 或给出修改。
- **业主回答**：同意推荐 **B**（2026-11-17）→ 冻结为 `T-O-ACE1117-10`

---

## 9. ★ Round 4 收口总结与中场评估 IV（全轮收口）

### 9.1 Round 4 判定

| 题 | [业主] 裁决 | 冻结为 | 一句话结论 |
|----|-------------|--------|------------|
| Q8 | 同意推荐 B | `T-O-ACE1117-08` | pinned 两字段改为目标值；上限由 lane 回落线推导、预留 8192；下限一个平衡节点；turn → step → 节点就近选择；帧写固定字段并保留标签 |
| Q9 | 同意推荐 B | `T-O-ACE1117-09` | `inspect_checkpoint` 以同包子路径独立成行，不进 isolate；`compactionId` + 分页；单条 2000、单次 24000 字符上限 |
| Q10 | 同意推荐 B | `T-O-ACE1117-10` | S=0.90 并退役读时兼容；严格顺序；顶栏入口；文案不作合同、补切换确认、缓存键退役；覆盖 base 扁平行；只用既有检查验收 |

### 9.2 本轮固化了什么

1. **提交动作的全部参数已定**：选择器（`-03` + `-08`）、帧（`-04` + `-08⑤`）、prompt（`-07`）三者共同描述一次提交，且由同一组测试锁定。
2. **第一个 model-facing 工具的合同已定**（`-09`），注册位置避开 isolate 组，沿用上游工具的组合形态。
3. **剩余五处漂移全部结算**，验收清单只含既有入口（`-10`）。
4. **真相层收口**：`T-O-ACE1117-01`–`-11` 共 11 条 + Baseline 13 条，计划可以只 CITE 本册。

### 9.3 STEP.1 全册审计记录

方法：逐题比对业主回答与 §1.2 台账；逐条比对台账之间、台账与题面、台账与 DNMS01 旧行及其后续追加段（`DNMS01-qna.md` Round 16–18）；检索状态词与计数；复核 Round 4 新增的 file:line。

| # | 检查项 | 结果 | 处置 |
|---|--------|------|------|
| 1 | 业主回答完整性 | Q1–Q10 共 10 题均有回答，无空槽；题面不改字 | 本轮回填 Q8–Q10 |
| 2 | 台账完整性 | Baseline `B01–B13` + `01–10` 连续、无重复；每题与 truth-id 一一对应 | 追加 `-11` 收口登记 |
| 3 | 状态词与计数 | 文件头写「draft · Round 4 进行中」；§0 Round 4「进行」、Baseline「随本文件冻结」；文件头 qna 位点写「每轮 3 题 executional」，而 Round 4 由 [业主] 指定为 foundational 级；角色配置写 second-opinion `none`，与下一行 `retired` 不一致；下游消费者仍写「形式由 Q1 决定」 | 全部改为最终状态（见修订历史 v1.0）；各中场评估中的「预计」「待」字样是当时的判断，按 append-only 保留 |
| 4 | **Q10 题面指针表误列** | 题面⑦把 DNMS01 `-15` 的「严格顺序」列为被接替，但 `-10②` 恰恰回退到严格顺序 | 以 §9.5 最终表为准（`-11①`），题面不改字 |
| 5 | **指针表欠登记** | 题面表缺：`-16`「按协议重实现」的读法限定（`-02⑤` 已写明）、`-20`「S 只读 0.80」文案、DNMS01 R-16.1/.3/.6 已被本册回答 | 补入 §9.5 |
| 6 | **DC-1 与严格顺序的表述冲突** | Q10 题面只写「`H >= B` 或 `B >= S` 一律 400」，未说明第一个不等式；若字面读成「全部不等式违反即 400」，会与 `-13` 的 DC-1 full-only 合法冲突 | `-10②` 明写 DC-1 仍为 full-only 标记、不拒绝写入 |
| 7 | **术语不一致** | `-03` 用 turn / step / node，Q8 帧用 turn / step / message | `-08⑤` 明写：帧中 node 对模型表述为 `message`，账本仍记 `node` |
| 8 | **欠登记：账本覆盖范围** | `B11` 列有「账本只覆盖异步 lane」，`-06` 只写补充字段，未写覆盖范围；而 `-03③④` 要求四条 lane 的每次选择都记录级别 | `-11②` 登记为派生读法 |
| 9 | **欠登记：现行 `disarmed` 行为** | [DNMSC] `AGENTS.md` 账本节记录「抬高 B 撤销在途 episode」，`-05` 的结算原因列表未提及 | `-11②` 登记为与 `preempted` 同类、不计 circuit 的读法（来源：[业主] 显式意图 = `-05②` 抢占规则的同一逻辑） |
| 10 | **欠登记：超时数值** | Q5 只改超时的结算方式，未提数值 | `-11②` 登记沿用 120 s |
| 11 | **文档内竞态：两条裁决通道** | DNMS01 `Round 16` 段写明「裁决后在 truth ledger 落 `T-O-DNMS01-23/-24`」，与 `-01①`「本册是唯一 provenance」冲突，可能出现同一事项两处登记 | `-11④`：R-16.1/.3/.6 由本册回答并写指针；R-16.2/.5、R-17、R-18 显式 defer；`-23/-24` 不再启用 |
| 12 | **与 `B07` 的事实张力** | `B07` 继承 `-17`「默认 OFF」，但 [DNMSC] `AGENTS.md` 写明新安装即 ON（DNMS01 R-16.5 未决） | 不在本册范围；`-11④` 写明 `B07` 只继承原文、不裁决该矛盾 |
| 13 | **实施期委托项与指针的时序** | `-07②` 写「字段名在实施时确定，并同步修订 `-15` 字段清单」，若理解为实施时再写一次指针，会与 `-01②`「一次性写入」冲突 | `-11③`：`-15` 字段清单的指针现在指向 `-07②`，实施时不再写指针 |
| 14 | 自我接替 | `-02④`「工具暂不放开」与 `-04③` 新增工具 | 不冲突：`-02④` 自带「直到专题裁决」，由 `-04` 终止；`-11②` 注明 |
| 15 | 跨题一致性抽查 | `-05②` 抢占 × `-10②` 严格顺序（`B = S` 不再可能）；`-06①` 拒绝不 clamp × `-08②` 选择器内取上限（不改策略文件）；`-08⑤` 帧字段 × `-09` 工具名与 `compactionId`；`-09①` 工具行 × `-10⑤` 覆盖范围 | 一致 |
| 16 | 证据复核 | Round 4 新增引用逐条对照源码；`closure/DNMS01-closure.md:20` 描述的 `compaction-adoption-wake` 在 [DNMSC] `lib/` 中已无任何出现（检索 `adoption-wake`、`followup` 均为零） | 无误 |

**审计结论**：#3–#13 共 11 项需处理，已全部在本次修订中处置；处置后无内部冲突、无文档内竞态、无欠登记。

### 9.4 覆盖矩阵

**[业主] 四项担心（`B03`）**

| 担心 | 落点 |
|------|------|
| ① 保留尾部按语义边界 | `-03`、`-08` |
| ② arm 时序与对 LLM 的告知、inspection 工具 | `-04`、`-05`、`-08⑤`、`-09` |
| ③ UI 心跳（设置、诊断、对话内心流） | `-06`、`-07⑤`、`-10③④` |
| ④ 异步专用 prompt 管理 | `-07` |

**漂移 D1–D11**

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

**`B11` 代码缺陷**

| 缺陷 | 落点 |
|------|------|
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

### 9.5 DNMS01 接替指针最终表（`-01②`，本次冻结同步写入）

| DNMS01 旧行 / 项 | → 接替（或读法限定） |
|------------------|----------------------|
| `T-O-DNMS01-11`「clamp 进 durable audit」 | `T-O-ACE1117-06①` |
| `T-O-DNMS01-11`、`-13`「不新增 model-facing tool」 | `T-O-ACE1117-04④`、`-09` |
| `T-O-DNMS01-15` S=0.80 | `T-O-ACE1117-10①` |
| `T-O-DNMS01-15` 7 字段 schema | `T-O-ACE1117-07②` |
| `T-O-DNMS01-15` pinned 两字段「保留量」语义 | `T-O-ACE1117-08①⑥` |
| `T-O-DNMS01-15`「不新建 durable audit 文件」 | `T-O-ACE1117-06①` |
| `T-O-DNMS01-16`「按协议重实现」的适用范围 | `T-O-ACE1117-02⑤`（读法限定：协议层按契约，语义层按本册） |
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

写入位置：`docs/specs/dsh-nano-model-selector/qna/DNMS01-qna.md` 末尾「ACE-1117 接替」一节；`DNMS01-qna-truth.md` §4.5 `AMEND-4`–`AMEND-6`。两处只写指针，不复述新真相，不改旧行原文（`B12`）。

### 9.6 收口声明与交接

- **结论：本册全轮收口，真相层已冻结。** Baseline `B01–B13` 与 `T-O-ACE1117-01`–`-11` 全部冻结；无 OPEN 题、无待决槽；残留事项已按 `-11④` 显式 defer。
- **交接**：§1 台账 → 正式 ACE-1117 计划 §2 CITE（不复制正文）；`-11③` 的实施期委托项进入计划的实施说明；验收按 `-10⑥`。
- **不设 Round 5**（除非 [业主] 明确要求）。之后任何修订只能在本册 append-only 追加。
- **冻结不是实施完成，也不是 implementation grant**；发布授权归 [业主]（`B13`）。

### 9.7 收口后更正（append-only）

| 更正 | 对象 | 更正后的读法 | 来源 |
|------|------|--------------|------|
| `CORR-1`（2026-11-17） | `T-O-ACE1117-11②` 中 `disarmed` 的理由 | 原文「属于 [业主] 显式意图」只覆盖一种情况。代码的实际判定是：episode 在途期间，某个 step 边界的 fill 低于 B（`host-compaction.js:614-616`），就撤销在途摘要、丢弃结果、账本记 `drop`/`disarmed`、journal 无痕（`:338-357`）。触发原因可以是调高 B、换成窗口更大的模型、tool-result-pruner 裁剪使 fill 回落。读法改为：**disarm = 在途期间压缩条件消失；它不是失败**。结论不变：保留该行为，不计入 circuit，与 `preempted` 同类结算 | [业主] 2026-11-17 同意追加更正；原行文字不改 |
## 修订历史

| 版本 | 日期 | 作者 | 主要变更 |
|------|------|------|----------|
| v0.1 | 2026-11-17 | Droid | 初稿：Baseline `B01–B13`；Round 1 `Q1–Q2`（foundational）待 [业主] 回答 |
| v0.2 | 2026-11-17 | Droid | [业主] 同意 Round 1 全部推荐 → 冻结 `T-O-ACE1117-01/02`；新增 §3 Round 1 总结与中场评估 I；新增 Round 2 `Q3–Q4`（foundational）待 [业主] 回答；§5 中场评估 II 占位 |
| v0.3 | 2026-11-17 | Droid | [业主] 同意 Round 2 全部推荐 → 冻结 `T-O-ACE1117-03/04`；新增 §5 Round 2 总结与中场评估 II（含第 4 轮收口判断）；新增 Round 3 `Q5–Q7`（executional）待 [业主] 回答；新发现漂移 D11（`compact-policy.js` 双份）；§7 中场评估 III 占位 |
| v0.4 | 2026-11-17 | Droid | [业主] 同意 Round 3 全部推荐 → 冻结 `T-O-ACE1117-05/06/07`；修正 §1.2 `-04` 行尾表格断行；新增 §7 Round 3 总结与中场评估 III（含收口判断）；新增 Round 4 `Q8–Q10`（foundational 级 · 收口）待 [业主] 回答；§9 中场评估 IV 占位 |
| v1.0 | 2026-11-17 | Droid | **最终轮：Round 4 冻结 + 全轮收口**。[业主] 同意 Round 4 全部推荐 → 冻结 `T-O-ACE1117-08/09/10`；STEP.1 全册审计（§9.3）发现 11 项需处理：文件头与 §0 状态词、Q10 指针表误列 `-15` 严格顺序、指针表欠登记（`-16`、`-20` S 文案、R-16.1/.3/.6）、DC-1 表述、turn/step/node 与 message 术语、账本覆盖范围、`disarmed` 行为、超时数值、DNMS01 Round 16 第二裁决通道、`B07` 与 R-16.5 的事实张力、`-07②` 指针时序；STEP.2 全部处置并追加 `T-O-ACE1117-11` 收口登记；§9 写入判定、审计、覆盖矩阵、DNMS01 接替指针最终表与收口声明；同步在 `DNMS01-qna.md` 末尾与 `DNMS01-qna-truth.md` §4.5 写入接替指针；STEP.3 文档状态改为 `已冻结` |
| v1.1 | 2026-11-17 | Droid | 收口后更正：追加 §9.7 `CORR-1`，把 `-11②` 中 `disarmed` 的理由从「[业主] 显式意图」更正为「在途期间压缩条件消失」（结论不变）；原行不改字 |
