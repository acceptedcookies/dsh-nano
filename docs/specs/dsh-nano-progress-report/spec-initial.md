# dsh-nano-progress-report（DNPR）——Progress 工作台视图规格

> 规格初稿。源于 2026-11-18 与业主的讨论：参照 devin-cloud-session 的 Progress
> 视图，让每一个本地工作区 session 的右侧工作台都拥有一个「推进视角」tab——
> 时间序执行事件流 + 过滤 + Tasks/todo 追踪。
> 证据层：宿主 asar 源码（`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`，
> 用 `node /tmp/dnpr-asar/extract.js cat|ls|find|grep <asar路径>` 读取）与本仓测试基建。

| 元信息 | 值 |
|---|---|
| 包名 | `dsh-nano-progress-report` |
| 插件 id | `nano-progress-report` |
| 缩写 | `[DNPR]` |
| 类型 | [dsh] overlay：浏览器进度视图 + 宿主只读摘要；无宿主路由 |
| 平台 | web（desktop 同页面体系自动跟随，不单独声明） |
| dsh 引擎 | `>=0.2.2-rc.5 <0.3.0`（以 `package.json` 为准） |
| 挂载面 | `conversation.view` 主入口、会话头部动作和 `sidebar.right.pane.tab`（kind=`progress`） |
| 数据面 | `uiConversation.events/views` 注册自建 view target `'progress'`；`session.projections.faceOf('todos')`；`ctx.jobs` |
| 视图前缀 | CSS/类名前缀 `npr-`；根标记 `data-nano-progress-report="1"` |

## 1. 参照物解剖（截图事实层）

devin-cloud-session 的 Progress 视图（用户提供的两张 session 截图）：

- **挂载**：右侧工作区一个独立 tab（标签 `Progress`），与 `Files`、`*.pdf` 等资源 tab 并列；即本仓词汇里的 [dsh工作台] tab。
- **事件流**：按时间正序的执行事件行。每行 = 类型图标 + 单行摘要 + 右侧相对时间。可辨行型：
  - `⊞` 用户指令（自然语言任务输入）；
  - `$` shell 命令（`cd … && unzip -o … && find … | sort`）；
  - 文件读/写（`News Prompt.txt`、`content.txt` 等，另有 `Read`/`wc -w`/`sed -i`）；
  - `🌐` web fetch（`Fetched web page content · 1 page`）；
  - `📋` 产物/文件卡（`.txt`、`.png` 生成）；
  - agent 状态行（`Devin is awaiting instructions`、`Fetched …`）；
  - 展开箭头（`▸`）展开内联输出/子节点（如 `puppeteer`/`pdftotext` 的后续行）。
- **过滤栏**：`Search or filter (type:shell, -status:failed)…`——`type:`/`status:` token（带 `-` 取反）+ 自由文本。
- **Tasks 面板**：底部 `Tasks` 区块，`8/8 done` 进度条 + 逐项（content + 完成时间），来自 agent 的 todo 追踪。
- **Devin 侧元素（不归本插件）**：`IDE` 按钮、`Watch Devin work live`、artifact 预览 tab——属于 Devin 宿主，不在 DNPR 复刻范围。

功能归约：**DNPR = 会话执行轨迹的第二视角渲染器**。同一份会话事件，chat 视图按消息组织，Progress 视图按执行单元组织（用户指令 → 工具调用 → 结果 → 状态），加过滤与 todo 追踪。

## 2. 需求判定（overlay 层）

| 需求 | 归所判定 | 理由 |
|---|---|---|
| R1 每 session 一个 Progress tab | 插件（client） | `sidebarRightTabs.register` + `sidebar.right.pane.tab` 是公开两段式接口，DNCS 的 `native-workbench.js` 是同路径先例 |
| R2 事件时间轴投影 | 插件（client） | `uiConversation.events.register`/`views.register` 是宿主官方扩展面（trajectory 插件证明第三方同构） |
| R3 type:/status: 过滤 | 插件（client） | 纯视图态，从 projection 过滤，不落盘 |
| R4 Tasks/todo 面板 | 插件（client） | `session.projections.faceOf('todos')` 官方投影已带 turn 清零语义与 counts，零成本只读 |
| R5 Jobs（后台任务）面板 | 插件（client） | `ctx.jobs`（`dsh-api-job-controller`）是第三方可读服务面：`watchRows(sessionId)` + `state.rows` |
| R6 事件数据本身 | **宿主（不得碰）** | 会话事件流是唯一真源；插件只投影，不复制、不写、不重放 |
| R7 页面组合/宿主路由 | **宿主（上层建筑归host）** | [DNPR] 不开路由或自建状态文件；宿主摘要独立于页面，见 §9 |
| R8 工具呈现组件复用 | 槽位 `tool.call.toolview` | 工具行展开详情时按 keyed slot 复用宿主 toolview，不自绘参数/结果面板 |

