# Nano-Agent 行动计划模板

> 服务业务簇: `CT-batch-1：[DNEE] 审阅可视化与高性能渲染底座`
> 计划对象: `[DNEE]`（`dsh-nano-explorer-extra`）`CT-batch-1`
> 类型: `upgrade`
> 作者: `lead`
> 时间: `2026-11-21`
> 文件位置: `docs/specs/dsh-nano-explorer-extra/plan/CT-batch-1-plan.md`
> 上游前序 / closure:
> - [qna/CT-batch-1-qna.md](../qna/CT-batch-1-qna.md) §1 `T-O-1`–`T-O-12` 与 §7 收口（`已冻结`，取证快照 `main@30ca969`）
> 下游交接:
> - 本计划获 `[业主]` 批准、状态转为 `reviewed` 之后，才允许在 `.agents/worktrees/ct-batch-1-review-perf` 开工。合回 `main` 后按 `[业主]` 要求删除该 worktree。合并不自动部署本机宿主。
> 关联设计 / 调研文档:
> - [CT-batch-1-design.md](../CT-batch-1-design.md)（调研与形成史；与 `T-O-*` 冲突时以 `T-O-*` 为准）
> - [copy-t3code-initial-assessment.md](../copy-t3code-initial-assessment.md)
> 冻结决策来源:
> - [qna/CT-batch-1-qna.md](../qna/CT-batch-1-qna.md) §1（只读引用；本 action-plan 不填写 Q/A）
> grounding 来源:
> - `见 §7 内置锚区`（无独立 eval-reference-anchor；§7 是本 AP 的 grounding 真源。行号取自 `main@30ca969`）
> 关联 reference-anchor:
> - `见 §7 内置锚区`
> 文档状态: `draft`
> 审查修订: `2026-11-21`，依据 `.anote/reviews/dsh-nano-explorer-extra/CT-batch-1/na/7041/` 的两份报告改正行号与测试映射。状态仍是 `draft`，未开工。

文件名按 `T-O-12` 锁死为 `CT-batch-1-plan.md`。本次撰写任务里的 slug 推定为 `plan`，不另起第二份计划。

---

## 0. 执行背景与目标

`[DNEE]` 已经接管 `[dsh工作台]` 的文件侧栏，但审阅链还停在三处：目录状态每次渲染全表扫描、`CommitDrawer` 用主线程 `<pre>` 看相对 `HEAD` 的补丁、`HistoryRail` 里的历史文件不能点开。`CT-batch-1` 把这些收成只读三视角审阅和单轨渲染管线。范围只在 `[DNEE]` 内。

本计划只消费已冻结的 `T-O-1`–`T-O-12`。设计稿 §9.1 的 `CT-B1-Q1`–`CT-B1-Q5` 仍标着 `open`，那些口径已被 `T-O-5`–`T-O-12` 取代，本计划不重开、不复述选项。设计稿里与冻结口径冲突的句子（`DIFF_PATCH_CAP` 默认 80KB 再按需放到 200KB、`full: true`、Playwright 真人演练当作收口、计划文件名写成 `CT-batch-1-action-plan.md`）一律不执行。

- **服务业务簇**：`CT-batch-1：[DNEE] 审阅可视化与高性能渲染底座`
- **计划对象**：`dsh-nano-explorer-extra` 一次 `0.3.0 → 0.4.0` 交付
- **本次计划解决的问题**：
  - 宿主 `FileTree` 的 `memo` 被 `folderStatusOf` 全表扫描和每次新建的 `Accessory` 撕穿
  - 只能看工作区相对 `HEAD` 的纯文本补丁，看不到相对基线的净差异，也点不开历史提交里的单个文件
  - 无 Forge 时右键「查看差异」停在 `viewDiffUnavailable`；已审阅进度没有独立、有界、可跨标签失效的存储
- **本次计划的直接产出**：
  - 仍是 20 条路由。`GET /status?only=base-diff` 与 `POST /diff` 的 `{ commit?, base?, ignoreWhitespace? }` 在原路由上扩展，`readPathDiff` 只留一个实现
  - 文件树 `Changed-Only` 与 `/` 过滤、三视角 `CommitDrawer`、以及 `ByteBudgetLruCache` → 内联 Worker → 行虚拟化 → 宿主 `useCodeHighlighter` 分帧 → CSS 合成层这一条 Diff 管线
  - `viewed.v1`、`declaration.json` 20/20、`0.4.0` 与同次文档清理
- **本计划不重新讨论的设计结论**：
  - 不新增路由、不引入 `@pierre/*` 或 `.wasm`、不把 Diff/文件树改成 WebGPU 或 Canvas 文本（来源：`T-O-3`、`T-O-5`、`T-O-6`）
  - 旧 `<pre>`、线性 `folderStatusOf`、`viewDiffUnavailable`、硬编码 `#3fb950` / `#f85149` 回退色同一次退役，不留开关（来源：`T-O-4`、`T-O-6`、`T-O-10`）
  - 验证矩阵只有 `node:test` + `build` + `check-ui-rules` + `pack --dry-run`，不设 Playwright，不新增 `budgets` 硬闸（来源：`T-O-11`）

---

## 1. 执行综述

### 1.1 总体执行方式

五个 Phase，先宿主只读合同，再树的派生状态，再 Diff 纯逻辑与渲染，再抽屉流转和视口，最后埋点、测试、文档和版本。编码只发生在 `.agents/worktrees/ct-batch-1-review-perf`，且只在本文件状态变为 `reviewed` 之后。本文件停留在 `draft` 时不得改 `[DNEE]` 源码。

### 1.2 Phase 总览

| Phase | 名称 | 规模 | 目标摘要 | 依赖前序 |
|------|------|------|----------|----------|
| Phase 1 | 宿主只读硬切 | `M` | 20 条路由不变；统一 `readPathDiff`；基线、缓存、200KB 上限、合同补齐 | `-` |
| Phase 2 | 文件树稳态与 Changed-Only | `M` | `folderStatusMap` 与稳定 Accessory；临时态过滤；零 `/list` | Phase 1 的 `tree-filter` 键已写入 declaration |
| Phase 3 | Diff 单轨管线 | `L` | 双界 LRU、共用 parser、Worker/分片、虚拟化、分帧着色；删除 `<pre>` | Phase 1 的 `/diff` 参数 |
| Phase 4 | 三视角抽屉与审阅闭环 | `M` | 单抽屉流转、弹性视口、`viewed.v1`、无 Forge 回落 | Phase 1、Phase 3 |
| Phase 5 | 验证、文档与 `0.4.0` | `S` | `node:test`、UI 红线、文档与 `.tgz` 清理、版本号 | Phase 1–4 |

### 1.3 Phase 说明

1. **Phase 1 — 宿主只读硬切**
   - **核心目标**：让工作区、`vs Base`、历史提交共用一个 fail-closed 读取器，并且默认 状态轮询不因此多跑 Git。
   - **为什么先做**：后面的抽屉和缓存键都消费这组参数。读取器若留双函数，`T-O-4` 当轮即破。
2. **Phase 2 — 文件树稳态与 Changed-Only**
   - **核心目标**：目录着色变成一次预计算加 `O(1)` 读取；「仅看改动」和 `/` 只改传给宿主 `FileTree` 的条目。
   - **为什么放在这里**：它不依赖 Diff 渲染，但 `Changed-Only` 的路径必须和现有 `data-files-path`、粘贴、右键一致，宜在抽屉改动之前钉死。
3. **Phase 3 — Diff 单轨管线**
   - **核心目标**：解析、词级差异、digest 只有一份实现；渲染只有新引擎。
   - **为什么放在这里**：抽屉三视角只是把不同 scope 的 patch 送进这条管线。
4. **Phase 4 — 三视角抽屉与审阅闭环**
   - **核心目标**：`branch` 与 `commit` 仍是底部互斥的一张卡；只读视角拿掉提交表单；已审阅与右键回落接上。
   - **为什么放在这里**：视口几何和死样式要连同 `<pre>` 一起删，不能先改 CSS 再留旧类。
5. **Phase 5 — 验证、文档与 `0.4.0`**
   - **核心目标**：用 `T-O-11` 的矩阵证明前面各项，并让文档、合同说明、版本和过期 `.tgz` 与代码同次对齐。
   - **为什么放在这里**：测试导入的是前面抽出的纯模块；文档描述的是已经落地的参数，而不是设计稿里的旧句子。

### 1.4 执行策略说明

- **执行顺序原则**：一个 worktree、一次合并。先改 `git.js` / `routes.js` 的读取与失效链，再抽纯函数，最后才改 React 外壳。`declaration.json` 的合同与 span 名在第一次 `npm run build` 之前写上。
- **风险控制原则**：用户态 `commit` / `base` / `path` 在进入 `runGit` 之前拒绝。缓存只并进现有 `memoized` + `forgetReads`。浏览器 API 不出现在模块顶层。
- **测试推进原则**：每个纯模块落地时就补对应 `node:test`。`build` 之后跑既有 `bundle-smoke`。`check-ui-rules` 与 `pack --dry-run` 只在 Phase 5 收口跑一次，不做成新的 release-gate。短途是这些 `node:test`；不设 spike / mega / soak 作为退出硬闸（`T-O-11` 禁止超纲仪式）。
- **文档同步原则**：`[DNEE]/AGENTS.md`、`docs/specs/dsh-nano-explorer-extra/README.md`、`security/route-sensitivity.json` 的说明句、设计稿文首替代声明，与 `0.4.0` 同一提交。
- **回滚 / 降级原则**：不留运行时新旧开关。若 Worker 被 CSP 拒绝，同一 parser 走 200 行 `rAF` 切片。若 `localStorage` 拒绝写入，`viewed.v1` 退化为当页 `Map`。无基线时返回空列表，不返回 500。代码回滚只通过 git 整批回退，不在产品里保留旧 `<pre>`。

### 1.5 本次 action-plan 影响结构图

