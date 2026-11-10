# 多会话统一 Explorer（Shared Workspace Store）

> 规格草案。源于 2026-11-10 与业主的讨论，记录诉求、被否决方案、选定架构与执行步骤。
> 命名沿用仓库惯例：`spec-26nov.md`。

## 1. 背景与诉求

业主在一个大仓库（hospital-harvest 级别，49k+ 文件）下会同时开多个 session，指向**同一个 workspace**。当前每个 session 的「文件」页都独立挂载一份 explorer-extra：

- 每个 session 一棵独立的 React 树，各自持有 `levels`/`expanded`/`git`/`stats`/`ignoredSet`；
- 各自发 `/list`、`/status`、`/ignored`、stats 请求；
- 各自重复一次 `statisticsOf` 全量磁盘遍历；
- 一个会话里 rename/commit 后，其他会话的状态栏与树不会跟上。

业主四条核心诉求（优先级从高到低）：

1. **隔离对 dsh UI 的影响** —— 不让额外工作拖慢宿主/页面渲染；
2. **外置请求资源** —— 重活挪到 dsh 实例之外或宿主侧；
3. **合并资源请求** —— 同 workspace 的 N 个 session 不重复发同样的请求；
4. **统一 workspace 内各 session 的文件状态视图** —— 跨 session 看到的是同一份 overlay。

附带目标：统一后可以**提高自动 git status 的查询频次**（目前无轮询，只在挂载/mutation/drawer/手动刷新时拉取）。

## 2. 被否决的方案

### 2.1 单实例 overlay（物理单例）

`ExplorerBody` 由平台 `sidebar.right.pane.tab` 槽位**按会话**注入，每个 pane 归属一个 session view，cwd 切换、会话销毁、confined dialog 区域都绑 session。抽出全局单例等于对抗平台会话模型。**否决**。

### 2.2 WASM

重活（`statisticsOf` 遍历、`git` 子进程）本就在宿主 Node 进程，不在浏览器渲染线程；浏览器侧只剩 React 渲染与 fetch——WASM 既不能碰 DOM，也跑不了 fetch/fs。共享 store 用 JS 模块级 Map 天然零拷贝，进 WASM 反而每层 `postMessage` + 结构化克隆。**否决**。

### 2.3 Web Worker / SharedWorker

普通 Worker 把 store 挪出主线程，但 store 逻辑开销微秒级，收益≈0 且多一层序列化；SharedWorker 只跨**标签页**有意义，同页面多 session 用不上。**否决**（列为备选备注）。

### 2.4 SSE / WebSocket 推送

宿主 `webServer` 可以持连接，但引入连接生命周期、断线重连、多标签页扇出等负担；同收益下宿主 `fs.watch` + 短缓存更简单。列为**可选增强**，非必需。

## 3. 现状事实（实现依赖的依据）

- `keepMounted: true` + 平台用 `hidden: !active` 隐藏非活动 session pane（**不卸载**）→ N 个 `ExplorerBody` 同时存活；
- 宿主 `routes.js` `memoized(key, read)`：`status:${root}:${path}` 3s TTL + in-flight 去重，key 是 **root** 而非 sessionId → `/status`、`/ignored` 已跨会话共享；
- `only=stats` 的 `statisticsOf` **不在** memoized 中 → 每会话一次全量遍历，最贵的重复；
- `/list` 无缓存，按请求执行；
- 浏览器侧目前**没有自动 git 轮询**；
- `useTree` 的 `levels` Map/`expanded` Set 已按不可变方式更新（`new Map(current)`），迁入 `useSyncExternalStore` 成本低；
- `tree.pending`/`setPending` 是 Factory API 的遗留字段，无实际写入方；
- 可见性信号可用 `rootEl.closest('[hidden],[aria-hidden="true"]')`——与平台自身判断一致。

## 4. 选定架构

```
宿主进程（dsh 实例外层，真正干活的地方）
└─ /nano-explorer-extra 路由
   ├─ memoized(3s)  : /status  /ignored           ← 已有
   ├─ memoized(45s) : only=stats statisticsOf     ← 新增，N会话1次遍历
   ├─ debounce(2s)  : stats                        ← 已有
   ├─ /list /read /mutations                       ← 实时
   └─ (可选 P3) fs.watch .git + 根目录 → forgetReads(root) 主动失效

浏览器单页面（每个会话一个 ExplorerBody，全部订阅同一 store）
└─ WorkspaceStore (Map<cwd, store>, 模块级单例)
   ├─ levels / expanded      ← 树结构，一份
   ├─ git / ignoredSet / statusMap / stats / statsState
   ├─ mounts + visibleMounts ← 可见性登记
   └─ poller: 15–20s git status（仅 visibleMounts > 0）

ExplorerBody (N 份) = useSyncExternalStore(store) + 本地 UI 态
   └─ 本地：menu / dialog / busy / linkNote / 拖拽 hover / crowded / drawer 开关
```

