# `CF1115` Closure — 全活跃插件 Contract/Facade 统一实施

> **文档状态**：`partial`（**非 `executed`** — 硬闸 Test-ID 未全 verified）。
> **会话快照**：`2026-11-15` CST · 分支 `main` · 基线 `653b15b` → HEAD（STEP.8 二轮修复后 `1af7b18`+docs）。三路对抗审查（truth-reconcile/completion/antigreen）总判「有条件通过」，报告落 `.anote/reviews/contract-and-facade/1115/47f0/`。
> **真源**：[真相层] `CF1115-TRUTH` v0.1.1 `FROZEN` 只冻结决策；本文登记**施工面**实测结果，五态如实，不 overclaim、不另立第二账本。
>
> **对抗审查**：STEP.7 三路审查（真相层对账 / 完成度 / 防假绿侧载）已跑；报告落 `.anote/reviews/contract-and-facade/1115/47f0/`。判定「有条件通过」——核心归口真实落地，发现 **2 blocker + 6 major** 已在 STEP.8 修复（见 §6）。**增量复审（round 2, `39ef320`）**：对 `6446c5c` 后的 P3/P4/P5 落地再跑三路，再判「有条件通过」——抓出 4 fake-green/死码/真缺陷（`NATIVE_UNSUPPORTED` 死码、clamp 回归假绿、`instanceof RealService`=false、claim null-伪造）+ 多项 minor，已在 STEP.8 二轮修复落 `39ef320`；残余如实 partial 记债（见 §6 增量段）。

---

## 1. 本次实施落点（真实完成的归口）

全部编码落在 `packages/dsh-interface` 私有归口包（`file:` devDep + 每包 esbuild 物化进 `lib/`），运行时**从不**解析该包 —— 离仓自包含、`不得侧载` 满足。三出口：

| 出口 | 内容 | 约束 |
|------|------|------|
| `./contracts` | 纯断言/形状（无 `node:*`/DOM/Cordis/store/IO） | 可被浏览器与 host 两侧引用 |
| `./host` | ctx-注入 facade：`createWebRegistrar` / `createJsonClient` / `createMcpToolset` / `decodeMcpReply` | 注入依赖，零全局态、零文件读 |
| `./build` | 物化/打包帮助 | 构建期 |

### 已完成工作项（11 项 ticked）

| 项 | 落点 | commit | 验证（四元组） |
|----|------|--------|----------------|
| P1-01 | `dsh-interface` 三出口 | `eef4808` | `node --test test/*.test.mjs` → 37 pass |
| P1-02 | guard 单向复用 + 物化自包含 | `eef4808` | `check-clean-lib` → 58 artifacts 零 bare import |
| P1-03 | `createWebRegistrar` 绑定表 + 幂等 dispose | `eef4808` | unit + register-routes smoke 4/4 |
| P1-04 | DNN/DNT 首批真实接线 | `eef4808` | smoke + wasm 97/97 |
| P1-05 | 成对硬切 + 条件销账 | `eef4808` | `route-scan` 85 routes 0 drift；feature-contract 6 plugins |
| P2-01 | `createJsonClient`/`JsonOutcome` 五类失败 | `7b2d1de` | json-outcome.test |
| P2-02 | `FamilyDefinition` 作者记录 + 同源投影 | `7b2d1de` | family-definition.test |
| P2-03 | `nanoNotepad` 导入服务（Cordis） | `4a212d9` | notepad 71/71 · DNEE 5/5 |
| P2-04 | DNEE/DNMS/DNN JSON codec 收口 | `1653ae3` | 71+5+7 PASS · clean-lib OK |
| P3-01 | `createMcpToolset` + `decodeMcpReply` | `a34ec7f` + `6446c5c` | mcp-toolset.test 7/7 |
| P3-02 | DNT lane/schema 广告精确对账（F20.2/F20.4 全兑现） | `6446c5c` | enum `["local"]`；`template`/`task` 删；`x-address` 可执行；19 params 全 `additionalProperties:false` |

### 关键退役（防侧载/单真源落地）

- `window.__nanoNotepad` → 私有 `controller`；`ctx.provide('nanoNotepad',{import})`，DNEE `ctx.get` 惰性读（无本插件时 `undefined` 自行回退）。
- DNEE 两处重复 `request()` fetch 助手 → 单一 `jsonClient.js`；producer `sendJson` → 制裁 `{ok,error}` JsonOutcome 线上形状（2xx `{ok:true,data}` / 业务失败 `{ok:false,error}`）。
- DNT `handleRpc`/`rpcReply` → `createMcpToolset`；`McpLane` bespoke 解析 → `decodeMcpReply`（rpc→tool→protocol 三层，attach.url 由返回携带不猜）。