```text
CT-batch-1
├── Phase 1: 宿主只读硬切
│   ├── src/host/git.js          readPathDiff / resolveBaseRef / mergeBaseCache / readStatus
│   ├── src/host/routes.js       /status only=base-diff，/diff 参数，forgetReads
│   ├── src/perf/declaration.json
│   └── security/route-sensitivity.json   只改 dnee.status / dnee.diff 的说明句
├── Phase 2: 文件树
│   ├── src/client/workspace-store.js
│   ├── src/client/body.js
│   ├── src/client/accessory.js
│   ├── src/client/changed-tree.js        新建纯函数
│   └── src/client/i18n.js                本 Phase 只加过滤与 >800 提示文案键
├── Phase 3: Diff 管线
│   ├── src/client/diff-cache.js
│   ├── src/client/diff-parse.js
│   ├── src/client/diff-worker.js
│   ├── src/client/diff-view.js
│   └── src/client/diff-renderer.js
├── Phase 4: 抽屉与已审阅
│   ├── src/client/drawers.js
│   ├── src/client/drawer-scope.js        新建纯函数
│   ├── src/client/viewed-store.js
│   ├── src/client/styles.js
│   └── src/client/i18n.js
└── Phase 5: 验证与交付
    ├── test/*.mjs
    ├── package.json             0.4.0，engines.dsh 不动
    ├── AGENTS.md / README.md
    └── 删除 dsh-nano-explorer-extra-0.3.0.tgz
```

---

## 2. In-Scope / Out-of-Scope

### 2.1 In-Scope（本次 action-plan 明确要做）

- **[S1]** 在既有 `GET /status` 与 `POST /diff` 上扩展只读参数，硬切单一 `readPathDiff`，补齐无远端短路、32 仓 `mergeBaseCache`、`DIFF_PATCH_CAP = 200_000`。
- **[S2]** `folderStatusMap`、稳定 Accessory、宿主 `levelsOf()` / `highlight` 上的 `Changed-Only` 与 `/` 过滤。
- **[S3]** 单轨 Diff 管线：64 条 / 4 MiB LRU、内联 Blob Worker、`>250` 行虚拟化、宿主 Shiki 分帧、CSS containment。删除 `<pre>`。
- **[S4]** `CommitDrawer` 三视角、`HistoryRail` 点文件进入同一张卡、只读态隐藏提交表单、弹性视口、全局 diff token。
- **[S5]** `viewed.v1`（12 仓 × 500 条）与无 Forge 时右键落入 `[DNEE]` 视图。删除 `viewDiffUnavailable`。
- **[S6]** `declaration.json` 补上 `dnee.diff`、`dnee.paste-image` 与三个 span；`0.4.0`；同次文档与 `.tgz` 清理。

### 2.2 Out-of-Scope（本次 action-plan 明确不做）

- **[O1]** 任何新路由，以及 `/stage`、`/unstage`、`/discard`、`/stash`、`/branch-create`、`/worktree`、`/init`。
- **[O2]** `gh` / `glab`、PR、CI。`ReviewScope` 不启用 `'pr'`。
- **[O3]** WebGPU、Canvas、`@pierre/diffs`、`@pierre/trees`、外部 `.wasm`。
- **[O4]** 全仓磁盘搜索，以及把 `a/b/c` 拼成一个假目录行。
- **[O5]** 修改 `[DNPR]`、`[DNT]`、`[DNN]`、`[DNMS]`、`[DNCS]`、`[DNK]`，或新增跨插件协议。
- **[O6]** Playwright、新的 `budgets` 硬闸、把 `<16ms` / `<50ms` / `60fps` 写成阻断性收口。
- **[O7]** `full: true` 二次拉取、把 `changedOnly` / `filterQuery` / viewed 写进 `prefs.v2`、Split diff、行内评论。

### 2.3 边界判定表

| 项目 | 判定 | 理由 | 重评条件 |
|------|------|------|----------|
| `only=base-diff` 与 `{ commit?, base?, ignoreWhitespace? }` | `in-scope` | `T-O-5`、`T-O-7` | 不得另开路由；若要改互斥规则，先改 QnA |
| `DIFF_PATCH_CAP = 200_000`，无 `full: true` | `in-scope` | `T-O-7` 覆盖设计稿「80KB 默认、点击放宽」 | 只有新的 `T-O` 能改这个数 |
| `Changed-Only` 用宿主分级，`>800` 只展前 2 级 | `in-scope` | `T-O-9` | 单链压缩留到以后的 QnA |
| 帧率与 49k 仓计时 | `defer` | `T-O-11` 不设浏览器仪式，也不新增 budget 闸 | `[业主]` 另批 live 观测时才做，不回写成已验证 |
| Batch-2 写路由、Batch-3 PR | `out-of-scope` | `T-O-1` | 各自的设计与 QnA |
| 提交图改 Canvas | `out-of-scope` | `T-O-3` 只留接口，不在本批实现 | 图谱超过千级节点且另有冻结决定 |

---

## 3. 业务工作总表

| 编号 | 所属 Phase | 工作项 | 类型 | 涉及文件（file:line） | 收口目标 | 测试映射（Test-ID） | 风险 |
|------|------------|--------|------|------------------------|----------|----------------------|------|
| P1-01 | Phase 1 | 基线解析与 `only=base-diff` 摘要 | `add` | `src/host/git.js:913-931` 旁新增 `resolveBaseRef` / `readBaseDiffSummary` | 顺序为显式 base → `origin/HEAD` → `main` → `master`；无匹配或 Unborn HEAD 返回空集 | `CTB1-T01` | `high` |
| P1-02 | Phase 1 | 单一 `readPathDiff` | `refactor` | `src/host/git.js:603-626` | 旧的只读 `HEAD` 函数不复存在；三视角互斥；argv 带 `--no-ext-diff` 与 `--` | `CTB1-T02` `CTB1-T03` | `high` |
| P1-03 | Phase 1 | 失效链与无远端短路 | `update` | `src/host/git.js:558-570`；`src/host/routes.js:277-300,440-484` | 默认轮询不调用 base-diff；`forgetReads` 清 `base-diff:`；无 remote 不跑远端查询；merge-base 命中不再 spawn | `CTB1-T04` `CTB1-T06` | `high` |
| P1-04 | Phase 1 | 补丁上限硬切 | `update` | `src/host/git.js:603` | `DIFF_PATCH_CAP` 为 `200_000`；超限 `truncated: true`；请求体没有 `full` | `CTB1-T05` | `medium` |
| P1-05 | Phase 1 | 合同与说明句 | `update` | `src/perf/declaration.json:5-11,34-53`；`security/route-sensitivity.json:227-230,510-515` | `contract` 含 `dnee.diff` 与 `dnee.paste-image`；spans 含三个新名字；`budgets` 仍是两条；路由仍是 20 条 | `CTB1-T17` `CTB1-T18` | `medium` |
| P2-01 | Phase 2 | `folderStatusMap` | `add` | `src/client/workspace-store.js:41-66`；`src/client/body.js:913-928` | 目录着色一次预计算；`folderStatusOf` 删除 | `CTB1-T07` | `medium` |
| P2-02 | Phase 2 | 稳定 Accessory 与树 props | `refactor` | `src/client/accessory.js:11-74`；`src/client/body.js:930-999` | 传给宿主的 Accessory 函数在无关轮询中保持同一引用 | `CTB1-T08` | `medium` |
| P2-03 | Phase 2 | Changed-Only 与 `/` 过滤 | `add` | `src/client/changed-tree.js`（新建）；`src/client/body.js:958-999`；`src/client/paste.js:43-46` | 标准层级、独立 `changedExpanded`、`>800` 只展两级；过滤不写 `prefs.v2`、不发 `/list`；`/` 不抢输入框 | `CTB1-T09` `CTB1-T10` | `medium` |
| P3-01 | Phase 3 | 双界 LRU | `add` | `src/client/diff-cache.js`（新建） | 64 条与 4 MiB 同时生效；`working` / `base` / `commit` 分键失效 | `CTB1-T11` | `medium` |
| P3-02 | Phase 3 | 共用 parser 与 Worker 客户端 | `add` | `src/client/diff-parse.js`、`src/client/diff-worker.js`（新建） | 一份 parser；`>1000` 字符与 hunk `>500` 行跳过词级差异；CSP 失败走 200 行切片；过期 `requestId` 丢弃 | `CTB1-T12` | `high` |
| P3-03 | Phase 3 | 虚拟化、分帧着色、适配器 | `add` | `src/client/diff-view.js`、`src/client/diff-renderer.js`（新建）；`src/client/drawers.js:1108-1117` | `>250` 行才虚拟化，overscan 12，焦点行保留；视口 ±20 行、每帧 ≤4ms；`<pre>` 路径删除 | `CTB1-T12` `CTB1-T16` | `high` |
| P4-01 | Phase 4 | 三视角单抽屉 | `update` | `src/client/body.js:1241-1260`；`src/client/drawers.js:408-418,962-1117`；新建 `src/client/drawer-scope.js` | `drawer` 仍只有 `branch` \| `commit`；只读态不挂提交输入、`commitAllNote` 和提交按钮；历史文件点进去之后能回到原来展开的那条提交 | `CTB1-T21` | `medium` |
| P4-02 | Phase 4 | 视口、token、死代码 | `remove` | `src/client/styles.js:30-33,354,409-421`；`src/client/i18n.js:34,278` | 几何按 `T-O-10`；旧 pre 类与 `viewDiffUnavailable` 不存在；diff 色走 `--dsw-alias-file-diff-*` | `CTB1-T15` `CTB1-T16` | `medium` |
| P4-03 | Phase 4 | `viewed.v1` 与右键回落 | `add` | `src/client/viewed-store.js`（新建）；`src/client/body.js:389-401`；`src/client/prefs.js:5` | 12×500、digest 失效、不写入 `prefs.v2`；无 Forge 时打开 `[DNEE]` 的 commit 卡 | `CTB1-T13` | `medium` |
| P5-01 | Phase 5 | 验证与交付物 | `update` | `test/`；`package.json:3,29-31`；`dsh-nano-explorer-extra/AGENTS.md`；`docs/specs/dsh-nano-explorer-extra/README.md`；`dsh-nano-explorer-extra-0.3.0.tgz` | `0.4.0`，`engines.dsh` 不变；四项收口命令按 §8 记录；`.tgz` 删除；文档不再写 `0.1.1` / `tree.js` / `变更 diff: ❌` | `CTB1-T14`–`CTB1-T20` | `low` |

安全项 P1-02 的威胁模型落在 §7.3，不留空。

---

## 4. Phase 业务表格

