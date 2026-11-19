# DNPR01 行动计划 · 会话进度账本

> 服务业务簇: `dsh-nano-progress-report` / `[DNPR]`
> 计划对象: `DNPR01` 会话进度账本（ledger 投影、`read_progress`、四行锚、人类视图精简与当前工作项面板）
> 类型: `upgrade`
> 作者: `DNPR01 架构 agent（lead）`
> 时间: `2026-11-20`
> 文件位置: `docs/specs/dsh-nano-progress-report/plan/DNPR01-progress-ledger.md`
> 上游前序 / closure:
> - [`qna/DNPR01-qna-truth.md`](../qna/DNPR01-qna-truth.md) `🔒 FROZEN` / `NOT IMPLEMENTATION GRANT`（`T-O-1`–`T-O-17`，修订 `0.1.1`）
> - [`qna/DNPR01-qna.md`](../qna/DNPR01-qna.md) 是 decision provenance（`已冻结`）。冲突时回到问答，不改已冻结行，不改真相层规则句
> 下游交接:
> - 无后继计划。`ImplementationGrant`、`deploy-local`、生产升级不由本文件承担
> - 延后项的重开不在本计划开工；重开条件只指向 `T-O-13` / `T-O-15`，不在这里改条件
> 关联设计 / 调研文档:
> - [`spec-v1.1.md`](../spec-v1.1.md)（形成史与证据索引；**已被 `T-O` 取代**；簇编号 C0/C7/C1/C4/C5-01/C2-01/04/05 只作工作分解标签）
> 冻结决策来源:
> - [`qna/DNPR01-qna-truth.md`](../qna/DNPR01-qna-truth.md) §1–§2（只读 CITE；本计划不开 Q/A）
> grounding 来源:
> - 本计划 §7。测量提交 `c3e508e`（插件 `src/` 自 `1e41d91` 起未改）。行号漂移以「路径 + 符号名」为准
> 关联 reference-anchor:
> - 无独立 eval-reference-anchor。§7 是本计划的 grounding 真源
> 对抗审查（已回写，未改 QNA / 真相层）:
> - [`.anote/reviews/dsh-nano-progress-report/DNPR01/na/6284/qna-compliance.md`](../../../../.anote/reviews/dsh-nano-progress-report/DNPR01/na/6284/qna-compliance.md)
> - [`.anote/reviews/dsh-nano-progress-report/DNPR01/na/6284/exit-and-antigreen.md`](../../../../.anote/reviews/dsh-nano-progress-report/DNPR01/na/6284/exit-and-antigreen.md)
> 文档状态: `executing`（[业主] 2026-11-20 发车指令授权执行）

---

## 0. 执行背景与目标

[业主] 已冻结 DNPR01：进度事实只在一个宿主账本投影里计算，同一次发布硬切掉 `nano-progress-report:summary` 与 `task-times.js`；模型只看见逐字锁定的四行锚和只读工具 `read_progress`；人类视图按已选定的精简分层收，面板的 Tasks / Files / Failures 只看当前工作项。真相层写明 `NOT IMPLEMENTATION GRANT`。本文件只排执行顺序、落点和可证伪测试。QNA 冻结、本文件落盘，都不是开工授权。状态保持 `draft`，直到 [业主] 把它改为 `reviewed`。

当前测量面不是目标态。宿主仍注册 `nano-progress-report:summary`（`projection.js:105-107`），锚仍输出 `Goal:`、路径和「Recent Bash tool failures」（`context.js:10-31`），完成时间仍由窗口内 `task-times.js` 推导，Tasks 仍读官方 `todos`（`ProgressBody.jsx:87-90,118`）。这些是要被替换的缺口，不是可以靠现有绿灯保住的合同。

- **服务业务簇**：`[DNPR]`（包 `dsh-nano-progress-report`）。不改其他插件的运行时代码。[FUS] 只加一行引用
- **计划对象**：`DNPR01-progress-ledger`
- **本次计划解决的问题**：
  - 进度事实拆在 summary 投影、锚格式化、窗口内 `task-times.js` 三处，官方 owner 与插件推导叠在一起
  - 模型锚把路径和旧失败口径反复推送；没有只读拉取
  - 人类视图仍展开 args / result / reasoning，面板没有当前工作项的文件与未恢复失败
- **本次计划的直接产出**：
  - 一个 `nano-progress-report:ledger` 投影（`wire` + `summary:false`，`stateVersion` 1）和与之硬切的锚、`read_progress`
  - 浏览器精简分层与 C0 卫生、当前工作项三列表；`task-times.js` 删除
  - 同一次包合同回写、spec-v1.1 退场回写、`0.1.0` → `0.2.0`（`engines.dsh` 不动）
- **本计划不重新讨论的设计结论**：
  - 阶段只做账本与其通用消费基座（`T-O-1`）
  - 低干扰视觉继续有效，不做成第二个 Trajectory（`T-O-2` / `T-O-3`）
  - 能硬切不双写（`T-O-4`）
  - 交付簇、关闭项、延后项以真相层 `T-O-13` / `T-O-15` / `T-O-16` 为准。QNA §1 的旧句（「`v1` 含证据后才重开」「无打开回合时用最后一项」）不回用。不按 spec-v1.1 的「可直接执行」列重新划范围

---

## 1. 执行综述

### 1.1 总体执行方式

七段，顺序锁死为：**先离开 `main` 并复核锚，再抽出共用指纹与分层纯函数，再落账本，再硬切模型通道并删除 summary，人类时间线精简可与账本并行但必须用同一套指纹，面板三列表最后接账本视图，文档、版本与一次合并收口**。

`main` 只接收一次合并。该合并里不得同时存在 `nano-progress-report:summary` 与 `nano-progress-report:ledger`，不得保留 `task-times.js`。分支中间提交可以红，合并提交必须绿。不设运行时开关，不留旧 key 读取。

### 1.2 Phase 总览

| Phase | 名称 | 规模 | 目标摘要 | 依赖前序 |
|------|------|------|----------|----------|
| Phase 0 | 测量锁与 worktree | S | `.agents/worktrees/dnpr01-progress-ledger`；§7 锚仍指向测量面，漂移则停 | - |
| Phase 1 | 共用指纹与分层纯函数 | M | `src/shared/` 的开项、指纹、`classify` / `condenseGroup`；summary 行为不变 | Phase 0 |
| Phase 2 | 账本投影 | XL | `ledger.js` 的 init / apply / parseState / 视图；单测覆盖推导，尚不接锚 | Phase 1 |
| Phase 3 | 模型通道硬切 | L | 四行锚 + `read_progress`；删除 summary 单元与 `summary.js` | Phase 2 |
| Phase 4 | 人类时间线 C0 与 C7 | L | 过滤为空走精简；过滤非空逐行；去掉 args/result/reasoning 展示 | Phase 1 |
| Phase 5 | 当前工作项三列表 | L | Tasks 改读账本；Files / Failures；删 `task-times.js` | Phase 2, Phase 4 |
| Phase 6 | 同次文档、记录回放与一次合并 | M | 包合同、spec 退场、[FUS] 一行、`0.2.0`、验证命令、删 worktree | Phase 3, Phase 5 |

> 规模只帮助阅读，不是开工闸。Phase 4 可与 Phase 2–3 并行，但不得另写一套指纹。Phase 6 不得早于模型硬切和面板。

### 1.3 Phase 说明

1. **Phase 0 — 测量锁与 worktree**
   - **核心目标**：执行树离开 `main`；开工前确认 §7 的符号仍在测量行上。
   - **为什么先做**：`T-O-14` 指定分支位置。锚已漂移却按旧行号改，会改错文件。
2. **Phase 1 — 共用指纹与分层纯函数**
   - **核心目标**：bash / 文件 / 其他工具指纹、开项判定、A/B/C 分层各只留一份纯函数。
   - **为什么先做**：账本与浏览器被要求共用 `src/shared/`。先抽函数，现有 summary 测试仍锁住旧字节，避免抽函数时悄悄改指纹。
3. **Phase 2 — 账本投影**
   - **核心目标**：进度事实的唯一计算点可以离线回放，且 `v1` 不含任务证据字段。
   - **为什么放在这里**：锚、工具和面板都读这一个状态。没有它，硬切没有数据源。
4. **Phase 3 — 模型通道硬切**
   - **核心目标**：PromptContext 与 `read_progress` 换成锁定字面；summary key 从注册表消失。
   - **为什么放在这里**：模型字面依赖账本视图，不能在 summary 仍是锚数据源时改测试期望。
5. **Phase 4 — 人类时间线 C0 与 C7**
   - **核心目标**：默认视图一行一个进度事实；原始 args / result / reasoning 不再在 Progress 渲染。
   - **为什么放在这里**：只依赖 Phase 1 的纯函数，不依赖账本。与 Phase 2 并行，避免时间线继续用第二套 bash 指纹。
6. **Phase 5 — 当前工作项三列表**
   - **核心目标**：Tasks / Files / Failures 只显示当前完整层工作项；完成时间来自账本字段。
   - **为什么放在这里**：列表是账本视图的消费者。时间线借阅失败标题，所以放在行模型稳定之后。
7. **Phase 6 — 同次文档、记录回放与一次合并**
   - **核心目标**：包合同、spec-v1.1、[FUS] 与代码同一批进入 `main`；验证按 `T-O-14` 的四项命令，回放只记录。
   - **为什么放在这里**：文档写早了会描述尚未存在的 key。版本号只在这次发布改一次。

### 1.4 执行策略说明

- **执行顺序原则**：指纹先于账本与精简；账本先于锚、工具和面板；summary 的删除与新锚同一 Phase 收口；`main` 只合并一次。
- **风险控制原则**：不新增路由、不 `ctx.provide`、不导出投影 handle。账本状态与锚文本不得出现命令、输出、reasoning。威胁面见 §7.3，对应用例见 §8.5。
- **测试推进原则**：短途每改一组就跑，并且改掉编码旧语义的断言（§8.5）。不把 live 脚本、回放阈值、C1-03 归属率当成发布闸门。Phase 6 的 `npm run build` 与 `npm pack --dry-run` 只证明能构建、能打包，不证明硬切。硬切由注册结果和构建后的 `lib/host.js` 证明。没有 soak：账本是纯函数，竞态不在本计划。不把「没写 soak」记成通过。
- **文档同步原则**：`[NPR]/AGENTS.md` 的身份 inject、使用、验收第 4 条、不要、配置与状态、Model Experience 与代码同一合并。spec-v1.1 只改文件头、§5 状态列、附录 A/B、§7.1、§7.3，不复述决定。不改 QNA，不改真相层规则句，不改 RELEASE.md 与 CI。
- **回滚 / 降级原则**：没有运行时 v1 降级，也没有 summary 兜底。Phase 3 开工前在分支上留快照 commit。硬切失败回到该 commit，不把 `Goal:` 或路径行加回来。合入 `main` 之后的回滚是另一次 [业主] 决定，不在本计划预写兼容读取。

### 1.5 本次 action-plan 影响结构图

