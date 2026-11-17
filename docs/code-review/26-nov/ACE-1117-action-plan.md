# Nano-Agent 行动计划 · ACE-1117 异步压缩执行

> 服务业务簇: `async-compact-execution`（[DNMSC] / [DNMS] 异步压缩面；DNMS01 收口之后的执行）
> 计划对象: `1117 · ACE-1117`
> 类型: `modify | refactor | remove`
> 作者: `ACE-1117 计划 agent（lead）`
> 时间: `2026-11-17`
> 文件位置: `docs/code-review/26-nov/ACE-1117-action-plan.md`
> 推定 slug（文件名不带；`工作波次` 与 `子项阶段` 均为空）: `async-compact-execution`
> 上游前序 / closure:
> - [`ACE-1117-qna-truth.md`](./ACE-1117-qna-truth.md)（引用面；`T-O-ACE1117-B01`–`B13` 与 `01`–`11`，外加 `CORR-1`；`FROZEN` ≠ 实施授权）
> - [`ACE-1117-qna.md`](./ACE-1117-qna.md)（decision provenance；本计划不改它）
> 下游交接:
> - **（另立）ImplementationGrant** —— 本计划不签发、不替代。未获 [业主] 放行前不得改代码、不得装包、不得发布。
> - 显式 defer 仍停在问答：DNMS01 R-16.2、R-16.5、R-17、R-18。不在本计划里做。
> 关联设计 / 调研文档:
> - [`ACE-1117-risk-assessment.md`](./ACE-1117-risk-assessment.md)（证据；R01–R50 与 §7 只是工作对象索引。其中的推荐、方案编号、Q-ACE **不是合同**）
> 冻结决策来源:
> - [`ACE-1117-qna-truth.md`](./ACE-1117-qna-truth.md) §0–§2、§4（只读引用；本计划不填 Q/A、不复制规则句当第二合同、不改口）
> grounding 来源:
> - 真相层 `AF-14` + 撰写时对 `HEAD fb7264d` 的锚点复核（无独立 eval-reference-anchor）→ **§7 就是本计划的 grounding 真源**
> 关联 reference-anchor: `见 §7 内置锚区`
> 审查回写: 两路审查都在 `.anote/reviews/ACE/1117/na/8142/`。防假绿的 6 条阻断已写入 §8.5 与 §10，T01–T19 都是退出项。真相层合规的 2 条阻断已改：协议 hash 只锁到 `BlockAssembler` 结束（`:151`），不吞 `:185` 的语义注释；`select` 不算落定，在途续拉不得只认 `arm`/`claim`。
> 文档状态: `draft`
>
> 词汇锚定：自著行文里的 [业主]、[真相层]、[dsh]、[dsh-nano]、[dsh工作台]、[DNMS]、[DNMSC]、[DNPR]、[nano-agent] 按仓根 `AGENTS.md` 带 `[]`。`file:line`、包名、Truth-ID、Test-ID 与代码标识符保持裸写。Truth-ID 在表内可写 `B07`、`-05②`，首次出现写全称 `T-O-ACE1117-*`。Test-ID 一律 `ACE1117-Txx`。
>
> **冲突规则**：评估、本计划的步骤与冻结条款不一致时，以 [`ACE-1117-qna-truth.md`](./ACE-1117-qna-truth.md) 为准；该台账与 [`ACE-1117-qna.md`](./ACE-1117-qna.md) 不一致时以问答为 provenance。步骤可以点名符号，方便施工。规则句仍以 [真相层] 为准。冲突时删步骤，不改 [真相层]，也不把本文的转写当成第二合同。

---

## 0. 执行背景与目标

> **纪律**：本文件只消费已冻结结论，不新开 Q/A。实施中若碰到 [真相层] 没有覆盖的公共合同问题（新的 error 枚举、新 lane、新凭证面、宿主 schema 加字段），停在该工作项，回到问答 append-only，本计划保持 `draft`。
>
> **授权边界**：本文不是 implementation grant，不是 build、deploy、secret、provider 或远端授权，不新增 release-gate，不改 `RELEASE.md`，不定版本号。**当前 0 项已开工、0 项 PASS。** §8 的四元组是执行期才填的证据形状。§10 状态一律 `未观察`。

- **服务业务簇**：`async-compact-execution`
- **计划对象**：`ACE-1117`
- **本次计划解决的问题**：
  - 保留尾部仍按 token 从后往前累加再退到 tool-pair（`compact-region.js:357-386`），没有 turn / step 边界。这是 `B03` ① 的落点，修法已关在 `-03`、`-08`，不再另题。
  - 模型只看见要求「不要承认」的 checkpoint 帧（`compact-region.js:248-249`），摘要指令还禁止提到压缩（`:222`）。没有 inspection 工具。落点是 `-04`、`-08⑤`、`-09`。
  - 四条常驻拉取还在（`ModelSelector.jsx:298` 的 `setInterval`；`AsyncStatusBadge.jsx:52` 的自调用 `setTimeout`；`CompactPanel.jsx:102`；`AsyncHistoryDialog.jsx:103`）。`armed` 的 idle 分支（`host-compaction.js:177`）对不上「arm 即进入 running」（`:304`）。落点是 `-05`、`-06`、`CORR-1`。
  - 策略仍允许等号（`compact-policy.js:13-16,81-83`），读入时把 S=0.80 抬成 0.90（`:233-236`），`summaryPrompt` 仍能整段替换内置指令（`compact-region.js:228-229`）。落点是 `-07`、`-10①②`。
- **本次计划的直接产出**：
  - [DNMSC]：严格顺序与 S=0.90 只读、附加要求取代全文覆盖、四条 lane 共用的一个选择器、与帧一致的内置 prompt、engine 内 session 级互斥、`inspect_checkpoint`、覆盖 base 扁平行的 patch。
  - [DNMS]：由构建生成的策略与 prompt 副本、按 session 读的 projection、退役常驻定时器后的单一在途节奏、顶栏入口保持不动、开关确认。
  - 收尾只改 `closure/DNMS01-closure.md` 的 `:20` 与 `:74`。`async-compaction.md` 不改。
- **本计划不重新讨论的设计结论**：
  - 协议层复用宿主公开协议，语义层归 [DNMSC]（`-02`）。不改宿主文件，不嫁接宿主 DOM（`B05`、`B09`）。
  - 一次压缩的权威仍是 session journal 括号。账本、runtime、UI 都是派生（`B06`）。
  - ON/OFF 唯一 canonical 仍是 bundle 成员资格，默认 OFF 的原文不在本计划改写（`B07`、`AF-9`）。R-16.5 不裁决。
  - [DNMSC] 不接入 [DNPR]（`B08`）。不新增 release-gate（`B13`）。
  - Q1–Q10 未选中的选项不得再做成实现，清单见 §2.2 与 §7.2。

---

## 1. 执行综述

### 1.1 总体执行方式

一个 worktree、按依赖提交、按相位合入。先硬切策略与生成副本（否则面板还在写已经非法的 `summaryPrompt`）。再注册工具并补上 base 扁平行（帧文案会点名工具，工具必须先在树上）。然后修 episode 生命周期与互斥（选择器换上之前，手动 / 同步 FULL 仍能和在途摘要重叠）。然后同一次提交换掉选择器、内置 prompt 和帧，旧节点算法不留开关。最后改客户端心跳，并只做 `-10⑦` 点名的两处 closure。评估 §7 的 P0/P1/P2 编号不作为执行顺序。

### 1.2 Phase 总览

| Phase | 名称 | worktree | 规模 | 目标摘要 | 依赖前序 |
|------|------|----------|------|----------|----------|
| Phase 1 | 策略硬切与共享烘焙 | `ace-1117-async-compact` | M | S=0.90 不再读时抬升；等号拒绝；`summaryPrompt` 退役为附加要求；[DNMS] 副本改为生成 | - |
| Phase 2 | 工具与 base 覆盖 | 同上 | M | `inspect_checkpoint` 独立行，不进 isolate；patch 覆盖 base 扁平 `compaction-basic` | Phase 1 |
| Phase 3 | 生命周期与互斥 | 同上 | L | idle 死路径、engine 互斥、超时结算、按 turn 去抖、episode 删除、`CORR-1` | Phase 1 |
| Phase 4 | 选择器、prompt、帧 | 同上 | XL | 四条 lane 一个选择器；旧算法删除；帧与 prompt 同一组测试 | Phase 2 + Phase 3 |
| Phase 5 | 观测与 UI 心跳 | 同上 | L | projection 按 session；常驻定时器退役；顶栏保持；开关确认 | Phase 3；committed 展示不依赖 Phase 4，但同 worktree 最后合 |
| Phase 6 | 收口 | 同上 | S | 只改 closure 两处；不改 `async-compaction.md`；不新增闸 | Phase 4 + Phase 5 |

> 规模是阅读提示，不是闸。Phase 2 与 Phase 3 都只依赖 Phase 1，可以在同一 worktree 里并行准备，但 Phase 4 必须等这两相的提交都在树上。合入 `main` 的顺序仍是 1 → 2 → 3 → 4 → 5 → 6。禁止把 Phase 4 的帧单独合入而工具行还没有。

### 1.3 Phase 说明

1. **Phase 1**：`-10①②` 与 `-07②④` 是后面所有预算和文案的输入。两份 `compact-policy.js` 若继续手改，硬切会立刻分叉。
2. **Phase 2**：`-09①` 要求工具行和 Provider 行同一次生成、OFF 时一起消失。帧还没改，模型暂时不会被教去调用工具；`when` 在没有本插件标记的 checkpoint 时为 false。
3. **Phase 3**：`-05` 修的是调度和互斥，不依赖新切点。先做，避免 Phase 4 的四条 lane 在没有互斥时同时进入选择器。
4. **Phase 4**：`-03③` 禁止把旧节点算法留成可选模式。选择器、prompt、帧必须同一次提交，因为 `-08⑤` 要求同一组测试锁定帧和 prompt 结构。
5. **Phase 5**：`-06` 把已提交事实和在途状态拆开。常驻定时器在源码和 `lib/client.js` 里各有一份，只改一边会假绿。
6. **Phase 6**：`-01⑤` 禁止修订 `async-compaction.md`。`-10⑦` 只点了 closure 的两处。

### 1.4 执行策略说明

- **执行顺序原则**：能硬切的同一提交删除旧路径，不留双写、不留兼容读取。例外只有 [真相层] 写明继续有效的行为：DC-1 full-only、`-18③④⑤⑦⑧⑨`、`-18⑥`（本计划不复述、不改）、六失败码、`VERSION_GUARDED_ROWS` 的机制本身。
- **风险控制原则**：每个 Phase 合入前跑该 Phase 的短途。Phase 4 合入前，Phase 2 的工具行必须已经在同一分支的 patch 里。碰宿主闭集（`compaction/start` 只有 `compactionId` / `sourceCommandId` / `turn`，见 §7.1 A-20）就停，不改宿主。
- **测试推进原则**：短途放在既有 `node --test` 文件里，不新开仓根闸。不设 soak。证据重放是只读观察，不是 PASS 条件（`-10⑥`、`B10`）。详见 §8。
- **文档同步原则**：某一 Phase 改写了的注释、`DETAIL.zh.md`、[DNMS] `AGENTS.md` 里被该 Phase 推翻的句子，随该 Phase 提交一起改。Phase 6 不再做全库扫荡式改写，只处理 `-10⑦` 点名的 closure，并核对没有把 `async-compaction.md` 改掉。
- **回滚 / 降级原则**：每个 Phase 一次合入，回滚即 revert 该合入。回滚 Phase 4 时不必回滚 Phase 2（工具在没有新帧时只是 `when` 为 false）。回滚 Phase 1 时，其后所有 Phase 一起回滚（它们依赖新 schema）。不提供「读到 `summaryPrompt` 就自动迁移」的降级。

### 1.5 本次 action-plan 影响结构图

```text
ACE-1117
├── Phase 1 策略与烘焙
│   ├── [DNMSC] lib/compact-policy.js（真源）
│   ├── [DNMS] lib/compact-policy.js、lib/compact-prompt.js（改为生成物）
│   ├── [DNMS] src/client/CompactPanel.jsx（附加要求；等号文案）
│   └── 既有 test/compact-policy.test.mjs
├── Phase 2 工具与 patch
│   ├── [DNMSC] 新 lib/inspect-checkpoint.js + package.json exports["./tools"]
│   ├── scripts/gen-mutex-patch.mjs、cordis.patch.yml
│   │   ├── 4 preset 的工具行（不进 id:compaction）
│   │   └── base 扁平 compaction-basic → disabled + Provider 行 + 工具行
│   └── 既有 test/host-cordis-smoke.test.mjs、async-takeover.test.mjs
├── Phase 3 生命周期
│   └── [DNMSC] lib/host-compaction.js（:8-12 头注、:177 idle、:315 超时、:338 disarm、:448 settle、互斥）
├── Phase 4 选择器 / prompt / 帧
│   └── [DNMSC] lib/compact-region.js（:190-258 指令与帧、:357-386 选择器）
│       四条 lane 的调用点：host-compaction.js:368、:537、:572、:692
├── Phase 5 观测与 UI
│   ├── [DNMS] index.js:428、:482；lib/compact-runtime.js:111-171
│   ├── src/client/{ModelSelector,CompactPanel,AsyncStatusBadge,AsyncHistoryDialog}.jsx
│   ├── 重建 lib/client.js（安装面）
│   └── src/perf/declaration.json（只加 audit budget，不改 schema）
└── Phase 6 closure/DNMS01-closure.md:20 与 :74
    不改 docs/specs/.../async-compaction.md
    不改 DNMS01 真相正文（AMEND-4..6 已在，不追加）
```

