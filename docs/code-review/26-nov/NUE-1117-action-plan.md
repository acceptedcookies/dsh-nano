# Nano-Agent 行动计划 · NUE-1117 nano-ui 增强与六插件原生化迁移

> 服务业务簇: `nano-ui-enhancement`（[dsh-nano] 共享 UI 层：规格真源、宿主 catalog、nano-ui 0.2.0 一次硬切、六个插件按序迁移）
> 计划对象: `1117 · NUE-1117`（10 个按序 worktree：`nue-1117-foundation` / `nue-1117-catalog` / `nue-1117-nano-ui` / `nue-1117-migrate-{dnms,dnee,dnt,dnk,dncs,dnn}` / `nue-1117-closeout`）
> 类型: `upgrade | refactor | migration | remove`
> 作者: `NUE-1117 计划 agent（lead）`
> 时间: `2026-11-17`
> 文件位置: `docs/code-review/26-nov/NUE-1117-action-plan.md`
> 推定 slug（文件名不带；`工作波次` 为空）: `nano-ui-enhancement`
> 上游前序 / closure:
> - `docs/code-review/26-nov/NUE-1117-qna.md`（decision provenance；`T-O-NUE1117-B01`–`B04` + `01`–`17`，Round 1–5 冻结）
> - `docs/code-review/26-nov/NUE-1117-qna-truth.md`（21 条 FROZEN；复核基线 `5a41133`；勘误 E1–E16；`冻结不是实施授权`）
> 下游交接:
> - **（另立）实施授权** —— 本 AP 不签发、不替代。[业主] 对每个 worktree 的开工与合并另行放行。
> - 宿主缺口登记（z / spacing 令牌、区域 API、TrajectoryToolbar 导出、云会话 composer 按钮与云会话标识、文件树状态钩子）写入 `docs/specs/dsh-nano-ui/DESIGN.md`，不在本文另立清单。
> 关联设计 / 调研文档:
> - `docs/code-review/26-nov/NUE-1117-initial-assessment.md`（初评；`B01`：证据不是合同，引用前先过 truth §5 勘误）
> - `docs/specs/dsh-nano-ui/README.md`（现行规格，115 行，过期；P1-02 降为入口页）
> 冻结决策来源:
> - `NUE-1117-qna-truth.md` §2 台账 + §4 宿主对照 + §5 勘误（只读引用；本 AP 不填 Q/A、不复制规则句、不改口）
> grounding 来源:
> - 初评 `file:line` + truth 复核（`5a41133`）+ 本 AP 撰写时对 `HEAD fb67904` 的锚点复核（无独立 eval-reference-anchor）→ **§7 内置锚区即本 AP 的 grounding 真源**
> 关联 reference-anchor: `见 §7 内置锚区（含 §7.0 快照说明）`
> 审查回写: 初稿经两路对抗审查（`.anote/reviews/NUE/1117/5748/qna-compliance.md`、`exit-and-antigreen.md`，gitignored）。两份报告均未发现改写真相层的条目；执行层问题已在本稿修正，其中需要 [业主] 取舍的三项登记为 `T-O-NUE1117-15`–`17`，事实偏差登记为 truth 勘误 E15、E16。
> 文档状态: `draft`
>
> 词汇锚定约定：本 AP 自著行文中的核心词汇（[业主]、[真相层]、[dsh]、[dsh-nano]、[dsh工作台] 与活跃插件缩写 [DNEE]/[DNK]/[DNMS]/[DNMSC]/[DNN]/[DNT]/[DNLS]/[DNCS]）按根 `AGENTS.md` 带 `[]`。`file:line`、包名、Truth-ID、Test-ID、worktree 名与代码标识符保持裸写。Truth-ID 在本文简写为 `T01`…`T17`、`TB01`…`TB04`（即 `T-O-NUE1117-01`… / `-B01`…）；Test-ID 一律写全称 `NUE1117-Txx`，表格内简写为 `Txx` 时只出现在「Test-ID」列。
>
> **冲突规则**：初评、本文测量与冻结条款不一致时，以 [`NUE-1117-qna-truth.md`](./NUE-1117-qna-truth.md) 为准；该台账与 [`NUE-1117-qna.md`](./NUE-1117-qna.md) 不一致时以问答为 provenance。步骤可以点名字段与符号，方便施工；规则句仍以真相层为准。与真相层冲突时删步骤，不改真相层，也不把本文的转写当成第二合同。

---

## 0. 执行背景与目标

> **纪律**：本文件只消费已冻结结论，不新开 Q/A。实施中遇到真相层没有覆盖的公共合同问题，停在该工作项，回到问答 append-only 补充，本 AP 保持 `draft`。本文已识别的停止点有两处：P4-01（宿主是否提供云会话判据）、P9-05（[DNN] 向宿主对话卡片注入按钮）。
>
> **授权边界**：本文不是实施授权，不是部署、发布或远端动作授权，不新增 release-gate，不改 `RELEASE.md`。**当前 0 项已开工、0 项 PASS**。§8 的四元组是执行期必须产出的证据形状。§10 收口状态一律 `未观察`。

- **服务业务簇**：`nano-ui-enhancement`
- **计划对象**：`NUE-1117`
- **本次计划解决的问题**：
  - UI 规格没有唯一真源：现行 README 过期且含错误（`T02` 证据），宿主组件与令牌没有可查的 catalog，[DNMS] 的导出快照只服务一个插件（`T08`）。
  - nano-ui 自身违反「宿主优先、不嫁接」：令牌错名、菜单/Toast/页签自绘、`dom.js:39-93` 改写宿主 Modal 根节点、`styles.js:55,56,77` 用 `[class*=…]` 选宿主内部节点（truth E12/E14，`T01`/`T12`）。
  - 六个插件各自手绘宿主已有的控件、嫁接宿主内部 DOM、各写一份 `schemeOf`、硬编码 z 与亮暗色值（truth §3.1）。
- **本次计划的直接产出**：
  - `docs/specs/dsh-nano-ui/DESIGN.md`（唯一 UI 规格）+ 入口页 README + 仓根原则 + 开发 agent 用 design skill。
  - `packages/dsh-nano-ui/catalog/{tokens,icons,primitives}.json` + 生成脚本；泛化后的 `check-client-rules.mjs`；只警告的 `check-ui-rules.mjs`。
  - nano-ui 0.2.0：旧接口在 Phase 3 一次硬切（`T15`），同时提供 ThemeScope、窗口覆盖层、包装宿主 Menu/Toast/页签、Toolbar/EmptyState/FloatingWindow/IconButton/mountNano、`VERSION`、CHANGELOG、包内测试。
  - 六个插件各一次硬切迁移，旧样式、旧嫁接、旧 `schemeOf` 同提交删除；收尾只重建六份 `lib/client.js`（`T16`）。
- **本计划不重新讨论的设计结论**：
  - 宿主 primitive > nano-ui > 插件私有（`nano-ui-exempt`），不得嫁接宿主内部 DOM，约束同样作用于 nano-ui（`T01`、`T12`）。
  - 对话框两种承载、`dom.js` 补丁与 `theme`/`z` 参数退役（`T12`）；[DNMS] 历史对话框改主窗口级（`T13`）。
  - 旧接口一次硬切、无过渡路径（`T15`）；收尾只改 `lib/`（`T16`）；Devin 标签删除不替代（`T17`）。
  - 迁移顺序 [DNMS] → [DNEE] → [DNT] → [DNK] → [DNCS] → [DNN]（`T09`）；UI 检测只警告（`TB03`、`T05`）；0.2.0 与分开提交（`T10`）。

---

## 1. 执行综述

### 1.1 总体执行方式

「先真源、后库、再消费者、最后收口」。Phase 1–2 建立规格、catalog 与检测脚本，不改任何插件行为。Phase 3 产出 nano-ui 0.2.0，并在同一个 worktree 内**一次删除全部旧接口与旧实现**（`T15`）；能保留的导出名保留，换成新实现，使尚未迁移的插件仍能构建，被删参数不再生效。Phase 4–9 按 `T09` 顺序每个插件一个 worktree、一次合并。Phase 10 只重建六份 `lib/client.js`，核对版本标记，删除 worktree。

### 1.2 Phase 总览

| Phase | 名称 | worktree | 规模 | 目标摘要 | 依赖前序 |
|------|------|----------|------|----------|----------|
| Phase 1 | 规格与原则基座 | `nue-1117-foundation` | S | DESIGN.md、README 入口页、仓根原则、TEMPLATE、design skill | - |
| Phase 2 | catalog 与检测 | `nue-1117-catalog` | M | 生成 catalog；删 [DNMS] 快照；泛化 `check-client-rules`；新建只警告的 `check-ui-rules` | Phase 1 |
| Phase 3 | nano-ui 0.2.0 硬切 | `nue-1117-nano-ui` | L | 令牌、层级常量、ThemeScope、包装宿主组件、窗口覆盖层、新组件、版本标记、测试；旧接口全部删除 | Phase 2 + PRE-1116 已合入 |
| Phase 4 | [DNMS] 迁移 | `nue-1117-migrate-dnms` | M | 区域收束退役、云会话自判、手绘控件换宿主 | Phase 3 |
| Phase 5 | [DNEE] 迁移 | `nue-1117-migrate-dnee` | M | `:has()` 与 `[class*=` 退役、死样式、页签误用、菜单、ThemeScope | Phase 4 |
| Phase 6 | [DNT] 迁移 | `nue-1117-migrate-dnt` | M | trajCls → Toolbar、死样式、unicode 图标 | Phase 5 |
| Phase 7 | [DNK] 迁移 | `nue-1117-migrate-dnk` | M | 图标、未定义类、ThemeScope、设置对话框改窗口覆盖层、交互 Toast | Phase 6 |
| Phase 8 | [DNCS] 迁移 | `nue-1117-migrate-dncs` | M | 隐藏样式、composer 嫁接与 Devin 标签、section 哈希类、`window.confirm`、页签 | Phase 7 |
| Phase 9 | [DNN] 迁移 | `nue-1117-migrate-dnn` | XL | 对话框、菜单、控件、图标、色值、合同测试 | Phase 8 |
| Phase 10 | 收口 | `nue-1117-closeout` | S | 六份 `lib/client.js` 重建、版本一致、文档终同步、worktree 删除 | Phase 9 |

> 规模是阅读提示，不是闸。

### 1.3 Phase 说明

1. **Phase 1**：先有 DESIGN.md，Phase 2 的检测规则与 Phase 3 的组件才有可引用的条款号；README 不先降级就会出现两份真源（`T02`）。
2. **Phase 2**：ThemeScope 的亮暗值、令牌检查、泛化后的导出检查都读 catalog（`T04`、`T08`），所以必须在 nano-ui 之前入库。`check-ui-rules` 首跑结果是迁移基线。
3. **Phase 3**：插件迁移要用的新接口必须先存在；旧接口按 `T15` 在这里一次删除，后续 Phase 不再碰 nano-ui 的旧面。
4. **Phase 4–9**：顺序取 `T09`。每个插件迁移只消费 Phase 3 的新接口。
5. **Phase 10**：`TB04` 决定了产物里打的是构建当时的 nano-ui；`T16` 要求收尾统一重建，使六份产物都打进最终 nano-ui。

### 1.4 执行策略说明

- **硬切窗口（`T15`）**：Phase 3 合入 `main` 后，到某个插件迁移合入之前，该插件若从 `main` 重建，会失去被删参数提供的行为（例如 [DNN] 对话框落回主窗口级、[DNK] 设置框不再限于工作区、菜单不再带 `theme`）。因此：
  1. 窗口期内，未迁移插件不从 `main` 重建、不发布；其已提交的 `lib/client.js` 仍是旧 nano-ui 打的包，照常可用。
  2. Phase 3 保留现有导出名 `NanoDialog`、`NanoMenu`、`NanoToast`、`openNanoDialog`、`openNanoMenu`、`nanoTabs`、`NanoTabs`、`NANO_STYLES`，用新实现承接；`NanoMenuItem` 没有插件导入，直接删除。`NUE1117-T17` 静态证明每个插件从 `dsh-nano-ui` 导入的名字都仍然存在。
  3. Phase 4–9 连续推进，缩短窗口；窗口长度不是闸，但每个 worktree 的合并说明写明「本插件已脱离窗口」。
- **与 PRE-1116 的先后**：PRE-1116 会重建 [DNN]/[DNT] 的 `lib/`（truth §6.2）。如果它在 Phase 3 之后合入，重建会把硬切后的 nano-ui 打进未迁移的 [DNN]。所以 **Phase 3 合并必须等 PRE-1116 合入 `main`**；Phase 1–2 不受影响，可先合（合并前用 `git diff --name-only` 与 `facade-observe-binding-v2` 的改动面求交集，有交集时等）。Phase 3 起每个 worktree 都从合入 PRE-1116 后的 `main` 切出；`lib/client.js` 冲突一律重新构建，不手工合并。
- **版本纪律（`T10`、`TB04` 推论）**：旧接口删除属于破坏性变更，全部落在 0.2.0 这一版里，此后不再有删除。Phase 3 之后 nano-ui 若因某个插件迁移需要改动（同 worktree 内先提交 nano-ui，再提交插件），凡改变行为的都递增补丁版本并记 CHANGELOG，否则产物里的版本标记无法区分内容。Phase 10 以 nano-ui 最终版本核对六份产物。
- **风险控制原则**：每个插件迁移前后各跑一次 `check-ui-rules`，该插件警告数只能降或转为带说明的 `nano-ui-exempt`；`check-client-rules` 扩展与它暴露的问题修复在同一提交（`T05` 推论）。
- **测试推进原则**：短途（`node --test`、源码断言、脚本退出码）每个提交跑；每个 Phase 合并前跑一次 `node scripts/test-all.mjs`。Phase 3 不带 `--build`（带了会改写插件 `lib/`）；Phase 4–9 只构建本插件；Phase 10 才全量构建。视觉核对（`NUE1117-T27a`–`e`）是 live spike，需 [业主] 授权在本机 profile 部署后才跑，未授权保持 `未观察`。不新增 soak。
- **文档同步原则**：DESIGN.md 是唯一规格；包 AGENTS、INTRODUCTION 只描述用法并链接 DESIGN.md，不复制条款。每个插件迁移在同一提交更新自己 AGENTS/README 中被改动的 UI 描述。
- **回滚原则**：每个 worktree 一次合并，回滚即 revert 该合并提交。回滚 Phase 3 时，已迁移插件也要一起回滚（它们依赖新接口）。

### 1.5 本次 action-plan 影响结构图

