> **⛔ 历史归档说明（2026-11-12）**：审查对象之一 `dsh-nano-shared-workspace` 已 DEPRECATED，源码移至 [`deprecated/dsh-nano-shared-workspace/`](../../../deprecated/README.md)。本报告的「四个插件」是审查当时的范围，**现行活跃插件为三个**；涉及该插件的 findings 仅作历史证据，已不再纳入发布门禁。正文未改写。

# dsh-plugins 安全审查报告（security-26nov）

> 审查对象: `dsh-nano-notepad` / `dsh-nano-model-selector` / `dsh-nano-explorer-extra` / `dsh-nano-shared-workspace` 四个 dsh overlay 插件（当时范围），以及 `packages/dsh-nano-ui` / `packages/dsh-performance-review` / `packages/dsh-s3-client` 三个构建期共享包；另含 `release.md` 发布与安装合同
> 审查类型: `security-audit`（full / standard profile）
> 审查时间: `2026-11-11`
> 审查人: `DeepSeek Harness security-audit agent（覆盖驱动多子代理 + 独立候选验证 + Phase-5 独立记录复核）`
> 审查范围:
> - 4 插件宿主路由与客户端渲染面、S3 同步链、Git 操作面、/imagine 技能模板
> - 3 共享包的签名/限速/账本、性能采集、UI 构建
> - `release.md` 发布信任链与打包流程
> 源码基准: commit `8a701664da0a4af08128a17457ec1d4b587fd5f3`（工作区 dirty，审计状态以当前工作区为准）
> 执行边界: 仅源码与本地有界复现（`env -i` + macOS `sandbox-exec` 禁网）；未探测 `https://dsh.local/`，未访问任何真实外部服务
> 文档状态: `findings-open`（24 confirmed / 0 needs_validation / 10 rejected；详见文末覆盖总结）

---

## 1. 运行概况

| 项目 | 内容 |
|---|---|
| 运行 profile | `standard`（完整六阶段：侦察 → 覆盖驱动猎取 → 候选验证 → 结构化输出 → 独立记录复核 → 目标中立报告） |
| 审查范围 | 4 个插件：`dsh-nano-notepad`、`dsh-nano-model-selector`、`dsh-nano-explorer-extra`、`dsh-nano-shared-workspace`；3 个包：`packages/dsh-nano-ui`、`packages/dsh-performance-review`、`packages/dsh-s3-client`；另含 `release.md`、`AGENTS.md` 的发布与安装合同 |
| 范围说明 | 用户要求「4 个插件 + 2 个 package」；仓库实际存在 3 个 package，全部纳入以完成覆盖（`dsh-performance-review` 以源码形式打进 notepad/model-selector 的 `lib/`，本就不可排除） |
| 源码基准 | commit `8a701664da0a4af08128a17457ec1d4b587fd5f3`；**工作区 dirty**，审查对象为当前工作区状态而非该 commit（S3 同步与 `packages/dsh-s3-client` 等为未跟踪新代码） |
| 预算 | 未设置硬性 agent 预算；用户硬约束：同时存在的子代理 ≤ 3（全程遵守） |
| 执行边界 | **仅源码与本地有界复现**：`env -i` 白名单环境 + macOS `sandbox-exec`（禁网、禁 scratch 外写入）+ CPU/文件大小/进程数上限 + 墙钟超时；没有对任何部署实例、外部服务或外部账号发起探测 |
| 先前运行 | 无（`.anote/security-26nov` 启动时为空）；无沿用既有确认，所有记录均由本轮独立产生 |
| 最终判定 | `run_status: complete` |

覆盖单元 11 个，全部已关闭（status=`candidate`，每个单元均已产出候选并完成处置）；最终覆盖率 critic 结果为 `stop: true`（clean）。最终 34 条记录：**24 confirmed / 0 needs_validation / 10 rejected**。

Phase 5 记录复核：24 条 confirmed 记录全部由**全新的独立 verifier**逐条复核（未参与猎取与 Phase-3 验证）。其中 7 条在复核中被修正（行号/证据细节等）；3 条属实质性修正（esbuild 可达性、release 可重现性证据、manifest 影响评分），其修正版均再经一名全新 verifier 复核后才采用；其余为 `verified`。

## 2. 安全态势摘要

本轮审查的核心结论是：**这批插件把「同源页面 JS」当作与宿主等价的信任主体，而这一假设不成立。** 插件宿主路由普遍只挂一道 `connection?.requestRejection`（Host/Origin 围栏 + 已认证会话），没有任何按路由、按会话、按操作的最小授权；因此任何在 dsh Web 页面内执行的脚本（恶意/被投毒的插件 bundle、stored XSS 的载荷、agent 注入的 DOM 内容）都能直接调用全部宿主路由，进而获得宿主的文件系统、Git、出站 HTTP 与 S3 凭据权限。

由此形成三条主要攻击链：

1. **远程内容 → 同源脚本执行**：记事本的富文本/同步/图片路径存在多处存储型 XSS（`notepad:sanitizeRichHtml-*`、`notepad:sync-manifest-*`、`notepad:sync-remote-image-*`、`nano-notepad/sanitizeMpHtml-*`），S3 桶写入者或恶意 mp 文章作者即可在受害者浏览器内执行脚本。
2. **页面脚本 → 宿主文件/网络权限**：explorer-extra 的 `/read` 可读任意 UTF-8 文件（含 `allowOutsideWorkspace` 开关）、五个变更路由可经符号链接逃逸工作区、`scopeOf` 可接管任意会话；notepad 的 `/read` 可读任意 `*.md`、`/s3/config` 可把宿主变成签名 SSRF 代理；shared-workspace 的 `/ls`、`/mkdir`、`/workspaces/join`、`/materialize` 均可越出预期根。
3. **不可信远程数据 → 本地文件与凭据**：shared-workspace 把 S3 marker 的 `member.localPath` 当作本地文件系统权限使用，可造成任意文件写入（含 `.git/config` → 代码执行）、会话记录持续外泄、`committedBytes` 无界解压 DoS；`/imagine` 把真实 `~/.grok` 凭据复制进工作区并被同步/提交。

供应链侧另有两条中危：构建脚本在本地 esbuild 缺失时静默 `npx` 拉取（无仓库锚定完整性），以及发布链打包大量 git 未跟踪产物（tag 无法重建发布物，provenance 断裂）。

值得肯定的正面模式：所有宿主路由统一走 `connection.requestRejection`（跨站/CSRF 已被围栏）；S3 客户端实现了 SigV4 与限速/账本；shared-workspace 的 `s3.js` 对 key 做了逐段编码（与本轮发现的 `dsh-s3-client` 原始插值形成对比）；notepad 的 `osascript` 保存对话框使用 argv 而非字符串插值（本轮已验证其安全）。

### 2.1 对原生 deepseek-harness 的影响面

- **页面源权限（最普遍）**：所有存储型/反射型 XSS 与 explorer-extra、notepad 的页面路由类发现，都发生在 dsh Web 页面源内。页面脚本可直接调用 harness 暴露给页面的会话、工作区与 agent 能力——插件没有扩大「页面能做什么」的原生边界，但把大量本应只属于宿主代码的操作暴露成了页面可调用的路由。
- **宿主进程权限**：`nxe:git-config-filter-exec`、`nxe:mutate-symlink-escape`、`nano-notepad/s3-config-endpoint-ssrf`、`nano-notepad/fetch-mp-redirect-ssrf`、`nsw:remote-member-localPath-arbitrary-fs-write`、`nsw:materialize-sessionId-path-traversal`、`nsw:workspaceId-join-s3key-traversal` 等，以 **DSH 宿主进程用户身份** 读写任意文件、执行命令、发起出站请求；这是插件把原生 harness 的宿主权限借给了页面或远程数据，属于最严重的一类注入。
- **会话与 DSH_HOME 数据**：`nsw:matchWorkspace-member-localPath-session-exfil`（会话 transcript 外泄）、`nsw:workspaceId-join-s3key-traversal`（跨租户读 `*.json`）、`nxe:scopeof-cross-session`（跨会话工作区操作）、`nsw:materialize-sessionId-path-traversal`（覆盖任意会话 transcript）直接影响 harness 的会话内容与会话索引。
- **凭据面**：`hunter-e:grok-creds-workspace-copy` 把 `~/.grok` 真实凭据复制进工作区；`nano-notepad/s3-config-endpoint-ssrf` 会把已存 S3 secret 用于签名攻击者 endpoint。两者都可能外泄原生 harness 所在机器的凭据。
- **未发现**：没有证据表明插件改写 harness 安装目录/二进制、注入原生启动流程或破坏 dsh 自身更新链；风险集中在「插件路由 + 页面源」这一层。

## 3. 已确认发现总表

