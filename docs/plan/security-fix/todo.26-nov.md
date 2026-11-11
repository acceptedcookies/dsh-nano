# `todo.26-nov` Action Todo — `security-fix / 26-nov` 安全加固执行

> 文档性质：`action-todo`（DAG-guided execution tracker）
> 目标：按 `26-nov-security-hardening.md` 完成全部编码、测试与文档（含工作日志、closure、≥3 路审查），直至收口
> In-scope：四插件 `dsh-nano-*`、三共享包 `packages/dsh-{host-route-guard,remote-data-schema,html-policy}`、repo 根 `security/`、`scripts/`、`test/`、`.github/workflows/release.yml`
> Out-of-scope：平台层 CSP/iframe/worker 隔离、路由删除/UI 隐藏/数据迁移、公网认证重构、真实 `v*` tag 推送与 GitHub release
> 上游依据：`docs/plan/security-fix/26-nov-security-hardening.md`（本 AP）、`pre-security-fix-qna.md` v1.1（T-O-1…14 冻结真相）、`security-audit.md`（24 confirmed）
> authority / owner：业主（功能零回退 T-O-3 优先；授权 = AGENTS.md + 本仓库 owner 指令；无 `foundation/` 目录，以 AGENTS.md 为准）
> 基线：commit `90ac6b6`（工作树干净起算）
> 文档状态：`executing` · 执行状态：`in-progress`

## 1. 核心脊

- **目标与边界**：交付三共享包 + `security/` 四真源 + P0 13 条修复 + P2 9 条处置 + local-supply 2 条 + 四插件 minor→0.2.0 + 收口文档；**不得**删路由、改 UI、迁移数据位置（T-O-3/T-O-6）。
- **权威与决策**：冻结真相 = QNA T-O-1…14；执行中发现真相不成立 → 回 QNA 追加 `T-O-15+`，不在本 todo 偷偷裁决。
- **完成定义**：全部 Test-ID（`B0-*`…`B5-*`）PASS 且四元组证据齐（`commit + 测试/查询 + D1 实例 + run-time(UTC)`）；P0 13 PoC 全拒；feature-contract 零漂移；tarball 隔离安装激活；工作日志 + closure 落盘。
- **证据原则**：计数 ≠ 价值；PoC 重放须带 baseline-RED + 宿主副作用 oracle；「没抛错」不算拒绝。
- **执行回写**：每完成一个 Item 把 `[ ]`→`[x]` 并登记状态/UTC/证据；未跑、partial、blocked、deferred 保持未勾选并写 reason。

## 2. 依赖关系 / DAG

```text
PH1 batch0-baseline ──▶ PH2 batch1-host-data ──▶ PH3 batch2-content-render ──▶ PH4 batch3-p2-supply ──▶ PH5 release-closure ──▶ REVIEW(≥3) ──▶ closure
   (P1-01..P1-09)         (P2-01..P2-08)           (P3-01..P3-08)                (P4-01..P4-07)          (P5-01..P5-03)
       │                       │                        │                           │                        │
       └─gate B0              └─gate B1                └─gate B3                    └─gate B4                └─gate B5(mega+soak)
   内序: P1-02(路由枚举)→{P1-01,P1-06,P1-07}→P1-04(分发)→P1-05(迁移)
   P2 内序: P2-08(存量兼容前置闸) 校定后再冻结 P2-01 v1
```

- **每 Phase 完成即 commit 分组**（WARN#3/STEP.4）；每批门禁全过才进下一批（T-O-10）。
- **失败路径**：任一 P0 PoC 仍可执行 → 对应批次返工；`B1-T07` 兼容 <100% → 最小收紧 schema 重跑，仍不达标回 QNA；`B5-T02` 隔离安装失败 → 分发通道未净不得发版。

## 3. 工作项清单