```text
NUE-1117
├── Phase 1 foundation
│   ├── docs/specs/dsh-nano-ui/{DESIGN.md 🆕, README.md → 入口页}
│   ├── AGENTS.md（核心工作原则 + UI 优先级）
│   ├── docs/agents/{TEMPLATE.md, skills/dsh-nano-design/SKILL.md 🆕}
│   └── INTRODUCTION.md（:393 排版段、:403 版本行改为链接 DESIGN.md）
├── Phase 2 catalog
│   ├── packages/dsh-nano-ui/catalog/{tokens,icons,primitives}.json 🆕
│   ├── scripts/gen-nano-catalog.mjs 🆕（取代 gen-primitives-exports.mjs ✂）
│   ├── scripts/check-client-rules.mjs（规则 2 泛化到六个使用方 + nano-ui）
│   ├── scripts/check-ui-rules.mjs 🆕（只警告）
│   ├── test/scripts/*.test.mjs 🆕（显式文件列表运行）
│   └── dsh-nano-model-selector/test/primitives-exports.json ✂
├── Phase 3 nano-ui 0.2.0（硬切）
│   └── packages/dsh-nano-ui/{index.js, src/*, test/* 🆕, CHANGELOG.md 🆕, package.json}
├── Phase 4–9 插件（各自 src/client、test、AGENTS、本插件 lib/client.js 重建）
│   ├── [DNMS] 区域收束 ✂、云会话自判、Tag/Switch/SegmentedControl
│   ├── [DNEE] :has() ✂、[class*= ✂、.nxe-menu* ✂、页签、菜单、schemeOf ✂
│   ├── [DNT]  trajCls ✂ → Toolbar、死样式 ✂、图标
│   ├── [DNK]  图标、未定义类、schemeOf ✂、窗口覆盖层、交互 Toast
│   ├── [DNCS] 隐藏样式 ✂、composer 嫁接与 Devin 标签 ✂、section 哈希类 ✂、confirm、页签
│   └── [DNN]  窗口覆盖层、窗口内菜单、Switch/Tooltip/图标、ThemeScope、合同测试改写
└── Phase 10 closeout：六份 lib/client.js 重建（只改 lib/）、版本一致、worktree 删除
```

---

## 2. In-Scope / Out-of-Scope

### 2.1 In-Scope

- **[S1]** DESIGN.md 唯一规格 + README 入口页 + 仓根原则 + TEMPLATE + design skill（`T01`、`T02`、`T07`）。
- **[S2]** catalog 三件套与生成脚本；[DNMS] 快照删除；`check-client-rules` 规则 2 泛化；`check-ui-rules` 只警告（`T05`、`T08`、`TB03`）。
- **[S3]** nano-ui 0.2.0 全部内容与旧接口一次硬切（`T04`、`T10`、`T11`、`T12`、`T15`，truth §4.2 末段清单）。
- **[S4]** 六个插件各一次硬切（`T03`、`T06`、`T09`、`T11`、`T13`、`T17`）。
- **[S5]** 收尾重建六份 `lib/client.js`（`T16`、`TB04`）。

### 2.2 Out-of-Scope

- **[O1]** PRE-1116 的任何内容与其 worktree（另一 agent 负责）。
- **[O2]** [DNLS]、[DNMSC]：没有浏览器 UI 或不消费 nano-ui，不迁移；`check-ui-rules` 扫描范围只含六个使用方与 nano-ui。
- **[O3]** 宿主侧改动。宿主缺口只登记进 DESIGN.md，插件不补（truth §6.1）。
- **[O4]** 给 [DNN]/[DNEE] 的 `package.json` 补 `test` 脚本，或把根 `test/scripts/*` 接进 `test-all`：会改变 `test-all` 的成员，属于新增闸门（`不得过度仪式`）。这些套件今天是否全绿只在撰写时抽查过，不作为迁移后状态的证据；本 AP 直接用 `node --test <文件列表>` 跑它们（§8.3）。nano-ui 自带 `test` 脚本被 `test-all` 自动发现（`test-all.mjs:30-35,42-44`），这是既有机制，不算改闸门成员（P3-11）。
- **[O5]** [DNK] `index.js:1962/1971` 重复 `ref` 键等非 UI 缺陷。
- **[O6]** 新增 react/jsdom 等开发依赖做组件渲染测试（§8.4）。

### 2.3 边界判定表

| 项目 | 判定 | 理由 | 重评条件 |
|------|------|------|----------|
| [DNCS] `index.js:27-70,82` 往宿主 composer 插 Devin 标签并读 `.nms-root` | `in-scope`（P8-02），整段删除 | `T17`：删除并登记宿主缺口，不新增替代挂载点 | 无 |
| [DNK] 设置对话框 `region`（`index.js:1694-1704`） | `in-scope`（P7-04，窗口覆盖层） | 勘误 E15 | 无 |
| [DNCS] `styles.js:55-60` 以 `.nano-dialog-card:has(...)` 定卡片尺寸 | `in-scope`（P8-01） | 依赖 nano-ui 内部类名；改用 NanoDialog 尺寸参数 | 无 |
| [DNN] `panel.js:159-167,4739` 向宿主 `[data-changed-files]` 对话卡片注入「到记事本」按钮 | `blocked → 回问答`（P9-05） | 宿主对话卡片是宿主 DOM，按 `T01` 属嫁接；但真相层未列出此处，删除会去掉一项用户功能，属需要 [业主] 取舍的范围问题 | 问答裁决 |
| 宿主 `sessions` 元数据不含云会话判据 | `blocked → 回问答`（P4-01） | `T06` 只允许用宿主元数据；本文不得替换为插件间约定 | P4-01 核实结果 |
| [DNEE] `formatBytes`（KiB）换 `fileSizeText` | `in-scope 但条件替换` | 勘误 E13：语义重叠不等于相同 | 输出对照表全等才替换，否则保留并标 `nano-ui-exempt` |
| nano-ui 组件渲染级测试 | `out-of-scope` | 需新增依赖（O6） | [业主] 允许新增 devDependencies |

---

## 3. 业务工作总表

| 编号 | Phase | 工作项 | 类型 | 涉及文件（file:line） | 收口目标 | Test-ID | 风险 |
|------|-------|--------|------|------------------------|----------|---------|------|
| P1-01 | 1 | 新建 DESIGN.md | add | 🆕 `docs/specs/dsh-nano-ui/DESIGN.md`；迁入源 `docs/specs/dsh-nano-ui/README.md:66-78` | 优先级、令牌、z/间距、承载模型、组件清单（覆盖 truth §4.2 全表）、检测规则 U1–U10、宿主缺口 | T01 | medium |
| P1-02 | 1 | README 降为入口页 | update | `docs/specs/dsh-nano-ui/README.md:1-115` | 只剩用途、链接、版本；`:80-115` 删除不迁移 | T01 | low |
| P1-03 | 1 | 仓根原则 + TEMPLATE + INTRODUCTION | update | `AGENTS.md`「核心工作原则」；`docs/agents/TEMPLATE.md`；`INTRODUCTION.md:393,403` | UI 优先级与不嫁接写入仓根原则 | T02 | low |
| P1-04 | 1 | design skill | add | 🆕 `docs/agents/skills/dsh-nano-design/SKILL.md` | 面向本仓开发 agent；不进任何包 `files` | T02 | low |
| P2-01 | 2 | catalog 生成脚本 | add/remove | 🆕 `scripts/gen-nano-catalog.mjs`；✂ `scripts/gen-primitives-exports.mjs:1-86`（复用 `extractExports` `:40-56`） | 固定口径产出三件套，带 `generated`/`sources`/`method` | T03 | medium |
| P2-02 | 2 | catalog 入库 + 快照删除 | add/remove | 🆕 `packages/dsh-nano-ui/catalog/*.json`；✂ `dsh-nano-model-selector/test/primitives-exports.json` | 仓内只剩一份；一次性比对写进合并说明 | T03 T04 | medium |
| P2-03 | 2 | `check-client-rules` 规则 2 泛化 | update | `scripts/check-client-rules.mjs:13-17,31-33,123-135,155-168` | 六个使用方 + nano-ui；多种导入形式；退出语义不变 | T05 T06 | high |
| P2-04 | 2 | 修复泛化暴露的问题 | update | 视 P2-03 首跑结果（同一提交） | 该提交 `test-all` 退出码 0 | T06 | medium |
| P2-05 | 2 | `check-ui-rules` 只警告 | add | 🆕 `scripts/check-ui-rules.mjs` | 退出码恒 0（崩溃除外），不进 `test-all.mjs:57-65` | T07 | medium |
| P3-01 | 3 | 令牌、色值与 `[class*=` | update | `packages/dsh-nano-ui/src/styles.js:21,22,33,55,56,60,77,81-89,105,121,122,128,129` | 错名为 0；无十六进制；无 `[class*=` | T08 | low |
| P3-02 | 3 | 层级与间距常量 | add | 🆕 `src/layers.js`；`styles.js:10,31,39,102` | 数字 z 只在常量模块 | T09 | medium |
| P3-03 | 3 | ThemeScope | add | 🆕 `src/theme.js`、`src/theme-scheme.js`；读 `catalog/tokens.json` | 以 `ctx.theme` 解析 scheme，亮暗值来自 catalog | T10 | high |
| P3-04 | 3 | 图标门面 | add | 🆕 `src/icons.js` | React 用 `Icon*`，DOM 用 sprite `<use>` | T14 | low |
| P3-05 | 3 | NanoMenu / openNanoMenu 包装宿主 `Menu` | refactor | `src/menu.js:7-101`；`src/dom.js:118-160` | 自绘菜单删除；`theme`/`z` 删除 | T11 | high |
| P3-06 | 3 | NanoToast 包装宿主 `Toast` | refactor | `src/toast.js:1-11`；`styles.js:30-36` | `.nano-toast` 删除 | T12 | medium |
| P3-07 | 3 | NanoTabs / nanoTabs 改宿主页签条 | refactor | `src/tabs.js:1-150`；`styles.js:98-134` | `.nano-tab` 删除；返回形态不变 | T12 | medium |
| P3-08 | 3 | 窗口覆盖层与 openNanoDialog 新实现 | add/refactor | 🆕 `src/overlay.js`；`src/dom.js:1-115`；`src/dialog.js:21-57` | `container` 承载；MutationObserver、`theme`/`z`/`region`、`--nano-dlg-*` 删除 | T13 | high |
| P3-09 | 3 | Toolbar / EmptyState / FloatingWindow / IconButton / mountNano | add | 🆕 `src/{toolbar,empty,window,button,mount}.js` | 宿主没有的才自建 | T14 | medium |
| P3-10 | 3 | 0.2.0 + VERSION + CHANGELOG | update/add | `package.json:3,9-12`；`index.js:1-6`；🆕 `src/version.js`、`CHANGELOG.md` | 版本经 `NANO_STYLES` 打进产物 | T15 | low |
| P3-11 | 3 | nano-ui 包内测试 | add | 🆕 `packages/dsh-nano-ui/test/*.test.mjs`；`package.json` 加 `test` | 被 `test-all` 自动发现 | T16 | low |
| P3-12 | 3 | 硬切兼容核对 | verify | 六个使用方的 `dsh-nano-ui` 导入（§7.0 N5）；[DNN] `test/{portal-theme,z-order,dialog-layout}.test.mjs` | 导入名全在；[DNN] 预期失败集合登记 | T17 | high |
| P4-01 | 4 | [DNMS] 云会话自判（前置核实） | update | 宿主 `sessions` 服务；[DNMS] `src/client/index.jsx` | 只用宿主元数据；无判据即停 | T19 | high |
| P4-02 | 4 | [DNMS] 区域收束退役 | remove | `index.jsx:94`；`AsyncHistoryDialog.jsx:71,108-128`；`styles.js:222-234`；`AGENTS.md`「三个必须遵守的呈现约束」第 1 条 | 主窗口级 `Modal` | T18 | medium |
| P4-03 | 4 | [DNMS] 手绘控件换宿主 | update | `styles.js:106-109,139-143`；`CompactPanel.jsx:410-413`；`AsyncHistoryDialog.jsx:25`；`ModelSelector.jsx` 的 `NanoToast` | `Tag`/`Switch`/`SegmentedControl`；Toast 带 `anchor` | T18 | medium |
| P5-01 | 5 | [DNEE] `:has()` 退役 | remove | `styles.js:226-250,349-350`；`accessory.js:38` 注释 | 指向宿主的 `:has(` 为 0 | T20 | medium |
| P5-02 | 5 | [DNEE] 死样式、页签、菜单 | update | `styles.js:298-324`；`drawers.js:486,754,914`；`menu.js:13-33` | `.nxe-menu*` 删除；`SegmentedControl`；宿主 Menu | T20 | medium |
| P5-03 | 5 | [DNEE] 主题、对话框探测、Toast、格式化 | update | `index.js:66`；`dialogs.js:64,81`；`body.js:12`；`format.js` | ThemeScope；不查 `[class*=`；Toast 带 `anchor` | T20 | medium |
| P6-01 | 6 | [DNT] trajCls → Toolbar | refactor | `NanoTerm.jsx:51-83` | 不再反查宿主哈希类 | T21 | medium |
| P6-02 | 6 | [DNT] 死样式与图标 | update | `NanoTerm.jsx:94-96,126-127,151-153,162,550-557,574,581` | U8 确认后删除；unicode → `Icon*` | T21 | low |
| P7-01 | 7 | [DNK] 图标与注释 | update | `index.js:1243-1278` | 自绘箭头/查找换 `IconChevron*` | T22 | low |
| P7-02 | 7 | [DNK] 未定义类 | update | `index.js:1277,1647,1668,1995` | U9 = 0 | T22 | low |
| P7-03 | 7 | [DNK] ThemeScope 与菜单 | update | `index.js:349,1894-1896,2140-2142` | `schemeOf` 删除；菜单窗口内 | T22 | medium |
| P7-04 | 7 | [DNK] 设置对话框改窗口覆盖层 | update | `index.js:1691-1709` | `container` 取代 `region` | T22 | medium |
| P7-05 | 7 | [DNK] 交互 Toast 与页签 | update | `index.js:120,1494,2114-2121` | 复用 `.nano-toast` 的自绘 Toast 改宿主 Toast `actions` | T22 | low |
| P8-01 | 8 | [DNCS] 删隐藏样式与卡片 `:has` | remove | `styles.js:20-31,52-53,55-60` | 规则段为 0；卡片尺寸改走参数 | T23 | low |
| P8-02 | 8 | [DNCS] composer 嫁接与 Devin 标签删除 | remove | `index.js:27-70,82`（`:37` 哈希类、`:45` `.nms-root`）；`:33,56,147` `dncsCloud` | 读写 composer、`.nms-root`、`dncsCloud` 为 0 | T23 | medium |
| P8-03 | 8 | [DNCS] section 哈希类 | refactor | `section.js:36-39,59-164` | 不合成、不查询哈希类 | T23 | high |
| P8-04 | 8 | [DNCS] `window.confirm` | update | `index.js:125`；`native-workbench.js:123`；`settings-dialog.js:133` | 不可逆用 `RiskConfirmation`，可逆用 `NanoDialog danger` | T23 T24 | medium |
| P8-05 | 8 | [DNCS] 设置页签 | update | `settings-dialog.js:11,70-86` | DOM `nanoTabs` 换 React `NanoTabs` | T23 | low |
| P9-01 | 9 | [DNN] 对话框 | update | `panel.js:2128-2132,2138-2180`；`index.js:50` | 窗口覆盖层 + 主窗口级两种 | T25 | high |
| P9-02 | 9 | [DNN] 菜单与层级 | update | `panel.js:317,943-948,2214,2297,2319,2816,2834,2886,3722,3745,3808,4185` | 窗口内 `portal:false`；`NP_PORTAL_Z` 删除 | T25 | high |
| P9-03 | 9 | [DNN] 控件、图标、色值、主题 | update | `panel.js:37,52-854,93-94,440-441,556-557,574,856-887,3157`；`index.js:50` | Switch/Tooltip/设置行/图标换宿主；ThemeScope | T25 | high |
| P9-04 | 9 | [DNN] 合同测试改写 | update | `test/portal-theme.test.mjs`、`test/z-order.test.mjs`、`test/dialog-layout.test.mjs` | 锁新合同，并能在旧实现上失败 | T26 | medium |
| P9-05 | 9 | [DNN] 宿主对话卡片注入（停止点） | verify | `panel.js:159-167,4739` | 回问答；未裁决前不改 | — | medium |
| P10-01 | 10 | 六份 `lib/client.js` 重建 | update | 六个 `dsh-nano-*/lib/client.js` | 只改 `lib/`；两次构建一致；版本标记一致 | T28 | medium |
| P10-02 | 10 | 文档终同步 + 宿主缺口终表 | update | DESIGN.md；各包 AGENTS；`INTRODUCTION.md` | 无过期描述；缺口表完整 | T29 T30 | low |
| P10-03 | 10 | worktree 删除 | remove | `.agents/worktrees/nue-1117-*` | 按 [业主] 要求删除，`git worktree list` 无残留 | — | low |

