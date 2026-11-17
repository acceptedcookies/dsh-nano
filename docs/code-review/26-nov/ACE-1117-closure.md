# [ACE-1117 / 异步压缩接管二期] Closure

> 阶段: `ACE/1117 — async-compaction take-over hardening`
> 范围: `P1–P6 全部工作项（P1-01..P6-02）`
> Close-type: `implementation-complete-awaiting-live-verification`
> 状态: `implementation-complete-awaiting-live-verification`
> 日期: `2026-11-17` · 作者: `lead (DeepSeek Harness agent)`
> 关联 charter: `docs/specs/dsh-nano-model-selector/plan/DNMS01-async-compaction-takeover.md`
> 关联 design: `N/A`
> 关联 action-plan: `docs/code-review/26-nov/ACE-1117-action-plan.md`（§11.A 执行日志已回填）
> 关联 evidence: `inline §2`；测试文件 `dsh-nano-model-selector-compaction/test/`、`dsh-nano-model-selector/test/`
> 关联 review: `.anote/reviews/ACE/1117/`（REV 路进行中）

---

## 0. 一句话 verdict

> ACE-1117 六个 Phase（策略硬切 / inspect_checkpoint / 生命周期互斥 / 三级选择器+prompt+帧 / session 投影+UI 心跳 / closure 收口）全部落地并测试通过；剩余缺口是 live GUI 实测与合入 main，未授权发布。

> **本阶段最关键的 known gap（对下游影响）**：
> 1. `?sessionId=<id>` 对无会话对象（纯 id）时 `runtime.fill` 恒 null——fold 可读、token 计量不可做（如实记录于 §11.A）。
> 2. UI 呈现（顶栏按钮、确认对话框、徽标）未在 live GUI 实测；client 改刷新生效、host 改需 desktop 重启。

---

## 1. 工作项收口表

| Item | 状态 | 证据（commit + query/test + run-time） |
|------|------|----------------------------------------|
| P1-01 策略顺序与 S 读时 | ✅ | `7067602` + `compact-policy.test.mjs` T01 断言 + `2026-11-17 10:00 UTC` |
| P1-02 extraRequirements 替换 summaryPrompt | ✅ | `7067602` + T02 schema+指令拼接 + `2026-11-17 10:00 UTC` |
| P1-03 共享烘焙 | ✅ | `7067602` + `bake-compact-shared.mjs` hash `3e0b2ccc8c09`/`7e2b99893bea` + `2026-11-17 10:00 UTC` |
| P1-04 协议副本 hash 锁 | ✅ | `7067602` + `protocol-hash.test.mjs` + `2026-11-17 10:00 UTC` |
| P2-01 inspect_checkpoint | ✅ | `f8a9acf` + T05/T06 分页/截断/`when` + `2026-11-17 12:00 UTC` |
| P2-02 patch 覆盖 base+工具行 | ✅ | `f8a9acf` + T07 patch 结构断言 + `2026-11-17 12:00 UTC` |
| P2-03 checkpoint 识别 | ✅ | `f8a9acf`/`c770f3d` + journal 源读 + `2026-11-17 12:00 UTC` |
| P3-01 调度与 idle 提交（-05） | ✅ | `6064627` + T08 + `2026-11-17 14:00 UTC` |
| P3-02 engine 互斥 | ✅ | `6064627` + T09 四 lane + `2026-11-17 14:00 UTC` |
| P3-03 失败/超时/GC | ✅ | `6064627` + T10 mock-timers + `2026-11-17 14:00 UTC` |
| P3-04 disarm CORR-1 | ✅ | `6064627` + T11 + `2026-11-17 14:00 UTC` |
| P4-01 统一选择器 | ✅ | `c770f3d` + T12 三级/距离/同距/null + `2026-11-17 16:00 UTC` |
| P4-02 prompt 与 step verbatim | ✅ | `c770f3d` + T13 `:222` 删除/八节序 + `2026-11-17 16:00 UTC` |
| P4-03 checkpoint 帧 | ✅ | `c770f3d` + T13 帧字段闭合 + `2026-11-17 16:00 UTC` |
| P4-04 四 lane select 账本 | ✅ | `c770f3d` + T14 死账本仍提交 + `2026-11-17 16:00 UTC` |
| P5-01 session 范围 runtime | ✅ | `a8a48b0` + T15 无跨会话 + `2026-11-17 19:00 UTC` |
| P5-02 常驻定时器退役 | ✅ | `a8a48b0` + T16 产物无 15000/30000 + `2026-11-17 19:00 UTC` |
| P5-03 入口/确认/文案 | ✅ | `a8a48b0` + T17 确认前置 POST 0→1 + `2026-11-17 19:00 UTC` |
| P5-04 审计预算 3000 | ✅ | `a8a48b0` + T16 declaration 断言 + `2026-11-17 19:00 UTC` |
| P6-01 closure :20/:74 | ✅ | `231eb0b` + T19 hunk 锚点 + `2026-11-17 19:30 UTC` |
| P6-02 非目标核对 | ✅ | `231eb0b` + T19 非目标零 diff + `2026-11-17 19:30 UTC` |