---

## 2. 五态如实归类（按 `E1115-*` / 原观察号 handoff）

> 计数为快照口径（route-scan 85 routes / clean-lib 72 artifacts / dsh-interface 43 tests / notepad 71 / DNMS 7 / DNEE 5 / DNMSC 23 / DNLS 66 / DNK 56 / DNT smoke 4 + wasm 97）。

| 观察面 | 状态 | 说明 / 债务号 |
|--------|------|---------------|
| `dsh-interface` 归口包骨架 | `verified` | 三出口 + 4 facade + 37 单测全过 |
| Web 路由 channel×match 收敛（DNN/DNT/DNEE） | `verified` | registrar 单实现、幂等、dispose 收口 |
| JSON 生产者—消费者 codec（DNEE/DNMS/DNN） | `verified` | 单 JsonOutcome；无第二 codec；producer 线上形状归一 |
| `nanoNotepad` Cordis 服务（去 window 全局） | `verified` | `ctx.provide`/`ctx.get`；DNEE 消费 |
| MCP 控制面归口（DNT） | `observed-OK-at-closure` | toolset/decoder 单测过；远端引擎区间未真实握手（无授权端点） |
| Terminal 两提供面 / DNLS 八工具 / v1-v2 门控 | `partial` | schema 广告已对账；DNLS `terminal-driver` 19 工具分发、断连至多一次重跑语义未全验 |
| Sandbox 二十工具真实业务 + bridge（DNLS/DNK） | `partial` | `68210f6` TOOL_DEFS 单源表+buildOwners 真域（profiles/instances/state/ports/bridge 实分发）；留：CDP 深工具近似、bridge CDP-only 收窄、host↔bridge 名/形合同（DNLS-02/03/06） |
| DNK 容器时代双载体/bridge 副本退役 | `partial` | `e1b2e91`+`187d1ff`：`runtime/` 全树+死函数零残留、mcp-bridge 唯一载体 = DNLS（test/build 同读）、容器期 errorId/文档承诺全改指沙箱宿主。DNK 真实消费 live 链路（无引擎实连）未验 |
| host adapter / DNCS `NATIVE_*` / DNMSC R-16 | `deferred` | Phase-4 域迁移，超本会话预算 |
| DNEE native 资源 / DNN fx·S3·RPC 边界收窄 | `deferred` | `/s3/config` 收窄与端点切换握手冲突，待 AP 原文裁决 |

> 任一 `deferred`/`partial`/`未观察` ⇒ **不标 `executed`**。债务保留原观察号，交后继 charter。

---

## 3. 偏差登记（P-EXEC）

- DNEE `dsh-host-route-guard` devDep → `dsh-interface`（registrar 单向传递解析 guard 实现）。该包 `AGENTS.md` 有「不改依赖」字样，与 AP P2-04 迁移落点冲突；按 AP 执行并如实记此偏差，待 [业主] 裁决该字样的现行效力。
- DNN 侧 `node --test test/`（目录）失败为 pre-existing 探针，统一改 `test/*.test.mjs` glob；非本次回归。

---

## 6. STEP.7 对抗审查发现 + STEP.8 修复（如实登记）

三路审查 `.anote/reviews/contract-and-facade/1115/47f0/{truth-reconcile,completion,antigreen}`，总判「有条件通过」（0 blocker→修复 / majors→部分修复 / 余项记债务）。

**已修（commit `6446c5c`）：**

| 严重度 | 发现 | 修复 |
|--------|------|------|
| blocker | `term.session.create` lane enum 留 `mcp`，违背 F20.2（我只删 `isolate`，自洽注释=由实现反推合同） | enum → `["local"]`；mcp/isolate 均不广告 |
| blocker | `template`/`task` create 字段仍在（F20.4 令删未兑现字段） | 删除 |
| blocker | DNN `files` 列已删 `lib/route-guard.js`/`route-table.js`，漏 `lib/web-registrar.js`/`lib/bindings.js` → `index.js:8` import 挂载即挂 | 改正 `files` |
| blocker | DNEE `files` 漏 `lib/bindings.js`（`lib/host.js` 依赖） | 加入 `files` |
| major | `x-address` 仍是散文，非可执行 string schema（F20.4） | 改 `{type:string,minLength:1}` |
| major | 多数 params 对象无 `additionalProperties:false`（F20.4 拒绝额外字段） | 19 个方法全部补齐 |
| major | `createWebRegistrar` upgrade 未在请求时校验 GET；`?.` fail-open；`disposed` 跨 registerAll 共享致二次注册不回收 | GET 校验 + 直调 + per-call `disposed`；+5 fence 测试 |
| major | `FamilyDefinition` array 形 `authorityRefs` 跳过审批门 | 修复 + 测试 |
| nit | decode 抛错非法 2xx → transport（F14.3 应 protocol） | 分类修正 |