---

## 4. Phase 业务表格

### 4.1 Phase 1 — 规格与原则基座

| 编号 | 工作项 | 工作内容 | 涉及文件 | 预期结果 | Test-ID | 收口标准 |
|------|--------|----------|----------|----------|---------|----------|
| P1-01 | DESIGN.md | a) 章节固定为：优先级与豁免 → 令牌（truth §4.1；quaternary/info/toast 文字三项标「待视觉核对」）→ 字体只选 `--dsh-font-family-code` → 层级与间距常量（nano-ui 自有，锚定宿主 1000/1100/20 与 [DNN] 1200/1210）→ 承载模型（truth §4.3）→ 组件清单（truth §4.2 全表逐行：宿主直接用 / nano-ui 包装 / nano-ui 自建）→ 检测规则 U1–U10（U7 指向 `check-client-rules`）→ 宿主缺口表。b) 迁入 README `:66-78` 并改正；`:80-115` 不迁入。c) 页签条定为 `SegmentedControl`（依据 [DNMS] 包 AGENTS 呈现约束第 3 条）；T27 视觉核对失败才改 `SegmentedTabs`，结论写回本节 | `DESIGN.md` | 可被条款号引用的规格 | T01 | §8.6 T01 |
| P1-02 | README 入口页 | 删除全部条款，只留用途、指向 DESIGN.md 与 CHANGELOG 的链接、当前版本；`packages/dsh-nano-ui/README.md` 软链保持 | README | 软链两端同一入口页 | T01 | — |
| P1-03 | 原则 / TEMPLATE / INTRODUCTION | 仓根「核心工作原则」加一条 UI 优先级与不嫁接（`T01` 已登记，只转写不扩约）；TEMPLATE 加「UI 先查 DESIGN.md 与 catalog」；INTRODUCTION `:393`、`:403` 改为链接 | 同左 | — | T02 | — |
| P1-04 | design skill | 触发条件、四问框架（初评 §6.1）、`node scripts/check-ui-rules.mjs` 的用法、豁免写法 | SKILL.md | — | T02 | 不在任何 `package.json` `files` |

### 4.2 Phase 2 — catalog 与检测

| 编号 | 工作项 | 工作内容 | 涉及文件 | 预期结果 | Test-ID | 收口标准 |
|------|--------|----------|----------|----------|---------|----------|
| P2-01 | 生成脚本 | a) 输入：`label=bundle` 对（默认同旧脚本 `:26-29`：rc.3 桌面 asar、rc.1 CLI）+ 主题文件 `dsh-client-ui-theme/lib/client.js`。b) primitives：沿用 `extractExports`。c) icons：primitives 中 `^Icon[A-Z]` 子集 + sprite glyph 名。d) tokens：固定正则写进脚本常量与输出 `method`；每项取亮/暗两套值。e) 键排序、稳定 JSON；`generated` 只写日期。f) 来源缺失时跳过并在 `sources` 标 `missing`；全部缺失退出 1。g) 删旧脚本，不留别名 | `scripts/gen-nano-catalog.mjs` | 同输入两次输出除 `generated` 外字节相同 | T03 | §8.6 T03 |
| P2-02 | 入库 | 生成三件套；一次性比对 primitives 与旧快照（rc.1 311、rc.3 321）逐项相等，比对结果写进 Phase 2 合并说明后删除旧快照；tokens 计数以脚本口径为准（E11） | catalog | 一份真源 | T03 T04 | 旧快照与旧脚本为 0 |
| P2-03 | 规则 2 泛化 | 见 §5.2 有序子步骤 | `check-client-rules.mjs` | 退出语义不变 | T05 | §8.6 T05 |
| P2-04 | 修复暴露问题 | 首跑结果写进提交说明；逐条改正导出名或改 `??` 回退；与 P2-03 同一提交；不顺手做 UI 迁移 | 视结果 | — | T06 | 该提交 `test-all` 退出码 0 |
| P2-05 | `check-ui-rules` | a) U1–U6、U8–U10 各一个检测函数，U7 打印「见 check-client-rules」。b) 扫描范围同 P2-03，并打印扫描文件数。c) 输出按插件、规则分组的计数与 `file:line`；`--json` 输出供 T30 使用。d) 违规退出 0；脚本异常退出非 0。e) 不加入 `test-all.mjs:57-65`。f) 首跑结果作为迁移基线记入 Phase 2 合并说明 | `check-ui-rules.mjs` | 基线表 | T07 | §8.6 T07 |

### 4.3 Phase 3 — nano-ui 0.2.0（一次硬切）

| 编号 | 工作项 | 工作内容 | 涉及文件 | 预期结果 | Test-ID | 收口标准 |
|------|--------|----------|----------|----------|---------|----------|
| P3-01 | 令牌、色值、`[class*=` | a) `:21,22,60` → `state-error-primary` / `interactive-bg-hover-danger`；`:128,129` 随 P3-07 删除（若有残留则改 `--dsw-focus-ring-color/width`）；`:33` 随 P3-06 删除。b) `var(--x, #hex)` 回退共 13 行，全部去掉回退值：令牌存在性由 catalog 与 T08 保证，nano-ui 源码不写十六进制。c) `:55,56,77` 的 `[class*="title"/"description"/"_body_"]` 删除，标题与描述字号改由 NanoDialog 自己渲染的元素承担 | `styles.js` | — | T08 | U1、U5（nano-ui）= 0 |
| P3-02 | 层级与间距 | `layers.js` 导出 `NANO_LAYER`（菜单、Toast、窗口覆盖层，以及 [DNN] 现用 1200/1210 两档的命名常量）与间距刻度，并生成对应 CSS 自定义属性；`styles.js:10,31,39,102` 不再写数字 z | `layers.js`、`styles.js` | 菜单 > 1000 | T09 | 数字 z 只在 `layers.js` |
| P3-03 | ThemeScope | a) `theme-scheme.js`（不依赖 react 的纯函数）：`resolveScheme({ pin, theme })`，`pin` 为 light/dark 时用 `pin`，否则 `theme.getTheme().colorScheme`，非 light 一律 dark（与三份 `schemeOf` 一致），`getTheme` 缺失或抛错 → dark。b) `theme.js`：`createThemeScope({ theme, element, pin })` 在 `element` 写 `data-nano-scheme`；`pin` 与宿主不同时注入该 scheme 的 `--dsw-*` 值（来自 `catalog/tokens.json`）。c) 订阅宿主主题变化；`theme` 无订阅接口时由调用方显式 `refresh()`。d) `dispose()` 移除属性、样式与订阅。e) 不读 `body[data-ds-dark-theme]` | `theme.js`、`theme-scheme.js` | 三份 `schemeOf` 可删 | T10 | §5.3 |
| P3-04 | 图标门面 | `icon(name)` 返回宿主 `Icon*`；`iconMarkup(glyph, weight)` 返回 sprite `<svg><use>`（同 [DNN] `panel.js:858-884`）；名称对 catalog 校验 | `icons.js` | — | T14 | — |
| P3-05 | Menu 包装 | a) 解码确认宿主 `Menu` 的 `anchor` 形态（元素或矩形）与 danger/分隔能力，写入 DESIGN.md。b) `NanoMenu({ menu, actions, onClose, width, maxHeight, portal })` 映射到宿主 `items`/`anchor`/`onSelect`/`onClose`/`portal`；`theme`、`z` 删除。c) `openNanoMenu` 保留现有键 `anchor`/`items`/`width`/`maxHeight`/`gap`/`direction`（`dom.js:117-132`），`direction` 映射到宿主 `side`，新增 `container`：有 `container` 时在其内挂载并 `portal:false`，否则 `portal:true`；`theme`、`z` 删除。d) 自绘键盘、点外关闭、`.nano-menu*` 样式、`NanoMenuItem` 导出全部删除；`menuHeight` 保留为纯函数（供测试）。e) 宿主行为与签名不符时停在本项，回问答，不回退自绘 | `menu.js`、`dom.js` | [DNT] 现有调用零改动即走宿主 Menu | T11 | §5.3 |
| P3-06 | Toast 包装 | a) 本机核对宿主 `Toast` 的 `anchor` 是否必填、`holdMs` 能否表达「不自动结束」。b) 契约定为：`NanoToast({ text, anchor, tone, actions })`；`text` 为空不渲染；寿命由调用方控制（宿主支持不自动结束则透传，否则以 `text` 作 `key` 重挂、`holdMs` 取调用方值），二选一写入 DESIGN.md。c) 宿主要求 `anchor` 时，未传 `anchor` 不渲染并在开发期 `console.warn` 一次；[DNMS]/[DNEE]/[DNK] 在各自迁移时补 `anchor`，窗口期内不显示属 `T15` 允许的退化。d) 删 `.nano-toast` 样式 | `toast.js`、`styles.js:30-36` | — | T12 | — |
| P3-07 | 页签 | a) React `NanoTabs` 页签条换宿主 `SegmentedControl`，nano-ui 只保留「面板常驻、只切 `hidden`」。b) DOM `nanoTabs` 保持返回 `{ el, select, value }` 与面板接管语义（`tabs.js:24-32`），页签条经 `mountNano` 渲染 `SegmentedControl`。c) 删 `.nano-tab*` 样式与自写键盘 | `tabs.js`、`styles.js:98-134` | [DNCS]/[DNN] 现有调用仍可用 | T12 | — |
| P3-08 | 窗口覆盖层 | 见 §5.3 有序子步骤与预期 | `overlay.js`、`dom.js`、`dialog.js` | — | T13 | §5.3 |
| P3-09 | 自建组件 | `Toolbar`（替代 [DNT] 反查 TrajectoryToolbar）、`EmptyState`、`FloatingWindow`（拥有覆盖层容器与 ThemeScope 的窗口外壳）、`IconButton`（`Button` + `icon` + 必填 `aria-label`）、`mountNano(el, Component, props)` 返回 `{ update, unmount }`；只用令牌与宿主组件 | `src/*.js`、`index.js` | — | T14 | — |
| P3-10 | 版本 | a) `package.json` 0.2.0；`files` 加 `catalog`（ThemeScope 运行时读它）。b) `src/version.js`（不依赖 react）导出 `VERSION = '0.2.0'`，`index.js` 再导出。c) `NANO_STYLES` 以 `/* dsh-nano-ui@${VERSION} */` 开头：六个插件都导入 `NANO_STYLES`，tree-shake 不会丢，产物里可按 `dsh-nano-ui@` 前缀检索（避免与 [DNN] 自身 0.2.0 混淆）。d) CHANGELOG 0.2.0 分 Added / Changed / Removed，Removed 列出 §9.3 每一项 | `package.json`、`index.js`、`version.js`、`styles.js`、`CHANGELOG.md` | — | T15 | — |
| P3-11 | 测试 | 不依赖 react 的模块（`version.js`、`theme-scheme.js`、`menuHeight`、`layers.js`、icons 名称校验）做单元测试；React 组件做源码断言（契约层）；`package.json` 加 `"test": "node --test test/*.test.mjs"` | `test/*.test.mjs` | 被 `test-all` 发现 | T16 | — |
| P3-12 | 硬切兼容核对 | a) 静态列出六个插件从 `dsh-nano-ui` 导入的名字（含 `require` 解构），断言全在新 `index.js` 导出中。b) 跑六个插件既有测试，记录条数；[DNN] 三个合同测试在本 Phase 预期失败，失败的用例名先写成清单再跑，实际失败集合必须与清单相等，写进合并说明，由 P9-04 修复。c) `git diff --name-only` 只含 `packages/dsh-nano-ui/**` | — | — | T17 | §8.6 T17 |

### 4.4 Phase 4 — [DNMS]

| 编号 | 工作项 | 工作内容 | 涉及文件 | 预期结果 | Test-ID | 收口标准 |
|------|--------|----------|----------|----------|---------|----------|
| P4-01 | 云会话自判 | 见 §5.4 有序子步骤 | [DNMS] `src/client/index.jsx`；宿主 `sessions` | 二选一结果写进合并说明 | T19 | §8.6 T19 |
| P4-02 | 区域收束退役 | 删 `index.jsx:94` 查询与 `regionElement` 透传；删 `AsyncHistoryDialog.jsx:108-128` 测量 effect 与 `:71` 参数；删 `styles.js:222-234`（含注释）；包 AGENTS 呈现约束删第 1 条，标题改为「两个」；固定高度保留 | 同左 | 主窗口级 Modal | T18 | — |
| P4-03 | 控件 | `.nms-tag` → `Tag`；`.nms-switch` → `Switch`；`CompactPanel.jsx:410-413` → `SegmentedControl`；删 `AsyncHistoryDialog.jsx:25` 未用 `Tooltip`；`ModelSelector.jsx` 的 `NanoToast` 补 `anchor`；[DNMS] 不钉主题，不需要 ThemeScope | 同左 | — | T18 | U1/U2/U5/U6 为 0 或带说明豁免 |

### 4.5 Phase 5–8