### PH1 `batch0-baseline`（门禁 B0）
- [x] `P1-01` — `dsh-host-route-guard` 骨架 + `registerRoutes`（fail-closed connection、405/JSON、bodyLimit、未登记/陈旧 throw、route-inventory） — pass `bd4d6ad` · node --test 14/14
- [x] `P1-02` — `security/route-sensitivity.json` 43 行（每注册路由一行+`methods` 列）+ gen/check 脚本 — pass `bd4d6ad` · check-route-sensitivity 0-drift
- [x] `P1-03` — `security/feature-contract.json`（43 路由 bodyLimit/UI/数据位置逐字段）+ check 脚本 — pass `bd4d6ad` · check-feature-contract PASS
- [x] `P1-04` — 分发通道（四 `package.json` file:→devDeps+三包；`build-client.mjs` 新增 bundle；无 schema-shim；静态断言无裸 import） — pass `bd4d6ad` · check-clean-lib PASS + pack dry-run
- [x] `P1-05` — 四插件 43 路由迁移到 guard（零行为） — pass `bd4d6ad` · dsh-dev restart: all routes 401 gated, /bogus 404
- [x] `P1-06` — `dsh-remote-data-schema` 骨架（validate/SchemaReject） — pass `bd4d6ad` · node --test 6/6
- [x] `P1-07` — `dsh-html-policy` 骨架（ALLOWED_* 常量） — pass `bd4d6ad` · node --test 7/7
- [x] `P1-08` — `security/accepted-risks.json` 9 条骨架（4 harden/5 accept） — pass `bd4d6ad`
- [x] `P1-09` — `test/spike/security-fix/` 宪章 + `test/remote-schema/compat/` + `scripts/security-regression/` 基座 — pass `ecf16f5` · 宪章判读门槛写死+fake-S3 CAS验证(304/412)

### PH2 `batch1-host-data`（门禁 B1；P0 remote-cross 7）
- [x] `P2-01` — schema v1 六类规则 + v0 只读兼容 + reject — pass `e402df7` · node --test 24/24 · svg-mime/depth/committedBytes/traversal 全拒
- [ ] `P2-02` — notepad `/s3/object` 消费点接 schema（s3-sync.js import→s3-sync-host bundle；put/get 不对称）
- [ ] `P2-03` — nsw marker 校验 + localPath 严格 memberId 绑定（join 边界）
- [ ] `P2-04` — nsw session meta/parts/claim 校验 + acquire+renew CAS + committedBytes/parts 限额 + claim/heartbeat/lease 边界
- [ ] `P2-05` — nsw tree HEAD/pull/push 校验 + realpath 围栏（SKIP/symlink/stale/localPath）
- [ ] `P2-06` — materialize + 路由边界 charset 双层（sessionId/workspaceId `^[A-Za-z0-9_-]{1,128}$`）
- [ ] `P2-07` — fetch-mp 30x 逐跳复验
- [x] `P2-08` — 存量桶兼容回归（真桶导出、N≥K、v1-freeze 前置闸） — pass `4894a49`+`e402df7` · compat-regression 7/7 (6 v1 + 1 v0-backfill manifest)

### PH3 `batch2-content-render`（门禁 B3；P0 remote→page 6）
- [ ] `P3-01` — html-policy 策略表实现
- [ ] `P3-02` — 客户端 `sanitizeRichHtml` 重写（allowlist）
- [ ] `P3-03` — 宿主 `sanitizeMpHtml` 重写 → `src/host/mp-sanitize.js`→`lib/mp-sanitize.js`
- [ ] `P3-04` — image mime/base64 严格校验
- [ ] `P3-05` — manifest/workspaceId 属性转义
- [ ] `P3-06` — validateJson 深度上限
- [ ] `P3-07` — imagine 模板注入收口
- [ ] `P3-08` — mp 正向渲染快照回归

### PH4 `batch3-p2-supply`（门禁 B4；P2 9 + supply 2）
- [ ] `P4-01` — mutate realpath 围栏（mutate.js assertInside 词法→realpath）
- [ ] `P4-02` — `.git` 拒绝（mutate + git add 前置）
- [ ] `P4-03` — scopeOf 跨会话日志
- [ ] `P4-04` — grok-creds `.gitignore`+SKIP 阻止外泄
- [ ] `P4-05` — `accepted-risks.json` 成文（4 加固+5 接受）
- [ ] `P4-06` — esbuild npx 回退移除
- [ ] `P4-07` — release CI + clean-lib + attestation

