# notepad-wasm-fx 管线评估 — notepad 内嵌 fx 引擎与 MKB 生产管线移植可行性

> 评估对象：`dsh-nano-notepad` 内嵌 libfx `fx-core.wasm` 作为独立 LLM 请求引擎（经 `ctx.llm` 桥接）的可行性；以及将 MKB（`/mnt/usb/workspace/myknowledgebase`，独立有状态 LS-RAG 叶子工作器）的**生产管线**以 JS+WASM 形态重做为 dsh 插件的可行性
> 评估类型：spike 实测登记 + 业主讨论沉淀 + 移植边界分析
> 评估时间：`2026-11-12`
> 实验依据：`test/spike/notepad-wasm-fx/`（14 项命题全部 PASS，宪章已收口）
> MKB 基线：`origin https://github.com/haimang/myknowledgebase.git`，HEAD `6ee5318`，约 50,000 行 Python + 29 SQL migration + Next.js 控制台；参考副本位于 `context/myknowledgebase`（真源 `/Volumes/mini-512/nano-agent-dev/context/myknowledgebase`）
> 文档状态：`draft`——第 1–8 章已登记（含业主心智模型与分叉锁定），第 9 章起待业主后续指令

---

## 0. 结论摘要

- **spike 定案**：notepad 内嵌 `fx-core.wasm` 经 `ctx.llm` 桥接整条链路 **14 项命题全部实测通过**（JSPI、wasm 装载、`prepareCall/stream`、OpenAI↔内部翻译、host-tool 回调、取消传播、资源开销、图像入向、引擎级 one-shot）。唯一真实成本是一份六条不变量的翻译合同（charter §7.3）。
- **业主定案的工作画像**——「轻量、one-shot、用完即抛、无 durable、高并发」——把两项候选缺口**永久关闭**：durability 走引擎级 one-shot、reasoning-effort 走「固定轻量模型 + 设置档位映射」。
- **kind 分布定案**（five-kind）：`prompt`/`note`/`draft`/`knowledge`/`memory`，按写者与消费方式分层；`draft` 为机器独占、人仅可 `reject` 触发重跑，构成真相脊谱系。
- **notepad 讨论在 MKB 处终结**：notepad 从「悬浮记事本」演化为「知识库摄取管线的执行前端」，其 durable kinds 是产物落点，fx 引擎是执行体。
- **MKB 评估**：`myknowledgebase` 是多租户耐久工作流服务，非插件形态。其**管线面**（intake/LS-RAG/检索/CAS/确定性向量化）可 JS+WASM 化（约 5–8k 行），但其**服务内核**（claim/lease/fencing/outbox/29 migration/team 语义）在单租户 one-shot 场景为纯税，**不建议移植**。
- **推荐切割**：移植「管线面 + 执行语义」、放弃「服务内核」——执行状态与幂等回退借语义（sqlite-wasm 承载）、放弃租户/fencing 数据结构；状态基质为 sqlite-2-s3（本地副本+s3 真源），shared-workspace 的 s3 claim 原语承担单写者 fencing。
- **分叉锁定**：run-state 共享粒度 = 产物级共享 + run/产物键级 claim（F-1）；s3 端点 = CAS-capable（R2/pgs3 首选，MinIO 降级，F-2）。两处均有 shared-workspace `session-io.js`/`s3.js` 代码级证据。

---

## 1. 讨论的起点与出发点

### 1.1 起点位置

讨论始于一个具体的技术问题：`dsh-nano-notepad` 已在 `dsh-dev.local` 上稳定运行（悬浮记事本 overlay，含 S3 云同步、版本历史、mp 抓取管线），业主问「**能否在 notepad 里嵌入 libfx 的 `fx-core.wasm`，让它作为页面内 LLM 引擎跑 agent**」。

问题的物理起点是 `test/spike/notepad-wasm-fx/README.md` 立宪（2026-11-12 建档）。宪章 §3 的一句话定义写明了出发点：

> 验证「把 libfx 的 `fx-core.wasm` 嵌进 `dsh-nano-notepad`，经宿主桥把它对接到 `ctx.llm`（即 model-selector 同一份模型清单）上跑一个页面内 agent」这条前瞻链路在真实宿主上的每一环是否成立。

### 1.2 出发点：为什么问这个问题

出发点不是「再给 dsh 加一个聊天框」，而是三个相互咬合的观察：

1. **notepad 已有管线基因**——它已能抓文（`fetchMpArticle`/`importMpArticle`）、消毒、版本化、写文件，但**完全没有 agent / LLM 调用**。业主想给它一个独立执行体，跑「清洗→沉淀」的管线任务。
2. **模型源必须唯一**——业主明确「桥接不能直连 magpie，必须经 model-selector 的 `ctx.llm` 转发」。这条约束把问题从「wasm 能不能跑」收敛成「wasm 引擎能不能对接到 `ctx.llm` 这一份模型清单上」。
3. **mydocs 方法论的延伸**——`.adocs/prompts`（驱动端剧本簇）与 `.adocs/templates`（产出端模板）的双面互锁已在 `nano-agent` 验证。业主想让 notepad 继承这套「prompt 仓库 → 模板 → 产物」的资产分层，但需要先在技术链路上证明页面内引擎可行。

### 1.3 问题的分层（spike 出发点）

宪章 §2 把问题拆成四层独立可验的子命题：

| 层 | 子命题 | 否决权重 |
|---|---|---|
| 引擎侧 | JSPI + wasm 装载 + host-tool 回调 | **V-01 一票否决**（无 JSPI 则整个 WASM 路线 RED） |
| 桥侧 | `ctx.llm` inject + `prepareCall/stream` + OpenAI SSE 翻译 | V-04/V-05/V-06 共决 |
| 资产侧 | wasm 二进制分发（体积/路由） | V-02/V-03 |
| 会话侧 | durability + 取消传播 | V-09（后被工作画像改写） |

---

## 2. Spike 测试结论与演变周期

### 2.1 测试结论（14 项全部 PASS）

