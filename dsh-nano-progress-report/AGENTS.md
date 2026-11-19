# dsh-nano-progress-report

只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
装好的标志：[dsh工作台] 出现「Progress」tab（会话头部动作也能把它打开到右侧工作台）。内容是按回合缩进的执行流、过滤条和底部 Tasks 区（可拖拽、可折叠）。Progress 不注册 `conversation.view`：chat interface 已有轨迹视图，不需要第二个 Progress tab。

## 身份

| 项 | 值 |
|---|---|
| 包名 | `dsh-nano-progress-report` |
| 插件 id | `nano-progress-report` |
| 版本 | 读 `package.json` 的 `version`，不要写死 |
| dsh 引擎 | 读 `package.json` 的 `engines.dsh` |
| 平台 | 仅 web |
| 宿主入口 | `index.js`（无宿主路由；加载宿主进度摘要与 PromptContext） |
| 浏览器入口 | `lib/client.js` |
| 宿主 inject | `sessionProjections`、`systemPrompt`、`agents`；可选读取 goal、jobs |

宿主必需服务缺失时，宿主贡献不会激活。

## 交付物

| 路径 | 角色 |
|---|---|
| `package.json` | 包名、`engines.dsh`、`files`、bundle patch、`dsh.client.inject` |
| `cordis.patch.yml` | 插入插件 id。`name` 是包名 |
| `index.js`、`lib/host.js` | 宿主入口及构建好的宿主包。运行时必需 |
| `lib/client.js` | 浏览器包：Progress 视图目标 + [dsh工作台] 标签 + 时间线渲染。运行时必需。安装时不重建 |
| `lib/perf-declaration.js` | `dsh-performance-review` 的烤入声明。运行时必需 |
| `icon.svg`、`locale/` | 图标与中英文案 |
| `src/` | 作者树。运行中的 dsh 不读它 |

client inject 以 `package.json` 的 `dsh.client.inject` 为准，不在这里抄。

## 前置

1. `dsh --version` 落在 `package.json` 的 `engines.dsh` 内。不够或过高就停。不要自行放宽，除非操作者明确接受命令输出里的那一对版本。
2. `pnpm` 在 PATH 上。`dsh plugin` 只是把参数转给 profile 里的 pnpm。
3. 目标是已经能打开的 Web profile，默认名 `web`。不要装进 headless、sdk 或 acp。
4. 无。
5. 本包构建期依赖 `dsh-performance-review`，声明为 `devDependencies` 的 `file:../packages/dsh-performance-review`。`npm install`/`npm run build` 时解析这个相对路径；构建把它打成 `lib/perf-declaration.js`，运行中的页面不单独加载它。不要改这条依赖。tarball 只含构建产物，`dsh plugin add` 不再需要旁边的 `packages/` 目录。

未被告知 `DSH_HOME` 或 profile 名时，只动默认的 `web`。不要猜第二套实例。

## 安装

唯一命令：

```bash
dsh plugin --profile web add <spec>
```

`<spec>` 是本目录的绝对路径、`.tgz` 的绝对路径，或发布后的包名。

成功时写入该 profile 的 `dependencies` 和 `dsh.profile.bundles`，并应用本包的 `cordis.patch.yml`。其中 `name` 必须是包名，不能是绝对路径。

不要手改 profile 的 `package.json`。

没有 HMR 时，重启正在服务该 profile 的宿主进程，再强制刷新页面。只刷新页面不会换宿主路由。

卸载用 `dsh plugin --profile web remove`，参数是「身份」里的包名。没有 HMR 时同样要重启宿主。卸载不删除「配置与状态」里的浏览器数据或宿主状态文件。

## 验收

按顺序。前一步失败就停，不要换一个 profile 重试。失败时先看该 profile 目录下 `.plugin-manager/logs` 里这次 `dsh plugin` 的日志。

