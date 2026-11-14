# DNMS01 行动计划 · async-compaction 接管（一仓两包 overlay 硬切）

> 服务业务簇: `dsh-nano-model-selector` / `[DNMS]`
> 计划对象: `DNMS01` async-compaction（overlay ON/OFF 互斥接管 [dsh] 压缩真源 + 设置按钮）
> 类型: `new`
> 作者: `DNMS01 架构 agent（lead）`
> 时间: `2026-11-14`
> 文件位置: `docs/specs/dsh-nano-model-selector/plan/DNMS01-async-compaction-takeover.md`
> 上游前序 / closure:
> - [`qna/DNMS01-qna.md`](../qna/DNMS01-qna.md) v0.7.0 `已冻结`（2026-11-14）：§1 `T-O-DNMS01-1`–`-22` 是本计划唯一 CITE 源；§11 收口已签署、不设 Round 6
> - [`qna/DNMS01-qna-truth.md`](../qna/DNMS01-qna-truth.md) `FROZEN`：本计划的**引用面**；任何不一致回 QNA（provenance 优先，台账次位）
> 下游交接:
> - 《DNMS01 action-todo》（按本 AP 1:1 派生、承接 checkbox 执行）；`ImplementationGrant` 另立、不由本 AP 承担
> 关联设计 / 调研文档:
> - [`async-compaction.md`](../async-compaction.md)（规格草案；**已被 `T-O-DNMS01-1..22` 全面 supersede**，仅作形成史与 `file:line` 证据索引；冲突一律以 QNA 为准）
> 冻结决策来源:
> - [`qna/DNMS01-qna.md`](../qna/DNMS01-qna.md) §1（只读引用；本计划不开 Q/A、不改已冻结行）
> grounding 来源:
> - 设计稿 `async-compaction.md`（§2 事实基线已冻结核查）+ 本计划 §7 内置锚区；**无独立 eval-reference-anchor，§7 就是本 AP 的 grounding 真源**
> 关联 reference-anchor:
> - `见 §7 内置锚区 | 无独立文件`
> 对抗审查（已回写，未改 QNA）:
> - `.anote/reviews/dsh-nano-model-selector/DNMS01/na/4441/qna-compliance.md`
> - `.anote/reviews/dsh-nano-model-selector/DNMS01/na/4441/exit-and-antigreen.md`
> 文档状态: `reviewed`

---

## 0. 执行背景与目标

[业主] 已冻结 `DNMS01` 全部执行层真相：`T-O-DNMS01-1`–`-9` baseline（范围/真源分层/seam/现状/治理/反例/事实基线/双态语义），`T-O-DNMS01-10`–`-22` executional（互斥开关、两态 canonical、full 单 Provider、专用 bundle、策略契约、Provider 契约、交付、运行期、观测、UI、观测派生、收口）。QNA 只钉真相、没有改一行代码。本计划把 22 条 `T-O` 落成可执行的**一仓两包**交付顺序、file:line 落点、DAG 与可证伪的 L0–L5 测试。

三条必须在动手前钉死、否则全计划根基会塌的承重线：
1. **实现前置 9 项 `P0-EMPIRICAL`**（`T-O-DNMS01-8`/`-16`/`-22`）——先做，未过**回 QNA 追加修订**，不得降级、不得绕；
2. **双态 canonical**（`-11`/`-12`/`-14`）——`async-compact.json` 是策略唯一可写权威、profile `dsh.profile.bundles` 成员资格是开关唯一可写权威，两态各一份、互不重叠；
3. **`check-clean-lib` 与裸 specifier 红线的消解**——P0-01 必须实锤「profile 安装的包**能不能** `import '@deepseek-ai/dsh-compaction'`」，否则 `-16` 的 Provider 子类在运行期即死在裸 specifier 上；若可 import，需把 `dsh-nano-model-selector-compaction` 纳入门禁白名单（门禁守卫的是「runtime 无法解析」，不是「禁止厂商包」，两者不同，见 §7.2 ⛔3）。

- **服务业务簇**：`[DNMS]`（主包 `dsh-nano-model-selector` + 新包 `dsh-nano-model-selector-compaction`）
- **计划对象**：`DNMS01-async-compaction-takeover`
- **本次计划解决的问题**：
  - [dsh] 当前由出厂 `dsh-compaction-basic` 承担**唯一**压缩 backend（`thresholdRatio 0.8`/`retainRatio 0.16`/`auto` 三监听），无水位 B/H/S/pinned 概念、无独立后台压缩调度、无 per-session 指定摘要模型的设置面
  - [DNMS] 已是「遮蔽式 overlay」实证（出厂 `ui-model-selection` 仍在，本包靠座位遮蔽接管模型选择）——本计划把同一 overlay 范式扩展到 compaction lane
  - [业主] 的「启用/关闭」已澄清为 **overlay ON/OFF 热插拔**：ON → 我方 Provider 接管全部压缩 lane；OFF → `compaction-basic` 回 active、原生配置全部回来
- **本次计划的直接产出**：
  - 新 Host-only bundle 包 `dsh-nano-model-selector-compaction`（`version 0.1.0`）+ 主包 `dsh-nano-model-selector` 升 `0.3.0`
  - `lib/compact-policy.js`（纯函数）/ Provider 入口 + `lib/compact-scheduler.js` / `lib/host-compaction.js` / `cordis.patch.yml`（互斥 patch）
  - 2 条 Host 路由（`GET/PUT /nano-model-selector/async-compact`、`POST /nano-model-selector/async-compact/switch`）+ rail 第 4 按钮 + `filter='compact'` 面板
  - 9 项 `P0-EMPIRICAL` 的 `T-R[HEAD-实测]` 结果 + L0–L5 全绿证据
- **本计划不重新讨论的设计结论**：
  - overlay 互斥开关语义（ON 接管 / OFF 回退原生；「不兼容」指合同面）——`-6`/`-9`/`-10`
  - ON/OFF canonical 与写者（`bundles` 成员资格 + `set_bundle→selectBundle`；`async-compact.json` 无 `enabled`）——`-12`/`-14` + AMEND-1/3
  - full 为单 Provider 内部模式 + micro 严格零改动——`-13`
  - 7 字段 schema / 数值 / reject 律 / 错误闭集 / 五处对齐——`-15`
  - Provider 按协议重实现（不子类化 `BasicCompactionEngine`、不 import 未 re-export、六失败码、no-cap）——`-16`
  - 运行期真 async（跨 turn + 下一请求 adoption + ephemeral intent）与失败分型——`-18`
  - L0–L5 验收 + 观测面闭集 + 不新设 release-gate——`-19`
  - UI 四态/18 key/条件清理/第 2 条路由——`-20`
  - `sessionProjections` + 5s memo + 客户端零轮询——`-21`
  - 22 条判据 / 9 项 T-R / deferral 表 / banner——`-22`

---

## 1. 执行综述

### 1.1 总体执行方式

**「先验后建、先底层后上层、先两包后代码、先组合后调度」**：Phase 0 先做 9 项 `P0-EMPIRICAL` 钉死所有实现前置（未过即回 QNA）→ Phase 1 一次性搭好**一仓两包**骨架与 worktree（ `-17` 的交付形态先行，保证后续所有代码落在正确包里）→ Phase 2 纯函数策略引擎（零宿主依赖、可 `node --test`）→ Phase 3 主包路由与契约（`-15`/`AMEND-1`/`-20`⑦）→ Phase 4 compaction 包（`-14`/`-16` Provider + `-10` 互斥 patch + `-13` 三监听/micro 消费 + `-18` 调度/失败分型）→ Phase 5 主包 UI（`-20`）→ Phase 6 观测派生（`-21`）→ Phase 7 L4–L5 收口与文档同步。任何 Phase 内若 P0 前提不成立，对应 AP 段阻塞登记、回 QNA；**不静默降级、不双轨、不留兼容层**。

### 1.2 Phase 总览

| Phase | 名称 | 规模 | 目标摘要 | 依赖前序 |
|------|------|------|----------|----------|
| Phase 0 | `P0-EMPIRICAL`（实现前置实测） | M | 9 项 HEAD 实测 → `T-R[HEAD-实测]`；任一 FAIL → 对应 AP 阻塞 | `-` |
| Phase 1 | 交付形态与 worktree | S | worktree + 一仓两包骨架（manifest/exports/files/cordis.patch.yml 占位）+ 根 AGENTS/RELEASE/README 登记 | P0-01..P0-09 PASS |
| Phase 2 | 策略引擎（纯函数） | M | `lib/compact-policy.js` + `node --test`；7 字段 schema / master 序 / DC / effectivePin / 原子写 | Phase 1 |
| Phase 3 | 主包路由与契约层 | M | `GET/PUT …/async-compact` + `POST …/switch` + 五处对齐（route-sensitivity/feature-contract/route-scan/build/package.json） | Phase 2 |
| Phase 4 | compaction 包：Provider + 调度 + 互斥 patch | XL | `lib/compact-policy.js`（共享）/`compact-scheduler.js`/`host-compaction.js`/`cordis.patch.yml`/`index.js`；`-10`/`-13`/`-16`/`-18` | Phase 3 |
| Phase 5 | 主包 UI：rail 第 4 按钮 + `filter='compact'` 面板 | M | `ModelSelector.jsx`/`compact.js`/`i18n.js`/`icons.jsx`/4 处条件清理；U1–U4；switch 四态结果渲染 | Phase 3（可并行 Phase 4） |
| Phase 6 | 观测派生与读面 | S | `sessionProjections` 注册（含条件退化路径）+ 5s memo + `runtime.{fill,lastCompaction,degraded}` | Phase 4 |
| Phase 7 | 收口：L4–L5 + 文档同步 + deferral | M | L4 持久化/L5 门禁/L3 行为验收；AGENTS 合同节/真实化 README/RELEASE 行；banner + deferral 表 | Phase 4..6 |

> 规模只帮助阅读，不是开工闸。Phase 0 是**真相前置**、不是「可选调研」；Phase 1..7 的顺序锁死「骨架 → 引擎 → 契约 → Provider → UI → 观测 → 收口」。

### 1.3 Phase 说明

1. **Phase 0 — `P0-EMPIRICAL`**
   - **核心目标**：把「profile-installed bundle 能否 import 出厂包、isolate realm、互补 disabled、原子重组合、rc.2≡rc.3、pluginManager 授权、HMR、竞态、preset 覆盖」9 个未知钉成 `T-R[HEAD-实测]`。
   - **为什么先做**：`-8`/`-16`/`-22` 都写明「未过回 QNA 追加修订而非降级」；Phase 4 的 Provider 与 Phase 1 的包结构都押在 P0-01/S0.1 的答案上。
2. **Phase 1 — 交付形态与 worktree**
   - **核心目标**：`.agents/worktrees/dnms01-async-compaction` + `dsh-nano-model-selector-compaction/` 包目录（`package.json`/`index.js`/`AGENTS.md`/`cordis.patch.yml`/`lib/` 占位）；主包 `package.json` `version 0.3.0`、files/exports 增加 `lib/compact-policy.js`。
   - **为什么放在这里**：`-17` 一仓两包是后续一切代码的落点约束；先把容器搭出来，Phase 4 的所有 lib 才不会放错包。
3. **Phase 2 — 策略引擎（纯函数）**
   - **核心目标**：`-15` 冻结的 7 字段 schema、master 序、DC-1/2/3、`effectivePin`、原子写（tmp+rename）、fail-closed、未知 schema 拒绝，全部收敛为**无宿主依赖的纯函数模块** + `node --test`。
   - **为什么放在这里**：`compact-policy.js` 同时被主包路由（Phase 3）与 compaction 包 Provider（Phase 4）消费，必须先冻结成可单测的公共件。
4. **Phase 3 — 主包路由与契约层**
   - **核心目标**：`GET/PUT /nano-model-selector/async-compact`（L3/16384/sessionBinding:false/错误闭集）+ `POST /nano-model-selector/async-compact/switch`（≤1024）；`-15` 五处一次性对齐（route-sensitivity 行 / feature-contract `responseShape` 行 / `route-scan.mjs` 扩展 / `npm run build` 重烤 / package.json files+exports）。
   - **为什么放在这里**：UI（Phase 5）与 Phase 7 验收都依赖路由已存在；且路由的 400/200 契约须先冻结（`-15` 错误闭集）。
5. **Phase 4 — compaction 包：Provider + 调度 + 互斥 patch**
   - **核心目标**：`-16` 冻结的「按协议重实现三方法 + 六失败码 + no-cap + 三监听 + prune 消费」+ `-10` 互斥 patch（成对翻转 base 扁平行 + 4 preset group）+ `-18` 真 async 调度（ephemeral intent / `runMaintenance` / one-active / 按入口分型 / safety-only degraded / overflow=1）。
   - **为什么放在这里**：`-16`/`-18` 是要求③「完整接管」的机制主体；没有它，Phase 3 的路由只是空契约。
6. **Phase 5 — 主包 UI**
   - **核心目标**：`-20` rail 第 4 图标（插 `nms-rail-sep` 之前）+ `filter='compact'` 四态（U1 未安装 / U2 未启用 / U3 已启用 / U4 degraded）+ 切换确认与四分类结果渲染 + 18 key i18n + 4 处 `filter !== 'media'` 清理。
   - **为什么放在这里**：依赖 Phase 3 路由；可与 Phase 4 并行，但 Phase 7 的 L3 验收需要它真实出现在页面里。
7. **Phase 6 — 观测派生与读面**
   - **核心目标**：`-21` `runtime.lastCompaction` 用 `ctx.sessionProjections` 派生（`stateVersion:1`；P0-10 若不成立走 per-session Map fallback）、`runtime.fill` 5s memo、`runtime.degraded` 四值闭集。
   - **为什么放在这里**：只读面，依赖 Phase 4 的 Provider 已在跑真实 compaction 事件。
8. **Phase 7 — 收口：L4–L5 + 文档同步 + deferral**
   - **核心目标**：`-19` 的 L0–L5 全绿 + `-17`/`-19` 三处文档同步（`AGENTS.md` 合同节 / 真实化 README / `RELEASE.md` 行）+ `-22` 的 `async-compaction.md` supersession banner + deferral 表 + `npm pack --dry-run` 两包 + `git diff --check`。
   - **为什么放在这里**：收口项必须在全部 Phase 完成后登记；banner 与 deferral 是 `-22` 的硬交付。

### 1.4 执行策略说明

- **执行顺序原则**：Phase 0 所有 `T-R` 必须先有证据再开 Phase 1；Phase 1 的包骨架先于一切 `lib/`；Phase 4 的实现**禁止**早于 Phase 0 完成；Phase 7 的 L4–L5 必须等全部代码落完。
- **风险控制原则**：任何「不确定能不能做」的机制（bare import、isolate realm、sessionProjections、pluginManager 授权、HMR、preset 覆盖）一律先在 Phase 0 实测钉死；P0 不过**回 QNA**，不在本 AP 内另写降级分支。
- **测试推进原则**：短途 `node --test` + `route-guard`/`check-*` 每改一组就跑；spike 用长会话抓 `compaction/start|summary|end` + `agent/runMaintenance` 时序；mega = Phase 7 L3–L4 长会话/重启；soak 仅针对并发/race（Phase 0 P0-08 若已 PASS 则标记 satisfied）。
- **文档同步原则**：`-19` 的三处（`AGENTS.md`/`README.md`/`RELEASE.md`）与 `-22` 的 banner/deferral 在 Phase 7 同批改，避免「代码已落成但文档仍陈旧」。
- **回滚 / 降级原则**：OFF 本身就是回滚面（`-9`/`AMEND-2`）；Phase 7 开工前 `npm pack --dry-run` 两包留档 + `git diff --check`；切割失败恢复手段 = `set_bundle(<compaction>, false)` 回原生 + 回 Phase 4 修，不是加兼容层。

### 1.5 本次 action-plan 影响结构图

