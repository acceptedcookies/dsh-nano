# DNN-RP1：[DNN] 渲染管线升级 — 增量 DOM、Worker 卸载与缓存边界（吸收 t3code 工程）

> 功能簇: `DNN-RP1：[DNN] 渲染管线升级（Render Pipeline 1121）`
> 讨论日期: `2026-11-21`
> 文档性质: 吸收评估 + 实施台账（不是新建插件）
> 关联真源:
> - `context/t3code` bare 检出 `c1464d6774cf4c690aba3fb20b8094a35396d130`（经 `git show` 逐文件核验）
> - `.temp/copy-t3code/code-mining-report.md`（[DNEE] 向 CT 阶段 1 挖掘报告）
> - [dsh] 宿主 `dsh-client-ui-deliverables` `ChangedFiles.tsx`（卡片真源）
> - `dsh-nano-notepad/src/client/**` 当前 `HEAD`（`80b4057`）
> - [DNEE] `CT-batch-1-design.md`（同方法论的姊妹文档，批次划分格式对齐）
> 关联原则: `AGENTS.md`（UI 宿主优先、不得过度仪式、单一真源、不得擅自扩约）
> 文档状态: `draft` — 待 [业主] 冻结批次边界后进入实施

---

## 0. 背景与 [业主] 心智模型

### 0.1 问题陈述

[业主] 要求对照 `t3code` 真源，回答：[DNN] 能否通过「WASM offload 或 WebGPU」为前端渲染提供更好的管线，增加性能、增强稳定性。

核验结论：**t3code 的渲染顺滑来自「Worker/WASM 异构卸载 + 增量 DOM + 视口批加载 + 缓存边界」四层系统工程，而非 GPU。** `git grep` 其 `apps/web` 全部源码：**0 处 `webgpu`、0 处 `webgl`**；`OffscreenCanvas` 仅出现在 `imageDecode.worker.ts` 与 `office/*.worker.ts`（图片/Office 二进制解码），不渲染文本。

[DNN] 当前的真实瓶颈不是 tokenizer 慢，是**输入路径上每帧 O(文档) 的 DOM 重建 + 无变更区分**（见 §2 测绘）。

### 0.2 [业主] 心智模型 `MM1`–`MM7`

- **[MM1] 吸收优先**：只要符合 [dsh] 底层约束、[DNN] 业务模式与性能要求，t3code 的可迁移工程尽量吸收进入本批，价值落地、表达、测试一次完成；不为追求"漂亮分层"留到后批。
- **[MM2] 软件异构优先于 GPU**：文本渲染的正确解是 Worker 剥离计算 + 增量 DOM；WebGPU/WebGL/Canvas 渲文本为一票否决（选区/IME/读屏/Ctrl+F 全失，且 mirror 必须像素对齐 textarea，光栅对齐不可维系）。
- **[MM3] 增量是主收益，WASM 是降本**：先解决「同一份内容不重建 DOM」，再谈「compute 放哪跑」。高亮的正则才 121 行，瓶颈从来不在它。
- **[MM4] 单一真源，缓存即凭证**：所有缓存是 consumption receipt（content-hash/版本号），绝不成为可执行 payload 或第二份可写真源。`md5` etag 契约已落库，不可换算法。
- **[MM5] 零额外契约**：不新增路由、不改 error 枚举、不扩 inject、不碰 IndexedDB schema；唯一例外是**一条静态 worker 资源路由**（与既有 `/nano-notepad/fx/sdk/*` 同构，需要业主在本 spec 9.x 确认）。
- **[MM6] UI 宿主优先**：全部改在 `.np-` 自有 DOM 与自有 `lib/client.js` 内，零宿主嫁接；不引入 React/ShadowDOM 绑定库（`@pierre/diffs` 取算法不取库）。
- **[MM7] 诚实测量驱动**：先跑 perf lab 拿 `highlight`/`highlight-dom`/`render`/`keystroke-input` 基线，改动只对超阈值的层动刀；改动后用同一 lab 验证，不接受"感觉更快"。

