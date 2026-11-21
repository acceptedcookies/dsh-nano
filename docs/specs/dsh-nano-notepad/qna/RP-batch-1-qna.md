# RP-batch-1 QNA · [DNN] 渲染管线升级第一批次真相层决策册

> **范围（scope）**：锁定 `[DNN]`（`dsh-nano-notepad`）下一阶段工作 `RP-batch-1` 的基础架构与执行层 `[真相层]`；承接 [render-pipeline-1121.md](../render-pipeline-1121.md) 的吸收评估与分批台账，但**只以本册 §1 冻结的 `T-O-*` 为唯一生效口径**，供工作树内后续 `RP-batch-1` 正式计划唯一引用。
> **qna 位点**：`deep-dive`（渐进式：第 1 轮 × 2 题 `foundational` → 后续每轮 × 3 题 `executional`，直至执行层 `[真相层]` 全冻结）。
> **角色配置**：提问 `RP-batch-1 架构审查`；裁决 `[业主]`。`second-opinion` 自 Round 1 起 `retired`，不设 second-opinion 槽位。
> **下游消费者**：`RP-batch-1` 正式实施计划（工作树内计划 §2 直接引用本册 §1 冻结的 `T-O-*`）。
> **文档状态**：`已冻结`（2026-11-21；开轮基线 `T-O-1`–`T-O-4` 与 Round 1–3 全部 `T-O-5`–`T-O-12` 已冻结；全册审校无内部冲突与竞态遗漏，解锁 `docs/specs/dsh-nano-notepad/plan/RP-batch-1-plan.md` 撰写）。取证快照 `main@80b4057` + `context/t3code@c1464d6`（bare，`git show` 核验）。

---

## 0. 分轮状态总览

| 轮次 | 题号区间 | 焦点 | second-opinion | 状态 |
|---|---|---|---|---|
| Round 1 | `Q1–Q2` | `foundational`：mirror 渲染结构总路线（单轨增量 DOM 硬切）与异构计算边界（静态 worker 卸载范围） | `retired` | 已冻结，2/2 已答 |
| Round 2 | `Q3–Q5` | `executional`：worker 协议与降级语义 / mirror 参数化规格 / 观测收敛与缓存边界 | `retired` | 已冻结，3/3 已答 |
| Round 3 | `Q6–Q8` | `executional`（收口轮）：构建/交付口径、验证矩阵与性能验收红线、收口文档与 F9 衔接 | `retired` | 已冻结，3/3 已答 |

本册题号自 `Q1`、Truth-ID 自 `T-O-1` 起编，按轮次 append 续编、不回收。Round 1–3 共 8 题已全部完成渐进冻结，共沉淀 `T-O-1`–`T-O-12`。

---

## 1. ★ Truth-Gate 台账（已锁定真值 · NORMATIVE · append-only across rounds）`[核心·锁死]`

> **渐进引擎**：每轮 `[业主]` 答复即固化为编号 `T-O`，作「下游唯一口径 + 下一轮提问约束」。[render-pipeline-1121.md](../render-pipeline-1121.md) §4/§9 的待决项与评估草案仅作提问输入引用，不自动成为 `[真相层]`；冲突一律以本台账最新 `T-O-*` 为准。

