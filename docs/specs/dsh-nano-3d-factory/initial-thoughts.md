# dsh-nano-3d-factory — 初步分析报告（initial thoughts）

> **文档类型**：讨论分析稿（discussion / analysis draft），不是规格冻结，不产生实现承诺
> **文档状态**：`draft — 待 [业主] 复核`
> **建档时间**：`2026-11-20 19:45`（Asia/Shanghai）
> **证据基线**：本仓 `main` HEAD `30ca969`；DNLS03 工作树 `dnls03-managed-sandbox-control` HEAD `3e7a775`；上游 pin 仓 `context/3d-new-era-ai` HEAD `81711b4`（v3.3.0）
> **命名说明**：本文目录名 `dsh-nano-3d-factory` 取自业主本轮指定路径；早期讨论中简称 `dsh-nano-3d-toolbox`，二者指同一插件。**包名/id 属可改合同项，待业主定名后登记。**
> **读者**：[业主]、后续实施 agent（[DNLS] profile 作者、[3DF] 插件作者）

---

## 0. 摘要

### 0.1 一句话结论

把 `3d-new-era-ai` pin 进 `.dependencies/pinned/`，以「一个 DNLS 托管对象（newera engine profile）+ 一个薄壳 dsh 插件（viewer pane + MCP 代理 + skill）」的三层结构落地，**架构上与 DNLS03 的对象模型天然同构**；真实阻塞项只有两个——spark 远程 backend 的「远程服务发布 seam」（DNLS 责任），和 `.newera` 项目文件跨越 workspace↔spark-stateVolume 的出入通道（v2 合同项）。

### 0.2 三层缺口总览

| 层 | 现状 | 缺什么 |
|---|---|---|
| 真源 | `.dependencies/pinned/` 已有 kitesurf/harness/fx 三仓先例 | 尚无 `pinned/newera`；`MANIFEST.json` 需新增 `deps.newera.pinned` |
| 协议 | `dnls.control/1` 对象模型（capability + sandboxId + operations 幂等） | 尚无「远程对象的服务发布」通路（`serviceMappings` 只认 loopback 证据） |
| 引擎 | newera 已有 `serve`/`/mcp`/`/api/*` 全量远程面 | 尚无 `profiles/newera`；aarch64 全量构建未验证（GUI 依赖链） |
| UI | `dnls-sandbox` 右栏页签 + `dsh-client-ui-sidebar-right` | 尚无 3D viewer pane；agent 尚无 `tools/call` 代理端点 |

---

## 1. 业主心智模型拆解

把业主两轮描述还原为原子命题，与上下文投影对齐：

| # | 业主命题 | 在本仓/上游的投影 | 判定 |
|---|---|---|---|
| M1 | 「把这个工具 pin 到 dependencies」 | `.dependencies/pinned/<repo>` + `materialize-*-pin.mjs` + `MANIFEST.json` | 机制完整，照抄 |
| M2 | 「创建一个 dsh-nano-3d-toolbox 插件」 | `docs/agents/TEMPLATE.md` 薄壳插件（index.js host + lib/client.js pane + skills/） | 形态成立 |
| M3 | 「运行在 DNLS 支持的 sandbox 内」 | DNLS03 `dnls.control/1`：`sandbox.instance.create(profileId=newera)` 出托管对象 | 需新 profile + spark backend |
| M4 | 「像 DNK 一样」 | 重引擎在 DNLS profile/driver，插件只消费 HTTP/MCP 合同，不持容器句柄 | 边界同构 |
| M5 | 「通过工作台唤醒这个 3d 插件」 | `dnls-sandbox` 右栏页签（session-scoped）内嵌对象视图；或插件自注册页签 | 两条挂载面可选，§6 |
| M6 | 「composer 直接通过 DNLS 提供的环境与基础授权通道与插件互动」 | agent 经插件注册的 `POST /<id>/mcp`（connection.requestRejection + 同源/bearer），代理对象内 `newera /mcp` | 即 DNT 模式 |
| M7 | 「macOS 不生产，跑 [spark]」 | `backend.js` 是 L1 抽象（13 方法）；spark 需新 backend + 远程发布 seam | DNLS 责任，插件无关 |
| M8 | 「专用 aarch64 镜像（blender 类）」 | `build.recipe` 多阶段 Dockerfile + `managedMounts` 声明 | 模式可复用，CUDA 为后验 |

