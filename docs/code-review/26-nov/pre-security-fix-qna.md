# pre-security-fix QNA · 安全修复执行真相锁定

> **范围（scope）**：`docs/code-review/26-nov/security-audit.md` 所定义的 24 条 confirmed 安全问题的修复执行层真相锁定；本文只负责「怎么修、修到什么程度、以什么为验收」的 owner 决策，不在本文改 verdict/severity。
> **qna 位点**：`pre-charter`（多轮 deep-dive）
> **角色配置（自填）**：提问 `security-fix agent（DeepSeek Harness）` · second-opinion `none` · 裁决 `owner`
> **second-opinion 模式（逐轮）**：`waived`（按业主指示，全程不提供 second-opinion 槽位）
> **下游消费者**：`26-nov-security-fix`（修复执行计划 / todo；v1.1 起本阶段代号统一为此，原 `MS01` 为误记）
> **文档状态**：`frozen`（已冻结；全轮收口；v1.1 含 errata 修订——见 §9.0a）

---

## 0. 分轮状态总览

| 轮次 | 题号区间 | 焦点 | second-opinion | 状态 |
|------|----------|------|----------------|------|
| Round 1 | `Q1–Q2` | 安全边界基线（主体模型）+ 修复总纲（能力分层） | `waived` | **已冻结（T-O-1 / T-O-2）** |
| Round 2 | `Q3–Q4` | 本地威胁模型与「功能零回退」边界 + 零回退加固架构（均为 foundational，v0.5 重写） | `waived` | **已冻结（T-O-5 / T-O-6）** |
| Round 3 | `Q5–Q7` | executional：路由敏感度清单、远端数据 schema、HTML allowlist 策略 | `waived` | **已冻结（T-O-7 / T-O-8 / T-O-9）** |
| Round 4 | `Q8–Q10` | executional：P0 批次与门禁、P2 接受清单、供应链与发布链 | `waived` | **已冻结（T-O-10 / T-O-11 / T-O-12）** |

> 分轮纪律：全部四轮已完成并冻结；本文件为 `frozen` 状态，后续任何新增/变更按 §10「变更控制」执行，不得静默修改已冻结真相。
>
> **v1.1 errata 说明**：冻结后经业主指令做 `file:line` 级深度联级核查（跨 plugin、宿主与浏览器两面），发现并更正了若干事实性错误与陈旧引用，同时按 §9.3 追加了两条执行级真相 `T-O-13` / `T-O-14` 并把下游阶段代号修正为 `26-nov-security-fix`（原 `MS01` 误记）。所有已冻结的 T-O-1–T-O-12 决策**未改动**，仅其下的执行细节/证据按事实更新；新增修订逐条登记于 §9.0a。

---

## 0.1 术语澄清：本文件里的「宿主」指什么（非规范性澄清）

> 目的：避免把「宿主」误读为浏览器、OS root、Caddy 或 agent 模型。本节只澄清拓扑与指代，不新增真相层；真相层以 §1 为准。

**一句话**：本文件中的「宿主」= **dsh 宿主进程（host process）**，即启动 `dsh web`（或桌面版）的那个 **Node.js 进程**；它加载 Cordis entry 树与各插件的 host 半侧，持有 `DSH_HOME`、文件系统、子进程、网络与凭据服务，是插件全部「原生能力」的实际执行者。

```
OS 用户（如 seanz）的权限边界
└─ dsh 宿主进程（Node.js；每个 dsh 实例一个）
   ├─ Cordis entry 树
   │   └─ 插件 host 半侧：index.js / src/host/* → lib/host*.js
   │        ├─ ctx.webServer.register(...)        ← 注册 HTTP 路由（页面可 fetch 到）
   │        ├─ ctx.connection.requestRejection()  ← 只做 Host/Origin + 浏览器认证
   │        ├─ ctx.sessions / sandboxPolicy / credentials / subprocess / fs
   │        └─ 直接 fs / git / 网络 / DSH_HOME
   ├─ Web 载体：内置 webServer（loopback）或 Caddy 反代（dsh.local）
   └─ 浏览器页面（page realm）
        └─ shell + 各插件 lib/client.js
             ├─ DOM / IndexedDB / window / 同源 fetch
             └─ fetch('/nano-*/...') ──► 回到宿主路由
```

| 术语 | 指代 | 运行位置 | 能做什么 | 代码/证据 |
|---|---|---|---|---|
| **宿主 / 宿主进程 / host** | dsh 的 Node.js 主进程（每个实例一个：日常实例、开发实例、桌面版各一个） | 操作系统进程，用户 `seanz` 的权限 | 读写用户可写的任意文件、spawn 子进程（git/osascript）、发起网络请求、访问 `ctx.credentials`、读写 `DSH_HOME` | `INTRODUCTION.md:14`（宿主半侧是 `index.js` 导出的 Node ESM 插件）、`INTRODUCTION.md:269-283` |
| **宿主半侧（host half）** | 插件包中在宿主进程内运行的那一半代码 | 宿主进程内，与 harness 同进程、无进程隔离 | 通过 `ctx.webServer` / `ctx.connection` / `ctx.sessions` 等服务获得上述能力 | `dsh-nano-notepad/index.js:8`（`inject = ['webServer','connection','subprocess']`）、`dsh-nano-shared-workspace/src/host/entry.js:11`（含 `credentials`、`workspaceRegistry`） |
| **浏览器半侧 / 页面 / page** | 插件包中在浏览器 page realm 运行的 `lib/client.js`，与 shell 共享同一个 `window` | 用户浏览器（Chrome） | DOM、IndexedDB/localStorage、同源 `fetch`；**不能直接读文件、起进程、连 S3**（只能经宿主路由或浏览器自身网络） | `INTRODUCTION.md:14`（浏览器半侧是 `lib/client.js` 的 `__ModuleLoader__.load` 工厂）、`INTRODUCTION.md:89`（浏览器数据在 IndexedDB，宿主数据在宿主文件系统） |
| **Web 载体** | 内置 `webServer`（loopback）或 Caddy 反代（`dsh.local`） | 宿主进程内/前置 | 只负责 HTTP/TLS 与路由；**不拥有认证或 Origin 策略** | `context/deepseek-harness/docs/subsystems/web-server.zh.md:102` |
| **宿主级能力（L2）** | 由宿主进程执行、后果越出当前会话工作区的能力 | 宿主进程 | 任意路径文件读写、git/子进程、任意出站网络、凭据访问、`DSH_HOME`/会话索引写、跨 session | 见 §1.2 |
| **宿主 sync engine** | 宿主进程内的后台同步服务（不是页面定时器） | 宿主进程 | 拉取/校验/持久化远端对象，页面只读快照 | 参照 `dsh-nano-shared-workspace/src/host/routes.js:512` 的 `startBackgroundSync` |

**易混淆点（明确否定）**：

- **不是浏览器**：浏览器只是 page realm；它通过同源 `fetch` 调宿主路由，本身没有 fs/进程/凭据权限。
- **不是 OS root**：宿主进程以启动它的用户（如 `seanz`）运行，拥有该用户的文件权限，但不是 root；「以宿主用户身份」= 以该用户身份。
- **不是 Caddy/反代**：Caddy 只是 TLS/HTTP 前置，认证与路由授权在宿主进程的 `connection` 服务里。
- **不是 agent/LLM**：agent 是调用工具的主体；工具执行最终仍落在宿主进程（或其 spawn 的子进程）。
- **不是插件包本身**：一个插件 = 一个 npm 包 = 宿主半侧 + 浏览器半侧两个半边（`INTRODUCTION.md:14`）；「宿主」是运行其中一半的那个进程。

---

## 0.2 能力归属 vs 分发归属：「回归宿主」不等于「回归核心」，不影响插件市场安装（非规范性澄清）

> 目的：澄清 Q3/Q4 推荐中的「宿主」是**同一个插件包内的宿主半侧**，不是把插件能力并入 dsh 核心/仓库；插件市场的安装、升级与分发方式不变。**本版 Q4 不迁移客户端同步/数据流**，只在宿主侧增加守卫与校验层。

### 两个独立维度

| 维度 | 现在 | Q3/Q4 之后 | 是否影响插件市场 |
|---|---|---|---|
| **分发归属**（谁被安装/升级） | 一个 npm 包 = 一个 dsh bundle；`package.json` 同时声明 `dsh.bundle.patch` 与 `dsh.client` | **不变**：同一个 npm 包、同一个 tarball、同一套 `dsh plugin --profile web add` | 否 |
| **执行归属**（能力在哪半边运行） | 部分能力在浏览器半侧（如 notepad 的 S3 同步 `src/client/sync.js`） | **不迁移现有数据流**；只在同一插件包的宿主半侧增加守卫/校验层（如 `/s3/object` 返回前校验、渲染前 allowlist） | 否 |

### 为什么同一插件包可以同时装下两半

- `dsh-nano-notepad/package.json` 的 `main: ./index.js`（宿主入口）、`exports["."] = ./index.js`（宿主半侧）、`exports["./client"] = ./lib/client.js`（浏览器半侧）；`files` 同时列出 `index.js`、`lib/client.js`、`lib/s3-sync-host.js`、`lib/perf-review-host.js`。`dsh-nano-shared-workspace/package.json` 同理列出 `lib/host.js` 与 `lib/client.js`。
- `package.json#dsh.bundle.patch = ./cordis.patch.yml` 把该包插入**宿主** Cordis entry 树；`dsh.client` 让**浏览器**启动图加载 `lib/client.js`（`INTRODUCTION.md:14`、`INTRODUCTION.md:338-345`）。
- 安装侧只有一条命令：`dsh plugin --profile web add <spec>`（`INTRODUCTION.md:319`、`AGENTS.md:39`）；`<spec>` 可以是绝对目录、`.tgz` 绝对路径或发布后的包名。装的是**整个 bundle**，天然包含宿主半侧，不需要任何 core 改动。
- 本仓库的 overlay 插件定位是「不改核心，靠 patch 插入自己的宿主行」（`INTRODUCTION.md:225`）——「宿主半侧」正是这个定位的既有机制，不是把插件塞进核心。

### 本版 Q4 对 notepad 的落地方式（不迁移）

- **保留** `dsh-nano-notepad/src/client/sync.js` 与 IndexedDB：功能、离线行为、UI 不变。
- **新增** 宿主侧 `dsh-nano-notepad/src/host/s3-sync.js` 的 object 返回前 schema 校验；页面调用面与数据流不变。
- **新增** 共享 HTML allowlist 策略：客户端 `sanitizeRichHtml`（`dsh-nano-notepad/src/client/markdown.js:179`）与宿主 `sanitizeMpHtml`（`dsh-nano-notepad/index.js:423`）使用同一策略表，只过滤活动内容，不移除正常排版能力。

### 什么会变、什么需要提前声明（不是市场障碍）

- **会变**：宿主侧增加校验/守卫代码；部分恶意远端对象会被拒绝（合法用户无感）。
- **需要声明**：若宿主半侧新增平台服务依赖（如 `storage`），需在 `package.json` 的 `peerDependencies` / 插件 `inject` 中声明，并做 `engines` 兼容；缺服务时插件 activation fail-loud（`INTRODUCTION.md:282-283` 的 inject 语义），但这属于兼容性声明，不是分发模式变化。
- **不会变**：包名、版本线、`dsh.bundle.patch`、`dsh.client`、`cordis.patch.yml`、`npm pack` 结构、插件市场/私有 registry 的安装路径、任何现有路由与 UI 入口。

### 明确否定

- **「回归宿主」≠「回归 dsh 核心」**：不把代码搬进 `context/deepseek-harness` 或 dsh 官方仓库；插件仍是独立包，独立版本、独立发布、独立升级。
- **「加固」≠「退役」**：本版不删除路由、不隐藏 UI、不迁移数据面；只增加校验、围栏、清洗、限额。
- **如果某个 marketplace 只分发 `lib/client.js` 而不安装 bundle**：那不是 dsh 的 bundle 安装模型；按 `INTRODUCTION.md:14` 的合同，插件必须以完整 npm 包（含宿主半侧）安装，否则 `cordis.patch.yml` 与宿主入口都不存在，插件根本不会激活。

---

## 1. ★ Truth-Gate 台账（已锁定真值 · NORMATIVE · append-only across rounds）

| Truth-ID | 子类型 | 已锁定真相（一句话） | 来源（Round / Q） | 驱动了哪些后续题 | 下游约束 |
|----------|--------|----------------------|--------------------|------------------|----------|
| `T-O-1` | `foundational` | **页面脚本（同源 Web 页面内任意 JS）是较低信任主体；不得以「同源即同主体」为由把它与 owner 等价；插件对页面可调用的每项宿主能力都必须按「可能被任意脚本调用」来设计。** | `Round 1 / Q1`（业主选 C） | `Q3`、`Q4`、Round 3+ 全部 executional 题 | 26-nov-security-fix 的主体矩阵与验收基线 |
| `T-O-2` | `foundational` | **修复采用能力分层 L0/L1/L2/L3（敏感度分级）：L0 会话内只读 / L1 工作区内有界写 / L2 宿主级能力 / L3 运维配置；分类用于决定加固强度与审查级别，不作为删除功能的依据（v0.5 修订：原「L2 硬退役」被 `T-O-3` 取代）。** | `Round 1 / Q2`（业主选 B，v0.5 修订） | `Q3`、`Q4`、Round 3+ 全部 executional 题 | 26-nov-security-fix 的路由敏感度清单与加固强度 |
| `T-O-3` | `foundational` | **功能零回退：所有已交付的核心功能、入口、工作流与价值不得减少或降级；安全修复只能叠加，不得以删除/隐藏/迁移功能为手段。** | 业主变更令 `2026-11-11`（v0.5） | `Q3`、`Q4`、Round 3+ 全部 executional 题 | 26-nov-security-fix 的功能合同与验收 |
| `T-O-4` | `foundational` | **本地威胁模型：插件主要运行于本地单用户、默认 loopback、无公网暴露；安全优先级按本地跨主体面校准（remote-bucket / remote-web / 本机其他用户），同用户页面脚本的纯 page→host 行为视为自影响，仅做不改变功能的加固。** | 业主变更令 `2026-11-11`（v0.5） | `Q3`、`Q4`、Round 3+ 全部 executional 题 | 26-nov-security-fix 的风险分桶 |
| `T-O-5` | `execution` | **P0 必修只覆盖 `remote-cross` 与 `remote→page`（含 remote→agent 注入链）；`page-self` 仅做不改变功能的加固，其余登记 `accepted-local-self-impact`；所有现有路由/UI/工作流/数据位置保留。** | `Round 2 / Q3`（业主选 C） | `Q5`、`Q6`、`Q7`、Round 4+ | 26-nov-security-fix 的三桶清单与功能合同 |
| `T-O-6` | `execution` | **加固落在三个共享包：`dsh-host-route-guard`（统一注册，敏感度声明）、`dsh-remote-data-schema`（宿主侧远端数据 schema 校验）、`dsh-html-policy`（共享 HTML allowlist）；全部增量，不迁移数据流、不删路由、不改 UI。** | `Round 2 / Q4`（业主选 A） | `Q5`、`Q6`、`Q7`、Round 4+ | 26-nov-security-fix 的包结构与实施顺序 |
| `T-O-7` | `execution` | **`dsh-host-route-guard` 采用 43 条路由逐条显式 `sensitivity` 清单（`security/route-sensitivity.json`），guard 启动强校验；未列入/过期路由禁止注册。** | `Round 3 / Q5`（业主选 B） | `Q8`、`Q9`、`Q10` | 26-nov-security-fix 路由清单与 CI 门禁 |
| `T-O-8` | `execution` | **`dsh-remote-data-schema` 采用严格整对象拒绝 + 保留最后好状态：任一字段非法即拒绝该 manifest/file/image/marker/session meta；历史对象缺失 `schemaVersion` 视为 v0 只读兼容并一次性补写。** | `Round 3 / Q6`（业主选 A） | `Q8`、`Q9`、`Q10` | 26-nov-security-fix 的 schema 规则与兼容性回归 |
| `T-O-9` | `execution` | **`dsh-html-policy` 采用一套共享 allowlist 策略表 + 双 renderer（客户端 DOM `sanitizeRichHtml` + 宿主 regex `sanitizeMpHtml`），只过滤活动内容、保留现有 mp 文章排版能力。** | `Round 3 / Q7`（业主选 A） | `Q8`、`Q9`、`Q10` | 26-nov-security-fix 的 HTML 策略与回归语料 |
| `T-O-10` | `execution` | **P0 修复采用内部四批（Batch 0 基础 → Batch 1 host-data 7 条 → Batch 2 content-render 6 条 → Batch 3 P2/local-supply），每批独立门禁；每个插件最终只发一次 minor 版本，无数据迁移、可回滚。** | `Round 4 / Q8`（业主选 B） | — | 26-nov-security-fix 的批次/门禁/发布清单 |
| `T-O-11` | `execution` | **P2（8 条 `page-self` + 本地凭据 `grok-creds`）采用逐项清单：能零成本加固就加固（realpath 围栏、`.git` 拒绝、`.gitignore`/SKIP、日志），改变功能则登记 `accepted-local-self-impact`；清单入 `security/accepted-risks.json`，每 release 复核。** | `Round 4 / Q9`（业主选 B） | — | 26-nov-security-fix 的 P2 清单与发布说明 |
| `T-O-12` | `execution` | **供应链完整修复：四个 `build-client.mjs` 删除 npx 回退（缺本地 esbuild 即失败）；随包源已全部提交（v1.1 核实 350c6c8 已入库）；补 release CI（`npm ci && npm run build && npm pack` + clean-lib gate + SHA256/attestation）。** | `Round 4 / Q10`（业主选 A） | — | 26-nov-security-fix 的 build/release 改造 |
| `T-O-13` | `execution` | **三共享包的分发通道：声明为 `devDependencies`（非 `dependencies`）；运行时一律经 `lib/` bundle 产物消费，宿主侧不裸 import 共享包；`security/route-sensitivity.json` 仅以**生成 JS 常量**形式打进 guard 产物。**（v1.1 追加；分发归属约束的执行固化） | `v1.1 errata`（业主指令 + file:line 核查） | — | 26-nov-security-fix 的包结构与 `package.json` |
| `T-O-14` | `execution` | **回归门禁三件套：`security/feature-contract.json` 逐字段锁定（含每路由现有 `bodyLimit`）；Batch 1 前现有桶导出样本 v1 校验全量通过；`nxe:mutate-symlink-escape` realpath 围栏登记为「加固+边缘行为变化」进 `accepted-risks.json`。**（v1.1 追加；功能零回退的可验证判据） | `v1.1 errata`（业主指令 + file:line 核查） | — | 26-nov-security-fix 的验收与 Batch 1 门禁 |

> **修订说明（v0.5）**：`T-O-2` 的「L2 一律硬退役」条款自 v0.5 起由 `T-O-3` 取代；L0/L1/L2/L3 分类继续作为**敏感度分级**使用（决定加固强度与审查级别），不再作为删除功能的依据。`T-O-1` 的主体判定保留，但其处置强度由 `T-O-4` 校准。

### 1.1 `T-O-1` 细则（主体模型 · NORMATIVE）

