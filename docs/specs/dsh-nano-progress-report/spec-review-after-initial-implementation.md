# DNPR 初版实现后评审：async-compact、接口面与 agent-team 三场景（spec-review-after-initial-implementation）

> 评审稿，2026-11-19。对象是 [DNPR]（`dsh-nano-progress-report`）初版实现（工作树 `.agents/worktrees/npr-progress-report`，分支 `npr-progress-report`，提交 `e950d9b` / `ba8424f` / `0d8b6f1`）。
> 问题来自 [业主]：DNPR 目前没有实际消费者，只是给人看的另一种进度视图。能否 (1) 和 async-compact 结合，为截断提供上下文依据；(2) 做成 MCP 或接口服务，让其他插件或 [dsh] 本体读到进度视图；(3) 在 [dsh] 新版的 agent-team 里以上下文的形式出现，给不同成员同步准确的执行进度。
> 本文先给出带 `file:line` 的事实，再给判断，最后记录本轮的取舍：推进了什么，暂缓了什么，以及暂缓项的 re-open 条件。本文**不是**改约登记。凡标「需 [业主] 裁决」的项，都要等 [业主] 的决定落成 durable 登记后才生效。

## 0. 结论

1. DNPR 的可复用资产**不是 tab，而是进度投影模型**：一组纯函数，把会话事件确定性地归约成「执行单元 + 状态」。这套模型现在只活在浏览器包里（§2），而三个场景的消费者（压缩引擎、agent loop、team 成员）都在宿主侧。
2. **场景一（async-compact）**：评估报告 `async-compact-eval-1119.md` §7 发现的「verbatim 取错句子」，已由 `a7eabbf`（合入 `0cf1259`）按 `user`/`goal` 白名单修掉。它在 **team 场景**还留着一个缺口：成员的 turn 由 lead 的 `agent-message` 消息开启。生产 desktop 上有 25 个会话、146 个已结束的 turn 属于这种情况（§3.2），这些 turn 发生 step 级压缩时，补偿段会是空的。**本轮已在分支上修复，尚未合入 main**（§7.1）。「确定性进度锚」是本场景的最大杠杆（§3.3），但它会新增模型可见的输入，需 [业主] 裁决。
3. **场景二（接口）**：最有价值的消费者是模型本身。官方给出的合法通道是 `ctx.systemPrompt.context()` 与 `ctx.tools.register()`。插件之间的服务面和 HTTP MCP 都还没有消费者，**暂缓**（§4）。
4. **场景三（agent-team）**：rc.5 把 agent-team 从 rc.1 的 `experimental/` 转正，并放进 base bundle，但 Team 模式**默认关闭**（§1.2）。官方在设计上就没有进度同步：todo 单主，任务板只能拉取，任务变化不唤醒成员（§5.1）。生产会话里 lead 实际上**完全不用任务板**，靠 `subagent` 加 `send_message` 协作（§5.2）。DNPR 能补的特殊价值是「观测事实」。本轮先做零扩约的人类可见部分：Progress 时间线识别 relay 与 settled 两类团队消息（§7.2）。注入给模型的上下文需 [业主] 裁决。

## 1. 证据口径与版本基线

### 1.1 路径别名

| 别名 | 路径 | 版本 / 身份 |
|---|---|---|
| `[EV5]` | `.dependencies/eval/deepseek-harness/` | `dsh-v0.2.2-rc.5` @ `9c2670d3`（`.dependencies/MANIFEST.json` 中 `deps.deepseek-harness.eval`；`apps/cli/package.json:4` = `0.2.2-rc.5`）。本文的宿主事实以它为准 |
| `[PIN1]` | `.dependencies/pinned/deepseek-harness/` | `dsh-v0.2.2-rc.1` @ `66491b05`，即生产安装版本（`dsh --version` = `0.2.2-rc.1`） |
| `[CTX]` | `context/deepseek-harness/` | `0.2.2-rc.2`（rc.2 之后再前进 166 个提交），只读参考 |
| `[APP]` | `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar` | 桌面应用内置 `0.2.2-rc.3`；`~/.dsh-desktop` 的生产会话由它产生 |
| `[NPR]` | `.agents/worktrees/npr-progress-report/dsh-nano-progress-report/` | DNPR 初版实现 |
| `[MSC]` | `dsh-nano-model-selector-compaction/`（main @ `0cf1259`） | [DNMSC] 当前源码 |
| `[SESS]` | `~/.dsh-desktop/sessions/--Users-seanz-Documents-dsh-plugins--/<id>/session.v4.jsonl.zstd` | 生产会话 journal（只读，用 `zstd -dc` 解码统计） |