### 0.3 显式排除

- WebGPU/WebGL/OffscreenCanvas 文本渲染（否决依据见 §5）。
- 整包引入 `@pierre/diffs`、`@pierre/trees`、`@legendapp/list`（React 绑定 + ShadowDOM CSS 体系，与原生 JS 令牌规则冲突）。
- 编辑器态实时改写磁盘；[DNPR]/[DNMS]/[DNEE] 任何代码。
- IndexedDB schema 变更（schema 4 冻结）。
- `md5Hex` → 更强摘要的替换（已有 etag 真源，仅作复算时机治理，不换算法）。

---

## 1. t3code 真源核验档案

> 以下每条都有 `apps/web/src/` 相对路径 + 行号 + 实际读到的实现，非转述。

### 1.1 已核验的常驻机制

| # | 机制 | 真源 file:line | 实现要点 |
|---|---|---|---|
| T1 | Worker 池自适应规模 | `components/DiffWorkerPoolProvider.tsx:22-25` | `Math.max(2, Math.min(6, Math.floor(cores/2)))`，cores 缺省 4 |
| T2 | 池级 AST LRU + 防卡截断 | 同 :64-72 | `totalASTLRUCacheSize: 240`、`tokenizeMaxLineLength: 1_000`、`useTokenTransformer: true` |
| T3 | 池生命周期引用计数 + 空闲回收 | 同 :82-143 | `consumers` 计数，0 后 `DIFF_WORKER_IDLE_TTL_MS = 30_000` 才 `terminate()` |
| T4 | 主题原地刷新 | 同 :36-49 | `pool.setRenderOptions({theme})`，不重建 worker 与组件树 |
| T5 | WASM lexer 断言 | `lib/syntaxHighlighting.ts:14-17` | "hand-written WASM lexers tokenize large files 10-40x faster than Shiki and never backtrack"，`preferredHighlighter: 'highlights'`；真身是 **`@pierre/highlights@0.5.1`**（Pierre 自研 WAT 手写 WASM lexer，导出 `LiveTokenizer`/`codeToTokens`，worker 内 `canUseWASM()` 探测 SIMD；一线程只允许一种 highlighter 类型） |
| T6 | 流式行索引 | `components/files/largeText.worker.ts:13-28,114-190` | `Uint32Array[]`（每页 65536 行偏移），`fetch Range: bytes=0-MAX` 分块，`entries>5M/byte>256MiB/line>1MiB/0x00` 四熔断，BOM 跳过 |
| T7 | 双界 LRU | `lib/lruCache.ts:6-68` | `LRUCache(maxEntries, maxMemoryBytes)`；`approximateSize > maxMemoryBytes` 直接拒收（:26-28）；evict 从 `Map` 迭代序取最旧 |
| T8 | 增量行高亮文档 | `lib/incrementalHighlighting.ts:57-108` | `createStreamTokenizer` 返回 `{stable, unstable}`；已完成行 `completedLines` **保留节点身份**，仅末尾 unstable 行重渲染；非前缀更新 → `dispose()` 全量回退；`ansi`/CRLF 走全量路 |
| T9 | 共享 IntersectionObserver | `lib/observeIntersection.ts:27-125` | 按 `(root, rootMargin, threshold)` 键控共享 observer；元素 root 走 `WeakMap`；`waiting` 集保证重复观测不丢事件 |
| T10 | 视口预取哨兵 | `components/diffs/DiffFileLoadingBoundary.tsx:14-25` | `rootMargin: "600px"`，isNear 且 count>0 就拉下一批；每批 `INITIAL_FILE_COUNT = 4` |
| T11 | FNV-1a 内容版本 | `lib/diffRendering.ts:21-41,254-256` | 双种子 FNV-1a 组成 `scope:len:h1:h2`，单文件变不整组重绘 |
| T12 | 树增量成本模型 | `components/files/fileTreePathReconciliation.ts:4-38` | `REBUILD_COST_IN_FOLDER_OPERATIONS = 300`；`shouldRebuildFileTree` 用「同父目录批量操作数 vs max(prev,next)」决策增量还是全量 |
| T13 | 自研窗口虚拟化阈值 | `components/chat/ChangedFilesTree.tsx:26-27` | `VIRTUALIZE_AFTER_ROWS = 250`、`ROW_OVERSCAN = 8`；焦点行强制挂载；rAF 节流测量 |
| T14 | 固定几何防抖动 | `components/diffs/StyledDiffCodeView.tsx:16-22,262-274` | `itemMetrics` 锁死 header/separator/padding；`--diffs-code-grid: var(...) minmax(0,1fr)` 消灭自动列宽抖动 |
| T15 | worker→主线程**增量回传协议** `hast-ops-v1` | `@pierre/diffs` `WorkerPoolManager.js:357`、workerHandlers | 结果编码为 `EncodedHastLines{ops:Int32Array, offsets:Uint32Array(每行2槽), strings[](驻留去重), text, extras}`，`postMessage(resp,[ops.buffer,offsets.buffer])` **transferable**；decode 端 `setDeferredArrayItem` 惰性逐行还原；`file`/`diff` 按 `highlightKey` 去重，`setRenderOptions` 递增 version 作废在途任务 |
| T16 | 通用 worker RPC | `office/worker-rpc.ts` | `call({key,transfer,signal})`：transfer 数组移动 ArrayBuffer/OffscreenCanvas，同 key 调用互相顶替；office 系 worker 内 `OffscreenCanvas` 渲染 + `transferToImageBitmap()` 回传 bitmap（二进制解码场景，非文本） |
| T17 | 共享 ResizeObserver | `lib/observeResize.ts` | 与 `observeIntersection` 同构的全局单例 RO，waiting/last 去重；回调经 `flushSync` 批量（React 绑定层，纯 JS 换 rAF） |
| T18 | `content-visibility` 实际使用点 | `IssueRow`/`PullRequestRow`（`contain-intrinsic-block-size:56.5px`）、`SummaryTab`（44/160px）、`TimelineTab`（48px） | **修正早先「未使用」判断**：用在固定行高列表行，正是 DNN 预览块的同构场景 |

