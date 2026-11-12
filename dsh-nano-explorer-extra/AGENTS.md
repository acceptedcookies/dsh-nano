# dsh-nano-explorer-extra

只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
装好的标志：Web 的「文件」页被这个插件接管，树底部出现状态栏。

## 身份

| 项 | 值 |
|---|---|
| 包名 | `dsh-nano-explorer-extra` |
| 插件 id | `nano-explorer-extra` |
| 版本 | 读 `package.json` 的 `version`，不要写死 |
| dsh 引擎 | 读 `package.json` 的 `engines.dsh` |
| 平台 | 仅 web |
| 宿主入口 | `index.js`（再导出 `lib/host.js`） |
| 浏览器入口 | `lib/client.js` |
| 宿主 inject | `fs`、`sessions`、`webServer`、`subprocess`、`sandbox`、`sandboxPolicy`、`connection`、`sessionPersistence` |

缺任何一个宿主 inject，插件在启动时失败，而不是单次请求失败。

## 交付物

| 路径 | 角色 |
|---|---|
| `package.json` | 包名、`engines.dsh`、`files`、bundle patch、`dsh.client.inject` |
| `cordis.patch.yml` | 插入插件 id。`name` 是包名。并把 `ui-context-menu` 的 `resolutionTimeoutMs` 调到 4000 |
| `index.js` | 宿主入口。运行时必需 |
| `lib/host.js` | 宿主实现。运行时必需 |
| `lib/client.js` | 浏览器包，接管文件页。运行时必需。安装时不重建 |
| `icon.svg`、`locale/` | 图标与中英文案 |
| `src/` | 作者树。运行中的 dsh 不读它 |

client inject 以 `package.json` 的 `dsh.client.inject` 为准，不在这里抄。两份 `lib/` 缺一不可，而且都必须是构建产物。

## 前置

1. `dsh --version` 落在 `package.json` 的 `engines.dsh` 内。不够或过高就停。不要自行放宽，除非操作者明确接受命令输出里的那一对版本。
2. `pnpm` 在 PATH 上。`dsh plugin` 只是把参数转给 profile 里的 pnpm。
3. 目标是已经能打开的 Web profile，默认名 `web`。不要装进 headless、sdk 或 acp。
4. `git` 必须在跑宿主的那台机器的 PATH 上。浏览器里没有 git 不影响。状态栏读的是宿主上的仓库。
5. 本包构建期依赖 `dsh-nano-ui`，声明为 `devDependencies` 的 `file:../packages/dsh-nano-ui`。`npm install`/`npm run build` 时解析这个相对路径；构建时它被打进 `lib/client.js`，运行中的页面不单独加载它。不要改这条依赖。tarball 只含构建产物，`dsh plugin add` 不再需要旁边的 `packages/` 目录。
6. 本包还构建期依赖 `dsh-performance-review`，同样声明为 `devDependencies` 的 `file:`，约束同上。它被打进 `lib/client.js` 和 `lib/host.js` 两份产物；默认是恒等包装，只有页面带 `?perf-review=1` 或 `localStorage['dsh-perf-review']='1'`、宿主带 `DSH_PERF_REVIEW=1` 时才采集。不要改这条依赖。
7. 本包还构建期依赖路由注册库 `dsh-host-route-guard`，同样声明为 `devDependencies` 的 `file:`，约束同上。构建把它与本插件 16 条路由行的烤入常量表一起打进 `lib/host.js`；全部 web 路由经它注册，Host/Origin 围栏与 405 在 guard 内。不要改这条依赖。

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
3. 打开一个有工作目录的会话，右侧栏进入「文件」。树能列出目录。
4. 树底部有状态栏。Git 仓库里是分支名和待提交数；不是仓库则是「未初始化 Git 仓库」。只有树、没有状态栏，说明宿主没挂上，或偏好关掉了状态栏。右下角齿轮能打开设置，其中有「显示系统文件」，默认关。

## 初次运行

无数据库，也没有第一次启动迁移。宿主配置可整段省略。浏览器偏好在用户第一次打开文件页时写入 `localStorage`，键是 `dsh-nano-explorer-extra:prefs.v2`。

## 使用

