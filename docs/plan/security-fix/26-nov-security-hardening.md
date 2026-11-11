# 26-nov-security-fix · 安全加固行动计划（security-hardening）

> 服务业务簇: `dsh-plugins`（四个插件 + `packages/` 共享包）
> 计划对象: `26-nov-security-fix` —— 安全审查 24 条 confirmed 的修复执行（三包增量加固 + P0 13 条 + P2 9 条 + local-supply 2 条）
> 类型: `modify | refactor`（加固 refactor 为主；新增三共享包与 `security/`/`scripts/`/`test/` 基座为 add）
> 作者: `security-fix agent（DeepSeek Harness）`
> 时间: `2026-11-11`
> 文件位置: 四插件 `dsh-nano-*/`、三共享包 `packages/dsh-{host-route-guard,remote-data-schema,html-policy}/`、仓库根 `security/`、`scripts/`、`test/`、`.github/workflows/release.yml`
> 上游前序 / closure:
> - `docs/code-review/26-nov/security-audit.md`（24 confirmed 事实层，`frozen`）
> - `docs/code-review/26-nov/pre-security-fix-qna.md` v1.1（执行真相 `frozen`；本 AP 是其唯一下游消费者）
> 下游交接:
> - 发布执行（每插件一次 minor + 三包 0.1.0）由 Phase 5 收口门禁接管；发布后的 P2 季度复核交 `release.md` 例行流程
> 关联设计 / 调研文档:
> - `docs/code-review/26-nov/security-audit.md` §4（24 条详情与 PoC）、§6（加固建议）、§7.1（被拒候选）
> - `.anote/security-26nov/findings.json`（机器可读 finding 真源）
> 冻结决策来源:
> - `docs/code-review/26-nov/pre-security-fix-qna.md` §1 Truth-Gate `T-O-1…T-O-14`（只读引用；本 AP 不填写 Q/A）
> grounding 来源:
> - `eval-reference-anchor` = 本 AP §7 内置锚区（无独立 reference-anchor 文件；§7 即 grounding 真源）
> 关联 reference-anchor:
> - 见 §7 内置锚区
> 文档状态: `draft`

---

## 0. 执行背景与目标

`security-26nov` 审计已确认 24 条安全问题（16 high / 6 medium / 2 low）；`pre-security-fix-qna.md` v1.1 已把修复执行层的全部决策冻结为 `T-O-1…T-O-14`。本 action-plan 不再讨论方向，只消费冻结结论，把它们落成四批内部门禁 + 一个发布收口的可执行 DAG。

核心约束一句话：**功能零回退（T-O-3）优先于安全收益；所有修复只叠加校验/清洗/围栏/限额，不删路由、不改 UI、不迁移数据位置（T-O-5/T-O-6）**。三共享包按 `T-O-13` 经 `devDependencies` + `lib/` bundle 分发；验收按 `T-O-14` 三件套（feature-contract 逐字段 / 存量桶回归 / 行为变化显式登记）。

> **纪律**：本文件只消费已冻结结论；若执行中发现冻结真相不成立，回 QNA 追加 `T-O-15+`，不在本 AP 开新 Q/A。

- **服务业务簇**：`dsh-plugins`
- **计划对象**：`26-nov-security-fix`
- **本次计划解决的问题**：
  - `remote-cross`（7 条）：shared-workspace 远端 marker/meta/tree 注入 + notepad fetch-mp 重定向 SSRF —— Batch 1
  - `remote→page`/`remote→agent`（6 条）：4 条 XSS + sanitizeMpHtml + validateJson DoS + imagine 模板注入 —— Batch 2
  - `page-self`（9 条）与 `local-supply`（2 条）：零成本加固 + accepted 登记 + esbuild/CI —— Batch 3
- **本次计划的直接产出**：
  - 三共享包 `dsh-host-route-guard` / `dsh-remote-data-schema` / `dsh-html-policy`（0.1.0，构建期依赖）
  - `security/route-sensitivity.json`（43 行）、`security/feature-contract.json`、`security/accepted-risks.json`、`security/route-inventory.md`
  - `scripts/`：gen/check-route-sensitivity、check-feature-contract、security-regression harness、check-clean-lib
  - `test/remote-schema/compat/` 存量样本语料 + `test/spike/security-fix/` 宪章
  - 四插件各一次 minor（notepad/model-selector/explorer 0.1.1→0.2.0；nsw 0.1.0→0.2.0）+ 三包 0.1.0 + `.github/workflows/release.yml`
- **本计划不重新讨论的设计结论**：
  - 三桶分诊与 P0/P2 归属（来源：`T-O-5`，Q3=C）
  - 三包增量架构与「不迁移数据面」（来源：`T-O-6`，Q4=A）
  - 43 条逐条清单 + 严格整对象拒绝 + 共享 allowlist 双 renderer（来源：`T-O-7/8/9`，Q5=B/Q6=A/Q7=A）
  - 四批门禁 + 每插件一次 minor（来源：`T-O-10`，Q8=B）
  - P2 逐项处置 + accepted-risks（来源：`T-O-11`，Q9=B）
  - 供应链完整修复（来源：`T-O-12`，Q10=A）
  - 分发通道 + 回归门禁三件套（来源：`T-O-13`/`T-O-14`，v1.1 errata）

---

## 1. 执行综述

### 1.1 总体执行方式

按 `T-O-10` 的四批执行，外加一个发布收口 Phase：**先基线后修复、先宿主数据后内容渲染、先 P0 后 P2、最后发布**。执行策略是「先协议后实现」（Batch 0 先把 guard/清单/合同基线焊死）+「先底层后上层」（host-data schema 在页面渲染链路之前收口）+「每批独立门禁」（feature-contract + security-regression + smoke + build 全过才进下一批）。

### 1.2 Phase 总览

| Phase | 名称 | 规模 | 目标摘要 | 依赖前序 |
|------|------|------|----------|----------|
| Phase 1 | `batch0-baseline` 三共享包基座 + 路由清单 + 功能合同（零行为） | `L` | guard/schema/html-policy 三个骨架包 + `route-sensitivity.json`/`feature-contract.json` 基线 + CI 检查脚本 + 分发通道改造（devDeps + lib/ bundle） | `-` |
| Phase 2 | `batch1-host-data` P0 remote-cross 7 条（schema 校验 + 身份绑定 + 限额 + SSRF 逐跳复验） | `L` | notepad `/s3/object` + nsw workspaces/session-io/tree 消费点接 schema；修复 #1–#7 | Phase 1 |
| Phase 3 | `batch2-content-render` P0 remote→page 6 条（allowlist 双 renderer + 转义 + 注入收口） | `L` | html-policy 接客户端/宿主两 renderer；修复 #8–#13 | Phase 1（可与 Phase 2 并行开发、不可先行收口——批次门禁顺序按 T-O-10） |
| Phase 4 | `batch3-p2-supply` P2 9 条处置 + local-supply 2 条（accepted-risks + build/CI 修复） | `M` | 4 条零成本加固 + 5 条 accepted 登记 + npx 移除 + release CI | Phase 1 |
| Phase 5 | `release-closure` 版本收口 + tarball 独立安装验收 + dsh-dev 全量 smoke | `S` | 版本 bump、npm pack 一致、tarball 隔离安装、dsh-dev 端到端回归 | Phase 2 + Phase 3 + Phase 4 |

### 1.3 Phase 说明

1. **Phase 1 — `batch0-baseline`**
   - **核心目标**：把「运行时不可达但 CI 必需」的真源（route-sensitivity、feature-contract、accepted-risks）与三共享包的构建期分发通道先焊死；四插件接入 guard 时行为不变。
   - **为什么先做**：`T-O-14` 的 feature-contract 是所有后续批次的回归基线；没有它无法证明「修复零功能回退」。分发通道（T-O-13）不先定，后面每包都要返工。
2. **Phase 2 — `batch1-host-data`**
   - **核心目标**：远端对象在宿主消费点（`/s3/object` 返回前、nsw marker/meta/tree 拉取时）被 v1 schema 整对象拒绝；配合身份绑定、限额、SSRF 逐跳复验切断 remote-cross。
   - **为什么放在这里**：`remote-cross` 是根入口（桶写入者无需页面即可触发）；XSS 是放大器，先堵数据入口再放渲染清洗，避免「恶意对象已入库、只剩渲染兜底」。
3. **Phase 3 — `batch2-content-render`**
   - **核心目标**：共享 allowlist 双 renderer 剥除活动内容；manifest/image 属性转义；validateJson 深度上限；imagine 模板注入收口。
   - **为什么放在这里**：依赖 Phase 1 的 `dsh-html-policy` 包；`remote→page` 需要 host-data 已收口后的「页面侧最后防线」。
4. **Phase 4 — `batch3-p2-supply`**
   - **核心目标**：P2 逐项「零成本加固 vs accepted」落地；`accepted-risks.json` 成文；esbuild npx 回退移除；release CI + clean-lib + attestation。
   - **为什么放在这里**：P2 是本地自影响，优先级低于 P0；supply 修复不阻塞功能，适合放在 P0 之后。
5. **Phase 5 — `release-closure`**
   - **核心目标**：每插件一次 minor、tarball 在隔离目录 `dsh plugin add` 成功、dsh-dev 全量功能 smoke、release workflow dry-run。
   - **为什么放在这里**：T-O-10 明确「最终每插件一次 minor」；收口必须在所有批次门禁全绿之后。

### 1.4 执行策略说明

- **执行顺序原则**：基线（合同）→ host-data → content-render → P2/supply → release；每批门禁全过才进下一批，不并行改 P0 与 P2 的同一文件。
- **风险控制原则**：加固只加在校验/清洗/围栏/限额层；任何「修复需要改功能」的项立即转 `accepted-risks.json` 登记（T-O-11），不在本 AP 硬修。
- **测试推进原则**：`短途`（unit/contract，每文件改动即跑）→ `spike`（dsh-dev live journey，每批收口）→ `mega`（本 AP 收口 = 13 条 P0 PoC 全拒）→ `soak`（确定性回归，退出硬闸）。
- **文档同步原则**：`security/*.json` 是 CI 真源不进包；`security/route-inventory.md` 由 guard 生成；release note 统一「功能无变化 + 安全加固」。
- **回滚 / 降级原则**：无数据迁移（T-O-8 v0 只读兼容），回滚 = `dsh plugin add` 前一版本；`feature-contract.json` 保留为回归基线。

### 1.5 本次 action-plan 影响结构图

```text
26-nov-security-fix (dsh-plugins)
├── Phase 1: batch0-baseline
│   ├── packages/dsh-host-route-guard     (🆕 唯一 web 路由注册入口)
│   ├── packages/dsh-remote-data-schema   (🆕 骨架：schema/v1 + reject 语义)
│   ├── packages/dsh-html-policy          (🆕 骨架：allowlist 常量)
│   ├── security/route-sensitivity.json   (43 行 CI 真源)
│   ├── security/feature-contract.json    (43 路由 + UI + 数据位置)
│   ├── scripts/{gen,check}-route-sensitivity.mjs
│   ├── scripts/check-feature-contract.mjs
│   ├── 四插件 package.json (file: deps → devDependencies + 新包 file:)
│   ├── 四插件 index.js / src/host/*     (注册迁移到 guard，零行为)
│   └── 四插件 scripts/build-client.mjs  (新增 guard/schema/policy bundle 产物)
├── Phase 2: batch1-host-data
│   ├── packages/dsh-remote-data-schema   (v1 规则实现 + v0 兼容)
│   ├── dsh-nano-notepad/src/host/s3-sync.js        (object get/put 校验)
│   ├── dsh-nano-notepad/index.js                    (fetch-mp 逐跳复验)
│   ├── dsh-nano-shared-workspace/src/host/workspaces.js  (marker 校验+身份绑定)
│   ├── dsh-nano-shared-workspace/src/host/session-io.js  (meta/parts/claim 校验+CAS)
│   ├── dsh-nano-shared-workspace/src/host/tree.js        (HEAD/pull/push 校验+realpath)
│   └── test/remote-schema/compat/                  (存量桶样本回归)
├── Phase 3: batch2-content-render
│   ├── packages/dsh-html-policy          (策略表 + sanitizePolicy 纯函数)
│   ├── dsh-nano-notepad/src/client/markdown.js    (sanitizeRichHtml → allowlist)
│   ├── dsh-nano-notepad/index.js                 (sanitizeMpHtml → allowlist)
│   ├── dsh-nano-notepad/src/client/sync.js        (image mime/base64 校验)
│   ├── dsh-nano-notepad/src/client/panel.js       (data-* 属性转义)
│   ├── dsh-nano-notepad/src/client/json.js        (validateJson 深度上限)
│   └── dsh-nano-model-selector/lib/host-media.js  (imagine 模板注入收口)
├── Phase 4: batch3-p2-supply
│   ├── dsh-nano-explorer-extra/src/host/routes.js (mutate realpath 围栏 + scopeOf 日志)
│   ├── dsh-nano-explorer-extra/src/host/git.js    (.git 拒绝)
│   ├── dsh-nano-shared-workspace/src/host/tree.js (SKIP += imagine)
│   ├── .gitignore                                  (+ imagine/.grok/)
│   ├── security/accepted-risks.json               (9 条逐项登记)
│   ├── 四插件 scripts/build-client.mjs            (删 npx 回退)
│   ├── .github/workflows/release.yml              (npm ci→build→pack→attestation)
│   └── scripts/check-clean-lib.mjs
└── Phase 5: release-closure
    ├── 四插件 package.json version bump (0.2.0 / 0.2.0)
    ├── 三包 package.json (0.1.0)
    ├── npm pack --dry-run 一致性
    ├── tarball 隔离安装验收
    └── dsh-dev 全量 smoke
```

---

## 2. In-Scope / Out-of-Scope

### 2.1 In-Scope（本次 action-plan 明确要做）