| # | 严重度 | 标题 | 受影响边界 | 观测结果（一行） |
|---|---|---|---|---|
| 1 | **高** | /imagine（grok 引擎）把真实 `$HOME/.grok/{auth.json,config.toml}` 复制进会话工作区：持久、可被 agent 读取、可提交、并被自动同步<br>`hunter-e:grok-creds-workspace-copy` | 用户主目录私有凭据 → 会话工作区（agent / 页面 JS / S3 共享桶可及） | 本地验证：cp 将凭据植入工作区（0600、持久、无清理）；`git add --all` 会暂存两个文件（仓库 .gitignore 不覆盖 imagine/）；真实 pushWorkspace 将 `imagine/.grok/auth.json` 与 `config.toml` 作为 S3 blob 上传。 |
| 2 | **高** | /imagine 技能模板把 `{prompt}/{out}/{cwd}` 字面替换进双引号 shell 命令：提示词/agent 文本以 agent 工具权限执行任意命令<br>`hunter-e:imagine-template-shell-injection` | 用户/agent 文本 → shell 命令（宿主机用户身份） | 独立复现（env -i + sh -c，不存在的引擎二进制）：`$(touch)`、引号逃逸 `"; touch ...; echo "`、反引号以及含引号的 `{out}`、`{cwd}` 五类 payload 各自创建标记文件；字面换行未逃逸（负对照成立）；正常渲染会执行 mkdir+cp 前缀复制凭据。 |
| 3 | **高** | /nano-notepad/fetch-mp 跟随 30x 重定向但不逐跳复验：受白名单约束的 mp 抓取变成对内网主机的 SSRF<br>`nano-notepad/fetch-mp-redirect-ssrf` | 同源页面 JS → 宿主进程出站 HTTP（内网/环回/元数据端点） | 本地端到端复现：真实 handler + 真实 fetch 跟随 mp.weixin.qq.com 允许源的 302 到 `http://127.0.0.1:<port>/internal/admin`（记录到带 MicroMessenger UA 的命中），路由返回 200 与内部页面内容；直接用非 mp URL 则 422 拒绝且无出站请求。 |
| 4 | **高** | POST /nano-notepad/s3/config 允许页面 JS 设置任意 endpoint/bucket/凭据：SigV4 签名出站请求 + bodyB64 回读 = SSRF oracle；仅改 endpoint 会保留已存密钥；probe 可在未激活时签名写请求<br>`nano-notepad/s3-config-endpoint-ssrf` | 同源页面 JS → 宿主进程出站请求与已存 S3 凭据 | 环回捕获服务器端到端复现：任意 endpoint 的签名 GET 与 bodyB64 回读、bucket='..' 路径逃逸、仅改 endpoint 时真实密钥继续签名、未激活 profile 的 probe 发出签名 PUT/DELETE/GET。 |
| 5 | **高** | 宿主侧 sanitizeMpHtml（正则清洗）残留活动内容：抓取并清洗后的 mp 文章仍在记事本预览中执行<br>`nano-notepad/sanitizeMpHtml-active-content` | 远程 mp 文章（或可写桶内容）→ 同源 DOM | 真实 headless Chrome + 逐字宿主/客户端代码 + 精确 sink：6 种 javascript: 变体在点击时执行（document.title 标记）；注入的 meta refresh 无交互导航整页；base/style/link/form/object/embed 存活进实时 DOM。 |
| 6 | **高** | 存储型同源 XSS + 导航/CSS 注入：sanitizeRichHtml 保留 javascript: 锚点、SVG href、`<style>`、`<meta refresh>`、`<form>`、`<object>`、`<link>`、`<base>`<br>`notepad:sanitizeRichHtml-keeps-js-href-active-dom` | 远程/导入的 .html 草稿 → 同源 DOM | 真实 Chrome 中逐字 sanitizer + 真实 innerHTML sink：HTML 与 SVG 的 javascript: 锚点点击执行；`<style>`、meta refresh、`<form action>`、`<object>`、`<link rel=stylesheet>`、`<base>` 原样保留；`<base>` 将相对 meta-refresh 重定向到攻击者源。 |
| 7 | **高** | 存储型同源 XSS：远程 S3 manifest 的 file id/workspaceId 未转义地插入记事本 tree、group、tab 的 data-* 属性<br>`notepad:sync-manifest-id-unescaped-attr-xss` | S3 桶写入者 → 同源 DOM（受害者浏览器） | headless Chrome 157：属性逃逸后注入的 <img src=z onerror> 被解析为真实元素并执行 mark()——文件 tree 行 4 次、workspaceId 组头 1 次、tab 条 2 次（共 6 次 nodeid），面板容器隐藏时也会触发。 |
| 8 | **高** | 存储型 XSS：远程图片 `mime`（及 `base64`）原样插入 `src="data:${image.mime};base64,..."`<br>`notepad:sync-remote-image-mime-unescaped-attr-xss` | S3 桶写入者 → 同源 DOM（自动同步渲染） | 真实 headless Chrome 逐字 db.js+markdown.js 复现：注入元素/事件处理器被解析，onerror 触发，任意脚本在记事本面板源（dsh GUI 页面）执行。 |
| 9 | **高** | 任意 marker 中任意 member.localPath 都会把匹配的本地会话记录每 30 秒拉入共享桶<br>`nsw:matchWorkspace-member-localPath-session-exfil` | S3 桶共租户 → 受害者本地会话记录（跨租户） | 端到端复现：向 workspaces/exfil-ws 推送 140B；meta writerId 为 victim@11112222；上传键含 claims/<sid>.json + body/0.part + meta.json；解压 part 恢复出秘密。 |
| 10 | **高** | /materialize 的 sessionId `..` 穿越：把攻击者控制的 zstd 写到任意目录（可原地覆盖任意会话的 session.v4.jsonl.zstd）<br>`nsw:materialize-sessionId-path-traversal` | S3 桶共租户 / 同源页面 JS → $DSH_HOME 之外的宿主文件系统 | 独立复现：文件写到 DSH_HOME 之外的 mat-escape/deep/session.v4.jsonl.zstd 且攻击者字节可回读；同项目目录的受害者会话被原地覆盖；列表行 sessionId 等于穿越串。 |
| 11 | **高** | 远程可控的 member.localPath 使 /tree/pull 与 /tree/push 变成任意宿主文件写入与读取（含 .git/* 与符号链接逃逸）<br>`nsw:remote-member-localPath-arbitrary-fs-write` | S3 桶共租户 / 同源页面 JS → 宿主任意文件系统路径 | 真实路由 handler + env -i 复现：git_config_written=true（内容 `[core] sshCommand = pwned`）、symlink_escape_written=true、stale_deleted=true、lexical_dotdot_blocked=true、secret_exfiltrated=true、join 任意 localPath 写入+上传=true。 |
| 12 | **高** | workspaceId/sessionId 的 `..` 穿越 S3 key 拼接：页面 JS 可读/覆盖工作区前缀外的任意 `*.json` 桶键<br>`nsw:workspaceId-join-s3key-traversal` | 同源页面 JS → 共享桶内任意 `*.json` 对象（跨租户） | 签名 GET/PUT 落到 workspaces/ 之外的解析兄弟键：identities/mallory.json 被读+改写（join 200 响应泄露完整 JSON）、otherapp/state.json 字段经 lease 泄露、workspaces/<victim>/tree/HEAD.json 被 claim 租约覆盖、受害者会话 transcript 无成员校验即可返回；10/10 复现检查通过。 |
| 13 | **高** | 页面 JS 可经 explorer 自身文件路由植入攻击者控制的 .git/config，随后插件的 `git add --all` 执行其 filter driver——以宿主用户身份执行命令<br>`nxe:git-config-filter-exec` | 同源页面 JS → 宿主用户命令执行 | 标记文件 PWNED 由 filter 命令创建并含被暂存文件字节（"seed note\n"）——以宿主用户身份任意命令执行；环境注入标记 PWNED-ENV 未出现。 |
| 14 | **高** | 变更操作经预存符号链接逃逸工作区——danger-full-access 下可在根外 rm -rf/创建/重命名/移动<br>`nxe:mutate-symlink-escape` | 同源页面 JS → 工作区之外的宿主文件系统 | 工作区外的文件/目录被以宿主用户身份删除、创建、重命名或移入工作区（已验证对 outside/victim 的 rm -rf）。 |
| 15 | **高** | POST /nano-explorer-extra/read 把宿主任意 UTF-8 文件返回给同源调用者——客户端传 `allowOutsideWorkspace:true` 即跳过工作区围栏；/list 从不围栏<br>`nxe:routes-read-arbitrary-file` | 同源页面 JS → 宿主任意 UTF-8 文件与目录枚举 | 对工作区外文件返回 HTTP 200 `{ok:true,content:'TOP-SECRET-HOST-FILE\n'}`；/list 根目录返回 `{ok:true,entries:[...],resolvedPath:'/'}`；不带 flag 的同一 /read 返回 400 'outside the workspace'。 |
| 16 | **高** | scopeOf 解析任意已存在 sessionId——页面脚本可接管其他会话的工作区与沙箱策略<br>`nxe:scopeof-cross-session` | 同源页面 JS → 其他会话的工作区（跨会话/跨主体） | 用真实 createRoutes handler 复现：外部活动会话 id 读取受害者文件成功；外部冷会话 id 在默认策略下读取成功；/status 返回外部工作区根；不存在 id 报 'unknown session' 失败关闭。 |
| 17 | **中** | 构建脚本回退到 `npx --yes esbuild@0.25.0`：构建期从 registry 拉取工具链且无仓库锚定完整性校验<br>`dsh-plugins/esbuild-npx-unpinned` | 构建/发布链 → 发布产物（所有安装者） | 本地 esbuild 缺失时四个插件的 build-client.mjs 均会联网执行 npx 拉取的 esbuild，编译产物直接进入发布 tarball；未执行 registry 投毒演练（机制为源码确证）。 |
| 18 | **中** | 发布链打包 git 未跟踪产物：生成的 lib/ 与其源文件均未入库、无完整性闸门，发布 tarball 与 tag 声称的提交不一致<br>`dsh-plugins/release-untracked-artifacts` | 仓库提交 → 发布 tarball（供应链可追溯性） | `lib/s3-sync-host.js`、`packages/dsh-s3-client/`、`src/client/{sync,cloud-settings}.js`、`packages/dsh-nano-ui/src/tabs.js` 等被打包但未跟踪；`lib/client.js` 相对 HEAD 有 229 行未提交改动；仓库无 `.github/workflows/`，release.md 的 CI 信任链只是文档。 |
| 19 | **中** | POST /nano-notepad/read 无目录 confinement，可返回宿主任意可读 `*.md` 文件（受扩展名限制，并非任意文件读取）<br>`nano-notepad/read-arbitrary-md-read` | 同源页面 JS → 宿主文件系统（跨工作区） | 真实 handler 复现：工作区外的绝对路径 .md 与 scratch .md 返回 200 + 内容；`/etc/hosts`、非 md、指向非 md 的符号链接均被拒绝。 |
| 20 | **中** | acquireClaim 对 `claims/{sessionId}.json` 做无保护的读-改-写：并发 push 静默产生混合写入者的会话产物（无 CAS/etag、无 fencing token）<br>`nsw:acquireClaim-rmw-no-cas` | 不同成员 principal 之间的单写者租约控制 | 用真实 acquireClaim/renewClaim/pushSession + 内存 S3 复现：互斥被静默击穿（双方继续且都自认 owner）、持久化会话产物把一方字节放在另一方 meta.json 下（静默错误归属）、共租户可用一次无条件 PUT 窃取/挂起活动租约（受害者 renew/acquire 直到 TTL 过期都失败）。 |
| 21 | **中** | /nano-shared-workspace/ls 与 /mkdir 接受任意绝对路径：可枚举宿主目录并在任意可写位置创建目录<br>`nsw:ls-mkdir-any-absolute-path` | 同源页面 JS → 宿主文件系统（目录结构与创建） | ls('/etc') 返回 23 个目录项；ls('~/.ssh') 返回 ['agent','sockets']；mkdir 创建 /tmp/nsw-litter-<pid> 与 scratch 目录。mkdir 仅单层（含 '/' 或 '..' 被拒，缺父目录 ENOENT）；ls 只返回目录+符号链接，不含普通文件与内容。 |
| 22 | **中** | 远程 meta.json 的 committedBytes 驱动无界抓取+缓冲+zstd 解压：被投毒的桶对象可耗尽内存/磁盘<br>`nsw:remote-meta-unbounded-fetch-decompress` | S3 桶写入者 → 受害者 dsh 宿主进程可用性 | 真实函数本地运行：单个 192MiB part 使 RSS +385MB（解码前）；18KiB 帧解出 7.7M 对象、RSS +793MB；committedBytes=16GiB 计划 262,144 次请求；同步解压阻塞事件循环。 |
| 23 | **低** | 远程同步的 .json 笔记正文触发 validateJson 无界递归 RangeError，导致 nano-notepad 渲染崩溃（拒绝服务）<br>`notepad:validateJson-unbounded-depth-RangeError-DoS` | S3 桶写入者 → 单个浏览器内插件编辑面可用性 | node v24.22.2 + 逐字 json.js：深度 10000（约 20KB payload）抛 `RangeError: Maximum call stack size exceeded`；5000 正常；原生 JSON.parse 到 500000 无碍；renderJsonTree 在 20000 崩溃；detached renderBody 路径无 catch，重复渲染会反复产生未处理 rejection。 |
| 24 | **低** | GET /nano-explorer-extra/perf-review/host?mode=window 排空进程级 perf 窗口——任意同源页面脚本可清除其他会话样本并读取跨插件计时数据<br>`nxe:perf-review-window-drain` | 同源页面 JS → 进程级跨会话观测数据 | 真实路由 handler 复现：第一次 ?mode=window 返回外部 pluginId（'other-plugin' 与 nxe git-status）样本并清空所有窗口；第二次调用 n:0/samples:[]；默认快照继续暴露累计 reservoir 样本。 |

## 4. 已确认发现详情

以下按严重度排序。每条给出源码位置、较低信任主体、目标原生的有界复现、成立条件、实际结果、影响、优先级理由与最小源码修复。完整 trace/evidence 见 [FINDINGS-DETAIL.md](../../../.anote/security-26nov/FINDINGS-DETAIL.md)（审计工作目录产物；`NEEDS-VALIDATION.md`、`findings.json` 同目录）。

### 4.1 [高] /imagine（grok 引擎）把真实 `$HOME/.grok/{auth.json,config.toml}` 复制进会话工作区：持久、可被 agent 读取、可提交、并被自动同步

- **指纹**：`hunter-e:grok-creds-workspace-copy`
- **源码位置**：`dsh-nano-model-selector/lib/host-media.js`:38（ENGINES[grok].command template, baked into the imagine skill）
- **较低信任主体**：leak requires only agent-tool / page-JS authority over the workspace — the same authority the creds were moved into
- **有界复现**：本地验证：cp 将凭据植入工作区（0600、持久、无清理）；`git add --all` 会暂存两个文件（仓库 .gitignore 不覆盖 imagine/）；真实 pushWorkspace 将 `imagine/.grok/auth.json` 与 `config.toml` 作为 S3 blob 上传。
- **成立条件**：user runs /imagine with the grok engine selected in a session whose workspace is a git repo or a joined shared-workspace replica；grok CLI installed at ~/.grok/bin/grok with a populated ~/.grok/auth.json (the normal install layout)；leak requires only agent-tool / page-JS authority over the workspace — the same authority the creds were moved into
- **实际结果**：verified locally: cp plants creds into workspace (mode 0600, persistent); git add --all stages both files; real pushWorkspace uploaded imagine/.grok/auth.json + config.toml as S3 blobs to the shared bucket
- **影响**：泄露真实 xAI auth token 与配置，导致凭据盗用/账号接管；shared-workspace 同步会把它扩散到其他成员与实例。
- **优先级理由**：likelihood=medium（needs one /imagine run plus any leak trigger (page read, a commit, or a joined shared-workspace replica) — each trigger is a routine, documented action）；impact=high（discloses the live xAI auth token and config → credential theft / account takeover; S3 sync spreads it to other members/instances）。
- **最小源码修复**：不要把真实凭据放进工作区：GROK_HOME 指向 `$TMPDIR` 下 700 权限的每次运行临时目录并在命令结束后删除，或直接引用 `~/.grok`；若必须缓存，至少写入 `.gitignore`、加入 shared-workspace 的 SKIP 集合与 /read 的拒绝名单。

### 4.2 [高] /imagine 技能模板把 `{prompt}/{out}/{cwd}` 字面替换进双引号 shell 命令：提示词/agent 文本以 agent 工具权限执行任意命令

- **指纹**：`hunter-e:imagine-template-shell-injection`
- **源码位置**：`dsh-nano-model-selector/lib/host-media.js`:40（ENGINES[grok].command）
- **较低信任主体**：skill invocation needs only an authenticated session; the rendered command executes under the agent's existing tool approval/sandbox
- **有界复现**：独立复现（env -i + sh -c，不存在的引擎二进制）：`$(touch)`、引号逃逸 `"; touch ...; echo "`、反引号以及含引号的 `{out}`、`{cwd}` 五类 payload 各自创建标记文件；字面换行未逃逸（负对照成立）；正常渲染会执行 mkdir+cp 前缀复制凭据。
- **成立条件**：user types /imagine <payload> OR the agent folds attacker-controlled text into {prompt}/{out} (indirect prompt-injection channel)；skill invocation needs only an authenticated session; the rendered command executes under the agent's existing tool approval/sandbox；none for the injection itself — payloads fired with a nonexistent engine binary; impact ceiling equals the session's file policy
- **实际结果**：5 marker files created independently (subst, breakout, backtick, out, cwd) with /nonexistent/grok-bin; benign run executed mkdir+cp prefix copying creds; literal newline did not break out
- **影响**：以宿主机用户身份执行任意命令（至少具备模板自身的读 $HOME 凭据/写工作区权限；danger-full-access 下为完整宿主权限）。
- **优先级理由**：likelihood=high（one short text payload in a normal feature; indirect path via agent-folded content; the documented contract IS literal substitution so no model error is required beyond following instructions）；impact=high（arbitrary command execution as the host user under agent tool authority — at minimum the read-$HOME-creds/write-workspace reach the template itself exercises; full host-user reach under danger-full-access）。
- **最小源码修复**：不要在模型侧拼 shell 字符串：在代码中渲染命令并用单引号转义或 argv/execFile；prompt 通过环境变量（如 IMAGINE_PROMPT）单引号转义传入；对 `{out}` 做字符集白名单（kebab-case + .jpg）；替换时拒绝 `"`、`$`、反引号与换行。

### 4.3 [高] /nano-notepad/fetch-mp 跟随 30x 重定向但不逐跳复验：受白名单约束的 mp 抓取变成对内网主机的 SSRF

- **指纹**：`nano-notepad/fetch-mp-redirect-ssrf`
- **源码位置**：`dsh-nano-notepad/index.js`:273（MP_ROUTE handler /nano-notepad/fetch-mp）
- **较低信任主体**：Caller must pass connection.requestRejection — JavaScript in the authenticated dsh web page (XSS, agent-injected JS, or the user's own page script). Unauthenticated third-party sites/LAN clients are fenced by the same gate as the save/read/S3 routes.
- **有界复现**：本地端到端复现：真实 handler + 真实 fetch 跟随 mp.weixin.qq.com 允许源的 302 到 `http://127.0.0.1:<port>/internal/admin`（记录到带 MicroMessenger UA 的命中），路由返回 200 与内部页面内容；直接用非 mp URL 则 422 拒绝且无出站请求。
- **成立条件**：Caller must pass connection.requestRejection — JavaScript in the authenticated dsh web page (XSS, agent-injected JS, or the user's own page script). Unauthenticated third-party sites/LAN clients are fenced by the same gate as the save/read/S3 routes.；Requires an https://mp.weixin.qq.com/s/* URL whose response is a 30x to the attacker's chosen target — an attacker-influenced mp article, an open redirect on the allowlisted host, or a compromised/malicious upstream. The submitted URL itself cannot point elsewhere (prefix regex), so exploitability hinges on the upstream returning a redirect.；The dsh host process must be able to route to the redirect target (loopback services, LAN, or cloud metadata endpoints reachable from the host).
- **实际结果**：Locally reproduced end-to-end: real handler + real fetch followed the allowlisted origin's 302 to http://127.0.0.1:<port>/internal/admin (recorded hit with MicroMessenger UA) and returned 200 {ok:true, name:'wechat-article.html', content:'<p>INTERNAL-SECRET-CONTENT-0123456789</p>'}. Control: direct internal URL rejected 422 not-mp-url with no outbound request.
- **影响**：认证态 SSRF：宿主进程可用 GET（含 https→http 降级）访问任意内网/环回/云元数据端点；含 `id="js_content"` 的内部响应正文会被回传给页面，盲 SSRF 亦可探测。
- **优先级理由**：likelihood=medium（Requires an mp.weixin.qq.com/s/* URL that emits a 30x to the attacker's target — an external precondition the attacker does not fully control, but open redirects/attacker-influenced articles on a large user-content platform are plausible; once present, exploitation is a single authenticated POST.）；impact=high（Authenticated SSRF from the dsh host: GET requests (MicroMessenger UA) to arbitrary internal/loopback/metadata endpoints, including http scheme downgrade; internal responses containing an id="js_content" div are returned to the page, and blind requests still reach internal endpoints.）。
- **最小源码修复**：对每个重定向跳点重新校验 mp.weixin.qq.com 白名单并固定 https（不要依赖 fetch 自动跟随）；消费正文前再校验 `response.url`。

### 4.4 [高] POST /nano-notepad/s3/config 允许页面 JS 设置任意 endpoint/bucket/凭据：SigV4 签名出站请求 + bodyB64 回读 = SSRF oracle；仅改 endpoint 会保留已存密钥；probe 可在未激活时签名写请求

- **指纹**：`nano-notepad/s3-config-endpoint-ssrf`
- **源码位置**：`dsh-nano-notepad/index.js`:317（s3Route(S3_CONFIG_ROUTE, ...)）
- **较低信任主体**：any same-origin script on the authenticated dsh page (plugin bundle, other plugin, or injected DOM content); requestRejection is the only gate on /nano-notepad/s3/*
- **有界复现**：环回捕获服务器端到端复现：任意 endpoint 的签名 GET 与 bodyB64 回读、bucket='..' 路径逃逸、仅改 endpoint 时真实密钥继续签名、未激活 profile 的 probe 发出签名 PUT/DELETE/GET。
- **成立条件**：any same-origin script on the authenticated dsh page (plugin bundle, other plugin, or injected DOM content); requestRejection is the only gate on /nano-notepad/s3/*；dsh host process must be able to route to the chosen endpoint (host loopback, LAN, cloud IMDS, intranet)
- **实际结果**：Host process issues SigV4-signed GET/PUT/DELETE requests to the attacker-chosen endpoint and returns response bodies to the page as base64; demonstrated on loopback capture servers with attacker creds, retained real creds, '..' bucket normalization, and unactivated probe writes.
- **影响**：彻底击穿宿主的凭据/网络隔离：页面 JS 获得指向宿主可达任何地址的签名请求代理（内网 HTTP、云元数据 → 凭据窃取）并可回读响应体；真实 S3 密钥还会被用于签名攻击者指定请求，泄露 accessKeyId。
- **优先级理由**：likelihood=high（reachable unconditionally by any same-origin page script — the audit's baseline principal; no user interaction or extra privilege required (auto-activate on first save, beginSwitch for any profile, probe without activation)）；impact=high（fully defeats the host's credential/network isolation boundary: page JS gains a signed-request fetch proxy into whatever the host can reach (internal HTTP services, cloud metadata endpoints -> credential theft) with response-body read-back; stored real S3 credentials additionally sign attacker-directed requests, leaking accessKeyId）。
- **最小源码修复**：禁止页面铸造出站请求权限：endpoint/bucket 改由运维侧 host Config 或不可伪造的用户确认；endpoint 强制 https + 主机白名单；bucket/key 字符集校验并在 fetch 前规范化 URL，防止 `..`/`?` 逃逸；非 S3 形状响应不得原样回传正文。

### 4.5 [高] 宿主侧 sanitizeMpHtml（正则清洗）残留活动内容：抓取并清洗后的 mp 文章仍在记事本预览中执行

- **指纹**：`nano-notepad/sanitizeMpHtml-active-content`
- **源码位置**：`dsh-nano-notepad/index.js`:272（apply -> webServer.register(MP_ROUTE)）
- **较低信任主体**：同源页面脚本 / 远程桶写入者（见原记录 conditions）
- **有界复现**：真实 headless Chrome + 逐字宿主/客户端代码 + 精确 sink：6 种 javascript: 变体在点击时执行（document.title 标记）；注入的 meta refresh 无交互导航整页；base/style/link/form/object/embed 存活进实时 DOM。
- **成立条件**：settings.mpEnabled must be true (rich .html preview gated by mpEnabled(), panel.js:917/1233; opt-in per panel comment, so off-by-default limits exposure)；Victim imports a hostile mp.weixin.qq.com/s/ article (paste/drop into the mp zone). Article HTML is attacker-influenced UGC; the fetch only validates the request URL and follows redirects；javascript: vectors need a click inside the preview; <meta refresh> navigation, <base> hijack, CSS injection and form/object/embed loads need no interaction
- **实际结果**：In real headless Chrome with verbatim host+client code and the exact sink expression: six javascript: variants execute script on activation (document.title marks); injected meta refresh navigates the page to a target document with no interaction; base/style/link/form/object/embed survive into the live DOM.
- **影响**：应用源内的存储型活动内容：点击即同源脚本执行、零点击整页导航（钓鱼/历史劫持）、base URI 劫持、CSS 注入、凭据表单与嵌入加载，可访问记事本 IndexedDB 与页面 API。
- **优先级理由**：likelihood=medium（Requires mpEnabled on (opt-in), a hostile article under an allowed mp URL (or open redirect, which fetch follows), and import into the notepad; the zero-interaction meta-refresh/base/style vectors do not need clicks, while javascript: execution needs a click in the preview）；impact=high（Stored active content in the app origin: demonstrated same-origin script execution on click, zero-click full-document navigation (phishing/history hijack), base-URI hijack, CSS injection, credential-form and embed loads — inside the dsh web origin with access to notepad IndexedDB and page APIs）。
- **最小源码修复**：把两处正则/DOM 黑名单改为 DOM 空间内的一次性白名单清洗：固定元素集合、非白名单元素去标签留文本；对所有 URL 属性（href/xlink:href/action/formaction/data/src/srcset/poster/样式中的 url()）做 scheme 白名单（仅 https? 与 data:image/）；始终丢弃 meta/base/form/input/button/object/embed/link/iframe/srcdoc/script/style（style 若需要则按现有 MP_STYLE_ALLOW 清洗声明）；宿主侧复用同一函数。

### 4.6 [高] 存储型同源 XSS + 导航/CSS 注入：sanitizeRichHtml 保留 javascript: 锚点、SVG href、`<style>`、`<meta refresh>`、`<form>`、`<object>`、`<link>`、`<base>`

- **指纹**：`notepad:sanitizeRichHtml-keeps-js-href-active-dom`
- **源码位置**：`dsh-nano-notepad/src/client/panel.js`:3110（__nanoNotepad.import / .html draft）
- **较低信任主体**：同源页面脚本 / 远程桶写入者（见原记录 conditions）
- **有界复现**：真实 Chrome 中逐字 sanitizer + 真实 innerHTML sink：HTML 与 SVG 的 javascript: 锚点点击执行；`<style>`、meta refresh、`<form action>`、`<object>`、`<link rel=stylesheet>`、`<base>` 原样保留；`<base>` 将相对 meta-refresh 重定向到攻击者源。
- **成立条件**：mpEnabled (WeChat integration) on, enabling rich .html/.wx preview；one click for javascript: anchors; style/meta/base act at render time；attacker-influenced .html/.htm/.wx draft via cross-plugin import, synced S3 bucket file, or /fetch-mp article
- **实际结果**：sanitizeRichHtml kept all listed elements verbatim; javascript: HTML + SVG anchors executed on click; kept <base> redirected relative navigation to the attacker origin
- **影响**：在已认证 dsh Web 源内执行同源脚本 → 读写用户笔记/设置、调用宿主 RPC。
- **优先级理由**：likelihood=medium（requires mpEnabled on plus landing a crafted .html draft; javascript: variant still needs one click, but style/meta/base require none）；impact=critical（same-origin script execution on the authenticated dsh web origin -> read/write user notes, settings, RPC to host）。
- **最小源码修复**：以白名单 + URL scheme 校验（http/https/data:image）替代黑名单；丢弃 base/meta/form/object/link/style；对非白名单 scheme 的锚点点击做 target=_blank + preventDefault 拦截。

### 4.7 [高] 存储型同源 XSS：远程 S3 manifest 的 file id/workspaceId 未转义地插入记事本 tree、group、tab 的 data-* 属性

- **指纹**：`notepad:sync-manifest-id-unescaped-attr-xss`
- **源码位置**：`dsh-nano-notepad/src/client/sync.js`:195（pull）
- **较低信任主体**：同源页面脚本 / 远程桶写入者（见原记录 conditions）
- **有界复现**：headless Chrome 157：属性逃逸后注入的 <img src=z onerror> 被解析为真实元素并执行 mark()——文件 tree 行 4 次、workspaceId 组头 1 次、tab 条 2 次（共 6 次 nodeid），面板容器隐藏时也会触发。
- **成立条件**：victim enabled cloud sync: settings.s3Enabled === true (off by default, db.js:23) with a configured S3 endpoint；attacker has write access to the victim's S3 sync bucket (owns/compromised endpoint or a shared bucket)；manifest rev > local sync cursor; files{} object contains a key carrying the quote-breakout payload plus a fetchable body object at files/<key>.md；none for the tree-row/group/tab variants - fires automatically on the next background pull/render, even with the overlay closed
- **实际结果**：Injected <img src=z onerror> parsed as a real element after the attribute breakout and executed mark() - 6 nodeid marks total (4 on the file tree row, 2 in the tab strip) plus 1 workspaceId mark - in headless Chrome 157, including while the panel container was hidden
- **影响**：在已认证 dsh Web 源执行任意 JavaScript，等价于受害者浏览器内的完整插件宿主路由/会话权限。
- **优先级理由**：likelihood=medium（Requires s3Enabled (off by default) plus attacker write on the victim's sync bucket; once met, the payload survives and fires automatically on the next pull with zero user interaction）；impact=high（Arbitrary JavaScript executes on the authenticated dsh web origin - equivalent to full plugin host-route/session authority for the victim's browser）。
- **最小源码修复**：在信任边界（applyRemoteFiles/sanitizeNodes）校验远程标识符：id/parentId/workspaceId 限定安全字符集（UUID/[a-z0-9-]）或重新生成；同时对每个属性插值使用 escapeHtml 作纵深防御；考虑为 Web 外壳加 CSP。

### 4.8 [高] 存储型 XSS：远程图片 `mime`（及 `base64`）原样插入 `src="data:${image.mime};base64,..."`

- **指纹**：`notepad:sync-remote-image-mime-unescaped-attr-xss`
- **源码位置**：`dsh-nano-notepad/src/client/sync.js`:215（pull image loop）
- **较低信任主体**：同源页面脚本 / 远程桶写入者（见原记录 conditions）
- **有界复现**：真实 headless Chrome 逐字 db.js+markdown.js 复现：注入元素/事件处理器被解析，onerror 触发，任意脚本在记事本面板源（dsh GUI 页面）执行。
- **成立条件**：s3Enabled=true (opt-in, default off) + configured bucket；bucket contains a hostile images/<sha> object with attacker mime/base64, and a file draft referencing notepad-image:<id>；none beyond normal sync+render; default view is 'rendered' so it renders automatically
- **实际结果**：injected element/event-handler parsed; onerror fires; arbitrary script executes in the notepad panel origin (dsh GUI page)
- **影响**：存储型 XSS 在 dsh Web GUI 页面执行任意脚本，可访问 agent 会话/工作区。
- **优先级理由**：likelihood=medium（requires s3Enabled (off by default) plus write access to the configured bucket, but no user interaction once enabled - auto-sync renders it）；impact=critical（stored XSS executes arbitrary script in the notepad panel origin (the dsh Web GUI page), giving access to the agent session/workspace）。
- **最小源码修复**：在 putImageFromRemote 对远程 mime 施加与本地上传相同的 image/* 白名单（非白名单直接跳过），并在 renderMarkdown 的 img 模板中对 mime/base64 做 escapeHtml 纵深防御。

### 4.9 [高] 任意 marker 中任意 member.localPath 都会把匹配的本地会话记录每 30 秒拉入共享桶

- **指纹**：`nsw:matchWorkspace-member-localPath-session-exfil`
- **源码位置**：`dsh-nano-shared-workspace/src/host/workspaces.js`:103（listWorkspaces）
- **较低信任主体**：any writer to the shared S3 bucket (co-tenant) — the marker needs no signature, join, or victim interaction
- **有界复现**：端到端复现：向 workspaces/exfil-ws 推送 140B；meta writerId 为 victim@11112222；上传键含 claims/<sid>.json + body/0.part + meta.json；解压 part 恢复出秘密。
- **成立条件**：any writer to the shared S3 bucket (co-tenant) — the marker needs no signature, join, or victim interaction；victim session cwd under planted prefix; localPath=/Users catches every macOS session；victim identity configured so /sync or the 30s tick runs
- **实际结果**：pushed:140b into workspaces/exfil-ws; meta writerId victim@11112222; uploaded keys include claims/<sid>.json + body/0.part + meta.json; secret recovered from decompressed part
- **影响**：完整会话记录（提示词/代码/秘密）每 30 秒持续复制到攻击者可读的桶前缀。
- **优先级理由**：likelihood=high（one unsigned S3 PUT by any co-tenant + always-on 30s tick; localPath=/Users catches every session; no user interaction on the victim side）；impact=high（full session transcripts (prompts/code/secrets) continuously copied to an attacker-readable bucket prefix every 30s）。
- **最小源码修复**：matchWorkspace 只考虑由当前 identity+instance（memberKeyOf）拥有的 member 行；marker 需完整性（createdBy 校验或签名）；session-io 应把 identity/instance 传入匹配。

### 4.10 [高] /materialize 的 sessionId `..` 穿越：把攻击者控制的 zstd 写到任意目录（可原地覆盖任意会话的 session.v4.jsonl.zstd）

- **指纹**：`nsw:materialize-sessionId-path-traversal`
- **源码位置**：`dsh-nano-shared-workspace/src/host/routes.js`:452（/materialize）
- **较低信任主体**：route reachable only via trusted host + authenticated browser/API peer (connection.requestRejection); exercised by same-origin plugin client script
- **有界复现**：独立复现：文件写到 DSH_HOME 之外的 mat-escape/deep/session.v4.jsonl.zstd 且攻击者字节可回读；同项目目录的受害者会话被原地覆盖；列表行 sessionId 等于穿越串。
- **成立条件**：route reachable only via trusted host + authenticated browser/API peer (connection.requestRejection); exercised by same-origin plugin client script；remote meta+parts planted by a bucket co-tenant; keys resolve predictably (URL dot-segment collapse) so objects sit at computable locations；a member row with localPath resolves — victim's own join, or attacker-planted workspace marker bearing victim's username；zero-interaction for attacker script; one victim click on a listed remote session for the co-tenant decoy path (listed sessionId comes from meta.json)
- **实际结果**：independent repro: file written outside DSH_HOME at mat-escape/deep/session.v4.jsonl.zstd with attacker bytes round-tripping; sibling project-dir victim session overwritten in place; listed row sessionId equals traversal string
- **影响**：可在 DSH 进程可写任意位置 mkdir -p 并写入固定名攻击内容；原地覆盖任意会话 transcript 伪造历史（注入的 transcript 是恢复时的提示词注入面）。
- **优先级理由**：likelihood=medium（trivial trigger once reachable, but planting meta needs bucket write access (co-tenant) and either an authenticated POST or one victim click on a listed session）；impact=high（mkdir -p anywhere the DSH process can write + fixed-name attacker-content file; in-place overwrite of any session.v4.jsonl.zstd forges session history (injected transcript = prompt-injection surface on resume)）。
- **最小源码修复**：在路由与 materializeSession 内用 `^[A-Za-z0-9_-]{1,128}$`（或真实 session-<uuid> 语法）校验 sessionId；对最终目录做 resolve()+前缀校验，确保在 dshHome/sessions/<pk>/ 下。

### 4.11 [高] 远程可控的 member.localPath 使 /tree/pull 与 /tree/push 变成任意宿主文件写入与读取（含 .git/* 与符号链接逃逸）

- **指纹**：`nsw:remote-member-localPath-arbitrary-fs-write`
- **源码位置**：`dsh-nano-shared-workspace/src/host/routes.js`:233（/workspaces/join）
- **较低信任主体**：authenticated same-origin page script (any injected DOM content, other plugin bundle, or window.__nsw consumer has full route access per architecture.md) OR an S3 bucket co-tenant able to putJson marker objects
- **有界复现**：真实路由 handler + env -i 复现：git_config_written=true（内容 `[core] sshCommand = pwned`）、symlink_escape_written=true、stale_deleted=true、lexical_dotdot_blocked=true、secret_exfiltrated=true、join 任意 localPath 写入+上传=true。
- **成立条件**：authenticated same-origin page script (any injected DOM content, other plugin bundle, or window.__nsw consumer has full route access per architecture.md) OR an S3 bucket co-tenant able to putJson marker objects；plugin identity configured (readIdentity.configured) so routes reach S3; for the squat variant the victim must share the bucket and lack a same-instance member row on the poisoned marker (or the planted row sorts first)；symlink-escape write/read requires a pre-existing symlink inside the chosen localPath; arbitrary write/read itself needs no symlink；page-script read side additionally needs bucket GET access via configured credentials; co-tenant read side needs bucket read
- **实际结果**：git_config_written=true (content '[core] sshCommand = pwned'), symlink_escape_written=true, stale_deleted=true, lexical_dotdot_blocked=true, secret_exfiltrated=true (symlinked file content in blob objects), join_with_arbitrary_localPath write+upload=true — all via real route handlers under env -i, no network
- **影响**：可在宿主可写任意位置写文件（.git/config 的 sshCommand 与 .git/hooks = 下次 git 操作时代码执行；任意删除）+ 把 ≤2MB 文件读到共享桶，且每 30 秒自动执行。
- **优先级理由**：likelihood=medium（needs an authenticated same-origin script (architecture.md names page JS the primary actor — no CSP on plugin bundles, window.__nsw host seam) or a bucket co-tenant; squat needs a marker where the victim has no same-instance row, which any attacker-created or not-yet-joined marker satisfies; /settings/update lets the local username be set to anything）；impact=high（demonstrated arbitrary file write anywhere the host can write (.git/config sshCommand and .git/hooks = code execution on next git operation; also arbitrary file deletion under the path) plus arbitrary read of <=2MB files uploaded to the shared bucket, automatic every 30s）。
- **最小源码修复**：member 解析严格用完整 memberId（username@instance8），禁止仅用户名回退，并把 member 行绑定到写入者（createdBy/身份签名）；join 时校验 localPath（绝对、规范化、realpath 限制在预期副本根、拒绝预存符号链接）；inside() 做 realpath 感知校验；pull 的 rel 应用 SKIP（.git/.nsw/node_modules）；scan() 用 lstatSync 跳过符号链接或拒绝越界目标；stale 删除同样加保护。

### 4.12 [高] workspaceId/sessionId 的 `..` 穿越 S3 key 拼接：页面 JS 可读/覆盖工作区前缀外的任意 `*.json` 桶键

- **指纹**：`nsw:workspaceId-join-s3key-traversal`
- **源码位置**：`dsh-nano-shared-workspace/src/host/routes.js`:229（POST /workspaces/join）
- **较低信任主体**：authenticated same-origin page script (browserPeer via connection.requestRejection: Host/Origin fence + authenticated session); no membership or CSRF check on the body params
- **有界复现**：签名 GET/PUT 落到 workspaces/ 之外的解析兄弟键：identities/mallory.json 被读+改写（join 200 响应泄露完整 JSON）、otherapp/state.json 字段经 lease 泄露、workspaces/<victim>/tree/HEAD.json 被 claim 租约覆盖、受害者会话 transcript 无成员校验即可返回；10/10 复现检查通过。
- **成立条件**：authenticated same-origin page script (browserPeer via connection.requestRejection: Host/Origin fence + authenticated session); no membership or CSRF check on the body params；join identity configured (token/accessKey in credential store); bucket shared by other tenants/prefixes or containing sibling objects to affect；target '.json' object exists for join's GET-then-PUT; claim can also create fresh keys under arbitrary paths
- **实际结果**：signed GET/PUT requests land on resolved sibling keys outside workspaces/: identities/mallory.json read+corrupted (full JSON leaked in join's 200 response), otherapp/state.json fields leaked via lease, workspaces/<victim>/tree/HEAD.json overwritten by a claim lease, and a victim session transcript returned without any workspace membership gate. All 10 repro checks pass.
- **影响**：仅凭路由权限即可读+覆盖共享桶内任意 `*.json`：跨租户破坏他人 tree HEAD/identity/lease 对象（受害者 pull 被篡改 HEAD 会删除副本文件），读取逃逸插件命名空间与 config.prefix；写入内容为固定形状 claim/member JSON，目标须以 .json 结尾。
- **优先级理由**：likelihood=high（unconditional once an identity is configured: a plain POST body field reaches the signed key; payload is trivial; admission admits every authenticated page request）；impact=high（read + overwrite of any '*.json' key in the shared bucket from a route-only principal: cross-tenant corruption of foreign tree HEADs/identity/lease objects (victim pull of a clobbered HEAD deletes replica files) and reads escaping the plugin namespace and config.prefix; write content is fixed-shape claim/member JSON and targets must end in '.json'）。
- **最小源码修复**：在每个路由边界对 workspaceId/sessionId 做字符集校验；S3 key 构造器拒绝 dot-segment 作纵深防御；对从远程 marker 读回的 workspaceId 在用于 key 或本地路径拼接前再次校验。

### 4.13 [高] 页面 JS 可经 explorer 自身文件路由植入攻击者控制的 .git/config，随后插件的 `git add --all` 执行其 filter driver——以宿主用户身份执行命令

- **指纹**：`nxe:git-config-filter-exec`
- **源码位置**：`dsh-nano-explorer-extra/src/host/routes.js`:340（/move and /rename route handlers）
- **较低信任主体**：caller can reach /nano-explorer-extra routes with a valid sessionId — the same bar the explorer's own rename/move/commit UI meets (page JS)
- **有界复现**：标记文件 PWNED 由 filter 命令创建并含被暂存文件字节（"seed note\n"）——以宿主用户身份任意命令执行；环境注入标记 PWNED-ENV 未出现。
- **成立条件**：caller can reach /nano-explorer-extra routes with a valid sessionId — the same bar the explorer's own rename/move/commit UI meets (page JS)；the session workspace is a git checkout containing an attacker-controlled config-shaped file and matching .gitattributes (a cloned or /pull-ed malicious repo supplies both)；git on the host PATH; session policy danger-full-access or a sandbox that does not fence .git writes
- **实际结果**：marker file PWNED created by the filter command and contains the staged file's bytes ("seed note\n") — arbitrary command execution as the host user; env-injection marker PWNED-ENV never appeared
- **影响**：通过 git filter driver 以宿主用户身份执行任意命令（/pull 上还可经 core.sshCommand/gitProxy、/checkout 上经 smudge）。
- **优先级理由**：likelihood=medium（requires the session workspace to be a checkout containing attacker-controlled files — routine when browsing cloned third-party repos or after /pull from a compromised remote; no user interaction beyond the page itself needed once reachable）；impact=critical（arbitrary command execution as the host user via git filter drivers (also core.sshCommand/gitProxy on /pull, smudge on /checkout)）。
- **最小源码修复**：在所有变更路由中隔离仓库 .git 目录：当解析后的源或目标是 `<root>/.git` 或其下时拒绝 create-file/create-folder/rename/move/delete（包括 worktree gitdir 等价路径）；只读操作可选加 `-c` 覆盖中和可执行配置，但核心修复是 .git 写入围栏。

### 4.14 [高] 变更操作经预存符号链接逃逸工作区——danger-full-access 下可在根外 rm -rf/创建/重命名/移动

- **指纹**：`nxe:mutate-symlink-escape`
- **源码位置**：`dsh-nano-explorer-extra/src/host/routes.js`:358（POST /delete (same shape as /create-file:297 /create-folder:310 /rename:324 /move:340)）
- **较低信任主体**：authenticated same-origin request passing connection.requestRejection plus a known sessionId (cross-session picking tracked separately as nxe:scopeof)
- **有界复现**：工作区外的文件/目录被以宿主用户身份删除、创建、重命名或移入工作区（已验证对 outside/victim 的 rm -rf）。
- **成立条件**：authenticated same-origin request passing connection.requestRejection plus a known sessionId (cross-session picking tracked separately as nxe:scopeof)；the session's sandbox policy mode is 'danger-full-access' — under workspace-write the platform seatbelt + checkedTarget fences deny the escape (verified); cold sessions inherit the deployment default mode；a symlink inside the workspace pointing outside it — pre-existing in a checked-out repo or planted by an earlier primitive/agent write
- **实际结果**：files/dirs outside the workspace deleted, created, renamed, or moved into the workspace as the host user (rm -rf of outside/victim verified)
- **影响**：已认证页面 JS 获得工作区外任意文件删除/创建/重命名/移动权限，5 个变更操作的 workspace confinement 控制被完全击穿。
- **优先级理由**：likelihood=medium（needs both a danger-full-access session (common once a user approves escalation, and the deployment default for cold sessions) and a workspace symlink pointing outside (common in repos, agent plantable)）；impact=high（authenticated page JS gains arbitrary file delete/create/rename/move outside the workspace as the host user — the workspace confinement control is fully defeated for all five mutation ops）。
- **最小源码修复**：在每个变更操作的最后可信决策点做规范化+包含性检查：fs.resolve 目标（创建类为父目录）、processPath 解析结果，并要求 isLexicallyInside(workspaceRoot, resolved)；在 removeEntry/createFile/rename/createFolder/moveEntry 中统一应用，不因 policy 模式而跳过，与 /read 的 resolved 复检保持一致。

### 4.15 [高] POST /nano-explorer-extra/read 把宿主任意 UTF-8 文件返回给同源调用者——客户端传 `allowOutsideWorkspace:true` 即跳过工作区围栏；/list 从不围栏

- **指纹**：`nxe:routes-read-arbitrary-file`
- **源码位置**：`dsh-nano-explorer-extra/src/host/routes.js`:439（/read route）
- **较低信任主体**：any script executing in the authenticated same-origin page (all plugin routes share only the connection.requestRejection gate: Host/Origin/sec-fetch-site plus HMAC HttpOnly cookie — per architecture.md no per-route authorization exists)
- **有界复现**：对工作区外文件返回 HTTP 200 `{ok:true,content:'TOP-SECRET-HOST-FILE\n'}`；/list 根目录返回 `{ok:true,entries:[...],resolvedPath:'/'}`；不带 flag 的同一 /read 返回 400 'outside the workspace'。
- **成立条件**：any script executing in the authenticated same-origin page (all plugin routes share only the connection.requestRejection gate: Host/Origin/sec-fetch-site plus HMAC HttpOnly cookie — per architecture.md no per-route authorization exists)；target file must decode as UTF-8 and be ≤1 MiB per call for /read (offset is fixed at 0); /list needs a readable directory
- **实际结果**：HTTP 200 {ok:true,content:'TOP-SECRET-HOST-FILE\n'} for an out-of-workspace file and {ok:true,entries:[...],resolvedPath:'/'} for /list of '/'; the same /read calls without the flag return HTTP 400 'outside the workspace'
- **影响**：以 DSH 宿主用户身份读取任意文本文件：SSH 配置/密钥、凭据库、会话数据、任意 ≤1MiB UTF-8 文件；/list 提供无限制宿主目录枚举——读取侧完全击穿文档化的工作区边界。
- **优先级理由**：likelihood=high（unconditional for the baseline authenticated same-origin principal; single POST with a public flag, no user interaction, races, or special state）；impact=high（arbitrary host text-file read as the DSH host user: SSH configs/keys, credential stores, session data, any UTF-8 file ≤1MiB; plus unrestricted host directory enumeration via /list — defeats the documented workspace boundary for reads）。
- **最小源码修复**：在宿主侧强制边界：彻底移除客户端可控 flag，/read 无条件执行词法+realpath 的工作区内校验；/list 同样加无条件 resolved 路径 confinement（当前完全没有）。若确实需要外部访问，用 session sandboxPolicy 模式或宿主侧显式授权——绝不用请求体。保留现有 1MiB/UTF-8 上限。

### 4.16 [高] scopeOf 解析任意已存在 sessionId——页面脚本可接管其他会话的工作区与沙箱策略

- **指纹**：`nxe:scopeof-cross-session`
- **源码位置**：`dsh-nano-explorer-extra/src/host/routes.js`:61（scopeOf）
- **较低信任主体**：same-origin page script (any plugin bundle or injected script in the dsh web page)
- **有界复现**：用真实 createRoutes handler 复现：外部活动会话 id 读取受害者文件成功；外部冷会话 id 在默认策略下读取成功；/status 返回外部工作区根；不存在 id 报 'unknown session' 失败关闭。
- **成立条件**：same-origin page script (any plugin bundle or injected script in the dsh web page)；attacker needs another session's id — visible in shared-workspace listings, window.__nsw seams, other plugins' UI, DOM, or leaked via session index
- **实际结果**：foreign session's workspace file/git operations succeed; cold sessions resolve under the default sandbox policy rather than the owner's grant
- **影响**：可对另一会话执行完整工作区文件/git 操作，包括选择最弱的每会话 sandboxPolicy——跨会话/跨主体数据访问。
- **优先级理由**：likelihood=medium（needs a foreign session id — obtainable via shared listings, window seams, DOM; ids are unforgeable UUIDs so guessing alone fails）；impact=high（full workspace file/git ops in another session including selection of the weakest per-session sandboxPolicy — cross-session/cross-principal data access）。
- **最小源码修复**：把请求绑定到拥有页面上下文的会话：在会话/页面附着时以不可伪造的每会话 token 下发给页面，scopeOf 拒绝不匹配的 id；或限制路由只访问调用者 principal 创建的会话。

### 4.17 [中] 构建脚本回退到 `npx --yes esbuild@0.25.0`：构建期从 registry 拉取工具链且无仓库锚定完整性校验

- **指纹**：`dsh-plugins/esbuild-npx-unpinned`
- **源码位置**：`dsh-nano-notepad/scripts/build-client.mjs`:23（esbuild resolution）
- **较低信任主体**：同源页面脚本 / 远程桶写入者（见原记录 conditions）
- **有界复现**：本地 esbuild 缺失时四个插件的 build-client.mjs 均会联网执行 npx 拉取的 esbuild，编译产物直接进入发布 tarball；未执行 registry 投毒演练（机制为源码确证）。
- **成立条件**：node_modules/.bin/esbuild absent while the other build inputs (dsh-performance-review, dsh-nano-ui, dsh-s3-client) are installed and resolvable — e.g. npm install --omit=dev, a pruned/partial install, or a broken .bin/esbuild link. A bare clean checkout also takes the npx branch but fails after the fetch because those entries are missing, so it is not a successful release path.；registry/mirror compromise, or poisoned npx _npx cache, serves modified bytes under the unchanged version 0.25.0；no .npmrc pins a trusted registry; the user's npm config controls the fetch endpoint
- **实际结果**：Source-verified control flow only: with node_modules/.bin/esbuild absent the script spawns `npx --yes esbuild@0.25.0` with no repo-anchored hash check, and npx does not consult the package-lock; the documented npm install path selects the local pinned binary instead. No registry attack or real release was performed locally. A clean checkout with no node_modules raises the npx fetch but fails at the first missing node_modules build entry, so artifact contamination is conditional on the fallback environment having the other build dependencies installed.
- **影响**：被拉取的二进制以构建者身份执行并生成随每个 tarball 分发的 lib/client.js 与宿主 bundle，一次投毒污染全部下游安装并驻留 npx 缓存。
- **优先级理由**：likelihood=low（requires registry/mirror compromise or npx cache poisoning plus a nonstandard build tree that has the file: dependencies but lacks the pinned esbuild binary; the documented npm install build path installs esbuild and uses the local binary, so the vulnerable fallback is not the normal release path.）；impact=high（when triggered, the registry-fetched tool executes native code as the build user and authors or overwrites the lib/client.js and host bundles shipped in release tarballs; a poisoned fetch can contaminate every downstream dsh web profile install (conditional on a release build being packaged in that environment).）。
- **最小源码修复**：删除静默联网回退：要求使用 lockfile 固定的本地 esbuild，缺失即失败；或对回退版本做摘要校验（npm ci 后固定 sha512），并在发布流程中先 `npm ci` 再 `npm run build`。

### 4.18 [中] 发布链打包 git 未跟踪产物：生成的 lib/ 与其源文件均未入库、无完整性闸门，发布 tarball 与 tag 声称的提交不一致

- **指纹**：`dsh-plugins/release-untracked-artifacts`
- **源码位置**：`release.md`:42（packaging flow）
- **较低信任主体**：同源页面脚本 / 远程桶写入者（见原记录 conditions）
- **有界复现**：`lib/s3-sync-host.js`、`packages/dsh-s3-client/`、`src/client/{sync,cloud-settings}.js`、`packages/dsh-nano-ui/src/tabs.js` 等被打包但未跟踪；`lib/client.js` 相对 HEAD 有 229 行未提交改动；仓库无 `.github/workflows/`，release.md 的 CI 信任链只是文档。
- **成立条件**：the worktree carries the uncommitted S3/cloud-sync feature: lib/s3-sync-host.js and several sources untracked, lib/client.js differs from HEAD by 229 insertions/57 deletions, so any pack ships uncommitted code；no .github/workflows/ exists, so the documented CI build/attestation chain cannot run; the only executable release path is a manual local `npm run build` + `npm pack` on a dev worktree
- **实际结果**：The worktree pack includes untracked lib/s3-sync-host.js (28,063 B) and a dirty 239,211-byte lib/client.js; a clean HEAD checkout has neither the S3 sources nor the S3 bundle, and its build output (198,507 bytes, byte-identical to HEAD's committed lib/client.js) does not match the shipped client. The packed tarball therefore diverges from the commit/tag it would be released under, with no source-visible mechanism to detect it.
- **影响**：发布产物可静默偏离已提交源码；按该 tag 干净检出无法重建产物（源缺失），provenance 不可验证，篡改或过期 lib/ 可随发布流出而不被发现。
- **优先级理由**：likelihood=medium（requires local write access to the release worktree or an undisciplined manual pack; no remote vector）；impact=high（a published package can silently contain code that is absent from the reviewed commit; tag->tarball provenance is unverifiable）。
- **最小源码修复**：把全部随包源码纳入版本控制，使 tag 能重建 lib/；补齐 release.md 所述的 CI（tag 检出上 `npm run build && npm pack`），打包前强制重建并校验 lib/ 与重建结果一致，发布 SHA256SUMS/attestation。

### 4.19 [中] POST /nano-notepad/read 无目录 confinement，可返回宿主任意可读 `*.md` 文件（受扩展名限制，并非任意文件读取）

- **指纹**：`nano-notepad/read-arbitrary-md-read`
- **源码位置**：`dsh-nano-notepad/index.js`:233（POST /nano-notepad/read handler）
- **较低信任主体**：authenticated same-origin Harness page JS (connection.requestRejection admits only trusted Host/Origin + browser-auth/API peer; unauthenticated and foreign-origin requests are rejected)
- **有界复现**：真实 handler 复现：工作区外的绝对路径 .md 与 scratch .md 返回 200 + 内容；`/etc/hosts`、非 md、指向非 md 的符号链接均被拒绝。
- **成立条件**：authenticated same-origin Harness page JS (connection.requestRejection admits only trusted Host/Origin + browser-auth/API peer; unauthenticated and foreign-origin requests are rejected)；any *.md\|*.markdown file readable by the host process UID, <= 2 MiB
- **实际结果**：Contents of an arbitrary out-of-tree .md file (repo AGENTS.md) and scratch .md files returned with 200; /etc/hosts and non-md/symlink-to-non-md rejected — reproduced via the real handler under env -i in scratch
- **影响**：任意单文件泄露，但限定 `*.md/*.markdown` 且 ≤2 MiB/次；md 中可能含敏感信息，但凭据存储通常因扩展名被挡住。
- **优先级理由**：likelihood=high（unconditional for the baseline page principal; any same-origin script can invoke it）；impact=medium（arbitrary single-file disclosure but bounded to *.md/*.markdown <= 2 MiB per request; secrets in md files plausible but credential stores are extension-filtered）。
- **最小源码修复**：在 readMarkdown 的最后可信决策点做 realpath 后的允许根集合校验（resolve + 分隔符前缀），保留扩展名/realpath/isFile/大小检查；更强方案是由宿主签发不透明 token 代替自由路径。

### 4.20 [中] acquireClaim 对 `claims/{sessionId}.json` 做无保护的读-改-写：并发 push 静默产生混合写入者的会话产物（无 CAS/etag、无 fencing token）

- **指纹**：`nsw:acquireClaim-rmw-no-cas`
- **源码位置**：`dsh-nano-shared-workspace/src/host/routes.js`:324（POST /sessions/claim）
- **较低信任主体**：同源页面脚本 / 远程桶写入者（见原记录 conditions）
- **有界复现**：用真实 acquireClaim/renewClaim/pushSession + 内存 S3 复现：互斥被静默击穿（双方继续且都自认 owner）、持久化会话产物把一方字节放在另一方 meta.json 下（静默错误归属）、共租户可用一次无条件 PUT 窃取/挂起活动租约（受害者 renew/acquire 直到 TTL 过期都失败）。
- **成立条件**：Two or more members of the same shared workspace (shared S3 bucket credential), each syncing the same sessionId — e.g. one session pushed from two replicas after a heartbeat/push-timer overlap.；The two claim GETs must both complete before either PUT lands; any network/scheduling jitter between GET and PUT opens the window (demonstrated deterministically).；Theft variant additionally needs a workspace co-tenant (any holder of the shared bucket access key) willing to PUT claims/{sessionId}.json directly; no per-member object scoping exists to stop it.
- **实际结果**：Mutual exclusion silently defeated (both writers proceed; each believes itself owner), persisted session artifact mixes one member's bytes under another member's meta.json (silent transcript misattribution), and a co-tenant can steal/suspend an active lease with one unconditional PUT; the victim's renew/acquire fail until TTL expiry. Demonstrated with claim-race-demo.mjs against the real acquireClaim/renewClaim/pushSession and an in-memory S3 implementing the src/host/s3.js surface.
- **影响**：真实边界破坏（租约是成员间显式单写者控制），已演示静默完整性损害 + 锁出/窃取；因所有成员本就对整个桶有无限写权限，未获得更高特权，故有界。
- **优先级理由**：likelihood=medium（Requires ≥2 members racing a claim/push on one session (plausible across the 30s heartbeat / 60s push cadence and multi-machine use), or an active co-tenant for theft. Demonstrated to occur under ordinary scheduling jitter on the majority of simulated interleavings.）；impact=medium（Real boundary violation (the lease is the explicit single-writer control between distinct member principals) with demonstrated silent integrity damage — one member's transcript persisted under another member's meta — plus lockout/theft. Bounded because all members already share unconditional write authority over the whole bucket and no higher privilege is gained.）。
- **最小源码修复**：用现有客户端已支持的 conditional write 做租约 CAS：getJson 暴露 etag（或加 headJson），acquire 用 If-None-Match:*（不存在）/If-Match:<etag>（接管/续租），conflict 即视为租约被占并重读一次；把 heartbeatRev 作为 fencing token，在 meta PUT 前再次校验租约 etag；对不支持条件写的后端保留降级模式但显式标记 best-effort。

### 4.21 [中] /nano-shared-workspace/ls 与 /mkdir 接受任意绝对路径：可枚举宿主目录并在任意可写位置创建目录

- **指纹**：`nsw:ls-mkdir-any-absolute-path`
- **源码位置**：`dsh-nano-shared-workspace/src/host/routes.js`:406（POST /nano-shared-workspace/ls）
- **较低信任主体**：Same-origin script on the dsh web origin holding the session cookie (the plugin's own client, or injected/XSS JS); requestRejection fences cross-site/CSRF but not same-origin JS
- **有界复现**：ls('/etc') 返回 23 个目录项；ls('~/.ssh') 返回 ['agent','sockets']；mkdir 创建 /tmp/nsw-litter-<pid> 与 scratch 目录。mkdir 仅单层（含 '/' 或 '..' 被拒，缺父目录 ENOENT）；ls 只返回目录+符号链接，不含普通文件与内容。
- **成立条件**：Same-origin script on the dsh web origin holding the session cookie (the plugin's own client, or injected/XSS JS); requestRejection fences cross-site/CSRF but not same-origin JS；dsh-nano-shared-workspace host plugin installed and active; /ls and /mkdir exist specifically because the directoryPicker browse backend is not composed on every instance
- **实际结果**：ls('/etc') returned 23 directory entries; ls('~/.ssh') returned ['agent','sockets']; mkdir created /tmp/nsw-litter-<pid> and a scratch litter dir. mkdir is single-level only: name with '/' or '..' rejected; missing parent yields ENOENT. ls returns directories+symlinks only, no regular files, no file contents.
- **影响**：宿主文件系统结构枚举（含隐藏目录名，如 ~/.ssh 内容）+ 任意可写位置单层目录创建；无文件读写、mkdir 非递归、ls 过滤普通文件。
- **优先级理由**：likelihood=high（Unconditional for the page principal — any same-origin JS can call it; no workspace join, identity config, or user interaction needed）；impact=medium（Host filesystem structure enumeration (directory names incl. hidden, e.g. ~/.ssh contents) plus single-level directory creation at arbitrary writable locations; no file read/write, mkdir is not recursive, regular files are filtered from ls output）。
- **最小源码修复**：把 picker 路径限制在 $HOME（或显式根白名单）而非任意绝对路径；保留以 homedir 为根的选盘体验；长期应优先使用宿主 directoryPicker 后端并删除影子路由。

### 4.22 [中] 远程 meta.json 的 committedBytes 驱动无界抓取+缓冲+zstd 解压：被投毒的桶对象可耗尽内存/磁盘

- **指纹**：`nsw:remote-meta-unbounded-fetch-decompress`
- **源码位置**：`dsh-nano-shared-workspace/src/host/routes.js`:447（POST /nano-shared-workspace/materialize）
- **较低信任主体**：同源页面脚本 / 远程桶写入者（见原记录 conditions）
- **有界复现**：真实函数本地运行：单个 192MiB part 使 RSS +385MB（解码前）；18KiB 帧解出 7.7M 对象、RSS +793MB；committedBytes=16GiB 计划 262,144 次请求；同步解压阻塞事件循环。
- **成立条件**：Attacker holds shared-bucket write credentials (v1 model: all workspace members share the bucket/prefix and can PUT objects under any workspaces/{id}/sessions/{id}/ prefix; writerId is only checked on push, never on read).；Attacker plants meta.json (committedBytes chosen freely) plus one or more oversized or high-amplification zstd body parts under a session prefix the victim can list.；Victim clicks the planted remote session row (auto-listed by listRemoteSessions) or opens the transcript view.
- **实际结果**：Host process buffers every part, copies the body via Buffer.concat, fully zstd-decompresses to a string, parses per-line JSON, and writes the decoded body to disk — all unbounded. Local run on the real functions: +385MB RSS for one 192MiB part (pre-decode), +793MB RSS and 7.7M objects for an 18KiB frame, 262,144 planned requests for committedBytes=16GiB. Escalating sizes reaches host memory/disk exhaustion; synchronous decompress also blocks the event loop.
- **影响**：进程级内存耗尽/OOM 崩溃与物化正文导致的磁盘增长；仅本地实例可用性损失，影响范围有界，无代码执行与数据外泄。
- **优先级理由**：likelihood=medium（Requires shared-bucket write access (all v1 members have it) plus one victim click on an auto-listed session row; the row needs no convincing UI — it appears like any remote session.）；impact=medium（Process-level memory exhaustion / OOM crash of the victim's dsh host and disk growth from the materialized body; local-instance availability loss only, bounded blast radius, no code execution or data exposure.）。
- **最小源码修复**：在读入口与循环内加硬上限：拒绝非安全非负整数或超过 MAX_COMMITTED 的 committedBytes；强制 64KiB/part 契约；累计字节超限即中止；用 zstdDecompressSync 的 maxOutputLength 限制解压后大小；先校验 formatVersion 再抓取；优先流式写盘而非 buffers[]+concat。

### 4.23 [低] 远程同步的 .json 笔记正文触发 validateJson 无界递归 RangeError，导致 nano-notepad 渲染崩溃（拒绝服务）

- **指纹**：`notepad:validateJson-unbounded-depth-RangeError-DoS`
- **源码位置**：`dsh-nano-notepad/src/client/sync.js`:198（createSync().pull()）
- **较低信任主体**：同源页面脚本 / 远程桶写入者（见原记录 conditions）
- **有界复现**：node v24.22.2 + 逐字 json.js：深度 10000（约 20KB payload）抛 `RangeError: Maximum call stack size exceeded`；5000 正常；原生 JSON.parse 到 500000 无碍；renderJsonTree 在 20000 崩溃；detached renderBody 路径无 catch，重复渲染会反复产生未处理 rejection。
- **成立条件**：victim enabled cloud sync (s3Enabled true; default false per db.js:23) bound to an S3 endpoint the attacker can also write；attacker holds write permission on the victim's sync bucket/prefix (bucket co-tenant, stolen key, or compromised endpoint) — same-origin page JS cannot reach this path；attacker bumps manifest rev and uploads files/<id>.md containing ≥~10k nesting levels with a '.json' entry.name; overwriting an existing local id hits the currently open note with no user interaction
- **实际结果**：Under node v24.22.2 on the verbatim json.js: RangeError 'Maximum call stack size exceeded' at depth 10000 (payload ~20KB); ok at 5000; native JSON.parse unaffected through 500000; renderJsonTree RangeError at 20000. Source trace shows no catch on the detached renderBody path → repeated unhandled rejections and a dead editor surface for the poisoned note each render
- **影响**：单个浏览器源内某插件编辑面的可用性损失：被投毒笔记每次渲染产生未处理 RangeError，无代码执行、无跨笔记数据丢失、同步引擎不受影响，删除笔记即可恢复。
- **优先级理由**：likelihood=low（requires write access to the victim's own configured S3 sync bucket — an opt-in feature (default off) that assumes a private bucket; deterministic and interaction-free once that precondition holds）；impact=low（availability of one plugin's editor surface in one browser origin; unhandled RangeError per render of the poisoned note, no code execution, no cross-note data loss, sync engine unaffected, recoverable by deleting the note）。
- **最小源码修复**：限制递归并收敛失败：validateJson 的 parseValue 增加深度参数（超过约 1k 返回现有 fail 形状），renderJsonTree 与 collapse-all 同样限深或改显式栈；renderBody 的 JSON lint/tree 段包 try/catch，异常时渲染 jsonInvalid 占位；applyRemoteFiles 用 fileName() 规范化远程名。

### 4.24 [低] GET /nano-explorer-extra/perf-review/host?mode=window 排空进程级 perf 窗口——任意同源页面脚本可清除其他会话样本并读取跨插件计时数据

- **指纹**：`nxe:perf-review-window-drain`
- **源码位置**：`dsh-nano-explorer-extra/src/host/routes.js`:400（GET /nano-explorer-extra/perf-review/host）
- **较低信任主体**：Any same-origin page script that passes connection.requestRejection (Host/Origin fence + authenticated peer) — no sessionId or additional role required.
- **有界复现**：真实路由 handler 复现：第一次 ?mode=window 返回外部 pluginId（'other-plugin' 与 nxe git-status）样本并清空所有窗口；第二次调用 n:0/samples:[]；默认快照继续暴露累计 reservoir 样本。
- **成立条件**：Any same-origin page script that passes connection.requestRejection (Host/Origin fence + authenticated peer) — no sessionId or additional role required.；Host process started with DSH_PERF_REVIEW=1 (enabled on this machine's dev instance per docs/code-review/26-nov/performance-alpha.md §machine note; default-off otherwise). With it unset the drain is a no-op returning empty windows.；Window samples only exist while perf-instrumented routes ran recently (cap 512 samples/span); the cumulative reservoir is always readable via default snapshot mode while enabled.
- **实际结果**：Reproduced locally by invoking the real route handler: first ?mode=window call returned samples recorded under a foreign pluginId ('other-plugin' list + nxe git-status) and cleared every window; a second call observed n:0 / samples:[] for all plugins; default snapshot continued to expose cumulative reservoir samples.
- **影响**：数据仅为 span 计时与插件版本（无用户内容）；破坏性排空污染可观测性窗口，但同源页面 principal 已通过会话级变更路由拥有更大权限。
- **优先级理由**：likelihood=medium（Unconditional for any same-origin page principal once enabled, but requires DSH_PERF_REVIEW=1 on the host (default-off, enabled on dev/lab deployments) and a script already running in the origin.）；impact=low（Data is span timings and plugin versions only (no user content); destructive drain corrupts observability windows but a same-origin page principal already has far greater powers via the session-scoped mutation routes.）。
- **最小源码修复**：像同级路由一样用 scopeOf() 要求 sessionId（挡住匿名/偶发调用者），并把破坏性 mode=window 排空置于显式运维开关之后（进程级缓冲无法按会话隔离，需库层改造）。

## 5. NEEDS VALIDATION

本次运行**没有 `needs_validation` 记录**：所有候选都在源码与本地有界证据范围内得到了确认或否定，没有需要部署侧补充事实的阻塞项。

## 6. 加固建议与正面模式

### 6.1 结构性加固（优先于单点修复）

- **建立真正的路由授权层**：当前 19+ 条宿主路由共享唯一一道 `connection?.requestRejection`。应按「会话 → 路由」签发不可伪造的 capability，并让每个路由在最后可信决策点校验 `sessionId` 属于调用者；`scopeOf` 的跨会话问题（`nxe:scopeof-cross-session`）与 explorer 的多条路由同源。
- **把远程序列化数据当作不可信输入**：S3 marker/manifest/meta 的每个字段（`member.localPath`、`workspaceId`、`sessionId`、`committedBytes`、file `id`、image `mime`）都要在消费点做类型/字符集/范围/大小校验；不要用「远程数据里自证的 id」当完整性校验。
- **统一 HTML 清洗为一次 DOM 白名单**：当前同时存在客户端 `sanitizeRichHtml`、宿主 `sanitizeMpHtml`、以及直接 `innerHTML` 的图片/属性拼接三条路径，任何一条漏掉都会成为 XSS。建议抽出一个共享的 allowlist sanitizer，宿主与客户端复用。
- **构建期完整性**：把 `lib/` 的生成源全部入库，CI 在 tag 上 `npm ci && npm run build && npm pack`，并对发布物生成 SHA256/attestation；`npx` 回退要么删除，要么做 digest 校验。
- **凭据不入工作区**：`/imagine` 的 `$HOME/.grok` 复制、notepad 的 S3 profile 持久化、shared-workspace 的 S3 密钥都应留在 host credentials service，页面只拿 masked 值或短期句柄。

### 6.2 来自各覆盖单元的加固笔记（非发现）

- no drift check between committed lib/* and src/*
- join()/configure caps + first-writer guard missing
- __nsw never deleted on unload; gate behind dev flag
- __nanoNotepad debug handles beyond documented import API
- open-in-app forwards workspace paths (user-gesture only)
- unquoted ${binary} path in template; EXTRA_PATH prepends ~/.local/bin
- requestRejection ?. fail-open idiom consistent across plugins
- cp 2>/dev/null swallows seeding failures silently
- kept <base>/<noscript>/<template>/MathML; img/video/audio auto-fetch attacker URLs; http images lack referrerpolicy
- <body onload> input makes doc.body null -> sanitizer crashes for that file
- applyRemoteFiles graft: parentId cycles theoretical overflow
- BroadcastChannel trusts any same-origin poster for reload+render
- __nanoNotepad.settings()/cloud()/dbSettings() expose sync internals to page scripts
- previewFile should strip .. even if host confines
- attachNotepadCtas trusts injected card DOM; !event.isTrusted check
- __nanoNotepad read seams cheap to gate
- ledger persist-failure crash + host span-map cap = hardening; listObjects pagination unbounded; renderMarkdown unescaped producers
- errors echo absolute paths + git stderr (subsumed by arbitrary-read)
- watchers/memo unbounded across distinct sessionId roots — handle accumulation
- stats follows symlinked dirs for counts
- no concurrency bound on spawned git/mv/rm children
- /list allowOutsideWorkspace is dead code that misleads reviewers
- osascript argv not interpolated (save dialog verified safe); dialog-spam same-principal
- realpath->stat->readFile TOCTOU needs same-host fs writer (stronger principal)
- S3Error echoes ~200 chars remote body to page (read channel for page-controlled endpoint)
- parseEnvFile ignores export/quotes/expansion; operator-local file
- MP_MAX_HTML_BYTES enforced post-buffer
- s3/object key check rejects .. and >512; real exposure is page-controlled profile
- GET /settings echoes maskedSecret (first-4…last-4) and /settings/test is a credential-validation oracle: Any same-origin script reads 8 chars of the stored S3 secret (routes.js:44-46,106) and can confirm/rotate candidate creds via a real signed LIST (130-152). Weakens brute-force resistance of the S3 secret.
- Route gate is fail-open: connection()?.requestRejection(req): routes.js:489 — if the connection service is absent (inject lists it, but ctx.get is the lookup) the optional chain yields undefined → request admitted. A missing service silently disables the only auth boundary on all 19 routes.
- window.__nsw dev seam exposes the full client face: src/client/index.js:415 — {store, ctx, face} on window gives any page script the whole plugin face + ctx handle (sessions, workspaces, uiWorkspace); also auto-runs the graft wiring. Ship behind a build flag.
- listRemoteSessions does unbounded remote-driven N+1 GETs: session-io.js:259-269 — remote prefix count controls GET fan-out on GET /sessions; combine with the committedBytes finding's caps.
- parseListXml parses remote XML with regex: s3.js:115-121 — <Key>/<Prefix> extracted by regex from untrusted bucket XML; encoded/edge-case XML can inject fake key names (no entity decoding).

### 6.3 正面源码模式

- `dsh-nano-shared-workspace/src/host/s3.js` 对每个 key 段做 `encodeSegment` 并在签名时使用 `url.pathname`——这是 `packages/dsh-s3-client` 原始插值应当对齐的正确做法。
- `dsh-nano-notepad` 的 `osascript` 保存对话框以 argv 传参、不做 shell 插值（本轮验证为安全）。
- explorer-extra 的 `/read` 在**不**开启 `allowOutsideWorkspace` 时能正确执行词法+realpath 双重围栏——说明边界代码存在，问题在于可被请求体关闭。
- 各插件统一使用 `connection.requestRejection` 做 Host/Origin 围栏，跨站与 CSRF 面已被有效收敛。

## 7. 覆盖总结

| 指标 | 数值 |
|---|---|
| 覆盖单元 | 11（candidate=11；candidate = 已产出候选并完成处置） |
| 候选指纹 | 34（confirmed=24 / needs_validation=0 / rejected=10） |
| 最终覆盖率 critic | clean，`stop: true` |
| 已覆盖 / 候选 / 阻塞 / 延后 | 11 / 11 / 0 / 0（每个单元均完成候选处置，无 unresolved） |
| 被拒绝的候选 | 见 §7.1（仅用于解释覆盖决策，不作为发现） |

### 7.1 被拒绝的候选（不作为发现）

| 指纹 | 拒绝理由（摘要） |
|---|---|
| `dsh-nano-shared-workspace/client/window.__nsw-page-global-seam` | Same-principal self-impact: a same-origin page script already possesses (a) fetch() to every /nano-shared-workspace/* route under the identical admission gate — pull/push/materialize/claim included, (b) DOM authority over the plugin's grafted UI including synthetic clicks, and (c) access to the app's existing page globals. __nsw adds convenience, not capability: face mirrors fetch, store holds no secrets (only maskedSecret), and ctx hands out in-realm client service references whose effects ride the app's own transports — no new transport, credential, or cross-principal reach. The anti-pattern guard applies: a same-origin script driving host routes it could already POST to is not a new boundary crossing, and UI gating is not a security boundary vs in-page JS. Residual hygiene note (not a finding): removing or scoping the seam and the ctx handle is reasonable hardening/debug hygiene, but nothing demonstrated exceeds ambient page authority. |
| `dsh-s3-client/locate-raw-key-signature-divergence` | Divergence confirmed empirically (agents/v-sigdiv/artifacts/repro-output.txt): for key 'a?x=1' the signed canonical URI is /a%3Fx%3D1 while the wire request-target is /a?x=1; '../escape.txt' signs /../escape.txt but fetches /escape.txt; 'a%2Fb' signs /a%252Fb but fetches /a%2Fb; backslash signs %5C but fetches /; tab is stripped from the wire path; '()*!+' are sent raw while signed encoded. But the claimed security consequence is impossible by construction: an S3 server recomputes the canonical request from the request-target it RECEIVED, so the signature is always verified against exactly the path the server is about to serve. Divergence therefore yields deterministic SignatureDoesNotMatch (403 fail-closed), never an accepted signature bound to a different object — 'sign A, fetch B' would require server_canonical(B) == signed(A), which is the equality case, i.e. no divergence. Traversal variants fail doubly: the caller filter rejects literal '..', and WHATWG-normalized %2e%2e/.. keys still produce a signature mismatch (and path-style normalization cannot leave the bucket segment). The shared-workspace s3.js client avoids the issue by pre-encoding segments and signing url.pathname. |
| `nano-notepad:changed-files-card-openResource-traversal` | The candidate's entrypoint is wrong. A remote-synced note name never reaches openResource: the only openResource dispatch (previewFile) is called solely with DOM textContent scraped from the host shell's [data-changed-files] card (the agent's own edited-file list), not from S3/notepad node.name. S3 remote names land only in IndexedDB node.name (db.js:645) and are used for display/rename/manifest — never fed to previewFile. Moreover, the dsh-resource:// address is parsed into sessionId+workspace-relative path and handed to the host workspace-files backend, whose API explicitly states 'files outside it are allowed' — outside-root file resolution is intended read authority, not a notepad confinement defect. No remote-controlled name reaches a path open; the described bucket-writer attack does not reproduce. |
| `notepad:img-datasrc-javascript-src` | the promotion carries the URL into an <img> element, and Chromium never executes javascript: as an image source — an <img src="javascript:..."> only produces a load error, no script execution. The headless-Chrome battery run under the sibling sanitizer verification exercised <img data-src> variants and observed no execution; javascript: execution requires a navigation-capable sink (anchor/iframe), not an image loader. No boundary crossing, no execution primitive. |
| `notepad:md-inline-link-js` | the inline-link regular expression only matches https?:// targets, so a javascript: URL never reaches the <a href> branch — the whole construct falls through to escapeHtml text output. Not reachable as described; verified by reading the single pattern at markdown.js:141 that both link and image branches share. |
| `notepad:meta-refresh-javascript` | Rejected as stated: the <meta> element does survive the denylist, but Chromium ignores javascript: (and data:) URLs in a meta refresh — the verifier's real-Chrome battery recorded no execution for those variants. The surviving-<meta> behavior is nevertheless a genuine issue in its http(s) form (remote navigation / phishing) and is already carried by the confirmed findings notepad:sanitizeRichHtml-keeps-js-href-active-dom and nano-notepad/sanitizeMpHtml-active-content; this fingerprint adds no separate executable primitive. |
| `nsw:sessions-bind-missing-authorization` | Refuted by live reproduction against the real shipped handler (lib/host.js re-exported under env -i) driving a real WorkspaceRegistry entity (dsh-workspace 0.2.2-rc.1) with an in-memory S3 mock. (a) Wrong payload: the route requires {path, sessionId}; the candidate's {sessionId, workspaceId} payload returns {ok:false, 'path and sessionId are required'}. (b) Ownership IS checked: POST {path:replicaDir, sessionId:'session-foreign'} returned 400 'cannot attach session ... its cwd resolves to .../victim-project' and left the workspace account empty — the cwd-equality check inside attachSession is precisely the ownership proof the candidate claims is missing (the workspace resolved by path must equal the session's own cwd, which only the session's true owner directory satisfies). (c) No exfil channel even when bind succeeds: pushSession/syncAll gate uploads solely on remote marker member.localPath containing the session's on-disk header.cwd via matchWorkspace; the bound workspace account is never consulted — bound session + no claiming marker produced skip:not-shared with zero S3 keys. The transcript-exfil primitive that exists (a marker member.localPath claiming a foreign cwd, via /wor |
| `nxe:gitcommand-page-controlled` | every git invocation uses a literal argv array (no shell), the branch name is rejected if it starts with '-', the commit message is bound to --message as a value, and the child environment strips the GIT_* variables that could redirect the repository or inject config. The verifier's live probe confirmed ambient GIT_CONFIG_PARAMETERS never reaches the spawned git. The real .git-write primitive in this plugin is a different vector (assertInside's lexical check allowing .git/ edits followed by `git add --all`), tracked as the confirmed finding nxe:git-config-filter-exec. |
| `nxe:memo-client-key` | the cache key always includes the resolved workspace root, and the cached value is exactly the Git status of that root + that path — a caller can only pre-populate the answer for its own workspace directory, which it could read anyway. There is no cross-root key reuse (root is a fixed absolute path per session), and entries live 3 seconds and are dropped on rejection or checkout change. Same-principal self-impact only. |
| `perf-review:join-pluginid-forgery` | The mechanism reproduces (join accepts any pluginId, merges impl into the victim's row, no identity binding), but the security claim fails: pluginId confers zero cross-plugin authority. The alleged 'reading its spans' needs no join — report() drains all plugins for any caller and _state() exposes the raw data; 'forging spans' is a strictly weaker capability than the direct mutation window.__perfReview._state() or object reassignment already permits any same-origin script. The singleton is a cooperative, off-by-default debug channel whose output is only consumed as human/lab diagnostics; nothing treats the report as trusted input, so poisoning it degrades no security property. Rejected per the audit's own guidance: pluginId is a local label with no cross-plugin authority. |

### 7.2 明确排除 / 延后

- **部署侧配置与拓扑**（Caddy 反代、token broker、launchd、三实例隔离）不在仓库内，未作为假设纳入；需要部署事实的候选若无法本地判定，本应进入 `needs_validation`——本轮没有此类记录。
- **真实外部服务**（mp.weixin.qq.com、真实 S3 端点、xAI API）未被访问；相关结论均来自源码 + 本地 mock/环回复现。
- **未覆盖**：`context/` 参考检出（git 忽略，不属于产品代码）；桌面版 `~/.dsh-desktop` 运行时状态；非仓库内的第三方依赖实现（仅按调用面审查）。
- 说明：`nano-notepad:remote-manifest-attr-xss`（hunter-i）与 `notepad:sync-manifest-id-unescaped-attr-xss` 为同一根因，已合并为后者，不单独计数。

---

报告生成时间：2026-11-11T12:18:41.820Z；记录来源：`findings.json`（34 条，validator PASS）。
