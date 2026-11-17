# 1117-keep-alive · [DNT] 保活、防缓冲与多窗格完整性

| 项 | 值 |
|---|---|
| 编号 | 1117-keep-alive |
| 对象 | [DNT] = dsh-nano-terminal |
| 日期 | 2026-11-17 |
| 代码头 | 本仓 `fb7264d` |
| 原生对照 | 已安装 [dsh] 应用 `DeepSeek Harness.app` 的 `app.asar` 内 `@deepseek-ai/dsh-api-terminal-controller` 与 `@deepseek-ai/dsh-client-ui-sidebar-terminal` 的 TypeScript 源。行号属于该安装包，不属于本仓 git |
| 宿主休眠检索 | 同一 `app.asar` 全文：`powerSaveBlocker` 0 次，`backgroundThrottling` 0 次；`wakeLock` 8 次，全部是权限枚举或 MDN 兼容数据，没有 `navigator.wakeLock.request` |
| 不在范围 | 把页面 wasm 挪进 Worker 冒充保活；仿原生在客户端排队等绘制回调；把 [DNLS] 路径写进 [DNT]；插件自己调用 `powerSaveBlocker` 或屏幕唤醒锁 |

词汇按仓根 `AGENTS.md` 锚定。[DNT] 是浏览器 canvas 上的 wasm 终端。[dsh] 原生终端是宿主自带的 xterm 终端，二者不是同一条数据面。

---

## 1. 宿主与原生终端：唤醒、持有、缓冲

### 1.1 拓扑

```text
人
 │
 ├─ 原生 [dsh] 终端（宿主 UI）
 │    页面 xterm  ──ack──►  TerminalFollower 队列（每连接 ≤ 2MiB）
 │                              │
 │                         BrowserTerminal
 │                         headless xterm（权威屏幕，scrollback 默认 1000）
 │                              │
 │                         SubprocessTerminalHandle（PTY）
 │                         TerminalRetention（窗口流持有；无人持有才按空闲回收）
 │
 └─ [DNT]（本仓插件）
      页面主线程 wasm（投影，termStores 强引用）
           ▲ 每个 WS 块立刻 dnt_write；失焦只降低画布频率
           │
      dnt-ws-v2：DATA / CREDIT / SNAPSHOT
           │
      宿主 Node
           SessionRecord.spawnTerminal（PTY，不在页面里）
           ScreenMirror（同一份 dnt-core，模块级单例）
           replay 环（最多 512KiB 原始字节）
           sweep：无 socket 且超过 30 分钟且无 keep → 关闭
```

原生终端的进程寿命和界面无关。持有方是窗口的 Remote 流，不是「人眼是否看着」。缓冲发生在「权威屏幕已经更新」之后、浏览器 xterm 确认绘制之前。

[DNT] 的进程也在宿主里，不在页面里。页面 wasm 和宿主镜像各解析一遍。页面还活着时，字节是直写入 wasm 的，没有原生那种「等画完再拉下一帧」。页面被冻住或进程被系统挂起之后，[DNT] 没有第二套追赶队列；醒来时看到的快进，是套接字积压或 512KiB replay 一次灌入。

### 1.2 原生：唤醒、持有、缓冲

权威屏幕在宿主 headless xterm 里，PTY 的每个块写完才广播：

- `dsh-api-terminal-controller/src/terminal.ts:36` 进程寿命独立于 follower 和组件。
- `terminal.ts:54` `new Terminal({ cols, rows, scrollback })`。
- `src/index.ts:119-120` `scrollback` 默认 1000，`maxBufferedBytes` 默认 `2 * 1024 * 1024`。
- `terminal.ts:369-392` `for await (chunk of handle.output)` → `screen.write` → `broadcast({ type: 'output' })`。

每个界面连接有一条有上限的队列。超限就失败这条连接，文案要求重连才能拿回当前屏幕：

- `src/stream.ts:1-2` 慢消费者失败，稍后的附着从屏幕恢复。
- `src/stream.ts:26-29` 超过 `maxBytes` 则 `fail('... reconnect to recover the current screen')`。

重连的第一帧是整屏序列化，不是把离开期间的动画再放一遍：

- `terminal.ts:96-100` `type: 'snapshot'`，`screen: this.serializer.serialize()`。

持有与空闲回收：

- `src/retention.ts:48-70` `retain(signal)` 为一条物理 Remote 流登记 holder；有 holder 就不走空闲计时。输入会使空闲观察失效。无人持有且空闲超过 `unattendedTimeoutMs` 才关闭。