- **[S1]** 三共享包骨架与实现：`dsh-host-route-guard`、`dsh-remote-data-schema`、`dsh-html-policy`（各 0.1.0，纯 JS，不依赖平台私域实现）。
- **[S2]** `security/` 四份 CI 真源：`route-sensitivity.json`（43 行）、`feature-contract.json`（43 路由 + UI + 数据位置）、`accepted-risks.json`（9 条 P2 登记）、`route-inventory.md`（guard 生成）。
- **[S3]** P0 13 条的全部修复（Batch 1 host-data 7 条 + Batch 2 content-render 6 条），修复形态为「schema 校验 / 身份绑定 / 限额 / 围栏 / allowlist 清洗 / 转义 / 注入收口」，均不删路由、不改 UI、不迁移数据。
- **[S4]** P2 9 条处置：4 条零成本加固（mutate realpath、`.git` 拒绝、grok-creds `.gitignore`/SKIP、scopeOf 日志）+ 5 条 accepted 登记；`security/accepted-risks.json` 成文。
- **[S5]** local-supply 2 条：四 `build-client.mjs` 删 npx 回退；`.github/workflows/release.yml`（`npm ci && npm run build && npm pack` + clean-lib + `SHA256SUMS`/attestation）。
- **[S6]** 分发通道固化（T-O-13）：既有 `file:` 依赖（dsh-nano-ui/dsh-performance-review/dsh-s3-client）+ 新增三包统一放 `devDependencies`；运行时一律经 `lib/` bundle 消费；notepad/model-selector 为「未打包 index.js」新增 `lib/route-guard.js`、`lib/mp-sanitize.js` 产物；schema 校验在 `src/host/s3-sync.js` 内 `import` `dsh-remote-data-schema`、随既有 `lib/s3-sync-host.js` bundle（**不**新增 `schema-shim`）。
- **[S7]** 测试基座：`test/spike/security-fix/`（宪章 + 用例）、`test/remote-schema/compat/`（存量样本）、`scripts/` 检查/回归脚本。
- **[S8]** 发布收口：四插件各一次 minor（→0.2.0；nsw →0.2.0）、三包 0.1.0、tarball 隔离安装验收、dsh-dev 全量 smoke。

### 2.2 Out-of-Scope（本次 action-plan 明确不做）

- **[O1]** 平台侧 CSP / iframe / worker 级页面隔离：不在插件仓库能力范围；页面脚本仍视为较低信任主体（T-O-1），用能力边界而非 realm 隔离。
- **[O2]** 任何路由删除 / UI 隐藏 / 数据位置迁移：违反 T-O-3。包括 `allowOutsideWorkspace`、`/s3/config` 多端点、`/workspaces/join` 目录选择、`/media-engine` GET/PUT 等现有页面入口全部保留。
- **[O3]** notepad 数据面迁移（IndexedDB → 宿主存储 / 客户端同步 → 宿主同步）：v0.2 旧 Q4 选项 D 已明确不采用。
- **[O4]** v0 历史对象的「批量改写迁移」：T-O-8 的 v0 兼容是**只读兼容 + 一次性补写**，不做扫描式迁移任务。
- **[O5]** 公网暴露场景的认证/CSRF/SSRF 重构：本地单用户 loopback 模型（T-O-4），只保留既有 Host/Origin 围栏。
- **[O6]** 本机 `~/.dsh`/`~/.dsh-dev` 之外的三实例部署变更、桌面版发布。
- **[O7]** `package.json` 的 `dsh.bundle.patch` / `dsh.client` / `main` / `exports` 结构调整；`cordis.patch.yml` 不变。
- **[O8]** 真实 v\* tag 的推送与 GitHub release：本 AP 交付 workflow + dry-run 验收；tag 推送属发布执行动作，由业主在 Phase 5 收口后触发。
- **[O9]** `context/`、`docs/`、`AGENTS.md` 顶层原则的非必要改动（仅同步受影响段落）。

### 2.3 边界判定表

| 项目 | 判定 | 理由 | 重评条件 |
|------|------|------|----------|
| `security/route-sensitivity.json` 以 JSON 形式打进包 | `out-of-scope` | 运行时不可达（repo 根、不在 files）；按 T-O-13 只能以生成 JS 常量进产物 | 若未来包内需要运行时清单，回 QNA 追加 T-O-15 |
| notepad 客户端 `sync.js` 结构改写 | `out-of-scope` | 功能零回退；只在消费点加校验/转义 | 发现校验无法在不改结构下插入 → 回 QNA |
| v0 manifest 扫描式重写 | `out-of-scope` | T-O-8 只读兼容 + 一次性补写，不是迁移任务 | 存量回归发现 v0 不兼容 → 先按 T-O-14-2 校准 schema，再回 QNA |
| 新路由 / 新 UI 入口 | `out-of-scope` | 非安全修复必需；feature-contract 锁定 | 安全必需的新入口回 QNA 追加 |
| CSP / 第三方脚本审计 | `defer / depends-on-design` | 本地单用户 + 无公网（T-O-4）；平台层能力 | dsh 核心未来提供 per-tab 身份时复审 |
| `imagine` 命令模板改用「stdin/文件传参」替代模板替换 | `in-scope` | hunter-e:imagine-template-shell-injection 是 Batch 2 P0；`lib/host-media.js` 是 shipped 源文件可直接改 | 若发现另有生成源 → 改生成源并同步 lib/ |

---

## 3. 业务工作总表

> 硬地板：每项含 `涉及文件(file:line)` + `收口目标` + `测试映射(Test-ID)`；净新/高风险项在 §4 拆 a/b/c 子步。

| 编号 | 所属 Phase | 工作项 | 类型 | 涉及文件（file:line） | 收口目标 | 测试映射 | 风险 |
|------|------------|--------|------|------------------------|----------|----------|------|
| P1-01 | P1 | `packages/dsh-host-route-guard` 骨架 + `registerRoutes` | add | `packages/dsh-host-route-guard/src/{index,route-guard}.js`（净新） | 提供 `registerRoutes(ctx, specs)`：fail-closed `ctx.get('connection')`、method 405、JSON 错误形状、bodyLimit 强制、route 台账生成 | `B0-T01` | high |
| P1-02 | P1 | `security/route-sensitivity.json` + gen/check 脚本 | add | `scripts/gen-route-sensitivity.mjs`、`security/route-sensitivity.json`、`scripts/check-route-sensitivity.mjs` | 43 行逐条清单（**每条注册路由一行**，`path` 唯一 + `methods` 列含该路由支持的全部方法；字段 sensitivity/capability/bodyLimit/sessionBinding/justification）；gen 从代码枚举、check 防漂移 | `B0-T02` | medium |
| P1-03 | P1 | `security/feature-contract.json` + check 脚本 | add | `scripts/check-feature-contract.mjs`、`security/feature-contract.json` | 43 路由 path/method/bodyLimit/response-shape + UI 入口 + 数据位置快照；bodyLimit 继承现有常量 | `B0-T03` | medium |
| P1-04 | P1 | 分发通道改造（T-O-13） | update | 四插件 `package.json`（deps→devDeps + 三包 file:）；四插件 `scripts/build-client.mjs`；notepad/model-selector `lib/route-guard.js`/`lib/mp-sanitize.js` 产物；**schema 经 `src/host/s3-sync.js` import → `lib/s3-sync-host.js`（无 schema-shim）** | 运行时无裸 import 共享包；tarball 自足；`files` 含新 lib 产物 | `B0-T04` + `B5-T01` | high |
| P1-05 | P1 | 四插件 43 路由迁移到 guard（零行为） | refactor | `dsh-nano-notepad/index.js:60-76,234-320`、`dsh-nano-explorer-extra/src/host/routes.js:450-478`、`dsh-nano-shared-workspace/src/host/routes.js:481-509`、`dsh-nano-model-selector/index.js:28-30,241-255` | 所有 `webServer.register` 经 guard；path/method/handler 语义不变 | `B0-T05` | high |
| P1-06 | P1 | `packages/dsh-remote-data-schema` 骨架 | add | `packages/dsh-remote-data-schema/src/{index,schema/{v1,v0},reject}.js` | 导出 `validate(kind,obj,{v})` + `Reject(reason)`；v1 规则表与 v0 兼容入口 | `B1-T01` | medium |
| P1-07 | P1 | `packages/dsh-html-policy` 骨架 | add | `packages/dsh-html-policy/src/{index,policy,sanitizePolicy}.js` | 导出 `ALLOWED_*` 常量 + `sanitizePolicy` 纯函数（不含 renderer） | `B3-T01` | medium |
| P1-08 | P1 | `security/accepted-risks.json` 骨架 | add | `security/accepted-risks.json` | 9 条 P2 的字段骨架（fingerprint/主体/功能/理由/加固/监控/签字/复核） | `B4-T03` | low |
| P1-09 | P1 | `test/spike/security-fix/` 宪章 + 测试基座 | add | `test/spike/security-fix/README.md`、`test/remote-schema/compat/`、`scripts/security-regression/` | spike 宪章 + compat 语料目录 + 回归 harness 骨架 | `B5-T03` | medium |
| P2-01 | P2 | schema v1 规则实现 + v0 兼容 | add | `packages/dsh-remote-data-schema/src/schema/{v1,v0}.js`、`reject.js` | manifest/file/image/marker/session-meta/tree-HEAD 六类 v1 规则 + v0 只读兼容 + `schemaVersion` 拒绝未知版 | `B1-T01` | high |
| P2-02 | P2 | notepad `/s3/object` 消费点接 schema | update | `dsh-nano-notepad/src/host/s3-sync.js:231-250`（`import 'dsh-remote-data-schema'` devDep，随既有 `lib/s3-sync-host.js` bundle） | `get` 对 known-key（manifest/files/images）返回前校验；`put` 对 known 形态校验、未知 key 仅保 key 形态限制 | `B1-T02`+`B1-T04` | high |
| P2-03 | P2 | nsw workspaces.js marker 校验 + localPath 身份绑定 | update | `dsh-nano-shared-workspace/src/host/workspaces.js:87,103-130`（消费点）+ `routes.js:224-234`（`/workspaces/join` 的 `workspaceId`/`localPath` 边界） | marker schema v1（含 `title/pathHint/createdAt/createdBy`）；`member.localPath` 严格用完整 `memberId`(`username@instance8`) 匹配、禁仅用户名回退、绑定 `createdBy` | `B1-T03` | high |
| P2-04 | P2 | nsw session-io.js meta/parts/claim 校验 + CAS + 限额 | update | `dsh-nano-shared-workspace/src/host/session-io.js:132-166,172-281`（含 `acquireClaim:132-147` **与** `renewClaim:149-166`——两款 RMW 皆改 CAS）+ `routes.js:296-373`（claim/heartbeat/lease 的 body.sessionId 边界校验） | session-meta v1 按现写形态（`v:1`+`formatVersion:4`+15 字段）校验 + `committedBytes` 上限；`acquireClaim`/`renewClaim` 用 `putJson(key,val,{ifMatch:etag})` 条件写（`s3.js:127` 已支持）；part ≤64KiB、数量 ≤ceil | `B1-T03`+`B1-T05` | high |
| P2-05 | P2 | nsw tree.js HEAD/pull/push 校验 + realpath 围栏 | update | `dsh-nano-shared-workspace/src/host/tree.js:11-25,157-217`（`inside()` :21-25 词法→realpath 感知） | HEAD schema v1；`rel` 无 `..`+SKIP 应用+realpath 落 workspace 内；`scan()` lstat 跳 symlink；stale 删除同防护；`localPath` 规范化+拒预存 symlink | `B1-T03` | high |
| P2-06 | P2 | materialize + nsw 路由边界 charset（sessionId/workspaceId 双层） | update | `dsh-nano-shared-workspace/src/host/session-io.js:326` 周边 + `routes.js:224-234,296-373,447-470`（join/claim/heartbeat/lease/materialize 的 body 校验） | `sessionId`/`workspaceId` 字符集 `^[A-Za-z0-9_-]{1,128}$` 在**路由边界 + 消费点双层**校验；realpath 校验解包目标在 session 目录内 | `B1-T03` | high |
| P2-07 | P2 | fetch-mp 30x 逐跳复验 | update | `dsh-nano-notepad/index.js:333-360` | `redirect:'manual'` + 循环逐跳校验目标仍匹配 `^https://mp\.weixin\.qq\.com/s/`；任一跳失败即拒 | `B1-T06` | high |
| P2-08 | P2 | 存量桶兼容回归（T-O-14-2） | add | `test/remote-schema/compat/` + `scripts/compat-regression.mjs` | 现有桶导出样本 v1 校验 100% 通过；v0 样本按只读兼容通过 | `B1-T07` | high |
| P3-01 | P3 | html-policy 策略表实现 | add | `packages/dsh-html-policy/src/policy.js` | `ALLOWED_ELEMENTS/ATTRS/SCHEMES/STYLE_PROPS` 常量 = `MP_SAFE_STYLE`∪`MP_STYLE_ALLOW` 并集 + 强制丢弃集 | `B3-T01` | high |
| P3-02 | P3 | 客户端 renderer `sanitizeRichHtml` 重写 | update | `dsh-nano-notepad/src/client/markdown.js:179-246` | DOMParser→按策略遍历节点/属性/样式→`body.innerHTML`；保留 data-src 提升与 foreignObject→image | `B3-T02` | high |
| P3-03 | P3 | 宿主 renderer `sanitizeMpHtml` 重写 | update | `dsh-nano-notepad/index.js:397,423-450` → `lib/mp-sanitize.js` | regex 序列化器读同一策略表；保留 data-src 提升与 visibility:hidden→visible | `B3-T03` | high |
| P3-04 | P3 | image mime/base64 严格校验 | update | `dsh-nano-notepad/src/client/sync.js:195-215`、`markdown.js:140-150` | `mime`∈{png,jpeg,gif,webp}、base64 字符集、解码 ≤maxImageBytes；非法即拒该 image | `B3-T04` | high |
| P3-05 | P3 | manifest/workspaceId 属性转义 | update | `dsh-nano-notepad/src/client/sync.js:195-215`、`db.js:655-665`、`panel.js:1342,1371` | `id`/`name`/`workspaceId` 入 `data-*`/attr 时统一转义；tree/group/tab 不再裸插 | `B3-T05` | high |
| P3-06 | P3 | validateJson 深度上限 | update | `dsh-nano-notepad/src/client/json.js:15-126` | 递归深度上限（如 32）；超限返回拒绝而非 RangeError | `B3-T06` | medium |
| P3-07 | P3 | imagine 模板注入收口 | update | `dsh-nano-model-selector/lib/host-media.js:33-48,107-161` | `{prompt}` 改单引号 `$(cat "{cwd}/imagine/.prompt.txt")` 或由客户端写入后引用；`{out}` 限 `imagine/[a-z0-9-]+\.(png|jpg|webp)`；`{cwd}` 限安全字符 | `B3-T07` | high |
| P3-08 | P3 | mp 文章正向渲染快照回归 | add | `test/spike/security-fix/fixtures/mp-article.html` | synthetic mp 文章（data-src/foreignObject/table/pre/style）渲染与现状一致 | `B3-T08` | medium |
| P4-01 | P4 | `nxe:mutate-symlink-escape` realpath 围栏 | update | `dsh-nano-explorer-extra/src/host/mutate.js:44-46`（`assertInside` 由词法→realpath 感知）、`mutate.js:55-285`（createFile/rename/createFolder/removeEntry/moveEntry 五 mutator）、`routes.js:297-370` | 五 mutator 在操作前 `resolve()`+`realpath()`+`isInside(workspaceRoot,resolved)`；越界即拒 | `B4-T01` | medium |
| P4-02 | P4 | `nxe:git-config-filter-exec` `.git` 拒绝 | update | `dsh-nano-explorer-extra/src/host/mutate.js:44-46,55-285`（五 mutator 的 `assertInside` 层拒 `<root>/.git/**`）、`routes.js:297-370` | 变更路由经 mutate 层拒 `.git`；`git add --all`（`git.js:382-384`→`runGit`）前置校验无 `.git/` 进入暂存 | `B4-T01` | low |
| P4-03 | P4 | `nxe:scopeof-cross-session` 日志 | update | `dsh-nano-explorer-extra/src/host/routes.js:61-77` | `scopeOf` 命中非当前 sessionId 时 `console.warn`（不阻断） | `B4-T02` | low |
| P4-04 | P4 | `hunter-e:grok-creds-workspace-copy` 阻止提交/同步 | update | `.gitignore`、`dsh-nano-shared-workspace/src/host/tree.js:11-15` | `.gitignore` += `imagine/.grok/`；nsw `SKIP` += `imagine` | `B4-T03` | low |
| P4-05 | P4 | `security/accepted-risks.json` 成文 | update | `security/accepted-risks.json` | 9 条 P2 逐项（4 加固 + 5 接受）按字段登记；mutate-symlink 标「加固+边缘行为变化」 | `B4-T03` | low |
| P4-06 | P4 | esbuild npx 回退移除 | update | 四 `scripts/build-client.mjs:11,21/25` | 删 `npx --yes esbuild@0.25.0`；本地缺 esbuild 即 `process.exit(1)` 提示 `npm ci` | `B4-T04` | medium |
| P4-07 | P4 | release CI + clean-lib + attestation | add | `.github/workflows/release.yml`、`scripts/check-clean-lib.mjs` | `v*` tag：`npm ci→build→git diff --exit-code -- lib/→npm pack→SHA256SUMS→attest` | `B4-T05` | medium |
| P5-01 | P5 | 版本 bump + files 一致性 | update | 七 `package.json` | 四插件 →0.2.0（nsw 0.1.0→0.2.0）；三包 0.1.0；`files` 含新 lib 产物 | `B5-T01` | low |
| P5-02 | P5 | tarball 隔离安装验收 | add | `test/spike/security-fix/` | `npm pack` 产物在**无 `<parent>/packages/` 布局**的隔离目录 `dsh plugin add` 成功并激活 | `B5-T02` | high |
| P5-03 | P5 | dsh-dev 全量 smoke | add | `https://dsh-dev.local/` | notepad save/read/s3-sync/mp-render、explorer 文件+git、nsw join/pull/push、model-selector 引擎切换 全功能 PASS | `B5-T03` | high |

