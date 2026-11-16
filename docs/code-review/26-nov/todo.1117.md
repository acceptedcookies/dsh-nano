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

- [x] `P3-01` — 令牌错名、十六进制回退、`[class*=` 清零 · `NUE1117-T08`
  - **执行状态**：`complete` · **证据**：`44612c4`/`5ebd20d`（合并 `12bb081`）· `cd packages/dsh-nano-ui && npm test` 41/41 @a94f135 · 2026-11-16T18:20:36Z；tokens.test 5 条（catalog 缺失即失败、未知令牌 0、六错名 0、hex 0、`[class*=` 0、正控夹具各报 1）；check-ui-rules nano-ui U1/U5 = 0
- [x] `P3-02` — `layers.js`（NANO_LAYER + 间距） · `NUE1117-T09`
  - **执行状态**：`complete` · **证据**：同上；layers.test 4 条（menu 1100 > 1000、1200/1210、`z-index`/`zIndex` 只在 layers.js + 正控、DESIGN §4 同值）
- [x] `P3-03` — ThemeScope（`theme-scheme.js` + `theme.js`） · `NUE1117-T10`
  - **执行状态**：`complete` · **证据**：同上；theme.test 5 条（light/dark/未知/缺失/抛错 × pin 同异；注入值逐项等于 catalog schemes；dispose 路径）。宿主快照方案字段实为 `active.colorScheme`，见 §9
- [x] `P3-04` — 图标门面 `icons.js` · `NUE1117-T14`
  - **执行状态**：`complete` · **证据**：同上；exports.test 5 条（sprite/Icon* 名称校验单测、nano-ui 引用 Icon* 全在 catalog）；`node scripts/check-client-rules.mjs` ok，91 文件 / 144 名（扫描根含 `packages/dsh-nano-ui/src`）
- [x] `P3-05` — NanoMenu / openNanoMenu 包装宿主 `Menu` · `NUE1117-T11`
  - **执行状态**：`partial` · **证据**：同上；menu.test 7 条。宿主 Menu 签名本机解码与 DESIGN 一致，未触发停止；DESIGN §6.2 回写（`a94f135`）。T27a（Modal 内菜单可见）未观察 → 按 AP §8.4 最多 `partial`
- [x] `P3-06` — NanoToast 包装宿主 `Toast` · `NUE1117-T12`
  - **执行状态**：`complete` · **证据**：同上；components.test。宿主 `anchor` 可省 → 未传 anchor 照常渲染；契约「holdMs 定寿命、text 作 key 重挂」写入 DESIGN §6.2/§7
- [x] `P3-07` — NanoTabs / nanoTabs 改宿主 `SegmentedControl` · `NUE1117-T12`
  - **执行状态**：`complete` · **证据**：同上；components.test（两种形态都用 SegmentedControl，`{ el, select, value }` 保留，`.nano-tab` 0）
- [x] `P3-08` — 窗口覆盖层 + openNanoDialog 两条路径；删除 MutationObserver/`region`/`theme`/`z`/`--nano-dlg-*` · `NUE1117-T13`
  - **执行状态**：`partial` · **证据**：同上；overlay.test 5 条（useModalLayer 顶层、无 body portal/MutationObserver/parentElement、container 缺失抛错、两条承载、`pointer-events: auto`）。交互（Esc/焦点/LIFO）只有契约层证据，T27 未观察 → `partial`
- [x] `P3-09` — Toolbar / EmptyState / FloatingWindow / IconButton / mountNano · `NUE1117-T14`
  - **执行状态**：`complete` · **证据**：同上；exports.test（index 导出全部新名、react-free 模块逐个 typeof、IconButton aria-label 检查）
- [x] `P3-10` — 0.2.0 + `VERSION` + CHANGELOG + 产物版本标记 · `NUE1117-T15`
  - **执行状态**：`complete` · **证据**：同上；version.test 4 条（'0.2.0' 写死、files 含 catalog、NANO_STYLES 首行注释、Removed 12 个关键词）；esbuild 冒烟打包 39.0kb，`dsh-nano-ui@` 1 处，tokens.json 只保留 `schemes`