### 1.2 rc.1 → rc.5 的差异（只列与三个场景相关的部分）

| 面 | rc.1（`[PIN1]`，生产） | rc.5（`[EV5]`） | 影响 |
|---|---|---|---|
| agent-team 包位置 | `packages/experimental/{agent-team,tool-agent-team,client-ui-agent-team,agent-team-profile}` | `packages/team/{agent-team,tool-agent-team}`，`packages/client/ui-agent-team` | 已转正 |
| 默认组合 | `packages/bundle/*.yml` 中没有 agent-team 行 | `packages/bundle/base/cordis.patch.yml:366-372` 挂上 `agent-team` 和 `tool-agent-team`；`packages/bundle/web-app/cordis.patch.yml:412-413` 挂上 `ui-agent-team` | 「新版默认加入」指的是**包默认装上** |
| Team 模式默认值 | — | `packages/team/agent-team/README.md:28` 写明新 Session（含 fork）默认 Team 模式关闭；`:30`、`:57` 写明 `defaultEnabled` 默认 `false`，standard bundle 保持关闭 | 需要用户在根会话菜单里选择「Use Agent Teams」 |
| 动态上下文（PromptContext） | `docs/subsystems/system-prompt.md:78,155` 语义相同；`packages/core/agent-loop/src/runtime-context.ts` 的 `project(current, sections)` 没有「替代说明」 | `runtime-context.ts:164-180`：从第二次快照开始带上引导语「It replaces earlier versions of this context, including any retained in conversation summaries.」（`:170`） | rc.5 明确把 runtime context 定义为**能覆盖压缩摘要里旧事实**的通道（§3.3） |
| prompt 顺序常量 | 有 `TEAM_IDENTITY: 125` | `packages/core/system-prompt/src/index.ts:182` 只剩 `SUBAGENT_DELEGATION: 120`，新增 `TOOL_PTY_PANEL: 1710`（`:153`） | team 身份并入 subagent 身份 |
| compaction-basic | — | rc.1 → rc.5 只改了 `summarizer.ts:201` 一处（`LlmError.fromFailure`） | 压缩接缝没有变化，[DNMSC] 不受影响 |
| team / todo / subagent 文档 | — | `[CTX]` → `[EV5]` 之间这些包的 README、`docs/subsystems/{subagent,compaction,session-query}.md` 逐字节相同（只有 `package.json` 和测试不同） | 下文引用 `[EV5]` 行号，同样适用于 rc.2 / rc.3 |

**兼容性要求**：本仓插件的 `engines.dsh` 是 `>=0.2.2-rc.1 <0.3.0`（`[NPR]/package.json` 的 `engines`），所以任何新能力都必须在 rc.1 上也能退化运行。agent-team 在 rc.1 是 experimental，生产 profile 没有挂载它。因此依赖 `ctx.agentTeams` 的功能只能做成可选（`ctx.get('agentTeams')`，参见 `[EV5]/packages/AGENTS.md`「Optional services use `ctx.get(name)`」）。

## 2. DNPR 初版的事实画像

| 事实 | 位置 |
|---|---|
| 宿主半边是空壳：`inject = []`，`apply() {}` | `[NPR]/index.js:6-12` |
| 只有客户端，没有宿主路由，也没有宿主状态 | `docs/specs/dsh-nano-progress-report/spec-initial.md:14` |
| 范围排除了跨会话聚合 | `spec-initial.md:356` |
| 投影注册：9 个 NodeDefinition 加上 `progress` view target | `[NPR]/src/client/events/index.js:9-28`；`src/client/index.js:28` |
| 真人输入判定：只有 `source.kind === 'user'` 才算 prompt 行 | `[NPR]/src/client/events/message.js:7-13` |
| 行模型与状态归约都是纯函数，不依赖 ctx 或 DOM | `[NPR]/src/client/rows.js:1-19,98-203` |
| 行型和状态的取值范围 | `[NPR]/src/client/constants.js:9-15` |
| inbox 拼接只显示成「Inbox next-step: +N message(s)」，不展示内容 | `[NPR]/src/client/events/turn.js:113-151` |
| 初版测试 94 个，全部通过（本轮开始前的基线） | `npm test`（`[NPR]`） |