---

## 4. Phase 业务表格

### 4.1 Phase 1 — `batch0-baseline`（零行为）

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P1-01 | guard 包骨架 | a) 建 `packages/dsh-host-route-guard` npm 包（`package.json`/`src/`/`AGENTS.md`）；b) 实现 `registerRoutes(ctx, specs)`：`const conn = ctx.get('connection'); if (!conn) throw`（fail-closed）；c) 每条 `webServer.register` 前查 `route-sensitivity` 常量表，未列出即 `throw route-not-listed`、清单有而代码无即 `throw route-stale`；d) 统一 `method` 405 与 JSON `{ok:false,reason}` 形状；e) 强制 `bodyLimit`（spec 提供时 `jsonBody(req, spec.bodyLimit)`，否则继承路由现有常量）；f) `sessionBinding` 声明落台账；g) 生成 `security/route-inventory.md`。 | `packages/dsh-host-route-guard/src/index.js`（净新）；参考 `dsh-nano-explorer-extra/src/host/routes.js:450-478` | 四插件可 `import { registerRoutes }`；guard 拒绝未登记路由 | `B0-T01` | `node --test` 全过；未登记路由启动即抛 |
| P1-02 | 路由敏感度清单 | a) 写 `scripts/gen-route-sensitivity.mjs`：静态枚举四插件注册点（notepad `index.js:60-76` 常量 + `ctx.effect` 注册块、explorer `routes` map、nsw `routes` map、model-selector `ROUTE`/`ENGINE_ROUTE`）；b) 生成 `security/route-sensitivity.json` **43 行**（**每条注册路由一行**，`path` 唯一 + `methods` 列；例如 `/media-engine` 一行 `methods:[GET,HEAD,PUT]`）；c) 每行 `plugin/path/methods/sensitivity/capability/bodyLimit/sessionBinding/justification`；d) 人工复核 sensitivity 归属；e) 写 `scripts/check-route-sensitivity.mjs` 做「代码↔清单」双向比对。 | `scripts/gen-route-sensitivity.mjs`（净新）、`security/route-sensitivity.json`（净新）、`scripts/check-route-sensitivity.mjs`（净新） | 43 行清单 = 43 条注册路由，一一对应 | `B0-T02` | `check-route-sensitivity` 0 漂移；清单字段全 |
| P1-03 | 功能合同基线 | a) `security/feature-contract.json`：43 路由 `path/methods/bodyLimit/response-shape` + UI 入口（notepad cloud-settings/panel、explorer sidebar、nsw UI、model-selector `/imagine`）+ 数据位置（IndexedDB / `${DSH_HOME}` / 工作区）；b) `bodyLimit` **逐路由写全、无兜底默认**——notepad：`/save`=8MB、`/read`=8MB（`jsonBody` 默认=`MAX_SAVE_BYTES`）、`/fetch-mp`=8MB、`/s3/{status,test,object,config}`=32MB（`MAX_S3_BODY_BYTES`）；explorer：全部=64KiB；nsw：全部=64KiB（`readBody`）；model-selector：`/catalog`GET/HEAD=0、`/media-engines`GET/HEAD=0、`/media-engine`GET/HEAD=0+PUT=16384B；c) `scripts/check-feature-contract.mjs` 断言合同与代码一致。 | `security/feature-contract.json`（净新）、`scripts/check-feature-contract.mjs`（净新） | 合同固定现有行为；bodyLimit 逐路由继承 | `B0-T03` | `check-feature-contract` PASS；`/save` 仍收 8MB、`/read` 仍收 8MB |
| P1-04 | 分发通道 | a) 四插件 `package.json`：把 `dsh-nano-ui`/`dsh-performance-review`/`dsh-s3-client` 从 `dependencies` 移 `devDependencies`；新增三包 `file:../packages/...` 到 `devDependencies`；b) 四插件 `build-client.mjs`：新增 esbuild 产物 `lib/route-guard.js`（notepad/model-selector）、`lib/mp-sanitize.js`（notepad）；explorer/nsw 的 guard/schema 打进既有 `lib/host.js`；**schema 经 `src/host/s3-sync.js` import → `lib/s3-sync-host.js`（无 schema-shim）**；c) `files` 数组加入新 lib 产物。 | 四 `package.json`、四 `scripts/build-client.mjs`、四 `lib/*-host.js`/`route-guard.js` 产物 | 运行时只 import `./lib/*` 与 `node:*` | `B0-T04`+`B5-T01` | **AST/源码静态断言** index.js/host 无裸 import 共享包（`node --check` 仅做语法解析、不解析模块——不可用作依据）；pack 文件全 |
| P1-05 | 43 路由迁移 guard | a) notepad `index.js`：4 个 `ctx.effect` 注册块（`:234/251/274/297`）改为 `registerRoutes(ctx, NOTEPAD_SPECS)`，`NOTEPAD_SPECS` 从 `lib/route-guard.js` 导入；b) explorer `routes.js:450-478` `registerRoutes` 换 guard 版；c) nsw `routes.js:481-509` 同；d) model-selector `index.js:240-260` 两个 `webServer.register` 换 guard；e) 每路由声明 `sensitivity/capability/bodyLimit/sessionBinding` 且与 `route-sensitivity.json` 一致；f) handler/响应体不变。 | `dsh-nano-notepad/index.js:60-76,234-320`、`dsh-nano-explorer-extra/src/host/routes.js:450-478`、`dsh-nano-shared-workspace/src/host/routes.js:481-509`、`dsh-nano-model-selector/index.js:28-30,240-260` | 全部路由经 guard 注册；行为不变 | `B0-T05` | `check-route-sensitivity` 0 漂移；smoke 全过 |
| P1-06 | schema 包骨架 | a) `packages/dsh-remote-data-schema` npm 包骨架；b) `src/index.js` 导出 `validate(kind, obj, {v})`、`SchemaReject`；c) `src/schema/` 目录与 `reject.js` 占位；v1/v0 规则在 Phase 2 填。 | `packages/dsh-remote-data-schema/`（净新） | 包结构可 build、可 `node --test` | `B1-T01` | `npm pack` 通过；`validate` 占位存在 |
| P1-07 | html-policy 包骨架 | a) `packages/dsh-html-policy` npm 包骨架；b) `src/policy.js` 导出 `ALLOWED_ELEMENTS/ALLOWED_ATTRS/ALLOWED_SCHEMES/ALLOWED_STYLE_PROPS`；c) `src/sanitizePolicy.js` 纯函数签名；策略表内容在 Phase 3 填。 | `packages/dsh-html-policy/`（净新） | 常量表可导出 | `B3-T01` | `npm pack` 通过；常量表存在 |
| P1-08 | accepted-risks 骨架 | `security/accepted-risks.json` 9 条占位（fingerprint/主体/功能/理由/加固/监控/签字/复核）。 | `security/accepted-risks.json`（净新） | 9 条字段骨架 | `B4-T03` | JSON 合法、字段齐 |
| P1-09 | 测试基座 | a) `test/spike/security-fix/README.md` 宪章（一句话定义、锚表、边界、判读门槛、V-表）；b) `test/remote-schema/compat/` 目录 + 放置约定；c) `scripts/security-regression/` harness 骨架（fake S3 + 页面 fetch 重放）。 | `test/spike/security-fix/`、`test/remote-schema/compat/`、`scripts/security-regression/`（净新） | 宪章与目录就位 | `B5-T03` | README 门槛写死；目录结构合规 |

