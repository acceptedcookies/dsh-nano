# `1117` Action Todo — NUE-1117 nano-ui 增强与六插件原生化迁移

> 文档性质：`action-todo`（DAG-guided execution；不是新的设计或授权文件）
> 目标：按 [`NUE-1117-action-plan.md`](./NUE-1117-action-plan.md) 的 DAG 完成 Phase 1–10 的编码、测试与文档，分 Phase 提交并合入 `main`。
> In-scope：执行计划 §2.1 S1–S5（DESIGN.md 真源、catalog 与检测、nano-ui 0.2.0 硬切、六插件迁移、收尾重建）。
> Out-of-scope：执行计划 §2.2 O1–O6（PRE-1116 内容、[DNLS]/[DNMSC]、宿主侧改动、改 `test-all` 成员、[DNK] 重复 `ref` 键、新增 react/jsdom 依赖）。不改 `RELEASE.md`，不新增 release-gate，不推送远端。
> 上游依据：[`NUE-1117-qna-truth.md`](./NUE-1117-qna-truth.md)（21 条 FROZEN，勘误 E1–E16）；冲突时以 [`NUE-1117-qna.md`](./NUE-1117-qna.md) 为 provenance。
> 关联 action-plan：`docs/code-review/26-nov/NUE-1117-action-plan.md`
> authority / owner：[业主] 发车指令（本文 §8 附件）授权按 DAG 实施全部 Phase、在 `.agents/worktrees/nue-1117-*` 内工作并合入 `main`、合并后删除 worktree。停止点 P4-01 / P9-05 不在授权内自行裁决，回问答 append-only。
> 基线：`main` @ `9792da0`（PRE-1116 已合入：`94050b4`，满足 Phase 3 前置）。开工时工作区干净。
> 文档状态：`executing` · 执行状态：`in-progress`

## 1. 核心脊

- **目标与边界**：交付 DESIGN.md + catalog + 两个检测脚本 + nano-ui 0.2.0 + 六插件一次硬切 + 六份产物重建。宿主缺口只登记，不在插件里补。
- **权威与决策**：规则句只引用真相层 Truth-ID。真相层未覆盖的公共合同问题（P4-01 宿主云会话判据、P9-05 [DNN] 宿主对话卡片注入、宿主 Menu/Toast/Modal 签名不符）停在该项并回问答，不在 todo 里裁决。
- **完成定义**：§3 每个工作项 `[x]` 且有 commit + 测试四元组；停止项以 `deferred + 问答号` 单列；T27a–e 无 live 证据时保持 `未观察`，整份 AP 不标 `executed`；closure 与三路以上审查报告落盘。
- **证据原则**：PASS = `commit sha + argv/用例名 + 退出码/计数 + UTC`。「为 0」类断言写明扫描范围、文件数 > 0，并有正控夹具。条数低于 N6 下限即失败。`test-all` 退出码 0 不关闭其他 Test-ID。
- **执行回写**：每个 Phase 完成后立即回写本节 checkbox 与状态，不在收口时一次性勾完。
- **交接原则**：停止项写明问答编号、下一动作与承接方（[业主]）。

## 2. 依赖关系 / DAG

```text
P0-00 干净树（main@9792da0）
  └─▶ PH1 nue-1117-foundation  [P1-01 → P1-02 → P1-03 → P1-04]        ── merge main
        └─▶ PH2 nue-1117-catalog [P2-01 → P2-02 → (P2-03+P2-04 同提交) → P2-05] ── merge main
              └─▶ PH3 nue-1117-nano-ui [P3-01..P3-11 → P3-12 预登记 DNN 失败集合 → 跑测] ── merge main
                    │  （前置：PRE-1116 已在 main，✔ 94050b4）
                    └─▶ PH4 migrate-dnms [P4-01 停止判定 → P4-02 → P4-03] ── merge
                          └─▶ PH5 migrate-dnee [P5-01 → P5-02 → P5-03] ── merge
                                └─▶ PH6 migrate-dnt [P6-01 → P6-02] ── merge
                                      └─▶ PH7 migrate-dnk [P7-01..P7-05] ── merge
                                            └─▶ PH8 migrate-dncs [P8-01..P8-05] ── merge
                                                  └─▶ PH9 migrate-dnn [P9-01 → P9-02 → P9-03 → P9-04；P9-05 停止点] ── merge
                                                        └─▶ PH10 closeout [P10-01 lib 提交 → P10-02 docs 提交 → P10-03 删 worktree]
                                                              └─▶ LOG（回填 AP §11）→ CLOSURE → ≥3 路审查 → 修复环 → 更新 closure
```

