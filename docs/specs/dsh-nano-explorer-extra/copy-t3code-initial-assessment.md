# [DNEE] 对标 T3 Code 与竞品生态的演进初评（Initial Assessment）

> **日期**：2026-11-21
> **基线 `HEAD`**：`30ca969`（`30ca969c003e2e9a16e4c365bbabd754bbe453a6`，`merge(dnee): 文件树粘贴剪贴板图片`）
> **评估范围**：`dsh-nano-explorer-extra`（`[DNEE]`）在当前 `HEAD` 下的工程与产品状态、T3 Code 社区口碑与视觉拆解、Herdr / `herdr-core` 与 Orca 横向对比，以及高价值演进路线台账
> **留档产物路径**：[`../../../.temp/copy-t3code/`](../../../.temp/copy-t3code/)（含 11 张实机截图/对比图与 3 份原始检索 JSON）
> **状态**：`initial-assessment`（仅供 `[业主]` 审阅与排期裁决；未修改任何源码或公共契约）

---

## 1. 当前 `[DNEE]` 在 `HEAD`（`30ca969`）下的详细状态分析

### 1.1 身份与契约基线

| 维度 | 当前真源值（核对自 `package.json` / `AGENTS.md` / `cordis.patch.yml`） |
|---|---|
| **包名 / 插件 ID** | `dsh-nano-explorer-extra` / `nano-explorer-extra` |
| **版本 / 引擎范围** | `0.3.0` / `engines.dsh`: `>=0.2.2-rc.1 <0.3.0` |
| **运行平台** | 仅 `web`（通过 `sidebarRightTabs` 以 `priority: 'extension'`、`keepMounted: true` 接管 `files` 槽位） |
| **宿主 `inject`（8 项）** | `fs`、`sessions`、`webServer`、`subprocess`、`sandbox`、`sandboxPolicy`、`connection`、`sessionPersistence` |
| **浏览器 `inject`（6+1 项）** | 代码 [`src/client/index.js`](../../../dsh-nano-explorer-extra/src/client/index.js#L14) 声明 `slots`、`locale`、`sidebarRightTabs`、`sidebarRight`、`sessions`、`theme`（按需软读取 `contextMenus`、`nanoTerminal`、`nanoNotepad`）；`package.json` `dsh.client.inject` 声明 7 个 `@deepseek-ai/*` 模块 |
| **Patch 调整** | [`cordis.patch.yml`](../../../dsh-nano-explorer-extra/cordis.patch.yml) 以包名注册 bundle，并将宿主 `ui-context-menu` 的 `resolutionTimeoutMs` 从默认 `1000` 扩到 `4000`，防止原生「用应用打开」探测器超时报错 |
| **浏览器偏好键** | `localStorage['dsh-nano-explorer-extra:prefs.v2']`（重装保留；`v1` 仅作一次性迁移且刻意丢弃旧点击设置） |

### 1.2 代码规模、构建产物与测试验证

- **源码与测试规模（共 9,145 行）**：
  - `src/host/`（8 个文件，**2,898 行**）：[`entry.js`](../../../dsh-nano-explorer-extra/src/host/entry.js)（77）、[`execution-world.js`](../../../dsh-nano-explorer-extra/src/host/execution-world.js)（39）、[`git.js`](../../../dsh-nano-explorer-extra/src/host/git.js)（1,210）、[`listing.js`](../../../dsh-nano-explorer-extra/src/host/listing.js)（135）、[`mutate.js`](../../../dsh-nano-explorer-extra/src/host/mutate.js)（421）、[`paste-image.js`](../../../dsh-nano-explorer-extra/src/host/paste-image.js)（98）、[`routes.js`](../../../dsh-nano-explorer-extra/src/host/routes.js)（794）、[`stats.js`](../../../dsh-nano-explorer-extra/src/host/stats.js)（124）。
  - `src/client/`（19 个文件，**5,414 行**）：以 [`body.js`](../../../dsh-nano-explorer-extra/src/client/body.js)（1,399）、[`drawers.js`](../../../dsh-nano-explorer-extra/src/client/drawers.js)（1,118）、[`styles.js`](../../../dsh-nano-explorer-extra/src/client/styles.js)（603）、[`i18n.js`](../../../dsh-nano-explorer-extra/src/client/i18n.js)（520）、[`workspace-store.js`](../../../dsh-nano-explorer-extra/src/client/workspace-store.js)（395）为核心。
  - `test/`（9 个文件，**833 行**）：覆盖 bundle smoke、diff/numstat/history 解析、真实 Cordis 生命周期路由注册与销毁、realpath/`.git` 写入围栏、NUE-1117 UI 规则正负对照、右侧工作台探测、图片粘贴、以及远端执行世界隔离。
- **构建与路由现状**：
  - 产物 [`lib/host.js`](../../../dsh-nano-explorer-extra/lib/host.js)（120,679 B）、[`lib/client.js`](../../../dsh-nano-explorer-extra/lib/client.js)（199,368 B）、[`lib/bindings.js`](../../../dsh-nano-explorer-extra/lib/bindings.js)（20 条烤入路由表，经 `dsh-interface/host` `createWebRegistrar` + `dsh-host-route-guard` 注册，`JsonOutcome` 统一编解码）。
  - 在当前 `HEAD`（`30ca969`）下运行 `npm --prefix dsh-nano-explorer-extra test`：**46 / 46 用例全部通过**（0 失败、0 跳过）。

### 1.3 七阶段演进沿革（2026-11-09 → 2026-11-20，114 次提交）

1. **起步与基线接管（11-09，`778de3c` → `3f5a4f0`）**：上线文件树、Git 字母/目录染色、`.gitignore` 专用墨色、统计底栏、内联创建/重命名/删除、软链接外指提示、底栏拆分「仓库卡片 + 本地工作区」。
2. **多会话共享与性能治理（11-10 → 11-12，`531f03c` → `f2950ad`）**：按 [`spec-26nov.md`](../../../docs/specs/dsh-nano-explorer-extra/spec-26nov.md) 上线 `WorkspaceStore`（`Map<cwd, store>` + `useSyncExternalStore` + in-flight 去重 + 15s 可见性 leader 轮询 + 宿主 `fs.watch`）；`stats` 改为非阻塞后台采样与 30 分钟长缓存；目录展开改走 scoped status（后续 `931650e` 并行补全仓 `-uno` 保住跨目录 `R` 重命名）；接入 `dsh-performance-review`。
3. **安全围栏与跨平台加固（11-11 → 11-14，`bd4d6ad` → `abec62e`）**：全路由接入 `dsh-host-route-guard`（Host/Origin 围栏 + 405）；`mutate.js` 落地 fail-closed realpath 围栏与 `.git` 段硬拒；`dnls-win-bringup` 补齐 Windows `node:fs/promises` 与盘符/UNC 绝对路径校验。
4. **Git 完备化与跨插件协作（11-12 → 11-15，`c0a0be6` → `4a212d9`）**：补齐多车道彩色提交图、`/fetch`、`/push`、`/remote`、`/author`、仓库级 `/ssh-key`、幽灵行合成（`syncGhosts`）；通过 Cordis 惰性 `ctx.get(...)` 接入 `[DNT]`（`nanoTerminal.openLocal`）与 `[DNN]`（`nanoNotepad.import`），遵守「不得侧载」。
5. **契约与可观测收口（11-15 → 11-17，`1653ae3` → `2be6d4a`）**：CF1115 统一 `createWebRegistrar` + 单一 `JsonOutcome`；PRE-1116 接入 [`src/perf/declaration.json`](../../../dsh-nano-explorer-extra/src/perf/declaration.json) 声明式观测。
6. **UI 宿主优先迁移（11-17，NUE-1117 Phase 5，`42878d4` → `7eecf58`）**：彻底删除宿主行 DOM 嫁接与改写宿主 portal 的受限层；切换至宿主 `SegmentedControl`、`Menu`、`ThemeScope` 与 `dsh-nano-ui` `NanoWindowDialog`；按 `[业主]` 要求保留 Git 文件名/文件夹染色并用 `nue-migration.test.mjs` 建立静态回归守卫；新增 [`pane-right.js`](../../../dsh-nano-explorer-extra/src/client/pane-right.js) 支持「在右侧工作台打开」。
7. **近期高频打磨与远端准备（11-17 → 11-20，`9dd37d9` → `30ca969`）**：提交图 HEAD 置顶/点击滑出文件列表与增删行/复制哈希、待提交卡片内联差异预览、接入 `H-EXEC`（[`execution-world.js`](../../../dsh-nano-explorer-extra/src/host/execution-world.js)，对 `remote` / `unbound-remote` 执行 fail-closed）、以及树焦点 `Cmd/Ctrl+V` 剪贴板位图直贴入目录（`cba1c35`）。

### 1.4 当前 UI 功能面逐项盘点

| UI 区域 | 当前已实现能力 | 当前明显边界 / 缺口 |
|---|---|---|
| **顶栏（Header）** | 显示工作区根路径；新建文件、新建文件夹、重命名（跟随选中）、`RevealButton`（`/open-in-app/apps` 分裂按钮）、整仓刷新 | 无「仅看有改动文件」开关、无快捷文件名过滤框、无项目脚本快捷入口 |
| **文件树主体** | 跨会话共享树与展开态；Git 字母（`M/A/D/R/U/?`）与文件夹状态着色；幽灵行（`U`/`D`）；外指/断链软链接提示；9 项右键菜单（右侧工作台打开、Finder 显示、终端打开、复制绝对/相对路径、复制到 `[DNN]`、查看差异、重命名、删除）；拖拽移动；`Cmd/Ctrl+V` 贴图 | 49k 大仓下找改动文件需逐级找颜色或盖住树打开抽屉；右键「查看差异」强依赖实验性 `client-ui-forge`，未启用时直接报错而非优雅降级 |
| **底栏（[`StatusBar`](../../../dsh-nano-explorer-extra/src/client/statusbar.js)）** | 左：分支按钮（含 `*` 脏态、`!` 冲突）、只读 stash 徽章、提交按钮（`↓↑` 同步数 + pending 徽章）；右：后台采样目录/文件/体积（窄栏自收敛）+ 设置齿轮 | 非 Git 目录仅静态灰字「未初始化 Git 仓库」，不可点击初始化；Stash 徽章只读不可点；无关联 PR / CI 状态指示 |
| **分支抽屉（[`BranchDrawer`](../../../dsh-nano-explorer-extra/src/client/drawers.js#L427)）** | 多车道彩色提交图（亮=未推、暗=已推；点开滑出改动文件数与 `+N -M`、可复制哈希）；分支搜索；固定高分页（本地「已检出工作树 / 仅本地 ref」vs 远端「`refs/remotes` 快照」与相对默认分支领先/落后）；只读工作树列表；刷新（`fetch --all --prune`）、快进拉取、推送/发布；仓库设置三分页（远端/署名/SSH） | **历史提交列表里的文件不可点击看 Diff**；**不能在 UI 新建分支**；**工作树列表完全只读**（不能新建 worktree、在终端打开指定 worktree、复制路径或安全清理）；无 PR 创建/查看闭环 |
| **提交抽屉（[`CommitDrawer`](../../../dsh-nano-explorer-extra/src/client/drawers.js#L962)）** | 提交说明框（`Ctrl+Enter`）、All/已暂存/未暂存/未跟踪/冲突 `SegmentedControl` 筛选、冲突直达、点击单文件看相对 `HEAD` 内联 diff | **强制 `git add --all` 提交**，无法只提交已暂存；**无法单文件 Stage/Unstage**；**无法单文件 Discard 丢弃误改**；**无法 Stash 暂存/恢复**；**无 Branch vs Base 整支对比**；无法逐文件勾选「已审阅」 |
| **设置卡（[`SettingsDialog`](../../../dsh-nano-explorer-extra/src/client/settings.js)）** | 10 个布尔开关平铺一列（单击/双击预览、行尾打开按钮、忽略角标、Git 状态、系统文件、状态栏、体积排除 `.git`/忽略/跟随软链接） | 未按职责分组；缺少提交默认策略、自动 fetch 节奏、Diff 忽略空白、默认对比基线覆写等开发者高频选项 |

### 1.5 顺带识别的工程小债（与能力升级无关、建议顺手清理）

1. **远端执行世界消费未实装**：[`routes.js`](../../../dsh-nano-explorer-extra/src/host/routes.js#L101-L106) 对 `world.kind === 'remote'` 主动 fail-closed 拒绝，属 `[DNCS]` 后续联动预留，不可擅自放开。
2. **`perf/declaration.json` 合同滞后 2 条**：[`src/perf/declaration.json`](../../../dsh-nano-explorer-extra/src/perf/declaration.json#L34-L53) 仍为 18 条，漏列 `dnee.diff` 与 `dnee.paste-image`（[`lib/bindings.js`](../../../dsh-nano-explorer-extra/lib/bindings.js) 与 [`security/feature-contract.json`](../../../security/feature-contract.json) 已是 20 条）。
3. **规格 README 与根 README 滞后**：[`docs/specs/dsh-nano-explorer-extra/README.md`](../../../docs/specs/dsh-nano-explorer-extra/README.md) 与仓根 [`README.md`](../../../README.md#L37) 仍写着 `0.1.1`、已删除的 `tree.js` 及「无本包单元测试」。
4. **未跟踪旧 tarball 残留**：`dsh-nano-explorer-extra/dsh-nano-explorer-extra-0.3.0.tgz`（11-19 16:32 生成）早于 11-20 合入的图片粘贴功能。

---

## 2. 什么是 T3 Code 及竞品深度对比（T3 Code vs Herdr / `herdr-core` vs Orca）

### 2.1 T3 Code 是什么？为什么口碑好？

**T3 Code**（[`pingdotgg/t3code`](https://github.com/pingdotgg/t3code)，MIT 开源，约 6.5 万–6.8 万 GitHub Stars，Theo Browne `@theo` 主导）定位为 **“The open-source control plane for coding agents”**（AI 编程 Agent 的开源本地优先控制面）。

- **核心理念（BYOS + Server/Client Control Plane）**：不转卖 Token、不绑定单一模型厂商，直接驱动用户本机已认证的 CLI / ACP Agent（Claude Code、Codex、Cursor、OpenCode、Antigravity、Kiro、Pi、Muse Code、fx 等）；Agent 运行在宿主 Server（本机或远端机器），Desktop / Web / iOS / Android 作为轻量同步窗口连入控制面（`npx t3 connect` 一条命令组网）。
- **四维口碑拆解**：
  1. **Development（开发流）**：支持同线程无缝切换 Agent/模型并交接上下文；按需开启隔离 **Git Worktree**（支持多仓库项目、子模块初始化与 `t3.json` 自定义 `worktreeLayout` 钩子）；每轮自动保留隐藏 `refs/t3/checkpoints/` 快照与精准归因（Diff 过滤掉 `pull/merge/rebase` 噪音）；明确划分设备偏好 vs 环境/项目级覆写；右上工作区卡提供 `Open in editor`、`+ Add project script`，非 Git 目录直接给 `Initialize Git`。
  2. **Deployment & Runtime（部署与预览）**：内置 `Browser` / `Terminal` / `Device`（移动端模拟器）/ 沙箱化 HTML 预览（支持 `Visual replies` 与 `MCP Apps`）；支持端口转发；支持 **Webhook 自动化**（如 GitHub PR/CI 回调唤醒 Agent 修复，含 HMAC 签名、去重与突发合并窗口）。
  3. **PR Management（PR 管理，社区口碑最强项）**：右上角聚合按钮 **`Commit, push & PR`** 一键直出（含 Draft PR、仓库习惯生成说明、合并可选剔除 Agent Co-Author）；App 内完整 PR 面板采用高密度 **`Summary | Timeline | Code`** 三页签，显式标出冲突预警、CI 门禁进度（如 `17 of 24 passing`）、`Squash` 主动作；支持 **Mark files as viewed**（与 GitHub 双向同步已读折叠）、**Watch PR**（2 分钟后台盯 CI/评论/冲突并唤醒 Agent）、**GitHub Stacks**（堆叠合入/变基）及多平台本机 CLI 复用（`gh`/`glab`/`fj`/`tea` 等）。
  4. **开发可视化（Visualization）**：Theo 公开反对占半屏的“2025 风格看板 slop”（2,901 Likes 热帖）。界面强调极高信噪比：Diff 顶部直切 **`Uncommitted` / `Branch vs origin/main` / `Turn N` / `Commits`**，会话流内嵌紧凑摘要条（`3 changed files +71 -2 [Open diff]`），侧栏按人类注意力分区（`Active / Working / Settled`，亦保留按项目分组的 `Boring Sidebar`）。
- **社区客观负评（重要避坑参考）**：
  - X 上 `@arjunkshah21`（309 Likes）指出其早先搜索缓存仅按条数上限而非字节数淘汰导致内存暴涨；`@AI大吉大利` 反馈封装层偶尔较原厂 CLI 慢；
  - Reddit 讨论指出外部终端启动的会话难以回流接管（Walled Garden 割裂），部分需要复杂交互确认的扩展会卡顿；
  - `@dasungta_zhang` 指出其子 Agent Swarm 编排在部分 ACP 适配上会出现权限错乱与幽灵 worker。

### 2.2 竞品横向对比：T3 Code vs Herdr / `herdr-core` vs Orca

依据本仓 [`context/herdr/README.md`](../../../context/herdr/README.md)、[`context/herdr/AGENTS.md`](../../../context/herdr/AGENTS.md)、[`context/herdr-core/README.md`](../../../context/herdr-core/README.md) 以及 X 社区实测长评（`@jilaiqian` 连续使用 Herdr → Orca → Herdr-app → T3 Code；`@x1fl_` 四轴对比；Orca 官方预览图），三者路线截然不同：

| 对比维度 | **T3 Code** (`pingdotgg/t3code`) | **Herdr / `herdr-core`** (本仓 `context/herdr*`) | **Orca** (`stablyai/orca`) |
|---|---|---|---|
| **定位隐喻** | **控制面 + 多端窗口**（Control Plane） | **Agent 运行时 + 鼠标优先 TUI 终端复用器** | **重型 Agent IDE 指挥中心**（Command Center） |
| **技术栈与开销** | TS/Electron + Web + Mobile（需持续防缓存/渲染膨胀） | **纯 Rust 单二进制无 Electron**；`herdr-core` (`hc`) 负责底层 PTY 与状态协议，极致轻量 | Electron 重型桌面工作台 |
| **核心交互底座** | 结构化 Chat UI + 多表面面板（Browser/Terminal/Diff/PR） | 原生 PTY 终端分屏，**不改写终端内 Agent 自身交互**；靠底栏缓冲区指纹 + **OSC 7501** 精准探测 `working / blocked / idle` | 多 PTY 分屏为主 + 日志解析 Chat 视图 |
| **多机与远程** | Server/WebSocket + `npx t3 connect` 隧道 + 移动端 App | `hc machine add` 原生 SSH 多机聚合 + **断线重连不丢运行中终端** + OpenRPC schema | 桌面为主，移动端仅作轻量查看伴侣 |
| **Git & Worktree 策略** | 默认保留现有分支工作流，**按需创建 Worktree**，支持多仓库与 `t3.json` 钩子 | 运行时不强绑 Git；社区需用 `herdr-mods` 自写 Git 图与 staged/unstaged 面板补足 | **强制每任务独立 Git Worktree**，深度隔离防踩踏 |
| **Diff / PR 闭环** | **极强**：Turn/Branch/Commit 多视角 Diff、`Commit, push & PR`、Draft PR、Mark as Viewed、Watch PR、Stack | `herdr-core` 刻意保持 UI 无关（`Core draws nothing`），无内置 PR/Diff 闭环；`herdr-app` 早期版本被评仍偏粗糙 | **较强**：侧栏 `All | Uncommitted` + `COMMITTED ON BRANCH`、直接调 `gh pr create` |
| **可视化与注意力** | 克制、围绕审阅与交付焦点组织；主动拒绝冗余看板 | 极简高密度状态标识（不抢屏幕），严格控制多 pane 乘法渲染开销（`AGENTS.md`） | 单屏塞入 Worktree 树 + 多终端 + 代码 + 浏览器 + Issue，信息密度极高但也容易引发压迫感（`@jilaiqian`: *"stresses me out"*） |
| **对 `[DNEE]` 的核心启示** | 学其 **Task-to-PR 闭环、多视角 Diff、已审阅折叠、分层设置与克制信噪比** | 学其 **零冗余渲染、Server/UI 边界纪律（不把运行时耦合进 UI）、按需拉取不拖慢宿主** | 学其 **`All | Uncommitted` + `COMMITTED ON BRANCH` 视图拆解**；**坚决警惕其“大而全挤压主工作区”的过载倾向** |

---

## 3. 联级检索成果、Reference 链接与留档产物索引

### 3.1 检索覆盖范围与透明度说明

- **X.com 深度检索（4 轮查询 + 焦距长帖与评论区展开）**：覆盖 `t3code` 与 `git` / `diff` / `PR` / `worktree` / `deploy` / `UI` / `checkpoint` 交叉讨论、Theo 官方发布帖及高赞竞品横评长帖，并提取原帖高清截图。
- **GitHub 官方文档与版本追踪**：直读 `pingdotgg/t3code` 仓库主页、文档总目录（`docs/README.md`）、`source-control.md`（27KB 全文）、`project-settings.md`（19KB 全文）、`multi-repo-projects.md`、`snap-shot.md`、`html-renders.md` 与 `Releases`（至 `0.1.12-nightly.20261121.5038`）。
- **Reddit 社区检索**：通过索引检索获得 `r/ClaudeAI`、`r/ClaudeCode`、`r/codex`、`r/ClaudeWorkflows` 社区对 T3 Code Worktree 隔离、Visual Diff Review、Task-to-PR Loop 与 Walled Garden / 封装延迟反馈的摘要交叉印证（注：使用浏览器直访 `reddit.com` 时触发未登录网络安全验证拦截页，遵守规则未做绕过，所有结论均标注来源口径）。
- **本地 `context/` 仓库一手核验**：读取 [`context/herdr/README.md`](../../../context/herdr/README.md)、[`context/herdr/AGENTS.md`](../../../context/herdr/AGENTS.md) 与 [`context/herdr-core/README.md`](../../../context/herdr-core/README.md)。

### 3.2 Reference 链接台账

| 来源平台 | 链接 / 标识 | 互动 / 权重 | 核心事实与启发 |
|---|---|---|---|
| **GitHub** | [`pingdotgg/t3code`](https://github.com/pingdotgg/t3code) | ~65k–68k ★ | 定位、BYOS、ACP 多 Agent 支持、Worktree/Diff/PR 一体化宣传与 Hero 图 |
| **GitHub Docs** | [`docs/user/source-control.md`](https://github.com/pingdotgg/t3code/blob/main/docs/user/source-control.md) | 官方一手真源 | Turn/Branch/Commit Diff、多仓库 picker、Draft PR、Mark files as viewed、Watch PR、Stack、多主机 CLI 复用 |
| **GitHub Docs** | [`docs/user/project-settings.md`](https://github.com/pingdotgg/t3code/blob/main/docs/user/project-settings.md) | 官方一手真源 | Device vs Environment vs Project Override 三层继承模型、Worktree 命名、Webhook 自动化规则 |
| **GitHub Docs** | [`docs/user/multi-repo-projects.md`](https://github.com/pingdotgg/t3code/blob/main/docs/user/multi-repo-projects.md) | 官方一手真源 | 多仓库项目、`t3.json` `worktreeLayout.create/remove` 钩子 |
| **GitHub Docs** | [`docs/user/html-renders.md`](https://github.com/pingdotgg/t3code/blob/main/docs/user/html-renders.md) / [`snap-shot.md`](https://github.com/pingdotgg/t3code/blob/main/docs/user/snap-shot.md) | 官方一手真源 | 沙箱 HTML 回复、MCP Apps、窗口无障碍截图（归属 `[DNK]`/宿主参考，不进 `[DNEE]`） |
| **GitHub Releases** | [`pingdotgg/t3code/releases`](https://github.com/pingdotgg/t3code/releases) | 2026-11-21 最新 | `v0.1.12-nightly.20261121.*` 连续迭代：多仓项目、Draft PR、PR 自动创建、稳态文件预览、端口转发 |
| **X.com** | [`@x1fl_` — T3 Code vs Orca](https://x.com/x1fl_/status/2123791422558195766) | 283 Likes / 32 RT | 精辟总结 Control-plane 模式 vs Agent IDE 模式四轴差异，及按需 Worktree vs 强制 Worktree |
| **X.com** | [`@jilaiqian` — Herdr/Orca/Herdr-app/T3 迁移录](https://x.com/jilaiqian/status/2119118276089245782) | 575 Likes / 54 RT | 一线开发者实测：“Orca 功能虽全但太粗糙让人焦虑，T3 Code 在刚好够用的功能集上极度打磨” |
| **X.com** | [`@theo` — 380+ changes 大更新](https://x.com/theo/status/2092455706582499815) | 1,403 Likes / 133 Replies | 发布 App 内 PR Review、`npx t3 connect`、OpenVSX 主题、长线程性能提升 93.8% |
| **X.com** | [`@theo` — 批判半屏看板 slop](https://x.com/theo/status/2122201652493230343) | 2,901 Likes / 107 RT | 阐明 T3 Code 克制高信息密度、拒绝花哨低效 UI 的产品观 |
| **X.com** | [`@theo` — App 内自改 UI](https://x.com/theo/status/2121455838414201200) | 5,251 Likes / 226 RT | 可扩展工作台传播爆点 |
| **X.com** | [`@theo` — T3 Code MCP & `delegate_task`](https://x.com/theo/status/2106123856759120317) | 2,192 Likes / 108 RT | 跨 Agent 调度与 limit 重置自动恢复 |
| **X.com** | [`@selzer25` — 实测口碑](https://x.com/selzer25/status/2112294710035509713) | 122 Likes | *"nothing is competing for my attention... the pull request flow is orgasmic"* |
| **X.com** | [`@asuka0x109` — Beta 完成度与注意力布局](https://x.com/asuka0x109/status/2119449421448622353) | 66 Likes | 拆解 `Active / Working / Settled` 布局、主题系统、Relay 远端接入与 `Initialize Git` 实图 |
| **X.com** | [`@0xAnto` — 仓内 Agent 协作纪律](https://x.com/0xAnto/status/2119316431275962756) | 293 Likes / 52 Replies | 分析 T3 Code 仓内让 Agent 高频提交而不崩盘的工程护栏 |
| **X.com** | [`@meow2149` — Codex vs T3 Code](https://x.com/meow2149/status/2123671563174314196) & [MCP Server](https://x.com/meow2149/status/2123622867971789059) | 50 / 35 Likes | 指出单 Agent 场景原生够用，多 Agent 协作与跨端控制才是 T3 Code 强项 |
| **X.com** | [`@indie_maker_fox` — 移动端与 PR](https://x.com/indie_maker_fox/status/2118968781431341324) | 47 Likes | 移动端看 Token、改完提交 PR 查看变更 |
| **X.com** | [`@arjunkshah21` — 内存缓存源码剖析](https://x.com/arjunkshah21/status/2120054098628162045) | 309 Likes | 警示缓存只限条数不限字节数会导致内存过高 |
| **X.com** | [`@chrisbbh` — 远端沙箱集成](https://x.com/chrisbbh/status/2108710275155361944) | 357 Likes | 云端 VM 替代本机 Worktree 减轻内存负担（呼应 `[DNEE]` 接 `[DNCS]` `H-EXEC` 的方向） |
| **X.com** | [`@jiangkoumo_` — ADE 底层双要素](https://x.com/jiangkoumo_/status/2115410853134819781) | 52 Likes | 指出新兴 ADE 底层本质都在解决 Git 隔离与执行状态可视化 |
| **Reddit** | `r/ClaudeAI` / `r/ClaudeCode` / `r/codex` / `r/ClaudeWorkflows` | 社区检索摘要 | 高频肯定 Worktree 隔离与 Task-to-PR 闭环；批评外部会话难导入（Walled Garden）与封装延迟 |
| **本地仓** | [`context/herdr/README.md`](../../../context/herdr/README.md) · [`AGENTS.md`](../../../context/herdr/AGENTS.md) · [`context/herdr-core/README.md`](../../../context/herdr-core/README.md) | 仓内一手真源 | 验证 Herdr/hc 的 Rust 架构、OSC 7501 状态协议、OpenRPC 边界与零膨胀 render 纪律 |

### 3.3 留档截图与视觉分析索引（归档于 `.temp/copy-t3code/`）

全部原始抓取数据包已存放在 [`../../../.temp/copy-t3code/raw/`](../../../.temp/copy-t3code/raw/)（`round2.json`、`round3.json`、`round4.json`），11 张图片已存放在 [`../../../.temp/copy-t3code/`](../../../.temp/copy-t3code/)：

| 留档文件 | 来源与主题 | 关键视觉观察（对 `[DNEE]` 的直接启发） |
|---|---|---|
| [`gh-hero.webp`](../../../.temp/copy-t3code/gh-hero.webp) | T3 Code 官方桌面+移动端 Hero 图 | 右上悬浮卡极简三段式：`Open in editor` + `+ Add project script` / `feat/offline-sync` + `Commit, push & PR` + `Changes vs origin/main +71 -2`；消息末尾折叠条 `3 changed files +71 -2 [Open diff]` |
| [`x-theo-pr.jpg`](../../../.temp/copy-t3code/x-theo-pr.jpg) | `@theo` PR 审查与桌面全屏实图 | 右半屏为高密度 PR 面板：`#8243`、`main ⚠️ ← ci/anonymous-preview-dmg`、`1 file +209 -13`、`Summary \| Timeline \| Code` 三页签、`✓ 17 of 24 passing`、蓝色 `Squash` 主按钮；底栏极紧凑显示 `Worktree \| PR #8243 \| branch` |
| [`x-asuka-1.jpg`](../../../.temp/copy-t3code/x-asuka-1.jpg) | `@asuka0x109` 注意力布局与空仓库图 | 无 Git 仓库时右上浮卡直接给 **`Initialize Git`** 行动按钮而非静态死文字；左侧 `Working / Settled` 分区；右侧 `Open a surface` 统一入口列表 |
| [`x-asuka-2.jpg`](../../../.temp/copy-t3code/x-asuka-2.jpg) | `@asuka0x109` 设置面板实图 | 清晰分为系统外观、Agents、Code（`Projects / Source control / Worktrees`）、Connections 四大组，用视觉缩略卡片选主题/布局 |
| [`x-orca-1.jpg`](../../../.temp/copy-t3code/x-orca-1.jpg) | T3 Code Diff 面板细节图 | Diff 顶部微工具条极紧凑：`Turn 2` 数据源切换、`+29 -12`、折叠/展开全部、Unified/Split 视图、空白忽略、复制路径，语法着色干净克制 |
| [`x-orca-2.jpg`](../../../.temp/copy-t3code/x-orca-2.jpg) | Orca 官方对比截图（`@x1fl_` 贴图） | 右侧边栏采用 `All \| Uncommitted` 过滤切换 + `UNTRACKED FILES` / `COMMITTED ON BRANCH` 分组，直观呈现分支已提交与未提交两层变动 |
| [`x-fox-1.jpg`](../../../.temp/copy-t3code/x-fox-1.jpg) | `@indie_maker_fox` 移动端 `Usage` 页 | `Cost \| Tokens \| Limits` 柱状图（明确属于 `[DNMS]` 域，不进 `[DNEE]`） |
| [`x-fox-2.jpg`](../../../.temp/copy-t3code/x-fox-2.jpg) | `@indie_maker_fox` 移动端 `Pulls` 页 | 每行 PR 只保留：状态图标+冲突三角 `!`、仓库/`#PR`、标题、CI 绿勾、`+N -M`，手机窄屏下依然清晰可读 |
| [`x-selzer.jpg`](../../../.temp/copy-t3code/x-selzer.jpg) | `@selzer25` 子 Agent 等待流实图 | 展示 `Waiting on 2 subagents` 视图（属于 `[DNPR]`/宿主对话域，不进 `[DNEE]`） |
| [`x-meow-1.jpg`](../../../.temp/copy-t3code/x-meow-1.jpg) / [`x-meow-compare.jpg`](../../../.temp/copy-t3code/x-meow-compare.jpg) | `@meow2149` 对比配图 | T3 Code vs Codex / T3 Code vs Orca 封面归档 |

以下精选 6 张核心实机截图作为本初评的直接视觉依据：

![T3 Code 官方桌面与移动端 Hero](../../../.temp/copy-t3code/gh-hero.webp)
*图 1（`gh-hero.webp`）：右上浮卡将编辑跳转、项目脚本、分支、`Commit, push & PR` 与 `Changes vs origin/main +71 -2` 收敛在紧凑卡片内。*

![T3 Code App 内 PR 审查视图](../../../.temp/copy-t3code/x-theo-pr.jpg)
*图 2（`x-theo-pr.jpg`）：高信噪比 `Summary | Timeline | Code` 三页签 PR 审阅面，集成冲突提醒、CI 门禁进度与一键 `Squash`。*

![T3 Code Diff 面板工具条](../../../.temp/copy-t3code/x-orca-1.jpg)
*图 3（`x-orca-1.jpg`）：按 `Turn / Branch / Commits` 切换的 Diff 视图与紧凑顶部控制钮。*

![Orca 多终端与右侧 Uncommitted/Committed 边栏](../../../.temp/copy-t3code/x-orca-2.jpg)
*图 4（`x-orca-2.jpg`）：右侧边栏的 `All | Uncommitted` 过滤与 `COMMITTED ON BRANCH` 分组对照；同时印证单屏堆叠过多窗格造成的视觉压力。*

![T3 Code 非 Git 目录浮卡与布局](../../../.temp/copy-t3code/x-asuka-1.jpg)
*图 5（`x-asuka-1.jpg`）：未初始化 Git 目录直接提供 `Initialize Git` 动作，消除冷启动断层。*

![T3 Code 分层设置面板](../../../.temp/copy-t3code/x-asuka-2.jpg)
*图 6（`x-asuka-2.jpg`）：按外观 / Agent / Code（Projects · Source control · Worktrees）/ 连接分组的清晰设置架构。*

---

## 4. 按价值排序的完整分析台账表格

### 4.1 `[DNEE]` 高价值演进建议台账（Rank 1 – Rank 8）

| Rank | 优先级 | 演进能力项 | 主要 UI 落点 | 解决的核心开发者痛点 | 社区信号强度 | 与 `[dsh]` 调性兼容 | 与 `[DNEE]` 适配度 | 路由 / 合同增量 | 建议批次 |
|---|---|---|---|---|---|---|---|---|---|
| **Rank 1** | **P0** | **精细化 Git 控制闭环**：分文件 Stage/Unstage + Discard 丢弃 + Stash 交互 + Commit & Push | `CommitDrawer` + `StatusBar` Stash 徽章 | 无法只提交部分文件、无法在 UI 撤回 Agent 改坏的文件、Stash 徽章不能点、提交后需切抽屉再 Push | 极强（Reddit/X 高频刚需；`gh-hero.webp`） | ★★★★★（复用 `RiskConfirmation` + realpath 围栏） | ★★★★★ | 新增 `/stage`、`/unstage`、`/discard`、`/stash`（需 `[业主]` 登记扩约） | **Batch 2** |
| **Rank 2** | **P0** | **多视角变更可视化**：`Branch vs Base` 整支对比 + 历史提交文件直看 Diff | `CommitDrawer` 顶部分段切换 + `BranchDrawer` `HistoryRail` | Agent 连交多个 commit 后无法整体审阅本分支相对主干的全部代码变化；历史提交列表只看文件名不能看 Diff | 极强（`gh-hero.webp`、`x-orca-1/2.jpg`） | ★★★★★（复用宿主 `SegmentedControl`） | ★★★★★ | 仅扩展只读 `/diff` 参数（支持 `commit` / `base`） | **Batch 1** |
| **Rank 3** | **P0** | **轻量级 PR 状态与动作闭环**：状态栏 `#PR`+CI 点、`BranchDrawer` PR 条 + 一键 Create/Draft PR | `StatusBar` + `BranchDrawer` | 推完代码仍需离开 `[dsh]` 去浏览器提 PR 或查看 CI 门禁与合入冲突 | 极强（T3 Code 口碑核心爆点：`x-theo-pr.jpg`、`x-fox-2.jpg`） | ★★★★☆（仅调用本机 `gh`/`glab` CLI，零秘钥硬编码，未装静默隐藏） | ★★★★☆ | 新增 `/pr/status`、`/pr/create`（须 `[业主]` 拍板登记，后台非阻塞缓存） | **Batch 3** |
| **Rank 4** | **P1** | **Worktree 可管理化 + 新建分支 + 一键 `Initialize Git`** | `BranchDrawer` 工作树/分支区 + `StatusBar` 非 Git 态 | 工作树列表只读不可建/开/删、无法在抽屉内新建分支、非 Git 目录不能直接 `git init` | 强（X 多 Agent Worktree 共识 + `x-asuka-1.jpg`） | ★★★★★（纯原生 git 命令 + `[DNT]` 联动 + `.agents/worktrees` 习惯一致） | ★★★★★ | 新增 `/branch-create`、`/worktree`、`/init`（需 `[业主]` 登记扩约） | **Batch 2** |
| **Rank 5** | **P1** | **文件树「仅看改动（Changed-Only）」过滤 + 树内快捷筛选 + 变更行数标注** | `ExplorerBody` 顶栏 & 文件树列表 | 几万文件大仓中定位 Agent 刚改动的几个文件费时费力；开抽屉会遮挡树内右键能力（右侧打开/终端/notepad） | 强（`x-orca-2.jpg`、`gh-hero.webp`） | ★★★★★（零后端扫描、纯前端消费 `WorkspaceStore`） | ★★★★★ | **0 路由新增**（可复用已有 `git.files` numstat） | **Batch 1** |
| **Rank 6** | **P1** | **内联 Diff 审阅升级**：Mark as Viewed 已审阅折叠 + Diff 工具条 + 右键 Diff 降级修复 | `CommitDrawer` 内联 Diff 区 + 右键「查看差异」 | 多文件改动审阅易迷失进度；未装实验性 `client-ui-forge` 时右键「查看差异」报错断链 | 强（T3 Code `source-control.md` 重点特性、`x-orca-1.jpg`） | ★★★★★（用宿主 `Checkbox`/`IconButton`，纯浏览器状态） | ★★★★★ | **0 路由新增**（Diff 忽略空白可传 `/diff` 参数） | **Batch 1** |
| **Rank 7** | **P2** | **设置分层整理与高价值开关补强**（Device vs Repo Local/Global 继承） | `SettingsDialog` + `RepoSettingsDialog` | 10 个开关平铺缺乏组织；无法配置提交偏好、自动 fetch 节奏、对比基线或 Worktree 前缀 | 中高（`x-asuka-2.jpg`、`project-settings.md`） | ★★★★★（保持显示偏好存浏览器、Git 配置只写 `.git/config`） | ★★★★★ | 低（可选只读/写本仓库 config 项） | **Batch 2** |
| **Rank 8** | **P2** | **轻量化项目脚本快捷入口**：只读发现 `package.json` `scripts` 并投递终端运行 | `ExplorerBody` 顶栏（`RevealButton` 旁） | 启动 dev/build/test 仍需翻看 `package.json` 手敲命令 | 中（`gh-hero.webp`、`x-asuka-1.jpg`） | ★★★☆☆（必须严守**不自建进程管理器**，只投递给 `nxe.openTerminal` / `[DNT]`） | ★★★☆☆ | **0 或 1 只读路由**（可直接在前端 `/read` `package.json`） | **Batch 3（可选）** |

### 4.2 架构守门：明确**不做**进 `[DNEE]` 的清单（Explicit Non-Goals）

依据仓根 `AGENTS.md`（**插件中立 / 上层建筑归 host / 不得侧载 / 单一真源**）与 [`docs/specs/dsh-nano-ui/DESIGN.md`](../dsh-nano-ui/DESIGN.md)，以下 T3 Code 热门功能**明确不得放进 `[DNEE]`**：

| T3 Code 热门特性 | 明确拒绝放进 `[DNEE]` 的原因 | 在 `[dsh-nano]` 中的正确归属 |
|---|---|---|
| **Active / Working / Settled 侧栏、子 Agent 耗时进度** | 属于会话/任务心流编排，不属于工作区文件树与 Git 视图 | `[dsh]` 宿主侧栏 / `[DNPR]` |
| **Token 消耗 / 费用 / 额度柱状图（`Usage`）** | 属于模型请求与配额治理面 | `[DNMS]` |
| **内置 Preview Browser / Visual Replies / SnapShots** | 属于渲染预览与设计捕获层 | `[dsh]` 宿主 / `[DNK]` |
| **跨设备 Relay / 移动端同步 / 云端沙箱调度** | 属于连接层与执行世界基础设施，且 `[DNEE]` 不得做跨端私通 | `[dsh]` 宿主 / `[DNCS]`（`[DNEE]` 仅在未来消费 `H-EXEC` 接口） |
| **AI 自动生成 Commit / PR 描述 / Review Guide** | 会让文件浏览器插件直接耦合 LLM 调用、API Key 或宿主会话，违背「插件中立」与零秘钥原则 | 留给对话区 Agent，或仅在宿主未来开放统一只读生成原语后再议 |
| **完整 GitHub Issues / Linear 看板 / 评论回复系统** | 过度膨胀会把 `[dsh工作台]`「文件」页拖成重型项目管理软件，重蹈 Orca 信息过载覆辙 | 外部 GitHub/Linear 平台或独立插件 |

---

## 5. 逐项高价值内容全面分析（Rank 1 – Rank 8）

### Rank 1（P0）：`CommitDrawer` 精细化 Git 控制闭环（Stage/Unstage + Discard + Stash + Commit & Push）

- **具体设计落点**：
  - [`src/client/drawers.js`](../../../dsh-nano-explorer-extra/src/client/drawers.js#L962-L1081)：在 `ChangeRow` 行尾增加轻量化动作按钮（`+` 暂存 / `-` 取消暂存 / `↺` 丢弃改动）；顶部增加「全部暂存 / 全部取消暂存」；将底部主动作拆为「提交」与「提交并推送」；支持点击 [`StatusBar`](../../../dsh-nano-explorer-extra/src/client/statusbar.js#L95-L102) 现有的 Stash 徽章或在 `CommitDrawer` 内管理 Stash（Save / Pop / Drop）。
  - [`src/host/git.js`](../../../dsh-nano-explorer-extra/src/host/git.js) & [`src/host/routes.js`](../../../dsh-nano-explorer-extra/src/host/routes.js)：解除 `/commit` 强制 `git add --all` 的单一路径；若有已暂存改动则优先仅提交 staged（无 staged 时提示将全部提交，或提供显式开关）。
- **价值来源与社区实证**：
  - AI Agent 高频改文件时，极常见两种情况：① Agent 顺手改坏或测试污染了某 1–2 个文件，开发者只想**精准丢弃该文件改动**；② 本轮做了两件事，开发者只想**先提交其中 3 个干净文件并立刻 Push**。目前 `[DNEE]` 在这两类场景下会直接把用户逼回终端敲命令行，打断审阅心流。
  - Reddit `r/ClaudeCode` 与 `r/ClaudeAI` 对 T3 Code 的核心好评之一即“Review diffs → discard or keep → commit & push”无需脱离图形审阅面。
- **与 `[dsh]` 调性及架构规范的兼容性**：
  - 丢弃改动（Discard）与 Stash Drop 属不可逆破坏性操作，**强制使用宿主 `RiskConfirmation` 原语**（[`DESIGN.md` §6.1](../../../docs/specs/dsh-nano-ui/DESIGN.md#L115)）做二次确认，绝不手写危险弹窗。
  - 所有传给 `git checkout --` / `git clean` / `git restore` 的路径必须复用 [`mutate.js`](../../../dsh-nano-explorer-extra/src/host/mutate.js#L79-L100) 的 `assertInside` fail-closed realpath 围栏，禁止 `.git` 路径和 `-` 开头参数注入。
- **与 `[DNEE]` 当前底座适配度**：★★★★★。[`git.js`](../../../dsh-nano-explorer-extra/src/host/git.js) 已经按 `staged` / `unstaged` / `untracked` / `conflicts` 结构化解析并统计了 `stashed` 数量，前端分组渲染也早已就位，缺失的只是对这三组状态施加动作的写路径；需经 `[业主]` 批准登记新路由合同（`/stage`、`/unstage`、`/discard`、`/stash`）及 `commit` 模式扩约。

---

### Rank 2（P0）：多视角变更可视化（Branch vs Base 对比 + 历史提交直看 Diff）

- **具体设计落点**：
  - `CommitDrawer` 顶部新增视角切换（宿主 `SegmentedControl`）：`工作区改动`（Uncommitted） ↔ `本分支累计（vs <base>）`（默认对标 `origin/HEAD` 或用户配置基线），展示相对默认分支的所有变更文件及总 `+N -M`，点选文件直接拉取 `merge-base...HEAD` 的统一差异。
  - `BranchDrawer` 的 `HistoryRail`（[`drawers.js#L408-L416`](../../../dsh-nano-explorer-extra/src/client/drawers.js#L408-L416)）：历史提交展开后的文件列表目前仅展示文件名与 `+N -M`，将其改为可点击行，点击即加载该 `commit` 下该文件的 diff。
- **价值来源与社区实证**：
  - 现代 Coding Agent 往往在单次任务中自行创建多个 commit。一旦代码已 commit，当前 `CommitDrawer` 立即归零，开发者无法在一个面板内做“提 PR 前的整支代码总览”。
  - 官方截图 [`gh-hero.webp`](../../../.temp/copy-t3code/gh-hero.webp) 右上浮卡直接展示 `Changes vs origin/main +71 -2`；[`x-orca-1.jpg`](../../../.temp/copy-t3code/x-orca-1.jpg) 把 `Turn / Branch / Commits` 作为 Diff 面板一等视角切换；[`x-orca-2.jpg`](../../../.temp/copy-t3code/x-orca-2.jpg) 也把 `COMMITTED ON BRANCH` 与 `Uncommitted` 同屏列出。
- **与 `[dsh]` 调性及架构规范的兼容性**：极高。全程只读查询，不引入任何新视觉面板或常驻浮层，复用已有 `SegmentedControl` 与内联 Diff 容器，不触碰宿主 DOM。
- **与 `[DNEE]` 当前底座适配度**：★★★★★。[`git.js#L34-L64`](../../../dsh-nano-explorer-extra/src/host/git.js#L34-L64) 已实现 `merge-base` 与 `origin/HEAD` 解析，`readPathDiff` 已支持安全单文件 diff 读取，只需在现有 `POST /diff` 上允许可选只读字段 `commit` / `base`（严格正则校验 hash/ref，禁止 `-` 开头 flag 注入）即可平滑复用。

---

### Rank 3（P0）：轻量级 PR 状态与动作闭环（复用本机 `gh`/`glab` CLI，零凭证耦合）

- **具体设计落点**：
  - `StatusBar`：当当前分支存在关联 PR 时，分支按钮旁紧凑展示 `#142` 徽章 + 宿主 `StateDot`（绿/黄/红映射 CI 通过/运行中/失败，Draft 用虚线/灰态）；点击直达 `BranchDrawer` 顶部 PR 摘要条。
  - `BranchDrawer` 顶部 PR 摘要条：
    - **无 PR 时**：提供「创建 PR」按钮（弹窗仅含标题、正文预填最近 commit 列表、Draft 勾选、目标基线分支选择），确认后若本地有未推送提交自动 `push -u` 并调 `gh pr create` / `glab mr create`；
    - **已有 PR 时**：单行高密度呈现 `#编号 · 状态(Draft/Open/Merged) · CI(如 17/24) · 合入冲突提示`，附带「浏览器打开」与「复制链接」两个小图标按钮。
- **价值来源与社区实证**：
  - 这是 T3 Code 在 X 与 Reddit 收获压倒性好评的第一护城河（`@selzer25` 称 PR 流“orgasmic”，`@theo` 1.4k 赞发布贴主推 `in-app PR reviews`，[`x-theo-pr.jpg`](../../../.temp/copy-t3code/x-theo-pr.jpg) 与 [`x-fox-2.jpg`](../../../.temp/copy-t3code/x-fox-2.jpg) 直观证明了将 CI 门禁数与冲突信号前移到工作台的巨大价值）。
  - 把“Push → 开网页 → 填 PR → 等 CI 回来刷页面”收敛到不切窗口的一次点击与一眼状态感知。
- **与 `[dsh]` 调性及架构规范的兼容性**：
  - **严守「不得侧载 / 不得硬编秘钥 / 插件中立」**：`[DNEE]` **绝不**自己存 GitHub/GitLab Token，也不做 OAuth 弹窗，完全复用宿主机器上用户已登录的 `gh` / `glab` CLI（通过 `ctx.subprocess.resolveExecutable` + `sandbox.confine` 执行，未安装或未登录时静默隐藏 PR UI，零报错、零干扰）。
  - **严守性能底线**：PR 状态拉取绝不阻塞 `/status` Git 读写；完全复用 `routes.js` 里 [`stats.js`](../../../dsh-nano-explorer-extra/src/host/stats.js) 已验证成功的**非阻塞后台采样 + 长缓存（如 60s–120s）**模式，只在打开 `BranchDrawer` 或主动刷新时按需触发。
- **与 `[DNEE]` 当前底座适配度**：★★★★☆。底层进程沙箱、超时控制与非阻塞缓存模型现成可用；因新增外网 CLI 调用路由（如 `/pr/status`、`/pr/create`），须先由 `[业主]` 裁决并登记至 `security/feature-contract.json` 与 `lib/bindings.js`。

---

### Rank 4（P1）：`BranchDrawer` Worktree 可管理化 + 新建分支 + 一键 `Initialize Git`

- **具体设计落点**：
  - `BranchDrawer` 分支区：搜索框无结果时出现「创建并切换到分支 `<query>`」，或顶部配 `+ 新建分支` 按钮，支持选定起点（`HEAD` 或默认分支）。
  - `BranchDrawer` 工作树区（[`drawers.js#L668-L688`](../../../dsh-nano-explorer-extra/src/client/drawers.js#L668-L688)）：把静态列表行升级为可交互行——① `+ 新建 Worktree`（支持默认路径前缀如 `.agents/worktrees/<branch>`，契合 `[dsh-nano]` 本仓 worktree 规范）；② 行尾提供「复制路径」「在终端中打开（调用 `nxe.openTerminal(sessionId, row.path)` 优先落入 `[DNT]`）」「移除 Worktree（非当前工作树，带 `RiskConfirmation`，若该 worktree 有未提交改动则默认阻止或要求强制确认）」。
  - `StatusBar` 非 Git 态（[`statusbar.js#L63-L68`](../../../dsh-nano-explorer-extra/src/client/statusbar.js#L63-L68)）：将静态的「未初始化 Git 仓库」改为可点击按钮，点击后经确认弹窗执行 `git init`（如实照应 [`x-asuka-1.jpg`](../../../.temp/copy-t3code/x-asuka-1.jpg) 的 `Initialize Git`）。
- **价值来源与社区实证**：
  - 多 Agent 并行时代，`git worktree` 是防文件踩踏的基础设施（`@jiangkoumo_`、`@x1fl_`、Reddit 多次提及）。`[DNEE]` 已经做好了「已检出工作树 vs 仅本地 ref」的物理形态分组，唯独缺“创建”和“清理”入口，导致工作树功能只完成了一半。
- **与 `[dsh]` 调性及架构规范的兼容性**：极高。不自造会话或窗口概念，工作树创建后通过现有 `[DNT]` 服务入口或路径复制即可直接开干；新建 worktree 与删除 worktree 路径必须经过严格的词法与 realpath 边界校验（防止把 worktree 创建/删除到不合法位置）。
- **与 `[DNEE]` 当前底座适配度**：★★★★★。`git.js` 已完整列出 `worktrees` 及各 worktree 分支/路径/HEAD，`openTerminal` 接 `[DNT]` 已打通；新增 `/branch-create`、`/worktree`、`/init` 需 `[业主]` 登记合同。

---

### Rank 5（P1）：文件树顶栏「仅看改动过滤（Changed-Only）」+ 快速文件名筛选 + 变更量级可视化

- **具体设计落点**：
  - [`src/client/body.js`](../../../dsh-nano-explorer-extra/src/client/body.js#L1131-L1150) 顶栏新增「仅看改动」切换按钮（带未提交文件数角标）和轻量可展开的树内过滤输入框（支持快捷键 `/` 触发）。
  - 开启「仅看改动」时，直接基于 `ws.git.files` 构建精简树视图（只保留含改动文件的祖先路径与改动文件本身，并自动展开），行尾除了 `M/A/?` 字母，可选紧凑显示 `+N -M`。
- **价值来源与社区实证**：
  - 在 49k+ 文件的大型仓库（[`spec-26nov.md`](../../../docs/specs/dsh-nano-explorer-extra/spec-26nov.md) 的实测基线）下，传统文件树展开效率极低。Orca（[`x-orca-2.jpg`](../../../.temp/copy-t3code/x-orca-2.jpg) 的 `All | Uncommitted` 切换）与 T3 Code（[`gh-hero.webp`](../../../.temp/copy-t3code/gh-hero.webp) 收拢改动目录树）都证明：让开发者一秒只看当前改动文件，同时保留完整的文件树右键上下文菜单（右侧工作台打开、在终端打开、复制到 `[DNN]`、查看差异），比“弹出一个遮住文件树的抽屉”更顺手。
- **与 `[dsh]` 调性及架构规范的兼容性**：极高。**纯客户端计算**，零网络请求、零磁盘遍历、零跨进程开销；注意大仓开启树内搜索时仅过滤已加载的 `ws.levels` 与 `ws.git.files`，**不触发**全仓递归 `listDirectory`，守住性能预算。
- **与 `[DNEE]` 当前底座适配度**：★★★★★。[`workspace-store.js`](../../../dsh-nano-explorer-extra/src/client/workspace-store.js) 已经持有全量 `git.files`（含 `additions` / `deletions` numstat）和 `levels`，**0 后端改动即可落地**。

---

### Rank 6（P1）：`CommitDrawer` 内联 Diff 审阅升级（「已审阅打勾折叠」+ 右键 Diff 降级修复）

- **具体设计落点**：
  - `CommitDrawer` 变更列表与内联 Diff（[`drawers.js#L962-L1081`](../../../dsh-nano-explorer-extra/src/client/drawers.js#L962-L1081)）：
    1. 每个改动文件行增加轻量化「已审阅」勾选（调用宿主 `Checkbox`），已审阅项自动视觉弱化或折叠，顶部显示进度如 `已审阅 4/12`；当文件工作区状态再次变动（或内容摘要变更）时自动清除已审阅标记；
    2. Diff 预览区顶部补小工具条：一键复制路径、`忽略空白 (-w)` 开关、展开全部上下文；
    3. **修复右键「查看差异」断链**：[`body.js`](../../../dsh-nano-explorer-extra/src/client/body.js#L1114-L1118) 当前右键「查看差异」若未启用实验性 `client-ui-forge` 会直接弹错误提示（[`i18n.js#L34`](../../../dsh-nano-explorer-extra/src/client/i18n.js#L34)）；改为探测失败/不可用时自动切开 `CommitDrawer` 并定位选中该文件显示 `[DNEE]` 自带 Diff。
- **价值来源与社区实证**：
  - T3 Code 将 **Mark files as viewed** 写进 [`source-control.md`](https://github.com/pingdotgg/t3code/blob/main/docs/user/source-control.md) 核心章节，解决 Agent 一轮改十几个文件时“看到一半被打断后忘了哪几个看过”的真实痛点；[`x-orca-1.jpg`](../../../.temp/copy-t3code/x-orca-1.jpg) 也展示了空白忽略、复制路径等高频微操作。
- **与 `[dsh]` 调性及架构规范的兼容性**：极高。`Checkbox` / `IconButton` 全部走宿主原语 / `dsh-nano-ui`，已审阅态可暂存内存或按 `cwd` 存在本地 `sessionStorage`，不污染宿主状态。
- **与 `[DNEE]` 当前底座适配度**：★★★★★。无需新增宿主路由（忽略空白仅在已有 `POST /diff` 增加布尔选项即可）。

---

### Rank 7（P2）：`SettingsDialog` & `RepoSettingsDialog` 分层整理与高价值设置补强

- **具体设计落点**：
  - [`SettingsDialog`](../../../dsh-nano-explorer-extra/src/client/settings.js)：把当前平铺的 10 个开关用宿主 `SegmentedControl` 或小标题收拢为三组——① **浏览与打开**（单击/双击、行尾按钮、系统文件、忽略角标）；② **Git 与审阅**（Git 状态着色、底部状态栏、优先提交已暂存、`BranchDrawer` 打开自动 `fetch`、Diff 默认忽略空白、默认开启「仅看改动」）；③ **体积统计**（排除 `.git`、排除忽略内容、跟随软链接）。卡片头部保留明确说明：「以下开关仅作用于当前浏览器」。
  - `RepoSettingsDialog`（[`drawers.js#L800-L954`](../../../dsh-nano-explorer-extra/src/client/drawers.js#L800-L954)）：继续坚持与本地浏览器偏好的物理分层（「远端 / 署名 / SSH / 仓库行为」只写本仓库 `.git/config`），新增：
    - **默认对比基线分支**（默认自动探测 `origin/HEAD`，允许团队用 `develop`/`release` 主干时手动覆写）；
    - **Worktree 默认目录前缀**（如 `.agents/worktrees/`），沿用现有 `Local / Inherited from Global / Unset` 清晰来源标示。
- **价值来源与社区实证**：
  - T3 Code 的设置架构（[`x-asuka-2.jpg`](../../../.temp/copy-t3code/x-asuka-2.jpg)、[`project-settings.md`](https://github.com/pingdotgg/t3code/blob/main/docs/user/project-settings.md)）之所以受到资深开发者青睐，关键在于**作用域边界透明**（不混淆本机 UI 偏好与项目团队配置）以及允许高频工作流微调（对比基线、worktree 命名/位置）。
- **与 `[dsh]` 调性及架构规范的兼容性**：极高。遵守 `DESIGN.md` 对 `SettingsFormModel` 的约束——插件私有偏好不绑宿主存储，继续留在 `prefs.v2`；仓库配置只写本地 git config。
- **与 `[DNEE]` 当前底座适配度**：★★★★★。`RepoSettingsDialog` 已采用等高稳态三分页布局（`fb7264d` 刚修复过切页跳高），顺滑扩展第四页或并入现有分页即可。

---

### Rank 8（P2，可选探索）：轻量化项目脚本快捷入口（只读发现 + 投递终端）

- **具体设计落点**：顶栏 `RevealButton` 旁可选放一个极简「运行脚本」图标按钮，只读读取工作区根目录 `package.json` 的 `scripts` 键列表（例如 `dev` / `build` / `test`），点击后通过现有 `nxe.openTerminal(sessionId, cwd)` 拉起 `[DNT]` 或原生终端并提示/执行对应命令。
- **价值来源与社区实证**：T3 Code（[`gh-hero.webp`](../../../.temp/copy-t3code/gh-hero.webp)、[`x-asuka-1.jpg`](../../../.temp/copy-t3code/x-asuka-1.jpg)）把 `+ Add project script` 直接放在右上浮卡，打通开发到局部验证/本地运行的小闭环。
- **与 `[dsh]` 调性及架构规范的兼容性**：中等，**必须严守边界**——`[DNEE]` **不得**自己维护后台子进程、端口管理或构建日志流（否则越界侵入 `[DNT]` 与宿主运行时域）；只做「只读读出脚本名 → 交给终端执行」的薄入口。
- **与 `[DNEE]` 当前底座适配度**：★★★☆☆。因涉及跨插件交互约定（向 `[DNT]` 传入初始命令需确认 `nanoTerminal` 服务是否接收 command 参数），优先级显著低于 Rank 1–7，建议作为远期可选项。

---

## 6. 分批次落地执行建议

为遵循 `AGENTS.md` **「不得擅自扩约 / 不得过度仪式 / 小步验证」** 原则，建议将上述升级拆为 4 个干净、可独立交付的批次：

### Batch 0：工程小债顺手收口（约 0.5 天，零风险）
- **内容**：
  1. 补齐 [`src/perf/declaration.json`](../../../dsh-nano-explorer-extra/src/perf/declaration.json) 中缺失的 `dnee.diff` 与 `dnee.paste-image` 两条合同记录（使声明与 [`lib/bindings.js`](../../../dsh-nano-explorer-extra/lib/bindings.js) 20 条路由一致）；
  2. 同步更新 [`docs/specs/dsh-nano-explorer-extra/README.md`](../../../docs/specs/dsh-nano-explorer-extra/README.md) 与仓根 [`README.md`](../../../README.md) 中的 `[DNEE]` 版本号（`0.3.0`）、文件树（移除已删 `tree.js`）及测试状态；
  3. 清理本地过期未跟踪产物 `dsh-nano-explorer-extra-0.3.0.tgz`。
- **退出标准**：`npm --prefix dsh-nano-explorer-extra test` 全绿；`check-ui-rules` 与仓内门禁无新增告警。

### Batch 1：纯审阅与可视化增强（零新增写路由 / 零外部 CLI 依赖，最快见效）
- **包含项**：**Rank 5**（仅看改动过滤 + 树内快捷筛选）+ **Rank 2**（`Branch vs Base` 整支对比 + 历史提交文件 Diff）+ **Rank 6**（`Mark as Viewed` 已审阅折叠 + 右键 Diff 降级修复）。
- **合约变化**：仅在已有 `POST /diff` 上允许可选只读参数（`commit`、`base`、`ignoreWhitespace`），不改变既有路由数量与权限模型。
- **验收关键**：
  - 49k 文件测试仓开启「仅看改动」后，树节点渲染降维至 `O(changedFiles)` 且零额外 `/list` 请求；
  - `CommitDrawer` 可在 `未提交` 与 `vs origin/HEAD` 之间无闪烁切换并完整审阅 diff；
  - 历史提交展开发起 diff 正常、未启用 Forge 时右键「查看差异」不再报死错。

### Batch 2：核心本地 Git 操作闭环（须 `[业主]` 拍板登记新路由合同）
- **包含项**：**Rank 1**（`/stage`、`/unstage`、`/discard`、`/stash`、双态 Commit / Commit & Push）+ **Rank 4**（`/branch-create`、`/worktree` 增删开、`/init` 一键初始化）+ **Rank 7**（设置分组重构 + 新偏好与仓库基线/Worktree 前缀设置）。
- **合约前提**：先由 `[业主]` 冻结新增路由枚举与安全边界，再统一更新 `security/feature-contract.json`、`dsh-interface` 烘焙的 `lib/bindings.js`、及 [`dsh-nano-explorer-extra/AGENTS.md`](../../../dsh-nano-explorer-extra/AGENTS.md)。
- **安全与测试闸门**：
  - 所有 `/stage`、`/discard`、`/worktree` 路径参数全部过 fail-closed realpath + `.git` 段拒绝 + 禁止 `-` 开头 flag 注入，并补全对应 `node:test` 负例单测；
  - `discard` 与移除 worktree 强制经宿主 `RiskConfirmation` 确认。

### Batch 3：外部平台交付闭环（按需启用，依赖本机 `gh`/`glab` CLI）
- **包含项**：**Rank 3**（状态栏 `#PR`+CI 状态点、`BranchDrawer` PR 状态条与一键 Create/Draft PR）；以及（若 `[业主]` 需要）**Rank 8**（`package.json` 脚本投递终端）。
- **关键守则**：
  - 未装 `gh`/`glab` 或未登录时必须**零报错静默降级**；
  - PR/CI 查询采用非阻塞后台缓存采样（60s–120s TTL），绝不拖慢 `GET /status` 与文件树响应；
  - 严禁插件内持久化或硬编码任何 GitHub/GitLab Token。

---

## 7. Verdict：总结与多维度预期价值

### 7.1 对 `[DNEE]` 的总体判断

在当前 `HEAD`（`30ca969`）下，`[DNEE]` 已经从早期简单的“侧栏文件树补丁”成长为一个**架构极其扎实的双半侧系统插件**：具备 `WorkspaceStore` 跨会话单例共享、49k 大仓验证过的非阻塞 stats 采样、`fs.watch` 主动失效、fail-closed realpath/`.git` 安全围栏、`dsh-host-route-guard` 路由门禁、`NUE-1117` 宿主原语 UI 规范化以及 46/46 全绿单测底座。

但对比 2026 年开发者对 **T3 Code** 形成极高口碑的核心原因，当前 `[DNEE]` 正处于**“底座非常强健，但最后一公里工作流半断”**的临界点——能看树、能看部分状态、能做全量提交和推送，却在**筛选改动、精准暂存/撤回、整支审阅、管理 Worktree 和创建/感知 PR** 这几个每天高频发生十几次的环节上，把开发者重新推回外部终端或浏览器。

`[DNEE]` 的正确演进路线不是变成 Orca 那样挤压屏幕的巨无霸 IDE，也不是复制 T3 Code 属于整个控制面的侧栏/模型/沙箱系统，而是吸取 **T3 Code 的高信噪比闭环 + Herdr 的极致轻量化与边界纪律**，将自己打磨为 `[dsh]` 内**克制、高速、安全、免切窗口的 Agent 代码审阅与 Git 交付工作面**。

### 7.2 完成上述演进后的多维度预期价值

#### A. 对 `[DNEE]` 自身带来的 5 维价值

| 维度 | 演进前现状（`30ca969`） | 完成 Batch 1–3 后预期跃迁 |
|---|---|---|
| **1. Git 操作闭环度** | 只支持全量 `add --all` 提交、切分支、推拉；不能暂存筛选、不能 Discard、Stash 只读、Worktree 只读 | **补齐本地 Git 全生命闭环**：分文件暂存/取消暂存、带二次确认的安全 Discard、Stash 存取、Worktree 建/开/清、新建分支与一键 `git init` |
| **2. 代码审阅与可视化深度** | 仅支持看单个未提交文件 diff；已提交的分支代码和历史提交文件看不了 diff；多文件审阅无进度感 | **建立三视角审阅体系**：`未提交` / `相对默认分支累计` / `历史单提交` 直看 Diff + `Mark as Viewed` 已读折叠，覆盖 Agent 多轮连续提交后的整支代码验收 |
| **3. 大型仓库工作流信噪比** | 49k 文件仓中需逐级点开目录寻色，或打开抽屉盖住文件树（丢失树上右键联动能力） | **一秒聚焦变更集合**：顶栏「仅看改动」直接把数万文件折叠成受影响的少量改动路径，且原生保留全部右键跨插件动作 |
| **4. 交付链路连贯性（Task-to-PR）** | Push 结束后链路中断，需离开 `[dsh]` 打开浏览器开 PR、查 CI 状态、看是否合入冲突 | **不离 `[dsh工作台]` 完成交付最后一公里**：侧栏底缘一眼感知 PR 编号、CI 通过数与冲突警示，分支卡内直出 Draft/Open PR |
| **5. 配置与心智清晰度** | 10 个偏好开关平铺一列，缺少提交范围、对比基线、自动抓取等关键微调项 | **两层边界更清晰、高频偏好可控**：浏览器视觉开关分组收拢，仓库级规则（基线分支/Worktree 前缀/作者/SSH）明确标注 Local/Global 继承关系 |

#### B. 对 `[dsh]` 整体生态带来的 5 维价值

1. **显著提升开发者单工作台留存率（免切窗口体验）**：开发者在让 Agent 跑完编码任务后，无需切到 VS Code / Sourcetree / 终端 / GitHub 网页去完成“找改了哪几个文件 → 撤掉误改 → 分批提交 → 开 Draft PR → 盯 CI”这套固定动作，使 `[dsh]` 真正从“聊天工具”升级为“完整交付终端”。
2. **补齐 `[dsh工作台]` 相对于竞品的硬核差异化竞争力**：当前社区（X/Reddit）将「Worktree + Diff 审阅 + PR 闭环」视为评价 AI 编码客户端是否“serious for real work”的分水岭；完成升级后，`[dsh]` 无需改变自身轻快内核，即可在高频开发者最在意的工程交付体验上对齐乃至超越 T3 Code。
3. **树立 `[dsh-nano]` 多插件正交协同的示范样板**：`[DNEE]` 专注文件树与 Git/PR 交付，Worktree 终端直接落入 `[DNT]`，草稿摘要导入 `[DNN]`，模型与配额留给 `[DNMS]`，任务流留给 `[DNPR]`，远端执行世界消费 `[DNCS]` 的 `H-EXEC`——各插件通过 Cordis 惰性服务松耦合联动，零侧载、零职责越界。
4. **保持大仓高性能与生产级安全标杆**：不同于部分社区工具因缓存膨胀或全量扫描拖慢主界面，`[DNEE]` 在补齐高级 Git/PR 能力的同时继续坚持后台采样缓存、纯前端改动过滤、`RiskConfirmation` 危险防护与 fail-closed realpath 围栏，避免引入“功能变强但页面变卡/变危险”的负口碑。
5. **强化平台中立与 BYOS 开源吸引力**：复用宿主机器现有 `git`、`gh`、`glab` 与系统应用探测，不绑定特定云服务或私有账户体系，契合 `[dsh-nano]` 服务官方 `[dsh]` 生态的长期开放路线。