### 4.2 Phase 2 — `batch1-host-data`（P0 remote-cross 7 条）

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P2-01 | schema v1 + v0 兼容 | a) `v1/manifest.js`：`{schemaVersion:1, rev:int>0, files:{[id]:{name(1..512,无控制字符/路径分隔),sha256:64hex,parentId?,workspaceId?,updatedAt?}}, images:{[sha]:{byteLength:0..maxImageBytes}}}`，`id`=`^[A-Za-z0-9_-]{1,128}$`；b) `v1/file.js`：key `files/<id>.md` 的 id 须与 manifest 一致、UTF-8、≤maxFileBytes（默认2MiB）；c) `v1/image.js`：`mime`∈4 种、`base64` 合法、解码 ≤maxImageBytes；d) `v1/marker.js`：**按现写形态** `{v:1, workspaceId(`^[A-Za-z0-9]{16}` 或 v0 path-hash 字符集), title, pathHint, createdAt, createdBy, members:{[memberId]:{username,instance,localPath(绝对/规范化/无..≤4096),joinedAt}}}`——`createdBy`/`memberId`/`workspaceId` 为 P2-03 身份绑定与 key 拼接的必需输入；e) `v1/session-meta.js`：**按现写形态** `{v:1, sessionId(`^[A-Za-z0-9_-]{1,128}$`), writerId, writerName, rev, formatVersion:4, committedBytes:0..maxCommittedBytes(默认2GiB), uncompressedSeqBytes, eventCount, title, projectDir, cwd, createdAt, mtime, deleted, attachmentRefs}`、parts≤64KiB 且数量≤ceil；f) `v1/tree-head.js`：`{files:[{rel(安全相对/无..+SKIP),sha256:64hex,size:0..maxFileBytes}]}`；g) `v0/` 兼容：缺判别字段（manifest 无 `schemaVersion`、marker 无 `v`）视为 v0，按 v0 宽松规则只读通过并标 `compat:'v0-backfill'`；h) `reject.js`：任一字段非法 → `SchemaReject('schema:<field>')`；i) 未知判别值（`schemaVersion`>1、`formatVersion`∉{1..4}、`v`>1）→ 拒。**字段白名单一律以现写字面为准，不按想象字段编写**（errata A1）。 | `packages/dsh-remote-data-schema/src/schema/{v1,v0}/*.js`、`reject.js` | 六类对象 v1 规则 + v0 只读兼容 | `B1-T01` | 正/负样本断言全过；v0 标 backfill |
| P2-02 | `/s3/object` 接 schema | a) `dsh-nano-notepad/src/host/s3-sync.js:231-250`：`op:'get'` 且 key∈{`manifest.json`,`files/*`,`images/*`} → 返回前 `validate(kind, payload)`；b) `op:'put'` 且 key 为 known 形态 → 写入前同校验；未知 key 仅保留现有 `key` 形态/长度限制（`<=512`、无 `..`），不新增拒绝；c) 校验在 `Buffer.from(bodyB64,'base64')` 解码后、返回/写入前；d) **`s3-sync.js` 直接 `import 'dsh-remote-data-schema'`（devDependency），由既有 `lib/s3-sync-host.js` bundle（`build-client.mjs` s3-sync-host 步骤）——无 schema-shim、index.js 不直接消费 schema**；e) 拒绝时 `throw SchemaReject`，路由层返回 `{ok:false,reason:'schema',detail}`。 | `dsh-nano-notepad/src/host/s3-sync.js:231-250`、`lib/s3-sync-host.js`（既有 bundle） | 恶意 manifest/files/images 被整对象拒；put 任意 key 不回归 | `B1-T02`+`B1-T04` | fake S3 恶意对象全拒；正常对象通过 |
| P2-03 | marker 校验 + localPath 绑定 | a) `workspaces.js:103-130` `listWorkspaces`/`matchWorkspace`：marker 先入 v1 `marker` schema（含 `title/pathHint/createdAt/createdBy`）；b) **member 解析严格用完整 `memberId`(`username@instance8`)，禁仅用户名回退**（audit #11 最小修复）；marker 绑定到写入者 `createdBy`——仅当 `createdBy`/`memberId` 与本地身份匹配才采信该 `member.localPath`；c) 不匹配则跳过该 marker；d) **`routes.js:224-234` `/workspaces/join`：`workspaceId`/`localPath` 在边界 charset/规范化校验**（join 是 audit #11/#12 入口）。 | `dsh-nano-shared-workspace/src/host/workspaces.js:87,103-130`、`routes.js:224-234` | 远端 marker 的 localPath 不再驱动任意匹配 | `B1-T03` | 异主 marker/仅用户名回退均不匹配；合法 marker 仍匹配 |
| P2-04 | session meta/parts/claim | a) `session-io.js:172-281`：pull/push 的 `meta.json` 过 v1 `session-meta`（按现写形态 `v:1`+`formatVersion:4`+15 字段）；`committedBytes` 上限 `maxCommittedBytes`（默认 2GiB）；b) part 单体 ≤64KiB、数量 ≤`ceil(committedBytes/64KiB)`，超限拒绝；c) **`acquireClaim`(:132-147) 与 `renewClaim`(:149-166) 两款 RMW 皆改 `s3.putJson(key, value, {ifMatch: etag})` 条件写**（`s3.js:127` 已支持 `ifMatch`；`getJson` 需补返回 etag 或用 `headObject` 取）；d) `sessionId`/`writerId` 字符集 `^[A-Za-z0-9_-]{1,128}$`；e) **`routes.js:296-373`：`/sessions/claim`(:310)、`/sessions/heartbeat`(:333)、`/sessions/lease`(:357) 的 `body.sessionId` 在路由边界先过 charset 校验**——`lease` 当前 `client.getJson('claims/'+sessionId)` 直拼 key(:364) 绕过 session-io，必须在边界拦截。 | `dsh-nano-shared-workspace/src/host/session-io.js:132-166,172-281`、`routes.js:296-373`、`s3.js:127`（`ifMatch`/`ifNoneMatch`） | meta 投毒被拒；claim/renew 写具备 CAS；sessionId 边界+消费点双层 | `B1-T03`+`B1-T05` | 超 committedBytes/parts 拒；并发 claim/renew 无静默混合写 |
| P2-05 | tree HEAD/pull/push | a) `tree.js:157-217` `pullWorkspace`/`pushWorkspace`：HEAD 过 v1 `tree-head`；b) 每个 `rel` 校验无 `..`、**应用 SKIP（`.git/.nsw/node_modules`/`imagine`）**、规范化后 `realpath` 落 `localPath` 根内；c) **`scan()` 用 `lstatSync` 跳 symlink 或拒越界目标**；d) **stale 删除路径同防护**；e) `localPath` 入参规范化（`resolve`+绝对路径+**拒预存符号链接**）；f) `inside()`(:21-25) 由词法改为 realpath 感知。 | `dsh-nano-shared-workspace/src/host/tree.js:11-25,157-217` | 远程 rel/localPath 无法越出工作区 | `B1-T03` | `..`/symlink/SKIP 文件逃逸被拒；合法文件正常 |
| P2-06 | materialize `..` 穿越 | `session-io.js:326` 周边：`sessionId` 先 `^[A-Za-z0-9_-]{1,128}$` 校验；解包目标 `realpath` 必须落在 `join(dshHome,'sessions',projectKey,sessionId)` 内；越界即拒。 | `dsh-nano-shared-workspace/src/host/session-io.js:326` | sessionId 无法 `..` 穿越覆盖任意文件 | `B1-T03` | `..` sessionId 被拒；正常 materialize 成功 |
| P2-07 | fetch-mp 逐跳复验 | `index.js:333-360`：`fetch` 改 `redirect:'manual'`；循环读 `response.headers.get('location')`，逐跳解析并对每跳重新跑 `^https://mp\.weixin.qq\.com\/s\//` 校验；任一跳不匹配即 `{ok:false,reason:'not-mp-url'}`；保留 `MP_TIMEOUT_MS`/`MP_MAX_HTML_BYTES`/UA；最终 html 仍走 `sanitizeMpHtml`。 | `dsh-nano-notepad/index.js:333-360` | 30x 无法借白名单跳到内网 | `B1-T06` | loopback 跳转被逐跳拒；真 mp 文章仍可达 |
| P2-08 | 存量桶兼容回归 | a) 用 `.env.s3` 现有桶导出 `manifest.json`、若干 `files/*.md`、`images/*` 样本到 `test/remote-schema/compat/`（只导元数据/小对象，样本目录 `.gitignore` 部分大对象可选）；b) `scripts/compat-regression.mjs` 跑 v1 校验；c) 通过率 <100% → 先按「合法样本最小收紧」校准 schema（回 §1.8），再重跑；d) 全程记录哪些样本被判 v0-backfill。 | `test/remote-schema/compat/`、`scripts/compat-regression.mjs` | 存量数据 v1 全量兼容 | `B1-T07` | 兼容样本 100% 通过 |

### 4.3 Phase 3 — `batch2-content-render`（P0 remote→page 6 条）

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P3-01 | 策略表 | `policy.js`：`ALLOWED_ELEMENTS`（a,p,br,span,div,section,article,h1-h6,ul,ol,li,blockquote,pre,code,em,strong,b,i,u,s,del,ins,table,thead,tbody,tr,td,th,img,figure,figcaption,hr,svg,g,image,animateTransform）；`ALLOWED_ATTRS`（href,src,alt,title,colspan,rowspan,width,height,style,class,referrerpolicy,loading,decoding,preserveAspectRatio,xlink:href）；`ALLOWED_SCHEMES`（href=https?，src=https? 或 data:image/(png|jpeg|gif|webp);base64,）；`ALLOWED_STYLE_PROPS` = `MP_SAFE_STYLE`(`markdown.js:248`) ∪ `MP_STYLE_ALLOW`(`index.js:397`) 并集、`position` 强制 static；强制丢弃 script/iframe/object/embed/base/meta/form/input/button/textarea/select/link/style 元素、所有 `on*`、`srcdoc`、`javascript:`/`data:text`/`vbscript:`/`file:`。 | `packages/dsh-html-policy/src/policy.js` | 一张策略表覆盖双端 | `B3-T01` | 负向语料元素/属性全在丢弃集 |
| P3-02 | 客户端 renderer | `markdown.js:179-246` `sanitizeRichHtml`：DOMParser 解析→按策略表遍历元素/属性/样式→返回 `body.innerHTML`；保留 `data-src` 提升（`:188-191`）与 `foreignObject`→`<image>` 转换（`:195-223`）；函数签名/调用方（`panel.js:1342,1371`）不变。 | `dsh-nano-notepad/src/client/markdown.js:179-246` | javascript:/on*/meta/base/form 等被剥；正常排版保留 | `B3-T02` | 负向 0 执行；正向快照一致 |
| P3-03 | 宿主 renderer | `index.js:423-450` `sanitizeMpHtml`：改为用策略表生成 regex 序列化器；保留 `data-src` 提升（`:429-430`）与 `visibility:hidden`→`visible`（`:449-450`）；抽到 `src/host/mp-sanitize.js` 打进 `lib/mp-sanitize.js` 供未打包 `index.js` 相对导入。 | `dsh-nano-notepad/index.js:397,423-450`、`dsh-nano-notepad/src/host/mp-sanitize.js`（净新）、`lib/mp-sanitize.js`（产物） | 宿主清洗与客户端同策略 | `B3-T03` | 负向 0 执行；mp 文章渲染不变 |
| P3-04 | image 校验 | `sync.js:195-215`（`images/*` 消费点）+ `markdown.js:140-150`：`mime` 白名单 4 种、`base64` 字符集、解码 ≤`maxImageBytes`；`src="data:${mime};base64,..."` 只用校验后的 mime。 | `dsh-nano-notepad/src/client/sync.js:195-215`、`markdown.js:140-150` | mime/base64 注入无法进入 img src | `B3-T04` | 伪造 mime image 被拒；正常图片渲染 |
| P3-05 | 属性转义 | `sync.js:195-215`/`db.js:655-665`：`manifest.files` 的 `id`/`name`/`parentId`/`workspaceId` 在进 `data-*`/attr/`dataset` 前统一 `escapeAttr`/白名单校验；`panel.js:1342,1371` 渲染不再裸插。 | `dsh-nano-notepad/src/client/sync.js:195-215`、`db.js:655-665`、`panel.js:1342,1371` | manifest 字段无法逃逸 data-* | `B3-T05` | 注入样本不执行；正常节点渲染 |
| P3-06 | validateJson 上限 | `json.js:15-126`：加 `MAX_DEPTH=32`（可调常数）；超限返回 `{ok:false}`/`RangeError`→受控拒绝，不崩溃。 | `dsh-nano-notepad/src/client/json.js:15-126` | 深嵌套对象不导致 RangeError/崩溃 | `B3-T06` | 1e5 深嵌套受控拒绝 |
| P3-07 | imagine 收口 | `lib/host-media.js:33-48,107-161`：① `{prompt}` 由「字面替换进双引号」改为「写入 `{cwd}/imagine/.prompt.txt` 后以 `PROMPT=$(cat "{cwd}/imagine/.prompt.txt")` 引用」或等效不内联方案；② `{out}` 校验 `imagine/[a-z0-9-]{1,64}\.(png|jpg|jpeg|webp)`；③ `{cwd}` 校验绝对、无空格/引号注入字符（或转义后单引号包裹）；④ grok 的 `cp auth.json/config.toml` 保留但配合 P4-04 `.gitignore`/SKIP 阻止外泄。 | `dsh-nano-model-selector/lib/host-media.js:33-48,107-161` | prompt 中的 `"; rm -rf` 无法逃逸 | `B3-T07` | 注入 payload 不执行；imagine 仍生成图 |
| P3-08 | mp 正向快照 | `fixtures/mp-article.html`：合成含 `data-src`、`<svg><foreignObject>`、table、`pre/code`、白名单 style 的文章；两个 renderer 输出与现状 diff 快照一致。 | `test/spike/security-fix/fixtures/mp-article.html` | 排版零回退证明 | `B3-T08` | 正向快照与现状一致 |

### 4.4 Phase 4 — `batch3-p2-supply`（P2 9 + local-supply 2）

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P4-01 | mutate realpath 围栏 | `mutate.js:44-46` 的 `assertInside` 由**词法** `isLexicallyInside` → **realpath 感知**（`resolve()`→`realpath()`→`isInside(workspaceRoot,resolved)`）；五 mutator `createFile:55`/`rename:79`/`createFolder:140`/`removeEntry:198`/`moveEntry:241` 全走此围栏；`routes.js:297-370` 壳路由不变。越界返回 `{ok:false}`。登记为「加固+边缘行为变化」。 | `dsh-nano-explorer-extra/src/host/mutate.js:44-46,55-285`、`routes.js:297-370` | 指向工作区外的 symlink 被拒 | `B4-T01` | 越界 symlink 拒；正常文件操作不变 |
| P4-02 | `.git` 拒绝 | `mutate.js` 五 mutator：解析路径含 `<root>/.git` 即拒（防侧栏写 `.git/config`）；`git.js:382-384` `commitAll`→`runGit`(:108-122) 在 `git add --all` 前 `realpath` 校验无 `.git/` 进入暂存。 | `dsh-nano-explorer-extra/src/host/mutate.js:44-46,55-285`、`git.js:382-384` | 侧栏无法写 `.git`、git add 不含 `.git` | `B4-T01` | `.git` 写入被拒 |
| P4-03 | scopeOf 日志 | `routes.js:61-77`：`scopeOf(sessionId)` 命中非当前 session 时 `console.warn('[nxe] scopeOf cross-session', sessionId)`；不阻断。 | `dsh-nano-explorer-extra/src/host/routes.js:61-77` | 跨会话 scopeOf 有审计日志 | `B4-T02` | 日志出现、行为不变 |
| P4-04 | grok-creds 阻止外泄 | `.gitignore` += `imagine/.grok/`；nsw `tree.js:11-15` `SKIP` Set += `'imagine'`。 | `.gitignore`、`dsh-nano-shared-workspace/src/host/tree.js:11-15` | `.grok` 不被 git 提交也不被 nsw 同步 | `B4-T03` | `git status`/nsw push 不含 `.grok` |
| P4-05 | accepted-risks 成文 | `accepted-risks.json`：9 条逐项——加固 4（mutate-symlink「加固+边缘」、git-config、grok-creds、scopeof「日志」）；接受 5（routes-read-arbitrary-file、read-arbitrary-md-read、ls-mkdir-any-absolute-path、s3-config-endpoint-ssrf、perf-review-window-drain）。每条 fingerprint/主体/现有功能/接受理由/可选加固/监控方式/owner 签字/复核日期。 | `security/accepted-risks.json` | P2 全登记、可每 release 复核 | `B4-T03` | JSON 字段齐；mutate-symlink 标「加固+边缘」 |
| P4-06 | npx 移除 | 四 `build-client.mjs`：删 `npx --yes esbuild@0.25.0` 分支；`local` 缺失即 `console.error('run npm ci first'); process.exit(1)`。 | `dsh-nano-*/scripts/build-client.mjs:11,21/25` | 构建只用本地 pinned esbuild | `B4-T04` | 无 node_modules 时构建报错且提示 npm ci |
| P4-07 | release CI | `.github/workflows/release.yml`：`on: push: tags:['v*']` → checkout → `npm ci` → `npm run build` → `node scripts/check-clean-lib.mjs`（`git diff --exit-code -- lib/` 或哈希比对）→ `npm pack` → `SHA256SUMS` → `actions/attest-build-provenance`；本地脚本 `check-clean-lib.mjs` 先落地可手动跑。 | `.github/workflows/release.yml`（净新）、`scripts/check-clean-lib.mjs`（净新） | tag 构建可重现、产物有 attestation | `B4-T05` | dry-run 各步通过 |

### 4.5 Phase 5 — `release-closure`

