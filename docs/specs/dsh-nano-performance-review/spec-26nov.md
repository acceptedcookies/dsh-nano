# nano 插件性能观测（dsh-performance-review）

> 规格 rev4。源于 2026-11-10 与业主的讨论。rev1 之后按 `file:line` 复核过四个插件源码与
> client-modules 打包实现，纠正了事实与度量合同（rev2）；随后按业主要求把包名定为
> `packages/dsh-performance-review`，并把 P2 首个植入对象定为 `dsh-nano-explorer-extra`（rev3）。
> rev4 按 `docs/code-review/26-nov/performance-alpha.md` §10 独立评审与 A 闸落地结果修订：
> 修正 root 锚名、补 `card-wake` 预算行、`git-poll` live 语义、宿主快照送达路径、
> `libVersion` 显式传递约定、缺失的 P1 单测、以及 `observersMissing` 结构计数。
> rev4.1 按业主裁决（§12 方案 A / L0+L1）修订：`nativeInpP75` 降为页级 audit，
> 新增 `inputDelayP95` / `processingP95` 硬红线与报告三分量，`native.*` 升为插件主判据。
> 本文只定义观测包与报告。它不改四个插件的功能，也不把优化本身排进本期。

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
- 不在浏览器里装完整 OpenTelemetry SDK，也不把结果打到外部 collector。v1 报告只落在本机。
- 不测 `measureUserAgentSpecificMemory`。它要求跨源隔离（COOP/COEP），这个 Web 应用不满足。整页堆只能在实验室做开关对照，不能记到某个插件头上。
- 不用 JS Self-Profiling 做常驻采样。它要文档策略头，只允许实验室按需开，不进植入包的默认路径。
- 不用 Lighthouse / `@push-based/user-flow` 当验收。那是页面加载分，不是「打开文件树之后打字变慢了多少」。
- 不记录按键内容、文件路径、session id、提示词、选择器里的用户文本。交互目标记脱敏桶（第 6.4 节），轨迹里只有次数和毫秒。
- 不在 v1 自动改插件、自动降级功能、或在超预算时弹 UI。
- 不做第五个 overlay 插件。见第 3.2 节。
- 不在浏览器与宿主之间做请求级配对。`hostSpan` 是服务端墙钟附录，与浏览器 span 没有 trace id；报告把两者并列展示，不声明同一次因果。

## 3. 被否决的方案

### 3.1 用 `sourceURL` 把长帧算到某一个插件

浏览器里的 `lib/client.js` 由 client-modules 拼进 combo 脚本（`/plugins/??<pkg>/client.js,…&rev=`，见 `context/deepseek-harness/packages/client/modules/src/index.ts:272-274` 的 `comboSearch`）。拼接时 `prepareSource` 用 `SOURCE_URL_TRAILER` 去掉每个包末尾的 `//# sourceURL=`（同文件 `:351-352`）。一条 LoAF 脚本的 `sourceURL` 因此经常是**整份 combo**，里面同时出现四个包名。把这条脚本的 `duration` 记到其中一个插件上是错的。

`sourceFunctionName` 在 minify 之后同样不能当功能名。

否决「只靠 PerformanceScriptTiming 分插件」。插件级归因以显式 span 与带名字的 track 为准；combo 上的脚本时间只记入 `nano-combined`，除非这一条 URL 只含一个 nano 包（按需 chunk `/plugins/<pkg>/client.<name>.js?rev=` 与 HMR 单资源 URL 就是这种）。

Resource Timing 同样不能分：combo 是一个资源条目，体积只记到 `nano-combined`。

### 3.2 独立 Cordis 插件

独立插件看不到各包 React 提交、路由函数和 DOM 根，只能看见整页。业主要的是植入。否决。

### 3.3 每个插件各装一个 PerformanceObserver

四个 client 都是各自 esbuild `--bundle` 的产物，模块作用域不共享（各包 `scripts/build-client.mjs` 的 `--external` 只有 react、react-dom、`@deepseek-ai/dsh-client-ui-primitives`）。若观察器放在模块单例里，一页会有四份观察器、四份条目。否决。页面上只允许一个观察器，所有权在 `globalThis.__perfReview`。宿主同理：`lib/host.js` 若把助手打进去，会有多份拷贝，所有权在 `globalThis.__perfReviewHost`。

这里使用全局是因为四份 bundle 没有第二个共享堆，不是要做隐藏的「当前会话」。

由此带出的强制项：**四份 bundle 里的 observe 代码版本可能不一致**。每个拷贝记自己的 `libVersion` 与编译期常量；先到的拷贝建立单例，后到的 `join` 走同一实例。`report()` 输出 `observerVersion`（单例自身版本）与 `contributors`（哪些 plugin id join 过、各自拷贝的版本），版本不一致在报告里是可见事实，不是隐 bug。

### 3.4 用进程 RSS / 事件循环延迟当插件指标

`process.memoryUsage()` 和 `monitorEventLoopDelay` 量的是整个 dsh 宿主。可以和「四个插件都未加载」的臂比较，不能写进某个插件的占用。否决作为插件成绩；保留为实验室对照臂的页级/进程级附录。