客户端必须等 xterm 解析完这一帧才拉下一帧：

- `src/client/model.ts:381-388` `await` 一个 Promise，直到 `acknowledge(revision)`。
- `dsh-client-ui-sidebar-terminal/src/client/terminal.tsx:159-166` `xterm.write(..., () => model.acknowledge(render.revision))`。快照路径先 `xterm.reset()` 再 `resize`。

界面源码里没有 `document.hidden` 分支。后台变慢来自浏览器压低 `requestAnimationFrame`，从而推迟 `write` 回调。

### 1.3 [DNT]：唤醒、持有、缓冲

PTY 与镜像：

- `dsh-nano-terminal/src/host/sessions.js:142` `spawnTerminal`。
- `sessions.js:355-370` `output.on('data')`：`remember` → `mirror.write` → 每个附着 `att.data(chunk)`。
- `src/host/mirror.js:1-2` 宿主镜像是 Node 里一次性实例化的同一份 `dnt-core`。
- `mirror.js:47-51` 每块 `dnt_alloc` + `dnt_write`。

页面投影：

- `src/client/wasm.js:22-29` `loadCore()` 在页面主线程 `WebAssembly.instantiate` 一次，之后复用。
- `wasm.js:54-55` 每个窗格 `dnt_new`，不是每个窗格一个实例。
- `src/client/NanoTerm.jsx:839-845` `lane.onOutput` 立刻 `term.write`，然后才 `schedulePaint`。写入不等待绘制。

画布降频，不是字节降频：

- `NanoTerm.jsx:828-834` 有焦点用 `requestAnimationFrame`；无焦点用 500ms 的 `setInterval`。

重连回放的是原始字节，不是当前屏：

- `sessions.js:57` `replayBytes = 512 * 1024`，`idleTimeoutMs = 30 * 60 * 1000`。
- `sessions.js:467-475` 超过上限从队头丢块；`replayInto` 把剩余块逐个送出。
- `src/host/web-routes.js:129` 附着成功后立刻 `replayInto`。

信用耗尽时的「快照」会清屏：

- `src/host/ws.js:86-89` `SNAPSHOT` 是输出超过信用后的追赶。
- `ws.js:96-97` `CREDIT_INIT = 256 * 1024`，`SNAP_LIMIT = 4 * 1024 * 1024`。
- `ws.js:139-158` 积压超过信用加 4MiB 时，发送 `CSI 2J` + `CSI H` + 可见区最多 200 行纯文本。

持有规则只看 socket，不看壳是否还在跑任务：

- `dsh-nano-terminal/index.js:182` 每 60 秒 `registry.sweep()`。
- `sessions.js:272-276` 无 socket、断开超过 `idleTimeoutMs`、且没有 `keep` 才关闭。
- `sessions.js:392-409` `keep` 为真且进程是异常丢失时，按 1.5s→60s 退避拉起新壳，不重跑刚才的命令。

页面侧释放点：

- `NanoTerm.jsx:1105-1120` 组件卸载只 `canvas.detach()`，注释写明 unmount 不是关闭。
- `NanoTerm.jsx:247-254` `disposeAllTerminals()` 才对所有窗格 `closePaneSession`。
- `src/client/index.js:37` 插件 effect 的清理函数调用 `disposeAllTerminals()`。这是插件卸载，不是切走视图。
- `NanoTerm.jsx:235-244` `anyLiveTerminals()` 已经能回答「现在还有没有活着的终端」。宿主今天没有消费这个信号去做电源或节流。

---

## 2. 业主看到的两种现象

### 2.1 原生终端「回来以后飞快补出来」

壳没有加速。离开期间 headless xterm 已经把输出吃进权威屏幕（`terminal.ts:388-392`）。浏览器在后台把 `requestAnimationFrame` 降频后，`terminal.tsx:166` 的 `write` 回调变慢，`model.ts:381-388` 就不拉下一帧。帧堆在 `TerminalFollower` 里，上限 2MiB（`index.ts:120`，`stream.ts:26-29`）。

回到前台后回调恢复，积压按解析速度一次放完，所以像快进。若队列已经撑破，这条连接失败，重连收到的是 `serializer.serialize()` 的整屏（`terminal.ts:100`），同样是一下子全出来，而不是离开期间的逐帧动画。

这是背压设计，不是 zsh/bash 的行缓冲，也不是终端在人离开时暂停了 PTY。

### 2.2 Windows 多窗格：光标乱飘、内容被吞