| 编号 | 工作项 | 工作内容 | 涉及文件 / 模块（file:line） | 预期结果 | 测试映射 | 收口标准 |
|------|--------|----------|------------------------------|----------|----------|----------|
| P5-01 | 版本 bump | 七 `package.json`：notepad/model-selector/explorer `0.1.1→0.2.0`、nsw `0.1.0→0.2.0`；三包 `0.1.0`；`files` 含新 lib 产物；`version` 与将来 tag 对齐。 | 七 `package.json` | 版本线就绪 | `B5-T01` | `npm pack --dry-run` 文件清单一致 |
| P5-02 | tarball 隔离安装 | 对每个 `.tgz`：拷贝到 `/tmp/iso-<name>/`（**不**带 `<parent>/packages/`），`dsh plugin --profile web add /tmp/iso-*/x.tgz`，确认激活、无「找不到 file: 依赖」错误；失败即说明 devDeps 迁移未净。 | `test/spike/security-fix/` | tarball 自足安装 | `B5-T02` | 隔离目录安装成功并激活 |
| P5-03 | dsh-dev 全量 smoke | `dsh-dev.local`：notepad save/read/cloud-settings/s3-sync/mp-render；explorer create/read/rename/delete/git；nsw join/pull/push/ls/mkdir；model-selector 引擎切换 + `/imagine`；确认「功能无变化」。 | `https://dsh-dev.local/` | 全功能零回退 | `B5-T03` | 全部 smoke PASS + 截图/日志 |

---

## 5. Phase 详情

### 5.1 Phase 1 — `batch0-baseline`

- **Phase 目标**：焊死基线——三共享包骨架、`route-sensitivity.json`/`feature-contract.json`/`accepted-risks.json` 三份 CI 真源、分发通道（devDeps + lib/ bundle）、43 路由全部经 guard 注册（零行为）。
- **本 Phase 对应编号**：`P1-01` … `P1-09`
- **本 Phase 新增文件**：`packages/dsh-host-route-guard/`、`packages/dsh-remote-data-schema/`、`packages/dsh-html-policy/` 三包骨架；`security/{route-sensitivity,feature-contract,accepted-risks}.json` + `route-inventory.md`；`scripts/{gen-route-sensitivity,check-route-sensitivity,check-feature-contract,check-clean-lib,compat-regression}.mjs` + `scripts/security-regression/`；`test/spike/security-fix/`、`test/remote-schema/compat/`；notepad `lib/{route-guard,mp-sanitize}.js` 产物（schema 经 `s3-sync.js`→`lib/s3-sync-host.js`，无 schema-shim）。
- **本 Phase 修改文件**：四 `package.json`（deps→devDeps、+三包 file:、+files）、四 `scripts/build-client.mjs`、四插件注册点（`dsh-nano-notepad/index.js:60-76,234-321`；`dsh-nano-explorer-extra/src/host/routes.js:450-478`；`dsh-nano-shared-workspace/src/host/routes.js:481-509`；`dsh-nano-model-selector/index.js:28-30,241-255`）。
- **具体功能预期**：
  1. guard 是唯一 `webServer.register` 入口；fail-closed 取 `connection`。
  2. `route-sensitivity.json` 43 行与代码一一对应；`check-route-sensitivity` 0 漂移。
  3. `feature-contract.json` 固定 path/method/bodyLimit/UI/数据位置；`/save` 8MB、`/s3/object` 32MB 等逐路由继承，不套统一 64KiB。
  4. 四插件 `package.json` 运行时无 `file:` dependencies；`lib/` 含全部 bundle 产物。
  5. `node --check`/`npm pack --dry-run` 通过；`dsh-dev` 加载插件 43 路由全部可达且行为不变。
- **对应测试台账项**：`B0-T01`…`B0-T05`（详见 §8）
- **收口标准**：`check-route-sensitivity` + `check-feature-contract` PASS；`dsh-dev` 43 路由可达、smoke 全过；`npm pack --dry-run` 文件齐。
- **本 Phase 风险提醒**：guard 是单点安全基础件——必须极简、无业务逻辑、单测覆盖；bodyLimit 若误套统一 64KiB 会让 `/save` 大笔记回退（T-O-14-1）。

### 5.2 Phase 2 — `batch1-host-data`

- **Phase 目标**：remote-cross 7 条全部收口——远端对象在宿主消费点被 v1 schema 整对象拒绝；身份绑定/限额/CAS/逐跳复验切断攻击链。
- **本 Phase 对应编号**：`P2-01` … `P2-08`
- **本 Phase 新增文件**：`packages/dsh-remote-data-schema/src/schema/{v1,v0}/*.js`、`reject.js`；`test/remote-schema/compat/` 样本；`scripts/compat-regression.mjs`；notepad `src/host/mp-sanitize.js` 可后置（Phase 3）。
- **本 Phase 修改文件**：`dsh-nano-notepad/src/host/s3-sync.js:231-250`、`dsh-nano-notepad/index.js:333-360`、`dsh-nano-shared-workspace/src/host/{workspaces.js:87,103-130,session-io.js:132-166,172-281,326,tree.js:11-25,157-217,routes.js:224-234,296-373,447-470}`（routes.js 的 join/claim/heartbeat/lease/materialize 边界校验为 §1.8-1 双层要求的另一半）。
- **具体功能预期**：
  1. `manifest.json`/`files/*`/`images/*` 的 `get` 在返回前过 v1 schema；`put` 对 known 形态校验、未知 key 仅保 key 限制（不收窄写入能力）。
  2. nsw marker 仅当 `createdBy`/`instance` 与本地匹配才采信 `member.localPath`。
  3. `committedBytes` ≤`maxCommittedBytes`、part ≤64KiB 且数量受限；`acquireClaim` 用 `ifMatch` CAS。
  4. tree `rel` 无 `..` 且 realpath 落工作区；materialize `sessionId` 字符集 + realpath 围栏。
  5. `fetch-mp` `redirect:'manual'` 逐跳复验 mp allowlist；合法 mp 文章仍可达。
  6. 拒绝语义 `{ok:false,reason:'schema',detail}`；notepad 客户端走既有 `sync.cycle` catch→`phase:'error'`；nsw 记录并跳过。
  7. 存量桶样本 v1 校验 100% 通过（T-O-14-2）。
- **对应测试台账项**：`B1-T01`…`B1-T08`（详见 §8）
- **收口标准**：fake S3 注入 6 类恶意对象全拒；`feature-contract` 不变；存量样本 100% 兼容；nsw/notepad 同步 smoke 全过。
- **本 Phase 风险提醒**：v1 过严误杀历史合法数据（T-O-14-2 的兜底前提）；`/s3/object` `put` 若误拒任意 key 会收窄现有写入能力（T-O-3）。

### 5.3 Phase 3 — `batch2-content-render`

- **Phase 目标**：remote→page 6 条全部收口——共享 allowlist 双 renderer 剥除活动内容，转义/校验/上限/注入收口，排版零回退。
- **本 Phase 对应编号**：`P3-01` … `P3-08`
- **本 Phase 新增文件**：`dsh-nano-notepad/src/host/mp-sanitize.js`、`dsh-nano-notepad/lib/mp-sanitize.js`（产物）、`test/spike/security-fix/fixtures/mp-article.html`。
- **本 Phase 修改文件**：`dsh-nano-notepad/src/client/{markdown.js:140-150,179-246,sync.js:195-215,panel.js:1342,1371,json.js:15-126,db.js:655-665}`、`dsh-nano-notepad/index.js:397,423-450`、`dsh-nano-model-selector/lib/host-media.js:33-48,107-161`。
- **具体功能预期**：
  1. 一张策略表（`ALLOWED_*`）同时驱动客户端 DOM renderer 与宿主 regex renderer；两 renderer 对同一语料输出等价（剥除集相同）。
  2. `sanitizeRichHtml`/`sanitizeMpHtml` 只剥活动内容；`data-src` 提升、`foreignObject`→`image`、`visibility:hidden`→`visible` 保留。
  3. `mime`/`base64`/`manifest.*` 字段在进 `src`/`data-*` 前校验+转义。
  4. `validateJson` 深度上限，深嵌套不 RangeError。
  5. `{prompt}`/`{out}`/`{cwd}` 注入无法逃逸命令模板；grok creds 复制仍工作（外泄由 P4-04 阻断）。
  6. 负向 XSS 语料（audit battery-dom/evidence）0 执行；正向 mp 文章快照与现状一致。
- **对应测试台账项**：`B3-T01`…`B3-T09`（详见 §8）
- **收口标准**：负向语料 0 执行（无 `document.title` mark、无导航）；正向快照 diff 为空；`feature-contract` 不变；notepad/mp/imagine smoke 全过。
- **本 Phase 风险提醒**：regex renderer 与 DOM renderer 对边缘 HTML 语义可能不一致——必须用同一策略表 + 同一语料对齐；allowlist 过严剥掉排版即功能回退。

### 5.4 Phase 4 — `batch3-p2-supply`

- **Phase 目标**：P2 9 条按「零成本加固 vs accepted」逐项落地；`accepted-risks.json` 成文；esbuild npx 回退移除；release CI + clean-lib + attestation。
- **本 Phase 对应编号**：`P4-01` … `P4-07`
- **本 Phase 新增文件**：`.github/workflows/release.yml`、`scripts/check-clean-lib.mjs`。
- **本 Phase 修改文件**：`dsh-nano-explorer-extra/src/host/{routes.js:61-77,297-370,mutate.js:44-46,55-285,git.js:382-384}`、`dsh-nano-shared-workspace/src/host/tree.js:11-15`、`.gitignore`、`security/accepted-risks.json`、四 `build-client.mjs`。
- **具体功能预期**：
  1. mutate 五路由 realpath 围栏（登记「加固+边缘行为变化」）；`.git` 拒绝；scopeOf 跨会话仅日志。
  2. `.gitignore`+`SKIP` 阻止 `imagine/.grok/` 被提交/同步。
  3. `accepted-risks.json` 9 条字段齐；mutate-symlink 标「加固+边缘」而非「功能无影响」。
  4. `build-client.mjs` 无 npx 回退；缺 esbuild 报错提示 `npm ci`。
  5. `release.yml` 在 `v*` tag 跑 `npm ci→build→clean-lib→pack→SHA256SUMS→attest`。
- **对应测试台账项**：`B4-T01`…`B4-T06`（详见 §8）
- **收口标准**：P2 加固用例通过；`accepted-risks.json` 字段齐且 P2 PoC 仍属本地自影响；无 `node_modules` 时 build 报错；`release.yml` dry-run 各步通过。
- **本 Phase 风险提醒**：`mutate-symlink` 的 realpath 围栏是**真实边缘行为变化**（explorer 现行「软链接当作普通条目跟随」），必须在 `accepted-risks.json` 显式登记；release attestation 依赖 GitHub Actions，首次真实 tag 才有运行时证据（dry-run 只能验证步骤）。

### 5.5 Phase 5 — `release-closure`

- **Phase 目标**：每插件一次 minor、tarball 自足安装、dsh-dev 全量功能 smoke、release workflow dry-run。
- **本 Phase 对应编号**：`P5-01`/`P5-02`/`P5-03`
- **本 Phase 修改文件**：七 `package.json`（version/files）。
- **具体功能预期**：
  1. `npm pack --dry-run --json` 文件清单与 `files` 一致；`lib/` 由当前源重建。
  2. `.tgz` 在无 `<parent>/packages/` 的隔离目录 `dsh plugin add` 成功并激活。
  3. `dsh-dev` 全功能 smoke（四插件）PASS。
- **对应测试台账项**：`B5-T01`…`B5-T03`
- **收口标准**：隔离安装激活；smoke 全过；四元组证据齐。
- **本 Phase 风险提醒**：tag 推送与 GitHub release 是发布动作，本 AP 只到 dry-run；真实 attestation 需首个 `v*` tag 验证。

---

## 6. 依赖的冻结设计决策（只读引用）

| 决策 / Q ID | 冻结来源 | 本计划中的影响 | 若不成立的处理 |
|-------------|----------|----------------|----------------|
| `T-O-1` | `pre-security-fix-qna.md` §1.1（Q1=C） | 全部修复以「页面脚本=较低信任主体」为前提；能力边界而非 realm 隔离 | 回 QNA 追加 T-O-15 |
| `T-O-3` | §1.3（业主变更令） | 不删路由/不改 UI/不迁移数据；`feature-contract` 为硬门禁；P2 改变功能即登记 accepted | 停止执行回 QNA |
| `T-O-5` | §1.5（Q3=C） | P0/P2 三桶清单与批次归属 | 重新分桶回 QNA |
| `T-O-6` | §1.6（Q4=A） | 三包架构 + 不迁移数据面 | 回 QNA |
| `T-O-7` | §1.7（Q5=B） | Phase 1 的 43 行清单 + guard 强校验 | 回 QNA |
| `T-O-8` | §1.8（Q6=A） | Phase 2 整对象拒绝 + v0 兼容 + put/get 不对称 | 回 QNA |
| `T-O-9` | §1.9（Q7=A） | Phase 3 共享 allowlist + 双 renderer | 回 QNA |
| `T-O-10` | §1.10（Q8=B） | Phase 1–4 批次结构与 Phase 5 单次 minor 发布 | 回 QNA |
| `T-O-11` | §1.11（Q9=B） | Phase 4 P2 逐项处置 + accepted-risks | 回 QNA |
| `T-O-12` | §1.12（Q10=A） | Phase 4 npx 移除 + CI/attestation | 回 QNA |
| `T-O-13` | §1.13（v1.1 errata） | Phase 1 分发通道：devDeps + lib/ bundle + 清单烤常量 | 回 QNA |
| `T-O-14` | §1.14（v1.1 errata） | feature-contract 逐字段 / 存量桶回归 / mutate-symlink 登记 | 回 QNA |

---

## 7. 内置 Reference-Anchor 锚区

### 7.1 锚表