| 节点 | depends on | entry | exit | failure / blocked |
|------|------------|-------|------|-------------------|
| PH1 | P0-00 | 树干净 | T01/T02 四元组；合入 main | 不合并，不开 PH2 |
| PH2 | PH1 合入 | DESIGN.md 在 main | T03–T07；泛化提交上 `test-all` 退出 0 | 泛化必红则同提交修复；修不了停 |
| PH3 | PH2 合入 + PRE-1116 合入 | catalog 在 main | T08–T17；`test-all`（不带 `--build`）退出 0；插件 `src/`、`lib/` 零改动 | 宿主签名不符 → 停在对应项回问答，不回退自绘 |
| PH4–PH9 | 前一个插件合入 | nano-ui 0.2.0 在 main | 各自 T18–T26；本插件 `npm run build`；`check-ui-rules` 计数 ≤ 基线 | P4-01 / P9-05 停止项不阻塞本插件其余部分合并 |
| PH10 | PH9 合入 | 六插件全部脱离窗口 | T28–T30；lib 提交只含 `lib/**` | 两次构建不一致 → 查原因，不删 buildId |

**顺序注记**：严格线性。硬切窗口（`T15`）内未迁移插件不从 `main` 重建；每个迁移合并说明写「本插件已脱离窗口」。若 nano-ui 在迁移 worktree 内需要改动：同 worktree 先提交 nano-ui（行为变化递增补丁版本 + CHANGELOG），再提交插件（`T10`）。

## 3. 工作项清单

### PH0

- [x] `P0-00` — 确认工作树干净
  - **完成判据**：`git status --short` 为空；`main` 已含 PRE-1116 合并
  - **执行状态**：`complete` · **执行时间**：`2026-11-17` · **证据**：`main@9792da0`，`git status` 空；`94050b4` 为 PRE-1116 合并提交

### PH1 — 规格与原则基座（`nue-1117-foundation`）

- [x] `P1-01` — 新建 `docs/specs/dsh-nano-ui/DESIGN.md`（章节、令牌、层级与间距、承载模型、组件清单、U1–U10、宿主缺口）
  - **验证映射**：`NUE1117-T01` · **执行状态**：`complete` · **证据**：`7e423f5`（合并 `09290dc`）· `node --test test/scripts/nue-docs.test.mjs` 7/7 pass · 2026-11-16T17:52:21Z（T01 四条：章节/组件/U1–U10/缺口；禁词扫描含正控）。另含 §7 宿主接口解码（Menu `anchor` 为 ReactNode + `getAnchorRect`；Toast `onDone` 必填、无不自动结束；Modal 宽度写死 → 预设尺寸并登记缺口）
- [x] `P1-02` — README 降为入口页（`:80-115` 删除不迁移）
  - **验证映射**：`NUE1117-T01` · **执行状态**：`complete` · **证据**：同上；软链 realpath 相同
- [x] `P1-03` — 仓根原则 + TEMPLATE + INTRODUCTION `:393,:403`
  - **验证映射**：`NUE1117-T02` · **执行状态**：`complete` · **证据**：同上；仓根新增「UI 宿主优先」一条（`T01` 转写，不扩约）
- [x] `P1-04` — `docs/agents/skills/dsh-nano-design/SKILL.md`
  - **验证映射**：`NUE1117-T02` · **执行状态**：`complete` · **证据**：同上；遍历全部 package.json `files` 无该路径

### PH2 — catalog 与检测（`nue-1117-catalog`）

- [x] `P2-01` — `scripts/gen-nano-catalog.mjs`（取代并删除 `gen-primitives-exports.mjs`）
  - **验证映射**：`NUE1117-T03` · **执行状态**：`complete` · **证据**：`9d4a536`（合并 `860f34c`）· `node --test test/scripts/*.test.mjs` 31/31 · 2026-11-16T18:03:12Z；两次生成剔除 `generated` 后 sha256 相同（primitives `6b43fc3a…`、icons `0aabb54d…`、tokens `0fbe1391…`），且等于入库版本