| ID | 命题 | 终态 | 关键实测 |
|---|---|---|---|
| V-01 | ego-browser Chromium 支持 JSPI | **ego PASS** | `WebAssembly.Suspending`/`promising`/`compileStreaming` 全 true，Chrome 156 |
| V-02 | `fx-core.wasm` 可拿到且体积可分发 | **offline PASS** | 2,260,477 B，路由分发字节级一致 |
| V-03 | wasm 浏览器内 fetch+编译 | **ego PASS** | `runtime.ready` ~450ms 冷 / ~283ms 热 |
| V-04 | `ctx.llm` 可 inject + provider 列表 | **ego PASS** | `/nano-fx-spike/models` 列 deepseek-official(2)+magpie(51)，53 id |
| V-05 | `prepareCall().stream()` 真实流 | **ego PASS** | 真实拉流，模型回「bridge works」 |
| V-06 | `StreamChunk`→OpenAI SSE 翻译合同 | **ego PASS** | 引擎整段消费至 `end_turn`，无 `InvalidChunk` |
| V-07 | `provider~model` 复合键 | **ego PASS** | 53 id 无 `~`，无损编码 |
| V-08 | JS `tools` `execute()` 回调 | **ego PASS** | `note_test` 经 `idempotent:true` 声明，fx 回调 `execute({probe:'hello'})` |
| V-09 | `memory()` durability + 取消传播 | **ego PASS** | `abort()` → `stopReason:'cancelled'`，宿主 `res 'close'` |
| V-10 | 引擎资源开销 | **ego PASS** | 首 text delta ~1.7s；`storage.estimate()` 不变 |
| V-11 | 模型清单一致性 | **ego PASS** | scaffold catalog 与 model-selector **逐字段相等** |
| V-12 | IDB World 骨架 | **offline PASS**（骨架；画像后永不接线） |
| V-13 | 图像入向 `image_url`→`ImageBlock` | **ego PASS** | `attachments.saveImage` 闭环，模型读图回「FX」 |
| V-14 | `createFxEngine` 引擎级 one-shot | **ego PASS** | 整 turn 858ms，`sessionId` 仅进程内标识 |

### 2.2 实测踩出的坑（已收敛为 §7.3 合同）

链能通 ≠ 随手一接就通。fx 的 SSE 解析器是**增量追加语义 + 严格不变量**，四条实测踩坑收敛成合同：

1. **`prepareCall`/`stream` 的 call-config 冻结**：控制字段给 `prepareCall`，`stream()` 须摊开 `prepared.config`（adapter 默认 `reasoningEffort`/`maxTokens` 回填），否则 `INVALID_PREPARED_CALL`。
2. **`tool_calls[].index` 必须 0 起连续**（ctx.llm 给块序须 slot 重映射）、`id`/`name` 只在首帧、`arguments` 逐片追加、finish 帧不得重发。
3. **`usage.total_tokens` 须恒等 `prompt+completion`**（deepseek 报 333≠166+39，须重算）。
4. **Node client abort 在 `res 'close'`**（非 `req 'close'`）——取消钩子挂 `res`。

### 2.3 Spike 演变周期

| 阶段 | 时间 | 动作 | 产出 |
|---|---|---|---|
| 立宪 | 2026-11-12 | 写宪章、定 12 项命题、定四层拆分 | `README.md` §1–§6 |
| 首测 | 同日 | 跑 V-01–V-12，修 scaffold 至全绿 | 12 PASS，§7 回填 |
| 画像定案 | 同日轮 1 | 业主定「one-shot/用完即抛/无 durable」 | §8 改写，§8.1 管线方向 |
| kind 定案 | 同日轮 2–3 | five-kind + draft 状态机 | §8.2 完整模型 |
| 补测 | 同日 | V-13 图像桥 + V-14 引擎级 one-shot | §7.2/§7.5 补两行，§9 终态升级 |
| 收口 | 同日 | 心智模型 + 拓扑 + 遗留边界 | §10/§11 |

### 2.4 收口产物

宪章最终攒齐**两份可直接抄进实现的定稿**：

- **§7.3 翻译合同**——fx↔dsh 的唯一界面（六条不变量 + V-13 的 `saveImage→ImageBlock`）。
- **§8.2 five-kind 模型 + draft 状态机**——产物分层与晋升管线的完整定义。

---

## 3. Kind 分布与 Topology 的执行分析

### 3.1 Five-Kind 分布（业主定案）

| kind | 写者 | 人的操作面 | 消费方式 / 用途 |
|---|---|---|---|
| `prompt` | 人（curated） | 编辑、版本管理 | one-shot 剧本仓库，`.adocs/prompts` 簇化；长期资产 |
| `note` | 人 | 编辑 | 手写/粘贴/人改过的内容；**机器永不写** |
| `draft` | **机器独占** | **只允许 reject**（不可编辑） | one-shot 中间产物 + 兜底落点 |
| `knowledge` | 机器（管线终点） | 读、删、手动调整 | 清洗后语料，供检索（MCP search/read） |
| `memory` | 机器产出 + **人背书** | 手动调整 | 蒸馏事实，供 prompt 注入 = durable memory |

### 3.2 draft 状态机（核心裁决）

```
                ┌─────────────────────────────────────┐
                │  draft  · pending (机器独占，只读)     │
                └──────┬───────────────────┬──────────┘
              reject() │                   │ accept / 管线沉淀
       (可带 feedback) │                   │
                       ▼                   ▼
              触发 one-shot loop      knowledge (检索层)
              重跑同模板              │
              ↓新 draft               ▼ 人手动提炼/背书
              supersedes→父代         memory (注入层 durable memory)
              rejectCount+1
```

三条铁律：**写者=机器**（view-only + reject 按钮）；**reject 即反馈回路**（feedback 注入重跑 prompt）；**谱系留痕**（`supersedes` 链 + `rejectCount`）。兜底语义：分类不明的 one-shot 产物一律落 draft，永不静默污染 knowledge。

### 3.3 最终拓扑（执行分析）

```
   dsh-nano-notepad overlay（常驻 UI + fx-core.wasm 常驻一份）
   ├─ per task: engine.prompt(one-shot) ── fx_host_tool_call ─→ note_* tools ─→ IDB kinds
   ├─ durable kinds(IDB): prompt → note → draft →(沉淀)→ knowledge →(背书)→ memory
   └─ → /nano-fx-spike/* 宿主桥（webServer+围栏）→ ctx.llm → deepseek-official/magpie
                                                          │
                                              (远期) MCP route ─→ dsh.host 读 = durable memory
```

**拓扑三不变量**：
1. **模型源唯一**——任何 notepad 任务都经 `ctx.llm`，无第二条 LLM 通路。
2. **会话即弃、产物即档**——引擎层零持久（V-14 实测 858ms/turn），沉淀层全在 durable kinds。
3. **桥即合同**——§7.3 六条不变量 + V-13 `saveImage→ImageBlock` 是唯一界面。

### 3.4 最终建议（notepad 侧）

