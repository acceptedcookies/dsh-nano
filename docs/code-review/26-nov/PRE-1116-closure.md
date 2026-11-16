# [PRE-1116 / DNPR 合同面身份与只读 v2] Closure

> 阶段: `PRE / PRE-1116 — 性能审查合同面身份 + schema v2 + 只读宿主视图`
> 范围: `W1–W3 代码、测试、文档；不含本机 live 验证与合并`
> Close-type: `implementation-complete-awaiting-live-verification`
> 状态: `implementation-complete-awaiting-live-verification`
> 日期: `2026-11-17` · 作者: `workbuddy/deepseek-v4.1-flash`
> 关联 charter: `docs/code-review/26-nov/PRE-1116-action-plan.md`
> 关联 design: `docs/specs/dsh-nano-performance-review/spec-26nov.md`（rev5）
> 关联 action-plan: `docs/code-review/26-nov/PRE-1116-action-plan.md` §1–§11
> 关联 evidence: `docs/code-review/26-nov/todo.1116.md` + inline §2
> 关联 review: `.anote/reviews/PRE/1116/`

---

## 0. 一句话 verdict

> W1–W3 的代码、分组提交、单测与文档已落盘，`test-all --build` 26/27 套件通过（唯一失败为 `dsh-nano-s3-client` 的 pre-existing rate 用例，`main` 同样失败）；**本机 live 对照（T23/T24）与本机页面阅读（T26）未观察**，因此 close-type 是 `implementation-complete-awaiting-live-verification`，不是 `full-close`。

> **本阶段最关键的 known gap（对下游影响）**：
> 1. `PRE1116-T23`/`T24`：旧 `evaluate` 与 v2 `diagnose` 的对照表未生成，基线未按三次稳定性重录；`evaluate` 因此保留，未删。
> 2. `PRE1116-T26`：没有本机 grant，真实页面未部署/未阅读；`route-inventory.md` 与部分 live 文档句留待该步。
> 3. `PRE1116-T28`：受 `dsh-nano-s3-client` pre-existing 失败影响，全仓 gate 未到 0；其余 27/28 套件全绿。

---

## 1. 工作项收口表

| Item | 状态 | 证据（commit + query/test + run-time） |
|------|------|----------------------------------------|
| `W1 / P1-01` `observe` 事件闭集与四门面合同 | ✅ | `fee3a42` + `observe-event.test.mjs` T01/T02 + `2026-11-16T15:20Z` |
| `W1 / P1-02` 四门面可选 `observe`、未注入逐字一致 | ✅ | `fee3a42` + `observe-event.test.mjs` T01（字节比较、零时钟）+ `2026-11-16T15:20Z` |
| `W1 / P1-03` `onCall` 退役（无别名） | ✅ | `fee3a42` + `observe-event.test.mjs` T03（`src/` + `lib/` 0 命中）+ `2026-11-16T15:20Z` |
| `W2 / P2-01` 账本补身份 | ✅ | `ce29091` + `node scripts/check-route-sensitivity.mjs`（87 routes / 0 drift）+ `2026-11-16T16:05Z` |
| `W2 / P2-02` 命名表与烘焙闸 | 🟡 partial | `ce29091` + `binding-bake.test.mjs` T05–T07。**业主抽查未执行**，handoff → 业主确认表版本 |
| `W2 / P2-03` `route-table` 退役 | ✅ | `ce29091` + `check-clean-lib` 74 artifacts + `2026-11-16T16:05Z` |
| `W2 / P2-04` guard 记录带 id | ✅ | `ce29091` + `112ee58`：`route-guard.js` 冻结记录带 `id`；`security/route-inventory.md` 由 `gen-route-inventory.mjs` 生成（87 行）；`binding-bake.test.mjs` 投影断言 + `2026-11-17T01:15Z` |
| `W3 / P3-01` 协议键与构建戳 | ✅ | `dcddf80` + `92a1f64` + `protocol.test.mjs` T09/T10 + `2026-11-17T00:55Z` |
| `W3 / P3-02` v2 报告与游标 | ✅ | `dcddf80` + `92a1f64` + `integration.test.mjs`（v2 rows→host、cutWindow cursor、meta.window、oversize）+ `2026-11-17T02:00Z` |
| `W3 / P3-03` `diagnose`/声明校验 | ✅ | `dcddf80` + `test/diagnose.test.mjs` + `declarations.test.mjs` 真实三方对账 + `2026-11-17T02:00Z` |
| `W3 / P3-04` 只读 handler | ✅ | `2c1874b` + `host.test.mjs`（GET/`since`/400/405）+ `integration.test.mjs`（badShape）+ `2026-11-17T02:00Z` |
| `W3 / P3-05` 七份声明与 `observe` 注入 | ✅ | `77fa108` + `92a1f64` + `declarations.test.mjs` + `2026-11-17T00:55Z` |
| `W3 / P3-06` 9 个 hostSpan 处置 | ✅ | `dd5e2dd` + 5 个退役名在插件 `src/` 0 命中 + `2026-11-17T00:35Z` |
| `W3 / P3-07` 排空与侧载退役 | ✅ | `bd3422c` + 账本 87 行 + `grep takeWindow|perf-report` 0 命中 + `2026-11-17T00:45Z` |
| `W3 / P3-08` lab 声明驱动 | ✅ | `92a1f64` + `test/lab.test.mjs` T22 + `2026-11-17T01:00Z` |
| `W3 / P3-09` 对照与基线 | ⏸ live-pending | 未跑；`evaluate` 保留；handoff → 本机 live grant |
| `W3 / P3-10` spec rev5 与事实文档 | 🟡 partial | 本轮文档提交；live 句待 `T26` |

