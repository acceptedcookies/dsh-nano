# DNPR β 总结册：NDEE 渲染路径与 Git 扇出真机实测 + 优化执行台账

> 范围：`dsh-nano-explorer-extra`（下称 NDEE）性能深潜——perf-review 数据的边界校准、渲染路径与宿主 Git 扇出的真机实测、file:line 根因、分层优化方案与执行台账（E0–E11）。
> 日期 **2026-11-11**；仓库 HEAD `350c6c8`（2026-11-11 22:04:51 +0800）；NDEE `0.1.1`；dsh `0.2.2-rc.1`（Node v24.22.2）。
> 证据实例：`https://dsh-dev.local/`（ego lite / Chromium 156），TaskSpace `nxe-perf-verify-1111`（id 42，**保留供修复后同口径复测**）。
> 上游合同：[spec-26nov.md](../../specs/dsh-nano-performance-review/spec-26nov.md) rev4.1；[performance-alpha.md](performance-alpha.md) §10.7.4 三态机、D 闸纪律（「优化只按报告点名，不凭感觉改」）。
> 本册不改任何产品代码；全部条目为**待执行台账**，每条自带可检验验收证据。

---

## §1 perf-review 数据的边界校准

α 册（§11）与本机 git-ignored 调查记录 `.local-perf-review.md`（2026-11-11 13:33，dsh.local）的读数要分两半读。

**已证明的**：

| 读数 | 值 | 含义 |
|---|---|---|
| `processingP95` / `inputDelayP95` | 9.5 / 0.6 ms | 主线程没被插件 JS 阻塞 |
| `presentationP95` | **71.6 ms** | 页级延迟几乎全在渲染呈现（style recalc / layout / paint） |
| 插件 span/track | ≈ 0 | NDEE 自己埋点的异步工作可忽略 |
| `nanoClientJsBytes` | 705 KB / 3.37 MB | 包体积不是脚本负载来源 |
| D1 候选表 #1 | `nano-explorer-extra hostSpan.git-status`（3×10791.5 ms） | **宿主侧 Git 读已是全仓最高「次数×耗时」项** |

**没证明的（仪器盲区）**：DNPR 只覆盖插件显式埋点的异步 span/track（`perf.js` join 的那些），**React 渲染路径、DOM 拆建、CSS 样式重算一个字节都测不到**——而这些恰恰是 presentation 的组成部分。库里有现成的 `perf.profiler()`（`packages/dsh-performance-review/src/client.js:487`，包 `React.Profiler`），但 NDEE 从未用它包过 `ExplorerBody`。α 册 §10.1 自己立过规矩：「结论必须靠源码走读补足」。

**所以「插件 span ≈ 0」不能读成「插件没问题」**——它只证明测得到的路径没问题。本册把测不到的路径全部实测了一遍。

---

## §2 本轮真机实测（2026-11-11 晚，dsh-dev）

测试床：会话「理解项目setup文件」（cwd = `/Users/seanz/Documents/dsh-plugins`，git 仓库，工作区**干净**：0 改动、0 冲突），文件页 38 行（根 23 + `dsh-nano-explorer-extra/` + `packages/` 两级展开），全程无人操作。

### 2.1 实验一：空闲 DOM 翻动（MutationObserver，38 s）

观察可见 pane 的 `[data-nxe-tree]`（注意：`keepMounted` 使每个会话各留一个 pane，`document.querySelector` 会抓到隐藏 pane——首轮两次采样因此作废，第三次起按可见性过滤）。

| 指标 | 值 |
|---|---|
| 突变批次 | **3 批，间隔精确 15 s**（t≈5.3 / 20.3 / 35.3 s，即 `POLL_GIT_MS` 轮询节奏） |
| 每批 accessory（`.nxe-acc`） | **38 个全部卸载 + 38 个重挂**（accAdd=38 / accRem=38） |
| 行 `li[data-files-entry]` 重建 | **0**（行骨架没动，只有 accessory 被撕掉重建） |
| accessory 属性原地更新 | **0**（不是 patch，是 remount） |
| 38 s 合计 | **114 次挂载 + 114 次卸载，期间数据零变化** |
| 每批真实 DOM 面 | 38 个 span 子树，含 16 个打开按钮 + 17 个 SVG |

