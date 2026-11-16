# [NUE-1117 / nano-ui 增强与六插件原生化迁移] Closure

> 阶段: `NUE/1117 — nano-ui 0.2.0 + 六插件原生化迁移 + 审查修复（nano-ui 0.2.1）`
> 范围: `执行计划 Phase 1–10（S1–S5）+ 收尾三路审查与修复（STEP.7 / STEP.8）`
> Close-type: `implementation-complete-awaiting-live-verification`
> 状态: 代码、审查修复与文档已合入 `main`（`54e5805`）；Q18、Q19 均按 [业主] 裁决 A 执行；T27a–e 未观察（需 [业主] 授权 live 部署）
> 日期: `2026-11-17` · 作者: `Droid`
> 关联 charter: [业主] 发车指令（`todo.1117.md` §8 附件）
> 关联 design: `docs/specs/dsh-nano-ui/DESIGN.md`
> 关联 action-plan: `docs/code-review/26-nov/NUE-1117-action-plan.md`（§11 执行日志）
> 关联 evidence: `docs/code-review/26-nov/todo.1117.md` §3（逐项四元组）、§9（偏差日志）
> 关联 review: `.anote/reviews/NUE/1117/exec-962d552/`（见 §8 审查与修复）
> 关联 truth: `docs/code-review/26-nov/NUE-1117-qna-truth.md`（T-O-NUE1117-01..23）

---

## 0. 一句话 verdict

> nano-ui 0.2.0 硬切、六个插件迁移、三路审查发现的修复（nano-ui 0.2.1）已全部合入 `main`（`54e5805`），本地测试、终态扫描与闸门全绿（`test-all` 仅既有 s3-client 失败）。硬闸 5（T27a–e 视觉核对）未执行，所以 close-type 是 `implementation-complete-awaiting-live-verification`，AP 不标 `executed`。

> **本阶段最关键的 known gap（对下游影响）**：
> 1. T27a–e：Modal 内菜单、窗口覆盖层（含 [DNEE] 卡片改走插件自有层）、亮暗 pin、[DNK] 设置对话框、Menu 尺寸等视觉与交互只有契约层证据。
> 2. Q18（P4-01，裁决 A）：宿主无云会话判据，[DNMS] 不做判定，云会话 composer 中照常显示选择器；缺口登记在 DESIGN §8，等宿主提供判据。
> 3. [DNEE] `pane-right.js` 仍读宿主 `data-dockkit-*` / `data-sidebar-right-session` 属性识别右侧工作台（非公开合同，「在右侧工作台打开」的唯一识别手段），作为已知债务列入 §4。

---

## 1. 工作项收口表

