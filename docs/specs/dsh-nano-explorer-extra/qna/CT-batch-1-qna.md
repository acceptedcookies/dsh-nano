# CT-batch-1 QNA · [DNEE] Copy-T3CODE 第一批次真相层决策册

> **范围（scope）**：锁定 `[DNEE]`（`dsh-nano-explorer-extra`）下一阶段工作 `CT-batch-1` 的基础架构与执行层 `[真相层]`；承接 [CT-batch-1-design.md](../CT-batch-1-design.md) 的前置调研与设计评估，但**只以本册 §1 冻结的 `T-O-*` 为唯一生效口径**，供工作树内后续 `CT-batch-1` 正式计划唯一引用。
> **qna 位点**：`deep-dive`（渐进式：第 1 轮 × 2 题 `foundational` → 后续每轮 × 3 题 `executional`，直至执行层 `[真相层]` 全冻结）。
> **角色配置**：提问 `CT-batch-1 架构审查`；裁决 `[业主]`。`second-opinion` 自 Round 1 起 `retired`，不设 second-opinion 槽位。
> **下游消费者**：`CT-batch-1` 正式实施计划（工作树内计划 §2 直接引用本册 §1 冻结的 `T-O-*`）。
> **文档状态**：`已冻结`（2026-11-21；开轮基线 `T-O-1`–`T-O-4` 与 Round 1–3 全部 `T-O-5`–`T-O-12` 已冻结；全册审校无内部冲突与竞态遗漏，解锁 `docs/specs/dsh-nano-explorer-extra/plan/CT-batch-1-plan.md` 撰写）。取证快照 `main@30ca969`。

---

## 0. 分轮状态总览

| 轮次 | 题号区间 | 焦点 | second-opinion | 状态 |
|---|---|---|---|---|
| Round 1 | `Q1–Q2` | `foundational`：宿主只读合约边界与前端渲染 / 软件异构总路线 | `retired` | 已冻结，2/2 已答 |
| Round 2 | `Q3–Q5` | `executional`：宿主基线 / 安全 / 缓存规格、Diff 引擎预算与 Viewed 持久化、树过滤与三视角抽屉流转 | `retired` | 已冻结，3/3 已答 |
| Round 3 | `Q6–Q8` | `executional`（收口轮）：视觉几何与 UI 合规红线、可观测性与测试验证矩阵、工作树交付与计划收口 | `retired` | 已冻结，3/3 已答 |

本册题号自 `Q1`、Truth-ID 自 `T-O-1` 起编，按轮次 append 续编、不回收。Round 1–3 共 8 题已全部完成渐进冻结，共沉淀 `T-O-1`–`T-O-12`。

---

## 1. ★ Truth-Gate 台账（已锁定真值 · NORMATIVE · append-only across rounds）`[核心·锁死]`

> **渐进引擎**：每轮 `[业主]` 答复即固化为编号 `T-O`，作「下游唯一口径 + 下一轮提问约束」。[CT-batch-1-design.md](../CT-batch-1-design.md) 中的待决项（§9.1）与评估草案仅作提问输入引用，不自动成为 `[真相层]`；冲突一律以本台账最新 `T-O-*` 为准。

