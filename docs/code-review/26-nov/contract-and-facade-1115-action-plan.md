# Nano-Agent 行动计划 · CF1115 全活跃插件 Contract/Facade 统一

> 服务业务簇: `contract-and-facade`（[dsh-nano] 全部活跃插件 contract 与 facade 统一为固定真源）
> 计划对象: `1115 · CF1115 统一实施计划（P0–P4 分阶段统一与测试）`
> 类型: `refactor | migration`
> 作者: `CF1115 计划 agent（lead）`
> 时间: `2026-11-15`
> 文件位置: `docs/code-review/26-nov/contract-and-facade-1115-action-plan.md`
> 上游前序 / closure:
> - `docs/code-review/26-nov/contract-and-facade-1115-qna.md`（v0.12 `🔒 FROZEN`，decision provenance；Q1–Q16 全选 A，22 条 `T-O` / 126 条 F 条款，§7.3 最终收口对账）
> - `docs/code-review/26-nov/contract-and-facade-1115-qna-truth.md`（`CF1115-TRUTH` v0.1.1，投影引用面；`FROZEN · NOT IMPLEMENTATION CLOSURE · NOT IMPLEMENTATION GRANT`）
> 下游交接:
> - **（另立）`ImplementationGrant`** —— 本 AP 不签发、不替代：[真相层] §0.1「足以写下游计划: YES / 足以签发 implementation grant: NO」、权威边界 6、P6「阻塞实现的动工与销账」。动工前须由 [业主] 另立授权（truth §0.1 箭头图）。
> - P4 逐项结算后，未实施 / 未验证债务按原 `E1115-*` 观察号 handoff，不静默清零。
> 关联设计 / 调研文档:
> - `docs/code-review/26-nov/contract-and-facade-1115-eval.md`（设计稿 / 形成史：36 项逐包观察 + 4 项横向观察按原号保留；85/118/47/48/43 为时点口径）
> - `docs/code-review/26-nov/contract-and-facade.md`（1112 历史对账，仅回溯，不作现行分母）
> - `docs/code-review/26-nov/security-audit.md`（§2 信任边界，供 §7.3 威胁模型锚；**其发现不在本 AP 修复范围**）
> 冻结决策来源:
> - `contract-and-facade-1115-qna.md` §1 台账 + 业主回答 + Q5/Q6/Q8/Q11/Q13/Q14/Q15/Q16 原题矩阵/签名/表；`contract-and-facade-1115-qna-truth.md` 全册（只读引用；本 action-plan 不填写 Q/A、不复制业主回答台账、不改规则句）
> grounding 来源:
> - `eval §3–§9 / 附录 A`（形成史测量）+ QNA E1–E76 `file:line` 逐轮取证 + 上游 DNLS01/DNMS01 QNA 已冻法律；无独立 `eval-reference-anchor` 文件 → **§7 内置锚区即本 AP 的 grounding 真源**
> 关联 reference-anchor: `见 §7 内置锚区（含 §7.0 快照/漂移说明）`
> 文档状态: `draft`
>
> 词汇锚定约定：本 AP **自著行文**中的核心词汇（[业主]、[真相层]、[dsh]、[dsh-nano] 与 8 个活跃插件缩写 [DNEE]/[DNK]/[DNMS]/[DNMSC]/[DNN]/[DNT]/[DNLS]/[DNCS]）按根 `AGENTS.md:1-20` 核心词汇台账带 `[]` 锚定（与 `CF1115-TRUTH` v0.1.1 修订口径一致）；`file:line` 路径、`dsh-nano-*` 包名、`E1115-*` 观察号、`T-O`/F 条款号、Test-ID 与代码块 / DAG 标签内的标识符保持裸写，不套 `[]`。

---

## 0. 执行背景与目标

> **纪律**：本文件只消费已冻结结论。Q1–Q16 全部回答并冻结（§7.3 无 owner-gated 空白），本 AP **不新开 Q/A**、不把执行中发现的新公共改约写成第 7 轮；若实施期真出现公共合同变更，走 `AGENTS.md:40-41` 的正常 [业主] 变更登记（truth P6「不得重开」/ F19.8 / F22.8），本 AP 保持 `draft` 并如实登记。
>
> **授权边界（贯穿全文，冲突时以冻结 QNA truth 为准）**：本 AP 是 truth ledger §0.1 箭头图里的「下游统一实施计划 / P0–P4 action-plan（只 CITE）」节点，**不是** implementation grant、不是 build/deploy/secret/provider/远端动作授权、不新增 release-gate、不安装/重启现用 profile（含 `dsh.local`）。[真相层] `FROZEN` 不表示代码已改、测试已绿、迁移已应用或债务已清零（权威边界 5 / B-10 / AF-5）。因此：**本 AP 全部工作项是「待执行」的施工规划，当前 0 项已开工、0 项 PASS、0 项销账**；§8 测试台账的四元组是「执行期必须产出的证据形状」，不是既成事实；§10 全部收口状态为 `未观察 / deferred`，不得标 `executed`（§11 按模板省略）。

- **服务业务簇**：`contract-and-facade`
- **计划对象**：`1115 · CF1115 —— 把 [dsh-nano] 全部 8 个活跃插件的 contract 与 facade 统一为固定真源，分阶段完成所有插件的统一与测试`
- **本次计划解决的问题**：
  - 把 `-11`–`-22` 十二条 executional 真相及其 126 条 F 条款、被宣告为规范组成的原题矩阵 / 签名 / 表，投影成可施工、可验证、可销账的 DAG 工作项（`T-O-CF1115-19` / F19.3）。
  - 以「合同族的生产者—消费者闭环」为最小完成 / 销账单位（`T-O-CF1115-8` / F8.5），按 Q13 冻结的 P0–P4 阶段与八包责任表逐族成对硬切、验证、退役、销账。
  - 设计覆盖完整、收口明确、含专业防假绿侦测的测试台账，杜绝「目录 / 声明数量当业务完成」「占位摘要冒成功」「删断言求绿」等假绿（F8.2 / F10.3 / F13.6 / F21.8）。
- **本次计划的直接产出**：
  - 一份 `draft` 状态的 P0–P4 统一实施计划（本文），5 个 Phase、21 个工作项、21 个 Test-ID、逐 Test-ID 防假绿侦测台账。
  - 每个工作项三件齐全：`涉及文件（file:line）` + `收口目标` + `测试映射`；净新 / 高风险项补第 4 件有序分解步骤。
  - §7 内置 reference-anchor 锚区（含威胁模型落点），实现时 0 跳转、grounding 0 泄漏。
- **本计划不重新讨论的设计结论**（CITE，冲突时回 QNA append-only supersession）：
  - 一个构建期共享归口包 `packages/dsh-interface`（纯 ESM、contracts/host/build 三出口、guard 单向复用唯一实现、每包物化离仓自包含）为可执行真源（来源：`T-O-CF1115-11` / Q5-A / F11.1–F11.8 / Q5 出口表 truth:204-210）。
  - 合同族闭环 = 生产者与真实消费者共同迁移、先验收后成对硬切、旧面一次性退役（来源：`T-O-CF1115-8`、DNLS01 `T-O-10`:57 / 判例 :163/:165）。
  - P0–P4 阶段与八包责任表原样冻结，阶段「依赖驱动、独立闭环可并行，不把阶段数字当全仓 release-gate」（来源：`T-O-CF1115-19` / F19.1 / Q13 第 1/2 项表 truth:417-434）。
  - 两提供面（DNLS 八工具 / DNT 本地十九工具）、sandbox 二十工具、native 四 `NATIVE_*` 错误码等原题矩阵/表为规范组成（来源：`T-O-CF1115-20/21/22` / Q14/Q15/Q16 原题 truth:456-543）。

---

## 1. 执行综述

### 1.1 总体执行方式

本 AP 采用**「先基座后 facade、先作者后消费者、先验收后硬切、逐合同族成对退役销账」**的执行方式，5 个 Phase 严格对齐 Q13 冻结的 P0–P4（不新造阶段、不把阶段当全仓发布总闸）。Phase 1（P0）先建 `packages/dsh-interface` 归口基座、唯一 guard 复用、公共 web 注册门面与 [DNN]/[DNT] 首批真实接线；其后的 facade（普通 JSON / 导入 / MCP / terminal / sandbox / native / host 适配）各自作为独立合同族闭环，在 P0 基座可用后按依赖并行推进；Phase 5（P4）做全范围证据 / 旧源 / 离仓产物对账与 36+4 观察逐项结算。全程「只 CITE」冻结真相，不改规则句、不由实现反推合同、不新增仪式门禁。

### 1.2 Phase 总览

| Phase | 名称（= 冻结阶段） | 规模 | 目标摘要 | 依赖前序 |
|------|------------------|------|----------|----------|
| Phase 1 | P0 · 归口基座与首批闭环（原样继承首批） | `L` | `packages/dsh-interface` 三出口 + guard 唯一源 + `createWebRegistrar` mixed-batch + [DNN]/[DNT] 真实 web 注册 / 准入 / 释放 / 离仓产物 + 成对硬切退役 | `-`（继承 `T-O-CF1115-11/12/13`） |
| Phase 2 | P1 · 普通 JSON 与浏览器公开能力 + 作者记录 | `L` | `createJsonClient`/`JsonOutcome` 唯一 codec、`nanoNotepad` 最小导入服务、`FamilyDefinition` 同源投影、[DNEE]/[DNMS]/[DNN] 基础 JSON 成对硬切 | Phase 1；`-14/-16/-17` |
| Phase 3 | P2 · 沙箱与终端真实互操作 | `XL` | `createMcpToolset`/`decodeMcpReply`、terminal 两提供面、sandbox 二十工具真实业务、[DNK] 旧资产退役、[DNT] 全协议消费 | Phase 1 + Phase 2；`-15/-20/-21` |
| Phase 4 | P3 · 剩余领域 / 标准协议 / host 适配 | `XL` | 官方 host 薄 adapter + 异步结算、[DNCS] native 支持边界与四错误码、[DNMSC] R-16 例外与影子 Service 退役、[DNEE] native 资源 / [DNN] S3·RPC·标准流与别名取舍 | Phase 2 + Phase 3；`-18/-22/-21(DNN)` |
| Phase 5 | P4 · 全范围结算 | `M` | 八包逐包覆盖证据 + 36 逐包观察 + 4 横向观察逐项结算 + 旧源 / 离仓产物对账 + 五态如实归类 + handoff | Phase 1–4 全部销账入账；`-19`/§7.3 |

> 说明：`规模` 仅为描述性提示，不是开工前体量判定闸，也不改变本模板任何段落取舍（模板单一、不分档）。阶段不成为全仓发布总闸（F19.1）；同一 Phase 内独立合同族闭环可并行（F19.1「依赖驱动、独立闭环可并行」）。

### 1.3 Phase 说明

1. **Phase 1 — P0 · 归口基座与首批闭环**
   - **核心目标**：建立唯一可执行真源（归口包 + guard + 公共注册门面），并用 DNN/DNT 首批真实接线证明「声明—接线—产物—退役」闭环可跑通，不冒领业务 / MCP（F13.8）。
   - **为什么先做**：`-11` 驱动 Q8–Q13、`-12` 驱动 Q9/Q11/Q13、`-13` 驱动 Q8–Q10/Q13；Q13 阶段表 P0「按 `-11` 至 `-13`」。基座未立，任何 facade 都会退化为第二作者源（F7.5 / F11.6）。
2. **Phase 2 — P1 · 普通 JSON / 导入 / 作者记录**
   - **核心目标**：把消费侧 facade（JsonOutcome 五类失败、最小导入服务、FamilyDefinition 同源投影）立起来，并对 DNEE/DNMS/DNN 基础 JSON 做生产者—消费者成对硬切（F14.7 / F19.5）。
   - **为什么放在这里**：`-14` 驱动 Q11/Q13/Q15/Q16，`-16` 驱动 Q11–Q13；Q13 P1 表「按 `-14`/`-16` 成对接线」。FamilyDefinition 在此确立形状并逐族投影（F17.4/F17.5），供 P2/P3 facade 消费，不构成额外前置总闸。
3. **Phase 3 — P2 · 沙箱与终端真实互操作**
   - **核心目标**：MCP 唯一工具定义 + 三层解码 + terminal 两提供面 + sandbox 二十工具真实业务接线 + DNK/DNT 消费与旧资产退役（F15/F20/F21）。
   - **为什么放在这里**：Q13 P2 前提「已冻领域义务接到真实生产路径；具体支持面 / 工具参数 / 幂等冲突先裁定，不能以 stub 或缩目录通过」；`-20/-21` 指向 P2 / §7.3。依赖 Phase 2 的 codec / 作者记录与 Phase 1 的注册门面。
4. **Phase 4 — P3 · 剩余领域 / 标准协议 / host 适配**
   - **核心目标**：官方 host 薄 adapter + 异步结算（`-18`）、DNCS native 支持边界与 `NATIVE_*` 四码（`-22`）、DNMSC R-16 精确例外与影子 Service 退役、DNN S3/RPC/fx/标准流与两组别名取舍（`-21` DNN 部分）。
   - **为什么放在这里**：`-18` 驱动 Q16，Q13 P3 明确「适用官方 / 领域合同可指认；未解决新约先回 QNA」；DNN 的 `/s3/config`/`/rpc` 按 F21.8 明确归 P3（非 P1/P2）。
5. **Phase 5 — P4 · 全范围结算**
   - **核心目标**：八包逐包证明全部适用边界覆盖（F8.7 / F19.7），36 逐包 + 4 横向观察逐项结算（B-8 / §7.3），五态如实归类，未实施 / 未验证债务按原观察号保留并 handoff（F22.8）。
   - **为什么放在最后**：Q13 P4 前提「所有适用合同族有完成证据或 [业主] 明确批准的其他处置，不由 agent 自行缩范围」。

### 1.4 执行策略说明

> **纪律**：本节写「怎么执行」，不重述 §6 已引用的冻结决策理由（避免与 design/qna 重复）。

- **执行顺序原则（DAG）**：

```text
  [Phase 1 / P0] 归口基座 + guard唯一源 + createWebRegistrar + DNN/DNT 首批闭环
        │  （-11/-12/-13；Q13 P0「按 -11 至 -13」；继承首批，不冒领业务/MCP）
        ├──────────────► [Phase 2 / P1] 普通JSON + 导入 + FamilyDefinition + 基础JSON成对硬切
        │                      │        （-14/-16/-17；F17.4 同源投影供下游 facade 消费）
        │                      ▼
        ├──────────────► [Phase 3 / P2] MCP + terminal两提供面 + sandbox二十工具 + DNK/DNT消费
        │                      │        （-15/-20/-21；Q13 P2 前提：真实生产路径、非stub）
        │                      ▼
        └──────────────► [Phase 4 / P3] host适配 + DNCS native + DNMSC例外 + DNN S3/RPC/标准流
                               │        （-18/-22/-21(DNN)；F21.8 明确 DNN S3/RPC 归 P3）
                               ▼
                        [Phase 5 / P4] 全范围结算（八包 + 36+4 观察 + 旧源/离仓产物 + 五态）
                               │
                               ▼
                 （另立 ImplementationGrant；本 AP 不进入动工/销账授权）

  并行边：Phase 2/3/4 内「独立合同族闭环」可并行（F19.1）；
          FamilyDefinition 逐族投影（F17.4/F17.5）是跨 Phase 的 backbone，不是串行总闸；
          阶段数字不构成全仓 release-gate（F19.1 / 不得过度仪式）。
  每族内部微环（F8.5 / F19.5，先验收后硬切、无兼容第四阶段）：
    目标合同(CITE) → 作者/实现/消费者/派生表/测试/说明/产物 成对硬切
      → 分层窄验证（生成/登记·schema/分发·消费者互操作·必要e2e）
      → 旧作者源一次性退役 → 按义务销账（未接通/未验证/需延期保持未完成，F8.8）
```

- **风险控制原则**：先验收后硬切、一次性退役、不双写、不留兼容壳 / 第四阶段（DNLS01 `T-O-10`:57、判例 :163/:165；F8.5 / F10.7 / F19.5）；安全字段手审逐项原值承接，不从代码自动推断权限/retry/限额（F9.4 / F11.7）；公共合同变更先有 [业主] durable 登记（AGENTS.md:40 `不得擅自扩约`）。
- **测试推进原则**：短途（每 PR 快测）→ spike（每 Phase 收口的真实装配 / 协议保真）→ 每族「一次必要集成」（Q7 原题验证表，**非全仓 mega 循环**）→ soak 仅用于 F18.8/F20.6/F22.8 指定的异步结算 / 断连单飞 / 卸载竞态场景（deterministic × N）。增量验证，不每改一处重跑全仓、不给每个私有函数新造仪式或 release-gate（F8.4 / F13.6 / F19.6）。详见 §8。
- **文档同步原则**：作者源、旧消费、副本、旧路径 / 别名、相关登记 / 说明一起结算（F8.6）；退役清单覆盖代码 / 注释 / 头注 / 行号锚 / 文档句五类落点（§9.3）；派生视图只读，不反作第二作者（F17.5）；公开 breaking 变化在实施中更新维护文档，不另立第二决定台账（F22.8）。
- **回滚 / 降级原则**：**无兼容第四阶段、无双写、无旧 parser 回退、无兼容 alias**（F8.5 / F10.7 / F19.5）。硬切前以离线快照 commit + tarball 校验 + 可注入 seam 的对等验收作为回退参照（`DNLS01 T-O-18:65` ③ 内的 `T-O-10` 缓解手段，并遵循该行末尾「② 对等验收之前完成台账对齐」的时序护栏；F13.3/F13.5），失败即保持未完成、不先删后补（F8.5 / F8.8）。不安装 / 不重启现用 profile（P6）。

### 1.5 本次 action-plan 影响结构图

> 按业务链路 / 执行路径写，不是文件系统快照。