```text
DNMS01-async-compaction-takeover
├── Phase 0: P0-EMPIRICAL（只读实测，不动交付物）
│   ├── ~/.dsh-dev/profiles/web + $DSH_NODE_EXECUTABLE (ELECTRON_RUN_AS_NODE)
│   └── context/deepseek-harness/packages/{compaction,bundle,core,boot}
├── Phase 1: 交付形态与 worktree
│   ├── .agents/worktrees/dnms01-async-compaction  [worktree 原则]
│   ├── dsh-nano-model-selector/package.json (0.3.0 + files/exports)
│   ├── dsh-nano-model-selector-compaction/  [新包: package.json/index.js/AGENTS.md/cordis.patch.yml]
│   └── AGENTS.md + README.md + RELEASE.md [根登记]
├── Phase 2: 策略引擎 (纯函数)
│   ├── dsh-nano-model-selector-compaction/lib/compact-policy.js  [新]
│   └── dsh-nano-model-selector-compaction/test/compact-policy.test.mjs  [新]
├── Phase 3: 主包路由与契约层
│   ├── dsh-nano-model-selector/index.js  [+compact handlers + registerRoutes 行]
│   ├── security/route-sensitivity.json  [+2 rows]
│   ├── security/feature-contract.json  [+2 rows]
│   ├── scripts/route-scan.mjs  [扩展 [DNMS] 扫描器]
│   └── scripts/build-client.mjs 重烤 → lib/route-table.js / lib/route-guard.js
├── Phase 4: compaction 包 (Provider + 调度 + 互斥 patch)
│   ├── dsh-nano-model-selector-compaction/index.js
│   ├── lib/compact-policy.js (shared)
│   ├── lib/compact-scheduler.js  [新]
│   ├── lib/host-compaction.js  [新: CompactionEngine 子类]
│   └── cordis.patch.yml  [成对翻转 patch]
├── Phase 5: 主包 UI
│   ├── src/client/ModelSelector.jsx  [rail #4 + filter='compact' 面板 + 4 处条件清理]
│   ├── src/client/compact.js  [新: fetch/PUT + localStorage 缓存]
│   ├── src/client/i18n.js  [zh/en 各 +18 key]
│   └── src/client/icons.jsx  [+CompactionIcon]
├── Phase 6: 观测派生与读面
│   ├── (compaction 包) sessionProjections 注册 OR per-session Map fallback
│   ├── (主包) GET runtime.{fill,lastCompaction,degraded}
│   └── B-8 O(surface) 预算
└── Phase 7: 收口
    ├── docs/specs/dsh-nano-model-selector/async-compaction.md  [banner]
    ├── docs/specs/dsh-nano-model-selector/README.md  [真实化]
    ├── dsh-nano-model-selector/AGENTS.md  [合同节]
    ├── RELEASE.md  [+2 行发布表 + matrix 项]
    └── .anote/reviews/dsh-nano-model-selector/DNMS01/na/4441/  [对抗审查]
```

---

## 2. 冻结决策 CITE 与 In/Out-Scope

> `-22`③④ 的位置判据：§2.1 放 `T-O` 1:1 CITE 表（不复制正文、不新增冻结语义）；§2.2 放 `T-R[HEAD-实测]` 计划层表格。In/Out-Scope 顺延为 §2.3/§2.4，边界判定为 §2.5。

### 2.1 `T-O` 冻结决策 CITE 总表（`-22`③）

| `T-O-DNMS01` | 冻结核心（引自 QNA §1，不复制正文） | 兑现工作项 |
|--------------|------------------------------------|------------|
| `-1` | 四条要求 + 一个按钮（overlay ON/OFF） | P1/P3/P5/P7 |
| `-2` | 会话 durable 唯一；插件权威只在 ON 态 | P3/P4/P6 |
| `-3` | `ctx.compaction` 同一瞬时单实现 + durable 协议复用 | P4-04/P4-05 |
| `-4` | 无 Host Config；状态文件 + GET/PUT + localStorage 缓存 | P3/P5 |
| `-5` | 七条核心原则 + 扩约须 [业主] durable 登记 | 全程 |
| `-6` | 四原则：硬切原子无重叠、退役合同面、OFF 是回退 | P4/P7 |
| `-7` | [nano-agent] 只作反例 | 全程 |
| `-8` | 事实基线冻结 + §5 D1–D6 由 T-O 覆盖 | P0-01..10 |
| `-9` | ON 接管全部 lane / OFF 回退原生 | P4/P7 |
| `-10` | 组合层互斥 overlay：成对 `disabled` 翻转 | P4-01 |
| `-11` | 两态 canonical + 平台中立 | P2/P3 |
| `-12` | `bundles` 成员资格 = 唯一开关 canonical；`enabled` 移除 | P2/P3/P4 |
| `-13` | full 单 Provider 内部模式；micro 严格零改动（AMEND-2 overflow ON=ours/OFF=native） | P4-03/P4-04/P4-06 |
| `-14` | 专用 bundle + `set_bundle→selectBundle` + 读态三件套（AMEND-3） | P1/P4/P5/P7 |
| `-15` | 7 字段 schema + 数值 + reject + 错误闭集 + 五处对齐 | P2/P3 |
| `-16` | Provider 三方法重实现 + 六码 + no-cap + 三监听 + prune 消费 | P4-04/P4-05/P4-06 |
| `-17` | 一仓两包 + 默认 OFF + 文档同步 | P1/P7 |
| `-18` | 真 async（ephemeral intent/adoption）+ one-active + 按入口分型 + safety-only | P4-03/P4-06 |
| `-19` | 观测面闭集 + L0–L5 + DoD + 不新设 release-gate | P6/P7 |
| `-20` | rail 第 4 图标 + `filter='compact'` + U1–U4 + 18 key + 4 处清理 + `POST …/switch` | P3/P5 |
| `-21` | `sessionProjections` + 5s memo + 零轮询 + partial-degrade（含条件 fallback） | P6 |
| `-22` | 22 条判据 + 9 项 `T-R` + banner + deferral + 不设 Round 6 | P0/P7 |

### 2.2 `T-R[HEAD-实测]` 计划层表格（`-22`④）

> 9 项 `P0-EMPIRICAL` + 1 项附条件（`sessionProjections`），全部在 Phase 0 落成 `T-R[HEAD-实测]`；字段 = `{id, claim, method, evidence(file:line/命令输出), verdict, at}`。**不写进 QNA §1**（`templates/README.md:229`「qna 只产 `T-O`」）；`verdict=FAIL` 项在 §7.3 对应工作项标阻塞、回 QNA append-only 修订。

| T-R ID | claim（待实测断言） | method | verdict | 映射工作项 |
|--------|---------------------|--------|---------|------------|
| `T-R-01` | profile-installed JS bundle 能 `import '@deepseek-ai/dsh-compaction'`（S0.1） | `ELECTRON_RUN_AS_NODE` 最小文件静态/动态 import | `pending` | P0-01 |
| `T-R-02` | `--dump-config` 渲染 5 realm（base 扁平行 + 4 preset group + isolate 标记）（S0.2） | `dsh --profile web --dump-config` 全量 | `pending` | P0-02 |
| `T-R-03` | 互补 `disabled` + 一次 `reload()` 原子切换、无重叠（S0.3） | `set_bundle` + `reload()` + `dump-config` 前后 | `pending` | P0-03 |
| `T-R-04` | isolate realm 内 `ctx.get('toolResultPruner')` 可达（S0.4） | 最小 spike + `dump-config` | `pending` | P0-04 |
| `T-R-05` | 安装版 rc.3 ≡ 检出 rc.2 compaction（S0.5） | `ELECTRON_RUN_AS_NODE` 逐字节 diff | `pending` | P0-05 |
| `T-R-06` | `ctx.remote.pluginManager` 半侧第三方授权可用 | `setBundleEnabled` 半侧 + Host 侧实测 | `pending` | P0-06 |
| `T-R-07` | `dsh-dev` 存在 HMR（`applied` vs `restart-required`） | `set_bundle` 返回值观测 | `pending` | P0-07 |
| `T-R-08` | 并发 dispose/init 竞态零窗口 | 连续 `set_bundle` + fiber 观测 | `pending` | P0-08 |
| `T-R-09` | preset 子行 patch 覆盖率（4 group 可寻址） | 最小 patch + `dump-config` | `pending` | P0-09 |
| `T-R-10`（附条件） | `ctx.sessionProjections` 第三方插件可注册 | 最小插件 `register({stateVersion:1,…})` spike | `pending` | P0-10 |

### 2.3 In-Scope（本次 action-plan 明确要做）

- **[S1]** Phase 0：9 项 `P0-EMPIRICAL` HEAD 实测 → `T-R[HEAD-实测]`，钉死实现前置
- **[S2]** Phase 1：worktree `.agents/worktrees/dnms01-async-compaction` + 一仓两包骨架（`dsh-nano-model-selector` 升 `0.3.0`；新包 `dsh-nano-model-selector-compaction` `0.1.0`）
- **[S3]** Phase 2：`lib/compact-policy.js` 纯函数 + `node --test`（schema/master 序/DC/effectivePin/原子写/fail-closed/未知 schema）
- **[S4]** Phase 3：`GET/PUT /nano-model-selector/async-compact`（L3/16384）+ `POST /nano-model-selector/async-compact/switch`（≤1024）+ 五处对齐（route-sensitivity / feature-contract / route-scan / build / package.json）
- **[S5]** Phase 4：`lib/compact-scheduler.js` + `lib/host-compaction.js`（`CompactionEngine` 子类三方法 + 六失败码 + no-cap + 三监听 + prune 消费 + one-active + ephemeral intent + 按入口分型 + safety-only degraded + overflow=1）+ `cordis.patch.yml`（`-10` 互斥翻转）
- **[S6]** Phase 5：rail 第 4 图标 + `filter='compact'` 面板（U1–U4 / 确认与四分类 / 18 key i18n / 4 处条件清理）
- **[S7]** Phase 6：`sessionProjections` 注册（含 fallback）+ `runtime.fill` 5s memo + `runtime.degraded` 闭集 + 读面 partial-degrade
- **[S8]** Phase 7：`-19` L0–L5 验收 + `-17` 两包交付与默认 OFF + `-19`/`EN`-22 文档同步（AGENTS 合同节 / 真实化 README / RELEASE 行 / banner + deferral）+ `npm pack --dry-run` 两包 + `git diff --check`

### 2.4 Out-of-Scope（本次 action-plan 明确不做）

- **[O1]** 接管 `dsh-compaction-tool-result-pruner`（`-13`/`AMEND-2`：micro 严格零改动、只 `ctx.get('toolResultPruner')?.pruneSession` 消费）
- **[O2]** Host `Config` schema / 原生 Settings 面板（`-11`/`-12`/`AMEND-3`：状态文件 + `bundles` 成员资格，不用 `configEditor`、不改 `disabled`）
- **[O3]** 新增 session event type / 会话状态副本 / `beforeCompact`/`afterCompact`/`registerSummarizer`（`-2`/`-3`/`-16`：durable 协议原样复用、无该扩展点）
- **[O4]** [nano-agent] 代码 import / D1 / Queue / DO / cron 复制 / 跨仓侧载（`-7`/`AGENTS.md` 插件中立）
- **[O5]** `max_tokens`/`max_output_tokens` / `sweet_spot`/`effective_window` 双锚 / `compaction.notify`/新 D1 表 / `nano_context_op_observations`（`-15`/`-16`/`-19`/`D5`/`E1`/`-19`①）
- **[O6]** `dsh.local`（生产）重启 / 安装 / profile 改写（`-17`/`-19`/`B-12`：全部验证只在 `dsh-dev` `--home ~/.dsh-dev`）
- **[O7]** Release bump/tag/发布（`-19`⑤：发布授权归 [业主]，本 AP 不授权）
- **[O8]** `async-compact.json` `enabled` 字段（`-12`/`AMEND-1`：已彻底移除）

### 2.5 边界判定表

| 项目 | 判定 | 理由 | 重评条件 |
|------|------|------|----------|
| 两包交付 (`-17`) | `in-scope` | 冻结交付形态 | [业主] 改判分包 |
| `sessionProjections` 第三方注册 (`-21`) | `defer / depends-on-design` | B-16 未实测；P0-10 是前置 | P0-10 `FAIL` → 走 per-session Map fallback + 附录登记 |
| 浏览器半侧 `ctx.remote.pluginManager.setBundleEnabled` (`-20`③) | `defer / depends-on-design` | 授权 UNVERIFIED | P0-06 `FAIL` → 第 2 条路由 `POST …/switch` 兜底（`-20`⑦） |
| `filter` URL 同步 | `defer` | 现无此机制；附条件待测 | P0 附条件项实测后登记 deferral 表 |
| 两包同 tag 版本断言 | `defer` | 本仓无 git tags | 本仓引入 tag 流程后重评 |
| `dsh-dev` `set_bundle` `applied` vs `restart-required` | `defer` | 附条件待测 | P0 附条件项实测后登记 deferral 表 |
| `enabled` 字段/兼容键/投影回宿主 config | `out-of-scope` | `-12`/`AMEND-1`/`AMEND-3` 已否决 | 无（除非回 QNA） |
| micro (`tool-result-pruner`) 三 Config 值/实例/触发 | `out-of-scope` | `-13`/`AMEND-2` 严格零改动 | 无 |
| `dsh.local` 重启/安装 | `out-of-scope` | `-17`/`-19`/`B-12` | [业主] 另行授权 |
| 版本 bump/tag/release | `out-of-scope` | `-19`⑤ 授权归 [业主] | [业主] 单独授权 |

---

## 3. 业务工作总表

> **硬地板**：每项含 `涉及文件 (file:line)` / `收口目标` / `测试映射` 三元组；Phase 0 每个 `P0-*` 项的 `测试映射` 指向 §8 `P0-T01..T10`；Phase 4 的 `工作内容`（§4.4）拆 a/b/c 有序子步（净新高风险）。安全/信任边界项的 `涉及文件` 指向 §7.3 威胁模型锚。

