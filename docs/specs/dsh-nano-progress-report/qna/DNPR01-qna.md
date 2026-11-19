# DNPR01 QNA · [DNPR] 会话进度账本与通用消费基座决策册

> **范围（scope）**：落实 [spec-v1.1](../spec-v1.1.md) 为 [DNPR] 定义的新价值（会话进度账本），并为潜在消费者提供通用的消费基座。本文只记录决定，不是实施计划。
> **QNA 位点**：`deep-dive`，先 foundational，再 executional（台账子类型记为 `execution`）。
> **角色配置**：提问 `DNPR01 架构审查`；裁决 [业主]。second-opinion 自 Round 1 起 `retired`，不设答复槽。
> **下游消费者**：「DNPR01 计划」§2 引用冻结的 `T-O-*`；全部轮次收口前不输出正式计划。
> **文档状态**：`draft`。§1 开轮基线已按 [业主] 既有表述登记；Round 1–3 已冻结（`T-O-5`–`T-O-11`），foundational 收口，executional 第一轮收口；Round 4 已提出、待 [业主] 裁决。取证快照 `main@1e41d91`（2026-11-19），宿主事实以 rc.5 源码树为准，下称 `[EV5]`：Round 1–3 取证时它位于评估路径 `.dependencies/eval/deepseek-harness/`；[业主] 于 2026-11-19 将同一提交 `9c2670d`（`dsh-v0.2.2-rc.5`）登记为 pinned，路径改为 `.dependencies/pinned/deepseek-harness/`，本册链接已统一改到新路径，行号不变。Round 4 取证快照 `main@f55dd97`（相对 `1e41d91` 只多了 [DNMS] 提交）。以下是源码与文档核查，不是新做的运行实测。

## 0. 分轮状态总览

| 轮次 | 题号区间 | 焦点 | second-opinion | 状态 |
|---|---|---|---|---|
| Round 1 | Q1–Q2 | 进度事实在哪里唯一计算；对外以什么形态被消费 | `retired` | 已冻结，2/2 已答 |
| Round 2 | Q3–Q4 | 进度的骨架单位；模型通过什么通道读账本 | `retired` | 已冻结，2/2 已答 |
| Round 3 | Q5–Q7 | 账本的计算规则：开项、失败与等待、有界 | `retired` | 已冻结，3/3 已答 |
| Round 4 | Q8–Q10 | 出口与交付：模型可见文本、DNPR01 交付范围、发布切分与验证 | `retired` | 进行，0/3 已答 |

本册是 [DNPR] 的第一份 QNA，题号自 `Q1`、Truth-ID 自 `T-O-1` 起编，append 续编、不回收。按 [业主] 指定节奏：foundational 共两轮、每轮两题；之后 executional 每轮三题，直到执行层冻结，再输出 DNPR01 计划。此处只列已提出的题；**当轮全部裁决入账 → 中场评估 → 重新检索与推理 → 才能提出下一轮**。

## 1. ★ Truth-Gate 台账（已锁定真值 · NORMATIVE · append-only）

