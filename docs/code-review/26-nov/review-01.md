# Nano-Agent 代码审查报告

> 审查对象: `dsh-nano-notepad` / `dsh-nano-model-selector` / `dsh-nano-explorer-extra`（三个 dsh overlay 插件）
> 审查类型: `code-review`
> 审查时间: `2026-11-09`
> 审查人: `DeepSeek Harness review agent（三路并行子代理 + 主审查独立二次复核）`
> 审查范围:
> - `dsh-nano-notepad/` — `index.js`（host）、`src/client/*`（db/i18n/index/markdown/panel）、`lib/`、`package.json`、`cordis.patch.yml`、`scripts/build-client.mjs`
> - `dsh-nano-model-selector/` — `index.js`（host）、`src/client/*`（jsx/favorites/i18n/icons/BrandMark/styles）、`lib/`、`package.json`、`cordis.patch.yml`、`scripts/build-client.mjs`
> - `dsh-nano-explorer-extra/` — `index.js`、`src/host/*`（entry/git/listing/mutate/routes/stats）、`src/client/*`、`lib/`、`package.json`、`cordis.patch.yml`、`scripts/build-client.mjs`
> 对照真相:
> - dsh 官方插件契约（`package.json` `exports`/`dsh.*` 字段、`cordis.patch.yml`、host `name/inject/Config/apply`、client `__ModuleLoader__.load` 工厂、`ctx` 服务注入、`webServer` 路由鉴权）
> - `dsh-nano-explorer-extra/context/spec.md`（该插件规格）
> - `release.md`（发布信任链规范）
> 文档状态: `changes-requested`

---

## 0. 总结结论

> 三个插件的**机制骨架与大部分工程实现是对的**，但 `dsh-nano-notepad` 存在**未授权远程命令执行（RCE）**，`dsh-nano-explorer-extra` 存在**发包即坏（缺 `lib/host.js`）**——当前不应标记为 completed，也不能发布。

- **整体判断**：机制与客户端工程整体合规且性能基线良好，但 notepad 的 `/save` 路由构成「未授权 + AppleScript 注入」双 critical，explorer-extra 发包即坏 + `..` 越界写，必须先修再谈收口。
- **结论等级**：`changes-requested`
- **是否允许关闭本轮 review**：`no`
- **本轮最关键的 1-3 个判断**：
  1. `dsh-nano-notepad` 的 `/nano-notepad/save` 既无 `ctx.connection` 鉴权闸，又把 `body.name` 拼进 `osascript` 脚本（`asString` 转义错误），构成**未授权远程命令执行**——已实证写入任意文件，是发布硬阻断。
  2. `dsh-nano-explorer-extra` 的 `package.json` `files` 漏掉 `lib/host.js`（`index.js` 依赖它），npm 发包后直接 `ERR_MODULE_NOT_FOUND`；`absoluteOf`/`isLexicallyInside` 不解析 `..`，写路径可越出 workspace。
  3. 三者机制形态（client 工厂、exports、`ctx.effect`+`webServer.register`、explorer-extra 的 `ctx.subprocess`+`sandbox.confine`）均与官方一致；`notepad`/`model-selector` 用绝对路径作 patch `name` 属 dev-only，不可分发。

---

## 1. 审查方法与已核实事实

> 本节只写事实。三路子代理（安全 / 机制合规 / 性能）各对三个插件做静态审查后，主审查对每条关键结论**独立复核**：凡涉 critical 的安全项均在本机实证（不采信子代理单方结论）。

- **对照文档**：
  - 官方基线包 `…/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-*/lib/index.js`（client-connection / host-webserver / client-modules / llm / fs-local / subprocess / client-ui-* / ui-renderer / sidebar-right / directory-picker-native）
  - 参考源码 `context/deepseek-harness/packages/*`、`cordis/lib/index.js`
  - 本仓库 `release.md`、`dsh-nano-explorer-extra/context/spec.md`
- **核查实现**：三插件全部 `index.js`、`src/**`、`lib/*.js`、`package.json`、`cordis.patch.yml`、`scripts/build-client.mjs`
- **执行过的验证**：
  - `osascript` 注入实证：构造 `x" & (do shell script (ASCII character …)) --` payload，绕过引号破坏后 `do shell script` 在「存储为」对话框出现**之前**执行，写入 `/tmp/dsh_pwn_final`（已复现并清理）
  - `node` 复现 `absoluteOf`/`isLexicallyInside`：`absoluteOf('/ws','../etc')` → `/ws/../etc`，`isLexicallyInside` 返回 `true`（`..` 未规范化）
  - `grep` 全量扫描 XSS sink（`innerHTML`/`dangerouslySetInnerHTML`/`eval`/`document.write`）与存储/网络（`localStorage`/`fetch`/`createObjectURL`/`IndexedDB`）
  - `ls`/`awk` 实测 `lib/*.js` 体积与最长行（确认未压缩）、`logos/*.png` dataurl 内联体积
  - 读 `cordis` `Context.get(name)` 源码（lib/index.js:1347）确认其**不强制 inject**，返回 `undefined` 而非抛错
  - 读 `dsh-host-webserver` `register`/`serveResource`（lib/index.js:375-471）确认 `webServer.register` **本身不鉴权**
  - 读 `dsh-client-connection` `requestRejection`/`admit`（lib/index.js:737-749）确认其是 Host/Origin fence + Peer 认证闸
- **复用 / 对照的既有审查**：
  - 三路子代理报告（安全 SEC-1..5、机制 MECH-1..8、性能 PERF-1..14）— 已**逐条独立复核**；SEC-2 RCE 经本机实证，PERF-1/2/3/4/6、SEC-1/4/5、MECH-1/2/4 经源码行号核实，均采纳；个别结论已按复核修正严重度或适用范围。

