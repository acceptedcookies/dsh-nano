# dsh-nano-kitesurf 全量代码审查

> 审查对象: `dsh-nano-kitesurf`（DNK，仿 Cursor Design Mode 的右工作区浏览器插件）
> 审查类型: `code-review`
> 审查时间: `2026-11-13`
> 审查人: `lead`（综合 4 个并行子代理的独立审查并逐条核实）
> 审查范围:
> - `dsh-nano-kitesurf/index.js`、`lib/*`、`src/*`、`runtime/*`、`skills/*`、`package.json`、`cordis.patch.yml`、`locale/*`、`AGENTS.md`、`docs/design-mode-feedback.md`、`test/*`
> - 仓级对照：`security/route-sensitivity.json`、`security/feature-contract.json`、`packages/dsh-nano-ui`、`packages/dsh-host-route-guard`、`packages/dsh-performance-review`、`context/agent-browser`
> 对照真相:
> - `dsh-nano-kitesurf/AGENTS.md`（包合同：使用表、验收、"不要"清单）
> - `dsh-nano-kitesurf/docs/design-mode-feedback.md`（对 Cursor Design Mode 吐槽的落地预算）
> - 仓规 AGENTS.md（插件中立 / 不得侧载 / 单一真源 / 上层建筑归host / 不得擅自扩约）
> - 仓级台账 `security/route-sensitivity.json` + `security/feature-contract.json`
> 文档状态: `changes-requested`

---

## 0. 总结结论

骨架与方向是对的：路由→guard→台账对账、CDP 共享 socket、note 预算、容器相位机、两个技能壳都在位。但**打包形态必崩、两处安全边界未收口、标注主链路有两处真 bug**，当前不应标记为完成，更不能发布。

- **整体判断**：`源码树内可用，但打包即崩 + 标注主链路实际走不通 + 容器/MCP 边界未收鉴权；距 release 合同差一批必修项。`
- **结论等级**：`changes-requested`
- **是否允许关闭本轮 review**：`no`
- **本轮最关键的 1-3 个判断**：
  1. `files` 漏 `lib/perf-host.js` 而 `index.js` 顶层 import 它——**打包/发布安装 import 即 `MODULE_NOT_FOUND`，整个插件起不来**（R1）。同时 `configure` 在运行时绕过 `Config.allowRemote`，把 SSRF、内容回读、全局引擎重指打包进一个已认证 POST（R2）。
  2. 容器侧是最大边界缺口：`mcp-bridge.mjs` 在 `0.0.0.0` 起**无鉴权、无 Origin 校验、无连接/帧上限**的 WebSocket→`agent-browser mcp` 桥，等于把浏览器完全控制面直接暴露给任何能到达 `host:8799` 的客户端（R3）。
  3. UI 主链路断了：拖拽橡皮筋选框在首次 pick 前永远不渲染（render 期读 DOM + `placed` 依赖 `pick`），且 arrow / `html`/`body` 点选因无 `box` 走不到备注表单（R4/R5）；叠加挂载即自动 `Page.navigate(example.com)` 违反本包 AGENTS.md「不要」（R7）。

---

## 1. 审查方法与已核实事实

这一节只写事实，不写结论。

- **对照文档**：
  - `dsh-nano-kitesurf/AGENTS.md`（使用表、验收、"不要"清单、交付物表）
  - `dsh-nano-kitesurf/docs/design-mode-feedback.md`（对 Cursor 吐槽的落地对照表）
  - 仓规 `AGENTS.md`（五条核心工作原则）
  - `security/route-sensitivity.json` / `security/feature-contract.json`（kitesurf 行）
- **核查实现**：
  - `index.js`（309 行：Config.validate、8 条路由、sendJson/readBody/fail、kite wiring、bringUp/sleepEngine）
  - `lib/engine.js`（490 行 CDP 客户端）、`lib/nano-kite.js`、`lib/container-engine.js`、`lib/skill.js`、`lib/route-guard.js`、`lib/route-table.js`、`lib/perf-host.js`
  - `src/client/index.js`（514 行右工作区面板）、`src/shared/note.js`、`src/shared/shot-point.js`
  - `runtime/Dockerfile`、`runtime/entrypoint.sh`、`runtime/mcp-bridge.mjs`
  - `skills/kitesurf-cdp/SKILL.md`、`skills/nano-kite/SKILL.md`
- **执行过的验证**：
  - `cd dsh-nano-kitesurf && npm test` → **23/23 通过**（engine/nano-kite/container-engine/note/shot-point）
  - `files` 完整性脚本：`NOT-IN-FILES lib/perf-host.js`（R1 独立复现）
  - 逐行核对 `index.js` Config.validate 与 `lib/nano-kite.js` `configure`/`engineOrigin`（R2 独立复现）
  - 核对 `skills/nano-kite/SKILL.md` 无 frontmatter（R18）、`route-guard.js` `requestRejection?.()` 可选链（R9）、`mcp-bridge.mjs` upgrade 无 Origin（R3）
  - `git status`：`dsh-nano-kitesurf/` 整包 `??` 未跟踪（本次为新包全量审查，非增量）
- **复用 / 对照的既有审查**：
  - 4 个并行子代理（UI / 业务+技能 / MCP+工具 / 安全+协议）——**采纳前已独立核实**：每一条 high/critical 都由本 agent 读原文件行号复核；子代理间相互印证的发现（如 R1/R2/R3/R9/R10）置信度高。

### 1.1 已确认的正面事实

- `Config.validate`：URL 解析、http/https 白名单、凭证拒绝、`allowRemote` 门槛——profile 级合同本身完整。
- `engineOrigin`/`pageUrl` 拒绝 `user:pass@`、协议白名单、2000 字符上限、裸域名补 `https://`。
- 8 条路由统一经 `registerRoutes` guard：先 `requestRejection`、后 405（带 `allow`）、启动期 `route-not-listed/route-stale/route-drift/route-duplicate` 硬失败，`scripts/check-route-sensitivity` 0 drift；POST 统一 `readBody(req,4096)`。
- `lib/route-table.js` 由 `build-client.mjs` 从 `security/route-sensitivity.json` 生成，单一真源。
- `elementPacket`/`designNote`/`batchNote` 认真执行反馈预算：text≤80、note≤640、batch≤1600、`data:` src 剔除、`hit: page root` 不引正文、透明/`static` 剔除、`stack: none` 不编造组件栈、iframe 限额、`componentStack` 恒 null。
- `shotPoint`/`contentFrame` 对 `object-fit:contain` + `object-position:top center` 的 letterbox 换算正确（letterbox 点击返回 null）——上一版 letterbox 偏移已修。
- 容器 CLI 使用数组 argv，无 shell 注入；`pickPoint`/`scrollDelta` 有界；页面 socket 一关即归零。
- init 锁只写一次、`already:true` 幂等、锁放 `DSH_HOME` 不放插件目录（避开 restart 覆盖），符合单一真源。
- `origin()` 每请求读 `kite.snapshot()`，`configure` 热生效；`send` 对 `Page.navigate` 给专属 `kitesurf.navigate.timeout`。
- UI 令牌纪律好：全 `--dsw-alias-*`/`--dsw-font-*`/`--dsw-radius-*`/`--dsw-elevation-*`，38px 工具栏 + 28×28 按钮 + .5px 描边对齐原生 sidebar chrome；`openNanoDialog` 传 `region` 关在面板内，`NanoToast` 复用，`aria-label`/`aria-pressed`/`focus-visible` 齐。

### 1.2 已确认的负面事实

- `files` 缺 `lib/perf-host.js`（R1）；`configure` 绕过 `allowRemote`（R2）；`mcp-bridge` 无鉴权 0.0.0.0（R3）。
- 拖拽橡皮筋选框首次 pick 前不渲染；arrow/页根 pick 走不到备注表单（R4/R5）。
- 挂载即自动 `Page.navigate(example.com)` 违反 AGENTS.md「不要」（R7）。
- `requestRejection?.()` fail-open（R9）；技能正文烤死 WS 地址（R10）；技能漏 `close` 丢页负面指令与 `mcpPort` 语义（R11）。
- `/shot`/`/last`/`/settings`/`/perf-review` 台账 L0 分类与 explorer 同型 L2 漂移（R12）。
- `fail()` 一律 502（4xx 语义丢失）；非 `KitesurfError` 折叠成 `engine.failed`；`bodyLimit` 只声明不执行（R14）。
- `useLive` 对任意错误整体重跑导致二次导航（R15）；容器 bind-mount 无 readonly、root、业主私有路径硬编（R16）。
- `start` 允许 `suspended→start` 绕过 `resume` 相位合同；`suspend` 失败留不一致态（R13）。
- `nano-kite/SKILL.md` 无 frontmatter、`kitesurf-cdp` 文件副本硬编 8787 且缺 `mark:` 语义（R18）。

