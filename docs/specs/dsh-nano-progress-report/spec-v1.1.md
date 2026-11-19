# dsh-nano-progress-report（DNPR）v1.1 规格：从执行流水到会话进度账本

> 规格稿，2026-11-19。承接 [spec-initial](spec-initial.md)（P0–P2 的设计与边界）和 [spec-review-after-initial-implementation](spec-review-after-initial-implementation.md)（三场景评审）。本文回答 [业主] 的问题：[DNPR] 与 [dsh] 原生 Trajectory 高度重叠，怎样在**插件中立、不得侧载、单一真源**的前提下，发展出独立的价值、能力和消费者。
>
> 本文**不是改约登记**。凡标「需 [业主] 裁决」的项，都要等 [业主] 的决定落成 durable 登记（只登记一处）后才生效。没有裁决的项不进入实现。

> **已被取代**：本文已被 [`qna/DNPR01-qna.md`](qna/DNPR01-qna.md) §1 的 `T-O`（`DNPR01-TRUTH` v0.1.1）取代，保留为形成史与证据索引；冲突以 `T-O` 为准。DNPR01 已按 `T-O-13`/`T-O-14` 交付：账本单元 `nano-progress-report:ledger`、四行锚与 `read_progress`、人类视图 A/B/C 精简、面板 Tasks/Files/Failures/Jobs。

| 元信息 | 值 |
|---|---|
| 包名 / 插件 id | `dsh-nano-progress-report` / `nano-progress-report` |
| 基线 | main @ `1e41d91`（已合入 lowkey 低干扰工作台），包 `version` `0.1.0`，`engines.dsh` `>=0.2.2-rc.5 <0.3.0`（`[NPR]/package.json:3,30`） |
| 宿主事实基线 | rc.5 评估树 `[EV5]` |
| 范围 | 只改本包；不改 [dsh] 宿主、不改其他 nano 插件 |

## 证据口径

| 别名 | 路径 | 说明 |
|---|---|---|
| `[NPR]` | `dsh-nano-progress-report/` | main @ `1e41d91` 的本包源码 |
| `[EV5]` | `.dependencies/pinned/deepseek-harness/` | `dsh-v0.2.2-rc.5`（提交 `9c2670d`，2026-11-19 由评估树转为 pinned），宿主接缝与官方文档以它为准 |
| `[INIT]` | `docs/specs/dsh-nano-progress-report/spec-initial.md` | 初版规格 |
| `[REV]` | `docs/specs/dsh-nano-progress-report/spec-review-after-initial-implementation.md` | 初版评审 |
| `[FUS]` | `docs/specs/dsh-nano-model-selector/decision-model-fusion-feasibility-1119.md` | Fusion 可行性与 V1 裁决 |
| `[PROD]` | `~/.dsh-desktop/sessions/**/session.v4.jsonl.zstd` | 生产桌面实例的会话日志，只读解码统计 |
| `[SHOT]` | `.temp/dnpr-screenshot.png` | [业主] 提供的当前界面截图（不入库） |

---

## 0. 结论

1. **定位**：Trajectory 是官方的**执行记录器**，回答「发生了什么、花了多少」；[DNPR] 应当成为**会话进度账本**，回答「做到哪了、还剩什么、卡在哪、证据在哪」。在「列出事件」这件事上，[DNPR] 不与 Trajectory 竞争（§1）。
2. **消费者**：[DNPR] 已经有一个真实的消费者：生产桌面实例上的模型。2026-11-19 以来，40 个活跃会话中有 7 个收到了 [DNPR] 进度锚，共 89 份快照（§2.1）。价值最高的三个消费者依次是：**本会话模型**、**[业主] 本人的进度掌控与交接**、**多代理观察者**（Fusion 与 team lead）（§2.2–2.4）。
3. **解法**：建一份**宿主侧的进度账本投影**（Progress Ledger），作为唯一的计算点；再通过宿主自己的公开接缝分发出去，分别是投影的 `wire` 视图、PromptContext、人类命令、skill provider、模型工具和跨会话观察。[DNPR] 不 `ctx.provide` 服务，不开路由，不被任何插件 import（§3、§4）。
4. **v1.1 台账**：分为 8 个内聚业务簇（§5、§6）。其中 C0–C3 不改任何合同，可以直接执行；C7 改动包内展示合同，[业主] 已选定方案（R7）；C4–C6 涉及模型可见内容或公开合同，必须先有 [业主] 裁决。
5. **人类视图**：保留 Progress 现在的视觉报告，但粒度从「一次工具调用一行」精简为「一个进度事实一行」，执行动作合并成步骤摘要，原始数据只在 Trajectory（§4.4、C7）。
6. **收口**：完成度绑定到具体锚点，包括单测文件、离线生产回放的数值、包内 `AGENTS.md` 的段落和 UI 规则检查。不新增发布闸门（§7）。

---

## 1. 价值定位：与原生 Trajectory 的比较

### 1.1 原生 Trajectory 是什么

| 事实 | 证据 |
|---|---|
| 以回合为单位的事件账本加交互式时间总览：分组展示 User、Assistant、Tool、Subtool 和压缩记录，可以打开检查器看 token 用量、耗时、输入、输出 | `[EV5]/packages/client/ui-trajectory/README.md:12` |
| 对模型完全不可见：「None, as the Trajectory UI and its read-only Host inspector register nothing model-facing」 | 同上 `:99`、`:103` |
| 宿主侧的 `ctx.sessionToolResults` 只在内存中保存原始结果，不写会话事件，也不写投影 checkpoint | 同上 `:70` |
| 长账本只从窗口尾部的 50 个节点开始，按需向前加载 | 同上 `:74` |
| 选择和时间线导航只在 Trajectory 内部有效，没有可链接的锚点 | 同上 `:114` |

### 1.2 官方对这一片领域的态度

| 态度 | 证据 | 对 [DNPR] 的含义 |
|---|---|---|
| 官方提供通用的「日志推导的整会话值」接缝，并且自己用它做了大纲和统计 | 投影接缝 `[EV5]/docs/subsystems/session-projection.md:5,44`；`session-turn-outline` README `:12`；`session-stats` README `:12` | 「从完整日志推导、翻页和压缩都不影响」是官方认可的模式，[DNPR] 的账本应当走同一条路 |
| todo 刻意只有单一属主；共享或跨代理的列表「would change the model-visible contract」，目前没有设计 | `[EV5]/packages/todo/tool-todo/README.md:169` | [DNPR] 不能造共享 todo，只能**观测**并记账 |
| 任务板只能拉取：任务变化不结束 `wait_agent`，也不唤醒成员 | `[EV5]/packages/team/agent-team/README.md:81` | 官方刻意不做成员之间的进度同步，这是插件可以合法补位的空白 |
| 新增模型可见输入必须有会话事件；模型可见内容 ⟺ 写入日志 | `[EV5]/CLAUDE.md:138` | PromptContext、工具调用和 skill 加载本身都会写进日志，满足这条规则 |
| 每个抽象都要绑定到当前的消费者；面向模型的合同要从模型的视角写 | `[EV5]/packages/CLAUDE.md:11,15` | v1.1 的每一项都必须指向 §2 里具体的消费者 |