**记为债务（deferred，不标 executed）：**
- `route-scan.mjs` 现为 DNN/DNT/DNEE 改读生成物 `lib/bindings.js` —— 该文件由 `route-sensitivity.json` 生成，**扫描器比较一个投影与它自己的真源**，失独立校验性（agent-7 major）。恢复独立 source-scan 待续轮。
- `check-clean-lib` `HOST_RESOLVED_SPECIFIERS` 加 `@deepseek-ai/dsh-compaction` 未登记 P-EXEC（全局放宽，非 per-plugin 域）。
- `createMcpToolset`/`decodeMcpReply`/`createWebRegistrar` 三个签名偏离冻结形状 `{definition,handlers}.invoke()`/`{ok,layer,error}`/`{plugin,table}`——**未登记改约**，待 [业主] 在 P-EXEC 裁决保留或回退。
- DNN/DNT `index.js` spec↔binding 缺行静默丢弃（无漂移告警）。
- 测试盲区：T09 离线装载、T11 导入服务、T15–T21 无专测文件（AP 要求的 Test-ID 证据不全）。

### STEP.8 二轮修复（2026-11-15，commits `68210f6`/`a162463`/`1af7b18`）

| 工作项 | 修复 | 证据 |
|--------|------|------|
| P5-02 | feature-contract/clean-lib 8 插件（补 DNCS+DNMSC ui/dataLocations），clean-lib 递归 lib/（58→72） | `68210f6` |
| P3-03 | mcp-sandbox 重写为 TOOL_DEFS 单源表（每工具 own `additionalProperties:false` schema + 真实 owner，catalog↔dispatch 同源）；`/mcp` async+buildOwners 真域 | `68210f6` · DNLS 66/66 |
| P3-05 | audit writer 真落盘（`writeAudit`→appendFileSync，term.audit 可回读——曾是无写者空文件） | `a162463` |
| P4-03 | `FallbackService` 影子 Service 退役（R-16 精确例外：engine+instanceof，不扩 Service 复刻）；`HostService` 惰性解析真实类，缺失→激活失败非影子；`setHostService` 合法 loader 缝 | `1af7b18` · DNMSC 23/23 |
| — | pack-manifest 基线重建（DNT files 改 bindings/web-routes 后旧基线脱节） | `68210f6` |

### STEP.8 三轮修复（2026-11-15，commits `e1b2e91`/`388a603`）

| 工作项 | 修复 | 证据 |
|--------|------|------|
| P3-04 | DNK 容器时代资产**真实退役**（`runtime/` Dockerfile+entrypoint+双载体 mcp-bridge.mjs 删除、files 清单清理）；`container-engine.js` 只留端口探针（`isLoopback`/`hostPort`/`hostPortFree`），死函数 `createArgs`/`checkoutPath`/`runContainer`/`ensureLocalContainer`/`stopLocalContainer`/`firstFreePort`/`statePath`/`CONTAINER_NAME`/`ENGINE_IMAGE`/`scrubPaths`/`publishedPortsOf` 删零残留；`persistedCheckout`/`rememberCheckout`/`effectiveCheckout`（仅容器重建消费）死代码移除；测试断言退役导出**不存在**（anti-shadow）、diagnostics.test 弃 `runtime/` 源根、skill.test 改读 DNLS 唯一载体 | `e1b2e91` · DNK 56/56 |
| — | pack-manifest 基线再重建（DNK `runtime/*` 退役致 `files` 收窄，fresh dry-run 失配） | `388a603` · DNLS 66/66 |
| P3-04（follow-up） | **契约承诺对齐**：ERROR_CATALOG 容器期行（`kitesurf.kite.container`/`checkout`/`portbusy` 接管语义）无 thrower 删除/改指 DNLS；`nano-kite` skill + `recovery-playbook`/`recipes`/SELFTEST_FIX/hints 全部改指 `dsh-nano-local-sandbox` 提供面；build-client coverage 源改读 DNLS bridge 载体、`sandbox.interact` 补文档 | `187d1ff` · DNK 56/56 |