- [x] `P2-02` — catalog 三件套入库；与旧快照一次性比对；删除 [DNMS] 快照
  - **验证映射**：`NUE1117-T03` `NUE1117-T04` · **执行状态**：`complete` · **证据**：同上；rc.1 311 / rc.3 321 与旧快照逐项相等（写入合并说明）；tokens 437（1 个模板前缀、7 个 runtime 项）；旧快照与旧脚本删除，八个目录字面量 0
- [x] `P2-03` — `check-client-rules` 规则 2 泛化（六使用方 + nano-ui，多种导入形式，`--root`）
  - **验证映射**：`NUE1117-T05` · **执行状态**：`complete` · **证据**：`9d4a536` · T05 12 条（六种形式、nano-ui、部分缺失、catalog 缺失、空扫描、默认扫描根）全过；主树 78 文件 / 136 个名字
- [x] `P2-04` — 修复泛化暴露的问题（与 P2-03 同一提交）
  - **验证映射**：`NUE1117-T06` · **执行状态**：`partial` · **证据**：`9d4a536` 修正 7 个不存在图标名（DNT 6、DNK 1，详见提交说明）；`node scripts/test-all.mjs` @9d4a536 20/21，exit 1，唯一失败 `packages/dsh-s3-client`（3 cancelled），@2c0ad72 同样失败 · 2026-11-16T18:03:23Z。T06 字面「退出码 0」因既有 s3-client 失败无法满足，见 §9
- [x] `P2-05` — `scripts/check-ui-rules.mjs`（只警告，不进 `test-all`），首跑基线
  - **验证映射**：`NUE1117-T07` · **执行状态**：`complete` · **证据**：`04d148b` · T07 5 条全过；基线 78 文件 573 条警告（按插件 × 规则的表在合并说明 `860f34c`）
- 附：`a9bb0b5`（合并 `2c5af77`）修正 PH1 的 T02 测试，只扫已跟踪 package.json（主树未跟踪 `context/` 含断开软链导致 ENOENT）

### PH3 — nano-ui 0.2.0 硬切（`nue-1117-nano-ui`）

- [ ] `P3-01` — 令牌错名、十六进制回退、`[class*=` 清零 · `NUE1117-T08`
- [ ] `P3-02` — `layers.js`（NANO_LAYER + 间距） · `NUE1117-T09`
- [ ] `P3-03` — ThemeScope（`theme-scheme.js` + `theme.js`） · `NUE1117-T10`
- [ ] `P3-04` — 图标门面 `icons.js` · `NUE1117-T14`
- [ ] `P3-05` — NanoMenu / openNanoMenu 包装宿主 `Menu` · `NUE1117-T11`
- [ ] `P3-06` — NanoToast 包装宿主 `Toast` · `NUE1117-T12`
- [ ] `P3-07` — NanoTabs / nanoTabs 改宿主 `SegmentedControl` · `NUE1117-T12`
- [ ] `P3-08` — 窗口覆盖层 + openNanoDialog 两条路径；删除 MutationObserver/`region`/`theme`/`z`/`--nano-dlg-*` · `NUE1117-T13`
- [ ] `P3-09` — Toolbar / EmptyState / FloatingWindow / IconButton / mountNano · `NUE1117-T14`
- [ ] `P3-10` — 0.2.0 + `VERSION` + CHANGELOG + 产物版本标记 · `NUE1117-T15`
- [ ] `P3-11` — nano-ui 包内测试（`test` 脚本） · `NUE1117-T16`
- [ ] `P3-12` — 硬切兼容核对（导入名、六套件条数、[DNN] 预登记失败集合、diff 只在 nano-ui） · `NUE1117-T17`
  - **依赖（整组）**：PH2 合入 + PRE-1116 合入 · **执行状态**：`not-started`

### PH4 — [DNMS]（`nue-1117-migrate-dnms`）

- [ ] `P4-01` — 云会话自判（宿主公开判据核实；无判据即停、回问答） · `NUE1117-T19`
- [ ] `P4-02` — 区域收束退役（主窗口级 Modal；包 AGENTS 约束第 1 条删除） · `NUE1117-T18`
- [ ] `P4-03` — `Tag`/`Switch`/`SegmentedControl`、删未用 Tooltip、Toast 带 `anchor` · `NUE1117-T18`
  - **依赖**：PH3 合入 · **执行状态**：`not-started`

