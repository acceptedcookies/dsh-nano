# 1119 交付 gap — Loop 3 收口记录（最终循环）

日期：2026-11-19。分支 `kitesurf-delivery-review`。本文件记录第三轮"子代理审查 → 测试&修复"循环的产出、实测证据与剩余已知缺口。证据分级沿用原报告：A=真实容器/引擎，B=进程内夹具，C=源码扫描。

## 1. 本轮修复（编码侧）

### 1.1 阻断级回归修复（实机复现并闭环）

| 缺陷 | 根因 | 修复 | 证据 |
|---|---|---|---|
| `/kite {action:*}` 返回 `{ok:false,reason:'failed'}` HTTP 500 | `mcp-bridge.mjs` 配方变化 → digest/tag 漂移 → `ensureImage` 找不到新 tag；异常被 route-guard 泛化为 reason:'failed' | 重建镜像 `kitesurf-engine:…-12e3a82bfeab`（linux/arm64 workerd） | A：`/kite start` → `{"ok":true,"action":"created","healthy":true}` |
| **冷启动死锁**：容器不存在时永远 `action:'blocked'` | `container inspect <missing>` 也 exit 1（stderr 在 `error.cause.message` 而非 `error.stderr`），被三分支判为 inspectFailed | `backend-apple.inspect` 对 `cliKind:'not-found'`/`not found` 归一为 `null`；`cliError` 改读 `stderr \|\| cause.stderr \|\| cause.message` | A：容器不存在 → `/kite start` 走完整 create 路径成功 |
| **Relay string-id 串话** | string id 未命名空间化，upstream 回复被广播，先到先得的 client 收错包 | `mcp-bridge.mjs` 增加 `ks:<slot>:<id>` 前缀命名空间（send + receive 双侧） | B：`cdp-relay` 测试 7/7；A：`ws://127.0.0.1:8801/cdp` 实测 string id `-32600` 精确回路由到本客户端 |

### 1.2 数据恢复事件（过程记录）

中途误以 `git show HEAD:` 恢复 `mcp-bridge.mjs`，抹掉了未提交的 1092 行 relay 实现。已从仍在磁盘上的旧镜像 `…-a95e0fc6b18d` 内 `/mcp-bridge.mjs` 提取恢复，并在其上叠加本轮 string-id 修复。**教训**：配方文件无 git 历史覆盖时，镜像内容是唯一留存源。

## 2.5 追补实测（round 4，dsh-dev）

