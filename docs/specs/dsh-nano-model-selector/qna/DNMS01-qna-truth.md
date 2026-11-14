# `DNMS01` — QnA Truth Ledger

> **Ledger ID**：`DNMS01-TRUTH`
> **范围**：[`DNMS01` async-compaction](../async-compaction.md) 执行层真相（只列已冻结 ID：`T-O-DNMS01-1`–`-22`，共 22 条）
> **文档性质**：`frozen-truth ledger / compact consumption entry`（问答是 decision provenance；本文不是第二真源）
> **状态**：`🔒 FROZEN · baseline 9 条 + executional 13 条（Q1–Q13 全确认）· NOT IMPLEMENTATION CLOSURE · NOT IMPLEMENTATION GRANT`
> **日期**：`2026-11-14`
> **Owner decision provenance**：[`DNMS01-qna.md`](./DNMS01-qna.md)（Round 0 baseline 冻结 + Round 1–5 逐轮 `✅ 已确认：选 A`，Q1→`-10` … Q13→`-22`；second-opinion 全程 `waived`）
> **上游已冻法律（只 CITE，本文不 supersede）**：[`DNLS01-qna.md`](../../dsh-nano-local-sandbox/qna/DNLS01-qna.md) 的 `T-O-8` 及读法判例（「不兼容」指合同面 :165 / 「硬切是切割方式不是时序」:163）；仓根 `AGENTS.md` 七条核心原则
> **形成史输入（测量，不裁决）**：[`async-compaction.md`](../async-compaction.md)（规格草案，现已被 supersede、降为指导史与证据索引）+ [nano-agent] grounding-truth 评测（仅作反面证据）
> **Review HEAD**：`74a0fe0`（行号为该时点快照，漂移时以「路径 + 符号名」为准）
> **远端 / paid**：`none`（`remote_ops=0`）

## 0. 权威边界（必须有）

本文是 [`DNMS01-qna.md`](./DNMS01-qna.md) 的精炼消费入口，也是下游直接 CITE 的引用面。本文：

1. 只登记业主已经接受的 `T-O-DNMS01-1`–`-22`。不新建 Truth-ID，不改变业主结论，不把摘要升级成新法律。
2. 不保留问题解析、候选方案、推荐论证、证据表或中场推演。这些留在问答原文。
3. 与问答的台账或业主回答不一致时 fail-closed，以问答为 provenance，并修订本台账。
4. 下游只能引用或细化本台账。不得把未选中的选项、或已被本台账改判的暂行句，再当成现行合同。
5. `FROZEN` 不表示代码已改、测试已绿、迁移已应用、或修正案已签署。
6. 本文不构成 implementation、build、deploy、secret、provider 或任何远端动作的 grant。
7. 测量层是当时的 HEAD 事实（P1），`T-O` 是目标态。施工落地后不回改测量层。
8. 推翻任一旧行，只能在原问答里 append-only supersession。不得改旧行，不得在下游文档里改写，不得回改更早的台账。

### 0.1 总体裁决（必须有）

```text
baseline   T-O-DNMS01-1..-9:     FROZEN（Round 0，业主 2026-11-14）
executional T-O-DNMS01-10..-22:  FROZEN（Round 1–5 逐轮确认）
OPEN owner decisions:            0（无预留、无待决、无 OPEN 残题）
足以写下游计划:                  YES（满足收口四条判据，计划可启动）
足以签发 implementation grant:    NO
remote / deploy / live:          NOT CLAIMED
```

```text
DNMS01-qna.md（已冻结，decision provenance）
  → 本台账（引用面，只投影已选中那一格）
  → 《DNMS01 计划》（只 CITE；§2.1 T-O 1:1、§2.2 T-R[HEAD-实测]）
  → （另立）ImplementationGrant
```

## 1. Truth-Gate 总表（必须有）

| Truth-ID | 领域 | 冻结核心 | 来源 |
|----------|------|----------|------|
| `T-O-DNMS01-1` | 范围 | 阶段范围 = 四条要求 + 一个按钮（①启/关+指定压缩模型 ②水位 B/H/S/pinned 插件落地 ③接管全部压缩真源 ④不接管 micro、full 兜底接入 + 在媒体生成旁增设启用按钮；①读作 overlay ON/OFF） | Round 0 baseline |
| `T-O-DNMS01-2` | 权威分层 | 会话 durable 真值 = host-owned append-only Session log（不复制、不新增 event type）；插件唯一权威 = 压缩策略/配置/触发/backend 的真源，**只在 ON 态成立**，OFF 归还原生 | Round 0 baseline |
| `T-O-DNMS01-3` | 架构 seam | `ctx.compaction` 合法可替换：**同一瞬时单实现**；`CompactionEngine extends Service` + 3 抽象方法 + 六失败码；durable 协议原样复用；无 `beforeCompact`/`afterCompact`/`registerSummarizer` 与 model-facing tool | Round 0 baseline |
| `T-O-DNMS01-4` | 现状与先例 | 无 Host `Config`；`media-engine.json` 为状态真源、localStorage 仅缓存；54px rail + 同源 fetch + `ctx.webServer.register`；新路由先登记 `route-sensitivity.json` 再 build；本包即遮蔽式 overlay 实证 | Round 0 baseline |
| `T-O-DNMS01-5` | 治理硬约束 | [业主] 最高裁决权 + [真相层] truth-id 要求 + 七条核心原则（插件中立 / 上层建筑归host / 不得侧载 / 单一真源 / 不得擅自扩约 / 不得过度仪式 / worktree）；公共合同变更须 [业主] durable 决定 | Round 0 baseline |
| `T-O-DNMS01-6` | 长期治理四原则 | `能硬切就不要双写`/`能彻底退役就不要提供兼容`/`平台中立`/`不耦合私域`；**「不兼容」指合同面不是 UX 回退**；「硬切」= 切换时刻原子无重叠；退役对象是合同面不是出厂 backend | Round 0 baseline |
| `T-O-DNMS01-7` | 反面证据 | [nano-agent] 踩坑只作反例不实现：不 import 代码、不复制 D1/Queue/DO/cron、不建侧载；「两套系统未焊接/GTY7 饿死」针对**同时在线**而非互斥切换 | Round 0 baseline |
| `T-O-DNMS01-8` | 事实基线 | 草案「事实基线」三路 `file:line` 核查已冻结（13 订正/3 UNVERIFIED/rc.2≡rc.3/4 preset group/P0 必测）；**§5 D1–D6 为待裁决槽**，事实可继承、决策必须由 [业主] 冻结 | Round 0 baseline |
| `T-O-DNMS01-9` | 双态语义 | **overlay 热插拔：ON → 接管全部 compaction lane；OFF → 回退 [dsh] 原生**（`compaction-basic` 重新 active、原生 auto/Config/`/compact` 全部回来）；优先于「永久替换/内部开关」读法 | Round 0 baseline |
| `T-O-DNMS01-10` | lane 归属 | **组合层互斥 overlay 开关**：同 realm 内出厂行与我方行 `disabled` 互补、覆盖 base 扁平行 + 4 preset group；ON 我方 Provider 接管全部 lane（原样复用 durable 协议、自持三监听与 overflow）；OFF 出厂行回 active；`command-compact`/`tool-result-pruner` 保留；一次重组合原子切换 | Round 1 / Q1 |
| `T-O-DNMS01-11` | 配置真源 | **两态各一份 canonical + 平台中立**：ON `async-compact.json` 唯一可写权威（PUT 单写、Provider 单读、localStorage 仅缓存）；OFF 宿主原生行 Config、插件零写；新增一条 `GET/PUT /nano-model-selector/async-compact`（L3/16384）；不引 Host Config / configEditor / 共享契约包 / 新 lane / event type | Round 1 / Q2 |
| `T-O-DNMS01-12` | 开关 canonical | ON/OFF 布尔的**唯一 durable canonical** = profile 行组合后 `disabled` 生效值；`async-compact.json` 移除 `enabled`（R-7）；UI 只读投影 `enabled: !entry.disabled`；不投影/不 reconciliation/不留兼容键；写者经 R-10 修为 `set_bundle`（→`-14`） | Round 2 / Q3 |
| `T-O-DNMS01-13` | full/micro 边界 | ON 态 full = **我方单 Provider 内部模式**；full 触发闭集（safety / DC-1 / 后续 B crossing / `/compact`）；`B≤H` 写时 reject；overflow ON 归我方 OFF 归原生（R-8）；micro 严格零改动但 `ctx.get('toolResultPruner')` 消费 | Round 2 / Q4 |
| `T-O-DNMS01-14` | 开关执行面 | ON/OFF = **专用 bundle `dsh-nano-model-selector-compaction` 在 `dsh.profile.bundles` 的成员资格**；一次 `set_bundle` + 一次 `reload()`；面板 → `setBundleEnabled`（sanctioned）；per-profile；读态三件套；只 `dsh-dev`、绝不 `dsh.local` | Round 3 / Q5 |
| `T-O-DNMS01-15` | 策略契约 | `async-compact.json` **7 字段最小 schema**（无 `enabled`）；B=0.65 / H=0.50 / S=0.80 只读 / pinned 100000·20000 / 0.25 地板 / `effectivePin=min(pinned,floor(0.15×W))`；`effectivePin/W<H<B<S<1`；写时 reject `400+不落盘`；一条 `GET/PUT` 路由 + 错误闭集 + 五处对齐；tmp+rename / fail-closed / 未知 schema 拒绝 | Round 3 / Q6 |
| `T-O-DNMS01-16` | Provider 契约 | ON 态唯一 `CompactionEngine` 子类**按协议重实现三方法**；仅复用包根 Cordis-free 原语、不 import 未 re-export、不子类化 `BasicCompactionEngine`；durable bracket + 六失败码 + shrink 校验 + `sourceCommandId`；自注册三监听；prune 消费时序；no-cap；P0 spike 前置 | Round 3 / Q7 |
| `T-O-DNMS01-17` | 交付 | **一仓两包**：`dsh-nano-model-selector-compaction` 独立 bundle 包 + 主包升 `0.3.0`；各自版本/tarball/`RELEASE.md` 行/CI 项；安装主包→compaction 包、卸载反向；**默认 OFF**、首跑不创建状态文件、未知 schema 400 拒绝不 migrate；`AGENTS.md` 增合同节 + README 同步；只 `dsh-dev` | Round 4 / Q8 |
| `T-O-DNMS01-18` | 运行期 | 按入口分型 + **真 async（跨 turn 调度 + 下一请求 adoption + ephemeral intent）** + `one-active`（`compaction/start` 未配对锁）+ 多会话/多 profile 隔离 + safety-only degraded + pruner 容缺 + 不清锁 + ephemeral circuit + **overflow=1** | Round 4 / Q9 |
| `T-O-DNMS01-19` | 观测/DoD | 观测面五类闭集（logger/`runtime` 派生字段/`compaction/summary·end·prune`/pluginInventory/compositionInventory）；不建 audit；L0–L5 六级验收；可判定 DoD；发布授权归 [业主]、不新设 release-gate | Round 4 / Q10 |
| `T-O-DNMS01-20` | UI 契约 | rail 第 4 图标（`filter='compact'`）+ U1–U4 四态 + 切换确认与四类结果（`restart-required` 持久条）+ 18 个 i18n key + 四处 `filter !== 'media'` 清理 + **允许新增第 2 条路由 `POST …/switch`**（五处对齐同样适用） | Round 5 / Q11 |
| `T-O-DNMS01-21` | 观测派生 | `lastCompaction` 经 `ctx.sessionProjections` 派生（`stateVersion:1`，折叠 `compaction/summary·end·prune`）；`fill` 按需 `measure` + 5s memo；`degraded` 四值闭集；客户端零轮询；B 线每 turn ≤1 次 measure；读面 partial-degrade；L3 性能断言 | Round 5 / Q12 |
| `T-O-DNMS01-22` | 收口交接 | Round 5 冻结即全轮收口（22 条、不设 Round 6）；`async-compaction.md` 加唯一 supersession banner + 逐节处置；§1 `T-O`→计划 §2.1 1:1 CITE；9 项 P0→计划 §2.2 `T-R[HEAD-实测]`；计划附录 deferral 表；不新设 gate、不授权发布 | Round 5 / Q13 |