1. **五类主体**：`owner-operator`（本机安装者/CLI/Config）、`agent`（dsh agent 工具调用）、`page`（同源 Web 页面内任意 JS，含其他插件 bundle、注入 DOM、存储型 XSS 载荷）、`remote-bucket`（S3 共租户/桶写入者）、`remote-web`（mp 文章/外部网页内容）。
2. **页面定义**：不是「用户本人」，而是「任何人能在 dsh Web 页面 realm 里执行的一段代码」。四类来源：插件自己的 `lib/client.js`（受供应链影响）、其他插件/第三方 bundle、被注入的 DOM 内容（agent 输出/聊天卡片）、已确认的 4 条存储型 XSS 载荷。
3. **判定规则**：每条 finding 必须标注「第一入口主体」与「最终受影响主体」；只有 `owner-operator` 单一主体的项才允许关闭为 non-issue；`page` 与 `remote-*` 主体一律进入**处置清单**——按 `T-O-5` 分入 P0（必修）或 P2（低成本加固/接受），不得遗漏或静默忽略。**「较低信任」指代码来源不可信，不等于跨主体；同用户页面脚本的处置强度由 `T-O-4` 校准为 P2。**
4. **排除的辩护**：①「同源=同主体」不成立；②「UI 只暴露按钮所以页面不会调用」不成立（页面可合成/直接 `fetch`）；③「加 token/sessionId 就够了」不成立（同 realm 可读，见 `context/deepseek-harness/packages/client/connection/src/rpc-host.ts:94` 与 `window.__nsw`）；④「有 CSP 就行」不成立（审计确认已安装 shell 无 CSP）。
5. **验收含义**：以 page-origin harness（headless Chrome + 页面 `fetch`，不带插件客户端）重放审计 PoC，按 `T-O-5` 的 P0/P2 口径判定：P0 必须失败，P2 允许成功但须登记。

### 1.2 `T-O-2` 细则（敏感度分级 · NORMATIVE）

| 层级 | 定义 | 判定问题 | 处置 |
|---|---|---|---|
| **L0** | 会话内只读：只读、限定当前 session 的 workspace、有大小/类型上限、不返回 secret 明文 | 数据是否越出当前 session 工作区？是否含 secret？ | `keep-L0`：加 session 绑定 + 上限 + 掩码 |
| **L1** | 工作区内有界写：`resolve()`+`realpath()` 后必须落在当前 workspace root 内；不执行进程、不出网、不碰凭据 | 是否可能经 symlink/`..`/绝对路径越出 workspace？是否触发 exec/net？ | `harden-L1`：最后可信决策点做 realpath 围栏 |
| **L2** | 宿主级能力：越出 workspace 的文件读写、进程执行、任意出站网络、凭据访问、DSH_HOME/会话索引写、跨 session/租户、进程级全局状态 | 被任意页面脚本调用时，最坏后果是否超出当前工作区？ | `harden-L2`：只在宿主侧加校验/隔离/限额，保留功能；不删除、不迁移（v0.5） |
| **L3** | 运维配置：只能由 patch/Config 提供 | 是否决定部署身份/网络端点/限额？ | `keep-L3`：`Config['~standard'].validate`，页面只读 masked 状态；不改现有配置入口 |

- **默认声明**：未分类路由 = 敏感度最高，必须显式声明后方可注册（不得静默注册）。
- **禁止绕过**：加固不设 feature flag 分支、不保留「关闭校验」的兼容开关。
- **版本**：patch/minor 发布（无 breaking change；具体版本由 26-nov-security-fix 按变更类型确定）。

### 1.3 `T-O-3` 细则（功能零回退 · NORMATIVE）

1. **功能合同的定义**：用户可见的路由入口、UI 入口、按钮/菜单/工作流、默认行为、数据存放位置（IndexedDB vs 宿主文件系统）、离线能力、同步节奏与性能语义，全部属于「功能」。
2. **允许的改动**：内部实现、校验逻辑、错误提示、日志、限流/限额、清洗规则（只过滤恶意内容）、路径围栏（只拒绝越界）。
3. **禁止的改动**：删除任何路由/方法、移除或隐藏任何 UI 入口、改变默认行为、改变数据存放位置（如 IndexedDB→宿主 DB）、要求用户改变现有工作流或增加步骤、降低离线/性能能力。
4. **执行约束**：26-nov-security-fix 必须产出 `security/feature-contract.json`（43 条路由 + 全部客户端入口的快照）；每条 finding 的修复必须标注「功能影响：无 / 有（有则不得实施）」，且 CI 的 feature-contract 测试必须通过。
5. **冲突处理**：若某安全修复必须改变功能才能成立，则该修复不得实施，转为「已接受风险（local self-impact）」登记；只有跨主体（remote-bucket/remote-web→本地）的必修项在无法兼顾时才上报业主重新裁决。

### 1.4 `T-O-4` 细则（本地威胁模型 · NORMATIVE）

1. **部署事实**：本机三套 dsh 实例均为本地运行（`AGENTS.md:43-45`：日常 `~/.dsh`、开发 `~/.dsh-dev`、桌面 `~/.dsh-desktop`）；平台默认绑定 loopback，非 loopback 绑定会警告（`context/deepseek-harness/docs/subsystems/web-server.zh.md:102`）。
2. **主体优先级**：
   - **P0 跨主体（必修）**：`remote-bucket`（S3 共租户/桶写入者）与 `remote-web`（mp 文章/外部网页）→ 本机数据/页面；以及它们经 XSS 转化出的 `page` 执行（remote→page→host 链）。
   - **P1 本机其他 OS 用户（按需加固）**：同机多用户场景；本仓库默认单用户，按低成本加固处理。
   - **P2 同用户 page 自影响（仅加固）**：同用户页面脚本调用宿主路由等同于用户自己操作，不作为安全边界；只在不改变功能的前提下加围栏/校验。
3. **公网攻击面**：默认无公网暴露；公网相关的认证/CSRF/SSRF 仅保留既有 Host/Origin 围栏，不额外投入重构。
4. **验收含义**：安全回归只强制要求 P0（remote-cross 与 remote→page 链）的审计 PoC 失败；P2 的 PoC 允许仍成功，但必须记录为「已接受风险」，且修复不得降低功能。

### 1.5 `T-O-5` 细则（P0/P2 分桶 · NORMATIVE）

1. **`remote-cross`（P0）**：`remote-bucket` / `remote-web` → 本机宿主数据或页面；判据是「无需页面参与即可由远程主体触发」。代表：`nsw:matchWorkspace-member-localPath-session-exfil`、`nsw:remote-member-localPath-arbitrary-fs-write`、`nsw:remote-meta-unbounded-fetch-decompress`、`nsw:acquireClaim-rmw-no-cas`、`nsw:workspaceId-join-s3key-traversal`（bucket 侧）。
2. **`remote→page`（P0）**：远程内容必须先转化为页面脚本（XSS）才能触达宿主；判据是「remote principal 可执行页面代码」。代表：4 条 XSS、`nano-notepad/sanitizeMpHtml-active-content`、`nano-notepad/fetch-mp-redirect-ssrf`、`hunter-e:imagine-template-shell-injection`（远程文档/网页经 agent prompt 注入）。
3. **`page-self`（P2）**：同用户页面脚本 → 宿主，属本地自影响。代表：`nxe:routes-read-arbitrary-file`、`notepad:read-arbitrary-md-read`、`nsw:ls-mkdir-any-absolute-path`、`nxe:mutate-symlink-escape`、`nxe:git-config-filter-exec`、`nano-notepad/s3-config-endpoint-ssrf`、`hunter-e:grok-creds-workspace-copy`。
4. **P2 接受登记**：凡修复需要改变功能（删除路由/UI、改默认行为、改数据位置、增加用户步骤）的，登记 `accepted-local-self-impact`，注明「现有功能依赖、接受理由、可选低成本加固、复发监控」；不得静默忽略。
5. **功能合同**：26-nov-security-fix 必须产出 `security/feature-contract.json`（43 条路由 + 客户端入口 + 数据位置 + 默认行为），CI `test:feature-contract` 必须通过；任何修复的功能影响必须为「无」。

### 1.6 `T-O-6` 细则（三包加固架构 · NORMATIVE）

1. **包职责**：
   - `packages/dsh-host-route-guard`：唯一 web 路由注册入口；`RouteSpec {path, method, sensitivity: 'L0'|'L1'|'L2'|'L3', capability, bodyLimit?, sessionBinding}`；fail-closed 获取 `connection`；统一 method/JSON/错误；生成 route inventory。
   - `packages/dsh-remote-data-schema`：纯 JS schema 校验（无 DOM）；覆盖 notepad manifest/files/images 与 shared-workspace marker/meta/parts；在宿主消费点执行。
   - `packages/dsh-html-policy`：共享 HTML allowlist 常量与纯函数策略；客户端 DOMParser 渲染器与宿主 regex 渲染器共用同一策略表。
2. **依赖方向**：三个包只依赖平台公开契约（`ctx.webServer`/`ctx.connection`/`ctx.sessions` 等）与标准库；不依赖任何插件内部实现；四插件以 `devDependencies` 形式的 `file:../packages/...` 引用（**构建期**依赖，运行时经 `lib/` bundle 产物消费，宿主侧不裸 import——分发通道详见 `T-O-13` / §1.13）。
3. **硬约束**：不迁移任何现有数据流（IndexedDB 保持）、不删除/隐藏任何路由/UI、不改变默认行为；加固只增加校验/清洗/限额。
4. **落地顺序**：guard（零行为变化）→ remote-data-schema（只拒绝恶意对象）→ html-policy（只剥活动内容）→ feature-contract + P0 回归。
5. **26-nov-security-fix 交付物**：`security/route-sensitivity.json`、`security/feature-contract.json`、三个包的 API 与单测、四插件迁移 diff、P0/P2 清单。

---

### 1.7 `T-O-7` 细则（路由敏感度清单 · NORMATIVE）

1. **清单文件**：`security/route-sensitivity.json`，43 行，字段 `plugin/path/method/sensitivity/capability/bodyLimit/sessionBinding/justification`；`bodyLimit` 逐路由继承现有常量（见 `T-O-14`）。**运行时侧**：该 JSON 在 repo 根、不在任何插件 `files` 内，运行中的宿主不可达；guard 在**构建期**把 43 行烤进产物为 JS 常量（见 `T-O-13` / §1.13），repo 侧 JSON 只作 CI 真源。
2. **`sensitivity` 语义**：L0 只读无 secret；L1 工作区内有界写；L2 宿主级（fs/git/net/credentials/DSH_HOME/跨会话）；L3 配置。分级只决定加固强度，不删除路由。
3. **生成与校验**：`scripts/gen-route-sensitivity.mjs` 从代码枚举；guard 启动时严格比对，未列入/过期即抛错；CI `check-route-sensitivity` 防漂移。
4. **禁止规则化偷懒**：不得按插件/前缀/HTTP 方法批量赋级；每个 path+method 单独一行。

### 1.8 `T-O-8` 细则（远端数据 schema · NORMATIVE）

1. **对象与规则**：notepad manifest/files/images、shared-workspace marker/session meta/tree HEAD 的字段、类型、字符集、大小上限按 Q6 的 v1 schema 执行。
2. **拒绝语义**：任一字段非法 → 整对象拒绝；宿主返回 `{ok:false,reason:'schema'}`；notepad 客户端 `sync.cycle` 捕获并显示 error，IndexedDB 保留最后好状态；shared-workspace 宿主同步记录并跳过，不影响其他对象。
3. **版本化**：新对象 `schemaVersion:1`；历史对象缺失视为 v0 只读兼容并一次性补写；未知版本拒绝并提示升级。
4. **`/s3/object` 的 put/get 校验不对称**（v1.1 核查 `dsh-nano-notepad/src/host/s3-sync.js:231-242`）：`put` 接受**任意 `key`** 的写入（客户端本就用它写 `manifest.json`、`files/`、`images/` 等已知形态）。schema 校验只施加于 **`get` 返回的 known-key 形态**；`put` 对已知形态按 schema 校验、对未知 key 仅保留现有 key 形态/长度限制——不新增「任意 key 即拒」，否则会收窄现有写入能力，违反 `T-O-3`。
5. **配置**：`maxFileBytes/maxImageBytes/maxCommittedBytes` 为 L3 `Config`，默认保守可调；不改变现有 UI。

### 1.9 `T-O-9` 细则（HTML allowlist · NORMATIVE）

1. **一套策略表**：`packages/dsh-html-policy` 导出 `ALLOWED_ELEMENTS/ALLOWED_ATTRS/ALLOWED_SCHEMES/ALLOWED_STYLE_PROPS`。
2. **双 renderer**：客户端 `sanitizeRichHtml`（DOM）与宿主 `sanitizeMpHtml`（regex/序列化）读取同一策略；两者只过滤活动内容，保留 mp 文章图片、样式、表格、代码块、`data-src`、`foreignObject` 处理。
3. **强制丢弃**：script/iframe/object/embed/base/meta/form/input/button/textarea/select/link/style 元素、所有 `on*`、`srcdoc`、`javascript:`/`data:text`/`vbscript:`/`file:` URL。
4. **回归语料**：审计 `v-mpsan/battery-dom.txt`、`v-richxss/evidence.txt` 作为负向；真实文章结构 synthetic fixture 作为正向快照。

### 1.10 `T-O-10` 细则（P0 批次与发布 · NORMATIVE）

1. **批次**：Batch 0 基础（guard + route-sensitivity + feature-contract，零行为）→ Batch 1 P0 host-data 7 条 → Batch 2 P0 content-render 6 条 → Batch 3 P2/local-supply。每批门禁：`test:feature-contract` + 本批 `test:security-regression` + `test:smoke` + build 校验。
2. **发布**：每个插件最终只发一次 minor 版本；三共享包 0.1.0；不设 feature flag/关闭开关；release note 统一「功能无变化 + 安全加固」。
3. **回滚**：无数据迁移（T-O-8 的 v0 兼容只读），回滚 = 安装前一版本；`feature-contract` 保留为回归基线。
4. **26-nov-security-fix 交付**：Batch 0–3 任务表、负责人/预估、门禁脚本、发布 checklist、回滚步骤。

### 1.11 `T-O-11` 细则（P2 清单与 accepted 登记 · NORMATIVE）

1. **9 项清单**：`nxe:mutate-symlink-escape`（realpath 围栏；属「加固+边缘行为变化」并登记 `accepted-risks.json`，见 `T-O-14`）、`nxe:git-config-filter-exec`（拒绝 `.git/**`）、`hunter-e:grok-creds-workspace-copy`（`.gitignore` + `SKIP`）、`nxe:scopeof-cross-session`（仅日志）为加固；`nxe:routes-read-arbitrary-file`、`notepad:read-arbitrary-md-read`、`nsw:ls-mkdir-any-absolute-path`、`nano-notepad/s3-config-endpoint-ssrf`、`nxe:perf-review-window-drain` 为接受。
2. **登记**：`security/accepted-risks.json` 字段 `fingerprint/主体/现有功能/接受理由/可选加固/监控方式/owner 签字/复核日期`；发布说明列入「已知本地风险」。
3. **监控**：每次 release 跑 P2 子集的 `test:security-regression`，确认仍为本地自影响、无新增远程触发路径；新路由改变主体则升级 P0 复审。
4. **禁止**：不得用「接受」掩盖 P0；不得为 P2 加固而删除/隐藏现有功能。

### 1.12 `T-O-12` 细则（供应链与发布链 · NORMATIVE）

1. **esbuild**：四个 `build-client.mjs` 删除 `npx --yes esbuild@0.25.0` 回退；`node_modules/.bin/esbuild` 缺失即报错并提示 `npm ci`；release 流程加 `npm ci`。
2. **源文件入库（v1.1 更正：已完成大半）**：`src/host/s3-sync.js`、`packages/dsh-s3-client/**`、`src/client/{sync,cloud-settings}.js`、`packages/dsh-nano-ui/src/tabs.js` 及全部 `lib/` 产物在 `350c6c8` 已入库、worktree 干净。剩余面 = 新增 CI 校验「随包源与产物均已提交」（防回归）+ `npm ci`/clean-lib/attestation；`git status` 清洁后才打包。
3. **CI/证明**：`v*` tag 触发 `npm ci && npm run build && npm pack`；clean-lib gate（`git diff --exit-code -- lib/` 或哈希比对）；`SHA256SUMS` + `actions/attest-build-provenance`（或 cosign keyless）。
4. **发布门禁**：`npm pack --dry-run --json` 与 `files` 一致；`lib/` 由当前源重建；版本号与 tag 一致；无未跟踪文件。

---

### 1.13 `T-O-13` 细则（共享包分发通道 · NORMATIVE · v1.1）

> 解决约束「插件可独立 build / pack / install」。v0.x 只定了「三个共享包 + `file:` 依赖」，没定运行时通道；`file:line` 核查确认裸 import 会在运行时解析失败。

1. **运行时通道 = `lib/` bundle**：开发实例只拷贝 `lib/`、不拷贝 `node_modules`；宿主侧 `index.js` 是未打包源码，只允许 `node:*` 与 `./lib/*` 相对导入。证据：`dsh-nano-notepad/scripts/build-client.mjs:30-31`、`dsh-nano-shared-workspace/scripts/build-client.mjs:30-33`、`dsh-nano-model-selector/scripts/build-client.mjs:25-27`（三处注释均写明「the dev instance copies lib/ but not node_modules」）；`dsh-nano-explorer-extra/index.js:3` 与 `dsh-nano-shared-workspace/index.js:3` 已是「`index.js` 薄 re-export `./lib/host.js`」先例。
2. **逐包落点**：
   - `dsh-host-route-guard`：explorer / shared-workspace 打进 `lib/host.js`；notepad / model-selector 的 `index.js` 未打包，须新增 `lib/route-guard.js` 产物、或将 `index.js` 改为 re-export `./lib/host.js` 式结构。
   - `dsh-remote-data-schema`：notepad 打进 `lib/s3-sync-host.js`（消费点 `dsh-nano-notepad/src/host/s3-sync.js:231-250`）；shared-workspace 打进 `lib/host.js`（消费点 `workspaces.js` / `session-io.js` / `tree.js`）。
   - `dsh-html-policy`：浏览器侧打进 `lib/client.js`（同 `dsh-nano-ui` 先例）；宿主侧新增 bundle 产物供 `index.js` 相对 import。
3. **`package.json` 声明 = `devDependencies`**：三个共享包是构建期依赖，运行时无裸 import；放 `devDependencies` 使 tarball 自足（`dsh plugin add .tgz` 不再依赖宿主 `<parent>/packages/` 布局）。**既有 `dependencies` 里的 `file:`（`dsh-nano-ui`/`dsh-performance-review`/`dsh-s3-client`）随 T-O-12 一并迁到 `devDependencies`**——它们同样只进构建产物，此迁移**修复**而非新增「`.tgz` 安装依赖目录布局」的既有缺口。
4. **`security/*.json` 是 CI 真源、非运行时文件**：`route-sensitivity.json`、`feature-contract.json`、`accepted-risks.json` 在 repo 根、不在任何插件 `files`；运行时 guard 用**构建期烤进的 JS 常量**，repo 侧 JSON 由 `scripts/check-route-sensitivity.mjs` 在 CI 比对防漂移。
5. **平台中立**：三包不依赖任何私有部署事实（不写死 `dsh.local`、`DSH_HOME` 路径、registry 地址）；只用公开 `ctx.*` 契约。