- **新缺陷修复**：本 pin 的 `navigator.language/languages/geolocation` 是 **own data property**（`getPrototypeOf(navigator)!==Navigator.prototype`），原型 getter 补丁被遮蔽——`shimSource` 改为实例+原型双写。实测：`locale:'ja-JP'` → `navigator.language==='ja-JP'`、`languages===['ja-JP']`、`geo yes`；`null` 卸载 → `en-US`/`geo no` 真实恢复（非回显）。capabilities.unsupported 声明与实机一致。
- **G24 双 session**：`sandbox.instance.ensure`×2（closure-alpha/beta）→ 不同 instanceId、同一 `kitesurf-dev` adopt、endpoints 一致、无交叉写。
- **G02 evaluate 分类**：`1+1`→2；syntax/`throw`→`evaluate.threw`（引擎异常透传）；>2000 字符→`evaluate.toolong`（合法输入不误判）。
- **G18 cookie**：`storage scope:cookie` set→read→delete→reload 无残留。
- **G19 viewport**：900x600 → `innerWidth/innerHeight` 实机读值吻合；`devicePixelRatio` 恒 1 与 `capabilities.unsupported` 的 dsf 声明一致（不冒称已支持）。
- **G22 history**：`sandbox.history` 在 launchctl 重启宿主后仍含 16:08 旧条目——durable 真源生效。
- **G14 filters**：`console?level=error` 0 行、`operations?errorsOnly` 仅失败行、`logs?tail` NaN→400。
- **MCP**：`sandbox.profile.list` 返回 digest=`12e3a82bfeab`（与 profile.yaml 一致）；`sandbox.instance.list` 不存在→`kitesurf.tool.unknown`（不冒名）。
- **G12 同页同答（round 5）**：`GET /diagnostics` vs `sandbox.diagnostics` 返回**完全同构**文档——32 字段逐键相等，差异仅 `observedAt` 时间戳与 operations 环增量（两次调用间自然流动），`buildId/cdpGeneration/containerName` 一致。
- **G29 HAR（round 5）**：`/har` 返回 `_format:'har-lite'` 自声明 + `log.version:'1.2'` + `creator` 正确；entries 携 `method/status/startedDateTime/time/_dnk{type,cached}`；`headers:[]` 与 pin 不发头事件的已知限制一致——**lite 声明与 schema 对齐**，非冒名完整 HAR。
- **G30 i18n（round 5，B 级）**：新增 3 例 i18n 测试——en 字典零 CJK 混入、zh/en 占位符同型（`{n}`/`{url}`）、无 `正常|normal|succeeded` 误导性状态文案、`fill()` 语法仅 `{name}`（拒绝 `%s`/`${}`）；`fill()` 运行时真实替换已核对调用处。i18n 测试 6/6。
- **round 6 追补**：console `POST {"clear":true}`→0 行生效；`network?failedOnly=true`→0 行、`?since=<future>`→0 行（cursor 语义实测）；`?type=` 非路由参数（过滤在 UI 客户端），未知参数无害忽略符合合同；`evaluate awaitPromise:true` 下 geo shim `getCurrentPosition` 精确返回 `35.68,139.69`——完整 promise 闭环。`browse-history` 5 条持久行。
- **round 7 视觉证据**：`/shot` 实机 PNG 落盘目检——`dev-loop3-shot-example.png`（IANA 多语言页、文字/图标/排版完整）、`dev-loop3-shot-react.png`（react.dev SPA 完整渲染：logo、nav、search、Learn/React/Community/Blog、Learn React/API Reference 按钮、主题切换图标、底部 section 起裁）。渲染面真实，非空壳/占位图。存于 `1119-evidence/`。
- **round 8 追补**：`POST /operations {"clear":true}`→清后仅 1 行（clear 自身）；`POST /network {"clear":true}`→`cleared:true`、GET 实 0 行；`/network?id=<real>` 命中 detail+`responseBody`（GA 204 body 0B 如实）；`id=nope`→404 `network.missing`；`/elements?selector=` 语义为样式锚点而非树过滤——`?selector=a` 命中 nodeId:113、`matched`5 条规则、`computed` 空系**引擎对 inline `<a>` 返回空**（CDP 直验，非宿主 bug），`h1`/`body` 得 80 条 computed；`/dom` srcdoc 267KB 含真实 React 文本。
- **round 9 HITL 闭合（A 级）**：`/control` takeOver→`humanHold.active:true`、release→`active:false`、bad action→`kitesurf.control.query`；**hold 期间 REST `/open`/`/edit` 正常放行**（pane 写不被 held 锁）而**桥 `sandbox.control claim` 精确返回 `kitesurf.control.held`**——HITL 语义与合同一致：held 只拒 MCP agent 写，不伤 pane 人工写。桥 `/health` 全字段（writer/humanHold/conns/upstreamAlive/pageTargetId/uptimeMs）实测正常；桥 WS `/mcp` 暴露 agent_browser_* 全套 + sandbox.*。
- **round 10 修复**：`/selftest` `shot-capturable` 无 error 时 detail 显示 `engine error: undefined`——detail 行读对象分支不看 ok 标志 → 改为 `frame captured`（PASS 时如实）。修后 selftest 11/11 且该行为 'frame captured'。`sandbox.ports` 返回 `engine/bridge:null`（未 configure 时无显式端点，非造假）。
- **round 11 B 级 G20**：`kitesurf-runtime` 契约冷态校验全通过——缺 receipt/`artifact.json`→'receipt is missing or invalid'；ref 不匹配→'receipt ref does not match … expected <pin>'；文件不全→'runtime is missing or incomplete … missing: …'；完整 runtime+正确 ref→**3 个 mount 返回**（`runtime→/opt/kitesurf:readonly`、`pfs→.wrangler`、`state→/var/lib/kitesurf-state`）。
- **round 11 A 级**：`/network?since=<upd-1>` 命中、`?since=<future>` 0 行——**since 按 updatedAt 增量游标语义实通**；`/snapshot` 返回 `tree+refs`（@n 引用含 selector/box/role）；`/har` 返回 `har-lite`+2 条 entries；`/history delta:-1` 真导航回退、`delta:1` 前进恢复；`/wait` 文本命中 `{ok:true}`、不命中 `kitesurf.wait.timeout`+incidentId；`/storage` 全 op（set/read/delete/clear 用 `name` 参数）实写入实返回；`/pick` 对 httpbin 命中 `main` 返回完整 fiber/style/box/selector。
- **round 13 catalog 防假绿深挖（5 真漂移，全修）**：新建 `catalog-parity.test.mjs` 双向对账（host emitter↔DNK mirror）抓出：①**catalog 遮蔽死行**——`engine.mismatch` 409 被先序 `engine.*`(502) 通配吞没，`send(409)` 救场但 `statusOf`/`/diagnostics` 说谎；已移到通配行前 + 加注释。②**镜像漏收 3 个真 emitter**——`dom.empty`/`cdp.page-lost`/`control.bridge` 补进 mirror。③**镜像虚构 4 个不存在 id**——`kite.remote`/`kite.node`/`console.query`/`snapshot.empty` 删（`/console?bad`→真 `query.limit`、`/kite bad`→真 `kite.state`、`/snapshot` 失败→`engine.connect`）。④settings 字段集勘误：`lat/lng`→`latitude/longitude`，`timezone` 不支持（仅 7 个键）。⑤`settings` 持久化 A 级实证：ja-JP+geo 跨导航生效、null 恢复 en-US。DNLS 263/263、DNK 74/74（build 重生 SKILL.md catalog 表）后全绿。
- **round 14 A 级 `/interact` 全系**：fill/type（逐字追加，读回 `via-refABC`）、check/uncheck（幂等：已 uncheck 再 uncheck 仍 `{ok:true}` 且 `checked:false`）、select、`@ref` 引用解析（`@3`→真实 selector 写入）全部实达真页面；错误面精确——`interact.miss`/`interact.type`(check on text input)/`interact.action`(unknown action)/`ref.miss`(`@99`)；`/wait` 语义勘定：`load` 是**修饰符非独立条件**（`{selector,load}` 合法、单 `load` 400 `wait.query`）；`select[name=size]` miss 因该 form 用 radio 无 select——如实。
- **round 15 A 级**：`/edit` 实写页面（`改后的名字` 真渲染）、超 4000→`edit.badtext`；`browse-history POST {clear:true}`→`removed:32`、GET 实 0 行、`source:instance-state`；**term.* 全链真实 PTY**——`term.session.create {sessionId}`→`dnt-ws-v1` attach URL、`input {id,data}`→真写、`read {id}`→回显 `TERMWORKS`、`close {id}`→ok；参数契约勘定：create 用 `sessionId`、其余用 `id`；`term create` 在 `terminal:absent` plane 下仍返回 attach URL 系如实（term lane 是独立 attach 面，非 engine 容器内 PTY）。
- **round 16 A 级 MCP/ops 面**：`sandbox.dom`→`{url,bytes,capturedAt}`（真实 srcdoc）、`sandbox.elements`→`{count,nodes,selector,matched}`、`sandbox.selftest`→全诊断文档（与 REST /diagnostics 同源）、`sandbox.targets`→`[browser,page]` targetInfo 真数组、`sandbox.bridge_health`→`{ok,status:200}`；`/operations?errorsOnly=true`→15 条历史错误（`interact.*`/`wait.*`，字段实为 `path/method/at/status/errorId/incidentId`——`route` 是我打印错字段名）；`term.audit`→`{sessions:[]}`（已 close 后如实为空）。
- **round 17 A 级**：`/pick {x,y}`→真元素包（tag/form）；`open file://` 与 `user:pass@` 均 `url.scheme` 400（凭证地址被拒）；`evaluate` >2000→`evaluate.toolong`、throw→`evaluate.threw`+真堆栈；`/last` 契约实证——导航清 `lastPick`（frameNavigated 擦除 refs+pick）、`preview:true` 不写、普通 pick 写入（element 含 ref 回填）；`sandbox.console {level:error}` 过滤为真空；`open http://example.com` 不强行升 https、落地 `http://`（不静默改约）；`term.audit`/`bridge_health`/`targets` 全如实。
- **round 18 G 项 A 级批量闭合**：**G03**——`/snapshot` 取 `@1` 交互成功 → `/open` 导航后同 `@1` 精确 `ref.miss` 404（refs 随 document 代际擦除）；**G23**——`evaluate` 调 `setTimeout(1200)` 注入 `#late-el`，`/wait{selector,timeoutMs:4000}` **真等待后命中**（非立即返回假 ok）；**G18**——cookie `g18-c` set→`document.cookie` 见 → delete → reload → 只剩 `guard=alive`，**跨 reload 不残留**；**G14**——`/settings` body >4096→`body.toolarge` 413（有界）；**G05**——404 入口 `ok:true`+同 DOM（stub 站点如实）、DNS 失败→`navigate.failed`+引擎 reference。
- **round 19 G07/G08 引擎边界实证（A 级）**：console 环 `seq` 单调（23→26）、`level=warn,error` 过滤精确、`source:console` 标注、log/warn/error 各恰一次；`?sinceSeq=25` 增量游标只回新行。**关键勘定**：直 CDP `Runtime.enable` 下 `setTimeout throw`/`Promise.reject`/未定义函数均**不产生 `exceptionThrown` 事件**，引擎统一降级为 `consoleAPICalled 'error'` 并包装文本为 `[kitesurf] pumped timer threw: [object Object]`——宿主如实记录为 `level:error`（无伪 `exception` level）；这是 pin 的引擎能力边界，非 host bug。
- **round 20 G12 双写争用（真 bug 修复）**：`sandbox.control` busy/held/query 分支 `{ok:false,...state()}` 展开顺序错——`state()` 的 `ok:true` 冲掉 `ok:false`，应答 `{ok:true,errorId:busy}` 自相矛盾。改为 `{...state(),ok:false,errorId}`。新 digest `sha256:4721…d9c1`/image `…-472144145d78`（mcp-bridge 属 RECIPE_FILES，profile.yaml 同步更新）。A 级实证：两独立 WS 连接，B 在 A 持锁时 claim→**`{ok:false, errorId:'kitesurf.control.busy'}`**、A release 后 B claim→`{ok:true}`。G12 双写争用至此闭合。
- **round 21 同类 bug 排查 + G13 诊断推送**：全仓扫 `{ok:false,...spread}` 展开吞标志模式——仅 `sandbox.control` 三处（已修 round 20），其余 spread 目标均无 `ok` 字段可覆盖（dom/elements/selftest/ports/stats/history/targets 皆安全）；`cdp-relay`/`mcp-tools`/`loop3-gaps` 19/19 在新桥上全绿；`sandbox.diagnostics` 返回**宿主推送的实时 stats 文档**（`at` 新鲜、`engine.targets`/`console`/`operations`/`ports`/`selftest` 13 字段），G13 推送管道实证在 published 桥端口工作。
- **round 22 G08 T08 闭合（A 级）**：`?since=` 按 `updatedAt` 增量游标——同 requestId 的 pending→finished 以**更新行**（同 id、新 updatedAt）重发而非新行：慢请求 `/delay/5` 飞行中行 `status:null/durationMs:null/failed:false`，完成后同 id `status:200/durationMs:4922`，`?since=<upd-1>` 只回该更新行。pending 以 `status:null` 如实表示（非伪 0/伪 pending 布尔）。**G08 游标语义完整闭合**。
- **round 23 G11 MCP 握手 + G08 failed 链**：`initialize`→`{id:1,protocolVersion:'2024-11-05',serverInfo:{name:'dsh-nano-local-sandbox'}}`；`notifications/initialized`（无 id）→**204 无 body**（标准 notification 语义）；`bogus/method`→`-32601 method not found`；`tools/call` 参数类型错→`sandbox.params.type`；缺 name→`tool.unknown`（`undefined` 如实）；string id 合法回显。G08 failed 链：`nx.invalid` 打开后 network 环行 `failed:true/status:null/error:'internal error; reference=…'`——失败如实落行非丢失非伪 status。
- **round 24 视觉级闭合（ego-browser 真 GUI）**：dsh-dev GUI（:3083）打开 Kitesurf 工作区入口 → pane 实渲染 `data-nano-kitesurf="1"` 根、地址栏显示 `https://legacy.reactjs.org/`（正是 curl `/open` 的同一容器页面——**G01 同页证据**）、`HTML`/`开发者工具`/`自适应`/`HTML 原生渲染` 模式可见、`静态预览` 徽章如实；`componentStack` 对 react.dev/legacy.reactjs.org 提取出 8 元素数组（生产压缩名如实非 null 非伪造）。证据 `1119-evidence/round24-pane-visual.png`。
- **round 25 G01 双向实证（视觉级）**：pane 地址栏填 `https://www.ietf.org`+Enter → 容器真导航 → REST `/status` page url=`ietf.org` → pane 渲染 IETF 127 San Francisco 完整版面（图片/链接/布局全真）。**双向同页**：REST→pane（round 24）+ pane→REST（round 25）。证据 `1119-evidence/round25-pane-ietf.png`。
- **round 26 G03 pane-pick 共享边界**：API 层已证 lastPick 写/导航擦/@ref 解析（round 17/18）；pane annotate→`/last` 的 GUI 链路经 ego-browser 交互脆弱（标注开关态与坐标命中不稳定，`/last` 读 null 未复现）——**如实标 NOT VERIFIED**，非丢证据：annotate→pick→lastPick 的 pane 内事件接线属 client 面，需业主人工点验或更稳的 GUI 驱动。
- **round 27 MCP instance/profile 面（A 级）**：`sandbox.instance.ensure {sessionId:'s1'}` 幂等——两次同 `kitesurf-dev`、`action` 缺席当 adopt（不重建）；`instance.status`→`{ready:true,phase:'running',containerName:'kitesurf-dev'}` 真快照；`profile.list`→`[{id:'kitesurf',digest:'sha256:4721…d9c1',ready:true}]`（与新 recipe digest 一致，非陈旧）；参数契约勘定——ensure/status 用 `sessionId` 非 `profile`（`profile` → `sandbox.params.extra` 400 如实拒绝）。
- **round 28 instance 生命周期（A 级）**：`stop`→`{action:'stopped'}`、`status`→`ready:false`（容器层仍 running、引擎挂起——`stop` 语义是 suspend 非 destroy）；`start`→`{action:'started'}`、`container list` 确认 `kitesurf-dev` running 于新 image `…-472144145d78`；`planes` 五面（container/engine/page/dom/bridge/terminal）如实分层——`page:blank` 与 `dom:skipped` 区分（挂起丢页非假 ready）。
- **round 29 生命周期闭环（A 级）**：suspend 丢页（page:blank）→ `/open example.com` 真落地 `ok:true` → selftest **11/11 全绿**、`page-target` 指 `example.com`——挂起后引擎复活且页面可重建，lifecycle 环完整。
- **round 12 A 级**：`/shot` 三格式 magic 字节真（png `89504e47`/jpeg `ffd8ffe0`/webp `52494646`）、`fit:{w,h}` 生效；`/state` 契约=storage+cookie+url(存档)——**load 恢复 storage/cookie 但不导航**（savedUrl 仅信息），例：example.org 设 `r12-key`→save→导 example.com→load→example.com 上读到 `r12-key:restored-value`；`/logs` 是**容器日志**（wrangler 输出，`text` 字段），`/console` 才是页 console——注入 `console.log('r12-probe-log')`/`error('r12-err')` 被真捕获（14 行含 fonts 注册）。