| 锚 ID | `path:line` | 落点（这是什么） | 本 AP 用途（对应工作项） | 处置 | 备注 |
|-------|-------------|------------------|--------------------------|------|------|
| A-1 | `dsh-nano-notepad/index.js:60-76` | 路由常量 + bodyLimit 常量（SAVE/READ/MP/S3_* + MAX_*） | P1-02 清单生成；P1-03 合同 bodyLimit；P2-07 fetch-mp | `✅ 复用` | bodyLimit 逐路由继承，勿套统一默认 |
| A-2 | `dsh-nano-notepad/index.js:234-320` | 4 个 `ctx.effect` `webServer.register` 块 | P1-05 迁移到 guard | `✅ 复用` | 保持 handler/响应不变 |
| A-3 | `dsh-nano-notepad/index.js:333-360,397,423-450` | fetchMp（redirect follow）+ MP_STYLE_ALLOW + sanitizeMpHtml | P2-07 逐跳复验；P3-03 宿主 renderer | `♻️ 重 substrate` | redirect 改 manual 逐跳；sanitize 抽 `src/host/mp-sanitize.js` |
| A-4 | `dsh-nano-notepad/src/host/s3-sync.js:231-250` | `/s3/object` 唯一宿主入口（put/get/list + `ifMatch`） | P2-02 schema 消费点；P2-04 CAS 借用 | `✅ 复用` | `ifMatch` 已存在，CAS 直接复用 |
| A-5 | `dsh-nano-notepad/src/client/{sync.js:195-215,239-251,markdown.js:140-246,panel.js:1342,1371,db.js:655-665,json.js:15-126}` | 客户端数据流 + 渲染 + XSS sink | P3-02/04/05/06 | `✅ 复用` | 只加校验/转义，不改数据流 |
| A-6 | `dsh-nano-explorer-extra/src/host/routes.js:61-77,297-370,412-449,450-478` | scopeOf + mutate 路由 + read + registerRoutes | P4-01/02/03；P1-05 | `✅ 复用` | mutate 加 realpath；read/allowOutsideWorkspace 保留 |
| A-7 | `dsh-nano-explorer-extra/src/host/git.js:382-384`（`commitAll`→`runGit` :108-122） | `git add --all` 暂存 | P4-02 `.git` 前置校验 | `✅ 复用` | 注：`:424-429` 是 `ignoredAmong` 的 check-ignore 收尾，非 add 落点 |
| A-8 | `dsh-nano-shared-workspace/src/host/routes.js:123-179,388-431,481-509` | `/settings` **四方法**（GET:123/POST test:130/PUT update:154/POST clear:173）+ ls/mkdir + registerRoutes | P1-02/05；P4 边界 | `✅ 复用` | `/settings/update` 是 PUT+L2（v1.1 更正） |
| A-8b | `dsh-nano-shared-workspace/src/host/routes.js:224-234,296-373,447-470` | `/workspaces/join`、`/sessions/{claim,heartbeat,lease}`、`/materialize` 的 `body.{workspaceId,sessionId}` 边界 | P2-03/04/06 边界校验 | `✅ 复用` | lease:364 直拼 `claims/`+sessionId 绕过 session-io，必须边界拦截 |
| A-8c | `dsh-nano-explorer-extra/src/host/mutate.js:44-46,55-285` | 五 mutator（createFile/rename/createFolder/removeEntry/moveEntry）+ `assertInside`（词法） | P4-01/02 | `♻️ 重 substrate` | 真正实现层；`assertInside` 需 realpath 感知 |
| A-8d | `dsh-nano-explorer-extra/src/host/routes.js:384-399` | `/list`（audit #15 另一半，不围栏目录枚举） | P1-02 清单 | `✅ 复用` | 登记 L2/保留，不入 mutate 围栏（T-O-3） |
| A-9 | `dsh-nano-shared-workspace/src/host/{workspaces.js:87,103-130,session-io.js:132-166,172-281,326,tree.js:11-25,157-217}` | remote-cross 全部消费点（含 `renewClaim:149-166`） | P2-03/04/05/06 | `✅ 复用` | marker/meta/tree-HEAD 三处 schema 消费点 |
| A-10 | `dsh-nano-model-selector/index.js:28-30,240-260`、`lib/host-media.js:33-48,107-161` | `/catalog`+`/media-engine` 注册；imagine 模板 | P1-05；P3-07 | `✅ 复用` | `lib/host-media.js` 是 shipped 源文件可直接改 |
| A-11 | `dsh-nano-*/package.json`、`dsh-nano-*/scripts/build-client.mjs` | files/deps/esbuild/npx 回退 | P1-04；P4-06 | `✅ 复用` | file: deps→devDeps；删 npx |
| A-12 | `packages/dsh-nano-ui/`、`dsh-performance-review/`、`dsh-s3-client/` | 既有共享包先例 | P1-01/04 结构参照 | `✅ 复用` | 构建期依赖 + `lib/` bundle 先例 |
| A-13 | `packages/dsh-host-route-guard/`、`dsh-remote-data-schema/`、`dsh-html-policy/` | 三共享包（净新） | P1-01/06/07；P2/P3 实现 | `🆕 净新` | 无既有可锚 |
| A-14 | `security/{route-sensitivity,feature-contract,accepted-risks}.json`、`route-inventory.md` | CI 真源（repo 根，不进包） | P1-02/03/08；P4-05 | `🆕 净新` | 运行时不可达 → 构建期烤常量（T-O-13） |
| A-15 | `scripts/{gen,check}-route-sensitivity.mjs`、`check-feature-contract.mjs`、`check-clean-lib.mjs`、`compat-regression.mjs`、`security-regression/` | CI/回归脚本 | 全部 Batch 门禁 | `🆕 净新` | 无既有可锚 |
| A-16 | `test/spike/security-fix/`、`test/remote-schema/compat/` | 测试基座 | 全部 Batch 门禁 | `🆕 净新` | spike 宪章先行 |
| A-17 | `.github/workflows/release.yml` | release CI | P4-07 | `🆕 净新` | 仓库无 `.github/workflows/`（审计核实） |
| A-18 | `release.md` | 发布流程与安全信任链 | P4-07、P5 文档同步 | `✅ 复用` | release.md:42/:170 承诺 CI/attestation |
| A-19 | `.anote/security-26nov/agents/{v-mpsan,v-richxss}/artifacts/{battery-dom,evidence}.txt` | 审计负向语料 | P3-01/02/03 负向测试 | `♻️ 重 substrate` | 复用为负向 fixture，不重写 |

### 7.2 反例 ledger ⛔

| ⛔ | 反例 / 陷阱 | 为什么（依据）|
|----|------------|----------------|
| ⛔1 | 按插件/HTTP 方法批量赋 sensitivity | 同一 `/settings` GET/POST/PUT、`/s3/*`、`/media-engine` 语义完全不同（Q5 反例 A/C；`routes.js:123-172`、`index.js:210-245`）|
| ⛔2 | 用 `security/route-sensitivity.json` 运行时读取 | repo 根、不在 files、运行时不可达；必须构建期烤进 `lib/` 为 JS 常量（T-O-13/B5）|
| ⛔3 | 给所有路由套统一 64KiB bodyLimit | `/save`=8MB、`/s3/object`=32MB 会回退（T-O-14-1）|
| ⛔4 | `/s3/object` `put` 拒绝任意 key | 客户端本就用任意 key 写 manifest/files/images；拒即收窄写入能力（T-O-3；`s3-sync.js:231-242`）|
| ⛔5 | 运行时裸 `import 'dsh-remote-data-schema'` | dev 实例只拷贝 `lib/`、不拷 `node_modules`；裸 import 解析失败（T-O-13；三处 build 注释）|
| ⛔6 | 把 `file:` 三包放进 `dependencies` | `.tgz` 安装需要 `<parent>/packages/` 布局，tarball 不自足（T-O-13-3）|
| ⛔7 | 对缺 `schemaVersion` 的历史对象直接拒 | 存量桶数据会被误杀 → 功能回退（T-O-8 v0 兼容、T-O-14-2）|
| ⛔8 | 把 `mutate-symlink-escape` realpath 登记为「功能无影响」 | explorer 现行「软链接当作普通条目跟随」，越界链接被拒是**边缘行为变化**（T-O-14-3）|
| ⛔9 | 保留 `npx esbuild` 作为 fallback | npx 绕 lockfile、无完整性锚定（T-O-12；`build-client.mjs` npx 分支）|
| ⛔10 | 先修 content-render 再修 host-data | XSS 是放大器，host 数据入口不先堵则恶意对象已入库（Q8 reasoning）|
| ⛔11 | 修复中删除 `allowOutsideWorkspace`/`/s3/config`/`/workspaces/join` 目录选择 | 现有 UI 功能，删即功能回退（T-O-3；`cloud-settings.js`、`routes.js:392/419/427`）|
| ⛔12 | 客户端 `sync.js`/IndexedDB 数据面迁移 | 改变数据位置/离线行为（T-O-3/T-O-6；`INTRODUCTION.md:89`）|

### 7.3 上游真源指针 + 安全项威胁模型

- **独立 reference-anchor**：无独立文件；**§7 即本 AP 的 grounding 真源**。冻结决策真源：`docs/code-review/26-nov/pre-security-fix-qna.md` §1（T-O-1…T-O-14）。
- **安全 / 信任边界类工作项的威胁模型锚**：`docs/code-review/26-nov/security-audit.md` §4.1–§4.24（24 条详情的攻击链与 PoC）；`docs/code-review/26-nov/pre-security-fix-qna.md` §0.1（主体/宿主/页面术语）+ §1.4 `T-O-4`（本地威胁模型：本地单用户、loopback、无公网）+ §1.5 `T-O-5`（P0 remote-cross/remote→page / P2 page-self）。威胁模型已在 QNA 冻结，本 AP 直接引用。

---

## 8. 测试台账

### 8.1 测试清单（主表）

