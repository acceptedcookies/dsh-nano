# recovery-playbook — 排障决策树、端口韧性、部署链、上下文 ref

## 决策树

1. `GET /diagnostics` → 读 `hints`。
2. `engine.ok=false` → `curl http://127.0.0.1:8798/health`、`container list`（本机 Apple container）、`container system start`；容器缺了就 `POST /kite {"action":"resume"}`（先 `suspend` 若 phase=running）。
3. `engineMismatch=true` → `POST /kite {"action":"configure","httpBase":"http://127.0.0.1:8798"}`。
4. 有失败调用 → `GET /operations?errorsOnly=true` 取 errorId → 查 `references/error-catalog.md`。
5. 页面 JS 报错 → `GET /console?level=error,exception`；网络失败 `level=network`；导航漂移 `level=navigation`。
6. 画面与 API 对不上 → `GET /targets` 确认附着页，重 `POST /shot`。
7. 冷启动失败 → 看 `error` 里 stdout 尾部真因（`failed to bootstrap`=apiserver 冷），`container system start` 后重试；`kitesurf.kite.checkout` 说明缺 `KITESURF_CHECKOUT`/`config.checkout`。
8. 要复现 → `POST /evaluate` 注入 `console.log`/改 DOM，再 `/shot` 看效果。

宿主日志：`~/Library/Logs/dsh-dev-web.err.log`（dsh-dev.local）；桥健康 `GET http://127.0.0.1:<mcpPort>/health`。

## `/selftest` 检查 → `fixCall` 对照（每项失败自带修复命令）

`GET /nano-kitesurf/selftest` 返回 `{ok,total,failed,checks[]}`；失败的 `check` 带 `fixCall`（具体路由/命令）。对照：

| check | `fixCall` |
|---|---|
| `plugin` | `npm run build` → 同步 → `pnpm install --force` → 重启宿主 |
| `engine` | `POST /recover {}`；若 `kitesurf.kite.checkout` 先配 `config.checkout` |
| `engine-identity` | `POST /kite {"action":"configure","httpBase":"…:<enginePort>"}` |
| `container` | `container list --all` → `POST /kite {"action":"resume"}` |
| `ports-published` | `GET /ports` 看漂移 → `POST /recover {}` |
| `ports-loopback` | `POST /recover {}` 重新发布到 127.0.0.1（公网暴露=安全风险） |
| `mcp-bridge` | `GET :<mcpPort>/health` 验 → `POST /recover {}` |
| `targets` | `POST /open {"url":…}` 让引擎开页 |
| `dom` | `/diagnostics→hints` → `POST /open` 加载 |
| `routes` | buildId 陈旧 → 重建+重链+重启 |
| `phase` | `/status` 看 `kite.phase`，按阶段 start/suspend/resume |

## 端口韧性（本机最常见坑）

本机 8787 常年被 Cursor 占用，引擎容器实际发布在 8798/8799。插件行为：

1. `config.httpBase` 只是**偏好**，不是硬约束。目标端口被别进程占、而现有 `kitesurf` 容器自己端口仍可用 → **接管**该容器并把 `httpBase` 改写成实际端口（`/status.ports.lastRepair` 记 from/to，reason=`adopted-existing-container`），**不删容器**。
2. 首次创建且偏好端口被占 → 自动向后取下一空闲端口（步进 10），reason=`port-busy-repaired`。
3. 只有「偏好端口被占且现有容器端口也不可用」才抛 `409 kitesurf.kite.portbusy`，此时容器保持原样。
4. 自愈入口：`POST /nano-kitesurf/recover {}`（suspend→resume→健康检查→端口报告）；只读诊断 `GET /nano-kitesurf/ports`；MCP 对应 `kitesurf_ports`/`kitesurf_recovery_plan`。

**关键**：把 `httpBase` 指到被 Cursor 占的 8787 **不会删容器**——会接管现有 8798 容器并 `adopted:true`。端口占用不是引擎故障，绝不能拆掉能用的容器。

## 上下文引用（composer 里可能出现 ref）

默认注入**完整上下文正文**（不裁切）。宿主同时登记 ref id：若有人在 composer 看到 `[kitesurf:N …]` 这种**只有编号**的短 token（手动切换/外部工具），它不含上下文、**必须解析**：`GET /nano-kitesurf/context?id=3` 返回 `{id,at,label,bytes,text,packet}`，`text` 是完整未裁切上下文（selector/text/box/19 项 computed style/attrs/ancestors/componentStack），`packet` 是结构化元素包。`GET /nano-kitesurf/context?limit=20` 列最近引用；ref 环保留 50 条、宿主重启即清空——`404 kitesurf.context.miss` 说明引用过期，请人重新点选。chip 只是引用，**不会自动发送**。

注意区分：`[kitesurf:N]` 是 note/composer 引用（context ref），`@N` 是**元素** ref（`/snapshot`/`/refs` 的 a11y walker）——两套不同，别混。

## GUI 部署链（改了代码不生效时按此顺序）

`npm run build`（生成 `lib/route-table.js`/`lib/route-guard.js`/`lib/perf-host.js`/`lib/client.js`/`skills/*/SKILL.md`+references）→ 同步到 profile 插件目录（`~/.dsh-dev/plugins/dsh-nano-kitesurf`）→ `pnpm install --force` 重链虚拟 store → 重启宿主（`launchctl kickstart -k gui/$(id -u)/ai.deepseek.dsh.dev.web`）→ **强制刷新页面**重新取鉴权。顺序错一步会 `route-not-listed` 让整块插件全部路由 502；用 `/status` 的 `buildId` 对照作者树确认版本。技能正文由 `lib/skill.js`+`src/skill/` 生成，`npm test` 逐字符校验 `skills/<name>/SKILL.md` 与 references 覆盖路由/工具集合，杜绝真源与生成物漂移。
