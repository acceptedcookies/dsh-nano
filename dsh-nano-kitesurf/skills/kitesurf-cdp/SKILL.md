---
name: kitesurf-cdp
description: Collaborate on a frontend through the Kitesurf CDP endpoint. Use when the user points at a page, or asks to inspect or change what Kitesurf is rendering — including debugging a site the sandbox container must reach (local dev servers included, addressed via the container host gateway). Do not launch Chrome.
version: 0.1.0
date: 2026-11-20
user-invocable: true
---

# Kitesurf CDP

The page under discussion is rendered by Kitesurf inside the sandbox host's env container, not by Chrome.

This is a **directory skill**: the entry only covers probe-first + socket + the
rules that MUST NOT be violated inline. Load topic references on demand from
this skill's directory — `references/<topic>.md`.

## 0. 排障第一步：一次探针，不要猜
`GET /nano-local-sandbox/diagnostics`（page.fetch 带会话；裸 curl 需 dsh-auth cookie，否则 401/302）。一次返回 status/lifecycle/targets/console/操作trace/errorCatalog/perf/hints。`hints` 是权威线索，先读它再决定动作。失败调用看 `GET /operations?errorsOnly=true`。

## 1. Get the socket — never guess it
`GET /nano-local-sandbox/status`：`lifecycle.phase`=`idle`/`running`/`suspended`，仅 running 时 attach；`lifecycle.httpBase` 是引擎 origin；`lifecycle.mcpPort` 是容器内 MCP 桥端口；顶层 `cdp` 是 agent-browser `--cdp` 的 relay socket（`/diagnostics` 的 `lifecycle.cdp` 同值）。宿主重启后自动 re-adopt 引擎。`engineMismatch:true`=该 origin 应 `/health` 但不是 Kitesurf——不要 attach，报它。

**同一页**：桥中继 `ws://<host>:<lifecycle.mcpPort>/cdp` 把宿主 pane 的 CDP 与你 attach 的 socket 复用到**同一条上游引擎连接**——engine 每连接只造一页，走 relay 你看到的页面与人看到的**是同一页**。绕开 relay 直连 `/devtools/browser` 会落进自己的私有页。

## 2. Drive it — attach, never launch
```bash
agent-browser --cdp "$(curl -s .../nano-local-sandbox/status | jq -r .cdp)" snapshot -i
```
无 CDP target 的命令会启动 Chrome——错误引擎。首次会话先 `agent-browser skills get core`。不在 PATH 用 `npx agent-browser`（同 `--cdp`），别 `--engine`、别 `install`。MCP-over-WS 每帧一条完整 JSON-RPC、无尾 `\n`；`GET http://<host>:<lifecycle.mcpPort>/health` 验桥。

