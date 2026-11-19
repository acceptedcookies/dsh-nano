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
sandbox.operations {errorsOnly:true}                       # 失败 trace + errorId + incidentId
sandbox.control  {action:"release"}
```

### 5. 写反馈报告（结构化回执）
排障完成后按 `templates/feedback-report.md` 填：元信息（buildId/phase）→ 路由调用序列（/operations 摘，错误行带 `incidentId` 可与响应体回执互查）→ 观察到的现象 → 诊断摘录（hints/console/errorsOnly）→ 元素上下文（`/pick` 应答 + `/refs?ref=@N` 反查）→ errorId 对照 `/diagnostics` 的 `errorCatalog` → 下一步命令。结构化报告是可归档数据，不是散文。

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
| `POST /nano-local-sandbox/recover {}` | 自动 suspend→resume 并回报 | 一键自愈 |
| `POST /history {"delta":2}` | 400 输入类 | 只能 -1/+1 |
| `POST /lifecycle {"action":"start"}` 当 running | 409 | 阶段错，不是引擎故障 |
| `suspend` 中 `/pick` | 502 引擎连接失败 | 引擎已停 |
| 黑洞地址 `/open` | 504 `navigate.egress` | 出站超时；先读 `/status` 的 `navigation.outcome`，仍是 `in-flight` 就不要重发 |