---

## 2. In-Scope / Out-of-Scope

### 2.1 In-Scope（本次 action-plan 明确要做）

- **[S1]** 策略硬切：S=0.90 只读、删除 0.80 读时兼容。违反 `H < B < S`（也就是 `H>=B` 或 `B>=S`）才 400。`effectivePin/W >= H` 仍只标 DC-1 / full-only，不拒绝（`-10①②`，`AF-2`）。
- **[S2]** 内置 prompt 为唯一真源；用户输入只能作为其后的附加要求；[DNMS] 的策略与 prompt 副本改为构建生成（`-07`）。
- **[S3]** 四条 lane 共用一个选择器；旧节点算法删除；预算按 `-08` 的目标 / 上限 / 下限（`-03`、`-08`）。
- **[S4]** checkpoint 帧改为唯一模型告知；`inspect_checkpoint` 按 `-09` 注册在 isolate 之外（`-04`、`-09`）。
- **[S5]** arm 即起摘要；下一 step 边界或 idle 的 `runMaintenance` 提交；engine 内 session 级互斥；抢占、超时、disarm 不计 circuit（`-05`，`CORR-1`）。
- **[S6]** 账本覆盖四条 lane 的每次选择；已提交走 projection 且按 session；常驻定时器退役；在途只在「运行中且有 episode」时单节奏续拉（`-06`，`-11②`）。
- **[S7]** 顶栏入口保持；补开关确认；i18n 中英键集合一致；base 扁平行与 4 个 preset 一起覆盖（`-10③④⑤`）。
- **[S8]** 协议副本 `errorChain`、`BlockAssembler` 用来源版本 + 内容 hash 锁住（`-02①`）。验收只用既有测试入口（`-10⑥`、`B13`）。

### 2.2 Out-of-Scope（本次 action-plan 明确不做）

- **[O1]** 评估里没有被 `T-O-ACE1117-*` 接住的做法：把 fill 改成 max(估算, provider 真值)、摘要验收器、单独的 FULL prompt、`<retained>` 清单、历史对话框展示 checkpoint 正文、对话内宿主 `CompactionNodeView` 异步变体、100%「尾部必有 user」这类 SLA。
- **[O2]** 未选中的选项，不得实现：回退代码或续开 DNMS01 Round 6；忠实移植或搬 [nano-agent] 语义栈；现状节点算法加硬上限、严格 turn 原子、只对齐 step；静默、只改帧、帧加 `notice`、改靠宿主 `dsh-tool-session-query` 而不注册本插件工具；追认无互斥、回退 `-18` 调度、全程 durable 锁；账本末条加时间窗口、删账本只在打开时拉一次、新建推送路由；全文覆盖、手抄双份；外推到边界、改比例字段、删除 pinned 字段；工具进 isolate、关键字检索、推迟注册；全部追认或全部回退 DNMS01、把 S 改成可写。
- **[O3]** 显式 defer：R-16.2（`ManualCompactionError` 类身份）、R-16.5（`dsh plugin add` 默认 ON）、R-17（preset 重放跨版本守卫的新设计）、R-18（客户端宿主导出守卫）。`VERSION_GUARDED_ROWS` 维持现状，不扩展机制。
- **[O4]** `-18⑥` 的 pruner 行为。本计划不读、不改 `pruneSession` 的跳过 / catch。disarm 只发生在 step 边界的 fill 比较（`host-compaction.js:614-616`），不在 pruner 里加钩子。
- **[O5]** [DNMSC] 接入 [DNPR]：不加声明文件、不加依赖、不加构建戳、不加 lab scenario。`overflow` 重试次数（`OVERFLOW_RETRIES = 1`）不改。六失败码不新增第七码。
- **[O6]** 改宿主、改 `RELEASE.md`、定版本号、新增 `scripts/check-*`、把 `/tmp/dnms-evidence/` 收进仓库。sdk、acp 等非 web 组合不覆盖。
- **[O7]** 修订 `async-compaction.md`。改 DNMS01 真相正文或再追加一份 AMEND。启用 `T-O-DNMS01-23` / `-24`。设 Round 5。

### 2.3 边界判定表

| 项目 | 判定 | 理由 | 重评条件 |
|------|------|------|----------|
| 选择器、帧、prompt、互斥、工具、策略硬切、心跳 | `in-scope` | §2.9 覆盖矩阵已把 `B03`、D1–D11、`B11` 指到 `-03`–`-10` | 否决须回问答 append-only |
| 续拉毫秒、附加要求字段名与长度、checkpoint 识别标记、账本字段格式 | `in-scope` 的实施取定 | `-11③`：确定时不构成合同变更、不回问答登记。取值写在 §4，测试锁定 | 要改成另一种公共合同才回问答 |
| fill 合并 provider usage、摘要验收器、尾部 100% 含 user | `out-of-scope` | 评估建议，未被冻结。`B10` 的 242/260、39/260 是对照基线，不是新 SLA | 新的 [业主] 裁决 |
| R-16.2 / R-16.5 / R-17 / R-18 | `defer` | `-11④` | 只能在本册问答追加，或 [业主] 另立战役 |
| `compaction/start` 增加 `engine` 字段 | `out-of-scope` | 宿主类型闭集（§7.1 A-20）。加字段是协议分叉，`-02①` 不允许 | 宿主自己加字段之后才能再谈 |
| 上线前已经写进 journal、帧里没有工具名的旧 checkpoint | `defer` 到识别规则之外 | 不回写 journal，不用账本当权威。见 P2-03 | [业主] 要追溯时回问答 |

---

## 3. 业务工作总表

> 安全项 P2-01 / P2-03 的威胁模型在 §7.3，不留空。

| 编号 | 所属 Phase | 工作项 | 类型 | 涉及文件（file:line） | 收口目标 | 测试映射 | 风险 |
|------|------------|--------|------|------------------------|----------|----------|------|
| P1-01 | Phase 1 | 策略顺序与 S 读时兼容 | update / remove | `dsh-nano-model-selector-compaction/lib/compact-policy.js:13-16,23-25,72-97,233-236`；同路径 [DNMS] 副本 | S≠0.90 不再被改写成 0.90；`H>=B` 或 `B>=S` 为 400；DC-1 仍 full-only | `ACE1117-T01` | high |
| P1-02 | Phase 1 | 全文覆盖退役为附加要求 | update / remove | `compact-policy.js:37,47,117-118,193-209`；`compact-region.js:228-245`；`CompactPanel.jsx:332,495-498` | 文件里出现 `summaryPrompt` 即 `invalid-schema` 并进入可见 safety-only；发送文本 = 内置 + 附加要求 | `ACE1117-T02` | high |
| P1-03 | Phase 1 | 共享模块改为生成 | add / remove | 🆕 [DNMS] `scripts/bake-compact-shared.mjs`；`lib/compact-policy.js`、`lib/compact-prompt.js` | 两份副本带生成文件头，内容 hash 与 [DNMSC] 真源一致；禁止手改 | `ACE1117-T03` | medium |
| P1-04 | Phase 1 | 协议副本 hash 锁 | update | `compact-region.js:44-68` 与 `:80-151` | 只锁 `errorChain` 与 `BlockAssembler` 两个符号；`:152` 之后的语义注释不进锁 | `ACE1117-T04` | medium |
| P2-01 | Phase 2 | `inspect_checkpoint` | add | 🆕 `lib/inspect-checkpoint.js`；`package.json:26-31` | 只读、本会话、分页与长度上限、`when` 只在有本插件 checkpoint 时为真 | `ACE1117-T05` `ACE1117-T06` | high |
| P2-02 | Phase 2 | patch 覆盖 base 与工具行 | update | `scripts/gen-mutex-patch.mjs:20-28,41-43,89-109`；`cordis.patch.yml` | 工具行不在 `id: compaction` 内；base 扁平 `compaction-basic` 在 ON 态 `disabled`；OFF 时两行一起消失 | `ACE1117-T07` | high |
| P2-03 | Phase 2 | checkpoint 识别标记 | update | `compact-region.js:248-258,504-507` 的帧；工具读 journal | 不新增 `compaction/start` 字段；用帧里的工具名识别；能读到已被再次压缩、不在 surface 上的本插件 checkpoint | `ACE1117-T06` | high |
| P3-01 | Phase 3 | 调度与 idle 提交 | update | `host-compaction.js:8-12,139-188,300-304,385-391` | 头注描述 `-05①`；turn 先结束且摘要就绪时经 `runMaintenance` 提交；`:177` 不再等 `phase==='armed'` | `ACE1117-T08` | high |
| P3-02 | Phase 3 | engine 内互斥 | update | `host-compaction.js:528-539,547-560,626-666,681-713` | 手动、同步 FULL、换模型、overflow 先撤销在途 episode；async 在任一 lane 活跃时跳过；durable 括号仍只在提交时打开 | `ACE1117-T09` | high |
| P3-03 | Phase 3 | 失败、超时、episode 删除 | update / remove | `host-compaction.js:66-68,280,315-326,448-508,591-596` | 超时立即结算且不计 circuit；非 transient 按 turn 去抖；`no-window` 记 skip；circuit 关闭后删除 Map 条目；死常量删除 | `ACE1117-T10` | high |
| P3-04 | Phase 3 | disarm 读法 | update | `host-compaction.js:330-357,611-616` | 注释与结算对齐 `CORR-1`：在途期间 fill 低于 B 即撤销，不是失败，不计 circuit | `ACE1117-T11` | medium |
| P4-01 | Phase 4 | 统一选择器 | update / remove | `compact-region.js:357-386`；调用点 `host-compaction.js:368,537,572,692-696` | 旧累加循环删除；四条 lane 都传入目标与上下限；手动和 overflow 不再传 retain 0 | `ACE1117-T12` | high |
| P4-02 | Phase 4 | 内置 prompt 与 step 补偿 | update | `compact-region.js:190-230,526-537` | `:222` 删除；`:195-217` 与 `:224` 保留；step 级把当前 turn 开场用户请求原文放进指令；摘要输入结构不变 | `ACE1117-T13` | high |
| P4-03 | Phase 4 | checkpoint 帧 | update | `compact-region.js:248-258` | 只含 `-08⑤` 的固定字段；node 级对模型写 `message`；不写时间戳、模型名、prompt 版本 | `ACE1117-T13` | high |
| P4-04 | Phase 4 | 四条 lane 记账 | update | `lib/async-history.js:48`；各 lane 提交点 | 每次选择有 `boundary` 与 `retainedTokens`；账本不是权威 | `ACE1117-T14` | medium |
| P5-01 | Phase 5 | projection 按 session | update | `dsh-nano-model-selector/index.js:428,482`；`lib/compact-runtime.js:111-171` | 不再把 `null` 当成 session；无 sessionId 时不回另一会话的 `lastCompaction` | `ACE1117-T15` | high |
| P5-02 | Phase 5 | 退役常驻定时器 | remove | `ModelSelector.jsx:273-300`；`AsyncStatusBadge.jsx:21-59`；`CompactPanel.jsx:102`；`AsyncHistoryDialog.jsx:99-105`；重建后的 `lib/client.js` | 源码与产物都没有这四个自调度；只剩一个有条件的续拉 | `ACE1117-T16` | high |
| P5-03 | Phase 5 | 入口、确认、文案 | update | `ModelSelector.jsx:791-806`；`CompactPanel.jsx:153-177,185-186`；`DETAIL.zh.md:15-16`；[DNMS] `AGENTS.md` 面板入口节 | 顶栏保持；rail 不承担压缩入口；开关先确认；中英键集合相等；不新增 localStorage 键；改动文件的 UI 告警不增加 | `ACE1117-T17` `ACE1117-T18` | medium |
| P5-04 | Phase 5 | 节奏写入 [DNMS] 声明 | update | `src/perf/declaration.json`；`declaration.js:10` 的 `TOP_KEYS`，budget 字段在 `:108-119` | 3000ms 以 `gate:"audit"` 写进既有声明；不改校验器；[DNMSC] 仍无声明 | `ACE1117-T16` | medium |
| P6-01 | Phase 6 | closure 两处 | update | `docs/specs/dsh-nano-model-selector/closure/DNMS01-closure.md:20,74` | `:20` 改指 `-05`；`:74` 按原句归档。其他行不动 | `ACE1117-T19` | low |
| P6-02 | Phase 6 | 确认非交付物没有混进来 | remove | 仓库 diff 相对本计划文件清单 | `async-compaction.md`、`RELEASE.md`、DNMS01 真相正文无 diff；无新闸脚本 | `ACE1117-T19` | medium |

