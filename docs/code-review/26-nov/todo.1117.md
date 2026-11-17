# `ACE-1117` Action Todo — 异步压缩执行阶段收口

> 文档性质：`action-todo`（DAG-guided execution；不是新的设计或授权文件）
> 目标：完成 `ACE-1117-action-plan.md` 全部编码 + 测试收口（T01–T19）+ 工作日志 + closure + ≥3 路审查
> In-scope：[DNMSC] `lib/` 策略/region/host-compaction/工具/账本、[DNMS] 生成副本与客户端心跳/入口、gen-mutex-patch 与 cordis.patch.yml、closure 两处
> Out-of-scope：宿主文件、`async-compaction.md`、`RELEASE.md`、DNMS01 真相正文、新 release-gate、版本号、R-16.2/16.5/17/18
> 上游依据：`ACE-1117-action-plan.md` + `ACE-1117-qna-truth.md`（fb7264d 行号锚 + AF-14 改读）
> 关联 action-plan：`docs/code-review/26-nov/ACE-1117-action-plan.md`
> authority / owner：[业主] · 授权边界：本次发车指令即 implementation grant；不含 deploy/装包/发布
> 基线：worktree `.agents/worktrees/ace-1117-async-compact` @ `fb7264d`（branch `ace-1117-async-compact`）
> 文档状态：`executing` · 执行状态：`in-progress`

## 1. 核心脊

- **目标与边界**：交付 §1.2 Phase 1–6 全部工作项与 T01–T19 按 §8.5「怎样才算数」通过；不交付发布、部署、新闸、host 改动。
- **权威与决策**：已冻结依据 = `ACE-1117-qna-truth.md`（B01–B13、01–11、CORR-1、AF-1..14）；冲突时回问答 append-only，不在 todo 裁决。
- **完成定义**：T01–T19 PASS 且四元组齐全；`git diff fb7264d...HEAD` 仅含 ACE-1117 目标面；closure 落盘；≥3 路审查回收并处置完毕。
- **证据原则**：PASS 必须带（commit + test + 时间 + 命令）四元组；「看起来正常」不算。
- **执行回写**：每完成一个 Phase 立刻勾 checkbox 并登记；不得收尾时一次 tick 全部。
- **交接原则**：阻塞项写明原因、下一动作、承接方（默认回 [业主]）。

## 2. 依赖关系 / DAG

```text
SETUP ──▶ P1 策略硬切+烘焙 ──▶ P2 工具+patch ──┐
    │                        └──▶ P3 生命周期+互斥 ──┤
    │                                               ▼
    │                                        P4 选择器+prompt+帧
    │                                               │
    └──────────────────────────────────────────▶ P5 观测+UI心跳(依赖P3)
                                                    │
                                        P6 closure 两处（依赖 P4+P5）
                                                    │
                                          LOG 回填 + CLOSURE 落盘
                                                    │
                                        REVIEW ≥3路 → FIX/测试循环 → 更新 closure
```

> 约束：P2 与 P3 可并行准备，但 P4 必须等二者提交都在树上；合入顺序严格 1→2→3→4→5→6。P5 依赖 P3 的 phase 语义；committed 展示不依赖 P4。

| 节点 | 目的 | depends on | exit | failure |
|------|------|-----------|------|---------|
| SETUP | 干净树、worktree、todo | - | todo 落盘 | 回 main 处理 |
| P1 | 策略/prompt/烘焙/hash | SETUP | T01–T04 PASS | 停在该项回业主 |
| P2 | 工具+patch 覆盖 | P1 | T05–T07 PASS | 同上 |
| P3 | 生命周期+互斥 | P1 | T08–T11 PASS | 同上 |
| P4 | 选择器+prompt+帧 | P2+P3 | T12–T14 PASS | 同上 |
| P5 | projection+定时器+入口 | P3 | T15–T18 PASS | 同上 |
| P6 | closure 两处+非目标核对 | P4+P5 | T19 PASS | 同上 |
| LOG | 执行日志回填 plan §11 | P6 | 日志落盘 | - |
| CLOS | closure 落盘 | LOG | closure 落盘 | - |
| REV | ≥3 路审查+修复 | CLOS | 报告处置完毕 | 回业主 |