**判断**：初版作为人类视图是完整的。它的数据完全来自宿主事件流，没有第二份副本，满足 [单一真源]。它没有消费者的原因不在实现质量，而在部署位置：模型、压缩引擎、team 成员都看不到浏览器里的投影。

## 3. 场景一：与 async-compact 整合

### 3.1 压缩侧需要什么上下文

[DNMSC] 的部署后评估（`docs/specs/dsh-nano-model-selector/async-compact-eval-1119.md`）指出三类缺口：

| 缺口 | 评估出处 | 机制位置（`[MSC]` 现行行号） |
|---|---|---|
| step 级压缩的开场请求取错（取到宿主注入的消息） | 评估 `:202`（三个审查会话共用指纹 `263acc23`） | `lib/compact-region.js:558-595` |
| 欠切之后只剩 LLM 写的散文，模型也不回读原文 | 评估 `:165-173,199-204`（`b8f26a3e` 尾巴 3999、`e8db8ae9` 尾巴 2823；`inspect_checkpoint` 在 commit 之后 80 条 journal 里调用次数为 0） | 帧 `compact-region.js:311-318`；工具 `lib/inspect-checkpoint.js:238-251` |
| 选择器「层级优先于距离」导致切偏 | 评估 `:226,317` | `compact-region.js:463,545` |

### 3.2 a7eabbf 已修的部分，以及 team 场景的残留

`a7eabbf`（2026-11-19 09:55，合入 `0cf1259`）把开场请求的判定改成白名单：`USER_INTENT_SOURCES = new Set(['user', 'goal'])`（`compact-region.js:559`），并且跳过宿主注入的消息（`:585-586`）。它还新增了 `ensureVerbatimRequest`，在摘要之后确定性地补上开场请求原文（`:267-272`；调用点在 `lib/host-compaction.js:1143`）。回归测试是 `test/async-takeover.test.mjs:1974-1987`（T17）。

用生产会话核对修复是否有效：`[SESS]/534e58eb…`（评估中的审查会话之一）在 `turn/start` 之后，seq 13 的 `source.kind` 是 `working-directory`（「The working directory changed …」），seq 14 才是 `user`（真正的任务）。`'working-directory'` 这个来源类型由宿主声明（`[EV5]/packages/session/working-directory/src/index.ts:48,230`）。按照 a7eabbf 的规则，seq 13 会被跳过，取到 seq 14，修复成立。

**team 场景的残留**：team 成员被 lead 用 `send_message` 唤醒时，新 turn 的第一条用户消息是 `agent-message` relay（来源结构见 `[EV5]/docs/subsystems/subagent.md:200-209`），而它不在白名单里。对 `[SESS]` 全目录逐个 turn 统计：有 **25 个会话、146 个已结束的 turn** 是「只由 relay 开启，turn 内没有任何 `user` 或 `goal` 消息」（逐 turn 回放结果见 §7.1）。典型例子：`0120bb79…`、`09015015…`、`31945410…`、`678b6395…`、`7310636c…` 各 60 个 turn 中有 17 个；`session-cbd59953…` 63 个 turn 中有 17 个；评估中的 `534e58eb`、`cd43955d` 也在其中。这些 turn 一旦发生 step 级压缩，`currentTurnOpeningRequest` 返回 `undefined`，补偿段和 `ensureVerbatimRequest` 都不会生效，lead 交代的任务原文只能靠摘要转述。

对成员来说，lead 的 relay 就是这个 turn 的请求。把 `agent-message` 纳入白名单，和 a7eabbf「哪些消息算用户请求」的修复属于同一类：不改选择器、帧和台账字段，只会让 step 级的 `promptVersion` 随请求内容变化。这一点 a7eabbf 已经接受过。**本轮执行**，见 §7.1。

`subagent-settled`（`subagent.md:211-230`）**不纳入**白名单。它是运行时对「子代理结束了」的陈述，源码注释特别强调不能把它和 agent 自己说的话混在一起（`:213-217`）。

### 3.3 确定性进度锚（推荐，需 [业主] 裁决）

