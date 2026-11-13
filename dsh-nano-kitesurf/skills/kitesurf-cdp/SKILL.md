---
name: kitesurf-cdp
description: Collaborate on a frontend through the Kitesurf CDP endpoint. Use when the user points at a page, or asks to inspect or change what Kitesurf is rendering. Do not launch Chrome.
user-invocable: true
---

# Kitesurf CDP

The page under discussion is rendered by Kitesurf, not by Chrome.

## 0. 排障第一步：一次探针，不要猜

任何异常先跑一次：

```bash
# 已登录的 Harness 页面内（page.fetch 或带 dsh-auth cookie）：
curl -s -b "$DSH_COOKIE_JAR" https://dsh-dev.local/nano-kitesurf/diagnostics | jq .
```

`...` 只是占位符：`page.fetch("/nano-kitesurf/diagnostics")` 会带上页面会话；裸 curl 必须携带 `dsh-auth-*` cookie，否则 401/302。上面几节的 `curl` 同理，不要照抄省略号。

`diagnostics` 一次性返回：插件版本/阶段、引擎 status 与 target 列表、UA/viewport、**最近操作 trace**（每次调用的 route/status/errorId/耗时）、**页面 console/exception/network 事件**、错误目录、perf 快照，以及按当前状态自动生成的 `hints`（下一步该做什么）。`hints` 是权威线索，先读它再决定动作。

配套探针：

| 路由 | 作用 |
|---|---|
| `GET /nano-kitesurf/diagnostics?limit=20` | 一击全量诊断（上面那条） |
| `GET /nano-kitesurf/operations?errorsOnly=true` | 只看失败的调用（含 errorId + 耗时 + 输入摘要） |
| `POST /nano-kitesurf/operations {"clear":true}` | 清空操作 trace |
| `GET /nano-kitesurf/console?level=error,exception` | 页面 console.error / 未捕获异常 / 网络失败 |
| `GET /nano-kitesurf/console?level=navigation` | 页面导航轨迹（漂移排查） |
| `POST /nano-kitesurf/console {"clear":true}` | 清空 console 环形缓冲 |
| `GET /nano-kitesurf/targets` | 引擎 Target.getTargets：page target id/url、当前附着页 |
| `POST /nano-kitesurf/evaluate {"expression":"document.title"}` | 在引擎页面执行有界 JS（≤2000 字符，结果 ≤4000 字符） |
| `GET /nano-kitesurf/perf-review/host` | 进程 perf span（DSH_PERF_REVIEW=1 时） |

console 采集走插件自己那条 CDP socket 的 `Runtime.consoleAPICalled` / `Runtime.exceptionThrown` / `Log.entryAdded` / `Network.loadingFailed` / `Page.frameNavigated`，**不需要**再注入 `window.__ksLogs` 之类的补丁。`/evaluate` 里 `console.log("probe")` 会立刻出现在 `GET /console`。

## 1. Get the socket — never guess it

The live endpoints are always in `GET /nano-kitesurf/status`:

- `kite.cdp` — the browser CDP socket for agent-browser's `--cdp` flag (also echoed top-level as `cdp`).
- `kite.mcpPort` — the host port of the MCP bridge inside the engine container: `ws://<engine-host>:<mcpPort>/mcp`. It is a WebSocket→`agent-browser mcp` bridge, not an HTTP API. It moves only when a new container is created, not on `configure` alone.
- `kite.phase` — `idle` / `running` / `suspended`. Attach only when `running`. After a host restart the plugin re-adopts a live engine automatically, so `phase` follows reality.
- `engineMismatch: true` means the origin answered `/health` but not as Kitesurf — do not attach, report it.

## 2. Drive it

Use agent-browser, and always attach. A command without the CDP target launches Chrome, which is the wrong engine.

```bash
agent-browser --cdp "$(curl -s .../nano-kitesurf/status | jq -r .kite.cdp)" snapshot -i
```

Before the first agent-browser command in a session, run `agent-browser skills get core` and follow it. That skill is the command reference (`open`, `get url`, `wait`, `click`, `fill`, `find`, `scroll`, `screenshot`). This skill only fixes the engine.

If `agent-browser` is not on PATH, run it with `npx agent-browser` and the same `--cdp` flag. Do not pass `--engine`, and do not run `agent-browser install`.