## 3. 工作项清单

- [x] `SETUP` — 干净树 → commit 未保存内容 → worktree @ fb7264d → 本 todo
  - **完成判据**：`git status` 干净 + worktree 在 `.agents/worktrees/` 且 base=fb7264d
  - **验证映射**：`-` · **依赖**：`-`
  - **执行状态**：`done` · **时间**：`2026-11-17` · **证据**：main `8c8009a`+`3c66bcf`；worktree `.agents/worktrees/ace-1117-async-compact` @ `fb7264d`

- [x] `S1-SURVEY` — STEP.1/2/3：横向代码梳理 + git 历史回溯 + 锚点核对（§7 A-1..A-23）
  - **完成判据**：两个包 AGENTS.md 读完；§7 锚行号在 fb7264d 上复核；git HASH 图谱建立
  - **验证映射**：`-` · **依赖**：`SETUP`
  - **执行状态**：`done` · **时间**：`2026-11-17` · **证据**：DNMSC+DNMS 全量梳理；agent-29 git 回溯报告；`fb7264d..main` 零焦点文件 diff；compact-policy 双副本 byte-identical 已核实；宿主 `ctx.tools.register({when})` API 与 base 扁平 compaction-basic 行已核实

- [x] `P1` — Phase 1 策略硬切与共享烘焙（P1-01..P1-04）
  - **落点**：DNMSC `compact-policy.js`、DNMS 生成副本、`compact-region.js` instructionText、CompactPanel、bake 脚本、测试
  - **完成判据**：S≠0.90 读入 invalid-range；H≥B/B≥S 为 400；summaryPrompt 键即 invalid-schema；extraRequirements≤4000；烘焙二次无 diff；协议 hash 锁定
  - **验证映射**：`ACE1117-T01..T04` · **依赖**：`S1-SURVEY`
  - **执行状态**：`done` · **时间**：`2026-11-17T16:10+08:00` · **证据**：DNMSC 16/16 + DNMS 65/67(2skip) `node --test`；0.80→state-read-failed 字节不变；H=B/B=S 均 invalid-range；bake 两次无 diff；协议 hash 5dd74efa3601；AGENTS.md 同步

- [x] `P2` — Phase 2 工具与 base 覆盖（P2-01..P2-03）
  - **落点**：🆕 `inspect-checkpoint.js` + package.json exports、gen-mutex-patch、cordis.patch.yml
  - **完成判据**：工具行在 isolate 外、与 Provider 行同生共灭；base 扁平 disabled；威胁模型用例全部拒绝
  - **验证映射**：`ACE1117-T05..T07` · **依赖**：`P1`
  - **执行状态**：`done` · **时间**：`2026-11-17T16:30+08:00` · **证据**：DNMSC 45/45 PASS；T07 结构断言（tools 行在 isolate 外、base 扁平 disabled、四 preset 锚/别名覆盖）；威胁用例（wrong id/empty surface/no session/坏参数）全部 reject

- [x] `P3` — Phase 3 生命周期与互斥（P3-01..P3-04）
  - **落点**：`host-compaction.js` 头注/idle/超时/互斥/disarm/episode 删除
  - **完成判据**：arm 即 running；idle+ready 经 runMaintenance 提交；四入口 preempted 不计 circuit；timeout 结算；Map 删除；disarm 三种触发
  - **验证映射**：`ACE1117-T08..T11` · **依赖**：`P1`
  - **执行状态**：`done` · **时间**：`2026-11-17T17:00+08:00` · **证据**：DNMSC 51/51 PASS；T09 四 lane 各记 `preempted`；T10 假时钟 120s 结算+GC+去抖+no-window；T11 三 disarm 触发皆 `disarmed`/`bracketed:false`

