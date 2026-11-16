# NUE-1117 Q&A · progressive（nano-ui-enhancement · 业主决策册）

> **范围**：`NUE-1117` = nano-ui-enhancement。证据输入为 [NUE-1117-initial-assessment.md](NUE-1117-initial-assessment.md)（下称「初评」）。初评是证据，不是合同；其中的推荐只有在本文冻结后才生效。
> **角色**：提问 `Droid` · second-opinion `none` · 裁决 [业主]
> **基线**：`main` @ `5a41133`（初评 §0 所列 BUG-1..4 已于 `60c3a4d`/`fefd590`/`5a41133` 修复，不再属于 NUE 范围）
> **文档状态**：`已冻结`（2026-11-17）。Round 1–7 全部冻结，`T-O-NUE1117-B01–B04` 与 `01–23` 均已锁定。Round 6 是执行中的停止点裁决；Round 7 是收尾三路审查（`.anote/reviews/NUE/1117/exec-962d552/`）后的补充裁决。Round 4 是 qna-truth 复核后的补充裁决；Round 5 是 action-plan 对抗审查后的执行取舍裁决。**冻结不是实施授权。**

---

## 0. 分轮状态

| 轮次 | 题号 | 类型 | 焦点 | 状态 |
|---|---|---|---|---|
| Baseline | `T-O-NUE1117-B01–B04` | baseline | 继承仓根原则与本阶段指令 | 随本文件冻结 |
| Round 1 | `Q1–Q4` | foundational | 全仓原则 · 规格真源 · 迁移方式 · 本期范围 | **已冻结**（→ `T-O-NUE1117-01..04`） |
| Round 2 | `Q5–Q8` | executional | 检测脚本归属 · 宿主 DOM 嫁接处置 · design skill 位置 · catalog 形态 | **已冻结**（→ `T-O-NUE1117-05..08`） |
| Round 3 | `Q9–Q11` | executional | 迁移顺序 · 共享包版本与提交纪律 · 其余宿主 DOM 嫁接的替代 | **已冻结**（→ `T-O-NUE1117-09..11`） |
| Round 4 | `Q12–Q14` | 复核补充 | nano-ui 自身的宿主 DOM 嫁接 · [DNMS] 区域测量 · [DNMS] Tooltip 参数缺陷 | **已冻结**（→ `T-O-NUE1117-12..14`） |
| Round 5 | `Q15–Q17` | 执行取舍 | nano-ui 旧接口退役时点 · 收尾重建产物 · [DNCS] Devin 标签 | **已冻结**（→ `T-O-NUE1117-15..17`） |
| Round 6 | `Q18–Q19` | 执行中补充 | [DNMS] 云会话自判没有宿主判据（AP P4-01 停止点）· [DNN] 宿主变更文件卡片注入（AP P9-05 停止点） | **已冻结**（→ `T-O-NUE1117-18..19`） |
| Round 7 | `Q20–Q23` | 审查补充 | DESIGN §1 slot 合同变量勘误 · [DNT] 会话滚动条嫁接 · 自有容器内的数字层级 · [DNEE] 改写宿主 Modal 外层 | **已冻结**（→ `T-O-NUE1117-20..23`） |

---

## 1. Truth-Gate 台账（NORMATIVE · append-only）

### 1.1 Baseline

| Truth-ID | 已锁定真相 | 来源 |
|---|---|---|
| `T-O-NUE1117-B01` | 阶段名 `NUE-1117`；初评是证据输入，不是合同 | [业主] 指令 |
| `T-O-NUE1117-B02` | 判据 = 仓根五原则 + 「能硬切就不双写、能彻底退役就不兼容、平台中立、不耦合私域」 | 仓根 `AGENTS.md`；[业主] 指令 |
| `T-O-NUE1117-B03` | 设计接线检测与覆盖预警**只 warn**，不是 release-gate，不进发布链；可由 design skill 触发并产出评估意见 | [业主] 指令（初评 §7） |
| `T-O-NUE1117-B04` | nano-ui 保持构建期 `file:` 依赖、打进各插件 bundle；不成为运行时插件间共享通道 | 仓根「不得侧载」；各包 AGENTS.md 前置 |