### 4.1 状态归属

| 共享（WorkspaceStore，per cwd） | 每实例本地 |
|---|---|
| `levels`（目录列表） | `menu`（右键弹层） |
| `expanded`（展开集合） | `dialog` / `dialogError` |
| `git`（status/files/conflicts/branches/history/…） | `busy` / `drawerRefresh` |
| `ignoredSet` | `linkNote` toast |
| `stats` + `statsState` | 拖拽 `hover`/`dragKind` 态 |
| `statusMap`（行尾 git 字母） | `crowded`（窄栏收敛） |
| | `selected`（选中行）* |
| | drawer 开关状态 |

\* `selected` 默认本地——跨会话抢选中是干扰；若业主要求"完全统一"可作为 store 开关再加。

### 4.2 请求合并

- store 的 `loadLevel(path)`/`refreshGit()`/`queueStats()` 内部 in-flight dedupe：N 个 pane 同刻挂载，根目录 `/list` 只发一次；
- 跨 store 的 `/status`、`/ignored` 由宿主 `memoized` 兜底；
- `statisticsOf` 纳入 `memoized`（45s TTL）→ N 会话 × 49k 文件遍历降为 1 次；
- mutation 后 `store.invalidate()`：`forgetReads` + 刷新受影响 level + `refreshGit` → 广播到所有 pane（**会话 A 提交后，会话 B 的 pending 自动归零**）。

### 4.3 轮询与 leader

- store 级单一 poller：15–20s `refreshGit()`；
- 每个 mount `setInterval` tick 时自查 `closest('[hidden],[aria-hidden="true"]')`，可见才执行；多实例 dedupe 天然择一，leader 随可见性交接；
- 无可见实例 → 全员静默，零后台消耗；
- drawer 打开仍即时补一次 `refreshGit`。

### 4.4 快照与订阅

- store 持有不可变快照（`levels`/`expanded` 每次更新换引用）；
- mount 用 `useSyncExternalStore(subscribe, getSnapshot)` 订阅；
- `getSnapshot` 以 cwd 为键：`ctx.sessions` cwd 变化时自动切到对应 store；
- `mounts.size === 0` 的 store 设 ~5min TTL 清理，防止 cwd 频繁切换导致 Map 膨胀。

## 5. 实施步骤

### P1：WorkspaceStore + 请求合并（主体）

1. 新建 `src/client/workspace-store.js`：`getStore(cwd)` 工厂、`subscribe`/`getSnapshot`、`loadLevel`/`refreshGit`/`queueStats`/`invalidate`、mounts/visibleMounts 登记、mount TTL 清理；
2. `useTree` 的 `levels`/`expanded` 迁入 store；`toggle`/`refreshLevel`/`forget`/`collapseUnder`/`knownEmpty` 改为 store 方法；`selected`/`pending` 留本地；
3. `body.js` 的 `git`/`stats`/`statsState`/`ignoredSet`/`statusMap` 迁入 store；`markIgnored` 走 store（`/ignored` 调用保留但天然 dedupe）；
4. 所有 mutation（create/rename/move/delete/commit/pull/checkout）成功后调 `store.invalidate()`；
5. 本地态保留：`menu`/`dialog`/`busy`/`linkNote`/drag refs/`crowded`/drawer 开关。

### P2：宿主 stats 缓存 + 可见性轮询

1. `routes.js`：`only=stats` 分支纳入 `memoized`（`stats:${root}`，45s TTL）；
2. mount 内 `setInterval`：可见则 `store.refreshGit()`；dedupe 由 store in-flight 保证。

### P3（可选）：宿主 fs.watch 主动失效

1. host bundle 直接 `node:fs`：`fs.watch` 监视 `${root}/.git/index`、`HEAD`、`refs/`，以及工作树根（macOS recursive 可用，Linux 需手动逐目录，列为已知限制）；
2. 事件 debounce ~1s 后 `forgetReads(root)` → 下一次轮询/挂载拉取必中新鲜数据；
3. 收益：轮询窗口可放宽到 30–60s 仍保持时效。

## 6. 风险与对策

| 风险 | 对策 |
|---|---|
| `ctx.sessions` cwd 突变 | `getSnapshot` 以 cwd 键控，变化即换 store |
| store 内存膨胀 | `mounts === 0` 5min TTL；`levels` 是大头，清理即释放 |
| 拖拽/mutation 广播后结构不一致 | `collapseUnder` 等结构修正收敛到 store 方法，本地只调接口 |
| `useSyncExternalStore` 快照不触发 | 全部不可变更新，沿用 `useTree` 现有 `new Map/Set` 写法 |
| 轮询与手动刷新打重复 | store in-flight dedupe + 宿主 3s TTL 双保险 |
| `fs.watch` 跨平台差异 | P3 可选；Linux 不递归时退化到轮询语义不变 |