| Truth-ID | 子类型 | 已锁定真相（一句话 + 硬约束）| 来源（Round / Q） | 驱动了哪些后续题 | 下游约束 |
|---|---|---|---|---|---|
| `T-O-1` | `foundational` | **阶段锁定与插件边界（反 Orca）**：本阶段名为 `CT-batch-1`，全部改造严格限定在 `[DNEE]` 内，聚焦吸收 `t3code` 在文件视图（改动聚焦/筛选）、Git 历史与基线比对、Diff 审阅可视化及渲染性能方面的优势；严禁向 `[DNPR]` 或其他插件拓展，严禁走 Orca 巨无霸 IDE 形态（不做多标签代码编辑器、内置终端面板或常驻全仓磁盘索引）。 | 开轮基线 / `[业主]` 既定心智模型 `MM1`–`MM3` | `Q1`、`Q2`、`Q5`、`Q8` | `[DNEE]` 不得新增对 `[DNPR]`、`[DNT]`、`[DNN]`、`[DNMS]`、`[DNCS]`、`[DNK]` 的专有侧载协议；Batch-2 本地 Git 写操作与 Batch-3 `gh`/`glab` PR 集成不混入本阶段提交。 |
| `T-O-2` | `foundational` | **UI 宿主优先与零新增 DOM 嫁接**：严格遵守 [DESIGN.md](../../dsh-nano-ui/DESIGN.md) 分层顺序（宿主原语 → `dsh-nano-ui` → `nano-ui-exempt`）；优先复用 `[dsh]` 原生 `FileTree`、`dsh-client-ui-primitives` 与 `ui-theme` 全局 CSS 变量（`--shiki-token-*`、`--dsw-alias-file-diff-*`）；除 `DESIGN.md` 第 8 节已批准的文件树状态着色例外外，严禁新增任何宿主内部 DOM 嫁接选择器。 | 开轮基线 / `[业主]` 既定心智模型 `MM4`；[DESIGN.md:180,194-209](../../dsh-nano-ui/DESIGN.md#L180) | `Q2`、`Q5`、`Q6` | 所有新控件与配色优先走宿主原语与 `--dsw-*` / `--shiki-token-*`；`check-ui-rules` 对 `[DNEE]` 不得出现新增 U5/U2 未豁免违规。 |
| `T-O-3` | `foundational` | **零卡顿性能优先与 GPU/WebGPU 诚实工程边界**：以大仓无阻塞、状态切换零闪烁、长 Diff `60fps` 滚动为核心体验标尺，系统性采用缓存、软件异构与虚拟化；正文 Diff 与文件树坚持浏览器 DOM 虚拟化 + CSS Containment / GPU Compositor 合成层隔离，不用 WebGPU/Canvas 2D 替代原生可查可复制的 DOM 文本（`context/t3code` 实证 0 处 WebGPU 文本渲染），仅给未来千级节点提交图谱保留独立渲染接口。 | 开轮基线 / `[业主]` 既定心智模型 `MM5`–`MM7`；[code-mining-report.md](../../../../.temp/copy-t3code/code-mining-report.md) | `Q2`、`Q4`、`Q7` | 主审阅流必须保证原生 `Cmd+F` 查找、文本划选复制与无障碍语义完整，并用可量化的防卡死阈值（如单行 `>1000ch` 保护）与性能 span 验收。 |
| `T-O-4` | `foundational` | **长期治理与零侧载铁律**：一切设计与执行决策必须服从「能硬切就不要双写、能彻底退役就不要提供兼容、各插件保持功能与协议中立、不得构建专用耦合协议或通道」，并与仓规 [AGENTS.md:39-47](../../../../AGENTS.md#L39-L47)（插件中立、上层建筑归 host、不得侧载、单一真源、不得擅自扩约、不得过度仪式、worktree 规范）共同生效。 | 开轮基线 / `[业主]` 本次指示与 [AGENTS.md:39-47](../../../../AGENTS.md#L39-L47) | `Q1`–`Q8` | 禁止保留新旧并存的降级开关、兼容适配器、双份状态派生或私有跨插件通道；旧逻辑同次发布直接退役并清理测试与文档口径。 |
| `T-O-5` | `foundational` | **宿主维持既有 20 条路由零新增，原地扩展只读参数并硬切统一读取器**：`GET /status` 平行既有 `only=stats` 增加按需 `only=base-diff`（默认轮询零额外开销）；`POST /diff` 扩展互斥只读参数 `{ commit?, base?, ignoreWhitespace? }`（默认无新参行为与现网 `HEAD` 等价），同一次发布直接重构并退役旧单一 `HEAD` 版 `readPathDiff`（不留双函数并存），接入无远端短路与 Ref-Snapshot 缓存，并同次补齐 `declaration.json` 缺失的 `dnee.diff` / `dnee.paste-image` 与安全说明 / `[DNEE]/AGENTS.md` 口径。 | Round 1 / `Q1`，`[业主]` 同意 A 全部推荐（2026-11-21） | `Q3`、`Q4`、`Q5`、`Q7`、`Q8` | 禁止新增第 21 条路由或绕开 `dsh-host-route-guard`；所有用户态 `commit`/`base`/`path` 必须通过 fail-closed 防注入校验与 `--` 隔断。 |
| `T-O-6` | `foundational` | **前端坚持宿主原生底座 + `esbuild` 内联轻量 Web Worker + 全面单轨硬切退役旧实现**：不引入 `@pierre/diffs` / `@pierre/trees` 与外部 `.wasm`；文件树在 `WorkspaceStore` 预计算 `folderStatusMap` + 稳定行订阅 `Accessory` 激活宿主 `FileTree` 原生 `memo` / `levelsOf()` / `highlight` 并彻底退役线性 `folderStatusOf` 与闭包身份震荡；Diff 彻底删除旧同步 `<pre>`（零新旧切换开关），硬切为 `ByteBudgetLruCache` → 内联 JS Blob Web Worker（Hunk + Word-Diff + digest，带 CSP 降级分片）→ 共享 `IntersectionObserver` 行虚拟化 → 宿主 `useCodeHighlighter` 视口分帧着色（消费 `--shiki-token-*` / `--dsw-alias-file-diff-*`）→ CSS Containment / GPU 合成层，薄封 `DiffRendererAdapter`；右键「查看差异」无 Forge 时退役死报错 `viewDiffUnavailable`，直接降级打开 `[DNEE]` 视图。 | Round 1 / `Q2`，`[业主]` 同意 A 全部推荐（2026-11-21） | `Q4`、`Q5`、`Q6`、`Q7`、`Q8` | 单包 IIFE `lib/client.js` 不新增 `.wasm` 或外链静态资源；不在抽屉里维持新旧两套 Diff 视图，全面消费宿主原语与全局 Token。 |
| `T-O-7` | `execution` | **宿主基线顺序、Fail-Closed 围栏、单一失效缓存与 200KB 上限锁定**：`vs Base` 基线按 `显式 base → refs/remotes/origin/HEAD → main → master` 探测，无匹配或 Unborn `HEAD` 平和返回 `{ baseRef: null, mergeBase: null, files: [] }`；`commit` 须匹配 `/^[0-9a-fA-F]{4,40}$/u`，`base` 禁 `-` 开头、`..` 与控制字符并经 `git rev-parse --verify --end-of-options <base>^{commit}` 验真；所有 `git diff`/`show` 强制加 `--no-ext-diff --unified=3 -- <rel>`，根提交平滑回退 `git show`；`only=base-diff` 并入既有 `routes.js` `memoized` + `forgetReads(root)` 失效链，配合 `git.js` `32` 仓有界 `mergeBaseCache` 与无 `remote` 短路跳过远端查询；`DIFF_PATCH_CAP` 从 `80_000` 硬切提升至 `200_000` 字节，不设 `full: true` 旁路。 | Round 2 / `Q3`，`[业主]` 同意 A 全部推荐（2026-11-21） | `Q7`、`Q8` | 宿主不造第二套 watcher 或持久化缓存；所有新增只读参数与 `-` Flag / 外部 diff driver 防护须有对应 `node:test` 负例锁定。 |
| `T-O-8` | `execution` | **Diff 引擎预算、宿主 Shiki 分帧、防竞态、LRU 分层失效与 `viewed.v1` 持久化锁定**：单行 `>1,000` 字符跳过 Word-Diff 与 Shiki，单 Hunk `>500` 变更行跳过 Word-Diff；Strict CSP 禁 Blob Worker 时自动退化同核心 parser 的 `200` 行 `rAF` 切片；`>250` 行开启行窗口虚拟化（`OVERSCAN = 12` + 焦点保活 + `minmax(0, 1fr)`）；宿主 `useCodeHighlighter` 仅对视口 ±20 行按 `<=4ms/帧` 空闲着色；Worker 解析与空闲着色必须携带单调递增 `requestId` 与高亮代际防竞态（快速切文件即刻作废旧任务）；`ByteBudgetLruCache(64 entries / 4 MiB)` 按视角分层失效（`working` 随 `gitEpoch` 清、`base` 随 `HEAD` 清、`commit` 长期保活）；`Mark as Viewed` 独立持久化至 `localStorage['dsh-nano-explorer-extra:viewed.v1']`（12 仓 × 500 条 + `digest` 失效 + `storage` 跨标签同步，隐私模式降级内存 `Map`），严禁混入 `prefs.v2`。 | Round 2 / `Q4`，`[业主]` 同意 A 全部推荐（2026-11-21） | `Q6`、`Q7`、`Q8` | `[DNEE]/AGENTS.md` 与 `prefs.js` 保持 `prefs.v2` 纯布尔配置纯洁性，新增 `viewed.v1` 键独立写入说明；性能 `diff-parse` / `diff-render` 埋点落在此主链。 |
| `T-O-9` | `execution` | **文件树 `Changed-Only` / `/` 筛选形态与三视角单抽屉流转锁定**：`Changed-Only` 走宿主 `FileTree` 原生 `levelsOf()` 标准分级（不做客户端 `a/b/c` 假拼接），维护独立临时 `changedExpanded`（`>800` 条默认只展前 2 级并轻提示）；`changedOnly` 与 `/` 过滤词均为面板临时 UI 态不写进 `prefs.v2`，热键 `/` 复用 `pasteTargetIsEditable` 守卫且 `0` 次 `/list` 请求；`CommitDrawer` 只读态（`相对基线` / `历史提交`）隐藏提交信息 `Input` 与底部「提交」按钮，`HistoryRail` 点击复用既有 `drawer: 'branch' -> 'commit'` 单抽屉互斥流转并附一键返回历史按钮。 | Round 2 / `Q5`，`[业主]` 同意 A 全部推荐（2026-11-21） | `Q6`、`Q7`、`Q8` | 严禁叠双层抽屉或改写宿主树节点路径；`CommitDrawer` 视口几何须按隐藏表单后自然扩充 Diff 区设计。 |
| `T-O-10` | `execution` | **`CommitDrawer` 弹性视口、全局 Token 替换、旧样式/死文案彻底退役与 `check-ui-rules` 红线锁定**：`.nxe-scm-commit` 升级为 `height: min(72vh, 680px); max-height: calc(100% - 16px)` 纵向 Flex 布局，文件列表 `max-height: 36%`，`.nxe-commit-diff` 为 `flex: 1; min-height: 220px; contain: strict`，虚拟化行固定 `grid-template-columns: 40px 40px 14px minmax(0, 1fr)`；彻底删除 `.nxe-commit-diff-pre`、`.nxe-commit-diff-line`、`#3fb950`/`#f85149` 硬编码回退色及 [i18n.js:34,278](../../../../dsh-nano-explorer-extra/src/client/i18n.js#L34) 无调用死文案 `viewDiffUnavailable`；全量消费宿主全局 `--dsw-alias-file-diff-*` / `--shiki-token-*` 及宿主/`dsh-nano-ui` 原语，确保 `check-ui-rules` 保持 `U1/U2/U5/U8/U9 = 0` 且 `U3/U4/U6/U10` 不高于现网基线（`18/2/5/3`）。 | Round 3 / `Q6`，`[业主]` 同意 A 全部推荐（2026-11-21） | `CT-batch-1-plan.md` | 禁止保留新旧样式类名双轨或新增原生 `<button>`；交付前必跑 `check-ui-rules` 比对基线。 |
| `T-O-11` | `execution` | **`dsh-performance-review` 埋点、懒初始化铁律与 `node:test` 验证矩阵锁定**：[declaration.json](../../../../dsh-nano-explorer-extra/src/perf/declaration.json) 补全 `dnee.diff` / `dnee.paste-image`（20/20 对齐 `bindings.js`）并在 `spans` 新增 `diff-parse`、`diff-render`、`tree-filter`（经 `perf.js` 零成本包装，不增 `budgets` 硬闸门）；所有新增 `Worker`、`URL.createObjectURL`、`IntersectionObserver`、`localStorage` 与 `window.addEventListener` 严格懒初始化（模块顶层零急切访问，100% 保住 `bundle-smoke.test.mjs` 最小 `vm` 沙箱）；验证矩阵锁定为纯 `node:test`（含宿主安全负例/cache + 客户端纯逻辑 LRU/Worker/树聚合）+ `build` + `check-ui-rules` + `pack --dry-run`，不设 Playwright 或阻断性 release-gate。 | Round 3 / `Q7`，`[业主]` 同意 A 全部推荐（2026-11-21） | `CT-batch-1-plan.md` | 严禁把浏览器运行期 API 暴露在模块顶层求值；严禁新增超纲测试仪式。 |
| `T-O-12` | `execution` | **单语义 Worktree 交付、`0.4.0` 升版、滞后文档/陈旧产物清理与唯一计划收口锁定**：在 `.agents/worktrees/ct-batch-1-review-perf` 单分支一次交付（`0.3.0 → 0.4.0`，`engines.dsh` 不变，合回 `main` 后按 `[业主]` 要求删除 worktree，合并不自动部署本机宿主）；同次同步 `[DNEE]/AGENTS.md`、`docs/specs/dsh-nano-explorer-extra/README.md`、`security/route-sensitivity.json` 描述及 `CT-batch-1-design.md` 替代声明，并清理过期 `dsh-nano-explorer-extra-0.3.0.tgz`；唯一正式计划为 `docs/specs/dsh-nano-explorer-extra/plan/CT-batch-1-plan.md`（§2 引用本台账 `T-O-1`–`T-O-12`，`draft` 经 `[业主]` 批准转 `reviewed` 后开工，结果回填末节，不另立收口文档）。 | Round 3 / `Q8`，`[业主]` 同意 A 全部推荐（2026-11-21） | `CT-batch-1-plan.md` | 计划未获 `[业主]` 批准前不得开始编码；所有过时文档与 `.tgz` 残物随本批一次清净。 |

---

## 2. Round 1 —— `foundational`：宿主只读合约边界与前端渲染 / 软件异构总路线（`Q1–Q2`）

本轮 `second-opinion` 为 `retired`，由 `[业主]` 直裁。Round 1 聚焦两个决定 `CT-batch-1` 全部上层建筑与执行细节的根基问题：**`Q1` 定后端宿主只读数据面的合约与安全边界**（决定三视角审阅与 Ref-Snapshot 提速如何合法落地），**`Q2` 定前端文件树与 Diff 渲染/异构的技术路线与退役边界**（决定缓存、Web Worker、分帧高亮、虚拟化及旧代码硬切方向）。待这两项 `foundational` 真值写入 §1 台账并完成「中场评估 I」后，再进入 Round 2 `executional` 3 题展开参数、状态、视觉与测试级细节锁定。

---

### Q1 — 宿主多视角只读审阅数据应如何在既有 20 条路由内演进：原地扩展 `GET /status` 与 `POST /diff` 只读参数并硬切统一实现，还是新增独立路由，还是零后端改动？

**驱动真相**：`T-O-1`（聚焦 `t3code` 基线比对/历史 Diff 审阅）、`T-O-4`（能硬切就不要双写、不得擅自扩约、单一真源）。来源：[CT-batch-1-design.md §5.1 S3/S6/S7 & §9.1 Q1](../CT-batch-1-design.md#L229-L234)、[routes.js:430-484](../../../../dsh-nano-explorer-extra/src/host/routes.js#L430-L484)、[git.js:614-626](../../../../dsh-nano-explorer-extra/src/host/git.js#L614-L626)。

- **影响范围**：`dsh-nano-explorer-extra/src/host/routes.js`、`dsh-nano-explorer-extra/src/host/git.js`、`dsh-nano-explorer-extra/src/perf/declaration.json`、`security/route-sensitivity.json`、`dsh-nano-explorer-extra/AGENTS.md` 路由表及前端 `CommitDrawer` / `HistoryRail` 数据流。
- **为什么必须确认**：当前 `[DNEE]` 后端只有一套写死的单视角 Diff 接口——`POST /diff`（[routes.js:469-484](../../../../dsh-nano-explorer-extra/src/host/routes.js#L469-L484)）仅接收 `{ sessionId, path, untracked }` 且 `readPathDiff`（[git.js:614-626](../../../../dsh-nano-explorer-extra/src/host/git.js#L614-L626)）硬编码 `git diff HEAD`；`GET /status`（[routes.js:430-464](../../../../dsh-nano-explorer-extra/src/host/routes.js#L430-L464)）也只读工作区当前提交与未提交状态，`HistoryRail` 展开历史提交里的文件列表（[drawers.js:408-418](../../../../dsh-nano-explorer-extra/src/client/drawers.js#L408-L418)）因此只是不可点击的静态 `<li>`。同时，`declaration.json`（[declaration.json:34-53](../../../../dsh-nano-explorer-extra/src/perf/declaration.json#L34-L53)）当前还存在漏录 `dnee.diff` / `dnee.paste-image` 的历史漂移。如果不先冻结“既有路由原地只读扩约 + 同一次发布硬切统一读取器”还是“零后端改动/另开新路由”，后续一切三视角与后端缓存的执行问题都无法落锚。
- **当前建议 / 倾向**（`CT-batch-1 架构审查`）：选 **A**：**维持既有 20 条路由清单一律不增新路由**，仅在已有 `GET /status`（增加 `only=base-diff` 按需模式）与 `POST /diff`（增加互斥只读参数 `commit` / `base` 及 `ignoreWhitespace`）上原地扩展，同一次发布把 `readPathDiff` 硬切为单一套参数化读取函数并接入宿主 Ref-Snapshot 缓存，同时补齐 `declaration.json` 与安全合同正文。
- **Reasoning**：`dnee.status`（`L0` / `proc:git`）与 `dnee.diff`（`L2` / `read:host`）均已在 `lib/bindings.js` 与 `security/route-sensitivity.json` 完成守卫注册和作用域绑定，只是 `POST /diff` 参数过窄。把 `only=base-diff` 仿照现成 `only=stats`（[routes.js:440-450](../../../../dsh-nano-explorer-extra/src/host/routes.js#L440-L450)）从常规 `GET /status` 轮询拆出，可确保默认轮询零额外子进程负担；在 `git.js` 直接用统一的 `readPathDiff` 硬切替换原有只能读 `HEAD` 的分支（不保留“老 HEAD 函数 + 新 Base/Commit 函数”双轨实现），既满足 `T-O-4` 长期治理，又能集中收口 fail-closed Ref 防注入护栏。
- **问题（请 [业主] 裁决）**：是否冻结以「不新增路由总数，原地扩展 `GET /status?only=base-diff` 与 `POST /diff { commit?, base?, ignoreWhitespace? }` 只读参数 + 硬切统一 `readPathDiff` 与 Ref-Snapshot 缓存 + 同次收口 `declaration.json` / 路由文档说明」作为 `CT-batch-1` 宿主数据面唯一路线？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意你在 [第1轮] 的全部推荐」），冻结为 `T-O-5`。

**【对本问题的解读】**
例：开发者让 Agent 连续提交了 3 个 Commit 后，想一口气看整个分支相对 `origin/main` 的累计净改动，或在 `HistoryRail` 点开倒数第二个 Commit 里的某个文件看差异。当前 `[DNEE]` 后端接口在路由数量上其实已经够用（20 条完整路由已经经过 `dsh-host-route-guard` 与安全审计），缺的不是“新 URL 路径”，而是允许既有的只读接口 `/status` 和 `/diff` 按需回答「相对 base 分支改了哪些文件」以及「某个 commit 或 base 下的单文件 diff（支持 `-w` 忽略空白）」。本题裁定的是后端**边界与形态**（原地只读扩约 + 硬切统一实现 vs 新开路由 vs 零后端改动），具体 `base` 解析细节、字节上限与缓存键策略将由后续 Round 2+ `executional` 题再精确锁死。

**【可选选项清单】**

| 选项 | 宿主演进路线 | 得到什么 / 代价与长期治理评价 |
|---|---|---|
| **A（推荐）** | 维持 20 条路由零新增：`GET /status` 扩 `only=base-diff`（按需、与 `only=stats` 平行）；`POST /diff` 扩 `{ commit?, base?, ignoreWhitespace? }`（互斥且严格防注入），硬切重构单一 `readPathDiff` + Ref-Snapshot 缓存；同步对齐 `declaration.json` 与安全说明。 | **最契合 `T-O-4`**：不扩路由攻击面、零双写、默认 5s 轮询零开销，一次打通工作区 / `vs Base` / 历史提交三视角；需在 `[DNEE]/AGENTS.md` 与 `security/route-sensitivity.json` 同步更新只读参数口径。 |
| B | 为分支对比与历史提交新增独立 HTTP 路由（如 `/base-diff`、`/commit-diff`）。 | 路由职责表面细分；代价是突破既有 20 条路由清单、须重走 `route-sensitivity.json` + `bake-plugin-bindings` 新增路由审批，且形成与 `/diff` 功能重叠的双端读写/维护负担。 |
| C | 零后端改动：不碰 `routes.js` 与 `git.js`，`CT-batch-1` 仅做前端工作区未提交文件优化。 | 后端绝对零风险；**直接阉割「`vs Base` 整支净对比」「历史提交文件点击直看 Diff」「`-w` 忽略空白」和「宿主无远端/Ref 快照提速」**，退化成半残升级，无法对标 `t3code` 高价值核心能力。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **保持 20 条路由零扩张，`GET /status` 新增按需 `only=base-diff`**：
   - 在 [routes.js:440-450](../../../../dsh-nano-explorer-extra/src/host/routes.js#L440-L450) 现行 `if (url.searchParams.get('only') === 'stats')` 模式旁，平行硬接入 `only === 'base-diff'`（可选带经过安全校验的 `base` 查询参数）；默认不含 `only` 的常态 `GET /status` 心跳轮询体量与 SQL/Git 子进程数 **完全不增加**，反而接入 `T-O-3`/F6 提速。
   - `only=base-diff` 仅当用户切换到 `CommitDrawer` 的 `vs Base` 视角时触发，利用 `git merge-base` + `git diff --numstat -M -z <mergeBase>..HEAD` 返回净改动文件列表、基线 ref 与 `mergeBaseSha`。
2. **`POST /diff` 扩展只读可选参数，硬切退役旧单一 `HEAD` 实现**：
   - 在 [routes.js:469-484](../../../../dsh-nano-explorer-extra/src/host/routes.js#L469-L484) 与 [git.js:614-626](../../../../dsh-nano-explorer-extra/src/host/git.js#L614-L626) 同一次修改直接重构并退役原仅接受 `{ untracked }` 的 `readPathDiff` 旧实现，**不留双函数并存**。
   - 请求荷载扩展为 `{ sessionId, path, untracked?, commit?, base?, ignoreWhitespace? }`：不传新增字段时行为与现网 `HEAD` 100% 等价；传 `commit` 时查单个历史提交，传 `base` 时查 `mergeBase..HEAD` 累计净 diff（`untracked`、`commit`、`base` 三者互斥）。
   - **Fail-Closed 安全围栏**：`commit` 仅允许十六进制 SHA 格式；`base` 严禁 `-` 开头、禁止 `..` 与控制字符，并统一使用 `--end-of-options` / `--` 分隔所有用户态 ref 与 `path`；`path` 继续走既有 checkout 内路径校验且禁止 `.git` 段。
3. **宿主 Ref-Snapshot 缓存与无远端短路**：
   - 吸收 [code-mining-report.md](../../../../.temp/copy-t3code/code-mining-report.md) §1.4 的 `t3code` 实证模式，在 `src/host/git.js` 单一缓存模块收口无 `remote` 短路与按 `(cwd, headSha, baseRefSha)` 键控的 `mergeBaseSha` 缓存，避免多个单文件 Diff 请求重复跑 `git merge-base`。
4. **合同与声明台账同次硬同步**：
   - 补齐 [declaration.json:34-53](../../../../dsh-nano-explorer-extra/src/perf/declaration.json#L34-L53) 中目前漏录的 `dnee.diff` 与 `dnee.paste-image`（注意 `scripts/build-client.mjs` 会执行 `bake-declaration.mjs` 与 `bake-plugin-bindings.mjs`，必须同步核查不发生回覆盖冲突），并同步更新 [route-sensitivity.json:227-230,510-515](../../../../security/route-sensitivity.json#L510-L515) 描述文本与 [dsh-nano-explorer-extra/AGENTS.md:107-120](../../../../dsh-nano-explorer-extra/AGENTS.md#L107-L120)。

**【推荐选项支持证据或其他选项的反例】**

- **现成架构模式佐证（选 A 顺理成章）**：[routes.js:440-450](../../../../dsh-nano-explorer-extra/src/host/routes.js#L440-L450) 已经通过 `GET /status?only=stats` 示范了「把重查询从默认 `/status` 拆分为 `only=` 按需模式」的合法边界；[bindings.js:6,25](../../../../dsh-nano-explorer-extra/lib/bindings.js#L6) 与 [route-sensitivity.json:227-230,510-515](../../../../security/route-sensitivity.json#L227-L230) 已分别登记 `dnee.status`（精确匹配 `GET /nano-explorer-extra/status`）与 `dnee.diff`（精确匹配 `POST /nano-explorer-extra/diff`，上限 `bodyLimit: 65536`）。
- **现有能力缺口铁证**：[git.js:614-626](../../../../dsh-nano-explorer-extra/src/host/git.js#L614-L626) 中 `readPathDiff` 仅写了 `['diff', 'HEAD', '--unified=3', '--', rel]`，且 [drawers.js:408-418](../../../../dsh-nano-explorer-extra/src/client/drawers.js#L408-L418) 把 `shown.files` 渲染为纯展示 `<li>`，证明当前后端缺口正是卡住历史提交审阅与分支净对比的根因（选 C 的反例）。
- **`t3code` 后端提速实证**：[code-mining-report.md](../../../../.temp/copy-t3code/code-mining-report.md) §1.4 查证 `t3code` 最近一系列提交（`c1464d6`、`2c01259`、`a0ca0bf`、`0fd4822`、`0dc32b5`）正是靠「无远端跳过查询 + 按 Ref 快照复用 `mergeBase` + 零索引 untracked diff」取得后端显着降耗。
- **合同漂移修复顺手闭合**：[declaration.json:34-53](../../../../dsh-nano-explorer-extra/src/perf/declaration.json#L34-L53) 当前只有 18 条 `dnee.*`，与 [bindings.js:5-25](../../../../dsh-nano-explorer-extra/lib/bindings.js#L5-L25) 的 20 条路由不一致；选 A 顺手把合同表补全对齐（同时规避选 B 新增路由造成的审批仪式与合同膨胀，严守 [AGENTS.md:44-45](../../../../AGENTS.md#L44-L45)）。

---

### Q2 — 前端文件树与 Diff 渲染 / 异构总路线：采用「宿主原生 `FileTree` 修稳 + 宿主 `useCodeHighlighter` 视口分帧 + `esbuild` 内联轻量 Web Worker + 硬切退役旧 `<pre>` 与闭包 `Accessory`」，还是引入 `@pierre/diffs` / `@pierre/trees` + WASM 池，还是纯主线程微调？

**驱动真相**：`T-O-1`、`T-O-2`（UI 宿主优先）、`T-O-3`（零卡顿 + DOM/GPU 合成层边界）、`T-O-4`（能硬切就不要双写、彻底退役旧实现）。来源：[build-client.mjs:68-94](../../../../dsh-nano-explorer-extra/scripts/build-client.mjs#L68-L94)、[package.json:19-48](../../../../dsh-nano-explorer-extra/package.json#L19-L48)、[body.js:913-999](../../../../dsh-nano-explorer-extra/src/client/body.js#L913-L999)、[drawers.js:1108-1117](../../../../dsh-nano-explorer-extra/src/client/drawers.js#L1108-L1117)。

- **影响范围**：`dsh-nano-explorer-extra/src/client/body.js`、`accessory.js`、`workspace-store.js`、`drawers.js`、`styles.js` 及新增客户端模块（缓存 / Diff Worker / 虚拟化高亮渲染器）。
- **为什么必须确认**：这是整个 `CT-batch-1` 最核心的前端架构分叉点。当前 `[DNEE]` 面临两大性能与质感黑洞：① [body.js:913-999](../../../../dsh-nano-explorer-extra/src/client/body.js#L913-L999) 把线性扫描全表的 `folderStatusOf` 和依赖变动态的 `createAccessory` 以及内联数组/回调直接喂给宿主 `FileTree`，导致每次轮询全树行组件重建；② [drawers.js:1108-1117](../../../../dsh-nano-explorer-extra/src/client/drawers.js#L1108-L1117) 在主线程同步切分 `(diff.patch ?? '').split('\n')` 渲染无色彩无虚拟化的 `<pre>`。而同时，[build-client.mjs:68-94](../../../../dsh-nano-explorer-extra/scripts/build-client.mjs#L68-L94) 规定 `[DNEE]` 浏览器产物是**单个 IIFE 文件 `lib/client.js`**（通过 `window.__ModuleLoader__.load` 加载，发布包 `files` 字段不含 `.wasm` 静态资产目录）。如果在此不先行裁决渲染引擎路线与旧代码彻底退役原则，后续 Round 2+ 就无法细化 Worker 格式、缓存尺寸、高亮分帧以及旧开关清理。
- **当前建议 / 倾向**（`CT-batch-1 架构审查`）：选 **A**：
  1. **文件树硬切激活宿主底座**：彻底退役 [body.js:913-928](../../../../dsh-nano-explorer-extra/src/client/body.js#L913-L928) 每次 render 全表扫描的 `folderStatusOf` 与重构 [body.js:930-999](../../../../dsh-nano-explorer-extra/src/client/body.js#L930-L999) 震荡引用的 `Accessory` 传参，在 `WorkspaceStore` 唯一快照中单趟预计算 `folderStatusMap` 并让每行按 path 订阅状态，**激活宿主原生 `FileTree = memo(...)`、原生 `levelsOf()` 与 `highlight`** 来落地「仅看改动（Changed-Only）」与即时筛选；
  2. **Diff 渲染与软件异构单轨硬切**：彻底删除并退役 [drawers.js:1108-1117](../../../../dsh-nano-explorer-extra/src/client/drawers.js#L1108-L1117) 的原生同步 `<pre>`（不留切换开关、不做新旧渲染器并存）；采用统一的单轨管线：**双界 `ByteBudgetLruCache`（条目+字节）→ 零外部依赖的内联 JS Blob Web Worker（Hunk 解析 + 行内 Word-Diff + digest，带 CSP 降级分片）→ 共享 `IntersectionObserver` 行窗口虚拟化 → 宿主 `useCodeHighlighter` 视口空闲分帧着色（消费全局 `--shiki-token-*` / `--dsw-alias-file-diff-*`）→ CSS Containment / 固定网格 `minmax(0, 1fr)` / GPU 合成层**，对外仅包一层极薄的 `DiffRendererAdapter`；
  3. **右键「查看差异」无 Forge 降级**：保留优先尝试宿主 `forge-changes`，退役 [body.js:399](../../../../dsh-nano-explorer-extra/src/client/body.js#L399) 的 `copy.viewDiffUnavailable` 死胡同报错，捕获未启用时直接打开 `[DNEE]` `CommitDrawer` 审阅视图。
- **Reasoning**：`[DNEE]` 不是 `t3code` 那样掌控整站打包器与静态资源目录的独立前端应用，而是一个经 `esbuild` 打包进单个 `lib/client.js` 注入 `[dsh]` 页面的轻插件，宿主已在内存里加载好了 React、`useCodeHighlighter`（58 语言 Shiki 单例，内置 1000 字符长行保护）和全部 `--shiki-token-*` CSS 变量。选 **A** 能做到包体积增量最小、零 WASM 资源路径风险、视觉与聊天区代码块 100% 浑然一体，并把重解析完全从主线程剥离进 Worker、把 GPU 用在浏览器原生合成滚动上；未来真遇到单文件数千行瓶颈时，再沿 `DiffRendererAdapter` 单点重评即可，完全不违背当下敏捷与长期治理原则。
- **问题（请 [业主] 裁决）**：是否冻结「不引入 `@pierre/diffs`/`@pierre/trees` 与外部 `.wasm`，走 **宿主 `FileTree` 稳态激活 + `esbuild` 内联轻量 Web Worker + 宿主 `useCodeHighlighter` 视口分帧 + CSS 合成层虚拟化**，并在本次发布中**彻底退役**原有 `<pre>` 文本 Diff、每次渲染线性 `folderStatusOf`、`Accessory` 身份重建与无 Forge 死胡同报错」作为 `CT-batch-1` 前端总路线？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意你在 [第1轮] 的全部推荐」），冻结为 `T-O-6`。

**【对本问题的解读】**
例：为什么我们不能像 `t3code` 那样直接在 `package.json` 里加 `@pierre/diffs` + `@pierre/trees` + WASM `highlights`？因为 `[DNEE]` 的插件安装模型是把所有 JS 打成唯一一个 `lib/client.js` 单文件塞进 `[dsh]` 的模块加载器，插件自己并没有独立的静态 `/assets/*.wasm` Web 路由，而且 `[dsh]` 宿主已经在页面里准备好了 `useCodeHighlighter`、`FileTree` 和浅深双色 `--shiki-token-*` 变量。选 **A** 就是“借宿主的刀、用自研轻量 Web Worker 做异构并行拆包、靠虚拟化与合成层控帧率”，同时一口气删干净所有拖垮老代码的旧逻辑，不做“新旧两套 Diff 渲染器留开关兼容”。

**【可选选项清单】**

| 选项 | 前端技术总路线 | 得到什么 / 代价与长期治理评价 |
|---|---|---|
| **A（推荐）** | **原生底座吃满 + 内联轻量 Worker + 全面硬切**：① `WorkspaceStore` 预计算 `folderStatusMap` + 行订阅 `Accessory` 激活宿主 `FileTree`（原生支撑 `Changed-Only` 与搜索高亮）；② 彻底删除旧 `<pre>` Diff，硬切「双界 LRU → 内联 Blob Worker（Hunk + Word-Diff + digest）→ 窗口虚拟化 → 宿主 `useCodeHighlighter` 分帧 + `--shiki-token-*` + `contain` GPU 合成」；③ 无 Forge 直接回落 `[DNEE]` 视图。 | 打包仍是一个零外部资源依赖的 `lib/client.js`；视觉与宿主 `[dsh]` 100% 同源，守住 `DESIGN.md` 与 `Cmd+F`/复制能力；Worker 计算全出主线程，无双写兼容债务；仅需包内维护约 200 行 Worker/虚拟化代码，未来可通过 `DiffRendererAdapter` 替换升级。 |
| B | 在 `dsh-nano-explorer-extra` 内引入 `@pierre/diffs` + `@pierre/trees` + WASM `highlights` Worker 池（照搬 `t3code` 栈）。 | 直接复用 `t3code` 成熟组件；**重大反面阻力**：① `build-client.mjs` 单 IIFE 打包不支持独立 `.wasm`/worker 静态资源分发，必须硬内联数百 KB–MB 级 WASM/Shiki 字典进 `lib/client.js`；② Shadow DOM 样式需重写大量 `--diffs-*` 覆盖规则对抗宿主主题；③ 抛弃宿主 `FileTree` 原语，违反 `T-O-2`「UI 宿主优先」。 |
| C | 不做 Worker 异构与虚拟化，仅在主线程给旧 `<pre>` 加一点行着色或只修复 `createAccessory` 不做 Diff 引擎重构。 | 改动最少；保留 `<pre>` 同步 `.split('\n')` 在大 Diff 与分批切看 `vs Base` 时依然卡死主线程、无 Word-Diff、无已审阅折叠、无语法高亮，无法达到 `T-O-3` 零卡顿与视觉跃迁目标。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **文件树性能硬切与能力激活**：
   - 在 [workspace-store.js:41-66](../../../../dsh-nano-explorer-extra/src/client/workspace-store.js#L41-L66) `commit` 快照构建期单趟汇总生成不可变的 `folderStatusMap`（`O(statusMap.size)`），**彻底删除** [body.js:913-928](../../../../dsh-nano-explorer-extra/src/client/body.js#L913-L928) 的逐目录线性扫描函数 `folderStatusOf`。
   - 把 [accessory.js:6-34](../../../../dsh-nano-explorer-extra/src/client/accessory.js#L6-L34) 与 [body.js:930-948](../../../../dsh-nano-explorer-extra/src/client/body.js#L930-L948) 改为**稳定函数引用 + 按路径轻量订阅 store**，并稳定传给宿主 `FileTree` 的 `entries` / `onToggle` / `onOpen` / `canOpen`（[body.js:958-999](../../../../dsh-nano-explorer-extra/src/client/body.js#L958-L999)），真正发挥宿主 `FileTree = memo(...)` 的作用。
   - 顶栏「仅看改动（Changed-Only）」与 `/` 树内筛选直接把筛选后的稀疏 `TreeEntry[]` 和 `highlight` 关键词交给宿主 `FileTree`（原生支持 `levelsOf()` 自动补全祖先目录与子串高亮），零额外后端 `/list` 请求。
2. **Diff 渲染 / 异构五级流单轨硬切（零并存开关）**：
   - **直接删除** [drawers.js:1108-1117](../../../../dsh-nano-explorer-extra/src/client/drawers.js#L1108-L1117) 的原生 `<pre>` 与 `.nxe-commit-diff-pre` 同步行渲染代码路径，只保留唯一新引擎（包裹在薄 `DiffRendererAdapter` 内）。
   - **异构解析与防爆**：由源码内置的纯 JS 字符串模块生成 `Blob` URL 启动轻量 `Worker`（由 `esbuild` 直接打进 `lib/client.js`，无需改动 `build-client.mjs` 分发多产物）；Worker 内执行 Hunk 拆分、行号对齐、Myers/LCS 行内 Word-Diff 计算及 FNV-1a 内容摘要；单行 `>1000` 字符与单 Hunk `>500` 变更行直接熔断词级对比；若浏览器 CSP 阻止 `blob:` Worker，构造期捕获异常后透明退化为同模块导出的 `requestAnimationFrame` 时间分片异步解析函数。
   - **缓存、虚拟化、分帧着色与合成层**：前接 `ByteBudgetLruCache`（条数+UTF-8 字节预算）；超过阈值行数启用共享 `IntersectionObserver` + 轻量行窗口虚拟化（保留键盘焦点行挂载）；可见缓冲行调用宿主 `useCodeHighlighter(languageForPath(path))` 按帧 `<=4ms` 空闲着色并直接消费全局 `--shiki-token-*` 与 `--dsw-alias-file-diff-*` 令牌；行网格锁死 `--nxe-diff-grid: ... minmax(0, 1fr)` 并配合 `contain: layout style paint` / 合成层吸顶头，杜绝水平抖动与重排扩散。
3. **右键「查看差异」无 Forge 降级硬切**：
   - 改造 [body.js:389-401](../../../../dsh-nano-explorer-extra/src/client/body.js#L389-L401) `openDiff`：保留对 `dsh-resource://forge-changes/...` 的优先尝试；**彻底退役** `catch` 分支的 `setLinkNote(copy.viewDiffUnavailable)` 报错提示（无实验插件 Forge 时立即打开 `[DNEE]` `CommitDrawer` 并聚焦选中该文件 Diff）。

**【推荐选项支持证据或其他选项的反例】**

- **单文件打包产物限制（选 B 根本性反例）**：[package.json:19-28](../../../../dsh-nano-explorer-extra/package.json#L19-L28) 仅声明打包分发 `index.js`、`lib/host.js`、`lib/bindings.js`、`lib/client.js`，且 [build-client.mjs:68-94](../../../../dsh-nano-explorer-extra/scripts/build-client.mjs#L68-L94) 把前端全量打成单个 `window.__ModuleLoader__.load(...)` IIFE 产物，仅 `react`、`react-dom`、`@deepseek-ai/dsh-client-ui-primitives` 作为宿主要注入的 external；引入依赖独立 `.wasm` worker 资产或 Shadow DOM 样式系统的 `@pierre/diffs` 会直接打破既有零外链产物合同，并在样式隔离层与 `ui-theme` 对抗（亦违背 `T-O-2`）。
- **宿主已提供的全部免费能力（选 A 强力支撑）**：[code-mining-report.md](../../../../.temp/copy-t3code/code-mining-report.md) §2.1–2.2 已核实 `[dsh]` `ui-sidebar-files/src/client/FileTree.tsx` 原生自带 `levelsOf()` 祖先合成、`Name` 的 `highlight` 高亮与 `memo` 外壳；`ui-primitives/src/index.ts:92-93` 原生导出 `useCodeHighlighter` 与 `languageForPath`；`ui-theme` 的 `shiki.css:8-30` 与 `design-platform.css:279-436` 已全局注册全部 `--shiki-token-*` 与 `--dsw-alias-file-diff-*` 令牌，选 A 可零包体成本直接对齐宿主视觉体验。
- **当前文件树为何慢的直接源码证据**：[accessory.js:6-8](../../../../dsh-nano-explorer-extra/src/client/accessory.js#L6-L8) 注释本来明确要求「Build the accessory Component once at module scope, so the Factory never remounts it」，但 [body.js:930-948](../../../../dsh-nano-explorer-extra/src/client/body.js#L930-L948) 却把它放进了依赖 `[copy, statusOf, ignoredOf, tree.levels, cwd, ...]` 的 `useMemo` 里每次重建函数身份，加上 [body.js:913-928](../../../../dsh-nano-explorer-extra/src/client/body.js#L913-L928) `folderStatusOf` 的二次循环和 [body.js:958-999](../../../../dsh-nano-explorer-extra/src/client/body.js#L958-L999) 的全套内联字面量，直接把宿主 `FileTree` 的 `React.memo` 撕穿（亦证明先修稳宿主 `FileTree` 远胜自研造树）。
- **旧 Diff 与右键断链证据**：[drawers.js:1108-1117](../../../../dsh-nano-explorer-extra/src/client/drawers.js#L1108-L1117) 主线程全量 `<pre>` 渲染无高亮/无虚拟化/无缓存，[body.js:398-400](../../../../dsh-nano-explorer-extra/src/client/body.js#L398-L400) 在无 `client-ui-forge` 时直接报错停摆，正是选 C 不可接受的硬伤。

---

## 3. ★ 中场评估 I（Round 1 → Round 2）`[核心·锁死]`

- **3.1 对 Round 1 的判定**：Round 1 两道 `foundational` 问题均获 `[业主]` 一次性清晰拍板（均选 A，零悬置残题）。至此，`CT-batch-1` 的「宿主演进边界」（零新路由、只读扩参、同次收口性能与安全文档）和「前端单轨渲染/异构路线」（宿主 `FileTree` 与 `useCodeHighlighter` + 内联 Web Worker + CSS 合成层虚拟化 + 彻底退役 `<pre>` / 线性扫描 / 死胡同报错）已构成稳固的双基础柱。
- **3.2 本轮已锁定真相**：`T-O-5`（宿主只读合约与统一读取硬切）与 `T-O-6`（前端渲染/异构/退役总路线），与开轮基线 `T-O-1`–`T-O-4` 一起共同约束下游所有执行级设计。
- **3.3 诚实反方制衡**（基于重新检索的仓库源码直接暴露执行期暗礁，不掩盖）：
  1. **只读 Diff 安全与上限张力**：[git.js:614-626](../../../../dsh-nano-explorer-extra/src/host/git.js#L614-L626) 一旦接受外部 `base` 与 `commit`，除了 Git `-` Flag 注入外，仓库自带恶意 `.git/config` 外部 `diff.external` 驱动及现行偏紧的 `DIFF_PATCH_CAP = 80_000`（[git.js:603](../../../../dsh-nano-explorer-extra/src/host/git.js#L603)）都是真实隐患；同时宿主 [routes.js:250-300](../../../../dsh-nano-explorer-extra/src/host/routes.js#L250-L300) 已有 `memoized`/`forgetReads`，新增 `base-diff` 与 `mergeBase` 缓存必须并入同一失效链，否则会产生“刚切分支还看到旧基线”的新双源 bug。
  2. **主线程 Shiki 与大补丁分帧风险**：经核实宿主 `useCodeHighlighter`（`context/deepseek-harness/packages/client/ui-primitives/src/code-highlighting.ts:20-23`）返回的是一个同步执行 `highlightLines` 的函数；若在首次渲染一次性喂入整文件文本或未在 Worker 预先截断超长压缩行，照样会在滚动切入时打出超过 16ms 的 Long Task，且客户端 LRU 若不区分 `working`/`base`/`commit` 三种失效生命周期，就会出现污染。
  3. **全局状态粒度与临时态污染风险**：[git.js:496-509](../../../../dsh-nano-explorer-extra/src/host/git.js#L496-L509) 全局 status 采用 `--untracked-files=normal`（整目录未跟踪汇总为一条目）；若在「仅看改动（Changed-Only）」下遇到误放进未忽略构建产物的超多变动（`>800` 条）或把过滤开关存进永久偏好 `prefs.v2`（[prefs.js:5-25](../../../../dsh-nano-explorer-extra/src/client/prefs.js#L5-L25)），就会引发误以为仓库文件丢失的事故。此外 [drawers.js:962-1050](../../../../dsh-nano-explorer-extra/src/client/drawers.js#L962-L1050) 当前强绑定工作区 Commit 输入框与按钮，切到只读 `vs Base`/`HistoryRail` 时必须明确流转与互斥形态。
- **3.4 为什么提出 Round 2（注入哪些题 + 由哪条 `T-O` 驱动）**：上述执行级分歧无法靠笼统原则自动消除，必须通过新一轮仓内取证后注入 Round 2 3 道 `executional` 题逐一钉死：`Q3`（由 `T-O-5`、`T-O-4` 驱动，锁死宿主基线顺序、防外部 diff 驱动安全规则、缓存合并与字节上限）、`Q4`（由 `T-O-6`、`T-O-3`、`T-O-4` 驱动，锁死 Worker 熔断与宿主 Shiki 分帧预算、LRU 分层失效及 `Mark as Viewed` 持久化契约）、`Q5`（由 `T-O-6`、`T-O-2`、`T-O-1`、`T-O-4` 驱动，锁死 `Changed-Only` / `/` 树形态与临时生命周期，以及 `CommitDrawer` 三视角与 `HistoryRail` 抽屉流转边界）。

---

## 4. Round 2 —— `executional`：宿主规则与缓存、Diff 引擎预算与 Viewed 持久化、树过滤与三视角流转（`Q3–Q5`）

> 本轮 `second-opinion`：`retired`（`[业主]` 直裁）。每题均由 §1 已冻结 `T-O-*` 驱动，直接面向 `CT-batch-1` 实现期零歧义编码口径。

---

### Q3 — 宿主基线探测顺序、安全围栏、缓存整合与 Patch 字节上限应如何硬性落地？

**驱动真相**：`T-O-5`（宿主原地只读扩展与统一硬切）、`T-O-4`（能硬切不双写、单一真源）。来源：[git.js:558-580,603,614-626,913-932,1022-1038](../../../../dsh-nano-explorer-extra/src/host/git.js#L558-L580)、[routes.js:250-310,430-484](../../../../dsh-nano-explorer-extra/src/host/routes.js#L250-L310)、[bake-declaration.mjs:29-52](../../../../scripts/bake-declaration.mjs#L29-L52)。

- **影响范围**：`dsh-nano-explorer-extra/src/host/git.js`、`dsh-nano-explorer-extra/src/host/routes.js`、`dsh-nano-explorer-extra/test/*.mjs`。
- **为什么必须确认**：`T-O-5` 已定调在已有 `GET /status` 和 `POST /diff` 上扩出 `only=base-diff` 与 `{ commit, base, ignoreWhitespace }`，但执行层还剩四个可直接导致 bug 或安全事故的硬参数未锁：① 未传显式 `base` 时，自动基线按什么确定性顺序探测、遇到空仓/无 `origin/HEAD` 如何返回；② `commit`/`base` 进入 `runGit` 需要哪些具体正则与防外部 diff 驱动参数（[git.js:616-619](../../../../dsh-nano-explorer-extra/src/host/git.js#L616-L619) 当前未带 `--no-ext-diff`）；③ Ref-Snapshot 缓存与无 `remote` 短路是并入既有 `routes.js` `memoized`/`forgetReads` 体系还是另建生命周期；④ `DIFF_PATCH_CAP = 80_000`（[git.js:603](../../../../dsh-nano-explorer-extra/src/host/git.js#L603)）是硬切提升还是新增二次全量参数。
- **当前建议 / 倾向**（`CT-batch-1 架构审查`）：选 **A**：
  1. **确定性基线顺序**：`显式 base 参数` → `refs/remotes/origin/HEAD`（复用 [git.js:916-921](../../../../dsh-nano-explorer-extra/src/host/git.js#L916-L921) 探测逻辑）→ 本地 `main` → 本地 `master` → 无匹配或 Unborn `HEAD` 时**零报错返回 `{ baseRef: null, mergeBase: null, files: [] }`**；
  2. **Fail-Closed 安全规则**：`commit` 须严格匹配 `/^[0-9a-fA-F]{4,40}$/`；`base` 严禁 `-` 开头、禁止 `..` 与空白/控制字符，先走 `git rev-parse --verify --end-of-options <base>^{commit}` 验证存在；所有 `git diff`/`show` 一律强制加 `--no-ext-diff --unified=3` 并在末尾加 `-- <rel>`；根提交无父节点时平滑回落 `git show --format= --unified=3 --no-ext-diff -- <rel>`；
  3. **单失效链缓存整合**：`only=base-diff` 复用 [routes.js:277-300](../../../../dsh-nano-explorer-extra/src/host/routes.js#L277-L300) 的 `memoized` + `forgetReads(root)` 与既有 `watchRoot` 失效体系；`git.js` 新增最多 `32` 仓的有界 `mergeBaseCache`（按 `cwd + headSha + baseSha` 精确命中有则零子进程）；`readStatus` 先判 `remotes.length === 0`（利用既有 [git.js:1022-1038](../../../../dsh-nano-explorer-extra/src/host/git.js#L1022-L1038) `readRemotes`）时直接跳过 `listRemoteBranches` / `remoteDivergence` / `fetchStamp`；
  4. **硬切截断上限**：将 `DIFF_PATCH_CAP`（[git.js:603](../../../../dsh-nano-explorer-extra/src/host/git.js#L603)）直接从 `80_000` **硬切提升至 `200_000` 字节**，不提供 `full: true` 旁路开关，超限诚实返回 `truncated: true`。
- **Reasoning**：这四项全都在现有单文件模块内原地整合，不造第二套持久化或第二条 watcher，既守住了安全零漏洞（防 `-` Flag 注入和恶意 `.git` 外部 diff driver），又以 200KB 单档上限覆盖绝大多数真实代码文件 Diff 同时严控响应体积。
- **问题（请 [业主] 裁决）**：是否按推荐方案 **A** 锁定宿主 `vs Base` 基线探测顺序、Fail-Closed 校验（含 `--no-ext-diff`）、`memoized` + `32` 仓 `mergeBaseCache` 整合、无远端短路及 `DIFF_PATCH_CAP = 200_000` 硬切上限？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意你在 [第2轮] 的全部推荐」），冻结为 `T-O-7`。

**【对本问题的解读】**
例：当用户在没有配置任何 remote 的本地练习仓点开 `CommitDrawer` 时，系统自动按 `origin/HEAD -> main -> master` 找对比基线，找不到就平和显示「暂无可对比的默认主干分支」而不是抛 500；如果用户在带 50 个小文件的特性分支连续切换看 `vs Base` Diff，宿主只在 `HEAD` 与目标分支 SHA 下算一次 `git merge-base`，后续 49 次 `POST /diff` 直接复用内存里的 SHA；而如果仓库里被意外提交了一个 3MB 的打包 JS，宿主到 200KB 即停手，保护浏览端和主机。本题就是把这些后端运行的死数字、顺序和安全守卫一次钉死。

**【可选选项清单】**

| 选项 | 宿主规则、缓存与上限规格 | 得到什么 / 代价与长期治理评价 |
|---|---|---|
| **A（推荐）** | 基线按 `参数base → origin/HEAD → main → master`（无则平和空集）；`commit` 仅限 HEX SHA、`base` 禁 `-`/`..` + `rev-parse` 验真 + `--no-ext-diff`；`only=base-diff` 进 `memoized`/`forgetReads` + 32 仓 `mergeBaseCache` + 无 remote 短路；`DIFF_PATCH_CAP` 直接硬切 `200_000`。 | 零新缓存框架、零新 watcher、防恶意外部 diff 驱动与 Git Flag 注入、一步到位兼顾常见代码 Diff 完整性与内存安全，无兼容包袱。 |
| B | 保留 `DIFF_PATCH_CAP = 80_000` 不变，但给 `POST /diff` 新增 `full: true` 请求开关允许前端二次拉取到 `1_000_000` 字节。 | 超大文件可在卡片硬拉全文；引入双阶段 Diff 请求状态与大报文阻塞浏览器风险，实际 >200KB 补丁更适合点行尾箭头去工作台预览整文件。 |
| C | 为 `only=base-diff` 单独新建独立缓存 Map、独立定时器及 `.git/refs` 专用文件系统监听。 | 短期互不影响；违反 `T-O-4` 单一真源——出现两套 `fs.watch`、两套失效函数，极易遗漏 `checkout`/`commit` 后的清缓存调用。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **确定性基线探测与 `only=base-diff`**：
   - 在 `git.js` 新增纯辅助函数 `resolveBaseRef`：若请求 `base` 非空，校验安全格式后即以其为准；否则顺次检查 `refs/remotes/origin/HEAD` → `refs/heads/main` → `refs/heads/master`。若均不存在或仓库 `git rev-parse --verify HEAD` 失败（Unborn），`readBaseDiffSummary` 直接返回 `{ baseRef: null, mergeBase: null, files: [] }`，前端正常渲染空态引导而不报错误红条。
   - 查询 `only=base-diff` 时先取 `headSha` 与 `baseSha`，命中 `mergeBaseCache`（上限 32 项 FIFO/LRU，键 `${cwd}\0${headSha}\0${baseSha}`）则直接复用 `mergeBaseSha`；否则运行一次 `git merge-base --end-of-options <headSha> <baseSha>` 并缓存，再执行 `git diff --numstat -M -z --no-ext-diff <mergeBaseSha>..HEAD` 解析受影响路径列表与增删统计。
2. **统一 `readPathDiff` 与完整注入防御**：
   - 彻底改写 [git.js:614-626](../../../../dsh-nano-explorer-extra/src/host/git.js#L614-L626)（不保留双函数）：
     - 校验输入：`untracked === true` 不得与 `commit` 或 `base` 并传；
     - `commit` 校验 `/^[0-9a-fA-F]{4,40}$/u`；`base` 禁止为空（显式传入时）、禁止 `-` 开头、禁止 `..` / `\0` / 换行与控制字符，且过 `git rev-parse --verify --end-of-options <base>^{commit}`（参照 [git.js:860-893](../../../../dsh-nano-explorer-extra/src/host/git.js#L860-L893) 既有 ref 校检风格）；
     - 执行 `git diff` 时一律传入 `'--no-ext-diff'`, `'--unified=3'`（与可选 `'-w'`），并用 `'--'` 隔断路径 `rel`；
     - 针对 `commit` 视角下仓库首个根提交（`git rev-list --max-parents=0` 或 `<commit>^` 报 128 失败），捕获后改用 `['show', '--format=', '--unified=3', '--no-ext-diff', ...(ignoreWhitespace ? ['-w'] : []), commit, '--', rel]`。
3. **无远端短路与 `routes.js` 缓存并轨**：
   - [git.js:558-570](../../../../dsh-nano-explorer-extra/src/host/git.js#L558-L570) 全量 `readStatus` 改为先确认 `remotes`：通过合并/前置读取 `readRemotes` 判定若 `remotes.length === 0`，直接短路跳过 `listRemoteBranches` 与 `remoteDivergence` 及 `fetchStamp` 的无谓子进程启动。
   - [routes.js:440-464](../../../../dsh-nano-explorer-extra/src/host/routes.js#L440-L464) 对 `only === 'base-diff'` 直接包进既有 `memoized(\`base-diff:${root}:${baseParam}\`, ...)`；并在 [routes.js:294-300](../../../../dsh-nano-explorer-extra/src/host/routes.js#L294-L300) `forgetReads(root)` 的前缀清理条件增加 `key.startsWith(\`base-diff:${root}:\`)`，让现有的 `watchRoot` / `commit` / `checkout` / `pull` 失效路径一键统管。
4. **`DIFF_PATCH_CAP` 与编译检查**：
   - 将 [git.js:603](../../../../dsh-nano-explorer-extra/src/host/git.js#L603) `DIFF_PATCH_CAP` 改为 `200_000`；同步更新 [declaration.json](../../../../dsh-nano-explorer-extra/src/perf/declaration.json) 确认 [bake-declaration.mjs:29-52](../../../../scripts/bake-declaration.mjs#L29-L52) 与 `bake-plugin-bindings.mjs` 在 `npm run build` 时零报错且仅产期望的 `contract` 20 条路由集合。

**【推荐选项支持证据或其他选项的反例】**

- **安全注入与既有失效体系证据**：[git.js:865](../../../../dsh-nano-explorer-extra/src/host/git.js#L865) 与 [routes.js:475](../../../../dsh-nano-explorer-extra/src/host/routes.js#L475) 均已确立「参数落入 git argv 前必阻断 `-` 开头与 `..`」的安全准则，且 [routes.js:294-300](../../../../dsh-nano-explorer-extra/src/host/routes.js#L294-L300) 的 `forgetReads(root)` 统一清扫 `status:${root}:` 与 `ignored:${root}:`（直接证明选 C 另造 watcher 属于冗余双源）；同时增加 `--no-ext-diff` 是防范 `.git/config` 恶意 diff 驱动在只读浏览时意外执行任意宿主机程序的标准做法（呼应 [bindings.js:7](../../../../dsh-nano-explorer-extra/lib/bindings.js#L7) 对 `git-config-filter-exec` 的同一类戒备）。
- **无远端与 `mergeBase` 缓存支持证据**：[git.js:560-570](../../../../dsh-nano-explorer-extra/src/host/git.js#L560-L570) 当前在 `Promise.all` 中无论有没有远端都并发启动 `listRemoteBranches`（其内部又跑两次 `git`：`symbolic-ref origin/HEAD` + `for-each-ref refs/remotes`，见 [git.js:916-930](../../../../dsh-nano-explorer-extra/src/host/git.js#L916-L930)）和 `fetchStamp`，在纯本地无远端仓库上纯属浪费；这与 [code-mining-report.md](../../../../.temp/copy-t3code/code-mining-report.md) §1.4 中 `t3code` 的 `c1464d6`、`a0ca0bf`、`0fd4822` 优化完全同构。
- **80KB 硬编码局限（选 B 反例）**：[git.js:603](../../../../dsh-nano-explorer-extra/src/host/git.js#L603) 写死 `DIFF_PATCH_CAP = 80_000` 是原先面向简陋 `<pre>` 的保守保护；如今 `T-O-6` 已引入 4 MiB 双界 LRU + Worker 异步解析 + 虚拟化窗口，完全能稳稳消化 200KB 补丁且不需复杂化双阶段 `full: true` 协议；若文件真的超大（如 lockfile），`truncated: true` + 现成行尾预览打开正文已是最优去处。

---

### Q4 — Diff 引擎运行预算（Worker 熔断、宿主 Shiki 分帧、LRU 分层失效）与 `Mark as Viewed` 持久化契约应如何锁死？

**驱动真相**：`T-O-6`（Worker 异构 + 宿主 `useCodeHighlighter` + 窗口虚拟化）、`T-O-3`（零卡顿阈值）、`T-O-4`（长期治理、无隐性残留）。来源：`context/deepseek-harness/packages/client/ui-primitives/src/code-highlighting.ts:13-23`、[workspace-store.js:41-66](../../../../dsh-nano-explorer-extra/src/client/workspace-store.js#L41-L66)、[prefs.js:5-75](../../../../dsh-nano-explorer-extra/src/client/prefs.js#L5-L75)、[drawers.js:962-985,1108-1117](../../../../dsh-nano-explorer-extra/src/client/drawers.js#L962-L985)。

- **影响范围**：`dsh-nano-explorer-extra/src/client/` 下新增 Diff Worker / 缓存 / 虚拟化高亮 / `viewed-store` 模块、`src/client/drawers.js`、`src/client/styles.js`、`src/perf/declaration.json`。
- **为什么必须确认**：`T-O-6` 确立了软件异构与分帧渲染总路线，但具体阈值若不冻结，极易陷入要么“过激优化过度仪式”、要么“超长行/语言包重加载导致主线程掉帧或已读错乱”的两难：需要锁定 Worker 熔断阈值、宿主同步 `useCodeHighlighter` 的帧预算调度规则、客户端三视角 LRU 缓存精确失效粒度，以及 `Mark as Viewed` 是独立键长存还是跟窗口会话销毁。
- **当前建议 / 倾向**（`CT-batch-1 架构审查`）：选 **A**：
  1. **Worker 与虚拟化硬阈值**：
     - **熔断线**：单行 `> 1,000` 字符跳过行内 Word-Diff 与 Shiki Tokenize（纯等宽文本直出，对齐 `t3code` 与宿主 `highlight.ts`）；单 Hunk 变更行 `> 500` 行跳过 Word-Diff 仅留整行增删色；Strict CSP 禁 `blob:` Worker 时自动退化为同模块每批 `200` 行 `rAF` 异步分片，对外透明；
     - **虚拟化线**：解析后总行 `<= 250` 行直 render（零测量成本），`> 250` 行开启轻量窗口虚拟化（`ROW_OVERSCAN = 12` 行，保留当前焦点行不卸载，锁死 `--nxe-diff-grid: ... minmax(0, 1fr)`）；
  2. **宿主 `useCodeHighlighter` 分帧契约**：仅对「当前视口 + 上下 20 行」内未上色纯代码按每帧 **`<= 4ms` 空闲帧预算（约 40 行/批）** 调用 `highlighter(fragment)`，携带单调递增值防止快速切文件后的延迟回写，并随 `useCodeHighlighter` 语言加载触发自然补色，首帧绝不等高亮完成才显示文字；
  3. **双界 LRU 视角级分层失效**：客户端统一 `ByteBudgetLruCache(maxEntries = 64, maxMemoryBytes = 4 * 1024 * 1024)`，缓存键含 `scope + refOrSha + path + ignoreWhitespace`：**工作区状态轮询变动只清 `scope === 'working'` 对应条目、`HEAD` SHA 变动才清 `scope === 'base'`、不可变历史提交 `scope === 'commit'` 在预算内长期保活不随轮询驱逐**；
  4. **`Mark as Viewed` 独立有界持久化**：**不塞进现有配置键 `prefs.v2`（[prefs.js:5](../../../../dsh-nano-explorer-extra/src/client/prefs.js#L5)）**，另立专用有界键 `localStorage['dsh-nano-explorer-extra:viewed.v1']`：按仓库维度的 **12 仓 × 每仓最近 500 条** `{ digest, viewedAt }` LRU（`digest` 为 Worker 算出的 FNV-1a 内容指纹），监听 `window` `storage` 事件实现同浏览多标签页同步；若文件再改动（`digest` 变动）自动解锁并显示「已更新」徽章；隐私模式下存储受拒静默退化为当页内存 `Map`。
- **Reasoning**：这一套数字全部取自经实践检验的最小值集合——1000ch 防正则回溯卡死、250 行虚拟化拐点（与 `t3code` `ChangedFilesTree` 一致）、4ms/帧留足其余 12ms 给浏览器合成确保 `60fps`、视角分层失效让来回翻历史 Commit 瞬间 `0ms` 命中缓存；而独立有界 `viewed.v1`（完全不混入 `prefs.v2` 布尔配置对象）既实现跨刷新与多页签持久化（参考宿主 `forge` `ViewedFiles` 模型），又硬控最大本地磁盘占用。
- **问题（请 [业主] 裁决）**：是否冻结以上 Worker/虚拟化熔断阈值、宿主 Shiki `<= 4ms/帧` 视口分帧着色、`64条/4MiB` 按视角分层失效 LRU 以及独立有界 `localStorage['dsh-nano-explorer-extra:viewed.v1']`（12 仓 × 500 条 + 跨标签同步）规格？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意你在 [第2轮] 的全部推荐」），冻结为 `T-O-8`。

**【对本问题的解读】**
例：为什么 `working` 视角的缓存要随轮询更新而清理，但 `commit #abc1234` 的缓存绝不能每 5 秒清一次？因为历史提交的 SHA 内容在 Git 里是永远不可变的！区分开这三个视角的失效策略，意味着你在 `HistoryRail` 点开过的文件，哪怕工作区正在持续写代码、状态每 5 秒刷一次，回头切过来看那个历史文件依然是 `<5ms` 秒开。同时，把「已审阅打勾」单独存在一个上限可控（12 仓×500 文件）的 `viewed.v1` 键里，既不会把用户的视觉配置 `prefs.v2` 搞脏，也不会无限膨胀撑爆 `localStorage`。

**【可选选项清单】**

| 选项 | 预算、缓存失效与 Viewed 持久化策略 | 得到什么 / 代价与长期治理评价 |
|---|---|---|
| **A（推荐）** | 1000ch/500行熔断 + >250行虚拟化 + 4ms/帧视口 Shiki + 64条/4MiB 按视角分层失效 LRU + 独立有界 `localStorage['...:viewed.v1']`（12仓×500条 + 跨页签同步 + digest 失效）。 | 首屏零白屏阻塞、滚动保 60fps、历史提交常驻秒开、配置键与运行状态物理隔离且磁盘占满保护完备。 |
| B | `Mark as Viewed` 仅存于当前页 `sessionStorage` 或纯 React 内存（关标签即丢），其余同 A。 | 实现更简单、不占 `localStorage`；开发者重启浏览器或新开一个同工作区 Tab 审阅大变更集时，刚勾完的几十个“已审阅”记录直接清零。 |
| C | 不做 `<=4ms/帧` 视口分帧（每次拿到补丁立刻全文件同步调 `useCodeHighlighter`），且把 `viewed` 字段写进 `prefs.v2`。 | 少写一套空闲调度器；1500 行 TS/YAML 文件刚点开就同步卡死主线程上百毫秒；`prefs.v2` 的布尔规范器 `normalizePrefs`（`prefs.js:37-44`）会被动态状态记录污染破坏职责纯洁性。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **Worker 异构与防卡死熔断实现细节**：
   - 新增自研纯 JS 模块（包含 Worker 体字符串与主线程 `rAF` 降级共用核心 parser/word-diff 函数，绝不写两份解析逻辑）：输入统一 `patch` 字符串后按 Hunk 拆分 `oldLine`/`newLine`/`kind`/`text`；计算整个 `patch` 的 FNV-1a digest；对 `text.length > 1_000` 或 Hunk 内变更总行数 `> 500` 的块直标跳过 Word-Diff，仅保留整行底色。
   - **CSP 防护**：构造 `new Worker(URL.createObjectURL(...))` 并及时 `revokeObjectURL`；一旦同步抛错或首条心跳失败，立即标记 `cspWorkerBlocked = true` 并无缝切走同一核心 parser 的时间切片跑法（每片 `<= 200` 行，单处逻辑维护）。
2. **宿主 `useCodeHighlighter` 视口分帧调度细节**：
   - 在组件顶层调宿主 `useCodeHighlighter(languageForPath(path))` 拿到 `highlighter`（参见 [code-mining-report.md](../../../../.temp/copy-t3code/code-mining-report.md) §2.2 及 `code-highlighting.ts:20-23`）。注意：**`highlighter` 会随 `language` 对应的异步语法包加载完成而更新身份**——因此在着色缓存键内附带版本代号，当语法包刚加载完时重新调度当前可见区间内尚未完成着色的行。
   - 渲染时默认首帧立即以纯文本+行背景/Word-Diff 胶囊渲染出来，由调度器按 `performance.now() - start < 4` 限制批量着色虚拟窗口 `[visibleStart - 20, visibleEnd + 20]`；单行 `> 1_000` 字符不传给 `highlighter`。
3. **LRU 分层失效与 `perf` span 接入**：
   - 复用 [workspace-store.js:53](../../../../dsh-nano-explorer-extra/src/client/workspace-store.js#L53) 语义或在 store 暴露 `gitEpoch`（仅当 `git.files` 状态变动刷新时递增）与 `headSha`：`working` 缓存只随工作区文件集合变动清扫对应键；`base` 缓存绑定 `(headSha, baseRef)`；`commit` 绑定不可变 SHA，免受后台状态轮询驱逐。
   - 按 `T-O-3` / `F7` 在解析阶段打点 `perf.span('diff-parse', ...)`、首次绘制与切片着色打点 `perf.span('diff-render', ...)`（非 `?perf-review=1` 时恒等零开销）。
4. **`viewed.v1` 独立键契约与同步**：
   - 新建 `src/client/viewed-store.js`：`dsh-nano-explorer-extra:viewed.v1` 存 `{ version: 1, repos: Array<{ repoKey, updatedAt, items: Record<string, { digest, viewedAt }> }> }`；写前维护最多 12 个最近活跃仓库、每仓按 `viewedAt` 保留最新 500 个文件路径；[prefs.js:5-44](../../../../dsh-nano-explorer-extra/src/client/prefs.js#L5-L44) 的 `prefs.v2` 与 `normalizePrefs` **保持只存纯布尔查看偏好，一字不改**。

**【推荐选项支持证据或其他选项的反例】**

- **宿主 `useCodeHighlighter` 必须分帧调用的直接源码证据**：`context/deepseek-harness/packages/client/ui-primitives/src/code-highlighting.ts:20-23`（已在本轮读取）明确暴露 `useCallback(code => highlightLines(code, language), [language, loaded])`——该调用是同步 JS-regex 分词；不做主线程 `<=4ms` 分帧就会直接阻塞用户滚动点击（选 C 的反例）。
- **`prefs.v2` 不能混入已读状态的源码铁证**：[prefs.js:37-44](../../../../dsh-nano-explorer-extra/src/client/prefs.js#L37-L44) 的 `normalizePrefs` 显式校验并清洗为 `Object.entries(DEFAULT_PREFS)` 中的纯布尔开关集合；且 [dsh-nano-explorer-extra/AGENTS.md:147-160](../../../../dsh-nano-explorer-extra/AGENTS.md#L147-L160) 锁定了 `prefs.v2` 的浏览器布尔偏好定位；另外 [code-mining-report.md](../../../../.temp/copy-t3code/code-mining-report.md) §2.3 显示宿主 `client-ui-forge` 本身也是将 `ViewedFiles` 放进独立版本号键（带 `digest` 与跨页签 `storage` 监听）。
- **阈值依据实证**：[code-mining-report.md](../../../../.temp/copy-t3code/code-mining-report.md) §1.1–1.3 已查证 `t3code` 采用 `tokenizeMaxLineLength: 1_000`（`DiffWorkerPoolProvider.tsx`）、`VIRTUALIZE_AFTER_ROWS = 250`（`ChangedFilesTree.tsx`）、`LRUCache(maxEntries, maxMemoryBytes)`（`lruCache.ts`）以及 `minmax(0, 1fr)` 防止滚动抖动（`StyledDiffCodeView.tsx`）。

---

### Q5 — 文件树 `Changed-Only` / `/` 筛选的目录呈现、状态生命周期，以及 `CommitDrawer` 三视角与 `HistoryRail` 抽屉流转应如何定界？

**驱动真相**：`T-O-6`（激活宿主 `FileTree` 原生 `levelsOf()` / `highlight`）、`T-O-2`（UI 宿主优先）、`T-O-1`（反 Orca 轻量化）、`T-O-4`（不留冗余双状态）。来源：[body.js:581-617,958-1035,1131-1150,1241-1260](../../../../dsh-nano-explorer-extra/src/client/body.js#L958-L1035)、[git.js:496-509](../../../../dsh-nano-explorer-extra/src/host/git.js#L496-L509)、[drawers.js:408-427,962-1050](../../../../dsh-nano-explorer-extra/src/client/drawers.js#L962-L1050)、[DESIGN.md:180](../../dsh-nano-ui/DESIGN.md#L180)。

- **影响范围**：`dsh-nano-explorer-extra/src/client/body.js`、`src/client/drawers.js`、`src/client/styles.js`、`src/client/i18n.js`。
- **为什么必须确认**：`T-O-6` 决定了前端要靠宿主 `FileTree` 落地 `Changed-Only` 和 `/` 筛选并做 `CommitDrawer` 三视角，但四个直接影响用户日常手感与交互逻辑的边界还没有钉死：① `Changed-Only` 遇到深层独苗目录（如 `a/b/c/foo.ts`）是否交由宿主 `levelsOf()` 标准分级显示，还是客户端强行拼接成单行字符串路径？② 开关状态和搜索框内容是随工作区/面板重置的临时态，还是写进 `prefs.v2`？遇到大仓 `> 800` 变动文件怎么防止卡死？③ `BranchDrawer` 内的 `HistoryRail` 点击某个提交文件看 Diff 时，是切去统一的 `CommitDrawer` 单抽屉并隐藏表单，还是在 `BranchDrawer` 里再叠第二套 Diff 查看弹窗？
- **当前建议 / 倾向**（`CT-batch-1 架构审查`）：选 **A**：
  1. **`Changed-Only` 走宿主原生层级，大改动自动收敛**：直接把前端已有 `ws.git.files`（加已展开级 `directoryStatus` 中的细节条目）喂给宿主 `FileTree` 原生 `levelsOf()`，**不做客户端单子目录链 `a/b/c` 字符串拼接**，保证行路径、展开记忆、右键菜单与 `Cmd+V` 图片粘贴落点（[body.js:613-615](../../../../dsh-nano-explorer-extra/src/client/body.js#L613-L615) `data-files-path`）与全树 100% 一致；维护独立的内存级 `changedExpanded`（切换回全量树时无损恢复用户原来的目录折叠记忆）；若 `Changed-Only` 条目 `> 800` 条，默认只自动展开前 2 级目录并展示轻量提示条防卡顿；
  2. **临时UI态，不入 `prefs.v2`，`/` 热键不抢输入框**：`changedOnly` 与 `filterQuery` 作为组件临时视图态（切换会话工作区根目录或刷新重进时归零，**绝不持久化进 `prefs.v2`**，防止下次进来误以为未改动文件全没了）；快捷键 `/` 仅当焦点位于文件树根容器内且无打开弹层/`Input` 时触发展开过滤条、`Esc` 清空收起；过滤严格只扫前端已有 `ws.levels` 或 `ws.git.files`（`0` 次 `/list`），直接透传 `highlight` 给宿主 `FileTree`；
  3. **`CommitDrawer` 与 `HistoryRail` 复用单抽屉互斥硬切换**：保持 [body.js:1241-1260](../../../../dsh-nano-explorer-extra/src/client/body.js#L1241-L1260) 唯一的底部单抽屉槽位（`drawer: null | 'branch' | 'commit'`，绝不新建第二套 Diff 弹窗或让两张大卡上下重叠）：
     - `CommitDrawer` 顶栏用宿主 `SegmentedControl` 提供视角切换（`工作区` / `相对基线`；当携带选中 `historyCommit` 时动态亮出第三档 `提交 #<shortSha>`）；
     - 切入只读视角（`相对基线` 或 `提交 #<shortSha>`）时，**直接隐藏提交信息输入框 `Input`、提示文与底部主动作「提交」按钮**，仅保留简洁查看/返回操作（避免只读视角误触或挤压 Diff 可视面积）；
     - 在 `BranchDrawer` 的 `HistoryRail` 点击任意提交文件行时，关闭 `'branch'` 切开 `'commit'` 视角直接定位打开该提交与该文件 Diff，头部附「返回分支历史」轻按钮一键切回原提交展开态。
- **Reasoning**：`DESIGN.md:180` 与 `body.js:613-615` 说明插件与宿主之间完全靠规范的 `entry.path`（与 `data-files-path`）对齐交互，一旦自己做 `a/b/c` 假拼接就会把右键「重命名/在终端打开/复制相对路径/粘贴图片」全弄歪；同时，`CommitDrawer` 与 `BranchDrawer` 目前已经是严格互斥的单底卡（`NanoWindowDialog`），将 `HistoryRail` 点击顺势导流到统一加强版 `CommitDrawer` 并隐去只读态下无意义的 Commit Message 输入框，能用**唯一一套 Diff 视图与状态机**吃透全部三种审阅场景，高度符合 `T-O-1` 反 Orca 简洁主义与 `T-O-4` 零冗余原则。
- **问题（请 [业主] 裁决）**：是否按推荐方案 **A** 锁定「`Changed-Only` 交由宿主 `levelsOf()` 标准分级 + 独立 `changedExpanded` + `>800` 条收起护栏、过滤开关为临时 UI 态不入 `prefs.v2`、`CommitDrawer` 只读态隐去提交表单、以及 `HistoryRail` 点击复用统一单抽屉互斥流转」？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意你在 [第2轮] 的全部推荐」），冻结为 `T-O-9`。

**【对本问题的解读】**
例：如果你在 `BranchDrawer` 提交历史里点了一个 3 天前的 commit 中的 `src/host/git.js`，界面干脆利落地切到同款 `CommitDrawer`、顶栏自动选中 `提交 #9f3a1c`，下面超大块全屏高颜值 Diff 直接滑出来（没有上面那个占地方的“请输入提交信息”输入框和“提交”按钮），左上角还有一个小返回键一点就回到刚才展开的提交列表；当你切到「仅看改动」并输 `/` 过滤 `drawers` 时，文件树立刻高亮 `drawers.js`，右键依然能「在终端打开」或「在右侧工作台打开」，而且刷新网页重新进来时文件树默认还原回完整树，不会让你吓一跳以为仓库文件丢了一大半。

**【可选选项清单】**

| 选项 | 树过滤策略与三视角抽屉交互流转 | 得到什么 / 代价与长期治理评价 |
|---|---|---|
| **A（推荐）** | 交由宿主 `levelsOf()` 标准分级（不做 `a/b/c` 假拼接）+ 独立 `changedExpanded` + `>800` 收起护栏；`changedOnly`/`filterQuery` 临时态不持久化；只读视角隐去 Commit 输入区；`HistoryRail` 走 `branch -> commit` 单抽屉互斥流转+一键返回。 | 零路径畸变、全树右键/粘贴/聚焦 100% 原生可用、大改动不卡、只读审阅视口面积最大化、全仓只有唯一套 Diff 渲染抽屉维护成本最低。 |
| B | 在客户端自己把单子目录压缩拼接成 `src/client/components` 伪节点（如 `forge` 那样），并将 `changedOnly` 状态存进 `prefs.v2` 永久记住。 | 深层次独苗目录视觉少占几行；伪路径名破坏宿主标准展开键记忆、破坏右键路径菜单及 `Cmd+V` 选中态锚定；永久持久化会致下次进仓误以为文件失踪。 |
| C | 在 `BranchDrawer` 内部再嵌套第二套 Diff 预览弹层给 `HistoryRail` 使用，`CommitDrawer` 只读视角也常驻灰色禁用的提交表单占位。 | 抽屉表面互不切换；同一套 Diff 渲染逻辑被分挂两个互不相通的抽屉容器里，只读态白白浪费近 `140px` 宝贵面板高度（违背 [MM2] 克制美学与 `T-O-4`）。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **宿主 `FileTree` 驱动 `Changed-Only` 与 `/` 筛选执行细节**：
   - 将 [body.js:958-979](../../../../dsh-nano-explorer-extra/src/client/body.js#L958-L979) 提炼出纯粹的树入口构造器：
     - 普通模式：沿用现行 `tree.entries` + `tree.expanded` + `highlight={filterQuery || undefined}`（注意若存在 `filterQuery`，仅对已加载入 `tree.levels` 内存层级及 `ws.git.files` 进行前缀/basename 匹配并合并其祖先路径展示，**绝不触发 `/list`**）；
     - `Changed-Only` 模式：从 `git.files`（以及已展开的 `directoryStatus` 细粒度未跟踪文件）抽取路径构造 `TreeEntry[]`，若总变动条目 `<= 800` 则自动把所有祖先目录路径填充进临时 `changedExpanded` 集合中；若 `> 800` 则仅自动展开至前 2 级并在过滤栏下显示精简收敛提示条；
     - 注意兼顾 [git.js:496-509](../../../../dsh-nano-explorer-extra/src/host/git.js#L496-L509) 语义：若一个整目录处于未跟踪状态（`?`），全局 status 报告该目录行（用户点击展开该未跟踪目录时，原有 scoped read `GET /status?path=...` 已会补齐里面具体文件）。
   - `/` 快捷键拦截守卫参照 [body.js:581-617](../../../../dsh-nano-explorer-extra/src/client/body.js#L581-L617) 既有拦截风格（校验 `dialog === null && !pasteTargetIsEditable(event.target)` 且当前 `drawer === null`），确保对话输入盒、重命名文本框或抽屉内部打 `/` 绝不误触。
2. **三视角 `CommitDrawer` 与 `HistoryRail` 抽屉流转执行细节**：
   - 升级 [drawers.js:962-1050](../../../../dsh-nano-explorer-extra/src/client/drawers.js#L962-L1050) 的状态输入，由 [body.js:1241-1260](../../../../dsh-nano-explorer-extra/src/client/body.js#L1241-L1260) 统一管理 `commitScope: { mode: 'working' | 'base' | 'commit', commitSha?, commitSubject?, fromBranchDrawer?: boolean }`：
     - `mode === 'working'`：完整展示提交输入框、`Ctrl+Enter`/按钮、`All / Staged / Unstaged / Untracked / Conflicts` 筛选与下方高颜值 Diff；
     - `mode === 'base'` 或 `mode === 'commit'`：**条件不挂载**提交信息 `Input`、`commitAllNote` 与底部 `Button(primary)`（省出 ~140px 纵深全部交给文件清单与虚拟化高亮 Diff 区域！），顶部加装基线信息胶囊（如 `对比基准：origin/main` 或 `提交 #9f3a1c · <subject>` + `fromBranchDrawer` 时的「返回历史」小按钮）；
   - 将 [drawers.js:408-418](../../../../dsh-nano-explorer-extra/src/client/drawers.js#L408-L418) `HistoryRail` 文件列表中每个 `<li className="nxe-commit-file">` 改为可点击交互按钮（带键盘聚焦样式及提示「点击查看此文件改动」），点击后触发 `onInspectCommitFile(shown, file.path)` 切换抽屉并记录最近展开提交对象，点「返回历史」直接带回原 `BranchDrawer`（保持展开的那条提交记录）。

**【推荐选项支持证据或其他选项的反例】**

- **路径语义与树锚定证据**：[body.js:613-615](../../../../dsh-nano-explorer-extra/src/client/body.js#L613-L615) 与 `treeKeyOf`（[body.js:971-979](../../../../dsh-nano-explorer-extra/src/client/body.js#L971-L979)）清楚显示所有树行操作（粘贴锚定、右键复制/重命名/删除、打开文件）均强依赖每层真实 `absolute` 目录节点名，强行自己拼接 `a/b/c`（选 B）会打断树展开记忆与操作目标，而宿主 `FileTree.tsx:160-217` 原生 `levelsOf()` 已经自动补全缺失父级并带 `highlight` 高亮（[code-mining-report.md](../../../../.temp/copy-t3code/code-mining-report.md) §2.1），正是选 A 零造轮子的直接证据。
- **输入框热键防抢占参考证据**：[body.js:589-601](../../../../dsh-nano-explorer-extra/src/client/body.js#L589-L601) 在实现 `Cmd+V` 粘贴图片时，正是通过 `pasteTargetIsEditable(event.target)` + `dialog !== null` 防止抢占聊天输入框或重命名框，同一安全模式可直接复用给 `/` 快捷过滤。
- **单抽屉互换性与垂直空间证据**：[drawers.js:996-1039](../../../../dsh-nano-explorer-extra/src/client/drawers.js#L996-L1039) `CommitDrawer` 顶部的 `Input`、`commitAllNote` 与 `filter` 占用了大量垂直固定高度（而底抽屉沉于侧栏底部高受限），只读视角隐去非工作区提交表单并采用 [body.js:1241-1260](../../../../dsh-nano-explorer-extra/src/client/body.js#L1241-L1260) 单抽屉 `drawer` 状态切换（选 A），可彻底避免选 C 双卡叠盖与视口浪费。

---

## 5. ★ 中场评估 II（Round 2 → Round 3）`[核心·锁死]`

- **5.1 对 Round 2 的判定**：Round 2 三道 `executional` 问题（`Q3`–`Q5`）均获 `[业主]` 全部确认。至此，宿主基线顺序/安全护栏/单失效链缓存/200KB 上限、前端 Worker 熔断/分帧预算/三视角 LRU/`viewed.v1` 持久化契约、以及 `Changed-Only` 与 `CommitDrawer`/`HistoryRail` 抽屉流转边界全部落锚无悬置。
- **5.2 本轮已锁定真相**：`T-O-7`、`T-O-8`、`T-O-9`（已全部追加写入 §1 台账）。
- **5.3 诚实反方制衡**（基于本轮对 `styles.js`、`i18n.js`、`check-ui-rules.mjs`、`bundle-smoke.test.mjs`、`perf.js`、`README.md` 的补充实证核查）：
  1. **固定视口矮窄与硬编码色值历史债**：[styles.js:354,409-420](../../../../dsh-nano-explorer-extra/src/client/styles.js#L354) 当前把抽屉锁死 `.nxe-scm-commit { height: 50vh }`、Diff 容器写死 `.nxe-commit-diff { height: 160px }` 并带硬编码 `#3fb950` / `#f85149` 备选色，若不在最终轮重做弹性布局与消费全局 Token、同时彻底移除死掉的 `viewDiffUnavailable` 文案（[i18n.js:34,278](../../../../dsh-nano-explorer-extra/src/client/i18n.js#L34)）与旧样式类，高颜值 Diff 仍会被压在 `160px` 窄缝里，且极易踩 `check-ui-rules` `U8` 死样式 / `U3` 原生按钮告警（今日实测基线为 `U1:0, U2:0, U3:18, U4:2, U5:0, U6:5, U8:0, U9:0, U10:3`）。
  2. **最小 `vm` 沙箱加载雷区**：[bundle-smoke.test.mjs:13-38](../../../../dsh-nano-explorer-extra/test/bundle-smoke.test.mjs#L13-L38) 仅向 `lib/client.js` 注入 `window`、`document`、`localStorage`、`navigator`（**没有 `Worker`、`URL.createObjectURL`、`IntersectionObserver`、`window.addEventListener`**）；如果新写的多线程/观测/同步模块在模块顶层急切访问这些 API，构建后冒烟测试会在 `vm.runInContext` 直接崩溃。
  3. **文档与产物欠账**：[README.md](../../../../docs/specs/dsh-nano-explorer-extra/README.md#L7-L11) 仍停留在 `0.1.1` / `tree.js` / `变更 diff: ❌`，本地还滞留未跟踪的过期归档 `dsh-nano-explorer-extra-0.3.0.tgz`；需要锁定交付形式与正式计划收口规范。
- **5.4 为什么提出 Round 3 及「是否可在第 3 轮收口」的明确判断**：
  - **明确判定：可以在第 3 轮（`Q6`–`Q8`）一次性完成全部执行层 `[真相层]` 冻结，无需进入第 4 轮**（前提是 `[业主]` 同意或微调 `Q6–Q8` 且不新增额外范围）。
  - **判断依据**：功能边界（`T-O-1`–`T-O-4`）、前后端架构（`T-O-5`、`T-O-6`）与核心算法/安全/数据契约（`T-O-7`–`T-O-9`）已覆盖 100% 核心设计面，目前只剩最后三块正交的工程收口砖——`Q6`（视觉布局、Token 替换、旧文案/样式退役与 UI 门禁红线）、`Q7`（`perf` 埋点对齐、懒初始化与精简充分验证矩阵）、`Q8`（工作树、版本号、文档同步与唯一正式计划规格），恰好由本轮 3 题完全收敛并解锁实施计划。

---

## 6. Round 3 —— `executional`（收口轮）：视觉布局与 UI 红线、可观测性与测试验证、工作树交付与计划收口（`Q6–Q8`）

> 本轮 `second-opinion`：`retired`（`[业主]` 直裁）。若 `[业主]` 对本轮 3 题裁定收敛且无新设需求，本册随即进入 `已冻结`，直接解锁工作树内正式计划 `CT-batch-1-plan.md`。

---

### Q6 — `CommitDrawer` 视口几何重构、全局 Token 替换、旧样式 / 死文案彻底退役与 `check-ui-rules` 红线应如何锁死？

**驱动真相**：`T-O-2`（UI 宿主优先与零 DOM 嫁接）、`T-O-6`（彻底退役旧 `<pre>` 与 `viewDiffUnavailable`）、`T-O-8`（虚列表行网格式）、`T-O-9`（只读态隐藏提交区）、`T-O-4`（能彻底退役就不要提供兼容）。来源：[styles.js:346-355,409-420](../../../../dsh-nano-explorer-extra/src/client/styles.js#L346-L355)、[i18n.js:34,278](../../../../dsh-nano-explorer-extra/src/client/i18n.js#L34)、[body.js:399](../../../../dsh-nano-explorer-extra/src/client/body.js#L399)、[DESIGN.md:194-219](../../dsh-nano-ui/DESIGN.md#L194-L219)。

- **影响范围**：`dsh-nano-explorer-extra/src/client/styles.js`、`src/client/i18n.js`、`src/client/drawers.js`、`src/client/body.js`。
- **为什么必须确认**：当前 `.nxe-commit-diff` 被写死 `height: 160px`（[styles.js:410](../../../../dsh-nano-explorer-extra/src/client/styles.js#L410)），按 `16px` 行高一次仅能看 10 行不到；且 [styles.js:415-420](../../../../dsh-nano-explorer-extra/src/client/styles.js#L415-L420) 带着硬编码 HEX 回退色和老 `.nxe-commit-diff-pre` 类名，[i18n.js:34,278](../../../../dsh-nano-explorer-extra/src/client/i18n.js#L34) 还留着已经退役的 `viewDiffUnavailable` 中英文文案。如果不在收口前锁死视口弹性高度比例、旧样式与死文案的彻底删除以及 `check-ui-rules` 量化不回退红线，实施期要么会把好看的 Diff 憋死在 `160px` 小格子里，要么会在仓库留下死样式/原生按钮技术债。
- **当前建议 / 倾向**（`CT-batch-1 架构审查`）：选 **A**：
  1. **弹性视口几何重构（替代死高 `50vh` / `160px`）**：把 [styles.js:354](../../../../dsh-nano-explorer-extra/src/client/styles.js#L354) 的 `.nxe-scm-commit` 升级为 `height: min(72vh, 680px); max-height: calc(100% - 16px)` 的纵向 Flex 容器；文件清单区域限高 `max-height: 36%`（独立内滚，当打开只读视角 `vs Base` / 历史提交并按 `T-O-9` 隐去提交表单后，`.nxe-commit-diff` 以 `flex: 1; min-height: 220px` 自动撑满全部剩余空间）；
  2. **彻底退役旧样式/死文案与消费全局 Token**：**整段删除** `.nxe-commit-diff-pre`、`.nxe-commit-diff-line`（[styles.js:417-420](../../../../dsh-nano-explorer-extra/src/client/styles.js#L417-L420)）以及 `#3fb950` / `#f85149` 硬编码回退色（全量消费宿主全局 `--dsw-alias-file-diff-{added,deleted}-{bg,gutter,marker}`、`--shiki-token-*`、`--dsw-alias-code-diff-*` 与 `color-mix()` 行内 Word-Diff 底色）；**彻底删除** [i18n.js:34,278](../../../../dsh-nano-explorer-extra/src/client/i18n.js#L34) 中已经退役无调用者的 `viewDiffUnavailable` 文案键，不同时保留旧 CSS 类名兼容；
  3. **`check-ui-rules` 量化不回退红线**：对照今日实测基线（`U1:0, U2:0, U3:18, U4:2, U5:0, U6:5, U8:0, U9:0, U10:3`），新增全部工具条按钮、已审阅勾选、视角切换、过滤输入框必须使用宿主 `Button` / `Checkbox` / `SegmentedControl` / `Input` / `Icon*` 或 `dsh-nano-ui` `IconButton`（唯一例外保留 [accessory.js](../../../../dsh-nano-explorer-extra/src/client/accessory.js#L56) 已有存量，**`CT-batch-1` 实现提交后须验证 `U1=0, U2=0, U5=0, U8=0, U9=0` 且 `U3/U4/U6/U10` 不高于现网基线**）。
- **Reasoning**：`DESIGN.md` 第 9 节清晰标明 `U1`–`U10` 全部可由 `scripts/check-ui-rules.mjs` 客观跑出。把 `160px` 改成 `flex: 1` 弹性填充后，配合 `T-O-9` 只读态隐去提交输入表单，Diff 审阅视口直接从 `<10` 行扩展到 `~25–32` 行，视觉舒适度跃升一个量级；彻底删除死 CSS 和 `viewDiffUnavailable` 保证 `U8`（死样式）维持 `0`，严守 `T-O-4` 长期治理要求。
- **问题（请 [业主] 裁决）**：是否按推荐方案 **A** 锁定 `CommitDrawer` 弹性视口几何、全量使用宿主全局 Token、彻底删除旧 `.nxe-commit-diff-pre`/硬编码颜色/`viewDiffUnavailable` 死文案，并将 `check-ui-rules` 零回退设为验收红线？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意本轮全部推荐」），冻结为 `T-O-10`。

**【对本问题的解读】**
例：之前 [styles.js:410](../../../../dsh-nano-explorer-extra/src/client/styles.js#L410) 给 Diff 框写死了 `height: 160px`——也就是说不管你在 `vs Base` 还是历史 Commit 隐去了多大的输入框，下面 Diff 永远只有 10 行高！选 **A** 就是把这个盒子改活：整体高度 `min(72vh, 680px)` 并用 `flex: 1` 让 Diff 自动吃满剩余纵深；顺手把死掉的 `viewDiffUnavailable` 中英文、旧 `.nxe-commit-diff-pre` 类和硬编码十六进制色值彻底删掉，保证全仓 `check-ui-rules` 跑出来零死样式、零新增原生 button 违规。

**【可选选项清单】**

| 选项 | 视觉几何、Token 清理与 UI 门禁规则 | 得到什么 / 代价与长期治理评价 |
|---|---|---|
| **A（推荐）** | 抽屉升级 `min(72vh, 680px)` + `flex: 1` 自适应 Diff 视口；彻底删净旧 `<pre>` 类、`#3fb950`/`#f85149` 与 `viewDiffUnavailable` 死文案；全部新控件走宿主原语 / `nano-ui`，锁定 `U1/U2/U5/U8/U9=0` 且 `U3/U4/U6/U10` 零新增。 | 只读模式下 Diff 瞬间扩充 2.5–3 倍可视行数；100% 原生主题融合、零死代码、零新增 UI 规则负债。 |
| B | 维持现有 `height: 50vh` / `height: 160px` 不动，且为了保险继续保留旧 `.nxe-commit-diff-pre` 类与 `viewDiffUnavailable` 文案键不删。 | 改动样式最少；`CommitDrawer` 依然挤在 `160px` 窄条里滚动极其憋屈，且在 `styles.js` / `i18n.js` 留下无人引用的死代码，踩 `check-ui-rules` `U8` 告警。 |
| C | 高度不做自适应而是自己实现 JS 拖拽分割条并直接手写原生 `<button>` / 新增 `nano-ui-exempt` 豁免。 | 可手动上下拖大小；引入无谓拖拽状态复杂性，且手写原生 `<button>` 直接推高 `U3` 违规违背 `T-O-2`。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **抽屉 Flex 几何布局重做（[styles.js:346-420](../../../../dsh-nano-explorer-extra/src/client/styles.js#L346-L420)）**：
   - `.nxe-dialog-layer .nxe-scm-commit` 调整为 `height: min(72vh, 680px); max-height: calc(100% - 16px); display: flex; flex-direction: column;`（并确保外层 `.nxe-scm` 为 `flex: 1; min-height: 0; display: flex; flex-direction: column;`）。
   - `ChangeGroup` 清单包裹容器设 `max-height: 36%; min-height: 76px; overflow-y: auto; flex: none;`；下方 `.nxe-commit-diff` 改为 `flex: 1; min-height: 220px; overflow: auto; contain: strict;`。
   - **关键 CSS Grid 防重排**（落实 `T-O-8` 与 `t3code` 实证）：Diff 虚拟化行设置 `grid-template-columns: 40px 40px 14px minmax(0, 1fr)`，长行内部允许横向滚动或可选自动换行但不影响列宽计算。
2. **颜色令牌与硬切清理**：
   - 删除 [styles.js:415-420](../../../../dsh-nano-explorer-extra/src/client/styles.js#L415-L420) 中全部旧 `.nxe-commit-diff-pre`、`.nxe-commit-diff-line` 及 `#3fb950`/`#f85149` 后备值；全面使用 `var(--dsw-alias-file-diff-added-bg)`、`var(--dsw-alias-file-diff-added-gutter)`、`var(--dsw-alias-file-diff-added-marker)` 等全局令牌，行内高亮 token 直接吃全局 `.shiki` CSS 变量无需插件自写两套主题表。
   - 彻底删除 [i18n.js:34](../../../../dsh-nano-explorer-extra/src/client/i18n.js#L34) 与 [i18n.js:278](../../../../dsh-nano-explorer-extra/src/client/i18n.js#L278) 的 `viewDiffUnavailable`。
3. **UI 合规验收检查**：
   - 使用宿主 `Button`、`Checkbox`（文件头 `Mark as Viewed`）、`SegmentedControl`（顶栏视角切换）、`Input`（`/` 树内过滤条）、`Tooltip` / 图标原语；完成改造后运行 `node scripts/check-ui-rules.mjs --plugin dsh-nano-explorer-extra --json` 比对基线。

**【推荐选项支持证据或其他选项的反例】**

- **现行矮小框体与硬编码颜色的直接证据**：[styles.js:354](../../../../dsh-nano-explorer-extra/src/client/styles.js#L354) 明确写了 `height: 50vh`，[styles.js:409-420](../../../../dsh-nano-explorer-extra/src/client/styles.js#L409-L420) 明确写了 `height: 160px` 及 `#3fb950`/`#f85149` 备选色，若不改，审阅几百行代码必须在 160px 小窗里来回拉滚动条（选 B 反例）。
- **`viewDiffUnavailable` 已彻底无用证据**：今日 `rg -n "viewDiffUnavailable"` 确认全包仅有 [i18n.js:34,278](../../../../dsh-nano-explorer-extra/src/client/i18n.js#L34) 与 [body.js:399](../../../../dsh-nano-explorer-extra/src/client/body.js#L399) 三处引用；依 `T-O-6` 退役 `body.js:399` 后若不删文案键则立刻形成死文案（违背 `T-O-4`）。
- **`check-ui-rules` 今日实测基线**：今日实跑输出 `U1:0, U2:0, U3:18, U4:2, U5:0, U6:5, U8:0, U9:0, U10:3`（见 [DESIGN.md:194-208](../../dsh-nano-ui/DESIGN.md#L194-L208) 规则表），选 A 从源头保证零增量告警。

---

### Q7 — `dsh-performance-review` 埋点扩展、懒初始化约束与测试验证矩阵应如何定界（严守「不得过度仪式」）？

**驱动真相**：`T-O-3`（性能指标验收）、`T-O-4`（不得过度仪式、不得阻碍发布）、`T-O-5`、`T-O-6`、`T-O-7`、`T-O-8`、`T-O-9`。来源：[declaration.json:1-84](../../../../dsh-nano-explorer-extra/src/perf/declaration.json#L1-L84)、[perf.js:1-36](../../../../dsh-nano-explorer-extra/src/client/perf.js#L1-L36)、[bundle-smoke.test.mjs:13-38](../../../../dsh-nano-explorer-extra/test/bundle-smoke.test.mjs#L13-L38)、[diff.test.mjs:1-38](../../../../dsh-nano-explorer-extra/test/diff.test.mjs#L1-L38)、[AGENTS.md:45](../../../../AGENTS.md#L45)。

- **影响范围**：`dsh-nano-explorer-extra/src/perf/declaration.json`、`dsh-nano-explorer-extra/lib/perf-declaration.js`（由构建脚本生成）、`dsh-nano-explorer-extra/test/*.mjs`。
- **为什么必须确认**：按照 [AGENTS.md:45](../../../../AGENTS.md#L45)「不得过度仪式：不得构建过度的测试循环、不得发布未经业主允许的 release-gate」，我们既要保证 Worker、防注入正则、双界 LRU、懒初始化不在无浏览器 API 的 `bundle-smoke.test.mjs` 沙箱崩溃并有充足单测兜底，又要防止为了“好看”而往仓内硬塞重型 Playwright/Vitest/硬阻断 perf gate。需要一次性明确埋点增补项、懒初始化铁律与刚刚好的验证集合。
- **当前建议 / 倾向**（`CT-batch-1 架构审查`）：选 **A**：
  1. **`declaration.json` 补齐与 Span 最小扩张（不增硬性 gate）**：在 [declaration.json:5-11,34-53](../../../../dsh-nano-explorer-extra/src/perf/declaration.json#L5-L11) 中补齐 `contract` 缺失的 `dnee.diff`、`dnee.paste-image`（达 20/20 与 [bindings.js](../../../../dsh-nano-explorer-extra/lib/bindings.js) 完全一致），在 `keys.spans` 新增 `diff-parse`、`diff-render`、`tree-filter`，经既有 [perf.js:28](../../../../dsh-nano-explorer-extra/src/client/perf.js#L28) 恒等包装埋点（默认关闭无分配）；**不新增 `budgets` 硬闸门**，保持现有两条 `git-poll` 既有项不变；
  2. **模块顶层懒初始化铁律**：所有新客户端模块（Worker 启动、`URL.createObjectURL`、`IntersectionObserver`、`localStorage`、`window.addEventListener`）**禁止在模块顶层（top-level evaluation）立即执行**，全部收进组件挂载或首次调用触发的懒加载闭包，保证 [bundle-smoke.test.mjs:13-38](../../../../dsh-nano-explorer-extra/test/bundle-smoke.test.mjs#L13-L38) 在最小化 `vm` 沙箱一秒跑通；
  3. **精简充分的 `node:test` 验证矩阵（零重型外挂框架）**：
     - 宿主新增/扩展测试（基于既有 [diff.test.mjs](../../../../dsh-nano-explorer-extra/test/diff.test.mjs) 体系）：`resolveBaseRef` 基线优先级与 Unborn 空仓返回、`readPathDiff` 三视角参数、`-` Flag/`..`/`.git`/非法 SHA 注入负例、`--no-ext-diff` 参数传递校验、无 `remote` 短路与 `mergeBaseCache` 命中；
     - 客户端纯逻辑 `node:test` 测试（不引 JSDOM/Playwright）：`ByteBudgetLruCache` 双上限驱逐与 `working`/`base`/`commit` 三视角独立失效、Diff Worker 纯核心函数（Hunk/Word-Diff 切分、`>1000ch` & `>500行` 熔断、digest 一致性）、`folderStatusMap` `O(1)` 聚合正确性、`Changed-Only` + `/` 树过滤路径合成、`viewed.v1` 12 仓 × 500 条 LRU 与 digest 失效；
     - 交付前 4 项常规检验：`npm --prefix dsh-nano-explorer-extra run build`、`npm --prefix dsh-nano-explorer-extra test`（全部绿灯）、`node scripts/check-ui-rules.mjs --plugin dsh-nano-explorer-extra --json`（符合 Q6 红线）、`npm --prefix dsh-nano-explorer-extra pack --dry-run`。
- **Reasoning**：`node:test` 原生在 1 秒内跑完且能直接按函数导入 ES Module 测透所有核心状态机、安全负例与渲染前纯逻辑（比方说验证 `Changed-Only` 与 `folderStatusMap` 不再每轮重建参考对象），既彻底杜绝了 `bundle-smoke` 崩沙箱的风险，又严格遵守不添重型 E2E 仪式与 release-gate 的全仓工作原则。
- **问题（请 [业主] 裁决）**：是否冻结以上 `declaration.json` 补齐 + 3 个新前端 perf span、模块顶层禁止急切调用浏览器 API 的懒初始化铁律，以及以纯 `node:test` 单元/安全测试 + `build` / `check-ui-rules` / `pack --dry-run` 为准的验证矩阵？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意本轮全部推荐」），冻结为 `T-O-11`。

**【对本问题的解读】**
例：[bundle-smoke.test.mjs:16-36](../../../../dsh-nano-explorer-extra/test/bundle-smoke.test.mjs#L16-L36) 是个非常关键的守护哨兵——它用一个只有 4 个伪造全局对象的 Node `vm` 上下文加载编译后的 `lib/client.js` 检查是否缺依赖报错。如果你在 `diff-worker.js` 顶层一上来就写 `const worker = new Worker(...)` 或 `window.addEventListener(...)`，跑测试时当场就炸。选 **A** 就是规定所有浏览器环境 API 全部懒加载，同时只用插件已有的 `node:test` 工具把解析器、缓存、防注入、热路径逻辑全部测透，不另外搭建沉重测试框架。

**【可选选项清单】**

| 选项 | 可观测性与测试验证矩阵 | 得到什么 / 代价与长期治理评价 |
|---|---|---|
| **A（推荐）** | 补全 `declaration.json` `dnee.diff`/`dnee.paste-image` + 新增 3 个 perf span（不增 gate）；严格模块懒初始化保 `vm` 沙箱；用扩展 `node:test`（核心纯逻辑 + 安全负例）+ `build` + `check-ui-rules` + `pack --dry-run` 收口。 | 毫秒级本地测试全覆盖、100% 保护 `bundle-smoke` 与 `?perf-review=1` 生产观测、完全遵守 `AGENTS.md`「不得过度仪式」。 |
| B | 在插件内新引入 Playwright / Chromium 无头浏览器 + Vitest 组件纤维计数套件并设为合并前强制 release-gate。 | 多一层真实 DOM 自动化快照；引入上百 MB 依赖与环境脆性，且明显违反 `AGENTS.md:45`「不得过度仪式 / 不得未经允许设 release-gate」。 |
| C | 不补 `declaration.json` 缺失项，也不为新 Worker/LRU/防注入写专门单测，只跑现有 `test/*.mjs`。 | 零测试开发量；新增 `commit`/`base` 安全校检、Word-Diff 熔断与 `viewed.v1` 驱动毫无单测防线，`declaration.json` 长期少两项合同记录。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **补齐 `declaration.json` 并经构建重烘**：
   - 更新 [declaration.json:5-11](../../../../dsh-nano-explorer-extra/src/perf/declaration.json#L5-L11) `spans` 增加 `"diff-parse"`, `"diff-render"`, `"tree-filter"`；[declaration.json:34-53](../../../../dsh-nano-explorer-extra/src/perf/declaration.json#L34-L53) `contract` 补入 `"dnee.diff"`, `"dnee.paste-image"`。执行 `npm --prefix dsh-nano-explorer-extra run build` 时由 [bake-declaration.mjs:42-52](../../../../scripts/bake-declaration.mjs#L42-L52) 自动校验格式并重建 `lib/perf-declaration.js`。
2. **所有新增浏览器副作用强制懒初始化**：
   - `diff-worker.js`、`viewed-store.js`、`observe-intersection.js` 模块顶层只做纯常量/纯函数定义；`Worker`、`IntersectionObserver`、`window.addEventListener('storage', ...)` 与 `localStorage` 只允许在函数调用或 React `useEffect` 内访问并带 `typeof ... !== 'undefined'` 保护。
3. **验证矩阵细化**：
   - **安全与宿主单测**：向 `test/diff.test.mjs` 或新测试文件注入 `--output=/tmp/x`、`-f`、`../etc/passwd`、`a/.git/config`、`invalidsha!` 等非法 `commit`/`base`/`path` 负例，断言统一 fail-closed 拒绝；mock 子进程参数核对 `--no-ext-diff` 与 `--` 隔断存在且无 remote 跳过 `listRemoteBranches`。
   - **客户端纯逻辑单测**：把 LRU 缓存、Diff parser/Word-Diff、`folderStatusMap` 与 `Changed-Only` 路径生成器抽为不直接导入 React DOM 的纯 JS 模块，直接在 `node:test` 下验证准确度、字节上限逐出、1000ch 熔断与引用稳定性。

**【推荐选项支持证据或其他选项的反例】**

- **懒初始化必要性的源码铁证**：[bundle-smoke.test.mjs:16-30](../../../../dsh-nano-explorer-extra/test/bundle-smoke.test.mjs#L16-L30) 构建的 `sandbox` 仅提供 `window.__ModuleLoader__`、`document` stubs、`localStorage: { getItem }`、`navigator`、`setTimeout` 等最小集合——没有 `Worker`、没有 `Blob`、没有 `IntersectionObserver`、没有 `window.addEventListener`，顶层急切引用必挂。
- **`declaration.json` 缺口与烘焙流水线证据**：[bake-declaration.mjs:44](../../../../scripts/bake-declaration.mjs#L44) 直接校验并解析 `src/perf/declaration.json`；今日读取确认 [declaration.json:34-53](../../../../dsh-nano-explorer-extra/src/perf/declaration.json#L34-L53) 比 [bindings.js:5-25](../../../../dsh-nano-explorer-extra/lib/bindings.js#L5-L25) 少了 `dnee.diff` 和 `dnee.paste-image`。
- **仓规禁止过度仪式证据**：[AGENTS.md:45](../../../../AGENTS.md#L45) 明确禁止发布未经 `[业主]` 允许的 release-gate 与构建过度测试循环（直接否定选 B）。

---

### Q8 — `CT-batch-1` 的分支工作树、版本发布、文档同步、陈旧产物清理与正式计划收口格式应如何锁定？

**驱动真相**：`T-O-1`（严限 `[DNEE]`）、`T-O-4`（worktree 规范、不得过度仪式、能清理就彻底清理）、`T-O-5`、`T-O-6`。来源：[AGENTS.md:45,47](../../../../AGENTS.md#L45-L47)、[package.json:3,19-31](../../../../dsh-nano-explorer-extra/package.json#L3)、[docs/specs/dsh-nano-explorer-extra/README.md:7-11,82](../../../../docs/specs/dsh-nano-explorer-extra/README.md#L7-L11)、[DNPR01-qna.md:38,41](../../dsh-nano-progress-report/qna/DNPR01-qna.md#L38)。

- **影响范围**：`.agents/worktrees/*`、`dsh-nano-explorer-extra/package.json`、`dsh-nano-explorer-extra/AGENTS.md`、`docs/specs/dsh-nano-explorer-extra/README.md`、`CT-batch-1-design.md`、`security/route-sensitivity.json`、本地过期 `.tgz` 以及计划文档 `docs/specs/dsh-nano-explorer-extra/plan/CT-batch-1-plan.md`。
- **为什么必须确认**：本仓遵循 `worktree` 开发规范（只能在 `.agents/worktrees` 构建语义分支并在合并后按要求删除），且当前存在滞后文档（`README.md` 还写着 `0.1.1` 和 `变更 diff: ❌`）和陈旧产物（`dsh-nano-explorer-extra-0.3.0.tgz`）。需要一次性冻结 `CT-batch-1` 的交付单位（拆批还是合批）、版本号跃迁、全部需要同次同步的文档清单，以及正式计划的唯一落地形态与准入/准出口径。
- **当前建议 / 倾向**（`CT-batch-1 架构审查`）：选 **A**：
  1. **一个语义工作树、一次合并、一个版本（`0.3.0 → 0.4.0`）**：在 `.agents/worktrees/ct-batch-1-review-perf` 创建语义分支一次交付全部 `CT-batch-1` 功能，合并回 `main` 后按 `[业主]` 指示删除 worktree；[package.json:3](../../../../dsh-nano-explorer-extra/package.json#L3) 版本由 `0.3.0` 升至 `0.4.0`（`engines.dsh` 维持 `>=0.2.2-rc.1 <0.3.0` 不变）；合并不自动触发本机实例部署，由 `[业主]` 择时用 `dsh plugin` 安装；
  2. **文档与产物同次硬同步，彻底清理陈旧残物**：
     - 同步修订 [dsh-nano-explorer-extra/AGENTS.md](../../../../dsh-nano-explorer-extra/AGENTS.md)（更新 `GET /status?only=base-diff`、`POST /diff` 新参数、抽屉三视角与树内筛选使用说明、删除旧 `viewDiffUnavailable` 口径、新增 `viewed.v1` 键说明）；
     - 同步刷新 [docs/specs/dsh-nano-explorer-extra/README.md](../../../../docs/specs/dsh-nano-explorer-extra/README.md)（版本号 `0.4.0`、当前真实文件树去除已删 `tree.js`、更新 Diff 与三视角能力状态表）；
     - 同步修订 [security/route-sensitivity.json:227-230,510-515](../../../../security/route-sensitivity.json#L510-L515) 说明；
     - 在 [CT-batch-1-design.md](../CT-batch-1-design.md) 文首标明「本文已被 `qna/CT-batch-1-qna.md` §1 冻结的 `T-O-*` 取代，保留作调研与形成史；冲突以 `T-O` 为准」；
     - 删除过期未跟踪归档 `dsh-nano-explorer-extra/dsh-nano-explorer-extra-0.3.0.tgz`；
  3. **唯一正式计划收口形态**：Round 3 冻结后，`CT-batch-1-qna.md` 状态转 `已冻结`，随后写入唯一计划 `docs/specs/dsh-nano-explorer-extra/plan/CT-batch-1-plan.md`（状态 `draft`，§2 引用本册 §1 `T-O-1`–`T-O-12` 不另立真相账本，包含工作分解、改动文件表、Q7 验证结果回填栏），经 `[业主]` 批准转 `reviewed` 后方可进 worktree 开工，不另立冗余收口报告或对抗审查文件。
- **Reasoning**：`CT-batch-1` 的后端扩参、前端 Diff 引擎与文件树优化彼此强联动（例如没有 `T-O-7` 的 `POST /diff` 新参数，`HistoryRail` 与 `vs Base` 都跑不通），合在一个干净的 `0.4.0` 交付单元不仅契合本仓先例（[DNPR01-qna.md:38,41](../../dsh-nano-progress-report/qna/DNPR01-qna.md#L38) `T-O-14`/`T-O-17`），还能彻底杜绝多版本切分带来的半成品阶段与反复重建 `lib/` 仪式开销。
- **问题（请 [业主] 裁决）**：是否按推荐方案 **A** 锁定「单工作树 `.agents/worktrees/ct-batch-1-review-perf` 一次交付（`0.3.0 → 0.4.0`）、同次更新全部关联文档并清理 `0.3.0.tgz`、以唯一 `docs/specs/dsh-nano-explorer-extra/plan/CT-batch-1-plan.md` 经批准后开工且不设额外收口文档」？请选择 **A / B / C**，或给出修订。
- **业主回答**：已确认 A（2026-11-21：「业主同意本轮全部推荐」），冻结为 `T-O-12`。

**【对本问题的解读】**
例：这相当于明确「项目施工许可证与竣工图纸怎么交」——我们不开 3 个零碎小分支折腾 3 次打包，只在一个语义目录 `.agents/worktrees/ct-batch-1-review-perf` 里把 `CT-batch-1` 从后端只读扩参、前端虚拟化高亮到测试/文档全部一次性做到位，升一个小版本 `0.4.0`，把桌面上放过期了的 `0.3.0.tgz` 和停留在 `0.1.1` 的旧 README 顺手一并清理刷新；而且这一轮答完后，整个 `CT-batch-1` 就直接冻结进实施计划阶段，不用再开第 4 轮反复磨了。

**【可选选项清单】**

| 选项 | 分支、发布粒度与收口规范 | 得到什么 / 代价与长期治理评价 |
|---|---|---|
| **A（推荐）** | 单语义工作树 `ct-batch-1-review-perf` 一次交付、`0.3.0 → 0.4.0`、同次刷新 `AGENTS.md`/`README.md`/`route-sensitivity.json`/清理 `.tgz`、唯一 `CT-batch-1-plan.md`（经批开工，结果回填末节）。 | 一步到位的完整 `0.4.0` 体验、零中间态、文档与代码 `100%` 对齐、最省 `[业主]` 审阅与安装次数。 |
| B | 把「树性能+Changed-Only」「Worker Diff」「vs Base/HistoryRail」拆成 3 个独立工作树与 3 个版本先后合并。 | 每次 PR 体积更小；前两批合入时 `HistoryRail` 仍点不开或无三视角，触发 3 倍构建/回归/文档维护仪式成本。 |
| C | 只在代码层面发 `0.4.0`，`docs/specs/dsh-nano-explorer-extra/README.md` 等文档与 `0.3.0.tgz` 暂不处理、计划与收口各自另建多份文档。 | 省去几段文档修改；造成仓库 `README.md` 与实际脱节、违背 `AGENTS.md` 单一真源与不得另立仪式文件原则。 |

**【推荐选项的详细执行说明析】**（仅在选 A 后成立）

1. **Worktree 与版本规范**：
   - 在 `/Users/seanz/Documents/dsh-plugins/.agents/worktrees/ct-batch-1-review-perf`（基于 `main` 建分支 `ct-batch-1-review-perf`）开展所有代码修改、编译产物重生成（`lib/host.js`、`lib/client.js`、`lib/perf-declaration.js`、`lib/bindings.js`）与测试验证；
   - 更新 [package.json:3](../../../../dsh-nano-explorer-extra/package.json#L3) `"version": "0.4.0"`，`engines.dsh` 保持 [package.json:30](../../../../dsh-nano-explorer-extra/package.json#L30) 原值不变；删除未跟踪过期归档 `dsh-nano-explorer-extra/dsh-nano-explorer-extra-0.3.0.tgz`。
   - 合并回 `main` 后，按 [AGENTS.md:47](../../../../AGENTS.md#L47) 在 `[业主]` 确认后删除 `.agents/worktrees/ct-batch-1-review-perf` 目录。
2. **关联文档单一真源同步**：
   - 修订 [dsh-nano-explorer-extra/AGENTS.md](../../../../dsh-nano-explorer-extra/AGENTS.md) 路由说明表、`使用` 动作表（去掉 `viewDiffUnavailable` 提示与静态 `<li>` 旧描述，补充三视角与 `Changed-Only`/`/` 过滤）与 `配置与状态`（补充 `viewed.v1` 独立键）；
   - 更新 [docs/specs/dsh-nano-explorer-extra/README.md](../../../../docs/specs/dsh-nano-explorer-extra/README.md) 彻底淘汰停留在 `2026-11-09`、`0.1.1` 及引用已删 `tree.js` 的旧记录；
   - 更新 [security/route-sensitivity.json:227-230,510-515](../../../../security/route-sensitivity.json#L227-L230) 与 [CT-batch-1-design.md](../CT-batch-1-design.md) 头部衔接说明。
3. **唯一计划交接**：
   - 本册 Round 3（`Q6–Q8`）获 `[业主]` 批复后，追加 `## 7. 收口冻结（全轮完成）` 把本册状态正式转 `已冻结`（总计 12 条 `T-O`，含开轮基线 `T-O-1`–`T-O-4` + Round 1–3 `T-O-5`–`T-O-12`），随即生成待建计划 `docs/specs/dsh-nano-explorer-extra/plan/CT-batch-1-plan.md`（状态 `draft`）呈交 `[业主]` 审阅；未获批准前不开始编码。

**【推荐选项支持证据或其他选项的反例】**

- **文档漂移与过期归档实证**：今日直接读取确认 [docs/specs/dsh-nano-explorer-extra/README.md:7-11,35,82](../../../../docs/specs/dsh-nano-explorer-extra/README.md#L7-L11) 仍写着版本 `0.1.1`、文件 `tree.js`（仓内 `src/client/` 已无该文件）及 `变更 diff: ❌ 不在范围`，而 `ls -la` 与 `git status --ignored` 查实存在未跟踪的 `dsh-nano-explorer-extra-0.3.0.tgz`（91KB）。
- **Worktree 与同仓收口先例铁证**：[AGENTS.md:47](../../../../AGENTS.md#L47) 明确限定唯一合法 worktree 目录为 `.agents/worktrees`；同仓 [DNPR01-qna.md:38,41](../../dsh-nano-progress-report/qna/DNPR01-qna.md#L38) 冻结的 `T-O-14`（单语义分支、一次合并、升版、合并后删除 worktree、不自动升级本机实例）与 `T-O-17`（唯一 `draft` 计划经 `[业主]` 批复转 `reviewed` 后开工，不另设额外收口文档）已验证为最高效无摩擦的本仓标准化工作流。

---

## 7. ★ 收口（全轮冻结）`[核心·锁死]`

- **7.1 对 Round 3 与全册一致性的终审判定（STEP.1–STEP.2）**：
  1. **内部一致性与竞态核查**：已完成 `Q1`–`Q8` 与 `T-O-1`–`T-O-12` 逐条对账——修复了 `Q6` 中「当前建议（`min-height: 220px`）」与「详细说明（原 `200px`）」的微小数值差异（统一锁死为 `min-height: 220px` + 列表 `max-height: 36%`）；将 `Q4` 的 `requestId` + `highlightEpoch` 防竞态要求正式显式写入 `T-O-8` 约束；对齐了 `Q8` 所指收口节编号（即本节 `§7`）。全册在路由数（20 条不变）、存储键边界（`prefs.v2` vs `viewed.v1`）、失效链（`memoized` + `forgetReads` + `mergeBaseCache`）、懒初始化沙箱及退出条件上零冲突、零双源、零未登记细节。
  2. **冻结判据满足**：基础方向（`T-O-1`–`T-O-6`）与全部执行层参数/安全/预算/UI/测试/交付规范（`T-O-7`–`T-O-12`）共 **12 条 `T-O-*` 全部冻结**，`8/8` 题全数获 `[业主]` 裁定确认，零 `OPEN` 残题。
- **7.2 正式交接**：
  - 本册文档状态正式转为 **`已冻结`**；
  - 解锁工作树内下一阶段唯一正式实施计划：`docs/specs/dsh-nano-explorer-extra/plan/CT-batch-1-plan.md`（§2 直接引用本册 §1 `T-O-1`–`T-O-12`，不复述决定、不另立真相账本，以 `draft` 呈交 `[业主]` 审阅批准后转 `reviewed` 并建 `.agents/worktrees/ct-batch-1-review-perf` 开工）。

---

## 8. 使用约束与修订历史

### 使用约束
1. **唯一真源纪律**：后续 `CT-batch-1` 实施计划与编码阶段若发现任何与 [CT-batch-1-design.md](../CT-batch-1-design.md) 或 [copy-t3code-initial-assessment.md](../copy-t3code-initial-assessment.md) 出入，一律以本册 §1 冻结的 `T-O-1`–`T-O-12` 为准。
2. **推翻与修订规则**：已冻结之 `T-O-*` 如需变更，必须在本册追加修订记录并经 `[业主]` 重新裁决，严禁实现期私自改约或双写妥协。

### 修订历史

| 版本 | 日期 | 作者 | 主要变更 |
|---|---|---|---|
| `v0.1` | `2026-11-21` | `CT-batch-1 架构审查` | 初始化 `CT-batch-1-qna.md`；登记开轮基线 `T-O-1`–`T-O-4`；提出 Round 1 `foundational` 2 题（`Q1–Q2`） |
| `v0.2` | `2026-11-21` | `CT-batch-1 架构审查` | 冻结 Round 1（`T-O-5`、`T-O-6`）；追加「中场评估 I」；提出 Round 2 `executional` 3 题（`Q3–Q5`） |
| `v0.3` | `2026-11-21` | `CT-batch-1 架构审查` | 冻结 Round 2（`T-O-7`–`T-O-9`）；追加「中场评估 II」并明确判定 Round 3 为收口轮；提出 Round 3 `executional` 3 题（`Q6–Q8`） |
| `v0.4` | `2026-11-21` | `CT-batch-1 架构审查` | 完成全册一致性与防竞态复核，冻结 Round 3（`T-O-10`–`T-O-12`），全册状态转 **`已冻结`**，解锁 `CT-batch-1-plan.md` |
