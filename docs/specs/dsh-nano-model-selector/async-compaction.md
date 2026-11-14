# [DNMS] async-compaction 执行设计草案

> **状态**：`规格草案 / 待 [业主] 裁决`。本文只做分析与设计，不授权改码、改 profile、安装、发布或重启任何 [dsh] 实例。
> **来源**：2026-11-14 与 [业主] 的讨论（四条要求 + 一个设置按钮），以及此前对 [nano-agent] compaction [真相层] 的只读调研。
> **命名**：沿用仓库惯例 `docs/specs/dsh-nano-model-selector/async-compaction.md`。
> **证据纪律**：本文全部事实断言均在 §0 定义路径别名，并在 §11 给出 `file:line` 索引；三路独立只读事实核查（[DNMS] / [dsh] 宿主 / [nano-agent]）已完成，40 条宿主断言 35 PASS / 5 CORRECTION / 0 FAIL，订正已回写正文。
> **引用边界**：本文引 [nano-agent] 材料仅作**历史经验与反面证据**。按 [插件中立]，交付的插件代码不得 import 任何 [nano-agent] 模块、不得与之建立侧载通道、不得复制其 D1/Queue/DO 实现；只借语义与数值口径。

---

## 0. 证据口径与核查结论

### 0.1 路径别名

| 别名 | 实际路径 | 说明 |
|---|---|---|
| `[DNMS]/` | `dsh-nano-model-selector/` | 本仓插件包 |
| `[SPEC]/` | `docs/specs/dsh-nano-model-selector/` | 本文件所在目录 |
| `[ROOT]/` | 仓库根 `/Users/seanz/Documents/dsh-plugins/` | [AGENTS.md](/Users/seanz/Documents/dsh-plugins/AGENTS.md) 所在层 |
| `[DH]/` | `context/deepseek-harness/` | [dsh] 源码检出，`@deepseek-ai/dsh` **0.2.2-rc.2**（`[DH]/apps/cli/package.json:4`）；`read` 工具会解析到同一 inode 的 `/Volumes/mini-512/nano-agent-dev/context/deepseek-harness/` |
| `[DH-DOC]/` | 安装版 dsh-doc references：`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-agent-preset/skills/dsh-doc/` | 运行安装 **0.2.2-rc.3**（同目录 `node_modules/@deepseek-ai/dsh/package.json:4`）；`app.asar` 内 `glob`/`grep` 报 `Not a directory`，只能逐文件 `read` |
| `[NA]/` | `/Users/seanz/Documents/nano-agent/` | [nano-agent] 兄弟仓（分支 `neo`） |

### 0.2 版本与一致性

- 安装版 `@deepseek-ai/dsh` = `0.2.2-rc.3`；`[DH]/` 检出 = `0.2.2-rc.2`（`[DH]/apps/cli/package.json:4`）。已用 `ELECTRON_RUN_AS_NODE=1` 逐字节比对 13 个 compaction 核心 `.ts` 与 `[DH]/packages/bundle/base/cordis.patch.yml`，**全部 SAME**；rc.2 可作 compaction 真相源。
- `[DH]/` 与 `/Volumes/mini-512/nano-agent-dev/context/deepseek-harness` 同 inode（1091689）；本文统一写 `[DH]/`。
- `[NA]/` HEAD 在核查期间持续前进：`2d2af7b4e` → `b56b52f52` → `26c85080b`。已核实这几个提交只改 `test/mega-journey/docs/` 与 `run-eval/`；本文引用的 compaction 文件最后一次改动是 `33312668a`，**逐字未变**。
- 当前会话：`DSH_PROFILE=desktop`，`DSH_PROFILE_DIR=/Users/seanz/.dsh-desktop/profiles/desktop`；另有 `web` profile 在 `/Users/seanz/.dsh/profiles/web/`。两者 `package.json` 都以 `file:../../plugins/...` 链接 6 个 nano 插件（含 [DNMS]），且 profile patch 中**无** compaction 覆盖行。
- **源文件在撰写期间变动**：`[ROOT]/AGENTS.md` 新增 [DNCS] 登记（`:31`），核心原则由 `:35-41` 下移到 `:36-42`，全文 50→51 行。本文 §4.1 / §11.4 均按**落盘时的 51 行版本**引用；`:12`（[业主]）、`:19`（[真相层]）、`:27`（[DNMS]）三处未移动。

### 0.3 核查方法与订正

三路只读事实核查分别覆盖：[DNMS] 15 组断言、[dsh] 宿主 40 条断言、[nano-agent] 23 条踩坑记录。**订正已全部回写正文**，汇总如下（详见 §11）：

| # | 原草稿 | 订正 | 证据 |
|---|---|---|---|
| C1 | 「路由表 3 条」 | 「使用」表是 **3 路径 / 4 行**；烘焙表才是 3 行 | `[DNMS]/AGENTS.md:105-110`、`[DNMS]/AGENTS.md:45`、`[DNMS]/lib/route-table.js:5-45` |
| C2 | 「build 脚本做 route-drift 检查」 | drift 断言在生成的 `lib/route-guard.js:88-113`；build 脚本只做「ledger 无本包行即退出」并烘焙表、多写 `src/host/route-table.js`、`lib/perf-review-host.js`、`lib/client.js` | `[DNMS]/scripts/build-client.mjs:18-36,84-88`、`[DNMS]/lib/route-guard.js:92,95,104,111` |
| C3 | `security/route-sensitivity.json` 在包内 | 在**仓库根**，[DNMS] 三行在 `:306-345` | `[ROOT]/security/route-sensitivity.json:2-4,306-345` |
| C4 | 「工作树干净」 | **核查时点**：全仓不干净（`M docs/specs/dsh-nano-notepad/notepad-wasm-fx-pipeline.md`、`?? test/spike/notepad-wasm-fx/visual/fx-card.png`），只有 [DNMS] 子树干净，另有被 `*.tgz` 忽略的 `0.2.0` tarball，`HEAD=f8fda5c`。**本文落盘时**：该两项已被并行分支合入，`HEAD=97f4921`（merge `notepad-kind-spec`），全仓仅剩本文未跟踪。两处时点均记录，不把动态状态写成常量 | `git status --short --untracked-files=all`、`git log -1 --oneline`（两次采样） |
| C5 | 「包内有 `imagine/` 输出目录」 | 包内/仓内均无静态目录；`.prompt.txt`/`.out.txt`/`.gitignore` 由 `imagineRun()` 运行时 `mkdirSync` 生成 | `[DNMS]/lib/host-media.js:34-53,235-247` |
| C6 | `[DH-DOC]/references/practices.md:17-18` 含 `next()` 规则 | `next()` 在 `:16`；`systemPrompt.section()` / `agent.inject()` / `agent/request` 不可改请求在 `:18`；`:17` 是 guard/restrict | `[DH-DOC]/references/practices.md:16,18` |
| C7 | `configuration.md:3-11` 含 volatile / 重启 | 该文件仅 12 行；`editor.edit` 在 `:5-10`，`.volatile()` 与普通字段重启在 `:12` | `[DH-DOC]/references/configuration.md:3-12` |
| C8 | `compaction-basic/README.md:129` 是 summarize hook、`:171-173` 是 Dev Note、公式 `W×thresholdRatio, W−O−B` | hook 在 `:117`；Dev Note 在 `:261-273`；公式逐字为 `:64` 的 `floor(min(W × 0.8, W − O − B))`（B=65,536）与 `:68` 的 `floor(min(W × thresholdRatio, W − O − headroomTokens))`，配置表在 `:66-78` | `[DH]/packages/compaction/compaction-basic/README.md:64,66-78,88,117,261-273` |
| C9 | `CompactionEngine` 三方法在 `:119-122` | 类与 `super(ctx,'compaction')` 在 `:119-122`；三 `abstract` 方法在 `:136`/`:162`/`:187` | `[DH]/packages/compaction/compaction/src/index.ts:119-122,136,162,187` |
| C10 | `<compacted-summary>` framing 在 `region.ts` | 标签常量与 `frameSummary()` 在 `summarizer.ts:22-23,188-193`；`region.ts:24` 导入、`:411` 调用 | `[DH]/packages/compaction/compaction-basic/src/summarizer.ts:22-23,188-193`、`src/region.ts:24,411` |
| C11 | `[NA]` 冻结与搬迁是同一事件 | 冻结 `2026-06-27`、SUPERSEDED/RELOCATED banner `2026-09-19`，两个日期 | `[NA]/docs/eval/grounding-truth/4th-wave/specs/frozen-truth-and-terms.md:1-3,10-11` |
| C12 | 「从 MCCM2 继承引擎」有单条字面证据 | 无单条字面；可证实的是「MCCM2 同时提出引擎+甜点位政策 → owner Q1/FT-D5 否决政策、保留 nominal 唯一分母」，D1 CAS/generation 护栏见 `[NA]/docs/truth/context/frozen/individuals/checkpoint_and_episode.md:74`（`T-O-7`）与 `[NA]/docs/truth/context/frozen/code-verification-ledger.md:382`（`CV-CP-09` 三步） | 见 §3.5 |
| C13 | `[NA]/docs/eval/grounding-truth/1st-wave/proposed-planning.md:40-58` 承载 `T-O-7` | **错误**：该文件全文无 `T-O-7`（`grep` 零命中），`:40-45` 是「纪律继承」条目。`T-O-7`「generation CAS 协议 + 双 OCC 分离」实际在 `checkpoint_and_episode.md:74`；三步协议的代码核验在 `code-verification-ledger.md:382`。正文与 §11.3 已改用后者 | `[NA]/docs/eval/grounding-truth/1st-wave/proposed-planning.md:40-45`；`[NA]/docs/truth/context/frozen/individuals/checkpoint_and_episode.md:74`；`[NA]/docs/truth/context/frozen/code-verification-ledger.md:382` |

**UNVERIFIED 项（诚实声明）**：
- U1：安装版 `app.asar` 全量递归 grep 不可执行（210 MB 单文件归档，`rg`/`glob` 报 `Not a directory (os error 20)`）。替代验证：逐文件 `read` 完 7 篇 dsh-doc references，并读完 rc.3 编译产物 `node_modules/@deepseek-ai/dsh-compaction/lib/index.js`（175 行，导出仅 `CompactionEngine, CompactionId, ManualCompactionError, compactCheckpointSource, isCompactCheckpointSource, toolPairingBalancedAfter, toolPairingBalancedBefore`），未见 `beforeCompact`/`afterCompact`/`registerSummarizer`。结论成立，但根 A 全量 grep 本身未执行。
- U2：`[NA]` 精确串「独立压缩管道」全仓零命中已亲验；历史最接近措辞见 §3.6。
- U3：本会话无 `cordis_inspect_list/query`，未做实时 Service/Event/Slot 挂载校验；组合层结论以 `--dump-config` 与源码为准（P0 必测）。

### 0.4 一处必须保留的陈旧事实

`[SPEC]/README.md` 是 [DNMS] 根 `README.md` 的符号链接目标（`git ls-files -s` mode `120000`），且**已陈旧**：`:7` 标版本 `0.1.1`、`:8` 称「dsh overlay 插件（纯客户端）」、`:17` 称「仅客户端，无 host 逻辑」、`:37-39` 的 `lib/` 树里没有 `lib/host-media.js`、`:50` inject 名单与 `:56` 依赖类别也已过时（现见 `[DNMS]/package.json:39-44,47-51`）。本文不修改它，但实施时不得把该 README 当现状依据。

---

## 1. 背景与诉求

[业主] 要求在 [DNMS] 内「作为真源」构建 compaction 机制：

1. 可以启用/关闭 async compact 并指定压缩的模型；
2. 可以设置 async compact 的水位，并构建 `pinned-async`、`health-target`、`safety` 等概念在 [dsh] 内以插件形式落地；
3. 启用后，替换 [dsh] 宿主对于**全部压缩的真源**，并完整接管 compaction 的部分；
4. 暂时不接管 micro-compact；full-compact 作为兜底存在，也需要接入进来。