做法：从 journal 确定性地算出一段很小的进度摘要，通过 `ctx.systemPrompt.context()` 注入模型。内容包括：当前 todo 状态、改动过的文件路径、尚未恢复的失败命令、在跑的 job 和 subagent、goal 状态。

选择这个通道的依据：

- `PromptContext` 是缓存安全的动态上下文。agent-loop 只在内容变化，或者**压缩把它移除**时，才把完整快照写进 journal（`[EV5]/docs/subsystems/system-prompt.md:78`；类型在 `:82-93`）。写入的形式是 `source.kind: 'runtime-context'` 的 `user/message`（`packages/core/agent-loop/src/runtime-context.ts:14-21,176-179`），所以满足「Model-visible ⟺ logged」（`[EV5]/AGENTS.md:138`）。
- rc.5 的第二次快照会附带「It replaces earlier versions of this context, including any retained in conversation summaries.」（`runtime-context.ts:170`）。也就是说，这个通道在官方设计里就是用来**在压缩之后用确定的事实覆盖摘要**的，正好对应评估里「欠切之后只剩散文」的风险。
- 官方已经有同构的先例：`subagent:identity`（`packages/subagent/tool-subagent-control/src/index.ts:85-98`，`required: true`）、`subagent:delegation`（`packages/subagent/subagent/src/child-agent.ts:206-207`）、`tool:<name>:depth`（`packages/subagent/tool-subagent/src/index.ts:379-389`）。
- 这个上下文由 DNPR 的宿主半边注册，**完全不改 [DNMSC]**。不论压缩引擎是 [DNMSC] 还是原生 `compaction-basic`，它都能起作用，插件保持独立，符合 [不得侧载]。

代价和约束：

- 每次内容变化都会追加一份快照（`runtime-context.ts:164-167`，用 `deepEqualJson` 去重）。所以只投影粗粒度的状态，不投影逐条工具调用，并且设上限（建议 ≤600 token），避免高频变化。
- rc.1 的 `runtime-context.ts` 没有「替代说明」。快照仍然会在压缩后重写，但模型拿不到「这份快照覆盖摘要」的提示。
- 这是**新增的模型可见输入**，等于影响所有挂载会话的 prompt。按 [不得擅自扩约] 和 [dsh] 的 `packages/AGENTS.md`「Write model-facing contracts from the model's perspective」，需要 [业主] 裁决，并补上快照测试。本轮**不执行**。

### 3.4 其余两项（暂缓）

| 项 | 内容 | 暂缓理由 | re-open 条件 |
|---|---|---|---|
| 摘要覆盖率核对 | commit 之后检查摘要有没有覆盖 §3.3 的事实，把结果写进台账 | 台账字段属于冻结合同（评估 `:224`），而且依赖 §3.3 先落地 | §3.3 上线，并且 [业主] 同意改台账字段 |
| 工作单元切点 | 把「todo 项完成、工具链闭合、subagent 返回」作为选择器的候选层或 tie-breaker | 要改 -08「层级优先于距离」（`compact-region.js:545`），属于冻结合同 | [业主] 决定处理 pin 落地问题（评估 `:226`） |

## 4. 场景二：MCP / 接口服务

插件改不了 harness 本体，只能通过 tool 或 context 影响模型。所以「让 harness 本体读到进度视图」实际上就是「让模型读到」。

| 消费者 | 机制 | 依据 | 判断 |
|---|---|---|---|
| 本会话的模型（推送） | `systemPrompt.context()` | §3.3 | 推荐，需 [业主] 裁决 |
| 本会话的模型（拉取） | `ctx.tools.register` 注册 `progress_status`，复用 DNPR 的过滤语法 | [DNMSC] 的 `inspect_checkpoint` 就是在 isolate 之外的顶层注册（`[MSC]/lib/inspect-checkpoint.js:238-251`） | 排在推送之后。要和官方实验性的 `tool-session-query`（`[EV5]/packages/experimental/tool-session-query/README.md:12`，做原文检索）区分开 |
| team 内跨会话读取 | `ctx.sessionQuery.observeSession(sessionId, { projections })` | `[EV5]/docs/subsystems/session-query.md:390` | 见 §5.3 |
| 其他 nano 插件 | 不建 `ctx.provide('nanoProgress')` 让它们依赖 DNPR | [不得侧载]；[dsh]「Require a current owner and need」（`[EV5]/packages/AGENTS.md`） | **暂缓**：目前没有任何插件提出需要 |
| 外部或远程 agent | `createMcpToolset` 加 `POST /dsh-nano-progress-report/mcp`，和 [DNT] 的 `src/host/mcp.js:13` 同构 | `packages/dsh-interface/src/host/createMcpToolset.js:33-118` | **暂缓**：这是新路由，要登记 `security/route-sensitivity.json`，还会把跨会话数据暴露出去，属于新数据面。re-open 条件：[业主] 给出具体的外部消费者，并且方案保持平台中立 |