### PH5 `release-closure`（门禁 B5）
- [ ] `P5-01` — 版本 bump（四插件→0.2.0、三包 0.1.0）+ files 一致
- [ ] `P5-02` — tarball 隔离安装验收
- [ ] `P5-03` — dsh-dev 全量 smoke

### 收口工件
- [ ] `DOC-01` — 工作日志回填至 AP 底部（code-execution-log 模板）
- [ ] `DOC-02` — closure 文件 `docs/closure/security-fix/26-nov-closure.md`
- [ ] `REVIEW` — ≥3 路对抗审查子代理（真相层对账 / 工作完成度 / 防测试假绿）→ 汇聚修复 → 收口

## 4. 验收与证据（Check ledger）

> 每 `pass` 带四元组 `commit + 测试/查询 + D1 + run-time(UTC)`；状态词 `pass|partial|pending|blocked|n/a`。

| Check | 验证什么 | 方法 | 预期 | 实际 | 证据 | 状态 |
|-------|----------|------|------|------|------|------|
| B0-T01..T05 | guard 单测 / 清单 0 漂移 / 合同一致 / 无裸 import / 43 路由可达 | `node --test` + `check-*` + dsh-dev | 全过 | 14+6+7 unit · 0-drift · contract OK · clean-lib OK · 43路由401-gated | `bd4d6ad`/`ecf16f5` + node --test + D1 dsh-dev.local + 2026-11-11T15:56Z | pass |
| B1-T01..T08 | schema 正负样本 / s3-object / 6 PoC 子断言 / put 任意 key / CAS / fetch-mp 逐跳 / 存量兼容 / 批门禁 | node --test + fake S3 + compat | 全拒+100% | - | - | pending |
| B3-T01..T09 | 策略表 / 双 renderer 负向 0 执行 / mime / 转义 / 深度 / imagine / 正向快照 / 批门禁 | node --test + DOM + snapshot | 0 执行 | - | - | pending |
| B4-T01..T06 | P2 加固 / scopeOf 日志 / accepted 语义断言 / npx 移除 / release dry-run / 批门禁 | node --test + lint | PASS | - | - | pending |
| B5-T01..T05 | pack 一致 / 隔离安装 / 全 smoke / 13 PoC 拒 / soak 确定性 | npm pack + dsh plugin add + regression | 激活+全拒 | - | - | pending |

## 5. 当前状态与交接

- **当前节点**：`P2-01`+`P2-08` 完成 `e402df7`（schema v1 engine + compat 7/7 GREEN）；`P2-02`/`P2-07`（notepad）+ `P2-03..P2-06`（nsw）并行执行中
- **下一动作**：消费点接线完成后跑 B1 门禁（fake-S3 6类恶意全拒 + feature-contract 0-drift + compat 7/7 + sync smoke）→ PH3
- **当前阻塞**：无
- **待 owner**：无（`foundation/` 不存在，已以 AGENTS.md 为准）
- **最终交接**：closure + 发布 checklist（`v*` tag 由业主推送触发 release CI）

---

## 附件 · 完整发车指令（留档）