本仓没有 `win32` 专用的光标分支。Windows 只改了启动参数：

- `sessions.js:32-34` Windows 用 `%COMSPEC%`，否则 `$SHELL` 或 `/bin/zsh`。
- `sessions.js:125` 与 `sessions.js:211` 非 Windows 才加 `-i`。Windows 上的 ConPTY 收到 resize 后会自己再画一屏绝对光标序列。

多开把下面四条同时放大。

**每个窗格一变宽就两头一起重排。** `NanoTerm.jsx:858-866`：`ResizeObserver` 触发 `fit()`，列数用格子宽度整除，没有迟滞；然后 `term.resize` 与 `lane.resize` 一起发生。`crates/dnt-core/src/lib.rs:225-231` 在列数变化时 `reflow_cols`。ConPTY 随后用绝对光标再画一遍。网格已经重排过，这些序列就落在错误的行上。开一个新窗格会让其余窗格同时变窄，每一路都来一轮。

**格子宽度和 DPI 只量一次，光标按整数列画。**

- `src/client/render.js:104` `this.dpr = Math.round(window.devicePixelRatio || 1)`，构造之后不更新。
- `render.js:158-162` `measureText('W')` 的宽度 `Math.round` 成 `charW`。
- `render.js:214` `cellX(col) = col * charW`。
- `render.js:318` 光标画在 `cellX(this.cursorX)`。

Windows 的 ClearType、125%/150% 缩放，或窗格被拖到另一块屏，字形真实前进和 `charW` 差一截。光标就浮在字中间或字缝里；按格子 `fillRect` 会裁掉半个字。

**信用快照会清掉当前屏。** `ws.js:153-158` 用 `ESC [2J` `ESC [H` 加纯文本替换后续字节。备用屏幕、颜色、原来的光标都没了。多路同时大量输出、页面又没及时回信用时，表现为字突然没了、光标回到左上角。客户端把这种帧当普通输出灌入：`lanes.js:124-131`。

**没焦点的窗格一秒钟只画两次。** `NanoTerm.jsx:828-834`。字节已经在 wasm 里（`NanoTerm.jsx:839-841`），画布要等 500ms。切过去的一瞬间，光标和脏行一起跳。这是观感上的跳动，不是第二份网格。

多个窗格共用一个 wasm 实例，但是每个窗格有自己的 `dnt_new` id（`wasm.js:22-29`、`wasm.js:54-55`）。`render()` 返回前把字符串拷出内存。不是窗格 A 的光标画到了窗格 B。

---

## 3. 现有保活、宿主防休眠、插件缺口

### 3.1 [DNT] 已经有的

| 机制 | 位置 | 保住什么 | 保不住什么 |
|---|---|---|---|
| PTY 在宿主进程 | `sessions.js:142`、`sessions.js:360-368` | 页面还连着时，壳不跟页面走 | 宿主进程被系统挂起 |
| 镜像 wasm | `mirror.js:1-2`、`mirror.js:47-51` | 页面冻结后，宿主仍有一份当前屏（进程醒着才算） | 页面投影 |
| 页面 wasm 强引用 | `wasm.js:22-29`；`NanoTerm.jsx:1105-1120` 卸载不 `dnt_free` | 分屏重挂载、失焦 | 插件卸载、文档被浏览器丢掉 |
| 直写、不等绘制 | `NanoTerm.jsx:839-845` | 页面事件循环还在时，持续注入 | 页面冻结之后 |
| replay 512KiB | `sessions.js:57`、`sessions.js:467-475`、`web-routes.js:129` | 断线后能补一段历史 | 会造成一次快进；不是当前屏对齐 |
| 空闲 30 分钟 | `index.js:182`、`sessions.js:272-276` | 无人附着不会马上杀 | 不看任务是否还在跑；不阻止睡眠 |
| `keep` 重生 | `sessions.js:392-409` | 异常丢失后拉起新壳 | 不重跑命令；不阻止睡眠 |
| `anyLiveTerminals()` | `NanoTerm.jsx:235-244` | 给宿主一个「还有活终端」的布尔 | 宿主没有接它 |

### 3.2 宿主防休眠：没有

安装包全文没有 `powerSaveBlocker`，没有 `backgroundThrottling`。`wakeLock` 只出现在权限枚举和 MDN 数据里。桌面端因此沿用 Chromium 默认：窗口被挡住或最小化时降频，久了可以冻结页面。网页端同样没有屏幕唤醒锁。合盖和系统睡眠会把宿主进程一起挂起，插件无法单独拦住。