### 1.3 多维度价值对比台账

| 维度 | 原生 Trajectory | [DNPR] 现状（`1e41d91`） | [DNPR] v1.1 目标 |
|---|---|---|---|
| 主要读者 | 调试者、性能分析者 | [业主] | [业主]、本会话模型、多代理观察者 |
| 回答的问题 | 发生了什么、耗时、token | 发生了什么（简化版） | 做到哪了、还剩什么、卡在哪、证据在哪 |
| 人类视图粒度 | 每个请求、工具调用、子调用 | 每次工具调用一行 | 每个进度事实一行；执行动作合并成步骤摘要（§4.4） |
| 计算单位 | 请求、工具调用、子调用 | 行（浏览器窗口内） | 任务、改动的文件、未解决的失败、待处理项，以及证据指针 |
| 数据窗口 | 窗口加按需翻页 | 窗口加翻页；完成时间只覆盖窗口内（`[NPR]/src/client/task-times.js:3-7`） | **整会话**：宿主投影从完整日志计算 |
| 跨回合 | 按回合分段 | Tasks 读 `todos` 投影，每个 turn 开始时被宿主清零（`[NPR]/AGENTS.md` 「使用」表 Tasks 行） | 全会话的任务史，不随 turn 清零 |
| 跨会话 | 不支持 | 不支持（`[INIT]:376`） | 经宿主 `observeSession` 只读（需裁决） |
| 模型可见 | 无（`ui-trajectory/README.md:99`） | 有：最多 600 字节的计数式锚（`[NPR]/src/host/context.js:1-2`） | 来自账本的可执行事实；按需拉取（需裁决） |
| 压缩后的连续性 | 不涉及 | 依靠 PromptContext 的重写语义（`runtime-context.ts:170`） | 同左，并控制快照的抖动 |
| 证据可追溯 | 检查器看原始数据 | 行内展开 detail | 每条进度事实都带 seq 或 callId 指针，可以跳回日志 |
| 原始数据检查 | 强（token、首字延迟、原始结果） | 弱（展开 args 和结果的开头） | **刻意不做**：不再显示 args、result 原文，原始检查交给 Trajectory |
| 导出与交接 | 无 | 无 | Markdown 报告、`/progress` 命令、交接 skill |
| 对其他插件 | 无 | 无 | 一份带版本的公开只读投影（需裁决） |

**判断**：如果继续强化时间线，[DNPR] 永远是一个「更安静的 Trajectory」。v1.1 保留时间线的视觉形态，但把内容从「执行流水」精简为「进度报告」（§4.4）；同时把整会话、可追溯、可分发的**进度事实**作为主产品。

---

## 2. 实际消费者与需求画像

### 2.1 消费者现状（实测）

| 消费者 | 现状 | 证据 |
|---|---|---|
| 本会话模型 | **已在生产中消费**。web、desktop、dev 三个实例都装了本包，宿主包里都有 `nano-progress-report:progress` 这条上下文。`[PROD]` 中 2026-11-19 以来修改过的 40 个会话里，7 个收到了进度锚，共 89 份快照：89 份都带文件路径，71 份带 Bash 失败计数，31 份带任务计数，13 份带活动计数，0 份带 goal | `~/.dsh*/plugins/dsh-nano-progress-report/lib/host.js`；`[PROD]` 只读统计 |
| [业主]（人类） | 工作台 Progress 页。生产的 web 和 desktop 实例仍是旧版 client（带 `conversation.view`），dev 实例是 lowkey 版 | 三个实例的 `lib/client.js` 中 `conversation.view` 计数分别为 2、2、0 |
| 压缩引擎（[DNMSC] 和原生压缩） | 间接受益：PromptContext 被压缩移除后，宿主会带着「替代说明」重新写入 | `[EV5]/packages/core/agent-loop/src/runtime-context.ts:170`；`[REV]` §3.3 |
| Fusion V1 | 已写进裁决文档，规划为「[DNPR] 回答具体做了什么」，对应验收项 C06 | `[FUS]:360`、`:302`、`:349`、`:414-422` |
| team lead 和成员 | P3 暂缓 | `[INIT]:372`；`[REV]` §5 |
| 其他插件、外部 MCP | 没有任何插件提出过需要 | `[REV]` §4 |

一个值得注意的信号：平均每个会话约 13 份快照，而且每一份都带路径。这说明**路径列表很可能是锚内容抖动的主要来源**。每次抖动都会往日志追加一条 `runtime-context` 消息，消耗 token 和 KV 缓存。这一点在 C4 处理。

### 2.2 消费者一：本会话模型（含压缩后的连续性）

| 项 | 画像 |
|---|---|
| 场景 | 长会话、多次压缩、goal 多轮推进、子代理委派之后，模型需要知道「我现在在做哪件事，哪些已经验证，哪些还失败着」 |
| 当前痛点 | 锚只有计数（`[NPR]/src/host/context.js` 的整体格式）：模型知道「1 in progress」，却不知道是哪一项；知道「失败 3 个」，却不知道落在哪里。压缩之后只剩摘要里的散文（`[REV]` §3.1） |
| 硬需求 | ① 事实确定、可回放（来自日志）；② 有界且稳定，内容不变就不重发（`[EV5]/docs/subsystems/system-prompt.md:78`）；③ 只陈述事实，不下指令（`context.js:2` 的 header 已经这样写）；④ 不含命令、输出等原始载荷 |
| 软需求 | 需要时能主动拉取更细的视图（某个任务的证据、某个失败最后一次出现的位置），而不是每一轮都推送 |
| 约束 | 新增模型可见内容要经过 [业主] 裁决（[不得擅自扩约]）；面向模型的措辞只用任务概念（`[EV5]/packages/CLAUDE.md:15`）；上限作用在完整结果上（同上 `:18`） |
| 成功信号 | 压缩后不再重复已经完成的工作；给最终答复前能自查未解决的失败；每个会话的快照数量下降 |

### 2.3 消费者二：[业主] 的进度掌控与交接

| 项 | 画像 |
|---|---|
| 场景 | 进行中扫一眼（现在在干什么、有没有卡住）；隔几小时回到会话（离开期间发生了什么）；收尾时写 PR 描述、站会内容或交接说明 |
| 当前痛点（`[SHOT]`） | ① `Task list: 1/4 done` 连续出现两行：`todo_write` 的工具调用行（`[NPR]/src/client/constants.js:32` → `rows.js:154`）和 `todo/write` 事件行（`events/job.js:4-9` → `rows.js:175-181`）各生成一行，去噪逻辑没有处理（`group.js:24` 起的 `denoise` 只合并 job 和空消息）；② 待办任务用的是带勾的空心圆（`view/TasksView.jsx:19`），和完成态太像；③ 注入的 `<kitesurf …>` 标记和长 JSON 被当成人类 prompt 原样显示（`events/message.js:14-15,22`）；④ `Session ended` 和每个 `Turn N ended` 都占一整行（`events/turn.js:99-110`）；⑤ 过滤菜单里大量 0 计数项 |
| 结构性缺口 | Tasks 每个 turn 被清零；窗口外的任务没有完成时间；不知道哪些步骤属于哪个任务；没有「改动了哪些文件」「还有什么没解决」的汇总；无法导出 |
| 硬需求 | 一眼看到当前任务和阻塞；任务能展开出它的证据；整会话的任务史；一键导出报告 |
| 约束 | 低干扰是验收项：不要 goal banner、回合分组头、状态带或 `SegmentedControl`（`[NPR]/AGENTS.md:150`）；宿主 primitive 优先（根 `AGENTS.md:46`） |
| 成功信号 | 回到会话后不翻时间线就能说出进度；写交接说明时直接用导出的报告 |