并在已实现的「媒体生成」旁**增加一个按钮**，用于对 async-compact 的设置和启用进行支持。

### 1.1 结论先行

1. **可做，但不是把 [nano-agent] 的架构搬过来**。按 [插件中立] / [不得侧载]，只借 B/H/S、pinned、DC、checkpoint-first、跨请求 adoption 的**语义**；实现全部落在 [dsh] 原生扩展点上。
2. **「替换宿主全部压缩的真源」必须拆成两层**：[dsh] 的**会话 durable 真源 = Session log**，这是架构红线（`[DH-DOC]/references/practices.md:7`「The session log is the only source of truth. … Plugin memory is a derived cache.」；`[DH]/docs/subsystems/session.md:5`「append-only log … the single source of truth」）。插件不得复制第二份、不得新增 event type。插件能成为的是「**压缩策略 / 配置 / 触发 / backend 的唯一真源**」。这与 [nano-agent] [真相层] 里「边界非删除、overlay 落 D1」是同一层意思。请 [业主] 确认口径（D1）。
3. **出厂 seam 恰好存在且合法**：`ctx.compaction` 是文档化的 capability seam，`[DH]/docs/subsystems/compaction.md:147`「Load one implementation per context as `ctx.compaction`」；`[DH]/packages/compaction/compaction/README.md:51`「Extend the provided base class and implement three operations … Load your class as a plugin and it becomes the condensation service for the composition」。所以「完整接管」**架构上成立**。但 web profile 把它放进 preset `isolate` realm，且 JS bundle 能否 import 出厂 TS 包**未验证** → **必须 P0 spike 先行**，不通过降级到架构 B。
4. **按钮本身成本最低**：照媒体生成加 rail 第 4 个图标 + `filter` 面板即可；成本全在 backend 组合与 durable 协议。

---

## 2. 事实基线

### 2.1 [DNMS] 现状（逐条已核）

| 项 | 事实 | 证据 |
|---|---|---|
| 身份 | 包名 `dsh-nano-model-selector`、id `nano-model-selector`、仅 web、宿主入口 `index.js`、浏览器入口 `lib/client.js`、inject `llm/webServer/connection/skills` | `[DNMS]/AGENTS.md:11-18`；`[DNMS]/package.json:38` `"platform": "web"` |
| 装好标志（原文） | 「composer 出现 `.nms-trigger`，并且 `/imagine` 已经注册。」 | `[DNMS]/AGENTS.md:5` |
| 面板 | **单列 54px 图标 rail**（非三列）：首排「全部」「收藏」「媒体生成」+ 分隔线 + 品牌列表 | `[DNMS]/src/client/ModelSelector.jsx:693-728`；`src/client/styles.js:49-51,61`；`[DNMS]/AGENTS.md:73,97` |
| 宿主入口 | `export const name`、`export const inject`、`export function apply(ctx)`；**无 `Config` schema**（`[DNMS]/AGENTS.md:114`「无宿主 Config。」） | `[DNMS]/index.js:11,13,226-238` |
| 配置持久化 | 状态文件 `$DSH_DATA_DIR`/`$DSH_HOME`/`~/.dsh` 下 `plugins/nano-model-selector/media-engine.json`；卸载不删；浏览器 localStorage 只是缓存 | `[DNMS]/AGENTS.md:112-118`；`index.js:34-38`；`src/client/media.js:3,20` |
| 桥接 | **同源裸 fetch**，非 RPC / user-actions；`connection.requestRejection` + 405 在 guard | `src/client/media.js:24-48`；`[DNMS]/AGENTS.md:103`；`index.js:233-237` |
| 路由 | 3 路径 / 4 行：GET catalog、GET media-engines、GET/PUT media-engine（PUT 上限 16384 字节） | `[DNMS]/AGENTS.md:105-110`；`index.js:198-223` |
| 路由硬约束 | 新路由先在**仓库根** `[ROOT]/security/route-sensitivity.json`（[DNMS] 行 `:306-345`）登记，再 `npm run build`；drift 断言在 `lib/route-guard.js:92,95,104,111` | C2/C3 |
| 技能 | 运行时 `ctx.skills.register({source:'runtime', invocation:{modelInvocable:false,userInvocable:true}, provider:'nano-model-selector'})`；无静态 `skills/` | `[DNMS]/index.js:172-189` |
| 模型目录 | `ctx.llm.listProviders/listModels/resolveModelInfo`，读 `context.contextWindow` / `defaultMaxTokens`，15s TTL | `[DNMS]/index.js:41,55,61-62,90,93` |
| UI 文案 | 全部硬编码在 `src/client/i18n.js`（zh `:40-48`、en `:86-94`）；locale JSON 只有 `meta` | `[DNMS]/src/client/i18n.js`；`locale/*.json:2-5` |
| compaction | **全包零命中** `compact/watermark/summary`；`token/context` 仅作模型展示元数据 | `[DNMS]/index.js:61-62`；`ModelSelector.jsx:42-54,886-896` |
| 构建 | `scripts` 只有 `build`；`files` 10 项；3 条 `file:` devDeps 不可改；`engines.dsh >=0.2.2-rc.1 <0.3.0` | `[DNMS]/package.json:8-10,18-29,30-32,47-52`；`AGENTS.md:43-45,120-131` |
| 安装 | 唯一 `dsh plugin --profile web add <spec>`；不要手改 profile `package.json`；无 HMR 要重启宿主 + 强刷 | `[DNMS]/AGENTS.md:49-65` |
| git | [DNMS] 子树干净；全仓另有 1 modified + 1 untracked（均在 [DNMS] 外）；`HEAD=f8fda5c` | C4 |

### 2.2 [dsh] 宿主 compaction 现状（rc.3 安装版与 rc.2 检出一致）

**5 包 capability family**（`[DH]/packages/compaction/README.md:27-34`）：`dsh-compaction`（抽象 `ctx.compaction`）、`dsh-compaction-basic`（唯一出厂 backend）、`dsh-command-compact`（`/compact`）、`dsh-compaction-tool-result-pruner`（≈micro）、`dsh-compaction-image-offload`。`[DH]/docs/subsystems/compaction.md:5`：「Compaction is **one optional capability**, not part of the agent-loop spine」。

**唯一真相源与单写入者**：4 个 log-only 事件 `compaction/start`（`[DH]/packages/compaction/compaction/src/types.ts:24`）、`compaction/summary`（`:34-67`）、`compaction/end`（`:69-72`）、`compaction/prune`（`:74-82`）；唯一 surface 变更是一条 `user/message` 带 `surfaceOp:{op:'replace',startSeq,endSeq}`（`[DH]/docs/subsystems/compaction.md:11`）与 `compactCheckpointSource()`（`[DH]/packages/compaction/compaction/src/checkpoint.ts:33,49`）。完整写入序列 `compactSurfaceRegion()`：`region.ts:210` start → `:491` summary → `:506-507` user/message replace → `:237` end；被 shadow 原文留在 raw log，`deriveMessages()` 派生（`[DH]/packages/compaction/compaction/README.md:97,142`）。`<compacted-summary>` 标签在 `summarizer.ts:22-23`，`frameSummary()` 在 `:188-193`，`region.ts:24` 导入、`:411` 调用（C10）。

**触发**（`[DH]/packages/compaction/compaction-basic/src/index.ts:157,183,213`）：`agent/pre-step`（pressure）、`agent/request`（模型切换）、`agent/request-error`（`CONTEXT_WINDOW_EXCEEDED`）、`/compact`（`compactNow`，`[DH]/packages/compaction/command-compact/src/index.ts:67`）、`compactRegion`。另有 `agent/status(:177)`、`session/event(:207)` 两个观察者。**没有 micro/full/async 之分**——只有一套同步 bracket；事务内先 model-free `ctx.toolResultPruner.pruneSession()` 再 LLM 摘要。`compaction/*` 是 durable session events，不是同名 Cordis events（`[DH]/docs/user/develop/framework/events.md:106`）。

**出厂配置**（`[DH]/packages/compaction/compaction-basic/README.md:66-78`；`[DH]/docs/config-catalog.md:786-823`）：`thresholdRatio 0.8`、`headroomTokens 65536`、`retainRatio 0.16`、`retainTokens`、`summarizationProvider/Model`（默认空）、`maxTokens`（默认 = headroom）、`compactionRetries 1`、`maxOverflowRetries 1`、`modelPolicies []`、`auto true`。触发公式逐字：`[DH]/packages/compaction/compaction-basic/README.md:64`「`floor(min(W × 0.8, W − O − B))`, where `B = 65,536`」与 `:68`「`floor(min(W × thresholdRatio, W − O − headroomTokens))`」；实现在 `src/config.ts:191-197`，`retainTokens >= thresholdTokens` 在 `:198-204` reject。`auto:false` 不注册任何自动监听（`src/index.ts:139`；`README.md:88`）。`summarize()` 是唯一子类钩子（`README.md:117`），Dev Note 在 `:261-273`（C8）。

**摘要 LLM**（`[DH]/packages/compaction/compaction-basic/src/summarizer.ts:152-163`）：单次 `ctx.llm.stream(options)`，`purpose:'compaction'`（`:160`），绕过 `agent/request`；输入复用 system head + shadowed messages + 固定 `COMPACTION_INSTRUCTION`（`:32`），输出只保留 text（`:220`）、拒绝 image（`:217-219`）。模型优先级 `configured ?? 最新 logged request target ?? AgentOptions`（`:127-142`）；`summarizationProvider/Model` 必须成对、必须是已注册路由。

**isolate 与组合层**：
- `[DH]/packages/bundle/base/cordis.patch.yml:352-361` 是**扁平** insert：`token-meter` / `compaction-basic` / `command-compact`；`:358-359` 注释「Backend independent, so it follows whichever compaction service this leaf mounts」。
- `[DH]/packages/bundle/web-app/cordis.patch.yml:569-583`：这三条扁平行被 `disabled: true`（`:576-577`、`:579-580`、`:582-583`）；`:569-574` 说明「token METER stays on the host plane; only the compaction backend that reads it moves」。
- 真正生效的是 preset group：`[DH]/packages/bundle/web-app/presets/standard.patch.yml:72-88` 的 `id: compaction` / `cordis:group` / `group: true` / `isolate:{compaction:true,toolResultPruner:true}`，内含 `compaction-basic`、`command-compact`、`tool-result-pruner`（`thresholdChars 8192/headChars 4096/tailChars 1024`，`[DH]/packages/compaction/compaction-tool-result-pruner/src/config.ts:10-14`）。同形 group 还存在于 `minimal.patch.yml`、`ptc.patch.yml`、`presets/cordis.patch.yml`。
- patch 方言（`[DH-DOC]/references/composition-reference.md:9-18`）：`- insert: [rows]` 追加；带 `id` 且无 `insert` 的 patch 命中同名行、`config` 整体替换；`disabled` 可为 boolean/null/`!!js`；`isolate` 隔离服务实例。