### 2.2 实验二：React 组件身份（fiber 检查）

取一个 `.nxe-acc` 的 fiber，向上找到渲染它的组件函数，跨一个轮询 tick 比较函数身份：

| 指标 | 值 |
|---|---|
| tick 前后组件函数同一性 | **`sameFunctionIdentity: false`**——`createAccessory` 每 tick 返回**新的组件类型**，React 按类型差异强制卸载重挂 |

### 2.3 实验三：宿主 HTTP/Git 扇出（performance resource timing，33 s）

| 请求 | 次数 | 总耗时 | 单次 |
|---|---|---|---|
| `/status`（整仓） | 2 | 798 ms | ~400 ms |
| `/status?path=<dir>`（每个展开目录 × 每 tick） | 4 | 1896 ms | **~474 ms** |

两个展开目录 × 2 个 tick = 6 次请求、~2.7 s 的宿主 Git 时间——**在一个完全干净、无人操作的仓库上**。scoped 请求的调用方只消费 `git.files` 一个字段，却每次跑满全套 `readStatus`（§3.3）。α 册 D1 表里 `hostSpan.git-status` p95 10.8 s 的读数（大工作区）与本轮小仓库 ~400–474 ms 同源：**每次状态读的进程数 × 读的频率**。

### 2.4 附带观察（非 NDEE，如实记录）

页面每 30 s 出现 ~980 ms 的 Long Animation Frame（34 s 窗口内 36 帧 LoAF），节奏与 NDEE 的 15 s 轮询**不重合**，疑似其他插件或 shell 的周期任务，建议另行排查（不在本册台账内）。

---

## §3 根因：三条主链路 + 次要链路（全部 file:line 实据）

### 3.1 链路一（最重）：accessory 组件身份漂移 → 全树重挂

- `src/client/body.js:723-741`：`accessory = useMemo(() => createAccessory({...}), [copy, statusOf, ignoredOf, tree.levels, cwd, ...])`。
- 依赖里的 `statusOf`（`body.js:314-318`）依赖 `statusMap`，而**每次 Git 轮询落盘都会产生新 `statusMap`**：`src/client/workspace-store.js:195` 无条件 `commit({ git: ..., directoryStatus: new Map() })`。
- `createAccessory` 每次调用返回一个**新的组件函数**（`src/client/accessory.js:16`）→ 组件类型变了 → React 对每行 accessory 整棵卸载重挂。
- `accessory.js:7` 的注释写着「Build the accessory Component once at module scope, so the Factory never remounts it」——**这个意图被 `body.js:723` 的 useMemo 依赖正好打败**：Git 状态一变（哪怕内容完全相同），它就不是同一个组件了。
- 实验一、二分别从 DOM 面和 fiber 面证实了这条链路。它不只发生在空闲轮询：每一次真实的状态变化、每一次展开目录的补充状态（`workspace-store.js:196` 对每个展开目录触发 `loadDirectoryStatus` → 新 `directoryStatus` → 新 `statusMap`）都走同一条路。

### 3.2 链路二：FileTree 输入不稳定 → 每次渲染整树重算

原生树 `FileTree` 是 `React.memo` 组件，类型声明（dsh-client-ui-sidebar-files `lib/types/client/FileTree.d.ts`）明说「**a caller keeps its inputs and local selection stable between renders**」。但 `body.js` 交给它的输入每次渲染全是新引用：