| 编号 | 工作项 | 工作内容 | 涉及文件 | 预期结果 | Test-ID | 收口标准 |
|------|--------|----------|----------|----------|---------|----------|
| P5-01 | [DNEE] `:has()` | 逐条判断（`styles.js:234-239,244,250,349-350`）：Git 状态着色能否由 [DNEE] 自有节点承载 → 改写；只能挂在宿主文件树 `li[data-files-entry]` 上的 → 登记「文件树状态钩子」宿主缺口并删除（`T11`：不留例外）；注释 `:226-233` 与 `accessory.js:38` 同步 | `styles.js`、`accessory.js` | — | T20 | 指向宿主的 `:has(` 为 0；`data-files-entry` 为 0 |
| P5-02 | [DNEE] 死样式/页签/菜单 | 删 `.nxe-menu*`（`:298-324`，U8 复核）；`drawers.js:486,754,914` 三个页签变量（`tab`/`settingsTab`/`filter`）的 Button-as-tabs → `SegmentedControl`；`menu.js` 去掉 `z: MENU_LAYER` 与自建 body portal，改宿主 Menu `portal:true` | 同左 | — | T20 | — |
| P5-03 | [DNEE] 主题/探测/Toast/格式 | `index.js:66` → `createThemeScope`；`dialogs.js:64,81` 的 `[class*="nxe-"]` 探测改为自有 ref 或 `data-nxe-*` 属性；`body.js` 的 `NanoToast` 补 `anchor`；`format.js` 输出对照后条件替换 | 同左 | — | T20 | — |
| P6-01 | [DNT] Toolbar | `trajCls` 及其缓存删除，工具条用 nano-ui `Toolbar` | `NanoTerm.jsx:51-83` | — | T21 | `--dsh-trajectory-toolbar-height` 为 0 |
| P6-02 | [DNT] 清理 | 死样式候选（`:94-96,126-127,151-153,162`）逐条用 U8 确认后删；`:550-557`、`:574`（⊕）、`:581`（⚙）unicode → `Icon*`（catalog 内） | 同左 | — | T21 | — |
| P7-01..03 | [DNK] 图标/类/主题 | `:1243-1278` 换 `IconChevron*`；`:1277,1647,1668,1995` 未定义类补定义或删除；`:2140-2142` `schemeOf` 删除，改 `createThemeScope`；`:1894-1896` 菜单去 `theme`，在工作区内用 `openNanoMenu({ container })` | `index.js` | — | T22 | — |
| P7-04 | [DNK] 设置对话框 | `openNanoDialog({ container: workspaceEl, width: 420, fixedHeight: 560, … })`，`workspaceEl` 取自有 `[data-nks-workspace]` 元素本身而非矩形；删 `region` | `index.js:1691-1709` | — | T22 | — |
| P7-05 | [DNK] 交互 Toast 与页签 | `:2114-2121` 复用 `.nano-toast` 类的自绘交互 Toast 改为 `NanoToast({ actions, anchor })`，`:120` 注释与 `.nks-toast-fix` 样式删除；`:1494` `NanoTabs` 跟随新实现 | `index.js` | — | T22 | `nano-toast` 字面量为 0 |
| P8-01 | [DNCS] 样式 | 删 `styles.js:20-31`（composer 隐藏段）、`:52-53`（`[class*="list"]`）；`:55-60` 卡片 `:has` 尺寸改为 NanoDialog `width`/`fixedHeight` 参数 | `styles.js`、`settings-dialog.js`、`new-session-dialog.js` | — | T23 | — |
| P8-02 | [DNCS] composer 嫁接与 Devin 标签 | 删 `installCloudComposer` 整段（`index.js:27-70`）与 `:82` 注册；`dncsCloud` 写入（`:56,147`）与读取（`:33`）在无读者后一并删除；Devin 标签不另设挂载点（`T17`），DESIGN.md 登记「云会话标识」宿主缺口 | `index.js` | — | T23 | — |
| P8-03 | [DNCS] section | 见 §5.5 有序子步骤 | `section.js` | — | T23 | — |
| P8-04 | [DNCS] 确认 | `native-workbench.js:123` 中止（upstream `DELETE`）→ `RiskConfirmation`；`settings-dialog.js:133` 删除 profile（token 只写不读，删除后需重新录入）→ `RiskConfirmation`；`index.js:125` 归档（可取消归档）→ `NanoDialog danger`。中止判定抽成不依赖 react 的 `mayTerminate({ acknowledged })` | 三个文件 | — | T23 T24 | §7.3 |
| P8-05 | [DNCS] 页签 | `settings-dialog.js:70-86` 的 effect 内 DOM `nanoTabs` 改为 React `NanoTabs` | `settings-dialog.js` | — | T23 | — |

### 4.6 Phase 9 — [DNN]

| 编号 | 工作项 | 工作内容 | 涉及文件 | 预期结果 | Test-ID | 收口标准 |
|------|--------|----------|----------|----------|---------|----------|
| P9-01 | 对话框 | 见 §5.6 有序子步骤 | `panel.js`、`index.js` | — | T25 | §5.6 |
| P9-02 | 菜单与层级 | 见 §5.6 有序子步骤 | `panel.js` | — | T25 | §5.6 |
| P9-03 | 控件图标色值主题 | 见 §5.6 有序子步骤 | `panel.js`、`index.js` | — | T25 | §5.6 |
| P9-04 | 合同测试改写 | `portal-theme`：改锁「菜单/对话框挂在 `.np-window` 内、不传 `theme`/`z`」；`z-order`：保留 `.np-layer` 1200 与 body 重挂（数值引 nano-ui 常量），删除 body 级 portal z 的断言并改锁「不存在 `NP_PORTAL_Z`」；`dialog-layout`：区域几何断言改为窗口覆盖层的 `container`/尺寸断言，表单控件一条保留。三个文件读 nano-ui 源码的路径改为可由环境变量 `NANO_UI_SRC` 覆盖、[DNN] 源码路径可由 `NP_SRC` 覆盖（供 T26 在旧实现上实跑） | `test/*.test.mjs` | — | T26 | §8.6 T26 |
| P9-05 | 宿主对话卡片注入 | 核实 `[data-changed-files]` 属宿主对话卡片（`panel.js:4739` 注释已写明）。按 `T01` 属嫁接，但真相层未列此处，删除会去掉「到记事本」功能。**停在本项**，回问答；裁决前保持原样，`check-ui-rules` 对它的警告不计入 [DNN] 迁移的降幅要求 | `panel.js:159-167,4739` | 问答编号写进合并说明 | — | — |

### 4.7 Phase 10 — 收口

| 编号 | 工作项 | 工作内容 | 涉及文件 | 预期结果 | Test-ID | 收口标准 |
|------|--------|----------|----------|----------|---------|----------|
| P10-01 | 重建 | a) 在同一 HEAD、不提交的前提下，六个使用方 `npm run build` 两次，比较两次的六个 sha256（[DNK] `build-client.mjs:56-62,72` 把 git sha 烤进 `__NKS_BUILD_ID__`，所以两次之间不得提交；不得为通过比较而删除 buildId）。b) `grep -c 'dsh-nano-ui@<最终版本>'` 六份产物各 ≥ 1。c) 提交，`git diff --name-only` 只含 `dsh-nano-*/lib/**`（`T16`）。d) `node scripts/test-all.mjs` 退出码 0 | 六个 `lib/client.js` | — | T28 | §8.6 T28 |
| P10-02 | 文档 | DESIGN.md 宿主缺口终表；`nano-ui-exempt` 标记（U10 输出）逐条在 DESIGN.md 有说明；包 AGENTS 与 INTRODUCTION 过期句清零。本项是 docs 提交，与 P10-01 的 lib 提交分开 | docs | — | T29 T30 | — |
| P10-03 | worktree | 按 [业主] 要求删除 `nue-1117-*`；`git worktree list` 不再含它们 | — | — | — | — |

---

## 5. Phase 详情

### 5.1 Phase 1

- **具体功能预期**：
  1. DESIGN.md 是唯一可写规格，README 不含任何条款。
  2. README `:80-115` 的主题/层级契约不出现在 DESIGN.md（`T12`）。
  3. 令牌一节每个名字都能在 catalog 中找到（Phase 2 后由 T03 反查）。
  4. 组件清单覆盖 truth §4.2 全部行。
  5. 宿主缺口表至少含：z 令牌、spacing 令牌、区域 API、TrajectoryToolbar 导出、云会话 composer 按钮、云会话标识（`T17`）、文件树状态钩子。
- **收口标准**：T01、T02。
- **风险**：DESIGN.md 写成第二份初评。只写规则与对照，不写论证。

### 5.2 Phase 2

- **P2-03 有序子步骤**（high）：
  1. 把 `PKG`/`SRC`（`:31-33`）改为扫描列表：六个使用方 `src/client/**` + `packages/dsh-nano-ui/src/**`；规则 1/3 范围不变。
  2. 改读 `packages/dsh-nano-ui/catalog/primitives.json`；catalog 不存在 → problem，退出 1（不是 warn）。
  3. 解析导入：具名（含跨行）、`import X, { … }`、`import * as X` 后的 `X.Name` 与 `const { … } = X`、`require('…primitives')` 解构；`{ A: B }` 取 `A`。
  4. 某名字在全部版本缺失 → problem；只在部分版本缺失 → warn（保留 [DNMS] `??` 回退的合法性）。
  5. 输出「检查文件数 / 导入名数」，便于发现空扫描。
  6. 新增 `--root <dir>`：只替换使用方扫描根，规则 3 的 externals 检查在夹具中用一个假 bundle 满足；无参数时行为与今天相同。
  7. 头注 `:13-17` 与提示句 `:160` 改为指向 catalog。
- **具体功能预期**：
  1. catalog 可重复生成，元数据写明来源路径与提取口径。
  2. 每种导入形式写一个不存在的名字，都被报出且退出 1。
  3. 部分版本缺失只警告，退出 0。
  4. 泛化提交本身 `test-all` 退出码 0。
  5. `check-ui-rules` 对故意违规的夹具输出警告且退出 0；脚本抛异常时退出非 0；不在 `test-all.mjs` 闸门列表。
- **收口标准**：T03–T07。
- **风险**：泛化暴露的问题多于预期。修复只做导出名改正或回退。

### 5.3 Phase 3

- **新增**：`layers.js`、`theme.js`、`theme-scheme.js`、`icons.js`、`overlay.js`、`toolbar.js`、`empty.js`、`window.js`、`button.js`、`mount.js`、`version.js`、`test/`、`CHANGELOG.md`。**修改**：`index.js`、`menu.js`、`toast.js`、`tabs.js`、`dom.js`、`dialog.js`、`styles.js`、`package.json`。
- **P3-08 有序子步骤**（high）：
  1. 新建 `overlay.js`：`NanoWindowDialog({ container, width, maxHeight, fixedHeight, …NanoDialog 卡片参数 })`，在 `container` 内渲染遮罩与卡片，接入宿主 `useModalLayer(ref, open, onClose)`。
  2. `openNanoDialog` 重写为两条路径：有 `container` → 窗口覆盖层；无 `container` → 主窗口级 `NanoDialog`（宿主 `Modal`）。旧参数映射：`region` → 调用方改传拥有者元素作 `container`；`width`/`maxHeight`/`fixedHeight` → 窗口覆盖层的卡片尺寸，主窗口级路径施加在 nano-ui 自己渲染的内层元素上（不触碰宿主 Modal 根节点，先本机核对宿主卡片是否收缩包裹；不能则登记缺口，主窗口级只给预设宽度）；`theme` → 删除，由容器上的 ThemeScope 承担；`z` → 删除。
  3. `NanoDialog` 删除 `region` 参数（`dialog.js:21-26,44`）。
  4. 删除 `dom.js:11-115` 的 MutationObserver、`--nano-dlg-*`、`setTheme`，以及 `styles.js:39-71` 中只服务它们的规则。
  5. 覆盖层自身 `pointer-events:auto`（[DNN] `.np-layer` 是 `pointer-events:none`，`panel.js:81`）。
- **具体功能预期**（窗口覆盖层）：
  1. 覆盖层是 `container` 的子节点，遮罩 `inset:0` 相对容器，不出现 `document.body` 级 portal。
  2. Esc 只关最上层（由 `useModalLayer` 提供）；覆盖层打开时宿主 `isBehindModal` 对下层的返回值**待本机核实**，结论写入 DESIGN.md。
  3. 关闭后焦点回到打开前的元素；卸载时移除全部监听。
  4. 按钮用宿主 `Button`，颜色只用令牌；不接受 `theme` 参数。
  5. `container` 不存在或已脱离文档时抛出带说明的错误，不退回 body。
  6. 同一容器连续打开两个覆盖层，关闭顺序后进先出。
- **具体功能预期**（ThemeScope）：
  1. 宿主 light → `light`；dark、未知、`getTheme` 缺失或抛错 → `dark`。
  2. `pin` 与宿主相同时不注入颜色值。
  3. `pin` 与宿主不同时注入的每个值都来自 catalog；nano-ui 源码无十六进制色值。
  4. 宿主切换主题后 `data-nano-scheme` 更新（`pin` 存在时不变）。
  5. `dispose()` 后无残留属性与样式节点。
- **具体功能预期**（Menu）：
  1. `NanoMenu` 渲染宿主 `Menu`，不注册自有 `keydown`/`pointerdown`。
  2. 从宿主 Modal 内打开时菜单可见（宿主 Menu 的 portal 层级）。
  3. 分隔符与 danger 项保持语义。
  4. `openNanoMenu` 有 `container` 时 `portal:false` 且挂在容器内。
  5. 关闭时卸载宿主节点。
- **收口标准**：T08–T17；`node scripts/test-all.mjs`（不带 `--build`）退出码 0；插件 `src/` 与 `lib/` 无改动。
- **风险**：宿主 `Menu`/`Toast` 的真实行为与解码签名不符 → 停在对应工作项回问答，不回退为自绘。

### 5.4 Phase 4–8（插件迁移通用）

- **每个插件 worktree 的提交顺序**：如需 nano-ui 改动，先 nano-ui 提交（行为变化递增补丁版本），再插件提交（`T10`）；插件提交同时删除旧样式（`T03`）并重建本插件 `lib/client.js`。
- **P4-01 有序子步骤**（high）：
  1. 在宿主产物与 `ctx.sessions` 运行时对象中查找能区分云会话的**宿主公开合同**字段（会话来源、agent 类型、projection 标记等）；只读私有实现或由 [DNCS] 写入的字段不算。
  2. 找到：写纯函数 `isCloudSession(session)`，只接受宿主会话对象。
  3. [DNMS] 订阅当前会话并据此隐藏自身；字段与出处写入 DESIGN.md 宿主接口一节。
  4. 找不到：**停止本项**，[DNMS] 其余部分照常合并，本项回问答；不得改读 `html[data-dncs-cloud]`，不得新建插件间约定。
  5. 合并说明写明二选一结果。