## 4. 现状事实（实现依赖的依据）

| # | 事实 | 出处 |
|---|---|---|
| F1 | 四个 overlay 都是 `dsh.bundle` + `dsh.client`，`engines.dsh` 为 `>=0.2.2-rc.1 <0.3.0`。共享 UI `packages/dsh-nano-ui` 不是插件，浏览器构建把它打进各 `lib/client.js` | 各包 `package.json`，`docs/specs/dsh-nano-ui/README.md` |
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
| F13 | 四个包的 `lib/client.js` 体积：`dsh-nano-notepad` ~176 KB、`dsh-nano-model-selector` ~111 KB、`dsh-nano-explorer-extra` ~118 KB、`dsh-nano-shared-workspace` ~56 KB（2026-11-10 工作树量到）。宿主侧：`lib/host.js` explorer ~43 KB、shared-workspace ~55 KB；`index.js`/`lib/host-media.js` 不打包 | `ls -la` 各包 `lib/` |
| F14 | explorer 宿主路由：`/list`、`/status`、`/ignored` 有 memo（`/status` 3 s、`/ignored` 3 s、`only=stats` 45 s），`/read`、`/commit`、`/pull`、`/checkout`、create/rename/move/delete 没有。共享工作区宿主路由有 `sync-tick` 30 s、`settings` 和各写路径。model-selector `/catalog` 有 15 s TTL | `dsh-nano-explorer-extra/src/host/routes.js:139-165`，`dsh-nano-model-selector/index.js:22` |
| F15 | 原生按键路径上，notepad 的捕获 `keydown`/`keyup` 先跑；每次按键至少两次回调。`callbackMs` 累计是把「便宜」变成数字的唯一办法；不加它，只靠 callbacks 计数，零成本监听和大回调成本在报告上不可区分 | `dsh-nano-notepad/src/client/index.js:98-123` |

## 5. 指标合同

一个加载了这个包的插件向 `__perfReview` `join`。报告输出 JSON（机器读）和 Markdown（人读）。metric key 全部机器稳定：报告的结构在聚合层 `aggregate.js` 测，Markdown 从同一个 JSON 渲染，不重算。

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
- `resources.<name>` — 初始载入时各资源 `encodedBodySize` 合计：`<allNanoClientJs>`、`nanoUi`（合并进各包 client.js，故只在 `nanoCombined.clientJsBytes` 出现，不单独拆）、`totalJs`（本页全部 JS 资源，作分母）。**用 `encodedBodySize`，不用 `transferSize`**：后者随缓存命中接近 0，热加载时基线不稳。
- `counts` — 全局 `count()` 汇总，键 `name`，值 `{n}`。这是唯一跨插件汇总的使用指标。

### 5.3 插件级

- `own.inpP75` / `own.inpCount` — `root()` 命中本插件的交互分位与样本数。`own.samples` 与 `own.spanMs` 在 `native` 归属的窗口里没有意义，不重复写。
- `native.spanMsP95` — 在 `native` 归属的窗口里，本插件 span 毫秒合计的 p95。
- `native.trackMsP95` — 在 `native` 归属的窗口里，本插件 track 回调毫秒合计的 p95（`track` 回调用 `performance.now()` 包裹累计，只出毫秒不打 mark）。
- `native.samples` — 窗口里出现过的 `{spanCount, callbackCount}` 合计。
- `spans.<name>` — 跨窗口累计 `{n, p50, p95, maxMs}`；异步 fn 记到 settle。
- `tracks.<name>` — 常驻轨道 `{kind, callbacks, live, callbackMs}`：
  - `kind ∈ {listener, mutation, resize, raf, interval, broadcast}`；`broadcast` 是 `BroadcastChannel`/`storage` message。
  - `live` 是「现在还活着几个」，`callbacks` 是窗口内被调次数，`callbackMs` 是这些回调累计毫秒。
  - **键是名字，不是 kind**：同一插件可以有多条同 kind 轨道（notepad 的 `shortcut-key` 与 `escape-key`、explorer 的 `card-wake` 与 `git-poll`）。
- `usage.<name>` — 业务计数（面板打开、文件展开、区块打开），与 `count()` 同源但按插件分键。
- `hostSpan.<name>` — 宿主路由 `{n, p50, p95}` 墙钟毫秒，仅在 `DSH_PERF_REVIEW=1` 时有值。
- `meta` — `{pluginId, packageName, version, implantedAt}`，版本变化要能被 meta.json 识别。

### 5.4 页级 `nano-combined`

不能归因的合并项：所有含多于一个 nano 包名的脚本毫秒、长帧 `blockingDuration` 中不能拆的部分、`encodedBodySize` 合计、combo 资源条目数。这是**诚实的不可归因项**，不写进任何插件行，但留在报告里让「我们的总成本」可见。

### 5.5 结构完整性

不随场景变化、坏了就代表测量本身出了问题的计数：`rootErrors`（`root()` 抛错）、`badNames`（span/track 名非法）、`overflowSpans`（键超过 32 被截断）、`observerErrors`、`host.writeErrors`。任一非 0 都先修测量，再谈插件预算。