| 输入 | 位置 | 问题 |
|---|---|---|
| `entries` | `body.js:751-762` | `tree.entries.filter(...).map(...)` **裸写在渲染体里**，每次渲染新数组 + 新对象（每个对象还内联跑一次 `ignoredOf`），memo 永远 miss |
| `onToggle` / `onOpen` | `body.js:773-789` | 内联闭包，每次渲染新函数 |
| `expanded` | `body.js:201` | `[...ws.expanded]`，每次 tree 重建新数组 |

打开一个菜单、弹一个 toast、选一行——任何 `ExplorerBody` 状态变化都触发整树重渲染。链路一的重挂叠加其上。

### 3.3 链路三（宿主侧）：Git 全套电池 × 展开目录扇出

- `workspace-store.js:196`：每次 `refreshGit` 落盘后，**对每个展开目录**再发一次 `loadDirectoryStatus`；
- `src/host/routes.js:251-254`：scoped `/status?path=` 与整仓读走同一个 `readStatus`；
- `src/host/git.js:317-372`：`readStatus` 不管查什么，固定跑最多 **9 个 git 进程**：rev-parse（:318）+ [status + stash + worktree]（:341-347）+ [for-each-ref + log + merge-base + 2×diff]（:359-365，`remoteDivergence` 在 `git.js:34-64`）。
- 消费错配：scoped 查询的调用方（`workspace-store.js:164-175`）只读 `root` 和 `files`；状态栏（`statusbar.js:63-122`）只需要 status + stash；history / branches / worktrees / remote **只有抽屉打开才画**（`drawers.js`）。
- `body.js:23`：`POLL_GIT_MS = 15000` 固定节奏——无内容比对、无退避、不检查 `document.hidden`（`body.js:255` 只查了 pane 的 `[hidden]`，后台标签页照跑）。
- `routes.js:141`：宿主 memo 仅 3 s（`MEMO_MS`），对 15 s 轮询形同虚设；而宿主其实**已经有** fs.watch 失效机制（`routes.js:189-212`），轮询大部分时间是白问。

**扇出算术**：每 tick = 1 次整仓全套 + N 个展开目录全套 = `(1+N) × 最多 9` 个 git 进程。本轮 2 个展开目录 = 每 15 s 最多 27 个进程；hospital-harvest 级仓库（`git ls-files --others` 26 万行）单次 status 就是秒级，乘子直接放大到分钟级体感。

### 3.4 次要链路（记录在案，优先级低）

| 项 | 位置 | 问题 |
|---|---|---|
| 行级 `:has()` 选择器 ×9 | `src/client/styles.js:229-237`、`:336-337` | 树内任何 DOM 变化（正是链路一制造的）都要让引擎沿祖先链重估 `:has()`，样式失效 O(树) |
| `folderStatusOf` O(行 × 文件) | `body.js:709-721` | 每个目录行全量扫 `statusMap` 求最强状态 |
| stats 遍历每目录一次 realpath | `src/host/stats.js:25` | 非符号链接子目录本可 `joinPath` 直传（`:43` 已对符号链接做了特判，说明作者知道这个区分） |
| `markIgnored` 每目录一次 check-ignore | `workspace-store.js:124`、`:133-151`；`routes.js:373-382` | `refresh()`（每次 commit/checkout/pull 后）对每个展开目录重列 + 重问一遍 |

---

## §4 分层优化方案

按 α 册 §12.2 的体例：依据 → 预期收益 → 风险/边界 → 验收。**所有层都不改 UI 语义**（渲染结果逐像素不变，只改到达方式）。

