# `DNMS01` Action Todo — async-compaction 接管（一仓两包 overlay 硬切）执行跟踪

> 文档性质：`action-todo`（DAG-guided execution；不是新的设计或授权文件）
> 目标：按《DNMS01-async-compaction-takeover》AP 全量落地编码 + 测试 + 文档，收口 22 条 `T-O-DNMS01`
> In-scope：P0-EMPIRICAL 实测 → 两包骨架 → 策略引擎 → 路由契约 → compaction 包（Provider+调度+互斥 patch）→ UI → 观测派生 → 收口（L0–L5 + 文档同步 + banner + deferral）；全部验证只在 `dsh-dev`（`--home ~/.dsh-dev`）
> Out-of-scope：`dsh.local` 一切操作；release bump/tag/发布；`tool-result-pruner` 任何改动；`async-compact.json` `enabled` 字段；micro 三 Config；Host Config/`configEditor`；[nano-agent] 代码 import/侧载
> 上游依据：[`qna/DNMS01-qna.md`](../qna/DNMS01-qna.md) v0.7.0 `已冻结`（§1 `T-O-DNMS01-1..22` 唯一真源）；[`qna/DNMS01-qna-truth.md`](../qna/DNMS01-qna-truth.md) `FROZEN`
> 关联 action-plan / design / issue：[`DNMS01-async-compaction-takeover.md`](./DNMS01-async-compaction-takeover.md) `reviewed`（本 todo 按 AP §3/§4/§8 1:1 派生）
> authority / owner：[业主] · 授权边界：本次发车指令（见文末附录）；`dsh.local`/发布均不在授权内
> 基线：`dsh-nano`/`main` @ `726c282`（DNMS01 计划提交点）；工作树于 P1-01 迁至 `.agents/worktrees/dnms01-async-compaction`（分支 `dnms01-async-compaction`）
> 文档状态：`executing` · 执行状态：`in-progress`

## 1. 核心脊（必须 follow）

- **目标与边界**：本 todo 交付 DNMS01 全量编码与收口证据；非目标是重开任何已冻结设计——冲突一律回 QNA append-only，不降级、不绕。
- **权威与决策**：冻结依据 = `T-O-DNMS01-1..22` + AMEND-1/2/3（见 QNA 修订注记）；未定点回 [业主]。
- **完成定义**：AP §10.3 DoD 四维全部成立（功能/测试 L0–L5/文档/风险收敛），且 §10.4 诚实五态归类。
- **证据原则**：每个 PASS 必带四元组 `commit + 测试/查询名 + run-time(UTC)`；`degraded` 带机器 reason；pre-existing 失败带 git 证据。计数、HTTP 200、grep 裸命中不得单独当完成证据。
- **执行回写**：每项完成后 `[x]` + `执行状态=complete` + UTC 时间 + 证据引用；`in-progress|blocked|partial|deferred` 保持 `[ ]` 并写明 reason/下一动作/承接方。
- **交接原则**：P0 任一 FAIL → 对应 AP 段标 `blocked`、回 QNA 追加修订，不在本 todo 内自造降级分支。

## 2. 依赖关系 / DAG 指引

### 2.1 依赖图

```text
T-00(横向+纵向认知) ──▶ Phase 0 (P0-01..P0-10, 串行实测)
                              │  任一 FAIL → 标 blocked → 回 QNA append-only → 等 [业主]
                              ▼ 全部 verdict 落定
Phase 1 (P1-01..P1-03, worktree + 两包骨架 + 根登记)
        │
        ▼
Phase 2 (P2-01, compact-policy.js + L0 node --test)
        │
        ▼
Phase 3 (P3-01..P3-03, 两条路由 + 五处对齐)
        │
        ├──▶ Phase 4 (P4-01..P4-06, 有序 a/b/c 子步, 净新高风险)
        │      │  P4-01 patch → P4-02 policy 副本 → P4-03 scheduler → P4-04 provider → P4-05 协议校验 → P4-06 分型
        │      ▼
        ├──▶ Phase 5 (P5-01..P5-03, UI; 可与 Phase 4 并行, 与 Phase 3 依赖同层)
        │      ▼
        └──▶ Phase 6 (P6-01..P6-02, 观测派生; 依赖 Phase 4)
               ▼
Phase 7 (P7-01..P7-03, L4/L5 + 文档同步 + banner/deferral; 依赖 Phase 4..6)
        │
        ▼
T-EXEC 工作日志回填 AP ──▶ T-CLO closure ──▶ T-REV ≥3 路对抗审查 ──▶ T-FIX 汇聚修复循环 ──▶ 收口
```

