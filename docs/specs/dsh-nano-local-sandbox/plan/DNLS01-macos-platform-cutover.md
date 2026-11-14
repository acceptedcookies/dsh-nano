# DNLS01 行动计划

> 服务业务簇: `dsh-nano-local-sandbox` / `[DNLS]`
> 计划对象: `DNLS01` macOS 首期平台切割（kitesurf 为第一份 deploy profile）
> 类型: `migration`
> 作者: `DNLS01 架构 agent（lead）`
> 时间: `2026-11-14`
> 文件位置: `docs/specs/dsh-nano-local-sandbox/plan/DNLS01-macos-platform-cutover.md`
> 上游前序 / closure:
> - [`qna/DNLS01-qna.md`](../qna/DNLS01-qna.md) 全轮 `frozen`（2026-11-14）；§1 `T-O-1`–`T-O-18` 是本计划唯一 CITE 源
> 下游交接:
> - 本计划的执行（实现本身不是本文）；U10 的 NVX / 未来 profile 在本计划收口前不得开工
> 关联设计 / 调研文档:
> - [`dsh-nano-local-sandbox-v1.1.md`](../dsh-nano-local-sandbox-v1.1.md)（设计草案；与 `T-O-8` 冲突处以 QNA 为准）
> - [`dsh-nano-local-sandbox-v0.9.md`](../dsh-nano-local-sandbox-v0.9.md)（事实基线，`T-O-5` 可继承）
> 冻结决策来源:
> - [`qna/DNLS01-qna.md`](../qna/DNLS01-qna.md) §1（只读引用；本计划不填写 Q/A，不改已冻结行）
> grounding 来源:
> - 锚点提交 `7a49a07`。审查时已提交 HEAD 曾是它的后代 `8d14f6c`（未改本计划点名的符号）。行号以路径 + 符号名为准，不把未提交脏树的行号写进来
> 关联 reference-anchor:
> - 无独立 eval-reference-anchor。§7 是本计划的 grounding 真源
> 对抗审查（已回写，未改 QNA）:
> - `.anote/reviews/dsh-nano-local-sandbox/DNLS01/na/4827/qna-compliance.md`
> - `.anote/reviews/dsh-nano-local-sandbox/DNLS01/na/4827/exit-and-antigreen.md`
> 文档状态: `reviewed`

---

## 0. 执行背景与目标

[业主] 已冻结：`[DNLS]` 是 macOS 上唯一持有 Apple `container` 特权的平台；`[DNK]` 退化为前端消费者 + CDP 对接；`[DNT]` 用现有 `McpLane` 接 sandbox 终端，不另起平台、不加专有 lane。QNA 只钉真相，没有创建包、没有改代码。本计划把 `T-O-9`–`T-O-18` 落成可执行的切割顺序、文件落点和可证伪的测试。

`v1.1` 里的 façade、双轨开关、双写、别名（`§1.5 Q5`、`:1077`、`:1087`、C6-4、C7-2）已被 `T-O-8` / `T-O-10` 作废。`v1.1` 的时序护栏仍然有效：合同与驱动先于消费者删除（`v1.1:968`），门禁先于对等验收（`T-O-18`）。本计划不重新打开这些决定。

- **服务业务簇**：`[DNLS]`（包 `dsh-nano-local-sandbox`）
- **计划对象**：`DNLS01-macos-platform-cutover`
- **本次计划解决的问题**：
  - 容器特权、镜像 pin、实例、CDP socket、历史真源今天都散在 `[DNK]` 单例里（`lib/container-engine.js`、`index.js` 的 `execFile('container')`、`lib/engine.js` 的模块级 `live`）
  - `[DNK]` 与 `[DNT]` 没有一份登记过的平台契约；`kitesurf_*` 工具数、路由数、错误目录三处不一致
  - 仓级路由门禁当前不能作为切割依据：`scripts/route-scan.mjs` 把 8 条路由烤死，实解析 24 条
- **本次计划的直接产出**：
  - 可安装的宿主插件 `[DNLS]`，第一份 profile `kitesurf`（`scope: session`），四个 L2 面
  - `[DNK]` / `[DNT]` 的一次性硬切（无 façade、无双轨、无别名）
  - 三道既有门禁 `exit 0`、对等 e2e、七类增量验收、U9 初值与 U10 defer 的登记
- **本计划不重新讨论的设计结论**：
  - 独立 overlay 插件，不实现 `SandboxProvider`，不替换 `ctx.shell` / `ctx.fs` / `ctx.subprocess`（`T-O-9` / Q1）
  - 硬切 + 彻底退役，三段时序，无第四段兼容层（`T-O-10` / Q2）
  - 模型走 skill → `sandbox_*`；UI 直连 HTTP/CDP；禁止第三条通道（`T-O-11` / Q3）
  - `scope` 必填；首期 kitesurf 为 `session`；不广告 `sandbox_permissions`（`T-O-12` / Q4）

---

## 1. 执行综述

### 1.1 总体执行方式

八段，顺序锁死为：**先让 `[DNLS]` 独立跑通（不动 `[DNK]` / `[DNT]` 的源码）→ 门禁对「当时的真实路由」转绿 → 对等验收 → 一次性硬切 → 文档与 defer 登记**。这是 `T-O-10` 的 ①②③ 加上 `T-O-18` 的「门禁早于 ②」。执行中不论证「要不要兼容」；兼容策略已经作废。

时序里有一条必须写明的分工，否则 ① 和「零残留」会互相打架：

| 时点 | 允许的树 | 门禁 / 残留的含义 |
|---|---|---|
| ① 与 ② 之前 | `[DNK]` 容器代码还在 | 门禁绿 = 扫描器数对**真实**路由，台账与代码一致，`[DNLS]` 与 `[DNT]` 已入扫描。不是「旧名字已经消失」 |
| ② 对等验收 | 同上。验收打的是 `[DNLS]` 的新端点 | 20/20 行为对等 + 增量里**不依赖删旧码**的六类。零残留不在这一步装成通过 |
| ③ 硬切之后 | `[DNK]` 容器资产已删 | 零残留、`proc:kitesurf` 删除、门禁再跑一次。此时失败 = 切割失败，不是「再开一条兼容路由」 |

### 1.2 Phase 总览

| Phase | 名称 | 规模 | 目标摘要 | 依赖前序 |
|------|------|------|----------|----------|
| Phase 1 | 插件身份与 backend 接口 | M | 建包、登记 inject、冻结 11 项 backend 签名；NVX 只有会失败的空实现 | - |
| Phase 2 | profile 与构建配方 | L | `profiles/kitesurf` 成为版本 / digest 的唯一权威；构建走 `confine` | Phase 1 |
| Phase 3 | 实例、policy、状态 | XL | per-session 实例、fingerprint、单份 history、空闲回收 | Phase 2 |
| Phase 4 | 四个 L2 驱动 | XL | `sandbox_*`、HTTP、CDP keeper、terminal；仍不改消费者 | Phase 3 |
| Phase 5 | 错误目录与三门禁 | L | 一份 `ERROR_CATALOG`；门禁在硬切前转绿 | Phase 4 |
| Phase 6 | 独立跑通与对等验收 | L | `[DNLS]` 不 import `[DNK]` 而跑通；e2e 打新端点 | Phase 5 |
| Phase 7 | 一次性硬切 | XL | 删 `[DNK]` 容器资产；改 `[DNK]` client / skill；改 `[DNT]` 帧与 attach | Phase 6 |
| Phase 8 | 发布姿态与 defer | S | 三份 `AGENTS.md`、仓根清单、`README.md:3`、U10 台账 | Phase 7 |

> 规模只帮助阅读，不是开工闸。

### 1.3 Phase 说明

1. **Phase 1 — 插件身份与 backend 接口**
   - **核心目标**：仓里出现一个不依赖 `[DNK]` 源码的插件骨架，backend 签名能同时装下 Apple 与「会明确失败的 NVX」。
   - **为什么先做**：profile 字段和 instance 记录都要调用这组签名（`T-O-9`，`v1.1` C1 先于 C2）。
2. **Phase 2 — profile 与构建配方**
   - **核心目标**：镜像基线、npm pin、checkout ref、digest 只出现在 `profiles/kitesurf/profile.yaml`。
   - **为什么放在这里**：实例绑定的是 `profileVersion`（`T-O-13`）。没有 manifest 就没有合法的 `ensure`。
3. **Phase 3 — 实例、policy、状态**
   - **核心目标**：`ensure` 幂等；mode 变化只返回 `policy-stale`；history 不再双写。
   - **为什么放在这里**：驱动需要 `instance.endpoints` 和 per-instance socket（`T-O-14`、`T-O-16`）。
4. **Phase 4 — 四个 L2 驱动**
   - **核心目标**：四个对外面都由 `[DNLS]` 提供，工具名与路由前缀已经是新契约。
   - **为什么放在这里**：`T-O-10` 禁止先拆消费者再补平台。
5. **Phase 5 — 错误目录与三门禁**
   - **核心目标**：三道既有门禁对「切割前的真实树」`exit 0`。
   - **为什么放在这里**：`T-O-18` 写明无回退路径时，门禁未绿不得进入 ②，更不得进入 ③。
6. **Phase 6 — 独立跑通与对等验收**
   - **核心目标**：同一类页面行为在 `[DNLS]` 后端上通过；证据不是旧 `/nano-kitesurf/*` 套件的绿灯。
   - **为什么放在这里**：这是 `T-O-10` 的 ②。不过则不准删旧码。
7. **Phase 7 — 一次性硬切**
   - **核心目标**：消费者不再持有容器特权，旧名字在运行时代码与台账中为零。
   - **为什么放在这里**：`T-O-10` 的 ③。没有第四段。
8. **Phase 8 — 发布姿态与 defer**
   - **核心目标**：人读到的清单与包内容一致；U10 有台账行；U9 只留「改数字不改字段」的口子。
   - **为什么放在这里**：提前改 `README` 会把尚未切完的树说成已完成。

### 1.4 执行策略说明

- **执行顺序原则**：① 平台自洽 → 门禁对真实树转绿 → ② 对新端点对等 → 快照 commit + tarball 清单落盘 → ③ 一次删除。禁止「先删 `[DNK]` 再补 `[DNLS]`」。禁止双轨开关。
- **风险控制原则**：容器 CLI、宿主目录挂载、CDP `evaluate`、未鉴权 WS 都按 §7.3 的攻击用例验收，不按 happy path 收口。构建步骤没有 `ctx.sandbox.confine` 的记录就不得 spawn。
- **测试推进原则**：短途（schema / 门禁 / grep）每改一组就跑；spike 在 Phase 6 前跑通「单实例 ensure + 一条 CDP + 一条假终端」；mega 是 Phase 6 的对等套件；soak 是 Phase 7 之后的退出硬闸（§8.3）。
- **文档同步原则**：插件自己的 `AGENTS.md` 在 Phase 1 写成「宿主插件、无第二 UI」。仓根插件清单、`[DNK]`/`[DNT]` 的交付物表、`README.md:3` 在 Phase 7–8 与代码同一批改完。不改 QNA 已冻结行。
- **回滚 / 降级原则**：无运行时回退开关。Phase 7 开工前必须有一份快照 commit，以及三包 `npm pack --dry-run` 的文件清单（`T-O-18` ③）。切割后发现对等失败，恢复手段是回到该 commit，不是把 `/nano-kitesurf/*` 加回来。

### 1.5 本次 action-plan 影响结构图

```text
DNLS01-macos-platform-cutover
├── Phase 1–4  [DNLS] 新包（不改消费者源码）
│   ├── dsh-nano-local-sandbox/          宿主插件，无第二套 UI
│   ├── profiles/kitesurf/               镜像配方 + manifest
│   ├── profiles/terminal/               真 PTY，替代 dnt-agent stub
│   └── backend-apple / backend-nvx      spawn('container') 只在 apple
├── Phase 5  仓级台账（描述真实树，先不删旧路由）
│   ├── scripts/route-scan.mjs
│   ├── scripts/check-clean-lib.mjs
│   └── security/{route-sensitivity,feature-contract,route-inventory}
├── Phase 6  验收套件打 /nano-local-sandbox/*
│   └── dsh-nano-local-sandbox/test + 从 e2e-ego fork 的对等脚本
└── Phase 7–8  硬切
    ├── dsh-nano-kitesurf/               删容器资产；client 改指新前缀；skill 改写
    ├── dsh-nano-terminal/               attach.url、pong、删 isolate / stub
    ├── AGENTS.md / README.md            清单与「三个插件」表述
    └── security/accepted-risks.json     只追加 U10 defer 行
```

---

## 2. In-Scope / Out-of-Scope

### 2.1 In-Scope（本次 action-plan 明确要做）

- **[S1]** 新建 `dsh-nano-local-sandbox`（id `nano-local-sandbox`，缩写 `[DNLS]`），四个 L2 面：`sandbox_*` MCP、`/nano-local-sandbox/*` HTTP、CDP driver、terminal driver。
- **[S2]** 把 kitesurf 的镜像与生命周期做成 `scope: session` 的 profile；实例、fingerprint、KV/D1 卷、CDP socket 都 per-instance。
- **[S3]** 门禁修复（三道，不新增第四道）+ 硬切：`[DNK]` 失去容器特权，`[DNT]` 用现有 `McpLane` 接 `[DNLS]`，旧工具名 / 旧路由前缀 / `proc:kitesurf` 在 §8.6 规定的扫描根里为零。
- **[S4]** U9 初值写进 profile（测试读声明值，不读魔法数）；U10 写入 `security/accepted-risks.json` 的 defer 行。

### 2.2 Out-of-Scope（本次 action-plan 明确不做）