### 1.2 性能相关 commit 记录（git log 实测）

| commit | 标题 | 教训类型 |
|---|---|---|
| `a0ef9d8` | "editable file drag selection no longer breaks across virtualized scroll windows" | **虚拟化破坏选区/焦点**——对本 spec 直接适用：mirror 不能用「丢窗口外 DOM」的传统虚拟化 |
| `391f93f` | "stop reloading unchanged file previews during agent commands" | 命令运行中预览别乱重载 — 对应 `d067a04`「慢链接不顶掉 picker 打开的文件」，= `renderToken` 守卫 |
| `67933a2` | "complete Changes preview reuses its tracked-only pass" | 同一份计算不跑两遍 |
| `a0ca0bf` + `0fd4822` | "resolve a branch's base once while its refs and config are unchanged" / "per-file diff reads reuse the preview's merge base" | **没变的东西不重新算**——与 DNN `pruneImages`/`renderTree`/`renderJsonTree` 的浪费同构 |
| `220a2b8` | "idle Git polls no longer re-read local status when no ref moved" | 无事发生也要零成本——对应 `ctaWatch`/sig skip |
| `e668e61` | "scrolling a PR description no longer moves focus to the condensed header" | 视口优化不得偷焦点 |
| `f8f4a0b` | "Verilog, SystemVerilog, and VHDL code is syntax highlighted" | 高频补语言，走 `setCustomExtension` 增配而非重写 lexer |
| `f60c747` | "open PDF attachments no longer reload while the agent works" | 增量视口 + 渲染守卫禁止 agent 活动期乱重绘 |

### 1.3 补充核验