```text
CF1115 统一实施计划（P0–P4）
├── Phase 1 / P0 · 归口基座与首批闭环
│   ├── packages/dsh-interface（contracts / host / build 三出口，🆕 净新）
│   ├── packages/dsh-host-route-guard（唯一 guard，✅ 单向复用）
│   ├── 公共 web 注册门面 createWebRegistrar（channel/match 绑定表 + mixed-batch）
│   ├── [DNN] HTTP + SDK prefix / [DNT] exact·close prefix·stream upgrade 真实接线
│   ├── 两包 build/baked 表/产物同源 + 离仓自包含
│   └── 三项既有检查 + DNT npm test/smoke 的验证与退役边界
├── Phase 2 / P1 · 普通 JSON / 导入 / 作者记录
│   ├── createJsonClient / JsonOutcome 五类失败 + 每操作唯一 codec
│   ├── FamilyDefinition 最小作者记录 + 同源投影（web表/operation/definition/服务声明）
│   ├── nanoNotepad 最小导入服务（Cordis）+ window global/别名退役
│   ├── [DNEE]/[DNMS]/[DNN] 基础文件 JSON 的 host+client 成对硬切
│   └── [DNEE] 相关消费者（notepad/nanoTerminal/open-in-app）接入对齐
├── Phase 3 / P2 · 沙箱与终端真实互操作
│   ├── createMcpToolset / decodeMcpReply 三层解码 + attach 严格
│   ├── terminal 两提供面：[DNLS] 八工具 / [DNT] 本地十九工具 + McpLane v1/v2
│   ├── sandbox 二十工具真实业务 + bridge 只做获准 CDP 驱动
│   ├── [DNK] 真实消费 + 容器时代旧资产/bridge 副本退役
│   └── [DNT] MCP/attach/WS/SSE/审计消费 + 公开 nanoTerminal
├── Phase 4 / P3 · 剩余领域 / 标准协议 / host 适配
│   ├── 官方 host 薄 adapter + 异步结算 + 桥身份/配置失效
│   ├── [DNCS] carrier + native 支持边界 + NATIVE_* 四码 + 义务表
│   ├── [DNMSC] R-16 精确例外 + 影子 FallbackService 退役
│   └── [DNEE] 官方 native 资源 / [DNN] fx·S3·自定义RPC·标准流 + 两组别名取舍
└── Phase 5 / P4 · 全范围结算
    ├── 八包逐包覆盖证据 + 36 逐包 + 4 横向 E1115-* 观察逐项结算
    ├── 旧作者源 / 离仓产物 / 扫描覆盖对账 + 五类退役清单
    └── 五态如实归类 + 未实施/未验证债务按原观察号 handoff
```

---

## 2. In-Scope / Out-of-Scope

> 设计上的边界来自 design/QNA；本节只说明本轮执行做什么、不做什么、何时重评。

### 2.1 In-Scope（本次 action-plan 明确要做）

- **[S1]** 把 `-11`–`-22` 十二条 executional 真相 + 126 条 F 条款 + Q5/Q6/Q8/Q11/Q13/Q14/Q15/Q16 原题矩阵/签名/表，CITE 成 P0–P4 的 21 个可施工工作项（§3/§4/§5），每项关联 Q/T-O、端点/操作、目标来源、产物、验证、退役、E1115 观察（F19.3）。
- **[S2]** 建立 `packages/dsh-interface` 归口基座（纯 ESM 构建期私有库、三出口、guard 单向复用、每包物化离仓自包含）与公共 web 注册门面，完成 DNN/DNT 首批真实接线、成对硬切、旧面退役（`-11/-12/-13`）。
- **[S3]** 逐合同族完成生产者—消费者闭环：普通 JSON / 导入 / MCP / terminal / sandbox / native / host 适配的 codec、作者记录、真实分发、协议保真、离仓产物（`-14`–`-18`、`-20`–`-22`）。
- **[S4]** P4 全范围结算：八包覆盖证据 + 36 逐包 + 4 横向观察逐项结算 + 旧源/离仓产物对账 + 五态如实归类（`-19` / F19.7 / F19.8 / §7.3 / B-8）。
- **[S5]** 设计覆盖完整、收口明确、含逐 Test-ID 防假绿侦测的测试台账（§8），并守住安全/信任边界不弱化（§7.3）。

### 2.2 Out-of-Scope（本次 action-plan 明确不做）

- **[O1]** **不签发 implementation / build / deploy / secret / provider / 远端动作 grant，不安装或重启现用 profile（含 `dsh.local`），不新增 release-gate，不做版本 bump / tag / release**（truth 权威边界 6 / §0.1 / P6「仍然不授权」/ AGENTS.md:39 `不得过度仪式`）。动工须另立 `ImplementationGrant`。
- **[O2]** **不新开 Q/A、不设 Round 7、不重开 Q1–Q16 已冻 A 路线及其替代读法**（多领域权威包、按包/按层销账、协议入口为作者主轴、全量同构、统一 wire 信封、整体迁走 guard、bridge 十五工具为真源、无条件完整 native、fake Agent 现状保留等）（truth P6「不得重开」/ F19.8 / F22.8）。
- **[O3]** **不恢复兼容第四阶段 / 双写 / 兼容 alias / 旧 parser 回退 / 常驻翻译链 / 统一全仓 wire 信封 / 通用 DSL / runtime 注册中心 / runtime 总线 / 共享 mutable store / 插件私有通道**（F7.2 / F7.7 / F8.5 / F9.2 / F10.7 / F11.8 / F14.2 / F15.1 / F19.5；AGENTS.md `单一真源`/`不得侧载`/`插件中立`）。
- **[O4]** **不擅自扩约**：不新增未登记的错误枚举、retry 法则、idempotency 键、lane、凭证面、wire 版本字段、发现通道、公共能力 ID；Q16 的四个 `NATIVE_*` 已由本题获准，只进 [DNCS] 唯一作者，不扩成全仓信封（F9.7 / F10.8 / F14.2 / F20.7 / F22.7 / AGENTS.md:40）。
- **[O5]** **不修复 `docs/code-review/26-nov/security-audit.md` 的既有安全发现**（如 `/read` 任意文件、`scopeOf` 跨会话、S3 SSRF、XSS 等），也不把 E1115-* 观察升级为已获批准的修复方案或新公共授权模型（eval §1.1 / F9.4 / truth §4.3 注）。本 AP 是 contract/facade 归口 refactor，不是安全审计整改。
- **[O6]** **不以时点统计作验收阈值**：85/118/47/48/43 与 35（过期 route-inventory）、54/41/39 声明槽位均为形成史快照，不作「减债」分母或未来验收门禁（B-2 / B-3 / AF-6 / F12.8 / eval §1.3 / §2.2）。
- **[O7]** **不冒领「已实施」**：不把「已冻/已收口」读成代码已改、测试已过、债务清零或自动 defer（AF-5 / B-10 / F22.8）；不凭本 AP 宣称迁移/构建/验收完成。

### 2.3 边界判定表

| 项目 | 判定 | 理由 | 重评条件 |
|------|------|------|----------|
| `packages/dsh-interface` 归口包 / 公共注册门面 / 首批 DNN/DNT 接线 | `in-scope` | `-11/-12/-13`、Q13 P0 原样继承首批 | 无（已冻） |
| 消费侧 facade（JSON/MCP/导入/作者记录）逐族闭环 | `in-scope` | `-14/-15/-16/-17`、Q13 P1/P2 | 无（已冻） |
| 真实 PTY / sandbox 二十工具业务接线 / native 真实入口 / 离仓产物 | `in-scope` | P6 残项、F19.6/F21.8/F22.8 | 须 `ImplementationGrant` 授权动工 |
| 实施期发现的真正公共改约（新错误/重试/lane/凭证/支持面冲突） | `defer / depends-on-design` | F9.7/F19.8/F22.8/truth P6：新约须 [业主] 决定 | 走 `AGENTS.md:40` 正常 [业主] 变更登记；**不在本 AP 开第 7 轮**、不自造合同、不按实现反推 |
| fixture 命名 / 机械细节 / 逐字段承接 | `in-scope` | F19.8「机械细节直接落实；不为 fixture 命名等强开 QNA」 | 无 |
| 安全审计既有发现（越权 / SSRF / XSS） | `out-of-scope` | O5；eval 建议未经裁决不升级为合同 | [业主] 另立安全整改 campaign |
| 兼容壳 / 双写 / 统一 wire 信封 / 全仓总闸 | `out-of-scope` | O3/O1；T-O-8/T-O-10/F19.1 | 无（「不得重开」） |
| 36+4 E1115 观察的 P4 逐项结算 | `in-scope` | B-8 / F19.7 / §7.3；只结算不冒记 | [业主] 明确批准的其他处置才 defer |
| native 在某 host 不可用时的 `NATIVE_UNAVAILABLE` 收窄 | `in-scope` | F22.1 本题已批准的能力收窄 | 若 [业主] 日后要求所有 host 完整 native = 新公共路线，另按改约登记 |

---

## 3. 业务工作总表

> 总索引；§4 按 Phase 展开。编号 `P{phase}-{nn}`。
>
> **硬地板（每个工作项三件齐全）**：`涉及文件（file:line）` / `收口目标` / `测试映射`。**第 4 件（与净新度/风险成正比）**：净新 / 高风险项在 §4 拆有序子步（a/b/c…）+ 边界情况、§5 `具体功能预期` ≥5 条。
>
> 全部 `file:line` 锚定 `main @ f7199f9`（truth B-3 / header）；本机工作树 HEAD 为 `653b15b`（同一 merge message，`f7199f9` 快照哈希不可达），本 AP 已按「路径 + 符号名」逐条复验（见 §7.0）。行号仅作定位提示，**不是第二真源**。

| 编号 | 所属 Phase | 工作项 | 类型 | 涉及文件（file:line） | 收口目标 | 测试映射（Test-ID） | 风险 |
|------|------------|--------|------|------------------------|----------|----------------------|------|
| P1-01 | Phase 1 | `packages/dsh-interface` 纯 ESM 构建期私有库 + 三出口 | `add` | `packages/dsh-host-route-guard/src/route-guard.js:1-24`（复用参照）；🆕 `packages/dsh-interface/package.json` / `src/contracts/` / `src/host/` / `src/build/` | contracts 无 I/O/Node/DOM/Cordis/store，host 只注入，build 仅构建期；无 `dsh.bundle`/`dsh.client` | `CF1115-T01` | `high` |
| P1-02 | Phase 1 | guard 唯一实现单向复用 + 每包 build 物化 / 离仓自包含 | `refactor` | `packages/dsh-host-route-guard/src/route-guard.js:162-166,243-245`；`dsh-nano-terminal/lib/route-guard.js:243`（私改点）；`scripts/build-client.mjs`（各包） | 同一机制只一份可修改实现；每包 `file:../packages/dsh-interface` devDep、baked 表随产物、离仓不读邻居源码 | `CF1115-T02` / `CF1115-T03` | `high` |
| P1-03 | Phase 1 | `createWebRegistrar` channel/match 绑定表 + mixed-batch 注册 | `add` | 🆕 `packages/dsh-interface/src/host/createWebRegistrar.*`；`packages/dsh-host-route-guard/src/route-guard.js:157-166,243-247`（register/registerUpgrade/effect） | 全批预检后注册、失败回收、幂等 dispose 纳入 ctx.effect、inventory 只读有效绑定 | `CF1115-T04` / `CF1115-T05` / `CF1115-T06` | `high` |
| P1-04 | Phase 1 | DNN/DNT 首批真实接线（HTTP + SDK prefix / exact·close prefix·stream upgrade） | `migrate` | `dsh-nano-notepad/index.js:67-82,334-357`；`dsh-nano-terminal/index.js:15-26,66-74,193-270`；`dsh-nano-terminal/lib/route-table.js:1-8` | 原 URL/字节/HEAD/MIME/MCP/SSE/WS/PTY 责任保留；真实 register/upgrade 经可注入 seam、撤销重装 | `CF1115-T08` / `CF1115-T09` | `high` |
| P1-05 | Phase 1 | 首批验证层 + 成对硬切退役 + 条件销账 | `refactor` | `packages/dsh-host-route-guard/test/route-guard.test.mjs:1-296`；`dsh-nano-terminal/test/register-routes.smoke.mjs:6-17`；`scripts/check-route-sensitivity.mjs:23-47` / `check-feature-contract.mjs:18-54` / `check-clean-lib.mjs:28-39` | 三项检查扩维不缩 scope、smoke 改更强装配断言不删、DNN-01/DNT-01 条件真实兑现才销账、CROSS-02 至多部分偿还 | `CF1115-T07` | `high` |
| P2-01 | Phase 2 | `createJsonClient` + `JsonOutcome` 五类失败 + 每操作唯一 codec | `add` | 🆕 `packages/dsh-interface/src/host/createJsonClient.*` / `src/contracts/jsonOutcome.*`；`dsh-nano-explorer-extra/src/host/routes.js:637-638` / `src/client/workspace-store.js:33-48`（旧 catch/wrapper 退役点） | 取消/protocol/transport/domain/http 分型、不发请求/不重发、非法 2xx 不为 ok:true、不自动 retry | `CF1115-T10` | `high` |
| P2-02 | Phase 2 | `FamilyDefinition` 最小作者记录 + 同源投影 | `add` | 🆕 `packages/dsh-interface/src/contracts/FamilyDefinition.*`；`dsh-nano-terminal/schema/dnt-mcp.openrpc.json:8-42`（派生参照） | 唯一关联操作/绑定/提供面/批准来源；web 表/operation/definition/服务声明同源；不造通用 IDL/runtime 注册中心 | `CF1115-T12` | `high` |
| P2-03 | Phase 2 | `nanoNotepad` 最小导入服务（Cordis）+ window global/别名退役 | `refactor` | `dsh-nano-notepad/src/client/panel.js:4438-4444,4500-4624,4673,4700`；`dsh-nano-explorer-extra/src/client/body.js:924-966` | 只公开 `import(name,content,meta?)`；DB 就绪/卸载/过期句柄接线；真 service 提供/发现/撤销 + 真实导入（不只断言全局名消失） | `CF1115-T11` | `high` |
| P2-04 | Phase 2 | DNEE/DNMS/DNN 基础 JSON 生产者—消费者成对硬切 | `migrate` | `dsh-nano-explorer-extra/src/host/routes.js:336-642`；`dsh-nano-model-selector/index.js:34-51,150-157,264-388`；`dsh-nano-model-selector/src/client/compact.js:13-46` / `media.js:24-47`；`dsh-nano-notepad/index.js:105-121,269-277` | 唯一 codec、旧 wrapper/parser/alias 零残留、领域政策/sanctioned writer 保留 | `CF1115-T13` | `high` |
| P3-01 | Phase 3 | `createMcpToolset` + `decodeMcpReply` 三层解码 + attach 严格 | `add` | 🆕 `packages/dsh-interface/src/host/createMcpToolset.*` / `decodeMcpReply.*`；`dsh-nano-terminal/src/host/mcp.js:18-29,184-248`；`dsh-nano-terminal/src/client/lanes.js:199-209` | 广告精确对账、真实 schema 校验、rpc/tool/protocol 分层、wss 不降级 / URL 不猜 | `CF1115-T14` | `high` |
| P3-02 | Phase 3 | terminal 两提供面：[DNLS] 八工具 / [DNT] 本地十九工具 + McpLane v1/v2 | `refactor` | `dsh-nano-terminal/schema/dnt-mcp.openrpc.json:8-12`（`x-errorKinds` 十三 kind 基线）· `:17`（`x-address`）· `:18-42`（create：`lane`/`template`/`task` 与 result `id/addr/lane/title/attach`）；`dsh-nano-terminal/src/host/mcp.js:18-29,219-240`；`dsh-nano-terminal/src/client/lanes.js:24-35,116-143,212-261`；`dsh-nano-local-sandbox/src/host/terminal-driver.js:4-74` | 两提供面分别标识、DNLS 单飞幂等 / DNT 多个不同 id、v1/v2 门控、断连至多一次不重跑写入 | `CF1115-T15` | `high` |
| P3-03 | Phase 3 | sandbox 二十工具真实业务 + bridge 只做获准 CDP | `refactor` | `dsh-nano-local-sandbox/src/host/mcp-sandbox.js:2-38` / `routes.js:514-529` / `instance-registry.js:21-69` / `error-catalog.js:1-25`；`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:163-278` | 二十工具逐一接真实领域 owner、`{ok:true,data}`、PublicInstance/Snapshot 边界、catalog 与 dispatch 同源、无自造 sandbox 工具 | `CF1115-T16` | `high` |
| P3-04 | Phase 3 | [DNK] 真实消费 + 容器时代旧资产/bridge 副本退役 | `migrate` | `dsh-nano-kitesurf/index.js:637-681` / `src/client/index.js:12-29,266-280`；`dsh-nano-kitesurf/package.json:26-40`；`dsh-nano-kitesurf/runtime/mcp-bridge.mjs:163-263`；`dsh-nano-kitesurf/lib/diagnostics.js:36-84` | 端点常量/fetch 改指真实提供面、错误目录归属、旧容器资产/双载体退役，不删既有业务 | `CF1115-T17` | `high` |
| P3-05 | Phase 3 | [DNT] MCP/attach/WS/SSE/审计消费 + 公开 nanoTerminal | `refactor` | `dsh-nano-terminal/index.js:34-62,66-74,164-185` / `src/host/mcp.js:38-44` / `src/host/events.js:48-62`；`dsh-nano-terminal/src/client/lanes.js:199-209` | 真实工具分发、attach 用返回 url、SSE 生命周期、审计 writer 接线、公开 Cordis 服务消费 | `CF1115-T15` / `CF1115-T17` | `medium` |
| P4-01 | Phase 4 | 官方 host 薄 adapter + 异步结算 / 桥身份 / 配置失效 | `refactor` | `dsh-nano-cloud-session/index.js:166-237` / `src/client/index.js:85-98`；`dsh-nano-model-selector-compaction/index.js:1-9` | 直接引用官方服务/类型、Provider ON/OFF/isolate、配置失效旧 scope 失效、受控 Promise 结算 | `CF1115-T18` | `high` |
| P4-02 | Phase 4 | [DNCS] native 支持边界 + `NATIVE_*` 四码 + 义务表 | `refactor` | `dsh-nano-cloud-session/index.js:166-237,187-241` / `src/host/devin-api.js:1-39` / `src/client/api.js:4-19` | 只在公开能力满足义务时发布、否则 503 + 可见原因 + 无伪 localId；四码只进唯一作者、403 不误判 | `CF1115-T19` | `high` |
| P4-03 | Phase 4 | [DNMSC] R-16 精确例外 + 影子 FallbackService 退役 | `refactor` | `dsh-nano-model-selector-compaction/lib/host-services.js:64-125` / `lib/host-compaction.js:25-39` / `scripts/gen-mutex-patch.mjs:3-43` / `lib/compact-policy.js:1-47`；`dsh-nano-model-selector/lib/compact-policy.js:1-47` | 真实 Service 解析（无法解析即激活失败）、ON/OFF/四 preset/isolate、已准 instanceof 降级、无影子服务 | `CF1115-T19` | `high` |
| P4-04 | Phase 4 | [DNEE] native 资源 / [DNN] fx·S3·RPC·标准流 + 两组别名取舍 | `migrate` | `dsh-nano-explorer-extra/src/client/body.js:94-104,924-966`；`dsh-nano-notepad/src/host/s3-sync.js:287-315,379-410` / `pipeline.js:118-159,172-234,241-259` / `fx-bridge.js:140-198` | `/s3/config` 只留 `probe`、`/rpc` 只留 `manifest.get`；四只读 RPC 唯一 codec；标准流/资源协议独立不 JSON 化 | `CF1115-T17` / `CF1115-T16` | `high` |
| P5-01 | Phase 5 | 八包逐包覆盖证据 + 36 逐包 + 4 横向观察逐项结算 | `migrate` | `docs/code-review/26-nov/contract-and-facade-1115-eval.md:197-337,495-502`（E1115-* 台账）；QNA §7.3:1578 | 逐观察号给覆盖/证据/旧源/离仓产物，不按路由/声明数量销账、不静默缩范围、不另造替代账单 | `CF1115-T20` | `medium` |
| P5-02 | Phase 5 | 旧源 / 离仓产物 / 扫描覆盖对账 + 五类退役清单 | `refactor` | `scripts/check-feature-contract.mjs:18` / `check-clean-lib.mjs:28-39` / `route-scan.mjs:302-325`；`security/route-inventory.md:1-7`（过期分母，仅回溯） | 派生表/清单/说明同源、五类落点（代码/注释/头注/行号锚/文档句）零残留、扫描覆盖遗漏修正 | `CF1115-T20` | `medium` |
| P5-03 | Phase 5 | 五态如实归类 + 债务按原观察号 handoff | `refactor` | QNA §7.3:1580-1582；truth §4.6 P6:609-611 | `verified/observed-OK/partial/未观察/deferred` 如实归类；未实施/未验证债务保留原号；不标 `executed` | `CF1115-T21` | `medium` |