### 1.3 证据可信度说明

| 证据类型 | 本轮是否使用 | 说明 |
|----------|--------------|------|
| 文件 / 行号核查 | `yes` | 全部 high/critical 发现由本 agent 读原文件行号复核 |
| 本地命令 / 测试 | `yes` | `npm test` 23/23；`files` pack 模拟脚本；`git status` |
| schema / contract 反向校验 | `yes` | `route-table.js` ↔ `security/route-sensitivity.json` ↔ `feature-contract.json` 逐行对比 |
| live / deploy / preview 证据 | `no` | 本轮未起 dsh-dev 实测画面（R4/R5 为静态代码证据，未跑页面） |
| 与上游 design / QNA 对账 | `yes` | `docs/design-mode-feedback.md` 预算逐条核对到 `note.js`/`shot-point.js`/`elementPacket` |

---

## 2. 审查发现

### 2.1 Finding 汇总表

| 编号 | 标题 | 严重级别 | 类型 | 是否 blocker | 建议处理 |
|------|------|----------|------|--------------|----------|
| R1 | `files` 漏 `lib/perf-host.js`，打包即 `MODULE_NOT_FOUND` | `critical` | `delivery-gap` | `yes` | `files` 补 `lib/perf-host.js`（或收 `lib/`），构建期校验 import↔files |
| R2 | `configure` 运行时绕过 `Config.allowRemote`，SSRF+全局重指 | `critical` | `security` | `yes` | `configure` 复用 loopback/allowRemote，或登记为显式合同 |
| R3 | MCP 桥无鉴权 0.0.0.0 WebSocket，CSWSH+浏览器全控 | `critical` | `security` | `yes` | 绑 127.0.0.1 或加 token/Origin 校验+连接/帧上限 |
| R4 | 拖拽橡皮筋选框在首次 pick 前不渲染 | `critical` | `correctness` | `yes` | `contentRect` 移 `useLayoutEffect`/`ResizeObserver`，`placed` 不依赖 `pick` |
| R5 | arrow / `html`/`body` pick 无 `box` 走不到备注表单 | `high` | `correctness` | `yes` | arrow 用 from→to 推盒；备注表单解耦 `overlay`；零尺寸 box 不画 8px 幽灵框 |
| R6 | 备注弹层不拦 pointer 事件，点输入框再次触发 pick | `high` | `correctness` | `no` | `.nks-note` 拦 `onPointerDown/Move/Up` |
| R7 | 挂载即自动 `Page.navigate(example.com)` 违反 AGENTS.md「不要」 | `high` | `correctness` | `yes` | 地址留空等回车；或等 `status.ok` 再恢复上次 url |
| R8 | 设置弹窗不回填 `status`，每次保存强制 viewport=1280 / 清 UA | `high` | `correctness` | `no` | 打开时以 `status.userAgent/viewport/kite.*` 播种，未改不发送 |
| R9 | `requestRejection?.()` 可选链 = 鉴权 fail-open | `high` | `security` | `no` | 注册时断言 `requestRejection` 为 function，fail-fast |
| R10 | 运行时 `kitesurf-cdp` 技能把 WS 地址烤死，`configure` 后指向旧引擎 | `high` | `correctness` | `no` | 技能改教"读 `GET /status` 取 `kite.cdp`"，不烤字面量 |
| R11 | 技能漏「socket 关=页面清空」与 `agent-browser close`/`--pin-tab`/`mcpPort` 语义 | `high` | `docs-gap` | `no` | 补负面指令与 mcp 桥用法 |
| R12 | 台账分类失准：`/shot`/`/last`/`/settings`/`/perf-review`/`/kite` | `high` | `scope-drift` | `no` | 与 explorer 同型路由对齐 sensitivity/capability/justification |
| R13 | 相位机偏差：`suspended→start` 绕过 resume；suspend 失败留不一致态 | `medium` | `correctness` | `no` | `start` 要求 `idle`；suspend 容忍 `no such container` |
| R14 | `fail()` 一律 502 + 非 KitesurfError 折叠 + `bodyLimit` 不执行 | `medium` | `correctness` | `no` | errorId 前缀映射 4xx/5xx；guard 与插件统一错误面；limit 落地 |
| R15 | `useLive` 对任意错误整体重跑 → 二次导航/重复 pick | `medium` | `correctness` | `no` | 只对 transport 错误重试 |
| R16 | 容器信任面：bind-mount 无 readonly、root、私有路径硬编、端口可配 | `medium` | `security` | `no` | `,readonly`+`USER node`+checkout 文档化/去默认+端口白名单 |
| R17 | `openPage` 把 `navigated.errorText` 塞返回值不抛错 | `medium` | `correctness` | `no` | `errorText` 非空映射 `kitesurf.navigate.failed` 或 toast |
| R18 | `nano-kite/SKILL.md` 无 frontmatter；`kitesurf-cdp` 文件副本漂移硬编 8787 | `medium` | `docs-gap` | `no` | 补 frontmatter；文件副本由 `lib/skill.js` 构建期生成 |
| R19 | 默认 `8787` 与本机 `8798` 冲突，无引擎特征校验 | `medium` | `correctness` | `no` | `/json/version` 特征校验或默认端口对齐 |
| R20 | 死代码：client settingsOpen/onSaveAgent/.nks-settings/VIEWPORTS；engine withCdp/pageFacts；assertPhase | `low` | `test-gap` | `no` | 清理或接回 |
| R21 | 质量缝：suspend 丢页不写状态/lastError 只 open 清/perf drain 是 GET/kite 无 span/perf 版本硬编 | `low` | `correctness` | `no` | 逐项收敛 |
| R22 | 次要 UI/AX：wheel passive+无节流、无 pointer capture、radiogroup 语义、toast 重复、pins 无管理、status 不重取、i18n 硬编、composer 私有 API、对话框无 Enter/autofocus/可叠开、chevron rotate | `low` | `platform-fitness` | `no` | 逐项收敛 |
| R23 | AGENTS.md 漂移：「标签」无实现；路由表只 5 条漏 settings/kite/perf | `low` | `docs-gap` | `no` | 补功能或改文档 |
| R24 | 杂项：UA 空 override/init 跳 Node 检查/bringUp~100s/dirname `/`/NAVIGATE_MS 45s/坐标 DSF/模块全局/mcp-bridge 零测试+无 supervisor/`/health` 回显 cdp/fail() 泄露 stderr/route-inventory 过期 | `low` | `test-gap` | `no` | 逐项收敛 |

---

### R1. `files` 漏 `lib/perf-host.js`，打包/发布安装即 `MODULE_NOT_FOUND`

- **严重级别**：`critical`
- **类型**：`delivery-gap`
- **是否 blocker**：`yes`
- **事实依据**：
  - `index.js:13` `import { hostSpan, perfSnapshot } from './lib/perf-host.js'`
  - `package.json:19-34` `files` 只含 `lib/client.js engine.js route-guard.js route-table.js skill.js nano-kite.js container-engine.js`，**无 `lib/perf-host.js`**
  - `lib/perf-host.js` 由 `scripts/build-client.mjs:39-46` 生成，是运行时文件
- **为什么重要**：源码树内 `import` 能解析，但 `pnpm`/registry 打包路径下该文件不进 tarball，`index.js` 顶层 import 直接 `ERR_MODULE_NOT_FOUND`，8 条路由与两个 skill 全不注册。说明本包从未以打包形态验收过。
- **审查判断**：交付物清单与真实 import 集合不一致，属发布合同层面的硬缺口。
- **建议修法**：`files` 补 `lib/perf-host.js`（更稳：改 `"lib"` 整体收录），并在 `build-client.mjs` 里对 `index.js` 的静态 import 集合与 `files` 做一致性断言；`npm pack --dry-run` 进验收。

### R2. `configure` 运行时绕过 `Config.allowRemote`，SSRF + 全局引擎重指

- **严重级别**：`critical`
- **类型**：`security`
- **是否 blocker**：`yes`
- **事实依据**：
  - `index.js:53-58` `Config.validate`：非 loopback `httpBase` 需 `allowRemote===true`，否则拒绝
  - `lib/nano-kite.js:84-88` `configure()` → `engineOrigin()`（93-110）只查 http(s)+无凭证，**不查 loopback、不查 allowRemote**
  - `index.js:293` `POST /kite {action:'configure'}`；`src/client/index.js:357` UI 直接调用
  - `origin()`（`index.js:186`）每请求读 `kite.snapshot().httpBase` → `configure` 热生效且**进程全局**