### 4.1 Phase 1 — 宿主只读硬切

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P1-01 | 基线与摘要 | a) 新增 `resolveBaseRef`：非空显式 `base` 先过与 P1-02 相同的形状校验，再当作候选。否则读取 `refs/remotes/origin/HEAD`（现有探测在 `git.js:916-921`），再试本地 `main`，再试本地 `master`。b) Unborn HEAD（`rev-parse --verify HEAD` 非 0）或四步都没有 ref 时，`readBaseDiffSummary` 返回 `{ baseRef: null, mergeBase: null, files: [] }`，不把 stderr 当成路由失败。c) 命中后跑一次 `git merge-base --end-of-options <headSha> <baseSha>`，再跑 `git diff --numstat -M -z --no-ext-diff <mergeBase>..HEAD`。解析失败的一行跳过，不抛到默认轮询。 | `src/host/git.js:489-592`、`913-931` | `only=base-diff` 能给出净改动列表或平静空集 | `CTB1-T01` | 负例仓库不产生 500；成功路径含 `baseRef` 与 `mergeBase` |
| P1-02 | 单一读取器 | a) 删除 `git.js:614-626` 现在的双分支实现，改成一个 `readPathDiff`。b) `untracked === true` 不得同时带 `commit` 或 `base`；`commit` 与 `base` 也互斥。c) `commit` 必须匹配 `/^[0-9a-fA-F]{4,40}$/u`。`base` 不得为空字符串、不得以 `-` 开头、不得含 `..`、NUL、换行或其他控制字符，并且 `git rev-parse --verify --end-of-options <base>^{commit}` 必须成功。d) `path` 继续走 `routes.js:475-479` 已有的词法拒绝，并拒绝 `.git` 路径段。在此之上对齐 `src/host/mutate.js` 里已经在用的 fail-closed `realpath`：符号链接解析后若离开工作区就拒绝。这不是新 capability，也不是新错误枚举；`dnee.diff` 仍是 `L2` / `read:host`。e) argv 固定含 `--no-ext-diff`、`--unified=3`，仅当 `ignoreWhitespace === true` 时多一个 `-w`，路径前有 `--`。f) `commit` 没有父提交时改跑 `git show --format= --unified=3 --no-ext-diff`，同样可以带 `-w` 和 `-- <rel>`。不保留名为旧行为的第二个导出。 | `src/host/git.js:603-626`；`src/host/routes.js:469-484` | 不传新参时仍是相对 HEAD 的工作区差异；传参时不能把 flag 送进 git | `CTB1-T02` `CTB1-T03` | 负例零次 `runGit`；正例 argv 可断言 |
| P1-03 | 缓存并轨 | a) `mergeBaseCache` 最多 32 项，键为 `cwd + NUL + headSha + NUL + baseSha`，淘汰用有界 LRU/FIFO，只放在 `git.js` 模块内存。b) `routes.js` 对 `only=base-diff` 使用 `memoized(\`base-diff:${root}:${baseParam}\`)`，默认 `GET /status` 与 `only=stats` 分支不调用它。c) `forgetReads`（`routes.js:294-297`）增加 `base-diff:${root}:` 前缀，现有 commit / checkout / pull / watch 路径因此一起失效。不新增 watcher。d) `readStatus` 在 `readRemotes` 结果长度为 0 时不调用 `listRemoteBranches`、`remoteDivergence`、`fetchStamp`。有 remote 时行为与现在一致。 | `src/host/routes.js:277-300,430-464`；`src/host/git.js:558-570,1022` | 切分支后看不到上一分支的 base 摘要；本地无远端仓少三次 git | `CTB1-T04` `CTB1-T06` | 测试能数到 spawn 次数，而不是只看返回 JSON |
| P1-04 | 200KB | 把 `DIFF_PATCH_CAP` 改成 `200_000`。截断仍是 `slice` 加 `truncated: true`。请求里出现 `full` 字段就忽略，不读第二档上限。`git.js:602-603` 的注释里没有「80KB」这四个字，改的是常量 `80_000` 和它上面那句「渲染多少」的说明，使注释与 `200_000` 一致。 | `src/host/git.js:602-625` | 200001 字节的 stdout 被截断；没有旁路 | `CTB1-T05` | 常量与截断断言同时存在 |
| P1-05 | 合同 | a) `declaration.json` 的 `contract` 补 `dnee.diff`、`dnee.paste-image`，与 `lib/bindings.js` 的 20 条对齐。b) `spans` 补 `diff-parse`、`diff-render`、`tree-filter`。c) `budgets` 保持现有 `git-poll` 两条，不加第三条。d) `route-sensitivity.json` 只改 `dnee.status` 与 `dnee.diff` 的 `justification` 用词，写明只读扩展参数；不改 `sensitivity`、`capability`、`bodyLimit`、`match`。e) `DIFF_PATCH_CAP` 只截响应。`POST /diff` 的请求体上限继续是 `MAX_BODY_BYTES` / `65536`。不要改 `scripts/route-scan.mjs` 让它去读 `200_000`。`CTB1-T18` 同时断言台账和 scan 结果仍是 65536。 | `src/perf/declaration.json:5-83`；`security/route-sensitivity.json:220-230,502-515` | `npm run build` 烤出的声明含 20 条且含两个补齐 id | `CTB1-T17` `CTB1-T18` | 路由数仍是 20；敏感级别没有被抬高或降低 |

### 4.2 Phase 2 — 文件树稳态与 Changed-Only

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P2-01 | 预计算 | 在 `workspace-store.js` 的 git 快照提交处，用一次 `O(statusMap.size)` 往上冒泡，写出不可变 `folderStatusMap`。优先级沿用 `body.js:918-920` 注释里的顺序：`U` > `D` > `M` > `A` > `R` > `?`。`body.js:913-928` 的 `folderStatusOf` 整段删除。渲染期只 `get`。`cwd` 或 `session` 切换时地图随 store 重置，不留上一仓的键。 | `workspace-store.js:41-66`；`body.js:903-928` | 无关轮询不重算整棵目录着色 | `CTB1-T07` | 纯函数对嵌套路径与冲突优先有断言 |
| P2-02 | 引用稳定 | 从 `accessory.js` 导出纯函数 `createRowReader(getSnapshot)`。模块加载时调用一次，渲染路径不得再调用。返回的 reader 在 `getSnapshot()` 的 `folderStatusMap` 与 prefs 引用都不变时，对同一 path 返回同一个标记对象；引用变了才换。`body.js:930-948` 不再把 `createAccessory` 放进依赖 `statusOf` 的 `useMemo`。`body.js:971-999` 的 `onToggle`、`onOpen`、`canOpen`、`entries` 用 `useCallback` / `useMemo` 固定。不要改宿主 `FileTree`，也不要写 `[class*=]`。 | `accessory.js:11-74`；`body.js:930-999` | 无关轮询不换 reader，也不换未变化行的标记对象 | `CTB1-T08` | `CTB1-T08` 只导入 `createRowReader`，不渲染 React |
| P2-03 | 过滤 | 新建 `changed-tree.js`，输入 `git.files`、已加载 levels、`changedOnly`、`filterQuery`、上限 800。输出真实路径的 `TreeEntry[]` 与 `changedExpanded`。禁止把 `a/b/c` 收成一个 name。`<=800` 时祖先全进 `changedExpanded`；`>800` 时深度只到 2，并在 `i18n.js` 增加该提示的中英文键（本 Phase 只加键，不删 `viewDiffUnavailable`）。`filterQuery` 只匹配已在内存中的 levels 与 `git.files`。`highlight` 把查询串原样交给宿主。`changedOnly` 与查询放在 body 的 React state，切换工作区根时清空，不调用 `prefs.js` 的写入。`changed-tree.js` 导出 `treeFilterKeyAction`。`/` 与 `Esc` 走与粘贴相同的守卫：`pasteTargetIsEditable`（`paste.js:43-46`）为真、或 `dialog !== null`、或 `drawer !== null` 时它返回 `ignore`。`perf.span('tree-filter', ...)` 包住纯计算；flag 关闭时仍是 `perf.js:28` 的恒等包装。 | `body.js:552-614,958-999`；`paste.js:43-46`；`i18n.js`；`changed-tree.js` | 过滤不发 `/list`；粘贴锚点仍是真实 `data-files-path` | `CTB1-T09` `CTB1-T10` | `changed-tree.js` 不导入 `request`；改完的 `body.js` 仍无 `'/list'` |

### 4.3 Phase 3 — Diff 单轨管线

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P3-01 | LRU | `ByteBudgetLruCache` 同时数条目与 UTF-8 字节。放入时若超过 64 或 `4 * 1024 * 1024`，从最旧开始丢，直到两项都满足。键包含 `scope`、`refOrSha`、`path`、`ignoreWhitespace`。提供 `dropWhere(scope)` 与按 headSha 丢 `base`。`commit` scope 不提供「随 git 轮询全清」的入口。模块顶层不碰 `window`。 | 新文件 `src/client/diff-cache.js` | 大 patch 会因字节先于条数被丢出 | `CTB1-T11` | 用固定 UTF-8 长度夹具，不用 `performance.now` 假装命中 `<5ms` |
| P3-02 | Parser 与 Worker | a) `diff-parse.js` 导出纯函数：拆 hunk、`oldLine` / `newLine`、行种类、增删计数、FNV-1a digest、相邻改动行的词级区间。b) 行 `text.length > 1000` 或该 hunk 变更行 `> 500` 时不计算词级区间，行标记 `plainOnly`。c) `diff-worker.js` 顶层只放字符串与工厂。`start()` 里才 `new Worker(URL.createObjectURL(...))`，随后 `revokeObjectURL`。构造抛错则置 `cspBlocked` 并改用同一 `parsePatch` 的 `rAF` 循环，每片最多 200 行。d) 每次 `post` 带单调 `requestId`；回包 id 不匹配当前文件则丢弃。e) `perf.span('diff-parse')` 包住解析。禁止把 parser 复制进测试文件各写一份。 | 新文件；调用点替换 `drawers.js:1110` | 超长行不会进入词级循环；Worker 与降级结果一致 | `CTB1-T12` | digest 对同一 patch 稳定；过期 id 不写状态 |
| P3-03 | 视图 | a) 解析结果行数 `<=250` 时一次渲染。`>250` 时用固定行高窗口，`OVERSCAN = 12`，滚动测量合到 `rAF`，当前焦点行强制留在挂载集。b) 行网格为 `40px 40px 14px minmax(0, 1fr)`。c) `useCodeHighlighter(languageForPath(path))` 只对 `[visibleStart - 20, visibleEnd + 20]` 里尚未着色且长度 `<=1000` 的行调用。调度器用注入的 `now()`，预算 `<=4` 毫秒后让出。首帧先画纯文本和行底色。d) 着色代际随 highlighter 身份变化；旧代际回调丢弃。e) `DiffRendererAdapter` 接收 `{ patch, path, viewPrefs, reviewed, onToggleViewed }`。已审阅 `Checkbox` 画在 `diff-view.js` 的文件头里，不塞回 `drawers.js:1108` 的旧容器。f) 删除 `drawers.js:1110` 的 `pre` 映射。本 Phase 收口时就跑一次 `CTB1-T14`，不等到 Phase 5 才发现顶层碰了 `Worker`。二进制或 `truncated: true` 渲染说明，不把截断字节当完整补丁解析。 | `drawers.js:1108-1117`；新视图文件 | 抽屉里不再出现 `nxe-commit-diff-pre` | `CTB1-T12` `CTB1-T16` | 源码检索与调度器单测同时过 |