### 1.2 Round 1（foundational · 已冻结 2026-11-16）

| Truth-ID | 题 | [业主] 裁决 | 下游约束 |
|---|---|---|---|
| `T-O-NUE1117-01` | Q1 全仓原则 | 按建议措辞写入仓根 `AGENTS.md` 核心工作原则：「插件 UI 先用宿主 primitive，其次 nano-ui；两者都没有的才在插件内实现，并加 `nano-ui-exempt` 标记；不得嫁接宿主内部 DOM」 | 初评 WL-03 落地；「不得嫁接宿主内部 DOM」成为全仓规则，影响 [DNEE] `:has()`、[DNCS] `[class*=]`、[DNT] trajCls 发现、[DNMS] 区域遮罩 |
| `T-O-NUE1117-02` | Q2 规格真源 | `docs/specs/dsh-nano-ui/DESIGN.md` 为 UI 规格**唯一真源**；README、TEMPLATE 只链接 | 初评 WL-01/02/04 |
| `T-O-NUE1117-03` | Q3 迁移方式 | **每插件一次硬切**：一个 worktree 整块替换，被替换样式同提交删除，不留新旧并存 | 初评 §8 P6/P7 |
| `T-O-NUE1117-04` | Q4 本期范围 | ThemeScope、FloatingWindow、z 层令牌**全部纳入本期** | 初评 WL-07/08/17 由「待裁决」转为必做 |

### 1.3 Round 2（executional · 已冻结 2026-11-16）

| Truth-ID | 题 | [业主] 裁决 | 下游约束 |
|---|---|---|---|
| `T-O-NUE1117-05` | Q5 检测脚本 | 选 A。新建 `scripts/check-ui-rules.mjs`，只 warn（U1–U10）；`check-client-rules.mjs` 的 primitives-exports 规则原地泛化到全部插件并支持命名空间 import，保留现有退出语义 | 初评 WL-22/23；`test-all.mjs:59` 不变 |
| `T-O-NUE1117-06` | Q6 [DNCS] 隐藏控件 | 选 A。[DNCS] 删除 `styles.js:20-29` 整段；[DNMS] 依据宿主会话元数据自行决定是否渲染；宿主权限/附件按钮在云会话中不应出现，登记为宿主缺口，插件不处理 | 初评 WL-P5；[DNMS] 迁移需增加「云会话不渲染」判定 |
| `T-O-NUE1117-07` | Q7 skill 位置 | 选 B。`docs/agents/skills/dsh-nano-design/SKILL.md` | 初评 §6.4 |
| `T-O-NUE1117-08` | Q8 catalog | 选 A。`packages/dsh-nano-ui/catalog/{tokens,icons,primitives}.json` 生成后入库；[DNMS] `test/primitives-exports.json` 硬切迁入，不留两份 | 初评 WL-05/19；`check-client-rules` 改读 catalog |

### 1.4 Round 3（executional · 已冻结 2026-11-16）

| Truth-ID | 题 | [业主] 裁决 | 下游约束 |
|---|---|---|---|
| `T-O-NUE1117-09` | Q9 迁移顺序 | 选 A。[DNMS] → [DNEE] → [DNT] → [DNK] → [DNCS] → [DNN] | 初评 §8 P6/P7 按此排序；[DNMS] 首迁同时落实 `06` 的云会话不渲染 |
| `T-O-NUE1117-10` | Q10 版本与提交 | 选 A。nano-ui 首次增强发 `0.2.0` 并补 `CHANGELOG.md`；此后对外行为变化即升版本、记 changelog；nano-ui 变更与插件变更必须分提交 | 初评 WL-19/20；断点 B8 关闭条件 |
| `T-O-NUE1117-11` | Q11 其余嫁接 | 选 A。[DNT] trajCls 发现改为 nano-ui `Toolbar`；[DNMS] 区域遮罩改为 nano-ui 对话框的区域作用域选项（nano-ui 自控挂载层）；[DNEE] `:has()` 逐条改为插件自有容器，无法改的登记为宿主缺口并删除；不留 `nano-ui-exempt` 例外 | 初评 §5 L2 增加 Toolbar 与 Dialog 区域作用域；[DNT] 需 GUI 验收 |

