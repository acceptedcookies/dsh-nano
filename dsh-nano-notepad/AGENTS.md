# dsh-nano-notepad

只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
装好的标志：按 `⌘E` 然后 `1`（Windows 为 `Ctrl+E` 然后 `1`）打开悬浮记事本。两键是先后按下，不是同时按住。

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
| `icon.svg`、`locale/` | 图标与中英文案 |
| `src/` | 作者树。已有 `lib/client.js` 时安装不需要它 |

client inject 以 `package.json` 的 `dsh.client.inject` 为准，不在这里抄。

## 前置

1. `dsh --version` 落在 `package.json` 的 `engines.dsh` 内。不够或过高就停。不要自行放宽，除非操作者明确接受命令输出里的那一对版本。
2. `pnpm` 在 PATH 上。`dsh plugin` 只是把参数转给 profile 里的 pnpm。
3. 目标是已经能打开的 Web profile，默认名 `web`。不要装进 headless、sdk 或 acp。
4. 无。宿主不需要 git 或其他外部命令。
5. 本包依赖 `dsh-nano-ui`，声明为 `file:../packages/dsh-nano-ui`。`dsh plugin add` 时 pnpm 会解析这个相对路径，目录必须是 `<parent>/packages/dsh-nano-ui` 与 `<parent>/<本包>`。不要改这条依赖。运行中的页面不单独加载它，构建时它被打进 `lib/client.js`。

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
3. 按 `⌘E` 然后 `1`（Windows 为 `Ctrl+E` 然后 `1`）。浮层打开。
4. 该浏览器源出现 IndexedDB 库 `dsh-nano-notepad`。快捷键无反应时，先确认包内有 `lib/client.js`，再重启一次。不要另找一条安装路径。

## 初次运行

无宿主初始化命令。记事本挂上页面时就打开库，不必先按快捷键。

- 库名 `dsh-nano-notepad`，schema 3，每个浏览器源一个库。
- 该源没有文件时创建 `untitled.md` 并打开。
- 草稿在浏览器里自动保存。版本按面板里的间隔拍摄（默认 3600 秒），也可手动保存版本。
- 卸载不删除这个库。重装后笔记还在。

宿主 `Config` 只提供首次默认：`saveDelayMs` 800、`commitIntervalSec` 60、`versionLimit` 50、`imageLimitBytes` 5MB、`defaultView`（`rendered` 或 `source`）、`theme`（`dark`、`light` 或 `system`）。越界值被拒绝。面板保存过一次之后，以面板设置为准。面板默认的自动版本间隔是 3600 秒，不是宿主的 60。

## 使用

| 动作 | 结果 |
|---|---|
| 圆形启动器，或 `⌘E` 然后 `1` | 开关浮层。Windows 为 `Ctrl+E` 然后 `1` |
| Markdown | 源码与预览 |
| `.json` | 保留后缀，打开树和 JSON 工具 |
| 笔记内图片 | png、jpeg、gif、webp，存在同一个库 |

页面里的 agent，且这个记事本已经打开过一次：

```js
await window.__nanoNotepad.import(name, content, meta)
```

- `name`：`.md`、`.markdown`、`.json` 保留。其他后缀改存为 `.md`。
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