**插件禁令**（关键）：
- `[DH-DOC]/references/practices.md:21`：不得新增 session event type；`appendPluginRecord()` 保留给 DSH experimental。
- `[DH]/docs/cordis-api/context.md:267-268,294-295,299,301`：`ctx.set` 只有提供者能改；`ctx.provide` 同名已提供会 throw；提供返回 disposer。→ **运行时覆盖已挂载服务不可行，只能组合层替换**。
- `[DH]/docs/subsystems/llm-streaming.md:803,1245-1250`：loop-built request deep-frozen，`agent/request` listeners 只读不重写。
- `[DH-DOC]/references/practices.md:16,18`：waterfall 必须 `next()`；`agent/request` 不能改 messages；`ctx.systemPrompt.section()` / `agent.inject()`。
- `[DH-DOC]/references/configuration.md:3-12`：插件**绝不**自写 profile `cordis.patch.yml`；改自身配置走 `ctx.get('configEditor').edit(ctx.fiber.entry, …)`；普通字段编辑会重启插件，`.volatile()` 原地更新。
- `[DH-DOC]/references/practices.md:28-29`：等 durable 事件；timer 起活必须调 `agent.followup()`，`agent.inject()` 不唤醒。`runMaintenance` 签名 `[DH]/packages/core/agent/src/runtime-types.ts:232`、`[DH]/packages/core/agent-loop/src/agent.ts:204-205`（要求 agent 处于 idle）。
- `[DH]/packages/llm/token-meter/src/index.ts:87,151`：`TokenMeter extends Service`，`measure(session, requestHeader?) → TokenMeasurement`；`types.ts:22-30` 含 `totalTokens`。

**明确缺失的扩展点**（间接证据 + 逐文件通读，U1）：无 `beforeCompact`/`afterCompact` Cordis 事件、无 `registerSummarizer`、无 model-facing compaction tool（`[DH]/packages/compaction/compaction/README.md:159,171-172`「Human command, not a model tool」「Model-facing tool, undecided」「Template and remote backends, undecided … no such backend ships」）、`ctx.tokenMeter` 无可替换 estimator。唯一 compaction Cordis 事件是 `compaction/summary-error` waterfall（失败恢复用，`[DH]/packages/compaction/compaction/src/index.ts:92-107`；`[DH]/docs/subsystems/compaction.md:260-278`）。

### 2.3 概念映射表（[nano-agent] 语义 → [dsh] 实物）

| [真相层] 概念 | [dsh] 现有对应 | 差距 / 落地方式 |
|---|---|---|
| `buffer-size-async` B（触发线，默认 0.65） | `thresholdRatio 0.8` + `auto` | 需**自定义触发策略**；宿主阈值含 headroom/output 预留，不是纯 nominal 比例 |
| `health-target-async` H（压到目标线，默认 0.50） | **无**（宿主只有「保留尾」`retainRatio/retainTokens`） | 需新建：摘要后重测 + 目标线校验 / over-health → deferred full |
| `pinned-async`（绝对 token 逐字尾 100K，15% cap） | `retainTokens`（绝对保留预算） | **几乎一一对应**，直接映射 + `min(pinned, 15%×W)` clamp |
| `buffer-size-safety` S（0.80 阻塞 full 线） | `thresholdRatio` + `maxOverflowRetries` / overflow recovery | 需**独立 S 线**，与 B 分离 |
| DC-1/2/3、`window_min` | 无（只有 `retainTokens < thresholdTokens` 加载期校验） | 新建 `validateMasterOrder` 纯函数 + 运行时 DC 判定 |
| `async-LLM` 独立 slot | `summarizationProvider/Model` + `purpose:'compaction'` | **已有**，UI 复用 catalog 选模型 |
| checkpoint-first / overlay / 下一请求 adoption | `compaction/start…end` bracket + `surfaceOp.replace` + `deriveMessages()` | **已有**，必须原样复用，不得自造事件 |
| 独立压缩管道 | `ctx.compaction` Provider 替换 + 后台维护任务 + 独立 `ctx.llm.stream` | 需新建调度层 |
| full 兜底 | `compactNow()` / `/compact` / `context-overflow` | **已有**，接入即可 |
| micro（不接管） | `dsh-compaction-tool-result-pruner` | **保持原样不动** |

### 2.4 四条要求逐条裁决

| # | 要求 | 裁决 | 落点 | 风险 |
|---|---|---|---|---|
| 1 | 启用/关闭 + 指定压缩模型 | ✅ 可 | rail 按钮 + `async-compact.json` + 复用 `/catalog` 选 (provider,model) + `ctx.llm.stream` | 中：「关闭」时谁接管需 D2 裁决 |
| 2 | 设置水位 + 落地 pinned/health/safety 概念 | ✅ 可，本次核心增量 | 新 `[DNMS]/lib/compact-policy.js` 纯函数；宿主 `retainTokens` 作 pinned 执行面 | 中：宿主 Config 是加载期校验，运行期改值需 `configEditor` 或自有 provider |
| 3 | 替换宿主全部压缩真源、完整接管 | ⚠️ **架构合法但需 P0 spike** | patch 禁用出厂 backend + 向 isolate group 插入自己的 `CompactionEngine` 子类；持久化仍走宿主 `compaction/*` | **高**：isolate realm、JS bundle 模块解析、多 preset group、运行时开关切换 |
| 4 | 不接管 micro；full 作兜底接入 | ✅ 可 | `tool-result-pruner` 行不动；保留 `dsh-command-compact`；S 线 / overflow → `compactNow` | 低 |

---

## 3. [nano-agent] 踩坑记录与历史经验（引入本章的目的）

> 本章是 [业主] 明确要求引入的「踩坑记录与历史经验」。所有条目均为**反面证据**：说明「如果不这样设计，会掉进什么坑」。按 [插件中立]，这里不 import、不复制、不建侧载；只把教训转写成 §6–§8 的防护设计。路径别名见 §0.1，`[NA]/` 全部 `file:line` 已逐条核实。

### 3.1 集群 A：写了但没接线 / 设计态冒充实现

**A1 — GTF1 death-cut，设计态状态机冒充实现**
`[NA]/workers/context-core/src/async-compact/index.ts:4-8`「GTF1 death-cut: the `AsyncCompactOrchestrator` state-machine subsystem … was removed — it had zero live production importers」；`types.ts:6` 仍写「idle → armed → preparing → committing → committed → idle」；`[NA]/docs/eval/grounding-truth/4th-wave/state-of-async-compact.md:244`「D-ASYNC-8 async-compact 状态机定义完整、无 orchestrator … D1-job CAS 状态机…只覆盖 pending→prepare→running→completed，是执行级状态机，不是 orchestration 级」；真实 D1 六态 `pending/prepare/running/completed/failed/cancelled` 见 `[NA]/foundation/rules/glossary.md:177`。
→ **教训**：草案不得把「仅设计稿」的状态机写成已实现；每个状态机标注 `FROZEN/ALIGNED/SUPERSEDED`，两套管用词表显式区分 authority。

**A2 — 4th-wave「两套独立 compact 系统」，触发链与执行链未焊接**
`[NA]/docs/eval/grounding-truth/4th-wave/state-of-async-compact.md:15`「当前有两套独立 compact 系统：(A) **同步 auto-compact** … 阻塞当前 turn；(B) **异步 compact-arm**：手动 API 触发，经 executor queue 走 LLM summarizer，但从未被自动路径调用」；`:162`「`compact-arm` 是唯一调度 async summarizer 的地方，而 auto-compact 路径永远不会调用 `compact-arm`」；`:391`「整条链路从未焊接在一起」。
→ **教训**：触发链与执行链必须同一交付、同一验收；「写了但未接线」的模块是幻影能力，禁止列入能力清单。

**A3 — GTY7：另一条独立 auto-arm 链被同步 swap 抢先泄压而饿死**
`[NA]/docs/eval/grounding-truth/5th-wave/GTY7-fixing-bugs.md:21`「`layer-builders.ts:314-322` 明文『True LLM materialize is the second track (GTS8 capstone) — do NOT wire it here』。能调摘要的只有**另一条独立 auto-arm 链**，被同步 swap 抢先泄压而饿死」；`:95`「同步 swap 在更低的 `autoCompactTokenLimit`…**每 turn 先泄压**」；`:96`「即 LLM 链是 **armed-but-starved/unreached**」；`:269`「组件已建 + 单测」≠「live dispatch 已接线」。
→ **教训**：新增后台车道时，旧同步车道会饿死它——必须显式禁用/降级同步泄压，或让后台触发阈值严格低于同步线。这是本草案 §6 要求「接管即禁用出厂自动触发」的直接依据。

**A4 — manual arm ≠ organic auto-async（T4 幻影能力）**
`[NA]/docs/eval/grounding-truth/6th-wave/states-after-GTZ7k-K9-L1-FR-23/truth-01-async-compact.md:249`「`P1` manual `/compact/arm` 语义漂移：plain `armContextCompactJob`、dispatch job 未指定 slot，executor 默认 `full-LLM`，也没有 organic `async-arm-freeze`」；`:444`「manual arm 等同 organic async | 🔴T4 | route 存在但 plain arm + default full slot + no async freeze」；`:458` 同。
→ **教训**：路由存在 ≠ 能力交付；只有复用同一 freeze / slot / policy / epoch guard 的链路才能叫 auto-async。对应本草案 §9 验收必须区分「新按钮能开」与「backend 真的换了」。

### 3.2 集群 B：计量、状态与假绿

**B1 — P1 计量口径 4.6× 低估 / arm 不 fire；P1/P2/P3 独立修独立验**
`[NA]/docs/eval/grounding-truth/5th-wave/state-of-async-compact-after-GTY8.md:230`「它系统性地**只有真实 context 的 1/4~1/5**，导致在真实模型/真实水位下 arm **根本不 fire**」；`:240`「3.6~6× 口径差」；`:242`「被低估 4.6× 的 meter」；`:321`「3 个独立问题（P1 / P2 / P3）…**各自独立修复、各自独立审查**」；`:396`「三条工作线各自独立：P1（计量）、P2（内容/打包）、P3（物化）各有独立修复点 + 独立验收标准」；`[NA]/docs/eval/grounding-truth/5th-wave/GTY9-reference-anchor.md:19`「三线独立修、独立验收」、`:104`「arm total_tokens = messages-only 估算（4.6× 低估）」。
→ **教训**：一条触发公式、一个分母，绝不让 `estimatedTokens` 与真实 provider tokens 两种货币分叉；修复拆分独立验收，禁止「打包绿」。对应 §7 的 `fill = tokenMeter.measure(session).totalTokens / W` 单一公式。

**B2 — P3 ready 率 6%：`completed` ≠ `ready`**
`state-of-async-compact-after-GTY8.md:255-277`「**198 条 `completed` 里只有 4（2%）ready；真正 summarize 的 32 条里只有 2（6%）ready，94% 超时/过窗退化**」；`truth-01-async-compact.md:455`「『completed compact job = ready summary』被证伪…semantic success 由 status+ready+ref 共同决定」。
→ **教训**：语义成功 = `completed` + `ready` + 非空 ref + 非 recovery；`completed` 只是 lifecycle 终态，不能当成功计数。

**B3 — `b0_async_ready_count` 假绿**
`truth-01-async-compact.md:320`「production classifier 因此把 FR-32 degraded 计成 `b0_async_ready_count=1`」；`:443`「harness clean-ready 计数 | 🔴T4」；`:247`「只按 mode/recovery/time 筛选，未检查 ready/ref/tokens health」；`:459` 订正。
→ **教训**：验收计数器必须检查 readiness，而非只数合法 episode；字段名与 gate 消费同步改。

**B4 — `session.heartbeat` 不是 async 状态帧；schema 可表达 ≠ runtime 可达**
`truth-01-async-compact.md:291-302`：`arm/queued` 否、`running/progress` 否、「`session.heartbeat` | 与 async 状态正交」；`:302`「`CompactNotifyKind` schema 允许 `started`…但 organic auto-arm writer 没有发这个 frame；**存在 union member 不等于 runtime 已接线**」；`:457` 订正为「无 automatic arm/running heartbeat；只有独立 liveness + terminal event」。
→ **教训**：UI 状态必须来自真实 durable 帧，不能拿 liveness 心跳当进度。本草案 §9 的 UI 状态取自 `async-compact.json` + 真实 compaction 结果，不做假进度条。

### 3.3 集群 C：checkpoint-first 与 durable 协议

