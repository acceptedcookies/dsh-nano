# recovery-playbook — 排障决策树、端口韧性、部署链、上下文 ref

## 决策树

1. `GET /nano-local-sandbox/diagnostics` → 读 `hints`。
2. `lifecycle.phase` 不是 `running` 或引擎不应答 → `POST /nano-local-sandbox/recover {}`；仍不行再 `POST /nano-local-sandbox/lifecycle {"action":"start"}`（休眠中则 `resume`）。引擎由沙箱宿主带起，本包不启动容器。
3. `engineMismatch=true` → 不要 attach；`GET /nano-local-sandbox/ports` 看 `effective.httpBase` 并报给维护者。端点由实例 registry 返回，pane 不改址。
4. 有失败调用 → `GET /operations?errorsOnly=true` 取 errorId → 对照 `GET /diagnostics` 的 `errorCatalog`（或 MCP `sandbox.error_catalog`）。
5. 页面 JS 报错 → `GET /console?level=error,exception`；网络失败 `level=network`；导航漂移 `level=navigation`。
6. 画面与 API 对不上 → `GET /targets` 确认附着页，重 `POST /shot`。
7. 引擎起不来 → 生命周期归 dsh-nano-local-sandbox，不在本包。
8. 要复现 → `POST /evaluate` 注入 `console.log`/改 DOM，再 `/shot` 看效果。

桥健康：`GET http://<host>:<lifecycle.mcpPort>/health`。

## `/selftest`

`GET /nano-local-sandbox/selftest` 返回 `{ok,total,failed,checks[]}`；失败的 `check` 自带 `fixCall`。按 `fixCall` 执行修复，不要在本包重建容器或改端口。

## 端口韧性

端口由实例 registry 分配，pane 只读 `/nano-local-sandbox/ports` 的 `effective`/`ports`/`container`。自愈入口是 `POST /nano-local-sandbox/recover {}`；只读诊断 `GET /ports`；MCP 对应 `sandbox.ports`/`sandbox.recovery_plan`。

**关键**：本包不删、不重建容器。端口占用修复由沙箱宿主完成。

## 上下文引用（composer 里可能出现 ref）

composer 里的 `[kitesurf:N]` chip 是 pane 本地引用，没有宿主解析路由。需要完整上下文时请人重新点选，或从 `/pick` 应答取元素包。

注意区分：`[kitesurf:N]` 是 note/composer 引用，`@N` 是**元素** ref（`/snapshot`/`/refs` 的 a11y walker）——两套不同，别混。

## 部署链（改了代码不生效时按此顺序）

`npm run build`（生成 `lib/route-guard.js`/`lib/perf-host.js`/`lib/client.js`/`skills/*`）→ 按本包 `AGENTS.md` 的 `dsh plugin --profile web add|remove` 安装 → 重启宿主 → **强制刷新页面**重新取鉴权。技能正文由 `lib/skill.js`+`src/skill/` 生成，`npm test` 校验 `skills/<name>/SKILL.md` 与 references 和真源一致，杜绝漂移。