会话的工作目录就是这棵树的根。没有工作目录时，页内只有「这个会话没有工作目录」，不要发文件操作。换会话或换工作目录时，打开的卡片会关掉，不会把上一个仓库的内容带过去。

| 动作 | 结果 |
|---|---|
| 单击文件 | 内置预览。单击目录仍是展开或收起 |
| 双击 | 默认不做第二件事。不要同时打开「单击预览」和「双击预览」，一次双击会开两次 |
| 右键一行 | 在 Finder 中显示、复制绝对路径、复制相对路径、重命名、删除。有改动的文件多一项「查看差异」：打开实验性 forge 面板的原生 diff tab（需在插件页启用「变更请求与工作树」） |
| 顶栏新建文件或文件夹 | 先问名字，确认后才落盘 |
| 底部分支按钮 | 仓库视图：多车道彩色提交图（亮段=未推送、暗段=已推送）、工作树列表、拉取、推送、仓库设置（远端地址与提交署名）。切换分支先确认，成功后「当前」跟着变。状态栏的 `!` 会列出冲突路径，并在解决前禁用切换。卡片沉在文件区底部，不会跑到工作区外面 |
| 底部提交 | 只看本地工作区：已暂存 / 未暂存 / 未跟踪 / 冲突。确认后 `git add --all` 再提交。有冲突时按钮不可用。`Ctrl+Enter` 同样会提交。这里没有提交图，也没有拉取 |
| 分支卡片里的拉取 | `git pull --ff-only`。不能快进就失败并显示 Git 原文，不会自动产生合并提交 |
| 顶栏刷新 | 重读目录和整仓 Git 状态。不重算右下角的文件数量和体积 |
| 右下角齿轮 | 只改这一台浏览器的显示 |

行尾字母：`M` 修改，`A` 新增，`D` 删除，`R` 重命名，`U` 冲突，`?` 未跟踪。默认不显示 `.git` 和 `.DS_Store`。其他点开头的名字照常显示。软链接当作普通条目跟随。

用户没明确要求时，不要提交、拉取、切分支或删除。

路由前缀 `/nano-explorer-extra`。请求带会话 id，路径相对该会话的工作目录。POST 正文是 JSON，最大 64KB。都有 `connection.requestRejection`。不要绕过文件页去批量改用户的仓库，除非用户要求的就是那个文件操作。

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/status?sessionId=` | 整仓 Git 状态。`only=stats` 返回体积：数据来自宿主后台采样缓存（30min 新鲜期、两次遍历至少隔 60s），响应恒定毫秒级；未就绪时 `statsPending:true`、客户端短延迟重询，`stats` 字段始终给上一次完成的值或 null，`statsAgeMs` 为缓存年龄。`path=` 只查一个目录（scoped 读不跑 branches/history/remotes 等全仓套件） |
| GET | `/perf-review/host` | 性能观测宿主快照。带 `mode=window` 时排空并返回「上次调用以来的场景窗口」（实验室用），默认返回累计快照。宿主没开 `DSH_PERF_REVIEW=1` 时 `enabled` 为 false，路由仍返回 200 |
| POST | `/list` | `{ sessionId, path }` |
| POST | `/commit` | `{ sessionId, message }`。会 `git add --all`。没有「只提交已暂存」 |
| POST | `/pull` | `{ sessionId }`。快进拉取 |
| POST | `/push` | `{ sessionId, remote? }`。有上游走 `git push`；无上游时 `remote` 必填，走 `git push -u <remote> HEAD` 并绑定 |
| POST | `/remote` | `{ sessionId, op, name, url? }`。`op` 为 `add`/`set-url`/`remove`，改写 `.git/config` 后返回新远端列表 |
| POST | `/author` | `{ sessionId, name?, email? }`。写本仓库 `user.name`/`user.email`（local，不动 global），两者至少给一个 |
| POST | `/checkout` | `{ sessionId, branch }`。分支名不能以 `-` 开头 |
| POST | `/create-file` | `{ sessionId, directory, name }` |
| POST | `/create-folder` | `{ sessionId, directory, name }` |
| POST | `/rename` | `{ sessionId, path, name, kind }`。`kind` 为 `file` 或 `directory` |
| POST | `/delete` | `{ sessionId, path, kind }`。不能删除工作区根 |
| POST | `/ignored` | `{ sessionId, paths }` |
| POST | `/read` | `{ sessionId, path }`。不超过 1MB 的 UTF-8 文本 |

## 配置与状态

宿主配置可选，写在 profile 的 patch 里，不写在本包。省略则用这些默认值。整数越界退回默认。`gitCommand` 必须是非空字符串。不要用宿主配置隐藏文件；显示与否是浏览器偏好。

```yaml
- id: nano-explorer-extra
  config:
    gitCommand: git
    gitTimeoutMs: 30000
    maxGitOutputBytes: 8388608
    statsMaxDepth: 32
    statsMaxEntries: 50000
    statsDebounceMs: 2000
    statsExcludeGit: true
    symlinkMaxHops: 16
    listingMaxEntries: 2000