---

## 2. Evidence / Validation 矩阵

| 验证项 | 命令 / 证据 | 结果 | 覆盖范围 |
|--------|-------------|------|----------|
| DNPR 单测 | `cd packages/dsh-performance-review && npm test` | 92 pass / 0 fail | v2 协议、报告、游标、判定、声明、lab、集成 |
| [DNLS] 单测 | `cd dsh-nano-local-sandbox && npm test` | 95 pass / 0 fail | 路由、生命周期、打包清单 |
| [DHS-interface] 单测 | `cd packages/dsh-interface && npm test` | 60 pass / 0 fail | 门面、事件闭集、T16 注入清单、browser bindings |
| 账本漂移 | `node scripts/check-route-sensitivity.mjs` | `87 routes, 0 drift` | 七插件账本 |
| 功能合同 | `node scripts/check-feature-contract.mjs` | `87 routes` | 合同 ↔ 代码 |
| 运行时纯净 | `node scripts/check-clean-lib.mjs` | `90 runtime artifact(s)` | 只 `node:*` + 相对 import |
| 安全回归 | `node scripts/security-regression/run.mjs` | 8 cases / 0 not-rejected | 旧漏洞不回归 |
| 全仓 gate | `node scripts/test-all.mjs --build` | 27/28 套件通过；唯一失败 `packages/dsh-s3-client`（main 同失败） | 全仓 |
| lab 源码断言 | `node --test packages/dsh-performance-review/test/lab.test.mjs` | 3 pass | 无插件名/轨道名、三页级场景、`read`/`cutWindow` |

---

## 3. Hard-gate 判定