## 6. 实现形状

### 6.1 包

`packages/dsh-performance-review`：**构建期**库（`private: true`，`file:` 依赖或源码相对引用，不发布、不安装），不进 `dsh.bundle`，不注册插件，无 `dsh.client`。两份产物：

- `src/client.js` → 打进各 `lib/client.js`：全局单例 `window.__perfReview`。
- `src/host.js` → 打进 explorer/shared-workspace 的 `lib/host.js`，或被 notepad/model-selector 的 `index.js` 相对路径 import（这两份宿主文件不打包）。**宿主调用点只用 `globalThis.__perfReviewHost`，不裸 import 包名**——`--packages=external` 会把裸名留到产物里，开发实例只拷 `lib/` 时解析不到。

`aggregate.js` 是纯函数：吃浏览器条目 + host.json，出报告 JSON。P0 先写它和它的单测。

### 6.2 开关

- 浏览器：`localStorage['dsh-perf-review'] === '1'` 或 URL `?perf-review=1`。**判定时机**：第一个 `join()` 调用时一次读定，此后不查（不能运行时切开关再期待轨道凭空出现）。lab 用 `addInitScript` 在导航前注入 localStorage，不依赖 URL 改写（避免与已有查询参数冲突）。
- 宿主：`DSH_PERF_REVIEW=1`。每 30 s 把 `host.json` 写到 `$DSH_DATA_DIR ?? $DSH_HOME ?? ~/.dsh` 下 `plugins/perf-review/host.json`；`beforeExit` 再写一次。写盘失败只计数 `host.writeErrors`，不重试。
- 关闭时所有 `join`/`span`/`track`/`count` 是恒等包装——直接调原函数，**不打 mark，不查时间**。
- **rev4 宿主快照送达**：浏览器 `report()` 自身读不到 `host.json`（它不在同源可访问路径上）。由带宿主路由的插件暴露 `GET <prefix>/perf-review/host`：`mode=snapshot` 返回累计快照（页面 5 s 低频轮询，非破坏性），`mode=window` 排空并返回「上次调用以来的窗口」快照（lab 在场景首尾各调一次，得到精确的场景内 `hostSpan`）。`report(meta, hostSnapshot)` 也可由 lab 直接喂入。`buildReport` / `mergeHostSnapshot` 合并 `hostSpan` 行、`hostWriteErrors` 与 `hostSinceStart`/`hostWrittenAt`，使陈旧数据可见。
- **rev4 版本约定**：插件版本由各包 `scripts/build-client.mjs` 读 `package.json` 的 `version`，经 `--define:__<PKG>_VERSION__=<JSON.stringify(version)>`（**只 stringify 一次**）注入两份产物；`join`/`hostJoin` 必须显式传**本拷贝**的 `libVersion`（从 `dsh-performance-review/client|host` 导出的 `LIB_VERSION`），否则 `contributors` 永远只显示先到单例的版本，多拷贝倾斜不可见。
- **rev4 禁用路径**：`?perf-review=1` 只切采集、不切代码；真正的「植入无开销」需要 `--no-review` 构建臂，见 §6.6。

### 6.3 API

`join(pluginId, impl)` 返回 `{ span, track, count, profiler }`；`pluginId` 用包内 `OWN_ID` 常量，不重复传字符串。

- `span(name, fn)` — 计时 `fn`。`fn` 返回 Promise 时计时到 settle（`finally` 里取数），reject 也算时长。名字进 `nano:<pluginId>:<name>` 的 `performance.measure`。
- `track(kind, name, opts)` — 注册常驻轨道。kind 见 5.3；`listener` 给 `{target, type, listener, options}`，`mutation`/`resize` 给 `{observer}`，`interval` 给 `{ms}`，`raf` 给 `{callback}`，`broadcast` 给 `{channel}`。**只在 `enabled` 时挂**；挂载时 `live++`，卸载 `live--`，回调次数与 `callbackMs` 进 `tracks.<name>`。
- `count(name, n = 1)` — `usage.<name>` += n。
- `profiler(Component)` — 返回 `<React.Profiler id="nano:<pluginId>:root" onRender>` 包过的组件。只有 model-selector 用。

`root()` 是 `join` 的必需 impl：返回本插件「会被用户点到的最外层元素」或 `null`。**禁止在 `root()` 里做布局读**（`getBoundingClientRect`/`offsetWidth`/`getComputedStyle`）；用 `isConnected`、`el.hidden`、`closest('[hidden],[aria-hidden="true"]')`、`offsetParent` 做可见性。explorer 的多 pane 场景：返回**第一个** isConnected 且未 hidden/aria-hidden 的 `[data-nxe]` 宿主元素。
> rev4 更正：真实 shell DOM **没有** `data-sidebar-right-pane`，用的是 `data-dockkit-*` 族加 `hidden`/`aria-hidden`。用 `firstVisibleRoot(document.querySelectorAll('[data-nxe]'))` 配合 `isUsableRoot`（hidden/aria-hidden 祖先判定、零布局读）等效达成；不要照抄旧的 `closest('[data-sidebar-right-pane]')`。

