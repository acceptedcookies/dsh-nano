# recipes — 正例 / 负例（可直接复制）

## 五条端到端配方

### 1. 读人类点选并回答
人在画面点了元素。pane 把 `/pick` 应答保存在自己的状态里；agent 要同一份包时再发一次：
```bash
POST /nano-local-sandbox/pick  {"selector":"h1"}     # pick.element{selector,text,box,style×7,attrs,parentSel,childSel,ancestors,componentStack,ref}
```
元素包一调即全。答「这是 h1/body 第 N 段」，带 `element.selector`（兜底句柄）与 `element.ref`（@N，需跑过 /snapshot）。最近点选不是宿主状态，重发 `/pick` 即可。

### 2. 就改改字并截图复核
```bash
POST /nano-local-sandbox/edit    {"selector":"h1","text":"新文案"}      # 写回渲染态
POST /nano-local-sandbox/shot    {"format":"webp"}                       # 复核渲染结果
GET  /nano-local-sandbox/diagnostics?limit=5                             # 顺带看 stale/空快照 hint
```

### 3. 注入 console.log 探针
```bash
POST /nano-local-sandbox/evaluate {"expression":"console.log('KITE-PROBE', performance.now()); 1"}
GET  /nano-local-sandbox/console?level=log&limit=10                      # 取回 KITE-PROBE 行（带回栈）
```

### 4. MCP-only 排障（无 host 路由时）
宿主 HTTP `/nano-local-sandbox/mcp` 的 `tools/call` 工具名是 `sandbox.*`：
```
sandbox.control  {action:"claim"}                         # 请求 MCP 写锁（只约束 MCP 写者）
sandbox.bridge_health                                      # 桥/引擎/conns
sandbox.diagnostics                                        # 一击诊断（hints/console/ops/catalog）
sandbox.error_catalog                                     # errorId 目录对照
sandbox.control  {action:"release"}
```

### 5. 本地 dev 站调试（宿主 localhost → 容器）
宿主上跑着 `next dev`/`vite`/`npm run dev` 之类的 localhost 服务时，容器内 `localhost` 是容器自己——**先用宿主网关地址把 URL 翻译成容器视角再开**：
```bash
# 1. 取容器宿主网关（运行时值，勿字面量化）
GET /nano-local-sandbox/status            # → networking.hostGateway（如 "192.168.x.y"）
# 2. 用它代替 localhost 导航（示例 hostGateway=G、dev 端口 3000）
POST /nano-local-sandbox/open  {"url":"http://<hostGateway>:3000/home"}
# 3. 白屏/应用坏：页面 committed 但 JS 未跑 → 先查 console 与失败请求，别怪引擎
GET /nano-local-sandbox/console?level=exception,error&limit=20
GET /nano-local-sandbox/network?failedOnly=true&limit=20
GET /nano-local-sandbox/diagnostics        # hints 已把「页面加载但应用异常」派生出来
```
**本地 dev 特有的坑（负例见下表）**：
- **http 非 secure-context**：宿主网关地址不是 `localhost` 字面量，页内 `ServiceWorker`/`crypto.subtle`/`clipboard`/`MediaDevices` 等 secure-only API 静默不可用——dev 站若依赖它们，行为差异不是引擎 bug。
- **HMR/WebSocket**：`next dev` 的 `/_next/webpack-hmr`、`vite` 的 HMR socket 走同一网关地址即可达（同端口同源）；看不到热更新先看 `/network` 里该请求是否 `failed`/被 PNA 拦。
- **PNA（Private Network Access）**：页面 origin 是公网时，页内向更私密地址（私网 IP/`localhost`）的子请求会被引擎拦（`x-kitesurf-blocked: private-network`）。本地 dev 站本身是私网源、页面又 fetch 公网 API，是**升向**（private→public）允许；反向（公网页面够宿主 localhost）被拦——用同源 dev 页面本身验证，不要让公网页面去够宿主 localhost。
- **cookie 域**：`Set-Cookie` 写 host-only 域——`localhost:3000` 与 `<hostGateway>:3000` 是**两个域**。容器内打开的是后者，宿主浏览器里的登录态 cookie **不会**跟过来；需要登录态用 `POST /settings {cookies:[…]}` 显式种。
- **地址写法**：`localhost:3000` 不带 scheme 时 `navigationUrl` 会补 `https://` 变 `https://localhost:3000`——容器内既错主机又错协议。**永远写全 `http://<hostGateway>:<port>`**。

**渲染面：非 https 站的样式由插件负责，不要推给使用者**

