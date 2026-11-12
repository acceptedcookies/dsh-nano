# test/spike/notepad-wasm-fx — notepad 内置 fx WASM 引擎 + ctx.llm 桥接 spike 宪章

> **一句话定义**：验证「把 libfx 的 `fx-core.wasm` 嵌进 `dsh-nano-notepad`，经宿主桥把它对接到 `ctx.llm`（即 model-selector 同一份模型清单）上跑一个页面内 agent」这条前瞻链路在真实宿主上的每一环是否成立——**JSPI 门槛 → wasm 资产供给 → 引擎装载 → `ctx.llm` 注入 → `prepareCall/stream` → OpenAI↔内部翻译 → host-tool 旁路 → 会话生命周期**。spike 只产事实：每环给 `ego PASS` / `offline PASS` / `RED` 的结论与实测数值，不改任何包源码。

| 锚 | 值 |
|---|---|
| 建档日期 | 2026-11-12 |
| 验证实例 | `https://dsh-dev.local/`（ego-browser，真 Chromium + 真插件宿主 + 真 IndexedDB） |
| 目标域 | `https://dsh-dev.local/`（宿主路由）· `127.0.0.1:3425`（本机 magpie 网关，仅作 `ctx.llm` 链路的下游，不直接打）· npm registry（仅 `libfx` 发布物下载，一次性） |
| 上游真相 | `context/fx/sdk/browser-agent.js`（`createFxEngine`/`createFxAgent`、`wasm` 选项）· `context/fx/sdk/wasm-runtime.js`（JSPI 门槛 L1025、host imports `fx_host_tool_call` L941）· `context/fx/sdk/custom-provider.js`（`openai-chat-completions` 唯一协议 L95、`chat/completions` URL L30、models 元数据四字段 L16-20）· `context/fx/sdk/engine.js`（`supportsJspi` L651、`tools` 描述符与 `execute()` L990-1043、`modelCatalog` L1044-1072）· `context/fx/src/gateway/chat_completions_protocol.zig`（`reasoning`/`fast`/`prompt_caching` 禁发 L171、`reasoning_content`/`reasoning` 收流字段 L327、`finish_reason` 枚举 L763）· `context/deepseek-harness/packages/llm/llm/src/index.ts`（`prepareCall` L975、`stream` L1185）· `packages/llm/llm/src/types.ts`（`GenerateOptions` L564、`StreamChunk` L496、`ToolSchema` L517、`ToolResultMessage` L299）· `dsh-nano-model-selector/index.js`（`inject=['llm']` 既成先例 L13、catalog 组装 L89-140）· `~/.dsh-dev/profiles/web/cordis.patch.yml`（magpie provider 定义 L16-…） |
| 证据上限 | 本 spike 不承诺最终 UI 形态、不承诺持久化会话、不承诺 tool-call 双向往返、不承诺非 `ctx.llm` 路径（直连 magpie/AI Gateway）；只回答「嵌入、桥接、旁路、生命周期」四件事在 `dsh-dev` 上的可行性与代价量级 |

**边界声明**：不改 `dsh-nano-notepad/src/**`、`dsh-nano-model-selector/src/**`、`dsh-nano-ui` 任何文件、IDB schema、profile 的 dependencies。宿主侧验证全部走 `test/spike/notepad-wasm-fx/host-scaffold/` 里的**一次性脚手架插件**（spike 专属，验收通过即删，不写回 notepad）。ego-browser 实验只过 `page.evaluate` + `page.screenshot`；不外发非锚表声明的域。`dsh.local` 禁重启、禁写。

---

## §1 现状分析：notepad 今天离「内置 fx」有多远

| 层 | 真源 | 已证事实（上一轮回合已建） |
|---|---|---|
| notepad 宿主 inject | `index.js:11` `['webServer','connection','subprocess']` | **无 `llm`**——桥到模型清单需要新增 `'llm'`，model-selector 已有先例 |
| notepad 宿主路由 | `index.js` + `route-guard` 7 条 | `/nano-notepad/*` 命名空间已注册，`requestRejection` 围栏既有 |
| mp 管线 | `fetchMpArticle` + `importMpArticle` | 抓文/消毒/存 `.html`/`meta.mp` 全链路已通；**无 agent，无 LLM 调用** |
| 文件写通路 | `saveDraft`/`commitVersion`/`import()` | 旁路写工具可直接复用同一条管线，自动继承版本历史 |
| model-selector 清单 | `dsh-nano-model-selector/index.js` catalog 路由 | `ctx.llm.listProviders → listModels → resolveModelInfo`；它只读，**不暴露调用面** |
| libfx 浏览器面 | `sdk/browser-agent.js` + `fx-core.wasm` | 引擎、会话、tool-call 全在 WASM；`wasm` 选项可覆盖 URL；`memory()` durability |
| libfx 协议面 | `sdk/custom-provider.js:95` | **`openai-chat-completions` 唯一协议**——桥只需翻译这一个 OpenAI 方言 |
| libfx 模型元数据 | `custom-provider.js:16-20` | 只接 `contextWindow/maxOutputTokens/supportsToolUse/supportsVision` 四字段 |
| `ctx.llm` 请求面 | `llm/src/index.ts` `prepareCall/stream` | `GenerateOptions{provider,model,messages,system?,tools?,maxTokens?,stop?,signal?}` → `AsyncIterable<StreamChunk>` |
| 翻译面 | `llm-pi-ai/tests/protocol-roundtrip.spec.ts` | dsh 已有 OpenAI↔内部 的 adapter 测试语料可作翻译合同的对照 |

**关键判定（本 spike 的出发点）**：技术链路四层全部可拆——「引擎侧」= JSPI + wasm 装载 + host-tool 回调；「桥侧」= `ctx.llm` inject + prepareCall + OpenAI SSE 翻译；「资产侧」= wasm 二进制分发；「会话侧」= memory durability + 取消传播。其中 **V-01（JSPI）一票否决整个 WASM 方案**，**V-04/V-05/V-06** 共同决定 `ctx.llm` 桥能不能在宿主上成形。

## §2 目标对象解析：libfx + ctx.llm 两个合同面