- [x] `P3-11` — nano-ui 包内测试（`test` 脚本） · `NUE1117-T16`
  - **执行状态**：`complete` · **证据**：`node scripts/test-all.mjs` @a94f135 · 2026-11-16T18:20:36Z 输出 `PASS  packages/dsh-nano-ui`，该套件 41 条
- [x] `P3-12` — 硬切兼容核对（导入名、六套件条数、[DNN] 预登记失败集合、diff 只在 nano-ui） · `NUE1117-T17`
  - **执行状态**：`complete` · **证据**：预登记 `fbe31fb`（早于跑测）；`node --test dsh-nano-notepad/test/*.test.mjs` @a94f135 80 条 74 过 6 败，失败集合与清单逐项相等；DNMS 54/54、DNT 137/137、DNK 56/56、DNCS 24/24、DNEE 13/13；legacy.test 导入名全在新导出；`test-all` exit 1，PASS 21，FAIL 仅 s3-client（§9）。diff 另含 DESIGN.md（§9）
  - **依赖（整组）**：PH2 合入 + PRE-1116 合入 · **执行状态**：`complete`（P3-05/P3-08 `partial`，待 T27）

### PH4 — [DNMS]（`nue-1117-migrate-dnms`）

- [x] `P4-01` — 云会话自判（宿主公开判据核实；无判据即停、回问答） · `NUE1117-T19`
  - **执行状态**：`deferred`（问答 `Q18`，`807c357`）· **证据**：宿主 `SessionHeader`（`dsh-session` `types.d.ts:60-100`）与 `CreateSessionOptions.meta` 只有 `cwd/parentSession/isSeeded/origin:'subagent'/delegationDepth/agentPreset` 等字段，无来源/carrier/remote；[DNCS] 以 `ctx.sessions.create(undefined,{meta:{cwd}})` + `agents.enter(fake)` 投影，宿主侧为普通本地会话，唯一差异值 `model.current().provider='devin'` 由 [DNCS] 写入，不算宿主合同 → 按 §5.4 子步骤 4 停止。未读 `html[data-dncs-cloud]`、未建插件间约定。防侧载守卫断言（[DNMS] `src/` 无 `dncs`/`data-dncs-cloud`/`dncsCloud`）落 `test/nue-migration.test.mjs`；`isCloudSession` 用例待 Q18 裁决
- [x] `P4-02` — 区域收束退役（主窗口级 Modal；包 AGENTS 约束第 1 条删除） · `NUE1117-T18`
  - **执行状态**：`complete` · **证据**：`faf9831`（合并 `e52ef13`）；删 `index.jsx` 区域查询与 `regionElement`、测量 effect、`body > div:has(> .nms-hist-dialog)` 段；固定高度改 `NanoDialog fixedHeight: 560`（0.2.0 已无 `.nano-dialog-content`）；AGENTS 改「两个必须遵守的呈现约束」
- [x] `P4-03` — `Tag`/`Switch`/`SegmentedControl`、删未用 Tooltip、Toast 带 `anchor` · `NUE1117-T18`
  - **执行状态**：`complete` · **证据**：`faf9831`；`.nms-tag`→宿主 `Tag`（本机解码 tone 集合 neutral/info/success/warning/danger/outline/quiet/solid，catalog 徽标越界回落 neutral）、`.nms-switch`→`Switch`、场景页签→`SegmentedControl`、`NanoToast anchor={triggerRef.current}`、删 `.nms-root .nano-toast`。U1/U6 处理：未定义令牌换 catalog 令牌，数字 z-index 换 `--nano-layer-*`，`--dsh-composer-model-*-display`（宿主槽位合同变量）标 `nano-ui-exempt` 并登记 DESIGN §10
  - **测试四元组**：`e52ef13` · `cd dsh-nano-model-selector && npm test` · 62/62（≥54；新增 `nue-migration.test.mjs` 8 条，对照 main 源码 6 败 2 过，2 过为 T14/T19 回归守卫）· 2026-11-16T18:30:55Z；`node scripts/test-all.mjs` 21/22（仅 s3-client）；`cd packages/dsh-nano-ui && npm test` 42/42；`check-ui-rules` DNMS U1 3（已登记）/U2 0/U3 25/U4 1/U5 0/U6 0/U8 2/U9 5/U10 1，合计 37 ≤ 基线 62；`check-client-rules` ok；`lib/client.js` 含 `dsh-nano-ui@0.2.0` 1 处
  - **附**：`e1b2a5a` nano-ui 产物版本标记改为 `src/version.js` 首行 legal comment（见 §9）
  - **依赖**：PH3 合入 · **执行状态**：`complete`（P4-01 `deferred`，Q18）