### 6.4 归属与脱敏

- `root()` 归属规则：交互 `target` 自下而上找，第一个返回非 null 且 `contains(target)` 的插件 root 命中；多个插件 root 都 contains（shared-workspace graft 内含 explorer 克隆的 DOM）时，**取 `contains` 最深/最具体的那个**（`target.closest` 后比较 `root === closestRoot`），再退化为先注册先赢。归不到的记 `"native"`。
- `root()` 抛错：本次按 `native` 记，`rootErrors++`。
- `target` 脱敏桶：`composer-textarea` / `sidebar-row` / `files-row` / `model-trigger` / `notepad-panel` / `shared-row` / `other`；取 `data-*` 属性与 tagName 归类，不落 className / id / 文本。
- `native.samples` 判定：窗口 = `[interactionStart - 1, interactionStart + duration + 8]`；插件的 span 或 track 回调时间区间与窗口重叠即计入。异步 span 的 `settle` 在窗口外结束则记 `spanAfterWindow`（report 的 `meta.notes` 说明），不强行划入。
- 交互保留：窗口内全部交互，按到达顺序入数组；超 50 条按时间丢**最旧**，不按 duration 排序截断（避免 p75 偏高）。

### 6.5 报告 schema（version 1）

```jsonc
{
  "version": 1,
  "meta": {
    "generatedAt": "ISO8601",
    "scenario": "composer-type",
    "arm": "on" | "off" | "purity",
    "dshVersion": "0.2.2-rc.1",
    "chromeMajor": 143,
    "observerVersion": "0.1.0",
    "contributors": [{ "pluginId": "nano-notepad", "libVersion": "0.1.0" }],
    "gitSha": "…",
    "labels": { "nano-notepad": "0.1.1" }
  },
  "page": {
    "nativeInpP75": null,          // 样本不足时 null，不当作 0（rev4.1：页级 audit）
    "nativeInpCount": 0,
    "nativeInpDurationThreshold": 16,
    "inputDelayP95": null,         // rev4.1：主线程忙/排队
    "processingP95": null,         // rev4.1：事件处理器
    "presentationP95": null,       // rev4.1：等下一次绘制（不计入插件预算）
    "loafCount": 0,
    "blockingMs": 0,
    "forcedLayoutMs": 0,
    "nanoCombined": { "scriptMs": 0, "loafCount": 0, "blockingMs": 0, "clientJsBytes": 0, "comboResources": 0 }
  },
  "plugins": {
    "nano-notepad": {
      "meta": { "version": "0.1.1", "implanted": true },
      "own": { "inpP75": null, "inpCount": 0 },
      "native": { "spanMsP95": 0, "trackMsP95": 0, "samples": { "spans": 0, "callbacks": 0 } },
      "spans": { "render": { "n": 0, "p50": 0, "p95": 0 } },
      "tracks": { "shortcut-key": { "kind": "listener", "callbacks": 0, "live": 0, "callbackMs": 0 } },
      "usage": { "panel-open": 0 },
      "hostSpan": { "save": { "n": 0, "p50": 0, "p95": 0 } }
    }
  },
  "counts": {},
  "structure": { "rootErrors": 0, "badNames": 0, "overflowSpans": 0, "observersMissing": 0, "observerErrors": 0, "hostWriteErrors": 0 },
  "notes": []
}
```

大小上限 256 KB；spans 键 ≤ 32、usage 键 ≤ 32，超出进 `structure.overflowSpans` 并不再开新键（老的键继续累计）。`report()` 也做 `reset()`：返回一份快照后清空窗口（lab 每个场景前 reset 一次）。

### 6.6 实验室剧本

`lab/run.mjs`（真实 Chromium 驱动，本机为 ego-browser；Playwright 为等价替代，**不 CPU 节流**；`--arm on` 默认；`--arm purity` 用只挂 `__perfReview` 的空白页跑观察器自身开销）跑完一个场景写一份 `lab/out/<stamp>-<scenario>.md|.json`。
>
> rev4 实现说明：本机没有安装 Playwright，故 `lab/run.mjs` 用 `ego-browser nodejs` 驱动同一个 Chromium；浏览器侧代码仍走 `page.evaluate()`，不引入 Playwright API。`--arm off` 只是「采集关闭臂」；真正的「不含观测包」对照臂由 `--measure-footprint` 用 esbuild `--alias` 构建无 DNPR 的产物并量出字节差，`--arm purity` 另验观察器自身 2 s 不产 LoAF。差异记在 `lab/README.md`。