| 部位 | 特征 | 对桥接的含义 |
|---|---|---|
| `fx-core.wasm` 装载 | `createFxEngine({wasm: URL})`；JSPI 必须；`supportsJspi()` 探测 | 门槛探测先行，不可用则整体改道 N-API |
| custom provider | `{name, baseUrl, models}`；`baseUrl` 自动拼 `/chat/completions`；`name` 禁 `gateway/codex/grok` | 把 `ctx.llm` 藏在 `/nano-notepad/fx` 后，fx 只认一个 baseUrl |
| 模型寻址 | OpenAI `model` 字段单字符串；`ctx.llm` 要 `provider`+`model` 双键 | 需要无歧义编码（§5-决策点） |
| 请求翻译 | `messages`/`tools`/`max_tokens`/`stop`/`stream_options.include_usage` → `GenerateOptions` | OpenAI `tool` role → `ToolResultMessage`；`tool_calls` → `tool-call` block |
| 流式翻译 | `StreamChunk` → OpenAI SSE chunk | `reasoning-delta→reasoning_content`；`finish→finish_reason`（仅 4 枚举） |
| `reasoning_effort` | **fx 在 chat-completions 线下不发**（[:171](context/fx/src/gateway/chat_completions_protocol.zig)） | 推理档不可选，v1 用 provider 默认档；产品上要决策是否接受 |
| host tool | `fx_host_tool_call` host import → JS `execute()` 回调 | notepad 文件读写旁路的物理通道；`writes`/`idempotent` 元数据入描述符 |
| durability | `memory()`（默认）/`local()`/`vercel()`/自定义 World | **v1 走 `createFxEngine` 引擎级 one-shot（无 durable 层）**；会话不持久化是产品决定，不是技术缺口 |
| 资产体积 | `fx-core.wasm` 实测字节数（libfx 0.0.16 发布物） | 决定「宿主路由流式」vs「bundle 内嵌」 |
| WASM 环境 | 禁原生工具；`shell.run` 仅 `{action:'run'}` 类型化边界 30s；`readFile` 仅 AGENTS.md | notepad 的 `note_*` 工具必须走 `fx_host_tool_call`，不能靠 workspace host |

## §3 可验证命题（V-xx）

| ID | 命题 | 方法 | 判读门槛 | 终态 |
|---|---|---|---|---|
| **V-01** | ego-browser 的 Chromium 支持 JSPI（`supportsJspi()` 为 true，且 `WebAssembly.Suspending`/`promising` 存在） | `page.evaluate` 直接调 `supportsJspi()` + 记录 `navigator.userAgent` | 返回 `true` 且版本 ≥137；`false` 则整个 WASM 路线 RED，走备选 N-API | **ego PASS** |
| **V-02** | `libfx` 0.0.16 的 `fx-core.wasm` 可以拿到，且体积可分发 | `npm pack libfx@0.0.16` → `samples/fx-core.wasm`；记字节数；跑 `wasm-opt -Oz` 看还能不能再压 | 拿到字节数与可选的优化后字节数；>8MB 记为风险（接近 route bodyLimit） | **offline PASS** |
| **V-03** | `fx-core.wasm` 能在 dsh-dev 页面里被 fetch+编译，宿主静态路由/ArrayBuffer 供给都成立 | 一条 spike 脚手架路由吐 `application/wasm`；浏览器 `createFxEngine({wasm:'/…/fx-core.wasm'})` 到「instantiate 完成不抛错」 | 引擎实例创建成功（`await` 不抛），`WebAssembly.Module` 存在 | **ego PASS** |
| **V-04** | notepad 宿主可 inject `llm` 并拿到 `ctx.llm`（先例已证，但要本插件实测绑定） | `host-scaffold` 一个 spike 插件 `inject=['llm']`，暴露 `ctx.llm.listProviders()` 到一条临时 GET 路由 | 路由 200 且返回的 provider 列表含 `magpie`；注入报错/undefined 记 RED | **ego PASS** |
| **V-05** | `ctx.llm.prepareCall({provider:'magpie',model:'…'}).stream(GenerateOptions)` 能拉出真实流并经桥翻译成 OpenAI SSE | 同一条临时路由 POST 一个最小请求，宿主把 `StreamChunk` 翻成 `chat.completion.chunk` SSE；离线侧校验块序 | 收到 `role:assistant` 首块 + `reasoning_content`/`content` delta + `finish_reason` + `usage` + `[DONE]`；magpie 不可用时降级到「adapter 被调用」证据 | **ego PASS** |
| **V-06** | `StreamChunk` → OpenAI `chat.completion.chunk` 的翻译能对齐 fx 解析器（`chat_completions_protocol.zig`） | 离线翻译器：把 V-05 实测 chunk 序列喂给 `text/event-stream` 生成器，产出 SSE；再用 fx 同款 parser 逻辑（或直接用真实 engine 发一次 mock 请求）验证不抛 `InvalidChunk`/`InconsistentFinishReason` | fx 引擎完整消费一段 SSE 不抛协议错；`reasoning-delta` 映到 `reasoning_content`；`finish` 映到合法 `finish_reason` | **ego PASS** |
| **V-07** | `provider`+`model` 双键能无损编进 OpenAI `model` 单字段 | 编码方案（建议 `provider~model`，`~` 不在任一现存 id 内）过 `custom-provider.js` 的 `models` 校验（≤1024B、合法字符）；对 dev profile catalog 全量 id 跑一次冲突扫描 | 全量 id 无 `~`；编码后的 `models` 键通过 `modelMetadata()`；host 拆分能还原 provider/model | **ego PASS** |
| **V-08** | JS `tools` 的 `execute()` 能从 WASM 引擎里被调回来（`fx_host_tool_call` 通路） | 离线：按 `engine.js` 的 `descriptors/executors` 构一个 `note_test` 工具，验证序列化后描述符合规；ego：若 V-03/V-05 已通，发一个 prompt 强制触发 `note_test` 调 JS | 描述符过 `normalizeTools`；ego 实测 JS `execute` 被调用、返回值进引擎（任一即可，后者更强） | **ego PASS** |
| **V-09** | `memory()` durability 的会话生命周期与取消传播 | `createFxAgent({provider:custom,model:…,durability:memory()})` → `session().prompt('hi')` → 中途 `AbortSignal.abort()` | `prompt` 的 `turn` 以 abort 结束；宿主侧 `ctx.llm.stream` 的 `signal` 同步触发（V-05 的脚手架路由记录 abort） | **ego PASS** |
| **V-10** | 引擎资源开销量级（wasm 实例化耗时、首个 prompt 延迟、JS 堆/IDB 增长） | `performance.now()` 量 V-03 实例化耗时、V-09 首包/首字耗时、`navigator.storage.estimate()` 前后差 | 记录数字不定阈值；给出「每 notepad 实例一份 wasm」的成本结论 | **ego PASS** |
| **V-11** | 模型清单一致性：notepad `/fx/models` 与 model-selector `/catalog` 输出在同一份 `ctx.llm` 下逐字节相等 | 两条路由各 GET 一次（后者需已登录页面对象），diff JSON | 一致记 PASS；不一致列出差异（顺序/字段缺失） | **ego PASS** |
| **V-12** | 持久化会话可行性：自实现 `World` 接 IndexedDB 的最小成本 | 离线：按 `sdk/durable/world.mjs` 接口写 IDB-backed `world()` 骨架（不接线），验证 `createFxAgent({durability:world(idbWorld)})` 类型签名可过 | 骨架编译通过且 `turn.accepted` 拿到 `sessionId`；不验证崩溃恢复 | **offline PASS**（骨架；画像定案后**永不接线**） |
| **V-13** | 图像入向：fx `image_url` 块 → `ctx.llm` `ImageBlock`（`ctx.attachments.saveImage`）能闭环 | 宿主侧 inject `attachments`；ego 发 canvas 图像的 `image_url` POST；看 `saveImage` 是否被调、`ImageBlock` 是否进 messages、模型能否读出图中文字 | 桥 200 + `saveImage` 回 `attachmentId` + 模型输出含图中文字（本例 canvas 写的 `FX`）；attachments 缺失/不可用时记 RED | **ego PASS**（`saveImage` 闭环，模型回「FX」，411 prompt tokens 含图像） |
| **V-14** | `createFxEngine` 引擎级 one-shot（无 agent/session/durability）形态成立且成本可测 | ego：`createFxEngine({wasm,provider,model,instructions})`（不建 session、不接 durable），`engine.prompt(一次性)` 收 finish；记 `runtime.ready`→`stopReason` 耗时 | `prompt` 是函数、`turn.result.stopReason==='end_turn'`、无 `accepted`/`session` API 也能跑通；记 engine 级耗时给 §8-4 定案背书 | **ego PASS**（引擎级 `end_turn`，整 turn **858ms**；`sessionId` 存在但非 durable session） |
| **V-15** | sqlite-wasm + OPFS 在 ego-browser 可用——「自主打包 wasm 环境」的可行性根基 | `@sqlite.org/sqlite-wasm` 经 sdk 路由分发；页面内开 OPFS db、建 `runs`/`checkpoints` 两表、写入读回；量 `storage.estimate()` 与 reload 后存活 | OPFS db 打开、写读一致、reload 后数据存活；不可用则降级 host-node sqlite | **ego PASS**（形态修正：主线程无 SAH/SAB，但**同源 Worker 内 SAH 可用**→`installOpfsSAHPoolVfs` 成立；50 写 80ms；reload 存活 50 行。证据 `evidence/v15-opfs-worker.md`） |
| **V-16** | fx-core.wasm 与 sqlite-wasm **同页面沙箱共存**（执行+状态同环境） | 同一 `page.evaluate` 内 instantiate 两个 wasm，跑 `engine.prompt` + sqlite 事务交错，量内存增量与是否有互相饿死 | 两 wasm 共存且各自正常；失败则分双沙箱（fx 一 worker、sqlite 一 worker） | **ego PASS**（fx 主线程 JSPI + sqlite worker 线程：3 turn `end_turn` + 12 行写入、交错 3.7s、堆增量 ~0.8MB，无互相饿死。证据 `v16-coexist.json`） |
| **V-17** | sqlite-2-s3 复制闭环：`serialize → PUT manifest(etag CAS) → 重建 → 行一致` | 页面导出 db 字节 → 宿主 `dsh-s3` mini client `PUT spike/manifest`（etag CAS）→ 清 OPFS → restore → 校验行数/内容 | 一轮写-毁-复原后行完全一致；CAS 语义在现网端点生效（MinIO 上观测 If-Match 实际行为） | **ego PASS**（24576B db → `ifNoneMatch:*` 创建 → 取回 → `sqlite3_deserialize` rc=0 → 3 行还原。**CAS 实测：`If-None-Match`/`If-Match` 在本链路（saobao→MinIO via CF）返回真 412 conflict**——F-2「MinIO 无 CAS」前提证伪。`promiser("export")` 给出 worker→s3 导出路径。证据 `v17-sqlite-s3.md`） |
| **V-18** | shared-workspace claim 原语可用于非 session 键（`runId`/artifact） | 宿主侧复刻 `acquireClaim/renewClaim`（搬逻辑不搬文件），打 `run-01HX…` 形键 + 含 `/` 键验证 `SESSION_ID_RE` 边界；测 CAS 竞态拒写 | `run-*` 键通过（`[A-Za-z0-9_-]{1,128}`）；`/` 键被拒→扁平化方案定案；双写者并发只有一个 `acquired:true` | **ego PASS**（`run-*` 全生命周期 acquire/renew/read/release；`/` 键被 `schema:badKey` 拦；**同键并行双写者恰一 acquired**；release 即转手。证据 `v18-claims.md`） |
| **V-19** | PDF text-layer 摄取两路：`pdf.js`(wasm 页面内) vs 宿主 `subprocess`(pdftotext) | `pdfjs-dist` 经 sdk 路由分发，页面内抽取 fixture PDF 文本层；对比宿主 subprocess 输出 | pdf.js 页面内抽出可用文本层→走页内路；不达标→宿主 subprocess（inject 已有） | **ego PASS**（`pdf.mjs`+module-worker 经 sdk 路由，`getDocument→getTextContent` 124ms 抽出文本层「Dummy PDF file」；文本层路径定案，扫描件走 vision/attachment 通道。证据 `v19-pdf.json`） |