### PH5 — [DNEE]（`nue-1117-migrate-dnee`）

- [x] `P5-01` — `:has()` 退役（文件树状态钩子登记宿主缺口） · `NUE1117-T20`
  - **执行状态**：`complete` · **证据**：`42878d4`（合并 `3cfd282`）；宿主文件树 `:has()` 行着色与几何改写整段删除，DESIGN §8「文件树状态钩子」缺口补写；`[class*="nxe-"]` 改 `data-nxe-card`；ghost 行失去删除线（缺口内）
- [x] `P5-02` — `.nxe-menu*` 死样式、三处页签 → `SegmentedControl`、宿主 Menu · `NUE1117-T20`
  - **执行状态**：`complete` · **证据**：`42878d4`；`nxe-branch-scope`/`nxe-repo-settings-scope`/`nxe-commit-filter` → `SegmentedControl`；`.nxe-menu*` 删除；`menu.js` 用 `NanoMenu portal:true`，删 `MENU_LAYER`；「在应用中打开」下拉同改 NanoMenu
- [x] `P5-03` — ThemeScope、对话框探测去 `[class*=`、Toast `anchor`、`format.js` 条件替换 · `NUE1117-T20`
  - **执行状态**：`complete` · **证据**：`42878d4` + `487eec6`（perf.js 过期注释）；`body.js` 用 `createThemeScope`（`index.js` 传 `theme: ctx.theme` 与 `onThemeChange`），`data-theme`→`data-nano-scheme`、`data-status`→`data-nxe-status`；Toast 带 `anchor`；`formatBytes` 与宿主 `fileSizeText` 14 个样本全部不同 → 保留并豁免；`.nxe-git-alert` 自绘豁免（宿主 Toast 无常驻模式）；DESIGN §10 +2 行
  - **测试四元组**：`3cfd282` · `cd dsh-nano-explorer-extra && node --test test/*.mjs` · 26/26（≥12；新增 `nue-migration.test.mjs` 13 条，对照 main 源码 10 败 3 过，3 过为结构守卫）· 2026-11-16T18:48:57Z；`node scripts/test-all.mjs` 21/22（仅 s3-client）；`check-ui-rules` DNEE 前 U1 19/U2 4/U3 16/U4 2/U5 9/U6 3/U8 24/U9 4/U10 0 → 后 0/0/15/2/0/0/0/0/2；`check-client-rules` ok；`lib/client.js` 含 `dsh-nano-ui@0.2.0`
  - **依赖**：PH4 合入 · **执行状态**：`complete`
### PH6 — [DNT]（`nue-1117-migrate-dnt`）

- [x] `P6-01` — trajCls → nano-ui `Toolbar` · `NUE1117-T21`
  - **执行状态**：`complete` · **证据**：`4659e49`（合并 `c47b0eb`）；`trajCls`/`trajCache`（运行时 `document.styleSheets` 哈希类反查）整段删除，状态栏根改 `Toolbar`，行内布局由本包 `.dnt-bar*` 承担（全部令牌）；`--dsh-trajectory-toolbar-height` 源码/产物 0；窗格头 4 个按钮去掉宿主类