| 层 | 方案 | 依据 | 预期收益 | 风险 / 边界 | 验收 |
|---|---|---|---|---|---|
| **P0-a** | 冻结 accessory 组件身份：api 走 ref（`apiRef.current = {...}`，全部访问器经 ref 转发），`createAccessory` 每个 pane 只调一次 | §2.1/§2.2 实测；`accessory.js:7` 的原设计意图 | 消灭「每 15 s 全树 accessory 重挂」；真变化时也只做原地 patch | 必须确认状态更新仍能到达行上：E1 单独可先行（现状下 `entries` 每渲染都是新引用，FileTree 必然重绘，ref 里的新值必然被读到）；**E3 落地后 entries 依赖必须含 `statusMap`，否则字母停在旧值** | §2.1 同口径复测：空闲批次 0 次 remount；人为 `touch` 一个文件后字母原地更新（属性 patch，非重挂） |
| **P0-b** | `refreshGit` 内容比对：新读数与旧 `git` 逐字段比较（files/branch/ahead/behind/stashed/conflicts/remote），相同则跳过 `commit` 并跳过 `workspace-store.js:196` 的每目录重查（`gitEpoch` 照常递增，以丢弃在飞的旧答案） | §2.1（干净仓库 3 批全翻动）；§2.3（4 次 scoped 全白跑） | 干净仓库空闲时 DOM 批次 0、scoped 请求 0 | 比较必须覆盖状态栏与行渲染消费的全部字段；漏一个字段就会「该变不变」 | 干净仓库静置 40 s：MutationObserver 批次 0、resource timing 无 `/status` 新请求 |
| **P0-c** | 稳定 FileTree 输入：`entries` 上 `useMemo`（依赖 `tree.entries`、`prefs.showSystemFiles`、`ignoredOf`、**`statusMap`**）；`onToggle`/`onOpen` 上 `useCallback`（`prefsRef` 已存在于 `body.js:145`）；`expanded` 数组 memo 化 | `FileTree.d.ts` 的 memo 合同；§3.2 | 菜单/toast/选中/对话框开关不再触发整树重渲染 | 见 P0-a 的依赖要求；`ignoredOf` 本身是 useCallback（`body.js:303-312`），身份随 `ignoredSet` 变化，天然可作依赖 | React Profiler（E11）下：打开右键菜单一次，`ExplorerBody` commit 的 `actualDuration` 相对基线下降且树子树不重渲 |
| **P0-d** | scoped status 轻量化：`/status?path=` 走新的 `readScopedStatus`（rev-parse + `status --porcelain=v2 --untracked-files=all -- <path>`），只返回 `{root, files}` | §2.3（scoped ~474 ms 只消费一个字段）；α 册 D1 点名 `hostSpan.git-status` 为全仓第一候选 | 每展开目录每 tick 从最多 9 进程降到 2；大仓库每目录省数秒 | 只影响 `loadDirectoryStatus` 路径；整仓读不动 | resource timing：scoped 单次 <100 ms（本测试床）；α 册 lab `files-expand` 场景 `hostSpan.git-status` 读数下降 |
| **P1-a** | 拆「状态栏需求」与「抽屉需求」：`readStatus` 加 `detail` 开关；轮询只要 rev-parse + status + stash（9 → 3 进程）；branches / history / worktrees / remote divergence 延迟到抽屉打开（`body.js:232-237` `openDrawer` 已在打开时触发 `refreshGit`，正好挂 `detail=1`） | §3.3 消费错配表 | 整仓轮询每 tick 省 ~6 个进程；大仓库显著 | 抽屉打开瞬间多一次带 detail 的读（本来就是现状）；`CommitDrawer` 消费 files 已含在 status 里 | 干净仓库静置 40 s：整仓 `/status` 单次耗时较 §2.3 基线（~400 ms）明显下降 |
| **P1-b** | 轮询退避：连续相同结果 15→30→60 s 阶梯，任何交互/可见性变化复位；`document.hidden` 时暂停 | §3.3（fs.watch 已兜底宿主 memo 新鲜度：退避只影响「问的频率」，不影响「问到时的数据新鲜度」） | 后台标签页与静置页面的请求量降一个数量级 | 新鲜度语义变化需在 AGENTS.md 记一行 | 静置 2 min：`git-poll` tick 数 ≤ 5（基线 8） |
| **P1-c** | 消灭行级 `:has()`：`rowTriggerProps` 的返回值本来就「spread onto the row's button」（`FileTree.d.ts` 原文），把 `data-nxe-status` / `data-nxe-ignored` 直接放按钮 props，9 条 `:has()` 改为直接属性选择器 | §3.4；样式失效从 O(树) 降到 O(1) | style recalc 成本下降；且不再依赖 `:has()` 引擎优化 | **依赖 P0-a**——` :has()` 的成本主要是被链路一的 DOM 翻动喂出来的，先止源再动选择器；改后需双主题目检行色 | styles.js 中 `:has(` 出现次数 9 → 0；§2.1 同口径下样式相关 LoAF 下降 |
| **P2** | `folderStatusOf` 预聚合（statusMap 变化时一次 O(文件×深度) 建 `Map<目录, 字母>`，查询 O(1)，`body.js:709-721`）；stats 遍历去 realpath（`stats.js:25`）；`markIgnored` 在 `refresh()` 时合批为一次 check-ignore（`workspace-store.js:124`） | §3.4 | 大仓库边际收益 | 均为局部纯函数改动，风险低 | 各自单测 + lab 对应场景读数不劣化 |
| **P2-仪器** | 观测补盲：`perf.profiler(ExplorerBody)` 包住 body（`index.js:108-112` 的 slot 注册处），把渲染耗时纳入 `report()`；E0 的复测脚本进 `lab/` | §1 仪器盲区；α 册 §10.6.5「每个新植入包强制校 4 项」的延续 | 下一轮优化有渲染路径的前后对比数据，不再靠手测 | Profiler 只测 render+commit，DOM/paint 仍靠 E0 的 MutationObserver | 启用页 `report()` 出现 `nano:nano-explorer-extra:root` 的 profiler 样本 |