1. profile 的 `package.json` 里，`dependencies` 和 `dsh.profile.bundles` 都有本包名。
2. 重启并刷新后，页面里能找到本包的 client 模块（包名）。找不到说明 client 没进页面。
3. 打开右侧 [dsh工作台] 的「Progress」tab 得到 `[data-nano-progress-report]` 根节点；会话头部动作打开同一 tab。chat interface 的视图 tab 条里**不应**出现 Progress（已有轨迹）。右栏 guide 与 tab 菜单入口仍可用。
4. 已运行过 tool 调用的会话在 Progress 里能看到按回合缩进的事件流（人类 prompt 在左缘，该轮步骤右移 18px 并在同一条 0.5px 引线内；提示、shell、文件、工具、todo、turn 按时间排序）：行高 28px、无底色、无 600 字重；glyph 统一三级色，失败行只有红字 + 告警 glyph；人类输入 `label-primary`、机器步骤 `label-secondary`、边界行 `label-tertiary`。底部 Tasks 区头部 30px，可拖拽（下限 88px、上限 60% 视口）、**整条头部**可点击折叠；Tasks 与 `session.projections.faceOf('todos')` 同步，`N/M done` 与进度条一致。

## 初次运行

无数据库，也没有第一次启动迁移。Progress 标签默认不自动打开：从右栏 guide 页的 Progress 卡片（或任一会话的 tab 菜单「打开 Progress」）打开一次后，`sidebarRight` 自己记住它。

## 使用

时间线的数据真源是会话事件流（`uiConversation` 的 `progress` target），不是 DOM 抓取，也不是宿主私有状态。过滤条是自由文本加 `type:`/`status:`/`tool:` 词法：词与词 AND，`-` 前缀取反，未知 token 退化成文本。

| 动作 | 结果 |
|---|---|
| 在过滤条输入 `type:shell` | 只剩 shell 行 |
| `-status:failed` | 排除失败行；`status:failed` 只看失败 |
| `tool:bash` | 只看 bash 的 tool/call 行（wire 名精确匹配；bash 的 approval 行也归 bash）；`-tool:bash` 排除 bash |
| `type:subagent` | subagent 调用行，加上别的 agent 发来的消息（`Agent <name> sent a message:` 开头）与后台 subagent 结束通知；结束通知记录了非 `completed` 的结束原因时算失败 |
| 点击行 | 就地展开 detail（args 原文、result、耗时、subagent 的 PTC 子调用）；再点收起 |
| 拖拽 Tasks 区上沿 | 抬升/下移，下限 88px，上限 60% 视口；高度按会话记忆 |
| 点击 Tasks 整条头部 | 整条 30px 横条（含右侧计数/进度条）都是命中区；折叠到只剩 30px 头部，再点回到原高度。Jobs 开关自身 stopPropagation |
| Tasks / Jobs | Tasks 读 `todos` 投影（宿主在 turn 开始时清零，历史仍留在时间线的 `Task list` 行）；Jobs 读 `ctx.jobs`，只有存在 job 时头部才出现 `Jobs N` 文本开关 |
| 「Load older」 | 调 `session.loadOlder()`，时间线向前翻页 |

## 配置与状态

宿主配置：无本包专用开关。安装后通过 [dsh] 的可选 runtime context 提供当前会话进度；宿主抑制可选 runtime context 时不提供。摘要没有原始命令、结果、任务或团队消息正文。变化由宿主写入当前会话日志；宿主可缓存投影 checkpoint，本包不创建独立数据库或状态文件。

浏览器键（都只是视图态，不进宿主）：

| 键 | 内容 |
|---|---|
| `localStorage['dsh-nano-progress-report:filter:<sessionId>']` | 最近一次过滤条文本，按会话记忆 |
| `localStorage['dsh-nano-progress-report:tasks']` | `{height, collapsed, view}`，Tasks 区高度/折叠/当前列表 |

## 视觉体系

宿主优先，不自造风格。三份参照：

1. **宿主 primitive**：行用 `DisclosureRow`（28px 行、hover 换色、running shimmer、折叠 chevron），搜索用 `Input`（34px 工具条里 26px 宿主字段，边框/底色/焦点不重画），清空/加载更早/Jobs 切换用 `Button`（ghost），回合结构用 `Turn`（prompt level 0 + 18px 缩进的 level 1 步骤，左引线），Tasks 状态用 `StateDot` + catalog 的 `IconCheckCircleFillRegular` / `IconCheckCircleOutlineRegular`，动态列表用 `AnimatedRows`，相对时间用 `relativeTime`，全部图标取 `Icon*` catalog。
2. **devin Progress 的阅读顺序**：搜索行 → 回合（人类 prompt 在左缘，该轮步骤右移 18px 并带一条 0.5px 引线）→ Tasks 区（整条 30px 头部都是折叠命中区）。回合之间没有卡片/色块/计数头；没有 goal banner、状态带或抽屉分段控件。
3. **右侧时间 gutter**：相对时间不是标题后缀——每行尾部预留 56px 固定列，右对齐、`tabular-nums`、`margin-left:auto` 推到面板右缘，形成一条时间轴；失败告警 glyph 放在时间左侧，不影响列的右缘。
4. **安静的文字层级**：12px 常规字重，人类输入/agent 文本 `label-primary`，机器步骤 `label-secondary`，边界（turn/job/wait）`label-tertiary`，lifecycle `label-dimmed`；失败行只把标题和 glyph 换成 `state-error`，不加底色、不加左条。shell 命令与展开的 payload 用 `--dsh-font-family-code`，detail 11px、左侧 0.5px 引线，无卡片底色。