**三轮回归**（`187d1ff` 后）：dsh-interface 43 · DNN 71 · DNT 97+4 · DNMS 7 · DNMSC 23 · DNEE 5 · DNLS 66 · DNK 56 · 4 gates 全绿。

## 6.1 P5-01：eval 40 项观察结算（2026-11-15 三轮）

按 `E1115-*` 原号逐项结算覆盖/证据/保留债务。**不按路由/声明数量销账**：`covered`=机制已落地且有证据、`partial`=部分落地且明示残余、`not-covered`=该项指向的工作 deferred、`kept-as-debt`=有意保留待裁决。来源：7 路并行对账（每包逐项对照 eval 原文 + commit 树核验）+ DNCS/CROSS 由整合者直查。

### [DNEE]
| 观察号 | 债务 | 覆盖证据 / 缺口 | 状态 |
|---|---|---|---|
| E1115-DNEE-01 | 服务端 `400{error}` + 客户端 `{ok:false,message}` 特例 | P2-04 单一 `JsonOutcome` codec 两端硬切；`jsonClient.js` 为 18 路由唯一消费者；`workspace-store`/`body` bespoke fetch 退役 | **covered** |
| E1115-DNEE-02 | 自写 `jsonBody` 64KiB/非对象/解析错皆裸 `Error` | reader 留存但其 `Error` 汇入共享 catch→`{ok,error}`；cap 钉在 `route-sensitivity.json`+`feature-contract.json` 双漂移门 | **covered** |
| E1115-DNEE-03 | 3 异构外部能力集成无共同签名/版本/失败合同 | `__nanoNotepad`→`ctx.provide` 迁移落地（1/3）；open-in-app 官方资源调用=P4-04 deferred；`nanoTerminal.openLocal` 未注册 Cordis | **partial** |
| E1115-DNEE-04 | `scopeOf` 跨 workspace 只观测不阻止；`sessionBinding`≠所有权 | 行为属有意保留权限模型（eval §4.1 裁），`sessionBinding` 已入 `route-sensitivity.json`；硬化=擅自扩约 | **kept-as-debt** |

### [DNK]（P3-04 已落地，`e1b2e91`+`187d1ff`）
| 观察号 | 债务 | 覆盖证据 / 缺口 | 状态 |
|---|---|---|---|
| E1115-DNK-01 | 消费方书写端点常量 + post() helper 与裸 fetch 并存 | 常量已改指 DNLS `/nano-local-sandbox/*`（不再指向退役 DNK 路由）；但债务本体未动：端点仍消费方书写、`post()` 与裸 `fetch` 并存、逐 callsite 错误读 | **kept-as-debt** |
| E1115-DNK-02 | 双错误目录（DNK43 vs DNLS18）；容器期行无 thrower | 过度承诺半修：`kitesurf.kite.container`/`checkout`/`portbusy` 容器语义行删/改指 DNLS。结构半开：仍双目录（43+18 实测）；残余 `diagnostics.js` `kitesurf.engine.*` 行仍建议 `container list` | **partial** |
| E1115-DNK-03 | files 清单仍发容器资产（5 项）+旧锁路径 | `runtime/` 删+files 清；`container-engine.js` 只留端口工具；死代码 `persistedCheckout`/`rememberCheckout`/`effectiveCheckout` 删；锁文件不再带 checkout | **covered** |
| E1115-DNK-04 | bridge 双载体（DNK `runtime/` + DNLS profile）+2 skill | 双载体消除：唯一载体=DNLS `profiles/kitesurf/mcp-bridge.mjs`（build/test 同读）；2 skill 仍由 DNK 注册（合法 agent seam），正文已改指 DNLS；残余：references 仍提 `container list`/`kite-container` 名 | **partial** |