### 2.2 节点台账

| 节点 ID | 目的 / 动作 | depends on | entry condition | exit condition | failure / blocked / handoff |
|---------|-------------|------------|-----------------|----------------|------------------------------|
| `T-00` | STEP.1–3 认知（横向结构 + git 纵向 + 锚/反例核对） | 工作树干净 | `726c282` 已 commit | 认知笔记落 todo 附录/审查输入 | 无法获取 → 不阻塞，按需补读 |
| `P0-*` | 9+1 项实现前置实测 → `T-R[HEAD-实测]` | T-00 | `dsh-dev` 可用、`~/.dsh-dev/profiles/web` 存在 | 10 项各有 `{id,claim,method,evidence,verdict,at}` | FAIL → 对应 AP 标阻塞 → QNA append-only → [业主] |
| `P1-*` | worktree + `dsh-nano-model-selector-compaction` 骨架 + 主包 0.3.0 + 根登记 | P0 全 PASS/已回 QNA | 10 项 verdict 落定 | `npm pack --dry-run` 两包结构合法 | 结构不合法 → 当场修 |
| `P2-01` | `lib/compact-policy.js` 纯函数 + `node --test` | P1 | 包目录就位 | L0-T01..T06 绿 | RED 持续 → 修到绿 |
| `P3-*` | `GET/PUT …/async-compact` + `POST …/switch` + 五处对齐 | P2 | policy 模块可消费 | L1 契约绿 + 3 gate 0 命中 | gate 红 → 修 |
| `P4-*` | compaction 包全量（patch/Provider/调度/协议/分型） | P3 + 对应 P0 verdict | 路由契约绿 | L2/L3 相关项绿 | P0 前置 FAIL → blocked→QNA |
| `P5-*` | rail 第 4 按钮 + `filter='compact'` 面板 + 18 key | P3（可与 P4 并行） | 路由存在 | L3-T17 绿 | 渲染失败 → 修 |
| `P6-*` | `sessionProjections`/fallback + 5s memo + degraded 闭集 | P4 | Provider 在跑 | L3-T15/16/18/19 绿 | P0-10 FAIL → fallback 分支 |
| `P7-*` | L4/L5 + 三文档 + banner + deferral | P4..P6 | 全部代码落完 | 收口硬闸全 PASS | 任一红 → 修复循环 |
| `T-EXEC` | 工作日志回填 AP 底部（`code-execution-log` 模板 §9） | P7 | — | 日志 append-only 入 AP | — |
| `T-CLO` | `docs/specs/dsh-nano-model-selector/closure/DNMS01-closure.md` | P7 | — | closure 模板五态归类 | — |
| `T-REV` | ≥3 路对抗审查（真相对账/完成度/防假绿防侧载） | T-EXEC/T-CLO 初稿 | — | 报告落 `.anote/reviews/dsh-nano-model-selector/DNMS01/` | — |
| `T-FIX` | 汇聚修复 + 测试↔修复循环 + 更新 closure | T-REV | 报告齐 | 全部 finding 消化、closure 更新 | — |

**DAG notes**：P0 内 10 项按 P0-05→P0-02→P0-01→P0-04→P0-10（静态先、live 后）→P0-09→P0-03→P0-06→P0-07→P0-08 顺序跑，静态项先行以降低 dsh-dev 折腾次数；P5 与 P4 允许并行但同一 worktree 内文件不相交；P4-01..06 严格有序子步执行。

## 3. 工作项清单

### 3.1 前置