- **WebGPU/WebGL = 0**（`git grep` 全量，`OffscreenCanvas` 只在 `imageDecode`/`office` 解码 worker，`pdfDocument.ts` 限 `canvasMaxAreaInBytes:32MiB`，PdfViewer 走离屏 buffer→整幅 drawImage 防 resize 闪白——均是二进制解码，不是文本渲染）。
- **`will-change` 全仓仅 2 处**（按钮 scale、地图拖动 transform）——GPU compositor 提示被刻意克制，性能来自结构与调度而非 CSS 魔法。
- `@pierre/diffs/worker` 与 `@pierre/highlights` **本身无 React 依赖**（React 绑定是另一层 `react/`），若未来需要真正的 WASM lexer 可裸引，不走 React。

### 1.4 踩坑记录（核验到的，直接适用于 DNN）

1. **`a0ef9d8` 框选破坏** = 传统窗口虚拟化与「原生选区/指针拖拽」不兼容。DNN mirror 若做 DOM 虚拟化会让 selection highlight 落不到文字。→ 方案改用 `display:contents` 行包装（无盒模型，inline flow 不变）。
2. **`391f93f`/`f60c747` agent 期重载** = 异步内容流期间不可重建整棵预览树。DNN 预览/JSON 树同理，必须以 `renderToken` + 内容版本校验防止串味。
3. **`220a2b8` 无事重读** = 订阅器/callback 触发时若状态未变必须 O(1) 早退。DNN `renderTree`/`applyCopy`/`ctaWatch` 全部违反。
4. **`0fd4822` merge-base 复用** = 一次算好的关联数据要按键缓存复用，不要每个消费方重跑。DNN `pruneImages`/`stampContentMd5` 每次全库重扫是同病。
5. **`tokenizeMaxLineLength: 1_000` 截断** = 单行超长的压缩文件（min.js/map）炸 tokenizer。DNN `highlightSource`/`inlineMd` 完全无熔断。

---

## 2. DNN 渲染管线测绘（主线程重活榜）

> 测绘于 `dsh-nano-notepad/src/client/**`，`HEAD = 80b4057`。

### 2.1 按成本降序

| # | 层 | file:line | 成本模型 | 频率 |
|---|---|---|---|---|
| H1 | mirror DOM 重建 | `panel.js:1187-1203` | `highlightSource(全文)` + `innerHTML` 全文重建 + `querySelectorAll('[data-np-image]')` 全扫 + `fitMirror` 6 次 layout | **每帧一次**（`schedulePaintMirror` :1209 rAF 合并；`renderBody` :1840 每次 render 都同步跑） |
| H2 | `render()` 面板 | `panel.js:2023-2061` | `applyCopy` 全 `[data-i18n]` 遍历 + `renderFx` + `renderTree` + `renderTabs` + `renderChrome` + `renderBody` + rAF 布局 | **55+ 触发点**（locale/theme/workspace/BroadcastChannel/resize/任意文件操作） |
| H3 | 预览 innerHTML | `panel.js:1884-1910` | `imagesById` IDB + `renderMarkdown`/`renderJsonTree`/`sanitizeRichHtml` 整段 parse + innerHTML；`renderCache` key 含整篇 markdown（:1889）每键必 miss | 每次切视图/回 rendered |
| H4 | 文件树 + tabs | `panel.js:1646-1743` | 每 render 全量 `innerHTML` + rAF 内每行 `.np-node-name` `scrollWidth`/`clientWidth` layout 读 | 每次 render() |
| H5 | 每键 O(文档) | `panel.js:4323-4360`, `db.js:645` | `slashQuery` `slice(0,caret)`、`.json` 文件 `validateJson` 全文、`saveDraft`→`md5Hex` 全文 | 每键 |
| H6 | IDB 批量 | `db.js:623-640` | `commitVersion`→`pruneImages` `getAll` 全 nodes+versions + `imageIdsIn` regex 扫每个 draft；`loadSnapshot`/`stampContentMd5` 全语料重哈希（13 调用点） | 每次 commit/import/启动 |
| H7 | ctaWatch 观宿主 | `panel.js:4886-4895` | `document.body` 全 subtree MutationObserver → 每个 added node `matches/querySelectorAll/closest` | 宿主聊天流每条追加（token 级） |
| H8 | fx-core.wasm 主线程 | `fx-runtime.js:34-80` | `createFxEngine({wasm})` 每 one-shot 重新实例化，turn 事件 for-await 在主线程 | 每次 fx run |
| H9 | sqlite worker（已对齐） | `fx-sqlite.js:49-94` | module worker + opfs-sahpool（:88），主线程只 promiser | 每条 SQL 一次 postMessage |

