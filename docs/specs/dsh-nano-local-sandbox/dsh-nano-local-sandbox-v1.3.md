# DNLS v1.3 — 双截图建模、拓扑审计与 Fleet Control Plane 升级提案

> **文档类型**：讨论分析稿（discussion / analysis draft），不是规格冻结，不产生实现承诺
> **文档状态**：`draft — 待 [业主] 复核`
> **建档时间**：`2026-11-19 17:20`（Asia/Shanghai）
> **代码基线**：`main`，HEAD `cf02f73`
> **与 v1.2 的关系**：v1.2 保持原样，是 2026-11-18 的设计基线；本文独立分析 2026-11-19 的两张截图、当前拓扑与四层缺口，不修改 v1.2。
> **证据规则**：全文 `file:line` 为 HEAD `cf02f73` 快照；行号漂移时以「路径 + 符号名」为准。
> **读者**：[业主]、[DNLS]/[DNK]/[DNT] 后续实施 agent

---

## 0. 摘要

### 0.1 一句话结论

两张截图不是「两个 UI 参考」，而是**两个不同缩放级别的控制台**：Argus 是单机纵深（process/performance/service/connection/history），Nuphos 是横向 fleet（device/runtime/usage/create）。[DNLS] 当前既没有单机纵深的接口，也没有 fleet 模型——它是一台「单例容器宿主机」，sandbox 还不是一等对象。**v1.3 的必要性不在于把面板画出来，而在于把 sandbox 变成可枚举、可寻址、可治理、可观测、可控制的一等对象。**

### 0.2 四层缺口总览

| 层 | 最大缺口 | 一句话证据 |
|---|---|---|
| 真源 | registry 在内存；没有 durable sandbox 台账；实际挂载/状态卷/服务版本没有单一权威 | `instance-registry.js:18` 是 `new Map()`；`containerNameFor` 一 profile 一 env 一个名字（`profile-drivers.js:131-137`） |
| 协议 | 协议是「能力形状」，不是「对象形状」；没有 sandbox 状态机、错误、幂等、寻址 | 30 条 HTTP 路由全是 `/nano-local-sandbox/*` 的 capability；没有 `/sandboxes`；`sandbox.instance.*` 只有 5 个（`mcp-sandbox.js:80-100`） |
| API | 没有 create/remove/recreate/resize/upgrade；没有 list/stats/process/services/usage；没有 host/fleet | `backend-apple.js` 有 `inspect/stats/execOutput/logs`，但没有对外聚合；`registry.list()` 不可达（`routes.js:1242`） |
| UI | 没有入口、没有 fleet、没有 detail、没有 control | `package.json` 没有 `dsh.client`；`index.js:4` 写 `There is no second product UI`；`AGENTS.md:17/74/129` 明确禁止 |

### 0.3 章节索引（对应 [业主] 的 8 项要求）

| 章 | 内容 | 对应要求 |
|---|---|---|
| §1 | 两轮截图分别评价、建模、完整分析 | 要求 1 |
| §2 | 裸金属 / dsh 宿主 / 插件拓扑，`file:line` 证据 | 要求 2 |
| §3 | Control + Dashboard 总体 gap | 要求 3 |
| §4 | 协议层、真源持有盲点、逻辑问题 | 要求 4 |
| §5 | 接口层：状态控制 / 健康度 / inspection | 要求 5 |
| §6 | UI 层：入口 / 交互 / 反馈 / 盲点 | 要求 6 |
| §7 | 真源 / 协议 / API / UI 四层工作目标 | 要求 7 |
| §8 | v1.3 必要性与预期价值 | 要求 8 |
| §9 | DNLS 与 DNCS 的边界（J1 真源/生命周期、J2 session/env） | 本轮追加 |
| §10 | 四个 case-study：DNT 长期 terminal / DNMS imagine / kitesurf workerd / DNN KV-D1 的代码事实、协议、拓扑与 v1.3 目标 | 本轮追加 |

---

## 1. 两轮截图：分别评价、建模与完整分析

### 1.1 截图 A：Argus（单机纵深的「任务管理器」）

#### 1.1.1 它是什么

截图是一个 **产品落地页**，不是应用本体：上方是标题「Argus / 免费开源 · Windows 任务管理器 / Rust 打造的现代任务管理器」、大标题「新一代任务管理器」、`免费下载` 按钮、`Windows 10/11 x64 | Rust | 1,912 Star`；中间是笔记本 mockup 里的应用 UI；下方是三个卖点「7 天历史回溯 / 文件占用查询 / 端口找进程」。因此它的 IA 是**设计稿 + 文案**，不是可交互的真实页面；评价时要区分「它声称的」与「可验证的」。

#### 1.1.2 信息架构拆解

| 区域 | 可见元素 |
|---|---|
| 顶部页签 | 进程 / 性能 / 服务 / 启动 / 连接 / 历史 / 设置 / 关于 |
| 视图切换 | 应用 / 进程树 / 列表 |
| 搜索 | 名称、PID、路径或服务 |
| 动作 | 运行新任务；每 1 秒刷新；窗口控制 |
| 性能卡 | CPU 41% / 3.94GHz / 75°C / 88W；内存 12.3/32.0GB 39%；磁盘 7.1MB/s；网络 22.7MB/s（发送 11.5 / 接收 11.2）；GPU 42% / 52°C / 26W；每张卡带火花线 |
| 对象表 | 名称 / PID / CPU / 内存 / 磁盘读取 / 磁盘写入 / I/O / GPU；应用 8 / 后台进程 6 分组 |
| 右侧详情 | 「本机配置」+ 操作提示；处理器 i5-13500HX 14 核 20 线程；32GB DDR5 5600；Samsung SSD 990 PRO 2TB；WDC HDD 3.6TB；Wi-Fi |
| 状态栏 | v0.5.0 / 线程 2,536 / 句柄 101,267 / 缓存 7.7GB / 分页缓冲池 640MB / 已运行 5 天 14 小时 / 每 1 秒刷新 / 标准权限 |
| 卖点 | 7 天历史回溯、文件占用查询、端口找进程 |

#### 1.1.3 建模

**对象模型**：

```text
System (一台机器)
├─ PerformanceDomain × 5        CPU / Memory / Disk / Network / GPU
│    ├─ current value
│    ├─ sparkline ring
│    └─ auxiliary (temp / watts / clock)
├─ Process × N                 PID, name, path, user, status
│    ├─ CPU / Memory / DiskRead / DiskWrite / IO / GPU
│    ├─ Thread × N
│    ├─ Handle × N
│    └─ Window / Service host
├─ Service × N                 name, status, startup type
├─ StartupItem × N
├─ Connection × N              local/remote endpoint, PID, state
├─ HistoryEvent × N            samples + events, 7 days
├─ Setting
└─ About
```

**关系**：

- `Process 1—N Thread`、`Process 1—N Handle`；`Process 1—N Connection`。
- `PerformanceDomain 1—N Sample`；`Sample` 按 1s 进入 ring；ring 供卡片/火花线/历史。
- `System 1—N Service`、`System 1—N StartupItem`。
- `Process` 可挂到 `Application` 或 `Background` 分组；分组是视图，不是新对象。

**状态机**：

```text
Process:   running ⇄ suspended → terminated
Service:   stopped → start-pending → running → stop-pending → stopped
System:    normal → high-load (derived, not stored)
```

**信息流**：

```text
sampler(1s) → metrics ring → performance cards / sparklines
process table → select → detail pane
port index → connection tab → process
file index → 文件占用查询 → process
ring + events → history tab (7d)
all processes → status bar aggregates (threads/handles/cache/uptime)
```

**交互模型**：

- 单表 + 右详情：选中行 → 右侧显示对象详情；双击 → 结束任务。
- 搜索是跨标识符的（名称/PID/路径/服务），不是只搜名称。
- 刷新间隔是用户可调的（1s）；这是「采样/性能」与「打扰」的权衡。
- 动作贴着对象：运行新任务、结束任务都在对象上下文里。

#### 1.1.4 评价

**强项**：

1. **单机纵深完整**：从「谁在跑」到「占多少」到「连了谁」到「历史上怎样」一条链闭合。
2. **对象表 + 详情**：一屏内完成 triage，不需要开多个窗口。
3. **指标带历史**：火花线让「什么时候开始坏」可见，而不是只看当前值。
4. **交叉索引**：端口→进程、文件→进程，直接回答「是谁占的」。
5. **动作贴着对象**：看到就能操作，减少上下文切换。

**弱项 / 不可直接迁移**：

1. **单机、桌面应用**：没有 fleet、没有远程、没有创建；Windows 进程/服务/启动项语义不能照搬到容器。
2. **GPU/温度/功耗**：macOS `container stats` 不提供这些；伪造就是撒谎。
3. **结束进程是主操作**：在 sandbox 里 kill 是高危动作，不能作为默认按钮。
4. **营销页不是产品事实**：截图中的数字/布局是设计稿，不能当作已实现能力。

#### 1.1.5 对 [DNLS] 的可迁移原则

| Argus 原则 | [DNLS] 的对应 |
|---|---|
| 一个常驻入口 | 工作台页签 + `/sandbox` 命令 |
| 对象表 + 右侧详情 | sandbox 表 + sandbox 详情 |
| 指标带历史 | `stats` 采样 + telemetry ring + 24h/7d/30d |
| 状态栏聚合 | 实例数 / PTY 数 / 错误数 / uptime / buildId |
| 交叉索引 | 端口→sandbox/service/PTY；挂载→workspace；CDP→sandbox |
| 动作贴着对象 | start/stop/restart/recreate/删除/看日志/开终端 |
| 搜索跨标识符 | name / profile / session / port / sandboxId |

**不迁移**：GPU/温度/功耗、Windows 进程/服务语义、kill 作为主操作、桌面窗口形态。

---

### 1.2 截图 B：Nuphos 运行环境（横向 fleet）

#### 1.2.1 它是什么

这是真实工作区的「运行环境」页：左侧导航有「搜索 / 新建 Agent / 收件箱 / 运行环境 / 连接器」；顶部是「运行环境」下拉、刷新、`2 项`、`+ 添加运行环境`；中间是「电脑」区，两张设备卡（FRD1 离线 Linux 16 天前；m3max.local 本机 运行中 macOS MacBook Pro，卡内有 CPU 15% / 内存 64.6/128GB 50% / 磁盘 473.5/926.4GB 51%）；下面是「与队友共享 m3max.local / 未共享 / 共享」；再下面是「订阅用量」，带 `无读数 / 24 小时 / 7 天 / 30 天` 和空态；最下面是「运行环境」表：Grok Build（FRD1 · 离线）、Codex（本机），列「运行环境 / 运行位置 / 用量」，每行有 chevron。底部是当前用户。

#### 1.2.2 信息架构拆解

| 区域 | 元素 | 语义 |
|---|---|---|
| 左侧导航 | 运行环境 | 一级产品面，不是设置子页 |
| 顶部 | 运行环境下拉、刷新、`2 项`、`+ 添加运行环境` | fleet 计数 + 创建 |
| 电脑区 | 设备卡 × N；`新电脑`；`...` | Host 对象与 host 级动作 |
| 设备卡 | 名称、在线/离线、OS、最后心跳、CPU/内存/磁盘迷你条 | host 健康与容量 |
| 共享 | 「与队友共享 / 未共享 / 共享」 | 所有权/可见性 |
| 订阅用量 | 时间窗口 tab、空态说明 | Usage 采样与窗口 |
| 运行环境表 | 名称、运行位置、用量、chevron | Sandbox/Runtime 对象 |
| 底部 | 用户、设置 | operator 身份 |

#### 1.2.3 建模

**对象模型**：

```text
Workspace
├─ Device (Host) × N
│    ├─ name, os, arch, online/offline, lastSeen
│    ├─ cpu / memory / disk (current)
│    ├─ Share (none | team)
│    └─ Runtime × N
│         ├─ name, kind, status (running/offline)
│         ├─ location (device)
│         └─ UsageReading × N
│              ├─ at
│              ├─ window (10m bucket / 24h / 7d / 30d)
│              └─ ratio
└─ User / Team
```

**关系**：

- `Workspace 1—N Device`；`Device 1—N Runtime`；`Runtime 1—N UsageReading`。
- `Runtime N—1 Device`（运行位置唯一）。
- `Device 1—1 Share`（未共享/共享）。
- `UsageReading` 是时间序列，不是当前值；空态是合法状态。

**状态机**：

```text
Device:   online ⇄ offline (lastSeen)
Runtime:  running → offline → running (reported by device)
Usage:    no-readings → 24h/7d/30d (window switch, same readings)
```

**交互模型**：

- fleet 卡/表 → 选中 → 详情（chevron）。
- `+ 添加运行环境` 在 fleet 层直接创建。
- `新电脑` 添加 host。
- 时间窗口 tab 切换同一份 usage 的聚合视图。
- 空态明确说「此时间范围内暂无用量记录」，不画 0 线。

#### 1.2.4 评价

**强项**：

1. **fleet 视角**：多 host、多 runtime、计数、在线/离线、最后心跳。
2. **两层对象**：device 与 runtime 分开，不是一张平表。
3. **用量窗口**：24h/7d/30d，采样读数，空态诚实。
4. **创建是一等动作**：添加运行环境/新电脑在控制台完成。
5. **所有权/共享**：至少把「谁能用」显式化。

**弱项 / 不可直接迁移**：

1. **device 与 runtime 的语义有歧义**：截图中「电脑」是物理设备，「运行环境」是 agent runtime；但两者的边界、一个 runtime 是否可跨 device、usage 是 per runtime 还是 per device，截图没有说清。
2. **多租户共享**：`与队友共享` 是团队产品语义；[DNLS] 是本地单用户，直接照搬会引入不必要的权限模型。
3. **语言混用**：`That computer has not reported usage yet` 与中文界面混排；本地化不完整。
4. **没有服务层**：runtime 下面是黑盒，看不到服务、版本、端口、健康。
5. **没有控制旋钮**：看不到资源、生命周期、部署、升级。