1. **durability = `createFxEngine` 引擎级 one-shot**，不接 `createFxAgent`+`memory()` 也不接 World——引擎实例 = 一次任务，`turn` 结束即弃。
2. **reasoning-effort 经「固定轻量模型 + 设置档位映射」**——选模型即选档位，不接 per-request effort，不接 Responses provider。
3. **wasm 引擎随 overlay 常驻复用**（~283ms 热启省掉），每活只付 prompt→finish 边际成本。
4. **provenance 必带** `{via:{promptId, model, runId, at}}`——产物可审计、管线可重跑。
5. **图像桥走 `ctx.attachments.saveImage`**——V-13 已证 `image_url`/`data:`/`remote` 三态闭环。

---

## 4. Notepad 讨论的演化进程 — 止于 MKB

### 4.1 演化的三跳

这段讨论本身是一条清晰的产品认识演进，每一跳都把「notepad 是什么」往前推了一层：

| 跳 | 触发 | notepad 的身份 | durable 的含义 |
|---|---|---|---|
| **起点** | 技术问题「能嵌 wasm 吗」 | 一个想加 LLM 能力的记事本 overlay | 未定（V-09/V-12 还在测会话持久化可行性） |
| **跳 1 · 工作画像** | 业主：「轻量/one-shot/用完即抛/无 durable/高并发」 | **任务执行体**，不是聊天框 | 会话 durable 被关闭（引擎级 one-shot） |
| **跳 2 · five-kind** | 业主：kind 分层 + prompt 仓库 + draft 状态机 | **知识资产分层器** | durable 重定义为**产物**（knowledge/memory） |
| **跳 3 · MKB** | 业主：「把 MKB 生产管线用 dsh 插件重做」 | **摄取管线前端**，MKB 的 dsh 侧执行体 | durable memory = MKB 沉淀物进主线 |

### 4.2 关键转折：「durable」一词的语义漂移

讨论中最值得登记的认知转折是 **「durable」在业主心智里经历了一次重定向**：

- 起点问的是「fx 会话要不要 durable（memory()/local()/World）」——技术上 V-09/V-12 还在验证可行性。
- 业主一句「不需要 durable 留档、用完即抛」**先关闭了会话 durable**。
- 但同一段话里「沉淀为知识库」「durable memory 的一部分」又把 durable **重新打开**——只是对象换了：不是 fx 的 session，而是**产物沉淀到 notepad durable kinds**，远期再经 MCP 进主线。

这个漂移不是矛盾，是把「durable」从**会话语义**（引擎记不记得上次）重定位到**资产语义**（产物存不存得下来）。V-14 的实测（引擎级 one-shot 858ms 整 turn、无 accepted）正好为「会话可弃、产物才要档」背书。

### 4.3 演化中的判断分叉点

1. **「把 MKB 拷进 notepad / 打成 nano-mkb 插件」** —— 判定为**范畴错误**。MKB `pyproject` 自述「a standalone, stateful LS-RAG leaf worker」：FastAPI+uvicorn+pyturso+Next.js 控制台，50k 行 Python，数据 `.experiment`+`data` 共 117M 是**服务运行时状态**。这些不是插件形态能装的（Python venv、SQLite、uvicorn 进程都不是 JS overlay 的东西）。真正的体重在状态不在代码。
2. **「用 dsh 插件形态重做 MKB 生产管线」** —— 这才是可做的命题：把**管线面**（intake/LS-RAG/检索/CAS/向量化）JS+WASM 化，放弃**服务内核**（多租户耐久工作流）。业主这个诉求接回了跳 3 的定位：notepad 是 MKB 管线的 dsh 侧前端。

### 4.4 止于 MKB：前序讨论的终结判断

至此，notepad 的讨论已经收敛为一个完整闭环：

```
记事本 overlay（起点）
  → 想要 LLM 能力（跳：能不能嵌 wasm）
  → 定 one-shot 执行体（画像：用完即抛）
  → 定产物分层（five-kind + draft）
  → 定管线方向（intake→清洗→沉淀→检索）
  → 发现 MKB 已有完整管线（跳：是否重做）
  → 【讨论在此交接给 MKB 评估】
```

**notepad 讨论的最终结论**：notepad 不该长成第二个 MKB，而是成为 MKB 生产管线在 dsh 插件侧的**执行前端 + 产物落点**。它的 fx 引擎、five-kind、prompt 仓库、桥接合同都是为这个定位服务的。MKB 本体要不要重做、怎么重做，是第 5、6 章的独立命题——**notepad 的讨论到此为止，接力棒交给 MKB**。

---

## 5. MKB 项目分析 — 内部拓扑、技术栈、生产管线

> MKB = `myknowledgebase`，自定位「a standalone, stateful LS-RAG leaf worker」。参考副本 `context/myknowledgebase`（真源 `/Volumes/mini-512/nano-agent-dev/context/myknowledgebase`），远端 `/mnt/usb/workspace/myknowledgebase`（spark USB 盘），HEAD `6ee5318`。

### 5.1 技术栈

| 层 | 技术 | 角色 |
|---|---|---|
| 语言 | Python 3.12 (`>=3.12,<3.13`) | 全栈 |
| 服务 | FastAPI 0.141 + Starlette + Uvicorn | HTTP 面，`api/public` + `api/internal` 双表面 |
| 持久 | `pyturso>=0.7.2`（本地 Turso/SQLite）+ **29 个 migration** (`001`–`029`) | 状态机、CAS、向量、审计 |
| 数据建模 | pydantic 2.11 + pydantic-settings | 契约 (`src/contracts/*`) |
| 前端 | Next.js 16 + React + react-query + playwright | `mkb-localhost-console`（`localhost:6789`） |
| 推理 | **外置**：`src/runtime/inference/{facade,invocations,claude_cli,multimodal}` | LLM 走 subprocess/HTTP，**不内嵌模型** |
| 向量化 | `src/services/deterministic_embedding.py` | **本地确定性向量**（非神经网络） |
| 体量 | `src/` ~50,000 行 Python；`src/runtime/workflow`+`src/workflows` ≈ 8,889 行 | 重在服务内核 |

### 5.2 内部拓扑（组件图）