| 编号 | 所属 Phase | 工作项 | 类型 | 涉及文件（file:line） | 收口目标 | 测试映射（Test-ID） | 风险 |
|------|------------|--------|------|------------------------|----------|----------------------|------|
| P0-01 | Phase 0 | `import` 实测 S0.1 | `spike` | `~/.dsh-dev/profiles/web/` + `$DSH_NODE_EXECUTABLE` | T-R-01 verdict | `P0-T01` | `high` |
| P0-02 | Phase 0 | `dump-config` 5 realm S0.2 | `spike` | `dsh --profile web --dump-config`（`dsh-dev`） | T-R-02 verdict | `P0-T02` | `high` |
| P0-03 | Phase 0 | 互补 `disabled` + 原子重组合 S0.3 | `spike` | `set_bundle` + `reload()` + `dump-config` 前后 | T-R-03 verdict | `P0-T03` | `high` |
| P0-04 | Phase 0 | `ctx.get('toolResultPruner')` realm S0.4 | `spike` | `context/deepseek-harness` 源码 + `dump-config` | T-R-04 verdict | `P0-T04` | `medium` |
| P0-05 | Phase 0 | rc.3 ≡ rc.2 S0.5 | `spike` | `app.asar` 逐字节 vs `context/deepseek-harness` | T-R-05 verdict | `P0-T05` | `medium` |
| P0-06 | Phase 0 | `pluginManager` namespace 授权 | `spike` | `ctx.remote.pluginManager` 半侧 + `ctx.get('pluginManager')` Host 侧 | T-R-06 verdict | `P0-T06` | `high` |
| P0-07 | Phase 0 | HMR 存在性 | `spike` | `set_bundle` 结果 `applied` vs `restart-required` | T-R-07 verdict | `P0-T07` | `high` |
| P0-08 | Phase 0 | 并发 dispose/init 竞态零窗口 | `spike` | 并发 `set_bundle` 序列 + fiber 生命周期 | T-R-08 verdict | `P0-T08` | `medium` |
| P0-09 | Phase 0 | preset 子行 patch 覆盖率 | `spike` | `standard/minimal/ptc/presets` 4 group 子行 | T-R-09 verdict | `P0-T09` | `high` |
| P0-10 | Phase 0 | `ctx.sessionProjections` 第三方注册（附条件） | `spike` | `context/deepseek-harness` + 最小插件 spike | T-R-10 verdict | `P0-T10` | `medium` |
| P1-01 | Phase 1 | worktree + 新包骨架 | `add` | `.agents/worktrees/dnms01-async-compaction`、`dsh-nano-model-selector-compaction/{package.json,index.js,AGENTS.md,cordis.patch.yml}` | 两包文件树就位、`npm pack --dry-run` 结构合法 | `L5-T01` | `low` |
| P1-02 | Phase 1 | 主包 `package.json` 0.3.0 + files/exports | `update` | `dsh-nano-model-selector/package.json:3`（version）、`:11-17`（exports）、`:18-29`（files）、`:30-32`（engines） | `version 0.3.0` + `lib/compact-policy.js` 入 files | `L5-T01` | `low` |
| P1-03 | Phase 1 | 根登记（AGENTS/README/RELEASE） | `update` | `AGENTS.md`、`README.md`、`RELEASE.md` | 插件登记 + 计数 + 发布表行 | `L5-T03` | `low` |
| P2-01 | Phase 2 | `lib/compact-policy.js` 纯函数 | `add` | `dsh-nano-model-selector-compaction/lib/compact-policy.js`（新）、`test/compact-policy.test.mjs` | L0 全绿；schema/master 序/DC/effectivePin/原子写 | `L0-T01..T06` | `medium` |
| P3-01 | Phase 3 | `GET/PUT /nano-model-selector/async-compact` | `add` | `dsh-nano-model-selector/index.js`（+handlers+route 行）、`security/route-sensitivity.json` | GET 200/PUT 200/400 契约 + L3/16384/sessionBinding:false | `L1-T01` | `medium` |
| P3-02 | Phase 3 | `POST /nano-model-selector/async-compact/switch` | `add` | `dsh-nano-model-selector/index.js`、`security/route-sensitivity.json` | POST ≤1024、转发 `setBundleEnabled`、四态回包 | `L1-T02` | `medium` |
| P3-03 | Phase 3 | 五处对齐（route-scan / feature-contract / build / package.json） | `update` | `scripts/route-scan.mjs`、`security/feature-contract.json`、`npm run build`、`package.json` | 3 gate 0 命中 + `responseShape` 行 + files/exports | `L1-T03`、`L5-T02` | `medium` |
| P4-01 | Phase 4 | compaction 包 `index.js`/`cordis.patch.yml` | `add` | `dsh-nano-model-selector-compaction/index.js`、`cordis.patch.yml` | `-10` 互斥翻转 patch + `enabled` 语义 | `L2-T01/T02` | `high` |
| P4-02 | Phase 4 | `lib/compact-policy.js`（共享拷贝） | `add` | `dsh-nano-model-selector-compaction/lib/compact-policy.js` | 与 Phase 2 同模块、被 compaction 包消费 | `L0-T01..T06` | `low` |
| P4-03 | Phase 4 | `lib/compact-scheduler.js`（`-18` 调度） | `add` | `dsh-nano-model-selector-compaction/lib/compact-scheduler.js`（新） | ephemeral intent / `runMaintenance` / one-active / 按入口分型 / safety-only degraded / overflow=1 | `L3-T05..T08`、`L3-T12..T14` | `high` |
| P4-04 | Phase 4 | `lib/host-compaction.js`（`-16` Provider） | `add` | `dsh-nano-model-selector-compaction/lib/host-compaction.js`（新） | `CompactionEngine` 子类三方法 + 六失败码 + no-cap + 三监听 + prune 消费 | `L3-T01..T04`、`L3-T09..T11` | `high` |
| P4-05 | Phase 4 | durable 协议合规校验 | `add` | `compaction/src/{types,checkpoint,tool-pairing}.ts`、`compaction-basic/src/region.ts`（先例） | `compaction/start|summary|end` bracket + `surfaceOp.replace` + `compactCheckpointSource` + `frameSummary` + 未配对 start=busy；raw log 不删 | `L3-T01/T02`、`L3-T22` | `high` |
| P4-06 | Phase 4 | 失败分型与降级（`-18`） | `add` | `dsh-nano-model-selector-compaction/lib/{compact-scheduler,host-compaction}.js` | 按入口分型 + one-active + safety-only + circuit + overflow=1；不新增第七码 | `L3-T12..T14`、`L3-T21` | `high` |
| P5-01 | Phase 5 | `ModelSelector.jsx` rail #4 + `filter='compact'` 面板 | `update` | `src/client/ModelSelector.jsx:693-728,770-813,815-847` | rail 第 4 图标 + U1–U4 + 确认与四分类 | `L3-T17`、`L5-T04` | `medium` |
| P5-02 | Phase 5 | `src/client/compact.js` + `icons.jsx` + `i18n.js` | `add` | `src/client/compact.js`（新）、`icons.jsx`、`i18n.js:40-48,86-94` | fetch/PUT/缓存 + `CompactionIcon` + 18 key | `L3-T17`、`L5-T04` | `low` |
| P5-03 | Phase 5 | 4 处 `filter !== 'media'` 清理 | `update` | `ModelSelector.jsx:815,822,829,847` | `filter !== 'media' && filter !== 'compact'` | `L3-T17` | `low` |
| P6-01 | Phase 6 | `sessionProjections` 注册（或 fallback） | `add` | `dsh-nano-model-selector-compaction/index.js` OR `lib/compact-scheduler.js` | `runtime.lastCompaction` 派生、同引用抑制 | `L3-T15a/T15b`、`L3-T18` | `medium` |
| P6-02 | Phase 6 | `runtime.fill` 5s memo + `runtime.degraded` 闭集 + 读面 partial-degrade + P95 | `add` | `dsh-nano-model-selector/index.js`（GET handler）、`dsh-nano-model-selector-compaction` | `fill`/`degraded`/`lastCompaction` 派生、10 次面板 ≤3 measure、P95<200ms | `L3-T16`、`L3-T18`、`L3-T19` | `medium` |
| P7-01 | Phase 7 | L4 持久化 + L5 门禁 | `update` | `dsh-dev restart`、4 漂移 gate + `node --test`、`npm pack --dry-run`、`git diff --check` | L4/L5 全绿 | `L4-T01..T05`、`L5-T01..T05` | `medium` |
| P7-02 | Phase 7 | `-17` 两包交付 + 默认 OFF + 文档同步 | `update` | `AGENTS.md` 合同节、真实化 `README.md`、`RELEASE.md` 行 | 默认 OFF / 首跑不创建 / 安装卸载序列 / 三文档同步 | `L4-T04`、`L4-T05`、`L5-T03` | `medium` |
| P7-03 | Phase 7 | `-22` banner + deferral 表 | `update` | `async-compaction.md` banner、本 AP §11 deferral | banner 植入 + deferral 逐条登记 | `L5-T05` | `low` |

---

## 4. Phase 业务表格

### 4.1 Phase 0 — `P0-EMPIRICAL`（实现前置实测）

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P0-01 | S0.1 `import` 实测 | a) `ELECTRON_RUN_AS_NODE=1 "$DSH_NODE_EXECUTABLE"` 起一个**临时** `dsh-dev` profile-installed JS bundle 文件；b) 在文件里分别尝试 `import '@deepseek-ai/dsh-compaction'`（静态）与 `await import('@deepseek-ai/dsh-compaction')`（动态）；c) 同时复测 `import '@deepseek-ai/cordis'`；d) 记录 `MODULE_NOT_FOUND` / 成功 / resolve URL | `~/.dsh-dev/profiles/web/node_modules/dsh-nano-model-selector-compaction/`（临时）；`context/deepseek-harness/vendor/loader/src/config/tree.ts:192-198` | 明确「能不能 import、用哪种 specifier、resolve 到哪」 | `P0-T01` | `T-R-01` verdict + `file:line/命令输出` 证据；FAIL → `-16` 阻塞回 QNA |
| P0-02 | S0.2 `dump-config` 5 realm | `dsh --profile web --dump-config`（`dsh-dev` 进程或 CLI）打印合成 entry tree；定位 `compaction-basic`/`command-compact`/`tool-result-pruner`/我方行的**真实 realm**（base 扁平行已被 web-app patch disabled，真 provider 在 4 preset group 内） | `dsh --profile web --dump-config` 输出；`context/deepseek-harness/packages/bundle/{base,web-app}/cordis.patch.yml`、`presets/{standard,minimal,ptc,presets}.patch.yml` | 5 realm 位置 + 行 id + isolate 标记 | `P0-T02` | `T-R-02` verdict；明确 ON/OFF 两态行归属 |
| P0-03 | S0.3 互补 `disabled` + 原子重组合 | 用最小 patch 模拟 `-10`：同 realm 两行互补 `disabled`；`set_bundle` + 一次 `reload()`；断言 ON/OFF 两态 `/compact` 解析到不同 provider；断言切换瞬间**无重叠**（无两个 active `ctx.compaction`） | `~/.dsh-dev/profiles/web/package.json`（`dsh.profile.bundles`）；`--dump-config` 前后 | 原子切换验证 + `disabled: !!js` mount-only 确认 | `P0-T03` | `T-R-03` verdict；FAIL → `-10`/`-14` 阻塞回 QNA |
| P0-04 | S0.4 `ctx.get('toolResultPruner')` realm | 确认我方 Provider 在 `id: compaction` isolate realm 内能否 `ctx.get('toolResultPruner')`（或经 `agentPresets.serviceFor` 桥）拿到 `tool-result-pruner` 服务实例 | `context/deepseek-harness/packages/compaction/compaction-basic/src/index.ts`（消费先例）；`--dump-config` | `ctx.get` 可达性 verdict | `P0-T04` | `T-R-04` verdict；FAIL → `-13`「micro 消费」阻塞 |
| P0-05 | S0.5 rc.3 ≡ rc.2 | `ELECTRON_RUN_AS_NODE=1` 逐字节比对 `app.asar` 内 `@deepseek-ai/dsh-compaction*` 与 `context/deepseek-harness/packages/compaction/*` 的 `lib/` 产物（13 个核心文件） | `/Applications/DeepSeek Harness.app/.../node_modules/@deepseek-ai/dsh-compaction*/lib/` vs `context/deepseek-harness/packages/compaction/*/src/` | rc.3≡rc.2 结论（已初步验证） | `P0-T05` | `T-R-05` verdict；FAIL → 风险登记升级 |
| P0-06 | `pluginManager` namespace 授权 | 实测 `ctx.remote.pluginManager.setBundleEnabled(name, enabled)` 在浏览器半侧**第三方插件**是否可用；若不可用，验证 Host 侧 `ctx.get('pluginManager').setBundleEnabled` 同写者路径 | `ctx.remote.pluginManager`；`ctx.get('pluginManager')`；`context/deepseek-harness/packages/boot/plugin-manager/src/index.ts` | `applied`/`restart-required`/`overridden`/`failed` 四态可达性 | `P0-T06` | `T-R-06` verdict；浏览器半侧 FAIL → `POST …/switch` 为唯一写入口（`-20`⑦） |
| P0-07 | HMR 存在性 | `set_bundle` 后观察结果是 `applied`（HMR）还是 `restart-required (no-hmr)`；确认 `dsh-dev` 进程是否带 HMR | `dsh-dev restart`；`set_bundle` 返回值 | HMR 存在/不存在判定 | `P0-T07` | `T-R-07` verdict；FAIL → UI 只渲 `restart-required` 持久条 |
| P0-08 | 并发 dispose/init 竞态零窗口 | 连续/并发 `set_bundle` 调用 + fiber dispose/init 生命周期观测；断言无一刻两个 active `ctx.compaction`、无一刻无 provider | `plugin-manager` 内部；`ctx.compaction` 观测 | 竞态窗口存在/不存在 | `P0-T08` | `T-R-08` verdict；FAIL → `-14`「一次重组合」需补锁/串行化 |
| P0-09 | preset 子行 patch 覆盖率 | 验证 bundle patch 能命中 `standard/minimal/ptc/presets` 4 个 `id: compaction` group 的**子行**（不是只打外层 id）；断言每条子行 `disabled` 翻转 | `presets/{standard,minimal,ptc,presets}.patch.yml`；`--dump-config` | 子行可寻址性 verdict | `P0-T09` | `T-R-09` verdict；FAIL → `-14` 阻塞回 QNA |
| P0-10 | `ctx.sessionProjections` 第三方注册（附条件） | 最小插件 spike：`ctx.sessionProjections.register({stateVersion:1,apply,view})` 在第三方插件 Host 侧是否可用；产出 `{at,status,provider,model,shadowedTokenCount,degradedReason}` 形态 | `context/deepseek-harness/packages/llm/token-meter/src/index.ts:105-108`（先例）；最小 spike 插件 | 第三方注册可用性 verdict | `P0-T10` | `T-R-10` verdict；FAIL → `-21` 走 per-session Map fallback + 附录登记 |

### 4.2 Phase 1 — 交付形态与 worktree

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P1-01 | worktree + 新包骨架 | a) `git worktree add .agents/worktrees/dnms01-async-compaction -b dnms01-async-compaction`；b) 在 worktree 内创建 `dsh-nano-model-selector-compaction/`：`package.json`（`name`/`version 0.1.0`/`engines.dsh >=0.2.2-rc.1 <0.3.0`/`main ./index.js`/`files`/`dsh.bundle.patch ./cordis.patch.yml`/`dsh.host {}`）、`index.js`（空 `apply(ctx)` + `inject`）、`AGENTS.md`（合同节骨架）、`cordis.patch.yml`（先只含 `- insert:` 占位）；c) `npm pack --dry-run` 验证 files | `.agents/worktrees/dnms01-async-compaction/dsh-nano-model-selector-compaction/` | 包目录就位、manifest 合法、tarball 含必要文件 | `L5-T01` | `npm pack --dry-run` 结构合法 |
| P1-02 | 主包 `package.json` 0.3.0 | `version` → `0.3.0`；`files` 增加 `lib/compact-policy.js`；`exports` 如需增加 `./compact-policy` 子路径（若 P0-01 判定共享模块要 import） | `dsh-nano-model-selector/package.json:3`（version）、`:11-17`（exports）、`:18-29`（files）、`:30-32`（engines） | 主包升级 + 产物覆盖 | `L5-T01` | tarball 含 `lib/compact-policy.js` |
| P1-03 | 根登记 | `AGENTS.md` 插件表加 `dsh-nano-model-selector-compaction`；`README.md`「活跃插件」计数 +1；`RELEASE.md` 发布表加一行 + CI matrix 项 | `AGENTS.md`、`README.md`、`RELEASE.md` | 根清单两包齐 | `L5-T03` | 根文档与 `package.json` 一致 |

### 4.3 Phase 2 — 策略引擎（纯函数）

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P2-01 | `lib/compact-policy.js` | a) `DEFAULT_POLICY`（7 字段、`schema:1`、`model:{provider:'',model:''}`、B=0.65/H=0.50/S=0.80/pinned 100000/20000）；b) `validateMasterOrder(policy, W)` → `{effectivePin, windowMin, dcs}`（`effectivePin=min(pinnedAsyncTokens,floor(0.15*W))`、`effectivePin/W<H<B<S<1`、`B∈[0.25,S)`；DC-1→`{dcs:['DC-1'],fullOnly:true}`、DC-2/DC-3→`{ok:false,code}`）；c) `fill(totalTokens, W)`；d) `serializePolicy`/`deserializePolicy`（未知 schema 拒绝、`enabled` 字段忽略不入）；e) `readState(path)`（fail-closed：missing→`DEFAULT_POLICY` 内存、corrupt→`{error:'state-read-failed'}`）；f) `writeState(path, policy)`（tmp+`renameSync` 原子、不覆盖已有 schema:1 之外的文件） | `dsh-nano-model-selector-compaction/lib/compact-policy.js`（新）；`test/compact-policy.test.mjs`（新） | L0 全绿 | `L0-T01..T06` | `node --test` 0 失败；植回非法序/DC/15%/第二公式必红 |