**C1 — checkpoint-first 被判 `missing` → GTY9 兑现**
`state-of-async-compact-after-GTY8.md:61`「checkpoint-first freeze…arm 只写 lifecycle job + generation snapshot；checkpoint 在 summarizer 完成后的 boundary commit 才生成 | **missing**」；`:253`「checkpoint 在 arm 后 ~2.3s、summarize 完成后的 boundary commit 才出现；arm 时刻 0 checkpoint」；`[NA]/docs/issue/grounding-truth/GTY9-checkpoint-first-async-compact-closure.md:12`「arm-freeze live 实锤（`arm_checkpoint_uuid` 落列 + `async-arm-freeze` tile）；frozen package live（`input_source=frozen-package` + hash + `pinned_kept=97,704`）」。
→ **教训**：arm 时刻即冻结输入；arm 之后的 transcript churn 绝不能进入摘要包。

**C2 — 6th-wave 定稿状态机与 reverse-water 11 条**
`truth-01-async-compact.md:161-184` 状态机 `NO_EPISODE → NOOP / BLOCKING_FULL / ARM_FREEZE_DURABLE → QUEUED → RUNNING → CANCELLED | COMPLETED+DEGRADED | COMPLETED+READY`；READY 后 `observed ≤ H → HEALTHY adoption`、`> H → OVER_HEALTH + deferred next-FULL intent`。§9.2（`:446-460`）11 条反假绿，其中：`:450`「『async 是完全非阻塞、零等待』被证伪：route 会 await policy observation、R2/D1 freeze 和 Queue admission；只是不等 LLM summary」；`:451`「『Queue dispatch 成功 = async 完成』被证伪」；`:454`「『input token 下降 = async 已替换』被证伪」；`:457`「『heartbeat 会上报 async arm/完成/失败』被证伪」。
→ **教训**：精确定义「async」与「独立管道」，只承诺「LLM summary 不阻塞」；不宣称零等待 / 零耐久写 / 自动 retry / 自动接 FULL / token 回落=成功。

**C3 — FR-32 毫秒级非阻塞时序（验收测什么）**
`truth-01-async-compact.md:358-383`：「02:43:05.382 lifecycle + async-arm-freeze durable / 02:43:07.267 main provider call dispatched / 02:43:08.322 async compact provider call starts / 02:44:30.451 main provider call completes while async still running / 02:46:08.127 async boundary terminal = degraded(timeout) / 02:46:21.359 T009 response terminal = completed」；`:383`「『非阻塞』准确含义是**不等待 LLM summary**，不是『触发路径零延迟/零耐久写』」。
→ **教训**：验收必须抓同一 turn 的毫秒级并发时序（freeze 先于 background call、主 dispatch 不等 summary、主线在 async 运行期继续、degraded 不把 turn 判红），而非只看「turn 最终 completed」。

### 3.4 集群 D：失败法则与 [真相层] 治理

**D1 — Y12 supersession：失败不推导 FULL**
`truth-01-async-compact.md:531-569`（附录 C）：`:533`「正文中『degraded/unknown→typed next-FULL』『async 不重试』…已被…与 `T-O-Z7L-Y12-1` supersede」；`:556`「one physical summarizer attempt per episode；首次 typed transient failure 后只允许一只 new episode retry；第二次连续失败打开 session circuit」；`:559`「free-text、join/read/shape unknown 全部 fail-safe suppress non-safety compact…也不推导 FULL」；`:565`「`B≤H` 不是 full-only 策略，而是必须 reject 的非法配置；`effective pinned-async≥H×window` 才是合法 DC-1 full-only」。`[NA]/docs/truth/context/frozen/individuals/async_failure_and_successor.md:30`「failure、degraded、unknown 本身均不创建 FULL intent」、`:36` FT-L7；`truth-03-compact-sequence.md:493`「FULL current 合法 trigger 只有：trusted safety；DC-1/结构不可达；successful adopted ASYNC 后的 exact over-health 在后续 B crossing；owner/manual control」。
→ **教训**：[真相层] 必须留 append-only supersession register；不得由 failure/degraded/unknown 推导 FULL，非法配置在写时 reject 而非静默 full-only。

**D2 — [真相层] 解剖与执法：单一可写真源**
`[NA]/docs/truth/context/frozen/index.md:30-34`「later explicit superseding owner truth > frozen individuals > frozen collectives > discussion > HEAD」；`:39`「同一 semantic field 只允许一个 current editable/document authority」；`:43`「HEAD 只证明实现事实…不得反向成为合同」；`implementation-state-register.md:7`「**`frozen ≠ aligned`**」、`:14`「把 frozen wording（规范层）与 implementation state（实现层）分开」；`[NA]/scripts/checks/durable/compaction-truth-single-writer.mjs:3-6`「compaction-truth single-writer gate…exactly ONE code write-point」；`[NA]/test/shared/frozen-law/compaction-decision.test.mjs:1-2`「the frozen registration package is verbatim and **append-only**」。
→ **教训**：只保留一份可写 durable 真相；规范/实现/证据三层分离；single-writer 静态 gate + append-only 一致性测试执法。

**D3 — FT-O 判定输入闭集**
`[NA]/docs/truth/context/frozen/individuals/compaction_decision_law.md:31` FT-O2「上下文的压缩, 仅依赖于水位分布. 不存在任何其他的限制条件」；`:44`「**闭集外一律非法**：时间 / 距上次派发 / 空闲度 / cache 温度、headroom、测试或资格 lease、环境变量覆盖、模型专属绝对常量、成本 / 频率」；`:88` FT-O10「arm 线不得存在第二份公式」；`:81` FT-O9「`route_reason` 只能取自一张理由登记表」；`:92` FT-O11「租户唯一能发起压缩的写入口 = `POST /context/compact`」。
→ **教训**：不让 UI 状态、遥测、计时器、cache-rate、成本变成触发条件；`route_reason` 走封闭登记表；写入口闭集。

**D4 — FT-D master 序 + DC + CS**
`[NA]/docs/truth/context/frozen/individuals/watermarks_and_availability.md:31` FT-D2「`pinned-async/window < health-target-async < buffer-size-async < buffer-size-safety(80%) < 100%`…**满足全序 ⟺ async 可用**」；`:66` OQ-1「默认基线 = 50%」、`:67` OQ-8「默认基线 `buffer-size-async = 65%`」、`:32` FT-D3「= 80%」；`:36` FT-D7「config 三层暴露」；`:56` DC-1「`window_min = pinned-async / health-target-async`」、`:57-58` DC-2/DC-3；附录 CS-1(`:138`)/CS-2(`:160`)/CS-3(`:173`)。
→ **教训**：参数在**写时**校验全序并 reject 非法组合，不要运行时静默 clamp；一个 nominal 分母。

**D5 — no-cap / incomplete / one physical attempt**
`[NA]/docs/truth/context/frozen/individuals/compact_wire_policy.md:45`「owner 先明确裁决『不能够给 async compact 和 full compact 的输出提供任何形式的 cap，也不可在压缩时设置 max token』」；`:51` FT-N1「`health-target-async`…**它不是 provider output ceiling**」；`:52` FT-N2「必须省略 `max_output_tokens`…`max_tokens`，也不得借别名写入等价 output-token ceiling」；`:67` FT-N6「incomplete、partial、empty、invalid summary 一律不得采用」；`:68` FT-N7「相同 frozen request 不盲重试…也不因 ASYNC failure 直接触发 FULL」。
→ **教训**：H 只作选择/post-boundary 健康度量，绝不映射为 wire cap。

**D6 — 独立 slot、唯一计费口、配置漂移诚实登记**
`[NA]/docs/truth/context/frozen/individuals/compaction_llm.md:28` FT-F1「**agent-core 是唯一 LLM adapter**；所有 LLM 请求**必须过计费**；**context-core 不得持任何 LLM 调用**」；`:29` FT-F2「**async-LLM 与 full-LLM 是两个独立 config slot（非同源，OQ-10）**」；`[NA]/docs/truth/context/frozen/implementation-state-register.md:31`「**部分 DRIFTED**…默认模型现为 `minimax-m3`…compaction slot 现为 `NANO_COMPACT_SUMMARY_MODEL` env→D1 global-default 解析」；`:50-51`「二度漂移」「FT-F2 | **DRIFTED**」。
→ **教训**：config-as-SSOT 只能有一条解析路径；值漂移必须登记（frozen 字面 ⊥ HEAD 实测分开 CITE），不得由实现反推合同。

**D7 — 4th-wave SSOT 冻结 + SUPERSEDED/RELOCATED banner**
`[NA]/docs/eval/grounding-truth/4th-wave/specs/frozen-truth-and-terms.md:1-3`「SUPERSEDED / RELOCATED — 2026-09-19 · owner 指令」「本文件不再作为 current consumer 的读取源」「新家:`docs/truth/context/frozen/`」；`:10-11`「🔒 全文冻结声明（owner 宣告 · 2026-06-27 · v2.4）…均为权威真相，可 CITE、不再重新争论」。（C11：两个日期是两件事。）
→ **教训**：决策需 durable 登记；旧文档只留形成史，不再是当前消费读源；[真相层] 单一 authoritative home。

### 3.5 集群 E：政策否决、栅格旁路、stored-not-enforced

**E1 — MCCM2 sweet-spot 被 4th-wave 否决，引擎与政策分离**
`[NA]/docs/eval/grounding-truth/4th-wave/reference-anchor-on-compaction-triggers.md:60`「`default_effective_context_window_percent() = 95` | ⛔ **不采纳** … **= owner 在 Q1 否决的『有效 hard-limit』概念**」；`:61`「`effective_context_pct` / `sweet_spot_tokens`…据 Q1 决定**不**把它升格为面向用户的新阈值」；`frozen-truth-and-terms.md:79` FT-D5「**不引入『有效 hard-limit / 不可用点』独立阈值**：nominal window 是**唯一** hard-limit…route 不算 effective window」；`:558`「与现有 `effective_context_pct`/`sweet_spot_tokens` 对齐仅用于**注册时推荐默认**，不进 route」；`[NA]/docs/action-plan/more-capabilities/MCCM2-d1-async-compaction-engine-and-sweet-spot-buffer.md:4`「在 **D1 单语句 CAS 状态机 +（cron 安全网 / Queue 事件驱动 prepare）** 上重建异步压缩，叠加…甜点位 dual-anchor buffer」。
**订正（C12/C13）**：仓库**无**单条字面写「从 MCCM2 继承引擎」；可证实的是「引擎+政策同源于 MCCM2 → owner Q1/FT-D5 否决政策、保留 nominal 唯一分母」。D1 CAS/generation 护栏的权威登记是 `[NA]/docs/truth/context/frozen/individuals/checkpoint_and_episode.md:74` 的 `T-O-7`「generation CAS 协议 + 双 OCC 分离 + R3：arm 快照 → commit 前 CAS → 拒后丢 boundary+删 blob」，代码核验见 `[NA]/docs/truth/context/frozen/code-verification-ledger.md:382` 的 `CV-CP-09`「`armed_at_session_generation` arm 快照→commit 前 CAS→拒后丢 boundary+删 blob」。本文按此表述，未虚构「继承」原句。
→ **教训**：保持一个分母（nominal window），不引 model-specific「effective window」阈值；把「引擎继承」与「政策否决」分开登记。

**E2 — GTX4-05 stored-not-enforced**
`[NA]/workers/context-core/src/budget/compaction-policy-live.ts:1-12`「GTX4-05…— cure stored-not-enforced」「Before GTX4 the context-core inspector provider `getCompactPolicy()` HARD-RETURNED `DEFAULT_COMPACT_POLICY`…a PATCH to the team×model watermark…**was stored but NEVER read**, so "config" had zero behavioral effect」；`[NA]/docs/eval/grounding-truth/4th-wave/pre-charter-qna.md:69`「治现 `compact_policy_json` **"stored-not-enforced"** 病」。
→ **教训**：设置 UI 写入的配置若 runtime 从不读，就是幻影；必须端到端验证 enforcement（schema + 解析 + live consumption + observe effective）。本草案 §9 把「PUT 后 runtime 真读」列为硬验收。