### 2.4 消费者三：多代理观察者（Fusion 与 team lead）

| 项 | 画像 |
|---|---|
| 场景 | Fusion：同一心流里按 Lead、Sidekick 区分执行身份（`[FUS]:302`）。team：lead 用 subagent 派工、用 send_message 驱动，需要知道每个成员在做什么（`[REV]` §5.2：一个 lead 会话 48 次 subagent 调用，`team_task_*` 0 次） |
| 当前痛点 | 官方不做进度同步（`agent-team/README.md:81`）；`list_agents` 只表示 turn 是否活跃，不表示进度（`[REV]` §5.1）；[DNPR] 只投影当前会话 |
| 硬需求 | ① 每个会话一份账本，可以按会话身份聚合；② 跨会话只能走宿主的公开读面（`[EV5]/docs/subsystems/session-query.md:390`），并随观察者的生命周期申请和释放；③ 身份按绑定关系得出，不按模型名猜（`[FUS]:260`）；④ 没有 [DNPR] 也不影响派工（`[FUS]:267`） |
| 约束 | 跨会话读取和身份维度都是新增合同，需要裁决；`[FUS]:416` 要求的 `SegmentedControl` 和 `conversation.view` 与本包现行的低干扰合同（`[NPR]/AGENTS.md:5,150`）**冲突**，需要 [业主] 二选一（见 C6） |
| 成功信号 | `[FUS]` C06 的五类 fixture 归因 100% 一致（`[FUS]:349`）；lead 不打开子会话就能看到成员进度 |

### 2.5 不进入前三的消费者

- **压缩引擎**：不需要专门接线，通过消费者一间接受益。[DNPR] 不碰 [DNMSC] 的切点和台账（`[INIT]:372`）。
- **其他插件**：目前没有提出需求的插件。v1.1 只提供一份带版本的只读投影作为**被动**出口（C6），不为假想的消费者建服务。
- **外部或远程 agent（MCP / HTTP）**：继续暂缓（`[REV]` §4），重开条件不变。

---

## 3. 原则约束下的工作目标

| 根 `AGENTS.md` 原则 | 对 [DNPR] v1.1 的具体约束 | 由此得出的目标 |
|---|---|---|
| 插件中立（`:39`） | 首要服务对象是官方 [dsh]；不感知 [dsh-mini]、[nano-agent] | 只用 rc.5 公开接缝；不识别其他 nano 插件的私有标记（例如折叠注入上下文时按格式识别，不写死 `<kitesurf>`） |
| 上层建筑归 host（`:40`） | 日志、投影驱动、PromptContext 去重和重写、命令分派、skill 目录、跨会话授权都归宿主 | [DNPR] 只贡献一个投影单元和若干注册；不复制这些机制 |
| 不得侧载（`:41`） | 不建插件间专有通道 | 不 `ctx.provide`、不开路由、不被 import；对外只有宿主公开投影这一个出口，消费者通过宿主读取 |
| 单一真源（`:42`） | 只有会话日志是 canonical | 账本是可以丢弃重建的投影缓存，只存指针和派生事实，不存载荷；浏览器只存视图状态 |
| 不得擅自扩约（`:44`） | 新的模型可见输入、新工具、公开合同都要 [业主] 裁决 | C4–C6 标为「需裁决」，未裁决不实现 |
| 不得过度仪式（`:45`） | 不建发布闸门、不搞过度的测试循环 | 收口只复用 `npm test`、`check-ui-rules`、可选的 live 脚本和一次离线回放（§7） |
| UI 宿主优先（`:46`） | 宿主 primitive 优先，不嫁接宿主 DOM | 新增的 UI 只用 `DisclosureRow`、`Menu`、`Button` 等宿主组件；唯一的本地 primitive 仍是已登记豁免的进度条 |

**总目标**：在只用宿主公开接缝、只在一处计算、只存指针的前提下，让 [DNPR] 成为 [dsh] 生态里「会话进度事实」的**标准提供者**。人、模型、观察者读到的都是同一份事实。

---

## 4. 通用解法与价值定位

### 4.1 定位

> **[DNPR] = 会话进度账本。** 它从宿主日志确定性推导出整会话、带指针的进度事实，并通过宿主公开接缝同时服务人类、模型和多代理观察者。Trajectory 记录执行，[DNPR] 记录进度。

### 4.2 一份账本，多个出口

```
会话日志（唯一真源，宿主所有）
  └─ ctx.sessionProjections 驱动（宿主）
       └─ [DNPR] Ledger 投影单元（唯一计算点；checkpoint 只是缓存）
            ├─ wire 视图（summary:false） → 浏览器 faceOf(key)        → C2 人类进度面、C3 导出
            ├─ handle.stateOf / snapshot   → systemPrompt.context()    → C4 模型推送
            │                              → ctx.commands /progress    → C3 人类命令
            │                              → ctx.tools 只读 progress   → C5 模型拉取（需裁决）
            ├─ ctx.skills provider（静态正文，运行时读工具结果）       → C5 交接 skill（需裁决）
            └─ 其他会话通过宿主 observeSession 读取 wire 视图         → C6 多代理观察（需裁决）
```

接缝依据：

| 出口 | 宿主接缝 | 证据 |
|---|---|---|
| 浏览器 | 带 `wire` 块的投影对 client 可见；`faceOf(key: string)` 接受任意 key | `session-projection.md:44`；`[EV5]/packages/api/session-controller/src/client/sessions/projection-store.ts:106`；[DNPR] 已在用 `faceOf('todos')`（`[NPR]/src/client/view/ProgressBody.jsx:88`） |
| 不进会话列表行 | `wire.summary: false` | `session-projection.md:96,159` |
| 整会话、可缓存 | 驱动对每个已提交事件调用 `apply`；checkpoint 由 `session-projection-cache` 持久化 | `session-projection.md:336`；`session-projection/README.md:100` |
| JS 写的 schema | 运行时 `viewSchema` 只要求 `{ parse }` | `[EV5]/packages/session/session-projection/src/index.ts:220,680`；现有 `stateSchema: { parse }` 已在用（`[NPR]/src/host/projection.js:108`） |
| 模型推送 | PromptContext 只在内容变化或被压缩移除时写入日志 | `system-prompt.md:78,96`；`runtime-context.ts:170` |
| 人类命令 | 不经过模型；结果由 UI 直接显示，不是工具结果或会话事件 | `[EV5]/docs/subsystems/commands.md:57,93` |
| skill | provider 同步注册；可以单独设人类可调用和模型可调用 | `skills.md:11,100-102,128`；先例 `skill-badge/README.md:69` |
| 模型工具 | `ctx.tools.register` | `tools.md:662`；先例 [DNMSC] 的 `inspect_checkpoint` |
| 跨会话 | `sessionQuery.observeSession(sessionId, options)` | `session-query.md:390` |