---

## 4. Phase 业务表格

### 4.1 Phase 1 — 策略硬切与共享烘焙

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P1-01 | 严格顺序与 S | a) 删除 `LEGACY_SAFETY_RATIO` 与 `readState` 里把 0.80 改写成 0.90 的分支（两份 `compact-policy.js` 的 `:233-236`，以生成前的 [DNMSC] 真源为准）。S≠0.90 → `invalid-range`，宿主已有 `!state.ok → safetyOnly` 使其可见，不另造 degraded 枚举值。b) `validateMasterOrder`：`H >= B` 或 `B >= S` 返回 400，不写。`effectivePin/W >= H` 仍只标 DC-1 / `fullOnly`，不拒绝（`AF-2`）。c) 删 `:13-14`「等号合法」。d) PUT 正文带 `bufferSizeSafety` 仍是 400。e) 既有等号用例改成拒绝用例。 | `lib/compact-policy.js:13-16,23-25,72-97,233-236`；`test/compact-policy.test.mjs:50-56` | 0.80 文件不会被悄悄读成 0.90；H=B 与 B=S 拒绝；H 仍可小于 B | `ACE1117-T01` | T01 PASS，且两份副本 hash 一致（T03） |
| P1-02 | 附加要求 | a) 实施取定（不是新 Truth-ID）：字段名 `extraRequirements`，`string`，最大长度 4000（按 JS `length`）。空串等于没有附加要求。b) 反序列化见到键 `summaryPrompt`（哪怕值是空串）→ `invalid-schema`，不剥离、不迁移。PUT 带该键同样 400 不写。`DEFAULT_POLICY`（`:37`）和序列化输出去掉该键。缺文件仍返回这份内存默认，不写盘，也不因此进入 safety-only。c) `instructionText` 不再用非空 override 替换整段。发送文本 = `COMPACTION_INSTRUCTION` + 若附加要求非空则固定段落标题 `Additional requirements:` 与其后原文。d) `instructionVersion` 对这个完整字符串取 sha256 前 8 位。e) 面板改为只读展示内置 prompt 与指纹，编辑框只绑定 `extraRequirements`；「恢复默认」写成空串。f) 文案把 pinned 改成「目标」，不改字段名、不改 `PIN_FRACTION`。 | `compact-policy.js:37-48,107-144,193-209`；`compact-region.js:227-245`；`host-compaction.js:286,752-760`；`CompactPanel.jsx:332,473-505` | 旧文件进入可见 safety-only；新写入不再含 `summaryPrompt`；用户文本不能删掉内置段落 | `ACE1117-T02` | 构造一份只改附加要求的策略，hash 变；把附加要求设成含 `## Primary Request` 的字符串，发出的指令仍以上面的内置八节开头 |
| P1-03 | 烘焙 | a) [DNMSC] 的 `lib/compact-policy.js` 与内置 prompt 常量是唯一手写源。b) [DNMS] `scripts/bake-compact-shared.mjs` 在构建时读兄弟包文件，写出 `lib/compact-policy.js` 与 `lib/compact-prompt.js`，文件头标明生成、写明源路径，禁止手改。c) 运行时 [DNMS] 不得 `import` [DNMSC]。d) 生成物提交入库，安装不依赖兄弟目录在场。e) 删掉现在手抄的 prompt 正文。 | 🆕 `dsh-nano-model-selector/scripts/bake-compact-shared.mjs`；两份 `lib/compact-policy.js`；`lib/compact-prompt.js` | `node scripts/bake-compact-shared.mjs` 再跑一次，两文件无 diff | `ACE1117-T03` | hash 测试失败当且仅当手改了生成物或真源没有重跑烘焙 |
| P1-04 | 协议 hash | a) 只锁 `function errorChain`（`:44-68`）与 `class BlockAssembler`（`:80-151`，类在 `:151` 结束）。宿主包版本注释 `@deepseek-ai/dsh@0.2.2-rc.1` 一并记在夹具说明里，但不把 `:185` 的 verbatim 横幅算进 hash。b) `:152-183` 的 `llmErrorFromFailure` / `newLlmError`、`:185` 的摘要横幅、`:251` 的 `frameSummary` 注释、`:346` / `:356` 的「Port of …」都是语义来源注释，不进这把锁，由 Phase 4 改。c) 选择器、prompt、帧的正文不进锁。锁里的函数体若要改语义，先停。 | `compact-region.js:44-68,80-151` | 改锁内一个空格即失败；改 `:185` 不得牵动预期 hash | `ACE1117-T04` | 切片止于 `:151`，不含 `:185` |

### 4.2 Phase 2 — 工具与 base 覆盖

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P2-01 | 工具实现 | a) 新插件文件默认导出工具，`name` 为 `inspect_checkpoint`。描述用 `-09②` 那句，不增删能力。b) 参数只接受 `compactionId`（必填）、`offset`（默认 0）、`limit`（默认 20，大于 50 按 50）。c) 只调用 session 的 `eventAt` 与 `deriveEventMessage`。不读 Provider、不读账本、不写文件、不建缓存。d) 输出头部含 id、总条数、本页范围、下一页 offset。正文跳过 `sourceEventSeqs` 里的 `compaction/start` 与 `compaction/summary`（现行写入把这两条放在数组开头，`compact-region.js:506`）。e) 单条工具结果超过 2000 字符则截断并写原长；非文本写占位；累计达到 24000 即停并给出下一页。f) `isConcurrencySafe` 返回 true；对象上不出现 `timeoutMs`。`presentCall` / `presentResult` 使用「查看压缩前原文」与范围。g) id 对不上时返回工具错误，并列出当前 surface 上可用的本插件 id。 | 🆕 `dsh-nano-model-selector-compaction/lib/inspect-checkpoint.js`；`package.json` 增加 `"./tools"` | 工具函数对夹具 journal 的输出与 `sourceEventSeqs` 的遮蔽段一致 | `ACE1117-T05` `ACE1117-T06` | T06 的跨会话与超限用例失败即未收口 |
| P2-02 | 生成 patch | a) `gen-mutex-patch.mjs` 在每个被重放的组合里，于工具行区追加 `{ name: 'dsh-nano-model-selector-compaction/tools' }`，不放进 `id: compaction` 的 `config`。b) 同一脚本增加 base bundle 的扁平重放：ON 态把扁平 `compaction-basic` 写成 `disabled: true`，并写入 Provider 行与工具行。源文件沿用现有 `--context` 的兄弟路径 `packages/bundle/base/cordis.patch.yml`（评估写过 `:355-356`；实施时以该文件里真实的 `compaction-basic` 行为准，不改宿主仓库）。c) sdk、acp 的文件不读、不写。d) `VERSION_GUARDED_ROWS` 保持只有 `tool-office` 这一条，不新增守卫设计。e) 重新生成 `cordis.patch.yml`，不手改 preset 块。 | `scripts/gen-mutex-patch.mjs:20-43,89-109`；`cordis.patch.yml` 中 `id: compaction` 出现处（`:117,:290,:381,:560` 一带） | smoke 断言：每个 preset 与 base 都有工具行；该行的父级不是 `id: compaction`；`compaction-basic` 为 disabled | `ACE1117-T07` | 生成器跑两次，除无意义空白外字节相同 |
| P2-03 | 识别 | a) 不给 `compaction/start` 加字段。宿主闭集只有三个键（§7.1 A-20）。b) 实施取定：本插件 checkpoint = journal 里带 `compactCheckpointSource` 的 user message，且其文本含工具名 `inspect_checkpoint`，并能在 `sourceEventSeqs` 里找到成对的 start。c) 查找范围是整个 journal，不限于当前 surface，以便已被再次压缩的旧 id 仍可查。d) `when` 只看当前 surface 有没有这样的消息。e) 上线前没有这句工具名的历史 checkpoint 认不出：返回与「不是本插件 checkpoint」相同的错误，不回写 journal，不查账本。 | 帧文本在 Phase 4 才换；本 Phase 的工具按上述标记读取。Phase 4 之前 `when` 在现网 journal 上为 false | 夹具里放一条无标记的旧 checkpoint 与一条有标记但已不在 surface 的 checkpoint；前者拒绝，后者在 surface 另有一条新标记时可读 | `ACE1117-T06` | 测试不 import 账本模块 |

### 4.3 Phase 3 — 生命周期与互斥

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P3-01 | 调度 | a) 重写文件头 `:8-12`：B 线越线即在同一 pre-step 起摘要；摘要完成后在下一个 step 边界、请求组装前提交；turn 先结束则在 idle 且摘要就绪时经 `agent.runMaintenance` 提交。删掉「摘要留到 idle 才开始」和「durable 锁跨过整个摘要」这两句。b) `:177` 的 `phase !== 'armed'` 是死路径（`:304` 在同一 pre-step 把 phase 改成 `running`）。只改这个相位条件：idle 时若 phase 是 `running`，等待 `episode.attempt` 结束后，若 `attemptReady`，在 `runMaintenance` 里调用 `_finishEpisode`。`:175` 的 `_overflowRetries.delete(agent)` 保持不动（`-18⑨`）。c) 不发送 adoption-wake，不调用 `followup`。现行代码已经没有这两处，保持没有。 | `host-compaction.js:8-12,139-188,290-327,385-391` | 测试：turn 结束时摘要尚未完成 → idle 后提交一次，且不新开 turn；下一次 pre-step 不会再提交同一 episode | `ACE1117-T08` | 源码里 `phase !== 'armed'` 不再是 idle 提交的条件 |
| P3-02 | 互斥 | a) 增加 session 级「lane 活跃」判断：在途 episode 的 phase 不是 `none`，或同步 `compactRegion` / `compactNow` 正在执行。用 engine 实例上的 per-session 标记，不造进程级锁，不造第二份 durable 状态。b) 进入手动 `compactNow`、`_compactPressure`（同步 FULL 与换模型）、overflow（`:534-539`）之前，若有在途 episode，先 `_disarmEpisode` 式结算，但 reason 记 `preempted`，然后继续本 lane。c) `preempted` 不增加 `circuit.transientFailures`。d) `_pressureGate` 在任一 lane 活跃时不 arm，记 skip，reason 沿用能区分的现有词或 `lane-active`（格式取定，见 P4-04）。e) `deferStart: true` 保持。`compact-region.js` 的 `openBracket`（`:639-645`）仍在提交瞬间复查未配对括号。不要把 `host-compaction.js:639` 当成开括号，那一行是锁已占用时的 `return null`。已存在的未配对 `compaction/start` 仍不自动清除（`-18⑦`，不改 `assertNoActiveCompaction`）。f) pre-step 的 catch → warn → `next()` 保持不抛（`-18④`）。 | `host-compaction.js:139-169,199,528-539,547-560,626-666,681-713`；`compact-region.js:604-645` | 摘要进行中调用 `compactNow`：episode 记 `preempted`，circuit 仍关闭，手动压缩能开始；不会出现两条重叠的 `compaction/start`。`:626` 起的 arm 在任一 lane 活跃时跳过。换模型走 `:199` 进入 `_compactPressure`，抢占写在该函数入口，不漏调用点 | `ACE1117-T09` | 抢占用例断言 `circuit.open === false` |
| P3-03 | 失败与清理 | a) `:315` 的 timer 到点：立刻 `_dropEpisode` 之前先把结算原因定为 `timeout`，abort 只为丢掉迟到结果；attempt 的 catch 看见 phase 已是 `none` 就不再记第二笔，也不把 `ABORTED` 算进 circuit。b) 非 transient（含 `no-range`、`failure`、`unknown`）记下 `openTurn`；同一 turn 内不再 arm。下一 `turn/start` 清除。transient 仍按两次进 circuit（`-18⑧` 的次数不改）。c) `:596` `info.context === undefined` 时写 skip，reason `no-window`，然后 return。不新增 `runtime.degraded` 取值。d) circuit 关闭且 phase 回到 `none` 时 `_episodes.delete(sessionId)`。circuit 开着则保留条目。e) 删除 `MAX_CLAIM_ATTEMPTS`（`:68`）与 `claimAttempts`（`:280` 及 `:307` 对它的读取）。不要用这个常数做新的重试环。 | `host-compaction.js:66-68,108-122,280,315-326,448-508,591-596` | 不响应 signal 的假 summarize：在测试时钟推进 120s 后 episode 条目消失（circuit 未开），迟到的 resolve 不再 commit。同一 turn 连续两次 `no-range` 只记一次失败。 | `ACE1117-T10` | `rg MAX_CLAIM_ATTEMPTS` 在包内为 0 |
| P3-04 | disarm | a) 保留 `:614-616` 的条件：在途且 `fillRatio < bufferSizeAsync` 则撤销。不要收窄成「只有 PUT 抬高了 B」。换更大窗口、pruner 把 fill 打下去，都只通过这条 step 边界比较生效。b) 改 `:330-331` 与 `:611-613` 的注释，去掉「owner raised B」是唯一原因的写法。c) 账本仍是 `kind:'drop', reason:'disarmed', bracketed:false`（`:349-354`）。不进 circuit。d) 不在 `pruneSession` 调用点加 disarm。 | `host-compaction.js:330-357,611-616,643-648` | 三例：抬高 B、W 变大、prune 后 fill 掉到 B 下。三例都是 `disarmed`，journal 无新括号 | `ACE1117-T11` | 注释与 `CORR-1` 一致；行为测试不依赖注释 |