### 2.2 已对齐/无需动的

- `fx-sqlite` 已在独立 worker（t3code 同构，OPFS persistence）。
- `perf` span/track 体系已就位（`highlight`/`highlight-dom`/`render`/`keystroke-input`/`draft-commit`/`mirror-resize`）— 直接当验收指标。
- `renderToken` 版本守卫已在 renderBody（:1762, :1898）。

### 2.3 与 [DNEE] CT-Batch-1 的差异

[DNEE] 是大文件树 + Diff 审阅（几千行 diff、几万文件树），其虚拟化收益显著。[DNN] 是浮层记事本（单文档几十个 KB 量级 + 少量文件树 + tab），**收益最大的是 mirror 增量 DOM 和 ctaWatch/IDBC 收敛，而不是行窗口虚拟化**。吸取同构思想，不抄同构代码。

---

## 3. 吸收台账（t3code → DNN 映射）

| t3code 机制 | DNN 吸收形态 | 落点 file:line | 备注 |
|---|---|---|---|
| T8 stable-lines 增量 | mirror 行级 `display:contents` 包装 + 脏行段 DOM 替换 | `panel.js:1187-1203` | **核心** |
| T11 内容版本 | 预览块级 `Map<blockText, Element>` 记忆化；node→imageIds 缓存 | `panel.js:1884-1910`、`db.js:623` | |
| T9 共享 IO | 无对应需要（无 IntersectionObserver）；等价物 = ctaWatch 收敛 | `panel.js:4886` | 借思想不借代码 |
| T2 行截断熔断 | `highlightSource`/`inlineMd`/`inlineJson` 单行 >4KB 走 text 模式 | `highlight.js:114-120` | 防 min.js |
| T7 双界 LRU | `renderCache`/`peekCache` 加字节界（80 行照搬） | `panel.js:1889-1907,1298` | |
| T12 增量成本模型 | `renderTree`/`renderTabs` 签名脏检（O(N) sig 跳过 O(N) DOM）；增量 tree 是后批 | `panel.js:1646-1743` | |
| T14 + T18 | 固定几何 + 行级 `content-visibility` | 预览块 `content-visibility: auto` + `contain-intrinsic-size`（防 scrollbar 跳）；复刻 t3code IssueRow 的 `contain-intrinsic-block-size` 用法 | `.np-read` 块规则 | CSS 免费收益，有 t3code 同类先例 |
| T6 流式行索引 | 不吸收（DNN 无超大文件打开路径，`/read` 已有字节上限） | — | 低优先，略 |
| T1/T3 worker 生命周期 | 渲染 worker：requestId 过期作废 + 主线程 fallback；fx 引擎 worker 化 | `fx-runtime.js`、新 `np-render-worker` | 批次边界见 §4 |
| T5 WASM lexer | **本批不吸收**（DNN 是 regex tinter，非 Shiki；取增量 DOM 不取 lexer）。注意 `@pierre/highlights`/`@pierre/diffs/worker` 无 React 依赖，是 B6 的裸引候选 | — | |
| T15 worker 增量回传 | F4 渲染 worker 的自研等价协议：按行返回 `{dirtyStart,dirtyEnd,html[]}`（结构化克隆足够，行级粒度无需 transferable） | `np-render-worker` | 不照搬 hast-ops，粒度更粗 |
| T17 共享 RO | 可选：mirror/fx/setting 3 处 RO 归一为按键控单例 | `panel.js:2389,2488,3223,4376` | 小项，随 F3 顺手 |
| T10 视口预取 | 无对应（DNN 文件树无量级）；思想 = 焦点/可视行不丢 | — | |

