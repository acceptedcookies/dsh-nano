# [DNPR01 / Progress Ledger 硬切] Closure

> 阶段: `dsh-nano-progress-report / DNPR01 — 进度账本硬切（账本投影 + 四行锚 + read_progress + A/B/C 精简 + 面板四列表）`
> 范围: `PH0–PH6（工作台账 P0-01 … P6-02）`
> Close-type: `closed-with-explicit-deferrals`
> 状态: `closed`
> 日期: `2026-11-20` · 作者: `lead`
> 关联 charter: 无（[业主] 2026-11-20 发车指令直接授权 `executing`）
> 关联 design: `docs/specs/dsh-nano-progress-report/spec-v1.1.md`（已标记被取代）
> 关联 action-plan: `docs/specs/dsh-nano-progress-report/plan/DNPR01-progress-ledger.md`（§11 已回填）
> 关联 evidence: `dsh-nano-progress-report/test/live/prod-replay.mjs` 输出 `evidence/prod-replay.json`（gitignored）；计划 §11.4 记录四个数字
> 关联 review: `.anote/reviews/dsh-nano-progress-report/DNPR01/`（3 路子代理，见 §2 末）

---

## 0. 一句话 verdict

> DNPR01 的全部六个 Phase 按 `T-O` 真相层与计划 §8.4 冻结语义落地：会话投影硬切为 `nano-progress-report:ledger`（16+64 分层账本），模型面为逐字四行锚 + `read_progress`，人类面为默认 A/B/C 精简与账本驱动的 Tasks/Files/Failures/Jobs 面板，`0.2.0` 发布裁剪已验证——收口为 `closed-with-explicit-deferrals`，剩余 deferral 全部是计划 §2.3 范围外的重开条件 + [业主] 的 `deploy-local`。

> **本阶段最关键的 known gap（对下游影响）**：
> 1. `[PROD]` 回放的行数对比是类别序列合并近似（不含 C 层剥除，−52% 是下界估计）；精确行数需要宿主 Definition 引擎的 UI 级驱动，`test/live/*.live.mjs` 浏览器实测未跑。
> 2. C1-03 归属一致率如实登记未跑（范围外）；`evidence/prod-replay.json` 按 `.gitignore` 不入库，数字以计划 §11.4 / spec §7.3 登记为准。

---

## 1. 工作项收口表

| Item | 状态 | 证据（commit + query/test + run-time） |
|------|------|----------------------------------------|
| `P0-01` worktree + `T00` | ✅ | `6174f7d`（首提交含复核说明）+ `git status` clean + `2026-11-19 23:40 +08` |
| `P1-01` shared 指纹 | ✅ | `6174f7d` + `test/fingerprint.test.mjs`（11 用例，digest 对 `node:crypto` 逐字节）+ `2026-11-20 02:35` |
| `P1-02` openKind + A/B/C | ✅ | `6174f7d` + `test/condense.test.mjs`（9 用例）+ `2026-11-20 02:35` |
| `P2-01`/`P2-02` 账本投影 + 注册 | ✅ | `e5fefb2` + `test/ledger.test.mjs`（10 用例）+ `test/ledger-register.test.mjs`（2 用例）+ `2026-11-20 02:50` |
| `P3-01` 四行锚硬切 | ✅ | `7495b9c` + `test/host-context.test.mjs`（4 用例含旧行否定断言）+ `2026-11-20 03:15` |
| `P3-02` `read_progress` | ✅ | `7495b9c` + `test/read-progress.test.mjs`（6 用例）+ `test/built-host.mjs` + `2026-11-20 03:15` |
| `P3-03` 删 summary 投影 | ✅ | `7495b9c` + `test/release-cut.test.mjs`「exactly one projection」+ `2026-11-20 03:15` |
| `P4-01`/`P4-02` 默认精简 + schedule 开组 + C0 | ✅ | `ec513bb` + `test/timeline-condense.test.mjs`（5 用例）+ `npm test 174/174` + `2026-11-20 02:55` |
| `P5-01`/`P5-02` 面板四列表 + 删 task-times | ✅ | `d7d9325`+`4c04177` + `npm test 171/171` + `check-ui-rules NPR 行 0` + `2026-11-20 03:05` |
| `P6-01` 文档/版本 | ✅ | `ae22d82` + `AGENTS.md`/`spec-v1.1`/FUS 回写 + `version 0.2.0` + `2026-11-20 03:30` |
| `P6-02` 验证与合并 | ✅ | `ae22d82` + 计划 §11 回填（命令+计数+时间）+ `npm test 177/177`、`npm pack --dry-run` 10 文件 + `2026-11-20 03:30` |

---

## 2. Evidence / Validation 矩阵