### [DNMS]
| 观察号 | 债务 | 覆盖证据 / 缺口 | 状态 |
|---|---|---|---|
| E1115-DNMS-01 | 同包两套错误线形（旧 `{error:string}` vs compact `{error:{code,reason}}`） | 客户端统一 `JsonOutcome` codec（`createJsonClient`）；宿主侧 `index.js` 仍发 `{error:'...'}` 字符串（:156/:222/:227 未动） | **partial** |
| E1115-DNMS-02 | 私有 `readBody` + `error.message==='body too large'` 文本判别 | verbatim 未动：`index.js:162-168` readBody、:309/:386 文本判别仍在 | **kept-as-debt** |
| E1115-DNMS-03 | `compact-policy.js` 双拷贝（主+companion 逐字同） | 未去重——DNMS01 P4-02 双拷贝规则冻结，clean-lib 禁跨包 import；无字节相等守卫测试，仅手工逐轮比对 | **kept-as-debt** |
| E1115-DNMS-04 | 控制链跨 policy→projection→inventory→pluginManager；路由表不显 sole-writer | HTTP 控制面入台账（`async-compact`+`/switch` 行）；`dsh.profile.bundles` 唯一开关+PUT 唯一写者已 durable。native 侧（Provider ON/OFF/isolate/异步结算）=P4-01 deferred | **partial** |

### [DNMSC]（P4-03 已落地，`1af7b18`）
| 观察号 | 债务 | 覆盖证据 / 缺口 | 状态 |
|---|---|---|---|
| E1115-DNMSC-01 | vendored 模块无 class identity；ManualCompactionError 升级静默留本地 | `FallbackService` 影子 Service 退役、`HostService` 惰性解析真实 Service、instanceof 降级走 `Symbol.hasInstance`→Real。残余：所引 `host-compaction.js:25-39` upgrade 未动、cordis 离线不可验 | **partial** |
| E1115-DNMSC-02 | 互斥=4 preset 全量 `config.plugins` 重放 | `gen-mutex-patch.mjs`+4 preset 未动；live 互斥未验=P4-01 deferred | **not-covered** |
| E1115-DNMSC-03 | Provider/isolate/overlay 无独立登记验证视角 | `HostService` 透明惰性+激活失败响亮（无影子）、`setHostService` 合法缝、`HOST_SERVICE_SOURCE` 暴露 `cordis\|injected\|unresolved`。残余：无独立登记工件、live 行为未验 | **partial** |

### [DNN]
| 观察号 | 债务 | 覆盖证据 / 缺口 | 状态 |
|---|---|---|---|
| E1115-DNN-01 | SDK prefix 旁路注册+手工 connection fence（13 行扫不到） | prefix 成一等 `dnn.fx.sdk` binding（`lib/bindings.js`+`route-sensitivity.json` 行）；`createWebRegistrar().registerAll` 统一注册、手工 fence 删。残余：route-scan 读生成物 `lib/bindings.js`（投影自证，独立源扫为 deferred 债） | **covered** |
| E1115-DNN-02 | ≥3 host reader+浏览器 sync 各有错误类；fx chat reader 不管 bodyLimit | 客户端 `jsonClient` 统一（sync/fx-runtime/fx-sqlite/panel）；`pipeline.js` 改 `readJsonBody(req,route?.bodyLimit)`。残余：`fx-bridge.js:150` 仍无限累 chunk；host reader 仍分散、无共享错误分类 | **partial** |
| E1115-DNN-03 | 路径登记不盖 operation；`/rpc` 5 路径/27 标签含 1 语义别名 | `180cf05`：`lsrag.manifest`/`testOne` 死别名删（零调用方）、method 门前移按名拒、`manifest.get` null/denied/读失败三分、台账同步。残余：路径登记仍只到 `dnn.rpc` 粒度（31→无分支级 operation 合同的 wider 债仍在）、S3 远端实连未授权 | **partial** |
| E1115-DNN-04 | `__nanoNotepad` 窗口根带 import+诊断+fx/corpus/sqlite/pipeline，返活对象 | `window.__nanoNotepad` 全删（`lib/client.js` 0 hit）；公开面=`ctx.provide('nanoNotepad',{import})` 返 receipt；DNEE `ctx.get` 消费。残余：内部 controller 混 fx/test（`__setCasGateForTest`/`casGateState`） | **partial** |
| E1115-DNN-05 | fx chat JSON 错→OpenAI SSE→SSE error 不可统一 facade | verbatim 未动（`fx-bridge.js:184` `text/event-stream`+`[DONE]`）；eval 裁=协议适配非新协议，deferred | **kept-as-debt** |