| Truth-ID | 子类型 | 已锁定真相（一句话 + 硬约束）| 来源（Round / Q） | 驱动了哪些后续题 | 下游约束 |
|---|---|---|---|---|---|
| `T-O-1` | `foundational` | **阶段锁定 `RP-batch-1`，纯渲染性能/稳定性治理，零功能新增**：全部改造严格限定在 `dsh-nano-notepad` 自身（`src/client/**`、`lib/fx/` 静态资产、`src/perf/`、测试与构建脚本），目标是吸收 `t3code` 核验过的「增量 DOM + Worker 异构 + 缓存边界 + 观测收敛」工程；不做任何新用户功能、不改 IndexedDB schema（schema 4 冻结）、不改既有 15 条 `dnn.*` 路由语义，严禁向 `[DNEE]`/`[DNPR]`/其他插件扩展职责。 | 开轮基线 / `[业主]` 既定心智模型 `MM1`、`MM5`；[render-pipeline-1121.md §0.3、§4](../render-pipeline-1121.md) | `Q1`、`Q2` | 任何超范围的顺手重构（新功能、schema 变更、跨插件改造）一律不混入本批；`np-to-notepad` 卡片按钮维持 `main@80b4057` 已交付状态，本批不返工。 |
| `T-O-2` | `foundational` | **UI 宿主优先与零宿主 DOM 嫁接**：全部 DOM/CSS 改动只发生在 `.np-*` 自有命名空间内（`.np-mirror`、`.np-read`、`.np-nodes` 等）；`ctaWatch` 继续只读观察宿主结构（`[data-changed-files]` 卡片）并注入自有 `.np-to-notepad` 按钮，不新增任何宿主内部选择器嫁接（`[class*=…]`、`:has()` 套宿主结构、哈希类发现）。 | 开轮基线 / `[业主]` 既定心智模型 `MM6`；[DESIGN.md](../../dsh-nano-ui/DESIGN.md)；[AGENTS.md:46](../../../../AGENTS.md) | `Q1` | mirror/preview/tree 的结构变更不引入对外部宿主 DOM 的新依赖；`content-visibility` 等 CSS 只作用于 `.np-read` 自有块。 |
| `T-O-3` | `foundational` | **软件异构 + 增量结构优先，GPU 文本渲染一票否决**：本批渲染优化以 Worker 卸载、增量 DOM、缓存边界、观测收敛为手段；WebGPU/WebGL/Canvas 渲文本永久排除（`context/t3code` 全量 0 处 WebGPU/WebGL 文本渲染，其 `OffscreenCanvas` 仅用于图片/Office 二进制解码）；原生文本划选、IME、`Cmd+F`、读屏语义与 mirror↔textarea 像素对齐为不可牺牲硬约束。 | 开轮基线 / `[业主]` 既定心智模型 `MM2`–`MM3`、`MM7`；[render-pipeline-1121.md §1.3、§4.3](../render-pipeline-1121.md) | `Q1`、`Q2` | 性能验收以 `perf-review` 已注册 span（`highlight`/`highlight-dom`/`render`/`keystroke-input`/`draft-commit`）量化，不接受「感觉更快」；任何牺牲原生文本交互的方案直接出局。 |
| `T-O-4` | `foundational` | **长期治理与缓存即凭证铁律**：一切执行服从「能硬切就不要双写、能彻底退役就不要提供兼容、各插件保持功能与协议中立、不得构建专用耦合协议或通道」；所有缓存（`renderCache`/`peekCache`/mirror 行态/node→imageIds）都是 consumption receipt（content-hash/版本键），永不升格为可恢复真源；`md5` etag 契约已落库不可换算法；不新增 RPC 语义、error 枚举、inject 面。 | 开轮基线 / `[业主]` 既定心智模型 `MM4`；[AGENTS.md 核心工作原则](../../../../AGENTS.md) | `Q1`、`Q2` | 禁止新旧渲染实现长期并存、禁止双份可写状态；worker 内不复制第二份独立实现的算法（与主线程共享同一 `src/client/*.js` 纯函数模块）。 |
| `T-O-5` | `foundational` | **mirror 单轨硬切 `display:contents` 行包装 + 脏行段增量 DOM**：`.np-mirror` 改为 N 个 `display:contents` `<span data-l>` 行包装 + N-1 个行间 `\n` 裸文本节点；`state.mirrorLines`/`mirrorFence` 求公共前后缀得脏段 `[lo,hi)` 逐行最小替换，fence 边界变化下延；`highlightSource` 拆出行级入口（同一实现，非第二套）；`paintMirror` 函数体内保留「非增量可判 → 整层 `innerHTML` 一次性回写」的回退分支，**旧全量路径删除、零并存开关、零虚拟化丢 DOM**。 | Round 1 / `Q1`，`[业主]` 同意 A 全部推荐（2026-11-21） | `Q3`、`Q4` | `.np-mirror span` 追加 `display:contents`（[panel.js:476](../../../../dsh-nano-notepad/src/client/panel.js#L476)）；行间 `\n` 必须是裸文本节点；验收红线 = mirror↔textarea 逐行像素对齐（wrap on/off、空行、ZWSP、长行 wrap、fence 嵌套），`highlight-dom` span 在 28KB 连续打字下降一个数量级。 |
| `T-O-6` | `foundational` | **异构边界：`lib/fx/np-render-worker.mjs` 静态资产卸载纯函数渲染计算，F9 归 batch-2**：esbuild 第二入口产出 worker，与主线程 `import` 同一 `src/client/highlight.js`/`json.js`/`markdown.js` 纯函数（零第二实现）；走既有 `dnn.fx.sdk` **prefix** 路由（[bindings.js:18](../../../../dsh-nano-notepad/lib/bindings.js#L18)）+ `package.json` `files` 已含 `lib/fx` → **零新路由、零 bindings/安全清单变更**；`sanitizeRichHtml`（DOMParser）、`md5Hex`（postMessage 不划算）、`exportToS3`（低频）不卸载；fx-core.wasm 引擎 worker 化（F9）整项归 batch-2 保留编号。 | Round 1 / `Q2`，`[业主]` 同意 A 全部推荐（2026-11-21） | `Q3`、`Q4`、`Q5` | 禁止 `blob:`/`data:` 内联 worker（有真源静态通道）；worker 与主线程共享同一模块源码不得复制实现；卸载协议自研最小集（`{id,op,payload}`），不照搬 `hast-ops-v1`。 |

| `T-O-7` | `execution` | **worker 调度粒度与降级语义**：`highlightSource` 分态——冷启动/整层回退走 worker（O(文档) CPU 卸载），逐键脏段留主线程行级入口 `lineHtml`（T-O-5 已拆同一实现）；`validateJson`/`renderJsonTree`/`renderMarkdown` 全走 worker；worker 协议 `{id, op:'highlight'\|'jsonTree'\|'jsonValidate'\|'markdown', payload}` → `{id, ok, html\|tree\|valid}`；markdown 走 `notepad-image:` 占位符协议，`images` Map 不进 worker；懒构造 + 单调 `requestId` 作废旧响应 + 构造失败/超时回退本地同函数（非第二实现）；面板常驻不空闲回收，destroy 时 `terminate()`。 | Round 2 / `Q3`，`[业主]` 同意 A 全部推荐（2026-11-21） | `Q6`、`Q8` | worker 源码位于 `src/worker/np-render-worker.js`，`import` `../client/highlight.js`/`json.js`/`markdown.js`；esbuild 产物 `lib/fx/np-render-worker.mjs` 进 `files`；逐键路径不得 postMessage（保证染色本帧到）。 |
| `T-O-8` | `execution` | **mirror 参数化规格**：`LINE_TINT_CAP = 4_096`（单行超长整行走纯 `escapeHtml`，封死 min.js 敞口）；`inFence` 用 O(N) `line.trimStart().startsWith`（三反引号 fence 标记，非正则）逐行推进；整层回退触发线 = 脏段行数 `> max(100, totalLines×0.5)`；`data-np-image` 扫描范围跟 DOM 重建范围（增量=脏段行节点、回退=全层）；`hideImagePeek` 逻辑不变。 | Round 2 / `Q4`，`[业主]` 同意 A 全部推荐（2026-11-21） | `Q6`、`Q8` | 测试断言：5KB 单行不产出 token span；fence 切换行以下行重染；脏段超阈值走整层分支。 |
| `T-O-9` | `execution` | **观测收敛与缓存边界**：`ctaWatch` 保 `document.body` `{childList:true,subtree:true}` + 回调 `requestAnimationFrame` 合批（N 次 mutation → 1 次 `attachNotepadCtas`）；`applyCopy` 按 `language.current()` 版本、`renderTree`（[panel.js:1646-1743](../../../../dsh-nano-notepad/src/client/panel.js#L1646-L1743)）按 `nodes` 字段签名（`id:name:pinned:parentId:workspaceId:cat` + `kindFilter()` + `state.collapsed` 集合内容）、`renderTabs` 按 tabs 数组签名做内容脏检跳过（零漏点正确性，不用 rev 计数器）；`renderCache` 双界 `64 条 + 32MB`、`peekCache` `8 条 + 40MB`（approximateSize，单条超限拒收，`lruCache.ts:26-28` 同构）；`pruneImages`/`stampContentMd5`/`saveDraft` 用会话内 `Map<key, imageIds[]>`（key 含 draft md5）避免 `imageIdsIn` 重扫，不持久化。 | Round 2 / `Q5`，`[业主]` 同意 A 全部推荐（2026-11-21） | `Q6`、`Q8` | 禁止收窄 observe 目标到宿主锚点（`[data-conversation-scroll]` 假设）；禁止持久化 `imageIds` 字段（触 T-O-1 schema 红线）；签名不等才写 DOM。 |

| `T-O-10` | `execution` | **构建与交付口径**：`scripts/build-client.mjs` 复用既有 `build()` 追加一次调用产 `lib/fx/np-render-worker.mjs`（`entryPoints:['src/worker/np-render-worker.js']`，`bundle:true, format:'esm', platform:'browser'`，无额外 `define`/externals——worker 不需要 `__NOTEPAD_VERSION__`/`dnprDefine`）；`package.json` `version` `0.2.0 → 0.3.0`（`engines.dsh` 不变）；单语义 worktree `.agents/worktrees/rp-batch-1-render-pipeline`，合并回 `main` 后按 [业主] 要求删除；同次提交同步 `dsh-nano-notepad/AGENTS.md` 交付物表 `lib/fx/` 行（`vendored fx runtime` → `vendored + 构建产出 render worker`）与 `docs/specs/dsh-nano-notepad/README.md`。 | Round 3 / `Q6`，`[业主]` 同意 A 全部推荐（2026-11-21） | `RP-batch-1-plan.md` | `lib/fx/` 产物必须由构建脚本产出（不得手工写入）；tarball `files` 已含 `lib/fx` 零清单变更。 |
| `T-O-11` | `execution` | **验证矩阵与性能验收红线**：纯 `node:test`（与既有 13 suite 同纪律，不引 DOM 库/重型框架）——`test/mirror-incremental.test.mjs`（输出结构 = N 个 `data-l` + N-1 个 `\n` 文本节点、脏行最小重写、超阈值整层分支）、`test/render-worker.test.mjs`（协议 round-trip、requestId 乱序丢弃、构造失败回退本地同函数）、`test/observation-convergence.test.mjs`（签名相等即 skip、双界拒收/逐出、imageIds Map 命中不重扫）、`test/line-tint-cap.test.mjs`（5KB 行无 token span）；`nue-migration` 零模式断言不动；`./lab/baseline/baseline.json`（仓根）追加 `rp-batch-1` before/after 基线行（`highlight`/`highlight-dom`/`render`/`keystroke-input`，无阈值闸门）；dev 实例人工验收 mirror↔textarea 像素对齐（wrap on/off、空行、ZWSP、长行、fence 嵌套）。 | Round 3 / `Q7`，`[业主]` 同意 A 全部推荐（2026-11-21） | `RP-batch-1-plan.md` | 不新增 Playwright/jsdom；不新增 release-gate/`budgets` 硬闸门；mirror 像素对齐只能人工验收（jsdom 无 layout）。 |
| `T-O-12` | `execution` | **收口文档与 F9 衔接**：`render-pipeline-1121.md` 状态 `draft → frozen`（本册 T-O 为生效口径），§9 四项待决标注「已裁」并留痕（Q1/Q2 消解路由与 F9 边界、Q4/Q5 消解参数与观察目标）；`docs/specs/dsh-nano-notepad/plan/RP-batch-1-plan.md` 新建为唯一正式计划（§2 引用 `T-O-1`–`T-O-12`，`draft` 经 [业主] 批准转 `reviewed` 后开工）；spec §4.2 保留 `B1-B6`/`F9` 编号注明「待 [业主] reopen」不删；`README.md`/`AGENTS.md` 同次同步。 | Round 3 / `Q8`，`[业主]` 同意 A 全部推荐（2026-11-21） | `RP-batch-1-plan.md` | spec 不留「待决」误导、batch-2 不丢编号、文档与产物单一真源。 |

（Round 3 冻结行已入账，本册 T-O-1~T-O-12 完整）

---

## 2. Round 1 —— `foundational`：mirror 渲染结构总路线与异构计算边界（`Q1–Q2`）

本轮 `second-opinion` 为 `retired`，由 `[业主]` 直裁。Round 1 聚焦决定 `RP-batch-1` 全部上层结构的两个根基问题：**`Q1` 定 mirror（编辑器染色层）的渲染结构路线**——这是本批价值最高、风险最集中的改动，决定后续脏段算法、worker 协议粒度与测试形态；**`Q2` 定异构计算（Worker 卸载）的范围与资源形态**——决定 `lib/fx/` 静态资产的扩展边界与主线程卸载的收益兑现方式。两题可独立作答，不以一题推荐为另一题前提。

---

### Q1 — mirror 染色层的渲染结构：单轨硬切 `display:contents` 行包装 + 脏行段增量 DOM，还是保守的行缓存 + 单次 `innerHTML`？

**驱动真相**：`T-O-1`（本批核心目标）、`T-O-3`（增量结构优先 + 像素对齐硬约束）、`T-O-4`（能硬切就不要双写）。来源：[render-pipeline-1121.md §2.1 H1、§4.1 F1、§5](../render-pipeline-1121.md)；`t3code` `apps/web/src/lib/incrementalHighlighting.ts:57-107`。

- **影响范围**：`src/client/panel.js:1187-1230`（`paintMirror`/`schedulePaintMirror`/`fitMirror`）、`src/client/highlight.js`（行级 API 重构面）、`.np-mirror` CSS 规则（[panel.js:473-476](../../../../dsh-nano-notepad/src/client/panel.js#L473)）、`renderBody` 调用链（[panel.js:1840](../../../../dsh-nano-notepad/src/client/panel.js#L1840)）、`test/` 新增结构断言、`src/perf/declaration.json` 既有 `highlight`/`highlight-dom` span 的验收口径。
- **为什么必须确认**：当前 `paintMirror`（[panel.js:1187-1203](../../../../dsh-nano-notepad/src/client/panel.js#L1187-L1203)）每帧 `highlightSource(全文)` + `layer.innerHTML` 全文重建 + `querySelectorAll('[data-np-image]')` 全扫 + `hideImagePeek()` + `fitMirror()` 6 次布局读写；代码内注释自己承认「a 28KB draft pays a full DOM rebuild per keystroke」。这是输入路径上唯一稳定帧级 O(文档) 开销，也是 t3code `a0ef9d8` 踩坑记录（虚拟化窗口破坏拖拽选区）与本仓 [highlight.js:117-119](../../../../dsh-nano-notepad/src/client/highlight.js#L117-L119)「A block per line grows a different line box」（块级行包装曾失败）两大风险同时命中的位置。**增量路线选定错了（比如再用块级 `div` 或丢 DOM 的窗口虚拟化）会重复踩已知的坑；而双轨并存违反 `T-O-4`**。此题只裁「结构路线与硬切边界」，行缓存键、脏段计算细节、inFence 传播等参数级问题留给 Round 2 `executional`。
- **当前建议 / 倾向**（`RP-batch-1 架构审查`）：选 **A**：**单轨硬切 `display:contents` 行包装 + 脏行段增量 DOM**，在同一 `paintMirror` 函数体内实现「增量优先、不可增量时整层回写」的单一路径（t3code `incrementalHighlighting.ts` 的 `code.startsWith(previous) else dispose` 同构），彻底删除旧全量路径，不保留「旧 paintMirror 开关」。
- **Reasoning**：`.np-mirror` 是纯表现层（`pointer-events:none`、`aria-hidden`、无事件），行包装只是 DOM 寻址手段；`display:contents` 不产生盒模型，与现状「单一 `pre-wrap` 文本流」在 inline flow 上像素等价，正中 [highlight.js:117-119](../../../../dsh-nano-notepad/src/client/highlight.js#L117-L119) 当年块级包装失败的对偶解——`div` 有盒模型，`display:contents` 没有。t3code 的 `a0ef9d8` 教训是「丢窗口外 DOM 破坏选区」，`display:contents` 方案**不丢任何 DOM**，选区由 textarea 渲染而非 mirror，天然免疫。「单一路径 + 内部全量回退分支」是 t3code 自己的模式（非前缀更新 → `dispose()` 全量回退），不是新旧两套并存，满足 `T-O-4`。
- **问题（请 [业主] 裁决）**：是否冻结「mirror 单轨硬切 `display:contents` 行包装 + 脏行段增量 DOM（函数内整层回退分支，无并存旧实现）」为 `RP-batch-1` 编辑器染色层的唯一结构路线？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意你在 [第1轮] 的全部推荐」），冻结为 `T-O-5`。

**【对本问题的解读】**
用户在 `.note.md`/`.json` 便签里连续打字时，每敲一个字符，mirror 层目前会把整篇文档（可至几十 KB）重新拼 HTML 字符串、整段 `innerHTML` 换掉、再全量扫图片占位、再做 6 次布局测量——其中 99% 的 DOM 内容其实逐字节未变。本题裁的是：把「变了的行」精确替换（增量 DOM，杀 DOM 重建成本），还是只优化「算 HTML 的 CPU」但保留每次整层 `innerHTML`（保守），还是干脆换更激进的结构（虚拟化/分块）。t3code 的 `incrementalHighlighting` 证明「stable 行保留节点身份、只重渲 unstable 尾部」是可工程化的；`a0ef9d8` 同时证明窗口虚拟化会破坏选区——DNN 的 mirror 与 textarea 叠加定位，选区风险更直接。

**【可选选项清单】**

| 选项 | 结构路线 | 得到什么 / 代价与长期治理评价 |
|---|---|---|
| **A（推荐）** | `display:contents` 行包装 `<span data-l>` × N + 行间 `\n` 文本节点；`state.mirrorLines`/`mirrorFence` 求公共前后缀得脏段 `[lo,hi)`，脏段内逐行比对 `html` 后最小替换；fence 边界变化下延；行数变化在脏段边界插入/删除行包装；非增量可判（文件切换、paste 整体替换、结构异常）走函数内整层 `innerHTML` 回退。**旧全量路径删除，零开关。** | 帧成本从 O(文档) 降为 O(脏段)：单行编辑 = 一次 `children[i].innerHTML` 写入；DOM 节点身份稳定使 `fitMirror`/选区对齐/图片 peek 逻辑不动。风险：`display:contents` 跨浏览器 layout 等价性需验收（Chromium/WebKit/Firefox 均支持 inline 场景的等价渲染）。**完全满足 `T-O-3/T-O-4`**。 |
| B | 保守 R0：`highlightSource` 改为行级 API + 行 HTML 缓存（`(text,inFence)→html` Map），渲染仍是单次 `innerHTML = 全量拼接`。 | 实现最小、零结构风险；但只杀 tokenizer CPU，**不杀 DOM 重建**——`innerHTML` 全量替换的 layout/style 重算成本才是帧耗大头（`highlight-dom` span 即此），28KB 文档下收益腰斩。属于「明知更大收益可达而取半」，不推荐作终态。 |
| C | mirror 行窗口虚拟化/分页（只渲染可视行 ±缓冲）。 | 同构 t3code `VIRTUALIZE_AFTER_ROWS` 思想；但 mirror 必须与 textarea 全高度几何对齐（`fitMirror` 靠内容真实高度同步滚动），丢 DOM 即破坏对齐与拖拽选区——正撞 `a0ef9d8` 踩坑，且本仓 mirror 几何需求与 diff 列表根本不同。**否决**。 |
| D | 现状不动 + 降低 paint 频率（debounce 拉长）。 | 治表不治里，输入延迟反而劣化。**否决**。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **DOM 结构**：`layer` 内 = `[span[data-l]] + text("\n") + [span[data-l]] + …`，行包装 `display:contents`；`.np-mirror span` 既有 `font:inherit;padding:0;margin:0;border:0` 重置（[panel.js:476](../../../../dsh-nano-notepad/src/client/panel.js#L476)）上追加 `display:contents`；行间 `\n` 必须是裸文本节点（不是行包装内内容），保证换行语义与现状逐字节等价。
2. **状态**：`state.mirrorLines: Array<{text, html, inFence}>`、`state.mirrorFence: boolean[]`。`highlightSource` 拆出行级入口 `lineHtml(text, {fence, json, mode})`（同一实现，非第二套）；inFence 用 `indexOf('```')` O(N) 逐行推进，非正则。
3. **脏段**：新旧 `lines[]` 公共前缀/后缀定 `[lo,hi)`；`inFence[hi]` 与旧值不同则脏段下延至行尾；脏段逐行 `html` 未变即跳过（fence 内行内容不变不重写 DOM）。
4. **不可增量回退**（函数内单分支，非并存实现）：`state.mirrorLines` 为空/文件切换/行数差超阈值（如 >50% 行变）→ 整层 `innerHTML` 一次性写（与现逻辑同源）。
5. **配套**：`schedulePaintMirror` rAF 合并不变；`hideImagePeek`/`data-np-image` 扫描改为仅扫脏段行内节点；`fitMirror` 不变。测试按 spec §7.2 加结构断言（行数、`\n` 节点数、脏行最小重写）。
6. **验收红线**：mirror↔textarea 逐行像素对齐（dev 实例人工验收：wrap on/off、空行、ZWSP 行、长行 wrap、fence 嵌套）；`highlight-dom` span 在 28KB 文档连续打字下应降一个数量级。

**【推荐选项支持证据与其他选项反例】**

- 支持：`t3code` `incrementalHighlighting.ts:57-107`（stable 行保节点身份 + 非前缀全量回退的生产级先例）；`.np-mirror` 纯表现层无事件无焦点（[panel.js:473](../../../../dsh-nano-notepad/src/client/panel.js#L473)），DOM 结构对功能透明。
- B 反例：`highlight-dom` span 测的就是 `innerHTML` 写入段，B 保留该段全量成本，perf 基线改善有限——用了一半工程换不到主收益。
- C 反例：`a0ef9d8`（虚拟化窗口破坏拖拽选区）+ mirror 必须全高度几何对齐 textarea（`fitMirror` [panel.js:1219-1230](../../../../dsh-nano-notepad/src/client/panel.js#L1219-L1230) 依赖内容真实高度）——丢 DOM 在本仓是致命伤而非优化。
- D 反例：代码自证（[panel.js:1189](../../../../dsh-nano-notepad/src/client/panel.js#L1189) 注释承认 per-keystroke full rebuild）。

---

### Q2 — 异构计算边界：`lib/fx/` 静态资产内新增 `np-render-worker.mjs` 卸载纯函数渲染计算（highlight/JSON 树），fx-core.wasm 引擎 worker 化划归 batch-2，还是更激进/更保守？

**驱动真相**：`T-O-1`（范围限定）、`T-O-3`（软件异构优先）、`T-O-4`（插件中立、无专用通道、不双写）。来源：[render-pipeline-1121.md §4.1 F4/F9、§6.1-6.2](../render-pipeline-1121.md)；`t3code` `DiffWorkerPoolProvider.tsx:22-25,130-143`、`@pierre/diffs` `hast-ops-v1` 协议。

- **影响范围**：`lib/fx/` 目录（新增一个 `.mjs`）、`scripts/build-client.mjs`（worker 入口打包）、`src/client/fx-sqlite.js` 同构的 worker 引导面、`src/client/highlight.js`/`json.js`/`markdown.js`（纯函数模块同时被 worker 与主线程引用）、`src/client/fx-runtime.js:34-80`（`createFxEngine` 主线程实例化现状）、`package.json:18-33` `files`（`lib/fx` 已含）。
- **为什么必须确认**：spec §9 待决项①担心「新增 worker 需要新路由」——本仓取证已解除该顾虑：[bindings.js:18](../../../../dsh-nano-notepad/lib/bindings.js#L18) 的 `dnn.fx.sdk` 是 **`prefix` 匹配** `/nano-notepad/fx/sdk` 的静态资产路由（`basename-only` serve `lib/fx/`），`package.json` `files` 已含 `lib/fx`（[package.json:32](../../../../dsh-nano-notepad/package.json#L32)），`np-sqlite-worker.mjs`/`sqlite3.mjs`/`sqlite3.wasm` 均走此既有通道（[fx-sqlite.js:19-20](../../../../dsh-nano-notepad/src/client/fx-sqlite.js#L19-L20) `SDK_BASE`/`WORKER_URL`）。即：**worker 落 `lib/fx/np-render-worker.mjs` = 零新路由、零扩约、零 bindings 变更**，与「sqlite 已跑在 module worker」完全同构。剩下要裁的是：**卸载哪些计算**（决定 worker 协议形状）与 **fx-core.wasm 引擎 worker 化（F9）是否纳入本批**（决定批次体量）。worker 协议粒度、requestId 取消细节、降级语义留给 Round 2。
- **当前建议 / 倾向**（`RP-batch-1 架构审查`）：选 **A**：**新增 `lib/fx/np-render-worker.mjs`（esbuild 独立入口，`import` 与主线程共享的 `highlight.js`/`json.js`/`markdown.js` 纯函数），卸载 `highlightSource`/`validateJson`/`renderJsonTree`/`renderMarkdown` 四项纯计算；`sanitizeRichHtml`/`exportToS3`(DOMParser/btoa 依赖) 与 fx-core.wasm 引擎（F9）不纳入，F9 归 batch-2。**
- **Reasoning**：四项被卸载函数都是 DOM-free 纯字符串→字符串计算，worker 内可直接 `import` 同一源码文件——**零第二实现**（满足 `T-O-4`）；`sanitizeRichHtml` 需要 DOMParser 无法进 worker、`exportToS3` 的 btoa/sha256 调用频率低，卸载无收益。F9（fx-core 引擎进 worker）虽然稳定性收益真实（LLM turn 期间打字不卡），但它需要 corpus 工具调用的 postMessage 代理层与引擎生命周期重设计，是独立复杂度高、可独立验证的工作——塞进 batch-1 会拖长冻结周期，且 `T-O-1` 已声明「零功能新增」下它是体量最大的单项；归 batch-2 并在 spec 台账保留编号不丢弃，是吸收率与收敛速度的诚衡。
- **问题（请 [业主] 裁决）**：是否冻结「`lib/fx/np-render-worker.mjs` 静态资产卸载 `highlightSource`/`validateJson`/`renderJsonTree`/`renderMarkdown`（共享同一纯函数实现、零新路由、requestId 取消 + 构造失败回退主线程同函数）；F9 fx-core 引擎 worker 化归 batch-2 保留编号」为 `RP-batch-1` 的异构计算边界？请选择 **A / B / C / D**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意你在 [第1轮] 的全部推荐」），冻结为 `T-O-6`。

**【对本问题的解读】**
[DNN] 已有完整的 worker 先例：sqlite 跑在 `np-sqlite-worker.mjs` module worker 里走 OPFS（[fx-sqlite.js:88](../../../../dsh-nano-notepad/src/client/fx-sqlite.js#L88)），而 fx-core.wasm 这个 2.26MB 的 LLM 引擎却在主线程每次 one-shot 重新实例化（[fx-runtime.js:34-50](../../../../dsh-nano-notepad/src/client/fx-runtime.js#L34-L50)）——LLM 流式 turn 期间主线程被 wasm 占用，用户打字会卡。t3code 的答案是「全部重计算进 Worker 池 + transferable 增量回传」。DNN 要裁的是：哪些计算值得搬（收益>复杂度）、用什么资源形态（静态 `.mjs` vs blob:）、以及最大的单项（引擎 worker 化）放本批还是后批。

**【可选选项清单】**

| 选项 | 异构边界 | 得到什么 / 代价与长期治理评价 |
|---|---|---|
| **A（推荐）** | `lib/fx/np-render-worker.mjs`：卸载 `highlightSource`/`validateJson`/`renderJsonTree`/`renderMarkdown` 四项纯函数（worker 与主线程 `import` 同一 `src/client/*.js`，非双实现）；`sanitizeRichHtml` 留主线程（DOMParser）；F9 引擎 worker 化归 batch-2。 | 输入路径 O(文档) CPU（`.json` 校验+树构建、markdown parse）全部离主线程；资源形态零扩约（既有 prefix 路由覆盖）；复杂度有界。**符合 `T-O-1/T-O-3/T-O-4`**。 |
| B | A + 同批吞下 F9：fx-core 引擎进 worker，`note_*` 工具经 postMessage 回主线程 corpus。 | 稳定性收益最大（LLM turn 不卡打字）；但需新设 tool-call 代理协议、引擎生命周期管理、失败回放语义，是独立大项——拖慢整批冻结与验证，风险外溢到管线功能。作为 batch-2 首项更诚实。 |
| C | 不上 worker：F1/F2/F3/F5–F8 主线程优化到位即止。 | 最少改动；但 `.json` 大文件每键 `validateJson`+`renderJsonTree`、大 markdown `renderMarkdown` 的 O(文档) parse 仍压主线程——增量 DOM 杀的是 DOM 成本，杀不了 parse CPU。放弃 t3code 体系里最重要的一层（异构）。 |
| D | `blob:`/`data:` 内联 worker（DNEE CT 路线同款）。 | 免静态文件；但 DNN 有现成 prefix 静态路由，`blob:` 反增一层 CSP 不确定性（严格 CSP 下 `worker-src blob:` 可能被禁），且内联打包把 worker 代码塞进 client.js 增大主 bundle。有更好选择时不取。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **构建**：`scripts/build-client.mjs` 增加第二入口 `src/worker/np-render-worker.js → lib/fx/np-render-worker.mjs`（esbuild ESM bundle，`import` `../client/highlight.js`/`json.js`/`markdown.js`）；产物进 `lib/fx/` 即被 `dnn.fx.sdk` prefix 路由与 `package.json` `files` 自动覆盖，**bindings/路由表/安全清单零变更**。
2. **协议**（自研最小集，不照搬 `hast-ops-v1`）：`{id, op:'highlight'|'jsonTree'|'jsonValidate'|'markdown', payload}` → `{id, ok, html|tree|valid}`；`markdown` 走占位符协议——worker 返回含 `src="notepad-image:ID"` 的 HTML，主线程注入 DOM 后统一 `querySelectorAll` 回填 data URL（保持 `imagesById` 大图不出 worker 边界）。
3. **调度与降级**：主线程薄封装 `renderWorker.call(op, payload)`——`new Worker('/nano-notepad/fx/sdk/np-render-worker.mjs', {type:'module'})` 构造失败/首条消息超时 → 同调用点直接调本地纯函数（同一实现，非第二代码路径）；单调递增 `requestId`，响应 id 不匹配即丢弃（t3code `setRenderOptions` 递增 version 作废在途任务的同构）。
4. **不纳入项**：`sanitizeRichHtml`（DOMParser 主线程专属）、`md5Hex`（已是微秒级纯 JS，postMessage 开销大于收益）、`exportToS3`（低频）、F9（batch-2）。
5. **生命周期**：worker 懒初始化（首次需要时构造），空闲不 terminate（DNN 面板常驻，`30s` 空闲回收对单 worker 收益小）；面板 destroy 时 `terminate()`。

**【推荐选项支持证据与其他选项反例】**

- 支持：[bindings.js:18](../../../../dsh-nano-notepad/lib/bindings.js#L18) `prefix` 路由 + [package.json:32](../../../../dsh-nano-notepad/package.json#L32) `files` 已含 `lib/fx` → **零新路由零扩约**（直接消解 spec §9.1 待决项①）；`np-sqlite-worker.mjs` 同构先例证明该通道在三个宿主实例均可工作；t3code `DiffWorkerPoolProvider.tsx:130-143`（消费者引用计数 + 空闲回收）与 `hast-ops-v1`（回传粒度设计）提供协议参照。
- B 反例：F9 需要 corpus `note_*` 工具调用的跨线程代理（工具执行在 IDB 主线程侧），协议与生命周期复杂度独立成项；塞入本批会把「渲染管线」批次拖成「渲染 + 引擎架构」批次，违背 `T-O-1` 批次纯度。
- C 反例：`.json` 大文件输入路径 `validateJson`([json.js:15](../../../../dsh-nano-notepad/src/client/json.js#L15)) + `renderJsonTree`([json.js:218-237](../../../../dsh-nano-notepad/src/client/json.js#L218-L237)) 每键 O(文档) parse——纯主线程优化无法移除该 CPU，只是换了烧法。
- D 反例：DNEE 用 `blob:` 是因为单文件 IIFE 无静态路由；DNN 有 `dnn.fx.sdk` prefix 通道，走 blob 是拿着真源绕远路还多一层 CSP 变量。

---

## 3. ★ 中场评估 I（Round 1 → Round 2）`[核心·锁死]`

- **3.1 对 Round 1 的判定**：Q1/Q2 两题均一次裁决（[业主] 同意 A 全部推荐），方向干净无遗留——mirror 定死 `display:contents` 增量单轨，异构定死 `lib/fx/` 静态 worker 且 F9 出批。最关键的一手是 **T-O-6 的 prefix 路由取证**（[bindings.js:18](../../../../dsh-nano-notepad/lib/bindings.js#L18)），它把 spec §9 最大的待决项（worker 路由合法性）在执行前就变成非问题，F4 从「契约风险项」降级为「纯工程项」。
- **3.2 本轮已锁定真相**：`T-O-5`（mirror `display:contents` 行包装 + 脏段增量 + 函数内整层回退分支）、`T-O-6`（`np-render-worker.mjs` 卸载 `highlightSource`/`validateJson`/`renderJsonTree`/`renderMarkdown`，F9 归 batch-2）。
- **3.3 诚实反方制衡**：
  - `display:contents` 方案的最大风险不在「能不能做」而在「跨浏览器 inline-flow 等价性」——Chromium/WebKit/Firefox 对 `display:contents` 子代盒生成一致，但 mirror 验收必须人工过 wrap 边界、空行、ZWSP 行、tab-size 混合四类样本；若 dev 实例验证不齐，**已锁的真相允许函数内整层回退**兜住发布线，不构成推翻 T-O-5 的理由。
  - T-O-6 把 `highlightSource` 也划入卸载清单，但中场检索发现：`highlightSource` 在 T-O-5 之后的热路径只剩「脏段几行」的量级（唯一调用点 [panel.js:1192](../../../../dsh-nano-notepad/src/client/panel.js#L1192)）， worker 化的边际收益远小于 `.json`/`markdown` 的 O(文档) parse；且把逐键路径变 async 会引入「镜像滞后一帧」的新风险。**Q3 必须在不推翻 T-O-6 的前提下细化调度粒度**——这是执行级细化，不是方向回退。
  - `renderBody` 的 markdown 路径天然兼容 async（[panel.js:1897](../../../../dsh-nano-notepad/src/client/panel.js#L1897) 已有 `await imagesById` + [panel.js:1898](../../../../dsh-nano-notepad/src/client/panel.js#L1898) `renderToken` 守卫），worker 插入点现成；但 `.np-read` 预览的 `renderCache`/`peekCache` 仍是条目数单界，未控字节（[panel.js:1889-1907](../../../../dsh-nano-notepad/src/client/panel.js#L1889-L1907)），图片 data URL 大图可击穿内存界——这是 Round 2 必须锁的边界。
- **3.4 为什么提出 Round 2（注入哪些题 + 由哪条 T-O 驱动）**：T-O-5 把「结构」钉死后剩**参数化规格**未定（Q4）；T-O-6 把「卸载什么/放哪」钉死后剩**协议粒度与降级语义**未定（Q3）；而 ctaWatch/IDB/缓存边界三项在 spec 台账里同属「观测收敛 + 缓存边界」一类、共享「没变不干活」的同一治理逻辑，合并为**一题**锁参数（Q5）。三题均为 T-O-5/T-O-6/T-O-4 的执行层投影。

---

## 4. Round 2 —— `executional`：worker 协议粒度 / mirror 参数化 / 观测收敛与缓存边界（`Q3–Q5`）

本轮 `second-opinion` 为 `retired`，由 `[业主]` 直裁。**每题标注驱动真相**。

### Q3 — `np-render-worker` 的调度粒度与降级语义：`highlightSource` 走「冷启动全量进 worker + 逐键脏段留主线程」，还是四项一刀切全进 worker？

**驱动真相**：`T-O-6`（卸载范围已锁四项）、`T-O-3`（输入路径不可牺牲交互）。来源：[render-pipeline-1121.md §4.1 F4](../render-pipeline-1121.md)；中场检索 [panel.js:1192](../../../../dsh-nano-notepad/src/client/panel.js#L1192)、[panel.js:1897-1898](../../../../dsh-nano-notepad/src/client/panel.js#L1897-L1898)。

- **影响范围**：`src/worker/np-render-worker.js`（新）、`src/client/panel.js:1187-1203`（`paintMirror` 调度）、`src/client/panel.js:1884-1910`（markdown/jsonTree 异步接入）、`scripts/build-client.mjs`、perf span 口径。
- **为什么必须确认**：T-O-6 锁了「卸载哪四项、放哪、共享同一实现」，但**没锁调度粒度**。中场检索发现 `highlightSource` 的热路径在 T-O-5 落地后只剩「脏段几行」——此时 postMessage 往返 + 结构化克隆的开销可能**大于**脏行 tint 本身；而 `.json` 的 `validateJson`/`renderJsonTree`、markdown 的 `renderMarkdown` 仍是 O(文档) 且所在路径已经 `await`（[panel.js:1897](../../../../dsh-nano-notepad/src/client/panel.js#L1897)）。调度粒度选错会出现两种失败：逐键路径全进 worker → 镜像染色滞后一帧（输入体验劣化，违背 T-O-3）；或逐键路径留主线程但没想清楚冷启动（切文件首次全量 paint）放哪 → 冷启动 O(文档) CPU 仍压主线程。
- **当前建议 / 倾向**（`RP-batch-1 架构审查`）：选 **A**：**`highlightSource` 分态调度**——「冷启动/整层回退」（文件切换、paste 整体替换、dirty-ratio 超阈值触发的整层回写）走 worker（O(文档) CPU 卸载）；「逐键脏段」（日常输入）留主线程行级入口（脏行就几行，postMessage 不划算）；`validateJson`/`renderJsonTree`/`renderMarkdown` 三项全部走 worker。同一 worker、同一 `{id,op,payload}` 协议，op 字段区分任务。
- **Reasoning**：T-O-5 之后 `paintMirror` 的脏段在常见输入下 <10 行，行级 `lineHtml` 主线程执行成本微秒级，postMessage 结构化克隆 + 队列往返是毫秒级——**逐键路径走 worker 是负优化**。但冷启动（打开 28KB 文档首次 paint、fence 切换导致全文档重染）仍是 O(文档) tint，放 worker 兑现 T-O-3 的卸载承诺。`renderBody` markdown 路径本来就 `await imagesById`（[panel.js:1897](../../../../dsh-nano-notepad/src/client/panel.js#L1897)），worker 应答天然落在既有 `renderToken` 守卫内，零新增竞态面。
- **问题（请 [业主] 裁决）**：是否冻结「`highlightSource` 分态调度（冷启动/整层回退→worker，逐键脏段→主线程行级入口），`validateJson`/`renderJsonTree`/`renderMarkdown` 全走 worker，同一 `{id,op,payload}` 协议」为 `RP-batch-1` worker 的调度与降级语义？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意你在 [第2轮] 的全部推荐」），冻结为 `T-O-7`。

**【对本问题的解读】**
T-O-6 说的是「卸载哪些函数」，没说「每个函数在每种调用形态下放哪跑」。`highlightSource` 是个特殊案例：它的调用成本是**自适应的**——逐键时只脏几行（便宜），切文件/整层回退时是全文（贵）。一刀切「全进 worker」会让逐键路径背上 postMessage 固定开销（体验劣化）；一刀切「全留主线程」会让冷启动的 O(文档) tint 继续烧主线程（违背异构初衷）。本题裁的是：**按调用形态分派**，而非按函数名分派。

**【可选选项清单】**

| 选项 | 调度语义 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | 分态调度：`highlightSource` 冷启动/整层回退走 worker、逐键脏段留主线程行级入口；`validateJson`/`renderJsonTree`/`renderMarkdown` 全走 worker。 | 逐键零新增延迟（镜像染色本帧完成）、冷启动 O(文档) CPU 离主线程；worker 协议不变。代价 = 主线程需保留行级入口（T-O-5 本来就要求拆出，非额外实现）。 |
| B | 四项一刀切全走 worker，逐键路径也 postMessage。 | 调度最简单；但逐键路径镜像染色滞后一帧（输入先落 textarea、高亮下一帧才到），对 T-O-3「输入体验不可牺牲」是直接违反。 |
| C | `highlightSource` 完全留主线程，worker 只管 JSON/markdown。 | 无分态复杂度；但冷启动 O(文档) tint 仍压主线程——对 `T-O-3` 的卸载兑现不完整，且 worker 协议里少一个最有价值的 cold-path 用例。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **worker 内**：`import` `../client/highlight.js`/`json.js`/`markdown.js`；`self.onmessage` 分发 `{id, op, payload}`，op ∈ `highlight|jsonTree|jsonValidate|markdown`；回 `{id, ok, html|tree|valid}`。
2. **主线程调度层 `renderWorker`**：懒构造 `new Worker('/nano-notepad/fx/sdk/np-render-worker.mjs', {type:'module'})`；单调 `requestId`；构造失败/超时 → 本地同函数直调（非第二实现）。
3. **`highlightSource` 分态**：`paintMirror` 内判 `dirtyRatio`——整层回退分支（含首次 paint）调 `renderWorker.call('highlight', {text, json, mode})` 并 `await`（该分支已是回退路径，异步无害）；脏段分支调主线程 `lineHtml` 逐行同步（T-O-5 的行级入口）。
4. **`renderBody` 接入**：markdown 分支 `renderWorker.call('markdown', {markdown})`（返回含 `notepad-image:` 占位 HTML，主线程注入 DOM 后统一回填 data URL）；`.json` 分支 `renderWorker.call('jsonValidate'|'jsonTree', ...)`；两处接续既有 `renderToken` 守卫。
5. **边界**：worker 不碰 `sanitizeRichHtml`/`md5Hex`/`exportToS3`；`markdown` 的 `images` Map 不进 worker（占位符协议，防大图克隆）。

**【推荐选项支持证据与其他选项反例】**

- 支持：T-O-5 已强制 `highlightSource` 拆出行级入口（同一实现），主线程行级调度零新增实现；`renderBody` 的 `await imagesById`（[panel.js:1897](../../../../dsh-nano-notepad/src/client/panel.js#L1897)）证明 markdown 路径本已是异步、worker 接入零新增竞态面；t3code `setRenderOptions` 递增 version 作废在途任务 = `requestId` 丢弃旧响应的同构。
- B 反例：postMessage 结构化克隆 + worker 队列往返 ≥1ms 级，而 T-O-5 后脏段 tint 是微秒级——固定开销吃掉全部增量收益，镜像染色滞后一帧直接劣化输入体验。
- C 反例：切大文件首次 paint 的 O(文档) tint（几十 KB 正则全程）仍是主线程硬耗；放弃 T-O-6 已锁的「highlightSource 在卸载清单」承诺，属方向缩水。

---

### Q4 — mirror 增量规格的参数化锁定：inFence 推进算法、单行熔断阈值、整层回退的 dirty-ratio 触发线与 `data-np-image` 扫描范围

**驱动真相**：`T-O-5`（结构已定，参数未定）。来源：[render-pipeline-1121.md §5.2](../render-pipeline-1121.md)；[highlight.js:114-120](../../../../dsh-nano-notepad/src/client/highlight.js#L114-L120)；t3code `tokenizeMaxLineLength:1_000`。

- **影响范围**：`src/client/highlight.js`（行级 API 拆分 + 熔断）、`src/client/panel.js:1187-1230`（脏段状态机）、`test/`（结构断言）。
- **为什么必须确认**：T-O-5 锁的是结构，但四个参数级事实未定——① `inFence` 每行的推进算法（逐行 `indexOf('```')` 还是沿用现状正则）；② 单行长度熔断阈值（t3code 用 `tokenizeMaxLineLength:1_000`，DNN 的 `inlineMd`/`inlineJson` 对超长行更脆弱）；③ 脏段多大算「不可增量、整层回退」（50%？100 行？）；④ `data-np-image` 的 `querySelectorAll` 是全层扫还是只扫脏段行。参数不定，F1 的实现会在「够用」和「过度设计」之间漂移。
- **当前建议 / 倾向**（`RP-batch-1 架构审查`）：选 **A**：**inFence 用 O(N) `indexOf('```')` 逐行推进（非正则）；单行熔断阈值 `LINE_TINT_CAP = 4_096` 字符（超此行整个走纯转义无 token span）；整层回退触发线 = 脏段行数 > `max(100, 总行数×50%)`；`data-np-image` 只扫脏段插入的行节点，整层回退时全扫（该分支本来就是回退路径）。**
- **Reasoning**：inFence 用 `indexOf('```')` 是因为 `lineHtml` 的 fence 判定本就只看「行首是否 fence 标记」，逐行推进一个布尔位即可，正则反而引入回溯面；4KB 熔断对齐 t3code `tokenizeMaxLineLength:1_000` 数量级但放宽（DNN `inlineMd` 的模式比 t3code 的 WASM lexer 慢但语法少），4KB 足以覆盖几乎所有真实行且封死 min.js 级灾难；dirty-ratio 用「100 行 OR 50%」双界是因为：小文档（<200 行）整层回退也便宜、不值得增量调度，大文档 50% 变化已接近重写、增量寻址的 bookkeeping 得不偿失；`data-np-image` 扫描范围跟随「哪部分 DOM 被重建」，与 T-O-5 的增量边界自洽。
- **问题（请 [业主] 裁决）**：是否冻结「inFence = O(N) `indexOf('```')` 逐行推进；单行熔断 `LINE_TINT_CAP = 4_096`；整层回退触发 = 脏段 > `max(100, N×50%)`；`data-np-image` 扫描范围跟随 DOM 重建范围（增量=脏段行、回退=全层）」为 `RP-batch-1` mirror 的参数化规格？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意你在 [第2轮] 的全部推荐」），冻结为 `T-O-8`。

**【对本问题的解读】**
`T-O-5` 给了骨架，但四个「数字/算法」未定：fence 状态怎么算（决定增量正确性）、单行多长就不染了（熔断防炸）、脏到什么程度就放弃增量直接全量（回退线）、改完哪块 DOM 就扫哪块图片占位（扫描范围）。这四个参数互相咬合——比如熔断阈值既影响正确性（超行长行不能漏 `\n` 边界）也影响性能；回退线既影响 best-case 也影响 worst-case。本仓 [highlight.js:117-119](../../../../dsh-nano-notepad/src/client/highlight.js#L117-L119) 已经用「单一 pre-wrap 文本流」证明了「宁要正确性简单」，参数选择延续同一偏好。

**【可选选项清单】**

| 选项 | 参数集 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | inFence=O(N) `indexOf` 逐行推进；`LINE_TINT_CAP=4_096`；回退线=`max(100, N×50%)`；`data-np-image` 扫范围跟 DOM 重建范围。 | 参数全部有据（t3code 阈值 + 本仓语义 + dirty bookkeeping 成本模型）；熔断防 min.js；回退双界兼顾小文档（直接全量更省）与大文档（增量值得）。 |
| B | 阈值更激进：`LINE_TINT_CAP=1_000`（照搬 t3code）；回退线=纯行数 200（不看比例）。 | 1KB 熔断更保守；但 DNN 常见代码段行 1-3KB，1KB 会误伤正常 markdown 行；纯行数回退线对小文档不公平（50 行文档 40 行脏也走增量，调度比全量还贵）。 |
| C | 不设熔断、不设回退线（纯增量/纯染色）。 | 零参数；但单行 100KB 的 min.js 直接炸 regex（现状无熔断即已知漏洞），全量 paste 场景增量 bookkeeping 白费。违背 T-O-3 的稳定性承诺。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **`highlight.js`**：新增 `export const LINE_TINT_CAP = 4_096`；`lineHtml(text, {fence, json, mode})` 行级入口（与 `highlightSource` 共享 tokenize 逻辑，非第二实现）；`text.length > LINE_TINT_CAP` 的行返回纯 `escapeHtml(text)` 包 `<span>`。
2. **inFence 推进**：`state.mirrorFence[i+1] = state.mirrorFence[i] ^ isFenceMarker(lines[i])`，其中 `isFenceMarker` = `line.trimStart().startsWith('```')`（O(行长) `indexOf`/`startsWith`，非正则）。
3. **回退线**：`paintMirror` 内 `if (dirtyCount > Math.max(100, totalLines * 0.5))` → 整层回退分支（复用 T-O-5 单分支）。
4. **图片扫描**：增量路径只对 `layer.children[lo..hi]` 内 `querySelectorAll('[data-np-image]')`；回退路径保留现状全扫。`hideImagePeek` 逻辑不变。
5. **验证**：`node:test` 断言 5KB 单行不产出 token span；`node:test` 断言 fence 切换行以下行重染。

**【推荐选项支持证据与其他选项反例】**

- 支持：t3code `tokenizeMaxLineLength:1_000`（`DiffWorkerPoolProvider.tsx:72`）证明单行截断是生产共识；4KB 放宽是本仓 markdown 代码段常见行长的合理带宽；`data-np-image` 扫范围跟 DOM 重建范围与 T-O-5 增量边界自洽。
- B 反例：1KB 对本仓 markdown 代码段（Curl/JSON 片段常 1-3KB）误伤率高；纯行数回退线无视文档规模比例，小文档增量调度成本倒挂。
- C 反例：现状无熔断本身就是 min.js 灾难敞口（[highlight.js:114](../../../../dsh-nano-notepad/src/client/highlight.js#L114) `lineHtml` 无长度保护），「不设阈值」是把已知漏洞带进新实现。

---

### Q5 — 观测收敛与缓存边界的执行规格：`ctaWatch` rAF 合批 + `applyCopy`/`renderTree`/`renderTabs` 签名脏检 + `renderCache`/`peekCache` 双界 LRU + IDB 增量的参数

**驱动真相**：`T-O-4`（缓存即凭证、没变不干活）、`T-O-2`（ctaWatch 只读宿主）。来源：[render-pipeline-1121.md §4.1 F3/F5/F7/F8](../render-pipeline-1121.md)；中场检索 [panel.js:4886-4895](../../../../dsh-nano-notepad/src/client/panel.js#L4886-L4895)、[panel.js:1889-1907](../../../../dsh-nano-notepad/src/client/panel.js#L1889-L1907)、[db.js](../../../../dsh-nano-notepad/src/client/db.js)。

- **影响范围**：`panel.js:1026-1044`（`applyCopy`）、`panel.js:1646-1743`（`renderTree`/`renderTabs`）、`panel.js:1889-1907`+`1298-1302`（`renderCache`/`peekCache`）、`panel.js:4886-4895`（`ctaWatch`）、`db.js`（`pruneImages`/`stampContentMd5`/`saveDraft` 的 md5 时序）。
- **为什么必须确认**：这是「观测收敛」四类项的合批题——它们共享同一治理逻辑「没变不干活 + 缓存有界」，但各自的参数未定：① `ctaWatch` 是收窄观察目标（`[data-conversation-scroll]` 等宿主锚点）还是 `document.body` 保留 + rAF 合批回调；② `renderTree`/`renderTabs`/`applyCopy` 的「签名」算什么字段（node 的哪些属性进签名）；③ `renderCache`/`peekCache` 加字节界的具体数值；④ `pruneImages`/`stampContentMd5` 的「不重扫」用会话内 `Map<nodeId, imageIds[]>` 缓存还是运行时增量维护。四个参数一起锁是因为它们共享「签名/缓存即凭证」的同一套评测尺度，拆开问会重复回答。
- **当前建议 / 倾向**（`RP-batch-1 架构审查`）：选 **A**：**`ctaWatch` 保留 `document.body` observe（保守、零宿主结构假设）+ 回调 rAF 合批（token 流一次 rAF 只跑一次 `attachNotepadCtas(document)`）；`applyCopy`/`renderTree`/`renderTabs` 用「内容签名跳过」——`applyCopy` 按 `state.locale` 版本、`renderTree` 按 nodes 逐项字段签名（`id:name:pinned:parentId:wsId:cat:kindFilter:collapsed`）、`renderTabs` 按 tabs 数组签名；`renderCache` 双界 `64 条 + 32MB`、`peekCache` `8 条 + 40MB`（近似字节）；`pruneImages`/`stampContentMd5` 用会话内 `Map<nodeId|versionId, imageIds[]>` 缓存避免 `imageIdsIn` 正则重扫，不持久化。**
- **Reasoning**：ctaWatch 收窄到宿主锚点（`[data-conversation-scroll]`/`[data-conversation]`）的假设在 dsh-dev 实例可验证，但依赖宿主 DOM 结构——**保留 `document.body` + rAF 合批是零假设方案**（`220a2b8` 「无事发生也零成本」的正确落地：rAF 内 token 爆发的 N 次 mutation 合成一次处理）。签名跳过是 `0fd4822` merge-base 复用的同构（同一份计算不跑两遍）；`applyCopy` 的 `[data-i18n]` 全遍历只在 locale 真变时才有意义。双界 LRU 数字凭 `imageLimitBytes` 默认 5MB × 8 = 40MB（peekCache）与常见 markdown HTML ~100KB × 64 ≈ 6.4MB 加余量 32MB（renderCache）得出。`pruneImages` 的会话内 Map 是 consumption receipt（不持久化、不升格真源），`imageIdsIn` 正则只对新写入的 markdown 跑一次——`67933a2`「同一份计算不跑两遍」的同构。
- **问题（请 [业主] 裁决）**：是否冻结「`ctaWatch` 保 `document.body` + rAF 合批回调；`applyCopy` 按 locale 版本、`renderTree`/`renderTabs` 按内容签名跳过；`renderCache`=64 条/32MB、`peekCache`=8 条/40MB 双界 LRU；`pruneImages`/`stampContentMd5` 会话内 `Map` 缓存 `imageIds`」为 `RP-batch-1` 观测收敛与缓存边界的执行规格？请选择 **A / B / C / D**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意你在 [第2轮] 的全部推荐」），冻结为 `T-O-9`。

**【对本问题的解读】**
这是「无事发生也要零成本」的四胞胎：`ctaWatch`（宿主聊天每 token 追加都唤醒 `attachNotepadCtas` 全扫）、`applyCopy`/`renderTree`/`renderTabs`（`render()` 55+ 触发点下每次全量重建）、`renderCache`/`peekCache`（条目数有界字节无界，图片 data URL 可击内存）、`pruneImages`/`stampContentMd5`（每次 commit/启动全库正则重扫）。四者独立小项但共享同一治理范式，参数（观察目标、签名字段、字节界、缓存介质）一起裁才能保持尺度一致。

**【可选选项清单】**

| 选项 | 观测收敛 + 缓存边界 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | ctaWatch 保 `document.body` + rAF 合批；sig 跳过分三块（`language.current()` 版本 / `nodes` 字段签名 / tabs 签名）；双界 `64/32MB` 与 `8/40MB`；`pruneImages` 会话 `Map`。 | 零宿主结构假设的保守收敛；签名保证正确性（不靠 rev 计数器漏点）；字节界封死图片大图击穿；`Map` 会话缓存满足「不持久化、不升格真源」。 |
| B | ctaWatch 收窄观察 `[data-conversation-scroll]`/`[data-conversation]`（宿主锚点）。 | 观察面积最小；但宿主锚点存在性是假设（不同宿主版本结构可能变），断了就静默失效——在「保守零假设 vs 激进窄化」里选保守更稳。可作后续微调，不否定 A。 |
| C | 签名改用 `state.nodesRev`/`tabsRev` 变更计数器（各 mutation 点 ++）。 | O(1) 比对；但 mutation 点散在 20+ 处（rename/pin/import/saveDraft/cat），漏一处 sig 就脏——正确性风险大于 O(N) 字段签名的零漏点保证。**否决**。 |
| D | `pruneImages`/`stampContentMd5` 持久化 `imageIds` 进 IDB（`saveDraft` 时顺手写）。 | 彻底省重扫；但 `imageIds` 写入旧 version 记录 = 改持久化真源内容（旧 version 无此字段要回填/兼容），触碰 `T-O-1`「不改 IDB schema」与 `T-O-4`「缓存不升格真源」。**否决**。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **ctaWatch**：`MutationObserver` 目标仍 `document.body` `{childList:true,subtree:true}`；回调内只把 `addedNodes` 收集进数组、`requestAnimationFrame` 里统一 `attachNotepadCtas` 一次（N 次 mutation → 1 次处理）；`disposers` 注销不变。
2. **签名跳过**：`applyCopy` 存 `lastLocale`（取 `language.current()`），`renderTree` 每 render 算 `nodes.map(n => n.id+n.name+n.pinned+n.parentId+n.workspaceId+n.cat).join() + kindFilter + collapsedKey`，`renderTabs` 类似；签名相等直接 return（零 DOM 写）。
3. **双界 LRU**：`renderCache`/`peekCache` 每项记录 `approximateSize`（HTML `length` / data URL `length`），`set` 时累计字节超界 → 从 `Map` 迭代序逐最旧直到下界；单条超界拒收（`lruCache.ts:26-28` 同构）。
4. **IDB 增量**：会话内 `Map<nodeId, imageIds[]>`（key 含 draft md5 防陈旧）；`pruneImages`/`stampContentMd5` 先查 `Map`，miss 才 `imageIdsIn` 正则；`Map` 不持久化、面板关即弃。
5. **测试**：`node:test` 断言 rAF 合批（模拟 N 次 mutation → `attachNotepadCtas` 内部扫描次数 == 1）、sig 相等时 `innerHTML` 未写、双界超限拒收/逐出、`Map` 命中不重复正则。

**【推荐选项支持证据与其他选项反例】**

- 支持：`220a2b8`/`0fd4822`/`67933a2`（t3code 「没变不重算」三连 commit 的治理范式）；`lruCache.ts:26-28`（单条超限拒收）；`peekCache` 8 条 × `imageLimitBytes` 5MB = 40MB 与 `renderCache` 64 条 × 典型 HTML 100KB ≈ 6.4MB → 32MB 余量均出自现有参数自洽推导。
- B 反例：`[data-conversation-scroll]` 在不同宿主版本可能不存在/改名，断了即静默丢按钮——`T-O-2`「零宿主 DOM 嫁接」原则下，观察目标选不假设宿主结构的 `document.body`，收敛放回调频率层做（rAF 合批已解决 90% 成本）。
- C 反例：DNN mutation 点 20+（[panel.js](../../../../dsh-nano-notepad/src/client/panel.js) `insertSibling`/`trash`/`saveDraft`/`setCat`/`pasteImport`/`importNodes`/`applyS3`/`stampContentMd5` 等），漏一个 ++ 即脏，签名比对是零漏点的正确性保证。
- D 反例：旧 version 记录回填 `imageIds` 字段 = 动持久化 schema 语义，触 `T-O-1` 红线；且把「可重算的 receipt」写成 durable 数据违反 `T-O-4` 缓存即凭证。

---

## 5. ★ 中场评估 II（Round 2 → Round 3）`[核心·锁死]`

- **5.1 对 Round 2 的判定**：Q3/Q4/Q5 三题一次裁决，执行层细节全部入账——worker 分态调度、mirror 参数、观测收敛/缓存边界已定死。最关键的细化是 **Q3 的分态**：它在不推翻 T-O-6 卸载清单的前提下，把逐键路径放回主线程——这是对 `T-O-3`「输入体验不可牺牲」的忠实落地而非方向回退。
- **5.2 本轮已锁定真相**：`T-O-7`（worker 分态调度 + `{id,op,payload}` 协议 + 占位符 markdown 协议 + requestId 作废）、`T-O-8`（`LINE_TINT_CAP=4_096`、inFence `indexOf`、回退线 `max(100,N×50%)`、图片扫描跟 DOM 重建范围）、`T-O-9`（ctaWatch rAF 合批、签名脏检、双界 LRU 64/32MB+8/40MB、IDB 会话 `Map`）。
- **5.3 诚实反方制衡**：
  - `T-O-7` 的分态在 `paintMirror` 引入「同一函数体内同步脏段 / 异步回退」双形态——测试必须显式覆盖两条路径（脏段行断言 + 整层回退断言），否则 T-O-5 的「单轨」名存实亡。
  - `T-O-9` 的 `ctaWatch` 保 `document.body` 是保守项（rAF 合批已把成本压掉 90%），若 dev 实测仍有明显开销可在后续微调观察目标——但那是测量驱动的精调，不预成立。
  - `renderCache` 的 `markdown` 全文进 key（[panel.js:1889](../../../../dsh-nano-notepad/src/client/panel.js#L1889)）意味着 key 本身 O(文档)——双界加了字节界但 key 的构造仍大字符串；T-O-9 没治这个（属于 F2 块级记忆化要替代的对象），**遗留到实施阶段用 `nodeId+md5` 短键解决，不在 QNA 预设**。
- **5.4 为什么提出 Round 3（收口）**：T-O-5/6/7/8/9 把「做什么、怎么算」全部钉死，剩三类纯执行收口——**Q6 构建/交付口径**（worker 产物如何进 `files`、版本号、worktree 名、AGENTS.md 同步）、**Q7 验证矩阵**（`node:test` 断言集 + perf 基线 + 手工验收项，T-O-5/6/7/8/9 的验收锚）、**Q8 收口文档与 F9 衔接**（spec/README/AGENTS.md 的口径同步、batch-2 编号保留声明）。三题裁完即收口，**本册预期 Round 3 即完成全部执行层真相冻结，无需 Round 4**。

---

## 6. Round 3 —— `executional`（收口轮）：交付口径 / 验证矩阵 / 收口文档与 F9 衔接（`Q6–Q8`）

本轮 `second-opinion` 为 `retired`，由 `[业主]` 直裁。**每题标注驱动真相**。

### Q6 — 构建与交付口径：`np-render-worker.mjs` 经 `scripts/build-client.mjs` 新增 esbuild 入口产出至 `lib/fx/`，版本 `0.2.0 → 0.3.0`，单语义 worktree `rp-batch-1-render-pipeline`，同次同步 AGENTS.md 交付物表

**驱动真相**：`T-O-6`（静态资产边界）、`T-O-1`（零功能新增但 `lib/fx/` 目录内容变化，交付物表需如实反映）。来源：[scripts/build-client.mjs](../../../../dsh-nano-notepad/scripts/build-client.mjs)；[package.json:3,32](../../../../dsh-nano-notepad/package.json)；[AGENTS.md 交付物表](../../../../dsh-nano-notepad/AGENTS.md)。

- **影响范围**：`scripts/build-client.mjs`（新增一个 `build()` 调用）、`package.json`（version）、`.agents/worktrees/rp-batch-1-render-pipeline`（新建）、`dsh-nano-notepad/AGENTS.md`（`lib/fx/` 行描述更新）、`docs/specs/dsh-nano-notepad/README.md`。
- **为什么必须确认**：`build-client.mjs` 是「交付物由谁产出」的唯一真源（现产 `lib/client.js`/`lib/perf-review-host.js`/`lib/s3-sync-host.js`/`lib/web-registrar.js`/`lib/mp-sanitize.js`/`lib/fx-bridge.js`/`lib/pipeline.js`）。`np-render-worker.mjs` 是新运行时文件，必须：① 由同一构建脚本产出（不接受手工复制进 `lib/fx/`）；② 版本号反映「新增运行时资产 + 渲染管线升级」（0.2.0→0.3.0，非 patch）；③ 单语义 worktree 符合 `worktree` 原则（`.agents/worktrees/<semantic>`，合并后删）；④ `AGENTS.md` 交付物表的 `lib/fx/` 行从「vendored fx runtime」更新为「vendored + 构建产出的 render worker」。这些口径不定，实施会在「构建产物哪来、版本怎么叫、代码进哪」上漂移。
- **当前建议 / 倾向**（`RP-batch-1 架构审查`）：选 **A**：**`scripts/build-client.mjs` 复用既有 `build()` 函数追加一次调用（`entryPoints:['src/worker/np-render-worker.js'], bundle:true, format:'esm', platform:'browser', outfile:lib/fx/np-render-worker.mjs`，不加 `define`/externals）；`package.json` `version: "0.2.0"→"0.3.0"`；worktree `.agents/worktrees/rp-batch-1-render-pipeline`；同次提交同步 `dsh-nano-notepad/AGENTS.md` 交付物表 `lib/fx/` 行 + `docs/specs/dsh-nano-notepad/README.md` 功能行。**
- **Reasoning**：`build()` 已封装 esbuild（锁死 devDependency、`buildSync` 非 0 即退），复用它保证 worker 与主 bundle 走同一构建纪律；`format:'esm'` + `platform:'browser'` 与 `new Worker(url,{type:'module'})` 匹配；worker 不需要 `__NOTEPAD_VERSION__`/`dnprDefine`（那是主 bundle 的 define）。版本 0.3.0 符合 semver（新增运行时资产 + 行为性性能提升，非仅 bugfix）。AGENTS.md 的 `lib/fx/` 行同步是「单一真源文档反映真实产物」的硬要求。
- **问题（请 [业主] 裁决）**：是否冻结「`build-client.mjs` 复用 `build()` 产 `lib/fx/np-render-worker.mjs`（esm/browser，无额外 define）；`package.json` → `0.3.0`；worktree `.agents/worktrees/rp-batch-1-render-pipeline`；同次同步 AGENTS.md 交付物表与 specs README」为 `RP-batch-1` 的构建与交付口径？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意本轮全部推荐」），冻结为 `T-O-10`。

**【对本问题的解读】**
这个包是「作者树 `src/` + 构建产物 `lib/` 一起进 tarball」的形态（`AGENTS.md` 交付物表明示「安装时不重建」），所以 `lib/fx/np-render-worker.mjs` 必须是**构建产物进仓**而非运行时生成。版本号、worktree 名、AGENTS.md 同步属同一「交付口径」收口。

**【可选选项清单】**

| 选项 | 交付口径 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | `build()` 复用产 `lib/fx/np-render-worker.mjs`；version→0.3.0；worktree `rp-batch-1-render-pipeline`；同次同步 AGENTS.md/README。 | 单一构建真源；semver 正确；AGENTS.md 与实际产物一致。 |
| B | worker 也走 vendored（手写/复制进 `lib/fx/`，不进构建）。 | 省一次 `build()` 调用；但产物来源与 `lib/fx/sqlite3.wasm`（真 vendored 第三方二进制）混淆，且 `src/worker/` 作者树与 `lib/fx/` 产物脱钩——违反单一真源。**否决**。 |
| C | version→0.2.1（patch）。 | 新增运行时资产 + 渲染管线重写不是 patch 语义，违反 semver 诚实。**否决**。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. `build-client.mjs` 尾部追加：`build({ entryPoints:['src/worker/np-render-worker.js'], bundle:true, format:'esm', platform:'browser', outfile: join(root,'lib/fx/np-render-worker.mjs') })`。
2. `package.json` `"version": "0.2.0" → "0.3.0"`（`engines.dsh` 不动）。
3. `git worktree` 在 `.agents/worktrees/rp-batch-1-render-pipeline`（语义分支名），合并回 main 后按业主要求删。
4. `AGENTS.md` 交付物表 `lib/fx/` 行更新为「fx wasm runtime 资源 + `np-render-worker.mjs`（构建产出的渲染 worker）」；`docs/specs/dsh-nano-notepad/README.md` 加一行本批功能描述。

**【推荐选项支持证据与其他选项反例】**

- 支持：`build()` 已抽象 `buildSync` 非 0 即退 + esbuild JS API 直调（[build-client.mjs](../../../../dsh-nano-notepad/scripts/build-client.mjs)），是唯一合规产出通道；`format:'esm'` 匹配 `{type:'module'}` worker。
- B 反例：`np-sqlite-worker.mjs` 是 vendored **第三方**产物（上游来的二进制/库），`np-render-worker.mjs` 是**本仓作者源码**——来源本质不同，混进 vendored 即失去「作者树→产物」追踪。
- C 反例：新增 worker 运行时文件 + mirror 渲染重写是行为级变化，patch 会误导下游。

---

### Q7 — 验证矩阵与性能验收红线：`node:test` 断言集 + `./lab/baseline/baseline.json`（仓根共享 lab） + dev 实例手工验收清单

**驱动真相**：`T-O-5`/`T-O-6`/`T-O-7`/`T-O-8`/`T-O-9`（全部真相层的验收锚）。来源：`test/` 13 个既有 suite、`src/perf/declaration.json`、`lab/baseline/baseline.json`、spec §7。

- **影响范围**：`test/`（新增 `render-worker.test.mjs`/`mirror-incremental.test.mjs`/`observation-convergence.test.mjs`）、`lab/baseline/baseline.json`、`scripts/`（可选 perf 脚本）、手工验收流程。
- **为什么必须确认**：T-O-5/6/7/8/9 每一项都需要可证伪的验收锚——mirror 像素对齐、worker 协议正确性、熔断、签名跳过、双界逐出、rAF 合批。测试矩阵不定，实现会「跑通即交」，违背 `T-O-3`「量化验收」。
- **当前建议 / 倾向**（`RP-batch-1 架构审查`）：选 **A**：**纯 `node:test` 分层断言（不引 Playwright/DOM 库）——① `mirror-incremental`：解析式断言（`paintMirror` 输出结构 = N 个 `data-l` + N-1 个 `\n` 文本节点；脏段最小重写用「逐行 html 字段比对」替代 MutationObserver）；② `render-worker`：协议 round-trip（`{id,op,payload}`→正确回包、requestId 乱序丢弃、fallback 调本地函数）；③ `observation-convergence`：签名构造函数纯逻辑断言（相等签名→返回 null 不写、双界超界→逐出/拒收、imageIds Map 命中不重复正则）；④ `line-tint-cap`：`lineHtml` >4KB 行纯转义无 token span；⑤ `nue-migration` 零模式断言不动（本批不新增宿主嫁接）。`lab/baseline` 记录 `highlight`/`highlight-dom`/`render`/`keystroke-input` 基线，dev 实例人工验收（像素对齐 + 性能 span）。**
- **Reasoning**：`node:test` 是本仓唯一测试框架（13 个 suite 全部用它）；DOM 断言走「输出结构解析」（构造假 layer 对象或直接断言 mirrorLines/innerHTML 字符串形态）而非浏览器；perf 基线用既有 `declaration.json` 已注册 span（不新增硬闸门，只做记录比对），符合「不得过度仪式」原则。
- **问题（请 [业主] 裁决）**：是否冻结「纯 `node:test` 四层断言集（mirror 结构 / worker 协议 / 收敛签名 / 熔断）+ `./lab/baseline/baseline.json`（仓根共享 lab） + dev 人工验收」为 `RP-batch-1` 的验证矩阵？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意本轮全部推荐」），冻结为 `T-O-11`。

**【对本问题的解读】**
本仓测试纪律是「`node:test` + 解析式断言（不模拟 DOM，不引重型框架）」（`nue-migration`/`schema-ingress`/`mp-sanitize` 全部如此），`lab/baseline` 是 perf-review 的记录面。新增断言要贴这个纪律——不引 jsdom/happy-dom/playwright，mirror 断言走「构造出来的 DOM 结构/字符串」而非浏览器 query。

**【可选选项清单】**

| 选项 | 验证矩阵 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | `node:test` 四层断言（结构/协议/收敛/熔断）+ `./lab/baseline/baseline.json`（仓根共享 lab） + dev 人工验收像素对齐与 span。 | 与本仓纪律一致；断言覆盖全部 T-O 的执行锚；零新依赖。 |
| B | 引 jsdom/happy-dom 做真 DOM 断言。 | DOM 断言更真；但引入新 devDependency 与既有 `node:test` 纯函数纪律不符，违背「不得过度仪式」且 mirror 像素对齐本来就只能人验（jsdom 无 layout）。**否决**。 |
| C | 不设新测试，只靠 dev 人工验收。 | 零成本；但回归无网，下一轮谁改 mirror/worker 都不会被发现。违背 `T-O-3` 量化原则。**否决**。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. `test/mirror-incremental.test.mjs`：构造 `state`+假 `layer`（`{children:[], innerHTML}` 最小区面），断言 `paintMirror` 输出 = N `data-l` + N-1 `\n`；单行编辑后仅脏行 `innerHTML` 被写（记录写入次数）；超阈值走整层分支。
2. `test/render-worker.test.mjs`：mock `Worker`（直接调本地函数）断言协议 `{id,op,payload}`→回包形状、`requestId` 丢弃旧响应、构造失败调本地。
3. `test/observation-convergence.test.mjs`：纯逻辑断言签名构造函数输入相同 `nodes`/`tabs`/`locale` → 相等 → skip；双界 LRU 超界拒收/逐出；`imageIds` Map 命中不重复 `imageIdsIn`。
4. `test/line-tint-cap.test.mjs`：`lineHtml` 5KB 行无 token span、短行有。
5. `./lab/baseline/baseline.json`（仓根）追加 `rp-batch-1` 基线行（`highlight`/`highlight-dom`/`render`/`keystroke-input` 的 before/after 记录，无阈值闸门）。

**【推荐选项支持证据与其他选项反例】**

- 支持：`nue-migration.test.mjs` 已示范「解析式 + 调用参数断言」模式（[test/nue-migration.test.mjs:59-83](../../../../dsh-nano-notepad/test/nue-migration.test.mjs#L59-L83) `callArgs`/`hasProp`）；`declaration.json` `keys.spans` 已含 `highlight`/`highlight-dom`/`render`——基线 span 零新增声明。
- B 反例：mirror 像素对齐在 jsdom 里无法验证（无 layout engine），还得人工——引 DOM 库换不到关键断言，纯负重。
- C 反例：本仓 13 个 suite 的存在本身就证明回归网是纪律，破例无理由。

---

### Q8 — 收口文档与 F9 衔接：`render-pipeline-1121.md` 状态/台账更新、`README.md`/`AGENTS.md` 口径同步、batch-2 编号保留声明

**驱动真相**：`T-O-1`（范围与批次边界）、`T-O-4`（不双写、文档即真源）、`T-O-6`（F9 出批）。来源：[render-pipeline-1121.md](../render-pipeline-1121.md)；`docs/specs/dsh-nano-notepad/README.md`；`dsh-nano-notepad/AGENTS.md`。

- **影响范围**：`docs/specs/dsh-nano-notepad/render-pipeline-1121.md`（状态→`frozen`、`§9 待冻结项`全部消解、台账吸收标记）、`docs/specs/dsh-nano-notepad/README.md`、`dsh-nano-notepad/AGENTS.md`（交付物表 `lib/fx/` 行）、正式计划 `docs/specs/dsh-nano-notepad/plan/RP-batch-1-plan.md`（新增）。
- **为什么必须确认**：QNA 冻结后，spec/文档/计划之间必须单一真源——`render-pipeline-1121.md` §9 的四个待决项已由本册全部消解（路由零新增=F6 已取证、F9=B 归 batch-2、批次边界=Q1-Q5 全锁、ctaWatch 目标=Q5 锁定），spec 必须如实更新避免「已裁问题仍标待决」；同时 batch-2 的 6 项（B1-B6，含 F9）要在计划/文档里声明「编号保留、待 reopen」而非悄悄消失。这是「不双写 + 不丢追踪」的收口。
- **当前建议 / 倾向**（`RP-batch-1 架构审查`）：选 **A**：**`render-pipeline-1121.md` 状态 `draft`→`frozen`（本册 T-O 为生效口径）、§9 四项标记为「已裁（Q1-Q5/T-O-5~9）」并留痕；`README.md` 与 `AGENTS.md` 同次同步；新增 `docs/specs/dsh-nano-notepad/plan/RP-batch-1-plan.md` 作为唯一正式计划（§2 引用本台账 `T-O-1`–`T-O-9`）；batch-2 B1-B6/F9 在 spec §4.2 表保留编号不删，注明「待业主 reopen」。**
- **Reasoning**：`AGENTS.md` 交付物表是运行时文件的真源清单，`lib/fx/` 行必须如实更新（否则装包时对不上）；spec `frozen` 状态与本册 QNA 构成「评估层冻结 + 决策层冻结」的双层收口，与 CT-batch-1 的 `design.md`/`qna.md` 结构一致；batch-2 保留编号是「吸收台账的完整性追踪」，防下一轮重挖时丢失上下文。
- **问题（请 [业主] 裁决）**：是否冻结「spec 状态 `frozen`、§9 四项标注已裁留痕、AGENTS.md `lib/fx/` 行与 README 同步、`plan/RP-batch-1-plan.md` 为唯一正式计划、batch-2 B1-B6/F9 编号保留待 reopen」为 `RP-batch-1` 的收口与 F9 衔接口径？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意本轮全部推荐」），冻结为 `T-O-12`。

**【对本问题的解读】**
本批已有两份文档（spec 评估 + 本册 QNA），收口时要确保：spec 的「待决项」全部转为「已裁」，正式计划只有一份（`plan/`），batch-2 的未完成项有明确去处而非静默丢失。文档收口错了会出现「spec 说待决、QNA 说已裁、计划又做第三套」的真源分裂。

**【可选选项清单】**

| 选项 | 收口口径 | 得到什么 / 代价 |
|---|---|---|
| **A（推荐）** | spec `frozen` + §9 标注已裁；AGENTS.md/README 同步；`plan/RP-batch-1-plan.md` 唯一计划；batch-2 保留编号。 | 双层冻结（评估+决策）真源清晰；batch-2 有去处；文档与产物一致。 |
| B | spec 不改，只写 plan。 | 省文档工作；但 spec §9 仍标「待裁」= 已裁问题继续误导，真源分裂。**否决**。 |
| C | batch-2 项从 spec 删（「反正后批」）。 | spec 更薄；但丢失吸收台账的完整性追踪，下一轮 reopen 时没有可回查的编号基线。**否决**。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. `render-pipeline-1121.md`：状态行 `draft → frozen`；§9 四项改为「已裁：`T-O-5/6` 消解路由与 F9 边界、`T-O-8/9` 消解参数与观察目标」；§4 表各项加吸收状态标注。
2. `docs/specs/dsh-nano-notepad/plan/RP-batch-1-plan.md`：新建唯一正式计划，§2 引用 `T-O-1`–`T-O-9`，`draft` 经 [业主] 批准转 `reviewed` 后开工。
3. `dsh-nano-notepad/AGENTS.md`：交付物表 `lib/fx/` 行更新；`docs/specs/dsh-nano-notepad/README.md` 补本批功能行。
4. spec §4.2 表保留 `B1-B6`/`F9` 编号，加注「batch-2 待 [业主] reopen 后进入新一轮 QNA」。

**【推荐选项支持证据与其他选项反例】**

- 支持：CT-batch-1 已示范「`design.md` 评估层 + `qna.md` 决策层 + `plan/` 执行层」三层收口（[CT-batch-1-design.md](../../dsh-nano-explorer-extra/CT-batch-1-design.md) + [CT-batch-1-qna.md](../../dsh-nano-explorer-extra/qna/CT-batch-1-qna.md)），同构即可复用纪律。
- B/C 反例：spec 留「待裁」= 已裁问题误导；删 batch-2 编号 = 丢吸收台账的追踪基线（owner 预期「reopen 时机可能长」，编号正是长线锚点）。

---

## 7. ★ 中场评估 III（收口判定 · 最终总结）`[核心·锁死]`

- **7.1 对 Round 3 的判定**：Q6/Q7/Q8 三题一次裁决，构建交付、验证矩阵、文档收口全部入账——`RP-batch-1` 执行层真相层**已完整冻结**，与开轮判定一致，**无 Round 4**。
- **7.2 全册收口总结（三层递进）**：
  - **Round 1（foundational）**：定结构路线（`T-O-5` mirror `display:contents` 增量单轨 + 函数内回退）与异构边界（`T-O-6` `lib/fx/` 静态 worker 卸载四项纯函数、F9 归 batch-2）；关键取证是把 `dnn.fx.sdk` prefix 路由的既有覆盖面钉死，使 worker 落位变成零扩约工程。
  - **Round 2（executional）**：定 worker 调度粒度（`T-O-7` 分态——逐键主线程保帧内染色、冷启动/回退走 worker）、mirror 参数（`T-O-8` `LINE_TINT_CAP=4_096` / inFence `indexOf` / 回退线 `max(100,N×50%)`）、观测收敛与缓存边界（`T-O-9` rAF 合批 + 内容签名 + 双界 LRU + IDB 会话 `Map`）。
  - **Round 3（executional·收口）**：定交付（`T-O-10` `build()` 复用 + `0.3.0` + worktree + AGENTS.md 同步）、验收（`T-O-11` 纯 `node:test` 四层断言 + `lab/baseline` 基线 + 人工像素对齐）、收口（`T-O-12` spec `frozen` + 唯一 `plan/` + batch-2 编号保留）。
- **7.3 诚实反方制衡（最终）**：本册全部裁决的共性约束是「**单轨不双写**」——mirror 无新旧并存、worker 无第二实现、签名不用 rev 计数器、缓存不升格真源、文档不留待决项。剩余唯一真实不确定性是 **`display:contents` 跨浏览器像素对齐**（T-O-5 已内含验收红线 + 函数内回退兜底），以及 `ctaWatch` rAF 合批的实际收益量（T-O-9 选了保守方案，dev 实测可再精调观察目标）。两者均已在台账内登记验收锚，不构成推翻项。
- **7.4 交付解锁**：本册 `T-O-1`–`T-O-12` 即 `RP-batch-1` 的全部生效口径；`docs/specs/dsh-nano-notepad/plan/RP-batch-1-plan.md` 为本批唯一正式计划（`draft`，经 [业主] 批准转 `reviewed` 后在 `.agents/worktrees/rp-batch-1-render-pipeline` 开工）。本册 QNA 自此 `已冻结`，后续修订只能 append 新 T-O 行、不得改既有行。
