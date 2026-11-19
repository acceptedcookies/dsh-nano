# dsh-nano-kitesurf

只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
装好的标志：右侧工作区的入口里有 Kitesurf，打开后画面是 `data-nano-kitesurf="1"`，并且 `/kitesurf-cdp` 已经注册。

## 身份

| 项 | 值 |
|---|---|
| 包名 | `dsh-nano-kitesurf` |
| 插件 id | `nano-kitesurf` |
| 版本 | 读 `package.json` 的 `version`，不要写死 |
| dsh 引擎 | 读 `package.json` 的 `engines.dsh` |
| 平台 | 仅 web |
| 宿主入口 | `index.js` |
| 浏览器入口 | `lib/client.js` |
| 宿主 inject | `skills`（只登记技能；不拿 connection/webServer，不注册页面路由） |
| 引擎/容器 | 不在本包。生命周期、CDP keeper、MCP 桥、页面路由归 `dsh-nano-local-sandbox`（DNLS） |

## 交付物

| 路径 | 角色 |
|---|---|
| `package.json` | 包名、`engines.dsh`、`files`、bundle patch、`dsh.client.inject` |
| `cordis.patch.yml` | 插入插件 id。`name` 是包名 |
| `index.js` | 宿主。运行时必需。只登记 skills，不注册路由，不启动容器 |
| `lib/skill.js` | 两份技能正文的单一真源。运行时必需 |
| `lib/client.js` | 浏览器包。运行时必需。安装时不重建。所有页面请求打到 DNLS 的 `/nano-local-sandbox/*` |
| `lib/perf-host.js` | perf-review host bundle 构建产物（DNPR 合同要求存在） |
| `lib/bindings.js` | 空绑定表。本包没有自有页面路由 |
| `lib/route-guard.js` | 路由 guard bundle 构建产物；本包无自有路由，不注册 |
| `icon.svg`、`locale/` | 图标与中英文案 |
| `skills/kitesurf-cdp/SKILL.md`、`skills/nano-kite/SKILL.md` | `npm run build` 从 `lib/skill.js` + `src/skill/` 生成。不要手改 |
| `src/` | 作者树。已有上面的 `lib/` 时安装不需要它 |

client inject 以 `package.json` 的 `dsh.client.inject` 为准，不在这里抄。

## 前置

1. `dsh --version` 落在 `package.json` 的 `engines.dsh` 内。不够或过高就停。不要自行放宽，除非操作者明确接受命令输出里的那一对版本。
2. `pnpm` 在 PATH 上。`dsh plugin` 只是把参数转给 profile 里的 pnpm。
3. 目标是已经能打开的 Web profile，默认名 `web`。不要装进 headless、sdk 或 acp。
4. DNLS 负责容器构建、引擎启动与端口分配。没有 DNLS（或引擎未起）时本包仍能装上，面板显示 engine down。
5. 本包构建期依赖 `dsh-host-route-guard`，声明为 `devDependencies` 的 `file:../packages/dsh-host-route-guard`。`npm install`/`npm run build` 时解析这个相对路径；构建时它被打进 `lib/route-guard.js`。不要改这条依赖。
6. 本包构建期依赖 `dsh-performance-review`，声明为 `devDependencies` 的 `file:../packages/dsh-performance-review`。它被打进 `lib/client.js` 与 `lib/perf-host.js`；页面侧手动 join，宿主侧采集。不要改这条依赖。

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

卸载用 `dsh plugin --profile web remove`，参数是「身份」里的包名。没有 HMR 时同样要重启宿主。卸载不删除「配置与状态」里的浏览器数据。

## 验收

按顺序。前一步失败就停，不要换一个 profile 重试。失败时先看该 profile 目录下 `.plugin-manager/logs` 里这次 `dsh plugin` 的日志。

1. profile 的 `package.json` 里，`dependencies` 和 `dsh.profile.bundles` 都有本包名。
2. 重启并刷新后，页面里能找到本包的 client 模块（包名）。找不到说明 client 没进页面。
3. 右侧工作区能打开 Kitesurf，画面根上有 `data-nano-kitesurf="1"`。composer 下方不再挂这块面板。
4. 已登录页面里 `GET /nano-local-sandbox/status` 返回 200 JSON（DNLS 提供）。裸 curl 被拒是鉴权，不是没装上。composer 输入 `/kitesurf-cdp` 能看到技能。

## 初次运行

无数据库，无宿主配置。技能在插件激活时注册。DNLS 未起或引擎未起来时面板写 engine down，这不是安装失败。

## 使用