### §3.1 张力消融登记（2026-11-12 第二轮追加）

V-15–V-19 是新一轮「管线 durable state + 共享并发」命题的 spike，对应业主三条修正：

| 张力 | 对应命题 | 消融目标 |
|---|---|---|
| sqlite 放哪 | V-15/V-16 | 自主打包 wasm 环境（fx+sqlite 同沙箱）物理成立 |
| durable state 形态 | V-17 | sqlite-2-s3 写-毁-复原闭环；s3=真源 |
| 多写者 fencing | V-18 | claim 原语复用到 run/artifact 键；`SESSION_ID_RE` 边界实测 |
| intake 完整性 | V-19 | PDF 摄取两路定案 |

**A 类裁决项（不经 spike）**：全部落定（2026-11-12）——A1=内容/状态分层双轨、A2=扁平三段 claim 键、A3=notepad 独桶+独命名+MCP/RPC 跨插件授权、A4=LS-RAG 全量 g0/g1/g2 不简化、A5=CAS-capable 硬门槛+启动探针。A3/A4 业主亲裁，A1/A2/A5 业主授权按推理定案（eval §8.5）。

## §4 测试需求

| 需求 | 说明 |
|---|---|
| 环境 | `https://dsh-dev.local/` + ego-browser；宿主侧 `host-scaffold/` spike 插件（经 `~/.dsh-dev/plugins/` + `node_modules` symlink 装载，`dsh plugin --profile web add` 指向日常实例不可用）；本机 magpie 网关 `127.0.0.1:3425` 在线 |
| 依赖供给 | `npm pack libfx@0.0.16` → `samples/`（一次性，gitignore）；如需翻译对照，引 `llm-pi-ai/tests/protocol-roundtrip.spec.ts` 的用例格式 |
| 灌入数据 | 未灌入 notepad 文件（本 spike 用独立 scaffold prompt，不触碰 `__nanoNotepad`） |
| 安全边界 | 不直连 magpie baseURL 测 `ctx.llm` 之外的任何东西；不在 spike 里写 notepad 真实笔记文件；host-scaffold 路由不开放写操作 |
| 还原 | spike 收尾时 `rm -rf ~/.dsh-dev/plugins/dsh-fx-spike-scaffold` + `rm ~/.dsh-dev/profiles/web/node_modules/dsh-fx-spike-scaffold` + `dsh-dev restart`（sync_plugins 也会自动清）；删 evidence/samples/tmp，`dsh-dev` 回到干净态 |