```
            ┌─────────────── 调用方（内部编排器，Team 租户）──────────────┐
            │                                                          │
   public   ▼                                              internal     ▼
   ┌─────────────────┐   ┌─────────────────────────────────────────┐   │
   │ api/public      │   │            api/internal                  │   │
   │ catalog/objects │   │  prompts / catalog / cutover / operator  │   │
   │ upload/stat     │   │  discovery / observability               │   │
   └────────┬────────┘   └───────────────────┬─────────────────────┘   │
            │            ┌──────────────────┴───┐                      │
            ▼            ▼                      ▼                      │
   ┌─────────────────────────────────────────────────────────────┐     │
   │  src/runtime/task_service  →  Task(不可变配置快照)            │     │
   │  src/runtime/workflow_supervisor → Process(细粒度)           │     │
   │  src/runtime/workflow/{engine} → Execution(claim/lease/      │     │
   │        retry/fencing/outbox/人工gate/scatter-join/重启恢复)   │     │
   └──────────┬──────────────────────────┬────────────────────────┘     │
              ▼                          ▼                              │
   ┌────────────────────┐   ┌──────────────────────────────────┐        │
   │ src/runtime/intake │   │  src/services/lsrag_*            │        │
   │  inline/text/HTML  │   │  lsrag_compiler/construct/       │        │
   │  /PDF/web-sanitize │   │  structurize → g0/g1/g2 分层     │        │
   │  /api providers    │   │  quoted cuts（模型报锚点,管道切) │        │
   └────────┬───────────┘   └──────────────┬───────────────────┘        │
            ▼                              ▼                             │
   ┌─────────────────────────────────────────────────────────────┐     │
   │  intake/vectorize → deterministic_embedding → vector_publish │     │
   │  index generation + serving eligibility 双栅栏              │     │
   └──────────┬───────────────────────────────────────────────────┘     │
              ▼                                                         │
   ┌─────────────────────────────────────────────────────────────┐     │
   │  persistence/turso  (29 migration)  team-scoped SHA-256 CAS  │     │
   │  objects / evidence / sessions / audit / metrics             │     │
   └─────────────────────────────────────────────────────────────┘     │
```

### 5.3 生产管线（intake → 检索）

MKB 的「生产管线」即 `intake → LS-RAG → vectorize → publish → retrieval`，各阶段：

| 阶段 | 实现 | 输入→输出 |
|---|---|---|
| **摄取 intake** | `src/runtime/intake/` + `intake/{web,pdf,text,api,doc}` | inline/本地对象/HTTP/PDF/browser-render → 归一化 records |
| **清洗 sanitize** | `intake/web/sanitize.py` | HTML → 保段落换行的 clean text |
| **LS-RAG 结构化** | `src/services/lsrag_{compiler,construct,structurize}` | content → g0/g1/g2 分层块；**g1 走 quoted cuts**（系统写 g0，模型只报锚点，管道在 `clean` 上切片）；`original/summary` 双通道 + `content_full` |
| **向量化** | `intake/vectorize.py` → `deterministic_embedding` | g-块 → Float 向量（sha256 token-hash，dimension 可配） |
| **发布** | `intake/vector_publish{,_commit}.py` | 向量 + index generation 写 → 待 serving eligibility |
| **检索** | `services/retrieval` | index gen + eligibility 双栅栏 → context-only 结果（不生成答案） |
| **CAS** | `services/object_upload`/`object_gc` | team-scoped SHA-256 对象存储（无 raw download） |

### 5.4 推理与向量化的外部性

这是决定「能否 JS 化」的关键观察——**MKB 的两条重计算路径都是外置的**：

- **推理走外部**：`inference/{facade,invocations,claude_cli,multimodal}`——LLM 经 subprocess（claude_cli）或 HTTP（multimodal）调，MKB 自身不含模型。移植时这条路径天然映射到 dsh 的 `ctx.llm`。
- **向量化是本地确定性函数**：`deterministic_embedding` 是 ~30 行的 sha256 token-hash 向量（非神经网络、无模型文件），可原样 JS 化——这是整个管线里**唯一可以无损搬移的「计算」**。

### 5.5 状态与耐久层（重，且不可轻化）

MKB 的「重」几乎全部集中在状态层：

- **耐久工作流内核** `src/runtime/workflow` + `src/workflows` ≈ **8,889 行**：claim/lease/retry/fencing/outbox/人工 gate/scatter-join/重启恢复/revision 兼容。
- **29 个 SQL migration**：Observation/ItemEpoch/object session/evidence plane/ops contract/cutover。
- **多租户**：Team/Task/Execution/Process 四级状态机 + 不可变配置快照 + revision 回放。
- **审计**：events/diagnostics/security audit/Prometheus 指标/readiness 探针。

这一层是 MKB 作为「内部服务」存在的理由——**它假设自己是常驻进程、有事务 DB、服务多租户、要对齐 revision**。这些假设在 dsh 插件里全部不成立。

---

## 6. MKB 移植进插件的分析与评估

### 6.1 判断基准

移植的可行性不由代码量决定，由**每个部件的宿主假设**决定：该部件是否依赖「常驻进程 + 事务 DB + 多租户 + 外部模型」。依赖这些假设的部件，搬进插件就是重写而不是移植。

### 6.2 建议移植（管线面 —— 宿主假设低）

| MKB 部件 | 移植为 | 依据 |
|---|---|---|
| **intake**（inline/text/HTML/PDF 清洗、web sanitize、api provider） | JS 清洗函数组 + `note_*` host-tools | 纯函数式，无状态假设；PDF/HTTP 走宿主 subprocess/fetch |
| **LS-RAG 结构化**（g0/g1/g2 分层、quoted cuts、original/summary 双通道） | **fx one-shot 管线** | 「模型只报锚点、管道在 clean 上切片」正是 fx 工具调用的理想形态；one-shot 画像完全吻合 |
| **deterministic_embedding** | JS sha256 token-hash → Float32Array | 30 行纯函数，零依赖 |
| **有栅栏检索**（gen + eligibility、facet、context-only） | IDB 向量存 + JS 余弦检索 | 检索是无状态读，栅栏语义可在 IDB schema 表达 |
| **team-scoped CAS** | IDB + sha256 content-address（单租户） | 去掉 team 维度后退化成本地 CAS |
| **`prompt_profiles`/`workflow_catalog` 等剧本注册** | `prompt` kind（five-kind） | 直接对应 `.adocs/prompts` 簇化模式 |

**估计体量**：约 **5–8k 行 JS**（intake+LS-RAG+向量化+检索+CAS 的纯管线逻辑），加上 §7.3 翻译合同与 five-kind schema。

### 6.3 不建议移植（服务内核 —— 宿主假设高，重写即再造）