### 4.3 账本的推导纪律（所有簇共用）

1. **只做确定性推导，推不出就留空**：沿用 `task-times.js` 的原则，不编造时间或 id（`[NPR]/AGENTS.md:151`）。
2. **只存指针**：seq、callId、指纹；不存命令原文、输出、任务正文以外的载荷。任务正文是 `todo/write` 的原样字段，只在 `wire` 视图里给人看；是否进入模型输入由 C4 裁决决定。
3. **上限作用在完整结果上**：每个集合都有上限，截断时在 `coverage` 中如实标记。
4. **fork 继承段沿用现有规则**：`event.seq < inherited` 的事件不计入（`projection.js:47`）。
5. **人类视图与账本共用一张分层表**：§4.4 的 A/B/C 分层是纯函数，放在 `src/shared/`，浏览器包和宿主包在构建时各自打入（同包内复用，不是插件间通道）。账本只记 A 层事实和 B 层计数，不记 B 层明细。

### 4.4 人类视图的精简分层（[业主] 已选定，见附录 A R7）

**问题**：[业主] 认可 Progress 现在的视觉报告（比 Trajectory 舒服），但它记录的内容超出了进度报告的需要，继续下去会变成第二个 Trajectory。根因是「一次工具调用一行」：当前的 `denoise` 只做两件事，把后台 job 并入发起它的工具行、不让无文字的 assistant 消息单独成行（`[NPR]/src/client/group.js:24-80`）；其余每个 read、grep、bash、todo_write 都各占一行。

**原则**：**一行 = 一个进度事实**，不再是一次工具调用。外观完全不变（28px 行、回合缩进、0.5px 引线、56px 时间列、失败红字、running 闪烁，`[NPR]/AGENTS.md` 「视觉体系」）。浏览器端不存数据，时间线每次从事件流重算（`[NPR]/AGENTS.md` 「使用」），所以精简只是换一种显示，完整细节仍在会话日志和 Trajectory 里，不违反单一真源。规则全部确定性计算，不调用模型。

**三层分类**

| 层 | 包含的行（`rows.js` 行型） | 处理 |
|---|---|---|
| **A 里程碑** | 人类 prompt（`rows.js:111`）；goal 轮次与变更（`:115`、`:121`）；每回合的结论消息，即 `group.outcome`（`group.js:140`）；**未恢复**的失败；等待：未决审批、被拒审批（`rows.js:193`）、`ask_user_question` / `wait_agent` / `send_message`（`constants.js:23`）；子代理派出与回报（`rows.js:207-225`）；任务计数**发生变化**的 todo 行（`rows.js:175`）；人类 slash 命令与失败的命令结果、交付物展示、上下文压缩（`events/turn.js:100-101,105,107-110`）；非 `completed` 的回合结束（`rows.js:182`） | 单独成行，与现在一样 |
| **B 动作段** | 探索：`read`、`grep`、`glob`、`working_directory`；修改：`write`、`edit`；命令：`bash`、`pwsh`、`terminal`；查阅：`web_fetch`、`web_search`；其他工具（`constants.js:19-33`） | 同一回合内连续的同类行合成一行步骤摘要，见下文合并规则 |
| **C 剥离** | 空消息与纯 reasoning 步骤（现在显示为 `(reasoning)`，`group.js:7-8`）；回合中间的叙述消息（非结论的 assistant 文本）；`completed` 的回合结束行；`todo_write` 工具行（与 `todo/write` 事件行重复，C0-01）；计数未变的 todo 行；已并入的 job 行；已批准或撤回的审批（状态并入对应工具行）；成功的 `command/done`；`Session ended`、模型切换、工作目录切换、plan mode 切换（`events/turn.js:102-104,106`） | 默认不显示；过滤条有内容时可见（见「细节入口」） |

**B 层合并规则**

1. **断段**：同一回合内连续的同类 B 行合成一段；遇到任何 A 行、换类或换回合就断开。段内只有一行时直接显示原行摘要，不加计数措辞。
2. **探索段**：「探索 · N 个文件、M 次搜索」，文件数按路径去重。
3. **修改段**：按路径合并。一个文件显示「修改 `<path>`（k 次）」，多个文件显示「修改 N 个文件」。
4. **命令段**：按命令指纹合并，指纹复用宿主的 `bashKey`（`[NPR]/src/host/projection.js:32`，经 `src/shared/` 共用）。同一回合里某指纹先失败、后来成功，显示「`<命令>` · 失败 k 次后通过」，段状态为 ok；该指纹在本回合的最后一次仍失败，就把这次失败**升为 A 层**单独红字成行。失败只认工具状态 `failed`；非零退出码按宿主语义不算失败（`[NPR]/AGENTS.md` 「不要」）。
5. **状态与时间**：段内有 running 行时显示 running 闪烁；时间列取段内最后一行的时间。

**展开深度（[业主] 选定：子步骤摘要）**

- 动作段点开后，每个子步骤一行摘要（现有行的 `summary` + 状态 glyph；失败子步骤附错误首行）。子步骤不能再展开。
- A 层行展开只显示人能读的正文：prompt 全文、结论消息全文、失败的错误文本、审批理由、子代理回报正文。
- Progress **不再显示** `argsRaw`、`resultText` 原文和 reasoning 正文（现在由 `view/Row.jsx:28-41` 渲染）。要看原始数据就去 Trajectory。注意 Trajectory 没有可链接的锚点（`ui-trajectory/README.md:114`），所以本包不提供「跳到轨迹」的链接。

**细节入口**：不新增控件（`SegmentedControl` 仍然禁止）。过滤条为空时显示精简视图；过滤条有内容时（`type:`、`status:`、`tool:` 或自由文本），按去噪后的原始行匹配并逐行显示，C 层行也可以被搜到。过滤菜单的计数继续按原始行统计。逐行显示时，行展开同样遵守上面的展开深度。

**示意**（手写例子，不是实测；实测压缩比见 §7.3）

```
现在（14 行）                          精简后（6 行）
修复登录超时                           修复登录超时
  (reasoning)                            探索代码 · 4 个文件、1 次搜索
  Read src/auth/login.ts                 Task list: 0/3 done
  Grep "timeout"                         修改 src/auth/login.ts（2 次）
  Glob src/**/*.test.ts                  npm test · 失败 1 次后通过
  Read src/auth/session.ts               Task list: 2/3 done
  Updated task list      ← 重复          我已修复……
  Task list: 0/3 done
  Edit src/auth/login.ts
  npm test               ✗
  Edit src/auth/login.ts
  npm test
  Task list: 2/3 done
  我已修复……
  Turn 3 ended: completed
```

---

## 5. v1.1 工作台账总览