MCP bridge frames MUST end with `\n` — a raw JSON frame without a trailing newline is silently dropped. `GET http://127.0.0.1:<mcpPort>/health` (plain HTTP, Origin allowlisted) reports `{ ok, mcp, conns, accepted, rejected, uptimeMs }`; use it before pointing agents at `ws://.../mcp`.

## 3. This is a shared single-page engine — read before you touch

- Kitesurf keeps exactly one page per socket. Before driving, run `get url` / `snapshot` and confirm you are on the page you expect.
- NEVER run `agent-browser close` (or let the agent-browser daemon idle out holding the socket): closing the browser socket drops the page to `about:blank` and wipes what the user was viewing. When you finish, just stop; leave the socket alone.
- Do not use `--pin-tab`, sessions, or multi-target flags: there is one page and nothing to pin.
- `suspend`/`resume` and any engine restart also drop the page to `about:blank`. After `nano-kite resume`, re-check `get url` before assuming the old page survived.
- Coordinates in picks, boxes, and screenshots assume deviceScaleFactor 1. If a viewport emulation changed it, re-derive coordinates from the box in the note, not from memory.
- The screenshot `<img>` uses `object-fit: contain`: the drawn content is the element rect × `min(elW/natW, elH/natH)`, centered. Clicks in the letterbox bands legitimately miss — use `GET /console?level=navigation` or re-`/shot` before blaming the engine.

## 4. What a human pick contains

Into composer appends a short `[kitesurf]` note to the existing draft. It does not replace text the person already typed, and it does not attach the screenshot. The note has the page URL, one selector, at most 80 characters of the element's own text, a rounded box, and only the computed styles that carry a difference. The whole note is at most 640 characters. `hit: page root` means the click landed on `html` or `body`, and the note does not quote the document. `limit: iframe script is not inspected` means the child document was not read. A drag says `mark: area` and a box; an Alt-drag says `mark: ellipse`; a Shift-drag says `mark: arrow` plus `line: x1,y1 x2,y2`. A Shift+click while a note is open appends a second element — the note then reads `els: N` with numbered `el1/el2/…`, `box1/box2/…` lines, up to a 1280-char budget. Several notes in one draft are folded into one `[kitesurf batch N]` note of at most 1600 characters, pinned at most 8. `stack: none` means no framework component resolved; when the page ships React fibers the line reads `stack: Child → Parent → …` (component display names, last = nearest ancestor). Agents pull the human's last pick without a CDP attach: `GET /nano-kitesurf/last` returns the open note's full element packet (elements, boxes, styles, parentSel/childSel) — the note-pull API, same shape a click produces. Notes already sent stay listed when the page changes. Numbered pin dots sit on the frame — clicking a dot drops just that note, ⌘Z pops the last, the pins strip clears all. Do not expand the note into HTML, a screenshot, or a guessed component.

Gestures on the pane (Cursor design-mode parity): click picks, Shift+click appends elements to the open note, Alt+click with no note open sends the element straight to the composer, plain drag marks a box, Alt+drag an ellipse, Shift+drag an arrow. While a note is open, Arrow Up selects the element's parent, Arrow Down its largest visible child — the packet's `parentSel`/`childSel` fields carry those selectors. Double-click turns the note input into in-place text edit (Enter writes back to the page, Esc cancels). Esc cancels drag → note → annotate in that order; ⌘/Ctrl+Shift+D toggles annotate; ⌘/Ctrl+Z removes the last pin; ⌘/Ctrl+L with a note open pushes it into the composer. While annotate is on, a dashed box previews the element under the cursor (a `preview: true` pick that never moves `lastPick`).

An authenticated Harness page can read the last raw packet with `GET /nano-kitesurf/last`. Every shot and pick returns the live page identity (`url`, `scrollY`, `targetId`, `viewport`); the pane compares them and auto-refresh + warns (`页面已变化…`) when a click lands on stale pixels — picking over a shifted page never silently hits the wrong element. A click sends `POST /nano-kitesurf/pick` with `{x, y}` in viewport pixels — plus `preview: true` for hover probes that skip `lastPick`, or `{selector: "…"}` to re-pick a parent/child the pane already named (Arrow Up/Down). Double-click with a note open switches the input into in-place text edit — it POSTs `/nano-kitesurf/edit` with `{selector, text}` and the page itself changes; the shot refreshes.