- 面板默认走**引擎渲染**（`/shot` 的像素）：引擎在容器内自己加载页面，`http://<hostGateway>:<port>` 的 CSS/图片正常——**打开本地站就看到完整样式是默认结果**，不需要任何前置动作。
- 「HTML 原生渲染」（底部 `HTML` 按钮）是**静态投影**：脚本已剥离，且 `iframe srcdoc` 继承宿主 https origin，直连 `http:` 子资源会被浏览器按混合内容**静默拦掉**，只剩骨架。它要好看，只能靠宿主侧的同源资源代理（把 `<base>` 与绝对子资源改写到 dsh 源）。宿主没提供这条代理时，HTML 模式就是无样式骨架——**这是已知降级，不是要你解决的问题**：切回默认引擎渲染即可。
- 所以：**看到无样式骨架，先确认当前是哪个渲染面**（底部 `HTML` 是否被按下），再决定。不要因为骨架去做 http→https、装证书、开隧道——那是把插件该解决的事推给使用者，见下表。
- 代理存在时，越界是显式错误、不静默降级：只收 `http`/`https` → 400 `res.scheme`；带凭据主机 400 `res.host`；>24MiB 413 `res.size`；上游不可达 502 `res.upstream`；15s 超时 504 `res.timeout`。代理不存在时这些路由直接 404 —— 那就是「宿主没有这个能力」，回引擎渲染。

**明令禁止（做了就是错，不是"另一种可行方案"）**

| 禁止的做法 | 为什么禁止 | 做了会看到什么 |
|---|---|---|
| 让使用者的 dev server 上 TLS / 装自签证书 | 把插件该解决的问题推给使用者；pane 在宿主 Keychain、引擎在容器信任域，两端都得装 CA | 负担没消失只是换位置；引擎对自签证书直接 `internal error` |
| `cloudflared` / `ngrok` / `localtunnel` 暴露本地站 | 完整绕过部署拓扑，把私网 dev 站搬到公网 | 违反仓库 [不得侧载]；即便渲染通了也是错误方案，**不得作为建议提出** |
| 在 skill / hint / 代码里写死网关 IP | 拓扑随 backend 变（vz NAT、docker、cloud 各不相同） | 换环境即失效；只引 `networking.hostGateway` 字段名，永不引值 |
| 用 `http://localhost:<port>` 直连 | 容器内 `localhost` 是容器自己 | 502 `navigate.failed` + `net::ERR_CONNECTION_REFUSED` |

### 6. 写反馈报告（结构化回执）
排障完成后按 `templates/feedback-report.md` 填：元信息（buildId/phase）→ 诊断摘要（/diagnostics hints 与 errorCatalog；`/operations` 只按 sandboxId+operationId 读 lifecycle 记录）→ 观察到的现象 → 诊断摘录（hints/console/errorCatalog）→ 元素上下文（`/pick` 应答 + `/refs?ref=@N` 反查）→ errorId 对照 `/diagnostics` 的 `errorCatalog` → 下一步命令。结构化报告是可归档数据，不是散文。

**谁有资格打开页面**

`POST /nano-local-sandbox/open` 是**写级鉴权**：它要 dsh 的 GUI 会话 cookie，而 agent 没有。agent 用 curl 打它会得到 `401`（JSON 拒绝，请求到不了路由处理器）——这是设计，不是你少带了什么 header。

| 谁 | 打开页面的正确做法 |
|---|---|
| 人（在 pane 里） | 地址栏，或 `POST /open`（浏览器自动带 cookie） |
| agent | 走 relay：`ws://<host>:<status.lifecycle.mcpPort>/cdp` 发 `Page.navigate {url}`；或用 `agent-browser --cdp <status.cdp> open <url>` |

agent 为什么不用 `/open`：它拿不到 cookie；就算借到人的 cookie，也等于**冒用人身份**写宿主状态，违反 [不得侧载]。relay 是宿主自己发布给 agent 的通道（loopback publish），复用的同一条上游引擎连接，看到的就是人那一页。

```bash
# 正例：agent 打开宿主上的 dev 站
GW=$(curl -s .../nano-local-sandbox/status | jq -r '.networking.hostGateway')
agent-browser --cdp "$(curl -s .../status | jq -r .cdp)" open "http://$GW:5173/"
```

```bash
# 负例：agent 直接 curl /open —— 401；不要用人的 token 去补
curl -sX POST .../nano-local-sandbox/open -d '{"url":"http://…"}'
```

## 正例