- [x] `P4` — Phase 4 选择器、prompt、帧（P4-01..P4-04）
  - **落点**：`compact-region.js` 选择器+prompt+帧、四 lane 调用点、async-history select
  - **完成判据**：三级边界 turn→step→node；旧累加循环删除；帧字段闭合含工具名；八节顺序锁定；select 记账；账本抛错不挡提交
  - **验证映射**：`ACE1117-T12..T14` · **依赖**：`P2`+`P3`
  - **执行状态**：`done` · **时间**：`2026-11-17T16:45+08:00` · **证据**：DNMSC 54/54 PASS；T12 三级+距离+同距+null；T13 八节序/:222 删除/帧字段/步骤级 verbatim；T14 四 lane 各记 select + 死账本仍提交；DNMS 67/67（烘焙副本 hash 7e2b99893bea）

- [x] `P5` — Phase 5 观测与 UI 心跳（P5-01..P5-04）
  - **落点**：DNMS `index.js`、`compact-runtime.js`、四个 jsx、locale、DETAIL.zh、AGENTS.md、declaration.json、重建 lib/client.js+perf-declaration
  - **完成判据**：projection 按 session；无 sessionId→null；四条常驻调度全退役；3000ms 仅在 running+在途续拉；顶栏保持；开关确认；中英键相等
  - **验证映射**：`ACE1117-T15..T18` · **依赖**：`P3`
  - **执行状态**：`done` · **时间**：`2026-11-17T19:30+08:00` · **证据**：commit a8a48b0（19 文件 +859/−216）；DNMS 77/77 PASS（T15 session 范围+select→running+commit→idle；T16 产物无 15000/30000、mock-timers 泵纪律、预算 3000；T17 确认前置 POST 0→1、严格序、i18n 键集等；T18 ui-rules vs HEAD ⊆）；DNMSC 54/54 不破

- [x] `P6` — Phase 6 收口（P6-01..P6-02）
  - **落点**：`closure/DNMS01-closure.md:20,74` + 移动 audit-agent27 + 非目标 diff 核对
  - **完成判据**：只碰两处；`fb7264d...HEAD` 非目标面零 diff；无新 check 脚本
  - **验证映射**：`ACE1117-T19` · **依赖**：`P4`+`P5`
  - **执行状态**：`done` · **时间**：`2026-11-17T19:40+08:00` · **证据**：commit 231eb0b；T19 PASS（hunk 锚点 :20/:74、非目标零 diff、version 未动、无 check-ace*）；audit-agent27 核实为缺失空档、按核实改写 :74

- [x] `LOG` — 执行日志按 `code-execution-log.md` 模板回填至 action-plan §11
  - **完成判据**：逐工作项状态 + 偏差 + pre-existing 甩锅 + 测试发现
  - **验证映射**：`-` · **依赖**：`P6`
  - **执行状态**：`done` · **时间**：`2026-11-17T19:45+08:00` · **证据**：§11.A 追加于 main checkout 的 `ACE-1117-action-plan.md`（worktree 不含该文件——ACE 冻结面只在 main；合入后统一提交）

- [x] `CLOS` — closure 按 `closure.md` 模板落盘 `docs/code-review/26-nov/ACE-1117-closure.md`
  - **完成判据**：close-type 正确；✅ 全带四元组与 5 态归类；deferred 三分类
  - **验证映射**：`-` · **依赖**：`LOG`
  - **执行状态**：`done` · **时间**：`2026-11-17T19:50+08:00` · **证据**：`docs/code-review/26-nov/ACE-1117-closure.md` 117 行，close-type=`implementation-complete-awaiting-live-verification`

