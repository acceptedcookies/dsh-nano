# `1116` Action Todo — PRE-1116 DNPR 升级与消债

> 文档性质：`action-todo`（DAG-guided execution；不是新的设计或授权文件）
> 目标：在独立 worktree `facade-observe-binding-v2` 上，按 [`PRE-1116-action-plan.md`](./PRE-1116-action-plan.md) 的 DAG 完成 W1–W3 编码、分组 commit、测试与文档收口。
> In-scope：执行计划 §2.1 的 S1–S4（`06` 观测口、`05` 身份、`07`–`10`/`12`/`13` 一次硬切、计量核心回归锁）。
> Out-of-scope：执行计划 §2.2 的 O1–O5。`PRE1116-T26` 本机部署保持 `未观察`。不改 `RELEASE.md`。不新增 release-gate。不把 [DNMSC] 接入。
> 上游依据：[`PRE-1116-qna-truth.md`](./PRE-1116-qna-truth.md)（`PRE1116-TRUTH` v0.1.1）；冲突时以 [`PRE-1116-qna.md`](./PRE-1116-qna.md) 为 provenance。
> 关联 action-plan：`docs/code-review/26-nov/PRE-1116-action-plan.md`
> authority / owner：[业主] 发车指令（本文件 §8）覆盖 `11.8` 的「计划本身不是开工授权」，授权在本 worktree 内实施。不授权合并到 `main`，不授权 T26 部署。
> 基线：worktree 从 `main` @ `1a537f3` 切出。`11.3` 六文件在开工时工作区干净，允许后续批次修改。
> 文档状态：`executing` · 执行状态：`in-progress`

## 1. 核心脊

- **目标与边界**：交付 W1 `06`、W2 `05`、W3 `07`–`10`+`12`+`13` 的代码、测试与 spec rev5。不重写计量算法，门面不 import [DNPR]，[DNPR] 不定义观测闭集。
- **权威与决策**：规则句只 CITE 真相层。命名表按 `05.2` 沿用已有 `dnee.*` / `dnn.*` / `dnt.*`，其余按 `<缩写>.<面名>` 由发车指令授权继续烘焙，并在执行日志留下抽查记录（发车 = 授权按冻结规则命名，不是测试绿灯冒充抽查）。
- **完成定义**：§3 中除明确 `deferred` 的 T26 / 合并到 `main` 外，工作项 checkbox 为 `[x]` 且各有 commit + 测试证据；closure 与三路审查报告落盘。
- **证据原则**：每个 PASS 带 commit、测试名或命令、UTC。`test-all` 退出码 0 不单独销 T01–T25，也不把 T26 改成已观察。
- **执行回写**：完成一个 Item 就回写本节，不在收口时一次性勾完。
- **交接原则**：T26 与合并到 `main` 留给 [业主]；worktree 保留到 [业主] 要求删除。

## 2. 依赖关系 / DAG

```text
P0-00 干净树 + worktree
  └─▶ P1-01 事件闭集
        └─▶ P1-02 四门面 observe（测试先锁未注入）
              └─▶ P1-03 onCall 退役 + 重建 lib
                    └─▶ COMMIT W1
                          └─▶ P2-01 账本 id/channel/match
                                └─▶ P2-02 命名表
                                      └─▶ P2-03 烘焙 + 退役 route-table
                                            └─▶ P2-04 inventory id
                                                  └─▶ COMMIT W2
                                                        └─▶ P3-01 协议键
                                                              └─▶ P3-02 read/cutWindow
                                                                    └─▶ P3-03 diagnose
                                                                          └─▶ P3-04 只读 handler（不提前动 DNEE 排空）
                                                                                └─▶ P3-05 声明 + join + observe 注入
                                                                                      └─▶ P3-06 span / 开关
                                                                                            └─▶ P3-07 ③ 排空与侧载
                                                                                                  └─▶ P3-08 lab 读者
                                                                                                        └─▶ P3-09 ⑤ 对照后删 evaluate；⑥ 基线
                                                                                                              └─▶ P3-10 spec rev5
                                                                                                                    └─▶ COMMIT W3
                                                                                                                          └─▶ LOG + CLOSURE
                                                                                                                                └─▶ 三路审查 → 修复环
```