| 场景 | 步骤 | 主要读数 |
|---|---|---|
| `idle-10s` | 打开一个已有会话的页面，闲置 10 s | `card-follow` callbacks === 0 且 live === 0；`hold` callbacks === 0（未 claim 时 live === 0）；`interval-commit`/`git-poll` live 数 = 实际 pane/插件数但 callbacks ≤ 1；`structure` 全 0 |
| `composer-type` | composer 里以稳定节奏输入 ~120 字符（`page.keyboard.type`，每键间隔 ~80 ms） | `nativeInpP75`（页级 audit）+ `inputDelayP95`/`processingP95`（硬红线）+ `presentationP95`（附录）；`native.samples` 里 notepad `shortcut-key`/`escape-key`、shared-workspace `sidebar-graft`/`sidebar-dedupe` 的 callbacks 与 `callbackMs`；各插件 `native.spanMsP95`/`trackMsP95` |
| `files-expand` | 在固定仓库（见 6.8）打开文件页，展开 3 个目录 | `spans.list-level`/`dir-status`/`git-refresh`/`apply-status` p50/p95；`hostSpan.git-status`/`list`；`git-poll` callbacks（~15 s 一次） |
| `notepad-type` | `⌘E` `1` 打开，输入 ~120 字符，停笔等 `saveDelayMs` + 1 s，关面板 | `own.inpP75`；`spans.render`/`highlight`/`idb-write`/`commit`；`usage.panel-open` +1 |
| `model-open` | 点 `.nms-trigger`，搜索框输入 ~20 字符，按 Esc 关面板 | `own.inpP75`（面板内交互）；`spans.panel-place`/`catalog-fetch`；`hostSpan.catalog`；`profiler` commit 数与 `commitP95` |
| `shared-open` | 侧栏展开共享工作区区块（若该实例已配置） | `tracks.sidebar-graft`/`sidebar-dedupe` callbacks 与 `callbackMs`；`usage.section-open`；`spans.section-render` |
| `observer-purity` | `--arm purity`：最小页面只挂 `__perfReview`，空跑 2 s | LoAF 条目数必须为 0；`structure.observerErrors` === 0 |

场景固定器：lab 需要一个已登录会话与一个确定的工作目录（`files-expand` 需要目录数 ≥ 3、规模稳定的仓库；建议指向本仓库自身）。`lab/config.local.json`（gitignored）写 `{ baseUrl, storageState, sessionId, workspaceDir }`；`storageState` 是 Playwright 的登录态快照，由操作者生成一次。不要把 token 或 cookie 写进 spec 或 lab 代码库。

### 6.7 植入表（每个插件的 join/track/span/count）

只包这些。**v1 已知未 track**：面板内一次性 DOM 监听（nano-ui 菜单/对话框的 document 监听、notepad 各按钮的 click 委托、model-selector 拖拽期的 pointermove）、`queueStats` 的一次性 debounce、`fs.watch` 服务端 watcher、`/ignored` 与写路径路由（手动路径，不进预算，不装 span）。把「漏」写成清单，免得下次复核把这些当回归。

| 插件 | join root | track | span | count |
|---|---|---|---|---|
| `nano-notepad` | `.np-layer` 或 `null`：面板打开（`state.ui.open`）时返回 `.np-layer` 的宿主元素，否则 null。**不是** `data-nano-notepad=root`（那个常驻） | `shortcut-key` listener (document capture keydown/keyup, `index.js:117-118`)；`escape-key` listener (`panel.js:2687`)；`visibility` listener (`panel.js:2679`)；`page-resize` listener (`panel.js:2683`)；`mirror-resize` resize (`panel.js:2530`)；`ctia-watch` mutation (`panel.js:2898`)；`draft-commit` interval (`panel.js:1608`)；`bc-message` broadcast (`panel.js:2696`) | `render`（`render()`，`panel.js:1266`）；`highlight`（`paintMirror` 里的 `highlightSource`，`panel.js:716-722`）；`idb-write`（`saveDraft`/`writeUi`/`persistUi`，`db.js`）；`commit`（`commit()`，`panel.js:1602` 起） | `panel-open`（`toggle()` opening=true 时，`panel.js:2731`）；`tab-open`；`version-save` |
| `nano-model-selector` | `panelRef.current`（open 时）或 `.nms-trigger` 的宿主元素（closed 时）。**永不**是 composer textarea；`panelRef` portal 到 `document.body`，要单独返回 | `panel-outside` listener（open 时 document pointerdown/keydown，`ModelSelector.jsx:230,243`）；`panel-place` listener（open 时 window scroll/resize，`ModelSelector.jsx:339-340`） | `panel-place`（`place()`，`ModelSelector.jsx:321`）；`catalog-fetch`（`load()`，`ModelSelector.jsx:570-574`）；`filter-render`（`visibleFavorites`/`visibleGroups` memo，`ModelSelector.jsx:309-317`，同步包一层量 memo 重算） | `panel-open`（`onClick` 里 `setOpen(true)` 后）；`imagine-invoke` |
| `nano-explorer-extra` | 第一个 `firstVisibleRoot([data-nxe])`（isConnected + hidden/aria-hidden 祖先判定，无布局读）；没有则 null | `card-wake` mutation（`detect`，`dialogs.js` 的常驻到达侦测）；`card-follow` raf（`follow` 链）；`card-shape` mutation（卡片存活期的 inner `observer`）；`git-poll` interval（`body.js`，15 s，`POLL_GIT_MS`） | `apply-status`（`workspace-store.js` 的 `commit()`，每次写 state+通知 listeners）；`git-refresh`（`refreshGit` 的 `once('git')` 工作）；`list-level`（`loadLevel` 的 `once` 工作）；`dir-status`（`loadDirectoryStatus` 的 `once` 工作）；`stats-count`（`refreshStats`） | `files-expand`（`toggle()` 的**未展开→展开**状态迁移）；`dialog-open`；`menu-open` |
| `nano-shared-workspace` | `[data-nano-shared-workspace]` 宿主元素（graft host），不存在则 null | `sidebar-graft` mutation（`graft.js:133-143`，body 全量含 attributes）；`sidebar-dedupe` mutation（`index.js:405-406`，`separateFromLocal`）；`hold` interval（`index.js:141-150`，25 s，claim 后才启动） | `section-render`（`SharedSection` 渲染入口）；`apply-separate`（`separateFromLocal()`，`index.js:58-100`） | `section-open`；`workspace-join` |