`POST /nano-kitesurf/open` navigates; `POST /nano-kitesurf/shot` screenshots the current page (optional `{"scroll": ±px}` moves first, max 4000). `POST /nano-kitesurf/history {"delta":-1}` / `{"delta":1}` is real browser back/forward (engine navigationHistory), not scroll. `GET /nano-kitesurf/status` reports whether `/health` answered.

### Browser disguise / emulation (`/settings`)

All fields optional, `null` clears that override. Values are in memory only and apply before the next navigation; `GET /status` → `emulation` echoes the whole set.

```bash
POST /nano-kitesurf/settings {
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",   # ≤400 字符，单行；"" 清除
  "viewport": { "width": 1024, "height": 768, "mobile": false, "deviceScaleFactor": 2 },
  "media": "print",                        # "screen" | "print" | null
  "extraHeaders": { "X-Debug": "1" }      # ≤20 项，键 1..64 字符，值 ≤200；禁用 cookie/authorization/host 等
}
POST /nano-kitesurf/settings { "viewport": null, "media": null, "extraHeaders": null }
```

`viewport.width` 可任意 320..3840 整数（不再只有 390/768/1280 三档）；只给 `width` 时按预设补高度与 mobile 默认值。`height` 240..2160；`deviceScaleFactor` 只允许 1/2/3。改视口会改变画面身份，pane 的漂移检测含 `viewport` 维度。`POST /evaluate {"expression":"matchMedia('print').matches"}` 可验证 media 是否生效。

## 5. Error catalogue — one table, real statuses

A failed call returns `{ok:false,errorId,error}` with a real HTTP status. The same pair is the toast; `/status` repeats it as `lastError`; `/operations` keeps the full history; `/diagnostics` ships the whole table below as `observability.errorCatalog`. **Do not paraphrase the id.** Unlisted ids are 502 (upstream/engine).

