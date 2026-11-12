# dsh-nano-session-manager — 设计与实现规格

| 元信息 | 值 |
|---|---|
| 版本 | `0.1.0`（草案） |
| 类型 | dsh overlay 插件（host + client 双端） |
| 定位 | session 生命周期管理插件。**不是** host doctor，**不是** 重启 actor |
| dsh 引擎 | `>=0.2.2-rc.1 <0.3.0`（与 explorer-extra 对齐） |
| 构建 | `node scripts/build-client.mjs`（esbuild JS API，跨平台） |
| 外部 actor | `celld` sidecar（denoland 开源，DO + alarm），dsh 进程之外 |
| 文档日期 | 2026-11-12 |

## 1. 业主的困难与原始诉求

### 1.1 已实测的困难（事实层，非感受层）

| # | 现象 | 证据（本机实测） |
|---|---|---|
| D1 | 「越用越卡」：消息发出后长时间才真正送出，全局 UI 拖泥带水 | `dsh web` PID 91035 运行 ~1h，RSS 1.08–1.13GB 锯齿增长，瞬时 CPU 133% |
| D2 | GC/序列化长暂停是主嫌疑 | `sample` 栈底大片 `JsonStringifier` + `BrotliDecoder`——宿主在压缩/序列化大块会话数据 |
| D3 | orphan session 全量扫放大持久化成本 | 曾实测 482 个 orphan session（432 个来自批量 subagent 翻译任务）；`persistence.list()` 按 `DEFAULT_LIST_CONCURRENCY=3` 扫全部 artifact。归档 460 个后列表类请求明显变快 |
| D4 | 宿主无内建观测 | `dsh` 二进制无 metrics/healthz/inspect/event-loop 探针，「为什么卡」没有任何官方工具可回答 |

### 1.2 业主的心智模型（未言明的需求分解）

业主把「卡」的解决路径想成一棵功能树，并已在心里把它收束成一个插件：

```
dsh 越用越卡
 ├─ 观测缺口：不知道哪里在烧时间          → 需要「诊断/测量」
 ├─ 数据增长：session 越积越多、孤儿堆积    → 需要「生命周期管理」
 ├─ 恢复手段：卡了只能手动重启              → 需要「自动清理/重启」
 └─ 落点：这些能力住在哪里？               → 「一个插件」
```

把这棵树往下拆，每个叶子的真实需求与它的正确归所并不相同——这是本 spec 的核心工作。

### 1.3 与「doctor 插件」方案的辩证

业主一度考虑把 perf-review 扩成 doctor（测量 + 清理 + 重启）。经辩论否决，理由：

- **性质漂移**：`dsh-performance-review` 是构建期被动观测库；加清理/重启 = 从 package（静态、被动）变插件（主动 actor），违反「不得擅自扩约」；
- **上层建筑归 host**：清缓存、强制 GC、排空连接是宿主内部面，插件无权替宿主运维；
- **被监管者不能持扳手**：插件跑在要重启的进程里，「重启 + 回响应 + 倒计时」结构性不成立。

`dsh-nano-session-manager` 是那个心智模型的**正确收束形态**：把「session 数据的生命周期管理」留下，把「宿主进程干预」交给进程外 actor。

## 2. 需求分解与逐条分析

### 2.1 需求矩阵

| 需求 | 性质 | 归所 | v1 判定 |
|---|---|---|---|
| R1 列出/归档/清理孤儿 session | session 数据操作 | 插件（本包） | ✅ v1 核心 |
| R2 修剪超大型 session 的过期消息 | session 数据操作，依赖宿主内部格式 | 插件（本包） | ⚠️ v2（格式脆弱） |
| R3 归档到 S3 | 独立子系统 | 插件 + dsh-s3-client | ⚠️ v2 |
| R4 session 上下文管理 + notepad 接口 | 前瞻接口 | 插件（本包） | ✅ v1 接口预留 |
| R5 perf-review 数据 durable 落点展示 | 只读消费 receipt | 插件（本包） | ✅ v1 |
| R6 p95/event-loop-lag 可视化 | 渲染已有数据 | 插件（本包） | ✅ v1 |
| R7 健康度判定 + 等空闲 + 执行重启 | 主动 actor，进程外 | celld sidecar | ✅ v1（接口对接） |
| R8 前端重启倒计时 UI | 显示层 | 插件展示 sidecar 状态 | ⚠️ v1 只读展示，不编排 |
| R9 event-loop-delay 采样 | 被动测量 | dsh-performance-review | ✅ v1（package 内加，不进本插件） |

