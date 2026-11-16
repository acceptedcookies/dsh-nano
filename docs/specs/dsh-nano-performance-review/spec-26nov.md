# nano 插件性能观测（dsh-performance-review）

> 规格 rev5。源于 2026-11-10 与业主的讨论。rev1–rev4.1 的形成史见
> `docs/code-review/26-nov/PRE-1116-action-plan.md` 与 `performance-alpha.md` §12：
> rev2 纠正事实与度量合同，rev3 定包名与首个植入对象，rev4 修 root 锚名、宿主送达与
> 结构计数，rev4.1 把 `nativeInpP75` 降为页级 audit 并增加三段硬红线。
> rev5 按 `PRE-1116` `T-O-PRE1116-13.5` 一次硬切到协议 v2：报告形状为
> `dnpr.report/2`，页面动词只有 `read` / `cutWindow`，宿主游标为 `{epoch, seq}`
> 并序列化为 `<epoch>.<seq>`，每插件判定依据在 `src/perf/declaration.json`。
> 不留 v1 读取分支、不写转换器、不提供任何写盘器；v1 的手写库版本常量与
> `libVersion` / `observerVersion` 改由构建戳标识。`PRE1116-T26` 本机部署未执行（`未观察`）。
> 本文只定义观测包与报告机制。它不改插件功能，也不把优化本身排进本期。

## 1. 业主诉求

业主要一套**量化**机制，看我们自己的插件是否在性能上合格，并且要有**自动化**的评估报告。最终交付是**一个 package**，植入现有全部插件，对插件的使用做监控。后续优化只根据这份报告点名，不凭感觉改。

诉求拆开是四条，优先级从高到低：

1. **对 dsh 原生 UI 的影响** —— 用户点的是 composer、侧栏、会话列表时，主线程有没有在跑我们的代码，跑了多少毫秒、被调起多少次。
2. **资源占用** —— 主线程时间、强制布局、常驻定时器 / 观察器 / `requestAnimationFrame` 的数量与活跃状态、`lib/client.js` 体积。不是整进程 RSS。
3. **UI 延迟** —— 我们自己的面板、树、状态从动作开始到画完要多久。
4. **使用** —— 哪条路径被用了多少次。优化顺序是次数 × 耗时，不是单次最慢。

合格的定义：实验室剧本相对已提交基线没有超出第 7 节的预算，并且报告能指出超预算的插件 id 和 span/track 名。运行中的插件不得因为观测失败而卸载或改行为。

## 2. 非目标

- 不接 Harness 的 `session-telemetry` 或 Desktop `product-analytics`。前者传会话日志，后者普通 Web 不采集。两者都回答不了「这一帧卡在谁」。
- 不在浏览器里装完整 OpenTelemetry SDK，也不把结果打到外部 collector。报告只落在本机。
- 不测 `measureUserAgentSpecificMemory`。它要求跨源隔离（COOP/COEP），这个 Web 应用不满足。整页堆只能在实验室做开关对照，不能记到某个插件头上。
- 不用 JS Self-Profiling 做常驻采样。它要文档策略头，只允许实验室按需开，不进植入包的默认路径。
- 不用 Lighthouse / `@push-based/user-flow` 当验收。那是页面加载分，不是「打开文件树之后打字变慢了多少」。
- 不记录按键内容、文件路径、session id、提示词、选择器里的用户文本。交互目标记脱敏桶（第 6.4 节），轨迹里只有次数和毫秒。
- 本阶段不改插件、不自动降级功能、不在超预算时弹 UI。
- 不做第五个 overlay 插件。见第 3.2 节。
- 不在浏览器与宿主之间做请求级配对。宿主 span 行是服务端墙钟附录，与浏览器 span 没有 trace id；报告把两者并列展示，不声明同一次因果。
- 不保留 v1 读取分支、不写 v1→v2 转换器、不做生产双写。
- 不重写计量核心：Event Timing 按 `interactionId` 归并、span 区间并集、窗口归因、`root()` 最深者胜保持原算法。
- 不扩大硬门禁、不新增 release-gate、不改 `RELEASE.md`；新指标先进 audit。
- 不做远端动作：不部署、不连远端、不新增 MCP 工具、专用 agent 路由或推送通道。agent 只读已鉴权的 `GET <prefix>/perf-review/host`、页面 `read()` 或 lab 产物；新 lane 须另行裁决。
- LoAF 脚本归因维持第 3.1 节的否决。
- 本阶段不加新 track kind 与新手写植入（含 [DNT] wasm 终端、[DNMSC] 压缩引擎）；将来只在该插件自己的声明里加键，新指标先进 audit。

## 3. 被否决的方案

### 3.1 用 `sourceURL` 把长帧算到某一个插件

浏览器里的 `lib/client.js` 由 client-modules 拼进 combo 脚本（`/plugins/??<pkg>/client.js,…&rev=`，见 `context/deepseek-harness/packages/client/modules/src/index.ts:272-274` 的 `comboSearch`）。拼接时 `prepareSource` 用 `SOURCE_URL_TRAILER` 去掉每个包末尾的 `//# sourceURL=`（同文件 `:351-352`）。一条 LoAF 脚本的 `sourceURL` 因此经常是**整份 combo**，里面同时出现多个包名。把这条脚本的 `duration` 记到其中一个插件上是错的。

`sourceFunctionName` 在 minify 之后同样不能当功能名。

否决「只靠 PerformanceScriptTiming 分插件」。插件级归因以显式 span 与带名字的 track 为准；combo 上的脚本时间只记入 `nano-combined`，除非这一条 URL 只含一个 nano 包（按需 chunk `/plugins/<pkg>/client.<name>.js?rev=` 与 HMR 单资源 URL 就是这种）。

Resource Timing 同样不能分：combo 是一个资源条目，体积只记到 `nano-combined`。

### 3.2 独立 Cordis 插件

独立插件看不到各包 React 提交、路由函数和 DOM 根，只能看见整页。业主要的是植入。否决。