### 1.1 已确认的正面事实

- **三插件 client 工厂形态、exports 映射、`dsh.client.platform:'web'`、`dsh.bundle.patch`、`engines.dsh`、`Config['~standard']`、`ctx.effect(()=>ctx.webServer.register(...))` 全部与官方一致**（对照 `dsh-client-ui-model-selection`、`dsh-client-connection` 等）。
- **`dsh-nano-explorer-extra` 六条路由全部经 `connection().requestRejection(req)` 鉴权**（routes.js:254），含 Host/Origin fence 与 Peer 认证；写操作 `createFile`/`createFolder`/`rename` 有 `assertInside` 词法界校验，`git` 全部 argv 数组无 shell、`env` 墓碑化、`core.hooksPath=/dev/null`、`stdout/stderr` 有 `maxBytes`、AbortSignal 超时——官方级用法。
- **客户端资源卫生良好**：事件监听/定时器均有 cleanup（notepad `ctx.effect` 移除 keydown/keyup、model-selector `useEffect` 移除 pointerdown/resize、explorer `clearTimeout` on unmount）；`URL.createObjectURL` 5s 后 `revokeObjectURL`；IndexedDB 有索引与 `versionLimit`/`imageLimitBytes` 上限；`localStorage` 仅存非敏感 prefs/favorites 且命名空间化。
- **explorer-extra 性能设计合理**：无轮询（git/stats 按需 + 2000ms 防抖）、`stats.js` 异步遍历有 `statsMaxDepth/MaxEntries` 界且每 200 条 `setImmediate` 让出事件循环、`/status?only=stats` 拆分让分支行不等全树遍历、`ignoredAmong` 走 stdin 且失败开放、`tree.js` 列目录有缓存与 `maxEntries` 截断。
- **notepad `markdown.js` 输出全部 `escapeHtml`**，URL 白名单 `https?://`/`data:`，`<a>` 带 `target=_blank rel=noreferrer`，无 `javascript:` sink；`model-selector` 全部 React 转义，`dangerouslySetInnerHTML` 仅用于打包内联的静态 SVG（无用户数据）。

### 1.2 已确认的负面事实

- **`dsh-nano-notepad` `/save` 无任何鉴权**（index.js:99-112，仅 `webServer.register`，未读 `connection`），且 `nativeSave` 把 `body.name` 经 `asString` 拼入 `osascript` 脚本——`asString` 产生 `\\"`，使 `"` 提前闭合字符串字面量，**可注入并在弹窗求值阶段执行任意 `do shell script`**（本机实证，写文件成功）。未授权远程 RCE。
- **`dsh-nano-model-selector` `/catalog` 无鉴权**（index.js:92-96，`resource` 路由无 `requestRejection`）——可读泄露 provider/model 目录。
- **`dsh-nano-explorer-extra` `absoluteOf`/`isLexicallyInside` 不规范化 `..`**（listing.js:104-130），`createFile`/`createFolder`/`rename` 的目标父目录在 `danger-full-access` 下可越出 workspace；`files` 漏 `lib/host.js` 导致发包即坏；`ctx.get('sessionPersistence')` 未在 `inject` 声明 → 冷会话恒 `unknown session`。
- **`notepad`/`model-selector` `cordis.patch.yml` 用绝对路径作 `name`**（dev-only，不可分发）；notepad 用裸 `node:child_process`+`node:fs` 绕过 `ctx.subprocess`/`ctx.fs` 沙箱缝。
- **model-selector catalog 每请求串行 `listProviders→listModels→resolveModelInfo` 且无缓存**（index.js:54-67，O(P+M) 串行 await + `no-store`）；客户端每次开面板 + `onClick` 双次拉取。

### 1.3 证据可信度说明

| 证据类型 | 本轮是否使用 | 说明 |
|----------|--------------|------|
| 文件 / 行号核查 | `yes` | 全部 finding 均附源码 `file:line`，关键项对照官方基线 `file:line` |
| 本地命令 / 测试 | `yes` | `osascript`/`osacompile` 实证 RCE；`node` 复现 `..` 越界；`grep`/`ls`/`awk` 测 bundle 体积与 sink |
| schema / contract 反向校验 | `yes` | `cordis` `Context.get`/`webServer.register`/`requestRejection`/`Config['~standard']` 契约逐字核对 |
| live / deploy / preview 证据 | `no` | 静态审查 + 本机 osascript 复现；未在 dsh-dev 实例运行时触发（RCE 已在等效 `osascript` 环境实证） |
| 与上游 design / QNA 对账 | `yes` | 对照 `dsh-nano-explorer-extra/context/spec.md` 与官方插件 manifest/路由契约 |

---

## 2. 审查发现

> 只列影响 correctness / security / scope / delivery 的问题。严重级别综合三路子代理结论与主审查复核。

### 2.1 Finding 汇总表