---

## §5 执行台账（E0–E11）

> 纪律对齐 α 册 §10.7.4：**P4 无点名即越界**。本轮的点名依据分两类——宿主侧条目（E4/E5）直接服务 α 册 D1 候选表 #1（`hostSpan.git-status` 3×10791.5 ms，全仓最高）；浏览器侧条目的证据来自 §2 的可复跑实测，**E0 先把这三个手测探针固化成 `lab/diagnose-render.mjs` 并写入基线**，使 E1–E3/E7 每项改动有 before/after 判据，之后才动产品代码。E1 与 E3 的依赖关系见 P0-a 风险栏。

| 编号 | 证据来源 | 具体动作 | 落点 | 验收证据（可检验） | 前置 | 状态 |
|---|---|---|---|---|---|---|
| **E0** | §2 全部 | 把三个手测探针固化成 `lab/diagnose-render.mjs`：① 可见 pane 过滤 + MutationObserver 空闲翻动计数（批次/挂载/卸载/属性 patch 四个计数器）；② fiber 组件身份跨 tick 检查；③ resource timing 按 `/nano-explorer-extra/` 路由分桶（次数 × 单次耗时）。先跑一次写入基线 `lab/out/render-baseline.json` | `lab/`（新建脚本，不改产品） | 脚本无头可跑、输出含 §2.1/§2.3 同口径数字；基线入库 | — | 未开始 |
| **E1** | §2.1 §2.2 | 冻结 accessory 组件身份：`body.js:723-741` 的 api 全部访问器经 `apiRef` 转发，`useMemo` 依赖清空，`createAccessory` 每 pane 一次 | `body.js`、`accessory.js` | E0①：空闲 remount 3 批×38 → **0**；touch 一个文件后字母为属性 patch 而非重挂；四插件 lab 全场景退出码 0 | E0 | 未开始 |
| **E2** | §2.1 §2.3 | `workspace-store.js:187-198` `refreshGit` 内容比对，相同跳过 `commit` 与 `:196` 的每目录重查（epoch 照常递增） | `workspace-store.js` | E0①批次 0 + E0③ scoped 请求 0（干净仓库静置 40 s）；真改动仍全量刷新 | E0 | 未开始 |
| **E3** | §3.2 | `entries` useMemo（**依赖含 `statusMap`**）+ `onToggle`/`onOpen` useCallback + `expanded` memo | `body.js:751-762`、`:773-789`、`:201` | 右键开菜单 / 弹 toast 时 FileTree 不重绘（Profiler actualDuration 下降）；状态字母仍随真变化更新 | E1（同提交或先行；entries 依赖漏 `statusMap` 才会「状态更新丢失」——见 P0-a 风险栏） | 未开始 |
| **E4** | §2.3；D1 #1 | `readScopedStatus`：rev-parse + scoped status 两进程，`{root, files}` 返回；`routes.js:251-254` scoped 分支改走它 | `git.js`、`routes.js` | E0③ scoped 单次 <100 ms（本测试床 474 ms 基线）；lab `files-expand` 场景 `hostSpan.git-status` 下降；展开目录字母行为不变 | E0 | 未开始 |
| **E5** | §3.3；D1 #1 | `readStatus` 加 `detail` 开关：轮询 = rev-parse+status+stash；抽屉打开（`openDrawer`，`body.js:232-237`）带 `detail=1` 跑 branches/history/worktrees/remote | `git.js`、`routes.js`、`body.js`、`workspace-store.js` | 干净仓库整仓轮询单次较 §2.3 基线（~400 ms）明显下降；抽屉打开后提交图/分支列表/远端分歧内容不变 | E4 | 未开始 |
| **E6** | §3.3 | 轮询退避 15→30→60 s + `document.hidden` 暂停 + 交互复位；AGENTS.md 记新鲜度语义 | `body.js:23`、`:248-260`、`AGENTS.md` | 静置 2 min tick ≤5（基线 8）；后台标签页 0 tick；可见性恢复后立即一 tick | E2 | 未开始 |
| **E7** | §3.4 | `rowTriggerProps` 加 `data-nxe-status`/`data-nxe-ignored`，`styles.js:229-237`/`:336-337` 的 9 条 `:has()` 改直接属性选择器；双主题目检行色（含 ignored 灰、远端箭头、staged 透明度） | `body.js:656-697`、`styles.js` | `grep -c ':has(' styles.js` → 0；E0① 同口径样式相关 LoAF 下降；§2.1 场景行色逐项与改前截图一致 | E1 | 未开始 |
| **E8** | §3.4 | `folderStatusOf` 预聚合：statusMap 变化时一次构建 `Map<目录, 字母>` | `body.js:709-721` | 单测（多级目录最强状态）；大目录树 lab 读数不劣化 | E3 | 未开始 |
| **E9** | §3.4 | stats 遍历跳过非符号链接子目录的 `fs.resolve` | `stats.js:25`、`:43` | 单测（含符号链接目录仍 resolve）；α 册 lab `stats` 场景读数不劣化 | — | 未开始 |
| **E10** | §3.4 | `refresh()` 时把全部展开目录的 ignored 询问合批为一次 check-ignore | `workspace-store.js:124`、`routes.js:373-382` | E0③：`/ignored` 请求次数 = 1/refresh（基线 = 展开目录数） | — | 未开始 |
| **E11** | §1 | `perf.profiler(ExplorerBody)` 包 body slot 注册；DNPR 无需改（`profiler()` 已存在） | `index.js:108-112` | 启用页 `report()` 出现 profiler 样本；E1/E3 前后 actualDuration 可比 | E0 | 未开始 |