### 4.4 Phase 4 — 三视角抽屉与审阅闭环

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P4-01 | 流转 | 新建 `drawer-scope.js`，导出纯函数，React 只调用它。`inspectCommitFile(state, file)` 把 `drawer` 设为 `'commit'`，`commitScope.mode` 设为 `'commit'`，并记住 `filesOpen` 与 `picked`。`returnToHistory(state)` 把 `drawer` 设回 `'branch'`，并交还原来的 `filesOpen` 与 `picked`。`commitChrome(mode)` 在 `working` 返回显示提交 `Input`、`commitAllNote`（`drawers.js:1038`）和主提交 `Button`；在 `base` 与 `commit` 返回三者都隐藏。`scopeOptions(commitSha)` 给出 `SegmentedControl` 的选项：始终有工作区与相对基线；有 sha 时多一档。不增加第二种抽屉。`drawers.js:1039-1051` 现有的 `nxe-commit-filter` 留下，它是工作区筛选，不是视角切换；视角切换是另一处 `SegmentedControl`，id 定为 `nxe-commit-scope`。`HistoryRail` 的 `drawers.js:411` 静态 `li` 改成宿主 `Button`。 | `body.js:1241-1260`；`drawers.js:408-418,962-1117`；`drawer-scope.js` | 只读审阅没有提交表单；返回后历史列表的展开态还在 | `CTB1-T21` | `drawer` 只有 `branch` 与 `commit` |
| P4-02 | 几何与清理 | `.nxe-dialog-layer .nxe-scm-commit` 改为 `height: min(72vh, 680px); max-height: calc(100% - 16px)`，纵向 flex。文件列表容器 `max-height: 36%`。`.nxe-commit-diff` 改为 `flex: 1; min-height: 220px; contain: strict`，去掉 `height: 160px`。删除 `.nxe-commit-diff-pre`、`.nxe-commit-diff-line` 以及 `#3fb950` / `#f85149` 在 diff 规则上的回退。行底色改用 `var(--dsw-alias-file-diff-added-bg)`、`deleted-bg`、`added-gutter`、`deleted-gutter`、`added-marker`、`deleted-marker`。词级胶囊用 `color-mix` 叠在 marker 上。`styles.js:30-33` 若仍被文件树 Git 字母使用，可以留下；diff 新规则不得再引用这两条 fallback。删除 `i18n.js:34` 与 `i18n.js:278` 的 `viewDiffUnavailable`。 | `styles.js:346-421`；`i18n.js:34,278` | 死类名与死文案为零 | `CTB1-T15` `CTB1-T16` | `check-ui-rules` 的 U1/U2/U5/U8/U9 为 0，U3/U4/U6/U10 不超过 18/2/5/3 |
| P4-03 | 已审阅与右键 | a) `viewed-store.js` 顶层不读 `localStorage`。键名 `dsh-nano-explorer-extra:viewed.v1`。形状 `{ version: 1, repos: [{ repoKey, updatedAt, items }] }`，`items` 的值是 `{ digest, viewedAt }`。写入前裁到 12 个仓、每仓 500 条。`storage` 监听放在 `useEffect`。隐私模式写入失败时用模块内 `Map`，函数返回时不抛。b) digest 变化则该路径不再算已审阅。c) `prefs.js:5` 的键与 `normalizePrefs` 的布尔集合不改。d) `openDiff`（`body.js:389-401`）仍先尝试 `dsh-resource://forge-changes/...`。`catch` 里改为打开本插件 commit 卡并选中该 path：文件在工作区改动里则 `mode: 'working'`，否则若调用方知道它在 base 列表里则 `mode: 'base'`，否则仍打开工作区卡并定位该 path。不再调用 `setLinkNote(copy.viewDiffUnavailable)`。e) 文件头的「已审阅」用宿主 `Checkbox`，挂在 `diff-view.js`，经 `DiffRendererAdapter` 的 `reviewed` / `onToggleViewed` 传进去。命名导出 `Checkbox` 与 `useCodeHighlighter`、`languageForPath` 都从 `@deepseek-ai/dsh-client-ui-primitives` 取（与 `drawers.js:9` 同一模块；宿主源 `ui-primitives/src/index.ts` 已有这三项导出）。若实施时该包的安装副本没有 `Checkbox`，停止并报告，不要写原生 checkbox，也不要加 `nano-ui-exempt`。 | `body.js:380-401`；`prefs.js:5`；`diff-view.js`；新 store | Forge 缺失时右键仍能看到 `[DNEE]` diff；偏好键不被已读记录污染 | `CTB1-T13` `CTB1-T15` | store 单测不挂 `window` 也能跑；源码里没有 `viewDiffUnavailable` |

### 4.5 Phase 5 — 验证、文档与 `0.4.0`

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P5-01 | 交付 | a) 在 worktree 里把 `package.json:3` 改为 `0.4.0`，`engines.dsh` 保持 `>=0.2.2-rc.1 <0.3.0`。b) 重跑 `npm run build`，提交烤好的 `lib/host.js`、`lib/client.js`、`lib/perf-declaration.js`、`lib/bindings.js`。c) 改 `[DNEE]/AGENTS.md` 的使用表与路由表：`GET /status` 写上 `only=base-diff`；`POST /diff` 写上三个可选字段与互斥；右键「查看差异」改为 Forge 优先、失败则本卡；补 `viewed.v1` 一段，声明它不是 `prefs.v2`。d) 重写 `docs/specs/dsh-nano-explorer-extra/README.md` 里仍写着 `0.1.1`、`tree.js`、`变更 diff: ❌` 的句子。e) 在设计稿文首加一段：被 QnA §1 取代，冲突以 `T-O-*` 为准。f) 删除 `dsh-nano-explorer-extra/dsh-nano-explorer-extra-0.3.0.tgz`。g) 不执行 `dsh plugin add`。 | `package.json:3,29-31`；两份说明；设计稿文首；该 tgz | 仓库里的说明与 `0.4.0` 源码一致 | `CTB1-T19` `CTB1-T20` | `pack --dry-run` 的文件列表含 `lib/client.js` 且不含该 tgz |

---

## 5. Phase 详情

### 5.1 Phase 1 — 宿主只读硬切

- **Phase 目标**：三视角的数据从同一个读取器出来，默认轮询的 Git 次数不增加，注入进不了 argv。
- **本 Phase 对应编号**：`P1-01` / `P1-02` / `P1-03` / `P1-04` / `P1-05`
- **本 Phase 新增文件**：无
- **本 Phase 修改文件**：`src/host/git.js:603-626`、`src/host/git.js:558-570`、`src/host/routes.js:294-300`、`src/host/routes.js:440-484`、`src/perf/declaration.json:34-53`、`security/route-sensitivity.json:512`
- **本 Phase 删除文件**：无
- **具体功能预期**：
  1. 不传 `commit`、`base`、`ignoreWhitespace` 时，`POST /diff` 仍返回该路径相对 HEAD 的统一差异；`untracked: true` 仍相对空文件。
  2. `commit` 为 `HEAD~1`、`-p`、`abc`、`../x` 或带空格时拒绝，且不调用 `runGit`。
  3. `base` 为 `--output=/tmp/x` 或 `origin/main..HEAD` 时拒绝。合法 ref 会先 `rev-parse --verify --end-of-options`。
  4. 所有 diff/show argv 含 `--no-ext-diff`，用户路径出现在 `--` 之后。
  5. 无 remote 的仓，一次全量 `readStatus` 不再调用 `listRemoteBranches`。
  6. 同一 `(cwd, headSha, baseSha)` 的第二次 `merge-base` 不 spawn。
  7. `forgetReads(root)` 之后，下一次 `only=base-diff` 不复用旧 memo。
  8. 默认 `GET /status` 的函数体不调用 `readBaseDiffSummary`。
  9. stdout 长度 `200_001` 时 `truncated === true`，patch 长度为 `200_000`。
  10. 构建后的 route contract 是 20 条，包含 `dnee.diff` 与 `dnee.paste-image`，`budgets` 长度仍为 2。
- **对应测试台账项**：`CTB1-T01`–`CTB1-T06`、`CTB1-T17`、`CTB1-T18`（详见 §8）
- **收口标准**：上述负例在 `node:test` 里失败即本 Phase 未完成；不得用「手工点过一次」代替。
- **本 Phase 风险提醒**：`readStatus` 今天在 `git.js:560-570` 无条件并发远端命令。短路必须放在这组 `Promise.all` 的构造处，不要在每个被调函数里各写一半。

### 5.2 Phase 2 — 文件树稳态与 Changed-Only

- **Phase 目标**：宿主 `FileTree` 收到稳定 props 和真实路径；过滤是临时 UI。
- **本 Phase 对应编号**：`P2-01` / `P2-02` / `P2-03`
- **本 Phase 新增文件**：`src/client/changed-tree.js`
- **本 Phase 修改文件**：`src/client/workspace-store.js:63-66`、`src/client/body.js:913-999`、`src/client/accessory.js:11-23`、`src/client/i18n.js`（只加过滤与 `>800` 提示键）
- **具体功能预期**：
  1. 一个目录下同时有 `U` 与 `?` 时，地图值是 `U`。
  2. `folderStatusOf` 这个标识符在 `src/client` 中消失。
  3. `changed-tree` 对 `src/client/drawers.js` 产出目录行 `src`、`src/client`、文件行，而不是名为 `src/client` 的单个目录。
  4. 801 个文件时自动展开集合的深度不超过 2，并带提示标记。
  5. `changed-tree.js` 不导入 `request`。改完后 `body.js` 仍然没有字符串 `'/list'`（当前就是 0 处，这条锁的是接线层）。
  6. `treeFilterKeyAction` 在可编辑目标、`dialog` 或 `drawer` 打开时返回 `ignore`。