### PH5 — [DNEE]（`nue-1117-migrate-dnee`）

- [ ] `P5-01` — `:has()` 退役（文件树状态钩子登记宿主缺口） · `NUE1117-T20`
- [ ] `P5-02` — `.nxe-menu*` 死样式、三处页签 → `SegmentedControl`、宿主 Menu · `NUE1117-T20`
- [ ] `P5-03` — ThemeScope、对话框探测去 `[class*=`、Toast `anchor`、`format.js` 条件替换 · `NUE1117-T20`
  - **依赖**：PH4 合入 · **执行状态**：`not-started`

### PH6 — [DNT]（`nue-1117-migrate-dnt`）

- [ ] `P6-01` — trajCls → nano-ui `Toolbar` · `NUE1117-T21`
- [ ] `P6-02` — 死样式（U8 确认）与 unicode 图标 → `Icon*` · `NUE1117-T21`
  - **依赖**：PH5 合入 · **执行状态**：`not-started`

### PH7 — [DNK]（`nue-1117-migrate-dnk`）

- [ ] `P7-01` — 图标与过期注释 · `NUE1117-T22`
- [ ] `P7-02` — 未定义类（U9 = 0） · `NUE1117-T22`
- [ ] `P7-03` — ThemeScope、菜单窗口内 · `NUE1117-T22`
- [ ] `P7-04` — 设置对话框改窗口覆盖层（`container`） · `NUE1117-T22`
- [ ] `P7-05` — 交互 Toast 改宿主 Toast `actions`；页签跟随 · `NUE1117-T22`
  - **依赖**：PH6 合入 · **执行状态**：`not-started`

### PH8 — [DNCS]（`nue-1117-migrate-dncs`）

- [ ] `P8-01` — 删 composer 隐藏样式与卡片 `:has` · `NUE1117-T23`
- [ ] `P8-02` — composer 嫁接与 Devin 标签整段删除（登记「云会话标识」缺口） · `NUE1117-T23`
- [ ] `P8-03` — section 哈希类改宿主 primitive + 令牌 · `NUE1117-T23`
- [ ] `P8-04` — `window.confirm` → `RiskConfirmation` / `NanoDialog danger`；`mayTerminate` · `NUE1117-T23` `NUE1117-T24`
- [ ] `P8-05` — 设置页签改 React `NanoTabs` · `NUE1117-T23`
  - **依赖**：PH7 合入 · **执行状态**：`not-started`

### PH9 — [DNN]（`nue-1117-migrate-dnn`）

- [ ] `P9-01` — 对话框：窗口覆盖层 + 主窗口级 · `NUE1117-T25`
- [ ] `P9-02` — 菜单与层级：`container`、删 `NP_PORTAL_Z` · `NUE1117-T25`
- [ ] `P9-03` — 控件、图标、色值、ThemeScope · `NUE1117-T25`
- [ ] `P9-04` — 三个合同测试改写（`NANO_UI_SRC`/`NP_SRC` 可覆盖，旧实现上失败） · `NUE1117-T26`
- [ ] `P9-05` — 宿主对话卡片注入：停止点，回问答，不改 · `—`
  - **依赖**：PH8 合入 · **执行状态**：`not-started`

### PH10 — 收口（`nue-1117-closeout`）

- [ ] `P10-01` — 六份 `lib/client.js` 重建（同 HEAD 两次构建 sha 一致；版本标记；只改 `lib/`） · `NUE1117-T28`
- [ ] `P10-02` — 文档终同步 + 宿主缺口终表 + 终态扫描 · `NUE1117-T29` `NUE1117-T30`
- [ ] `P10-03` — 删除 `nue-1117-*` worktree 与分支
  - **依赖**：PH9 合入 · **执行状态**：`not-started`

### POST — 日志、closure、审查

- [ ] `POST-01` — 工作日志按 `code-execution-log` 模板回填 AP §11
- [ ] `POST-02` — closure（`docs/code-review/26-nov/NUE-1117-closure.md`）
- [ ] `POST-03` — ≥3 路审查（真相层对账 / 工作完成度 / 防假绿与防侧载），PROMPT 与报告落 `.anote/reviews/NUE/1117/`
- [ ] `POST-04` — 汇总、核实、修复，测试↔修复循环，更新 closure

## 4. 验收与证据

