# observability — 排障与状态模型

## 探针路由

任何异常先跑一次 `/nano-local-sandbox/diagnostics`（`page.fetch` 带会话；裸 curl 需 `dsh-auth-*` cookie，否则 401/302）。它一次返回：插件版本/阶段、引擎 status 与 target 列表、UA/viewport、**最近操作 trace**（route/status/errorId/耗时）、**页面 console/exception/network**、错误目录、perf 快照、按当前状态生成的 `hints`。`hints` 是权威线索，先读它再决定动作。

| 路由 | 作用 |
|---|---|
| `GET /nano-local-sandbox/diagnostics?limit=20` | 一击全量诊断 |
| `GET /nano-local-sandbox/operations?errorsOnly=true` | 只看失败的调用（errorId + 耗时 + 输入摘要） |
| `POST /nano-local-sandbox/operations {"clear":true}` | 清空操作 trace |
| `GET /nano-local-sandbox/console?level=error,exception` | 页面 console.error / 未捕获异常 / 网络失败 |
| `GET /nano-local-sandbox/console?level=navigation` | 页面导航轨迹（漂移排查） |
| `POST /nano-local-sandbox/console {"clear":true}` | 清空 console 环形缓冲 |
| `GET /nano-local-sandbox/network?limit=1..200&failedOnly=true` | 网络生命周期（requestWillBeSent→responseReceived） |
| `GET /nano-local-sandbox/targets` | 引擎 Target.getTargets：page target id/url、当前附着页 |
| `POST /nano-local-sandbox/evaluate {"expression":"document.title"}` | 引擎页面有界 JS（≤2000 字符，结果 ≤4000 字符） |
| `GET /nano-local-sandbox/perf-review/host` | 进程 perf span（DSH_PERF_REVIEW=1 时） |
| `GET /nano-local-sandbox/browse-history` | 持久浏览历史；`DELETE ?id=…` / `POST {clear:true}` 改 |

console 采集走插件自己那条 CDP socket 的 `Runtime.consoleAPICalled` / `Runtime.exceptionThrown` / `Log.entryAdded` / `Network.loadingFailed` / `Page.frameNavigated`，**不需要**再注入 `window.__ksLogs`。`/evaluate` 里 `console.log("probe")` 会立刻出现在 `GET /console`。

## 状态模型（务必记住）

面板、`GET /last`、`GET /status`、`/operations`、`kite.phase` 都读的是**同一个宿主进程状态**，不是各自独立的副本。宿主重启清空 `lastPick`、console/操作环形缓冲与 perf 样本，并把引擎共享页打回 `about:blank`。`/status` 在引擎 down 时 HTTP 仍是 **200**，必须读 body 的 `ok`；`engineAlive`/`phaseConsistent`/`buildId`/`storePath` 确认「我到底在跟哪份代码说话」。`/kite start` 只有 `idle` 能调；`running` 但引擎死会被 `/status` 自动降级为 `idle`，此时一次 `start` 即可恢复。

**双宿主 push**：desktop 与 dev profile 可指向同一容器 bridge。桥做 writer 选举（`plugin.phase` rank + `storePath` 身份）——引擎 owner 的诊断独占，peer 的 push 不覆盖。`GET http://127.0.0.1:<mcpPort>/diagnostics` 是桥侧最后落地的 payload。

## 幂等与重试义务

`useLive()` 只对 `connect`/`closed` 类传输错误自动重连一次；`timeout` 与所有确定性错误绝不重跑（第二次 `Page.navigate` 会与第一次竞态）。因此：`kitesurf.navigate.timeout` 后**不要立刻重发 /open**；`kitesurf.pick.miss` 可换坐标/selector 重试；`kitesurf.kite.state` 409 要先读 `/status` 的 `kite.phase` 再选动作。`POST /settings` 是事务性的：引擎 down 时返回 502 `kitesurf.engine.connect` 且**内存态回滚**，不要按「已写入」处理。

## perf span 名（`GET /perf-review/host`）

`pick`、`shot`、`open`、`edit`、`settings`、`navigate`、`targets`、`evaluate`、`snapshot`、`kite-bringup`、`kite-container`、`kite-warmup`。点号名（旧 `kite.bringUp`）被 `NAME_RE` 丢弃；`kite-container` 有样本而 `kite-warmup` 没有 = 容器 CLI 阶段就失败。热启动（容器已在）约 0.25s；suspend→resume 约 3s；冷建约 100s。

## 参数取值域 / 幂等（集中表）

| 参数 | 取值域 | 不满足时 |
|---|---|---|
| `/open url` | http(s)，≤2000 字符，无凭证 | `kitesurf.url.*` 400 |
| `/pick x,y` | 有限数，0..10000，落在 letterbox 内容带内 | `pick.point` 400 / `pick.miss` 404 |
| `/pick selector` | 合法 CSS ≤320 字符，或 `@N` | `pick.selector` 400 / `pick.miss` 404 / `ref.miss` 404 |
| `/wait` | `selector|text|url|fn` 恰一 + `load` ∈ `commit|domcontentloaded|load|networkidle`；timeoutMs ≤30000 | `wait.query` 400 / `wait.timeout` 504 |
| `/shot scroll` | 有限数，\|scroll\|≤4000 | `shot.scroll` 400 |
| `/edit text` | 字符串 1..4000 | `edit.badtext` 400 |
| `/settings userAgent` | 单行 ≤400 字符；`""` 清除 | `settings.userAgent` 400 |
| `/settings viewport` | width 320..3840、height 240..2160、dsf 1/2/3、mobile 布尔；`null` 清除 | `settings.viewport` 400 |
| `/settings media` | `screen`\|`print`\|`null` | `settings.media` 400 |
| `/settings extraHeaders` | ≤20 项，键 1..64、值 ≤200；禁用凭证类 | `settings.headers` 400 |
| `/history delta` | 只能 `-1`/`+1` | `navigate.delta` 400 |
| `/evaluate expression` | ≤2000 字符；awaitPromise；结果 ≤4000 字符 | `evaluate.*` 400 |
| `/console limit`/`level` | limit 1..250；level 逗号分隔 | `console.query` 400 |
| `/operations`/`/diagnostics limit` | 1..200 / 1..100 | `diag.query` 400 |
| `/snapshot maxNodes` | 1..500 | 默认 200 |
| body | 多数 4096B；edit 8192B | `body.toolarge` 413 |

**React `componentStack=null`**：页面没有可解析的 React fiber（非 React 框架、生产压缩名、或 fiber 键不可见）。不要从 selector 猜组件文件；用 `parentSel`/`childSel` 描述 DOM 位置，或请人在源码里确认。