**E3 — R5 watermark grid bypass**
`compaction-policy-live.ts:102-113`「`MIN_SOFT_TRIGGER_PCT=0.25`…that floor previously lived ONLY on the per-session `mergeCompactPolicy` path … so the **watermark grid BYPASSED it**…GTZ3-P2-03 retires that bypass」「this grid now clamps the effective soft trigger UP to the floor…**surfaced in the durable `context.policy_resolve` audit**」；`watermarks_and_availability.md:118`「R5…已 **RETIRED**（GTZ3-P2-03 `0146f4d1`）」。
→ **教训**：每条写路径都要校验；clamp 必须进 durable audit，让 stored-vs-effective 分叉可观测。

**E4 — one-active / epoch guard / typed reason registry**
`[NA]/workers/context-core/src/budget/async-arm-decision.ts:5`「This module is the SINGLE-SOURCED predicate」、`:34`「`export type AsyncArmDisabledReason = "DC-1" | "DC-2"`」；`[NA]/workers/orchestrator-core/src/entrypoint/context-rpc/auto-arm.ts:507-543` 逐态 noop「async-epoch-active / boundary-pending / awaiting-adoption / measurement-in-flight / post-terminal-turn-fenced / boundary-shape-unknown」、`:863`「One-active-per-session guard…already-armed」；`[NA]/test/release-gates/tg8-compact-authority-single-owner.gate.test.mjs:94,238-241`「agent-core compact wiring does not write compaction truth directly (ownership static half)」；`truth-01-async-compact.md:264`「one-active partial unique guard + epoch states 防止正常路径并发双 arm」。
→ **教训**：一个 session 只允许一个 active compaction；用 epoch 状态机 + typed reason registry + single-owner gate 执法。

### 3.6 集群 F：术语校准

**F1 — 「独立压缩管道」在 [nano-agent] 全仓零命中**（U2 已亲验）。最接近的历史措辞：
- `[NA]/docs/eval/product-enhancement/owner-cared-topics-analysis-by-opus.md:29`「异步压缩管道 wire-in(`AsyncCompactOrchestrator` → agent-core live)」、`:60`「### 2.1 [T1-S1] 异步压缩管道 wire-in」——指 2026-04 写完没接线的 orchestrator，后已 death-cut；
- 同文件 `:33`「分层独立压缩策略与触发器」、`:337`「### 2.5 [T1-S5] 分层独立压缩策略与触发器」——指分层策略，非执行 lane；
- `[NA]/test/shared/gsth/journey/lane-isolation.test.mjs:54`「a red in one lane leaves the **independent compaction lane** running to its end」——GSTH 测试 harness lane 隔离。
- 概念本身在 6th-wave 的表达是 `truth-01-async-compact.md:198`「主线则是 agent-core Session DO → orchestrator-core service binding → **Queue → orchestrator executor → agent-core compactionSummarize** → provider」、`:111`「Queue bound: send accepted, **return to mainline**」、`:383` 的「非阻塞」精确定义。
→ **教训**：[DNMS] 草案须精确命名 [dsh] 等价物——`ctx.compaction` Provider 替换 + 后台维护 lane + 独立 `purpose:'compaction'` 调用 + 单一 owner 真值 + 跨请求 adoption；**不要照抄「独立压缩管道」这个在 [nano-agent] 里并不存在的词**。

### 3.7 坑 → 本草案防护设计映射

| # | 坑（条目） | 本草案的对应防护 |
|---|---|---|
| 1 | 设计态冒充实现 / 写入未焊接 / manual arm 幻影（A1/A2/A4） | 能力清单只登记「触发链+执行链同 PR 焊接」的条目；状态机标 `FROZEN/ALIGNED/SUPERSEDED`；route 存在 ≠ capability delivered |
| 2 | 后台车道被同步车道饿死（A3、C2） | 接管即禁用出厂自动触发，后台触发线严格低于同步线；不并行两套泄压 |
| 3 | 双币种计量 4.6× 低估（B1、D3、D4） | 一条触发公式 + 一个分母（nominal window / provider-truth）；`route_reason` 封闭登记表；写时 reject 非法全序 |
| 4 | `completed` ≠ `ready` / b0 假绿（B2、B3） | 语义成功 = completed + ready + 非空 ref + 非 recovery；验收计数器按此实现 |
| 5 | checkpoint 迟到 ~2.3s / 输入漂移（C1） | arm 时刻即冻结；冻结后 churn 不进摘要包；复用宿主 bracket |
| 6 | async 过度宣称 / UI 无真实状态（C2、C3、B4） | 只承诺「LLM summary 不阻塞」；验收抓毫秒级时序；UI 状态取自 durable 结果而非 liveness |
| 7 | 失败推导 FULL / 静默 clamp（D1、D5、E3） | append-only 决策登记；failure/degraded/unknown 不创建 FULL；`B≤H` 写时 reject；no-cap、one-attempt、incomplete 不采用；clamp 进 audit |
| 8 | stored-not-enforced / 栅格旁路（E2、E3、E4） | PUT 后端到端验证 runtime 真读；每条写路径校验；单一可写真源 + one-active/epoch guard |
| 9 | 有效窗口阈值 / 配置漂移 / 术语照抄（E1、D6、D7、F1） | 保持一个分母；不引 model-specific effective window；drift 诚实登记；精确命名 [dsh] 等价物 |
| 10 | [真相层] 多写者 / 规范-实现混淆（D2、D4、E4） | 一份 durable 可写权威；规范/实现/证据三层分离；append-only 一致性 + 单一 owner 静态约束 |

---

## 4. 本仓库开发准则与硬闸门

### 4.1 词汇与硬闸门（逐条已核）

`[ROOT]/AGENTS.md:12`：「[业主] = 仓库的维护人, 权限的定义者, 最终裁决的执行人; 当以业主身份进行沟通时, 拥有全仓最高权限, 覆盖全部前序 qna 或者真相层裁决」。`:19`：「[真相层] = 通过 qna 通道完成的真相层锚定, 每个冻结的真相必须有对应的 truth-id 进行锚定和回溯」。`:27` 登记 [DNMS] = `dsh-nano-model-selector`，模型与请求管理器。

| 闸门 | 原文位置 | 与本需求的冲突 | 处置 |
|---|---|---|---|
| **插件中立** | `[ROOT]/AGENTS.md:36` | 借了 [nano-agent] [真相层] 概念 | 只借语义与数值口径；**不 import [nano-agent] 代码、不与 [dsh-mini] / [nano-platform] 建侧载**；§3 引用明确定为「历史经验与反面证据」 |
| **上层建筑归host** | `[ROOT]/AGENTS.md:37` | 压缩策略/触发按字面属 host 侧 | 本需求是 [业主] 显式指令，按 `:12` 覆盖前序裁决 → **允许**，但必须 durable 登记 |
| **不得侧载** | `[ROOT]/AGENTS.md:38` | 新设置若跨插件取数会犯规 | 设置文件、路由、LLM 调用全部在 [DNMS] 内闭环；模型目录复用本包已有 `/catalog`，不硬编 base-url/密钥 |
| **单一真源** | `[ROOT]/AGENTS.md:39` | 状态文件 + 宿主行 config 若为两份可写副本即违规 | 只保留**一份** canonical：`async-compact.json`；宿主行 config 是派生投影或完全不写；会话真值仍归 Session log |
| **不得擅自扩约** | `[ROOT]/AGENTS.md:40` | 禁用出厂 backend + 替换 `ctx.compaction` 是 profile 级公共合同变更 | 本请求即 [业主] 决定；**实施前**在 `[DNMS]/AGENTS.md` 增一节「compaction 接管合同」作**单一登记真源**；不另立仪式文件；不把「测试要求如此」当合同来源 |
| **不得过度仪式** | `[ROOT]/AGENTS.md:41` | — | 不新设 release gate；复用 `npm run build` + `node --test` + `[DNMS]/AGENTS.md:67-74` 四步验收 |
| **worktree** | `[ROOT]/AGENTS.md:42` | — | 在 `.agents/worktrees/` 开语义分支（如 `dnms-async-compact`），合并后按 [业主] 要求删除树 |

### 4.2 [DNMS] 自身合同（不可绕）

- `[DNMS]/AGENTS.md:3-4`「只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。周围仓库、`context/`、本机手册都不在这个包里。」；`:150`「不要把 `context/` 或本机手册当成安装步骤」。
  → **本文位于 `docs/specs/`（包外），引用 `[DH]/` 与 `[NA]/` 作为设计证据是允许的；但这些引用不得进入交付物、不得成为安装步骤。**
- `[DNMS]/AGENTS.md:114`「无宿主 Config。」；`:116` 状态文件路径与「卸载不删」；`:118` localStorage 只是缓存。
- `[DNMS]/AGENTS.md:43-45` 三条 `file:` 构建期依赖不可改；`:122-131` 构建触发条件与 `npm install && npm run build`；`:147-150` 四条「不要」。
- `[DNMS]/AGENTS.md:49-65` 安装/重启/卸载合同：唯一 `dsh plugin --profile web add <spec>`、不要手改 profile `package.json`、无 HMR 需重启宿主 + 强刷。
- `[ROOT]/AGENTS.md:5-7` 指向 [README.md] / [RELEASE.md] / [INTRODUCTION.md] / [docs/agents/TEMPLATE.md] 四份总索引（均实际存在）；安装侧唯一合同仍是各包自己的 `AGENTS.md`。

### 4.3 与 [nano-agent] [真相层] 的对照（不复制，只对齐纪律）

| [nano-agent] 纪律 | 本草案对应 |
|---|---|
| `[NA]/docs/truth/context/frozen/index.md:30-34` authority 链 + `:39` 单 authority | [业主] 决策 → `[DNMS]/AGENTS.md` 单一登记真源；规格草案不冒充合同 |
| `implementation-state-register.md:7` `frozen ≠ aligned` | 本文每个能力标注「设计 / 需 spike / 待实现」，不写「已实现」 |
| `compaction-truth-single-writer.mjs:3-6` 单一写者 | 会话 durable 写者仍只有宿主 `compactSurfaceRegion()`；插件不写第二份 |
| `compaction-decision.test.mjs:1-2` append-only | 决策变更走 `[DNMS]/AGENTS.md` 修订，不改已冻结条款 |
| FT-O 判定输入闭集 | 触发条件只允许水位分布 + 已登记状态；UI/计时器/成本不得成为触发条件 |

---

## 5. 关键裁决与待 [业主] 决策（实施前冻结）

> 按 [不得擅自扩约]，以下为**待裁决槽**，尚未冻结；AGENT 不私自决定。裁决后登记到 `[DNMS]/AGENTS.md` 单一真源，不另立仪式文件。