---

## 4. 分批方案（按价值排序）

### 4.1 Batch-1（立即实施，价值从高到低）

| # | 项 | 价值 | 成本 | 对应真源 |
|---|---|---|---|---|
| F1 | mirror 行级 `display:contents` + 脏行段增量 DOM | ★★★★★ | M | T8, `a0ef9d8` |
| F2 | 预览块级记忆化 + `content-visibility: auto` | ★★★★ | M | T11, T14, T18 |
| F3 | `ctaWatch` rAF 合批 + `[data-i18n]` 遍历签名脏检 + `renderTree`/`renderTabs` sig skip | ★★★★ | S | `220a2b8`, `0fd4822` |
| F4 | 渲染 worker：`highlightSource`/`validateJson`/`renderJsonTree` 进独立 module worker（requestId 取消 + 主线程 fallback） | ★★★★ | M-L | T1, T3 |
| F5 | `pruneImages`/`stampContentMd5`/`saveDraft` 增量（node→imageIds 内存态缓存 + 不重扫） | ★★★ | S | `67933a2`, `a0ca0bf` |
| F6 | `highlightSource`/`inlineMd`/`inlineJson` 单行 >4KB 熔断 | ★★★ | XS | T2 |
| F7 | `renderCache`/`peekCache` 双界 LRU（条目 + 字节） | ★★ | XS | T7 |
| F8 | `md5Hex` 时序优化（仅 `flushSave`/`commit` 两处算，不在 `sanitizeNodes`/`createNode`/`import` 重算） | ★★ | S | `67933a2` |
| F9 | fx-core.wasm 引擎进 worker（LLM turn 占主线程，工具调用经 postMessage 回主线程 corpus） | ★★★ | L | T1, H8 |
| F10 | perf lab 基线 + 回归断言（`highlight-dom`/`render`/`draft-commit` 预算） | 必需 | S | — |

**批次内实现顺序建议**：F10 先跑基线 → F6/F7/F8/F5 立取小项 → F1/F2 结构项 → F3 观测收敛 → F4 worker → F9 引擎 worker（最重，可拆到 batch-2 若超预算）。

### 4.2 Batch-2（reopen 时机较长，当前不实现）

| # | 项 | 后置理由 |
|---|---|---|
| B1 | 文件树行窗口虚拟化（`VIRTUALIZE_AFTER_ROWS=250` 窗口） | 笔记数远小于阈值，sig skip 已够用；虚拟化引入滚动测量债 |
| B2 | `fx-core.wasm` 引擎进 worker（若 F9 因工具链复杂超预算则后置） | 需 corpus/工具调用的 postMessage 代理层，单独一轮验证 |
| B3 | 文件树 `buildFileTreePathUpdates` 同构增量（sort + batch add/remove） | 依赖 t3code 成本模型，notes 数量级下 ROI 低 |
| B4 | `Uint32Array` 行偏移索引 + 大文本流式预览 | DNN `/read` 已有字节上限，打开即拒绝超大文件 |
| B5 | `@pierre/trees` 风格树模型批处理（若未来节点数量级爆炸） | 当前 state.nodes 量级用不到 |
| B6 | WASM 化 `renderMarkdown`/`highlightSource`（若经测量仍是 CPU 瓶颈） | 在 F1/F2/F4 之后才有意义，届时性能差距若还大再上 WASM |

### 4.3 一票否决

- WebGPU/WebGL/Canvas 文本渲染（选区/IME/读屏/对齐全失，t3code 自己也不用）。
- 整包引入 `@pierre/diffs`/`@pierre/trees`/`@legendapp/list`（React/ShadowDOM 绑定）。
- `md5` etag 换算法（已落库真源）。
- `content-visibility` 套可编辑 mirror（会破坏选中测量）。

