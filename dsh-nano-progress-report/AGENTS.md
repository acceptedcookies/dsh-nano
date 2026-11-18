# dsh-nano-progress-report

只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
装好的标志：会话右侧栏「+」菜单和「Progress」标签里出现执行事件时间线，过滤器、Tasks 面板可用。

## 身份

| 项 | 值 |
|---|---|
| 包名 | `dsh-nano-progress-report` |
| 插件 id | `nano-progress-report` |
| 版本 | 读 `package.json` 的 `version`，不要写死 |
| dsh 引擎 | 读 `package.json` 的 `engines.dsh` |
| 平台 | 仅 web |
| 宿主入口 | `index.js`（无宿主路由、无宿主状态） |
| 浏览器入口 | `lib/client.js` |
| 宿主 inject | `slots`、`locale`、`sessions`、`sidebarRight`、`sidebarRightTabs`、`uiConversation`、`uiSession`、`jobs` |

缺任何一个宿主 inject，插件在启动时失败，而不是单次请求失败。

## 交付物

| 路径 | 角色 |
|---|---|
| `package.json` | 包名、`engines.dsh`、`files`、bundle patch、`dsh.client.inject` |
| `cordis.patch.yml` | 插入插件 id。`name` 是包名 |
| `index.js` | 宿主入口（空壳，插件全部工作在浏览器侧）。运行时必需 |
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
3. 打开任一会话，右侧栏「+」菜单里有「Progress」，右栏 tab 菜单里也有「打开 Progress」。点开得到 `[data-nano-progress-report]` 根节点。
4. 已运行过 tool 调用的会话在 Progress 里能看到按时间排序的事件行（提示、shell、文件、工具、todo、turn），底部 Tasks 面板与 `todo/write` 同步。

## 初次运行

无数据库，也没有第一次启动迁移。Progress 标签默认不自动打开：从「+」菜单或 tab 菜单打开一次后，`sidebarRight` 自己记住它。

## 使用

时间线的数据真源是会话事件流（`uiConversation` 的 `progress` target），不是 DOM 抓取，也不是宿主私有状态。过滤条是自由文本加 `type:`/`status:`/`tool:` 词法：词与词 AND，`-` 前缀取反，未知 token 退化成文本。

| 动作 | 结果 |
|---|---|
| 在过滤条输入 `type:shell` | 只剩 shell 行 |
| `-status:failed` | 排除失败行；`status:failed` 只看失败 |
| `tool:bash` | 只看 bash 的 tool/call 行（wire 名精确匹配；bash 的 approval 行也归 bash）；`-tool:bash` 排除 bash |
| 点击行首展开箭头 | 打开该行 detail（args 原文、result、subagent 的 PTC 子调用） |
| 「Load older」 | 调 `session.loadOlder()`，时间线向前翻页 |
| 底部 Tasks 面板 | 读 `session.projections.faceOf('todos')`，含 0/N 完成度条 |
| 底部 Jobs 面板（仅当有 job） | 读 `ctx.jobs.state.rows[sessionId]`，先 `watchRows` 订阅 |

## 配置与状态

宿主配置：无。

浏览器键：`localStorage['dsh-nano-progress-report:filter:<sessionId>']`，存最近一次过滤条文本，按会话+浏览器记忆，不进宿主。

## 构建

仅当「交付物」里的运行时文件缺失，或你刚改了 `src/`。

在本包目录执行：

```bash
npm install
npm run build
```

然后确认 `lib/client.js` 与 `lib/perf-declaration.js` 非空。不要安装一份缺少这些文件、又不是你刚刚构建的树。

## 故障

| 现象 | 原因 | 处理 |
|---|---|---|
| `dsh plugin add` 报引擎不符 | `engines.dsh` 与正在跑的 dsh 不一致 | 换符合范围的 dsh，或在操作者明确接受风险后执行命令输出里的 `allow-version`。不要改本包的 `engines` |
| `lib/client.js` 缺失 | 没构建就安装 | 走「构建」，确认文件非空后再安装 |
| 页面里没有 Progress 标签 | 宿主没重启，或包名没进 `dsh.profile.bundles` | 确认 bundles 后重启宿主并刷新。不要只写 dependencies |
| 时间线只有提示没有工具行 | 该会话还没有 tool/call 事件，不是坏 | 在会话里跑一次 bash 再看 |
| 过滤条输入后没有行 | token 把行全滤掉了 | 看过滤条下的 chips，删掉否定词 |

## 不要

- 不要在工作流之外批量切换其它会话的 tab；本包只投影当前会话。
- 不要把 `cordis.patch.yml` 的 `name` 改成绝对路径再分发。
- 不要在 ProgressBody 里嫁接宿主 DOM（`[class*=]`、`:has()`、hash-class 发现）；只用自己的 `npr-` 前缀类和 `--dsw-alias-*` token。
- 不要把 `context/` 或本机手册当成安装步骤。它们不在这个包里。