- **为什么重要**：profile 里 `allowRemote:false` 只在加载期生效；运行时任一已认证请求可把引擎指到任意远程 origin。之后 `/status` 成 HTTP 探活+内容回读 oracle（回显 `/health`+`/json/version` 正文），`/shot`/`/pick`/`/last` 成内容外泄通道，远程恶意引擎还能把文本经 `lastError`/skill 回流进 LLM 上下文。一个 tab 的脚本能重指其它会话的引擎。
- **审查判断**：合同面写了开关，执行面把它架空了——这是最典型的"扩约未登记"。
- **建议修法**：把 `allowRemote` 传入 `createNanoKite`，`configure` 时 enforcement；若产品决定就是允许远程，则从 Config 删除 `allowRemote` 并把决定登记进 AGENTS.md「配置与状态」+ 台账 justification。

### R3. MCP 桥：无鉴权 `0.0.0.0` WebSocket，CSWSH + 浏览器完全控制

- **严重级别**：`critical`
- **类型**：`security`
- **是否 blocker**：`yes`
- **事实依据**：
  - `runtime/mcp-bridge.mjs:128` `server.listen(port, '0.0.0.0')`
  - `server.on('upgrade')`（113-126）只查 `req.url==='/mcp'`+`sec-websocket-key`，**无 Origin 校验、无 token**
  - `:39-41` 每连接 `spawn('agent-browser',['mcp'])`，env 全量继承 `AGENT_BROWSER_CDP`
  - `lib/container-engine.js:32` `-p ${hostMcpPort}:8791` 把桥发布到宿主 `mcpPort`（页面可配，默认 8799）
  - 帧解析（61-97）只处理 `0x1`/`0x8`：`0x0` continuation 静默丢失、`0x9` ping 不回 pong、close 不回握；无 `MAX_FRAME`、无连接上限、无 idle timeout、`child.stdin.write` 无背压
- **为什么重要**：任何能到达 `host:8799` 的 LAN 客户端（乃至受害者浏览器里 `new WebSocket('ws://host:8799/mcp')` 的任意网页 = CSWSH）都获得无鉴权 MCP→CDP 通道，等于浏览器完全控制（导航、读页面、截屏、执行 JS）。分片消息会静默损坏。
- **审查判断**：这是把控制面直接开到网段上的裸露服务，与 `/open` 的 L2 完全同级却零防护。
- **建议修法**：桥只绑 `127.0.0.1`（wrangler 同机够用）或 upgrade 加 token/共享密钥校验 `Origin`；补 `0x0` 重组、ping→pong、close 回握；帧长上限 + 连接上限 + `socket.setTimeout` + `child.stdin` 背压 + idle 回收。

### R4. 拖拽橡皮筋选框在首次 pick 前不渲染

- **严重级别**：`critical`
- **类型**：`correctness`
- **是否 blocker**：`yes`
- **事实依据**：
  - `src/client/index.js:311-322` `const image = frameRef.current?.querySelector('img')` 与 `contentRect(image)` 在 render 体同步执行
  - `:312` `placed = image && pick?.element?.box && image.naturalWidth` —— 拖拽开始时 `pick` 恒为 null → `placed=null` → `overlay=null` → `data-nks-box="draft"`（446-450）**永不渲染**
  - 无 `ResizeObserver`，面板尺寸变化后已画选框不再重算
- **为什么重要**：橡皮筋是拖拽反馈核心；当前实现首次拖选完全无视觉反馈，用户不知道在选什么。
- **审查判断**：主链路第一步的视觉反馈是坏的。
- **建议修法**：`contentRect` 在 `useLayoutEffect`/`ResizeObserver` 里算好存 state；`placed` 改为只依赖 `draftBox||pick?.element?.box` 是否非空，不依赖 `pick` 本身。

### R5. arrow / `html`/`body` pick 无 `box`，走不到备注表单

- **严重级别**：`high`
- **类型**：`correctness`
- **是否 blocker**：`yes`
- **事实依据**：
  - `src/client/index.js:234-261` arrow pick 元素只有 `from/to` 无 `box`；`engine.js:113-118` `elementPacket` 对 html/body 给全零 `box`
  - `:315` `liveBox = draftBox || pick?.element?.box` 为 `undefined`/零尺寸 → `overlay` 为 null → `:451` 备注 `<form>`（依赖 `overlay && pick`）不渲染
  - `:320-321` `Math.max(box.width*scale, 8)` 会在零尺寸时于左上角画 8px 幽灵框
- **为什么重要**：AGENTS.md 宣传「按住 Shift 拖一条箭头」；拖完既看不到箭头高亮也弹不出备注框，整条路径是死路。点到 `html`/`body` 同样。
- **审查判断**：「标注」这条产品主链路在两类常见输入上直接断裂。
- **建议修法**：arrow 用 `from→to` 推导盒或让备注表单只依赖 `pick` 而非 `overlay`；零尺寸 box 识别为「页根命中」不给 8px 假框。

### R6. 备注弹层不拦 pointer 事件，点输入框再次触发 pick

- **严重级别**：`high`
- **类型**：`correctness`
- **是否 blocker**：`no`
- **事实依据**：
  - `src/client/index.js:451-461` `.nks-note` 只写 `onClick: e => e.stopPropagation()`
  - `onPointerDown`（199-205）是另一事件，照常冒泡到 `.nks-frame`，`annotate` 仍为 true → 点进输入框 = 新一次 `dragRef` 起点，覆盖正在写的 pick
- **为什么重要**：用户点输入框写备注时，会把刚选中的元素覆盖掉，或触发新的 `/pick`。
- **审查判断**：`onClick` 拦不住 `pointerdown`，是 React 事件模型的经典坑。
- **建议修法**：`.nks-note` 上加 `onPointerDown/Move/Up` 全部 `stopPropagation`。

### R7. 挂载即自动 `Page.navigate(example.com)` 违反 AGENTS.md「不要」

- **严重级别**：`high`
- **类型**：`correctness`
- **是否 blocker**：`yes`
- **事实依据**：
  - `src/client/index.js:113-114` 默认 `pageUrl/draftUrl='https://example.com/'`
  - `:135-140` `openedOnce` effect 挂树即 `run(() => navigate(pageUrl))`
  - `AGENTS.md`「不要」：不要在用户没要求时对引擎执行 `Page.navigate`
  - 该 effect 与 `status` 请求（129-133）并发，引擎 down 时也白导航一次 + 错误 toast
- **为什么重要**：抢占引擎里已有页面（agent 可能正在用），且直接违反包自己的合同。
- **审查判断**：这是"为了首屏有东西看"而牺牲合同；example.com 不该是默认值。
- **建议修法**：地址栏留空 + placeholder，等用户回车；或至少等 `status.ok===true` 再恢复上次 url。

### R8. 设置弹窗不回填 `status`，每次保存强制 viewport=1280 / 可能清 UA

- **严重级别**：`high`
- **类型**：`correctness`
- **是否 blocker**：`no`
- **事实依据**：
  - `src/client/index.js:377,385` `'data-value':'1280'` + `aria-pressed` 初值恒 1280，`status.viewport` 从不回读
  - `:356` `post(SETTINGS,{userAgent,viewport:{width}})` —— 用户只改 UA 也把视口重置 1280；`defaultValue:''` 时保存会 `userAgent:''` 清掉已有覆盖
  - `:368-370` placeholder 硬编码 `8798`/`8799` 魔法数字；`nks-origin` 只填端口时 `httpBase` 静默回落默认
- **为什么重要**：「保存」= 无条件重置三项用户没看见的字段，是静默破坏。
- **审查判断**：`openNanoDialog` 重构后没把 `status` 接线回去，半成品。
- **建议修法**：打开时用 `status.userAgent`/`viewport.width`/`kite.httpBase`/`kite.mcpPort` 播种 `defaultValue`/`data-value`；未变更就不发送对应字段；viewport 加"系统默认"档发 `viewport:null`。

### R9. `requestRejection?.()` 可选链 = 鉴权 fail-open

- **严重级别**：`high`
- **类型**：`security`
- **是否 blocker**：`no`
- **事实依据**：
  - `lib/route-guard.js:113` `const rejection = conn.requestRejection?.(req)` —— 方法不存在时 `rejection===undefined`，请求直接放行
  - `ctx.get('connection')` 缺失会抛 `no-connection`（fail-closed），方法缺失却 fail-open
  - AGENTS.md 验收声称"路由都有 `connection.requestRejection`"
- **为什么重要**：宿主将来改 API 或旧版本缺该方法时，全部 8 条路由鉴权静默消失。当前宿主有该方法（asar 中存在），所以是 latent 而非 active。
- **审查判断**：fail-open 是安全代码里最危险的一种默认。
- **建议修法**：`registerRoutes` 启动时 `typeof conn.requestRejection === 'function'` 否则 `throw new RouteGuardError('no-request-rejection',…)`，把运行时 fail-open 变启动期 fail-fast。

### R10. 运行时 `kitesurf-cdp` 技能把 WS 地址烤死，`configure` 后命令指向旧引擎