---

## 4. Phase 业务表格

> 每 Phase 一张表；测试细节只在 §8 写一次，此处引 Test-ID。`工作内容` 是承重列，净新 / 高风险项拆有序子步。

### 4.1 Phase 1 — P0 · 归口基座与首批闭环

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P1-01 | 归口包三出口 | a) 建 `package.json`（名 `dsh-interface`、纯 ESM、`type:module`、无 `dsh.bundle`/`dsh.client`、无 I/O）→ b) `src/contracts/` 只放合同定义/已获准 schema/语义/绑定数据，禁 import Node/DOM/Cordis 实例/可变 store → c) `src/host/` 只放 host 注入适配与注册门面，不持业务 canonical → d) `src/build/` 只放 Node 构建期生成/对账工具，不进页面/运行时请求链 → e) 边界：无万能根入口；`client` 出口待真实消费才开放，不发布空壳 | `packages/dsh-host-route-guard/src/route-guard.js:1-24`（复用参照）；🆕 `packages/dsh-interface/{package.json,src/contracts/,src/host/,src/build/}` | 三出口边界可静态+运行时验证；不装 runtime 插件 | `CF1115-T01` | `CF1115-T01` PASS 且四元组齐全 |
| P1-02 | guard 唯一源 + 每包物化 | a) host 单向复用 `dsh-host-route-guard` 唯一实现，不复制 guard、不私改消费者副本（`dsh-nano-terminal/lib/route-guard.js:243` 的 `spec.kind ?? ROUTE_KIND` 私改点退役）→ b) 各包以 `file:../packages/dsh-interface` 声明构建 devDep，正确声明/锁定源码依赖闭包，不假设 devDep 被传递安装 → c) `build` 共用生成入口并物化本包 bundle，未 bundle 的 index 仅相对导入，新增产物同步 `files` → d) 边界：幂等再生成、环境隔离、离仓加载有证据；不为接线升级工具链/加外部 runtime 依赖 | `packages/dsh-host-route-guard/src/route-guard.js:162-166,243-245`；`dsh-nano-terminal/lib/route-guard.js:243`；各包 `scripts/build-client.mjs` | 唯一 guard 生效、离仓 tarball 自包含 | `CF1115-T02` / `CF1115-T03` | 两 Test-ID PASS，离仓加载非空、再生成字节一致 |
| P1-03 | 公共 web 注册门面 | a) `createWebRegistrar({plugin,table}).register(ctx,handlersByBindingId)->dispose`、`.inventory()->readonly` → b) 表含稳定 `id/plugin/channel/match/path/methods` 及获准元数据/关联/来源；`channel:'http'` 配 exact/prefix、`channel:'upgrade'` 首版只允许 exact/GET → c) 覆盖键含 plugin/channel/match/path/method，id 与键不重复；缺字段/归属冲突/缺·多·非函数 handler/未知维度/缺 host API 注册前拒绝 → d) 全批预检后注册，中途失败回收本批已注册项；统一幂等 dispose 纳入 ctx.effect → e) 映射真实 register/registerUpgrade，保留 host 匹配和原 URL，不私造 priority/丢 head/公共层握手 → f) 边界：每请求/升级在业务及握手前同样 fail-closed；既有 405 保留；新接口无运行时 `spec.kind/methods/bodyLimit` 覆写 | 🆕 `packages/dsh-interface/src/host/createWebRegistrar.*`；`packages/dsh-host-route-guard/src/route-guard.js:157-166,188-191,243-247` | 真实 register/upgrade 往返、撤销重装、拒绝前副作用=0 | `CF1115-T04` / `CF1115-T05` / `CF1115-T06` | 三 Test-ID PASS，含全批回收与幂等释放负例 |
| P1-04 | DNN/DNT 首批真实接线 | a) [DNN] 现有 HTTP 注册 + SDK prefix（现 `index.js:334-357` 旁路 `kind:'prefix'` + 手动 requestRejection）改走获准公共入口与同源 baked 绑定 → b) [DNT] 普通 exact、session close prefix、WS stream upgrade 用同一作者/注册模型，退役私改 guard（`lib/route-guard.js:243`）与手工 upgrade 登记/准入（`lib/route-table.js:1-8`）→ c) 两包 build/相对导入/发布物：共同作者 → 本包 baked 表与 guard/facade bundle → 实际加载，不靠邻居源码 → d) 边界：原 URL、字节/HEAD/MIME、JSON/MCP 式 RPC/SSE 各自协议不改；SSE 生命周期、WS 协商/帧、领域 PTY 责任保留；不在本题选新帧版本 | `dsh-nano-notepad/index.js:67-82,334-357`；`dsh-nano-terminal/index.js:15-26,66-74,193-270`；`dsh-nano-terminal/lib/route-table.js:1-8` | 真实入口/协议保真、无双注册/漏升级 | `CF1115-T08` / `CF1115-T09` | 两 Test-ID PASS，离线夹具不冒充安装态 e2e |
| P1-05 | 首批验证层 + 硬切退役 | a) 唯一注册实现单测（`route-guard.test.mjs`）增加 upgrade/mixed-batch/释放负例，不复制第二套实现测试成第二作者 → b) 新归口 `packages/dsh-interface/test/` 下 Node 测试用真实导出和 binding，不用同一生成表的两个投影自证 → c) 三项既有检查扩 channel/match 维度，**不缩 scope/不移除安全断言求绿**；[DNT] `register-routes.smoke.mjs` 现期待直注册 upgrade（`assert.equal(source.includes('ctx.webServer.registerUpgrade('), true)`），迁移后换成对共同机制与实际准入的**更强装配断言，不能简单删测试** → d) 验证后成对切换退役，同步 scanner/表/说明 → e) 边界：DNN-01/DNT-01 条件真实兑现才销账、CROSS-02 本批至多部分偿还；其他编号/余额保留；首批结束说明其他活跃包未迁移字段/入口 | `packages/dsh-host-route-guard/test/route-guard.test.mjs:1-296`；`dsh-nano-terminal/test/register-routes.smoke.mjs:6-17`；`scripts/check-route-sensitivity.mjs:23-47`、`check-feature-contract.mjs:18-54`、`check-clean-lib.mjs:28-39`；`npm --prefix dsh-nano-terminal test` | 相关窄测试绿 + 一次必要集成；旧面零残留 | `CF1115-T07` | `CF1115-T07` PASS，断言数不下降、检查范围不缩 |

### 4.2 Phase 2 — P1 · 普通 JSON / 导入 / 作者记录

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P2-01 | JSON facade | a) `createJsonClient({fetch,resolveUrl}).call(operation,input,{signal}?)->Promise<JsonOutcome<T>>`，缺必要构造依赖即拒绝，URL 只由获准绑定/官方 transport 解析 → b) 成功 `{ok:true,data}`；失败 `{ok:false,error:{kind,message,httpStatus?,domainCode?,domainData?}}`，kind ∈ transport/cancelled/http/protocol/domain → c) 按 Q8 原题判别矩阵（truth:294-302，7 类结果）逐态分型（取消→cancelled；本地绑定/输入/编码未请求→protocol；网络/读体→transport；识别业务失败→domain；其余非 2xx→http；非法 2xx→protocol；合法 null/degraded→成功），并按 F14.8「原题验证清单及细分状态夹具」补齐不发请求/不重发、非法 2xx、领域·HTTP 分型、空体·null·degraded、取消/读体中断与双 status 夹具（QNA Q8 第 8 项 :942）；不另立态数标签 → d) 边界：已取消/本地拒绝不发请求；响应头可用时保留真 status 不被覆盖；空体/HEAD/204 不一概判成败；响应体只读一次；不自动 retry/换 endpoint/轮询/补偿/重提写操作/造默认 timeout | 🆕 `packages/dsh-interface/src/host/createJsonClient.*`、`src/contracts/jsonOutcome.*`；`dsh-nano-explorer-extra/src/host/routes.js:637-638`、`src/client/workspace-store.js:33-48` | 五类失败可判别、host/client 同一目标编码 | `CF1115-T10` | `CF1115-T10` PASS，判别矩阵 7 类逐态 + F14.8 清单夹具全覆盖 |
| P2-02 | FamilyDefinition | a) 最小 ESM 形状 `{contractId,authorityRefs,operations{input,output,failures,semanticsRef},bindings{operationIds,transport,codecs,dispatch?},providers{plugin,supports,constraintsRef}}` → b) 同源投影 web table（Q6）、Q8 带绑定 operation、Q9 definition、Q10 服务声明，保留稳定来源关联 → c) 每族一次迁作者；原台账/OpenRPC 可留派生产物但不反作第二作者 → d) 边界：不默认到首个操作；多 operation 绑定有显式 selector/cases + 未知值拒绝；引用唯一 schema/官方同进程类型入口；`REVIEW`/无来源/自动 false 不当批准；contracts 与可移植 codec 纯净，不捕获 ctx/凭证/DB | 🆕 `packages/dsh-interface/src/contracts/FamilyDefinition.*`；`dsh-nano-terminal/schema/dnt-mcp.openrpc.json:8-42` | 多操作/同名异约/跨族标识可区分、离仓同源 | `CF1115-T12` | `CF1115-T12` PASS，引用存在≠批准内容 |
| P2-03 | 最小导入服务 | a) 惰性读取 `nanoNotepad`，只公开 `import(name,content,meta?)->Promise<{id,name}>`，前两者字符串，meta 只许可选字符串 `sourcePath` → b) panel/controller 持 DB/操作，外层 index 用 `ctx.provide` 投影 + disposer；DB 真就绪才发布（`ready(mounted)` 不是 DB 就绪），初始化失败不设永远排队服务 → c) 先迁包内 fx/导入自调用到私有 controller，再成对切服务并彻底移除 `window.__nanoNotepad`（`panel.js:4504`）及别名/转发（`:4673`/`:4700` 的 sourcePath 调用一并核对）→ d) 边界：非法类型/额外 meta 写前拒绝；不由 sourcePath 授读写原文件权、不破坏 Windows 路径；空内容合法、同名未 pinned 替换留版本、pinned/文件夹冲突生新名；卸载撤销、晚 ready 不复活、旧句柄新写前拒绝；不假成功/不保证失败无副作用 | `dsh-nano-notepad/src/client/panel.js:4438-4444,4500-4624,4673,4700`；`dsh-nano-explorer-extra/src/client/body.js:924-966` | 真 service 提供/发现/撤销 + 真实导入，非空名消失 | `CF1115-T11` | `CF1115-T11` PASS，9 类状态负例齐全 |
| P2-04 | 基础 JSON 成对硬切 | a) 按 `-14` 唯一 codec + 显式 selector 逐项转写 [DNEE] 文件/Git、[DNMS] catalog/media/compact、[DNN] 基础文件 JSON → b) host encode / client decode / UI / 旧 wrapper 同时硬切，不保留另一解释源 → c) 边界：保留已批准领域政策、sanctioned writer、嵌套错误语义不被统一外层抹平；旧 `compact.js`/`media.js`/`workspace-store.js` 错误解析零残留；不取参数并集/最低交集、不兼容 alias | `dsh-nano-explorer-extra/src/host/routes.js:336-642`；`dsh-nano-model-selector/index.js:34-51,150-157,264-388`、`src/client/compact.js:13-46`、`media.js:24-47`；`dsh-nano-notepad/index.js:105-121,269-277` | 唯一 codec、旧 wrapper/parser/alias 零残留 | `CF1115-T13` | `CF1115-T13` PASS，成对切换无双写 |

### 4.3 Phase 3 — P2 · 沙箱与终端真实互操作

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P3-01 | MCP 工具集 / 三层解码 | a) `createMcpToolset({definition,handlers}).list()->Tool[]`、`.invoke(name,args,callContext)`；广告与 handler 精确对账（缺/多/重名/缺 schema 使构造失败且保持未完成）→ b) 唯一获准 schema 真正校验输入、获准 codec 校验结果（required/额外字段/类型/integer/界限）→ c) `decodeMcpReply(reply,binding)`：成功 `{ok:true,value}`、失败 `{ok:false,layer,error}`，layer ∈ rpc/tool/protocol；先错误/isError 后取值、不能仅看 id → d) attach 按匹配且获准的 `attach.protocol` 选 adapter；完整 URL 不猜路径/擅加业务 query，ws/wss 原样保留、禁 wss→ws → e) 边界：RPC 协议错与 isError/content/structuredContent 工具失败分层，不全变 HTTP500/普通 JSON domain；目录/分发/真实消费一起切，同义旧 catalogue/switch 退役 | 🆕 `packages/dsh-interface/src/host/createMcpToolset.*`、`decodeMcpReply.*`；`dsh-nano-terminal/src/host/mcp.js:18-29,184-248`；`dsh-nano-terminal/src/client/lanes.js:199-209` | 每提供面真实 handler/结构/副作用/结果验证 | `CF1115-T14` | `CF1115-T14` PASS，含带 id 的 isError 与 wss 拒绝 |
| P3-02 | terminal 两提供面 | a) [DNLS] 严格八工具（create/list/input/read/resize/close、audit、lane.status）与 [DNT] local 十九工具分别作显式提供面，仅语义相同操作共享定义 → b) 按 Q14 矩阵修订 `dnt-mcp.openrpc.json`（create 删除未兑现 `template`/`task` 字段、lane 只允许 `local`、`x-address` 改可执行 string schema、保留十九工具 params/result/十三 errorKinds 基线）→ c) create 结果要求 `id/addr/lane/title/attach`，`attach` 要求 `protocol/url`；DNLS `sessionId` 按授权上下文、无则拒绝（不用 term-1 默认）→ d) McpLane 只提交 `{sessionId,cols,rows}` 最小 create 与 `{id}` close；任何提供面不因 timeout/丢响应/attach 失败自动再发 create/input/send；已得 id 只重新 attach；transport 重连至多一次（明确替换 E64 递归退避）→ e) 边界：DNLS `dnt-ws-v1` / DNT `dnt-ws-v2` 精确门控、核验 ready 协商值；v2 human/agent/auto 通道不混用；两端返回完整 ws/wss URL 不猜 prefix/不覆盖 query/不降级 | `dsh-nano-terminal/schema/dnt-mcp.openrpc.json:8-12`（十三 errorKinds）· `:17`（`x-address`）· `:18-42`（create 修订目标）；`dsh-nano-terminal/src/host/mcp.js:18-29,219-240`；`dsh-nano-terminal/src/client/lanes.js:24-35,116-143,212-261`；`dsh-nano-local-sandbox/src/host/terminal-driver.js:4-74` | 同一通用 McpLane 消费真实两端、幂等/多 id/门控可验 | `CF1115-T15` | `CF1115-T15` PASS，失败含 id 不当成功 |
| P3-03 | sandbox 二十工具 | a) 按 Q15 二十工具表逐一接真实领域 owner（profile/instance/state/CDP），输入 object 且 `additionalProperties:false`，`instance.ensure.sessionId` 按 DNLS01 `T-O-12` 读作 session scope 必填 / shared 可省略产出 null → b) 成功 `structuredContent` 统一 `{ok:true,data:T}`，`PublicProfile`/`PublicInstance`/`Snapshot` 边界按原题表（不泄露配方命令/mount/凭证、不把端口游标当端点、unknown 不伪成 running）→ c) bridge 仅保留真实 agent-browser 的标准 CDP profile 驱动，不自行广告十五 sandbox 工具、不维护宿主诊断推送副本；`snapshot`/`control` 等既有 HTTP 能力保留并接同一所有者 → d) 边界：`/mcp` 内不 self-fetch 宿主 HTTP、不造可写 registry；授权/政策/读取/执行失败走所属目录及 isError，不是「未观测成功」；history ≤30 / DOM ≤4000 字符 / elements ≤40 节点 | `dsh-nano-local-sandbox/src/host/mcp-sandbox.js:2-38`、`routes.js:514-529`、`instance-registry.js:21-69`、`error-catalog.js:1-25`；`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:163-278` | 二十工具逐一真实业务调用（不只数目录） | `CF1115-T16` | `CF1115-T16` PASS，catalog/dispatch 同源 |
| P3-04 | [DNK] 消费 + 旧资产退役 | a) 17 个端点常量与全部 fetch 改指真实提供面 `/nano-local-sandbox/*`，错误读取统一 → b) 43 条 `ERROR_CATALOG` 与 [DNLS] 18 条按既冻归属退役/保留，不新增一侧 → c) `package.json:26-40` 容器时代资产（container-engine/nano-kite/Dockerfile/entrypoint/mcp-bridge）、`index.js:637-658` 旧锁路径与诊断 snapshot 定时器、两份 bridge 源码载体按既冻决定彻底退役 → d) 边界：退役沿当前调用链确认，不恢复旧别名、不否定全部切割成果；宿主入口只注册经唯一 guard | `dsh-nano-kitesurf/index.js:637-681`、`src/client/index.js:12-29,266-280`、`package.json:26-40`、`runtime/mcp-bridge.mjs:163-263`、`lib/diagnostics.js:36-84` | 真实消费打真实端点、旧资产零残留 | `CF1115-T17` | `CF1115-T17` PASS，退役清单五类落点齐 |
| P3-05 | [DNT] 全协议消费 | a) 19 工具真实分发（TOOLS 由 OpenRPC 单源生成、dispatcher 执行 inputSchema 校验）→ b) attach 用 server 返回的 `attach.url`、不硬编；LocalLane v2 channel 编解码 / McpLane 按 `ready.v` 切 v1 原始字节或 v2 通道帧 → c) SSE snapshot/seq/missed/heartbeat 生命周期保留；审计 writer 真实接线（不把 `auditPath` 常量存在算实际落盘）→ d) 边界：WS upgrade 手动准入改走同一 fail-closed 模型；跨传输错误出口分型、不把 sessionBinding metadata 当 session owner 校验；公开 `ctx.provide('nanoTerminal',...)` 消费保留 | `dsh-nano-terminal/index.js:34-62,66-74,164-185`、`src/host/mcp.js:38-44`、`src/host/events.js:48-62`、`src/client/lanes.js:199-209` | 工具/协议/审计/公开服务一致 | `CF1115-T15` / `CF1115-T17` | 两 Test-ID PASS，标准协议独立验证不 JSON 化 |