失败路径：任一 Phase 测试不绿则停在该 Phase，不进入下一 Phase 的 commit。`11.7` 对照不一致则不删 `evaluate`、不重录基线。T26 不执行。

| 节点 | 目的 | depends on | entry | exit | failure |
|------|------|------------|-------|------|---------|
| W1 | 未使用的观测口 | P0-00 | 工作树干净 | T01–T04 有证据，生产无 `observe:` | 不 commit，不进入 W2 |
| W2 | 合同面身份 | W1 commit | `11.3` 六文件已在 HEAD | 旧字段不漂，route-table 退役 | 不 commit，不进入 W3 |
| W3 | 一次硬切 | W2 commit | ①→⑦ 同 worktree 顺序提交 | T09–T25 有证据；T26 仍未观察 | 半套不进 `main` |

**顺序注记**：业主发车要求单一 worktree 完成全部编码，因此三个计划名（`pre1116-facade-observe` / `pre1116-binding-ids` / `pre1116-dnpr-v2`）落成同一分支 `facade-observe-binding-v2` 上的分组 commit，而不是三次合并到 `main`。`11.2` 的「W3 不得早于 W1 与 W2 都已合并」在本执行里读作：W3 的 commit 不得早于 W1、W2 的 commit，且在 [业主] 合并前 `main` 上看不到半套。

## 3. 工作项清单

- [x] `P0-00` — 确认工作树干净，创建 `.agents/worktrees/facade-observe-binding-v2`
  - **落点**：worktree 分支 `facade-observe-binding-v2`
  - **完成判据**：`git status` 干净后才开始改产品代码；分支从 `1a537f3` 切出
  - **验证映射**：`CHECK-P0` · **依赖**：无
  - **执行状态**：`complete` · **执行时间**：`2026-11-16T15:12:00Z` · **证据 / 备注**：`git worktree add -b facade-observe-binding-v2` from `1a537f3`；开工时 `git status` 空
- [x] `P1-01` — 观测事件与结果闭集
  - **落点**：`packages/dsh-interface/src/contracts/observeEvent.js`
  - **完成判据**：`assertObserveEvent` 拒绝未知 surface / outcome / 多余字段；route-guard 不 import `dsh-interface`
  - **验证映射**：`PRE1116-T02` · **依赖**：`P0-00`
  - **执行状态**：`complete` · **执行时间**：`2026-11-16T15:28:00Z` · **证据 / 备注**：`node --test packages/dsh-interface/test/observe-event.test.mjs` T02 与 route-guard 无 `dsh-interface` 字样
- [x] `P1-02` — 四门面可选 `observe`，未注入逐字一致
  - **落点**：`route-guard.js`、`createWebRegistrar.js`、`createJsonClient.js`、`createMcpToolset.js`
  - **完成判据**：不传 `observe` 时不读时钟；传入抛错时响应逐字相同；事件无 denylist 字段
  - **验证映射**：`PRE1116-T01` `PRE1116-T02` `PRE1116-T20` · **依赖**：`P1-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-16T15:28:00Z` · **证据 / 备注**：同一测试文件 T01/T02/T20 26/26 pass（含 route-guard 既有用例）
- [x] `P1-03` — `onCall` 退役并重建允许范围内的 `lib/` 副本
  - **落点**：§4.1 P1-03 清单；[DNMS] `lib/route-guard.js` 因 `11.3` 已干净而重建
  - **完成判据**：`onCall` 为 0；生产调用没有注入 `observe`
  - **验证映射**：`PRE1116-T03` `PRE1116-T04` · **依赖**：`P1-02`
  - **执行状态**：`complete` · **执行时间**：`2026-11-16T15:32:00Z` · **证据 / 备注**：T03/T04 pass。`lib/mcp.js` 已无 `onCall`。未提交 package-lock 噪声