---

## 5. F1 核心方案：mirror 增量 DOM（`display:contents`）

### 5.1 现状

`panel.js:1187-1203`：每帧 `highlightSource(全文)` → `layer.innerHTML` 全文重建。`highlight.js:117-119` 注释记录：「A block per line grows a different line box」——**块级行包装被否过**。

### 5.2 方案

mirror DOM 改为：`layer` 内含 N 个 `<span data-l>`（每行一个，`display:contents`）+ N-1 个 `\n` 文本节点夹在行间。`display:contents` 不产生盒模型，行内流与现「单一 pre-wrap 文本流」**像素等价**；同时允许按行 `innerHTML` 替换。

配套状态：
- `state.mirrorLines` = `Array<{text: string, html: string, inFence: boolean}>`
- `state.mirrorDirty` = `[firstDirty, lastDirty]` 行区间（按前缀/后缀 diff 计算）
- `state.mirrorFence` = `boolean[]` 每行 fence 态前缀

更新算法：
1. 新文本 `lines[]` 与 `state.mirrorLines` 求公共前缀/后缀 → 脏段 `[lo, hi)`。
2. 重算 `inFence`（O(N) `indexOf('```')` 非正则，纯字符串）。
3. 若 `inFence[hi]` 起与旧值不同，脏段下延至行尾（fence 切换影响所有后续行）。
4. 脏段内每行：若 `html` 未变跳过 DOM；变则 `layer.children[lineIndex].innerHTML = html`。
5. 行数变化时在脏段边界 `replaceChildren`/`insertBefore` 新增行包装。

### 5.3 与 `a0ef9d8` 踩坑的边界

传统虚拟化「丢窗口外 DOM」会破坏 textarea selection 对齐。**`display:contents` 行包装不丢任何 DOM**，selection 由 textarea 渲染而非 mirror，对齐不受影响。该方案也解释了为何块级行包装被否（`div` 有盒模型，`display:contents` 没有）。

### 5.4 风险

- `display:contents` 行包装需跨浏览器验证（Chromium/WebKit/Firefox 均支持 inline `display:contents` 的 layout 等价性）。
- `.np-mirror span` 已有 `font:inherit;padding:0;margin:0;border:0` 重置（panel.js:476），新增 `display:contents` 无副作用。
- 若验证不通过，退回 R0：行级 HTML 缓存 + 单次 `innerHTML`（只杀 CPU 不杀 DOM）。

---

## 6. 基础设施决策（需 [业主] 冻结）

### 6.1 F4 渲染 worker 的资源路由

需求：`new Worker('/nano-notepad/fx/sdk/np-render-worker.mjs', {type:'module'})`。与既有 `np-sqlite-worker.mjs`/`opfs-worker-probe.js` 同构，属于**静态资源路由**（非 RPC）。

- 不新增 RPC 语义、不扩 error 枚举、不动 `lib/bindings.js` 合同表。
- 若宿主路由不能新增，fallback = 主线程调用（现有函数签名完全复用，只在调度点包一层 promiser）。

**待冻结**：是否允许新增 `/nano-notepad/fx/sdk/np-render-worker.mjs` 静态路由（与既有 `lib/fx/*.mjs` 静态资源同策略）。

### 6.2 fx 引擎 worker（F9）

`createFxEngine` 在 worker 中实例化 fx-core.wasm；`note_*` 工具调用经 `postMessage` 回主线程进入 corpus（`fx-corpus.js`）。`browser.js`/`wasm-runtime.js` 已按 worker 兼容写过（`sqlite3.mjs` 同构）。

- 工具调用协议：`{type:'tool', name, args}` 主线程响应 `{type:'result', ok, content}`。
- 若跨线程 IDB 接入导致 token 等待过长，回退为主线程引擎（不破坏功能）。

### 6.3 缓存边界（MM4）