```
# 工作范围与目标
仓库与分支: dsh-mini / main
目标: 按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作

## 本次工作涉及的编号
| 工作阶段 | 工作波次 | 工作项目 | 子项阶段 |
| security-fix | N/A | 26-nov | N/A |

## 原则
WARN#1 - 开始编码执行前, 必须保证工作树干净。如果工作树中有未保存的内容, 你会对内容进行分析, 然后在当前分支下完成 commit
WARN#2 - 业主授权: 必须阅读 AGENTS.md 以及在 foundation/README.md 的指导下进行工作
WARN#3 - 每一个 [执行计划] 中的 Phase 完成后, 你需要回到 todo.{工作项目}.md 中, 更新 checkbox 并登记执行状态, 不得在所有工作完成后一次性 tick 全部的 boxes
INFO#1 - 必须按照 [执行计划] 中的 DAG 中明确要求, 构建执行顺序。在构建 todo 文档的时候, 必须严格进行顺序 block 限制
INFO#2 - 工作波次和子项阶段是可选项。如果存在, 则下面的对应目录层级可以增加。如果没有指定, 则忽略这个层级, 比如 closure 文件输出为 docs/closure/{工作阶段}//{工作项目}-{子项阶段}-closure.md
INFO#4 - 代码审查子代理的专用审查PROMPT 以及审查产出的 review 报告, 需要落盘于 [.anote/reviews/{工作阶段}/{工作波次}/{工作项目}] 文件夹
INFO#4 - 按照 [执行计划], 在 业主授权 规范下, 有权对 container 集群进行 live migration + rebuild + deploy

## 上游必读文件
执行计划: docs/plan/security-fix/26-nov-security-hardening.md
真相层台账: docs/code-review/26-nov/pre-security-fix-qna.md
安全调查与分析: docs/code-review/26-nov/security-audit.md

## 工作方法
STEP.0 - 在执行计划位于的目录内, 在 todo计划模板 规范下创建 todo.{工作项目}-{子项阶段}.md 这个跟踪对象, 以 DAG + checkbox 的创建任务执行的跟踪文件. 你会将本次发车的完整指令, 作为附件, 注入在 todo 文档底部
STEP.1 - 重新拉取本阶段使用的全部上游必读文件, 并对工作区域的代码进行梳理, 从结构上理解当前工作区域的性质, 业务流转的方向, 建立对当前业务的横向层面认知
STEP.2 - 在建立横向认知后, 对重点代码的 git 历史进行回溯, 建立起从时间轴纵向上, 对焦点代码的历史沿革的认知。创建对 git HASH 映射关系的图谱
STEP.3 - 从横向和纵向上建立执行关系后, 判断是否存在对应的 reference-anchor, 是否拥有正例/反例可供参考, 是否在 context/ 内存在对应的参考系可以进行借鉴
STEP.4 - 在获得全部上下文后, 你会严格在 [工作目标] 的范围内, 按照 [执行计划] 中的详细要求, 进行完整, 完全的代码开发, 静态审查, 以及测试收口工作。在执行期间内每完成一个 Phase, 就对当前阶段对应的代码完成分组 commit
STEP.5 - 全部编码工作完成后, 使用 工作日志模板 创建 [工作日志] 并回填至 [执行计划] 文档的底部
STEP.6 - 按照 todo 中的安排, 完成全部的工作后, 按照 closure模板 要求, 输出本阶段 closure 文件至 docs/closure/{工作阶段}/{工作波次}/{工作项目}-{子项阶段}-closure.md
STEP.7 - 你会定制不少于3路从 真相层对账, 工作完成度, 防测试假绿,防业务侧载 等工作面的审查子代理, 对当前 todo 内已完成工作内容进行深度审查。审查开始前, 请为每一路子代理, 定制其专用的 Comprehensive 进攻性 专用审查PROMPT, 以便让子代理载入本次工作的 [执行计划] 后, 对我们本次执行展开深度, 专注, 全面地展开工作质量与数量的全面回顾
STEP.8 - 回收子代理的代码审查报告, 在汇聚, 分析, 整理, 核实全部子代理的分析后, 执行更新或修复。修复完成后再次进入 测试↔修复 循环, 直至完成本工作项目的收口。并更新 closure 文件

## 使用到的模板
closure模板 = .adocs/templates/closure.md
工作日志模板 = .adocs/templates/code-execution-log.md
todo计划模板 = .adocs/templates/action-todo.md

# 发车指令
基于我的上述要求, 请立刻按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作
务必将完整的发车指令与授权记载于 todo 底部留档
```