- [x] `P2-01` — 账本补 `id`/`channel`/`match`，生成器保留且不从 path 推导
  - **落点**：`security/route-sensitivity.json`、`scripts/gen-route-sensitivity.mjs`、`scripts/route-scan.mjs`
  - **完成判据**：旧字段逐条不漂；upgrade 行仍在；缺 id 时 gen 非 0
  - **验证映射**：`PRE1116-T05` `PRE1116-T27` · **依赖**：W1 commit
  - **执行状态**：`complete` · **执行时间**：`2026-11-16T15:45:00Z` · **证据 / 备注**：`check-route-sensitivity` 87 routes 0 drift；缺 id 时 gen 非 0（binding-bake.test.mjs）
- [x] `P2-02` — 命名表与烘焙闸
  - **落点**：`security/perf-binding-ids.md`
  - **完成判据**：缺表或不一致时构建失败；path 变化不改 id
  - **验证映射**：`PRE1116-T06` · **依赖**：`P2-01`
  - **执行状态**：`complete` · **执行时间**：`2026-11-16T15:45:00Z` · **证据 / 备注**：`security/perf-binding-ids.md` 87 行。抽查记录：发车指令授权按 `05.2` 沿用已有 id 并补 `<abbr>.<face>`，不是测试绿灯。
- [x] `P2-03` — 七插件 `bindingTableModule`；退役 `routeTableModule` 与现存 route-table
  - **落点**：`packages/dsh-interface/src/build/index.js` 与七个插件构建脚本 / `lib/bindings.js`；[DNLS] 新建只烘焙绑定表的脚本
  - **完成判据**：两次烘焙字节相同；[DNMSC] 无绑定表；[DNLS] 无新浏览器 client
  - **验证映射**：`PRE1116-T07` · **依赖**：`P2-02`
  - **执行状态**：`complete` · **执行时间**：`2026-11-16T15:48:00Z` · **证据 / 备注**：`routeTableModule` 已删；七份 `lib/bindings.js`；[DNK] 空表且不再 registerRoutes。
- [ ] `P2-04` — guard 记录带 id；route-inventory 与路由说明
  - **落点**：`route-guard.js` inventory；`security/route-inventory.md`；在册插件 AGENTS 路由来源句
  - **完成判据**：inventory id 等于账本 id
  - **验证映射**：`PRE1116-T08` · **依赖**：`P2-03`
  - **执行状态**：`partial` · **执行时间**：`2026-11-16T15:48:00Z` · **证据 / 备注**：guard 冻结记录在有 id 时带上 id。`route-inventory.md` 与各包 AGENTS 路由来源句尚未改完，留在 W3 文档批。
- [ ] `P3-01` — 协议键、构建戳、不迁移旧单例
  - **落点**：DNPR `client.js` / `host.js` / `state.js`；七插件构建 define
  - **完成判据**：旧键对象字段不变；`legacyCopies` 增加；双构建戳一条 audit
  - **验证映射**：`PRE1116-T09` `PRE1116-T10` · **依赖**：W2 commit
  - **执行状态**：`partial` · **执行时间**：`2026-11-16T16:20:00Z` · **证据 / 备注**：新键 `Symbol.for('dsh.perfReview.v2'|'dsh.perfReviewHost.v2')`；旧键不迁移；`legacyCopies` 与双戳 audit 有单测。`LIB_VERSION` 仍导出，七插件构建戳 define 未注入。
- [ ] `P3-02` — v2 报告、`read` / `cutWindow`、宿主游标
  - **落点**：`client.js`、`aggregate.js`、`host.js`、`state.js`、`markdown.js`
  - **完成判据**：连续 `read()` 深相等；退役动词无别名
  - **验证映射**：`PRE1116-T11` `PRE1116-T12` `PRE1116-T13` `PRE1116-T21` · **依赖**：`P3-01`
  - **执行状态**：`partial` · **执行时间**：`2026-11-16T16:20:00Z` · **证据 / 备注**：顶层 `schema: dnpr.report/2`；页面 `read`/`cutWindow`；宿主无切窗动词，`read({since})` 不删样本。页面 `cutWindow` 尚未记住宿主 `next`。