### 1.5 Round 4（复核补充 · 已冻结 2026-11-17）

来源：[NUE-1117-qna-truth.md](NUE-1117-qna-truth.md) §7 的 A1–A3。

| Truth-ID | 题 | [业主] 裁决 | 下游约束 |
|---|---|---|---|
| `T-O-NUE1117-12` | Q12 nano-ui 自身嫁接（`packages/dsh-nano-ui/src/dom.js:39-93` 经 `parentElement` 改写宿主 Modal 根节点） | 拆成两种承载：主窗口级对话框继续包装宿主 `Modal`；浮窗或区域内的对话框由 nano-ui 窗口覆盖层承载，接入宿主 `useModalLayer`。MutationObserver 补丁、对话框的 `theme`/`z` 参数、`--nano-dlg-*` 文档级变量一起退役 | 落实 `01`、`04`、`11`；[DNN] 全部对话框迁到窗口覆盖层；规格 README 的主题/层级契约退役 |
| `T-O-NUE1117-13` | Q13 [DNMS] 区域测量（`dsh-nano-model-selector/src/client/index.jsx:94` 查询 `[data-conversation-region="chat"]`） | 取消区域收束，历史对话框改为主窗口级 `Modal` | [DNMS] `styles.js:229-234` 与 `regionElement` 删除；`11` 中「[DNMS] 区域遮罩改用 nano-ui 区域选项」由本条替代 |
| `T-O-NUE1117-14` | Q14 [DNMS] `AsyncStatusBadge.jsx:65` 传 `content`，宿主 `Tooltip` 只认 `label` | 在 `main` 单独修复，不并入 NUE | 已修复：`3f43bf2` |

### 1.6 Round 5（执行取舍 · 已冻结 2026-11-17）

来源：`NUE-1117-action-plan.md` 初稿的两路对抗审查（`.anote/reviews/NUE/1117/5748/`）。

| Truth-ID | 题 | [业主] 裁决 | 下游约束 |
|---|---|---|---|
| `T-O-NUE1117-15` | Q15 nano-ui 旧接口（`openNanoDialog` 的 `region`/`theme`/`z`、NanoMenu 的 `theme`/`z`、自绘 Toast/页签）在迁移窗口内如何处理：A 保留到最后使用方再删；B nano-ui 增强时一次硬切 | 选 B。nano-ui 增强时一次删除旧接口与旧实现，不保留过渡路径 | 尚未迁移的插件在各自迁移前若从 `main` 重建，会失去被删接口提供的行为；这段窗口内不宜从 `main` 重建发布它们 |
| `T-O-NUE1117-16` | Q16 全部迁移完成后是否在收尾 worktree 重建六个插件的 `lib/client.js`：A 重建；B 不重建 | 选 A。重建，只改 `lib/`，不改 `src/` | 六份产物最终都打进同一版 nano-ui；这是产物层的重建，不是第二次源码迁移 |
| `T-O-NUE1117-17` | Q17 [DNCS] 插入宿主 composer 的「Devin」标签在删除嫁接后是否另设挂载点：A 直接删除并登记宿主缺口；B 迁到 [DNCS] 自有挂载点 | 选 A | 云会话标识登记为宿主缺口；[DNCS] 不新增替代界面 |

### 1.7 Round 6（执行中补充 · 已冻结 2026-11-17）

来源：本文 §4 题面。

