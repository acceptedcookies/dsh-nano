# `todo.DNPR01` Action Todo — 会话进度账本（DNPR01-progress-ledger）

> 文档性质：`action-todo`（DAG-guided execution；不是新的设计或授权文件）
> 目标：按 `DNPR01-progress-ledger.md` 完成 [DNPR] 账本 + 模型通道硬切 + 人类视图精简 + 面板三列表 + 同次文档/版本收口
> In-scope：计划 §2.1 S1–S5
> Out-of-scope：计划 §2.2 O1–O4；C1-03 归属率（deferred）；live/deploy（[业主] 择时）
> 上游依据：[`qna/DNPR01-qna-truth.md`](../qna/DNPR01-qna-truth.md)（FROZEN）、[`DNPR01-progress-ledger.md`](./DNPR01-progress-ledger.md)（draft，由 [业主] 2026-11-20 发车指令授权执行）
> authority / owner：[业主] · 授权边界：本仓 worktree 内编码 + 一次合并回 `main`；deploy-local 不在授权内
> 基线：worktree `dnpr01-progress-ledger` @ `0dd99ab`；锚复核已 PASS（全部 A-* 符号命中，2026-11-20）
> 文档状态：`executing` · 执行状态：`in-progress`

## 1. 核心脊

- **目标与边界**：交付计划 §3 全部 14 个工作项；不交付 O1–O4、不另立第二真源、不新增 release-gate。
- **权威与决策**：已冻结依据为 `T-O-1`–`T-O-17`（真相层为准）；执行锁定的字面（present 三句、概览状态词、未知 id 抛错句）改动需回 [业主]。
- **完成定义**：`T-O-17` 四项同时成立（`T-O-14` 验证通过且 C1-03 除外、合并 main、AGENTS+spec 回写、worktree 删除）。
- **证据原则**：每个 Test-ID 带合并 commit + 测试/命令 + UTC；`npm test` 总绿不是证据。
- **执行回写**：每完成一个 Phase 分组 commit 并回本文件勾选。

## 2. DAG / 节点台账

```text
PH0 ──▶ PH1 ──▶ PH2 ──▶ PH3 ──▶ PH6 ──▶ MERGE
           │       │
           └──▶ PH4 ──▶ PH5 ──┘
```

| 节点 | 动作 | depends on | exit condition |
|------|------|------------|----------------|
| PH0 | worktree + 锚复核 | — | 全部 A-* 符号命中（已 PASS） |
| PH1 | `src/shared/{open,fingerprint,condense}.js` + 现有用例仍绿 | PH0 | T01/T02 |
| PH2 | `src/host/ledger.js` + 注册 + `test/ledger.test.mjs` | PH1 | T03/T04/T05/T06（summary 暂留，此提交非合并提交） |
| PH3 | 锚硬切 + `read_progress` + 删 summary 单元/summary.js | PH2 | T06/T07/T08/T09/T10/T11/T19 |
| PH4 | C0+C7 时间线精简 + schedule 开组 + lifecycle/completed-turn 隐藏 | PH1 | T02/T12/T13 |
| PH5 | 面板 Tasks/Files/Failures + 删 task-times + C2-05 | PH2,PH4 | T14/T15 |
| PH6 | AGENTS.md + spec-v1.1 + FUS 一行 + version 0.2.0 + 验证 + §11 回填 | PH3,PH5 | T16/T17/T18 |

## 3. 工作项清单

- [x] `PH0` — worktree 与锚复核
  - 落点：`.agents/worktrees/dnpr01-progress-ledger`；计划 §7 全表
  - 执行状态：complete · 2026-11-20T02:20+08:00 · 证据：本文件；13 个符号 grep 全命中（A-1..A-25 抽查 + version/engines 行）
- [ ] `PH1` — 共用指纹与分层纯函数
  - 落点：`src/shared/fingerprint.js`、`src/shared/open.js`、`src/shared/condense.js`；`src/host/projection.js` 改引 shared
  - 完成判据：`test/host-projection.test.mjs` 字节不变仍全过；`test/fingerprint.test.mjs`、`test/condense.test.mjs` PASS
  - 验证映射：T01/T02
- [ ] `PH2` — 账本投影
  - 落点：`src/host/ledger.js`、`test/ledger.test.mjs`、`src/host/index.js` 注册
  - 完成判据：§5.3 的 12 条预期均有红绿断言；状态对象无 `evidence` 键；T06 注册测试通过
  - 验证映射：T03/T04/T05/T06
- [ ] `PH3` — 模型通道硬切
  - 落点：`src/host/context.js`、`src/host/read-progress.js`、`src/host/index.js`；删 `summary.js` + `progressProjection`
  - 完成判据：锚逐字模板 + 旧三行否定断言 + 工具字面/schema/when/未知 id/16KiB + 注册表无 summary key
  - 验证映射：T07/T08/T09/T10/T11/T19
- [ ] `PH4` — 人类时间线 C0/C7 + schedule 开组
  - 落点：`ProgressBody.jsx`、`Row.jsx`、`Turn.jsx`、`group.js`、`message.js`、`filter-menu` 菜单构造、`TasksView.jsx` pending glyph、`rows.js`
  - 完成判据：T12/T13；src/client 无 args/result/reasoning data-field；`schedule` 开组