### 4.4 Phase 4 — 选择器、prompt、帧

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P4-01 | 选择器 | a) 删除 `:368-380` 的「从尾累加到 `>= retain` 再往前找平衡点」。不留第二个导出、不留 flag。b) 边界来自 journal 里的 `turn/start`、`step/start`，读法复用 `eventAt`。`:545-565` 只认 `turn/start` / `turn/end` 并且认到就停，不是三级扫描，不能当成选择器。另写扫描。不要引用本仓不存在的 `types.d.ts:268-292`。c) 候选 = 保留 token 落在 `[下限, 上限]` 的边界。先在 turn 级里选离目标最近者，没有再看 step，再看平衡节点；同距离取保留更多者。d) 下限 = 至少留下一个完整平衡节点（`toolPairingBalancedBefore`）。上限 = `floor(回落线 × W) − system 头部 tokens − 8192`。8192 写成选择器内常量 `CHECKPOINT_RESERVE`，不进策略文件（`AF-3`）。e) 目标：async 用 arm 时冻结的 `min(pinnedAsyncTokens, floor(0.15·W))`；同步 FULL、手动、overflow 用 `pinnedFullTokens`；safety-only 用 0，下限仍生效。回落线：async 用 H；同步 FULL、换模型、手动、overflow 用 `safetyOnly ? S : B`。f) 上限 < 下限或没有候选 → `null`。async 的 null 仍走 `no-range`；`requireBelowThreshold` 的 null 仍走现有报错。g) 四个调用点都改为传目标与上下限。`:537` 与 `:692-696` 今天传 `0`，必须改掉。h) `validateSurfaceRegion`（`:388-406`）与 system 头不被遮蔽保持。 | `compact-region.js:351-386,388-406`；`host-compaction.js:368,537,569-572,692-696` | 夹具：turn 边界落在区间内时不选 step；只有 step 落在区间内时不选 node；同距离选保留更多；单节点超过上限则 null，而不是把该节点硬留下 | `ACE1117-T12` | `rg "accumulated >="` 在选择器里为 0；四条 lane 的测试都看到同一次函数调用 |
| P4-02 | prompt | a) 保留 `:195-217` 的八个段落标题与顺序，保留 `:224` 的 prior checkpoint 合并句。b) 删除 `:222`。不要把「不提压缩」改写成更委婉的同义句。c) step 级时，在内置指令之后、附加要求之前，加入当前 turn 的开场 `user/message` 原文（`turn/start` 之后第一条 user）。这是指令的一部分，不是第二份模型可见消息。turn 级或 node 级不插入这段。d) `buildSummarizationInput`（`:526-537`）仍是 system + 被遮蔽段 + tools，不改组成。e) 语义来源注释改掉，不进 P1-04 的 hash：`:185` 的 verbatim 横幅、`:251` 的 `frameSummary` 注释、`:346` 与 `:356` 的「Port of …」。切点注释指向 `-03` / `-08`，prompt 与帧指向 `-07` / `-08⑤`。`errorChain` 与 `BlockAssembler` 的协议来源注释不动。 | `compact-region.js:185-230,526-537` | 测试锁定八节标题、合并句、没有「Do NOT mention」、step 级夹具的用户原句出现在指令里且不出现在帧里 | `ACE1117-T13` | 附加要求再长，八节仍在它前面 |
| P4-03 | 帧 | a) 替换 `CHECKPOINT_PREAMBLE`。执行文本（字段集合以 `-08⑤` 为准，测试锁定整段，不另准一套同义改写）：说明此前一段已被下方摘要替换、checkpoint 之后是未改动原文、需要原文时按 `compactionId` 调用 `inspect_checkpoint`。固定字段只放替换条数、替换估计 tokens、保留尾部起始级别、`compactionId`、工具名。b) 级别为 node 时帧里写 `message`，账本仍写 `node`（`AF-7`）。c) 不写时间戳、模型名、prompt 版本、未提交的 phase。d) 保留 `<compacted-summary>` 标签与 `frameSummary` 的前后包裹。e) 协议仍是 user message + `surfaceOp.replace` + `compactCheckpointSource`，不改角色，不另发 `notice`。 | `compact-region.js:248-258,442-445,504-507` | 提交后的 checkpoint 文本含工具名与 id，不含 ISO 时间与模型名；账本 `boundary` 在 node 级为 `node` | `ACE1117-T13` | 与 P4-02 同一测试文件里的同一组断言，不拆成互不引用的两套 |
| P4-04 | 账本格式 | a) 实施取定（不是新 Truth-ID）：每次选择追加一条 `kind:'select'`，字段 `lane`（`async`/`full`/`manual`/`overflow`）、`boundary`（`turn`/`step`/`node`）、`retainedTokens`、`targetTokens`。null 选择不写 `select`，async 仍写现有 `no-range`。`select` 不是落定。异步的 `select` 写在摘要开始之前，末条会在 `claim` 与 `commit` 之间停留很久。b) `drop.reason` 增加使用 `preempted` 与 `timeout`（`disarmed` 已有）。`skip.reason` 增加 `no-window`。c) 不新开文件，不把账本当恢复源。d) [DNMS] 读侧对未知 kind 保持现在的退路，不因为多了 `select` 就抛错。 | `lib/async-history.js:48`；`host-compaction.js` 各 lane；`history-format.js` 的未知 kind 分支 | 四条 lane 的成功路径各有一条 `select`；`boundary` 不用 `message` | `ACE1117-T14` | 关掉账本写入（抛错）时压缩仍提交 |

### 4.5 Phase 5 — 观测与 UI 心跳

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P5-01 | 按 session 读 | a) `asyncCompactHandlers` 在查询有 `sessionId` 时解析该 session，把对象传进 `runtime`。禁止再调用 `runtime(null, …)` 来表示「当前会话」。b) 没有 sessionId 时 `lastCompaction` 为 null，不走 `latestSession` 跨会话折叠（`compact-runtime.js:120-125` 这条退路从会话读面上拿掉）。c) projection 注册已经在 `:65-90`，本项不重写一套。注册失败时的 per-session Map 保持 `-21①` 的退化，仍按 id 取。d) 徽标的 committed 不再用 `index.js:393` 的 10 分钟窗口，也不再用 `resolvePhase` 的 commit TTL。committed 只来自 projection 的 `lastCompaction`。在途 phase 仍来自账本。e) 客户端若宿主公开导出 `useProjection`，committed 用它，零轮询。若没有这个公开导出：不自己造投影、不 import 宿主私有路径；committed 随 P5-02 的事件拉取到来，不为此加定时器。 | `index.js:390-407,419-493`；`lib/compact-runtime.js:111-171` | 会话 A 的 GET 不会带回会话 B 的 `lastCompaction`；projection 抛错时该字段为 null 且 GET 仍 200 | `ACE1117-T15` | 源码不再有 `runtime(null` |
| P5-02 | 定时器 | a) 删除 `ModelSelector.jsx:298` 的 15s `setInterval`。库存与水位只在打开面板、切换开关之后读。打开面板时的那一次保留。b) 删除 `AsyncStatusBadge.jsx:52` 的自调用 `setTimeout`，并删除只为它存在的 `:22-24` 常量。c) 删除 `CompactPanel.jsx:102` 的 30s `setInterval`。d) 删除 `AsyncHistoryDialog.jsx:103` 的 `setTimeout`。`:99-102` 的门不再排程。e) 一个共享 store：在打开面板、打开对话框、`useSessionStatus.running` 变化、projection 推送时拉一次账本。续拉条件是 session 正在运行，且该 session 的 episode 还没有 `commit` 或 `drop`。`select` 算在途，不得把未知 kind 落成 idle 就停。`index.js:363-406` 的 `derivePhase` 要认识 `select`，不能继续落到 `:406` 的 idle。落定（`commit` / `drop`，含 `disarmed`、`timeout`、`preempted`）即停。实施取定间隔 3000。f) 改完 `src/` 后按包内既有 `npm run build` 重建 `lib/client.js`。不手改产物。 | 上列四个 jsx；`lib/client.js`；`src/client/compact.js` | 四个调用点与产物里都没有对应的常驻调度；运行中且无在途 episode 时调度次数为 0 | `ACE1117-T16` | 只 grep `setInterval` 不算过；见 §8.5 |
| P5-03 | 入口与文案 | a) `ModelSelector.jsx:791-806` 的顶栏按钮已经在搜索框与关闭按钮之间，且 `compactInstalled` 为假时不渲染。保持这个位置。rail（`:814` 起）不增加压缩入口。b) `doSwitch`（`:153`）在 POST 之前用宿主 Modal 或既有 `NanoDialog` 确认。取消则不请求。返回后的四类表现保持：`applied`、`restart-required`、`overridden`、失败。不新造第五类。c) 删 `CompactPanel.jsx:185-186`「等号合法」。`DETAIL.zh.md:15` 与 `:16` 改成同一套严格顺序，去掉「可以等于」。d) 中英 locale 键集合必须相等。不规定键的个数。缺的新句子（附加要求、目标、确认）两边一起加。e) 不新增 localStorage 键。不碰 `dsh-nano-model-selector:media-engine.v1` 与 `dsh-perf-review`。f) 更新 [DNMS] `AGENTS.md` 里仍写着 10 分钟窗口、15s/3s 轮询、`summaryPrompt` 指纹、7 字段不含附加要求的句子。顶栏那一节的位置与「仅 companion 已安装」保持。g) 改到的压缩 UI 按 `docs/specs/dsh-nano-ui/DESIGN.md` §10 登记。这是 `B09` 已有的规格义务，不新造检查脚本。 | `ModelSelector.jsx:180-186,791-814`；`CompactPanel.jsx:153-189`；`DETAIL.zh.md:15-16`；`dsh-nano-model-selector/AGENTS.md` 异步压缩节 | 未确认不会发出 POST；DETAIL 两行不再互相矛盾；rail 源码没有压缩按钮 | `ACE1117-T17` | `check-ui-rules` 对改动文件不新增告警 |
| P5-04 | 声明 | a) 不改 `declaration.js` 的 `TOP_KEYS`。b) 在 [DNMS] `declaration.json` 的 `budgets` 增加一条：`id` `async-inflight-poll`，`subject` `inflight-poll-ms`，`rule` `{op:"eq", limit:3000}`，`gate` `"audit"`，不带 `scenario`，不新增 driver。c) 用既有烘焙更新 `lib/perf-declaration.js` 的 hash，不手改 hash。d) 今天的 `validateDeclaration` 允许缺 `scenario`（`declaration.js:114`），所以不得用「runner 可能会拒绝」事先删掉这条 budget。若实施时某个既有 runner 真的把它当成启动错误，可以删掉 budget，但源码常量必须仍是 3000，并由 T16 断言；不得改 [DNPR] 校验器，不得改成 `gate:"hard"`，不得把 `budgets` 这个词写进 `lib/perf-declaration.js`（`declarations.test.mjs` 禁止切片含这个词）。e) [DNMSC] 不创建 `src/perf/declaration.json`。 | `dsh-nano-model-selector/src/perf/declaration.json`；`lib/perf-declaration.js` | `validateDeclaration` 通过；[DNMSC] 路径不存在该文件 | `ACE1117-T16` | 声明里的 3000 与源码常量是同一个数字 |

### 4.6 Phase 6 — 收口

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P6-01 | closure | a) `:20` 现在写着 adoption-wake 与「全在 runMaintenance」。改成指向 `-05`：同一 pre-step 起摘要，下一 step 边界或 idle `runMaintenance` 提交，不发送唤醒消息。b) `:74` 按原句把 `docs/specs/dsh-nano-model-selector/plan/DNMS01-audit-agent27.md` 移到 `.anote/reviews/DNMS01/`（目录不存在就创建）。移完后该行改为已经移动，不改别的残留项。c) 不改 `:19`、`:23` 等其他验收行的历史判定。 | `closure/DNMS01-closure.md:20,74` | diff 只碰这两处，外加被移动的那个文件 | `ACE1117-T19` | `git diff -U0` 上该文件的 hunk 锚点只有这两行附近 |
| P6-02 | 非目标核对 | a) 相对基线 `fb7264d` 的 `git diff fb7264d...HEAD` 不得包含 `async-compaction.md`、`RELEASE.md`、`DNMS01-qna.md`、`DNMS01-qna-truth.md`。AMEND-4..6 已在 `:309-311`，不追加。b) 不得新增 `scripts/check-ace*`。`scripts/test-all.mjs` 相对基线无 diff，闸门仍是 §8.5 T19 列出的 7 条。c) 不把 `/tmp/dnms-evidence/` 拷进仓库。未跟踪文件也算。d) 包版本号不因本计划而改。 | 仓库根 | 相对 `fb7264d` 的非目标路径 diff 为空，且 `git status --porcelain` 在提交后的工作区为空 | `ACE1117-T19` | 干净工作区上的无参数 `git diff` 不算数 |