### 4.4 Phase 3 — 主包路由与契约层

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P3-01 | `GET/PUT /nano-model-selector/async-compact` | a) `index.js` 增 `compactHandlers(ctx)`：GET 回 `{...policy, effective:{pin,windowMin,dcs}, runtime:{fill,lastCompaction,degraded,installed,enabled}}`；PUT `readBody(req,16384)`→`validateMasterOrder`→`resolveModelInfo` 校验 `model`→`writeState`→`refresh`；错误闭集 `invalid-schema`/`invalid-range`/`invalid-model`/`body-too-large`/`invalid-json-body`/`state-read-failed`/`state-write-failed`；b) `registerRoutes` 增一行 L3/`bodyLimit:16384`/`sessionBinding:false` | `dsh-nano-model-selector/index.js`（+`compactHandlers` + `registerRoutes` 行）；`security/route-sensitivity.json`（+行）；`index.js:148-163`（`readBody` 复用） | GET 200/PUT 200/400 契约 + L3/16384 | `L1-T01` | route-sensitivity 行 + guard 注册一致 |
| P3-02 | `POST /nano-model-selector/async-compact/switch` | a) `index.js` 增 `compactSwitch(ctx)`：`readBody(req,1024)`→`ctx.get('pluginManager').setBundleEnabled('dsh-nano-model-selector-compaction', body.enabled)`；回 `{ok,result}`（`result ∈ applied/restart-required/overridden/failed`）；b) `registerRoutes` 增一行 L3/`bodyLimit:1024`/`sessionBinding:false` | `dsh-nano-model-selector/index.js`；`security/route-sensitivity.json` | POST ≤1024 + 四态回包 | `L1-T02` | route-sensitivity 行 + guard 注册一致 |
| P3-03 | 五处对齐 | a) `scripts/route-scan.mjs` 扩展 [DNMS] 扫描器（目前硬编码 3 条）支持 `/async-compact` 与 `/async-compact/switch`；b) `security/feature-contract.json` 加 2 行（`responseShape` 与实际回包一致）；c) `npm run build` 重烤 `lib/route-table.js`/`lib/route-guard.js`；d) `package.json` files/exports 加 `lib/compact-policy.js`（若主包也消费）；e) `scripts/check-route-sensitivity.mjs`/`check-feature-contract.mjs`/`check-clean-lib.mjs` 三 gate 0 命中 | `scripts/route-scan.mjs:148-187`（`scanModelSelector`）；`security/feature-contract.json:350-386`；`scripts/build-client.mjs:18-33,84-88`；`package.json` | 3 gate 0 命中 + responseShape 行 + files/exports | `L1-T03`、`L5-T02` | `check-*` 全 exit 0 |

### 4.5 Phase 4 — compaction 包：Provider + 调度 + 互斥 patch

> **净新高风险 Phase**：`工作内容` 拆 a/b/c 有序子步；`具体功能预期` ≥5 条含边界/失败/降级。

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P4-01 | `index.js` + `cordis.patch.yml`（`-10` 互斥） | a) `index.js`：`export const name = 'nano-model-selector-compaction'`、`export const inject = ['llm','tokenMeter','sessions']`、`export default class DnmsCompactionEngine extends CompactionEngine`（**由 `cordis.patch.yml` 的组合层行挂载，loader-managed；严禁 `apply` 内 `ctx.provide` 覆盖已挂载服务，见 §7.2 `⛔6`**）；b) `cordis.patch.yml`：`- id: compaction-basic` `disabled: true`（base 扁平行）+ 对 4 个 preset `id: compaction` group `- insert:` 我方行 + 覆盖 `compaction-basic` `disabled:true`（ON）/整层移除（OFF） | `dsh-nano-model-selector-compaction/index.js`、`cordis.patch.yml` | ON/OFF 两态行归属正确 | `L2-T01/T02` | `--dump-config` ON=我方 active、`compaction-basic disabled:true`；OFF=原生 active |
| P4-02 | `lib/compact-policy.js`（共享） | 与 Phase 2 同一模块文件，供 compaction 包内部 import。**双副本规则（显式）**：`check-clean-lib` 禁裸 specifier、主包 `index.js` 无法 `import` 另一插件包的子路径 → 两包各持一份**同字节副本**；不得以跨包 import 共享；`L0-T01..T06` 的字节等值断言守漂移（canonical 状态仍只有 `async-compact.json` 一份，代码副本不是第二真源） | `dsh-nano-model-selector-compaction/lib/compact-policy.js` | 两包消费同一真源 | `L0-T01..T06` | 与 Phase 2 字节一致 |
| P4-03 | `lib/compact-scheduler.js`（`-18`） | a) `onPreStep(agent, next)`：`measure`→`fill`→`fill≥B` 且非 DC-1 → ephemeral `intent`（in-memory session-scoped Map）+ `agent.followup()`；`fill≥S` → 同步 `compactNow`（阻塞）；catch→`logger.warn`+`next()` **绝不抛**；b) `onRequest`：模型切换→`targetW < currentContext` → throw `MODEL_SWITCH_COMPACTION_FAILED`，其余 `next()`；c) `onRequestError`：`CONTEXT_WINDOW_EXCEEDED` → `compactIfNeeded('context-overflow')` overflow=1、**绝不抛**；d) `runMaintenance` 执行 intent：`CompactionEngine.compactIfNeeded(agent,'pressure',sig)`；e) adoption：ready+`observed≤H` → HEALTHY；ready+`observed>H` → deferred next-FULL intent；degraded/timeout → 保旧 surface；f) circuit：session Map、typed transient→下 turn 新 episode、两次连续→open；g) `state-read-failed` → safety-only degraded（S 线 only） | `dsh-nano-model-selector-compaction/lib/compact-scheduler.js`（新）；`context/deepseek-harness/packages/core/agent-loop/src/agent.ts:204-205`（`runMaintenance` idle 前置） | `-18` ①-⑨ 全部满足 | `L3-T05..T08`、`L3-T12..T14` | `-18` 按入口分型 + 真 async + one-active + safety-only + overflow=1 |
| P4-04 | `lib/host-compaction.js`（`-16` Provider） | a) `class DnmsCompactionEngine extends CompactionEngine`（`super(ctx,'compaction')`）；b) `compactIfNeeded(agent,trigger,signal)`：trigger qualify（pressure：`fill≥B`；context-overflow：overflow 限 1）→ `ctx.get('toolResultPruner')?.pruneSession(agent.session)` + 重测 → 选摘要区间（`toolPairingBalancedBefore/After`）→ `compactRegion`；c) `compactNow(agent,signal,commandId)`：S 线 `/compact`/trusted safety，直接 `compactRegion`；d) `compactRegion(agent,range,signal)`：`compaction/start`→`summarizeWithLlm`（`ctx.llm.stream({provider,model,purpose:'compaction',signal})`、no-cap、text-only、incomplete 不采用）→ shrink 校验（`framedSummaryTokenCount >= shadowedRouteTokenCount` → `summary`）→ `frameSummary`/`compactCheckpointSource(compactionId,sourceCommandId)`/`surfaceOp.replace`→`compaction/end`；六码 `busy/cancelled/changed/summary/commit/persistence`；e) 模型解析 `configured ?? latest logged request target ?? AgentOptions`；f) 自注册 `agent/pre-step`/`agent/request`/`agent/request-error` | `dsh-nano-model-selector-compaction/lib/host-compaction.js`（新）；`context/deepseek-harness/packages/compaction/compaction/src/index.ts`（协议）；`compaction-basic/src/region.ts`/`summarizer.ts`（durable 先例） | `-16` 三方法 + 六码 + no-cap + 三监听 + prune 消费 | `L3-T01..T04`、`L3-T09..T11` | ON 态 `/compact`+auto+overflow 全走我方 Provider，durable 协议合规 |
| P4-05 | durable 协议合规校验 | `compaction/start|summary|end` bracket + `surfaceOp.replace` + `compactCheckpointSource` + `frameSummary`（`<compacted-summary>`）+ `toolPairingBalancedBefore/After` + 未配对 start=busy；原文 raw log 不删 | `compaction/src/types.ts`、`checkpoint.ts`、`tool-pairing.ts`；`compaction-basic/src/region.ts`（先例） | durable 协议零漂移 | `L3-T01/T02` | spike 抓事件序列与协议一致 |
| P4-06 | 失败分型与降级 | `-18` ④-⑨：pre-step warn+next；request MODEL_SWITCH 特抛；request-error 绝不抛；compactNow/Region 六码；summary-error 有进展才 true；state-read-failed→safety-only；pruner 缺失/抛错→跳过；未配对 start→busy 不清锁；circuit session-scoped | `dsh-nano-model-selector-compaction/lib/compact-scheduler.js`、`lib/host-compaction.js` | 按入口分型 + 不新增第七码 | `L3-T12..T14` | 每条入口路径有对应失败断言 |

### 4.6 Phase 5 — 主包 UI

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P5-01 | `ModelSelector.jsx` rail #4 + 面板 | a) `:717-727` 后插入第 4 个 `nms-rail-item`（`filter='compact'`、`CompactionIcon size=17`、`data-active`/`aria-pressed`/`title`/`aria-label`）；b) `:770-813` 旁加 `filter==='compact'` 面板：U1/U2/U3/U4 渲染 + 确认弹层 + 四分类结果条 + 策略区（model 下拉复用 catalog、B/H/pinned 可编辑、S 只读 0.80、effective/runtime 只读）；c) `:354-355,370` 的 `filter` 判断同步扩展 | `src/client/ModelSelector.jsx:693-728,770-813,815-847` | rail 第 4 图标 + 四态面板 + 四分类 | `L3-T17`、`L5-T04` | 已登录页面出现 `.nms-rail-item[data-filter="compact"]` |
| P5-02 | `compact.js` + `icons.jsx` + `i18n.js` | a) `src/client/compact.js`：仿 `media.js:24-48` 的 fetch/PUT + `readEngineCache` 式 `localStorage` 缓存（键 `dsh-nano-model-selector:async-compact.v1`）；b) `icons.jsx` 加 `CompactionIcon`；c) `i18n.js` zh/en 各 +18 key（`compactGeneration`/`compactTitle`/`compactSubtitle`/`compactNotInstalled`/`compactDisabled`/`compactEnabled`/`compactDegraded`/`compactSwitchConfirm`/`compactSwitchApplied`/`compactSwitchRestart`/`compactSwitchFailed`/`compactFieldBuffer`/`compactFieldHealth`/`compactFieldPinned`/`compactFieldSafety`/`compactFieldModel`/`compactRuntimeFill`/`compactLastCompaction`） | `src/client/compact.js`（新）、`icons.jsx`、`i18n.js:40-48,86-94`；`locale/*.json` 仍只 meta | fetch/PUT/缓存 + icon + 18 key | `L3-T17`、`L5-T04` | i18n key 齐 + 无 locale JSON 文案 |
| P5-03 | 4 处条件清理 | `ModelSelector.jsx:815,822,829,847` 四处 `filter !== 'media'` → `filter !== 'media' && filter !== 'compact'`；`:354-355,370` 的 `filter` 判断同步 | `src/client/ModelSelector.jsx:815,822,829,847` | compact 面板不被旧条件遮蔽 | `L3-T17` | 面板在 `filter='compact'` 下正常渲染 |

### 4.7 Phase 6 — 观测派生与读面

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P6-01 | `sessionProjections` 注册（或 fallback） | a) `stateVersion:1` 派生单元：`apply` 折叠 `compaction/summary`（`{at,provider,model,shadowedTokenCount,status:'ready'}`）/`compaction/end`（`error`→`status:'failed'`+`degradedReason`）/`compaction/prune`（累加）；`view` 同引用抑制；b) P0-10 `FAIL` → per-session Map + `session/event` 增量折叠（不落盘），附录登记 | `dsh-nano-model-selector-compaction/index.js` 或 `lib/compact-scheduler.js`；`packages/llm/token-meter/src/index.ts:105-108`（先例） | `runtime.lastCompaction` 派生 | `L3-T15a/T15b`、`L3-T18` | P0-10 verdict 落定；fallback 已登记 deferral |
| P6-02 | `runtime.fill` memo + `runtime.degraded` 闭集 + 读面 partial-degrade | a) `runtime.fill`：`ctx.tokenMeter.measure(session)` 一次 + 5s memo（键 `sessionUuid+lastEventSeq`，仿 `CATALOG_TTL_MS=15000`）；b) `runtime.degraded` 四值闭集（`null`/`'state-read-failed'`/`'last-compaction-failed'`/`'meter-unavailable'`）+ 优先级合成；c) 读面 partial-degrade：`measure` 抛错→`fill:null`+`degraded`；projection 抛错→`lastCompaction:null`+warn；GET 仍 200 | `dsh-nano-model-selector/index.js`（GET handler）；`dsh-nano-model-selector-compaction` | fill/degraded/lastCompaction 派生 + partial-degrade | `L3-T16`、`L3-T18` | 10 次面板 ≤3 measure；GET 200 |

### 4.8 Phase 7 — 收口

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P7-01 | L4 持久化 + L5 门禁 | a) `dsh-dev restart` 后 `set_bundle` 开关态跨重启保持；b) `async-compact.json` tmp+rename/未知 schema 400/卸载不删/首跑不创建；c) 4 个漂移 gate：`route-scan`/`check-route-sensitivity`/`check-feature-contract`/`check-clean-lib` 全绿 + `node --test` 单测全绿（gate 与 test runner 分开计）；d) `npm pack --dry-run` 两包；e) `git diff --check` | `dsh-dev`；`scripts/{route-scan,check-*}mjs`；`npm pack --dry-run` | L4/L5 全绿 | `L4-T01..T05`、`L5-T01..T05` | 全部硬闸 PASS 且四元组齐全 |
| P7-02 | `-17` 两包交付 + 默认 OFF + 文档同步 | a) 安装顺序 `主包→compaction 包`；`dsh plugin add` 后显式 `set_bundle(<compaction>, false)`；卸载反向；b) `AGENTS.md` 增「compaction 接管合同」节；c) `docs/specs/dsh-nano-model-selector/README.md` 真实化（版本/路由/状态文件/compaction 接管节）；d) `RELEASE.md` 加两包发布表行 + matrix 项 | `dsh-nano-model-selector/AGENTS.md`、`docs/specs/dsh-nano-model-selector/README.md`、`RELEASE.md` | 默认 OFF/首跑不创建/安装卸载序列/三文档同步 | `L4-T04`、`L4-T05`、`L5-T03` | tarball 两包含全部运行时产物 |
| P7-03 | `-22` banner + deferral | a) `async-compaction.md` 加唯一 supersession banner + 逐节处置（§7.4 整体作废/§6 架构 B 标 SUPERSEDED/§9 按 `-19`/§12 改同步要求）；b) 本 AP §11 deferral 表逐条登记（UI 像素级/i18n 微调/后续 profile/其余实现细节/附条件待测 4 项） | `docs/specs/dsh-nano-model-selector/async-compaction.md`；本 AP §11 | banner 植入 + deferral 逐条 | `L5-T05` | banner 就位 + deferral 无遗漏 |

---

## 5. Phase 详情

### 5.1 Phase 0 — `P0-EMPIRICAL`

- **Phase 目标**：9 项实现前置实测全部钉成 `T-R[HEAD-实测]`（`{id,claim,method,evidence,verdict,at}`），任一 FAIL → 对应 AP 段阻塞、回 QNA 追加修订。
- **本 Phase 对应编号**：`P0-01`–`P0-10`
- **本 Phase 新增文件**：`test/spike/dnms01-async-compaction/p0-*.spike.mjs`（临时 spike，不进 `files`）；`docs/specs/dsh-nano-model-selector/plan/T-R.md`（或本 AP §2.2 落台账）
- **本 Phase 修改文件**：无交付物（只读实测）
- **本 Phase 删除文件**：无
- **具体功能预期**：
  1. `T-R-01`（S0.1）：明确 profile-installed bundle 能否 `import '@deepseek-ai/dsh-compaction'`；给出可/不可 + specifier 形式 + resolve 证据
  2. `T-R-02`（S0.2）：`dump-config` 5 realm 位置 + 行 id + isolate 标记全登记
  3. `T-R-03`（S0.3）：互补 `disabled` + 一次 `reload()` 原子切换实测；确认 `disabled: !!js` mount-only
  4. `T-R-04`（S0.4）：`ctx.get('toolResultPruner')` 在 isolate realm 内可达性判定
  5. `T-R-05`（S0.5）：rc.3 安装版 ≡ rc.2 检出（13 文件逐字节）复核
  6. `T-R-06`：`ctx.remote.pluginManager` 半侧授权判定 + Host 侧 `ctx.get('pluginManager')` 兜底路径
  7. `T-R-07`：HMR 存在/不存在判定（`applied` vs `restart-required`）
  8. `T-R-08`：并发 dispose/init 竞态窗口存在/不存在判定
  9. `T-R-09`：preset 子行 patch 覆盖率判定（4 group 子行可寻址）
  10. `T-R-10`（附条件）：`ctx.sessionProjections` 第三方注册可用性判定（FAIL → `-21` fallback）