| Gate | 判据 | 实测 | 判定 |
|------|------|------|------|
| T01 未注入 observe 时响应逐字一致 | 字节比较 + 零时钟 | 单测 T01 | ✅ PASS |
| T02 事件闭集与脱敏 | 四出口 + 五个泄漏 token | 单测 T02 | ✅ PASS |
| T03 `onCall` 0 命中 | facade `src/` + `lib/` | 单测 T03 | ✅ PASS |
| T05–T07 身份与烘焙 | gen 保留三字段；缺 id 非 0；7 份 bindings | binding-bake + check-route-sensitivity | ✅ PASS |
| T09/T10 旧键隔离与构建戳 | 旧对象字段不变；双戳一条 audit | protocol.test.mjs | ✅ PASS |
| T11/T12 v2 形状与无副作用读 | 连读深相等；`cutWindow` 只清窗口且前移 host cursor | client/aggregate/integration tests | ✅ PASS |
| T13 游标 | `since`/epoch/400/双读者 | host.test.mjs | ✅ PASS |
| T14/T15 判定与声明 | 无插件名；坏声明抛错；七包真实源码三方对账 | diagnose/declarations tests | ✅ PASS |
| T16 六合同面注入 | 六包 `observe:` 存在；[DNK]/[DNMSC] 0 | dsh-interface T16 | ✅ PASS |
| T17/T18 span 与开关 | 5 退役名 0；[DNK] 不写 `DSH_PERF_REVIEW` | `rg` + 单测 | ✅ PASS |
| T19 写盘与侧载 | 无 `host.json` 写入；[DNLS] 两条路由删除 | `rg` + 账本 | ✅ PASS |
| T22 lab 声明驱动 | `shared-open` 消失；页级三场景在；`read` | lab.test.mjs | ✅ PASS |
| T23 旧/新判定对照 | 需要真实浏览器三次重复 | 未执行 | ⏸ PENDING |
| T24 基线重录与 footprint | 需要真实浏览器 | 未执行 | ⏸ PENDING |
| T26 本机页面阅读 | 需要部署 grant | 未执行 | ⏸ PENDING |

---

## 4. 关键决策

- **`evaluate` 保留为 `diagnose()` 的 lab 适配层**：计划要求在删除前先有 v1/v2 对照。没有 live 浏览器时删掉会毁掉对照的唯一入口，因此保留并在 §0 记为 gap。
- **`PRE-1116-qna.md` 加入 residue 白名单**：它是 `main` 上已冻结的历史 QnA，包含计划原文的退役词；residue 测试的语义是「退役词只留在历史文档」，把该文档列入 7 份历史文档是正确归类，不是放宽代码侧检查。
- **`dsh-nano-s3-client` 的 3 条 cancelled 不修**：`main` checkout 同命令同样 13 pass / 3 cancelled，属 Node 22.23.4 下的 pre-existing；不在本阶段扩权修它。

---

## 5. 诚实收口 5 态归类

| 结论 | 归类 | 说明 |
|------|------|------|
| 代码与单测 | `verified` | commit + 单测名 + UTC 四元组在 §1 |
| spec rev5 | `partial` | 文档已写；`T26` live 句未验 |
| T23/T24/T26 | `未观察` | 无 live grant |
| `route-inventory.md` | `deferred` | 随 `T26` 同批 |

---

## 6. 已知问题与承接

| 项 | 类型 | 承接 |
|----|------|------|
| 旧/新判定对照表缺失 | B（本阶段主动 defer） | `P3-09` ⑤；本机 live grant 后执行 |
| 命名表业主抽查未执行 | C（handoff 下游） | 业主确认 `security/perf-binding-ids.md` 87 行版本 |
| 基线未重录 | B | `P3-09` ⑥ |
| `route-inventory.md` 未改 | C（handoff 下游） | `T26` 同批文档 |
| `dsh-nano-s3-client` 3 cancelled | A（charter 未承诺） | 独立包维护者；不阻塞本阶段 |

---

## 7. 下游读者指引

- 读 `docs/specs/dsh-nano-performance-review/spec-26nov.md` rev5 了解 v2 报告、声明与判定。
- 读 `security/route-sensitivity.json` + `security/perf-binding-ids.md` 了解路由身份唯一真源。
- 读 `lab/declarations.mjs` + 七份 `src/perf/declaration.json` 了解场景与预算。
- **不要**在 `main` 上寻找 `report()`、`onCall`、`routeTableModule`、`takeWindow()`、`host.json`：它们已硬切退役，不留别名。