### 3.3 每个插件各装一个 PerformanceObserver

各插件的 client 都是各自 esbuild `--bundle` 的产物，模块作用域不共享（各包 `scripts/build-client.mjs` 的 `--external` 只有 react、react-dom、`@deepseek-ai/dsh-client-ui-primitives`）。若观察器放在模块单例里，一页会有多份观察器、多份条目。否决。页面上只允许一个观察器，所有权在协议主版本键 `Symbol.for('dsh.perfReview.v2')`。宿主同理：`lib/host.js` 若把助手打进去，会有多份拷贝，所有权在 `Symbol.for('dsh.perfReviewHost.v2')`。

这里使用全局是因为各份 bundle 没有第二个共享堆，不是要做隐藏的「当前会话」。

由此带出的强制项：**不同 bundle 拷贝的构建戳可能不一致**。每个拷贝带自己的 DNPR 源码内容哈希（esbuild define 注入）与声明哈希；先到的拷贝建立单例，后到的 `join` 复用同协议实例。`meta.contributors` 按 `plugin@build` 记录哪些 plugin 加入过、各自构建戳与声明哈希；同协议出现多于一个构建戳记一条 audit 级 finding，不迁移状态。

### 3.4 用进程 RSS / 事件循环延迟当插件指标

`process.memoryUsage()` 和 `monitorEventLoopDelay` 量的是整个 dsh 宿主。可以和「所有插件都未加载」的臂比较，不能写进某个插件的占用。否决作为插件成绩；保留为实验室对照臂的页级/进程级附录。

## 4. 现状事实（实现依赖的依据）