| Item | 状态 | 证据（commit + test + run-time） |
|------|------|----------------------------------------|
| PH1 规格与原则（P1-01..04） | ✅ | `09290dc` + `node --test test/scripts/nue-docs.test.mjs` 7/7 + 2026-11-16T17:52:21Z |
| PH2 catalog 与检测（P2-01..05） | ✅（P2-04 partial） | `860f34c` + `node --test test/scripts/*.test.mjs` 31/31 + 2026-11-16T18:03:12Z；T06 的 `test-all` 退出 0 受 s3-client 既有失败阻塞 |
| PH3 nano-ui 0.2.0（P3-01..12） | ✅（P3-05/P3-08 partial） | `12bb081` + `cd packages/dsh-nano-ui && npm test` 41/41 + 2026-11-16T18:20:36Z；交互缺 T27a |
| PH4 [DNMS]（P4-02/03） | ✅ | `e52ef13` + `npm test` 62/62 + 2026-11-16T18:30:55Z |
| PH4 P4-01 云会话自判 | ❌ OOS handoff | Q18 裁决 A（`cf9a912`，T-O-NUE1117-18）：不做判定，宿主缺口登记 DESIGN §8 |
| PH5 [DNEE]（P5-01..03） | ✅ | `3cfd282` + `node --test test/*.mjs` 26/26 + 2026-11-16T18:48:57Z |
| PH6 [DNT]（P6-01/02） | ✅ | `c47b0eb` + `node test/run.mjs` 145/145 + 2026-11-16T19:04:04Z |
| PH7 [DNK]（P7-01..05） | ✅（P7-04 视觉 partial） | `18b30f4` + `npm test` 65/65 + 2026-11-16T19:17:51Z；缺 T27d |
| PH8 [DNCS]（P8-01..05） | ✅ | `28b8202` + `node --test` 39/39（含 `confirm.test.mjs` 攻击向量）+ 2026-11-16T19:37:23Z |
| PH9 [DNN]（P9-01..04） | ✅（P9-01 视觉 partial） | `81c90cc` + `node --test dsh-nano-notepad/test/*.test.mjs` 90/90 + 2026-11-16T20:15:02Z；缺 T27c |
| PH9 P9-05 宿主卡片注入 | ✅ | Q19 裁决 A（T-O-NUE1117-19）：注入、样式与观察者整段删除（`49b0f1d`，合入 `7e79530`）；缺口「变更文件卡片动作」登记 DESIGN §8 |
| PH10 重建、文档、终态、worktree（P10-01..03） | ✅ | `196b6fd`/`1cc787c`/`d7a6b6b` + 同 HEAD 两次构建 12 个 sha256 两两相同 + 2026-11-16T20:18:27Z |
| STEP.7 三路审查 | ✅ | `.anote/reviews/NUE/1117/exec-962d552/` 三份报告，发现逐条核实 |
| STEP.8 裁决登记与修复 | ✅ | `cf9a912`（Q18–Q23 冻结）、`b2aace6`、`bb42857`、`345738b`、`7e79530`、`4cadeb8`、`54e5805`；终态总验见 §2 |

---

## 2. Evidence / Validation 矩阵

终态在 `main@54e5805` 上重跑，2026-11-16T23:36:59Z。

| 验证项 | 命令 / 证据 | 结果 | 覆盖范围 |
|--------|-------------|------|----------|
| [DNMS] | `cd dsh-nano-model-selector && npm test` | 62/62（下限 54） | T18、T19 守卫 |
| [DNEE] | `cd dsh-nano-explorer-extra && node --test test/*.mjs` | 27/27（下限 12） | T20（含窗口层卡片） |
| [DNT] | `cd dsh-nano-terminal && node test/run.mjs` | 146/146（下限 137） | T21 |
| [DNK] | `cd dsh-nano-kitesurf && npm test` | 67/67（下限 56） | T22 |
| [DNCS] | `cd dsh-nano-cloud-session && node --test` | 41/41（下限 24） | T23、T24（行为化） |
| [DNN] | `node --test dsh-nano-notepad/test/*.test.mjs` | 91/91（下限 80） | T25、T26 |
| nano-ui | `cd packages/dsh-nano-ui && npm test` | 43/43 | T08–T17 |
| 仓根脚本测试 | `node --test test/scripts/*.test.mjs` | 43/43 | T01–T07、T29、T30 |
| 全仓闸门 | `node scripts/test-all.mjs` | 21/22，唯一失败 `packages/dsh-s3-client`（既有，AP §11.4） | 全部套件 |
| 导出检查 | `node scripts/check-client-rules.mjs` | ok（1 条既有警告：[DNMS] `IconLayersOutlineRegular` rc.1 缺失） | U7 |
| UI 规则 | `node scripts/check-ui-rules.mjs` | 94 文件 258 条（r1 339，PH2 基线 573）；U5 全 0（加固后匹配器）；U6 全 0；U1 只剩 [DNMS] 3 条槽位合同变量（T20 例外）；U10 9 = DESIGN §10 9 行 | U1–U10 |
| 产物版本 | `grep -o 'dsh-nano-ui@0\.2\.[0-9]'` 六份 `lib/client.js` | 各 1 处 `dsh-nano-ui@0.2.1` | T28 标记 |
| 负控 | 各插件 `nue-migration.test.mjs` 对迁移前源码实跑（r1）；修复轮新增断言均带正控夹具 | r1：DNMS 6、DNEE 10、DNT 5、DNK 6、DNCS 8、DNN 8 败；T29/T30 对之前的树各 1 败 | 防假绿 |

修复轮的 lib 由各修复分支在自身 HEAD 重建并单独提交；本轮未在最终 HEAD 再做「同 HEAD 两次构建 sha256 比对」，[DNK] buildId 对应其修复分支提交而非 `54e5805`。