- [x] `REV` — ≥3 路审查子代理（真相层对账 / 完成度 / 防假绿·防侧载），报告落盘 `.anote/reviews/ACE/1117/`
  - **完成判据**：每路专用 PROMPT；报告落盘；发现项逐条处置；修复后重测
  - **验证映射**：审查报告 · **依赖**：`CLOS`
  - **执行状态**：`done` · **时间**：`2026-11-17T20:10+08:00` · **证据**：`.anote/reviews/ACE/1117/exec-58caf6a/` 三份 prompt+report+复评；truth/completeness 首轮 FAIL→修复 `c21cc9c`→复评 PASS；antigreen 首轮 PASS（有条件）→残余 `5a59730` 清理

- [x] `FIX` — 审查发现的修复 + 测试↔修复循环 + closure 更新 + 合入 main + worktree 清理
  - **完成判据**：T01–T19 仍 PASS；closure 反映最终状态；`git worktree remove`
  - **验证映射**：全部 Test-ID · **依赖**：`REV`
  - **执行状态**：`done` · **时间**：`2026-11-17T20:15+08:00` · **证据**：FIX 提交 `c21cc9c`+`5a59730`；DNMSC 57/57、DNMS 77/77；closure §0/§2/§6 更新；合入 main 与 worktree 清理随后执行
  - **执行状态**：`not-started` · **时间**：`-` · **证据**：`-`

## 4. 验收与证据

| Check ID | 验证什么 | 方法 | 预期 | 实际 | 状态 |
|----------|----------|------|------|------|------|
| T01–T19 | 计划 §8.1 测试台账 | 各包 `node --test test/*.test.mjs` + `scripts/test-all.mjs` | 按 §8.5 右列 | 未跑 | pending |
| DIFF | 非目标面零 diff | `git diff --name-only fb7264d...HEAD` | 仅 ACE 目标面 | 未跑 | pending |
| REVIEW | ≥3 路审查 | subagent + `.anote/reviews/ACE/1117/` | 报告落盘并处置 | 未跑 | pending |

## 5. 当前状态与交接

- **当前节点**：`SETUP` 完成提交；worktree 已建
- **下一动作**：`S1-SURVEY`
- **当前阻塞**：无
- **待 owner 决定**：实施期委托项（字段名/识别方式/节奏/账本格式）按 `-11③` 实施取定，不回问答
- **最终交接目标**：合入 main + closure + worktree 清理 → [业主] 发布决策

## 6. 已启用插件

- `P-RED` — 修缺陷必带 first-red（B11 清单即原始 RED）
- `P-SCOPE` — 允许面 = §1.5 影响结构图；禁止面 = 宿主文件、context/、非目标路径
- `P-REF` — §7 A-1..A-23 锚表 + §7.2 反例 ledger 为准
- `P-TEST` — §8.1 T01–T19 + §8.5 防假绿逐条
- `P-EXEC` — 每 Phase 完成后回写本 todo + plan §11
- `P-CLOSE` — closure.md 模板
- `P-LIVE` — 不启用（无远端/部署/装包授权）

---

## 附录：完整业主发车指令（注册本 directive）

> 以下原样登记，作为本 todo 的授权与边界来源：