**建议执行顺序**：E0 → E1+E3（一个提交，互为依赖）→ E2 → E4 → E5 → E7 → E6 → E8/E9/E10/E11（择机）。每项合入前跑 E0 同口径复测 + 四插件 lab 全场景（`node lab/run.mjs --scenario all --arm on`）退出码 0。

---

## §6 不建议做的事

1. **不建议把 `presentationP95` 71.6 ms 记到 NDEE 头上。** 它是页级指标（spec §5.1 禁止抄进插件行），本轮证明的是「NDEE 在空闲时制造了**可测量、可复跑**的无谓 DOM 翻动」——这是它自己的账，不背整页的锅。E1/E3 的验收用 E0 的口径，不用 INP。
2. **不建议在 E1 落地前先动 CSS。** `:has()` 的成本主要是被链路一的 DOM 翻动喂出来的；先止源（E1/E2），E7 的收益才可测。
3. **不建议直接调大 `POLL_GIT_MS`。** 那是改产品语义换数字。正确路径是 E2（内容比对，零新鲜度损失）+ E6（退避，宿主 fs.watch 已保证问到即新鲜）。
4. **不建议拿本轮单样本读数下产品结论。** ~400 ms/次是本测试床小样本（n=2）；宿主侧改动的合法依据是 α 册 D1 表的 `hostSpan.git-status` 真机点名（3×10791.5 ms），本轮实测只负责把「为什么贵」拆到 file:line。

