# Decision 模型 × Fusion 模式可行性综合评估（2026-11-19）

> 综合三路深度调研（官方法医级拆解 / 30+ 社区声音 / router benchmark 文献）+ [DNMS]/[DNMSC]/[DNPR] 挂点 `file:line` 核实 + [decision-model-eval-1119.md] 四家实测 + [业主] 四点事实补充与两张 Devin CLI 截图，回答一个目标问题：**我们能否用某个 decision 模型复刻 Devin Fusion 式的"会话内多模型协作 + 动态路由 + 单心流呈现"**。本文件为分析 spec，不含实现；任何合同级改动（新 ledger kind、lane 标记、brief schema、持久 sidekick 生命周期）需 [业主] 先行裁决，符合"不得擅自扩约 / 单一真源 / 不得侧载 / 上层建筑归 host / UI 宿主优先"。

---

## 0. 结论先行

- **Fusion 的真身是"两个持久 agent（lead + sidekick）在同一心流里合并呈现"**，不是一个 agent 每 turn 换模型——[业主] 截图证实 Lead/Sidekick 是并列两 picker、`Sidekick Free` 定价、会话状态栏以 `Fusion · Lead ◆ Sidekick` 单一身份呈现。社区逆向证实 session.model = `fusion-<lead>-sidekick-<sidekick>`、助手行按 actor 打标。
- **[DNMS]/[DNMSC]/[DNPR] 已握有几乎全部接缝**：`agent/pre-step` 判定挂点、`subagent({provider,model,reasoning_effort})` 持久成员、`agent/created`→`agent.model.select` 换路由、`agentTeam` 任务板、`recordAsyncDecision` 审计；**[DNPR] 已把"会话事件流→第二执行视图"验证为可实现面**（自建 `'progress'` view target + workbench tab + `conversation.view` 视图，单一真源、无自有 DB），**Fusion 的"actor 打标心流"从硬缺口收窄为"lane 归因 + 跨 session 订阅"两个可实现项**。
- **决策层**：decision 模型（System One 四 provider）是 2026 最被低估的路由形态——免训练、概率输出（margin=等效信号）、~$0.00003/次、亚秒级。但**判定必须异步、阈值按 provider 校准、不能挂关键路径**。
- **预期锚定**"机械任务持平、省 30–50%、可解释"，而非官方 60%。

---

## 1. [业主] 四点事实：逐条 `file:line` 核查 + 评价

> 每条先给核实证据（文件:行），再给"对评估的影响"评价。

### 事实①：官方在最新 rc5 pin 里有 `agent-team`；把 Fusion 当 team 理解成立，但接缝要换

**核实**：`agent-team` 真源在 DSH checkout，`.dependencies/eval/deepseek-harness/packages/team/agent-team/`。

- `src/types.ts:6` —— `@deepseek-ai/dsh-agent-team`，注释 "adds a durable shared task board to an existing subagent tree"。
- `src/types.ts:98-108` —— `TeamProjection { enabled, tasks: TeamTaskView[], failure }`：**只投影任务板，不投影成员心流**。
- `README.md:63` —— "Members use standard `subagent`/`subagent_fork`… The returned name… addresses the teammate." 成员仍走标准子代理。
- `README.md:152` —— "The Web UI displays tasks only. Ordinary subagent navigation owns the member list." **UI 只显任务、成员流仍分开**。
- `src/types.ts:174-185` —— `team/task`（Lead Session 持久）/`team/member`/`team/mode` 事件。

**评价**：**成立，但需定性**。"把 Fusion 当 team"在**结构正确**（lead=根、sidekick=一个成员）；"接缝要换"也正确——但**不是换成"团队心流"**，而是换成"**持久团队成员**"。`agent-team` 只是任务板，**它不负责 Fusion 的"同一心流"**——那是 host 的子代理导航层，与 team 正交。所以接缝换的方向是：**从"每次 `subagent` 一次性派发"升级为"持久 sidekick 团队成员 + 任务板当 brief/result/feedback 交接"**。

### 事实②：Fusion 是 side-by-side、同一份心流；dsh 子代理与主代理视觉完全分开

**核实**（Devin CLI 截图 + 官方文档 + 社区逆向）：