宿主侧 `hostSpan`：

| 插件 | span 名 | 说明 |
|---|---|---|
| `nano-notepad` | `save`、`read` | `POST /save`、`POST /read`；`/fetch-mp`（微信文章抓取）不进 v1（手动路径） |
| `nano-model-selector` | `catalog` | `GET /catalog`，含 15 s TTL 命中与 miss；`media-engines`/`media-engine` 不进 v1 |
| `nano-explorer-extra` | `git-status`、`list`、`stats` | memo 命中也记（`n` 反映请求次数，`p50` 反映真实服务端耗时，两者分开读）；`/ignored` 与写路径不进 v1 |
| `nano-shared-workspace` | `sync-tick`（30 s interval 回调）、`settings`、`remote-sessions`、`workspaces` | `sync-tick` 是宿主常驻路径；`settings`/`remote-sessions`/`workspaces` 是 refresh 期间走的读路径 |

### 6.8 测试与验证

- P0 单测（`aggregate.js`）：假条目 → 报告 JSON。覆盖：`interactionId` 归并；`root()` contains 归属与最深者优先；`native` vs `own` 分桶；combo URL 含多个包名时只进 `nanoCombined`；`encodedBodySize` 累加；键上限截断进 `overflowSpans`；`enabled=false` 时 `join` 返回恒等包装且不打 mark；异步 span reject 仍记时长。
- P0 单测（`track`）：fake observer/timer 记 callbacks/live/callbackMs；同一名字重复 `track` 不叠加 live；卸载后 live 回到 0。
- P1 单测：两份拷贝装到同一 `globalThis`，`join` 合并到一个单例；`observerVersion`/`contributors` 正确；后到的拷贝拿到先到的实例。
- P1 单测（root）：`root()` 里 `getBoundingClientRect` 出现即断言失败（用带静态分析的假 DOM 或 Proxy 包住）。
- **rev4 / A 闸新增单测**（`test/validity.test.mjs`，已绿）：`report(meta, hostSnapshot)` 真的填 `hostSpan` + `hostWriteErrors` + 时间 meta；`diffHostSnapshots` 把累计 `n` 转成场景增量；`takeWindow()` 精确窗口且不扰动 `snapshot()`；>4096 条 span 事件后已结算交互的 samples 不丢；observer 回调自动结算；60 s 前事件被剪枝；`plugin.scriptMs` 读 `collector.pluginScriptMs`（原为死字段）；`LIB_VERSION` 两半导出且 `join` 尊重调用方版本；**同名 track 两实例分别 detach 后 live=1**（原 `resetLive()` 会误清零）；嵌套 span 的 `spanMs` 取区间并集而非重复求和；`resetCounters()` 清累计 usage；**单个 observe 失败时 `observersMissing++` 而 `observerErrors` 仍为 0**；root 助手不触发布局读；报告注明 `nanoCombined` 的采样条件。
- **rev4.1 / L1 新增单测**：Event Timing 三分量进报告且数值正确；按 `interactionId` 归并时保留与 max duration 同一条 entry 的三分量；缺 `processingStart`/`processingEnd` 时退化为 0 不抛错。
- **rev4.1 / L1 lab 实现**：`--repeats N` 对同一场景跑 N 次独立浏览器会话，取各标量**中位数**判定，原始每轮读数写进 `repeatRuns`（§12.1 实测单次 p75 在 72–800 ms 摆动，单次不可判定）；`--inject-delay` 把 `inputDelayP95` 抬高，验证新硬红线能触发退出码 1。
- lab 退出码：`0` 全过；`1` 预算失败（Markdown 点名 pluginId + span/track 名）；`2` 页面/report/基线版本不一致（chromeMajor、dshVersion、observerVersion、各插件 version 与 meta.json 不一致）。

## 7. 预算

「基线」指 `lab/baseline/baseline.json` 下最近一次 `--arm on` 的报告；第一次 `--arm on` 只写基线，不判失败。版本不一致先退出码 2，不拿旧基线判。