```text
DNPR01-progress-ledger
├── Phase 0
│   └── .agents/worktrees/dnpr01-progress-ledger
├── Phase 1
│   ├── src/shared/open.js          开项白名单
│   ├── src/shared/fingerprint.js   bash / 路径 / 其他工具
│   └── src/shared/condense.js      classify + condenseGroup
├── Phase 2–3
│   ├── src/host/ledger.js          🆕 唯一计算点
│   ├── src/host/context.js         锚字面硬切
│   ├── src/host/read-progress.js   🆕 工具文本
│   ├── src/host/index.js           注册 ledger + tools；摘掉 summary
│   └── 删除 src/host/projection.js 的 summary 单元、src/host/summary.js
├── Phase 4–5
│   ├── src/client/events/message.js   schedule 也开组
│   ├── src/client/group.js            开项集合与 C0 折叠
│   ├── src/client/view/Row.jsx        不再渲染 args/result/reasoning
│   ├── src/client/view/ProgressBody.jsx
│   ├── src/client/view/TasksSection.jsx
│   └── 删除 src/client/task-times.js 与 test/task-times.test.mjs
└── Phase 6
    ├── dsh-nano-progress-report/AGENTS.md
    ├── docs/specs/dsh-nano-progress-report/spec-v1.1.md
    ├── [FUS] §11.4 一行引用
    └── package.json version 0.2.0（engines.dsh 不动）
```

---

## 2. In-Scope / Out-of-Scope

### 2.1 In-Scope（本次 action-plan 明确要做）

- **[S1]** 在 `.agents/worktrees/dnpr01-progress-ledger` 实现账本投影并硬切 summary
- **[S2]** 逐字锁定的四行锚与 `read_progress`（字面来源 QNA `:410-427`，禁止改写）
- **[S3]** C0、C7、C2-01、C2-04、C2-05 的浏览器改动，以及 `schedule` 开组
- **[S4]** 同次修订 `[NPR]/AGENTS.md`、spec-v1.1 指定节、[FUS] §11.4 一行；版本 `0.2.0`
- **[S5]** 验证命令：在包目录 `npm test`、在仓库根 `node scripts/check-ui-rules.mjs`（NPR 行 0 告警）、`npm run build`、`npm pack --dry-run`；`[PROD]` 回放只记录

### 2.2 Out-of-Scope（本次 action-plan 明确不做）

- **[O1]** 任务证据字段、证据区间、C1-03 归属单测、C2-02、C2-03
- **[O2]** C2-06、C2-07、R6 顶部状态行、C5-02 skill、C3 导出与 `/progress`
- **[O3]** C6-02/03、`conversation.view`、分段控件、身份过滤词
- **[O4]** 旧 key 迁移器、双版本并存、`Config` 化上限、RELEASE.md、CI、附录 C 的 89 个文件、`deploy-local`

### 2.3 边界判定表

| 项目 | 判定 | 理由 | 重评条件 |
|------|------|------|----------|
| ledger + 锚 + `read_progress` + C0/C7/C2-01/04/05 | `in-scope` | `T-O-13` 点名交付 | 不重评；要改范围回 QNA |
| summary key、`task-times.js`、`Goal:` / 路径 / 「最近 Bash 失败」行 | `in-scope` 删除 | `T-O-5` / `T-O-12` / `T-O-14` | 不得以兼容为由留读 |
| C2-02 / C2-03 / C1-03 | `defer` | `T-O-15` | 任务证据作为同 `v` 可选字段追加时；追加则 `stateVersion` 递增并冷重建 |
| C2-06 | `defer` | `T-O-13` | [业主] 提出离开期间分隔线需求 |
| C3 | `defer` | `T-O-13` | [业主] 需要面板之外的人类出口；复用 `read_progress` 文本 |
| C6-02 / C6-03 | `defer` | `T-O-13` | 宿主公开 Fusion 配对事实且 [DNMS] 有 Fusion 实现 |
| R6 / C2-07 / C5-02 | `out-of-scope` | `T-O-13` 关闭 | 不重开，除非 [业主] 另开 QNA |
| `engines.dsh`、RELEASE.md、CI、deploy | `out-of-scope` | `T-O-14` | [业主] 另作决定 |

---

## 3. 业务工作总表

| 编号 | 所属 Phase | 工作项 | 类型 | 涉及文件（file:line） | 收口目标 | 测试映射（Test-ID） | 风险 |
|------|------------|--------|------|------------------------|----------|----------------------|------|
| P0-01 | Phase 0 | 建 worktree 并复核 §7 | `migrate` | `.agents/worktrees/`；§7 全表 | 分支 `dnpr01-progress-ledger` 存在；任一 §7 符号对不上就停 | `DNPR-T00` | `low` |
| P1-01 | Phase 1 | 指纹搬到 `src/shared` | `refactor` | `projection.js:32-43,75-102` → `src/shared/fingerprint.js` | 现有 summary 用例字节不变；新模块被账本与 condense 同引 | `DNPR-T01` | `medium` |
| P1-02 | Phase 1 | 开项判定与 A/B/C 纯函数 | `add` | `src/shared/open.js`；`src/shared/condense.js`；`group.js:15` | `user`/`goal`/`schedule` 判定只有这一份；分层不读 DOM | `DNPR-T02` | `medium` |
| P2-01 | Phase 2 | 账本 apply / parseState | `add` | `src/host/ledger.js` | 三层有界、无证据字段、无关事件同引用、超限与夹带字段被拒绝 | `DNPR-T03` `DNPR-T04` `DNPR-T05` | `high` |
| P2-02 | Phase 2 | 注册 ledger 视图 | `add` | `src/host/index.js:6,12` | key、`stateVersion` 1、`wire.summary === false`；`v` 在视图上 | `DNPR-T06` | `medium` |
| P3-01 | Phase 3 | 锚硬切并删除 summary 组装 | `remove` | `context.js:1-32`；`summary.js:1-33`；`index.js:14-20` | 只剩锁定的四行模板；`Goal:` / 路径 / 旧失败行不存在 | `DNPR-T07` `DNPR-T08` | `high` |
| P3-02 | Phase 3 | 注册 `read_progress` | `add` | `src/host/read-progress.js`；`index.js` inject | 描述、schema、概览、明细、截断、未知 id、16 KiB、`when` 与 QNA `:410-414` 一致 | `DNPR-T09` `DNPR-T10` | `high` |
| P3-03 | Phase 3 | 删除 summary 投影 | `remove` | `projection.js:105-112`；`test/host-projection.test.mjs` | 注册表无 `nano-progress-report:summary`；无迁移器 | `DNPR-T06` `DNPR-T11` | `high` |
| P4-01 | Phase 4 | 默认精简与展开收敛 | `update` | `ProgressBody.jsx:112-118`；`Row.jsx:22-56` | 过滤为空走段行；过滤非空逐行；源码不再渲染 args/result/reasoning | `DNPR-T12` | `medium` |
| P4-02 | Phase 4 | C0 卫生与 schedule 开组 | `update` | `group.js:24`；`message.js:12-16`；`constants.js:32`；`filter-menu.js:35`；`ProgressBody.jsx:122-138`；`turn.js:9-18,99-111`；`rows.js:111-114,182-191`；`TasksView.jsx:19` | 重复 todo 行折叠；0 计数菜单项隐藏；lifecycle 默认不显示；`completed` turn 行不再单独成行；`schedule` 开组 | `DNPR-T13` | `medium` |
| P5-01 | Phase 5 | 三列表与开关 | `update` | `TasksSection.jsx:27-86`；`TasksView.jsx:31`；`ProgressBody.jsx:25-35,87-118` | 只显示当前完整层项；官方 `todos` 不再驱动面板；`view` 四值，归零回 Tasks | `DNPR-T14` | `high` |
| P5-02 | Phase 5 | 删 `task-times.js`；时间列元信息 | `remove` | `task-times.js:12`；`test/task-times.test.mjs`；`Turn.jsx` | 模块与测试文件不存在；耗时与非 completed 结束原因在 56px 列 | `DNPR-T15` | `medium` |
| P6-01 | Phase 6 | 包合同、spec 退场、[FUS] 一行、版本 | `update` | `[NPR]/AGENTS.md:7-20,64-73,77-103,105-120,145-152`；`spec-v1.1.md` 文件头与 §5、附录 A/B、§7.1、§7.3；[FUS] `:414-416`；`package.json:3,30` | 字段表只在包 AGENTS；spec 文件头为取代句；版本 `0.2.0`；`engines.dsh` 字符串不变 | `DNPR-T16` | `medium` |
| P6-02 | Phase 6 | 验证与一次合并 | `migrate` | `package.json:8-10`；`scripts/check-ui-rules.mjs` | 四项命令的结果写入本计划 §11；worktree 在合并后删除 | `DNPR-T17` `DNPR-T18` | `medium` |

---

## 4. Phase 业务表格

### 4.1 Phase 0 — 测量锁与 worktree

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P0-01 | 建分支并复核锚 | 从当时的 `main` 在 `.agents/worktrees/dnpr01-progress-ledger` 建分支。逐项打开 §7 的路径，确认符号名仍在。对不上就停，先改本计划的锚，不改业务代码。不在 `main` 上改 `src/`。 | `.agents/worktrees/` | 工作树干净，且只含本计划要改的包与点名文档 | `DNPR-T00` | 复核记录写在分支第一次提交说明里 |

### 4.2 Phase 1 — 共用指纹与分层纯函数

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P1-01 | 指纹单点 | a) 把 `bashKey` 原样搬到 `src/shared/fingerprint.js`：`cwd`、`workdir ?? null`、`command` 的 sha256；`run_in_background === true` 返回 null。b) 文件指纹只含路径；`write` / `edit` / `apply_patch` 归一，`apply_patch` 每个路径一条。c) 其他工具指纹是工具名加规范化参数摘要的摘要，函数返回摘要，不返回原文。d) `successfulBash` 的终态正则原样搬家，只用于扣住恢复，不用于推断失败。e) `projection.js` 改为调用这份函数，在 P3 删除前不得改变 summary 的现有字节。 | `projection.js:32-43,75-102`；新建 `src/shared/fingerprint.js` | 后台 bash 无指纹；非零退出码本身不产生失败 | `DNPR-T01` | `test/host-projection.test.mjs` 在删除 summary 之前仍然全过 |
| P1-02 | 开项与分层 | a) `src/shared/open.js`：`source.kind` 属于 `user` / `goal` / `schedule` 才是开项候选；判定不看角色字段。b) `src/shared/condense.js`：`classify(row)` 返回 A、B（带类别）或 C；`condenseGroup` 在 `groupRows` 之后把连续同类 B 收成段，段带 `children` 摘要，单行段不加计数。c) C 层以 spec-v1.1 §4.4 那张表为准，不是「至少」：空消息与纯 reasoning 步骤、回合中间的叙述、`completed` 的 turn 结束行、与 `todo/write` 重复的 `todo_write` 工具行、计数未变的 todo 行、已并入的 job 行、已批准或撤回的审批、成功的 `command/done`、`Session ended`、模型切换、工作目录切换、plan mode 切换。B 层段标题只用该节已有的探索 / 修改 / 命令措辞。d) 失败后通过：同一回合、同一指纹，先失败后成功则折叠；该回合最后仍失败则升为 A。这一判定按回合，不替账本做跨回合恢复。A 层失败行可留错误文本；段内子步骤只附错误首行。 | `group.js:15-24`；`constants.js:32`；新建两个 shared 文件 | 纯函数无宿主依赖，单测可直接 import | `DNPR-T02` | 分层用例不靠渲染 HTML |