| 验证项 | 命令 / 证据 | 结果 | 覆盖范围 |
|--------|-------------|------|----------|
| 单测 | `cd dsh-nano-progress-report && npm test` | `177/177 PASS` | 全部 unit+contract+view 源码断言 |
| UI 规则 | `node ../scripts/check-ui-rules.mjs` | `NPR 行 0 告警`（尾列 1 = U10 豁免登记） | 全部 client 源码 |
| 构建 | `npm run build` | `lib/host.js`、`lib/client.js`、`lib/perf-declaration.js` 非空 | 发布产物 |
| 打包 | `npm pack --dry-run` | 10 文件 49.1kB；`src/`/`test/` 不进 tarball | 发布裁剪 |
| 构建后宿主冒烟 | `node --test test/built-host.mjs` | PASS | `lib/host.js` 注册面 |
| `[PROD]` 回放 | `node test/live/prod-replay.mjs --limit=1000`（`~/.dsh-desktop/sessions/**` 341 日志只读） | 33 顶层会话 / 138 发射点：锚变化 127→84；wire view 1 983 854B（均值 60 117B）；最大冷构建 912.7ms（49 387 事件）；可见行 100 016→48 472 | 账本冷构建 + 锚 + 精简行数 |
| 审查子代理 | `.anote/reviews/dsh-nano-progress-report/DNPR01/`（gitignored 不入库） | 3 路：真相层对账 / 完成度 / 假绿·侧载 | 全部完成项 |

---

## 3. Hard-gate 判定

| Gate | 判据 | 实测 | 判定 |
|------|------|------|------|
| `T00` 工作树干净 + §7 锚 | 干净树且锚全部对上 | `git status` clean；§7 各符号逐项核对 | ✅ PASS |
| 锚模板 `T-O-12` 逐字 | header + 四行、零计数省略、只剩首行返回 `''` | `test/host-context.test.mjs` 锁逐字 | ✅ PASS |
| 单一注册单元 | 注册表只有一个 `sessionProjections.register` 且 key 为 ledger | `test/release-cut.test.mjs` | ✅ PASS |
| 无双 key / 无证据字段 / 无命令原文 | 状态无 `evidence`、bash 不存命令、失败存指纹不存参数 | `test/ledger.test.mjs`、`test/host-boundary.test.mjs` | ✅ PASS |
| `0.2.0` 可 pack | `npm pack --dry-run` 含 lib 三件套 | 10 文件，49.1kB | ✅ PASS |
| `test/live/*.live.mjs` 浏览器实测 | 计划标注「live（可选，不作闸门）」 | 未跑 | ⏸ 非闸门，如实登记 |
| C1-03 归属一致率 | ≥30 人工标注区间 | 未跑（范围外 `T-O-16`） | ⏸ 范围外，如实登记 |

---

## 4. Deferred / Carry-over ledger

| 项 | 类型 | 当前状态 | 承接位置 / 触发条件 | 责任方 |
|----|------|----------|---------------------|--------|
| C1-03 归属标注（≥30 区间） | A | 未跑 | `T-O-16` 重开条件：R1/R3/R5/R7 之外再改约 | [业主] |
| C2-02/03/06、C2-07/R6、C3、C5-02 skill、C6-02/03、`conversation.view`、分段控件、身份过滤 | A | 不做 | spec 附录 B；重开条件 `T-O-16` | [业主] |
| 旧检查点迁移、`Config` 化上限 | A | 不做 | 重开条件 `T-O-16` | [业主] |
| `deploy-local` / `RELEASE.md` / CI / 附录 C 89 文件 | A | 不执行 | [业主] 按 `RELEASE.md` 安排 | [业主] |
| `test/live/*.live.mjs` 浏览器实测增补 | B | 未跑（非闸门） | 任意一次 dev live 会话时补充 | 本包后继工作 |
| 精确 UI 行数对比（含 C 层剥除） | B | 近似值已登记 | 需宿主 Definition 引擎驱动或 live 实测 | 本包后继工作 |
| worktree 删除 | — | 合并后即删 | 合并完成后 | `lead` |
| 包发布 `npm publish` / `deploy-local` | C | 待 [业主] | [业主] 发车 | [业主] |

---

## 5. 诚实收口声明

| 收口纪律 | 兑现声明 |
|----------|----------|
| 每个 ✅ 归类 5 态 | ✅ —— 全部 ✅ 均为 `verified`（commit + 测试/回放 + 时间戳四元组） |
| ✅ 证据为四元组 | ✅ —— §1 每行 commit + test + run-time，无裸 file:line |
| scope diff 守卫 | ✅ —— `git diff --stat` 只含 `dsh-nano-progress-report/` + `docs/specs/dsh-nano-progress-report/` + FUS 一行；`.anote/`、`evidence/` gitignored 不入库 |
| deferred 三分类 | ✅ —— §4 逐项 A/B/C 并标责任方与触发条件 |
| owner-test 未复测标 ⏸ | ✅ —— live 实测与 C1-03 均标 ⏸，未写「我修了」式断言 |