## 2. 规范内核（必须有）

> 按业务簇分组。每条只有来源与已冻结的内核；不落选项、不搬推荐理由、不搬证据表。
> 密度跟源头走：`-17`–`-22` 源头为 ①②③ 序号的**原样投影**（下游会点名）；无序号者收成短段。

### 2.1 范围、权威分层与机制基础（baseline）

#### `T-O-DNMS01-1` —— 阶段范围：四条要求 + 一个按钮
> **来源**：`Round 0 baseline（[业主] 指令 2026-11-14 + 二次澄清）` ｜ **驱动后续**：`Round 1 Q1/Q2；后续全部轮次`

阶段范围 = [业主] 四条要求 + 一个按钮：**① 启用/关闭 async compact 并指定压缩模型；② 设置水位并把 `pinned-async` / `health-target` / `safety` 概念以插件形式落地 [dsh]；③ 启用后替换 [dsh] 宿主全部压缩的真源并完整接管 compaction；④ 不接管 micro-compact、full 作兜底并接入**；并在已实现的「媒体生成」旁增加一个 async-compact 设置/启用按钮。**要求 ① 的「启用/关闭」按 [业主] 澄清读作 overlay 的 ON/OFF，不是内部策略标志。**

> **下游约束**：四条要求逐条兑现；要求 ④ 的 `tool-result-pruner` 行不得改动。

#### `T-O-DNMS01-2` —— 「真源」必须分层
> **来源**：`Round 0 baseline` ｜ **驱动后续**：`Q1/Q2；全部轮次`

[dsh] 的会话 durable 真值 = **Session log**（host-owned、append-only）：插件不得复制第二份、不得新增 session event type。插件能成为的唯一权威 = **压缩策略 / 配置 / 触发 / backend 的真源**——**且该权威只在 ON 态成立，OFF 态归还 [dsh] 原生**。fork / resume / replay 由 log 派生；两态都不复制会话状态。

> **下游约束**：禁止自持会话副本、禁止新 event type；派生缓存只允许 consumption receipt 形态。

#### `T-O-DNMS01-3` —— `ctx.compaction` 可替换 seam
> **来源**：`Round 0 baseline` ｜ **驱动后续**：`Q1`

`ctx.compaction` 是合法可替换的 capability seam：**任一瞬时单 context 单实现**（约束的是同一瞬时的 active provider，不等于出厂实现必须永久删除）；出厂 backend = `dsh-compaction-basic`；`/compact` backend-independent；durable 协议（`compaction/start|summary|end` + `compactCheckpointSource` + `surfaceOp.replace` + `frameSummary`）必须原样复用。**不存在** `beforeCompact`/`afterCompact`/`registerSummarizer` 拦截点，也无 model-facing compaction tool。

> **下游约束**：接管 = ON 态替换 Service Provider，不改 loop、不改 host seam 契约；OFF 态让原生 Provider 重新 active。

#### `T-O-DNMS01-4` —— [DNMS] 现状合同 + overlay 先例
> **来源**：`Round 0 baseline` ｜ **驱动后续**：`Q1/Q2`

无 Host `Config`；`plugins/nano-model-selector/media-engine.json` 为状态真源、localStorage 仅缓存；单列 54px rail 首排 3 按钮；同源 fetch + `ctx.webServer.register` 路由；新路由必须先在仓库根 `security/route-sensitivity.json` 登记再 `npm run build` 烘焙；安装/验收/「不要」四条。[DNMS] 本身就是**遮蔽式 overlay 实证**：出厂 `ui-model-selection` 仍在提供 `ctx.modelDirectories` 与 `/model`，本包靠 `ctx.slots.inject` 注册顺序遮蔽座位；禁用本行 → 原生选择器自然回来。

> **下游约束**：新设置沿用「状态文件 + GET/PUT + 缓存」既有形态；ON/OFF 座位语义照本包既有 overlay 先例，不自造第二套配置面。