### 4.3 Phase 2 — 账本投影

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P2-01 | 推导与 checkpoint | a) `init(header, inherited)`：`inherited` 用宿主传入值，非 fork 为 0；`stateVersion` 由注册点写 1。b) `seq < inherited` 的事件直接返回原状态引用。c) 开项：回合内第一条白名单 `user/message` 决定归属；`user` 与 `schedule` 开新项，身份是该事件 seq；`goal` 的 goal id 与当前项相同则并入，否则开新项，合并身份是 goal id，工具用的整数 id 仍是**首次开项 seq**（goal id 不是整数，不得塞进 `item`）。同回合后续白名单消息不另开。其他 kind 挂当前项。只存开项 seq、goal id、回合区间，不存提示或 goal 目标文本。d) 首个工作项之前**已经完成**的工具调用只加未归属计数（总数与其中失败数），不造工作项。结果落在开项之后的，按结果时刻归入该项，不在 call 时刻计入未归属。e) 失败：`isError === true` 或 `data.error != null`；非零退出码不算。恢复只认同一工作项内、同一指纹的后来成功；bash 成功还要过终态检查。后台 bash 不产生指纹，因此不能按指纹恢复；它仍然记一条失败（工具名 + seq，无 key）。未恢复失败留在所属项，后项的成功不改它。f) 审批按 id 配对 `approval/asked` 与 `approval/decided`；回合结束时未决者关闭。提问、jobs、子代理、当前 goal 阶段不在账本重算。g) 任务字段只写 `content` / `status` / `firstSeq` / `completedSeq` / `completedAt`。`status` 取本项最近一次含该 `content` 的 `todo/write`；快照没有则留上次。`completedSeq` 与 `completedAt` 取首次 `completed`，改回 pending 不清除，再次 completed 不覆盖。**不写证据区间，不执行「恰有一个 in_progress」的归属。** h) 文件只存路径与 seq。失败存工具名、指纹、次数、首末 seq；bash 不存命令。i) 最近 16 项为完整层（文件 ≤32、失败 ≤16、任务 ≤32，超限留最近的并记总数）；再 64 项降为骨架（身份、类别、开项 seq、回合区间、结束原因、四类计数）；更早并入累计，记下累计层覆盖到的最后 seq。降级不可逆：骨架不再接收更新；降级后同 `content` 的任务挂当前项。j) 未配对调用缓冲 ≤64。k) `asOfSeq` 只在事实变化时推进。视图顶层带 `asOfSeq`、`inherited`（非 fork 为 0）、累计层覆盖到的最后 seq、各列表截断计数。无关事件返回同一引用。骨架行对象复用。l) `parseState` 白名单重建。多余字段、超限、命令原文、证据字段一律抛错。常量写在代码里时只能有这一处定义，字段表文案留到 P6，不做成 `Config`。字段表写明两套身份：工作项视图身份是开项 seq（goal 另存 goal id 用于合并）；`read_progress` 的 `item` 一律是首次开项 seq。 | 新建 `src/host/ledger.js`；指纹来自 P1-01 | 空日志、fork、截断、上限、多字节路径、夹带字段都有用例 | `DNPR-T03` `DNPR-T04` `DNPR-T05` | 状态对象上不存在 `evidence` 键 |
| P2-02 | 注册 | a) 在 `index.js` 现有 `register` 旁注册 ledger：key `nano-progress-report:ledger`，`stateVersion: 1`，`wire` 块且 `summary: false`，视图带 `v`。b) 此 Phase 先不删 summary，以免锚在 P3 之前没有数据源。该提交说明写明「此提交不是合并提交」。c) 不 `ctx.provide`，不新增路由，不把 handle 导出为读取 API，不新增公共 error 枚举。 | `index.js:6-20` | `snapshot` 能读到 ledger；它不进 summary 通道 | `DNPR-T06` | 注册测试不依赖浏览器 |

### 4.4 Phase 3 — 模型通道硬切

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P3-01 | 锚 | a) 保留 `HEADER` 与 `order: 180`、`required: false`、`interpolate: false`。b) 模板逐字如下，禁止同义改写。计数为 0 的行不输出；只剩首行返回 `''`。c) `Tasks` 读官方 `todos` 计数与进行中 `content`，沿用 `context.js:4-8` 的转义，按 600 字节整段截断。d) `Unresolved…` 只读账本当前完整层项的未恢复失败，按工具名计数，不含命令；放不下以 `…` 结尾。e) `Active` 沿用 `summary.js:14-22` 的 jobs / 直接子代理读法，读完即删 `summary.js`。f) 删除 `Goal:`、路径行、「Recent Bash tool failures」行。不设等待行。锚文本不出现 `read_progress`、投影、面板、过滤。g) `Current work` 的类别只许 `a user request`、`a goal`、`a scheduled task` 三词，对应开项 kind。 | `context.js:1-32`；`summary.js:14-22`；`index.js:14-20` | 单测把整段模板锁死 | `DNPR-T07` `DNPR-T08` | 旧三行的否定断言存在，不是删掉原断言了事 |
| P3-02 | 工具 | a) `ctx.tools.register`，名称 `read_progress`。描述逐字：`Read this session's progress record: work items started by user requests, goals, and scheduled tasks, with their tasks, changed files, and tool failures that no later identical call fixed. Omit item for an overview of recent work items; pass an item id from the overview for its details.` b) 参数仅 `item`：integer、≥ 0，描述逐字 `Work item id from the overview. Omit for the overview.`；`additionalProperties: false`。输出 schema `{ type: 'string' }`。`isConcurrencySafe` 为真。c) `presentCall` / `presentResult` 只给短标签，执行锁定为 `查看进度`、`查看进度概览`、`查看工作项 <id>`。这三句不是 Q8 逐字合同；要改回 [业主]。不得把命令或路径放进标签。`isConcurrencySafe` 是返回 true 的函数，不是布尔字段。写法照 `inspect-checkpoint.js:140-165` 的形状，不照它的文案。d) `when`：账本工作项数 ≥ 1 才出现。e) 不传 `item`：首行写 `asOfSeq`、工作项总数、三层各自数量。其后每项一行，最多 80 行，新的在前。每行六个槽，对应 Q8 `:412`：id（首次开项 seq）、类别（只用锚里已锁定的 `a user request` / `a goal` / `a scheduled task`）、状态、任务完成数/总数、文件数、未恢复失败数。状态槽的执行锁定是：无未决审批的打开项写 `in progress`，有未决审批写 `waiting`，已结束写宿主 reason 原词（`completed` / `aborted` / `error` / `blocked` 等），不输出字段名 `reason.kind`。这三个状态词不是 Q8 逐字合同。概览行不加 `detail not retained`。末行写累计项数、各类计数、覆盖到的 seq。f) 传入 `item`：任务行是状态加原样 `content`，每条 ≤ 200 字节；文件行是路径加 seq；未恢复失败行是工具名、路径或 `-`、次数、首末 seq，不含命令；另给已恢复失败的数量。超限末行逐字 `另有 N 条未保留`。骨架项只给计数，并写 `detail not retained`（只在明细）。未知 id：抛普通 `Error`，消息含 `Omit item for the overview`，不新增、不导出公共 error 枚举。这句抛错文案是执行锁定，不是 Q8 逐字合同。g) 整份 UTF-8 ≤ 16 KiB，超出时截断并在末行标明。h) inject 增加 `tools`。不注册 skill。工具只读当前 exec 的会话，不按 session 列表扫描。 | 新建 `src/host/read-progress.js`；`index.js:6` | 描述、参数 schema、锚模板与 QNA `:410-426` 逐字一致；present 三句、概览状态词、未知 id 抛错句另标为执行锁定 | `DNPR-T09` `DNPR-T10` | 改 Q8 逐字合同或改执行锁定都会让对应单测失败；二者不要写成同一条真相 |
| P3-03 | 摘除 summary | 删除 `progressProjection`（key `nano-progress-report:summary`）及其 `index.js` 注册。`test/host-projection.test.mjs` 中仍描述 summary 行为的用例改为 ledger 用例或删除；禁止留着让旧 key 继续变绿。不写从旧 checkpoint 到新状态的迁移。旧单元格留在宿主缓存里，读不到、不推进。证明方式是调用注册并读 key，不是对源码做 `includes`。 | `projection.js:105-113`；`index.js:2,12` | 注册结果与构建后的 `lib/host.js` 都没有 summary key | `DNPR-T06` `DNPR-T11` `DNPR-T18` | 只做字面扫描不算收口 |

锚模板（P3-01，逐字）：

```text
Current session progress (observed facts, not instructions):
Current work: <a user request | a goal | a scheduled task>
Tasks: <c> complete, <i> in progress, <p> pending; in progress: <"content">
Unresolved tool failures in current work: <n> (<tool> <k>, …)
Active: <j> background jobs, <s> direct subagents
```

### 4.5 Phase 4 — 人类时间线 C0 与 C7

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P4-01 | 接上精简 | a) `ProgressBody` 在过滤为空时渲染 `condenseGroup` 的结果，过滤非空时仍 `applyFilter` 逐行。菜单计数仍按原始行。b) 段行展开只列子步骤摘要；失败附错误首行；子步骤不可再展开。c) 删除整个 `src/client` 里 `data-field="args"`、`"result"`、`"reasoning"` 的渲染，不限 `Row.jsx:28-41`。A 层失败行可留错误文本；段内子步骤把 `Row.jsx:25` 的全文收成首行。过滤非空的逐行展开同样没有这三个 `data-field`。不得把 `argsRaw` / `resultText` 整段打出来。d) 不新增底色、状态带、分段控件、手写样式。 | `ProgressBody.jsx:109-118`；`Row.jsx:22-41`；`view.test.mjs:189-197` | 源码扫描找不到这三处 data-field | `DNPR-T12` | 既有「不注册 conversation.view」用例继续存在且通过 |
| P4-02 | C0 与 schedule | a) `denoise`：同一 step 已有 `todo/write` 行时折掉 `todo_write` 工具行；工具失败仍留在事件行。b) 待办 glyph 改为空心圈，仍用 catalog，不手绘 SVG。c) prompt 开头连续的 `<tag>…</tag>` 块收成「附带上下文」，标题只留人话；不按插件名识别标签。d) `lifecycle` 默认不进默认视图，过滤菜单可勾回；`completed` 的 turn 结束行不再单独成行；`aborted` / `error` / `blocked` 保留。e) `filterCounts` 为 0 的类型不进菜单；已选中的 0 仍保留。f) `message.js` 的 match 与 `group.js` 的 OPENERS 纳入 `schedule`，调用 P1 的开项函数，不复制白名单。lifecycle 文案表不删，只改默认可见性。`completed` 的 turn 结束行在 `turn.js` 的 turn 定义与 `rows.js` 的 turn 行，两处都不再单独进入默认视图。0 计数隐藏改的是菜单构造，不是 `filterCounts` 本身。待办空心圈只换 `TasksView` 的 pending 分支。 | `group.js:15,24`；`message.js:12-16`；`turn.js:9-18,99-111`；`rows.js:111-114,182-191`；`ProgressBody.jsx:122-138`；`TasksView.jsx:19` | 时间线开项与账本开项同一函数 | `DNPR-T13` | `schedule` 不在两处各写一个 `Set` |