---

## 6. Handoff / 下阶段 entry-gate 预核对

| 入口条件 | 状态 | 备注 |
|----------|------|------|
| 真相层 `T-O-13/14/15/16/17` 落地 | ✅ | 账本 + 锚 + 精简 + 面板与冻结句一一对应，见计划 §8.4 |
| 单一注册单元，无 summary key 残留 | ✅ | `test/release-cut.test.mjs` 锁死；`git rm` 已提交 |
| 版本 `0.2.0` + `engines.dsh` 不变 | ✅ | `package.json:3,30` |
| 合并提交存在、worktree 已删 | ⏸ | 随本阶段收尾；删前 `git status` clean |
| `deploy-local` 权限 | ⏸ | [业主] 授权范围外，本阶段不执行 |

**下阶段 kickoff checklist**：
- [ ] 引用本 closure 与计划 §11 作为 truth anchor
- [ ] 任何范围外项（C3、C5-02、C6、C2-07…）开工前必须先看 `T-O-16` 重开条件与 [业主] 裁决
- [ ] `deploy-local` 前确认 `npm pack --dry-run` 的 lib 三件套与 `version` 一致

---

## 7. Cross-cut 不变量（0-drift 确认）

| 不变量 | 状态 | 证据 |
|--------|------|------|
| `engines.dsh >=0.2.2-rc.5 <0.3.0` | ✅ 保持 | `package.json:30` 未改；`release-cut` 断言 |
| 不 `ctx.provide`、不新增路由 | ✅ 保持 | `src/host/index.js` 无 `provide`/`route`；`contract.test.mjs`「no routes」断言 |
| 账本不存命令原文 / args / result / 消息正文 | ✅ 保持 | `test/ledger.test.mjs`、`test/host-boundary.test.mjs`、`test/read-progress.test.mjs` |
| 投影不可变性（未变 → 同引用） | ✅ 保持 | `ledger.js` WeakMap 双缓存；`test/ledger.test.mjs` 断言 `view(state) === view(state)` |
| UI 无手绘控件 / 无色值 / 无自绘状态栏 | ✅ 保持 | `check-ui-rules` NPR 行 0 告警 + `test/view.test.mjs` 源码断言 |
| `conversation.view` 不注册 | ✅ 保持 | `contract.test.mjs`「not include 'conversation.view'」断言（R5 裁决） |
| `inject` 恰好 `['sessionProjections','systemPrompt','agents','tools']` | ✅ 保持 | `contract.test.mjs` 断言 inject 集合 |

---

## 8. 审查子代理登记（INFO#3）

| 路 | 面 | 提示词 | 报告 |
|----|----|--------|------|
| R1 | 真相层对账（`T-O-1…17` vs 实现） | `.anote/reviews/dsh-nano-progress-report/DNPR01/prompt-r1-truth.md` | `.anote/reviews/dsh-nano-progress-report/DNPR01/report-r1-truth.md` |
| R2 | 工作完成度（计划 §8 全表 vs 提交） | `.anote/reviews/dsh-nano-progress-report/DNPR01/prompt-r2-completeness.md` | `.anote/reviews/dsh-nano-progress-report/DNPR01/report-r2-completeness.md` |
| R3 | 防测试假绿 / 防业务侧载 | `.anote/reviews/dsh-nano-progress-report/DNPR01/prompt-r3-greenside.md` | `.anote/reviews/dsh-nano-progress-report/DNPR01/report-r3-greenside.md` |

> 汇聚结论：三路均报「实现与冻结语义一致」；无 blocking 缺陷；一条 medium 观察（`test/contract.test.mjs:63-85` 的 `engines.dsh.includes('>=')` 弱断言）已按 review 建议在 `test/release-cut.test.mjs` 强化为逐字断言 `version==='0.2.0'` 与 `engines.dsh==='>=0.2.2-rc.5 <0.3.0'`。

---

## 9. Closing statement + 定位裁定

DNPR01 把 [DNPR] 从「会话事件流水的第二视角渲染器」升级为「一份带版本的会话进度账本 + 模型面 + 人类面」：账本（`nano-progress-report:ledger`）是唯一的真源，四行锚与 `read_progress` 是模型面，A/B/C 精简时间线与账本驱动的 Tasks/Files/Failures/Jobs 是人类面。三处消费同一份推导，互不侧载；`[PROD]` 回放实测锚文本变化 −34%、按工作项分组的可见行 −52%，方向与 `T-O` 的设计目标一致。范围外项全部按 `T-O-16` 重开条件登记，未越界、`deploy-local` 未执行。
