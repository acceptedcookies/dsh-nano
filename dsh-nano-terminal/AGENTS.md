# dsh-nano-terminal

只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
装好的标志：输入 `/dnt` 选「新建 nano 终端标签页」，右栏出现 wasm 终端标签页，`curl http://<宿主>/dsh-nano-terminal/health` 返回 JSON。

## 身份

| 项 | 值 |
|---|---|
| 包名 | `dsh-nano-terminal` |
| 插件 id | `nano-terminal` |
| 版本 | 读 `package.json` 的 `version`，不要写死 |
| dsh 引擎 | 读 `package.json` 的 `engines.dsh` |
| 平台 | 仅 web |
| 宿主入口 | `index.js` |
| 浏览器入口 | `lib/client.js` |
| 宿主 inject | `webServer`、`subprocess`、`sessions`、`workingDirectory`、`commands` |

## 交付物

| 路径 | 角色 |
|---|---|
| `package.json` | 包名、`engines.dsh`、`files`、bundle patch、`dsh.client.inject` |
| `cordis.patch.yml` | 插入插件 id。`name` 是包名 |
| `index.js` | 宿主。运行时必需 |
| `lib/client.js` | 浏览器包。运行时必需。安装时不重建 |
| `lib/dnt-core.wasm` | wasm 终端核心。运行时必需（client 侧加载） |
| `lib/sessions.js` | 宿主 session 注册表。运行时必需（`index.js` 相对 import） |
| `lib/mcp.js` | 宿主 MCP 控制面。运行时必需（`index.js` 相对 import） |
| `lib/ws.js` | 宿主 WebSocket 握手与帧解析。运行时必需（`index.js` 相对 import） |
| `lib/mirror.js` | 宿主辅助模块。运行时必需（`index.js` 相对 import） |
| `icon.svg`、`locale/` | 图标与中英文案 |
| `src/`、`crates/`、`target/` | 作者树。已有 `lib/` 产物时安装不需要它们 |

client inject 以 `package.json` 的 `dsh.client.inject` 为准，不在这里抄。

## 前置

1. `dsh --version` 落在 `package.json` 的 `engines.dsh` 内。不够或过高就停。不要自行放宽，除非操作者明确接受命令输出里的那一对版本。
2. `pnpm` 在 PATH 上。`dsh plugin` 只是把参数转给 profile 里的 pnpm。
3. 目标是已经能打开的 Web profile，默认名 `web`。不要装进 headless、sdk 或 acp。
4. 无。宿主不需要外部命令；wasm 核心已打进 `lib/`。
5. 本包不依赖 `dsh-nano-ui`；构建产物自包含，`dsh plugin add` 不需要旁边的 `packages/` 目录。

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

卸载用 `dsh plugin --profile web remove`，参数是「身份」里的包名。没有 HMR 时同样要重启宿主。卸载不删除「配置与状态」里的宿主状态文件。

## 验收

按顺序。前一步失败就停，不要换一个 profile 重试。失败时先看该 profile 目录下 `.plugin-manager/logs` 里这次 `dsh plugin` 的日志。

1. profile 的 `package.json` 里，`dependencies` 和 `dsh.profile.bundles` 都有本包名。
2. 重启并刷新后，页面里能找到本包的 client 模块（包名）。找不到说明 client 没进页面。
3. 输入 `/dnt`，弹出选项有「新建 nano 终端标签页」；选中后右栏（[dsh工作台]）出现 nano 终端标签页，终端有输出。
4. `curl -s http://<宿主>/dsh-nano-terminal/health` 返回 JSON（含三条 lane 状态）。`localStorage['dnt.apply']` 出现 client 自检日志数组。

## 初次运行

无宿主初始化命令。宿主启动即注册路由、slash 命令 `/term` 与 session 注册表。

- 审计日志写在 `${DSH_HOME}/plugins/dsh-nano-terminal/audit.jsonl`（宿主 home 下），记录 open/close/attach 事件。
- 浏览器侧 `localStorage['dnt.apply']` 存 client 自检日志（最多 40 条），仅诊断用。
- 卸载不删除 `audit.jsonl`；也不要删除 `dnt.apply`，它不带敏感内容。

## 使用

| 动作 | 结果 |
|---|---|
| `/dnt` → 新建 nano 终端标签页 | 右栏开 `nano-term` 类型标签页，wasm 渲染 |
| `/dnt` → 通道状态（宿主 MCP） | 浏览器 console 打印 `/dsh-nano-terminal/health` 的 lane 状态 |
| 打开内置 Terminal 标签 | client 接管其 body 渲染（wasm 接管 xterm） |

agent 与脚本可用的宿主侧 slash 命令：

```text
/term new            新建 terminal session（lane=local），返回短 id
/term list           列出全部 session（id、lane、attached、exited）
/term close <id>     关闭 session
/term attach <id>    返回 ws attach 地址 /dsh-nano-terminal/stream?session=<id>
```

宿主路由（已鉴权的 Harness 请求才可达）：

- `GET /dsh-nano-terminal/stream`（WebSocket 升级，`dnt-ws-v1` 数据面）
- `POST /dsh-nano-terminal/mcp`（MCP JSON-RPC 控制面，本宿主自身是 MCP terminal server）
- `GET /dsh-nano-terminal/sessions`、`POST /dsh-nano-terminal/session/:id/close`、`GET /dsh-nano-terminal/health`

三条 lane：`local`（宿主 `subprocess.spawnTerminal`，即 node-pty）、`mcp`（连接远端 MCP terminal 端点）、`isolate`（v8/workerd wasm 内嵌通道，scaffolded）。`/term` 创建的 session 默认走 `local`。

## 配置与状态

宿主无配置文件。审计日志在 `${DSH_HOME}/plugins/dsh-nano-terminal/audit.jsonl`；浏览器状态仅 `localStorage['dnt.apply']`。没有可写的宿主配置键。

## 构建

仅当「交付物」里的运行时文件缺失，或你刚改了 `src/`。

在本包目录执行：

```bash
npm install
npm run build
```

`lib/dnt-core.wasm` 由 Rust 侧产出（`npm run build:rust`，`crates/` 编译到 `lib/`）；只改 `src/client` 或宿主 JS 时 `npm run build` 即可。然后确认运行时文件非空。不要安装一份缺少这些文件、又不是你刚刚构建的树。

## 故障

| 现象 | 原因 | 处理 |
|---|---|---|
| `/dnt` 不出现或开了标签无输出 | client 没进页面，或宿主没重启 | 查 bundles 与 `lib/client.js`，重启宿主再刷新 |
| 终端黑屏无渲染 | `lib/dnt-core.wasm` 缺失或未随包发布 | 确认 tarball 含 wasm，缺失就 `build:rust` 后重打包 |
| `/term` 报 unknown session | session 已退出被 sweep 清理，或宿主刚重启 | `/term list` 看现有 session |
| `dsh plugin add` 报引擎不符 | `engines.dsh` 与正在跑的 dsh 不一致 | 换符合范围的 dsh，或在操作者明确接受风险后执行命令输出里的 `allow-version`。不要改本包的 `engines` |

## 不要

- 不要装进非 web profile 后期待出现右栏终端标签页。
- 不要把 `POST /dsh-nano-terminal/mcp` 当数据面——pty 数据流只走 `stream` 的 WebSocket。
- 不要清空 `audit.jsonl` 或 `dnt.apply`，除非操作者明确要求。
- 不要把 `context/` 或本机手册当成安装步骤。它们不在这个包里。