#### `T-O-DNMS01-5` —— 仓规硬约束
> **来源**：`Round 0 baseline（仓根 AGENTS.md）` ｜ **驱动后续**：`Q1/Q2；全部轮次`

[业主] 全仓最高权限、覆盖全部前序 qna 与真相层裁决；[真相层] 要求每个冻结真相有 truth-id 锚定回溯；[DNMS]/[DNCS] 已登记；七条核心原则：**插件中立 / 上层建筑归host / 不得侧载 / 单一真源 / 不得擅自扩约 / 不得过度仪式 / worktree**（worktree 唯一合法位置 `.agents/worktrees`）。

> **下游约束**：新 lane / error 枚举 / idempotency / retry 义务 / 新凭证面须 [业主] durable 决定，单一登记真源；禁私有 import、硬编 base-url 或密钥；不得由实现反推合同、不得把「测试要求如此」当合同来源。

#### `T-O-DNMS01-6` —— 长期治理四原则（校正读法）
> **来源**：`Round 0 baseline（[业主] 本轮新给 + 澄清）` ｜ **驱动后续**：`Q1/Q2；全部轮次`

四原则：`能硬切就不要双写` / `能彻底退役就不要提供兼容` / `平台保持中立` / `不得耦合私域`。**校正读法：「不兼容」指合同面，不是用户体验回退**；「硬切是切割方式，不是时序」。四原则禁止：两个 provider 同时在线、状态双写、路径/工具/配置键别名、兼容 façade、第二份公共合同、迁移期双轨；**不禁止** overlay 的 ON 接管 / OFF 回退原生。「硬切」在 DNMS01 = 切换时刻**原子、无重叠**；被彻底退役的对象是草案中的兼容/双写倾向（架构 B 静默降级、引入 Host Config 的 v2 兼容）；「回到宿主默认压缩」不被覆盖——它正是 OFF 语义。

> **下游约束**：不建并存双轨、不留兼容 façade、不留状态双写、不留旧别名/旧配置键；但必须保留出厂 backend 可恢复，OFF 时它真的重新 active。

#### `T-O-DNMS01-7` —— [nano-agent] 踩坑只作反面证据
> **来源**：`Round 0 baseline` ｜ **驱动后续**：`Q1/Q2；executional 轮`

踩坑清单只作反例、不作实现来源：GTF1 death-cut、4th-wave 两套系统未焊接、GTY7 后台车道被同步 swap 饿死、4.6× 双币种低估、`completed ≠ ready`、checkpoint 迟到、stored-not-enforced、R5 栅格旁路、Y12 失败不推导 FULL、sweet-spot 有效窗口被否决、「独立压缩管道」零命中。**不 import 其代码、不复制 D1/Queue/DO/cron、不建跨仓侧载。**「两套系统未焊接」与「GTY7 饿死」针对的是**两个实现同时在线**，不是互斥切换。

> **下游约束**：「反例」栏可直接 CITE 已登记条目；不得把 [nano-agent] 组件名抄进 [dsh] 合同。

#### `T-O-DNMS01-8` —— 事实基线已核查，D1–D6 为待裁决槽
> **来源**：`Round 0 baseline` ｜ **驱动后续**：`Q1/Q2`

前序设计草案的「事实基线」已三路 `file:line` 核查冻结（13 项订正、3 项 UNVERIFIED、安装版 rc.3 与检出 rc.2 在 compaction 上逐字节一致、4 个 preset `id: compaction` isolate group、P0 spike 必测）；**但草案 §5 的 D1–D6 是待裁决槽、未冻结**——不得把草案推荐当 baseline 真相，不得由实现反推合同（D1–D6 后由 `-2`/`-9`/`-11`/`-12`/`-13`/`-14`/`-18` 逐条覆盖，见 §4.3 R-14 结算）。

> **下游约束**：事实可继承、决策必须重新由 [业主] 冻结；P0 spike 未通过前不写实现。

#### `T-O-DNMS01-9` —— overlay 热插拔的 lane 归属语义
> **来源**：`Round 0 baseline（[业主] 澄清冻结）` ｜ **驱动后续**：`Q1/Q2；全部轮次`

[dsh] 插件本质是 overlay、热插拔：**启用（ON）→ 接管全部 compaction lane；关闭（OFF）→ 回退 [dsh] 原生 compaction**（`dsh-compaction-basic` 重新 active，原生 `auto` 三监听、原生 Config、原生 `/compact` 全部回来）。这是要求 ① 与 ③ 的联合本意，优先于任何「永久替换 / 内部策略开关」读法；按 [业主] 最高权限覆盖前序裁决。

> **下游约束**：ON/OFF 两态都必须完整可用；OFF 不得出现「无压缩」空窗；不得把 OFF 实现成「我方 Provider 自己模拟默认」。

### 2.2 lane 归属与互斥切换

#### `T-O-DNMS01-10` —— 组合层互斥 overlay 开关
> **来源**：`Round 1 / Q1（业主 选 A）` ｜ **驱动后续**：`Q3/Q4；全部 executional 题`

采用「同一瞬时恰好一个 active `ctx.compaction` provider」的**组合层互斥开关**：在同一个 `id: compaction` isolate realm 内保留出厂 `compaction-basic` 行与 [DNMS] Provider 行，两行 `disabled` **互补**，覆盖 base 扁平行与 `standard`/`minimal`/`ptc`/`presets` 四个 preset group 内层。**ON** → 我方 `CompactionEngine` 子类接管全部 lane（自行注册 `agent/pre-step`/`agent/request`/`agent/request-error` 三监听与 overflow recovery），原样复用 `compaction/start|summary|end` + `compactCheckpointSource` + `surfaceOp.replace` + `frameSummary()`，不新增 event type、不复制会话真值，出厂行挂起；**OFF** → 我方行挂起（fiber dispose → provision 自动 unregister、唤醒 dependent）、出厂行重新 active，原生 `auto`/`thresholdRatio`/`retainRatio`/`summarizationProvider,Model`/原生 `/compact` **完整回来**。`dsh-command-compact` 与 `dsh-compaction-tool-result-pruner` 两行**始终保留**（前者 backend-independent 跟随当前 active Provider；后者独立 `toolResultPruner` realm，不参与翻转 = 兑现要求④）。切换由**一次 profile 重组合**驱动，**原子、无重叠**；**不是纯运行期服务值开关**——`disabled: !!js` 只在 mount decision 求值，写 `async-compact.json` 不会自动翻转；有 HMR `applied`、无 HMR `restart-required`，**不重启 `dsh.local`（生产）**。「硬切」= 切换时刻原子无重叠；「彻底退役」对象是合同面（别名/旧配置键/双写状态/兼容转发层），不是出厂 backend——它挂起可恢复。Q1 附带裁决（`enabled` 触发层级留待 executional 轮）已由 `-14` 收口。

> **下游约束**：《DNMS01 计划》的 patch 成对翻转清单 / 两态 Provider 归属 / HMR-restart 边界 / 验收 G-ON、G-OFF。

#### `T-O-DNMS01-14` —— 开关的组合层执行面与触发层级
> **来源**：`Round 3 / Q5（业主 选 A）` ｜ **驱动后续**：`Q8/Q9/Q10；全部 executional 题`

ON/OFF 由**专用 compaction bundle**（`dsh-nano-model-selector-compaction`）在 `dsh.profile.bundles` 中的**成员资格**表达：**ON** → bundle patch 生效，向 4 个 preset `id: compaction` isolate group 内层与 base 扁平行位置插入我方 Provider 行并覆盖 `compaction-basic` 行为 `disabled:true`；**OFF** → 整层移除，原生回到 active。主 [DNMS] bundle **常驻不动**。**一次写 + 一次重组合**：`set_bundle` → `selectBundle` 改 `package.json` 的 `dsh.profile.bundles` → 一次 `reload()`；有 HMR `applied`、无 HMR `restart-required (no-hmr)`。**触发层级**：面板开关 → `ctx.remote.pluginManager.setBundleEnabled(bundleName, enabled)`（sanctioned Host service；浏览器半侧授权 UNVERIFIED，若不可用改由本包路由在 Host 侧经 `ctx.get('pluginManager')` 调同一写者）；**不是纯运行期即时开关**、不做假进度条。**作用域 per-profile**；已有会话保留旧 revision、须**新会话**验证；**只在 `dsh-dev` 重启**。**读态三件套**：`compositionInventory()` / `pluginInventory.list()` 的 `agentPresets` 段 / `dsh --profile <dev> --dump-config` 字面比对。`-12` 的执行细节按 R-10 修订（写者 `set_plugin`→`set_bundle`；文件 `cordis.patch.yml`→`package.json` bundles）；其真相结论不变。

