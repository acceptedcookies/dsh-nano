# [NUE-1117 / nano-ui 增强与六插件原生化迁移] Closure

> 阶段: `NUE/1117 — nano-ui 0.2.0 + 六插件原生化迁移`
> 范围: `执行计划 Phase 1–10（S1–S5）`
> Close-type: `closed-with-explicit-deferrals`
> 状态: `implementation-complete-awaiting-live-verification`（停止项 Q18/Q19 待 [业主] 裁决；T27a–e 未观察）
> 日期: `2026-11-17` · 作者: `Droid`
> 关联 charter: [业主] 发车指令（`todo.1117.md` §8 附件）
> 关联 design: `docs/specs/dsh-nano-ui/DESIGN.md`
> 关联 action-plan: `docs/code-review/26-nov/NUE-1117-action-plan.md`（§11 执行日志）
> 关联 evidence: `docs/code-review/26-nov/todo.1117.md` §3（逐项四元组）、§9（偏差日志）
> 关联 review: `.anote/reviews/NUE/1117/`（见 §8 审查与修复）

---

## 0. 一句话 verdict

> nano-ui 0.2.0 硬切与六个插件迁移已全部合入 `main`（`a85ec54`），本地测试与终态扫描全绿；AP 状态为「除停止项外已完成（代码已合并、视觉未核对）」，不标 `executed`。

> **本阶段最关键的 known gap（对下游影响）**：
> 1. Q18（P4-01）：宿主无云会话判据，[DNMS] 不做云会话判定，云会话 composer 中照常显示选择器。
> 2. Q19（P9-05）：[DNN] 仍向宿主「变更文件」卡片注入按钮并用一处 `:has()`，是唯一残留的宿主 DOM 嫁接。
> 3. T27a–e：Modal 内菜单、窗口覆盖层、亮暗 pin、[DNK] 设置对话框、Menu 尺寸等视觉与交互只有契约层证据。

---

## 1. 工作项收口表

| Item | 状态 | 证据（commit + test + run-time） |
|------|------|----------------------------------------|
| PH1 规格与原则（P1-01..04） | ✅ | `09290dc` + `node --test test/scripts/nue-docs.test.mjs` 7/7 + 2026-11-16T17:52:21Z |
| PH2 catalog 与检测（P2-01..05） | ✅（P2-04 🟡） | `860f34c` + `node --test test/scripts/*.test.mjs` 31/31 + 2026-11-16T18:03:12Z；T06 退出码受 s3-client 既有失败影响 |
| PH3 nano-ui 0.2.0（P3-01..12） | ✅（P3-05/P3-08 🟡） | `12bb081` + `cd packages/dsh-nano-ui && npm test` 41/41 + 2026-11-16T18:20:36Z；交互缺 T27a，handoff → live 核对 |
| PH4 [DNMS]（P4-02/03） | ✅ | `e52ef13` + `npm test` 62/62 + 2026-11-16T18:30:55Z |
| PH4 P4-01 云会话自判 | ⏸ deferred | 问答 Q18（`807c357`）→ [业主] |
| PH5 [DNEE]（P5-01..03） | ✅ | `3cfd282` + `node --test test/*.mjs` 26/26 + 2026-11-16T18:48:57Z |
| PH6 [DNT]（P6-01/02） | ✅ | `c47b0eb` + `node test/run.mjs` 145/145 + 2026-11-16T19:04:04Z |
| PH7 [DNK]（P7-01..05） | ✅（P7-04 视觉 🟡） | `18b30f4` + `npm test` 65/65 + 2026-11-16T19:17:51Z；缺 T27d |
| PH8 [DNCS]（P8-01..05） | ✅ | `28b8202` + `node --test` 39/39（含 `confirm.test.mjs` 攻击向量）+ 2026-11-16T19:37:23Z |
| PH9 [DNN]（P9-01..04） | ✅（P9-01 视觉 🟡） | `81c90cc` + `node --test dsh-nano-notepad/test/*.test.mjs` 90/90 + 2026-11-16T20:15:02Z；T26 旧实现实跑三文件各 ≥1 AssertionError；缺 T27c |
| PH9 P9-05 宿主卡片注入 | ⏸ deferred | 问答 Q19（`9348347`）→ [业主]；代码保持原样 |
| PH10 重建、文档、终态、worktree（P10-01..03） | ✅ | `196b6fd`/`1cc787c`/`d7a6b6b` + 同 HEAD 两次构建 12 个 sha256 两两相同 + 2026-11-16T20:18:27Z；`test/scripts` 39/39 @`a85ec54` 2026-11-16T20:19:43Z |
| T03 回归修正 | ✅ | `a85ec54` + `node --test test/scripts/*.test.mjs` 39/39 + 2026-11-16T20:19:25Z |