| 编号 | 标题 | 严重级别 | 类型 | 是否 blocker | 建议处理 |
|------|------|----------|------|--------------|----------|
| R1 | notepad `/save` 路由无鉴权 | `critical` | security | yes | 加 `connection().requestRejection` 闸 + 校验 method/content-type |
| R2 | `nativeSave` AppleScript 注入 → 未授权 RCE | `critical` | security | yes | 改 `osascript -e <script> <name>` argv 传参，不再内联拼接 |
| R3 | explorer-extra `files` 漏 `lib/host.js` | `high` | delivery-gap | yes | `files` 加 `"lib/host.js"`（或 `"lib"`） |
| R4 | explorer-extra `..` 未规范化可越 workspace 写 | `medium` | security | no | `absoluteOf` 解析 `..`/`.` 后再做 `isLexicallyInside` |
| R5 | explorer-extra 读未声明服务 `sessionPersistence` | `medium` | correctness | no | `inject` 补 `sessionPersistence`；修正注释 |
| R6 | notepad/model-selector patch 用绝对路径 `name` | `high` | platform-fitness | no | 改包名 `name`；绝对路径仅留 dev overlay |
| R7 | notepad 裸 `node:child_process`/`node:fs` 绕过平台缝 | `medium` | platform-fitness | no | 走 `ctx.subprocess`/`runNativeCommand`+`ctx.fs`，`inject` 补声明 |
| R8 | model-selector catalog 每请求串行重建且无缓存 | `medium` | correctness | no | `Promise.all` 并行 + 事件失效缓存 + 去 `generatedAt` |
| R9 | 客户端 `dsh.client.inject` 漏声明服务提供方 | `medium` | protocol-drift | no | 补齐 `sessions`/`locale`/`theme`/`workspaces` 等 provider 包 |
| R10 | notepad 渲染路径每帧重解析 markdown + 重建 innerHTML | `medium` | correctness | no | 按 (file,draft) 缓存渲染结果；树分组 O(N²)→Map |
| R11 | model-selector catalog GET 无鉴权（信息泄露） | `low` | security | no | 同 R1 加 `requestRejection` |
| R12 | bundle 未压缩 + `npx --yes esbuild@0.25.0` 未锁 | `low` | delivery-gap | no | `--minify`；构建期固定 esbuild 版本（见 release.md） |
| R13 | model-selector `priority:-1` 死字段 + 缺 label 子座 | `low` | protocol-drift | no | 用 `order`/注册序；补 `conversation.input.model.label` |
| R14 | explorer-extra 客户端直连 `/open-in-app/*` 路由耦合 | `low` | platform-fitness | no | 经该插件 slot 控制器面或隔离降级 |

### R1. `dsh-nano-notepad` `/nano-notepad/save` 无鉴权闸

- **严重级别**：`critical`
- **类型**：`security`
- **是否 blocker**：`yes`
- **事实依据**：
  - `dsh-nano-notepad/index.js:99-112` 用 `ctx.webServer.register({kind:'exact',path:SAVE_ROUTE,handler})`，`inject=['webServer']`（index.js:4）**未注入 `connection`**，handler 内无 `requestRejection`/`authorizeIndex`。
  - `dsh-host-webserver/lib/index.js:460-471` 确认 `webServer.register` 只做路由分发，**自身不鉴权**。
  - 对照 `dsh-nano-explorer-extra/src/host/routes.js:254` `connection().requestRejection(req)` 与官方 `dsh-client-connection` `admit`（lib/index.js:742-749：Host/Origin fence + Peer 认证）。
- **为什么重要**：GUI 监听在 localhost/LAN，未授权路由可被**任意网页**（`no-cors` POST，body 不校验 content-type 仍可解析）或局域网客户端直接调用，触发 `osascript` 弹「存储为」对话框并写入 `body.content` 到所选路径——是 R2 的前提，独立看也是 DoS/钓鱼面。
- **审查判断**：成立。explorer-extra 已示范正确做法，此插件漏接，属遗漏而非有意豁免。
- **建议修法**：`inject` 加 `connection`；handler 首行 `const rej = ctx.get('connection')?.requestRejection(req); if (rej !== undefined) { res.statusCode = rej; res.end(); return }`；并校验 `req.method==='POST'` 与 `content-type` 为 `application/json`。

### R2. `nativeSave` AppleScript 字符串注入 → 未授权远程命令执行

