# DNT01-1114 · dsh-nano-terminal 升级工作台账

| 项 | 值 |
|---|---|
| 编号 | DNT01-1114 |
| 对象 | [DNT] = dsh-nano-terminal |
| 日期 | 2026-11-14 |
| 依据 | `context/herdr`(agent-native 复用器) + `context/herdr-core`(headless 运行时 `hc`) 双参考系调研;对 `dsh-nano-terminal/` 全部源码逐文件检索 |
| 范围 | 协议/接口、功能/性能、交互、上层抽象四轴缺口 → P0–P2 工作台账 → 测试收口 → verdict |
| 不在范围 | herdr 的"在终端里再模拟终端"兼容层(Kitty graphics、外层 TUI chrome、IME 嵌套终端)——DNT 渲染目标是浏览器 canvas,该整段不借鉴;自研 VT 完备性按需求补,不追全协议 |

**总映射结论**(herdr-core 验证过的最干净切法):**lane = 一种 holder 实现(纯传输适配);终端对象、事件流、状态协议、输入闸门、恢复语义是单一核心**。DNT 现状是三条 lane 各自实现 `{open,write,resize,close,onOutput,onExit,onReady}`(`src/client/lanes.js`),但尚无"单一核心"层——本台账即该核心的分期建设计划。

---

## 1. 协议与接口层缺口

### 1.1 数据面 `dnt-ws-v1`(src/host/ws.js + index.js)

| # | 缺口 | 现状定位 | 影响 |
|---|---|---|---|
| P-1 | **无协议版本协商** | `ws.js` handshake 只验 `sec-websocket-key`;路径名 `dnt-ws-v1` 只出现在注释与 MCP `attach.protocol` 字段(index.js openFlow)。hello 帧不存在 | 协议演进无抓手;herdr-core 的教训是 "codec 命名不可变 + hello 协商能力",DNT 连版本字段都没有 |
| P-2 | **无背压/信用制** | `SessionRecord.pipe()` 对 `sockets` 逐 socket `sendBinary`(sessions.js `pipe`),socket 写满无检测;browser 端 `LocalLane.onmessage` 每帧同步进 `term.write` | 渲染慢→TCP 堆积→宿主内存膨胀;hc 的解法是 256KiB credit + 落后 4MiB 改发重绘快照。DNT 的 ScreenMirror 恰好已有可序列化屏幕,快照方案现成 |
| P-3 | **attach 回放为裸字节洪泛** | `record.replayInto(socket, sendBinary)` 把至多 `replayBytes`(512KB)历史 chunk 一次性写回(index.js openFlow);浏览器端 wasm 需重放全部历史解析 | 大 scrollback 会话重连时首帧延迟与 CPU 尖峰;hc 语义是"屏幕快照 + 可选历史",DNT 只有"全量字节重放"一条路 |
| P-4 | **控制帧与数据帧混杂、无多路复用** | 同一 ws 上:opcode 0x02=PTY 字节、0x01=JSON 控制(open/resize/ping/ready/exit);一条连接只能服务一个 session(index.js:一个 socket 绑定一个 record) | N 个 pane = N 条 TCP;无 channel 概念,无法跑 hc 式 "channel 0 控制 + N attach 流";事件订阅无载体 |
| P-5 | **输入无闸门** | opcode 0x02 到达即 `record.writeInput`(index.js),MCP `term.session.input` 直达同一 `writeInput`(mcp.js) | 人类正在打字时 agent 注入文本会交错(hc 的 draft-wait Gate 正是为此存在);browser 与 MCP 两路输入无序列化 |
| P-6 | **退出/错误语义薄弱** | `exit` 文本帧带 `outcome`/`error` 字符串;`error` 帧只有 message;无稳定错误 kind 枚举 | UI/agent 无法区分 `not_found/blocked/finished/unavailable`;hc 的稳定 kind 枚举是对外合同的底线 |

### 1.2 控制面 MCP(src/host/mcp.js)