- **对应测试台账项**：`CTB1-T07`–`CTB1-T10`
- **收口标准**：纯函数测试绿，且 `body.js` 把 `highlight` 传给现有 `renderFactorySlot('sidebar.files.tree', ...)`。
- **本 Phase 风险提醒**：`git status --untracked-files=normal`（`git.js:496-509`）会把整目录未跟踪收成一行。Changed-Only 必须保留这行目录，展开时仍走现有的 scoped `GET /status?path=`，不要为了「看到里面每个文件」去发全仓 `/list`。

### 5.3 Phase 3 — Diff 单轨管线

- **Phase 目标**：解析只有一份；渲染只有新引擎；主线程着色有预算。
- **本 Phase 对应编号**：`P3-01` / `P3-02` / `P3-03`
- **本 Phase 新增文件**：`diff-cache.js`、`diff-parse.js`、`diff-worker.js`、`diff-view.js`、`diff-renderer.js`
- **本 Phase 修改文件**：`src/client/drawers.js:1108-1117`
- **本 Phase 删除文件**：无单独文件；删除的是 `<pre>` 渲染分支与对应 CSS 类（类在 Phase 4 一并删，Phase 3 不得再引用它们）
- **具体功能预期**：
  1. 65 条小记录会把最旧一条挤出；一条 4 MiB 加 1 字节的记录不会留下超预算的上一条。
  2. `dropWhere('working')` 不清 `commit` 键。
  3. 1001 字符的替换行没有 `changedRanges`。
  4. 501 行变更的 hunk 没有词级区间，仍有整行种类。
  5. 同一 patch 的 digest 两次相同；改一个字符则不同。
  6. 导出的 `acceptParseResult(currentId, incomingId, value)` 在 `incomingId` 较小时返回 `discard`。Worker 客户端把构造函数换成会抛错的桩时，`start()` 置 `cspBlocked` 并不再调用 `Worker`。这两处都是导出函数或可注入构造器，不把标志藏在闭包里让测试重写一份。
  7. 假时钟每次只前进 1ms 时，调度器在累计 4ms 后停止继续调用 highlighter。
  8. `<=250` 行的夹具不创建窗口切片；251 行会。
  9. `drawers.js` 不再出现 `split('\\n')` 后映射到 `pre`。
  10. 新模块在被 import 时不求值 `Worker`、`IntersectionObserver`、`URL.createObjectURL`、`localStorage`、`addEventListener`。
- **对应测试台账项**：`CTB1-T11` `CTB1-T12` `CTB1-T14` `CTB1-T16`
- **收口标准**：`CTB1-T12` 导入的是 `diff-parse.js` 的导出，不是测试里的副本。
- **本 Phase 风险提醒**：宿主 `useCodeHighlighter` 是同步分词。预算必须包在调用外侧。不要在 Worker 里再打包一份 Shiki。

### 5.4 Phase 4 — 三视角抽屉与审阅闭环

- **Phase 目标**：一张卡覆盖三种只读视角；已读状态有界且与偏好隔离；右键不再死文案。
- **本 Phase 对应编号**：`P4-01` / `P4-02` / `P4-03`
- **本 Phase 新增文件**：`src/client/viewed-store.js`、`src/client/drawer-scope.js`
- **本 Phase 修改文件**：`body.js:389-401`、`drawers.js:408-418` 与 `drawers.js:962-1117`、`styles.js:354,409-421`、`i18n.js:34,278`、`diff-view.js`（只挂 `Checkbox`）
- **具体功能预期**：
  1. `commitChrome('base')` 与 `commitChrome('commit')` 的 `message`、`note`、`submit` 都是 false；`working` 三者都是 true。
  2. `returnToHistory` 把 `drawer` 设回 `branch`，并带回进入前的 `filesOpen` 与 `picked`。
  3. `.nxe-scm-commit` 的 CSS 含 `min(72vh, 680px)`，`.nxe-commit-diff` 含 `min-height: 220px`，不含 `height: 160px`。
  4. 第 13 个仓库写入会把最旧仓库挤出；第 501 条路径挤出该仓最旧路径。
  5. digest 改变后 `isViewed` 为 false。
  6. `prefs.v2` 的写入函数不被 viewed-store 调用。
  7. `openDiff` 的 `catch` 路径不读取 `copy.viewDiffUnavailable`。
  8. 新控件不使用原生 `<button>`。文件树 Accessory 里已有的存量例外保持不动，不在本批新增。
- **对应测试台账项**：`CTB1-T13` `CTB1-T15` `CTB1-T16` `CTB1-T21`
- **收口标准**：`rg viewDiffUnavailable` 与 `rg nxe-commit-diff-pre` 在包内无匹配。
- **本 Phase 风险提醒**：`T-O-10` 的 UI 计数上限是冻结数字。若开工时基线已经高于 `18/2/5/3`，停下来报告，不要把上限改成新的实测值。

### 5.5 Phase 5 — 验证、文档与 `0.4.0`

- **Phase 目标**：同一 worktree 里代码、烤制产物、说明和版本一起可合并。
- **本 Phase 对应编号**：`P5-01`
- **本 Phase 新增 / 修改 / 删除文件**：`package.json:3`；`AGENTS.md` 路由表与使用表；`docs/specs/dsh-nano-explorer-extra/README.md`；设计稿文首；删除 `dsh-nano-explorer-extra-0.3.0.tgz`
- **具体功能预期**：
  1. `version` 是 `0.4.0`，`engines.dsh` 字符串与本计划动工前逐字相同。
  2. README 不再把 diff 写成不在范围内，也不再引用已不存在的 `tree.js`。
  3. AGENTS 路由表仍是 20 行，其中 `/diff` 与 `/status` 的句子含新参数，`/paste-image` 的原句子还在。
  4. 工作区里不存在 `dsh-nano-explorer-extra-0.3.0.tgz`。
  5. 本 Phase 不调用 `dsh plugin add`，不重启 `[dsh]`。
- **对应测试台账项**：`CTB1-T14` `CTB1-T15` `CTB1-T19` `CTB1-T20`
- **收口标准**：§10.2 里退出项都有四元组之后，才能把本文件状态改为 `executed`。批准前保持 `draft`。
- **本 Phase 风险提醒**：`lib/client.js` 必须是这次 `build` 的产物。用改前的 bundle 跑 `bundle-smoke` 不算数。

---

## 6. 依赖的冻结设计决策（只读引用）

| 决策 / Q ID | 冻结来源 | 本计划中的影响 | 若不成立的处理 |
|-------------|----------|----------------|----------------|
| `T-O-1` | [CT-batch-1-qna.md](../qna/CT-batch-1-qna.md) §1 | Phase 2–4 不得改其他插件，不得做编辑器或全仓索引 | 停止并退回 QnA |
| `T-O-2` | 同上 | 新控件只用宿主原语或已在用的 `dsh-nano-ui`；零新 DOM 嫁接 | UI 红线失败则本 Phase 不收口 |
| `T-O-3` | 同上 | Diff 与树保持 DOM；阈值写进 P3-02 / P3-03 | 不得改用 Canvas 文本来「补救」卡顿 |
| `T-O-4` | 同上 | 不留双读取器、双 Diff 视图、双失效链 | 出现第二套实现即拒绝合并 |
| `T-O-5` | 同上 | P1 全部 | 不得新增第 21 条路由 |
| `T-O-6` | 同上 | P2 与 P3 | 不得引入 `@pierre/*` 或 `.wasm` |
| `T-O-7` | 同上 | P1-01–P1-04 的顺序、正则、缓存和 `200_000` | 设计稿里的 80KB / `full: true` 作废 |
| `T-O-8` | 同上 | P3 的预算与 P4-03 的键 | 不得把 viewed 写入 `prefs.v2` |
| `T-O-9` | 同上 | P2-03 与 P4-01 | 不得做假路径拼接或第二张 Diff 卡 |
| `T-O-10` | 同上 | P4-02 的几何与 UI 上限 | 不得保留 `.nxe-commit-diff-pre` |
| `T-O-11` | 同上 | §8 的全部测试类型 | 不得加 Playwright 或新 budget 闸 |
| `T-O-12` | 同上 | 文件名、`0.4.0`、worktree 名、文档清单、`draft` 直到批准 | 不得另写第二份收口文档来代替本文件末节 |

设计稿 §9.1 的 `CT-B1-Q1`–`CT-B1-Q5` 不是本表的来源。它们已被上表覆盖。

---

## 7. 内置 Reference-Anchor 锚区

### 7.1 锚表（本计划工作要落在哪些既有代码 / 新建点上）