> **rev4.1 硬门禁 / audit 分层**（依据 `performance-alpha.md` §12 与连续稳定性实测）：
> 「相对基线 × 倍数」只适用于**低方差、结构性、可归因**的指标。连续 3 次全量复跑证明，
> 把同一公式用在**高方差**读数上会在约 1/3 的运行里产生假阳性：body-wide observer 的
> callback 数随原生 DOM 写次数波动（7 vs 上限 6）、host 墙钟 I/O 实测 3–23 s
> （4767 ms vs 上限 4037 ms）、含 I/O 等待的 span p95。这些读数**仍写进报告、仍进 D1
> 候选表**，但降为 **audit**（Markdown 列出，不产生退出码 1）。
> 硬门禁保留在：`structure.*` 全 0、`observersMissing`、purity LoAF 0、禁用臂零行、
> `card-follow`/`hold` live 红线、`card-wake`/`git-poll` live、`inputDelayP95`/
> `processingP95`/`native.spanMsP95`/`native.trackMsP95` 的 50 ms 绝对红线、
> `nanoCombined.clientJsBytes` ≤ baseline × 1.1、版本指纹。
> 这不是放宽：判定面从「一个高噪声相对项」变成「十余个低方差硬指标」，
> 且注入真回归（`--inject-delay` / `--inject-failure`）仍能触发退出码 1 并点名。
> 基线本身用 `--repeats 3 --write-baseline` 取中位数，不用单次读数。

| 检查 | 场景 | 阈值 | 说明 |
|---|---|---|---|
| `structure.*` | 所有 | 全 0 | 测量本身坏了先于插件预算修 |
| 观察器自身开销 | `observer-purity` | 空跑 2 s LoAF 条目数 === 0 | 观察器自己不产长帧；audit 级，不进回归 |
| `page.nativeInpP75` | `composer-type` | **rev4.1：页级 audit，记录并在 Markdown 列出，不产生退出码 1** | 含 presentation 段；spec §5.1 规定页级 INP 不抄进插件行，因此它本来就点不出 pluginId；200 ms 仅作 web-vitals 参考值标注，不再作为硬门禁。理由与实测见 `performance-alpha.md` §12 |
| `page.inputDelayP95` | `composer-type` | ≤ 50 ms（**rev4.1 新增硬红线**，≥ 8 样本生效） | 主线程忙/排队段；这是插件**能影响**的部分。超限 fail `page` 并在 reason 列出窗口内出现过的插件 |
| `page.processingP95` | `composer-type` | ≤ 50 ms（**rev4.1 新增硬红线**，≥ 8 样本生效） | 事件处理器段；同上 |
| `native.spanMsP95` | `composer-type` | ≤ 50 ms | **插件级主判据**：落在打字窗口里的插件 span 毫秒 p95；≥ 8 个样本才生效 |
| `native.trackMsP95` | `composer-type` | **rev4.1：≤ 50 ms 绝对红线**（对齐 `native.spanMsP95`）；相对基线部分降为 audit | **插件级主判据**：实测 8.9–23 ms 抖动，单次基线 × 1.5（12→18 ms）会误报；50 ms 绝对线仍能抓真回归 |
| `card-follow` | `idle-10s` | callbacks === 0 且 live === 0 | rAF 泄漏红线 |
| `card-wake` | `idle-10s` | callbacks ≤ baseline × 2（首次基线绝对值 ≤ 40）；live ≤ 4 | **rev4 新增**：F10 更正后，闭合的 drawer 仍各挂一个 `document.body` 全量子树 observer；α 报告测到 live=2 / callbacks=26 却没有判据，是最大盲点。D2 已修复，此红线防回归 |
| `hold` | `idle-10s` | callbacks === 0 且 live === 0 | 未 claim 时该 interval 不应存在 |
| `sidebar-graft` / `sidebar-dedupe` / `ctia-watch` | `idle-10s` | **rev4.1：audit**（记录并列参考上限，不产生 exit 1） | body 全量 observer 的 callback 数随原生 DOM 写波动；仍进 D1 候选表按次数×耗时排序 |
| `git-poll` | `idle-10s` | **live** === **挂载** pane 数（rev4 更正，原写「可见」）为硬门禁；**callbacks** 降为 audit | 计时器按 pane 挂载数计数本身不违规；teardown 用 `detach()` 而非 `resetLive()`，否则多实例互相清零 |
| `interval-commit` | `idle-10s` | live === 1，callbacks ≤ 1 | `armCommit` 挂着不算泄漏，tick 触发真 `commit` 才算成本 |
| `spans.<name>` | 各场景 | **rev4.1：audit**（记录并列参考上限） | 异步 span 含网络/宿主 I/O 等待，不是稳定主线程成本；仍进 D1 候选表 |
| `hostSpan.<name>` | 各场景 | **rev4.1：audit**（记录并列参考上限） | 宿主墙钟 I/O 实测 3–23 s，环境依赖；仍进 D1 候选表 |
| `nanoCombined.clientJsBytes` | 首次加载 | ≤ baseline × 1.1 | `encodedBodySize`；字节数稳定，保留为硬门禁 |
| `profiler.commitP95` | `model-open` | ≤ baseline × 1.5 | React Profiler `actualDuration` p95 |