按仓根 `AGENTS.md`「上层建筑归 host」：电源和「不要节流这个窗口」属于宿主。插件不调用 `powerSaveBlocker`，也不自己 `navigator.wakeLock.request`。

### 3.3 功能缺口

1. 宿主不消费 `anyLiveTerminals()`，所以「终端开着」不会变成「不要挂起应用、不要节流窗口、网页上持有屏幕锁」。
2. 页面从冻结恢复时，没有「丢掉积压原始字节、改对齐镜像当前屏」的路径。现在要么灌 replay（`web-routes.js:129`），要么灌 `CSI 2J` 纯文本（`ws.js:153-158`）。两条都不是当前屏直连。
3. 失焦只降画布，不降解析。这一点是对的，但重新可见时没有强制 `invalidate()`，第一眼仍可能是 500ms 前的画布。
4. Windows 多窗格的 resize 没有迟滞，DPI 不跟屏，和 ConPTY 的重画叠在一起。这不是保活缺失，但会在多终端激活时被看成「乱」和「吞」。

---

## 4. [DNT] 的保活需求

从 [DNT] 的用法出发，需求就三条。不新增 lane，不新增凭证，不把 [DNLS] 写进数据面。

**R1 权威屏幕在宿主，投影在页面。** 壳和 `ScreenMirror` 在宿主进程醒着的时候持续更新。页面 wasm 是投影。主线程被冻住时，不可能继续往投影里灌；不允许用 Worker 假装解决。

**R2 页面还活着就持续注入，禁止原生式排队。** 每个 PTY 块在 WebSocket 到达时立刻 `term.write`。禁止改成「等 `paint` 或 xterm 回调完成再要下一块」。失焦可以少画，不可以少解析。重新可见的第一帧必须把 wasm 里已经当前的网格画出来。

**R3 页面刚醒时对齐当前屏，不要快进。** 冻结期间积在套接字里的原始字节丢掉。用镜像的当前屏整份替换页面网格，带序号。序号之后的新输出才继续逐块注入。禁止用 `CSI 2J` 加纯文本冒充这次对齐。

**R4 终端开着，宿主不要主动把页面或应用睡死。** 信号用现成的 `anyLiveTerminals()`。桌面：有活终端就 `powerSaveBlocker.start('prevent-app-suspension')`，终端窗口 `backgroundThrottling: false`。网页：宿主页面持有 `navigator.wakeLock.request('screen')`。这三件事的实现在宿主，不在本插件。合盖不在承诺内。

**R5 看不见不等于释放。** `document.hidden`、窗格失焦、500ms 慢绘制，都不 `dnt_free`、不 `lane.close`。只有窗格关闭和插件卸载才释放。视图切换继续只拆画布。

**R6 多窗格激活时，resize 不得双写。** Windows 上 ConPTY 会在 `lane.resize` 之后自己重画。页面侧的 `reflow_cols` 与这次重画叠在一起就会吞字、光标跳。同一轮布局里的列数抖动要收成一次。DPI 变化要重测 `dpr` 和 `charW`。

---

## 5. 1117-keep-alive 升级包工作清单

| ID | 需求 | 做什么 | 哪里做 | 不做 |
|---|---|---|---|---|
| KA-0 | R4 | 宿主在 `anyLiveTerminals()` 为真时持有防挂起、关窗口节流、网页屏幕锁 | 宿主。本仓只保持信号函数可被调用 | 插件内 wake lock / `powerSaveBlocker` |
| KA-1 | R5 | 钉死「hidden / 失焦 / 慢绘制不释放」 | [DNT] 测试 + 卸载路径核对 | 新建 Worker |
| KA-2 | R2 | 重新可见时立刻整帧画当前网格 | [DNT] 页面 | 把 500ms 改成等绘制才读字节 |
| KA-3 | R3 | 冻结恢复：丢积压、一次镜像对齐、序号之后再直连 | [DNT] `ws.js` 与 `lanes.js` 成对 | 继续用 `CSI 2J` 纯文本快照 |
| KA-4 | R1 | 重连优先当前屏，512KiB 原始 replay 不再当恢复主路径 | [DNT] `web-routes.js` / `sessions.js` | 把 replay 环无限加大 |
| KA-5 | R6 | resize 迟滞；DPI 变化重测格子；避免和 ConPTY 双写 | [DNT] `NanoTerm.jsx` / `render.js` / `lib.rs` | 为 Windows 再写一套模拟器 |

KA-0 未落地之前，KA-3 仍然要做：它保证「即使页面被冻过一次，醒来也不快进」。它不能代替 KA-0。