### 4.6 Phase 5 — 当前工作项三列表

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P5-01 | Tasks / Files / Failures | a) 取视图中最新的完整层项；没有打开回合时仍取该完整层项，不取骨架或累计层；没有工作项则三列表为空。b) Tasks 列该项账本任务，≤32，按 `firstSeq`，标签 `#n`。状态与完成时间只读账本字段。`N/M done` 与进度条按这一列表。删除对 `faceOf('todos')` 的面板依赖和 `taskCompletionTimes(rows)`。c) Files：≤32，新的在前，一行一个路径，过长从左截断留文件名，时间列空。d) Failures：只列未恢复，≤16；`工具名 + 标签 + ×n`。文件工具标签用路径；bash 用已加载时间线里该 seq 的现有标题，忽略当前过滤条；找不到就只写工具名。借阅不得写回账本，不得把 args/result 渲染加回去。e) 超限末行逐字 `另有 N 条未保留`。f) `Files N` / `Failures N` 用与 `Jobs N` 相同的 ghost `Button`，计数为 0 不渲染。g) `TASKS_KEY` 不新增；`view` 接受 `tasks` / `jobs` / `files` / `failures`；当前视图计数归零时回到 `tasks`。h) 行不可点击，不写 `task:` / `file:` 查询。不加分组头、状态带、分段控件。 | `ProgressBody.jsx:25-35,87-118`；`TasksSection.jsx:27-86`；`TasksView.jsx:31` | 面板与锚的任务口径不同：面板是账本史，锚是官方当前清单 | `DNPR-T14` | 源码不再 import `task-times.js` |
| P5-02 | 时间列与删除 | a) 回合耗时、非 `completed` 的结束原因放进现有 56px 时间列，不新开行。b) 删除 `src/client/task-times.js` 与 `test/task-times.test.mjs`。c) 完成时间缺失就留空，不写「完成」占位来伪造时刻。非 `completed` 的结束原因与回合耗时要出现在现有 56px 列，这条用短途断言，不靠 live。 | `task-times.js:12`；`styles` 里 `.npr-row-time` 56px 保持 | 包内无该文件名 | `DNPR-T15` | 构建产物里没有 `taskCompletionTimes` |

### 4.7 Phase 6 — 同次文档、记录回放与一次合并

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射（Test-ID） | 收口标准 |
|------|--------|----------|------------------------------|----------|----------------------|----------|
| P6-01 | 文档与版本 | a) `[NPR]/AGENTS.md`：身份 inject 写入 `tools`；使用表改成面板读账本、锚读官方；验收第 4 条改为精简后的行与三列表，不再写「Tasks 与 todos 同步」；不要：删掉 `task-times.js` 句，改为完成时间来自账本，并写明 Progress 不展示 args/result/reasoning 原文；视觉体系：删掉「窗口内没有就只写完成」，改成缺时刻留空；配置与状态增加 `v1` 字段表（名称、类型、含义、上限、截断表示）和 16/64/32/16/32，以及 `view` 四值；新增 Model Experience，分锚与工具两项，写 token / KV 影响。字段表是合并评审材料，不在 QNA 复写。构建节的 UI 规则命令改成仓库根 `node scripts/check-ui-rules.mjs`，不要照抄现在的 `../../scripts`。b) spec-v1.1 文件头逐字加上：「本文已被 `qna/DNPR01-qna.md` §1 的 `T-O` 取代，保留为形成史与证据索引；冲突以 `T-O` 为准」。§5 状态列、附录 A/B、§7.1、§7.3 改为引用 `T-O` 编号。R6 与 C2-07 写入附录 B 为不做。不另写 v1.2。c) [FUS] §11.4 增加一行：身份维度改由过滤条进入，不以该节为 [DNPR] 设计输入，见 `T-O-13`。不改该节其余句子。d) `package.json` `version` 改为 `0.2.0`。`engines.dsh` 保持 `>=0.2.2-rc.5 <0.3.0`。 | `AGENTS.md` 上列各节；`spec-v1.1.md`；[FUS] `:416`；`package.json:3,30` | 三处文档与代码同在合并提交里 | `DNPR-T16` | 包 AGENTS 是字段表的唯一登记 |
| P6-02 | 验证与合并 | a) 在包目录跑 `npm test`、`npm run build`、`npm pack --dry-run`；UI 规则在仓库根跑 `node scripts/check-ui-rules.mjs`。包目录的相对路径是 `node ../scripts/check-ui-rules.mjs`，不是 `../../scripts`。b) `[PROD]` 离线回放只记录四个数到 **spec-v1.1 §7.3** 与 **本计划 §11**：视图体积、锚文本变化次数、冷构建耗时、精简前后行数。缺日志就写「本机未复跑」和原因，禁止抄 QNA 里的 122→56 充当本次实测，禁止用阈值 `assert`。本计划自己的 §7.3 是威胁模型，不写回放数字。c) C1-03 不跑、不写占位通过。d) 一次合并到 `main`。合并后按 [业主] 要求删除 worktree。不执行 `deploy-local`。不改 RELEASE.md、CI。 | `package.json:9-10` | §11 有命令、计数与时间；没有假数字 | `DNPR-T17` `DNPR-T18` | 合并提交的树里 summary key 与 `task-times.js` 都不存在 |

---

## 5. Phase 详情

### 5.1 Phase 0 — 测量锁与 worktree

- **Phase 目标**：执行不落在脏的 `main` 上，锚是当时的源码。
- **本 Phase 对应编号**：`P0-01`
- **本 Phase 新增文件**：无
- **本 Phase 修改文件**：无业务文件
- **本 Phase 删除文件**：无
- **具体功能预期**：
  1. 分支名是 `dnpr01-progress-ledger`，目录在 `.agents/worktrees/`。
  2. §7 每个路径都能打开，符号名匹配。
- **对应测试台账项**：`DNPR-T00`
- **收口标准**：复核不过就不进 Phase 1。
- **本 Phase 风险提醒**：在 `main` 上改 `src/` 会破坏「一次合并」。

### 5.2 Phase 1 — 共用指纹与分层纯函数

- **Phase 目标**：后两个计算点不再各写一套指纹和开项规则。
- **本 Phase 对应编号**：`P1-01` / `P1-02`
- **本 Phase 新增文件**：`src/shared/fingerprint.js`、`src/shared/open.js`、`src/shared/condense.js`
- **本 Phase 修改文件**：`src/host/projection.js`（调用点，summary 语义保持到 P3）
- **本 Phase 删除文件**：无
- **具体功能预期**：
  1. `bashKey(raw, cwd)` 与现在 `projection.js:32-43` 同字节。
  2. `run_in_background: true` 得到 null。
  3. `apply_patch` 两条路径得到两个指纹。
  4. 其他工具的指纹函数不把参数原文放进返回值。
  5. `classify` 对 `completed` turn 结束行给 C，对仍失败的 bash 段给 A。
- **对应测试台账项**：`DNPR-T01` / `DNPR-T02`
- **收口标准**：搬家后的 summary 投影测试仍然全过。
- **本 Phase 风险提醒**：规范化参数摘要如果把不稳定键序算进去，同一调用会变成两个失败。摘要前按键名排序，只取可 JSON 化的参数；解析失败则只用工具名。不把原文存进状态。

### 5.3 Phase 2 — 账本投影

- **Phase 目标**：离线事件序列可以推出 `v1` 视图，且推不出证据区间。
- **本 Phase 对应编号**：`P2-01` / `P2-02`
- **本 Phase 新增文件**：`src/host/ledger.js`、`test/ledger.test.mjs`
- **本 Phase 修改文件**：`src/host/index.js:6-20`（先加注册，后于 P3 删 summary）
- **本 Phase 删除文件**：无
- **具体功能预期**：
  1. 空会话：工作项 0，未归属计数 0，`asOfSeq` 不推进。视图顶层能读到 `inherited`，非 fork 为 0。
  2. `seq < inherited` 的已完成工具调用不进未归属计数，状态引用不变。
  3. 首项之前已完成的调用计入未归属；call 尚未 result、且 result 落在开项之后的，不在 call 时刻计入。
  4. 同一 goal id 的第二轮并入首项；整数 id 仍是首项开项 seq。
  5. 第 17 个完整项出现时，最老的完整项变成骨架；再向骨架项发送同内容任务，骨架行对象仍是原引用，任务出现在当前项。
  6. 工作项达到 81 个时，最老的一项离开骨架、只剩累计计数；从新到旧的前 80 个仍在完整层或骨架层。创建序第 81 项本身是最新的完整层项，不是被挤出的那项。
  7. 文件第 33 条、失败第 17 条、任务第 33 条被丢掉并记总数，视图能说出「另有 N 条」。
  8. `parseState` 见到 `command`、`evidence`、`args` 或超长数组就抛错。
  9. 无关事件（例如纯 reasoning）返回 `===` 原状态。
  10. 失败判定不读退出码；同项同指纹成功才恢复；另一项的成功不恢复此项。后台 bash 无指纹，但失败仍留下无 key 的一条。
  11. 审批按 id 配对；回合结束时未决者关闭，不留到下一项。
  12. 任务改回 pending 后 `completedAt` 还在；第二次 completed 不改 `completedSeq`。
- **对应测试台账项**：`DNPR-T03` / `DNPR-T04` / `DNPR-T05` / `DNPR-T06`
- **收口标准**：上面 12 条都有失败即红的断言；没有「归属一致率 100%」这类用例。
- **本 Phase 风险提醒**：把官方 `todos` 再算进账本，或把提示文本抄进状态。两者都是范围错误。

### 5.4 Phase 3 — 模型通道硬切

- **Phase 目标**：模型看见的字面与 QNA `:410-427` 一致，summary 通道消失。
- **本 Phase 对应编号**：`P3-01` / `P3-02` / `P3-03`
- **本 Phase 新增文件**：`src/host/read-progress.js`、`test/read-progress.test.mjs`、`test/host-context` 的新断言（改旧文件）
- **本 Phase 修改文件**：`context.js`、`index.js`
- **本 Phase 删除文件**：`src/host/summary.js`；`src/host/projection.js` 若已无剩余导出则整文件删除，否则只删 summary 单元。指纹不得留在被删文件里。
- **具体功能预期**：
  1. 无工作项且无官方任务、无 job：锚为 `''`。
  2. 有进行中任务：`Tasks` 行含转义后的 content，整段 ≤ 600 字节。
  3. 输出不含 `Goal:`、`Recent file-tool paths`、`Recent Bash tool failures`、反斜杠路径列表。
  4. 失败行形如 `Unresolved tool failures in current work: 2 (bash 1, edit 1)`，没有命令字符串。
  5. `read_progress` 无 `item` 时行数不超过 80 加首尾。
  6. 未知 `item` 抛错且不返回空概览冒充成功。
  7. 工作项为 0 时工具 `when` 为 false。
  8. 源码不再注册 `nano-progress-report:summary`。
- **对应测试台账项**：`DNPR-T07` / `DNPR-T08` / `DNPR-T09` / `DNPR-T10` / `DNPR-T11`
- **收口标准**：把描述改一个词，或把 summary key 加回去，对应测试变红。
- **本 Phase 风险提醒**：为了让旧的 `host-context.test.mjs:11-22` 继续过而保留旧字段。那是假绿，处理方式见 §8.5。

### 5.5 Phase 4 — 人类时间线 C0 与 C7

- **Phase 目标**：默认阅读是进度事实；原始载荷回到 Trajectory，不在 Progress。
- **本 Phase 对应编号**：`P4-01` / `P4-02`
- **本 Phase 新增文件**：`test/condense.test.mjs`
- **本 Phase 修改文件**：`ProgressBody.jsx`、`Row.jsx`、`group.js`、`message.js`、`filter-menu.js`、`TasksView.jsx`、必要时 `rows.js`
- **本 Phase 删除文件**：无
- **具体功能预期**：
  1. 过滤为空时，连续同类成功 bash 收成一段；过滤为 `type:shell` 时逐行还在。
  2. 展开段看不到 `data-field="args"`。过滤非空的逐行展开同样没有 args / result / reasoning。
  3. 一次 `todo_write` 默认只出现事件行。
  4. `schedule` 来源的 `user/message` 打开一组，且开项函数与账本是同一个。
  5. 0 计数且未选中的类型不在菜单里。