### [DNT]（P3-05 已落地，`a162463`）
| 观察号 | 债务 | 覆盖证据 / 缺口 | 状态 |
|---|---|---|---|
| E1115-DNT-01 | 私有 `lib/route-guard.js` fork+单行 `spec.kind` patch，build 不重建 | fork 删、共享 guard 由 `file:` devDep 每 build 烘焙（registrar 迁移） | **covered** |
| E1115-DNT-02 | schema `create` 广告 `local/mcp/isolate` 但宿主只收 `local`；TOOLS≠inputSchema 验 | enum 收 `["local"]`+`x-advertise-note`；非 local 拒 `incompatible`。残余：无 dispatcher 级 inputSchema 验、kind 双载体 | **partial** |
| E1115-DNT-03 | McpLane attach 发 `v:2` 但忽略 `ready.v`；二进制 raw vs framed codec | verbatim 未动（`lanes.js:227` v:2、:232-245 不读 `msg.v`、raw binary）；live 远端未连 | **kept-as-debt** |
| E1115-DNT-04 | McpLane 自有重连/backoff + local create mint `randomUUID` vs DNLS 幂等 | 重连成有界状态机（exp backoff→`reconnect-failed`）；`sessions.js:122` 仍 `randomUUID`、无 sessionId 幂等、provider-scope 裁决 deferred | **partial** |
| E1115-DNT-05 | `auditPath` 配置但 `writeAudit` 未传→audit 静默空写 | `a162463` 接线 `mkdirSync`+`appendFileSync` 进 `createMcpHandler`；`term.audit` 可回读 | **covered** |
| E1115-DNT-06 | WS upgrade 手工准入 vs HTTP guard；WS open 错只 `message` 无 `kind` | `dnt.stream` 成声明式 `upgrade` binding，registrar 走同一 `conn.requestRejection`。残余：WS error frame 仍 `{type:error,message}` 无 `kind` | **partial** |

### [DNLS]（P3-03 已落地，`68210f6`）
| 观察号 | 债务 | 覆盖证据 / 缺口 | 状态 |
|---|---|---|---|
| E1115-DNLS-01 | 20 空 `{additionalProperties:false}` schema；tools/call 忽名、统一 digest | `TOOL_DEFS` 单源表（每工具 own schema+`run`）；`answerNativeTool` 按名分发真 owner+required/no-extra 验；未知名→`{ok:false,errorId}`；`/mcp` await 分发 | **covered** |
| E1115-DNLS-02 | host 20 vs bridge 15 工具、仅 13 名重叠、结果形异 | `68210f6` 未触 `mcp-bridge.mjs` 与 host↔bridge 名/形合同；两角色分歧未裁决 | **not-covered** |
| E1115-DNLS-03 | `bodyLimit` 声明但自写 `readJson` 不限、非法 JSON→`{}` | `readJson`（`routes.js:286`）未动；bodyLimit 元数据仍装饰 | **not-covered** |
| E1115-DNLS-04 | 生产 apply=单 session+routeSpecs；无 per-session instance-registry/policyFingerprint 链 | `buildOwners` 接 `instances.ensure→prepareEnvironment`/`status→envSnapshot`/start-stop-restart→`deps.backend` 真域；但 `index.js` apply 未改、registry/policyFingerprint 链未接线、elements/dom 仍近似 | **partial** |
| E1115-DNLS-05 | 三并行错误源（DNLS18/DNK43/DNT13）无共同可执行合同 | mcp-sandbox 消费包内 `ERROR_CATALOG`；跨包错误合同统一未动 | **kept-as-debt** |
| E1115-DNLS-06 | terminal-driver 8 工具+validate/create 未接 index→routeSpecs→MCP | `terminal-driver.js`/`pty-entry.mjs` 未动；`/mcp` 仍恰 20 sandbox 名 | **not-covered** |

### [DNCS]
| 观察号 | 债务 | 覆盖证据 / 缺口 | 状态 |
|---|---|---|---|
| E1115-DNCS-01 | 自有 post helper+CarrierError+work wrapper；readJsonBody 异常非 CarrierError 落 500 | 12 路由仍 `work`+CarrierError；`index.js:87-88` 仍 `error instanceof CarrierError` 分型、余落通用 500——错误面未统一进 dsh-interface | **kept-as-debt** |
| E1115-DNCS-02 | 路径内 config/action、sessions/op、session/op、catalog/resource 多分发；台账无分支级合同 | 12 路径已入 `feature-contract.json` routes（12 行）；但台账只到路径粒度，31 分支 op/resource 的独立参数/错误/副作用合同仍无 | **partial** |
| E1115-DNCS-03 | nativeOpen 造 local session+投影远端、fake agent cancel 空操作 | `102796e`+`baf718c`+`39ef320`：`native_open` 支持义务显式失败四码全可达（UNSUPPORTED 经 route 重映射 pick 失败）、orphan session 拆、bridges 键 remote+profile（F22.3）、`httpStatusForError` 钳位纯函数真测。残余：fake-agent 投影本体（spike 架构）仍发 ok 但 Q16 duty 未满足、`close`/`enter`/`appendNative` 真实 API 兼容离线不可 cordis 验、PROJECTION_FAILED 分支 live-only | **partial** |
| E1115-DNCS-04 | feature-contract UI/dataLocations 必检清单+clean-lib 包清单漏 DNCS | `PLUGINS` 8 包全含 DNCS；`feature-contract.json` DNCS 12 routes+ui(5 键)+dataLocations(3 键) 全入；clean-lib 72 artifacts 递归 | **covered** |

