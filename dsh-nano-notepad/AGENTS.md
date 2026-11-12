# dsh-nano-notepad

只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
装好的标志：按 `⌘E` 然后 `1`（Windows 为 `Alt+E` 然后 `1`，`Ctrl+E` 然后 `1` 同样有效）打开悬浮记事本。两键是先后按下，不是同时按住。

## 身份

| 项 | 值 |
|---|---|
| 包名 | `dsh-nano-notepad` |
| 插件 id | `nano-notepad` |
| 版本 | 读 `package.json` 的 `version`，不要写死 |
| dsh 引擎 | 读 `package.json` 的 `engines.dsh` |
| 平台 | 仅 web |
| 宿主入口 | `index.js` |
| 浏览器入口 | `lib/client.js` |
| 宿主 inject | `webServer`、`connection`、`subprocess` |

## 交付物

| 路径 | 角色 |
|---|---|
| `package.json` | 包名、`engines.dsh`、`files`、bundle patch、`dsh.client.inject` |
| `cordis.patch.yml` | 插入插件 id。`name` 是包名 |
| `index.js` | 宿主。运行时必需 |
| `lib/client.js` | 浏览器包。运行时必需。安装时不重建 |
| `lib/perf-review-host.js` | 宿主 perf-review bundle。运行时必需（`index.js` 相对 import） |
| `lib/s3-sync-host.js` | 宿主 S3 签名代理 bundle。运行时必需（宿主 `index.js` 相对 import） |
| `lib/route-guard.js` | 路由注册 guard bundle。运行时必需（宿主 `index.js` 相对 import） |
| `lib/route-table.js` | 烤进的插件路由表常量。运行时必需（宿主 `index.js` 相对 import） |
| `lib/mp-sanitize.js` | 宿主 mp 文章消毒器 bundle（dsh-html-policy 的 `sanitizeHtml`）。运行时必需（宿主 `index.js` 相对 import） |
| `icon.svg`、`locale/` | 图标与中英文案 |
| `src/` | 作者树。已有 `lib/client.js` 时安装不需要它 |

client inject 以 `package.json` 的 `dsh.client.inject` 为准，不在这里抄。

## 前置

1. `dsh --version` 落在 `package.json` 的 `engines.dsh` 内。不够或过高就停。不要自行放宽，除非操作者明确接受命令输出里的那一对版本。
2. `pnpm` 在 PATH 上。`dsh plugin` 只是把参数转给 profile 里的 pnpm。
3. 目标是已经能打开的 Web profile，默认名 `web`。不要装进 headless、sdk 或 acp。
4. 无。宿主不需要 git 或其他外部命令。
5. 本包构建期依赖 `dsh-nano-ui`，声明为 `devDependencies` 的 `file:../packages/dsh-nano-ui`。`npm install`/`npm run build` 时解析这个相对路径；构建时它被打进 `lib/client.js`，运行中的页面不单独加载它。不要改这条依赖。tarball 只含构建产物，`dsh plugin add` 不再需要旁边的 `packages/` 目录。
6. 本包还构建期依赖 `dsh-performance-review`，同样声明为 `devDependencies` 的 `file:`，约束同上。它被打进 `lib/client.js`，宿主侧另由构建生成 `lib/perf-review-host.js` 供 `index.js` 相对 import；两份产物默认是恒等包装，只有页面带 `?perf-review=1` 或 `localStorage['dsh-perf-review']='1'`、宿主带 `DSH_PERF_REVIEW=1` 时才采集。不要改这条依赖。
7. 本包还构建期依赖宿主库 `dsh-s3-client`，同样声明为 `devDependencies` 的 `file:`，约束同上。宿主侧由构建生成 `lib/s3-sync-host.js` 供 `index.js` 相对 import（开发实例只拷贝 `lib/`、不拷贝 `node_modules`，所以必须 bundle）。它提供 SigV4 签名、令牌桶限速与用量账本；密钥只在宿主，不进浏览器。多端点配置存 `${DSH_HOME}/nano-notepad-s3.json`（0600），首次启动从环境变量 `S3_NOTEPAD_*` / `${DSH_HOME}/nano-notepad.env` 种子；之后在设置「云同步」tab 内填写、新增、切换。切换端点经过「本地为真源 → 预检差异 → 一致性确认 → 策略执行 → 提交或回滚」，宿主用 `pending` 记录保证崩溃时回滚。不要改这条依赖。
8. 本包还构建期依赖路由注册库 `dsh-host-route-guard`，同样声明为 `devDependencies` 的 `file:`，约束同上。宿主侧由构建生成 `lib/route-guard.js` 与 `lib/route-table.js`（烤进本插件 7 条路由行的常量表）供 `index.js` 相对 import；全部 web 路由经它注册，Host/Origin 围栏与 405 在 guard 内。不要改这条依赖。
9. 本包还构建期依赖共享消毒策略库 `dsh-html-policy` 与远程数据 schema `dsh-remote-data-schema`，同样声明为 `devDependencies` 的 `file:`，约束同上。前者同一张 allowlist 表驱动两个 renderer：客户端 `sanitizeRichHtml`（进 `lib/client.js`）与宿主 `sanitizeMpHtml`（构建生成 `lib/mp-sanitize.js` 供 `index.js` 相对 import）；后者客户端侧消费它的 `./image-check.js`（无 Buffer 的图片载荷门禁，进 `lib/client.js`）。不要改这两条依赖。

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
3. 按 `⌘E` 然后 `1`（Windows 为 `Alt+E` 然后 `1`）。浮层打开。
4. 该浏览器源出现 IndexedDB 库 `dsh-nano-notepad`。快捷键无反应时，先确认包内有 `lib/client.js`，再重启一次。不要另找一条安装路径。