- [x] `P6-02` — 死样式（U8 确认）与 unicode 图标 → `Icon*` · `NUE1117-T21`
  - **执行状态**：`complete` · **证据**：`4659e49`；U8 报出的 12 个类名真删（`dnt-statusbar*` 8 个、`dnt-dot`、`dnt-lane`、`dnt-overlay-retry`、`dnt-size-field`）；`⊕`/`⚙`/`?` 与两段内联 svg → `glyph()`（新增 `IconSearchOutlineRegular`，catalog 内）
  - **测试四元组**：`c47b0eb` · `cd dsh-nano-terminal && node test/run.mjs` · 145/145（≥137；含 `nue-migration.test.mjs` 8 条，对照 main 源码 3 过 5 败）· 2026-11-16T19:04:04Z；`node scripts/test-all.mjs` @4659e49 21/22（仅 s3-client）；`check-ui-rules --plugin DNT` 前 U1 10/U3 9/U4 8/U6 5/U8 12（44）→ 后 U1 6/U3 9/U4 4/U6 5/U8 0（24）；`check-client-rules` ok；`lib/client.js` 含 `dsh-nano-ui@0.2.0` 1 处；同 HEAD 重建无 diff
  - **依赖**：PH5 合入 · **执行状态**：`complete`
### PH7 — [DNK]（`nue-1117-migrate-dnk`）

- [x] `P7-01` — 图标与过期注释 · `NUE1117-T22`
  - **执行状态**：`complete` · **证据**：`35facad`（合并 `18b30f4`）；自绘 `arrowGlyph` svg → `IconChevronLeftOutlineRegular`/`IconChevronRightOutlineRegular`；注释改为新事实。源码中无自绘「查找」图标（§9）
- [x] `P7-02` — 未定义类（U9 = 0） · `NUE1117-T22`
  - **执行状态**：`complete` · **证据**：`35facad`；U9 5 → 0（`nks-tool-glyph`、`nks-dt-grow` 补规则；`nks-nav-toggle`、`nks-dom` 拆出独立选择器；删 `nks-primary` 引用）
- [x] `P7-03` — ThemeScope、菜单窗口内 · `NUE1117-T22`
  - **执行状态**：`complete` · **证据**：`35facad`；`schemeOf` 定义/`BrowserPane` 参数/菜单调用全删（全文件 0）；`createThemeScope({ theme: ctx.theme, element: workspace, subscribe: theme/change })`；视口菜单 `openNanoMenu({ container: workspaceRef.current })`，无 `theme`
- [x] `P7-04` — 设置对话框改窗口覆盖层（`container`） · `NUE1117-T22`
  - **执行状态**：`complete` · **证据**：`35facad`；`openNanoDialog({ container: workspaceEl, width: 420, fixedHeight: 560 })`，`workspaceEl` 为 `[data-nks-workspace]` 元素本身（React ref），删 `region`/`getBoundingClientRect`。T27d 未观察
- [x] `P7-05` — 交互 Toast 改宿主 Toast `actions`；页签跟随 · `NUE1117-T22`
  - **执行状态**：`complete` · **证据**：`35facad`；两种 Toast 合一 `NanoToast({ text, anchor, actions })`；删 `.nks-toast-fix`/`.nks-toast-btn` 与注释，`nano-toast` 字面量 0；`NanoTabs` 调用不变并加回归断言
  - **测试四元组**：`18b30f4` · `cd dsh-nano-kitesurf && npm test` · 65/65（≥56；含 `nue-migration.test.mjs` 9 条，对照 main 源码 3 过 6 败）· 2026-11-16T19:17:51Z；`node scripts/test-all.mjs` @a8b7c61 21/22（仅 s3-client）；`check-ui-rules --plugin DNK` 前 24/9/45/7/0/12/1/5/0（103）→ 后 22/7/44/7/0/11/1/0/0（92）；`check-client-rules` ok；`lib/client.js`（buildId `0.1.0+35facad`）含 `dsh-nano-ui@0.2.0` 1 处，同 HEAD 两次构建 sha256 相同；nano-ui 未改
  - **依赖**：PH6 合入 · **执行状态**：`complete`（T27d 未观察）
### PH8 — [DNCS]（`nue-1117-migrate-dncs`）