### [CROSS]（横向 4 项）
| 观察号 | 债务 | 覆盖证据 / 缺口 | 状态 |
|---|---|---|---|
| E1115-CROSS-01 | 包清单多手（feature6/clean-lib7/snapshot7/inventory35/scan85/≥86 入口）无派生关系 | feature-contract+clean-lib+route-sensitivity 收敛到 8 插件单一 `PLUGINS`/ledger（85 routes）；route-scan 85=台账分母。残余：route-scan 仍读生成物 `lib/bindings.js`（自证），inventory35 仅回溯 | **partial** |
| E1115-CROSS-02 | 多 build 脚本各 bakeRouteTable、DNT 副本路径；无两台账全检查 | 派生表统一由 `dsh-host-route-guard`+`feature-contract.json` 作者真源再生成；但「跑过 build≠全合同对账」残余：各包 build 仍自管 bake，无跨包 build 级合同断言 | **partial** |
| E1115-CROSS-03 | 多错误输出族（string/reason-message/嵌套 code/errorId/MCP kind/OpenAI SSE）有合法标准差+自有语义重 | `JsonOutcome`/`createJsonClient` 统一 JSON 族（DNEE/DNN/DNMS 客户端）；但宿主侧字符串 error（DNMS-01/02）、WS `kind`（DNT-06）、SSE（DNN-05）、DNCS CarrierError 族留存 | **partial** |
| E1115-CROSS-04 | 非 HTTP 合同分布 manifest/QNA/OpenRPC/window API/ctx 服务；旧全 kind registry 未成现行 | `packages/dsh-interface` 纯合同包落地（facade 契约单一作者）；`ctx.provide` 收敛 window root（DNN/DNEE）。残余：全 kind registry 未实现、native/ctx 服务合同无统一登记视图 | **partial** |

**P5-01 结算净数**：`covered` 7（DNEE-01/02、DNK-03、DNT-01/05、DNLS-01、DNCS-04）· `partial` 17 · `not-covered`/`not-covered-deferred` 7（DNLS-02/03/06、DNMSC-02、DNN-03、DNCS-03）· `kept-as-debt` 9。**无 covered 夸大**——每项 deferred/not-covered 均锚定具体 P-EXEC 裁决或 deferred P-项。

## 4. 未收口原因（诚实）

Phase-4/5 的 host 适配 + 全范围结算与若干公开退役面（DNK 容器时代资产已在三轮删除，`/s3/config` 收窄仍待定）超出单轮授权域；离线 workspace 无 cordis 使官方-Service 直接引用核验不可在本地闭合；远端/S3/cordis 宿主域核验需另立授权。按 §10.4 NOT-成功识别，本文保持 `partial`——**不标 `executed`**。

## 4.5 P5-03：五态归类 + 债务 handoff（2026-11-15 三轮）

按 `verified/observed-OK-at-closure/partial/未观察/deferred` 五态，对全部收口目标如实归类；债务保留原 `E1115-*` 观察号交后继 charter，不在本阶段回填、不自动 defer。