| errorId | HTTP | 原因 | 下一步 |
|---|---|---|---|
| `kitesurf.body.toolarge` | 413 | 请求体超过该路由上限（shot/pick/settings/history 4096B，edit 8192B） | 拆小请求；/edit text ≤4000 字符；不要整页 HTML 塞进 body |
| `kitesurf.body.json` | 400 | body 不是 JSON 对象、JSON 截断或为空 | 确认 content-type: application/json 与合法 JSON 对象；空 body 视为 {} |
| `kitesurf.url.scheme` | 400 | 地址为空/超长/非 http(s)/带用户名密码 | 用完整 https:// 地址；去掉 user:pass@；长度 ≤2000 |
| `kitesurf.pick.point` | 400 | 坐标非有限数/越界，或选择器语法错 | 坐标取画面内容区域（注意 letterbox 黑边）；selector 用合法 CSS |
| `kitesurf.pick.badpoint` | 400 | selector 缺失或含控制字符 | 传 {selector:"h1"} 或先 /pick {x,y} |
| `kitesurf.pick.miss` | 404 | 坐标下没有元素，或选择器未命中（输入侧未命中，不是引擎故障） | 重新 /shot 拿最新画面；换 selector；确认页面已 /open |
| `kitesurf.pick.failed` | 502 | 引擎侧元素探针异常 | GET /status 看 engineMismatch；POST /kite {action:"resume"} |
| `kitesurf.edit.badtext` | 400 | text 为空/超 4000，或 selector 缺失非法 | /edit 必须同时给 selector 与 1..4000 字符 text |
| `kitesurf.edit.miss` | 404 | 改字目标选择器未命中 | 重新 /pick 取 selector；页面若已导航需重选 |
| `kitesurf.shot.scroll` | 400 | scroll 非有限数或 |scroll|>4000 | POST /shot {scroll: ±整数} |
| `kitesurf.settings.viewport` | 400 | userAgent/viewport/media/extraHeaders 形状非法或值越界（视口 320..3840 × 240..2160；dsf 1/2/3；media screen|print；header 名禁用凭证类） | POST /settings {"viewport":{"width":1024,"height":768},"media":"print","extraHeaders":{"X-Debug":"1"}}；任一字段传 null 清除；空串 UA 清除伪装 |
| `kitesurf.kite.state` | 409 | 生命周期阶段不符（idle 才能 start、running 才能 suspend、suspended 才能 resume） | GET /status 读 kite.phase；按阶段选 start/suspend/resume；host 重启后 phase 会自动 adopt |
| `kitesurf.kite.remote` | 400 | configure 参数非法、远程地址未开 allowRemote、或缺少 KITESURF_CHECKOUT/config.checkout | loopback 地址；mcpPort 1..65535；在 profile patch 写 config.checkout |
| `kitesurf.kite.node` | 500 | Node 版本过低或锁文件不可写 | 需要 Node ≥22；检查 DSH_HOME 可写 |
| `kitesurf.kite.container` | 502 | container CLI 冷启动/镜像/挂载失败（错误正文含 stdout 尾部真因） | 看 error 里的 failed to bootstrap 类信息；container system start；GET /diagnostics 看最近操作 |
| `kitesurf.navigate.egress` | 504 | 目标站点出站超过 25s（引擎写入 egress timeout） | 换可达站点；不要重试同一地址；GET /status 确认引擎仍活 |
| `kitesurf.navigate.delta` | 400 | /history delta 不是 -1 或 +1 | POST /history {delta:-1} 后退 / {delta:1} 前进 |
| `kitesurf.navigate.failed` | 502 | Page.navigate 超时或被拒绝（DNS/网络） | 检查 URL 可达；超时后不要立刻重复 open（可能已在导航） |
| `kitesurf.engine.connect` | 502 | CDP 连接失败/服务不是 Kitesurf/socket 关闭/命令超时 | GET /status；container list；curl http://127.0.0.1:8798/health；必要时 /kite resume |
| `kitesurf.perf.method` | 400 | mode=window 排水只允许 POST | GET /perf-review/host 读快照；POST /perf-review/host?mode=window 排水 |
| `kitesurf.console.query` | 400 | console 查询参数非法 | GET /console?level=error&limit=50；POST /console {clear:true} 清空 |
| `kitesurf.diag.query` | 400 | diagnostics/operations 查询参数非法 | GET /diagnostics?limit=20；GET /operations?errorsOnly=true |
| `kitesurf.evaluate.empty` | 400 | expression 为空或超过 2000 字符 | POST /evaluate {expression:"document.title"}，≤2000 字符 |
| `kitesurf.evaluate.exception` | 400 | 页面 JS 求值抛异常（输入侧表达式错误） | 看 error 里的异常描述；先 /open 再求值；确认 selector/变量名存在 |

## 6. 正例 / 负例（可直接复制）

正例：

```bash
# 打开 → 诊断 → 点选 → 取包
POST /nano-kitesurf/open      {"url":"https://example.com"}
GET  /nano-kitesurf/diagnostics?limit=10
POST /nano-kitesurf/pick      {"x":640,"y":320}
GET  /nano-kitesurf/last
POST /nano-kitesurf/edit      {"selector":"h1","text":"Hello"}
POST /nano-kitesurf/evaluate  {"expression":"console.log('probe'); document.title"}
GET  /nano-kitesurf/console?level=log
```

负例（每个都要能预测结果，不要靠猜）：

| 输入 | 预期 | 为什么 |
|---|---|---|
| `POST /open {"url":"ftp://x"}` | `400 kitesurf.url.scheme` | 只收 http(s) |
| `POST /open {"url":"http://u:p@x"}` | `400 kitesurf.url.credentials` | 拒绝带凭证地址 |
| `POST /pick {"x":"abc"}` | `400 kitesurf.pick.point` | 坐标必须是有限数 |
| `POST /pick {"selector":"[[["}` | `400 kitesurf.pick.selector` | 选择器语法错（Boa 引擎把 SyntaxError 放在 exception.description） |
| `POST /pick {"selector":"h1.nope"}` | `404 kitesurf.pick.miss` | 合法但未命中，不是 502 |
| `POST /pick {"x":60000,"y":1}` | `400 kitesurf.pick.point` | 越界；画布外点先检查 letterbox |
| `POST /edit {"selector":"","text":"x"}` | `400 kitesurf.edit.selector` | /edit 用自己的 id，不借 pick.badpoint |
| `POST /edit {"selector":"h1","text":"x"*4001}` | `400 kitesurf.edit.badtext` | text ≤4000 |
| `POST /shot` body >4096B | `413 kitesurf.body.toolarge` | 先回 413 再断流，不是静默断连 |
| `POST /settings {"viewport":"phone"}` | `400 kitesurf.settings.viewport` | 存在但类型错，不静默吞 |
| `POST /settings {"viewport":{"width":9999}}` | `400 kitesurf.settings.viewport` | 宽 320..3840、高 240..2160；dsf 只能 1/2/3 |
| `POST /settings {"extraHeaders":{"cookie":"a=b"}}` | `400 kitesurf.settings.headers` | 凭证类 header 名被禁用 |
| `POST /history {"delta":2}` | `400 kitesurf.navigate.delta` | 只能 -1/+1 |
| `POST /kite {"action":"start"}` 当 running | `409 kitesurf.kite.state` | 阶段错，不是引擎故障 |
| `configure` 到 `http://evil.example` | `400 kitesurf.kite.remote` | 远程需 allowRemote |
| `suspend` 中 `/pick` | `502 kitesurf.engine.connect` | 引擎已停，<10ms 不挂 |
| 黑洞地址 `/open` | `504 kitesurf.navigate.egress` | 出站 25s 超时 |
| `POST /perf-review/host?mode=window`（GET） | `400 kitesurf.perf.method` | 排水只允许 POST |