被否决的路径（登记，防回摆）：

- **读 trajectory target 的快照**：`target('trajectory')` 的 `ConversationViewSnapshotMap` 键是 TS 合并类型，跨包消费等于把渲染绑定在另一插件的私有结构上；且 trajectory 未启用时无数据。**否决**，自建 `'progress'` target。
- **从 chat DOM / tool row DOM 反向采集**：违反 [UI 宿主优先] 禁条（不得嫁接宿主内部 DOM）。**否决**。
- **宿主路由 + 服务端重建浏览器时间线**：事件已在 client 装配引擎内，不再复制一份面向浏览器的时间线。§9 的宿主摘要不回送客户端。
- **自建 IndexedDB/localStorage 事件副本**：违反 [单一真源]——允许落盘的只有 consumption receipt（过滤词、折叠态这类纯视图态）。**否决**。
- **改写/接管 builtin kind**：`progress` 是全新 kind，不接管 `files`/`guide`/`terminal`。

## 3. 协议层设计（接缝契约）

### 3.1 事件词表 → 行型映射

事件包络（`dsh-session/src/types.ts:508-540`）：`{type, seq, time(epoch ms), data, …}`；
`SessionEventLike = SessionEvent | AssistantLiveChunkEvent`（`dsh-api-session-controller/…/contract/events.ts:22`）。
**没有 status 字段**：成败在 `tool/result.message.isError` 与 `data.error`；`TurnEndReason` =
`completed|aborted|blocked|error|max-tokens|interrupted|forked`（`types.ts:218-246`）。

| Progress 行型（`type:` 值） | 事件源 | NodeDefinition id 规则 | 状态判定 |
|---|---|---|---|
| `prompt` 用户指令 | `user/message`（`data.source.kind==='user'` 判定真人 vs 注入） | `String(seq)`，start-only | — |
| `message` agent 文本 | `assistant/message` 的 text block（`AssistantMessageNode.blocks[kind:'text']`） | `` `${turn}:${step}` `` 归并到 step 级 | interrupted → `failed` |
| `shell` | `tool/call` name ∈ `{bash,pwsh}` | `callId`（`tool/result` 用 `message.source.callId`/`toolCallId` 回指） | `isError`/`error` → `failed`；未见 result → `running` |
| `file` | `tool/call` name ∈ `{read,write,edit,glob,grep,working_directory}` | 同上 | 同上 |
| `web` | `tool/call` name ∈ `{web_fetch,web_search}` | 同上 | 同上 |
| `tool`（兜底） | 其余 `tool/call`（含 `skill`、`todo_write`、`workflow`、`schedule_*`、`subagent*`、`present`、`todo_write` 不在此列——见 `todo`） | 同上 | 同上 |
| `todo` | `todo/call` name='todo_write' 或 `todo/write` 事件 | `String(seq)`，start-only | — |
| `subagent` | `tool/call` name ∈ `{subagent,subagent_fork}`；子调用挂 `ToolCallBlock.subCalls` | 同上 | 同上 |
| `wait` | `tool/call` name ∈ `{wait_agent,send_message}` 或 `agent/inbox/spliced` | 同上 | — |
| `turn` 边界 | `turn/end`（`reason` 进摘要） | `String(seq)`，start-only | `error|aborted|max-tokens|interrupted` → `failed` |
| `job` | `job/registered`/`job/settled`（`JobRegisteredData{jobId,owner,kind,label,toolCall?{callId,rootCallId}}`） | `jobId` | `settled.status` |
| `lifecycle` | `session/end-seed`、`compaction/*`、`plan/mode`、`model/selection` 等低频事件 | `String(seq)`，start-only | — |