- **通用预期**：
  1. `check-ui-rules` 该插件计数 ≤ Phase 2 基线，U1/U2/U5/U6 为 0 或每条有 `nano-ui-exempt` 说明。
  2. 本插件既有测试全部通过且条数不低于下限（[DNMS] 54、[DNT] 137、[DNK] 56、[DNCS] 24、[DNEE] 12）。
  3. 本插件对 nano-ui 的调用只用 0.2.0 新签名（不传 `theme`/`z`/`region`）。
  4. 钉主题的插件（[DNEE]、[DNK]、[DNN]）调用 `createThemeScope`。
  5. 包 AGENTS 中描述被改 UI 的句子同提交更新；产物含 `dsh-nano-ui@` 版本标记。

### 5.5 Phase 8 — [DNCS] section

- **P8-03 有序子步骤**（high）：
  1. 列出 `section.js:59-164` 每个 `[class*=…]` 查询与 `:36-39` `withLocal` 合成的用途（标题行、项目行、会话行、按钮、时间等）。
  2. 每个用途换成宿主 primitive（`DisclosureRow`、`Button`、`Icon*`、`relativeTime`、`Tag` 等）加令牌的自有渲染。
  3. 宿主侧栏的视觉对齐只能靠令牌达到；无法对齐的登记缺口，不回退哈希类。
  4. 删除 `withLocal`、`classOf`、`stripWide` 等只服务哈希类的辅助函数。
  5. `[DNCS]` 测试 ≥ 24 条通过，并新增「section 源码无 `[class*=`、无 `querySelector` 宿主类」的断言。

### 5.6 Phase 9 — [DNN]

- **P9-01 有序子步骤**（对话框）：
  1. 选定窗口容器：保留现有 `.np-layer` / `.np-window` 结构（不改用 FloatingWindow，避免重写窗口拖拽），在 `.np-window` 上挂 `createThemeScope` 与覆盖层容器。
  2. `panel.js:2153` 的 `openNanoDialog` 按 §5.3 映射：非 viewport 卡 → `container: .np-window`，`width`/`maxHeight`/`fixedHeight` 原值保留；viewport 卡（`spec.viewport`）→ 主窗口级，不传 `region`。
  3. 删除 `theme: resolvedTheme()`、`z: NP_PORTAL_Z` 与 `handle.setTheme` 的使用（`:2141` 类型注释同步）。
  4. `index.js:50` 的 scheme 封装改为 ThemeScope 的 `pin`。
  5. `:2128-2132` 已正确使用 NanoDialog 的位置保持。
- **P9-02 有序子步骤**（菜单与层级）：
  1. 9 处 `openNanoMenu`（`:2214,2297,2319,2816,2834,2886,3722,3745,3808`）改为 `container: .np-window`，删 `theme`/`z`。
  2. slash 菜单（`:4185`）同法。
  3. 删 `NP_PORTAL_Z`（`:948`）及其 11 行引用、`[data-nano-theme]` 选择器。
  4. `.np-layer` 1200 与 body 重挂保留，数值改引 `NANO_LAYER`。
  5. `:317` `.nano-menu-label:has(.np-fx-model-option)` 改为菜单项自有类名（宿主 Menu 没有 `.nano-menu-label`）。
- **P9-03 有序子步骤**（控件、图标、色值）：
  1. `np-switch`（`:440-441`）→ `Switch`；`np-tip`（`:556-557`）→ `Tooltip`。
  2. 设置行（`:574`）对齐 `SettingsValueField` 结构。
  3. `googleIcon`/`textIcon`（`:856-857`）、`PANEL_ICON`（`:886`）、窗口按钮（`:887` 起）→ 宿主图标；宿主没有的标 `nano-ui-exempt` 并说明。
  4. `:93-94` 手抄亮暗色值删除，由 ThemeScope 注入。
  5. DOM `nanoTabs`（`:3157`）沿用 0.2.0 新实现，调用不变；`:37` 按需引入宿主组件。
- **具体功能预期**：
  1. [DNN] 所有对话框在窗口内或主窗口级，没有第三种。
  2. 亮色 [DNN] 在暗色宿主中，窗口内菜单与对话框为亮色（T27c 观察）。
  3. `NP_PORTAL_Z`、`data-nano-theme`、`np-switch`、`np-tip` 在 [DNN] 中为 0。
  4. 三个合同测试改写后通过，且在旧实现上失败。
  5. 宿主 Modal 打开时，[DNN] 窗口层级与改造前一致（`z-order` 保留条）。
  6. 既有测试 ≥ 80 条通过。
- **风险**：`panel.js` 4000+ 行。按 P9-01..05 拆提交，只合并一次。

### 5.7 Phase 10

- **具体功能预期**：两次构建一致；六份产物版本标记一致；收尾 lib 提交只含 `lib/`；`test-all` 退出码 0；`check-ui-rules` 终表写进合并说明；worktree 删除。

---

## 6. 依赖的冻结设计决策（只读引用）

| Truth-ID | 冻结来源 | 本计划中的影响 | 若不成立的处理 |
|----------|----------|----------------|----------------|
| `TB01` | truth §2 | 初评只作索引，引用前过 §5 勘误 | — |
| `TB02` | truth §2、§6 | 每个工作项对照仓根原则 | — |
| `TB03` | truth §2 | P2-05 只警告，不进闸门 | P2-05 撤回 |
| `TB04` | truth §2 | P3-10 版本标记；§1.4 版本纪律与 PRE-1116 先后；P10-01 | — |
| `T01` | truth §2、§4.2 | P1-03；全部迁移的判据；nano-ui 只包装；P9-05 停止点 | — |
| `T02` | truth §2 | P1-01/P1-02 | — |
| `T03` | truth §2 | Phase 4–9 一个 worktree 一次合并 | — |
| `T04` | truth §2、§4.3 | P3-02/P3-03/P3-08/P3-09 | — |
| `T05` | truth §2 | P2-03/P2-04/P2-05 | — |
| `T06` | truth §2 | P4-01、P8-01/P8-02 | P4-01 停止条件 |
| `T07` | truth §2 | P1-04 | — |
| `T08` | truth §2（推论经 E16 更正） | P2-01/P2-02 | — |
| `T09` | truth §2 | Phase 4–9 顺序 | — |
| `T10` | truth §2 | P3-10、提交顺序、版本纪律 | — |
| `T11` | truth §2 | P5-01、P6-01 | — |
| `T12` | truth §2、§4.3（推论经 E15 更正） | P3-08、P7-04、P9-01/P9-02 | — |
| `T13` | truth §2 | P4-02 | — |
| `T14` | truth §2 | 已修复 `3f43bf2`，本 AP 只做回归（T18） | — |
| `T15` | truth §2 | Phase 3 一次硬切；§1.4 硬切窗口；P3-12 | — |
| `T16` | truth §2 | P10-01 只改 `lib/` | — |
| `T17` | truth §2 | P8-02 删除 Devin 标签，不新增挂载点 | — |

---

## 7. 内置 Reference-Anchor 锚区

### 7.0 快照

- 问答/truth 基线 `5a41133`；本 AP 锚点复核于 `HEAD fb67904`。两者之间只改了 [DNMS] `AsyncStatusBadge.jsx:65` 与 docs，其余行号沿用 truth。
- 事实偏差已登记为 truth 勘误 **E15**（[DNK] 也需要窗口覆盖层）与 **E16**（[DNMS] 测试不读快照），本文不另立勘误。
- **事实 N3**：[DNN] 与 [DNEE] 有 `test/` 但 `package.json` 没有 `test` 脚本，`test-all` 不跑它们；nano-ui 目前没有测试。[DNN] 的 `portal-theme`/`z-order`/`dialog-layout` 直接读 `packages/dsh-nano-ui/src/{dom,menu,styles}.js` 源码，Phase 3 硬切后会红（P3-12 预登记，P9-04 修复）。
- **事实 N4**：primitives 导入形式：具名（多数，部分跨行）、命名空间（[DNEE] `index.js:9`、`body.js:11`；[DNT] `NanoTerm.jsx:6`）、CommonJS `require`（[DNK] `index.js:4`）。现有规则 2 只认第一种。
- **事实 N5**：`dsh-nano-ui` 导入（`fb67904`）：[DNMS] `AsyncHistoryDialog.jsx:29`、`ModelSelector.jsx:6`、`styles.js:3`；[DNEE] `settings.js:5`、`menu.js:13`、`styles.js:3`、`dialogs.js:5`、`drawers.js:10`、`body.js:12`；[DNT] `NanoTerm.jsx:7`；[DNK] `index.js:5`（`require` 解构）；[DNCS] `new-session-dialog.js:5`、`settings-dialog.js:11`、`index.js:4`；[DNN] `panel.js:40`。用到的名字：`NanoDialog`、`NanoMenu`、`NanoToast`、`openNanoDialog`、`openNanoMenu`、`nanoTabs`、`NanoTabs`、`NANO_STYLES`。无插件导入 `NanoMenuItem`。
- **事实 N6**：现有测试条数（撰写时抽查）：[DNMS] 54、[DNT] 137、[DNK] 56、[DNCS] 24、[DNEE] 12、[DNN] 80。裸 `node --test` 在零测试时也退出 0，所以条数下限是证据的一部分。

### 7.1 锚表

| 锚 ID | `path:line` | 落点 | 本 AP 用途 | 处置 | 备注 |
|-------|-------------|------|------------|------|------|
| A-1 | `docs/specs/dsh-nano-ui/README.md:66-78` | 排版令牌约定 | P1-01 迁入 | ♻️ | 改正后迁入 |
| A-2 | `docs/specs/dsh-nano-ui/README.md:80-115` | 主题/层级契约 | P1-02 删除 | ⛔ | `T12` |
| A-3 | `scripts/gen-primitives-exports.mjs:24,26-29,40-56` | 快照读写、默认输入、`extractExports` | P2-01 复用后删除 | ✅→⛔ | E16 |
| A-4 | `scripts/check-client-rules.mjs:13-17,31-33,123-135,155-168` | 头注、单插件范围、具名正则、快照读取 | P2-03 | ♻️ | 规则 1/3 范围不动 |
| A-5 | `scripts/test-all.mjs:25-48,57-65` | 包自动发现（`:42` test、`:45-47` build）、闸门列表 | P3-11 自动纳入；P2-05 不加入 | ✅ 读不改 | — |
| A-6 | `packages/dsh-nano-ui/src/styles.js:10,21,22,31,33,39,55,56,60,77,102,128,129` | z、错名令牌、`[class*=` | P3-01/P3-02 | ⛔ | — |
| A-7 | `packages/dsh-nano-ui/src/dom.js:1-115` | `openNanoDialog` + MutationObserver | P3-08 重写 | ⛔ | `T15` |
| A-8 | `packages/dsh-nano-ui/src/dom.js:118-160`、`menu.js:7-101` | 自绘菜单 | P3-05 | ♻️ | — |
| A-9 | `packages/dsh-nano-ui/src/dialog.js:21-57` | 包装宿主 Modal | 主窗口级保留，删 `region` | ✅ | — |
| A-10 | `packages/dsh-nano-ui/src/tabs.js:22-150` | DOM / React 页签 | P3-07 | ♻️ | 返回形态 `:31` 保留 |
| A-11 | `packages/dsh-nano-ui/src/toast.js:1-11` | 自绘 Toast | P3-06 | ♻️ | — |
| A-12 | `dsh-nano-notepad/src/client/panel.js:858-884` | `dshIcon` 用 sprite | P3-04 参考 | ✅ | 已是原生做法 |
| A-13 | `dsh-nano-kitesurf/src/client/index.js:2140`；`dsh-nano-explorer-extra/src/client/index.js:66`；`dsh-nano-notepad/src/client/index.js:50` | 三份 `schemeOf` | P3-03 语义来源；P5/P7/P9 删除 | ⛔ | 非 light 即 dark |
| A-14 | `dsh-nano-model-selector/src/client/index.jsx:94`；`AsyncHistoryDialog.jsx:71,108-128`；`styles.js:222-234` | 区域收束 | P4-02 | ⛔ | `T13` |
| A-15 | `dsh-nano-explorer-extra/src/client/styles.js:226-250,298-324,349-350`；`drawers.js:486,754,914`；`menu.js:13-33`；`dialogs.js:64,81` | `:has()`、死样式、页签、菜单层级、`[class*=` | P5 | ⛔/♻️ | — |
| A-16 | `dsh-nano-terminal/src/client/NanoTerm.jsx:51-83,550-557,574,581` | trajCls、unicode 图标 | P6 | ⛔ | `T11` |
| A-17 | `dsh-nano-kitesurf/src/client/index.js:120,1243-1278,1691-1709,1894-1896,2114-2121` | 图标、区域对话框、菜单主题、交互 Toast | P7 | ♻️ | E15 |
| A-18 | `dsh-nano-cloud-session/src/client/styles.js:20-31,52-60`；`index.js:27-70,82,125,147`；`section.js:36-39,59-164`；`native-workbench.js:123`；`settings-dialog.js:70-86,133` | 隐藏样式、composer 嫁接、哈希类、confirm、页签 | P8 | ⛔ | `T17` |
| A-19 | `dsh-nano-notepad/src/client/panel.js:81,93-94,317,943-948,2138-2180,3157` 及 9 处 `openNanoMenu` | 层级、手抄色值、菜单 `:has`、对话框参数 | P9 | ⛔ | — |
| A-20 | `dsh-nano-notepad/test/{portal-theme,z-order,dialog-layout}.test.mjs`（`portal-theme:24-26`、`dialog-layout:24`、`z-order:26-27` 读 nano-ui 源码） | 锁旧合同的测试 | P3-12 预登记；P9-04 改写 | ♻️ | N3 |
| A-21 | `dsh-nano-notepad/src/client/panel.js:159-167,4739` | 宿主对话卡片注入 | P9-05 停止点 | 🔒 | 回问答 |
| A-22 | `dsh-nano-kitesurf/scripts/build-client.mjs:56-62,72` | git sha 烤进 buildId | P10-01 两次构建之间不提交 | ✅ 读不改 | — |
| A-23 | `dsh-client-ui-theme/lib/client.js:1489` | `--dsh-hairline-width` 定义 | T08 若 catalog 未提取则列入白名单 | ✅ | E10 |

### 7.2 反例 ledger ⛔