## 2.6 剩余（不变）

D 闸口（G01/G19 dsf/G24 session scope 决定/G29 HAR/G31）与 G20 冷交付矩阵、G25 repin、G30 i18n 行为、desktop 验收仍为 NOT RUN/D-gated。

## 2. 实测收口（dsh-dev，A 级）

- `POST /kite start`（无容器）→ `created healthy:true`；`resume` → `noop healthy:true`。
- `/status` 全 plane：`container:running / engine:cdp / page:open / bridge:up / backendError:null`。
- `/open`：example.com `landed`；httpbin `/status/404` 正常落地不崩；react.dev（SPA）`interactive→complete`。
- `/wait`：`{}`→400 `kitesurf.wait.query`；`load:'bogus'`→400；text 命中 200；未命中 504 预算内。
- `/snapshot` → 120 refs；`/refs?ref=@1` 反查 nav 节点命中（G03 的 @N 链路在 SPA 上实测）。
- `/state`：`__last__` 400 `state.name`；`constructor` 原型键 404 `state.miss`。
- `/storage op:'reed'` → 400 `storage.op`（不坠落 clear）。
- `/pick`：越界坐标 400 `pick.point`；选择器命中返回真实 selector+`@N`。
- `/shot format:'gif'` → 400 `shot.format`；`/settings viewport:{width:100}` → 400 `settings.viewport`；`/edit text:''` → 400 `edit.badtext`。
- `/operations?errorsOnly&limit` 行携 `incidentId`，与响应回声一致。
- `/logs?tail=abc` → 400 `query.tail`；`tail=-1` 钳位 20。
- MCP：`initialize` 握手完整；notification → 204 无假 result；`tools/list` 28 工具；`sandbox.history` 分组输出；`sandbox.instance.ensure` 返回真实 `kitesurf.backend.cli`。
- Relay：`ws://127.0.0.1:8801/cdp` `Browser.getVersion` + `Target.getTargets` 全链路通。
- `scripts/gui-smoke-kitesurf.sh` **9/9 PASS**（pane 挂载、/ports per-plane、/selftest 11 项、/dom srcdoc、Network 过滤、tab hover）。
- 单测：DNLS 253/253，DNK 71/71，`route-scan.mjs` exit 0。