`tool/ptc-dispatch*`（PTC 嵌套子调用）：`id = rootCallId`，作为父行的 `subCalls` 呈现，不产独立行。

### 3.2 NodeDefinition 骨架（每类事件一个）

契约（`dsh-client-ui-conversation/src/client/contract/conversation.ts:214-341`）：

```js
{ kind, target: 'progress',
  match(event) → { id, role: 'start'|'update' } | null,
  start(context, match, reader) → State,
  update(context, match) → State,
  publication?(match) → 'none'|'animation-frame'|'immediate',
  buildLocationData?(context, scope, previous),   // turn/step 定位，可选
  buildViewNode?(context) → ConversationViewNode | null }
```

三条铁律（trajectory 源码验证）：

1. **`context.start === undefined` 分支必须处理**——窗口先见 update（`tool/result` 到达而 `tool/call` 在窗口外）时 `start()` 不执行、`state` 为 undefined，`buildViewNode` 从 `context.matches` 自折叠（trajectory 的 `fallbackState` 写法，`trajectory-tool-definition.ts:215-234`）。
2. **id 是分组键**：同一业务实体的所有事件必须 match 出同一 id（tool call 链用 `callId`，`tool/result` 回指 `message.source.callId` 或 `toolCallId`）。
3. **`reader.previous(kind)` 只返回当前窗口内前驱**——prepend 老页到达后 assembler 自动重放受影响 Context（`assembler.ts:352-377`），Definition 不写窗口逻辑。

view node 包装：`{key:context.key, kind, id, target:'progress', data:行模型}`（`todo-history.ts` 的 `tool-todo-history` 非 UI 纯数据 target 是极简样板）。

### 3.3 view target `'progress'` 的注册与消费

```js
ctx.uiConversation.views.register({
  target: 'progress',
  create: () => new ProgressBuilder(),   // {empty, replace, apply}
})
// 消费（tab body 内）：
const src = ctx.uiConversation.binding(sessionId).target('progress')
// src.getSnapshot() / src.subscribe(fn)
```

- **激活语义**：`target()` 的首个订阅者激活 target；activation 是**单调追加集、非互斥**（`assembly.ts:40-58`、`assembler.ts:478-` `activateTarget`）——Progress tab 挂上不会顶掉聊天视图。
- **快照形状（ProgressSnapshot，自建）**：
  ```ts
  { rows: ProgressRow[],            // 已排序的时间序视图行（含嵌套 subCalls）
    timeline: { turnOrder:number[], turns:Map<number,TurnLocation> },
    counts: { total, failed, running, awaiting, byType:Record<string,number> },
    revision: number }
  ```
  说明：`todos` 与 `hasMore`（原 `partial`）不走 builder 快照——Tasks 面板直接读 `session.projections.faceOf('todos')`（快照值为 `TodoItem[] | null`），`hasMore`/`loadingOlder` 读 `session.getSnapshot()`。builder 快照刻意保持窄。
- **窗口语义**：事件流分页（`events.prepend` 每页 ≥50 消息 + ≥2 turn、上限 500；`session.loadOlder()`/`loadThrough(seq)`）。`hasMore` 标记窗口外还有更老历史；**「加载更早」按钮**调 `session.loadOlder()`，与 trajectory 同构。
- **Builder 语义**：`replace`（窗口重建/首次激活）与 `apply`（增量 upserts）按 `ConversationViewBuilder` 契约实现；`apply` 只接收变化节点，Builder 内部维护 seq→row 索引做 O(1) 更新。

### 3.4 Tasks 与 Jobs 面板数据缝