| Truth-ID | 题 | [业主] 裁决 | 下游约束 |
|---|---|---|---|
| `T-O-NUE1117-18` | Q18 [DNMS] 云会话自判没有宿主判据 | 选 A。登记宿主缺口，[DNMS] 不做云会话判定，云会话里照常渲染 | `06` 中「[DNMS] 依据宿主会话元数据自行决定是否渲染」由本条收窄为「宿主提供公开字段前不判定」；`NUE1117-T19` 保持 deferred，守卫（不读 `dncs` / `data-dncs-cloud`）保留 |
| `T-O-NUE1117-19` | Q19 [DNN] 向宿主「变更文件」卡片注入「到记事本」按钮 | 选 A。整段删除（样式、`attachNotepadCtas`、文案），登记宿主缺口 | DESIGN §8 增「变更文件卡片动作」；T30 不再单列 `[data-changed-files]:has(` |

### 1.8 Round 7（审查补充 · 已冻结 2026-11-17）

来源：本文 §5 题面；证据见三路审查报告。

| Truth-ID | 题 | [业主] 裁决 | 下游约束 |
|---|---|---|---|
| `T-O-NUE1117-20` | Q20 DESIGN §1 禁读 `composer-model-*-display` 与 §10 [DNMS] 豁免矛盾 | 选 A。勘误 §1：宿主 `slots.d.ts` 公开的 slot 合同变量不算宿主内部变量，读取时在 §10 登记 | `01` 推论③的例子去掉 `composer-model-*-display`；[DNMS] 现有读取保留 |
| `T-O-NUE1117-21` | Q21 [DNT] 改写宿主 `[data-conversation-scroll]`（隐藏滚动条、撤销槽位、插入悬浮滚动条、body 级观察者） | 选 A。整段删除，登记宿主缺口 | DESIGN §8 增「会话滚动条槽位」；右侧约 7px 空白交给宿主 |
| `T-O-NUE1117-22` | Q22 [DNT]/[DNK]/[DNN] 自有容器内的数字 `z-index` | 选 A。nano-ui 增加局部层令牌，插件改用 `var(--nano-layer-local*)` | nano-ui `0.2.1`（`10`：对外变化即升版本）；DESIGN §4 加行；六份产物重建到同一版 |
| `T-O-NUE1117-23` | Q23 [DNEE] `usePanelConfinedLayer` 经 `card.parentElement` 改写宿主 Modal 外层 | 选 A。迁到 nano-ui 窗口覆盖层（`openNanoDialog({ container })` / `NanoWindowDialog`），删除改写与 body 级观察者 | 落实 `01`、`12`；容器取 [DNEE] 自有根节点 |

---

## 2. Round 2（executional · 已冻结，题面留档）

### Q5 检测脚本归属

现状：`scripts/check-client-rules.mjs` 在 `scripts/test-all.mjs:59` 中运行，problem 会让退出码非 0；它只扫 [DNMS]（`:31`），只认具名 import（`:124`）。

- **A**：新建 `scripts/check-ui-rules.mjs`（warn-only，U1–U10）；`check-client-rules` 的 primitives-exports 规则原地泛化到全部插件、并支持命名空间 import，保留现有退出语义（它查的是「宿主没有这个导出」这种必然崩溃的正确性问题，不是 UI 质量）。
- **B**：把 primitives-exports 迁入 `check-ui-rules`，一并降级为 warn；`check-client-rules` 只留 hooks 顺序规则。
- **推荐 A**：正确性与 UI 质量分开；UI 质量 warn-only 符合 B03，导出缺失仍应拦住。

### Q6 [DNCS] 在云会话中隐藏 [DNMS] 与宿主 composer 控件

现状：`dsh-nano-cloud-session/src/client/styles.js:20-29` 用 `[class*="composerSeat"]` 加 `.nms-root`、`[data-nano-model-selector]` 和**本地化 aria-label 文本**（「工作区内修改」「Full access」等）隐藏控件。它与 Q1 冻结的「不得嫁接宿主内部 DOM」直接冲突，也是插件间通过 DOM 互相感知。

