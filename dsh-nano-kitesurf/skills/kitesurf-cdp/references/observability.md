# observability — 排障与状态模型

## 探针路由

任何异常先跑一次 `/nano-local-sandbox/diagnostics`（`page.fetch` 带会话；裸 curl 需 `dsh-auth-*` cookie，否则 401/302）。它一次返回：插件版本/阶段、引擎 status 与 target 列表、UA/viewport、**最近操作 trace**（route/status/errorId/耗时）、**页面 console/exception/network**、错误目录、perf 快照、按当前状态生成的 `hints`。`hints` 是权威线索，先读它再决定动作。

| 路由 | 作用 |
|---|---|
| `GET /nano-local-sandbox/diagnostics` | 一击全量诊断（console/network/operations/history 各取尾部，无 limit 参数——`?limit=` 会被忽略） |
| `GET /nano-local-sandbox/diagnostics?catalog=1` | 附带 DNLS 的错误目录（id→status→cause→next） |
| `GET /nano-local-sandbox/operations?sandboxId=<id>&operationId=<op>` | 只读单个 lifecycle operation 文档（dnls.control/1）；旧的 errorsOnly/clear trace 面已退役 |
| `GET /nano-local-sandbox/console?level=error,exception` | 页面 console.error / 未捕获异常 / 网络失败 |
| `GET /nano-local-sandbox/console?level=navigation` | 页面导航轨迹（漂移排查） |
| `POST /nano-local-sandbox/console {"clear":true}` | 清空 console 环形缓冲 |
| `GET /nano-local-sandbox/network?limit=1..200&failedOnly=true` | 网络生命周期（requestWillBeSent→responseReceived） |
| `GET /nano-local-sandbox/targets` | 引擎 Target.getTargets：page target id/url、当前附着页 |
| `POST /nano-local-sandbox/evaluate {"expression":"document.title"}` | 引擎页面有界 JS（≤2000 字符，结果 ≤4000 字符） |
| `GET /nano-local-sandbox/browse-history` | 持久浏览历史；`DELETE ?id=…` / `POST {clear:true}` 改 |

console 采集走 DNLS 自己那条 CDP socket 的 `Runtime.consoleAPICalled` / `Runtime.exceptionThrown` / `Log.entryAdded` / `Network.loadingFailed` / `Page.frameNavigated`，**不需要**再注入 `window.__ksLogs`。`/evaluate` 里 `console.log("probe")` 会立刻出现在 `GET /console`。

## 状态模型（务必记住）

面板、`GET /status`、`/diagnostics`、`lifecycle.phase` 都读的是**同一个宿主进程状态**，不是各自独立的副本。宿主重启清空 console/操作环形缓冲与 perf 样本，并把引擎共享页打回 `about:blank`。`/status` 在引擎 down 时 HTTP 仍是 **200**，必须读 body 的 `ok`；`buildId`/`engineAlive` 确认「我到底在跟哪份代码说话」。`lifecycle` 的 `start`/`stop`/`restart`/`recreate` 与阶段必须匹配；阶段错是 409，不是引擎故障。

**共享 env 容器**：页面、CDP socket 与 history 在同一 env 容器内共享——同一对象上人的 pane 与你 attach 的页面是同一页，写前确认在预期页。

**双宿主 push**：desktop 与 dev profile 可指向同一容器 bridge。桥做 writer 选举——引擎 owner 的诊断独占，peer 的 push 不覆盖。`GET http://<host>:<lifecycle.mcpPort>/diagnostics` 是桥侧最后落地的 payload。

## 幂等与重试义务（G31）

`timeoutMs` 只决定**应答何时返回**，不是取消：引擎侧已发出的操作继续执行。导航超时返回 `<ns>.navigate.failed` 且 `/status` 的 `navigation.outcome` 仍是 `in-flight`；`/wait` 超时是 `<ns>.wait.timeout`。调用方**先读 `/status` 的 `navigation.outcome` 再决定是否重发**，不要在超时后立刻重发 `/open`（第二次导航会与第一次竞态）。

传输层（`connect`/`closed`）自动重连一次；`timeout` 与所有确定性错误绝不重跑。`kitesurf.pick.miss` 可换坐标/selector 重试；`kitesurf.control.busy|held` 不排队、不偷锁。`POST /settings` 是事务性的：引擎 down 时返回 502 且**内存态回滚**，不要按「已写入」处理。

## perf span 名（`GET /perf-review/host`）

本包页面侧只登记两个 span：`pane-op`（每次 pane 动作）与 `navigate`（导航+截图）。宿主侧没有本包的 host span；容器 bring-up 的耗时归 dsh-nano-local-sandbox。点号名被 `NAME_RE` 丢弃。

## 参数取值域 / 幂等（集中表）

| 参数 | 取值域 | 不满足时 |
|---|---|---|
| `/open url` | http(s)，≤2000 字符，无凭证 | 输入类 400（DNLS 目录） |
| `/pick x,y` | 有限数，0..10000，落在 letterbox 内容带内 | 输入 400 / 未命中 404 |
| `/pick selector` | 合法 CSS ≤320 字符，或 `@N` | 输入 400 / 未命中 404 / ref 404 |
| `/wait` | `selector|text|url|fn` 恰一 + `load` ∈ `commit|domcontentloaded|load|networkidle`；timeoutMs ≤30000 | 输入 400 / `wait.timeout` 504 |
| `/shot scroll` | 有限数，\|scroll\|≤4000 | 输入 400 |
| `/edit text` | 字符串 1..4000 | 输入 400 |
| `/settings userAgent` | 单行 ≤400 字符；`""` 清除 | 输入 400 |
| `/settings viewport` | width 320..3840、height 240..2160、`deviceScaleFactor` 只能是 `1`、`mobile` 只能是 `false`；其他值 400 `settings.unsupported`；`null` 清除 | 400 |
| `/settings media` | `screen`\|`print`\|`null` | 输入 400 |
| `/settings extraHeaders` | ≤20 项，键 1..64、值 ≤200；禁用凭证类 | 输入 400 |
| `/history delta` | 只能 `-1`/`+1` | 输入 400 |
| `/evaluate expression` | ≤2000 字符；awaitPromise；结果 ≤4000 字符 | 输入 400 |
| `/console limit`/`level` | limit 1..400；level 逗号分隔 | 输入 400 |
| `/snapshot maxNodes` | 1..500 | 默认 120 |
| body | 多数 4096B；edit 8192B | body 超限 413 |

完整 errorId→status→cause→next 表只存在于 DNLS：`GET /diagnostics?catalog=1` 或 MCP `sandbox.error_catalog`。本包不复制目录。

**React `componentStack=null`**：页面没有可解析的 React fiber（非 React 框架、生产压缩名、或 fiber 键不可见）。不要从 selector 猜组件文件；用 `parentSel`/`childSel` 描述 DOM 位置，或请人在源码里确认。