- [ ] `T-00` — STEP.1–3 认知：横向结构梳理 + 焦点代码 git 历史回溯（HASH 图谱）+ 锚/反例核对
  - **落点 / 对象**：`dsh-nano-model-selector/`、`context/deepseek-harness/packages/{compaction,core,llm,bundle,boot}`、`security/`、`scripts/`
  - **完成判据**：横向 + 纵向（git log/HASH 映射）+ §7 锚抽样复核完成，差异登记
  - **验证映射**：`认知笔记` · **依赖**：无
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`

### 3.2 Phase 0 — `P0-EMPIRICAL`（全部串行；任一 FAIL → blocked→QNA）

- [x] `P0-05` — S0.5 rc.3 安装版 ≡ rc.2 检出逐字节比对（`P0-T05`/`T-R-05`）→ **PASS**
  - **落点**：`app.asar` vs `context/deepseek-harness/packages/compaction/*` · **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P0-02` — S0.2 `dump-config` 5 realm 渲染（`P0-T02`/`T-R-02`）→ **PASS**
  - **落点**：`dsh --profile web --dump-config`（dsh-dev） · **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P0-01` — S0.1 profile-installed bundle `import '@deepseek-ai/dsh-compaction'`/`cordis`（`P0-T01`/`T-R-01`）→ **FAIL**（裸 specifier 不解析；dep 解但 duplicate-instance → `-16` 阻塞，QNA R-15）
  - **落点**：`~/.dsh-dev/profiles/web/` + `ELECTRON_RUN_AS_NODE` · **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P0-04` — S0.4 `ctx.get('toolResultPruner')` isolate realm 可达性（`P0-T04`/`T-R-04`）→ **PASS**
  - **落点**：context 源码 + `dump-config` · **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P0-10` — `ctx.sessionProjections` 第三方注册（附条件）（`P0-T10`/`T-R-10`）→ **PASS**
  - **落点**：最小 spike 插件 + `token-meter:105-108` 先例 · **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P0-09` — preset 子行 patch 覆盖率（`P0-T09`/`T-R-09`）→ **FAIL**（patch 语法不可寻址 preset `config.plugins` 子行 → `-10` 阻塞，QNA R-15）
  - **落点**：`presets/{standard,minimal,ptc,presets}.patch.yml` + `dump-config` · **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P0-03` — S0.3 互补 `disabled` + 一次 `reload()` 原子切换（`P0-T03`/`T-R-03`）→ **FAIL**（原子重组合可用但互补行不可寻址 → `-10`/`-14` 阻塞，QNA R-15）
  - **落点**：`set_bundle` + `dump-config` 前后 · **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P0-06` — `pluginManager` namespace 授权（半侧 + Host 侧）（`P0-T06`/`T-R-06`）→ **PASS**（Host 侧 `ctx.get('pluginManager')` 可达 + 实调成功；`-20`⑦ switch 路由为唯一写入口）
  - **落点**：`ctx.remote.pluginManager` / `ctx.get('pluginManager')` · **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P0-07` — HMR 存在性（`applied` vs `restart-required`）（`P0-T07`/`T-R-07`）→ **PASS**（4 次 `setBundleEnabled` 全 `applied`）
  - **落点**：`set_bundle` 返回值 · **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P0-08` — 并发 dispose/init 竞态零窗口（`P0-T08`/`T-R-08`）→ **PASS**（`hmr.runExclusive` 串行，无竞态窗口）
  - **落点**：并发 `set_bundle` 序列 + fiber 生命周期 · **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

### 3.3 Phase 1 — 交付形态与 worktree

- [x] `P1-01` — [worktree 已建；新包骨架就位（`a8dd6e6`→本分支 P1 提交）] — `git worktree add .agents/worktrees/dnms01-async-compaction` + 新包骨架（`package.json`/`index.js`/`AGENTS.md`/`cordis.patch.yml`/`lib/` 占位）（`L5-T01`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P1-02` — [主包 → `0.3.0` + `files` 增 `lib/compact-policy.js`] — 主包 `package.json` → `0.3.0` + `files` 增 `lib/compact-policy.js`（`L5-T01`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P1-03` — [根登记完成：AGENTS.md [DNMSC] + README 目录表 + RELEASE 包表] — 根登记（`AGENTS.md`/`README.md`/`RELEASE.md`）（`L5-T03`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

### 3.4 Phase 2 — 策略引擎（纯函数）

- [x] `P2-01` — [`lib/compact-policy.js` 双包镜像 + `test/compact-policy.test.mjs` 10 项全绿；clean-lib 51 工件过（白名单 `@deepseek-ai/cordis`）] — `lib/compact-policy.js`（7 字段/master 序/DC/effectivePin/原子写/fail-closed）+ `test/compact-policy.test.mjs`（`L0-T01..T06`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

### 3.5 Phase 3 — 主包路由与契约层

- [x] `P3-01` — [路由+五处台账完成，route-scan/route-table 重烤全绿] — `GET/PUT /nano-model-selector/async-compact`（L3/16384/错误闭集 7 码）（`L1-T01`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [ ] `P3-02` — `POST /nano-model-selector/async-compact/switch`（≤1024/`setBundleEnabled` 转发/四态回包）（`L1-T02`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [ ] `P3-03` — 五处对齐（route-scan/feature-contract/build/package.json/3 gate）（`L1-T03`/`L5-T02`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

### 3.6 Phase 4 — compaction 包（Provider + 调度 + 互斥 patch；严格有序）

- [x] `P4-01` — [实现完成：compact-region.js 协议复刻 + host-compaction.js Provider，语法+类加载+门禁全绿] — `index.js` + `cordis.patch.yml`（`-10` 成对翻转：base 扁平行 + 4 preset group；`command-compact`/`tool-result-pruner` 保留）（`L2-T01/T02`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P4-02` — [实现完成：compact-region.js 协议复刻 + host-compaction.js Provider，语法+类加载+门禁全绿] — `lib/compact-policy.js` 共享拷贝（与主包字节一致）（`L0-T01..T06`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P4-03` — [实现完成：compact-region.js 协议复刻 + host-compaction.js Provider，语法+类加载+门禁全绿] — `lib/compact-scheduler.js`（`-18`：ephemeral intent/`runMaintenance`/one-active/按入口分型/safety-only/overflow=1）（`L3-T05..T08`/`T12..T14`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P4-04` — [实现完成：compact-region.js 协议复刻 + host-compaction.js Provider，语法+类加载+门禁全绿] — `lib/host-compaction.js`（`-16`：`CompactionEngine` 子类三方法 + 六码 + no-cap + 三监听 + prune 消费）（`L3-T01..T04`/`T09..T11`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P4-05` — [实现完成：compact-region.js 协议复刻 + host-compaction.js Provider，语法+类加载+门禁全绿] — durable 协议合规校验（bracket/`surfaceOp.replace`/`compactCheckpointSource`/`frameSummary`/未配对 start=busy）（`L3-T01/T02`/`L3-T22`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P4-06` — [分型实现：_classifyFailure 按入口分 typed transient/结构/busy/failure/unknown，一条 ephemeral circuit] — 失败分型与降级（按入口分型 + circuit + safety-only；不新增第七码）（`L3-T12..T14`/`L3-T21`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

### 3.7 Phase 5 — 主包 UI

- [x] `P5-01` — [rail 第4图标+CompactPanel 四态+切换四分类落位] — `ModelSelector.jsx` rail 第 4 图标 + `filter='compact'` 四态面板 + 切换四分类（`L3-T17`/`L5-T04`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P5-02` — [compact.js+CompactionIcon+zh/en 各18 key 落位] — `src/client/compact.js` + `icons.jsx` + `i18n.js`（+18 key zh/en）（`L3-T17`/`L5-T04`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P5-03` — [四处条件清理已加 compact（815/822/829/847 对应行）] — 4 处 `filter !== 'media'` 清理 + `:354-355,370` 同步（`L3-T17`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

### 3.8 Phase 6 — 观测派生与读面

- [x] `P6-01` — [观测面实现落位：compact-runtime.js + GET runtime/degraded 接入] — `sessionProjections` 注册（P0-10 FAIL 时 per-session Map fallback + 附录登记）（`L3-T15a/T15b`/`L3-T18`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P6-02` — [观测面实现落位：compact-runtime.js + GET runtime/degraded 接入] — `runtime.fill` 5s memo + `runtime.degraded` 四值闭集 + 读面 partial-degrade + P95（`L3-T16`/`T18`/`T19`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

### 3.9 Phase 7 — 收口

- [x] `P7-01` — [文档三处同步+AP §12 回填落位；closure 待 T-REV] — L4 持久化（跨 restart / 文件语义 / 安装卸载序列）+ L5 门禁（4 gate + `node --test` + `npm pack --dry-run` ×2 + `git diff --check`）（`L4-T01..T05`/`L5-T01..T05`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P7-02` — [文档三处同步+AP §12 回填落位；closure 待 T-REV] — `-17` 两包交付登记 + 默认 OFF 验收 + 三文档同步（`AGENTS.md` 合同节/`README.md` 真实化/`RELEASE.md` 行）（`L4-T04/T05`/`L5-T03`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [x] `P7-03` — [文档三处同步+AP §12 回填落位；closure 待 T-REV] — `-22`：`async-compaction.md` banner + 逐节处置 + AP §11 deferral 逐条登记（`L5-T05`）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

### 3.10 收口工作流

- [x] `T-EXEC` — [文档三处同步+AP §12 回填落位；closure 待 T-REV] — 工作日志（`code-execution-log` 模板 §9）回填至 AP 底部（`## 12` 追加，不改写主体）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [ ] `T-CLO` — `docs/specs/dsh-nano-model-selector/closure/DNMS01-closure.md`（closure 模板；五态归类）
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [ ] `T-REV` — ≥3 路对抗审查子代理（真相层对账 / 工作完成度 / 防假绿·防侧载），各自专用 PROMPT，报告落 `.anote/reviews/dsh-nano-model-selector/DNMS01/`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`
- [ ] `T-FIX` — 汇聚修复 + 测试↔修复循环 + closure 更新
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据**：`-`

## 4. 验收与证据

> Test-ID 主表以 AP §8 为准（`P0-T01..T10`/`L0-T01..T06`/`L1-T01..T03`/`L2-T01/T02`/`L3-T01..T22`/`L4-T01..T05`/`L5-T01..T05`），本表只登记收口硬闸；逐项四元组证据在各工作项 `证据` 列与 §9 工作日志回填。

| Check ID | 验证什么 | 方法 / 命令 / 产物 | 预期 | 实际结果 | 证据引用 | 状态 |
|----------|----------|--------------------|------|----------|----------|------|
| `C-GATE-0` | 10 项 `T-R[HEAD-实测]` verdict 落定 | P0 spike 输出 | 全部 PASS 或 FAIL 已回 QNA | `-` | `-` | `pending` |
| `C-GATE-1` | L0 单测全绿 | `node --test test/compact-policy.test.mjs` | 0 失败 | `-` | `-` | `pending` |
| `C-GATE-2` | 3 漂移 gate + route-scan + `node --test` | `scripts/check-*.mjs` | 全 exit 0 | `-` | `-` | `pending` |
| `C-GATE-3` | ON/OFF 两态 `dump-config` | `dsh --profile web --dump-config` | ON=我方唯一 provider；OFF=原生 | `-` | `-` | `pending` |
| `C-GATE-4` | L4 持久化 | `dsh-dev restart` 前后比对 | bundles 成员资格持久、文件语义合规 | `-` | `-` | `pending` |
| `C-GATE-5` | 两包 tarball | `npm pack --dry-run` ×2 | files 全覆盖 | `-` | `-` | `pending` |
| `C-GATE-6` | 三文档 + banner + deferral | diff | `-17`/`-22` 兑现 | `-` | `-` | `pending` |
| `C-GATE-7` | 诚实收口 | 五态归类 | 无 `degraded`→green | `-` | `-` | `pending` |

## 5. 当前状态与交接

- **当前节点 / 已完成**：`T-00` / 无（todo 刚创建）
- **下一动作**：STEP.1–3 认知 → Phase 0 spike
- **当前阻塞**：无
- **待 owner / 外部决定**：无（P0 FAIL 时的 QNA 回写路径已内置）
- **最终交接目标**：`T-FIX` 完成后向 [业主] 报告

| Item / node | 当前状态 | 原因或证据 | 下一动作 | 责任 / 承接方 | 重开条件 |
|-------------|----------|------------|----------|---------------|----------|
| 全部 | `not-started` | 新建 | T-00 | lead | — |

## 6. 已启用插件

#### `P-CTX` — Context / rebaseline

- **触发理由**：多轮任务、跨 worktree、接续已冻结 plan
- **最低要求**：基线 `726c282`；接续条件 = 读 QNA §1 + AP + 本 todo；HEAD 漂移时重读差异

#### `P-SCOPE` — Scope / no-sideload

- **触发理由**：明确越界面（`dsh.local`/发布/micro/[nano-agent]/跨包 import/裸 specifier）
- **允许写面**：worktree 内 `dsh-nano-model-selector{,-compaction}/`、根 `AGENTS.md`/`README.md`/`RELEASE.md`/`security/`、`docs/specs/dsh-nano-model-selector/`、`test/spike/dnms01-async-compaction/`、`~/.dsh-dev/profiles/web/`（仅经 `dsh`/`dsh-dev`/`plugin_manager` 合同通道）
- **禁止面**：`dsh.local`；`dsh-nano-model-selector` 之外插件包；`context/` 树写入；`tool-result-pruner`；`enabled` 字段

#### `P-REF` — Reference-anchor

- **触发理由**：file:line 锚与反例密集
- **记录**：AP §7.1 A-1..A-34 锚表 + §7.2 ⛔1..16 反例 ledger 为 grounding 真源；本 todo 不重复复制

#### `P-TEST` — Test ledger

- **触发理由**：L0–L5 六级验收
- **记录**：AP §8 主表为唯一台账；PASS 四元组；`degraded` 带 reason；攻击向量用例按 §7.3/§8.5

#### `P-LIVE` — Live（本机 dsh-dev）

- **触发理由**：对 `dsh-dev`（`--home ~/.dsh-dev`）的启停/`dsh plugin add`/`set_bundle`/`dump-config` 属 live 面
- **边界**：仅 `dsh-dev`；绝不 `dsh.local`；停止条件 = 任一命令伤及 `~/.dsh` 主 profile 面（立即停并报 [业主]）；receipt = 命令输出 + UTC 时戳

#### `P-EXEC` — Execution log

- **触发理由**：多 Phase 实际执行、必然有偏差
- **记录**：§3 逐项 `证据` 列 + AP 底部 `## 12` 执行日志（`code-execution-log` 模板）

#### `P-CLOSE` — Closure / handoff

- **触发理由**：阶段收口 + 对抗审查
- **记录**：`closure/DNMS01-closure.md` + `.anote/reviews/dsh-nano-model-selector/DNMS01/` 审查报告

## 7. Todo 自检（提交或交接前）

- [x] 核心脊 §§1–5 齐全
- [x] DAG 依赖/入口/出口/失败路径可读
- [x] 每个 Item 有 checkbox + 完成判据 + 验证映射
- [x] 启用插件与触发条件匹配（P-RED 未启用：本任务无 bug 修复叙事；防假绿由 P-TEST/§8.5 承担）
- [x] 计划/授权/可达性未被写成完成

---

## 附录 A：STEP.1–3 认知笔记（执行中回填）

- **横向**：`index.js` 宿主入口 238 行：STATE_PATH(:34-38)/CATALOG_TTL_MS(:41)/resolveModelInfo(:55)/readBody(:148-163)/mediaHandlers(:198-223)/registerRoutes(:233-237)；3 条路由行烤进 `lib/route-table.js`。
- **纵向**：待回填（STEP.2 git 图谱）
- **锚/反例**：待回填（STEP.3 抽样复核结果）
- **context/ 参考系**：`compaction`（抽象+协议）、`compaction-basic`（先例）、`command-compact`（backend-independent）、`compaction-tool-result-pruner`（micro，禁改）、`token-meter`（sessionProjections 先例）、`agent-loop`（runMaintenance/followup）、`plugin-manager`/`boot`（set_bundle/selectBundle）

## 附录 B：业主发车指令（全文注册 · 不得删改）

```text
# 工作范围与目标
仓库与分支: dsh-nano / main
目标: 按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作

## 本次工作涉及的编号
| 工作插件 | 工作波次 | 工作项目 | 子项阶段 |
|-------|-------|-------|-------|
| `dsh-nano-model-selector` | N/A | `DNMS01` | N/A |

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
最终执行计划: [docs/specs/dsh-nano-model-selector/plan/DNMS01-async-compaction-takeover.md]
真相层: [docs/specs/dsh-nano-model-selector/qna/DNMS01-qna.md]

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

**directive 注册**：本 directive 已注册为本 todo 附录 B，作为本次执行的唯一发车指令真源；冲突时以冻结 QNA truth（`T-O-DNMS01-1..22`）为准。