### 1.14 `T-O-14` 细则（回归门禁三件套 · NORMATIVE · v1.1）

> 把「功能零回退」落成可验证判据；三条均对应 `file:line` 核查发现的具体回退风险。

1. **`feature-contract.json` 逐字段锁定**：每条路由固定 `path / method / bodyLimit / response shape`；`bodyLimit` **继承现有常量**——`/save` 8 MB、`/s3/object` 32 MB（`dsh-nano-notepad/index.js:70-74`）、explorer POST 64 KB、`media-engine` PUT 16384 B（`dsh-nano-model-selector/AGENTS.md` 使用表）——不得套统一 64 KiB 默认，否则 `/save` 大笔记存不下即回退。同步锁定 UI 入口与数据位置。
2. **存量数据全量回归**：Batch 1 前以现有桶导出样本对 v1 schema 全量回归，**100% 通过**方可冻结 v1 规则；不足则按合法样本最小收紧校准，再回归。防止「历史合法对象被 v1 整对象拒」变成只读/失联（`T-O-8` v0 兼容的兜底前提）。
3. **行为变化显式登记**：`nxe:mutate-symlink-escape` 的 realpath 围栏使「指向工作区外的符号链接」被拒——explorer 现行行为是「软链接当作普通条目跟随」（`dsh-nano-explorer-extra/AGENTS.md` 使用表），这是**有功能影响的边缘变化**，登记进 `security/accepted-risks.json` 作「加固+边缘变化」而非「功能无影响」。

---

## 2. Round 1 —— 安全边界与修复总纲（`Q1–Q2`）· 已冻结

> 本轮 second-opinion 模式：`waived`（按业主指示不设槽位）。

### 2.0 本轮提问前的代码检索清单（证据基础）

| # | 检索/阅读对象 | 结论（用于本轮） |
|---|---|---|
| 1 | `context/deepseek-harness/packages/client/connection/src/rpc-host.ts:94`、`context/deepseek-harness/packages/client/connection/src/rpc-host.ts:122-127` | 浏览器侧只有一个 `browserPeer`（`principal: { kind: 'owner' }`）；`requestRejection` 只是 `admit()` 的薄封装，不区分 tab / 插件 / 页面脚本来源。 |
| 2 | `dsh-nano-notepad/index.js:236/256/276/299`、`dsh-nano-explorer-extra/src/host/routes.js:458`、`dsh-nano-shared-workspace/src/host/routes.js:489`、`dsh-nano-model-selector/index.js:132/198` | 四插件共 **43 条 web 路由**（notepad 7 + explorer 13 + shared-workspace 20 + model-selector 3），全部只挂同一道 `connection()?.requestRejection(req)`。 |
| 3 | `dsh-nano-explorer-extra/src/host/routes.js:61-77` | `scopeOf(sessionId)` 对任意已存在 sessionId 都解析（live registry + cold `sessionPersistence.stat`），无调用者绑定。 |
| 4 | `dsh-nano-notepad/index.js:219-230`、`dsh-nano-notepad/index.js:264`、`dsh-nano-notepad/index.js:314-319` | notepad 的 `/read`、`/save`、`/s3/*` 路由均无 sessionId 参数；页面给什么路径/配置就执行什么。 |
| 5 | `dsh-nano-notepad/src/client/markdown.js:148`、`dsh-nano-notepad/src/client/panel.js:1342/1371` | 远程图片 `mime`/`base64` 未转义进入 `src="data:..."` 并经 `read.innerHTML` 注入——已确认的存储型 XSS，可直接获得页面脚本执行。 |
| 6 | `dsh-nano-notepad/src/client/sync.js:195-203`、`dsh-nano-notepad/src/client/db.js:655-665` | 远程 manifest 的 `id`/`name`/`workspaceId` 原样落到 IndexedDB，再被渲染进 `data-*` 属性——第二条页面脚本执行链。 |
| 7 | `dsh-nano-shared-workspace/src/client/index.js:415` | `window.__nsw = { store, ctx, face }` 直接把插件 face 暴露在页面全局；同 realm 内无脚本隔离。 |
| 8 | `dsh-nano-notepad/src/host/s3-sync.js:73-76`、`dsh-nano-notepad/src/host/s3-sync.js:108`；`dsh-nano-notepad/index.js:319` | S3 endpoint/bucket/密钥由页面 `POST /s3/config` 写入 `${DSH_HOME}/nano-notepad-s3.json`（0600）；endpoint 只校验 `http(s)://` 前缀，编辑时省略 secret 会沿用旧密钥。 |
| 9 | `dsh-nano-shared-workspace/src/host/entry.js:13-48`；`dsh-nano-shared-workspace/src/host/routes.js:229-234` | shared-workspace 的 endpoint/bucket/region 是 **operator Config**（`required`、无默认值）；但 `localPath` 仍是页面 body 传入。 |
| 10 | `dsh-nano-notepad/index.js:132-210`（`nativeSave`/`runViaSubprocess`，尤其 `dsh-nano-notepad/index.js:164-166`、`dsh-nano-notepad/index.js:179`） | 已有的「L1 用户确认写」范例：目标路径由 macOS 原生保存对话框选择，`osascript` 走 argv 而非 shell 字符串。 |
| 11 | `dsh-nano-explorer-extra/src/host/routes.js:392/419/427` | `allowOutsideWorkspace` 是 **请求体布尔值**——一个由页面自行设置的「关闭围栏」开关，是「路由级授权」不可依赖请求体的直接反例。 |
| 12 | `INTRODUCTION.md:282` | 平台契约：`Config` 用 `~standard` schema，配置来自 patch 层，不写在包里——这是 L3 运维配置的官方通道。 |

---

### Q1 — 安全边界基线：同源页面脚本是否作为较低信任主体？（来源：`docs/code-review/26-nov/security-audit.md` §2.1、§3；`findings.json` 24 条 confirmed）

> **v0.5 校准**：T-O-1 的主体判定保留；处置强度由 T-O-4/T-O-5 校准；本记录中「一律进入修复清单」以 §1.1 修订后的「进入处置清单」为准。

- **影响范围**：24 条 confirmed 的 **主体判定与修复形态**；四插件 43 条 web 路由的授权设计；26-nov-security-fix 的威胁模型、验收口径与回归用例；后续所有 executional-qna 的选项空间。
- **为什么必须确认**：这是整份审计的分水岭。审计的 16 条 high 中，绝大多数以「同源页面 JS 可调用宿主路由」为攻击链的第一跳或收口跳；而 dsh 平台在 `connection` 层只承认一个 `browserPeer`（owner），代码层面无法区分「插件自己的页面代码」与「任意注入脚本」。如果业主认为「同源页面 = 同主体」，这些 high 会被整体降级为 hardening，修复范围将缩减到只剩远程桶/远程文章类问题；反之，若承认页面脚本是较低信任主体，则 43 条路由都必须重新按能力分级。**这个前提不先冻结，后面每个执行题都会变成重复争论同一件事。**
- **当前建议 / 倾向**（`security-fix agent`）：**选 C**——页面脚本是较低信任主体，并且承认「同一 JS realm 内无法区分脚本来源」，因此修复以「撤走页面可达的危险能力 / 改换发起端」为主，路由级校验只作为残余 L0/L1 路由的兜底。
- **Reasoning**：平台事实（单一 `browserPeer`、无 per-tab/plugin 身份）、代码事实（4 条已确认存储型 XSS 证明远程桶写入者可以让脚本在页面 realm 执行）、以及同 realm 事实（`window.__nsw`、`fetch` + same-origin cookie 对任何页面脚本一视同仁）三者叠加，推出「以页面为信任边界」的模型不可实现；能实现的只有「以能力为边界」的模型。选 C 不是保守，而是唯一自洽的模型。
- **问题（请业主裁决）**：**你是否确认：同源页面脚本（包括其他插件 bundle、注入 DOM、存储型 XSS 载荷）一律视为较低信任主体，插件不得以「同源即同主体」为理由保留任何宿主级能力？**
- **业主回答**：`✅ 已确认：选 C（与推荐一致）→ 冻结为 T-O-1`。

**【对本问题的解读】**

1. 审计里说的「同源页面 JS」不是指「用户本人」，而是指**任何人能在 dsh Web 页面 realm 里执行的一段代码**。它的来源至少有四类：① 插件自己的 `lib/client.js`（受供应链影响）；② 其他插件/第三方 bundle；③ 被注入的 DOM 内容（agent 输出、聊天卡片）；④ 已确认的 4 条存储型 XSS 载荷（远程 S3 桶写入者、mp 文章作者）。
2. 平台层面，`connection.requestRejection` 只回答「这个请求是不是来自可信 Host/Origin + 已认证浏览器」，**不回答「这段代码是谁写的」**；`context/deepseek-harness/packages/client/connection/src/rpc-host.ts:94` 只有一个 `browserPeer = { principal: { kind: 'owner' } }`，所有页面请求共享它。这就是为什么「加一个 sessionId 校验」不能把攻击者挡在「插件自己的客户端」之外——攻击脚本可以用同一个 `fetch`、同一个 cookie、同一个 Peer 调用同一个路由。
3. 因此本问题实际在裁决：**安全模型以「请求来源」为边界，还是以「能力类型」为边界。** 前者在 dsh 平台不可实现（除非上 iframe/worker 级隔离，且平台不提供），后者可实现且可验收。

**【可选选项清单】**

| 选项 | 内容 | 对 24 条 findings 的影响 | 代价 / 风险 | 结论 |
|---|---|---|---|---|
| **A** | **页面 = owner 同主体**：承认 `browserPeer` 语义，页面脚本视为用户本人；只修「远程桶/远程文章 → 本地」类问题，页面类 finding 降为 hardening | 约 16 条 high 中的大部分降级或关闭；S3/mp/XSS 类保留 | 与 4 条已确认 XSS 的远程→页面链路矛盾：远程桶写入者经 XSS 即可获得 owner 权限；A 不能消除这条链，只能假装它不存在。且与审计报告已冻结的 verdict 冲突 | 不推荐 |
| **B** | **页面 = 较低信任，但用「路由级授权」补救**：给路由加 sessionId 绑定 / capability token / 去掉请求体 flag，保留全部现有能力 | 保留全部功能；每个 finding 做「加校验」式修复 | 同一 JS realm 内，token/校验逻辑与调用方共享同一可读内存；注入脚本可读取/复用任何插件客户端拿到的 token。`window.__nsw` 已把整个 face 暴露给页面（`dsh-nano-shared-workspace/src/client/index.js:415`），B 给的是「false assurance」 | 不推荐（作为唯一机制） |
| **C** | **页面 = 较低信任，且承认同 realm 不可区分脚本来源**：以「能力」为边界；页面可调用的每项能力按 L0/L1/L2 分级，L2 从页面面撤走，路由校验只兜底 L0/L1 | 全部 24 条进入统一的主体矩阵；页面类 finding 按「L2 退役 / L1 围栏 / L0 收紧」三类处置 | 需要较大的路由/UI/产品面调整（见 Q2）；但没有「假安全」 | **推荐（已采纳）** |

**【推荐选项的详细执行说明】**（推荐选项 C）

1. **建立主体矩阵（26-nov-security-fix 第一步）**：固定五类主体——`owner-operator`、`agent`、`page`、`remote-bucket`、`remote-web`。每条 finding 必须标注「第一入口主体」与「最终受影响主体」；只有 `owner-operator` 单一主体的项才允许关闭为 non-issue。
2. **路由可达性盘点**：以 `webServer.register` 为唯一入口，列出 43 条路由的 method、参数来源、当前是否页面可达、调用的宿主能力（fs / git / net / credentials / DSH_HOME / global）。产出 `security/route-inventory.md`（26-nov-security-fix 附件）。
3. **修复顺序固定为三段**：
   - 第一段（L2 撤除）：`nxe:git-config-filter-exec`、`nxe:mutate-symlink-escape`、`nano-notepad/s3-config-endpoint-ssrf`、`nsw:materialize-sessionId-path-traversal`、`nsw:workspaceId-join-s3key-traversal`、`nsw:remote-member-localPath-arbitrary-fs-write`、`nsw:ls-mkdir-any-absolute-path` 等页面可直达宿主能力的路由。
   - 第二段（XSS 收口）：4 条 XSS + `nano-notepad/sanitizeMpHtml-active-content`——它们是 `page` 主体的放大器，必须在 L2 撤除后立即修。
   - 第三段（L0/L1 收紧）：`nano-notepad/read-arbitrary-md-read`、`nxe:routes-read-arbitrary-file`、`nxe:scopeof-cross-session`、`nsw:acquireClaim-rmw-no-cas` 等。
4. **验收口径**：以审计 PoC 为回归用例，在 page-origin harness 中重放；L2 路由返回 404/403/405 且无宿主副作用；L1 仅工作区 realpath 内生效；L0 仅 session 作用域内有界数据。`remote-bucket` 类用 fake S3/loopback 重放。
5. **例外处理**：本阶段不设「保留 L2 但加校验」的例外；确需保留的进入 Round 3+ 单独立项，记录为「已接受风险」而非「已修复」。
6. **文档化**：26-nov-security-fix 每条 finding 的修复项必须引用 `T-O-1`，并附「主体矩阵 → 路由层级 → 修复动作」三列表。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 C 的平台证据**：`context/deepseek-harness/packages/client/connection/src/rpc-host.ts:94` — `this.browserPeer = new Peer(ctx, { principal: { kind: 'owner' } })`；`context/deepseek-harness/packages/client/connection/src/rpc-host.ts:122-127` — `requestRejection` 直接 `admit()`，浏览器请求全部落到同一 Peer。**平台没有 per-tab/per-plugin 身份**。
- **支持 C 的代码证据**：`dsh-nano-notepad/src/client/markdown.js:148` + `dsh-nano-notepad/src/client/panel.js:1371` — 远程图片 `mime` 未转义 → `read.innerHTML`；`dsh-nano-notepad/src/client/sync.js:195-203` + `dsh-nano-notepad/src/client/db.js:655-665` — 远程 manifest id/name 原样进 DOM。两条已确认存储型 XSS 说明 `remote-bucket` 可转化为 `page`。
- **支持 C 的同 realm 证据**：`dsh-nano-shared-workspace/src/client/index.js:415` — `window.__nsw = { store, ctx, face }`；`dsh-nano-shared-workspace/src/client/api.js:6-10` — 插件自身也只是 `fetch('/nano-shared-workspace/*', { credentials: 'same-origin' })`。
- **反例 A（页面=owner）**：`notepad:sync-manifest-id-unescaped-attr-xss`、`notepad:sync-remote-image-mime-unescaped-attr-xss`、`notepad:sanitizeRichHtml-keeps-js-href-active-dom`、`nano-notepad/sanitizeMpHtml-active-content` 均已确认「远程内容 → 同源脚本执行」；页面=owner 则远程桶写入者被当成 owner，与审计 high 判定冲突。
- **反例 B（路由级授权）**：`dsh-nano-explorer-extra/src/host/routes.js:392/419/427` 的 `allowOutsideWorkspace` 是请求体布尔值；`dsh-nano-notepad/src/host/s3-sync.js:76` 的「省略 secret 沿用旧值」意味着加 sessionId 校验后页面仍可切换 endpoint 并用真实密钥签名。

---

### Q2 — 修复总纲：能力分层（L0/L1/L2/L3）与 L2 的处置方式（历史题面；v0.5 修订为敏感度分级）（来源：`docs/code-review/26-nov/security-audit.md` §6.1；`findings.json` 24 条 confirmed）

> **v0.5 修订**：本记录中 Q2 选项 B 的「L2 硬退役」已被 T-O-3 取代；L0–L3 仅作敏感度分级。下列原文保留历史，执行以 §1.2 与 T-O-5/T-O-10 为准。

- **影响范围**：四插件 43 条 web 路由的最终去留；每个插件的 UI/产品面（notepad 云设置、explorer 文件操作、shared-workspace 工作区管理、model-selector 引擎选择）；26-nov-security-fix 的删除/迁移清单与版本策略。
- **为什么必须确认**：Q1 冻结「以能力为边界」后，马上要回答「能力怎么分、哪些能留、留下的怎么实现」。如果每个 finding 各自决定，会出现两类系统性错误：① 把本该退役的宿主能力用「加校验」保下来（假安全）；② 把本来安全的 L1 能力（如原生保存对话框）也砍掉（过度收紧、产品受损）。需要一条**整场修复一致的分类规则**。
- **当前建议 / 倾向**（`security-fix agent`）：**选 B**——建立 L0/L1/L2/L3 四层，L2 一律硬退役（删除路由或改由 operator/agent 发起），L1 用 realpath+工作区根围栏，L0 保持只读且有界，L3 只走 operator Config；默认拒绝未分类路由。
- **Reasoning**：现有代码同时存在「可以安全留在页面」的 L1 范例（`nativeSave` 的 macOS 原生对话框）和「无论怎么加校验都不该由页面发起」的 L2 范例（`/s3/config` 的任意 endpoint 签名代理、`/materialize` 的 DSH_HOME 写）。按**能力的作用域与后果**分层，才能既守住宿主边界又保留产品核心。治理原则「能硬切就不要双写、能彻底退役就不要提供兼容」直接指向 B。
- **问题（请业主裁决）**：**你是否确认采用 L0/L1/L2/L3 四层能力模型，并同意 L2（宿主级能力）在本阶段一律从页面路由硬退役（删除或改由 operator/agent 发起），不保留「加校验后继续由页面调用」的兼容路径？**
- **业主回答**：`✅ 已确认：选 B（与推荐一致）→ 冻结为 T-O-2`。

**【对本问题的解读】**

1. 当前 43 条路由全部只回答「是否已认证」，没有回答「这条路由允许谁发起、允许造成多大后果」。第一步不是逐条改代码，而是给每条路由定一个**能力层级**；层级决定修复方式（删除 / 迁移 / 围栏 / 收紧）。
2. 「L2」不是按「写操作」定义的，而是按**后果是否越出当前会话工作区**定义的：写自己工作区（L1，可由页面发起，只要 realpath 锁死）≠ 写 DSH_HOME / 任意宿主路径 / 起进程 / 发任意网络 / 碰凭据（L2，不可由页面发起）。
3. 「L3」是运维配置：endpoint、bucket、region、限额、feature 开关等，只能来自 patch/Config；页面只能读 masked 状态，不能写。

**【可选选项清单】**

| 选项 | 内容 | 优点 | 缺点 / 反例 | 结论 |
|---|---|---|---|---|
| **A** | **全部保留 + 每项加 feature flag（默认关闭）**：危险能力不删除，只加 operator 开关 | 改动小、功能不丢 | ① 开关本身若由页面/请求体控制，等于没关（`allowOutsideWorkspace` 就是先例）；② 双轨代码长期存在，违反「能硬切就不要双写」；③ 一旦 operator 打开，页面仍可调用 | 不推荐 |
| **B** | **四层能力模型（L0/L1/L2/L3）**：L0 会话内只读、L1 工作区内有界写、L2 宿主级整体退役、L3 仅 operator Config；未分类默认 L2 | 规则单一、可审计、可 CI 门禁；与平台 Config 契约一致；L2 无兼容残留 | 需要删除/迁移部分页面功能，产品面有可见变化 | **推荐（已采纳）** |
| **C** | **全部只读（L0 only）**：所有写能力退役 | 攻击面最小 | 过度收紧：`nativeSave` 已是安全 L1 范例（`dsh-nano-notepad/index.js:132-210`）；砍掉会让用户回到手工文件操作，反而降低安全性 | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 B）

