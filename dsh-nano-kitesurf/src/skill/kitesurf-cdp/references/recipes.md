# recipes — 正例 / 负例（可直接复制）

## 正例

```bash
# 打开 → 诊断 → 快照取 ref → @N 驱动 → 点选 → 取包 → 改字 → 看 console
POST /nano-kitesurf/open      {"url":"https://example.com"}
GET  /nano-kitesurf/diagnostics?limit=10
GET  /nano-kitesurf/snapshot                 # → tree + {"@1":{selector:"a"}}
POST /nano-kitesurf/wait      {"selector":"@1","timeoutMs":5000}   # @N 直解
POST /nano-kitesurf/pick      {"selector":"@1"}                     # element.ref:"@1"
POST /nano-kitesurf/pick      {"x":640,"y":320}
GET  /nano-kitesurf/last
POST /nano-kitesurf/edit      {"selector":"@1","text":"Hello"}
POST /nano-kitesurf/evaluate  {"expression":"console.log('probe'); document.title"}
GET  /nano-kitesurf/console?level=log
```

## 负例（每个都要能预测结果，不要靠猜）

| 输入 | 预期 | 为什么 |
|---|---|---|
| `POST /open {"url":"ftp://x"}` | `400 kitesurf.url.scheme` | 只收 http(s) |
| `POST /open {"url":"http://u:p@x"}` | `400 kitesurf.url.credentials` | 拒绝带凭证地址 |
| `POST /pick {"x":"abc"}` | `400 kitesurf.pick.point` | 坐标必须是有限数 |
| `POST /pick {"selector":"[[["}` | `400 kitesurf.pick.selector` | 选择器语法错（Boa 把 SyntaxError 放 exception.description） |
| `POST /pick {"selector":"h1.nope"}` | `404 kitesurf.pick.miss` | 合法但未命中，不是 502 |
| `POST /pick {"selector":"@99"}`（无此 ref） | `404 kitesurf.ref.miss` | `@N` 不在表，先 `/snapshot` |
| `POST /pick {"x":60000,"y":1}` | `400 kitesurf.pick.point` | 越界；画布外点先检查 letterbox |
| `POST /wait {"selector":"p","text":"x"}` | `400 kitesurf.wait.query` | selector/text/url/fn 必须恰一 |
| `POST /wait {"selector":".nope","timeoutMs":2000}` | `504 kitesurf.wait.timeout` | 条件在时限内不成立 |
| `POST /edit {"selector":"","text":"x"}` | `400 kitesurf.edit.selector` | /edit 用自己的 id，不借 pick.badpoint |
| `POST /edit {"selector":"h1","text":"x"*4001}` | `400 kitesurf.edit.badtext` | text ≤4000 |
| `POST /shot` body >4096B | `413 kitesurf.body.toolarge` | 先回 413 再断流 |
| `POST /settings {"viewport":"phone"}` | `400 kitesurf.settings.viewport` | 存在但类型错，不静默吞 |
| `POST /settings {"viewport":{"width":9999}}` | `400 kitesurf.settings.viewport` | 宽 320..3840、高 240..2160；dsf 只 1/2/3 |
| `POST /settings {"extraHeaders":{"cookie":"a=b"}}` | `400 kitesurf.settings.headers` | 凭证类 header 名被禁 |
| 把 `httpBase` 指到 8787（Cursor 占） | **不删容器**：接管现有 8798 并 `adopted:true`；若连现端口也不可用则 `409 kitesurf.kite.portbusy` | 端口占用不是引擎故障，不能拆能用的容器 |
| `GET /nano-kitesurf/ports` | `{configured,effective,container.published,ports.engine.free,lastRepair}` | 一眼看「配置 8787/实跑 8798」 |
| `POST /nano-kitesurf/recover {}` | 自动 suspend→resume 并回报 `engineAlive` | 一键自愈 |
| `POST /history {"delta":2}` | `400 kitesurf.navigate.delta` | 只能 -1/+1 |
| `POST /kite {"action":"start"}` 当 running | `409 kitesurf.kite.state` | 阶段错，不是引擎故障 |
| `configure` 到 `http://evil.example` | `400 kitesurf.kite.remote` | 远程需 allowRemote |
| `suspend` 中 `/pick` | `502 kitesurf.engine.connect` | 引擎已停，<10ms 不挂 |
| 黑洞地址 `/open` | `504 kitesurf.navigate.egress` | 出站 25s 超时 |
| `POST /perf-review/host?mode=window`（GET） | `400 kitesurf.perf.method` | 排水只允许 POST |