- [ ] `PH5` — 面板三列表 + 删 task-times + C2-05
  - 落点：`TasksSection.jsx`、`TasksView.jsx`、`ProgressBody.jsx`、`Turn.jsx`；删 `src/client/task-times.js` + `test/task-times.test.mjs`
  - 完成判据：T14/T15；面板改读 ledger wire；56px 列有回合耗时/非 completed 原因
- [ ] `PH6` — 文档/版本/验证/一次合并
  - 落点：`AGENTS.md`、`spec-v1.1.md`、FUS `:416` 一行、`package.json` version、本 todo、计划 §11
  - 完成判据：T16/T17/T18；`npm test` 全过 + `node scripts/check-ui-rules.mjs` NPR 0 + `npm run build` + `test/built-host.mjs` + `npm pack --dry-run`；计划 §11 回填；merge → main；worktree 删除

## 4. Check/状态台账

| Check-ID | 名称 | 覆盖 | 起跑线 | 状态 |
|----------|------|------|--------|------|
| DNPR-T00 | 锚复核 | A-1..A-25 | — | pass（2026-11-20，全符号命中） |
| DNPR-T01–T19 | 见计划 §8.1 | — | — | not-run |

## 5. 交接 / handoff

- 当前节点：PH1 进行中。
- 完成 handoff：合并提交含 `npm test` 数、check-ui-rules NPR 行、pack 输出与 [PROD] 回放原文（或「本机未复跑」）→ 写回计划 §11 与 closure。deploy-local 由 [业主] 择时。

---

## 附件 · 业主发车指令（全文注册）

# 工作范围与目标
仓库与分支: dsh-nano / main
目标: 按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作

## 本次工作涉及的编号
| 工作插件 | 工作波次 | 工作项目 | 子项阶段 |
|-------|-------|-------|-------|
| `dsh-nano-progress-report` | N/A | `DNPR01` | N/A |

---
## 原则
WARN#1 - 开始 `编码` 执行前, 必须保证工作树干净。如果工作树中有未保存的内容, 你会对内容进行分析, 然后在当前分支下完成 commit
WARN#2 - `业主授权`: 必须阅读 AGENTS.md 对应文档的指导下进行工作. 所有的工作必须建立独立的工作区
WARN#3 - 每一个 [执行计划] 中的 Phase 完成后, 你需要回到 todo.{工作项目}.md 中, 更新 checkbox 并登记执行状态, 不得在所有工作完成后一次性 tick 全部的 boxes
INFO#1 - 必须按照 [执行计划] 中的 DAG 中明确要求, 构建执行顺序。在构建 todo 文档的时候, 必须严格进行顺序 block 限制
INFO#2 - 工作波次是可选项。如果存在, 则下面的对应目录层级可以增加。如果没有指定, 则忽略这个层级
INFO#3 - 代码审查子代理的的 `专用审查PROMPT` 以及审查产出的 review 报告, 需要落盘于 [.anote/reviews/{工作阶段}/{工作项目}] 文件夹
INFO#4 - 按照 [执行计划], 在 `业主授权` 规范下, 有权对 workers 集群进行 live migration + rebuild + deploy , 并授权你在当前 `工作阶段` + `工作项目` 的框架内完成 digest 的创建与 SSOT 建立

---
## 上游必读文件
最终执行计划: [docs/specs/dsh-nano-progress-report/plan/DNPR01-progress-ledger.md]
真相层: [docs/specs/dsh-nano-progress-report/qna/DNPR01-qna-truth.md]

---
## 工作方法
STEP.0 - 在 [执行计划] 位于的目录内, 在 `todo计划模板` 规范下创建 todo.{工作项目}.md 这个跟踪对象, 以 DAG + checkbox 的创建任务执行的跟踪文件. 你会将本次发车的完整指令, 作为附件, 注入在 todo 文档底部
STEP.1 - 重新拉取本阶段使用的全部上游必读文件, 并对工作区域的代码进行梳理, 从结构上理解当前工作区域的性质, 业务流转的方向, 建立对当前业务的横向层面认知
STEP.2 - 在建立横向认知后, 对重点代码的 git 历史进行回溯, 建立起从时间轴纵向上, 对焦点代码的历史沿革的认知。创建对 git HASH 映射关系的图谱
STEP.3 - 从横向和纵向上建立执行关系后, 判断是否存在对应的 reference-anchor, 是否拥有正例/反例可供参考, 是否在 context/ 内存在对应的参考系可以进行借鉴
STEP.4 - 在获得全部上下文后, 你会严格在 [工作目标] 的范围内, 按照 [执行计划] 中的详细要求, 进行完整, 完全的代码开发, 静态审查, 以及测试收口工作。在执行期间内每完成一个 Phase, 就对当前阶段对应的代码完成分组 commit
STEP.5 - 全部编码工作完成后, 使用 `工作日志模板` 创建 [工作日志] 并回填至 [执行计划] 文档的底部
STEP.6 - 按照 todo 中的安排, 完成全部的工作后, 按照 `closure模板` 要求, 输出本阶段 closure 文件至 docs/specs/{工作插件}/closure/{工作波次}/{工作项目}-closure.md
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

> **登记说明**：本 directive 即 [业主] 开工授权（计划 `draft → executing` 的生效依据）。STEP.6 的 closure 文件按指令产出（`T-O-17`「不另立收口文档」在 [业主] 新指令下作记录性 closure 解释——它是执行账，不是第二真源台账）。