| 锚 ID | `path:line` | 落点（这是什么）| 本 AP 用途（对应工作项）| 处置 | 备注 |
|-------|-------------|------------------|--------------------------|------|------|
| A-1 | `dsh-nano-explorer-extra/src/host/routes.js:277-300` | `memoized` 与 `forgetReads` | P1-03 把 `base-diff:` 并进同一失效链 | `✅ 复用` | 不新建 watcher |
| A-2 | `dsh-nano-explorer-extra/src/host/routes.js:440-450` | `only=stats` 的按需分支 | P1-01 在旁边加 `only=base-diff`，默认路径不进入 | `✅ 复用` | 默认轮询保持原样 |
| A-3 | `dsh-nano-explorer-extra/src/host/routes.js:469-484` | `POST /diff` | P1-02 扩展 body，路径拒绝留在 475–479 | `♻️ 重 substrate` | 仍是这一条路由 |
| A-4 | `dsh-nano-explorer-extra/src/host/git.js:603-626` | `DIFF_PATCH_CAP` 与 `readPathDiff` | P1-02、P1-04 替换函数体 | `♻️ 重 substrate` | 旧函数删除，不改名留一份 |
| A-5 | `dsh-nano-explorer-extra/src/host/git.js:558-570` | 全量 status 的远端 `Promise.all` | P1-03 无 remote 短路 | `✅ 复用` | 短路在组 promise 之前 |
| A-6 | `dsh-nano-explorer-extra/src/host/git.js:913-931` | `origin/HEAD` 探测 | P1-01 的基线顺序第一步之后 | `✅ 复用` | 不要复制一套 symbolic-ref |
| A-7 | `dsh-nano-explorer-extra/src/host/git.js:496-509` | 未跟踪目录汇总语义 | P2-03 保留目录行，展开仍走 scoped status | `✅ 复用` | 不要改成 `--untracked-files=all` 的全仓读 |
| A-8 | `dsh-nano-explorer-extra/src/client/workspace-store.js:41-66` | git 快照与 `gitEpoch` | P2-01 写 `folderStatusMap`；P3-01 用 epoch 清 `working` 缓存 | `✅ 复用` | `gitEpoch` 已在 53 行 |
| A-9 | `dsh-nano-explorer-extra/src/client/body.js:913-928` | `folderStatusOf` 全表扫描 | P2-01 删除 | `♻️ 重 substrate` | 这是要退役的反例 |
| A-10 | `dsh-nano-explorer-extra/src/client/body.js:930-999` | 每次重建的 Accessory 与树 props | P2-02 | `♻️ 重 substrate` | 宿主 FileTree 本体不改 |
| A-11 | `dsh-nano-explorer-extra/src/client/accessory.js:11-74` | 行尾 Accessory | P2-02 改为按 path 订阅 | `✅ 复用` | 模块注释已要求稳定身份 |
| A-12 | `dsh-nano-explorer-extra/src/client/paste.js:43-46` | 可编辑目标守卫 | P2-03 的 `/` 热键 | `✅ 复用` | 不另写一套选择器 |
| A-13 | `dsh-nano-explorer-extra/src/client/body.js:389-401` | `openDiff` | P4-03 改 catch | `♻️ 重 substrate` | forge URL 尝试保留 |
| A-14 | `dsh-nano-explorer-extra/src/client/body.js:1241-1260` | 底部单抽屉 | P4-01 | `✅ 复用` | 不增加 drawer 枚举值以外的第二槽 |
| A-15 | `dsh-nano-explorer-extra/src/client/drawers.js:9,408-418,1108-1117` | 已引入的 `SegmentedControl`；静态历史文件；`<pre>` | P4-01 与 P3-03 | `♻️ 重 substrate` | `SegmentedControl` 已在用，不要再包一层 |
| A-16 | `dsh-nano-explorer-extra/src/client/styles.js:354,409-421` | `50vh` 与 `160px` 加硬编码色 | P4-02 | `♻️ 重 substrate` | 树用的 `--nxe-git-*`（30–33 行）不是这组 diff 规则 |
| A-17 | `dsh-nano-explorer-extra/src/client/i18n.js:34,278` | `viewDiffUnavailable` | P4-02 删除 | `♻️ 重 substrate` | 两处文案一起删 |
| A-18 | `dsh-nano-explorer-extra/src/client/prefs.js:5` | `prefs.v2` | P4-03 禁止写入已读 | `✅ 复用` | 只读这条边界，不改规范器 |
| A-19 | `dsh-nano-explorer-extra/src/client/perf.js:28-36` | 恒等包装 | P1-05、P2-03、P3-02 的 span | `✅ 复用` | 不改包装实现 |
| A-20 | `dsh-nano-explorer-extra/src/perf/declaration.json:5-11,34-53,60-83` | spans、18 条 contract、两条 budgets | P1-05 | `✅ 复用` | 缺的是 `dnee.diff` 与 `dnee.paste-image` |
| A-21 | `dsh-nano-explorer-extra/test/bundle-smoke.test.mjs:16-30` | 最小 vm 沙箱 | P3 懒初始化的验收面 | `✅ 复用` | 沙箱没有 Worker / Blob / IntersectionObserver |
| A-22 | `security/route-sensitivity.json:227-230,510-515` | `dnee.status` L0、`dnee.diff` L2 `bodyLimit: 65536` | P1-05 只改说明 | `✅ 复用` | 不改级别与 bodyLimit |
| A-23 | `src/client/changed-tree.js` 等新文件 | 纯逻辑与视图 | P2-03、P3、P4-03 | `🆕 净新` | 顶层无浏览器副作用 |
| A-24 | `dsh-nano-explorer-extra/src/client/drawers.js:573,847,1039` | 三处既有 `SegmentedControl` | P4-01 第四处视角切换 | `✅ 复用` | 新增一处，不改前三处的语义 |

### 7.2 反例 ledger ⛔（别碰区 / 已知陷阱）

| ⛔ | 反例 / 陷阱 | 为什么（依据）|
|----|------------|----------------|
| ⛔1 | 新增 `/base-diff` 或 `/commit-diff` | `T-O-5`。攻击面和合同表会变成 21 条 |
| ⛔2 | 保留 `readPathDiffHead` 与新函数并存 | `T-O-4`、`T-O-5` |
| ⛔3 | `full: true` 或把上限留在 80_000 | `T-O-7` 已覆盖设计稿 F4 的那句 |
| ⛔4 | 为 base-diff 另做 `fs.watch` | `routes.js:302-305` 已有 watcher；`T-O-7` |
| ⛔5 | 模块顶层 `new Worker` / `addEventListener` / `localStorage.getItem` | `bundle-smoke.test.mjs:16-30`；`T-O-11` |
| ⛔6 | 测试里复制一份 parser 来断言「算法正确」 | 测的不是将被打包的函数 |
| ⛔7 | `[class*=]`、`:has()` 套宿主 FileTree，或改宿主 portal | `T-O-2` |
| ⛔8 | 原生 `<button>`、手写拖拽分割条、给新控件加 `nano-ui-exempt` | `T-O-10` |
| ⛔9 | 把 `changedOnly` 或 viewed 写入 `prefs.v2` | `T-O-8`、`T-O-9` |
| ⛔10 | `a/b/c` 假目录名 | 会弄歪 `data-files-path`（`body.js:614`）与粘贴落点；`T-O-9` |
| ⛔11 | 第二张 Diff 抽屉，或只读态仍挂着禁用的提交按钮 | `T-O-9` |
| ⛔12 | `@pierre/diffs`、`.wasm`、WebGPU 文本 | `T-O-3`、`T-O-6`；`package.json:19-28` 的发布文件列表没有静态 wasm 目录 |
| ⛔13 | 用 `<16ms` / `60fps` 单测常量宣称性能收口 | `T-O-11` 不设这条闸。常量断言是假绿 |
| ⛔14 | 改 `[DNPR]` 或其他插件来「共享 Diff 组件」 | `T-O-1` |
| ⛔15 | 本计划仍是 `draft` 时创建 worktree 或改 `src/` | `T-O-12` |
| ⛔16 | 把响应截断 200KB 写成 `dnee.diff` 的 `bodyLimit` | 请求体上限仍是 `route-sensitivity.json:510` 的 65536 |

### 7.3 上游真源指针 + 安全项威胁模型

- **独立 reference-anchor**：无。§7.1 就是本 AP 的 grounding 真源。`context/t3code` 与宿主 `useCodeHighlighter` 的实现不在本仓运行路径里；本计划只消费它们的已冻结阈值，不复制那些仓库的源码。
- **威胁模型（P1-02 / P1-03，不得留空）**：
  - **Git flag 注入**。攻击者把 `commit` 或 `base` 写成 `-` 开头或含 `..`。落点：`git.js:614-618` 今天只拼 `HEAD` 与 path；新参数必须在 `runGit` 之前按 `T-O-7` 拒绝。现有 path 拒绝在 `routes.js:475-479`。
  - **外部 diff driver**。恶意 `.git/config` 的 `diff.external` 会在只读 diff 时执行宿主程序。缓解是每条 diff/show 都带 `--no-ext-diff`。这与 `route-sensitivity.json` 里 `dnee.commit` 对 `git-config-filter-exec` 的既有戒备同一类，但是 diff 路径今天没有这面旗。
  - **路径越界与 `.git` 段**。词法拒绝已在 `routes.js:475-479`。符号链接在 `realpath` 之后离开工作区，按 `mutate.js` 已有的 fail-closed 方式拒绝；这是同一 `read:host` 能力内的加固，不升 capability。`dnee.diff` 保持 `L2`、`bodyLimit: 65536`（`route-sensitivity.json:508-515`）。`CTB1-T03` 必须有一条 symlink 夹具，模式对齐 `test/paste-image.test.mjs` 的 fake fs。
  - **缓存串仓**。键必须含 `root` / `cwd`。`forgetReads` 必须覆盖新前缀，否则 checkout 之后仍返回上一基线。
  - **`viewed.v1` 不是凭证库**。只存 path、digest、时间。不存 session token、不存 patch 正文。
  - **本批不扩大 capability**。不新增路由，不把 `dnee.status` 从 `proc:git` / `L0` 改级。

---

## 8. 测试台账

### 8.1 测试清单（主表）