| Test-ID | 测试项（验证什么）| 类型 | 层 | 来源 | 映射（工作项 → 收口目标）| PASS 证据（四元组）|
|---------|------------------|------|----|------|---------------------------|---------------------|
| `B0-T01` | guard：fail-closed connection、未登记路由 throw、405/JSON 错误形状、bodyLimit 强制、route-inventory 生成 | 短途 | unit | `🆕 新增 packages/dsh-host-route-guard/test/route-guard.test.mjs` | `P1-01 → guard 可注册且拒绝未登记` | `commit + node --test 全过 + run-time` |
| `B0-T02` | route-sensitivity：代码↔清单 43 行一一对应、字段齐、无漂移 | 短途 | 契约 | `🆕 新增 scripts/check-route-sensitivity.mjs` | `P1-02 → 43 行清单 = 代码` | `commit + node scripts/check-route-sensitivity.mjs 0 漂移 + run-time` |
| `B0-T03` | feature-contract：path/method/bodyLimit/UI/数据位置与代码一致；bodyLimit 逐路由继承 | 短途 | 契约 | `🆕 新增 scripts/check-feature-contract.mjs` | `P1-03 → 合同锁定现有行为` | `commit + check-feature-contract PASS + run-time` |
| `B0-T04` | 分发通道：**静态断言** index.js/host 无 bare import 共享包（AST/grep 断言 import specifier ∉ 共享包名；`node --check` 只语法解析、不解析模块、裸 specifier 照样 0 退出码——**不可用作依据**）；`package.json` deps 无 `file:` | 短途 | 集成 | `🆕 新增 scripts/check-no-bare-import.mjs`（可并入 check-feature-contract） | `P1-04 → 运行时无裸 import` | `commit + 静态断言 0 bare import + run-time` |
| `B0-T05` | 43 路由经 guard 可达且行为不变（注册迁移 smoke） | spike | live(D1 `dsh-dev`) | `🆕 新增 test/spike/security-fix/` | `P1-05 → 43 路由可达` | `commit + dsh-dev 43 路由 smoke PASS + D1 + run-time` |
| `B1-T01` | schema v1/v0：六类对象正样本通过、负样本（id 逃逸/mime 逃逸/深嵌套/超 committedBytes/…）整对象拒绝、v0 标 backfill | 短途 | unit | `🆕 新增 packages/dsh-remote-data-schema/test/schema.test.mjs` | `P2-01 → v1 规则 + v0 兼容` | `commit + node --test 全过 + run-time` |
| `B1-T02` | `/s3/object` schema：fake S3 返回恶意 manifest/files/images 被拒；正常对象通过；`put` 未知 key 不拒 | 短途 | 集成 | `🆕 新增 dsh-nano-notepad/test/s3-object-schema.test.mjs` + fake S3 | `P2-02 → get/put 不对称校验` | `commit + 集成测试 PASS + run-time` |
| `B1-T03` | nsw remote-cross PoC 重放（**按 fingerprint 拆 6 子断言**）：异主/仅用户名回退 marker localPath 不匹配、committedBytes 超限拒、`..` sessionId/workspaceId 拒（路由边界+消费点双层）、tree rel `..`/symlink/SKIP 拒、materialize `..` 拒、异主 claim/renew 拒 | spike | 集成(fake S3) | `🔱 fork .anote/security-26nov PoC → scripts/security-regression/` | `P2-03/04/05/06 → 6 条 remote-cross 拒` | `commit + 6 fingerprint 逐条 PASS（不计数）+ run-time` |
| `B1-T04` | `/s3/object` `put` 任意 key 通过、known-key 非法 payload 拒（put/get 不对称不回归） | 短途 | 集成 | `🆕 新增（并入 B1-T02 harness）` | `P2-02 → 不收窄写入能力` | `commit + put 任意 key PASS + 非法 known 拒 + run-time` |
| `B1-T05` | claim/renew CAS：并发 push 无静默混合写；`ifMatch` 冲突重试/拒绝。**fake S3 必须实现 etag/if-match 语义**（getJson 返回 etag、putJson 对 etag 不符返回 412），否则 CAS 测试恒过 | 短途 | 集成 | `🆕 新增（fake S3 实现 etag/if-match）` | `P2-04 → CAS 生效（acquire+renew）` | `commit + 并发测试 PASS + run-time` |
| `B1-T06` | fetch-mp 逐跳复验：30x→loopback 内网被拒、30x→另一 mp 文章可达、直接 mp 可达 | spike | 集成(loopback server) | `🔱 fork fetch-mp harness` | `P2-07 → SSRF 逐跳拒` | `commit + 跳转链断言 PASS + run-time` |
| `B1-T07` | 存量桶兼容（**v1-freeze 前置闸**，置于 Batch-1 冻结 v1 规则**之前**）：现有桶导出样本 v1 校验 100% 通过；v0 样本只读通过标 backfill。**样本必须用真桶导出（禁自生成自证）且设下限 N≥K**（K 由宪章定，覆盖 manifest/files/images/marker/session-meta/tree-head 六类） | 短途 | 回归 | `🆕 新增 test/remote-schema/compat/` + `scripts/compat-regression.mjs` | `P2-08 → T-O-14-2 前置闸` | `commit + 样本数 ≥K + 兼容率 100% + run-time` |
| `B1-T08` | Batch 1 门禁：feature-contract 不变 + security-regression(P0 host-data) 全拒 + notepad/nsw 同步 smoke | spike | live(D1) | `🔱 fork smoke` | `Batch 1 gate` | `commit + 门禁三项 PASS + D1 + run-time` |
| `B3-T01` | html-policy 策略表：ALLOWED_* 覆盖 mp 所需、强制丢弃集含全部活动元素/属性/scheme | 短途 | unit | `🆕 新增 packages/dsh-html-policy/test/policy.test.mjs` | `P3-01 → 策略表完备` | `commit + node --test 全过 + run-time` |
| `B3-T02` | 客户端 renderer：负向语料（battery-dom/evidence 变体 + **补充语料**含 `<textarea>`/`<select>`/`vbscript:`/`file:`/`srcdoc` 等电池缺向量）0 执行；data-src/foreignObject 保留。**向量覆盖表**逐族断言（元素/属性/scheme/style/导航） | spike | e2e(offline DOM) | `🔱 fork 审计负向语料 + 补向量` | `P3-02 → javascript:/on*/meta 剥除` | `commit + 0 执行 + 向量表全列 + run-time` |
| `B3-T03` | 宿主 renderer：同一语料 regex 输出等价剥除；`visibility:hidden`→`visible`、data-src 提升保留；与 B3-T02 同向量覆盖表对齐（防「客户端安全宿主漏」） | 短途 | unit | `🆕 新增 dsh-nano-notepad/test/mp-sanitize.test.mjs` | `P3-03 → 宿主同策略` | `commit + 语料断言 PASS + 向量表 + run-time` |
| `B3-T04` | image mime/base64：伪造 mime 的 image 被拒、正常图片渲染 | 短途 | 集成 | `🆕 新增（并入 sync harness）` | `P3-04 → mime 注入拒` | `commit + 断言 PASS + run-time` |
| `B3-T05` | manifest 属性转义：注入 `id`/`workspaceId` 样本进 data-* 不执行；正常 tree/group/tab 渲染 | spike | e2e(offline DOM) | `🔱 fork db/panel harness` | `P3-05 → data-* 逃逸拒` | `commit + 0 执行 + run-time` |
| `B3-T06` | validateJson 深度上限：1e5 深嵌套受控拒绝不 RangeError | 短途 | unit | `🆕 新增 dsh-nano-notepad/test/json-depth.test.mjs` | `P3-06 → DoS 收口` | `commit + 断言 PASS + run-time` |
| `B3-T07` | imagine 注入：`{prompt}`/`{out}`/`{cwd}` 注入 payload（`"; rm -rf`、反引号、`$()`）不执行；正常生成图 | spike | 集成 | `🔱 fork 审计 imagine PoC` | `P3-07 → 模板注入拒` | `commit + payload 不执行 + run-time` |
| `B3-T08` | mp 正向快照：synthetic mp 文章两 renderer 输出与现状 diff 为空 | 短途 | 回归 | `🆕 新增 fixtures/mp-article.html` | `P3-08 → 排版零回退` | `commit + diff 为空 + run-time` |
| `B3-T09` | Batch 2 门禁：feature-contract 不变 + security-regression(P0 content-render) 全拒 + notepad/mp/imagine smoke | spike | live(D1) | `🔱 fork smoke` | `Batch 2 gate` | `commit + 门禁三项 PASS + D1 + run-time` |
| `B4-T01` | P2 加固：mutate 越界 symlink 拒、`.git` 写入拒、git add 不含 `.git` | 短途 | 集成 | `🆕 新增 explorer harness` | `P4-01/02 → 加固生效` | `commit + 断言 PASS + run-time` |
| `B4-T02` | scopeOf 跨会话日志：warn 出现、行为不变 | 短途 | unit | `🆕 新增` | `P4-03 → 日志加固` | `commit + warn 断言 PASS + run-time` |
| `B4-T03` | P2 accepted 登记（**语义断言**非仅字段齐）：`.gitignore`/SKIP 阻断 `.grok`；`accepted-risks.json` 9 条 fingerprint 全命中、disposition∈{harden,accept} 分类正确、mutate-symlink 标「加固+边缘行为变化」而非「无影响」 | 短途 | 回归 | `🆕 新增 + ♻️ 沿用` | `P4-04/05 → 登记成文` | `commit + JSON 语义断言 PASS + run-time` |
| `B4-T04` | npx 移除：无 `node_modules` 时 `build-client.mjs` 报错且提示 `npm ci`；有 esbuild 时 build 成功且 lib/ 哈希可重现 | 短途 | 集成 | `🔱 fork build harness` | `P4-06 → 构建只用 pinned esbuild` | `commit + 缺 esbuild 报错 + 有则 PASS + run-time` |
| `B4-T05` | release workflow：`release.yml` 语法/步骤 lint + `check-clean-lib.mjs` 本地 dry-run 通过（无 tag 推送）+ `lib/` rebuild 位级一致（rebuild→diff 为空） | 短途 | 契约 | `🆕 新增 .github/workflows/release.yml` | `P4-07 → CI 就绪` | `commit + lint + clean-lib + rebuild-diff 空 + run-time` |
| `B4-T06` | **Batch-3 门禁**（T-O-10-1「每批独立门禁」）：`feature-contract` 不变 + P2 加固用例（B4-T01/02）PASS + accepted-risks 语义断言（B4-T03）+ explorer/nsw mutate/git/ls 功能 smoke 无回退 | spike | live(D1) | `🔱 fork smoke` | `Phase 4 gate` | `commit + 门禁三项 PASS + D1 + run-time` |
| `B5-T01` | tarball 自足：`npm pack --dry-run --json` 文件清单 = `files`；无 `file:` 运行时依赖 | 短途 | 契约 | `🆕 新增（并入 pack 检查）` | `P5-01 → tarball 自足` | `commit + pack 清单一致 + run-time` |
| `B5-T02` | tarball 隔离安装：`.tgz` 在无 `<parent>/packages/` 的隔离目录 `dsh plugin add` 成功并激活；**收口须含「宿主日志无模块解析错 + 隔离实例 43 路由可达 smoke」**，并验证 `dsh plugin add` 对 `file:` devDep 不试图运行时解析 | mega | live(D1) | `🆕 新增 test/spike/security-fix/` | `P5-02 → 独立安装` | `commit + 隔离安装激活 + 43 路由 smoke + 宿主日志无解析错 + D1 + run-time` |
| `B5-T03` | dsh-dev 全量 smoke：四插件全部核心功能零回退 | mega | live(D1) | `🆕 新增 test/spike/security-fix/` | `P5-03 → 功能无变化` | `commit + 全 smoke PASS + D1 + run-time` |
| `B5-T04` | 全量 P0 回归：13 条 P0 PoC 全部失败（mega 收口） | mega | 集成+live(D1) | `🔱 fork 全部 PoC` | `本 AP 收口 = P0 全拒` | `commit + 13/13 PoC 拒 + D1 + run-time` |
| `B5-T05` | 确定性回归：security-regression harness 连跑 N≥3 次结果一致（soak 退出硬闸） | soak | 集成 | `🔱 fork regression` | `退出硬闸` | `commit + N 次一致 + run-time` |

### 8.2 复用台账

| 既有用例 | 处置 | 改动 | 起跑线状态 |
|----------|------|------|------------|
| `.anote/security-26nov/agents/v-mpsan/artifacts/battery-dom.txt` | `🔱 fork → packages/dsh-html-policy/test/fixtures/` | 作为负向语料直接引用，不改内容 | 已存在，确认含活动内容 |
| `.anote/security-26nov/agents/v-richxss/artifacts/evidence.txt` | `🔱 fork → 客户端 renderer 负向` | 作为负向语料直接引用 | 已存在，确认含 XSS 变体 |
| `.anote/security-26nov` 各 v-* PoC | `🔱 fork → scripts/security-regression/` | 提取为可重复执行的 fake-S3/loopback/page-fetch 脚本 | 已存在，需工程化 |
| `dsh-nano-notepad/test/{file-names,s3-profiles}.test.mjs` | `♻️ 沿用` | 0 改动，纳入回归 | 已存在，PASS |
| `test/spike/` 宪章结构与 README | `♻️ 沿用` | 沿用宪章格式与判读门槛纪律 | 已存在（wx-article-ingest） |
| `lib/host.js`/`lib/*-host.js` bundle 先例（explorer/nsw） | `♻️ 沿用` | notepad/model-selector 复制同模式 | 已存在 |
| `.env.s3` 现有桶 | `♻️ 沿用` | 只读导出样本到 compat/ | 已配置 |

### 8.3 分层与跑法

| 类型 | 跑法 / 频率 | 主要层 | 触发时机 |
|------|-------------|--------|----------|
| 短途 | `node --test <pkg>` + `node scripts/check-*.mjs`，本地/每文件改动 | unit·集成·契约·回归 | 开发中持续；每批前置 |
| spike | `test/spike/security-fix/` journey（dsh-dev live + fake S3 + page fetch + ego-browser） | e2e·live(D1) | 每 Phase 收口 |
| mega | 全量 `scripts/security-regression/` + `B5-T02/T03` 隔离安装与全 smoke | live 全链 | **本 AP 收口** |
| soak | `scripts/security-regression/` deterministic ×N（≥3） | 集成 | **退出硬闸** |

### 8.4 测试缺口（本 AP 明确不覆盖什么 + 交给谁）

- 不覆盖**平台级 CSP / iframe / worker 隔离**：非插件仓库能力（§2.2-O1）；由 dsh 核心未来提供 per-tab 身份时复审。
- 不覆盖**真实 GitHub Actions `v*` tag 端到端**：本仓库无 CI runner；`release.yml` 只能 dry-run/lint 验证（`B4-T05`），真实 attestation 待首个 tag——交**发布执行**（Phase 5 收口后由业主触发），不在本 AP 假装覆盖。
- 不覆盖**跨 OS 用户 / 公网部署威胁**：本地单用户模型（T-O-4）；非本仓库威胁面。
- 不覆盖**notepad 数据面正确性**：不迁移数据面（O3），IndexedDB/同步语义由既有 `s3-profiles`/`file-names` 测试兜底。
- 不覆盖**v0 对象的批量迁移**：T-O-8 只读兼容 + 一次性补写，非扫描式迁移（O4）。

### 8.5 测试保真（防假绿 · 刻死）

- ✅ 每个 PASS 必带**四元组** `commit + 测试/查询名 + D1 实例 + run-time(UTC)`；**计数 ≠ 价值**——`13/13 PoC 拒` 必须逐条列 fingerprint，不写「全部通过」。
- `degraded` 必带机器可读 `reason`（如 `degraded:"no-esbuild-binary"`）；`pre-existing` 失败必带 `git status`/`git log` 证据甩锅，不 silent overclaim。
- **安全 / 信任边界项**的测试必须含**攻击向量用例**（对应 §7.3 威胁模型）：P0 类每条至少 1 个「拒绝」断言 + 1 个「合法仍通」断言，不得只测 happy-path。
- **兼容性回归诚实**：`B1-T07` 若 <100% 必须记录失败样本指纹并按 T-O-14-2 最小收紧 schema，不得为了凑 100% 放宽到让 P0 失效。
- **正向/负向语料分离**：html-policy 正向（mp 快照）与负向（battery-dom）分开断言；「正向过=负向也过」不成立，必须两路各报。
- **put/get 不对称单列**：`B1-T04` 独立断言「put 任意 key 通过」，防止 schema 误收窄写入能力被当作「安全增强」误报绿。
- **PoC 重放必须带 baseline-RED + 宿主副作用 oracle**：每条 `B1-T03`/`B3-*`/`B5-T04` 的 PoC 必须先证明「该 payload 在未修代码上命中过」（引用 `.anote/security-26nov` 对应 v-\* artifacts 的 RED-baseline），断言必须是**宿主副作用级**——`workspace/`/`DSH_HOME` 外**未创建文件**、`claims/*.json` 未被覆盖、`git config` 未被写入、`document.title`/导航 oracle 未触发——**不是「没抛错」或「返回 {ok:false}」**（指向不存在路由/解析前抛错/generic 5xx 也满足，属假绿）。
- **fake S3 必须实现 etag/if-match 语义**：`B1-T05` CAS 断言要求 fake S3 `getJson` 返 etag、`putJson` 对 `if-match` 不符返回 412；「putJson 被调用过」不算 CAS 证明。
- **兼容样本下限**：`B1-T07` 样本数 ≥K（K 由宪章定，须覆盖六类对象），且样本必须**真桶导出**——禁止用实现代码自生成「兼容样本」自证。
- **`sessionBinding` 为台账元数据**：P1-02 清单的 `sessionBinding` 只落台账（审计/复核用），**无运行时强制断言**——不把它当门禁绿。
- **soak 确定性**：`B5-T05` 连跑 N 次必须 bit 级一致（同输入同拒绝）；出现 flaky 即记 `degraded` 并追查，不得以「多数通过」收口。

---

## 9. 风险、依赖与完成后状态

### 9.1 风险与依赖

| 风险 / 依赖 | 描述 | 当前判断 | 应对方式 |
|-------------|------|----------|----------|
| v1 schema 误杀存量数据 | 现有桶存在缺 `schemaVersion` 的 v0 manifest/images，严格整对象拒绝会致旧笔记失联 | `high` | T-O-14-2：`B1-T07` 存量样本 100% 兼容后才冻结 v1；v0 只读兼容 + 一次性补写 |
| `mutate-symlink` realpath = 真实行为变化 | explorer 现行「软链接当作普通条目跟随」，越界链接被拒是功能边缘变化 | `medium` | T-O-14-3：`accepted-risks.json` 登记「加固+边缘行为变化」而非「无影响」 |
| guard 单点失效 | 43 路由唯一注册入口，guard bug 影响四插件 | `high` | guard 极简无业务逻辑 + `B0-T01` 单测全覆盖 + 发布门禁 |
| regex 与 DOM renderer 不一致 | 同一语料两边剥除集不同 → 「客户端安全宿主不安全」或反之 | `medium` | 同一 `ALLOWED_*` 策略表 + 同一正/负语料 + `B3-T02`/`B3-T03` 对齐断言 |
| `/s3/object` put 误收窄 | schema 若拒任意 key → 收窄现有写入能力（功能回退） | `medium` | `B1-T04` 单列 put/get 不对称断言 |
| notepad 未打包 index.js 无法消费共享包 | dev 实例只拷 `lib/` | `medium` | T-O-13：`lib/route-guard.js`/`lib/mp-sanitize.js` bundle；schema 经 `s3-sync.js`→`lib/s3-sync-host.js`（无 shim） |
| `renewClaim` 同款 RMW 被漏 | `session-io.js:149-166` 是 `acquireClaim` 之外的第二个未防护 RMW，漏改则 CAS 覆盖不全 | `high` | P2-04 把 `acquireClaim`+`renewClaim` 一起改 `ifMatch` 条件写；`routes.js:364` lease 直拼 key 须边界拦截 |
| `.tgz` 安装依赖 `<parent>/packages/` | `file:` deps 在 dependencies 时 tarball 不自足 | `medium` | T-O-13-3：`file:` → `devDependencies`；`B5-T02` 隔离安装验收（含宿主日志无解析错 + 43 路由 smoke） |
| GitHub Actions attestation 无真实运行证据 | 仓库无 CI runner，dry-run 不能证明 tag 可重现 | `low` | `B4-T05` lint + 本地 `check-clean-lib`；真实 attestation 待首个 `v*` tag（交发布执行） |
| 存量桶样本不足代表历史分布 | `.env.s3` 桶可能不覆盖全部历史形态 | `low` | compat 语料持续扩充；v0 兼容保底 |