### 4.4 Phase 4 — P3 · 剩余领域 / 标准协议 / host 适配

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P4-01 | host 薄 adapter + 异步结算 | a) 领域内薄 adapter 直接引用官方服务/类型，公共包只含必要纯定义/机制，不复制 Agent/Session/Service runtime、不造共享 registry/公共影子 host DTO → b) 逐项核验公开 API、解析、真实装配；DNMSC 保持 isolate/互斥；DNCS/DNN 各自 scope 持桥/controller，初始化成功后发布 → c) 停接入 → 取消可取消任务并等待结算 → 释放依赖/观察者；后台迟到刷新不得新写失效投影 → d) 边界：不以警告后假成功/永久排队；失败撤局部资源；官方 branded identity/事件/持久化/错误类型/完成条件仍有效；不以 timer/disposer/倒序推定异步安全 | `dsh-nano-cloud-session/index.js:166-237`、`src/client/index.js:85-98`；`dsh-nano-model-selector-compaction/index.js:1-9` | Provider ON/OFF/isolate、桥身份/配置失效/卸载竞态可验 | `CF1115-T18` | `CF1115-T18` PASS，受控 Promise 结算非 timer 替代 |
| P4-02 | [DNCS] native 支持边界 | a) 只在声明支持的 host 版本/平台、公开 API 真能满足 Q16 义务表时发布成功入口；否则 `native_open` 明确 `NATIVE_UNAVAILABLE`（503），UI 保留可见原因与安全下一步，不返伪造 localId、不永久排队 → b) 桥身份 = carrier + 稳定 profile identity + remote session identity；正式 host 铸造本地身份、初始化与注册全部成功后才曝光；同键并发打开单飞、失败清局部资源 → c) 历史按 carrier 分页补齐、按远端稳定消息 identity 去重（不把「首 100 条」叫完整、不靠永久增长 seen 集合当恢复权威）→ d) 本地接纳/上游确认/远端完成三件事分开；POST 确认才显示确认送达、不先写已完成 turn 再发送、不自动重发未知写入 → e) `NATIVE_UNAVAILABLE`503 / `NATIVE_UNSUPPORTED`422 / `NATIVE_PROJECTION_FAILED`500 / `NATIVE_OUTCOME_UNKNOWN`502 四码只进唯一作者；上游 403/404/429 沿 carrier 分类不伪装本地未知 → f) 边界：本地 native 为可销毁重建只读/受控投影，不复制远端 payload 为第二 durable 恢复源；卸载停准入/使旧代际失效/等待结算再撤资源；不 catch+warn 后仍返回成功 | `dsh-nano-cloud-session/index.js:166-237,187-241`、`src/host/devin-api.js:1-39`、`src/client/api.js:4-19` | 正式支持真入口、不支持 503 + 无伪 localId | `CF1115-T19` | `CF1115-T19` PASS，义务表 8 项 + 四码分型全覆盖 |
| P4-03 | [DNMSC] R-16 例外 | a) 精确保留 DNMS01 R-16：vendored compaction、四 preset patch、已接受 instanceof 降级，不扩为复制 Cordis Service/内部反射 → b) 退役 `host-services.js` 自制 `FallbackService`（`:64-125`），按官方公开依赖/合法 loader 解析真实 Service，在真实 scope/isolate 验证；无法解析则明确激活失败 → c) 边界：不偷改 bundle ON/OFF、不创建影子服务、不替换私有 host 路径；不依本机 hoist 假定支持；公开 breaking 变化更新维护文档/升级说明，不另立第二决定台账 | `dsh-nano-model-selector-compaction/lib/host-services.js:64-125`、`lib/host-compaction.js:25-39`、`scripts/gen-mutex-patch.mjs:3-43`、`lib/compact-policy.js:1-47`；`dsh-nano-model-selector/lib/compact-policy.js:1-47` | 真实 Service 解析、ON/OFF/四 preset/isolate、已准降级 | `CF1115-T19` | `CF1115-T19` PASS，FallbackService 零残留 |
| P4-04 | DNEE/DNN 标准流与别名 | a) `/s3/config` 只留 `action=probe`（删 `testOne`），`/rpc` 只留 `method=manifest.get`（删 `lsrag.manifest`）；其余三只读 method（corpus.list/corpus.read/claim.read）保留 → b) 两组别名是**两个边界、两组别名**（B-5 / AF-2），同函数委托不自动批准删名；生产消费者/发布 SDK·fx 资产/技能/测试/说明同步切，不留旧名分派分支 → c) 四只读 RPC 以基线 `pipelineRpcHandler` 分支为目标；`null` 只表示已确认不存在，不由权限/网络/解析失败伪造；`denied` 按唯一 operation codec 识别为失败 → d) [DNEE] 官方 open-in-app 资源调用接真正所属服务；[DNN] fx chat 先 JSON 错误后 OpenAI SSE、WASM/SDK 静态资产例外 → e) 边界：标准 SSE/WS/OpenAI/下载不改普通 JSON 信封；不把自定义 RPC 擅改成 MCP 或统一 HTTP 信封；不保留兼容 alias | `dsh-nano-explorer-extra/src/client/body.js:94-104,924-966`；`dsh-nano-notepad/src/host/s3-sync.js:287-315,379-410`、`pipeline.js:118-159,172-234,241-259`、`fx-bridge.js:140-198` | probe/manifest 唯一名、null/denied/读失败区分、标准协议独立 | `CF1115-T17` / `CF1115-T16` | 两 Test-ID PASS，旧名明确拒绝 |

### 4.5 Phase 5 — P4 · 全范围结算

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P5-01 | 八包覆盖 + 36+4 观察结算 | a) 对 Q13 八包责任表逐包给「全部适用边界覆盖」证据（含 host-only/零 HTTP/native 包，不造假入口）→ b) 对 eval 36 项逐包观察 + 4 项横向观察按**原号**逐项结算覆盖/证据/旧源/离仓产物 → c) 边界：**不按路由/声明数量销账、不另造替代账单、不静默缩全插件目标**；未接通/未验证/未裁决/需延期保持未完成；改变支持面或 defer 只由 [业主] 决定 | `contract-and-facade-1115-eval.md:197-337,495-502`；QNA §7.3:1578 | 每观察号有完成证据或 [业主] 明确处置 | `CF1115-T20` | `CF1115-T20` PASS，无数量减债 |
| P5-02 | 旧源/产物/扫描对账 + 退役清单 | a) 派生表/工具目录/baked 表/文档视图从单一作者源可读再生成；修正 `check-feature-contract.mjs:18` 六包固定清单与 `check-clean-lib.mjs:28-39` 七包清单的覆盖遗漏（含 DNCS/DNMSC）→ b) 五类退役落点（代码/注释/头注/行号锚/文档句）零残留；`security/route-inventory.md:1-7` 的过期 35 条只作回溯、不作分母 → c) 边界：不新增手工 required-plugin 清单；同源只读产物不等于第二作者源；扫描只发现异常、不授权 | `scripts/check-feature-contract.mjs:18`、`check-clean-lib.mjs:28-39`、`route-scan.mjs:302-325`、`test-all.mjs:25-46`；`security/route-inventory.md:1-7` | 清单同源、五类落点零残留 | `CF1115-T20` | `CF1115-T20` PASS，覆盖遗漏已修 |
| P5-03 | 五态归类 + handoff | a) 按 `verified/observed-OK-at-closure/partial/未观察/deferred` 五态如实归类每一收口目标 → b) 未实施/未验证债务按原 `E1115-*` 观察号保留并 handoff，不在本阶段回填、不自动 defer → c) 边界：任一退出硬闸 `degraded/未观察` ⇒ 不得标 `executed`；不宣布测试已过/债务清零；新发现公共改约走正常 [业主] 变更登记 | QNA §7.3:1580-1582；truth §4.6 P6:609-611 | 五态如实、债务保留、无 overclaim | `CF1115-T21` | `CF1115-T21` PASS，文档状态保持 `draft/executing`（非 `executed`） |

---

## 5. Phase 详情

> 测试不在此展开，每项指向 §8 Test-ID。净新 / 高风险 Phase `具体功能预期` ≥5 条（含边界与失败/降级路径）。

### 5.1 Phase 1 — P0 · 归口基座与首批闭环

- **Phase 目标**：唯一可执行真源 + 公共注册门面 + DNN/DNT 首批真实闭环，不冒领业务/MCP。
- **本 Phase 对应编号**：`P1-01` / `P1-02` / `P1-03` / `P1-04` / `P1-05`
- **本 Phase 新增文件**：`packages/dsh-interface/{package.json, src/contracts/*, src/host/*, src/build/*, test/*}`
- **本 Phase 修改文件**：`packages/dsh-host-route-guard/src/route-guard.js`（复用，非改写）、`dsh-nano-notepad/index.js:334-357`、`dsh-nano-terminal/index.js:66-74,193-270`、`dsh-nano-terminal/lib/route-guard.js:243`、`dsh-nano-terminal/lib/route-table.js:1-8`、`dsh-nano-terminal/test/register-routes.smoke.mjs:6-17`、`scripts/check-*.mjs`
- **本 Phase 删除文件**：无整文件删除；退役 `dsh-nano-terminal/lib/route-guard.js` 的私改行、手工 upgrade 登记分支、独立释放链（成对硬切时）。
- **具体功能预期**：
  1. `contracts` 出口不含任何 Node/DOM/Cordis 实例/可变 store import；`build` 出口不进入页面或运行时请求链；以静态检查 + 真实 import 双向验证（不是只 grep 文件名）。
  2. `createWebRegistrar` 全批预检后注册；注入「第 3 个绑定 handler 非函数」时本批已注册项全部回收、`register` 净调用数 = 0，且 `ctx.effect` 只挂一次 disposer。
  3. 覆盖键 `plugin/channel/match/path/method` 缺任一、id 重复、归属冲突、未知维度或缺 host API 时注册前拒绝；拒绝发生在任何业务 handler 或 WS handshake **之前**（`requestRejection` 先于副作用）。
  4. `channel:'upgrade'` 首版只接受 `exact`/GET；传入 prefix-upgrade 被拒绝，且不假设宿主支持；http 支持 exact/prefix，不默认旧格式为 http/exact。
  5. [DNN] SDK prefix 与 [DNT] WS stream upgrade 都经同一公共门面注册到真实 `webServer.register`/`registerUpgrade`，撤销后重装不重复释放、不漏升级；原 URL/HEAD/MIME/字节不变。
  6. 再生成幂等（同输入产物字节一致）、作者变化可达产物；实际临时 tarball 在最小受控 host 离仓加载成功（dry-run 只证清单，不算离仓加载证据）。
  7. 三项检查扩维后范围不缩、安全断言不减；`register-routes.smoke.mjs` 由「源码字符串断言」改写为「对共同机制 + 实际准入的真实装配断言」，断言数不下降。
- **对应测试台账项**：`CF1115-T01`–`CF1115-T09`（详见 §8）
- **收口标准**：9 项 Test-ID 全 PASS 且四元组齐全；DNN-01/DNT-01 条件真实兑现才销账，CROSS-02 至多部分偿还，其他余额保留（F13.7/F13.8）。
- **本 Phase 风险提醒**：这是唯一基座，任何「第二套 guard」「消费者私改副本」「两个生成投影自证」都会把 campaign 打回多真源（F7.5/F11.3/F13.3）；`f7199f9` 快照与本机 `653b15b` 行号漂移以路径+符号名为准（§7.0）。

### 5.2 Phase 2 — P1 · 普通 JSON / 导入 / 作者记录

- **Phase 目标**：消费侧 facade 三件（JsonOutcome / 最小导入服务 / FamilyDefinition）+ 基础 JSON 成对硬切。
- **本 Phase 对应编号**：`P2-01` / `P2-02` / `P2-03` / `P2-04`
- **本 Phase 新增 / 修改 / 删除文件**：🆕 `packages/dsh-interface/src/host/createJsonClient.*`、`src/contracts/jsonOutcome.*`、`src/contracts/FamilyDefinition.*`；改 `dsh-nano-notepad/src/client/panel.js:4438-4444,4500-4624`、`dsh-nano-explorer-extra/src/client/body.js:924-966`、`dsh-nano-explorer-extra/src/host/routes.js:336-642`、`dsh-nano-model-selector/index.js:150-157,264-388`、`dsh-nano-model-selector/src/client/{compact,media}.js`、`dsh-nano-notepad/index.js:105-121,269-277`；退役 `window.__nanoNotepad`、旧 wrapper/parser/alias。
- **具体功能预期**：
  1. `JsonOutcome` 的 Q8 原题判别矩阵（7 类结果）逐态成立，且 F14.8 细分状态夹具全覆盖：`signal` 已取消 → `cancelled` 且 `fetch` 调用数 = 0；本地输入不符 → `protocol` 且 `fetch` = 0；非法 2xx → `protocol` 绝不为 `ok:true`；合法 `null`/`degraded`/空体 → 成功（不按 truthiness 判错）；不发请求/不重发、领域·HTTP 分型、取消/读体中断、双 status 各有夹具。
  2. 响应头可用时保留真 `httpStatus` 不被上游 status 覆盖；响应体只读一次；`domainCode` 只用识别成功的获准码，不靠错误文本猜业务码。
  3. 公共层不自动 retry / 换 endpoint / 轮询 / 补偿 / 重提写操作 / 造默认 timeout；取消不证明未执行或已回滚。
  4. `FamilyDefinition` 多操作绑定有显式 selector/cases，未知 dispatch 值拒绝、不默认首个操作；同名异约 / 跨族标识可区分；从真实 factory 与离仓产物验证同源（引用存在 ≠ 批准内容）。
  5. `nanoNotepad.import` 就绪/缺席/失败/类型拒绝/竞态/过期句柄/替换版本冲突/空内容/Windows sourcePath/最小回执 + 内部 fx 均验证；真 service 提供/发现/撤销 + 真实导入（不是只断言全局名消失）；非法类型/额外 meta 写前拒绝，不由 sourcePath 授读写权。
  6. 基础 JSON 的 host encode / client decode / UI / 旧 wrapper 同时硬切；旧 `compact.js`/`media.js`/`workspace-store.js` 错误解析零残留；sanctioned writer / 领域政策保留。
- **对应测试台账项**：`CF1115-T10` / `CF1115-T11` / `CF1115-T12` / `CF1115-T13`
- **收口标准**：4 项 Test-ID 全 PASS；选定闭环 host encode/client decode/UI/旧 wrapper 成对切换，同绑定不设多旧格式猜测（F14.7）。
- **本 Phase 风险提醒**：不得把「统一外层 HTTP status」当成错误语义已统一（[DNMS] 嵌套 code / [DNEE] 字符串 error 差异须按唯一 codec 承接，不抹平）；FamilyDefinition 不得升格为通用 IDL / runtime 注册中心（F17）。

### 5.3 Phase 3 — P2 · 沙箱与终端真实互操作

- **Phase 目标**：MCP / terminal / sandbox 真实生产路径接线，不能以 stub 或缩目录通过。
- **本 Phase 对应编号**：`P3-01` / `P3-02` / `P3-03` / `P3-04` / `P3-05`
- **本 Phase 新增 / 修改 / 删除文件**：🆕 `packages/dsh-interface/src/host/createMcpToolset.*`、`decodeMcpReply.*`；改 `dsh-nano-terminal/schema/dnt-mcp.openrpc.json:8-12`（十三 errorKinds）· `:17`（`x-address`）· `:18-42`（create）、`src/host/mcp.js:18-29,184-248`、`src/client/lanes.js:24-35,116-143,212-261`、`dsh-nano-local-sandbox/src/host/mcp-sandbox.js:2-38`、`routes.js:514-529`、`profiles/kitesurf/mcp-bridge.mjs:163-278`、`dsh-nano-kitesurf/index.js:637-681`、`package.json:26-40`、`runtime/mcp-bridge.mjs:163-263`；退役容器时代资产与 bridge 自造工具广告。
- **具体功能预期**：
  1. `createMcpToolset` 广告与 handler 精确对账：缺/多/重名/缺必要 schema 使构造失败且保持未完成；真正无参工具可有合法空对象 schema，不过滤既承诺工具、不以剩余 handlers 决定合法子集。
  2. `decodeMcpReply` 先检查 RPC error / 矛盾回包 / `isError` 再验证提取结果；带 id 的 `isError` 不当成功；传输/取消不伪造 MCP 回包；layer ∈ rpc/tool/protocol 分别保留原错误/工具结果/结构说明。
  3. terminal 两提供面在语义相同操作共享定义、create 等语义不同处分别标识；[DNLS] 单飞幂等返回同 id，[DNT] 同会话多个不同 id；`source` 只在 [DNT]；`cols:1`/`rows:513`/`lines:501` 及额外字段被拒（不在 validator 外截断非法输入冒充合法）。
  4. McpLane 断连/丢响应/attach 失败时 `create`/`input`/`send` 净重发数 = 0；已得 id 只重新 attach；transport 重连至多一次、不逐次重置预算；v1 原始字节 / v2 通道帧按精确 protocol + ready 协商值门控，wss/query 不变、不降级。
  5. sandbox 二十工具逐一用真实 domain fixture 验证输入/输出 schema/对应业务调用（不是只数目录）；两实例隔离、越权、并发 ensure、政策变化、部分观测/真实错误、控制结果未知、非法额外字段、catalog 与 dispatch 同源均覆盖；`unknown` 不伪成 `running`、观测不等于控制成功。
  6. bridge 目录无自造 sandbox 工具、原 HTTP/CDP 能力未丢；`snapshot`/`control` 接同一领域所有者；诊断界限（history ≤30 / DOM ≤4000 / elements ≤40）不越界。
- **对应测试台账项**：`CF1115-T14` / `CF1115-T15` / `CF1115-T16` / `CF1115-T17`
- **收口标准**：4 项 Test-ID 全 PASS；PTY 真实启动/关闭/资源归属按 `-19` 在 P2 完成（F20.8）；标准协议独立验证不 JSON 化（F19.5）。
- **本 Phase 风险提醒**：这是假绿高发区——「20 个名字列出来」≠「20 项业务接通」（eval E1115-DNLS-01）、「schema 生成成功」≠「业务认证」、「有 id/收到字节」≠「成功」（F20.5/F21.8）。

### 5.4 Phase 4 — P3 · 剩余领域 / 标准协议 / host 适配