| Test-ID | 测试项（验证什么）| 类型 | 层 | 来源 | 映射（工作项 → 收口目标）| PASS 证据（四元组）|
|---------|------------------|------|----|------|---------------------------|---------------------|
| `CTB1-T01` | 基线顺序与 Unborn/无 ref 的空集 | `短途` | `unit` | `🆕 新增 test/ct-batch-1-host.test.mjs` | `P1-01` → 空集而非 500 | `commit + 该 test 名 PASS + UTC 时间`；实施前为未观察 |
| `CTB1-T02` | 不传新参等于 HEAD；三参互斥；根提交走 `show` | `短途` | `unit` | `🆕 test/ct-batch-1-host.test.mjs`。桩用 `test/remote-execution.test.mjs:41-43` 的 `createRoutes` + `subprocess.spawn` 记录，不碰 `test/diff.test.mjs` | `P1-02` → 单一读取器 | 同上 |
| `CTB1-T03` | `-` / `..` / `.git` / 非法 SHA / 控制字符拒绝且零次 `runGit`；symlink 解析后离开工作区同样零次 `runGit`；合法 argv 同时含 `--no-ext-diff`、`--unified=3`、`--`，`ignoreWhitespace: true` 时多 `-w`，否则 argv 里没有 `-w` | `短途` | `unit` | `🆕` 同上。symlink 夹具对齐 `test/paste-image.test.mjs` 的 fake fs | `P1-02` → 注入与链接逃逸都进不了 argv | 只断言 throw、不断言 argv 或调用次数的运行不算 PASS |
| `CTB1-T04` | `remotes.length === 0` 时不调用 `listRemoteBranches`；缓存命中不再 spawn `merge-base` | `短途` | `unit` | `🆕` 同上 | `P1-03` → spawn 次数下降可数 | 同上 |
| `CTB1-T05` | `200_001` 字节截成 `200_000` 且 `truncated`；`full: true` 不改变上限 | `短途` | `unit` | `🆕` 同上 | `P1-04` → 无旁路 | 同上 |
| `CTB1-T06` | 默认 status 路径不调用 `readBaseDiffSummary`；`forgetReads` 删除 `base-diff:` 键 | `短途` | `unit` | `🆕` 同上 | `P1-03` → 轮询零额外开销 | 同上 |
| `CTB1-T07` | `folderStatusMap` 冲突优先于未跟踪；嵌套前缀 `O(entries)` 一次建成 | `短途` | `unit` | `🆕 test/ct-batch-1-tree.test.mjs` | `P2-01` → 线性扫描函数删除 | 同上 |
| `CTB1-T08` | `createRowReader(getSnapshot)` 只构造一次；同一 snapshot 引用下同一 path 的标记对象 `===`；snapshot 换了才换对象 | `短途` | `unit` | `🆕` 导入 `accessory.js` 的 `createRowReader`。不渲染 React，也不把 `useMemo` 当测试对象 | `P2-02` → 引用稳定 | 同上 |
| `CTB1-T09` | Changed-Only 产出真实层级；801 条只展两级；`changed-tree.js` 无 `request(`；`body.js` 无 `'/list'` | `短途` | `unit` | `🆕` 导入 `changed-tree.js`，并读 `body.js` 源码 | `P2-03` → 零假路径、接线层也不发 `/list` | 只测纯函数、不读 `body.js`，不算 PASS |
| `CTB1-T10` | `treeFilterKeyAction`：可编辑目标、dialog、drawer 时返回 `ignore`，否则返回 `open` 或 `clear` | `短途` | `unit` | `🆕` 导入 `changed-tree.js`。复用 `pasteTargetIsEditable`（`paste.js:43-46`），不另写选择器 | `P2-03` → 不抢输入框 | 同上 |
| `CTB1-T11` | LRU 64 与 4 MiB 双驱逐；三 scope 独立失效 | `短途` | `unit` | `🆕 test/ct-batch-1-diff.test.mjs` 导入 `diff-cache.js` | `P3-01` → 预算与分层 | 同上 |
| `CTB1-T12` | parser：hunk、词级、1000 字符、500 行、digest；`acceptParseResult` 丢掉旧 id；注入会抛错的 `Worker` 后 `cspBlocked`；4ms 调度让出；250 行门槛 | `短途` | `unit` | `🆕` 导入 `diff-parse.js` 与 `diff-worker.js` 导出的纯函数 / 可注入工厂 | `P3-02` `P3-03` → 熔断与防竞态 | 不得在测试内重写算法，也不得只断一个私有布尔 |
| `CTB1-T13` | viewed 12×500、digest 失效、不调用 prefs 写入；无 `localStorage` 时不抛 | `短途` | `unit` | `🆕 test/ct-batch-1-viewed.test.mjs` | `P4-03` → 键隔离 | 同上 |
| `CTB1-T14` | `lib/client.js` 在最小 vm 里加载 | `短途` | `回归` | `♻️ test/bundle-smoke.test.mjs` | `P3` `P5-01` → 顶层无浏览器 API | 必须在当次 `build` 之后跑。PASS 记录该次 `lib/client.js` 的 git blob 或 sha256，避免单独 `npm test` 读到旧包仍绿 |
| `CTB1-T15` | `check-ui-rules`：U1/U2/U5/U8/U9 = 0，U3≤18，U4≤2，U6≤5，U10≤3 | `短途` | `契约` | `♻️ node scripts/check-ui-rules.mjs --plugin dsh-nano-explorer-extra --json` | `P4-02` → 不高于冻结基线 | 退出码 0 但计数超限仍是 FAIL。实施前记为未观察 |
| `CTB1-T16` | 包源码无 `viewDiffUnavailable`、无 `nxe-commit-diff-pre`、无 diff 规则上的 `#3fb950` / `#f85149`；`styles.js` 含 `min(72vh, 680px)`、`min-height: 220px`、`40px 40px 14px minmax(0, 1fr)`，且不含 `height: 160px`；`readPathDiff` 导出只有一个 | `短途` | `回归` | `🆕` 源码断言测试 | `P3-03` `P4-02` → 旧实现退役且几何值真的写上 | 只删 `160px`、不写 `72vh` 仍算 FAIL。U 计数代替不了这几条字符串 |
| `CTB1-T17` | declaration `contract` 20 条且含 `dnee.diff` 与 `dnee.paste-image`；spans 含三个新名字；`budgets.length === 2` | `短途` | `契约` | `🆕` 读 `src/perf/declaration.json` 与 build 后的 `lib/perf-declaration.js` | `P1-05` → 合同对齐且无新闸 | 两份都要看，防止烤制漏了 |
| `CTB1-T18` | 路由绑定仍是 20 条，没有 `/base-diff` 这个 path；`security/route-sensitivity.json` 里 `dnee.diff.bodyLimit === 65536`，且 `scripts/route-scan.mjs` 对 `/diff` 报出的请求体上限也是 65536 | `短途` | `契约` | `🆕` 放在 `ct-batch-1-host.test.mjs`。直接读 JSON 与 scan 结果，不新增收口命令，也不把 `check-route-sensitivity.mjs` 升成 release-gate | `P1-05` → 零新路由且请求体上限没被 200KB 响应截断带跑 | 只数路由条数、不读 `bodyLimit`，不算 PASS |
| `CTB1-T19` | `npm --prefix dsh-nano-explorer-extra pack --dry-run` 成功，列表含 `lib/client.js`，不含 `0.3.0.tgz` | `短途` | `契约` | `♻️` 现有 pack 习惯，本批作为收口命令 | `P5-01` → 发布文件干净 | 同上 |
| `CTB1-T20` | `npm --prefix dsh-nano-explorer-extra run build` 然后 `npm --prefix dsh-nano-explorer-extra test` 全绿 | `短途` | `回归` | `♻️` 包脚本 | 共同出口，不是单项的替代 | 全绿不抵消任何一条 `CTB1-Txx` 的特殊判据 |
| `CTB1-T21` | `inspectCommitFile` / `returnToHistory` / `commitChrome` / `scopeOptions`：`drawer` 只有 `branch` 与 `commit`；只读态三个提交控件都隐藏；返回时 `filesOpen` 与 `picked` 还在；有 sha 时选项为三档，且含 `nxe-commit-scope` | `短途` | `unit` | `🆕 test/ct-batch-1-drawer.test.mjs` 导入 `drawer-scope.js`，并断言 `drawers.js` 含 `id: 'nxe-commit-scope'` | `P4-01` → 单抽屉流转可返回 | `nue-migration` 的 `count >= 3` 挡不住缺这第四处，不能拿它代替本项 |

没有 `spike`、`mega`、`soak` 行。`T-O-11` 禁止把它们设成收口。

### 8.2 复用台账（沿用 / fork 的既有用例明细）

| 既有用例 | 处置 | 改动 | 起跑线状态 |
|----------|------|------|------------|
| `dsh-nano-explorer-extra/test/diff.test.mjs` | `♻️ 沿用` | 0。它只测 `numstatDestination` / `parseNumstat` / `applyNumstat` / `summarizePatch`，没有 `readPathDiff` | 不得把 `CTB1-T02` / `T03` 写进这个文件来冒充 fork |
| `dsh-nano-explorer-extra/test/remote-execution.test.mjs` | `♻️ 沿用其桩写法` | 0 改动该文件。新测试自己造 `createRoutes` 与 `subprocess.spawn` 记录 | `41-43` 行已有 spawn getter 炸弹，说明路由函数可被单测驱动 |
| `dsh-nano-explorer-extra/test/bundle-smoke.test.mjs` | `♻️ 沿用` | 0 改动，除非新依赖让 factory 在加载期缺模块；若缺模块，补的是桩，不是把 Worker 放进顶层 | 沙箱范围以 `16-30` 行为准 |
| `dsh-nano-explorer-extra/test/nue-migration.test.mjs` | `♻️ 沿用` | 0。`193-196` 行断言 `createElement(SegmentedControl` 次数 `>= 3`，并点名 `nxe-branch-scope`、`nxe-repo-settings-scope`、`nxe-commit-filter` | `>= 3` 挡不住缺 `nxe-commit-scope`。第四处由 `CTB1-T21` 锁，不把这条改成 `>= 4` 来假装覆盖 |
| `scripts/check-ui-rules.mjs` | `♻️ 沿用` | 0 | 审查时实测 `U3/U4/U6/U10 = 18/2/5/3`，与 `T-O-10` 一致。脚本自己写明 findings 不改变退出码 |
| 路由烤制与 `security/route-sensitivity.json` 的既有检查 | `♻️ 沿用` | 只允许 justification 文本变化 | 改 `bodyLimit` 或新增 id 应使既有漂移检查失败 |

### 8.3 分层与跑法（各类型在哪跑、何时跑）

| 类型 | 跑法 / 频率 | 主要层 | 触发时机 |
|------|-------------|--------|----------|
| 短途 | `npm --prefix dsh-nano-explorer-extra test`；UI 与 pack 各一次 | unit、契约、回归 | 每个 Phase 的纯模块落地后跑相关文件；收口时跑全套 |
| spike | 不新增 | — | `T-O-11` 不要求 |
| mega | 不新增 | — | 同上 |
| soak | 不新增 | — | 同上 |

收口命令，按这个顺序，前一步失败就停：

1. `npm --prefix dsh-nano-explorer-extra run build`
2. `npm --prefix dsh-nano-explorer-extra test`
3. `node scripts/check-ui-rules.mjs --plugin dsh-nano-explorer-extra --json`（看 JSON 里的 U 计数，不看退出码；有发现时进程仍是 0）
4. `npm --prefix dsh-nano-explorer-extra pack --dry-run`

### 8.4 测试缺口（本 AP 明确不覆盖什么 + 交给谁）

- 不覆盖 49k 文件仓的墙钟 `<16ms`，也不覆盖 1000 行 Diff 的 `<50ms` 或滚动 `60fps`。理由：`T-O-11` 禁止 Playwright 和新增 budget 闸。设计稿 §7.3 的这些数字不进入本 AP 的 PASS 定义。若 `[业主]` 以后要看帧率，另开观测，不回填成这次已验证。
- 不覆盖真实浏览器里的 CSP 拦截。Worker 降级由「构造函数抛错」的单测桩覆盖。真实 CSP 头交给以后的宿主配置，不在本包假装测过。
- 不覆盖 Forge 已安装时的原生 tab 是否真的打开。只测 `openResource` 抛错时走本卡。Forge 本体不在 `[DNEE]`。
- 不覆盖 `dsh plugin add` 之后的页面。`T-O-12` 规定合并不自动部署。

