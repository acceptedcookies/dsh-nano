# routes — `/nano-kitesurf/*` 路由表（单一真源）

本表由 build 从 `security/route-sensitivity.json` / `lib/route-table.js` 对账，覆盖全部已注册路径。带 `*` 的方法含 `HEAD`。

## 读类（L2 `read:engine`/`read:host`）

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/nano-kitesurf/status` | `{ok,engineMismatch?,httpBase,cdp,kite:{phase,httpBase,mcpPort,cdp},lastError?}`；引擎 down 也 200，读 body.ok |
| GET | `/nano-kitesurf/last` | 最近点选完整元素包；无则 `pick:null` |
| GET | `/nano-kitesurf/ports` | `{configured,effective,container.published,ports.engine.free,lastRepair}` |
| GET | `/nano-kitesurf/diagnostics?limit=1..100` | 一击全量：status+targets+console+trace+errorCatalog+perf+hints |
| GET | `/nano-kitesurf/targets` | 引擎 `Target.getTargets`（page target id/url、附着页） |
| GET | `/nano-kitesurf/console?level=…&limit=1..250` | console/exception/network/navigation 环形缓冲 |
| GET | `/nano-kitesurf/network?limit=1..200&failedOnly=true` | 网络生命周期 |
| GET | `/nano-kitesurf/operations?errorsOnly=true&limit=1..200` | 每次路由调用 trace |
| GET | `/nano-kitesurf/browse-history` | 持久浏览历史（DELETE `?id=`/POST `{clear:true}` 改） |
| GET | `/nano-kitesurf/context?id=N`/`?limit=20` | composer ref 上下文反查（`[kitesurf:N]`） |
| GET | `/nano-kitesurf/elements?selector=…` | 引擎 DOM.getDocument 元素列表 |
| GET | `/nano-kitesurf/dom` | 页面 DOM 文本 |
| GET | `/nano-kitesurf/snapshot?maxNodes=1..500` | a11y-lite 树 + `@N` ref 表（人=agent 同一语言） |
| GET | `/nano-kitesurf/refs?ref=@N` | `@N`→selector 反查；`?` 无参=整表 summary |
| GET | `/nano-kitesurf/perf-review/host` | 进程 perf 快照（`?mode=window` 排水仅 POST） |
| GET | `/nano-kitesurf/selftest` | 引擎健康自检 |
| GET | `/nano-kitesurf/client-perf` | 客户端 perf 缓冲 |

## 写/动作类（更高敏感度）

| 方法 | 路径 | 作用 |
|---|---|---|
| POST | `/nano-kitesurf/open` | `{url}` 导航，仅 http(s) 无凭证 |
| POST | `/nano-kitesurf/shot` | `{scroll?,format?,quality?,fit?}` 截图 base64 |
| POST | `/nano-kitesurf/pick` | `{x,y}`/`{selector|@N}`/`{preview:true}` 点选元素包 |
| POST | `/nano-kitesurf/edit` | `{selector|@N,text}` 写回元素文本 |
| POST | `/nano-kitesurf/evaluate` | `{expression}` 有界 JS；`{token,offset}`/`?page=N` 拉分段（>4KB 结果进页内 token 缓存） |
| GET/POST | `/nano-kitesurf/storage` | localStorage/sessionStorage/cookie 读写：GET `?scope=` 列；POST `{scope,op:set|delete|clear,name,value}`（HttpOnly 不可达） |
| POST | `/nano-kitesurf/state` | `{action:save,name?}` 导出 {localStorage,sessionStorage,cookie} 到 `$DSH_HOME/nano-kitesurf-state.jsonl`；`{action:load,name|state}` 恢复 |
| POST | `/nano-kitesurf/wait` | `{selector|text|url|fn}+load+timeoutMs` 阻塞条件等待 |
| POST | `/nano-kitesurf/history` | `{delta:-1|+1}` 真浏览器进退 |
| POST | `/nano-kitesurf/settings` | `{userAgent?,viewport?,media?,extraHeaders?}` 事务性伪装 |
| POST | `/nano-kitesurf/kite` | `{action:init|start|suspend|resume|configure,httpBase?,mcpPort?}` 生命周期 |
| POST | `/nano-kitesurf/recover` | `{}` 一键自愈（suspend→resume→健康→端口） |
| POST | `/nano-kitesurf/perf-report` | pane 上报客户端 perf 样本（≤200KB body）；`GET /client-perf` 读 |
| POST | `/nano-kitesurf/perf-review/host?mode=window` | perf 窗口排水（仅 POST） |
| POST | `/nano-kitesurf/console`/`operations`/`network` | `{clear:true}` 清环形缓冲 |
| POST/DELETE | `/nano-kitesurf/browse-history` | `{clear:true}`/`?id=` 改持久历史 |
