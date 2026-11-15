# `CF1115` Closure — 全活跃插件 Contract/Facade 统一实施

> **文档状态**：`partial`（**非 `executed`** — 硬闸 Test-ID 未全 verified）。
> **会话快照**：`2026-11-15` CST · 分支 `main` · 基线 `653b15b` → HEAD（STEP.8 二轮修复后 `1af7b18`+docs）。三路对抗审查（truth-reconcile/completion/antigreen）总判「有条件通过」，报告落 `.anote/reviews/contract-and-facade/1115/47f0/`。
> **真源**：[真相层] `CF1115-TRUTH` v0.1.1 `FROZEN` 只冻结决策；本文登记**施工面**实测结果，五态如实，不 overclaim、不另立第二账本。
>
> **对抗审查**：STEP.7 三路审查（真相层对账 / 完成度 / 防假绿侧载）已跑；报告落 `.anote/reviews/contract-and-facade/1115/47f0/`。判定「有条件通过」——核心归口真实落地，发现 **2 blocker + 6 major** 已在 STEP.8 修复（见 §6）。

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

> 计数为快照口径（route-scan 85 routes / clean-lib 58 artifacts / dsh-interface 37 tests / notepad 71 / DNMS 7 / DNEE 5 / DNT smoke 4 + wasm 97）。

| 观察面 | 状态 | 说明 / 债务号 |
|--------|------|---------------|
| `dsh-interface` 归口包骨架 | `verified` | 三出口 + 4 facade + 37 单测全过 |
| Web 路由 channel×match 收敛（DNN/DNT/DNEE） | `verified` | registrar 单实现、幂等、dispose 收口 |
| JSON 生产者—消费者 codec（DNEE/DNMS/DNN） | `verified` | 单 JsonOutcome；无第二 codec；producer 线上形状归一 |
| `nanoNotepad` Cordis 服务（去 window 全局） | `verified` | `ctx.provide`/`ctx.get`；DNEE 消费 |
| MCP 控制面归口（DNT） | `observed-OK-at-closure` | toolset/decoder 单测过；远端引擎区间未真实握手（无授权端点） |
| Terminal 两提供面 / DNLS 八工具 / v1-v2 门控 | `partial` | schema 广告已对账；DNLS `terminal-driver` 19 工具分发、断连至多一次重跑语义未全验 |
| Sandbox 二十工具真实业务 + bridge（DNLS/DNK） | `deferred` | 待续轮；容器内 script 是否引用 DNK `runtime/mcp-bridge.mjs` 需容器侧核验 |
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

## 4. 未收口原因（诚实）

Phase-4/5 的 host 适配 + 全范围结算与若干公开退役面（DNK 容器时代资产已在三轮删除，`/s3/config` 收窄仍待定）超出单轮授权域；离线 workspace 无 cordis 使官方-Service 直接引用核验不可在本地闭合；远端/S3/cordis 宿主域核验需另立授权。按 §10.4 NOT-成功识别，本文保持 `partial`——**不标 `executed`**。

## 5. 交接

- **已完成**：P1·P2·P3-01/02 全、`P3-03`/`P3-05`/`P4-03`/`P5-02`/`P3-04` partial。
- **下一动作 / deferred**：`P3-04` 余留（仅 DNK 真实消费 live 链路，无引擎实连）→ `P4-01`（宿主域 cordis 核验）→ `P4-02`/`P4-04` → `P5-01`/`P5-03`。
- **P-EXEC 待裁决**：3 个 facade 签名偏离（createMcpToolset/decodeMcpReply/createWebRegistrar）、clean-lib allowlist 扩 `@deepseek-ai/dsh-compaction`、spec↔binding 缺行静默丢弃、route-scan 读生成物失独立性、P4-04 /s3/config 收窄与 handshake 冲突；DNK mcp-bridge canonical 已由 `e1b2e91` 实证收敛至 DNLS（非第二作者源），P3-04 公开退役面已落地。
- **阻塞**：无硬阻塞；容器/远端/S3/cordis 宿主域核验需授权。
- 完成判据仍锚 `AP §10.1` 硬闸 + `§10.3` DoD。