**业主没明说、但从 M2–M6 可推出的隐含命题**：

- M9（隐含）：agent 是 primary operator，人是 observer。→ pane 先只读，写操作全走 agent 的 `tools/call`；交互编辑器属 v2。
- M10（隐含）：插件是"工具箱"不是"产品面"——与 `上层建筑归host`、`UI 宿主优先` 一致：viewer 用宿主 primitive / nano-ui，不自建第二套设计界面。

## 2. pin 值分析（`.dependencies/pinned/newera`）

| 项 | 值 | 含义/后果 |
|---|---|---|
| 上游 | `github.com/leandrodaf/3d-new-era-ai` | MIT OR Apache-2.0，可分发 |
| pin 对象 | 官方 git commit（当前 `81711b4` = v3.3.0 release 提交） | `上游 pin 不可改写`：导出的 `git archive` 原样进派生目录，构建产物不落 pin |
| 物化方式 | `materialize-*-pin.mjs` 逻辑（kitesurf 版已是通用实现，仅名字带 kitesurf） | 需复制为 `materialize-newera-pin.mjs` 或泛化 |
| 账本登记 | `MANIFEST.json` → `deps.newera.pinned`（`ref`/`resolvedSha`/`sourceTreeSha256` 三元组） | 现有 kitesurf `stage-*-runtime.mjs` 校验此三元组；newera 的 runtime 校验链需要等价物 |
| pin 内容 | 全 Rust workspace（17 crates）+ web/ + site/ + plugin/ | 我们只消费 `crates/` + `Cargo.*`；其余是 pin 的随行物，不裁剪 |
| 构建产物 | `newera` 单二进制（`serve`/`mcp`/`gui` 合一） | bin 无条件依赖 `newera-app`（eframe/wgpu）→ aarch64 需链接 GUI 系统库，即使只跑 serve |
| 构建拓扑 | 官方 CI 只产 `x86_64-unknown-linux-gnu`；无 aarch64 官方二进制 | **必须在 spark 原生编**（或交叉编）；Dockerfile 多阶段内 `cargo build --release -p newera`，不进 host Rust 链 |
| 规模 | 全 dep tree（含 eframe/wgpu/winit/axum/sqlx/rmcp） | 首次构建 10–25 min 量级（取决于 spark 核数）；后续层缓存不变即不重编 |

**pin 的两个治理性质**（与 kitesurf 一致）：

- `verify` 键锚定一个存在性检查文件（kitesurf 用 `packages/engine/wrangler.jsonc`）；newera 建议 `crates/newera/Cargo.toml` 或 `Cargo.toml` workspace 段；
- `digest` 是派生配方（recipe 文件集）的 sha256——改 profile 配方就换 tag，镜像与配方一一对应。

## 3. 探查到的限制条件声明

按「不可逾越 / 需裁决 / 工程约束」分级：

### 3.1 硬约束（不可逾越，来自原则或上游）

| 约束 | 出处 | 含义 |
|---|---|---|
| 上游 pin 不可改写 | AGENTS.md 原则 | `newera` 二进制必须来自原样源码编译；不能在上游加 `serve`-only main 入口来绕 GUI 依赖——只能全量编 `newera` |
| `serviceMappings` 证据制 + LOOPBACK | `managed-profile.js`（dnls03） | 服务只在 inspect 证据与预留三元组精确一致且 `hostAddress∈{127.0.0.1,::1}` 时 `published:true`——spark 远程对象天然不满足，**远程发布必须走 DNLS 提供的新 seam，不得插件侧绕行** |
| `上层建筑归host` | AGENTS.md 原则 | 容器生命周期、端口分配、配额归 DNLS；工具箱不得自开容器 CLI、不得写锁文件/端口文件 |
| `单一真源` | AGENTS.md 原则 | Document 唯一可写真源在引擎进程；pane 是投影，不复制可写态（否决「WASM 编辑器嵌 pane」作为 v1） |
| `不得擅自扩约` | AGENTS.md 原则 | `.newera` 出入通道（stateVolume→workspace 的文件出/入）是新凭证面，未获业主批准前不做 |
| `不得侧载` | AGENTS.md 原则 | 工具箱不硬编 spark 地址/凭证；一切经 DNLS 对象发现 |
| `插件中立` | AGENTS.md 原则 | 插件只耦 dsh + DNLS 公共合同，不耦 [nano-agent]/[dsh-mini] |

### 3.2 需 [业主] 裁决项