> **下游约束**：《DNMS01 计划》的 bundle 拆包 / `set_bundle` 一次写 / 触发层级 / 读态三件套 / 禁重启边界 / R-10。

### 2.3 两态 canonical 与策略契约

#### `T-O-DNMS01-11` —— 两态各一份 canonical + 平台中立
> **来源**：`Round 1 / Q2（业主 选 A）` ｜ **驱动后续**：`Q3/Q4；全部 executional 题`

B/H/S/pinned/DC/checkpoint-first/adoption 只作**语义与数值口径**借鉴 [nano-agent] [真相层]，全部实现落在 [DNMS] 包内新模块（`lib/compact-policy.js`/`compact-scheduler.js`/`host-compaction.js`）+ [dsh] 原生扩展点。**ON 态** `async-compact.json`（`$DSH_DATA_DIR`/`$DSH_HOME`/`~/.dsh` 下 `plugins/nano-model-selector/`）是**唯一可写权威**：PUT 单写、我方 Provider 单读、localStorage 键 `dsh-nano-model-selector:async-compact.v1` 仅缓存；`validateMasterOrder`（`effectivePin=min(pinned,0.15×W)`、`effectivePin/W<H<B<S(0.80)<1`、`B∈[0.25,S)`、DC-1/2/3、单条 `fill=tokenMeter.measure(session).totalTokens/W`、nominal window 唯一分母）在每条写路径执行、clamp 进 durable audit。**OFF 态**宿主原生读自己的行 Config，插件**不投影、不写、不改写宿主行任何字段**——两态各一份、互不重叠，**不是双写**。不引入 Host `Config` schema、不用 `configEditor`、不抽跨插件共享契约包、不新增 lane/event type/model-facing tool、不 import [nano-agent] 代码、不硬编 base-url 或密钥；对外只新增一条先登记 `security/route-sensitivity.json` 再 `npm run build` 烘焙的 `GET/PUT /nano-model-selector/async-compact`（PUT 16384 上限、校验失败 400 不落盘），模型下拉复用既有 `/catalog`。

> **下游约束**：《DNMS01 计划》的 policy schema / 路由与 ledger / 单一 canonical 验收 / OFF 态零写断言。

#### `T-O-DNMS01-12` —— ON/OFF 开关状态的唯一 durable canonical
> **来源**：`Round 2 / Q3（业主 选 A）` ｜ **驱动后续**：`Q5/Q6/Q7；全部 executional 题`

ON/OFF 这个布尔的**唯一 durable、可写、可被 runtime 当权威读取的 canonical** 是 **profile 用户 patch 层中那两行组合后的 `disabled` 生效值**。**唯一合法写者**原判 `set_plugin → writePluginEnabled`，经 R-10 修为 `set_bundle → selectBundle`（见 §4.5 AMEND-3）；插件代码不得自写 profile patch/`package.json`，`configEditor.edit` 只写 `config`、不能改 `disabled`。`async-compact.json` **彻底移除 `enabled` 字段**（R-7），只保留 B/H/S/pinned/model 策略；同时退役「`enabled=false` → 宿主默认压缩」及任何「json 优先 / patch 优先」映射。UI 当前态走**只读投影** `ctx.remote.pluginInventory.list()` 的 `enabled: !entry.disabled`；localStorage 只缓存策略值、不缓存开关态。切换仍按 `-10` 成对翻转、由一次 profile 重组合生效（有 HMR `applied` / 无 HMR `restart-required`，不重启 `dsh.local`）；**不投影、不 reconciliation、不留兼容键、不做运行期 hotfix**。明确否决：json canonical + 投影（双写 + stored-not-enforced）、两份 + 对账、ephemeral、整包 `set_bundle` 主 bundle（粒度错）。

> **下游约束**：《DNMS01 计划》的开关真源 / schema 修订 R-7 / 只读观测面 / 反 stored-not-enforced 验收 / 重启持久断言。

#### `T-O-DNMS01-15` —— 策略契约（7 字段 / 数值 / 校验 / 路由 / 错误码 / 五处对齐）
> **来源**：`Round 3 / Q6（业主 选 A）` ｜ **驱动后续**：`Q8/Q9/Q10；全部 executional 题`

`async-compact.json` 冻结为 **7 字段最小 schema**（无 `enabled`）：`{schema:1, model:{provider,model}, bufferSizeAsync, healthTargetAsync, bufferSizeSafety, pinnedAsyncTokens, pinnedFullTokens}`。**数值**：B=0.65 / H=0.50 / S=0.80（**只读、PUT 携带即 400**）/ pinned-async=100000 / pinned-full=20000 / 0.25 写时地板 / `effectivePin=min(pinned,floor(0.15×W))`。**校验律**：`effectivePin/W<H<B<S<1`、`B∈[0.25,S)`；DC-1→full-only、DC-2/DC-3→reject；**`B≤H` 写时 reject（非 full-only）**；单条 `fill=ctx.tokenMeter.measure(session).totalTokens/W`、`W=ctx.llm.resolveModelInfo(...).context.contextWindow`，**禁止第二公式/第二分母**；no-cap（省略 `max_tokens`/`max_output_tokens`、incomplete/partial 不采用）。**一律写时 reject：400+不落盘，不静默 clamp、不新建 durable audit 文件**。`model` 为 `{provider,model}`、PUT 经 `ctx.llm.resolveModelInfo` 校验已注册路由、空串对沿用最近 routed target。**路由** `GET/PUT /nano-model-selector/async-compact`：`L3`/`bodyLimit:16384`/`sessionBinding:false`；GET 回包 `{...policy, effective:{pin,windowMin,dcs}, runtime:{fill,lastCompaction}}`，`effective`/`runtime` 为**只读派生字段**（不落盘、不作恢复读源）；**错误闭集由 [业主] 登记**（`invalid-schema`/`invalid-range`/`invalid-model`/`body-too-large`/`invalid-json-body`/`state-read-failed`/`state-write-failed`），**不新增未登记 errorId**。**五处一次性对齐**：`route-sensitivity.json` 行 + `feature-contract.json` 的 `responseShape` 行 + `scripts/route-scan.mjs` 扩展 + `npm run build` 重烤 `lib/route-table.js`/`lib/route-guard.js` + `package.json` files/exports。**状态文件**：tmp+`renameSync` 原子替换、invalid-JSON **fail-closed**、`schema:1` 未知版本**拒绝且无旧键回退/无双读**；localStorage 仅缓存策略。[dsh] 出厂私有 Config 值（thresholdRatio/retainRatio/headroomTokens/maxTokens/compactionRetries/maxOverflowRetries/auto）**一律不进该文件**。

> **下游约束**：《DNMS01 计划》的 schema / 数值 / reject 律 / 路由与错误闭集 / 五处台账 / 原子写 / 不新设 gate。

### 2.4 Provider 实现、运行期与失败降级

#### `T-O-DNMS01-13` —— ON 态 full 为单 Provider 内部模式 + micro 零改动
> **来源**：`Round 2 / Q4（业主 选 A）` ｜ **驱动后续**：`Q5/Q6/Q7；全部 executional 题`