#### 1.2.5 对 [DNLS] 的可迁移原则

| Nuphos 原则 | [DNLS] 的对应 | 注意 |
|---|---|---|
| fleet 列表 | Host + Sandbox 列表 | 一个 Mac 是一台 host，三个 DSH home 不是三台设备 |
| 两层对象 | Host → Env → Sandbox → Service | 比截图多一层 Env/Service，避免语义混淆 |
| 用量窗口 | 24h/7d/30d telemetry | 空态必须诚实 |
| 创建入口 | `+ 添加 Sandbox` | 创建是控制面动作，不是改 YAML |
| 共享 | owner session / operator 可见性 | 不做多租户团队共享 |
| 卡片指标 | CPU/内存/磁盘/网络 | 不伪造 GPU/温度/功耗 |

**不迁移**：团队共享/订阅套餐、`device` 作为唯一顶层、runtime 黑盒、混排文案。

---

### 1.3 两图合并：目标 control plane 模型

两张图是**互补**的，不是二选一：

```text
                    ┌─────────────────────────────┐
                    │ Fleet (Nuphos 的横向)        │
                    │ Host cards / Sandbox table   │
                    │ Usage 24h/7d/30d / Create    │
                    └──────────────┬──────────────┘
                                   │ select
                    ┌──────────────▼──────────────┐
                    │ Detail (Argus 的纵深)        │
                    │ Services / Processes / Usage │
                    │ Storage / Network / Timeline │
                    └──────────────┬──────────────┘
                                   │ act
                    ┌──────────────▼──────────────┐
                    │ Control                      │
                    │ create/start/stop/recreate   │
                    │ knobs / upgrade / delete     │
                    └──────────────┬──────────────┘
                                   │ read
                    ┌──────────────▼──────────────┐
                    │ Truth                        │
                    │ registry + inspect + telemetry│
                    │ + receipts + one ledger      │
                    └─────────────────────────────┘
```

**目标对象模型**：

```text
Host (m3max.local)
└─ Env (prod | dev | desktop)          # DSH home，不是设备
   └─ Sandbox × N                      # 一等对象
      ├─ Profile (kitesurf | xray | gateway | local-s3 | terminal)
      ├─ Image/pin/digest + receipt
      ├─ Resources (cpus/memory/idleTimeout)
      ├─ Ports (pool)
      ├─ State volume
      ├─ Services × N (id/command/version/port/health)
      ├─ CDP page/socket/history
      └─ PTY namespace
```

**目标读模型组合**：

```text
FleetDocument = { host, sandboxes[], usage, deployment }
SandboxDetail = { InspectionDocument v1, sandboxId }
```

fleet 只做索引与聚合；detail 只做单 sandbox 纵深；两者不复制彼此的真相。

**目标交互**：

```text
fleet → select sandbox → detail → act → fleet refresh
fleet → + Add Sandbox → create wizard → detail
detail → services/processes/usage/logs/terminal/settings
```

---

## 2. 当前拓扑：裸金属 / dsh 宿主 / 插件

### 2.1 裸金属层