| 项 | 冲突/选项 | 建议 |
|---|---|---|
| **R1 远程服务发布 seam** | spark 对象的服务如何被本机 pane/代理够到：SSH 隧道 / spark-local relay / 受控 LAN 绑定 | 走 DNLS 的 backend 扩展（建议 SSH `-L` 风格隧道由 backend 建立并登记为 publish 证据），不由插件开洞 |
| **R2 `.newera` 文件真源** | stateVolume（guest-only，`file` 工具只认 guest path）vs workspace | v1：真源在 stateVolume；v2：经 backend `exec`/专用 route 出入到 workspace（需业主批准新凭证面） |
| **R3 pane 挂载面** | (a) `dnls-sandbox` 壳内对象视图 vs (b) 独立 `sidebar.right.pane.tab` | 建议 (b) 独立 tab + 显式 sandboxId 选择器；不寄生在管理页里，避免把"设计视图"混进"管理视图" |
| **R4 agent 调用面** | (a) 插件代理 `POST /dsh-nano-3d-factory/mcp`（DNT 式）vs (b) agent 直连对象 `:7878/mcp`（streamable 会话制） | 建议 (a)：统一准入 + ensure 生命周期 + SSE→JSON 适配；(b) 可作为排障后门 |
| **R5 profile 平台声明** | `platform: [linux/arm64]`，`backend: spark` | 待 DNLS spark backend 落地后回填；profile 本身 backend-agnostic |
| **R6 GPU 声明** | newera path tracer 纯 CPU 不吃 CUDA | 建议 driver `managedMounts` 预留 GPU 槽位但 v1 不启用；CUDA 工具（blender）属后续 profile |
| **R7 包名/id** | `dsh-nano-3d-factory` vs `dsh-nano-3d-toolbox` vs 其他 | 业主定名后登记（影响 plugin id、cordis.patch.yml、MCP 路由前缀） |

### 3.3 工程约束（确定性工作）

| 项 | 说明 |
|---|---|
| aarch64 全量构建 | `newera` bin 链 `newera-app`→eframe/wgpu/winit→`libxkbcommon-dev libwayland-dev libx11-dev libxcursor-dev libxrandr-dev libxi-dev`；在 builder stage `apt install` + `cargo build --release -p newera` 一次到位 |
| idle 判定 | `render_photo` 是分钟级 CPU 任务；`idleEvidence` 须把「有 in-flight 渲染」算非 idle（newera `sessions` 工具返回 `{tool,seconds,phase,done,total}`，可作证据） |
| MCP transport | newera `/mcp` 是 Streamable HTTP 会话制；插件代理须把 `initialize`+`tools/list`/`tools/call` 的 SSE 应答解成 JSON-RPC——**不重新声明 tool 表面，纯转发** |
| `ui://` MCP App | `show_plan` 返回 `ui://newera/plan-viewer.html`；若 dsh 不渲染 MCP Apps，代理原样透传，展示由 pane 承担 |
| profile 端口 | dnls03 模型下 `instance.hostPorts` 已退役，端口由 `ENV_PORT_POOLS` 分配 + inspect 证据投影——newera profile 不写死 hostPort |

## 4. 探查到的拓扑关系

### 4.1 本仓现状拓扑（main `30ca969` 与 dnls03 `3e7a775` 之间）

```
                    ┌───────────── dsh host (web profile) ─────────────┐
   composer agent ──┤  skills → POST /<plugin>/mcp (DNT 式代理)         │
   workbench pane ──┤  client.js → fetch /<plugin>/* (同源+connection)  │
                    └──────┬───────────────────────────────┬───────────┘
                           │ dnls.control/1 (capability)   │ 自有路由
                    ┌──────▼──────────────┐         ┌──────▼──────┐
                    │   DNLS (dnls03)     │         │ 3DF plugin  │
                    │  managed-routes     │◀─ensure─┤ (薄壳)      │
                    │  control-registry   │         └─────────────┘
                    │  environment-owner  │
                    └──────┬──────────────┘
                           │ backend.* (L1 13 方法)
                  ┌────────┴─────────┐
        ┌─────────▼──────┐    ┌──────▼────────┐
        │ backend-apple  │    │ backend-spark │  ← 待 DNLS 提供
        │ (macOS, 退役)  │    │ ([spark] SSH) │
        └──────┬─────────┘    └──────┬────────┘
               │                     │
        apple container       container on [spark] (aarch64 + CUDA)
```