ON 态「full-compact」是**我方唯一 `CompactionEngine` 子类的内部模式**，不是第二个 provider/lane：`compactNow` 承载 `/compact` 与 S 线阻塞 full，`compactIfNeeded('pressure'|'context-overflow')` 承载自动与 overflow，`compactRegion` 为共用原语。**full 触发闭集**：trusted safety（`fill≥S`）/ DC-1 结构不可达 / successful adopted ASYNC 后 exact over-health 在后续 B crossing / owner-manual `/compact`；**failure/degraded/unknown 不创建 FULL intent**；**`B≤H` 写时 reject**；一 episode 一只 physical summarizer attempt、incomplete/partial 不采用、no-cap（省略 `max_tokens`/`max_output_tokens`，不照抄出厂 `maxTokens`）。**`CONTEXT_WINDOW_EXCEEDED` 在 ON 态由我方 `agent/request-error`→`compactIfNeeded('context-overflow')` 接管并自持 overflow 重试上限；OFF 态由原生 recovery 承担**（R-8）。durable 协议、六失败码、`compaction/summary-error` waterfall、`ctx.tokenMeter`、`dsh-command-compact` **原样保留**。**micro 严格不接管** = `tool-result-pruner` 行/三 Config 值/服务实例/「只在 trigger qualify 之后」的触发时机**全部零改动、不参与翻转**；但我方 Provider 像原生一样 `ctx.get('toolResultPruner')?.pruneSession(agent.session)` **消费**这个可选兄弟服务，在 trigger qualify 之后、选摘要区间/bracket 之前调用并 `ctx.tokenMeter.measure()` 重测，已低于阈值可 `return null` 不写摘要。ON 态 B/H/S/pinned/摘要目标/重试预算/overflow 重试上限/`auto` 三监听**全部由我方自持并只读 `async-compact.json`**，禁止投影回宿主行 config。明确否决：另起 full provider、ON 态保留原生 backend 兜底、新增 model-facing tool/lane/event type、完全不调 pruner。

> **下游约束**：《DNMS01 计划》的三方法映射 / full 触发闭集 / overflow 归属 R-8 / micro 消费边界 / 六失败码与 durable 协议 / 验收矩阵。

#### `T-O-DNMS01-16` —— ON 态 Provider 按协议重实现 + 验收矩阵
> **来源**：`Round 3 / Q7（业主 选 A）` ｜ **驱动后续**：`Q8/Q9/Q10；全部 executional 题`

我方唯一 `CompactionEngine` 子类**按协议重实现全部三方法**（`compactIfNeeded`/`compactNow`/`compactRegion`），**仅复用包根已导出的 Cordis-free 原语**（`CompactionEngine`/`CompactionId`/`ManualCompactionError`/`compactCheckpointSource`/`isCompactCheckpointSource`/`toolPairingBalancedBefore/After`）；**不 import 未从包根 re-export 的 `compactSurfaceRegion`/`frameSummary`/`summarizeWithLlm`**、**不子类化 `BasicCompactionEngine`**（会继承冲突的原生 pressure/`maxOverflowRetries`/`maxTokens`/overflow 归属）。durable bracket 序列（`compaction/start`→`compaction/summary`→一条带 `surfaceOp:{op:'replace'}` 的 `user/message` + `compactCheckpointSource(compactionId,sourceCommandId?)`→`compaction/end`、失败补 error end、flush 失败产 `persistence`）、`CompactionResult` 形状、**六失败码 `busy/cancelled/changed/summary/commit/persistence`**、`sourceCommandId` 关联、shrink 校验（`framedSummaryTokenCount>=shadowedRouteTokenCount` 即失败）**按 [dsh] 契约重实现**。**自注册** `agent/pre-step`（B 线）/`agent/request`（模型切换）/`agent/request-error`（`CONTEXT_WINDOW_EXCEEDED`→`compactIfNeeded('context-overflow')` 自持 overflow 重试上限、`{kind:'retry'}`），**ON 态 overflow 归我方、OFF 态归原生**（R-8）；`ctx.tokenMeter`/`dsh-command-compact`/`compaction/summary-error` waterfall 保留。**prune 消费**：`ctx.get('toolResultPruner')?.pruneSession(agent.session)` 在 trigger qualify 之后、选摘要区间/bracket 之前调用并重测、可无摘要 `return null`；pruner 行/三 Config 值/服务实例/触发时机零改动。**no-cap**：`purpose:'compaction'` 单次 `ctx.llm.stream`，不写 `maxTokens`/别名等价 cap；text-only/拒 image/incomplete 不采用；模型解析 `configured ?? latest logged request target ?? AgentOptions`。**full 触发闭集**按 `-13`；failure/degraded/unknown 不创建 FULL intent；`B≤H` 写时 reject。**P0 spike（S0.1 import / S0.2 dump-config 5 realm / S0.3 complementary disabled + 一次重组合 / S0.4 `ctx.get` realm / S0.5 rc 等价）通过才进入实现，未通过回 QNA 追加修订而非降级。**验收 = [DNMS] 四步 + `node:test` 契约单测 + [dsh] 既有 compaction 规格 + `--dump-config` 组合复核，**不新设 release-gate、只在 `dsh-dev`**。

> **下游约束**：《DNMS01 计划》的三方法实现 / 六失败码 / bracket 协议 / 三监听 / prune 时序 / no-cap / P0 前置 / 验收矩阵。

#### `T-O-DNMS01-18` —— 运行期行为与失败降级
> **来源**：`Round 4 / Q9（业主 选 A）` ｜ **驱动后续**：`Q11/Q12/Q13`

① **async 定义（收口 D3）**：B 线 `agent/pre-step` 只做计量（`fill` 单条公式）与意图判定（`fill≥B` 且非 DC-1），**不在本 turn 内同步压**；待压缩记为 **in-memory、session-scoped、可从 session log 重算的 ephemeral intent**（不落盘、不写状态文件、不新增 event type），并 `agent.followup()` 唤醒；实际压缩在 agent **idle** 后由 `agent.runMaintenance` 执行；**adoption 只在下一 request assembly**。intent 丢失无害（下次按 fill 重算）。② **`one-active`**：同一 session 同时最多一个 compaction episode，由 `compaction/start` 未配对锁保证，**不另造计数器**；遇 active `return next()` + typed reason。③ **多会话/多 profile**：每 session 独立 log、`runMaintenance` per-agent、profile 间独立进程 → 按构造隔离；我方不持跨 session 可变状态。④ **失败按入口分型**：`agent/pre-step` **catch → `ctx.logger.warn` → `return next()`，绝不抛**（抛错会中止 turn 且已 claim 消息不恢复）；`agent/request` 仅当**目标模型窗口容纳不下当前上下文**时抛 typed `MODEL_SWITCH_COMPACTION_FAILED`，其余 warn+`next()`；`agent/request-error` 仅处理 `CONTEXT_WINDOW_EXCEEDED`、**绝不抛**（抛错掩盖原始 failure）；`compactNow`/`compactRegion` 按六码、unexpected 用 `ctx.logger.error` + 最接近的既有码（**不新增第七码**）；`compaction/summary-error` **只在有 durable 进展时返回 true**。⑤ **`state-read` 失败**（corrupt JSON / 未知 schema）→ **safety-only degraded mode**：仅用只读常量 `S=0.80` 执行 S 线阻塞 full，**不 arm async、不读 B/H/pinned、不回落默认**；`ctx.logger.warn` + GET `runtime.degraded='state-read-failed'`；不写状态文件。⑥ **pruner**：缺失=跳过；抛错=catch+warn+继续（优化不是正确性）。⑦ **未配对 `compaction/start`**：**不自动清锁**，暴露 `busy`/`already-armed`。⑧ **circuit（ephemeral）**：session-scoped、in-memory、不落盘；首次 typed transient → 下一 durable external turn 允许一只新 episode；**第二次连续 → open**；**不按时间自动重开**；恢复 = healthy adopted ASYNC 或 successful FULL boundary（或用户显式 OFF→ON 重置）。⑨ **ON 态 overflow 重试上限 = 1**（同出厂 `maxOverflowRetries:1`），不引入第二个数值来源。

> **下游约束**：《DNMS01 计划》的调度/adoption / one-active / 并发 / 按入口分型失败 / safety-only degraded / pruner / circuit / overflow=1。

### 2.5 交付、UI、观测与收口

#### `T-O-DNMS01-17` —— 交付与切换
> **来源**：`Round 4 / Q8（业主 选 A）` ｜ **驱动后续**：`Q11/Q12/Q13`