如果之后真的需要共享代码，形式应当是：把纯函数抽成 `packages/dsh-progress-model`，在构建期打进各自的 `lib/`，和 `packages/dsh-interface/AGENTS.md`「三出口纪律」的做法一样。这是代码复用，不是运行时通道。但在出现宿主侧消费者（§3.3 或 §5.3）之前，抽包没有持有者，**暂缓**。

## 5. 场景三：agent-team

### 5.1 官方的理解和做法（`[EV5]`）

| 事实 | 位置 |
|---|---|
| 根 agent 和它的全部后代组成一个 Team，成员通过 `subagent` / `subagent_fork` 创建，名字在同一创建者之下唯一 | `packages/team/agent-team/README.md:63-65` |
| 成员是独立的子 Session。fork 只在创建时复制一次父会话已完成的 turn，之后没有实时共享 | `docs/subsystems/subagent.md:174-178`；`packages/subagent/subagent-fork-in-process/README.md:143` |
| 每个成员独立累计 token，各自压缩 | `subagent-fork-in-process/README.md:116`；`docs/subsystems/compaction.md:5` |
| todo 严格单主，不能在 agent 之间共享；共享 todo「would change the model-visible contract」，目前还没有设计 | `packages/todo/tool-todo/README.md:56,155,169` |
| 任务板只能拉取：任务变化和 Team 模式变化不结束 `wait_agent`、不往 inbox 加消息、不唤醒空闲成员 | `agent-team/README.md:81` |
| 任务板的整板推送只发给浏览器；通知只送达在线的本地成员 | `agent-team/README.md:195,198` |
| 所有成员看到同一段 `team:policy` prompt | `packages/team/tool-agent-team/README.md:92,122` |
| `list_agents` 的 status 只表示 turn 是否活跃，不表示任务进度；`wait_agent` 只等调用者自己的 inbox | `packages/subagent/tool-subagent-control/README.md:56,60` |
| lead 拿不到成员的完整 transcript，只收到最终答复 | `packages/subagent/subagent/README.md:196` |
| 未定方向只有「自动释放任务所有权」和「worktree 隔离」 | `agent-team/README.md:215` |

**结论**：官方刻意不做成员之间的进度同步。成员只知道自己的 spawn prompt、一次性的 fork 快照和主动拉取的内容。压缩之后，连「我被分配了什么」都可能只剩摘要里的一句话。

### 5.2 生产使用画像（`[SESS]`，桌面 `[APP]` rc.3）

lead 会话 `session-60e08fea…`（56,403 个事件，221 个 turn）的统计：

| 指标 | 数量 |
|---|---|
| `subagent` / `subagent_fork` 调用 | 48 / 1 |
| `send_message` / `wait_agent` / `list_agents` | 34 / 15 / 9 |
| `team_task_*` 调用 | **0** |
| `todo_write`（`todo/write` 事件） | 38 |
| `goal/change` 事件；`get_goal` / `update_goal` / `create_goal` | 39；25 / 18 / 3 |
| `compaction/start` 事件 | 41 |
| `user/message` 按来源统计：`subagent-settled` / `agent-message` / `goal` / `user` | 52 / 60 / 117 / 105 |

成员会话 `534e58eb…`：只有 1 条 `user` 消息（spawn prompt），4 条 `agent-message`，18 次 `agent/inbox/spliced`，并且自己发生过 1 次压缩。

**判断**：[业主] 的实际工作流是「lead 用 subagent 分派，用 send_message 驱动，用 goal 和 todo 管理自身进度」，官方任务板没有被用过。所以 team 进度不能依赖 `ctx.agentTeams` 的任务板，而应当以 journal 里**观测到的事实**为主，任务板只作为可选补充。