```text
# 工作范围与目标
仓库与分支: dsh-nano / main
目标: 按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作

## 本次工作涉及的编号
| 工作插件 | 工作波次 | 工作项目 | 子项阶段 |
|-------|-------|-------|-------|
| `ACE` | N/A | `1117` | N/A |

## 原则
WARN#1 - 开始 `编码` 执行前, 必须保证工作树干净。如果工作树中有未保存的内容,
        你会对内容进行分析, 然后在当前分支下完成 commit
WARN#2 - `业主授权`: 必须阅读 AGENTS.md 对应文档的指导下进行工作
WARN#3 - 每一个 [执行计划] 中的 Phase 完成后, 你需要回到 todo.{工作项目}.md 中,
        更新 checkbox 并登记执行状态, 不得在所有工作完成后一次性 tick 全部的 boxes
INFO#1 - 必须按照 [执行计划] 中的 DAG 中明确要求, 构建执行顺序。
        在构建 todo 文档的时候, 必须严格进行顺序 block 限制
INFO#2 - 工作波次是可选项。如果存在, 则下面的对应目录层级可以增加。
        如果没有指定, 则忽略这个层级
INFO#3 - 代码审查子代理的的 `专用审查PROMPT` 以及审查产出的 review 报告,
        需要落盘于 [.anote/reviews/{工作阶段}/{工作项目}] 文件夹
INFO#4 - 按照 [执行计划], 在 `业主授权` 规范下, 有权对 workers 集群进行
        live migration + rebuild + deploy , 并授权你在当前 `工作阶段` +
        `工作项目` 的框架内完成 digest 的创建与 SSOT 建立

## 上游必读文件
最终执行计划: [docs/code-review/26-nov/ACE-1117-action-plan.md]
真相层: [docs/code-review/26-nov/ACE-1117-qna-truth.md]

## 工作方法
STEP.0 - 在 [执行计划] 位于的目录内, 在 `todo计划模板` 规范下创建 todo.{工作项目}.md
        这个跟踪对象, 以 DAG + checkbox 的创建任务执行的跟踪文件.
        你会将本次发车的完整指令, 作为附件, 注入在 todo 文档底部
STEP.1 - 重新拉取本阶段使用的全部上游必读文件, 并对工作区域的代码进行梳理,
        从结构上理解当前工作区域的性质, 业务流转的方向, 建立对当前业务的横向层面认知
STEP.2 - 在建立横向认知后, 对重点代码的 git 历史进行回溯, 建立起从时间轴纵向上,
        对焦点代码的历史沿革的认知。创建对 git HASH 映射关系的图谱
STEP.3 - 从横向和纵向上建立执行关系后, 判断是否存在对应的 reference-anchor,
        是否拥有正例/反例可供参考, 是否在 context/ 内存在对应的参考系可以进行借鉴
STEP.4 - 在获得全部上下文后, 你会严格在 [工作目标] 的范围内, 按照 [执行计划] 中的
        详细要求, 进行完整, 完全的代码开发, 静态审查, 以及测试收口工作。
        在执行期间内每完成一个 Phase, 就对当前阶段对应的代码完成分组 commit
STEP.5 - 全部编码工作完成后, 使用 `工作日志模板` 创建 [工作日志] 并回填至
        [执行计划] 文档的底部
STEP.6 - 按照 todo 中的安排, 完成全部的工作后, 按照 `closure模板` 要求,
        输出本阶段 closure 文件至 docs/code-review/26-nov/ACE-1117-closure.md
STEP.7 - 你会定制不少于3路从 **真相层对账**, **工作完成度**, **防测试假绿,防业务侧载**
        等工作面的审查子代理, 对当前 todo 内已完成工作内容进行深度审查。
        审查开始前, 请为每一路子代理, 定制其专用的 Comprehensive 进攻性
        `专用审查PROMPT`, 以便让子代理载入本次工作的 [执行计划] 后,
        对我们本次执行展开深度, 专注, 全面地展开工作质量与数量的全面回顾
STEP.8 - 回收子代理的代码审查报告, 在汇聚, 分析, 整理, 核实全部子代理的分析后,
        执行更新或修复。修复完成后再次进入 测试↔修复 循环, 直至完成本工作项目的收口。
        并更新 closure 文件

## 使用到的模板
`closure模板` = [.adocs/templates/closure.md]
`工作日志模板` = [.adocs/templates/code-execution-log.md]
`todo计划模板` = [.adocs/templates/action-todo.md]

# 发车指令
基于我的上述要求, 请立刻按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作
> Step.0 中的 todo 需要保留完整业主发车指令, 并注册本 directive
> 界定好边界后，业主建议你在 AGENTS.md 引导下，构建专用 worktree，并在独立工作树内，适当派发子代理进行同步工作
```