采用**一仓两包**：新增独立 Host-only bundle 包 `dsh-nano-model-selector-compaction`（`version 0.1.0`、`engines.dsh` 同主包 `>=0.2.2-rc.1 <0.3.0`、`main`/`exports` 指向 Provider 入口、`files` 含 `index.js`+`cordis.patch.yml`+`AGENTS.md`+运行时 lib），主包 `dsh-nano-model-selector` 升 `0.3.0`（新增路由/`lib/compact-policy.js`/schema 变更）；两包**各自版本、各自 tarball、各自一行 `RELEASE.md` 发布表、各自 CI matrix 项**，并同步根 `AGENTS.md` 插件登记与 `README.md`「活跃插件」计数。安装顺序**主包 → compaction 包**（保证后层覆盖），卸载反向（先 `set_bundle(false)` 回原生、再删 compaction 包、主包按需删）。**默认 OFF**：`dsh plugin add` 会自动写 `dependencies`+`dsh.profile.bundles`，因此安装后必须显式 `set_bundle(<compaction>, false)`（或 `plugin_manager install_bundle {enabled:false}`）；**「安装」不等于「接管」**，启用是用户动作。`async-compact.json` **首跑不创建**：缺失=内存内 7 字段默认、GET 不落盘、**首次成功 PUT 才 tmp+rename 原子创建**；未知 `schema` **400 拒绝、不 migrate、不双读、不回退旧键**；卸载不删状态文件。`[DNMS]/AGENTS.md` 增「compaction 接管合同」一节（两包清单/安装卸载序列/默认 OFF/首跑语义/触发层级/`dsh-dev` 验收命令/禁重启 `dsh.local`），并同步陈旧的 `docs/specs/dsh-nano-model-selector/README.md`。全程**只在 `dsh-dev`（`--home ~/.dsh-dev`）安装/重启/验收，绝不触碰 `dsh.local`**。

> **下游约束**：《DNMS01 计划》的两包交付 / 发布表与 matrix / 安装卸载序列 / 默认 OFF / 首跑语义 / 文档同步 / 禁重启边界。

#### `T-O-DNMS01-19` —— 观测面闭集 + 六级验收 + DoD + 发布授权
> **来源**：`Round 4 / Q10（业主 选 A）` ｜ **驱动后续**：`Q11/Q12/Q13`

① **观测面闭集（只允许五类）**：`ctx.logger`（进程内、**非 durable**、仅诊断，不得作验收证据）、`GET` 的 `runtime` 只读派生字段（`fill`/`lastCompaction`/`degraded`）、`compaction/summary | end | prune` **durable session events（唯一 durable 面）**、`pluginInventory.list()`（`enabled`/`fiberPhase`/`diagnostic`）、`compositionInventory()`。**明确禁止假设**：`compact.notify`、`nano_context_op_observations`、任何新 session event type、任何新 D1 表（前三者在 [dsh] 零命中，均为 [nano-agent] 概念）。② **不新建 audit 文件**；durable 证据仅来自上述三事件 + `--dump-config` + `pluginInventory`；`ctx.logger` 只写内存 1000 条、**不作审计**。③ **六级验收矩阵**：**L0 静态**（`node --test` 覆盖 schema/master 序/DC/0.25/15% clamp/单条 fill/序列化/未知 schema 拒绝）；**L1 契约**（GET/PUT 200/400、七错误码闭集、L3/16384、回包形状、feature-contract 与 route-sensitivity 一致）；**L2 组合**（`dsh --profile web --dump-config` 两态：ON 恰好一个 `ctx.compaction` provider + 4 preset group 覆盖 + `compaction-basic` `disabled:true`；OFF 原生行 active；`tool-result-pruner` 两态都在）；**L3 行为**（`dsh-dev` 新会话：`/compact` 标准 bracket + `compactCheckpointSource` + `surfaceOp.replace`；B 线跨 turn + 下一请求 adoption；S 线阻塞 full；`CONTEXT_WINDOW_EXCEEDED` ON 归我方/OFF 归原生；degraded 不判红 turn；`max_tokens`/`max_output_tokens` 不出现在 compact 请求）；**L4 持久化**（开关跨 `dsh-dev restart` 保持；tmp+rename；未知 schema 400 且文件不变；卸载不删；首跑不创建）；**L5 门禁**（既有 5 gate 全绿 + `npm pack --dry-run` 两包含全部产物 + `git diff --check` 干净）。④ **DoD**：§1 全 `T-O` 逐条有实现锚+测试锚（1:1 台账）；P0 S0.1–S0.5 全 PASS；L0–L5 全绿；三处文档同步（`AGENTS.md` 合同节/真实化 README/`RELEASE.md` 四行表+matrix）；**零触碰 `dsh.local`**；诚实登记残留（deferred/NON-COMPLIANT/UNVERIFIED），`degraded` 不写成 green。⑤ **发布授权归 [业主]**：**不新设 release-gate**；版本 bump/tag/发布由 [业主] 在计划阶段单独授权，**本台账不授权任何发布**。

> **下游约束**：《DNMS01 计划》的观测面闭集 / L0–L5 矩阵 / DoD 台账 / 文档同步 / 发布授权边界。

#### `T-O-DNMS01-20` —— UI 面板与交互契约
> **来源**：`Round 5 / Q11（业主 选 A）` ｜ **驱动后续**：`收口；《DNMS01 计划》`

① **rail 第 4 图标**：插在 `nms-rail-sep` **之前**、与「全部/收藏/媒体生成」同排；`filter='compact'`；新增 `CompactionIcon`（17px 同规格）；`data-active`/`aria-pressed`/`title`/`aria-label` 走新 i18n key。② **四态**：**U1 未安装**（不在 `dependencies` 且不在 `bundles`）→ 显示「未安装」说明与安装指引、**不显示开关**；**U2 已安装未启用**（在 `dependencies` 但不在 `bundles`）→「未启用」+ 开关（OFF）；**U3 已启用**（在 `bundles`）→「已启用」+ 开关（ON）+ 策略字段；**U4 degraded**（`runtime.degraded='state-read-failed'`）→ 在 U3 上叠加黄色告警条 +「仅安全线生效」。四态由 Host 只读投影判定（`compositionInventory()`/`pluginInventory.list()` `agentPresets` 段/本包 GET 只读 `installed`/`enabled`），**UI 不自行推导、不缓存开关态**。③ **切换交互**：确认弹层（轻量 inline confirm）说明「切换需一次 profile 重组合；有 HMR 立即生效、无 HMR 需重启 `dsh-dev`；不删除状态文件」→ 调 `ctx.remote.pluginManager.setBundleEnabled('dsh-nano-model-selector-compaction', next)`；结果四分类：`applied`→绿色成功条+即时翻转；`restart-required`→**黄色持久提示条**（非 toast）写「已保存，重启 `dsh-dev` 后生效」并给命令；`overridden`→黄色说明；`failed`→红色原因。**不做假进度条、不轮询**。④ **策略区**：`model` 下拉（复用 `/catalog` 的 `(provider,model)` 对）；`bufferSizeAsync`/`healthTargetAsync`/`pinnedAsyncTokens` 可编辑；`bufferSizeSafety` **只读展示 0.80**；`effective:{pin,windowMin,dcs}` 与 `runtime.fill`、`lastCompaction` 只读展示。⑤ **i18n**：`zh`/`en` 各新增 **18 个 key**（`compactGeneration`/`compactTitle`/`compactSubtitle`/`compactNotInstalled`/`compactDisabled`/`compactEnabled`/`compactDegraded`/`compactSwitchConfirm`/`compactSwitchApplied`/`compactSwitchRestart`/`compactSwitchFailed`/`compactFieldBuffer`/`compactFieldHealth`/`compactFieldPinned`/`compactFieldSafety`/`compactFieldModel`/`compactRuntimeFill`/`compactLastCompaction`）；`locale/*.json` **仍只留 meta**。⑥ **条件清理**：四处 `filter !== 'media'` → `filter !== 'media' && filter !== 'compact'`。⑦ **附带裁决（一并冻结）**：**允许新增第 2 条 Host 路由 `POST /nano-model-selector/async-compact/switch`**，仅供面板转发 `ctx.get('pluginManager').setBundleEnabled`（同一 sanctioned 写者、不构成第二真源）；同样适用 `-15` 的五处一次性对齐（`route-sensitivity` `L3`/`body ≤1024`/`sessionBinding:false` + `feature-contract` + `route-scan` + build + files/exports）；若 P0 判定浏览器半侧不可用，则本路由为唯一写入口。