---

## 2. Evidence / Validation 矩阵

终态在 `main@a85ec54` 上一次性重跑，2026-11-16T20:19:43Z。

| 验证项 | 命令 / 证据 | 结果 | 覆盖范围 |
|--------|-------------|------|----------|
| [DNMS] | `cd dsh-nano-model-selector && npm test` | 62/62（下限 54） | T18、T19 守卫 |
| [DNEE] | `cd dsh-nano-explorer-extra && node --test test/*.mjs` | 26/26（下限 12） | T20 |
| [DNT] | `cd dsh-nano-terminal && node test/run.mjs` | 145/145（下限 137） | T21 |
| [DNK] | `cd dsh-nano-kitesurf && npm test` | 65/65（下限 56） | T22 |
| [DNCS] | `cd dsh-nano-cloud-session && node --test` | 39/39（下限 24） | T23、T24 |
| [DNN] | `node --test dsh-nano-notepad/test/*.test.mjs` | 90/90（下限 80） | T25、T26 |
| nano-ui | `cd packages/dsh-nano-ui && npm test` | 42/42 | T08–T17 |
| 仓根脚本测试 | `node --test test/scripts/*.test.mjs` | 39/39 | T01–T07、T29、T30 |
| 全仓闸门 | `node scripts/test-all.mjs` | 21/22，唯一失败 `packages/dsh-s3-client`（既有，§4） | 全部套件 |
| 导出检查 | `node scripts/check-client-rules.mjs` | ok（1 条既有警告：[DNMS] `IconLayersOutlineRegular` rc.1 缺失） | U7 |
| UI 规则 | `node scripts/check-ui-rules.mjs` | 94 文件 339 条（PH2 基线 78 文件 573 条）；U5 全 0 | U1–U10 |
| 收尾重建 | 同 HEAD `196b6fd` 六包 `npm run build` × 2 | 12 个 sha256 两两相同；`dsh-nano-ui@0.2.0` 各 1 | T28 |
| 负控 | 各插件 `nue-migration.test.mjs` 对迁移前源码实跑 | DNMS 6 败、DNEE 10 败、DNT 5 败、DNK 6 败、DNCS 8 败、DNN 8 败；T29/T30 对之前的树各 1 败 | 防假绿 |

---

## 3. Hard-gate 判定

按 AP §10.1。

| Gate | 判据 | 实测 | 判定 |
|------|------|------|------|
| 1 导出检查不红 | T05、T06 | T05 12 条过；`check-client-rules` ok；T06 的 `test-all` 退出 0 受 s3-client 既有失败 | ⚠ PARTIAL |
| 2 旧接口删除且未迁移插件可构建 | T17 | P3-12：导入名全在新导出、六套件条数 ≥ N6、[DNN] 失败集合 = 预登记 6 条 | ✅ PASS |
| 3 终态全局扫描为 0 | T30 | `nue-endstate.test.mjs` 3/3，>50 文件、正控六规则全报；P9-05 一处单列 | ✅ PASS（P9-05 单列 Q19） |
| 4 收尾重建一致、只改 lib | T28 | 12 个 sha256 两两相同；`1cc787c` 只含 `lib/**` | ✅ PASS |
| 5 视觉核对 | T27a–e | 未授权、未部署 | ⏸ PENDING |
| 6 停止项 | T19 / P9-05 | Q18、Q19 均有问答编号 | ✅（AP 最多「除停止项外已完成」） |

---

## 4. Deferred / Carry-over ledger