```bash
# 打开 → 诊断 → 快照取 ref → @N 驱动 → 点选 → 改字 → 看 console
POST /nano-local-sandbox/open      {"url":"https://example.com"}
GET  /nano-local-sandbox/diagnostics?limit=10
GET  /nano-local-sandbox/snapshot                 # → tree + {"@1":{selector:"a"}}
POST /nano-local-sandbox/wait      {"selector":"@1","timeoutMs":5000}   # @N 直解
POST /nano-local-sandbox/pick      {"selector":"@1"}                     # element.ref:"@1"
POST /nano-local-sandbox/pick      {"x":640,"y":320}
POST /nano-local-sandbox/edit      {"selector":"@1","text":"Hello"}
POST /nano-local-sandbox/evaluate  {"expression":"console.log('probe'); document.title"}
GET  /nano-local-sandbox/console?level=log
GET  /nano-local-sandbox/har                     # _format:'har-lite'，headers 恒空
```

## 负例（每个都要能预测结果，不要靠猜）

| 输入 | 预期 | 为什么 |
|---|---|---|
| `POST /open {"url":"ftp://x"}` | 400 输入类 | 只收 http(s) |
| `POST /open {"url":"http://u:p@x"}` | 400 输入类 | 拒绝带凭证地址 |
| `POST /pick {"x":"abc"}` | 400 输入类 | 坐标必须是有限数 |
| `POST /pick {"selector":"[[["}` | 400 输入类 | 选择器语法错 |
| `POST /pick {"selector":"h1.nope"}` | 404 未命中 | 合法但未命中，不是 502 |
| `POST /pick {"selector":"@99"}`（无此 ref） | 404 `ref.miss` | `@N` 不在表，先 `/snapshot` |
| `POST /pick {"x":60000,"y":1}` | 400 | 越界；画布外点先检查 letterbox |
| `POST /wait {"selector":"p","text":"x"}` | 400 输入类 | selector/text/url/fn 必须恰一 |
| `POST /wait {"selector":".nope","timeoutMs":2000}` | 504 `wait.timeout` | 条件在时限内不成立 |
| `POST /edit {"selector":"","text":"x"}` | 400 输入类 | /edit 用自己的选择器校验 |
| `POST /edit {"selector":"h1","text":"x"*4001}` | 400 输入类 | text ≤4000 |
| `POST /shot` body >4096B | 413 body 超限 | 先回 413 再断流 |
| `POST /settings {"viewport":"phone"}` | 400 输入类 | 存在但类型错，不静默吞 |
| `POST /settings {"viewport":{"width":9999}}` | 400 输入类 | 宽 320..3840、高 240..2160 |
| `POST /settings {"viewport":{"deviceScaleFactor":2}}` | 400 `settings.unsupported` | 只支持 dsf 1 |
| `POST /settings {"viewport":{"mobile":true}}` | 400 `settings.unsupported` | 只支持 mobile false |
| `POST /settings {"extraHeaders":{"cookie":"a=b"}}` | 400 输入类 | 凭证类 header 名被禁 |
| `GET /nano-local-sandbox/ports` | `{effective,ports,container}` | 端口由实例 registry 返回；本包不接管容器 |
| `POST /lifecycle {"action":"restart","requestId":"<uuid>"}` | 显式重启所选沙箱，轮询 `GET /operations?operationId=<op>` 到 succeeded | 无隐式修复 |
| `POST /history {"delta":2}` | 400 输入类 | 只能 -1/+1 |
| `POST /lifecycle {"action":"start"}` 当 running | 409 | 阶段错，不是引擎故障 |
| `stopped`/`suspended` 中 `/pick` | 502 引擎连接失败 | 引擎已停 |
| 黑洞地址 `/open` | 504 `navigate.egress` | 出站超时；先读 `/status` 的 `navigation.outcome`，仍是 `in-flight` 就不要重发 |
| `POST /open {"url":"http://localhost:3000"}`（容器内） | 502 `navigate.failed` `ERR_CONNECTION_REFUSED` | 容器内 localhost 是容器自己；宿主 dev 站用 `networking.hostGateway` 地址（见配方 5） |
| `POST /open {"url":"localhost:3000"}` | 400→502 链错 | 无 scheme 补成 `https://localhost:3000`——容器内双重错；写全 `http://<hostGateway>:<port>` |
| `/open` 200 但页面白屏 | 不是导航失败 | 页面 committed 但应用 JS 报错/资源被拦；先 `/console?level=exception,error` + `/network?failedOnly=true`，见配方 5 第 3 步 |
| 公网页面 fetch 宿主 localhost 子资源 | 403 `x-kitesurf-blocked:private-network` | PNA：公网源不可够更私密地址；用同源 dev 页本身调试 |