- **[O1]** NVX / Windows 的真实 backend、xray / gateway / 本地 S3 profile（`T-O-1`、`T-O-18` ④ U10）。Phase 1 的 NVX 文件只允许「调用即失败」，用来证明 L2 不必改。
- **[O2]** `/nano-kitesurf/*` façade、双轨开关、`kitesurf_*` 别名、`KITESURF_CHECKOUT` / `config.checkout` 兼容键、history 双写、复用 `nano-kitesurf.lock.json`（`T-O-8`、`T-O-10`、R-5）。
- **[O3]** `SandboxProvider`、第四档 `SandboxMode`、`sandbox_permissions`、`[DNT]` 专有 `sandbox` lane、任何新的 release-gate（`T-O-6`、`T-O-17`、`T-O-18`）。
- **[O4]** 改 `[DNK]` Design Mode / note 预算 / 点选语义；拆掉 `[DNT]` `local` lane；改写已冻结的 QNA 正文。

### 2.3 边界判定表

| 项目 | 判定 | 理由 | 重评条件 |
|------|------|------|----------|
| kitesurf profile = `session` | `in-scope` | `T-O-12` 已否定 `v1.1:149` 的首期 shared | 无。要改必须追加 QNA 修订 |
| registry 同时接受 `shared` 声明 | `in-scope` | `T-O-12`：L1 不硬编。本计划不交付第二份 shared profile，只交付拒绝「写死 session」的测试 | 真要 shipped shared profile 时另开计划 |
| U9 数字（cpu / 内存 / 超时 / 上限 / 预热） | `in-scope` 的初值，`defer` 的再调参 | `T-O-18` ④：具体数值是本计划的实施细节，不是 OPEN 残题 | 只改 profile 字面量且 §8 的测试仍读声明值 |
| U10 NVX 与未来 profile | `defer` | `T-O-1` + `T-O-18` ④；触发条件仍是 `v1.1 §5.7` 三条同时成立 | `[业主]` 明确进入 Windows 阶段 |
| `[DNK]` 的 `lastPick` / context | `in-scope` | `T-O-11` 把 client 的全部 `fetch` 改到 `/nano-local-sandbox/*`。领域态留在 `[DNK]` 进程内，不新开 HTTP 前缀 | 不造 `/dsh-nano-kitesurf/*`，也不恢复旧前缀 |
| `[DNT]` `audit.jsonl` | `in-scope` | `T-O-18` ②：收归 `[DNLS]` 一份。`local` 的 open/close/attach 写入这一份，不另留文件 | 不把「不再审计 local」当成收口 |
| 假 NVX backend 的接口测试 | `in-scope` | `T-O-9` 执行说明第 6 条 / `v1.1` G8。不是 U10 的实现 | U10 开工时替换空实现，不改 L2 测试夹具 |
| 无关的 notepad 断链 | `out-of-scope` | 与本切割无关 | 不在本计划「顺手修」 |

**U9 初值（写进 `profiles/kitesurf/profile.yaml`，测试从文件读，不在断言里再写一遍）：**

| 字段 | 初值 | 从哪来 | 不是什么 |
|---|---|---|---|
| `isolation.resources.cpus` | `4` | 现行 `createArgs`（`dsh-nano-kitesurf/lib/container-engine.js:40`） | 不是新的平台默认值；换 profile 可以不同 |
| `isolation.resources.memory` | `4G` | 同上 | 同上 |
| `lifecycle.idleTimeoutMs` | `1800000` | `T-O-14` 点名的 `[DNT]` 先例（`dsh-nano-terminal/src/host/sessions.js:20`） | 回收测试用**另一份**短超时 profile，禁止睡 30 分钟 |
| `lifecycle.maxInstances` | `2` | 本计划为了让「上限拒绝」可被构造。双会话用例占用 2；再 `ensure` 第 3 个必须失败 | 不是容量承诺。调高这个数字不得改测试代码 |
| 预热 | 无隐式预热 | `ensure` 是唯一创建路径 | 测试里出现「启动插件就有容器」即失败 |
| `policyMapping` 三档 | 形状沿用 `v1.1 §5.3` 草案的三行（只读 / workspace 可写 / 容器内无宿主围栏） | `T-O-13` 把三档列为必填 | 挂载的宿主路径仍由当次 `resolve` 决定，不写死在 YAML 里 |

**fingerprint 算法（实施细节，避免各写各的）：** SHA-256，输入为 UTF-8 的稳定 JSON：键顺序固定为 `sessionId`、`mode`、`workspaceRoot`、`extraRoots`；`extraRoots` 按字典序；不含其它字段。`scope: session` 时缺 `sessionId` 直接拒绝，不用空串凑哈希。

**路由怎么搬（服从 `T-O-11`，不新造前缀）：** 现行 24 条 `/nano-kitesurf/*` 全部删除，不留 308，不改名到别的前缀。引擎、诊断、perf 快照与 perf 上报改由 `[DNLS]` 提供同名资源，路径前缀只有 `/nano-local-sandbox/`。`lastPick`（`index.js:51`）和 composer context ref 留在 `[DNK]` 进程内存里：点选结果来自 `[DNLS]` 的 pick 响应，面板自己记住，不再为它们单开路由。

---

## 3. 业务工作总表

| 编号 | 所属 Phase | 工作项 | 类型 | 涉及文件（file:line） | 收口目标 | 测试映射（Test-ID） | 风险 |
|------|------------|--------|------|------------------------|----------|----------------------|------|
| P1-01 | Phase 1 | 包身份 | add | 新建 `dsh-nano-local-sandbox/package.json`；对照 `dsh-nano-kitesurf/package.json:42-57`、`cordis.patch.yml:3-5` | 包名 / id / 引擎范围与现仓插件一致；`files` 不含 `linux-prefix/` | `DNLS01-T01` | medium |
| P1-02 | Phase 1 | inject 与特权登记 | add | 新建 `index.js`；对照 `dsh-nano-kitesurf/index.js:20-21` | inject 只有 `webServer` `connection` `sandboxPolicy` `sandbox` `sessions`；无消费者名 | `DNLS01-T01` `DNLS01-T03` | high |
| P1-03 | Phase 1 | backend 接口 + 两实现 | add | 新建 `src/host/backend.js`、`backend-apple.js`、`backend-nvx.js`；能力表 `v1.1 §5.2` | 11 个方法两边都有；NVX 调用抛明确未实现；L2 夹具无 Apple 名词 | `DNLS01-T02` | high |
| P2-01 | Phase 2 | manifest 校验器 | add | 新建 `src/host/profile-registry.js`、`profiles/kitesurf/profile.yaml` | 缺字段、`latest`、caret、坏 digest、`container machine` 都拒绝加载 | `DNLS01-T04` `DNLS01-T05` | high |
| P2-02 | Phase 2 | 配方搬迁 | migrate | 源：`dsh-nano-kitesurf/runtime/Dockerfile:1-39`、`entrypoint.sh:1-34`、`mcp-bridge.mjs:163` | 配方只在 `profiles/kitesurf/`；Alpine 禁令注释仍在 | `DNLS01-T05` `DNLS01-T22` | medium |
| P2-03 | Phase 2 | 构建 confine | add | 新建构建入口；威胁模型 §7.3 | 构建 argv 必经 `ctx.sandbox.confine`；confine 不可用则失败关闭 | `DNLS01-T06` `DNLS01-T23` | high |
| P3-01 | Phase 3 | instance registry | add | 新建 `src/host/instance-registry.js`；行为来源 `lib/nano-kite.js:31` `adopt` `:104` `degrade` `:115` | `ensure` 幂等；相位错误不创建第二份；`adopt`/`degrade` 按实例 | `DNLS01-T07` | high |
| P3-02 | Phase 3 | policy adapter | add | 新建 `src/host/policy-adapter.js` | fingerprint 只含四元组；不等则 `sandbox.instance.policy-stale` + `expectedFingerprint`；无热改挂载 | `DNLS01-T08` `DNLS01-T23` | high |
| P3-03 | Phase 3 | state service | add | 对照并取代 `lib/history.js:4-16` 与 `index.js:640`、`:1016-1019` | 每个实例一份 history；无 `history.jsonl` 第二写者 | `DNLS01-T09` | high |
| P3-04 | Phase 3 | 回收与端点 | add | 对照 `src/host/sessions.js:20`、`:108`；端口来源 `container-engine.js:40-41` | 声明的 `maxInstances` 生效；空闲回收会停容器；端点无 8787/8791 硬编 | `DNLS01-T10` | high |
| P4-01 | Phase 4 | MCP `sandbox_*` | add | 源工具表 `runtime/mcp-bridge.mjs:163-254`、`answerNativeTool` `:272` | `tools/list` 恰好 Q7 的 20 个名字 + `agent_browser_*`；零 `kitesurf_*`；不读宿主推送的快照 | `DNLS01-T12` | high |
| P4-02 | Phase 4 | HTTP 面 | add | 对照 `index.js:23-46`、`registerRoutes` `packages/dsh-host-route-guard/src/route-guard.js:159` | 全部 `/nano-local-sandbox/*` 经 `registerRoutes`；`sessionBinding: true`；WS 有等价鉴权 | `DNLS01-T13` `DNLS01-T23` | high |
| P4-03 | Phase 4 | CDP keeper | add | 取代 `lib/engine.js:207` `live`、`:369` `verifiedBase`、`:499` `useLive` | 一实例一 socket；断开只影响该实例；`page-lost` 或按 `lastUrl` 恢复 | `DNLS01-T14` | high |
| P4-04 | Phase 4 | terminal driver | add | 形状源 `dsh-nano-terminal/src/host/mcp.js:11-82`；stub `crates/dnt-agent/src/main.rs:5-6` | 8 工具 schema 含 `additionalProperties:false`、`lines≤500`、`cols/rows` 2..512；只返回 `attach.url`；PTY 在 `profiles/terminal/` | `DNLS01-T15` | high |
| P5-01 | Phase 5 | ERROR_CATALOG | migrate | 源 `lib/diagnostics.js:41`、`:72`；缺行见 §7.1 A-20 | 7 个 `kitesurf.*` 保留前缀；2 个 `sandbox.*` 各一行；四处派生命名同一模块 | `DNLS01-T16` | high |
| P5-02 | Phase 5 | 门禁对真实树转绿 | update | `scripts/route-scan.mjs:210-229`；`scripts/check-clean-lib.mjs:28-35` | 不再烤死 8；扫描含 `[DNLS]` 与 `[DNT]`；三门禁 `exit 0`；不新增门禁脚本 | `DNLS01-T17` | high |
| P6-01 | Phase 6 | 独立跑通 | add | `[DNLS]` 运行路径不得 import `dsh-nano-kitesurf` | 不加载 `[DNK]` 也能 `ensure` kitesurf profile | `DNLS01-T11` `DNLS01-T18` | high |
| P6-02 | Phase 6 | 对等 + 六类增量 | add | fork `dsh-nano-kitesurf/scripts/e2e-ego.mjs` | 新套件的 base 只有 `/nano-local-sandbox/`；旧套件绿灯不算数 | `DNLS01-T18` `DNLS01-T19` | high |
| P6-03 | Phase 6 | 切割前快照 | migrate | 三包 `npm pack --dry-run` | 清单文件写入测试产物目录；没有这份清单，Phase 7 不得开始 | `DNLS01-T22` | medium |
| P7-01 | Phase 7 | 删除 `[DNK]` 容器资产 | remove | `lib/container-engine.js`、`lib/nano-kite.js`、`runtime/Dockerfile`、`runtime/entrypoint.sh`、`runtime/mcp-bridge.mjs`、`package.json` 里这五行；`lib/dom.js` 留在 `files`。`lib/history.js` / `lib/diagnostics.js` 只在 `[DNK]` 不再 import 之后单独删行。`index.js:429` | 全仓运行时代码里 `spawn('container'` / `execFile('container'` 只在 `backend-apple.js` | `DNLS01-T11` `DNLS01-T20` | high |
| P7-02 | Phase 7 | `[DNK]` client 与 skill | update | `src/client/index.js:12-28`、`lib/skill.js:212`、`skills/*/SKILL.md` | fetch 指向新前缀；技能由 `skill.js` 生成；无 `__nks` 跨插件总线 | `DNLS01-T16` `DNLS01-T20` | high |
| P7-03 | Phase 7 | `[DNT]` 契约对齐 | update | `src/host/mcp.js:109`、`index.js:65-67`、`src/host/ws.js:69`、`src/client/lanes.js:17-22`、`:140`、`:202`、`:253` | `attach.url`；pong 为 `0x0A`；不调用现成的 `streamBase()` 去拼路径；无 isolate；无 sandbox lane；`local` 审计并入 `[DNLS]` | `DNLS01-T15` `DNLS01-T20` | high |
| P7-04 | Phase 7 | 台账删旧能力 | remove | `security/route-sensitivity.json:441`、`:532` | `proc:kitesurf` 与 `/nano-kitesurf/` 行删除；门禁再次 `exit 0` | `DNLS01-T17` `DNLS01-T20` | high |
| P8-01 | Phase 8 | 人读文档 | update | `AGENTS.md:23-29`、`README.md:3`、三包 `AGENTS.md` | 清单含 `[DNLS]`；`[DNK]` 交付物表不再列容器引擎 | `DNLS01-T01` `DNLS01-T22` | low |
| P8-02 | Phase 8 | U10 defer 行 | add | `security/accepted-risks.json` 的 `risks` 数组末尾 | 四行 defer：NVX、xray、gateway、local-s3；既有 `fingerprint` 一个不改 | `DNLS01-T25` | low |

---

## 4. Phase 业务表格

