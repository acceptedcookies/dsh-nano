# error-catalog — errorId → status → 原因 → 下一步（GENERATED from ERROR_CATALOG）

A failed call returns `{ok:false,errorId,error}` with a real HTTP status. The same pair is the toast; `/status` repeats it as `lastError`; `/operations` keeps history; `/diagnostics` ships this whole table as `observability.errorCatalog`. **Do not paraphrase the id.** Unlisted ids are 502 (upstream/engine).

| errorId | HTTP | 原因 | 下一步 |
|---|---|---|---|
| `kitesurf.body.toolarge` | 413 | 请求体超过该路由上限（shot/pick/settings/history 4096B，edit 8192B） | 拆小请求；/edit text ≤4000 字符；不要整页 HTML 塞进 body |
| `kitesurf.body.json` | 400 | body 不是 JSON 对象、JSON 截断或为空 | 确认 content-type: application/json 与合法 JSON 对象；空 body 视为 {} |
| `kitesurf.url.scheme` | 400 | 地址为空/超长/非 http(s)/带用户名密码 | 用完整 https:// 地址或裸 host[:port][/path]（自动补 https）；去掉 user:pass@；长度 ≤2000 |
| `kitesurf.pick.point` | 400 | 坐标非有限数/越界，或选择器非法/含控制字符 | 坐标取画面内容区域（注意 letterbox 黑边）；selector 用合法 CSS |
| `kitesurf.pick.miss` | 404 | 坐标下没有元素，或选择器未命中（输入侧未命中，不是引擎故障） | 重新 /shot 拿最新画面；换 selector；确认页面已 /open |
| `kitesurf.edit.badtext` | 400 | text 非 1..4000 字符，或 selector 超 320 字符 | /edit 必须同时给 selector 与 1..4000 字符 text |
| `kitesurf.edit.miss` | 400 | 改字目标缺 selector/@N，或选择器页内未命中（DNLS 发射均为 400） | POST /edit {selector,text}；页面若已导航需重选 |
| `kitesurf.shot.scroll` | 400 | scroll 非有限数/超 ±4000，format 不是 png/jpeg/webp，或 fit 不是 {width,height} | POST /shot {scroll: ±整数, format:"webp", quality:1..100, fit:{width,height}} |
| `kitesurf.settings.viewport` | 400 | userAgent/viewport/media/extraHeaders 形状非法或值越界（视口 320..3840 × 240..2160；dsf 1/2/3；media screen|print；header 名禁用凭证类） | POST /settings {"viewport":{"width":1024,"height":768},"media":"print","extraHeaders":{"X-Debug":"1"}}；任一字段传 null 清除；空串 UA 清除伪装 |
| `kitesurf.kite.state` | 409 | 生命周期阶段不符、configure 目标不可达（idle 才能 start、running 才能 suspend、suspended 才能 resume） | GET /status 读 kite.phase；按阶段选 start/suspend/resume；host 重启后 phase 会自动 adopt |
| `kitesurf.kite.state` | 409 | kite 动作与当前 phase 不符、引擎不可达、或 action 未知 | GET /status 看 phase；action ∈ init|start|suspend|resume|configure；configure 参数非法走 kitesurf.body.json |
| `kitesurf.navigate.egress` | 504 | 目标站点出站超时（引擎 errorText 写 egress） | 换可达站点；不要重试同一地址；GET /status 确认引擎仍活 |
| `kitesurf.navigate.delta` | 400 | /history delta 不是 -1 或 +1 | POST /history {delta:-1} 后退 / {delta:1} 前进 |
| `kitesurf.navigate.failed` | 502 | Page.navigate 超时或被拒绝（DNS/网络） | 检查 URL 可达；超时后不要立刻重复 open（可能已在导航） |
| `kitesurf.engine.mismatch` | 409 | configure 目标回答 devtools 但不是 Kitesurf 引擎 | 指到 Kitesurf 容器端口，不要指向本机 Chrome |
| `kitesurf.engine.connect` | 502 | CDP 连接失败/服务不是 Kitesurf/socket 关闭/命令超时 | GET /status；container list；curl http://127.0.0.1:8798/health；必要时 /kite resume |
| `kitesurf.evaluate.empty` | 400 | expression 为空或超过 2000 字符 | POST /evaluate {expression:"document.title"}，≤2000 字符 |
| `kitesurf.evaluate.exception` | 400 | 页面 JS 求值抛异常（输入侧表达式错误） | 看 error 里的异常描述；先 /open 再求值；确认 selector/变量名存在 |
| `kitesurf.wait.query` | 400 | /wait 条件不合法：selector/text/url/fn 必须恰好一个，load 必须是 commit|domcontentloaded|load|networkidle | POST /wait {selector:".ready"} 或 {text:"Done"} 或 {url:"/home"}；加 load:"networkidle" 等空闲 |
| `kitesurf.wait.timeout` | 504 | 等待超时：条件在 timeoutMs 内没成立（元素没出现/文本没渲染/导航没到） | 确认条件写对（selector 真实存在？）；加大 timeoutMs≤30000；GET /console 看页面是否报错 |
| `kitesurf.history.body` | 400 | /browse-history POST body 不是 {clear:true}，或 /history body 不是 {delta:±1} | POST /browse-history {"clear":true}；导航用 POST /history {delta:-1|1} |
| `kitesurf.network.query` | 400 | /network 查询参数非法（limit 越界） | GET /network?limit=1..200&failedOnly=true；POST /network {clear:true} 清空 |
| `kitesurf.shot.empty` | 502 | 引擎返回了空截图（页面不可绘/渲染器忙） | 确认页面已 /open；等一秒重试；仍空则 GET /diagnostics 看页面是否 about:blank |
| `kitesurf.dom.blank` | 502 | 无文档可序列化（页面未打开/仍是 about:blank/文档不可序列化） | 先 POST /open；空白页是 socket 断开重置的信号 — GET /status 看 phase |
| `kitesurf.elements.empty` | 502 | 引擎 DOM.getDocument 未返回文档根（页面未打开） | 先 POST /open；或 GET /elements?selector=… 前先确认页面存在 |
| `kitesurf.ref.miss` | 404 | @N 元素 ref 不在当前表（页面变了/还没跑过 /snapshot） | GET /nano-local-sandbox/snapshot 重建 ref 表后重试；或直接传 selector |
| `kitesurf.evaluate.miss` | 404 | evaluate 的 token 不在页内缓存（过期/页面重建） | 重新 POST /evaluate {expression} 取新 token；token 缓存页级，导航即失效 |
| `kitesurf.storage.op` | 400 | storage op 不在白名单 read|set|delete|clear | POST {scope,op:read|set|delete|clear,name,value}；未知 op 直接 400，不会静默清空 |
| `kitesurf.state.miss` | 404 | /state load 的命名快照不存在（DNLS 真源状态） | POST /state {action:save,name:"x"} 先存；load 传 {action:load,name:"x"} 或 {action:load,state:{...}} |
| `kitesurf.interact.selector` | 400 | /interact 缺 target/selector 或 action 非法 | POST /interact {action:click,target:"@1"} 或 {action:fill,target:"input",text:"x"} |
| `kitesurf.interact.occluded` | 400 | 交互失败：元素未命中/零 box/被遮挡/无该 option/类型不支持该 action（DNLS 发射为 400） | occluded 时先 scroll 或关覆盖层；miss 重跑 /snapshot 或换 selector；check/select 只对 checkbox/select 元素 |
| `kitesurf.query.limit` | 400 | 查询参数不是数字 | limit/since/sinceSeq/tail/depth 传数字 |
| `kitesurf.evaluate.threw` | 400 | 表达式抛异常/超长/为空 | ≤2000 字符，修表达式 |
| `kitesurf.dom.blank` | 502 | 页是 about:blank 或 srcdoc 为空 | 先 /open 地址 |
| `kitesurf.backend.cli` | 502 | container CLI 失败/超时 | GET /selftest 看 backend.lastError |
| `sandbox.params.type` | 400 | sandbox.* 工具参数类型不符 | 查工具 inputSchema |
| `kitesurf.network.missing` | 404 | 网络条目不存 | 查 /network 当前条目 |
| `kitesurf.shot.fit` | 400 | fit 尺寸非法 | width 320..3840, height 240..2160 |
| `sandbox.instance.policy-stale` | 409 | 策略指纹变化，需重建实例 | POST instance ensure |
| `sandbox.profile.unknown` | 404 | 未知 profile 名 | GET profiles 列表 |
| `sandbox.selftest.unavailable` | 502 | selftest 不可用 | 宿主 /selftest |
| `kitesurf.tool.unknown` | 404 | DNLS 对未映射工具/路径的 404 发射（命名有误或方法不对） | 对 tools/list 与路由表核对名字和方法 |
| `kitesurf.state.name` | 400 | '__last__' 保留名被占用 | 换名或不带 name |
| `kitesurf.dom.empty` | 502 | 没有可序列化的文档/引擎页未打开 | 先 POST /open 再重试 /dom |
| `sandbox.cdp.page-lost` | 502 | 该实例的页面 socket 已丢失 | 按 lastUrl 重开，不要复用旧 DOM |
| `kitesurf.control.bridge` | 502 | 容器 MCP 桥不可达（humanHold/控制态读写失败） | GET /status 看 phase；桥健康走 sandbox.bridge_health |
