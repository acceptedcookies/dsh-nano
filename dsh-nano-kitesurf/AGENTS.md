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
| 宿主 inject | `webServer`、`connection`、`skills` |

## 交付物

| 路径 | 角色 |
|---|---|
| `package.json` | 包名、`engines.dsh`、`files`、bundle patch、`dsh.client.inject` |
| `cordis.patch.yml` | 插入插件 id。`name` 是包名 |
| `index.js` | 宿主。运行时必需。只登记技能，不注册页面路由，不启动容器 |
| `lib/engine.js` | CDP 客户端。运行时必需。不持有模块级页面 socket |
| `lib/skill.js` | 两份技能正文的单一真源。运行时必需 |
| `lib/route-guard.js` | 路由注册 guard bundle。运行时必需 |
| `lib/route-table.js` | 空路由表。本包不再拥有页面路由 |
| `lib/perf-host.js` | perf-review host bundle。运行时必需 |
| `lib/client.js` | 浏览器包。运行时必需。安装时不重建。页面请求打到本地沙箱宿主 |
| `icon.svg`、`locale/` | 图标与中英文案 |
| `skills/kitesurf-cdp/SKILL.md`、`skills/nano-kite/SKILL.md` | `npm run build` 从 `lib/skill.js` 生成。不要手改 |
| `src/` | 作者树。已有上面的 `lib/` 时安装不需要它 |

client inject 以 `package.json` 的 `dsh.client.inject` 为准，不在这里抄。

## 前置

1. `dsh --version` 落在 `package.json` 的 `engines.dsh` 内。不够或过高就停。不要自行放宽，除非操作者明确接受命令输出里的那一对版本。
2. `pnpm` 在 PATH 上。`dsh plugin` 只是把参数转给 profile 里的 pnpm。
3. 目标是已经能打开的 Web profile，默认名 `web`。不要装进 headless、sdk 或 acp。
4. 引擎不在本包里。容器的构建和启动不由本包执行。没有引擎时插件仍能装上，面板可以显示 engine down。
5. 本包构建期依赖 `dsh-host-route-guard`，声明为 `devDependencies` 的 `file:../packages/dsh-host-route-guard`。`npm install`/`npm run build` 时解析这个相对路径；构建时它被打进 `lib/route-guard.js`。不要改这条依赖。

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
3. 右侧工作区能打开 Kitesurf，画面根上有 `data-nano-kitesurf="1"`。composer 下方不再挂这块面板。
4. 已登录页面里 `GET 见 QNA status` 返回 200 JSON。裸 curl 被拒是鉴权，不是没装上。composer 输入 `/kitesurf-cdp` 能看到技能。

## 初次运行

无数据库。宿主用默认 `httpBase`。技能在插件激活时注册。引擎没起来时面板写 engine down，这不是安装失败。

## 使用

| 动作 | 结果 |
|---|---|
| 工作区入口 | 和文件页并列。打开后占满右侧工作区 |
| 地址栏 Go | 在容器里打开这个 http(s) 地址并投射当前画面 |
| 最近地址（时钟图标） | 记住最近 8 个地址。切换时让容器打开那一个 |
| ← → ⟳ | 真实浏览器后退/前进/刷新（走引擎 navigationHistory） |
| 滚轮 / ↑ ↓ 键 | 滚动容器里的页面并重新投射 |
| Annotate | 打开后，点画面上的元素。选框跟着元素；悬停时有虚线预览。Shift+点把元素并进当前备注（多选）；Alt+点在无备注时直送 composer；普通拖画选区，Alt+拖画椭圆，Shift+拖画箭头。↑↓ 选父/最大子元素；双击元素让备注输入变成就地改字（回车写回页面）。Esc 依次关拖/备注/标注；⌘⇧D 开关标注；⌘Z 撤最后一条 pin；⌘L 把当前备注直送 composer。备注回车 pin 进队列 |
| `/kitesurf-cdp`、`/nano-kite` | 告诉 agent 用 `agent-browser --cdp` 接这个引擎，不要启动 Chrome |