- **Tasks**：`session.projections.faceOf('todos')`（`dsh-tool-todo/src/types.ts` 官方投影，快照值就是 `TodoItem[] | null`，`turn/start` 清零、last-write-wins）。**不重建、不 diff**；抽屉头部显示 `done/total`，逐项状态走 `StateDot`。
- **Jobs**：inject `jobs`（`dsh-api-job-controller`，服务名 `jobs`）：`ctx.jobs.watchRows(sessionId)` + `ctx.jobs.state` → `rows[sessionId]: JobView[]`（`{id,kind,label,status:'running|stopping|completed|killed|failed',startedAt,finishedAt,detail,output}`）。
- **过滤映射**：`status:` 值域统一 `{ok,failed,running,awaiting}`：
  - 行型：`ok` 无 error 已完结；`failed` = `isError`/`error`/`turn/end` reason ∈ `{error,aborted,max-tokens,interrupted}`/`job failed|killed`/`approval outcome rejected|unavailable`；`running` = call 已发未见 result/`job running`；`awaiting` = `wait_agent`/`send_message` 等待态 + `approval/asked` 未决 + `turn/end` reason `blocked`（turn 暂停待业主输入）；`forked`/`completed` 为中性 `ok`。

### 3.5 挂载：workbench tab 两段式（与 DNCS 同构）

```js
ctx.effect(() => ctx.sidebarRightTabs.register({
  id: 'dsh-nano-progress-report.workbench',
  kind: 'progress',
  priority: 'extension',
  keepMounted: true,
  title: () => t('view.progress'),         // tab chip
  guide: [{ id:'progress', order:40, title:()=>t('view.progress'),
            description:()=>t('view.progressDesc') }],
}), 'nano-progress-report: workbench type')

ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab',
  () => ctx.slots.register({
    name:'sidebar.right.pane.tab', key:'dsh-nano-progress-report.workbench',
    inject: () => ({ t }),
  }, ProgressBody)),
  'nano-progress-report: workbench body')
```

- **发现路径**：guide entry（`guide` 字段）让 Progress 出现在每个 session 的 guide 页——这是「每 session 都有」的默认入口，零打扰。
- **自动种子（v1 决策）**：**不自动 `openTabIn`**——`openTab` 会 focus 新 tab，首次见到 session 就抢走 guide 焦点违反最小打扰。改为：`sidebar.right.tab.menu.item` 注册一条 `Open Progress` 菜单项 + guide entry。若业主要求「自动出现」，实现为一次性 `openTabIn`（写 `localStorage['dsh-nano-progress-report:seeded.v1']` 记录已种过的 sessionId，关闭后不再重开）。
- **`keepMounted: true`**：切 session/收合侧栏/拖拽 docking 不重建 body，与 trajectory 的 `keepMounted` 先例一致（`native-workbench.js` 同款）。

### 3.6 工具行详情：`tool.call.toolview` keyed slot

行展开（`▸`）时**不自绘**参数/结果：按 `key=<wire tool name>` 注册/消费 `tool.call.toolview` 槽位（`dsh-client-ui-tool/src/client/contract/slots.ts:25-28`），拿 `ToolCallOwnerProps{useDisclosure,callId,toolName,cwd,home,openFile,loadImage,inspect}+phase`。未注册 toolview 的工具落 GenericToolCard 兜底。

### 3.7 inject 集

```js
export const inject = [
  'slots', 'locale', 'sessions',
  'sidebarRight', 'sidebarRightTabs',
  'uiConversation', 'uiSession',
  'jobs',
  'remote', 'remote.toolResults',   // 需要时按需取；v1 可先只取 jobs/sessions 面
]
```

`package.json` 的 `dsh.client.inject` 按模块加载顺序列：`dsh-client-ui-layout`、`dsh-client-ui-primitives`、`dsh-client-ui-sidebar-right`、`dsh-client-ui-conversation`、`dsh-client-ui-session`、`dsh-client-ui-locale`、`dsh-client-ui-theme`、`dsh-api-session-controller`、`dsh-api-job-controller`（以 cordis 服务名实际解析为准；`uiConversation`/`uiSession`/`jobs` 是 cordis service 名，不是包名）。

## 4. 视图层设计（ProgressBody 解剖）

三份参照：**宿主 primitive catalog**（结构与控件）、**[DNK] 的工作台密度**（工具条/状态行/抽屉）、**devin Progress 的行语义**（谁是人类输入）。插件自绘的只剩布局胶水。