| ID | 决策 | 推荐 | 依据 |
|---|---|---|---|
| **D1** | 「替换真源」口径 = 策略/配置/触发/backend 唯一真源（会话 durable 真值仍归 Session log）？还是要求插件自持会话副本？ | **前者** | 后者被 `[DH-DOC]/references/practices.md:7,21` 与 `[DH]/docs/subsystems/session.md:5,788` 结构性禁止，且会毁掉 fork/replay |
| **D2** | 「关闭 async compact」时：回到宿主默认压缩，还是完全不自动压缩（只留 `/compact`）？ | **回到宿主默认**（保底体验） | 需运行时切换方案，见 P2；否则卸载/关闭后出现「无压缩」空窗（R10） |
| **D3** | async 的准确定义：触发的 turn 已完成、摘要在后台跑、**下一请求才 adoption**（[nano-agent] 口径），还是同 turn 内不等摘要？ | **跨 turn 后台**：`agent.runMaintenance` 在 turn 间跑 bracket，下一 prompt 前 settle | `[DH-DOC]/references/practices.md:28-29`；`[DH]/packages/core/agent-loop/src/agent.ts:204-205` 要求 idle；`truth-01-async-compact.md:383` 的「非阻塞」精确定义 |
| **D4** | S 线命中时：阻塞 full（`compactNow`）还是只走宿主 overflow recovery？ | **独立 S 线 → 阻塞 full**；`CONTEXT_WINDOW_EXCEEDED` 仍由宿主 recovery 兜底 | `truth-01-async-compact.md:565`、`truth-03-compact-sequence.md:493` |
| **D5** | 目标 profile：`web` / `desktop` / 仅 `dsh-dev`？ | **仅 `dsh-dev` 验证** | [业主] 已明确不重启 dsh.local（生产实例）；本草案不授权任何生产实例操作 |
| **D6** | 是否允许修改 `[DNMS]/AGENTS.md:114` 的「无宿主 Config」合同、引入 `Config` schema？ | **v1 不改**：沿用状态文件 + GET/PUT（与媒体生成同构、已验证） | 若要设置出现在原生 Settings 面板，作为 v2 单独登记（`[DH]/docs/cookbook/adding-a-settings-card.md:19-20,46,49`） |

---

## 6. 选定架构

### 6.1 架构 A（推荐）：Provider 替换 + 插件策略真源

```
┌─ 浏览器（[DNMS] 面板，rail 第 4 按钮 filter='compact'）──────────────┐
│  enable switch · 压缩模型下拉（复用 /catalog）· B / H / S / pinned 输入 │
│  localStorage 仅缓存 ──同源 fetch──> GET/PUT /nano-model-selector/async-compact │
└───────────────────────────────┬───────────────────────────────────┘
                                │ 唯一 canonical
                    async-compact.json（$DSH_DATA_DIR/plugins/nano-model-selector/）
                                │ 读
┌─ Host：lib/compact-policy.js ─┴───────────────────────────────────┐
│  master 序 pinned/W < H < B < S < 1；DC-1/2/3；effective pin=min(P,15%W) │
│  填充分数 = tokenMeter.measure(session).totalTokens / W（单一公式）      │
└───────────────────┬──────────────────────────────────────────────┘
                    │ 策略
┌─ Host：lib/compact-scheduler.js ───────────────────────────────────┐
│  session/event / turn-end → 计量 → ≥B 排后台维护；≥S 或 overflow → 阻塞 full │
│  agent.runMaintenance + agent.followup()（不占当前 turn）             │
└───────────────────┬──────────────────────────────────────────────┘
                    │ 调用
┌─ ctx.compaction（我们的 CompactionEngine 子类，挂在 preset isolate group）─┐
│  compactIfNeeded / compactNow / compactRegion                       │
│  摘要 = ctx.llm.stream({provider, model, purpose:'compaction', signal}) │
│  落盘 = 复用 compaction/start|summary|end + compactCheckpointSource │
│        + surfaceOp.replace + frameSummary()（禁止新 event type）      │
└───────────────────┬──────────────────────────────────────────────┘
        /compact（dsh-command-compact，backend-independent，保留）
        micro（dsh-compaction-tool-result-pruner，保持不动）
```

**「独立压缩管道」在 [dsh] 的等价物**（按 F1 精确命名，不照抄术语）：Provider 与 loop 解耦 + `agent.runMaintenance` 后台 bracket + 独立 `purpose:'compaction'` 的 `ctx.llm.stream` + 下一请求 adoption。不引入 Workflows、不引入新 event type、不复制会话状态。

**新增/改动文件**：

| 文件 | 角色 |
|---|---|
| `[DNMS]/cordis.patch.yml` | 新增：`- id: compaction-basic` `disabled: true`（base flat 行）+ 向各 preset `id: compaction` group 插入 provider 行；**保留** `command-compact` 与 `tool-result-pruner` |
| `[DNMS]/lib/compact-policy.js`（新） | 纯函数：schema、master 序校验、DC-1/2/3、effective pin、填充分数、状态读写 |
| `[DNMS]/lib/compact-scheduler.js`（新） | 计量 / 触发 / 后台维护 / full 兜底编排 |
| `[DNMS]/lib/host-compaction.js`（新，或 `./compaction` 子路径导出） | default-export `CompactionEngine` 子类；`inject=['llm','tokenMeter','sessions']` |
| `[DNMS]/index.js` | 增加 `GET/PUT /nano-model-selector/async-compact` handler + `registerRoutes` 一行 |
| `[DNMS]/src/client/compact.js`（新） | 仿 `media.js:24-48` 的 fetch/PUT + localStorage 缓存 |
| `[DNMS]/src/client/ModelSelector.jsx` | `:717-727` 后加第 4 个 rail 按钮；`:770-813` 旁加 `filter==='compact'` 面板；扩展 `:815,822,829,847`（及 `:354-355,370` 的 filter 判断）的 `filter!=='media'` 条件 |
| `[DNMS]/src/client/i18n.js` / `icons.jsx` | 两组文案 + 图标 |
| `[ROOT]/security/route-sensitivity.json` | 新增 1 行（L3 operator config，PUT `bodyLimit` 16384） |
| `[DNMS]/package.json` | `files` / `exports` 补新 lib；`cordis.patch.yml` 变更 |
| `[DNMS]/AGENTS.md` | 登记「compaction 接管合同」+ 新路由表 + 验收步骤 |
| `[DNMS]/test/compact-policy.test.mjs`（新） | `node:test` 纯函数单测（master 序 / DC / clamp / 填充分数 / 序列化） |

### 6.2 架构 B（P0 spike 失败时的降级）

不替换 provider：保留 `compaction-basic`，用 patch 静态设 `auto:false` + `summarizationProvider/Model` + `retainTokens`；插件自管 B/H/S 触发，通过 `ctx.compaction.compactNow()` / `compactRegion()` 驱动。策略真源仍是插件状态文件，运行时用 `ctx.get('configEditor').edit(entry, …)`（`[DH-DOC]/references/configuration.md:5-10`）投影到宿主行 config——**禁止自写 `cordis.patch.yml`**（`:3`）。

- 优点：不碰 isolate realm、不依赖 shipped 包 import、durable 协议完全由出厂 backend 承担。
- 缺点：`ctx.compaction` 在 isolate realm，host-plane 插件访问需 `agentPresets.serviceFor(agent,'compaction')` 一类入口（**待 P0 S0.4 验证**）；且属「调参+驱动」而非「完整接管」，不完全满足要求 3。
- 触发条件：S0.1 / S0.2 / S0.3 任一不通过即降级，并向 [业主] 报告「要求 3 只能部分兑现」。

### 6.3 被否决的方案

| 方案 | 否决理由 |
|---|---|
| 插件自持一份压缩后的会话摘要/状态副本 | 违反 `[DH-DOC]/references/practices.md:7`（session log 唯一真源）与 [单一真源]；fork/replay 会分叉 |
| 新增 `compaction/*` 之外的 session event type | `[DH-DOC]/references/practices.md:21` 禁止；Session 会拒绝 reopen |
| 运行时 `ctx.set('compaction', …)` / `ctx.provide` 覆盖已挂载服务 | `[DH]/docs/cordis-api/context.md:267-268,294-295` 明确 throw；只能组合层替换 |
| 用 `agent/request` waterfall 改 messages | `[DH-DOC]/references/practices.md:18` + `[DH]/docs/subsystems/llm-streaming.md:1245-1250` 只读 |
| 照搬 [nano-agent] 的 D1/Queue/DO/cron 实现 | [插件中立]；[dsh] 没有这些底座，且 [DH] 有 `agent.runMaintenance` / `ctx.timer` 原生等价 |
| 引入 model-specific `effective_window` / `sweet_spot` 双锚 | E1：owner Q1 与 FT-D5 已否决；保持 nominal window 单一分母 |
| 新增 model-facing compaction tool | `[DH]/packages/compaction/compaction/README.md:159,171` 明确未决，属 [不得擅自扩约] |

---

## 7. 精确契约（P1 冻结，实施前不得由实现反推）

### 7.1 状态文件（唯一 canonical，durable、可写、runtime 权威读取）

路径：`$DSH_DATA_DIR`，否则 `$DSH_HOME`，否则 `~/.dsh`，其下 `plugins/nano-model-selector/async-compact.json`（与 `media-engine.json` 同目录，对齐 `[DNMS]/AGENTS.md:116`）。卸载不删（对齐 `:65`）。

```json
{
  "schema": 1,
  "enabled": false,
  "model": { "provider": "", "model": "" },
  "bufferSizeAsync": 0.65,
  "healthTargetAsync": 0.50,
  "bufferSizeSafety": 0.80,
  "pinnedAsyncTokens": 100000,
  "pinnedFullTokens": 20000
}
```

- `enabled=false` → 宿主默认压缩（D2）。
- `model` 空串对 = 沿用最近 routed target（`[DH]/packages/compaction/compaction-basic/src/summarizer.ts:127-142`）。
- `bufferSizeSafety` 只读展示，不开放编辑（FT-D7 三层暴露的 (B) 层）。
- 浏览器 localStorage 键 `dsh-nano-model-selector:async-compact.v1` **只是缓存**，host 文件才是真源（对齐 `[DNMS]/src/client/media.js:20`）。

### 7.2 不变式（`validateMasterOrder`，写时 reject，不静默 clamp）

```
effectivePin = min(pinnedAsyncTokens, floor(0.15 × W))
effectivePin / W  <  H  <  B  <  S(=0.80)  <  1
B ∈ [0.25, S)                 // MIN_SOFT_TRIGGER_PCT 地板，E3 要求每条写路径都校验
window_min = pinnedAsyncTokens / H
```

- DC-1（`effectivePin/W ≥ H`）→ full-only；DC-2（`H ≥ B`）→ reject；DC-3（`B ≥ S`）→ reject（`[NA]/docs/truth/context/frozen/individuals/watermarks_and_availability.md:54-60`、`:31`；`async_failure_and_successor.md:36` FT-L7）。
- `B≤H` 是**非法配置必须 reject**，不是 full-only 策略（D1/Y12，`truth-01-async-compact.md:565`）。
- 填充分数只有一份公式：`fill = ctx.tokenMeter.measure(session).totalTokens / W`，`W` 取 `ctx.llm.resolveModelInfo(provider, model).context.contextWindow`（`[DNMS]/index.js:55,61`）。禁止第二公式、第二分母（FT-O10 / B1 / E1）。
- clamp 若发生（仅 `0.25` 地板），必须写入 durable audit 让 stored-vs-effective 可观测（E3）。

### 7.3 路由契约

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/nano-model-selector/async-compact` | 返回 `{...policy, effective:{pin, windowMin, dcs}, runtime:{fill, lastCompaction}}` |
| PUT | `/nano-model-selector/async-compact` | 同体；16384 字节上限；校验失败 400 且不落盘；成功后 provider 立即读到新策略 |

- 必须先登记 `[ROOT]/security/route-sensitivity.json`（L3 operator config，`bodyLimit: 16384`），再 `npm run build`（C2/C3）。
- 全部路由经 `registerRoutes` + `connection.requestRejection` + guard 405（`[DNMS]/index.js:233-237`、`AGENTS.md:103`）。

### 7.4 patch 契约（**P0 验证后才定稿**）

```yaml
# 示意，非最终；以 `dsh --profile <dev> --dump-config` 的合成结果为准
- id: compaction-basic
  disabled: true

- insert:
    - id: compaction            # 命中 group: true 行，插入到其 config 列表
      # 每个 preset（standard / minimal / ptc / presets/cordis.patch.yml）各一份
      - id: dnms-compaction
        name: dsh-nano-model-selector/compaction
        # inject: ['llm','tokenMeter','sessions']