| ⛔ | 反例 / 陷阱 | 依据 |
|----|------------|------|
| ⛔1 | Phase 3 之后为未迁移插件保留或恢复旧参数、旧实现（过渡路径） | `T15` |
| ⛔2 | 窗口期内从 `main` 重建并发布未迁移插件 | `T15` 后果说明 |
| ⛔3 | Phase 3 先于 PRE-1116 合入，让 PRE-1116 的重建把硬切后的 nano-ui 打进 [DNN]/[DNT] | §1.4 |
| ⛔4 | [DNMS] 改读 `html[data-dncs-cloud]` 或任何 [DNCS] 写的标记 | `T06` |
| ⛔5 | 用 `[class*=…]`、`:has()` 或运行时扫描哈希类定位宿主元素，包括 nano-ui 自己 | `T01`、`T12` |
| ⛔6 | 读取宿主组件内部变量（`composer-model-*`、`session-list-edge-inset`、`--dsh-trajectory-toolbar-height`） | `T01` 推论 ③ |
| ⛔7 | 把 `check-ui-rules` 加进 `test-all` 或让它在违规时退出非 0 | `TB03` |
| ⛔8 | 先合入一个让 `test-all` 变红的 `check-client-rules` 扩展，下一提交再修 | `T05` 推论 |
| ⛔9 | catalog 手改；或 [DNMS] 快照与 catalog 并存 | `T08` |
| ⛔10 | 把 README `:80-115` 的契约改写进 DESIGN.md | `T12` |
| ⛔11 | 手工合并 `lib/client.js` 冲突 | truth §6.2 |
| ⛔12 | 把 [DNN] 三个旧合同测试删除或跳过来消红 | §8.5 |
| ⛔13 | nano-ui 自绘宿主已有组件；宿主签名不符时回退自绘 | `T01` 推论 ① |
| ⛔14 | 宿主改不了就在插件里补一份；为 Devin 标签另找挂载点 | truth §6.1、`T17` |
| ⛔15 | 在 nano-ui 与插件同一个提交里一起改 | `T10` |
| ⛔16 | 收尾提交夹带 `src/` 改动；为通过字节比较删除 [DNK] buildId | `T16`、A-22 |

### 7.3 上游真源指针 + 安全项威胁模型

- 无独立 reference-anchor，§7.1 即真源。
- **信任边界类工作项**：
  - **P8-04 不可逆操作确认**（[DNCS]）。三处分类：`native-workbench.js:123` 中止 → 不可逆（upstream `DELETE`，会话转 suspended）→ `RiskConfirmation`；`settings-dialog.js:133` 删除凭证 profile → token 只写不读、删后须重新录入 → `RiskConfirmation`；`index.js:125` 归档 → 可取消归档 → `NanoDialog danger`。威胁：误触或 Enter 一步穿透导致会话被中止或凭证丢失。要求：未勾选确认时确认按钮禁用，Enter 不触发。攻击向量用例见 `NUE1117-T24`。
  - **P4-01 云会话判定来源**。威胁：判定依据来自页面上任何脚本都能写的 DOM 属性（`html[data-dncs-cloud]`），可被伪造，使 [DNMS] 在本地会话里隐藏模型选择器或反之。要求：只信宿主 `sessions` 服务的公开字段。攻击向量用例见 `NUE1117-T19`。

---

## 8. 测试台账

> 全部 Test-ID 撰写时**未执行**。**四元组** = `commit sha + argv 或用例名 + 退出码或计数 + UTC 时间`，是执行期 PASS 的最小证据。§10 状态一律 `未观察`。
>
> 根级脚本测试放在 🆕 `test/scripts/`（目录今天不存在，也没有 `package.json`），一律以显式文件列表运行，例如 `node --test test/scripts/gen-nano-catalog.test.mjs test/scripts/check-client-rules.test.mjs`。

### 8.1 测试清单（主表）

| Test-ID | 测试项 | 类型 | 层 | 来源 | 映射 | PASS 证据 |
|---------|--------|------|----|------|------|-----------|
| `NUE1117-T01` | DESIGN.md 含 §4.1 P1-01 a) 的全部章节名；组件清单含 truth §4.2 每一行的组件名；README 无条款，`:3`「三个插件」、`:62`「headless 无样式」、`z-index`、`data-nano-theme`、`--nano-dlg` 在 README 与 DESIGN.md 为 0；软链指向同一文件 | 短途 | 契约 | 🆕 `test/scripts/nue-docs.test.mjs` | P1-01/P1-02 | 四元组 |
| `NUE1117-T02` | 仓根 AGENTS 新原则含「宿主」「nano-ui」「nano-ui-exempt」「嫁接」四要素；TEMPLATE 链接 DESIGN.md；SKILL.md 存在且不在任何包 `files` | 短途 | 契约 | 🆕 同上 | P1-03/P1-04 | 四元组 |
| `NUE1117-T03` | 可重复项：两次生成剔除 `generated` 后 sha256 相同；primitives 按版本标签计数 rc.1 = 311、rc.3 = 321；tokens 计数 ≥ 437 且每项有 light/dark；icons ⊂ primitives；DESIGN.md 令牌名全在 tokens.json。一次性项：与旧快照的逐项比对写进 Phase 2 合并说明 | 短途 | 契约 | 🆕 `test/scripts/gen-nano-catalog.test.mjs` | P2-01/P2-02 | 四元组 + 两次 sha256 |
| `NUE1117-T04` | `primitives-exports.json` 与 `gen-primitives-exports.mjs` 不存在；`scripts/`、`packages/`、六个插件目录中 `primitives-exports` 字面量为 0 | 短途 | 契约 | 🆕 同上 | P2-02 | 四元组 |
| `NUE1117-T05` | 规则 2：具名、跨行具名、`import X, {…}`、命名空间成员、命名空间解构、`require` 解构各一个不存在名字 → 退出 1 且 stderr 含该名；部分缺失 → 退出 0；catalog 缺失 → 退出 1；输出含检查文件数且 > 0；无 `--root` 时扫描根等于六个使用方 + nano-ui | 短途 | unit | 🆕 `test/scripts/check-client-rules.test.mjs`（临时目录夹具 + 假 bundle） | P2-03 | 四元组 |
| `NUE1117-T06` | 含 P2-03 改动的那个提交上 `node scripts/test-all.mjs` 退出码 0；提交说明列出首跑暴露项与修法 | 短途 | 回归 | ♻️ `test-all` | P2-03/P2-04 | 四元组 |
| `NUE1117-T07` | U1–U6、U8–U10 各有违规夹具产生对应警告文本，退出 0；注入异常退出非 0；扫描文件数 > 0；`test-all.mjs` 不含该脚本名；首跑基线表入合并说明 | 短途 | unit | 🆕 `test/scripts/check-ui-rules.test.mjs` | P2-05 | 四元组 + 基线表 |
| `NUE1117-T08` | nano-ui `src/**` 中每个 `var(--dsw-…)`、`var(--dsh-…)` 名字都在 catalog（`--dsh-hairline-width` 若未提取则显式白名单）；六个错名为 0；十六进制色值为 0；`[class*=` 为 0 | 短途 | 契约 | 🆕 `packages/dsh-nano-ui/test/tokens.test.mjs` | P3-01 | 四元组 |
| `NUE1117-T09` | `src/**` 中数字 `z-index` 与 `zIndex` 只出现在 `layers.js`；`NANO_LAYER.menu` > 1000；含 1200/1210 两档；DESIGN.md 登记同值 | 短途 | unit | 🆕 `layers.test.mjs` | P3-02 | 四元组 |
| `NUE1117-T10` | `resolveScheme`：light、dark、`undefined`、`getTheme` 缺失、抛错五种输入，`pin` 同/异两种；`theme.js` 源码读 catalog、不含 `data-ds-dark-theme`、`dispose` 移除属性与样式节点的代码路径存在 | 短途 | unit + 契约 | 🆕 `theme.test.mjs` | P3-03 | 四元组 |
| `NUE1117-T11` | `menu.js` 从 primitives 取 `Menu`；不含 `'nano-menu'` 类名与 `addEventListener`；`NanoMenu` 参数无 `theme`/`z`；`openNanoMenu` 有 `container` 分支传 `portal: false`；`menuHeight` 单元测试 | 短途 | 契约 | 🆕 `menu.test.mjs` | P3-05 | 四元组 |
| `NUE1117-T12` | `.nano-toast`、`.nano-tab` 在样式与组件源码中为 0；`toast.js` 用宿主 `Toast`；`NanoTabs` 与 `nanoTabs` 用 `SegmentedControl`；`nanoTabs` 仍返回 `el`/`select`/`value` | 短途 | 契约 | 🆕 `components.test.mjs` | P3-06/P3-07 | 四元组 |
| `NUE1117-T13` | `overlay.js` 在组件顶层调用 `useModalLayer`；无 `createPortal(…document.body)`、无 `MutationObserver`、无 `parentElement`；`container` 缺失的抛错语句存在；`openNanoDialog` 两条路径都存在；样式含 `pointer-events: auto` | 短途 | 契约 | 🆕 `overlay.test.mjs` | P3-08 | 四元组 |
| `NUE1117-T14` | `index.js` 导出全部新组件与 `icon`/`iconMarkup`/`createThemeScope`/`VERSION`；icons 名称校验单测；`IconButton` 源码含 `aria-label` 必填检查；nano-ui 引用的 primitives 名由 `check-client-rules` 扫 nano-ui 证明 | 短途 | unit + 契约 | 🆕 `exports.test.mjs` + ♻️ `check-client-rules` | P3-04/P3-09 | 四元组 |
| `NUE1117-T15` | `VERSION === '0.2.0'`（字面量写死）且等于 `package.json`；`styles.js` 源码以 `dsh-nano-ui@${VERSION}` 注释开头；`package.json` `files` 含 `catalog`；CHANGELOG 0.2.0 的 Removed 列出 §9.3 每一项 | 短途 | unit | 🆕 `version.test.mjs` | P3-10 | 四元组 |
| `NUE1117-T16` | `node scripts/test-all.mjs --only dsh-nano-ui` 输出含 `PASS  packages/dsh-nano-ui`，且该套件测试数 > 0 | 短途 | 回归 | ♻️ `test-all` | P3-11 | 四元组 |
| `NUE1117-T17` | 硬切：nano-ui 中 `MutationObserver`、`data-nano-theme`、`--nano-dlg-`、`setTheme`、`region`、`NanoMenuItem` 为 0；六个插件的 `dsh-nano-ui` 导入名（N5）全在新 `index.js` 导出；六个插件既有测试条数 ≥ N6 下限，唯一允许的失败是预登记的 [DNN] 用例集合；Phase 3 改动只在 `packages/dsh-nano-ui/**` | 短途 | 契约 + 回归 | 🆕 `packages/dsh-nano-ui/test/legacy.test.mjs` + ♻️ 六个套件 | P3-08/P3-12 | 四元组 + 预登记与实际失败集合 |
| `NUE1117-T18` | [DNMS]：`regionElement`、`--nms-region-`、`data-conversation-region`、`.nms-hist-dialog)` 选择器在 `src/` 与包 AGENTS 为 0；`.nms-tag`、`.nms-switch` 为 0；`AsyncStatusBadge` 仍传 `label`（`T14` 回归）；`NanoToast` 调用带 `anchor`；`npm test` ≥ 54 | 短途 | 回归 | ♻️ `npm test` + 🆕 `test/nue-migration.test.mjs` | P4-02/P4-03 | 四元组 |
| `NUE1117-T19` | `isCloudSession`：本地会话对象 + 文档设 `data-dncs-cloud="1"` → 本地；云会话对象 → 云；[DNMS] 源码 `dncs` 为 0。P4-01 停止时记 `deferred` 并附问答编号 | 短途 | unit | 🆕 同上 | P4-01 | 四元组或 `deferred + 问答号` |
| `NUE1117-T20` | [DNEE]：`data-files-entry`、`data-status` 选择器为 0（缺口已登记）；`[class*=` 为 0；`.nxe-menu` 为 0；`MENU_LAYER` 为 0；`schemeOf` 为 0、`createThemeScope` ≥ 1；`drawers.js` 中 `tab`/`settingsTab`/`filter` 三个变量都不再驱动 Button `variant`，`SegmentedControl` ≥ 3；`format.js` 若替换附对照表；`node --test dsh-nano-explorer-extra/test/*.test.mjs` ≥ 12 | 短途 | 回归 | ♻️ + 🆕 `test/nue-migration.test.mjs` | P5 | 四元组 |
| `NUE1117-T21` | [DNT]：`trajCls`、`--dsh-trajectory-toolbar-height` 为 0；使用 `Toolbar`；U8 对 [DNT] 为 0；`⊕`、`⚙` 等 unicode 图标为 0；`node test/run.mjs` ≥ 137 | 短途 | 回归 | ♻️ + 🆕 断言 | P6 | 四元组 |
| `NUE1117-T22` | [DNK]：U9 为 0；`schemeOf` 为 0、`createThemeScope` ≥ 1；`openNanoDialog` 调用有 `container`、无 `region`；`openNanoMenu` 无 `theme`；`nano-toast` 字面量为 0；测试 ≥ 56 | 短途 | 回归 | ♻️ + 🆕 | P7 | 四元组 |
| `NUE1117-T23` | [DNCS]：`composerSeat`、`.nms-root`、`data-nano-model-selector`、`dncsCloud`、`window.confirm`、`[class*=`、`:has(` 为 0；`nanoTabs` 为 0、`NanoTabs` ≥ 1；`withLocal` 为 0；`node --test` ≥ 24 | 短途 | 回归 | ♻️ + 🆕 | P8 | 四元组 |
| `NUE1117-T24` | 攻击向量：`mayTerminate({ acknowledged: false })` 为假，桩 `terminate` 调用计数 0；模拟 Enter 路径同样为 0；源码断言中止与删除 profile 走 `RiskConfirmation`、归档走 `NanoDialog danger` 且取消后不发请求 | 短途 | unit | 🆕 [DNCS] `test/confirm.test.mjs` | P8-04 | 四元组 |
| `NUE1117-T25` | [DNN]：`NP_PORTAL_Z`、`np-switch`、`np-tip`、`data-nano-theme` 为 0；9 处 `openNanoMenu` 与 slash 菜单带 `container`、无 `theme`/`z`；`openNanoDialog` 非 viewport 路径带 `container`；`:93-94` 色值删除；`createThemeScope` ≥ 1；`node --test dsh-nano-notepad/test/*.test.mjs` ≥ 80 | 短途 | 回归 | 🆕 `dsh-nano-notepad/test/nue-migration.test.mjs` | P9-01..03 | 四元组 |
| `NUE1117-T26` | 三个合同测试改写后通过；用 `git show <Phase 3 之前提交>:<路径> > /tmp/…` 导出旧 nano-ui 与旧 [DNN] 源码，经 `NANO_UI_SRC`/`NP_SRC` 指向它们实跑，每个文件至少一条断言以断言错误失败（不是 ENOENT） | 短途 | 回归 | 🔱 三个文件 | P9-04 | 四元组 × 2（新、旧） |
| `NUE1117-T27a` | 视觉：nano-ui 菜单从宿主 Modal 内打开可见 | spike | live | 🆕 本机 profile + ego-browser 截图 | P3-05 | 截图路径 + profile + UTC；**无授权保持 `未观察`** |
| `NUE1117-T27b` | 视觉：六个插件亮/暗两态 | spike | live | 同上 | P4–P9 | 同上 |
| `NUE1117-T27c` | 视觉：亮色 [DNN] 在暗色宿主中窗口内菜单与对话框为亮色 | spike | live | 同上 | P9 | 同上 |
| `NUE1117-T27d` | 视觉：[DNK] 设置对话框在工作区内，Esc 只关它 | spike | live | 同上 | P7-04 | 同上 |
| `NUE1117-T27e` | 视觉：quaternary/info/toast 文字三项令牌与页签条选型定稿，结论写回 DESIGN.md | spike | live | 同上 | P1-01 | 同上 |
| `NUE1117-T28` | 收尾：同一 HEAD 不提交两次构建六个 sha256 相同；六份产物 `dsh-nano-ui@<最终版本>` 各 ≥ 1；lib 提交 `git diff --name-only` 只含 `dsh-nano-*/lib/**`；`test-all` 退出码 0 | mega | 集成 | ♻️ 各包 `npm run build` + 🆕 sha 比对 | P10-01 | 四元组 + 12 个 sha |
| `NUE1117-T29` | 文档：INTRODUCTION 不再写「令牌声明在 `:root`/`body` 才到得了弹层」与版本 `0.1.0`；各包 AGENTS 不再描述区域收束、隐藏样式、portal 主题；中英文关键词各一组为 0；DESIGN.md 缺口表含 §5.1 第 5 条七项；`check-ui-rules --json` 中每个 `nano-ui-exempt` 标记在 DESIGN.md 有对应说明 | 短途 | 契约 | 🆕 `test/scripts/nue-docs.test.mjs` | P10-02 | 四元组 |
| `NUE1117-T30` | 终态全局扫描（六个使用方 + nano-ui，文件数 > 0）：U5（`[class*=`）= 0；指向宿主的 `:has(` = 0（P9-05 未裁决项单列）；`schemeOf` = 0；`window.confirm` = 0；插件间标记（`dncs`、`nms-root`、`data-nano-model-selector`）跨包读取 = 0。正控：同一扫描函数对含违规的夹具报出非 0 | 短途 | 契约 | 🆕 `test/scripts/nue-endstate.test.mjs` | P10-02 | 四元组 |