- **Phase 目标**：官方 host 契约承接 + native 支持边界 + DNMSC 例外 + DNN 标准流/别名。
- **本 Phase 对应编号**：`P4-01` / `P4-02` / `P4-03` / `P4-04`
- **本 Phase 新增 / 修改 / 删除文件**：改 `dsh-nano-cloud-session/index.js:166-237,187-241`、`src/host/devin-api.js:1-39`、`src/client/api.js:4-19`、`dsh-nano-model-selector-compaction/lib/host-services.js:64-125`、`lib/host-compaction.js:25-39`、`dsh-nano-notepad/src/host/{s3-sync,pipeline,fx-bridge}.js`、`dsh-nano-explorer-extra/src/client/body.js:94-104`；退役 `FallbackService`、`testOne`/`lsrag.manifest` 别名分支、影子服务。
- **具体功能预期**：
  1. native 只在官方公开 API 真能满足 Q16 义务表时发布；缺能力时 `native_open` 返回 `NATIVE_UNAVAILABLE` 503 + 可见原因 + 无伪 localId；carrier 管理功能不随 native 失效（F22.2）。
  2. 四个 `NATIVE_*`（503/422/500/502）分型不混成一个码；上游 403 不得改 404、确认远端拒绝不伪装成本地未知；Q8 `JS Outcome` 保留这些 domainCode，不混入 carrier reason 目录。
  3. 义务表 8 项逐项验证：身份与准入 / 历史与消息 / 发送完成 / steer·cancel / whenIdle·状态 / 恢复与 canonical / 卸载·配置失效 / 失败呈现；不把 sleep/terminate 当 cancel、不把本地消息追加成功冒充远端完成、不 catch+warn 后仍返回成功。
  4. 官方 host 薄 adapter 用受控 Promise 验证结算/最终值/可见错误/资源；Provider ON/OFF/isolate、桥身份/配置失效/初始化失败/卸载替换竞态全覆盖，不拿次数/clearInterval/idle 路径代替（F18.8）。
  5. [DNMSC] 退役 `FallbackService` 后按官方合法 loader 解析真实 Service；无法解析即明确激活失败；ON/OFF/四 preset/isolate 与已准 instanceof 降级精确承接，不偷改 bundle、不建影子服务。
  6. `/s3/config` 只留 `probe`、`/rpc` 只留 `manifest.get`，旧名明确拒绝；`null`/`denied`/读失败三者区分；fx chat SSE / WASM / SDK 标准协议独立保留，不改普通 JSON 信封。
- **对应测试台账项**：`CF1115-T16` / `CF1115-T17` / `CF1115-T18` / `CF1115-T19`
- **收口标准**：4 项 Test-ID 全 PASS；A 在某 host 为 native 不可用时验证新支持边界、不冒记原完整能力通过（F22.8）。
- **本 Phase 风险提醒**：native 收窄 ≠ 原完整能力已偿还（§6.8.3）；不把「官方接口可扩展」解释为允许插件自建 host 运行时（F22.1）；不依本机 hoist 假定支持（F22.8）。

### 5.5 Phase 5 — P4 · 全范围结算

- **Phase 目标**：八包 + 36+4 观察逐项结算 + 五态如实归类 + handoff，不缩范围、不清零债务。
- **本 Phase 对应编号**：`P5-01` / `P5-02` / `P5-03`
- **本 Phase 新增 / 修改 / 删除文件**：改 `scripts/check-feature-contract.mjs:18`、`check-clean-lib.mjs:28-39`、`route-scan.mjs:302-325`（覆盖遗漏修正）；新建结算对账视图（只读派生）；`security/route-inventory.md:1-7` 标回溯、不作分母。
- **具体功能预期**：
  1. 八包逐包给「全部适用边界覆盖」证据，含 host-only（[DNMSC]）/ 零 HTTP / native 包，不造假入口、不遗漏 [DNCS]/companion。
  2. 36 逐包 + 4 横向 `E1115-*` 观察按原号逐项结算，不按路由/声明数量销账、不另造替代账单、不静默缩全插件目标。
  3. 未接通/未验证/未裁决/需延期保持未完成；改变支持面或 defer 只由 [业主] 决定（F8.8）。
  4. 五类退役落点（代码/注释/头注/行号锚/文档句）零残留；派生视图只读可再生成、不反作第二作者。
  5. 五态如实归类；未实施/未验证债务按原观察号 handoff，不回填本阶段、不自动 defer、不宣布测试已过/债务清零。
- **对应测试台账项**：`CF1115-T20` / `CF1115-T21`
- **收口标准**：2 项 Test-ID 全 PASS；任一退出硬闸 `degraded/未观察` ⇒ 不得标 `executed`（§10.4）。
- **本 Phase 风险提醒**：这是「收口 ≠ 实施完成」的最后防线（B-10/AF-5）；不可用「已冻/已收口」替换逐项证据。

---

## 6. 依赖的冻结设计决策（只读引用）

> 只引 register 的 Q 编号 / Truth-ID，**不复制内容、不改口、不在此等待 owner 回答**。若某条不成立 → 回 `contract-and-facade-1115-qna.md` append-only supersession，再投影 truth，本 AP 保持 `draft`（blocked），不在 AP 内改约。

| 决策 / Q ID | 冻结来源 | 本计划中的影响 | 若不成立的处理 |
|-------------|----------|----------------|----------------|
| `T-O-CF1115-1..-6`（baseline U-1–U-6） | QNA §1.1 / truth §2.1 | 范围/锚点/治理/提问结构/渐进纪律/册体质量 → §1.4 策略、§2 边界 | 回 QNA；不做单包试点、不升级 eval 建议 |
| `T-O-CF1115-7..-10`（Q1–Q4） | QNA §1.3/§1.4 / truth §2.2 | 归口拓扑/合同族闭环/作者模型/同约判定 → 全 Phase 微环 | 回 QNA；不恢复多领域权威包/统一 wire 信封 |
| `T-O-CF1115-11`（Q5） | QNA §1.5 / truth:190-212（含出口表） | Phase 1 归口基座 P1-01/P1-02 | 回 QNA；不新造 runtime 插件/复制 guard |
| `T-O-CF1115-12`（Q6） | QNA §1.5 / truth:214-238（含签名/轴定义） | Phase 1 注册门面 P1-03 | 回 QNA；不在 AP 重定签名 |
| `T-O-CF1115-13`（Q7） | QNA §1.5 / truth:240-269（含两表） | Phase 1 首批闭环 P1-04/P1-05 | 回 QNA；不冒领业务/MCP |
| `T-O-CF1115-14`（Q8） | QNA §1.6 / truth:273-304（含判别矩阵） | Phase 2 P2-01/P2-04；Phase 4 别名字段承接 | 回 QNA；不新增服务端业务码 |
| `T-O-CF1115-15`（Q9） | QNA §1.6 / truth:306-330 | Phase 3 P3-01 | 回 QNA；不由生成器裁定支持面冲突 |
| `T-O-CF1115-16`（Q10） | QNA §1.6 / truth:332-346 | Phase 2 P2-03 | 回 QNA；不把整个调试对象升为公共 API |
| `T-O-CF1115-17`（Q11） | QNA §1.7 / truth:350-383（含形状） | Phase 2 P2-02（跨 Phase backbone） | 回 QNA；不造通用 IDL/runtime 注册中心 |
| `T-O-CF1115-18`（Q12） | QNA §1.7 / truth:385-399 | Phase 4 P4-01 | 回 QNA；Q12 的具体 native 义务不足已由 `-22`（Q16，义务表/错误闭集 truth:509-545）定案，本 AP 不重开、不在计划内预设第 7 轮 |
| `T-O-CF1115-19`（Q13） | QNA §1.7 / truth:401-436（含 P0–P4 表 + 八包表） | §1.2/§1.3 全部 Phase；Phase 5 P5-01 | 回 QNA；不授权自动延期/不假定阶段内业务值已批准 |
| `T-O-CF1115-20`（Q14） | QNA §1.8 / truth:440-466（含两提供面矩阵） | Phase 3 P3-02 | 回 QNA；不把 DNLS 幂等外推 DNT 单终端 |
| `T-O-CF1115-21`（Q15） | QNA §1.8 / truth:468-507（含二十工具表） | Phase 3 P3-03/P3-04；Phase 4 P4-04（DNN） | 回 QNA；不把 stub/代码缺陷认证为业务目标 |
| `T-O-CF1115-22`（Q16） | QNA §1.8 / truth:509-545（含义务表/错误码表） | Phase 4 P4-02/P4-03；Phase 5 收口 | 回 QNA；收窄≠原完整能力已偿还 |
| `DNLS01 T-O-8`（:55）/ `T-O-10`（:57 + 判例 :163/:165）/ `T-O-12`（:59）/ `T-O-17`（:64） | `docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md` | 硬切/无兼容第四阶段、instance scope、八工具/幂等/attach | 只消费/引用承接，**不改上游正文** |
| `DNMS01 R-16`（:94-96）/ `T-O-DNMS01-15`（:66） | `docs/specs/dsh-nano-model-selector/qna/DNMS01-qna.md` | vendored/四 preset/instanceof 降级；`NATIVE_*` 闭集只进唯一作者 | 只消费/引用承接，**不改上游正文** |
| 根 `AGENTS.md:37-43` 六条核心原则 + worktree + U-6 | `AGENTS.md` | `不得擅自扩约`/`不得过度仪式`/`单一真源`/`插件中立`/`不得侧载`/`上层建筑归host` | 权威边界，不迁移登记源 |

---

## 7. 内置 Reference-Anchor 锚区

> 本段固定植入每份 AP（业主指令）：把工作项要落到的既有代码、要避开的陷阱、安全项的威胁模型就地钉住。无独立 `eval-reference-anchor` → **§7 即本 AP 的 grounding 真源**。

### 7.0 快照 / 漂移与复验说明（先读）

- [真相层] header / B-3：全部 `file:line` 引用锚定 `main @ f7199f9`（`f7199f96259baad78b1b6f162db38297ecaff5c1`），「行号漂移时以路径 + 符号名为准」。
- 本机工作树实测 HEAD = `653b15b4721f3ad6a410db46e7abd3f5691f03a0`，commit message 同为 `Merge branch 'dncs-devin-cloud-session-full'`；`f7199f9...` 在本仓 git 对象库中不可达（`git cat-file` / `merge-base` 均失败），属**时点标签**，不是「代码已改」的证据，也不回改测量层（权威边界 7）。
- 本 AP 已按「路径 + 符号名」对下列锚逐条复验（2026-11-15）：文件全部存在、符号全部在场、行号落在引用区间内。示例：`dsh-nano-terminal/lib/route-guard.js:243` 确有 `spec.kind ?? ROUTE_KIND` 私改；`mcp-sandbox.js:2-38` 确有二十工具名与 `answerNativeTool` 诊断摘要；`panel.js:4504` 确有 `window.__nanoNotepad = {`；`pipeline.js:185` 确有 `RPC_METHODS` 五 method；`s3-sync.js:380-396` 确有 `config` 的 `probe`/`testOne` 分支；`host-services.js:65` 确有 `class FallbackService`；`check-clean-lib.mjs:28-36` 的 `PLUGINS` 七包含 [DNMSC] 不含 [DNCS]。
- 结论：下表 `path:line` 是定位提示，**符号名才是漂移后的准绳**；本 AP 不修改任何冻结真相、不把复验结果当成新裁决（CITE only）。

### 7.1 锚表（本计划工作要落在哪些既有代码 / 新建点上）

> `处置`：✅ 复用 / ♻️ 重 substrate / 🆕 净新。「读不改的参考点」在备注写明。

| 锚 ID | `path:line` | 落点（这是什么）| 本 AP 用途（对应工作项）| 处置 | 备注 |
|-------|-------------|------------------|--------------------------|------|------|
| A-1 | `packages/dsh-host-route-guard/src/route-guard.js:1-24,162-166,243-247` | 唯一 web 路由注册入口；`requestRejection` fail-closed、`ctx.effect(register)`、`sessionBinding` 仅元数据 | P1-02/P1-03 复用参照；P3-01 威胁模型 | ✅ 复用 | 已建好别重写；`sessionBinding` 非运行时授权（`:21-22`） |
| A-2 | `packages/dsh-host-route-guard/test/route-guard.test.mjs:1-296` | 唯一注册实现单测 B0-T01 | P1-05 增加 upgrade/mixed-batch/释放负例 | ♻️ 重 substrate | 不复制第二套实现测试成第二作者 |
| A-3 | `dsh-nano-terminal/lib/route-guard.js:243` / `lib/route-table.js:1-8` | 私改 guard 副本（`spec.kind ?? ROUTE_KIND`）+ 本地 5 行 route table | P1-02/P1-04 退役点 | ♻️ 重 substrate | 退役对象，见 ⛔2 |
| A-4 | `dsh-nano-terminal/test/register-routes.smoke.mjs:6-17` | 现断言「源码含 `registerUpgrade(`、不含 `register(`」 | P1-05 改写为更强装配断言 | ♻️ 重 substrate | **不能简单删测试**（F13.6） |
| A-5 | `dsh-nano-notepad/index.js:334-357` | SDK `kind:'prefix'` 旁路注册 + 手动 `conn.requestRejection` | P1-04 迁入公共门面 | ♻️ 重 substrate | 有手动准入，不宣称未鉴权（eval E1115-DNN-01） |
| A-6 | `dsh-nano-notepad/src/client/panel.js:4500-4624`（`window.__nanoNotepad = {`，`:4504`） | 跨插件 import/diagnostic/fx/corpus/sqlite/pipeline 全局根 | P2-03 退役点 | ♻️ 重 substrate | 公共/内部/测试面未分层（eval E1115-DNN-04） |
| A-7 | `dsh-nano-explorer-extra/src/client/body.js:924-966` | `/open-in-app/*`、`__nanoNotepad.import`、`nanoTerminal.openLocal` 三类外部能力消费 | P2-03/P4-04 消费者接入 | ✅ 复用 | 缺席检查≠签名/版本/失败语义有共同合同 |
| A-8 | `dsh-nano-notepad/src/host/s3-sync.js:379-410`（`config` 的 `probe`/`testOne`）· `pipeline.js:179-225`（`RPC_METHODS` 五 method / `manifest.get`·`lsrag.manifest`） | 两组别名边界（B-5/AF-2） | P4-04 唯一名取舍 | ♻️ 重 substrate | **两个边界、两组别名**，同函数委托不自动批准删名 |
| A-9 | `dsh-nano-local-sandbox/src/host/mcp-sandbox.js:2-38`（`SANDBOX_TOOL_NAMES` 20 / `answerNativeTool` 诊断摘要）· `routes.js:514-529` | host MCP 20 空 schema + 统一摘要返回 | P3-03 真实业务接线 | ♻️ 重 substrate | 「列了名字」≠「20 项业务已实现」，见 ⛔4 |
| A-10 | `dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs:163-278` · `dsh-nano-kitesurf/runtime/mcp-bridge.mjs:163-263` | 容器 bridge 15 `sandbox.*` + 双载体源码 | P3-03/P3-04 只留获准 CDP / 退役副本 | ♻️ 重 substrate | 不与 host 20 取并集（F21.1） |
| A-11 | `dsh-nano-terminal/schema/dnt-mcp.openrpc.json:8-12`（`x-errorKinds` 十三 errorKinds 基线）· `:17`（`x-address`）· `:18-42`（create `lane: local/mcp/isolate`、`template`/`task`、result） | 十九工具 + 十三 errorKinds 基线 | P3-02 修订目标 | ♻️ 重 substrate | 作者固定为 `f7199f9` 基线 methods，不授权迁移者再挑字段（F20.4） |
| A-12 | `dsh-nano-terminal/src/client/lanes.js:24-35,116-143,212-261` | LocalLane v2 / McpLane attach `v:2` / 递归退避 | P3-02 最小 create + 重连至多一次 | ♻️ 重 substrate | 明确替换 E64 递归退避（F20.6） |
| A-13 | `dsh-nano-cloud-session/index.js:166-237,187-241`（`nativeOpen` / `ctx.agents.enter(fake)` / `native_open`）· `src/host/devin-api.js:1-39` | native 投影 + fake Agent | P4-01/P4-02 支持边界 | ♻️ 重 substrate | 不是宣布所有安装版目前不可用（F22.1） |
| A-14 | `dsh-nano-model-selector-compaction/lib/host-services.js:64-125`（`class FallbackService` / `HOST_SERVICE_SOURCE`） | 自制影子 Service | P4-03 退役点 | ♻️ 重 substrate | 精确保留 R-16，退役影子、不替换私有 host 路径 |
| A-15 | `dsh-nano-model-selector/lib/compact-policy.js:1-47` · `dsh-nano-model-selector-compaction/lib/compact-policy.js:1-47` | 逐字相同的两份 compact-policy | P4-03/P2-04 唯一作者 | ✅ 复用 | 本轮 SHA-256 相同，登记维护分叉风险，不冒充已漂移 |
| A-16 | `dsh-nano-explorer-extra/src/host/routes.js:637-638`（catch→`400 {error}`）· `src/client/workspace-store.js:33-48` | 字符串 error / `{ok:false,message}` 旧 wrapper | P2-01/P2-04 退役点 | ♻️ 重 substrate | 18 路由共用，不表示每条业务都失败 |
| A-17 | `scripts/check-route-sensitivity.mjs:23-47` · `check-feature-contract.mjs:18-54`（`PLUGINS` 六包）· `check-clean-lib.mjs:28-39`（七包）· `route-scan.mjs:302-325`（`known` 表） | 三项既有 drift gate + 扫描器 | P1-05/P5-02 扩维/修覆盖 | ✅ 复用 | 扩维不缩 scope/不移除安全断言求绿；PASS 只证明检查范围 |
| A-18 | `security/route-inventory.md:1-7`（自称 35 条，DEPRECATED）· `contract-and-facade-1115-eval.md:89-95`（47/48/43 口径） | 过期分母 / 历史快照 | §2.2 O6 / §7.2 ⛔7 / P5-02 回溯 | — 读不改 | **不作现行分母、不作验收阈值**；无 `44` 这个数 |
| A-19 | 🆕 `packages/dsh-interface/{package.json,src/contracts/,src/host/,src/build/,test/}` | 归口基座（尚未存在，已核实 `packages/` 下无此目录）| P1-01/P1-03/P2-01/P2-02/P3-01 新建点 | 🆕 净新 | 纯 ESM 构建期私有库，无 `dsh.bundle/client` |
| A-20 | `AGENTS.md:37-43` · `docs/code-review/26-nov/security-audit.md:36-48,271` | 六条核心原则 / 信任边界 | §6 / §7.3 威胁模型 | — 读不改 | 安全审计发现不在本 AP 修复范围（O5） |

### 7.2 反例 ledger ⛔（别碰区 / 已知陷阱）