### 4.1 Phase 1 — 插件身份与 backend 接口

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P1-01 | 包身份 | a) `name` = `dsh-nano-local-sandbox`，`engines.dsh` 抄 `dsh-nano-kitesurf/package.json:42-43`，不放宽。b) `exports` 只有 `.`、`./package.json`、图标与 locale；没有浏览器 UI 入口，除非 Phase 1 的安装探针证明宿主拒绝无 client 的包。c) 若探针失败：加一个零 slot、零 fetch 的 client，并在 `AGENTS.md` 写明它不是第二个产品面。d) `files` 白名单；`linux-prefix/` 不在其中 | 新建包；装配样例 `dsh-nano-kitesurf/cordis.patch.yml:3-5` | `npm pack --dry-run` 清单与白名单一致 | `DNLS01-T01` `DNLS01-T22` | 包能被指出「id = nano-local-sandbox」 |
| P1-02 | inject | a) `export const name = 'nano-local-sandbox'`（与 `[DNK]` 一样，JS `name` 是 id，cordis `name` 才是包名）。b) inject 五元组见 §3，顺序固定，测试按集合断言。c) `apply` 只 `registerRoutes`，不直接 `ctx.webServer.register`。d) 插件 `AGENTS.md` 写明特权：容器 CLI 与构建 confine；不写消费者的路径 | `dsh-nano-kitesurf/index.js:20-21` 是反例（id 与容器特权绑在同一插件） | grep inject 数组无 `kitesurf` / `terminal` / `notepad` | `DNLS01-T01` `DNLS01-T03` | 特权只出现在本包文档与 `backend-apple` |
| P1-03 | backend | a) 与 `v1.1 §5.2` 的 11 行同名。`start` / `stop` / `restart` 是三个方法，连同 `ensureImage` `create` `inspect` `exec` `publish` `mount` `networkPolicy` `identity` `stateVolume` `capabilities` 一共 13 个方法。公开参数只用 `image/mounts/ports/resources/network/identity`，出现 `container` `vmnet` `virtiofs` `kitesurf` 时构造函数抛错。b) `backend-apple.js` 是本包里唯一允许出现 `spawn('container'` 或 `execFile('container'` 的文件；Phase 1 可以先把命令拼好，不在本 Phase 启动真实容器。c) `backend-nvx.js` 除 `capabilities()` 外每个方法 reject，错误码 `backend.nvx.unimplemented` 只是内部异常，不进 `ERROR_CATALOG`，也不当 HTTP/MCP 的 `errorId`。`capabilities()` 的键与 apple 实现相等。d) 同一份 L2 夹具喂两个实现 | 能力表 `v1.1:606-622`；现行拼参 `container-engine.js:38-52` | 只 grep 夹具、或只数 capabilities 键，不算通过 | `DNLS01-T02` | G8 的「假 backend」在这一项就已经成立 |

### 4.2 Phase 2 — profile 与构建配方

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P2-01 | 校验器 | a) 必填集 = `T-O-13` 那一组，无默认值。b) `npmPrefix` 只接受精确版本，拒绝 `4` 这种浮动（现行 Dockerfile 注释是 `wrangler@4`，搬迁时收成锁文件里的精确版本并写入 manifest）。c) `digest`、checkout `ref`、`verify` 路径任一失败 → 该 profile 不可 `list` 为 ready。d) 静态扫描配方目录：出现 `container machine`、`latest`、`curl | sh` 即拒绝。e) `platform: [darwin/arm64]`，`backend: apple-container`，`scope: session` | `Dockerfile:8-10` 的浮动 pin；`container-engine.js:19` 的 `:latest` | 坏 manifest 不会进入 registry | `DNLS01-T04` `DNLS01-T05` | `profile.describe` 的 `scope` 为 `session` |
| P2-02 | 配方搬迁 | a) 复制 Dockerfile / entrypoint / mcp-bridge 到 `profiles/kitesurf/`，然后改环境变量名里的产品前缀，但 **不** 在本 Phase 改 `[DNK]` 原文件。b) 保留 `Dockerfile:1-9` 的 `__res_init` 注释，基础镜像仍是 `node:22-bookworm-slim`（`:10`）。c) entrypoint 的 bridge 监督循环（`entrypoint.sh:10-12`）与 `--persist-to`（`:32-34`）保留，state 目录改为实例卷传入。d) `linux-prefix` 仍不入库 | `runtime/Dockerfile`、`entrypoint.sh`、`mcp-bridge.mjs` | `[DNLS]` 树内能指出完整构建上下文；原 `[DNK]` 文件还在（①） | `DNLS01-T05` | 不从 `[DNK]` `import` 配方 |
| P2-03 | confine | a) 生成 `linux-prefix` 与 `container build` 的 argv 先交给 `ctx.sandbox.confine`。b) 测试双：记录被 confine 的 argv 与 policy；断言没有第二条 `spawn` 直接跑 `npm` / `curl`。c) `ctx.sandbox` 缺失时构建函数抛错，不降级到裸 `spawn`。d) 运行期 `container run` 仍只从 `backend-apple` 出去（那是特权入口，不是构建配方） | `v0.9` S3 结论由 `T-O-14` 引用 | 构建日志里有 confine 记录，或构建未发生 | `DNLS01-T06` `DNLS01-T23` | G6 |

### 4.3 Phase 3 — 实例、policy、状态

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P3-01 | registry | a) 记录字段见 `T-O-14` 执行说明：`instanceId` `profileId` `profileVersion` `scope` `sessionId` `phase` `policyFingerprint` `endpoints` `stateVolume` `artifacts`。b) `ensure(profileId, sessionId, policy)`：先算 fingerprint，命中复用；未命中创建；**禁止**复用 fingerprint 不同的实例。c) 相位机从 `createNanoKite` 的单例闭包改成 per-instance；`adopt` / `degrade` 的判定保留（健康且内存为 idle → adopt；不健康且内存为 running → degrade），调用点今天在 `index.js:522-523`、`:610-611`、`:926-927`。d) 容器名由 `instanceId` 派生，不再是 `CONTAINER_NAME`（`container-engine.js:18`） | `lib/nano-kite.js:31-117` | 两个 session 两次 `ensure` 得到两个 id | `DNLS01-T07` | 无模块级 `phase` |
| P3-02 | policy | a) 只读 `ctx.sandboxPolicy.resolve({session})`。b) 用 §2.3 的算法写 fingerprint。c) 不等：返回 `sandbox.instance.policy-stale`，body 带 `expectedFingerprint`，**不**停掉旧实例。d) `recreate` 是另一个显式调用，先停该实例再 `ensure`。e) 代码库不存在「改已有挂载」的函数；测试用静态扫描禁止 `mount` 被 `recreate` 以外的路径在 running 实例上调用 | 三档映射是 profile 的 `policyMapping` | 切 mode 不影响另一个 session 的 fingerprint | `DNLS01-T08` | 409 族，见 P5-01 |
| P3-03 | state | a) history 只写该实例的 `stateVolume`。b) 不创建 `history.jsonl`，不保留 `source: workerd-kv` / `plugin-store` 的双读（`index.js:1016-1019`）。c) `lib/history.js:4-8` 与双读互相矛盾，搬迁时两套都删，不选其中一套当权威。d) checkout 的消费回执存在实例记录的 `artifacts`（identity + hash + consumed_at），不新建 `nano-kitesurf.lock.json`，也不读 `DSH_HOME/nano-kitesurf.lock.json`（`index.js:121`） | `lib/history.js:15-16`；`container-engine.js:329` `statePath` | 单实例测试里写者数量 = 1 | `DNLS01-T09` | G3 的 history 部分 |
| P3-04 | 回收与端点 | a) `maxInstances` 从 profile 读。已达上限时 `ensure` **不得**分配新 `instanceId`，backend `create` 次数不增加，响应不是 2xx。不新增 `ERROR_CATALOG` 行，也不把 `sandbox.instance.policy-stale` 挪用到容量上。b) sweep 只回收「无 attach 且超过该 profile 的 `idleTimeoutMs`」的实例，回收必须调用 backend `stop`。c) 插件 `apply` 不调用 `ensure`。d) `endpoints` 来自该实例的端口分配，禁止写死 8787/8791 | `container-engine.js:40-41`；`sessions.js` 的 `sweep` | 夹具 profile 的小上限会被打到；生产 YAML 的 1800000 不被改短 | `DNLS01-T10` | 第七类增量的资源半边 |

达上限时的失败是可观察行为，不是新的公共 errorId。R-5 只登记了 `sandbox.instance.policy-stale` 与 `sandbox.cdp.page-lost`。本计划不追加 QNA、不等待新枚举。业主若以后要单独的容量 id，先改 QNA 再改代码，不作为本计划的收口条件。

### 4.4 Phase 4 — 四个 L2 驱动

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P4-01 | MCP | a) 20 个名字以 Q7 执行说明第 1 条为准，一个不多一个不少：`sandbox.profile.list` `sandbox.profile.describe` `sandbox.instance.ensure` `sandbox.instance.start` `sandbox.instance.stop` `sandbox.instance.restart` `sandbox.instance.status` `sandbox.diagnostics` `sandbox.console` `sandbox.operations` `sandbox.error_catalog` `sandbox.targets` `sandbox.history` `sandbox.dom` `sandbox.elements` `sandbox.selftest` `sandbox.network` `sandbox.ports` `sandbox.recovery_plan` `sandbox.bridge_health`。b) `tools/list` 由这一份数组生成。c) 原 `answerNativeTool`（`mcp-bridge.mjs:272`）改为读本进程的 registry / diagnostics；删除「等宿主 POST 快照」。d) `agent_browser_*` 仍由桥拉起，CDP URL 用该实例的 `endpoints.cdp`，不再用 `mcp-bridge.mjs:19` 的默认 `8787`。e) 幂等与重试只有一份实现：`ensure` 按 session 幂等；仅 transport 重连一次；timeout 与确定性错误不重跑（纪律来自 `lib/engine.js:499-515`） | `mcp-bridge.mjs:163-254`、`:383` | 列表排序稳定，测试对集合而不是对偶然顺序 | `DNLS01-T12` | 零 `kitesurf_` 工具名 |
| P4-02 | HTTP | a) 迁入的路由用 `/nano-local-sandbox/` + 原资源名（`status` `open` `shot` …）。b) 每条 spec 经 `registerRoutes`（`route-guard.js:279`）；`requestRejection` 不是函数就拒绝注册（`:165-166`）。c) 表行 `sessionBinding: true`。d) 若有 WS upgrade，先做与 HTTP 相同的 rejection，再 handshake。e) 不注册任何 `/nano-kitesurf/` | 现行 24 常量 `index.js:23-46` | 未列表路由抛 `route-not-listed` | `DNLS01-T13` | 启动期 fail-closed |
| P4-03 | CDP | a) `Map<instanceId,{ws,page,lastUrl,phase}>` 只放在 `[DNLS]`。b) 断开：若是 transport，重连一次；成功则按 `lastUrl` 打开，打不开就返回 `sandbox.cdp.page-lost`，禁止返回一份旧 DOM 假装还在。c) timeout / 确定性错误不重跑。d) stop 顺序照 `sleepEngine`（`index.js:401`）：先停实例，再丢 socket。e) `verifiedBase` 按实例缓存，校验 `/health` 前缀仍是引擎自报的 `kitesurf`（这是引擎身份，不是路由前缀；允许出现在 health 断言里） | `lib/engine.js:207`、`:369`、`:388`、`:499` | 两实例的 socket 对象不相等 | `DNLS01-T14` | `[DNK]` 在 Phase 7 之后不再有模块级 `live` |
| P4-04 | terminal | a) 在 `[DNLS]` 实现与 `TOOLS`（`src/host/mcp.js:11-82`）同名的 8 个工具，schema 加上 `T-O-17` 的约束。b) `term.session.create` 的返回值只有 `attach.protocol = dnt-ws-v1` 与 `attach.url`；对象上没有 `path` 键。c) pong：收到 `0x09` 时写 `encodeFrame(payload, 0x0A)`（对照现行错误写法 `index.js:65-67`）。d) `sendPing` 接到空闲计时器上（现行 `src/host/ws.js:69` 已能编码 ping，但没人调用）。e) 真 PTY 进程放在 `profiles/terminal/`，`dnt-agent` 的 7 行 stub 留到 Phase 7 再删，避免 ① 改 `[DNT]`。f) 本 Phase 不改 `makeLane`、不加 lane 名 | `src/host/mcp.js:109` 是要被取代的形状，不是本 Phase 的编辑点 | `[DNLS]` 自己的测试客户端只认 `attach.url` | `DNLS01-T15` | 帧测试能读到 opcode `0x0A` |

### 4.5 Phase 5 — 错误目录与三门禁

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P5-01 | 目录 | a) 把 `ERROR_CATALOG` 迁到 `[DNLS]`，作为唯一模块。b) 补上现有代码会抛、但正则没覆盖的 7 个 id，**保持** `kitesurf.` 前缀：`kitesurf.shot.fit`（`index.js:665`）、`kitesurf.shot.empty`（`lib/engine.js:921`）、`kitesurf.history.body`（`index.js:1009`）、`kitesurf.network.query`（`index.js:1089`）、`kitesurf.dom.empty`（`lib/engine.js:1171`）、`kitesurf.dom.blank`（`:1175`）、`kitesurf.elements.empty`（`:1193`）。c) 新增两行且只有这两行新名字空间：`sandbox.instance.policy-stale` → 409，`sandbox.cdp.page-lost` → 502。d) `ERROR_STATUS`、诊断注入、HTTP `statusOf`、技能正文都从这一个数组派生，测试做逐字比较。e) 不把 `kitesurf.*` 批量改名为 `sandbox.*` | `lib/diagnostics.js:41-72` | `statusOf('kitesurf.shot.fit')` 不再掉进默认 502，除非目录规定它就是 502 且测试写明该决定。`shot.fit` 是输入形状错误，映射 **400**（与同文件 `shot.scroll` / `shot.format` 的 400 同类，`diagnostics.js:51`） | `DNLS01-T16` | 抛出的每个 id 都能在目录找到 |
| P5-02 | 扫描器 | a) 删掉 `expected = ['STATUS_ROUTE', …]` 这 8 个名字（`route-scan.mjs:210-212`）。改为：解析到的行集必须与该插件 route-table **互为子集且等势**；多一条或少一条都抛错。b) `scanRoutes()`（`:222-229`）加上 `[DNLS]` 与 `[DNT]`。c) `[DNT]` 现有端点（`/dsh-nano-terminal/stream`、`/mcp`、`/sessions`、`/health`、session close）写入三份台账，数字先与**未硬切**的代码一致。d) `check-clean-lib.mjs` 的 `PLUGINS`（`:28-32`）加入 `dsh-nano-local-sandbox`；`[DNK]` 与 `[DNT]` 的已发布 `lib/*.js` 与未打包 `index.js` 也纳入。e) 不新增脚本，不把这三道挂成新的 release-gate | 三门禁脚本名以 `T-O-18` ③ 为准 | 故意多写一条路由常量时扫描器非 0 | `DNLS01-T17` | 切割前 `exit 0` 的含义见 §1.1 |