| MKB 部件 | 不建议原因 | dsh 侧等价物（如有） |
|---|---|---|
| **耐久工作流内核**（claim/lease/fencing/outbox/人工 gate/8,889 行） | 假设常驻 supervisor + 事务 DB + 重启恢复 + 多执行体并发。one-shot 画像下只需要「**可恢复队列**」（IDB + run 续跑），不需要耐久事务内核 | 一个 `pending→running→done/failed` 的 IDB 队列表 + 页内 worker，**数百行** |
| **29 个 migration / Turso schema** | 绑定 Turso/SQLite 方言与 migration 演进史。IDB schema 只需 1 个初始版本 | 若有强向量/事务需求选 **SQLite-WASM(OPFS)**；否则全 IDB |
| **team/task/execution 多租户** | notepad 是单租户、单用户 overlay | 砍掉；`runId` 已够追踪 |
| **Next.js 控制台** | 与 dsh overlay 体系（`dsh-nano-ui`）不是同一前端栈 | notepad UI 本身即前端 |
| **FastAPI 双表面 + uvicorn** | 插件的对外表面是 `webServer` 路由 + requestRejection 围栏，不需要 ASGI 服务 | 宿主桥路由（§10.2） |
| **审计/Prometheus/readiness 探针** | 服务化观测面，插件语境下由 `console.error`/`__errs`/evidence 取代 | 宿主日志 + provenance 字段 |
| **`api/providers/{domain,realestate,chinatax}`** 业务 provider | 领域特化的注册集合，属 MKB 租户业务逻辑，不属通用管线 | 视后续需要作为 prompt-kind 模板 |

### 6.4 灰区（取决于业主对「完整性」的要求）

- **SQLite-WASM/OPFS vs 纯 IDB**：若向量检索要 SQL 语义/大向量表，上 SQLite-WASM（OPFS 持久）；若只按 id 取向量算余弦，纯 IDB 足够。**建议先纯 IDB**，向量检索做不动再上 SQLite-WASM。
- **PDF text-layer**：MKB 有确定性 PDF 摄取；插件侧可走宿主 `subprocess`（pdftotext）或 `pdf.js` wasm。属管线面但需要宿主能力，列入实现期决策。
- **`outbox`/人工 gate**：MKB 的人工 gate 在 notepad 里天然映射为 `draft` 的 reject——**语义上有对应物，机制上不需要那层内核**。

### 6.5 移植的推荐架构（若做）

```
dsh-nano-notepad overlay
└─ 自主打包 wasm 沙箱（独立于 host 的执行+状态，业主张力1定案）
   ├─ fx-core.wasm        one-shot 执行体（session 即弃）
   ├─ sqlite-wasm + OPFS  durable state：runs/checkpoints/supersedes/epoch/
   │                       evidence-ledger/idempotent-keys —— 执行态+幂等键+真相脊
   ├─ JS→wasm 管线        intake → LS-RAG(g0/g1/g2,quoted-cuts) →
   │                      deterministic_embedding(JS) → knowledge 沉淀
   └─ durable kinds(IDB)  prompt/note/draft/knowledge/memory（产物落点）
            │ 所有 i/o 跨 wasm↔host 桥（幂等键随行，可安全重试）
            ▼
   host（哑传输层）: dsh-s3-client · ctx.llm 桥 · attachments · subprocess(PDF)
            │
   ┌────────┴─────────┐
   ▼                  ▼
本地 sqlite→s3        shared-workspace 共享态/产物（多人 s3）
(单写者，manifest+etag)  claims/{key}.json 租约 + heartbeatRev + diverged
   │                  ——CAS-capable 端点原子化（F-2 锁定）；MinIO 降级 best-effort
   ▼
 s3 endpoint（持久真源；首选 R2 / pgs3-bearer 反代）
```

**不变量**（承自 notepad 拓扑）：模型源唯一（`ctx.llm`）、会话即弃产物即档、桥即合同、人工 gate 即 draft-reject。新增：**sqlite 仅本地工作副本、S3 为唯一真源**（shared-workspace 否决远端单体 sqlite）、**run/产物键的单写者由 s3 claim 强制**而非约定。

### 6.6 形态建议：**并入 notepad，不开第二个插件**

`nano-mkb` 独立插件并非不可行，但**不建议**：

- 它需要的 `ctx.llm` 桥、`attachments`、`fx wasm`、durable-kind schema、provenance 全部已在 notepad 立项范围内——拆出去等于把同一套基础设施做两遍。
- 「MKB 管线」与「notepad five-kind」是同一件事的两个名字（摄取→清洗→分层→沉淀）；插件边界会人为切断产物落点。
- notepad 已是业主的「摄取前端」定位，管线是它的功能扩展而非新实体。

**若必须独立**（例如想给 MKB 一个品牌壳或独立分发），它应被设计为**notepad 的薄兄弟**：共享 `dsh-nano-ui` 与宿主桥，只带 `api/public`/`api/internal` 的 fetch 表面 + MKB 控制台视图——插件本体仍只几 K 逻辑。

### 6.7 scope 裁决（已由业主 2026-11-12 第二轮修正锁定）

§6 初稿的 A/B 分叉（「纯管线面 5–8k」vs「完整等价 20–30k」）被业主两轮修正改写为**第三形态**：不是砍执行内核，而是「**执行语义保留、服务形态去除、状态基质换 sqlite-2-s3**」。

| 修正项 | 业主定案 | 对移植面的影响 |
|---|---|---|
| 租户接入 | **不需要** Team/Task 多租户 | 砍掉 tenant 边界 |
| execution 生产管线 + 状态管理 + 幂等回退 + id 命名 + 部分真相层 | **需要** | 移植面从「纯管线」扩到「管线 + 执行语义」（~7–10k JS/WASM） |
| durable state | **需要完整**，形态 = **高可用 SQLite** | 「先纯 IDB」被否；sqlite-wasm+OPFS + s3 复制 |
| s3 持久化 | **参考 `context/pgs3` 或 sqlite-2-s3 形态** | s3 = 唯一真源；sqlite = 本地工作副本 |
| wasm 沙箱 | **sqlite 与 fx 同跑一个自主打包 wasm 环境** | 执行+状态同沙箱，宿主只剩哑 i/o |
| shared-workspace 多人 | **会接入，幂等/竞态必须设计期就考虑** | claim 租约原语复用，fencing 长在 s3 claim 上 |
| 真相层 | **只复制与 pipeline 相关者**（生产管线/竞态/幂等回退） | 借概念不搬 schema（via provenance + supersedes + run ledger） |

**结论**：移植面 = **管线面 + 执行语义层（去租户、去 fencing 数据结构、sqlite 化）**，约 **7–10k JS/WASM**。完整 A/B 评估见 §7 分叉锁定。

---

