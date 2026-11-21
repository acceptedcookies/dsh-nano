# recovery-playbook — 排障决策树、端口韧性、部署链、上下文 ref

## 决策树

1. 先读状态工具的 `hints`（agent 受管入口）；有已登录页面时 `GET /nano-local-sandbox/diagnostics` 给全量 hints。
2. 状态工具给的 phase 不可用或引擎不应答 → 生命周期动作是**用户在工作台沙箱控件的操作**：报告 phase、指引用户起/停/重启所选对象；动作后读状态工具确认 phase 与 `cdp` 就绪。agent 无生命周期写工具，本包不启动容器。
3. `engineMismatch=true` → 不要 attach；`GET /nano-local-sandbox/ports` 看 `effective.httpBase` 并报给维护者。端点由实例 registry 返回，pane 不改址。
4. 有失败调用 → `GET /diagnostics` 的 hints 与 `errorCatalog` 取 errorId（或 MCP `sandbox.error_catalog`）。
5. 页面 JS 报错 → `GET /console?level=error,exception`；网络失败 `level=network`；导航漂移 `level=navigation`。
6. **导航成功但画面白/交互死**（SSR 到了、应用 JS 没跑）→ 这是应用层问题不是引擎问题：`GET /console?level=exception,error` 取首个报错、`GET /network?failedOnly=true` 找被拦的 JS chunk/子资源（`x-kitesurf-blocked` 头标原因）；`GET /diagnostics` 的 hints 会把「页面加载但应用异常」直接列出。别重启沙箱——引擎是好的。
7. 画面与 API 对不上 → `GET /targets` 确认附着页，重 `POST /shot`。
8. 引擎起不来 → 生命周期归 dsh-nano-local-sandbox（工作台沙箱控件），不在本包。
9. 要复现 → `POST /evaluate` 注入 `console.log`/改 DOM，再 `/shot` 看效果。
10. **打开（agent 走打开工具 `{sandboxId,url}`，人走 `/open`）报 `ERR_CONNECTION_REFUSED`/`ERR_NAME_NOT_RESOLVED` 且目标是 localhost 或内网地址** → 容器内地址空间不是宿主的：读 `GET /status` 的 `networking.hostGateway` 把 `localhost:port` 换成 `<hostGateway>:<port>` 再开；宿主 dev 服务必须绑 `0.0.0.0`/`0.0.0.0:port`（仅 `127.0.0.1` 时容器够不到）。

桥健康：`GET http://<host>:<lifecycle.mcpPort>/health`。

11. **本地 http 站在「HTML 原生渲染」下只有骨架、没有样式** → 这是确定行为：预览是保留真实地址的静态投影，`http:` 子资源被按混合内容拦掉，不是站点坏了，也不是要你给 dev server 加 https。看样式用默认的**引擎渲染**；**不要**改用公网隧道或自签证书——那会绕开部署拓扑，属明令禁止。

## `/selftest`

`GET /nano-local-sandbox/selftest` 返回 `{ok,total,failed,checks[]}`，每行 `{id,ok,detail}`。失败行看 `detail` 定位哪一 plane/探针挂了，再回决策树对应步骤；不要在本包重建容器或改端口。

## 端口韧性

端口由实例 registry 分配，pane 只读 `/nano-local-sandbox/ports` 的 `effective`/`ports`/`container`。显式重启是用户在工作台沙箱控件的动作（宿主按 `requestId` 记 operation 并可查 `GET /operations?operationId=<op>`）；agent 侧只做只读诊断 `GET /ports`，MCP 对应 `sandbox.ports`/`sandbox.recovery_plan`。

**关键**：本包不删、不重建容器。端口占用修复由沙箱宿主完成。

## 上下文引用（composer 里可能出现 ref）

composer 里的 `[kitesurf:N]` chip 是 pane 本地引用，没有宿主解析路由。需要完整上下文时请人重新点选，或从 `/pick` 应答取元素包。

注意区分：`[kitesurf:N]` 是 note/composer 引用，`@N` 是**元素** ref（`/snapshot`/`/refs` 的 a11y walker）——两套不同，别混。

## 部署链（改了代码不生效时按此顺序）

`npm run build`（生成 `lib/route-guard.js`/`lib/perf-host.js`/`lib/client.js`/`skills/*`）→ 按本包 `AGENTS.md` 的 `dsh plugin --profile web add|remove` 安装 → 重启宿主 → **强制刷新页面**重新取鉴权。技能正文由 `lib/skill.js`+`src/skill/` 生成，`npm test` 校验 `skills/<name>/SKILL.md` 与 references 和真源一致，杜绝漂移。