---

## 5. Phase 详情

### 5.1 Phase 1 — 策略硬切与共享烘焙

- **Phase 目标**：策略文件的读与写符合 `-10①②` 与 `-07②`，并且 [DNMS] 不再手持第二份。
- **本 Phase 对应编号**：`P1-01` / `P1-02` / `P1-03` / `P1-04`
- **本 Phase 新增文件**：`dsh-nano-model-selector/scripts/bake-compact-shared.mjs`
- **本 Phase 修改文件**：两包的 `lib/compact-policy.js`；`compact-region.js` 的 `instructionText` / `instructionVersion`；`CompactPanel.jsx` 的 prompt 编辑区；`test/compact-policy.test.mjs`
- **本 Phase 删除文件**：无单独删除；手抄 prompt 正文被生成物替换
- **具体功能预期**：
  1. 一份 S=0.80 的现存 JSON 被 `readState` 拒绝，引擎进入已有的 safety-only，面板能看到 `state-read-failed`，文件内容不被改写。
  2. PUT `{bufferSizeSafety:0.90}` 与 PUT `{healthTargetAsync:0.65, bufferSizeAsync:0.65}` 都是 400，盘上字节不变。
  3. `effectivePin/W >= H` 的策略仍能保存，GET 的 `dcs` 含 DC-1。
  4. 带 `summaryPrompt` 的文件同样进入 safety-only，即使值是 `""`。
  5. 只设置 `extraRequirements` 时，发出的指令以上面八节开头，附加段在后，`promptVersion` 是整段的前 8 位。
  6. 烘焙跑两次无 diff。运行时 [DNMS] 的 import 图里没有 [DNMSC] 的包名。
- **对应测试台账项**：`ACE1117-T01` / `T02` / `T03` / `T04`
- **收口标准**：四个 Test-ID 在既有 `npm test` 里 PASS，且没有新的仓根脚本。
- **本 Phase 风险提醒**：`-18⑤` 整条没有被接替，safety-only 仍然不 arm、不读 B/H/pinned。被接替的是 `-15` 里的 S=0.80，所以这条线上的常量跟随 `-10①`，用已经写在代码里的 0.90。不要把「不 arm」也改掉。

### 5.2 Phase 2 — 工具与 base 覆盖

- **Phase 目标**：工具按 `-09` 可注册，且 ON 态不再留下一条未禁用的扁平 `compaction-basic`。
- **本 Phase 对应编号**：`P2-01` / `P2-02` / `P2-03`
- **本 Phase 新增文件**：`dsh-nano-model-selector-compaction/lib/inspect-checkpoint.js`
- **本 Phase 修改文件**：`package.json` 的 `exports`；`scripts/gen-mutex-patch.mjs`；生成的 `cordis.patch.yml`
- **具体功能预期**：
  1. 工具行的 `name` 是 `dsh-nano-model-selector-compaction/tools`，与 Provider 行同一文件，不在 isolate 组的子行里。
  2. 跨会话的 `compactionId` 得到错误，不返回正文。
  3. 单条 2001 字符的工具结果被截断并带原长；总长到 24000 停止并给出下一 offset。
  4. 响应对象没有 `timeoutMs`，`isConcurrencySafe()` 为 true。
  5. base 扁平行与四个 preset 的 `compaction-basic` 都是 `disabled: true`。sdk/acp 文件的 diff 为空。
  6. 无标记的历史 checkpoint 不会被列进「可用 id」。
- **对应测试台账项**：`ACE1117-T05` / `T06` / `T07`
- **收口标准**：T06 的攻击用例全部按预期失败（工具拒绝），不是按「没有抛异常」算过。
- **本 Phase 风险提醒**：`files` 与 `exports` 必须带上新文件，否则 `check-clean-lib` / 安装包会缺模块。这是既有检查，不是新闸。

### 5.3 Phase 3 — 生命周期与互斥

- **Phase 目标**：`B11` 里指向 `-05` 的缺陷在选择器替换之前先关掉。
- **本 Phase 对应编号**：`P3-01` / `P3-02` / `P3-03` / `P3-04`
- **本 Phase 修改文件**：`lib/host-compaction.js`
- **具体功能预期**：
  1. arm 之后 phase 是 `running`，摘要的 promise 已经开始，不等 idle。
  2. 摘要在 turn 结束后才就绪：idle 路径提交一次，journal 括号成对，没有第二份模型可见消息。
  3. 手动压缩抢占在途 episode：账本 `preempted`，circuit 计数不变，随后手动 lane 能提交。
  4. 120s 到点后 phase 为 `none`，Map 在 circuit 关闭时无此 session；迟到的 summary 不写 journal。
  5. 同一 turn 内 `no-range` 不热循环。下一 turn 可以再试。
  6. fill 掉到 B 以下的三种原因都记 `disarmed`，且 `bracketed:false`。
  7. pre-step 里的异常仍不抛出，turn 继续。
- **对应测试台账项**：`ACE1117-T08` / `T09` / `T10` / `T11`
- **收口标准**：既有 `async-takeover.test.mjs` 里被本 Phase 推翻的断言随行为一起改，不保留「等 armed 才在 idle 启动摘要」的旧断言。
- **本 Phase 风险提醒**：不要为了互斥去自动补 `compaction/end` 来清掉别人留下的未配对括号。那是 `-18⑦` 仍有效的行为。

### 5.4 Phase 4 — 选择器、prompt、帧

- **Phase 目标**：四条 lane 的切点、告知模型和告知摘要器的文本同时切到冻结语义。
- **本 Phase 对应编号**：`P4-01` / `P4-02` / `P4-03` / `P4-04`
- **本 Phase 修改文件**：`lib/compact-region.js`；`lib/host-compaction.js` 的四个调用点；`lib/async-history.js` 的调用方
- **具体功能预期**：
  1. 先只在最高一级里选：turn 级只要有落在区间内的候选，就在这些 turn 候选里选离目标最近的，即使某个 step 更近也不下降。这一级没有候选才看 step，再看平衡节点。不把三级放在一起比距离（`-03①` 的最高一级，`-08④` 的「最近 / 同距留更多」用在该级内部）。
  2. 同级同距离，保留 token 更多的那个边界胜出。
  3. 唯一的平衡节点若使保留量高于上限，返回 null，不把节点切半，也不退回旧的 `>=` 算法。
  4. 手动与 overflow 的调用能在账本里留下 `lane:'manual'` / `'overflow'` 的 `select`。
  5. step 级指令含开场用户原句；帧不含该补偿块，也不含 prompt 版本。
  6. 帧的 node 级写成 `message`；账本仍是 `node`。
  7. 账本写入抛错时，journal 括号仍提交成功。
- **对应测试台账项**：`ACE1117-T12` / `T13` / `T14`
- **收口标准**：T12 与 T13 同一轮 `node --test` PASS。只 PASS 其中一个不算 Phase 收口。
- **本 Phase 风险提醒**：`CHECKPOINT_RESERVE` 写进策略 JSON 就是 `AF-3` 禁止的那类 clamp。常量只能留在选择器文件。

### 5.5 Phase 5 — 观测与 UI 心跳

- **Phase 目标**：人能看见在途与已提交，模型看不见在途；客户端不再有四条常驻调度。
- **本 Phase 对应编号**：`P5-01` / `P5-02` / `P5-03` / `P5-04`
- **本 Phase 修改文件**：`index.js`、`lib/compact-runtime.js`、四个客户端模块、locale、`DETAIL.zh.md`、[DNMS] `AGENTS.md`、`declaration.json`、重建的 `lib/client.js` 与 `lib/perf-declaration.js`
- **具体功能预期**：
  1. 带 sessionId 的 GET 使用该 session 的 projection。
  2. 不带 sessionId 的 GET，`lastCompaction` 为 null，而不是最近一个发出事件的会话。
  3. 面板关闭、会话不在运行：测试时钟推进 60s，拉取次数不增加。
  4. 会话运行且 episode 未结算：按 3000ms 续拉。中间写入 `select` 不得把相位判成 idle。出现 `commit` / `drop` 后停止。
  5. 未点确认，switch 路由不被调用。
  6. 顶栏按钮的 DOM 位置仍在搜索框与关闭按钮之间；rail 子树没有压缩按钮。
  7. `detail.zh` 的第 15 与第 16 行都是严格小于，没有「可以等于」。
- **对应测试台账项**：`ACE1117-T15` / `T16` / `T17` / `T18`
- **收口标准**：T16 同时断言 `src/` 与 `lib/client.js`。只断言源码不算收口。
- **本 Phase 风险提醒**：水位图标的数字会在面板关闭期间变旧。这是退役常驻定时器的结果，不要用一条新的 15s 定时器「修」它。

### 5.6 Phase 6 — 收口

- **Phase 目标**：`-10⑦` 点名的两处文档，以及确认非目标文件没有被改。
- **本 Phase 对应编号**：`P6-01` / `P6-02`
- **本 Phase 修改文件**：`closure/DNMS01-closure.md`；移动 `plan/DNMS01-audit-agent27.md`
- **具体功能预期**：
  1. `:20` 不再把唤醒消息写成现行行为。
  2. `:74` 的待移动项已经不在 `plan/` 下。
  3. `async-compaction.md` 的 blob 与 Phase 6 开始前一致。
- **对应测试台账项**：`ACE1117-T19`
- **收口标准**：T19 的路径清单 diff 为空。
- **本 Phase 风险提醒**：不要把 closure 其他行的「S-line 0.80」历史证据改写成 0.90。那是当时的记录。现行合同在 [真相层]，不靠改旧验收表来成立。

---

## 6. 依赖的冻结设计决策（只读引用）

> 只引 ID。规则句以 [真相层] 为准。本表不新开问题。

| 决策 / Q ID | 冻结来源 | 本计划中的影响 | 若不成立的处理 |
|-------------|---------|----------------|----------------|
| `B01`–`B04` | 真相层 §2.1 | 评估与 [nano-agent] 只作索引；步骤与它们冲突则删步骤 | 停止并回问答 |
| `B05` `B09` | 真相层 §2.1 | 不改宿主、不嫁接 DOM；UI 顺序不变 | 停止 |
| `B06` | 真相层 §2.1 | 账本 / runtime / UI 不得成为恢复读源 | 停止 |
| `B07` `AF-9` | 真相层 §2.1、§4.4 | 不改默认 OFF 的原文，不裁决 R-16.5 | 停止 |
| `B08` | 真相层 §2.1 | [DNMSC] 不加 [DNPR]；节奏只进 [DNMS] 声明 | 停止 |
| `B10` `B13` `-10⑥` | 真相层 §2.1、§2.8 | 242/260 与 39/260 只作对照；不新增闸 | 把重放写成闸即违反，删掉该闸 |
| `-01` | 真相层 §2.2 | 本计划只 CITE；不改 `async-compaction.md`；AMEND 不重写 | 停止 |
| `-02` `AF-5` | 真相层 §2.2、§4.4 | 协议不改；工具不再被 `-02④` 否决 | 停止 |
| `-03` `-08` `AF-3` `AF-4` `AF-7` `AF-14` | 真相层 §2.3、§4.4 | Phase 4 的选择器与帧；行号以 `AF-14` 为准 | 停止 |
| `-04` `-09` | 真相层 §2.4 | Phase 2 与帧；识别方式是实施取定 | 停止 |
| `-05` `CORR-1` `AF-10` | 真相层 §2.5、§4.5 | Phase 3；不改 `-18⑥`；不改 `-18③④⑤⑦⑧⑨` 的其余行为 | 停止 |
| `-06` `-21①` | 真相层 §2.6；DNMS01 `-21①` 仍有效 | Phase 5；`-21④` 已被 `-06③④` 接替，不得再实现成「绝对零定时器且不续拉」 | 停止 |
| `-07` `AF-8` | 真相层 §2.7、§4.4 | Phase 1；字段名不回问答登记 | 停止 |
| `-10` `AF-1` `AF-2` | 真相层 §2.8、§4.4 | 严格顺序继续有效；Phase 1、5、6 | 停止 |
| `-11` | 真相层 §2.9 | 不把委托项写成新 ID；defer 项不做 | 停止 |

---

## 7. 内置 Reference-Anchor 锚区

### 7.1 锚表

> 行号核于 `HEAD fb7264d`（2026-11-17）。与 [真相层] 目标句不一致时以 `AF-14` 为准，不回改目标句。