## 3. 剩余已知缺口（台账，未闭合）

| 类别 | 项 | 状态 |
|---|---|---|
| **D 闸口**（需 [业主] 决定） | G01 同页所有权、G15/G22 configure/history 真源（已按账本决定实现 repoint，行为测试待补）、G18 cookie 属性面、G19 viewport DPR、G24 session 隔离、G29 HAR 声明、G31 超时公共语义 | 实现已按既有决定落地；针对行为的回归测试缺口保留 |
| **实测未跑** | G20 冷交付（空 home/缺 artifact/缺镜像矩阵）、G24 双 session 隔离 live、G25 repin 对照、G30 i18n 行为测试、desktop 独立验收 | NOT RUN——每轮需独立预算 |
| ~~**单测缺口**~~（loop-3 审查遗留，已补） | ~~cap-200 eviction~~→`loop3-gaps` ✅、~~`bridgeControlBase` IPv6~~→✅、~~`dropClient` 在途回复隔离~~→`cdp-relay` 8/8 ✅、~~`withPage` Page.enable/attach single-flight~~→✅、~~`/shot` png/webp/jpeg quality 透传~~→✅、~~`body.error.code`→`jsonrpc:<code>` ops 映射~~→✅、~~e2e-ego rows>0~~→console/network 行内容形状断言 ✅、~~`/logs?tail` NaN/钳位~~→✅ | `test/loop3-gaps.test.mjs` 7 例 + `cdp-relay` +1 例 |
| **镜像配方** | `linux-prefix` 构建上下文不入库、生成脚本不在包内；本次按 `--os=linux --cpu=arm64` 手工 staging | 下次 repin 需同一流程；建议登记到运维手册 |