### 4.2 newera 自身拓扑（上游内部）

```
┌──────────────── newera-server (axum) ────────────────┐
│  /api/home    全量模型（REST，工具化）                 │
│  /api/commands 原子命令（undoable）                    │
│  /api/plan.svg  样式图元真比例 SVG  ←── pane 主视图    │
│  /api/view.png  软件 3D 渲染 PNG    ←── pane 副视图    │
│  /api/events    SSE revision 推送   ←── pane 活更新    │
│  /api/sessions  presence/乐观锁                        │
│  /mcp           Streamable HTTP MCP  ←── agent 通道    │
│  /health        健康探针                               │
└──────────────────────────────────────────────────────┘
         ↓ 同一 SharedDocument（Arc<RwLock<Document>>）
   newera-mcp（工具层，40+ 工具，token 预算设计）
   newera-core（Command/Document/undo/redo/revision）
```

### 4.3 DNK 参照（同构先例）

```
DNK lib/client.js ── fetch /nano-local-sandbox/* ──▶ DNLS host routes ──▶ kitesurf 对象
DNK skills/kitesurf-cdp ── agent-browser --cdp ws://<host>:8791/cdp ──▶ 同一引擎页

3DF 对应：
3DF lib/client.js ── fetch /dsh-nano-3d-factory/{plan.svg,view.png,events,status}
                      ──▶ 3DF index.js（对象路由 + 转发）──▶ newera 对象 :7878
3DF skills/nano-3d ── POST /dsh-nano-3d-factory/mcp {tools/call}
                      ──▶ 3DF index.js（ensure + SSE→JSON 代理）──▶ newera 对象 /mcp
```

## 5. 关键判定：为什么 pane 是「只读投影」而非「内嵌编辑器」

上游有三种"看一个 plan"的方式，逐一判定：

| 方案 | 机制 | 判定 |
|---|---|---|
| **A. REST/SVG 投影**（推荐 v1） | pane fetch `/api/plan.svg` + `/api/view.png`，`/api/events` SSE 驱动重取 | ✅ 单一真源（Document 在对象进程内），零 WASM，零第二份可写态 |
| B. `newera-web` WASM viewer 嵌 pane | 编 WASM，`?project=` 或文件载入 | ⚠️ 可行但引入第二份 Document（viewer 自带 doc）；且 WASM ≈15MB 构建成本；v2 候选 |
| C. `newera-editor-web` WASM 编辑器嵌 pane | 完整 eframe 编辑器 WASM | ❌ v1 否决：可写态复制违反 `单一真源`；且需远程 attach 协议，上游只走 relay 给 MCP，不给编辑器 |
| D. 远程渲染流（VNC/像素推流） | 对象内跑 `newera gui` + 显示服务 | ❌ 无 GPU 显示面时不必要；newera serve 已给足远程面 |

A 的唯一代价是 pane **不可直接编辑**——但这恰好符合 M9：人是 observer，写全走 agent。v2 可加 DNK Annotate 式"点选打点送 composer"。

## 6. 推荐拓扑结构

```
.dependencies/pinned/newera  (官方 commit 原样，git archive 物化)
        │
        ▼ 派生构建（spark 上，多阶段 Dockerfile 内 cargo build）
profiles/newera  (DNLS 内)
  ├─ profile.yaml      id:newera, platform:[linux/arm64], backend:spark,
  │                    services:[{id:engine,port:7878,role:engine}],
  │                    state:{project:volume}, isolation:{network:loopback-only,…}
  ├─ Dockerfile        rust:1.95-slim-bookworm builder → bookworm-slim runtime
  └─ driver/index.js   managedMounts(stateVolume→/var/lib/newera),
                       idleEvidence(in-flight render), inspectedRecipe, selftest
        │
        ▼ dnls.control/1:  sandbox.instance.create {profileId:newera} → sandboxId
  backend-spark ([spark] 上容器对象, aarch64)
  └─ newera serve --addr 127.0.0.1:7878
     ├─ /api/plan.svg, /api/view.png, /api/events, /api/sessions
     └─ /mcp  (Streamable HTTP, 40+ tools)
        │
        ▼ 远程发布 seam（DNLS 提供：SSH 隧道 / relay / LAN 绑定 → publish 证据）
dsh-nano-3d-factory (薄壳插件, plugin-id: nano-3d-factory)
  ├─ index.js (host)
  │   ├─ POST /dsh-nano-3d-factory/mcp          agent 通道：ensure + 对象 /mcp 代理（SSE→JSON）
  │   ├─ GET  /dsh-nano-3d-factory/status       pane 状态（对象/引擎/revision）
  │   ├─ GET  /dsh-nano-3d-factory/plan.svg     pane 投影：转发对象 /api/plan.svg
  │   ├─ GET  /dsh-nano-3d-factory/view.png     pane 投影：转发对象 /api/view.png
  │   ├─ GET  /dsh-nano-3d-factory/events       pane 投影：SSE 转发对象 /api/events
  │   └─ GET  /dsh-nano-3d-factory/render/*     pane 投影：render_plan/render_3d/render_photo 结果
  ├─ lib/client.js (browser)
  │   └─ sidebar.right.pane.tab 独立页签：sandboxId 选择器 + plan.svg 主视图 +
  │      view.png 副视图 + lifecycle 控件 + engine-down 展示 + annotate→composer (v2)
  └─ skills/nano-3d/SKILL.md
      剧本：sandbox.instance.create {profileId:newera} → POST ../mcp {tools/call}
            （改自上游 design-a-home：home→create→catalog/place→layout/ergonomics→render_*）
```