## §5 测试文件树

```text
test/spike/notepad-wasm-fx/
├── README.md                    本宪章（唯一进库文件）
├── .gitignore                   evidence/ samples/ tmp/ host-scaffold/node_modules/
├── evidence/                    截图、SSE dump、measurements（.gitignore）
│   ├── fx-core.wasm             V-03 路由分发的 wasm（与 samples 字节级一致）
│   ├── v05-llm-stream.sse       V-05 真实 ctx.llm 流 → OpenAI SSE
│   ├── v05-toolcall.sse         V-06/V-08 tool_calls 流黄金样例
│   ├── v11-scaffold-models.json V-11 scaffold catalog
│   ├── v11-selector-catalog.jsonV-11 model-selector catalog（逐字段相等）
│   ├── v13-image.sse            V-13 图像块 SSE（模型回「FX」）
│   ├── v15-opfs-worker.md       V-15 OPFS 能力矩阵 + worker 形态 + 备选
│   ├── v16-coexist.json         V-16 fx+sqlite 共存计时
│   ├── v17-sqlite-s3.md         V-17 序列化往返 + CAS 412 实测
│   ├── v18-claims.md            V-18 claim 全生命周期 + 竞态
│   └── v19-pdf.json             V-19 pdf.js 页内抽取
├── samples/                     构造与第三方产物（.gitignore）
│   ├── libfx-0.0.16.tgz         npm pack 来的发布物
│   ├── fx-core.wasm             从 tgz 解出的二进制（2,260,477 B）
│   ├── package/                 tgz 解包目录（sdk/browser.js 等）
│   └── idb-world-skeleton.js    V-12 IDB World 骨架
├── tmp/                         ego-browser 脚本（.gitignore）
│   ├── check-jspi.mjs           V-01
│   ├── check-wasm-bytes.mjs     V-02 字节级比对
│   ├── check-v04-wasm.mjs       V-04 models + wasm 路由
│   ├── check-v05.mjs            V-05 真实流
│   ├── check-v03-v10.mjs        V-03/V-06/V-08/V-10 引擎+工具+计时
│   ├── dump-toolcall-sse.mjs    V-06 tool_calls SSE 取证
│   ├── check-v07-v10-v11.mjs    V-07 编码扫描 + V-10 storage + V-11 diff
│   ├── check-v09.mjs / v09b.mjs V-09 abort + lastAbort 回读
│   ├── check-v13-v14.mjs        V-13 图像桥 + V-14 引擎级 one-shot
│   ├── check-v15-worker*.mjs    V-15 worker+sahpool（含 V-15b reload）
│   ├── probe-opfs.mjs / probe-worker*.mjs  V-15 能力探针（SAH/SAB 矩阵）
│   ├── check-v16.mjs            V-16 共存交错
│   ├── check-v17*.mjs           V-17 序列化往返 + CAS 冲突 + worker export
│   ├── check-v18.mjs            V-18 claim 竞态
│   ├── check-v19.mjs            V-19 pdf.js
│   └── check-sdk.mjs            sdk 路由冒烟
└── host-scaffold/               spike 专属宿主插件（验收后整目录删除，不进库）
    ├── package.json             dsh-fx-spike-scaffold
    ├── AGENTS.md                安装契约
    ├── cordis.patch.yml         insert 名称→插件解析
    ├── index.js                 inject=['webServer','connection','llm','attachments','credentials']；路由见下
    ├── lib/fx-core.wasm         由 samples 拷来
    ├── lib/spike-s3.js          shared-workspace s3.js 逐字复刻（UA 改 spike 名）
    ├── lib/spike-claim.js       session-io claim 语义在任意键上的复刻（SESSION_ID_RE 守卫）
    └── lib/fx/                  sdk/*.js（页面 ESM 表面，经 /nano-fx-spike/sdk/ 分发）
        ├── sqlite3.mjs / sqlite3.wasm / sqlite3-worker1.mjs / sqlite3-opfs-async-proxy.js   V-15
        ├── spike-sqlite-worker.mjs    V-15 自写 worker：installOpfsSAHPoolVfs → initWorker1API
        ├── opfs-worker-probe.js       V-15 能力探针（worker 内 SAH/SAB 检测）
        └── pdf.mjs / pdf.worker.mjs / sample.pdf                       V-19
```

**宿主部署路径（实测）**：dev 实例不识别 `dsh plugin --profile web add`（那条命令指向日常实例）。实际装载是 `cp -R host-scaffold → ~/.dsh-dev/plugins/dsh-fx-spike-scaffold` + `ln -s → ~/.dsh-dev/profiles/web/node_modules/dsh-fx-spike-scaffold` + `launchctl kickstart -k gui/…/ai.deepseek.dsh.dev.web`。`dsh-dev restart` 会 `rm -rf plugins/`，天然还原。

## §6 预期测试结果登记位置

| 登记项 | 位置 |
|---|---|
| 每条 V 的终态词 + 关键实测值 | 本 README §3 表格「终态」列 + §7 过程/结论 |
| 截图/原始 dump | `test/spike/notepad-wasm-fx/evidence/`（`.gitignore`，不入库；README 只写指针与数字） |
| 翻译合同草案（OpenAI↔StreamChunk 的映射表） | §7.3 小节落成 Markdown 表，供后续 notepad 实现直接抄 |
| `note_*` host-tool 描述符草样 | §7.4 小节落成 JSON 片段，供 notepad client 集成时参考 |
| 风险与决策建议 | §8「产品功能定案」：WASM vs N-API 选择、provider~model 编码、reasoning_effort 缺失的处置、durability 选型 |
| 收口状态 | 全部 V 定稿后，把终态表搬到 §9；宪章与 samples 可在产品实现立案后整目录删除 |

**转正路径**：本 spike 收口后，结论进 `docs/specs/dsh-nano-notepad/`（新增「内置 fx 引擎」一节）或业主指定的设计文档；宪章与样品随转正整目录清除。

---

## §7 取证过程与结论（待执行）

### 7.1 前置检查清单（跑 V 前先过）