1. **定义四层**：见 §1.2（NORMATIVE）。示例归属最终以 `security/route-inventory.md` 为准。
2. **逐路由分类与处置（26-nov-security-fix 必产）**：每条路由固定五列 `route | method | 参数来源 | 当前层级 | 处置`；处置只有 `keep-L0`、`harden-L1`、`retire-L2`、`move-L3`，**禁止 keep-L2**。
3. **L2 退役的三种标准动作**（按优先级）：
   - **删除**：能力本身不必要（如 `allowOutsideWorkspace` 分支、`/nano-explorer-extra/perf-review/host?mode=window` 破坏性排空）——删路由 + 删客户端调用 + 删 i18n 文案。
   - **改由 operator 发起**：能力必要但不应由页面触发（如 notepad 的 S3 endpoint/bucket 配置 → `Config`；shared-workspace 的 `localPath` 选择 → 安装/运维时的 Config 或 CLI）。
   - **改由 agent 工具发起**：能力属于 agent 的合法工作流（如 Git 操作、工作区目录创建）——走 dsh 的工具/权限体系，而不是插件自定义 web 路由。
4. **L1 的统一实现**：所有 L1 路由在最后可信决策点做 `resolve()` + `realpath()` + `isInside(workspaceRoot, resolved)`；创建类校验父目录；删除类拒绝符号链接目标。参考 `dsh-nano-notepad/index.js:164-179` 的原生对话框模式作为 L1 上限。
5. **L3 的统一实现**：把 notepad 缺失的 S3 配置搬到 `Config['~standard'].validate`（照 `dsh-nano-shared-workspace/src/host/entry.js:13-48` 的 `required()` 模式），页面只保留 `GET /s3/status`（masked）与同步进度。
6. **默认拒绝 + CI 门禁**：新增 `security/route-tiers.json`；启动时注册的每条路由必须声明层级；CI 静态测试扫描 `webServer.register`，未声明或 L2 出现在 web 路由注册即失败。
7. **版本与发布**：按 §1.2 的 major 版本执行；删除的路由不保留兼容别名；`lib/client.js` 与 `lib/host.js` 重新构建并纳入发布校验（同时闭合 `dsh-plugins/release-untracked-artifacts`）。
8. **验收口径**：`route-inventory.md` 中 web 面 `L2` 数量为 0；所有 L1 通过 symlink/`..`/绝对路径逃逸回归；所有 L0 通过 session 隔离与秘密掩码回归；CI 门禁通过。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 B 的现状证据（43 条路由同一道门）**：`dsh-nano-notepad/index.js:236/256/276/299`（7 条）、`dsh-nano-explorer-extra/src/host/routes.js:458`（13 条）、`dsh-nano-shared-workspace/src/host/routes.js:489`（20 条）、`dsh-nano-model-selector/index.js:132/198`（3 条）——全部只调用 `connection()?.requestRejection(req)`，没有路由级能力声明。
- **支持 L3 的 Config 先例**：`dsh-nano-shared-workspace/src/host/entry.js:23-25` 注释「Deployment values have no defaults...」；`dsh-nano-shared-workspace/src/host/entry.js:28-42` 用 `required('endpoint'/'bucket'/'region')`；`INTRODUCTION.md:282` 说明 Config 来自 patch 层、不写在包里。当前 notepad 的 `dsh-nano-notepad/index.js:31-35` Config 只有 4 个 UI 默认值，没有 endpoint/bucket。
- **支持 L1 的上限范例**：`dsh-nano-notepad/index.js:132-210` 的 `nativeSave`：`dsh-nano-notepad/index.js:164-166` 注释说明路径由原生对话框授权；`dsh-nano-notepad/index.js:179` `execFile('/usr/bin/osascript', ['-e', SAVE_SCRIPT, base, startDir], ...)` 走 argv，页面无法注入 shell。
- **反例 A（flag 默认关闭）**：`dsh-nano-explorer-extra/src/host/routes.js:392/419/427` 的 `allowOutsideWorkspace` 是请求体布尔值；`dsh-nano-notepad/src/host/s3-sync.js:73` 只校验 `http(s)://` 前缀、`dsh-nano-notepad/src/host/s3-sync.js:76` 编辑时省略 secret 沿用旧值；`dsh-nano-notepad/src/host/s3-sync.js:108` 的 `~/nano-notepad-s3.json` 是页面写入的持久化 profile 文件。
- **反例 C（全部只读）**：`dsh-nano-notepad/index.js:132-210` 的 `nativeSave` 已证明用户经原生对话框选路径是安全且必要的 L1。
- **反例「保留 L2 + 加校验」**：`dsh-nano-explorer-extra/src/host/routes.js:61-77` 的 `scopeOf` 已证明 sessionId 随便传；`dsh-nano-explorer-extra/src/host/git.js:122` 的 git 进程以宿主身份执行。校验无法把 L2 变成 L1。

---

## 3. ★ 中场评估 I（Round 1 → Round 2）

### 3.1 对 Round 1 的判定

- **Q1 已决断**：业主选 C，明确页面脚本为较低信任主体、同 realm 不可区分脚本来源；无遗留。
- **Q2 已决断**：业主选 B，明确 L0/L1/L2/L3 四层与 L2 硬退役；无遗留。**（v0.5 修订：L2 硬退役条款被 `T-O-3` 取代，仅保留分级作为敏感度；见 §3.5。）**
- **最关键的一手**：Q1 的 C 而不是 B——如果选 B（路由级授权），后续所有执行题都会建立在「页面脚本可被请求级校验区分」这一不成立的假设上；C 把整场修复从「加检查」扭转成「撤能力」，这是后续所有设计的前提。

### 3.2 本轮已锁定真相

- `T-O-1`：页面脚本 = 较低信任主体（详见 §1.1）。
- `T-O-2`：L0/L1/L2/L3 能力分层；v0.5 起仅作为敏感度分级，L2 硬退役条款被 `T-O-3` 取代（详见 §1.2 与 §3.5）。

### 3.3 诚实反方制衡

1. **C+B 的代价是真实的产品面收缩**：notepad 多 endpoint 云设置、shared-workspace 的目录选择、explorer 的 Git 操作都会从页面消失或改由 operator/agent 发起。若业主的实际使用强依赖这些页面入口，B 的执行会产生明显迁移摩擦；26-nov-security-fix 必须把「删除的路由 → 替代操作路径」逐条写清，不能只说「退役」。
2. **「同 realm 不可区分」也可能被误读为「页面什么都做不了」**：C 并不否定插件客户端需要功能，而是要求把功能压缩到 L0/L1；L1 的 realpath 围栏必须真的严密（symlink、大小写、UNC/网络盘），否则会退化成「假 L1」。
3. **单一守卫包（Q3 若选共享包）会成为单点**：它本身必须极简、无业务逻辑、有完整单测；否则一个 guard bug 影响四插件。需要在 26-nov-security-fix 中把它列为「安全关键基础件」，按发布门禁管理。
4. **本版 Q4 已排除数据面迁移（选项 D）**：notepad 保持客户端 IndexedDB + 客户端同步，离线行为不变；新的风险转为「共享包误杀合法远端数据」与「schema 版本漂移」，26-nov-security-fix 必须用合法样本回归 + schema 版本化控制。

### 3.4 为什么提出 Round 2（重写 Q3、Q4，及各自驱动的 T-O）

- Round 1 的 `T-O-1`/`T-O-2` 是在「安全优先、可删功能」的假设下冻结的；2026-11-11 业主变更令新增 `T-O-3`（功能零回退）与 `T-O-4`（本地威胁模型），改变优化目标：**功能交付优先，安全加固在其上叠加**。
- 由此产生两个必须重新裁决的结构性问题：
  - **Q3（重写）**：在本地单用户、无公网前提下，哪些主体仍是跨主体、必须修；哪些是 same-user 自影响、只做低成本加固；如何定义「功能不变」的边界。→ 驱动 `T-O-3`/`T-O-4`。
  - **Q4（重写）**：在不迁移数据面、不删路由、不改变 UI 的前提下，加固代码落在哪里：共享守卫包 + 宿主侧 schema 校验 + 共享 HTML 策略，还是各插件就地加固 / 仅客户端清洗。→ 驱动 `T-O-2`（敏感度分级）+ `T-O-3`。

### 3.5 业主变更令（v0.5，2026-11-11）

> 原文要点：**「维持核心功能不变，所有现在已经交付的内容和价值不能有任何形式的妥协，不能出现功能回退；安全性要为功能性让步；插件绝大部分在本地电脑上运行，基本没有公网暴露；优先保证功能交付，在功能交付的基础上进行安全加固。」**

落地：

1. 新增 `T-O-3`（功能零回退）与 `T-O-4`（本地威胁模型）为 NORMATIVE；`T-O-2` 的「L2 硬退役」条款失效，仅保留 L0–L3 作为敏感度分级。
2. **原 Q3/Q4 作废**（v0.2 的「共享守卫包 + 数据面迁移」方案不再成立），以 v0.5 的 Q3/Q4 重写替代。
3. 26-nov-security-fix 的验收口径改为「功能合同测试通过 + P0 跨主体 PoC 失败」；P2 自影响允许保留并登记。
4. 原审计的 severity 不重算（`docs/code-review/26-nov/security-audit.md` 仍为事实记录），但修复优先级按 `T-O-4` 的主体分桶执行。

---

## 4. Round 2 —— 本地威胁模型与「功能零回退」加固架构（`Q3–Q4` · 均 foundational，v0.5 重写）

> 本轮 second-opinion 模式：`waived`。Q3 由 `T-O-1` + `T-O-3` + `T-O-4` 驱动；Q4 由 `T-O-2`（敏感度分级）+ `T-O-3` + `T-O-4` 驱动。

### Q3 — 本地部署威胁模型与「功能零回退」边界：哪些必修、哪些只做加固（**驱动真相：`T-O-1` + `T-O-3` + `T-O-4`**）

- **影响范围**：24 条 confirmed 的处置分类（必修 / 加固 / 已接受）；是否允许改变任何 UI、路由、数据流；26-nov-security-fix 的范围、优先级与验收；后续全部 executional 题。
- **为什么必须确认**：Round 1 的 `T-O-1`/`T-O-2` 是在「安全优先、可删功能」假设下冻结的；`T-O-3`（功能零回退）与 `T-O-4`（本地单用户、默认 loopback、无公网）改变了优化目标。若照原审计的 L2 硬退役执行，会删除 notepad 多 endpoint 云设置（`dsh-nano-notepad/src/client/cloud-settings.js:1-196`、`dsh-nano-notepad/src/client/panel.js:2028`）、shared-workspace 的 join 目录选择（`dsh-nano-shared-workspace/src/client/index.js:373-377`）、explorer 的文件/Git 操作（`dsh-nano-explorer-extra/src/client/body.js:151`）——直接违反 `T-O-3`。但若完全不修，远程桶写入者仍可经 XSS 拿到页面权限（`dsh-nano-notepad/src/client/sync.js:195-215` + `dsh-nano-notepad/src/client/markdown.js:148` + `dsh-nano-notepad/src/client/panel.js:1371`）。必须先定义「哪些主体仍是跨主体、哪些只是同用户自影响」。
- **当前建议 / 倾向**（`security-fix agent`）：**选 C**——按主体分三桶：`remote-cross`（P0 必修：remote-bucket/remote-web → 本地宿主数据）、`remote→page`（P0 必修：远程内容转化为页面脚本，含经 agent 提示词注入进入执行链的同类）、`page-self`（P2 仅加固：同用户页面脚本 → 宿主，属自影响，只做不改变功能的加固）。所有现有路由、UI、工作流、数据位置全部保留。
- **Reasoning**：本地单用户、默认 loopback 时，唯一真实的跨主体入口是「远程桶/远程网页 → 本机」以及它们经 XSS 转化出的页面脚本；同用户页面脚本调宿主路由，等同于用户自己在控制台操作，不应为它牺牲功能。把 P0 收窄到这两类，既守住真实攻击面，又满足 `T-O-3`。P2 的加固（路径围栏、参数校验、限额）只要不改变功能就做，改变功能的则登记为已接受风险。
- **问题（请业主裁决）**：**你是否确认按 `remote-cross` / `remote→page` / `page-self` 三桶处置：P0 两桶必修（只加校验/清洗/围栏，不改功能），P2 桶只做不改变功能的加固、其余登记为已接受风险？**
- **业主回答**：`✅ 已确认：选 C（与推荐一致）→ 冻结为 T-O-5`。

**【对本问题的解读】**

1. **这不是降低审计结论，而是改变修复的目标函数**：审计报告仍记录 24 条 confirmed 的事实与 severity；本阶段只决定「哪些必须修、哪些作为本地自影响接受」。`T-O-3` 明确功能不能回退，`T-O-4` 明确本地部署事实，二者共同要求分桶。
2. **分桶标准是「是否跨主体」，不是「是否严重」**：一条 high 可能只是同用户自影响（如 explorer 的任意读），一条 medium 可能仍是跨主体（如 shared-workspace 的远程 marker 注入）。所以不能按 severity 直接排序，必须按主体。
3. **`remote→page` 必须算 P0**：远程 S3 桶写入者或 mp 文章作者一旦通过 XSS 在页面执行脚本，就获得了与用户页面相同的 `fetch`/cookie/Peer，能把 P2 的 page-self 能力全部用一遍；不修 XSS 等于把 P2 暴露给远程攻击者。
4. **`page-self` 的接受不是忽略**：能零成本加固的（路径 realpath 围栏、参数 schema、body 限额）仍然做；需要改变功能/工作流的（如移除 `allowOutsideWorkspace`、删除 `/s3/config`）不做，登记为 `accepted-local-self-impact` 并在 26-nov-security-fix 中列明。

**【可选选项清单】**

| 选项 | 内容 | 对功能的影响 | 对安全的影响 | 结论 |
|---|---|---|---|---|
| **A** | **全部按原审计级别修（含 L2 退役/数据面迁移）** | 删除 notepad 云设置、shared-workspace 目录选择、explorer Git 等；改变数据存放与离线行为 | 安全面最大 | 违反 `T-O-3`，不推荐 |
| **B** | **只修 remote-bucket 的宿主侧（member.localPath/committedBytes/claim），忽略 remote→page** | 功能不变 | 留下 remote→page→host 链：桶写入者经 XSS 获得页面权限，仍可调用所有 page-self 路由 | 不推荐 |
| **C** | **三桶处置**：`remote-cross` 与 `remote→page` 为 P0（只加校验/清洗/围栏）；`page-self` 为 P2（零成本加固，改变功能的登记 accepted） | 全部功能、入口、工作流、数据位置不变 | 真实跨主体链被切断；同用户自影响有边界加固 | **推荐** |

**【推荐选项的详细执行说明】**（推荐选项 C）

1. **分桶清单（26-nov-security-fix 必产）**：以 `findings.json` 的 24 条 confirmed 为输入，逐条填 `主体桶 / 是否 P0 / 修复手段 / 功能影响`。代表项：
   - `remote-cross`：`nsw:matchWorkspace-member-localPath-session-exfil`（`dsh-nano-shared-workspace/src/host/workspaces.js:120-130`）、`nsw:remote-member-localPath-arbitrary-fs-write`（`dsh-nano-shared-workspace/src/host/tree.js:157-217`）、`nsw:remote-meta-unbounded-fetch-decompress`（`dsh-nano-shared-workspace/src/host/session-io.js:199`、`:281`）、`nsw:acquireClaim-rmw-no-cas`（共租户并发写）、`nsw:workspaceId-join-s3key-traversal`（bucket 侧）。
   - `remote→page`：`notepad:sync-manifest-id-unescaped-attr-xss`（`dsh-nano-notepad/src/client/sync.js:195-215` → `dsh-nano-notepad/src/client/db.js:655-665`）、`notepad:sync-remote-image-mime-unescaped-attr-xss`（`dsh-nano-notepad/src/client/markdown.js:148` → `dsh-nano-notepad/src/client/panel.js:1371`）、`notepad:sanitizeRichHtml-keeps-js-href-active-dom`（`dsh-nano-notepad/src/client/markdown.js:179`）、`nano-notepad/sanitizeMpHtml-active-content`（`dsh-nano-notepad/index.js:423`）、`nano-notepad/fetch-mp-redirect-ssrf`（远程文章 30x → 宿主网络）、`hunter-e:imagine-template-shell-injection`（远程文档/网页被 agent 读入 prompt 的间接注入链）。
   - `page-self`：`nxe:routes-read-arbitrary-file`（`dsh-nano-explorer-extra/src/host/routes.js:412-449`）、`notepad:read-arbitrary-md-read`（`dsh-nano-notepad/index.js:219-230`）、`nsw:ls-mkdir-any-absolute-path`（`dsh-nano-shared-workspace/src/host/routes.js:388-410`）、`nxe:mutate-symlink-escape`、`nxe:git-config-filter-exec`、`nano-notepad/s3-config-endpoint-ssrf`、`hunter-e:grok-creds-workspace-copy`（本地凭据处理，按自影响登记）。
2. **`remote-cross` 的修复纪律**：只加 schema 校验、身份绑定（memberId 完整匹配/createdBy）、路径限制（realpath 围栏）、大小上限（`committedBytes`/part/解压输出）；不改 join/pull/push 的 UI 与工作流。
3. **`remote→page` 的修复纪律**：只加输出编码/HTML allowlist（剥活动内容）、URL scheme 校验、DOM 属性转义；不改变正常文章/笔记的渲染能力（图片、样式、表格、代码块保留）。
4. **`page-self` 的修复纪律**：只做不改变功能的加固——路径 realpath 围栏（拒绝越界，不拒绝合法路径）、参数 schema、body 限额、错误脱敏；涉及删除/隐藏/迁移的（如 `allowOutsideWorkspace` 的合法用途、`/s3/config` 多端点管理、`/workspaces/join` 的本地目录选择）保留原功能，登记 `accepted-local-self-impact`。
5. **功能合同基线**：26-nov-security-fix 产出 `security/feature-contract.json`，固定 43 条路由 + 客户端入口 + 数据位置；任何修复提交必须跑 `test:feature-contract`，不得改变 path/method/response shape/UI 入口/存储位置。
6. **验收**：P0 两桶的审计 PoC 必须失败（远程桶写入被拒、XSS 不执行、mp 重定向不复验通过即拒绝）；P2 桶的 PoC 允许仍成功，但必须记录「已接受风险 + 加固措施 + 复发监控」；所有功能 smoke 必须通过（notepad save/read/cloud settings/sync、explorer 文件与 Git、shared-workspace join/pull/push、model-selector 引擎切换）。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持「本地/无公网」的事实**：`AGENTS.md:43-45` 明确三套实例都在本机（日常 `~/.dsh`、开发 `~/.dsh-dev`、桌面 `~/.dsh-desktop`）；`context/deepseek-harness/docs/subsystems/web-server.zh.md:102` 明确 `dsh web` 默认 loopback、非 loopback 绑定会警告；`context/deepseek-harness/packages/client/connection/src/rpc-host.ts:94` 的浏览器 Peer 是 `{ principal: { kind: 'owner' } }`，即同用户。
- **支持 `remote→page` 必须修的代码链**：`dsh-nano-notepad/src/client/sync.js:195-215` 把 `manifest.files` 的 `id`/`name` 原样放入 remotes；`dsh-nano-notepad/src/client/db.js:655-665` 原样写入 IndexedDB；`dsh-nano-notepad/src/client/markdown.js:148` 把远程图片 `mime` 原样插入 `src="data:..."`，`dsh-nano-notepad/src/client/panel.js:1371` 用 `innerHTML` 注入。这是完整的 remote-bucket → page script 链，`T-O-4` 下仍是跨主体。
- **支持 `remote-cross` 必须修的代码链**：`dsh-nano-shared-workspace/src/host/workspaces.js:120-130` 用任意 marker 的 `member.localPath` 匹配 cwd；`dsh-nano-shared-workspace/src/host/tree.js:157-217` 用该路径做 pull/push 文件读写；`dsh-nano-shared-workspace/src/host/session-io.js:199`、`:281` 用远程 `committedBytes` 决定请求/拼接数量。这些都不依赖页面，桶写入者可直接触发。
- **反例 A（全按原审计）**：`dsh-nano-notepad/src/client/cloud-settings.js:1-196` 是完整的多 endpoint 云设置 UI，挂在 `dsh-nano-notepad/src/client/panel.js:2028`；删除 `/s3/config` 会让该 UI 失效——直接违反 `T-O-3` 的功能零回退。
- **反例 B（只修 remote-cross）**：`notepad:sync-manifest-id-unescaped-attr-xss` 与 `notepad:sync-remote-image-mime-unescaped-attr-xss` 是已确认的 remote→page XSS；忽略它们，桶写入者可在用户页面执行脚本，然后用 `page-self` 的路由（`nxe:routes-read-arbitrary-file` 等）读取本机文件——B 反而给远程攻击者留了完整链路。
- **反例「P2 全部删除」**：`dsh-nano-explorer-extra/src/host/routes.js:392/419/427` 的 `allowOutsideWorkspace` 与 `/s3/config` 都是现有 UI 依赖的功能（`cloud-settings.js`），删除即功能回退；`T-O-3` 不允许。