| Check ID | 验证什么 | 方法 | 实际结果 | 状态 |
|----------|----------|------|----------|------|
| `NUE1117-T01`–`T02` | 规格与原则 | `node --test test/scripts/nue-docs.test.mjs` | 7/7 @2c5af77 | pass |
| `NUE1117-T03`–`T07` | catalog 与检测 | `node --test test/scripts/{gen-nano-catalog,check-client-rules,check-ui-rules}.test.mjs`；`test-all` | 31/31 @2c5af77；test-all 20/21（s3-client 既有失败） | pass（T06 partial） |
| `NUE1117-T08`–`T17` | nano-ui 0.2.0 | `cd packages/dsh-nano-ui && npm test`；六套件；`test-all` | — | pending |
| `NUE1117-T18`–`T26` | 六插件迁移 | 各插件测试 + `nue-migration.test.mjs` | — | pending |
| `NUE1117-T27a`–`e` | 视觉核对（live） | 本机 profile + ego-browser 截图 | — | pending（需 live 授权与部署） |
| `NUE1117-T28`–`T30` | 收口 | 两次构建 sha；`nue-docs`/`nue-endstate` | — | pending |

## 5. 当前状态与交接

- **当前节点 / 已完成**：P0-00、PH1、PH2
- **下一动作**：PH3
- **当前阻塞**：无
- **待 owner 决定**：P4-01、P9-05（执行到时判定是否触发停止）
- **最终交接目标**：[业主]

## 6. 已启用插件

#### `P-SCOPE` — 写面限制

- Phase 3 只改 `packages/dsh-nano-ui/**`；Phase 4–9 只改本插件 + 必要的 nano-ui 补丁提交 + DESIGN.md 缺口登记；Phase 10 lib 提交只含 `dsh-nano-*/lib/**`。
- 禁止面：§7.2 反例 ⛔1–⛔16。

#### `P-TEST` — 测试台账

- 以 AP §8 为准；四元组写进本节 §3 各项证据与合并说明。

#### `P-EXEC` — 执行日志

- 偏差与实际证据追加在 §9；最终回填 AP §11。

#### `P-CLOSE` — closure

- closure 落 `docs/code-review/26-nov/NUE-1117-closure.md`。发车指令 STEP.6 写的是 `PRE-1116-closure.md`，该文件是已落盘的 PRE-1116 closure，覆盖会毁掉它；按工作项目编号落到 NUE-1117 名下，偏差登记于 §9。

## 9. 执行偏差日志（append-only）

- `2026-11-17` · 发车 STEP.6 的 closure 路径写作 `PRE-1116-closure.md`，按工作项目改落 `NUE-1117-closure.md`（避免覆盖 PRE-1116 closure）。
- `2026-11-17` · AP §7.0 N3 写「[DNEE] 无 `test` 脚本」；当前 `main` 上 [DNEE] `package.json` 已有 `"test": "node --test test/*.mjs"`（PRE-1116 引入 `bundle-smoke.test.mjs`），[DNEE] 已在 `test-all` 内。本 todo 照常以 `node --test` 显式跑并记条数，不改 `test-all` 成员。
- `2026-11-17` · T06 要求 P2-03 提交上 `test-all` 退出 0；`packages/dsh-s3-client` 在 PH2 之前的 `2c0ad72` 上已失败（3 cancelled），属范围外既有问题，未修。本计划后续所有「test-all 退出 0」判据按「除 s3-client 外全过」执行并如实记录。
- `2026-11-17` · catalog tokens 口径：`--dsh-font-family-` 是主题 JS 模板前缀，保留为条目并标 `prefix:true`；7 个由宿主 JS 运行时写入的名字标 `runtime:true`（含 `--dsh-hairline-width`、`--dsh-font-family-code`），U1 以 catalog 存在性判定，无需另立白名单。

## 8. 附件：[业主] 发车指令（原文）

> 本 directive 注册为 `NUE-1117` 执行授权来源。