- [x] `dsh-dev` 实例在线，`https://dsh-dev.local/` 可开
- [x] `magpie` 网关 `127.0.0.1:3425` 在线且 `MAGPIE_GATEWAY_KEY` 环境就绪
- [x] `libfx@0.0.16` 已 `npm pack` 到 `samples/`
- [x] `host-scaffold` 插件已部署（经 `~/.dsh-dev/plugins/` copy + `node_modules` symlink + `launchctl kickstart`；`dsh plugin --profile web add` 指向日常实例，不可用）
- [x] ego-browser 会话就绪

### 7.2 关键事实清单

| 项 | 实测 |
|---|---|
| V-01 JSPI | **ego PASS** — `WebAssembly.Suspending`/`promising`/`compileStreaming` 均 true，UA `Chrome/156`。WASM 路线成立。 |
| V-02 wasm 体积 | **offline PASS** — `libfx@0.0.16` `fx-core.wasm` = **2,260,477 B（≈2.16 MB）**。路由流式分发，浏览器端字节级一致。 |
| V-03 wasm 实例化 | **ego PASS** — `createFxAgent` + `wasm:` 选项，`runtime.ready` 在 **~450 ms**（首跑）/`~283 ms`（次跑，HTTP 缓存）内触发；`WebAssembly.Module` 成立。 |
| V-04 `ctx.llm` | **ego PASS** — scaffold `inject:['llm','webServer','connection']` 成功；`/nano-fx-spike/models` 返回 `deepseek-official`(2) + `magpie`(51)，全量 53 id。 |
| V-05 真实流 | **ego PASS** — `prepareCall().stream()` 真实拉流，`reasoning_content`/`content`/`usage`/`finish_reason`/`[DONE]` 齐全；模型回「bridge works」。 |
| V-06 翻译合同 | **ego PASS** — fx 引擎消费整段流，`end_turn` 收官，无 `InvalidChunk`/`InconsistentFinishReason`。翻译坑见 §7.3。 |
| V-07 `provider~model` | **ego PASS** — 全量 53 个 id 无 `~`；复合键如 `deepseek-official~deepseek-flash`、`magpie~auto/deepseek-v4.1-flash-1017`；`custom-provider.js` 只暴露 `customProviderDefinition`/`customProviderSpec`（无独立 `modelMetadata` 导出，校验发生在 provider 装配内）。 |
| V-08 host-tool | **ego PASS** — `note_test` 工具经 `tools`+`idempotent:true` 声明，fx 引擎回调 JS `execute({probe:'hello'})`，`tool_end` 事件后模型复述返回值。 |
| V-09 取消传播 | **ego PASS** — `prompt(...,{signal}).abort()` → `stopReason:'cancelled'`；宿主侧 `res 'close'`（非 `req 'close'`）捕获 client abort，`abortState.lastAbort` 记时戳，`ctx.llm` 的 `ac` 同步中止。 |
| V-10 资源开销 | **ego PASS** — wasm 实例化 ~450 ms（冷）/~283 ms（热）；首 text delta ~1.7 s（含模型首包）；`storage.estimate()` 前后 usage 不变（memory() 不落盘）。 |
| V-11 模型一致性 | **ego PASS** — `/nano-fx-spike/models` 与 `/nano-model-selector/catalog` 在同一份 `ctx.llm` 下逐字段相等（53 models，`groups`/`failures`/`generatedAt` 同构）。 |
| V-12 IDB World | **offline PASS（骨架）** — `samples/idb-world-skeleton.js` 给出 IDB-backed `World` 结构（4 store：sessions/stream/images/kv）。可行性成立；queue/lease 投递循环约占真实面 70%。**画像定案后永不接线**——one-shot 不要 durable 会话。 |
| V-13 图像入向 | **ego PASS** — `inject` 加 `attachments`；canvas 画的「FX」图经 `image_url` → `attachments.saveImage` → `ImageBlock` → `ctx.llm` → deepseek-flash → 模型回「FX」。图像桥端到端闭环（411 prompt tokens 含图）。 |
| V-14 引擎级 one-shot | **ego PASS** — `createFxEngine`（不建 session、不接 durable）`engine.prompt('pong')` → `end_turn`，整 turn **858ms**（wasm 热启后）。`sessionId` 存在但仅进程内标识，非 durable session——§8-4 定案的形态被实测背书。 |

### 7.3 翻译合同（V-06 收口实测）

| `StreamChunk` | OpenAI `chat.completion.chunk` | fx 侧约束（实测踩过的坑） |
|---|---|---|
| 首个块 | `delta:{role:'assistant'}` | `role` 必须 `'assistant'`，多一个/错值→`InvalidChunk` |
| `block-start` | （折叠，不单独发） | 无对应 OpenAI 概念 |
| `text-delta` | `delta:{content}` | `content` 必须 string；追加语义 |
| `reasoning-delta` | `delta:{reasoning_content}` | 字段名须 `reasoning_content`（非 `reasoning`） |
| `tool-call-delta` | `delta:{tool_calls:[{index,id?,type:'function',function:{name?,arguments}}]}` | **`index` 须 0 起连续**（ctx.llm 给的是块序，须 slot 重映射）；`id`/`name`/`arguments` 全是**追加**语义——id/name 只在首个 delta 发，arguments 逐片 |
| `block-end` | （折叠） | 无对应概念 |
| `usage` | 缓冲，随 finish chunk 发 | `accept_usage(usage, final)` 只在带 `finish_reason` 的块标 final；**`total_tokens` 必须 == prompt+completion**（deepseek 报 333≠166+39，须重算为 input+output，reasoning 本就含在 completion 内） |
| `finish` | `delta:{}` + `finish_reason` + `usage` | kind→`{stop→stop, tool-calls→tool_calls, max-tokens→length, aborted/error→stop}`；finish 块的 delta **不得**重发 tool_calls（追加语义会双重拼接） |
| 终止 | `data: [DONE]` | 须在 `phase==finished` 后到达 |

**宿主侧取消**：Node HTTP/1.1 下 client abort 触发 `res 'close'`（`resClose`），`req 'close'`/`req 'aborted'` 实测均不触发——abort 监听要挂 `res`。

### 7.4 host-tool 草样（V-08 实测 `note_test`）

```js
{
  name: "note_test",                    // ≤64，fx 强校验
  description: "Return a fixed string.",
  inputSchema: { type: "object", properties: { probe: { type: "string" } } },
  idempotent: true,                     // fx 强制布尔：重跑安全→true
  execute: async (args) => {            // args 已按 schema 反序列化
    return "note-ok-42";                // 返回值序列化回引擎
  },
}
```