## 7. 业主心智模型登记与分叉锁定

> 本节为业主 2026-11-12 心智模型的**权威登记**：含五层心智、两轮张力裁决、两个已锁真分叉（带代码级证据）。后续 spec 与实现以此为对齐基准。

### 7.1 业主心智模型（权威登记）

1. **notepad 是管线执行前端，不是聊天框**——fx 引擎是执行体，`note_*` host-tools 是手脚，`ctx.llm` 是唯一模型源。
2. **任务 = one-shot tool-call**——没有续聊/session；活多、并发高，但每活的语义是「调用一次」。
3. **durable 指产物与管线状态，不指 fx 会话**——会话即弃；**执行状态（runs/checkpoints/幂等键）要完整 durable**。
4. **资产三层、写者分人**——`prompt`(人)/`note`(人)/`draft`(机器独占，人仅 reject)/`knowledge`(机器沉淀，供检索)/`memory`(人背书，供注入)。
5. **状态基质 = sqlite-wasm、真源 = s3**——sqlite 在自主打包 wasm 里跑（与 fx 同沙箱），sqlite-2-s3 单向复制到 s3 端点；sqlite 只是本地工作副本，永不共享单体文件。
6. **多人并发在设计期内建**——notepad 会接 shared-workspace；幂等/竞态/单写者 fencing 靠 s3 claim 租约，不靠 MKB 进程内 fencing。
7. **「独立」= 性能 + 沙箱隔离，不是脱离 host**——wasm 沙箱拿满性能/隔离；安全边界在「凭据留 host + 桥最小权限 + i/o 幂等」，不在「完全脱离 host」（做不到也不必要）。

### 7.2 张力裁决回顾（两轮）

| 张力 | 第一轮判读 | 业主补充后终态 |
|---|---|---|
| sqlite 放哪 | overlay-wasm vs host-node（分叉） | **定案**：与 fx 同跑一个自主打包 wasm 环境 —— 分叉消解，执行+状态同沙箱 |
| 独立于 host | 性能+隔离 vs 完全脱离 | **定案**：独立 = 性能+隔离（沙箱内跑管线）；安全上把功夫下在「凭据留 host + 桥最小权限」 |
| 幂等/竞态 | 单写者 + etag 即够？ | **重写**：接 shared-workspace → 多写者真，claim 租约 + heartbeatRev + diverged；fencing 长在 s3 claim 上 |
| 真相层 | 搬概念不搬 schema | **定案**：只复制与 pipeline 相关者（生产管线/竞态/幂等回退）；via provenance + supersedes + run ledger |

### 7.3 分叉锁定 F-1：run-state 共享粒度

**锁定**：**产物级共享 + run/产物键级 claim**。run 的可写执行态保持单写者（本 overlay）；竞态只在「同一 `runId`/产物键被并发覆写」，用 s3 claim 租约挂到那个键上。

**支撑证据**（`.worktree/DASW-1112-automation/dsh-nano-shared-workspace/src/host/session-io.js`）：

- `CLAIM_KEYS`（L164）白名单只认 `writerId/acquiredAt/expiresAt/heartbeatRev` 四字段——`claims/{key}.json` 是**通用单写者租约原语**；`sessionId` 换成 `runId` 即得 run 级 fencing，**不搬 MKB 进程内 fencing 表**。
- `acquireClaim`（L197-219）：ETag CAS 读-改-写；412 竞态 → 重读重算；全轮竞态 → **拒写而非覆写**（宁 fork 不撕裂）。
- `pushSession`（L289 `skip:foreign-writer`）：`meta.writerId ≠ me` 即停推——单写者**被代码强制**，非约定。

**理由**：one-shot 画像下没有「两条 run 共享可写执行态」的合法场景。MKB 的 claim/lease **语义**借走、fencing 数据结构不搬——s3 claim 原语已是其等价物。

### 7.4 分叉锁定 F-2：s3 端点选型

**锁定**：**CAS-capable 端点**。生产默认 **Cloudflare R2 或 pgs3（bearer 反代后）**；MinIO 走 best-effort + diverged→选边降级。

**支撑证据**：

- `src/host/s3.js` 对 MinIO **部分可用 CAS**：`ifMatch`/`ifNoneMatch` 头照常发、主动剥弱 ETag 的 `W/` 前缀（L64/66——「MinIO's If-Match only accepts a strong validator」）——CAS 是首选路径不是降级路径。
- spec F5/F6：条件写 **R2/S3/pgs3 可用，MinIO 等可能缺失**；pgs3 `If-Match` 落 Postgres 事务**真原子**。
- spec L70：实际部署是 MinIO（原生 SigV4 + `mc` + 控制台），pgs3 仅备选——锁死 pgs3 会跟现网脱节。
- spec L416：MinIO 不用 `If-Match` 时单写者窗口开着（两端同时读到锁空、都写成功）——必兜竞态源。

**实测修订（spike V-17b，2026-11-12）**：现网 `https://nano-shared-workspace.saobao.com`（MinIO 后端，CF 前置）上 `If-None-Match:'*'` 与 `If-Match:etag` **均返回真 412 conflict**——「MinIO 无 CAS」的前提被这条链路证伪。F-2 的锁定词不变（CAS-capable），但 MinIO 不再只能算「best-effort 降级」——**在这条链路上是可用 CAS 路径**。仍保留两点保守：① 这是该链路行为，换端点需同测回归；② 对 MinIO 直写的部署仍执行 spec L416 的降级预案（diverged→选边）。spike 证据：`test/spike/notepad-wasm-fx/evidence/v17-sqlite-s3.md`。

**理由**：fencing 硬不硬取决于端点支不支持条件写，不取决于叫不叫 pgs3。锁「CAS-capable」拿到硬 fencing 又不把部署绑死在零鉴权服务上；spike 实测后 MinIO 链路升级为准可用，直写 MinIO 部署仍走「best-effort + diverged→选边」降级。

### 7.5 拓扑（业主心智模型定稿版）

见 §6.5 —— 已更新为 wasm 沙箱形态（fx+sqlite+管线同沙箱、host 哑传输、sqlite-2-s3、shared-workspace claim 面）。

### 7.6 不变量（汇总）