### 2.2 逐条分析

**R1（孤儿管理）**：唯一既高频又完全合法的「管理」功能。宿主把 session 落盘在 `$DSH_HOME/sessions/`，orphan = 不被任何 workspace 引用、且超过冷期（如 >24h）。归档 = 移到 `sessions-archive/`（可逆）；清理 = 删除。**这直接消掉 D3 的成本来源，是这个插件的灵魂。**

**R2（修剪）**：要「在压缩文件内按规则剔除过期内容」。风险在于：session 持久化是 `session.v4.jsonl.zstd` 事件溯源日志，「哪条算过期」「剔除后 header/引用还成立吗」全是宿主内部语义。v1 不碰写入格式，只做**只读扫描 + 报告「该 session 可剔除多少字节」**，真正剔除留到 v2 且保守实现。

**R3（S3 归档）**：dsh-s3-client 已在仓，逻辑可做。但它牵出 restore 语义、凭证、远端对象生命周期——是个子系统，不是一行功能。v1 先归档到本地 `sessions-archive/`，S3 后端 v2 接。

**R4（上下文/notepad 接口）**：v1 只定接口契约（让 notepad 将来能「把当前会话要点写进记事本」），不实现联动。

**R5/R6（perf 视图）**：`dsh-performance-review` 已把数据落盘到 `$DSH_HOME/plugins/perf-review/host.json`。本插件**只读**它，渲染 span p95 与 event-loop 直方图。符合单一真源（perf-review 拥有数据，本插件是消费 receipt），零耦合成本。这让「为什么卡」第一次有 UI。

**R7/R8（重启）**：架构结论已冻结——**actor 在 dsh 进程外**。celld sidecar 里的 DO 负责判健康、等空闲、执行 `launchctl kickstart`；它存活于 dsh 重启之外，天然能回响应、能维护倒计时状态。本插件只：调 sidecar 接口**请求**重启（写意图）、**展示** sidecar 报告的倒计时状态。插件永不执行重启。

**R9（event-loop 采样）**：进 `dsh-performance-review`（被动测量，`perf_hooks.monitorEventLoopDelay()`，默认关）。它是 package 职责的合理扩展，不是 actor。数据落 `host.json` 后 R6 就能画 lag。

## 3. celld / durable-state / alarm 的技术栈辩证

### 3.1 业主的判断（如实记录）

> 「可以在 host 侧加载一个旁路 celld 或 workerd，在里面跑一个带 alarm 的 durable-object。celld 占用资源很少；session-manager 若要 durable state 和 alarm，可经旁路实现。这样解决重启和响应问题。」

### 3.2 关键更正（本 spec 内锚定）