- [x] `P8-01` — 删 composer 隐藏样式与卡片 `:has` · `NUE1117-T23`
  - **执行状态**：`complete` · **证据**：`95b2149`（合并 `28b8202`）；composer 隐藏段 10 条、`[class*="list"]`、`.nano-dialog-card:has(...)` 6 条删除；设置 `width:720/fixedHeight:640`、新建 `width:560/fixedHeight:640`（预设档就近，§9）
- [x] `P8-02` — composer 嫁接与 Devin 标签整段删除（登记「云会话标识」缺口） · `NUE1117-T23`
  - **执行状态**：`complete` · **证据**：`95b2149`；`installCloudComposer` 与注册删除，`dncsCloud`/`dncsLocal` 读写 0，无替代挂载点（T17）；DESIGN §8「云会话 composer 按钮」「云会话标识」补删除事实
- [x] `P8-03` — section 哈希类改宿主 primitive + 令牌 · `NUE1117-T23`
  - **执行状态**：`complete` · **证据**：`95b2149`；用途→替代物：标题行→自有外壳 + `IconButton`；项目行→宿主 `DisclosureRow` + `Tag quiet`；会话行→`StateDot` + 宿主 `relativeTime` 分桶 + `Intl.RelativeTimeFormat` + `IconButton`；收起态→自有 `ResizeObserver`，展开→`ctx.get('layout').toggleSidebar()`（`7ac0085` 审查修复）；`withLocal`/`classOf`/`stripWide`/`readChrome`/`useNativeChrome` 等删除；DESIGN §8 新增「侧栏小节外壳」缺口
- [x] `P8-04` — `window.confirm` → `RiskConfirmation` / `NanoDialog danger`；`mayTerminate` · `NUE1117-T23` `NUE1117-T24`
  - **执行状态**：`complete` · **证据**：`95b2149`；中止、删除 profile → 宿主 `RiskConfirmation`（未勾选确认键禁用，handler 自拒）；归档 → `NanoDialog danger`，取消只清状态；`src/client/confirm.js` `mayTerminate`/`runTerminate`（react-free）；`test/confirm.test.mjs` 6 条攻击向量
- [x] `P8-05` — 设置页签改 React `NanoTabs` · `NUE1117-T23`
  - **执行状态**：`complete` · **证据**：`95b2149`；effect 内 DOM `nanoTabs` → React `NanoTabs`，`nanoTabs` 0
  - **测试四元组**：`28b8202` · `cd dsh-nano-cloud-session && node --test` · 39/39（≥24；`nue-migration` 9 条 + `confirm` 6 条，对照 main 源码 1 过 8 败；`ctx.layout` 用例对照 `95b2149` 6 过 3 败）· 2026-11-16T19:37:23Z；`node scripts/test-all.mjs` @7ac0085 21/22（仅 s3-client）；`check-ui-rules --plugin DNCS` 前 16/1/5/0/31/0/6/2/0（61）→ 后全 0；`check-client-rules` ok；`lib/client.js` 含 `dsh-nano-ui@0.2.0` 1 处，同 HEAD 两次构建 sha256 相同；nano-ui 未改
  - **依赖**：PH7 合入 · **执行状态**：`complete`（T27b/c 双层 Modal 观感未观察）
### PH9 — [DNN]（`nue-1117-migrate-dnn`）

- [x] `P9-01` — 对话框：窗口覆盖层 + 主窗口级 · `NUE1117-T25`
  - **执行状态**：`complete`（T27c 未观察）· **证据**：`e4757bc`（合并 `81c90cc`）；`.np-window` 与启动器各挂 `createThemeScope`（`pin` 取面板 `theme` 设置，`system` 交宿主），`index.js` 传 `theme: ctx.theme` 与 `theme/change` 订阅；非 viewport 对话框 `container: panel`，viewport 卡主窗口级；删 `theme: resolvedTheme()`/`z: NP_PORTAL_Z`/`handle.setTheme`/`region` 与 `[data-nano-theme]` 手抄调色板
