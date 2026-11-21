# Nano-Agent 行动计划：RP-batch-1 · [DNN] 渲染管线升级

> 服务业务簇: `dsh-nano-notepad`（[DNN]）
> 计划对象: `RP-batch-1` 渲染管线升级（mirror 增量 DOM + render worker + 观测收敛 + 缓存边界）
> 类型: `upgrade`
> 作者: `swe-2`
> 时间: `2026-11-21`
> 文件位置: `dsh-nano-notepad/`（src/client/**、src/worker/、lib/fx/np-render-worker.mjs、test/、scripts/build-client.mjs、package.json、AGENTS.md）
> 上游前序 / closure:
> - `docs/specs/dsh-nano-notepad/render-pipeline-1121.md`（吸收评估，`frozen`）
> 下游交接:
> - `RP-batch-2`（`B1`–`B6`/`F9` 编号保留，待 [业主] reopen 后另起 QNA）
> 关联设计 / 调研文档:
> - `docs/specs/dsh-nano-notepad/render-pipeline-1121.md`
> - `.temp/copy-t3code/code-mining-report.md`
> - `docs/specs/dsh-nano-explorer-extra/CT-batch-1-design.md`（同方法论姊妹文档）
> 冻结决策来源:
> - `docs/specs/dsh-nano-notepad/qna/RP-batch-1-qna.md` `T-O-1`–`T-O-12`（只读引用；本 plan 不填 Q/A）
> grounding 来源:
> - `RP-batch-1-qna.md` + 本仓 `src/client/**` file:line 实锚（§7 内置锚区即本 AP 的 grounding 真源）
> 关联 reference-anchor:
> - 见 §7 内置锚区
> 文档状态: `draft`（经 [业主] 批准转 `reviewed` 后在 `.agents/worktrees/rp-batch-1-render-pipeline` 开工）
>
> **文件名声明**：本文件即 `T-O-12` 冻结的唯一正式计划（`RP-batch-1-plan.md`），文件名含语义 slug `-render-pipeline`，差异已登记，下游 `T-O-12` 引用不变。

---

## 0. 执行背景与目标

`render-pipeline-1121.md` 完成了 [DNN] 对照 `t3code@c1464d6` 的渲染管线吸收评估，结论：t3code 的顺滑来自「Worker/WASM 异构卸载 + 增量 DOM + 视口批加载 + 缓存边界」系统工程，而非 GPU。`RP-batch-1-qna.md` 已将 batch-1 的全部执行层真相冻结为 `T-O-1`–`T-O-12`。本 AP 把冻结结论落成可交付物：**mirror 帧成本从 O(文档) 降为 O(脏段)，`.json`/markdown 预览的 O(文档) parse 移出主线程，观测面「没变不干活」，缓存有界不击穿内存**。

- **服务业务簇**：`dsh-nano-notepad`
- **计划对象**：`RP-batch-1`
- **本次计划解决的问题**：
  - `paintMirror`（`panel.js:1187-1203`）每帧 `highlightSource(全文)` + 全文 `innerHTML` 重建——输入路径唯一稳定帧级 O(文档) 开销（代码自证注释：28KB draft per-keystroke full rebuild）。
  - `.json` 文件输入路径 `validateJson`+`renderJsonTree`（`panel.js:1864-1867`）与 markdown `renderMarkdown`（`panel.js:1901`）O(文档) parse 全压主线程。
  - `ctaWatch`（`panel.js:4886-4895`）`document.body` subtree MutationObserver 对宿主聊天 token 流逐次全扫；`applyCopy`/`renderTree`/`renderTabs` 在 `render()` 约 54 个触发点下无变更区分全量重建。
  - `renderCache`/`peekCache` 只限条目数不限字节（`panel.js:1889-1907,1298-1302`），图片 data URL 大图可击穿内存；`renderCache` key 含整篇 markdown（`panel.js:1889`），每键必 miss。
  - `imageIdsIn` 正则重扫的四个调用点：`commitVersion`（`db.js:593`）、`pruneImages` 全库重扫（`db.js:629`）、`deleteNodes` 对剩余 nodes 全扫（`db.js:552`）、`renderBody` 每次取图（`panel.js:1897`）；`stampContentMd5` 版本循环（`db.js:318-320`）与 `applyRemoteFiles`（`db.js:791`）无门卫全量 `md5Hex`（`sanitizeNodes` 的 `^[a-f0-9]{32}$` 有效性守卫 `db.js:280` 已实现，不算待做）。
- **本次计划的直接产出**：
  - mirror `display:contents` 行包装 + 脏行段增量 DOM（`T-O-5`/`T-O-8`）。
  - `lib/fx/np-render-worker.mjs` 静态资产 + `src/worker/np-render-worker.js` 作者源（`T-O-6`/`T-O-7`/`T-O-10`）。
  - 观测收敛三件套（`ctaWatch` rAF 合批、`applyCopy`/tree/tabs 签名跳过）+ 双界 LRU + IDB `imageIds` 会话缓存 + `md5Hex` 时序治理（`T-O-9` + spec F8）。
  - 预览块级记忆化 + `content-visibility` + `renderCache` 短键（spec F2 + 中场评估 5.3 登记项）。
  - `test/` 四个新 suite + `lab/baseline` 基线行 + `0.3.0` 版本与文档同步（`T-O-11`/`T-O-12`）。
- **本计划不重新讨论的设计结论**：
  - mirror 单轨 `display:contents` + 函数内整层回退（`T-O-5`）；零并存开关、零虚拟化丢 DOM。
  - worker 卸载四项纯函数、`{id,op,payload}` 协议、占位符 markdown 协议、requestId 作废（`T-O-6`/`T-O-7`）。
  - F9（fx-core 引擎 worker 化）归 batch-2，本 AP 不碰 `fx-runtime.js`（`T-O-6`）。
  - `LINE_TINT_CAP=4_096`、inFence `trimStart().startsWith('```')` 共享谓词、回退线 `max(100,N×50%)`（`T-O-8`）。
  - ctaWatch 保 `document.body`+rAF 合批；双界 `64/32MB`+`8/40MB`；`imageIds` 会话 `Map`（`T-O-9`）。

---

## 1. 执行综述

### 1.1 总体执行方式

「**先基线后改动、先立取后结构、先纯函数后 worker、先验证后交付**」。P0 记录 perf 基线与测试脚手架（没有 before 就没有 after 的量化验收，T-O-3）；P1 收编全部零风险立取项（熔断/LRU/md5 时序/imageIds/签名跳过/rAF 合批——同一「没变不干活」治理族，互不耦合）；P2 动最高价值的 mirror 结构（最大风险项单独成 Phase，有独立验收红线）；P3 预览记忆化（依赖 P2 已清的 mirror 边界与 P1 的缓存设施）；P4 worker 与构建（依赖 P1 已 export 的行级纯函数）；P5 收口（测试/基线/文档/版本/合并）。

### 1.2 Phase 总览

| Phase | 名称 | 规模 | 目标摘要 | 依赖前序 |
|------|------|------|----------|----------|
| Phase 0 | 基线与测试脚手架 | `S` | perf span 基线入 `lab/baseline`；新 test 骨架先红后绿 | `-` |
| Phase 1 | 立取项（观测收敛 + 缓存边界 + 熔断 + md5/imageIds 时序 + 测试缝提取） | `M` | F6/F7/F8/F5 + T-O-9 全套落地；`lineHtml`/`isFenceLine` export + `render-support.js` 纯单元为 P2/P4 与全部测试备好 API | `P0` |
| Phase 2 | mirror 增量 DOM（`display:contents`） | `L` | T-O-5/T-O-8 全规格落地；像素对齐人工验收 | `P1`（需 `lineHtml` export 与 `LINE_TINT_CAP`） |
| Phase 3 | 预览记忆化 + `content-visibility` + `renderCache` 短键 | `M` | markdown 块级 `Map<blockText,Element>` 记忆化；key 改 `file.id+md5` 短键 | `P1`（双界 LRU 设施）、`P2`（mirror 边界已定） |
| Phase 4 | `np-render-worker` + 构建接入 | `M` | worker 源 + esbuild 第二入口 + 调用接入（markdown/jsonRender/jsonValidate/highlight 冷启动） | `P1`（行级纯函数+测试缝）、`P3`（markdown 调用点已定形） |
| Phase 5 | 收口（测试/基线/文档/版本/合并） | `S` | §8 台账全 PASS；`0.3.0`；AGENTS.md/README/spec 同步；worktree 合并 | `P0`–`P4` |

### 1.3 Phase 说明

1. **Phase 0 — 基线与测试脚手架**：先跑 perf-review 拿 `highlight`/`highlight-dom`/`render`/`keystroke-input`/`draft-commit` 的 before 值入 `./lab/baseline/baseline.json`；同时落四个新 test 文件骨架（断言先写、实现后填，红灯起步防假绿）。
2. **Phase 1 — 立取项**：全部「改一处、零结构风险」的小项一次收编，并让 `lineHtml`/`inlineMd`/`inlineJson`/`isFenceLine` 带 `LINE_TINT_CAP` 熔断 export；同时把 `panel.js` 闭包里的纯逻辑提取进 **`src/client/render-support.js`**（`node:test` 唯一可达测试缝——`panel.js` 仅导出 `mountNotepad`，`T-O-11` 禁 jsdom，不提取则所有新断言物理不可写）。
3. **Phase 2 — mirror 增量 DOM**：本批唯一「动 DOM 结构」的高风险项单独成 Phase；`display:contents` 行包装 + 脏段状态机 + 函数内整层回退，验收红线 = 像素对齐人工通过。
4. **Phase 3 — 预览记忆化**：markdown 块级记忆化 + `content-visibility` + `renderCache` key 换短键（消中场评估 5.3 登记的 key 含全文问题）。
5. **Phase 4 — render worker + 构建**：`src/worker/np-render-worker.js` 作者源 → `build()` 产 `lib/fx/np-render-worker.mjs`；markdown/jsonRender/jsonValidate 全走 worker、highlight 冷启动走 worker。
6. **Phase 5 — 收口**：§8 全台账 PASS、after 基线、文档/版本同步、合并 worktree。

### 1.4 执行策略说明

- **执行顺序原则**：纯函数/立取项先行（P1），结构项居中（P2/P3），worker/交付殿后（P4/P5）。任何 Phase 失败可独立回滚（除 P2 需整 Phase 回滚——`T-O-5` 单轨不留并存）。
- **风险控制原则**：P2 是唯一高风险项，`display:contents` 像素对齐若 dev 实例验证不齐 → **整 Phase 回滚**（`T-O-5` 单轨禁止旧实现并存，Q1-Option-B 的 R0 已被 [业主] 否决、不得作为替代交付）；AP 以 `partial` 收口、其余 Phase 照常，mirror 增量带新证据归 batch-2 重议；其余 Phase 均为可独立取舍的小项。
- **测试推进原则**：P0 基线 → 每 Phase 落地即跑对应 `node:test` → P5 全量回归 + after 基线。`nue-migration` 零模式断言全程不动。
- **文档同步原则**：spec `frozen` 与 AGENTS.md/README 同步放在 P5 同一次提交，避免「代码已改、文档还旧」窗口。
- **回滚 / 降级原则**：P2 整 Phase 回滚预案见上；worker 构造失败/超时即本地同函数回退（`T-O-7`），不构成失败面。

### 1.5 本次 action-plan 影响结构图

```text
RP-batch-1（dsh-nano-notepad）
├── Phase 0: 基线与测试脚手架
│   ├── lab/baseline/baseline.json（仓根）
│   └── test/{mirror-incremental,render-worker,observation-convergence,line-tint-cap}.test.mjs
├── Phase 1: 立取项
│   ├── src/client/highlight.js（LINE_TINT_CAP + export lineHtml/inlineMd/inlineJson/isFenceLine）
│   ├── src/client/render-support.js（🆕 纯单元测试缝：mirrorEdits/boundedCache/signatures/coalescer/rpcChannel…）
│   ├── src/client/panel.js（renderCache/peekCache 双界、applyCopy/renderTree/renderTabs 签名、ctaWatch rAF——薄壳调缝）
│   └── src/client/db.js（imageIds 会话 Map、md5 时序）
├── Phase 2: mirror 增量 DOM
│   ├── src/client/panel.js:1187-1230（paintMirror/schedulePaintMirror/fitMirror + mirrorLines 状态机）
│   └── .np-mirror CSS（panel.js:473-476 display:contents）
├── Phase 3: 预览记忆化
│   ├── src/client/panel.js:1884-1910（renderBody markdown 分支 + renderCache 短键）
│   └── .np-read 块 CSS（content-visibility）
├── Phase 4: render worker
│   ├── src/worker/np-render-worker.js（🆕）
│   ├── scripts/build-client.mjs（第二入口）
│   └── src/client/panel.js（renderWorker 调度层 + markdown/jsonRender/highlight 冷启动接入）
└── Phase 5: 收口
    ├── package.json（0.3.0）、AGENTS.md、README.md、render-pipeline-1121.md（frozen 标注）
    └── .agents/worktrees/rp-batch-1-render-pipeline → main 合并
```

---

## 2. In-Scope / Out-of-Scope

### 2.1 In-Scope（本次 action-plan 明确要做）

- **[S1]** mirror `display:contents` 行包装 + 脏行段增量 DOM（T-O-5/T-O-8）。
- **[S2]** `np-render-worker` 静态资产 + 分态调度 + `{id,op,payload}` 协议 + markdown 占位符协议（T-O-6/T-O-7）。
- **[S3]** 观测收敛：`ctaWatch` rAF 合批、`applyCopy`/`renderTree`/`renderTabs` 内容签名跳过（T-O-9）。
- **[S4]** 缓存边界：`renderCache`/`peekCache` 双界 LRU、`imageIds` 会话 `Map`、`md5Hex` 时序治理（T-O-9 + spec F8）。
- **[S5]** 预览记忆化：`renderMarkdown` 块级 `Map` 复用 + `content-visibility` + `renderCache` `file.id+md5` 短键（spec F2 + 中场评估 5.3）。
- **[S6]** `LINE_TINT_CAP=4_096` 单行熔断 + `lineHtml`/`inlineMd`/`inlineJson` export（T-O-8 + spec F6）。
- **[S7]** 验证/交付：`src/client/render-support.js` 测试缝 + 四个 `node:test` suite、`lab/baseline` 基线、`0.3.0`、AGENTS.md/README/spec 同步、worktree 合并（T-O-10/T-O-11/T-O-12）。

### 2.2 Out-of-Scope（本次 action-plan 明确不做）

- **[O1]** F9：fx-core.wasm 引擎进 worker（`fx-runtime.js`/`fx-sqlite.js` 不碰）——`T-O-6` 归 batch-2。
- **[O2]** 文件树窗口虚拟化/`buildFileTreePathUpdates` 同构增量（`B1`/`B3`）——量级不足，sig 跳过已够。
- **[O3]** WASM 化 `renderMarkdown`/`highlightSource`（`B6`）/ `@pierre` 裸引——等 batch-2 测量驱动。
- **[O4]** `Uint32Array` 行偏移/大文本流式预览（`B4`）——`/read` 已有字节上限。
- **[O5]** IndexedDB schema 变更、`imageIds` 持久化、`md5` 换算法、`blob:`/`data:` worker、宿主锚点收窄 ctaWatch——`T-O-1`/`T-O-4`/`T-O-9` 红线。
- **[O6]** `sanitizeRichHtml` 进 worker（DOMParser 主线程专属）、`exportToS3`/btoa 卸载（低频）。

### 2.3 边界判定表

| 项目 | 判定 | 理由 | 重评条件 |
|------|------|------|----------|
| mirror `display:contents` | `in-scope` | `T-O-5` 冻结 | dev 像素对齐验证失败 → 整 Phase 回滚 |
| `highlightSource` worker | `in-scope`（仅冷启动/回退） | `T-O-7` 分态 | — |
| F9 fx 引擎 worker | `out-of-scope` | `T-O-6` 归 batch-2 | batch-2 reopen |
| `ctaWatch` 收窄到宿主锚点 | `out-of-scope` | `T-O-9` 锁定保守方案 | dev 实测 rAF 合批后仍有显著开销 → 业主再裁 |
| `renderCache` key 换短键 | `in-scope` | 中场评估 5.3 登记的实施项 | — |
| `imageIds` 持久化 | `out-of-scope` | `T-O-9` 禁持久化（schema 红线） | 永不（除非 schema 5 立项） |
| `content-visibility` 于可编辑 mirror | `out-of-scope` | `T-O-3` 禁（破坏选中测量） | 永不 |

---

## 3. 业务工作总表

| 编号 | 所属 Phase | 工作项 | 类型 | 涉及文件（file:line） | 收口目标 | 测试映射（Test-ID） | 风险 |
|------|------------|--------|------|------------------------|----------|----------------------|------|
| P0-01 | Phase 0 | perf 基线记录 | add | `lab/baseline/baseline.json` | `rp-batch-1.before` 行落盘（4 span `highlight`/`highlight-dom`/`render`/`commit` + 2 track `keystroke-input`/`draft-commit`） | `RP-T10` | low |
| P0-02 | Phase 0 | 四新 test 骨架 | add | `test/{mirror-incremental,render-worker,observation-convergence,line-tint-cap}.test.mjs` | 断言就位、先红 | `RP-T01`–`RP-T08` | low |
| P1-01 | Phase 1 | `LINE_TINT_CAP` 熔断 + `lineHtml` export | update | `src/client/highlight.js:71-121` | >4KB 行纯转义无 token span；`lineHtml` 可 import | `RP-T04` | low |
| P1-02 | Phase 1 | 双界 LRU（renderCache/peekCache） | update | `src/client/panel.js:1889-1907,1298-1302` | 条目+字节双界、单条超限拒收 | `RP-T07` | low |
| P1-03 | Phase 1 | `applyCopy`/`renderTree`/`renderTabs` 签名跳过 | update | `src/client/panel.js:1026-1044,1646-1743` | 签名相等时零 DOM 写 | `RP-T06` | low |
| P1-04 | Phase 1 | `ctaWatch` rAF 合批 | update | `src/client/panel.js:4886-4895` | N 次 mutation → 1 次 `attachNotepadCtas` | `RP-T05` | low |
| P1-05 | Phase 1 | `imageIds` 会话 `Map` + `md5Hex` 时序 | update | `src/client/db.js:268-281,304-322,504,545-557,570-636,785-795`、`src/client/panel.js:1897` | 全 `imageIdsIn` 调用点走 Map；`stampContentMd5`/`applyRemoteFiles` 加有效性门卫 | `RP-T08` | low |
| P1-06 | Phase 1 | **测试缝**：`src/client/render-support.js` 纯单元提取 | add | `src/client/render-support.js`（🆕）、`src/client/panel.js`（薄壳接） | `mirrorEdits`/`boundedCache`/`treeSignature`/`tabsSignature`/`createCoalescer`/`createRpcChannel`/`diffBlocks` 可 `import` | `RP-T01`–`RP-T03`、`RP-T05`–`RP-T09` | low |
| P2-01 | Phase 2 | mirror `display:contents` 行包装 + 脏段状态机 | refactor | `src/client/panel.js:473-476,1053-1100,1187-1230` | 增量最小 DOM 替换 + 函数内整层回退 | `RP-T01`、`RP-T02` | high |
| P2-02 | Phase 2 | `data-np-image` 扫描范围跟随 + `hideImagePeek` 适配 | update | `src/client/panel.js:1199-1203` | 增量=脏段扫、回退=全层扫 | `RP-T02` | medium |
| P3-01 | Phase 3 | markdown 块级记忆化（`Map<blockText,Element>`） | refactor | `src/client/panel.js:1884-1910`、`src/client/markdown.js:49` | 未变块节点身份保留，编辑局部重渲 | `RP-T03` | medium |
| P3-02 | Phase 3 | `content-visibility` + `renderCache` 短键 | update | `src/client/panel.js`（`.np-read` CSS + :1889 key） | `contain-intrinsic-size` 防跳；key=`file.id+md5` | `RP-T07` | low |
| P4-01 | Phase 4 | `src/worker/np-render-worker.js` 作者源 | add | `src/worker/np-render-worker.js` | 四 op 分发回包正确 | `RP-T09` | medium |
| P4-02 | Phase 4 | `build-client.mjs` 第二入口 + `renderWorker` 调度层 | update | `scripts/build-client.mjs`、`src/client/panel.js`、`src/client/render-support.js` | `lib/fx/np-render-worker.mjs` 非空产出；构造失败/`onerror`/**超时**回本地（T-O-7 全口径） | `RP-T09` | low |
| P4-03 | Phase 4 | 调用接入（markdown/jsonRender/jsonValidate/highlight 冷启动） | update | `src/client/panel.js:1187-1203,1809-1820,1864-1871,1901,4339-4356` | 接入点走 worker + `renderToken`/requestId/`currentId`+paint 序号守卫 | `RP-T09` | medium |
| P5-01 | Phase 5 | 全量测试 + after 基线 | update | `test/`、`lab/baseline` | §8 台账全 PASS；after 行落盘 | `RP-T10` | low |
| P5-02 | Phase 5 | 版本/文档/合并 | update | `package.json`、`AGENTS.md`、`README.md`、spec | `0.3.0`；`lib/fx/` 行更新；spec `frozen`；worktree 合并 | `RP-T11`+`RP-T14` | low |

---

## 4. Phase 业务表格

### 4.1 Phase 0 — 基线与测试脚手架

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P0-01 | perf 基线 | a) dev 实例开 `?perf-review=1` 跑「28KB 文档连续打字 60 键 + `.json` 大文件 + rendered 切换」采集 **4 span**（`highlight`/`highlight-dom`/`render`/`commit`，`declaration.json` `keys.spans`）+ **2 track**（`keystroke-input`/`draft-commit`，`keys.tracks`）的 P50/P95 → b) 落 `lab/baseline/baseline.json` **`reports['rp-batch-1.before']`** 键（沿用既有 `reports.<scenario>` 形状：`version`/`meta`/`contributors` + commit sha + 环境注记；`note` 字段留作 `RP-T13` 人工验收留痕落点） | `lab/baseline/baseline.json` | before 基线可回查 | `RP-T10` | 基线键含 4 span+2 track 数值 + sha |
| P0-02 | test 骨架 | a) 建 `test/mirror-incremental.test.mjs`（`computeMirrorEdits` op 流 + CSS 文本断言）、`test/render-worker.test.mjs`（**真源 `handleMessage` import + 注入传输 stub**，非复制本地实现）、`test/observation-convergence.test.mjs`（纯逻辑签名/LRU/Map + 文件文本断言段）、`test/line-tint-cap.test.mjs` → b) 断言按 §8.1 写好，实现未动先红 | `test/` 四新文件 | 红灯起步防假绿 | `RP-T01`–`RP-T08` | `node --test` 报预期失败而非语法错 |

### 4.2 Phase 1 — 立取项（观测收敛 + 缓存边界 + 熔断 + 时序）

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P1-01 | 熔断 + export | a) `export const LINE_TINT_CAP = 4_096` → b) `lineHtml`/`inlineMd`/`inlineJson` 加 export，并抽出 `export function isFenceLine(line) { return line.trimStart().startsWith('```'); }`（`highlight.js:79` 现行 `/^```[\w-]*\s*$/` 替换为该谓词，供 mirror inFence 共用——单一真源）；`lineHtml` 内 `line.length > LINE_TINT_CAP` 直接 `s('nm-code' 或 escapeHtml)` 纯转义短路（不进 regex）→ c) `highlightSource` 循环改调 `lineHtml`（同一实现） | `src/client/highlight.js:71-121` | >4KB 行零 regex 成本 | `RP-T04` | `lineHtml`/`isFenceLine` 可 `import`；5KB 行输出无 `nm-*` token span |
| P1-02 | 双界 LRU | a) `renderCache`/`peekCache` 每项存 `{value, size}`（`size` = HTML/dataURL `length`）→ b) `set` 时累计字节超界（32MB/40MB）从 `Map` 迭代序逐最旧到下界 → c) 单条 `size > 界` 拒收（`lruCache.ts:26-28` 同构） | `src/client/panel.js:1889-1907,1298-1302` | 字节有界 | `RP-T07` | 双界逐出/拒收断言过 |
| P1-03 | 签名跳过 | a) `applyCopy` 存 `lastLocale`（`language.current()`，`panel.js:1019`），相等 return → b) `renderTree` 头部算签名 = `nodes.map(n => n.id+n.name+n.kind+n.pinned+n.parentId+n.workspaceId+n.cat+n.rejectCount+n.draftStatus+JSON.stringify(n.via)).join() + kindFilter() + [...state.collapsed].sort().join()`（树实际消费字段 `:1646-1690` 实证：cat badge title 含 `via` 摘要与 `×rejectCount`、kind 决定图标，`kind`/`via`/`rejectCount`/`draftStatus` 漏签会 stale；`collapsed` Set 排序保证序稳定）→ c) `renderTabs` 签名 = `state.ui.tabs.join() + state.ui.currentId + tabs.map(id => nodeMap.get(id)?.name).join()`（tabs 只读 name+active） | `src/client/panel.js:1026-1044,1646-1743` | 签名相等零 DOM 写 | `RP-T06` | 断言 `innerHTML` 未写 + 反向用例「仅 `rejectCount` 变 → 签名变 → 写」 |
| P1-04 | ctaWatch 合批 | a) `MutationObserver` 回调改为「收集 `addedNodes` 进 `pending[]` + `requestAnimationFrame` 内统一 `attachNotepadCtas` 一次」→ b) `disposers` 注销不变 | `src/client/panel.js:4886-4895` | N 次 mutation → 1 次处理 | `RP-T05` | 断言扫描次数 == 1 |
| P1-05 | imageIds/md5 时序 | a) 会话内 `Map<key, imageIds[]>`（key = `node.id+node.md5` 或 `version.id+version.md5`），**全部四个 `imageIdsIn` 调用点**先查 Map、miss 才正则：`commitVersion`（`db.js:593`）、`pruneImages`（`db.js:629`）、`deleteNodes`（`db.js:552`）、`renderBody`（`panel.js:1897`，worker 化后该点改在占位符回填阶段用）——实现缝 = render-support.js `cachedImageIds(cache, key, md, scan)`，**`scan`/`digest` 以参数注入**（ESM import 绑定无法 spy，注入是 `node:test` 唯一计数缝）→ b) `stampContentMd5` 两个循环（nodes `:312` 与 versions `:318`）加 `^[a-f0-9]{32}$` 有效性门卫（`db.js:280` `sanitizeNodes` 已有同款守卫，此处是补齐而非新增）；`applyRemoteFiles`（`db.js:791`）在 `node.md5` 无有效值时才重算 → c) `saveDraft`/`commitVersion`/`createNode` 内「内容真变则必算」的 `md5Hex`（`db.js:366,585,645`）保留不动（契约需要，不是浪费） | `src/client/db.js:268-281,304-322,504,545-557,570-636,785-795`、`src/client/panel.js:1897`、`src/client/render-support.js` | 全库重扫/无门卫重算消失 | `RP-T08` | 注入计数 `scan`/`digest` stub，断言底层调用次数归零增长 |
| P1-06 | **测试缝提取** | a) 新建 `src/client/render-support.js`（纯函数、DOM-free、可 `import`）——`panel.js` 仅 `mountNotepad` 一个 export（`:943`），`paintMirror`/`renderTree`/`ctaWatch`/`applyCopy` 全是依赖 `document`/`MutationObserver`/`rAF` 的闭包，无 DOM 环境下不可实例化，`T-O-11` 又禁 jsdom/Playwright → **不提取则 §8 全部断言物理不可写**（审查 BLOCKER）。提取单元：① `computeMirrorEdits(prevLines, nextLines, lineHtml)` → `{mode:'inc'\|'full', lo, hi, writes, inserts, removes}`（前后缀求脏段 + `isFenceLine` 推进 + 边界下延 + `dirtyCount > max(100,N×0.5)` 判 `mode:'full'`）；② `boundedCacheOps(map, entry, {maxEntries, maxBytes})` → `{ops:[{set,key}], evict:[…keys], reject:bool}`；③ `treeSignature(nodes, kindFilter, collapsed)` / `tabsSignature(tabs, currentId, nodeMap)` → string；④ `createCoalescer(schedule, flush)`（MutationObserver→rAF 合批的注入式纯逻辑，`schedule`/`flush` 由宿主注入）；⑤ `createRpcChannel({postMessage, onReply, timeoutMs, callLocal})`（requestId 单调/乱序丢弃/超时回本地/terminate 语义，worker 传输对象注入）；⑥ `diffBlocks(prevSeq, nextSeq, reuse)`（markdown 块记忆化 diff，返回复用映射）→ b) `panel.js` 各改造点薄壳化：`paintMirror` = `computeMirrorEdits` → DOM 执行器（`insertBefore`/`replaceChildren`/`children[i].innerHTML`）；签名/LRU/合批/RPC 同理接 | `src/client/render-support.js`（🆕）、`src/client/panel.js:1187-1230,1889-1907,1646-1743,4886-4895` | 全部新断言可达纯单元 | `RP-T01`–`RP-T03`、`RP-T05`–`RP-T09` | `import { computeMirrorEdits } from '../src/client/render-support.js'` 在 `node --test` 下可用 |

### 4.3 Phase 2 — mirror 增量 DOM（`display:contents`）

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P2-01 | mirror 结构 + 脏段 | a) `state.mirrorLines: {text,html,inFence}[]` 初始化（随 `state.ui.currentId` 绑定，切文件即弃；**单一状态**——`inFence` 已随行存储，不再另设 `mirrorFence` 数组防双份漂移） → b) `paintMirror`：新旧 `lines[]` 求公共前后缀得脏段 `[lo,hi)`；`inFence` 用 **`line.trimStart().startsWith('```')`** 逐行推进（T-O-8，非 `indexOf`、非正则；与 `lineHtml` 的 fence 判定共用同一谓词 **`isFenceLine`**——`highlight.js:79` 现行 `/^```[\w-]*\s*$/` 替换为该谓词，消除双判据）；`inFence[hi]` 变则脏段下延至行尾 → c) 行数变：脏段边界 `insertBefore`/`replaceChildren` 行包装；行数不变：逐行 `html` 比对、变才 `layer.children[i].innerHTML = html` → d) `dirtyCount > max(100, totalLines×0.5)` 或文件切换/结构异常 → 函数内整层 `innerHTML` 回写（T-O-5 单分支） → e) `.np-mirror span` 追加 `display:contents`；行间 `\n` 裸文本节点 | `src/client/panel.js:473-476,1053-1100,1187-1230`、`src/client/highlight.js:79` | 单行编辑 = 一次 `children[i].innerHTML` 写 | `RP-T01`、`RP-T02` | 结构断言过 + dev 像素对齐人工验收（wrap on/off、空行、ZWSP、长行、fence 嵌套） |
| P2-02 | 图片扫描范围 | a) `imageTokens`（`panel.js:1199`）维持**全集**命中表语义（`imageTokenAt` `:1245/:1333` 遍历全部 span 做 rect 命中）：增量路径 = **未变段既有 span 引用保留**（DOM 未重建，rect 仍有效）+ **脏段新扫补充**；整层回退分支 = 全层重扫 → b) `hideImagePeek` 逻辑不变 | `src/client/panel.js:1199-1203,1245,1333` | 未变行图片 hover 不失效 | `RP-T02` | 断言 `imageTokens` = 未变段旧 span（引用不变）∪ 脏段新 span |

### 4.4 Phase 3 — 预览记忆化 + `content-visibility` + `renderCache` 短键

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P3-01 | 块级记忆化 | a) `renderMarkdown` 增加可选返回/接入层「块清单」能力（块=标题/段落/列表/表格/fence 单元的 `{text, html}` 序列，worker 侧已能产出同款结构）→ b) 主线程 `state.previewBlocks: Map<blockText, Element>`，渲染时按块键复用 `Element` 或重建 → c) 前缀/后缀 diff 块序列，未变块 `Element` 原样插回（节点身份保留，滚动/选区不跳） | `src/client/panel.js:1884-1910`、`src/client/markdown.js:49-150` | 未变块 DOM 不重建 | `RP-T03` | 断言未变块 `Element` 身份相等 |
| P3-02 | visibility + 短键 | a) `.np-read` 顶层块元素加 `content-visibility:auto; contain-intrinsic-size: auto 2em`（scrollbar 不跳）→ b) `renderCache` key 由 `${file.id}${imageEpoch}${markdown}` 改为 `${file.id}${imageEpoch}${file.md5 ?? md5Hex(markdown)}`——**优先复用既有 `node.md5`**（落库契约字段，随 `commitVersion`/`saveDraft` 维护），仅无 md5 时才现算（消全文进 key 的 O(文档) key 构造，且不新增每帧 md5 成本） | `src/client/panel.js`（CSS 模板 + :1889-1907） | key O(1) 常量 | `RP-T07` | 断言 key 不含全文、双界仍生效 |

### 4.5 Phase 4 — `np-render-worker` + 构建接入

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P4-01 | worker 源 | a) `src/worker/np-render-worker.js`：`import { highlightSource, lineHtml } from '../client/highlight.js'`、`import { validateJson, renderJsonTree } from '../client/json.js'`、`import { renderMarkdown, escapeHtml } from '../client/markdown.js'`（`esc` 由 worker 端自 import——函数不可 structured-clone）→ b) **导出 `handleMessage(msg, post)` 纯分发** + `if (typeof self !== 'undefined') self.onmessage = e => handleMessage(e.data, m => self.postMessage(m))` 自注册（`node:test` 可直接 import `handleMessage` 驱动真分发，不留「测试直调函数、worker 分发不被测」盲区）；op ∈ `highlight|jsonValidate|jsonRender|markdown` → c) 回包：`highlight`→`{id,ok,html}`；`jsonValidate`→`{id,ok,valid,pos,message}`；`jsonRender`→`{id,ok,valid,pos,message,html}`（单次 parse 两消费：badge+树）；`markdown`→`{id,ok,html}`；异常回 `{id,ok:false,error}` → d) `jsonRender` payload = `{text, collapsed:[ids…]}`（`Set` 转数组，worker 内 `new Set` 重建 + `validateJson` 解析后 `renderJsonTree(parsed.value, collapsedSet, escapeHtml)`）；`markdown` 用 `new Map()` 空 images 产 `notepad-image:` 占位 HTML（大图不进 worker） | `src/worker/np-render-worker.js` | 四 op 回包正确且真分发被测 | `RP-T09` | `handleMessage` 直接打 `{id,op,payload}` 断言回包 |
| P4-02 | 构建 + 调度层 | a) `build-client.mjs` 尾部 `build({ entryPoints:['src/worker/np-render-worker.js'], bundle:true, format:'esm', platform:'browser', outfile: join(root,'lib/fx/np-render-worker.mjs') })` → b) `src/client/panel.js` 加 `renderWorker` 薄封装：懒 `new Worker('/nano-notepad/fx/sdk/np-render-worker.mjs',{type:'module'})`，RPC 内核复用 `P1-06` 的 `createRpcChannel`——requestId 单调、乱序/不匹配 id 丢弃、**超时（~2s）回 `callLocal`**、构造失败/`onerror` → `callLocal` 兜底（T-O-7「超时回退本地」全口径，不得只写 onerror）；面板 destroy `terminate()` | `scripts/build-client.mjs`、`src/client/panel.js`、`src/client/render-support.js` | `lib/fx/np-render-worker.mjs` 非空；fallback 生效 | `RP-T09` | build 产物存在且协议可用 |
| P4-03 | 调用接入 | a) `renderBody` markdown 分支：`renderMarkdown` 换 `await renderWorker.call('markdown',{markdown})`（在既有 `await imagesById` 后、`renderToken` 守卫内），返回含 `notepad-image:` 占位 `src` 的 HTML，注入 DOM 后统一 `querySelectorAll('[src^="notepad-image:"]')` 回填 `images` data URL → b) `.json` 全链路走 worker：`renderBody` 的 badge 校验（`panel.js:1809-1820`）与树渲染（`:1864-1871`）合并为单次 **`jsonRender`** 调用（payload `{text, collapsed:[ids…]}`，worker 内 `validateJson`+`renderJsonTree` 一次返回 `{valid,pos,message,html}`，避免 value 二次克隆）；每键 lint（`panel.js:4339-4356`）改 `jsonValidate` 调用（payload `{text}` → `{valid,pos,message}`），rAF 合批 + requestId 只认最新应答再写 badge → c) `paintMirror` 整层回退/冷启动分支：`highlightSource` 全文换 `await renderWorker.call('highlight',{text,json,mode})`，**应答过 `state.ui.currentId`+paint 序号双键陈旧守卫**（过期即弃不写 `layer`，防旧文本染色盖新）；逐键脏段保持主线程 `lineHtml` 同步 | `src/client/panel.js:1187-1203,1809-1820,1864-1871,1901,4339-4356` | `.json` 全链路零主线程 parse | `RP-T09` | dev 实测 `.json` 连续输入 badge/树无 parse 尖峰；`jsonRender`/`jsonValidate` 回包字段完整 |

### 4.6 Phase 5 — 收口

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P5-01 | 全量测试 + after | a) `rm -f lib/fx/np-render-worker.mjs && npm run build`（先删后建防陈旧）→ b) `node --test` 全量（13 既有 + 4 新）→ c) dev 实例人工验收 §10.1 项（留痕进基线 note）→ d) `reports['rp-batch-1.after']` 键落盘 | `test/`、`lib/`、`lab/baseline/baseline.json` | §8 台账全 PASS | `RP-T10` | 四元组证据齐 |
| P5-02 | 版本/文档/合并 | a) `package.json` → `0.3.0` → b) `AGENTS.md` 交付物表 `lib/fx/` 行更新（`vendored + 构建产出 render worker`）、`README.md` 加本批功能行 → c) `render-pipeline-1121.md` 状态 `frozen` + §9 标已裁 + §4.2 batch-2 注「待 reopen」 → d) worktree 合 `main`，按业主要求删 worktree | `package.json`、三份文档、`.agents/worktrees/` | 文档与产物单一真源 | `RP-T11`+`RP-T14` | `git log` 合并提交 + 文档 diff 人工核对 |

---

## 5. Phase 详情

### 5.1 Phase 0 — 基线与测试脚手架

- **Phase 目标**：为所有改动建立可证伪的 before/after 与防假绿基座。
- **本 Phase 对应编号**：`P0-01` / `P0-02`
- **本 Phase 新增文件**：`test/mirror-incremental.test.mjs`、`test/render-worker.test.mjs`、`test/observation-convergence.test.mjs`、`test/line-tint-cap.test.mjs`
- **本 Phase 修改文件**：`lab/baseline/baseline.json`（仓根）
- **具体功能预期**：
  1. 基线行含 `declaration.json` 内 **4 span**（`highlight`/`highlight-dom`/`render`/`commit`）+ **2 track**（`keystroke-input`/`draft-commit`）的 P50/P95 数值 + `main@` sha + 环境注记（实例/浏览器/样本文档描述）。
  2. 四个 test 文件以「预期失败」起步（断言写实现尚未落地），防止「写完实现再补绿」。
  3. `nue-migration` 等 13 个既有 suite 全程不受影响（本 Phase 零改动）。
- **对应测试台账项**：`RP-T10`（基线）、`RP-T01`–`RP-T08`（骨架）
- **收口标准**：基线行存在且 4 span+2 track 有值；四 test 文件 `node --test` 报断言失败而非加载错（骨架允许 `import` 失败红——`render-support.js` 在 P1-06 才落地）。
- **本 Phase 风险提醒**：基线采集依赖 dev 实例可用与 perf-review 已接入（`perf.js` `ensurePerfReview` 已就位），无新依赖。

### 5.2 Phase 1 — 立取项

- **Phase 目标**：把全部「改一处、零结构风险」的小项一次收编，并让行级纯函数 export 就位。
- **本 Phase 对应编号**：`P1-01`–`P1-06`
- **本 Phase 新增文件**：`src/client/render-support.js`（纯单元测试缝，`node:test` 唯一可达面——`panel.js` 仅 `mountNotepad` 一个 export，`T-O-11` 禁 jsdom）
- **本 Phase 修改文件**：`src/client/highlight.js`、`src/client/panel.js`（LRU/签名/ctaWatch/薄壳化）、`src/client/db.js`（imageIds/md5）
- **具体功能预期**：
  1. `lineHtml`/`inlineMd`/`inlineJson`/`isFenceLine` 带 `LINE_TINT_CAP` 熔断 export，`highlightSource` 走同一 `lineHtml`（非第二实现）；`isFenceLine` = `line.trimStart().startsWith('```')` 替换 `highlight.js:79` 正则，为 mirror inFence 唯一判据。
  2. `renderCache`/`peekCache` 加 `size` 字段双界逐出/拒收（`boundedCacheOps` 实现于 render-support.js）。
  3. `applyCopy`/`renderTree`/`renderTabs` 签名相等即 return 零 DOM 写（`treeSignature` 字段 = `id+name+kind+pinned+parentId+workspaceId+cat+rejectCount+draftStatus+JSON.stringify(via)`——`:1646-1690` 实证消费面；`collapsed` Set `.sort().join()` 序稳定；`tabsSignature` = tabs+currentId+name）。
  4. `ctaWatch` mutation 收集 + rAF 合批（`createCoalescer`，schedule/flush 注入式）。
  5. `imageIds` 会话 `Map`（key 含 md5）覆盖**四个** `imageIdsIn` 调用点（`db.js:593/629/552` + `panel.js:1897`）；`stampContentMd5`/`applyRemoteFiles` 补 `^[a-f0-9]{32}$` 有效性门卫（`sanitizeNodes:280` 已有，不重复做）。
  6. `render-support.js` 六个纯单元就位：`computeMirrorEdits`/`boundedCacheOps`/`treeSignature`+`tabsSignature`/`createCoalescer`/`createRpcChannel`/`diffBlocks`——全部 DOM-free、注入式，为 §8 全部断言与 P2–P4 薄壳的共同真源。
- **对应测试台账项**：`RP-T04`–`RP-T08`
- **收口标准**：四断言全过；`nue-migration` 等 13 suite 不红。
- **本 Phase 风险提醒**：`renderTree`/`renderTabs` 的 rAF 内 `scrollWidth`/`clientWidth` 布局读是「签名相等跳过」后**顺带消掉**的成本（sig 相等连 rAF 回调里的测量也不执行），勿画蛇添足。

### 5.3 Phase 2 — mirror 增量 DOM

- **Phase 目标**：`paintMirror` 帧成本 O(文档) → O(脏段)，DOM 结构单轨硬切。
- **本 Phase 对应编号**：`P2-01` / `P2-02`
- **本 Phase 修改文件**：`src/client/panel.js:473-476,1053-1100,1187-1230`、`src/client/render-support.js`（`computeMirrorEdits`）
- **具体功能预期**：
  1. `.np-mirror` DOM = N 个 `display:contents` `<span data-l>` + N-1 个 `\n` 裸文本节点。
  2. `state.mirrorLines`（单份，`inFence` 随行）状态机：`computeMirrorEdits`（render-support.js）前后缀定脏段、`isFenceLine` 推进 inFence、**fence 切换行以下整体重染下延**（T-O-8 冻结断言，必测）。
  3. 脏段内逐行 `html` 比对，变才写 `children[i].innerHTML`；行数变化在边界插删行包装（DOM 执行器是 panel.js 薄壳，op 流由纯单元产出）。
  4. `dirtyCount > max(100, N×0.5)`、文件切换、结构异常 → `mode:'full'` 函数内整层 `innerHTML` 回写（T-O-5 单分支；T-O-8 冻结断言，必测）。
  5. 行间 `\n` 为裸文本节点，换行语义与现状逐字节等价。
  6. `data-np-image` 扫描跟 DOM 重建范围（增量=脏段新扫 + **未变段旧 span 引用保留**——`imageTokens` 须维持全集，供 `imageTokenAt` hover 命中；回退=全层重扫）。
  7. 逐键路径零 postMessage（染色本帧到，T-O-7）。
  8. **mirror 异步分支陈旧守卫**：整层回退/冷启动的 worker `highlight` 应答须过 `state.ui.currentId` + paint 序号双键校验，过期即弃不写 `layer`（与 ⛔12 自洽；`renderBody` 内 `:1840`/`:1851` 两处同步 `paintMirror` 直调在该分支异步化后染色落下一帧，`fitMirror`/scroll restore 先于染色执行——属可接受的「先布局后着色」，登记为预期时序）。
- **对应测试台账项**：`RP-T01`、`RP-T02`
- **收口标准**：结构断言过 + dev 人工验收五类样本像素对齐 + `highlight-dom` span 在 after 基线降一个数量级。
- **本 Phase 风险提醒**：`display:contents` 跨浏览器等价性是唯一真实不确定项——dev 实例（Chromium）必验；若 Firefox/WebKit 有差异属宿主运行时差异，当前三实例均 Chromium 系不构成阻塞但需登记。

### 5.4 Phase 3 — 预览记忆化

- **Phase 目标**：markdown 预览未变块不重建 DOM + `renderCache` key 短键化 + `content-visibility`。
- **本 Phase 对应编号**：`P3-01` / `P3-02`
- **本 Phase 修改文件**：`src/client/panel.js:1884-1910` + `.np-read` CSS、`src/client/markdown.js`（块清单能力）
- **具体功能预期**：
  1. `renderMarkdown` 提供块级产物（`{text,html}` 序列），主线程 `state.previewBlocks: Map<blockText,Element>`。
  2. 前后 markdown 块序列 diff（前缀/后缀），未变块 `Element` 原样插回 `.np-read-body`（节点身份保留）。
  3. `.np-read` 顶层块 `content-visibility:auto; contain-intrinsic-size:auto 2em`。
  4. `renderCache` key = `${file.id}${imageEpoch}${file.md5 ?? md5Hex(markdown)}`（优先既有 `node.md5`，不新增每帧 md5 成本）。
  5. `.json` 预览不在块级记忆化范围（整块重建即可，worker 卸载后成本低）。
- **对应测试台账项**：`RP-T03`、`RP-T07`
- **收口标准**：断言未变块 `Element` 身份相等；key 断言不含全文。
- **本 Phase 风险提醒**：`renderMarkdown` 的块划分与 `markdown.js` 现有逐行 parse 有耦合，块清单能力应做成「可选返回字段」而非改默认输出，避免牵动 `.json`/richHtml 分支。

### 5.5 Phase 4 — render worker + 构建

- **Phase 目标**：四项纯函数 O(文档) parse 移出主线程，构建接入零扩约。
- **本 Phase 对应编号**：`P4-01`–`P4-03`
- **本 Phase 新增文件**：`src/worker/np-render-worker.js`、`lib/fx/np-render-worker.mjs`（构建产物）
- **本 Phase 修改文件**：`scripts/build-client.mjs`、`src/client/panel.js`（调度层+三接入点）、`src/client/render-support.js`（`createRpcChannel` 消费方）
- **具体功能预期**：
  1. worker `import` 与主线程同一 `highlight.js`/`json.js`/`markdown.js`（零第二实现）。
  2. `{id,op,payload}` 协议：导出 `handleMessage` 纯分发 + `self.onmessage` 自注册；op ∈ `highlight`/`jsonValidate`/`jsonRender`/`markdown`，异常 `{ok:false,error}`；`jsonRender` 回 `{valid,pos,message,html}`、`jsonValidate` 回 `{valid,pos,message}`（lint badge 数据不留协议外）。
  3. markdown 占位符协议（`new Map()` 空 images）+ 主线程注入后统一 `querySelectorAll('[src^="notepad-image:"]')` 回填 data URL。
  4. `renderWorker` 懒构造 + `createRpcChannel`（requestId 单调 + 乱序丢弃 + **超时~2s 回 `callLocal`** + 构造失败/`onerror` 兜底 + destroy `terminate()`——T-O-7 全口径）。
  5. `.json` 全链路：badge 校验（`:1809-1820`）+ 树渲染（`:1864-1871`）合并单次 `jsonRender` 调用（payload `{text, collapsed:[ids…]}` 数组——`Set`/函数不可 structured-clone，`esc` 由 worker 端自 `import escapeHtml`）；每键 lint（`:4339-4356`）走 `jsonValidate`（rAF 合批 + 只认最新应答写 badge）；markdown 在 `await imagesById` 后；`paintMirror` 仅整层回退/冷启动走 worker（`currentId`+paint 序号双键守卫）、逐键脏段主线程 `lineHtml`。
  6. `renderToken`/requestId 双重守卫，切文件/快速输入作废旧任务（含 worker 异步应答的过期丢弃）。
- **对应测试台账项**：`RP-T09`
- **收口标准**：build 产物非空 + 协议断言过 + dev 实测 `.json` 连续输入无 parse 尖峰。
- **本 Phase 风险提醒**：`renderMarkdown` worker 化使 `.md` 渲染变 async（现状 `renderBody` 本就 `await`，接入点在既有 await 之后、守卫之内，零新增竞态面）；richHtml/`sanitizeRichHtml` 分支保持同步主线程不变。

### 5.6 Phase 5 — 收口

- **Phase 目标**：全台账 PASS、版本/文档/合并收口。
- **本 Phase 对应编号**：`P5-01` / `P5-02`
- **本 Phase 修改文件**：`package.json`、`AGENTS.md`、`README.md`、`render-pipeline-1121.md`
- **具体功能预期**：
  1. `node --test` 全量绿 + `npm run build` 产物非空。
  2. after 基线键（`reports['rp-batch-1.after']`，同 4 span+2 track + sha + `note` 留人工验收痕）。
  3. `0.3.0` + `AGENTS.md` `lib/fx/` 行 + `README.md` 功能行 + spec `frozen`/`§9 已裁`/`§4.2 编号保留`。
  4. worktree `rp-batch-1-render-pipeline` 合 `main`，按业主要求删。
- **对应测试台账项**：`RP-T10`、`RP-T11`
- **收口标准**：§10 收口映射表全绿 + 文档与产物一致。

---

## 6. 依赖的冻结设计决策（只读引用）

| 决策 / Q ID | 冻结来源 | 本计划中的影响 | 若不成立的处理 |
|-------------|----------|----------------|----------------|
| `T-O-1` | `RP-batch-1-qna.md` | 范围锁定 `dsh-nano-notepad`、零功能新增、schema 4 冻结 | 阻塞本 AP |
| `T-O-2` | 同上 | 全部改动在 `.np-*` 自有 DOM，零宿主嫁接 | 阻塞本 AP |
| `T-O-3` | 同上 | 增量+异构优先、GPU 否决、量化验收 | 阻塞本 AP |
| `T-O-4` | 同上 | 单轨不双写、缓存即凭证 | 阻塞本 AP |
| `T-O-5` | 同上 | P2 mirror `display:contents` + 函数内回退 | P2 整 Phase 回滚、AP `partial`（R0 已否决，无替代交付） |
| `T-O-6` | 同上 | P4 worker 静态资产 + F9 出批 | 阻塞 P4 |
| `T-O-7` | 同上 | worker 分态调度 + 协议 + 占位符 | 阻塞 P4 |
| `T-O-8` | 同上 | `LINE_TINT_CAP`/`isFenceLine`（`startsWith`）/回退线 | 阻塞 P2 |
| `T-O-9` | 同上 | P1 ctaWatch/签名/LRU/imageIds | 阻塞 P1 |
| `T-O-10` | 同上 | P4 构建 + `0.3.0` + worktree + AGENTS 同步 | 阻塞 P4/P5 |
| `T-O-11` | 同上 | §8 测试矩阵 + 基线 + 人工验收 | 阻塞 §8 |
| `T-O-12` | 同上 | spec `frozen` + 唯一 plan + batch-2 编号保留 | 阻塞 P5 |

---

## 7. 内置 Reference-Anchor 锚区

### 7.1 锚表（本计划工作要落在哪些既有代码 / 新建点上）

| 锚 ID | `path:line` | 落点（这是什么）| 本 AP 用途（对应工作项）| 处置 | 备注 |
|-------|-------------|------------------|--------------------------|------|------|
| A-1 | `dsh-nano-notepad/src/client/highlight.js:71-121` | `lineHtml`/`inlineMd`/`inlineJson`/`highlightSource`（纯函数，行级已天然） | `P1-01` export+熔断+`isFenceLine`；`P2-01` 行级入口；`P4-01` worker import | `✅ 复用` | `lineHtml` 未 export，`:79` fence 正则改共享谓词 |
| A-2 | `dsh-nano-notepad/src/client/panel.js:473-476` | `.np-mirror` CSS（`pointer-events:none`、span `font:inherit` 重置） | `P2-01` 加 `display:contents` | `✅ 复用` | 纯表现层，无事件无焦点，DOM 结构对功能透明 |
| A-3 | `dsh-nano-notepad/src/client/panel.js:1053-1100` | `state` 定义（`collapsed:Set`、`renderCache:Map`、`jsonCollapsed:Map`…） | `P2-01` 加 `mirrorLines`（inFence 随行，单份）；`P3-01` 加 `previewBlocks` | `✅ 复用` | — |
| A-4 | `dsh-nano-notepad/src/client/panel.js:1187-1230` | `paintMirror`/`schedulePaintMirror`/`fitMirror` | `P2-01` 核心改造 | `♻️ 重 substrate` | 函数体内单分支回退（T-O-5）；`schedulePaintMirror`/`fitMirror` 不动 |
| A-5 | `dsh-nano-notepad/src/client/panel.js:1199-1203,1245,1332-1345` | `data-np-image` `querySelectorAll` + `imageTokens` 声明（`:1245`）+ `imageTokenAt` hover 命中 + `hideImagePeek` | `P2-02` 扫描范围（全集语义） | `✅ 复用` | `imageTokens` 是 hover 命中全集，非可丢子集 |
| A-6 | `dsh-nano-notepad/src/client/panel.js:1026-1051` | `applyCopy`（`[data-i18n]` 遍历，`paintStatus` 尾） | `P1-03` locale 签名 | `✅ 复用` | `language.current()` 真源在 `panel.js:1019` `text()` |
| A-7 | `dsh-nano-notepad/src/client/panel.js:1646-1746` | `renderTree`/`renderTabs`（含 rAF 内布局读 + fx reject badge :1684-1690） | `P1-03` 签名跳过 | `✅ 复用` | `expanded = !state.collapsed.has(id)`（:1669）；签名含 `rejectCount`/`via` |
| A-8 | `dsh-nano-notepad/src/client/panel.js:1761-1910` | `renderBody` 全体（lint badge :1809-1820、`.json` :1864-1871、markdown :1884-1907） | `P3-01`/`P3-02`/`P4-03` | `✅ 复用` | :1897 `await imagesById` + :1898 `renderToken` 守卫现成 |
| A-9 | `dsh-nano-notepad/src/client/panel.js:4886-4895` | `attachNotepadCtas` + `ctaWatch` MutationObserver | `P1-04` rAF 合批 | `✅ 复用` | `document.body` 观察目标不变（T-O-9） |
| A-10 | `dsh-nano-notepad/src/client/db.js:268-281,304-322,504,545-557,570-636,785-795` | `sanitizeNodes`/`stampContentMd5`/`imageIdsIn`/`deleteNodes`/`commitVersion`/`saveDraft`/`pruneImages`/`applyRemoteFiles` | `P1-05` `imageIds` Map + md5 时序 | `✅ 复用` | `imageIdsIn` 真实调用点 `:593/:629/:552`；`:280` md5 守卫已有 |
| A-11 | `dsh-nano-notepad/src/client/panel.js:1242-1302,1889-1907` | `peekCache`/`renderCache`（Map + 条目数界） | `P1-02`/`P3-02` 双界 + 短键 | `✅ 复用` | key 含全文 :1889 待换 |
| A-12 | `dsh-nano-notepad/src/client/markdown.js:49-150` | `renderMarkdown`（逐行 parse，`images` Map） | `P3-01` 块清单能力；`P4-01` worker import | `♻️ 重 substrate` | 块清单为可选返回字段，不改默认输出 |
| A-13 | `dsh-nano-notepad/src/client/json.js:15,218-237` | `validateJson`/`renderJsonTree` | `P4-01` worker import；`P4-03` 调用接入 | `✅ 复用` | DOM-free 纯函数 |
| A-14 | `dsh-nano-notepad/scripts/build-client.mjs` | `build()` esbuild 封装（`buildSync` 非 0 退） | `P4-02` 第二入口 | `✅ 复用` | 唯一合规产出通道 |
| A-15 | `dsh-nano-notepad/lib/bindings.js:18` | `dnn.fx.sdk` `prefix` 路由（basename serve `lib/fx/`） | `P4-01`/`P4-02` 路由事实 | `✅ 复用` | worker 落 `lib/fx/` 零新路由 |
| A-16 | `dsh-nano-notepad/src/worker/np-render-worker.js` | 将新建（worker 作者源） | `P4-01` | `🆕 净新` | 共享 `../client/*` 纯函数 |
| A-17 | `t3code` `incrementalHighlighting.ts:57-107` | stable-lines 增量 + 非前缀全量回退 | `P2-01` 算法参照 | `✅ 复用`（思想） | bare 检出 `c1464d6`，`git show` 读 |
| A-18 | `t3code` `lruCache.ts:26-28` | 双界 LRU 单条超限拒收 | `P1-02` 参照 | `✅ 复用`（思想） | 同上 |
| A-19 | `t3code` `observeIntersection.ts:27-125` / `a0ef9d8` | 共享 observer / 虚拟化破坏选区 | `P1-04`/`P2-01` 参照 | `✅ 复用`（思想） | `a0ef9d8` 是 commit 教训 |
| A-20 | `dsh-nano-notepad/src/client/render-support.js` | 将新建（纯单元测试缝） | `P1-06`；`P2-01`/`P3-01`/`P4-02` 薄壳消费方 | `🆕 净新` | 审查 BLOCKER 修复：无它则 §8 断言不可写 |
| A-21 | `dsh-nano-notepad/src/client/panel.js:4339-4356` | `input` 监听内 `.json` 每键 `validateJson` live lint | `P4-03` `jsonValidate` worker 化 | `✅ 复用` | rAF 合批 + 只认最新应答 |
| A-22 | `dsh-nano-notepad/src/client/panel.js:1809-1820` | `renderBody` lint badge（`lintResult.pos/message` + `positionOf`） | `P4-03` `jsonRender` 合并调用 | `✅ 复用` | worker 回包须含 `valid/pos/message` |

### 7.2 反例 ledger ⛔（别碰区 / 已知陷阱）

| ⛔ | 反例 / 陷阱 | 为什么（依据）|
|----|------------|----------------|
| ⛔1 | mirror 用块级 `div` 行包装 | `highlight.js:117-119` 自证「A block per line grows a different line box」——选区错位，已被否 |
| ⛔2 | mirror 行窗口虚拟化（丢窗口外 DOM） | `a0ef9d8` 虚拟化破坏拖拽选区 + `fitMirror`（`panel.js:1219-1230`）需内容真实高度对齐 textarea——丢 DOM 即破 |
| ⛔3 | `blob:`/`data:` 内联 worker | `T-O-6`：`dnn.fx.sdk` prefix 静态通道已存在，走 blob 是绕真源 + 增 CSP 变量 |
| ⛔4 | `imageIds`/`mirrorLines` 持久化进 IDB | `T-O-9`/`T-O-1`：缓存即凭证，不升格 durable 真源，schema 4 冻结 |
| ⛔5 | worker 内复制第二份 `highlightSource`/`renderMarkdown` 实现 | `T-O-6`/`T-O-4`：与主线程 `import` 同一 `src/client/*.js`，禁止双写 |
| ⛔6 | `content-visibility` 套可编辑 `.np-mirror` | `T-O-3`：破坏选中/几何测量（preview `.np-read` 可用，mirror 禁） |
| ⛔7 | `ctaWatch` 收窄观察 `[data-conversation-scroll]` 等宿主锚点 | `T-O-9`：宿主结构假设，断了静默失效；保守 `document.body`+rAF 合批已锁 |
| ⛔8 | `rev`/`version` 计数器式签名（各 mutation 点 ++） | `T-O-9`：mutation 点 20+ 漏一即脏，内容字段签名是零漏点正确性 |
| ⛔9 | 逐键脏段走 worker postMessage | `T-O-7`：脏段 tint 微秒级，postMessage ≥毫秒级，镜像染色滞后一帧劣化输入 |
| ⛔10 | `md5` etag 换算法 / `sanitizeRichHtml` 进 worker | `T-O-4`（落库契约）/ DOMParser 主线程专属 |
| ⛔11 | `lib/fx/np-render-worker.mjs` 手工写入（非构建产出） | `T-O-10`：`lib/` 产物必须经 `build()`，来源单一真源 |
| ⛔12 | `state.mirrorLines` 随切文件残留 | `T-O-5`：绑定 `state.ui.currentId`，切文件即弃，防陈旧行串味 |

### 7.3 上游真源指针 + 安全项威胁模型

- **上游真源**：`docs/specs/dsh-nano-notepad/render-pipeline-1121.md`（§1 真源核验档案 T1-T18、§4 分批、§5 mirror 方案）+ `docs/specs/dsh-nano-notepad/qna/RP-batch-1-qna.md`（`T-O-1`–`T-O-12` 生效口径）。§7.1 A-17/A-18/A-19 是 `t3code` 真源子集摘录。
- **安全 / 信任边界类工作项的威胁模型锚**：本 AP 无安全/信任边界类工作项（全部改动为 `src/client` 纯函数与 DOM 结构 + 既有 prefix 静态路由内新增一个 `.mjs`，不扩 inject/路由/凭证/error 枚举；`markdown` worker 输出经与现状相同的 `innerHTML` 路径，消毒面不变）。`np-render-worker.mjs` 落点威胁面 = `dnn.fx.sdk` 既有 `L1 static:asset` 范畴（bindings.js:18），无新增攻击面。

---

## 8. 测试台账

### 8.1 测试清单（主表）

| Test-ID | 测试项（验证什么）| 测试缝（断言落在哪个可 `import` 面）| 类型 | 层 | 来源 | 映射（工作项 → 收口目标）| PASS 证据（四元组）|
|---------|------------------|----------------------|------|----|------|---------------------------|---------------------|
| `RP-T01` | mirror 输出结构 = N `data-l` + N-1 `\n` 文本节点 | `computeMirrorEdits` op 流（`render-support.js`）+ `panel.js` CSS 文本断言 `.np-mirror span{display:contents` | `短途` | `unit` | `🆕 新增 test/mirror-incremental.test.mjs` | `P2-01 → 结构单轨` | `commit + node --test PASS + run-time` |
| `RP-T02` | 单行编辑仅脏行被写；**fence 切换行以下整体重染**；**`dirtyCount > max(100,N×0.5)` 判 `mode:'full'`**；`imageTokens` = 未变段旧 span ∪ 脏段新扫 | `computeMirrorEdits` 返回 `{mode,lo,hi,writes,inserts,removes}` 逐字段断言（T-O-8 两条冻结断言点名登记） | `短途` | `unit` | `🆕 新增 test/mirror-incremental.test.mjs` | `P2-01`/`P2-02 → 增量最小重写` | `commit + node --test PASS + run-time` |
| `RP-T03` | markdown 未变块 `Element` 身份保留（复用映射中未变块指回同一对象引用） | `diffBlocks(prevSeq,nextSeq,reuseMap)`（`render-support.js`）+ `markdown.js` 块清单可选返回字段 | `短途` | `unit` | `🆕 新增 test/observation-convergence.test.mjs`（纯 diff，无 DOM 依赖） | `P3-01 → 记忆化` | `commit + node --test PASS + run-time` |
| `RP-T04` | `lineHtml` >4KB 行无 `nm-*` token span、短行有；`isFenceLine` 与 inFence 判据同源 | `lineHtml`/`isFenceLine`（`highlight.js` export） | `短途` | `unit` | `🆕 新增 test/line-tint-cap.test.mjs` | `P1-01 → 熔断` | `commit + node --test PASS + run-time` |
| `RP-T05` | N 次 mutation → `flush` 执行次数 == 1 | `createCoalescer`（schedule/flush 注入 stub） | `短途` | `unit` | `🆕 新增 test/observation-convergence.test.mjs` | `P1-04 → rAF 合批` | `commit + node --test PASS + run-time` |
| `RP-T06` | `applyCopy`/`renderTree`/`renderTabs` 签名相等时跳过；**反向用例：仅 `rejectCount` 或 `via` 变 → 签名不等 → 不跳过** | `treeSignature`/`tabsSignature` + locale 比对逻辑（`render-support.js`） | `短途` | `unit` | `🆕 新增 test/observation-convergence.test.mjs` | `P1-03 → 签名跳过` | `commit + node --test PASS + run-time` |
| `RP-T07` | 双界 LRU 超界逐出/单条拒收；`renderCache` key 不含全文 | `boundedCacheOps`（`render-support.js`） | `短途` | `unit` | `🆕 新增 test/observation-convergence.test.mjs` | `P1-02`/`P3-02 → 缓存边界` | `commit + node --test PASS + run-time` |
| `RP-T08` | `imageIds` Map 命中不重复 `imageIdsIn`；`stampContentMd5`/`applyRemoteFiles` md5 有效不重算 | spy 包 `imageIdsIn`/`md5Hex`（`db.js` 可调，`loadSnapshot`/`commitVersion` 为纯函数链） | `短途` | `unit` | `🆕 新增 test/observation-convergence.test.mjs` | `P1-05 → 不重扫不重算` | `commit + node --test PASS + run-time` |
| `RP-T09` | 真 worker 源 `handleMessage` 分发 + `{id,op,payload}` round-trip + requestId 乱序/陈旧丢弃 + 构造失败/`onerror`/**超时**回本地 + `terminate()` 语义 | `createRpcChannel`（`render-support.js`，传输对象注入可控异步 stub 演习乱序/超时）+ **真源 import**：`import { handleMessage } from '../src/worker/np-render-worker.js'`，直接打 `{id,op,payload}` 断言回包（`jsonRender`/`jsonValidate`/`highlight`/`markdown` 四 op + 异常包） | `短途` | `unit` | `🆕 新增 test/render-worker.test.mjs` | `P4-01`/`P4-02`/`P4-03 → 协议与降级` | `commit + node --test PASS + run-time` |
| `RP-T10` | `lab/baseline/baseline.json` `reports['rp-batch-1.before'/'rp-batch-1.after']` 键存在且 4 span+2 track 有值 | `baseline.json` 读回断言（键形态沿用 `reports.<scenario>`；命名与 `declaration.json` 口径一致） | `短途` | `回归` | `🆕 新增` | `P0-01`/`P5-01 → 基线` | `commit + 基线行 + run-time` |
| `RP-T11` | `npm run build` 产 `lib/client.js` + `lib/fx/np-render-worker.mjs` 非空且**当次产物**（先删后建 or 记录 build 后 sha256，防陈旧残留假绿） | build 产物存在性 + 新鲜度断言 | `短途` | `集成` | `♻️ 沿用`（build 脚本即测试面） | `P4-02`/`P5-02 → 交付物` | `commit + build 输出 + run-time` |
| `RP-T12` | 既有 13 suite 不红（`nue-migration`/`schema-ingress`/`mp-sanitize` 等） | 既有 suite 原样运行 | `短途` | `回归` | `♻️ 沿用` | `全部 → 无回归` | `commit + node --test 全量 PASS + run-time` |
| `RP-T13` | dev 人工验收：mirror↔textarea 像素对齐五样本 + `.json` 连续输入预览无白屏 + 长文档滚动无跳（`content-visibility` 生效）+ ctaWatch 滚动无抖；「无尖峰」判据 = perf 读数中 lint/jsonRender/parse 相关 span 消失或降一档 | 验收清单留痕（人工），**留痕落点 = `lab/baseline/baseline.json` 的 `rp-batch-1` 行 note 字段** | `spike` | `live` | `🆕 新增`（验收清单，非代码） | `P2`/`P3`/`P4` → 体验红线 | `commit + 验收记录 + run-time` |
| `RP-T14` | 交付物静态断言：`package.json` version=`0.3.0`；`panel.js` CSS 文本含 `.np-read` `content-visibility:auto` 与 `notepad-image:` 回填 selector；worker `.mjs` 非 `blob:`/`data:`；`npm pack --dry-run` 输出含 `lib/fx/np-render-worker.mjs` | 文件文本读取断言（observation-convergence.test.mjs 内 `readFileSync` 文本断言段） | `短途` | `回归` | `🆕 新增` | `P3-02`/`P4-03`/`P5-02 → 交付物一致性` | `commit + node --test PASS + run-time` |

### 8.2 复用台账（沿用 / fork 的既有用例明细）

| 既有用例 | 处置 | 改动 | 起跑线状态 |
|----------|------|------|------------|
| `test/nue-migration.test.mjs` | `♻️ 沿用` | `0 改动`（零模式断言不动——`data-l`/`display:contents` 不在 ZERO_PATTERNS） | `已存在，PASS` |
| `test/schema-ingress.test.mjs` 等 12 suite | `♻️ 沿用` | `0 改动` | `已存在，PASS` |
| `npm run build`（`scripts/build-client.mjs`） | `♻️ 沿用` | `+ 第二入口`（`P4-02`） | `已存在，产物非空` |
| `./lab/baseline/baseline.json` | `🆕 新增行` | `+ rp-batch-1 before/after` | `已存在文件，本批新增键` |

### 8.3 分层与跑法（各类型在哪跑、何时跑）

| 类型 | 跑法 / 频率 | 主要层 | 触发时机 |
|------|-------------|--------|----------|
| 短途 | `node --test` 本地 / 每 Phase | `unit·集成·回归` | 开发中持续 |
| spike | dev 实例人工验收 | `live` | P2/P3/P4 收口 + P5 总收口 |
| mega | `node --test` 全量 + build | `集成` | P5 收口 |
| soak | 不设（本批无 race/长稳 deterministic 项） | `n/a` | — |

**P5 有序收口命令**（按序执行、任一失败即停不得续走）：
1. `rm -f lib/fx/np-render-worker.mjs && npm run build` —— 先删后建验当次产物（RP-T11）
2. `node --test`（13 既有 + 4 新全量）—— 全绿才续（RP-T01–RP-T09、RP-T12、RP-T14）
3. dev 实例人工验收五样本 + span 读数（RP-T13）—— 留痕进基线行 note
4. `lab/baseline/baseline.json` `rp-batch-1.after` 行落盘（RP-T10）
5. 版本/文档同步 + worktree 合 `main`（RP-T14 + §9.3）

### 8.4 测试缺口（本 AP 明确不覆盖什么 + 交给谁）

- 不覆盖 **`display:contents` 在 Firefox/WebKit 的像素级 layout 等价**（三实例均 Chromium 系，jsdom 无 layout）→ 交 dev 人工验收（Chromium）+ 登记为已知边界（若未来宿主扩浏览器矩阵再评）。
- 不覆盖 **DOM 级 `Element` 身份保留**（`node:test` 无 DOM；`RP-T03` 测 `diffBlocks` 纯函数复用映射/token 身份，DOM 节点身份交 `RP-T13` 人工验收的「滚动/选区不跳」体验项）——已分流不假装覆盖。
- 不覆盖 **worker 在严格 CSP `worker-src` 受限宿主的行为**（当前 dsh 宿主无该限制，且 T-O-7 已内嵌构造失败 fallback）→ 交 batch-2 / 宿主 CSP 变更时再评。
- 不覆盖 **F9 引擎 worker 化的一切** → 归 batch-2。

### 8.5 测试保真（防假绿 · 刻死）

- ✅ 每个 PASS 必带四元组（commit + test 名 + run-time + 证据）；计数 ≠ 价值。
- ✅ **测试缝可达性闸**：§8.1 每行必须先回答「断言落在哪个可 `import` 面」（测试缝列）——`panel.js` 闭包物理不可达、禁 jsdom，凡断言对象无对应 `render-support.js`/`highlight.js`/`db.js` 纯单元者即假绿温床，禁止写。
- mirror 断言必须**断言 op 流形态**（`computeMirrorEdits` 返回的 `{mode,lo,hi,writes,inserts,removes}` 逐字段值 + CSS 文本断言 `display:contents`），不接受「跑通不报错」当绿——`paintMirror` 的假绿形态是「增量路径没走通、默默走了整层回退」，断言必须显式区分 `mode:'inc'` 与 `mode:'full'` 两条路径，且点名覆盖 T-O-8 两条冻结断言（fence 切换下延 + `> max(100,N×0.5)` 判 full）。
- worker 断言必须**断言回包内容正确**（`html`/`tree`/`valid`/`pos`/`message` 字段形状 + 值），不接受「resolve 了」当绿；`render-worker.test.mjs` **必须 import 真源** `src/worker/np-render-worker.js`（`self` stub 驱动 `onmessage`），禁用「mock 里复制一份假实现再测假实现」——后者测不到真代码是 100% 假绿。
- 签名跳过断言必须**断言 `innerHTML`/函数调用未执行**（记录调用次数为 0），不接受「函数返回了」当绿。
- `imageIds`/`md5` 断言必须**断言正则/md5Hex 调用次数**（spy 计数），不接受「结果对了」当绿（结果对可能是重算的）。
- 双界 LRU 断言必须**同时断言条目数与字节界两条路径**（只测一个界是假绿）。
- 人工验收（`RP-T13`）必须有「五样本逐一记录 + 性能 span 读数」的留痕，不接受「看起来行」。
- **degraded 判定**：任一收口目标未全过，closure 必须落机器可读 `degraded` 行：`{target, failed_test_ids:[…], reason_code}`——`reason_code` ∈ `pixel-mismatch`/`worker-unavailable`/`baseline-miss`/`build-miss`/`other`，不接受自由文本。
- **pre-existing 失效应答**：`RP-T12` 若红，必须先跑 `git stash && node --test` 或对照 `main@80b4057` 基线提交，输出「红是本次引入还是 pre-existing」的 git 证据；pre-existing 红也如实登记不得计入本批 PASS。
- **安全攻击向量条款**：n/a——§7.3 已声明本 AP 无安全/信任边界类工作项（`.mjs` 走既有 `dnn.fx.sdk` prefix 静态面，无新凭证/路由/inject）。

---

## 9. 风险、依赖与完成后状态

### 9.1 风险与依赖

| 风险 / 依赖 | 描述 | 当前判断 | 应对方式 |
|-------------|------|----------|----------|
| `display:contents` 像素对齐 | Chromium 下 `display:contents` inline 场景等价渲染的预期强，但无 100% 保证 | `medium` | P2 整 Phase 回滚预案（**不替代交付**——R0 已被 Q1-Answer-A 否决，`T-O-5` 禁旧并存）；dev 必验五样本 |
| worker `module` 类型兼容 | `{type:'module'}` worker 在宿主 Chromium 支持良好（`np-sqlite-worker.mjs` 同款已在用） | `low` | 同款先例 + 构造失败 fallback |
| `renderMarkdown` 块清单能力改动牵 `.json`/richHtml | 块划分与逐行 parse 耦合 | `medium` | 块清单做可选返回字段，默认输出不变 |
| `imageIds` Map 的 key 含 `node.md5`/`version.md5` 的陈旧风险 | md5 变则 key 变则自动 miss 重扫，天然自失效 | `low` | key 含 md5 即防陈旧 |
| `ctaWatch` rAF 合批延迟 | 卡片追加延迟一帧 | `low` | 聊天流 token 节奏 >> rAF，无感 |
| `npm run build` 依赖 esbuild devDep 锁定 | `build()` 内 `require('esbuild')`，缺失即停 | `low` | `npm ci` 前置已在脚本内报错引导 |

### 9.2 约束与前提

- **技术前提**：esbuild devDependency 已锁定；`lib/fx/` 经 `dnn.fx.sdk` prefix 路由服务；`lineHtml`/`inlineMd`/`inlineJson`/`validateJson`/`renderJsonTree`/`renderMarkdown`/`escapeHtml` 为纯函数（DOM-free）。
- **运行时前提**：宿主 Chromium 系；`window.__ModuleLoader__` 加载 `lib/client.js`；worker 经同源 `/nano-notepad/fx/sdk/` 静态路由。
- **组织协作前提**：`RP-batch-1-qna.md` `T-O-1`–`T-O-12` 已冻结（本文档 `draft` 待 [业主] 批准 `reviewed`）。
- **上线 / 合并前提**：§10 收口硬闸全绿 + dev 人工验收 + `0.3.0` + 文档同步。

### 9.3 文档同步要求

- 需要同步更新的设计文档：`docs/specs/dsh-nano-notepad/render-pipeline-1121.md`（`frozen` + §9 标已裁 + §4.2 编号保留）
- 需要同步更新的说明文档 / README：`docs/specs/dsh-nano-notepad/README.md`、`dsh-nano-notepad/AGENTS.md`（`lib/fx/` 行）
- 需要同步更新的测试说明：`lab/baseline/baseline.json`（基线行即性能记录）
- 涉及面退役时，退役清单（代码/注释/头注/行号锚/文档句五类）：
  - **代码**：旧 `paintMirror` 全量路径、`renderCache` 全文 key、`ctaWatch` 逐 mutation 全扫、`imageIdsIn`/`md5Hex` 无缓存重扫——同次提交直接删，不留开关（`T-O-4`）。
  - **注释**：`panel.js:1193-1195`「28KB draft per-keystroke full rebuild」自证注释、`:1204-1207` rAF 注释——增量落地后过时须改。
  - **行号锚**：本 plan §7.1 A-4/A-5/A-8/A-21/A-22 行号在 `panel.js` 改造后会漂移——合并后 plan 标 `executed` 冻结，不再维护活锚。
  - **文档句**：`render-pipeline-1121.md` §4.1 F1–F8「待实施」句、`dsh-nano-notepad/AGENTS.md` `lib/fx/` 行（vendored only）——P5-02 同步改。

### 9.4 完成后的预期状态

1. mirror 帧成本 O(文档) → O(脏段)；`.json`/markdown 预览 O(文档) parse 移出主线程。
2. `ctaWatch`/`applyCopy`/`renderTree`/`renderTabs` 实现「没变不干活」；`renderCache`/`peekCache` 字节有界；`pruneImages`/`stampContentMd5`/`sanitizeNodes` 不再全库重扫重算。
3. `lib/fx/np-render-worker.mjs` 成为 `dnn.fx.sdk` prefix 路由内的正式静态资产（与 `np-sqlite-worker.mjs` 并列）。
4. `0.3.0` + spec `frozen` + 4 个新 `node:test` suite + `lab/baseline` before/after 行。
5. worktree `rp-batch-1-render-pipeline` 合并 `main` 后删除。

---

## 10. 收口（Definition of Done = 测试台账全 PASS 映射）

### 10.1 收口硬闸

1. mirror 像素对齐人工验收过（五样本：wrap on/off、空行、ZWSP、长行、fence 嵌套）（`RP-T13`）
2. `node --test` 全量绿（13 既有 + 4 新）（`RP-T12`）
3. `npm run build` 产 `lib/client.js` + `lib/fx/np-render-worker.mjs` 非空（`RP-T11`）
4. `lab/baseline` `rp-batch-1` before/after 行落盘（`RP-T10`）
5. `0.3.0` + AGENTS.md/README/spec 同步 + worktree 合并（`RP-T11`）

### 10.2 收口映射表（收口目标 ↔ Test-ID ↔ 证据）

| 收口目标 | 工作项 | Test-ID | PASS 证据（四元组）| 状态 |
|----------|--------|---------|---------------------|------|
| mirror 增量结构 | `P2-01` | `RP-T01`+`RP-T02`+`RP-T13` | `commit + test + 验收记录 + run-time` | `未观察` |
| 图片扫描范围 | `P2-02` | `RP-T02` | `commit + test + run-time` | `未观察` |
| 预览记忆化+短键+visibility | `P3-01`/`P3-02` | `RP-T03`+`RP-T07`+`RP-T14` | `commit + test + run-time` | `未观察` |
| worker 卸载+协议+构建 | `P4-01`–`P4-03` | `RP-T09`+`RP-T11`+`RP-T13` | `commit + build + test + run-time` | `未观察` |
| 立取项（熔断/LRU/签名/rAF/imageIds/md5） | `P1-01`–`P1-05` | `RP-T04`–`RP-T08` | `commit + test + run-time` | `未观察` |
| 测试缝提取（断言可达面） | `P1-06` | `RP-T01`/`RP-T03`/`RP-T05`–`RP-T09`（骨架期先红） | `commit + test + run-time` | `未观察` |
| 测试骨架存在性 | `P0-02` | `RP-T01`–`RP-T09` 文件就位先红（P5 全绿后并入各行） | `commit + 骨架文件 + 首跑红记录` | `未观察` |
| 基线/版本/文档/合并 | `P0-01`/`P5-01`/`P5-02` | `RP-T10`+`RP-T11`+`RP-T14` | `commit + 基线行 + build + run-time` | `未观察` |

> worker 行拆分口径：`worker 卸载+协议+构建` 行若 fallback 生效交付——**功能维**记 `observed-OK`（`callLocal` 同函数功能等价），**性能维**记 `partial` + `degraded` 行（reason_code=`worker-unavailable`）。

### 10.3 Definition of Done

| 维度 | 完成定义 |
|------|----------|
| 功能 | mirror 增量 + worker 卸载 + 观测收敛 + 缓存边界全套落地，零新旧并存 |
| 测试 | §8 台账 `RP-T01`–`RP-T13` 全 PASS，退出硬闸四元组齐 |
| 文档 | spec `frozen`、AGENTS.md `lib/fx/` 行、README 功能行、基线行 |
| 风险收敛 | `display:contents` 像素对齐 dev 验收过；worker fallback 验证过 |
| 可交付性 | `0.3.0` + `lib/fx/np-render-worker.mjs` 构建产物 + worktree 合并删除 |

### 10.4 NOT-成功识别

- 任一退出硬闸 `degraded/未观察` ⇒ 不得标 `executed`；按 closure 五态如实归类 + handoff。
- `display:contents` 像素对齐不过 ⇒ **P2 整 Phase 回滚、AP 记 `partial`**（T-O-5 单轨禁旧并存、Q1-R0 已否决，**无替代交付**）；`RP-T01`/`RP-T02`/`RP-T13` 对应行如实记 `未观察`/`degraded`，mirror 增量带证据归 batch-2 重议——回滚不是失败，但必须留 git 证据与 closure 记录。
- worker 在 dev 实例不可用（构造失败/`onerror`/超时）⇒ 走 `T-O-7` `callLocal` 仍交付**功能**，但性能收益项降级为 `partial` 并如实记录（`degraded` reason_code=`worker-unavailable`）。
- `RP-T12` 红 ⇒ 先 git 证据区分本批引入 vs pre-existing（对照 `main@80b4057`），pre-existing 不计本批 PASS 也不得因此豁免本批新红。

---

## 11. 执行日志回填（仅 `executed` 状态使用）

> 文档状态非 `executed` 时本节省略。