```
[dsh工作台] tab（标题由宿主 tab 条渲染；插件不再自绘 head）
└─ [data-nano-progress-report][data-npr=root]        bg-base，flex column（根无自有类）
   ├─ .npr-toolbar  38px，border-bottom l3
   │   ├─ host Input[type=search]  .npr-search（包裹层：border l2 / radius-sm / bg-layer-1；focus→business）
   │   ├─ 清除 Button（ghost sm，仅有过滤文本时）
   │   └─ .npr-stats（仅有过滤文本时：`n/total`）
   ├─ .npr-flow  flex:1，滚动
   │   ├─ .npr-older（hasMore：host Button outline sm「Load older」）
   │   └─ host AnimatedRows(.npr-rows) → .npr-row*（data-row-key）
   │        └─ host DisclosureRow（leading glyph / title / headerAccessory=相对时间 + 失败告警）
   │             └─ 展开：.npr-detail（mono，args/result/error/reasoning/耗时/子调用）
   ├─ .npr-status  26px，border-top l3，label-tertiary：`n 个事件` · `m 个失败` …… 会话状态
   └─ .npr-drawer  顶边可拖拽；head = bg-layer-1
        ├─ .npr-grip  7px，role=separator，cursor row-resize，96px … 70%vh
        ├─ .npr-drawer-head：host SegmentedControl[Tasks | Jobs(无 job 时禁用)] + 计数 + 折叠 Button
        └─ .npr-drawer-body：TasksView（StateDot + 13px 文本 + 状态字）/ JobsView
```

### 4.1 行型 → 视觉语义

| 行型 | glyph（宿主 catalog） | 标题色 | 备注 |
|---|---|---|---|
| `prompt` | `IconUserOutlineRegular`（唯一实心 chip：brand 22% + 0.5px 描边） | `label-primary`，600 | 人类输入是**唯一带底色**的行（brand 8%） |
| `message` | `IconSparkleRegular` | `label-primary` | agent 文本（reasoning 已并入） |
| `shell` | `IconCodeOutlineRegular` | `label-secondary` + `--dsh-font-family-code(-default)` | 命令按代码字体渲染 |
| `file` | `IconDeliverDocRegular` | `label-secondary` | |
| `web` | `IconGlobeOutlineRegular` | `label-secondary` | |
| `tool` | `IconSlidersTwoOutlineRegular` | `label-secondary` | |
| `todo` | `IconChecklistOutlineRegular` | `label-secondary` | |
| `subagent` | `IconUsersOutlineRegular` | `label-secondary` | |
| `wait` | `IconClockOutlineRegular` | `state-warn-primary` | 审批 / inbox |
| `turn` | `IconPlayOutlineRegular` | `label-tertiary` | |
| `job` | `IconQueueOutlineRegular` | `label-tertiary` | |
| `lifecycle` | `IconInfoOutlineRegular` | `label-dimmed` | 边界事件 |

- 失败行：`state-error` 10% 底色 + `inset 2px 0` 左条 + 标题红 + 尾随告警 glyph；`running` 用 `business` 左条 + `DisclosureRow` 的 running shimmer；`awaiting` 用 `warn` 左条。
- 长文本：`.npr-row-content > span` 上做单行省略号（宿主 `TextShimmer` 把字串放在两层 span 内，`title` 本身不会收缩）。
- 动效：行入场 `npr-row-in`、抽屉 body `npr-body-in`、`AnimatedRows` 的新增/位移、任务行 hover 换色；`prefers-reduced-motion` 下全关。

### 4.2 抽屉行为

- 高度 `96px … round(innerHeight × 0.7)`，`box-sizing: border-box`（含上边框），拖拽走 pointer capture；双击不改状态。
- 折叠只留 head（body 从 DOM 移除），再展开回到折叠前高度。
- 状态 `{height, collapsed, view}` 落 `localStorage['dsh-nano-progress-report:drawer']`——纯视图态，不进宿主。
- **Tasks**：读 `session.projections.faceOf('todos')`（`TodoItem[] | null`）。宿主 `TodoPanel` 未从包入口导出，故按其度量自绘：13px 文本、gap 8、`StateDot`、逐项状态字、头部 `done/total`。投影在 `turn/start` 被宿主清零——历史仍留在时间线的 `Task list` 行，这是宿主语义，不是丢数据。
- **Jobs**：读 `ctx.jobs`（先 `watchRows`）；无 job 时该视图选项 `disabled`，不留一个永远空的面板。

### 4.3 过滤

