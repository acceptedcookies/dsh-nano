# routes — `/nano-local-sandbox/*` 路由表（单一真源在 DNLS）

本表只列本包消费的 DNLS 能力面；发射侧真源与完整注册表在 dsh-nano-local-sandbox。带 `*` 的方法含 `HEAD`。

## 读类（L2 `read:engine`/`read:host`）

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/nano-local-sandbox/status` | `{ok,engineMismatch?,lifecycle:{phase,httpBase,mcpPort},cdp,lastError?}`；`cdp` 是 relay socket；引擎 down 也 200，读 body.ok |
| GET | `/nano-local-sandbox/ports` | `{effective,ports,container}`：实际引擎/桥端口、端口占用与容器状态 |
| GET | `/nano-local-sandbox/diagnostics` | 一击全量：status+targets+console+trace+errorCatalog+perf+hints（`?catalog=1` 附目录） |
| GET | `/nano-local-sandbox/targets` | 引擎 `Target.getTargets`（page target id/url、附着页） |
| GET | `/nano-local-sandbox/console?level=…&limit=1..400&sinceSeq=&since=` | console/exception/network/navigation 环形缓冲 |
| GET | `/nano-local-sandbox/network?limit=1..200&failedOnly=true` | 网络生命周期 |
| GET | `/nano-local-sandbox/operations?sandboxId=<id>&operationId=<op>` | 只读单个 lifecycle operation；非 trace 面 |
| GET | `/nano-local-sandbox/browse-history` | 持久浏览历史（DELETE `?id=`/POST `{clear:true}` 改） |
| GET | `/nano-local-sandbox/elements?selector=…&depth=N` | 引擎 DOM.getDocument 元素列表（depth NaN→400） |
| GET | `/nano-local-sandbox/dom` | 页面 DOM 文本（静态投影，`<base>` 与子资源均为真实地址；本地 http 站在 HTML 模式下可能缺样式——看样式用默认的引擎渲染） |
| GET | `/nano-local-sandbox/snapshot?maxNodes=1..500` | a11y-lite 树 + `@N` ref 表（人=agent 同一语言；默认 120） |
| GET | `/nano-local-sandbox/refs?ref=@N` | `@N`→selector 反查；`?` 无参=整表 summary |
| GET | `/nano-local-sandbox/logs?tail=20..2000` | 容器引擎输出（tail NaN→400） |
| GET | `/nano-local-sandbox/control` | HITL 桥控制读面（writer/humanHold/lastAction） |
| GET | `/nano-local-sandbox/selftest` | 引擎健康自检 |

## 写/动作类（更高敏感度）

| 方法 | 路径 | 作用 |
|---|---|---|
| POST | `/nano-local-sandbox/open` | `{url}` 导航，仅 http(s) 无凭证。**写级鉴权**：要 GUI cookie，agent 直连 401 —— agent 的打开面是 relay `/cdp` 的 `Page.navigate` |
| POST | `/nano-local-sandbox/shot` | `{scroll?,format?,quality?,fit?}` 截图 base64 |
| POST | `/nano-local-sandbox/pick` | `{x,y}`/`{selector|@N}`/`{preview:true}` 点选元素包；最近一次点选由 pane 从应答自行持有 |
| POST | `/nano-local-sandbox/edit` | `{selector|@N,text}` 写回元素文本 |
| POST | `/nano-local-sandbox/evaluate` | `{expression}` 有界 JS；`{token,offset}`/`?page=N` 拉分段（>4KB 结果进页内 token 缓存） |
| POST | `/nano-local-sandbox/interact` | `{action:click|dblclick|fill|type|press|hover|select|focus|blur|check|uncheck, target:@N|selector, text?|key?|value?|option?}` 合成事件；遮挡→`interact.occluded` |
| GET/POST | `/nano-local-sandbox/storage` | localStorage/sessionStorage/cookie 读写：GET `?scope=` 列；POST `{scope,op:set|delete|clear,name,value}`（HttpOnly 不可达） |
| GET | `/nano-local-sandbox/har` | 网络环导出 HAR **子集**：`_format:'har-lite'`、`log.version:'1.2'`、`headers` 恒空、无 bodies/timings/pages（pin 不发头/体事件） |
| POST | `/nano-local-sandbox/state` | `{action:save,name?}` 导出 {localStorage,sessionStorage,cookie} 到实例 stateVolume；`{action:load,name|state}` 恢复 |
| POST | `/nano-local-sandbox/wait` | `{selector|text|url|fn}+load+timeoutMs` 阻塞条件等待；超时不是取消 |
| POST | `/nano-local-sandbox/history` | `{delta:-1|+1}` 真浏览器进退 |
| POST | `/nano-local-sandbox/settings` | 8 键事务：`{userAgent?,viewport?,media?,extraHeaders?,locale?,geolocation?,colorScheme?,cookies?}`；viewport `deviceScaleFactor` 只接 1、`mobile` 只接 false；`cookies` 是 `name=value` 换行文本（非数组），按当前页 origin 种入 |
| POST | `/nano-local-sandbox/lifecycle` | `{action:start|stop|restart|recreate}` 生命周期（dnls.control/1；旧 suspend/resume 动词已退役）；端点由实例 registry 返回，pane 只读 |
| GET | `/nano-local-sandbox/operations` | `?sandboxId=<id>&operationId=<op>` 读单个 operation 文档；lifecycle 只回 accepted/running，终态以该轮询为准，不得重发未结算的操作 |
| POST | `/nano-local-sandbox/control` | `{action:takeover|release,owner?}` HITL 人接管写锁（只约束 MCP 写者） |
| POST | `/nano-local-sandbox/mcp` | JSON-RPC 2.0 宿主 MCP（tools/list、tools/call `sandbox.*`/`term.*`） |
| POST | `/nano-local-sandbox/console`/`operations`/`network` | `{clear:true}` 清环形缓冲 |
| POST/DELETE | `/nano-local-sandbox/browse-history` | `{clear:true}`/`?id=` 改持久历史 |