| ⛔ | 反例 / 陷阱 | 为什么（依据）|
|----|------------|----------------|
| ⛔1 | 兼容 façade / 双写 / 双轨开关 / 兼容 alias / 旧 parser 回退 / 常驻翻译链 / 兼容第四阶段 | DNLS01 `T-O-8`/`T-O-10`:57 判例 :163「硬切=切割方式」/:165「不兼容=合同面」；F8.5/F10.7/F19.5 |
| ⛔2 | 保留第二套 guard / 消费者私改副本 / 已迁移链路旁路 / 两个生成投影互证 | F7.3/F7.5/F11.3/F13.3/F17.8；eval E1115-DNT-01 |
| ⛔3 | 统一全仓 wire 信封 / 通用 IDL / runtime 注册中心 / runtime 总线 / 共享 mutable store / 插件私有通道 / 硬编 base-url / 秘钥 | F7.2/F9.2/F11.8/F14.2/F15.1；AGENTS.md `单一真源`/`不得侧载`/`插件中立`/`上层建筑归host` |
| ⛔4 | 把「目录/声明数量」当业务完成：20 名字 = 20 项已接通、schema 生成成功 = 业务认证、占位摘要冒成功、`unknown` 伪成 `running` | F8.2/F10.3/F15.2/F21.5/F21.8；eval E1115-DNLS-01/06、E1115-CROSS-03 |
| ⛔5 | 删断言 / 缩检查 scope / 移除安全断言求绿；新增第四道 gate / 反复全仓验收循环 | F13.6/F19.1/F8.4；`AGENTS.md:39` 不得过度仪式；QNA §8 第 7 条 |
| ⛔6 | 由实现反推合同 / 从测试要求倒推错误码·retry·幂等键·lane·凭证面；擅自扩约 | F8.1/F9.7/F10.8/F19.8；`AGENTS.md:40` 不得擅自扩约；QNA §8 第 5 条 |
| ⛔7 | 用 85/118/47/48/43 或过期 35 作验收分母 / 减债；改写旧账；制造 `44` | B-2/B-3/AF-6/F12.8；eval §1.3/§2.2；truth v0.1.1 修订（44→48） |
| ⛔8 | 把「已冻/已收口」读成代码已改/测试已过/债务清零/自动 defer；宣布收口即清零 | AF-5/B-10/F22.8；QNA §6.8.3 |
| ⛔9 | 删名/改称 unsupported/用诊断摘要代替已承诺业务来销账；按包/按层为销账主单位 | F8.2/F8.7；eval §0 结论 2 |
| ⛔10 | wss→ws 降级 / 猜 URL / 覆盖 query / 私造 priority / 丢 head / 公共层握手 / 超时自动重发写入 | F12.4/F15.6/F20.6/F20.7 |
| ⛔11 | 把两组别名（`/s3/config` probe·testOne 与 `/rpc` manifest.get·lsrag.manifest）当一个「自定义 RPC」 | B-5/AF-2/R-7；QNA §7.4 |
| ⛔12 | 自建 host 运行时 / 复制 Agent·Session·Service / 影子 Service / 第二 durable 恢复源 | F18.1/F22.1/F22.6/F22.8 |

### 7.3 上游真源指针 + 安全项威胁模型

- **独立 reference-anchor**：`N/A`（本 campaign 无独立 `eval-reference-anchor` 文件）。§7.1 是 eval §3–§9 / 附录 A + QNA E1–E76 `file:line` 与本 AP 工作项相关子集的摘录；完整形成史测量（含 85/118/47/48/43 口径、36+4 观察、附录 A 85 项清单）见 `contract-and-facade-1115-eval.md`，规范决定见 `contract-and-facade-1115-qna.md` 与 `contract-and-facade-1115-qna-truth.md`。
- **安全 / 信任边界类工作项的威胁模型锚（不得留空）**：
  - 主锚：`docs/code-review/26-nov/security-audit.md:36-48`（核心结论「同源页面 JS 被当作与宿主等价的信任主体不成立」；全部宿主路由仅一道 `connection.requestRejection`）、`:131/:263`（较低信任主体 = 通过 requestRejection 的同源页面脚本）、`:115`（fetch-mp 30x 重定向 finding，属 O5 out-of-scope，仅作信任边界旁证）、`:271`（`scopeOf` 跨会话）、`:387/:424`（结构性加固建议 / fail-open idiom）。
  - 补充锚：`contract-and-facade-1115-eval.md:155-178`（§3.2 现有检查盲区：`sessionBinding` 非对象级授权、扫描外 prefix）、`:361-371`（§5.2 连接准入/请求解析/operation/响应错误/状态副作用五层）、`:495-502`（§7 横向四类 A/S/G 观察）；`packages/dsh-host-route-guard/src/route-guard.js:8-9,21-22,162-166`（fail-closed connection / sessionBinding 仅元数据 / `no-request-rejection` 拒绝）。
  - 对应安全项：P1-03（fail-closed 准入）、P2-03（window global 收窄）、P3-01/P3-03（工具名≠授权、越权/隔离）、P4-01/P4-02（桥身份/凭证边界/配置失效）、P5-02（扫描覆盖）。
  - **攻击向量用例强制**（§8.5 / §8.6）：未带鉴权的 HTTP 与 upgrade 在 handler/handshake **之前**被拒（handler 入口计数 = 0）；缺 `connection`/`requestRejection` 时注册数 = 0；伪造/缺失 `attach.protocol`、wss→ws、跨 profile/session 身份复用、非法额外字段、越权实例 ensure、`..` 路径别名等必须有负向断言 + 合法对照。
  - **范围声明**：本 AP 的威胁模型是「**不削弱既有 `requestRejection` 边界、不把 `sessionBinding` 当运行时授权、不新增 token/role/lane/凭证面**」（F9.4/F12.3/F18.2/F22.3）；security-audit.md 的既有发现属 O5 out-of-scope，不在本 AP 修复，也不借本 AP 冒充已修复。

---

## 8. 测试台账

> **本段固定植入每份 AP**。测试细节只在此写一次（§4/§5 只引 Test-ID）。
>
> ⚠️ **本 AP 为 `draft`，当前 0 项 PASS、0 项已观察**：`PASS 证据（四元组）` 列写的是**执行期必须回填的证据形状**（`commit {sha} + {测试/命令} PASS + {必要的 D1/查询} + run-time(UTC)`），不是既成事实；落成前一律 `未观察`（§10.2）。任何把「待回填」写成已填、把占位四元组当作 PASS 的做法按 §8.5/§8.6 判假绿。

### 8.1 测试清单（主表）

| Test-ID | 测试项（验证什么）| 类型 | 层 | 来源 | 映射（工作项 → 收口目标）| PASS 证据（四元组，执行期回填）|
|---------|------------------|------|----|------|---------------------------|---------------------|
| `CF1115-T01` | `dsh-interface` 三出口纯净：contracts 无 Node/DOM/Cordis/store、host 不持 canonical、build 不进运行时链；无 `dsh.bundle/client` | `短途` | `unit·契约` | 🆕 新增 `packages/dsh-interface/test/exports.test.mjs` | P1-01 → 三出口边界可验证 | `commit {sha} + exports.test.mjs PASS + run-time(UTC)` |
| `CF1115-T02` | guard 唯一实现单向复用；DNT 私改副本退役；每包 build 物化 + 离仓自包含 | `spike` | `集成·契约` | 🔱 fork `route-guard.test.mjs` + 加「唯一实现/离仓双向清单」断言；♻️ 沿用 `npm pack --dry-run` | P1-02 → 唯一 guard + 离仓自包含 | `commit + {test} PASS + pack 双向集合 + run-time` |
| `CF1115-T03` | 再生成幂等（同输入字节一致）、作者变化可达产物、不为接线升级工具链 | `短途` | `契约` | 🆕 新增 `packages/dsh-interface/test/regen.test.mjs` | P1-02 → 幂等再生成 | `commit + regen.test.mjs PASS + run-time` |
| `CF1115-T04` | `createWebRegistrar` 真实 `register`/`registerUpgrade` 往返、全批预检失败回收、幂等 dispose 纳入 ctx.effect、撤销重装 | `spike` | `集成·e2e(受控host)` | 🆕 新增 `packages/dsh-interface/test/registrar.test.mjs`（可注入 seam） | P1-03 → 真实装配闭环 | `commit + registrar.test.mjs PASS + 受控host往返日志 + run-time` |
| `CF1115-T05` | registrar fail-closed 负例：缺 connection/requestRejection/handler、未知维度、重复键、归属冲突；拒绝前副作用 = 0 | `短途` | `集成·安全` | 🆕 新增 `packages/dsh-interface/test/registrar-negative.test.mjs` | P1-03 → fail-closed 准入 | `commit + {test} PASS + handler入口计数=0 + run-time` |
| `CF1115-T06` | channel/match 双维视图以实际观察 + 独立负例校验，不 path-only 吞一面；sessionBinding 非自动授权 | `短途` | `契约` | 🆕 新增 `packages/dsh-interface/test/channel-match.test.mjs` | P1-03 → 双维视图 | `commit + {test} PASS + 双维负例日志 + run-time` |
| `CF1115-T07` | 三项既有检查扩维不缩 scope/不移除安全断言；smoke 改更强装配断言、断言数不下降；一次必要集成 | `短途` | `契约(drift gate)` | ♻️ 沿用 `check-route-sensitivity.mjs`/`check-feature-contract.mjs`/`check-clean-lib.mjs`；🔱 fork `register-routes.smoke.mjs` | P1-05 → 验证层/退役 | `commit + 三 gate exit 0 + 负例非 0 + 断言数≥快照 + run-time` |
| `CF1115-T08` | DNN/DNT 首批协议保真：原 URL/字节/HEAD/MIME/MCP/SSE/WS/PTY 责任保留、无双注册/漏升级、离线夹具不冒充安装态 e2e | `spike` | `e2e(受控host)·回归` | 🔱 fork 各包 smoke + 加协议保真断言；♻️ 沿用 `npm --prefix dsh-nano-terminal test` | P1-04 → 协议保真 | `commit + {test} PASS + 协议往返日志 + run-time` |
| `CF1115-T09` | 离仓 tarball / 最小受控 host 实际加载（非 dry-run）+ 必要资产齐全 | `spike` | `集成·live(受控)` | 🆕 新增 `packages/dsh-interface/test/offline-load.test.mjs` | P1-04 → 离仓产物 | `commit + 实际 tarball 加载 PASS + run-time` |
| `CF1115-T10` | `JsonOutcome` Q8 原题判别矩阵（7 类结果）+ F14.8 细分状态夹具（不发请求/不重发/非法 2xx/领域·HTTP 分型/空体·null·degraded/取消/读体中断/双 status） | `spike` | `unit·集成` | 🆕 新增 `packages/dsh-interface/test/json-outcome.test.mjs` | P2-01 → 五类失败判别 | `commit + 判别矩阵 7 类逐态 + F14.8 清单全 PASS + run-time` |
| `CF1115-T11` | 最小导入服务：就绪/缺席/失败/类型拒绝/竞态/过期句柄/替换版本冲突/空内容/Windows sourcePath/最小回执/内部 fx + 真 service 提供·发现·撤销·真实导入 | `spike` | `集成·回归` | 🆕 新增 `dsh-nano-notepad/test/import-service.test.mjs`（或包内隔离夹具） | P2-03 → 真服务非全局名消失 | `commit + {test} PASS + run-time` |
| `CF1115-T12` | FamilyDefinition 多操作/同名异约/跨族标识/未知 dispatch/未批准字段/环境隔离 + 真实 factory 与离仓同源 | `短途` | `unit·契约` | 🆕 新增 `packages/dsh-interface/test/family-definition.test.mjs` | P2-02 → 唯一作者记录 | `commit + {test} PASS + run-time` |
| `CF1115-T13` | 普通 JSON 唯一 codec 成对硬切；旧 wrapper/parser/alias 零残留；领域政策/sanctioned writer 保留 | `短途` | `集成·回归` | ♻️ 沿用各包 `npm test` + 🆕 加退役零残留断言 | P2-04 → 成对硬切 | `commit + {test} PASS + 零残留扫描 + run-time` |
| `CF1115-T14` | MCP 广告精确对账 + 真实 schema 校验 + `decodeMcpReply` 三层 + 带 id 的 isError + attach protocol/URL/wss 拒绝降级 | `spike` | `集成·安全` | 🆕 新增 `packages/dsh-interface/test/mcp-facade.test.mjs`；♻️ 沿用 DNT MCP 单测 | P3-01 → 真实分发/分层解码 | `commit + {test} PASS + 攻击向量日志 + run-time` |
| `CF1115-T15` | terminal 两提供面：八/十九工具分别标识、DNLS 单飞幂等 / DNT 多个不同 id、非法字段/边界、source 只在 DNT、失败含 id 不当成功、v1/v2 门控、wss/query 不变、断连至多一次且不重跑写入 | `soak` | `集成·live(受控)` | 🆕 新增 `packages/dsh-interface/test/terminal-lanes.test.mjs`（deterministic × N） | P3-02/P3-05 → 两提供面互操作 | `commit + soak log + 规定轨迹逐次深相等 + run-time` |
| `CF1115-T16` | sandbox 二十工具逐一真实 domain fixture（输入/输出 schema/业务调用）+ 两实例隔离/越权/并发 ensure/政策变化/部分观测·真实错误/控制结果未知/非法额外字段/catalog·dispatch 同源 | `spike` | `集成·回归` | 🆕 新增 `dsh-nano-local-sandbox/test/sandbox-tools.test.mjs` | P3-03/P4-04 → 真实业务接线 | `commit + 20 工具逐项业务调用 PASS + run-time` |
| `CF1115-T17` | bridge 只做获准 CDP（无自造 sandbox 工具/原 HTTP 能力未丢）+ DNK 旧资产退役 + DNN probe/manifest 唯一名·旧名拒绝·null/denied/读失败区别 | `短途` | `集成·契约` | ♻️ 沿用 DNK/DNN 回归 + 🆕 加退役/别名负例 | P3-04/P3-05/P4-04 → 退役/别名 | `commit + {test} PASS + 零残留扫描 + run-time` |
| `CF1115-T18` | host 薄 adapter：ON/OFF/isolate、桥身份/配置失效/初始化失败/卸载替换竞态；受控 Promise 结算（非 timer/clearInterval/idle 替代） | `soak` | `集成·live(受控)` | 🆕 新增 `dsh-nano-cloud-session/test/host-adapter.test.mjs`（受控 Promise） | P4-01 → 异步结算 | `commit + 结算最终值/可见错误/资源 PASS + run-time` |
| `CF1115-T19` | native 支持边界 + 义务表 8 项 + `NATIVE_*` 四码分型 + 503/可见原因/无伪 localId + 上游 403 不误判 + 卸载在途 barrier + DNMSC 真实 Service 解析/ON·OFF/四 preset/isolate/已准降级 | `soak` | `集成·安全·live(受控)` | 🆕 新增 `dsh-nano-cloud-session/test/native-boundary.test.mjs` + DNMSC 装配测试 | P4-02/P4-03 → native/例外 | `commit + 8 义务 + 四码 + barrier PASS + run-time` |
| `CF1115-T20` | P4 全范围结算：八包逐包覆盖证据 + 36 逐包 + 4 横向观察按原号逐项 + 旧源/离仓产物/扫描对账 + 五类退役清单零残留 | `mega` | `契约·回归(账本)` | 🆕 新增 `scripts/verify-cf1115-settlement.mjs`（**逐观察号账本，非全仓循环**） | P5-01/P5-02 → 全账结算 | `commit + 40 观察号逐项有证据 + 零残留扫描 + run-time` |
| `CF1115-T21` | 五态如实归类 + 债务按原 `E1115-*` 号 handoff + 不标 `executed` + 无 overclaim | `短途` | `契约` | 🆕 新增 `scripts/verify-cf1115-closure-state.mjs` | P5-03 → 诚实收口 | `commit + 五态归类 PASS + 文档状态≠executed + run-time` |

### 8.2 复用台账（沿用 / fork 的既有用例明细）

| 既有用例 | 处置 | 改动 | 起跑线状态 |
|----------|------|------|------------|
| `packages/dsh-host-route-guard/test/route-guard.test.mjs` | 🔱 fork → 加 upgrade/mixed-batch/释放负例 | 不复制第二套实现测试 | 已存在，PASS（B0-T01） |
| `dsh-nano-terminal/test/register-routes.smoke.mjs` | 🔱 fork → 改更强真实装配断言 | **禁止简单删测试**；断言数 ≥ 快照 | 已存在，PASS（现期待直注册 upgrade） |
| `npm --prefix dsh-nano-terminal test` | ♻️ 沿用 | 0 改动，纳入回归 | 已存在，PASS |
| `node scripts/check-route-sensitivity.mjs` | ♻️ 沿用 + 扩 channel/match 维度 | 不缩 scope / 不移除安全断言 | 已存在，PASS（85 routes, 0 drift，时点值） |
| `node scripts/check-feature-contract.mjs` | ♻️ 沿用 + 修 `PLUGINS` 六包覆盖遗漏 | 只补维度，不放宽 | 已存在，PASS（时点值） |
| `node scripts/check-clean-lib.mjs` | ♻️ 沿用 + 修七包清单覆盖遗漏 | 只补维度，不放宽 | 已存在，PASS（时点值） |
| `npm pack --dry-run`（各包） | ♻️ 沿用 | 只证清单；**离仓实际加载另由 T09** | 已存在，PASS |
| `scripts/test-all.mjs:25-46` | ♻️ 沿用 | 自动发现，0 改动 | 已存在，PASS |

> 说明：上表「PASS」指**复用起跑线**在 `f7199f9`/本机 `653b15b` 时点的既有状态（eval §3.2 实测），**不是本 AP 已产出任何 PASS**（本 AP 为 draft）。F13.6：按原题验证表执行相关窄测试、收口一次必要集成，不新增门禁（Q7 验证层表 truth:262-267）。

### 8.3 分层与跑法（各类型在哪跑、何时跑）

| 类型 | 跑法 / 频率 | 主要层 | 触发时机 |
|------|-------------|--------|----------|
| 短途 | 本地 / 每 PR | unit·集成·契约·回归·安全 | 开发中持续 |
| spike | journey 用例（每 Phase 收口的真实装配 / 协议保真 / 离仓加载） | e2e(受控host)·集成·live(受控) | 每 Phase 收口 |
| mega | **逐观察号账本对账（P5-01/P5-02），非全仓循环** | 契约·回归(账本) | P4 结算 |
| soak | deterministic × N，仅 F18.8/F20.6/F22.8 指定的异步结算 / 断连单飞 / 卸载竞态 | 集成·live(受控) | 对应 Phase 收口（非全仓退出总闸） |

> **不新增 release-gate**：以上全部复用既有检查入口 + 新建窄测试文件；不改 `check-*.mjs` 的硬门行为、不加第四道门禁、不反复全仓（F8.4/F13.6/F19.1/F19.6；`AGENTS.md:39`）。`mega/soak` 是分层证据类型，不是全仓发布总闸。离线夹具不启动真实 PTY/容器、不写用户数据、不冒充安装态 e2e（F13.4）；真实远端写操作/环境动作须 [业主] 单独授权（F19.6 / P6）。

### 8.4 测试缺口（本 AP 明确不覆盖什么 + 交给谁）

- 不覆盖**安装态 e2e / 真实 PTY·容器启动 / 真实远端 carrier 写操作 / 引擎版本区间（engines.dsh）核验**：理由 = 本 AP 为 `draft`、无 implementation/live/远端授权（P6/F13.4/F19.6）→ 交另立 `ImplementationGrant` 与后继验收。
- 不覆盖**security-audit.md 既有安全发现的整改与复验**：理由 = O5，属另一 campaign → 交 [业主] 另立安全整改计划。
- 不覆盖**新公共合同（新错误码/retry/lane/凭证/支持面冲突）的裁决**：理由 = 只由 [业主] 决定（F9.7/F19.8）→ 交 `AGENTS.md:40` 正常变更登记。
- 不在本 AP 假装覆盖任何未实施项；未验证能力如实登记（`未观察`），不提前销账（F8.8/F13.4）。

### 8.5 测试保真（防假绿 · 刻死）