| 缓存 | 界 | 复核点 |
|---|---|---|
| `renderCache` 预览 HTML | `Map` 最多 64 条 + 总字节 ≤ 32MB | panel.js:1889-1907 |
| `peekCache` 图片 data URL | `Map` 最多 8 条 + 总字节 ≤ 40MB | panel.js:1298 |
| `mirrorLines`/`mirrorFence` | 随 `state.ui.currentId` 绑定，切文件即弃 | panel.js:1187 内部 |
| node→imageIds（F5） | 会话内 `Map`，不持久化 | db.js:623 |

每条缓存都记录 approximateSize；单条超限不拒收则自动压缩（文本 HTML 不缓存 >1MB 单条）。

---

## 7. 验收与测试

### 7.1 既有测试必须全绿

- `node --test dsh-nano-notepad/test/nue-migration.test.mjs`（零模式断言不变 — `data-changed-files`/`np-to-notepad` 仍允许存在且由业主裁决恢复，不删）。
- `node scripts/build-client.mjs` 产物 `lib/client.js` 非空。

### 7.2 新增断言（spec §10 新增）

- mirror DOM 结构断言：`document.querySelectorAll('.np-mirror > span[data-l]')` 行数 == `source.value.split('\n').length`；行间 `\n` 文本节点数 == 行数 - 1。
- 脏行段断言：编辑单行后仅 `children[dirty]` 的 `innerHTML` 被重写（`MutationObserver` 记录验证）。
- `ctaWatch` 无文档级 observer：断言 `new MutationObserver` 的 `observe` 目标不是 `document.body`（若改收窄）。
- `highlightSource` 熔断断言：单行 5KB 输入返回纯转义无 span 包装。
- `renderTree`/`renderTabs` sig skip 断言：nodes/ui 未变时 `innerHTML` 未写入（`MutationObserver` 静默）。

### 7.3 手工验收（dsh-dev）

1. 输入一个大 markdown 便签（>30KB，含表格/fence/image token），连续打字 60 字符：**观察 mirror 刷新是否即时、无明显掉帧**，perf `highlight-dom` span 应显著下降。
2. 切视图 rendered ↔ source 往返：内容一致，滚动位置恢复。
3. 打开 fx run：LLM 流式期间打字不卡。
4. 聊天流滚动 + 卡片复制按钮无抖动。
5. `.json` 大文件连续输入：预览无白屏闪。
6. `⌘E` `1` 面板开关后一切照旧。

---

## 8. 与 [DNEE] CT-Batch-1 的接口边界

- **不共享**任何实现文件；两者仅概念对齐（增量 + 缓存边界 + Worker）。
- [DNEE] `CT-batch-1` 的文件树增量树模型（`fileTreePathReconciliation`）在 DNN 不适用（量级不同）；DNN 的 mirror 增量 DOM 模型对 DNEE 也不适用（DNEE 无 mirror）。
- 两者都消费同一 `perf-review` 单例，不重复注册 host poll。

---

## 9. 待 [业主] 冻结项

1. **F4 worker 路由**：允许新增 `/nano-notepad/fx/sdk/np-render-worker.mjs` 静态路由（同 lib/fx 静态资源策略），不要求契约表登记？
2. **F9 fx 引擎 worker**：接受「工具调用经 postMessage 回主线程」的同步阻塞成本，作为 fx-core 主线程卸载的交换？
3. **批次边界**：F1-F10 是否全部进入 batch-1，还是 F9 单列可拆？
4. **`ctaWatch` 收窄目标**：观察 `[data-conversation]`/`[data-conversation-scroll]`（优先宿主锚点）还是 `document.body` 保留 + rAF 批量（保守）？前者便宜但依赖宿主结构，后者零假设。

---

## A. 附录

### A.1 版本历史

| 版本 | 日期 | 修改者 | 主要变更 |
|---|---|---|---|
| `v0.1` | `2026-11-21` | swe-2 | 对照 t3code 真源（`c1464d6` bare）与 DNN 现态测绘，产出吸收台账、分批方案与待冻结项 |