---

## 2. Evidence / Validation 矩阵

| 验证项 | 命令 / 证据 | 结果 | 覆盖范围 |
|--------|-------------|------|----------|
| DNMSC 全量 | `cd dsh-nano-model-selector-compaction && node --test "test/*.test.mjs" --test-timeout=20000` | 55/55 PASS | T01–T14 + T19 + 协议 hash |
| DNMS 全量 | `cd dsh-nano-model-selector && node --test "test/*.test.mjs"` | 77/77 PASS | T15–T18 + 既有 69 项 |
| 产物构建 | `npm run build`（DNMS） | `lib/client.js`/`bindings.js`/`perf-declaration.js` 再生 | 烘焙完整性 |
| 产物定时器审计 | `grep -o '15000\|30000\|3e4' lib/client.js` | 零命中；`3e3` 恰 1 处 | 常驻调度退役 |
| closure diff 范围 | `git diff -U0 fb7264d...HEAD -- closure/DNMS01-closure.md` | hunk 仅 :20、:74 邻域 | P6-01 |
| 非目标 diff | `git diff --name-only fb7264d...HEAD` | `async-compaction.md`/`RELEASE.md`/DNMS01 qna 零 diff | P6-02 |
| ui-rules vs HEAD | `check-ui-rules.mjs --json` + scanPlugin(HEAD) 对比 | touched 文件告警 ⊆ 基线 | P5-03 T18 |

---

## 3. Hard-gate 判定

| Gate | 判据 | 实测 | 判定 |
|------|------|------|------|
| T01–T19 全绿 | §8.5 右列四元组 | 55/55 + 77/77 PASS | ✅ PASS |
| closure 只动两处 | `-U0` diff hunk 锚点 :20/:74 | anchors ∈ {20,74} 邻域 | ✅ PASS |
| 非目标零 diff | 计划列名清单 + version 字段 | 全空 | ✅ PASS |
| live GUI 实测 | 顶栏按钮/确认/徽标渲染 | 需 desktop 重启后人工验 | ⏸ PENDING（owner） |
| 装包/发布 | `dsh plugin add` + 版本号 | 未授权，version 未动 | ⏸ PENDING（owner） |

---

## 4. Deferred / Carry-over ledger

| 项 | 类型 | 当前状态 | 承接位置 / 触发条件 | 责任方 |
|----|------|----------|---------------------|--------|
| live GUI 实测（徽标/确认/入口） | C | ⏸ | [业主] 重启 desktop + 刷新页面 | [业主] |
| 装包授权与 version bump | C | ⏸ | 另一次 [业主] 决定 | [业主] |
| T20 比例对照 | B | 未观察（授权外） | 未授权项，允许 | — |
| `plan/DNMS01-audit-agent27.md` | A | 缺失（核实为空） | 如需补做另开 charter | [业主] |
| `?sessionId` 纯 id 时 fill=null | B | 如实记录 | 若需计量，需传 session 对象（后续 charter） | — |
| 同步目标 `~/.dsh-dev|dsh-desktop` | C | ⏸ | 装包时同步 | [业主] |

---

## 5. 诚实收口声明

| 收口纪律 | 兑现声明 |
|----------|----------|
| 每个 ✅ 归类 5 态 | ✅ verified —— 全部 20 项均有 commit+test+时间四元组 |
| ✅ 证据为四元组 | ✅ §1 全部行齐 commit/test/run-time |
| scope diff 守卫 | ✅ `fb7264d...HEAD` 37 文件全部在计划清单内；T19 断言非目标零 diff |
| deferred 三分类 | ✅ §4：A×1（audit 稿缺失）/B×2（T20、fill=null）/C×3（live、装包、同步） |
| owner-test 未复测标 ⏸ | ✅ live GUI 与装包均标 ⏸ PENDING，不宣称已验 |

---

## 6. Handoff / 下阶段 entry-gate 预核对

| 入口条件 | 状态 | 备注 |
|----------|------|------|
| 合入 `main` + `git worktree remove` | ⏸ | FIX 路执行 |
| REV 三路审查报告落盘 | ⏸ | `.anote/reviews/ACE/1117/` 进行中 |
| live GUI 实测 | ⏸ | 需 desktop 重启 |
| 装包授权 | ⏸ | 独立 [业主] 决定 |

**下阶段 kickoff checklist**：
- [ ] 引用本 closure 作为 single truth anchor
- [ ] live 验证顶栏「异步压缩」按钮仅在 companion bundle 已安装时出现
- [ ] live 验证 Switch 点击先弹确认、确认后才 POST