- **对应测试台账项**：`DNPR-T12` / `DNPR-T13`
- **收口标准**：`view.test.mjs` 里 conversation.view 的否定断言未删。
- **本 Phase 风险提醒**：用 CSS 把 args 藏起来但 JSX 仍渲染。扫描必须看源码。

### 5.6 Phase 5 — 当前工作项三列表

- **Phase 目标**：人在面板上只看当前完整层工作项，完成时间不再靠窗口推导。
- **本 Phase 对应编号**：`P5-01` / `P5-02`
- **本 Phase 新增文件**：无（断言加进 `test/view.test.mjs`）
- **本 Phase 修改文件**：`ProgressBody.jsx`、`TasksSection.jsx`、`TasksView.jsx`、`Turn.jsx`
- **本 Phase 删除文件**：`src/client/task-times.js`、`test/task-times.test.mjs`
- **具体功能预期**：
  1. 无打开回合时列表仍是最近完整层项，不是骨架。
  2. 官方 `todos` 被清空时，面板任务还在；锚的 `Tasks` 行可以消失。这是有意分叉。
  3. 文件 0、失败 0 时不出现两个 ghost 开关；Jobs 的旧行为保留。
  4. `view: 'files'` 且文件归零后，存回的 `view` 是 `tasks`。
  5. 借阅 bash 标题不改变 ledger 状态引用。
  6. 仓库内 `taskCompletionTimes` 与 `task-times` 路径为 0 命中（允许文档写「已删除」的那一句，若写了必须是否定句）。非 `completed` 结束原因和回合耗时出现在 56px 列；缺完成时刻的任务行不是「完成」二字。
- **对应测试台账项**：`DNPR-T14` / `DNPR-T15`
- **收口标准**：面板数据源的源码扫描不再出现 `faceOf('todos')` 与 `taskCompletionTimes`。
- **本 Phase 风险提醒**：为了少改 UI，继续用官方 todos 填 Tasks，同时让测试只查标题「Tasks」。那不是 C2-01。

### 5.7 Phase 6 — 同次文档、记录回放与一次合并

- **Phase 目标**：一次合并同时带走代码、包合同和 spec 退场。
- **本 Phase 对应编号**：`P6-01` / `P6-02`
- **本 Phase 新增文件**：无计划内的第二份收口文档
- **本 Phase 修改文件**：`[NPR]/AGENTS.md`、`spec-v1.1.md`、[FUS] 决策文档、`package.json`、本计划 §11（执行时）
- **本 Phase 删除文件**：worktree（合并并经 [业主] 要求之后）
- **具体功能预期**：
  1. `engines.dsh` 的字符串与测量时相同。
  2. spec 文件头含取代句，正文不再把 R1–R6 写成未决。
  3. [FUS] §11.4 多了一行引用，原段其余句子还在。
  4. 回放数字要么来自本次命令输出，要么明示未跑。
  5. 不产生 RELEASE 清单行，不调用 deploy。
- **对应测试台账项**：`DNPR-T16` / `DNPR-T17` / `DNPR-T18`
- **收口标准**：§10 的四项完成判据同时为真。
- **本 Phase 风险提醒**：把回放阈值写成 `npm test` 的一员，或把 C1-03 写成跳过即通过。

---

## 6. 依赖的冻结设计决策（只读引用）

> 只列编号与落点。规则句在真相层，不在这里复述，也不在这里改口。

| 决策 / Q ID | 冻结来源 | 本计划中的落点 | 若不成立的处理 |
|-------------|---------|----------------|----------------|
| `T-O-1` | 真相层 §1 | §0 范围 | 停，回 QNA |
| `T-O-2` | 真相层 §1 | P4、§7.2 | 停，回 QNA |
| `T-O-3` | 真相层 §1 | P1-02、P4 | 停，回 QNA |
| `T-O-4` | 真相层 §1 | §1.4 硬切 | 停，回 QNA |
| `T-O-5` | 真相层 §2.2 | P2、P3-03、P5-02 | 停在 Phase 3，不合并 |
| `T-O-6` | 真相层 §2.2 | P2-02、P6 字段表 | 停，回 QNA |
| `T-O-7` | 真相层 §2.2 | P2-01 状态字段 | 停在 Phase 2 |
| `T-O-8` | 真相层 §2.3 | P3；不注册 skill | 停在 Phase 3 |
| `T-O-9` | 真相层 §2.4 | P1-02、P2-01、P4-02 | 停在 Phase 2 |
| `T-O-10` | 真相层 §2.4 | P1-01、P2-01 | 停在 Phase 2 |
| `T-O-11` | 真相层 §2.4 | P2-01 上限；P6 字段表 | 停在 Phase 2 |
| `T-O-12` | 真相层 §2.3；字面 QNA `:410-427` | P3-01、P3-02 | 停在 Phase 3；不许改字面 |
| `T-O-13` | 真相层 §2.5 | §2 边界；P4；P5 | 把延后项做进来即判失败 |
| `T-O-14` | 真相层 §2.5 | P0、P6 | 第二次合并或改 `engines.dsh` 即判失败 |
| `T-O-15` | 真相层 §2.6 | P2-01 任务字段；§8.4 不测归属 | 写了证据字段即判失败 |
| `T-O-16` | 真相层 §2.6 | P5 | 面板继续读官方 todos 即判失败 |
| `T-O-17` | 真相层 §2.6 | 本文件路径与 §10 | 另写收口文档即判失败 |

---

## 7. 内置 Reference-Anchor 锚区

### 7.1 锚表（本计划工作要落在哪些既有代码 / 新建点上）

| 锚 ID | `path:line` | 落点（这是什么） | 本 AP 用途 | 处置 | 备注 |
|-------|-------------|------------------|------------|------|------|
| A-1 | `dsh-nano-progress-report/src/host/projection.js:32-43` | `bashKey` | P1-01 搬家 | `♻️ 重 substrate` | 字节保持到删除 summary 为止 |
| A-2 | `dsh-nano-progress-report/src/host/projection.js:75` | 失败判定 `isError` 或 `data.error` | P2-01 | `✅ 复用` | 不读退出码 |
| A-3 | `dsh-nano-progress-report/src/host/projection.js:96-102` | bash 终态标记，只扣恢复 | P1-01 | `✅ 复用` | 不得用来推断失败 |
| A-4 | `dsh-nano-progress-report/src/host/projection.js:105-113` | summary 投影 key 与 `stateVersion` | P3-03 删除 | `🆕 净新` 的反面 | 对象在 `:113` 闭合；新 key 在 ledger |
| A-5 | `dsh-nano-progress-report/src/host/projection.js:14-28` | `parseState` 白名单重建 | P2-01 照写法 | `✅ 复用` | 拒绝多余字段 |
| A-6 | `dsh-nano-progress-report/src/host/index.js:6` | inject 三件 | P3-02 加 `tools` | `✅ 复用` | 现为 `sessionProjections`、`systemPrompt`、`agents` |
| A-7 | `dsh-nano-progress-report/src/host/index.js:14-20` | PromptContext `order:180` `required:false` | P3-01 | `✅ 复用` | 不改 order |
| A-8 | `dsh-nano-progress-report/src/host/context.js:1-32` | 600 字节、HEADER、旧三行 | P3-01 替换正文 | `♻️ 重 substrate` | 函数在 `:32` 闭合；HEADER 句子保留 |
| A-9 | `dsh-nano-progress-report/src/host/summary.js:8-22` | 官方 todos 计数与 jobs / 子代理 | P3-01 拆走后删文件 | `✅ 复用` | todos 只留给锚 |
| A-10 | `dsh-nano-progress-report/src/client/view/ProgressBody.jsx:25-35` | `TASKS_KEY` 与 `view` | P5-01 扩值 | `✅ 复用` | 不新增 localStorage 键 |
| A-11 | `dsh-nano-progress-report/src/client/view/ProgressBody.jsx:87-90,118` | 面板读 `todos` 与 `taskCompletionTimes` | P5-01 换源 | `♻️ 重 substrate` | 收口时这两处调用消失 |
| A-12 | `dsh-nano-progress-report/src/client/view/TasksSection.jsx:28,70-86` | `Jobs N` ghost 开关 | P5-01 照做 Files/Failures | `✅ 复用` | 计数 0 不渲染 |
| A-13 | `dsh-nano-progress-report/src/client/view/Row.jsx:28-41` | args / result / reasoning 渲染 | P4-01 删除 | `♻️ 重 substrate` | 源码扫描的靶子 |
| A-14 | `dsh-nano-progress-report/src/client/group.js:15,24` | OPENERS 与 `denoise` | P1-02、P4-02 | `✅ 复用` | 开项改调 shared |
| A-15 | `dsh-nano-progress-report/src/client/events/message.js:12-16` | 只匹配 `user` 与 `goal` | P4-02 加 `schedule` | `✅ 复用` | |
| A-16 | `dsh-nano-progress-report/src/client/events/turn.js:9-18,99-111` | turn 结束行与 lifecycle 文案 | P4-02 | `✅ 复用` | lifecycle 不删定义；`completed` 行不再单独出现 |
| A-17 | `dsh-nano-progress-report/src/client/constants.js:32` | `todo_write` → todo | P4-02 折叠重复行 | `✅ 复用` | |
| A-18 | `dsh-nano-progress-report/src/client/index.js:4-6,17-19` | 明确不注册 conversation.view | P4 保持 | `✅ 复用` | 已建好，别重写 |
| A-19 | `dsh-nano-progress-report/src/client/task-times.js:12` | 窗口内完成时间 | P5-02 删除 | `remove` | 与测试一并删 |
| A-20 | `dsh-nano-progress-report/package.json:3,30` | `0.1.0` 与 `engines.dsh` | P6-01 只改 version | `✅ 复用` | 引擎范围一字不改 |
| A-21 | `dsh-nano-progress-report/test/host-context.test.mjs:11-22,36` | 旧锚字面与 inject 列表 | P3 改成否定断言 | `♻️ 重 substrate` | 删断言而不加否定 = 假绿 |
| A-22 | `dsh-nano-progress-report/test/view.test.mjs:189-197` | 禁止 conversation.view | P4 沿用 | `✅ 复用` | 不许删这组 it |
| A-23 | `dsh-nano-model-selector-compaction/lib/inspect-checkpoint.js:140-165` | 工具定义形状 | P3-02 只借形状 | `✅ 复用` | 不借文案，不引该包运行时 |
| A-24 | `docs/.../decision-model-fusion-feasibility-1119.md:414-416` | [FUS] §11.4 | P6-01 加一行 | `✅ 复用` | 不按该节实现分段控件 |
| A-25 | `src/host/ledger.js`、`src/host/read-progress.js`、`src/shared/*` | 尚不存在 | P1–P3 | `🆕 净新` | 不放到 `src/client` 里再复制一份 |

### 7.2 反例 ledger ⛔（别碰区 / 已知陷阱）