> **下游约束**：《DNMS01 计划》的 rail/面板任务 / 四态判定 / 切换结果渲染 / 18 key i18n / 条件清理 / switch 路由。

#### `T-O-DNMS01-21` —— 观测派生与性能预算
> **来源**：`Round 5 / Q12（业主 选 A）` ｜ **驱动后续**：`收口；《DNMS01 计划》`

① **`runtime.lastCompaction` 用 `ctx.sessionProjections` 派生**：注册派生单元（`stateVersion:1`），`apply(state,event)` 纯同步折叠 `compaction/summary`（at/provider/model/shadowedTokenCount/status='ready'）与 `compaction/end`（`error`→status='failed'+degradedReason）与 `compaction/prune`（累加 shadowedTokenCount），其余事件返回原引用；`view(state)` 同引用抑制发布；**不落盘、不写状态文件、不进 §1**；**若 P0 验证第三方插件不能注册 `ctx.sessionProjections`，则退化为 `lib/` 内 per-session Map + `session/event` 增量折叠（同样不落盘），并在计划附录登记该退化路径——不得改用全量扫描**；产出 `{at,status:'ready'|'degraded'|'failed',provider,model,shadowedTokenCount,degradedReason}`。② **`runtime.fill` 按需 `ctx.tokenMeter.measure(session)` 一次 + 5s 服务端 memo**（键=`sessionUuid+lastEventSeq`；仿 `CATALOG_TTL_MS=15000` 短 TTL 范式）。③ **`runtime.degraded` 闭集**（四值）= `null`|`'state-read-failed'`（`-18`）|`'last-compaction-failed'`（由 `lastCompaction.status==='failed'` 合成）|`'meter-unavailable'`（`measure` 抛错）；取值优先级 = `degradedMode ?? lastCompaction 衍生 ?? null`，**不得增加未登记值**。④ **客户端零轮询**：只在「打开面板/切换后/PUT 成功后」各 fetch 一次；**不设 `setInterval`、不设 WebSocket、不订阅 `session/event` 到 UI**。⑤ **B 线计量预算**：`agent/pre-step` 每 turn 至多 1 次 `measure`；同 `lastEventSeq` 可复用上一 turn 的 memo；**不引入第二个 tokenizer/估算器**。⑥ **读面 partial-degrade**：`measure` 抛错→`fill:null`+`degraded='meter-unavailable'`；projection 抛错→`lastCompaction:null`+`ctx.logger.warn`；GET 仍 200（与 `-18` 执行面 safety-only degraded 分层）。⑦ **验收**：L3 增「大会话（surface≥2000 节点）GET P95<200ms（本地 `dsh-dev` 粗测）」+「连续打开面板 10 次，`measure` 调用 ≤3 次（5s memo 生效）」+ grep 断言无 `setInterval`/无 `session/event`→UI 订阅。

> **下游约束**：《DNMS01 计划》的 projection / fill memo / degraded 合成 / 零轮询 / 计量预算 / 读面降级 / L3 性能断言。

#### `T-O-DNMS01-22` —— 收口与交接契约
> **来源**：`Round 5 / Q13（业主 选 A）` ｜ **驱动后续**：`收口；《DNMS01 计划》`

① **Round 5（Q11–Q13）冻结后即全轮收口**，§1 达 **22 条** `T-O`（baseline 9 + Q1–Q13 13），**不设 Round 6**（除 [业主] 明确要求）。② **`async-compaction.md` 加唯一 supersession banner**（「已由 `T-O-DNMS01-1..22` 全面 supersede；仅作形成史与证据索引，**不再是 current consumer 的读取源**」）并按逐节清单处置：§0–§4 保留为证据；§5 D1→`-2`/`-11`、D2→`-9`、D3→`-18`、D4→`-13`、D5→`-14`、D6→`-11`/`-12`（**全部已覆盖，不再待裁决**）；§6 架构 A 保留、架构 B 标 `SUPERSEDED`；§7.1–7.3 以 `-15` 为准（删 `enabled` 与 clamp/audit 表述）；§7.4 **整体作废**（以 `-17` 为准）；§7.5 以 `-16` 为准；§7.6 以 `-18` 为准（删旧状态机与 `:359/:519` 矛盾）；§8 保留为计划输入、P6 的「D1–D6 裁决」项作废；§9 以 `-19` 为准（删 `enabled=false/true`）；§10 R4→`-14`、R10→`-9`；§12「不修改 SPEC README」改为 `-17` 的同步要求。（与 `-19` 的「三处文档同步」不重复计数：`-19` 指产品侧 `AGENTS.md`/`README`/`RELEASE.md`；本项指 QNA 侧草案处置。）③ **`T-O`→《DNMS01 计划》§2.1 1:1 CITE**（不复制正文、不新增冻结语义）。④ **9 项 `P0-EMPIRICAL`→计划 §2.2 的 `T-R[HEAD-实测]`**（≥1 条，含 `{id,claim,method,evidence,verdict,at}`），**不写入问答 §1**（「qna 只产 `T-O`」）；未通过项标 `T-R[HEAD-实测][FAIL]` 并在计划 §7 对应 AP 标阻塞。⑤ **计划附录建「deferred/out-of-scope」表**逐条登记（UI 像素级细节/i18n 文案微调/后续 profile 支持/其余实现细节）；`-21` 的 projection 退化路径已作为条件分支写入 `-21`，不再列为 defer。⑥ **收口判据四条**：方向钉死（22 条全冻结）/无 OPEN 残题（P0 全转 `T-R`）/无未登记 defer/收口声明与交接语句。⑦ **计划启动条件** = 问答 §11 收口签署 + banner 植入 + 22 条冻结；**不新设 release-gate、不授权发布**（`-19`）。

> **下游约束**：《DNMS01 计划》的 §2.1 CITE / §2.2 T-R / 附录 deferral / 22 条判据 / 草案 banner。

## 3. 收口（必须有）

- 形成史文档（`async-compaction.md`、中场评估段、修订历史、Step.1 审查记录）只作测量指针，不在本文产生新裁决。
- 本文没有新建 Truth-ID。
- 与 [`DNMS01-qna.md`](./DNMS01-qna.md) 冲突时以该问答为准。
- 下游 action-plan 不填写 Q/A，不修改本台账的规则句。
- 需要推翻时，回到原问答追加 supersession，再投影到本台账的对应行。

## 4. 启用的插件

> 只列触发成立的插件；未触发的已删。

### 4.1 P1 · 基线事实层（测量指针，非 `T-O`，本台账只 CITE）

> 问答内已登记、但不产生 Truth-ID 的事实：业主公理、HEAD 实测、勘误、中场调查、`P0-EMPIRICAL` 待测清单。**具裁决效力、下游会当口径用的项**在表后点名。