- [ ] `P3-03` — `diagnose` 与 `validateDeclaration`
  - **落点**：`src/diagnose.js`、`src/declaration.js`、`test-helpers`
  - **完成判据**：浏览器产物不含 diagnose；插件名不出现在 DNPR 与 lab 源码
  - **验证映射**：`PRE1116-T14` `PRE1116-T15` · **依赖**：`P3-02`
  - **执行状态**：`partial` · **执行时间**：`2026-11-16T16:20:00Z` · **证据 / 备注**：`src/diagnose.js` 与 `src/declaration.js` 已从 `./client`、`./host` 分开导出。`npm test` 74 pass。七份声明与三方对账未做。
- [ ] `P3-04` — 只读 handler；写盘器退役；先挂 [DNN]/[DNMS]
  - **落点**：DNPR host 出口；[DNN]/[DNMS] 注册点。不含 [DNEE] `mode=window`
  - **完成判据**：双读者互不删样本；夹具不产生 `host.json`
  - **验证映射**：`PRE1116-T13` `PRE1116-T19`（写盘部分） · **依赖**：`P3-03`
  - **执行状态**：`partial` · **执行时间**：`2026-11-16T16:30:00Z` · **证据 / 备注**：`handleHostRead` 只接受 `since`。账本新增 `dnn.perf-review.host` 与 `dnms.perf-review.host`。写盘链已从 host.js 删除。[DNEE] 的 `mode=window` 没动。
- [ ] `P3-05` — 七份声明、适配器、四处 join 替换、六个合同面传入 `observe`
  - **落点**：`src/perf/declaration.json` ×7；三份 `src/client/perf.js` 与 [DNK] 懒 join
  - **完成判据**：不新建第四份 `perf.js`；[DNMSC] 零依赖
  - **验证映射**：`PRE1116-T16` `PRE1116-T15` · **依赖**：`P3-04`
  - **执行状态**：`partial` · **执行时间**：`2026-11-16T16:45:00Z` · **证据 / 备注**：七份声明通过校验。[DNMSC] 无声明。六个合同面传入 `observe`。四处页面 join 还没替换。
- [ ] `P3-06` — 9 个手写 span、动态名封闭、采集开关只认运维入口
  - **落点**：§7.1 A-24；[DNK] `src/host/perf.js` 留 `hostSpan`
  - **完成判据**：退役 5 名不在 `keys.hostSpans`；插件不再写 `process.env.DSH_PERF_REVIEW`
  - **验证映射**：`PRE1116-T17` `PRE1116-T18` · **依赖**：`P3-05`
  - **执行状态**：`partial` · **执行时间**：`2026-11-16T16:55:00Z` · **证据 / 备注**：`catalog`/`read`/`save`/`list`/`sessions` 已从插件源码拿掉。保留 `git-status`、`stats`、`self`、`kite-warmup`。[DNK] 不再写 `DSH_PERF_REVIEW`，`setPerfEnabled` 与 `perfSnapshot` 已删。动态步骤走 `FX_STEP_SPAN`。