- **A**：[DNCS] 删除整段。[DNMS] 自己根据宿主会话元数据（carrier/云会话标识）决定是否渲染；宿主权限与附件按钮在云会话里不该出现，这一点登记为**宿主缺口**，插件不再处理。
- **B**：保留现状，加 `nano-ui-exempt` 标记登记为例外。
- **C**：整段删除，接受云会话里出现无效控件，不做替代。
- **推荐 A**：符合 Q1 与「不得侧载」；代价是宿主修好之前，云会话的 composer 会出现无效的权限按钮。

### Q7 design skill 位置与名称

现状：仓内唯一的 SKILL.md 在 `dsh-nano-kitesurf/skills/`（随插件发布给 dsh 会话 agent），没有面向本仓开发 agent 的 skill 目录。

- **A**：`.agents/skills/dsh-nano-design/SKILL.md`（与 `.agents/worktrees` 同属开发 agent 工作区）。
- **B**：`docs/agents/skills/dsh-nano-design/SKILL.md`（与 TEMPLATE.md 并列，作为文档入库）。
- **推荐 B**：`.agents/` 目前承载临时 worktree，而 skill 是需要入库、长期维护的资产；放在 `docs/agents/` 与 TEMPLATE 同级，便于发现。

### Q8 宿主 catalog 的形态

- **A**：`packages/dsh-nano-ui/catalog/{tokens,icons,primitives}.json` 作为生成物**入库**，宿主升级时重新生成并在 diff 中看到变化；[DNMS] 现有 `test/primitives-exports.json` 硬切迁入 catalog，不留两份。
- **B**：不入库，每次检测时从本机宿主安装目录现读。
- **推荐 A**：agent 和 design skill 需要可直接读取的文件；宿主版本差异可审计；B 依赖本机路径（`~/.nvm/...`），不平台中立。

---

## 3. Round 3（executional · 最后一轮 · 已冻结，题面留档）

### Q9 插件迁移顺序

- **A**：由小到大：[DNMS] → [DNEE] → [DNT] → [DNK] → [DNCS] → [DNN]。先用小插件验证 nano-ui L2 组件，[DNN] 最后整块迁移时组件已稳定。
- **B**：[DNN] 优先。它是 nano-ui 的发源地，痛点最集中，FloatingWindow/ThemeScope/z 层主要为它而建。
- **推荐 A**：[DNN] 改动最大（约 800 行内联样式、DOM 字符串渲染），放在最后可以避免组件还在变时返工；A 顺序中 [DNMS] 首迁同时落实 `T-O-NUE1117-06` 的「云会话不渲染」。

### Q10 共享包版本与提交纪律

- **A**：nano-ui 首次增强发 `0.2.0` 并补 `CHANGELOG.md`；此后每次对外行为变化升版本、记 changelog；**nano-ui 变更与插件变更必须分提交**（插件迁移提交只消费已提交的 nano-ui）。
- **B**：只补 changelog，版本号仍不维护；允许同提交混改。
- **推荐 A**：解决初评断点 B8（共享包无独立变更面），使用方能从产物看出自己打进了哪一版。

### Q11 其余宿主 DOM 嫁接的替代方案

`T-O-NUE1117-01` 已禁止嫁接宿主内部 DOM。除 [DNCS]（Q6 已定）外还有三处：
1. [DNEE] `styles.js:234-250` 用 `:has()` 套宿主结构；
2. [DNT] `NanoTerm.jsx:51-83` 运行时扫描宿主 `TrajectoryToolbar` 的哈希类名（trajCls），让状态栏外观与宿主一致；
3. [DNMS] `styles.js:229-234` 用 `body > div:has(> .nms-hist-dialog)` 把宿主 portal 的遮罩收进对话区。

