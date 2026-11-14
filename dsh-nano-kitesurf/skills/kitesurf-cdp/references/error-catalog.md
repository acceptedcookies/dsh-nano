# error-catalog — errorId → status → 原因 → 下一步（GENERATED from ERROR_CATALOG）

A failed call returns `{ok:false,errorId,error}` with a real HTTP status. The same pair is the toast; `/status` repeats it as `lastError`; `/operations` keeps history; `/diagnostics` ships this whole table as `observability.errorCatalog`. **Do not paraphrase the id.** Unlisted ids are 502 (upstream/engine).

| errorId | HTTP | 原因 | 下一步 |
|---|---|---|---|
| `kitesurf.body.toolarge` | 413 | 请求体超过该路由上限（shot/pick/settings/history 4096B，edit 8192B） | 拆小请求；/edit text ≤4000 字符；不要整页 HTML 塞进 body |
| `kitesurf.body.json` | 400 | body 不是 JSON 对象、JSON 截断或为空 | 确认 content-type: application/json 与合法 JSON 对象；空 body 视为 {} |
| `kitesurf.url.scheme` | 400 | 地址为空/超长/非 http(s)/带用户名密码 | 用完整 https:// 地址；去掉 user:pass@；长度 ≤2000 |
| `kitesurf.pick.point` | 400 | 坐标非有限数/越界，或选择器语法错 | 坐标取画面内容区域（注意 letterbox 黑边）；selector 用合法 CSS |
| `kitesurf.pick.badpoint` | 400 | selector 缺失或含控制字符 | 传 {selector:"h1"} 或先 /pick {x,y} |
| `kitesurf.pick.miss` | 404 | 坐标下没有元素，或选择器未命中（输入侧未命中，不是引擎故障） | 重新 /shot 拿最新画面；换 selector；确认页面已 /open |
| `kitesurf.pick.failed` | 502 | 引擎侧元素探针异常 | GET /status 看 engineMismatch；POST /kite {action:"resume"} |
| `kitesurf.edit.badtext` | 400 | text 为空/超 4000，或 selector 缺失非法 | /edit 必须同时给 selector 与 1..4000 字符 text |
| `kitesurf.edit.miss` | 404 | 改字目标选择器未命中 | 重新 /pick 取 selector；页面若已导航需重选 |
| `kitesurf.shot.scroll` | 400 | scroll 非有限数/超 ±4000，format 不是 png/jpeg/webp，或 fit 不是 {width,height} | POST /shot {scroll: ±整数, format:"webp", quality:1..100, fit:{width,height}} |
| `kitesurf.settings.viewport` | 400 | userAgent/viewport/media/extraHeaders 形状非法或值越界（视口 320..3840 × 240..2160；dsf 1/2/3；media screen|print；header 名禁用凭证类） | POST /settings {"viewport":{"width":1024,"height":768},"media":"print","extraHeaders":{"X-Debug":"1"}}；任一字段传 null 清除；空串 UA 清除伪装 |
| `kitesurf.kite.state` | 409 | 生命周期阶段不符（idle 才能 start、running 才能 suspend、suspended 才能 resume） | GET /status 读 kite.phase；按阶段选 start/suspend/resume；host 重启后 phase 会自动 adopt |
| `kitesurf.kite.remote` | 400 | configure 参数非法、远程地址未开 allowRemote、或缺少 KITESURF_CHECKOUT/config.checkout | loopback 地址；mcpPort 1..65535；在 profile patch 写 config.checkout |
| `kitesurf.kite.node` | 500 | Node 版本过低或锁文件不可写 | 需要 Node ≥22；检查 DSH_HOME 可写 |
| `kitesurf.kite.portbusy` | 409 | 要重建到的宿主端口被其他程序占用（本机 8787 常被 Cursor 占用） | 把 profile 的 config.httpBase 指到空闲端口（如 http://127.0.0.1:8798）后重启宿主；现有容器不会被删 |
| `kitesurf.kite.container` | 502 | container CLI 冷启动/镜像/挂载失败（错误正文含 stdout 尾部真因） | 看 error 里的 failed to bootstrap 类信息；container system start；GET /diagnostics 看最近操作 |
| `kitesurf.navigate.egress` | 504 | 目标站点出站超过 25s（引擎写入 egress timeout） | 换可达站点；不要重试同一地址；GET /status 确认引擎仍活 |
| `kitesurf.navigate.delta` | 400 | /history delta 不是 -1 或 +1 | POST /history {delta:-1} 后退 / {delta:1} 前进 |
| `kitesurf.navigate.failed` | 502 | Page.navigate 超时或被拒绝（DNS/网络） | 检查 URL 可达；超时后不要立刻重复 open（可能已在导航） |
| `kitesurf.engine.context` | 409 | 页面正在导航，JS 执行上下文被销毁（竞态，不是引擎故障） | 已自动重试一次；仍失败时等页面稳定后重试，或 POST /recover 一键恢复 |
| `kitesurf.engine.connect` | 502 | CDP 连接失败/服务不是 Kitesurf/socket 关闭/命令超时 | GET /status；container list；curl http://127.0.0.1:8798/health；必要时 /kite resume |
| `kitesurf.perf.method` | 400 | mode=window 排水只允许 POST | GET /perf-review/host 读快照；POST /perf-review/host?mode=window 排水 |
| `kitesurf.context.miss` | 404 | 上下文引用不存在或 text 为空（ref 环只保留最近 50 条，宿主重启即清空） | 重新点选生成新 ref；GET /nano-kitesurf/context 列出最近引用 |
| `kitesurf.console.query` | 400 | console 查询参数非法 | GET /console?level=error&limit=50；POST /console {clear:true} 清空 |
| `kitesurf.diag.query` | 400 | diagnostics/operations 查询参数非法 | GET /diagnostics?limit=20；GET /operations?errorsOnly=true |
| `kitesurf.evaluate.empty` | 400 | expression 为空或超过 2000 字符 | POST /evaluate {expression:"document.title"}，≤2000 字符 |
| `kitesurf.evaluate.exception` | 400 | 页面 JS 求值抛异常（输入侧表达式错误） | 看 error 里的异常描述；先 /open 再求值；确认 selector/变量名存在 |
| `kitesurf.wait.query` | 400 | /wait 条件不合法：selector/text/url/fn 必须恰好一个，load 必须是 commit|domcontentloaded|load|networkidle | POST /wait {selector:".ready"} 或 {text:"Done"} 或 {url:"/home"}；加 load:"networkidle" 等空闲 |
| `kitesurf.wait.timeout` | 504 | 等待超时：条件在 timeoutMs 内没成立（元素没出现/文本没渲染/导航没到） | 确认条件写对（selector 真实存在？）；加大 timeoutMs≤30000；GET /console 看页面是否报错 |
| `kitesurf.history.body` | 400 | /browse-history POST body 不是 {clear:true}，或 /history body 不是 {delta:±1} | POST /browse-history {"clear":true}；导航用 POST /history {delta:-1|1} |
| `kitesurf.network.query` | 400 | /network 查询参数非法（limit 越界） | GET /network?limit=1..200&failedOnly=true；POST /network {clear:true} 清空 |
| `kitesurf.shot.empty` | 502 | 引擎返回了空截图（页面不可绘/渲染器忙） | 确认页面已 /open；等一秒重试；仍空则 GET /diagnostics 看页面是否 about:blank |
| `kitesurf.dom.blank` | 502 | 无文档可序列化（页面未打开/仍是 about:blank/文档不可序列化） | 先 POST /open；空白页是 socket 断开重置的信号 — GET /status 看 phase |
| `kitesurf.elements.empty` | 502 | 引擎 DOM.getDocument 未返回文档根（页面未打开） | 先 POST /open；或 GET /elements?selector=… 前先确认页面存在 |
| `kitesurf.snapshot.empty` | 502 | a11y walker 没返回 JSON / 在页面里抛异常 | 先 POST /open 再 GET /snapshot；页面若 about:blank 先导航 |
| `kitesurf.ref.miss` | 404 | @N 元素 ref 不在当前表（页面变了/还没跑过 /snapshot） | GET /nano-kitesurf/snapshot 重建 ref 表后重试；或直接传 selector |
| `kitesurf.evaluate.miss` | 404 | evaluate 的 token 不在页内缓存（过期/页面重建） | 重新 POST /evaluate {expression} 取新 token；token 缓存页级，导航即失效 |
| `kitesurf.storage.op` | 400 | storage 请求缺 name 或 op 非法 | GET /storage?scope=local|session|cookie 读；POST {scope,op:set|delete|clear,name,value} |
| `kitesurf.storage.exception` | 400 | storage 页面内操作抛异常（如 cookie 语法/配额） | 看 error 描述；localStorage/sessionStorage 用 key-value；cookie 走 document.cookie（HttpOnly 不可达） |
| `kitesurf.state.miss` | 400 | /state load 缺 state 或命名快照不存在/页面内恢复抛异常 | POST /state {action:save,name:"x"} 先存；load 传 {action:load,name:"x"} 或 {action:load,state:{...}} |
| `kitesurf.interact.selector` | 400 | /interact 缺 target/selector 或 action 非法 | POST /interact {action:click,target:"@1"} 或 {action:fill,target:"input",text:"x"} |
| `kitesurf.interact.occluded` | 404 | 交互失败：元素未命中/零 box/被遮挡/无该 option/类型不支持该 action | occluded 时先 scroll 或关覆盖层；miss 重跑 /snapshot 或换 selector；check/select 只对 checkbox/select 元素 |
| `kitesurf.interact.exception` | 400 | 页内合成事件抛异常 | 看 error 描述；确认元素可交互（非 disabled/readonly） |