- [ ] `P3-07` — `11.5` ③ 排空与侧载退役（不提前）
  - **落点**：[DNEE] `mode=window`；[DNLS] 两条 perf 路由（按符号，不按 `:1137`）；[DNK] configure / POST / `perf` 字段
  - **完成判据**：`read:host` 恰好三条；其余 [DNLS] 路由不漂
  - **验证映射**：`PRE1116-T19` · **依赖**：`P3-06`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `P3-08` — lab 声明驱动与 v2 读者
  - **落点**：`lab/*.mjs`；两份 `e2e-ego.mjs`
  - **完成判据**：`shared-open` 消失；页级三场景仍在；不再调用 `report()`
  - **验证映射**：`PRE1116-T22` `PRE1116-T12` · **依赖**：`P3-07`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `P3-09` — 对照后删除旧 `evaluate`；基线与体积（两次提交）
  - **落点**：`lab/budgets.mjs`、`lab/baseline/baseline.json`
  - **完成判据**：对照表只比通过/失败 id；不一致则不删、不重录
  - **验证映射**：`PRE1116-T23` `PRE1116-T24` · **依赖**：`P3-08`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `P3-10` — spec rev5 与事实文档
  - **落点**：`docs/specs/dsh-nano-performance-review/spec-26nov.md` 与各包事实句
  - **完成判据**：包文档不再把 `report()` 清空窗口或 [DNK] 拥有 perf 路由写成现行事实
  - **验证映射**：`PRE1116-T25` · **依赖**：`P3-09`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `P4-LOG` — 工作日志回填到执行计划底部
  - **落点**：`PRE-1116-action-plan.md` §11
  - **完成判据**：逐项状态、偏差、测试证据
  - **验证映射**：`CHECK-LOG` · **依赖**：`P3-10`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `P4-CLOSE` — closure
  - **落点**：`docs/code-review/26-nov/PRE-1116-closure.md`
  - **完成判据**：close-type 与证据四元组一致；T26 标未观察
  - **验证映射**：`CHECK-CLOSE` · **依赖**：`P4-LOG`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`
- [ ] `P4-REVIEW` — 不少于三路审查子代理，汇聚后修复到收口
  - **落点**：`.anote/reviews/PRE/1116/`
  - **完成判据**：真相层对账、完成度、防假绿三份报告落盘；修复后再测
  - **验证映射**：`CHECK-REVIEW` · **依赖**：`P4-CLOSE`
  - **执行状态**：`not-started` · **执行时间**：`-` · **证据 / 备注**：`-`

## 4. 验收与证据

| Check ID | 验证什么 | 方法 | 预期 | 实际结果 | 证据 | 状态 |
|----------|----------|------|------|----------|------|------|
| `CHECK-P0` | worktree 与干净基线 | `git status` / `git worktree list` | 从干净 `1a537f3` 切出 | worktree 已创建 | 本文件 | `pass` |
| `PRE1116-T01` | 未注入逐字一致且不读时钟 | 门面单测 | diff 空；`performance.now` 差为 0 | 26/26 pass，clock delta 0 | `observe-event.test.mjs` 2026-11-16T15:32Z | `pass` |
| `PRE1116-T02` | 闭集、四出口、denylist | `observe-event` 与门面用例 | 未知 surface/outcome/多余字段被拒绝 | 四出口 + denylist 断言通过 | 同上 | `pass` |
| `PRE1116-T03` | `onCall` 为 0 | 源码扫描含 `lib/` | 0 命中 | 0 命中 | 同上 | `pass` |
| `PRE1116-T04` | 生产无 `observe:` 注入 | 插件 `src/` + `index.js` | W1 为 0 | 0 命中 | 同上 | `pass` |
| `PRE1116-T05` | 账本旧字段与审定三字段 | gen 再生成对照 | 逐条相等；缺 id 非 0 | gen 对照相等；缺 id 退出码非 0 | binding-bake.test.mjs 2026-11-16T15:45Z | `pass` |
| `PRE1116-T06` | 命名表负例 | 烘焙负例 | 缺表 / 不一致 / path 改 id 不变 | path 改了 id 仍是原 id；命名不一致抛错 | 同上 | `pass` |
| `PRE1116-T07` | 单一烘焙作者 | check-clean-lib + 存在性 | 7 份 bindings；无 routeTableModule | `routeTableModule` 导出不存在；clean-lib OK | 同上 + check-clean-lib | `pass` |
| `PRE1116-T08` | inventory id | route-guard 测试 | id 等于账本 | 记录在 row.id 存在时带 id；文档句未改 | route-guard.js 冻结记录 | `partial` |
| `PRE1116-T09`–`T15` | W3 包内协议、报告、判定 | `npm test`（dsh-performance-review） | 74 pass。构建戳未进七插件；`LIB_VERSION` 仍在 | 2026-11-16T16:20Z `npm test` 74/74 | `packages/dsh-performance-review` | `partial` |
| `PRE1116-T16`–`T25` | 声明、span、lab、文档 | 见执行计划 §8 | 各有负例 | - | - | `pending` |
| `PRE1116-T26` | 本机真实页面 | 不执行 | 保持未观察 | 无 grant 不部署 | - | `not-applicable` |
| `PRE1116-T27` | route-scan | `node scripts/route-scan.mjs` | 漂移类 0；upgrade 仍在 | - | - | `pending` |
| `PRE1116-T28` | test-all --build | W2 与 W3 各一次 | 退出码 0，不销其他 ID | - | - | `pending` |

- **真实成功**：T26 不用单测冒充。命名抽查不由 T06 绿灯代替，记录在执行日志。

## 5. 当前状态与交接

- **当前节点**：5 个手写 span 已退役，待提交。[DNEE] 排空和 lab 还没动。
- **下一动作**：提交这一刀，然后按 `11.5` ③ 删排空和侧载。
- **当前阻塞**：无。
- **待 owner**：合并到 `main`；T26 部署；worktree 删除。
- **最终交接**：分支 `facade-observe-binding-v2`，closure 指向本 todo。

| Item | 状态 | 原因 | 下一动作 | 责任 | 重开 |
|------|------|------|----------|------|------|
| T26 | deferred | 执行计划明文无 grant 不部署 | [业主] 另立 grant | [业主] | grant 出现 |
| merge `main` | deferred | 发车授权编码，未授权合并 | [业主] 决定合并 | [业主] | 明确要求合并 |

## 6. 已启用插件

#### `P-SCOPE` — 范围

- **触发理由**：路径清单、`11.3`、不得侧载、不得给 [DNMSC] 加依赖。
- **允许写面**：执行计划 in-scope 文件。禁止 `RELEASE.md`、第四份 `perf.js`、第 4 条读路由、v1 别名。
- **实际记录**：开工时 `11.3` 六文件无未提交 diff。
- **状态**：执行中。

#### `P-REF` — reference-anchor

- **触发理由**：执行计划 §7 是 grounding 真源。
- **最低要求**：复用 `FAILURE_KIND`、`bindingTableModule`、`pickOwner`；反例见 §7.2 ⛔1–⛔19。
- **状态**：编码时逐条对照。

#### `P-TEST` — 防假绿

- **触发理由**：§8.6 逐 Test-ID 假绿手法。
- **最低要求**：负例必须能在错误实现下失败；T28 不销其他 ID。
- **状态**：随 Phase 补测试。

#### `P-EXEC` — 执行日志

- **触发理由**：多 Phase 实际执行。
- **落点**：收口时 append 到 action-plan §11。

#### `P-CLOSE` — closure

- **触发理由**：阶段收口。
- **落点**：`docs/code-review/26-nov/PRE-1116-closure.md`。

## 7. Todo 自检

- [x] 核心脊 §§1–5 齐全。
- [x] DAG 依赖可见，未照抄无关示例 block 数。
- [ ] 每个完成项回写 checkbox、UTC、证据。
- [ ] 每个 `pass` 有证据。
- [x] 适用插件已启用。
- [x] T26 与合并未写成已完成。

## 8. 业主发车指令（原文登记）

本 directive 注册于 2026-11-16。执行范围是 `PRE` / `1116`。以下为业主原文，不改写：

> # 工作范围与目标
> 仓库与分支: dsh-nano / main
> 目标: 按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作
>
> ## 本次工作涉及的编号
> | 工作插件 | 工作波次 | 工作项目 | 子项阶段 |
> |-------|-------|-------|-------|
> | `PRE` | N/A | `1116` | N/A |
>
> ## 原则
> WARN#1 - 开始 `编码` 执行前, 必须保证工作树干净。如果工作树中有未保存的内容, 你会对内容进行分析, 然后在当前分支下完成 commit
> WARN#2 - `业主授权`: 必须阅读 AGENTS.md 对应文档的指导下进行工作
> WARN#3 - 每一个 [执行计划] 中的 Phase 完成后, 你需要回到 todo.{工作项目}.md 中, 更新 checkbox 并登记执行状态, 不得在所有工作完成后一次性 tick 全部的 boxes
> INFO#1 - 必须按照 [执行计划] 中的 DAG 中明确要求, 构建执行顺序。在构建 todo 文档的时候, 必须严格进行顺序 block 限制
> INFO#2 - 工作波次是可选项。如果存在, 则下面的对应目录层级可以增加。如果没有指定, 则忽略这个层级
> INFO#3 - 代码审查子代理的的 `专用审查PROMPT` 以及审查产出的 review 报告, 需要落盘于 [.anote/reviews/{工作阶段}/{工作项目}] 文件夹
> INFO#4 - 按照 [执行计划], 在 `业主授权` 规范下, 有权对 workers 集群进行 live migration + rebuild + deploy , 并授权你在当前 `工作阶段` + `工作项目` 的框架内完成 digest 的创建与 SSOT 建立
>
> ## 上游必读文件
> 最终执行计划: [docs/code-review/26-nov/PRE-1116-action-plan.md]
> 真相层: [docs/code-review/26-nov/PRE-1116-qna-truth.md]
>
> ## 工作方法
> STEP.0 - 在 [执行计划] 位于的目录内, 在 `todo计划模板` 规范下创建 todo.{工作项目}.md 这个跟踪对象, 以 DAG + checkbox 的创建任务执行的跟踪文件. 你会将本次发车的完整指令, 作为附件, 注入在 todo 文档底部
> STEP.1 - 重新拉取本阶段使用的全部上游必读文件, 并对工作区域的代码进行梳理, 从结构上理解当前工作区域的性质, 业务流转的方向, 建立对当前业务的横向层面认知
> STEP.2 - 在建立横向认知后, 对重点代码的 git 历史进行回溯, 建立起从时间轴纵向上, 对焦点代码的历史沿革的认知。创建对 git HASH 映射关系的图谱
> STEP.3 - 从横向和纵向上建立执行关系后, 判断是否存在对应的 reference-anchor, 是否拥有正例/反例可供参考, 是否在 context/ 内存在对应的参考系可以进行借鉴
> STEP.4 - 在获得全部上下文后, 你会严格在 [工作目标] 的范围内, 按照 [执行计划] 中的详细要求, 进行完整, 完全的代码开发, 静态审查, 以及测试收口工作。在执行期间内每完成一个 Phase, 就对当前阶段对应的代码完成分组 commit
> STEP.5 - 全部编码工作完成后, 使用 `工作日志模板` 创建 [工作日志] 并回填至 [执行计划] 文档的底部
> STEP.6 - 按照 todo 中的安排, 完成全部的工作后, 按照 `closure模板` 要求, 输出本阶段 closure 文件至 docs/code-review/26-nov/PRE-1116-closure.md
> STEP.7 - 你会定制不少于3路从 **真相层对账**, **工作完成度**, **防测试假绿,防业务侧载** 等工作面的审查子代理, 对当前 todo 内已完成工作内容进行深度审查。审查开始前, 请为每一路子代理, 定制其专用的 Comprehensive 进攻性 `专用审查PROMPT`, 以便让子代理载入本次工作的 [执行计划] 后, 对我们本次执行展开深度, 专注, 全面地展开工作质量与数量的全面回顾
> STEP.8 - 回收子代理的代码审查报告, 在汇聚, 分析, 整理, 核实全部子代理的分析后, 执行更新或修复。修复完成后再次进入 测试↔修复 循环, 直至完成本工作项目的收口。并更新 closure 文件
>
> ## 使用到的模板
> `closure模板` = [.adocs/templates/closure.md]
> `工作日志模板` = [.adocs/templates/code-execution-log.md]
> `todo计划模板` = [.adocs/templates/action-todo.md]
>
> # 发车指令
> 基于我的上述要求, 请立刻按照工作方法, 完成 [执行计划] 中全部的编码, 并进行测试与文档撰写工作
> > Step.0 中的 todo 需要保留完整业主发车指令, 并注册本 directive
> > 遵循 AGENTS.md 的指令，构建独立 worktree，并在 worktree 下完成全部编码，测试，代码审查，与修复工作

**directive 读法（执行注，不改业主原文）**：INFO#4 的 live migration / deploy 被执行计划 `11.6` / `O4` / `PRE1116-T26` 收窄为「无另立 grant 不部署」。本执行因此不连远端、不改 `RELEASE.md`。rebuild 只指本仓 `lib/` 消费方产物重建。digest / SSOT 指本阶段的命名表、声明与 spec rev5，不另立第二套真相。