- **A**：全部由 nano-ui 替代：[DNT] 状态栏改用 nano-ui `Toolbar`（只用宿主令牌，外观对齐但不读宿主类名）；[DNMS] 区域遮罩改由 nano-ui 对话框自带的「区域作用域」选项实现（nano-ui 自己控制挂载层，不再改宿主 portal）；[DNEE] 按迁移时逐条判断：能用插件自有容器的改自有容器，确实只能靠宿主结构的登记为宿主缺口并删除。
- **B**：三处都加 `nano-ui-exempt` 标记保留。
- **推荐 A**：与 Q1、Q3 一致，硬切且不留例外；代价是 [DNT] 状态栏与宿主轨迹栏可能出现像素级差异，需要 GUI 验收。

---

## 4. Round 6（执行中补充 · 已冻结，题面留档）

来源：`NUE-1117-action-plan.md` §5.4 P4-01 有序子步骤 1、§3 P9-05 的核实结果（停止点）。本轮不改变 Round 1–5 的冻结状态。

### Q18 [DNMS] 云会话自判没有宿主判据

核实（[dsh] `0.2.2-rc.1`）：

- 宿主会话头 `SessionHeader`（`@deepseek-ai/dsh-session` `lib/types/types.d.ts:60-100`）只有 `version`、`id`、`createdAt`、`cwd`、`parentSession`、`isSeeded`、`origin?: 'subagent'`、`delegationDepth`、`agentPreset`；`CreateSessionOptions.meta` 是同一子集。没有来源、carrier、remote、projection 一类字段。
- [DNCS] 打开云会话时调用 `ctx.sessions.create(undefined, { meta: { cwd } })`，再 `ctx.agents.enter(fake)`（`dsh-nano-cloud-session/index.js:250,306`）。宿主侧看到的是一个普通本地会话。唯一能区分的值（代理 agent 的 `model.current()` 返回 `provider: 'devin'`）由 [DNCS] 写入，按 AP §5.4 不算宿主合同。
- [DNMS] `src/` 现无 `dncs` / `data-dncs-cloud` 读取（`NUE1117-T19` 守卫断言已落 `test/nue-migration.test.mjs`）。

选项：

- **A**：登记为宿主缺口（DESIGN.md §8「云会话标识」）。[DNMS] 不做云会话判定，云会话里照常渲染，等宿主提供公开字段后再迁移。`NUE1117-T19` 保持 `deferred`。
- **B**：[DNMS] 读代理 agent 的模型投影（`provider === 'devin'`）。这个值由 [DNCS] 写入，等于在两个插件间新建约定，与 `T-O-NUE1117-06` 和「不得侧载」冲突。
- **C**：由 [DNCS] 在宿主会话 `meta` 或其他公开面写入云标记，[DNMS] 读取。这是新的插件间合同，需要 [业主] 决定是否扩约。
- **推荐 A**：与 `06` 的「宿主改不了的登记为宿主缺口，插件不补」一致；代价是宿主补字段前，云会话 composer 里会出现 [DNMS] 选择器（[DNCS] 隐藏样式在 P8 照删）。

状态：**已冻结**（选 A → `T-O-NUE1117-18`）。

### Q19 [DNN] 向宿主「变更文件」对话卡片注入「到记事本」按钮（AP P9-05 停止点）

核实（[dsh] `0.2.2-rc.1`，`main@4c39634`）：

- [DNN] `src/client/panel.js:159-167` 样式直接写宿主卡片：`[data-changed-files] { position: relative }`、`[data-changed-files]:has(> .np-to-notepad) { padding-right: 128px }`、`[data-changed-files] li …` 三条行内布局；`:4739-4780` `attachNotepadCtas` 用 `querySelectorAll('[data-changed-files]')` / `closest(...)` 找卡片，读 `data-single` 与 `span[hidden]` 里的路径，向卡片 `appendChild` 一个 `button.np-to-notepad`。对 `.md/.markdown` 单文件卡片生效，点击后经 `/nano-notepad/read` 读文件导入记事本。
- `[data-changed-files]` 卡片由宿主 `@deepseek-ai/dsh-client-ui-deliverables` 的 `ChangedFiles` 渲染（`lib/types/client/ChangedFiles.d.ts`），props 只有 `changes/cwd/openReview/t/sessionId/useChangesDiff/loadChangesDiff`，没有动作插槽或渲染回调；本机类型声明中没有面向插件的「变更文件卡片动作」座位。
- 按 `T-O-NUE1117-01`（不得嫁接宿主内部 DOM，含 `:has()` 套宿主结构）属嫁接；但真相层逐项清单未列出此处，删除会去掉一项用户功能。AP 规定停在本项，P9 其余迁移照常合并，此处保持原样。

