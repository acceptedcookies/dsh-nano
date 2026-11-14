/**
 * Session skills. The agent drives Kitesurf through agent-browser's CDP mode.
 * Loading this skill must not launch Chrome.
 *
 * P0-6: lib/skill.js is a skill-PACKAGE generator, not a single-file body.
 * The kitesurf-cdp entry below is a ≤90-line index that teaches the agent to
 * pull topic references on demand (resourceBase: directory). The reference
 * bodies live under src/skill/kitesurf-cdp/references|templates and are copied
 * into skills/kitesurf-cdp/ at build time — one authored tree, two consumers
 * (runtime registration + filesystem discovery). ERROR_CATALOG stays the
 * generated single truth; it lands in references/error-catalog.md at build.
 */

// The ≤90-line progressive-disclosure entry. Detail lives in references/.
const KITESURF_CDP = `# Kitesurf CDP

The page under discussion is rendered by Kitesurf, not by Chrome.

This is a **directory skill**: the entry only covers probe-first + socket + the
rules that MUST NOT be violated inline. Load topic references on demand from
this skill's directory — \`references/<topic>.md\`.

## 0. 排障第一步：一次探针，不要猜
\`GET /nano-kitesurf/diagnostics\`（page.fetch 带会话；裸 curl 需 dsh-auth cookie，否则 401/302）。一次返回 status/phase/targets/console/操作trace/errorCatalog/perf/hints。\`hints\` 是权威线索，先读它再决定动作。失败调用看 \`GET /operations?errorsOnly=true\`。

## 1. Get the socket — never guess it
\`GET /nano-kitesurf/status\`：\`kite.cdp\`=agent-browser \`--cdp\` 的浏览器 socket（顶层也回显 \`cdp\`）；\`kite.mcpPort\`=容器内 MCP 桥端口 \`ws://<host>:<mcpPort>/mcp\`；\`kite.phase\`=\`idle\`/\`running\`/\`suspended\`，仅 running 时 attach。宿主重启后自动 re-adopt 引擎，phase 跟现实。\`engineMismatch:true\`=该 origin 应 \`/health\` 但不是 Kitesurf——不要 attach，报它。

## 2. Drive it — attach, never launch
\`\`\`bash
agent-browser --cdp "$(curl -s .../nano-kitesurf/status | jq -r .kite.cdp)" snapshot -i
\`\`\`
无 CDP target 的命令会启动 Chrome——错误引擎。首次会话先 \`agent-browser skills get core\`。不在 PATH 用 \`npx agent-browser\`（同 \`--cdp\`），别 \`--engine\`、别 \`install\`。MCP-over-WS 每帧一条完整 JSON-RPC、无尾 \`\\n\`；\`GET http://127.0.0.1:<mcpPort>/health\` 验桥。

## 3. 共享单页引擎 — 动手前先读
- Kitesurf 每 socket 只一页。驱动前 \`get url\`/\`snapshot\` 确认在预期页。
- **绝不** \`agent-browser close\`（或让 daemon idle out 持 socket）：关 socket 把页打回 \`about:blank\`、抹掉人在看的内容。用完就停，别动 socket。
- 不用 \`--pin-tab\`/session/多 target 旗标：只有一页。
- \`suspend\`/\`resume\`/引擎重启也打回 \`about:blank\`；resume 后先 \`get url\`。
- 坐标/box/截图假定 dsf 1；viewport 仿真改过就从 note 的 box 重导。
- \`<img>\` 是 object-fit:contain：letterbox 带内点击合法地打空，先 \`/console?level=navigation\` 或重 \`/shot\` 再怪引擎。

## 4. 元素 ref @N — 人=agent 同一语言
\`GET /nano-kitesurf/snapshot\` 的 a11y walker 给可交互元素 \`@N\` + selector；\`GET /refs?ref=@N\` 反查。**人点选 \`/pick\` 的 \`element.ref:"@N"\`** 与 agent 的 \`@N\` 指同一节点（页内 querySelector identity probe）。\`@N\` 可直接作 \`wait\`/\`pick\`/\`edit\` 的 selector；不在表=\`404 kitesurf.ref.miss\`（先 \`/snapshot\`）。别字符串比较 pick 的 \`html > body > a\` 与 walker 的 \`a\`——用 \`element.ref\`。

## 5. References（按需加载）
| 文件 | 何时读 |
|---|---|
| \`references/routes.md\` | 查路由/参数/方法全表（ROUTE_TABLE 对账） |
| \`references/observability.md\` | 状态模型、幂等/重试、perf span、取值域 |
| \`references/mcp-bridge.md\` | 15 个 \`kitesurf_*\` MCP 工具、帧、写所有权 |
| \`references/element-packets.md\` | 点选包、手势、shot/open/history 细节 |
| \`references/emulation.md\` | \`/settings\` UA/viewport/media/headers |
| \`references/recipes.md\` | 正例 + 负例（预测结果，不靠猜） |
| \`references/recovery-playbook.md\` | 决策树、端口韧性、部署链、composer ref |
| \`references/error-catalog.md\` | errorId→status→原因→下一步（生成自 ERROR_CATALOG） |
| \`templates/probe.sh\` | 一键健康探针脚本 |
| \`templates/feedback-report.md\` | 结构化反馈模板 |

## 6. 排障顺序
\`GET /diagnostics\`→hints → \`/operations?errorsOnly=true\`→errorId → 查 \`references/error-catalog.md\` → 按 \`recovery-playbook.md\` 决策树。

## 7. Do not
- 引擎 down 不回落本地 Chrome/Playwright/Puppeteer——报 Kitesurf 不答。
- 不从 selector 猜组件文件；问，或搜 workspace 给 match。
- 不部署引擎，容器管那个进程。
- 不关 socket、不重启浏览器、会话中不 detach——人的页在上面。
- 不立即重发超时 \`/open\`：导航可能仍在引擎内执行。`