| 事实 ID | 一句话 | 出处 | 型别 |
|---------|--------|------|------|
| `B-1` | [业主] 四条要求 + 一个按钮 + ON/OFF 澄清是本轮唯一公理面 | `QNA §1 -1/-9`、`§0` | CITE |
| `B-2` | 「不兼容」指合同面不是 UX 回退；「硬切是切割方式不是时序」 | `DNLS01-qna.md:165/:163`，QNA `-6` | CITE |
| `B-3` | 切换 = 一次 profile 重组合（`disabled: !!js` 只在 mount decision 求值，写状态文件不自动翻转）；有 HMR `applied`、无 HMR `restart-required` | `QNA §2.0 #18–#21`、`-10`/`-14` | CITE |
| `B-4` | realm 拓扑 = base 扁平行 + 4 个 preset `id: compaction` isolate group（5 realm 位置 / up to 10 `disabled`） | `QNA §2.0 #16`、`-10`/`-14` | CITE |
| `B-5` | `agent/pre-step` 是 waterfall 无 try/catch：抛错中止 turn 且 `inbox.claim` 已持久化移除不恢复 | `QNA §7.3`、`-18` | CITE |
| `B-6` | `agent/request-error` 抛错掩盖原始 provider failure | `QNA §7.3`、`-18` | CITE |
| `B-7` | `agent.runMaintenance` 要求 `phase.kind==='idle'` → 真 async 只能跨 turn 调度、下一 request adoption | `QNA §6.0`、`-18` | CITE |
| `B-8` | `ctx.tokenMeter.measure` 为 O(surface)（克隆位置节点）→ GET `fill` 必须 memo，禁止轮询 | `QNA §10.0 #7`、`-21` | CITE |
| `B-9` | `compaction/summary|end|prune` 是仅有的 durable 观测事件；`compact.notify`、`nano_context_op_observations` 在 [dsh] 零命中（[nano-agent] 概念） | `QNA §10.0 #8`、`§7.3`、`-19` | CITE |
| `B-10` | 唯一合法写者经 R-10 从 `set_plugin` 改为 `set_bundle`；读态三件套 = compositionInventory/pluginInventory agentPresets/dump-config | `QNA §6.0`、`-14` | CITE |
| `B-11` | `dsh-dev` launcher：profile `dependencies` 中的包跳过 `--patch`，不在 dependencies 的成为 launch overlay 并绕过 `bundles` 开关 → 安装须同时写 `dependencies` 与 `bundles` | `QNA §8.0`、`AGENTS.md` | CITE |
| `B-12` | **`绝不重启 `dsh.local`（生产）**；全部验收只在 `dsh-dev`（`--home ~/.dsh-dev`） | `QNA §2.0`、`§10.0 #15`、`-14`/`-17`/`-19` | CITE |
| `B-13` | 收口判据四条已核验：方向钉死 22 条 / 无 OPEN（P0 全转 T-R）/ 无未登记 defer / 收口声明+交接 | `QNA §11`、`§11.1` | CITE |
| `B-14` | P0-EMPIRICAL（实现前置实测，未过则回 QNA 追加修订而非降级；**不写实现**） | `QNA §1`、`-16`、`-22` | `T-R` 前置 |
| `B-15` | `dsh.bundle.patch` 支持 `string|string[]` 但多 patch 作为**一层**应用；`dsh.profile.bundles` 是包名数组 → 专用 compaction bundle 必为独立包 | `QNA §6.0`、`§7.3` | CITE |
| `B-16` | `ctx.sessionProjections` 第三方插件注册可用性未实测（`practices.md:26` 是文档推荐，本仓无先例） | `QNA §10.0` UNVERIFIED、`-21` | `T-R` 前置 |

> **裁决效力点名**：`B-3`/`B-4`/`B-5`/`B-7`/`B-8`/`B-11`/`B-12` 是施工必须遵守的口径（HMR-restart 边界、realm 覆盖、入口抛错后果、idle 前置、O(surface)、依赖绕开关、禁重启）。其余作上下文。

> **`P0-EMPIRICAL`（9 项 → 计划 §2.2 `T-R[HEAD-实测]`，不进 §1）**：① profile-installed bundle 能否 `import '@deepseek-ai/dsh-compaction'`（S0.1）；② `--dump-config` 5 realm 渲染（S0.2）；③ 互补 `disabled` + 一次重组合原子性（S0.3）；④ `ctx.get('toolResultPruner')` realm（S0.4）；⑤ 安装版 rc.3 ≡ 检出 rc.2 compaction（S0.5）；⑥ 第三方插件 `pluginManager` namespace 授权；⑦ web/desktop HMR 存在性；⑧ 并发 dispose/init 竞态零窗口；⑨ preset 子行 patch 层覆盖率。附条件待测：两包同 tag 版本断言（本仓无 git tags）；`dsh-dev` `set_bundle` `applied` vs `restart-required`；`ctx.sessionProjections` 第三方注册（`B-16`）；`filter` 是否需 URL 同步（现无此机制）。

### 4.2 P2 · 权威次序

`DNMS01-qna.md`（decision provenance）> **本台账（投影面）** > 《DNMS01 计划》（只 CITE）> ImplementationGrant。不一致时**回到问答**修订本台账，不得反向改问答。`T-R` 与测量是事实、不是业主真相；`QNA_FROZEN` ≠ 代码 PASS。

### 4.3 P3 · 与上游真相的关系

| 上游 ID | 关系 | 回改上游正文 |
|---------|------|----------------|
| `DNLS01-qna.md T-O-8` 及 :163/:165 读法判例 | 只消费 / 先例沿用（`-6` 校正读法在本战役投影扩展） | 否 |

> 注：`async-compaction.md` 不是真相层而是**形成史**（已被 `-22` 处置为 supersede + banner）；`/Users/seanz/.dsh*/profiles/*/package.json` 是 HEAD 测量事实，不归真相层。

### 4.4 P4 · 冻结审计注记（append-only，不改内核原句）

> `AF-1`（R-1）：`-6` 的「不兼容」**读作合同面、不是用户体验回退**；「硬切」= 切换时刻原子无重叠，不是永久删除出厂 backend。
>
> `AF-2`（R-2）：「Load one implementation per context」约束**同一瞬时**的 active provider；被 `disabled` 的行没有 fiber、不会 `provide`，两行互补 `disabled` 合法。
>
> `AF-3`（R-12）：§7.4 原判「Round 5 纯收口」误把 UI/观测派生/收口机制划为 IMPLEMENTATION-DETAIL → **Round 5 是收口前最后一个 executional 轮**（Q11–Q13）。
>
> `AF-4`（R-14）：R-5 所列「D1/D3/D4/D5/D6 状态不变」**自 v0.7.0 起全部失效**；D1→`-2`/`-11`、D2→`-9`、D3→`-18`、D4→`-13`、D5→`-14`、D6→`-11`/`-12`——草案 §5 自此**不存在任何待裁决槽**。

### 4.5 P5 · 修正案（改的是某条的读法，被修正正文保持不动）

| 修正案 | 改读法的对象 | 生效句 | 旧正文 |
|--------|----------------|--------|--------|
| `AMEND-1`（QNA R-7） | `-11` schema | `async-compact.json` 彻底移除 `enabled`，`-11` 行中「`enabled` 是组合层开关的输入」改读为「开关真源见 `-12`，状态文件不含该字段」 | 不回改 |
| `AMEND-2`（QNA R-8） | `-13` overflow 归属 | `CONTEXT_WINDOW_EXCEEDED`：**ON 态归我方** `agent/request-error`→`compactIfNeeded('context-overflow')`；**OFF 态归原生 recovery**；草案 `:359`/`:519` 与 `:335`/`:502` 的矛盾句全部 supersede | 不回改 |
| `AMEND-3`（QNA R-10） | `-12` 执行细节 | 唯一合法写者 `set_plugin`→**`set_bundle → selectBundle`**；文件 `cordis.patch.yml`→**`package.json` 的 `dsh.profile.bundles`**；`-12` 的真相结论（唯一 canonical/无第二副本/不投影/不 reconciliation/不留兼容键/不做运行期 hotfix）全部不变 | 不回改 |

### 4.6 P6 · 残项、不得重开、授权边界

- **残项**：9 项 `P0-EMPIRICAL`（§4.1 `B-14`）+ 4 项附条件待测；**阻塞当前出口：NO**（真相层不收口径；但**阻塞实现动工**，须先在计划 §2.2 落 `T-R[HEAD-实测]`）。
- **不得重开**：Q1–Q13 的已冻结选项（`T-O-DNMS01-10`–`-22`）；`-12` 的「`enabled` 字段」；-`-13`/`-16` 的 overflow 归属与六失败码；`-19` 的「不新设 release-gate」；`-22` 的「不设 Round 6」。推翻只能回问答 append-only。
- **仍然不授权**：implementation grant、远端、deploy、live、发布（版本 bump/tag/release 须 [业主] 在计划阶段单独授权）。

## 修订

| 版本 | 日期 | 变更 |
|------|------|------|
| `0.1.0` | 2026-11-14 | 首版：从 `DNMS01-qna.md`（v0.7.0 已冻结）抽取 22 条 `T-O` 投影为统一 truth ledger；启用 P1/P2/P3/P4/P5/P6 |