## 4. 诚实声明

- 全绿测试不作为收口证据；以上 A 级项均在 `~/.dsh-dev`（3083）+ `kitesurf-dev` 容器 + `…-472144145d78` 镜像上实际执行。
- 未执行项明确标 NOT RUN；D 闸口项在 [业主] 决定前不得声称完成。
- `kitesurf-desktop`（8802/8803）与 `~/.dsh-desktop` 全程未触碰。

## 5. D 闸口裁决档案（[业主] 决定前不得声称完成）

以下 5 项在逻辑链条上影响**公共合同面**（错误枚举/会话所有权/协议 schema），按「不得擅自扩约」必须由 [业主] 决定并 durable 登记后才可实现或闭合。逐项给出裁决必要性、代码锚点、对生产/协议的传导路径：

### G01 — 同页所有权语义（`sandbox.control` / HITL）

- **裁决点**：pane（人）与 agent（MCP/CDP client）是否操作**同一 page target**，还是接受「同容器异 target」语义；「writer 锁」是否覆盖 pane 写。
- **为什么需裁决**：round 9/20 实证桥 `sandbox.control` 已有 `writer`/`humanHold` 锁且 `busy`/`held` 拒绝链成立，但**锁的域只是 MCP/桥连接**——REST `/open`/`/edit` 的 pane 写不查 `c.writer`（routes.js 的写路径不碰 `bridgeState.control`）。「人机共享单页、写串行」这句话里**「写」的边界**没有 durable 定义：是「仅 MCP 写」还是「一切移动页面的写（含 pane REST）」。这是公共合同面的措辞，不能由实现反推。
- **代码锚点**：[mcp-bridge.mjs:524](<../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L524>)（`sandbox.control` 描述+claim/busy 逻辑）、[routes.js:1060](<../../dsh-nano-local-sandbox/src/host/routes.js#L1060>)（`/control` 代理注释「the pane can't reach that port」）。
- **协议影响**：若决定「锁覆盖 pane 写」，REST 写路由要新增 `control.busy`/`held` 拦截分支（改变 REST 错误面）；若决定「锁仅 MCP 写」，需在 `sandbox.control` 描述与 SKILL.md 中把「one writer」改成「one MCP writer」避免 agent 误信。

### G19 — `deviceScaleFactor` / `viewport.mobile` 支持面

- **裁决点**：`/settings` 的 `viewport.deviceScaleFactor`（文档允许 1\|2\|3）与 `mobile` 媒体/触摸特征是否**真实现**，还是标 `unsupported` 缩约。
- **为什么需裁决**：`browser-settings-adapter.js` 的 viewport 补丁只改 `innerWidth/innerHeight`+media；`window.devicePixelRatio`、移动端 `matchMedia('(pointer:coarse)')`/touch 事件在 shim 里**没有实现**。是否「支持 DSF」是 `settings` 公共字段的可执行性，删字段或加实现都要决定。
- **代码锚点**：[browser-settings-adapter.js:59-65](<../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L59>)（viewport 补丁范围）、`:123`（`keysOnly` 允许字段集——`deviceScaleFactor` 是否在其中）。
- **协议影响**：`capabilities.unsupported` 列表与 `kitesurf.settings.*` 校验都要随决定收敛；不决定则 agent 设 `{deviceScaleFactor:2}` 会得 `ok:true` 但页面 DPR 不变——**协议撒谎**。

### G24 — env 共享 vs session 隔离

- **裁决点**：`sandbox.instance.ensure {sessionId}` 的 session 是否**隔离**（各自容器/端口/状态）还是**共享**（同一 env 容器多 session 注册）。
- **为什么需裁决**：round 27 实证 `ensure {sessionId:'s1'}` 复用 `kitesurf-dev`（共享）；`policy-stale` 409 暗示策略指纹变更要 recreate——但**没有双 session 的隔离/干扰测试**。`scope:'session'`（profile.list 返回）与「共享 env 容器」语义冲突：是「session 作用域的实例」还是「env 作用域的实例加 session 计数」。
- **代码锚点**：[mcp-sandbox.js:80](<../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L80>)（ensure schema `sessionId`）、[instance-registry.js:27](<../../dsh-nano-local-sandbox/src/host/instance-registry.js#L27>)（registry 是 session 键还是 env 键）。
- **协议影响**：决定「隔离」则要每 session 独立容器+端口（端口分配、`policy-stale` 的 per-session 语义都要改）；决定「共享」则 `scope:'session'` 标签是误述、`sweep`/`attached` 生命周期要明确。这直接决定 T24「两虚拟 session 无跨 session 误操作」的语义是否可达。

### G29 — HAR 声明校准（lite vs 标准）

- **裁决点**：`/har` 输出标 `_format:'har-lite'`、`headers:[]`——是**接受 lite 并文档化**，还是补全标准 HAR（含 request/response headers、timings、pages）。
- **为什么需裁决**：round 12 实证 `har-lite` 是如实自声明（`log.version:'1.2'`、`headers:[]` 因 pin 不发 header 事件）。但「HAR」在工具链里有标准 schema（HAR 1.2 spec）：`headers`/`timings`/`pages`/`cookies` 字段集。是「输出 lite 但改名/文档化」还是「补全标准字段」是公共输出合同的决定。
- **代码锚点**：[routes.js:1269-1277](<../../dsh-nano-local-sandbox/src/host/routes.js#L1269>)（`/har` 组装）、[cdp-elements.js:61-86](<../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L61>)（网络事件源——pin 是否真不发 `requestWillBeSent.headers`/`responseReceived`）。
- **协议影响**：决定「标准 HAR」则要桥侧抓 headers/timings（pin 若不发事件则不可达，须报「受限于 pin」）；决定「lite」则 `_format`/`skills`/`AGENTS.md` 要明确「HAR 子集，headers 恒空」避免 agent 期待标准字段。

### G31 — 超时后等待/取消/替换的公共语义

- **裁决点**：`timeoutMs` 到点后，是「**等待**返回部分态」、「**取消**中止 CDP 调用」、还是「**替换**排队下个导航」——统一公共合同。
- **为什么需裁决**：当前 `/open`/`/shot`/`/dom` 各自 `timeoutMs` 语义不同：`queueNavigation` 的 timeout 中止等待但导航 in-flight 不撤；`/wait` 的 504 是「条件未成立」非「传输死」；`/shot` 的 timeout 是 CDP send 的 deadline。是否「timeout 即取消」或「timeout 即排队」没有统一措辞，agent 无法预知超时副作用。
- **代码锚点**：[cdp-elements.js:159-163](<../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L159>)（CDP 预算）、`:97-108`（导航队列）、[navigation.js:3-5](<../../dsh-nano-kitesurf/src/shared/navigation.js#L3>)（HTTP 预算）、routes.js 各 `timeoutMs` 分支。
- **协议影响**：决定「取消」则要 CDP 调用带 abort 并新增 `navigate.cancelled`/`shot.cancelled` 错误（新枚举需决定）；决定「等待/替换」则文档化「timeout 仅影响应答返回点，引擎侧操作继续」——这是 `timeoutMs` 参数的合同含义，影响每个调用方的重试语义。

### 裁决执行路径

- 每个 D 项决定后：改 `routes.js`/`mcp-bridge.mjs`/`diagnostics.js`/`AGENTS.md` 对应面 → 补 `catalog-parity`/`delivery-guard` 断言 → 对应 T 项（T01/T19/T24/T29/T31）跑 A 级。
- 决定形式不限（[业主] 心智锁定/QnA 冻结），但同一决定只留一份 durable 登记，不另立仪式文件。