| 项 | 类型 | 当前状态 | 承接位置 / 触发条件 | 责任方 |
|----|------|----------|---------------------|--------|
| Q18 [DNMS] 云会话自判（P4-01 / T19） | B | 待裁决，推荐 A | `NUE-1117-qna.md` Round 6；裁决 A 则 T19 保持 deferred 并登记缺口 | [业主] |
| Q19 [DNN] 宿主变更文件卡片注入（P9-05） | B | 待裁决，推荐 A | `NUE-1117-qna.md` Round 6；裁决后另起小 worktree 执行 | [业主] |
| T27a–e 视觉 / 交互核对 | C | 未观察 | 本机 profile 部署 + ego-browser 截图，需 [业主] 授权 | [业主] 授权后执行者 |
| [DNEE] 4 处宿主属性锚点（`[data-nxe] .nxe-tree button`、`[data-files-path]`、`[data-custom-tree]` ×2） | C | 保留，非 T20 清零项 | T27 视觉核对时判定是否也登记缺口 | 执行者 |
| [DNN] `.np-fx-model-option` 在宿主 Menu 中的换行 | C | 未观察 | T27 | 执行者 |
| [DNCS] 设置弹窗上叠 `RiskConfirmation` 的双层 Modal 观感 | C | 未观察 | T27 | 执行者 |
| DESIGN §8 宿主缺口九项 | C | 已登记 | 宿主提供对应能力后迁移 | 宿主 / 后续 charter |
| `packages/dsh-nano-ui` 之外 `packages/dsh-s3-client` 测试失败 | A | 既有（`2c0ad72` 已失败，本期 0 改动） | 另立工作项 | [业主] |
| [DNK] 重复 `ref` 键 | A | AP O5 范围外 | 另立工作项 | [业主] |

---

## 5. 诚实收口声明

| 收口纪律 | 兑现声明 |
|----------|----------|
| 每个 ✅ 归类 5 态 | ✅：PH1–PH10 代码与测试项为 verified（四元组见 §1/§2）；P3-05/P3-08/P7-04/P9-01 的交互与视觉为 partial；T27a–e 为未观察；P4-01/P9-05 为 deferred |
| ✅ 证据为四元组 | ✅：§1 每行 commit + argv + 计数 + UTC；todo §3 有逐项明细 |
| scope diff 守卫 | ⚠：PH4–PH9 每 Phase 只改本插件 + DESIGN 登记；例外为 PH4 的 nano-ui 版本标记提交 `e1b2a5a`（行为不变）、PH8 顺带修正错名令牌与死样式（同文件同规则）、PH10 [DNN] 两处注释用词；均登记于 todo §9 |
| deferred 三分类且有承接 | ✅：§4 |
| owner-test 未复测的标 ⏸ | ✅：T27a–e 全部 ⏸，未宣称视觉通过 |

执行中的漏检：`test/scripts` 不在 `test-all` 内，PH4–PH9 未跑，T03 自 `e52ef13` 起红 1 条，PH10 终态总验发现并修正（`a85ec54`）。该缺口已登记在 todo §9 与 AP §11。

---

## 6. Handoff / 下阶段 entry-gate 预核对

| 入口条件 | 状态 | 备注 |
|----------|------|------|
| `main` 含全部迁移，`git worktree list` 无 `nue-1117-*` | ✅ | `d7a6b6b` 后清理完毕 |
| 六份 `lib/client.js` 为同 HEAD 重建产物 | ✅ | 安装侧可直接 `dsh plugin add` |
| Q18、Q19 裁决 | ⏸ | 裁决后执行 P4-01 / P9-05 的对应选项 |
| T27a–e 授权 | ⏸ | 授权后部署本机 profile 并截图核对 |

**下阶段 kickoff checklist**：
- [ ] 引用本 closure 作为 single truth anchor
- [ ] Q18、Q19 的裁决结果与对应执行
- [ ] T27a–e live 核对结果回填 AP §10.2 / §11

---

## 7. Cross-cut 不变量（0-drift 确认）

| 不变量 | 状态 | 证据 |
|--------|------|------|
| 不得侧载：插件间无专有标记读取 | ✅ 保持 | `nue-endstate.test.mjs`：`dncs` / `nms-root` / `data-nano-model-selector` 只在各自包内出现；[DNMS] 守卫断言无 `dncs` 读取；[DNCS] `dncsCloud` 读写已删 |
| 不得嫁接宿主 DOM | ✅ 保持（P9-05 单列） | 六插件 + nano-ui `[class*=` 0、指向宿主的 `:has(` 仅 P9-05 一处、无运行时哈希类扫描（[DNT] `trajCls`、[DNCS] `withLocal` 已删） |
| 单一 UI 规格 | ✅ 保持 | DESIGN.md 唯一；README 为入口页（T01） |
| 不扩约 | ✅ 保持 | 停止项均回问答；`inject` 列表未新增服务（[DNCS] layout 为软读取） |
| 不新增 release-gate / 不改 `test-all` 成员 | ✅ 保持 | `scripts/test-all.mjs` 未改；`check-ui-rules` 只警告 |

---

## 8. 审查与修复

（STEP.7 / STEP.8 完成后补写。）

---

## 修订历史

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| `r1` | `2026-11-17` | `Droid` | 初闭合 |