```

浏览器键：`localStorage['dsh-nano-explorer-extra:prefs.v2']`。只在打开 Web 的那一个浏览器里，不进宿主。重装也不清掉。不要把用户已有的 v2 覆盖成默认值。

| 键 | 默认 | 作用 |
|---|---|---|
| `openPreviewOnClick` | `true` | 单击文件打开预览 |
| `openPreviewOnDoubleClick` | `false` | 双击文件打开预览 |
| `showOpenButton` | `true` | 行尾打开按钮 |
| `showIgnoredBadge` | `false` | 被 gitignore 的行显示角标 |
| `showGitStatus` | `true` | 树上的 Git 颜色和状态栏里的 Git |
| `showStatusBar` | `true` | 底部整条状态栏 |
| `statsExcludeGit` | `true` | 统计体积时跳过 `.git` |
| `showSystemFiles` | `false` | 为 `true` 时显示 `.git` 和 `.DS_Store` |

旧键 `dsh-nano-explorer-extra:prefs.v1` 只在 v2 不存在时读一次。单击 / 双击两个键故意丢掉，其余布尔值保留。

## 构建

仅当「交付物」里的运行时文件缺失，或你刚改了 `src/`。

在本包目录执行：

```bash
npm install
npm run build
```

然后确认运行时文件非空。不要安装一份缺少这些文件、又不是你刚刚构建的树。

## 故障

| 现象 | 原因 | 处理 |
|---|---|---|
| `dsh plugin add` 报引擎不符 | `engines.dsh` 与正在跑的 dsh 不一致 | 换符合范围的 dsh，或在操作者明确接受风险后执行命令输出里的 `allow-version`。不要改本包的 `engines` |
| pnpm 找不到 `dsh-nano-ui` | `../packages/dsh-nano-ui` 不存在 | 按「前置」放好，不要改依赖声明 |
| `lib/host.js` 或 `lib/client.js` 缺失 | 没构建就安装 | 走「构建」，确认两个文件非空后再安装 |
| profile 里有依赖，页面里没有增强 | 宿主没重启，或包名没进 `dsh.profile.bundles` | 确认 bundles 后重启宿主并刷新。不要只写 dependencies |
| 有文件树，底部没有状态栏 | 宿主没挂上，或偏好关掉了状态栏 / Git | 查宿主日志里 `nano-explorer-extra` 是否 inject 失败；再看 `showStatusBar` 和 `showGitStatus` |
| 状态栏写「未初始化 Git 仓库」 | 这个会话的目录不是 Git 仓库，或宿主上没有 `git` | 不是安装失败 |
| 底部已是 0，某一行仍有字母 | 展开目录时的补充状态过期 | 按顶栏刷新。不要为此重装 |
| 菜单很慢或报未能完成 | 原生「用应用打开」探测超过预算 | 本包已把 `resolutionTimeoutMs` 调到 4000。不要改回 1000 |

## 不要

- 不要在用户没要求时调用 `/commit`、`/pull`、`/checkout`、`/delete`。
- 不要用切换分支去打开另一个检出。分支按钮只换当前工作树里的分支。
- 不要把 `cordis.patch.yml` 的 `name` 改成绝对路径再分发。
- 不要同时打开单击预览和双击预览。
- 不要把 `context/` 或本机手册当成安装步骤。它们不在这个包里。