选项：

- **A**：整段删除（样式 + `attachNotepadCtas` + 文案），DESIGN.md §8 登记「变更文件卡片动作」宿主缺口；宿主提供座位后再接回。用户失去「到记事本」入口，仍可从 [DNEE] 或记事本自身导入。
- **B**：保留现状，加 `nano-ui-exempt` 并在 DESIGN §10 登记为已知嫁接例外；`check-ui-rules` 与 T30 终态扫描对它单列。
- **C**：改为不碰宿主卡片的入口（例如记事本内「从本轮变更导入」菜单，读宿主公开的 `/api/changes.summary`）。需要 [业主] 确认该路由是否算公开合同，属新功能，超出 NUE-1117 范围。
- **推荐 A**：与 `01`、`06`、`17`（[DNCS] Devin 标签同样整段删除、不另设挂载点）一致；代价是失去一个便捷入口。

状态：**已冻结**（选 A → `T-O-NUE1117-19`）。

---

## 5. Round 7（审查补充 · 已冻结，题面留档）

来源：收尾三路审查（真相对账、完成度、反假绿与侧载），报告在 `.anote/reviews/NUE/1117/exec-962d552/`。

### Q20 DESIGN §1 与 §10 对 slot 合同变量的矛盾

`DESIGN.md` §1「永远不做」把 `composer-model-*-display` 列为宿主内部变量；§10 却登记 [DNMS] `styles.js` 读取 `--dsh-composer-model-text-display` / `--dsh-composer-model-icon-display`。宿主 `dsh-client-ui-conversation` 的 `slots.d.ts` 把这两个变量写成 `conversation.input.model` 槽位合同。

- **A**：勘误 §1，slot 类型声明公开的合同变量不算内部变量，读取时在 §10 登记。
- **B**：[DNMS] 删除读取，§10 删行。
- **推荐 A**。

### Q21 [DNT] 会话滚动条嫁接

[DNT] `src/client/index.js` 向 `[data-conversation-scroll]` 注入样式（隐藏原生滚动条、撤销 `scrollbar-gutter` 与外边距），改写其父节点 `style.position` 并插入 `.dnt-floatbar`，在 `document.body` 上挂 `MutationObserver`。存量早于本期，AP P6 未覆盖。

- **A**：整段删除，DESIGN §8 登记缺口。
- **B**：保留并豁免（需修改 §1）。
- **C**：暂缓。
- **推荐 A**：与 Q19 同口径。

### Q22 自有容器内的数字层级

[DNT] 5 处、[DNK] 11 处、[DNN] 13 处 `z-index` 数字，均在插件自有定位容器内，与 DESIGN §4「插件不写数字层级」冲突。

- **A**：nano-ui 增加局部层令牌（`--nano-layer-local*`），插件改用 `var()`。
- **B**：逐条 `nano-ui-exempt` 并在 §10 登记。
- **C**：用 `isolation` 与 DOM 顺序去掉。
- **推荐 A**。

### Q23 [DNEE] 改写宿主 Modal 外层

[DNEE] `src/client/dialogs.js` 的 `usePanelConfinedLayer` 取宿主 Modal 卡片的 `parentElement`，加类名并写 `position:fixed` 与几何，在 `document.body` 上挂两个 `MutationObserver`，把卡片围进文件面板。违反 §1「改写宿主 portal 根节点」。

- **A**：迁到窗口覆盖层（`openNanoDialog({ container })`）。
- **B**：暂缓。
- **推荐 A**：DESIGN §5 的合法承载。