- **对应测试台账项**：`P0-T01..T10`（详见 §8）
- **收口标准**：9+1 项各有 `{id,claim,method,evidence,verdict,at}`；FAIL 项在 §7.3 对应工作项标阻塞、回 QNA
- **本 Phase 风险提醒**：P0-01/03/09 任一 FAIL 会让 `-16`/`-10`/`-14` 无法按冻结语义落地，必须回 QNA；P0-07 FAIL 不阻塞实现但改 UI 渲染；P0-10 FAIL 走 `-21` 条件 fallback。

### 5.2 Phase 1 — 交付形态与 worktree

- **Phase 目标**：worktree + 一仓两包骨架就位，`npm pack --dry-run` 结构合法。
- **本 Phase 对应编号**：`P1-01`/`P1-02`/`P1-03`
- **本 Phase 新增文件**：`dsh-nano-model-selector-compaction/{package.json,index.js,AGENTS.md,cordis.patch.yml}`、`dsh-nano-model-selector-compaction/lib/`（占位）
- **本 Phase 修改文件**：`dsh-nano-model-selector/package.json`、`AGENTS.md`、`README.md`、`RELEASE.md`
- **本 Phase 删除文件**：无
- **具体功能预期**：
  1. worktree 在 `.agents/worktrees/dnms01-async-compaction`，语义分支名 `dnms01-async-compaction`
  2. compaction 包 `package.json` `version 0.1.0`、`engines.dsh >=0.2.2-rc.1 <0.3.0`、`main ./index.js`、`files` 含 `index.js`+`cordis.patch.yml`+`AGENTS.md`+`lib/*`
  3. 主包 `version 0.3.0`，`files` 含 `lib/compact-policy.js`
  4. 根 `AGENTS.md`/`README.md`/`RELEASE.md` 登记两包
  5. `npm pack --dry-run` 两包 tarball 各含全部 `files`
- **对应测试台账项**：`L5-T01`/`L5-T03`（详见 §8）
- **收口标准**：两包文件树就位、manifest 合法、`npm pack --dry-run` 结构合法
- **本 Phase 风险提醒**：`dsh-dev` launcher 会把 `~/.dsh-dev/plugins/<pkg>` 的 `cordis.patch.yml` `name` 改写成绝对路径——新包目录就位后 `dsh-dev restart` 会自动给它加 `--patch`，无需手改 profile `package.json`。

### 5.3 Phase 2 — 策略引擎（纯函数）

- **Phase 目标**：`-15` 的 7 字段 schema / master 序 / DC / effectivePin / 原子写 / fail-closed / 未知 schema 拒绝，收敛为无宿主依赖的 `lib/compact-policy.js` + `node --test`。
- **本 Phase 对应编号**：`P2-01`
- **本 Phase 新增文件**：`dsh-nano-model-selector-compaction/lib/compact-policy.js`、`dsh-nano-model-selector-compaction/test/compact-policy.test.mjs`
- **本 Phase 修改文件**：无
- **具体功能预期**：
  1. `DEFAULT_POLICY` 七字段与 `-15` 数值逐项对齐
  2. `validateMasterOrder` 返回 `{effectivePin, windowMin, dcs}`，DC-1→full-only 标记、DC-2/DC-3→reject
  3. `fill` 单一公式 `totalTokens/W`
  4. `deserializePolicy`：未知 `schema` → `invalid-schema`；含 `enabled` → 忽略不入（`-12`/`AMEND-1`）
  5. `readState`：missing→`DEFAULT_POLICY`（内存）、corrupt→`{error:'state-read-failed'}`；不写文件
  6. `writeState`：tmp+`renameSync` 原子替换
  7. `node --test` 全绿；植回非法序/DC/15%/第二公式必红
- **对应测试台账项**：`L0-T01..T06`（详见 §8）
- **收口标准**：`node --test` 0 失败
- **本 Phase 风险提醒**：模块未来被主包与 compaction 包共享，**禁止引入任何 Cordis/宿主 import**（纯函数、零宿主 API）；若 P0-01 判定共享方式是「主包 export」，需同步 `package.json` exports 子路径。

### 5.4 Phase 3 — 主包路由与契约层

- **Phase 目标**：`-15`/`-20`⑦ 的两条路由 + 五处对齐落地，`check-*` 三 gate 0 命中。
- **本 Phase 对应编号**：`P3-01`/`P3-02`/`P3-03`
- **本 Phase 新增文件**：无（全部改既有文件）
- **本 Phase 修改文件**：`dsh-nano-model-selector/index.js`、`security/route-sensitivity.json`、`security/feature-contract.json`、`scripts/route-scan.mjs`、`package.json`
- **具体功能预期**：
  1. `GET` 回 `{...policy, effective:{pin,windowMin,dcs}, runtime:{fill,lastCompaction,degraded,installed,enabled}}`；`effective`/`runtime` 只读派生不落盘
  2. `PUT` 16384、`validateMasterOrder` 先校验、`resolveModelInfo` 校验 `model`、`writeState` 原子落盘
  3. `POST …/switch` ≤1024、转发 `ctx.get('pluginManager').setBundleEnabled('dsh-nano-model-selector-compaction', enabled)`、回 `{ok,result}` 四态
  4. 错误闭集 7 码：`invalid-schema`/`invalid-range`/`invalid-model`/`body-too-large`/`invalid-json-body`/`state-read-failed`/`state-write-failed`，不新增未登记 errorId
  5. `route-sensitivity.json` 2 行（L3/`bodyLimit`/`sessionBinding:false`）+ `feature-contract.json` `responseShape` 行 + `route-scan.mjs` 扩展 + `npm run build` 重烤 + files/exports
- **对应测试台账项**：`L1-T01`/`L1-T02`/`L1-T03`/`L5-T02`（详见 §8）
- **收口标准**：`check-route-sensitivity`/`check-feature-contract`/`check-clean-lib`/`route-scan`/`node --test` 0 命中
- **本 Phase 风险提醒**：`route-sensitivity.json` 行先登记再 build（`dsh-nano-model-selector/AGENTS.md`「构建」节 + `-15` 硬约束）；`feature-contract.json` 的既有 `:360/:373/:388` 漂移不顺手修（`-15`）。

### 5.5 Phase 4 — compaction 包：Provider + 调度 + 互斥 patch

- **Phase 目标**：`-10`/`-13`/`-16`/`-18` 的机制主体落地：互斥 patch + `CompactionEngine` 子类 + 三监听 + 真 async 调度 + durable 协议 + 按入口分型失败降级。
- **本 Phase 对应编号**：`P4-01`–`P4-06`
- **本 Phase 新增文件**：`dsh-nano-model-selector-compaction/lib/compact-policy.js`（共享）、`lib/compact-scheduler.js`、`lib/host-compaction.js`、`cordis.patch.yml`、`index.js`
- **本 Phase 修改文件**：无（全部是净新）
- **具体功能预期**：
  1. `-10` 互斥 patch：ON 态我方 Provider 行 active + `compaction-basic` `disabled:true`（base 扁平行 + 4 preset group）；OFF 态整层移除、`compaction-basic` 回 active；`command-compact`/`tool-result-pruner` 两行**始终保留**
  2. `-16` 三方法按协议重实现：`compactIfNeeded`/`compactNow`/`compactRegion`；只 import 包根已导出原语、**不子类化 `BasicCompactionEngine`**、不 import 未 re-export 的 `compactSurfaceRegion`/`frameSummary`/`summarizeWithLlm`
  3. `-16` durable bracket：`compaction/start`→`compaction/summary`→`user/message`（`surfaceOp:{op:'replace',startSeq,endSeq}` + `compactCheckpointSource(compactionId,sourceCommandId?)`）→`compaction/end`；`toolPairingBalancedBefore/After`；未配对 start=busy；`<compacted-summary>` framing
  4. `-16` 六失败码 `busy/cancelled/changed/summary/commit/persistence` + `MODEL_SWITCH_COMPACTION_FAILED`（模型窗口装不下时 request 抛）；`compaction/summary-error` 有进展才 true
  5. `-16` no-cap：`ctx.llm.stream({provider,model,purpose:'compaction',signal})`、不写 `maxTokens`/等价 cap、text-only/拒 image/incomplete 不采用；模型解析 `configured ?? latest logged request target ?? AgentOptions`
  6. `-16` 自注册三监听：`agent/pre-step`（B 线）/`agent/request`（模型切换）/`agent/request-error`（`CONTEXT_WINDOW_EXCEEDED`→`compactIfNeeded('context-overflow')`、overflow=1）
  7. `-13` micro 消费：`ctx.get('toolResultPruner')?.pruneSession(agent.session)` 在 trigger qualify 之后、选摘要区间/bracket 之前，重测后已低于阈值 `return null`
  8. `-18` 真 async：pre-step 只计量+判定、intent ephemeral、`agent.followup()` 唤醒、`runMaintenance` 在 idle 执行、adoption 下一 request assembly
  9. `-18` 按入口分型：pre-step warn+next（绝不抛）/ request MODEL_SWITCH 特抛 / request-error 绝不抛 / compactNow·Region 六码；`state-read-failed`→safety-only degraded（S only）；circuit session-scoped ephemeral
  10. `-18` one-active：`compaction/start` 未配对锁、不另造计数器；未配对 start 不清锁
- **对应测试台账项**：`L2-T01`/`L2-T02`/`L3-T01..T14`/`L3-T20`/`L3-T21`/`L3-T22`（详见 §8）
- **收口标准**：ON 态 `/compact`/auto/overflow 全走我方 Provider、durable 协议合规、OFF 态原生完整回来
- **本 Phase 风险提醒**：isolate realm 内 `ctx.get('toolResultPruner')`/`ctx.tokenMeter` 的可达性由 P0-04/P0-02 判定；`import '@deepseek-ai/dsh-compaction'` 由 P0-01 判定；竞态由 P0-08 判定；preset 覆盖由 P0-09 判定——四项任一 FAIL，对应工作项阻塞回 QNA。

### 5.6 Phase 5 — 主包 UI

- **Phase 目标**：`-20` rail 第 4 图标 + `filter='compact'` 面板 + 切换四分类 + 18 key i18n + 4 处条件清理。
- **本 Phase 对应编号**：`P5-01`/`P5-02`/`P5-03`
- **本 Phase 新增文件**：`src/client/compact.js`
- **本 Phase 修改文件**：`src/client/ModelSelector.jsx`、`src/client/icons.jsx`、`src/client/i18n.js`
- **具体功能预期**：
  1. rail 第 4 图标插在 `nms-rail-sep` **之前**、与「全部/收藏/媒体生成」同排；`filter='compact'`；17px `CompactionIcon`；`data-active`/`aria-pressed`/`title`/`aria-label` 走新 i18n key
  2. U1–U4 四态：U1 未安装（无开关）、U2 未启用（OFF）、U3 已启用（ON+策略）、U4 degraded（叠加黄条「仅安全线生效」）；四态由 Host 只读投影判定，UI 不自行推导
  3. 切换交互：确认弹层说明「一次 profile 重组合、有 HMR `applied`、无 HMR `restart-required`、不删状态文件」→ `ctx.remote.pluginManager.setBundleEnabled`（或 POST `/switch`）→ `applied`/`restart-required`/`overridden`/`failed` 四分类渲染；`restart-required` 是**黄色持久条**（非 toast）
  4. 策略区：model 下拉复用 `/catalog`；`bufferSizeAsync`/`healthTargetAsync`/`pinnedAsyncTokens` 可编辑；`bufferSizeSafety` 只读 0.80；`effective`/`runtime` 只读
  5. 18 key i18n zh/en 齐、`locale/*.json` 仍只 meta
  6. 4 处 `filter !== 'media'` 清理为 `filter !== 'media' && filter !== 'compact'`；`:354-355,370` 的 `filter` 判断同步
  7. **零轮询**：只在「打开面板/切换后/PUT 成功后」各 fetch 一次；不设 `setInterval`/WebSocket/`session/event` 订阅
- **对应测试台账项**：`L3-T17`/`L5-T04`（详见 §8）
- **收口标准**：已登录页面出现 `.nms-rail-item` 第 4 个 + 面板四态正确渲染 + 切换四分类条正确
- **本 Phase 风险提醒**：`filter` URL 同步是 deferral（现无此机制）；P0-07 FAIL → 只渲 `restart-required`。

### 5.7 Phase 6 — 观测派生与读面

- **Phase 目标**：`-21` `runtime.lastCompaction`/`fill`/`degraded` 派生 + partial-degrade。
- **本 Phase 对应编号**：`P6-01`/`P6-02`
- **本 Phase 新增文件**：`dsh-nano-model-selector-compaction` 内 `lib/last-compaction-projection.js`（或并入 `compact-scheduler.js`）；主包 GET handler 增强
- **本 Phase 修改文件**：`dsh-nano-model-selector/index.js`、`dsh-nano-model-selector-compaction/index.js`
- **具体功能预期**：
  1. `sessionProjections` 注册 `stateVersion:1` 单元：`apply` 折叠三类 compaction 事件、`view` 同引用抑制；产出 `{at,status:'ready'|'degraded'|'failed',provider,model,shadowedTokenCount,degradedReason}`
  2. P0-10 `FAIL` → per-session Map + `session/event` 增量折叠 fallback、附录登记
  3. `runtime.fill`：`ctx.tokenMeter.measure(session)` 一次 + 5s memo（键 `sessionUuid+lastEventSeq`）
  4. `runtime.degraded` 四值闭集 + 优先级合成（`degradedMode ?? lastCompaction 衍生 ?? null`）
  5. 读面 partial-degrade：`measure` 抛错→`fill:null`+`degraded='meter-unavailable'`；projection 抛错→`lastCompaction:null`+warn；GET 仍 200
  6. 客户端零轮询：只在「打开面板/切换后/PUT 成功后」各 fetch 一次
- **对应测试台账项**：`L3-T15a`/`L3-T15b`/`L3-T16`/`L3-T18`/`L3-T19`（详见 §8）
- **收口标准**：10 次面板 ≤3 measure；GET 200；`degraded` 值在闭集内
- **本 Phase 风险提醒**：`ctx.tokenMeter.measure` 是 O(surface)（`B-8`）——GET `fill` 必须 memo，禁止轮询。

### 5.8 Phase 7 — 收口

- **Phase 目标**：`-19` L0–L5 全绿 + `-17` 两包交付与默认 OFF + 三处文档同步 + `-22` banner + deferral。
- **本 Phase 对应编号**：`P7-01`/`P7-02`/`P7-03`
- **本 Phase 新增文件**：`async-compaction.md` banner；本 AP §11 deferral 表
- **本 Phase 修改文件**：`dsh-nano-model-selector/AGENTS.md`、`docs/specs/dsh-nano-model-selector/README.md`、`RELEASE.md`、`docs/specs/dsh-nano-model-selector/async-compaction.md`
- **具体功能预期**：
  1. L4：`dsh-dev restart` 后 `bundles` 成员资格跨重启保持、`async-compact.json` tmp+rename/未知 schema 400/卸载不删/首跑不创建
  2. L5：5 gate 全绿（`route-scan`/`check-route-sensitivity`/`check-feature-contract`/`check-clean-lib`/`node --test`）+ `npm pack --dry-run` 两包 + `git diff --check` 干净
  3. `-17` 两包交付：安装顺序主包→compaction 包、卸载反向；默认 OFF；`AGENTS.md` 合同节；`README.md` 真实化；`RELEASE.md` 行
  4. `-22`：`async-compaction.md` banner + 逐节处置；本 AP §11 deferral 表逐条登记
  5. 全程只在 `dsh-dev`（`--home ~/.dsh-dev`）；零触碰 `dsh.local`
- **对应测试台账项**：`L4-T01..T05`、`L5-T01..T05`（详见 §8）
- **收口标准**：`-19` L0–L5 全绿 + 三文档同步 + banner + deferral + 四元组证据齐全
- **本 Phase 风险提醒**：`async-compaction.md` banner 是 `-22` 硬交付；`README.md` 陈旧项（§0.4）必须真实化，不得以「历史文档」为由跳过。

---