| 簇 | 名称 | 主要消费者 | 合同影响 | 依赖 | 状态 |
|---|---|---|---|---|---|
| **C0** | 现有缺陷与卫生 | 消费者二 | 无 | — | 已交付（DNPR01 `ec513bb` 起，`T-O-14`） |
| **C1** | 进度账本真源（Ledger 投影） | 全部 | 无（只对浏览器可见；key 命名见 R1） | — | 已交付（DNPR01 `e5fefb2`，`T-O-4`/`T-O-5`/`T-O-6`/`T-O-7`/`T-O-9`） |
| **C2** | 人类进度面（UI） | 消费者二 | 无 | C1 | 已交付（DNPR01 `d7d9325`，`T-O-10`/`T-O-11`；C2-07 随 `T-O-16` 不做） |
| **C3** | 人类出口（导出、`/progress` 命令） | 消费者二 | 无（命令不经过模型） | C1 | 不做（`T-O-16`，重开条件不变） |
| **C4** | 模型推送（进度锚改为读账本、控制抖动） | 消费者一 | **需裁决 R2**（内容扩展）；纯降抖动不扩约 | C1 | 已交付（DNPR01 `7495b9c`，`T-O-12` 四行锚） |
| **C5** | 模型拉取（只读 `progress` 工具、交接 skill） | 消费者一、二 | **需裁决 R3** | C1 | 工具已交付（`read_progress`，DNPR01 `7495b9c`，`T-O-13`）；skill 随 `T-O-16` 不做 |
| **C6** | 公开读合同与多代理观察 | 消费者三、其他插件 | **需裁决 R4、R5** | C1 | 不做（`T-O-16`，重开条件不变；`wire.view` 已是只读公开合同） |
| **C7** | 进度报告精简（人类视图） | 消费者二 | 包内展示合同，**R7 已选定** | — | 已交付（DNPR01 `ec513bb`，`T-O-15`） |

执行顺序：C0 → (C7 ∥ C1) → (C2 ∥ C3 ∥ C4 降抖动部分) → 有裁决后 C4 扩展 → C5 → C6。

---

## 6. 分簇详设

### C0 现有缺陷与卫生

**证据**：见 §2.3 的「当前痛点」；`[SHOT]`。

| ID | 工作项 | 证据（file:line） | 做法 | 验收 |
|---|---|---|---|---|
| C0-01 | 合并重复的 Task list 行 | `constants.js:32`、`rows.js:154`（工具行）；`events/job.js:4-9`、`rows.js:175-181`（事件行）；`group.js:24`（`denoise` 未处理） | 在 `denoise` 中，同一 step 内已有 `todo/write` 行时，把 `todo_write` 工具行折进去，失败状态保留在事件行上 | `test/group.test.mjs` 新增用例：一次 `todo_write` 只出一行；工具失败时仍可见 |
| C0-02 | 待办图标与完成态区分开 | `view/TasksView.jsx:19` | 待办改为不带勾的空心圈，从宿主 catalog 或 `StateDot` 的非 ongoing 状态中选，不手绘 | `test/view.test.mjs` 断言待办不再使用 `IconCheckCircleOutlineRegular` |
| C0-03 | 折叠 prompt 里的注入上下文 | `events/message.js:14-15,22`；`rows.js:111` | 按格式识别：开头连续的 `<tag …>…</tag>` 或 `<tag …/>` 块折叠成「附带上下文」，标题只显示人话；展开时显示全文。不识别任何特定插件的标签名 | `test/rows.test.mjs`：带结构块的 prompt 摘要只剩人话，detail 保留原文；纯文本 prompt 不变 |
| C0-04 | 降低边界行的噪声 | `events/turn.js:99-110`；`rows.js:182` 起的 turn 行 | `lifecycle` 类型默认不显示（可以在过滤菜单里勾选显示）；`completed` 的 turn 结束行不再单独成行，`aborted`、`error`、`blocked` 等保留 | `test/view.test.mjs` 与 `test/group.test.mjs` |
| C0-05 | 过滤菜单不显示 0 计数项 | `filter-menu.js` 的 `filterCounts`；`ProgressBody.jsx` 中 menu 项的构造 | 0 计数的类型不显示；已选中的项即使为 0 也保留，避免选中后无法取消 | `test/filter-menu.test.mjs` |

### C1 进度账本真源（Ledger 投影）

**现状证据**

- 宿主已有一个私有投影 `nano-progress-report:summary`（`[NPR]/src/host/projection.js:105-113`），只记最近 8 个路径、8 个失败指纹、64 个未配对调用（`:3-5`），`turn/start` 时清空未配对调用（`:55`），没有 `wire` 块，浏览器读不到。
- 浏览器侧有另一套完整的行模型（`[NPR]/src/client/rows.js`、`group.js`），但只覆盖已加载的窗口（`ProgressBody.jsx:76,214`）。
- 结果：同一类事实被算了两次，而且浏览器拿不到整会话的数据。

**真源设计**

- 新增投影单元，key 为 `nano-progress-report:ledger`（命名见 R1），`stateVersion: 1`，带 `wire` 块并设 `summary: false`。
- 现有 `summary` 单元在 C4 完成迁移之前保持不变，避免同时改动模型输入。
- 浏览器通过 `faceOf('nano-progress-report:ledger')` 读取。时间线仍由浏览器窗口模型提供，作为证据层。

**wire 视图草案**（字段名在实现时定稿，上限是建议值）

```js
{
  v: 1,
  asOfSeq,                           // 计算到的 seq
  inherited,                         // fork 继承切点
  tasks: [{                          // ≤ 64，按首次出现排序
    content,                         // todo/write 原样字段（只给人看）
    status,                          // pending | in_progress | completed
    firstSeq, startedSeq?, completedSeq?, completedAt?,
    evidence: [[fromSeq, toSeq]],    // ≤ 16 个区间，见归属规则
  }],
  files: [{ path, op, lastSeq }],    // ≤ 64，op ∈ write | edit | apply_patch
  failures: [{ key, tool, firstSeq, lastSeq, attempts }], // ≤ 16，key 是指纹
  awaiting: [{ kind, seq, tool? }],  // 未处理的审批 / 提问，≤ 16
  truncated: { tasks, files, failures, awaiting },        // 布尔值
}
```

**推导规则**

| 规则 | 内容 |
|---|---|
| 任务身份 | 以 `content` 识别，与 `task-times.js` 一致。措辞改了就算新任务，如实处理，不做模糊匹配 |
| 跨 turn | 任务史**不随 `turn/start` 清零**。这正是官方 `todos` 投影没有的视角（`tool-todo/README.md:93`） |
| 证据归属 | 只在「恰好一个任务处于 `in_progress`」的 seq 区间内，把工具调用计入该任务；零个或多个进行中时不归属 |
| 文件与失败 | 沿用 P1 的配对与恢复规则（`projection.js` 中 `tool/result` 的分支），补上 seq 指针并放宽上限 |
| 待处理项 | `approval/asked` 与对应的结果配对；`ask_user_question` 的调用与结果配对 |

**台账**

| ID | 工作项 | 验收 |
|---|---|---|
| C1-01 | 实现 `src/host/ledger.js`（纯函数：`init`、`apply`、`parseState`、`view`） | `test/ledger.test.mjs`：每条推导规则各一组用例，覆盖空日志、fork 继承、截断、上限边界和多字节路径 |
| C1-02 | 在 `src/host/index.js` 注册（`:12` 旁边），`wire.summary: false` | `test/host-projection.test.mjs` 增补：注册后 `snapshot(session)` 含 ledger key；`summaryKeys()` 不含它 |
| C1-03 | 证据归属的正确性 | 离线回放 `[PROD]` 的样本会话，人工标注 ≥ 30 个任务区间，归属一致率 100%，或者不一致项全部属于「不归属」（宁缺毋错） |
| C1-04 | checkpoint 的往返与非法输入 | `parseState` 拒绝多余字段和超限集合（沿用 `projection.js:14-28` 的白名单重建写法） |
| C1-05 | 性能 | 用 `[PROD]` 中最大的会话做冷构建，单个事件的 `apply` 不扫描全量状态；记录冷构建耗时（只记录，不设闸门） |