```
<type>          自由文本（大小写不敏感，匹配 summary/参数原文）
type:<cat>      prompt|message|shell|file|web|tool|todo|subagent|wait|turn|job|lifecycle
-type:<cat>     取反
status:<s>      ok|failed|running|awaiting
-status:<s>     取反
tool:<name>     精确工具名（bash|read|write|…）
token 组合为 AND；无 token 时纯文本检索。
```

解析器是纯函数 `parseFilter(query) → {text, types, statuses, tool, …}`，单测覆盖。过滤不再有 chips：工具条只显示 `n/total`，清空走右侧 × 按钮。

## 5. 包结构

```
dsh-nano-progress-report/
├─ package.json            name/engines.dsh/files/dsh.client.inject/"test":"node --test test/*.mjs"
├─ index.js                宿主入口，导出 lib/host.js
├─ cordis.patch.yml        name: dsh-nano-progress-report，插入插件 id
├─ icon.svg
├─ locale/en.json zh.json
├─ scripts/build-client.mjs esbuild：src/host → lib/host.js；src/client → lib/client.js（IIFE+ModuleLoader 包装）
├─ src/host/               宿主私有投影、摘要与 PromptContext
├─ src/client/
│  ├─ index.js             inject/apply：locale→view target+definitions→tab type+body→guide→menu item
│  ├─ i18n.js  styles.js   npr- 前缀样式与令牌（--npr-* 映射 --dsw-*）
│  ├─ filter.js            parseFilter/applyFilter（纯函数）
│  ├─ rows.js              ProgressRow 构造器（事件→行模型，纯函数）
│  ├─ events/
│  │  ├─ prompt.js message.js tool.js todo.js turn.js job.js lifecycle.js
│  │  └─ index.js          汇总注册
│  ├─ view/
│  │  ├─ progress-builder.js  ConversationViewBuilder<ProgressSnapshot>
│  │  ├─ ProgressBody.jsx    tab 根组件（data-nano-progress-report="1"）
│  │  ├─ FlowList.jsx        事件流
│  │  ├─ FilterBar.jsx       过滤栏
│  │  ├─ TasksPanel.jsx      todo 面板
│  │  └─ JobsPanel.jsx       jobs 面板
│  └─ toolview/
│     └─ index.js          tool.call.toolview 按需注册（v1 仅通用兜底）
├─ test/
│  ├─ filter.test.mjs      parseFilter/applyFilter 单测
│  ├─ rows.test.mjs        rows.js 字面量单测
│  ├─ builder.test.mjs     progress-builder 喂事件数组断言快照
│  ├─ contract.test.mjs    源码契约（inject 表、register 调用、nano-progress-report 标识）
│  ├─ bundle-smoke.test.mjs node:vm 跑 lib/client.js 冒烟（先 npm run build）
│  └─ live/tab.live.mjs    ego live 测试（可选，非 gate）
└─ src/perf/declaration.json  （perf-review 声明，可选）
```

## 6. 工作方法（执行序列）

按依赖序排，每步可独立验收：

1. **worktree**：`.agents/worktrees/npr-progress-report/`（仓唯一合法位置），语义分支名。
2. **骨架**：`package.json`/`cordis.patch.yml`/`index.js`/`locale`/`icon.svg` → `npm run build` 出 `lib/client.js` → `dsh-dev restart` 验证「`__DSH_BOOT__` 里有 `/plugins/??dsh-nano-progress-report/client.js`」。
3. **tab 骨架**：kind `progress` 注册 + body 根 `data-nano-progress-report="1"` → ego 验证工作台可开、`data-*` 可见。
4. **数据缝**：`events/` 一组 NodeDefinition + `progress` target 注册 → `ctx.uiConversation.binding(id).target('progress')` 出快照（先用 `console.log`/`ctx.logger` 在 dev 实例打印验证）。
5. **行渲染**：`rows.js` + `FlowList` + `npr-` 样式 → 真会话数据驱动，验证 type 分类、time、嵌套。
6. **过滤**：`filter.js` + `FilterBar` → token + 文本检索。
7. **Tasks/Jobs**：`faceOf('todos')` + `ctx.jobs` 面板。
8. **详情展开**：`tool.call.toolview` 消费 + 兜底。
9. **收口**：`test/` 全部绿 → `scripts/check-ui-rules.mjs` PLUGINS 登记 → `dsh-dev restart` 验收 → `npm pack --dry-run` 核 `files` → 包内 AGENTS.md（按 `docs/agents/TEMPLATE.md` 母版）→ 合回主干、删 worktree。