```

语法依据 `[DH-DOC]/references/composition-reference.md:9-10,16,18`；覆盖先例 `[DH-DOC]/references/plugin-development.md:13`、`[DH]/packages/bundle/web-app/cordis.patch.yml:576-583`。**保留** `command-compact`（`[DH]/packages/bundle/base/cordis.patch.yml:358-359` 明写 backend-independent）与 `tool-result-pruner`（要求 4）。

### 7.5 durable 协议（强制复用，不得自造）

| 项 | 必须 |
|---|---|
| 事件 | `compaction/start` / `compaction/summary` / `compaction/end`（+ 可选 `compaction/prune`） |
| surface 变更 | 一条 `user/message`，`surfaceOp:{op:'replace',startSeq,endSeq}`，`source: compactCheckpointSource(compactionId, sourceCommandId?)` |
| 摘要 framing | `frameSummary()`（`<compacted-summary>` 标签，`summarizer.ts:22-23,188-193`） |
| 边界检查 | `toolPairingBalancedBefore/After`（`compaction/src/index.ts` 导出） |
| 锁 | 未配对 `compaction/start` = busy；`compaction/end` 最后释放 |
| 摘要调用 | 单次 `ctx.llm.stream({provider, model, purpose:'compaction', signal, …})`，**省略 `max_tokens`/`max_output_tokens`**（no-cap，D5）；incomplete/partial 不采用 |
| 计费 | 选项对必须是已注册 LLM 路由；PUT 时用 `ctx.llm.resolveModelInfo` 校验 |
| 原文 | 被 shadow 事件留在 raw log，不删除、不覆盖 |

### 7.6 触发与状态机（P3 冻结）

```
计量（session/event / turn-end，一条公式）
  ├─ fill < B                     → NOOP
  ├─ B ≤ fill < S 且无 active     → 后台 bracket（agent.runMaintenance）
  │     ├─ ready + observed ≤ H   → HEALTHY adoption（下一请求 assembly）
  │     ├─ ready + observed > H   → deferred full intent（D4）
  │     └─ degraded/timeout       → 旧 surface 存活，当前 turn 不判红
  ├─ fill ≥ S                     → 阻塞 full（compactNow）
  └─ CONTEXT_WINDOW_EXCEEDED      → 宿主 overflow recovery 兜底