- ✅ 每个 PASS 必带**四元组** `commit + 测试/查询名 + 结果 + run-time(UTC)`；**计数 ≠ 价值**（对齐 closure 诚实收口 / eval §8.5）。本 AP 当前四元组均为「执行期回填」形状，落成前一律 `未观察`。
- `degraded` 必带机器可读 `reason`；`pre-existing` 失败必带 **git 证据甩锅**（`git show <sha>:<file>` 对比），不 silent overclaim。
- **安全 / 信任边界**项（T05/T14/T15/T18/T19）必须含**攻击向量用例**（§7.3）：未鉴权 HTTP/upgrade 在 handler/handshake 前拒绝、缺 connection/requestRejection 注册数 = 0、wss→ws / 猜 URL / 越权实例 / 非法额外字段 / 跨 profile 身份复用，每条都有「攻击时副作用 = 0」+「合法对照使同一副作用 ≥ 1」，不只测 happy-path。**本条必须逐条落到 §8.6 对应 Test-ID 各自的判失败条件**：每一类攻击向量在 T05/T14/T15/T18/T19 各自有「攻击进行时该副作用计数 = 0」与「合法对照使同一副作用计数 ≥ 1」两条独立断言，计数须来自真实 handler 入口 / 真实 register / 真实 domain owner 的可观测调用，不得由测试自建的恒 0/恒 1 计数器充当；T18/T19 另判失败「catch+warn 之后仍返回成功」「警告后假成功 / 永久排队」。任一行缺这对断言、只给 happy-path、或只给「不是 X」式断言，该 Test-ID 不得 PASS，§10.3 不得写「§8.6 全部封口」。
- **不得删断言求绿**：`register-routes.smoke.mjs` 改写后断言数 ≥ 快照；标题级对应（不是「个数 ≥ 快照」的散文迁移记录）；空测试 / `assert.equal(1,1)` / 散文「迁移记录」不算对应（F13.6 / §8.2）。
- **不得用邻近替身自证**：不用「两个生成投影互证」「源码字符串 `includes`」「测试自建的坏动作计数器」「打印插件名字面量」「允许清单自指」判 PASS（F13.3/F17.8；DNLS01 审查 B-T17/B-T18/B-T20 判例）。
- **不得把声明/目录数量当业务完成**：20 工具名 ≠ 20 项接通、schema 生成 ≠ 业务认证、`unknown` ≠ `running`、`有 id/收到字节` ≠ 成功（F8.2/F10.3/F20.5/F21.8）。
- **证据强度分层**：登记一致 / schema 一致 / handler 接线 / 客户端互操作 / e2e 行为分别给证据，不用一个 PASS 覆盖所有层（eval §8.5 / F8.4）；标准协议独立验证不 JSON 化（F19.5）。
- **收口不等于实施完成**：任一退出硬闸 `degraded/未观察` ⇒ 不得标 `executed`；按五态如实归类（§10.4 / AF-5 / B-10）。
- **计数口径**：85/118/47/48/43 与 35/54/41/39 均为时点快照，不作阈值、不减债、不出现 `44`（B-2/AF-6/F12.8）。

### 8.6 专业防假绿侦测台账（逐 Test-ID 全覆盖）

> 对 §8.1 **全部 21 个 Test-ID** 逐个侦测：列出该测试「最可能的假绿向量」→ 可粘贴封口断言 → 判失败条件。封口只加严、可证伪，不放宽。任何 Test-ID 缺任一封口断言，该 Test-ID 不得 PASS。
>
> **§8.5 全局刻死规则的逐-ID 落地（防「按 21 行跑即可全绿而全局规则从未证伪」）**：§8.5 的「证据强度分层」「标准协议独立验证不 JSON 化」「安全项攻击对照（攻击时副作用=0 + 合法对照≥1 + handler 入口计数=0）」「审计 writer 真实落盘 / 公开 Cordis 服务消费」四类跨-ID 规则，**不是散文口号**，必须分别落到下表具体 Test-ID 的封口断言与判失败条件：证据强度分层→T01/T08/T20，标准协议独立→T15/T17（P3-05/P4-04 收口），安全攻击对照→T05/T14/T15/T18/T19 各自判失败，审计/公开服务→T15。任一工作项（尤其 P3-05、P4-04）的收口目标在本表找不到对应封口断言时，该目标不得随相关 Test-ID 的 PASS 被宣称达成；§10.3「§8.6 全部封口」须逐项核对本落地表后方成立。

| Test-ID | 假绿向量（会被什么冒充） | 封口断言（必须真正观察） | 判失败条件 |
|---------|------------------------|--------------------------|------------|
| `CF1115-T01` | 只断言文件名含 `contracts/host/build`、或只 grep 源码字符串；`src/contracts` 实际 import 了 `node:fs` 仍绿 | 对每个出口做**真实 `import()`** 并遍历模块依赖图：`contracts` 依赖图内出现 `node:*`/DOM/`cordis` 实例/可变 store 即失败；`build` 出口被页面 bundle 引用即失败；`package.json` 无 `dsh.bundle`/`dsh.client` 键为字面量断言 | 只做字符串「含有/不含」、或只读目录名不看依赖图 |
| `CF1115-T02` | guard 「唯一实现」用源码 `includes('dsh-host-route-guard')` 判定；私改副本仍在 `lib/` 却算退役；`npm pack --dry-run` 打印清单即算离仓加载 | `lib/**/route-guard.js` 中 `spec.kind ??` 类私改符号命中数 = 0（按符号名，非路径）；修改唯一 guard 源后各包产物**同步变化**（作者可达）；pack 清单与运行时 import 图**双向集合相等**；离仓实际加载另由 T09（本项不得用 dry-run 冒充） | 用 dry-run 清单顶替实际加载；集合单向比较；私改符号仅「路径排除」不「符号命中=0」 |
| `CF1115-T03` | 再生成两次不比较字节、或把生成产物手改后也算幂等；作者变化后产物不变仍绿 | 同输入两次生成**字节级相等**；改一处作者源（如加绑定字段）后产物对应变化，且该变化可追溯到作者文件；生成过程不写入被测产物 | 只比较文件个数/行数；允许手改 `lib/` 参与比较 |
| `CF1115-T04` | 用两个 baked 表投影互证；用 mock `fetch`/mock `webServer` 打出「注册成功」却不调用真实 `register`；回收只查「没抛错」 | 受控 host 观察**真实 `ctx.webServer.register`/`registerUpgrade` 调用计数**与传入 spec；注入第 3 个非函数 handler 时本批净注册数 = 0 且已注册项被 disposer 回收；`ctx.effect` 挂载次数 = 1；撤销→重装不重复释放 | 用 mock 替身代替真实 register；只看「不抛错」不看净调用数；两个投影互证 |
| `CF1115-T05` | 「坏动作计数器」由测试自建恒为 0；只断言抛出了某种错误、不验证拒绝发生在副作用之前 | 逐类负例（缺 connection / `requestRejection` 非函数 / 缺·多·非函数 handler / 未知 channel·match / 重复键 / 归属冲突）下 **handler 入口计数 = 0**、注册数 = 0、handshake 未发生；合法对照使同一副作用 ≥ 1；`requestRejection` 调用发生在 handler 之前 | 计数器由测试自建；只测 happy-path；未验证「拒绝前副作用=0」时序 |
| `CF1115-T06` | path-only 断言吞掉 upgrade 一面；只列了 channel 没列 match；把 `sessionBinding` 当授权通过 | 对 http-exact/http-prefix/upgrade-exact 三类各给「命中 + 独立负例」；upgrade-prefix 明确拒绝；断言 inventory 中 `channel` 与 `match` **两个字段**都在且值来自真实绑定；`sessionBinding` 存在但无授权副作用 | 单维断言；把 metadata 当授权 |
| `CF1115-T07` | 三 gate 「打印插件名」即算扫到；多一行夹具加在已扫包上；删 smoke 断言求绿；新增第四道 gate；改写 smoke 时同步把「快照」重生成自已被削弱的版本使「≥ 快照」恒真 | 插件名必须来自同进程 `scanRoutes()` 返回值与两个 `PLUGINS` 数组**实际遍历**，禁止断言源码「含有」；负向三连（去掉已扫插件行 → 两 gate 非 0；只在新包加一行 → 扫描非 0；clean-lib 对夹具裸 import 非 0）；**标题级快照必须是事先落盘、外部固定字面量文件**（记录每个 `test()` 相对路径+标题+`assert/expect` 调用数），测试不得在运行时从当前 `register-routes.smoke.mjs` 重新生成快照、快照不存在即失败不得现场补写；标题级断言数 ≥ 快照且新测试同标题 `assert` 调用数 ≥ 旧同标题，且新断言必须是「对共同机制 + 实际准入的真实装配断言」（不得为 `source.includes(...)` 源码字符串断言）；三 gate 的 exit 0 与三条负向非 0 日志一并进四元组；不新增脚本/门禁 | 打印字面量插件名；负向只做一条；断言净下降；新增第四道 gate；快照现场重生成/现场补存档；新断言仍是源码字符串 includes |
| `CF1115-T08` | 改一个 base 常量、日志不印旧 URL 即算协议保真；离线夹具自称安装态 e2e；删掉会红的协议断言 | 从运行中的 `fetch`/`page.evaluate` **调用参数**采集 URL（不从常量采集），逐条校验原 path；HEAD/MIME/字节逐项比对；WS/SSE/PTY 责任各自给证据强度标注；离线夹具明确标「未启动真实 PTY/容器、不写用户数据」 | 只查日志前缀；用常量代替运行参数；删断言；冒充安装态 e2e |
| `CF1115-T09` | `npm pack --dry-run` 清单顶替实际离仓加载；白名单由本次 pack 输出生成再自比；现场补存档 | 实际临时 tarball 在无邻居源码、无仓根的最小受控 host 中 `import()` 成功并调用一个绑定；期望文件集合是**外部固定字面量**（不从被测产物读）；存档路径必须事先存在，测试不得现场生成 | dry-run 冒充；集合自生成自比；现场补存档 |
| `CF1115-T10` | 只测成功路径；旧 codec 作失败兜底；非法 2xx 被包成 `ok:true`；按 truthiness 判错；用「发过请求」冒充成功 | Q8 判别矩阵 7 类结果逐态 + F14.8 细分状态清单各一夹具：`signal` 已取消与本地 `protocol` 两种都断言 `fetch` = 0；非法 2xx 必须 `protocol` 且 `ok !== true`；合法 `null`/`degraded`/空体成功；响应体只读一次；`httpStatus` 与 `domainCode` 分型；不自动 retry/换 endpoint | 缺任一矩阵态或清单夹具；旧 codec 兜底；2xx 非法结构包成功；取消后仍发请求 |
| `CF1115-T11` | 「只断言 `window.__nanoNotepad` 消失」算收口；假成功/永久排队；用 empty service 顶替真实导入；只跑 9 类状态就宣称 F16.8 全兑现 | 真 `ctx.provide`/惰性发现/撤销 + **真实导入落库**（可回读 id/name 值拷贝）；9 类状态（就绪/缺席/失败/类型拒绝/竞态/过期句柄/替换版本冲突/空内容/Windows sourcePath）逐项；非法类型/额外 meta 写前拒绝；晚 ready 不复活、旧句柄新写前拒绝；**并逐项验证（F16.8）**：包内 fx/导入自调用迁到私有 controller 后**内部 fx 调用链**仍走同一 controller（不回旧 global）、**源不变**（`sourcePath` 不改写入源/同步命令、不授读写原文件权）、成功回执为 `id/name` 值拷贝的**最小回执**（不多暴露 DB/store/corpus/node） | 全局名消失即绿；无真实导入回读；缺任一状态；只跑 9 类清单；内部 fx 回旧 global / 源被改 / 回执多暴露对象 → 判假绿 |
| `CF1115-T12` | 引用存在即当批准；`REVIEW`/自动 false 当批准；两个生成投影互证；默认到首个操作 | 多操作 selector/cases + 未知 dispatch 拒绝；同名异约/跨族标识可区分；未批准字段拒绝；从**真实 factory** 与**离仓产物**验证同源；`contracts` 不捕获 ctx/凭证/DB、不读 repo/DSH_HOME | 引用存在≠批准内容；默认首个；投影互证 |
| `CF1115-T13` | 只换 server helper 保留旧 client；统一外层 status 冒充错误语义统一；残留扫描允许清单自指 | host encode / client decode / UI / 旧 wrapper **四处同时**断言；DNEE 字符串 error、DNMS 嵌套 code、DNN 各 reader 按唯一 codec 分型；旧 wrapper/parser/alias 全仓命中 = 0（搜索根 = 仓根、`..`/deprecated 不算藏身处）；sanctioned writer 仍在 | 只换一侧；零残留允许清单自放行；错误靠 `message` 文本猜 |
| `CF1115-T14` | 占位摘要冒成功；名字/schema 冒语义版本证据；只测 tools/list 不测真实调用；仅看 `structuredContent.id` 就 attach | 广告与 handler 精确对账（缺/多/重名使构造失败且保持未完成）；真实 schema 校验（required/额外字段/类型/integer/界限）；`decodeMcpReply` 先 error/isError 后取值、带 id 的 isError 必失败；attach `wss://` 不降级、完整 URL 不猜/不覆盖 query、未知 protocol 拒绝；**含 §8.5 攻击对照**：wss→ws / 猜 URL / 非法额外字段 / 未知 protocol 各给「攻击时副作用=0 + 合法对照≥1 + handler 入口计数=0」，计数来自真实入口非测试自建 | 过滤既承诺工具；工具失败变普通 domain；仅看 id；wss→ws；缺攻击对照、只 happy-path、或计数器自建 → 判假绿 |
| `CF1115-T15` | 把 DNLS 幂等外推 DNT 单终端；「有 id/收到字节」当成功；失败含 id 当成功；只测 v1 不测 v2；空序列 20 次互比即算一致；P3-05 的「审计 writer 落盘 / 公开 `nanoTerminal` 消费 / 标准协议独立」被漏测仍算绿 | 用**同一通用 McpLane** 消费真实两端；DNLS 并发 create 单飞同 id / DNT 同会话多个不同 id 分别断言；`cols:1`/`rows:513`/`lines:501`/额外字段/`source` 在 DNLS 侧拒绝；失败含 id 判失败；v1 原始字节 / v2 通道帧按精确 protocol + ready 值门控；**规定轨迹**（含断连至多一次、写入净重发 = 0）deterministic × N 每次深相等（不是 N 次互比）；**并逐条观察（P3-05 收口，挂本 ID 不新增门禁）**：① [DNT] 建 sandbox 终端会话后审计 writer **实际落盘记录可回读**（不是 `auditPath` 常量存在 / 日志前缀 / 测试自建计数器），且同一记录无第二写者文件；② `ctx.provide('nanoTerminal',…)` 注册后由另一消费者 `ctx.get('nanoTerminal')` 惰性读到并可调用 `openLocal`、未装本包返回 `undefined` 而非空壳；③ SSE `snapshot/seq/missed/heartbeat`、WS 协商/帧、OpenAI SSE、静态资源下载各自按原协议响应，逐条断言响应不被 `JsonOutcome` / 普通 JSON 信封包裹或改写；④ 另含 §8.5 攻击对照（攻击时副作用=0 + 合法对照≥1 + handler 入口计数=0），计数来自真实入口非测试自建 | 取 schema 并集；控制面替 WS/关闭/恢复；空序列互比；断连重发写入；①–④ 任一缺失、只做 happy-path、或以「不是 X」式断言替代 → 判假绿 |
| `CF1115-T16` | 二十工具只数目录/声明；stub 的 `unknown` 字段代替目录；「返回观测」当控制成功；参数并集；测试自建 20 个 stub handler 各把自建计数器 +1 并返写死合法对象，冒充「业务调用计数 ≥ 1」 | 二十工具**逐一**真实 domain fixture：输入/输出 schema/对应业务调用三件套，**业务调用计数 ≥ 1 且计数必须来自被观测的真实领域所有者方法**（`instance-registry`/profile/state/CDP 实际入口的可观测调用），不得是测试自建、由 fixture 自行 +1 的计数器；逐工具同时断言输入按该题二十行表 `additionalProperties:false` 校验（多一字段即失败）、返回 `structuredContent` 等于 `{ok:true,data:T}` 且 T 由真实 owner 产出（不是 fixture 写死的合法对象）、`answerNativeTool` 式「统一摘要 / 空 `properties:{}` schema」不得再作为任何工具的真实实现被调用；测试不得重新实现 20 个 handler 顶替被测产物；两实例隔离、越权、并发 ensure、政策变化、部分观测/真实错误、控制结果未知、非法额外字段、catalog 与 dispatch 同源逐项；`unknown` 不伪 `running`；`PublicProfile/Instance/Snapshot` 不泄露配方/mount/凭证 | 名字数 = 完成数；stub unknown 顶替；stub 返回合法 `{ok:true,data}` 顶替真实 owner；观测当控制成功；取参数并集；计数器自建 / 空 `properties:{}` schema 仍被调用 → 判假绿 |
| `CF1115-T17` | 「删了几行 files」算退役；错误目录只改一侧；别名只删一个；`null` 由权限/网络失败伪造；`denied` 当正常 data；搜索根可缩、残留搬进 `deprecated/` 或 `..` 逃逸仍算零命中；P4-04 的「open-in-app 真服务 / 标准协议独立 / 四只读 RPC 唯一 codec」被漏测仍算绿 | bridge 目录无自造 `sandbox.*`、原 HTTP/CDP 能力未丢；DNK 五类资产 + 双 bridge 载体逐项零命中，**搜索根必须是仓库根**（含 `deprecated/` 与所有顶层，`path.resolve` 后不得越出仓根）、命中规则覆盖 §9.3 五类退役落点（container-engine/nano-kite/Dockerfile/entrypoint/两份 mcp-bridge 载体/旧锁路径/诊断 snapshot 定时器/43·18 条错误目录旧归属）、允许清单只能是事先写死的固定字面量集合（不得从被测代码/环境变量读入或自扩），含 `..`/符号链接/`deprecated/` 的命中一律算失败而非豁免——与 T13/T20 同一套搜索根与允许清单实现；**两组别名分别**验证（`/s3/config` 留 probe 删 testOne；`/rpc` 留 manifest.get 删 lsrag.manifest），旧名明确拒绝；`null` 只表已确认不存在、`denied` 由唯一 codec 识别为失败、读失败单列；**并逐条观察（P4-04 收口）**：① [DNEE] `open-in-app` 资源调用接到真正所属服务（不是常量存在）；② 标准 SSE/WS/OpenAI/下载不改普通 JSON 信封；③ 四只读 RPC（corpus.list/corpus.read/claim.read/manifest.get）按唯一 operation codec 承接 | 把两组别名当一组；旧名仍分派；null/denied/读失败不分；搜索根非仓根/允许清单可自扩/残留落 `deprecated/` 或 `..` 逃逸；①–③ 任一缺失 → 判假绿 |
| `CF1115-T18` | 警告后假成功/永久排队；拿 `clearInterval`/调用次数/idle 路径代替异步结算；复制影子 host DTO | 受控 Promise 验证**结算最终值/可见错误/资源释放**；Provider ON/OFF/isolate、桥身份（carrier+profile+remote session identity）、配置变更/删档令旧 scope 失效、初始化失败撤局部资源、卸载替换竞态逐项；配置 store 唯一权威；**含 §8.5 攻击对照**：跨 profile 身份复用 / 配置失效后旧 scope 仍可写 各给「攻击时副作用=0 + 合法对照≥1 + handler 入口计数=0」，计数来自真实入口非测试自建 | timer/disposer/次数替代；空方法冒充支持；第二 canonical；`catch+warn` 后仍返回成功 / 警告后假成功 / 永久排队；缺攻击对照或计数器自建 → 判假绿（§8.1 层标注同步含 `安全`） |
| `CF1115-T19` | 凭 `enter` 函数存在/超前 context 源码判支持；catch+warn 后仍返回成功；把四码混成一个；上游 403 改 404；A 不可用却冒记原完整能力通过 | 义务表 **8 项逐项**（身份与准入/历史与消息/发送完成/steer·cancel/whenIdle·状态/恢复与 canonical/卸载·配置失效/失败呈现）；四 `NATIVE_*`（503/422/500/502）分型、503 + 可见原因 + 无伪 localId；POST 确认才显示送达、不先写完成 turn 再发、不自动重发未知写入；同 remote 异 profile、分页重建/重复消息、非 text、取消/idle 真实时序、初始化失败、卸载在途 barrier；DNMSC 真实 Service 解析（无法解析即激活失败）、ON/OFF/四 preset/isolate、已准 instanceof 降级、`FallbackService` 零命中；**含 §8.5 攻击对照**：跨 profile 身份复用 / 未鉴权 native_open / 非法凭证面 各给「攻击时副作用=0 + 合法对照≥1 + handler 入口计数=0」，计数来自真实入口非测试自建 | 空方法冒充；四码混一；上游误判；收窄冒记原能力通过；`catch+warn` 后仍返回成功 / 警告后假成功 / 永久排队；缺攻击对照或计数器自建 → 判假绿 |
| `CF1115-T20` | 按路由/声明数量销账；只列编号不打证据；未实施项静默塞进已完成；自动 defer；另造替代账单；允许清单可自扩 | 八包逐包「全部适用边界覆盖」证据（含 host-only/零 HTTP/native）；**36+4 按原观察号**逐项给覆盖/证据/旧源/离仓产物四项；搜索根 = 仓根、允许清单为固定字面量集合、`..`/deprecated 不算豁免；五类退役落点（代码/注释/头注/行号锚/文档句）逐项零命中；未接通/未验证/需延期保持未完成 | 数量减债；编号无证据；清单自指；静默缩范围；自动 defer |
| `CF1115-T21` | 把 `deferred/未观察` 写成 `verified`；文档状态写成 `executed`；宣布收口即债务清零 | 每一收口目标按五态如实归类（状态从 §10.2 收口映射表读取，不得另造第二份 durable 状态账本文件——`单一真源`）；未实施/未验证债务按原 `E1115-*` 号保留（可回读原号）；断言：**在任一退出硬闸仍为 `degraded/未观察/partial` 时**文档状态必须是 `draft/executing` 且 ≠ `executed`；仅当 §10.1 五项硬闸全部 `verified` 且 [业主] 另立授权后，才允许由 [业主] 标注 `executed`，本测试不得自行改写该状态字段；任一退出硬闸 `degraded/未观察` 即失败；不出现「已过/清零/自动 defer」结论 | 状态升格；硬闸未全 verified 就标 executed；债务清零/自动 defer；另造第二份状态账本文件 |