| Truth-ID | 子类型 | 已锁定真相 | 来源（Round / Q） | 驱动了哪些题 | 下游约束 |
|---|---|---|---|---|---|
| `T-O-1` | `foundational` | 本专项名为 `DNPR01`，交付两件事：①兑现 spec-v1.1 定义的新价值，即 [DNPR] 是「会话进度账本」，回答做到哪了、还剩什么、卡在哪、证据在哪；②给潜在消费者提供一个通用的消费基座。 | 开轮基线 / [业主] 本次阶段指令首段及阶段命名 | Q1、Q2、Q3 | spec-v1.1 是输入，不是授权：它自述「不是改约登记」（[spec-v1.1:5](../spec-v1.1.md#L5)），其中 R1–R6 仍未裁决（[附录 A：460–465](../spec-v1.1.md#L460-L465)），只有本册冻结的 `T-O` 生效。 |
| `T-O-2` | `foundational` | **保留并且不削弱 Progress 当前的视觉报告，但不能发展成另一个 Trajectory。** | 开轮基线 / [业主] 前序表述（「比轨迹舒服」「不能发展成另一个轨迹」） | Q1、Q2、Q3、Q4 | 包内低干扰合同继续有效：28px 行、回合缩进、时间列、无 goal banner/状态带/`SegmentedControl`（[[NPR] AGENTS.md:150–152](../../../../dsh-nano-progress-report/AGENTS.md#L150-L152)）；原始数据检查归 Trajectory。 |
| `T-O-3` | `foundational` | **人类视图按「一行 = 一个进度事实」精简**：采用 spec-v1.1 §4.4 的 A（里程碑）/ B（动作段）/ C（剥离）三层；动作段展开只到子步骤摘要；Progress 不显示 args、result 原文和 reasoning 正文；回合中间的叙述消息默认隐藏，只保留结论消息；过滤条非空时逐行显示。 | 开轮基线 / [业主] 前序三项选择（子步骤摘要、默认隐藏、写入 spec-v1.1）；规则正文见 [spec-v1.1 §4.4：196–247](../spec-v1.1.md#L196-L247) | Q1、Q2、Q3、Q6 | **本条是该决定的唯一登记**；spec-v1.1 附录 A 的 R7 与 C7-05 改为引用本条。落地时修订 `[NPR]/AGENTS.md` 的验收第 4 条、「使用」表与「不要」中的原始输出条款（[AGENTS.md:5](../../../../dsh-nano-progress-report/AGENTS.md#L5)、[:152](../../../../dsh-nano-progress-report/AGENTS.md#L152)）。规则全部确定性计算，不调用模型。 |
| `T-O-4` | `foundational` | **长期治理原则**：能硬切就不要双写；能彻底退役就不要提供兼容；平台保持中立；不得耦合私域。与仓规的插件中立、上层建筑归 host、不得侧载、单一真源、不得擅自扩约、不得过度仪式、UI 宿主优先共同约束本册每一项推荐。 | 开轮基线 / [业主] 本次阶段指令；[仓规：39–46](../../../../AGENTS.md#L39-L46) | Q1–Q7 | 推荐方案不得设并存过渡期、兼容读者或双份发布；不得识别 [dsh-mini]、[nano-agent] 或任一特定消费者的私有标记；对外只走 [dsh] 宿主公开接缝。 |
| `T-O-5` | `foundational` | **宿主一个账本投影单元是 [DNPR] 进度事实的唯一计算点，同一次发布硬切。** 单元带 `wire`、`summary:false`，key 为 `nano-progress-report:ledger`；同一次发布删除 `nano-progress-report:summary` 单元及其注册，并退役浏览器 `task-times.js` 的窗口内推导。PromptContext、Tasks 完成时间、导出与命令、外部读者都只读账本。当前 todo 清单、goal、jobs 继续读官方 owner，不在账本中重算；账本只补官方没有的事实：跨回合任务史、完成时刻、改动文件、未解决失败、待处理项和证据 seq 区间。 | Round 1 / Q1，[业主] 同意 A 全部推荐 | Q3–Q7 | 状态有界，只存派生事实与 seq 指针，不存命令原文、输出或 reasoning。旧 key 的 checkpoint 单元格只是停止推进的缓存残留，不写迁移器、不留兼容读取。时间线仍是事件流的渲染（`T-O-3`），与账本共用 `src/shared/` 的分层与指纹函数，不另算进度事实。字段名、上限、归属规则和 PromptContext 文本未定。 |
| `T-O-6` | `foundational` | **账本的 `wire` 视图是 [DNPR] 唯一的公开只读合同，带版本号 `v`。** 消费者只经 [dsh] 宿主自有读面获取：浏览器 `session.projections.faceOf(key)`、宿主插件 `ctx.sessionProjections.snapshot(session, [key])`、跨会话 `sessionQuery.observeSession`。[DNPR] 不 `ctx.provide`、不开路由、不把投影 handle 当读取接口导出。 | Round 1 / Q2，[业主] 同意 A 全部推荐 | Q3、Q4、Q5、Q7 | 视图只含派生事实、seq 指针和覆盖/截断标记；任务正文是 `todo/write` 原样字段；不含命令、输出、reasoning；不为任何特定消费者定制字段。同一 `v` 内只追加可选字段，破坏性变化升 `v` 并同次硬切，不同时发布两版、不留旧版兼容读者。[DNPR] 未安装时 key 不存在，消费者必须降级。字段表只登记在 `[NPR]/AGENTS.md`。模型侧出口、跨会话授权范围、身份维度与字段清单不在本条。 |
| `T-O-7` | `foundational` | **账本以「工作项」为一级骨架：人类指令与 goal 是一级工作项，todo 任务是挂在所属工作项下的可选二级。** 指令以其 `user/message` 事件 seq 为身份；goal 以 goal id 为身份，各轮次是该项内的进展；代理回报、子代理结束通知不新开工作项，挂到当时所属的工作项。识别看消息 `source`，不看角色。工作项状态只陈述可从事件得出的事实：进行中、最后一个 `turn/end` 的结束原因、等待中、未解决失败数；不对指令推断「已完成」，goal 阶段读官方 goal owner。 | Round 2 / Q3，[业主] 同意 A 全部推荐 | Q5、Q6、Q7 | 任务身份沿用 `content`，跨回合保留，挂在首次列出它的 `todo/write` 所属工作项下；证据先归工作项，恰有一个任务 `in_progress` 时同时归该任务，否则不归任务。子代理会话同样适用，账本不跨会话。工作项随指令线性增长，必须有明确上限，早期项降级并标明覆盖范围。不新增模型声明里程碑的工具（列 v1.2 候选，不在 DNPR01）。开项的 source 清单与上限数值未定。 |
| `T-O-8` | `foundational` | **模型经两条通道读账本：稳定的推送锚 + 一个只读拉取工具；本阶段不注册 skill。** 推送沿用 PromptContext（`order:180`、`required:false`），内容只取账本的定向事实（当前工作项状态、当前任务、未解决失败与待处理项的数量或类别），只在这些类别变化时改写；同一次发布删除「Recent file-tool paths」行，不留兼容格式；完整文本 ≤ 600 字节。拉取经 `ctx.tools.register` 注册一个只读工具，`when` 仅在本会话账本有内容时出现，返回有界、带 seq 指针的账本切片，不含命令、输出或 reasoning。 | Round 2 / Q4，[业主] 同意 A 全部推荐 | Q6 | 推送与工具文本从模型视角写，只用任务概念，不出现 UI、投影或传输词汇；推送保持「观察到的事实，不是指令」；固定文本由单测逐字锁定。`[NPR]/AGENTS.md` 增加 Model Experience，写明 token 与 KV 缓存影响。模型侧出口不进入 `T-O-6` 的公开读合同。工具名、参数 schema、返回上限、锚字段与措辞未定。 |
| `T-O-9` | `execution` | **工作项的开项白名单是 `user`、`goal`、`schedule` 三种消息 source。** 回合打开期间第一条命中白名单的 `user/message` 决定该回合归属：`user`（含子代理会话中被委派的提示）与 `schedule` 开新项；`goal` 的 goal id 与当前项相同则并入，否则开新项。同回合内后续命中白名单的消息不另开项。其他 kind（`retry`、注入上下文、代理消息、子代理结束通知、job 唤醒及宿主将来新增的任何 kind）一律挂靠当前工作项。账本只存开项 seq、goal id 与回合号区间，不复制提示或 goal 目标文本。 | Round 3 / Q5，[业主] 同意 A 全部推荐 | — | 本条扩充 `T-O-7` 的开项范围（加入 `schedule`）。提示预览由消费者按回合号关联官方 `turnOutline` 获取；goal 目标读官方 `goal` 投影（只含当前 goal）。首个工作项之前的事实只计入视图顶层的未归属计数，不伪造工作项；fork 继承段按 `inherited` 排除。开项判定放在 `src/shared/`，浏览器时间线同一次发布让 `schedule` 也开组，不留两套口径。 |
| `T-O-10` | `execution` | **全部工具记录失败；恢复的唯一证据是同一指纹在同一工作项内后来成功。** 共享指纹：bash 用现行命令指纹（cwd、workdir、command；后台运行的 bash 不产生指纹），文件工具用路径（write、edit、apply_patch 归一，apply_patch 每个路径各一），其他工具用工具名加规范化参数摘要。未恢复失败冻结为所属工作项的历史事实，后续项的成功不改写它；「当前」计数只看当前工作项。待决提问读官方 `userQuestions`；审批由账本按 id 配对 `approval/asked`/`approval/decided`，回合结束时未决者关闭；jobs、子代理读官方。 | Round 3 / Q6，[业主] 同意 A 全部推荐 | — | 失败判定沿用宿主语义（`isError === true` 或 `error != null`），非零退出码不算失败；bash 成功要算恢复仍需通过现行终态检查。指纹函数放在 `src/shared/`，宿主账本与浏览器精简分层共用；时间线的「失败 k 次后通过」与 A 层未恢复失败按回合分组判定，goal 项跨回合的恢复由账本陈述。本条细化 `T-O-5` 的「待处理项」：官方已有 owner 的待决提问不在账本中重算。 |
| `T-O-11` | `execution` | **账本三层有界，上限是 `v1` 合同常量。** 最近 16 个工作项保留完整明细（文件 ≤ 32、失败指纹 ≤ 16、任务 ≤ 32，超限保留最近条目并记总数）；再往前 64 个降为骨架行（身份、类别、开项 seq、回合区间、结束原因，文件/失败/未恢复/任务计数）；更早的并入累计计数。降级确定、不可逆，降级后的项不再接收更新。视图顶层如实标注 `asOfSeq`、`inherited`、累计层覆盖到的最后 seq 和各列表的截断计数。 | Round 3 / Q7，[业主] 同意 A 全部推荐 | — | 16/64/32/16/32 只登记在 `[NPR]/AGENTS.md` 字段表；调整任一数值是破坏性变化，升 `v` 并同次硬切；不做成 `Config`。降级后再出现的同 `content` 任务挂到当前项。状态含当前回合未配对调用缓冲（≤ 64），`parseState` 白名单重建并拒绝超限集合，`stateVersion` 从 1 开始；无关事件返回同一状态引用，骨架行冻结复用。不拆成多个 key。落地后用 `[PROD]` 复测视图体积、推送次数与冷构建耗时，只记录不设闸门。 |

**继承，不重登**：spec-v1.1 的事实盘点（§1–§2）、生产实测（[§2.1：85–96](../spec-v1.1.md#L85-L96)）与簇台账（§5–§6）作为提问依据被引用，不因被引用而成为真相。各题保留提问时的选项与依据；只有 [业主] 已答且已入台账的决定生效，不因源码、测试或推荐预发 Truth-ID。

## 2. Round 1 —— foundational：进度事实的真源与出口（Q1–Q2）

本轮 `retired`，[业主] 直答。Q1 问「进度事实在哪里算、算几份」；Q2 问「算出来之后，别人凭什么、以什么形态读」。Q2 的推荐 A 需要一个宿主侧载体，Q1 选 A 或 B 时都有载体；若 Q1 选 C，Q2 只剩 B。除此之外两题可独立作答。

### Q1 — 进度事实应由宿主账本投影唯一计算并硬切，还是保留双轨或继续由浏览器推导？

**驱动真相**：`T-O-1`（会话进度账本）、`T-O-4`（能硬切就不要双写）。来源：[spec-v1.1 §4.2：160–186](../spec-v1.1.md#L160-L186)、[C1：280–332](../spec-v1.1.md#L280-L332)、[R1：460](../spec-v1.1.md#L460)。

- **影响范围**：宿主投影单元与其 checkpoint 缓存、PromptContext 的数据源、浏览器 Tasks 区的完成时间、未来的导出和 `/progress` 命令，以及 Q2 所说的外部读者。
- **为什么必须确认**：今天同一类事实被算了两遍，而且口径不同。宿主 `nano-progress-report:summary` 投影覆盖整会话，但只保留最近 8 个路径和 8 个失败指纹，且没有 `wire`，浏览器读不到（[projection.js:3–5](../../../../dsh-nano-progress-report/src/host/projection.js#L3-L5)、[:105–113](../../../../dsh-nano-progress-report/src/host/projection.js#L105-L113)）。浏览器再从已加载的窗口行推一次任务完成时间，窗口外的任务就没有时间（[task-times.js:1–7](../../../../dsh-nano-progress-report/src/client/task-times.js#L1-L7)、[ProgressBody.jsx:118](../../../../dsh-nano-progress-report/src/client/view/ProgressBody.jsx#L118)）。spec-v1.1 原稿又让新 ledger 与旧 summary 并存到 C4-02（[spec-v1.1:291](../spec-v1.1.md#L291)），这是一个双写过渡期，与 `T-O-4` 冲突。
- **当前建议 / 倾向**：选 **A**：宿主一个账本投影单元是进度事实的唯一计算点，同一次发布替换旧 summary 单元，不设并存期；官方已有 owner 的事实继续读官方，不在账本里重算。
- **Reasoning**：投影是官方为「从完整日志推导的整会话值」准备的接缝，翻页和压缩都不影响它；浏览器窗口天然只看到一段。旧 summary 单元没有任何外部读者，硬切不会打断谁；保留它只会让两个单元对路径和失败各折一遍，并在两个 key 下各存一份 checkpoint。
- **问题（请 [业主] 裁决）**：是否以一个宿主账本投影单元作为 [DNPR] 进度事实的唯一计算点，同一次发布退役现有 `summary` 单元和浏览器窗口内的完成时间推导，且不重算 `todos`、goal、jobs 这些官方已有的事实？请选择 A/B/C，或给出修订。
- **[业主]回答**：已确认 A（2026-11-19：「业主同意你在 [第1轮] 的全部推荐」），冻结为 `T-O-5`；key 采用推荐的 `nano-progress-report:ledger`。

**【对本问题的解读】**　例：一个会话跑了三个回合，任务 #2 在第一回合完成；浏览器窗口只加载了第三回合。按推荐，Tasks 区仍能显示 #2 的完成时间，因为它来自宿主对整会话的折叠，而不是窗口里恰好有没有那条 `todo/write`。「进度事实」指账本里的派生事实：跨回合任务史与完成时刻、改动的文件、未解决的失败、待处理的审批或提问，以及指回日志的 seq 区间。时间线本身仍是事件流的渲染（`T-O-3` 的证据层），不是第二个计算点。本题定计算点与退役方式，不定字段表、上限、证据归属算法或模型可见文本。

**【可选选项清单】**

| 选项 | 计算点 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 宿主一个账本单元（带 `wire`、`summary:false`）；同一次发布删除 `summary` 单元与 `task-times.js` 推导；当前清单、goal、jobs 读官方 owner。 | 整会话、单口径，人和模型读同一份事实；一次性改动 PromptContext 数据源，需在同一发布内验证。 |
| B | spec-v1.1 原稿：新增 ledger，与旧 `summary` 并存，C4-02 后再退役。 | 模型输入的改动可以晚一步；过渡期两单元重叠折叠、两份 checkpoint，退役依赖后续执行纪律。 |
| C | 不建宿主账本；浏览器继续按窗口推导，宿主 `summary` 只服务模型。 | 改动最小；窗口外没有数据，模型与人读到不同口径，Q2 的外部消费者没有可读载体。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **唯一计算点**：注册一个账本投影单元，带 `wire` 块并设 `summary:false`，不进会话列表行。状态有界，只存派生事实和 seq 指针，不存命令原文、输出或 reasoning，延续「摘要没有原始命令、结果、任务或团队消息正文」的现行承诺（[AGENTS.md:96](../../../../dsh-nano-progress-report/AGENTS.md#L96)）。
2. **硬切**：同一次发布注册新单元、删除 `progressProjection`（[projection.js:105–113](../../../../dsh-nano-progress-report/src/host/projection.js#L105-L113)）及其注册（[host/index.js:12](../../../../dsh-nano-progress-report/src/host/index.js#L12)）；PromptContext 改读账本（[host/index.js:14–20](../../../../dsh-nano-progress-report/src/host/index.js#L14-L20)、[summary.js:7](../../../../dsh-nano-progress-report/src/host/summary.js#L7)）。旧 key 的 checkpoint 单元格在退役后停止推进、不再被读取（[session-projection README:171](../../../../.dependencies/pinned/deepseek-harness/packages/session/session-projection/README.md#L171)），它只是可丢弃的缓存残留，不写迁移器、不留兼容读取。新 key 建议命名为 `nano-progress-report:ledger`：`summary` 这个名字配 `summary:false` 会长期误导公开读者。若 [业主] 更看重零缓存残留，可修订为沿用旧 key 并提升 `stateVersion`。
3. **不重算官方事实**：当前 todo 清单仍读官方 `todos` 投影（它在下一回合开始时清空，[tool-todo README:93](../../../../.dependencies/pinned/deepseek-harness/packages/todo/tool-todo/README.md#L93)），goal 读 `ctx.get('goal')`，jobs 读 `jobs` 服务（[summary.js:8–17](../../../../dsh-nano-progress-report/src/host/summary.js#L8-L17)）。账本只补官方没有的视角：跨回合任务史、完成时刻、改动文件、未解决失败、待处理项和证据区间。
4. **浏览器**：Tasks 区的完成时间改读账本，`task-times.js` 退役。时间线继续从 `progress` target 渲染（`T-O-3`），与账本共用 `src/shared/` 中的分层与指纹函数（[spec-v1.1 §4.3 第 5 条：194](../spec-v1.1.md#L194)），同包复用，不是插件间通道。
5. 本题不选字段名、上限、证据归属规则或 PromptContext 文本；这些留给后续轮次。

**【推荐选项支持证据或其他选项的反例】**

- 官方投影接缝的分工是「框架驱动、领域计算；客户端不折叠领域事件，只接收完成的值」（[session-projection.md:5](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/session-projection.md#L5)）。C 让浏览器按窗口推导整会话事实，正是这条分工要避免的情形；[task-times.js:3–7](../../../../dsh-nano-progress-report/src/client/task-times.js#L3-L7) 自己写明窗口外的任务无法给出时间。
- 官方投影规范要求把可恢复的会话派生状态放进 Projection，并优先复用已有 owner（[dsh-session-projection SKILL.md:12](../../../../.dependencies/pinned/deepseek-harness/.agents/skills/dsh-session-projection/SKILL.md#L12)）；缓存必须可丢弃重建，被取代的恢复辅助要删除（[:24](../../../../.dependencies/pinned/deepseek-harness/.agents/skills/dsh-session-projection/SKILL.md#L24)）；切换读取路径前先盘点所有官方消费者（[:30](../../../../.dependencies/pinned/deepseek-harness/.agents/skills/dsh-session-projection/SKILL.md#L30)）。盘点结果：`summary` 单元没有 `wire`，客户端读不到；唯一读者是本包的 [summary.js:7](../../../../dsh-nano-progress-report/src/host/summary.js#L7)。B 的过渡期保护的是一个不存在的外部调用方。
- B 期间两个单元都会折叠 `tool/call`/`tool/result` 中的路径与失败（现有逻辑见 [projection.js:57–90](../../../../dsh-nano-progress-report/src/host/projection.js#L57-L90)），等于同一事实的两份派生结果并存，违背单一真源（[仓规:42](../../../../AGENTS.md#L42)）和 `T-O-4` 的「能硬切就不要双写」。
- 「当前清单」已有官方 owner；若账本也从 `todo/write` 重算当前清单，两者在回合切换时的清空语义会不一致（官方在下一回合开始时清空，[tool-todo README:93](../../../../.dependencies/pinned/deepseek-harness/packages/todo/tool-todo/README.md#L93)）。所以 A 只补官方没有的字段，而不是把官方事实再算一遍。
- 状态有界与版本规则有官方依据：不保留历史规模的 seq 集合（[SKILL.md:22](../../../../.dependencies/pinned/deepseek-harness/.agents/skills/dsh-session-projection/SKILL.md#L22)）；字段或折叠语义变化要提升 `stateVersion`（[session-projection.md:99–104](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/session-projection.md#L99-L104)）。

### Q2 — 「通用消费基座」对外是一份宿主公开读面上的版本化只读视图，还是不公开，或由 [DNPR] 另设专用接口？

**驱动真相**：`T-O-1`（通用消费基座）、`T-O-4`（平台中立、不得耦合私域）。来源：[spec-v1.1 C6：380–388](../spec-v1.1.md#L380-L388)、[R4：463](../spec-v1.1.md#L463)；[FUS 归属：267](../../dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md#L267)；[仓规：41](../../../../AGENTS.md#L41)。

- **影响范围**：其他插件（例如 [DNMS] 的 Fusion 呈现）、跨会话观察者、[DNPR] 自己的 UI 与命令，以及合同的登记位置和版本演进方式。
- **为什么必须确认**：spec-v1.1 把公开合同放在最后一簇（C6/R4），但 `T-O-1` 把「通用消费基座」定为本阶段目标。基座形态不先定，C1 的字段就会按 [DNPR] 自己的 UI 来设计，事后公开时只能做破坏性改版。另外，Fusion 裁决文档已经假定 [DNPR] 只消费宿主公开的会话事实，并禁止两插件之间建 RPC（[FUS:267](../../dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md#L267)、[:442](../../dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md#L442)）。
- **当前建议 / 倾向**：选 **A**：账本单元的 `wire` 视图就是唯一出口，作为带版本的只读 read model 登记为公开合同；消费者只经 [dsh] 宿主自有的读面获取，[DNPR] 不提供服务、不开路由、不导出 handle。
- **Reasoning**：宿主已经为投影提供了三种通用读法：浏览器、宿主插件和跨会话观察，而且都自带「未安装就没有值」的缺席语义。用它们做出口，消费者不需要依赖 [DNPR] 是否存在，[DNPR] 也不需要知道谁在读。专用服务或路由会让消费者对 [DNPR] 产生硬依赖，正是仓规禁止的插件间专有通道。
- **问题（请 [业主] 裁决）**：是否把账本的 `wire` 视图登记为 [DNPR] 唯一的公开只读合同，只允许通过宿主现有的投影读面消费，并且同一 `v` 内只追加字段、破坏性变化升 `v` 后同次硬切？请选择 A/B/C，或给出修订。
- **[业主]回答**：已确认 A（2026-11-19：「业主同意你在 [第1轮] 的全部推荐」），冻结为 `T-O-6`。

**【对本问题的解读】**　例：[DNMS] 想在 Fusion 视图里显示「Sidekick 改了哪些文件」。按推荐，它读 Sidekick 会话里账本 key 的值；[DNPR] 没装时，这个 key 就不存在，[DNMS] 显示「无进度数据」并继续工作，而不是报错或调用 [DNPR] 的接口。「消费基座」指一份所有消费者共享的事实形态和读取方式，不是一组为每个消费者定制的 API。本题定出口的形态、演进规则和缺席语义；模型侧出口（PromptContext 内容、只读工具、skill）、跨会话读取的授权范围、身份维度和字段清单都不在本题裁决。

**【可选选项清单】**

| 选项 | 出口形态 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 账本 `wire` 视图 = 公开只读合同（带 `v`）；浏览器 `faceOf(key)`、宿主 `snapshot(session,[key])`、跨会话 `observeSession` 三种宿主读法。 | 消费者零依赖 [DNPR]，缺席可降级，事实只算一份；视图字段成为公共合同，以后改动要守演进规则。 |
| B | 不公开：`wire` 视图只给 [DNPR] 自用，结构随时可变；其他消费者各自解析事件流。 | [DNPR] 改字段最自由；每个消费者各写一套推导，同一事实出现多个口径，「通用消费基座」不成立。 |
| C | [DNPR] 用 `ctx.provide` 提供查询服务，或开 HTTP/MCP 路由给其他插件调用。 | 可以做按需查询；消费者必须 inject [DNPR]，形成插件间专有通道，新增路由还要进安全清单。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **合同内容**：`v` 加字段表；只含派生事实、seq 指针和覆盖/截断标记；任务正文是 `todo/write` 的原样字段；不含命令、输出和 reasoning（与 `T-O-3`、[AGENTS.md:96](../../../../dsh-nano-progress-report/AGENTS.md#L96) 一致）。字段不为任何特定消费者（Fusion、[dsh-mini] 等）定制。
2. **读法只走宿主**：浏览器 `session.projections.faceOf(key)`；宿主插件 `ctx.sessionProjections.snapshot(session, [key])`；跨会话由观察者经 `sessionQuery.observeSession` 取得同一快照。[DNPR] 不 `ctx.provide`、不开路由、不把投影 handle 当读取接口导出。
3. **演进规则**：同一 `v` 内只追加可选字段，消费者忽略不认识的字段；破坏性变化提升 `v`，并在同一次发布内硬切，不同时发布两版视图、不留旧版兼容读者（`T-O-4`）。
4. **缺席语义**：[DNPR] 未安装或未注册时，key 不存在；消费者必须降级显示，不能把 [DNPR] 当必需依赖。
5. **登记**：「存在公开合同、走哪些读法、怎样演进」由本题冻结的 `T-O` 承载；字段表作为包合同只登记在 `[NPR]/AGENTS.md` 一处，其他文档只引用。

**【推荐选项支持证据或其他选项的反例】**

- 宿主读面现成且通用：`wire` 块让单元对客户端可见（[session-projection.md:44](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/session-projection.md#L44)）；`snapshot(session, keys)` 是注册表的公开同步读法（[:379–389](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/session-projection.md#L379-L389)），本包已经用它读官方 `todos`（[summary.js:8](../../../../dsh-nano-progress-report/src/host/summary.js#L8)），这就是宿主插件读别家投影的先例；浏览器 `faceOf(key: string)` 接受任意 key，key 不存在时返回 `undefined` 快照而不是报错（[projection-store.ts:99–108](../../../../.dependencies/pinned/deepseek-harness/packages/api/session-controller/src/client/sessions/projection-store.ts#L99-L108)）；跨会话观察带回投影快照（[observation.ts:35](../../../../.dependencies/pinned/deepseek-harness/packages/session-query/session-query/src/observation.ts#L35)、[:44–48](../../../../.dependencies/pinned/deepseek-harness/packages/session-query/session-query/src/observation.ts#L44-L48)；[session-query.md:390](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/session-query.md#L390)）。
- C 的反例：官方投影规范不允许把投影定义或 handle 当生产读取接口导出（[SKILL.md:14](../../../../.dependencies/pinned/deepseek-harness/.agents/skills/dsh-session-projection/SKILL.md#L14)）。该条在官方仓内的替代做法是「经 owner 服务的领域方法读」，但在本仓，跨插件服务会让消费者 inject [DNPR]，违反不得侧载（[仓规:41](../../../../AGENTS.md#L41)）和 Fusion 裁决的「两插件之间不建 RPC」「无 [DNPR] 不妨碍派工」（[FUS:267](../../dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md#L267)）。路由方案还会打破 spec-v1.1 的「无新路由」收口锚点（[spec-v1.1 §7.2：412–423](../spec-v1.1.md#L412-L423)）。
- B 的反例：Fusion 已把 [DNPR] 定位为「回答具体做了什么」的一方（[FUS:360](../../dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md#L360)），验收要求行归因 100% 一致（[:349](../../dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md#L349)）。如果每个消费者都自己解析事件流，同一事实会出现多个口径，不符合单一真源（[仓规:42](../../../../AGENTS.md#L42)），也让 `T-O-1` 的「通用消费基座」落空。
- 诚实代价：A 让视图字段成为公共合同，后续改字段要守「只追加、破坏性变化升 `v` 硬切」的规则。这是公开带来的成本，用演进规则约束，而不是靠不公开来回避。

## 3. ★ 中场评估 I（Round 1 → Round 2）

- **3.1 判定**：Q1、Q2 均获 [业主] 无附加条件的 A 答复（「业主同意你在 [第1轮] 的全部推荐」）。Q1 选的是推荐的新 key `nano-progress-report:ledger`，没有采用「沿用旧 key 并提升 `stateVersion`」的修订。两题合起来回答了「事实在哪里算」和「别人怎么读」：只算一份，只从宿主读面出去。
- **3.2 已锁定真相**：Q1 → `T-O-5`；Q2 → `T-O-6`。例如，任务 #2 在窗口外完成，Tasks 区仍能从账本拿到完成时刻；[DNMS] 想显示 Sidekick 改了哪些文件，就读 Sidekick 会话里账本 key 的值，[DNPR] 没装时降级显示。完整约束以 §1 对应行为准。
- **3.3 诚实反方**：硬切把「引入账本」和「PromptContext 换数据源」放进同一次发布，风险集中，验证也要在同一次发布内完成；公开合同让以后的字段改动必须守「只追加、破坏性升 `v`」的规则。这两项是有意承担的成本：分两步走需要双写过渡，不公开会让每个消费者各算一套。
- **3.4 为什么注入 Round 2**：重新检索后发现两处由 `T-O-5/6` 留下的方向性空白。
  1. `T-O-5` 定了计算点，没有定「一项工作」以什么为单位。spec-v1.1 C1 原稿以 todo 任务为骨架（[spec-v1.1:318–320](../spec-v1.1.md#L318-L320)），但对生产桌面实例 325 份会话日志的只读统计显示：34 个顶层会话里只有 6% 的回合（113/1778）写过 `todo/write`；290 个子代理会话中只有 16% 用过 todo。以任务为骨架，绝大多数工作就没有挂靠点。→ Q3。
  2. `T-O-6` 明确把模型侧出口排除在外；`T-O-5` 只规定 PromptContext 改读账本，没规定模型看到什么、是否有按需拉取的通道。生产数据显示，现有进度锚在 7 个会话中写入了 106 份快照，平均 547 字节，接近 600 字节上限，其中 70 份（66%）与上一份相比只有路径行不同。→ Q4。

## 4. Round 2 —— foundational：进度的骨架单位与模型消费通道（Q3–Q4）

本轮 `retired`，[业主] 直答。Q3 决定账本以什么为「一项工作」组织事实；Q4 决定模型通过什么通道、在什么边界内读账本。Q4 的推送文本会用到 Q3 的单位，但本轮只定通道与边界，不定文本，所以两题可以独立作答。

**取证说明（`[PROD]`）**：2026-11-19 对 `~/.dsh-desktop/sessions/**/session.v4.jsonl.zstd` 共 325 份日志（顶层有回合的 34 份、子代理 290 份）做只读解码计数，统计脚本与原始输出不入库。这是计数统计，不是行为实验。

### Q3 — 账本的「一项工作」以什么为骨架：人类指令、todo 任务、回合，还是新建模型声明的里程碑？

**驱动真相**：`T-O-5`（账本是唯一计算点，补跨回合任务史与证据区间）、`T-O-1`（回答「做到哪了」）、`T-O-3`（时间线已按指令分组）、`T-O-4`。来源：[spec-v1.1 C1 推导规则：314–322](../spec-v1.1.md#L314-L322)。

- **影响范围**：账本的结构与有界策略、证据区间的归属方式、Tasks 区与时间线如何对上、`T-O-6` 公开视图的主干字段，以及子代理会话的账本形态。
- **为什么必须确认**：「做到哪了」必须有一个「哪」。spec-v1.1 原稿只认 todo 任务：任务身份按 `content`，证据只在恰好一个任务进行中时归属（[spec-v1.1:318–320](../spec-v1.1.md#L318-L320)）。但 todo 是模型自愿使用的工具，生产里绝大多数回合没有它（见 3.4）。骨架选错，公开视图的主干字段就会建在一个多数会话为空的结构上，以后只能破坏性升 `v`。
- **当前建议 / 倾向**：选 **A**：人类指令（prompt）与 goal 是一级工作项，覆盖每个会话；todo 任务是挂在所属工作项下的可选二级细分。
- **Reasoning**：每个回合都由人类指令、goal 轮次或代理消息开启，时间线也已经按这条规则分组（[group.js:10–13](../../../../dsh-nano-progress-report/src/client/group.js#L10-L13)）。让账本用同一骨架，人看到的时间线和账本事实能一一对上；有 todo 时再细分到任务，没有 todo 时也不至于空白。
- **问题（请 [业主] 裁决）**：是否以人类指令与 goal 作为账本的一级工作项、todo 任务作为可选二级，并且工作项状态只陈述可证的结束方式、不推断「已完成」？请选择 A/B/C/D，或给出修订。
- **[业主]回答**：已确认 A（2026-11-19：「业主同意你在 [第2轮] 的全部推荐」），冻结为 `T-O-7`。

**【对本问题的解读】**　例：会话里先后有三条人类指令；第二条指令下模型写了 4 项 todo，完成 2 项；第三条指令没有用 todo。按推荐，账本有三个工作项：第一、三项各带自己的文件、失败、等待事实；第二项另外挂着 4 个任务及其完成时刻。账本不替指令判定「做完了」，只陈述「最后一个回合以 completed / aborted / error 结束」「还有 1 个未解决失败」这类可从事件得出的事实；goal 是否完成，读官方 goal owner。本题定骨架和状态口径，不定字段名、保留条数、指令识别的具体规则或模型文本。

**【可选选项清单】**

| 选项 | 一级骨架 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 人类指令与 goal 为一级工作项；todo 任务为可选二级；事实先归属工作项，恰有一个任务进行中时再归属该任务。 | 每个会话都有骨架，与时间线分组一致；工作项数量随指令线性增长，需要明确的保留上限。 |
| B | todo 任务为唯一骨架（spec-v1.1 C1 原稿）。 | 结构最简单，任务语义清楚；生产中只有 6% 的顶层回合有任务，多数工作没有挂靠点。 |
| C | 回合（turn）为骨架。 | 边界完全机械、确定；一个 goal 或一条指令可跨很多回合，顶层会话回合数中位数 12、p90 161，骨架只是更粗的流水。 |
| D | 新增模型可调用的里程碑声明（如 `progress_checkpoint`），以其为骨架。 | 语义最贴近「进度」；新增模型可见工具、改变模型合同，且依赖模型自愿调用，生产里模型连 todo 都很少用。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **工作项身份**：一条人类指令以其事件 seq 为身份；一个 goal 以 goal id 为身份，它的各轮次是该工作项内的进展（行模型见 [rows.js:115–133](../../../../dsh-nano-progress-report/src/client/rows.js#L115-L133)）。代理回报、子代理结束通知不新开工作项，挂到当时所属的工作项。身份只用 seq 或 id，不做文本匹配。
2. **识别指令看来源，不看角色**：运行时上下文快照也是 `user/message`（生产中 106 份进度锚全部以 `user/message` 落盘；其消息带 `source: {kind, form:'snapshot'}`，[runtime-context.ts:176–178](../../../../.dependencies/pinned/deepseek-harness/packages/core/agent-loop/src/runtime-context.ts#L176-L178)）。所以「人类指令」按消息来源判定，注入的结构化上下文按格式折叠（与 `T-O-3` 的人类视图规则一致），具体规则留给执行轮。
3. **状态只陈述事实**：工作项状态取自事件：进行中（回合未结束）、已结束及结束原因（最后一个 `turn/end` 的 reason）、等待中（未决审批或提问）、未解决失败的数量。对指令不推断「已完成」；goal 的阶段读官方 goal owner（[summary.js:2](../../../../dsh-nano-progress-report/src/host/summary.js#L2)、[:13](../../../../dsh-nano-progress-report/src/host/summary.js#L13)）。
4. **任务为二级**：任务挂在第一次列出它的 `todo/write` 所属的工作项下，跨回合保留（官方 `todos` 投影在下一回合清空，[tool-todo README:93](../../../../.dependencies/pinned/deepseek-harness/packages/todo/tool-todo/README.md#L93)）。任务身份沿用 `content`，`TodoItem` 只有 `content` 和 `status`，不伪造 id（[AGENTS.md:151](../../../../dsh-nano-progress-report/AGENTS.md#L151)）。证据先归属工作项；恰有一个任务进行中时同时归属该任务，否则不归属任务。
5. **有界**：工作项随指令线性增长，按官方规范需要明确上限（[SKILL.md:22](../../../../.dependencies/pinned/deepseek-harness/.agents/skills/dsh-session-projection/SKILL.md#L22)）：最近若干项保留完整事实，更早的只留计数，并在视图中标明覆盖范围。具体条数留给执行轮。
6. **子代理会话**同样适用：它的一级工作项就是被委派的那条指令；多会话的汇总由消费者经 `T-O-6` 的读面完成，账本不跨会话。

**【推荐选项支持证据或其他选项的反例】**

- B 的反例：`[PROD]` 中 34 个顶层会话有 56% 用过 todo，但写过 `todo/write` 的回合只占 6%（113/1778）；290 个子代理会话只有 16% 用过 todo。todo 是模型自愿使用、单一 owner 的工具，官方明确没有共享或跨代理列表的设计（[tool-todo README:169](../../../../.dependencies/pinned/deepseek-harness/packages/todo/tool-todo/README.md#L169)）。只认任务，账本对多数工作给不出任何结构。
- A 的支持：时间线已按「人类指令或 goal 轮次开组、代理消息只在无回合进行时开组、`turn/end` 收组」分组（[group.js:10–13](../../../../dsh-nano-progress-report/src/client/group.js#L10-L13)、[:114–146](../../../../dsh-nano-progress-report/src/client/group.js#L114-L146)）。账本采用同一骨架，`T-O-3` 的人类视图与 `T-O-5` 的事实一一对应，不会出现「时间线一套分组、账本另一套」。`[PROD]` 中 50% 的顶层会话使用过 goal（共 225 条 `goal/change`），goal 作为一级工作项有实际负载。
- C 的反例：回合是执行机制的边界，不是意图的边界。顶层会话回合数中位数 12、p90 161、最大 337；以回合为骨架只是把流水分得更粗，与 `T-O-2`「不能发展成另一个轨迹」相抵触。
- D 的反例：新增模型可调用工具属于模型可见合同变化，必须有会话事件并由 [业主] 单独裁决（[EV5 CLAUDE.md:138](../../../../.dependencies/pinned/deepseek-harness/CLAUDE.md#L138)）；骨架还取决于模型是否自愿调用，而生产中模型连 todo 都很少用。spec-v1.1 也已把它列为 v1.2 候选（[附录 B](../spec-v1.1.md#L468-L475)）。

### Q4 — 模型通过什么通道读账本：推送锚加只读拉取、只推送、只拉取，还是不面向模型？

**驱动真相**：`T-O-5`（PromptContext 改读账本）、`T-O-6`（模型侧出口不在公开读合同内）、`T-O-2`（原始数据归 Trajectory）、`T-O-4`。来源：[spec-v1.1 C4：360–368](../spec-v1.1.md#L360-L368)、[C5：370–378](../spec-v1.1.md#L370-L378)、[R2/R3：461–462](../spec-v1.1.md#L461-L462)。

- **影响范围**：每次模型请求的 token 与 KV 缓存、压缩后的连续性、模型可见合同（工具名、schema、描述），以及包内 `AGENTS.md` 的 Model Experience 说明。
- **为什么必须确认**：[DNPR] 现在是生产中唯一面向模型的进度来源：Trajectory 对模型完全不可见（[ui-trajectory README:99](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-trajectory/README.md#L99)）。现有推送锚却在抖动：`[PROD]` 中 106 份快照有 70 份只是路径行变了，每一份都作为一条消息写进日志并进入后续请求。新增模型工具属于模型可见合同变化，按仓规必须由 [业主] 先定（[仓规:44](../../../../AGENTS.md#L44)）。
- **当前建议 / 倾向**：选 **A**：推送一个小而稳定的定向锚，只在状态类别变化时改写；另提供一个只读拉取工具，按需返回账本切片。两条通道都只读账本，不提供 skill。
- **Reasoning**：推送是唯一能自动穿过压缩的通道：宿主在内容变化或被压缩移除时重写快照，并声明它取代旧版本和摘要里的旧内容。但推送越详细越抖，每次抖动都是一条入账消息。把「我在哪、有没有卡住」留在推送里，把「哪个文件、哪次失败、证据在哪」放进按需拉取，两种成本各自最小。
- **问题（请 [业主] 裁决）**：是否让模型通过「稳定的推送锚 + 只读拉取工具」两条通道读账本，同一次发布退役推送中的最近路径列表，本阶段不注册 skill？请选择 A/B/C/D，或给出修订。
- **[业主]回答**：已确认 A（2026-11-19：「业主同意你在 [第2轮] 的全部推荐」），冻结为 `T-O-8`。

**【对本问题的解读】**　例：模型在长会话里经历了两次压缩，摘要里只剩散文。按推荐，压缩后第一次请求仍带着定向锚，比如「当前工作项进行中、任务 2/4、1 个未解决失败」；模型需要知道失败落在哪个命令、出现过几次时，调用只读工具取这一片事实。推送锚不再列最近文件，所以模型连续改文件不会触发重发。本题定通道与边界；锚的具体字段、工具名、参数 schema 和返回上限留给执行轮。

**【可选选项清单】**

| 选项 | 模型通道 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 推送：只含定向事实、仅在类别变化时改写的锚；拉取：一个只读工具，返回带 seq 指针的账本切片；不注册 skill。 | 压缩后仍有定向，细节按需取，抖动和请求体积都受控；新增一个模型可见工具，需要锁定其文本并说明 token/KV 影响。 |
| B | 只推送：在锚里加入当前任务正文、失败位置等细节，不新增工具。 | 不扩模型工具面；锚变大、变化更频繁，600 字节上限下还要取舍，抖动加剧。 |
| C | 只拉取：退役 PromptContext，模型需要时调用工具。 | 请求最省；压缩后没有任何东西提醒模型去取，官方 todo 也在下一回合清空，模型容易失去方向。 |
| D | 不面向模型：退役 PromptContext，[DNPR] 只服务人和插件。 | 零模型成本；放弃生产中已经在用的唯一模型消费者。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **推送**：保留 PromptContext 注册（`order:180`、`required:false`，宿主抑制可选上下文时不出现，[host/index.js:14–20](../../../../dsh-nano-progress-report/src/host/index.js#L14-L20)、[system-prompt.md:96](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/system-prompt.md#L96)）。内容只取账本的定向事实：当前工作项状态、当前任务、未解决失败与待处理项的数量或类别。只有这些类别变化时文本才变，单次文件写入不触发改写。同一次发布删除「Recent file-tool paths」行（[context.js:18–30](../../../../dsh-nano-progress-report/src/host/context.js#L18-L30)），不留兼容格式。字节上限作用在完整文本上，沿用 600 字节（[context.js:1](../../../../dsh-nano-progress-report/src/host/context.js#L1)；[packages/CLAUDE.md:18](../../../../.dependencies/pinned/deepseek-harness/packages/CLAUDE.md#L18)）。
2. **拉取**：经 `ctx.tools.register` 注册一个只读工具（[tools.md:662](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/tools.md#L662)），用 `when` 只在当前会话账本有内容时出现（先例：[DNMSC] [inspect-checkpoint.js:243–244](../../../../dsh-nano-model-selector-compaction/lib/inspect-checkpoint.js#L243-L244)）。返回有界的账本切片，带 seq 指针，不含命令、输出或 reasoning（与 `T-O-2/6` 一致）。工具调用与结果本身就是会话事件，满足「模型可见 ⟺ 写入日志」（[EV5 CLAUDE.md:138](../../../../.dependencies/pinned/deepseek-harness/CLAUDE.md#L138)）。
3. **措辞**：推送与工具文本都从模型视角写，只用任务概念，不出现 UI、投影或传输词汇（[packages/CLAUDE.md:15](../../../../.dependencies/pinned/deepseek-harness/packages/CLAUDE.md#L15)）；推送保持「观察到的事实，不是指令」的定位（[context.js:2](../../../../dsh-nano-progress-report/src/host/context.js#L2)）。固定文本由单测逐字锁定。
4. **不注册 skill**：skill 一旦注册，名字和描述就进入每个会话的模型可见目录（[skills.md:94–102](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/skills.md#L94-L102)）。交接、写 PR 描述等用法由只读工具支撑，不另加目录条目；需要时再单独提出。
5. **文档**：包内 `AGENTS.md` 增加 Model Experience，写明推送锚与工具对 token、KV 缓存的影响。

**【推荐选项支持证据或其他选项的反例】**

- 推送的抖动成本有实测：`[PROD]` 中 7 个会话写入 106 份进度锚，平均 547 字节，其中 70 份（66%）与上一份只差路径行。宿主只在快照内容变化或被压缩移除时写入（[system-prompt.md:78](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/system-prompt.md#L78)、[runtime-context.ts:164–167](../../../../.dependencies/pinned/deepseek-harness/packages/core/agent-loop/src/runtime-context.ts#L164-L167)），所以去掉路径行、只在类别变化时改写，能直接减少入账消息数。B 往锚里加更多细节，方向正相反。
- C 的反例：推送快照会声明「取代早先版本，包括对话摘要中保留的版本」（[runtime-context.ts:170](../../../../.dependencies/pinned/deepseek-harness/packages/core/agent-loop/src/runtime-context.ts#L170)），这是唯一能自动穿过压缩的通道。只留拉取，压缩后模型没有提示可依；官方 `todos` 投影还会在下一回合清空（[tool-todo README:93](../../../../.dependencies/pinned/deepseek-harness/packages/todo/tool-todo/README.md#L93)）。
- D 的反例：Trajectory 不向模型注册任何东西（[ui-trajectory README:99](../../../../.dependencies/pinned/deepseek-harness/packages/client/ui-trajectory/README.md#L99)），退役推送后模型没有任何进度来源；而 `[PROD]` 显示已有 7 个会话在实际使用进度锚。
- 只读工具在本仓有先例：[DNMSC] 的 `inspect_checkpoint` 只读、只看本会话、无持久状态，并按会话条件出现（[inspect-checkpoint.js:1–9](../../../../dsh-nano-model-selector-compaction/lib/inspect-checkpoint.js#L1-L9)、[:243–244](../../../../dsh-nano-model-selector-compaction/lib/inspect-checkpoint.js#L243-L244)）。
- 诚实代价：A 新增一个模型可见工具，其名称、描述和 schema 会出现在每次请求的工具列表里（在会话内是静态的，不随进度变化），并成为需要逐字锁定的模型合同。这是本题请 [业主] 裁决的原因。

## 5. ★ 中场评估 II（Round 2 → Round 3）

- **5.1 判定**：Q3、Q4 均获 [业主] 无附加条件的 A 答复（「业主同意你在 [第2轮] 的全部推荐」）。foundational 两轮四题全部冻结：事实只在宿主算一份（`T-O-5`），只从宿主读面公开（`T-O-6`），以工作项为骨架（`T-O-7`），模型经推送锚加只读工具读取（`T-O-8`）。自本轮起进入 executional，每轮三题。
- **5.2 已锁定真相**：Q3 → `T-O-7`；Q4 → `T-O-8`。例如，一条人类指令下写了 4 项 todo，账本把这 4 项挂在该指令的工作项下，Tasks 区据此显示跨回合的完成时间；压缩后的第一次请求仍带着「当前工作项进行中、任务 2/4」这类定向锚，模型要细节时调用只读工具。完整约束以 §1 对应行为准。
- **5.3 诚实反方**：工作项随指令线性增长，账本要第一次面对「有界」与「公开合同」同时成立的问题；只读工具让模型可见合同多一项。重新取证还暴露了一个 foundational 阶段没有看清的事实：现行的「未解决失败」口径在生产中大量漂移（见 Q6），沿用它会让 `T-O-8` 的推送锚长期报告过期的失败。
- **5.4 为什么注入 Round 3**：三条出口（`T-O-6` 视图、`T-O-8` 推送与拉取、Tasks 区）都消费同一份账本，账本的计算规则必须先于出口定稿。重新检索后发现三处空白，都要在写代码前定死。
  1. `T-O-7` 说「识别看 source」，但 source 是可合并扩展的类型，生产中出现了 18 种 kind，其中 `schedule` 投递开启的 57 个回合不在「人类指令或 goal」之内；官方 `turnOutline` 投影已经保存每回合首条人类提示。→ Q5。
  2. `T-O-5/7` 要求账本报告「未解决失败」，现行规则只看 bash、整会话范围；生产中 78% 的 bash 失败从未被同一命令成功重试，14/44 份顶层日志在会话结束时仍挂着过期失败；待决提问另有官方 owner。→ Q6。
  3. `T-O-5/6/7` 都要求有界，但没有数值。视图每次变化都整份推送，上限同时决定推送体积和公开合同的形态。→ Q7。

## 6. Round 3 —— executional：账本的计算规则（Q5–Q7）

本轮 `retired`，[业主] 直答。三题都在 `T-O-5`–`T-O-7` 之下：Q5 定哪条消息开启工作项，Q6 定失败与等待怎样算，Q7 定整份账本怎样有界。Q7 的体积模拟按 Q5、Q6 的推荐规则回放；如果 Q5、Q6 选了别的选项，数值会小幅变化，结构结论不变。三题可以独立作答。

**取证说明（`[PROD]` 复采）**：2026-11-19 再次只读解码 `~/.dsh-desktop/sessions/**/session.v4.jsonl.zstd`，共 334 份日志（顶层 44 份，其中按 Q5 推荐规则得出工作项的 37 份；子代理 290 份）。样本比 Round 2 多 9 份，是期间新写入的日志。统计脚本与原始输出不入库。这是计数和离线模拟，不是行为实验。

### Q5 — 哪些消息开启一个工作项：开项来源用白名单还是排除名单，`schedule` 投递是否成项，账本是否复制提示文本？

**驱动真相**：`T-O-7`（识别看 source、指令以 seq 为身份）、`T-O-5`（官方已有 owner 的事实不重算）、`T-O-6`（视图只含派生事实与 seq 指针，任务正文是唯一的原样文本）、`T-O-4`。

- **影响范围**：工作项列表的每一行、`T-O-6` 视图的主干、Tasks 区与时间线的对齐、子代理会话的账本，以及推送锚里的「当前工作项」指哪一项。
- **为什么必须确认**：`MessageSourceMap` 可合并扩展，每个生产者在自己的模块里声明 kind，消费者必须放行不认识的 kind（[message.ts:103–115](../../../../.dependencies/pinned/deepseek-harness/packages/llm/llm/src/message.ts#L103-L115)）。`[PROD]` 中 `user/message` 出现了 18 种 kind；在顶层会话里，一个回合的第一条开启消息是：`user` 1319 次、`goal` 305 次、`schedule` 57 次、`agent-message` 49 次、`subagent-settled` 31 次，另有 `tool-jobs`、`user-approval`、`compaction-adoption-wake`、`working-directory` 共 24 次。`T-O-7` 只点名「人类指令与 goal」，没有说 `schedule` 投递算什么，也没有说新出现的 kind 默认怎么处理。另外，官方 `turnOutline` 投影已经按回合保存首条人类提示的预览（[projection.ts:106–116](../../../../.dependencies/pinned/deepseek-harness/packages/session/session-turn-outline/src/projection.ts#L106-L116)），账本如果再存一份提示文本，同一事实就有了两份。
- **当前建议 / 倾向**：选 **A**：`user`、`goal`、`schedule` 三种 kind 构成唯一的开项白名单，其余 kind 一律挂靠当前工作项；同回合内后续的人类消息不另开项；账本只存 seq 与回合号，不复制提示或 goal 目标文本。
- **Reasoning**：白名单让账本对宿主新增的 kind 保持不变，不必跟着宿主改代码。`schedule` 是一条事先写好、按时投递的指令，挂到前一条人类指令下会把无关的工作算进去，还会改写前一项的结束原因。提示文本已有官方 owner，账本只存能关联过去的指针。
- **问题（请 [业主] 裁决）**：是否以 `user`、`goal`、`schedule` 为唯一的开项白名单（其余 kind 挂靠当前工作项），同回合后续人类消息不另开项，账本只存 seq 与回合号、不复制提示或 goal 目标文本？请选择 A/B/C/D，或给出修订。
- **[业主]回答**：已确认 A（2026-11-19：「业主同意你在 [第3轮] 的全部推荐」），冻结为 `T-O-9`。

**【对本问题的解读】**　例：人类发出「修复登录超时」开启一个回合，回合中途又补了一句「顺便看看注册」；回合结束后，后台子代理的回报唤醒了下一个回合；第二天，定时任务投递「跑一遍夜间回归」。按推荐，账本有两个工作项：第一项是那条人类指令，中途补充和子代理唤醒的回合都挂在它下面；第二项是 schedule 投递。浏览器要显示第一项的标题时，按回合号去官方 `turnOutline` 取提示预览。本题定开项规则与文本归属，不定字段名和上限。选 A 等于在 `T-O-7` 的「人类指令与 goal」之外显式加入 `schedule`，冻结时一并写入台账。

**【可选选项清单】**

| 选项 | 开项规则 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 白名单 `user`（含子代理会话里被委派的提示）、`goal`（新 goal id 才开新项，同 id 的轮次并入）、`schedule`；每回合只认第一条命中白名单的消息；其他 kind（含 `retry`、注入上下文、代理消息和任何未来新 kind）挂靠当前项；首个工作项之前的事实只计入视图顶层的未归属计数。账本不复制提示和 goal 目标文本。 | 宿主新增 kind 时无需维护；与官方 `turnOutline` 口径一致；定时任务有自己的项。需要扩充 `T-O-7` 的开项范围。 |
| B | 白名单只有 `user` 与 `goal`（`T-O-7` 字面）；`schedule` 开启的回合挂靠前一项。 | 不扩充 `T-O-7`；第二天的定时任务会算进前一天的指令，前一项的结束原因也被改写。 |
| C | 排除名单：除已知的上下文 kind（runtime-context、time-context、skill-catalog 等）外，回合首条消息都开项。 | 代理消息唤醒也成项，覆盖最广；宿主每新增一种上下文 kind 就会误开项，必须跟着改代码。 |
| D | 同 A，但账本复制提示预览与 goal 目标文本，消费者不必再去关联。 | 消费者最省事；同一预览出现两份口径，违背单一真源和 `T-O-6`「只有任务正文是原样文本」。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **开项判定**：回合打开期间（`turn/start` 之后、`turn/end` 之前），第一条 `source.kind` 属于 `user`、`goal`、`schedule` 的 `user/message` 决定该回合归属。`user` 与 `schedule` 开新项；`goal` 的 goal id 与当前项相同时并入，否则开新项。同回合后续的同类消息不再开项，与 `turnOutline` 只取首条人类提示一致（[projection.ts:107–112](../../../../.dependencies/pinned/deepseek-harness/packages/session/session-turn-outline/src/projection.ts#L107-L112)）。
2. **挂靠**：没有命中白名单的回合（代理消息、子代理结束通知、job 唤醒、`retry`、未知 kind）及其事实，挂到当前工作项（`T-O-7`）。
3. **身份与指针**：指令项与 schedule 项以开项消息的 seq 为身份；goal 项以 goal id 为身份，并记首轮 seq。每项记录所跨的回合号区间，消费者用回合号与 `turnOutline` 的 `turn`、`seq` 关联取提示预览（[types.ts:16–25](../../../../.dependencies/pinned/deepseek-harness/packages/session/session-turn-outline/src/types.ts#L16-L25)）。goal 目标读官方 `goal` 投影，它的视图只含当前 goal（[goal index.ts:163](../../../../.dependencies/pinned/deepseek-harness/packages/goal/goal/src/index.ts#L163)）；已结束 goal 的目标由时间线的 goal-change 行展示，账本不存。
4. **未归属**：首个工作项之前出现的事实只计入视图顶层的未归属计数，不伪造工作项；fork 继承段仍按 `inherited` 排除（[projection.js:47](../../../../dsh-nano-progress-report/src/host/projection.js#L47)）。
5. **子代理会话**：被委派的提示以 `{kind:'user'}` 投递（[manager.ts:411](../../../../.dependencies/pinned/deepseek-harness/packages/subagent/subagent/src/manager.ts#L411)），自然成为该会话的首个工作项，不需要特判。
6. **时间线同口径**：浏览器分组目前只让 `prompt`、`goal` 行开组（[group.js:15](../../../../dsh-nano-progress-report/src/client/group.js#L15)），提示行只认 `user`、`goal`（[events/message.js:12–16](../../../../dsh-nano-progress-report/src/client/events/message.js#L12-L16)）。同一次发布让 `schedule` 也开组，开项判定放进 `src/shared/` 与账本共用，不留两套口径。

**【推荐选项支持证据或其他选项的反例】**

- A 的支持：source 类型的约定就是「消费者放行未知 kind」（[message.ts:107–108](../../../../.dependencies/pinned/deepseek-harness/packages/llm/llm/src/message.ts#L107-L108)）。`[PROD]` 的 18 种 kind 里，十余种是上下文或唤醒来源（time-context、agent-instructions、skill-catalog、tool-jobs、model-selection、working-directory、compaction-adoption-wake 等）。白名单对它们一律放行。按已知上下文 kind 写的排除名单（C），在这份样本上仍会让 `tool-jobs`、`user-approval`、`compaction-adoption-wake`、`working-directory` 这 4 种上下文或唤醒消息误开 24 个工作项。
- `schedule` 的依据：Schedule 以 `schedule` kind 入队投递（[schedule/AGENTS.md:10](../../../../.dependencies/pinned/deepseek-harness/packages/schedule/AGENTS.md#L10)、[runtime.ts:5–9](../../../../.dependencies/pinned/deepseek-harness/packages/schedule/schedule/src/runtime.ts#L5-L9)），web-app bundle 已装配它（[web-app/cordis.patch.yml:136](../../../../.dependencies/pinned/deepseek-harness/packages/bundle/web-app/cordis.patch.yml#L136)）。`[PROD]` 中 57 个回合由它开启，约占顶层回合的 3%；B 会把这些工作并进前一条人类指令。
- 与官方同口径：`turnOutline` 由 web-app bundle 装配（[web-app/cordis.patch.yml:104](../../../../.dependencies/pinned/deepseek-harness/packages/bundle/web-app/cordis.patch.yml#L104)），只从 `user` kind 取提示（[projection.ts:110](../../../../.dependencies/pinned/deepseek-harness/packages/session/session-turn-outline/src/projection.ts#L110)），同回合后续的人类消息不覆盖首条。`[PROD]` 顶层有 81 条回合中途的人类消息，按 A 都不开新项，与 `turnOutline` 的回合划分一致。
- D 的反例：`turnOutline` 的提示预览上限是 50 个字符（[projection.ts:29](../../../../.dependencies/pinned/deepseek-harness/packages/session/session-turn-outline/src/projection.ts#L29)），账本另存一份会出现两种截断口径；`T-O-6` 只允许任务正文作为原样文本。
- C 的反例：排除名单要求 [DNPR] 跟踪宿主所有上下文 kind，每次宿主升级都可能误开项，与 `T-O-4` 的长期治理相抵触。

### Q6 — 失败怎样算「已恢复」、在什么范围内算，待处理项哪些由账本计算？

**驱动真相**：`T-O-7`（状态只陈述可证事实，未解决失败数是工作项状态）、`T-O-5`（账本补未解决失败与待处理项；官方已有 owner 的不重算）、`T-O-3`（时间线「失败 k 次后通过」、未恢复失败升 A 层，指纹经 `src/shared/` 共用）、`T-O-8`（推送锚含未解决失败与待处理项）。

- **影响范围**：工作项状态、推送锚的失败计数、时间线 A 层的红字行、只读工具返回的失败切片，以及 `T-O-6` 视图中的失败与等待字段。
- **为什么必须确认**：现行规则只跟踪 bash，按命令指纹精确匹配恢复，范围是整个会话，只留最近 8 条（[projection.js:3–4](../../../../dsh-nano-progress-report/src/host/projection.js#L3-L4)、[:76–80](../../../../dsh-nano-progress-report/src/host/projection.js#L76-L80)）。`[PROD]` 显示这个口径会漂移：44 份顶层日志里有 14 份在会话结束时仍挂着未恢复的 bash 失败，其中 5 份顶到 8 条上限；bash 失败中 78%（306/394）从未被同一命令成功重试，多数是模型换了做法，并非仍然卡住。文件工具失败 276 次、其他工具失败 254 次，现行规则都不计。待处理项方面，`ask_user_question` 已有官方 `userQuestions` 投影；审批没有官方的待决投影。
- **当前建议 / 倾向**：选 **A**：所有工具都记录失败；按共享指纹在同一工作项内判定恢复；未恢复失败作为所属项的历史事实保留，「当前」只看当前项；待决提问读官方 `userQuestions`，账本只配对审批。
- **Reasoning**：同一指纹后来成功，是唯一不需要推断的恢复证据。把范围收进工作项后，旧项的失败成为它自己的历史事实，不再污染「当前」。官方已经算好的待决提问直接读，账本只补官方没有的审批配对。
- **问题（请 [业主] 裁决）**：是否对全部工具记录失败，按共享指纹（bash 命令指纹、文件路径、其他工具的规范化参数摘要）在同一工作项内判定恢复，未恢复失败保留在所属项、「当前」只看当前项；待决提问读官方 `userQuestions`，账本只配对审批？请选择 A/B/C/D，或给出修订。
- **[业主]回答**：已确认 A（2026-11-19：「业主同意你在 [第3轮] 的全部推荐」），冻结为 `T-O-10`。

**【对本问题的解读】**　例：工作项 1 里，`npm test` 失败两次后通过；`edit src/a.ts` 失败一次，随后对同一路径 `write` 成功；`web_fetch` 某个 URL 失败后，模型改去搜索别的。工作项 2 开始后没有任何失败。按推荐，工作项 1 记录三个失败指纹，两个已恢复，web_fetch 那个未恢复，该项如实写「1 个未恢复失败」；工作项 2 期间推送锚显示 0，因为「当前」只看当前项。时间线上，`npm test` 显示「失败 2 次后通过」，web_fetch 升为 A 层红字行。本题定失败的身份、恢复证据、判定范围和待处理项来源，不定字段名和锚文本。

**【可选选项清单】**

| 选项 | 恢复与范围 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 全部工具记失败；共享指纹：bash 用现行命令指纹，文件工具用路径（write、edit、apply_patch 归一），其他工具用工具名加规范化参数摘要；同一工作项内同指纹后来成功即恢复；未恢复失败留在所属项，「当前」只看当前项。提问读 `userQuestions`，审批由账本配对。 | 恢复证据不含推断；旧失败不漂移；文件失败纳入。其他工具很少被原样重试，`[PROD]` 中约 13% 的工作项结束时带未恢复失败，这是如实的结果。 |
| B | 同 A，但其他工具按工具名恢复：任一同名调用成功即算恢复。 | 带未恢复失败的工作项降到约 9%；`read a` 失败、`read b` 成功也算恢复，属于推断，违背 `T-O-7`。 |
| C | 维持现状：只跟踪 bash、整会话范围、最近 8 条。 | 改动最小；漂移（14/44 份日志遗留）和漏计文件、其他工具失败都保留下来。 |
| D | 不判定恢复，只计失败次数。 | 最简单；回答不了「卡在哪」，时间线的「失败 k 次后通过」与账本口径不一致。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **共享指纹**：`src/shared/` 中一个纯函数，宿主账本与浏览器的精简分层（`T-O-3`）共用。bash 指纹就是现行 `bashKey`（[projection.js:32–43](../../../../dsh-nano-progress-report/src/host/projection.js#L32-L43)），按 [spec-v1.1 C7-02](../spec-v1.1.md#L396) 移入 `src/shared/`；后台运行的 bash 不产生指纹，沿用现状（[:36](../../../../dsh-nano-progress-report/src/host/projection.js#L36)）。apply_patch 涉及多个路径时，每个路径各算一个指纹。
2. **失败判定**：沿用宿主语义，`message.isError === true` 或 `data.error != null` 才是失败（[projection.js:75](../../../../dsh-nano-progress-report/src/host/projection.js#L75)）；非零退出码不算失败（[[NPR] AGENTS.md「不要」](../../../../dsh-nano-progress-report/AGENTS.md)）。bash 成功要算恢复，仍需通过现行的终态检查（[projection.js:96–103](../../../../dsh-nano-progress-report/src/host/projection.js#L96-L103)）。
3. **范围**：失败与恢复都在所属工作项内判定。新工作项开始后，前一项的未恢复失败冻结为该项的历史事实，不再计入「当前」，后续项里的成功也不会把它改成已恢复。goal 项跨多个回合，跨轮次的恢复照常生效。
4. **与时间线的分工**：时间线的 A 层「未恢复失败」与「失败 k 次后通过」使用同一指纹，作用范围是时间线分组（按回合，`T-O-3`）；goal 项跨回合的恢复由账本陈述，时间线不另外推导。
5. **待处理项**：提问读官方 `userQuestions` 的 `active`（[types.ts:117–122](../../../../.dependencies/pinned/deepseek-harness/packages/interaction/user-questions/src/types.ts#L117-L122)）。审批只会在回合打开期间发生（[user-approval index.ts:246](../../../../.dependencies/pinned/deepseek-harness/packages/interaction/user-approval/src/index.ts#L246)），账本按 id 配对 `approval/asked` 与 `approval/decided`，回合结束时仍未决的关闭。jobs 与子代理继续读 `ctx.jobs`、`ctx.agents`（[summary.js:14–22](../../../../dsh-nano-progress-report/src/host/summary.js#L14-L22)），不进账本。
6. **有界**：每个工作项的失败指纹数受 Q7 的上限约束。

**【推荐选项支持证据或其他选项的反例】**

- 精确指纹的恢复率（顶层会话，按失败事件计）：

  | 工具族 | 失败次数 | 同一工作项内恢复 | 后续工作项才恢复 | 从未恢复 |
  |---|---|---|---|---|
  | bash | 394 | 78 | 10 | 306 |
  | 文件工具（按路径） | 276 | 236 | 9 | 31 |
  | 其他工具（按参数摘要） | 254 | 7 | 8 | 239 |

  文件工具失败 86% 在同一工作项内恢复，说明按路径判定恢复是可靠的信号，现行规则却完全不计。跨工作项才恢复的只有 27 次，收窄到工作项内几乎不丢真实恢复。
- 按工作项内的去重指纹计：A 规则下 1451 个工作项中有 195 个（13.4%）结束时带未恢复失败；B 规则下是 137 个（9.4%）。B 少掉的部分来自其他工具按名字恢复，而失败最多的其他工具是 grep 44、read 31、web_fetch 18、subagent 14 次：对 `read` 来说，换一个文件读成功不能证明原来那次失败已经解决。
- C 的反例：现行推送锚的措辞是「没有成功匹配重试的最近 Bash 失败」（[context.js:16](../../../../dsh-nano-progress-report/src/host/context.js#L16)），措辞本身如实，但范围是整会话，`[PROD]` 中 14/44 份顶层日志在会话结束时仍挂着过期失败，5 份顶满 8 条。按 `T-O-8`，这个计数会进入每个会话的推送锚。
- 官方 owner：`userQuestions` 是带 `wire` 的官方投影（[projection.ts:317](../../../../.dependencies/pinned/deepseek-harness/packages/interaction/user-questions/src/projection.ts#L317)、[:329](../../../../.dependencies/pinned/deepseek-harness/packages/interaction/user-questions/src/projection.ts#L329)），base bundle 装配（[base/cordis.patch.yml:80](../../../../.dependencies/pinned/deepseek-harness/packages/bundle/base/cordis.patch.yml#L80)）；`approvalState` 只记策略和回合开闭（[user-approval index.ts:89–109](../../../../.dependencies/pinned/deepseek-harness/packages/interaction/user-approval/src/index.ts#L89-L109)），没有待决审批。按 `T-O-5`，前者直接读，后者由账本补。
- D 的反例：只计次数，`T-O-3` 的「失败 k 次后通过」与账本会出现两种口径，`T-O-7` 的「卡在哪」也无从回答。

### Q7 — 账本怎样有界：近期完整、较早降为骨架、更早并入累计，还是全量线性、只留近期，或做成可配置？

**驱动真相**：`T-O-6`（视图是公开合同，上限是合同的一部分，覆盖与截断必须如实标注）、`T-O-5`（状态有界，只存派生事实与指针）、`T-O-7`（工作项线性增长，须有上限并标明覆盖范围）、`T-O-4`。

- **影响范围**：每次视图推送的体积、checkpoint 的大小、Tasks 区能显示多早的完成时间、只读工具能回看多远，以及外部消费者对视图大小的预期。
- **为什么必须确认**：投影每次推送的都是完整值（[session-projection.md:108](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/session-projection.md#L108)、[:155](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/session-projection.md#L155)），账本视图每变一次（新文件、新失败、任务状态变化）都会整份推给浏览器。官方规范允许线性增长，但要求有当前用途并写明内存、回放和逐事件成本（[SKILL.md:22](../../../../.dependencies/pinned/deepseek-harness/.agents/skills/dsh-session-projection/SKILL.md#L22)）。`[PROD]` 37 个顶层会话：每会话工作项 p50 6、p90 119、最多 326；每项改动文件 p99 30、最多 71；失败指纹 p99 6、最多 20；任务 p99 13、最多 28；goal 项最多跨 70 个回合。视图在一个会话里变化 p50 86 次、p90 1113 次、最多 2611 次。
- **当前建议 / 倾向**：选 **A**：最近 16 个工作项保留完整事实，再往前 64 个降为骨架行，更早的并入累计计数；每项明细上限为文件 32、失败 16、任务 32；所有截断在视图中如实标注；上限作为 `v1` 合同常量登记，不做成配置。
- **Reasoning**：消费者最需要的是当前和最近的工作；较早的工作只需知道「有过、怎样结束」；再早的只需计数。在 `[PROD]` 上，三层方案把最坏的单次视图压到全量方案的约四分之一，并且只截断明细，近 80 个工作项的存在性都保留。
- **问题（请 [业主] 裁决）**：是否采用三层有界策略（最近 16 项完整、再 64 项骨架、其余并入累计），每项明细上限文件 32、失败 16、任务 32，截断如实标注，上限作为 `v1` 合同常量只登记在 `[NPR]/AGENTS.md`、不做成配置？请选择 A/B/C/D，或给出修订。
- **[业主]回答**：已确认 A（2026-11-19：「业主同意你在 [第3轮] 的全部推荐」），冻结为 `T-O-11`。

**【对本问题的解读】**　例：一个有 200 个工作项的长会话。按推荐，视图里最近 16 项带文件、失败、任务明细；第 17 到 80 项各有一行骨架（身份、类别、开项 seq、回合区间、结束原因、各类计数）；最早的 120 项只体现为一组累计数字。Tasks 区显示当前清单的完成时间，从最近项的任务明细里取；外部插件想知道「这个会话一共做了多少件事、最近几十件怎样结束」，读累计数字和骨架行。本题定有界结构、数值、截断表达和登记方式，不定字段名。

**【可选选项清单】**

| 选项 | 有界方式 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 三层：最近 16 项完整明细（文件 ≤ 32、失败 ≤ 16、任务 ≤ 32）；再 64 项骨架；其余累计。上限是 `v1` 合同常量。 | `[PROD]` 最坏单次视图约 31 KB；近 80 项可回看；更早项的明细只能回日志和 Trajectory 看。 |
| B | 全量线性（`turnOutline` 式）：每个工作项都保留完整明细，只有每项内部有上限。 | 历史最全；最坏单次视图约 122 KB，整会话累计推送最多约 148 MB。 |
| C | 只留最近 16 项完整明细，其余并入累计。 | 最省；第 17 项以前连「有过这件事」都看不到，只读工具和外部消费者无法回看任何早期工作。 |
| D | 同 A 的结构，但各上限做成 `Config` 字段。 | 部署可调；同一 `v` 的视图在不同部署下截断位置不同，消费者无法依赖，违背 `T-O-6` 的单一合同。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **三层内容**：完整层（最近 16 项）每项含文件（路径与最后 seq，≤ 32）、失败指纹（≤ 16）、任务（≤ 32），任一列表超限时保留最近的条目并记录总数。骨架层（再 64 项）每项含身份、类别、开项 seq、回合区间、结束原因，以及文件、失败、未恢复、任务四个计数。累计层只含项数和各类计数之和。
2. **确定性降级**：第 17 个新项开启时，最旧的完整项降为骨架；骨架超过 64 行时，最旧的一行并入累计。降级后的项不再接收更新；之后 `todo/write` 中再次出现同 `content` 的任务时，挂到当前项（`T-O-7` 的「首次列出」以仍在完整层的项为准）。
3. **覆盖标注**：视图顶层写明 `asOfSeq`、`inherited`、累计层覆盖到的最后 seq，以及各列表的截断计数。消费者据此如实说「更早的 N 项未展开」，不需要猜。
4. **合同常量**：16、64、32、16、32 这五个数属于 `v1` 公开合同（`T-O-6`），只登记在 `[NPR]/AGENTS.md` 的字段表；调整任何一个都是破坏性变化，升 `v` 并在同一次发布内硬切。它们是协议常量，不是部署可调项（[EV5 CLAUDE.md:144](../../../../.dependencies/pinned/deepseek-harness/CLAUDE.md#L144) 只要求部署相关的选择进 Config，协议常量保持固定）。
5. **状态与 checkpoint**：状态就是三层数据，加上当前回合的未配对调用缓冲（≤ 64，沿用 [projection.js:3](../../../../dsh-nano-progress-report/src/host/projection.js#L3)）。`parseState` 按白名单重建并拒绝超限集合（沿用 [projection.js:14–28](../../../../dsh-nano-progress-report/src/host/projection.js#L14-L28)）；`stateVersion` 从 1 开始。
6. **引用稳定**：无关事件返回同一个状态引用（[SKILL.md:18](../../../../.dependencies/pinned/deepseek-harness/.agents/skills/dsh-session-projection/SKILL.md#L18)），降级后的骨架行冻结复用，视图只在事实变化时重建，变化才推送（[session-projection.md:155](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/session-projection.md#L155)）。
7. **落地复测**：实现后用 `[PROD]` 复测视图体积、推送次数和最大会话的冷构建耗时（[spec-v1.1 C1-05](../spec-v1.1.md#L332)），只记录，不设闸门。

**【推荐选项支持证据或其他选项的反例】**

- 体积模拟（按 Q5、Q6 的推荐规则回放 37 个顶层会话；每项按 JSON 估算体积，键名与 16 位摘要是占位；推送次数按视图变化计，各方案相同）：

  | 方案 | 最终视图 p90 / 最大 | 整会话累计推送 p90 / 最大 |
  |---|---|---|
  | B：全量（每项完整明细） | 47.0 KB / 122.4 KB | 27.2 MB / 148.3 MB |
  | 全部骨架 + 最近 16 项完整（对照） | 26.2 KB / 44.6 KB | 15.7 MB / 64.3 MB |
  | **A：最近 16 项完整 + 再 64 项骨架 + 累计** | 17.5 KB / 31.2 KB | 15.7 MB / 39.1 MB |
  | C：只留最近 16 项 + 累计 | 14.1 KB / 28.3 KB | 11.2 MB / 27.5 MB |

  这些数字只用于比较方案，不是最终字段的实测。
- 每项上限对照分布：文件 32 覆盖 p99（30），失败 16 远高于 p99（6），任务 32 高于最大值（28）。只有少数极端工作项会触发截断，且截断会如实标注。
- B 的反例：`turnOutline` 能接受线性增长，是因为它每个回合最多推送三次（[README:47](../../../../.dependencies/pinned/deepseek-harness/packages/session/session-turn-outline/README.md#L47)），并把增长成本写进了已知限制（[README:112](../../../../.dependencies/pinned/deepseek-harness/packages/session/session-turn-outline/README.md#L112)）。账本视图在一个会话里变化 p90 1113 次，每次都整份推送，线性增长的成本被放大了上千倍。
- C 的反例：第 17 项以前的工作完全消失，`T-O-1` 的「做到哪了」只剩一个计数，`T-O-7` 要求的「早期项降级」变成了「早期项删除」。
- D 的反例：官方要求公开选择有证据，「可配置」本身不构成理由（[packages/CLAUDE.md:12](../../../../.dependencies/pinned/deepseek-harness/packages/CLAUDE.md#L12)）；上限可配置会让同一 `v` 有多种截断语义，违背 `T-O-6`。
- 上限作用在完整结果上（[packages/CLAUDE.md:18](../../../../.dependencies/pinned/deepseek-harness/packages/CLAUDE.md#L18)）：A 的每一层和每个列表都有明确上限，视图整体的最坏体积由这些上限决定。
- 诚实代价：A 的整会话累计推送 p90 仍约 15.7 MB。这是浏览器连接上的流量，只推给打开该会话的客户端，不进入模型请求，也不写入日志。若 [业主] 认为仍然偏大，可以修订为更小的完整层，但不建议为此拆成多个 key，那会让公开合同变成多份。

## 7. ★ 中场评估 III（Round 3 → Round 4）

- **7.1 判定**：Q5、Q6、Q7 均获 [业主] 无附加条件的 A 答复（「业主同意你在 [第3轮] 的全部推荐」）。账本的计算规则至此完整：哪条消息开项（`T-O-9`）、失败怎样算恢复（`T-O-10`）、整份账本怎样有界（`T-O-11`）。executional 第一轮收口。
- **7.2 已锁定真相**：Q5 → `T-O-9`；Q6 → `T-O-10`；Q7 → `T-O-11`。例如，第二天的定时任务「跑一遍夜间回归」自成一个工作项；工作项 1 中 `web_fetch` 失败后模型改用搜索，该项如实记「1 个未恢复失败」，工作项 2 期间推送锚显示 0；有 200 个工作项的长会话，视图只展开最近 16 项，再往前 64 项是骨架行，其余是累计数字。完整约束以 §1 对应行为准。
- **7.3 诚实反方**：全工具记失败后，`[PROD]` 约 13% 的工作项带未恢复失败，这是如实的结果，不是噪声；五个上限成为 `v1` 合同常量，以后调整只能升 `v`；整会话累计推送 p90 约 15.7 MB，只发生在浏览器连接上。
- **7.4 宿主基线迁移**：Round 3 冻结后，[业主] 把 `[EV5]` 从评估路径改登记为 pinned（同一提交 `9c2670d`，`dsh-v0.2.2-rc.5`）。本册与 spec-v1.1 的宿主链接已统一改到 `.dependencies/pinned/deepseek-harness/`，行号不变；宿主事实没有变化，已冻结的 `T-O` 不受影响。
- **7.5 为什么注入 Round 4**：账本「怎样算」已定，剩下「怎样出去、交付什么、怎样发布」。重新检索后发现三处空白：
  1. `T-O-8` 只定了通道，工具名、参数、返回上限、锚字段和措辞都未定。新取证有四个事实会改变设计。其一，进度锚不是单独一条消息：宿主把全部 PromptContext 拼成一份 runtime-context 快照，任一段变化都会整份重发（[agent.ts:452–474](../../../../.dependencies/pinned/deepseek-harness/packages/core/agent-loop/src/agent.ts#L452-L474)、[runtime-context.ts:164–179](../../../../.dependencies/pinned/deepseek-harness/packages/core/agent-loop/src/runtime-context.ts#L164-L179)），`[PROD]` 中整份快照 p50 1653 字节。其二，锚只在模型请求组装时求值，此时回合必然打开，审批在工具批次内等待（[user-approval index.ts:242–250](../../../../.dependencies/pinned/deepseek-harness/packages/interaction/user-approval/src/index.ts#L242-L250)），所以「已结束」和「待审批、待答」在锚里恒为空。其三，模型无法用 seq 读取日志，seq 对模型只能作为工作项句柄和引用。其四，goal 状态由官方 `get_goal` 与续跑提示提供（[goal README:140](../../../../.dependencies/pinned/deepseek-harness/packages/goal/goal/README.md#L140)），现行锚的 `Goal:` 行是重复。→ Q8。
  2. spec-v1.1 的 C2、C3、C6 与 R5、R6 没有被任何 `T-O` 覆盖。Fusion 文档要求在 `conversation.view` 里加分段控件（[FUS:416](../../dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md#L416)），而 [DNPR] 已不注册 `conversation.view`，低干扰合同也禁止该控件（[[NPR] AGENTS.md:5](../../../../dsh-nano-progress-report/AGENTS.md#L5)、[:150](../../../../dsh-nano-progress-report/AGENTS.md#L150)）；[DNMS] 源码中检索 `fusion`、`delegationId` 为 0 命中，Fusion 还没有实现。→ Q9。
  3. `T-O-5` 要求同一次发布硬切，但没定发布怎样切、怎样验证。[DNPR] 不在 RELEASE.md 的发布包清单里（[RELEASE.md:11–19](../../../../RELEASE.md#L11-L19)），两个本机实例装的都是 0.1.0，靠 `deploy-local` 部署；spec-v1.1 §7.3 的目标值还写着「由 [业主] 确认」（[spec-v1.1:429–430](../spec-v1.1.md#L429-L430)），C1-03 要求人工标注 ≥ 30 个任务区间（[:330](../spec-v1.1.md#L330)）。→ Q10。
- **7.6 收口预判（非裁决）**：若 Round 4 三题按推荐或小幅修订作答，第 5 轮可以完成真相层冻结。届时剩下的都是落在已冻结结构之内的细项，候选为：① `v1` 视图字段表的定稿方式与剩余语义（任务证据区间的上限 `T-O-11` 未覆盖；未归属计数、`asOfSeq`、`inherited` 的确切含义）。按 `T-O-6`，字段表正文只登记在 `[NPR]/AGENTS.md`，本册只冻结规则与审批方式。② 账本事实在人类视图里的呈现细节（Files、Failures 列表的作用域，失败条目对人显示什么，与 `T-O-3` 的精简行怎样对齐）。③ DNPR01 计划的完成判据与 spec-v1.1 的退场方式。若 Q9 把 C3 或 C6 纳入 DNPR01，命令与导出文本、跨会话授权范围和身份维度各需一题，第 5 轮放不下，需要第 6 轮；若 Q8 选 C，模型合同与公开视图绑定，字段表要作为 Round 5 首题提前裁决。

## 8. Round 4 —— executional：出口与交付（Q8–Q10）

本轮 `retired`，[业主] 直答。Q8 定模型看到的文本，Q9 定 DNPR01 交付哪些簇，Q10 定怎样发布与验证。Q10 的发布清单随 Q9 的范围增减，推荐的发布结构不变。三题可以独立作答。

**取证说明（`[PROD]` 补采）**：2026-11-19 只读解码 `~/.dsh-desktop/sessions/**/session.v4.jsonl.zstd` 共 336 份日志，其中 10 份写过 [DNPR] 的进度锚。锚变化次数只统计每份日志中 [DNPR] 首次写锚之后的 1381 个模型步；新规则按 Q5、Q6 的推荐和官方 `todos` 的清空语义离线回放。后台 job 与子代理计数无法从日志可靠重建，新旧两侧都没有单独回放这一行。统计脚本不入库。这是计数和离线模拟，不是行为实验。

### Q8 — 模型看到什么：只读工具的名称、参数与返回，推送锚的字段与措辞

**驱动真相**：`T-O-8`（推送锚 + 只读工具；文本从模型视角写、逐字锁定；锚 ≤ 600 字节）、`T-O-5`（当前清单、goal、jobs 读官方 owner）、`T-O-7`（工作项以 seq 为身份）、`T-O-9`、`T-O-10`（开项与失败规则）、`T-O-11`（三层有界）、`T-O-4`。

- **影响范围**：每次模型请求的工具列表、压缩后第一次请求的定向信息、runtime-context 快照的重发次数，以及 `[NPR]/AGENTS.md` 的 Model Experience。
- **为什么必须确认**：工具名、描述、schema 和锚文本一旦发布就是模型合同，按 `T-O-8` 必须逐字锁定，以后改动要走同样的裁决（[仓规:44](../../../../AGENTS.md#L44)）。spec-v1.1 的草案是 `progress { view, filter?, sinceSeq? }`（[spec-v1.1:374](../spec-v1.1.md#L374)），它复用浏览器过滤词法，并把待处理项做成一种视图，分别与「不出现 UI 词汇」（[packages/CLAUDE.md:15](../../../../.dependencies/pinned/deepseek-harness/packages/CLAUDE.md#L15)）和 `T-O-10`（待决提问读官方）冲突。现行锚的字段里，`Goal:` 行与官方重复，路径行已按 `T-O-8` 退役，「最近 Bash 失败」的口径已被 `T-O-10` 取代（[context.js:12–29](../../../../dsh-nano-progress-report/src/host/context.js#L12-L29)）。
- **当前建议 / 倾向**：选 **A**：工具名 `read_progress`，只有一个可选参数 `item`（工作项 id）；不传返回概览，传入返回该项明细；纯文本结果，整份 ≤ 16 KiB。推送锚四行：当前工作项类别、当前清单计数与进行中任务、当前项的未恢复失败（按工具计数）、活动的后台 job 与子代理；删除 `Goal:` 行，不设等待行，锚里不提工具。
- **Reasoning**：模型只能使用它看得到的东西：工作项 id 来自概览，可以回传；seq 只作为引用。参数越少，描述越短，常驻成本越低。锚只留请求时刻可能变化、且对模型有用的事实；离线回放显示，新规则让锚的变化次数比现行少一半以上。
- **问题（请 [业主] 裁决）**：是否采用 `read_progress { item? }`（概览或单项明细，纯文本，整份 ≤ 16 KiB），并把推送锚定为「当前工作项类别、当前清单计数与进行中任务、当前项未恢复失败、活动 job 与子代理」四行，删除 `Goal:` 行、不设等待行？请选择 A/B/C/D，或给出修订。
- **[业主]回答**：（待裁决）

**【对本问题的解读】**　例：模型在长会话里刚经历一次压缩。请求里的锚写着「当前工作：一条用户请求；任务 2 完成、1 进行中、1 待办，进行中 "补登录超时测试"；当前工作中未恢复的工具失败 1 个（bash 1）」。模型想知道之前做过什么，调用 `read_progress` 拿到最近工作项的概览，每行一项；再用其中一项的 id 调用一次，拿到该项的任务、改动文件和未恢复失败，每条带事件编号。文本里不出现「投影」「面板」「过滤」这类词。本题定模型可见文本，不定 `T-O-6` 的公开视图字段。

**【可选选项清单】**

| 选项 | 工具 | 推送锚 | 得到什么 / 代价 |
|---|---|---|---|
| **A（推荐）** | `read_progress { item?: integer }`；概览或单项明细；纯文本；整份 ≤ 16 KiB，截断如实标注。 | 四行：当前工作项类别 / 当前清单 / 当前项未恢复失败 / 活动 job 与子代理；删 `Goal:`，不设等待行，不提工具。 | 参数最少，只用任务概念；回放中锚变化少 54%。bash 失败只给工具名、次数和事件编号，不给命令（`T-O-8`）。 |
| B | spec-v1.1 C5-01：`progress { view: summary\|tasks\|files\|failures\|awaiting, filter?, sinceSeq? }`。 | 保留 `Goal:` 行，加等待行。 | 切片方式多；过滤词法是 UI 概念，`awaiting` 与官方 `userQuestions` 重复，`sinceSeq` 要求模型知道 seq，等待行在请求时刻恒为 0。 |
| C | 工具直接返回 `T-O-6` 的 `wire` 视图 JSON。 | 同 A。 | 只维护一种格式；模型合同与公开合同绑定，违背 `T-O-8`「模型侧出口不进入 `T-O-6`」；JSON 最坏约 31 KB。 |
| D | 同 A，但未恢复的 bash 失败附命令开头 80 个字符。 | 同 A。 | 压缩后模型能认出是哪条命令；需要修订 `T-O-8` 的「不含命令」，命令原文进入工具结果。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **工具定义**：经 `ctx.tools.register` 注册（[tools.md:662](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/tools.md#L662)）。名称 `read_progress`，与官方 `ask_user_question`、`read_mcp_resource` 的「动词加名词」形式一致（[tool-catalog.md:550](../../../../.dependencies/pinned/deepseek-harness/docs/tool-catalog.md#L550)、[:230](../../../../.dependencies/pinned/deepseek-harness/docs/tool-catalog.md#L230)）。描述草案（落地时逐字锁定）：`Read this session's progress record: work items started by user requests, goals, and scheduled tasks, with their tasks, changed files, and tool failures that no later identical call fixed. Omit item for an overview of recent work items; pass an item id from the overview for its details.` 参数只有 `item`（整数，≥ 0，描述 `Work item id from the overview. Omit for the overview.`），`additionalProperties: false`。输出 schema 为字符串，`isConcurrencySafe` 为真，`presentCall`、`presentResult` 只给短标签，照 [DNMSC] 先例（[inspect-checkpoint.js:140–165](../../../../dsh-nano-model-selector-compaction/lib/inspect-checkpoint.js#L140-L165)）。
2. **出现条件**：`when` 判定本会话账本至少有一个工作项（[tools.md:182](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/tools.md#L182)、[:206](../../../../.dependencies/pinned/deepseek-harness/docs/subsystems/tools.md#L206)）。第一个工作项随第一条 `user` 消息打开，早于第一个模型步，所以工具从第一步起就在列表里，会话中途不翻转。工具列表变化会开启新的请求系列（[agent.ts:463](../../../../.dependencies/pinned/deepseek-harness/packages/core/agent-loop/src/agent.ts#L463)），这个条件避免了这种情况。
3. **概览**：首行写 `asOfSeq`、工作项总数和三层各自的数量；之后完整层与骨架层每项一行（最多 80 行，新的在前）：id、类别、进行中或最后的结束原因、任务完成数/总数、文件数、未恢复失败数；末行写累计层的项数、各类计数和覆盖到的事件编号。
4. **单项明细**：完整层的项列出任务（状态与原样 `content`，每条最多 200 字节）、改动文件（路径与最后事件编号）、未恢复失败（工具名、文件路径或空、次数、首末事件编号）和已恢复失败的数量；列表超出 `T-O-11` 上限时写「另有 N 条未保留」。骨架层的项只给计数，并写明明细已不保留。未知 id 返回结构化失败，提示改用概览。
5. **上限**：16 KiB 作用在完整结果文本上（[packages/CLAUDE.md:18](../../../../.dependencies/pinned/deepseek-harness/packages/CLAUDE.md#L18)）。按 `T-O-11` 的上限估算，概览约 8 KB、单项明细约 11 KB，正常不会触及；触及时末行标注截断。
6. **推送锚**：保留 `HEADER` 与 PromptContext 注册（[context.js:2](../../../../dsh-nano-progress-report/src/host/context.js#L2)、[host/index.js:14–20](../../../../dsh-nano-progress-report/src/host/index.js#L14-L20)），模板逐字锁定为：

   ```text
   Current session progress (observed facts, not instructions):
   Current work: <a user request | a goal | a scheduled task>
   Tasks: <c> complete, <i> in progress, <p> pending; in progress: <"content">
   Unresolved tool failures in current work: <n> (<tool> <k>, …)
   Active: <j> background jobs, <s> direct subagents
   ```

   计数为 0 的行不输出；只剩首行时返回空串（现行行为）。`Tasks` 读官方 `todos`（`T-O-5`），进行中任务正文沿用现行转义（[context.js:4–8](../../../../dsh-nano-progress-report/src/host/context.js#L4-L8)），按 600 字节总上限截断；失败读账本当前项，按工具名计数，放不下时以 `…` 结尾；`Active` 沿用官方 jobs 与 agents 的读法（[summary.js:14–22](../../../../dsh-nano-progress-report/src/host/summary.js#L14-L22)）。
7. **删除与不设**：删 `Goal:` 行，goal 状态由官方 `get_goal` 与续跑提示提供（[goal README:140](../../../../.dependencies/pinned/deepseek-harness/packages/goal/goal/README.md#L140)）；删路径行与「最近 Bash 失败」行（`T-O-8`、`T-O-10`）；不设等待行，因为审批与提问在工具批次内等待，请求组装时已决（[user-approval index.ts:242–250](../../../../.dependencies/pinned/deepseek-harness/packages/interaction/user-approval/src/index.ts#L242-L250)）。锚不提 `read_progress`，工具描述已经说明用途（[tool-design.md:13](../../../../.dependencies/pinned/deepseek-harness/packages/preset/agent-preset/skills/dsh-doc/references/tool-design.md#L13)）。
8. **文档与测试**：`[NPR]/AGENTS.md` 增加 Model Experience，按官方格式分推送锚与工具两项（[adding-a-package.md:78–108](../../../../.dependencies/pinned/deepseek-harness/docs/cookbook/adding-a-package.md#L78-L108)）。工具描述、参数 schema 与锚模板由单测逐字锁定；概览、明细、截断、未知 id 各一组用例。

**【推荐选项支持证据或其他选项的反例】**

- 锚的变化回放（10 份写过锚的日志，[DNPR] 首次写锚之后的 1381 个模型步）：

  | 规则 | 锚文本变化次数 | 其中只有路径行变化 |
  |---|---|---|
  | 现行（日志实际） | 122 | 74 |
  | A（离线回放） | 56 | — |

  每次变化都会让宿主整份重发 runtime-context 快照（[agent.ts:456–474](../../../../.dependencies/pinned/deepseek-harness/packages/core/agent-loop/src/agent.ts#L456-L474)、[runtime-context.ts:164–179](../../../../.dependencies/pinned/deepseek-harness/packages/core/agent-loop/src/runtime-context.ts#L164-L179)），`[PROD]` 中整份快照 p50 1653 字节、最大 2150 字节。A 少掉的 54% 是直接省下的入账消息；spec-v1.1 为此建议的目标是「降低 ≥ 50%」（[spec-v1.1:366](../spec-v1.1.md#L366)）。
- 官方工具设计规范要求结果有界并带可回取的标识，参数规则写在参数上，同一事实只说一次（[tool-design.md:4–5](../../../../.dependencies/pinned/deepseek-harness/packages/preset/agent-preset/skills/dsh-doc/references/tool-design.md#L4-L5)、[:12–13](../../../../.dependencies/pinned/deepseek-harness/packages/preset/agent-preset/skills/dsh-doc/references/tool-design.md#L12-L13)）。本仓先例 `inspect_checkpoint` 就是一个 id 参数加有界文本结果（[inspect-checkpoint.js:140–165](../../../../dsh-nano-model-selector-compaction/lib/inspect-checkpoint.js#L140-L165)、[:211–232](../../../../dsh-nano-model-selector-compaction/lib/inspect-checkpoint.js#L211-L232)）；A 的 `item` 是同一模式，id 来自上一次调用的结果。
- B 的反例：`type:`、`status:`、`tool:` 过滤词法是 Progress 面板的交互（[[NPR] AGENTS.md「使用」](../../../../dsh-nano-progress-report/AGENTS.md)），属于 UI 概念（[packages/CLAUDE.md:15](../../../../.dependencies/pinned/deepseek-harness/packages/CLAUDE.md#L15)）；`awaiting` 视图会把官方 `userQuestions` 再算一遍（`T-O-10`）；`sinceSeq` 要求模型知道 seq，而模型上下文里没有 seq。
- C 的反例：`T-O-8` 明确「模型侧出口不进入 `T-O-6` 的公开读合同」；`T-O-11` 的最坏视图约 31 KB，整份交给模型约为 A 上限的两倍。
- D 的反例：`T-O-8` 冻结了「不含命令、输出或 reasoning」。如果 [业主] 认为压缩后认不出命令的代价过高，应以修订 `T-O-8` 的形式提出，而不是在本题内放宽。
- 诚实代价：A 让一个工具定义常驻工具列表（会话内不变），未恢复的 bash 失败只剩「bash、几次、事件编号」。压缩前模型仍能在自己的上下文里看到命令；压缩后要对照摘要判断。

### Q9 — DNPR01 交付哪些簇：spec-v1.1 的 C2、C3、C6 与 R5、R6 怎样处置？

**驱动真相**：`T-O-1`（新价值 + 通用消费基座）、`T-O-2`（不削弱视觉、不成为 Trajectory）、`T-O-3`（人类视图精简）、`T-O-6`（公开视图）、`T-O-8`（不注册 skill）、`T-O-4`。

- **影响范围**：DNPR01 的工作量与发布内容、Progress 面板新增的元素、[DNPR] 与 Fusion 文档的关系，以及 spec-v1.1 中尚未裁决的 R5、R6。
- **为什么必须确认**：已冻结的 `T-O` 覆盖了 C1（账本）、C4（推送）、C5-01（工具）、C7（精简）和 C6-01（公开视图），C5-02 已被 `T-O-8` 排除；C2（人类进度面）、C3（导出与 `/progress`）、C6-02/03/04（身份维度、跨会话观察、Fusion 对齐）既没有纳入也没有排除。R6（顶部状态行）与 `T-O-2` 和包内「不要状态带」直接冲突（[spec-v1.1:348](../spec-v1.1.md#L348)、[[NPR] AGENTS.md:150](../../../../dsh-nano-progress-report/AGENTS.md#L150)）；R5 所针对的 Fusion §11.4 假定 Progress 仍注册 `conversation.view`（[FUS:416](../../dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md#L416)），这个前提已不成立（[[NPR] AGENTS.md:5](../../../../dsh-nano-progress-report/AGENTS.md#L5)）。
- **当前建议 / 倾向**：选 **A**：DNPR01 交付 C0、C7、C1、C4、C5-01，以及 C2 中直接消费账本的 C2-01、C2-04、C2-05；R6 与 C2-07 关闭为「不做」；C2-02、C2-03、C2-06、C3、C6-02/03/04 登记为延后并写明重开条件；R5 在本题裁决为「[DNPR] 不实现分段控件与 `conversation.view`」，Fusion 文档 §11.4 改为引用本条。
- **Reasoning**：A 的边界是「账本有了，人和模型都读得到」：Tasks 显示跨回合的完成时间，footer 列出改动文件和未恢复失败，模型有锚和工具。延后的各项都只消费已冻结的公开视图、不改合同，以后可以单独交付；Fusion 需要的身份数据今天还不存在，提前做只能按模型名猜。
- **问题（请 [业主] 裁决）**：DNPR01 是否只交付 C0、C7、C1、C4、C5-01 与 C2-01/04/05，关闭 R6 与 C2-07，延后 C2-02/03/06、C3、C6-02/03/04 并写明重开条件，同时把 R5 裁决为「[DNPR] 不实现分段控件与 `conversation.view`」？请选择 A/B/C/D，或给出修订。
- **[业主]回答**：（待裁决）

**【对本问题的解读】**　例：DNPR01 发布后，[业主] 打开 Progress：时间线按 `T-O-3` 精简；Tasks 区里两天前完成的任务也有完成时间；footer 在有数据时多出 `Files 5`、`Failures 1` 两个文本开关，展开后各是一张简单列表；没有顶部状态行，也没有「全部 / Lead / Sidekick」分段。想把进度贴进交接说明时，DNPR01 不提供「复制报告」按钮或 `/progress` 命令，这两项登记为延后。本题定 DNPR01 的交付范围与两项未决冲突的处置，不定 UI 细节。

**【可选选项清单】**

| 选项 | 进入 DNPR01 | 其余处置 | 得到什么 / 代价 |
|---|---|---|---|
| **A（推荐）** | C0、C7、C1、C4、C5-01；C2-01、C2-04、C2-05。 | R6/C2-07 关闭；C2-02/03/06、C3、C6-02/03/04 延后并写重开条件；R5 裁决为不实现分段控件与 `conversation.view`。 | 人和模型都读到账本，范围可一次交付；任务展开证据、导出和身份视图要等下一阶段。 |
| B | spec-v1.1「基线收口」全量：A 加 C2-02、C2-03、C2-06、C3。 | R5、R6、C6 同 A。 | 人类出口最全；工作量约增一半，C3 新增命令名和第二种报告渲染，C2-02 依赖尚未定上限的任务证据区间。 |
| C | 账本最小闭环：C1、C4、C5-01、C2-01，以及 `T-O-9` 要求同次发布的时间线开组改动。 | C0、C7 与其余 C2 下一阶段；R5、R6 同 A。 | 发布最小；`T-O-3` 的精简和 `T-O-10` 的「失败 k 次后通过」推迟，人在面板上看不到「卡在哪」。 |
| D | A 加 C6-02/03（身份维度与跨会话观察）。 | R6 同 A；R5 以 `actor:` 过滤词落地。 | 提前为 Fusion 铺路；宿主没有公开的配对事实，[DNMS] 没有 Fusion 实现，身份只能按模型名猜，违背 [FUS:418](../../dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md#L418) 与「需要当前消费者」。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **进入 DNPR01**：C0 卫生五项（[spec-v1.1:272–278](../spec-v1.1.md#L272-L278)）；C7 精简六项（`T-O-3`，[:393–400](../spec-v1.1.md#L393-L400)）；C1 账本（`T-O-5/7/9/10/11`）；C4 推送锚与 C5-01 工具（`T-O-8` 与 Q8）；C2-01 Tasks 改读账本并退役 `task-times.js`（`T-O-5`）；C2-04 footer 的 Files、Failures 文本开关，沿用 `Jobs N` 模式，只在有数据时出现，不加分段控件（[:345](../spec-v1.1.md#L345)）；C2-05 把回合耗时与非 completed 的结束原因放进 56px 时间列，与 C0-04 配套（[:346](../spec-v1.1.md#L346)）。
2. **关闭**：R6 与 C2-07「当前状态行」关闭为不做，依据 `T-O-2` 与 [[NPR] AGENTS.md:150](../../../../dsh-nano-progress-report/AGENTS.md#L150)；C5-02 已由 `T-O-8` 排除。两项写入 spec-v1.1 附录 B「明确不做」，引用本条。
3. **延后与重开条件**：C2-02 任务展开证据、C2-03 `task:`/`file:` 过滤词，在 `v1` 字段表定下任务证据区间后重开；C2-06 离开期间分隔线，在 [业主] 提出需求时重开；C3 导出与 `/progress`，在 [业主] 需要 Progress 面板之外的人类出口时重开，届时复用 `read_progress` 的文本格式，不另写一套报告渲染；C6-02/03，在宿主公开 Fusion 配对事实且 [DNMS] 有 Fusion 实现时重开。这些延后项都只消费 `T-O-6` 视图，不改合同。
4. **R5 裁决**：[DNPR] 不注册 `conversation.view`，不加分段控件；将来的身份维度以过滤条与过滤菜单的方式进入（spec-v1.1 C6-04 的建议），不改变 `T-O-2`。决定只登记在本条；[FUS §11.4](../../dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md#L414) 增加一行引用本条，原文不再作为 [DNPR] 的设计输入。
5. **spec-v1.1 回写**：§5 台账的状态列与附录 A 的 R1–R7 改为引用对应的 `T-O`，不复述决定。

**【推荐选项支持证据或其他选项的反例】**

- A 的边界与 `T-O-1` 对齐：「做到哪了、还剩什么」由 Tasks 的跨回合史和推送锚回答，「卡在哪」由 Failures 与时间线 A 层回答，「证据在哪」由文件列表、事件编号和工具明细回答。延后项（C2-02/03/06、C3）都只读 `T-O-6` 视图，spec-v1.1 自己也把 C3 标为「无合同影响」（[spec-v1.1:256](../spec-v1.1.md#L256)），推迟不会导致以后破坏性升 `v`。
- R6 的反例：包内合同把「不要恢复状态带」列为验收项（[[NPR] AGENTS.md:150](../../../../dsh-nano-progress-report/AGENTS.md#L150)），阅读顺序明确「没有 goal banner、状态带或抽屉分段控件」（[:110](../../../../dsh-nano-progress-report/AGENTS.md#L110)）；spec-v1.1 也写「不做也不影响基线收口」（[spec-v1.1:465](../spec-v1.1.md#L465)）。
- R5 的依据：Fusion §11.4 的前提是 `conversation.view` 与工作台共用 `ProgressBody`（[FUS:416](../../dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md#L416)），而 [DNPR] 已不注册 `conversation.view`（[[NPR] AGENTS.md:5](../../../../dsh-nano-progress-report/AGENTS.md#L5)）。§11.4 要求「另从绑定得出 actor，不把所有 exec 都归 Sidekick」（[FUS:418](../../dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md#L418)），这需要宿主公开配对事实；[DNMS] 源码里检索 `fusion`、`delegationId` 为 0 命中，目前没有数据源。
- B 的反例：C3-01 的 `report.js` 是账本的第二种文本渲染，而 `read_progress` 已经是一种；C3-02 新增 `commands` inject 和一个用户可见的命令名（[spec-v1.1:355–356](../spec-v1.1.md#L355-L356)）。官方要求每个抽象与选项都对应当前的合同或消费者（[packages/CLAUDE.md:11](../../../../.dependencies/pinned/deepseek-harness/packages/CLAUDE.md#L11)）。C2-02 依赖任务证据区间，`T-O-11` 没给它上限，这是 Round 5 的候选细项。
- C 的反例：`T-O-9`、`T-O-10` 都要求时间线与账本共用 `src/shared/` 的判定；C 把精简推迟后，时间线的「失败 k 次后通过」要等下一次发布，人在面板上要再等一轮才能看到「卡在哪」。
- D 的反例：宿主缺少配对事实时，身份只能从模型名推断，这正是 [FUS:418](../../dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md#L418) 禁止的做法；跨会话观察还要先定授权范围（`T-O-6` 明确未定），会再引出至少一轮问题。

### Q10 — 怎样发布与验证：一次硬切发布、版本号、文档同步、验证项与生产升级

**驱动真相**：`T-O-4`（能硬切就不双写）、`T-O-5`（同一次发布替换 summary 单元与 `task-times.js`）、`T-O-9`（时间线开组同次发布）、`T-O-11`（落地后复测只记录、不设闸门）、`T-O-3`（包内合同同步修订）。

- **影响范围**：分支与 worktree、`package.json` 版本、`[NPR]/AGENTS.md` 与 spec-v1.1 的同步、测试与离线回放、两个本机实例的升级时点。
- **为什么必须确认**：`T-O-5` 规定同一次发布硬切，但没规定这次发布包含多少内容、用什么版本号、哪些验证是发布条件。现状：`~/.dsh` 与 `~/.dsh-desktop` 两个实例装的都是 0.1.0；[DNPR] 不在 RELEASE.md 的发布包清单里（[RELEASE.md:11–19](../../../../RELEASE.md#L11-L19)），部署走 `scripts/deploy-local.mjs`（[:69–93](../../../../RELEASE.md#L69-L93)）；单测基线 141 项全部通过（2026-11-19 本机运行 `npm test`）；spec-v1.1 §7.3 的锚目标还写着「由 [业主] 确认」（[spec-v1.1:429–430](../spec-v1.1.md#L429-L430)），C1-03 要求人工标注 ≥ 30 个任务区间且一致率 100%（[:330](../spec-v1.1.md#L330)）。
- **当前建议 / 倾向**：选 **A**：一个语义分支、一次合并、一次发布，版本 0.1.0 → 0.2.0；代码、包内合同和规格回写在同一次发布里；验证只用现有手段（单测、UI 规则、构建与打包检查、只记录的离线回放），不设新闸门、不做人工标注；生产实例何时升级由 [业主] 决定，用 `deploy-local`；RELEASE.md 不改。
- **Reasoning**：`T-O-5` 已把账本、推送锚和 Tasks 绑在同一次发布里，Q9 的其余内容与它们共用 `src/shared/`，拆成两次只会让包合同改两遍。验证要能挡住真实回归，同时不能变成 [业主] 没批准的新闸门；回放数字写回规格作为记录。
- **问题（请 [业主] 裁决）**：DNPR01 是否以一个语义分支、一次合并、一次发布（0.2.0）交付，代码、包内合同和规格回写同次落地，验证限于单测、UI 规则、构建打包检查和只记录的离线回放（不设闸门、不做人工标注），生产升级由 [业主] 用 `deploy-local` 安排，不改 RELEASE.md？请选择 A/B/C/D，或给出修订。
- **[业主]回答**：（待裁决）

**【对本问题的解读】**　例：实现完成后，`main` 上多出一次合并；`dsh-nano-progress-report/package.json` 变为 0.2.0；`npm test` 在 141 项基础上增加账本、精简、工具和锚的用例，全部通过；`check-ui-rules` 的 NPR 行仍是 0 告警；spec-v1.1 §7.3 填上回放数字。[业主] 选定时间后，在两个实例上执行 `deploy-local` 并重启宿主；旧 `summary` 单元的 checkpoint 留在缓存里，不再推进。本题定发布与验证方式，不定代码结构。

**【可选选项清单】**

| 选项 | 发布切分 | 验证 | 得到什么 / 代价 |
|---|---|---|---|
| **A（推荐）** | 一个语义分支、一次合并、一次发布（0.2.0）；代码、包内合同、规格回写同次落地。 | 单测（含逐字锁定）、`check-ui-rules`、构建与 `npm pack --dry-run` 检查、离线回放只记录；live 脚本可选。 | 一次硬切、一次部署、包合同只改一遍；风险集中在一次发布，靠单测与回放兜底。 |
| B | 两次发布：0.2.0 = 账本、锚、工具、Tasks、时间线开组；0.3.0 = C0、C7、C2-04/05。 | 同 A，分两次执行。 | 每次改动更小；`[NPR]/AGENTS.md` 改两遍，两次部署与重启，时间线精简推迟一个版本。 |
| C | 同 A，另把 [DNPR] 加入 RELEASE.md 的发布清单与 CI matrix，打 tag 发布。 | 同 A，加 CI 构建与 attestation。 | 有可追溯的发布产物；改动的是全仓发布流程，超出 DNPR01 范围，需要 [业主] 另行批准。 |
| D | 同 A。 | 增加发布条件：C1-03 人工标注 ≥ 30 个任务区间且一致率 100%，锚变化降低 ≥ 50%。 | 有人工核对过的准确率；新增未经批准的发布闸门和人工工作量，与「不得过度仪式」相抵。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **分支**：在 `.agents/worktrees/` 下建语义分支（例如 `dnpr01-progress-ledger`），开发与测试完成后合并回 `main`，并按 [业主] 要求删除该 worktree（[仓规:47](../../../../AGENTS.md#L47)）。
2. **版本**：`version` 从 0.1.0 改为 0.2.0；删除 summary 单元、新增模型工具、改写锚文本都是对外可感知的变化。`engines.dsh` 不变，宿主基线仍是 `[EV5]` rc.5。
3. **同次硬切内容**：注册 `nano-progress-report:ledger` 单元；删除 summary 单元及其注册、`task-times.js` 与 `test/task-times.test.mjs`；锚改为 Q8 的模板；注册 `read_progress`；Q9 范围内的浏览器改动。旧 key 的 checkpoint 不写迁移器（`T-O-5`）。
4. **同次文档**：`[NPR]/AGENTS.md` 修订「身份」（宿主 inject 增加 `tools`，入口说明去掉「进度摘要」，[AGENTS.md:16–18](../../../../dsh-nano-progress-report/AGENTS.md#L16-L18)）、「使用」、「验收」第 4 条与「不要」（按 `T-O-3`；删除指向 `task-times.js` 的条款，[:151](../../../../dsh-nano-progress-report/AGENTS.md#L151)）、「配置与状态」（新增 `v1` 字段表与 `T-O-11` 常量，改写 [:96](../../../../dsh-nano-progress-report/AGENTS.md#L96) 的「摘要」表述），并新增 Model Experience。spec-v1.1、本册与 DNPR01 计划一并入库；spec-v1.1 的附录 A、附录 B、§5 状态列与 §7.3 按 Q9 第 5 条回写。
5. **验证**：`npm test` 全部通过，新增账本、精简、工具、锚的用例，`contract.test.mjs` 的「不注册路由」继续通过；`node scripts/check-ui-rules.mjs` 的 NPR 行 0 告警；`npm run build` 后三个 `lib/` 文件非空，`npm pack --dry-run` 不含 `src/`、`test/`（[spec-v1.1:416–418](../spec-v1.1.md#L416-L418)）；离线回放 `[PROD]`，把锚变化次数、最大会话的冷构建耗时、每回合行数和 `T-O-11` 的视图体积写回 §7.3，只记录。C1-03 的人工标注改为归属规则的单测，§7.3 的目标列改为「只记录」。
6. **部署**：合并后不自动升级实例。[业主] 选定时间后执行 `node scripts/deploy-local.mjs --home <home> --profile <p> --plugins dsh-nano-progress-report`，两个实例各一次，然后重启宿主并刷新（[RELEASE.md:69–93](../../../../RELEASE.md#L69-L93)）。RELEASE.md 的发布清单不在 DNPR01 里修改。
7. **不做**：不加 `Config` 开关切换新旧实现；不同时发布两版；不新增发布闸门；spec-v1.1 附录 C 登记的 89 个误提交文件不在本次处理。

**【推荐选项支持证据或其他选项的反例】**

- A 的依据：`T-O-5` 规定账本、PromptContext 与 Tasks 同一次发布硬切，`T-O-9` 规定时间线开组同次发布，`T-O-10` 规定指纹函数由账本与精简共用；这些改动共享 `src/shared/`，放进同一次发布最自然。现有检查已覆盖关键风险：`contract.test.mjs` 断言宿主入口不注册路由、烘焙产物与源码一致（[contract.test.mjs:63](../../../../dsh-nano-progress-report/test/contract.test.mjs#L63)、[:69](../../../../dsh-nano-progress-report/test/contract.test.mjs#L69)），`check-ui-rules` 有 NPR 行（[check-ui-rules.mjs:28](../../../../scripts/check-ui-rules.mjs#L28)）。
- B 的反例：B 不违反硬切（两次各自完整），但 `[NPR]/AGENTS.md` 的「使用」「验收」「不要」要改两遍，两个实例各部署和重启两次，时间线精简推迟一个版本。若 [业主] 更看重单次风险，B 是可接受的修订。
- C 的反例：RELEASE.md 的发布清单与 CI matrix 属于全仓发布流程（[RELEASE.md:19](../../../../RELEASE.md#L19)、[:172](../../../../RELEASE.md#L172)），把 [DNPR] 加进去是一个独立决定；在 DNPR01 内顺带修改，就是未经批准的流程变化。
- D 的反例：仓规禁止未经 [业主] 批准的 release-gate 和过度的测试循环（[仓规:45](../../../../AGENTS.md#L45)），`T-O-11` 已定「复测只记录不设闸门」。人工标注 ≥ 30 个区间的工作量大，而归属规则（`T-O-7`、`T-O-9`、`T-O-10`）是确定性的，可以用单测逐条锁定。
- 诚实代价：A 没有人工核对过的归属准确率；回放数字只说明规模和频率，不说明对错。若 [业主] 需要准确率证据，可以修订为在 §7.3 记录一次人工抽查，但不作为发布条件。

## 9. 收口（全轮冻结）

- **冻结判据**：foundational 两轮四题与全部 executional 轮次冻结；§1 无未入账裁决；无 OPEN 残题，或残题已显式 defer 并登记。
- **交接**：§1 Truth-Gate 台账 → 「DNPR01 计划」§2 引用。

## 修订历史

| 版本 | 日期 | 作者 | 主要变更 |
|---|---|---|---|
| v0.1 | 2026-11-19 | DNPR01 架构审查 | 初稿：§1 开轮基线 `T-O-1`–`T-O-4`；Round 1 提出 Q1–Q2，待 [业主] 裁决 |
| v0.2 | 2026-11-19 | DNPR01 架构审查 | Round 1 冻结为 `T-O-5/6`；中场评估 I；Round 2 提出 Q3–Q4，待 [业主] 裁决 |
| v0.3 | 2026-11-19 | DNPR01 架构审查 | Round 2 冻结为 `T-O-7/8`，foundational 收口；中场评估 II；`[PROD]` 复采；Round 3（executional）提出 Q5–Q7，待 [业主] 裁决 |