### 5.3 DNPR 可以引入的特殊价值

| 价值 | 说明 | 依赖 | 判断 |
|---|---|---|---|
| ① 人能看懂团队消息 | 成员会话的 Progress 里，lead 下达的指令目前只显示成「Inbox next-step: +1 message(s)」（`[NPR]/src/client/events/turn.js:113-137`）；lead 会话里，成员结束的通知（`subagent-settled`）根本不出现 | 零扩约，纯客户端 | **本轮执行**（§7.2） |
| ② 成员的进度上下文 | 每个成员注入一段 team progress context：我的名字路径、lead 最近的指令、我当前的 todo、兄弟成员在动哪些文件。借助 PromptContext「压缩移除后重写」的语义，天然能在压缩后保留 | 新增模型可见输入；跨会话读取要用 `sessionQuery.observeSession` | 推荐，需 [业主] 裁决 |
| ③ lead 视角的成员摘要 | 每个子会话的确定性归约：最近在做什么、失败了几次、最后活动时间、todo 状态。这是 `list_agents` 给不了的 | 同 ② | 推荐，需 [业主] 裁决 |
| ④ 观测写入重叠告警 | 官方只根据**声明的** `writeScopes` 做建议性告警，并且承认 bash 和 formatter 可以绕过（`agent-team/README.md:197`）。DNPR 能根据**观测到的** write/edit 路径发现重叠 | 同 ②；任务板在生产中没被使用，所以应当基于 journal | 暂缓到 ② 落地之后 |

必须守住的边界：不唤醒成员、不代发消息（尊重 `agent-team/README.md:81`）；不造共享 todo（尊重 `tool-todo/README.md:169`）；不写 `team/task`、不复制任务板；只读本 team 树内的会话。

## 6. 裁决汇总

| 项 | 状态 | 依据 |
|---|---|---|
| [DNMSC] 的开场请求白名单纳入 `agent-message` | **本轮执行** | §3.2：146 个 turn 的生产证据，不扩约 |
| [DNPR] 时间线识别 `agent-message` relay 与 `subagent-settled` | **本轮执行** | §5.3 ①：消费者是 [业主] 本人的团队会话，不扩约 |
| 单会话确定性进度锚（PromptContext） | 推荐，**等 [业主] 裁决** | §3.3：新增模型可见输入 |
| team 成员上下文与 lead 成员摘要 | 推荐，**等 [业主] 裁决** | §5.3 ②③：模型可见输入，并且要跨会话读取 |
| 抽出 `packages/dsh-progress-model` | 暂缓 | §4：等宿主侧消费者出现 |
| `progress_status` 工具 | 暂缓 | §4：排在推送之后 |
| HTTP MCP、插件间服务面 | 暂缓（re-open：出现具体消费者） | §4 |
| 摘要覆盖率台账、工作单元切点 | 暂缓（re-open：[业主] 改冻结合同） | §3.4 |
| 观测写入重叠告警 | 暂缓（re-open：② 落地） | §5.3 ④ |
| DNPR 规格边界（spec-initial §9「不跨会话」、`:14`「client-only」） | 推荐项一旦获批就必须先改 | §2 |

附带的仓库事务（不在本轮处理范围内）：根 `AGENTS.md` 的插件缩写表还没有登记 [DNPR]；`npr-progress-report` 分支还没合回 main；main 下有一份未跟踪的 `dsh-nano-progress-report/` 副本，它是 [业主] 的工作区内容，本轮没有动它。

## 7. 本轮执行记录

两项都在 `.agents/worktrees/` 下的语义分支上完成并提交，**都还没有合回 main**，等 [业主] 指定合并目标。没有重启或安装任何 dsh 实例。

### 7.1 [DNMSC] 开场请求白名单纳入 `agent-message`