路由都有 `connection.requestRejection`。不要绕过面板去改引擎配置。

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `见 QNA status` | `{ ok, engineMismatch?, httpBase, cdp, kite: { phase, httpBase, mcpPort, cdp }, lastError? }` |
| GET | `见 QNA last` | 最近一次点选，没有则 `pick: null` |
| POST | `见 QNA open` | `{ url }`。只接受 http(s)，不接受带凭证的地址 |
| POST | `见 QNA shot` | 当前页截图 base64 + `{url, scrollX, scrollY, targetId, viewport, mimeType, format}`；`{scroll: ±px}` 先滚后截，`{format:"webp"\|"png"\|"jpeg", quality:1..100}` 选编码（默认 webp q82，比 PNG 小约 3.7×），`{fit:{width,height}}` 让引擎视口等于面板尺寸（默认由 pane 侧传入，图片与面板 1:1、无 letterbox） |
| POST | `见 QNA history` | `{delta:-1\|+1}`：真实浏览器前进/后退（走引擎 `Page.getNavigationHistory`/`navigateToHistoryEntry`），返回 `{moved,url?,currentIndex,entries}` |
| POST | `见 QNA pick` | `{ x, y }` 或 `{selector}`（↑↓ 父/子重选）。`preview:true` 只做悬停预览、不写 lastPick。元素包带 `componentStack`（React fiber 自省出的组件名，无框架/生产压缩名时为 null 或短名）；`elements` 是单元素列表；`parentSel`/`childSel` 是父/最大子元素选择器；响应带 `{url, scrollY, targetId}` 供画面比对（漂移时 pane 自动重截并提示） |
| POST | `见 QNA edit` | `{selector, text}`：把文本写回该元素（双击就地改字），≤4000 字符 |
| POST | `见 QNA settings` | `{ userAgent?, viewport?, media?, extraHeaders? }`：viewport `{width:320..3840, height:240..2160, mobile?, deviceScaleFactor?:1\|2\|3}` 或 `null`；media `screen\|print\|null`；extraHeaders ≤20 项（禁 cookie/authorization 等）；全部事务性，失败回滚 |
| POST | `见 QNA kite` | `{action: init\|start\|suspend\|resume\|configure, httpBase?, mcpPort?}` |
| GET/POST | `见 QNA perf-review/host` | 进程 perf 快照；`?mode=window` 会清空全局桶，只允许 POST |
| GET/POST | `见 QNA console` | 页面 console/exception/network/navigation 环形缓冲；`?level=error,exception&limit=50`；`POST {"clear":true}` 清空 |
| GET/POST | `见 QNA operations` | 每次路由调用的执行埋点（route/status/errorId/耗时/输入摘要）；`?errorsOnly=true`；`POST {"clear":true}` 清空 |
| GET | `见 QNA diagnostics` | 一击全量诊断：status + target 列表 + console + 操作 trace + errorCatalog + perf + 自动 hints |
| GET | `见 QNA targets` | 引擎 `Target.getTargets`（page target id/url、当前附着页） |
| POST | `见 QNA evaluate` | `{expression}` 在引擎页面执行有界 JS（≤2000 字符，returnByValue，结果 ≤4000 字符） |

错误一律 `{ok:false,errorId,error}` 并按 `lib/diagnostics.js` 的 `ERROR_CATALOG` 映射真实状态码（唯一真源，index.js 与技能文档都从它派生）：输入类 400、未命中 404、阶段错 409、body 超限 413、引擎故障 502、`navigate.egress` 504。`/diagnostics` 会把「errorId → status → 原因 → 下一步命令」整表交给 agent；完整 id 表也在 `/kitesurf-cdp` 技能 §5。

## 拓扑（workerd 内的浏览器代理）

浏览器代理不在宿主里，而在容器内的 workerd：Kitesurf 引擎自己就是那个代理，它把渲染器包成 CDP server 并从容器端口暴露出来。

```
DSH 宿主 (plugin/index.js)
  └─ lib/engine.js  ── CDP over WS ──▶  ws://127.0.0.1:8798/devtools/browser
                                          └─ 容器内 workerd + Kitesurf 渲染器
MCP 客户端
  └─ ws://127.0.0.1:8799/mcp ──▶ runtime/mcp-bridge.mjs ──▶ agent-browser mcp ──▶ 同一 CDP
```

因此「浏览器代理」= `browserSocketUrl(httpBase)` 指向的 CDP 端点；宿主只做协议转发与诊断，不启动任何浏览器进程。`GET /selftest` 里的 `engine` / `engine-identity` / `targets` 三项就是这条链路的健康证据。

## 配置与状态

宿主配置可省略。要写就写在 profile 的 patch 里。

```yaml
- id: nano-kitesurf
  config:
    perfReview: true              # 可选：perf-span 采集开启（等价 DSH_PERF_REVIEW=1，仅本插件进程）
```

本包不读取 checkout 环境变量，也不启动容器。点选结果只在宿主进程内存里，重启即丢。卸载不需要清浏览器存储，因为没有。

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
| 面板写 engine down | 8787 上没有 Kitesurf | 先把引擎跑起来。不要改去连 Chrome |
| status 返回 302 或被拒 | 没带已登录页面的会话 | 正常 |
| 点了截图但 pick 失败 | 引擎没有 page target，或坐标超出 | 先 Open。看响应里的 `error` |
| `dsh plugin add` 报引擎不符 | `engines.dsh` 与正在跑的 dsh 不一致 | 换符合范围的 dsh，或在操作者明确接受风险后执行命令输出里的 `allow-version`。不要改本包的 `engines` |

## 不要

- 不要在这个包里编译 Kitesurf，也不要内置 workerd。
- 不要把 `httpBase` 写成带用户名密码的 URL。
- 不要在用户没要求时对引擎执行 `Page.navigate`。
- 不要把 `context/` 或本机手册当成安装步骤。它们不在这个包里。
- 不要因为引擎没起来就改用本机 Chrome。