| 锚 ID | `path:line` | 落点（这是什么） | 本 AP 用途 | 处置 | 备注 |
|-------|-------------|------------------|------------|------|------|
| A-1 | `dsh-nano-model-selector-compaction/lib/compact-policy.js:13-16,23-25,81-83,233-236` | 等号注释、S=0.90、`<=` 比较、0.80 读时改写 | P1-01 | ✅ 复用 | [DNMS] 副本同号段，改完即改为生成物 |
| A-2 | `compact-policy.js:37,47,117-118,193-209` | `summaryPrompt` 字段与 12000 长度 | P1-02 | ✅ 复用 | 键改名为取定的 `extraRequirements`，上限 4000 |
| A-3 | `compact-region.js:190-225,228-230,244-245` | 内置指令、整段替换、版本指纹 | P1-02、P4-02 | ♻️ 重 substrate | `:222` 删除；`:195-217` 与 `:224` 留下 |
| A-4 | `compact-region.js:44-68,80-151` | `errorChain` 与 `BlockAssembler`（类在 `:151` 结束） | P1-04 | ✅ 复用 | 只加 hash。`:185` 不在锁内 |
| A-5 | `compact-region.js:248-258,504-507` | 帧与 `sourceEventSeqs`（含 start/summary） | P2-03、P4-03 | ♻️ 重 substrate | 工具必须跳过数组里的括号事件 |
| A-6 | `compact-region.js:351-386,388-406,526-537` | 旧选择器、校验、摘要输入 | P4-01、P4-02 | ♻️ 重 substrate | 校验与输入组成不动 |
| A-7 | `host-compaction.js:8-12,174-188,300-304` | 过时头注；dead idle；arm 即 running | P3-01 | ✅ 复用 | `:177` 的 `armed` 判断是缺陷，不是要保留的合同 |
| A-8 | `host-compaction.js:315-326,338-357,448-508,614-616` | 只 abort 的超时；disarm；不删除的 settle；fill&lt;B | P3-03、P3-04 | ✅ 复用 | disarm 条件已经是 fill&lt;B；要改的是注释和超时结算 |
| A-9 | `host-compaction.js:66-68,95,108-122,280` | 120s、死常量、永不删除的 Map | P3-03 | ✅ 复用 | 120s 数值不改 |
| A-10 | `host-compaction.js:368,534-539,559-560,569,692-696` | 四条 lane 的 retain 入口 | P4-01 | ✅ 复用 | `:559` 只覆盖 `_compactPressure`。手动与 overflow 今天传 0 |
| A-11 | `compact-region.js:604-609,633,639-645`；`host-compaction.js:376` | `deferStart` 与提交时才 `openBracket` | P3-02 | ✅ 复用 | `AF-14`。宿主 `:639` 不是开括号 |
| A-12 | `scripts/gen-mutex-patch.mjs:20-28,41-43,89-109` | 四 preset 重放；没有 base | P2-02 | ♻️ 重 substrate | `VERSION_GUARDED_ROWS` 不改机制 |
| A-13 | `dsh-nano-model-selector/index.js:393,428,482` | 10 分钟 committed；`runtime(null, …)` | P5-01 | ✅ 复用 | `null` 是 session 参数，不是 `lastCompaction` 字面量 |
| A-14 | `lib/compact-runtime.js:65-90,111-129,159-171` | projection 已注册；`latestSession` 退路 | P5-01 | ✅ 复用 | 不重写注册；拿掉跨会话退路 |
| A-15 | `ModelSelector.jsx:273-300,791-806` | 15s 拉取；顶栏按钮已在 | P5-02、P5-03 | ✅ 复用 | 顶栏不重做；定时器删除 |
| A-16 | `AsyncStatusBadge.jsx:22-24,52`；`AsyncHistoryDialog.jsx:37,99-103`；`CompactPanel.jsx:102` | 常驻调度。徽标与对话框是 `setTimeout` 链，不是 `setInterval` | P5-02 | ✅ 复用 | `AF-14` |
| A-17 | `CompactPanel.jsx:153-177,185-186,332,495-498` | 无确认的 switch；等号文案；全文 prompt 编辑 | P1-02、P5-03 | ✅ 复用 | 四类结果文案留下 |
| A-18 | `DETAIL.zh.md:15-16` | 第 15 行允许等号，第 16 行又要求严格小于 | P5-03 | ✅ 复用 | 两行收成同一套严格顺序 |
| A-19 | `src/perf/declaration.json`；`declaration.js:10,108-119` | 闭合的顶层键；budget 的 `scenario` 可缺 | P5-04 | ✅ 复用 | 只加 audit budget。不改 `TOP_KEYS`。`:130-131` 只拒绝未知顶层字段 |
| A-20 | `context/deepseek-harness/packages/compaction/compaction/src/types.ts:24` | `compaction/start` 闭集三字段 | P2-03 | ⛔ 不改 | 只读对照。本仓计划不得编辑 `context/` |
| A-21 | `closure/DNMS01-closure.md:20,74` | 过时的唤醒句；待移动的审计稿 | P6-01 | ✅ 复用 | 只动这两处 |
| A-22 | `dsh-nano-model-selector/lib/bindings.js` 的烘焙方式（`scripts/bake-plugin-bindings.mjs`） | 构建期生成、运行时不跨包 | P1-03 | ✅ 复用 | 新脚本仿这个模式，不在运行时 import 兄弟包 |
| A-23 | 既有测试：`test/compact-policy.test.mjs`、`async-takeover.test.mjs`、`host-cordis-smoke.test.mjs`；[DNMS] `test/async-history.test.mjs`、`history-format.test.mjs`、`water-line.test.mjs`、`bundle-inventory.test.mjs` | `-10⑥` 点名的入口 | 全部 Phase | ✅ 复用 | 新断言写进这些文件。见 §8.2 |

### 7.2 反例 ledger

| ⛔ | 反例 / 陷阱 | 为什么 |
|----|-------------|--------|
| ⛔1 | 把评估 §7 的 Q-ACE、100% 尾部含 user、provider 真值 fill、摘要验收器写进实现 | `B01`：评估不是合同 |
| ⛔2 | 保留旧选择器当 `mode: "legacy"` | `-03③` |
| ⛔3 | `summaryPrompt` 读到就剥离或拷进 `extraRequirements` | `-07②` 硬切不迁移 |
| ⛔4 | 帧里加时间戳、模型名、prompt 版本，或再发一条 `notice` | `-08⑤`、`-04①` |
| ⛔5 | 工具放进 `id: compaction`，或改用宿主 `dsh-tool-session-query` | `-09①`；Q4 未选 E |
| ⛔6 | 给 `compaction/start` 加 `engine` 字段 | `-02①` + A-20 闭集 |
| ⛔7 | 用账本判断「是不是本插件的 checkpoint」 | `B06` |
| ⛔8 | 超时 abort 后把 `ABORTED` 记进 circuit；或抢占记进 circuit | `-05②③` |
| ⛔9 | 把 disarm 收窄成「只有业主抬高 B」 | `CORR-1` |
| ⛔10 | 自动清除未配对的 `compaction/start` | `-18⑦` 仍有效 |
| ⛔11 | 改 pruner、改 `OVERFLOW_RETRIES`、新增第七个失败码 | `AF-10`、`-18④⑨` |
| ⛔12 | `runtime(null)` 继续代表当前会话；或无 sessionId 时回最新会话 | `AF-14`、不得跨会话 |
| ⛔13 | 只删 `setInterval`，留下徽标与对话框的 `setTimeout` 自调用 | `AF-14` |
| ⛔14 | 只改 `src/`，不重建 `lib/client.js` | 安装面仍是旧定时器 |
| ⛔15 | 为水位图标加回 15s 定时器 | `-06④` |
| ⛔16 | 把 3000ms 做成 `gate:"hard"` 或给 [DNMSC] 加 declaration | `B08`、`B13` |
| ⛔17 | 新写 `scripts/check-ace-1117.mjs` 或改 `RELEASE.md` | `B13`、`-10⑥` |
| ⛔18 | 修订 `async-compaction.md`，或再写一份 AMEND | `-01⑤②` |
| ⛔19 | 把 `B10` 的时延或 242/260 写成测试必须打到的阈值 | `B10` 不是 SLA |
| ⛔20 | 实施时顺手「修」R-16.2 的类身份或 `plugin add` 默认 ON | `-11④` |

### 7.3 上游真源指针 + 安全项威胁模型

- **独立 reference-anchor**：无。本节目是 grounding 真源。宿主类型只作只读对照（A-20），不把 `context/` 纳进 diff。
- **威胁模型**（P2-01、P2-03、P5-01 必读）：
  1. **跨会话读取**：攻击者拿另一会话的 `compactionId` 调用工具。必须失败，且错误里的「可用 id」只来自当前会话 surface。
  2. **把原厂或无标记 checkpoint 当成可读取**：没有锁定标记的 id 必须走同一错误路径，避免靠「凡是 checkpoint 都能读」扩大范围。
  3. **体积**：单条工具结果与单次总长是上限，不是建议。测试用刚好 2000、2001、以及累计跨过 24000 的夹具。
  4. **写与副作用**：工具模块不得调用 `session.append`、不得写账本、不得 `fetch`。测试对夹具 session 的 `append` 做计数，调用前后相等。
  5. **isolate 注入**：patch 里工具行若出现在 `id: compaction` 的子列表，T07 失败。这是 R-16.4 要挡住的「往 isolate 塞白名单外服务」。
  6. **账本当权威**：识别与恢复都不得读 `async-history/*.jsonl`。账本缺失时工具仍能读 journal。
  7. **跨会话 projection**：`runtime(null)` 会落到 `latestSession`（A-14）。会话读面必须拒绝这条退路，避免面板展示别人的 `lastCompaction`。
  8. **在途状态进入模型**：armed / running / failed 不得写进帧或任何 sourced 消息。T13 断言帧文本没有这些词作为状态。

---

## 8. 测试台账

> 断言写进 `-10⑥` 点名的既有文件。包内 `npm test` 已经是 `node --test test/*.test.mjs`，因此这些文件里的新 `test()` 会被现有脚本收集。这不是新闸。不新增 `scripts/check-*`，不改 `test-all.mjs` 的列表，不新增 soak 文件。
>
> **与模板的差异（以 [真相层] 为准）**：模板示例含 soak / 新 spike 文件。`B13` 与 `-10⑥` 禁止为此新增 release-gate。本计划的退出层就是下表标成「退出」的短途。没有 mega 旅程，没有 soak。证据重放保持 `未观察`，不参与 PASS。

### 8.1 测试清单