---

## 6. 在当前头上的执行台账

对照原生状态，改动目标都落在 `fb7264d` 的这些位置。

### KA-0 宿主防休眠（本仓只提供信号）

| 项 | 原生 | 当前 [DNT] | 升级目标 |
|---|---|---|---|
| 有人看着 | `retention.ts:48-70` 用 Remote 流 holder | 无电源持有 | 宿主读 `anyLiveTerminals()`（`NanoTerm.jsx:235-244`） |
| 应用不被挂起 | 安装包中 `powerSaveBlocker` 为 0 | 无 | 宿主：有活终端则 `prevent-app-suspension`，否则 `stop` |
| 窗口不节流 | 安装包中 `backgroundThrottling` 为 0，即默认节流 | 页面主线程会被降频 | 宿主：终端窗口 `backgroundThrottling: false` |
| 屏幕锁 | 无调用 | 无 | 宿主网页：有活终端则 `wakeLock.request('screen')`，释放后在重新可见时再要 |

插件侧验收：`index.js:37` 的卸载清理仍然只在插件卸载时 `disposeAllTerminals()`。不要在这个函数里加电源调用。

### KA-1 主 wasm 不被意外回收

| 项 | 当前 | 目标 |
|---|---|---|
| 实例位置 | `wasm.js:22-29` 主线程单例 | 保持。不迁 Worker |
| 分屏卸载 | `NanoTerm.jsx:1120` 只 `canvas.detach()` | 保持。补测试：`document.hidden` 与 `data-focused=false` 之后 `dnt_new` 的 id 仍可 `dnt_write` |
| 真释放 | `NanoTerm.jsx:742-747` `closePaneSession`；`index.js:37` 插件卸载 | 只有关闭窗格和插件卸载走进这里 |
| 宿主镜像 | `mirror.js:16-24` 模块级 `exports_` | 保持单例。插件卸载 `registry.dispose` 之前不 `dnt_free` 镜像 |

### KA-2 活着就直连，看见就画当前屏

| 项 | 原生（不要学） | 当前 [DNT] | 目标 |
|---|---|---|---|
| 下一帧条件 | `model.ts:381-388` 等 ack | `NanoTerm.jsx:839-841` 到达即 `term.write` | 保持直写 |
| 失焦画布 | 无单独降频，靠 rAF 被浏览器拖死 | `NanoTerm.jsx:828-834` 500ms | 500ms 可以留。焦点或 `visibilitychange` 回到可见时，对该窗格 `term.invalidate()` 再 `paint()` |
| 信用 | 无此帧 | `lanes.js:124-129` 收到就回信用 | 保持。不要改成画完再回 |

改动点：`NanoTerm.jsx` 的 `schedulePaint`（828 行附近）增加可见性监听；不要改 `lane.onOutput` 的写入顺序。

### KA-3 醒来对齐，替换清屏快照

| 项 | 当前 | 目标 |
|---|---|---|
| 触发 | `ws.js:139-143` `pending + chunk > credit + SNAP_LIMIT` | 只在客户端声明「我刚从冻结恢复」时发一次对齐。信用耗尽不再发清屏快照 |
| 载荷 | `ws.js:153-158` `CSI 2J` + 200 行纯文本 | 镜像当前屏的转储（已有 `screenText` / `dnt_dump`），带单调序号。不发清屏转义去冒充网格 |
| 客户端 | `lanes.js:124-131` 把 SNAPSHOT 当普通字节 `onOutput` | 恢复帧：丢掉该序号之前的字节，整屏替换页面 wasm，然后只接收序号之后的 DATA |
| 对照原生 | 原生超限是失败连接再 `serialize()` 整屏 | [DNT] 不失败这条连接，也不把历史动画重放一遍 |

`FR_KIND.SNAPSHOT` 的编号 7 保持不变（`ws.js:94`）。变的是载荷语义，两端在同一个升级包里一起改。这不是新 lane，也不是新错误码。

### KA-4 重连走当前屏

| 项 | 当前 | 目标 |
|---|---|---|
| 附着后 | `web-routes.js:129` `replayInto` 最多 512KiB 原始字节（`sessions.js:474-475`） | 附着后先发 KA-3 的当前屏对齐。replay 环只留给还没能力对齐的旧客户端；新客户端忽略它 |
| 上限 | `sessions.js:57` 512KiB | 不加大。加大只会让快进更长 |

### KA-5 多窗格 resize 与 DPI