### C2 人类进度面（UI）

**现状证据**：Tasks 读 `faceOf('todos')`（`ProgressBody.jsx:88`），完成时间来自窗口内的行（`:118`、`task-times.js:12`）；低干扰约束见 `[NPR]/AGENTS.md:150`。

**消费面与真源**：所有进度数据都从 `faceOf(ledger)` 读；时间线行仍来自 `progress` target（`events/index.js:28`），只作为证据。

| ID | 工作项 | 做法（遵守低干扰） | 验收 |
|---|---|---|---|
| C2-01 | Tasks 改为读账本 | 整会话的任务史，带准确的完成时间；`todos` 投影只用于判断「当前列表」 | `test/view.test.mjs`；live 脚本中窗口外的任务也显示完成时间 |
| C2-02 | 任务展开显示证据 | 任务行用 `DisclosureRow` 展开，列出 `evidence` 区间内的步骤（从时间线行中按 seq 取；区间不在窗口内时显示「加载更早」按钮） | `test/view.test.mjs` |
| C2-03 | 过滤词 `task:#n`、`file:<path>` | `filter.js` 的词法增加两个 key；点击任务行或文件行时写入查询串；未知值退化成文本（现行规则） | `test/filter.test.mjs` |
| C2-04 | footer 增加 Files、Failures 列表 | 沿用现有的 `Jobs N` 文本开关模式，只在有数据时出现；不新增 `SegmentedControl` | `test/view.test.mjs`；`check-ui-rules` NPR 行 0 告警 |
| C2-05 | 回合尾部显示元信息 | 回合耗时和非 completed 的结束状态放进 opener 行的 56px 时间列，不新增行或分组头 | live 脚本中时间列右缘对齐的断言保持通过 |
| C2-06 | 离开期间的新进展 | 上次查看的 `asOfSeq` 存进浏览器本地（视图状态）；回来时在第一条新行上方显示一条细分隔线 | 新浏览器键登记到 `[NPR]/AGENTS.md` 「配置与状态」 |
| C2-07 | 当前状态行 | 顶部一行「现在：#2 … · 1 个失败 · 1 个待审批」 | **需裁决 R6**：与「不要状态带」冲突，未裁决不做 |

### C3 人类出口

| ID | 工作项 | 接缝与证据 | 验收 |
|---|---|---|---|
| C3-01 | 导出 Markdown 报告 | 纯函数 `src/shared/report.js`：输入 ledger 视图，输出 Markdown（任务及完成时间、改动文件、未解决失败、待处理项、覆盖范围说明）。浏览器端从工具条的溢出 `Menu` 触发「复制进度报告」 | `test/report.test.mjs`：固定输入下快照一致；截断时报告里写明 |
| C3-02 | `/progress` 人类命令 | `ctx.commands.register`（可选 inject，缺失时不注册）；handler 用 `handle.stateOf(agent.session)` 加 `report.js` 生成文本；结果由 UI 直接显示，不经过模型（`commands.md:57`） | `test/command.test.mjs`：无进度时返回明确的空状态文本；有进度时与 C3-01 输出一致 |
| C3-03 | 文档 | `[NPR]/AGENTS.md` 的「身份」（宿主 inject 增加可选的 `commands`）、「使用」、「验收」 | 文档与代码一致 |

`/progress` 会写 `command/run` 和 `command/done` 事件，但它们不是模型可见内容。命令不需要输入，因此设 `recordInput: false`（`commands.md:49`）。

### C4 模型推送

**现状证据**：`src/host/index.js:14-20` 注册 `order: 180`、`required: false` 的上下文；`context.js` 只输出计数和路径；`[PROD]` 中平均每个会话约 13 份快照，每份都带路径（§2.1）。

| ID | 工作项 | 合同影响 | 验收 |
|---|---|---|---|
| C4-01 | 降抖动：路径改为「数量加最近 N 个的稳定集合」，只在任务状态、失败集合、活动数量变化时才改变文本 | **不扩约**（不增加新的信息类别，只减少重发） | 离线回放：用旧、新两版 `formatProgress` 跑同一批 `[PROD]` 会话，统计每个会话的快照数。目标值由 [业主] 确认（建议降低 ≥ 50%）；单份 ≤ 600 字节不变 |
| C4-02 | 锚改为读账本 | 不扩约（只换数据来源，输出类别不变） | `test/host-context.test.mjs` 的现有用例全部通过 |
| C4-03 | 内容扩展：当前进行中任务的正文、未解决失败的工具名和路径 | **需裁决 R2** | 裁决后：措辞从模型视角写，固定文本由单测锁定；600 字节上限是否调整一并裁决 |

### C5 模型拉取与交接 skill（需裁决 R3）

| ID | 工作项 | 设计 | 验收 |
|---|---|---|---|
| C5-01 | 只读工具 `progress` | 参数 `{ view: 'summary' \| 'tasks' \| 'files' \| 'failures' \| 'awaiting', filter?, sinceSeq? }`，`filter` 复用 `filter.js` 的词法；结果有上限，带 seq 指针，不含原始载荷。工具调用本身写入日志，满足「模型可见 ⟺ 写入日志」（`[EV5]/CLAUDE.md:138`） | 单测锁定 schema 和描述文本；超限、空结果、非法参数各一组用例 |
| C5-02 | 附带 skill `progress-handoff` | `ctx.skills` 注册一个固定条目（照 `skill-badge/README.md:69`），人类和模型都可调用（`skills.md:128`）。正文教模型用 `progress` 工具写交接、PR 描述或复盘；没有工具时改为读进度锚 | skill 目录中出现该条目；正文中的约束（只陈述事实、引用指针）由单测锁定 |
| C5-03 | 文档 | `[NPR]/AGENTS.md` 增加 Model Experience 段，写明 token 和 KV 缓存的影响 | — |

注意：skill 一旦注册，它的名字和描述就可能出现在模型可见的 skill 目录里。所以注册本身也属于 R3 的裁决范围。

### C6 公开读合同与多代理观察（需裁决 R4、R5）