**边界声明**：

- 工具箱**不持有**容器名/端口/凭证/锁文件——一律经 `dnls.control/1` 对象发现 + `serviceMappings` 证据投影；
- 工具箱**不重声明** newera 的 tool 表面——`/mcp` 代理纯转发 `tools/list`/`tools/call`，保持上游 token 预算设计；
- profile 的**配方权威**是 `profiles/newera/profile.yaml`；pin 的**内容权威**是 `.dependencies/pinned/newera`；`.newera` 文件的**状态权威** v1 是 stateVolume。

## 7. 推进顺序与证据点

| 序 | 动作 | 证据/产出 |
|---|---|---|
| 1 | 在 spark 上 `git clone` pin 仓 → `cargo build --release -p newera`（装 GUI sysdeps）冒烟 | `newera serve` 起 `/health` 200 + `/api/plan.svg` 200；aarch64 依赖链定性 |
| 2 | DNLS03 收口后，落 `profiles/newera/`（yaml + Dockerfile + driver） | `sandbox.profile.list` 见 `newera`；`sandbox.instance.create` 出对象 |
| 3 | DNLS 远程发布 seam 落地（DNLS 责任，R1） | `serviceMappings` 对 spark 对象 `published:true` |
| 4 | 落 `dsh-nano-3d-factory` 插件（TEMPLATE.md 骨架） | `POST /dsh-nano-3d-factory/mcp` tools/list 返回 newera 全工具 |
| 5 | pin 治理：`.dependencies/pinned/newera` + `MANIFEST.json` 登记 | `materialize-newera-pin.mjs --verify` 通过 |
| 6 | pane v1（plan+3D 双视图 + lifecycle） | 右栏页签渲染 `data-nano-3d-factory="1"` |

**v2 候选（均需业主单独批准）**：`.newera` 出入通道（R2）、annotate→composer（复用 `lib/note.js` 模式）、`newera-web` WASM viewer（B 方案）、GPU 声明启用（R6）、blender 类第二 profile。

## 8. 与原则台账的对照

| 原则 | 本设计的落点 |
|---|---|
| 插件中立 | 只耦 dsh + DNLS 合同，不耦 [nano-agent]/[dsh-mini] |
| 上层建筑归host | 容器生命周期/端口/配额归 DNLS；工具箱零容器 CLI |
| 不得侧载 | 不硬编 spark 地址/凭证；对象发现全走 dnls.control |
| 单一真源 | Document 唯一可写真源在对象进程；pane 只投影；`.newera` v1 唯一副本在 stateVolume |
| 上游 pin 不可改写 | newera 原样 commit；构建产物在派生目录/镜像，不回写 pin |
| 不得擅自扩约 | R1/R2 两个新凭证面明确列为待裁决项，不先斩后奏 |
| 不得过度仪式 | 不新增 release-gate；selftest 沿用 profile `health` 声明 |
| UI 宿主优先 | pane 用宿主 primitive / nano-ui；不建第二套设计界面 |
| worktree | 实施在 `.agents/worktrees` 语义分支，合并后按业主要求删 |

---

*本文档为初步分析快照；所有"待裁决"项在获得 [业主] durable 登记前不构成合同。*