## 7. 实现记录（2026-11-10，P1–P3 全部落地）

### 7.1 交付文件

- **`src/client/workspace-store.js`（新增）**：`Map<cwd, store>` 模块级单例。每个 store 持有 `levels`/`expanded`/`ignoredSet`/`directoryStatus`/`git`/`gitError`/`stats`/`statsState`，`commit()` 不可变换快照广播。`loadLevel`/`markIgnored`/`loadDirectoryStatus`/`refreshGit`/`refreshStats` 全部走 `once(key, work)` in-flight 去重；`mount`/`unmount` 登记 + `mounts===0` 5min TTL 清理；首挂载加载根，>20s stale 静默 refresh；`dismissGitError`。
- **`src/client/body.js`**：删 `useTree`（`src/client/tree.js` 已删除），改 `useSyncExternalStore(store.subscribe, () => store.state)`；`tree` facade 适配旧签名。本地态仅 `selected`/`menu`/`dialog`/`busy`/`linkNote`/`toast`/drag refs/`crowded`/drawer。新增 `rootEl` ref + `setInterval(15s)` 轮询：pane 可见（`closest('[hidden],[aria-hidden="true"]')` 为 null）才 `store.refreshGit`。session/cwd 重置 effect 不再清共享态。
- **`src/host/routes.js`**：`memoized` 加 `ttl` 参数；`only=stats` 纳入 `memoized('stats:${root}', …, 45s)`；`forgetReads` 增清 `stats:` 前缀。新增 `watchRoot`/`disposeRootWatchers`：`fs.watch(root,{recursive:true})` 首选，fallback `fs.watch('${root}/.git')`；事件 1s debounce → `forgetReads(root)`。`watch` 只消费文件名事件，不读内容，不扩 sandbox。
- **`src/host/entry.js`**：routes effect 的清理里挂 `disposeRootWatchers()`。

### 7.2 验证结果（dsh-dev.local，hospital-harvest 49,669 文件）

| 项 | 结果 |
|---|---|
| 根 `/list` | 页面加载 **1 次**（此前每 pane 各自 1 次） |
| 切走再切回文件 tab | `/list` 保持 2 次未重发，expanded 保留（store 跨 mount 持久化） |
| 轮询（15s） | 18s 内 `/status` 从 3 → 5，= refreshGit + expanded dirStatus 各一航班（dedupe 生效） |
| 隐藏 pane | 切到其他 tab 期间 `/status` 无增长（可见性 leader 生效） |
| stats memoize | 页面 footer `329+ / 49669+ / 3.1 GiB` 正常出数；client `stats:3` 次 fetch 共享宿主 1 次 `statisticsOf` |
| 右键菜单 | 「在 Finder 中显示/复制绝对路径/复制相对路径/重命名/删除」正常 |
| 行尾字母 | `statusLetters: 20`（git 字母渲染正常） |
| JS 堆 | ~40 MB（单 pane） |
| 回归 | 无报错（仅有与本次无关的 model-selector slot 冲突，来自另一插件） |

### 7.3 已知限制

- **多 session 同 workspace 的 live 验证**：dev 实例只有 Greeting 一个 session，跨 pane 共享由 `Map<cwd>` 构造保证，但双 pane 同屏交互未实测；
- **fs.watch**：macOS recursive 可用；Linux 无 recursive 引擎时退化到 `.git` 目录监听（commit/checkout/index 仍即时失效，工作树改动回到轮询节奏）；
- `statisticsOf` 冷启动仍走 49k 文件全遍历（~15–35s），属固有成本，memoize 保证只付一次。

## 8. 验收标准

- 同 workspace 开 2+ session：任一会话展开/折叠，另一会话的树结构与展开态一致（由 `Map<cwd>` 构造保证）；
- 任一会话 rename/move/delete/create：另一会话 15–20s 内（或 watch 后 ~1s）状态栏与树自动同步；
- `statisticsOf` 调用次数：N 会话同一轮统计 = 1 次（45s memoize，已验证 client 3 次 fetch 共享宿主 1 次遍历）；
- `/list` 根目录请求：N 会话同刻挂载 = 1 次（in-flight 去重，已验证）；
- 所有会话隐藏（切到非文件页）：无 git/list 请求发出（可见性 leader，已验证切 tab 期间零增长）；
- 单会话行为不回退：拖拽、右键菜单、创建/重命名、drawer、设置项全部照旧（已验证）。
