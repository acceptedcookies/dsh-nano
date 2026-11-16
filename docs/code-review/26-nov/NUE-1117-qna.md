# NUE-1117 Q&A · progressive（nano-ui-enhancement · 业主决策册）

> **范围**：`NUE-1117` = nano-ui-enhancement。证据输入为 [NUE-1117-initial-assessment.md](NUE-1117-initial-assessment.md)（下称「初评」）。初评是证据，不是合同；其中的推荐只有在本文冻结后才生效。
> **角色**：提问 `Droid` · second-opinion `none` · 裁决 [业主]
> **基线**：`main` @ `5a41133`（初评 §0 所列 BUG-1..4 已于 `60c3a4d`/`fefd590`/`5a41133` 修复，不再属于 NUE 范围）
> **文档状态**：`已冻结`（2026-11-17）。Round 1–5 全部冻结，`T-O-NUE1117-B01–B04` 与 `01–17` 均已锁定。Round 4 是 qna-truth 复核后的补充裁决；Round 5 是 action-plan 对抗审查后的执行取舍裁决。**冻结不是实施授权。**

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