## 6. 依赖的冻结设计决策（只读引用）

> 本节只 CITE `DNMS01-qna.md` §1 已冻结行；不填 Q/A、不改已冻结行。`-15`/`-16`/`-17`/`-19`/`-20`/`-21`/`-22` 逐条 1:1 映射见 §2.1 CITE 总表。

| 决策 / Q ID | 冻结来源 | 本计划中的影响 | 若不成立的处理 |
|-------------|----------|----------------|----------------|
| `T-O-DNMS01-1`..`-9` | `qna/DNMS01-qna.md:52-60` baseline | 范围/真源分层/seam/现状/治理/反例/事实基线/双态语义；P0-EMPIRICAL 驱动 | 回 QNA（baseline 是地基） |
| `T-O-DNMS01-10` | `qna/DNMS01-qna.md:61` | Phase 4 互斥 patch + ON/OFF lane 归属 | `P0-03`/`P0-09` FAIL → 回 QNA |
| `T-O-DNMS01-11` | `qna/DNMS01-qna.md:62` | Phase 2/3 两态 canonical + 平台中立 | 回 QNA |
| `T-O-DNMS01-12` | `qna/DNMS01-qna.md:63` | Phase 2/3/4 开关 canonical + AMEND-1 | 回 QNA |
| `T-O-DNMS01-13` | `qna/DNMS01-qna.md:64` | Phase 4 full 内部模式 + micro 零改动 + AMEND-2 | `P0-04` FAIL → 回 QNA |
| `T-O-DNMS01-14` | `qna/DNMS01-qna.md:65` | Phase 1/4/5 专用 bundle + `set_bundle` + 读态三件套 + AMEND-3 | `P0-03`/`P0-09` FAIL → 回 QNA |
| `T-O-DNMS01-15` | `qna/DNMS01-qna.md:66` | Phase 2/3 schema/数值/reject/路由/错误闭集/五处对齐 | `P0` 若推翻错误闭集 → 回 QNA |
| `T-O-DNMS01-16` | `qna/DNMS01-qna.md:67` | Phase 4 Provider 三方法 + 六码 + no-cap + prune + P0 前置 | `P0-01` FAIL → 回 QNA |
| `T-O-DNMS01-17` | `qna/DNMS01-qna.md:68` | Phase 1/5/7 两包交付 + 默认 OFF + 文档同步 | `P0` 若推翻交付形态 → 回 QNA |
| `T-O-DNMS01-18` | `qna/DNMS01-qna.md:69` | Phase 4 真 async + one-active + 按入口分型 + safety-only degraded | `P0-08` 等 FAIL → 回 QNA |
| `T-O-DNMS01-19` | `qna/DNMS01-qna.md:70` | Phase 6/7 观测面闭集 + L0–L5 + DoD + 不新设 release-gate | `P0` 若推翻验收 → 回 QNA |
| `T-O-DNMS01-20` | `qna/DNMS01-qna.md:71` | Phase 3/5 UI 契约 + 第 2 条路由 | `P0-06`/`P0-07` FAIL → 回 QNA |
| `T-O-DNMS01-21` | `qna/DNMS01-qna.md:72` | Phase 6 `sessionProjections` + 5s memo + 零轮询 | `P0-10` FAIL → 走 `-21` 条件 fallback + 附录登记 |
| `T-O-DNMS01-22` | `qna/DNMS01-qna.md:73` | Phase 0/7 收口判据 + T-R + banner + deferral | 无（收口本身） |

---

## 7. 内置 Reference-Anchor 锚区

> **§7 是本 AP 的 grounding 真源**（无独立 eval-reference-anchor）。落点图例：`✅ 复用` / `♻️ 重 substrate` / `🆕 净新`；读不改的参考点在 `备注` 写「已建好别重写」。

### 7.1 锚表（本计划工作要落在哪些既有代码 / 新建点上）

| 锚 ID | `path:line` | 落点（这是什么）| 本 AP 用途（对应工作项）| 处置 | 备注 |
|-------|-------------|------------------|--------------------------|------|------|
| A-1 | `dsh-nano-model-selector/index.js:34-38` | `STATE_PATH` 状态文件落点范式 | P3-01 `async-compact.json` 路径 | `✅ 复用` | 同目录 `plugins/nano-model-selector/` |
| A-2 | `dsh-nano-model-selector/index.js:148-163` | `readBody(req,maxBytes)` 读体工具 | P3-01/P3-02 PUT/POST body 上限 | `✅ 复用` | 已建好别重写 |
| A-3 | `dsh-nano-model-selector/index.js:233-237` + `lib/route-guard.js` | `registerRoutes` 调用（`requestRejection`/405 在 guard 内） | P3-01/P3-02 路由注册 | `✅ 复用` | 已建好别重写 |
| A-4 | `dsh-nano-model-selector/index.js:41,55,61-62,90,93` | `ctx.llm.resolveModelInfo`/`listProviders`/`listModels`/`context.contextWindow` | P2-01/P3-01 `W` 与 `model` 校验 | `✅ 复用` | catalog 复用别重查 |
| A-5 | `dsh-nano-model-selector/index.js:172-189` | `ctx.skills.register` 运行时技能范式 | P4-03 `agent.followup` 唤醒参照 | `✅ 复用` | 非直抄、只借运行时注册式 |
| A-6 | `dsh-nano-model-selector/src/client/media.js:24-48` | 同源裸 fetch + `writeEngineCache` localStorage 缓存 | P5-02 `compact.js` 仿写 | `♻️ 重 substrate` | 同构但独立文件 |
| A-7 | `dsh-nano-model-selector/src/client/ModelSelector.jsx:693-728` | 单列 rail + `nms-rail-sep` | P5-01 rail 第 4 图标插位 | `✅ 复用` | 插 `nms-rail-sep` 之前 |
| A-8 | `dsh-nano-model-selector/src/client/ModelSelector.jsx:770-813` | `filter==='media'` 面板范式 | P5-01 `filter==='compact'` 面板 | `♻️ 重 substrate` | 结构仿、内容新 |
| A-9 | `dsh-nano-model-selector/src/client/ModelSelector.jsx:815,822,829,847` | 4 处 `filter !== 'media'` 条件 | P5-03 条件清理 | `update` | 改 `&& filter !== 'compact'` |
| A-10 | `dsh-nano-model-selector/src/client/i18n.js:40-48,86-94` | zh/en 硬编码文案区 | P5-02 +18 key | `update` | `locale/*.json` 仍只 meta |
| A-11 | `security/route-sensitivity.json:306-345` | [DNMS] 3 路由行 | P3-01/P3-02 +2 行（L3/16384、L3/1024） | `update` | 先登记再 build |
| A-12 | `security/feature-contract.json:350-386` | [DNMS] 3 行 responseShape | P3-03 +2 行 | `update` | 不顺手修既有漂移 |
| A-13 | `scripts/route-scan.mjs:148-187` | [DNMS] 硬编码 3 条扫描器（`scanModelSelector`） | P3-03 扩展到 5 条 | `update` | 与 route-sensitivity 对齐 |
| A-14 | `dsh-nano-model-selector/scripts/build-client.mjs:18-33,84-88` | `bakeRouteTable` + esbuild | P3-03 `npm run build` 重烤 | `✅ 复用` | 已建好别重写 |
| A-15 | `dsh-nano-model-selector/package.json:3`（version）、`:11-17`（exports）、`:18-29`（files）、`:30-32`（engines） | `version`/`files`/`exports`/`engines.dsh` | P1-02 升 0.3.0 + files 增项 | `update` | `engines` 不改 |
| A-16 | `dsh-nano-model-selector/package.json` `dsh.client.platform` | `"platform":"web"` | P1-02 主包仍 web-only | `update` | 新包 Host-only、无 client |
| A-17 | `security/route-sensitivity.json:2-4` | ledger 总头 | P3-01/P3-02 登记位置 | `✅ 复用` | [DNMS] 行在 :306-345 |
| A-18 | `context/deepseek-harness/packages/bundle/base/cordis.patch.yml:352-361` | base 扁平行（`compaction-basic` 等） | P4-01 `-10` 互斥 patch 覆盖点 | `✅ 复用` | web-app 已 disabled；真 provider 在 preset group |
| A-19 | `context/deepseek-harness/packages/bundle/web-app/presets/standard.patch.yml:72-88` | preset `id: compaction` isolate group | P4-01 子行覆盖点 | `✅ 复用` | 4 group 同构 |
| A-20 | `context/deepseek-harness/packages/compaction/compaction/src/index.ts:119-122,136,162,187` | `CompactionEngine` 抽象 + 三方法 | P4-04 子类落点 | `✅ 复用` | 按协议重实现、不子类化 Basic |
| A-21 | `context/deepseek-harness/packages/compaction/compaction/src/{types,checkpoint,tool-pairing}.ts` | durable 协议原语 | P4-04/P4-05 | `✅ 复用` | 只 import 包根已导出 |
| A-22 | `context/deepseek-harness/packages/compaction/compaction-basic/src/{region,summarizer}.ts` | durable bracket/summarize 先例 | P4-04 参考 | `✅ 复用` | 读不改 |
| A-23 | `context/deepseek-harness/packages/compaction/compaction-basic/src/index.ts:113`（`inject`/`Config`）、`:139,157,183,213`（三监听 + `agent/request-error` overflow） | Provider `inject` + 三监听自注册参照 | P4-03/P4-04 | `♻️ 重 substrate` | 我们自持 overflow=1 |
| A-24 | `context/deepseek-harness/packages/core/agent-loop/src/agent.ts:204-205` | `runMaintenance` idle 前置 | P4-03 真 async 调度 | `✅ 复用` | 已建好别重写 |
| A-25 | `context/deepseek-harness/packages/llm/token-meter/src/index.ts:87,105-108,151` | `tokenMeter.measure` + `sessionProjections` 先例 | P4-03/P6-01 | `✅ 复用` | `sessionProjections` 注册先例 |
| A-26 | `context/deepseek-harness/packages/compaction/compaction-tool-result-pruner/src/config.ts:10-14` | micro 三 Config 值 | P4-04 消费边界（只 ctx.get 不改） | `✅ 复用` | 严格零改动 |
| A-27 | `context/deepseek-harness/packages/compaction/command-compact/src/index.ts:12,67` | `/compact` backend-independent | P4-01 保留行 | `✅ 复用` | 跟随 active Provider |
| A-28 | `docs/specs/dsh-nano-model-selector/async-compaction.md`（全部） | 规格草案/形成史 | P7-03 banner + §7.2 反例来源 | `update` | 已 supersede、仅证据索引 |
| A-29 | `docs/specs/dsh-nano-model-selector/README.md`（全部） | 陈旧的根 README 符号链接目标 | P7-02 真实化 | `update` | 按 `-17` 同步 |
| A-30 | `dsh-nano-model-selector/AGENTS.md` | 包合同 | P7-02 +「compaction 接管合同」节 | `update` | 单一登记真源 |
| A-31 | `RELEASE.md` | 发布流程/包清单/打包 | P7-02 加两包发布表行 + matrix | `update` | 与 files 一致 |
| A-32 | `AGENTS.md`、`README.md`（仓根） | 插件登记/计数 | P1-03 | `update` | 活跃插件计数 +1 |
| A-33 | `dsh-nano-model-selector-compaction/`（新目录） | 净新包 | P1-01/P4-01..06 | `🆕 净新` | 无既有可锚 |
| A-34 | `dsh-nano-model-selector-compaction/test/compact-policy.test.mjs`（新） | 纯函数单测 | P2-01 | `🆕 净新` | 复用 `node:test` 范式 |

### 7.2 反例 ledger ⛔（别碰区 / 已知陷阱）

| ⛔ | 反例 / 陷阱 | 为什么（依据）|
|----|------------|----------------|
| ⛔1 | 自持会话副本 / 新增 `compaction/*` 外 event type | `-2`/`-3`/`practices.md:7,21`/`session.md:5`：会话 durable 真值唯一、Session 拒绝 reopen |
| ⛔2 | 子类化 `BasicCompactionEngine` / import 未 re-export 的 `compactSurfaceRegion`/`frameSummary`/`summarizeWithLlm` | `-16`：会继承冲突的 pressure/maxOverflowRetries/maxTokens/overflow 归属 |
| ⛔3 | 裸 specifier 留在 `lib/`/`index.js` 交付物 | `scripts/check-clean-lib.mjs`：runtime 无法解析 bare specifier（P0-01 钉死能否 import；能则加白名单、不能则回 QNA） |
| ⛔4 | `enabled` 字段 / `enabled=false`→宿主默认 / json 优先映射 | `-12`/`AMEND-1`：已彻底移除、不投影/不 reconciliation/不留兼容键 |
| ⛔5 | `configEditor.edit` 改 `disabled` / 自写 profile `cordis.patch.yml`/`package.json` | `-12`/`configuration.md:3`：configEditor 只写 config；插件不得自写 |
| ⛔6 | 运行时 `ctx.set('compaction',…)`/`ctx.provide` 覆盖已挂载服务 | `-10`/`context.md:267-268,294-295`：只能组合层替换 |
| ⛔7 | `agent/request` waterfall 改 messages / 不调 `next()` | `practices.md:18`/`llm-streaming.md:1245-1250`：只读、必须 next() |
| ⛔8 | `agent/pre-step`/`agent/request-error` 抛错 | `-18`④/`agent.ts:319-322,554-568`：抛错中止 turn / 掩盖原始 failure |
| ⛔9 | 两个 provider 同时在线 / 状态双写 / 别名/旧配置键/兼容 façade/第二份合同/迁移期双轨 | `-6`：四原则禁止并存双轨；OFF 语义是回退原生 |
| ⛔10 | `max_tokens`/`max_output_tokens` / `sweet_spot`/`effective_window` 双锚 / model-specific 阈值 | `-15`/`-16`/`D5`/`E1`：no-cap + nominal window 唯一分母 |
| ⛔11 | 复制 [nano-agent] D1/Queue/DO/cron / import 其代码 / 建跨仓侧载 | `-7`/`AGENTS.md` 插件中立/不得侧载 |
| ⛔12 | `completed`≠`ready` / `b0_async_ready_count` 式假绿计数 | `-19`/`B3`：语义成功=completed+ready+非空 ref+非 recovery |
| ⛔13 | 心跳当 async 状态帧 / UI 假进度条 / `setInterval` 轮询 | `-20`/`B4`/`-21`④：UI 状态取 durable 结果、零轮询 |
| ⛔14 | `dsh.local`（生产）重启/安装/profile 改写 | `-17`/`-19`/`B-12`：全程只 `dsh-dev` |
| ⛔15 | 新设 release-gate / 版本 bump/tag/发布（本 AP 授权外） | `-19`⑤/`AGENTS.md:41`：发布授权归 [业主] |
| ⛔16 | `checkpoint` 迟到进摘要包 / arm 后 transcript churn 进包 | `-18`/`C1`：arm 时刻即冻结、冻结后 churn 不进包 |

### 7.3 上游真源指针 + 安全项威胁模型

- **独立 reference-anchor**：无；§7 是本 AP 的 grounding 真源（全部落点已填 file:line）。
- **安全 / 信任边界类工作项的威胁模型锚**：
  - 路由/状态文件写路径：`security/route-sensitivity.json`（新增 2 行，L3/`bodyLimit`/`sessionBinding`）+ `security/feature-contract.json`（responseShape）+ `scripts/route-scan.mjs`（漂移 gate）—— 对应 P3-01/P3-02/P3-03
  - 组合层开关写路径：`ctx.get('pluginManager').setBundleEnabled`（sanctioned Host service；`-14`/`-20`③⑦）—— 对应 P3-02、P5-01
  - Provider 提权面：`CompactionEngine` 子类接管 `ctx.compaction`（`-3`/`-16`）—— 对应 P4-01..06
  - durable 协议面：`compaction/start|summary|end` + `compactCheckpointSource` + `surfaceOp.replace`（`-2`/`-16`）—— 对应 P4-04/P4-05
  - 攻击向量用例（§8.5）：`POST /switch` 未授权调用、`PUT` 非法 schema/未知 schema/`B≤H`/`enabled` 残留、state-read-failed→safety-only、`/compact` 在我方 Provider 上的 `busy`/`changed`/`persistence` 码、OFF 态宿主原生恢复、卸载后状态文件残留语义（不删）。