---

## 3. Hard-gate 判定

按 AP §10.1。

| Gate | 判据 | 实测 | 判定 |
|------|------|------|------|
| 1 导出检查不红 | T05、T06 | `check-client-rules` ok；`test-all` 退出码受 s3-client 既有失败 | ⚠ PARTIAL |
| 2 旧接口删除且未迁移插件可构建 | T17 | 六套件全过；`dnn-expected-failures.json` 已删（无消费者） | ✅ PASS |
| 3 终态全局扫描为 0 | T30 | `nue-endstate.test.mjs` 与 U5 共用 `HOST_CLASS_ATTR_RE`；P9-05 豁免已移除，新增 `data-ds-dark-theme` 守卫；0 命中 | ✅ PASS |
| 4 收尾重建一致、只改 lib | T28 | r1：12 个 sha256 两两相同；修复轮：lib 提交与源码提交分开，六份标记均 0.2.1 | ✅ PASS（修复轮未重做双构建比对，见 §2） |
| 5 视觉核对 | T27a–e | 未授权、未部署 | ⏸ PENDING |
| 6 停止项 | T19 / P9-05 | Q18、Q19 已裁决并执行 | ✅ |

---

## 4. Deferred / Carry-over ledger

| 项 | 类型 | 当前状态 | 承接位置 / 触发条件 | 责任方 |
|----|------|----------|---------------------|--------|
| T27a–e 视觉 / 交互核对 | C | 未观察 | 本机 profile 部署 + ego-browser 截图，需 [业主] 授权；含 [DNEE] 卡片锚定文件面板、[DNN] 主题色归位与 `.np-window` 裁剪下沉、[DNN] 残留单色值（如 `#fbbf24`）与 `label-primary-inverted` 暗色观感 | [业主] 授权后执行者 |
| Q18 宿主云会话判据 | C | 已裁决 A，缺口登记 DESIGN §8 | 宿主提供公开判据后再做 P4-01 | 宿主 / 后续 charter |
| [DNEE] `pane-right.js` 读宿主 `data-dockkit-*`、`data-sidebar-right-session` | C | 保留，已知债务 | 宿主提供「右侧工作台」公开识别接口后替换 | 宿主 / 后续 charter |
| [DNEE] `showOpenButton`（行尾打开按钮）没有任何显示路径 | A | 既有缺陷，修复轮删除死选择器后暴露 | 删偏好项，或等宿主提供行悬停钩子 | [业主] |
| [DNN] 已退役 `window.__nanoNotepad` 的残留引用 | A | 未改 | `security/feature-contract.json:1033`；`docs/specs/dsh-nano-notepad/{README,s3-sync-design,notepad-wasm-fx-pipeline}.md`；`test/spike/**/README.md` | [业主] |
| [DNN] ctia-watch 退役后的残留 | A | 未改 | `lab/baseline/baseline.json`；`docs/specs/dsh-nano-performance-review/spec-26nov.md` | [业主] |
| [DNN] `.np-chrome-close` 死样式 | A | 未改 | `dsh-nano-notepad/src/client/panel.js:159,161` | [业主] |
| [DNEE] 规格措辞「confined dialog 区域」 | A | 未改冻结规格 | `docs/specs/dsh-nano-explorer-extra/spec-26nov.md:28` | [业主] |
| DESIGN §8 宿主缺口 | C | 已登记（修复轮新增 10 行） | 宿主提供对应能力后迁移 | 宿主 / 后续 charter |
| `packages/dsh-s3-client` 测试失败 | A | 既有（`2c0ad72` 已失败，本期 0 改动） | 另立工作项 | [业主] |
| [DNK] 重复 `ref` 键 | A | AP O5 范围外 | 另立工作项 | [业主] |

---

## 5. 诚实收口声明

