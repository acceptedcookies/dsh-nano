# routes — `/nano-local-sandbox/*` 路由表（单一真源）

本表由 build 从 `security/route-sensitivity.json` / `lib/route-table.js` 对账，覆盖全部已注册路径。带 `*` 的方法含 `HEAD`。

## 读类（L2 `read:engine`/`read:host`）

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/nano-local-sandbox/status` | `{ok,engineMismatch?,httpBase,cdp,kite:{phase,httpBase,mcpPort,cdp},lastError?}`；引擎 down 也 200，读 body.ok |
| GET | `/nano-local-sandbox/last` | 最近点选完整元素包；无则 `pick:null` |
| GET | `/nano-local-sandbox/ports` | `{configured,effective,container.published,ports.engine.free,lastRepair}` |
| GET | `/nano-local-sandbox/diagnostics` | 一击全量：status+targets+console+trace+errorCatalog+perf+hints（`?catalog=1` 附目录） |
| GET | `/nano-local-sandbox/targets` | 引擎 `Target.getTargets`（page target id/url、附着页） |
| GET | `/nano-local-sandbox/console?level=…&limit=1..400&sinceSeq=&since=` | console/exception/network/navigation 环形缓冲 |
| GET | `/nano-local-sandbox/network?limit=1..200&failedOnly=true` | 网络生命周期 |
| GET | `/nano-local-sandbox/operations?errorsOnly=true&limit=1..200` | 每次路由调用 trace |
| GET | `/nano-local-sandbox/browse-history` | 持久浏览历史（DELETE `?id=`/POST `{clear:true}` 改） |
| GET | `/nano-local-sandbox/elements?selector=…&depth=N` | 引擎 DOM.getDocument 元素列表（depth NaN→400） |
| GET | `/nano-local-sandbox/dom` | 页面 DOM 文本 |
| GET | `/nano-local-sandbox/snapshot?maxNodes=1..500` | a11y-lite 树 + `@N` ref 表（人=agent 同一语言；默认 120） |
| GET | `/nano-local-sandbox/refs?ref=@N` | `@N`→selector 反查；`?` 无参=整表 summary |
| GET | `/nano-local-sandbox/logs?tail=20..2000` | 容器引擎输出（tail NaN→400） |
| GET | `/nano-local-sandbox/control` | HITL 桥控制读面（writer/humanHold/lastAction） |
| GET | `/nano-explorer-extra/perf-review/host` | 只读全进程视图。只接受 `since`。本包不注册这条路由。 |
| GET | `/nano-local-sandbox/selftest` | 引擎健康自检 |

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
| GET | `/nano-local-sandbox/har` | 网络环导出 HAR 1.2（**机制**透传 requestHeaders/responseHeaders，但当前 pin 不发头事件 → 实机 header 数组为空；`body:null reason:'engine'`） |
| POST | `/nano-local-sandbox/state` | `{action:save,name?}` 导出 {localStorage,sessionStorage,cookie} 到实例 stateVolume 的 `browser-state.json`（named 槽 ≤32，超额最早者淘汰，`__last__` 为无名槽）；`{action:load,name|state}` 恢复 |
| POST | `/nano-local-sandbox/wait` | `{selector|text|url|fn}+load+timeoutMs` 阻塞条件等待 |
| POST | `/nano-local-sandbox/history` | `{delta:-1|+1}` 真浏览器进退 |
| POST | `/nano-local-sandbox/settings` | `{userAgent?,viewport?,media?,extraHeaders?}` 事务性伪装 |
| POST | `/nano-local-sandbox/kite` | `{action:init|start|suspend|resume|configure,httpBase?,mcpPort?}` 生命周期；`configure` 验可达+Kitesurf 指纹（非 Kitesurf→409 `engine.mismatch`） |
| POST | `/nano-local-sandbox/recover` | `{}` 一键自愈（suspend→resume→健康→端口） |
| POST | `/nano-local-sandbox/control` | `{action:takeover|release,owner?}` HITL 人接管写锁 |
| POST | `/nano-local-sandbox/mcp` | JSON-RPC 2.0 宿主 MCP（tools/list、tools/call `sandbox.*`/`term.*`） |

| POST | `/nano-local-sandbox/console`/`operations`/`network` | `{clear:true}` 清环形缓冲 |
| POST/DELETE | `/nano-local-sandbox/browse-history` | `{clear:true}`/`?id=` 改持久历史 |
