---
name: kitesurf-cdp
description: Collaborate on a frontend through the Kitesurf CDP endpoint. Use when the user points at a page, or asks to inspect or change what Kitesurf is rendering. Do not launch Chrome.
version: 0.1.0
date: 2026-11-14
user-invocable: true
---

# Kitesurf CDP

The page under discussion is rendered by Kitesurf, not by Chrome.

This is a **directory skill**: the entry only covers probe-first + socket + the
rules that MUST NOT be violated inline. Load topic references on demand from
this skill's directory — `references/<topic>.md`.

## 0. 排障第一步：一次探针，不要猜
`GET /nano-local-sandbox/diagnostics`（page.fetch 带会话；裸 curl 需 dsh-auth cookie，否则 401/302）。一次返回 status/phase/targets/console/操作trace/errorCatalog/perf/hints。`hints` 是权威线索，先读它再决定动作。失败调用看 `GET /operations?errorsOnly=true`。

## 1. Get the socket — never guess it
`GET /nano-local-sandbox/status`：`kite.cdp`=agent-browser `--cdp` 的浏览器 socket（顶层也回显 `cdp`）；`kite.mcpPort`=容器内 MCP 桥端口 `ws://<host>:<mcpPort>/mcp`；`kite.phase`=`idle`/`running`/`suspended`，仅 running 时 attach。宿主重启后自动 re-adopt 引擎，phase 跟现实。`engineMismatch:true`=该 origin 应 `/health` 但不是 Kitesurf——不要 attach，报它。

## 2. Drive it — attach, never launch
```bash
agent-browser --cdp "$(curl -s .../nano-local-sandbox/status | jq -r .kite.cdp)" snapshot -i
```
无 CDP target 的命令会启动 Chrome——错误引擎。首次会话先 `agent-browser skills get core`。不在 PATH 用 `npx agent-browser`（同 `--cdp`），别 `--engine`、别 `install`。MCP-over-WS 每帧一条完整 JSON-RPC、无尾 `\n`；`GET http://127.0.0.1:<mcpPort>/health` 验桥。

## 3. 共享单页引擎 — 动手前先读
- Kitesurf 每 socket 只一页。驱动前 `get url`/`snapshot` 确认在预期页。
- **绝不** `agent-browser close`（或让 daemon idle out 持 socket）：关 socket 把页打回 `about:blank`、抹掉人在看的内容。用完就停，别动 socket。
- 不用 `--pin-tab`/session/多 target 旗标：只有一页。
- `suspend`/`resume`/引擎重启也打回 `about:blank`；resume 后先 `get url`。
- 坐标/box/截图假定 dsf 1；viewport 仿真改过就从 note 的 box 重导。
- `<img>` 是 object-fit:contain：letterbox 带内点击合法地打空，先 `/console?level=navigation` 或重 `/shot` 再怪引擎。

## 4. 元素 ref @N — 人=agent 同一语言
`GET /nano-local-sandbox/snapshot` 的 a11y walker 给可交互元素 `@N` + selector；`GET /refs?ref=@N` 反查。**人点选 `/pick` 的 `element.ref:"@N"`** 与 agent 的 `@N` 指同一节点（页内 querySelector identity probe）。`@N` 可直接作 `wait`/`pick`/`edit` 的 selector；不在表=`404 kitesurf.ref.miss`（先 `/snapshot`）。别字符串比较 pick 的 `html > body > a` 与 walker 的 `a`——用 `element.ref`。

## 5. References（按需加载）
| 文件 | 何时读 |
|---|---|
| `references/routes.md` | 查路由/参数/方法全表（ROUTE_TABLE 对账） |
| `references/observability.md` | 状态模型、幂等/重试、perf span、取值域 |
| `references/mcp-bridge.md` | 15 个 `sandbox.*` MCP 工具、帧、写所有权 |
| `references/element-packets.md` | 点选包、手势、shot/open/history 细节 |
| `references/emulation.md` | `/settings` UA/viewport/media/headers |
| `references/recipes.md` | 正例 + 负例（预测结果，不靠猜） |
| `references/recovery-playbook.md` | 决策树、端口韧性、部署链、composer ref |
| `references/error-catalog.md` | errorId→status→原因→下一步（生成自 ERROR_CATALOG） |
| `templates/probe.sh` | 一键健康探针脚本 |
| `templates/feedback-report.md` | 结构化反馈模板 |

## 6. 排障顺序
`GET /diagnostics`→hints → `/operations?errorsOnly=true`→errorId → 查 `references/error-catalog.md` → 按 `recovery-playbook.md` 决策树。

## 7. Do not
- 引擎 down 不回落本地 Chrome/Playwright/Puppeteer——报 Kitesurf 不答。
- 不从 selector 猜组件文件；问，或搜 workspace 给 match。
- 不部署引擎，容器管那个进程。
- 不关 socket、不重启浏览器、会话中不 detach——人的页在上面。
- 不立即重发超时 `/open`：导航可能仍在引擎内执行。
