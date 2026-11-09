# dsh-nano-model-selector

只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
装好的标志：composer 出现 `.nms-trigger`，并且 `/imagine` 已经注册。

## 身份

| 项 | 值 |
|---|---|
| 包名 | `dsh-nano-model-selector` |
| 插件 id | `nano-model-selector` |
| 版本 | 读 `package.json` 的 `version`，不要写死 |
| dsh 引擎 | 读 `package.json` 的 `engines.dsh` |
| 平台 | 仅 web |
| 宿主入口 | `index.js` |
| 浏览器入口 | `lib/client.js` |
| 宿主 inject | `llm`、`webServer`、`connection`、`skills` |

## 交付物

| 路径 | 角色 |
|---|---|
| `package.json` | 包名、`engines.dsh`、`files`、bundle patch、`dsh.client.inject` |
| `cordis.patch.yml` | 插入插件 id。`name` 是包名 |
| `index.js` | 宿主。运行时必需。目录路由、媒体路由、`imagine` 注册 |
| `lib/host-media.js` | 引擎探测、状态读写、技能正文。运行时必需。`index.js` 直接 import 它 |
| `lib/client.js` | 浏览器包。运行时必需。安装时不重建 |
| `icon.svg`、`locale/` | 图标与中英文案 |
| `src/` | 作者树。已有上面的 `lib/` 时安装不需要它 |

client inject 以 `package.json` 的 `dsh.client.inject` 为准，不在这里抄。`files` 必须含 `lib/host-media.js` 和这份 `AGENTS.md`，否则发包后宿主找不到模块。

## 前置

1. `dsh --version` 落在 `package.json` 的 `engines.dsh` 内。不够或过高就停。不要自行放宽，除非操作者明确接受命令输出里的那一对版本。
2. `pnpm` 在 PATH 上。`dsh plugin` 只是把参数转给 profile 里的 pnpm。
3. 目标是已经能打开的 Web profile，默认名 `web`。不要装进 headless、sdk 或 acp。
4. 图片生成需要本机 CLI。没有也能装：`/imagine` 会注册成引导 stub。探测顺序见「初次运行」。
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
3. composer 出现 `.nms-trigger`。rail 上有「全部」「收藏」「媒体生成」。
4. 已登录页面里 `GET /nano-model-selector/catalog` 返回 200 JSON。裸 curl 被拒是鉴权，不是没装上。composer 输入 `/i` 能看到 `imagine`。

## 初次运行

插件激活时注册 `imagine`。安装方不用再做初始化。

```
media-engine.json 里的显式选择
  → 自动挑选第一个检测到的引擎（grok 优先）
  → 引导 stub（没有引擎时 /imagine 仍在，内容是引导）
```

| 引擎 | 探测（按顺序） | 状态 |
|---|---|---|
| `grok` | `~/.grok/bin/grok`、`~/.local/bin/grok`、PATH 上的 `grok` | 可用 |
| `codex` | `~/.codex/bin/codex`、`~/.local/bin/codex`、PATH 上的 `codex` | 占位，未实测 |

显式预置不是第二条安装路径。在线：已登录页面 `PUT /nano-model-selector/media-engine`，正文 `{"engine":"grok"}`，成功后立刻重注册技能。离线：把 `{"engine":"grok"}` 写到「配置与状态」的状态文件，然后重启宿主。`engine` 只能是 `grok` 或 `codex`，否则丢弃并回到自动挑选。

## 使用

| 动作 | 结果 |
|---|---|
| 点 `.nms-trigger` | 三栏面板：分组、模型卡片、详情与 effort |
| 「媒体生成」 | 扫描并选择本机图片 CLI |
| composer 里 `/imagine` | 把所选引擎的命令模板注入会话 |

技能要求会话 agent：`mkdir -p imagine`，用 kebab-case 文件名，按模板执行，核对产物非空并汇报相对路径。grok 模板形如 `<binary> -p "<prompt>. Save the image file to <out>" --always-approve --cwd "<cwd>"`。首次执行会申请一次 `danger-full-access`，因为 grok 要写 `~/.grok`。用户没要求就不要跑。

路由都有 `connection.requestRejection`。裸调用被拒不是故障。

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/nano-model-selector/catalog` | 给浏览器的模型目录 |
| GET | `/nano-model-selector/media-engines` | `{ engines: [{key,label,detail,path,available}] }` |
| GET | `/nano-model-selector/media-engine` | `{ engine, explicit }`。`explicit: false` 表示自动挑选，未持久化 |
| PUT | `/nano-model-selector/media-engine` | 正文 `{"engine":"<key>"}`。写入状态文件并重注册 `imagine`。正文上限 16384 字节 |

## 配置与状态

无宿主 Config。

状态文件在 `$DSH_DATA_DIR`，否则 `$DSH_HOME`，否则 `~/.dsh`，其下 `plugins/nano-model-selector/media-engine.json`。卸载不删这个文件。整目录重建会丢掉显式选择；`/imagine` 仍在，只是回到自动挑选。

浏览器另有 `localStorage` 键 `dsh-nano-model-selector:media-engine.v1`，只是缓存。不要覆盖用户已有的状态文件。

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
| 页面没有选择器 | patch 或 `lib/client.js` 不在包内，或宿主没重启 | 补齐后重启宿主并刷新 |
| 启动报找不到 `lib/host-media.js` | 运行时文件没进包 | 确认 `files` 含 `lib/host-media.js` 后重装 |
| catalog 或 media 返回 302 或被拒 | 没带已登录页面的会话 | 正常。用已登录页面验证 |
| `/imagine` 写着 no media engine configured | 本机没有 grok 或 codex | 装 CLI，或在「媒体生成」里选已检测到的引擎 |
| grok 被沙箱拦住 | 要写 `~/.grok` | 用户批准一次 `danger-full-access` |
| `dsh plugin add` 报引擎不符 | `engines.dsh` 与正在跑的 dsh 不一致 | 换符合范围的 dsh，或在操作者明确接受风险后执行命令输出里的 `allow-version`。不要改本包的 `engines` |
| pnpm 找不到 `dsh-nano-ui` | `../packages/dsh-nano-ui` 不存在 | 按「前置」放好，不要改依赖声明 |

## 不要

- 不要把本目录拷进 `$DSH_HOME/plugins/` 当作安装。那不是这条合同。
- 不要用裸 curl 判定路由失败。请求必须带已登录页面的会话。
- 不要在用户没要求时执行 `/imagine`。
- 不要把 `context/` 或本机手册当成安装步骤。它们不在这个包里。