- [x] `P9-02` — 菜单与层级：`container`、删 `NP_PORTAL_Z` · `NUE1117-T25`
  - **执行状态**：`complete` · **证据**：`f3f1c0b`；9 处 `openNanoMenu` 与斜杠菜单 `container: panel`，无 `theme`/`z`；`NP_PORTAL_Z` 及 11 处引用 0；`.np-layer` `z-index: var(--nano-layer-window)`，body 重挂保留；删 `.nano-menu-label:has(.np-fx-model-option)`，斜杠菜单改自有类
- [x] `P9-03` — 控件、图标、色值、ThemeScope · `NUE1117-T25`
  - **执行状态**：`complete` · **证据**：`16a8d14`（部分随 `e4757bc`）；`np-switch` → 宿主 `SegmentedControl`（§9）；`np-tip` 删除改原生 `title`+`aria-*`（豁免）；设置行对齐 `SettingsValueField` 解剖；`icons.js` 门面（sprite 无排版/窗口字形 → 豁免）；4 个未登记令牌换 catalog 名；DESIGN §10 +2 行
- [x] `P9-04` — 三个合同测试改写（`NANO_UI_SRC`/`NP_SRC` 可覆盖，旧实现上失败） · `NUE1117-T26`
  - **执行状态**：`complete` · **证据**：`4506137`；`portal-theme` 6、`z-order` 5、`dialog-layout` 4 条；旧实现（`d2e2b47` = `12bb081^1`）经 `NP_SRC`/`NANO_UI_SRC` 实跑：6/6、4/5、2/4 条 `AssertionError` 失败，0 ENOENT · 2026-11-16T20:13:24Z；预登记 6 条在新断言下消解，`dnn-expected-failures.json` 标 `resolvedBy: NUE-1117 P9-04`、`currentExpectedFailures: []`
- [x] `P9-05` — 宿主对话卡片注入：停止点，回问答，不改 · `—`
  - **执行状态**：`deferred`（问答 `Q19`，`9348347`）· **证据**：`panel.js` 样式 `:158-166`（`[data-changed-files]`、`:has(> .np-to-notepad)`）、注入 `attachNotepadCtas` `:4766-4828`、`MutationObserver` `:4833-4840`，保持原样；宿主 `ChangedFiles` 无动作座位；`check-ui-rules` 对该区 0 条（`:has()` 参数为 `np-` 自有类，U5 不报），T30 单列
  - **测试四元组**：`81c90cc` · `node --test dsh-nano-notepad/test/*.test.mjs` · 90/90（≥80；`nue-migration` 9 条，对照旧实现 1 过 8 败）· 2026-11-16T20:15:02Z；`cd packages/dsh-nano-ui && npm test` 42/42 同时；`node scripts/test-all.mjs` @4506137 21/22（仅 s3-client）；`check-ui-rules --plugin DNN` 前 12/18/100/18/0/17/11/12/0（188）→ 后 3/13/97/9/0/13/11/9/2（157，U10 2 条均已登记）；`check-client-rules` ok；`lib/client.js` 含 `dsh-nano-ui@0.2.0`，同 HEAD 两次构建 sha256 相同；nano-ui 源码未改
  - **依赖**：PH8 合入 · **执行状态**：`complete`（P9-05 `deferred`，Q19）
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
| `NUE1117-T08`–`T17` | nano-ui 0.2.0 | `cd packages/dsh-nano-ui && npm test`；六套件；`test-all` | 41/41 @a94f135；六套件 ≥ N6；DNN 失败 = 预登记 6 条；test-all 21/22（s3-client 既有） | pass（P3-05/P3-08 partial 待 T27） |
| `NUE1117-T18` | [DNMS] 迁移 | `npm test`（含 `nue-migration.test.mjs`） | 62/62 @e52ef13 | pass |
| `NUE1117-T19` | [DNMS] 云会话自判 | — | 宿主无判据，停止 | deferred（Q18） |
| `NUE1117-T20` | [DNEE] 迁移 | `node --test test/*.mjs`（含 `nue-migration.test.mjs`） | 26/26 @3cfd282 | pass |
| `NUE1117-T21` | [DNT] 迁移 | `node test/run.mjs`（含 `nue-migration.test.mjs`） | 145/145 @c47b0eb | pass |
| `NUE1117-T22` | [DNK] 迁移 | `npm test`（含 `nue-migration.test.mjs`） | 65/65 @18b30f4 | pass |
| `NUE1117-T23`–`T24` | [DNCS] 迁移 + 确认攻击向量 | `node --test`（含 `nue-migration`、`confirm`） | 39/39 @28b8202 | pass |
| `NUE1117-T25`–`T26` | [DNN] 迁移 + 合同测试改写 | `node --test dsh-nano-notepad/test/*.test.mjs`；旧实现经 `NP_SRC`/`NANO_UI_SRC` 实跑 | 90/90 @81c90cc；旧实现三文件各 ≥1 AssertionError | pass（P9-05 deferred Q19） |
| `NUE1117-T27a`–`e` | 视觉核对（live） | 本机 profile + ego-browser 截图 | — | pending（需 live 授权与部署） |
| `NUE1117-T28`–`T30` | 收口 | 两次构建 sha；`nue-docs`/`nue-endstate` | — | pending |