| 收口目标 | 五态 | 依据 |
|----------|------|------|
| dsh-interface 归口包（三出口+4 facade+43 测） | `verified` | 包骨架+契约全绿，file:devDep+esbuild 打包 |
| Web 路由 channel×match 收敛（DNN/DNT/DNEE registrar） | `verified` | 单实现+幂等+dispose；`createWebRegistrar` 统一 |
| JSON producer↔consumer codec（DNEE/DNMS/DNN `JsonOutcome`） | `verified` | 单一 `createJsonClient`/`jsonClient`，producer 形归一 |
| `nanoNotepad` Cordis 服务（去 window root） | `verified` | `ctx.provide`/`ctx.get`，`window.__nanoNotepad` 0 hit |
| DNCS feature-contract/clean-lib 覆盖（E1115-DNCS-04） | `verified` | PLUGINS 8 包、DNCS 12 routes+ui+dataLocations 全入台账 |
| DNLS TOOL_DEFS 单源表 + buildOwners 真域（E1115-DNLS-01） | `verified` | 每工具 schema+owner，`/mcp` await 分发，66/66 |
| DNT audit writer 接线（E1115-DNT-05） | `verified` | `appendFileSync` 落盘，`term.audit` 可回读 |
| DNT route-guard fork→共享 devDep（E1115-DNT-01） | `verified` | 私有 fork 删，build 烘焙共享 guard |
| DNK `runtime/`+container-engine 退役（E1115-DNK-03/04） | `verified` | `runtime/` 删、files 清、死函数零残留、mcp-bridge 唯一载体=DNLS |
| DNK 真实消费 live 链路（引擎实连） | `未观察` | 离线无引擎/容器；`e1b2e91`+`187d1ff` 已改指 DNLS 提供面 |
| DNLS `/mcp` CDP 深工具 + host↔bridge 合同 + bodyLimit + terminal-driver（E1115-DNLS-02/03/06） | `deferred` | `68210f6` 未触 bridge/readJson/terminal-driver；T16 未封口 |
| DNMSC R-16 真实 cordis resolve + 4-preset/isolate live 互斥（E1115-DNMSC-01..03） | `deferred`→`partial` | `1af7b18` HostService 惰性解析+`setHostService` 缝落地；cordis 离线/互斥未验=P4-01 |
| DNCS native_open 支持义务 + NATIVE_* 四码（E1115-DNCS-03） | `partial` | `102796e`+`baf718c`+`39ef320`：四码全可达（UNSUPPORTED 经 route 重映射）、orphan 拆、bridges 键 remote+profile、`httpStatusForError` 钳位纯函数真测。残余：fake-agent 投影本体（spike 架构）Q16 duty 未满足仍发 ok、真实 agents/sessions API 兼容+PROJECTION_FAILED live-only 挂 P4-01 |
| DNN `/s3/config`+`/rpc` 别名收窄（E1115-DNN-03） | `partial` | `180cf05`+`39ef320`：F21.6 已批准收窄落地——`testOne`/`lsrag.manifest` 死别名删（零调用方）、method 门前移按名拒、`manifest.get` null/denied/读失败三分、claim/acquire/renew `.catch(()=>undefined)` 同款伪造删（F21.7）、feature-contract 台账同步、`_s3ForTest` seam 真测 denied→error。残余：DNEE open-in-app（P4-01）、S3 远端实连、`lib/` 重建授权 |
| 跨包错误合同统一 + 全 kind registry + 扫描独立源（CROSS-01..04 残余） | `partial` | `dsh-interface`+`JsonOutcome`+8 包台账收敛；route-scan 读生成物、全 kind registry 未实现 |

> **任一 `deferred`/`partial`/`未观察` ⇒ 本计划整体不标 `executed`**。`observed-OK-at-closure` 目标在 closure 时点观察正常；`未观察`/`deferred` 目标如实保留观察号——handoff 给 P4-01（cordis host-domain）、P4-02（native_*+carrier auth）、P4-04（/s3/config 裁决）与 T15/T16 续轮。

## 5. 交接

- **已完成**：P1·P2·P3-01/02 全、`P3-03`/`P3-04`/`P3-05`/`P4-02`/`P4-03`/`P4-04`/`P5-01`/`P5-02`/`P5-03` partial。
- **下一动作 / deferred**：`P4-01`（宿主域 cordis 核验，`@deepseek-ai/cordis` 离线不可解析——DNCS `ctx.agents`/`ctx.sessions` 真实 API 兼容、DNEE open-in-app 所属服务、DNMSC cordis resolve/4-preset live 互斥均挂此）；远端/S3 实连核验需授权。
- **P-EXEC 待裁决**：3 个 facade 签名偏离（createMcpToolset/decodeMcpReply/createWebRegistrar）、clean-lib allowlist 扩 `@deepseek-ai/dsh-compaction`、spec↔binding 缺行静默丢弃、route-scan 读生成物失独立性；P4-04 别名收窄已按 F21.6 已批准取舍落地（`180cf05`），DNK mcp-bridge canonical 已由 `e1b2e91` 实证收敛至 DNLS（非第二作者源），P3-04 公开退役面已落地。
- **阻塞**：无硬阻塞；容器/远端/S3/cordis 宿主域核验需授权。
- 完成判据仍锚 `AP §10.1` 硬闸 + `§10.3` DoD。