---

### Q4 — 功能零回退下的加固落点：共享守卫 + 宿主侧远端数据校验 + 共享 HTML 策略（**驱动真相：`T-O-2`（敏感度分级）+ `T-O-3` + `T-O-4`**）

- **影响范围**：43 条 web 路由的注册方式与加固代码位置；`packages/` 的包结构；notepad 客户端同步与 shared-workspace 宿主同步的校验点；HTML 清洗策略；26-nov-security-fix 的工程拆分、测试与发布版本。
- **为什么必须确认**：Q3 只决定「修哪些」，Q4 决定「加固代码放在哪」。`T-O-3` 禁止迁移数据面（会改变 IndexedDB/离线/UI），所以不能沿用 v0.2 的 Q4「宿主唯一数据面」；但加固仍需单一实现点——否则 43 条路由各自写校验会漂移，remote-data 校验会在 N 个消费点重复。必须选一个「不改变功能、可审计、可回归」的落点。
- **当前建议 / 倾向**（`security-fix agent`）：**选 A**——三层加固，全部为增量、不改变数据流与 UI：
  1. `packages/dsh-host-route-guard`：统一 `registerRoutes`，所有现有路由保留，声明 `sensitivity`（`public`/`owner`/`sensitive`）与 `bodyLimit`；fail-closed 获取 `connection`，统一 method/JSON 错误。
  2. `packages/dsh-remote-data-schema`：对 notepad manifest/files/images 与 shared-workspace marker/meta/parts 做 schema 校验，在宿主 `s3-sync.js` 的 object 返回前与 shared-workspace 宿主同步消费点执行。
  3. `packages/dsh-html-policy`：共享 HTML allowlist 策略表，客户端 `sanitizeRichHtml`（`dsh-nano-notepad/src/client/markdown.js:179`）与宿主 `sanitizeMpHtml`（`dsh-nano-notepad/index.js:423`）共同使用；只剥活动内容，保留正常排版。