| 项 | 当前 | 目标 |
|---|---|---|
| 测量 | `NanoTerm.jsx:858-866` 每次 `ResizeObserver` 都 `term.resize` + `lane.resize` | 列/行在一个动画帧内合并；与上次已提交给 PTY 的尺寸相同则不再 `lane.resize` |
| 模拟器重排 | `lib.rs:225-231` 列变化就 `reflow_cols` | PTY 会自己重画的那一次（Windows ConPTY）不要再先重排一遍。尺寸抖动被 KA-5 收成一次之后，只保留一次重排或一次 PTY 重画，二选一，不能两遍都写格子 |
| DPI | `render.js:104` 构造时取一次 `dpr` | `devicePixelRatio` 变化时重测 `dpr`、`charW`（`render.js:158-162`）、`cellX`（`render.js:214`）并 `invalidate()` |
| 光标 | `render.js:318` 整数列 | 仍然按列，不按字形像素追。格子宽度正确之后，光标才跟得上 |

Windows 启动行 `sessions.js:32-34` 与 `sessions.js:125` 不在这个包里改。问题不在 `cmd.exe` 相对于 zsh，而在 resize 双写和 DPI。

### 建议落地顺序

1. KA-1 测试先钉住现有寿命，避免后面的改动把卸载路径改宽。
2. KA-2 可见即画。不改协议。
3. KA-5 resize 迟滞与 DPI。直接减少业主在 Windows 多窗格上看到的错位和吞字。
4. KA-3 与 KA-4 成对改快照和重连。协议载荷变了，两端一起提交。
5. KA-0 交给宿主。本仓在台账里保持「信号已有、宿主未接」直到宿主改动落地。

### 测试

- 隐藏文档、失焦窗格：不调用 `closePaneSession`，wasm id 仍接受写入。
- 失焦期间写入的字节，重新可见的第一帧能画出来，且不是逐块补动画。
- 恢复帧之后，序号以前的 DATA 不进 wasm；序号以后的 DATA 按原样进入。
- `CSI 2J` 不再出现在 SNAPSHOT 载荷里。
- 列数在一帧内抖动两次，`lane.resize` 只发出最终尺寸一次。
- `devicePixelRatio` 从 1 变到 2，`charW` 与画布像素尺寸跟着变。
- 现有 `node test/run.mjs` 保持通过。不把本文件变成新的发布门禁。

---

## 7. Verdict

做完这个升级包之后，[DNT] 和原生 [dsh] 终端的差别会变成一条明确的产品选择，而不是一组碰出来的症状。

**人离开时。** 原生把帧堆在 2MiB 队列里，回来快进。 [DNT] 在页面还活着时逐块注入；页面冻过之后，回来看到的是宿主镜像的当前屏，不是一段被加速播放的历史。

**进程还在不在。** 两者的壳都在宿主里。 [DNT] 继续用 30 分钟无附着加 `keep` 决定收不收会话。额外的差别是：只要 `anyLiveTerminals()` 为真，宿主就应当不挂起应用、不节流终端窗口。这一条本仓发得出信号，实现在宿主。合盖仍然不承诺。

**主 wasm。** 它本来就不是会被垃圾回收随便收走的对象，而是主线程上的单例。升级后，失焦和隐藏不再有任何路径能 `dnt_free`。真正丢掉页面时，权威状态在宿主镜像，不在一个假的 Worker 里。

**Windows 多窗格。** 光标乱飘和吞字不再靠「再开一个终端试试」。同一轮布局只提交一次 PTY 尺寸，DPI 变化会重测格子，清屏式快照退出恢复路径。多开仍然共用一个 wasm 实例，但每个窗格仍是自己的 id，这一点保持不变。

**不带来的东西。** 不增加沙箱终端，不增加密码或 token，不把交互字节改道到 HTTP，也不承诺在系统睡眠期间继续跑壳。那些不属于 1117-keep-alive。

---

## 8. 性能观测与渲染优化（A/B 实验 → P0-P2 交付映射）

本章节记录 2026-11-17 在同一会话下由[业主]驱动完成的「埋点梳理 + A/B 实测」及其交付设计。测量全部在 `dsh-dev` 真宿主、真页面（ego-lite Chromium）里进行；harness 为 `dsh-nano-terminal/scripts/ab-render-perf.mjs`。

### 8.1 [业主]心智模型