## 初次运行

无宿主初始化命令。记事本挂上页面时就打开库，不必先按快捷键。

- 库名 `dsh-nano-notepad`，schema 4，每个浏览器源一个库（v4 增加 `sync` 云同步游标 store；旧库平滑升级，不丢笔记）。
- 该源没有文件时创建 `untitled.md` 并打开。
- 草稿在浏览器里自动保存。版本按面板里的间隔拍摄（默认 3600 秒），也可手动保存版本。
- 卸载不删除这个库。重装后笔记还在。

宿主 `Config` 只提供首次默认：`saveDelayMs` 800、`commitIntervalSec` 60、`versionLimit` 50、`imageLimitBytes` 5MB、`defaultView`（`rendered` 或 `source`）、`theme`（`dark`、`light` 或 `system`）。越界值被拒绝。面板保存过一次之后，以面板设置为准。面板默认的自动版本间隔是 3600 秒，不是宿主的 60。

## 使用

| 动作 | 结果 |
|---|---|
| 圆形启动器，或 `⌘E` 然后 `1` | 开关浮层。Windows 为 `Alt+E` 然后 `1`（Alt 与 Mac 的 ⌘ 同键位）；`Ctrl+E` 然后 `1` 仍可用作回退 |
| 任意文本（`.env`、`.yaml`、`.sh`…） | 源码编辑；仅 `.md` / `.markdown` 提供 Markdown 预览与格式工具栏 |
| `.json` | 保留后缀，打开树和 JSON 工具 |
| 笔记内图片 | png、jpeg、gif、webp，存在同一个库 |
| 源码视图里鼠标悬浮 `![…](notepad-image:…)` | 弹出小窗预览该图。仅 `.md` / `.markdown`，预览视图不弹 |

页面里的 agent，且这个记事本已经打开过一次：

```js
await window.__nanoNotepad.import(name, content, meta)
```

- `name`：**原样保留任意后缀**（`.env`、`config.yaml`、`script.sh`、无后缀均可）。记事本是文本编辑器，不会追加或改写扩展名。**同名未 pin 的文件会被直接覆盖**（旧草稿先存成一个版本，可在历史里找回），不会造第二份；只有当同名文件已 pin、或同名是个文件夹时，才落 `-2` 新副本。Markdown 只是可选的渲染视图，仅 `.md` / `.markdown` 提供预览与 Markdown 工具栏。
- `content`：整篇草稿字符串。
- `meta.sourcePath`：可选，记在节点上，不写该路径。

调用在笔记存在且成为当前标签后 resolve。没有 MCP，也没有笔记 CLI。

`POST /nano-notepad/save` 只是 macOS「另存为」对话框。它不是存储，也不是导入。正文上限 8MB。必须是已经通过鉴权的 Harness 页面请求。

## 配置与状态

宿主配置可整段省略。要写就写在 profile 的 patch 里，不写在本包。键和默认值见「初次运行」。

浏览器状态在 IndexedDB `dsh-nano-notepad`，不在宿主文件系统。不要覆盖用户已有的库，除非操作者明确要求清空笔记。

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
| 快捷键无反应 | client 没进页面，或宿主没重启 | 查 bundles 与 `lib/client.js`，重启宿主再刷新 |
| 装进了非 web profile | 那些界面没有浮层 | 改装 `web` |
| `dsh plugin add` 报引擎不符 | `engines.dsh` 与正在跑的 dsh 不一致 | 换符合范围的 dsh，或在操作者明确接受风险后执行命令输出里的 `allow-version`。不要改本包的 `engines` |
| pnpm 找不到 `dsh-nano-ui` | `../packages/dsh-nano-ui` 不存在 | 按「前置」放好，不要改依赖声明 |

## 不要

- 不要装进非 web profile 后期待出现窗口。
- 不要到宿主文件系统找笔记。笔记不在那里。
- 不要把 Excel、Word 或 PowerPoint 当成可打开的格式。
- 不要删除该浏览器源的数据，除非操作者明确要求清空笔记。
- 不要把 `context/` 或本机手册当成安装步骤。它们不在这个包里。