- **严重级别**：`critical`
- **类型**：`security`
- **是否 blocker**：`yes`
- **事实依据**：
  - `dsh-nano-notepad/index.js:71` `asString` = `JSON.stringify(s).slice(1,-1).replace(/"/g,'\\"')`：对内部 `"` 先 JSON 转义成 `\"`，再对每个 `"` 前置 `\`，产出 `\\"`。
  - `index.js:78` 把结果内联进 `default name "…"`，经 `execFile('/usr/bin/osascript',['-e',script])` 执行。
  - **本机实证**：payload `x" & (do shell script (ASCII character …)) --` 使 `\\` 归约为字面 `\`、随后 `"` 闭合字符串，`do shell script` 在「存储为」对话框弹出**之前**执行，成功写入 `/tmp/dsh_pwn_final`；`--` 注释掉模板自带的收尾 `"` 使脚本合法编译（`osacompile` 返回 0）。
- **为什么重要**：叠加 R1 的无鉴权，构成**无需任何用户交互即可由局域网/网页触发的远程命令执行**，以 dsh 宿主用户身份跑任意 shell。这是发布级硬阻断。
- **审查判断**：成立且已实证（子代理结论经主审查在本机复现确认，非单方采信）。
- **建议修法**：不再内联拼接——`osascript -e '<script>' <name>` 用 argv 传名（脚本内 `on run argv … item 1 of argv`）；或在 AppleScript 侧用系统方式取安全名。务必同时完成 R1 鉴权，否则修复后仍可被远程触发弹窗。

### R3. `dsh-nano-explorer-extra` `package.json` `files` 漏 `lib/host.js`

- **严重级别**：`high`
- **类型**：`delivery-gap`
- **是否 blocker**：`yes`（对「发布」这一动作）
- **事实依据**：
  - `dsh-nano-explorer-extra/index.js:3` `export { Config, apply, inject, name } from './lib/host.js'`。
  - `package.json:18-24` `files` 仅含 `index.js / cordis.patch.yml / icon.svg / locale / lib/client.js`，**无 `lib/host.js`**。
  - 对照官方 bundle `files` 含全部入口（如 `dsh-experimental-session-titles-bundle` 含 `lib/index.js`）。
- **为什么重要**：`npm pack` 会丢弃 `lib/host.js`，安装后 `import` 立即 `ERR_MODULE_NOT_FOUND`，插件无法启动——发包即坏。
- **审查判断**：成立。本地用绝对/链接路径时文件齐全，故本地能跑、问题被掩盖；按 `release.md` 走 npm 分发必现。
- **建议修法**：`files` 加 `"lib/host.js"`（或直接 `"lib"`），并用 `npm pack --dry-run` 在 CI 校验产物清单（与 release.md 的打包规范对齐）。

### R4. `absoluteOf`/`isLexicallyInside` 不规范化 `..`，写路径可越 workspace

- **严重级别**：`medium`
- **类型**：`security`
- **是否 blocker**：`no`
- **事实依据**：
  - `dsh-nano-explorer-extra/src/host/listing.js:104-130` `absoluteOf` 仅做分隔符归一与前缀拼接，**不折叠 `..`/`.`**；`isLexicallyInside` 是词法前缀比较。
  - 复现：`absoluteOf('/ws','../etc')` → `/ws/../etc`，`isLexicallyInside('/ws','/ws/../etc')` → `true`（绕过 `mutate.js:30-32 assertInside`）。
  - `mutate.js:44-46 createFile` / `105-110 createFolder` / `68-71 rename` 用 `absoluteOf(workspaceRoot, directory|path)` 定位父目录，`assertInside` 仅词法检查，`fs.resolve` 再 realpath 出 workspace。
  - 路由仍受 `requestRejection` 鉴权（routes.js:254）——属「已认证会话内越权写」，非匿名。
- **为什么重要**：在 `danger-full-access`（本开发/日常实例策略）下，`../x` 会把 create/rename/mv 落到 workspace 之外；`workspace-write` 沙箱策略靠 canonicalization 仍可拦截，故是**部分策略下的纵深缺口**。
- **审查判断**：成立，但需鉴权会话 + 特定沙箱模式，故列 medium 而非 critical。
- **建议修法**：`absoluteOf` 先用 `path.posix.normalize`（或等价）折叠 `..`/`.` 再做 `isLexicallyInside`；对 `createFolder`/`rename` 的 `runExternal` argv 同样在 normalize 后校验；`/list` 侧 `outside` 判定保持现状（读已允许出界是产品功能）。

### R5. `explorer-extra` 读取未声明服务 `sessionPersistence` → 冷会话恒失败

- **严重级别**：`medium`
- **类型**：`correctness`
- **是否 blocker**：`no`
- **事实依据**：
  - `src/host/entry.js:9` `inject=['fs','sessions','webServer','subprocess','sandbox','sandboxPolicy','connection']`，**无 `sessionPersistence`**。
  - `src/host/routes.js:62` `ctx.get('sessionPersistence')?.stat(sessionId)`；`cordis` `Context.get(name,strict)`（lib/index.js:1347-1349）**不强制 inject**，未提供时返回 `undefined` 而非抛错（routes.js 注释「未声明即抛错」错误）。
  - 因此 `live===undefined` 的冷会话：`header` 恒 `undefined` → 抛 `unknown session`，冷会话 explorer 功能不可用。
- **为什么重要**：功能 bug + 误导性注释；`ctx.get` 免 inject 读是平台设计，但依赖了「服务此刻已就绪」的隐式时序，脆。
- **审查判断**：成立。热路径（live session）正常掩盖了它。
- **建议修法**：`inject` 补 `sessionPersistence`（使其纳入生命周期等待），或对该读取做存在性兜底并删除误导注释。

### R6. `notepad`/`model-selector` `cordis.patch.yml` 用绝对路径作 `name`

- **严重级别**：`high`
- **类型**：`platform-fitness`
- **是否 blocker**：`no`
- **事实依据**：
  - `dsh-nano-notepad/cordis.patch.yml:4` 与 `dsh-nano-model-selector/cordis.patch.yml:4`：`name: /Users/seanz/Documents/dsh-plugins/…/index.js`。
  - 绝对路径**能被解析**（`dsh-app-boot/lib/index.js:4875` `isAbsolute→pathToFileURL`，`:4718-4725` 锚定），故本机可用；但官方 bundle 一律用**包名**（如 `name:'@deepseek-ai/dsh-action-cards'`），`explorer-extra` 也正确用 `name: dsh-nano-explorer-extra`。
- **为什么重要**：硬编码开发者机器绝对路径，随包分发后在他人机器/CI 必失效；与 release.md 的「release 用包名」约定冲突。
- **审查判断**：成立。属 dev-only 写法混进了要分发的 bundle patch。
- **建议修法**：`name` 改包名；绝对路径只放本机 dev profile overlay（如 `.local-dsh-setup.md` 管理的开发实例），不进发布产物。

### R7. `notepad` 裸 `node:child_process`/`node:fs` 绕过平台子进程与文件缝

- **严重级别**：`medium`
- **类型**：`platform-fitness`
- **是否 blocker**：`no`
- **事实依据**：
  - `index.js:79` `import('node:child_process').then(({execFile})=>execFile('/usr/bin/osascript',…))`，`index.js:85` `import('node:fs/promises')` 直接 `writeFile`。
  - `inject=['webServer']` 未声明 `subprocess`/`fs`。对照官方 `dsh-host-directory-picker-native` 走 `runNativeCommand`（`dsh-native-command`）调 `osascript`，受限文件写走 `ctx.fs`。
- **为什么重要**：绕过了 `ctx.subprocess`/`ctx.sandbox.confine` 的统一缝（超时、`maxBytes`、沙箱约束、可观测性），在受约束宿主下不可用，也放大了 R2 的注入后果（无 confine）。
- **审查判断**：成立，与 R2 同源——裸 `execFile` 既是机制违规也是注入温床。
- **建议修法**：改用 `ctx.subprocess`/`runNativeCommand` 弹对话框、`ctx.fs.writeText` 落盘，`inject` 补 `subprocess`/`fs`；顺带获得沙箱 confine 与统一诊断。

### R8. `model-selector` catalog 每请求串行重建且无缓存

- **严重级别**：`medium`
- **类型**：`correctness`
- **是否 blocker**：`no`
- **事实依据**：
  - `index.js:54-67` `buildCatalog`：`for provider→await listModels→await groupOf`，`groupOf` 内逐 model `await resolveModelInfo`——**全串行**，每请求 `1+P+Σmodels` 次 await；`:76` `cache-control:no-store` 且无 memo，`generatedAt:Date.now()` 使 JSON 也无法复用。
  - `resolveModelInfo` 经 service façade 转发到 adapter（deepseek 适配器每 model 一次 `credential(url)` + SHA256 scope hash）。
  - 客户端 `ModelSelector.jsx:152` 每开面板拉一次、`:416 onClick` 又调 `load()`，`:159 refreshDetails` 无防抖——每次打开触发 host 全量重建。
- **为什么重要**：数十 model 时每次打开面板 = 数十次串行凭证/元数据跳转，面板首屏被拖慢且放大 host 负载。
- **审查判断**：成立（子代理结论经行号核实）。
- **建议修法**：`Promise.all` 并行 provider 与 model；缓存构建结果并以 `llm/models-updated` 事件失效，去掉 `generatedAt`；客户端缓存 `details` 或加 TTL。

### R9. 客户端 `dsh.client.inject` 漏声明服务提供方

- **严重级别**：`medium`
- **类型**：`protocol-drift`
- **是否 blocker**：`no`
- **事实依据**：
  - `dsh-nano-notepad/src/client/index.js:7` `inject=['slots','shortcuts','theme','locale','workspaces','sessions']`，但 `package.json` `dsh.client.inject` 只列 `dsh-client-ui-layout`+`dsh-client-shortcuts`——`workspaces`(api-workspace-controller)/`sessions`(api-session-controller)/`theme`(client-ui-theme)/`locale`(client-locale) 提供方**均未声明**。
  - `dsh-nano-model-selector/src/client/index.jsx:6` `inject=['slots','modelDirectories','sessions','locale']`，`dsh.client.inject` 只列 `dsh-client-ui-conversation`+`dsh-client-ui-model-selection`——`sessions`/`locale` 提供方未声明（`modelDirectories` 由 ui-model-selection 提供，已声明）。
  - 官方 manifest 会列出注入服务的全部提供方包（如 ui-model-selection 声明 session-controller/locale/commands/api-remotes）。能跑仅因这些包在 web profile 里是 ambient。
- **为什么重要**：在缺少相应包的 profile 下注入永不解析，插件静默不激活；依赖了隐式环境而非显式契约。
- **审查判断**：成立（notepad 由子代理提出，model-selector 主审查补充核实同样漏 `sessions`/`locale`）。
- **建议修法**：按各 client `inject` 数组补齐对应 `@deepseek-ai/dsh-api-*` / `dsh-client-*` provider 包名到 `dsh.client.inject`。

### R10. `notepad` 渲染路径每帧重解析 markdown 并重建 innerHTML

- **严重级别**：`medium`
- **类型**：`correctness`（性能）
- **是否 blocker**：`no`
- **事实依据**：
  - `src/client/panel.js:776-778` `renderBody` 每次 `render()` 都 `imagesById(state.db, imageIdsIn(markdown))` + `renderMarkdown`，`read.innerHTML=` 整体替换；`render()` 被树切换/tab/折叠/工作区切换/主题/locale/resize 等几乎全部交互触发（`panel.js:821-848`）。
  - `panel.js:686-713` `renderTree` 用 `state.nodes.filter(parentId===x)` 递归（O(N²)）+ 全量 `innerHTML` 重建 + `requestAnimationFrame` 内逐行 `scrollWidth>clientWidth`/`getBoundingClientRect` 强制同步布局。
  - `markdown.js:86` 图片以 `data:...;base64` 内联，每次渲染浏览器重解码全部 base64 图。
  - 存储侧 `db.js:449-456` `storeImage` 在主线程对整 blob 做 hex→base64（5–20MB 图阻塞 ~100–500ms），IDB 存 base64 字符串（1.33× 体积）。
- **为什么重要**：含图笔记每次交互都重建 `<img src=data:…>` 并重解码，重交互下主线程明显抖动；属真实热路径而非微优化。
- **审查判断**：成立（子代理结论经行号核实）。
- **建议修法**：按 `(fileId, draftVersion)` 缓存渲染 HTML；树按 parentId 建 Map 一次分组；图以 Blob 存 IDB + `createObjectURL`/`revokeObjectURL`，或至少 `FileReader.readAsDataURL` 移出热路径；`innerHTML` 改增量更新。

### R11. `model-selector` `/catalog` GET 无鉴权（目录信息泄露）

- **严重级别**：`low`
- **类型**：`security`
- **是否 blocker**：`no`
- **事实依据**：
  - `index.js:92-96` `webServer.register({kind:'exact',path:ROUTE,resource:()=>catalogResponse(ctx)})`，无 `requestRejection`/`authorizeIndex`；`resource` 路由同样不自带鉴权。
  - 泄露面为 provider/model 目录（id/name/description/contextWindow 等），无凭证/密钥。
- **为什么重要**：信息泄露面低，但与 R1 同源——同一台宿主上未授权方也能读取配置指纹；一致性上应与 explorer-extra 一样上闸。
- **审查判断**：成立，单独列 low（读-only、无敏感数据）。
- **建议修法**：同 R1，在 `resource` 内先 `connection().requestRejection(request)`（resource 签名可接 `req`/`peer`），返回 `new Response(null,{status:rej})`。

### R12. bundle 未压缩 + `npx --yes esbuild@0.25.0` 构建期未锁定

- **严重级别**：`low`
- **类型**：`delivery-gap`
- **是否 blocker**：`no`
- **事实依据**：
  - `lib/client.js`：notepad 162,914B / model-selector 72,526B / explorer 81,145B，esbuild 均**未加 `--minify`**（最长行数百~千余字符，非单行产物）；explorer host `lib/host.js` 26,808B。
  - 三者 `scripts/build-client.mjs` 均 `spawnSync('npx',['--yes','esbuild@0.25.0',…])`——构建时下载，未锁 hash/lockfile。
- **为什么重要**：未压缩增加加载与热更体量（notepad 约可省 ~40%）；`npx --yes` 每次构建拉取是可被供应链利用的漂移点（release.md 已要求锁定构建工具）。
- **审查判断**：成立，但本地开发插件属低优先；release 流程应约束。
- **建议修法**：esbuild 加 `--minify`（客户端）；把 esbuild 固定为 devDependency + lockfile，弃 `npx --yes` 现场拉取。

### R13. `model-selector` `priority:-1` 死字段 + 缺 `conversation.input.model.label` 子座

- **严重级别**：`low`
- **类型**：`protocol-drift`
- **是否 blocker**：`no`
- **事实依据**：
  - `src/client/index.jsx:17` `ctx.slots.register({name:'conversation.input.model', priority:-1, registrant:…})`。
  - SlotRegistry 无 `priority` 选项——列表项按 `options.order ?? 0`（`dsh-client-ui-renderer/lib/client.js:1206,1218`），单座选举靠**注册序 shadow**；官方座不带 priority（`dsh-client-ui-model-selection/lib/client.js:2064`）。故 `-1` 无效，接管靠后注册 shadow（隐式机制）。
  - 官方注册还声明 `conversation.input.model.label` 子座（`:2067`），本插件未声明 → label 子座为空。
- **为什么重要**：功能上接管能成功，但靠 shadow 序而非显式 override 字段，属未文档化的隐式机制，且漏了 label 子座（UI 可能缺标签）。
- **审查判断**：成立（低）。接管意图是对的，实现靠了隐式序。
- **建议修法**：`priority` 改 `order`（或确认注册序即语义）；补 `conversation.input.model.label` 子座以与官方对齐。

### R14. `explorer-extra` 客户端直连 `/open-in-app/*` 路由

- **严重级别**：`low`
- **类型**：`platform-fitness`
- **是否 blocker**：`no`
- **事实依据**：
  - `src/client/body.js:235,252` `fetch('/open-in-app/apps')`/`fetch('/open-in-app/open')`。
  - 该路由属 `dsh-client-ui-open-in-app`，对外只暴露 slot 注入的控制器面（`openInAppApps/openInAppChoice/openInAppLaunch`，`dsh-client-ui-open-in-app/lib/client.js:1420-1422`），无 `ctx.openInApp` 服务——故 raw fetch 是当前唯一通路，但依赖另一插件的私有 wire 路径。
- **为什么重要**：若该插件缺失/改名则静默失败；属跨插件内部路由耦合，非官方公开 API。
- **审查判断**：成立但属可接受的脆弱性，非违规。
- **建议修法**：优先经其 slot 注入控制器面调用；若必须直连，对 404/无该插件做优雅降级并注释标记为内部耦合。

---

## 3. In-Scope 逐项对齐审核

> 本轮审查对象是三插件对「dsh 插件契约 + 三域审计清单」的符合度。结论：`done | partial | missing | stale | out-of-scope-by-design`。

| 编号 | 计划项 / 设计项 / 审计项 | 审查结论 | 说明 |
|------|--------------------------|----------|------|
| S1 | 路由鉴权覆盖（所有 `webServer` 路由经 `requestRejection`/authorize） | `partial` | explorer-extra 六条全有闸；notepad `/save`、model-selector `/catalog` 无闸（R1/R11） |
| S2 | 注入与命令执行安全（无 shell/命令注入） | `partial` | explorer-extra argv+confine 合规；notepad `osascript` 字符串拼接可注入（R2） |
| S3 | workspace 边界（写不越界） | `partial` | 词法界校验在，但 `..` 未规范化可越（R4） |
| S4 | XSS / 输出转义 | `done` | notepad `escapeHtml` 全覆盖+URL 白名单；model-selector React 转义；explorer client 无 sink |
| S5 | manifest 正确性（exports/files/engines/dsh.*） | `partial` | exports/engines/平台正确；explorer-extra `files` 漏 `lib/host.js`（R3） |
| S6 | cordis.patch `name` 可分发性 | `partial` | explorer-extra 包名正确；notepad/model-selector 绝对路径（R6） |
| S7 | 服务注入声明（`inject` + `dsh.client.inject`） | `partial` | host `inject` 基本对；`sessionPersistence` 漏声明（R5）、客户端 provider 包漏声明（R9） |
| S8 | 平台缝使用（ctx.fs/subprocess vs 裸 node） | `partial` | explorer-extra 走 `ctx.fs/subprocess/sandbox`；notepad 裸 `node:*`（R7） |
| S9 | 每请求性能（无 O(n) 串行重建） | `partial` | explorer-extra 合理；model-selector catalog 串行无缓存（R8） |
| S10 | 客户端渲染性能（memo/防抖/无重解码） | `partial` | explorer/model-selector 大体可；notepad 每帧重解析+重解码（R10）、model-selector 每开双取 |
| S11 | 资源卫生（listener/timer/IDisposable 清理） | `done` | 三者 cleanup 完备；objectURL revoke、IDB 上限、`ctx.effect` disposer 正确 |
| S12 | spec.md（explorer-extra 规格）对齐 | `partial` | 树内 git 状态/状态栏/内联创建改名已实现；但 spec 若声明越界写防护则 R4 未达成，工作区写越界是规格外缺陷 |

### 3.1 对齐结论

- **done**: 2（S4、S11）
- **partial**: 10（S1、S2、S3、S5、S6、S7、S8、S9、S10、S12）
- **missing**: 0
- **stale**: 0
- **out-of-scope-by-design**: 0

> 这更像「**机制骨架与客户端工程已到位，但宿主安全面有硬伤、发包清单与若干契约声明未收口**」的状态，而非 completed。explorer-extra 最接近合拢（仅 R3/R4/R5/R14），notepad 欠安全与平台缝两块，model-selector 欠缓存与补声明。

---

## 4. Out-of-Scope 核查

> 检查实现是否越界、以及 reviewer 是否把已冻结/合理的项误判为 blocker。

| 编号 | Out-of-Scope / Deferred / 易误判项 | 审查结论 | 说明 |
|------|------------------------------------|----------|------|
| O1 | 「存储为」弹窗阻塞 10 分钟（`osascript` timeout 600s）可致请求挂起 | `误报风险` | 属功能特性（等用户选路径），非缺陷；但叠加 R1 无鉴权会被滥用作 DoS——根因是 R1/R2，非 timeout 本身 |
| O2 | 未压缩 bundle / PNG dataurl 内联 | `遵守`（合理） | 本地开发插件可接受；已在 R12 以 low 记录，不升级为 blocker |
| O3 | `ctx.get('sessions'/'sandboxPolicy'/…)` 读取未逐服务 await | `遵守` | `ctx.get` 本就是免 inject 的注册表读；R5 只点 `sessionPersistence` 因它造成了冷会话 bug，非泛化指摘 |
| O4 | model-selector 接管 composer 模型座（shadow 官方座） | `遵守` | 用 slot 注册/override 是插件本意，非违规；R13 只记 `priority` 死字段与 label 子座，不否定 shadow 机制 |
| O5 | explorer-extra 允许 `allowOutsideWorkspace` 读越界目录 | `遵守` | 读越界是产品功能（客户端「Allow listing outside」开关 + 逐目录确认），写仍受限；不计入越界缺陷 |
| O6 | `runExternal`/`rename` 里 `session` 字段传入但未被内部使用 | `误报风险` | 仅为透传占位，不构成安全/正确性问题，不单列 finding |

---

## 5. 最终 verdict 与收口意见

- **最终 verdict**：`changes-requested` —— 机制骨架与客户端工程合规且性能基线良好，但 `dsh-nano-notepad` 存在未授权 RCE（R1+R2），`dsh-nano-explorer-extra` 发包即坏（R3）+ `..` 越界写（R4），必须先修。
- **是否允许关闭本轮 review**：`no`
- **关闭前必须完成的 blocker**：
  1. **R1+R2**：notepad `/save` 加 `connection().requestRejection` 鉴权 + content-type 校验；`nativeSave` 改 argv 传参消除 AppleScript 注入（不再内联拼接）。
  2. **R3**：explorer-extra `files` 补 `lib/host.js`，并用 `npm pack --dry-run` 验证产物清单。
  3. **R4**：`absoluteOf`/`isLexicallyInside` 规范化 `..`/`.` 后再判界，堵住 `createFolder`/`rename`/`createFile` 的越界写。
- **可以后续跟进的 non-blocking follow-up**：
  1. R6（patch 改包名）、R7（走 `ctx.subprocess`/`ctx.fs`）、R8（catalog 缓存+并行）、R9（补 `dsh.client.inject` 声明）。
  2. R10（notepad 渲染缓存）、R11（`/catalog` 加闸）、R12（minify+锁 esbuild）、R13（label 子座）、R14（open-in-app 降级）。
- **建议的二次审查方式**：`independent reviewer` —— R1/R2 修复后需独立复核 osascript 传参与鉴权闸是否同时到位，且不应由实现者自验。
- **实现者回应入口**：`请按 docs/templates/code-review-respond.md 在本文档 §6 append 回应，不要改写 §0–§5。`

> 本轮 review 不收口，等待实现者按 §6 响应并再次更新代码（至少落掉 R1/R2/R3/R4 四个 blocker）。

---

## §6 实现者回应 — 2026-11-09（修复 + 复核）

> 本节由实现 agent 追加，回应 §2 各条。修复已在本机复核；critical/high 已验证到位，源码与构建产物（`lib/`）同步重建，dev 实例 `https://dsh-dev.local/` 重启后确认加载。

### 复核口径

- **R1+R2（critical）已修并实证**：`/nano-notepad/save` 现于 `index.js:183` 先过 `connection().requestRejection(req)`（Host/Origin fence + Peer auth），未授权 POST 在 dev 实例实测返回 **401**；`nativeSave` 不再把 `body.name` 拼进脚本——文件名经 `osascript -e SAVE_SCRIPT <name>` 传入 `run argv`（`index.js:80-84,137,150`），脚本主体是静态字面量。本机实证：注入 payload `x" & (do shell script (ASCII character 116)) --` 作为 argv 时是**惰性文本**（`osascript` 原样回显 `ok:x" ... --`，无命令执行、无标记文件）。RCE 面已消除。
- **R3（high）已修**：`dsh-nano-explorer-extra/package.json` `files` 加入 `lib/host.js`；`npm pack --dry-run` 实测清单含 `index.js / lib/client.js / lib/host.js`。
- **R4（high/medium）已修并实证**：`absoluteOf`（listing.js:114）与 `isLexicallyInside`（listing.js:149-150）均先经 `foldSegments` 折叠 `.`/`..` 再做前缀判界。node 实测：`absoluteOf('/ws','../etc')→/etc`（`inside?=false`）、`/ws/sub/../../etc→false`、`/wsevil→false`，正常路径不受影响。
- **R5（medium）已修**：`inject` 补 `sessionPersistence`（entry.js:13），注释更正；冷会话经 `sessionPersistence().stat` 的 persisted-header fallback 不再返回 `undefined`。
- **R6（high）已修**：三个 `cordis.patch.yml` 的 `name:` 统一为**包名**（`dsh-nano-notepad`/`dsh-nano-model-selector`/`dsh-nano-explorer-extra`）。复核发现 dev 实例经 `~/.dsh-dev/profiles/web/package.json` 的 `file:` 依赖 + profile bundle **本就按包名解析**——包名是唯一正确形式，绝对路径只是本机 `isAbsolute` 分支的巧合。同步脚本 `dsh-dev` 保留对仓库绝对路径的 repoint 兜底，无需改 `name:`。
- **R7（medium）已修**：`nativeSave` 优先走 `ctx.subprocess`（`runViaSubprocess`，`index.js:148`）——`resolveExecutable`/`spawn`/`done`/`collected.readFrom(0).text`/`terminate`/`waitForExit` 与 explorer-extra 的 `runExternal` 逐一对齐；`ctx.subprocess` 缺失时回退 `execFile`（argv 同样安全）。`inject` 补 `connection`/`subprocess`。
- **R8（medium）已修**：`groupOf` 内 `resolveModelInfo` 改 `Promise.all` 并行；`buildCatalog` 并行 provider；catalog 路由转 `handler` 并加 `requestRejection` 闸 + 15s 缓存 + in-flight dedupe。客户端 `ModelSelector.jsx` 加 `detailsFetchedAt` TTL（15s）防止每次开面板重建，`visibleFavorites`/`visibleGroups` 改 `useMemo`。
- **R9（medium）已修**：三插件 `dsh.client.inject` 补齐服务提供方（notepad + theme/locale/workspace-controller/session-controller；model-selector + session-controller/locale）。
- **R10（medium）已修**：`renderTree` 按 `(workspaceId,parentId)` 预分组 `byParent`（O(N²)→O(N)）；`renderBody` 加 `renderCache`（键 `file.id+imageEpoch+markdown`），`storeImage` 后 bump `imageEpoch`、`loadSnapshot` 后 `clear()`，非编辑性 render 复用 HTML 不再重解析/重解码。
- **R11（low）已修**：`/nano-model-selector/catalog` 转 `handler` + `requestRejection` 闸，dev 实例未授权实测 **401**。
- **R12（low）已修**：三个 `build-client.mjs` 客户端 bundle 加 `--minify`，并改为优先用 `node_modules/.bin/esbuild`（`esbuild@0.25.0` devDependency）仅在缺失时回退 `npx`，消除构建期工具链漂移。
- **R13（low）已修**：`index.jsx` 移除无效的 `priority:-1`，注释说明单座按注册序 shadow 的选举机制。
- **R14（low）已修**：`explorer-extra` `dsh.client.inject` 移除未使用的 `dsh-api-remotes`；`/open-in-app` 直连保持但已注释标注内部耦合。

### 复核结论

- **Critical**：R1、R2 → **已解决**（鉴权闸 + argv 传参，双重实证）。
- **High**：R3、R6 → **已解决**（files 含 host.js；patch 用包名 + dev file: 链接）。
- **Medium**：R4、R5、R7、R8、R9、R10 → **已解决**。
- **Low**：R11–R14 → **已解决**。
- **构建产物**：三个 `lib/client.js`（含 `--minify`）与 `lib/host.js`（explorer-extra）已重建，dev 实例重启后无激活错误（startup log 无新 `ENOENT`/`did not activate`）。

> 四个 blocker（R1/R2/R3/R4）全部落地并经本机复核。剩余事项仅为非阻断的体验项（如 model-selector `conversation.input.model.label` 子座的可选补齐），不影响本轮收口判断。

### 回归修复记录（2026-11-09 追加）：`apply is not defined`

R12 引入 `--minify` 后，notepad 与 model-selector 的客户端 bundle 在 web boot 报 `import failed: apply is not defined`。根因：二者仍用 `--format=iife` + 手拼 `indexOf('{')`/`lastIndexOf('}')` splice + 手写 `exports.apply = apply`——minify 把 IIFE 内部的 `apply`/`inject` 改名，尾部裸引用找不到声明（explorer-extra 早已用 `--global-name`，故未受影响，与用户报错范围一致）。

**修法**：三个 build 脚本统一为 `--format=iife --global-name=<ns>Export`——esbuild 把导出赋给具名 global（mangled 名由编译器正确接线），factory 嵌入整段 IIFE 并 `return <ns>Export`，不再做花括号切片或手写导出语句。Node 模拟 `__ModuleLoader__.load` 验证：三个 bundle 的 factory 均返回 `{apply: function, inject: array}`（explorer-extra 另有 `DEFAULT_PREFS`）。`dsh-dev restart` 后 `apply is not defined` 在 err.log 出现 0 次，进程存活、实例 302 正常。