const NANO_KITE = `# nano-kite

Session skill. \`POST /nano-kitesurf/kite\` with \`{ "action" }\`. Live values are \`GET /nano-kitesurf/status\` under \`kite\`. Drive pages with \`/kitesurf-cdp\` and \`kite.cdp\`. Do not launch Chrome.

- \`init\` checks Node ≥22 first (agent-browser needs it), then writes \`$DSH_HOME/nano-kitesurf.lock.json\` once; a later init returns \`already: true\` without rewriting. Init does not start a container. The lock is not inside the plugin directory, because a host restart replaces that directory.
- \`start\` — only from \`idle\`. Starts the local \`kitesurf\` container from inside DSH when the origin is loopback (publishes \`127.0.0.1:<enginePort>:8787\` and \`127.0.0.1:<mcpPort>:8791\`, mounts the checkout read-only), then waits for \`/health\`. Cold create first runs \`container system start\` to prime the debug-build apiserver (its inline bootstrap reports \`failed to bootstrap\`); a warm container is simply \`container start\`ed. A remote origin is only probed. Failure is \`kitesurf.kite.start\` / \`kitesurf.kite.container\` with the stdout tail in \`error\`.
- \`suspend\` — only from running. Closes the CDP socket and stops the local container. THIS DROPS THE PAGE TO about:blank — anything the user was viewing is gone. Warn before suspending.
- \`resume\` — only from suspended. Starts the same container again (or recreates it if missing); the page does not come back with it. A failure is \`kitesurf.kite.resume\`.
- \`configure\` — \`{ "httpBase": "http://host:port", "mcpPort": 8799 }\`. A remote engine is refused with \`kitesurf.kite.remote\` unless the profile sets \`allowRemote: true\`. Credentials in the URL are \`kitesurf.url.credentials\`. \`mcpPort\` only takes effect the next time a container is created — an existing container keeps its published ports (a changed mapping is detected on start and the container is recreated). The MCP bridge serves \`GET /health\` over plain HTTP too: \`{ ok, mcp, conns, accepted, rejected, uptimeMs }\` — use it to confirm the bridge is up before pointing agents at \`ws://127.0.0.1:<mcpPort>/mcp\`. When piping JSON-RPC over the WebSocket, each text frame carries one complete message — no trailing \`\\n\` is needed (the bridge tolerates \`\\n\` for batch frames).

Local container runs need a Kitesurf checkout: set \`KITESURF_CHECKOUT\` or profile \`config.checkout\` to a built source tree; missing/unreadable is \`kitesurf.kite.checkout\` (400, configuration — not an engine fault). Starting a cold container can take ~100s. If you hit it: \`GET /diagnostics\` → \`hints\` → add \`- id: nano-kitesurf / config.checkout\` to the profile's \`cordis.patch.yml\`, or export \`KITESURF_CHECKOUT\`, then restart the dsh host.

Wrong phase is \`kitesurf.kite.state\` (409). An old Node is \`kitesurf.kite.node\` (500) and does not write the lock. A bad port is \`kitesurf.kite.mcpPort\` (400). Bad JSON is \`kitesurf.body.json\` (400). Full table: see \`/kitesurf-cdp\` references/error-catalog.md or \`/diagnostics\` → \`observability.errorCatalog\`.`

export function nanoKiteSkill() {
  return {
    name: 'nano-kite',
    description: 'Initialize, start, suspend, or resume Kitesurf, and point MCP at a local or remote engine. Use when the user types /nano-kite.',
    content: NANO_KITE,
  }
}

export function kitesurfSkill() {
  return {
    name: 'kitesurf-cdp',
    description: 'Collaborate on a frontend through the Kitesurf CDP endpoint. Use when the user points at a page, or asks to inspect or change what Kitesurf is rendering. Do not launch Chrome.',
    content: KITESURF_CDP,
    // Progressive disclosure: the entry is a ≤90-line index; the topic bodies
    // live in the skill directory under references/ and templates/.
    resourceBase: { kind: 'directory' },
  }
}

// Body texts, exported so the build can write skills/<name>/SKILL.md from them.
// kitesurf-cdp's references/ + templates/ are copied from src/skill/ at build —
// this map only carries the two ENTRY bodies.
export const SKILL_BODIES = { 'kitesurf-cdp': KITESURF_CDP, 'nano-kite': NANO_KITE }
