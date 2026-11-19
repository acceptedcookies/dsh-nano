# DNLS03 Action Todo — 受管 sandbox 控制面
[执行计划](DNLS03-managed-sandbox-control.md) · [真相层](../qna/DNLS03-qna-truth.md) · [决策来源](../qna/DNLS03-qna.md)

## 1. 目标与边界
[业主] 本次 directive 是实现、测试及分组提交的授权，不是重新裁决 T-O-33 至 T-O-54。只交付计划 §2 的 Case 1/3 和点名的消费面；不改官方 pin、第三方与 local 协议，不做 Case 2/4、远端 provider、版本、tag 或发布。计划不依赖 workers 上线。

## 2. 顺序锁
P0 → P1 → P2 → P3；P3 → P4 → P5；P3 → P6；(P1, P6) → P7；(P5, P7) → P8 → 日志与 closure → 三路独立审查 → 核实、修复与交接。本轮串行调度 P0 至 P8。每个 block 须先有前序出口证据；P0 任一测量锚不符即停工回问答。每一 Phase 完成当即回写状态、UTC、提交与点名测试证据；缺证不打勾，宿主依赖不冒充可用。

## 3. 工作台账

### Phase 0
- [x] **P0-01** 语义 worktree — `.agents/worktrees/dnls03-managed-sandbox-control`；后续改动不落在当前 `main` 工作区（`DNLS03-T00`）— 已收口：worktree 位于 `18ea26f`（`git worktree list` / 分支 `dnls03-managed-sandbox-control`），UTC `2026-11-19T16:09:42Z`
- [ ] **P0-02** 复核测量锚 — §7.1 锚表；任一锚不符则停，回 QNA，不改目标态（`DNLS03-T00`）

### Phase 1
- [ ] **P1-01** 控制台账 — `src/host/control-registry.js`（新）；`profile-drivers.js:152` `stateRootFor`；每 env 一份 `registry.json`，同目录临时文件后原子替换（`DNLS03-T01`）
- [ ] **P1-02** 身份上移 — `instance-registry.js:18,28-43`；`sandboxId` 分配一次；session 只是使用绑定（`DNLS03-T02`）
- [ ] **P1-03** 单写者 — `control-registry.js`；第二宿主写者被拒，无最后写入者胜出（`DNLS03-T03`）
- [ ] **P1-04** 重启对账 — `control-registry.js`；损坏、缺失有存量、版本不识别时不空表认领（`DNLS03-T04`）

### Phase 2
- [ ] **P2-01** 合同发现 — `routes.js` `registerRoutes`；`mcp-sandbox.js:189-229`；`GET /contract` 与 `sandbox.contract` 同源返回版本与能力，不授权（`DNLS03-T10`）
- [ ] **P2-02** 派发前配对 — `routes.js` 对象路由入口；`mcp-sandbox.js` tools/call 前；缺头或版本不符在访问对象前拒绝（`DNLS03-T11`）
- [ ] **P2-03** 七项错误 — `error-catalog.js:15,88-110`；七个 `sandbox.*` 不随 active profile 改前缀（`DNLS03-T12`）
- [ ] **P2-04** 单目标 — `routes.js` 对象 handler；`mcp-sandbox.js:229`；缺失、空、重复、冲突、sessionId 兜底都不执行（`DNLS03-T13`）
- [ ] **P2-05** 绑定投影 — `lib/bindings.js:12-34`；`src/perf/declaration.json:11-41`；新路由进既有 bake；`dnls.control` 绑定 id 保持为 `/control`（`DNLS03-T14`）

### Phase 3
- [ ] **P3-01** 操作文档 — `control-registry.js`；`routes.js` lifecycle；`(主体,requestId)` 去重；未结束 202；派发后取消返回现态（`DNLS03-T20`）
- [ ] **P3-02** 断线 ≠ 取消 — `routes.js:1469-1471,2268-2270`；客户端断连不再把操作标成 `cancelled`（`DNLS03-T21`）
- [ ] **P3-03** 主体与对象授权 — 新 `src/host/object-authz.js`，挂在对象路由之前；只调用 `connection.admit`（pin `rpc.ts:240`，不改 pin）；404/403 分开；审计无 attach URL 与输入（`DNLS03-T22`）

### Phase 4
- [ ] **P4-01** create/attach 分离 — `term-bridge.js:23-44,124-125`；`terminal-driver.js:4-39`；create 与 list 的返回值没有 URL（`DNLS03-T30`）
- [ ] **P4-02** 环境内 broker — `profiles/terminal/pty-entry.mjs`；`backend-apple.js:289` 不再是「只有容器名和 /bin/sh」这一条路径的全部；只重启宿主后，新输入进入同一原执行（`DNLS03-T31`）
- [ ] **P4-03** 创建键 — `term-bridge.js`；同参返原引用；已结束不复活；attach 失联不 spawn（`DNLS03-T32`）