```

- 一 session 只允许一个 active compaction；typed reason 封闭登记表（E4 / FT-O9）。
- failure/degraded/unknown **不创建 FULL intent**、不自动 retry 到成功、不因失败推导 FULL（D1 / Y12）。
- 一 episode 一只 physical summarizer attempt；首次 typed transient → 下一 durable external turn 允许一只新 episode；第二次连续 → session circuit open。
- 触发条件闭集：只允许水位分布 + 已登记状态；时间 / 空闲度 / 成本 / cache-rate / 测试 lease 一律非法（D3 / FT-O2、FT-O7）。

---

## 8. 分阶段执行计划

| Phase | 目标 | 关键动作 | 验收 / 闸门 |
|---|---|---|---|
| **P0 Spike（只读 + 可弃最小实验，不动任何交付物）** | 回答 5 个未知 | **S0.1** 用 `ELECTRON_RUN_AS_NODE=1 "$DSH_NODE_EXECUTABLE"` 验证 profile-installed JS bundle 能否 `import '@deepseek-ai/dsh-compaction'` / `@deepseek-ai/cordis`（已实测：`require.resolve(..., {paths:[插件目录]})` → `MODULE_NOT_FOUND`；`{paths:[DSH_INSTALL_DIR]}` → 成功解析到 `app.asar/.../dsh-compaction/lib/index.js`，故**待验证**）；**S0.2** `dsh --profile <dev> --dump-config` 打印合成 entry tree，定位 web/desktop 下 `compaction-basic` 的真实作用域与 id（注意 base flat 行已被 `web-app` patch disabled，真 provider 在 4 个 preset group 内）；**S0.3** 验证用户 bundle patch 能否以 `- id: compaction-basic; disabled:true` 命中 group 内行、能否 `insert` 进 `id: compaction` group、`/compact` 是否解析到新 provider；**S0.4** 验证 `ctx.tokenMeter.measure` / `agent.runMaintenance` / `agent.followup` 在 host-plane 可取，以及 isolate realm 内的 `ctx.compaction` 访问路径；**S0.5** 复核 rc.3 安装版与 rc.2 检出在 compaction 上无差异（已逐字节比对通过） | 5 项全部有 `file:line` 或命令输出证据；任一失败 → 架构 B。**不写任何交付物** |
| **P1 策略真源（纯函数，零宿主 API）** | 落地 B/H/S/pinned/DC 概念 | `lib/compact-policy.js` + `test/compact-policy.test.mjs`：§7.1 schema、§7.2 不变式、effective pin、单一填充分数、状态文件原子读写（不覆盖已有文件） | `node --test` 全绿；植回非法序 / DC 命中 / 15% clamp 边界 / 第二公式必红 |
| **P2 组合层接管（不含调度）** | 让 `/compact` 走我们的 provider | 按 S0.3 结论写 `cordis.patch.yml`；`lib/host-compaction.js` 最小子类：三方法先委托/复用出厂 region 逻辑，只替换触发策略；`dsh-dev` 重启 + 强刷；`--dump-config` 复核行状态 | `/compact` 成功且 Session log 出现标准 bracket + `surfaceOp.replace` + `compactCheckpointSource`；`tool-result-pruner` 行仍在；`enabled=false` 时宿主默认压缩恢复（D2） |
| **P3 水位调度 + async + full 兜底** | 要求 1/2/4 的机制主体 | `lib/compact-scheduler.js`：§7.6 状态机；`≥B` 排 `agent.runMaintenance` 后台 bracket（不等当前 turn，下一 prompt 前 settle）；`≥S` 或 overflow → 阻塞 `compactNow`；失败保留旧 surface、不判红当前 turn；one-active / epoch / typed reason | 长会话实测：B 触发、S 兜底、degraded 时主线继续、原文不丢；边界 B−1/B/B+1、S−1/S；抓毫秒级时序（C3） |
| **P4 指定压缩模型 + durable 协议收口** | 要求 1 的模型面 | UI 下拉复用 `/nano-model-selector/catalog`（`[DNMS]/index.js:90,93`），PUT 时 `ctx.llm.resolveModelInfo` 校验 (provider,model) 已注册；`ctx.llm.stream({provider,model,purpose:'compaction',signal})`，no-cap、incomplete/partial 不采用；`compaction/summary` 记录 provider/model | 换模型后摘要事件的 `provider/model` 与选择一致；空/非法模型 fail-closed 且不改状态；E2 端到端 enforcement 验证 |
| **P5 按钮与设置面板** | [业主] 明确要的按钮 | rail 第 4 图标 + `filter='compact'` 面板：enable switch、模型下拉、B/H/S、pinned、有效值与当前填充率、上次压缩状态；`GET/PUT /nano-model-selector/async-compact`；先在 `[ROOT]/security/route-sensitivity.json` 登记再 `npm run build`；i18n 两组 + icon | `[DNMS]/AGENTS.md:67-74` 四步 + 新增：PUT→重启前后值一致、localStorage 只是缓存、裸 curl 被拒、guard 三态无 drift |
| **P6 集成 / 登记 / 交付** | 收口 | 在 `[DNMS]/AGENTS.md` 登记「compaction 接管合同」（D1–D6 裁决、被禁用宿主行、路由表、状态文件、卸载行为）；`[SPEC]/README.md` 陈旧项同步（C4/§0.4）；`npm run build` 后确认 `lib/` 非空；`git diff --check`；合并回指定分支后按 [业主] 要求删除 worktree | 不新设 release gate；不发布未经 [业主] 允许的 release；**不重启 dsh.local**，只在 `dsh-dev` 验证 |

---

## 9. 验收清单

复用 `[DNMS]/AGENTS.md:67-74` 四步（前一步失败即停，不换 profile 重试；失败先看 `.plugin-manager/logs`），并新增：

1. `dsh --version` 落在 `[DNMS]/package.json:30-32` 的 `engines.dsh` 内；profile 的 `dependencies` 与 `dsh.profile.bundles` 都有本包名。
2. 重启 + 强刷后 client 模块在页面里；`.nms-trigger` 出现；rail 首排变「全部 / 收藏 / 媒体生成 / **压缩**」。
3. `GET /nano-model-selector/catalog` 200；`GET/PUT /nano-model-selector/async-compact` 在**已登录页面**内 200/400 符合契约；裸 curl 被拒属正常（`[DNMS]/AGENTS.md:74,103,148`）。
4. **E2 enforcement**：PUT 改 B 后，长会话的 arm 时点确实随新 B 变化（抓 `compaction/start` 的 `totalTokens`），不是「存了但没读」。
5. `enabled=false`：宿主默认压缩仍工作（`/compact` 成功、标准 bracket 在）。
6. `enabled=true`：`/compact` 与自动压缩都走我们的 provider；`compaction/summary.provider/model` 等于所选；`tool-result-pruner` 行仍挂载；micro 行为未变。
7. 长会话：B 触发后台摘要、S 触发阻塞 full、degraded 时主请求与 turn 继续、原文 raw log 未删；语义成功 = completed + ready + 非空 ref + 非 recovery（B2/B3）。
8. 毫秒级时序（C3）：freeze 早于 background call；主 dispatch 不等 summary；主线在 async 运行期继续；degraded 不把 turn 判红。
9. `npm run build` 后 `lib/route-table.js` / `lib/route-guard.js` 与 ledger 一致（C2）；`node --test` 全绿；`git diff --check` 干净。
10. **不在 dsh.local（生产）执行任何重启或安装**；全部验证在 `dsh-dev`（D5）。

---

## 10. 风险登记

| ID | 风险 | 缓解 |
|---|---|---|
| R1 | `ctx.compaction` 在 preset `isolate` realm，全局插件不可见；web profile 有 `standard/minimal/ptc/presets/cordis.patch.yml` **4 个** `id: compaction` group | P0 S0.2/S0.3 用 `--dump-config` 定位；必要时逐 group override 或统一改 group `config`；不靠猜 |
| R2 | profile-installed JS bundle **可能**无法 import `@deepseek-ai/dsh-compaction`（见 P0 S0.1 实测）；现有 6 个 nano 插件无一 import 出厂包 | P0 S0.1 实测；失败 → 架构 B，或在正确 realm 内 `ctx.provide('compaction', …)` |
| R3 | 插件不得新增 session event type；自定义 durable 格式会让 Session 无法 reopen | 强制复用 §7.5 协议；单测快照校验 |
| R4 | 静态 `disabled:true` 与「运行时启用/关闭」冲突 | 推荐「provider 常驻，`enabled` 在 provider 内部切换策略」；D2 定语义；若必须静态切换则明确写入 AGENTS.md 需重启 |
| R5 | 改 patch 是 profile 级行为，影响该 profile 全部会话；更高优先级 layer 可能 `overridden` | 只在 `dsh-dev` 验证；`--dump-config` 复核 `enabled/fiberPhase`；登记到 `[DNMS]/AGENTS.md` |
| R6 | 安装版 rc.3 vs 检出 rc.2；`engines.dsh >=0.2.2-rc.1 <0.3.0` | 已逐字节比对 13 个核心文件 + base patch 全同；P0 S0.5 留证；不改 `engines`（`[DNMS]/AGENTS.md:142`） |
| R7 | 摘要模型不可用 / 凭据缺失 / provider incomplete | fail-closed 且不改状态；degraded 保留旧 surface、当前 turn 不判红；`compaction/summary` 诚实记录（D5） |
| R8 | 接管后 KV cache 从首个 shadowed token 起失效；摘要 prefix 复用被破坏 | 沿用宿主 `summarize()` 的 warm-prefix 重放（`[DH]/packages/compaction/compaction-basic/README.md:129`）；不改写 framing |
| R9 | micro 被误动 / `/compact` 失效 | patch 明确保留 `tool-result-pruner` 与 `command-compact`；P2 验收逐项断言 |
| R10 | 卸载后状态文件遗留；`enabled=false` 时若宿主默认压缩未恢复会出现「无压缩」空窗 | 沿用 `[DNMS]/AGENTS.md:65,116` 卸载不删约定；P2 验收强制验证 D2 回退 |
| R11 | 设置 UI 写入但 runtime 不读（E2）/ 栅格旁路（E3） | P1 每条写路径校验；P5 验收第 4 项端到端 enforcement；clamp 进 durable audit |
| R12 | 双币种计量 / 第二分母（B1、E1） | §7.2 单一公式；禁止 `effective_window` / `sweet_spot` 类 model-specific 阈值 |

---

## 11. 事实核查附录（claim → file:line 索引）

> 三路只读核查：[DNMS] 15 组、[dsh] 宿主 40 条（35 PASS / 5 CORRECTION / 0 FAIL）、[nano-agent] 23 条踩坑。以下为承重断言的索引；订正见 §0.3。

### 11.1 [DNMS]

| 断言 | 证据 |
|---|---|
| 身份表 / 仅 web / inject | `[DNMS]/AGENTS.md:11-18`；`package.json:38` |
| 装好标志（原文） | `[DNMS]/AGENTS.md:5` |
| 单列 rail + 三按钮 + 分隔线 | `src/client/ModelSelector.jsx:693-728`；`src/client/styles.js:49-51,61`；`AGENTS.md:73,97` |
| `apply` / `name` / `inject` / 3 路由注册 | `index.js:11,13,226-238` |
| 状态文件 / TTL / catalog 三方法 | `index.js:34-38,41,55,61-62,90,93` |
| `ctx.skills.register` 运行时技能 | `index.js:172-189`（核心 `:180-185`） |
| media GET/PUT / readBody / refresh | `index.js:148-163,198-223` |
| 无宿主 Config / 状态文件 / localStorage 缓存 | `AGENTS.md:112-118`；`src/client/media.js:3,20,24-48` |
| 新路由须登记 ledger + build | `scripts/build-client.mjs:18-36,84-88`；`lib/route-guard.js:92,95,104,111`；`[ROOT]/security/route-sensitivity.json:2-4,306-345` |
| i18n 硬编码 / locale 仅 meta | `src/client/i18n.js:40-48,86-94`；`locale/*.json:2-5` |
| 测试用 `node:test` | `test/imagine-inject.test.mjs:15-16` |
| README 符号链接且陈旧 | `git ls-files -s` mode `120000`；`[SPEC]/README.md:7-8,17,37-39,50,56-57` |
| [DNMS] 子树干净 / 全仓动态状态 | `git status --short -- dsh-nano-model-selector/`（空）；核查时点 `HEAD=f8fda5c` 且全仓有 2 项未提交，落盘时 `HEAD=97f4921`、全仓仅本文未跟踪（见 C4） |

### 11.2 [dsh] 宿主

| 断言 | 证据 |
|---|---|
| session log 唯一真源 / 插件内存是派生缓存 | `[DH-DOC]/references/practices.md:7`；`[DH]/docs/subsystems/session.md:5,598,788` |
| 不得新增 event type | `[DH-DOC]/references/practices.md:21` |
| waterfall `next()` / section / inject / agent-request 只读 | `[DH-DOC]/references/practices.md:16,18` |
| timer 必须 `followup()`；等 durable 事件 | `[DH-DOC]/references/practices.md:26,28,29` |
| 不自写 patch / configEditor / volatile | `[DH-DOC]/references/configuration.md:3-12`；`[DH]/packages/boot/config-editor/src/index.ts:87-103` |
| index.js 二选一导出 | `[DH-DOC]/references/host-plugin.md:60-65` |
| patch 方言 / disabled / isolate | `[DH-DOC]/references/composition-reference.md:9-10,16,18`；`references/plugin-development.md:13` |
| capability seam / 三方法 / 单实现 | `[DH]/docs/subsystems/compaction.md:5,11,84,147,260-278`；`packages/compaction/compaction/src/index.ts:119-122,136,162,187` |
| 自定义 backend 合法 | `[DH]/packages/compaction/compaction/README.md:32,40-47,51,95,159,171-173` |
| 配置表 / 公式 / auto:false / summarize hook / Dev Note | `[DH]/packages/compaction/compaction-basic/README.md:64,66-78,88,117,261-273`；`src/config.ts:20,23,75-79,105-108,191-204`；`[DH]/docs/config-catalog.md:786-823` |
| 三自动监听 / inject / runMaintenance | `[DH]/packages/compaction/compaction-basic/src/index.ts:113,139,157,183,213,270,414` |
| 4 个 log-only 事件 / CompactionResult | `[DH]/packages/compaction/compaction/src/types.ts:24,34-67,69-72,74-82,94-120` |
| bracket 写入序列 / checkpoint / framing | `src/region.ts:173,210,235-237,491,506-507`；`src/checkpoint.ts:33,49`；`src/summarizer.ts:22-23,188-193`；`src/region.ts:24,411` |
| 单次 `ctx.llm.stream` / purpose / 拒图 | `[DH]/packages/compaction/compaction-basic/src/summarizer.ts:32,152-163,168,217-220` |
| `/compact` backend-independent | `[DH]/packages/compaction/command-compact/src/index.ts:12,67`；`[DH]/packages/bundle/base/cordis.patch.yml:352-361` |
| web-app 禁用扁平行 / token meter 留 host plane | `[DH]/packages/bundle/web-app/cordis.patch.yml:569-583` |
| preset isolate group | `[DH]/packages/bundle/web-app/presets/standard.patch.yml:72-88`；`compaction-tool-result-pruner/src/config.ts:10-14` |
| `ctx.set/provide` 限制 | `[DH]/docs/cordis-api/context.md:267-268,294-295,299,301` |
| loop request deep-frozen | `[DH]/docs/subsystems/llm-streaming.md:803,1245-1250` |
| model-visible means logged / agent.inject | `[DH]/docs/architecture.md:9,130,161` |
| tokenMeter.measure / totalTokens | `[DH]/packages/llm/token-meter/src/index.ts:87,151`；`src/types.ts:22-30` |
| runMaintenance 要求 idle | `[DH]/packages/core/agent/src/runtime-types.ts:232`；`packages/core/agent-loop/src/agent.ts:204-205` |
| compaction/* 是 session events | `[DH]/docs/user/develop/framework/events.md:106` |
| 无 beforeCompact/afterCompact/registerSummarizer | 全仓 grep 0 命中；rc.3 编译 `dsh-compaction/lib/index.js` 通读；U1 |

### 11.3 [nano-agent]（见 §3 逐条）

| 集群 | 主要证据 |
|---|---|
| A（未接线 / 幻影） | `workers/context-core/src/async-compact/index.ts:4-8`；`types.ts:6`；`4th-wave/state-of-async-compact.md:15,162,244,391`；`5th-wave/GTY7-fixing-bugs.md:21,95-96,269`；`6th-wave/.../truth-01-async-compact.md:249,444,458` |
| B（计量 / 假绿） | `5th-wave/state-of-async-compact-after-GTY8.md:230,240,242,255-277,321,396`；`GTY9-reference-anchor.md:19,104`；`truth-01-async-compact.md:320,443,455,459,291-302,457` |
| C（durable / 时序） | `state-of-async-compact-after-GTY8.md:61,85,253`；`GTY9-checkpoint-first-async-compact-closure.md:12`；`truth-01-async-compact.md:161-184,358-383,446-460` |
| D（治理 / 法则） | `truth-01-async-compact.md:531-569`；`docs/truth/context/frozen/individuals/async_failure_and_successor.md:18,30-37,41`；`index.md:30-34,39,43`；`implementation-state-register.md:7,14,31,50-51`；`compaction_decision_law.md:18,30-35,39-44,50-92`；`watermarks_and_availability.md:18,30-36,54-60,66-67,138,160,173`；`compact_wire_policy.md:18,45,51-54,66-69`；`compaction_llm.md:18,28-29,43,49`；`scripts/checks/durable/compaction-truth-single-writer.mjs:3-14`；`test/shared/frozen-law/compaction-decision.test.mjs:1-11`；`4th-wave/specs/frozen-truth-and-terms.md:1-15` |
| E（政策 / 旁路） | `4th-wave/reference-anchor-on-compaction-triggers.md:60-61`；`frozen-truth-and-terms.md:79,558`；`MCCM2-...-sweet-spot-buffer.md:1-5,23`；`docs/truth/context/frozen/individuals/checkpoint_and_episode.md:74`；`docs/truth/context/frozen/code-verification-ledger.md:382`；`workers/context-core/src/budget/compaction-policy-live.ts:1-12,102-113`；`4th-wave/pre-charter-qna.md:67,69`；`watermarks_and_availability.md:118`；`budget/async-arm-decision.ts:1-7,31-34,50-54`；`orchestrator-core/src/entrypoint/context-rpc/auto-arm.ts:501-549,862-870,970`；`test/release-gates/tg8-compact-authority-single-owner.gate.test.mjs:94,238-241` |
| F（术语） | 全仓零命中；`docs/eval/product-enhancement/owner-cared-topics-analysis-by-opus.md:29,33,60,337`；`test/shared/gsth/journey/lane-isolation.test.mjs:54`；`truth-01-async-compact.md:111,198,383` |

### 11.4 本仓硬闸门

| 断言 | 证据 |
|---|---|
| [业主] 最高权限 / [真相层] 定义 / [DNMS] 登记 | `[ROOT]/AGENTS.md:12,19,27` |
| 七条核心原则 | `[ROOT]/AGENTS.md:36-42`（该表在本文撰写期间因新增 `[DNCS]` 于 `:31` 而下移一行；早期采样为 `:35-41`，已按落盘时 51 行版本更新） |
| 四份总索引 | `[ROOT]/AGENTS.md:5-7`（README/RELEASE/INTRODUCTION/TEMPLATE 均存在） |
| [DNMS] 只处理本包 / 不把 context 当安装步骤 | `[DNMS]/AGENTS.md:3-4,150` |
| 安装 / 验收 / 不要 | `[DNMS]/AGENTS.md:49-74,145-150` |

---

## 12. 不在 v1 范围

- 不接管 micro（`tool-result-pruner` 一行不改）。
- 不新增 session event type、不复制会话状态、不自写 profile `cordis.patch.yml`。
- 不引入 `Config` schema / 原生 Settings 面板（D6，v2）。
- 不实现 [nano-agent] 的 D1/Queue/cron/epoch-guard 全套；只借语义，调度用 [dsh] 原生 `agent.runMaintenance` + `ctx.timer`。
- 不新增 model-facing compaction tool（宿主 Dev Note 明确未决，且属扩约）。
- 不新设 release gate、不发布 release、不改 `engines.dsh`、不改三条 `file:` 构建期依赖。
- 不修改 `[SPEC]/README.md`（§0.4 记录其陈旧，P6 再同步）。
- 不在 dsh.local（生产）执行重启、安装或 profile 改写。

---

## 13. 修订历史

| 版本 | 日期 | 说明 |
|---|---|---|
| `0.1.0-draft` | 2026-11-14 | 首版：汇入 2026-11-14 [业主] 四条要求与按钮要求；完成 [DNMS] / [dsh] 宿主 / [nano-agent] 三路 `file:line` 事实核查（含 13 项订正、3 项 UNVERIFIED）；引入 [nano-agent] 23 条踩坑记录并转成 10 项防护设计；对照本仓七条硬闸门与 [DNMS] 自身合同；给出架构 A/B、精确契约、P0–P6 执行计划、验收与风险登记。待 [业主] 裁决 D1–D6。 |