## 5. 当前状态与交接

- **当前节点 / 已完成**：P0-00、PH1、PH2、PH3、PH4（P4-01 deferred）、PH5、PH6、PH7、PH8、PH9（P9-05 deferred）
- **下一动作**：PH10（收口）
- **当前阻塞**：无
- **待 owner 决定**：Q18（P4-01，推荐 A）；Q19（P9-05，推荐 A）
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
- `2026-11-16` · PH3 前另起小合并 `d2e2b47`（`7f082d1`）：`gen-nano-catalog` 输出 `tokens.json#schemes.{light,dark}`（119 个随方案变化的 `--dsw-*` 终值），供 ThemeScope 注入；不属 nano-ui 目录，单独提交。
- `2026-11-16` · AP/DESIGN 原写 `theme.getTheme().colorScheme`；本机解码宿主快照为 `{ preference, active: { id, colorScheme, tokens }, … }`，方案在 `active.colorScheme`，主题变化只经 `ctx.on('theme/change')`、服务无订阅接口。ThemeScope 读 `active.colorScheme`（兼读扁平字段），收 `subscribe` 参数；DESIGN §3 回写。
- `2026-11-16` · P3-12 c) 要求 diff 只在 `packages/dsh-nano-ui/**`；P3-05 a)/P3-06 b) 要求把宿主签名结论写入 DESIGN.md。按更具体的后者执行，DESIGN 回写单独提交 `a94f135`。
- `2026-11-16` · 宿主 `Menu` 不暴露列表 style，`width` 用列表内零高占位元素实现最小宽度，`maxHeight` 用预设档类（能否压过宿主列表上限待 T27e 视觉核对，已在 DESIGN §6.2 标注）。
- `2026-11-16` · P3-10 的产物版本标记：`NANO_STYLES` 的 `/* dsh-nano-ui@${VERSION} */` 在 esbuild 压缩后只剩 `dsh-nano-ui@${x}`，T28 的 `grep 'dsh-nano-ui@<版本>'` 必然为 0（PH3 冒烟只检了前缀）。PH4 worktree 内先提交 nano-ui `e1b2a5a`：`src/version.js` 首行加 legal comment `/*! dsh-nano-ui@0.2.0 */`（压缩产物原样保留），`VERSION` 仍是字面量，version.test 断言二者一致。运行时行为不变，未升版本。
- `2026-11-16` · worktree 内若把主树 `node_modules` 整目录软链进来，`file:` 依赖（`dsh-nano-ui -> ../../packages/dsh-nano-ui`）会按主树真实路径解析，构建打进的是主树 nano-ui。PH4 起，需要构建的插件在 worktree 内建实目录 `node_modules`，逐项复制相对软链、外部包用绝对软链；PH4 产物已按此重建。
- `2026-11-16` · P4-01 停止（Q18）。P4-03 的 U1 中 3 条 `--dsh-composer-model-*-display` 是宿主 `conversation.input.model` 槽位合同变量（`dsh-client-ui-conversation` `slots.d.ts:415`），catalog 只收 `--dsw`/主题令牌，按「豁免并登记」处理（DESIGN §10 第一行），不改 catalog 口径。
- `2026-11-16` · PH5 [DNEE]：保留 4 处宿主属性锚点（`styles.js:14` `[data-nxe] .nxe-tree button`、`:15` `[data-files-path]`、`:55` `[data-custom-tree] {height:auto}`、`:199` `[data-custom-tree] button:hover .nxe-open`，宿主无行悬停钩子）。它们不是 `:has()`/`[class*=`/哈希类，不在 T20 清零清单，留待 T27 视觉核对与 closure 列出。
- `2026-11-16` · PH5 [DNEE]：`formatBytes` 与宿主 `fileSizeText` 14 个样本全部不同，按 P5-03「条件替换」保留并标 `nano-ui-exempt`；`.nxe-git-alert` 因宿主 Toast 无常驻模式保留自绘并豁免，材质随令牌改变。DESIGN §10 各 1 行。
- `2026-11-16` · PH5 [DNEE]：「在应用中打开」下拉原为自绘菜单，与 P5-02 同一类问题，一并改 NanoMenu（同写面，不扩约）。- `2026-11-16` · PH6 [DNT]：`test/run.mjs` 原无测试发现机制，新增第 13 段用 `node --test` 收集 `test/*.test.mjs` 并计入总数（崩溃且无摘要计 1 败）；N6 下限 137 指 wasm 冒烟部分，合计 145。
- `2026-11-16` · PH6 [DNT]：`⌘`/`→` 是 `ShortcutKeys` 按键图例文本，非图标，保留（U4 剩 4）；原生 `<button>` 保留（U3 9 持平，窗格头 20px 密度宿主 Button 无对应档，AP P6 未列 U3）；`?` 帮助按钮随同族换 `glyph('help')`。- `2026-11-16` · PH7 [DNK]：AP P7-01 提到的「查找」自绘图标在源码中不存在，只替换前进/后退箭头；P7-02 实际 U9 为 5 条（扫描器把 compound 选择器第二个类计为引用），全部清零；lib 产物在源码提交 `35facad` 上构建，buildId 对应源码提交，PH10 统一重建。- `2026-11-16` · PH8 [DNCS]：子代理首版用 `ctx.layout?.toggleSidebar` 而 `inject` 未声明 `layout`，cordis 属性代理会抛错、宿主路径成死代码；审查后改 `ctx.get('layout')` 软读取（`7ac0085`，不新增启动期依赖），测试加桩 ctx 行为断言。
- `2026-11-16` · PH8 [DNCS]：顺带修正 5 个错名令牌与 6 条 U8 死样式（同文件、同规则表，避免 U1/U8 残留）；新建弹窗 600×680 无预设档，取 560×640；会话时间改宿主 `relativeTime` 分桶，未来时间钳到「现在」；包 AGENTS 使用/不要两节同提交更新。- `2026-11-16` · PH9 [DNN]：AP P9-03 写 `np-switch → Switch`；该控件实为 2–3 段选择（含只读段），按 DESIGN §6.1 分段/页签归 `SegmentedControl` 执行。`np-tip → Tooltip` 不可行（宿主 Tooltip 只包单个 React 子元素，启动器与工具条是 innerHTML 串且挂载前读回几何），改原生 `title`+`aria-label`+`aria-keyshortcuts` 并登记 DESIGN §10。
- `2026-11-16` · PH9 [DNN]：AP 要求按 P9-01..05 拆提交；视图开关、图标门面与启动器提示与对话框/主题落在同一代码块，拆开会得到不能构建的中间提交，故并入 P9-01 提交，其余按 P9-02/03/04 + lib 分提交，分支合并一次。`.np-fx-model-option` 换行依赖宿主 Menu label 处理，留待 T27 视觉核对。
- `2026-11-16` · P9-05 停止，问答 Q19 登记（`9348347`，推荐 A 整段删除 + 登记「变更文件卡片动作」缺口），待 [业主] 裁决。
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