| ID | 工作项 | 设计 | 验收 |
|---|---|---|---|
| C6-01 | 公开读合同 | 把 ledger 的 `wire` 视图结构（含 `v`）登记为对其他插件公开的只读合同；写明消费者必须在 [DNPR] 缺失时正常降级；结构变化只能追加字段，破坏性变化要升 `v` | **需裁决 R4**；合同只登记在 `[NPR]/AGENTS.md` 一处 |
| C6-02 | 身份维度 | 每一行按会话绑定关系得出 actor（用户、本会话、子会话），过滤词 `actor:`；Fusion 的 Lead、Sidekick 身份来自宿主公开的配对事实（`[FUS]:267`），不按模型名猜 | `[FUS]` C06 的五类 fixture（`[FUS]:349`） |
| C6-03 | 跨会话观察 | 观察者通过 `observeSession` 读子会话的 ledger 视图；随面板生命周期申请和释放；未授权时只显示已知的根事实和占位 | 关闭面板或切换根会话后，额外的观察引用数回到 0 |
| C6-04 | 与 `[FUS]` §11.4 对齐 | `[FUS]:416` 要求 `conversation.view` 加 `SegmentedControl`，与本包低干扰合同（`[NPR]/AGENTS.md:5,150`）冲突。本文建议改用 `actor:` 过滤词加过滤菜单里的「身份」分组 | **需裁决 R5**：裁决结果只登记一处，另一份文档改为引用 |

### C7 进度报告精简（人类视图，规则见 §4.4）

**现状证据**：一调用一行（`group.js:24-80` 只折 job 和空消息）；展开显示 args、result、reasoning 原文（`view/Row.jsx:28-41`）。不依赖 C1，可以和 C1 并行。C0-01、C0-04 是 C 层的子集，C7 落地时一并完成。

| ID | 工作项 | 做法 | 验收 |
|---|---|---|---|
| C7-01 | 分层与合并纯函数 | `src/shared/condense.js`：`classify(row)` 返回 A、B（带类别）或 C；`condenseGroup(group)` 在 `groupRows` 之后把 B 行合成段行、剔除 C 行，段行带 `children` | `test/condense.test.mjs`：每个行型的归层；断段（A 行、换类、换回合）；单行段不加计数；路径去重；结论消息保留、中间消息剔除 |
| C7-02 | 命令指纹与「失败后通过」 | 把 `bashKey`（`host/projection.js:32`）移到 `src/shared/`，宿主和浏览器共用；回合内同指纹先失败后成功折叠，最后仍失败则升为 A 行 | `test/condense.test.mjs`；`test/host-projection.test.mjs` 现有用例保持通过 |
| C7-03 | 默认精简、过滤时逐行 | `ProgressBody.jsx`：过滤条为空时渲染 `condenseGroup` 结果；非空时沿用 `applyFilter` 逐行渲染；过滤菜单计数仍按原始行 | `test/view.test.mjs` 两种模式各一组用例 |
| C7-04 | 展开深度收敛为子步骤摘要 | `Row.jsx`：段行展开列出子步骤摘要（失败附错误首行），子步骤不可再展开；删除 `argsRaw`、`resultText`、reasoning 的渲染 | `test/view.test.mjs` 源码断言不再渲染 `data-field="args"`、`"result"`、`"reasoning"` |
| C7-05 | 包内合同同步 | `[NPR]/AGENTS.md`：开头「执行流」改为「进度报告」；「验收」第 4 条改为按 A 层与动作段描述；「使用」表的「点击行」与过滤条行；「不要」中「展开的 payload 里保留原始输出」改为「原始输出只在 Trajectory」 | 文档与代码一致；决定本身登记在 [DNPR01-qna `T-O-3`](qna/DNPR01-qna.md)，`AGENTS.md` 只是落地后的包合同文本 |
| C7-06 | 压缩比实测 | 离线回放 `[PROD]` 样本会话，统计每回合精简前（`denoise` 后）与精简后的行数 | 数字写回 §7.3；只记录，不设闸门 |
---

## 7. 收口目标与完成度界定

### 7.1 收口的两个层级

| 层级 | 范围 | 判定 |
|---|---|---|
| **v1.1 基线收口** | C0、C7、C1、C2（不含 C2-07）、C3、C4-01、C4-02 | 除 C7 改动包内展示合同（R7 已选定）外，这些项不改任何合同；全部完成才算 v1.1 收口 |
| **v1.1 扩展收口** | C4-03、C5、C6、C2-07 | 每一项只在对应裁决落地后才计入；没有裁决的项在本文登记为「裁决待定」，**不算未完成** |

> DNPR01 状态：基线收口项中本阶段交付的 C0/C1/C2（除已划入不做的 C2-07）/C4-01/C4-02/C5-01/C7 已完成并合并；C3、C5-02、C6、C2-07 随 `T-O-16` 划入附录 B（重开条件不变）。C1-03 未执行，如实登记范围外。

### 7.2 完成度锚点

| 锚点 | 要求 | 位置 |
|---|---|---|
| 单测 | `npm test` 全部通过；新增 `test/ledger.test.mjs`、`test/condense.test.mjs`、`test/report.test.mjs`、`test/command.test.mjs`，并在现有 `group`、`rows`、`view`、`filter`、`filter-menu`、`host-projection`、`host-context` 测试中补充用例 | `[NPR]/test/` |
| UI 规则 | `node scripts/check-ui-rules.mjs` 的 NPR 行 0 告警；`test/view.test.mjs` 的源码规则（不手绘 SVG、不用色值、不手写状态栏）继续有效 | 仓库 `scripts/` |
| 构建产物 | `npm run build` 后 `lib/host.js`、`lib/client.js`、`lib/perf-declaration.js` 非空；`npm pack --dry-run` 不含 `src/`、`test/` | `[NPR]/AGENTS.md` 「构建」 |
| 离线回放 | 一次性只读回放 `[PROD]`，产出四个数字并**写回本文 §7.3**：C1-03 的归属一致率、C4-01 每个会话快照数的前后对比、C1-05 最大会话的冷构建耗时、C7-06 每回合行数的精简前后对比。回放输出按 `.gitignore:108-110` 不入库 | 本文 §7.3 |
| live（可选，不作闸门） | `test/live/tab.live.mjs` 增补：窗口外任务显示完成时间、任务展开出证据、Files 和 Failures 开关、0 计数项隐藏 | `[NPR]/test/live/` |
| 包内文档 | `[NPR]/AGENTS.md` 的「身份」「使用」「配置与状态」「验收」「不要」同步更新；如果 C5 裁决通过，增加 Model Experience 段 | `[NPR]/AGENTS.md` |
| 无新路由 | 宿主不新增 HTTP 路由，`security/route-sensitivity.json` 不需要改动 | 仓库安全清单 |
| 规格回写 | 每个簇完成后，在 §5 的「状态」列标记完成并附上提交号 | 本文 §5 |

### 7.3 回放结果

DNPR01 于 2026-11-20 对 `~/.dsh-desktop/sessions/**` 全部 341 个会话日志做只读回放（`test/live/prod-replay.mjs`，输出 `evidence/prod-replay.json` 按 `.gitignore` 不入库），33 个顶层会话满足回放门槛（≥1 个开项 `user/message` + ≥1 个 `tool/call`）。