---

## §7 附带观察与诚实边界

- **§2.4 的 30 s/~980 ms LoAF** 不属于 NDEE（节奏不重合），未入台账；若业主体感「页面偶尔卡一秒」，优先查它。
- 本轮实测样本小（38 行、2 展开目录、干净仓库、n=2–3 批次），但**机制性结论不依赖样本量**：组件身份漂移是 `body.js:723` + `accessory.js:16` 的代码结构决定的必然行为，实测只是确认；行数越多（`listingMaxEntries` 上限 2000/级，`entry.js:52`）放大越多。
- 本册**没有改动任何产品代码**；`/tmp/nxe-perf/measurements-2026-11-11.md` 为原始记录副本（易失），全部数字已嵌入本册 §2。
- TaskSpace `nxe-perf-verify-1111`（id 42）保留：E0 落地前，修复验证直接复用其页面与同口径探针。

---

## §8 复跑方法（E0 落地前的手工口径）

1. ego-browser `taskSpace("nxe-perf-verify-1111")` → `page("p1")` → `https://dsh-dev.local/`，选 dsh-plugins 会话，文件页展开 2 个目录（≥38 行）。
2. **探针一（DOM 翻动）**：`page.evaluate` 内按可见性过滤 `[data-nxe]`（排除 `[hidden], [aria-hidden="true"]` 祖先）取其 `[data-nxe-tree]`；对既有 `.nxe-acc` 打 expando 标记后装 `MutationObserver({childList, subtree, attributes})`，Node 侧 `waitForTimeout(38000)` 后读计数器（批次间隔应 ≈15 s；判据看 accAdd/accRem 对 accAttr 的比值）。
3. **探针二（fiber 身份）**：取 `.nxe-acc` 的 `__reactFiber$*`，向上找到首个 `typeof type === 'function'` 的节点，跨 17 s 比较函数身份。
4. **探针三（请求扇出）**：`performance.clearResourceTimings()` → 静置 33 s → 按 `/nano-explorer-extra/` 前缀分桶（区分 `path=`/`only=` 参数）。
5. 陷阱记录：`document.querySelector('[data-nxe-tree]')` 会命中**隐藏 pane**（keepMounted 每会话一个），其零翻动是「隐藏 pane 不轮询」的正确行为，不是修复证据（本轮首轮两次采样因此作废）。

> 一句话收口：**α 册证明了「测得到的 NDEE」很便宜；β 册实测了「测不到的 NDEE」——每 15 秒把整棵树的 accessory 拆了重建、每个展开目录跑一遍 9 进程 Git 全套电池，而数据一个字都没变。E0 先把这两件事变成可复跑判据，E1–E7 再逐项拆弹，每项带 before/after 退出码。**