### 8.2 复用台账

| 既有用例 | 处置 | 改动 | 起跑线状态 |
|----------|------|------|------------|
| `node scripts/test-all.mjs [--build]` | ♻️ 沿用 | 0 | 已存在；撰写时未重跑 |
| [DNMS] `npm test`（54） | ♻️ | 0 | 撰写时抽查通过，不当作迁移后已绿 |
| [DNT] `node test/run.mjs`（137） | ♻️ | 0 | 同上 |
| [DNK] 测试（56） | ♻️ | 0 | 同上 |
| [DNCS] `node --test`（24） | ♻️ | 0 | 同上 |
| [DNEE] `node --test dsh-nano-explorer-extra/test/*.test.mjs`（12） | ♻️ 直接运行 | 0 | 不在 `test-all` 内 |
| [DNN] `node --test dsh-nano-notepad/test/*.test.mjs`（80） | ♻️；三个 🔱 | 见 P9-04 | 不在 `test-all` 内；Phase 3 后三个文件预期红 |
| `check-client-rules.mjs` 规则 1/3 | ♻️ | 范围不变 | 已存在 |

### 8.3 分层与跑法

| 类型 | 跑法 / 频率 | 主要层 | 触发时机 |
|------|-------------|--------|----------|
| 短途 | `node --test test/scripts/<显式文件>`；`cd packages/dsh-nano-ui && npm test`；各插件既有入口（[DNN]/[DNEE] 直接 `node --test`） | unit · 契约 · 回归 | 每个提交 |
| 回归 | `node scripts/test-all.mjs`（Phase 3 不带 `--build`；Phase 4–9 另跑本插件 `npm run build`） | 回归 | 每个 Phase 合并前 |
| spike | T27a–e，本机 profile + ego-browser | live | 须 [业主] 授权 |
| mega | T28 | 集成 | Phase 10 |
| soak | 不新增 | — | §8.4 |

### 8.4 测试缺口

- 不做 React 组件渲染测试（O6）。覆盖层与 Menu 的交互（Esc、焦点、层叠）只能由契约层源码断言 + T27 共同证明；T27 未观察时，P3-05/P3-08/P9-01/P9-02 最多算 `partial`。
- 根 `test/scripts/*` 不接入 `test-all`（O4），在相关 Phase 手动跑，四元组写进合并说明。
- 不做 rc.3 桌面版 live 核对，除非 [业主] 指定；catalog 中 rc.3 导出只证明「存在」。
- 不新增 soak：本计划没有并发或长稳风险面。

### 8.5 测试保真（防假绿 · 刻死）

- 每个 PASS 必带四元组；通过条数本身不是证据，但条数低于 §7.0 N6 下限即判失败。
- 「为 0」类断言必须写明搜索范围（目录 + 排除项），断言扫描文件数 > 0，并对含违规的夹具（或改动前的提交）实跑一次得到非 0，证明断言能失败。
- 既有失败说成「与本 AP 无关」时，必须给出改动前就失败的 git 证据；Phase 3 的 [DNN] 预期失败以预登记清单为准，清单外的失败一律算回归。
- 禁止为消红删除或跳过测试。
- 安全项 T19、T24 必须含攻击向量用例。
- `test-all` 退出码 0 不关闭任何其他 Test-ID。

### 8.6 逐 Test-ID 防假绿侦测

| Test-ID | 假绿手法 | 怎样才算没被骗 |
|---------|----------|----------------|
| T01 | 只查 DESIGN.md 存在；README 换标题留条款 | 按章节名与 §4.2 组件名逐个断言；README 禁词逐个为 0 |
| T02 | 只 grep「nano-ui」一词 | 四要素同时出现；遍历全部 `package.json` 的 `files` |
| T03 | 合并版本后比集合；夹带时间戳 | 按版本标签分别计数；剔除 `generated` 后两次 sha256 相同 |
| T04 | 只删文件不查引用 | grep 范围列明；docs 历史文档允许出现 |
| T05 | 夹具名字恰好存在；空扫描也退出 0 | 每种形式用不存在的名字；退出 1 且 stderr 含名；文件数 > 0；catalog 缺失退出 1 |
| T06 | 修复提交另起，对修复提交跑 | 证据 commit 必须含 P2-03 改动 |
| T07 | 规则被异常吞掉后退出 0 | 每条规则的警告文本都出现；单独注入异常退出非 0 |
| T08 | catalog 缺失时测试跳过 | catalog 不存在时测试失败 |
| T09 | 漏掉 JS 内联 `zIndex` | 同时扫 `z-index` 与 `zIndex` |
| T10 | 假 theme 总返回 dark，「非 light 即 dark」恒真 | 五种输入各自断言结果；light 输入必须得 light |
| T11 | 只断言 `import { Menu }` | 同时断言自绘类名与 `addEventListener` 为 0 |
| T12 | 样式删了，组件仍输出旧类名 | 组件与样式源码同时断言 |
| T13 | `useModalLayer` 调用在死分支 | 断言调用位于组件函数体顶层 |
| T14 | 导出存在但是 `undefined` | 导入 react-free 模块逐个 `typeof`；React 组件做源码导出断言 |
| T15 | 期望值从 `package.json` 读出再与同源比较 | `'0.2.0'` 写死在测试里 |
| T16 | `test` 脚本存在但跑了 0 条 | 证据含 `PASS  packages/dsh-nano-ui` 行与条数 > 0 |
| T17 | 只看 `test-all` 绿（[DNN] 不在其中）；失败集合事后补登记 | 预登记清单的提交早于跑测提交；实际失败集合与清单逐项相等；六个套件条数 ≥ 下限 |
| T18 | grep 漏包 AGENTS；条数下降 | 范围含包 AGENTS；条数 ≥ 54 |
| T19 | 没有伪造 DOM 的反例；停止却记 PASS | 必须有「DOM 写云标记、会话为本地 → 本地」用例；停止时记 `deferred` |
| T20 | 用 `test-all` 证明 [DNEE]（它不在其中）；只改一个页签变量 | argv 为 `node --test dsh-nano-explorer-extra/test/*.test.mjs`；三个变量逐个断言 |
| T21 | 死样式靠改名 | U8 输出为 0，且被删类名在源码为 0 |
| T22 | 只查 `schemeOf` 定义，漏 `BrowserPane` 参数 | 标识符全文件为 0；`createThemeScope` ≥ 1 |
| T23 | 删了 `styles.js` 但 `index.js` 仍读 `.nms-root` | 每个文件分别断言 |
| T24 | 只断言回调存在 | 未勾选时调用处理函数，`terminate` 计数为 0 |
| T25 | 菜单改 `portal:false` 却仍挂在 body | 断言调用处 `container` 来自窗口元素变量 |
| T26 | 新断言在旧代码上也通过；旧路径缺文件导致 ENOENT 被当成失败 | 旧实现上至少一条 `AssertionError`；ENOENT 判无效 |
| T27a–e | 用源码断言冒充 live；未授权写 `observed-OK` | 证据必须是部署后截图 + profile 名；无授权保持 `未观察` |
| T28 | 提交后再构建（[DNK] buildId 变化）被当成不确定；或删 buildId 求一致；lib 提交夹带 src | 两次构建之间不提交；buildId 保留；diff 只含 `lib/**` |
| T29 | 缺口表有标题无条目 | 七项逐个断言；豁免标记数与说明条数相等 |
| T30 | 扫描列表为空也得 0 | 文件数 > 0；正控夹具报出非 0 |

---

## 9. 风险、依赖与完成后状态

### 9.1 风险与依赖

| 风险 / 依赖 | 描述 | 判断 | 应对 |
|-------------|------|------|------|
| PRE-1116 未合入 | Phase 3 合并与 Phase 4 起依赖 | high | Phase 1–2 先行；Phase 3 可开工但不合并 |
| 硬切窗口内需要紧急发布某个未迁移插件 | `T15` 的已知后果 | medium | 用该插件已提交的 `lib/` 发布，不从 `main` 重建；或提前做该插件的迁移 |
| 宿主无云会话判据 | P4-01 | medium | 停止，回问答；[DNMS] 其余部分照常合并；[DNCS] 隐藏样式在 P8 照删（`T06`） |
| [DNN] 宿主对话卡片注入 | P9-05 | medium | 停止，回问答；不阻塞 [DNN] 其余迁移合并 |
| 宿主 Menu/Toast/Modal 行为与签名不符 | P3-05/P3-06/P3-08 | medium | 先本机核对；不符时停在该项回问答，不回退自绘 |
| [DNN] 面过大 | P9 | high | 多提交一次合并；T26 保证合同测试不失效 |
| 视觉核对无授权 | T27 | medium | 相关项最多 `partial`，整份 AP 不标 `executed` |
| 中间产物版本标记相同但内容不同 | 迁移 worktree 中 nano-ui 若有改动 | low | 行为变化递增补丁版本；P10-01 以最终版本核对 |

### 9.2 约束与前提

- **技术前提**：宿主 `@deepseek-ai/dsh@0.2.2-rc.1`；catalog 以 rc.1 CLI + rc.3 桌面为来源。
- **运行时前提**：插件运行时只读 `lib/`；nano-ui 不单独加载（`TB04`）。
- **协作前提**：PRE-1116 由另一 agent 负责，本计划不跟进、不改其 worktree。
- **合并前提**：每个 worktree 由 [业主] 放行；合并后按 [业主] 要求删除。

### 9.3 文档同步要求与退役清单

- 设计文档：DESIGN.md（新）；规格 README（入口页）。
- 说明文档：仓根 `AGENTS.md`、`INTRODUCTION.md:393,403`、`docs/agents/TEMPLATE.md`、六个包 `AGENTS.md`/`README.md` 中被改 UI 的句子。
- **退役清单**（代码 / 注释与头注 / 行号锚与文档句）：

| 退役面 | 删除点 | 代码 | 注释 / 头注 | 文档句 |
|--------|--------|------|-------------|--------|
| `openNanoDialog` MutationObserver、`region`/`theme`/`z`、`--nano-dlg-*`、`setTheme` | P3-08 | `dom.js:11-115`；`dialog.js:44`；`styles.js:39-71` 相关规则 | `dom.js:1-24,29-48`；`dialog.js:21-26` | README `:80-115`；INTRODUCTION `:393` |
| NanoMenu 自绘路径、`theme`/`z`、`NanoMenuItem` | P3-05 | `menu.js:27-101`；`dom.js:118-160`；`styles.js:10-28` | `menu.js:21-25`；`dom.js:129-130` | README 层级段 |
| 自绘页签 `.nano-tab*` | P3-07 | `tabs.js:33-150` 旧实现；`styles.js:98-134` | `tabs.js:3-20,105-120` | — |
| 自绘 `.nano-toast` | P3-06 | `toast.js:8-11`；`styles.js:30-36` | `toast.js:1,5-6` | — |
| nano-ui `[class*=` 与十六进制回退 | P3-01 | `styles.js:55,56,77` 及 13 行回退 | — | — |
| [DNMS] 快照与旧生成脚本 | P2-02 | 两个文件 | `check-client-rules.mjs:13-17` | `check-client-rules.mjs:160` |
| 三份 `schemeOf` | P5/P7/P9 | A-13 | — | — |
| [DNMS] 区域收束 | P4-02 | A-14 | `styles.js:222-228`；`AsyncHistoryDialog.jsx:109` | 包 AGENTS 呈现约束第 1 条 |
| [DNCS] 隐藏样式、composer 嫁接、Devin 标签、section 哈希类 | P8-01..03 | A-18 | `index.js:27-28,35` | 包 AGENTS 相关句（若有） |
| [DNT] trajCls | P6-01 | `NanoTerm.jsx:51-83` | `:51-56` | — |
| [DNEE] `:has()`、`.nxe-menu*`、`MENU_LAYER`、`[class*="nxe-"]` | P5 | A-15 | `styles.js:226-233`；`accessory.js:38` | — |
| [DNK] `region` 用法、`.nano-toast` 复用 | P7-04/P7-05 | A-17 | `index.js:120,1702,2115` | — |
| [DNN] `NP_PORTAL_Z`、手抄色值、`np-switch`/`np-tip` | P9-01..03 | A-19 | `panel.js:77-80,943-947,2163-2165` | 包 AGENTS 相关句（若有） |

### 9.4 完成后的预期状态

1. UI 规格只有 DESIGN.md 一份；catalog 是宿主令牌/图标/导出的唯一记录；[DNMS] 快照不存在。
2. nano-ui 0.2.0 不改写宿主 DOM、不自绘宿主已有组件；对话框只有两种承载；旧接口不存在。
3. 六个插件不嫁接宿主 DOM、不各写 `schemeOf`、不硬编码 z 与亮暗色值；例外都以 `nano-ui-exempt` 登记；P4-01、P9-05 若停止，以问答编号单列。
4. `check-client-rules` 覆盖六个使用方与 nano-ui；`check-ui-rules` 可随时给出警告报告但不阻塞。
5. 六份产物打进同一 nano-ui 版本，可从产物读出。