| 指标 | 基线 | v1.1 | 目标 |
|---|---|---|---|
| 每个会话的进度锚快照数（`[PROD]` 同一批会话） | 89 / 7 ≈ 12.7 | **DNPR01 实测**：33 个顶层会话 138 次模型请求，锚文本变化次数 127 → **84**（−34%；以 `request/context` 为发射点逐字比对新旧 format；发射时机由宿主决定，本测量不计未发射快照） | 由 [业主] 确认（建议 ≤ 6.4） |
| 证据归属一致率（人工标注 ≥ 30 个任务区间） | — | **本机未复跑**：C1-03 在 DNPR01 范围外（计划 §2.3，重开条件），不做归因推断 | 100%，或不一致项全部属于「不归属」 |
| 最大会话的冷构建耗时 | — | **DNPR01 实测**：49 387 事件会话冷构建 912.7ms；33 会话均值 148.4ms（`test/live/prod-replay.mjs`，含 JSON 解析） | 只记录 |
| 每回合可见行数（精简前 / 精简后，`[PROD]` 样本会话） | 待填 | **DNPR01 实测**：33 会话按工作项分组，原行（tool/call + assistant/message）100 016 → 精简段近似 48 472（**−52%**；类别序列合并口径，不含 C 层剥除，实际界面行数更低） | 只记录 |

---

## 8. Verdict

v1.1 完成后，预期 [DNPR] 在以下维度带来价值。标「已有证据」的项有实测数据支撑，标「待验证」的项由 §7.3 的回放数字来证实或否定。

| # | 维度 | 受益方 | 价值 | 依据 |
|---|---|---|---|---|
| 1 | 与 Trajectory 分工清晰 | [dsh] 生态 | 执行记录归 Trajectory，进度账本归 [DNPR]。两者不再重叠，各自都有存在理由 | §1.3 |
| 2 | 整会话的进度真源 | 全部消费者 | 一处计算、只存指针、翻页和压缩都不影响；浏览器和模型读到同一份事实 | 投影接缝（`session-projection.md:5,336`）；官方同类先例 |
| 3 | 模型在压缩后的连续性 | [dsh] 原生模型生成 | 进度锚从「计数」升级为「可执行事实」（需 R2），并借助宿主的重写语义覆盖摘要里的旧事实 | 已有证据：生产中 7 个会话、89 份快照；`runtime-context.ts:170` |
| 4 | 模型成本控制 | [dsh] 原生模型生成 | 降低进度锚的重发频率，减少 `runtime-context` 消息带来的 token 和 KV 缓存消耗 | 待验证：C4-01 的回放数字 |
| 5 | 模型自查与交接能力 | [dsh] 原生模型生成 | 按需拉取任务证据和未解决失败；用交接 skill 生成有指针支撑的交接说明，而不是凭记忆复述（需 R3） | C5 |
| 6 | 人类的进度掌控 | [业主] | 视觉不变而行数下降：一行一个进度事实；跨回合的任务史、任务与证据联动、改动文件和阻塞汇总、离开期间的进展 | C7、C2；`[SHOT]` 的问题全部有对应工作项；待验证：C7-06 的行数对比 |
| 7 | 人类的交接效率 | [业主] | 一键导出报告；`/progress` 不经过模型即时返回 | C3 |
| 8 | 多代理可观测 | Fusion、team lead | 按身份的执行视图、子会话进度，填补官方刻意留下的同步空白（需 R4、R5） | `agent-team/README.md:81`；`[FUS]:349` |
| 9 | 生态复用 | 其他插件 | 一份带版本、可降级的公开只读投影，取代各插件重复解析日志（需 R4） | C6-01 |

**总评**：v1.1 的核心不是新功能的数量，而是把 [DNPR] 的价值从「浏览器里的一种视图」迁移到「宿主里的一份进度真源」。基线收口（C0–C4 降抖动部分）不碰任何合同，完成后就足以让 [DNPR] 拥有 Trajectory 没有的能力：整会话、跨回合、带证据。之后每一个裁决都是在同一份真源上开一个新出口，而不是另起一套机制。

---

## 附录 A：待 [业主] 裁决清单

| 编号 | 事项 | 本文建议 | 影响的簇 |
|---|---|---|---|
| R1 | 账本用新 key 还是扩展现有 key | 新开 `nano-progress-report:ledger`；`summary` 在 C4-02 完成后退役 | C1、C4 |
| R2 | 进度锚能否包含当前任务正文、失败的工具名和路径；600 字节上限是否调整 | 允许当前任务正文和失败位置，上限不变 | C4-03 |
| R3 | 只读 `progress` 工具和 `progress-handoff` skill 是否上线 | 先上工具，skill 随后 | C5 |
| R4 | ledger `wire` 视图是否登记为对其他插件公开的只读合同；跨会话读取的范围 | 登记；跨会话只限本 team 树 | C6 |
| R5 | `[FUS]` §11.4 与本包低干扰合同的冲突 | 改用 `actor:` 过滤词和过滤菜单里的身份分组，不恢复 `SegmentedControl` 和 `conversation.view` | C6-04 |
| R6 | 是否允许顶部「当前状态行」 | **不做**：`T-O-16` 连同 C2-07 划入附录 B；重开条件 `R1`/`R3`/`R5`/`R7` 之外再改约才谈 | C2-07 |
| R7 | 人类视图的精简方式 | **[业主] 已选定**：§4.4 的 A/B/C 分层；动作段展开到子步骤摘要，Progress 不显示 args、result、reasoning 原文；回合中间的叙述消息默认隐藏。唯一登记见 [DNPR01-qna `T-O-3`](qna/DNPR01-qna.md)，本文只引用；执行细节冻结为 `T-O-15` | C7 |

## 附录 B：明确不做

- `T-O-16` 划入范围外的项：C1-03 归属人工标注、C2-02 任务卡片、C2-03 证据链、C2-06 导出、C2-07 状态行、C3 人类出口、C5-02 交接 skill、C6-02/03 读合同登记、R6/C2-07、`conversation.view`、分段控件、身份过滤、旧检查点迁移、`Config` 化上限、RELEASE.md/CI、附录 C 的 89 个文件、`deploy-local`。重开条件见 `qna/DNPR01-qna.md` `T-O-16` 与计划 §2.3。
- 不复制 Trajectory 的原始数据检查器、token 和耗时分析；Progress 不显示工具的 args、result 原文和 reasoning 正文，也不提供跳到 Trajectory 的链接（宿主没有可链接锚点，`ui-trajectory/README.md:114`）。
- 不造共享 todo，不写任务板，不唤醒成员，不代发消息（`tool-todo/README.md:169`；`agent-team/README.md:81`）。
- 不 `ctx.provide` 插件间服务，不开 HTTP 或 MCP 路由（`[REV]` §4，重开条件不变）。
- 不改 [DNMSC] 的切点、帧和台账（`[INIT]:372`）。
- 不在浏览器保存事件副本；浏览器只存视图状态。
- `progress_checkpoint`（模型主动声明里程碑）列为 v1.2 候选，不在 v1.1 范围内。

## 附录 C：仓库事务（不属于 [DNPR] 范围，仅登记）

- 合并提交 `1e41d91` 把 89 个 evidence 文件（`docs/code-review/26-nov/evidence/dncs-1119/`、`docs/specs/dsh-nano-kitesurf/1119-evidence/`）提交进了 main。`.gitignore:108-110` 的规则只能阻止新文件被加入，已经被跟踪的文件不受影响。是否从索引移除由 [业主] 决定。
- 生产的 web 和 desktop 实例安装的仍是带 `conversation.view` 的旧版 client；dev 实例是 lowkey 版。是否升级生产实例由 [业主] 按 `RELEASE.md` 安排。