### 4.6 Phase 6 — 独立跑通与对等验收

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P6-01 | 独立 | a) `[DNLS]` 的 import 图里没有 `dsh-nano-kitesurf`。b) 本包内的 `spawn('container'` / `execFile('container'` 只在 `backend-apple.js`。此阶段不要求全仓为零，因为 `[DNK]` 还没切。c) `[DNK]` `npm test` 仍能跑 | `[DNK]` `package.json:11` | import 扫描为空 | `DNLS01-T11`（只扫本包） | ① 完成 |
| P6-02 | 对等 | a) fork `scripts/e2e-ego.mjs` 成新文件。b) 现行脚本里 23 个 `record(...)` 名字全部保留且为真：`bundle-mounted` `pane-open` `nav-fab` `nav-slide` `nav-tabs` `native-html` `annotate-reachable` `annotate-armed` `pick-opens-note` `no-jitter` `composer-ref` `devtools-console` `devtools-network` `devtools-elements` `computed-styles` `styles-panel` `matched-rules` `viewport-390` `shortcut-cmd-e-2` `lifecycle` `host-selftest` `history-kv` `perf-spans`。`T-O-18` 说的 20/20 是冻结当时的基线；现行文件是 23 个名字，少一个即失败。c) HTTP URL 从 `fetch` / `page.evaluate` 实参采集。d) `history-kv` 改为断言没有 `workerd-kv` 这个 source。e) 增量：双 session、`policy-stale`、无 agent、断 socket、只用 `sandbox_*`、资源三项。f) 零残留不在本 Phase 要求变绿 | `dsh-nano-kitesurf/scripts/e2e-ego.mjs:90-399` | 旧脚本退出码不能填进 T18 | `DNLS01-T18` `DNLS01-T19` `DNLS01-T10` | ② 完成 |
| P6-03 | 快照 | a) 记录 HEAD。b) 三包 `npm pack --dry-run` 输出存档。c) Phase 7 的第一步检查存档存在且 HEAD 仍是该快照的子孙；执行人在开工前做一个快照 commit（本计划的执行步骤，不是本文撰写时提交） | `T-O-18` ③ | 存档路径写进 Phase 7 的执行笔记 | `DNLS01-T22` | 没有存档就没有 ③ |

### 4.7 Phase 7 — 一次性硬切

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P7-01 | 删容器资产 | a) 删除 `lib/container-engine.js`、`lib/nano-kite.js`、`runtime/` 下那三个配方文件，以及 `package.json` `files` 里对应的五条。`lib/dom.js` 留着。b) 从 `index.js` 去掉 `execFile('container'`（`:429`）、`bringUp`（`:357`）、`sleepEngine`（`:401`）、`effectiveCheckout`（`:413`）、`KITESURF_CHECKOUT`。c) 24 条旧路由全部删除，不改名、不转发。d) `lib/history.js` 与 `lib/diagnostics.js` 在 `[DNK]` 的 import 消失后再删 `files` 行 | 同上 | `[DNK]` 运行时代码不再调用容器 | `DNLS01-T11` `DNLS01-T20` | G2 |
| P7-02 | client / skill | a) `src/client/index.js:12-28` 与 `:35`、`:58` 的 fetch 全部改为 `/nano-local-sandbox/`。不再请求 last/context 路由；点选包由面板自己留在内存。b) 重建 `lib/client.js`，测试同时扫 src 与 lib。c) `lib/skill.js` 改成教 `sandbox_*` 与 `GET /nano-local-sandbox/status`；生成 `skills/*/SKILL.md`；禁止手改生成物。d) 全仓 `window.__nks` 命中数为 0。e) `lib/engine.js` 不再持有模块级 socket | `lib/skill.js:212` 的 6/8/13 漂移随生成消失 | 技能测试逐字符对比 | `DNLS01-T16` `DNLS01-T20` | 模型侧没有 `kitesurf_` 工具名 |
| P7-03 | `[DNT]` | a) `create` 返回 `attach.url`，删除 `path`（`src/host/mcp.js:109` 与构建后的 `lib/mcp.js`）。b) `McpLane` 删除 `attach?.path` 兜底（`lanes.js:140`）。`attach.url` 已是绝对 URL 时原样连接。只有相对 URL 时，才借用 `__DSH_TRANSPORT__.streamBaseUrl` 的 **origin**。禁止调用现在的 `streamBase()`（`:17-22` 返回的是已经拼好 `/dsh-nano-terminal/stream` 的完整地址）。c) `index.js:65-67` 改为 `encodeFrame(payload, 0x0A)`。`sendPing`（`ws.js:69`）仍发 `0x09`，接到空闲计时器上，不要把它改成 pong。客户端在超时前发送 ping。d) 删除 `IsolateLane`（`lanes.js:202-251`）及 `makeLane` 的 `isolate` 分支（`:257-258`）；lane 枚举、health、`AGENTS.md:106` 去掉 isolate，**不**加入 `sandbox`。`makeLane('local')` 仍成功。e) 删除 `crates/dnt-agent` stub。f) 停止创建 `${DSH_HOME}/plugins/dsh-nano-terminal/audit.jsonl`。`local` 与 sandbox 终端的 open/close/attach 都写入 `[DNLS]` 的那一份 `term.audit`，不双写。g) 改 `src/host` 与 `src/client` 后构建；残留扫描覆盖 `lib/` | `AGENTS.md:106`；`package.json` 无 route-guard devDep（`:28-31`） | `[DNT]` HTTP 也改为 `registerRoutes` | `DNLS01-T15` `DNLS01-T17` | `local` 仍能开，且开的事件出现在 `[DNLS]` 审计里 |
| P7-04 | 台账 | a) 删除 `proc:kitesurf` 两行（`route-sensitivity.json:441`、`:532`）及全部旧前缀行。b) 写入 `/nano-local-sandbox/*`，不写第四套前缀。c) 三份台账行数彼此相等。d) 三门禁再跑，必须 `exit 0` | `security/route-inventory.md`、`feature-contract.json` | 扫描器多一行就失败 | `DNLS01-T17` `DNLS01-T20` | 零残留的台账半边 |

### 4.8 Phase 8 — 发布姿态与 defer

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P8-01 | 文档 | a) `AGENTS.md:25-29` 增加 `[DNLS]` 一行。b) `README.md:3` 的「三个活跃插件」改成与清单一致的表述，不写死一个马上会过期的阿拉伯数字以外的营销句；数字必须等于清单行数。c) `[DNK]` `AGENTS.md` 交付物表删除容器引擎、runtime、`KITESURF_CHECKOUT`。d) `[DNT]` `AGENTS.md:106` 与 `/term attach` 的硬编路径改成「server 返回的 url」。e) 在 `v0.9` 与 `v1.1` 文首各加一段状态：事实基线仍有效；兼容建议已被 QNA 作废；实现计划是本文。不改两文的实测数据 | `README.md:3`；`AGENTS.md:23-29` | 人读文档与 `package.json` `files` 一致 | `DNLS01-T01` | `T-O-18` ③ 的文档半边 |
| P8-02 | U10 | 在 `accepted-risks.json` 的 `risks` 数组**末尾追加**四行，`fingerprint` 前缀 `dnls:defer-`，`disposition` = `accept`，正文指向 `T-O-1` / `T-O-18` ④ 与 `v1.1 §5.7`。不修改已有对象 | 追加到 `risks` 末尾；既有 `fingerprint` 一个不改。文件长于开头十几行 | 既有 fingerprint 集合是追加前的超集 | `DNLS01-T25` | U10 不再是口头 defer |

---

## 5. Phase 详情

### 5.1 Phase 1 — 插件身份与 backend 接口

- **Phase 目标**：一个能被指出身份、但不能被误认为 `[DNK]` 子模块的宿主插件。
- **本 Phase 对应编号**：`P1-01` `P1-02` `P1-03`
- **本 Phase 新增文件**：`dsh-nano-local-sandbox/package.json`、`cordis.patch.yml`、`index.js`、`AGENTS.md`、`src/host/backend.js`、`backend-apple.js`、`backend-nvx.js`
- **本 Phase 修改文件**：无消费者文件
- **本 Phase 删除文件**：无
- **具体功能预期**：
  1. cordis 行是 `id: nano-local-sandbox`、`name: dsh-nano-local-sandbox`。
  2. inject 集合与 §3 P1-02 一致，且包含 `connection`（`[DNT]` 今天没有，`index.js:23`，这是已知缺口，不复制）。
  3. 全包无 `SandboxProvider` 字面量，无对 `ctx.shell` / `ctx.fs` / `ctx.subprocess` 的赋值。
  4. `backend-nvx` 与 `backend-apple` 的 `capabilities()` 键集合相等。
  5. 把 Apple 名词写进传给 backend 的公开参数对象时，构造函数抛错。
  6. 安装探针若要求 client，该 client 的 `inject` 为空或只含布局包，且 `apply` 不注册 slot。
- **对应测试台账项**：`DNLS01-T01` `DNLS01-T02` `DNLS01-T03`
- **收口标准**：上述测试在不启动容器的情况下通过。
- **本 Phase 风险提醒**：不要在本 Phase「顺便」把 `[DNK]` 的 `index.js` import 过来。

### 5.2 Phase 2 — profile 与构建配方

- **Phase 目标**：一份失败关闭的 kitesurf manifest。
- **本 Phase 对应编号**：`P2-01` `P2-02` `P2-03`
- **本 Phase 新增 / 修改 / 删除文件**：`profiles/kitesurf/**`、`src/host/profile-registry.js`、构建入口。不删 `[DNK]/runtime`。
- **具体功能预期**：
  1. 缺 `scope` 的 YAML 被拒绝，且不会落成 `shared`。
  2. `image: ...:latest` 被拒绝。
  3. digest 不符时 `ensureImage` 不被调用（测试双计数为 0）。
  4. 配方中出现 `container machine` 时 registry 拒绝该 profile。
  5. confine 双未被调用时，构建函数抛错。
  6. `USER node`、loopback 发布、checkout 只读，这些是 apple 实现从 manifest 的 `isolation` 读出来的，不再是 `createArgs` 里的字面量。
- **对应测试台账项**：`DNLS01-T04` `DNLS01-T05` `DNLS01-T06` `DNLS01-T23`
- **收口标准**：坏配方不能产生实例 id。
- **本 Phase 风险提醒**：精确 pin 的 wrangler / agent-browser 版本以搬迁当日 lock 为准，写进 manifest；不要抄注释里的 `wrangler@4`。

### 5.3 Phase 3 — 实例、policy、状态

- **Phase 目标**：session 粒度的实例，且策略变化不会偷偷换挂载。
- **本 Phase 对应编号**：`P3-01`–`P3-04`
- **本 Phase 新增 / 修改 / 删除文件**：`instance-registry.js`、`policy-adapter.js`、`state-service.js`
- **具体功能预期**：
  1. 同一 `(profile, session, fingerprint)` 连续 `ensure` 返回同一 `instanceId`。
  2. 只改一个不在四元组里的标签，fingerprint 不变。
  3. 只改 `mode`，旧实例仍是 running，调用方拿到 `sandbox.instance.policy-stale` 与旧 fingerprint。
  4. `recreate` 之后新 id 的挂载根等于新的 `workspaceRoot`；另一个 session 的根不变。
  5. history 写入次数与 volume 上的记录数一致，磁盘上没有第二份 jsonl。
  6. `apply()` 之后容器数为 0；第一次 `ensure` 之后才为 1。
  7. 会话数已经等于夹具 profile 的 `maxInstances` 时，再一次 `ensure` 不分配新 id，`create` 次数不增加，响应不是 2xx。未达上限时同一次调用不得失败。不把上限调到大于会话数来躲开这一条。
  8. 空闲回收调用了 `stop`，而且发生在 Map 删除之前；只 `delete` 不算回收。未超时或仍有 attach 时 `stop` 次数保持 0。
- **对应测试台账项**：`DNLS01-T07` `DNLS01-T08` `DNLS01-T09` `DNLS01-T10` `DNLS01-T23`
- **收口标准**：夹具 backend 上的调用序列与上面 8 条一致。
- **本 Phase 风险提醒**：不要为容量发明 `errorId`。行为不够就修行为，不回 QNA 加枚举。

### 5.4 Phase 4 — 四个 L2 驱动

- **Phase 目标**：消费者即便还没改，平台侧契约已经完整。
- **本 Phase 对应编号**：`P4-01`–`P4-04`
- **本 Phase 新增 / 修改 / 删除文件**：`mcp-server`、`http` 路由表、`cdp-driver`、`terminal-driver`、`profiles/terminal/`
- **具体功能预期**：
  1. `tools/list` 的 `sandbox.*` 集合等于 §4.4 的 20 个名字。
  2. 关闭宿主快照推送后，`sandbox.diagnostics` 仍返回本进程数据，而不是 `kitesurf.diag.stale`。
  3. 未登记路由不能注册成功。
  4. 未通过 `requestRejection` 的 HTTP 与 WS 都不会进入 handler（攻击用例）。
  5. 实例 A 的 socket 关闭不会改变实例 B 的 `lastUrl`。
  6. A 无法恢复时错误 id 是 `sandbox.cdp.page-lost`，HTTP 状态来自目录（502），响应体不是上一次的 DOM。
  7. `term.session.create` 没有 `path` 键；`lines: 501` 与 `cols: 1` 被拒绝。
  8. ping 的回应帧 opcode 是 `0x0A`。
- **对应测试台账项**：`DNLS01-T12` `DNLS01-T13` `DNLS01-T14` `DNLS01-T15` `DNLS01-T23`
- **收口标准**：本 Phase 的测试不启动 `[DNK]` 的 `apply`。
- **本 Phase 风险提醒**：不要把 `[DNT]` `src/host/mcp.js` 整文件拷进 `[DNLS]` 再改两行；schema 按 `T-O-17` 重写，避免把「无 additionalProperties」的旧形状当成合同。

### 5.5 Phase 5 — 错误目录与三门禁