- **严重级别**：`high`
- **类型**：`correctness`
- **是否 blocker**：`no`
- **事实依据**：
  - `index.js:187` `kitesurfSkill(httpBase, browserSocketUrl(httpBase))` 用 apply 时 `config.httpBase`
  - `/kite` `configure` 只改 `kite` 内存态（`nano-kite.js:86`），路由走 `origin()` 跟新地址，但技能正文 `agent-browser --cdp ws://旧/devtools/browser` 不变
  - `skills/kitesurf-cdp/SKILL.md:9` 自称"prefer that copy because it contains the configured origin"——那份 live copy 同样是死的
- **为什么重要**：agent 按技能驱动时会打到旧引擎地址，而它恰恰是 `nano-kite` 让 agent 改的那个引擎。
- **审查判断**：技能正文应当是"教 agent 去哪读 live origin"，而不是"把一次快照烤进文本"。
- **建议修法**：技能正文改为"先 `GET 见 QNA status` 读 `kite.cdp` 作 `--cdp`"；或在 `configure` 成功后重新注册技能。

### R11. 技能漏「socket 关=页面清空」与 `close`/`--pin-tab`/`mcpPort` 语义

- **严重级别**：`high`
- **类型**：`docs-gap`
- **是否 blocker**：`no`
- **事实依据**：
  - `lib/nano-kite.js:11` PITFALLS、`engine.js:186` 注释都写明"socket 一关页面打回 about:blank"
  - `agent-browser skills get core` 教人 `close` 收工、daemon 1h 空闲自动退、`--pin-tab` 共享 CDP（`skill-data/core/SKILL.md`）——单页 Kitesurf 上 `close` 会当着用户的面清空共享页，`--pin-tab` 没东西可 pin
  - 两份技能与 AGENTS.md 都没禁止 `close`；`mcpPort` 从未解释是 `ws://host:mcpPort/mcp` 的 agent-browser MCP 桥端口
  - `mcpPort` 只在新容器创建时生效（`container-engine.js:80-88` 已存在容器不复核端口映射）
- **为什么重要**：照做的 agent 会亲手毁掉用户正在看的页面，下一次 `/shot` 得到白图；`mcpPort` 设置框则是一个无人能懂的魔法数字。
- **审查判断**：负面指令和端口语义是"我们自己的 MCP 使用方式"的核心，目前完全缺席。
- **建议修法**：kitesurf-cdp 加"不要 `close`、不要共享这条 `--cdp`、每次 attach 前 `get url`/`snapshot` 确认页面在"；nano-kite 写明 `mcpPort`=`ws://host:8799/mcp` 的 agent-browser MCP 桥端口、驱动页面用 `kite.cdp`；suspend/resume 会重置页面。

### R12. 台账分类失准：`/shot` `/last` `/settings` `/perf-review` `/kite`

- **严重级别**：`high`
- **类型**：`scope-drift`
- **是否 blocker**：`no`
- **事实依据**：
  - `/shot` 标 L0 `read:kitesurf`，实际返回整页 PNG base64（内容外泄，与 `/open` L2 同类后果）
  - `/last` 标 L0，实际返回上一次的元素包（含页面文本）
  - `/settings` 标 L0"不导航不写文件"，实际做 `setUserAgentOverride`/`setDeviceMetricsOverride` 全局可变状态
  - `/perf-review/host` 标 L0，`mode=window` → `takeWindow()` drain 全进程窗口样本；explorer 同型路由被判 L2 + accepted-risk `nxe:perf-review-window-drain`
  - `/kite` justification「Does not spawn a container」与 `bringUp` 的 `container run` 矛盾（init 不 spawn，但 start/resume 会）
- **为什么重要**：同一行为两套结论，台账不再是可信的安全真源；`/shot`/`/last` 把页面内容当成健康探活同级。
- **审查判断**：灵敏度分类要按"动作的后果"而不是"路由读起来像什么"。
- **建议修法**：重审这四行的 sensitivity/capability/justification，与 explorer 同型路由对齐后回写台账。

### R13. 相位机偏差：`suspended→start` 绕过 `resume`；`suspend` 失败留不一致态

- **严重级别**：`medium`
- **类型**：`correctness`
- **是否 blocker**：`no`
- **事实依据**：
  - `lib/nano-kite.js:66-71` `start()` 只挡 `running`，允许 `suspended→start`——绕过 `resume` 的相位合同
  - `index.js:182-185` `sleepEngine` 先 `releaseEngine()`（socket 已关、页面已丢）再 `stopLocalContainer`；若容器已没了，`stop` 抛 `kitesurf.kite.container`，`suspend` 不翻相位——结果 `phase` 仍 `running` 但页面没了
  - `lib/nano-kite.js:3` 头注「start, suspend, resume … do not spawn a container」错误：`onStart`/`onResume` 都会 `ensureLocalContainer`
- **为什么重要**：相位合同既被绕过也会"假真"，技能和 AGENTS.md 的语义与实现分叉。
- **审查判断**：状态机对外承诺的迁移图与代码不一致。
- **建议修法**：`start` 要求 `phase==='idle'`，`suspended` 态抛 `kitesurf.kite.state`；`stop` 容忍 `no such container` 或先改相位再做副作用；改头注。

### R14. `fail()` 一律 502 + 非 KitesurfError 折叠 + `bodyLimit` 只声明不执行

- **严重级别**：`medium`
- **类型**：`correctness`
- **是否 blocker**：`no`
- **事实依据**：
  - `index.js:121-126` `fail()` 恒 `sendJson(res,502,…)`：`kitesurf.url.*`/`settings.*`/`body too large`/`invalid JSON` 全是 4xx 类却报 502
  - `index.js:117-119` `errorIdOf` 非 `KitesurfError` 一律 `kitesurf.engine.failed`：`pickPoint`/`scrollDelta` 的裸 `Error`、CDP 域错误、`screenshot was empty` 全折叠
  - `lib/route-guard.js:106` `bodyLimit` 只写进 frozen route 记录，wrapper 不执行；每个 POST 手写 `readBody(req,4096)` 与表值无绑定
  - `route-guard.js:113-129` 鉴权拒绝空体 `res.end()`、405 `{ok:false,reason}`、500 `{ok:false,reason:'failed'}`——与插件 `fail()` 的 `{ok:false,errorId,error}`+`cache-control:no-store` 三套异构
- **为什么重要**：输入错误被报成上游故障，监控/重试策略误判；`errorId` 粒度塌缩后 `/status.lastError` 与 toast 无法区分"传错参"和"引擎挂了"。
- **审查判断**：一致性是强项，但这份一致是"一致地错"。
- **建议修法**：`fail()` 按 errorId 前缀映射——`url.*`/`settings.*`/`body`→400、`body too large`→413、`kite.state`→409、真正上游→502；所有输入校验抛 `KitesurfError` 带专属 id；guard 与插件共用错误 emitter；`route.bodyLimit` 在 wrapper 统一截流。

### R15. `useLive` 对任意错误整体重跑 → 二次导航/重复 pick

- **严重级别**：`medium`
- **类型**：`correctness`
- **是否 blocker**：`no`
- **事实依据**：
  - `lib/engine.js:296-308` `body(connectLive)` 抛任何异常→`dropLive`→重连→完整重跑 `body`
  - `openPage` 中 `kitesurf.navigate.egress`、`waitForContent` 后 evaluate 失败、`pickElement` 的 `element probe failed`（:481）、`screenshot was empty`（:459）等确定性错误都会触发断线重连+二次 `Page.navigate`（同 URL 导航两次）
  - 失败延迟至多 ~20s+；`kitesurf.url.*` 因在校验外才幸免
- **为什么重要**：确定性/页面态错误被当成 transport 错误重试，既浪费又可能让"已经导航成功但后续失败"的页面被二次导航。
- **审查判断**：重试边界划错了——应按错误类型而不是"body 抛了"来重试。
- **建议修法**：只对连接建立失败与 transport 级错误（ws close/超时/`cdp connect`）重试；body 业务错误直接抛出。

### R16. 容器信任面：bind-mount 无 readonly、root、私有路径硬编、端口可配

- **严重级别**：`medium`
- **类型**：`security`
- **是否 blocker**：`no`
- **事实依据**：
  - `lib/container-engine.js:33` `--mount type=bind,source=<checkout>,target=/opt/kitesurf` **无 `,readonly`** → 容器可写宿主 checkout
  - `runtime/Dockerfile` 无 `USER`，`entrypoint.sh` 的 wrangler 与 mcp-bridge 均 root 运行
  - `:12` `DEFAULT_CHECKOUT='/Volumes/mini-512/nano-agent-dev/context/kitesurf'` 业主机器绝对路径硬编进发布代码（违「不得硬编 base-url/本机路径」精神，`KITESURF_CHECKOUT` 兜底但文档未登记）
  - `-p <port>:8787`/`8791` 宿主端口来自页面可配 `httpBase`/`mcpPort`（`hostPort` 19-23）→ 已认证页面能让容器绑任意宿主端口