## 3. 共享单页引擎 — 动手前先读
- 实例按 session 记录：`sandbox.instance.ensure` 返回 per-session `instanceId` 与 `policyFingerprint`；物理容器是 env 容器，页面、CDP socket 与 history 在同一 env 容器内共享。实例记录隔离不等于页面隔离。
- Kitesurf 每个 env 容器一页。驱动前 `get url`/`snapshot` 确认在预期页。
- **绝不** `agent-browser close`（或让 daemon idle out 持 socket）：关 socket 把页打回 `about:blank`、抹掉人在看的内容。用完就停，别动 socket。
- 不用 `--pin-tab`/session/多 target 旗标：只有一页。
- `suspend`/`resume`/引擎重启也打回 `about:blank`；resume 后先 `get url`。
- 坐标/box/截图假定 deviceScaleFactor 1，viewport 只支持 `deviceScaleFactor:1` 与 `mobile:false`；其他值被拒（400）。viewport 仿真改过就从 note 的 box 重导。
- `<img>` 是 object-fit:contain：letterbox 带内点击合法地打空，先 `/console?level=navigation` 或重 `/shot` 再怪引擎。
- **one MCP writer**：`sandbox.control` 的 `writer`/`humanHold` 锁只约束 MCP/桥写者；pane（人）的 REST 写不受写锁约束。`humanHold.active:true` 时 agent 写被拒 `kitesurf.control.held`——看到 held **立刻停写**，别 retry 别 `claim`；把控制权交还人，等 `humanHold.active:false` 再写。
- **容器地址空间 ≠ 宿主地址空间**：`/open` 的 URL 在**容器内**解析。容器里的 `localhost`/`127.*`/`::1` 指**容器自己**，不是跑本插件的宿主。要调试跑在宿主机上的 dev 服务（`next dev`/`vite`/`npm run dev` 之类监听某端口的 localhost 站点），导航地址要用**容器宿主网关**：`GET /status` → `networking.hostGateway`（backend 按自身拓扑发现的运行时值——**绝不字面量化**，不同后端/机器值不同）。典型流程：`/open http://<hostGateway>:<devPort>/<path>`。**该字段缺失时（宿主旧版）不要停在这里**：`container inspect <容器名>` 的 `status.networks[].ipv4Gateway` 是同一个值，容器名取 `/status` 的 `subject.containerName`；两条都拿不到就让人在 pane 地址栏直接打开——那是人的动作，agent 不要猜一个 IP 去试。宿主服务必须绑到容器可路由的地址（dev server 默认 `*:port` 即可；仅绑 `127.0.0.1` 时容器仍够不到，须让 dev server 绑 `0.0.0.0` 或走端口转发）。本地 dev 站的 http/HMR/secure-context 细节见 `references/recipes.md` 的「本地 dev 调试」节。

## 4. 元素 ref @N — 人=agent 同一语言
`GET /nano-local-sandbox/snapshot` 的 a11y walker 给可交互元素 `@N` + selector；`GET /refs?ref=@N` 反查。**人点选 `/pick` 的 `element.ref:"@N"`** 与 agent 的 `@N` 指同一节点。`@N` 可直接作 `wait`/`pick`/`edit` 的 selector；不在表=404 `kitesurf.ref.miss`（先 `/snapshot`）。别字符串比较 pick 的 `html > body > a` 与 walker 的 `a`——用 `element.ref`。

## 5. References（按需加载）
| 文件 | 何时读 |
|---|---|
| `references/routes.md` | 查路由/参数/方法全表 |
| `references/observability.md` | 状态模型、幂等/重试、perf span、取值域 |
| `references/mcp-bridge.md` | `sandbox.*` MCP 工具、帧、写所有权 |
| `references/element-packets.md` | 点选包、手势、shot/open/history 细节 |
| `references/emulation.md` | `/settings` UA/viewport/media/headers |
| `references/recipes.md` | 正例 + 负例（预测结果，不靠猜） |
| `references/recovery-playbook.md` | 决策树、端口韧性、部署链、composer ref |
| `templates/probe.sh` | 一键健康探针脚本 |
| `templates/feedback-report.md` | 结构化反馈模板 |

## 6. 排障顺序
`GET /diagnostics`→hints → `/operations?errorsOnly=true`→errorId → `/diagnostics` 的 `errorCatalog`（或 MCP `sandbox.error_catalog`）→ 按 `recovery-playbook.md` 决策树。

## 7. Do not
- 引擎 down 不回落本地 Chrome/Playwright/Puppeteer——报 Kitesurf 不答。
- 不从 selector 猜组件文件；问，或搜 workspace 给 match。
- 不部署引擎，容器管那个进程。
- 不关 socket、不重启浏览器、会话中不 detach——人的页在上面。
- **超时不是取消**：`timeoutMs` 只决定应答何时返回，引擎侧操作继续。`/open` 超时后先读 `/status` 的 `navigation.outcome`；仍是 `in-flight` 就等，不要重发。
- 仅 transport 错误重连一次；超时与确定性错误绝不重跑。
- `kitesurf.control.held` 时不调 `claim`/`takeover`/retry——那是人工动作；等 release。
- HAR 是子集（`_format:'har-lite'`，headers 恒空），不要当标准 HAR 解析。