- 截图1 状态栏：`Fusion · GPT-6.2 Astra ◆ SWE-2 Medium · bypass · Goal running` —— **单一会话身份、双模型配对、同一 interface**。
- 截图2 模型选择器：**Lead 与 Sidekick 并列两 picker**，各自独立 effort、`Fast Mode`、`opt+p pin`、`opt+↵ this session only`、`Sidekick Free`。
- 文档（[docs.devin.ai/cli/fusion](https://docs.devin.ai/cli/fusion)、[desktop/fusion](https://docs.devin.ai/ja/desktop/fusion)）：**"Lead 始终是面向用户的那个 agent，Sidekick 不直接对用户回话"**。
- 社区逆向（[amirfish1/claude-command-center@1489e1f](https://github.com/amirfish1/claude-command-center/commit/1489e1f0b961bda7be6fd1aa3a20902b10cee333)）：session.model=`fusion-<lead>-sidekick-<sidekick>`；**助手行按 `model` 区分 lead/sidekick turn，无 actor 字段时靠模型匹配**；sidekick 经系统通知行回报。[LodyAI#1072](https://github.com/LodyAI/Lody/issues/1072) 证实同流可区分。

**评价**：**这是最关键的事实，推翻了我前一轮"Fusion=单 agent `model.select` 换模型"的推断**。Fusion 是**两个并行 agent 各自持独立缓存上下文、在 UI 上合并成同一心流**。它**不是**架构 A（共享上下文换模型），而是架构 B 的 UI 形态。对我们的含义：**"同一心流"是 Fusion 唯一无法用现成子代理 UI 复刻的硬缺口**——host 的助手流按 agent 分组、无 lane/actor 标记。

### 事实③：[DNMSC] 异步压缩比官方更积极，且规则随用户设置漂移

**核实**：`dsh-nano-model-selector-compaction/lib/host-compaction.js`。

- `:135 _policy()` —— 每次 `agent/pre-step` **重读** `async-compact.json`（B/H/pinned/model/extraRequirements），**下一边界即生效**。
- `:902-904` —— B 抬高导致 `fill < bufferSizeAsync` → `_disarmEpisode`：在飞 episode 被当场撤下（`drop` reason `disarmed`）。
- `:435 _disarmEpisode` / `:445 _preemptEpisode` —— 同步 lane（manual/FULL/model-switch/overflow）可抢占在飞 episode。
- `:739 compactIfNeeded` + `:742 'pressure' / 'context-overflow' / 'model-switch'` —— **五个 trigger** 远比官方"到点压缩"积极；`:967` 还有 `selectSpec` 的冻结契约。
- `:274-283` —— `agent/request` model-switch：换模型时强制把历史压到 B 线下。

**评价**：**属实且是双刃剑**。"更积极 + 规则漂移"意味着：**Fusion 的"compaction 时刻换模型=免费窗口"在我们这里时机不可预测**（B/H 可能刚被用户改过、prune/disarm 随时触发）。好处：**窗口更多、更频繁**，换模型的免费时机更密。风险：决策层若把"换模型"挂在 commit 点，可能撞上 user 刚调的 B 线或一次 disarm——**路由决策必须容忍 compaction 规则漂移**，不能把"换模型"硬绑定在某个假定稳定的压缩点。

### 事实④：DNMS 新版 sub-agent 可指定模型；该缝已存在，改名 sidekick 只是表层

**核实**：`dsh-nano-model-selector/` + DSH `tool-subagent` + 社区实锤。

- `dsh-nano-model-selector/lib/subagent-default.js` —— `subagent-default.json` policy（schema 1, `{enabled,provider,model,reasoningEffort}`）；`routeOfAgent()`/`shouldApplyDefault()`/`selectionOf()`。
- `dsh-nano-model-selector/index.js:702` —— `ctx.on('agent/created', ...)` → `:711 agent.model.select(selectionOf(loaded.policy))`：未显式指定模型的子代理在创建时改用该组合。
- `index.js:54` —— `SUBAGENT_DEFAULT_ROUTE='/nano-model-selector/subagent-default'` GET/PUT。
- i18n `subagentHint` —— "单次调用里写明的模型仍然优先"：显式 `model` 优先于默认。
- DSH `packages/subagent/tool-subagent/src/index.ts:249-257` —— `subagent` 工具 schema 原生含 `provider`/`model`/`reasoning_effort`；`:180` `modelSelectionEnabled`/`agentOptions` 能力校验。
- 社区实锤：`dsh-subagent-model-config`、`dsh-delegation-hub`、`dsh-team-member-model` 三个插件都复用同一 `agent/created`→`model.select` 缝给团队成员配模型；`dsh-team-member-model` README 明指宿主用 `sessions.subagentAddress(...)===void 0` **明确禁掉** per-subagent 模型选择器，插件补上。

**评价**：**属实，但"改名 sidekick"远小于真实工作量**。缝是真的（团队成员可持独立模型+effort），但 Fusion 的 sidekick 不是"任务级子代理"——它是**持久、长驻、跨委派复用**的成员，且与 lead **共享同一心流**。所以缝要做两层：(a) 命名/默认路由——`subagent-default` 已能当"sidekick 默认模型"；(b) **生命周期与心流**——把一次性 subagent 提升为"session 级持久 sidekick"，并解决 lane 标记。前者是配置，后者是架构。

---

## 2. Devin Fusion 法医级拆解（修正版）

### 2.1 机制真相（经截图+社区逆向修正）

| 机制 | 官方/实证 | 关键修正 |
|---|---|---|
| **双持久 agent，各自独立缓存上下文** | lead(前沿)+sidekick(便宜) 两个全工具 agent，各自持持久 cached context | ✅ 截图证实 Lead/Sidekick 是**两独立模型选择**，非同一模型换档 |
| **同一心流、actor 打标** | 两个 agent 合并进一条流，助手行按 model 区分 lead/sidekick | ✅ 截图：`Fusion · Lead ◆ Sidekick` 单一 session 身份；sidekick 不直接对用户回话，经系统通知行回报 |
| **brief/result/feedback 交接** | 只交换结构化简报、结果、反馈，不共享完整转录 | ✅ 保持缓存独立的关键 |
| **按配对调优** | 弱 sidekick→更 prescriptive brief+lead 探索；强 sidekick→可挑战 lead | ✅ 截图：Lead/Sidekick 各自独立 effort，组合自由 |
| **Sidekick Free** | SWE-2 Medium 标 "Free"（$0/Mtok） | ✅ 截图证实：sidekick 用自家近免费执行模型是成本经济学一部分 |
| **Mid-session 轻量分类器** | 执行中判断何时委派/收回 | ⚠️ 仍黑箱；决定"哪部分算 mechanical"——-27 分事故的责任层 |
| **"Compaction 时刻换模型"** | 官方描述：换模型安排在 cache 必丢点 | ⚠️ **仅适用于架构 A（共享上下文）；对 B（真 Fusion）不适用**——B 的免费来自"两 agent 各自缓存、brief 交接不碰对方 cache"，不来自某个换模型 trigger |

### 2.2 数字法医学（同前）

35%→60%（同基准换数据批次）/ 41%（Fable，停访前未调优）/ 39%（local-fusion）/ 43%（AA 独立测 Astra 配对）；发布日 Fusion 无 Fable 47.9<Opus4.8 solo 48.8；88% PR 无分母；-27 分自曝；AA v2.1 Fusion(Opus5.5+Luna) Index58 但 $8.75/54.9min/12.4M token/87% cache。详见 §9 参考锚点。

---

## 3. 社区声音（30+ 声音，同前精简）

- **槽点**：成本宣称不信任（独立复刻 Astra+Grok4.6 反而更贵）；速度偏慢（复刻 5×）；难任务回退（"lead 思考时已解难题，sidekick 只剩粗活"）；ACU 不透明；classifier 不透明；"compaction 不也是 cache miss"。
- **需求**：BYOK/自定义配对（截图证明官方已部分满足：Lead/Sidekick 两 picker）；可观测路由；按 workload 门禁；额度可预测；sidekick 上下文够大。
- **共识**：模式早被自搭接受、Fusion 是正名+缓存经济学；哑路由被疑、编排被认可。

---

## 4. Benchmark 支撑（同前）

帕累托真实但窄（RouterArena ~35%/-<2%）；多数学习式路由不赢 Zero router；强模型过选；SaveRouter 证明监督常永不回本（30–60% 饱和）；decision model=2026 最被低估形态（概率/margin/趋零成本/亚 100ms）；所有基准单轮 QA、agentic 零证据。详见 §9。

---

## 5. [DNMS]/[DNMSC] 接缝 / 合同 / hook（修正版）

> 修正点：Fusion 是架构 B（双持久 agent + 合并心流），接缝从"`subagent` 当一次性 sidekick"升级为"**持久团队成员**"；`model-switch` trigger 仅适用于架构 A，对 B 不是"免费换模型"的来源。

| Fusion 要素 | 已有接缝 `file:line` | 缺口 |
|---|---|---|
| 两个 agent 各自独立模型+effort | `tool-subagent/src/index.ts:249-257`（`provider`/`model`/`reasoning_effort`）+ `index.js:702` `agent/created`→`model.select` | 需把一次性子代理提为**持久团队成员** |
| sidekick 默认模型（BYOK） | `lib/subagent-default.js` policy + `index.js:54` `/subagent-default` 路由 | 需"sidekick 推荐位"（flash/free 档） |
| 同一心流、actor 打标 | **[DNPR] 已把"事件流→执行视图"验证为可实现面**（见 §5.5）；剩余是 lane 归因 + 跨 session 订阅 | **收窄缺口：lane 归因信号 + 合并订阅（`lane` 字段或双 binding）** |
| brief/result/feedback 交接 | `agentTeam` 任务板（CAS、`blockedBy`、`writeScopes`） | 需"委派"一等实体（非普通消息） |
| 判定时机（mid-session 分类器） | `host-compaction.js:739 compactIfNeeded` → `:853 _pressureGate`（`agent/pre-step`） | 需异步挂点 + `route` ledger kind |
| 上下文重写时的免费窗口 | `:274-283` `agent/request` model-switch（**仅架构 A**） | B 里两 agent 各自 cache，无需此窗口 |
| 可观测路由 | `recordAsyncDecision` JSONL | 新增 `route`/`delegate` kind |
| session-only / pin | `subagent-default.json` 持久 | 需区分 session vs 持久 scope |

### §5.5 [DNPR] 核检——"Fusion 单心流"的天然骨架

**`[DNPR]`（`dsh-nano-progress-report`，插件 id `nano-progress-report`）= 会话执行轨迹的第二视角渲染器**：chat 按消息组织、Progress 按执行单元组织（指令→工具→结果→边界），加过滤 + Tasks/Jobs 抽屉。它把 Fusion 最大的硬缺口——"actor 打标的合并心流"——从"host 需加 lane 字段"收窄为"**在既有 view-target 接缝上加 lane 维度 + 跨 session 订阅**"。

#### 数据面（`file:line` 核检）

| 接缝 | 位置 | 合同角色 |
|---|---|---|
| 事件定义 + `'progress'` view target | `src/client/events/index.js:26-29` | `ctx.uiConversation.events.register()` ×10 + `views.register({target:'progress', create:()=>new ProgressBuilder()})` |
| 消费快照 | `src/client/view/ProgressBody.jsx:85` | `ctx.uiConversation.binding(sessionId).target('progress')` ——每 session 一份只读 rows/timeline/counts |
| workbench tab | `src/client/index.js:37-49` `sidebarRightTabs.register(kind:'progress')` + `:53` `sidebar.right.pane.tab` 注入 `ProgressBody` | 右侧 [dsh工作台] |
| conversation 视图 | `:59-66` `conversation.view`（order 30，在 chat/trajectory 后） | 聊天区第二视角 tab |
| 会话头动作 | `:68-79` `conversation.session.header.actions` | 一键开工作台 Progress |
| Tasks | `:96-99` `sessionFace.projections.faceOf('todos')` | 官方 todos 投影 |
| Jobs | `:106-111` `ctx.jobs.state` + `watchRows(sessionId)` | 后台任务 |
| 宿主摘要 | `src/host/index.js:12` `sessionProjections.register(progressProjection)`（key `'nano-progress-report:summary'`） | 宿主侧事实投影 |
| 进度锚 | `src/host/index.js:14-20` `systemPrompt.context()` | 给当前 agent 注入 ≤600B 进度事实 |

#### 单一真源 & 合同边界核检（合规面）

- **真源=会话事件流**（`AGENTS.md` §使用）："时间线的数据真源是会话事件流（`uiConversation` 的 `progress` target），不是 DOM 抓取，也不是宿主私有状态"；**本包不创建独立 DB/状态文件**（`AGENTS.md` §配置与状态）。投影是纯 fold——`projection.js:45-94 apply()` 只对 `tool/call`/`tool/result`/`working-directory/change`/`turn/start` 折叠出 `{cwd(digest), paths(≤8), failures(≤8), pending(≤64)}`，**只存指纹、可丢弃重建**（`AGENTS.md`：journal 是真源，投影 checkpoint 只是可重建缓存）。
- **视图态只进 localStorage**（`AGENTS.md` §配置与状态）：`filter:<sessionId>` / `drawer`——不进宿主、不写持久。
- **不接管、不替换**：`progress` 是**全新 kind**，不接管 `files`/`guide`/`terminal`（spec-initial §2 否决项 R1）；`conversation.view` 是**第二视角**不是替代（spec-initial §10 "不做"）。→ Fusion view 同理只能**新增**，不替换 `chat`/`trajectory`。
- **UI 宿主优先**：全部宿主 primitive（`DisclosureRow`/`Input`/`SegmentedControl`/`StateDot`/`AnimatedRows`/`Icon*`），`npr-` 前缀、`--dsw-alias-*` token、`check-ui-rules` U1–U10 门禁（禁 `[class*=`/`:has()` 嫁接）。→ Fusion 的 lane 标记**不能自绘**，用 `StateDot`/`Tag`/`brand` token。
- **不得侧载**：不跨插件、不硬编；宿主摘要经 `sessionProjections`/`systemPrompt` 官方面，不读磁盘历史、不由浏览器时间线反推。

#### 用 DNPR 做 Fusion 单心流——接缝落位

```
Fusion view target 'fusion'  （仿 'progress'：events.register ×N + views.register）
  数据源 = lead session 事件流  +  sidekick session 事件流
  行模型 = ProgressRow + lane:'lead'|'sidekick'
  呈现   = 合并心流（conversation.view / workbench tab）+ Tasks/Jobs 抽屉
  交接   = 'team/task'（agentTeam 任务板）当 brief/result/feedback 一等实体
           + 'send_message' 当载体；两事件即 lane 边界标记
```

**lane 归因三案（合同面递增）**：
- **(a) 按 session 归属（推荐）**：lead/sidekick 各持一份 session，`binding(sidekickSessionId)` 读副流、渲染按 agent 打 lane——**零新合同**，只用现有 binding。
- **(b) 按 model 匹配（Fusion 官方做法）**：`requestHeader().config.provider/model` 读行级模型，仅适用架构 A（共享上下文）。
- **(c) 新增 `lane` 字段**：`recordAsyncDecision`/`assistant/message` 记 lane——最清晰但需 [业主] 裁决新合同。

**剩余硬缺口（收窄后）**：
1. `binding(另一 sessionId)` 是否激活其装配引擎——`ProgressBody.jsx:85` 只演示**当前 session**；Fusion 需订阅 sidekick session（待 V-验证，见 §8）。
2. lane 归因信号落点（a/b/c 三案之一）。
3. sidekick sessionId 发现：`agents` 服务（`src/host/index.js:6` inject 已含 `agents`）/`list_agents`/`agentTeam` 任务板 `ownerName`（`types.ts:88`）。

**宿主摘要 = brief 雏形**：`progressProjection` 的 `paths/failures/pending/subagentCount` 正好可当 lead↔sidekick 的**结构化简报**——比"完整转录"更符合 Fusion 交接协议；`systemPrompt.context()` 是现成"给 lead 注入 sidekick 进度"的口子（≤600B，可抑制）。

### 合同约束

- **单一真源**：`team/task` 在 Lead Session、lane 决策进 session event——`recordAsyncDecision` 只是派生遥测。
- **不得擅自扩约**：`route` ledger kind、lane 标记字段、持久 sidekick 生命周期、brief schema、Lead/Sidekick pairing selector——全是合同面，需 [业主] 裁决。
- **不得侧载**：decision 凭据走 `.env.local.development`；不跨插件、不硬编。
- **上层建筑归 host**：心流合并 UI 的 actor 打标若落进 `assistant/message`，是 host 侧呈现层——插件不能改 host DOM，只能用 `conversation.session.header.utilities` 或 `contextMenus` 等已有注册点。
- **UI 宿主优先**：Fusion pairing selector 的呈现应用 nano-ui/宿主 primitive，不自绘。

---

## 6. [decision-model-eval-1119] 实践结论（同前）

四 provider [FRD1] 锚定：gemini-decision-1 0.26s/0.78 最保守最快；jev 1.34s/0.73/$0.042 最便宜档；clef-flash 1.25s/0.94/本机免代理开源；gpt-6-luna 1.64s/0.95–1.0 最极化。决策调用成本 ~$0.00003/次、一任务 <$0.01——满足"路由器成本必须趋零"。阈值按 provider 校准；判定异步；state 不可过度压缩（70→20 词 conf 0.94→0.15）。本地开发用 clef（免代理），生产用 gemini（最快+模态最宽）。

---

## 7. 用 decision 模型做 Fusion 式尝试——修正方案（架构 B 为主）

### 7.1 三个决策点（挂到"委派/收回"，不是"换模型"）

```
Q1 [pre-step 委派判定]   state=当前步骤+最近工具结果
   → delegate? choice{lead|sidekick}  + margin
   → 挂点: _pressureGate 安全区；异步 fire-and-forget
   → 触发"向持久 sidekick 发 brief"（send_message / subagent 续会）

Q2 [sidekick 回报判定]   state=sidekick 的 result（经 agentTeam 任务板回）
   → accept? choice{accept|escalate|retry}
   → 测试/lint/diff 做硬判官；decision 只裁边界

Q3 [sidekick 升级/降级]   state=sidekick 近期成功率
   → next owner? choice{lead|current sidekick|stronger sidekick}
   → 在 context 重写点（任意压缩 commit）顺势换 sidekick 模型——
     但这是"换 sidekick 的路由"，不是换模型压缩窗口
```

### 7.2 关键设计（逐条回应社区槽点 + [业主] 事实）

| 诉求 | 方案 |
|---|---|
| 同一心流 | **以 [DNPR] 为骨架**（见 §5.5）：新 `'fusion'` view target 把 lead+sidekick 两流合并成一条带 lane 的执行视图，`conversation.view`/`sidebar.right.pane.tab` 两个挂载面都现成；lane 用 `StateDot`/`Tag`/`brand` token 呈现（不嫁接 host DOM）。**缺口收窄为**：`binding(另一 session)` 激活验证 + lane 归因三案之一 |
| BYOK/自定义配对 | `subagent`/`fork` 的 `provider`/`model`/`reasoning_effort` + `subagent-default.json` 当 sidekick 默认；pairing selector 做 Lead/Sidekick 两列 |
| Sidekick Free | DNMS 模型池选便宜档（clef-flash/自部署）当 sidekick 推荐位 |
| 持久 sidekick | 团队成员长驻、跨委派复用，用 `agentTeam` 任务板当 brief/result/feedback 交接 |
| 不透明 | `route` ledger kind：每次判定记 probabilities/margin/lane |
| 难任务回退 | Q1 `noul`/低置信→留 lead；brief schema 只许显式机械子任务；lead 始终 review |
| 激进压缩漂移 | **不**把"换 owner"绑定在某个压缩点；判定在 `agent/pre-step`、生效在下一次委派——compaction 漂移只影响时机，不影响正确性 |

### 7.3 防失效（文献+激进压缩教训）

- **margin 阈值 δ**：margin 小=候选等效→按成本打破平局（EquiRouter）。
- **min-dwell + 滞环**：防高频切换；因为 compaction 可因用户调参随时 disarm/preempt，owner 切换必须有自己的滞环而非借压缩线。
- **不绑压缩点**：B/H 漂移意味着"免费窗口"时机不定——路由决策做成独立状态机，只在"自然上下文重写"（任意 commit）时**可选地**升级 sidekick，不依赖它。
- **Zero-router 基线**：先跑赢随机委派才上线。
- **硬判官替代哑分类器**：测试/lint/diff 裁 quality，decision 只裁机械性。

---

## 8. 辩证综合

- **正**：Fusion 证明"双持久 agent + brief 交接 + 合并心流"方向成立；decision 模型是最被低估的路由形态；[DNMS]/[DNMSC] 接缝 80% 已存在。
- **反**：官方数字不可复现/依赖配对；"判断什么算 mechanical"本身是 judgment（-27 责任层=黑箱分类器）；agentic 路由零基准；"合并心流"曾是唯一硬 UI 缺口，但 [DNPR] 已把它收窄为"lane 归因 + 跨 session 订阅"两个可实现项（§5.5）。
- **合**：不复制 Fusion 黑箱，用 decision 模型透明化它（margin=等效信号、`route` ledger=审计、硬判官裁 quality）；架构取 **B（持久 sidekick + `agentTeam` 任务板交接）为主**、**A（`model.select` 换模型）为降级近似**；呈现层直接骑 [DNPR] 的 `'progress'` view-target 骨架做 `'fusion'` 合并视图，宿主摘要当 brief 雏形、`systemPrompt.context()` 当"给 lead 注入 sidekick 进度"的口子；预期锚定"机械任务持平、省 30–50%、可解释"。

---

## 9. 参考文档链接锚点

**官方/一手**：[Cognition Devin Fusion](https://cognition.com/blog/devin-fusion) · [Local Fusion](https://cognition.com/blog/local-fusion) · [FrontierCode](https://cognition.com/blog/frontier-code) · [Devin CLI Fusion](https://docs.devin.ai/cli/fusion) · [Desktop Fusion](https://docs.devin.ai/ja/desktop/fusion) · [Adaptive](https://docs.devin.ai/es/desktop/adaptive) · [more efficient Devin](https://devin.ai/blog/more-efficient-devin) · [AA — Devin Fusion](https://artificialanalysis.ai/agents/coding-agents/devin-fusion-cli) · [AI Primer 归档](https://www.ai-primer.com/engineer/stories/devin-fusion-introduces-mid-session-routing-35-percent-cost-cut)

**社区/实测/逆向**：[eesel review](https://www.eesel.ai/blog/devin-fusion-review) · [dsh-model-fusion 复刻](https://cdn.jsdelivr.net/npm/dsh-model-fusion@0.2.8/README.en.md) · [Data Phoenix](https://dataphoenix.info/news/cognition-devin-fusion-multi-model-agentic-coding) · [cocoloop 23532](https://www.cocoloop.cn/t/topic/23532) · [locdd 109300](https://www.locdd.com/t/topic/109300) · [locdd 90623](https://www.locdd.com/t/topic/90623) · [locdd 97632](https://www.locdd.com/t/topic/97632) · [HN 46711589](https://news.ycombinator.com/item?id=46711589) · [HN 49214468](https://news.ycombinator.com/item?id=49214468) · [HN 48739985](https://news.ycombinator.com/item?id=48739985) · [amirfish1 Fusion UI 逆向](https://github.com/amirfish1/claude-command-center/commit/1489e1f0b961bda7be6fd1aa3a20902b10cee333) · [LodyAI#1072](https://github.com/LodyAI/Lody/issues/1072)

**Router benchmark**：[RouterBench](https://arxiv.org/abs/2403.12031) · [RouterEval](https://arxiv.org/abs/2503.10657) · [RouterArena](https://arxiv.org/abs/2510.00202) · [EMNLP'26 Survey](https://aclanthology.org/2026.findings-emnlp.2072/) · [Routers Overpay](https://neurips.cc/virtual/2026/loc/sydney/poster/148797) · [SaveRouter](https://arxiv.org/html/2609.37402v1) · [RouteLLM](https://arxiv.org/abs/2406.18665) · [VL-RouterBench](https://arxiv.org/abs/2512.02848)

**DSH 侧缝实现**（社区插件，证同缝）：[`dsh-subagent-model-config`](https://www.npmjs.com/package/dsh-subagent-model-config) · [`dsh-delegation-hub`](https://github.com/tkaiz0406/dsh-delegation-hub) · [`dsh-team-member-model`](https://github.com/liaiaaa/dsh-team-member-model)

**Decision 模型生态**：[clef changelog](https://developers.cloudflare.com/changelog/post/2026-10-01-clef-workers-ai/) · [TypeSafe Jev](https://jev-agent.com/use-cases/llm-model-routing) · [OpenRouter jev-router](https://openrouter.hconeai.com/docs/guides/routing/routers/jev-router) · [Stacklok ADR-0350](https://raw.githubusercontent.com/stacklok/mecatl/3b297b407a3e2e6d183a6348c049096452d25b37/docs/adr/0350-jev-delegated-model-router.md) · [apidog Decisions API](https://apidog.com/blog/gemini-decisions-api-vs-openai-decisions-api/) · [vikawork calibration](https://github.com/vikawork/decision-models-calibration)

---

*本文件为分析 spec，不含实现。落地前需 [业主] 裁决：`route`/`delegate` ledger kind、lane 归因三案之一（session 归属 / model 匹配 / 新 `lane` 字段）、`'fusion'` 合并视图的归所（新插件 vs 扩 [DNPR]）、持久 sidekick 生命周期、brief schema、Lead/Sidekick pairing selector 的合同边界。*

## 10. Fusion V1 交付、V2 接缝与可行性测量（2026-11-19 [业主] 裁决）

本章是本次六项裁决的唯一登记位置。§0–9 保留为调研历史；有冲突以本章为准。下表是已决产品合同；后文是落实合同的设计和待验工作，不是已上线行为。台账编号仅用于追踪，不冒充 QnA `truth-id`。本文不设插件发布门禁；这里的验收决定的是能否向 [业主] 声称 **Fusion 可行**。

### 10.1 六项裁决

| 裁决 | V1 承诺 | 明确排除 |
|---|---|---|
| 1 · 分期 | V1 交付完整双角色协作、统一 UI、观测和 benchmark；同时定义 V2 所消费的事实与 facade | 不把只有选择器的原型算作 V1，不以接入四家 API 代替验证 |
| 2 · 范围 | 当前根会话、一个可续会 Sidekick；Team 可选；失效回 Lead | 不跨根复用、不要求成员常驻内存、不静默切 Lead 模型 |
| 3 · 心流 | 达到 Devin Fusion 的交互对等：配对是根 Session 中可变的配置；用户只在这一个 Session 工作；Lead 和 Sidekick 在 [DNPR] 有不同的视图身份 | 不是两个聊天窗口，也不是把两份模型历史合写成一个 journal；不按模型名猜角色 |
| 4 · 裁量 | V1 的 Lead 是派工、收回、冲突、重复输入和结果验收的最终裁决者；裁决和依据在本会话可回溯 | Sidekick 的完成通知、Team 的完成状态、测试绿灯均不能代替 Lead 验收；裁量不绕开宿主权限 |
| 5 · Decision | V2 登记建议型 decision 能力；V1 即固定输入身份、输出边界、单一真源与只读消费接缝 | V1 不推理、不取密钥、不发影子请求、不执行 Q1/Q2/Q3；V2 的建议不是第二套派工器 |
| 6 · 可行性 | V1 自带能复算成本、延迟与执行质量的采集、评测、报告工具，按 Cognition 官方方法作严格对照 | 不用演示成功、一次 provider 延迟或标价代替 benchmark；证据不完整即不下可行结论 |

### 10.2 V1 执行合同：一份配置、一名当前成员、一个裁决点

**归属。** [DNMS] 提供根会话配对编辑；[dsh] 宿主拥有配置写入、授权、子会话生命周期、投递和 journal；[DNPR] 只消费宿主公开的会话事实和角色投影。无 [DNPR] 不妨碍派工（但不算完成 UI 对等验收）；无 [DNMSC]、未启用 Team 均应能工作。两插件之间不建 RPC、不读对方磁盘或 DOM。生产基线 rc.1 和评估树 rc.5 分列验证；当前宿主缺公共接缝时，报告具体缺项并保持普通 Lead 工作，不用私有 API 补洞。

**配置与身份。** 宿主从根会话事实投影出开关、配对修订、Lead/Sidekick 的 provider、model、effort 和当前成员绑定。Lead 的有效选择仍认原有 `model/selection`；配对引用其版本，不另存第二份可写 Lead 路由。Sidekick 的期望路由属根会话，实际执行路由以该成员请求为证；区分“已选 / 待生效 / 本次实际”。子身份由根的 `subagentCatalog` 中 direct、continuable 的成员 ID 与配对绑定共同确定，不能由名称、列表第一项或 Team owner 倒推。角色不随模型同名、同路由或换配而变；历史行保留当时成员和修订。

**变更。** 两个 picker 可分别改 effort 或模型。编辑提交携带用户所见修订；宿主检查当前授权和可续会能力，变更在安全边界生效。对同时编辑不做无提示覆盖；拒绝旧修订并展示当前值。空闲时生效；在途时旧任务按原修订收尾，新配置可见为待生效；若需新子会话，旧成员先退出当前绑定再创建，不存在双活。禁用阻止新委派，不宣称已取消、撤销或回滚在途写入。恢复后从宿主重建；配对不写 `subagent-default.json`，不覆盖别的根会话、普通子代理或全局默认。Lead 仍可经原生入口改选，投影必须反映变化。

**派工。** 只有 Lead 面向用户。第一个有界任务才创建 fresh `spawn`，首份 brief 走创建参数一次；后续向同一成员 `send_message` 续办。brief 含目标、范围、约束、验收证据；回报给出更改、验证、未决项及产物引用；反馈仍归同一任务。单一写入范围不能并行分配给两方；允许 Lead 并行做不重叠的工作。Team 开启可复用任务 ID、revision/CAS；关闭不造替代任务板。`writeScopes` 是提示，不是文件锁。

**竞态和幂等。** 逻辑键为 `(root, delegationId)`；一次投递尝试、一次回报、一次 Lead 裁决各有独立来源引用，不能用消息正文去重。先标记意图，再经宿主派发；已投递不等于已完成，已回报不等于已验收。重复回执只补证据；合法返工由 Lead 显式开下一次尝试。新用户指令、换配、取消、迟到回报按任务和修订归位，由 Lead 接受、拒绝、收回或要求核对。崩溃在“可能已送达、尚未记回执”窗口时，不承诺 exactly-once：先查原成员、消息和产物；无法判明则悬置该范围，Lead 裁决后才可再做。重放、刷新、订阅与报告生成一律零派工；回 Lead 不是立即把可能仍在写的任务再执行一次。

**代码依据。** 现有 [默认覆盖判定](../../../dsh-nano-model-selector/lib/subagent-default.js) 比较父子路由，不能证明“没有显式选模”；[创建监听](../../../dsh-nano-model-selector/index.js) 在 startup 时套用默认。rc.5 的 `packages/subagent/tool-subagent/src/model-selection.ts` 校验会话授权，无记录策略只许显式选父路由；`packages/bundle/web-app/presets/standard.patch.yml` 只为 spawn 打开选模。实施前必须解决显式同路由与默认覆盖冲突，不能先派工再核对模型。rc.5 的 `packages/client/ui-conversation/src/client/conversation/assembly.ts` 要求活跃 binding；`packages/client/ui-subagent/src/client/sidebar-chat/index.tsx` 展示 `retain(address)` / `release()`。这些是落点，不是跨版本能力保证。

### 10.3 V1 → V2：只预留一条建议通路

下列是**必须稳定的逻辑语义**，不是已经存在的 wire 类型、URL、工具或新增 error 枚举。具体宿主事件名、落盘格式、公网凭证入口和对外重试义务若需扩约，另请 [业主] 裁决，不从 fixture 反推。V1 要交付的是领域接口、投影与合同测试，不是四个空 provider。

| 接缝 | V1 的供给方 / 消费方 | V2 接入，不得改变的语义 |
|---|---|---|
| `readContext(root, candidateRef)` | 宿主返回同一切面的根、配对修订、任务/步骤引用、当前状态、可委派范围及证据引用；Lead/UI 按权限读取 | 仅对仍有效、经授权可外发的候选构造最小脱敏输入；不得复制完整转录、工具参数或 secrets 到另一状态库 |
| `advise(context, signal)` | 内部建议 facade；V1 仅 `not-run`，不装 provider、不启动定时器、不创建网络客户端 | V2 独立 opt-in；先 shadow Q1，返回候选引用、输入版本、provider/model 版本、建议/弃权及概率、耗时和用量；不发消息、不选模、不改 owner。异常、超时、低置信或过期均无执行效果 |
| `resolve(candidate, leadVerdict)` | 唯一能推进派工/验收的入口；记录 Lead、原修订、证据和终态；接宿主原有工具权限 | 比较根、候选、修订及是否已开始；失配建议只可观察。V2 若展示 Q2/Q3，只作建议，自动接管、自动重试与换配不在已决范围 |
| `observe(root, cursor)` | 从宿主事件派生只读身份、交接、计量及覆盖状态；[DNPR] 和实验工具各自消费公开面 | 加入“建议→Lead 是否采纳→客观结果”的可选关联；无建议的 V1 历史可原样回放；禁止从遥测或离线样本恢复运行状态 |

权威分工：配对/裁决认根会话，成员执行认该子会话，模型费用认 provider 计量与对账依据，benchmark 标签认独立 grader；**Lead 的产品裁决不是 benchmark 的正确答案**。投影、UI、本地实验导出都不可写回上述事实。[DNMSC] 的 `_pressureGate` 与轮转 JSONL 不在这条链上。

**V2 研发拆分（登记，不在 V1 执行）。**

| 阶段 | 输入、产物与独立验证 |
|---|---|
| V2a · 离线适配 | 用同一已授权的脱敏候选集和稳定 candidateRef 重放；Jev、clef、Gemini 的 map 请求分别处理 state/input 和返回封装，Luna 单独处理数组 schema；保留 provider 原始量纲再归一选择、弃权和缺字段。四类响应 fixture 都应关联回原候选；不能解析则无建议，不合成概率。 |
| V2b · 影子判定 | 仅显式同意的根会话、仅 Q1；部署方配置 provider/出口与凭据，不将开发 dotenv 当产品合同，不自动跨 provider failover。按 provider/版本拆分校准集和盲测集，公布混淆矩阵、可靠度分箱、覆盖率、超时、过期比例以及每次建议的实际成本。没有独立“可委派”标签时只报与 Lead 的一致率，不叫准确率。影子阶段相对 V1 的额外派工数必须为 0。 |
| V2c · Lead 可采纳建议 | 在候选仍有效时将建议提供给 Lead；按同一 manifest 与 V1 对比任务级质量、端到端延迟、全成本及返工，建议本身的计算也计费。先满足 §10.6 的证据要求再谈启用。Q2（回报核验）与 Q3（建议调整配对）各自另做实验；不得藉此自动验收、自动换配或剥夺 Lead 裁决。 |

### 10.4 V1 呈现与观测报告

根 composer 保留一个输入框、一个用户可见身份；选择器并列 Lead/Sidekick 与各自 effort，在顶栏显示有效组合和待生效状态。用户可在同一心流看到 brief、Sidekick 工具活动、回报、Lead 核验和最终答复，不必切子会话。[DNPR] 提供“全部 / Lead / Sidekick”三个观察角度，同一事件改变过滤不改变身份；同模型也显示文字角色，不靠颜色辨别。按每一来源的 seq 保序、按交接因果组合，根的 relay 与子流正文不伪造两次执行；缺历史、子流离线、投递未知都有可见状态。只读观察随面板生命周期 retain/release；移动窄栏保持可切换、键盘可操作。对等指这些可验交互，不仿造对方定价、品牌或内部模型 ID。

| 报告 | 采集粒度与关联 | 输出与边界 |
|---|---|---|
| 单会话轨迹 | 根/子 session + 本地 seq；配对修订、delegation、attempt、Lead verdict；实际模型请求和工具结果引用 | 点击角色行可追到交接、执行与验收；同一条事实的 relay、重放和 UI 渲染不是新 attempt。缺口列原因和最后确认位置 |
| 成本对账 | 每次可计费模型尝试（含失败、重试、摘要、Lead 复核）；计费路由、币种、有效日、价目版本、未缓存输入、缓存读/写、输出、provider 账单/用量依据 | 先按 provider 归一互斥桶；reasoning 若是输出子集不能重复收费。分开推理账单实付、按价目重算、外部工具/基础设施和 grader 开销；免费额度、包月、未知价格不能假装零成本。不可归属记 `unknown`，不摊派给表现好的 arm |
| 延迟 | 同一 observer 的单调时钟：输入被接纳→最终答复；另采首个用户可见输出、派工→回报、回报→裁决、重试/等待与各 lane 活跃时段 | 报墙钟 p50/p95、样本数和超时率；并行区间不能相加代替端到端。跨进程只用可关联的起止对或同一观测端；断线期间无可靠时钟记缺失，不能用日志到达顺序补 |
| 执行质量 | 每个 rollout 的最终 diff、隐藏测试、blocker、加权 rubric、盲评与争议复核；委派级另记回报/验收/返工/收回 | 分开报告整题通过率、可合并分、错收/错拒与返工。仅在独立标注存在时计算 precision/recall，并列出混淆矩阵、分母和未标注数；不以 Lead 自评或 PR 创建数代替精度 |

计量实现参考评估树 `packages/llm/token-meter/src/turn-usage.ts`：完整 `turn/start` 到 `turn/end`、含 retry/attempt 才可称为完整用量；聚合 turn 和逐 attempt 不得双计。未进常规 turn 的摘要或工具计费须另有独立凭证。默认不导出原始 prompt、密钥或工具正文；离线样本只保留获准的最少字段、哈希和受限证据引用。账单只有总额时在隔离账期/项目核对总额，不宣称每次尝试都有实付价。

### 10.5 Cognition 方法对照与现有采样报告

来源取样日 2026-11-19。以下为**官方公开样本，不是 [DNMS] 实测**。先问同一题花多少钱、是否可合并，再问省下的钱来自哪里。

| 官方证据 | 本地如何对齐 | 不能声称什么 |
|---|---|---|
| [Devin Fusion](https://cognition.com/blog/devin-fusion)：6/29 发布，8/7 图更新；FrontierCode 1.1 Extended 同图列 `score` 和平均每题费用。首发 35%，更新批次 up to 60%，偏实现型会话收益最大 | 每对模型、每个任务簇都并排放质量和每次 rollout 总费用，保留失败；锁定数据版本和日期 | 不能拼两个批次，也不能把 up to 当平均或验收线 |
| [Making Fable Cheaper Than Opus](https://cognition.com/blog/making-fable-cheaper-than-opus)：3,000 sessions；两个 Lead，各自有/无同一个 Sidekick。Fable low：60.8/$4.03 → 60.7/$1.86；Opus medium：55.4/$3.06 → 54.6/$2.04 | 采用同 Lead、同 effort 的成对消融，再用同 Sidekick 换 Lead。按表重算，前者省 53.85%、少 0.1 分；后者省 33.33%、少 0.8 分 | 单 token 更便宜不等于整题更便宜；不能把不同 Lead 的价格差算成委派收益 |
| [Local Fusion](https://cognition.com/blog/local-fusion)：跨 DeepSWE、Terminal-Bench、SWE-Atlas、Vals Code Migration、FrontierCode 分列。Astra → Astra + SWE-2：Terminal-Bench 4.0 为 55.6/$10.08 → 50.0/$6.06；FrontierCode 1.1 Extended 为 63.1/$2.62 → 63.4/$2.34 | 同一配对两簇分别省 39.88% / 10.69%，质量分别 −5.6 / +0.3 分；本地报告也必须显示最差簇。另列不同 harness 的外部比较 | 不把横跨 harness 的营销标题当单一变量实验；官方表未给本地所需的逐任务延迟和原始轨迹 |
| [FrontierCode](https://cognition.com/blog/frontier-code) / [1.1 修订](https://cognition.com/blog/frontier-code-1.1)：维护人定义可合并；blocker 失败计零，否则加权。原文每 effort 五次取均值，再报最佳 effort；Extended 150 题，1.1 区分合法查文档与泄露解法 | 对齐行为、回归、安全范围、机械检查、测试有效性及代码质量；按 effort 报告。可获得同一官方评测才标同榜，否则标“本地方法对齐”；本地主比较预锁 effort 防止挑最好结果 | 本地题不是私有 FrontierCode 题；本地 rubric、延迟、统计区间不是官方成绩。不得混用 1.1 和 2.0 |

现有 [decision provider 样本](decision-model-eval-1119.md#51-端到端延迟矩阵3-次) 只是同题、同 [FRD1] 出口各 3 次；中位数 Gemini 0.26s、clef-flash 1.25s、Jev 1.34s、Luna 1.64s。它不提供交接、总账单或 mergeability 标签，既不能充当 V1 基线，也不能校准 V2 委派阈值。**本章登记时本地 Fusion 付费 rollout 样本数为本次采集 0；不报告本地收益。**

### 10.6 采样、评分与可行性判读

**实验单元。** 先冻结 manifest（题 ID、repo/base SHA、任务簇、环境镜像、工具权限、时间和花费上限、允用文档、grader/rubric hash、模型版本与 effort、价目快照、[dsh]/插件版本、实验顺序种子）。四簇：有界实现、根因诊断、跨模块迁移、测试/验收；每簇同时纳入适合委派与应留 Lead 的题，按整题分开放开发集与未见留出集，不拆轨迹到两边。校准题不进结论；不向 agent 暴露隐藏断言、标准 patch 或同题他臂产物。

**计划样本，不是已跑数量。** 先用每簇 1 题 × 2 臂 × 1 次 = 8 次验证链路，不做效益推断。正式候选设计：每簇 10 道未见题 × 5 次 × 4 臂 = 800 次；两套 Lead 分别 solo / 与同一 Sidekick 配对，主比较在同 Lead 内。每个 task/repeat 内按预定随机顺序运行各臂；独立干净 checkout/会话、同权限/预算与冷启动策略，记录不可控的服务端缓存和模型漂移。solo 禁止子代理，不禁止其他等价工具；Fusion 不强制每题委派。按全部已分配样本分析，不丢弃未委派、失败、超时或返工的运行。若预算或精度不足，报告实际覆盖和区间，不减题后冒称同等证据。任何真实付费运行先确认预算和数据外发范围。

**可复算指标。** 全体尝试的计费额求和为 C，计划运行数 N，独立 grader 通过数 P；报告实际启动/终止/未启动数量。完整组报告 `C/N`、`C/P`（P=0 为未定义），节省率 `1−(C_F/N_F)/(C_S/N_S)`；既报全成本也报与官方对齐的推理成本。每题 blocker 全过为 pass，单次分为 `100 × Σ(w_i × pass_i)/Σw_i`，任一 blocker 失败得 0；权重和 blocker 运行前冻结。超时/agent 失败按预定预算记失败和实际费用，未启动或 grader/计量故障保留占位，列不可判定，不偷换为零元或正确。每题先均值，再按题等权；分簇、配对和总体均报告。任务级成对 bootstrap（分簇抽题、保留该题全部重复与配对，固定 seed，10,000 次）给出差值/比值的 95% 区间；不把重复运行当成独立题。延迟给全体至终止时长和成功子集至答复时长，注明超时截断；另报 Lead/Sidekick 每题回合、返工额及缓存桶解释差异。

**分析样例（合成，仅验算工具）。** solo 两次费用 $2、$4，一次通过；Fusion 两次 $1、$3，一次通过。预期每次 $3/$2，每通过 $6/$4，节省 33.33%，两臂通过率均 50%；删掉失败行会算错。一个 case 中 root 从 0 到 10s、child 从 2 到 8s，墙钟是 10s 不是 16s。另注入同一回执两次、缺失 cache 价、未知投递和迟到回报：分别应得到一次事实、未定价、待核对及旧修订归因，而不是四个成功样本。

**可行性报告。** 第一页先给工具可信度（分配覆盖、计量/打分覆盖、对账残差、重复与漏失），再给相同 Lead 的质量差/成本比/延迟比及区间、簇级反例与原始证据引用。建议预注册判读：点估计成本下降且成本比区间上界 <1，质量差区间下界不低于预定非劣界，p95 墙钟比不超过预定容忍度，才支持该配对/工作负载。质量非劣界、延迟容忍度与付费上限由 [业主] 在看留出结果前签定；不代填产品取舍。测量链失真、落在不确定区间或未设取舍记“证据不足”；可信数据明确越界记“不支持”。任一簇退化须列出，不能以全局均值掩盖。V2 后续在同任务、同配对下额外比较 V1、shadow、启用建议；shadow 产生的开销独列，不能算 V1 免费收益。

### 10.7 V1 工作台账（实施与测量同为交付）

下列均为待办，路径为已有入口或拟建位置，不代表文件均已存在。每行以“对照输入 → 可观察结果 → 留证”独立验收；台账只登记一次，实施时在同一行登记实测版本、样本数、证据和状态。

| 簇 / 依赖 | 代码与交付物 | 可检测、可对照的验收标准 / 证据 |
|---|---|---|
| C01 宿主能力 / 无 | [DNMS] host `index.js` 与宿主路由/adapter preflight；能力矩阵 | rc.1/rc.5 各列实际 profile；授权/拒绝、continuable/one-shot、Team 开/关逐格验证。拒绝格 0 个子请求，成功格首个请求的实际 provider/model/effort 与有效配对一致；未测格不得标支持 |
| C02 会话配置 / C01 | 根 journal 配对投影、修订写入、Lead 选择引用；`lib/subagent-default.js` 显式意图处理 | 两个根、一组同模型同 effort、一组不同模型、两个竞争编辑者；只一个旧修订写入获准，其他根/普通子代理 0 变化。换配、刷新和冷恢复后的有效配置与全量重放一致；对照原生 Lead 选模 |
| C03 委派执行 / C02 | 宿主 spawn/续会控制，Lead brief/result/feedback、范围归属；不经 compaction | 连续两次委派只创建 1 个成员；首次 brief 只投递 1 次，第二次投到同一 ID；空闲会话 0 子请求。Team 及 [DNMSC] 分别启停，四种组合结论相同；保存根/子来源引用和 diff |
| C04 竞态与恢复 / C03 | 单根意图与 Lead 裁决状态机，确认/不明边界；宿主 journal 恢复测试 | 对重复回执、送达后崩溃、并发改配、用户插话、禁用、旧结果迟到六条轨迹注入确定性屏障。每条 0 次未裁决重派、0 次重复验收；未知永不显示成功；回放两遍副作用数均为 0 |
| C05 配对 UI / C02 | [DNMS] `src/client/ModelSelector.jsx`、`src/client/index.jsx`；会话级双 picker、effort、有效/待生效状态 | 桌面与窄屏各走启用→选配→在途换配→关闭→重开，刷新后与宿主投影逐项相同；键盘可完成全部操作；不可用给具体原因，0 次静默使用全局默认；留录屏与请求路由对照 |
| C06 心流 UI / C02、C03 | [DNPR] `src/client/events/`、`src/client/view/ProgressBody.jsx`；公开角色投影、合流、过滤、展开与释放 | 同模型、同名工具、两个普通子代理混入、断线重连、历史翻页五类 fixture；人工标注行归因和去重 100% 一致，其他子代理 0 行错标 Sidekick。全部/Lead/Sidekick 不丢因果，展开后收起/切根订阅数回到基线；留双尺寸截图及事件对照 |
| C07 V2 合同保留 / C02、C04 | 宿主内部只读 context/advice facade 和协议 fixture；[DNMS]/[DNPR] 不相互 import | V1 不配置 decision 凭据、禁止 decision 出网仍可派工，recording transport 显示 decision 请求数 0（不限制 Lead/Sidekick 自己的 LLM 连接）。用合成建议验证有效、过期、跨根、弃权四种输入均不能自行派工；V1 旧记录与带可选建议的记录投影同一事实 |
| C08 端到端验证 / C01–C07 | 两包现有 `test/`、隔离 web profile、真实宿主事件与可控模型 adapter；验证报告 | 开全局默认→显式选同路由→首派→续办→换配→恢复→Lead 验收；按实际请求、会话记录、UI 三方逐项核对。并测缺 [DNPR]、缺 Team、成员无法恢复。分别记录静态、模拟、真机和付费证据，不互相冒充 |
| C09 观测与计费 / C02–C04 | 宿主 attempt/工具/摘要计量、配对与任务关联；拟建 `lab/fusion/` 只读归一化与价目重算器 | 合成重复、重试、并行、缺价、缺 usage、免费/无报价场景逐一对照 §10.6；已知桶精确至计价最小单位，重复计费 0。真实隔离账期按账单四舍五入单位对账；超差列残差，不标实付准确；覆盖分母包含失败样本 |
| C10 基准工具 / C09 | 拟建 `lab/fusion/` manifest、runner、grader、report；产物分 manifest、run index、脱敏 attempts/spans、逐项 grades、汇总，报告引用输入 hash | 每个 `(task, repeat, arm)` 唯一，有且只有一个终态或明确缺口；同一冻结输入离线重算数值逐项一致。隐藏测试不进入 agent 环境；每题用故意错误与另一种正确实现分别校验 blocker；盲评争议保留双评及仲裁 |
| C11 采样与分析 / C08–C10 | 方法对齐表、8 次链路报告、正式留出报告、按题可追溯反例与可行性意见 | 先冻结 manifest 和取舍再开跑。对照 §10.5 每条官方口径标“相同/不同/不可复现”；对照 §10.6 列计划/实跑/失败/缺失、分簇质量/费用/延迟与 95% 区间。关键计费、身份、评分或对照缺一则不能标可行；报告可由另一人仅凭获准离线材料复算 |

**交付顺序。** 先用 C01–C04 打通一条真实交接，同时开发 C09–C10 的离线验算；再由 C05–C08 证明用户看到的是这条真实交接，而非模拟动画。最后才按预算做 C11。当前交付是决策、分析、采样设计与可执行台账；尚无 V1 运行数据、已通过的 benchmark 或 V2 自动路由。

## 11. Fusion V1 交互与数据合同详设（§10 实施附件）

**设计决定：配置回答“用哪两个模型”，composer 回答“消息发给谁、现在谁在做”，Chat 回答“为什么交接”，[DNPR] 回答“具体做了什么”，评估页回答“是否值得”。** 五处读同一组事实，不能各自推断执行者。本章细化 §10 的六项 [业主] 裁决，复用 C01–C11，不另立台账或发布门禁。线框中的模型名、编号和数值均为示意；以下接口是拟实现的领域合同，不宣称宿主已有这些 API。

### 11.1 [DNMS]：独立的「Fusion 配置」入口（C01、C02、C05）

在现有模型选择器左 rail 的固定操作区、媒体项之后和品牌分隔线之前，增加**独立的配置入口**：`IconSlidersTwoOutlineRegular`，可访问名「Fusion 配置 · 当前会话」。不塞进模型详情、子代理默认值或异步压缩设置，不受搜索过滤影响。Fusion 关闭时普通模型点击行为不变；开启时从 composer 的组合按钮直达此页，并保留「返回模型列表」。进入页面、搜索、选中候选均不触发 `directory.select()`。当前根会话尚未建立时提示先开始会话，不把草稿写到全局。

```text
Fusion 配置                                       当前会话
启用 Fusion  [开关]                   已生效 / 待生效 / 不可用
Lead · 面向用户                     Sidekick · 执行委派
模型   [provider / model]            模型   [provider / model]
推理   [effort 或模型默认]            推理   [effort 或模型默认]
下次派工使用新组合；当前任务仍由原成员收尾。     （有在途任务时）
当前组合 → 拟变更组合                           取消   应用到本会话
```

两栏等宽，标签、模型、effort 三行对齐；窄面板改为同页上下两组，不把第二组挤成横向滚动。点击字段在页内打开可搜索的候选列表，选择后返回原字段；Sidekick 列表只允许可授权、可续会且可执行的路由，解释被禁候选。更换模型时不沿用不支持的 effort，显示「模型默认」并在差异预览中列出。两栏允许相同模型，不强行推荐价低者。短说明区分「配置已接受」与「下一次生效」；实际执行模型从请求事实读取，不随草稿预览变化。

草稿仅在当前面板内；应用前，开关、模型和 effort 的改动是一个编辑单元。合法且有差异才可应用，提交中阻止二次点击。取消恢复已读版本；有未保存修改而关闭时，使用面板内 `NanoWindowDialog` 询问丢弃或继续。冲突保留草稿并列出服务器当前值，用户重新比较后才能再提交；断连/结果不明先重读，不默认重发。根会话切换不能把 A 的草稿提交给 B。默认策略会覆盖显式同路由而无法排除时，拒绝启动并写明原因，不改全局设置来“修复”。

**验收：** 普通选择器、Fusion 独立入口、两个同路由不同 effort、禁用候选、双窗口同时保存、撤销草稿逐项验证。进入/预览/取消产生 0 次选模写入和 0 次 spawn；一次成功应用只得到一个新生效组合，另一根会话的配置不变。比对落点：[选择器和固定 rail](../../../dsh-nano-model-selector/src/client/ModelSelector.jsx)、[composer 插槽](../../../dsh-nano-model-selector/src/client/index.jsx)。

### 11.2 Composer：稳定的配对按钮与当前动作（C05、C08）

保留 `conversation.input.model` 一个席位、一个输入框和宿主发送/停止控件。普通态仍是原模型按钮；Fusion 开启时同一按钮显示 **`Fusion · Lead A / Sidekick B`**，点击编辑配对，不是切换输入收件人。按钮邻接一个不可点击的状态短句，例如「Sidekick 执行中」；辅助说明始终是「发送给 Lead」。模型名是配置，状态短句是执行事实：不可把正忙的一方移到 Lead 位置，也不把文字输入重定向给 Sidekick。

| 宿主事实 | composer 主提示 | 不应出现的暗示 |
|---|---|---|
| 已配置，尚未委派 / Lead 在工作 | `Fusion · A / B`；空闲或 `Lead 处理中` | 已选中 B 不等于 B 已创建或计费 |
| 已记派工意图，未证实投递 | `正在交接`；结果不明则 `交接待核对` | 不能显示「Sidekick 正在执行」或提供盲重试按钮 |
| 已投递 / 已见子执行 / 双方并行 | 依次为 `已交给 Sidekick`、`Sidekick 执行中`、`Lead 与 Sidekick 并行` | 一条回执不证明已开工；并行不是最后发 token 的一方独占 |
| 子已回报，Lead 尚未验收 / 已接回 | `等待 Lead 复核` / `Lead 已接回` | 不能显示「完成」或把回报当用户答复 |
| 禁用或换配时仍有任务 | `停止新委派 · 原任务收尾` 或 `新组合待生效`，原组合可查 | 不画已取消、不提前替换任务的模型标签 |

复用当前 trigger 高度、焦点环、主题和宿主 composer 自适应变量。正常宽度保留两角色，空间不够先去 effort，再缩短模型简称；极窄只保留 Fusion 按钮和关键执行状态，展开能看全称与实际路由。状态变化不替换输入节点，不夺焦、不丢草稿、附件、光标或 IME 组合态；`aria-live=polite` 只播报阶段转换，不逐 token 播报。角色用文字和形状，不靠颜色；警告色只表示不明/失败，不代表 Sidekick。操作不可只靠 hover。**验收：** 390 CSS px、宽桌面及右栏占宽三种布局，分别在中英文长模型名、键盘/触摸、亮暗主题、减少动态效果下走通；连续交接时发送目标始终是根会话，发送/停止按钮可达且不被遮挡。

### 11.3 主 Chat：一条交接卡，不新增第二个聊天者（C03–C05、C08）

以用户消息和 Lead 答复构成主轴。Lead 派工时在**根 Chat 对应 turn/step 的真实位置**插入一张可展开的交接卡。标题是任务（不是模型名），左侧分支图标，右侧文字是当前阶段；展开才展示 brief、实际执行成员、工具进度及产物证据。Sidekick 的文本标「给 Lead 的回报」，不渲染为发给用户的第二个答复气泡。用户中途插话仍留在自己的时间位置；旧任务迟到只能更新旧卡，不跳到最新对话末尾。普通子代理不套用 Fusion 卡。

```text
用户：修复导出重复行
Lead：我先确认触发条件。
  交接 #7  修复重复写入                       等待 Lead 复核
    Lead → Sidekick    范围与验收条件
    Sidekick           改动 1 个文件；验证结果可展开
    Sidekick → Lead    已回报；不等于已验收
Lead：我已复核差异和回归用例。                  （对用户的答复）
```

交接卡与 composer 不是两个状态机：同一条“已回报”事实让卡片增加证据、composer 显示「等待 Lead 复核」；Lead 的终局裁决才结束待复核态。卡内按尝试分段，合法返工同卡加一段；双侧 relay/settled 同一事实只计一次。不确定的关联不强并，显示来源和「关联待核对」。Lead 在别的范围继续工作时显示并行，不锁用户输入或把当前写入权限交给 UI。

**实现边界：** rc.5 的 `packages/client/ui-chat/src/client/apply.ts` 在原生 Chat flow 下声明 keyed `conversation.chat.node`；`contract/chat-nodes.ts` 规定 `target:'chat'`、`anchorSeq`、`location` 和 `visibility`。主 Chat 增量由 Fusion 的 [DNMS] 客户端展示贡献负责：围绕已登记的根交接事实注册专属 Node Definition 及其 renderer，不接管 `chat`/`assistant`/`tool` 通用节点，不把子日志拷成根 assistant 消息。原生工具行仍为原始依据；卡链接到它，不再宣称一次工具执行。没有根侧事实/安全节点扩展面的宿主只显示原生流并列兼容缺口；不能用 [DNPR] 页签替代主 Chat 的对等验收。**验收：** 重连、翻旧页、两个 turn 重名工具、迟到结果四条回放，各 `delegationId` 只一张逻辑卡，同一回报不产生第二个用户答复；手动向上阅读时不强制滚到底部。

### 11.4 [DNPR]：按身份看同一段执行（C04、C06、C08）

`conversation.view` 中的 Progress 与右侧 [dsh工作台] 的 Progress 沿用同一 `ProgressBody`，不新建两个日志库。根会话有 Fusion 事实才出现 `全部 / Lead / Sidekick` 分段控件，与原 `type:`/`status:` 文本过滤取交集。Chat 默认折叠执行细节；Progress 默认显示**交接组和执行行**。工作台适合并排查证：保留现有 Tasks/Jobs 抽屉，明确其作用域是根会话；主区域的 Progress 不凭空多出抽屉。切换角色只改视图，不切活跃 Session、不同步用户输入，也不改变另一处面板的滚动位置。

**三个不同维度必须分栏。** 行首 glyph 仍表示 shell/file/tool 等事件类型；第二列是文字身份 `Lead` / `Sidekick`（人类始终标「用户」，普通子代理标「其他子代理」）；尾部 `StateDot` + 文字才表示运行/错误。Lead 用 `IconAgentPresetOutlineRegular`，Sidekick 用 `IconBranchOutlineRegular`，用户保留 `IconUserOutlineRegular`；同一行不为相同语义重复堆图标。沿用 [ProgressRow](../../../dsh-nano-progress-report/src/client/rows.js) 的 `role` 表达人类/工具/边界等行语义，**另从绑定得出 actor**，不把所有 `exec` 都归 Sidekick。窄栏省重复模型名而不省角色；详情显示当时的模型、effort、修订、成员和来源定位。

**合流算法。** 先分别消费授权的根/子视图；同源按 seq（同 seq 按宿主节点 key）保序。用 `(sourceSessionId, nodeKey)` 做行身份，`(root, delegationId, attempt)` 做因果分组。根派工为锚，把可证属该尝试的子工具行置于该组，根回报/裁决是边界。墙钟仅作说明，不混排两套 seq；跨会话缺因果的并行活动各列自己的顺序，不编造先后。回报镜像凭稳定消息/事实引用链接，不以内容相似去重。只读 fold 为同一可见事实计数一次；业务计量从 attempt 权威取，不数 UI 行。角色过滤保留灰化的交接锚用于导航，但不把灰锚计入匹配数。

**订阅与证据。** 初始读根摘要；显示实时 Fusion 执行区时 retain 当前绑定成员，历史成员按展开/翻页按需 retain。关闭、切根、成员替换、不可见且 keep-mounted 的工作台页均释放不再需要的引用，关闭观察不得停止工作。子流不可授权或缺页，保留已知根事实和占位，不读磁盘补洞。实例路径见 [注册与双挂载](../../../dsh-nano-progress-report/src/client/index.js)、[单流 builder](../../../dsh-nano-progress-report/src/client/view/progress-builder.js)、[当前订阅与抽屉](../../../dsh-nano-progress-report/src/client/view/ProgressBody.jsx)。验收用根/子同 seq、同模型同工具、换配历史、普通成员和镜像回报 fixture；与手标行逐条一致，未知不冒认，收起最后一个观察者后额外引用数为 0。

### 11.5 真源位置、读写接口与失败合同（C01–C04、C07、C09）

这里的“位置”是宿主拥有的 Session journal / 公开 projection，不是插件去打开的文件路径。投影的 checkpoint 是缓存，不是第二份运行配置。下列名称是实现设计的逻辑字段；新增持久事件判别符、宿主公开方法、版本迁移和错误枚举在实现前须走 [业主] 既有合同裁决，不通过规格假装上游已有支持。

| 事实（谁能写） | 唯一权威位置 | 对外可读切面 / 不可做的事 |
|---|---|---|
| 配对意图与绑定（宿主配置处理器，根用户授权） | 根 journal：开关、Sidekick 期望路由、配对修订、有效/待生效边界、绑定/解绑 childRef。Lead 路由本身仍在原生 `model/selection`，用其 seq/ref 参与版本比较 | 投影联读得 desired/effective、当前绑定及能力原因。原生 `/model` 改 Lead 也使旧编辑失效。不写全局默认、localStorage 或第二份 Lead 配置 |
| 委派与验收（Lead 经宿主） | 根 journal：候选、委派意图、投递证据引用、Lead 裁决与关联的用户指令；brief/result 正文沿原生创建/消息面记录，不另建可执行队列 | 读任务、尝试、状态、范围、证据引用；Team 任务只是可选关联。回放、UI、decision、benchmark 都没有派工和验收权 |
| 实际执行（宿主子 runtime / provider） | 子 journal 的真实请求、工具/结果、retry、回报；根的 `subagentCatalog` 与历史绑定证明它当时是谁 | `actualRoute` 在首个有效请求前为未知；只按当时绑定归因。关闭配对不重标历史；常驻 agent 实例、名称、最新 picker 值均非身份凭证 |
| 费用与质量（provider / 独立 grader） | 用量认逐请求计量；实付认账单；单价重算认有日期币种的价目。评分认冻结 manifest 对应的逐项 grades，汇总从同版导出生成 | 会话页面可展示实测/估算/缺失；离线报告是不可执行的实验产物，不能回写产品配置、补发消息或修改 Lead 裁决 |

**领域接口草图。** `Route = {provider, model, effort?}`；`FactRef = {sessionId, seq}`（同一 seq 下的展示子项另附 node key）；`PairVersion = {pairRevision, leadSelectionRef}`，原生选择缺省须有明确初始标识。以下为宿主界面与执行面的共同语义，不新增浏览器直写日志或跨插件 REST。

| 操作 / 调用方 | 输入 → 输出 | 不变量 |
|---|---|---|
| `readPair` / 选择器与 composer | `root` → `{version, enabled, desired, effective, memberRef?, pending?, capability, lastConfirmedRef}` | 只读根作用域；desired 是用户所选、effective 是生效组合、actual 从请求取。首次或冷恢复先有显式 loading/unavailable，不把空值当 OFF |
| `applyPair` / 已授权配置 UI | `root, expectedVersion, draft` → 最新快照或当前可核对事实 | 宿主复核根身份、允许列表、effort 和实际适配能力。按根串行，完整比较版本；重复点击不能创建成员。不得以两次独立浏览器选模 PUT 冒充原子保存。涉及原生 Lead 选择时由同一宿主协调：准备→原生选择确认→提交配对引用；中途失败标待核对，不发布虚假成功、不擅自回滚并发 `/model`。不具备一致性能力则禁用组合提交 |
| `readContext` / `resolve` / Lead | 沿 §10.3；候选绑定 `root + pairVersion + delegationId`；尝试与历史事实分开编号。裁决包含动词、对象、依据 ref → 权威结果 ref | 先前相同裁决返回已知事实，不追加副作用；不同裁决冲突留 Lead 核对。收回后禁止新指派覆盖未知在途写入。刷新或超时不能把“请求失败”翻译成“未送达”。`advise` 在 V1 仍为 `not-run` |
| `observe` / Chat、composer、[DNPR]、计量 | `root, cursor?` → 带版本快照与后续变化。cursor 为按来源的水位集合，不是一个跨会话 seq；每项含角色依据、任务/尝试 ref、来源及覆盖标记 | 重复按稳定身份合并；缺口先重同步快照，不另起一个派工。投影回放纯函数、注册就绪才公布；取消订阅不取消 agent。未获子流权限不返回内容；日志和浏览器不出现凭据 |

**失败演练：** 两个 tab 读 v7，A 保存后 B 带旧版提交，B 看到差异而非覆盖；保存回包丢失先读权威快照。若旧成员在换配后回报，回报可显示在旧任务但不切回成员；若根/子投递确认不明，Lead 保留裁量且 UI 不自动重发。以“从头 fold”和“checkpoint + suffix”分别生成同一历史，配对、可见身份、委派终态一致且重放执行数均为 0。未提供所需公开面的 profile 要能运行普通会话，但不能标记 Fusion 完整可用。

### 11.6 效果、token 与 benchmark：只读「Fusion 评估」入口（C09–C11）

**入口与归属。** 在根会话选择器的 Fusion 配置页提供并列的次级文字按钮「查看 Fusion 评估」，并在根会话侧栏右键菜单添加同名快捷项；两者由 [DNMS] 打开同一只读报告面，不依赖 [DNPR] 的存在。宽屏主窗口级 `NanoDialog`，从选择器打开时先收起浮窗再开，关闭回到可用触发器；不改写未保存草稿（脏态先明确保留在会话内存或由用户取消导航，切根即丢弃）。报告入口不是「运行 benchmark」按钮；看报告不启动模型、不读任意服务器文件、不增加计费。Fusion 已关闭也能查历史。

| 页签与证据范围 | 信息层次、图形与交互 |
|---|---|
| **本会话用量**（当前根及已绑定成员） | 首行：已知总 token、推理费用（实付/按价目估算）、墙钟耗时、计量覆盖 `有凭证尝试/全部可识别尝试`。按 Lead/Sidekick 与摘要等辅助调用下钻；角色和调用用途是两个维度，不双计。按 attempt 展开未缓存输入、缓存读、缓存写、输出四个互斥桶，reasoning 作为输出子集附注。相同尺度的堆叠条配数值表；缺的桶标“未知”，不画成零。实时只报本会话，不用一次交接推算节省百分比或执行精度。 |
| **基准对照**（用户显式选择冻结报告） | 首行显示数据来源、suite/version、Lead/effort、Sidekick、币种/价目日期、运行数与覆盖。每簇一行，solo 与 Fusion 并排显示平均费用/次、费用/通过、可合并分/通过率、p50/p95 时长。差异列显示绝对值、相对值（分母有效时）及 §10.6 区间；成本和质量分开坐标，不用双轴美化结论。按“退化最大”可定位反例，点击到 task/repeat/arm → blocker、用量与脱敏证据。公开官方基准作独立引用卡，绝不与本地 task 混算。 |
| **证据与限制**（上述两种来源各自独立） | 显示 manifest/hash、grader/价目版本、数据时间、缺失、对账差和未定阈值；标注“支持 / 不支持 / 证据不足”的判据与适用配对。会话无报告时显示“尚无基准报告”，可导入获准的离线报告；格式错误、版本不支持或校验不符显示可读原因，保留旧视图、不上传、不执行。无资格评估的运行不涂绿。 |

**离线交接。** `lab/fusion/` 计划产出带 schema 版本的只读报告包：manifest、run index、逐项 grades、脱敏计量、汇总以及条目 hash。V1 首选用户本地选择导入，浏览器在本地解析，仅接受受限大小/条数的版本化数据、校验引用和 hash，拒绝脚本、可执行嵌入、远程资源和路径跳转；hash 只证明包内一致，不冒称发布方签名。缺少明细时可看汇总但标不可复核；缺完整推理计费时只给“已知小计”。没有报告从不把外部线上数字搬成我们的结果。再次打开可重选离线包，不另存第二份可写 benchmark 真源。

**图标与可读性。** 入口用 `IconChecklistOutlineRegular` +「Fusion 评估」（强调验证，不复用代表压缩的水位环）；token 用 `IconDataOutlineRegular`，时长用 `IconClockOutlineRegular`，不明用 `IconWarningOutlineRegular`。图标取宿主 [catalog](../../../packages/dsh-nano-ui/catalog/icons.json)，继承 `currentColor`，使用工具栏同级尺寸；图标不承载精确数值、身份或结论。图表以可键盘访问的数值表为底：已对账为明确文字、估算为标注、缺失用破折号加原因；正负变化同时写“省/贵、升/降、快/慢”。宿主有 primitive 先用宿主，其次 nano-ui；若没有允许的图形 primitive，V1 保留完整比较表，不借用宿主私有 DOM，不自绘一个看似精确的仪表盘。遵循 [nano-ui 规范](../dsh-nano-ui/DESIGN.md)。

**验收。** 用 §10.6 合成两臂数据导入时，费用/次显示 `$3.00 → $2.00`，费用/通过 `$6.00 → $4.00`，通过率 `50% → 50%`；并行示例墙钟 `10s`。零通过时费用/通过为“不可定义”，缺价格不显示 `$0`，重复回执不增 token。相同冻结包重复打开表值、覆盖分母、最差簇排序和导出的来源引用一致；窄屏用同行可展开明细而非仅 hover。截图应包括普通、退化、证据不足三态，并可回到支撑每个结论的样本。以上验收接回 §10.7，设计完成不等于 UI、宿主接口或 benchmark 已交付。

## 12. [业主] 裁决：以 rc.5 上层适配，不扩约

1. Fusion V1 的实现和测试以 [dsh] `0.2.2-rc.5` 为标准。先核对 `dsh-dev` 实际运行版本；三端升级留待合入后由 [业主] 另行安排，不在本次修改或部署范围内。
2. 不改上游 pin、源码或发布包。只在 [DNMS] 家族的独立工作树内用 driver 或 overlay 组合公开能力；不把本地补丁混入 pin。
3. 优先使用宿主命令、生命周期、Session journal 与只读 projection。配对、绑定、委派与裁决不得有第二份可写权威副本；不建 Fusion DB，不把缓存或消费回执用作恢复读源。
4. 显性拒绝扩约或第二份真源；若现有公开能力不能满足已批准合同，立即通知 [业主]，保留普通 Lead 路径，不以替代载体默默改变合同。

已批准的配置事实为 `plugin:nano-model-selector-fusion/fact`，由获会话授权的宿主命令写入，不复制 brief/result 正文。rc.5 的 `dsh-session` 文档明确禁止仓外插件调用 `appendPluginRecord`。`command/run` 是输入，`command/done` 是执行结果；后者可引用较早的权威事件，但二者均不会自动写出上述记录。未经另行裁决，不用命令文本、工具回显或 Team 任务顶替该记录。

留出实验允许在 `dsh-dev` 实跑，不设费用上限。同 Lead 成本比的 95% 区间上界须 < 1，百分制质量差下界须 ≥ −2，成功任务 p95 墙钟比须 ≤ 1.20；另列超时、失败和退化簇。缺少可核对的样本、分母或基线时不作可行结论。未经 [业主] 明确审查和指令，不合并回 `main`。

## 13. 执行裁决：以宿主命令生命周期承载配对事实（rc.5）

[业主] 指示：执行中遇到障碍时登记工作与裁决并继续推进，不得停止 goal。据此由 Lead 作出以下实现裁决；本章取代 §12 末段关于“未经另行裁决不用命令记录顶替”的限制，其余 §12 条款不变。

1. **配对事实载体。** 不写 `plugin:nano-model-selector-fusion/fact`（rc.5 禁止仓外插件调用 `appendPluginRecord`）。DNMSF 注册宿主命令 `/fusion`；宿主自身写入的 `command/run`（`name`、`args`）与按 `commandId` 配对的 `command/done`（`kind`）即配对事实。`success` = 已提交，`error` = 已拒绝，有 run 无 done = 结果未知（不显示为生效，不自动重试）。修订号取 `command/run` 的 seq。只读 projection 折叠根 journal 得到 desired/effective/pending/unknown，无新事件类型、无第二份可写副本，不扩约。
2. **授权边界。** 命令处理器只接受 Session 已记录的 `subagent/model-selection-policy` 允许路由（无策略时仅父路由），并经 `llm.resolveCallConfig` 预检 effort；策略在会话创建时固定，V1 不改写它。候选不在策略内时命令返回 `error`，UI 如实显示“本会话未授权”。
3. **Lead 可见性。** 已提交的配对修订由 pre-step 以带来源标注的 user message（`MessageSourceMap` 扩展，参照 `time-context`）注入一次，内容为 Sidekick 路由与 brief/回报协议；可从日志复原，满足 model-visible ⟺ logged。
4. **委派与绑定。** Lead 使用宿主原生 `subagent` 工具以 continuable 模式、显式 provider/model 创建 Sidekick，后续用原生 `send_message` 续办。绑定 = 根 `subagentCatalog` 中第一个 continuable 直接子会话且其子 journal 的 `model/selection` 与已提交配对一致；不一致标“路由不符”，不计为 Fusion 执行。
5. **Lead 裁决。** DNMSF 注册模型工具 `fusion_review`（`handoff`=子会话 ID，`verdict` ∈ `accepted|rework|reclaimed`，`note`）；其 `tool/call`+`tool/result` 即裁决事实，不复制 brief/result 正文。
6. **呈现与计量。** [DNMS] 配置页提交 `/fusion` 命令并只读投影；[DNPR] 按会话身份（根 = Lead，绑定子会话 = Sidekick）区分。用量取根与子 journal 的逐次请求用量；benchmark 在 `dsh-dev` 经 ego-browser 实跑，结果导入 `lab/fusion/`。
7. **剩余已知差距。** 会话中途不能扩大授权路由集合；若需要，须宿主另行提供，届时再报 [业主]。