---

## 8. 测试台账

> **本段固定植入**。PASS 证据 = 四元组 `commit + 测试/查询名 + run-time(UTC)`；`degraded` 必带 `reason`；`pre-existing` 失败必带 git 证据甩锅；安全/信任边界项的测试含攻击向量用例（对应 §7.3）。

### 8.1 测试清单（主表）

| Test-ID | 测试项（验证什么）| 类型 | 层 | 来源 | 映射（工作项 → 收口目标）| PASS 证据（四元组）|
|---------|------------------|------|----|------|---------------------------|---------------------|
| `P0-T01` | profile-installed bundle 能否 `import '@deepseek-ai/dsh-compaction'` / `cordis`（静态 vs 动态） | `spike` | `live(dsh-dev)` | `🆕 新增 test/spike/dnms01-async-compaction/p0-import.spike.mjs` | `P0-01 → T-R-01 verdict` | `commit + spike 名 PASS + run-time` |
| `P0-T02` | `dump-config` 5 realm 渲染（base 扁平行 + 4 preset group + isolate 标记） | `spike` | `live` | `🆕 新增 p0-dump-config.spike.mjs` | `P0-02 → T-R-02 verdict` | `commit + dump-config 输出 + run-time` |
| `P0-T03` | 互补 `disabled` + 一次 `reload()` 原子切换（ON/OFF 无重叠） | `spike` | `live` | `🆕 新增 p0-atomic-flip.spike.mjs` | `P0-03 → T-R-03 verdict` | `commit + spike 名 PASS + run-time` |
| `P0-T04` | `ctx.get('toolResultPruner')` 在 isolate realm 内可达性 | `spike` | `live` | `🆕 新增 p0-pruner-realm.spike.mjs` | `P0-04 → T-R-04 verdict` | `commit + spike 名 PASS + run-time` |
| `P0-T05` | rc.3 安装版 ≡ rc.2 检出（13 核心文件逐字节） | `spike` | `live` | `🆕 新增 p0-rc-diff.spike.mjs` | `P0-05 → T-R-05 verdict` | `commit + diff 输出 + run-time` |
| `P0-T06` | `ctx.remote.pluginManager` 半侧授权 + Host 侧 `ctx.get('pluginManager')` | `spike` | `live` | `🆕 新增 p0-plugin-manager.spike.mjs` | `P0-06 → T-R-06 verdict` | `commit + spike 名 PASS + run-time` |
| `P0-T07` | HMR 存在性（`applied` vs `restart-required`） | `spike` | `live` | `🆕 新增 p0-hmr.spike.mjs` | `P0-07 → T-R-07 verdict` | `commit + spike 名 PASS + run-time` |
| `P0-T08` | 并发 dispose/init 竞态零窗口 | `spike` | `live` | `🆕 新增 p0-race.spike.mjs` | `P0-08 → T-R-08 verdict` | `commit + spike 名 PASS + run-time` |
| `P0-T09` | preset 子行 patch 覆盖率（4 group 子行可寻址） | `spike` | `live` | `🆕 新增 p0-preset-coverage.spike.mjs` | `P0-09 → T-R-09 verdict` | `commit + spike 名 PASS + run-time` |
| `P0-T10` | `ctx.sessionProjections` 第三方注册可用性（附条件） | `spike` | `live` | `🆕 新增 p0-session-projections.spike.mjs` | `P0-10 → T-R-10 verdict` | `commit + spike 名 PASS + run-time` |
| `L0-T01` | `compact-policy.js`：schema 7 字段 + master 序校验 | `短途` | `unit` | `🆕 新增 test/compact-policy.test.mjs` | `P2-01 → L0 全绿` | `commit + node --test + run-time` |
| `L0-T02` | `compact-policy.js`：DC-1/2/3 判定 | `短途` | `unit` | `🆕 新增` | `P2-01 → DC 判定` | `commit + node --test + run-time` |
| `L0-T03` | `compact-policy.js`：`effectivePin` 15% clamp 边界 | `短途` | `unit` | `🆕 新增` | `P2-01 → effectivePin` | `commit + node --test + run-time` |
| `L0-T04` | `compact-policy.js`：单条 `fill` 公式（禁第二公式/第二分母） | `短途` | `unit` | `🆕 新增` | `P2-01 → fill` | `commit + node --test + run-time` |
| `L0-T05` | `compact-policy.js`：tmp+rename 原子写 / invalid-JSON fail-closed / 未知 schema 拒绝 / `enabled` 忽略不入 | `短途` | `unit` | `🆕 新增` | `P2-01 → 状态文件` | `commit + node --test + run-time` |
| `L0-T06` | `compact-policy.js`：序列化往返 + 数值边界（B=0.25/S=0.80/pinned=0） | `短途` | `unit` | `🆕 新增` | `P2-01 → 序列化` | `commit + node --test + run-time` |
| `L1-T01` | `GET/PUT /nano-model-selector/async-compact`：200/400、7 错误码闭集、L3/16384/sessionBinding:false、回包形状。**点名攻击面**：PUT 携带 `enabled` 残留 → 400/忽略且不落盘；PUT `B≤H` → 400 且文件不变；未知 `schema` → 400 且文件不变；`S` 字段只读 → PUT 尝试改写 S → 400；`{}` 空体语义按 `-15`（沿用最近 target） | `短途` | `契约` | `🆕 新增 contract spike` | `P3-01 → GET/PUT 契约` | `commit + contract spike + run-time` |
| `L1-T02` | `POST /nano-model-selector/async-compact/switch`：≤1024、转发 `setBundleEnabled`、四态回包。**伪证**：未带合法会话/越权调用必须被拒（401/403），`sessionBinding:false` 不豁免路由 guard 的 L3 语义 | `短途` | `契约` | `🆕 新增` | `P3-02 → POST 契约` | `commit + contract spike + run-time` |
| `L1-T03` | 五处对齐：`route-sensitivity`/`feature-contract`/`route-scan`/`build`/`package.json` | `短途` | `契约` | `🆕 新增` | `P3-03 → 五处对齐` | `commit + gate 0 命中 + run-time` |
| `L2-T01` | `--dump-config` ON 态：恰好一个 `ctx.compaction` provider + 4 preset group 覆盖 + `compaction-basic disabled:true` | `spike` | `集成` | `🆕 新增` | `P4-01 → ON 态组合` | `commit + dump-config 输出 + run-time` |
| `L2-T02` | `--dump-config` OFF 态：原生 `compaction-basic` active、`tool-result-pruner` 两态都在 | `spike` | `集成` | `🆕 新增` | `P4-01 → OFF 态组合` | `commit + dump-config 输出 + run-time` |
| `L3-T01` | `dsh-dev` 新会话：`/compact` 走我方 Provider、标准 bracket + `compactCheckpointSource` + `surfaceOp.replace` | `spike` | `live` | `🆕 新增` | `P4-04 → /compact` | `commit + session log 证据 + run-time` |
| `L3-T02` | 自动 compaction 走我方 Provider（ON 态原生三监听被我方接管）。**伪证**：ON 态任一自动触发仍由 `compaction-basic` 处理 → RED（看 `compaction/start` 的 provider 归属与 config 来源） | `spike` | `live` | `🆕 新增` | `P4-04 → auto` | `commit + session log 证据 + run-time` |
| `L3-T03` | `compaction/summary` 的 `provider/model` 等于所选 | `spike` | `live` | `🆕 新增` | `P4-04 → 模型归属` | `commit + session log 证据 + run-time` |
| `L3-T04` | `max_tokens`/`max_output_tokens` 不出现在 compact 请求 | `spike` | `live` | `🆕 新增` | `P4-04 → no-cap` | `commit + wire 证据 + run-time` |
| `L3-T05` | B 线跨 turn：pre-step 计量→intent→`followup()`→idle `runMaintenance`→下一 request adoption | `spike` | `live` | `🆕 新增` | `P4-03 → 真 async` | `commit + 毫秒级时序 + run-time` |
| `L3-T06` | S 线阻塞 full：`fill≥S` → `compactNow` 阻塞、adoption 标准；DC-1（`effectivePin < windowMin`）→ full-only 阻塞、不排 async intent | `spike` | `live` | `🆕 新增` | `P4-03 → S 兜底/DC-1` | `commit + session log 证据 + run-time` |
| `L3-T07` | 边界 B−1/B/B+1、S−1/S 触发差分 | `spike` | `live` | `🆕 新增` | `P4-03 → 边界` | `commit + 时序 + run-time` |
| `L3-T08` | degraded/timeout：旧 surface 存活、当前 turn 不判红、后续按电路 | `spike` | `live` | `🆕 新增` | `P4-03 → degraded` | `commit + session log 证据 + run-time` |
| `L3-T09` | `CONTEXT_WINDOW_EXCEEDED` ON 归我方（`compactIfNeeded('context-overflow')`、overflow=1）；OFF 归原生 | `spike` | `live` | `🆕 新增` | `P4-03 → overflow` | `commit + session log 证据 + run-time` |
| `L3-T10` | micro 零改动：`tool-result-pruner` 行/Config/实例/时机全不变、我方只 `ctx.get` 消费 | `spike` | `live` | `🆕 新增` | `P4-04 → micro` | `commit + dump-config + run-time` |
| `L3-T11` | 模型切换 compact：目标窗口装不下 → `MODEL_SWITCH_COMPACTION_FAILED` typed 抛 | `spike` | `live` | `🆕 新增` | `P4-03 → MODEL_SWITCH` | `commit + session log 证据 + run-time` |
| `L3-T12` | 按入口分型失败：pre-step warn+next / request 特抛 / request-error 不抛 / 六码 / summary-error 有进展才 true | `spike` | `live` | `🆕 新增` | `P4-06 → 分型` | `commit + 分型用例 + run-time` |
| `L3-T13` | `state-read-failed` → safety-only degraded（S 线 only、不读 B/H/pinned、不回落默认）；corrupt 文件不被改写 | `spike` | `live` | `🆕 新增` | `P4-06 → safety-only` | `commit + 文件字节 + session log + run-time` |
| `L3-T14` | circuit：session-scoped ephemeral、首次 transient→下 turn 新 episode、两次连续→open、**负断言：open 后纯时间流逝不自动重开**（须新 transient 路径证据） | `spike` | `live` | `🆕 新增` | `P4-03 → circuit` | `commit + 时序 + run-time` |
| `L3-T15a` | `runtime.lastCompaction` 派生（**主路径** `sessionProjections`，P0-10 PASS）：`{at,status,provider,model,shadowedTokenCount,degradedReason}`、同引用抑制（重复 read 返回同一对象引用） | `spike` | `live` | `🆕 新增` | `P6-01 → lastCompaction` | `commit + GET 回包 + run-time` |
| `L3-T15b` | `runtime.lastCompaction` 派生（**fallback 变体**，P0-10 FAIL 时启用）：per-session Map + `session/event` 增量折叠；字段与主路径一致、不落盘、附录登记 | `spike` | `live` | `🆕 新增（条件分支）` | `P6-01 → lastCompaction fallback` | `commit + GET 回包 + run-time`（仅 P0-10 FAIL 时跑） |
| `L3-T16` | `runtime.fill` 5s memo：10 次连续打开面板 measure ≤3 次 | `spike` | `live` | `🆕 新增` | `P6-02 → memo` | `commit + measure 计数 + run-time` |
| `L3-T17` | UI 四态：U1/U2/U3/U4 渲染 + 切换四分类 + 18 key + 4 处条件清理 + 零轮询 | `spike` | `live` | `🆕 新增` | `P5-01..03 → UI` | `commit + 截图/DOM 证据 + run-time` |
| `L3-T18` | 读面 partial-degrade：`measure` 抛错→`fill:null`+`degraded`；projection 抛错→`lastCompaction:null`+warn；GET 200 | `spike` | `live` | `🆕 新增` | `P6-02 → partial-degrade` | `commit + GET 回包 + run-time` |
| `L3-T19` | 大会话读面性能：surface ≥2000 节点的会话，`GET …/async-compact` P95 < 200ms（`-21`⑦ 冻结验收）；5s memo 命中路径同样达标 | `spike` | `live` | `🆕 新增` | `P6-02 → 读面性能` | `commit + P95 计时证据 + run-time` |
| `L3-T20` | `agent/pre-step` 每 turn `measure` 预算 ≤1（`-21`⑤）：`lastEventSeq` 未变 → 0 次；变了 → 恰好 1 次；**伪证**：同一 turn 出现第 2 次 `measure` → RED | `spike` | `live` | `🆕 新增` | `P4-03/P6-02 → 计量预算` | `commit + measure 计数 + run-time` |
| `L3-T21` | `one-active`（`-18`②⑦）：同 session 并发第二个 episode → 未配对 `compaction/start` 锁拒 `busy`、不另造计数器；跨 session 不互锁 | `spike` | `live` | `🆕 新增` | `P4-06 → one-active` | `commit + 并发时序 + run-time` |
| `L3-T22` | arm-freeze（`-18`/`C1`）：arm 时刻冻结摘要包；arm 后 `checkpoint`/transcript churn 不进包；摘要包内容 = freeze 时刻快照 | `spike` | `live` | `🆕 新增` | `P4-05 → arm-freeze` | `commit + 事件序列 + run-time` |
| `L4-T01` | `set_bundle` 开关态跨 `dsh-dev restart` 保持 | `mega` | `live` | `🆕 新增` | `P7-01 → 持久化` | `commit + dump-config 前后 + run-time` |
| `L4-T02` | `async-compact.json`：tmp+rename / 未知 schema 400 且文件不变 / 卸载不删 / 首跑不创建 | `mega` | `live` | `🆕 新增` | `P7-01 → 文件语义` | `commit + 文件字节 + run-time` |
| `L4-T03` | 安装/卸载序列：主包→compaction 包、`dsh plugin add` 自动 dependencies+bundles、卸载反向、卸载不删状态文件 | `mega` | `live` | `🆕 新增` | `P7-02 → 序列` | `commit + profile package.json 前后 + run-time` |
| `L4-T04` | 默认 OFF：`dsh plugin add` 后 `bundles` 含本包但需显式 `set_bundle(false)`（或 install `{enabled:false}`）。**显式区分 install≠enabled**：安装后 `bundles` 成员在、`dump-config` 仍原生 `compaction-basic` active | `mega` | `live` | `🆕 新增` | `P7-02 → 默认 OFF` | `commit + dump-config + run-time` |
| `L4-T05` | 文档同步：`AGENTS.md` 合同节 / 真实化 `README.md` / `RELEASE.md` 行 | `mega` | `live` | `🆕 新增` | `P7-02 → 文档` | `commit + diff + run-time` |
| `L5-T01` | `npm pack --dry-run` 两包含全部运行时产物 | `短途` | `回归` | `♻️ 沿用既有命令` | `P1-01/P7-01 → tarball` | `commit + pack 清单 + run-time` |
| `L5-T02` | 4 个漂移 gate（`route-scan`/`check-route-sensitivity`/`check-feature-contract`/`check-clean-lib`）全绿 + `node --test` 单测全绿（gate 与 test runner 口径分开、不混称「5 gate」） | `短途` | `回归` | `♻️ 沿用既有` | `P3-03/P7-01 → gate` | `commit + 全 exit 0 + run-time` |
| `L5-T03` | 根登记一致：AGENTS.md/README.md/RELEASE.md 与 `package.json` 两包一致 | `短途` | `回归` | `🆕 新增` | `P1-03/P7-02 → 登记` | `commit + diff + run-time` |
| `L5-T04` | grep 断言（限定 `src/client/*.js`/`.jsx` + `lib/` + `index.js`，排除注释行/字符串字面量）：无 `setInterval` / 无 `session/event`→UI 订阅 / compact 请求不写 `max_tokens`/`max_output_tokens` / 无 bare specifier | `短途` | `回归` | `🆕 新增` | `P5/P6 → 红线` | `commit + grep 0 命中 + run-time` |
| `L5-T05` | `-22` banner 植入 + deferral 表逐条登记 | `短途` | `回归` | `🆕 新增` | `P7-03 → 收口` | `commit + diff + run-time` |

### 8.2 复用台账（沿用 / fork 的既有用例明细）