### 8.5 测试保真（防假绿 · 刻死）

- 每个 PASS 必带 commit、测试或命令名、UTC 时间。本文件在 `draft` / `reviewed` 时 §10.2 状态保持 `未观察`。不许先写成 `verified`。
- `CTB1-T03` 必须看 mock 的 argv 或 `runGit` 调用次数。只断 `throw` 而 git 已经执行，是假绿。
- `CTB1-T06` 必须覆盖「默认 status 不调用 base 摘要」。只测 `only=base-diff` 的快乐路径，证明不了轮询没变重。
- `CTB1-T12` 禁止在测试文件里重写一份 hunk 解析再与自己比较。
- `CTB1-T14` 必须读当次 build 的 `lib/client.js`，并记下该文件的 sha256。源码改了但 bundle 是旧的，smoke 仍绿就是假绿。Phase 3 结束时就跑一次，不等 Phase 5。
- `CTB1-T20` 只是聚合出口。它绿了，不能代替 `CTB1-T03`、`T16`、`T18`、`T21` 的专项断言。
- `CTB1-T15` 以 JSON 计数为准，不以进程退出码为准。计数高于 `T-O-10` 即 FAIL。
- `CTB1-T17` 要同时读源 declaration 和 `lib/perf-declaration.js`。只改 JSON、忘记 build，不算对齐。
- 安全负例是本台账的一部分，不是附录。缺 `CTB1-T03` 不得把 P1-02 标完成。
- 不把「测试文件数量」或「断言条数」写成价值。

---

## 9. 风险、依赖与完成后状态

### 9.1 风险与依赖

| 风险 / 依赖 | 描述 | 当前判断 | 应对方式 |
|-------------|------|----------|----------|
| 宿主 `Checkbox` 导出 | 本仓插件源码还没有引用它；宿主 `ui-primitives/src/index.ts` 有这个命名导出 | `low` | 开工时对安装副本再确认一次。没有就停，不造原生控件 |
| `useCodeHighlighter` 同步分词 | 宿主实现不在本仓 | `high` | 只在视口 ±20 行、每帧 ≤4ms 调用；超长行不送入 |
| 200KB 截断仍可能切断一个 hunk | 硬切是字节不是行 | `low` | `truncated: true` 时视图走说明态，不把残片当完整解析 |
| UI 基线漂移 | 审查时实测仍是 `18/2/5/3`，与 `T-O-10` 一致 | `low` | 开工再跑一次。高于冻结数就停，不要改上限 |
| 单 IIFE | `package.json:19-28` 不发布额外静态文件 | `high` | Worker 源码内联进 `lib/client.js`。不加 wasm 依赖 |
| 无 remote 短路改错分支 | `readStatus` 的并发列表很长 | `medium` | `CTB1-T04` 数调用 |

### 9.2 约束与前提

- **技术前提**：改动只在 `dsh-nano-explorer-extra` 与本计划点名的 `security/route-sensitivity.json` 说明句、两份文档。不改 `packages/dsh-nano-ui` 的实现来迁就 Diff。
- **运行时前提**：`engines.dsh` 不动。git 在宿主机器上。浏览器没有 git 不影响，diff 在宿主算。
- **组织协作前提**：本文件 `draft` 直到 `[业主]` 把它改为 `reviewed`。工作树路径只允许 `.agents/worktrees/ct-batch-1-review-perf`。
- **上线 / 合并前提**：四条收口命令有记录；文档与 `.tgz` 已处理；不自动 `dsh plugin add`。

### 9.3 文档同步要求

- 需要同步更新的设计文档：`docs/specs/dsh-nano-explorer-extra/CT-batch-1-design.md` 文首替代声明。不把 §9.1 改写成另一份真相。
- 需要同步更新的说明文档 / README：`dsh-nano-explorer-extra/AGENTS.md`；`docs/specs/dsh-nano-explorer-extra/README.md`。
- 需要同步更新的测试说明：无单独测试说明文件。§8 与 §11 就是记录处。
- 涉及面退役时，退役清单必须覆盖代码、注释、头注、行号锚、文档句五类落点：`folderStatusOf`、`readPathDiff` 的旧 HEAD 专一实现、`.nxe-commit-diff-pre`、`.nxe-commit-diff-line`、`viewDiffUnavailable`、AGENTS 里「查看差异」只指向 Forge 的那句、README 里「变更 diff 不在范围」的那句。

### 9.4 完成后的预期状态

1. `[DNEE]` 版本 `0.4.0`，路由仍是 20 条，`POST /diff` 与 `GET /status?only=base-diff` 按 `T-O-7` 工作。
2. 文件树在「仅看改动」和 `/` 下仍使用宿主 `FileTree` 的真实路径。
3. `CommitDrawer` 只有新的 Diff 视图；历史文件可以点开并返回。
4. `viewed.v1` 与 `prefs.v2` 分开。无 Forge 时右键不再显示已删除的文案。
5. `declaration.json` 与绑定表一致，`budgets` 没有新硬闸。过期 `0.3.0.tgz` 不在。

---

## 10. 收口（Definition of Done = 测试台账全 PASS 映射）

### 10.1 收口硬闸

`T-O-11` 没有 mega / soak。退出层就是 §8.3 的四条命令，外加安全负例与死代码断言。全部 PASS 且四元组齐全才算：

1. 宿主负例、symlink 逃逸、请求体仍是 65536、缓存行为成立（由 `CTB1-T01`–`CTB1-T06` 与 `CTB1-T18` 证明）
2. 旧 Diff、死文案、几何字符串与 UI 上限成立（由 `CTB1-T15`–`CTB1-T17` 证明）
3. 三视角纯函数与当次 bundle 成立（由 `CTB1-T14` 与 `CTB1-T21` 证明）
4. build、全量 `node:test`、pack 成立（由 `CTB1-T19` `CTB1-T20` 证明）。`CTB1-T20` 不替代前三条里的专项断言。

帧率不在这三条里面。

### 10.2 收口映射表（收口目标 ↔ Test-ID ↔ 证据）

| 收口目标 | 工作项 | Test-ID | PASS 证据（四元组）| 状态 |
|----------|--------|---------|---------------------|------|
| 基线空集与顺序 | `P1-01` | `CTB1-T01` | 实施后回填 | `未观察` |
| 单一读取器且注入失败 | `P1-02` | `CTB1-T02` `CTB1-T03` | 实施后回填 | `未观察` |
| 轮询不碰 base-diff；缓存与无远端可数 | `P1-03` | `CTB1-T04` `CTB1-T06` | 实施后回填 | `未观察` |
| 200KB 无旁路 | `P1-04` | `CTB1-T05` | 实施后回填 | `未观察` |
| 20 条合同、无新闸 | `P1-05` | `CTB1-T17` `CTB1-T18` | 实施后回填 | `未观察` |
| 目录着色预计算 | `P2-01` | `CTB1-T07` | 实施后回填 | `未观察` |
| Accessory 引用稳定 | `P2-02` | `CTB1-T08` | 实施后回填 | `未观察` |
| Changed-Only 与 `/` | `P2-03` | `CTB1-T09` `CTB1-T10` | 实施后回填 | `未观察` |
| LRU 分层 | `P3-01` | `CTB1-T11` | 实施后回填 | `未观察` |
| parser、熔断、分帧、虚拟化门槛 | `P3-02` `P3-03` | `CTB1-T12` | 实施后回填 | `未观察` |
| `<pre>`、死文案与抽屉几何字符串 | `P3-03` `P4-02` | `CTB1-T16` | 实施后回填 | `未观察` |
| 三视角单抽屉，返回后展开态还在 | `P4-01` | `CTB1-T21` | 实施后回填 | `未观察` |
| viewed 隔离 | `P4-03` | `CTB1-T13` | 实施后回填 | `未观察` |
| UI 不高于冻结基线 | `P4-02` | `CTB1-T15` | 实施后回填 | `未观察` |
| 最小沙箱仍能加载新 bundle | `P5-01` | `CTB1-T14` | 实施后回填 | `未观察` |
| build、test、pack | `P5-01` | `CTB1-T19` `CTB1-T20` | 实施后回填 | `未观察` |

### 10.3 Definition of Done

| 维度 | 完成定义 |
|------|----------|
| 功能 | §5 的功能预期在对应测试里有断言，而不是只在手册里 |
| 测试 | §8 全部 PASS；`CTB1-T03`、`CTB1-T09`、`CTB1-T15`、`CTB1-T16`、`CTB1-T17`、`CTB1-T18`、`CTB1-T21` 的特殊判据满足。`CTB1-T20` 不能顶替它们 |
| 文档 | AGENTS、README、设计稿文首、route justification 与代码一致 |
| 风险收敛 | 无第二读取器、无第二 Diff 视图、无新路由、无新 budget |
| 可交付性 | `0.4.0` 的 pack 干跑通过；本机宿主未在本计划中被安装或重启 |

### 10.4 NOT-成功识别

任一退出项为 `未观察` 或失败，本文件不得标 `executed`。`reviewed` 只表示 `[业主]` 批准开工，不表示测试已跑。实施后的偏差写在 §11，不另写收口报告。

---

## 11. 执行日志回填（仅 `executed` 状态使用）

文档状态是 `draft`。本节不记执行结果。

`T-O-12` 要求的 Q7 验证回填栏先空着，实施完成后只填这一张表：

| 命令 | commit | 结果 | UTC 时间 | 备注 |
|------|--------|------|----------|------|
| `npm --prefix dsh-nano-explorer-extra run build` | | | | |
| `npm --prefix dsh-nano-explorer-extra test` | | | | |
| `node scripts/check-ui-rules.mjs --plugin dsh-nano-explorer-extra --json` | | | | 写上 U1–U10 计数 |
| `npm --prefix dsh-nano-explorer-extra pack --dry-run` | | | | |

- **实际执行摘要**：未开始
- **Phase 偏差**：无
- **阻塞与处理**：无
- **测试发现**：无
- **后续 handoff**：批准后使用工作树 `ct-batch-1-review-perf`。合并与删除工作树另等 `[业主]` 当次指示。