v1 仍按 `note_read`/`note_write`/`note_list` 命名（`idempotent` 按是否可安全重放定）。§8.2 five-kind 模型落地后，管线工具族语义重述为「读素材（note）/ 写暂存（draft）/ 写沉淀（knowledge）/ 读剧本（prompt）/ 供检索（MCP）」——`execute` 直连 `ctx`/IDB，不经 LLM 往返。

### 7.5b V-15–V-19 过程注记（2026-11-12 第三轮实测）

**V-15 的形态修正（最重要的单条数据）**：ego-browser 主线程**无** `createSyncAccessHandle`、`SharedArrayBuffer`、`crossOriginIsolated` —— 但同源 `Worker`（`{type:'module'}`）内 `createSyncAccessHandle` 可用且实测工作。因此「OPFS sqlite」在本环境**唯一形态 = 自写 worker 脚本**：`init()` → `installOpfsSAHPoolVfs` → `initWorker1API`（官方 `sqlite3-worker1.mjs` 只 bootstrap 不装 sahpool，`open` 会报 `no such vfs`）。备选 `kvvfs`（IDB 后端，主线程可用）与 `:memory:`+serialize 均实测成立，是降级面。

**V-17 的 fork 修订**：`If-None-Match:'*'` 与 `If-Match:etag` 在现网 `https://nano-shared-workspace.saobao.com`（→ MinIO，CF 前置）均返回可识别 `conflict:true`（≡412）——**条件写在这条链路上硬可用**。业主锁定的 F-2「CAS 需 R2/pgs3」被实测降级为「MinIO 亦可，但换端点需回归」；claim/queue/manifest 的 CAS 语义在 dev 端点上已成立。

**凭证坑**：`credentials.resolve('DSH_NSW_IDENTITY')` 返回 `{value,source}` 包装，`value` 是存储的 JSON 字符串（`{username,token,accessKey}`），scaffold 须先取 `resolved.value` 再 `JSON.parse`（shared-workspace `credentials.js` `readIdentity` 同构）。

**两个 API 坑**（实现期照抄）：`db.exec({returnValue:'scalar'})` 非法——用 `db.selectValue()` 或 `rowMode:'array'+resultRows`；`new Worker(url)` 默认 classic 会让 `export {}` 模块静默失败——必须 `{type:'module'}`。

### 7.5 终态表

> **工作画像注记（业主定案，见 §8）**：notepad 是轻量、one-shot、用完即抛、无 durable 的场景。据此 V-09（durability 生命周期）在实测 PASS 之上再定性为「产品不需要」——走引擎级 one-shot；V-12（IDB World）定性为「可行性证过即可，永不接线」；reasoning-effort 缺口消解为「固定轻量模型 + 设置档位映射」。

| 命题 | 终态 |
|---|---|
| V-01 | **ego PASS** |
| V-02 | **offline PASS** |
| V-03 | **ego PASS** |
| V-04 | **ego PASS** |
| V-05 | **ego PASS** |
| V-06 | **ego PASS** |
| V-07 | **ego PASS** |
| V-08 | **ego PASS** |
| V-09 | **ego PASS** |
| V-10 | **ego PASS** |
| V-11 | **ego PASS** |
| V-12 | **offline PASS**（骨架；画像定案后永不接线） |
| V-13 | **ego PASS**（`saveImage`→`ImageBlock` 闭环，模型读图「FX」） |
| V-14 | **ego PASS**（engine 级 `end_turn`，整 turn 858ms） |
| V-15 | **ego PASS**（OPFS 经同源 Worker `opfs-sahpool`；主线程无 SAH/SAB 不是否决项） |
| V-16 | **ego PASS**（fx 主线程 + sqlite worker 共存，3 turn + 12 行交错无饿死） |
| V-17 | **ego PASS**（serialize→s3→deserialize 3 行还原；`If-None-Match`/`If-Match` 真 412） |
| V-18 | **ego PASS**（`run-*` claim 全生命周期；`/` 键 `schema:badKey`；同键双写者恰一 acquired） |
| V-19 | **ego PASS**（pdf.js 页内 124ms 抽文本层） |

## §8 产品功能定案

**工作画像（业主定案，2026-11-12）**：notepad 是**轻量级、one-shot、用完即抛**的工作。没有 sustained 工作流、不要求 durable 留档、基本无二次提问；真实负载是**高并发的多个一次性 tool-call**——「活可能很多，但每个活几乎都是 one-shot」。使用场景与主线 dsh 不同，不是要在 notepad 里干重活。这一画像直接改写 §8 第 4、7 条与 §9 的残余风险。

1. **WASM 路线可行**——否决项 V-01 通过（Chrome 156 JSPI），wasm ~450 ms 冷启、~283 ms 热启，可接受为 notepad 按需加载。
2. **桥 = `ctx.llm` → OpenAI `/chat/completions`** 成立，且**必须过 model-selector/`ctx.llm` 不能直连 magpie**（与既定口径一致）：`prepareCall` 的 call-config 冻结模型+采样，`stream()` 需摊 `prepared.config`；reasoning/finish/usage/tool_calls 按 §7.3 翻译即可对齐 fx 严格解析器。
3. **`provider~model` 复合键**无损编码双键，`~` 不与任何现存 id 冲突，可安全充当 OpenAI `model` 字段。
4. **durability = 不需要，走 `createFxEngine`（engine 级 one-shot）而非 `createFxAgent`+`memory()`**——画像里没有留档/恢复/续聊，`session()/turn` 这层 durable 包装整层去掉。spike 用 agent 形态验了 `memory()` 的开销为零（`storage.estimate()` 全程不变），但 one-shot 语义下更贴切的形态是**引擎级 `prompt`**：一个引擎实例 = 一次任务，`turn` 结束即弃，连 memory backend 都不必建。V-12 的 IDB World **定性关闭**（可行性证过即可，永不接线）。⚠️ **形态证据差异**：V-09 等实测由 agent 形态（`turn.accepted.sessionId='ses_…'`）测出；engine 级 `prompt` 无 `accepted`/durable session，V-14 实测 `sessionId` 只是进程内标识——实现期别去等 `turn.accepted`。
5. **host-tool 通路**成立：JS `tools`+`idempotent` 声明 → fx 引擎经 `fx_host_tool_call` 回调 `execute` → 返回值回流模型。notepad 暴露 `note_*` 工具让模型直接操作文档，正好就是「one-shot tool-call」的产品形态。
6. **取消**经 `prompt(...,{signal}).abort()` 全链路传播：引擎 `stopReason:'cancelled'` → transport abort → 宿主 `res 'close'` → `ctx.llm` 的 `ac.abort()`。one-shot 下这就是「关掉这次任务」。
7. **reasoning-effort 缺口 → 消解为「固定轻量模型清单」**——画像里模型是**几个固定的轻量级模型**，effort 不作为 per-request 参数，而是**经由设置把模型映射/匹配到既定档位**（例如 `deepseek-flash` 走默认档、`deepseek-v4-pro` 走高档），选模型即选 effort。chat-completions 不下发 effort 这一点在「固定清单 + 档位映射」下不构成缺口；Responses provider 的 effort 路由**不需要**。
8. **并发形态**：每个活 one-shot，但活多/并发高 → wasm 引擎实例**随 notepad overlay 常驻一份、复用**（~283 ms 热启省掉），每次任务只付 prompt→finish 的边际成本；高并发由「每活一个新 `prompt`/`engine`」天然并行，不需要会话锁。