---

## 10. 收口（Definition of Done = 测试台账全 PASS 映射）

> 撰写时 0 项 PASS，状态全部 `未观察`。改成 `verified` 只能发生在对应四元组写进实施记录之后。

### 10.1 收口硬闸

1. 泛化后的导出检查在合入提交上不红（`NUE1117-T05`、`NUE1117-T06`）。
2. nano-ui 旧接口全部删除且未迁移插件仍可构建（`NUE1117-T17`）。
3. 终态全局扫描为 0，含 U5（`[class*=`）跨六个使用方与 nano-ui（`NUE1117-T30`）。
4. 收尾重建一致且只改 `lib/`（`NUE1117-T28`）。
5. 视觉核对（`NUE1117-T27a`–`e`）在 [业主] 授权后完成；未授权时整份 AP 不得标 `executed`。
6. P4-01 停止时 `NUE1117-T19` 为 `deferred`；P9-05 停止时单列问答编号。两者任一存在，整份 AP 最多标「除停止项外已完成」。

### 10.2 收口映射表

| 收口目标 | 工作项 | Test-ID | PASS 证据 | 状态 |
|----------|--------|---------|-----------|------|
| 规格唯一真源 | P1-01/P1-02 | T01 | 待执行 | `未观察` |
| 原则、模板、skill | P1-03/P1-04 | T02 | 待执行 | `未观察` |
| catalog 可重复、单一 | P2-01/P2-02 | T03 T04 | 待执行 | `未观察` |
| 导出检查泛化不红 | P2-03/P2-04 | T05 T06 | 待执行 | `未观察` |
| UI 检测只警告 | P2-05 | T07 | 待执行 | `未观察` |
| nano-ui 令牌、层级、主题 | P3-01..03 | T08 T09 T10 | 待执行 | `未观察` |
| 包装宿主组件 | P3-05..07 | T11 T12 T27a | 待执行 | `未观察` |
| 窗口覆盖层 | P3-08 | T13 | 待执行 | `未观察` |
| 新组件、版本、测试 | P3-04/P3-09..11 | T14 T15 T16 | 待执行 | `未观察` |
| 硬切兼容 | P3-12 | T17 | 待执行 | `未观察` |
| [DNMS] | P4 | T18 T19 | 待执行 | `未观察` |
| [DNEE] | P5 | T20 | 待执行 | `未观察` |
| [DNT] | P6 | T21 | 待执行 | `未观察` |
| [DNK] | P7 | T22 T27d | 待执行 | `未观察` |
| [DNCS] | P8 | T23 T24 | 待执行 | `未观察` |
| [DNN] | P9 | T25 T26 T27c | 待执行 | `未观察` |
| 收尾重建 | P10-01 | T28 | 待执行 | `未观察` |
| 文档、缺口、终态 | P10-02 | T29 T30 | 待执行 | `未观察` |
| 本机视觉 | P1–P9 | T27a–e | 待授权 | `未观察` |

### 10.3 Definition of Done

| 维度 | 完成定义 |
|------|----------|
| 功能 | §9.4 五条成立 |
| 测试 | §8 除 T27 外全部四元组 PASS；T27 授权后完成 |
| 文档 | DESIGN.md 唯一；退役清单三类落点清零 |
| 风险收敛 | 无旧接口调用；宿主缺口全部登记；停止项有问答编号 |
| 可交付性 | 10 个 worktree 按 [业主] 要求删除；无新 release-gate |

### 10.4 NOT-成功识别

- T17、T28 或 T30 为 `degraded`/`未观察` → 不得标 `executed`。
- T27 `未观察` 而其余全绿 → 状态最多为「代码已合并、视觉未核对」。
- T19 `deferred` → 不得声称「插件间 DOM 感知已全部消除」。
- 只有测试条数、没有负例名与四元组 → 按假绿处理。
- `test-all` 退出码 0 不关闭任何其他 Test-ID。

---

## 11. 执行日志回填

> 执行者：`Droid（主代理）+ worker 子代理（PH5–PH9 各一路，主代理审查后合并）`
> 执行时间：`2026-11-16 ~ 2026-11-17`（UTC 证据时间 2026-11-16T17:52Z – 20:19Z）
> 文档状态：`draft → executing → 除停止项外已完成（代码已合并、视觉未核对）`。按 §10.1 第 5、6 条与 §10.4，T27a–e `未观察`、T19 `deferred`（Q18）、P9-05 `deferred`（Q19），本文**不标 `executed`**。本节在 [业主] 发车指令 STEP.5 要求下提前回填，偏离本节原「非 executed 省略」的写法，见 todo §9。
> 代码改动统计：`9792da0..a85ec54` 共 103 文件（修改 54 / 新建 47 / 删除 1），+11178 / −4199；无 schema bump；nano-ui `0.1.0 → 0.2.0`（硬切，一次）
> 跟踪文件：[`todo.1117.md`](./todo.1117.md)（逐项证据四元组与 §9 偏差日志为本节明细真源）

- **实际执行摘要**：PH1（`09290dc`）DESIGN.md 唯一规格 + 仓根原则 + design skill；PH2（`860f34c`、`2c5af77`、`d2e2b47`）catalog 三件套、导出检查泛化、`check-ui-rules`；PH3（`12bb081`）nano-ui 0.2.0 硬切（包装宿主 Menu/Toast/SegmentedControl/Modal，ThemeScope，NANO_LAYER，窗口覆盖层，旧接口全删）；PH4 [DNMS]（`e52ef13`）；PH5 [DNEE]（`3cfd282`）；PH6 [DNT]（`c47b0eb`）；PH7 [DNK]（`18b30f4`）；PH8 [DNCS]（`28b8202`）；PH9 [DNN]（`81c90cc`）；PH10（`d7a6b6b`）文档终同步、T29/T30、六份产物重建；修正 T03（`a85ec54`）。每个 Phase 合并后回写 todo（`2c0ad72`…`7a2a24e`）。
- **Phase 偏差（计划 vs 实际）**：
  1. （substrate-fit）宿主主题快照方案字段在 `active.colorScheme`，主题变化只经 `ctx.on('theme/change')`；ThemeScope 收 `subscribe` 参数，DESIGN §3 回写。
  2. （substrate-fit）nano-ui 产物版本标记：模板注释被压缩掉，改 `src/version.js` 首行 legal comment（`e1b2a5a`）。
  3. （计划偏差）T06「test-all 退出 0」因既有 `packages/dsh-s3-client` 失败不可满足，全程按「除 s3-client 外全过」执行。
  4. （计划偏差）P3-12 diff 另含 DESIGN.md 回写（P3-05/P3-06 更具体要求）。
  5. （substrate-fit）PH8 [DNCS] 收起态展开改宿主 layout 服务，首版 `ctx.layout?.` 在未声明 inject 时会抛错，审查后改 `ctx.get('layout')`（`7ac0085`）。
  6. （substrate-fit）PH9 [DNN] `np-switch` 实为多段选择 → `SegmentedControl`（非 AP 写的 `Switch`）；`np-tip` → 宿主 `Tooltip` 不可行，原生 `title` + 豁免。
  7. （顺序调整）PH9 提交粒度：视图开关/图标门面/启动器提示并入 P9-01 提交，避免不可构建的中间提交。
  8. （顺序调整）PH10 lib 提交在未合并分支上重做一次，使 [DNK] buildId 对应最终源码 HEAD。
  9. （执行缺口）`test/scripts` 不在 `test-all` 内，PH4–PH9 未跑，T03 自 `e52ef13` 起红 1 条，PH10 终态总验发现并修正（`a85ec54`）。
  10. （计划偏差）[DNEE] 保留 4 处宿主属性锚点（非 `:has`/`[class*=`/哈希类），待 T27 视觉核对。
- **阻塞与处理**：
  1. P4-01：宿主无云会话判据 → 停止，问答 Q18（`807c357`），推荐 A，待 [业主]。
  2. P9-05：[DNN] 向宿主 `[data-changed-files]` 卡片注入 → 停止，问答 Q19（`9348347`），推荐 A，待 [业主]；T30 单列。
  3. T27a–e：需 live 部署与 [业主] 授权，未执行。
- **测试发现**：终态（`a85ec54`，2026-11-16T20:19:43Z）DNMS 62/62、DNEE 26/26、DNT 145/145、DNK 65/65、DNCS 39/39、DNN 90/90，均高于 N6 下限（54/12/137/56/24/80）；nano-ui 42/42；`test/scripts` 39/39；`test-all` 21/22（仅 s3-client）；`check-client-rules` ok。每个插件的 `nue-migration.test.mjs` 都对迁移前源码实跑过负控（DNMS 6 败、DNEE 10 败、DNT 5 败、DNK 6 败、DNCS 8 败、DNN 8 败）；T26 旧实现经 `NP_SRC`/`NANO_UI_SRC` 三文件各 ≥1 条 AssertionError、0 ENOENT；T29/T30 对照之前的树各 1 败。P3-12 预登记 [DNN] 6 条失败与实际集合相等，P9-04 后消解。`check-ui-rules` 573 → 339 条。
- **后续 handoff**：Q18/Q19 裁决（[业主]）；T27a–e live 视觉核对（[业主] 授权后）；宿主缺口（DESIGN §8 九项）待宿主提供后迁移；[DNK] 重复 `ref` 键、s3-client 既有失败不在本期。

### 11.1 逐工作项状态

| 工作项 | 状态 | PR | 实际落点（file:line） | 备注 |
|--------|------|----|------------------------|------|
| `P1-01..04` | `✅ done` | `7e423f5` / `a9bb0b5` | `docs/specs/dsh-nano-ui/DESIGN.md`；`AGENTS.md`「UI 宿主优先」；`docs/agents/skills/dsh-nano-design/SKILL.md` | T01/T02 |
| `P2-01..05` | `✅ done`（P2-04 🟩） | `9d4a536` / `04d148b` / `7f082d1` | `scripts/gen-nano-catalog.mjs`；`packages/dsh-nano-ui/catalog/*.json`；`scripts/check-client-rules.mjs`；`scripts/check-ui-rules.mjs` | T06 受 s3-client 既有失败 |
| `P3-01..04, 06, 07, 09..12` | `✅ done` | `44612c4` / `5ebd20d` / `a94f135` / `fbe31fb` | `packages/dsh-nano-ui/src/{layers,theme,theme-scheme,icons,toast,tabs,toolbar,empty,window,button,mount,version}.js` | T08–T10、T12、T14–T17 |
| `P3-05, P3-08` | `🟩 partial` | `44612c4` | `packages/dsh-nano-ui/src/{menu,overlay,dom}.js` | 交互仅契约层；T27a 未观察 |
| `P4-01` | `⚠️ deferred` | `807c357` | — | Q18 |
| `P4-02, P4-03` | `✅ done` | `faf9831` | `dsh-nano-model-selector/src/client/{index.jsx,styles.js,…}` | T18 |
| `P5-01..03` | `✅ done` | `42878d4` / `487eec6` | `dsh-nano-explorer-extra/src/client/{styles,menu,body,index,format}.js` | T20；4 处宿主属性锚点保留 |
| `P6-01, P6-02` | `✅ done` | `4659e49` | `dsh-nano-terminal/src/client/NanoTerm.jsx` | T21 |
| `P7-01..05` | `✅ done`（P7-04 视觉 🟩） | `35facad` / `a8b7c61` | `dsh-nano-kitesurf/src/client/index.js` | T22；T27d 未观察 |
| `P8-01..05` | `✅ done` | `95b2149` / `7ac0085` | `dsh-nano-cloud-session/src/client/{styles,index,section,settings-dialog,native-workbench,confirm,sidebar}.js` | T23/T24 |
| `P9-01..04` | `✅ done`（P9-01 视觉 🟩） | `e4757bc` / `f3f1c0b` / `16a8d14` / `4506137` / `0735193` | `dsh-nano-notepad/src/client/{panel,index,icons}.js`；`dsh-nano-notepad/test/*.test.mjs` | T25/T26；T27c 未观察 |
| `P9-05` | `⚠️ deferred` | `9348347` | `dsh-nano-notepad/src/client/panel.js:158-166,4766-4840`（保持原样） | Q19 |
| `P10-01..03` | `✅ done` | `196b6fd` / `1cc787c` / `d7a6b6b` | 六份 `lib/client.js`；`test/scripts/nue-{docs,endstate}.test.mjs` | T28–T30 |
| `T27a–e` | `⚠️ env-blocked No-Go` | — | — | 需 live 授权 |

### 11.2 关键指标演进

| 指标 | 基线（`9792da0` / PH2 首跑） | 终态（`a85ec54`） | Δ |
|------|---------------|---------------|---|
| `check-ui-rules` 警告总数 | 573（78 文件） | 339（94 文件） | −234 |
| U5 宿主 DOM 嫁接（六插件 + nano-ui） | DNEE 9、DNCS 31、nano-ui 5（共 45） | 0 | −45（P9-05 单列） |
| DNCS 警告 | 61 | 0 | −61 |
| 六插件测试条数 | 54/13/137/56/24/80 | 62/26/145/65/39/90 | +63 |
| nano-ui 测试 | 0 | 42 | +42 |

### 11.3 关键决策日志

#### Decision-1 — 停止项不在实现中裁决
- **背景**：P4-01、P9-05 均触及真相层未覆盖的范围问题。
- **决议**：按 AP §5.4 / P9-05 停止，问答 Q18、Q19 append-only，相关代码保持原样或不新增读取。
- **理由**：「不得擅自扩约」；AP 预先登记的停止点。
- **代价**：[DNMS] 在云会话中照常渲染；[DNN] 仍有一处 `:has()` 套宿主卡片。

#### Decision-2 — 子代理分 Phase 执行、主代理审查合并
- **背景**：PH5–PH9 每个插件面大、相互串行。
- **决议**：每 Phase 一路 worker 在独立 worktree 内实现并自测，主代理审 diff 后合并、回写 todo。
- **理由**：保持 DAG 串行与每 Phase 回写纪律。
- **代价**：PH8 首版缺陷（`ctx.layout`）靠审查拦下；PH4 起 `test/scripts` 漏跑由终态总验补救。

### 11.4 pre-existing 失败甩锅

| 失败项 | 证据（git / 命令） | 判断 |
|--------|---------------------|------|
| `packages/dsh-s3-client`（`# suites 0` / 3 cancelled） | PH2 之前的 `2c0ad72` 上 `node scripts/test-all.mjs` 同样失败；本期未改 `packages/dsh-s3-client/**`（`git diff --name-only 9792da0..a85ec54 -- packages/dsh-s3-client` 为空） | `pre-existing, non-blocking` |

### 11.5 文档状态

`draft → executing → 除停止项外已完成（2026-11-17，代码已合并、视觉未核对）`。
residual / follow-up → Q18、Q19 裁决；T27a–e live 核对；宿主缺口迁移（**不回填本阶段**）。
