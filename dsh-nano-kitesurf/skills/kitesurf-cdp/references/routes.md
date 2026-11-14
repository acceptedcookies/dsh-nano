# routes — `/nano-local-sandbox/*` 路由表（单一真源）

本表由 build 从 `security/route-sensitivity.json` / `lib/route-table.js` 对账，覆盖全部已注册路径。带 `*` 的方法含 `HEAD`。

## 读类（L2 `read:engine`/`read:host`）

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/nano-local-sandbox/status` | `{ok,engineMismatch?,httpBase,cdp,kite:{phase,httpBase,mcpPort,cdp},lastError?}`；引擎 down 也 200，读 body.ok |
| GET | `/nano-local-sandbox/last` | 最近点选完整元素包；无则 `pick:null` |
| GET | `/nano-local-sandbox/ports` | `{configured,effective,container.published,ports.engine.free,lastRepair}` |
| GET | `/nano-local-sandbox/diagnostics?limit=1..100` | 一击全量：status+targets+console+trace+errorCatalog+perf+hints |
| GET | `/nano-local-sandbox/targets` | 引擎 `Target.getTargets`（page target id/url、附着页） |
| GET | `/nano-local-sandbox/console?level=…&limit=1..250` | console/exception/network/navigation 环形缓冲 |
| GET | `/nano-local-sandbox/network?limit=1..200&failedOnly=true` | 网络生命周期 |
| GET | `/nano-local-sandbox/operations?errorsOnly=true&limit=1..200` | 每次路由调用 trace |
| GET | `/nano-local-sandbox/browse-history` | 持久浏览历史（DELETE `?id=`/POST `{clear:true}` 改） |
| GET | `/nano-local-sandbox/context?id=N`/`?limit=20` | composer ref 上下文反查（`[kitesurf:N]`） |
| GET | `/nano-local-sandbox/elements?selector=…` | 引擎 DOM.getDocument 元素列表 |
| GET | `/nano-local-sandbox/dom` | 页面 DOM 文本 |
| GET | `/nano-local-sandbox/snapshot?maxNodes=1..500` | a11y-lite 树 + `@N` ref 表（人=agent 同一语言） |
| GET | `/nano-local-sandbox/refs?ref=@N` | `@N`→selector 反查；`?` 无参=整表 summary |
| GET | `/nano-local-sandbox/perf-review/host` | 进程 perf 快照（`?mode=window` 排水仅 POST） |
| GET | `/nano-local-sandbox/selftest` | 引擎健康自检 |
| GET | `/nano-local-sandbox/client-perf` | 客户端 perf 缓冲 |

## 写/动作类（更高敏感度）

| 方法 | 路径 | 作用 |
|---|---|---|
| POST | `/nano-local-sandbox/open` | `{url}` 导航，仅 http(s) 无凭证 |
| POST | `/nano-local-sandbox/shot` | `{scroll?,format?,quality?,fit?}` 截图 base64 |
| POST | `/nano-local-sandbox/pick` | `{x,y}`/`{selector|@N}`/`{preview:true}` 点选元素包 |
| POST | `/nano-local-sandbox/edit` | `{selector|@N,text}` 写回元素文本 |
| POST | `/nano-local-sandbox/evaluate` | `{expression}` 有界 JS；`{token,offset}`/`?page=N` 拉分段（>4KB 结果进页内 token 缓存） |
| POST | `/nano-local-sandbox/interact` | `{action:click|dblclick|fill|type|press|hover|select|focus|blur|check|uncheck, target:@N|selector, text?|key?|value?|option?}` 合成事件；遮挡→`interact.occluded` |
| GET/POST | `/nano-local-sandbox/storage` | localStorage/sessionStorage/cookie 读写：GET `?scope=` 列；POST `{scope,op:set|delete|clear,name,value}`（HttpOnly 不可达） |
| GET | `/nano-local-sandbox/har` | 网络环导出 HAR 1.2（requestHeaders/responseHeaders 透传；`body:null reason:'engine'`） |
| POST | `/nano-local-sandbox/state` | `{action:save,name?}` 导出 {localStorage,sessionStorage,cookie} 到 `$DSH_HOME/nano-kitesurf-state.jsonl`；`{action:load,name|state}` 恢复 |
| POST | `/nano-local-sandbox/wait` | `{selector|text|url|fn}+load+timeoutMs` 阻塞条件等待 |
| POST | `/nano-local-sandbox/history` | `{delta:-1|+1}` 真浏览器进退 |
| POST | `/nano-local-sandbox/settings` | `{userAgent?,viewport?,media?,extraHeaders?}` 事务性伪装 |
| POST | `/nano-local-sandbox/kite` | `{action:init|start|suspend|resume|configure,httpBase?,mcpPort?}` 生命周期 |
| POST | `/nano-local-sandbox/recover` | `{}` 一键自愈（suspend→resume→健康→端口） |
| POST | `/nano-local-sandbox/perf-report` | pane 上报客户端 perf 样本（≤200KB body）；`GET /client-perf` 读 |
| POST | `/nano-local-sandbox/perf-review/host?mode=window` | perf 窗口排水（仅 POST） |
| POST | `/nano-local-sandbox/console`/`operations`/`network` | `{clear:true}` 清环形缓冲 |
| POST/DELETE | `/nano-local-sandbox/browse-history` | `{clear:true}`/`?id=` 改持久历史 |