## 7. 测试与验收（dsh-dev 收口）

### 7.1 单元测试（进 `npm test` 与 `scripts/test-all.mjs` 门禁）

| 测试 | 形态 | 断言 |
|---|---|---|
| `test/filter.test.mjs` | `node:test` 纯函数 | `type:x -status:failed foo` 解析出 `{type:['x'],excludeStatus:['failed'],text:'foo'}`；非法 token 当文本；AND 语义 |
| `test/rows.test.mjs` | `node:test` 字面量 | `tool/call` name=bash → `{type:'shell',icon:'$'}`；`isError` → `status:'failed'`；嵌套 `subCalls` 层数 |
| `test/builder.test.mjs` | `node:test` 喂 `SessionEventLike[]` | `replace` 后 rows 有序；`apply` 增量 upsert 只变动 seq 命中行；todo `turn/start` 清零 |
| `test/contract.test.mjs` | 源码正则断言 | `export const inject` 表含 `sidebarRightTabs/slots/uiConversation/sessions/locale`；`sidebarRightTabs.register` 调用；`data-nano-progress-report` 字符串存在；无 `[class*=`/`:has(` 嫁接 |
| `test/bundle-smoke.test.mjs` | `node:vm` 跑 `lib/client.js` | `window.__ModuleLoader__.load` 捕获 `id:'dsh-nano-progress-report'`；factory 可调用不抛（先 `npm run build`） |

### 7.2 Live 测试（可选、非 gate；模板 `dsh-nano-notepad/test/live/window-size.live.mjs`）

```
node test/live/tab.live.mjs
```

- 探 `https://dsh-dev.local/` → `302` → 剥 `?token=`（任一前置不满足 exit 0 skip）；
- `findEgo()` 定位 ego-browser → `spawnSync(ego,['nodejs'],{input:script})` → `taskSpace('dnpr-progress')` → `page('p1')`；
- `page.evaluate` 断言：`document.querySelector('[data-nano-progress-report]')` 存在且只有一个可见 pane；`[data-npr="search"]` 是 `input[type=search]`；`[data-npr="drawer"]` 的 drag/collapse 生效；
- 用真实会话事件断言：`.npr-row` 出现、按 `data-type` 取到的 glyph 颜色互不相同、`prompt` 行底色不同于 `shell` 行、失败行有 `[data-npr="fail"]`；
- `getBoundingClientRect`/`computedStyle` 断言 toolbar=38px、status=26/27px、抽屉高度随拖拽变化且 clamp 在 `96 … 0.7vh`；
- `page.screenshot('/tmp/dnpr-progress-*.png')` 留证；测完还原（关闭 tab、清 localStorage）。

### 7.3 Spike 取证（宪章 `test/spike/progress-report-tab/`）

跑前写死判读门槛，ego PASS / offline PASS 分级，`evidence/` 不入库。候选命题：

| # | 命题 | 方法 | 门槛（写死不挪） |
|---|---|---|---|
| V-01 | 第三方 `events/views.register` 在 dev 实例被装配引擎接受 | dev 实例注册后 `binding.target('progress')` getSnapshot 非空 | 激活后 `rows.length ≥0` 且不抛 |
| V-02 | `session.projections.faceOf('todos')` 可直接读 | 在已发 `todo_write` 的会话读投影 | `counts.completed+pending+in_progress === items.length` |
| V-03 | `keepMounted:true` 切 session 不重建 body | 切两个 session 回切 | `data-nano-progress-report` DOM 节点对象 identity 不变（`el === el`） |
| V-04 | `loadOlder` 触发 prepend 重放 | 发 ≥60 事件后 `loadOlder` | 顶部出现更老行且 `hasMore` 回落 |
| V-05 | 行高/间距令 token 命中 `--dsw-*` | `computedStyle` | `--npr-row-pad` 等映射到宿主令牌，非硬编码 px |

### 7.4 静态与发布门禁