| Test-ID | 测试项 | 类型 | 层 | 来源 | 映射 | PASS 证据（四元组） |
|---------|--------|------|----|------|------|---------------------|
| `ACE1117-T01` | S=0.80 不被改写；H=B、B=S 为 400 且不写盘；DC-1 仍 full-only；PUT 带 S 为 400；两份副本同一夹具同一结论 | 短途 · 退出 | 契约 | ♻️ `test/compact-policy.test.mjs` 等号用例改拒绝 | P1-01 | 未观察 |
| `ACE1117-T02` | 键名 `extraRequirements`；4000 可写、4001 拒绝；空串不追加；`summaryPrompt` 空键也 invalid-schema；段落标题固定 | 短途 · 退出 | unit | 🔱 同上 + `async-takeover.test.mjs` 里现有 summaryPrompt 用例 | P1-02 | 未观察 |
| `ACE1117-T03` | 烘焙两次无 diff；生成物头注释在；运行时源码不 import 兄弟包 | 短途 · 退出 | 契约 | 🆕 断言放进 [DNMS] `test/host-cordis-smoke.test.mjs`（既有文件） | P1-03 | 未观察 |
| `ACE1117-T04` | 按符号切下的 `errorChain` 与 `BlockAssembler` hash 等于冻结夹具；Phase 4 不得改这把锁 | 短途 · 退出 | 契约 | 🆕 断言放进 `async-takeover.test.mjs`；预期 hash 放在该测试文件顶部的常量，不随选择器提交改写 | P1-04 | 未观察 |
| `ACE1117-T05` | 工具名、默认分页、截断、24000、present 文案、`isConcurrencySafe`、无 `timeoutMs`、`when` | 短途 · 退出 | unit | 🆕 断言放进 `async-takeover.test.mjs` | P2-01 | 未观察 |
| `ACE1117-T06` | 跨会话 id、无标记 checkpoint、off-surface 但有标记的 id、`append` 计数不变、不读账本、超限边界 | 短途 · 退出 | unit | 同上 | P2-01、P2-03 | 未观察 |
| `ACE1117-T07` | 工具行不在 isolate；base 与四 preset 的 `compaction-basic` disabled；sdk/acp 无 diff；守卫表仍只有 tool-office | 短途 · 退出 | 契约 | ♻️ `host-cordis-smoke.test.mjs` | P2-02 | 未观察 |
| `ACE1117-T08` | arm 后即 running；idle 且就绪则 `runMaintenance` 提交一次；无唤醒消息 | 短途 · 退出 | unit | 🔱 `async-takeover.test.mjs` 现有 arm/commit 用例 | P3-01 | 未观察 |
| `ACE1117-T09` | 四入口抢占记 `preempted` 且 circuit 不增加；lane 活跃时不 arm；未配对括号不被自动清掉；pre-step 异常不抛 | 短途 · 退出 | unit | 🔱 同上 | P3-02 | 未观察 |
| `ACE1117-T10` | 假时钟 120s 后 timeout 结算、迟到结果不 commit、不计 circuit；同 turn `no-range` 一次；`no-window` skip；circuit 关闭后 Map 无条目；无 `MAX_CLAIM_ATTEMPTS` | 短途 · 退出 | unit | 🔱 同上 | P3-03 | 未观察 |
| `ACE1117-T11` | 抬高 B、更大 W、prune 后 fill&lt;B，三例皆 `disarmed` 且 `bracketed:false`，不计 circuit | 短途 · 退出 | unit | 🔱 同上 | P3-04 | 未观察 |
| `ACE1117-T12` | 先 turn 再 step 再 node；同距离留更多；超上限 null 且不切半；四 lane 都进同一函数；手动/overflow 不传 0 | 短途 · 退出 | unit | 🆕 断言放进 `async-takeover.test.mjs` | P4-01 | 未观察 |
| `ACE1117-T13` | 八节还在；`:222` 的句子不在；合并句在；step 级原句在指令里不在帧里；帧字段闭合；node→帧 `message`、账本 `node`；无第二份模型消息 | 短途 · 退出 | unit | 同上，与 T12 同文件同轮 | P4-02、P4-03 | 未观察 |
| `ACE1117-T14` | 四 lane 各一条 `kind:'select'`，字段锁死；账本抛错时 journal 仍提交。不得用未知 kind 不抛的旧用例代替 | 短途 · 退出 | unit | 🔱 [DNMS] `test/async-history.test.mjs`、`history-format.test.mjs` | P4-04 | 未观察 |
| `ACE1117-T15` | 指定 session 的 projection；无 sessionId 不回别人的 `lastCompaction`；committed 不看 10 分钟常量 | 短途 · 退出 | unit | 🔱 [DNMS] `test/async-history.test.mjs` 或 `host-cordis-smoke.test.mjs` | P5-01 | 未观察 |
| `ACE1117-T16` | 四个调度点在 `src/` 与 `lib/client.js` 都消失；仅 running+在途 才续拉；声明 audit eq 3000；[DNMSC] 无 declaration | 短途 · 退出 | 契约 | 🆕 断言放进 [DNMS] `test/bundle-inventory.test.mjs`（既有文件，管轮询/库存） | P5-02、P5-04 | 未观察 |
| `ACE1117-T17` | 顶栏结构仍在；rail 无压缩入口；确认前无 POST；中英键集合相等；无新 localStorage 键；DETAIL 两行一致 | 短途 · 退出 | 契约 | 🆕 断言放进 [DNMS] `test/water-line.test.mjs` 与 locale 读取，不新开文件 | P5-03 | 未观察 |
| `ACE1117-T18` | `check-ui-rules --json` 对改动文件的告警集合只减不增；脚本仍是 warn-only，不进 `test-all` | 短途 · 退出 | 契约 | ♻️ 由 `water-line.test.mjs` 调既有脚本的 `--json`，不改脚本退出码 | P5-03 | 未观察 |
| `ACE1117-T19` | closure diff 只有 `:20` 与 `:74`；非目标路径 diff 为空；无新 check 脚本；`test-all.mjs` 闸门列表不变 | 短途 · 退出 | 契约 | 🆕 断言放进 [DNMSC] `test/host-cordis-smoke.test.mjs` 末尾，只做路径与 diff 模式检查，不启动宿主 | P6-01、P6-02 | 未观察 |
| `ACE1117-T20` | 只读证据重放：对新构建会话按评估 §2.3 的方法统计「切在 turn 中间」与「尾部无 user」，写在合入说明里，对照 `B10` 的 242/260 与 39/260 | 观察 · **不是退出** | live 只读 | 不建仓库内脚本。`/tmp` 工具不是交付物 | `-10⑥` 的对照，不映射为功能收口 | **保持未观察**，直到 [业主] 授权读 desktop profile。未观察不得写成 PASS |

### 8.2 复用台账

| 既有用例 | 处置 | 改动 | 起跑线状态 |
|----------|------|------|------------|
| `dsh-nano-model-selector-compaction/test/compact-policy.test.mjs` | ♻️ 改断言 | 等号用例改为拒绝；增加 0.80 读入拒绝、`summaryPrompt` 拒绝 | 已存在。本计划起草时未重跑，不起跑为绿 |
| `dsh-nano-model-selector-compaction/test/async-takeover.test.mjs` | 🔱 | 调度、互斥、选择器、帧、工具夹具 | 已存在。其中「idle 才开始摘要」「summaryPrompt 整段替换」的断言要随合同改，不能为保绿留着 |
| `dsh-nano-model-selector-compaction/test/host-cordis-smoke.test.mjs` | ♻️ | patch 结构、非目标 diff | 已存在 |
| `dsh-nano-model-selector/test/async-history.test.mjs` | 🔱 | `select` 记录、session 维度 | 已存在 |
| `dsh-nano-model-selector/test/history-format.test.mjs` | ♻️ | 未知 kind 不抛 | 已存在 |
| `dsh-nano-model-selector/test/water-line.test.mjs` | ♻️ | 顶栏/文案的纯函数或源码断言 | 已存在 |
| `dsh-nano-model-selector/test/bundle-inventory.test.mjs` | 🔱 | 定时器与库存「只在打开和切换后读」 | 已存在 |
| `scripts/check-ui-rules.mjs`、`check-client-rules.mjs`、`check-route-sensitivity.mjs`、`check-feature-contract.mjs`、`check-clean-lib.mjs`、`scripts/test-all.mjs` | ♻️ 沿用 | 0 改动（`test-all` 的列表不动） | 既有入口。UI 脚本是 warn-only，不得把它改成失败即非零来当新闸 |
| `packages/dsh-performance-review/test/declarations.test.mjs` | ♻️ 沿用 | 0 改动。它会读 [DNMS] 声明并断言 [DNMSC] 没有声明 | 已存在 |

### 8.3 分层与跑法

| 类型 | 跑法 / 频率 | 主要层 | 触发时机 |
|------|-------------|--------|----------|
| 短途 | 在对应包目录 `npm test`；仓根检查按脚本现有用法 | unit · 契约 | 每个 Phase 提交前 |
| 退出层 | 上表标「退出」的短途，加上不改列表的 `node scripts/test-all.mjs`（不加 `--build`，除非该提交改了必须构建的 `src/`；改了 `src/` 的提交先 `npm run build` 再测） | 契约 | 合入 `main` 前 |
| spike / mega | 不新增 | — | 本计划不做 |
| soak | 不新增 | — | `B13`。不做不等于「已通过」 |
| 观察 | T20，人工只读 | live | 仅 [业主] 授权之后。结果写入合入说明，状态保持 `未观察` 或单独记「已观察」，永远不填进退出 PASS |

### 8.4 测试缺口

- 不覆盖 desktop 全量重放的统计显著性（T20 只对照两个比例，且不是闸）→ 不交给后继计划假装已经覆盖。
- 不覆盖宿主 `CompactionNodeView` 无异步变体（`B05` 只登记）→ 不在插件里画一个对话内标记去补。
- 不覆盖 R-16.2 的 `instanceof` 升级、R-16.5 的安装默认、R-17 的新守卫、R-18 的导出守卫。
- 不覆盖 [DNPR] lab 场景与新 track。P5-04 的 audit budget 今天能通过校验器。只有实施时 runner 真的拒绝，才删掉该条，并且 T16 仍锁 `INFLIGHT_POLL_MS === 3000`。不补 scenario，不改校验器。
- 不覆盖上线前无标记的历史 checkpoint 的可读性（§2.3）。

### 8.5 测试保真（防假绿 · 逐条）

> 每一条都写「怎样会假绿」和「怎样才算数」。计数不等于收口。`degraded` 必须带着 `state-read-failed` 或工具错误的机器可读原因。预先失败的无关测试不得算进本计划 PASS。

| Test-ID | 假绿长什么样 | 怎样才算数 |
|---------|--------------|------------|
| T01 | 只断言 `SAFETY_RATIO === 0.90`。或把 0.80 读成 0.90 当成成功。或只测 [DNMSC] 一份 | 两份副本对同一夹具结论相同。读入 S=0.80 为 `ok:false`，文件字节不变。H=B 与 B=S 的 PUT 都不写盘。PUT 带 `bufferSizeSafety` 为 400。`effectivePin/W >= H` 仍可写，且 `fullOnly === true` |
| T02 | 只断言默认对象没有 `summaryPrompt`。或字段改名叫 `notes`、上限留 12000 | 键名就是 `extraRequirements`。`length === 4000` 可写，`4001` 为 `invalid-schema` 且不写盘。空串不追加段落。非空时八节之后是字面量 `Additional requirements:` 再接原文。键 `summaryPrompt` 即使值为 `""` 也是 `invalid-schema`。指纹用独立 sha256 对照整段 |
| T03 | 测试自己把源文件再写一遍然后比相等。或只比文件大小 | 跑烘焙脚本，相对该提交的父提交，两份生成物无未解释的手改。`index.js` 与 `src/` 的 import 字符串不含 `dsh-nano-model-selector-compaction` |
| T04 | 对整个 `compact-region.js` 做 hash，然后在改选择器的同一提交里改预期值。或按会漂移的行号切片 | 按符号切：`function errorChain` 到其结束，以及 `class BlockAssembler` 到下一个顶层声明之前。预期 hash 是测试文件里的常量。选择器 / prompt / 帧的 diff 若落进这两个符号，T04 失败，不得改预期值来放行 |
| T05 | mock 一个返回固定 JSON 的对象。或 `limit: 50` 只测默认 20 | 2000 与 2001 都要有。`limit: 999` 按 50。累计跨过 24000 时停并给出下一 offset。对象键集合不含 `timeoutMs`。`isConcurrencySafe()` 为 true |
| T06 | 两个 id 指向同一 session。或「有标记」用实现临时选的子串。或只捕获抛异常 | 两个 session。错误里的可用 id 只来自当前 surface。`append` 前后计数差为 0，账本模块调用计数为 0，`fetch` 与写文件计数为 0。有标记的夹具必须含字面量 `inspect_checkpoint`；把这个词换成别的词，与无标记走同一错误 |
| T07 | 只断言工具名字符串在 yaml 里出现过 | 解析 yaml：工具行祖先链没有 `id: compaction`。base 与四个 preset 的 `compaction-basic` 都是 `disabled: true`。模拟 OFF（不包含本包 patch 层）时 Provider 行与工具行都不在。`VERSION_GUARDED_ROWS` 仍只有 `tool-office`。生成器源码的预设列表不得新增 `sdk` / `acp` |
| T08 | 直接调用 `_finishEpisode`。或只断言日志里有 `runMaintenance` 这几个字 | `runMaintenance` 是计数桩。turn 结束前为 0，idle 后为 1。journal 括号成对，没有额外 user 消息 |
| T09 | 只走 `compactNow` 一条抢占。或不断言 circuit | 手动、同步 FULL、换模型、overflow 四条各自抢占一次。每次 `transientFailures` 不变，新提交的 `compactionId` 与被抢占的不同。预先种下的未配对 `compaction/start` 不得被补 `end`。pre-step 里抛出的异常不会变成 turn 失败 |
| T10 | 用真实 120s 墙钟。或只断言 abort 被调用 | 注入时钟。迟到的 resolve 不得增加 journal 事件，且不增加 circuit。同 turn 两次 `no-range` 只记一次。`info.context` 缺失记 `skip` / `no-window`。`MAX_CLAIM_ATTEMPTS` 源码检索为 0，改名也不算 |
| T11 | 只测抬高 B。或断言日志含 "raised" | 三例 reason 都是 `disarmed`，`bracketed` 为 false，circuit 不增加。prune 那一例不得要求修改 pruner 源码 |
| T12 | mock 选择器返回 `{boundary:'turn'}`。或只改 async 一条 lane，手动 / overflow 仍传 0 | 不 mock 选择器。同一测量上 turn 更远、step 更近时仍选 turn。只有 step 落在区间内时级别是 step。同距离取保留更多。超上限的单节点结果为 null，且不切半。常量 `CHECKPOINT_RESERVE === 8192`，策略 JSON 里没有这个数。async、同步 FULL、手动、overflow 四次调用打进同一个导出，后三条传入的目标不是 0。源码里 `accumulated >=` 不再出现在选择器中 |
| T13 | 整段快照，附加要求一变就更新快照。或把禁用句改成委婉同义句并改测试 | 八个标题按这个顺序出现，字面量不得换成同义词：`## Primary Request and Intent`、`## Key Technical Concepts`、`## Files and Code`、`## Errors and Fixes`、`## Pending Jobs`、`## Current Work`、`## Next Step`、`## Critical Context`。源码与发出的指令都不得再含 `Do NOT mention this summarization request or that the context was compacted.`。prior checkpoint 合并句仍在。step 级用户原句字节相等，且不出现在帧里。帧含字面量 `inspect_checkpoint` 与该次 `compactionId`，不含 ISO 时间、provider/model 名、八位指纹。node 级帧写 `message`。没有第二份模型可见消息 |
| T14 | 四条 lane 各写一条别的 kind。或用 `history-format` 里已有的 `future-kind` 不抛来代替 | 四条 lane 各有一条 `kind === 'select'`，`lane` 分别为 `async` / `full` / `manual` / `overflow`。`boundary` 只为 `turn`、`step` 或 `node`，不得为 `message`。每条都有 `retainedTokens` 与 `targetTokens`。账本桩抛错时 `compaction/end` 仍出现，且没有第七个失败码 |
| T15 | A 的对象比 B 多一个字段所以「不相等」。或 `runtime(sid)` 且 `sid` 为 null 绕过源码检索 | 会话 B 先产生带已知 `compactionId` 的 fold。以会话 A 调用时，结果里不得出现 B 的 id。不带 sessionId 时 `lastCompaction` 为 null。徽标 committed 的源码路径不得再读 `10 * 60 * 1000` 或 `ASYNC_COMMITTED_TTL_MS`。行为断言优先于 `runtime(null` 的文本检索 |
| T16 | 只 grep `setInterval`。或 grep 压缩产物里的 `setTimeout(tick`（今天就是 0，因为回调名已被压缩掉）。或把续拉改名 `pump` 挪到 `compact.js` | 源码侧：`ModelSelector.jsx`、`AsyncStatusBadge.jsx`、`CompactPanel.jsx`、`AsyncHistoryDialog.jsx`、`src/client/compact.js` 里不得再有链式 `setInterval(` 或 `setTimeout(<标识符>`。一次性 `setTimeout(() => …)`（toast、banner、copied）不算。产物侧：不检索源码标识符；`lib/client.js` 里不得再有面板 30s（`3e4` / `30000`）和徽标 15s（`15000`）那种常驻间隔。时钟四条：非 running 的 60s 内只有打开时那 1 次；running 且无在途为 0；running 且在途时相邻两次相差 3000；`select` 写在 `claim` 与 `commit` 之间时续拉继续，直到 `commit` 或 `drop` 才停。不得只认末条 kind 属于 `arm`/`claim`。`INFLIGHT_POLL_MS === 3000` 与声明里的 `limit: 3000` 是同一个数字。`declarations.test.mjs` 不读这个 limit，不得用它代替 T16。也不得改该测试，去放行 `lib/perf-declaration.js` 里出现 `budgets` 这个词 |
| T17 | 只断言 aria 文案。或确认框出现时 POST 已经发出 | 按钮位于 search 与 close 之间，不在 `nms-rail` 子树。确认回调之前 `postCompactSwitch` 计数为 0。locale 两边键集合相等，不断言个数等于 18。不新增 localStorage 键。`DETAIL.zh.md` 第 15 与第 16 行都是严格小于，没有「可以等于」 |
| T18 | 脚本 exit 0 就算过。或看总警告数下降。或把脚本改成失败即非零 | `water-line.test.mjs` 以 `node scripts/check-ui-rules.mjs --json` 取告警列表（不改脚本，不把它加进 `test-all.mjs`）。本计划触及的 jsx 告警集合只减不增。diff 里 `window.confirm`、`[class*=`、十六进制色值为 0 |
| T19 | 无参数的 `git diff` 在干净工作区上恒空。或先改 `test-all.mjs` 再把「当时的文本」写进测试 | 相对基线 `fb7264d` 做 `git diff --name-only fb7264d...HEAD`，并且 `git status --porcelain` 为空才算工作区干净。非目标路径（`async-compaction.md`、`RELEASE.md`、两份 DNMS01 问答/真相、`package.json` 的 version 字段若被单独改掉）相对该基线必须无 diff。closure 只用 `git diff -U0 fb7264d...HEAD -- closure/DNMS01-closure.md`，hunk 只许落在 `:20` 与 `:74` 附近。`scripts/test-all.mjs` 相对基线无 diff。其闸门列表必须仍是这 7 条，且不含 `check-ui-rules`：`scripts/check-clean-lib.mjs`、`scripts/check-client-rules.mjs`、`scripts/check-feature-contract.mjs`、`scripts/check-route-sensitivity.mjs`、`scripts/route-scan.mjs`、`scripts/compat-regression.mjs`、`scripts/security-regression/run.mjs`。未跟踪的 `scripts/check-ace*` 算失败 |
| T20 | 写一个断言 `midTurn === 0` 或 `noUser === 0` 的测试，用小夹具打绿，然后宣称达到 `B10` | 禁止把 T20 放进 `node --test`。合入说明若写比例，必须同时写会话数与压缩次数。未跑就保持 `未观察`。小夹具的选择器正确性只由 T12 证明 |