- **为什么重要**：容器内任一进程被攻陷（供应链或 R3 的未授权 MCP）即可写宿主 checkout；私有拓扑进了 shipped code。
- **审查判断**：在"只跑本地可信镜像"的假设下可接受，但与仓规的"不得硬编本机路径"直接冲突。
- **建议修法**：mount 加 `readonly`；镜像加 `USER node`；checkout 去默认值或登记 `KITESURF_CHECKOUT`；发布端口限回环或白名单区间。

### R17. `openPage` 把 `navigated.errorText` 塞返回值不抛错

- **严重级别**：`medium`
- **类型**：`correctness`
- **是否 blocker**：`no`
- **事实依据**：
  - `lib/engine.js:402` 返回 `{…, errorText: navigated.errorText ?? null}`，`net::ERR_*` 不抛
  - `src/client/index.js:167-175` `navigate()` 只看 `ok` 然后照常 `shot`——用户看到 about:blank 截图无任何提示
- **为什么重要**：导航失败被当成成功，用户面对白图不知道是 DNS/证书/超时。
- **审查判断**：返回值里带 `errorText` 但没人消费，等于静默吞错。
- **建议修法**：`errorText` 非空时映射 `kitesurf.navigate.failed` 或客户端 toast。

### R18. `nano-kite/SKILL.md` 无 frontmatter；`kitesurf-cdp` 文件副本漂移硬编 8787

- **严重级别**：`medium`
- **类型**：`docs-gap`
- **是否 blocker**：`no`
- **事实依据**：
  - `skills/nano-kite/SKILL.md:1` 开头直接 `# nano-kite`，无 `name/description/user-invocable` frontmatter（对比 `kitesurf-cdp/SKILL.md:1-5`）
  - `skills/kitesurf-cdp/SKILL.md:11,18-20` 硬编 `127.0.0.1:8787`；运行时版本（`lib/skill.js:59-61`）多了 `mark:`、`line:`、POST 路由说明，文件副本只有 29 行缺这些
  - AGENTS.md 交付物表只把 kitesurf-cdp 列为"给文件系统发现用"，但 nano-kite 同目录下无 frontmatter 不会被发现机制登记
- **为什么重要**：文件系统发现拿不到 nano-kite 技能；kitesurf-cdp 两份漂移且留过时默认值。
- **审查判断**：技能"运行时版"和"发现版"不该两份手写。
- **建议修法**：`nano-kite/SKILL.md` 补 frontmatter；`kitesurf-cdp/SKILL.md` 由 `lib/skill.js` 构建期生成（同 `route-table.js` 的做法），唯一真源。

### R19. 默认 `8787` 与本机 `8798` 冲突，无引擎特征校验

- **严重级别**：`medium`
- **类型**：`correctness`
- **是否 blocker**：`no`
- **事实依据**：
  - `index.js:27`、`lib/nano-kite.js:33` 默认 `http://127.0.0.1:8787`
  - `lib/nano-kite.js:12` PITFALLS 自述"本机 8787 可能是别的程序。这台机器上的容器引擎在 8798"
  - `browserSocketUrl`/`connectLive` 只拼接握手，**不验证对端真是 Kitesurf**——`/health` 200+`/devtools/browser` 能握手的本机 Chrome 会被当引擎接管
- **为什么重要**：默认端口指向的可能根本不是 Kitesurf；文档与默认值自相矛盾。
- **审查判断**：默认值与 pitfall 注释打架，且无对端身份校验。
- **建议修法**：`statusOf`/`bringUp` 对 `/json/version` 的 `Browser` 字段做 Kitesurf 特征校验（至少 warn）；或把默认端口与文档对齐。

### R20. 死代码：client 残留 + engine/nano-kite 未用导出

- **严重级别**：`low`
- **类型**：`test-gap`
- **是否 blocker**：`no`
- **事实依据**：
  - `src/client/index.js:123` `settingsOpen/setSettingsOpen`、`:300-309` `onSaveAgent`、`:62-64` `.nks-settings`、`:19-23` 客户端 `VIEWPORTS`——`openNanoDialog` 重构残留
  - `lib/engine.js:145` `withCdp`、`:438` `pageFacts`——导出无人调用，是第二套 CDP 路径
  - `lib/nano-kite.js:142` `assertPhase` 无人调用
- **为什么重要**：腐化面；`withCdp`/`pageFacts` 是带 `engine.failed` id 的另一条 CDP 路径。
- **建议修法**：删除或接回；client `agent` state 收敛为只服务 `defaultValue`。

### R21. 质量缝：suspend 丢页不写状态 / `lastError` 只 open 清 / perf drain 是 GET / kite 无 span / perf 版本硬编

- **严重级别**：`low`
- **类型**：`correctness`
- **是否 blocker**：`no`
- **事实依据**：
  - `index.js:182-185` suspend 后 `pageUrl` 仍是旧地址、页面对 about:blank，技能不写"resume 会重置页面"
  - `index.js:228` `lastError` 只在 `open` 成功清，shot/pick/settings/kite 成功不清
  - `index.js:300-307` `?mode=window` → `takeWindow()` drain——GET/HEAD 有副作用、可预取、两 poller 互饿
  - `index.js` 只 span `open/shot/pick/settings`，`kite`/`bringUp`（~100s）无 span；`src/host/perf.js:5` 与 `src/client/index.js:27` 硬编码 `version:'0.1.0'` 与 `pluginVersion()` 动态读法不一致
  - `nano-kite.js:39` `snapshot()` 每次 `/status` 附带 7 条 PITFALLS 全文
- **建议修法**：任一写路由成功即清 `lastError`；`mode=window` 改 POST 或注明 drain；kite/bringUp 加 span；perf 版本改读 `pluginVersion()`；`snapshot` 不带 `lock` 全文。

### R22. 次要 UI/AX 一批

- **严重级别**：`low`
- **类型**：`platform-fitness`
- **是否 blocker**：`no`
- **事实依据**（`src/client/index.js`）：
  - `:264-270` `onWheel` passive listener 下 `preventDefault` 静默失败 + 无节流，快速滚轮连发多个 `scrollBy+screenshot`
  - `:199-262` 拖拽无 `setPointerCapture`，拖出 frame 松手时 `dragRef` 悬挂
  - `:371-393` 视口 `role="radiogroup"` 但子项是 `aria-pressed` 按钮（语义错），应用 `nanoTabs`（`items/value/onChange` 契约正好匹配，`packages/dsh-nano-ui/src/tabs.js:87-95` 键盘契约白给）
  - `:61` toast 规则整段重复 `NANO_STYLES` 再覆盖 `font-size:12px`（应消费 `--nano-*` 令牌）
  - `:277` pins `slice(-8)` 静默丢最旧、无单项管理；`:129-133` `status` 取一次永不重取
  - `:410` `'Page URL'`、`:465` `'Note for the composer'` 等硬编码中英文混排，无 `ctx.locale`
  - `:93-109` `insertComposerNote` 用 `__lexicalEditor`+`data-composer-input` 私有 API，脆弱
  - `:364-393` 对话框 children 裸 input 无 `<form>`/无 autofocus/Enter 不提交；`:339` 可叠开多对话框
  - `:40-42` 上下按钮用左右 chevron 各 rotate 90°（应用 `IconChevronDown/Up`）；`:48-49` `.nks-go` 只在 `:focus-within` 可见
- **建议修法**：逐项收敛；`nanoTabs` 替换手撸 radiogroup；`ResizeObserver` 替代 render 期读 DOM。

### R23. AGENTS.md 漂移：「标签」无实现；路由表漏 `settings`/`kite`/`perf-review`

- **严重级别**：`low`
- **类型**：`docs-gap`
- **是否 blocker**：`no`
- **事实依据**：
  - 「使用」表「标签 | 记住多个地址。切换时让容器打开那一个」——客户端无 tab 条
  - 路由表只列 5 条，缺 `见 QNA settings`、`见 QNA kite`、`见 QNA perf-review/host`；`/shot` 行只写"PNG 的 base64"漏 `mimeType`/`targetId`
- **建议修法**：补 tab 功能或改文档；路由表补齐。

### R24. 杂项一批