| 项 | 内容 |
|---|---|
| 分支 / 提交 | `dnmsc-relay-verbatim`（基于 main `0cf1259`）/ `86bd7a0` |
| 代码 | `lib/compact-region.js:558-564`：`USER_INTENT_SOURCES = new Set(['user', 'goal', 'agent-message'])`，注释写明 `subagent-settled` 不纳入的原因；`:566-575` 的 JSDoc 同步 |
| 测试 | `test/async-takeover.test.mjs` T17 增加两个用例（`:1989-1999`）：`working-directory`、`subagent-settled` 之后取到 relay 原文；turn 内只有 `subagent-settled` 时返回 `undefined` |
| 单测结果 | 在 worktree 中 `node --test test/*.test.mjs`：64/64 通过。main 下 T19 的失败（未跟踪文件导致）在干净的 worktree 里不出现 |
| 合同影响 | 不改选择器、帧、台账字段；只有 step 级压缩的 `promptVersion` 会随开场请求变化，和 a7eabbf 的性质相同 |

**生产回放**（只读解码 `[SESS]` 全部 274 个会话，对每个已结束的 turn，分别用 main 的 `currentTurnOpeningRequest` 和本分支的版本求值）：

| 指标 | main（`0cf1259`） | 本分支 |
|---|---|---|
| 已结束 turn 总数 | 2,250 | 2,250 |
| 取不到开场请求的 turn | 224 | **78** |
| 新取到的 turn（全部是 relay 开启） | — | 146，分布在 25 个会话 |
| 原本取得到、本分支取值改变的 turn | — | **0** |

剩下 78 个 turn 的构成：31 个只由 `subagent-settled` 唤醒，22 个只由 `tool-jobs`（后台 job 结束）唤醒，3 个由 `compaction-adoption-wake` 唤醒，1 个 turn 内没有任何用户消息，21 个的开场是只含图片的 `user` 消息。前四类本来就没有「请求」可以保留；只含图片的情况是 `ensureVerbatimRequest` 只处理文本造成的，不在本轮范围内。

### 7.2 [DNPR] 时间线识别 agent 间消息

| 项 | 内容 |
|---|---|
| 分支 / 提交 | `npr-progress-report`（原 HEAD `0d8b6f1`）/ `78c8f38` |
| 定义 | `src/client/events/message.js:28-73` 新增 `progressAgentMessageDefinition`：`user/message` 的 `source.kind` 是 `agent-message` 时出 `relay` 节点，是 `subagent-settled` 时出 `settled` 节点。注册在 `events/index.js:11`。人类 prompt 行仍然只认 `source.kind === 'user'` |
| 行型 | `src/client/rows.js:181-195`：两种行都归入已有的 `subagent` 类型，不新增 TYPES，过滤词 `type:subagent` 直接可用。relay 行状态为 ok，摘要是「Agent &lt;name&gt; sent a message: …」原文。settled 行摘要取 `source.summary`；只有记录了非 `completed` 的 `stopReason` 时才标失败 |
| 版本差异 | `stopReason` 是 rc.5 才有的字段（`[EV5]/packages/subagent/subagent/src/continuation-messages.ts:35-36`；rc.1 的同一接口 `:29-37` 没有）。没有 `stopReason` 的通知不作失败判断，摘要原文里仍然写明结局 |
| 测试 | `test/events.test.mjs:81-121` 新增 3 例，`test/rows.test.mjs:76-95` 新增 2 例，`test/bundle-smoke.test.mjs` 的定义数从 9 改为 10。`npm test`：99/99 通过（原 94 例加新增 5 例） |
| 构建 / 规则 | `npm run build` 重建 `lib/client.js`（已提交）；`node scripts/check-ui-rules.mjs` 的 NPR 行 0 警告 |
| 文档 | 包内 `AGENTS.md:86` 的「使用」表增加 `type:subagent` 一行 |

**生产回放**（同一批 274 个会话，把每条 `user/message` 送进新定义和 `rowFromNode`）：生成 960 条 relay 行、1,092 条 settled 行。settled 行中 5 条标为失败，688 条没有 `stopReason`（rc.5 之前写入）。没有任何一条消息同时被 prompt 定义和新定义认领；1,792 条 prompt 行保持不变；所有新行的摘要都非空。

`agent/inbox/spliced` 的 inbox 行保持原样。它表示「消息何时进入请求」，和 relay 行表示的「消息内容」是两件事，所以两者都保留。

### 7.3 待 [业主] 处理

- 两个分支的合并目标和时机，以及合并后删除 `dnmsc-relay-verbatim` worktree。
- §6 里标为「等 [业主] 裁决」的两项（单会话进度锚、team 成员上下文与 lead 成员摘要）。