| 收口纪律 | 兑现声明 |
|----------|----------|
| 每个 ✅ 归类 5 态 | ✅：PH1–PH10 与修复轮的代码与测试项为 verified（§1/§2）；P2-04 为 partial（T06 的 `test-all` 退出 0 被 s3-client 既有失败阻塞，承接见 §4）；P3-05/P3-08/P7-04/P9-01 的交互与视觉为 partial；T27a–e 为未观察；P4-01 为 OOS handoff（Q18） |
| ✅ 证据为四元组 | ✅：§1 每行 commit + argv + 计数 + UTC；todo §3 有逐项明细 |
| scope diff 守卫 | ⚠：PH4–PH9 每 Phase 只改本插件 + DESIGN 登记，例外登记于 todo §9；修复轮按包分支，跨包改动只有闸门脚本分支（scripts + catalog + [DNCS]）与 DESIGN 回写 |
| deferred 三分类且有承接 | ✅：§4 |
| owner-test 未复测的标 ⏸ | ✅：T27a–e 全部 ⏸，未宣称视觉通过 |

执行中的漏检：r1 时 `test/scripts` 不在 `test-all` 内，PH4–PH9 未跑，T03 自 `e52ef13` 起红 1 条，PH10 发现并修正（`a85ec54`）；修复轮每次合并后都单独跑了 `test/scripts`。r1 的四类问题（未解析令牌与数字层级未豁免、[DNEE] 改写宿主 portal 层、[DNT] 滚动条嫁接、扫描器只认字面量）没有被 r1 的闸门抓住，是三路审查发现的，见 §8。

---

## 6. Handoff / 下阶段 entry-gate 预核对

| 入口条件 | 状态 | 备注 |
|----------|------|------|
| `main` 含全部迁移与修复，`git worktree list` 无 `nue-1117-*` | ✅ | `54e5805` 后清理完毕 |
| 六份 `lib/client.js` 为构建产物、内嵌 nano-ui 0.2.1 | ✅ | 安装侧可直接 `dsh plugin add` |
| Q18、Q19 裁决 | ✅ | 均为 A，已执行 |
| T27a–e 授权 | ⏸ | 授权后部署本机 profile 并截图核对 |

**下阶段 kickoff checklist**：
- [ ] 引用本 closure 作为 single truth anchor
- [ ] T27a–e live 核对结果回填 AP §10.2 / §11，再视结果改 close-type
- [ ] §4 中 A 类残留由 [业主] 决定是否另立工作项

---

## 7. Cross-cut 不变量（0-drift 确认）

| 不变量 | 状态 | 证据 |
|--------|------|------|
| 不得侧载：插件间无专有标记读取 | ✅ 保持 | `nue-endstate.test.mjs`：`dncs` / `nms-root` / `data-nano-model-selector` 只在各自包内出现；[DNMS] 守卫断言无 `dncs` 读取；[DNN] 改用 `ctx.provide('nanoNotepad')`，无 `window.__nanoNotepad` |
| 不得嫁接宿主 DOM | ✅ 保持（§4 一项已知债务） | 六插件 + nano-ui：class 属性选择器（`HOST_CLASS_ATTR_RE`，含空白、全部运算符、大小写）0；指向宿主的 `:has(` 0，T30 无豁免；无运行时哈希类扫描；[DNEE] 不再改写宿主 Modal 的 portal 层；[DNT] 滚动条接管与 [DNN] 卡片注入已删。仍有 [DNEE] `pane-right.js` 读宿主 `data-*` 属性（只读识别，不改写），列 §4 |
| 单一 UI 规格 | ✅ 保持 | DESIGN.md 唯一；README 为入口页（T01） |
| 不扩约 | ✅ 保持 | Q18–Q23 先冻结再执行；`inject` 列表未新增服务 |
| 不新增 release-gate / 不改 `test-all` 成员 | ✅ 保持 | `scripts/test-all.mjs` 未改；`check-ui-rules` 只警告 |

---

## 8. 审查与修复

**审查（STEP.7）**：在 r1（`962d552`）上做三路只读审查，报告在 `.anote/reviews/NUE/1117/exec-962d552/`。