1. **模型源唯一**：所有 notepad/MKB 管线任务经 `ctx.llm`。
2. **会话即弃、产物即档**：fx session 零持久；durable 全在 sqlite 管线态 + IDB kinds + s3 真源。
3. **sqlite 仅本地副本**：S3 无跨对象事务，远端单体 sqlite 必然撕裂——sqlite-2-s3 单向复制，manifest+etag 判新。
4. **单写者由 s3 claim 强制**：不是约定；CAS-capable 端点上 fencing 为真，直写 MinIO 部署降级为 diverged→选边。**命名空间归 notepad 独桶、命名守 notepad 规范（A3 裁决）**；shared-workspace 读 notepad 内容走插件↔插件 MCP/RPC 授权，不经桶直读。
5. **桥即合同、凭据留 host**：wasm↔host 唯一接缝；s3/`ctx.llm`/attachments 在 host 侧最小权限，i/o 幂等随行。
6. **真相脊三件套**：`via{promptId,runId,epochId,at}` + `supersedes` 链 + run ledger——借 MKB 概念不搬 schema。

---

## 8. 接入方法推荐

> 怎么把这套接进 dsh——按「先有、复用、新建」三档组织，全部指向已验证的实现而非空想。

### 8.1 已有可直接复用

| 资产 | 位置 | 复用方式 |
|---|---|---|
| s3 客户端 | `packages/dsh-s3-client` | host 侧直接 import；SigV4+令牌桶+账本已验证 |
| s3 claim 租约原语 | `dsh-nano-shared-workspace/src/host/session-io.js` `acquireClaim/renewClaim` | **逻辑复用**（把 `sessionId` 换 `runId`）；若共桶可直接调其内部函数 |
| 条件写/弱ETag剥壳 | `dsh-nano-shared-workspace/src/host/s3.js` | CAS 头 + `W/` strip 已处理 MinIO 兼容 |
| `ctx.llm` 桥 | `test/spike/notepad-wasm-fx/host-scaffold/index.js` | §7.3 合同可直接抄 |
| `ctx.attachments` | `attachments` inject（V-13 已证） | 图像 `image_url`→`saveImage`→`ImageBlock` |
| 持久化事件溯源理念 | `dsh-session-persistence-jsonl`（`session.v4.jsonl.zstd` append-only + 字节前缀切片） | 「body/*.part append-only + meta 只推进指针」的写入范式可借给 sqlite-2-s3 的 WAL checkpoint 打包 |

### 8.2 需要新建（管线面）

| 部件 | 建议形态 | 依据 |
|---|---|---|
| **fx 管线子模块** | `dsh-nano-notepad` 内 `fx/` 目录（`createFxEngine` one-shot + provider 桥 + `note_*` host-tools + 固定轻量模型清单） | §9 终态已定 |
| **sqlite-2-s3 复制器** | host 侧一个新 `sqlite-s3-sync`：WAL checkpoint → 打包 → `PUT manifest`（etag CAS）+ restore-on-boot | 本地副本+s3 真源的唯一实现点 |
| **run/产物级 claim 封装** | `notepad` host 内 `claims.js`：调 `acquireClaim` 形状的 s3 原语，键 = `runId`/`artifactKey` | F-1 锁定 |
| **durable kinds schema** | IDB + sqlite：`prompt/note/draft/knowledge/memory` + `via`/`supersedes`/`rejectCount`/`epoch` | §8.2 of charter |
| **管线执行器** | wasm 内 JS：intake→LS-RAG→embed→沉淀，状态写本地 sqlite | 执行+状态同沙箱 |
| **LS-RAG 管线** | **全量 g0/g1/g2** JS+WASM 重写，逐层搬 MKB `services/ls_rag` 语义 | A4 裁决：真实 RAG 引擎，执行底线不简化 |
| **notepad 独立 s3 桶 + claim 面** | `credentials`+`dsh-s3-client` 指向 notepad 自有桶（**测试桶已定：`.env.s3` `S3_NOTEPAD_*` → `nano-notepad.saobao.com` / `dsh-nano-notepad-test`，scoped svcacct**），键=notepad 命名规范；claim 语义复刻 `session-io` | A3 裁决：不挂 shared-workspace，独桶+独命名。**独桶 V-17b 回归已 PASS**（见 §8.5） |
| **MCP/RPC 跨插件授权面** | host 侧路由暴露知识库供其它插件读（授权+协议层） | A3 裁决：shared-workspace 调取 notepad 的唯一通道 |

### 8.3 接入顺序建议

1. **先落 fx 子模块 + 桥**（§7.3 合同）——已有 spike 全绿，风险最低。
2. **落 durable kinds schema**（IDB 先行：five-kind + draft 状态机）。
3. **落 sqlite-wasm + 本地执行态**（runs/checkpoints/幂等键）。
4. **落 sqlite-2-s3 复制器**（dsh-s3-client + manifest CAS），目标 = **notepad 独立桶**（A3），bucket 选定后先跑 V-17b CAS 回归。
5. **落 notepad 自有 claim 面**（复刻 `session-io` 语义到 notepad 命名规范键，A3/A2）。
6. **远端对话**（如需 MKB 共存 → `api/public|internal` 薄 fetch；如需跨插件暴露 notepad → MCP/RPC 授权面，A3）。

### 8.4 明确不做

- **不开第二个插件**：`nano-mkb` 不建议——基础设施（桥/attachments/fx/durable kinds/provenance）全在 notepad 立项内，拆出即重复。
- **不搬 MKB 服务**：FastAPI/uvicorn/Turso/29 migration/team/Next 控制台——服务形态非插件形态，重写即再造。
- **不上 fencing 数据结构**：MKB 进程内 fencing 不搬，s3 claim 原语已等价。

### 8.5 第三轮 spike 实证（V-15–V-19，2026-11-12 全 PASS）

> 本节把 spike B 类数据接回业主心智模型：五条张力全消，A 类裁决输入已就绪。

| 命题 | 实测 | 对设计的影响 |
|---|---|---|
| **V-15 sqlite+OPFS** | 主线程无 SAH/SAB；**同源 Worker `{type:'module'}` 内 `installOpfsSAHPoolVfs` 成立**，50 写 80ms，reload 存活 | 「自主打包 wasm 环境」成立，但形态=**自写 sqlite worker**（`installOpfsSAHPoolVfs→initWorker1API`），非主线程 DB；kvvfs/`:memory:`+serialize 是降级面 |
| **V-16 fx+sqlite 共存** | fx JSPI 主线程 + sqlite worker：3 turn `end_turn` + 12 行交错，3.7s，堆增量 ~0.8MB | 「执行+状态同环境」成立——sqlite 独占一 worker、fx 主线程，不互相饿死；A1 双轨（机器态 sqlite-worker、人 kinds IDB）物理可行 |
| **V-17 sqlite-2-s3** | 24576B db `ifNoneMatch:*`→取回→deserialize→3 行还原；**`If-None-Match`/`If-Match` 真 412**；`promiser("export")` 给出 worker→s3 导出 | sqlite-2-s3 闭环成立；F-2 修订（§7.4 实测注记）；「全 durable state 为 HA sqlite」= 本地 OPFS 副本 + s3 manifest CAS 真源，模型可落地 |
| **V-18 claim 原语** | `run-*` acquire/renew/read/release 全生命周期；`/` 键 `schema:badKey`；同键并行双写者恰一 acquired | claim 语义复用成立；A2 有实测约束——**artifact 键必须扁平**（`kb-<sha>`/`art-<id>`，不能 `kind/path`） |
| **V-19 pdf.js** | `pdf.mjs`+module-worker sdk 分发，`getTextContent` 124ms 抽文本层 | intake 文本层走页内 pdf.js；扫描件走 vision/attachment 通道——双路定案 |
| **V-17b 独桶回归** | `.env.s3` `S3_NOTEPAD_*`（`nano-notepad.saobao.com`/`dsh-nano-notepad-test`，scoped svcacct）上 `ifNoneMatch`/`ifMatch` 真 412、claim acquire 成立、scoped 凭证鉴权通过 | A5 裁决的探针义务对当前测试桶已满足；A3 独桶方案实测可行 |

**对 A 类裁决的输入**（原 §3.1 A1–A5，V-15–V-19 数据回后提交）：

- **A1 KB 落点**：**裁决（业主授权，2026-11-12）——按「内容 vs 状态」分层，双轨落定**。
  - **五 kinds 的产物本体（含机器 kinds draft/knowledge/memory）→ notepad 既有 IDB note store**。理由：① draft/knowledge/memory 是**产物文档**不是执行态——人从 UI 读/reject/提炼、MCP 从这里取语料，与 prompt/note 同形同质，单一 IDB store 保住统一 UI 面与 reject 状态机（supersedes/rejectCount 是文档字段）；② 既有 note store 已被产品验证，迁移无收益；③ 「draft seam」由此消解——draft **本体在 IDB**，sqlite 只记产生它的 run 血缘（provenance/epoch），元数据与正文各归其位。
  - **管线执行态 → sqlite-worker OPFS**（runs/checkpoints/epoch/幂等键），sqlite-2-s3 manifest CAS 同步到 notepad 独桶。理由：V-15 实测该环境唯一 OPFS 形态就是 worker sahpool；执行态天然关系型（幂等键查重、epoch 推进、claim 记账），IDB 干这个要手写二级索引。
  - **LS-RAG 索引（g0/g1/g2 chunks/embeddings）→ sqlite-worker OPFS**。理由：A4 裁决的 LS-RAG 需要关系检索面（chunk↔doc 映射、向量扫描、分层命中），是 sqlite 的主场；且索引是**派生态**——IDB 语料是真源，索引可重算重建，坏了不丢语料。检索时以 `docId` 回指 IDB 正文。语料本体跨设备备份是独立议题，v1 只承诺管线态上 s3。
- **A2 claim 键组织**：**裁决（业主授权，2026-11-12）——扁平三段命名空间**。
  - 形态：`run-<ulid>`（执行租约）/ `art-<id>`（产物级写锁）/ `kb-<sha256hex>`（内容寻址 KB 对象），全部匹配实测约束 `SESSION_ID_RE`（`[A-Za-z0-9_-]{1,128}`，无 `/`——`knowledge/art-01` 已被 `schema:badKey` 拒）。
  - 存储：claim 对象落在 **notepad 独桶** `nano-notepad/claims/{key}.json`（A3 裁决的自有桶+自有命名），复刻 session-io 的 CLAIM_KEYS 白名单/90s TTL/全轮竞态拒写语义。
  - 理由：① `run-`/ `art-`/`kb-` 前缀天然分流三种租约语义，ULID 带时间序可排查活锁；② `kb-<sha>` 用内容哈希做键，写同内容即同锁——天然幂等，与 CAS 对象语义同构；③ 扁平键使 `SESSION_ID_RE` 成为免费校验器，不用另写 schema。
- **A3 workspace 命名空间**：**业主裁决（2026-11-12）**——**不挂 shared-workspace**。命名遵守 notepad 自己的命名规范，存储在 **notepad 的独立桶**（不复用 `dasw-1112-shared`）。**shared-workspace 若要调取 notepad 内容，必须走插件↔插件的授权通道——内部 MCP 或 RPC 接口与协议，不经共享桶直读**。推论：§8.3「接 shared-workspace claim 面」改为「notepad 独占桶 + notepad 自有 claim 面」；远期 MCP 暴露知识库一项（§8.1 层 3）**升级为本裁决的正式边界**——不是可选增强，是唯一的跨插件读取协议。
- **A4 LS-RAG 保真度**：**业主裁决（2026-11-12）**——**全量 g0/g1/g2 都上，LS-RAG 执行底线守住**。LS-RAG 是业主的真实 RAG 引擎，**不允许简化**。JS+WASM 重做管线时按 MKB `services/ls_rag` 逐层搬全量语义（quote-cuts/分层粒度/兜底），不做单层近似。
- **A5 CAS 硬需求**：**裁决（业主授权，2026-11-12）——CAS-capable 是硬门槛 + 端点级启动探针，R2 非硬需**。
  - 判定：notepad 独桶所选端点**必须**通过 CAS 一致性探针（复用 V-17b 脚本：`ifNoneMatch:*` 二写、`ifMatch:bogus`、`ifMatch:real` 三组用例）；**启动时跑一次、探针不过则关闭共享写面**（claim/manifest CAS 路径拒服务并显式上报 `cas-probe:fail`，本地读写不受影响）。
  - R2/pgs3/MinIO 均合规——V-17b 已实测 MinIO 链路可返真 412，不再按端点名区分档位。
  - 理由：① fencing 的唯一真实依据是「这条链路此刻真的 412」，端点名只是先验（MinIO 实测可用即证）；② 部署面会变（换域、换后端、CF 策略改动），名判定案会腐化，启动探针是活保障；③ 探针不过即关共享写面——把「CAS 失效」从静默数据撕裂变成显式功能降级，符合 F-2 宁 fork 不撕裂的语义。
  - 直写 MinIO（不经条件写感知链路）的部署仍保留 diverged→选边降级预案（spec L416），探针负责探测它。

---

（§7 心智模型与分叉锁定 + §8 接入方法 — 2026-11-12 登记；§8.5 spike 实证 — 2026-11-12 第三轮；§9+ 待业主指令续写）