- **Phase 目标**：切割前，三道门禁描述的是真实代码。
- **本 Phase 对应编号**：`P5-01` `P5-02`
- **本 Phase 新增 / 修改 / 删除文件**：`[DNLS]` 的 diagnostics 模块；`scripts/route-scan.mjs`；`scripts/check-clean-lib.mjs`；三份 `security/*`（只加行，不删 `/nano-kitesurf/`）
- **具体功能预期**：
  1. 目录含 7 个补录 id 与 2 个 `sandbox.*` id，各恰好一行。
  2. 技能正文里的表与目录逐字相同。
  3. 扫描器对「多一条常量」非 0，对「当前真实集合」为 0。
  4. `scanRoutes()` 的插件名集合包含 `dsh-nano-local-sandbox` 与 `dsh-nano-terminal`。
  5. `check-clean-lib` 能在 `[DNLS]` 的产物里发现一个故意留下的裸 `import 'left-pad'`（用夹具目录，不污染包）。
  6. 没有名为 `check-dnls-*.mjs` 的新门禁。
- **对应测试台账项**：`DNLS01-T16` `DNLS01-T17`
- **收口标准**：三道命令 `exit 0`，且 §8.6 的「扫描器自指」断言通过。
- **本 Phase 风险提醒**：把 `expected.length` 从 8 改成 24 仍是烤死数字，不算修好。

### 5.6 Phase 6 — 独立跑通与对等验收

- **Phase 目标**：②。证明平台能单独承担现行页面行为。
- **本 Phase 对应编号**：`P6-01` `P6-02` `P6-03`
- **本 Phase 新增 / 修改 / 删除文件**：`dsh-nano-local-sandbox/test/**`、fork 的 e2e 脚本、快照清单。不改 `[DNK]` 源码。
- **具体功能预期**：
  1. fork 文件里现行 `e2e-ego.mjs` 的 23 个 `record` 名字都在，且都为真。HTTP URL 从 `fetch` / `page.evaluate` 的实参采集，不是从 base 常量采集。
  2. 旧 `test:e2e` 即使全绿，也不写入本 Phase 的 PASS 证据。mock `fetch` 或没调用 `registerRoutes` 的进程打出 23 个 true，判失败。
  3. 双 session 的挂载根不同，且 A 的 history 读不到 B 的 URL。`history-kv` 改为断言不存在 `source === 'workerd-kv'`。
  4. 无 agent 连接时，`POST /nano-local-sandbox/shot` 不是 200；`requestRejection` 发生在 handler 之前，或者失败 id 属于目录里已有的 `kitesurf.*` / `sandbox.*`。
  5. 快照清单是事先落盘的那一份，测试不得现场再 pack 一份来冒充。
  6. `[DNK]` 与 `[DNT]` 的测试标题集合是快照的超集。空测试不算数。
- **对应测试台账项**：`DNLS01-T18` `DNLS01-T19` `DNLS01-T21` `DNLS01-T22`
- **收口标准**：§10 中 ② 的行全部不是 `未观察`。
- **本 Phase 风险提醒**：用 mock 的 `fetch` 把 20 个用例打绿，而没有一次真实的路由注册，按 §8.6 判假绿。

### 5.7 Phase 7 — 一次性硬切

- **Phase 目标**：③。旧特权与旧名字同时消失。
- **本 Phase 对应编号**：`P7-01`–`P7-04`
- **本 Phase 新增文件**：无平台新面
- **本 Phase 修改文件**：`dsh-nano-kitesurf/index.js`、`src/client/index.js`、`lib/skill.js`、`dsh-nano-terminal/index.js`、`src/host/*`、`src/client/lanes.js`、`security/*`
- **本 Phase 删除文件**：`dsh-nano-kitesurf/lib/container-engine.js`、`lib/nano-kite.js`、`runtime/**`、`dsh-nano-terminal/crates/dnt-agent/**`、生成前的旧 `SKILL.md` 内容（文件可留，正文替换）
- **具体功能预期**：
  1. 运行时代码搜索根（§8.6）里 `spawn('container'` 与 `execFile('container'` 只命中 `backend-apple.js`。
  2. 同一搜索根里没有 `/nano-kitesurf/`、没有 `kitesurf_` 工具名、没有 `proc:kitesurf`。
  3. 允许留下旧字符串的文件只有 §8.6 列出的三条实路径，外加本计划文件这一条。用 `..`、`deprecated/` 或前缀匹配放行，判失败。
  4. `[DNK]` 不再注册 last/context/perf 的旧路径，也没有新前缀。面板内存里的 `lastPick` 仍能显示刚刚的点选。
  5. `McpLane` 源码不含 `attach?.path`，也不调用现行 `streamBase()` 去连接 sandbox 终端。
  6. `makeLane` 不含 `isolate`，也不含 `sandbox`。`makeLane` 的 `local` 分支仍在。
  7. `[DNT]` 不再创建 `audit.jsonl`。`local` 与 sandbox 的 open 都能从 `[DNLS]` `term.audit` 读到，且只有一份存储。
  8. 硬切后三门禁仍 `exit 0`，而且是因为扫描器真的扫到了 `[DNLS]` 与 `[DNT]`。
  9. `[DNT]` `local` lane 的既有单测标题仍在且通过。
  10. 不存在把旧前缀转到新前缀的函数。
- **对应测试台账项**：`DNLS01-T11` `DNLS01-T15` `DNLS01-T17` `DNLS01-T20` `DNLS01-T21`
- **收口标准**：零残留与门禁同时为真。只绿一个不算。
- **本 Phase 风险提醒**：无运行时开关。失败则回到 P6-03 的 commit，禁止临时加别名把套件救绿。

### 5.8 Phase 8 — 发布姿态与 defer

- **Phase 目标**：人读表面与 defer 台账跟代码一致。
- **本 Phase 对应编号**：`P8-01` `P8-02`
- **本 Phase 新增 / 修改 / 删除文件**：仓根 `AGENTS.md`、`README.md`、三包 `AGENTS.md`、两份 eval 的文首状态段、`accepted-risks.json` 追加
- **具体功能预期**：
  1. 仓根清单的方括号缩写包含 `[DNLS]`，且包名只出现一次。
  2. `README.md:3` 不再写「三个」活跃插件。
  3. `[DNK]` `AGENTS.md` 的交付物表没有 `container-engine` 与 `runtime/`。
  4. `accepted-risks.json` 新增四行，旧行的 `fingerprint` 集合是追加前的超集（只增不改）。
  5. `v0.9` / `v1.1` 文首能读到「兼容建议已作废」，正文里的旧路径字面量保留（这两份在 T20 的允许清单里）。
  6. 允许清单以外的 markdown（含 `docs/code-review/` 与 `docs/specs/dsh-nano-kitesurf/`）不再留下旧路由字面量，改成指向 QNA 的句子。QNA 本身不改。
- **对应测试台账项**：`DNLS01-T01` `DNLS01-T20` `DNLS01-T25`
- **收口标准**：文档 grep 与包清单一致。
- **本 Phase 风险提醒**：不要为了「文档干净」去改 QNA 的历史问句。

---

## 6. 依赖的冻结设计决策（只读引用）

| 决策 / Q ID | 冻结来源 | 本计划中的影响 | 若不成立的处理 |
|-------------|----------|----------------|----------------|
| `T-O-1` | QNA §1 / 业主指令 | Phase 1 只做会失败的 NVX；Phase 8 登记 U10 | 本计划停止，不在正文里加 Windows 步骤 |
| `T-O-2` | QNA §1 | `DNLS01-T11` 的搜索根 | 同上 |
| `T-O-3` | QNA §1 | P7-01 删除清单 | 同上 |
| `T-O-4` | QNA §1 | 终端与未来服务都走 profile，不新开插件 | 若执行时需要新插件，回到 QNA 追加，本计划标 `blocked` |
| `T-O-5` | QNA §1 | 不重测 v0.9 已有的 Apple 规格；P8 只加状态段 | 无 |
| `T-O-6` | QNA §1 | P1-02 禁止 `SandboxProvider`；三档映射 | 同上 |
| `T-O-7` | QNA §1 | 新的公共 errorId 只有已登记的两个。容量是「不创建」，不是新枚举 | 若实现写出第三个 `sandbox.*` id，P5 不收口 |
| `T-O-8` | QNA §1 | §2.2 的 O2 整表不做 | 若 `[业主]` 推翻，先改 QNA 再改本文 |
| `T-O-9` / Q1 | QNA §1 | Phase 1 全部 | 身份不同则本文作废重写 |
| `T-O-10` / Q2 | QNA §1 | §1.1 的 ①②③ | 禁止把 P7 拆成「先 façade 再删」 |
| `T-O-11` / Q3 | QNA §1 | skill 留在 `[DNK]`；UI 不走 MCP | 禁止把面板点击改成模型回合 |
| `T-O-12` / Q4 | QNA §1 | kitesurf `scope: session` | 禁止用 shared 单例躲 4G |
| `T-O-13` / Q5 | QNA §1 | Phase 2 | 缺 pin 不得进入 Phase 6 |
| `T-O-14` / Q6 | QNA §1 | Phase 3；关闭热改挂载 | 无 `policy-stale` 不得进入 Phase 6 |
| `T-O-15` / Q7 | QNA §1 | 20 工具、零别名、门禁、7 个旧 id | 工具数不等于 20 则 P4 不收口 |
| `T-O-16` / Q8 | QNA §1 | P4-03 | 全局 `live` 留在消费者则 P7 不收口 |
| `T-O-17` / Q9 | QNA §1 | P4-04 与 P7-03；不加 lane | `makeLane` 出现 `sandbox` 即失败 |
| `T-O-18` / Q10 | QNA §1 | Phase 5 在 Phase 6 前；七类增量；三门禁；U9/U10 | 门禁非 0 不得开始 P6 |

---

## 7. 内置 Reference-Anchor 锚区

锚点树：`7a49a07`（审查时的已提交 HEAD `8d14f6c` 是它的后代，未改这些符号）。符号还在但行号变了时，改锚的行号，不改工作项。不采用未提交工作区里的行号。

### 7.1 锚表（本计划工作要落在哪些既有代码 / 新建点上）

| 锚 ID | `path:line` | 落点（这是什么） | 本 AP 用途 | 处置 | 备注 |
|-------|-------------|------------------|------------|------|------|
| A-1 | `dsh-nano-kitesurf/package.json:42-57` | 引擎范围与 client inject 样例 | P1-01 | ✅ 复用 | 只复用装配形状 |
| A-2 | `dsh-nano-kitesurf/cordis.patch.yml:3-5` | `id` / 包名分离 | P1-01 | ✅ 复用 | `name` 必须是包名 |
| A-3 | `dsh-nano-kitesurf/index.js:20-21` | 现行 `name` 与 inject | P1-02 | ♻️ 重 substrate | 不把 `skills` 带进 `[DNLS]` |
| A-4 | `dsh-nano-kitesurf/index.js:23-46` | 24 条路由常量 | P4-02 / P7-02 | ♻️ 重 substrate | 全部改到 `/nano-local-sandbox/`；last/context 不再有路由 |
| A-5 | `dsh-nano-kitesurf/index.js:51` | `lastPick` | P7-02 | ✅ 复用 | 留在 `[DNK]` |
| A-6 | `dsh-nano-kitesurf/index.js:121` | lock 路径 | P3-03 / P7-01 | remove | 文件删除，不迁移 |
| A-7 | `dsh-nano-kitesurf/index.js:357` `bringUp`；`:401` `sleepEngine`；`:413` `effectiveCheckout`；`:429` `execFile` | 容器特权在宿主路由里 | P7-01 | remove | 调用只留 A-12 |
| A-8 | `dsh-nano-kitesurf/index.js:472` `runSelfTest`；`:522` `adopt` | 自检与相位校准 | P3-01 / P5-01 | ♻️ 重 substrate | 11 项检查随 diagnostics 迁到 `[DNLS]`，按实例执行 |
| A-9 | `dsh-nano-kitesurf/index.js:640` 与 `:1016-1019` | history 双写 / 双读 | P3-03 | remove | 两套都删 |
| A-10 | `dsh-nano-kitesurf/lib/container-engine.js:18-19` `CONTAINER_NAME` / `:latest` | 硬编容器身份 | P2-01 / P3-01 | remove | 名字与 tag 都来自实例 + digest |
| A-11 | `dsh-nano-kitesurf/lib/container-engine.js:38-52` `createArgs`；`:60` `checkoutPath`；`:88` `spawn`；`:329` `statePath` | 现行 Apple 参数 | P1-03 / P2-03 | ♻️ 重 substrate | 参数化后进入 `backend-apple.js` |
| A-12 | 新建 `dsh-nano-local-sandbox/src/host/backend-apple.js` | 唯一 `spawn('container'` | P1-03 / P7-01 | 🆕 净新 | `DNLS01-T11` 的允许名单只有这一文件 |
| A-13 | `dsh-nano-kitesurf/lib/nano-kite.js:31` `createNanoKite`；`:104` `adopt`；`:115` `degrade` | 单例相位机 | P3-01 | ♻️ 重 substrate | 语义留，闭包丢 |
| A-14 | `dsh-nano-kitesurf/lib/engine.js:207` `live`；`:369` `verifiedBase`；`:499` `useLive` | 进程级 CDP 单例 | P4-03 / P7-02 | ♻️ 重 substrate | keeper 在 `[DNLS]` |
| A-15 | `dsh-nano-kitesurf/runtime/Dockerfile:1-10`；`entrypoint.sh:10-12` 与 `:32-34`；`mcp-bridge.mjs:19` 与 `:163` | 镜像与桥 | P2-02 / P4-01 | ♻️ 重 substrate | 原文件留到 P7 才删 |
| A-16 | `dsh-nano-kitesurf/lib/diagnostics.js:41` `ERROR_CATALOG`；`:72` `ERROR_STATUS` | 错误真源 | P5-01 | ♻️ 重 substrate | 迁模块，不复制第二份 |
| A-17 | `dsh-nano-kitesurf/lib/skill.js:212` | 技能正文与工具数漂移 | P7-02 | ♻️ 重 substrate | 生成物逐字对比 |
| A-18 | `dsh-nano-kitesurf/src/client/index.js:12-28`；`:645` `__nksRuns` | UI 直连与私有全局 | P7-02 | ✅ 复用 | 改常量，不改点选语义 |
| A-19 | `packages/dsh-host-route-guard/src/route-guard.js:159` `registerRoutes`；`:165`；`:224`；`:279` | 唯一注册入口 | P4-02 / P7-03 | ✅ 复用 | 已建好，不重写 guard |
| A-20 | `index.js:665` `shot.fit`；`lib/engine.js:921` `shot.empty`；`index.js:1009` `history.body`；`index.js:1089` `network.query`；`lib/engine.js:1171` `dom.empty`；`:1175` `dom.blank`；`:1193` `elements.empty` | 七个未进目录的 throw | P5-01 | ✅ 复用 | 补行，不改名 |
| A-21 | `dsh-nano-terminal/src/host/mcp.js:11-82` 与 `:109` | 8 工具与 `attach.path` | P4-04 / P7-03 | ♻️ 重 substrate | QNA 写的 `lib/mcp.js:96` 是拆分 `src/host` 前的行 |
| A-22 | `dsh-nano-terminal/index.js:23` inject；`:31` `auditPath`；`:65-67` opcode `0x09` | 无 connection、裸 pong、本地审计 | P7-03 | ✅ 复用 | 修这些行，不换协议名 |
| A-23 | `dsh-nano-terminal/src/host/ws.js:32` `encodeFrame`；`:69` `sendPing` | 帧编码器，ping 未接线 | P4-04 / P7-03 | ✅ 复用 | pong 用它，opcode `0x0A` |
| A-24 | `dsh-nano-terminal/src/host/sessions.js:20`；`:48` `create`；`:108` `sweep` | 空闲回收先例 | P3-04 | ✅ 复用 | 只学行为，不 import |
| A-25 | `dsh-nano-terminal/src/client/lanes.js:17` `streamBase`；`:140` 兜底；`:202` `IsolateLane`；`:253` `makeLane` | 客户端车道 | P7-03 | ♻️ 重 substrate | `streamBase` 已存在，补到 `McpLane` 的使用点 |
| A-26 | `dsh-nano-terminal/crates/dnt-agent/src/main.rs:5-6` | stub | P7-03 | remove | 真 PTY 在 `profiles/terminal/` |
| A-27 | `dsh-nano-terminal/AGENTS.md:106` | 三 lane 合同句 | P7-03 / P8-01 | ✅ 复用 | 删 isolate，不加 sandbox |
| A-28 | `scripts/route-scan.mjs:210-212`；`:222-229` | 8-vs-24 与四插件扫描 | P5-02 | ✅ 复用 | 改断言方式，不新增脚本 |
| A-29 | `scripts/check-clean-lib.mjs:28-35` | 第三门禁的插件列表 | P5-02 | ✅ 复用 | 注释里的 `T-O-13` 是另一份安全计划的编号，与本 QNA 的 `T-O-13` 无关 |
| A-30 | `security/route-sensitivity.json:441` 与 `:532` | `proc:kitesurf` | P7-04 | remove | 切割前不要删，否则台账撒谎 |
| A-31 | `AGENTS.md:23-29` 与 `:34-40`；`README.md:3` | 清单与硬原则 | P8-01 | ✅ 复用 | README 的「三个」已过时 |
| A-32 | `security/accepted-risks.json:1-14` | 既有安全 defer 的形状 | P8-02 | ✅ 复用 | 只追加 |
| A-33 | 新建 `profiles/kitesurf/profile.yaml` | U9 初值的落点 | P2-01 | 🆕 净新 | 测试只读此文件 |