- **Reasoning**：功能零回退意味着**不做数据面迁移**；但 `T-O-2` 的敏感度分级仍可作为「哪些路由需要额外校验」的依据。共享守卫包解决「43 条路由各自实现」的漂移；宿主侧 schema 校验解决「远端数据在进入页面前没有统一验证」的根因，且不改变客户端同步/IndexedDB；共享 HTML 策略解决「两套 sanitizer 各写各的」的问题。三者都是增量，不删路由、不改 UI、不迁移存储。
- **问题（请业主裁决）**：**你是否确认采用 A：共享宿主守卫包 + 宿主侧远端数据 schema 校验 + 共享 HTML allowlist 策略，全部为增量加固（不迁移数据流、不删除任何路由/UI、不改现有功能）？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 冻结为 T-O-6`。

**【对本问题的解读】**

1. **「加固落点」不是「功能归属」**：Q4 不改变功能由谁提供，只决定「校验/清洗代码写在哪个包、哪一层」。功能仍由原插件包提供，安装与市场方式不变（见 §0.2）。
2. **为什么不能只做客户端清洗**：notepad 的远程数据是经宿主 `/s3/object` 代理返回的（`dsh-nano-notepad/src/host/s3-sync.js:231-250`），页面拿到的 `bodyB64` 已经是原始字节；只洗客户端会漏掉「数据已进入 IndexedDB」与 shared-workspace 宿主同步（`dsh-nano-shared-workspace/src/host/tree.js:157-217`）。宿主侧校验是唯一能覆盖全部消费点的位置。
3. **为什么需要共享包**：四插件注册器已经复制粘贴（`dsh-nano-explorer-extra/src/host/routes.js:450-478` vs `dsh-nano-shared-workspace/src/host/routes.js:481-509`），remote-data 校验若各写各的会 schema 漂移；共享包把「一次安全评审」变成四个插件的共同基线。
4. **为什么不是数据面迁移**：`dsh-nano-notepad/src/client/sync.js:273` 的 `setInterval`、IndexedDB 存储与离线行为是已交付功能；迁移会改变数据位置（`INTRODUCTION.md:89`：浏览器数据在 IndexedDB、宿主数据在宿主文件系统），违反 `T-O-3`。

**【可选选项清单】**

| 选项 | 内容 | 功能影响 | 安全性 / 可维护性 | 结论 |
|---|---|---|---|---|
| **A** | **共享守卫包 + 宿主侧 schema 校验 + 共享 HTML 策略**（全部增量） | 无：路由/UI/数据流/存储位置全部保留 | 单点实现、可审计、可 CI；覆盖宿主代理与 shared-workspace 宿主同步 | **推荐** |
| **B** | **各插件就地加固**：不新增包，每个插件自己加校验 | 无 | 四份实现漂移（已有两份 registerRoutes 复制），remote-data schema 易分叉；CI 无统一入口 | 不推荐 |
| **C** | **仅客户端清洗**：只改 `markdown.js`/`panel.js` | 无 | 漏掉宿主 `/s3/object` 原始字节与 shared-workspace 宿主同步；IndexedDB 已写入恶意数据；T-O-2 敏感度分级无处落地 | 不推荐 |
| **D** | **数据面迁移（v0.2 旧 Q4 B）** | **有**：改变数据存放/离线/UI，违反 `T-O-3` | 安全面最大 | 明确不采用 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **`packages/dsh-host-route-guard`**：
   - `registerRoutes(ctx, routes)` + `RouteSpec = { path, method, sensitivity: 'public'|'owner'|'sensitive', capability, bodyLimit?, handler }`。
   - 所有现有 43 条路由原样注册（path/method 不变），`sensitivity` 只决定日志级别、是否强制 session 绑定、是否附加校验，不决定删除。
   - fail-closed：`const connection = ctx.get('connection'); if (!connection) throw`；统一 method 405、JSON body 上限（默认 64KiB，`/s3/object` 可按现有 `MAX_S3_BODY_BYTES`）、错误 JSON 形状。
   - 生成 `security/route-inventory.md` + `security/route-sensitivity.json`。
2. **`packages/dsh-remote-data-schema`**（纯 JS，无 DOM）：
   - notepad manifest：`rev` 正整数、`files` map 的 `id` `^[A-Za-z0-9_-]{1,128}$`、`name` 安全字符/长度、`sha256` 64 hex、`images` 的 `sha`/`byteLength` 类型与上限。
   - notepad image：`mime` ∈ `image/png|jpeg|gif|webp`、`base64` 字符集与大小上限。
   - shared-workspace marker：`workspaceId` 字符集、`members` 行类型；`session meta`：`committedBytes` 非负整数且 ≤ 配置上限（如 2GiB）、part ≤64KiB。
   - 校验点：`dsh-nano-notepad/src/host/s3-sync.js:231-250` 的 object 返回前（按 known key 校验）；`dsh-nano-shared-workspace/src/host/workspaces.js:103-130`、`dsh-nano-shared-workspace/src/host/session-io.js:172-281`、`dsh-nano-shared-workspace/src/host/tree.js:157-217`。
3. **`packages/dsh-html-policy`**：元素/属性/scheme allowlist 常量 + 纯函数 `sanitizeHtmlPolicy`；客户端 `sanitizeRichHtml` 与宿主 `sanitizeMpHtml` 都调用同一策略（客户端用 DOMParser，宿主用现有正则/序列化）；只删除 `script/iframe/object/embed/base/meta/form` 与 `on*`/`javascript:`，保留图片、表格、代码块、样式等现有渲染。
4. **功能合同与测试**：`security/feature-contract.json` 固定 43 条路由 + 客户端入口 + 数据位置；`npm run test:feature-contract` 断言无 path/method/UI/存储变化；`npm run test:security-regression` 重放 P0 PoC；`npm run test:smoke` 跑 notepad/explorer/shared-workspace/model-selector 全功能 smoke。
5. **不迁移数据面**：保留 `dsh-nano-notepad/src/client/sync.js`、IndexedDB、`setInterval`、全部 `/s3/*` 路由与 `cloud-settings.js` UI；shared-workspace 现有宿主同步保持不变，只加 schema 校验。
6. **发布**：三包 0.1.0；四个插件 patch/minor 版本（0.1.1→0.1.2 或 0.1.1→0.2.0），不升 major、不改 `dsh.bundle.patch`/`dsh.client`/`files` 结构。
7. **落地顺序**：guard 包（零行为变化）→ remote-data-schema（只拒绝恶意对象）→ html-policy（只剥活动内容）→ 全量 smoke + P0 回归。每步可独立发布，不设双轨。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的宿主代理单点**：`dsh-nano-notepad/src/host/s3-sync.js:231-250` 的 `object({op,key,...})` 是所有 notepad S3 读写的唯一宿主入口；在 `get` 返回 `bodyB64` 前校验即可覆盖 `dsh-nano-notepad/src/client/sync.js:36` 的 `object()` 调用，无需改客户端数据流。
- **支持 A 的 shared-workspace 宿主同步**：`dsh-nano-shared-workspace/src/host/routes.js:512` 的 `startBackgroundSync`、`dsh-nano-shared-workspace/src/host/session-io.js:172` 的 `pushSession`、`dsh-nano-shared-workspace/src/host/tree.js:184` 的 `pushWorkspace` 均在宿主进程内，可直接消费 `dsh-remote-data-schema`，不涉及页面。
- **支持 A 的共享包先例**：`dsh-nano-notepad/package.json:52-53`、`dsh-nano-explorer-extra/package.json:52` 已使用 `file:../packages/...` 依赖共享包；新增纯 host 包与现有构建/安装方式一致。
- **支持 A 的清洗现状**：`dsh-nano-notepad/src/client/markdown.js:179` 的 `sanitizeRichHtml` 与 `dsh-nano-notepad/index.js:423` 的 `sanitizeMpHtml` 是两套独立实现；共享 allowlist 能避免「客户端修了、宿主没修」的偏差。
- **反例 B（各插件自写）**：`dsh-nano-explorer-extra/src/host/routes.js:450-478` 与 `dsh-nano-shared-workspace/src/host/routes.js:481-509` 已出现两份几乎逐字的注册器；remote-data schema 若也各写一份，`manifest`/`image`/`marker` 规则会分叉，且 CI 无法统一断言。
- **反例 C（仅客户端清洗）**：`dsh-nano-notepad/src/host/s3-sync.js:250` 仍会把原始 `bodyB64` 返回给页面，`dsh-nano-notepad/src/client/db.js:648-683` 已把数据写入 IndexedDB；shared-workspace 的 `dsh-nano-shared-workspace/src/host/tree.js:157-217` 完全不经过客户端。C 覆盖不到这些路径。
- **反例 D（数据面迁移）**：`INTRODUCTION.md:89` 明确浏览器数据在 IndexedDB、宿主数据在宿主文件系统；迁移会改变 `dsh-nano-notepad/src/client/sync.js:273` 的 `setInterval` 同步与离线行为，直接违反 `T-O-3`。

---

## 5. ★ 中场评估 II（Round 2 → Round 3）

### 5.1 对 Round 2 的判定

- **Q3 已决断**：业主选 C，确认 `remote-cross` / `remote→page` 为 P0、`page-self` 为 P2 只加固；功能零回退；无遗留。
- **Q4 已决断**：业主选 A，确认共享守卫 + 宿主侧 schema + 共享 HTML 策略三包增量加固，不迁移数据面、不删路由；无遗留。
- **最关键的一手**：Q4 把「加固落点」锁定为**增量三包**，而不是数据面迁移；这使 `T-O-3`（功能零回退）从口号变成可执行的工程约束——任何后续设计只要触碰数据位置/UI/工作流即自动违规。

### 5.2 本轮已锁定真相

- `T-O-5`：P0/P2 三桶分诊与 `accepted-local-self-impact`（详见 §1.5）。
- `T-O-6`：三包加固架构与不迁移/不删除约束（详见 §1.6）。

### 5.3 诚实反方制衡

1. **P2 接受意味着部分审计发现仍然可被同用户脚本利用**：`nxe:routes-read-arbitrary-file`、`notepad:read-arbitrary-md-read` 等在本地同用户模型下不会强制修复；26-nov-security-fix 必须逐条登记「接受理由 + 低成本加固 + 复发监控」，不能写成「已修复」。
2. **schema 严格拒绝可能误伤历史数据**：现有桶里可能存在缺字段的旧 manifest/图片；Q6 必须先做「现有数据兼容性检查」与 schema 版本化，否则修复本身造成功能回退。
3. **三包增加依赖面**：guard/schema/html-policy 都是安全关键基础件，需单点评审、单测、版本锁定；否则新包本身成为供应链风险。
4. **feature-contract 测试可能脆弱**：必须由代码生成（`registerRoutes` 清单）而不是手工维护，否则会阻碍正常开发、被开发者绕过。

### 5.4 为什么提出 Round 3（注入 Q5、Q6、Q7，及各自驱动的 T-O）

- `T-O-6` 已定「三个共享包」，但每个包要落地还缺三组执行级真值：
  - **Q5**：`dsh-host-route-guard` 的 `sensitivity` 必须逐路由分配；按前缀/按方法都会误判（同一 `/settings` 下有 GET 读、POST 凭证验证、PUT 身份写；同一 `/media-engine` 下 GET/PUT 不同语义）。→ 驱动 `T-O-2`（分级）+ `T-O-5`。
  - **Q6**：`dsh-remote-data-schema` 的字段级规则与拒绝语义未定；过严会误伤历史数据（功能回退），过松则 P0 不成立。→ 驱动 `T-O-5`（P0）+ `T-O-6`。
  - **Q7**：`dsh-html-policy` 的元素/属性/样式 allowlist 未定；过严会剥掉 mp 文章排版（功能回退），过松则 XSS 仍在。→ 驱动 `T-O-5`（remote→page）+ `T-O-6`。

---

## 6. Round 3 —— executional（`Q5–Q7`）

> 本轮 second-opinion 模式：`waived`。三题分别由 `T-O-2`/`T-O-5`/`T-O-6` 驱动。

### Q5 — 43 条路由的敏感度清单与守卫契约（**驱动真相：`T-O-2`（分级）+ `T-O-5`（P0/P2）+ `T-O-6`（守卫包）**）

- **影响范围**：四插件 43 条 web 路由的 `sensitivity/capability/bodyLimit/sessionBinding` 逐条定级；`packages/dsh-host-route-guard` 的 `RouteSpec` 与启动校验；`security/route-sensitivity.json`；后续所有新路由。
- **为什么必须确认**：Q4 已定「共享守卫包」，但如果按插件给默认敏感度或按 HTTP 方法给，会误判：shared-workspace 的 `/settings` GET 只返回 masked 读（`dsh-nano-shared-workspace/src/host/routes.js:123-129`），`/settings/test` POST 是凭证验证（`:130-153`），`/settings/update` PUT 是身份写（`:154-172`）；notepad 的 `/s3/status` 是只读状态（`dsh-nano-notepad/index.js:314`），`/s3/config` 是配置写（`:319`）；model-selector 的 `/media-engine` 同一路径 GET/PUT 语义完全不同（`dsh-nano-model-selector/index.js:210-245`）。不逐条定格，guard 无法区分「只读」「工作区写」「宿主级」。
- **当前建议 / 倾向**（`security-fix agent`）：**选 B**——逐路由 43 行显式清单（代码生成 + 人工复核），guard 启动时严格匹配；未列入的路由禁止注册。清单字段：`plugin | path | method | sensitivity(L0/L1/L2/L3) | capability | bodyLimit | sessionBinding | justification`。
- **Reasoning**：43 条路由数量可控，且安全语义差异大；逐条清单既能精确表达，又能被 CI 快照防漂移。按插件/按方法都会把「读」和「写」「网络」「凭据」混为一谈，直接违反 `T-O-2` 的敏感度分级目的。
- **问题（请业主裁决）**：**你是否确认采用「43 条路由逐条显式敏感度清单 + guard 启动强校验」？**
- **业主回答**：`✅ 已确认：选 B（与推荐一致）→ 冻结为 T-O-7`。

**【对本问题的解读】**

1. 这里的「敏感度」不是「严重度」，而是**这条路由被页面调用时需要的校验强度**：L0 只读且无 secret；L1 工作区写；L2 宿主级能力；L3 配置。它决定 guard 是否附加 session 绑定、body 限额、路径围栏、额外 schema。
2. 43 条路由分布：notepad 7（`dsh-nano-notepad/index.js:60-66`）、explorer 13（`dsh-nano-explorer-extra/src/host/routes.js:226-413`）、shared-workspace 20（`dsh-nano-shared-workspace/src/host/routes.js:123-448`）、model-selector 3（`dsh-nano-model-selector/index.js:28-30`）。
3. 同一前缀下差异极大：`/settings` 三方法三种语义、`/s3/*` 四路由四种能力、`/media-engine` GET/PUT 两种语义；这说明必须逐条。

**【可选选项清单】**

| 选项 | 内容 | 优点 | 缺点 / 反例 | 结论 |
|---|---|---|---|---|
| **A** | **按插件默认 + 少量例外**：每个插件给一个默认 sensitivity，只给少数路由例外 | 工作量最小 | shared-workspace `/settings` 的 GET/POST/PUT 会被同一默认覆盖：读 masked、验证凭证、写身份三种语义混同；notepad `/s3/status` 与 `/s3/config` 同前缀不同能力。会误判。 | 不推荐 |
| **B** | **43 条逐路由显式清单**：代码生成 `route-sensitivity.json`，人工复核后由 guard 强校验 | 精确、可审计、可 CI、可生成 route inventory | 初次梳理工作量；但 43 条可控 | **推荐** |
| **C** | **按 HTTP 方法**：GET=public，POST/PUT=sensitive | 规则简单 | notepad `/read` 与 `/save` 都是 POST；`/media-engine` 同路径 GET/PUT；方法不表达权限语义，误判严重 | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 B）

1. **清单生成**：`scripts/gen-route-sensitivity.mjs` 扫描四插件 `createRoutes`/`ROUTE` 常量，输出 43 行 `security/route-sensitivity.json`（初版由 agent 标注，owner/安全评审复核）。
2. **字段定义**：
   - `sensitivity`：`L0`（只读/无 secret）、`L1`（工作区内写）、`L2`（宿主级：fs/git/net/credentials/DSH_HOME/跨会话）、`L3`（配置）。
   - `capability`：`read:workspace` / `write:workspace` / `read:host` / `write:host` / `net:fetch` / `s3:read` / `s3:write` / `proc:git` / `config:write` / `credential:probe`。
   - `bodyLimit`：默认 64KiB；`/s3/object` 用现有 `MAX_S3_BODY_BYTES`；`/save` 按 `imageLimitBytes`/笔记大小。
   - `sessionBinding`：`required`（explorer/shared-workspace 的会话路由）、`none`（notepad/model-selector 的页面全局路由）。
3. **guard 校验**：启动时读取清单；任何 `webServer.register` 的 path/method 不在清单 → `throw route-not-listed`；清单中不存在于代码 → `throw route-stale`（防漂移）。
4. **分级示例**（完整 43 行由 26-nov-security-fix 产出）：
   - L0：`GET /nano-model-selector/catalog`、`GET /nano-explorer-extra/status`、`POST /nano-notepad/read`（若最终按 Q3 归入 page-self，仅加固）。
   - L1：`POST /nano-explorer-extra/create-file|create-folder|rename|move|delete`（realpath 围栏后）、`POST /nano-notepad/save`（原生对话框）。
   - L2：`POST /nano-explorer-extra/commit|pull|checkout`（git）、`POST /nano-shared-workspace/tree/pull|push|materialize|ls|mkdir`、`POST /nano-notepad/fetch-mp|s3/object|s3/config`、`PUT /nano-shared-workspace/settings/update`（页面可写的身份写）、`GET/PUT /nano-model-selector/media-engine`（宿主状态文件写）。
   - L3：仅 operator Config 通道（无页面路由）。**（v1.1 更正：`/settings/update` 实为 `PUT`（`dsh-nano-shared-workspace/src/host/routes.js:154-155`）、且属页面可写的 L2 身份写、非 L3；`POST /nano-notepad/s3/config` 亦属 L2，已并入上条 L2 行、删除本行重复条目。）**
5. **CI 门禁**：`scripts/check-route-sensitivity.mjs` 比对代码注册与清单；`test:feature-contract` 同时锁定 path/method 不变。
6. **版本**：清单文件随 guard 包 0.1.0 发布；后续新增路由必须先改清单才能启动。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持逐条的必要性**：`dsh-nano-shared-workspace/src/host/routes.js:123-172` 的 `/settings` 三方法；`dsh-nano-notepad/index.js:63-66` 的 7 条路由常量；`dsh-nano-model-selector/index.js:210-245` 的 `/media-engine` GET/PUT。任何「按前缀/按方法」规则都会把这些混在一起。
- **支持代码生成的可行性**：explorer 的 `registerRoutes` 以 `Object.entries(routes)` 遍历（`dsh-nano-explorer-extra/src/host/routes.js:450-478`），shared-workspace 同样（`dsh-nano-shared-workspace/src/host/routes.js:481-509`）；notepad 是 4 段 `ctx.effect(() => ctx.webServer.register(...))`（`dsh-nano-notepad/index.js:236/256/276/299`），model-selector 是两个 `webServer.register`（`dsh-nano-model-selector/index.js:252-254`）。43 条可静态枚举。
- **反例 A**：`/settings` GET 返回 `maskedSecret`、`/settings/test` 做真实签名 LIST（`dsh-nano-shared-workspace/src/host/routes.js:123-153`）；同一默认会让「只读」路由也被加上凭证语义或反之。
- **反例 C**：`dsh-nano-notepad/index.js:60-61` 的 `SAVE_ROUTE` 与 `READ_ROUTE` 都是 POST；`dsh-nano-model-selector/index.js:210-245` 的 `/media-engine` GET 读、PUT 写。方法无法区分。

---

### Q6 — 远端数据 schema 的字段级规则与拒绝语义（**驱动真相：`T-O-5`（P0 remote-cross/remote→page）+ `T-O-6`（remote-data-schema）**）

- **影响范围**：notepad manifest/files/images 与 shared-workspace marker/meta/parts 的字段规则；`packages/dsh-remote-data-schema` 的 API 与测试；notepad `sync.js`/`db.js` 的消费点；shared-workspace `workspaces.js`/`session-io.js`/`tree.js`；同步错误 UI。
- **为什么必须确认**：Q4 已定 `dsh-remote-data-schema`，但未定字段级规则与失败语义。规则过严会拒绝历史合法数据（功能回退，违反 `T-O-3`）；过松则 `remote-cross`/`remote→page` 的 P0 不成立。必须明确「哪些字段必须存在/类型/上限/字符集」以及「失败时保留什么」。
- **当前建议 / 倾向**（`security-fix agent`）：**选 A**——严格整对象拒绝 + 保留最后好状态（fail-closed but non-destructive）：任一字段非法则整个 manifest/file/image/marker/session meta 拒绝进入页面/存储；客户端 `sync.cycle` 捕获并显示 error 状态（`dsh-nano-notepad/src/client/sync.js:239-251`），旧 IndexedDB 状态不变；shared-workspace 宿主同步记录并跳过该对象。
- **Reasoning**：字段级「丢弃非法字段、保留其余」会制造半坏对象（例如 manifest 缺 `sha256` 但保留 `id`），后续渲染/同步更难诊断，且攻击者可能利用仍被保留的字段；严格整对象拒绝 + 保留最后好状态是唯一可解释、可恢复的语义。配合 `schemaVersion` 与合法数据样本回归，可避免误伤。
- **问题（请业主裁决）**：**你是否确认 A：远端对象字段级严格校验，任一非法即整对象拒绝，客户端保留最后好状态并显示同步错误（不部分接受、不静默丢弃）？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 冻结为 T-O-8`。

**【对本问题的解读】**

1. **远端对象有四种**：notepad `manifest.json`、`files/<id>.md`、`images/<sha>`；shared-workspace `workspaces/<id>.json`（marker）、`sessions/<sid>/meta.json` + `body/*.part`、`tree/HEAD.json`。它们分别由 `dsh-nano-notepad/src/client/sync.js:57-76`、`:195-215`、`dsh-nano-shared-workspace/src/host/workspaces.js:103-130`、`dsh-nano-shared-workspace/src/host/session-io.js:199-281`、`dsh-nano-shared-workspace/src/host/tree.js:157-217` 消费。
2. **「严格」不是「尽可能多拒绝」**：合法用户数据必须通过；只拒绝不符合 schema 的对象。需要先采集现有合法样本（现有桶/测试 fixture）做兼容性回归。
3. **「保留最后好状态」**：notepad 客户端已有 `sync.cycle` 的 catch（`dsh-nano-notepad/src/client/sync.js:239-251`），可以直接复用；shared-workspace 宿主同步需要新增 try/catch，跳过恶意 marker/session，不影响其他工作区。

**【可选选项清单】**

| 选项 | 内容 | 功能影响 | 安全性 | 结论 |
|---|---|---|---|---|
| **A** | **严格整对象拒绝 + 保留最后好状态**：schema 失败即拒绝该对象，旧状态不变，UI 显示同步错误 | 合法数据不变；恶意对象被拒 | P0 链被切断 | **推荐** |
| **B** | **字段级部分接受**：丢弃非法字段，保留合法字段 | 可能产生半坏对象，渲染/同步异常 | 攻击者可能利用保留字段 | 不推荐 |
| **C** | **仅警告放行**：记录日志但继续使用 | 功能不变 | 等于不修 | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **schema 定义（v1）**：
   - **notepad manifest**：`{ schemaVersion:1, rev:int>0, files:{ [id]: { name:string(1..512, 无控制字符/路径分隔符), sha256:64hex, parentId?:string|null, workspaceId?:string|null, updatedAt?:number } }, images:{ [sha]: { byteLength:int 0..maxImageBytes } } }`；`id` 必须 `^[A-Za-z0-9_-]{1,128}$`。
   - **notepad file**：key `files/<id>.md` 的 `id` 必须与 manifest 的 id 匹配；body 为 UTF-8，大小 ≤ `maxFileBytes`（默认 2MiB，可由 L3 配置）。
   - **notepad image**：`{ mime: 'image/png'|'image/jpeg'|'image/gif'|'image/webp', base64:string(base64 charset, decodes to ≤ maxImageBytes), id?:uuid }`。
   - **shared-workspace marker**：`{ v:1, workspaceId:^[A-Za-z0-9_-]{1,128}$, name?:string, members:{ [memberKey]: { username:string, instance:string, localPath:string(绝对、规范化、无 `..`、≤4096) } } }`。
   - **session meta**：`{ formatVersion:1, committedBytes:int 0..maxCommittedBytes, writerId:string, ... }`；parts 每个 ≤64KiB，数量 ≤ ceil(committedBytes/64KiB)。
   - **tree HEAD**：`{ files:[{ rel:string(安全相对路径,无 `..`), sha256:64hex, size:int 0..maxFileBytes }] }`。
2. **校验点**：
   - notepad host `dsh-nano-notepad/src/host/s3-sync.js:231-250`：`op:'get'` 的 known key（`manifest.json`、`files/*`、`images/*`）返回前校验；`op:'put'` 前也校验（防止页面写入非法对象）。
   - shared-workspace `dsh-nano-shared-workspace/src/host/workspaces.js:103-130`（marker list）、`dsh-nano-shared-workspace/src/host/session-io.js:172-281`（push/pull meta/parts）、`dsh-nano-shared-workspace/src/host/tree.js:157-217`（HEAD/pull/push）。
3. **拒绝语义**：返回 `{ ok:false, reason:'schema', detail:'<field>' }`；notepad 客户端 `sync.cycle` 捕获（`dsh-nano-notepad/src/client/sync.js:239-251`）→ `onState({phase:'error', detail})`，IndexedDB 保持最后好状态；shared-workspace 宿主同步记录 warning 并跳过该对象，不影响其他对象。
4. **版本化**：所有对象带 `schemaVersion`/`v`；未知版本拒绝并提示升级；未来版本通过新 schema 版本 + 迁移函数，不做「静默兼容」。**历史对象缺失 `schemaVersion` 视为 v0**：按 v0 宽松规则读取并一次性补写（迁移期只读兼容，不对新写入放行 v0），避免已有合法数据被误拒。
5. **兼容性回归**：26-nov-security-fix 收集现有合法样本（本地测试 fixture + 现有桶导出）作为 `test/remote-schema/compat/`；所有样本必须通过；新增恶意样本（id 逃逸、mime 逃逸、深嵌套、超 committedBytes）必须被拒绝。
6. **配置**：`maxFileBytes`、`maxImageBytes`、`maxCommittedBytes` 作为 L3 `Config` 字段，默认值保守但可调；不改变现有 UI。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的消费链**：`dsh-nano-notepad/src/client/sync.js:57-76`（manifest JSON.parse）、`:195-215`（files/images 原样入 remotes）、`dsh-nano-notepad/src/client/db.js:648-683`（原样写 IDB）；`dsh-nano-shared-workspace/src/host/workspaces.js:103-130`（marker 直接 push）、`dsh-nano-shared-workspace/src/host/session-io.js:199/281`（committedBytes 决定请求数）、`dsh-nano-shared-workspace/src/host/tree.js:157-217`（rel 直接写文件）。这些正是 P0 的入口。
- **支持 A 的错误处理**：`dsh-nano-notepad/src/client/sync.js:239-251` 已有 `try/catch` + `onState({phase:'error'})`，可以直接承载 schema 拒绝，不需要改 UI。
- **反例 B**：`dsh-nano-notepad/src/client/db.js:655-665` 的 node 字段是成套使用的（id/name/parentId/workspaceId/draft），部分接受会生成缺字段节点，后续 `renderMarkdown`/tree 渲染报错；`dsh-nano-shared-workspace/src/host/session-io.js:199` 的 `committedBytes` 若被部分接受，parts 计算会错位。
- **反例 C**：不修即 `remote-cross` 仍成立（远端 marker 的 localPath/committedBytes 可直触发），`remote→page` 的 manifest id/mime 仍可注入。

---

### Q7 — HTML allowlist 的具体策略与双端共用（**驱动真相：`T-O-5`（remote→page）+ `T-O-6`（html-policy）**）

- **影响范围**：`packages/dsh-html-policy` 的元素/属性/scheme/style 策略；客户端 `sanitizeRichHtml`（`dsh-nano-notepad/src/client/markdown.js:179-246`）与宿主 `sanitizeMpHtml`（`dsh-nano-notepad/index.js:423-450`）；mp 文章、`.html` 草稿、同步图片的渲染；4 条 XSS + mp sanitize 的修复。
- **为什么必须确认**：Q4 已定「共享 HTML 策略」，但没定 allowlist。过严会剥掉 mp 文章的图片/样式/表格/代码块（功能回退）；过松则 `javascript:`、`<base>`、`<meta refresh>`、`<svg onload>` 等仍可执行（P0 不成立）。必须明确元素/属性/协议/样式四张清单与双端共用方式。
- **当前建议 / 倾向**（`security-fix agent`）：**选 A**——一套策略表 + 两个 renderer：`packages/dsh-html-policy` 导出 `ALLOWED_ELEMENTS/ALLOWED_ATTRS/ALLOWED_SCHEMES/ALLOWED_STYLE_PROPS` 与 `sanitizePolicy` 纯函数；客户端 DOM 渲染器与宿主 regex 渲染器都读取同一策略表；保留现有 mp 文章的图片/样式/表格/代码块/`data-src`/`foreignObject` 处理。
- **Reasoning**：当前是两套独立黑名单（`dsh-nano-notepad/src/client/markdown.js:179-246` 与 `dsh-nano-notepad/index.js:423-450`），任何一边漏掉就是 XSS；共享策略表能保证两边同步，同时保留渲染能力。纯客户端或纯宿主都不够：`.html` 草稿只走客户端，`fetch-mp` 响应只走宿主再到客户端，两边都需要。
- **问题（请业主裁决）**：**你是否确认 A：一套共享 allowlist 策略表 + 客户端 DOM renderer + 宿主 regex renderer，两者共用同一策略，只过滤活动内容、保留现有排版能力？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 冻结为 T-O-9`。

**【对本问题的解读】**

1. 现有渲染能力必须保留：mp 文章的 `<img data-src>` 懒加载、`<svg><foreignObject>` 图片滑块、`style` 白名单（`MP_SAFE_STYLE` `dsh-nano-notepad/src/client/markdown.js:248`、`MP_STYLE_ALLOW` `dsh-nano-notepad/index.js:397`）、表格/代码块/标题/列表等。
2. allowlist 不是「只留文本」：允许的元素/属性要覆盖上述能力；只删除活动内容（script/iframe/object/embed/base/meta/form/on*/javascript:/data:text 等）。
3. 宿主 regex 与客户端 DOM 的差异必须用同一策略表 + 同一测试语料对齐，否则会出现「客户端安全、宿主不安全」或反之。

**【可选选项清单】**

| 选项 | 内容 | 功能影响 | 安全性 | 结论 |
|---|---|---|---|---|
| **A** | **共享策略表 + 双 renderer（客户端 DOM + 宿主 regex）** | 保留全部现有渲染能力 | 两端同一策略，XSS 面收敛 | **推荐** |
| **B** | **仅客户端 DOM 清洗**：宿主不 sanitize，页面统一清洗 | 保留渲染 | `fetch-mp` 原始内容进入页面；`.html` 草稿路径多，漏一个 sink 就 XSS；宿主侧无防线 | 不推荐 |
| **C** | **仅宿主 regex 清洗**：客户端信任宿主 | 保留渲染 | `.html` 草稿/同步内容不经过 `fetch-mp`，宿主 regex 无法覆盖 DOM 语义；客户端多 sink 仍可被注入 | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **策略表**（`packages/dsh-html-policy/src/policy.js`）：
   - `ALLOWED_ELEMENTS`：`a, p, br, span, div, section, article, h1-h6, ul, ol, li, blockquote, pre, code, em, strong, b, i, u, s, del, ins, table, thead, tbody, tr, td, th, img, figure, figcaption, hr, svg, g, image, animateTransform`。
   - `ALLOWED_ATTRS`：`href, src, alt, title, colspan, rowspan, width, height, style, class, referrerpolicy, loading, decoding, preserveAspectRatio, xlink:href`。
   - `ALLOWED_SCHEMES`：`href` 仅 `https?:`；`src` 仅 `https?:` 或 `data:image/(png|jpeg|gif|webp);base64,`；禁止 `javascript:`、`data:text`、`vbscript:`、`file:`。
   - `ALLOWED_STYLE_PROPS`：复用现有 `MP_SAFE_STYLE`/`MP_STYLE_ALLOW` 的并集（`dsh-nano-notepad/src/client/markdown.js:248`、`dsh-nano-notepad/index.js:397`）；`position` 强制 `static`（同现有行为）。
   - 强制丢弃：`script, iframe, object, embed, base, meta, form, input, button, textarea, select, link, style` 元素；所有 `on*` 属性；`srcdoc`；`javascript:`/`data:text` URL。
2. **双 renderer**：
   - 客户端 `sanitizeRichHtml`：DOMParser 解析 → 按策略遍历节点/属性/样式 → 返回 `body.innerHTML`；保留现有 `data-src` 提升（`dsh-nano-notepad/src/client/markdown.js:188-191`）与 `foreignObject`→`<image>` 转换（`dsh-nano-notepad/src/client/markdown.js:195-223`）。
   - 宿主 `sanitizeMpHtml`：用策略表生成 regex/序列化器，执行元素剔除、属性白名单、style 过滤、`visibility:hidden`→`visible`（`dsh-nano-notepad/index.js:449-450`）；不引入 DOM 依赖。
3. **测试语料**：
   - 负向：复用审计的 `agents/v-mpsan/artifacts/battery-dom.txt` 与 `agents/v-richxss/artifacts/evidence.txt`（6 个 javascript: 变体、meta refresh、base、style、form、object、link、svg/onload 等）。
   - 正向：构造/保留真实 mp 文章结构的 synthetic fixture（`data-src`、foreignObject、table、pre/code、style 白名单）——必须渲染结果与当前实现一致（快照对比）。