---

## 9. 风险、依赖与完成后状态

### 9.1 风险与依赖

| 风险 / 依赖 | 描述 | 当前判断 | 应对方式 |
|-------------|------|----------|----------|
| 授权缺口 | [真相层] `NOT IMPLEMENTATION GRANT`；动工/销账被 P6 阻塞 | `high` | 本 AP 保持 `draft`；由 [业主] 另立 `ImplementationGrant`；不借本 AP 冒充授权 |
| 多真源回潮 | 第二套 guard / 消费者私改副本 / 两个生成投影互证 / 派生视图被手改 | `high` | F7.5/F11.3/F13.3/F17.5；T02/T04/T12 封口断言 |
| 假绿（声明=完成） | 20 工具名 / schema 生成 / 诊断摘要 / unknown→running 被当业务接通 | `high` | §8.5/§8.6 逐 Test-ID 侦测；F8.2/F10.3/F21.8 |
| 快照 / 行号漂移 | `f7199f9` 不可达、本机 HEAD `653b15b`；85/118/47/48/43 时点口径 | `medium` | §7.0 路径+符号名复验；不作分母/阈值；不回改测量层 |
| 阶段被当成全仓总闸 | P0–P4 被误读为串行发布门禁 / 反复全仓验收 | `medium` | F19.1/F8.4/F19.6；§1.4 并行边、§8.3 不新增 gate |
| 实施期新公共改约 | 新错误/retry/lane/凭证/支持面冲突 | `medium` | §2.3 `defer` 行；走 `AGENTS.md:40` [业主] 变更登记，不开第 7 轮 |
| 真实 PTY/容器/远端/native 证据 | 需安装版 / 引擎区间 / 受控 host / 远端动作 | `high` | §8.4 缺口交 `ImplementationGrant`；离线夹具不冒充安装态 e2e（F13.4/F19.6） |
| 上游已冻法律冲突 | DNLS01/DNMS01 硬切/scope/R-16/闭集错误码 | `low` | §6 只消费/引用承接，不改上游正文（truth §4.3） |
| 债务清零误读 | 「已冻/已收口」被读成代码已改/测试已过 | `high` | AF-5/B-10/F22.8；§10.4 五态如实归类 |

### 9.2 约束与前提

- **技术前提**：`packages/dsh-interface` 为纯 ESM 构建期私有库、`contracts` 无 I/O、`build` 仅 Node 构建期；各包 `file:../packages/dsh-interface` devDep + 源码依赖闭包锁定；`node --test` / `npm test` / `node scripts/check-*.mjs` 可用。
- **运行时前提**：本 AP 为 `draft`，**不安装、不重启现用 profile、不访问云端业务 API、不修改运行时状态**；真实装配用最小受控 host / 临时 tarball / 可注入 seam；`dsh --version` 落 `engines.dsh` 内的核验留待 `ImplementationGrant`。
- **组织协作前提**：新公共改约、defer、支持面变更、版本 bump/tag/release 只由 [业主] 决定并 durable 登记（`AGENTS.md:40`/F8.8/F19.8/P6）；worktree 只用 `.agents/worktrees` 语义命名、合并后按 [业主] 要求删除（`AGENTS.md:40-43`）。
- **上线 / 合并前提**：本 AP 不含任何上线动作；不新增 release-gate、不发布未经 [业主] 允许的门禁（`AGENTS.md:39`）；冲突时以冻结 QNA truth 为准。

### 9.3 文档同步要求

- 需要同步更新的设计文档：`contract-and-facade-1115-qna-truth.md`（仅当 QNA append-only supersession 后投影修订；本 AP 不改）、`contract-and-facade-1115-eval.md`（形成史测量不回改）。
- 需要同步更新的说明文档 / README：各包 `AGENTS.md` 交付物表、根 `AGENTS.md`（仅当 [业主] 新登记）、维护文档 / 升级说明（F22.8 公开 breaking 变化）、`security/route-inventory.md`（标回溯、不作分母）。
- 需要同步更新的测试说明：§8.2 复用台账、`packages/dsh-interface/test/` 新增用例说明、三项 `check-*.mjs` 的维度说明。
- 涉及面退役时，退役清单必须覆盖**代码、注释、头注、行号锚、文档句**五类落点：`window.__nanoNotepad` 及别名/转发、`/s3/config` `testOne`、`/rpc` `lsrag.manifest`、DNT 私改 `spec.kind ??` 与本地 route table、bridge 十五 `sandbox.*` 自造广告、容器时代五类资产、`FallbackService`/`HOST_SERVICE_SOURCE`、旧 wrapper/parser/alias、过期 35 条分母句（标回溯）、行号锚中 `f7199f9` 的定位说明（§7.0）。

### 9.4 完成后的预期状态

> 以下为「另立 `ImplementationGrant` 并实际实施收口后」的目标态，不是本 AP 当前状态。

1. 全部 8 个活跃插件的 contract 与 facade 由 `packages/dsh-interface` 单一作者源派生；每包离仓自包含产物可独立加载，领域/host canonical 仍在原所有者。
2. P0–P4 逐合同族闭环完成：生产者与真实消费者成对硬切、旧作者源/副本/别名/说明一次性退役、无兼容第四阶段、无双写。
3. §8 测试台账逐项 PASS 且四元组齐全；安全项含攻击向量负例；三项既有检查扩维后范围不缩、断言不减；无新增 release-gate。
4. 36 项逐包 + 4 项横向 `E1115-*` 观察按原号逐项结算，八包覆盖证据齐备，未实施债务按原号 handoff、不清零。
5. 文档状态按五态如实归类；`executed` 仅在全部退出硬闸 `verified` 后由 [业主] 授权标注。

---

## 10. 收口（Definition of Done = 测试台账全 PASS 映射）

> 收口 = §8 测试台账逐项 PASS，且每项映射回 §3 工作项的收口目标。**本 AP 为 `draft`：以下硬闸当前全部 `未观察`，不得标 `executed`。** 收口是 per-合同族闭环纪律（F8.4/F8.7），不是新增全仓发布总闸（F19.1）。

### 10.1 收口硬闸

所有 `mega + soak + 退出层` 测试项必须 **PASS 且四元组证据齐全**（执行期；当前 `未观察`）：

1. `CF1115-T20`（逐观察号全账结算）PASS：八包 + 36+4 观察逐项有证据、旧源/离仓产物对账、五类退役零残留。
2. `CF1115-T15` / `CF1115-T18` / `CF1115-T19`（soak：terminal 断连/幂等、host 异步结算、native 义务/barrier）PASS：规定轨迹每次深相等、最终值/可见错误/资源可验。
3. `CF1115-T21`（退出层五态）PASS：无 `degraded/未观察` 被写成 `verified`、文档状态 ≠ `executed` 的诚实收口成立。

> 任一硬闸 `degraded / 未观察` ⇒ 不得标 `executed`（§10.4）。`mega/soak` 是分层证据类型（§8.3），不是全仓发布门禁。

### 10.2 收口映射表（收口目标 ↔ Test-ID ↔ 证据）

| 收口目标 | 工作项 | Test-ID | PASS 证据（四元组，执行期回填）| 状态 |
|----------|--------|---------|---------------------|------|
| 三出口基座纯净 + 唯一 guard + 幂等再生成 + 离仓自包含 | P1-01/P1-02 | `CF1115-T01/T02/T03` | `commit + {test} PASS + pack双向集合 + run-time` | `未观察` |
| 公共注册门面真实装配 + fail-closed + 双维视图 + 验证层/退役 | P1-03/P1-05 | `CF1115-T04/T05/T06/T07` | `commit + {test} PASS + 负例日志 + run-time` | `未观察` |
| DNN/DNT 首批协议保真 + 离仓加载 | P1-04 | `CF1115-T08/T09` | `commit + {test} PASS + 实际tarball加载 + run-time` | `未观察` |
| JSON（Q8 判别矩阵 7 类 + F14.8 清单）/ 最小导入 / 作者记录 / 基础 JSON 成对硬切 | P2-01..P2-04 | `CF1115-T10/T11/T12/T13` | `commit + {test} PASS + 零残留扫描 + run-time` | `未观察` |
| MCP / terminal / sandbox / DNK·DNT 真实互操作 | P3-01..P3-05 | `CF1115-T14/T15/T16/T17` | `commit + {test} PASS + soak log + run-time` | `未观察` |
| host 适配 / native 边界 / DNMSC 例外 / DNN 标准流别名 | P4-01..P4-04 | `CF1115-T16/T17/T18/T19` | `commit + {test} PASS + 8义务/四码 + run-time` | `未观察` |
| 八包 + 36+4 观察结算 + 五类退役 + 五态 handoff | P5-01..P5-03 | `CF1115-T20/T21` | `commit + 40观察号逐项证据 + run-time` | `未观察` |
| 安装态 e2e / 真实 PTY·容器 / 远端 carrier / engines 区间 | —（§8.4 缺口） | — | 交另立 `ImplementationGrant` | `deferred` |

### 10.3 Definition of Done

| 维度 | 完成定义 |
|------|----------|
| 功能 | 22 条 `T-O` + 126 条 F 条款 + 原题矩阵/签名/表逐项落到代码/产物/派生视图；生产者—消费者成对硬切、旧面一次性退役 |
| 测试 | §8 **全部 21 个** Test-ID PASS，且**每一个**标成 PASS 的 Test-ID 都在 §10.2 填上四元组 `commit + 具体命令/测试名 + 结果(exit 0 / PASS) + run-time(UTC)`；缺任何一格，该行保持 `未观察`。退出硬闸 `T15/T18/T19/T20/T21` 是四元组义务的**额外复核点，不是例外清单**；§8.6 逐 Test-ID 防假绿侦测全部封口（含 §8.5 四类跨-ID 规则的逐-ID 落地表）；无删断言/缩 scope/新增 gate |
| 文档 | §9.3 五类退役落点零残留；派生视图同源可再生成；维护/升级说明同步；本 AP 不修改冻结真相 |
| 风险收敛 | 授权缺口由另立 `ImplementationGrant` 闭合；多真源/假绿/漂移/总闸误读按 §9.1 逐项收敛；新公共改约走 [业主] 登记 |
| 可交付性 | 每包离仓自包含产物可独立加载；债务按原 `E1115-*` 号 handoff；文档状态按五态如实，不 overclaim |

### 10.4 NOT-成功识别

> 任一退出硬闸测试 `degraded / 未观察` ⇒ **不得标 `executed`**；按 closure 五态（`verified / observed-OK-at-closure / partial / 未观察 / deferred`）如实归类 + handoff，不 silent overclaim。

- 本 AP 当前状态 `draft`：**21 个 Test-ID 全部 `未观察`**，§8.4 缺口 `deferred`；0 项 `verified`。因此**不得**把本文或任何下游标为 `executed` / `已实施` / `测试已过` / `债务清零` / `自动 defer`（AF-5 / B-10 / F22.8）。
- 收口 ≠ 实施完成：[真相层] `FROZEN` 只表示决策冻结；P6「阻塞实现的动工与销账」。未构建/未安装/未部署/未提交均如实登记。
- 若实施中出现真正公共改约，按 `AGENTS.md:40` 正常 [业主] 变更登记，不预排第 7 轮、不把未知实现结果伪装成已批准真相（F19.8/F22.8/QNA §6.8.4）。

---

> **§11 执行日志回填：按模板省略** —— 本 AP 文档状态为 `draft`（非 `executed`），模板规定「文档状态非 `executed` 时本节省略」。执行完成后如需回填，改用 append 模板 `respond-execution-log`，residual 交后继 charter，不回填本阶段。

---

## 修订

| 版本 | 日期 | 变更 |
|------|------|------|
| `0.1.0` | 2026-11-15 | 首版：按 `.adocs/templates/action-plan.md` 组织，消费 `CF1115-TRUTH` v0.1.1 / QNA v0.12 / eval；5 Phase（=冻结 P0–P4）、21 工作项、21 Test-ID、§8.6 逐 Test-ID 防假绿侦测、§7 内置锚区 + 威胁模型；`draft` 状态、CITE-only、非 implementation grant。 |
| `0.1.1` | 2026-11-15 | 收口/防假绿对抗审查（`.anote/reviews/contract-and-facade/1115/na/7419/exit-and-antigreen.md`，总判「有条件通过」0 blocker / 4 major / 4 minor）后加严，**全部只加严、不改宽、不新增门禁/不反复全仓、不另造第二真源**：§8.5 安全攻击对照补「逐-ID 落地」硬约束；§8.6 增「§8.5 四类跨-ID 规则逐-ID 落地表」；T15 补 P3-05 审计 writer 落盘/公开 `nanoTerminal` 消费/标准协议独立/攻击对照，T17 补 P4-04 open-in-app 真服务/标准协议/四只读 RPC + 搜索根=仓根 + 固定字面量允许清单 + `..`·软链·`deprecated` 逃逸拒绝；T14/T18/T19 补攻击对照；T16 禁测试自建计数器 / stub 返回合法对象顶替真实 owner；T11 补 F16.8 内部 fx/源不变/最小回执；T07 快照须事先固定外部字面量、不得现场重生成；T21 `≠ executed` 改为「硬闸未全 verified 前」条件式 + 不另造状态账本；§10.3 四元组澄清为「每个 PASS 都填四元组，硬闸是额外复核点非例外清单」。审查判为过度要求（不修）：补安装态 e2e / 真实 PTY·容器 / 照搬 DNLS01 20/20 全仓基线、新增第四道 gate、反复全仓、给私有函数造仪式、另造状态账本文件。 |
| `0.1.2` | 2026-11-15 | QNA 真相合规对抗审查（`.anote/reviews/contract-and-facade/1115/na/7419/qna-compliance.md`，总判「有条件通过」0 blocker / 0 major / 4 minor / 2 nit，`T-O-CF1115-1..-22` 判决 22 符合 / 0 偏离 / 0 漏项）后修订，**仍全部只加严、不改任何合同**：M1 删自造计数「八态」，6 处统一为「Q8 原题判别矩阵（truth:294-302，7 类结果）+ F14.8 细分状态夹具清单」（§3/§4.2/§5.2/§8.1 T10/§8.6 T10/§10.2）；M2 §6 Q12 行「不足以 `-22` 定案」改为「已由 `-22`（Q16）定案、本 AP 不重开、不预设第 7 轮」（消除疑似改口）；M3 增 header「词汇锚定约定」并把主要散文段的裸缩写/裸「真相层」锚定为 `[]`（代码块/`file:line`/包名/观察号/Test-ID 依审查「判不修」保持裸写）；M4 `dnt-mcp.openrpc.json` 锚由 `:18-42` 补为 `:8-12`（十三 errorKinds）·`:17`（`x-address`）·`:18-42`（create）三段（§3 P3-02/§4.3 P3-02/§5.3/§7.1 A-11）；N1 §1.4 回滚参照改引 `DNLS01 T-O-18:65` ③ 内的 `T-O-10` 缓解手段 + 该行末尾「② 前完成台账对齐」时序护栏（不再误标「③ 时序护栏」）；N2 §7.3 威胁模型锚把 `:115` 重归类为「fetch-mp 30x 重定向 finding（O5 out-of-scope，仅旁证）」，`:131/:263` 才是「较低信任主体」。审查「判不修」6 条（改写 `f7199f9`、代码块加 `[]`、逐字复刻 FamilyDefinition、为 P4-04 另设 Test-ID、把复用起跑线 PASS 判 overclaim、`AGENTS.md:39/:40` 单-line 号漂移）一律不采纳。 |