### 7.2 反例 ledger ⛔（别碰区 / 已知陷阱）

| ⛔ | 反例 / 陷阱 | 为什么（依据） |
|----|------------|----------------|
| ⛔1 | 保留 `/nano-kitesurf/*` 转发或双轨开关 | `T-O-8`、`T-O-10` 作废 `v1.1` C6-4 / C7-2 |
| ⛔2 | `kitesurf_*` 工具别名、`KITESURF_CHECKOUT`、`config.checkout` | `T-O-10`、`T-O-13` |
| ⛔3 | 把 `[DNLS]` 注册成 `SandboxProvider` 或替换 `ctx.shell` / `ctx.fs` / `ctx.subprocess` | `T-O-6`、`T-O-9` |
| ⛔4 | 运行中热改挂载，或把 `sandbox_permissions` 写进 API | `T-O-14` 关闭 `v0.9 §8B.6` 的未决项 |
| ⛔5 | `[DNT]` 增加 `sandbox` lane，或改 `makeLane` / health / `AGENTS.md:106` 的 lane 枚举来「接沙箱」 | `T-O-17`：用现有 `McpLane` 换 URL |
| ⛔6 | 跨插件 `import` 对方的 `lib/` 或 `src/host/` | `AGENTS.md:36`、`T-O-9` |
| ⛔7 | 把 `route-scan` 的 `8` 改成另一个烤死的 `24` | 下次加路由会再次假红或被人改成假绿 |
| ⛔8 | 为了零残留去改 QNA / `v0.9` / `v1.1` 正文里的历史字符串 | 那些是证据。扫描根见 §8.6 |
| ⛔9 | 复用 `nano-kitesurf.lock.json` 当恢复源 | R-5：删除文件；回执只在实例记录 |
| ⛔10 | 新增第四道 release-gate，或在容量 errorId 上沉默地扩约 | `T-O-7`、`T-O-18`、§4.3 |
| ⛔11 | 用 shared 单实例避开 4G | `T-O-12` 显式否定 `v1.1:977` |
| ⛔12 | `container machine`、镜像 `latest`、`curl \| sh` | `T-O-13` |
| ⛔13 | 硬切前删除 `proc:kitesurf` 行来让某种「零残留」提前变绿 | §1.1：切割前的台账必须描述仍在运行的特权 |
| ⛔14 | 把 `[DNK]` `npm test` 变绿的方式做成删除测试文件 | `DNLS01-T21` |

### 7.3 上游真源指针 + 安全项威胁模型

- **独立 reference-anchor**：无。§7.1 就是本计划的 grounding。
- **威胁模型**（安全项不得只写 happy path）：
  - **特权面**：现行 `/nano-kitesurf/kite` 与 `/recover` 是 `L2 / proc:kitesurf`，理由写明会 `container run` 并 bind-mount 宿主目录（`security/route-sensitivity.json:441`、`:532`）。硬切后这条能力只留在 `backend-apple.js`，路由仍是 L2，鉴权仍是 `requestRejection`（`route-guard.js:224`）。没有第二条「按路由的授权」。
  - **构建面**：`confine` 缺失时必须失败。禁止裸 `spawn('npm'` / `spawn('curl'`。对应 `DNLS01-T06`、`DNLS01-T23`。
  - **跨会话**：实例 A 的 `workspaceRoot` 不得出现在实例 B 的 mount 参数里。fingerprint 不含四元组以外的字段，避免「改了根但哈希没变」。
  - **CDP**：`evaluate` 是容器内代码执行。body 上限与现行 2000 字符约束随路由迁走；不新增无长度限制的执行入口。socket 关闭后不得回放旧 DOM（`page-lost`）。
  - **WS**：upgrade 在 handshake 之前做与 HTTP 相同的 rejection。未鉴权不得进入帧循环（现行 `[DNT]` `index.js:51` 只有 `handshake`，P7-03 补上）。
  - **供应链**：digest / ref 失败即拒绝；`container machine` 不进允许的 argv 首词。
  - **审计**：sandbox 终端的 durable 审计只在 `[DNLS]`。禁止 `[DNT]` 再写一份可当权威读取的 `audit.jsonl`。

---

## 8. 测试台账

### 8.1 测试清单（主表）

| Test-ID | 测试项（验证什么） | 类型 | 层 | 来源 | 映射（工作项 → 收口目标） | PASS 证据（四元组） |
|---------|------------------|------|----|------|---------------------------|---------------------|
| `DNLS01-T01` | 包名、cordis、inject 集合、仓根清单最终含 `[DNLS]` | 短途 | 契约 | 🆕 `dsh-nano-local-sandbox/test/identity.test.mjs` | P1-01/P1-02/P8-01 → 身份只有一套 | `commit + identity.test.mjs + exit 0 + UTC` |
| `DNLS01-T02` | 13 个方法里，除 `capabilities()` 外 NVX 全部 reject `backend.nvx.unimplemented`；该字符串不进 `ERROR_CATALOG`。公开参数写入 Apple 名词时构造函数抛错 | 短途 | unit | 🆕 `test/backend.test.mjs` | P1-03 → G8 | 只 grep 夹具或只数键，不算 PASS |
| `DNLS01-T03` | 运行时代码无 `SandboxProvider`、无 seam 赋值 | 短途 | 契约 | 🆕 `test/no-sandbox-provider.test.mjs` | P1-02 → `T-O-6` | 同上 |
| `DNLS01-T04` | 缺字段、`latest`、caret、坏 digest、坏 `checkout.ref`、`verify` 失败、`container machine` 都拒绝，且 `ensureImage` 次数为 0 | 短途 | unit | 🆕 `test/profile-reject.test.mjs` | P2-01 → 失败关闭 | 缺 `ref` 或 `verify` 任一类即失败 |
| `DNLS01-T05` | 合法 manifest 的 `scope` 从 YAML 读出是 `session`；`[DNLS]` 不 import `[DNK]`；Dockerfile 仍有 `__res_init` 注释且基础镜像是 `node:22-bookworm-slim` | 短途 | unit | 🆕 `test/profile-load.test.mjs` | P2-01/P2-02 → 配方只在 profile 目录 | 一行 re-export 不算搬迁 |
| `DNLS01-T06` | 有 confine 时裸 `spawn`/`execFile` 为 0；没有 `ctx.sandbox` 时构建抛错且 `spawn` 仍为 0 | 短途 | unit | 🆕 `test/build-confine.test.mjs` | P2-03 → G6 | 只测注入了双的那一次，不算 PASS |
| `DNLS01-T07` | 同一三元组两次 `ensure`：id 相同且 `create` 次数 = 1。无模块级 `phase`。A `degrade` 时 B 的 phase 不变 | 短途 | unit | 🆕 `test/instance.test.mjs` | P3-01 → 不串实例 | 只比较 id、不看 `create` 次数，判假绿 |
| `DNLS01-T08` | 改 mode → `policy-stale` + `expectedFingerprint`，旧实例 `stop` 仍为 0。只改四元组外的标签，哈希不变。只改 `workspaceRoot`，哈希变且不复用旧 id | 短途 | unit | 🆕 `test/policy-stale.test.mjs` | P3-02 → `T-O-14` | 缺 `workspaceRoot` 这一条即失败 |
| `DNLS01-T09` | 磁盘上的 history 记录数等于该实例 volume 的写入次数；不存在第二份 jsonl，也不存在第二套 KV 写路径 | 短途 | unit | 🆕 `test/history-single.test.mjs` | P3-03 → G3 | 测试自建的计数器恒为 1，不算 |
| `DNLS01-T10` | 生产 YAML 的 `idleTimeoutMs` 字节仍是 `1800000`，测试不写这个文件。夹具 profile 写 `50`。sweep 只能从 loader 读到 50，测试不得调用 `stop`，也不得把超时当参数传入。无 attach 且时钟 < 50 时 `stop` = 0；≥ 50 时 `stop` = 1 且 Map 删除在 `stop` 返回之后。有 attach 时拨过 50，`stop` 仍为 0。会话数等于夹具 `maxInstances` 时再 `ensure` 不分配新 id、响应不是 2xx | spike | 集成 | 🆕 `test/lifecycle.spike.test.mjs` | P3-04 → 第七类 | 直接 `stop()` 或把生产值改短，判假绿 |
| `DNLS01-T11` | P6：只扫 `dsh-nano-local-sandbox/`，命中文件只有 `backend-apple.js`。P7 之后：仓库里除 §8.6 允许的路径外，命中文件集合等于这一份 | 短途 | 契约 | 🆕 `test/container-spawn-sites.test.mjs` | P6-01 只扫本包；P7-01 扫全仓 → G2 | P6 用全仓断言会逼人把 `[DNK]` 排除，禁止 |
| `DNLS01-T12` | `tools/list` 的 sandbox 集合 = 20 个冻结名字；诊断不依赖宿主 POST | spike | 集成 | 🆕 `test/mcp-tools.spike.test.mjs` | P4-01 → 零别名 | 集合差集为空；推送计数器 = 0 |
| `DNLS01-T13` | 未列表路由不能注册；无 `requestRejection` 时 `webServer.register` 次数为 0。每条 `/nano-local-sandbox/` 的 `sessionBinding` 是字面量 `true`。`apply` 里直接调用 `ctx.webServer.register` 的次数为 0 | 短途 | 契约 | 🔱 断言方式来自 `packages/dsh-host-route-guard/test/route-guard.test.mjs`；新文件 `dsh-nano-local-sandbox/test/routes.test.mjs` | P4-02 / P1-02 → fail-closed | 先注册再补 rejection，判失败 |
| `DNLS01-T14` | 两段都要有。段一：A 的 socket 仍是 OPEN 时返回 `page-lost`，失败。段二：测试先关掉 A，然后响应要么是 `sandbox.cdp.page-lost` 且正文不是关闭前 DOM，要么是按 `lastUrl` 打开的新页面。B 的 `lastUrl` 与 socket 身份两段都不变 | spike | 集成 | 🆕 `test/cdp-keeper.spike.test.mjs` | P4-03 → `T-O-16` | 只做「或」的一边，不算 PASS |
| `DNLS01-T15` | `additionalProperties: false`；`lines: 501`、`cols: 1`、`rows: 513`、额外字段都拒绝。无 `path` 键。pong opcode 是 `0x0A`。P7 后：无 isolate、无 sandbox lane；`local` 单测标题仍在；`audit.jsonl` 不出现；open 能从 `[DNLS]` `term.audit` 读到。PTY 入口只在 `profiles/terminal/` | 短途 | 契约 | 🆕 `dsh-nano-local-sandbox/test/terminal-contract.test.mjs` | P4-04/P7-03 → `T-O-17` | 只拒绝 `lines: 501` 不算 |
| `DNLS01-T16` | 目录含 7+2 id 各一行；`shot.fit` 为 400；技能正文逐字等于派生表。全仓 `window.__nks` 为 0 | 短途 | 契约 | 🔱 fork `dsh-nano-kitesurf/test/diagnostics.test.mjs` 与 `test/skill.test.mjs` | P5-01/P7-02 → 一份目录 | 「包含子串」不算 |
| `DNLS01-T17` | 插件名来自同一次 `scanRoutes()` 的返回值，以及 `check-feature-contract.mjs` 与 `check-clean-lib.mjs` 实际遍历的 `PLUGINS`。负向：从扫描数组去掉 `[DNLS]` 后两道路由门禁必须非 0；只在 `[DNLS]` 多一条路由常量时扫描器非 0；`check-clean-lib` 对夹具里的裸 import 非 0 | 短途 | 契约 | ♻️ 三道既有脚本 + 🆕 `test/route-scan-coverage.test.mjs` | P5-02/P7-04 → `T-O-18` ③ | 测试自己 `console.log` 插件名，不算 |
| `DNLS01-T18` | fork 文件（不是旧的 `e2e-ego.mjs`）里 §4.6 的 23 个 `record` 名字都出现且都为真。URL 从实参采集，path 只以 `/nano-local-sandbox/` 开头。删掉任一名字、mock `fetch`、或没调用 `registerRoutes`，都失败。旧脚本退出码不得写入本行 | mega | e2e | 🔱 fork `dsh-nano-kitesurf/scripts/e2e-ego.mjs` | P6-02 → ② | 只检查日志前缀，不算 |
| `DNLS01-T19` | MCP client 连接数保持 0。`POST /nano-local-sandbox/shot` 不是 200。`requestRejection` 在 handler 之前，或失败 id 属于目录中已有的 id。先建 MCP 会话再请求，失败 | spike | 集成 | 🆕 `test/ui-without-agent.spike.test.mjs` | P6-02 → `T-O-11` | 返回 200 但 id 不是 `no-agent`，仍算假绿 |
| `DNLS01-T20` | 见 §8.6。P7 之后才能 PASS。P6 跑它必须失败，原因是「未到硬切」 | 短途 | 契约 | 🆕 `test/residue.test.mjs` | P7 → ③ | 允许清单变长、含 `..`、或指向 `deprecated/`，判假绿 |
| `DNLS01-T21` | 快照记下每个 `test()` / `it()` 的相对路径和标题。之后 `[DNK]` 与 `[DNT]` 的标题集合是快照的超集。已删模块的标题只有在 `[DNLS]` 有同一标题、且 `assert` / `strictEqual` 调用次数不少于旧标题时才能从旧包消失。空测试和 `assert.equal(1, 1)` 不算 | 短途 | 回归 | ♻️ 两包现有测试；🆕 `test/regression-count.test.mjs` | P6/P7 → 不删测试换绿 | 散文「已迁移」不算 |
| `DNLS01-T22` | PASS 读的是 P6-03 已经落盘的那份清单，内容等于本次 `npm pack --dry-run`。存档不存在则失败，测试不得现场生成。HEAD 必须是存档里那个 commit 的子孙。清单含配方、不含 `linux-prefix/` | 短途 | 契约 | 🆕 `test/pack-manifest.test.mjs` | P6-03 → 没有存档不能开始 P7 | 白名单由本次 pack 输出自己比自己，不算 |
| `DNLS01-T23` | §8.6 的九条副作用。每条都要有「攻击时副作用为 0」和「合法调用使同一副作用 ≥ 1」。pong 不算本项 | spike | 集成 | 🆕 `test/threat.spike.test.mjs` | P2-03/P3-02/P4-02/P7-03 → §7.3 | 测试自建、永不递增的计数器，不算 |
| `DNLS01-T24` | 20 次都必须等于这一条轨迹，禁止只做 20 次互比：`ensure(A)` → `ensure(B)` → 两个 id 不同 → 只对 A 切 mode → A 返回 `sandbox.instance.policy-stale` 且 A 的 `stop` 仍为 0、B 的 fingerprint 与挂载根不变 → 关闭 A 的 socket（关闭前是 OPEN）→ A 返回 `sandbox.cdp.page-lost` 且正文不是关闭前 DOM、B 的 `lastUrl` 不变 → B 的 `status` 仍是原 phase | soak | 集成 | 🆕 `test/lifecycle.soak.test.mjs` | P7 之后的退出硬闸 | 空序列互比、或 20 次里只出现过一次，不算 |
| `DNLS01-T25` | `accepted-risks.json` 末尾多出四条 `dnls:defer-`；追加前的每个 `fingerprint` 原样还在 | 短途 | 契约 | 🆕 `test/deferrals.test.mjs` | P8-02 → U10 落账 | 改掉旧行的 disposition 即失败 |