- **严重级别**：`low`
- **类型**：`test-gap`
- **是否 blocker**：`no`
- **事实依据**：
  - `engine.js:211` `applyEmulation` 无条件发 `setUserAgentOverride`，`userAgent:''` 与"不 override"在 Chrome 上不等价（建议非空才发）
  - `nano-kite.js:46-50` `init` 的 `already:true` 路径跳过 Node 版本检查；`dirname`（:127）只认 `/`（Windows 失效）
  - `index.js:173-179` `bringUp` 实际最久 ~100s（20×(4s+1s)）非注释暗示的 20s
  - `engine.js:12` `NAVIGATE_MS=45000` > 引擎 25s egress——`kitesurf.navigate.timeout` 几乎不可达；`waitForHref`（:310-319）`location.href===target` 精确相等，重定向后空转 3s 静默放行；`waitForContent`（:321-330）`innerText>40` 阈值，纯媒体页/慢注入静默放行
  - `index.js:30-32`、`engine.js:190-194` `lastPick`/`lastError`/`live`/`userAgent`/`viewport` 模块全局跨 tab 共享
  - `mcp-bridge.mjs` 零测试；`entrypoint.sh:10` `node /mcp-bridge.mjs &` 后台无 supervisor、`set -e` 不感知桥崩溃
  - `mcp-bridge.mjs:105-106` `/health` 回显 `cdp` 内部拓扑；`fail()`（`index.js:121-126`）把 `runContainer` stderr 截 300 字符回显可能泄露路径
  - `scripts/route-scan.mjs:173` 注释"Six path constants"实际八个；仓级 `security/route-inventory.md` 缺 kitesurf 节、`check-feature-contract.mjs` 报 `/nano-explorer-extra/ssh-key` 缺合同行（仓级漂移）
- **建议修法**：逐项收敛；`mcp-bridge` 至少导出帧解析函数做单测 + 桥崩溃重启。

---

## 3. In-Scope 逐项对齐审核

对照业主给出的四个审查议题 + `docs/design-mode-feedback.md` 落地预算。

| 编号 | 计划项 / 设计项 / closure claim | 审查结论 | 说明 |
|------|----------------------------------|----------|------|
| S1 | UI 是否符合常理、复用 dsh-nano-ui 与原生视觉、有无手写 | `partial` | 令牌/工具栏/按钮/openNanoDialog/NanoToast 复用达标；但 R4/R5/R6 主链路 bug、R8 设置半成品、R22 一批手写/死代码/AX 缺口 |
| S2 | 业务逻辑通顺、slash 提示词到位、复刻 ego-browser 特性 + 自定义 MCP 正/负面提示 | `partial` | 流程形状连贯、origin() 热生效、init 幂等；但 R2 allowRemote 架空、R10 技能烤死地址、R11 负面指令+mcpPort 缺失、R13 相位偏差 |
| S3 | MCP 接口与调试工具到位、接口请求统一、error-handling 完整、统一 UI | `partial` | 8 路由统一 guard+sendJson/fail、perf spans、status/last 观测面在；但 R3 桥裸奔、R14 502 一刀切+bodyLimit 不执行、R21 drain-GET/kite 无 span |
| S4 | host↔container 协议层安全性完整、无明显漏洞 | `missing` | Config.validate/spawn argv/台账生成是好的；但 R2+R3+R9+R16 构成 SSRF、未授权浏览器控制、fail-open、root+可写 mount 四缺口 |
| S5 | design-mode-feedback 预算落地（note≤640/无 PNG/stack:none/hit:page root/mark 语义） | `done` | `note.js`/`shot-point.js`/`elementPacket` 逐项兑现，测试覆盖 |
| S6 | 单页引擎 + `sidebar.right.pane.tab` 注册（非 composer dock） | `done` | `kind:'kitesurf'`、`keepMounted`、`multiple:false`、title 槽位，与 explorer-extra 同构 |

### 3.1 对齐结论

- **done**: `2`
- **partial**: `3`
- **missing**: `1`
- **stale**: `0`
- **out-of-scope-by-design**: `0`

> 这更像"核心骨架 + 视觉皮肤已完成，但标注主链路有两处断裂、安全边界四缺口、打包形态必崩"，而不是 completed。S4 的 missing 是决定项——安全边界未收口即不可发布。

---

## 4. Out-of-Scope 核查

| 编号 | Out-of-Scope / Deferred 项 | 审查结论 | 说明 |
|------|----------------------------|----------|------|
| O1 | 不做可视化改 CSS（先试样式） | `遵守` | `design-mode-feedback.md` 明确不实现，`DOM.highlightNode` 留空是刻意的，不判 blocker |
| O2 | 单 page target、无内层 tab 条 | `部分违反` | 实现刻意（引擎单页），但 AGENTS.md「标签|记住多个地址」承诺了多地址 tab——文档与实现对不上（R23），需业主确认是砍文档还是补功能 |
| O3 | 不在本包编译 Kitesurf、不内置 workerd | `遵守` | `runtime/` 只有 Dockerfile/entrypoint/bridge，`Kitesurf` 镜像需预构建，AGENTS.md 遵守 |
| O4 | `componentStack` 恒 null（无组件栈） | `遵守` | 刻意限额，note 如实写 `stack: none`，不编造文件名 |
| O5 | 远程/同事引擎 | `误报风险` | R2 的 allowRemote 绕行是真实合同违例；但"同事引擎可用"本身是业主要求的能力——判 blocker 的是「运行时不 enforcement 合同」，不是「允许远程」这个决定本身 |

---

## 5. 最终 verdict 与收口意见

- **最终 verdict**：`核心骨架与视觉皮肤成立，但标注主链路断裂（R4/R5）、打包形态必崩（R1）、安全边界四缺口（R2/R3/R9/R16）未收口——不可关闭，不可发布。`
- **是否允许关闭本轮 review**：`no`
- **关闭前必须完成的 blocker**：
  1. `files` 补 `lib/perf-host.js`（或收 `lib/`）+ 构建期 import↔files 校验（R1）
  2. `configure` enforcement `allowRemote`（R2）
  3. `mcp-bridge` 绑回环或加鉴权/Origin/上限（R3）
  4. 拖拽选框首次 pick 前可见 + arrow/页根 pick 能写备注（R4/R5）
  5. 挂载不自动 `Page.navigate`（R7）
- **可以后续跟进的 non-blocking follow-up**：
  1. 备注弹层拦 pointer、设置弹窗回填 `status`（R6/R8）
  2. `requestRejection` fail-fast、技能烤死地址改读 `status`、负面指令+mcpPort 补全（R9/R10/R11）
  3. 台账灵敏度重审（R12）、相位机偏差（R13）、错误面 4xx/5xx 分层（R14/R15）
  4. 容器 mount readonly/root/checkout 去私有路径（R16）；`errorText`/`waitForHref`/`waitForContent` 静默放行（R17/R24）
  5. 技能 frontmatter + 文件副本构建期生成（R18）；默认端口特征校验（R19）；死代码/AGENTS.md 漂移（R20/R23）
- **建议的二次审查方式**：`independent reviewer`（安全面修完后另请 reviewer 复验 R2/R3/R9/R16；UI 主链路修完后跑一遍真实 dsh-dev 页面验证 R4/R5/R7）
- **实现者回应入口**：请按 `.adocs/templates/code-review-respond.md` 在本文档 §6 append 回应，不要改写 §0–§5。

> 本轮 review 不收口，等待实现者按 §6 响应并再次更新代码。

---

## 6. 实现者回应（第一轮修复）

> 执行者: `lead`（DeepSeek Harness agent）
> 执行时间: `2026-11-13`
> 回应范围: `R1–R24`
> 对应审查文件: `docs/code-review/26-nov/review-03.md`
> 工作计划: `docs/plan/kitesurf-review-03-fix-plan.md`

### 6.1 总体回应

- **总体回应**：全部 24 条均已按长期治理方案修复；修复中另发现并已修复一个新规 bug（MCP 桥分片消息丢弃）。
- **本轮修改策略**：单一真源（SKILL.md 由 `lib/skill.js` 生成、loopback 规则一处实现、方法表由代码扫描而非手抄）、收敛而非折叠（errorId 前缀→HTTP 状态码表）、默认关闭（loopback 发布、allowRemote、Origin allowlist、bodyLimit 落地）、防漂移（构建期 files↔import 校验、注册时 fail-fast 断言）。
- **实现者自评状态**：`ready-for-rereview`（R24 中「镜像需 [业主] 机器重建」一项为环境承接，非代码缺陷）

### 6.2 逐项回应表