Tasks 区是 devin 的 footer：`bg-layer-1` + 上边框，30px 头部（`DisclosureRow`：checklist 图标 + `Tasks` + 右侧 56×3px 进度条 + `N/M done`），任务行 26px（完成绿勾 / 进行中宿主 spinner / 待办空心圈 + `#n` + 12px 文本 + 右侧完成时间）。完成时间取自事件流中该任务首次以 `completed` 出现在 `todo/write` 快照的时间；窗口内没有就只写 `完成`，不伪造。进度条是唯一本地 primitive，已在 [DESIGN §10](../../docs/specs/dsh-nano-ui/DESIGN.md) 登记 `nano-ui-exempt`。

颜色只用 `--dsw-alias-*`，间距/层级用 `--nano-space-*`/`NANO_LAYER`（本包只用到 z-index 1）。禁止十六进制色值、`rgb()` 字面量和 unicode 图标；`.npr-row-content > span` 只做截断（宿主 `TextShimmer` 把字串放在两层 span 里），不改宿主结构。

构建与静态检查：`node ../../scripts/check-ui-rules.mjs` 的 `NPR` 行应保持 0 警告；`test/view.test.mjs` 会在源码层拦下手绘 SVG／色值／手写状态栏。

## 构建

仅当「交付物」里的运行时文件缺失，或你刚改了 `src/`。

在本包目录执行：

```bash
npm install
npm run build
```

然后确认 `lib/host.js`、`lib/client.js` 与 `lib/perf-declaration.js` 非空。不要安装一份缺少这些文件、又不是你刚刚构建的树。

## 故障

| 现象 | 原因 | 处理 |
|---|---|---|
| `dsh plugin add` 报引擎不符 | `engines.dsh` 与正在跑的 dsh 不一致 | 换符合范围的 dsh，或在操作者明确接受风险后执行命令输出里的 `allow-version`。不要改本包的 `engines` |
| `lib/client.js` 缺失 | 没构建就安装 | 走「构建」，确认文件非空后再安装 |
| 页面里没有 Progress 标签 | 宿主没重启，或包名没进 `dsh.profile.bundles` | 确认 bundles 后重启宿主并刷新。不要只写 dependencies |
| 时间线只有提示没有工具行 | 该会话还没有 tool/call 事件，不是坏 | 在会话里跑一次 bash 再看 |
| 过滤条输入后没有行 | token 把行全滤掉了 | 清空过滤条（toolbar 右侧 ×），或删掉否定词 |

## 不要

- 不要在工作流之外批量切换其它会话的 tab；本包只投影当前会话。
- 不要把 `cordis.patch.yml` 的 `name` 改成绝对路径再分发。
- 不要自己写状态/标题栏、图标或色值：标题归层主 tab，颜色归 token，图标归 catalog。
- 不要给行加底色、左侧状态条、600 字重或 icon chip；不要恢复 goal banner、回合分组头、状态带或 `SegmentedControl`——低干扰是验收项。
- 不要给 Tasks 伪造完成时间或 id：`TodoItem` 只有 `content` + `status`。完成时间只能取事件流里首次 `completed` 的 `todo/write` 时间（`task-times.js`）。
- 不要手写协议：会话事件、`todos` 投影、`jobs` 状态、相对时间都走宿主接缝；非零退出码按宿主语义不算 tool 失败，展开的 payload 里保留原始输出。
- 不要在 ProgressBody 里嫁接宿主 DOM（`[class*=]`、`:has()`、hash-class 发现）；只用自己的 `npr-` 前缀类和 `--dsw-alias-*` token。
- 不要把 `context/` 或本机手册当成安装步骤。它们不在这个包里。
