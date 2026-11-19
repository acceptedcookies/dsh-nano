# recovery-playbook — 排障决策树、端口韧性、部署链、上下文 ref

## 决策树

1. `GET /nano-local-sandbox/diagnostics` → 读 `hints`。
2. `lifecycle.phase` 不是 `running` 或引擎不应答 → `POST /nano-local-sandbox/lifecycle {"action":"restart","requestId":"<fresh uuid>"}`（用户确认后），并轮询 `GET /operations?operationId=<op>` 到终态；stopped/suspended 则 `action:"start"`。引擎由沙箱宿主带起，本包不启动容器。
3. `engineMismatch=true` → 不要 attach；`GET /nano-local-sandbox/ports` 看 `effective.httpBase` 并报给维护者。端点由实例 registry 返回，pane 不改址。
4. 有失败调用 → `GET /diagnostics` 的 hints 与 `errorCatalog` 取 errorId（或 MCP `sandbox.error_catalog`）。
5. 页面 JS 报错 → `GET /console?level=error,exception`；网络失败 `level=network`；导航漂移 `level=navigation`。
6. **导航成功但画面白/交互死**（SSR 到了、应用 JS 没跑）→ 这是应用层问题不是引擎问题：`GET /console?level=exception,error` 取首个报错、`GET /network?failedOnly=true` 找被拦的 JS chunk/子资源（`x-kitesurf-blocked` 头标原因）；`GET /diagnostics` 的 hints 会把「页面加载但应用异常」直接列出。别重启沙箱——引擎是好的。
7. 画面与 API 对不上 → `GET /targets` 确认附着页，重 `POST /shot`。
8. 引擎起不来 → 生命周期归 dsh-nano-local-sandbox，不在本包。
9. 要复现 → `POST /evaluate` 注入 `console.log`/改 DOM，再 `/shot` 看效果。
10. **`/open` 报 `ERR_CONNECTION_REFUSED`/`ERR_NAME_NOT_RESOLVED` 且目标是 localhost 或内网地址** → 容器内地址空间不是宿主的：读 `GET /status` 的 `networking.hostGateway` 把 `localhost:port` 换成 `<hostGateway>:<port>` 再开；宿主 dev 服务必须绑 `0.0.0.0`/`0.0.0.0:port`（仅 `127.0.0.1` 时容器够不到）。

桥健康：`GET http://<host>:<lifecycle.mcpPort>/health`。

## `/selftest`

`GET /nano-local-sandbox/selftest` 返回 `{ok,total,failed,checks[]}`，每行 `{id,ok,detail}`。失败行看 `detail` 定位哪一 plane/探针挂了，再回决策树对应步骤；不要在本包重建容器或改端口。

## 端口韧性

端口由实例 registry 分配，pane 只读 `/nano-local-sandbox/ports` 的 `effective`/`ports`/`container`。显式重启走 `POST /nano-local-sandbox/lifecycle {"action":"restart","requestId":"<uuid>"}` + `GET /operations?operationId=<op>` 轮询；只读诊断 `GET /ports`；MCP 对应 `sandbox.ports`/`sandbox.recovery_plan`。

**关键**：本包不删、不重建容器。端口占用修复由沙箱宿主完成。

## 上下文引用（composer 里可能出现 ref）

composer 里的 `[kitesurf:N]` chip 是 pane 本地引用，没有宿主解析路由。需要完整上下文时请人重新点选，或从 `/pick` 应答取元素包。

注意区分：`[kitesurf:N]` 是 note/composer 引用，`@N` 是**元素** ref（`/snapshot`/`/refs` 的 a11y walker）——两套不同，别混。

## 部署链（改了代码不生效时按此顺序）

`npm run build`（生成 `lib/route-guard.js`/`lib/perf-host.js`/`lib/client.js`/`skills/*`）→ 按本包 `AGENTS.md` 的 `dsh plugin --profile web add|remove` 安装 → 重启宿主 → **强制刷新页面**重新取鉴权。技能正文由 `lib/skill.js`+`src/skill/` 生成，`npm test` 校验 `skills/<name>/SKILL.md` 与 references 和真源一致，杜绝漂移。