### Phase 5
- [ ] **P5-01** wire 硬切 — `term-ws.js`；`term-bridge.js:50` 附近 ready；open 必须 `v:2,align:1,session:<terminalId>`；沿用既有帧集与逐连接流控；无 v1 降级（`DNLS03-T40`）
- [ ] **P5-02** 两次核权 — upgrade 路径；`src/host/object-authz.js`（新）；删除 `term-bridge.js:44` 的 token query；locator 无 bearer；直连 broker 不是授权；撤权 detach 且 PTY 仍在（`DNLS03-T41`）
- [ ] **P5-03** [DNT] 沙箱消费同切 — `dsh-nano-terminal` 里只接 sandbox attach 的 McpLane 调用点；local lane 协议字节不变（`DNLS03-T42`）

### Phase 6
- [ ] **P6-01** 服务预留 — `routes.js:1114-1127`；`profile-drivers.js:138-149`；`profile.yaml:25-56`；地址只来自同一对象的 inspect；邻号被占不影响（`DNLS03-T50`）
- [ ] **P6-02** 修订 — `control-registry.js`；保存候选不启停；`appliedRevision` 只是回执（`DNLS03-T51`）
- [ ] **P6-03** 分钟库 — `src/host/usage-minutes.js`（新）；`backend-apple.js:190-197`；24h/7d/30d 查同一份槽；断段不插值（`DNLS03-T52`）

### Phase 7
- [ ] **P7-01** fleet 投影 — `routes.js` 新只读路由；`observe.js:34` 不得升格为恢复真源；窄行不含正文/路径/凭证；进程默认 50、上限 200（`DNLS03-T60`）
- [ ] **P7-02** 计额与只停 — `instance-registry.js:42,91-98`；`control-registry.js`；创建/接管先原子占位；两 session 只占一格；stop 后台账行还在（`DNLS03-T61`）

### Phase 8
- [ ] **P8-01** 管理出口 — `package.json:12-30`；`src/client/`（新，仅在有宿主槽位时）；无槽位则显式宿主依赖，不覆盖宿主命令（`DNLS03-T70`）
- [ ] **P8-02** 资源交接 — 新 `src/host/terminal-resource.js`：向宿主公开资源导航注册 `sandbox-terminal`，不新 lane、不私有 import [DNT]；地址无 token；恢复只 attach（`DNLS03-T71`）
- [ ] **P8-03** 文档同切 — `dsh-nano-local-sandbox/AGENTS.md` 身份表与「使用」表；人读说明与目标态一致；版本号仍读 package.json，不写死 1.3（`DNLS03-T72`）

### 收口测试与工作方法收尾
- [ ] **DNLS03-T80** mega — `test/dnls03-journey.mega.test.mjs`：公开面同切，从发现到 attach 的夹具旅程，中间无 v1、无 session 主键（Phase 8 出口）
- [ ] **DNLS03-T81** soak N=20 — `test/registry-race.soak.test.mjs`：两写者交错 + 空闲 stop 与新 attach 竞态，N=20 顺序稳定（P1-03 + P7-02）
- [ ] **STEP.5** — 以 `工作日志模板` 创建 [工作日志] 并回填至执行计划文档底部
- [ ] **STEP.6** — 以 `closure模板` 输出 closure 至 `../closure/DNLS03-closure.md`
- [ ] **STEP.7** — 三路独立审查（真相层对账 / 工作完成度 / 防测试假绿·防业务侧载），PROMPT 与报告落盘 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/`
- [ ] **STEP.8** — 回收、汇聚、核实全部审查报告，执行更新或修复并重入 测试↔修复 循环直至收口，更新 closure

## 4. 执行记录与证据
执行状态：P0 进行中。开工点 `18ea26f`。主工作区保存原状：`9061673` [DNPR]，`909fa3f` 已移除的清单，`18ea26f` 计划与问答。`git fetch origin main` 后本地无落后提交。每笔 PASS 记录提交、命令、观测与 UTC；测试 ID 的否证以计划 §8.1、§8.5 为准。

## 5. 交接
当前节点 P0-02。下一步：在隔离树核对计划 §7.1；不把旧包的绿灯当作新实现。审查存放 `.anote/reviews/dsh-nano-local-sandbox/DNLS03/`；closure 存放 `../closure/DNLS03-closure.md`。未到阶段不签收。

## 附件：原始发车指令
登记 ID：`DNLS03-managed-sandbox-control/directive-1`。以下为本次授权原文，引用此处，不另建授权副本。

```text
# 工作范围与目标
仓库与分支: dsh-nano / main
目标: 按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作

## 本次工作涉及的编号
| 工作插件 | 工作波次 | 工作项目 | 子项阶段 |
|-------|-------|-------|-------|
| `dsh-nano-local-sandbox` | N/A | `DNLS03` | N/A |

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
最终执行计划: [docs/specs/dsh-nano-local-sandbox/plan/DNLS03-managed-sandbox-control.md]
真相层: [docs/specs/dsh-nano-local-sandbox/qna/DNLS03-qna-truth.md]

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
```