| 动作 | 结果 |
|---|---|
| 工作区入口 | 和文件页并列。打开后占满右侧工作区 |
| 地址栏 Go | 经 DNLS 在容器里打开这个 http(s) 地址并投射当前画面 |
| 最近地址（时钟图标） | 记住最近 8 个地址（pane 内存态）。切换时让容器打开那一个 |
| ← → ⟳ | 真实浏览器后退/前进/刷新（走引擎 navigationHistory） |
| 滚轮 / ↑ ↓ 键 | 滚动容器里的页面并重新投射 |
| Annotate | 打开后，点画面上的元素。选框跟着元素；悬停时有虚线预览。Shift+点把元素并进当前备注（多选）；Alt+点在无备注时直送 composer；普通拖画选区，Alt+拖画椭圆，Shift+拖画箭头。↑↓ 选父/最大子元素；双击元素让备注输入变成就地改字（回车写回页面）。Esc 依次关拖/备注/标注；⌘⇧D 开关标注；⌘Z 撤最后一条 pin；⌘L 把当前备注直送 composer。备注回车 pin 进队列 |
| `/kitesurf-cdp`、`/nano-kite` | 告诉 agent 用 `agent-browser --cdp` 接这个引擎，不要启动 Chrome；`/nano-kite` 只做 start/resume/suspend/restart |

页面路由全部由 DNLS 注册并受其 `connection.requestRejection` 保护。本包不复制 handler，也不绕面板去改引擎配置。

## 消费的 DNLS 面（不复制真源）

- `GET /nano-local-sandbox/status` → `lifecycle.{phase,httpBase,mcpPort}` + 顶层 `cdp`；引擎 down 也 200，读 `ok`。
- `GET /ports`、`/diagnostics`、`/console`、`/operations`、`/targets`、`/har` 只读。
- `POST /open`、`/shot`、`/pick`、`/edit`、`/evaluate`、`/interact`、`/settings`、`/history`、`/wait`、`/recover`。
- `POST /nano-local-sandbox/lifecycle` → `{action: start|resume|suspend|restart}`。端点由实例 registry 返回，pane 只读。
- 错误 `{ok:false,errorId,error,incidentId?}` 的状态码、cause、next 只在 DNLS；面板直接展示响应里的 `error`，完整目录用 `GET /diagnostics?catalog=1`。
- 本包不保存点选状态，不写锁文件，不持有 CDP/容器句柄。

完整路由表在 `skills/kitesurf-cdp/references/routes.md`。

## 拓扑

```
浏览器 pane（lib/client.js）
  └─ fetch /nano-local-sandbox/* ──▶ DNLS host routes
                                        └─ 实例 registry ──▶ 容器内 Kitesurf 引擎
Agent
  └─ skill 指导下 agent-browser --cdp ws://<host>:<lifecycle.mcpPort>/cdp ──▶ 同一引擎页
```

本包没有容器、CDP socket 或 MCP 桥。引擎 down 的恢复入口是 DNLS 的 `POST /nano-local-sandbox/recover`。

## 配置与状态

无宿主 `Config`，无 `httpBase`/`checkout`/`mcpPort` 字段，无锁文件。不读取 checkout 环境变量，也不启动容器。采集开关不在本包配置里。端点与端口一律从 `/status` 的 `lifecycle` 读取。点选结果只在 pane 内存里，重启即丢。卸载不需要清浏览器存储，因为没有。

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
| 面板写 engine down | DNLS 未起或引擎未启动 | 起 DNLS / 用 `POST /recover`。不要改去连 Chrome |
| status 返回 302 或被拒 | 没带已登录页面的会话 | 正常 |
| 点了截图但 pick 失败 | 引擎没有 page target，或坐标超出 | 先 Open。看响应里的 `errorId`/`error` |
| `dsh plugin add` 报引擎不符 | `engines.dsh` 与正在跑的 dsh 不一致 | 换符合范围的 dsh，或在操作者明确接受风险后执行命令输出里的 `allow-version`。不要改本包的 `engines` |

## 不要

- 不要在这个包里编译 Kitesurf，也不要内置 workerd。
- 不要 import `../dsh-nano-local-sandbox` 的任何文件；只用它的 HTTP/MCP 合同。
- 不要在 DNK 复制 DNLS 的 error 目录、路由 handler 或容器生命周期。
- 不要把 `httpBase` 写成带用户名密码的 URL。
- 不要在用户没要求时对引擎执行 `Page.navigate`。
- 不要把 `context/` 或本机手册当成安装步骤。它们不在这个包里。
- 不要因为引擎没起来就改用本机 Chrome。