### §8.1 产品方向扩展（业主定案，2026-11-12 第二轮）

notepad 的 fx 引擎不是孤立聊天框，而是**知识库摄取管线的执行体**。三层定案：

1. **`kind:'prompt'` durable —— prompt 仓库**。notepad 笔记 kind 增加 `prompt`：一个受版本管理的**固定模板仓库**（参照 `.adocs/prompts` 的组织——按管线位点分簇、生料不互锁、curated 蒸馏）。one-shot tool-call 不再裸写 prompt，而是「选模板 → 填变量 → 执行管线」：模板仓库给每个任务提供固定剧本，保证批量任务的行为一致、可复现。
2. **管线任务 = 三类清洗/沉淀**：HTML 清理、图片批量识别、RAG 文件清洗——每类是一条固定模板 + 固定 host-tools + 固定输出 schema 的管线，产物**完全沉淀为知识库**（知识条目作为 notepad durable note 落 IDB）。注意区分两种 durability：本会话 durable（已关闭）vs **产物 durable**（知识库本体，走 notepad 既有 IDB note store——这正是「用完即抛」指的是引擎会话，不是产物）。
3. **远期：MCP server 暴露知识库**。host 侧把知识库内容以 MCP 协议暴露，`dsh.host` 直接调用 → notepad 沉淀的知识库成为主线 **durable memory** 的一部分。诚实边界：本 spike 只证明了「webServer + requestRejection 围栏的宿主路由面成立」；MCP 是 streamable-HTTP/JSON-RPC，协议映射未实测，仅证路由面。

**由此新增的翻译需求**：图片批量识别要求桥把 fx 的 image 块译成 `ctx.llm` 的 `image`/`file` 消息块（spike 期 deferred；catalog 已证 `deepseek-flash` 有 `inputModalities:['text','image']`，路线存在）。

### §8.2 durable kind 模型（业主定案，2026-11-12 第三轮）

notepad 的 durable kind 定为五种，按**写者**与**消费方式**分层：

| kind | 写者 | 人的操作面 | 用途 / 消费方式 |
|---|---|---|---|
| `prompt` | 人（curated） | 编辑、版本管理 | one-shot 剧本仓库，按 `.adocs/prompts` 簇组织；长期资产 |
| `note` | 人 | 编辑（现状） | 手写、粘贴、人改过的内容；**机器永不写** |
| `draft` | **机器独占** | **只允许 reject**（不可编辑） | one-shot 中间产物 + 兜底落点 |
| `knowledge` | 机器（管线终点） | 读、删、手动调整 | 清洗后语料，供检索（将来 MCP search/read） |
| `memory` | 机器产出 + **人背书** | 手动调整（本质特征） | 蒸馏事实，供 prompt 注入 = durable memory |

**draft 状态机**（业主定稿）：`pending → {accepted | rejected}`。机器写、机器改；人唯一操作是 `reject`——

- `reject(feedback?)`：可选携带一句反馈；触发 one-shot loop 用同一模板重跑（有反馈则注入重跑 prompt）。
- **谱系**：每次重跑产新 draft，`supersedes` 指回被 reject 的父代，`rejectCount` 累计——链上留全部失败版本，符合 mydocs 真相脊口径。
- **人想改内容**：唯一路径是把文本抄/改成 **note**（人类空间），不编辑 draft 本体。
- **兜底语义**：one-shot 产物无明确落点（管线中断、schema 不合、产物未分类）一律落 `draft`，永不静默写进 knowledge。

**晋升管线**：`draft →(管线沉淀)→ knowledge →(人手动提炼/背书)→ memory`。knowledge 是语料层（检索消费），memory 是事实层（注入消费）；MCP server 远期同时暴露两者。

**provenance 字段（全机器产物必带）**：`{via:{promptId, model, runId, at}}`——产物可审计、管线可重跑。

## §9 终态

**结论：可行（GO），且比立项时更轻**。在 notepad 内嵌 libfx `fx-core.wasm` 作为独立 LLM 请求引擎、经宿主 `ctx.llm`（model-selector 同一模型源）桥接 OpenAI Chat-Completions 的整条链路 **19 项命题**全部实测通过——第一轮 V-01–V-14 证「引擎+桥+one-shot」本体，第三轮 V-15–V-19 证「管线 durable state + 共享并发」五条张力（含补测 V-13 图像入向、V-14 引擎级 one-shot）。业主定案的「轻量、one-shot、用完即抛、无 durable」画像把两项候选缺口**永久关闭**：durability 走引擎级 one-shot（不接 World）、reasoning-effort 走「固定轻量模型 + 设置档位映射」（不接 Responses）。**唯一真实成本**是翻译层——fx 严格解析器的六条不变量已收敛于 §7.3 合同，notepad 直接照搬即可。**下一步**：在 `dsh-nano-notepad` 内落一个 `fx` 子模块——`createFxEngine`（one-shot）+ provider 桥（§7.3）+ `note_*` host-tools + 固定轻量模型清单（设置映射档位）+ `attachments`（图像桥，V-13）；wasm 引擎随 overlay 常驻复用，验收同本 charter。

---

## §10 业主心智模型与最终拓扑

> 本节记录「notepad+fx」在业主心智里**是什么**、**怎么分层**、**数据往哪流**。它不是实现规格，是定案后的世界观快照——后续所有设计、评审、转手以此为对齐基准。定案时间线：画像（11-12 轮 1）→ five-kind（轮 2）→ draft 状态机（轮 3）。

### 10.1 心智模型（owner's mental model）

1. **notepad 是管线，不是聊天框**。它的价值不是「又一个能聊天的 overlay」，而是「把脏料（HTML/图/散装文件）变成可检索、可注入的知识」的**摄取管线**。fx 引擎是这条管线的执行体，不是目的。
2. **任务 = one-shot tool-call**。没有对话、没有续聊、没有 session。一个任务进来 = 选一条 prompt 模板 + 挂一组 host-tools + 选个轻量模型 → 跑完即弃。活可以很多、并发很高，但**每个活的语义都是「调用一次」**，不是「开一段会话」。
3. **资产三层，写者分人**。
   - `prompt` 仓库：人沉淀的**剧本**（`.adocs/prompts` 模式——簇化、生料、curated、可版本）。
   - `note`：人写的内容，机器不碰。
   - `draft/knowledge/memory`：机器写的**产物**，按成熟度分三档——`draft`（机器独占暂存、人只能 reject）、`knowledge`（沉淀语料，供检索）、`memory`（人背书事实，供注入）。