### 9.2 约束与前提

- **技术前提**：四个插件可独立 `npm run build` + `npm pack`；esbuild 为本地 pinned devDependency；`lib/` 产物入库且由当前源重建；`node --test` 可用。
- **运行时前提**：`dsh-dev.local` 可用于 live 验证；`dsh.local`（日常）禁重启/禁写；`.env.s3` 现有桶可只读导出样本；`context/deepseek-harness` 仅作只读参考。
- **组织协作前提**：frozen QNA 是唯一真源，本 AP 不新设 Q/A；发现冻结真相不成立则追加 `T-O-15+`。
- **上线 / 合并前提**：Phase 5 收口后由业主推送 `v*` tag 触发 release CI；本 AP 只交付到 dry-run。

### 9.3 文档同步要求

- 需要同步更新的设计文档：`docs/specs/*/README.md`（受影响插件的路由/能力描述）、`INTRODUCTION.md`（三包/分发通道段落）。
- 需要同步更新的说明文档 / README：`release.md`（`npm ci` 步骤、clean-lib、attestation 承诺落地）、四插件 `AGENTS.md`（若有能力/路由描述变化——本计划内应为零，但若 mutate-symlink 登记需同步「边缘行为变化」说明）。
- 需要同步更新的测试说明：`test/spike/security-fix/README.md`（宪章判读门槛）、`test/remote-schema/compat/README`（样本放置约定）。
- 涉及面退役时，退役清单必须覆盖代码、注释、头注、行号锚、文档句五类落点：`npx` 回退分支（四 `build-client.mjs`）、`dsh-nano-notepad/index.js` 的旧 `sanitizeMpHtml` 黑名单 regex（被 `mp-sanitize.js` 取代时同步清理注释/头注）。

### 9.4 完成后的预期状态

1. `remote-cross`（7）与 `remote→page`（6）共 13 条 P0 在宿主消费点/渲染层被 schema 校验、allowlist、转义、限额、CAS、逐跳复验收口；P0 PoC 全部失败。
2. P2 9 条：4 条零成本加固生效，5 条 accepted 登记进 `security/accepted-risks.json`（含 mutate-symlink 的「加固+边缘」标注）。
3. local-supply 2 条：esbuild 只用本地 pinned；`release.yml` + clean-lib + SHA256/attestation 使 tag 可重现、产物有 provenance。
4. `security/{route-sensitivity,feature-contract,accepted-risks}.json` + `route-inventory.md` 四份 CI 真源就位；`scripts/` 门禁脚本可本地与 CI 跑。
5. 四插件各一次 minor（→0.2.0；nsw →0.2.0）、三包 0.1.0；tarball 自足（`file:` 全部 devDeps）；功能合同证明「零功能回退」。

---

## 10. 收口（Definition of Done = 测试台账全 PASS 映射）

### 10.1 收口硬闸

所有 `mega + soak + 退出层` 测试项必须 **PASS 且四元组证据齐全**：

1. **P0 全拒**（`B5-T04`）：13 条 P0 PoC 在 fake S3 / loopback / page-fetch / ego 页面环境全部返回拒绝或不执行——逐条 fingerprint 列出。
2. **功能零回退**（`B0-T03` + `B5-T03`）：`feature-contract.json` 与代码一致（path/method/bodyLimit/UI/数据位置不变）；dsh-dev 全功能 smoke PASS。
3. **独立安装**（`B5-T02`）：`.tgz` 在无 `<parent>/packages/` 的隔离目录 `dsh plugin add` 成功并激活。
4. **存量兼容**（`B1-T07`）：现有桶导出样本（≥K、真桶导出、覆盖六类）v1 校验 100% 通过——**置于冻结 v1 规则之前**。
5. **Batch-3 门禁**（`B4-T06`）：P2 加固生效 + accepted-risks 语义断言 + explorer/nsw 功能 smoke 无回退。
6. **确定性回归**（`B5-T05`）：security-regression harness 连跑 N≥3 次结果一致。

### 10.2 收口映射表

| 收口目标 | 工作项 | Test-ID | PASS 证据（四元组）| 状态 |
|----------|--------|---------|---------------------|------|
| 基线焊死（guard/清单/合同/分发） | `P1-01`…`P1-09` | `B0-T01`…`B0-T05` | `commit + 各 check/node --test/dsh-dev smoke + run-time` | `未观察` |
| remote-cross 7 条收口 | `P2-01`…`P2-08` | `B1-T01`…`B1-T08` | `commit + PoC 全拒 + 兼容 100% + D1 + run-time` | `未观察` |
| remote→page 6 条收口 | `P3-01`…`P3-08` | `B3-T01`…`B3-T09` | `commit + 负向 0 执行 + 正向 diff 空 + D1 + run-time` | `未观察` |
| P2 处置 + supply 修复 | `P4-01`…`P4-07` | `B4-T01`…`B4-T06` | `commit + 加固/登记/构建断言 + 批次门禁 + run-time` | `未观察` |
| 发布收口（自足安装 + smoke） | `P5-01`/`P5-02`/`P5-03` | `B5-T01`/`B5-T02`/`B5-T03` | `commit + pack 一致 + 隔离安装 + 全 smoke + run-time` | `未观察` |
| 本 AP 收口（P0 全拒 + 确定性） | 全部 | `B5-T04`/`B5-T05` | `commit + 13/13 PoC 拒 + N 次一致 + D1 + run-time` | `未观察` |

### 10.3 Definition of Done

| 维度 | 完成定义 |
|------|----------|
| 功能 | `feature-contract.json` 全 PASS：43 路由 path/method/bodyLimit/UI 入口/数据位置零变化；dsh-dev 全功能 smoke PASS |
| 测试 | §8 测试台账全 PASS；`B5-T04`/`B5-T05`（mega+soak 退出硬闸）四元组齐全 |
| 文档 | `security/{route-sensitivity,feature-contract,accepted-risks}.json` + `route-inventory.md` 就位；`release.md`、四 AGENTS.md、受影响 specs/README 同步；spike 宪章判读门槛回填 |
| 风险收敛 | P0 13 条全拒（PoC）；P2 9 条加固/accepted 成文；local-supply 2 条修复；`accepted-risks.json` 可每 release 复核 |
| 可交付性 | 七 `package.json` 版本就绪；`.tgz` 隔离安装激活；`.github/workflows/release.yml` dry-run 通过；回滚 = 安装前一版本（无数据迁移） |

### 10.4 NOT-成功识别

任一退出硬闸测试 `degraded / 未观察` ⇒ **不得标 `executed`**；按 closure 五态（`verified / observed-OK-at-closure / partial / 未观察 / deferred`）如实归类 + handoff。特别地：

- `B1-T07` 兼容率 <100% ⇒ Batch 1 不得进入 Batch 2；按 T-O-14-2 最小收紧 schema 后重跑，仍不达标则回 QNA。
- `B5-T02` 隔离安装失败 ⇒ 分发通道（T-O-13）未净，不得发版。
- `B5-T04` 任一 P0 PoC 仍可执行 ⇒ 对应批次返工，不得收口。
- `release.yml` 无真实 tag 运行 ⇒ `B4-T05` 只能标 `observed-OK-at-closure`（dry-run），attestation 的真实验证在交接中标注为「待首个 v\* tag」。

---

## 附录 · 修订记录（对抗审查 STEP.6→STEP.7）

> STEP.6 两位对抗审查员对 `draft` v0 各出一份报告，均 `REQUEST-CHANGES`；本附录记录合并后 v1 修订如何逐条落实。报告路径：`.anote/reviews/security-fix/26-nov/5842/test-antifraud-review.md`、`.anote/reviews/security-fix/26-nov/7317/qna-compliance-review.md`。

### QNA 审查（7317）1 blocker + 5 major

| 发现 | 处置 |
|------|------|
| **A1 BLOCKER** `session-meta`/`marker` 白名单按想象字段编写，与现写 15 字段 + `formatVersion:4`/`title/pathHint/createdAt/createdBy` 不符 → B1-T07 必挂 | P2-01/P2-04 schema 改为**按现写字面**白名单（`v:1`+`formatVersion:4`+15 字段；marker 补 `title/pathHint/createdAt/createdBy`），`createdBy` 成为 P2-03 绑定输入 |
| **A2** `routes.js` 未列入 Phase 2，`/workspaces/join`、`/sessions/{claim,heartbeat,lease}`、`/materialize` 的 `body.sessionId`/`workspaceId` 无边界校验（`lease`:364 直拼 key 绕过 session-io）；`renewClaim:149-166` 漏列 | P2-03/04/06 修改文件加入 `routes.js:224-234,296-373,447-470`，边界 charset+消费点双层；`renewClaim` 纳入 session-io 区间 `:132-166` |
| **A3** P4-01/02 落点在 `mutate.js`（真实现层，`assertInside`:44 词法）而非 `routes.js`；`git.js:424-429` 是 `ignoredAmong` 而非 `git add --all` | P4-01/02 改指 `mutate.js:44-46,55-285`；A-7 锚点更正 `git.js:382-384`（`commitAll`→`runGit`:108-122） |
| **A4** bodyLimit「其余默认 64KiB」违反 T-O-14-1（`/read`/`/fetch-mp` 实为 `jsonBody` 默认=8MB） | P1-03 bodyLimit 逐路由写全、删兜底默认（save/read/fetch-mp=8MB、s3*=32MB、explorer/nsw=64KiB、media-engine PUT=16384B） |
| **A5** 「每 path+method 一行」与「43 行」矛盾（path+method≥44） | P1-02/P1-03 定为**每注册路由一行、`methods` 列**，43=路径数 |
| **A6** `lib/schema-shim.js` 幻影产物；真消费者是 `s3-sync.js`→`lib/s3-sync-host.js` | P2-02/P1-04/S6 删 schema-shim，改 `s3-sync.js` import + 既有 s3-sync-host bundle |

### 反欺诈审查（5842）3 blocker + 9 major + 2 minor

| 发现 | 处置 |
|------|------|
| **B1 BLOCKER** PoC 重放仅断言 `{ok:false}` 无 baseline-RED + 宿主副作用 oracle | §8.5 刻死：PoC 须引 `.anote/security-26nov` RED-baseline + 副作用 oracle（fs/S3-key/claims/spawn/DOM 未发生），`reason:'schema'`/`'route-not-listed'` 区分 generic 错误 |
| **B2 BLOCKER** `node --check` 不解析模块，对 bare import 无判定力 | `B0-T04`+P1-04 改为 **AST/源码静态断言**（import specifier ∉ 共享包名） |
| **B3 BLOCKER** §10.1 缺 Batch-3 硬闸（T-O-10-1） | 新增 `B4-T06` 批次门禁并入 §8.1/§10.1/§10.2 |
| M1 `B1-T07` 兼容样本自生成自证 + 无下限 | 定为 v1-freeze 前置闸、样本真桶导出 + N≥K 覆盖六类 |
| M2 fake S3 无 etag/if-match，`B1-T05` CAS 恒过 | `B1-T05` 要求 fake S3 实现 etag/if-match；`renewClaim` 并入 P2-04 CAS |
| M3 `B1-T03` 计数断言、`B5-T04` 未点名 13 fingerprint | `B1-T03` 拆 per-fingerprint 子断言；`B5-T04` 点名 13 |
| M4 `B3-T02/03/08` 语料缺向量（`textarea`/`vbscript:`/`file:` 0 命中） | 补向量 + 向量覆盖表逐族断言（`battery-dom` 缺族补入） |
| M5 marker schema 缺 `workspaceId`/member-key charset | A1 一并修正：`workspaceId` 16-hex/v0 字符集、member-key `^[A-Za-z0-9_-]{1,128}$` + `".."` 拒绝用例 |
| M6 `B4-T03` 仅字段齐 | 改**语义断言**（fingerprint 覆盖、disposition 分类、mutate-symlink=「加固+边缘」） |
| M7 `B5-T02` 无宿主日志/路由 smoke、`file:` devDep 未验证 | `B5-T02` 加「宿主日志无解析错 + 隔离实例 43 路由 smoke + `dsh plugin add` 对 file: devDep 不运行解析」 |
| M8 `sessionBinding` 运行时强制歧义 | §8.5 刻死 `sessionBinding` 为台账元数据、无运行时断言 |
| M9 `B3-T05` 无正向保留断言 | `B3-T05` 加正向 render 断言（`data-*` 不被过度剥除） |
| m1 `lib/` rebuild 位级一致 | `B4-T05` 加 rebuild-diff 空 |
| m2 baked route 常量 ↔ JSON 一致性 | `B0-T05`/`P1-05` 双断言 |

### 顺带更正（审查中核出的次要不一致）

- §0 严重度分布 `18/5/1` → **`16 high/6 medium/2 low`**（audit §4 实为 16/6/2）。
- 新增锚 `A-8b`（nsw `routes.js:224-234,296-373,447-470` 边界）、`A-8c`（`mutate.js:44-46,55-285`）、`A-8d`（`routes.js:384-399` `/list`=audit #15 另一半）。
- `A-8` `/settings` 三方法 → **四方法**、区间至 `:179`；`A-9` `session-io` 区间补 `:132-166`（含 `renewClaim`）。
- §5.2/5.3 对应台账补 `B1-T08`/`B3-T09`；Phase-3「并行可行」改「可并行开发、不可先行收口」。
- §9.1 加 `renewClaim` 漏改风险行；`schema-shim` 风险行改指 `s3-sync.js`→`s3-sync-host.js`。

---

*（§11 执行日志回填仅 `executed` 状态使用，本 `draft` 版从略）*