- `scripts/check-ui-rules.mjs` `PLUGINS` 表登记 `{abbr:'npr', dir:'dsh-nano-progress-report', src:'src/client', prefixes:['npr-']}`——自动受 U1–U10（禁 `[class*=`、`:has()` 嫁接、禁手绘控件、令牌校验）。
- `scripts/test-all.mjs` 自动收 `npm test`。
- `npm pack --dry-run` 核对 `files`：`index.js`、`cordis.patch.yml`、`icon.svg`、`locale`、`lib/{client,host,perf-declaration}.js`、`AGENTS.md`；`src` 和 `test` 不进包。

## 8. 风险与未决

| 风险 | 处置 |
|---|---|
| `ConversationViewSnapshotMap` 的 `'progress'` 键在别的包同名注册时碰撞 | target 名取 `progress`（语义短名）；`uiConversation.views.register` 重复 target 会抛——属正确失败，启动期暴露 |
| 大窗口/长会话行数性能 | v1 只渲尾部窗口 + `loadOlder` 显式分页；行高固定 + CSS containment；超阈值再引入窗口化渲染 |
| `faceOf('todos')` 在无 todos 的会话返回 null | 面板显示 `暂无任务`，不报错 |
| `openTabIn` 自动种子的打扰度 | 默认**不自动开**；改 guide entry + tab menu item 发现路径；要自动种需业主裁决（写 `seeded.v1` 记录） |
| `tool.call.toolview` 无注册的工具展开 | GenericToolCard 兜底 + 原始 JSON 只读视图（`textOf`） |
| ego-browser 在 CI/无头环境不可用 | live 测试全部 skip 化（`exit 0`），不进 test-all gate |

## 9. 单会话宿主摘要与进度锚（P1/P2）

2026-11-19 按 [业主] 前序 TODO 继续：保留 P0，先做 P1 只读宿主投影，再做 P2 模型可见进度锚并把本包下限抬至 rc.5；随后验证与收口。P3 保持暂缓。

- **P1**：复用宿主 `todos` 投影、goal 服务和 jobs 服务。通过私有 `sessionProjections` 单元，从本会话已提交的事件补充最近的文件工具变更和尚无匹配成功重试的 Bash 工具失败。不读磁盘历史、不由浏览器时间线反推、不复制原始命令或输出。失败仅指宿主标记的工具失败，不猜测退出码；同命令、同工作目录请求的后续前台结果明确成功时清除。只汇总归本会话的活动 job 以及直接委派的活跃子代理数量，不读取子会话内容。上游 journal 是真源，投影 checkpoint 只是可以丢弃重建的宿主缓存。
- **P1 限额**：记住最近 8 个去重路径、8 个未恢复的去重失败，以及最多 64 个尚未配对的工具调用；不会补列 Bash 写文件、未配对或缺路径元数据的历史结果。Bash 对照只存调用参数的指纹，不存命令原文；文件路径超过 192 UTF-8 字节就跳过。忽略 fork 继承段的工具事实。
- **P2**：安装后以宿主可抑制的 `systemPrompt.context()` 可选贡献提供当前组装会话的事实。无 agent 或无进度就不贡献；只写任务数量、goal 阶段/轮次、文件路径、未解决失败数量和活动数，不注入 goal/todo 原文、命令、结果、relay 或其他会话的内容。文件路径作为数据编码；完整贡献最多 600 UTF-8 字节。宿主负责去重、留档和压缩移除后的重新投影，[DNMSC] 与原生压缩都不加专用接线。
- **P3 暂缓**：跨会话 team/lead 摘要、`progress_status`、HTTP/MCP、跨插件服务和写入重叠告警均不实现。出现具体消费者与权限边界后，另请 [业主] 裁决；不改变 [DNMSC] 切点或台账。

## 10. 不做（范围外）

- 不做 canonical 状态副本、不做事件日志写盘、不做跨 session 聚合；
- 不做 Devin 侧的 `IDE`/`Watch live`/artifact 预览；
- 不做 `chat` 视图的替换/覆盖——Progress 是**第二视角**，不是替代；
- 不做自定义宿主路由、不做 token/凭证存储；
- 不做 `dsh-client-ui-tool` 内部 `TOOL_VARIANTS` 的复刻——`type:` 分类是**本插件自己的行模型**，不复用私有表。