| 事实 | 证据 |
|---|---|
| macOS arm64；`/usr/local/bin/container` 是 Apple container CLI（本机为 debug build） | 现场 `container list --all` / `--version` |
| 运行中的 DNLS 容器：`kitesurf`（prod，8798/8799）、`kitesurf-dev`（dev，8800/8801）、`kitesurf-desktop`（desktop，8802/8803） | `container list --all` |
| `kitesurf-desktop` 仍是旧镜像 `…-665716c07c13`、旧状态挂载 `~/.dsh-kitesurf-state-desktop` | `container inspect kitesurf-desktop` |
| 另外有两个 stopped lab 容器和一个 `buildkit`（Apple 构建器，不属于 DNLS） | `container list --all` |
| 镜像由 profile 唯一声明：`kitesurf-engine:39feadf…-dfe7b43…`（desktop 容器仍是旧镜像，见上） | [`profile.yaml:10`](../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L10) |
| runtime 产物在 `DSH_HOME/artifacts/kitesurf/<ref>/runtime`，带 `artifact.json` receipt | [`driver/runtime.js`](../../../dsh-nano-local-sandbox/profiles/kitesurf/driver/runtime.js) |
| 状态卷在 `DSH_HOME/nano-local-sandbox/state/<profile>/<containerName>` | [`profile-drivers.js:152-161`](../../../dsh-nano-local-sandbox/src/host/profile-drivers.js#L152-L161) |
| 容器特权只允许在 `backend-apple.js` | [`backend-apple.js:1`](../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L1)、`test/container-spawn-sites.test.mjs` |

**裸金属拓扑**：

```text
macOS arm64
├─ container CLI
│   ├─ kitesurf            prod    8798/8799   state ~/.dsh/...
│   ├─ kitesurf-dev        dev     8800/8801   state ~/.dsh-dev/...
│   ├─ kitesurf-desktop    desktop 8802/8803   old image, old state
│   ├─ kitesurf-lab-*      stopped (lab)
│   └─ buildkit            Apple builder (not DNLS)
├─ DSH_HOME/prod     ~/.dsh
├─ DSH_HOME/dev      ~/.dsh-dev
└─ DSH_HOME/desktop  ~/.dsh-desktop
```

> **关键事实**：同一台 Mac 上有三个 DSH home、三个同名 profile 的容器；每个 home 各自加载 DNLS。控制台若把 env tag 当设备，会画出「三台电脑」；正确模型是「一台 host + 三个 env + 三个 sandbox」。

### 2.2 dsh 宿主层

| 事实 | 证据 |
|---|---|
| DNLS 是 Cordis overlay 插件，`name` 是插件 id，`cordis.patch.yml` 的 `name` 是包名 | [`index.js:12`](../../../dsh-nano-local-sandbox/index.js#L12)、[`cordis.patch.yml:3-5`](../../../dsh-nano-local-sandbox/cordis.patch.yml#L3-L5) |
| 宿主 `inject` 固定五项：`webServer`、`connection`、`sandboxPolicy`、`sandbox`、`sessions` | [`index.js:15`](../../../dsh-nano-local-sandbox/index.js#L15) |
| 所有 HTTP 路由经 `registerRoutes` + `BINDING_TABLE`；`connection.requestRejection` 是唯一鉴权边界 | [`index.js:22-30`](../../../dsh-nano-local-sandbox/index.js#L22-L30)、[`lib/route-guard.js:189-215`](../../../dsh-nano-local-sandbox/lib/route-guard.js#L189-L215) |
| 绑定表 30 条，全部 `/nano-local-sandbox/*` | [`lib/bindings.js:4`](../../../dsh-nano-local-sandbox/lib/bindings.js#L4) |
| 本包没有 `dsh.client`、没有 `lib/client.js`、`files` 不含 client | [`package.json:18-38`](../../../dsh-nano-local-sandbox/package.json#L18-L38) |
| 注释与包合同明确「没有第二个产品 UI」 | [`index.js:4`](../../../dsh-nano-local-sandbox/index.js#L4)、[`AGENTS.md:17`](../../../dsh-nano-local-sandbox/AGENTS.md#L17)、`:74`、`:129` |

**dsh 宿主拓扑**：

```text
dsh web host (DSH_HOME)
├─ connection.requestRejection        ← auth boundary
├─ webServer.register                 ← route registration
├─ sandboxPolicy.resolve              ← read-only policy
├─ sandbox.confine                    ← build-time confinement
├─ sessions                           ← session identity
└─ DNLS plugin
     ├─ HTTP /nano-local-sandbox/*    (30 bindings)
     ├─ MCP  /nano-local-sandbox/mcp  (20 sandbox + 8 term)
     ├─ bridge /health /control /cdp
     └─ term WS
```

### 2.3 插件间层

| 事实 | 证据 |
|---|---|
| [DNK] 不再持有 engine/container；宿主只注册 skills，页面路由由 DNLS 提供 | [`dsh-nano-kitesurf/index.js:1`](../../../dsh-nano-kitesurf/index.js#L1) |
| [DNK] client 仍是固定 route 常量（`/nano-local-sandbox/*`），不带 sandbox 参数 | [`dsh-nano-kitesurf/src/client/index.js:14-32`](../../../dsh-nano-kitesurf/src/client/index.js#L14-L32) |
| [DNK] 唯一可见面板是 EnvPanel，读 `/ports`，显示五个 plane 灯 | [`dsh-nano-kitesurf/src/client/index.js:1968`](../../../dsh-nano-kitesurf/src/client/index.js#L1968) |
| [DNT] `McpLane` POST `term.session.create`，只带 `cols/rows/sessionId` | [`dsh-nano-terminal/src/client/lanes.js:214-225`](../../../dsh-nano-terminal/src/client/lanes.js#L214-L225) |
| [DNT] `term.session.create` schema 只广告 `lane: local`；非 local 拒绝 `incompatible` | [`dsh-nano-terminal/schema/dnt-mcp.openrpc.json:45-57`](../../../dsh-nano-terminal/schema/dnt-mcp.openrpc.json#L45-L57) |
| [DNT] 审计写 `DSH_HOME/nano-local-sandbox/term.audit` | [`dsh-nano-terminal/index.js:39`](../../../dsh-nano-terminal/index.js#L39) |
| [DNT] 有 `/dnt` 命令与会话内视图 | [`dsh-nano-terminal/src/client/index.js:207`](../../../dsh-nano-terminal/src/client/index.js#L207) |
| 两者都不 import DNLS 源码；跨插件只走 HTTP/MCP | 包 `files` 与 import 扫描 |

**插件拓扑**：

```text
[DNK] workbench tab ──fixed HTTP routes──┐
                                          ▼
[DNT] conversation view ──DNT MCP──► [DNT host] ──MCP /mcp──► [DNLS]
                                          │
                                          └─ term.audit → DSH_HOME/nano-local-sandbox/term.audit
[future xray/gateway/s3] ──???──► [DNLS]
```

**层间结论**：

1. **特权边界干净**：容器 CLI 只在 `backend-apple.js`。
2. **协议边界不干净**：DNK 固定 route、DNT 只带 sessionId、审计跨目录；都是「消费者假设只有一个 sandbox」。
3. **模型边界缺失**：同一台 Mac 三个 env、三个容器，但没有一个对象把它们枚举出来。

### 2.4 当前拓扑的四个「单例假设」

| # | 假设 | 代码证据 | 后果 |
|---|---|---|---|
| A1 | 一个 profile 在一个 env 只有一个容器 | `containerNameFor`（[`profile-drivers.js:131-137`](../../../dsh-nano-local-sandbox/src/host/profile-drivers.js#L131-L137)） | 第二个 container 没有名字 |
| A2 | 端口按 env 固定 | `envHostPorts`（[`:138-150`](../../../dsh-nano-local-sandbox/src/host/profile-drivers.js#L138-L150)） | 第二个没有端口 |
| A3 | 状态卷按容器名 | `stateDirFor`（[`:152-161`](../../../dsh-nano-local-sandbox/src/host/profile-drivers.js#L152-L161)） | 第二个复用同一卷 |
| A4 | 所有 session 共享同一个 env 容器 | `instances.ensure` `skipCreate: true`（[`routes.js:1213`](../../../dsh-nano-local-sandbox/src/host/routes.js#L1213)） | instance record 是逻辑记录，不是物理隔离 |

---

## 3. Control + Dashboard 总体 gap

### 3.1 产品单元 gap

| 问题 | 现状 | 目标 |
|---|---|---|
| sandbox 是不是一等对象 | 不是；只有 env 容器 + session record | 是；`sandboxId` + name + registry |
| 能否创建第二个 | 不能；名字/端口/状态冲突 | 能；create + 端口池 + 状态卷 |
| 能否枚举 | 不能；`registry.list()` 不可达 | 能；fleet 列表 |
| 能否删除 | 只能 stop/remove 底层，没有 sandbox API | 能；remove + 卷清理策略 |
| 能否重建 | 只能隐式 recreate（配方漂移） | 能；显式 recreate + 保留状态 |

### 3.2 观测 gap

| 观测 | 现状 | 目标 |
|---|---|---|
| 容器健康 | `observe` 六 plane | 保留 |
| 资源指标 | `backend.stats` 存在但不可达 | fleet/detail 卡片 + 曲线 |
| 进程 | `execOutput` 存在但不可达；容器无 `ps` | `/proc` 解析 + 上限 |
| 服务 | profile 声明 id/port/command；无版本/健康 | 服务表 + 声明/实际版本 |
| 连接 | term list 只在 MCP；bridge /health 有 conns | 连接页 + 端口→对象 |
| 历史 | `/operations` 内存 200 行、折叠 20 | durable 时间线 + 24h/7d/30d |
| 部署 | `build-profile --check` 在源码树 | 面板可查询 readiness/receipt |

### 3.3 控制 gap

| 控制 | 现状 | 目标 |
|---|---|---|
| 创建 | 无 | create from profile（name/resources/mounts） |
| 启动/停止/重启 | `/lifecycle`、`/recover` | sandbox-scoped 生命周期 |
| 改资源 | 只能改 profile + 漂移重建 | per-sandbox override + recreate |
| 升级 | 只能改 profile + 重建 | 显式 upgrade/rollback |
| 删除 | 底层 remove | 显式 delete + 卷策略 |
| 日志 | `/logs` 只当前 env | sandbox-scoped tail/follow |
| 终端 | DNT McpLane | sandbox-scoped attach |
| 审计 | DNT 自己的 audit | 每 sandbox 操作审计 |

### 3.4 台账 gap

| 台账 | 现状 | 目标 |
|---|---|---|
| sandbox registry | 内存 Map，重启即丢 | durable `registry.json` + reconcile |
| 端口分配 | profile 固定 | 池 + 持久分配 |
| 状态卷 | 按容器名 | 按 sandboxId |
| 版本/镜像 | profile + inspect | per-sandbox record |
| 部署 receipt | 文件存在，面板不可见 | registry 引用 + 面板显示 |
| 用量 | 无 | telemetry ring + durable |

### 3.5 呈现 gap

| 呈现 | 现状 | 目标 |
|---|---|---|
| 入口 | 无 | 工作台页签 + `/sandbox` |
| fleet | 无 | host + sandbox + usage + deployment |
| detail | 无 | 9 个页签 |
| 空态/错误 | 无 | 明确文案 + 重试 |
| 搜索/过滤 | 无 | name/profile/session/port |
| 动作 | 无 | 生命周期/knobs/日志/终端 |

### 3.6 授权 gap

- 30 条路由多数 `sessionBinding: true`，但读的是共享 env 容器的日志/页面/历史。
- 没有 operator 角色；没有「跨 session 可见性」矩阵。
- panel 若默认全局，会放大跨 session 披露；若默认 session，只能看部分。
- 需要 Phase 1 session-scoped / Phase 2 operator-scoped 的两阶段模型。

### 3.7 总体判断

> 当前 [DNLS] 是一个**能力齐全但对象缺失**的后端：inspect/stats/exec/term 都有零件，但没有 sandbox 这个装配单元，也没有 fleet 这个观察单元。面板不是「缺 UI」，是「缺对象」。

---

## 4. 协议层与真源盲点

### 4.1 协议清单

| 协议 | Owner | 消费者 | 版本/形状 | 现状 |
|---|---|---|---|---|
| HTTP JSON routes | DNLS | DNK/DNT/agent | 30 条 `/nano-local-sandbox/*` | capability 形状；无 sandbox 对象 |
| MCP JSON-RPC | DNLS | agent/DNT | 20 `sandbox.*` + 8 `term.*` | 无 `sandbox.list/create/remove` |
| `dnt-ws-v1` | DNT 冻结 | DNT `McpLane` | raw stream + text control | 只按 sessionId |
| bridge `/health` `/control` `/cdp` | profile bridge | DNLS/DNK/agent | JSON / WS relay | per env；无 sandbox 维度 |
| CDP | engine | DNLS cdp-elements | WebSocket | page 共享；keeper 未接线 |
| container CLI | backend-apple | DNLS | Apple container | 只 inspect 单名；无 list |
| route guard / `requestRejection` | dsh host | DNLS | 注册期 fail-closed | 只鉴权，不做对象级授权 |
| perf observe | dsh | DNLS | `observeEvent` | 只有调用观测，无资源指标 |
| security ledger | repo | CI | 两份 JSON | 30 条 DNLS，与 bindings 对齐 |

### 4.2 真源清单

| 真源 | 持有者 | durable | canonical | 消费者 | 问题 |
|---|---|---|---|---|---|
| profile manifest | `profiles/kitesurf/profile.yaml` | 是 | 是 | DNLS/DNK | 只有 build/runtime/instance/lifecycle；无 sandbox 列表 |
| sandbox registry | `instance-registry.js` 内存 Map | **否** | 否 | routes/MCP | 重启即丢；无 reconcile |
| session 对象 | `index.js:18` 默认对象 | 内存 | 否 | routes | 全局一个；不是 per session |
| browser state | `session.stateDir/browser-state.json` | 是 | 是 | driver | 按 env 容器名；无 sandbox |
| diagnostics | `diagnosticsPayload` | 派生 | 是（单一文档） | HTTP/MCP/bridge | 只覆盖当前 env |
| bindings | `lib/bindings.js` | 是 | 是 | route guard | 30 条，无 sandbox |
| security ledger | `security/*.json` | 是 | 是 | CI | 与 bindings 对齐；无 fleet |
| perf declaration | `src/perf/declaration.json` | 是 | **否** | perf | 仍含 `dnls.kite`，缺 `dnls.lifecycle/logs` |
| package files | `package.json` | 是 | 是 | install | 无 client；无 sandbox 资产 |
| image digest | `profile.yaml` + image | 是 | 是 | backend | 只有当前 profile；desktop 旧镜像 |
| runtime receipt | `artifact.json` | 是 | 是 | driver | 面板不可见 |
| container state | Apple container | 是 | 外部事实 | backend | 无 `list`；无 registry 引用 |
| bridge state | `mcp-bridge.mjs` | 内存 | 派生 | DNLS/agent | 无 sandbox 维度 |
| DNK pins/notes | DNK client | 内存 | 是（DNK） | DNK | 业务真源，正确 |
| DNT layout/ctx | DNT client | 内存 | 是（DNT） | DNT | 业务真源，正确 |

### 4.3 盲点与逻辑问题

#### B1 单例容器 vs fleet

- 证据：`containerNameFor` 一 profile 一 env 一个名字；`envHostPorts` 固定；`stateDirFor` 按容器名。
- 逻辑问题：第二个 sandbox 没有身份/端口/状态；面板无法「添加第二个」。
- 影响：所有 fleet/多 sandbox 需求被硬编码挡住。

#### B2 registry 内存 vs durable

- 证据：`instance-registry.js:18` `new Map()`；无 `writeFile`/`readFile`。
- 逻辑问题：宿主重启后 registry 空，但容器还在；下一次 `ensure` 会重新 adopt 还是冲突？没有定义。
- 影响：无法做台账、无法恢复、无法 reconcile。

#### B3 session 对象全局 vs per-session

- 证据：`index.js:18` `deps.session` 默认对象；routes 共享。
- 逻辑问题：`sessionBinding` 只用于 route 记录，`session` 对象不是 per DSH session；`policyFingerprint`/history/term 都挂在一个对象上。
- 影响：多 session 语义不成立；面板无法按 session 展示。

#### B4 `attached` 布尔 vs 计数

- 证据：`instance-registry.js:64` `attached: false`；`:114` 返回布尔；`routes.js:1225` 设为 true。
- 逻辑问题：`sweep()` 用 `attached` 跳过回收，但 attach 后永不复位；`ensure` 描述声称「reported with an attached count」，但没有计数。
- 影响：资源治理和 fleet 计数都不可信。

#### B5 terminal plane 全局

- 证据：`routes.js:450` `termStateFor(session.termSessionId) === 'listening' || listTermSessions().length > 0`。
- 逻辑问题：任一 session 有 PTY，所有 session 的 terminal plane 都显示 `listening`。
- 影响：面板健康度撒谎；多 sandbox 会更严重。

#### B6 stateVolume claim vs actual mount

- 证据：`instance-registry.js:60` `stateVolume: volumeFor(instanceId)`；实际 `prepareEnvironment` 用 `session.stateDir`（`routes.js:86/652`），即 env 目录。
- 逻辑问题：registry 记录的状态卷不是实际挂载；面板若显示 registry 值会撒谎。
- 影响：存储页、迁移、备份都不可信。

#### B7 perf declaration drift

- 证据：`src/perf/declaration.json` 仍含 `dnls.kite`；`lib/bindings.js` 有 `dnls.lifecycle`/`dnls.logs`。
- 逻辑问题：性能声明与路由台账不是同一份；没有测试拦截。
- 影响：观测/台账不可信。

#### B8 MCP 投影重复

- 证据：`sandbox.operations` 在工具内折叠；`sandbox.history` 在工具内分组；`sandbox.network` 在工具内过滤 `gap`；REST 各有实现。
- 逻辑问题：同一语义两处实现，容易漂移。
- 影响：agent 与 UI 看到不同结果。

#### B9 bridge push vs REST

- 证据：`startDiagnosticsPush` 周期推 `diagnostics` 到 bridge；`diagnosticsPayload` 是 REST 真源；bridge 的 `sandbox.*` 读 push 文档。
- 逻辑问题：push 有延迟/丢失；bridge 可能读到旧 epoch；谁是真源没有在协议里写死。
- 影响：agent 与 REST 可能不一致。

#### B10 bindings vs security ledger vs perf

- 证据：bindings 30、security 30、perf 29（含 `dnls.kite`，缺 lifecycle/logs）。
- 逻辑问题：三份台账不同步；没有生成器保证。
- 影响：新增 sandbox API 时容易漏登记。

#### B11 sessionBinding vs shared container disclosure

- 证据：`/logs`、`/diagnostics`、`/status` 都是 `sessionBinding: true`，但读共享 env 容器。
- 逻辑问题：鉴权是 session 级，数据是 env 级；两个 session 能看同一份日志/页面/历史。
- 影响：面板会放大跨 session 披露；需要 operator/session 矩阵。

#### B12 DNK 固定 route vs 无 sandboxId

- 证据：DNK client 固定 18 个常量；无 sandbox 参数。
- 逻辑问题：DNK 只能打「当前 env 的那个 sandbox」。
- 影响：多 sandbox 时 DNK 无法选择；只能靠默认。

#### B13 DNT create 只带 sessionId

- 证据：`lanes.js:214-225`；schema 只广告 `lane: local`。
- 逻辑问题：DNT 不知道 sandbox；PTY key 只有 sessionId。
- 影响：DNT 无法在 sandbox A/B 各开一个终端。

#### B14 cdp-keeper 未接线

- 证据：`routes.js:53` 实例化；`:2502` 导出；生产路径无 attach/read；只有单测。
- 逻辑问题：per-sandbox CDP 生命周期没有落地；page 共享。
- 影响：多 sandbox 时 CDP/page 无法隔离。

#### B15 backend 无 list

- 证据：`backend-apple.js` 只有 `inspect(name)`；无 `list`。
- 逻辑问题：无法发现 lab/旧/孤儿容器；无法 reconcile。
- 影响：fleet 列表需要逐名 inspect，不可扩展。

#### B16 服务无版本

- 证据：`profile.yaml:25-31` 只有 id/port/command。
- 逻辑问题：面板无法回答「服务版本」；升级/漂移不可见。
- 影响：用户点名的「服务版本」直接缺失。

#### B17 `maxInstances` 不是容器上限

- 证据：`profile.yaml:56` `maxInstances: 2`；`instance-registry.js:42` 限的是 `instances.size`。
- 逻辑问题：两个 session record 可以挂同一个物理容器；「2」不是两个容器。
- 影响：资源治理误导。

#### B18 `scope: session` + `skipCreate` 语义

- 证据：`profile.yaml:6` `scope: session`；`routes.js:1213` `skipCreate: true`。
- 逻辑问题：「session scope」在这里是记录隔离，不是物理隔离；与用户理解的「每个 session 一个 sandbox」不一致。
- 影响：模型叙事与实际行为不符。

#### B19 无 durable sandbox identity

- 证据：`instanceId` 只在 ensure 响应出现；`routes.js:1230`；无 route/tool 按 id 操作。
- 逻辑问题：sandbox 没有稳定可寻址身份；重启后可能换 id。
- 影响：面板无法「按 sandbox 操作」。

#### B20 错误/幂等/重试未按 sandbox 定义

- 证据：`ERROR_CATALOG` 有通用错误；`term.*` 有 DNT kind；但没有 `sandbox.name_taken`/`sandbox.port_exhausted`/`sandbox.quota` 等。
- 逻辑问题：创建第二个 sandbox 的失败语义缺失。
- 影响：API/UI 无法给出可操作错误。

### 4.4 逻辑场景推演

| 场景 | 当前行为 | 问题 |
|---|---|---|
| 两个 session 同时 ensure | 都 adopt 同一 env 容器；`instanceId` 不同、`containerName` 相同 | 记录不同、物理相同；page/history/PTY 共享 |
| 创建第二个 sandbox | 没有 API；手工改 profile 会冲突 | 无法创建 |
| 宿主重启 | registry 空；容器还在 | 无台账；adopt 依赖 ensure |
| 容器被手工删除 | `inspect` 返回 null；status `missing` | registry 可能仍有旧记录 |
| 镜像升级 | profile digest 变；`recipeDrift` 触发 recreate | 没有 per-sandbox 版本记录；desktop 旧镜像不可见 |
| 端口被占 | `create` 失败 | 没有端口池/重试/错误语义 |
| 状态卷不一致 | registry 说 A，实际挂 B | 存储页会撒谎 |
| DNK 选择 sandbox | 固定 route | 只能当前 env |
| DNT 在 sandbox B 开终端 | 只传 sessionId | PTY 可能落在 A |
| operator 看全部 | 没有角色 | 无法审计 |

### 4.5 结论

> 当前协议是**能力形状**（open/shot/dom/...），不是**对象形状**（sandbox/service/usage）；当前真源是**探测形状**（每次 inspect/observe），不是**台账形状**（durable registry/telemetry）。这两点是 v1.3 要解决的根本问题。

---

## 5. 接口层缺口：状态控制 / 健康度 / inspection

### 5.1 状态控制接口

| 能力 | 当前 | 缺口 |
|---|---|---|
| 创建 sandbox | 无 | `sandbox.create` / `POST /sandboxes` |
| 删除 sandbox | 底层 `remove` 有，无 API | `sandbox.remove` + 卷策略 |
| 启动/停止/重启 | `/lifecycle`、`/recover` | 需要 sandbox 目标 |
| 改资源 | profile 固定 + 漂移重建 | per-sandbox override + recreate |
| 升级/回滚 | 无 | `sandbox.upgrade`/`rollback` |
| 端口分配 | profile 固定 | 池 + 冲突处理 |
| 状态卷 | 按容器名 | 按 sandboxId |
| 异步任务 | 无 | job/progress/cancel |
| 幂等 | ensure 按 session | create 按 idempotency key |
| 审计 | DNT audit | per-sandbox operation audit |

### 5.2 健康度接口

| 能力 | 当前 | 缺口 |
|---|---|---|
| 容器 plane | `observe` 有 | 保留 |
| 服务健康 | 只有 engine/bridge plane | per-service health/pid/restarts |
| selftest | 11 项 | per-sandbox + 结果历史 |
| 聚合健康 | `healthy = ready` | 服务/部署/资源多维 |
| 历史 | 无 | health timeline |
| 终端 | 全局判定（B5） | per-sandbox/per-pane |
| 部署就绪 | `build-profile --check` | API 可查询 |
| 错误 | `ERROR_CATALOG` | 新 sandbox 错误 |

### 5.3 Inspection 接口

| 能力 | 当前 | 缺口 |
|---|---|---|
| 单对象状态 | `/status`、`/diagnostics` | 无 sandbox 维度 |
| 列表 | 无 | `sandbox.list` / `/sandboxes` |
| 资源 | `backend.stats` 不可达 | `sandbox.stats`/`/stats` |
| 进程 | `execOutput` 不可达 | `sandbox.processes`/`/processes` |
| 服务 | profile 声明 | `sandbox.services` |
| 用量 | 无 | `sandbox.usage` + windows |
| 版本 | profile + inspect | `sandbox.version`/`about` |
| 部署 | 无 | `sandbox.deployment` |
| 主机 | 无 | `host.inspect` |
| 搜索/过滤 | 无 | query/filter |
| 聚合文档 | `diagnosticsPayload` 单 env | `FleetDocument` + `SandboxDetail` |
| HTTP/MCP 同源 | 部分 | 明确一份 owner |

### 5.4 接口矩阵（建议）

| 接口 | 读/写 | 目标 | 优先级 |
|---|---|---|---|
| `GET /nano-local-sandbox/host` | 读 | host/OS/CLI/容量 | P1 |
| `GET /nano-local-sandbox/sandboxes` | 读 | fleet 列表 | P0 |
| `POST /nano-local-sandbox/sandboxes` | 写 | 创建 | P0 |
| `GET /nano-local-sandbox/sandboxes/:id` | 读 | 详情/InspectionDocument | P0 |
| `PATCH /nano-local-sandbox/sandboxes/:id` | 写 | knobs（需 recreate） | P1 |
| `POST /nano-local-sandbox/sandboxes/:id/lifecycle` | 写 | start/stop/restart | P0 |
| `DELETE /nano-local-sandbox/sandboxes/:id` | 写 | 删除 | P1 |
| `GET /nano-local-sandbox/sandboxes/:id/services` | 读 | 服务/版本/健康 | P1 |
| `GET /nano-local-sandbox/sandboxes/:id/usage` | 读 | 24h/7d/30d | P1 |
| `GET /nano-local-sandbox/sandboxes/:id/processes` | 读 | `/proc` 表 | P2 |
| `GET /nano-local-sandbox/deployment` | 读 | readiness/receipt | P1 |
| `sandbox.*` MCP 对应工具 | 读/写 | 与 HTTP 同源 | P0/P1 |

> `T-O-19` 要求单一 `/nano-local-sandbox/*` 命名空间与能力名；`/sandboxes/:id` 是对象路径，需 [业主] 明确是否允许。若不允许，可改为 `/inspect?sandbox=` + `/lifecycle {sandbox}` 的能力形状。

### 5.5 错误 / 幂等 / 重试 / 鉴权

| 维度 | 当前 | 缺口 |
|---|---|---|
| 错误枚举 | 通用 `ERROR_CATALOG` | `sandbox.name_taken`、`port_exhausted`、`quota`、`state_conflict`、`image_missing`、`upgrade_failed` |
| 幂等 | ensure 按 session | create 按 idempotency key；remove 幂等 |
| 重试 | transport 一次 | 长任务 job 轮询；不重放写 |
| 鉴权 | `requestRejection` | object-level operator/session |
| 披露 | sessionBinding | 跨 session 字段脱敏 |
| 审计 | DNT audit | per-sandbox operation log |

### 5.6 消费者接口

| 消费者 | 当前 | 缺口 |
|---|---|---|
| DNK | 固定 route、无 sandbox 参数 | `sandboxId` + sandbox selector |
| DNT | `term.session.create` 只 sessionId | `sandboxId` + PTY key |
| agent | 20 `sandbox.*` | `sandbox.list/create/inspect/usage` |
| future xray/gateway/s3 | profile driver | 多 profile 注册 + 独立 sandbox |

---

## 6. UI 层缺口：入口、交互、反馈

### 6.1 入口缺失

| 入口 | 当前 | 缺口 |
|---|---|---|
| 工作台页签 | 无 | 「沙箱 / Sandbox」页签 |
| Slash 命令 | 无 | `/sandbox` |
| Skill | 无（DNK 技能教 `/nano-local-sandbox/*`） | agent 侧 inspection skill |
| 设置页 | 无 | 可在宿主动手 |
| 页面路由 | 无 HTML page | 不建议做第二 shell |
| DNK 深链 | EnvPanel 只有灯 | 「打开沙箱面板」 |

**根因**：`AGENTS.md:17/74/129` 明确「没有浏览器面板」，把「设计面」与「运维面」混为一谈。

### 6.2 导航与信息架构

| 缺失 | 后果 |
|---|---|
| fleet 层 | 看不到多 sandbox；只能看当前 env |
| host/env 区分 | 三个 DSH home 会被误画成三台设备 |
| sandbox 选择器 | DNK/DNT 无法选目标 |
| fleet → detail 跳转 | 只能看一个平面 |
| 搜索/过滤 | 对象多了以后不可用 |
| 空态/加载态 | 首次打开一片空白 |

### 6.3 交互缺失

| 交互 | 当前 | 缺口 |
|---|---|---|
| 创建 | 无 | `+ 添加 Sandbox` 表单（profile/name/resources/mounts） |
| 删除 | 无 | 二次确认 + 卷策略 |
| 启停/重启 | 无 | 对象级按钮 |
| 改资源 | 无 | 表单 + 「需 recreate」提示 |
| 看日志 | 无（DNK 有弹窗） | tail/follow |
| 开终端 | DNT 有，但无 sandbox 选择 | sandbox-scoped attach |
| 用量 | 无 | 24h/7d/30d |
| 复制诊断 | DNK 有 | 复用 |
| 审计 | 无 | 操作历史 |

### 6.4 反馈缺失

| 反馈 | 当前 | 缺口 |
|---|---|---|
| loading | 无 | 骨架/进度 |
| 长任务进度 | 无 | 创建/重建/升级 job |
| 错误 | 无 | errorId + cause + next |
| 空态 | 无 | 「暂无 sandbox / 暂无读数」 |
| 成功反馈 | 无 | toast/刷新 |
| 危险操作确认 | 无 | 删除/停止/降资源 |
| 撤销 | 无 | 至少「保留状态卷」 |

### 6.5 宿主 UI 规范

- **UI 宿主优先**：先用宿主 primitive，其次 nano-ui，最后才在插件内实现并标 `nano-ui-exempt`。
- 不做宿主 DOM 嫁接：`[class*=…]`、`:has()`、宿主哈希类、改写 portal 根节点。
- 主题/语言/快捷键用宿主服务；不硬编码颜色/字号。
- 不复制 [DNK] 的 Design Mode；面板只做 sandbox 自身。

### 6.6 UI 盲点清单

| # | 盲点 | 说明 |
|---|---|---|
| U1 | 无入口 | 没有 client/工作台/命令/skill |
| U2 | 无 fleet | 看不到多 sandbox/多 env |
| U3 | 无 host/env 区分 | 易把三个 DSH home 画成三台设备 |
| U4 | 无 sandbox 选择 | 消费者只能当前 env |
| U5 | 无创建/删除 | 无法「挂第二个」 |
| U6 | 无 knobs | 资源/idle/network/mounts 不可见不可改 |
| U7 | 无服务/版本 | 用户点名需求直接缺失 |
| U8 | 无用量/历史 | 没有 24h/7d/30d |
| U9 | 无进程 | 没有 `ps`，也没 `/proc` 视图 |
| U10 | 无连接 | 端口/CDP/PTY 不可见 |
| U11 | 无部署 | image/runtime/receipt 不可见 |
| U12 | 无健康聚合 | 只有五 plane 灯 |
| U13 | 无空态/错误 | 首次打开空白 |
| U14 | 无审计 | 写操作不可追溯 |
| U15 | 无 i18n/a11y | 只 locale 文案，无 UI |

---

## 7. 分层工作目标

> 原则：**先真源、再协议、再 API、最后 UI**。每层独立可验收；不把 UI 当合同来源。

### 7.1 真源层（Truth）

| ID | 目标 | 产出 | 验收 |
|---|---|---|---|
| T1 | durable sandbox registry | `stateRoot/registry.json`；字段：id/name/profile/host/env/image/digest/pin/resources/ports/stateVolume/owner/created/lastUsed/phase/health | 重启保留；`container list` reconcile；孤儿/旧容器标注 |
| T2 | sandbox identity | `sandboxId` 稳定；name 唯一；改名不改 id | 两个 sandbox 可区分；重启后 id 不变 |
| T3 | 端口池 | `instance.hostPorts.pool`；持久分配；冲突检测 | 两个 sandbox 端口不冲突；删除释放 |
| T4 | 状态卷 | `stateRoot/<profile>/<sandboxId>`；迁移 env 目录为 `default` | 实际挂载 = registry 记录 |
| T5 | 服务版本 | `services[].version`（声明）+ 实际探测 | 声明/实际可见；不匹配显式 |
| T6 | 部署 receipt | build/receipt 引用进 registry；readiness 可查询 | 缺 runtime/image 有明确状态 |
| T7 | 遥测 | stats 采样 + telemetry ring + 24h/7d/30d | 数据有界；重启保留；空态明确 |
| T8 | 披露/owner | owner session / operator；跨 session 字段分类 | 无越权读；审计有行 |
| T9 | 单一台账 | bindings/security/perf/package 同源生成 | 四份一致；测试拦截 |

### 7.2 协议层（Protocol）

| ID | 目标 | 产出 | 验收 |
|---|---|---|---|
| P1 | sandbox 对象合同 | `sandboxId/name/profile/host/env/state/resources/ports/services/health/version` | 对象形状稳定；版本化 |
| P2 | 状态机 | `creating→starting→running→stopping→stopped→removing→missing→failed` | 非法转移拒绝；错误明确 |
| P3 | 错误目录 | `sandbox.name_taken/port_exhausted/quota/state_conflict/image_missing/upgrade_failed` | 每个错误有 status/cause/next |
| P4 | 幂等/重试 | create idempotency key；remove 幂等；长任务 job | 重复调用不重复创建；不重放写 |
| P5 | 鉴权/披露 | session-scoped vs operator；对象级检查 | 401/403；跨 session 不可见 |
| P6 | 消费者寻址 | `sandboxId` in DNK/DNT/MCP；默认 `default` | 两个消费者可指向不同 sandbox |
| P7 | 协议版本 | HTTP/MCP/term/bridge 版本字段 | 兼容/拒绝策略明确 |
| P8 | 台账 | 新 route/tool 自动进 bindings/security/perf | 无漏登记 |

### 7.3 API 层（API）

| ID | 目标 | 产出 | 验收 |
|---|---|---|---|
| A1 | sandbox 列表/详情 | `GET /sandboxes`、`GET /sandboxes/:id` | fleet 数据完整 |
| A2 | 创建/删除 | `POST /sandboxes`、`DELETE /sandboxes/:id` | 创建第二个并独立运行；删除释放端口/卷 |
| A3 | 生命周期 | `POST /sandboxes/:id/lifecycle` | start/stop/restart 幂等 |
| A4 | knobs | `PATCH /sandboxes/:id`（cpus/memory/idle/network/mounts） | 需 recreate 时明确；状态保留 |
| A5 | 服务/用量 | `GET /sandboxes/:id/services`、`/usage` | 版本/健康/24h/7d/30d |
| A6 | 进程 | `GET /sandboxes/:id/processes` | `/proc` 表；上限；无 `ps` 也可用 |
| A7 | host/fleet | `GET /host`、`GET /fleet` | host 容量/在线/sandbox 计数 |
| A8 | 部署 | `GET /deployment` | readiness/receipt/drift |
| A9 | MCP 同源 | `sandbox.list/create/inspect/usage` | HTTP/MCP 同值 |
| A10 | 长任务 | job id/progress/cancel | UI 可轮询 |

### 7.4 UI 层（UI）

| ID | 目标 | 产出 | 验收 |
|---|---|---|---|
| U1 | 入口 | 工作台页签「沙箱」+ `/sandbox` | 只装 DNLS 可打开；无 DNK/DNT 依赖 |
| U2 | fleet | host 卡 + sandbox 表 + usage + deployment + 创建 | 两个 sandbox 同屏；创建/删除可用 |
| U3 | detail | 概览/服务/进程/用量/存储/网络/时间线/设置/关于 | 服务版本/健康/knobs 可见 |
| U4 | 控制 | start/stop/restart/recreate/delete/日志/终端 | 二次确认 + 审计 |
| U5 | 状态 | loading/empty/error/progress/success | 不出现空白/假成功 |
| U6 | 宿主规范 | primitive/nano-ui/theme/i18n/a11y | 无宿主 DOM 嫁接 |
| U7 | 非目标 | 不做 Design Mode/pick/edit | 与 DNK 边界清晰 |

---

## 8. 总结：v1.3 的必要性与价值

### 8.1 为什么必须现在做

1. **产品预期已经出现**：两张截图分别代表「单机纵深」与「横向 fleet」；用户明确要 `dashboard + control`，不是「把 `/status` 画成卡片」。
2. **当前模型无法承载**：一 profile 一 env 容器；第二个 container 没有名字/端口/状态/registry/API；面板只能画单例。
3. **消费者被卡住**：[DNK] 固定 route、[DNT] 只带 sessionId；没有 `sandboxId`，多 sandbox 无法寻址。
4. **真源/协议债务已经可见**：registry 内存、`attached` 布尔、terminal plane 全局、perf 声明漂移、`stateVolume` 与实挂载不一致。
5. **继续拖的代价**：面板会变成「单例皮肤」；消费者会继续加私有假设；台账会继续漂移；未来的 xray/gateway/S3 无法接入。

### 8.2 预期价值

| 维度 | 价值 |
|---|---|
| 产品 | 真正的 fleet + detail + control；「挂第二个 sandbox」可用；服务/版本/资源/健康/部署一屏可见 |
| 架构 | sandbox 成为一等对象；kernel 与 driver 边界更清晰；多 profile 可插拔 |
| 运维 | 创建/启停/重建/升级/删除闭环；端口/状态/卷可追溯；用量可回溯 |
| 消费者 | DNK/DNT 可按 `sandboxId` 寻址；跨 sandbox 隔离；默认 `default` 平滑迁移 |
| 测试 | 真实多 sandbox 用例；不再用单例测试冒充 fleet |
| 治理 | registry/bindings/security/perf 单一台账；披露矩阵明确；审计可追溯 |

### 8.3 范围与非目标

**范围**：本地单用户、单 host、多 env、多 sandbox；Apple container 首期；fleet + detail + control；session/owner 披露；24h/7d/30d 用量。

**非目标**：多租户团队共享；GPU/温度/功耗；Design Mode/pick/edit；独立 HTML shell；新 release-gate；NVX/Windows（后置）。

### 8.4 建议顺序

```text
1. 冻结模型（sandbox 一等对象 / scope / 命名 / 端口 / 状态 / 隔离）
2. 真源：durable registry + reconcile + 端口池 + 状态卷 + telemetry
3. 协议：对象合同 + 状态机 + 错误 + 幂等 + 披露 + 台账
4. API：list/create/remove/lifecycle/knobs/services/usage/processes/fleet
5. UI：入口 → fleet → detail → control → 状态/空态/审计
6. 消费者：DNK/DNT sandboxId + 默认 default
7. 迁移：adopt 现有 env 容器 + 快照回滚
```

### 8.5 最终判断

**v1.3 不是一次 UI 迭代，而是一次「产品单元」升级。** 它把 [DNLS] 从「一个 profile 一个容器」的宿主，升级为「一台 host 上多个 sandbox、每个 sandbox 有服务/版本/资源/健康/部署/用量」的 fleet control plane。两张截图只是把这个需求显性化；真正的价值在于：**sandbox 终于成为可枚举、可寻址、可治理、可观测、可控制的对象。**

如果只做面板，不做模型，结果会是「一个漂亮的单例页」；如果先做模型，面板只是它的自然投影。建议先冻结 V13-Q1–V13-Q8（见 §8.6），再进入实现。

### 8.6 待 [业主] 裁决

| ID | 决策 | 影响 |
|---|---|---|
| V13-Q1 | sandbox 是否成为一等对象（一 host 多 container）？ | 决定 fleet/单例 |
| V13-Q2 | `profile.scope`：`shared` / `session` / `sandbox` 怎么定？ | 实例粒度 |
| V13-Q3 | 命名/端口池/状态卷布局 | 第二个 sandbox 能否无冲突 |
| V13-Q4 | registry 是否 durable + `container list` reconcile？ | 台账/孤儿 |
| V13-Q5 | 是否接受每 sandbox 独立 page/CDP/history？ | 覆盖 T-O-27 共享 page |
| V13-Q6 | API 形状：`/sandboxes` 对象路径，还是 `/inspect` 能力路径？ | bindings/台账 |
| V13-Q7 | 面板放 DNLS 包内，还是独立 console 插件？ | 包合同/安装 |
| V13-Q8 | DNK/DNT `sandboxId` + 默认 `default` 是否批准？ | 消费者改造/迁移 |

---

## 9. 边界提案：DNLS 与 DNCS 的分工（2026-11-19 追加）

> 本节回答 [业主] 的追问：DNCS 预期接入远端 VM，理论上可接入任何 sandbox；如果 DNLS 也实现「可注入多个 sandbox（container 或 VM）」，两者的边界在哪里。

### 9.0 [业主] 判定条件（2026-11-19）

[业主] 给出的两条判据，比本文上一版的「local vs remote」更准确。我支持，并建议把它登记为 DNLS/DNCS 的 durable 边界：

| 判据 | 原文要点 | 工程含义 |
|---|---|---|
| **J1 真源/生命周期** | 真源在本地，则无论 sandbox 类型、无论是否在 local 环境，只要创建、状态管理、销毁生命周期、执行状态的状态管理由本地控制，就属于 DNLS | 所有权跟**控制面**，不跟物理位置；local/remote 只是 provider 属性 |
| **J2 性质** | 对接的是 session + session 生命周期 → DNCS；接手的是完整 env、操作 env 生命周期、env 内 session 是附带 → DNLS | 以**主对象**判定：session 为主 → DNCS；env 为主 → DNLS |

**我支持这两条，但要补一个必要条件：**

> **J1 的「真源在本地」必须是「排他控制」**：如果远端 provider 仍能通过自己的控制台/API 独立创建、销毁、改变 env 生命周期，那么本地 registry 只是副本，不是唯一权威，J1 不成立。此时要么通过契约把 provider 降级为**纯执行后端**（不能 out-of-band 改生命周期），要么判给 DNCS（session 语义）。

否则会出现「本地以为是 DNLS 的 sandbox，远端已经把它删了」的双真源冲突。

### 9.1 先把三个对象拆开

当前讨论把三个东西混在了一句「sandbox」里：

| 对象 | 定义 | 生命周期 | 典型接口 |
|---|---|---|---|
| **Sandbox** | 执行环境（container / VM），有资源、端口、文件系统、进程、健康 | create/start/stop/restart/recreate/remove | `container` CLI、VM API、本地/远端 endpoint |
| **Session** | 绑定 workspace 的会话/agent 运行时，有 prompt、消息、附件、tags、insights | create/sleep/archive/terminate | carrier REST、native dsh Session |
| **Carrier** | 承载 session（以及其 workspace/VM）的远端 provider/protocol | 由 carrier 拥有 | HTTPS API、SSH、native projection |

**按 J1/J2：DNLS 拥有「env 类 sandbox 的控制面」，DNCS 拥有「session 类载体」。** 一个 sandbox 是否属于 DNLS，不看它跑在本地还是远端，而看：① 它的创建/状态/销毁是否由 DNLS 的 registry/state machine 排他控制；② 我们接手的是 env 生命周期，还是 session 生命周期。远端 VM 只有在 DNLS 排他控制其生命周期时才是 DNLS 的 sandbox；如果它的生命周期由 carrier 拥有，它就是 carrier 的 workspace，属于 DNCS 的 session 语义。DNCS 的语义边界已经写清楚：

- [`README.md:7-9`](../../../dsh-nano-cloud-session/README.md#L7-L9)：云端工作区 = carrier 远端 VM 承载的单租户 hosted workspace；dsh 只做视窗与操作面；canonical 在远端；工作区生命周期 = session 生命周期；SSH lane 是核心功能，终端本体属 [DNT]。
- [`src/host/profiles.js:9-11`](../../../dsh-nano-cloud-session/src/host/profiles.js#L9-L11)：profile 的 `carrier` 是 `devin`，形状留给未来 carrier。
- [`src/client/carriers.js:1-3`](../../../dsh-nano-cloud-session/src/client/carriers.js#L1-L3)：新增 carrier = 一个 preset 对象 + 一个 host adapter，不是第二套 onboarding。
- [`index.js:21-34`](../../../dsh-nano-cloud-session/index.js#L21-L34)：DNCS 的路由是 `/nano-cloud-session/*`，没有 sandbox 生命周期路由。
- [`src/host/ssh-keys.js:1-13`](../../../dsh-nano-cloud-session/src/host/ssh-keys.js#L1-L13)：只生成 keypair 和命令，不 spawn；终端归 [DNT]。
- [`src/host/devin-api.js:1-16`](../../../dsh-nano-cloud-session/src/host/devin-api.js#L1-L16)：REST v3 的 session API；DELETE 是 suspend，不是 VM 硬删。

**结论：DNCS 是 session/carrier 客户端，不是 sandbox provider。** 它没有 `container inspect/start/stop`，也没有 VM 生命周期；它有的是 session 生命周期、消息/附件/tags/insights、native dsh Session 投影和 SSH 引导。

### 9.2 边界规则

| 规则 | 内容 |
|---|---|
| **R1 所有权跟控制面** | 谁排他持有 sandbox 的创建/状态/销毁生命周期与执行状态机，谁拥有它；local/remote、container/VM 都只是 provider 属性（J1）。 |
| **R2 排他性检验** | 远端 provider 若能 out-of-band 创建/销毁/改变生命周期，本地真源就不是唯一权威；此时不能判给 DNLS，除非契约把 provider 降级为纯执行后端。 |
| **R3 主对象检验** | 以 session 为主（消息/附件/tags/insights、sleep/archive/terminate）→ DNCS；以 env 为主（服务/端口/进程/文件系统、start/stop/recreate）→ DNLS（J2）。 |
| **R4 一个对象一个 owner** | 同一 env 不能既由 DNLS 又由 DNCS 持有生命周期；同一 session 不能既由 DNCS 又由 DNLS 持有生命周期。允许「DNLS env + DNCS session on top」的组合，但各自 owner 唯一。 |
| **R5 不跨凭证/导入/状态** | DNLS 不 import DNCS 的 `devin-api`/token；DNCS 不 import DNLS 的 `backend-apple`/container CLI；不共享 state volume / 错误目录 / 用量表，除非显式登记。若 DNLS 控制远端 env，远端凭证归 DNLS，不归 DNCS。 |
| **R6 只在只读 descriptor 层汇合** | 统一视图只消费 `SandboxDescriptor`（只读投影）；生命周期仍归各自 owner。 |
| **R7 kind/location 是属性** | 「container vs VM」「local vs remote」不是判别式；它们是 descriptor 的字段，不决定 owner。 |

**J1 的可操作检验（五问，全部 Yes 才判 DNLS）**：

1. 谁持有该 env 的 durable registry / desired state？
2. 谁能在没有另一个插件的情况下 create/delete？
3. 谁做 drift reconciliation（provider 状态与 desired 不一致时谁修）？
4. 谁持有状态机、错误目录、retry 义务？
5. 谁持有该 provider 的凭证/CLI 特权？

**J2 的可操作检验（四问，session 为主则 DNCS）**：

1. 用户主要操作的是消息/附件/insights，还是服务/进程/端口？
2. 生命周期是 sleep/archive/terminate，还是 start/stop/recreate/remove？
3. 失败域是网络/鉴权/quota，还是容器/引擎/端口/状态卷？
4. env 是「用户要管理的对象」，还是「session 的附带 workspace」？

### 9.3 边界矩阵

| 维度 | [DNLS] | [DNCS] |
|---|---|---|
| 控制面位置 | 本地 dsh host（registry/state machine） | 本地 dsh host（session view/registry） |
| Provider 位置 | local 或 remote（J1 允许远程 backend） | remote carrier |
| 特权 | 本地 container/VM CLI；若控远端，provider API/credential | carrier API/PAT/SSH key |
| 对象 | **env**：服务/端口/进程/文件系统/资源 | **session**：消息/附件/tags/insights |
| canonical | DNLS registry/state machine（对 env） | carrier session canonical；DNCS 不复制 |
| 生命周期 | create/start/stop/restart/recreate/remove | create/sleep/archive/terminate |
| 资源治理 | cgroups/ports/volumes；或 provider quota（若 DNLS 控远端） | carrier quota/ACU/billing |
| 失败域 | 容器/引擎/端口/状态卷；或远端 provider 网络（若 DNLS 控远端） | 网络/鉴权/quota/provider |
| 鉴权 | 本地无；远端 backend 用 provider credential（DNLS 持有） | PAT/org/SSH key；host-only store |
| 传输 | 本地 HTTP/WS、CDP、PTY；远端 provider API | HTTPS REST、native dsh Session、SSH |
| UI | env fleet/control panel（可含 DNLS 控的远端 env） | 云端工作区 sidebar/settings/native workbench |
| 消费者 | [DNK]/[DNT]/agent | dsh native Chat/agent |
| 真源 | env 控制面 registry | session canonical（remote） |

### 9.4 案例判定

| 场景 | 归谁 | 理由（J1/J2） |
|---|---|---|
| 本地 Apple container | **DNLS** | 本地 CLI + 本地 registry；env 主对象 |
| 本地 VM（未来 nvx/local） | **DNLS** | 本地 provider；env 主对象 |
| 远端 VM，DNLS 通过 provider API 排他控制 create/state/destroy | **DNLS** | J1 成立：真源/状态机在本地；remote 只是 backend |
| 远端 VM，carrier 拥有生命周期，DNCS 只做 session | **DNCS** | J1 不成立（provider 是权威）；J2 session 主对象 |
| 远端 container，DNLS 通过 API 排他控制生命周期 | **DNLS** | J1 成立；container/VM 只是 kind |
| 远端 container，carrier 拥有生命周期，DNCS 只做 session | **DNCS** | J1 不成立；J2 session 主对象 |
| 远端 VM，仅 SSH 可达，carrier 控生命周期 | **DNCS** | SSH 只是 lane；env 是 carrier workspace |
| DNLS env + DNCS session on top | **组合** | env 归 DNLS；session 归 DNCS；各自 owner 唯一（R4） |
| 本地 agent + 远端 session | **两者并列** | 本地 env 归 DNLS；远端 session 归 DNCS；不嵌套 |
| 统一 runtime picker | **宿主/中性层** | 只读聚合；不给任何一方新增远端生命周期所有权 |

### 9.5 「DNLS 注入多个 sandbox」的三种读法

| 读法 | 判定 | 说明 |
|---|---|---|
| A. 同一 host 多个**本地** sandbox（container/VM） | ✅ 属于 DNLS | 本地 provider；env 主对象 |
| B1. DNLS 通过 provider API **排他控制**远端 sandbox 的 create/state/destroy | ✅ 属于 DNLS | J1 成立；DNLS 必须持有 provider credential + registry/state machine；remote 只是 backend |
| B2. DNLS 只「挂」一个 carrier 拥有的远端 sandbox，生命周期仍在 carrier | ⚠️ 属于 DNCS | J1 不成立；DNLS 只能消费只读 descriptor，不能拥有生命周期 |
| C. 一个面板同时看本地 + 远端 | ⚠️ 属于**宿主/中性层** | 只读聚合；不给任何一方新增所有权 |

**关键判断**：

- 如果 DNLS 做 A/B1，边界清晰：DNLS = env 控制面；DNCS = session 载体。
- 如果 DNLS 做 B2，它不是 owner，只是 consumer；把它画进 DNLS 的 fleet 可以，但不能给它 create/stop/delete 按钮。
- 如果 DNLS 做 C，正确位置是**宿主级或中性的 runtime registry**，不是 DNLS 包内。DNLS 只注册自己控制（A/B1）的 descriptor；DNCS 注册远端 session（B2）的 descriptor；面板只读。
- **反例**：DNLS 既没有排他控制、又要提供 create/delete 按钮，就是「双真源 + 越权」；这会把 carrier 的生命周期复制到本地，违反 R1/R4。

### 9.6 合同建议：只读 descriptor

统一视图可以共享一个**只读** `SandboxDescriptor`，但生命周期 API 各自保留：

```text
SandboxDescriptor
  sandboxId, name
  controller: "dnls" | "dncs"        # 谁持有生命周期/真源（J1）
  provider: "apple-container" | "local-vm" | "remote-vm:<backend>" | "devin:<carrier>"
  kind: "container" | "vm"
  location: "local" | "remote"
  host, profile?
  state: creating|running|stopped|missing|failed|unknown
  endpoints: { terminal?, cdp?, http?, ssh? }
  capabilities: string[]
  resources?: { cpus, memoryBytes, ... }
  health?: { ready, planes, lastError }
  version?: { profile, image, digest, pin }
  owner?: { sessionId?, principal? }
```

约束：

- descriptor 是**投影**，不是生命周期 API；不提供 create/start/stop。
- `controller` 决定动作路由：`dnls` → `/nano-local-sandbox/sandboxes/...`（无论 location 是 local 还是 remote）；`dncs` → `/nano-cloud-session/...`。
- `provider` 与 `location` 只是属性；不决定 owner。
- 错误目录、凭证、state volume、用量表各自持有；不共享，除非 [业主] 登记。
- 面板按 `controller` 分组，其次 `provider`/`location`；动作路由到 owner；不把「本地 stop」和「远端 terminate」画成同一个按钮。

### 9.7 UI 建议

- **DNLS 面板**：展示 DNLS 控制的 env——**local 或 remote 都可以**，只要 `controller: dnls`；不列 DNCS 的 session。
- **DNCS sidebar**：展示云端 session；不列 DNLS 的 env（即使 session 的 workspace 跑在 DNLS 的 env 上，也只显示 session 视角）。
- **统一 runtime picker**（如果需要）：宿主级/中性只读视图；显示 `controller`/`provider`/`location`；动作跳转到各自面板。不要让 DNLS 面板执行 DNCS 的 archive/terminate，也不要让 DNCS sidebar 执行 DNLS 的 container stop。
- 两边的「状态」语义不同：env `phase`（creating/running/stopped/missing/failed）与 session state（running/suspended/archived）不能合并成一个枚举。
- 远端 env 若 `controller: dnls`，它的动作在 DNLS 面板；若 `controller: dncs`，它只是 session 的 workspace，不在 DNLS 面板出现。

### 9.8 反模式与验收

| 反模式 | 后果 |
|---|---|
| DNLS import DNCS 的 carrier client/token | 本地插件持有别家的 session 凭证；违反 R5 |
| DNCS import DNLS 的 `backend-apple`/container CLI | 远端 session 客户端持有本地 env 特权；违反 R5 |
| DNLS 给 carrier-owned 的 env 提供 create/delete（B2） | 双真源：carrier 也能改生命周期；违反 R2 |
| 一张表同时有 env stop 和 session terminate | 失败域/语义混在一起；用户误操作 |
| 一个 error catalog 同时有 `port_exhausted` 与 carrier `403` | 错误语义混淆；retry 义务不同 |
| 一个 usage 表混 cgroups 与 ACU | 指标不可比；治理失真 |
| DNLS 作为「任意 sandbox 聚合器」但没有排他控制 | 包内出现远端生命周期；与 DNCS 双 owner |

**验收测试**：

1. **拔插测试**：卸载 DNCS，DNLS 仍能创建/启停其控制的 env；卸载 DNLS，DNCS 仍能创建/操作远端 session。
2. **导入测试**：DNLS 源码不出现 DNCS 的 carrier client/路径；DNCS 源码不出现 `container`/`backend-apple`。
3. **凭证测试**：DNLS 不读 `nano-cloud-session.json`；DNCS 不读 DNLS 的 provider credential。
4. **descriptor 测试**：同一 `SandboxDescriptor` 形状，`controller/provider/location` 必填；DNLS 控制的远端 env 也是 `controller: dnls`。
5. **动作路由测试**：面板按钮按 `controller` 路由；DNLS 的 stop 不发到 DNCS；DNCS 的 terminate 不发到 DNLS。
6. **失败域测试**：env 端口/状态失败与 session 403/网络失败返回不同错误目录/重试策略。
7. **排他性测试**：若 provider 能 out-of-band 删除 env，DNLS 必须把它标为「非排他控制」并拒绝 owner 声明（或要求契约升级）。

### 9.9 结论

> **边界不在「container vs VM」，也不在「local vs remote」，而在「谁排他持有 env 的控制面真源/生命周期」+「主对象是 env 还是 session」。**
>
> - **J1 成立（DNLS 排他控制 create/state/destroy）** → env 归 DNLS，无论 provider 在 local 还是 remote。
> - **J1 不成立（carrier 持有生命周期）** → 它是 carrier 的 workspace，归 DNCS 的 session 语义；DNLS 最多消费只读 descriptor。
> - **J2 是 session 为主** → DNCS；**J2 是 env 为主** → DNLS。
>
> 远端 VM 不是天然属于 DNCS；只有当它的生命周期由 carrier 拥有、我们只做 session 时，才属于 DNCS。反过来，远端 VM 只要由 DNLS 排他控制，就属于 DNLS。
>
> 如果要做「一个面板看所有 env/session」，那是**宿主级/中性的 runtime registry + 只读 descriptor**；DNLS 贡献它控制的 env，DNCS 贡献它承载的 session；两者只在只读视图汇合，不在生命周期/凭证/真源层汇合。

---

## 10. Case-study 驱动的 v1.3 升级目标（2026-11-19 追加 2）

> 本节回答 [业主] 的四个 case：DNT 长期 terminal、DNMS `/imagine` 执行宿主、DNT kitesurf in workerd、DNN fx + 浏览器 DB 迁移 KV/D1。每个 case 先给代码事实，再给协议检索、拓扑分解、gap、v1.3 目标与面板落点；最后做跨 case 综合，并与原始 control-panel + dashboard 需求合并。

### 10.0 四个 case 是 v1.3 的 demand proof

| Case | Consumer | 需要的 sandbox 原语 | 面板对象 | 归属（J1/J2） |
|---|---|---|---|---|
| 1. DNT 长期 terminal | [DNT] | terminal session + in-sandbox broker + attach | Terminals | DNLS（env 控制面） |
| 2. DNMS `/imagine` | [DNMS] | `sandbox.exec` job + stdout/stderr/exit + output files | Jobs | DNLS（env），DNMS 持有模板 |
| 3. DNT kitesurf in workerd | [DNT] + Kitesurf profile | terminal target（sandbox/profile/service）+ 服务健康 | Services + Terminals | DNLS（env） |
| 4. DNN fx + KV/D1 | [DNN] | storage binding（KV/D1）+ 单次 tool-call exec | Storage + Jobs | DNLS（workerd env），DNN 持有数据 |

**共同点**：四个 case 都不是 UI 需求，而是 **sandbox 级原语缺失**——没有 target、没有 broker、没有 exec job、没有 storage binding。它们正是 v1.3 从「单例容器宿主」升级为「env 控制面」的 demand proof。

---

### 10.1 Case 1：[DNT] 长期 terminal

#### 10.1.1 现状（代码事实）

| 事实 | 证据 |
|---|---|
| DNT 的 terminal 是「persistent, addressable object」：id/addr/name/parent/keep/labels/status/phase/turn；**survive WebSocket detach**，replay log 支持 reattach | [`sessions.js:1-13`](../../../dsh-nano-terminal/src/host/sessions.js#L1-L13) |
| 持久化：`session.json` + `screens/<id>.bin` + `session-snapshots/`；重启后以 **placeholder** 回归，首次 attach 才 spawn shell 并重放屏幕尾；**程序绝不重跑** | [`persist.js:1-17`](../../../dsh-nano-terminal/src/host/persist.js#L1-L17)、[`sessions.js:266-351`](../../../dsh-nano-terminal/src/host/sessions.js#L266-L351) |
| local lane 是宿主 `ctx.subprocess.spawnTerminal`（node-pty）；mcp lane 连远端 MCP terminal 端点 | [`sessions.js:237-247`](../../../dsh-nano-terminal/src/host/sessions.js#L237-L247)、[`lanes.js:199-247`](../../../dsh-nano-terminal/src/client/lanes.js#L199-L247) |
| idle sweep：无 socket 且超过 `idleTimeoutMs` 且非 `keep` 才关 | [`sessions.js:386-394`](../../../dsh-nano-terminal/src/host/sessions.js#L386-L394)、[`index.js:303`](../../../dsh-nano-terminal/index.js#L303) |
| DNT v2：`dnt-ws-v2` framed channel（CREDIT/SNAPSHOT/FACTS/AUTO_INPUT/RESIZE），`ready` 带 replay/align | [`web-routes.js:35-179`](../../../dsh-nano-terminal/src/host/web-routes.js#L35-L179) |
| DNLS term bridge：`active` Map **按 sessionId**；`container exec -it <envContainer> /bin/sh`；无持久化；`shutdownTerms` 全关 | [`term-bridge.js:4-5`](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L4-L5)、[`term-bridge.js:23-83`](../../../dsh-nano-local-sandbox/src/host/term-bridge.js#L23-L83)、`:120-126` |
| DNLS `term.session.create` 只读 `sessionId/cols/rows`，忽略 `lane/shell/title`；没有 sandbox/profile 目标 | [`routes.js:1340-1356`](../../../dsh-nano-local-sandbox/src/host/routes.js#L1340-L1356) |
| DNT `McpLane` POST `term.session.create` 只带 `cols/rows/sessionId`；`dnt-ws-v1` raw；无 v2/align/snapshot/tid/ctx | [`lanes.js:214-247`](../../../dsh-nano-terminal/src/client/lanes.js#L214-L247) |
| DNT 的 `term.audit` 写到 DNLS 目录 | [`dsh-nano-terminal/index.js:39`](../../../dsh-nano-terminal/index.js#L39) |

#### 10.1.2 协议层

| 协议 | Owner | 当前 | Gap |
|---|---|---|---|
| `dnt-ws-v2` framed | DNT | CREDIT/SNAPSHOT/FACTS/AUTO_INPUT/HELD/RESIZE | DNLS 只实现 `dnt-ws-v1` raw |
| `/dsh-nano-terminal/mcp` | DNT | 25 tools，含 ctx/wait/stats/health/audit | 只服务 DNT 自己的 host PTY |
| `/nano-local-sandbox/mcp` `term.session.*` | DNLS | 8 tools，`dnt-ws-v1`，只 sessionId | 无 sandboxId/paneId；无 snapshot/credit/align；无持久化 |
| attach URL | DNLS | `ws://127.0.0.1:<port>/term?session=&token=` | token 在 query；无 broker 身份；host restart 失效 |
| persistence | DNT / DNLS | DNT session.json/screens；DNLS 无 | 容器 terminal 无 replay；重启即丢 |
| audit | DNT / DNLS | DNT 写 DNLS 目录 | 跨插件写目录；无 sandbox 维度 |

#### 10.1.3 拓扑

```text
Browser DNT (wasm)
├─ local lane  /dsh-nano-terminal/stream (dnt-ws-v2)
│    └─ DNT host PTY (node-pty) ── host shell
│         ├─ session.json / screens / snapshots  (persist)
│         └─ placeholder on host restart → first attach respawns shell + replay
└─ mcp lane  /nano-local-sandbox/mcp  term.session.create
     └─ DNLS term-bridge (active Map by sessionId)
          └─ container exec -it <envContainer> /bin/sh
               └─ sandbox PTY (no persistence, no broker, dies with dsh host)
```

**两套持久化域**：DNT 有 `session.json` + screen tail；DNLS 只有内存 `active`。容器 terminal 重启即丢，DNT 的 placeholder 机制对它不生效。

#### 10.1.4 Gap

| # | Gap | 后果 |
|---|---|---|
| G1 | 进程生命周期跟 dsh host 绑定 | 宿主重启 → 容器 PTY 死；长跑命令丢失 |
| G2 | DNLS 只支持 v1 | 无 credit/snapshot/align；重连空屏/重复输出 |
| G3 | 没有 sandbox/pane 身份 | 同一 dsh session 多 pane 合并；多 sandbox 无法区分 |
| G4 | 没有 terminal registry/scrollback | 无法在面板列出/恢复 terminal |
| G5 | audit 跨目录 | DNT 写 DNLS 真源；无 sandbox 维度 |
| G6 | `keep` 只 respawn shell，不重跑命令 | 长跑程序无法自动恢复 |

#### 10.1.5 v1.3 目标

| 层 | 目标 | 验收 |
|---|---|---|
| 真源 | `TerminalSession` 记录：`terminalId/sandboxId/paneId/owner/shell/cwd/phase/replayBytes/broker` | 重启后记录保留；broker 可重连 |
| 协议 | DNLS terminal v2：CREDIT/SNAPSHOT/align/FACTS/AUTO_INPUT；`term.session.create` 带 `sandboxId/paneId`；attach 返回 snapshot | DNT `McpLane` 可用 v2；重连不空屏 |
| broker | in-sandbox PTY broker（`profiles/terminal/pty-entry.mjs` 目前是 2 行 stub）或持久 host broker；survive dsh host restart | 杀 dsh host 后 terminal 仍可 reattach |
| API | `term.list/attach/read/write/resize/close`；broker health；replay | 两个 pane 独立；close 幂等 |
| UI | Terminals 页：session 列表、target、state、replay、attach、close、audit | 面板可见/可操作 |

#### 10.1.6 面板落点

- Fleet：每个 sandbox 的 active terminal 数。
- Sandbox detail → Terminals：pane、owner、state、last output、replay、broker 位置。
- 动作：attach / detach / close / reopen；只读诊断。
- 与 DNT 的边界：DNT 持有 UI/protocol；DNLS 持有 broker/lifecycle。

---

### 10.2 Case 2：[DNMS] `/imagine` 执行宿主

#### 10.2.1 现状（代码事实）

| 事实 | 证据 |
|---|---|
| `/imagine` 是 DNMS 注册的 skill（`userInvocable: true`, `modelInvocable: false`） | [`index.js:224-240`](../../../dsh-nano-model-selector/index.js#L224-L240) |
| **渲染出的命令在 session agent 的 bash tool 里执行，不在 DNMS 宿主** | [`lib/host-media.js:11-16`](../../../dsh-nano-model-selector/lib/host-media.js#L11-L16) |
| 模板：prompt/out 作为数据文件；out 用 `grep -Eq` 门禁；grok 把 `~/.grok` 凭证拷到 `imagine/.grok`、`GROK_HOME` 指到工作区，运行 `grok -p ... --always-approve --cwd "$PWD"` | [`host-media.js:106-150`](../../../dsh-nano-model-selector/lib/host-media.js#L106-L150) |
| codex 模板是 `codex exec "... Save the image file to $OUT"`（占位） | [`host-media.js:158`](../../../dsh-nano-model-selector/lib/host-media.js#L158) |
| 二进制探测在**宿主** `~/.grok/bin`、`~/.local/bin`、`which` | [`host-media.js:114-171`](../../../dsh-nano-model-selector/lib/host-media.js#L114-L171) |
| `imagineRun` 在 host 侧把 prompt/out 暂存到 `cwd/imagine/`（校验 cwd/out） | [`host-media.js:224-255`](../../../dsh-nano-model-selector/lib/host-media.js#L224-L255) |
| DNMS inject 只有 `llm/webServer/connection/skills`；没有 `subprocess`/sandbox | [`index.js:23`](../../../dsh-nano-model-selector/index.js#L23) |
| 安全边界：模板无占位符替换；prompt/out 是数据；注入测试覆盖 | [`test/imagine-inject.test.mjs:1-20`](../../../dsh-nano-model-selector/test/imagine-inject.test.mjs#L1-L20) |

#### 10.2.2 协议层

| 协议 | 当前 | Gap |
|---|---|---|
| skill 注册（`ctx.skills`） | `/imagine` 文本 | 没有机器可执行的 exec 合同 |
| shell 模板 | 交给 agent bash tool | 宿主 shell，不是 sandbox |
| 二进制/凭证 | host `~/.grok` / `$HOME` | 容器内没有同一份 binary/credential staging |
| 输出 | workspace `imagine/<slug>.<ext>` | 没有 job 输出/校验/回传 |
| 流/超时/退出码 | bash tool 自带 | 没有 sandbox 级 job/stream/timeout/exit |
| 资源/审计 | 无 | 没有 cgroup/配额/审计 |

#### 10.2.3 拓扑

```text
DNMS host (skill text)
  → composer `/imagine`
  → agent
  → bash tool (host shell, workspace root)
  → grok/codex CLI (host binary)
  → imagine/.prompt.txt / .out.txt / <slug>.<ext>
```

目标（sandbox 执行）：

```text
DNMS host (skill text, template)
  → neutral `sandbox.exec` (HTTP/MCP)
  → DNLS sandbox (kitesurf/workerd/other)
       ├─ workspace mount (cwd)
       ├─ binary (grok/codex) from image or mount
       ├─ secret ref (GROK_HOME staging)
       └─ job: stdout/stderr/exit/timeout/resources
  → output file retrieved / validated
```

#### 10.2.4 Gap

| # | Gap | 后果 |
|---|---|---|
| G1 | 没有 sandbox target | 只能在宿主跑；项目在容器时无法用 |
| G2 | 二进制只在宿主探测 | 容器内没有 grok/codex；`/imagine` 失败 |
| G3 | 凭证从 `$HOME` 拷贝 | 容器内无宿主 home；secret 注入未定义 |
| G4 | 没有 job/stream/exit/timeout | 无法知道成功/失败/耗时/资源 |
| G5 | 没有输出回传/校验 | 图片可能留在容器/宿主的错误路径 |
| G6 | 没有审计/重试/取消 | 长跑/失败不可控 |
| G7 | 模板安全只覆盖 host shell | 容器 exec 需要同一套边界（argv 不是 shell 字符串） |

#### 10.2.5 v1.3 目标

| 层 | 目标 | 验收 |
|---|---|---|
| 真源 | `ExecJob` 记录：jobId、sandboxId、command/argv、cwd、env/secretRef、state、exit、duration、resource、output refs | 重启后 job 记录保留（有界） |
| 协议 | `sandbox.exec`：argv（非 shell 字符串）+ cwd + env + secretRef + stdin + timeout + resources + stream；返回 jobId；`sandbox.exec.status/logs/cancel` | 不把用户文本拼进 shell；注入测试仍绿 |
| API | HTTP/MCP 同源；stream（SSE/WS）；output files；exit code；cancel；timeout | DNMS 可消费；无 DNLS import |
| Secret | provider-neutral secretRef；不把 `~/.grok` 拷进工作区 | 凭证不落 workspace；审计 |
| UI | Jobs 页：command/target/state/exit/stdout tail/output/duration/resources | 面板可见/可取消/可重试 |

#### 10.2.6 面板落点

- Sandbox detail → Jobs：运行中/历史，command、target、exit、duration、stdout tail、output files。
- Fleet：running jobs 数、失败率。
- 动作：cancel / retry / open output；exec 默认不开放任意命令，只按模板/白名单。
- 与 DNMS 的边界：DNMS 持有 skill/template/engine 选择；DNLS 持有 exec job/lifecycle。

---

### 10.3 Case 3：[DNT] kitesurf in workerd

#### 10.3.1 现状（代码事实）

| 事实 | 证据 |
|---|---|
| Kitesurf profile 声明两个 service：`engine`（wrangler dev 8787）、`mcp-bridge`（8791）；`state.kv: volume`；4c/4G | [`profile.yaml:22-38`](../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L22-L38) |
| entrypoint：mcp-bridge 监督循环；workerd 由 `wrangler dev` 启动；state 在 `/var/lib/kitesurf-state` | [`entrypoint.sh:20-40`](../../../dsh-nano-local-sandbox/profiles/kitesurf/entrypoint.sh#L20-L40) |
| DNLS term bridge 只 `container exec -it <envContainer> /bin/sh`；没有 profile/service/cwd/env 目标 | [`backend-apple.js:288-293`](../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L288-L293)、[`routes.js:1349-1352`](../../../dsh-nano-local-sandbox/src/host/routes.js#L1349-L1352) |
| `profiles/terminal/pty-entry.mjs` 是 **2 行 stub**（只导出路径字符串） | [`pty-entry.mjs:1-2`](../../../dsh-nano-local-sandbox/profiles/terminal/pty-entry.mjs#L1-L2) |
| DNT `McpLane` 只带 `sessionId`；无 sandbox/profile/service | [`lanes.js:214-225`](../../../dsh-nano-terminal/src/client/lanes.js#L214-L225) |
| Kitesurf bridge 暴露 `/health`、`/control`、`/cdp`、`/mcp` | [`mcp-bridge.mjs:939-949`](../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L939-L949)、`:1059` |
| workerd 在容器内监听 8787；bridge 8791；容器内 `wrangler`/`node` 可用 | [`profile.yaml:25-31`](../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L25-L31) |

#### 10.3.2 协议层

| 协议 | 当前 | Gap |
|---|---|---|
| DNLS `term.session.*` | 8 tools，`dnt-ws-v1` | 无 sandbox/profile/service target；无 v2 |
| container PTY | `container exec -it` | 没有 cwd/env/service 上下文；无 broker |
| Kitesurf bridge | `/health` `/control` `/cdp` `/mcp` | DNT 不消费；无 service 级 terminal |
| workerd | `wrangler dev` 8787 | 无 service health/port 的终端上下文 |
| DNT v2 | CREDIT/SNAPSHOT/align | DNLS 不支持 |
| DNT ctx | `[ DNT:conv@term ]` | DNLS term 不 graft tid/conv |

#### 10.3.3 拓扑

```text
DNT wasm
  → /nano-local-sandbox/mcp  term.session.create {sessionId}
  → DNLS term-bridge
  → container exec -it kitesurf-dev /bin/sh
       └─ container:
            entrypoint.sh
              ├─ wrangler dev (workerd)  :8787
              └─ mcp-bridge              :8791  /health /control /cdp
            workspace /opt/kitesurf (ro)
            state /var/lib/kitesurf-state
```

目标：

```text
DNT wasm
  → term.create {sandboxId:'kitesurf-dev', service:'engine', cwd:'/opt/kitesurf'}
  → in-sandbox PTY broker (pty-entry)
       └─ workerd container shell with DNLS_HOME/DNLS_PORT/AGENT_BROWSER_CDP
  → attach v2 (snapshot + credit + align)
  → service health/ports visible in panel
```

#### 10.3.4 Gap

| # | Gap | 后果 |
|---|---|---|
| G1 | 没有 sandbox/profile/service target | 只能进 env 容器；不能选 workerd/engine 服务 |
| G2 | 没有 cwd/env | shell 落在默认目录，workerd 环境变量不保证 |
| G3 | 没有 in-sandbox broker | 宿主重启，workerd terminal 死 |
| G4 | 没有 service health | 不知道 engine/bridge 是否在跑 |
| G5 | 没有 v2 snapshot | 重连空屏/错位 |
| G6 | 没有 service 级 terminal | 无法区分 engine shell 与 bridge shell |

#### 10.3.5 v1.3 目标

| 层 | 目标 | 验收 |
|---|---|---|
| 真源 | `TerminalSession` 记录带 `sandboxId/profileId/service/cwd` | 面板可见 target |
| 协议 | `term.create` 接受 `sandboxId/profileId/service/cwd/env`；v2 attach | DNT 可指定 kitesurf/engine |
| broker | in-sandbox PTY entry（替换 stub） | 宿主重启后 reattach |
| 服务 | `services` 表：engine/bridge 端口、health、pid、logs | 面板可见；终端从 service 打开 |
| UI | Services + Terminals | 一键「在 engine 里开终端」 |
| 环境 | 注入 `DNLS_HOME/DNLS_PORT/AGENT_BROWSER_CDP/KITESURF_CDP_UPSTREAM` | `wrangler`/`node` 可用；workerd 上下文正确 |

#### 10.3.6 面板落点

- Sandbox detail → Services：engine、mcp-bridge、port、health、pid、restarts、last log。
- 每行 action：「Open terminal」「Logs」「Copy endpoint」。
- Terminals 页显示 target（sandbox/service/cwd）。
- 与 DNT 的边界：DNLS 持有 broker/service；DNT 持有渲染/协议。

---

### 10.4 Case 4：[DNN] fx + 浏览器 DB 迁移 KV/D1

#### 10.4.1 现状（代码事实）

| 事实 | 证据 |
|---|---|
| Notepad 的 canonical 是浏览器 IndexedDB `dsh-nano-notepad`，schema 4；stores：nodes/versions/images/settings/ui/blobs/**sync** | [`db.js:4`](../../../dsh-nano-notepad/src/client/db.js#L4)、`:7`、`:106-129` |
| `sync` store：cloud cursor + outbox；`readSyncMeta`/`writeSyncMeta` | [`db.js:750-769`](../../../dsh-nano-notepad/src/client/db.js#L750-L769) |
| 云同步：S3 manifest + files/images；cursor/outbox/merge policy；host 是签名 S3 代理 | [`sync.js:1-13`](../../../dsh-nano-notepad/src/client/sync.js#L1-L13)、[`s3-sync.js:1-12`](../../../dsh-nano-notepad/src/host/s3-sync.js#L1-L12) |
| fx 是 **one-shot browser wasm 引擎**；provider 走 `/nano-notepad/fx/chat/completions` → `ctx.llm` | [`fx-runtime.js:1-8`](../../../dsh-nano-notepad/src/client/fx-runtime.js#L1-L8)、`:59-80` |
| `note_*` tools 是 host-side executor，但执行在浏览器，写 IDB | [`fx-tools.js:1-8`](../../../dsh-nano-notepad/src/client/fx-tools.js#L1-L8)、`:75-114` |
| fx pipeline：确定性 stage executor；状态在 SQLite（OPFS），claim 走 S3 | [`fx-pipeline.js:1-8`](../../../dsh-nano-notepad/src/client/fx-pipeline.js#L1-L8)、`:58-69` |
| 浏览器状态在 IndexedDB，不在宿主文件系统 | [`AGENTS.md:86`](../../../dsh-nano-notepad/AGENTS.md#L86)、`:127` |
| 没有 KV/D1 代码；Kitesurf 的 `state.kv: volume` 是 workerd engine 的 KV 状态，不是通用 KV/D1 API | [`profile.yaml:32-33`](../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L32-L33) |

#### 10.4.2 协议层

| 协议 | 当前 | Gap |
|---|---|---|
| IndexedDB | 浏览器 canonical | 跨 origin/设备不可移植；容量/清理受浏览器 |
| S3 sync | manifest + CAS + outbox | 不是 KV/D1；无事务/查询 |
| fx OpenAI bridge | `/nano-notepad/fx/chat/completions` | 只解决 LLM；工具执行仍在浏览器 |
| note_* tools | 浏览器 IDB | 无 sandbox 执行 |
| pipeline | SQLite/OPFS + S3 claim | claim 不是 D1 事务；无 server-side canonical |
| KV/D1 | 无 | 无 API、无 runtime、无迁移 |

#### 10.4.3 拓扑

```text
Browser DNN UI
├─ IndexedDB (canonical notes)
├─ S3 sync (host proxy)  manifest/files/images
└─ fx wasm (one-shot)
     ├─ note_* tools → IDB
     └─ pipeline → SQLite/OPFS + S3 claim
```

目标：

```text
DNN UI
├─ Storage API (KV/D1)  →  DNLS workerd sandbox
│    ├─ KV get/put/list/del
│    └─ D1 query/exec/batch/migrate
├─ fx single tool-call → sandbox.exec job → result
└─ local IDB cache / offline queue (not canonical)
```

#### 10.4.4 Gap

| # | Gap | 后果 |
|---|---|---|
| G1 | 没有 KV/D1 runtime/API | 长期存储仍在浏览器 |
| G2 | 没有 storage binding/volume | 无法备份/迁移/多设备 |
| G3 | 没有迁移协议 | IDB→KV/D1 无 dual-write/cutover/rollback |
| G4 | fx 工具在浏览器 | 单次 tool-call 无法在 sandbox 执行 |
| G5 | pipeline claim 在 S3 | 没有 D1 事务/fencing |
| G6 | 没有 storage 面板 | 看不到 KV keys/D1 tables/用量/迁移状态 |

#### 10.4.5 v1.3 目标

| 层 | 目标 | 验收 |
|---|---|---|
| 真源 | 新增 `profiles/workerd`（或 `profiles/storage`）sandbox：KV/D1 bindings + state volume；生命周期由 DNLS 控制（J1） | sandbox 创建/启停/删除；KV/D1 可用 |
| 协议 | Storage API：`kv.get/put/list/del`、`d1.query/exec/batch/migrate`、`backup/restore` | DNN 可读写；事务/错误明确 |
| 迁移 | IDB export → stage → KV/D1 import → dual-write/outbox → cutover → rollback；DNN 持有数据 schema/decision | 不丢笔记；可回滚；冲突可见 |
| fx | 单次 tool-call 走 `sandbox.exec`（tool name/args/result）；不再把工具执行放在浏览器 | 结果/错误/超时明确 |
| UI | Storage 页：KV keys、D1 tables/rows、size、migration progress、backup/restore；Jobs 页看 fx | 面板可见/可操作 |
| 边界 | DNN 持有笔记数据/schema；DNLS 持有 workerd sandbox/KV/D1 runtime | 无数据双写；无跨插件 import |

#### 10.4.6 面板落点

- Sandbox detail → Storage：KV/D1 bindings、keys/tables、size、usage、backup/restore。
- 迁移向导：IDB→KV/D1 的预检、差异、cutover、rollback。
- Jobs：fx 单次 tool-call 的 job。
- 与 DNN 的边界：DNN 是数据 owner；DNLS 是 runtime owner。

---

### 10.5 跨 case 综合：四个原语 + 一个面板

| 原语 | 覆盖 case | 当前 | v1.3 目标 | 面板对象 |
|---|---|---|---|---|
| **Target** | 1/2/3/4 | 只有 sessionId/env 容器 | `sandboxId + profileId + service + cwd` | fleet/detail selector |
| **Terminal** | 1/3 | v1 raw、无持久化 | v2 + in-sandbox broker + replay/snapshot | Terminals |
| **Exec** | 2/4 | 无 | `sandbox.exec` job + stream/exit/timeout/output | Jobs |
| **Storage** | 4 | 无 | KV/D1 binding + API + migration | Storage |
| **Service** | 3/4 | 只有 plane 灯 | services/ports/health/pid/logs | Services |
| **Secret** | 2/4 | `$HOME`/S3 | provider-neutral secretRef | Settings/Security |
| **Audit** | all | DNT 写 DNLS 目录 | per-object audit | Timeline |
| **Usage** | all | stats 不可达 | per job/terminal/storage | Usage |

**共同缺口**：四个 case 都卡在同一处——**没有 sandbox target，没有执行原语，没有面板对象**。这正是 v1.3 的核心。

### 10.6 v1.2 → v1.3 的明确升级

| 领域 | v1.2 | v1.3 | case 驱动 |
|---|---|---|---|
| 对象模型 | 一 profile 一 env 容器 + session record | Host → Env → Sandbox → Service | 1/2/3/4 |
| registry | 内存 Map | durable + `container list` reconcile | 1/2/3/4 |
| terminal | 容器 PTY v1、无持久化 | broker + v2 + snapshot/replay | 1/3 |
| exec | 无 | `sandbox.exec` job | 2/4 |
| storage | 无 | KV/D1 binding + migration | 4 |
| services | plane 灯 | services 表 + health/ports/logs | 3/4 |
| UI | 无入口 | fleet + detail + Terminals/Jobs/Storage/Services | 1/2/3/4 |
| consumer targeting | DNK 固定 route、DNT sessionId | `sandboxId`/service/cwd | 1/2/3 |
| audit/usage | 部分 | per sandbox/terminal/job/storage | 1/2/3/4 |

### 10.7 优先级与顺序

1. **Target**：`sandboxId/profileId/service/cwd`（所有 case 的前置）。
2. **Terminal**：in-sandbox broker + v2（case 1/3）。
3. **Exec**：`sandbox.exec` job（case 2/4）。
4. **Services**：health/ports/logs（case 3/4）。
5. **Storage**：KV/D1 + migration（case 4）。
6. **Panel**：Terminals / Jobs / Services / Storage（与 fleet/detail 合并）。
7. **Tests**：每 case 独立 + 跨 case 边界。

### 10.8 每 case 的验收

| Case | 验收 |
|---|---|
| 1 | 杀 dsh host → 重启 → terminal reattach 有屏幕；两 pane 独立；v2 credit/snapshot；无跨 session |
| 2 | 在 kitesurf/workerd sandbox 内跑 `/imagine`：binary/cwd/secret/output 正确；job 有 exit/stdout；注入测试仍绿；无 host fallback |
| 3 | DNT 指定 kitesurf/engine 开终端；`wrangler`/`node` 可用；service health/ports 可见；host 重启可 reattach |
| 4 | IDB→KV/D1 迁移不丢笔记；dual-write/cutover/rollback；fx 单次 tool-call 在 sandbox 执行；Storage 面板可见 |

### 10.9 边界检查（J1/J2）

- 四个 case 都是 **env/exec/storage**，不是 session 载体；按 J1/J2 归 DNLS（env 控制面）。
- DNN 的数据/schema 归 DNN；DNLS 只持有 workerd runtime/KV/D1；不复制笔记真源。
- DNMS 的模板/skill 归 DNMS；DNLS 只持有 exec job。
- DNT 的 UI/协议归 DNT；DNLS 持有 terminal broker。
- Kitesurf profile 归 DNLS；DNT 只 attach。
- 没有 DNCS 重叠：这些都不是 session 生命周期；DNCS 只在 session 为主时介入。

### 10.10 与 control-panel + dashboard 的结合

四个 case 不是「面板的四个新页面」，而是把面板从「健康灯」升级为「execution surface」：

| 面板区域 | 原有 §12/§13 设计 | Case 1 terminal | Case 2 exec | Case 3 services | Case 4 storage |
|---|---|---|---|---|---|
| Fleet sandbox 表 | name/profile/state/health/CPU/mem | active terminals 数 | running jobs 数 | services 数/健康 | KV/D1 用量 |
| Overview | planes/resources/version | broker 状态 | job 队列/失败率 | service 健康 | storage 绑定/迁移状态 |
| Services | profile services | — | — | engine/bridge/ports/logs | workerd/KV/D1 bindings |
| Terminals | §13 新增 | session/attach/replay | — | service-target terminal | — |
| Jobs | §13 新增 | — | command/exit/stdout/output | — | fx single tool-call |
| Storage | §13 新增 | — | — | — | KV keys/D1 tables/backup |
| Connections | published ports/CDP/PTY | PTY attach | exec stream | workerd/bridge ports | KV/D1 endpoint |
| Timeline | operations/incidents | terminal open/close | job start/end | service restart | migration/cutover |
| Settings | cpus/memory/idle | broker TTL | exec timeout/limits | service env | D1 migrations |
| 动作 | start/stop/restart | attach/close | cancel/retry | open terminal/logs | backup/restore |

**结论**：control-panel 的 fleet 层负责「有哪些 sandbox」；detail 层负责「这个 sandbox 里有什么」；Terminals/Jobs/Storage/Services 四个页签负责「怎么执行/怎么连/怎么存」。没有这四个原语，面板只能看，不能控制。

### 10.11 风险与非目标

- **不把 DNLS 做成 carrier**：exec/terminal/storage 都是本地/受控 env 原语，不是远端 session。
- **不把 DNN 数据搬进 DNLS 真源**：DNLS 只提供 runtime/storage API，数据 owner 仍是 DNN。
- **不把 DNMS 模板搬进 DNLS**：DNLS 只提供 exec；模板/skill 归 DNMS。
- **不新增 release-gate**：case 测试是质量证据，不是门禁。
- **不做任意命令执行**：exec 只按模板/白名单；默认只读/受限。

### 10.12 结论

四个 case 都指向同一个结论：**[DNLS] 不能只做「健康灯 + 单例容器」；它必须成为 DNT/DNMS/DNN 的 execution surface。**

- DNT 需要 **terminal broker**（长期连接、broker、v2、target）；
- DNMS 需要 **exec job**（sandbox 内跑 codex/grok，有 exit/stdout/output）；
- Kitesurf 需要 **service + terminal target**（workerd/engine/bridge）；
- DNN 需要 **storage binding**（KV/D1 + migration + fx 单次 tool-call）。

这四个原语都属于 **env/exec/storage**，按 J1/J2 归 DNLS；DNCS 仍是 session/carrier，不参与。control-panel 是它们的自然投影：fleet 看有哪些 sandbox，detail 看每个 sandbox 的 services/terminals/jobs/storage，动作路由到 owner。

**v1.3 的升级不是「加面板」，而是「加执行原语」；面板只是让这些原语可见、可操作、可审计。**

---

## 附录 A — 现场容器清单（2026-11-19）

| 容器 | 镜像 | 状态 | 端口 | 状态卷 |
|---|---|---|---|---|
| `kitesurf` | `…-dfe7b43…` | running | 8798/8799 | `~/.dsh/nano-local-sandbox/state/kitesurf/kitesurf` |
| `kitesurf-dev` | `…-dfe7b43…` | running | 8800/8801 | `~/.dsh-dev/nano-local-sandbox/state/kitesurf/kitesurf-dev` |
| `kitesurf-desktop` | `…-665716c…`（旧） | running | 8802/8803 | `~/.dsh-kitesurf-state-desktop`（旧路径） |
| `kitesurf-lab-39feadf` | `…-39feadf…` | stopped | 8810/8811 | lab state |
| `kitesurf-lab-39feadf-final` | `…-39feadf…` | stopped | 8812/8813 | lab state |
| `buildkit` | builder shim | running | — | Apple builder |

## 附录 B — 当前接口清单摘要

- HTTP：30 条 `/nano-local-sandbox/*`（bindings）。
- MCP：20 个 `sandbox.*` + 8 个 `term.*`。
- bridge：`/health`、`/control`、`/cdp`、`/mcp`。
- terminal：`dnt-ws-v1`，`/term?session=&token=`。
- CDP：engine `/devtools/browser` + bridge `/cdp` relay。
- container：`inspect`/`create`/`start`/`stop`/`remove`/`exec`/`execOutput`/`stats`/`logs`/`openPty`。

## 附录 C — 关键文件锚点

| 主题 | 文件 |
|---|---|
| 插件入口 | [index.js](../../../dsh-nano-local-sandbox/index.js) |
| 路由/观测 | [routes.js](../../../dsh-nano-local-sandbox/src/host/routes.js) |
| MCP 工具 | [mcp-sandbox.js](../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js) |
| 实例注册 | [instance-registry.js](../../../dsh-nano-local-sandbox/src/host/instance-registry.js) |
| 环境推导 | [profile-drivers.js](../../../dsh-nano-local-sandbox/src/host/profile-drivers.js) |
| Apple backend | [backend-apple.js](../../../dsh-nano-local-sandbox/src/host/backend-apple.js) |
| 观察快照 | [observe.js](../../../dsh-nano-local-sandbox/src/host/observe.js) |
| 终端桥 | [term-bridge.js](../../../dsh-nano-local-sandbox/src/host/term-bridge.js) |
| 终端 schema | [terminal-driver.js](../../../dsh-nano-local-sandbox/src/host/terminal-driver.js) |
| Kitesurf profile | [profile.yaml](../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml) |
| Kitesurf driver | [driver/index.js](../../../dsh-nano-local-sandbox/profiles/kitesurf/driver/index.js) |
| 路由台账 | [lib/bindings.js](../../../dsh-nano-local-sandbox/lib/bindings.js) |
| 性能声明 | [src/perf/declaration.json](../../../dsh-nano-local-sandbox/src/perf/declaration.json) |
| DNK client | [dsh-nano-kitesurf/src/client/index.js](../../../dsh-nano-kitesurf/src/client/index.js) |
| DNT lanes | [dsh-nano-terminal/src/client/lanes.js](../../../dsh-nano-terminal/src/client/lanes.js) |
| DNT schema | [dnt-mcp.openrpc.json](../../../dsh-nano-terminal/schema/dnt-mcp.openrpc.json) |

## 附录 D — 词汇

- **Host**：物理机（m3max.local）。
- **Env**：一个 [dsh] home + profile 的运行面（prod/dev/desktop）。
- **Sandbox**：一个 container + 状态卷 + 端口 + 服务 + CDP/PTY 的一等对象。
- **Profile**：配方（kitesurf/xray/gateway/local-s3/terminal）。
- **Service**：sandbox 内的进程（engine/mcp-bridge/...）。
- **Fleet**：host + sandbox 的集合视图。
- **Control**：创建/启停/重建/改资源/升级/删除。
