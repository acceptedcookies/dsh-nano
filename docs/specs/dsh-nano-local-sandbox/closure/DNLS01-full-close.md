# DNLS01 full-close 评价基础

> 日期: `2026-11-14`
> 分支: `main` @ `da873c9`
> 宿主: `https://dsh-dev.local`，profile `~/.dsh-dev/profiles/web`
> 结论: 工程侧评价基础已经齐。请 [业主] 做 human-in-the-loop 评审。在评审通过之前，不把本文件写成已经签字的 `full-close`。

## 1. 硬切是否落地

| 检查 | 结果 |
|---|---|
| 旧前缀 `/nano-kitesurf/status` | 404 空体 |
| [DNK] 是否还注册页面路由 | 否。`registerRoutes(ctx, [])` |
| [DNK] 是否还启动容器 | 否。环回 `ensureLocalContainer` 直接拒绝 |
| 新前缀 30 条路由 | 现场全部有 JSON，没有 404 |
| 容器发布地址 | `8787 → 127.0.0.1:8798`，`8791 → 127.0.0.1:8799`，不是 `0.0.0.0` |

## 2. 非空白页面

`POST /nano-local-sandbox/open {"url":"https://example.com"}` 之后：

| 接口 | 现场 |
|---|---|
| `GET /snapshot` | 200，`url=https://example.com`，`title=Example Domain`，`count=22` |
| `GET /elements?selector=p` | 200，34 个节点，80 个 computed，2 条 matched |
| `POST /pick {"selector":"p"}` | 200，`tag=p` |
| `POST /edit {"selector":"p","text":"Example Domain"}` | 200，`tag=p` |
| `POST /wait {"selector":"p"}` | 200，`tag=p` |
| `GET /network` | 200，2 条 |
| `GET /har` | 200，HAR 1.2，2 条，不是空日志 |
| `GET /console` | 200，2 条 |
| `GET /diagnostics` | 200，带 `httpBase`、`kite`、`console`、`network` |
| `GET /ports` | 200，`httpBase=http://127.0.0.1:8798` |
| `GET /targets` | 200，2 个 target |
| `POST /history {"delta":0}` | 200，`url=https://example.com` |
| `POST /settings` viewport 800×600 | 200 |
| `POST /recover` | 200，回到 `https://example.com` |
| `POST /perf-report` 与 `GET /perf-review/host` | 200，不是 `{"path":...}` 占位 |

`h1` 上的 edit/wait 会失败。这是引擎把页面改写之后没有 `h1`，不是占位响应。

## 3. MCP 与技能

`POST /nano-local-sandbox/mcp` `tools/list` 返回 20 个 `sandbox.*` 名字。`tools/call sandbox.bridge_health` 返回 `{ok:true,pushes:0}`。

技能引用 `skills/kitesurf-cdp/references/mcp-bridge.md` 含 `sandbox.diagnostics`，不含 `kitesurf_` 工具名，也不教旧前缀。

## 4. 本地套件

`node --test dsh-nano-local-sandbox/test/*.mjs` 在写入 `da873c9` 的那棵树上是 63 项通过，exit 0。

## 5. 请业主看的残留

- `POST /shot` 在没有 `pageReady` 时仍是 `kitesurf.shot.empty`。这是现有测试要求的失败关闭，不是占位 JSON。
- 网络环从这次 CDP 连接开始记，不回放连接之前的请求。
- 本意见没有把 `origin/main` 推上去。

请 [业主] 在 `https://dsh-dev.local` 上打开 Kitesurf，对 `https://example.com` 做一次点选和截图判断。同意之后再把 close-type 写成 `full-close`。