| 报告 | 发现 | 要点 |
|------|------|------|
| `truth-reconciliation.report.md` | P0 0 / P1 4 / P2 6 / P3 6 | 未解析令牌与数字层级未豁免；DESIGN §1 与 §10 关于槽位变量自相矛盾；[DNT] 滚动条结构性嫁接未登记；[DNK] 完成判据未达；[DNN] 菜单落入 `overflow:hidden`；[DNEE] 宿主属性样式钩子；§8 缺口表不全 |
| `completeness.report.md` | P0 0 / P1 1 / P2 2 / P3 2 | F-01 同上；F-02 [DNN] AGENTS 与主题代码相反；F-03 closure 5 态与 close-type；F-04 统计口径；F-05 状态枚举 |
| `antigreen-antisideload.report.md` | P0 0 / P1 1 / P2 6 / P3 6 | F1 [DNEE] 改写宿主 Modal portal 层；F2 U5 字面量可绕过；F3 T30 豁免按子串放行；F4 [DNCS] T24 只有字面量断言；F5 [DNT] Node 24 计数为 0 仍判过；F6 `data-ds-dark-theme` 无硬断言；F7 catalog 含本机路径；F10/F11 [DNN] 文档与惰性清单 |

主代理逐条复核，关键发现属实。

**裁决（[业主]，均选 A）**：Q18 [DNMS] 不做云会话判定、登记缺口；Q19 删除 [DNN] 卡片注入；Q20 DESIGN §1 增「槽位合同变量」例外；Q21 删除 [DNT] 滚动条接管；Q22 nano-ui 提供局部层令牌；Q23 [DNEE] 对话框改窗口覆盖层。登记于 `NUE-1117-qna.md` / `NUE-1117-qna-truth.md`（`cf9a912`，T-O-NUE1117-18..23）。

**修复（STEP.8）**：

| 合并 | 范围 | 主要改动 |
|------|------|----------|
| `b2aace6` | nano-ui + DESIGN | nano-ui 0.2.1：`NANO_LAYER.local1..7` → `--nano-layer-local*`；DESIGN §1/§2/§4/§6.3/§7/§8（+10 缺口行）/§9（U5 覆盖范围说明）（F-01、P1-02、P2-03、P2-04） |
| `bb42857` | [DNT] | 删除滚动条接管；令牌与局部层级归位；9 个原生按钮豁免 + §10 行；`run.mjs` 计数不再依赖 TAP（P1-03、P3-03、F5） |
| `345738b` | [DNK] | 22 处令牌、11 处层级归位；DevTools 页签改宿主 `SegmentedControl`/`Switch`/`Button`；可关闭页签豁免（P1-04） |
| `7e79530` | [DNN] | 删除卡片注入与 ctia-watch 轨；删 `[data-theme]` 两套色；`.np-window` 裁剪下沉；AGENTS 改 `ctx.get('nanoNotepad')`；删 `dnn-expected-failures.json`；2 行新豁免（F-02、P2-01、P2-06、F10、F11） |
| `4cadeb8` | 闸门 + [DNCS] | `HOST_CLASS_ATTR_RE`；U8/U9 误报收窄；T30 去豁免 + `data-ds-dark-theme` 守卫；catalog 来源平台中立；[DNCS] T24 行为化（F2、F3、F4、F6、F7） |
| `54e5805` | [DNEE] + [DNMS] | 卡片改走插件自有 `.nxe-dialog-layer` 内的 nano-ui 窗口层，删除 `usePanelConfinedLayer` 与两个 body `MutationObserver`；删宿主属性死选择器；[DNMS] 删 `nano-dialog-host` 类名；T20 改用 U5 匹配器（F1、P2-02） |

F-03/F-04/F-05 在本次 r2 文档收口中处理（本 closure §1/§5/close-type；AP §11 统计与状态枚举）。

**复跑**：见 §2（`54e5805`，2026-11-16T23:36:59Z）。`check-ui-rules` 339 → 258；U5、U6 全 0；U10 9 = §10 9 行。

**未处理**：§4 的 A 类残留与 T27a–e。

---

## 修订历史

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| `r1` | `2026-11-17` | `Droid` | 初闭合 |
| `r2` | `2026-11-17` | `Droid` | 三路审查与修复收口：close-type 改 `implementation-complete-awaiting-live-verification`；Q18/Q19 裁决执行；P2-04 归 partial；§2 终态按 `54e5805` 重跑；§4 残留更新；§7 嫁接措辞；§8 审查与修复记录 |