## 7. 排障决策树

1. `GET /diagnostics` → 读 `hints`。
2. `engine.ok=false` → `curl http://127.0.0.1:8798/health`、`container list`（本机 Apple container）、`container system start`；容器缺了就 `POST /kite {"action":"resume"}`（先 `suspend` 若 phase=running）。
3. `engineMismatch=true` → `POST /kite {"action":"configure","httpBase":"http://127.0.0.1:8798"}`。
4. 有失败调用 → `GET /operations?errorsOnly=true` 取 errorId → 在第 5 节表里查 status/原因/下一步。
5. 页面 JS 报错 → `GET /console?level=error,exception`；网络失败 → `level=network`；导航漂移 → `level=navigation`。
6. 画面与 API 对不上 → `GET /targets` 确认附着页，重新 `POST /shot`。
7. 冷启动失败 → 看 `error` 里的 stdout 尾部真因（`failed to bootstrap` 说明 apiserver 冷），`container system start` 后重试；`kitesurf.kite.checkout` 说明缺 `KITESURF_CHECKOUT` / `config.checkout`。
8. 需要复现 → `POST /evaluate` 注入 `console.log` / 改 DOM，再用 `/shot` 看效果。

宿主日志：`~/Library/Logs/dsh-dev-web.err.log`（dsh-dev.local 实例）；桥健康：`GET http://127.0.0.1:<mcpPort>/health`。

## 8. 参数取值域 / 幂等 / 状态模型（集中表）

| 参数 | 取值域 | 不满足时 |
|---|---|---|
| `/open url` | http(s)，≤2000 字符，无凭证，无 schemeless 会被补 https:// | `kitesurf.url.*` 400 |
| `/pick x,y` | 有限数，0..10000，且必须落在 letterbox 内容带内 | `pick.point` 400 / `pick.miss` 404 |
| `/pick selector` | 合法 CSS，≤320 字符，无控制字符 | `pick.selector` 400 / `pick.miss` 404 |
| `/shot scroll` | 有限数，|scroll|≤4000 | `shot.scroll` 400 |
| `/edit text` | 字符串 1..4000 | `edit.badtext` 400 |
| `/settings userAgent` | 单行 ≤400 字符；`""` 清除 | `settings.userAgent` 400 |
| `/settings viewport` | width 320..3840、height 240..2160 整数，dsf 1/2/3，mobile 布尔；`null` 清除 | `settings.viewport` 400 |
| `/settings media` | `screen` | `print` | `null` | `settings.media` 400 |
| `/settings extraHeaders` | ≤20 项，键 1..64 字符，值 ≤200；禁用 cookie/authorization/host 等 | `settings.headers` 400 |
| `/history delta` | 只能 `-1` 或 `+1` | `navigate.delta` 400 |
| `/evaluate expression` | 字符串 ≤2000 字符；`awaitPromise:true`，结果 ≤4000 字符 | `evaluate.*` 400 |
| `/console limit` / `level` | limit 1..250；level 逗号分隔名称 | `console.query` 400 |
| `/operations limit` / `/diagnostics limit` | 1..200 / 1..100 | `diag.query` 400 |
| body | shot/pick/settings/history/console/operations/evaluate 4096B；edit 8192B | `body.toolarge` 413 |