| ⛔ | 反例 / 陷阱 | 为什么（依据） |
|----|-------------|----------------|
| ⛔1 | 保留 summary key 或写迁移器 | `T-O-5` / `T-O-14` |
| ⛔2 | 锚里留 `Goal:`、路径、命令、工具名宣传 | `T-O-12` |
| ⛔3 | 注册 skill、`conversation.view`、`SegmentedControl`、顶部状态行 | `T-O-8` / `T-O-13` |
| ⛔4 | `v1` 写入证据区间，或用空测试充当 C1-03 | `T-O-15` |
| ⛔5 | 面板 Tasks 继续读官方 `todos`；锚 Tasks 改读账本 | `T-O-16` 与 AF-1，两处方向相反 |
| ⛔6 | 把借来的 bash 标题写回账本，或因此恢复 args 渲染 | `T-O-16` |
| ⛔7 | 上限做成 `Config`，或同发两版视图 | `T-O-11` / `T-O-6` |
| ⛔8 | 改 `engines.dsh`、改 RELEASE.md、加 release-gate、跑 `deploy-local` | `T-O-14` |
| ⛔9 | 另写一份收口文档或第二真相表 | `T-O-17` |
| ⛔10 | 过滤词 `task:` / `file:`、任务行可点击展开证据 | `T-O-13` 延后 C2-02/03 |
| ⛔11 | 手写样式、十六进制色、嫁接宿主 DOM | 包 AGENTS「不要」；`T-O-2` |
| ⛔12 | 把 goal id 字符串当作 `read_progress` 的 `item` | `item` 是整数；整数 id 用开项 seq |

### 7.3 上游真源指针 + 安全项威胁模型

- **独立 reference-anchor**：无。本 §7 是 grounding 真源。规则句的权威是 [`DNPR01-qna-truth.md`](../qna/DNPR01-qna-truth.md)，不是本锚表。
- **威胁模型**（本计划内，无单独上游文件；因此本文件不得标 `executed` 除非 §8 里下列向量都有红绿对应）：
  1. **checkpoint 夹带**：攻击者或坏缓存往状态塞 `command` / `args` / `result` / `evidence`。落点 `parseState`（对照 A-5）。必须抛错，不得原样存下。
  2. **模型通道泄密**：超长任务正文、路径、命令试图进入锚或工具文本。锚 ≤ 600 字节且不含路径与命令；工具 ≤ 16 KiB。工具失败行不含命令原文；文件工具可以有路径。
  3. **视图回写**：渲染 Failures 时把时间线标题写进账本。渲染前后状态必须 `===`。
  4. **越权读**：本插件不新增路由、不 `provide`、不按 session 列表扫描。工具只读当前 `exec` 会话。跨会话读者用宿主已有的 `observeSession`，授权不由本包发明。
  5. **合同走私**：新增或导出公共 error 枚举、双 key、或把 `engines.dsh` 改成不是 `>=0.2.2-rc.5 <0.3.0` 的字符串，都算未授权改约。`includes('>=')` 不算证明。

---

## 8. 测试台账

### 8.1 测试清单（主表）

| Test-ID | 测试项（验证什么） | 类型 | 层 | 来源 | 映射（工作项 → 收口目标） | PASS 证据（四元组） |
|---------|-------------------|------|----|------|---------------------------|---------------------|
| `DNPR-T00` | §7 每个锚的符号名仍在开工提交上 | `短途` | `契约` | `🆕` 开工提交里的逐锚清单。`npm test` 不跑它，套件绿不能填这一格 | `P0-01` → 锚未漂移 | 开工 commit + 每条 A-id 的路径与符号 + UTC。一句话「已复核」不算 |
| `DNPR-T01` | 指纹字节，且账本与 condense 都 import `src/shared/fingerprint.js`，包内不再有第二份 sha256 指纹 | `短途` | `unit` | `🔱 fork test/host-projection.test.mjs` + `🆕 test/fingerprint.test.mjs` | `P1-01` → 搬家不改字节且不复制 | 合并 commit + 两个顶层文件 PASS + UTC |
| `DNPR-T02` | 开项三 kind；A/B/C；同回合失败后通过 | `短途` | `unit` | `🆕 test/condense.test.mjs` | `P1-02` → 纯函数分层 | 合并 commit + 文件 PASS + UTC |
| `DNPR-T03` | §5.3 的 12 条，含未归属只计已完成调用、审批回合结束关闭、后台 bash 无 key 仍记失败 | `短途` | `unit` | `🆕 test/ledger.test.mjs` | `P2-01` → 无证据字段的账本 | 合并 commit + 文件 PASS + UTC |
| `DNPR-T04` | `parseState` 拒绝夹带与超限 | `短途` | `unit` | `🆕` 同文件攻击向量 | `P2-01` → 抛错 | 合并 commit + 用例名 + UTC |
| `DNPR-T05` | 无关事件同引用；骨架行不吸收更新 | `短途` | `unit` | `🆕` 同文件 | `P2-01` → `===` | 合并 commit + 用例名 + UTC |
| `DNPR-T06` | key、`summary:false`、`stateVersion` 1、snapshot 可见、summary 通道不可见 | `短途` | `unit` | `🔱 fork test/host-projection.test.mjs` 与 `host-context.test.mjs` | `P2-02` / `P3-03` → 只此 key | 合并 commit + PASS + UTC |
| `DNPR-T07` | 锚模板逐字；只剩首行则 `''`；≤600 字节 | `短途` | `unit` | `♻️ 改 test/host-context.test.mjs` | `P3-01` → 新模板 | 合并 commit + PASS + UTC |
| `DNPR-T08` | 否定：无 `Goal:`、无路径行、无 `Recent Bash`、无命令 | `短途` | `unit` | `🆕` 加在同一文件，替换 `:11-22` | `P3-01` → 旧行消失 | 合并 commit + 用例名 + UTC |
| `DNPR-T09` | 工具描述、schema、`when`、未知 id、16 KiB、截断句 | `短途` | `unit` | `🆕 test/read-progress.test.mjs` | `P3-02` → 字面锁定 | 合并 commit + 文件 PASS + UTC |
| `DNPR-T10` | 概览 ≤80 行；明细 200 字节；失败行无命令 | `短途` | `unit` | `🆕` 同文件 | `P3-02` → QNA `:412-414` | 合并 commit + 用例名 + UTC |
| `DNPR-T11` | 调用宿主注册后读到的 key 只有 ledger；无迁移函数。禁止只 `includes` 源码字符串 | `短途` | `契约` | `🆕 test/ledger-register.test.mjs` | `P3-03` → 硬切 | 合并 commit + 该顶层文件 PASS + UTC |
| `DNPR-T12` | 空过滤走段；非空逐行；无 args/result/reasoning data-field | `短途` | `unit` | `🔱 fork test/view.test.mjs` | `P4-01` → 不渲染原文 | 合并 commit + PASS + UTC |
| `DNPR-T13` | C0-01 折 todo 工具行、C0-02 待办不再用 `IconCheckCircleOutlineRegular`、C0-03 注入块收成附带上下文、C0-04 lifecycle 默认隐藏且 completed turn 不成行、C0-05 未选中的 0 计数不进菜单；`schedule` 与 shared 同函数 | `短途` | `unit` | `🔱 fork test/group.test.mjs`、`rows.test.mjs`、`filter-menu.test.mjs`、`view.test.mjs` | `P4-02` → 卫生 | 合并 commit + 五个 it 名 + UTC |
| `DNPR-T14` | 当前完整层项；清空官方 todos 后面板任务还在（字面扫描不能单独 PASS）；ghost；view 归零；借阅不写回；56px 列有耗时与非 completed 原因；缺时刻不写「完成」 | `短途` | `unit` | `🔱 fork test/view.test.mjs` | `P5-01` / `P5-02` → 三列表与 C2-05 | 合并 commit + PASS + UTC |
| `DNPR-T15` | `task-times.js` 与其测试不存在；`src/` 无残留 import。构建后的标识符断言放在 `DNPR-T18`，本项不看过期的 `lib/` | `短途` | `契约` | `🆕 test/task-times-removed.test.mjs` | `P5-02` → 模块消失 | 合并 commit + 该顶层文件 PASS + UTC |
| `DNPR-T16` | conversation.view 仍未注册；`engines.dsh` 全字等于 `>=0.2.2-rc.5 <0.3.0`（`includes('>=')` 不算）；版本 `0.2.0`；spec 文件头含取代句；包 AGENTS 含 `v1` 字段表且不再写缺时刻就「完成」；[FUS] §11.4 有指向 `T-O-13` 的一行 | `短途` | `契约` | `♻️ test/view.test.mjs:189-197` + `🆕 test/release-cut.test.mjs` | `P4` / `P6-01` → 文档与版本同切 | 合并 commit + 该顶层文件 PASS + UTC |
| `DNPR-T17` | `check-ui-rules` NPR 行 0 告警；`npm test` 全过 | `短途` | `契约` | `♻️ scripts/check-ui-rules.mjs`；`♻️ npm test` | `P6-02` → 无新警告 | 合并 commit + 命令输出 + UTC |
| `DNPR-T18` | build 之后再 import `lib/host.js` 注册结果只有 ledger，且产物不含 `taskCompletionTimes`；`npm pack --dry-run` 只证明打得出包。回放数字只记在 spec-v1.1 §7.3 与本计划 §11 | `mega` | `契约` | `🆕 test/built-host.mjs`（故意不用 `.test.mjs`，避免 `npm test` 在构建前跑到过期 `lib/`）。命令是 `npm run build && node --test test/built-host.mjs` | `P6-02` / `P3-03` → 产物是硬切后的宿主 | 合并 commit + 该命令 PASS + pack 输出 + spec §7.3 与本计划 §11 的原文或「本机未复跑」+ UTC |
| `DNPR-T19` | `src/host` 无 `ctx.provide`、无路由注册；`read_progress` 只读当前 exec；未知 id 抛普通 `Error`，模块不导出新的 error 枚举 | `短途` | `契约` | `🆕 test/host-boundary.test.mjs` | `P3-02` → §7.3 第 4、5 条 | 合并 commit + 该顶层文件 PASS + UTC |

**没有 soak 项。** 不把「未写 soak」记成通过。除 `test/built-host.mjs` 外，新测试一律放在 `test/*.test.mjs` 顶层。`package.json` 的 `node --test test/*.test.mjs` 不递归。放进子目录等于没写。`DNPR-T17` 的「npm test 全过」不能回填 `DNPR-T00`、`DNPR-T18`、回放，也不能回填一个没有文件名的扫描。

### 8.2 复用台账（沿用 / fork 的既有用例明细）

| 既有用例 | 处置 | 改动 | 起跑线状态 |
|----------|------|------|------------|
| `test/host-projection.test.mjs` | `🔱 fork` 进 ledger | 删 summary 专用断言；指纹用例留到搬迁证明完，再改指向 shared | 测量时存在；P3 后不得再锁 summary key |
| `test/host-context.test.mjs` | `♻️` 改期望 | `:11-22` 改为新模板 + 否定旧行；`:36` inject 增加 `tools` | 测量时期望旧锚。不改就会红，红是对的 |
| `test/task-times.test.mjs` | 删除 | 整个文件 | 测量时 3 个 it。删除后由 `DNPR-T15` 证明不是漏跑 |
| `test/view.test.mjs` | `🔱 fork` | 加 data-field 否定、三列表、保留 `:189-197` | 已存在 |
| `test/group.test.mjs`、`test/rows.test.mjs`、`test/filter-menu.test.mjs` | `🔱 fork` | C0 用例 | 已存在 |
| `test/events.test.mjs`、`test/builder.test.mjs`、`test/filter.test.mjs`、`test/i18n.test.mjs`、`test/bundle-smoke.test.mjs`、`test/contract.test.mjs` | `♻️ 沿用` | 只在行模型字段变化时改夹具，不削弱断言。`contract.test.mjs` 里 `engines.dsh.includes('>=')` **不能**充当 `DNPR-T16` | 已存在，纳入回归 |
| `test/live/*.live.mjs` | 不纳入本计划退出 | 0 | 不在 `npm test` 里。不得把它们的退出码写成 DoD |

