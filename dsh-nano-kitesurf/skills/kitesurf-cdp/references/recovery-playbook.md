# recovery-playbook — 排障决策树、端口韧性、部署链、上下文 ref

## 决策树

1. `GET /diagnostics` → 读 `hints`。
2. `engine.ok=false` → `curl http://127.0.0.1:8798/health`；本包不启动容器——引擎由 dsh-nano-local-sandbox 宿主带起（`POST /nano-local-sandbox/recover {}`）。先 `suspend` 若 phase=running，再 `POST /kite {"action":"resume"}` 重探。
3. `engineMismatch=true` → `POST /kite {"action":"configure","httpBase":"http://127.0.0.1:8798"}`。
4. 有失败调用 → `GET /operations?errorsOnly=true` 取 errorId → 查 `references/error-catalog.md`。
5. 页面 JS 报错 → `GET /console?level=error,exception`；网络失败 `level=network`；导航漂移 `level=navigation`。
6. 画面与 API 对不上 → `GET /targets` 确认附着页，重 `POST /shot`。
7. 引擎起不来 → `kitesurf.kite.start`/`resume`（502，引擎 CDP 无应答）= 容器未在跑；引擎生命周期归 dsh-nano-local-sandbox，不在本包。
8. 要复现 → `POST /evaluate` 注入 `console.log`/改 DOM，再 `/shot` 看效果。

宿主日志：`~/Library/Logs/dsh-dev-web.err.log`（dsh-dev.local）；桥健康 `GET http://127.0.0.1:<mcpPort>/health`。

## `/selftest` 检查 → `fixCall` 对照（每项失败自带修复命令）

`GET /nano-local-sandbox/selftest` 返回 `{ok,total,failed,checks[]}`；失败的 `check` 带 `fixCall`（具体路由/命令）。对照：

| check | `fixCall` |
|---|---|
| `plugin` | `npm run build` → 同步 → `pnpm install --force` → 重启宿主 |
| `engine` | `POST /recover {}`（引擎由沙箱宿主带起） |
| `engine-identity` | `POST /kite {"action":"configure","httpBase":"…:<enginePort>"}` |
| `container` | `GET /nano-local-sandbox/instances` → `POST /nano-local-sandbox/recover {}` |
| `ports-published` | `GET /ports` 看漂移 → `POST /recover {}` |
| `ports-loopback` | `POST /recover {}` 重新发布到 127.0.0.1（公网暴露=安全风险） |
| `mcp-bridge` | `GET :<mcpPort>/health` 验 → `POST /recover {}` |
| `targets` | `POST /open {"url":…}` 让引擎开页 |
| `dom` | `/diagnostics→hints` → `POST /open` 加载 |
| `routes` | buildId 陈旧 → 重建+重链+重启 |
| `phase` | `/status` 看 `kite.phase`，按阶段 start/suspend/resume |

## 端口韧性（本机最常见坑）

本机 8787 常年被 Cursor 占用，引擎容器实际发布在 8798/8799。端口分配/容器接管归 dsh-nano-local-sandbox 宿主，本包只读端口真相：

1. `config.httpBase` 只是**偏好**。`GET /nano-local-sandbox/ports` 看 configured/effective/published 漂移；端口被别进程占 → `heldBy: 'other'`。
2. 自愈入口：`POST /nano-local-sandbox/recover {}`（suspend→resume→健康检查→端口报告）；只读诊断 `GET /nano-local-sandbox/ports`；MCP 对应 `sandbox.ports`/`sandbox.recovery_plan`。

**关键**：本包不删、不重建容器。端口占用修复由沙箱宿主完成；`409 kitesurf.kite.portbusy` 只在「引擎要绑的端口被占」由宿主报告回传时出现，本包自身不做重建决策。

## 上下文引用（composer 里可能出现 ref）

默认注入**完整上下文正文**（不裁切）。宿主同时登记 ref id：若有人在 composer 看到 `[kitesurf:N …]` 这种**只有编号**的短 token（手动切换/外部工具），它不含上下文、**必须解析**：`GET /nano-local-sandbox/context?id=3` 返回 `{id,at,label,bytes,text,packet}`，`text` 是完整未裁切上下文（selector/text/box/19 项 computed style/attrs/ancestors/componentStack），`packet` 是结构化元素包。`GET /nano-local-sandbox/context?limit=20` 列最近引用；ref 环保留 50 条、宿主重启即清空——`404 kitesurf.context.miss` 说明引用过期，请人重新点选。chip 只是引用，**不会自动发送**。

注意区分：`[kitesurf:N]` 是 note/composer 引用（context ref），`@N` 是**元素** ref（`/snapshot`/`/refs` 的 a11y walker）——两套不同，别混。

## GUI 部署链（改了代码不生效时按此顺序）

`npm run build`（生成 `lib/route-table.js`/`lib/route-guard.js`/`lib/perf-host.js`/`lib/client.js`/`skills/*/SKILL.md`+references）→ 同步到 profile 插件目录（`~/.dsh-dev/plugins/dsh-nano-kitesurf`）→ `pnpm install --force` 重链虚拟 store → 重启宿主（`launchctl kickstart -k gui/$(id -u)/ai.deepseek.dsh.dev.web`）→ **强制刷新页面**重新取鉴权。顺序错一步会 `route-not-listed` 让整块插件全部路由 502；用 `/status` 的 `buildId` 对照作者树确认版本。技能正文由 `lib/skill.js`+`src/skill/` 生成，`npm test` 逐字符校验 `skills/<name>/SKILL.md` 与 references 覆盖路由/工具集合，杜绝真源与生成物漂移。