**幂等与重试义务**：`useLive()` 只对 `connect` / `closed` 类传输错误自动重连一次；`timeout` 与所有确定性错误绝不重跑（第二次 `Page.navigate` 会与第一次竞态）。因此：`kitesurf.navigate.timeout` 后**不要立刻重发 /open**；`kitesurf.pick.miss` 可以换坐标/selector 重试；`kitesurf.kite.state` 409 要先读 `/status` 的 `kite.phase` 再选动作，不要盲重试。`POST /settings` 是事务性的：引擎 down 时返回 502 `kitesurf.engine.connect` 且**内存态回滚**，不要按「已写入」处理。

**状态模型（务必记住）**：面板、`GET /last`、`GET /status`、`/operations`、`kite.phase` 都读的是**同一个宿主进程状态**，不是各自独立的副本。宿主重启会清空 `lastPick`、console/操作环形缓冲与 perf 样本，并把引擎共享页打回 `about:blank`。`/status` 在引擎 down 时 HTTP 仍是 **200**，必须读 body 的 `ok`；`engineAlive` / `phaseConsistent` / `buildId` / `storePath` 用来确认「我到底在跟哪份代码说话」。`/kite start` 只有 `idle` 能调；`running` 但引擎死会被 `/status` 自动降级为 `idle`，此时一次 `start` 即可恢复。

**React `componentStack=null`**：表示页面没有可解析的 React fiber（非 React 框架、生产压缩名、或 fiber 键不可见）。这时不要从 selector 猜组件文件；改用 `parentSel`/`childSel` 描述 DOM 位置，或请人在源码里确认。

**perf span 名**（`GET /perf-review/host`）：`pick`、`shot`、`open`、`edit`、`settings`、`navigate`、`targets`、`evaluate`、`kite-bringup`、`kite-container`、`kite-warmup`。点号名（旧 `kite.bringUp`）会被 `NAME_RE` 丢弃；`kite-container` 有样本而 `kite-warmup` 没有，说明容器 CLI 阶段就失败。热启动实测约 0.25s，冷建容器约 100s。

**GUI 部署链（改了代码不生效时按此顺序）**：`npm run build`（生成 `lib/route-table.js`、`lib/client.js`、`skills/*/SKILL.md`）→ 同步到 profile 的插件目录（`~/.dsh-dev/plugins/dsh-nano-kitesurf`）→ `pnpm install --force` 重链虚拟 store → 重启宿主（`launchctl kickstart -k gui/$(id -u)/ai.deepseek.dsh.dev.web`）→ **强制刷新页面**重新取鉴权。顺序错一步会出现 `route-not-listed` 并让整块插件全部路由 502；用 `/status` 的 `buildId` 对照作者树确认版本。技能正文由 `lib/skill.js` 生成，`npm test` 会校验 `skills/<name>/SKILL.md` == frontmatter + `SKILL_BODIES[name]`（逐字符），杜绝真源与生成物漂移。

**MCP 排障（只用 MCP 也能定位）**：`ws://127.0.0.1:<mcpPort>/mcp` 的 `tools/list` 除 33 个 `agent_browser_*` 外还有 6 个 `kitesurf_*` 原生工具：`kitesurf_diagnostics`（一击全量）、`kitesurf_console`、`kitesurf_operations`、`kitesurf_error_catalog`、`kitesurf_targets`、`kitesurf_bridge_health`。宿主每 30s（失败时立即）把诊断快照推给桥；若工具回 `kitesurf.diag.stale`，等几秒或先调宿主 `GET /diagnostics`。MCP 的 `-32601/-32602/-32700` 是 JSON-RPC 协议错，`kitesurf.*` 是业务错，两者互不等价。

## 9. Do not

- Do not fall back to a local Chrome, Playwright, or Puppeteer when the engine is down. Say that Kitesurf is not answering.
- Do not invent a component file from the selector alone. Ask, or search the workspace and show the match.
- Do not deploy the engine. The container owns that process.
- Do not close the socket, restart the browser, or detach mid-session — the human's page is on it.
- Do not retry a timed-out `/open` immediately: the navigation may still be executing inside the engine.