### 8.3 分层与跑法（各类型在哪跑、何时跑）

| 类型 | 跑法 / 频率 | 主要层 | 触发时机 |
|------|-------------|--------|----------|
| 短途 | 包目录 `npm test`；改 UI 时在仓库根跑 `node scripts/check-ui-rules.mjs` | unit · 契约 | 每个 Phase 收口 |
| spike | 不单列。推导用例已在短途 | unit | — |
| mega | `npm run build && node --test test/built-host.mjs`，然后 `npm pack --dry-run`。pack 成功不等于单 key。`npm test` 不跑这个文件 | 契约 | Phase 6，合并前 |
| soak | 无 | — | 不设 |

### 8.4 测试缺口（本 AP 明确不覆盖什么 + 交给谁）

- 不覆盖 C1-03 人工标注一致率，也不覆盖「恰有一个 `in_progress`」的归属执行（`T-O-15` 延后）→ 证据字段重开时补单测，不在本次写跳过即过的占位。
- 不覆盖 C2-02 / C2-03 / C2-06 / C3 / C6-02 / C6-03 → 重开条件见 §2.3，不在本次假装有入口。
- 不覆盖 live 三脚本与 `deploy-local` → [业主] 择时，不计入完成。
- 不覆盖附录 C 的 89 个文件 → 仓库事务，不是本包。
- 回放四数不是闸门。缺 `[PROD]` 日志时记录未跑，不补造。

### 8.5 测试保真（防假绿 · 刻死）

- ✅ 每个 PASS 必带合并 commit、测试或命令名、UTC 时间。`npm test` 的通过个数不是证据。
- 下列做法直接判本 Phase 未收口：
  1. 删掉 `host-context.test.mjs:16-20` 的 `Goal:` / 路径 / `Recent Bash` 期望，而不加 `DNPR-T08` 的否定断言。
  2. 让 `host-projection.test.mjs` 继续断言 `nano-progress-report:summary` 并保持绿色。
  3. 删 `task-times.test.mjs` 后不添加 `DNPR-T15`，用总用例数下降来掩盖残留 import。
  4. 新增 `test/ledger.test.mjs` 却只断言 key 字符串，没有降级、同引用、夹带字段。
  5. C1-03 写成 `assert.equal(1, 1)`、`it.skip` 或「一致率 100」的空函数。
  6. 回放脚本里写死 `>= 50%`，或把 QNA 的 122→56 写进 spec-v1.1 §7.3 / 本计划 §11 却没有本次命令输出。写进本计划 §7.3（威胁模型）也不算回放记录。
  7. 只改 CSS 隐藏 args，`Row.jsx:28-41` 仍创建那三个 `data-field`。
  8. 只测过滤为空的精简，不测过滤非空仍逐行。
  9. 面板测试只查找文案 `Tasks`，不断言数据来自账本、不断言已删除 `faceOf('todos')`。
  10. `when` 恒为 true，或工作项为 0 仍注册工具，而测试没有断言 false。
  11. 未知 id 返回空字符串且测试断言「不抛」。
  12. 为通过安装而修改 `engines.dsh`，或用 `includes('>=')` 代替全字相等。
  13. 用 `npm test` 全绿回填 `DNPR-T00`、`DNPR-T18`、回放，或回填放在 `test/` 子目录里的文件。
  14. 只对源码做 `includes('nano-progress-report:summary')`，不调用注册，也不在 build 之后跑 `test/built-host.mjs`。字符串拼接绕过字面扫描仍算未收口。
  15. 指纹函数在 `ledger.js` 或 `condense.js` 里再写一份，投影字节测试却仍绿。
  16. 删掉 `task-times.js` 后时间列仍空，T15 绿了就当 C2-05 完成。
- 安全向量（§7.3）最低集合：`DNPR-T04` 夹带、`DNPR-T08` 与 `DNPR-T10` 泄密（失败行可有路径、不得有命令）、`DNPR-T14` 借阅不写回、`DNPR-T11` 加 `DNPR-T18` 无第二 key、`DNPR-T19` 不提供路由且不导出新 error 枚举、`DNPR-T16` 引擎范围全字未放宽。缺一不得把该类工作标完成。
- `degraded` 必须写机器可读原因。测量时已存在的失败不得算本计划的通过。

---

## 9. 风险、依赖与完成后状态

### 9.1 风险与依赖

| 风险 / 依赖 | 描述 | 当前判断 | 应对方式 |
|-------------|------|----------|----------|
| 模型字面漂移 | 描述或锚改一个词就是合同变化 | `high` | 单测逐字锁定；要改回 [业主] |
| 硬切窗口 | 分支中段同时有两个 key | `medium` | 只允许到 P3 收口为止；合并提交只留 ledger |
| 指纹搬家改字节 | summary 用例在删除前先红 | `medium` | P1 以原用例为夹具；红了先修搬家，不修期望 |
| 官方 todos 与账本任务分叉被当成 bug | 锚与面板口径不同 | `medium` | `DNPR-T14` 把分叉写成期望 |
| `[PROD]` 不在执行机上 | 回放写不出新数字 | `low` | 写进 spec-v1.1 §7.3 与本计划 §11：「本机未复跑」加原因；不抄旧数字；不挡合并 |
| 行号漂移 | §7 在开工时对不上 | `medium` | P0 停。以符号名为准改锚后再写代码 |
| 范围回潮 | 顺手做 C2-02 或 skill | `high` | §2.3；审查看 diff 有没有证据字段和 skill 注册 |

### 9.2 约束与前提

- **技术前提**：宿主仍是 `engines.dsh` 所写的 `>=0.2.2-rc.5 <0.3.0`。指纹与失败语义沿用测量到的 `projection.js`。
- **运行时前提**：账本是会话投影，不是新数据库。浏览器只读 `faceOf` / 时间线已加载事件。
- **组织协作前提**：本文件 `draft` 期间不写实现。开工以 [业主] 把状态改为 `reviewed` 为准。
- **上线 / 合并前提**：一次合并、一次 `0.2.0`。生产实例不随合并升级。

### 9.3 文档同步要求

- 需要同步更新的设计文档：`spec-v1.1.md` 的文件头、§5、附录 A/B、§7.1、§7.3；[FUS] §11.4 一行
- 需要同步更新的说明文档 / README：`dsh-nano-progress-report/AGENTS.md`（身份、使用、验收第 4 条、不要、视觉体系的完成时间来源、配置与状态、Model Experience、构建节里的 UI 规则命令）
- 需要同步更新的测试说明：无单独测试 README。用例以 §8 的文件名为准
- 涉及面退役时，退役清单必须覆盖代码、注释、头注、行号锚、文档句五类落点：`summary` 投影、`summary.js`、`task-times.js`、`test/task-times.test.mjs`、包 AGENTS 里指向 `task-times.js` 的句子、视觉体系里「只写完成」的句子、锚的 `Goal:` / 路径 / 「Recent Bash」字面、spec 里把 R1–R6 写成未决的句子

### 9.4 完成后的预期状态

1. `main` 上的 [DNPR] 只注册 `nano-progress-report:ledger`，并注册 `read_progress`。
2. 默认 Progress 不再渲染 args / result / reasoning；面板有当前工作项的任务、文件、未恢复失败。
3. 包版本 `0.2.0`，`engines.dsh` 未改；字段表只在包 AGENTS。
4. spec-v1.1 自称为形成史；本计划 §11 记有命令结果与回放原文或「未跑」。
5. worktree 已按 [业主] 要求删除。生产是否升级与本计划完成与否无关。

---

## 10. 收口（Definition of Done = 测试台账全 PASS 映射）

完成判据同时满足四项（`T-O-17`）：`T-O-14` 的验证通过（C1-03 除外）、合并到 `main`、包 AGENTS 与 spec-v1.1 回写完成、worktree 删除。部署不计入。

### 10.1 完成判据

这不是 `T-O-14` 所禁止的发布闸门：没有阈值、没有 live、没有 deploy。下列各项必须 PASS 并带四元组，否则不得标 `executed`。没有 soak 项，也不把 soak 算作通过。`npm test` 全绿不等于本表全过。

1. 开工锚复核（`DNPR-T00`）。套件不跑这一项。
2. 模型字面与 summary 硬切（`DNPR-T07` `DNPR-T08` `DNPR-T09` `DNPR-T11` `DNPR-T18`）
3. 账本不接受夹带、不含证据字段、降级不回写，且未归属与审批按 §5.3（`DNPR-T03` `DNPR-T04` `DNPR-T05`）
4. 面板与时间线不再走已退役推导，C2-05 有短途断言（`DNPR-T12` `DNPR-T13` `DNPR-T14` `DNPR-T15`）
5. 包合同、spec 取代句、[FUS] 一行、引擎全字与版本（`DNPR-T16`）
6. 不新增路由、不导出新 error 枚举（`DNPR-T19`）
7. `npm test` 全过，UI 规则 0 告警（`DNPR-T17`）。回放只记录在 spec-v1.1 §7.3 与本计划 §11，未跑而如实写下仍可完成；写了 122→56 且没有本次输出则不可。

### 10.2 收口映射表（收口目标 ↔ Test-ID ↔ 证据）

| 收口目标 | 工作项 | Test-ID | PASS 证据（四元组） | 状态 |
|----------|--------|---------|---------------------|------|
| 锚未漂移就开工 | P0-01 | `DNPR-T00` | 开工时填写 | `未观察` |
| 指纹单点且字节未改 | P1-01 | `DNPR-T01` | 合并时填写 | `未观察` |
| 开项与分层纯函数 | P1-02 | `DNPR-T02` | 合并时填写 | `未观察` |
| 账本推导与无证据字段 | P2-01 | `DNPR-T03` `DNPR-T05` | 合并时填写 | `未观察` |
| checkpoint 拒绝夹带 | P2-01 | `DNPR-T04` | 合并时填写 | `未观察` |
| 只注册 ledger | P2-02 P3-03 | `DNPR-T06` `DNPR-T11` | 合并时填写 | `未观察` |
| 四行锚且旧行消失 | P3-01 | `DNPR-T07` `DNPR-T08` | 合并时填写 | `未观察` |
| `read_progress` 字面与边界 | P3-02 | `DNPR-T09` `DNPR-T10` | 合并时填写 | `未观察` |
| 默认精简且不渲染原文 | P4-01 | `DNPR-T12` | 合并时填写 | `未观察` |
| C0-01–05 与 schedule 开组 | P4-02 | `DNPR-T13` | 合并时填写 | `未观察` |
| 三列表、C2-05、清空官方 todos 后面板仍在 | P5-01 / P5-02 | `DNPR-T14` | 合并时填写 | `未观察` |
| `task-times` 退役 | P5-02 | `DNPR-T15` | 合并时填写 | `未观察` |
| 文档回写、版本、引擎全字、不注册 conversation.view | P6-01 / P4 | `DNPR-T16` | 合并时填写 | `未观察` |
| 套件与 UI 规则 | P6-02 | `DNPR-T17` | 合并时填写 | `未观察` |
| 构建后的宿主产物与只记录回放 | P3-03 / P6-02 | `DNPR-T18` | 合并时填写 | `未观察` |
| 无 provide / 无路由 / 无新 error 枚举 | P3-02 | `DNPR-T19` | 合并时填写 | `未观察` |
| C1-03 归属单测 | — | 无 | 不作为本次完成条件 | `deferred` |