- [DNT] 作为「高性能 wasm 终端」，性能是它相对内置终端的立身理由；但此前的观测**只有控制面浅计时，没有渲染面与数据面**，性能主张无法自证。
- 想知道埋点到底对不对：哪些路径计了时、哪些没有、缺的是不是真正的痛点（渲染、数据面、attach 冷启动）。
- 想要一个可复跑的 A/B：[DNT] vs 内置 zsh xterm，在同一台宿主、同一对话里做相同工作（flood / 翻页 / 键入回显 / TUI 启动），拿「输入 → 可见变化」的端到端数字。

### 8.2 实验设计（测量如何准确）

- **时钟**：页面内 `Date.now() - performance.now()` 求差，把 `performance.now` 换回 epoch ms 与宿主时间戳对齐。
- **渲染面探针**（页面内 `window.__AB`，跨轮持久）：base canvas `fillRect/fillText/drawImage` 打点（只记时间戳，不读像素）；`.xterm .xterm-rows` textContent 33ms 轮询；rAF 节奏；`PerformanceObserver('longtask')`。
- **宿主面**：`term.session.read`（mirror）记 `tHostSeen`；`term.send`/`term.session.input`/`term.keys` 作输入。
- **语义对齐**：两种渲染器（canvas vs DOM）统一按「输入时刻 → 首次/末次可见变化」算端到端，不按渲染器内部语义。
- **焦点修正**：rAF 受窗口/窗格聚焦影响（失焦 ~2Hz 慢绘），测量前先 `el.focus()`。

### 8.3 实测结论（`ab-render-perf-report.json`）

| 场景 | [DNT] | 内置 xterm | 备注 |
|---|---|---|---|
| 键入回显 | **14ms 中位（p95 22）** | ~1016ms | xterm 是 ≤ 值的上界（见下） |
| 5000 行 flood → mirror 可见 | **72–90ms** | ~860–900ms | 同上 |
| TUI 首个画面 | ~600–1600ms | ~865ms | devin/claude/droid 近似 |
| less 翻页 | 聚焦 ~120–170ms | ~870ms | |

两条结构性事实：

1. 内置终端的可见更新呈 **~1s 量化**（`TerminalFollower` 批量节拍），这是 xterm 数字的主因而非渲染慢。
2. [DNT] **未聚焦 pane 固定走 ~500ms `slowTimer`**（`NanoTerm.jsx:849` 省电设计），有数据流入时也照样节流，flood/scroll 时延被拉到 ~650ms——这是本轮暴露的最大真实问题。

### 8.4 埋点合理性裁决

- 合同面（`createWebRegistrar`）：http-exact / http-prefix / upgrade-exact **全部有** `ms` 计时（早前"upgrade/prefix 无计时"的判断经重读源码修正）。✅
- 数据面（WS 入站字节、广播、attach、spawn、gate 排队）：**无**。❌
- 渲染面（paint 帧耗、单元格、input→paint）：`src/perf/declaration.json` 的 `spans/tracks/buckets/scenarios/budgets` **全空**。❌
- 读取出口：`ensurePerfReviewHost()` 已接，但 `lib/bindings.js` 无 `perf-review/host` 路由。❌

**结论：不合理**——性能主链路（WS 数据流 → wasm ingest → canvas paint）零观测，痛点不可见。

### 8.5 P0 埋点补齐（本升级包直接交付）

| 项 | 落点 | 内容 |
|---|---|---|
| `declaration.json` | `src/perf/` | 填入真 `spans/tracks/usage/hostSpans/buckets/scenarios/budgets`（不再全空） |
| 页面 `perf.js` | `src/client/perf.js`（新增） | `ensurePerfReview().join('nano-terminal', …)`，`root()` 指向 `.dnt-root`，profiler 包 `NanoTerm` |
| 渲染 spans | `NanoTerm.jsx` | `dnt-paint`（帧耗）、`dnt-cells`（单元格 track）、`dnt-attach`（mount→onReady）、`dnt-echo`（input→首帧 paint） |
| 数据面 usage | `lanes.js` | `dnt-ws-in-bytes` / `dnt-ws-in-msgs` / `dnt-ws-out-bytes` |
| 宿主 spans | `sessions.js` / `mcp.js` | `dnt-spawn`、`dnt-attach`、`dnt-pipe-broadcast`、`dnt-gate`（排队）、`dnt-input`、`dnt-agent-send`；计数 `dnt-out-bytes` |
| 读取路由 | `web-routes.js` + ledger | 新增 `dnt.perf-review.host`（`GET /dsh-nano-terminal/perf-review/host`，exact），`handleHostRead` 挂宿主单例 |
| 账本 | `security/route-sensitivity.json` + `lib/bindings.js` + `declaration.json` | 新路由需 durable 登记（[业主]已授权本轮交付） |