4. **接线**：`dsh-nano-notepad/src/client/markdown.js:179` 与 `dsh-nano-notepad/index.js:423` 改为读取 `dsh-html-policy`；两处函数签名不变，调用方不改。
5. **验收**：负向语料 0 执行（document.title 无 mark、无导航）；正向快照与现状一致；所有既有 mp 文章渲染 smoke 通过（不改变用户可见排版）。
6. **版本**：`dsh-html-policy` 0.1.0；notepad patch/minor 版本，不升 major。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的现状双实现**：`dsh-nano-notepad/src/client/markdown.js:179-246` 的 `sanitizeRichHtml`（DOMParser + 黑名单）与 `dsh-nano-notepad/index.js:423-450` 的 `sanitizeMpHtml`（regex + 黑名单）是两套独立规则；`MP_SAFE_STYLE`（`dsh-nano-notepad/src/client/markdown.js:248`）与 `MP_STYLE_ALLOW`（`dsh-nano-notepad/index.js:397`）已经重复维护。
- **支持现有渲染能力**：`dsh-nano-notepad/src/client/markdown.js:188-191` 的 `data-src` 提升、`dsh-nano-notepad/src/client/markdown.js:195-223` 的 `foreignObject`→`<image>`、`dsh-nano-notepad/src/client/markdown.js:248` 的样式白名单；`dsh-nano-notepad/index.js:429-430` 的 `data-src` 提升、`dsh-nano-notepad/index.js:449-450` 的 `visibility:hidden`→visible。这些必须在共享策略中保留。
- **支持多 sink**：`dsh-nano-notepad/src/client/panel.js:1342`（rich preview innerHTML）、`:1371`（markdown render innerHTML）都调用 `sanitizeRichHtml`/渲染结果；只改一个不够。
- **反例 B（仅客户端）**：`dsh-nano-notepad/index.js:333` 起的 `fetchMpArticle` 在宿主抓取并 `sanitizeMpHtml` 后返回；若不修宿主函数，任何 `fetch-mp` 消费者都拿到未消毒 HTML；且 `panel.js` 多个 innerHTML sink 不能保证都清洗。
- **反例 C（仅宿主）**：`.html` 草稿通过 `dsh-nano-notepad/src/client/sync.js:195-215` 进入 IndexedDB，再由 `dsh-nano-notepad/src/client/panel.js:1342` 渲染，不经过 `fetch-mp` 的宿主 sanitizer；仅宿主 regex 无法覆盖客户端渲染路径。

---

## 7. ★ 中场评估 III（Round 3 → Round 4）

### 7.1 对 Round 3 的判定

- **Q5 已决断**：业主选 B，43 条路由逐条敏感度清单 + guard 强校验；无遗留。
- **Q6 已决断**：业主选 A，严格整对象拒绝 + 保留最后好状态；无遗留。
- **Q7 已决断**：业主选 A，一套共享 allowlist + 双 renderer；无遗留。
- **最关键的一手**：Q5 拒绝「按插件/按方法」的偷懒分级——同一 `/settings`、`/s3/*`、`/media-engine` 下语义完全不同；逐条 43 行清单是 guard 能成立的前提。

### 7.2 本轮已锁定真相

- `T-O-7`：43 条路由逐条敏感度清单（详见 §1.7）。
- `T-O-8`：严格整对象拒绝 + 保留最后好状态 + v0 历史兼容（详见 §1.8）。
- `T-O-9`：共享 allowlist + 双 renderer + 保留现有渲染（详见 §1.9）。

### 7.3 诚实反方制衡

1. **43 行清单会随代码演进变旧**：必须由 `registerRoutes`/`ROUTE` 常量生成并在 CI 比对；否则新路由绕过或旧条目失效。
2. **严格 schema 对历史桶数据有真实风险**：v0 只读兼容与一次性补写必须先在生产数据副本上演练；否则可能让用户升级后看不到旧笔记。
3. **共享 HTML 策略可能改变极端文章的渲染**：allowlist 需要以现有 mp 文章快照做正向回归；否则修复 XSS 可能以排版回退为代价。
4. **三包之间版本耦合**：guard/schema/html-policy 任一升级需联动四插件；26-nov-security-fix 必须给出兼容矩阵与独立可回滚点。

### 7.4 为什么提出 Round 4（注入 Q8–Q10，及各自驱动的 T-O）

- Round 3 已把「三个包怎么实现」钉死；剩余的是**执行编排与范围收口**：
  - **Q8**：P0 修复（13 条）如何分批、功能合同与验收门禁如何设、发布版本怎么定。→ 驱动 `T-O-3`/`T-O-5`/`T-O-6`。
  - **Q9**：P2（`page-self` + 本地凭据/调试面）逐项「低成本加固 vs 接受」的清单与监控。→ 驱动 `T-O-3`/`T-O-4`/`T-O-5`。
  - **Q10**：审计中的 local-supply 两条（esbuild、release untracked）如何修复，是否影响功能。→ 驱动 `T-O-3` 与长期治理原则。

- **收口判断（已完成）**：24 条 confirmed 在 Round 4 的三题中已全部有归属——P0 13 条（Q8）、P2 8 条 + 本地凭据 1 条（Q9）、local-supply 2 条（Q10）= 24。Q8–Q10 已按推荐通过（Q8=B、Q9=B、Q10=A），**执行层真相全部冻结，Round 4 即完成收口，不需要 Round 5**。

---

## 8. Round 4 —— executional（`Q8–Q10`）

> 本轮 second-opinion 模式：`waived`。三题分别由 `T-O-3`/`T-O-5`/`T-O-6`（Q8）、`T-O-3`/`T-O-4`/`T-O-5`（Q9）、`T-O-3`（Q10）驱动。

### Q8 — P0 修复的批次、功能合同与发布门禁（**驱动真相：`T-O-3` + `T-O-5` + `T-O-6`**）

- **影响范围**：13 条 P0（`remote-cross` 7 条 + `remote→page`/`remote→agent` 6 条）的修复顺序；四插件 release 版本；CI 门禁；`security/feature-contract.json`；26-nov-security-fix 的批次与验收。
- **为什么必须确认**：P0 数量多、跨四个插件与三个共享包，且修复必须零功能回退。若不先定批次与门禁，可能出现「先改渲染导致旧数据不可读」「先上 schema 导致同步 UI 报错」等返工；也可能一次性大爆炸发布，出问题无法定位。必须锁定：批次顺序、每批门禁、发布粒度、回滚方式。
- **当前建议 / 倾向**（`security-fix agent`）：**选 B**——内部四批、每批独立门禁，最终每个插件一次 minor 发布（不拆多次用户可见发布）：
  1. **Batch 0（基础，零行为）**：guard 包 + `route-sensitivity.json` + `feature-contract.json` 基线 + CI。
  2. **Batch 1（P0 host-data，7 条）**：shared-workspace 的 `remote-cross` 6 条 + `nano-notepad/fetch-mp-redirect-ssrf`（远程文章 30x）——schema/身份绑定/限额；不改 UI。
  3. **Batch 2（P0 content-render，6 条）**：`sanitizeMpHtml`、`sanitizeRichHtml`、manifest/image XSS、`validateJson` DoS、imagine 模板注入；只加清洗/转义/转义。 
  4. **Batch 3（P2 与 local-supply）**：按 Q9/Q10 的清单执行。
  - 每个插件最终只发一个 minor 版本（notepad 0.1.1→0.1.2 或 0.2.0；其余同理）；内部批不单独发版。
- **Reasoning**：先建立「零行为」的 guard/contract 基线，后续每批才有可验证的功能合同；host-data 先于 content-render，因为 XSS 是放大器而 host-data 是根入口；P2/local-supply 最后，避免阻塞 P0。单次用户可见发布减少版本碎片，符合「能硬切就不要双写」。
- **问题（请业主裁决）**：**你是否确认 B：内部四批（基础 → P0 host-data → P0 content-render → P2/local-supply），每批独立门禁，每个插件最终只发一次 minor 版本？**
- **业主回答**：`✅ 已确认：选 B（与推荐一致）→ 冻结为 T-O-10`。

**【对本问题的解读】**

1. **P0 清单（13 条）**：

| # | 指纹 | 主代码位置 | 批次 |
|---|---|---|---|
| 1 | `nsw:acquireClaim-rmw-no-cas` | `dsh-nano-shared-workspace/src/host/session-io.js:134-146` | Batch 1 |
| 2 | `nsw:matchWorkspace-member-localPath-session-exfil` | `dsh-nano-shared-workspace/src/host/workspaces.js:120-130` | Batch 1 |
| 3 | `nsw:materialize-sessionId-path-traversal` | `dsh-nano-shared-workspace/src/host/session-io.js:326` | Batch 1 |
| 4 | `nsw:remote-member-localPath-arbitrary-fs-write` | `dsh-nano-shared-workspace/src/host/tree.js:157-217` | Batch 1 |
| 5 | `nsw:remote-meta-unbounded-fetch-decompress` | `dsh-nano-shared-workspace/src/host/session-io.js:199`、`:281` | Batch 1 |
| 6 | `nsw:workspaceId-join-s3key-traversal` | `dsh-nano-shared-workspace/src/host/workspaces.js:87`、`dsh-nano-shared-workspace/src/host/session-io.js:133` | Batch 1 |
| 7 | `nano-notepad/fetch-mp-redirect-ssrf` | `dsh-nano-notepad/index.js:336-340` | Batch 1 |
| 8 | `nano-notepad/sanitizeMpHtml-active-content` | `dsh-nano-notepad/index.js:423-450` | Batch 2 |
| 9 | `notepad:sanitizeRichHtml-keeps-js-href-active-dom` | `dsh-nano-notepad/src/client/markdown.js:179-246` | Batch 2 |
| 10 | `notepad:sync-manifest-id-unescaped-attr-xss` | `dsh-nano-notepad/src/client/sync.js:195-215` → `dsh-nano-notepad/src/client/db.js:655-665` | Batch 2 |
| 11 | `notepad:sync-remote-image-mime-unescaped-attr-xss` | `dsh-nano-notepad/src/client/markdown.js:148` → `dsh-nano-notepad/src/client/panel.js:1371` | Batch 2 |
| 12 | `notepad:validateJson-unbounded-depth-RangeError-DoS` | `dsh-nano-notepad/src/client/json.js:15-126`、`dsh-nano-notepad/src/client/sync.js:198` | Batch 2 |
| 13 | `hunter-e:imagine-template-shell-injection` | `dsh-nano-model-selector/lib/host-media.js:40` | Batch 2 |

2. **每批门禁**：`test:feature-contract`（无 path/method/UI/存储变化）、`test:security-regression`（本批 P0 PoC 失败）、`test:smoke`（四插件核心功能）、`npm run build` 产物校验。全部通过才进入下一批。
3. **发布**：每个插件最终只发一个 minor 版本；release note 按「功能无变化 + 安全加固」表述；不提供关闭开关；回滚仅回退版本（无数据迁移，回滚安全）。
4. **26-nov-security-fix 交付**：Batch 0–3 的任务表、每批负责人/预估、门禁脚本、发布 checklist、回滚步骤。

**【可选选项清单】**

| 选项 | 内容 | 优点 | 缺点 / 反例 | 结论 |
|---|---|---|---|---|
| **A** | **一次性大爆炸**：所有 P0/P2 同时改、同时发 | 只发一次 | 出问题无法定位批次；P0 host-data 与 content-render 互相掩盖；功能回归难以归因 | 不推荐 |
| **B** | **内部四批 + 每插件一次 minor** | 可定位、可回滚；功能合同每批验证；发布碎片少 | 需要 CI 门禁与批次管理 | **推荐** |
| **C** | **按批发布（每批一个版本）** | 每批可独立回滚 | 版本碎片多，用户升级负担；与「功能不变」的沟通复杂 | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 B）

1. **Batch 0（基础）**：先落 `packages/dsh-host-route-guard` 0.1.0、`security/route-sensitivity.json`（43 行，Q5）、`security/feature-contract.json`（43 条路由 + UI 入口 + 数据位置）；四插件切换到 guard，行为不变；CI 三脚本上线。门禁：feature-contract 通过、所有现有 smoke 通过。
2. **Batch 1（P0 host-data）**：`dsh-remote-data-schema` 先接 `dsh-nano-notepad/src/host/s3-sync.js:231-250` 与 shared-workspace 的 `dsh-nano-shared-workspace/src/host/workspaces.js:103-130`、`dsh-nano-shared-workspace/src/host/session-io.js:172-281`、`dsh-nano-shared-workspace/src/host/tree.js:157-217`；修复 7 条（表 1–7）；不改 UI、不改 join/pull/push 流程。门禁：fake S3 恶意对象被拒 + 正常对象通过 + shared-workspace 全功能 smoke。
3. **Batch 2（P0 content-render）**：`dsh-html-policy` 接 `dsh-nano-notepad/src/client/markdown.js:179`/`dsh-nano-notepad/index.js:423`；修复 6 条（表 8–13）；门禁：负向 XSS 语料 0 执行 + 正向文章快照一致 + notepad 渲染 smoke。
4. **Batch 3（P2/local-supply）**：按 Q9 的 accepted/加固清单与 Q10 的 build/release 清单执行；门禁：P2 记录仍为 accepted（不强制 PoC 失败）、供应链 clean checkout 可重建。
5. **发布**：四插件各一个 minor（notepad/model-selector/explorer 0.1.1→0.2.0；shared-workspace 0.1.0→0.2.0 或 patch，由 26-nov-security-fix 按变更面定）；三包 0.1.0；同一天发布，release note 统一。
6. **回滚**：无数据迁移（T-O-8 的 v0 兼容只读不写），回滚 = 安装前一版本；`security/feature-contract.json` 保留为回归基线。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持分批的必要性**：13 条 P0 分布在 4 个插件与 3 个包（`findings.json`），且 `dsh-nano-shared-workspace` 的 `dsh-nano-shared-workspace/src/host/tree.js:157-217` 与 `dsh-nano-notepad/src/client/sync.js:195-215` 是不同进程/语言路径；同批修改无法用一套测试覆盖。
- **支持「先 host-data 后 content-render」**：`dsh-nano-notepad/src/client/sync.js:195-215` 的 XSS 是远程内容进入页面的放大器；若先修渲染而 host 仍把恶意 manifest 写入 IndexedDB（`dsh-nano-notepad/src/client/db.js:648-683`），XSS 仍可能通过其他 sink 复现；先修 host-data 可从源头减少。
- **反例 A**：一次大爆炸会让 `feature-contract` 无法区分「哪批导致回归」；且 `dsh-nano-shared-workspace` 的 `materialize`/`tree` 修复与 notepad 的 HTML 清洗无共享测试夹具。
- **反例 C**：每批一个版本会让用户多次升级；且 Q5 的 route-sensitivity 与 Q6 schema 都属于内部基础件，单独发布没有用户价值。

---

### Q9 — P2 `accepted-local-self-impact` 清单、低成本加固与监控（**驱动真相：`T-O-3` + `T-O-4` + `T-O-5`**）

- **影响范围**：8 条 `page-self` + `hunter-e:grok-creds-workspace-copy`（共 9 条）的逐项处置；`security/accepted-risks.json`；发布说明；后续复发监控。
- **为什么必须确认**：`T-O-5` 只说「page-self 只做不改变功能的加固，其余登记 accepted」，但没定逐项清单。没有逐项决定，26-nov-security-fix 要么过度加固导致功能回退，要么漏登记导致审计发现被当成「已修复」。必须锁定：哪些做低成本加固、哪些纯接受、接受如何监控。
- **当前建议 / 倾向**（`security-fix agent`）：**选 B**——逐项「能零成本加固就加固，改动功能就接受」；完整清单入 `security/accepted-risks.json`，每次 release 前复核。
- **Reasoning**：P2 是本地同用户自影响，安全收益有限；但有些加固（路径 realpath 围栏、`.git` 拒绝、sync SKIP）不改变正常用户行为，应顺手做掉；涉及删除 `allowOutsideWorkspace`、限制 `/s3/config` endpoint、迁移数据位置的，坚决不做，登记接受。这样既最大化安全收益，又守住 `T-O-3`。
- **问题（请业主裁决）**：**你是否确认 B：P2 逐项按「零成本加固优先、改变功能则接受」处理，并接受清单与监控登记？**
- **业主回答**：`✅ 已确认：选 B（与推荐一致）→ 冻结为 T-O-11`。

**【对本问题的解读】**

1. `page-self` 的 9 条来自 `T-O-5`：`nxe:routes-read-arbitrary-file`、`notepad:read-arbitrary-md-read`、`nsw:ls-mkdir-any-absolute-path`、`nxe:mutate-symlink-escape`、`nxe:git-config-filter-exec`、`nxe:perf-review-window-drain`、`nxe:scopeof-cross-session`、`nano-notepad/s3-config-endpoint-ssrf`、`hunter-e:grok-creds-workspace-copy`（`hunter-e:imagine` 已归 P0）。
2. **「零成本」的判据**：合法用户路径不变、无新增步骤、无数据位置变化、无性能下降；只拒绝恶意/越界输入。凡不满足者 → accepted。
3. **accepted 不是「不修」**：每条要写「现有功能依赖、为何接受、可选加固、复发监控」；发布说明中列为已知本地自影响，不写成已修复。

**【可选选项清单】**

| 选项 | 内容 | 功能影响 | 安全性 | 结论 |
|---|---|---|---|---|
| **A** | **全部 accepted，不做任何改动** | 零 | 最低 | 不推荐（有零成本加固机会） |
| **B** | **逐项：零成本加固 + 其余 accepted** | 零 | 有边界加固 | **推荐** |
| **C** | **全部按审计原方案修** | 有（删除/限制现有功能） | 最高 | 违反 `T-O-3`，不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 B）

1. **逐项清单（初版，26-nov-security-fix 复核）**：

| 指纹 | 处置 | 具体动作 | 功能影响 |
|---|---|---|---|
| `nxe:mutate-symlink-escape` | 加固 | 五个变更路由在操作前 `realpath` 并拒绝越出 workspace root 的目标（`dsh-nano-explorer-extra/src/host/routes.js:297-370`） | 合法工作区内符号链接不受影响；指向外部的链接被拒（边缘行为变化，登记） |
| `nxe:git-config-filter-exec` | 加固 | 变更路由拒绝 `<root>/.git` 及子路径；`git add --all` 前检查（`dsh-nano-explorer-extra/src/host/git.js:424-429`） | 不能经 sidebar 编辑 .git（非用户功能） |
| `hunter-e:grok-creds-workspace-copy` | 加固 | 在 `.gitignore` 增加 `imagine/.grok/`；shared-workspace `SKIP` 增加 `imagine`（`dsh-nano-shared-workspace/src/host/tree.js:11-51`） | 不改执行流程，仅阻止提交/同步 |
| `nxe:scopeof-cross-session` | 加固（日志） | 对非当前会话的 scopeOf 结果记录警告（不阻断） | 零 |
| `nxe:routes-read-arbitrary-file` | 接受 | 保留 `allowOutsideWorkspace` 功能；记录 accepted | 零 |
| `notepad:read-arbitrary-md-read` | 接受 | 保留任意 md 读取；记录 accepted | 零 |
| `nsw:ls-mkdir-any-absolute-path` | 接受 | 保留任意绝对路径选择；记录 accepted | 零 |
| `nano-notepad/s3-config-endpoint-ssrf` | 接受 | 保留自定义 endpoint；记录 accepted | 零 |
| `nxe:perf-review-window-drain` | 接受 | 保留 lab `mode=window`；记录 accepted | 零 |