| # | 缺口 | 现状定位 | 影响 |
|---|---|---|---|
| P-7 | **工具面缺调度原语** | 现有 8 个工具:create/list/input/read/resize/close/audit/lane.status;无 `send`(带语义)/`wait`/`keys`/`interrupt`/`events` | agent 只能"写字节、读屏幕、轮询"——必然退回 sleep+grep 屏幕的坏模式;hc 的 wait/turn/--output/--children 原语全缺 |
| P-8 | **`term.session.read` 单一读法** | `rec.screenText(n)` 只回最近 N 行屏幕文本(sessions.js `screenText` → mirror.screenText) | 无 `source=visible|recent|detection` 分层、无 `--format ansi`、无 `--lines` 之外的 scrollback 深读;全屏 app(alt-screen)读不到历史(hc 用 stitch 兜底) |
| P-9 | **`term.session.create` 只产 id** | 返回 `{id, lane, title, attach}`;无 `name`/统一地址、无 `parent`、无 `keep`、无 `label`、无环境注入声明 | 无"终端即持久对象"语义:不能按名寻址、不能父子编排、不能 keep 恢复 |
| P-10 | **lane 参数形同虚设** | `lane!=='local'` 直接抛错(mcp.js create 分支) | MCP 控制面与三条 lane 的拓扑不自洽:本宿主只当 server,lane 选择只在浏览器端 `makeLane` 生效 |
| P-11 | **无事件通知** | MCP 只有请求/响应;notifications/* 被忽略 | agent 拿不到 `status/turn/title/exit/foreground` 事件流;DNT 连轮询锚点(turn 计数器)都没有 |
| P-12 | **schema 无单源** | `TOOLS` 数组手写(mcp.js),`/term` slash 文本手写(index.js),ws 帧格式散在注释 | 违反"不得擅自扩约"的内部落地:合同改一处要同步三处,迟早漂移;hc 的 OpenRPC 单源生成是正解 |

### 1.3 REST + slash(index.js)

- `/sessions`、`/health`、`/session/:id/close` 只有最小面;无 `/events`(SSE/ws)、无 `/layout`、无 `/screen` 快照端点。
- `/term` 子命令只有 `new|list|close|attach`;无 `send/read/wait/keys/interrupt/keep/label`——agent 走 slash 通道时能力比 MCP 还窄。

### 1.4 lane 合同(src/client/lanes.js)

- 合同 = `{open,write,resize,close,onOutput,onExit,onReady}`,无 `attach(sessionId)`(重连已存在会话)、无 `snapshot()`、无 `status` 上报、无信用回填。
- `McpLane` ws 断开 = `onExit` 终局(lanes.js onclose),远端 session 其实还活着——**缺"断线≠退出"的 lane 状态机**(hc:断线 lane 保留缓存态+dimmed,独立重连)。
- `IsolateLane` 是 echo REPL stub,不承载任何真实隔离语义(预留,见 §4)。

---

## 2. 功能与性能缺口

### 2.1 会话生命周期

| # | 缺口 | 现状定位 | 影响 |
|---|---|---|---|
| F-1 | **无持久化** | `SessionRegistry.sessions` 纯内存 Map(sessions.js);`termStores` 仅 module-scope Map 存活于页面生命周期(NanoTerm.jsx termStore) | 宿主重启/插件重载 = 全灭;herdr 的四级存活承诺表(detach/重启布局/history/resume_argv)DNT 只有第 1 级 |
| F-2 | **无布局序列化** | BSP 树 `{type:'split',dir,ratio,a,b}|{leaf,laneSpec}` 已具声明式形态(NanoTerm.jsx)但无 export/apply;settings 是唯一 localStorage 持久项 | 刷新页面树还在(termStores 在同一 JS 上下文,但 page reload 即失);无"一键开工模板"的载体 |
| F-3 | **keep/恢复规约缺失** | `exited` 后 record 只等 sweep;retry 只重开 lane(新 session) | hc 语义"程序丢失→原地补 shell、绝不重跑、可选重放旧屏+分隔线"全无;`restore_screen` 类行为不存在 |
| F-4 | **idle sweep 是唯一 GC** | 30min 无 attach 即关(sessions.js sweep) | 无 `--rm`、无 keep 白名单、无 owner 生命周期绑定(die_with_parent) |

### 2.2 agent 状态与互操作(本轴最大空白)

| # | 缺口 | 现状定位 | 影响 |
|---|---|---|---|
| F-5 | **零状态协议** | `osc_dispatch` 已是空骨架(lib.rs:835),BEL 直接忽略(lib.rs:824);pane 相位只有 `opening/live/exited/error` 四级(NanoTerm statuses),无 working/blocked/done | "哪个 pane 卡住了、哪个在等回答"完全不可见——herdr 的核心卖点 DNT 一点没有 |
| F-6 | **无 agent 环境注入** | `registry.create` 传 `spec.env` 原样(sessions.js create),无 `DNT_TERMINAL_ID`/`DNT_API` 等注入 | pane 内 agent 无法反向寻址自己;hc 的 `$HC_TERMINAL_ID` + `--skill` 自助文档模式没有对应物 |
| F-7 | **无 notes/parent-child** | 无 parent 字段、无子→父信封、无 `<dnt from=…>` 约定 | "agents run agents"最小编排协议缺失 |
| F-8 | **无模板/first_message** | —— | hc templates(command+ready+submit+paste_gap)与"等 agent 首个状态报告再投递正文"的 first_message 语义缺失 |

### 2.3 渲染与传输性能

| # | 缺口 | 现状定位 | 影响 |
|---|---|---|---|
| R-1 | **双重解析开销** | 每 chunk 同时进 `replay` 缓冲 + `mirror.write` + 每 socket 各发一帧(sessions.js pipe) | 宿主侧每字节付两份 VT 解析(mirror)+N 份 ws 帧封装;mirror 解析是纯 JS 驱动 wasm,吞吐天花板低 |
| R-2 | **无增量扇出协商** | ws 帧就是原始 PTY chunk;attach 重放全量(P-3) | 无 `surface_delta/snapshot` 能力位;滚动大流量时带宽=原始字节,没有压缩/scroll-region 语义 |
| R-3 | **非聚焦 pane 无降级** | 所有 pane 的 `lane.onOutput` 都进 `term.write`+`schedulePaint`(NanoTerm.jsx);TermPane 不可见时仍 rAF 绘制 | herdr 红线"hidden pane 零呈现"未贯彻:非聚焦 lane 应只同步元数据,聚焦才流屏 |
| R-4 | **rAF 无合帧上限** | `schedulePaint` 每 output chunk 排一帧(已有 raf 去重),但 `term.render()` 每次全量打包 dirty 行 + `decoder.decode` 全屏 text + `byteToJs` 映射表重建(wasm.js render) | 高频输出时 JS 侧解码成本 O(屏幕文本);`byteToJs` 每帧新建 Uint32Array 是明显可省项(可缓存至 textLen 变化) |
| R-5 | **FrameParser Buffer.concat** | `ws.js feed` 每 chunk concat 一次 | 高频下 O(n²) 拷贝;PTY chunk 小所以当前无痛,但与 P-2 背压改造一起顺手换环形缓冲 |
| R-6 | **无性能埋点** | `dnt.apply` localStorage 只有里程碑标记;无帧率/字节吞吐/解析耗时统计 | 无基线则无优化验收——收口需要先有测量 |

### 2.4 wasm 核心完备性(crates/dnt-core/src/lib.rs)

- 已有:VecDeque grid + dirty-row、scrollback(默认 2000,上限 100k)、DECAWM/bracketed-paste/mouse(1000/1002/1003/1005/1006)/focus(1004)/alt-screen、OSC 0/2 title、dirty-all 滚动重绘、`scroll_off` 视口。
- stub/缺失:**OSC 7501(状态协议,osc_dispatch 骨架在)**、OSC 52 剪贴板、OSC 8 hyperlink(`hyperlinks` 计数器是死字段)、CSI ? 2026 同步输出、combining 序列(注释自承 "collapsed for prototype")、Kitty keyboard、`screenText` 只读屏幕行(host mirror 有、browser 未暴露文本导出 API——selection/copy 的底层缺一块)。

---

## 3. 交互层缺口

| # | 缺口 | 现状定位 | 影响 |
|---|---|---|---|
| I-1 | **无选区/复制** | canvas 渲染无文本层,mousedown/mousemove 已全部转 SGR mouse 转发(NanoTerm.jsx);backlog 中 | 终端不可复制 = 不可用底线;需要 wasm 暴露行文本导出 + 拖选 overlay + copy-mode |
| I-2 | **copy-mode 缺失** | 无键盘导航层 | herdr 语义可直接抄:`prefix+[` 进入、hjkl/`/`,`?` 搜索、v 选区、y 复制、**不暂停输出、选区跨重绘保持** |
| I-3 | **右键无归属配置** | 浏览器默认菜单;`ContextMenu` key 被 encodeKey 吞掉返回 null | hc/herdr 的 `right_click=menu|pane` 二选一缺失;TUI 应用收不到右键 |
| I-4 | **键位面过窄** | 仅 ⌘E+T 视图切换(registerFixed)+ pane header 按钮分屏;无 pane 级 prefix、无键盘分屏/换焦/关窗/zoom | herdr 验证结论:**ctrl+alt 族与 IDE/浏览器冲突最少**,DNT 直接沿用;`prefix+?` 应升级为可搜索帮助(现 help dialog 是静态列表) |
| I-5 | **状态可视化只有四相** | `phaseDot={opening/live/exited/error}` + statSummary(NanoTerm StatusBar) | 无 working/blocked/done 五级、无 tab/pane 两级 rollup、无"done=idle 且未被本 client 看过"的 seen 语义、无 spinner 剥离的 title 归一化(herdr `terminal_title_stripped`) |
| I-6 | **无通知通道** | pane 内 BEL 被 wasm 吞掉(lib.rs:824),OSC 9/99 不支持 | agent 需要回答时业主无从感知;应转译为 host toast/通知,限流+活跃 pane 抑制 |
| I-7 | **分屏交互已完成但无 zoom** | splitter 拖拽已实现(startDrag→setRatio),ratio 入树 | 缺 `zoom`(单 pane 最大化 overlay)与 pane 间键盘换焦;`firstLeaf` 兜底逻辑在,但无 focus ring 键盘循环 |
| I-8 | **wheel/滚动无配置面** | 固定 3/8 行步长(NanoTerm wheel);`scroll_off` 无 PageUp/Home 直达顶/底 | 小问题,顺手并入键位工作 |
| I-9 | **MCP lane 断线即终局** | onclose→onExit,overlay 只有"重试"(新开 lane) | hc 语义:断线 lane dimmed 缓存态 + 独立重连 attach 同一 session;`?session=<id>` attach 路径 index.js 已支持,客户端没接上 |
| I-10 | **IME/CJK 未处理** | canvas 无 composition 事件;wide-char 已有 WIDE/WIDE_SPACER 但 IME 光标锚定无 | 中文输入走 keydown 逐键,IME 组合串会被错拆;`reveal_hidden_cursor_for_cjk_ime` 类处理缺失 |

---

## 4. 上层抽象与演进预留

### 4.1 目标结构(向 herdr-core 对齐)

```
┌─────────────── 单一核心(新增) ───────────────┐
│ Terminal Registry(统一地址 lane/name)        │
│ Event Bus(snapshot+seq+missed+heartbeat)    │
│ State Protocol(OSC 7501 + manifest 检测兜底) │
│ Input Gate(draft-wait + agent/human 序列化)  │
│ Turn Semantics(turn 计数 + wait 原语)        │
│ Recovery(keep + saved-screen + backoff)     │
└──────────────┬──────────────┬───────────────┘
        lane=holder(纯字节泵)   viewer=纯视图
   local=node-pty / mcp=远端管道 / isolate=wasm
```

落点:宿主 `src/host/` 新增 `core/`(registry 升维 + events + gate + state);`sessions.js` 退化为 local-lane holder;`mirror.js` 升为"核心持有的权威屏幕"。**上层建筑归 host** 红线不变:通知走 host toast、tab 归 host view、状态 rollup 只借 host 类。

### 4.2 预留扩展点(现在埋、不现在做)

| 预留 | 位置 | 形态 |
|---|---|---|
| 统一地址空间 | registry create 返回值增 `addr:"<lane>/<short>"`,id 照旧 | 兼容字段,不占新合同 |
| 协议版本 | ws hello 帧 `{proto:'dnt-ws',v:2,caps:[...]}`;v1 行为 = caps 空集 | 同 index.js openFlow 分支共存 |
| lane 插件化 | `lane.status` 已报三 lane;合同预留 `{kind, open, attach, snapshot}` 扩展位 | IsolateLane 换真实 isolate 时只动 lanes.js |
| OSC 7501 解析点 | `osc_dispatch`(lib.rs:835)加分支 + `dnt_state_*` 导出位 | wasm ABI 只增不改 |
| 文本导出 ABI | `dnt_line_text/dnt_dump` 导出位 | selection/copy-mode/read 共用 |
| 事件流载体 | MCP `notifications/term.event` + ws channel(或 SSE `/events`) | 先 MCP notify,channel 随 framed 协议落地 |
| manifest 检测 | `~/.dsh/plugins/dsh-nano-terminal/detect/*.toml` 目录约定 | P3 才实现,先把目录规约写死 |
| OSC 52/9/99 | osc_dispatch 分支 → `dnt_clipboard`/`dnt_notify` reply | 与 7501 同一出口机制 |

### 4.3 不预留的(明确否决)

- 不在插件内画自有 chrome(状态条/边框/通知样式一律 host token/类)。
- 不做终端内嵌浏览器/图形协议(Kitty graphics、Sixel)。
- 不给 pane 内程序当沙箱或权限代理(hc security 立场照抄:"不是沙箱")。
- 不与其他 nano 插件建专有通道(不得侧载)。

---

## 5. P0–P2 工作台账

> 每项含:目标特性、代码落点、合同增量、验收口径。编号 W-P{阶段}{序号}。

### P0 · 合同层(先把"单一核心"的对外形状钉死)

| 编号 | 工作特性 | 落点 | 验收 |
|---|---|---|---|
| **W-P0-1 统一终端对象与地址** | `TerminalRecord` 升维:`{id, addr='<lane>/<short6>', lane, name?, parent?, keep, labels{}, owner, createdAt, exited, status}`;name 可寻址(`mcp-x/review`);`addr` 进所有 API 返回、审计、UI title 位 | `src/host/sessions.js` SessionRecord+Registry;`index.js` openFlow ready 帧;`mcp.js` create/list 返回 | `/term list` 与 `term.session.list` 输出 addr;按 name 与按 id 寻址等价;审计事件带 addr |
| **W-P0-2 稳定错误 kind 枚举** | 错误对象统一 `{kind, message}`: `not_found/blocked/finished/live/unavailable/spawn_failed/conflict/name_taken/needs_target/incompatible`;ws error 帧、MCP isError 文本、slash 返回共用枚举表 | `src/host/errors.js`(新);mcp.js rpcError 改造;index.js openFlow catch;`/term` 各分支 | 每种错误路径有 kind;文档列枚举;UI 按 kind 映射提示 |
| **W-P0-3 事件订阅面(第一形态)** | MCP `notifications/term.event` 声明 + REST `GET /events`(SSE,浏览器可消费)+ registry 内 EventBus:`created/lost/finished/status/turn/title/size/labels/heartbeat(15s seq)`;订阅即得 snapshot+seq,掉队发 `missed`+新快照 | `src/host/events.js`(新);index.js 注册 `/events`;mcp.js initialize 能力声明;sessions.js 各状态变更点 emit | SSE 连接先收全量 snapshot;制造 exit 收到 finished+seq;断线重连按 seq 补 missed |
| **W-P0-4 schema 单源** | `schema/dnt-mcp.openrpc.json` 描述全部 `term.*` 方法+错误 kind+事件类型;`TOOLS` 数组由 schema 生成(或校验同源);`/term` help 文本从 schema description 生成 | `schema/`(新,纳入 files);mcp.js TOOLS 表重构;test/ 加 schema↔实现一致性测试 | schema 与 TOOLS 双向一致测试通过;新增方法必须先落 schema |
| **W-P0-5 OSC 7501 状态协议** | wasm `osc_dispatch` 增 7501 分支:解析 `state=idle|working|done|blocked|error|clear`、`kind=permission|question|auth`、`app`、`msg=<b64>`、多 record `id`;新增 `dnt_state`/`dnt_state_len` 导出(最新状态 JSON);JS 侧 modes 轮询合并进 render 循环 | `crates/dnt-core/src/lib.rs` osc_dispatch + exports;`src/client/wasm.js` state 方法;`src/host/mirror.js` 同步暴露 | pane 内 `printf '\e]7501;state=blocked:kind=question\e\\'` 后 UI 变 blocked;clear 复位;host mirror 同口径 |
| **W-P0-6 相位模型升五级 + rollup** | pane 相位 `{opening, live, exited, error}` 之外叠加程序自报态 `{idle,working,done,blocked}`;StateDot 双通道(色+形);statusbar 聚合"N working · M blocked";title 剥 spinner(herdr terminal_title_stripped 规则:剥末尾 ⠋⠙⠹… 帧) | `src/client/NanoTerm.jsx` statuses/reportStatus/StatusBar;`.dnt-dot` data-phase 扩展 | 无 7501 程序相位不变;有 7501 时 dot 反映程序态;statusbar 计数正确;title 不抖动 |

### P1 · 持久化与性能

| 编号 | 工作特性 | 落点 | 验收 |
|---|---|---|---|
| **W-P1-1 ws 协议 v2(framed+背压)** | 二进制帧 `[channel u32][kind u8][len u32][payload]` 套在现有二进制 opcode 内(kind:DATA/CREDIT/CLOSE/RESIZE/FOCUS/FACTS/AUTOMATIC_INPUT);channel 0=控制;attach 起始 credit 256KiB,viewer 消费回 CREDIT;落后>4MiB 改发 mirror 屏幕快照帧;hello 协商 `{v:2}` 否则走 v1 行为 | `src/host/ws.js` 帧层;index.js 升级 handler;sessions.js pipe 按 channel 扇出;`src/client/lanes.js` LocalLane/McpLane 升级 | v1 client 行为不变;慢渲染时宿主缓冲不超限;掉队触发 snapshot 帧而非积压;多 pane 可单连接(channel>0)但暂不强求 |
| **W-P1-2 会话持久化(session.json)** | `${DSH_HOME}/plugins/dsh-nano-terminal/session.json` 原子写(latest-wins 后台写):pane 拓扑(BSP 树)+cwd+cols/rows+title+lane+name;启动时恢复布局为"占位 pane"(不自动起进程,标注 last-seen 屏幕可选);48 份滚动快照 ≥15min 去重 | `src/host/persist.js`(新);sessions.js create/close/resize 钩子;index.js apply 启动恢复 | kill 宿主重进:`/term list` 见恢复占位;attach 后新 shell + `--- the program above ended ---` 分隔线(hc restore_screen 语义) |
| **W-P1-3 keep 语义** | `term.session.keep`/`/term keep`:程序丢失(signal 无 exit/holder 死)时 record 保持 live、原地补 shell、**绝不重跑原命令**;退避 1.5→3→6→12→30→60s,存活≥10s 重置;恢复中操作回 `unavailable`;`restarted` 事件后 client 重连 | `src/host/sessions.js`(record.keep/respawn);mcp.js+slash 新命令;NanoTerm exited overlay 增 keep 行为 | kill -9 子进程后 pane 自动回 shell;旧屏可选重放;正常 exit 与显式 kill 仍是终局 |
| **W-P1-4 布局持久化(client)** | BSP 树 `{split{dir,ratio,a,b}|leaf{lane,name,cwd}}` export/import;`localStorage['dnt.layout.<sessionId>']` 自动保存+手动 `/dnt` 菜单"恢复上次布局";恢复失败的 pane 留占位+错误(herdr 语义) | `src/client/NanoTerm.jsx` termStore 序列化;index.js client `/dnt` 菜单项 | 刷新页面布局可一键恢复;占位 pane 点击重连 |
| **W-P1-5 非聚焦 pane 降级** | pane 不可见(视图切换/失焦超过阈值)时:wasm 继续 `term.write` 但跳过 canvas paint;非聚焦 lane 可选只同步元数据(status/title),聚焦时补 snapshot;`dnt_render` 无脏行已返回 null,补"未渲染帧"计数 | `src/client/NanoTerm.jsx` hooks + visibility;lanes.js credit 上报联动 P1-1 | 切到对话 tab 后 CPU 占用可测下降;切回一帧内恢复画面 |
| **W-P1-6 渲染热路径优化** | ① `byteToJs` 映射表缓存(textPtr/textLen 指纹不变则复用);② `dnt_render` 文本区增量编码(run 复用上一帧相同前缀);③ `pipe()` 扇出前 chunk 合并(同 tick 多 chunk 合一帧);④ mirror 与 replay 共用一次解析结果(若可行) | `src/client/wasm.js` render;`src/host/sessions.js` pipe | 吞吐基准(见 §6)`yes` 洪泛下帧率与 CPU 有量化改善;无渲染回归 |
| **W-P1-7 headless 尺寸 + Display FACTS** | 未 attach pane 以 `headless_cols/rows`(默认 120×40)维持 wasm/mirror 尺寸;viewer FACTS 帧上报真实 cell 度量;host 代答 DA/颜色查询用默认值 | sessions.js record 尺寸语义;ws v2 FACTS kind;wasm 新增 `dnt_da_reply` 或直接进 reply 队列 | pane 无 viewer 时程序看到的尺寸稳定;attach 后一次 resize 收敛 |

### P2 · 编排与交互

| 编号 | 工作特性 | 落点 | 验收 |
|---|---|---|---|
| **W-P2-1 send/keys/interrupt/wait 原语** | MCP+slash 双通道:`term.send{id,data,enter,force,if:idle|working,wait}`(默认 bracketed-paste);`term.keys{id,keys[]}`具名键(enter/esc/ctrl+c/f5);`term.interrupt{id}`(报状态程序发 esc 否则 ctrl+c,返回 stopped/exited/still_working/unknown);`term.wait{id,timeout,output?,children:all|any}` 事件驱动(turn 计数:离开 working +1;timeout=check-in) | `src/host/` gate+turn 模块;mcp.js TOOLS+;index.js `/term` 子命令 | `send --wait` 绑定发起 turn;`wait --output X` 剥转义匹配;blocked 时 send 回 `blocked` kind,`--force` 豁免 |
| **W-P2-2 输入 Gate(draft-wait)** | 每终端输入队列:估算人类草稿字符(键事件流分析,Enter/^C/^U 清零,退格递减,bracketed-paste 整段计草稿);agent send/notes 投递前等 `notes_quiet`(默认 3s)或草稿存在时 `draft_wait`(默认 60s);agent 输入进行中人类字节 held;AUTOMATIC_INPUT 帧单列不计入人类活动;Gate 状态可 snapshot(P1-2 恢复带走) | `src/host/gate.js`(新);sessions.js writeInput 前置;ws v2 AUTOMATIC_INPUT kind | 用户打字中途 agent 注入不交错;配置 `dnt.gate` 可调;单测覆盖草稿计数 |
| **W-P2-3 环境注入 + agent 自助文档** | create 时注入 `DNT_TERMINAL_ID=<addr>`、`DNT_API=http://…/mcp`、`DNT_ENV=1`、`TERM_PROGRAM=dnt`、TERM=xterm-256color(已有);`/term skill` 或 MCP `term.skill` 输出一份 SKILL.md(agent 单读即会:spawn→send→wait→report→cleanup) | `src/host/sessions.js` create env;`docs/skill.md`(新);mcp.js 新工具 | pane 内 `echo $DNT_TERMINAL_ID` 命中自身 addr;agent 按 skill 文档可完成一轮编排 |
| **W-P2-4 notes/parent-child 信封** | create 带 `parent=<addr>`:子 blocked/exited 时向父终端打字 `<dnt from="…" state=…>…</dnt>`;`can_take_note` 门槛(live+非 blocked);news/seen/noted 计数去重(父 read/send/wait 即 seen);`notes=off` 配置面 | `src/host/notes.js`(新);registry parent 字段;gate 投递 | 子 agent blocked 父终端出现信封;父已读不重复打扰 |
| **W-P2-5 模板 + first_message** | `templates/<name>.md` 三横线 header(command/ready/submit/paste_gap_ms)+ body;`/dnt run <tpl> <task>` 与 `term.session.create{template,task}`;first_message:等 agent 首个 7501(默认 30s)或 `ready:quiet` 输出静默 800ms 再粘贴正文,结果持久可查 | `src/host/templates.js`(新);mcp.js create 参数扩展;client `/dnt` 菜单 | 未送达绝不盲重发(回执 `{sent,reason,turn}`);模板缺 command 报错 |
| **W-P2-6 选区与 copy-mode** | ① wasm `dnt_line_text`/`dnt_dump` 文本导出 ABI;② 鼠标拖选 overlay(cell 坐标→文本,不入 copy-mode 直接复制);③ `prefix+[` copy-mode:hjkl/wbe/`/`,`?` 搜索、v/V 选区、y 复制、选区跨重绘保持、输出不暂停;④ OSC 52 → 系统剪贴板 | lib.rs 导出;`src/client/select.js`(新)+keys.js 模式位;render.js 选区层 | 拖选复制纯文本正确;copy-mode 全程键盘可复制;OSC52 写剪贴板 |
| **W-P2-7 pane prefix 键位 + 可搜索帮助** | pane 级 prefix 默认 `ctrl+alt` 族(herdr 冲突最少结论):`prefix+d/v` 分屏、`x` 关、`z` zoom、`←→↑↓`/`1..9` 换焦、`[` copy-mode、`?` 帮助;`registerFixed` 注册不遮 host ⌘E;帮助 dialog 升可搜索(键名/动作模糊匹配) | `src/client/keys.js` prefix 层;index.js client registerFixed 扩展;NanoTerm help dialog | 与 host/浏览器快捷键零冲突实测表;pane 全键盘可达 |
| **W-P2-8 通知通道** | OSC 9/99 → host toast(借 host 通知 API/类,不自绘);BEL → statusbar 闪标;限流(每 pane 5s)+ 活跃 pane 抑制 + blocked 状态直达(7501 kind=permission/question 时toast 带"去回答"锚点) | lib.rs osc 分支→reply;`src/client/notify.js`(新);StatusBar 消费 | pane 内 `printf '\e]9;msg\a'` 出现 host 通知;聚焦 pane 不打扰 |
| **W-P2-9 MCP lane 断线重连** | lane 状态机 `connecting/live/dimmed/closed`:ws 断→dimmed(缓存态、最后一次屏幕保留)+指数退避重连 `?session=<id>` attach(index.js 已支持);overlay 显示"重连中"而非终局 | `src/client/lanes.js` McpLane+LocalLane;NanoTerm overlay/相位 | 断网 10s 内自恢复同 session(屏幕连续);远端真退出才落 exited |
| **W-P2-10 isolate lane 实体化(方向)** | IsolateLane 从 echo REPL 升级为真实 isolate:wasm worker(workerd 语义对齐则后置)+ 注入 lane 合同 `{open,attach,snapshot}`;产出形态由 [业主] 裁决(dnt-agent crate 或 JS worker)——本项只落合同与骨架,不绑实现 | `src/client/lanes.js`;预留 `crates/dnt-agent` | pane 跑真实可编程 isolate;合同同其他 lane 等价 |

### P3 · 检测兜底(排期外,仅登记)

- **W-P3-1 manifest 屏幕检测**:`~/.dsh/plugins/dsh-nano-terminal/detect/*.toml`,region/regex/AND-OR-NOT/priority/idle-fallback,对 live bottom-buffer(非用户 viewport)快照匹配;覆盖不接 7501 的程序;`agent.explain` 等价物返回命中规则。

---

## 6. 测试与收口约定

### 6.1 测试矩阵

| 层 | 手段 | 覆盖 |
|---|---|---|
| wasm 核心 | Rust `cargo test`(lib.rs 内)+ JS 驱动向量用例 | 7501 解析全分支、OSC52/9/99、选区文本导出、combining/宽字符回归、scrollback 边界、alt-screen |
| 宿主协议 | `test/run.mjs` 扩展:裸 socket 客户端跑 v1/v2 帧 | hello 协商、CREDIT 背压触发、掉队 snapshot、open/attach/resize/exit 帧序、错误 kind |
| MCP 面 | JSON-RPC 批调用脚本 | 每个工具 happy+error kind;schema↔TOOLS 一致性;events snapshot→增量→missed |
| gate/notes/turn | 单测(gate 纯函数) | 草稿计数、静默窗口、held 交错、turn 语义、seen 去重 |
| 持久化 | kill/restart 宿主脚本 | session.json 原子性、恢复占位、keep 退避表、restore_screen |
| 交互 | ego-browser 走查(已有 ritual) | 分屏/拖拽/zoom/换焦/copy-mode/通知/断线重连;host 快捷键冲突清单实测 |
| 性能 | 基准脚本(新增 `test/bench.mjs`) | `yes` 洪泛:解析行/s、帧率、宿主 RSS、每帧 JS 解码耗时;1 vs 8 pane 对比(对齐 herdr `bench-render-scale` 做法);**先记基线再优化**,结果写回本文档 §6.3 |

### 6.2 收口约定(DoD)

1. **合同先行**:任何 ws 帧/MCP 方法/事件类型变更必须先落 `schema/dnt-mcp.openrpc.json`(W-P0-4),实现不得反推合同——内部版"不得擅自扩约"。
2. **v1 兼容**:ws v2 与 MCP 新增只增不改;旧 attach 路径与 v1 帧序必须回归通过,否则不得合并。
3. **host 样式零手写**:新增 UI 一律 host 类/token;任何对宿主样式的修正必须带中文注释说明修哪块(沿用修正①②③先例)。
4. **审计完整**:create/input/send/wait/keep/close/note 全量进 `audit.jsonl`,含 addr 与 actor(mcp/slash/ui)。
5. **文档同步**:AGENTS.md「使用」表、交付物表(lib/ 新增文件)、`/term` 子命令表随代码同 PR 更新。
6. **三实例部署**:dev node_modules + `~/.dsh-desktop/plugins/` + `~/.dsh/plugins/` 同步,dev 重启 + 桌面刷新验收(沿用现有 ritual)。
7. **dead CSS/代码清扫**:随 P2 收尾清 `.dnt-statusbar-*` 遗留、未用 glyph/分支。

### 6.3 性能基线(P1 开工前先跑一次)

- 记录:2000 行 scrollback 下 `yes` 30s 的解析行/s、主线程帧率、宿主 RSS 增量、attach 重放首帧耗时、8 pane 同开 CPU。
- 写回本节表格后与 P1-6 优化结果对比,无基线不宣称"优化"。

### 6.4 明确不做(防止范围漂移)

- 不做 herdr 式外终端兼容层、Kitty graphics、Sixel、IME 嵌套终端;
- 不追 VT 全协议(combining/hyperlink 按真实需求补,不预防性实现);
- 不动 host 侧上层建筑(tab 系统/通知中心本体);
- 不与 dsh-mini/nano-agent 耦合(插件中立);lanes 扩展只走 MCP/公开合同,不建专有通道。

---

## 7. Verdict · 辩证判断

**正面(升级后预期收益)**

1. **定位跃迁**:DNT 从"wasm 渲染的终端视图"变为"**dsh 内的 herdr-core**"——终端对象、事件流、状态协议、输入闸门、恢复语义成为单一核心,lane 退化为传输适配。这是结构性的:此后所有 agent 编排能力都长在这块地基上,而不是堆在视图层。
2. **agent 一等公民**:OSC 7501 + wait/turn + notes + templates 的组合让 chat agent 第一次能"开 pane→喂任务→等回合→收汇报",而且语义是事件驱动而非屏幕轮询——这是 [DNT] 在 [dsh] 内"发挥更大作用"的实质路径,也是两条参考系共同验证过的最小编排闭环。
3. **性能正确性**:背压+掉队快照把"渲染慢→内存爆"的隐性风险变为有界行为;非聚焦降级把 pane 数量从线性成本压到近常数。**注意:收益以基线测量为准(§6.3),无量化不宣称**。
4. **交互下限补齐**:copy/选区/通知/断线重连是"终端能不能日用"的及格线,prefix+可搜索帮助把上限抬到键盘党专业水准。

**反面(必须直面的代价与风险)**

1. **复杂度前置**:P0 合同层产出的是"看不见的能力"(schema/错误枚举/事件流),短期 UI 无感——如果 P1/P2 不跟进,P0 是纯成本。台账按依赖排序正是为此:P0 是 P1/P2 的地基,不是独立交付。
2. **VT 完备性是吞金兽**:herdr 最终 vendored libghostty-vt 说明自研 VT 的深水区(combining、hyperlink、各类私有序列)会持续吸血;dnt-core 维持"够用即可"的纪律比追求完备更贵——**每次 stub 升级都要有真实触发场景**,否则不做。
3. **双核心一致性**:browser wasm 与 host ScreenMirror 是同一份二进制的两个实例——状态语义天然一致,这是优势;但 host 侧 JS 驱动 wasm 的吞吐天花板(R-1)意味着 mirror 永远比真 PTY 慢半拍,大流量下 mirror 快照可能滞后——设计上接受滞后(mirror 是 best-effort 权威),不为它加第二条解析管线。
4. **合同面膨胀风险**:term.* 方法会从 8 个涨到 ~20 个;没有 W-P0-4 schema 单源,这就是漂移温床——所以 schema 不是"文档工作",是 P0 的硬闸门。

**净判断**:升级方向正确且必须分层交付。**真正的价值拐点不在任何单一功能,而在"DNT 成为 dsh agent 可编程的终端运行时"**——当 `term.send --wait` 与 `wait --children` 可用时,DNT 就从"业主手用的工具"变成了"agent 手用的运行时",这与 [nano-agent] / Harness-as-a-Service 的大方向同构,但不耦合:合同是 MCP/OSC 公开语义,谁实现都行。