### 8.6 P1 测量常态化（`dev-probe` 常驻 + harness 固化）

- `src/client/dev-probe.js`（新增）：`?dnt-probe=1` 或 `localStorage['dnt-probe']='1'` 时把 canvas 打点/textWatch/rAF/longtask 装进 `window.__AB`，重启/重载自愈（本轮最大失败源是重载后探针丢绑定）。
- `scripts/ab-render-perf.mjs`：场景矩阵 = 回显 / flood / less 翻页 / TUI 启动；先自检环境（bench pane ≥300×200、`meta.cols≥80`、live zsh），不稳自动新建 pane；`term.keys` 遇 blocked 自动降级 agent 输入；`resetShell` 用 `Ctrl+L`（`clear` 在 devin 标题劫持下会误触 TUI）；TUI 以 `tFirstVisual` 为主指标、marker 为辅。
- 阈值断言（budgets，进 declaration）：`dnt-echo p95 < 50ms`、`dnt-paint p95 < 16ms`、`dnt-attach p95 < 3000ms`；harness 末尾按这些门给出 PASS/WARN。

### 8.7 P2 渲染/数据面优化

| 问题 | 改动 | 落点 |
|---|---|---|
| 失焦 pane 固定 500ms 节流，数据活跃期也被降速 | **活跃期自适应**：WS 字节到 → `activeUntil = now+1500ms`，期间仍走 rAF；空闲 500ms→1000ms 退避。仅作 fallback 定时器存在。 | `NanoTerm.jsx:845` `schedulePaint` |
| 占位 session 拒绝输入（`terminal not spawned yet`） | `writeInput`/`agentSend` 在 `pending` 且 `!handle` 时先 `spawnPending(this)`，写入与 attach 一样唤醒 shell。 | `sessions.js:519` / `538` |
| WS 出站/广播零计时 | `Attach.data` 计数 `dnt-out-bytes`；`pipe()` 广播耗时 `dnt-pipe-broadcast` span；`spawnPending`/`openFlow` attach 记 `dnt-spawn`/`dnt-attach` | `ws.js` / `sessions.js` / `web-routes.js` |
| CREDIT 协议面 | 不改协议。CREDIT/背压语义属公共合同，本轮只加观测点，是否收紧窗口留给 [业主] 裁决。 | — |
| wasm 脏区渲染 | 不动 ABI。先靠 `dnt-cells`/`dnt-paint` 量出真实占比，若 wasm 输出 dirty rect 有收益再走协议/ABI 变更。 | — |

### 8.8 不带来的东西

不增加新的渲染器（仍是 canvas + wasm），不把 xterm 换进 [DNT]，不引入第三方可观测后端，不建发布门禁（budgets 只是 `audit`/`hard` 声明，是否强制由 [业主] 决定），不碰 `dnt-ws-v2` 协议语义。

### 8.9 验证记录（dsh-dev 实测，2026-11-17 夜）

- 测试：`node test/run.mjs` 173 passed / 0 failed。
- 路由：`GET /dsh-nano-terminal/perf-review/host` → 200，合同面同时记录 `dnt.perf-review.host` 的 `ok`/`rejected` 事件。
- 宿主 span 实采：`dnt-spawn` 154/82ms、`dnt-pipe-broadcast` 0.02–3.3ms、`dnt-gate` 0.49ms；counts `dnt-out-bytes`、`dnt-ws-in-bytes`。
- 页面 join：`Symbol.for('dsh.perfReview.v2')` 插件表含 `nano-terminal`；实采 `dnt-attach`×3、`dnt-paint`×7、`dnt-echo`×2、`dnt-panes` usage。
- dev-probe：`localStorage['dnt-probe']='1'` 后 reload，`window.__AB.__probe === 'dnt-dev-probe-v2'` 自动武装，70 条 paint op 落账。
- lazy-spawn：持久化 session 在宿主重启后归位 pending；未 attach 直接 `term.session.input` → 自动 spawn 且 `ok:true`（不再 `not spawned yet`）。
- A/B 复跑：flood `tHostSeen` DNT 84ms vs xterm 899ms；echo 10/17ms vs 101/1063ms。`tLastVisual` 为空为 harness 探针失绑 artifact（reload 后旧 `__AB` 失效；dev-probe 常驻化即针对此问题）。tui 两侧皆因页面 fetch/CORS 与视图切换中断，与本包无关。