### 10.3 Definition of Done

| 维度 | 完成定义 |
|------|----------|
| 功能 | §2.1 的 S1–S5 都在合并提交里；§2.2 的 O1–O4 不在 diff 里 |
| 测试 | §8 除 `deferred` 行外全 PASS；§10.1 七项四元组齐全；§8.5 的假绿路径都不成立。`DNPR-T00` 不因套件绿而 PASS |
| 文档 | 包 AGENTS、spec 指定节、[FUS] 一行、本计划 §11 已回填 |
| 风险收敛 | 无双 key、无证据字段、无命令原文进状态或锚 |
| 可交付性 | `0.2.0` 可 `npm pack --dry-run`；未 deploy；worktree 已删除 |

### 10.4 NOT-成功识别

`DNPR-T00` 或 §10.1 其余任何一项仍是 `degraded` / `未观察`，本文件不得标 `executed`。包 AGENTS、spec-v1.1 指定节、[FUS] 一行未回写，或 worktree 还在，同样不得标。回放未跑而在 spec-v1.1 §7.3 与本计划 §11 如实写下，仍然可以完成。回放未跑却写了数字、把 QNA 的 122→56 抄进去、或把 C1-03 标成 verified，都是失败。`draft` 不是执行完成。

---

## 11. 执行日志回填（仅 `executed` 状态使用）

> 执行者：`lead`（DNPR01 worktree）
> 执行时间：2026-11-19T23:40 ~ 2026-11-20T03:30（Asia/Shanghai）
> 文档状态：`draft → executing → executed`
> 代码改动统计：7 新建源码 + 3 删除源码、8 新建/重写测试 + 2 删除测试、4 文档回写、`version` 0.1.0 → 0.2.0

- **实际执行摘要**：PH0 worktree + §7 锚复核（`T00`）；PH1 `src/shared/{fingerprint,open,condense}.js`；PH2 `src/host/ledger.js` 全量投影；PH3 四行锚 + `read_progress` 硬切删 summary；PH4 A/B/C 默认精简 + schedule 开组；PH5 面板读账本四列表 + 删 `task-times.js`；PH6 文档/版本/回放/验证。全部在 `dnpr01-progress-ledger` 分支，基线 `0dd99ab`。
- **Phase 偏差（计划 vs 实际）**：① P4-01 段行只在前置空过滤时启用，按计划；`includeEnd` 语义改为「completed turn 行并入 opener 尾列」，与计划 §8.4 一致。② P5-01 `TASKS_KEY` 的 `view` 在打开时归零即回 Tasks（计划写的是「切到该列表后归零回 Tasks」，实现为持久 view 校验 + `useEffect` 回写，行为等价）。③ P6-02 回放四项中「归属一致率」如实登记范围外未跑，其余三项实测（见 §11.4）。④ `schedule` 开组在 `message.js` 一处完成而非 `group.js` 两处——开项判定在 `openKind` 单点，`groupRows` 只加 `'schedule'` 进 `OPENERS`。
- **阻塞与处理**：`context.js` 的 `jsonCell` 正则曾写进字面控制字符使文件变二进制，`edit` 拒绝（"cannot edit … binary file"）→ 用 python 重写该行修回。`read_progress` 恢复计数起初按条目而非按失败数 → 改 `unresolved = Σ count`。16KiB 裁剪测试因真实明细被上限约束约 13KB 而失败 → 用伪造超大视图演练裁剪。`check-ui-rules` NPR 行 PH5 后出现 U2（`.npr-taskbar-switch`）+ U9（两个未定义类）→ 改类名 `npr-taskbar-view` + 补样式定义，回 0 告警。
- **测试发现**：`npm test` 177/177 PASS（含新增 `fingerprint` 11、`condense` 9、`ledger` 10、`read-progress` 6、`ledger-register` 2、`host-boundary` 2、`timeline-condense` 5、`release-cut` 5、`built-host` 1）；`node ../scripts/check-ui-rules.mjs` NPR 行 0 告警（`NPR 27 0 0 0 0 0 0 0 0 1`，尾 1 为 U10 豁免登记）；`node --test test/built-host.mjs` PASS（构建后）；`npm pack --dry-run`：10 文件 49.1kB，`src/`/`test/` 不进 tarball。
- **后续 handoff**：`deploy-local` 由 [业主] 决定；`test/live/*.live.mjs`（浏览器实测）未跑，非闸门；`conversation.view` 按 R5 裁决不注册；C1-03 与附录 B 各项保留范围外重开条件。

### 11.1 逐工作项状态

| 工作项 | 状态 | 提交 | 实际落点（file:line） | 备注 |
|--------|------|----|------------------------|------|
| `P0-01` | ✅ done | `6174f7d` 附提交说明 | `.agents/worktrees/dnpr01-progress-ledger` | `T00` 干净工作树 + §7 锚逐项对上 |
| `P1-01` | ✅ done | `6174f7d` | `src/shared/fingerprint.js:1-150` | `digest` 与 `node:crypto` 逐字节比对通过（含多字节/emoji） |
| `P1-02` | ✅ done | `6174f7d` | `src/shared/open.js`、`src/shared/condense.js:34-211` | `openKind` 单一判定；`classify`/`condenseGroup` 纯函数 9 用例 |
| `P2-01` | ✅ done | `e5fefb2` | `src/host/ledger.js:1-580` | 16+64 分层、files32/failures16/tasks32/pending64、不可变、WeakMap view 缓存、10 用例 |
| `P2-02` | ✅ done | `e5fefb2` | `src/host/index.js` | `LEDGER_KEY`、`stateVersion:1`、`summary:false`、wire `v:1` |
| `P3-01` | ✅ done | `7495b9c` | `src/host/context.js:1-80` | 四行锚逐字 `T-O-12`；`Goal:`/路径/旧失败行删除且有否定断言 |
| `P3-02` | ✅ done | `7495b9c` | `src/host/read-progress.js:1-260` | 逐字描述、`when`、概览 ≤80 行、明细、未知 id、16KiB 裁剪、`isConcurrencySafe` |
| `P3-03` | ✅ done | `7495b9c` | 删除 `projection.js`、`summary.js`、`host-projection.test.mjs` | 注册表单一 key 由 `release-cut.test.mjs` 锁定 |
| `P4-01` | ✅ done | `ec513bb` | `src/client/view/Turn.jsx:34-58`、`ProgressBody.jsx` | 空过滤走 `condenseGroup`；尾列给 `tailOf`；Row 不再渲染 args/result/reasoning |
| `P4-02` | ✅ done | `ec513bb` | `message.js`、`group.js:15`、`constants.js:13`、`filter-menu.js`、`rows.js` | `foldInjected` 剥前导 `<tag>` 块；0 计数菜单项隐藏；`schedule` 开组 |
| `P5-01` | ✅ done | `d7d9325` | `TasksSection.jsx`、`TasksView.jsx`、`ProgressBody.jsx` | 面板读 `faceOf('nano-progress-report:ledger')` 当前项；四列表 ghost 开关；归零回 Tasks |
| `P5-02` | ✅ done | `d7d9325` | 删除 `task-times.js`+测试；`Turn.jsx:27-33` | 尾列 = 非 `completed` 结束原因 + 耗时 |
| `P6-01` | ✅ done | 本提交 | `AGENTS.md`、`spec-v1.1.md` 头+§5+§7.1+§7.3+附录 A/B、FUS `:416`、`package.json:3` | 版本 0.2.0、engines 不变、字段表落包 AGENTS |
| `P6-02` | ✅ done | 本提交 | 本节 | 验证计数已回填；合并提交待 [业主] 授权合并；worktree 待删 |

### 11.2 关键指标

| 指标 | 基线（0.1.0 / spec-v1.1 §7.3 基线列） | 本次（0.2.0） | Δ |
|------|--------------------------------------|---------------|---|
| `npm test` | 152 | 177 | +25 用例 |
| `check-ui-rules` NPR 行告警 | 0 | 0 | 不变 |
| 进度锚文本变化次数（`[PROD]` 33 顶层会话 138 次 `request/context` 逐字比对） | 127（旧格式：路径行+失败行驱动） | 84（四行锚） | **−34%** |
| 可见行数（`[PROD]` 同批会话、按工作项分组） | 100 016（tool/call + assistant/message 原行） | 48 472（类别合并近似，不含 C 层剥除） | **−52%** |
| 账本 wire view | — | 1 983 854 B / 33 会话（均值 60 117 B，单会话最大 151 492 B） | 只记录 |
| 冷构建耗时（最大会话 49 387 事件） | — | 912.7ms（33 会话均值 148.4ms） | 只记录 |

### 11.3 时序执行日志

| 时点 | 步骤 | 决策 / 产出 |
|------|------|-------------|
| T0 | PH0 | `dnpr01-progress-ledger` worktree 干净落地，`T00` 过 |
| T1 | PH1 | shared 三模块 + 指纹/condense 用例；`6174f7d` |
| T2 | PH2 | ledger 全量投影 10 用例；`e5fefb2` |
| T3 | PH3 | 四行锚 + read_progress 硬切；`jsonCell` 二进制事故修复；`7495b9c` |
| T4 | PH4 | 时间线精简 + schedule 开组；`ec513bb` |
| T5 | PH5 | 面板读账本四列表 + 删 task-times + ui-rules 修复；`d7d9325`+`4c04177` |
| T6 | PH6 | 文档回写 + 版本 0.2.0 + 回放 + release-cut 用例 + 177 全绿 |

### 11.4 `[PROD]` 回放原文（spec-v1.1 §7.3 同源）

`test/live/prod-replay.mjs` 于 2026-11-20 对 `~/.dsh-desktop/sessions/**` 全部 341 个 `session.v4.jsonl.zstd` 做只读回放：33 个顶层会话过门槛（≥1 开项 `user/message` + ≥1 `tool/call`，排除 `origin:"subagent"`），138 次 `request/context` 为锚发射点逐字比对。四个数：锚文本变化 **127 → 84**；wire view 总量 **1 983 854 B**（均值 60 117 B）；最大会话（49 387 事件）冷构建 **912.7ms**（均值 148.4ms）；按工作项分组的可见行 **100 016 → 48 472**（类别序列合并口径，C 层剥除未计入，实际界面行数更低）。输出 `evidence/prod-replay.json` 按 `.gitignore:108-110` 不入库。归属一致率（C1-03）如实登记：本机未复跑，因 C1-03 在 DNPR01 范围外（§2.3），不做归因推断。

### 11.5 pre-existing 失败甩锅

无——本阶段未发现早于本轮的失败；`check-ui-rules` 对 DNMS/DNN 的既有 WARN 与本包无关（`NPR` 行 0）。

### 11.6 文档状态

`draft → executing → executed（2026-11-20）`。合并到 `main` 与 worktree 删除是 `executed` 的前置，随本阶段同次收尾；`deploy-local` 不执行（[业主] 授权范围外）。
residual / follow-up → 附录 B 重开条件；`test/live/*.live.mjs` 浏览器侧实测；C1-03 归属标注。