4. **模型是档位，不是参数**。不接 effort 路由、不接 Responses。备几个固定轻量模型，**选模型即选档位**，effort 由「设置里模型→档位的映射」一次性解决，不是 per-request 旋钮。
5. **durable 指产物，不指会话**。说「durable memory」指的是**沉淀下来的 memory kind 将来进主线**，不是 fx 的 session 要持久化。会话反而必须用完即抛——这正是 engine 级 one-shot 而非 agent+memory() 的原因。
6. **桥的职责是隔离差异**。`ctx.llm` 是唯一模型源（与 model-selector 同源）；fx 与内部消息的差异（reasoning 字段名、tool_call index、usage 口径、image 块）全部由桥一次抹平。产品只面对一份 §7.3 合同。

### 10.2 最终拓扑（final topology）

```
            ┌───────────── dsh-dev.local / dsh web 页面 ─────────────┐
            │                                                      │
            │   dsh-nano-notepad overlay（常驻 UI）                  │
            │   ┌──────────────────────────────────────────────┐   │
            │   │  fx-core.wasm 引擎实例（常驻一份，热启~283ms）   │   │
            │   │   └─ per task: engine.prompt(one-shot)         │   │
            │   │        ↑ fx_host_tool_call ↓                   │   │
            │   │   note_* host-tools ─→ IDB/durable kinds      │   │
            │   └──────────────┬───────────────────────────────┘   │
            │                  │ OpenAI chat-completions          │
            └──────────────────┼──────────────────────────────────┘
                               ▼
        ┌────────── /nano-fx-spike/* 宿主桥（webServer+围栏，已证）──┐
        │   image_url→attachments.saveImage   reasoning/tool/usage │
        │   → ctx.llm.prepareCall().stream()  (§7.3 六条不变量)    │
        └──────────────────────┬───────────────────────────────────┘
                               ▼
                    ctx.llm（唯一模型源，同 model-selector）
                               ▼
            ┌──────────────────┴──────────────────┐
            ▼                                      ▼
   deepseek-official (固定档)             magpie gateway (51 id)
            │                                      │
            └──────────────► 模型 ◄────────────────┘
                               │
   ┌───────────────────────────┼────────────────────────────┐
   │  durable kinds (IDB note store)                        │
   │  prompt → note → draft →(沉淀)→ knowledge →(背书)→ memory│
   └───────────────────────────┼────────────────────────────┘
                               ▼ (远期)
                    MCP route ──→ dsh.host 读 = durable memory
```

**拓扑三不变量**：
1. **模型源唯一**：任何 notepad 任务都经 `ctx.llm`，没有第二条 LLM 通路。
2. **会话即弃、产物即档**：引擎层零持久（V-14 实测 858ms/turn），沉淀层全在 notepad durable kinds。
3. **桥即合同**：§7.3 的六条不变量 + V-13 的 `saveImage→ImageBlock` 是 fx↔dsh 的唯一界面，改桥即改产品，别绕。

### 10.3 与 mydocs 方法论的接榫

- `prompt` kind = `.adocs/prompts` 的**驱动端**落地：簇化、生料、curated、版本追踪。
- `draft` reject/supersedes 链 = mydocs 的**真相脊**：失败版本留链、可审计、可重跑。
- `provenance{via}` = mydocs 的 file:line 证据纪律的元数据版。
- `memory`（人背书事实）= mydocs「人在环里手工粘贴」的自动化前身——机器产草案，人背书才算数。

### 10.4 业主裁决登记（2026-11-12 第三轮）

| 裁决 | 内容 | 落地影响 |
|---|---|---|
| **A1 KB 落点** | **内容/状态分层双轨**：五 kinds 产物本体（含机器 kinds）→ notepad 既有 IDB note store；管线执行态 + LS-RAG g0/g1/g2 索引 → sqlite-worker OPFS；sqlite-2-s3 走 notepad 独桶 | draft seam 消解（本体 IDB、血缘 sqlite）；LS-RAG 索引为可重建派生态，IDB 语料是真源 |
| **A2 claim 键** | 扁平三段：`run-<ulid>` / `art-<id>` / `kb-<sha256>`，全过 `SESSION_ID_RE`（`/` 已实测被拒）；落 `nano-notepad/claims/{key}.json`，复刻 session-io 语义 | 前缀分流三种租约；`kb-<sha>` 内容寻址天然幂等 |
| **A3 命名空间** | notepad 独立桶 + 遵守 notepad 命名规范，**不挂 shared-workspace**；shared-workspace 调取 notepad 走插件↔插件 MCP/RPC 授权，不经桶直读 | 存储=独桶；claim 面=notepad 自有；远期 MCP 暴露升级为本裁决正式边界 |
| **A4 LS-RAG 保真** | **全量 g0/g1/g2 都上，执行底线守住**——LS-RAG 是业主真实 RAG 引擎，不允许简化 | JS+WASM 管线按 MKB `services/ls_rag` 逐层搬全量语义；体量回到 MKB 原文档位 |
| **A5 CAS 硬需** | CAS-capable 是硬门槛 + **端点启动探针**（V-17b 三用例）；不过即关共享写面（claim/manifest 拒服务上报 `cas-probe:fail`）；R2/pgs3/MinIO 均合规 | fencing 依据从端点名改为活探针；独桶选定后接入即跑 |

A1/A2/A5 为业主授权裁决（2026-11-12），支持推理见 eval 文档 §8.5。

## §11 遗留与后续边界

| 项 | 状态 | 去哪 |
|---|---|---|
| IDB schema 五 kind 落地 | 未做（spike 禁碰 `src`） | `dsh-nano-notepad` 实现期 |
| draft reject 重跑 UI | 未做 | 实现期；本 charter 只定状态机 |
| MCP 协议映射 | 未验（路由面已证） | MCP 立项时单测 |
| `attachments` 服务的生产配置 | dev 实例可用即证 | 实现期确认 profile 服务注册 |
| `provider~model`→固定清单 UI | 未做 | 设置面板实现期 |
| sqlite worker 形态落地 | V-15 已证（`spike-sqlite-worker.mjs` 范式：installOpfsSAHPoolVfs→initWorker1API） | 实现期合入管线 worker 或独立 dedicated worker |
| A 类裁决 A1–A5 | spike 数据已回，A3/A4 业主亲裁、A1/A2/A5 业主授权定案（eval §8.5） | 已登记 §10.4；独桶 `dsh-nano-notepad-test` V-17b 回归已 PASS |