| # | 事实 | 出处 |
|---|---|---|
| F1 | 在册 overlay 插件都是 `dsh.bundle` + `dsh.client`，`engines.dsh` 为 `>=0.2.2-rc.1 <0.3.0`。共享 UI `packages/dsh-nano-ui` 不是插件，浏览器构建把它打进各 `lib/client.js` | 各包 `package.json`，`docs/specs/dsh-nano-ui/README.md` |
| F2 | client 构建是 esbuild `--bundle`，external 只有 react、react-dom 和 `@deepseek-ai/dsh-client-ui-primitives`。`dsh-nano-ui` 会被打进产物 | `dsh-nano-notepad/scripts/build-client.mjs` |
| F3 | explorer / shared-workspace 的宿主构建是 `--packages=external`。开发实例只拷贝 `lib/`。若观察助手留成裸 import，拷走之后解析不到 | `dsh-nano-explorer-extra/scripts/build-client.mjs` |
| F4 | combo 脚本去掉各包末尾 `//# sourceURL=`；combo URL 的段是**包名**（`record.entry.id` = package name），源映射按 section 指回各 `client.js`。页内观察器不去解析 source map | `context/deepseek-harness/packages/client/modules/src/index.ts:197-199,272-274,351-352,490,1101` |
| F5 | LoAF：一帧从开始到开始绘制超过 50 ms 才有条目；脚本执行超过约 5 ms 才有 `PerformanceScriptTiming`。`blockingDuration` 是这段时间里浏览器不能及时响应点击和按键的时长。垃圾回收和扩展脚本没有脚本条目 | [Long Animation Frames](https://w3c.github.io/long-animation-frames/)，[SpeedCurve 说明](https://www.speedcurve.com/blog/guide-long-animation-frames-loaf/) |
| F6 | INP 分输入延迟、处理、呈现。好 ≤ 200 ms，需改进 ≤ 500 ms，差 > 500 ms。一次交互要按时间戳和 LoAF 对齐：交互前没画完的帧、处理事件的帧算进去；呈现之后的下一帧不算。**同一次物理交互会产出多个 `event` 条目，必须按 `interactionId` 归并取最大 `duration`，否则一次按键被拆成 keydown/keypress/input/keyup 四条。** | [web-vitals](https://github.com/GoogleChrome/web-vitals)，[Event Timing 规范](https://w3c.github.io/event-timing/#sec-performance-event-timing)，[MDN `PerformanceEventTiming.interactionId`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming/interactionId) |
| F7 | LoAF 目前是 Chromium。实验室固定 Chrome。没有 LoAF 的浏览器只保留 Event Timing 和 span | F5 |
| F8 | 记事本在 `document` 上以捕获阶段常驻 `keydown` / `keyup`（`⌘E` 然后 `1`），回调开销极小但不是零。这是原生按键路径上故意常驻的 nano 监听，不是唯一常驻监听——panel 挂载后还有 Escape 捕获、`visibilitychange`、`window resize`、textarea 的 `input`/`scroll`、textarea 上的 `ResizeObserver`、`BroadcastChannel` message | `dsh-nano-notepad/src/client/index.js:117-122`，`dsh-nano-notepad/src/client/panel.js:707-710,2509-2532,2679-2710` |
| F9 | 模型选择器占据 `conversation.input.model`，`.nms-trigger` 常驻 composer。`document` 的 pointerdown / keydown 只在面板 `open` 时挂上；`resize`/`scroll` 的 `place` 监听同样只在 open 时。面板 `createPortal` 到 `document.body`，不在 trigger 的 DOM 里。拖拽 effort 时 handle 上临时挂 `pointermove`/`pointerup`/`pointercancel` | `dsh-nano-model-selector/src/client/index.jsx:20`，`dsh-nano-model-selector/src/client/ModelSelector.jsx:223-245,319-345,463-489,583-598` |
| F10 | explorer 接管 `files` 标签页，`keepMounted` 使同一工作区可有多份隐藏 pane，各自持 `data-nxe` 根。`BranchDrawer` / `CommitDrawer` 在组件顶部调用 `usePanelConfinedLayer(open)`；P4（D2）之前传入恒真，导致**即使 `open=false` 也各装一个常驻 `document.body` `childList+subtree` 到达侦测**（`card-wake` live=2 / callbacks≈16–30，α 报告测到却无判据）。D2 后 `active=open`，闭合 drawer 不再挂 observer；inner `observer`、resize 与 `card-follow` rAF 仍只在卡片存活期存在。每个 pane 常驻一个 15 s `setInterval`（`POLL_GIT_MS`），tick 里检查 `closest('[hidden],[aria-hidden="true"]')` 后早退，计时器本身按**挂载** pane 计数（rev4 更正：不是「可见」pane 数） | `dsh-nano-explorer-extra/src/client/index.js:94`，`dialogs.js`，`drawers.js:135,279`，`body.js:22,243-251,783-791` |
| F11 | shared-workspace 有**两个** `document.body` 常驻观察器：(a) `SidebarGraft` 里的 MutationObserver，`childList+subtree+attributes`，回调里 `graftHost()` 做 DOM 查询、`sidebarIsWide()` 做 `getBoundingClientRect()` 强制布局读；(b) `index.js` 的 `localList` MutationObserver，`childList+subtree`，回调 `separateFromLocal()` 对整页 `querySelectorAll` 扫 `data-row-key` 行并写 `hidden`。(a)(b) 都会被对方和原生 UI 的 DOM 写触发。另有 hold 心跳 `setInterval` 25 s（claim 后才启动）、宿主侧 `startBackgroundSync` `setInterval` 30 s | `dsh-nano-shared-workspace/src/client/graft.js:132-150`，`dsh-nano-shared-workspace/src/client/index.js:405-407`，`dsh-nano-shared-workspace/src/client/index.js:141-150`，`dsh-nano-shared-workspace/src/host/routes.js:500-525` |
| F12 | 记事本 IndexedDB 草稿在 `saveDelayMs` 防抖后写库；自动版本按 `commitIntervalSec` 由 `setInterval` 触发（`armCommit` 在 `openDatabase()` 完成后挂上，与面板开关无关）；`document` 上常驻 `ctaWatch` MutationObserver（`childList+subtree`），回调 `attachNotepadCtas` 对新加入的节点做 `querySelectorAll` 扫描 | `dsh-nano-notepad/src/client/panel.js:1606-1611,2897-2906`，`dsh-nano-notepad/src/client/db.js` |
| F13 | 各包 `lib/client.js` 体积（2026-11-10 工作树量到；shared-workspace 已退役）：`dsh-nano-notepad` ~176 KB、`dsh-nano-model-selector` ~111 KB、`dsh-nano-explorer-extra` ~118 KB、`dsh-nano-shared-workspace` ~56 KB。宿主侧：`lib/host.js` explorer ~43 KB、shared-workspace ~55 KB；`index.js`/`lib/host-media.js` 不打包 | `ls -la` 各包 `lib/` |
| F14 | explorer 宿主路由：`/list`、`/status`、`/ignored` 有 memo（`/status` 3 s、`/ignored` 3 s、`only=stats` 45 s），`/read`、`/commit`、`/pull`、`/checkout`、create/rename/move/delete 没有。共享工作区宿主路由有 `sync-tick` 30 s、`settings` 和各写路径。model-selector `/catalog` 有 15 s TTL | `dsh-nano-explorer-extra/src/host/routes.js:139-165`，`dsh-nano-model-selector/index.js:22` |
| F15 | 原生按键路径上，notepad 的捕获 `keydown`/`keyup` 先跑；每次按键至少两次回调。`callbackMs` 累计是把「便宜」变成数字的唯一办法；不加它，只靠 callbacks 计数，零成本监听和大回调成本在报告上不可区分 | `dsh-nano-notepad/src/client/index.js:98-123` |

## 5. 指标合同

一个加载了这个包的插件向页面单例 `join`（§6.3）。报告输出 JSON（机器读）和 Markdown（人读）。metric key 全部机器稳定：报告的结构在聚合层 `aggregate.js` 测，Markdown 从同一个 JSON 渲染，不重算。

### 5.1 一个交互窗口里写什么

一次交互（pointerdown / pointerup / click / keydown / input）结束后、下一次呈现前后，聚合层对这一窗口产出：

| 键 | 值 | 归属 |
|---|---|---|
| `interactionId` | Event Timing 的 `interactionId`；同一 id 的多条 `event` 条目归并为一个交互，取最大 `duration` | 页级 |
| `durationMs` | 归并后交互的 `duration` | 页级 |
| `target` | 脱敏后的目标桶 | 页级 |
| `native` | `root()` 命中的插件 id，或 `"native"` | 交互归属 |
| `samples.<pluginId>` | 该插件在这个窗口内的 span 数与带名字 track 回调数；`callbackMs` 累计同一窗口里该插件 track 回调的毫秒 | 按 plugin id 分 |
| `spanMs.<pluginId>` | 窗口内该插件 span 的毫秒合计 | 按 plugin id 分 |

**页级 `nativeInpP75` 只落在 `page`，不复制到插件行。** 页面 INP 是全页指标，把它抄到每个插件行会被读成「这个插件的 INP」。插件行只写 `own.inpP75`（它自己的交互）与 `samples`/`spanMs`/`trackMs`（它在原生窗口里出现的证据）。

### 5.2 页面级

- `nativeInpP75` — 页级 INP p75；`nativeInpCount` — 参与计算的交互数；`nativeInpDurationThreshold` — Event Timing 上报的最小 duration（固定 16 ms）。
- `inputDelayP95` / `processingP95` / `presentationP95` — **rev4.1**：把 `PerformanceEventTiming.duration` 拆成 `processingStart−startTime`（主线程忙/排队）、`processingEnd−processingStart`（事件处理器）、`duration−(processingEnd−startTime)`（等下一次绘制）三段的 p95。`collector` 按 `interactionId` 归并时保留**与 max duration 同一条 entry** 的三分量。
- **rev4.1 读数规则**：`nativeInpP75` 含 presentation 段，是**页级 audit 项**——记录并在 Markdown 列出，但不单独否决验收。理由见 §7 与 `performance-alpha.md` §12：lab 用 CDP 合成按键，实测 inputDelay≤0.35 ms / processing≤0.83 ms / longtask≈0，耗时全在 presentation；不加载任何 nano 插件的日常实例反而更慢。插件预算以 `inputDelayP95` / `processingP95` 与 `native.spanMsP95` / `native.trackMsP95` 为准。
- `loafCount`、`blockingMs`、`forcedLayoutMs` — 长帧总量，按 `sourceURL` 是否唯一含一个 nano 包名拆「可归因」与「不可归因」两栏。
- `resources.nanoClientJsBytes`、`resources.totalJsBytes` — 初始载入时各资源 `encodedBodySize` 合计（前者为全部 nano client，后者为本页全部 JS 作分母）；`nanoCombined.clientJsBytes` 是全部 nano client 的唯一落点，`comboResources` 是 combo 资源条目数。**用 `encodedBodySize`，不用 `transferSize`**：后者随缓存命中接近 0，热加载时基线不稳。
- `counts` — 全局 `count()` 汇总，键 `name`，值 `{window, total}`。这是唯一跨插件汇总的使用指标。

### 5.3 插件级

- `own.inpP75` / `own.inpCount` — `root()` 命中本插件的交互分位与样本数。`own.samples` 与 `own.spanMs` 在 `native` 归属的窗口里没有意义，不重复写。
- `native.spanMsP95` — 在 `native` 归属的窗口里，本插件 span 毫秒合计的 p95。
- `native.trackMsP95` — 在 `native` 归属的窗口里，本插件 track 回调毫秒合计的 p95（`track` 回调用 `performance.now()` 包裹累计，只出毫秒不打 mark）。
- `native.samples` — 窗口里出现过的 `{spanCount, callbackCount}` 合计。
- `spans.<name>` — `{n, windowN, p50, p95, maxMs, basis}`；`p50`/`p95` 取窗口样本，异步 fn 记到 settle。
- `tracks.<name>` — 常驻轨道 `{kind, callbacks, live, callbackMs, totalCallbacks, totalCallbackMs}`：
  - `kind ∈ {listener, mutation, resize, raf, interval, broadcast}`；`broadcast` 是 `BroadcastChannel`/`storage` message。
  - `live` 是「现在还活着几个」，`callbacks` 是窗口内被调次数，`callbackMs` 是这些回调累计毫秒；`total*` 是累计值。
  - **键是名字，不是 kind**：同一插件可以有多条同 kind 轨道（notepad 的 `shortcut-key` 与 `escape-key`、explorer 的 `card-wake` 与 `git-poll`）。
- `usage.<name>` — 业务计数 `{window, total}`（面板打开、文件展开、区块打开），与 `count()` 同源但按插件分键。
- `plugins.<id>.host.<name>` — 宿主读取视图里的 span `{n, p50, p95, errors}`，只在宿主采集开启且有读取来源时有值；不在浏览器与宿主之间做请求级配对。
- `hand.version` — 本插件构建期注入的版本；`meta.contributors` 另记每个 `plugin@build` 的构建戳与声明哈希。

### 5.4 页级 `nano-combined`

不能归因的合并项：所有含多于一个 nano 包名的脚本毫秒、长帧 `blockingDuration` 中不能拆的部分、`encodedBodySize` 合计、combo 资源条目数。这是**诚实的不可归因项**，不写进任何插件行，但留在报告里让「我们的总成本」可见。

### 5.5 结构完整性

不随场景变化、坏了就代表测量本身出了问题的计数：`rootErrors`、`badNames`、`overflowSpans`、`overflowUsage`、`observerErrors`、`observersMissing`、`legacyCopies`、`badShape`、`missingBindingId`、`unmappedKey`、`oversize`，以及协议审计数组 `audits`。硬计数任一非 0 都先修测量，再谈插件预算；`legacyCopies` / `oversize` / `unmappedKey` 为 audit。

## 6. 实现形状

### 6.1 包

`packages/dsh-performance-review`：**构建期**库（`private: true`，`file:` 依赖或源码相对引用，不发布、不安装），不进 `dsh.bundle`，不注册插件，无 `dsh.client`。导出 `./client`、`./host`、`./aggregate`、`./markdown`、`./state`、`./diagnose`、`./declaration`：

- `src/client.js` → 打进各插件 `lib/client.js`：页面单例挂在协议主版本键 `Symbol.for('dsh.perfReview.v2')`。
- `src/host.js` → 打进各插件宿主产物：宿主单例挂在 `Symbol.for('dsh.perfReviewHost.v2')`，并导出只读 handler `handleHostRead`。**宿主调用点只用单例入口，不裸 import 包名**——`--packages=external` 会把裸名留到产物里，开发实例只拷 `lib/` 时解析不到。

`aggregate.js` 是纯函数：吃浏览器条目 + 宿主视图，出报告 JSON。`diagnose.js` / `declaration.js` 是 Node 侧纯函数，浏览器产物不得引用。本包没有写盘器：不写任何宿主快照文件，没有定时写入、`beforeExit` 或 `flush`。

### 6.2 开关与传输

- 浏览器：`localStorage['dsh-perf-review'] === '1'` 或 URL `?perf-review=1`。**判定时机**：第一个 `join()` 调用时一次读定，此后不查（不能运行时切开关再期待轨道凭空出现）。lab 用 `addInitScript` 在导航前注入 localStorage，不依赖 URL 改写（避免与已有查询参数冲突）。
- 宿主：`DSH_PERF_REVIEW=1`，在第一次 `hostSpan` / `snapshot` 时惰性读定。采集开关只认这个运维入口，任何插件不得替宿主进程打开采集。
- 关闭时所有 `join`/`span`/`track`/`count` 是恒等包装——直接调原函数，**不打 mark，不查时间**。
- **宿主读取面**：`GET <prefix>/perf-review/host` 只读，只接受 `since`；`mode` 与任何其他参数返回 400。带 `since` 返回 `seq > since` 的行（`basis = window`），不带返回累计视图（`basis = cumulative`），两者都返回 `next`（`<epoch>.<seq>`）。宿主没有切窗动词，读取不删除样本。
- **页面摄取**：各插件 `join` 时登记自己的读取入口（`hostRoute`）。页面每 5 秒轮询一次，只在采集开启且页面可见时进行；同一时刻只轮询一个健康入口，连续失败后切到下一个。轮询结果缓存在单例里，`read({ host })` 显式传入或读缓存。
- 不拥有宿主读取路由的包不挂该路由；页面上没有任何宿主入口时，报告 `meta.host.source = null` 并输出 `note.host-source-absent`。
- **构建戳**：各插件构建时经 esbuild define 注入 DNPR 源码内容哈希（`__DNPR_BUILD__`）作为构建戳，同时注入声明哈希；`contributors` 按 `plugin@build` 去重。同协议出现多于一个构建戳记一条 audit 级 finding，不迁移状态。

### 6.3 API

页面单例（`client.js`）：

- `join(pluginId, {build})` — 还可带 `version?`、`root?`、`react?`、`buckets?`、`decl?`、`hostRoute?`；返回 `{ span, track, count, profiler }`。`build` 是本拷贝构建戳；`buckets` 来自声明（交互目标桶），`decl` 是声明哈希，`hostRoute` 是本插件的读取入口。`pluginId` 用包内 `OWN_ID` 常量，不重复传字符串。
- `read(meta?)` — 读无副作用：不清窗口、不动宿主 `seq`、不结算「现在」以外的交互。`meta.host` 显式传入宿主视图；缺省用最近一次轮询缓存。返回 §6.5 报告。
- `cutWindow()` — 清空页面窗口累加器（interactions、span/track 窗口、usage 窗口列、contract 窗口计数），保留累计 `n` / reservoir / totals 与初始资源字节。只允许 lab 在场景边界调用；插件源码出现即测试失败。
- `observe(event)` — 消费四门面共用的观测事件合同；坏形状计 `badShape`，缺 `id` 计 `missingBindingId`；不按 URL 建键。
- v1 的读动词、复位动词、配置动词与宿主排空动词全部删除、不留别名：`report`、`reset`、`resetCounters`、`configure`、`setHostSnapshotProvider`、`takeWindow`、`setEnabled`。

`span(name, fn)` — 计时 `fn`。`fn` 返回 Promise 时计时到 settle（`finally` 里取数），reject 也算时长。名字进 `nano:<pluginId>:<name>` 的 `performance.measure`。

`track(kind, name, opts)` — 注册常驻轨道。kind 见 5.3；`listener` 给 `{target, type, listener, options}`，`mutation`/`resize` 给 `{observer}`，`interval` 给 `{ms}`，`raf` 给 `{callback}`，`broadcast` 给 `{channel}`。**只在 `enabled` 时挂**；挂载时 `live++`，卸载 `live--`，回调次数与 `callbackMs` 进 `tracks.<name>`。

`count(name, n = 1)` — `usage.<name>` += n。

`profiler(Component)` — 返回 `<React.Profiler id="nano:<pluginId>:root" onRender>` 包过的组件。

`root()` 是 `join` 的必需 impl：返回本插件「会被用户点到的最外层元素」或 `null`。**禁止在 `root()` 里做布局读**（`getBoundingClientRect`/`offsetWidth`/`getComputedStyle`）；用 `isConnected`、`el.hidden`、`closest('[hidden],[aria-hidden="true"]')`、`offsetParent` 做可见性。多 pane 场景：返回**第一个** isConnected 且未 hidden/aria-hidden 的宿主根元素。
> rev4 更正：真实 shell DOM **没有** `data-sidebar-right-pane`，用的是 `data-dockkit-*` 族加 `hidden`/`aria-hidden`。用 `firstVisibleRoot(document.querySelectorAll('[data-nxe]'))` 配合 `isUsableRoot`（hidden/aria-hidden 祖先判定、零布局读）等效达成；不要照抄旧的 `closest('[data-sidebar-right-pane]')`。

宿主单例（`host.js`）：

- `hostJoin(pluginId, { build, version? })` — 返回 `{ hostSpan, count, snapshot, read }`。
- `read({ since })` — 只读全进程视图。`since` 为 `{epoch, seq}` 或 `<epoch>.<seq>`；不带 `since` 返回累计视图；`epoch` 不符返回累计视图并标 `truncated: ['epoch']`；游标格式非法或出现 `mode` 等额外参数返回 400。宿主没有切窗动词，样本不因读取删除。
- `observe(event)` — 宿主侧合同面事件入口，语义同页面 `observe(event)`。

### 6.4 归属与脱敏

- `root()` 归属规则：交互 `target` 自下而上找，第一个返回非 null 且 `contains(target)` 的插件 root 命中；多个插件 root 都 contains（graft 内含另一个插件克隆的 DOM）时，**取 `contains` 最深/最具体的那个**（`target.closest` 后比较 `root === closestRoot`），再退化为先注册先赢。归不到的记 `"native"`。
- `root()` 抛错：本次按 `native` 记，`rootErrors++`。
- `target` 脱敏桶：原生桶 `composer-textarea` / `sidebar-row` / `other` 由共享包保留；插件桶（`files-row` / `model-trigger` / `notepad-panel` 等）由各插件声明 `buckets` 在 `join` 时登记。只取 `data-*` 属性与 tagName 归类，不落 className / id / 文本。
- `native.samples` 判定：窗口 = `[interactionStart - 1, interactionStart + duration + 8]`；插件的 span 或 track 回调时间区间与窗口重叠即计入。异步 span 的 `settle` 在窗口外结束则记 `spanAfterWindow`（`notes` 中带稳定 id 的说明），不强行划入。
- 交互保留：窗口内全部交互，按到达顺序入数组；超 50 条按时间丢**最旧**，不按 duration 排序截断（避免 p75 偏高）。

### 6.5 报告 schema（`dnpr.report/2`）

顶层恰好这些键：`schema`、`meta`、`page`、`plugins`、`evidence`、`structure`、`notes`。

```jsonc
{
  "schema": "dnpr.report/2",
  "meta": {
    "protocol": 2,
    "generatedAt": "ISO8601",
    "contributors": [{ "plugin": "nano-notepad", "build": "<build-stamp>", "decl": "<declaration-hash>" }],
    "window": { "startedAt": "ISO8601", "ms": 0 },
    "host": { "source": "snapshot", "epoch": "e1", "from": "<host window start>", "to": "<host window end>", "truncated": [] }
  },
  "page": {
    "nativeInpP75": null,          // 样本不足时 null，不当作 0（页级 audit）
    "nativeInpCount": 0,
    "nativeInpDurationThreshold": 16,
    "inputDelayP95": null,         // 主线程忙/排队
    "processingP95": null,         // 事件处理器
    "presentationP95": null,       // 等下一次绘制（不计入插件预算）
    "loafCount": 0,
    "blockingMs": 0,
    "forcedLayoutMs": 0,
    "nanoCombined": { "scriptMs": 0, "loafCount": 0, "blockingMs": 0, "clientJsBytes": 0, "comboResources": 0 },
    "resources": { "nanoClientJsBytes": 0, "totalJsBytes": 0 },
    "counts": {},
    "scenario": "idle-10s",
    "arm": "on",
    "chromeMajor": 143,
    "contributors": [],
    "enabled": true,
    "loafSupported": true,
    "evidence": { "interactions": [], "frames": [], "hostErrors": [] },
    "host": { "source": null, "epoch": null, "from": null, "to": null, "truncated": [], "sinceStart": null, "writtenAt": null, "enabled": null }
  },
  "plugins": {
    "nano-notepad": {
      "hand": {
        "spans": { "render": { "n": 0, "windowN": 0, "p50": null, "p95": null, "maxMs": null, "basis": "window" } },
        "tracks": { "shortcut-key": { "kind": "listener", "callbacks": 0, "live": 0, "callbackMs": 0, "totalCallbacks": 0, "totalCallbackMs": 0 } },
        "usage": { "panel-open": { "window": 0, "total": 0 } },
        "own": { "inpP75": null, "inpCount": 0 },
        "native": { "spanMsP95": null, "trackMsP95": null, "samples": { "spans": 0, "callbacks": 0 } },
        "profiler": { "commits": 0, "commitP95": null },
        "scriptMs": 0,
        "version": "0.1.1"
      },
      "contract": {
        "dnn.save": { "n": 0, "windowN": 0, "basis": "window", "outcomes": { "ok": 0 }, "status": { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 } }
      },
      "host": { "git-status": { "n": 0, "p50": null, "p95": null, "errors": 0, "basis": "cumulative" } }
    }
  },
  "evidence": { "interactions": [], "frames": [], "hostErrors": [] },
  "structure": {
    "rootErrors": 0, "badNames": 0, "overflowSpans": 0, "overflowUsage": 0,
    "observerErrors": 0, "observersMissing": 0,
    "legacyCopies": 0, "badShape": 0, "missingBindingId": 0, "unmappedKey": 0, "oversize": 0,
    "audits": []
  },
  "notes": [{ "id": "host-source-absent", "text": "no host read source" }]
}
```

- 分位数行带 `basis`（`window` / `cumulative`）与样本数（`n` / `windowN`）；合同面行按观测事件闭集计 `outcomes`，并按状态类 `2xx` / `3xx` / `4xx` / `5xx` 计数。
- `evidence` 固定上限：交互 5 条、帧 5 条、宿主错误 20 条；顶层 `evidence` 与 `page.evidence` 使用同一组上限。上限由测试锁定，不随报告大小漂移。
- 超过 256 KB 时先清空证据数组并计 `structure.oversize + 1`，其余分区不变。
- `notes` 仅在相关时出现，每条带稳定 id（如 `span-after-window`、`native-inp-small-sample`、`host-source-absent`）；无条件说明进 DNPR 说明词表，不复制进每份报告。
- `meta.host` 与 `page.host` 同源；无读取入口时两处 `source` 均为 `null`，并有 `host-source-absent` 说明。`truncated` 可含 `'epoch'` 或 `{pluginId, name, lost}` 对象。

### 6.6 实验室剧本

`lab/run.mjs`（真实 Chromium 驱动，本机为 ego-browser；Playwright 为等价替代，**不 CPU 节流**；`--arm on` 默认）跑完一个场景写一份 `lab/out/<stamp>-<scenario>.md|.json`。场景列表 = 页级场景（固定在 lab）加各插件声明 `scenarios[{id, driver}]` 生成的插件场景；lab 源码不写死插件名或轨道名。

| 场景 | 步骤 | 主要读数 |
|---|---|---|
| `idle-10s` | 打开一个已有会话的页面，闲置 10 s | 结构计数全 0；声明中 idle 场景的 live / callbacks 预算 |
| `composer-type` | composer 里以稳定节奏输入 ~120 字符（`page.keyboard.type`，每键间隔 ~80 ms） | `nativeInpP75`（页级 audit）+ `inputDelayP95`/`processingP95`（硬红线）+ `presentationP95`（附录）；各插件 `native.spanMsP95`/`trackMsP95` 与声明预算 |
| `observer-purity` | `--arm purity`：最小页面只挂 standalone 观察器，空跑 2 s | LoAF 条目数必须为 0；`structure.observerErrors` === 0 |

> rev4 实现说明：本机没有安装 Playwright，故 `lab/run.mjs` 用 `ego-browser nodejs` 驱动同一个 Chromium；浏览器侧代码仍走 `page.evaluate()`，不引入 Playwright API。`--arm off` 只是「采集关闭臂」；真正的「不含观测包」对照臂由 `--measure-footprint` 用 esbuild `--alias` 构建无 DNPR 的产物并量出字节差，`--arm purity` 另验观察器自身 2 s 不产 LoAF。差异记在 `lab/README.md`。

插件场景的步骤与读数由各插件声明引用的 `lab/drivers/*.mjs` 定义，本 spec 不复制逐插件剧本。场景开始时页面 `cutWindow()` 并记下宿主 `next`；结束时用 `?since=<起点>` 读一个健康入口，把该视图传给 `read({ host })`。读不是排空，两个读者用不同 `since` 互不影响。场景固定器：lab 需要一个已登录会话与一个确定的工作目录（`files-expand` 需要目录数 ≥ 3、规模稳定的仓库；建议指向本仓库自身）。`lab/config.local.json`（gitignored）写 `{ baseUrl, spaceName, pageLabel, workspaceDir }`；不要把 token 或 cookie 写进 spec 或 lab 代码库。

### 6.7 植入与声明

手写植入的键名（span/track/usage 名与 track kind）、交互目标桶、场景归属、预算行与合同面引用都由每个插件自己的 `src/perf/declaration.json` 作者（`dnpr.declaration/1`：`keys{spans,tracks,usage,hostSpans}`、`buckets[{attr,bucket}]`、`contract[id…]`、`scenarios[{id,driver}]`、`budgets`）。运行时只带键名常量、目标桶与声明哈希（esbuild define，进 `contributors.decl`）；`budgets`、`scenarios`、`contract` 不进运行时。构建与 lab 先用 DNPR 纯函数 `validateDeclaration()` 校验，失败即构建失败。

三方对账由 DNPR `test-helpers` 的插件中立助手完成：植入代码引用的键名常量集合必须等于声明键集合；`contract` 中每个 id 必须存在于本插件的绑定表或 MCP schema。任何一方不一致都让测试失败。每包声明是唯一作者源，spec 不再维护逐插件 span/track 清单。

手写宿主 span 判定规则（`T-O-PRE1116-12.1`）：包住单一工作模式路由 handler 主体的（只差正文或会话解析）与合同面行是同一件事，硬切退役、不双写；多模式中的一种、多 action 中的一个、或不在路由里的后台/生命周期，是子阶段，保留并写入声明 `keys.hostSpans`。退役的 5 个名字不得出现在 `keys.hostSpans`，它们的合同面 id 进 `contract`。新增 span 按此判断，不再开 QnA。

[DNK] 无合同面，`contract` 为空数组；声明只含页面 span/track/usage 与 `kite-warmup`。[DNT]、[DNLS] 只有合同面，`keys` 为空。

### 6.8 测试与验证

v2 测试按以下组覆盖（文件在 `packages/dsh-performance-review/test/`，lab 组另有 `lab.test.mjs`）：

- **协议隔离与构建戳**（`protocol.test.mjs`）：旧字符串键上的对象在 v2 调用后字段不变，只计 `structure.legacyCopies`；同协议先到者提供实现、后到者复用，第二构建戳只产生一条 `build-stamp` audit；`sourceStamp` 同文本同值、单字节变化必变；`contributors` 按 `plugin@build` 去重。
- **读无副作用**（`client.test.mjs`）：连续两次 `read()` 深相等；读不清窗口、不动宿主 `seq`；顶层键恰好 `schema/meta/page/plugins/evidence/structure/notes`。
- **`cutWindow()`**（`client.test.mjs`、`validity.test.mjs`）：窗口列、track callbacks、usage window、contract window 清零；累计 `n`、reservoir、usage total、track totals 与初始资源字节保留；插件源码出现 `cutWindow` 即失败。
- **宿主游标**（`host.test.mjs`）：`{epoch, seq}` 与 `<epoch>.<seq>` 都能解析；`seq > since` 的行才返回；读不删除样本；非法游标与 `mode` 返回 400 且无副作用；`epoch` 不符返回 200、累计视图与 `truncated: ['epoch']`；缓冲丢样本给丢失条数。
- **证据上限与 256 KB**（`protocol.test.mjs`）：交互 5 / 帧 5 / 宿主错误 20；超 256 KB 先裁证据并计 `structure.oversize`。
- **`diagnose()` 中立性**（`diagnose.test.mjs`）：只内置页级规则与 `native.*` 红线，不出现插件名或轨道名；`diagnose` 不在 `client`/`host` 入口；声明预算能产出插件级 finding；`build-stamp` 与截断为 audit。
- **声明校验**（`declarations.test.mjs`）：7 份 `src/perf/declaration.json` 通过 `validateDeclaration()`；[DNMSC] 没有声明；运行时切片只含键名、目标桶与声明哈希，不含 `budgets`/`scenarios`/`contract`。
- **三方对账**（`diagnose.test.mjs`）：`reconcileDeclaration()` 同时抓「声明有、植入无」「植入有、声明无」「`contract` id 不在绑定表或 MCP schema」三个方向；[DNN] 的动态名映射也覆盖。
- **lab 声明驱动**（`lab.test.mjs`）：页级场景 `idle-10s`/`composer-type`/`observer-purity` 留在 `PAGE_SCENARIOS`；插件场景与 driver 从声明读取；lab 源码不出现插件名或轨道名；lab 读者只用 `read`/`cutWindow`，不用已删除的 v1 读动词。
- **计量回归**（`aggregate.test.mjs`、`validity.test.mjs`）：`interactionId` 归并、`root()` 最深者胜、`native` vs `own` 分桶、combo 不拆分、`encodedBodySize` 累加、嵌套 span 取区间并集、异步 span reject 仍记时长、60 s 事件剪枝与 4096 事件环不丢已结算样本。
- lab 退出码：`0` 全过；`1` 预算失败（Markdown 点名 pluginId + span/track 名）；`2` 页面/报告/基线指纹不一致（protocol、schema、chromeMajor、dshVersion、构建戳、插件 version）。

## 7. 预算

「基线」指 `lab/baseline/baseline.json` 下最近一次 `--arm on` 的报告；第一次 `--arm on` 只写基线，不判失败。版本指纹不一致先退出码 2，不拿旧基线判。

判定单一真源是 DNPR 包内的纯函数 `diagnose(report, { declarations, baseline })`：`lab/budgets.mjs` 的 `evaluate` 只保留退出码、I/O 与 Markdown 输出，不内置任何插件名或轨道名。

**声明规则词汇**（`dnpr.declaration/1`）：

- 规则闭集：`max | min | eq | relBaseline{factor,floor,initial}`，可带可选 `minSamples`；`gate ∈ hard | audit`。规则词汇归 DNPR，扩展走 DNPR 变更，不在 lab 临时写。
- 每条预算行由插件声明作者：`{ id, scenario, subject, rule, gate, minSamples? }`。`subject` 指向报告路径（如 `hand.spans.<name>.p95`、`hand.tracks.<name>.callbacks`、`native.spanMsP95`）。
- 按轨道名写死的规则全部迁入对应插件的 `src/perf/declaration.json`；本 spec 不维护逐插件预算表。旧 `evaluate` 的阈值与 gate 级别原样迁移，验收口径是同一批基线结论一致。

**内置的页级规则与通用红线**（`diagnose()`，插件中立）：

- `structure.*` 硬计数（`rootErrors`、`badNames`、`overflowSpans`、`overflowUsage`、`observerErrors`、`observersMissing`、`badShape`、`missingBindingId`）必须为 0；`legacyCopies`、`oversize`、`unmappedKey` 为 audit。
- `page.inputDelayP95`、`page.processingP95` ≤ 50 ms，≥ 8 个交互样本才生效；`page.nativeInpP75` 为页级 audit。
- `native.spanMsP95`、`native.trackMsP95` ≤ 50 ms，≥ 8 个样本才生效，按插件行逐条判断。
- `page.nanoCombined.clientJsBytes` ≤ baseline × 1.1（`encodedBodySize`，硬门禁）。
- `--arm purity` 的空跑 LoAF 必须为 0；禁用臂必须是零测量行。
- 注入真回归（`--inject-delay` / `--inject-failure`）仍必须使 lab 退出码 1 并点名 subject。

预算失败不改插件行为；lab 退出码 1 时报告必须点名 pluginId 与 span/track 名。`--repeats N` 取各标量中位数判定，原始每轮读数写进 `repeatRuns`；基线用 `--repeats 3 --write-baseline` 取中位数，不用单次读数。

## 8. 实现顺序

实现按 `PRE-1116-action-plan.md` `11.1` 的 W1→W2→W3：W1 只落四门面可选 `observe`（无人注入，行为不变）；W2 落账本 id 与绑定表；W3 一次硬切 v2（协议键、构建戳、报告、声明、只读宿主路由、手写 span 处置、lab 声明驱动）。本 spec 只定义 v2 机制，不另立阶段计划。

## 9. 风险

| 风险 | 缓解 |
|---|---|
| 观察器漏报插件归属 | `native.samples` 为 0 不代表无成本；补看 `nanoCombined` 与 `tracks` |
| span/track 名漂移 | `badNames` 计数 + 声明校验 + 三方对账；名字以声明为唯一作者源 |
| 多拷贝构建戳倾斜 | `contributors` 按 `plugin@build` 记录；同协议多戳记 `build-stamp` audit，不迁移状态 |
| `root()` 把 composer 算进自己的 UI | 插件 root 永不返回 composer textarea；`root()` 禁布局读 + 最深 contains 优先；用假 DOM 测 |
| 隐藏 pane 重复 join | 同一 pluginId 合并；`root()` 只返回可见 pane |
| 基线因换浏览器/插件版本作废 | 指纹记 protocol、schema、chromeMajor、dshVersion、各插件构建戳与 version；不一致退出码 2 |
| 日常实例被 localStorage 打开后忘关 | 报告不上传；没有写盘器；浏览器侧无远程出口 |
| 回归门槛写进插件启动 | 禁止；退出码只属于 `lab/run.mjs` |
| MutationObserver 互相触发（graft/dedupe 写 DOM → 又触发对方） | `callbackMs` 与 callbacks 都进报告，能区分「被叫起很多次」和「每次都很贵」 |
| Event Timing 上报阈值吞掉快交互 | `nativeInpDurationThreshold` 写进报告；样本数 0 时显式说明而非当 0 |
| `track` 给 observer 实例做包装时 disconnect 时机漂移 | `track` 包装 `disconnect()` 与观察器本身的 dispose；卸载后 `live` 必须回 0，测试锁死 |

## 10. 验收

- 各接入插件的运行时产物里都打进观察包，且默认开关关闭时，现有功能路径与植入前一致。
- 打开开关后，页级 3 个场景与各插件声明生成的场景都能在开发实例上跑完，并各写一份 Markdown + JSON。
- JSON 顶层恰好 `schema` / `meta` / `page` / `plugins` / `evidence` / `structure` / `notes` 七个键，`schema` 为 `dnpr.report/2`；每个已加载插件都有 `hand` / `contract` / `host` 行，没植入的插件不出现空行冒充。
- `composer-type` 的报告能分开「页级原生 INP」和「某插件 span/track 落在这些交互里的毫秒与次数」。
- `idle-10s` 的 live / callbacks 红线由各插件声明里的预算行判定。
- combo 场景下，报告不会把同一段 `scriptMs` 加进两个插件；`nanoCombined.clientJsBytes` 是全部 nano client 的唯一落点。
- `observer-purity` 空跑 2 s 无 LoAF 条目。
- 相对第一份基线的第二次运行，第 7 节里有基线的检查通过；protocol / schema / 构建戳 / 插件 version 不一致时退出码 2。
- 任一预算失败时，Markdown 点名 plugin id 与 span/track 名，并且不修改插件行为。