| 既有用例 | 处置 | 改动 | 起跑线状态 |
|----------|------|------|------------|
| `dsh-nano-model-selector/test/imagine-inject.test.mjs` | `♻️ 沿用` | `0 改动`（作为本 AP 回归面，不被 compaction 改动波及） | 已存在，PASS |
| `scripts/check-route-sensitivity.mjs` / `check-feature-contract.mjs` / `check-clean-lib.mjs` / `route-scan.mjs` / `node --test` | `♻️ 沿用` | `0 改动`（仅扩展 `route-scan`/`feature-contract` 的 [DNMS] 行） | 已存在，PASS |
| `npm pack --dry-run` | `♻️ 沿用` | `0 改动` | 已存在，PASS |
| `compaction-basic` 的 durable bracket/事件序列 | `🔱 fork → 我方 Provider` | `+` shrink 校验/`sourceCommandId`/no-cap/六码断言 | 已存在（出厂），PASS |

### 8.3 分层与跑法（各类型在哪跑、何时跑）

| 类型 | 跑法 / 频率 | 主要层 | 触发时机 |
|------|-------------|--------|----------|
| `短途` | 本地 / 每改一组 | `unit`/`契约`/`回归` | 开发中持续 |
| `spike` | journey 用例 | `live`/`集成` | Phase 0 全部 + Phase 4/5/6 收口 |
| `mega` | 长程整合全链 | `live` | Phase 7 L4 |
| `soak` | deterministic × N（race/长稳） | `live(dsh-dev)` | P0-08（已 PASS 则 satisfied）；Phase 7 如需再加 |

### 8.4 测试缺口（本 AP 明确不覆盖什么 + 交给谁）

- 不覆盖 **`dsh.local`（生产）重启/安装**（`-17`/`-19`/`B-12`）→ 交 [业主] 授权后另行；不在本 AP 假装覆盖。
- 不覆盖 **micro (`tool-result-pruner`) 行为变更**（`-13`/`AMEND-2` 严格零改动）→ 无交接地，属于禁区。
- 不覆盖 **`dsh-dev` 之外 profile**（`desktop`/其他 profile 支持属 deferral，见 §11）。
- 不覆盖 **`async-compact.json` 迁移/旧键回退**（`-15`：未知 schema 400、无旧键回退、无双读）。
- 不覆盖 **`ctx.remote.pluginManager` 浏览器半侧授权失败时的 UI 写入口之外路径**（`-20`⑦：失败走 `POST …/switch`）。
- 不覆盖 **UI 像素级 / i18n 文案微调 / `filter` URL 同步 / 两包同 tag 版本断言 / `dsh-dev set_bundle` `applied` vs `restart-required` 细分** → §11 deferral 表。

### 8.5 测试保真（防假绿 · 刻死）

- ✅ 每个 PASS 必带**四元组**证据（`commit + 测试/查询名 + run-time(UTC)`）；**计数 ≠ 价值**。
- ✅ `degraded` 必带机器可读 `reason`（`runtime.degraded` 四值闭集之一）；**不得写成 green**。
- ✅ `pre-existing` 失败必带 **git 证据甩锅**（`git log -1 --oneline -- <file>` + `git diff`），不 silent overclaim。
- ✅ **安全/信任边界项的测试含攻击向量用例**（§7.3）：未授权 `POST /switch`、非法 schema/`B≤H`/`enabled` 残留 PUT、`state-read-failed` 后 safety-only、`/compact` 在我方 Provider 上的 `busy`/`changed`/`persistence`、OFF 态原生恢复、卸载后状态文件残留语义。
- ✅ **防「stored-not-enforced」假绿**：`-15`/`E2` 要求端到端验证——PUT 改 B 后，长会话的 arm 时点确实随新 B 变化（抓 `compaction/start` 的 `totalTokens`），不是「存了但没读」。
- ✅ **防「`completed`=`ready`」假绿**：`B2`/`B3`/`C2` 要求语义成功 = `completed` + `ready` + 非空 ref + 非 recovery；验收计数器按此实现，不只数 lifecycle 终态。
- ✅ **防「毫秒级时序」假绿**：`C3` 要求抓同一 turn 的毫秒级并发时序（freeze 早于 background call、主 dispatch 不等 summary、主线在 async 运行期继续、degraded 不判红）。
- ✅ **防「状态文件写而 runtime 不读」假绿**：`-15`/`R-10`/`B-12`——OFF 态插件零写宿主行 config；GET `runtime.installed/enabled` 必须来自 Host 只读投影，不是 localStorage/状态文件。
- ✅ **防「grep-only 断言」假绿**：`L5-T04` 的 grep 范围限定 `src/client/*.{js,jsx}`/`lib/`/`index.js` 且排除注释行与字符串字面量；负断言类（`setInterval`/事件订阅/bare specifier）必须用「限定范围 0 命中 + 用例层行为断言」双证据，不拿裸 grep 当行为证明。
- ✅ **防「install=enabled」混淆**：`bundles` 成员资格 ≠ 已启用；L4-T04 必须断言「安装后 `bundles` 在、`dump-config` 仍原生 active」两式同时成立，才证默认 OFF。
- ✅ **防「fallback 未走」假绿**：`L3-T15b` 仅 P0-10 `FAIL` 才跑；P0-10 `PASS` 时禁止用主路径证据顶替 fallback 登记，反之亦然。

---

## 9. 风险、依赖与完成后状态

### 9.1 风险与依赖

| 风险 / 依赖 | 描述 | 当前判断 | 应对方式 |
|-------------|------|----------|----------|
| R-01 | `import '@deepseek-ai/dsh-compaction'` 不可解析（`check-clean-lib` + Node 解析双重约束） | `high` | P0-01 实测；FAIL → `-16` 回 QNA，不在本 AP 写降级 |
| R-02 | preset 子行不可寻址（4 group） | `high` | P0-09 实测；FAIL → `-14` 回 QNA |
| R-03 | 互补 `disabled` + `reload()` 非原子（出现双 active / 无 provider） | `high` | P0-03/P0-08 实测；FAIL → `-10`/`-14` 回 QNA |
| R-04 | `ctx.get('toolResultPruner')` isolate realm 不可达 | `medium` | P0-04 实测；FAIL → `-13`「micro 消费」回 QNA |
| R-05 | `ctx.remote.pluginManager` 浏览器半侧未授权 | `high` | P0-06 实测；FAIL → `POST …/switch` 唯一写入口（`-20`⑦） |
| R-06 | HMR 不存在，`set_bundle` 返回 `restart-required` | `medium` | P0-07 实测；FAIL → UI 只渲持久条（`-20`③） |
| R-07 | `ctx.sessionProjections` 第三方插件不可注册 | `medium` | P0-10 实测；FAIL → `-21` per-session Map fallback + 附录登记 |
| R-08 | 摘要模型不可用 / 凭据缺失 / provider incomplete | `medium` | fail-closed、不改状态；`compaction/summary` 诚实记录（`-18`⑤） |
| R-09 | `check-clean-lib` 对 `@deepseek-ai/*` 裸 specifier 0 命中无法满足 | `medium` | 若 P0-01 PASS 则把新包纳入 PLUGINS/UNBUNDLED_INDEX + 白名单；FAIL 回 QNA |
| R-10 | `dsh-dev` launcher 依赖 `~/.dsh-dev/plugins/<pkg>` 目录与 patch `name` 改写 | `low` | P1-01 包目录就位即被 launcher 拾取；INTRODUCTION.md §1.6 |
| R-11 | `async-compact.json` `state-read-failed` 后仍被写 | `medium` | `-18`⑤ safety-only：不写文件；`-15` 未知 schema 400 |
| R-12 | 双币种计量 / 第二分母 | `medium` | `-15` 单条 `fill` + nominal window；`E1`/`-6` |

### 9.2 约束与前提

- **技术前提**：P0-01..09 全部 PASS（或 FAIL 已回 QNA 修订）；`CompactionEngine`/`compactCheckpointSource`/`toolPairingBalanced*`/`frameSummary` 包根导出不变；`ctx.tokenMeter`/`ctx.sessionProjections`/`ctx.llm.stream`/`agent.runMaintenance`/`agent.followup` 可用。
- **运行时前提**：`dsh-dev`（`--home ~/.dsh-dev`）实例可启停、可 `dsh --profile web --dump-config`、可 `dsh-dev restart`；浏览器端 `ctx.remote.pluginManager`（或 `POST …/switch`）写路径可用。
- **组织协作前提**：`dsh plugin --profile web add` 为唯一安装命令；worktree 在 `.agents/worktrees/dnms01-async-compaction`；合并后按 [业主] 要求删除树。
- **上线 / 合并前提**：`-19` L0–L5 全绿 + 四元组证据；`-17` 默认 OFF；三文档同步；banner + deferral；**不授权发布**（版本 bump/tag 另立）。

### 9.3 文档同步要求

- 需要同步更新的设计文档：`docs/specs/dsh-nano-model-selector/async-compaction.md`（`-22` banner + 逐节处置）
- 需要同步更新的说明文档 / README：`docs/specs/dsh-nano-model-selector/README.md`（`-17` 真实化）；`AGENTS.md`（`-19` 合同节）；`README.md`（仓根活跃插件计数）
- 需要同步更新的测试说明：`test/spike/dnms01-async-compaction/` spike 文件若长期保留需 README；`test/compact-policy.test.mjs` 头注
- 涉及面退役时，退役清单必须覆盖代码、注释、头注、行号锚、文档句五类落点：`async-compact.json` `enabled` 字段（`-12`/`AMEND-1`）；`async-compaction.md` §7.4（`-22` 整体作废）/§6 架构 B（SUPERSEDED）/§9 `enabled=false/true`（按 `-19`）；`D1–D6` 待裁决槽（`-22` R-14 已全部覆盖）；`cordis.patch.yml` 旧读法（`AMEND-3` `set_plugin`→`set_bundle`）。

### 9.4 完成后的预期状态

1. `dsh-dev` 上两包就位：`dsh-nano-model-selector` `0.3.0` + `dsh-nano-model-selector-compaction` `0.1.0`，默认 OFF，`async-compact.json` 首跑不创建。
2. ON 态：`/compact`/auto/overflow 全走我方 `CompactionEngine` 子类，durable 协议合规，micro 严格零改动，`async-compact.json` 是唯一可写权威。
3. OFF 态：`compaction-basic` 回 active、原生 `auto`/Config/`/compact` 全部回来，插件零写宿主行。
4. UI：rail 第 4 图标 + `filter='compact'` 面板（U1–U4）+ 切换四分类 + 零轮询。
5. 观测：`runtime.{fill,lastCompaction,degraded}` 派生 + `sessionProjections`（或登记 fallback）+ L0–L5 全绿 + `-22` banner + deferral 表。

---

## 10. 收口（Definition of Done = 测试台账全 PASS 映射）

### 10.1 收口硬闸

所有 `mega + soak + 退出层` 测试项必须 **PASS 且四元组证据齐全**：

1. `-19` L0–L5 全绿（由 `L0-T01..L5-T05` 证明）
2. `T-R-01`..`T-R-10` verdict 全部落定；`P0-01`/`P0-03`/`P0-09` 任一 FAIL 则对应 AP 阻塞回 QNA（由 `P0-T01..T10` 证明）
3. ON 态 `/compact`+auto+overflow 全走我方 Provider、OFF 态原生完整回来（由 `L2-T01/T02`、`L3-T01..T14` 证明）
4. `async-compact.json` 唯一 canonical + `bundles` 唯一开关 canonical（由 `L0-T05`、`L4-T01/T02` 证明）
5. 三文档同步（`AGENTS.md`/`README.md`/`RELEASE.md`）+ `-22` banner + deferral（由 `L4-T05`、`L5-T03`/`T05` 证明）

### 10.2 收口映射表（收口目标 ↔ Test-ID ↔ 证据）

| 收口目标 | 工作项 | Test-ID | PASS 证据（四元组）| 状态 |
|----------|--------|---------|---------------------|------|
| T-R 全落定 | P0-01..10 | `P0-T01..T10` | commit + spike + run-time | `未观察`（执行后回填） |
| 包骨架 + 两包 | P1-01..03 | `L5-T01/T03` | commit + pack + run-time | `未观察` |
| 策略引擎 L0 | P2-01 | `L0-T01..T06` | commit + node --test + run-time | `未观察` |
| 路由契约 L1 | P3-01..03 | `L1-T01..T03` | commit + contract spike + run-time | `未观察` |
| Provider+调度 L3 | P4-01..06 | `L2-T01/T02` + `L3-T01..T14` + `L3-T20/T21/T22` | commit + session log + run-time | `未观察` |
| UI L3 | P5-01..03 | `L3-T17` + `L5-T04` | commit + DOM 证据 + run-time | `未观察` |
| 观测派生 L3 | P6-01..02 | `L3-T15a/T15b/T16/T18/T19` | commit + GET 回包 + run-time | `未观察` |
| 收口 L4/L5 | P7-01..03 | `L4-T01..T05` + `L5-T01..T05` | commit + gate/diff + run-time | `未观察` |

### 10.3 Definition of Done

| 维度 | 完成定义 |
|------|----------|
| 功能 | 四条要求 + 一个按钮全部兑现；ON/OFF 两态均完整可用；micro 零改动；full 单 Provider 内部模式 |
| 测试 | §8 测试台账全 PASS（退出硬闸项四元组齐全）；`T-R` 全落定 |
| 文档 | `AGENTS.md` 合同节 + 真实化 `README.md` + `RELEASE.md` 行 + `async-compaction.md` banner + 本 AP §11 deferral |
| 风险收敛 | 9 项 `P0-EMPIRICAL` verdict 全部登记；FAIL 项回 QNA 修订而非降级；零触碰 `dsh.local` |
| 可交付性 | `npm pack --dry-run` 两包含全部运行时产物；`dsh plugin --profile web add` 序列成立；默认 OFF |

### 10.4 NOT-成功识别

> 任一退出硬闸测试 `degraded / 未观察` ⇒ **不得标 `executed`**；按 closure 五态（`verified / observed-OK-at-closure / partial / 未观察 / deferred`）如实归类 + handoff，不 silent overclaim。P0 任一 `FAIL` 且未回 QNA ⇒ 整体 `partial` 不得收口。

---

## 11. 附录：deferral / out-of-scope / 条件分支登记

> 按 `-22`⑤ 逐条登记。**不在本表假装覆盖**。

| 项 | 判定 | 依据 | 重评条件 |
|----|------|------|----------|
| UI 像素级细节（间距/圆角/对齐微调） | `defer` | `-22`⑤ | UI 实测后微调 |
| i18n 文案微调（18 key 的具体措辞） | `defer` | `-22`⑤ | 文案评审后微调 |
| 后续 profile 支持（desktop / 其他 profile） | `defer` | `-17`/`B-12` | [业主] 另行授权 |
| `filter` URL 同步（现无此机制） | `defer` | `-22`⑤ 附条件待测 | P0 附条件项实测后登记 |
| 两包同 tag 版本断言 | `defer` | `-22`⑤ 附条件待测（本仓无 git tags） | 本仓引入 tag 流程 |
| `dsh-dev` `set_bundle` `applied` vs `restart-required` 细分 | `defer` | `-22`⑤ 附条件待测 | P0-07 实测后登记 |
| `ctx.sessionProjections` 第三方注册失败时的 per-session Map fallback | `条件分支` | `-21`①（已作为条件写入 `-21`，不再单列 defer） | P0-10 `FAIL` 时启用并在本表登记 |
| `enabled` 字段 / `enabled=false` 回退 / 兼容键 / 投影回宿主 config | `out-of-scope` | `-12`/`AMEND-1`/`AMEND-3` | 无（除非回 QNA） |
| `dsh.local` 重启/安装/profile 改写 | `out-of-scope` | `-17`/`-19`/`B-12` | [业主] 另行授权 |
| 版本 bump/tag/release | `out-of-scope` | `-19`⑤ | [业主] 单独授权 |
| micro (`tool-result-pruner`) 三 Config 值/实例/触发时机 | `out-of-scope` | `-13`/`AMEND-2` | 无 |
| Host `Config` schema / `configEditor` | `out-of-scope` | `-11`/`-12`/`AMEND-3` | 无 |

> `T-O` 1:1 CITE 已并入 §2.1（`-22`③ 位置判据），不再单设附录。