| 审查编号 | 处理结果 | 处理方式 | 修改文件 |
|----------|----------|----------|----------|
| R1 | `fixed` | `files` 补 `lib/perf-host.js`；build 新增 import↔files 校验（缺档即 fail） | `package.json`, `scripts/build-client.mjs` |
| R2 | `fixed` | `configure` 复用 Config 同款规则：非 loopback→`kitesurf.kite.remote`，凭证→`kitesurf.url.credentials`；`allowRemote` 由 config 透传 | `lib/nano-kite.js`, `index.js` |
| R3 | `fixed` | 发布改 `127.0.0.1:port`；桥内再加 Origin allowlist、MAX_CONNS=8、帧/消息 1MB 上限、ping/pong/close 全套、空闲 2h 超时、主函数化便于测试 | `runtime/mcp-bridge.mjs`, `lib/container-engine.js` |
| R4 | `fixed` | `frame` 改 `useState`+`useLayoutEffect`+ResizeObserver+img load；`draftBox` 与 `pick` 解耦 | `src/client/index.js` |
| R5 | `fixed` | `elementBox()`：arrow 用 from→to 推盒；无几何 pick 不画 8px 幽灵框；备注表单锚定 `pickAnchor`（box→点击点→帧角回退） | `src/client/index.js` |
| R6 | `fixed` | `.nks-note` 拦 `onPointerDown/Move/Up` + `onClick` | `src/client/index.js` |
| R7 | `fixed` | 挂载只 `refreshStatus`+（引擎 ok 时）`shot`，永不自动 navigate | `src/client/index.js` |
| R8 | `fixed` | 打开弹窗先 `refreshStatus` 回填 UA/视口/引擎地址/MCP；保存只发差量 patch；未变字段不发送 | `src/client/index.js` |
| R9 | `fixed` | 注册时断言 `conn.requestRejection` 为 function→`RouteGuardError('no-request-rejection')`；加测试 15/15 | `packages/dsh-host-route-guard/src/route-guard.js`, `test/route-guard.test.mjs` |
| R10 | `fixed` | 两份技能不再烤字面量，改为教 agent 读 `GET /status` 的 `kite.cdp`/`kite.mcpPort`/`kite.phase`/`engineMismatch` | `lib/skill.js`, `index.js`（调用点去参数） |
| R11 | `fixed` | 技能新增「共享单页引擎」段：禁 `close`/`--pin-tab`/多 target、socket 关=丢页、suspend=丢页、DSF=1 坐标约定、mcpPort=ws 桥语义 | `lib/skill.js` |
| R12 | `fixed` | `/last` `/shot` `/pick`→L2 `read:host`；`/settings`→L1 `write:kitesurf`；`/perf`→L2 `read:host`；`/kite`→L2 `proc:local-sandbox`；justification 重写 | `security/route-sensitivity.json` |
| R13 | `fixed` | `start` 要求 `idle`（suspended 必须走 `resume`）；`stopLocalContainer` 容忍 `no such/not found/does not exist` | `lib/nano-kite.js`, `lib/container-engine.js` |
| R14 | `fixed` | `ERROR_STATUS` 前缀表：400 输入类 / 409 相位 / 413 body / 502 引擎 / 504 egress；`readBody` 抛 `kitesurf.body.json|toolarge`；handler 用 `route.bodyLimit` 落实 limit | `index.js` |
| R15 | `fixed` | `KitesurfError` 增 `transport` 标记；`useLive` 只重试 transport=true（connect/closed/timeout）一次 | `lib/engine.js` |
| R16 | `fixed` | `,readonly` 挂载、Dockerfile `USER node`+`mkdir /tmp/kitesurf-state`、checkout 去私有默认（env/config 唯一真源）、stderr `scrubPaths`、端口漂移 inspect→delete+recreate | `lib/container-engine.js`, `runtime/Dockerfile`, `runtime/entrypoint.sh` |
| R17 | `fixed` | `navigated.errorText` 非空抛 `kitesurf.navigate.failed`，不再塞进返回值 | `lib/engine.js` |
| R18 | `fixed` | 两份 SKILL.md 由 `npm run build` 从 `lib/skill.js` 生成（含 frontmatter），单一真源 | `scripts/build-client.mjs`, `skills/*/SKILL.md` |
| R19 | `fixed` | `verifyEngine()`：`/health` 200+`kitesurf` 前缀才放行 CDP 连接（mismatch 抛 `kitesurf.engine.mismatch`）；`/status` 同时上报 `engineMismatch` | `lib/engine.js`, `index.js` |
| R20 | `fixed` | 删除 client `settingsOpen`/`onSaveAgent`/`.nks-settings`/`VIEWPORTS`、engine `withCdp`/`pageFacts`、nano-kite `assertPhase`/`PHASES` | `src/client/index.js`, `lib/engine.js`, `lib/nano-kite.js` |
| R21 | `fixed` | suspend 丢页写进技能负面指令+AGENTS.md；lastError 全部写路由成功后清；`?mode=window` 仅 POST（GET→`kitesurf.perf.method`）；`bringUp` 包 `hostSpan`；perf 版本读 package.json | `index.js`, `src/host/perf.js`, `lib/skill.js` |
| R22 | `fixed` | wheel 去 preventDefault+`busyRef` 节流；`setPointerCapture`；radiogroup+roving tabindex+方向键；toast CSS 去重（`NANO_STYLES` 已是 absolute）；pins 有 undo 条+上限提示+发送按钮；失败重取 status；`copyFor`+inject `locale`/`theme`；`.nks-go` 非空可见；`role=progressbar`；dialog 内 `<form>`+autoFocus+`dialogOpenRef` 防叠开 | `src/client/index.js`, `src/client/i18n.js`, `package.json` |
| R23 | `fixed` | 「标签」落地为最近地址菜单（`openNanoMenu`，最多 8 条）；AGENTS.md 路由表补 settings/kite/perf 行与错误面 | `src/client/index.js`, `AGENTS.md` |
| R24 | `fixed` | UA 空串不再发送 override（`userAgentApplied` 门）；init 先查 Node 再读锁；dirname 支持 `\`；/health 不回显 cdp；stderr scrubPaths；mcp-bridge 受 supervisor 循环包 + 新增 6 项单测；route-inventory 补 kitesurf 8 行+explorer 4 行并修 totals；`route-scan` 改为解析 spec（不再手抄方法表） | 多文件 |

> 独立复核状态：以下留给二审确认（`self-claimed-only`）；`npm test`/`npm run build`/两道 gate 均已绿（见 §6.5）。

### 6.3 Blocker / Follow-up 状态汇总

| 分类 | 数量 | 编号 | 说明 |
|------|------|------|------|
| 已完全修复 | 23 | R1–R23（含 R24 大部分子项） | 见 6.2 |
| 有理由 deferred | 1 | R16 子项（镜像重建）/ R24 `linux-prefix` | **环境承接**：`runtime/linux-prefix/` 构建产物未提交，本机无法 `container build`；需 [业主] 机器：`container build -t kitesurf-engine:latest runtime/` + `container delete -f kitesurf` + `POST /kite {"action":"start"}`（loopback 发布、只读挂载、USER node、受监督桥全部在新镜像/新容器生效）。未获授权不得停正在运行的引擎。 |
| 仍 blocked | 0 | — | — |

**修复中新增并已修复的缺陷**（不属于 R1–R24）：MCP 桥分片消息用当前帧 opcode 判定发送→所有 0x0 续帧收尾的消息被静默丢弃；已改为记录起始帧 opcode（`test/mcp-bridge.test.mjs`「fragmented text frames reassemble」捕获并验证）。

### 6.4 变更文件清单

- `dsh-nano-kitesurf/index.js` — Config.checkout、errorId→状态码表、bodyLimit 落地、status 增 engineMismatch/kite 四元组、lastError 全写路由清除、perf POST 门、bringUp span
- `dsh-nano-kitesurf/lib/engine.js` — transport 重试域、verifyEngine、waitForPage、navigate.failed、shot.empty、pick 错误 id、死代码删除、UA 门
- `dsh-nano-kitesurf/lib/nano-kite.js` — allowRemote/engineOrigin、相位机收口、Node 先行检查、dirname `\`、死代码删除
- `dsh-nano-kitesurf/lib/container-engine.js` — loopback 发布、readonly 挂载、checkoutPath env/config、inspect 漂移重建、scrubPaths、stop 容忍
- `dsh-nano-kitesurf/runtime/mcp-bridge.mjs` — 安全姿态全套 + 分片 opcode bug 修复 + 可测试导出
- `dsh-nano-kitesurf/runtime/entrypoint.sh`、`runtime/Dockerfile` — 桥 supervisor、wrangler --persist-to /tmp、USER node
- `dsh-nano-kitesurf/lib/skill.js` — 双技能正文重写（读 live cdp、负面指令、完整错误目录）
- `dsh-nano-kitesurf/src/client/index.js` — 全量重写（R4–R8、R22、R23：i18n、frame state、pickAnchor、菜单、pins 管理、radiogroup、capture、wheel）
- `dsh-nano-kitesurf/src/client/i18n.js` — 新增 zh/en copy
- `dsh-nano-kitesurf/src/host/perf.js` — 版本读 package.json
- `dsh-nano-kitesurf/scripts/build-client.mjs` — SKILL.md 生成 + files↔import 校验
- `dsh-nano-kitesurf/package.json` — `files` 补 perf-host；`dsh.client.inject` 补 primitives/locale/theme
- `dsh-nano-kitesurf/test/container-engine.test.mjs` — 新参数契约 + 漂移重建 + checkout 缺省用例
- `dsh-nano-kitesurf/test/nano-kite.test.mjs` — allowRemote、suspended→start 拒、旧 Node+已有锁
- `dsh-nano-kitesurf/test/mcp-bridge.test.mjs` — 新增：acceptKey、originAllowed、分片、ping/close、RSV/超限、sendFrame
- `dsh-nano-kitesurf/AGENTS.md` — 交付物/路由表/配置/「标签」行全面对齐
- `packages/dsh-host-route-guard/src/route-guard.js` + `test/` + `AGENTS.md` — 注册时 fail-fast 断言
- `scripts/route-scan.mjs` — kitesurf 段改为解析 spec 的 path/methods/bodyLimit（手抄表是漂移源）
- `security/route-sensitivity.json` — kitesurf 7 行重分级 + perf 补 POST
- `security/feature-contract.json` — kitesurf responseShape/methods 更新 + 补 `/nano-explorer-extra/ssh-key` 行 + ui/dataLocations 重写
- `security/route-inventory.md` — 补 kitesurf 8 行 + explorer 4 行 + 总数 35

### 6.5 验证结果

| 验证项 | 命令 / 证据 | 结果 | 覆盖的 finding |
|--------|-------------|------|----------------|
| 插件单测 | `cd dsh-nano-kitesurf && npm test` | `pass`（34/34，含新增 11 项） | R9,R13,R16,R19,R24（+新发现分片 bug） |
| 插件构建 | `npm run build` | `pass`（route-table/route-guard/perf-host/client/SKILL.md + files 校验） | R1,R10,R18 |
| guard 单测 | `cd packages/dsh-host-route-guard && npm test` | `pass`（15/15，含 no-request-rejection） | R9 |
| 敏感台账 gate | `node scripts/check-route-sensitivity.mjs` | `pass`（35 routes, 0 drift；含 perf POST） | R12,R14,R21 |
| 功能合同 gate | `node scripts/check-feature-contract.mjs` | `pass`（35 routes） | R12,R14 |
| 实时验证：当前运行容器 | `container inspect kitesurf` | 旧容器仍是 `0.0.0.0` 发布/可写挂载/root — 代码侧修复已落地，运行侧生效需 [业主] 重建镜像+重建容器（§6.3） | R3,R16 |

```text
build ok: lib/route-table.js lib/route-guard.js lib/perf-host.js lib/client.js skills/*/SKILL.md; files check passed
# pass 34  fail 0  /  # pass 15  fail 0  /  route-sensitivity 0 drift  /  feature-contract OK
```

### 6.6 未解决事项与承接

1. **镜像与容器重建（需要 [业主]）**：`runtime/` Dockerfile 未提交 `linux-prefix/` 依赖产物，本机不具备构建条件；`container build` + `container delete -f kitesurf` + 重新 `start` 后，loopback 发布、`USER node`、只读挂载、受监督 MCP 桥才在运行侧生效。期间旧容器仍在 `0.0.0.0` 发布（既有风险，非本次修复引入）。
2. **`KITESURF_CHECKOUT` / `config.checkout`（需要 [业主]）**：需指向一份已构建的 Kitesurf 源码树，否则 `start`/`resume` 返回 `kitesurf.kite.checkout`。
3. **`pageFacts` 回放态**：`useLive` 对已分离页面无 restore 契约——engine 重启丢页属预期（技能已写明），若 [业主] 要「suspend→resume 恢复页面」需另立 contract 决定。
4. **SIBLING 插件的 route-guard 烘焙**：`no-request-rejection` fail-fast 仅当各插件重建 `lib/route-guard.js` 后生效（notepad/model-selector/explorer-extra 各自烘焙一份）——属可接受的错开 rollout，未在本轮动它们。

---

## 6B. 二审结果与修复循环（2026-11-13，2 个子代理并行）

> 二审范围拆分：agent-5 = 宿主/安全侧；agent-6 = client/UX/A11y 侧。两份原始结论见会话记录。

### 6B.1 二审结论

- **宿主侧**：`fixes-needed` —— R1/R2/R9/R10/R11/R12/R17/R18/R21 确认 `confirmed-fixed`；R14/R15/R16/R19/R24 判 `partially-fixed`，暴露 **S2-1…S2-8**。
- **client 侧**：`clean` —— R4/R5/R6/R7/R8/R10/R11/R18/R23 确认 `confirmed-fixed`；R20/R22 `partially-fixed`（剩余子项），暴露 **S3-1…S3-6**（均 low）。

### 6B.2 二审新发现处理

| 编号 | 严重级 | 问题 | 处理 | 文件 |
|------|--------|------|------|------|
| S2-1 | medium | `kitesurf.perf.method` 未入 ERROR_STATUS → 502 而非 400 | **fixed** | `index.js`（加 `kitesurf.perf.`→400） |
| S2-2 | medium | `*.timeout` 标 transport → useLive 重跑 body = 二次导航/重复 scroll | **fixed** | `lib/engine.js`（transport 域收窄为 connect/closed；timeout 只 dropLive 不重跑） |
| S2-3 | medium | `originAllowed` 前缀匹配 → `localhost.evil.example` 可绕 | **fixed** | `runtime/mcp-bridge.mjs`（解析 URL 精确比 hostname，allowlist `localhost,127.0.0.1,[::1]`）+ 测试断言改为「必须拒绝」 |
| S2-4 | low | attach 抛错 conns 计数泄漏 → 8 次后拒连 | **fixed** | `runtime/mcp-bridge.mjs`（try/catch 释放 slot） |
| S2-5 | medium | inspect 漂移只比端口不比 hostAddress → 旧 `0.0.0.0` 容器被静默复用 | **fixed** | `lib/container-engine.js`（match 要求 `hostAddress ∈ 127.0.0.1/::1`，否则 delete+recreate） |
| S2-6 | low | route-scan 只认字面形，bodyLimit 可串 spec | **fixed** | `scripts/route-scan.mjs`（兼容 `method:` 单数/字面 path、bodyLimit 限 spec 头、8-row 硬断言失败即报错） |
| S2-7 | low | bringUp span 不覆盖 ~100s 健康轮询 | **fixed** | `index.js`（span 包住整个 bringUp） |
| S2-8 | low | guard AGENTS.md 「43 路由」过期 | **fixed** | `packages/dsh-host-route-guard/AGENTS.md`（改为「全部活跃路由，活跃数见台账」） |
| S3-1 | low | `error`/`setError` 状态与 `.nks-alert` CSS 新死代码 | **fixed** | `src/client/index.js`（删除；toast 已覆盖错误呈现） |
| S3-2 | low | client perf `version` 硬编 0.1.0 | **fixed** | `src/client/index.js` + `build-client.mjs`（esbuild `define __NKS_VERSION__`，同款 NMS 模式） |
| S3-3 | low | `onCancel` 里再 `dialog.close()` → 双 unmount | **fixed** | `src/client/index.js`（onCancel 只复位 flag） |
| S3-4 | low | 拖拽中滚轮换截图 → draftBox 静默映射到新页面 | **fixed** | `src/client/index.js`（`dragRef` 非空时 wheel 直接返回） |
| S3-5 | low | 技能写 `line: x1,y1 → x2,y2` 与 `lineOf()` 实际空格格式不符 | **fixed** | `lib/skill.js`（改为 `x1,y1 x2,y2`） |
| S3-6 | low | zh pins 文案「8（已满）条待发送」语序错 | **fixed** | `src/client/i18n.js`（「8 条待发送标注（已达上限…）」） |

### 6B.3 修复循环后验证

```text
npm test (dsh-nano-kitesurf)        34/34 pass
npm test (dsh-host-route-guard)     15/15 pass
npm run build                       OK（route-table/guard/perf-host/client/SKILL.md + files 校验）
check-route-sensitivity             35 routes, 0 drift
check-feature-contract              OK: 35 routes
```

### 6B.4 收口判定

- 全部 R1–R24 + S2-1…8 + S3-1…6 在**代码侧**闭环；无 `not-fixed`/`regression`。
- 唯一未闭环属**环境承接**（非代码缺陷）：运行中的旧 `kitesurf` 容器仍为旧镜像参数（`0.0.0.0` 发布、root、可写挂载、无监督桥），需 [业主] 重建镜像并重建容器后运行侧生效——S2-5 的 hostAddress 漂移检查保证了重建发生时旧容器不会被误复用。
- 建议 [业主] 复核点：跨包触碰（guard fail-fast、explorer-extra ssh-key 合同行、route-scan 解析式重写）均属 R9/R12/R24 明确要求的治理方向，台账已回写=登记完成。