初判曾以「celld 属于 [nano-agent] 私有拓扑」为由否定——**错误**。已核实 [celld 是 denoland 的开源项目](https://github.com/denoland/celld)：self-hosted distributed Durable Objects，与 workerd 同构。[nano-agent] 是运行在 celld 之上的[业主]产品，不等于 celld 私有。**「插件中立」不构成对 celld 的否决**，celld/workerd/node 三者在这个维度上等价。

### 3.3 三选型对比

| 维度 | celld + DO/alarm | workerd + DO | node 监督脚本 + launchd |
|---|---|---|---|
| 插件中立 | ✅ 开源（denoland） | ✅ 开源（Cloudflare） | ✅ |
| DO/alarm 原生 | ✅ 一等公民 | ⚠️ 需自拼 DO 语义 | ❌ 需手写状态机 |
| 资源开销 | 中（deno_core isolate + 编排） | 中高（workerd ~60–150MB） | 低（~20MB） |
| Windows | ⚠️ deno_core 支持，预编译待验 | ❌ 无官方二进制 | ✅ |
| S3 协调 | ✅ 原生（分布式 DO 后端） | ❌ | ❌ |
| 适配 session 定时任务 | ✅ 天生 | ⚠️ | ❌ |
| 业主生态契合 | ✅ [nano-agent] 已在 celld 上跑 | 中性 | 中性 |

### 3.4 辩证结论

- **celld 是对的方向，且比 workerd 更贴本仓**：DO/alarm 原生、S3 协调复用、[业主]已有运维经验。唯一未验证项是 Windows 预编译可用性（动手前确认）。
- **但要按负载付费，不为重启一件事买整套 celld**：纯「轮询健康+kickstart」用 celld 是牛刀杀鸡；只有当 M2/M3（定时修剪队列、S3 归档调度、健康度滑窗）这些**本就是 durable scheduled work** 的需求落地时，celld 才是刚需底座。
- **执行**：sidecar 以最小集起步——`HealthDO`（健康判定）+ `RestartDO`（排空/等待/重启编排），为后续 `ScheduleDO`（定时修剪/归档）留插槽。dsh 进程只把 celld 当一个 HTTP/WS 邻居，永不反向依赖。

## 4. 插件边界与 v1 范围

### 4.1 边界（不可逾越）

```
允许（本插件拥有）                    禁止（越界即扩约）
─────────────────────────────      ─────────────────────────────
读/写 $DSH_HOME/sessions/           重启 host 进程（只能向 sidecar 请求）
sessions-archive/ 归档目录           采样 event-loop（属 perf-review）
孤儿判定、列表、清理                  清宿主缓存/强制 GC/排空连接
session 只读扫描与体积报告            修改宿主内部路由/注入
只读消费 perf-review host.json       在 dsh 进程内做重启 actor
向 celld sidecar 请求/读状态         依赖 celld 存在才能装（sidecar 可选增强）
```

> 降级语义：**celld sidecar 不在时，插件全功能照常**（孤儿管理、扫描、perf 视图），仅「请求重启/倒计时」入口置灰提示「supervisor 未运行」。sidecar 是增强，不是前置。

### 4.2 v1 核心功能（边界内）

| # | 功能 | 归属 | 一句话 |
|---|---|---|---|
| F1 | orphan session 管理 | 本插件 host+client | 列出孤儿、体积、最后写入；一键归档（可逆）或删除 |
| F2 | session 体积扫描报告 | 本插件 host | 只读遍历，报告每 session 可剔除字节数（不动格式） |
| F3 | perf-review 视图 | 本插件 client | 读 host.json，渲染 span p95 + event-loop lag |
| F4 | 重启请求/倒计时展示 | 本插件 client + sidecar | 请求写入 sidecar，轮询其状态展示；执行在 sidecar |
| F5 | 上下文接口预留 | 契约 | `dsh.client`/`host` 暴露 notepad 对接点，v1 stub |

非目标（v2+）：R2 实际剔除、R3 S3 归档、celld ScheduleDO、notepad 真实联动、桌面 profile 适配验证。

## 5. 核心功能详细设计

### F1 orphan session 管理

**判定**：session 目录 `sessions/<proj>/<session-id>/` 为 orphan 当且仅当
- 不被任何 workspace 引用（扫 `workspaces/`、active session index），且
- `mtime` 早于冷期 `orphanColdMs`（默认 24h），且
- 不在 `pinned` 列表（用户标记保留）。

**操作**：
- `list`：分页返回 `{id, project, bytes, lastWriteMs, ageMs, orphan}`；
- `archive`：`mv` → `$DSH_HOME/sessions-archive/<id>/`，写 `archive-receipt.json`（identity + 原路径 + 时间），**可逆**；
- `restore`：移回；
- `purge`：删 `sessions-archive` 内条目（归档后的二段删除，不直接删 live 目录）。

### F2 体积扫描（只读）

后台低频遍历 `sessions/`（复用 `statisticsOf` 的 worker-pool + yield 模式），产出 `{sessionId: {bytes, eventCount, trimmableBytes, lastEventMs}}`。`trimmableBytes` 为估算——识别明显冗余（重复大 blob、过期中间态），**只报告不执行**。缓存进 `stats-cache.json`，新鲜期 30min。

### F3 perf 视图

client 轮询 `/nano-session-manager/perf`（host 转发读取 `host.json`），渲染：
- span 表：`hostSpan` 各 name 的 count/total/p95；
- event-loop 直方图：`monitorEventLoopDelay` 的 p50/p95/p99/max；
- session 规模与 lag 的相关标注。

### F4 重启请求/倒计时

client → `POST /nano-session-manager/restart-request` → host 写 `restart-request.json` 到 sidecar 监视目录（或调 sidecar HTTP）。client 轮询 `/nano-session-manager/restart-status` → sidecar 回报 `{phase: idle|scheduled|draining|restarting, etaMs}`，UI 显示倒计时。**插件只搬运意图与状态，永远不执行 kickstart。**

### F5 上下文接口（预留）

`dsh.client.inject` 导出 `sessionManager`，暴露 `getActiveContextSummary(sessionId)`，v1 返回 stub；文档注明 notepad 将以此为对接点。

## 6. 文件树

```
dsh-nano-session-manager/
├─ package.json            # name/engines/files/dsh.client.inject；devDeps 同其他包
├─ cordis.patch.yml        # 插件 id = nano-session-manager
├─ AGENTS.md               # 包内安装合同（模板）
├─ index.js                # 宿主入口，re-export lib/host.js
├─ icon.svg
├─ locale/                 # 中英文案
├─ scripts/
│  └─ build-client.mjs     # esbuild JS API（跨平台，与其他包同构）
├─ src/
│  ├─ host/
│  │  ├─ entry.js          # 宿主激活：注册路由、初始化 supervisor 探测
│  │  ├─ routes.js         # 16 条内 REST 路由（经 route-guard 注册）
│  │  ├─ orphans.js        # F1：orphan 判定 + archive/restore/purge
│  │  ├─ scanner.js        # F2：只读体积扫描（worker-pool+yield，缓存）
│  │  ├─ perf.js           # F3：读 host.json 转发 + event-loop 聚合
│  │  ├─ restart.js        # F4：写请求文件/调 sidecar、读其状态
│  │  └─ state.js          # pinned 列表、archive-receipt、缓存持久化
│  └─ client/
│     ├─ index.js          # client 激活：注入面板、注册 sessionManager 接口
│     ├─ panel.jsx         # 主面板：孤儿列表 + 扫描报告 + perf 视图
│     ├─ perf-view.jsx     # p95 表 + event-loop 直方图组件
│     └─ restart-badge.jsx # 重启请求按钮 + 倒计时（sidecar 离线时置灰）
└─ lib/                    # 构建产物：host.js / client.js（files 必填）
```

每个 `src/host/*` 职责单一，对外只经 `routes.js` 暴露；`state.js` 是唯一的写状态真源。

## 7. 接口 / 数据 / 契约

### 7.1 宿主 inject（启动必需）

`fs`、`sessions`、`sessionPersistence`、`webServer`、`connection`、`subprocess`（可选）、`sandbox`（可选）。

### 7.2 REST 路由（前缀 `/nano-session-manager`，均 `connection.requestRejection`）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/sessions` | session 清单 + orphan 标记 + 体积 |
| GET | `/orphans` | 孤儿子集（分页、按 age/bytes 排序） |
| POST | `/archive` | `{sessionIds[]}` → 归档，返回 receipts |
| POST | `/restore` | `{sessionIds[]}` → 从归档移回 |
| POST | `/purge` | `{sessionIds[]}` → 删归档内条目 |
| GET | `/scan` | F2 体积报告（`?fresh=1` 强制重扫） |
| GET | `/perf` | F3：host.json 快照（`?mode=window` 窗口） |
| POST | `/restart-request` | F4：写重启意图给 sidecar |
| GET | `/restart-status` | F4：读 sidecar 上报的 phase/eta |

### 7.3 数据结构

```ts
// 落盘 state（$DSH_HOME/plugins/nano-session-manager/state.json）
{
  pinned: string[],                    // 保留的 sessionId
  archivedAt: Record<string, string>,  // id -> ISO 时间
  scanCache: { writtenAt: string, entries: ScanEntry[] } | null
}
interface ScanEntry { sessionId, project, bytes, eventCount, trimmableBytes, lastEventMs, orphan }
interface ArchiveReceipt { sessionId, from, to, archivedAt, bytes }
interface RestartIntent { requestedAt, requestedBy, reason? }
interface RestartStatus { phase: 'idle'|'scheduled'|'draining'|'restarting', etaMs?: number, at: string }
```

### 7.4 sidecar 契约（celld，HTTP 或文件投递）

- 写：`restart-request.json`（RestartIntent）或 `POST /restart`；
- 读：`GET /status` → RestartStatus；sidecar 也可主动推。
- **契约要点**：sidecar 是唯一执行者；插件只认 status，不认执行回执。

## 8. v1 工作台账

### 8.1 实现顺序

1. **骨架**：package.json/cordis.patch.yml/AGENTS.md/index.js + build-client.mjs（照抄 explorer-extra 的 API 形态）；
2. **F1 孤儿管理**：`orphans.js` + `state.js` + 路由 + 极简 client 列表；
3. **F2 扫描**：`scanner.js`（移植 statisticsOf 模式）+ 缓存；
4. **F3 perf 视图**：`perf.js` + client 组件（先在 dev 用假 host.json 测）；
5. **F4 sidecar 对接**：`restart.js` + client 倒计时（sidecar 不在时置灰）；
6. **celld sidecar（并行）**：HealthDO + RestartDO 骨架，`kickstart` 编排；
7. **event-loop 采样**：perf-review host.js 加 `monitorEventLoopDelay`（package 改动，独立提交）。

### 8.2 测试方法

| 项 | 方法 |
|---|---|
| orphan 判定 | 造 3 类 session（被引用/超 24h 未引用/近期未引用），断言分类正确 |
| archive/restore | 归档后可逆、receipt 正确、purge 只删归档 |
| 扫描 | 断言只读（目录 mtime 不变）、trimmable 估算字段存在 |
| perf 视图 | 假 host.json → 组件渲染 p95/lag 不崩；DSH_PERF_REVIEW 关时优雅降级 |
| sidecar 契约 | 无 sidecar → restart-status 返回 `{phase:'idle', offline:true}`，UI 置灰 |
| 构建 | `npm ci && npm run build` 在 mac/win 均产出非空 lib/ |

### 8.3 收口目标（v1 完成定义）

- `dsh plugin --profile web add` 后，文件面板旁出现 session-manager 入口；
- 孤儿列表可见、可归档、可恢复、可清理；
- perf 视图能画出至少 span p95（有数据时）；
- restart-request 能写、sidecar 离线时 UI 明确降级；
- `npm run build` 跨平台干净；`files` 含全部 lib/ 与 AGENTS.md。

## 9. Verdict — 对 dsh-nano 插件组合的多维价值

| 维度 | 价值 |
|---|---|
| **产品** | 补上 dsh 缺失的 session 生命周期管理——孤儿堆积是已实测的性能杀手，本插件把它变成可治理的一等功能 |
| **观测** | 第一次给「为什么卡」一个 UI 答案：p95 + event-loop lag 可读，perf-review 从「能采」变「能看」 |
| **架构** | 确立「插件管数据、进程外 actor 管宿主」的边界范式——celld sidecar 的重启能力不进插件，保住插件中立与上层建筑归 host |
| **生态** | 与 [nano-agent]/celld 同构而不耦合：sidecar 用开源底座，插件保持纯 dsh，为将来 nano-agent 场景预铺 |
| **扩展** | F5 预留 notepad 对接、ScheduleDO 预留修剪/S3 调度——session-manager 成为后续「上下文/归档/智能清理」的承载点 |
| **治理** | 本 spec 本身就是「心智模型 → 分解 → 边界 → v1」的可复用模板：业主的「一个插件」被证伪又重构为正确的插件+sidecar 形态 |

**一句话**：v1 交付一个「能看孤儿、能清理、能看性能」的 session 管理插件，和一个「能安全重启宿主」的进程外 supervisor——各归其位，没有一件东西越权，同时把业主心里那棵树完整落地成可维护的结构。