```text
# 工作范围与目标
仓库与分支: dsh-nano / main
目标: 按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作

## 本次工作涉及的编号
| 工作插件 | 工作波次 | 工作项目 | 子项阶段 |
|-------|-------|-------|-------|
| `NUE` | N/A | `1117` | N/A |

---
## 原则
WARN#1 - 开始 `编码` 执行前, 必须保证工作树干净。如果工作树中有未保存的内容, 你会对内容进行分析, 然后在当前分支下完成 commit
WARN#2 - `业主授权`: 必须阅读 AGENTS.md 对应文档的指导下进行工作
WARN#3 - 每一个 [执行计划] 中的 Phase 完成后, 你需要回到 todo.{工作项目}.md 中, 更新 checkbox 并登记执行状态, 不得在所有工作完成后一次性 tick 全部的 boxes
INFO#1 - 必须按照 [执行计划] 中的 DAG 中明确要求, 构建执行顺序。在构建 todo 文档的时候, 必须严格进行顺序 block 限制
INFO#2 - 工作波次是可选项。如果存在, 则下面的对应目录层级可以增加。如果没有指定, 则忽略这个层级
INFO#3 - 代码审查子代理的的 `专用审查PROMPT` 以及审查产出的 review 报告, 需要落盘于 [.anote/reviews/{工作阶段}/{工作项目}] 文件夹
INFO#4 - 按照 [执行计划], 在 `业主授权` 规范下, 有权对 workers 集群进行 live migration + rebuild + deploy , 并授权你在当前 `工作阶段` + `工作项目` 的框架内完成 digest 的创建与 SSOT 建立

---
## 上游必读文件
最终执行计划: [docs/code-review/26-nov/NUE-1117-action-plan.md]
真相层: [docs/code-review/26-nov/NUE-1117-qna-truth.md]

---
## 工作方法
STEP.0 - 在 [执行计划] 位于的目录内, 在 `todo计划模板` 规范下创建 todo.{工作项目}.md 这个跟踪对象, 以 DAG + checkbox 的创建任务执行的跟踪文件. 你会将本次发车的完整指令, 作为附件, 注入在 todo 文档底部
STEP.1 - 重新拉取本阶段使用的全部上游必读文件, 并对工作区域的代码进行梳理, 从结构上理解当前工作区域的性质, 业务流转的方向, 建立对当前业务的横向层面认知
STEP.2 - 在建立横向认知后, 对重点代码的 git 历史进行回溯, 建立起从时间轴纵向上, 对焦点代码的历史沿革的认知。创建对 git HASH 映射关系的图谱
STEP.3 - 从横向和纵向上建立执行关系后, 判断是否存在对应的 reference-anchor, 是否拥有正例/反例可供参考, 是否在 context/ 内存在对应的参考系可以进行借鉴
STEP.4 - 在获得全部上下文后, 你会严格在 [工作目标] 的范围内, 按照 [执行计划] 中的详细要求, 进行完整, 完全的代码开发, 静态审查, 以及测试收口工作。在执行期间内每完成一个 Phase, 就对当前阶段对应的代码完成分组 commit
STEP.5 - 全部编码工作完成后, 使用 `工作日志模板` 创建 [工作日志] 并回填至 [执行计划] 文档的底部
STEP.6 - 按照 todo 中的安排, 完成全部的工作后, 按照 `closure模板` 要求, 输出本阶段 closure 文件至 docs/code-review/26-nov/PRE-1116-closure.md
STEP.7 - 你会定制不少于3路从 **真相层对账**, **工作完成度**, **防测试假绿,防业务侧载** 等工作面的审查子代理, 对当前 todo 内已完成工作内容进行深度审查。审查开始前, 请为每一路子代理, 定制其专用的 Comprehensive 进攻性 `专用审查PROMPT`, 以便让子代理载入本次工作的 [执行计划] 后, 对我们本次执行展开深度, 专注, 全面地展开工作质量与数量的全面回顾
STEP.8 - 回收子代理的代码审查报告, 在汇聚, 分析, 整理, 核实全部子代理的分析后, 执行更新或修复。修复完成后再次进入 测试↔修复 循环, 直至完成本工作项目的收口。并更新 closure 文件

---
## 使用到的模板
`closure模板` = [.adocs/templates/closure.md]
`工作日志模板` = [.adocs/templates/code-execution-log.md]
`todo计划模板` = [.adocs/templates/action-todo.md]

---
# 发车指令
基于我的上述要求, 请立刻按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作
> Step.0 中的 todo 需要保留完整业主发车指令, 并注册本 directive
> 界定好边界后，业主建议你在 AGENTS.md 引导下，构建专用 worktree，并在独立工作树内，适当派发子代理进行同步工作
```