2. **`security/accepted-risks.json` 字段**：`fingerprint / 主体 / 现有功能 / 接受理由 / 可选加固 / 监控方式 / owner 签字 / 复核日期`。
3. **监控**：每次 release 前跑 `test:security-regression` 的 P2 子集，确认行为仍为本地自影响；记录「未新增远程触发路径」；新插件/新路由若改变主体则升级为 P0 复审。
4. **发布说明**：P2 accepted 项列入「已知本地风险」章节，不写「已修复」。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 realpath 加固不改变正常功能**：`dsh-nano-explorer-extra/src/host/routes.js:297-370` 的 create/rename/move/delete 都以 `root` 为基准；正常路径不经过 symlink 时 realpath 结果不变。
- **支持 `.git` 拒绝**：`dsh-nano-explorer-extra/src/host/git.js:424-429` 的 `git add --all` 只在 .git 被写入后被利用；侧栏本就不是给用户编辑 `.git` 的功能。
- **支持 `.gitignore`/SKIP 加固**：`dsh-nano-notepad/src/host/s3-sync.js:37-40` 的 cp 是固定路径；`dsh-nano-shared-workspace/src/host/tree.js:11-51` 的 SKIP 集合是集中过滤点，加入 `imagine` 即可阻止上传，不影响本地文件。
- **反例 A（全接受）**：`nxe:mutate-symlink-escape` 与 `nxe:git-config-filter-exec` 的加固是零功能成本的；全接受会放弃免费的安全收益。
- **反例 C（全修）**：`nxe:routes-read-arbitrary-file` 的 `allowOutsideWorkspace` 与 `nano-notepad/s3-config-endpoint-ssrf` 的自定义 endpoint 是现有 UI 功能；删除/限制会让用户无法在侧栏打开工作区外文件、无法连接自建 MinIO/S3——违反 `T-O-3`。

---

### Q10 — 供应链与发布链：esbuild 固定与未跟踪产物治理（**驱动真相：`T-O-3` + 长期治理原则**）

- **影响范围**：四个 `build-client.mjs` 的 esbuild 解析；`package-lock.json`；`package.json files`；`release.md`；`.github/workflows`；`dsh-plugins/esbuild-npx-unpinned` 与 `dsh-plugins/release-untracked-artifacts` 两条 medium。
- **为什么必须确认**：这两条不在 P0/P2 三桶内（属 local-supply），但审计已确认；若不处置，供应链完整性缺口仍在。修复不涉及运行时功能，适合在 Batch 3 一并做。需要锁定：是否移除 npx 回退、是否提交全部未跟踪源、是否补 CI/attestation。
- **当前建议 / 倾向**（`security-fix agent`）：**选 A**——完整修复：
  1. 四个 `build-client.mjs` 删除 `npx --yes esbuild@0.25.0` 回退；本地 `node_modules/.bin/esbuild` 缺失时直接报错并提示 `npm ci`。
  2. 把 `lib/s3-sync-host.js`、`packages/dsh-s3-client/`、`src/client/{sync,cloud-settings}.js`、`packages/dsh-nano-ui/src/tabs.js` 等全部提交入库（当前 untracked）。
  3. 补 release CI（`v*` tag 触发 `npm ci && npm run build && npm pack`，clean-lib 检查 + `SHA256SUMS`/attestation），对应 `release.md:42`/`:170` 的承诺。
- **Reasoning**：两条 medium 的修复没有运行时功能影响；且是「能硬切就不要双写、能彻底退役就不要提供兼容」的直接落地——移除 npx 回退、提交源文件、补 CI，不保留旁路。若只加 digest 或只提交部分文件，缺口仍在。
- **问题（请业主裁决）**：**你是否确认 A：删除 npx 回退、提交全部随包源文件、补 release CI（clean-lib + SHA256/attestation）？**
- **业主回答**：`✅ 已确认：选 A（与推荐一致）→ 冻结为 T-O-12`。

**【对本问题的解读】**

1. `dsh-plugins/esbuild-npx-unpinned`：四个 `build-client.mjs` 在本地 esbuild 缺失时执行 `npx --yes esbuild@0.25.0`，npx 不读 lockfile，无完整性校验；修复是删回退、强制 `npm ci` 后用本地 pinned esbuild。
2. `dsh-plugins/release-untracked-artifacts`：`lib/s3-sync-host.js` 等生成物/源文件未入库，`lib/client.js` 脏；无 CI，`release.md` 的 trust chain 只是文档；修复是提交源文件、CI 重建、clean-lib gate。
3. 这两条不影响用户可见功能，唯一影响是构建/发布流程；可安全纳入 Batch 3。

**【可选选项清单】**

| 选项 | 内容 | 功能影响 | 安全性 / 可维护性 | 结论 |
|---|---|---|---|---|
| **A** | **完整修复**：删 npx 回退 + 提交全部源 + CI/attestation | 无 | 供应链闭环 | **推荐** |
| **B** | **只做 digest 校验**：保留 npx，但校验 sha512 | 无 | 仍依赖 registry、版本漂移；未解决未跟踪产物 | 不推荐 |
| **C** | **延后** | 无 | 两个 medium 长期悬挂；违反长期治理 | 不推荐 |

**【推荐选项的详细执行说明】**（推荐选项 A）

1. **esbuild**：四个 `build-client.mjs`（`dsh-nano-notepad/scripts/build-client.mjs:25`、`dsh-nano-model-selector/scripts/build-client.mjs:21`、`dsh-nano-explorer-extra/scripts/build-client.mjs:26`、`dsh-nano-shared-workspace/scripts/build-client.mjs:26`）改为：`const local = join(root,'node_modules','.bin','esbuild'); if (!existsSync(local)) { console.error('run npm ci first'); process.exit(1) }`；删除 `npx` 分支；`release.md` 的构建步骤加 `npm ci`。
2. **提交未跟踪源（v1.1 更正：已完成大半）**：上述文件及 `lib/` 产物在 `350c6c8` 已入库；本步改为「CI 校验随包源与产物均已提交 + `git status` 清洁后才能打包」的**防回归**门禁，而非一次性 `git add`。
3. **CI**：新增 `.github/workflows/release.yml`（或仓库实际 CI）：checkout tag → `npm ci` → `npm run build` → `git diff --exit-code -- lib/`（或重建哈希比对）→ `npm pack` → `SHA256SUMS` + `actions/attest-build-provenance`（或 cosign keyless）。
4. **发布门禁**：`npm pack --dry-run --json` 的文件列表必须与 `package.json files` 一致；`lib/` 必须由当前源重建；无未跟踪文件；版本号与 tag 一致。
5. **版本**：四个插件 patch/minor 版本；三包 0.1.0；不改变 `dsh.bundle.patch`/`dsh.client`/`files` 结构。
6. **26-nov-security-fix 交付**：修改四个 build 脚本、提交清单、CI YAML、发布 checklist、clean-checkout 重建测试。

**【推荐选项的支持证据 / 其他选项的反例】**

- **支持 A 的 esbuild 现状**：四个 build 脚本的 npx 行（`dsh-nano-notepad/scripts/build-client.mjs:25`、`dsh-nano-model-selector/scripts/build-client.mjs:21`、`dsh-nano-explorer-extra/scripts/build-client.mjs:26`、`dsh-nano-shared-workspace/scripts/build-client.mjs:26`）；四个包都有 `package-lock.json`，npx 不读取它。
- **支持 A 的未跟踪现状（v1.1 更正）**：`dsh-nano-notepad/package.json:26` 的 `files` 含 `lib/s3-sync-host.js`、`dsh-nano-notepad/index.js:5` 导入它；撰写时 `git ls-files` 显示未跟踪、且 `panel.js:34` 的 `nanoTabs` 只存在于工作区 `packages/dsh-nano-ui/src/tabs.js`——**此状态在 `350c6c8` 已修复**：这些源与 `lib/` 产物现均已入库。故本项保留为「为何当时需要补 CI/入库门禁」的历史证据；当前剩余工作见 §1.12-2。
- **支持 A 的 CI 缺失**：`release.md:42` 描述本地 `npm run build` + `npm pack`；`release.md:170` 要求「all artifacts must come from CI」，但仓库无 `.github/workflows/`（此前审计已核）。
- **反例 B**：digest 校验只能保证 npx 拉到的字节与某个哈希一致，但 npx 仍绕过 lockfile、仍可能在构建时联网；且未跟踪产物/无 CI 的 provenance 问题完全没解决。
- **反例 C**：两个 medium 属长期治理缺口；延后会让每次发布都重复「tag 不可重建」的风险。

---

## 9. 收口（全轮冻结）

### 9.0 冻结前审计（STEP.1 结果）

- **内部冲突（已修复）**：
  1. `T-O-1` 原文「page/remote-* 一律进入修复清单」与 `T-O-5` 的 P2 接受口径冲突 → 改为「进入处置清单（P0 必修 / P2 加固或接受）」。
  2. 历史 Q2 的「L2 硬退役」与 `T-O-3`（功能零回退）冲突 → 在 Q2 顶部加 v0.5 修订注记，`T-O-2` 仅保留敏感度分级。
  3. §9 旧文案「每条 L2 的退役方式」与 v1.0 冲突 → 改为「每条 L2 的加固方式」。
- **欠更新（已修复）**：文档状态 `draft` → `frozen`；Round 4 状态 `进行` → `已冻结`；Q8–Q10 业主义务回答已补录（B/B/A）；`T-O-10/11/12` 已补入台账与 §1.10–§1.12。
- **欠登记（已修复）**：P0 13 条、P2 9 条、local-supply 2 条全部在 Q8/Q9/Q10 中逐条登记；24/24 覆盖。
- **竞态检查**：Q1–Q10 单线程顺序决断，无并发轮次；T-O 编号不重用；无重复/冲突 owner 答复；无未冻结题。
- **结论**：无残留内部冲突、无竞态、无欠登记；满足全轮冻结条件。

**冻结状态：`frozen`**（v1.0，2026-11-11）。本文件作为安全修复执行层的单一真源，后续 26-nov-security-fix 直接引用，不再新增方向性真相。

### 9.0a v1.1 errata（冻结后 file:line 级核查修订）

> 业主指令做跨 plugin、`file:line` 级联级核查（宿主与浏览器两面），对已冻结文档中的**事实性错误与陈旧引用**做完全 coherent 修订。T-O-1–T-O-12 的**决策未改动**；修订分三类逐条登记如下。

**A. 代号更正**
- `MS01` → `26-nov-security-fix`（46 处；下游阶段代号统一，见文档头「下游消费者」与各处）。

**B. 事实性错误更正**

| # | 位置 | 原文 | 更正为 | 证据 |
|---|---|---|---|---|
| B1 | Q5 分级示例 | `POST /nano-shared-workspace/settings/update` 且列 L3 | `PUT` 方法、且属页面可写 **L2**（身份写），移入 L2 行 | `dsh-nano-shared-workspace/src/host/routes.js:154-155` |
| B2 | Q5 分级示例 | `POST /nano-notepad/s3/config` 同列 L2 与 L3 两处 | 仅保留 L2 一处；L3 行改为「无页面路由」 | `dsh-nano-notepad/index.js:66`、`§1.7` 每 path+method 一行 |
| B3 | §2.0 检索清单 | 写入 `~/nano-notepad-s3.json` | `${DSH_HOME}/nano-notepad-s3.json`（0600） | `dsh-nano-notepad/AGENTS.md` 前置第 7 条 |
| B4 | §1.12 / Q10 | 「提交全部未跟踪随包源」为待办 | 已于 `350c6c8` 入库；改为「CI 校验已提交」防回归 | `git ls-files` 实测 |
| B5 | §1.7 / T-O-7 | guard「启动时读 `security/route-sensitivity.json`」 | repo 根文件运行时不可达；清单以**构建期 JS 常量**打进产物 | `T-O-13`；三处 build 注释「copies lib/ but not node_modules」 |

**C. 新增执行真相（append-only）**

| # | Truth-ID | 内容 |
|---|---|---|
| C1 | `T-O-13` | 共享包分发通道：`devDependencies` + `lib/` bundle + 清单生成 JS 常量（§1.13） |
| C2 | `T-O-14` | 回归门禁三件套：feature-contract 逐字段、存量桶全量回归、行为变化显式登记（§1.14） |

**D. 澄清（不改决策）**
- `/s3/object` 的 `put`/`get` 校验不对称：`put` 任意 `key`，schema 仅作用于 `get` 的 known-key 形态（§1.8-4）。
- 三包的 `file:` 依赖声明位置改为 `devDependencies`（§1.6-2，配合 `T-O-13`）。

### 9.1 全部 Truth-Gate 清单

| Truth-ID | 主题 | 状态 |
|---|---|---|
| `T-O-1` | 页面脚本主体模型（经 T-O-4/T-O-5 校准处置强度） | `frozen` |
| `T-O-2` | L0/L1/L2/L3 敏感度分级（原 L2 硬退役被 T-O-3 取代） | `frozen` |
| `T-O-3` | 功能零回退（业主变更令） | `frozen` |
| `T-O-4` | 本地威胁模型（本地单用户 / loopback / 无公网） | `frozen` |
| `T-O-5` | P0 `remote-cross`/`remote→page`、P2 `page-self` 三桶分诊 | `frozen` |
| `T-O-6` | 三共享包加固架构（guard/schema/html-policy，不迁移/不删除） | `frozen` |
| `T-O-7` | 43 条路由逐条敏感度清单 + guard 强校验 | `frozen` |
| `T-O-8` | 远端数据严格整对象拒绝 + 最后好状态 + v0 兼容 | `frozen` |
| `T-O-9` | 共享 HTML allowlist + 双 renderer | `frozen` |
| `T-O-10` | P0 内部四批 + 每批门禁 + 每插件一次 minor 发布 | `frozen` |
| `T-O-11` | P2 逐项零成本加固/接受 + `accepted-risks.json` + 监控 | `frozen` |
| `T-O-12` | 供应链完整修复（npx 移除 + 源入库 + CI/attestation） | `frozen` |
| `T-O-13` | 共享包分发通道（devDeps + `lib/` bundle + 清单生成常量） | `frozen`（v1.1 errata 追加） |
| `T-O-14` | 回归门禁三件套（feature-contract 逐字段 / 存量回归 / 行为变化登记） | `frozen`（v1.1 errata 追加） |

### 9.2 覆盖核对

- **24 条 confirmed 全覆盖**：Q8 P0 13 条（remote-cross 7 + remote→page/agent 6）+ Q9 P2 8 条 + 本地凭据 1 条 + Q10 local-supply 2 条 = **24/24**，无遗漏、无重复。
- **10 条 rejected**：不进入修复清单；其拒绝理由见 `docs/code-review/26-nov/security-audit.md` §7.1 与 `findings.json`。
- **无 OPEN 残题**：所有 Q1–Q10 已由业主决断；P2 接受项已在 `security/accepted-risks.json` 登记口径中定义。
- **无内部冲突**：T-O-2 的 L2 硬退役已被 T-O-3 取代；T-O-1 的「一律进入修复清单」已校准为「进入处置清单（P0/P2）」；Q1/Q2 历史原文已加 v0.5 校准注记。

### 9.3 交接

- **冻结判据**：§1 Truth-Gate 全部 `T-O` 冻结；无 OPEN 残题；四层敏感度清单、各 L2 的加固方式、守卫载体与三包架构均已定稿。
- **下游**：`26-nov-security-fix` 执行计划 / todo，按 T-O-10 的四批、T-O-11 的 P2 清单、T-O-12 的 build/release 改造逐项展开，并以 T-O-13 的包分发通道、T-O-14 的回归门禁为执行前提；26-nov-security-fix 不得绕开本文另立口径。
- **变更控制**：本文件冻结后，任何新功能/新路由/新 finding 需新开 QNA campaign 或在本文追加 `T-O-13+` 修订；不得静默修改已冻结真相。

---

## 10. 使用约束

- 本文件是**唯一真源**：业主只在本文件填写「业主回答」；后续引用一律以 `Q编号 + 业主回答` 为准。
- Q 编号跨轮 append、不回收；Round 1=`Q1–Q2`，Round 2=`Q3–Q4`，Round 3+=`Q5+`。
- 每轮只聚焦一个主题；严禁在上一轮未冻结前预设下一轮问题。
- 本阶段不提供 second-opinion 槽位（按业主指示 `waived`）。
- 任何执行方案不得违反长期治理原则：平台中立（只用公开 `Config`/`connection.admit`/`webServer` 等契约，不耦合私域实现）、能硬切不双写、能退役不兼容、不把部署事实写进构建产物。

---

## 修订历史

| 版本 | 日期 | 作者 | 主要变更 |
|------|------|------|----------|
| v0.1 | `2026-11-11` | `security-fix agent（DeepSeek Harness）` | 初稿：Round 1（Q1–Q2 foundational）与代码证据 |
| v0.2 | `2026-11-11` | `security-fix agent（DeepSeek Harness）` | Round 1 业主裁决（Q1=C、Q2=B）；T-O-1/T-O-2 冻结并补 §1.1/§1.2 细则；补中场评估 I；新增 Round 2（Q3 守卫载体、Q4 数据面归属） |
| v0.3 | `2026-11-11` | `security-fix agent（DeepSeek Harness）` | 新增 §0.1 术语澄清（宿主 / 宿主进程 / 页面 / Web 载体 / 宿主级能力） |
| v0.4 | `2026-11-11` | `security-fix agent（DeepSeek Harness）` | 新增 §0.2 能力归属 vs 分发归属：回归宿主 ≠ 回归核心，插件市场安装不变 |
| v0.5 | `2026-11-11` | `security-fix agent（DeepSeek Harness）` | 业主变更令：功能零回退（T-O-3）+ 本地威胁模型（T-O-4）；T-O-2 的 L2 硬退役条款失效；重写 Q3/Q4 为「三桶分诊」与「共享守卫 + 宿主侧 schema + 共享 HTML 策略（不迁移数据面）」 |
| v0.6 | `2026-11-11` | `security-fix agent（DeepSeek Harness）` | Round 2 业主裁决（Q3=C、Q4=A）；T-O-5/T-O-6 冻结并补 §1.5/§1.6；补中场评估 II；新增 Round 3（Q5 路由敏感度、Q6 远端 schema、Q7 HTML allowlist） |
| v0.7 | `2026-11-11` | `security-fix agent（DeepSeek Harness）` | Round 3 业主裁决（Q5=B、Q6=A、Q7=A）；T-O-7/T-O-8/T-O-9 冻结并补 §1.7–§1.9；补中场评估 III；新增 Round 4（Q8 P0 批次/门禁、Q9 P2 接受清单、Q10 供应链发布链） |
| v1.0 | `2026-11-11` | `security-fix agent（DeepSeek Harness）` | Round 4 业主裁决（Q8=B、Q9=B、Q10=A）；T-O-10/T-O-11/T-O-12 冻结并补 §1.10–§1.12；全轮收口；文档状态 `frozen` |
| v1.1 | `2026-11-11` | `security-fix agent（DeepSeek Harness）` | errata：下游代号 `MS01`→`26-nov-security-fix`；更正 `/settings/update` 方法(POST→PUT)与 L3→L2、`/s3/config` L2/L3 重复、`~/`→`${DSH_HOME}/`、随包源已入库(T-O-12 收窄)、清单运行时不可达(改构建期常量)；`file:` 依赖改 `devDependencies` 并固化 `T-O-13` 分发通道；新增 `T-O-14` 回归门禁；补 §1.13/§1.14、§9.0a、§9.1 两行 |