**列定义**：类型用 `短途` / `spike` / `mega` / `soak`。层用 `unit` / `集成` / `契约` / `回归` / `e2e`。PASS 四元组在执行前保持为上表的占位；没有四元组不得把 §10 标成 `verified`。

### 8.2 复用台账（沿用 / fork 的既有用例明细）

| 既有用例 | 处置 | 改动 | 起跑线状态 |
|----------|------|------|------------|
| `dsh-nano-kitesurf/test/*.mjs`（8 个文件） | ♻️ 沿用到 P7。删除标题必须满足 `DNLS01-T21`：同一标题在 `[DNLS]` 里，且断言调用次数不少于旧的 | 不把「从分母挪走」当豁免 | 现行存在。本计划不把 `v1.1` 的「52/52」当作计数 |
| `dsh-nano-kitesurf/test/diagnostics.test.mjs` | 🔱 fork 进 `[DNLS]` | 加上 7 个 id 与 2 个 `sandbox.*` | 现行会把未知 id 落到 502（`statusOf('kitesurf.brand.new')`） |
| `dsh-nano-kitesurf/test/skill.test.mjs` | 🔱 fork | 期望正文改为 `sandbox_*` | 现行锁的是旧正文 |
| `dsh-nano-kitesurf/scripts/e2e-ego.mjs` | 🔱 fork 为新文件 | 保留 23 个 `record` 名字；改 HTTP 实参；改 `history-kv` 的 source 断言。旧文件在 P7 之前可以还在，它的退出码不是 T18 | 现行 23 个 `record`，不是口头的 20 |
| `dsh-nano-terminal/test/run.mjs` | ♻️ 沿用 | P7 更新 attach / lane 断言 | 现行 包脚本 `npm test` |
| `packages/dsh-host-route-guard/test/route-guard.test.mjs` | ♻️ 沿用，不改 guard | `[DNLS]` 另写路由表测试 | 不重写已有门禁语义 |
| `scripts/check-*.mjs` 与 `route-scan.mjs` | ♻️ 沿用 | 只改扫描范围与等势断言 | 现行 route 门禁预期为失败（8-vs-24），所以 P5 之前的红不是回归 |

### 8.3 分层与跑法（各类型在哪跑、何时跑）

| 类型 | 跑法 / 频率 | 主要层 | 触发时机 |
|------|-------------|--------|----------|
| 短途 | 改对应包就跑 | unit · 契约 · 回归 | Phase 1 起 |
| spike | 夹具 backend + 真实路由注册 | 集成 | Phase 3、4、6 收口 |
| mega | fork 的 e2e，只打新前缀 | e2e | Phase 6，且 P5 已绿 |
| soak | `DNLS01-T24` × 20 | 集成 | Phase 7 之后，退出前 |

不新增第五种「发布门禁脚本」。mega 与 soak 是本计划的收口证据，不是仓级 release-gate。

### 8.4 测试缺口（本 AP 明确不覆盖什么 + 交给谁）

- 不覆盖真实 NVX、WHP、xray、gateway、本地 S3（`T-O-1` / U10）→ 以后的 Windows 计划；`DNLS01-T02` 只证明空实现会失败。
- 不覆盖 4G × N 的物理内存水位。`DNLS01-T10` 只证明声明的上限被执行。水位测量留给 U9 再调参，不在本计划假装测过。
- 不把旧 `e2e-ego.mjs` 的绿灯写成 `[DNLS]` 对等。
- 不把「还没有容量 errorId」写成不做上限测试。上限用「不创建新实例」验收，见 `DNLS01-T10`。

### 8.5 测试保真（防假绿 · 刻死）

- 每个标成通过的 Test-ID 都要有四元组 `commit + 具体命令 + exit 0 + UTC`。缺一格就是 `未观察`。只给五个硬闸补四元组不够。
- 本计划没有预先允许的 `deferred`。做不到的项保持 `未观察`，文档不得标 `executed`。
- 预先存在的红（今天的 8-vs-24）在 P5 之前不得被写成「与本计划无关所以忽略」。P5 的工作就是把它变成真绿。
- 安全项 `DNLS01-T23` 缺一条攻击，整项不算 PASS。
- **计数不是价值**：标题可以一个不删，但断言次数变少，仍是假绿。空 `test()` 不算补回。
- **旧套件不是新证据**：T18 的通过文件必须是 fork。旧脚本退出码写进来，整项作废。
- **门禁绿的假法**：插件没进 `scanRoutes()` / `PLUGINS`，所以 exit 0。打印一行插件名不算扫到。
- **回收的假法**：测试自己调用 `stop()`，或把超时数字传进 sweep。T10 禁止这两件事。
- **page-lost 的假法**：socket 还开着就返回这个 id，或者只用「新页面」这一支把 `page-lost` 支路留空。
- **零残留的假法**：允许清单用前缀、`..`、`deprecated/`，或把 `[DNK]` 整棵排除。见 §8.6。

### 8.6 逐项防假绿侦测

`DNLS01-T20` 的搜索从仓库根开始，跳过目录名 `.git` 与 `node_modules`。`.anote/` 里的 `.js` / `.mjs` 仍要扫；那里的 markdown 审查稿可以引用旧名字，但不许出现可执行文件里的命中。

命中是这些字面量：`spawn('container'`、`execFile('container'`、`/nano-kitesurf/`、工具名形如 `` `kitesurf_ `` 或 `'kitesurf_` 或 `"kitesurf_`、以及 `proc:kitesurf`。

允许留下命中的路径只有这四条，`path.resolve` 之后必须与其中一条相等。含 `..`、符号链接逃出仓库、或以 `deprecated/` 开头，都算失败。测试里的期望数组必须与这四条字面量逐字相等，长度不是 4 即失败。不得从环境变量或被测代码读入允许清单。

- `docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md`
- `docs/specs/dsh-nano-local-sandbox/dsh-nano-local-sandbox-v0.9.md`
- `docs/specs/dsh-nano-local-sandbox/dsh-nano-local-sandbox-v1.1.md`
- `docs/specs/dsh-nano-local-sandbox/plan/DNLS01-macos-platform-cutover.md`

`dsh-nano-kitesurf/` 整体不在允许清单里。其它历史 markdown（例如 `docs/code-review/`、`docs/specs/dsh-nano-kitesurf/`）里的旧路径必须在 P8 改成「见 QNA」，否则 T20 失败。P6 跑 T20 必须失败，原因固定为未到硬切；P6 变绿就是假绿。

`DNLS01-T23` 的九条，每条都要对照实验（合法调用使同一副作用 ≥ 1）：

1. 坏 digest，以及不是 40 位的 `checkout.ref`，各自使 `ensureImage` 次数 = 0。
2. checkout 路径含 `..` 或越出 profile 目录时，argv 既不进 `confine` 也不进 `spawn`。
3. 没有 `ctx.sandbox` 时构建抛错，裸 `spawn('npm'` 与 `spawn('curl'` 次数 = 0。
4. 实例 A 的 `workspaceRoot` 不得出现在实例 B 的 `mount` 参数里。
5. 只改四元组以外的字段时 fingerprint 不变；只改 `workspaceRoot` 时 fingerprint 变。
6. 未鉴权的 HTTP 与 WS upgrade，在 `requestRejection` 返回前 handler 次数 = 0；handshake 不得先于 rejection。
7. argv 首词或配方正文出现 `container machine` 时 registry 拒绝且 `spawn` 次数 = 0。
8. CDP `evaluate` 正文超过 2000 字符时不得执行，响应不得是上一次 DOM。
9. `[DNT]` 在 `term.session.create` 之后不得创建 `audit.jsonl`。

pong 留在 T15，不能用来凑本项的条数。