- ✅ 退出层 PASS 才填写四元组。T20 不填四元组。
- `state-read-failed` 与工具错误必须出现在断言的字段里，不能只看 HTTP 200 或「没有 crash」。
- 预先存在的失败：用 `git stash` 前后对照或注明失败测试名不属于本计划 diff。不得把它们算成已修。

---

## 9. 风险、依赖与完成后状态

### 9.1 风险与依赖

| 风险 / 依赖 | 描述 | 当前判断 | 应对方式 |
|-------------|------|----------|----------|
| 帧先于工具合入 | 模型被教会调用一个尚未注册的工具 | high | §1.2：Phase 4 不得单独先于 Phase 2 合入 |
| 宿主拒绝未知工具行 | patch 导致 preset 起不来 | medium | 工具是本包自己的 export，不是未知第三方包。smoke 在合入前解析 yaml。不起宿主做「试试看」 |
| `useProjection` 没有公开给插件 | committed 无法零拷贝订阅 | medium | P5-01 写了停手条件：不造第二投影，不 import 私有路径，用事件拉取带出已折叠的结果 |
| 声明 budget 无 scenario 被 runner 拒绝 | 3000 写不进声明 | low | 今天的校验器允许缺 scenario。真被拒绝时才删 budget，源码常量仍由 T16 锁在 3000，不改 [DNPR] |
| 旧 `summaryPrompt` 文件在硬切后全部 safety-only | 现网策略若手写过该键，会停止 async arm | high | 这是 `-07②` 的硬切，不是事故。合入说明里写明，不提供迁移脚本 |
| 选择器 null 变多 | 上限小于下限时 async 记 `no-range`，同步 FULL 可能报错 | medium | 与「现状一致」是合同。不要为了少报错把超限节点硬留下 |
| 顶栏水位变旧 | 关掉 15s 拉取后，关闭面板时图标不跟着变 | low | 接受。不恢复定时器 |
| 历史 checkpoint 不能 inspect | 无工具名标记 | medium | §2.3 已标明。不回写 journal |

### 9.2 约束与前提

- **技术前提**：工作分支从 `main` 的 `fb7264d` 或其后继切出，目录 `.agents/worktrees/ace-1117-async-compact`。不在别的路径建 worktree。
- **运行时前提**：`engines.dsh` 仍是 `>=0.2.2-rc.1 <0.3.0`。本计划不放宽。宿主公开事件名 `turn/start`、`step/start` 仍存在；若实施时 `eventAt` 看不到 `step/start`，停，回问答，不要改用私有字段猜 step。
- **组织协作前提**：未获 ImplementationGrant 前，本文件保持 `draft`，agent 不得按本文改产品代码。
- **上线 / 合并前提**：不改版本号，不改 `RELEASE.md`。发布与装包仍归 [业主]。

### 9.3 文档同步要求

- 随 Phase 改掉的注释与 `DETAIL.zh.md`、[DNMS] `AGENTS.md`、[DNMSC] `AGENTS.md` 里被推翻的 `summaryPrompt` / idle 调度句：在对应 Phase 提交。
- `closure/DNMS01-closure.md` 只动 `:20` 与 `:74`。
- `async-compaction.md`：不更新。
- 测试说明：不新写独立测试文档。用例即 §8。
- 退役清单：`summaryPrompt` 字段、`LEGACY_SAFETY_RATIO`、`MAX_CLAIM_ATTEMPTS`、`claimAttempts`、旧选择器循环、`:222` 的句子、四条常驻调度、等号文案。覆盖代码、注释、头注、行号锚、文档句。`async-compaction.md` 里的旧句按 `-01⑤` **留着**，不纳入退役删除。

### 9.4 完成后的预期状态

1. ON 态下四条 lane 经同一个选择器提交，帧是模型看到的唯一压缩说明，工具能按 id 分页读回被遮蔽的原文。
2. 旧的全文 prompt、0.80 读时兼容、等号、常驻定时器、idle 上等 `armed` 的路径，在源码和 `lib/client.js` 里都没有。
3. 账本仍是遥测。journal 括号仍是权威。OFF 时 patch 撤掉，原厂 `compaction-basic` 回来，工具行一起消失。
4. [DNMSC] 仍然没有 [DNPR] 声明。仓根没有新的 check 脚本。
5. closure 的两处过时陈述已处理。`FROZEN` 的 [真相层] 没有被本计划改写。

---

## 10. 收口（Definition of Done = 测试台账全 PASS 映射）

### 10.1 收口硬闸

本计划不新增 soak，也不把 T20 算进硬闸。硬闸是 §8.1 里除 T20 以外的全部 Test-ID（T01–T19），每条都要按 §8.5 右列通过，并带四元组。分组只为阅读：

1. 策略硬切、附加要求的字段名与 4000、生成副本、协议 hash（`ACE1117-T01`–`T04`）。
2. 工具拒绝跨会话与非 `inspect_checkpoint` 标记，patch 的 OFF 态两行一起消失（`ACE1117-T05`–`T07`）。
3. 调度、四入口互斥、超时、disarm、四 lane 选择器、帧字面量、`kind:'select'`（`ACE1117-T08`–`T14`）。
4. projection 不含别人的 id；3000ms 只在 running 且在途时续拉；入口、告警与相对 `fb7264d` 的非目标 diff（`ACE1117-T15`–`T19`）。

### 10.2 收口映射表

| 收口目标 | 工作项 | Test-ID | PASS 证据 | 状态 |
|----------|--------|---------|-----------|------|
| S 与顺序硬切 | P1-01 | T01 | 未跑 | `未观察` |
| 附加要求，无迁移 | P1-02 | T02 | 未跑 | `未观察` |
| 生成副本 | P1-03 | T03 | 未跑 | `未观察` |
| 协议 hash | P1-04 | T04 | 未跑 | `未观察` |
| 工具合同 | P2-01 | T05 | 未跑 | `未观察` |
| 工具威胁 | P2-01、P2-03 | T06 | 未跑 | `未观察` |
| patch 覆盖 | P2-02 | T07 | 未跑 | `未观察` |
| idle 提交 | P3-01 | T08 | 未跑 | `未观察` |
| 互斥 | P3-02 | T09 | 未跑 | `未观察` |
| 超时与清理 | P3-03 | T10 | 未跑 | `未观察` |
| disarm | P3-04 | T11 | 未跑 | `未观察` |
| 选择器 | P4-01 | T12 | 未跑 | `未观察` |
| prompt 与帧 | P4-02、P4-03 | T13 | 未跑 | `未观察` |
| 四 lane 账本 | P4-04 | T14 | 未跑 | `未观察` |
| session projection | P5-01 | T15 | 未跑 | `未观察` |
| 定时器与声明 | P5-02、P5-04 | T16 | 未跑 | `未观察` |
| 入口与文案 | P5-03 | T17、T18 | 未跑 | `未观察` |
| closure 与非目标 | P6-01、P6-02 | T19 | 未跑 | `未观察` |
| 比例对照 | `-10⑥` | T20 | 未授权 | `未观察` |

### 10.3 Definition of Done

| 维度 | 完成定义 |
|------|----------|
| 功能 | §3 每个工作项的收口目标都有对应测试按 §8.5 的「怎样才算数」通过 |
| 测试 | T01–T19 都按 §8.5 右列 PASS，四元组齐全。T20 可以仍是 `未观察` |
| 文档 | Phase 内过时句子已改；closure 只动两处；`async-compaction.md` 未改 |
| 风险收敛 | §7.2 的反例没有出现在 diff 里 |
| 可交付性 | 仍不是发布授权。包版本与 `RELEASE.md` 未改。装包要另一次 [业主] 决定 |

### 10.4 NOT-成功识别

T01–T19 任一未跑、被 skip、或只满足 §8.5 左列的假绿形态，本文件不得标 `executed`。不因为某一条没标在旧的「退出」短名单上就可以跳过。T20 未观察是允许的，不得把它写成「对照已通过」。预先存在的红灯不算本计划失败，也不得算本计划成功。

---

## 11. 执行日志回填

文档状态为 `draft`。本节不填执行摘要。获得 ImplementationGrant 并完成合入之后，再按 `respond-execution-log` 追加。残留不回填到本文件的规则句里。