预算失败不改插件行为；lab 退出码 1 时报告必须点名 pluginId 与 span/track 名。

## 8. 阶段

- **P0** — `packages/dsh-performance-review` 骨架 + `aggregate.js` + 单测。产物：纯函数报告器与表驱动的植入契约（名字、kind、场景 → 期望键）。**先定 `track`/`span` 的签名**再写调用点。
- **P1** — `client.js`/`host.js` 单例（`__perfReview` / `__perfReviewHost`）+ `observerVersion`/`contributors` + `root()` 无布局读的实现与测试。
- **P2** — 按 6.7 表植入四个插件。**首个目标是 `dsh-nano-explorer-extra`（业主指定）**：它一次验证最多的面——多 pane `join` 合并、`root()` 可见性挑选、mutation/raf/interval 三种 track、五个 span、`files-expand` 场景、`--packages=external` 的 host 打包路径。随后按 notepad → shared-workspace → model-selector。每完成一个跑一次 `idle-10s` 确认 live 数与结构完整性。**前提：P0/P1 单测必须先绿**——dev 真机只能验证接线与真实时序，不能验证聚合逻辑；带着未测的包植入最复杂的插件，会把包 bug 和植入 bug 混在一起。
- **P3** — `lab/`（scenarios/run.mjs/baseline/config.local.json 说明）+ 第一份基线 + 同基线复跑一次验证退出码 0。`config.local.json` 写好模板（gitignored）。
- **P4** — 优化只按报告点名。当前可疑但不预设结论的索引：`sidebar-graft` 的 `getBoundingClientRect`（graft.js:67）、`sidebar-dedupe` 的整页 `querySelectorAll`（index.js:75-84）、`ctia-watch` 的 `attachNotepadCtas`（panel.js:2897）、`git-poll` 的每 pane interval（body.js:245）、notepad `shortcut-key` 的常驻捕获（index.js:117）。

## 9. 风险

| 风险 | 缓解 |
|---|---|
| 观察器漏报插件归属 | `native.samples` 为 0 不代表无成本；补看 `nanoCombined` 与 `tracks` |
| span/track 名漂移 | `badNames` 计数 + P0 名字校验；名字出现在 spec 表里的才合法 |
| 多拷贝 observe 版本倾斜 | `observerVersion`/`contributors` 进 meta；版本不一致退出码 2 |
| `root()` 把 composer 算进自己的 UI | model-selector root 永不返回 textarea；`root()` 禁布局读 + 最深 contains 优先；P0 用假 DOM 测 |
| 隐藏的 explorer pane 重复 join | 同一 pluginId 合并；`root()` 只返回可见 pane |
| 宿主写报告失败拖垮路由 | 写文件在 tick 外异步；失败 `hostWriteErrors++`，不重试 |
| 基线因换浏览器/插件版本作废 | `meta.json` 记 chromeMajor、dshVersion、observerVersion、各插件 version；不一致退出码 2 |
| 日常实例被 localStorage 打开后忘关 | 报告不上传；宿主默认不写 `host.json`；浏览器侧无远程出口 |
| 回归门槛写进插件启动 | 禁止；退出码只属于 `lab/run.mjs` |
| MutationObserver 互相触发（graft/dedupe 写 DOM → 又触发对方） | `callbackMs` 与 callbacks 都进报告，能区分「被叫起很多次」和「每次都很贵」；P4 索引单独看这两项 |
| Event Timing 上报阈值吞掉快交互 | `nativeInpDurationThreshold` 写进报告；样本数 0 时显式说明而非当 0 |
| `track` 给 observer 实例做包装时 disconnect 时机漂移 | `track` 包装 `disconnect()` 与观察器本身的 dispose；卸载后 `live` 必须回 0，P1 测试锁死 |

## 10. 验收

- 四个插件的运行时产物里都打进观察包，且默认开关关闭时，现有功能路径与植入前一致（快捷键、文件树、模型面板、共享区块仍按各包 AGENTS / 规格工作）。
- 打开开关后，六个场景都能在开发实例上跑完，并各写一份 Markdown + JSON。
- JSON 里每个已加载插件都有第 6.5 节的行；没植入的插件不会出现空行冒充。
- `composer-type` 的报告能分开「页级原生 INP」和「某插件 span/track 落在这些交互里的毫秒与次数」。
- `idle-10s` 里 `card-follow` 与未 claim 的 `hold` 回调为 0 且 live 为 0；`interval-commit`/`git-poll` 的 live 数符合实际 pane 数。
- combo 场景下，报告不会把同一段 `scriptMs` 加进两个插件；`nanoCombined.clientJsBytes` 是四包合计的唯一落点。
- `observer-purity` 空跑 2 s 无 LoAF 条目。
- 相对第一份基线的第二次运行，第 7 节里有基线的检查通过；chromeMajor / dshVersion / observerVersion / 插件 version 不一致时退出码 2。
- 任一预算失败时，Markdown 点名 plugin id 与 span/track 名，并且不修改插件行为。