| Test-ID | 假绿的典型做法 | 侦测 | 判失败的条件 |
|---------|----------------|------|----------------|
| T01 | 只改 README，不改 `index.js` 的 inject；`engines.dsh` 被放宽 | import 真正的 `inject`；`engines.dsh` 与 `[DNK]` 的范围字符串相等；`files` 不含 `linux-prefix` | 集合不等，或引擎范围被改宽 |
| T02 | NVX 的空方法返回成功；只 grep 夹具 | 除 `capabilities()` 外逐个 reject；Apple 名词在构造时抛错 | `capabilities()` 以外的方法 resolve |
| T03 | 用字符串拼接躲过 grep | 对语法树 / 源码同时搜 `SandboxProvider` 与 `.shell =` | 命中不在允许清单 |
| T04 | 校验器只在 `describe` 跑，`ensure` 不跑 | `ensure` 路径也要拒绝，且 `ensureImage` 计数为 0 | 计数 > 0 |
| T05 | 测试把 `scope` 写死成期望值，不读 YAML | 从 `profile.yaml` 读 | 磁盘值不是 `session` |
| T06 | confine 双被调用了，但后面又裸 spawn | 两者都计数 | 裸 spawn > 0 |
| T07 | 两次 ensure 各 create 一次，再把 Map 写成同一个 id | id 相等且 `create` = 1；无模块级 `phase` | 只比较 id |
| T08 | 只改 mode，不算 `workspaceRoot` | 改根必须变哈希且不复用 id；改无关标签哈希不变 | 缺改根这一条 |
| T09 | 测试自己的计数器恒为 1 | 看 volume 上的记录数，并确认没有第二份文件 | 计数器不观察磁盘 |
| T10 | 直接 `stop()`，或 `sweep(50)`，或无条件 stop | 超时只能从夹具 profile 读出；未超时 `stop` = 0；达上限不再创建 | 生产 YAML 被改成短值 |
| T11 | P6 就用全仓断言，于是把 `[DNK]` 排除出搜索 | P6 只扫 `[DNLS]` 包；P7 用 §8.6 的四条允许路径 | 排除 `[DNK]` 目录 |
| T12 | 只断言「含有 ensure」 | 集合差为空，且没有宿主快照 POST | 差集非空 |
| T13 | 先注册再补 rejection；`sessionBinding` 漏掉 | `register` 次数在抛错前为 0；每条 spec 的 `sessionBinding === true` | 缺一条 binding |
| T14 | 只做恢复分支，不测 OPEN 时不得 `page-lost` | 两段都要失败条件 | 只有「或」 |
| T15 | 只拒绝 `lines: 501`；拆掉 `local` | `cols`/`rows`/额外字段/`additionalProperties`；`local` 仍能开；`audit.jsonl` 不出现 | 只绿了 schema 的一条 |
| T16 | 正文「包含」工具名 | 整表逐字相等；`window.__nks` 为 0 | 有第二份手写表 |
| T17 | `console.log` 插件名；多一行加在已经被扫描的旧插件上 | 名字来自 `scanRoutes()` 与两份 `PLUGINS`；去掉 `[DNLS]` 后门禁非 0 | 只有正向 exit 0 |
| T18 | 只改 base 常量，evaluate 里仍是旧 URL；删掉 `history-kv` | 23 个名字从 fork 文件解析；URL 从实参采集 | 旧脚本退出码被写进证据 |
| T19 | 返回 200，id 不是 `no-agent` | 不是 200，且 rejection 在 handler 前或 id 属于目录 | 先连上 MCP |
| T20 | 允许清单加长，或 `plan/../../../dsh-nano-kitesurf` | 四条实路径相等；P6 必须失败 | 清单长度不是 4 |
| T21 | 删测试再写「已迁移」，或空 `test()` 把个数补回 | 标题超集 + 断言调用次数 | 只有个数 ≥ 快照 |
| T22 | 存档不存在时现场 pack | 读事先落盘的清单；HEAD 是其子孙 | 清单自己比自己 |
| T23 | 自建计数器恒为 0；用 pong 占一条 | 本节九条都有对照实验 | 缺一条 |
| T24 | 20 个空数组互比 | 与本节规定轨迹深相等 | 次数到了但轨迹缺格 |
| T25 | 改旧 risk 的 disposition 来「整理台账」 | 旧 fingerprint 集合是超集，新四条以前缀区分 | 旧行被改写 |

---

## 9. 风险、依赖与完成后状态

### 9.1 风险与依赖

| 风险 / 依赖 | 描述 | 当前判断 | 应对方式 |
|-------------|------|----------|----------|
| 容量没有单独的 errorId | R-5 只登记了两个 `sandbox.*` | medium | 用「不创建新实例、响应不是 2xx」验收，不新造 id，也不把 `policy-stale` 挪用过来 |
| 门禁今天是红的 | `route-scan.mjs:210-212` | high | P5 先于 P6；不许用排除插件的方式转绿 |
| 硬切无运行时回退 | `T-O-10` | high | P6-03 快照 commit + pack 清单；失败就回到 commit |
| CDP 丢页被 UI 当成「还在」 | `T-O-16` | high | `DNLS01-T14` 比较 DOM 哈希 |
| `[DNT]` 源码已从 `lib/*.js` 拆到 `src/host` | QNA 行号过期 | medium | 本计划改 `src/host` 并扫描构建后的 `lib/` |
| 宿主可能拒绝没有 client 的包 | 现仓插件都有 client | medium | P1 的探针；零 slot client 只作为探针失败的分支 |
| 真实容器与本机 `container` CLI 是 debug build | `T-O-13` 禁止拿它当发布基线 | medium | manifest 记录所 pin 的稳定版；debug CLI 只用于开发机 |
| 活跃开发导致行号再漂 | 本计划锚的是 `7a49a07` | medium | 符号名优先 |

### 9.2 约束与前提

- **技术前提**：实现落在 `.agents/worktrees/dnls01-macos-platform-cutover`（`AGENTS.md:40`）。合并后按 `[业主]` 要求删除该 worktree。本文写在主工作区，因为它是规格而不是功能分支。
- **运行时前提**：Phase 6 的真实 `ensure` 需要本机 Apple `container`。没有 CLI 时，夹具 backend 仍必须跑完 T07–T16；`DNLS01-T18` 标 `未观察` 而不是跳过。标了 `未观察` 就不得把计划标成 `executed`。
- **组织协作前提**：容量 errorId 若要变成正式枚举，只能追加 QNA 修订（`DNLS01-qna.md` §9），不能只改代码。
- **上线 / 合并前提**：P5 三门禁绿、P6 的 T18 有四元组、P6-03 清单存在，才允许 P7 的删除进入同一合并。

### 9.3 文档同步要求

- 需要同步更新的设计文档：`v0.9` 与 `v1.1` 只加文首状态段（P8-01）
- 需要同步更新的说明文档 / README：仓根 `README.md:3`、仓根 `AGENTS.md:23-29`、三包 `AGENTS.md`
- 需要同步更新的测试说明：`[DNK]` `AGENTS.md` 里「引擎在 8787」的句子随容器资产删除
- 退役清单（代码、注释、头注、行号锚、文档句）：
  - 代码：`container-engine.js`、`nano-kite.js`、`runtime/**`、`dnt-agent` stub、`IsolateLane`
  - 注释与头注：`[DNK]` `index.js` / `AGENTS.md` 里的 `KITESURF_CHECKOUT`、`container build` 步骤
  - 行号锚：本计划 §7 在执行完成后由执行日志改写到新符号；不在切割提交里「更新全世界的旧笔记」
  - 文档句：`README.md:3`、`[DNT]` `AGENTS.md:106`、`[DNK]` 交付物表
  - 台账行：`proc:kitesurf`、`/nano-kitesurf/`

### 9.4 完成后的预期状态

1. `[DNLS]` 是 kitesurf 容器的唯一控制者；`[DNK]` 保留面板、`lastPick`、context、技能机制，技能正文指向 `sandbox_*`。
2. `[DNT]` 仍有 `local` lane；sandbox 终端通过现有 `McpLane` 使用 `attach.url`；没有 `sandbox` lane，没有 isolate echo，没有第二份 `audit.jsonl`。
3. 三道既有门禁 `exit 0`，三份安全台账数字一致，没有新的 release-gate。
4. U9 的数字只活在 `profile.yaml`；U10 的四行在 `accepted-risks.json`。
5. QNA 仍是 `frozen`。公共 errorId 没有超出 R-5 的两个 `sandbox.*`。`[DNT]` 的 `local` 事件写在 `[DNLS]` 那一份审计里。

---

## 10. 收口（Definition of Done = 测试台账全 PASS 映射）

### 10.1 收口硬闸

1. `[DNLS]` 不依赖 `[DNK]` 源码完成 kitesurf `ensure` / 页面行为对等（`DNLS01-T18`，且 P5 的 `DNLS01-T17` 已经先绿）。
2. 硬切后的零残留与「`container` 只在 `backend-apple.js`」同时成立（`DNLS01-T20`、`DNLS01-T11`）。
3. 攻击用例与 20 次 soak 通过（`DNLS01-T23`、`DNLS01-T24`）。
4. 三包 pack 清单与回归计数没有用删文件换绿（`DNLS01-T22`、`DNLS01-T21`）。

### 10.2 收口映射表（收口目标 ↔ Test-ID ↔ 证据）

| 收口目标 | 工作项 | Test-ID | PASS 证据（四元组） | 状态 |
|----------|--------|---------|---------------------|------|
| 身份与 inject | P1-01 P1-02 P8-01 | T01 T03 | 执行时填写 | 未观察 |
| backend 可替换且 NVX 不改 L2 | P1-03 | T02 | 执行时填写 | 未观察 |
| manifest 失败关闭 | P2-01 P2-02 | T04 T05 | 执行时填写 | 未观察 |
| 构建不裸奔 | P2-03 | T06 T23 | 执行时填写 | 未观察 |
| session 实例与 fingerprint | P3-01 P3-02 | T07 T08 | 执行时填写 | 未观察 |
| history 单真源 | P3-03 | T09 | 执行时填写 | 未观察 |
| 资源治理可观察（含上限，不是 deferred） | P3-04 | T10 | 执行时填写 | 未观察 |
| 特权只在 backend-apple | P7-01 | T11 | 执行时填写 | 未观察 |
| 20 工具、无快照倒挂 | P4-01 | T12 | 执行时填写 | 未观察 |
| 路由 fail-closed | P4-02 | T13 | 执行时填写 | 未观察 |
| CDP keeper | P4-03 | T14 | 执行时填写 | 未观察 |
| terminal 合同，无新 lane | P4-04 P7-03 | T15 | 执行时填写 | 未观察 |
| 错误目录一份 | P5-01 | T16 | 执行时填写 | 未观察 |
| 三门禁 | P5-02 P7-04 | T17 | 执行时填写 | 未观察 |
| ② 对等 | P6-02 | T18 T19 | 执行时填写 | 未观察 |
| ③ 零残留 | P7 | T20 | 执行时填写 | 未观察 |
| 不删测试换绿 | P6 P7 | T21 | 执行时填写 | 未观察 |
| 包内容 | P6-03 P8 | T22 | 执行时填写 | 未观察 |
| 退出 soak | P7 之后 | T24 | 执行时填写 | 未观察 |
| U10 四行 defer | P8-02 | T25 | 执行时填写 | 未观察 |

### 10.3 Definition of Done

| 维度 | 完成定义 |
|------|----------|
| 功能 | §5 各 Phase 的预期全部为真。上限拒绝被 T10 实际打到，而不是标成 deferred |
| 测试 | §8 每一个标成 PASS 的 Test-ID 都有四元组。缺任何一格，该行保持 `未观察`，文档不得是 `executed` |
| 文档 | P8-01 的五条预期为真；QNA 冻结行未被修改 |
| 风险收敛 | §7.3 的每条攻击在 T23 有计数；U10 已追加；无运行时回退开关被加回来 |
| 可交付性 | 三包 `npm pack --dry-run` 与 T22 一致；worktree 按 `AGENTS.md:40` 在合并后删除 |

### 10.4 NOT-成功识别

任一退出硬闸（T17 在 P6 之前、T18、T20、T23、T24、以及 T10 的上限半边）为 `未观察` 或失败，本计划不得标 `executed`。没有预先允许的 `deferred`。不允许用旧 e2e 的退出码填 T18。T20 的允许清单长度不是 4，也不得标通过。

---

## 11. 执行日志回填（仅 `executed` 状态使用）

文档状态为 `reviewed`。本节按模板省略，执行完成前不回填。

## 12. 执行日志回填

> 执行者：`DNLS01 执行 agent（lead）`
> 执行时间：`2026-11-14`
> 文档状态：`reviewed`，**不是** `executed`。`DNLS01-T18` 的 ego 实跑仍是 `未观察`。
> 代码改动统计：工作树分支 `dnls01-macos-platform-cutover`，Phase commit `a85f9a5` `468a374` `2b9ac0f` `4b3ab2e` `178eb35` `6afb4d9` `fb0fabf` `f68c472`。

- **实际执行摘要**：P1 身份与 backend；P2 profile 与 confine；P3 实例/指纹/history/回收；P4 四个 L2 面；P5 错误目录与三门禁（56 条路由）；P6 包内特权点、e2e fork 静态检查、无 agent 截图、pack 存档；P7 硬切 [DNK] 容器资产与旧路由，[DNT] `attach.url` / pong `0x0A` / 去掉 isolate 源码与 `dnt-agent`；P8 清单、README、三包 AGENTS、U10 四行。
- **Phase 偏差**：`T18` 只做了 fork 静态断言，没有跑 ego（计划偏差，本机有 `container`，仍标 `未观察`）。`T20` 允许 `backend-apple.js` 保留容器 CLI 字面量，因为 `T-O-9` 要求这个调用点；四份历史文档的允许清单长度仍是 4。`[DNT] lib/client.js` 没有按新的 `lanes.js` 重建。
- **阻塞与处理**：没有把计划改成 `executed`。
- **测试发现**：`DNLS01-T23` 九条与 `DNLS01-T24` 二十次轨迹通过。`DNLS01-T18` 已实跑，不是未观察：`ego-browser nodejs < dsh-nano-local-sandbox/scripts/e2e-ego.mjs`，exit 1，`2026-11-14T06:20:55Z`。前 14 个 record 为真（到 `devtools-elements`）。`computed-styles` 在 `fetch('/nano-local-sandbox/elements?selector=p')` 抛错，因为现场 `https://dsh-dev.local` 对该路径返回 404 空体。同一时刻 `/nano-kitesurf/elements?selector=p` 与 `/nano-kitesurf/status` 是 200。现场 profile 还没切到这个分支。
- **后续 handoff**：合并回 `main` 与删除 worktree 仍等 [业主]。ego 实跑与 client 重建是后继，不在本日志里写成已完成。

### 12.1 逐工作项状态

| 工作项 | 状态 | PR | 实际落点 | 备注 |
|--------|------|----|----------|------|
| `P1-01`…`P8-02` | `✅ done` | 分支 commit，未开 PR | 见各 Phase commit | 本地 short-verified |
| `P6-02` / `DNLS01-T18` | `🟩 partial` | 同上 | `dsh-nano-local-sandbox/scripts/e2e-ego.mjs` | 静态 23 名称通过；ego 未跑 |
| `P9-01`…`P9-03` | `🟩 partial` | - | 本节与 closure | 审查在日志之后 |

### 12.2 文档状态

`reviewed`，保持不升为 `executed`（`2026-11-14`）。residual：ego 实跑、`[DNT]` client 重建。不回填成已收口。
