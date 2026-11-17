# dsh-plugins 安全审查复核报告（security-audit-1118）

> 复核对象：`.agents/security-audit/261117` 安全审查（第一轮二批，audit ref `fb7264d`）的全部 27 条 security-claim（23 confirmed / 3 needs_validation / 1 rejected）
> 复核类型：HEAD 漂移复核——**不做新 hunt**，只对既有 claim 做「git 历史沿革 + 爆炸范围」双分析
> 复核时间：`2026-11-18`
> 复核人：`DeepSeek Harness security-audit agent（三路并行台账子代理 + 主代理整合）`
> 源码基准：审查基准 `fb7264d` → 复核基准 `230ad45`（HEAD，+82 commits，`fb7264d` 之后 2026-11-17 18:00 → 11-18 00:54）
> 执行边界：仅源码与 git 历史（`git log --follow`/`git log -S`/`git diff`/`git show`）；无运行时探测、无部署面探测
> 文档状态：`re-review-open`（24 open / 1 fixed / 1 rejected 维持 / 3 needs_validation 维持；详见文末覆盖总结）

---

## 1. 复核概况

| 项目 | 内容 |
|---|---|
| 复核范围 | `findings.json` 全部 27 条：DNN 6、DNMS 2、DNMSC 1（构建链）、DNEE 2+1（imagine creds）、DNK 3、DNT 4、DNLS 6、DNCS 2、repo 工具链 1 |
| 复核方式 | 每条 claim 两个固定分析：①**git 沿革**（引入 commit、扩张/修复轨迹、`fb7264d..HEAD` 差异、当前 HEAD 状态 open/mitigated/fixed/needs_reverify）；②**爆炸范围**（当前 HEAD 下 sink 联动的机制面 + 与其他 claim 的共享根因） |
| 并发约束 | 三路并行台账子代理（≤3，与前一轮约束一致），主代理整合成文 |
| 判定状态集 | `open` / `fixed` / `rejected 维持` / `needs_validation 维持`；`open` 内再细分「影响收窄但根因未动」「比原记录更宽」 |
| 台账对照 | `security/accepted-risks.json`、`lib/bindings.js` BINDING_TABLE justification、`security/route-sensitivity.json` 与实现逐条对账 |

核心结论：**82 个提交里只有 1 条 claim（`dnls.open-unrestricted-navigate-scheme`）被实质关闭**；5 条 claimed-hardening 落在死代码或不执行面（台账虚假安全感）；DNT keep-alive 重构与 ACE-1117 把 3 条旧 claim 的影响面**扩宽**而非收窄。

## 2. HEAD 漂移影响摘要（fb7264d → 230ad45）

| 类别 | 条目 | 结果 |
|---|---|---|
| **实质关闭** | `dnls.open-unrestricted-navigate-scheme` | `9b6287f`（repin 39feadf 适配层）引入 `navigationUrl()`：trim + 无 scheme 自动补 `https://` + `new URL` 解析 + 仅 http/https + 禁 userinfo；`javascript:`/`data:`/`file:` 在进 CDP 前 400 |
| **影响收窄但 open** | `dnms:async-compact-unauthz`、`dnms:async-history-unbound` | ACE-1117 P1/P4/P5：`summaryPrompt` 退役为 `extraRequirements`（append-only ≤4000 + `promptVersion` sha256 指纹）；`compact-runtime` 删 `latestSession` 兜底改严格 session 作用域。route-guard 零改动，根因仍在 |
| **影响扩宽但 open** | `dnt-ws-v1-unbounded-write-buffer`、`dnt:unclamped-resize-wasm-mirror-dos`、`dnls:term-sessions:unbound-sessionid-keying` | DNT v2 重写（stall/align/SNAP_LIMIT）只改 v2 面、v1 逐字节未动；resize 重构新增 `resizeBox` win32 ABI（缺陷面+1）；A9 的 MCP `term.session.*` 面**绕过 ws token 全程**（比原记录多一跳） |
| **逐字节未动** | 其余全部 | 原复现路径仍完整在跑（`git diff fb7264d..HEAD` 对 `s3-sync.js`、`pipeline-s3.js`、`fx-bridge.js`、`readMarkdown`、`mcp-bridge.mjs`、`FrameParser`、`CREDIT` 分支、`scopeOf`、`profiles-store.js`、`__nks:pick` 监听器、`window.open` sink 均为零实质 diff） |

### 2.1 台账完整性问题（比单条缺陷更优先）

`security/accepted-risks.json` 是处置账本，本轮发现其**记录与代码事实脱节**——处置行给出虚假的安全感，需要 [业主] 复核：

| 台账行 | 登记内容 | 代码事实 |
|---|---|---|
| `hunter-e:grok-creds-workspace-copy` disposition=`harden`，`optionalHardening`："Shipped: `.gitignore += imagine/.grok/`" | 声称已落硬化 | 写入 `.gitignore` 的代码**只在死路径 `imagineRun` 内**（`index.js` 不 import，skill 路径从未调用）；live `cp -f ~/.grok/{auth,config}` 落 `<ws>/imagine/.grok/` 依然零防护。nsw S3 扩散面随插件退役消失，但 NXE `/read` ≤1MiB 直读与 `/commit` `git add --all` 两条落地链仍通。**该行需重写** |
| `nxe:routes-read-arbitrary-file` disposition=`accept` | 接受的是 `allowOutsideWorkspace` flag 语义 | `3f5a4f0` 后 `/list` 连 flag 解构都删了——`outside` 退化为纯输出标记，任意目录无条件枚举。接受记录**未覆盖** flag 被删除后的实际行为 |
| `nano-notepad:read-arbitrary-md-read` disposition=`accept` | 冻结时 bound 是 `*.md/*.markdown` | `d1a2667` 删除扩展检查改 NUL 判定后，bound 扩为任意 NUL-free ≤2MiB UTF-8 文本（`~/.ssh/id_rsa`、`.env`）。accept 记录冻结在 `.md` 边界，BINDING_TABLE justification 已更新为 "no workspace confinement"，**两本账不一致** |
| `nano-notepad:s3-config-endpoint-ssrf` disposition=`accept` | "the signed-SSRF surface is narrowed to endpoint choice only" | 属实（schema ingress 已收窄对象体面），endpoint 选择与 `locate()` 原始插值保留；本条台账**如实** |
| BINDING_TABLE `dnn.pipeline.s3` justification："scoped S3_NOTEPAD_* or DSH_NP_PIPELINE_IDENTITY"、"host-signed" | 声明 scoped 凭据 | 实现里 `s3Target(ctx, body.target)` 让 caller 自带 endpoint/bucket/凭据——是未登记的第二凭据源，justification **掩盖**了凭据注入面 |
| BINDING_TABLE `dnn.fx.chat` justification | "OpenAI→GenerateOptions bridge" | 未声明宿主出站 `fetch`；capability `llm:generate` 掩盖了 `net:fetch`+`write:attachments` 复合面 |
| BINDING_TABLE 全部行 `sessionBinding:true/false`、`capability`、`bodyLimit` | 声明绑定/能力/限流 | `packages/dsh-host-route-guard/src/route-guard.js:21-22` 注释自证："ledger metadata only, never enforced at runtime"。`dnms.async-history` 干脆声明 `sessionBinding:false`，`dnt.stream`/`dnls.mcp` 声明 `true`——两者**同样不执行**，字段只是"应绑定"的登记而非运行时事实 |

### 2.2 共享根因（27 条收敛为 4 族）

| 根因族 | 覆盖 claim | 机制 |
|---|---|---|
| **R1：单闸门 + 台账不执行** | A1, A3, A7, A8, A9, B1–B6, C2–C7, C9（≈19 条） | `connection.requestRejection` 是唯一运行门；`sessionBinding`/`capability`/`sensitivity`/`bodyLimit`/`sessionBinding:false` 全部仅元数据；`registry.resolve`、`?sessionId=`、`scopeOf`、caller `sessionId` 键控 Map 均无调用方绑定 |
| **R2：`(req,res)` 丢 route 参** | A7, B3, B4, B5, B6, C5（6 条） | `routeSpecs` 把 `bodyLimit` 写进 route record，但 handler 二元签名拿不到它；`readJson`/`chatHandler`/`FrameParser`/`resize` 无界缓冲/无 clamp |
| **R3：页面/远端自证信任** | A2, A4, A6（fixed）, C1, C2, C8（≈6 条） | `body.allowOutsideWorkspace`、`body.target`、`window.open(item.url)`、`postMessage` 无 source 检查、`normalizeProfile` 继承 secret——页面 JS 为自己解除约束 |
| **R4：构建期闸门各自独立** | B7, B8, B9（3 条） | `check-clean-lib` 假阳性+computed-import 逃逸+scope 漏 `src/host/`；`gen-mutex-patch` 三窄道 retag 漏 `customSkillDirs[0]`；`.gitignore` 硬化落在死代码 |

## 3. 逐条台账（27 条）

> 每条结构：**当前状态（HEAD）· 严重度（沿原审计）· 沿革（commit 时间序）· 爆炸范围 · 台账判定**。源码位置为 HEAD 实测。

### DNN + NXE 面（9 条）

#### 3.1 [Critical · open] `nano-notepad/s3-config-endpoint-ssrf`
- **源码位置**：`dsh-nano-notepad/src/host/s3-sync.js:121-125,331-358`、`index.js` `/s3/config`、打包产物 `lib/s3-sync-host.js`
- **沿革**：`d1a2667`(11-11) 引入 `normalizeProfile` 仅查 `^https?://` + `secretAccessKey` 编辑保留 + 单 profile 自动激活；`df95d8d`(11-11) `locate()` 裸插值 `${base}/${bucket}/${objectKey}`；`68cc0e8`(11-12) schema 校验收窄对象体面；`180cf05`(11-15) 只退役 `testOne`；`fb7264d..HEAD` **零 diff**
- **爆炸范围**：`save` 自动激活→`rebuild()` 指向 attacker endpoint；`/s3/object` `op=get`→`bodyB64` 回读任意上游；`probe` 用已存凭据签名 PUT+DELETE 而不激活；编辑 victim profile 保留 `secretAccessKey`→以 victim AKID 向 attacker 签名；`/s3/status` 泄露 endpoint+AKID 辅助定向。同根 `locate()` 与 C2 的 `pipeline-s3.js` `new URL` 是**两个独立实现、同一逃逸语义**
- **台账判定**：`accepted-risks.json` disposition=`accept`（"multi-endpoint 是 feature"），台账如实；处置是风险决策非代码缺陷，**待 [业主] 复核 critical 级 accept**

#### 3.2 [High · open] `nano-notepad/pipeline-target-override-ssrf-namespace-escape`
- **源码位置**：`src/host/pipeline-s3.js`（`request()` `new URL(endpoint+'/'+keyPath)`）、`pipeline-claim.js`、`index.js:337-339`、`lib/pipeline.js`
- **沿革**：`af43dd7`(11-14) 引入 `s3Target(ctx, body.target)` 原样信任 + `encodeSegment` 保留 `.`/`..`；`b88cd58`(11-14) `/pipeline/{s3,claim}`、`/rpc` 三路共用同一 `s3Target`；`39ef320`(11-15) review-fix 只去 `.catch` 伪绿 + claim.read 加 `SESSION_ID_RE`（仅 rpc）；HEAD 未动
- **爆炸范围**：三路由共享 `s3Target`：`/pipeline/s3` `get`+`format:'bytes'`→`bodyB64`；`/pipeline/claim` release 不校验 key（`claims/../../escape` 删任意对象）；`/rpc` `corpus.read`/`manifest.get`/`corpus.list` 同指任意 endpoint。**双层叠加**：`body.target` 含 http:// 环回/内网 + `..` key 段逃逸 `{bucket}/{prefix}`。`readJsonBody` 在此**有** bodyLimit（与 C5 对照）
- **台账判定**：无 accepted-risks；BINDING_TABLE `dnn.pipeline.s3` justification "host-signed"/"scoped" **与实现不符**（caller `body.target` 是未登记第二凭据源），台账行需修

#### 3.3 [High · open] `nano-notepad/read-arbitrary-md-read`
- **源码位置**：`index.js` `readMarkdown`（NUL→resolve→realpath→isFile+≤2MiB→readFile）
- **沿革**：`09812ed`(11-10) 初版双 `.md` 扩展检查；`d1a2667`(11-11) **删除**扩展检查改 NUL 判定（bound 扩宽点）；`bd4d6ad`(11-11) guard 迁移记 L2+accepted；HEAD 仅 `bacfee4` 无关改动
- **爆炸范围**：无目录围栏、realpath 只做规范化不做 prefix 断言→任意 host-UID 可读、NUL-free、≤2MiB 文本（`~/.ssh/id_rsa`、`~/.aws/credentials`、`.env`）；symlink 逃逸同样放行。当前 client bundle 已无 `/read` 调用者——纯暴露面
- **台账判定**：`accept` 记录冻结在 `.md` bound；宽化后的任意文本读不在接受范围，**待复核**

#### 3.4 [Medium · open] `nano-notepad/fx-chat-image-url-ssrf`
- **源码位置**：`src/host/fx-bridge.js` `imageBlock`（fetch 10s、`arrayBuffer()` 先于 20MB 检查）
- **沿革**：`af43dd7`(11-14) 落地即带缺陷；`c2d018c`(11-15) 只动 contextWindow；HEAD 未动
- **爆炸范围**：user/assistant/tool/system 任意 `image_url` part→宿主 fetch 任意 URL→字节持久化为附件（内网数据持久落脚）→ ref 进 `ctx.llm.prepareCall().stream()` 发给 caller 指定 provider/model——一次调用完成**内网拉取 + 宿主持久化 + LLM 外带**三重动作；data: 分支无上限
- **台账判定**：`dnn.fx.chat` justification 未声明出站 fetch，capability `llm:generate` 掩盖 `net:fetch`+`write:attachments`

#### 3.5 [Medium · open] `nano-notepad/fx-chat-unbounded-request-body`
- **源码位置**：`src/host/fx-bridge.js` `chatHandler` `for await`+`Buffer.concat`，签名 `(req,res)` 丢 route
- **沿革**：`af43dd7`(11-14) 落地即带；`bd4d6ad`(11-11) 已确立 `route.bodyLimit` 惯例——**惯例先于缺陷代码存在**；烘焙 `bodyLimit:33554432` 从未生效
- **爆炸范围**：单 POST 任意体积驻留 + 并发乘算；同文件 `imageBlock` `arrayBuffer()` 先缓冲后检查是同一根因第二落点；data: URL 同无界。兄弟路由全部执行 `route?.bodyLimit` 证明是漏接非合同
- **台账判定**：烘焙表 32MB 行存在但无执行——"声明即生效"在该路由是假安全

#### 3.6 [Medium · open] `nano-notepad/pipeline-claim-release-no-writer-binding`
- **源码位置**：`src/host/pipeline-claim.js` `releaseClaim(s3,key)` 无条件 del；`pipeline.js:450` writerId 第三参被签名静默丢弃
- **沿革**：`af43dd7`(11-14) 落地即 CAS 不对称；`39ef320`(11-15) review-fix 碰同文件未见；HEAD 未动
- **爆炸范围**：删他人活跃租约→第二写者 acquire 成功→双写者并发写 manifest/corpus；叠加 C2 `body.target` 与 key 无校验（`claims/../../escape` 删任意对象）。CAS 对称只在 acquire/renew 两端，release 缺腿
- **台账判定**：`dnn.pipeline.claim` justification "writerId from request (scoped by host auth)" 把 caller 自报身份描述成授权依据——如实记录缺陷语义但没标风险

#### 3.7 [High · open] `dnls:mcp-bridge:unauthenticated-loopback-control`
- **源码位置**：`dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs`（`listen('0.0.0.0')`、`originAllowed` no-Origin 放行 + localhost 白名单）
- **沿革**：`468a374`(11-14) 迁入 DNLS01 即带 0.0.0.0+弱 origin（容器内必需，Apple container 发布到容器 IP 而非 loopback——自证）；`d8b19bf`(11-14) `/control`+`/diagnostics` writer 选举信任 caller `storePath`/`phase`/`engineAlive`；`fb7264d..HEAD` mcp-bridge 零 diff，**但 `entrypoint.sh` 新增崩溃自拉起监督循环**（桥死 2s 重启）——扩大了无认证面的**可用性**
- **爆炸范围**：host loopback 零认证 `/control`（翻转 humanHold）、GET `/diagnostics`（回读 cookie/authorization 头/DOM/sess）、POST `/diagnostics`（hint 注入→`sandbox.diagnostics` MCP 工具回流 agent=prompt-injection）、`/health`、`/mcp` ws→`agent-browser mcp` spawn+任意 `tools/call` CDP（eval/navigate/storage_set）。`dnls.control` 路由把该 sink 挂进受 guard 路由面做代理——**认证代理+裸 loopback 直达双通道**
- **台账判定**：容器桥不在 BINDING_TABLE（非 webServer 路由）——台账盲区，从未被路由审计覆盖；未处置

#### 3.8 [High · open] `nxe:routes-read-arbitrary-file`
- **源码位置**：`dsh-nano-explorer-extra/lib/host.js`（`/read` `routes.js:609,617` 客户端布尔即授权；`/list` flag 已删）
- **沿革**：`778de3c`(11-09) `/list` 初版**有** `allowOutsideWorkspace` 门禁；`e58a107`(11-09) `/read` 落地即客户端布尔；`3f5a4f0`(11-09) **删除** `/list` 门禁与 followSymlinks——flag 退化为纯输出标记；`88c99f7`(11-12) realpath+`.git` assertInside 只落 mutate 层；HEAD 新增 `/diff`（`7e3c8f6`，只 lexical+scopeOf——好先例但**不影响** /read /list）
- **爆炸范围**：`/read` flag 开→lexical+realpath 两围栏同跳→任意 UTF-8 ≤1MiB；`/list` 无条件列任意目录；`maxEntries` 只限数量不限位置。三围栏防护倒挂：`assertInside`（mutate，realpath 硬围栏）/`/read`（客户端可关）/`/list`（无围栏只剩标记）。叠加 C9 foreign root+flag 解除=跨会话+跨工作区完全体
- **台账判定**：`accept` 覆盖的是 flag 语义，`3f5a4f0` 把 /list 连 flag 都删了——**接受记录偏离实际代码一层**，待复核

#### 3.9 [High · open] `nxe:scopeof-cross-session`
- **源码位置**：`lib/host.js` `scopeOf`（`sessionPersistence.stat`/`sessions.get` 解任意 sessionId）
- **沿革**：`778de3c`(11-09) 落地；`88c99f7`(11-12) P4-03 加 `[nxe] scopeOf cross-session` warn（按 frozen 决议只做 observability）；`89059ff`(11-12) 补 ownRoot 缺失 info；HEAD `scopeOf` 未动，**新 `/diff` 路由同样走 scopeOf——sink 覆盖面+1**
- **爆炸范围**：scopeOf 是 DNEE **全部**路由入口（read/list/status/commit/pull/push/checkout/fetch/remote/author/ssh-key/create-*/rename/move/delete/ignored/diff）：caller 给 victim sessionId→全部操作作用于 victim workspace；cold session 经 `sessionPersistence` 同样可解。`sessionBinding:true`（所有 dnee 行）是纯台账——body.sessionId 始终自由选择键
- **台账判定**：`accept` disposition=`harden` + `optionalHardening: "Shipped (log-only)"`——处置**按计划落地**（warn 行在），机制未修；REPORT 建议 warn 降 deny，待复核

### DNMS + DNMSC 面（2 条）

#### 3.10 [Medium · open · 影响收窄] `dnms:async-compact-unauthz`
- **源码位置**：`dsh-nano-model-selector/index.js` GET/PUT `/async-compact` + POST `/switch`；`dsh-nano-model-selector-compaction/lib/host-compaction.js`
- **沿革**：`35c5d68`(11-15) 引入（BINDING_TABLE 即声明 L3 `write:operator`，但 route-guard 自 `bd4d6ad` 起只执行 requestRejection→引入即未授权）；`360c5fe`(11-15) POST `/switch` 暴露 `pluginManager.setBundleEnabled`；`b1b8948`(11-16) history 接入；`4a207d3`(11-16) bundle-inventory 拆分 + `plugin-manager/changed` 失效；`7067602`/`c770f3d`/`a8a48b0`/`c21cc9c`(11-17, post-audit) ACE-1117：`summaryPrompt`→`extraRequirements`（append-only ≤4000 + `promptVersion` 指纹），route-guard/bindings **零改动**
- **爆炸范围**：PUT 改 `async-compact.json` 唯一权威→`_policy()` 每次 pre-step 重读：任意 page principal 可持久重路由 summarizer 至任意 provider/model、翻转 `enabled`、注入 ≤4000 `Additional requirements:`（append-only 是残余注入向量）；POST `/switch` 直接翻转整个 DNMSC takeover 并使 bundle-inventory 失效。`promptVersion` 仅事后取证
- **台账判定**：L3 `write:operator` justification 是未执行的标签；与 B2-B6 同根（单闸门 + metadata-only）

#### 3.11 [Low · open · 次 sink 已修] `dnms:async-history-unbound`
- **源码位置**：`index.js` `historyQuery`/`readAsyncHistory`/`sessionFor`；`lib/compact-runtime.js`
- **沿革**：`b1b8948`(11-16) 引入；`a8a48b0`+`c21cc9c`(11-17, post-audit) 删 `latestSession` 兜底改严格 session 作用域（`session===null`→nulls）——**审计第二 sink（无参 GET 泄露最近会话 fold）已修复**
- **爆炸范围**：`?sessionId=<foreign>` 双重泄露仍通：`readAsyncHistory` 直读任意合法 id jsonl（`ASYNC_HISTORY_ID` 仅防目录逃逸）+ `sessionFor` 把裸 id 喂 `perSession` fold map，`runtime.lastCompaction` 返回外部会话状态。台账记录集在 ACE-1117 扩张（新 `select`/`disarmed`/`preempted`/`timeout`/`lane-active`/`turn-blocked`/`promptVersion`）——泄露信息量只增
- **台账判定**：`sessionBinding:false` 声明即生效（无执行层）；与 C9 `scopeOf` 同根。记 partially-mitigated 但主判定 open

### DNK + DNCS 面（5 条）

#### 3.12 [High · open] `dncs:config-save-baseurl-bearer-exfil`
- **源码位置**：`dsh-nano-cloud-session/index.js` `configAction`；`lib/profiles-store.js` `normalizeBaseUrl`/`normalizeProfile` `secret: existing?.secret`；`lib/devin-api.js` `api.self(profile)`
- **沿革**：`b6dc80c`(11-14) 首提交即带缺陷（`normalizeBaseUrl` 仅 https: + secret 继承）；`374d95c`(11-14) 只给**新写入** secret 加 `cog_` 前缀——继承路径未动；`ed39d91`(11-15) `action:'test'` 给 save 后提供即时外发触发器；`fb7264d..HEAD` **零 diff**
- **爆炸范围**：`action:'list'`（也挂 `/status`）免费泄露 profile id+`hasSecret`；`save` 改 baseUrl 继承旧 token；`test` 向 attacker origin 发 `GET /v3/self` 带 `Authorization: Bearer`；`activate` 后 `/session`/`/message`/ssh-key 等全部 carrier 调用流向 attacker 主机；同面还能静默覆盖 secret（凭据重绑定）。持久化 `$DSH_HOME/nano-cloud-session.json`（0600）跨重启
- **台账判定**：`dncs.config` L3 `write:operator` 仅文字；不在 accepted-risks

#### 3.13 [needs_validation 维持] `dncs:window-open-remote-url-unvalidated-scheme`
- **源码位置**：`src/client/native-workbench.js:148,161`（附件行 + 会话行 `window.open`）；`lib/client.js` 打包产物
- **沿革**：`ed39d91`(11-15) workbench 引入两 sink；`fb7264d..HEAD` lib/client 重打多次（nano-ui 0.2.1、侧栏像素对齐、停用优雅化）均 UI/文案——sink 逐字节保留（`f.url&&window.open(f.url,"_blank","noreferrer")`、`window.open(u.url,…)`）
- **爆炸范围**：上游 Devin v3 `attachments[].url`/`session.url` 经 `/nano-cloud-session/session` 逐字代理进页面→`window.open` 无 scheme/destination 策略；`noreferrer` 只摘 opener。若 webview 执行 `javascript:`/`data:`→远端内容作者拿到认证页面源执行权→**链到 A1**（页面源脚本即可发 config save 外泄 PAT）
- **台账判定**：两 blocker（webview 对 `javascript:` 处置、上游 url 可控性）在仓库外，HEAD 未触及；needs_validation 维持

#### 3.14 [Medium · open] `dnk-index:diagnostics-push-unvalidated-loopback-channel`
- **源码位置**：`dsh-nano-kitesurf/index.js` `pushDiagnostics`+30s timer；`mcp-bridge.mjs` `/diagnostics`（POST 自 `d8b19bf` 起有 no-Origin+JSON 弱门，GET 完全无门）
- **沿革**：`56d75d7`(11-13) 宿主→桥推送引入；`468a374`(11-14) 桥迁 DNLS01；`b7e5d50`(11-14) 短暂移除快照；`d8b19bf`(11-14) 重新引入+writer 选举+POST 弱门；`fb7264d..HEAD` 桥零 diff，DNK index 仅删死导入
- **爆炸范围**：GET `/diagnostics`：任何本地进程读全量浏览器诊断（DOM/console/network/hint/`storePath`/sess）；POST：伪造宿主快照→hint 注入经 `sandbox.diagnostics` MCP 工具+`/health` 逐字回流 agent 上下文（prompt-injection）；同 listener `/control` 同形弱门；`/mcp` ws `originAllowed` localhost 白名单是正面模式对照
- **台账判定**：与 A3/3.7 共享同一 listener+同一弱门根因——本条是其 GET/hint 注入子面；未处置

#### 3.15 [needs_validation 维持] `dnk-pick:postmessage-unbound-source`
- **源码位置**：`dsh-nano-kitesurf/lib/client.js` `__nks:pick` 监听器（fb7264d 3386→HEAD 4255 纯位移）、`setPick`/`designNote`/`insertComposerNote`；`lib/dom.js` PICKER（`ed99c71` 后死代码）
- **沿革**：`b0ac28c`/`56d75d7`(11-13) 监听器落地即无 origin/source 校验；`e13b8e5`(11-14) PICKER 注入为唯一 in-tree 发送方；`ed99c71`(11-16) srcdoc 构建迁 DNLS `src/host/dom-srcdoc.js` 且**删除宿主侧 PICKER**——`lib/dom.js` 变死代码；HEAD `lib/client.js` 大改（DevTools 三 tab、心跳、网络详情）但监听器+iframe `sandbox="allow-same-origin"`（无 allow-scripts）逐字节一致
- **爆炸范围**：伪造 packet→`setPick`→`designNote`/`multiNote` 折 selector/text/src/attrs/ancestors/componentStack 进 `<kitesurf>` note→`insertComposerNote` 写入宿主 Lexical composer→下次发送进模型请求（prompt-injection）；并行 sink：POST `/edit` `{selector,text}` 经 CDP 写远端页面。两路升级均需用户交互；跨窗口（opener/兄弟 frame）拓扑是残余 blocker
- **台账判定**：needs_validation 维持（Phase-5 已收窄为跨源窗口句柄可达性）

#### 3.16 [rejected 维持] `dnk-srcdoc:unrestricted-subresource-egress`
- **源码位置**：`dsh-nano-local-sandbox/src/host/dom-srcdoc.js`（`ed99c71` 后真文件；hunter 引的 `lib/dom-srcdoc.js` 从不存在）、DNK `lib/dom.js` 死代码、`lib/client.js` iframe
- **沿革**：`ed99c71`(11-16) 剥离器迁宿主侧（script/base/meta-refresh/on* 属性/javascript: URL 五类删除）+ commit 显式记录「iframe sandbox 去掉 allow-scripts（第二道锁）」；`fb7264d..HEAD` 零 diff
- **爆炸范围**：无 `allow-scripts`⇒iframe 内脚本执行不可能；残留子资源标签（img/link/css）能加载远端内容属设计行为（相对路径 rebase 保真），发生在 sandbox 文档而非宿主页面
- **台账判定**：维持 rejected；台账勘误——hunter 文件路径从不存在，DNK `lib/dom.js` 是陈旧死代码可清理

### DNLS 面（4 条）

#### 3.17 [fixed] `dnls.open-unrestricted-navigate-scheme`
- **源码位置**：`dsh-nano-local-sandbox/src/host/routes.js` `navigationUrl()`（:696）
- **沿革**：`b6e34a4`/`da873c9`(11-14) `/open` 逐字转发 `cdp-elements.navigate`→`Page.navigate{url}` 仅非空检查；`9b6287f`(11-17, post-`fb7264d`) repin 官方 39feadf 时引入 `navigationUrl()`：trim+无 scheme 补 `https://`+`new URL`+**仅 http/https**+禁 userinfo，`javascript:`/`data:`/`file:`/`chrome:` 进 CDP 前 400；同 commit 加 queue/cancel+URL 再序列化
- **爆炸范围**：脚本执行升级路径被构造性关闭；残余：任意 **https** 目的地导航（含内网）仍可——浏览器地址栏即功能本身（`dnls.open` L2 `net:sandbox`）；`/history`/`restoreLastPage` 不再引入新 url 来源
- **台账判定**：**fixed**；建议把「任意 https 导航」单列已知残余（destination allowlist 属合同变更归 [业主]）

#### 3.18 [Medium · open] `dnls.readjson-ignores-route-bodylimit`
- **源码位置**：`src/host/routes.js` `readJson`（709-717）、`routeSpecs` 包装（940-944）
- **沿革**：`2945249`/`da873c9`/`b6e34a4`(11-14) 落地即分块累积+`Buffer.concat`+`JSON.parse` 无长度检查；`4b3ab2e`(11-14) `routeSpecs` 把 `bodyLimit` 写进 route record 但 handler 维持 `(req,res)`——限制值随路在、无人消费；`fb7264d..HEAD` routes.js +370 行但 `readJson` 与包装**逐字节一致**
- **爆炸范围**：`/nano-local-sandbox/*` 全部 POST 面（`/open` `/shot` `/kite` `/mcp` `/interact` `/state` `/storage` `/browse-history` `/network` `/console` `/operations` `/control` `/edit` `/wait` `/pick`…）整体缓冲任意大 JSON——`dnls.mcp` 名义 bodyLimit 4096，1MiB+ `tools/call`（含 A9 `term.session.*`）照样全量读入；瞬时内存压力 DoS。对照组 notepad `jsonBody` 33/40 pull 即拒
- **台账判定**：与 C5 同族「`(req,res)` 丢 route 参」；guard 不读流是合同，缺 handler 侧绑定

#### 3.19 [Medium · open] `dnls:instance-ensure:caller-pinned-fingerprint`
- **源码位置**：`src/host/instance-registry.js` `ensure`（(profileId,sessionId) 查重 + caller `policyFingerprint` 落权威）
- **沿革**：`2b9ac0f`(11-14) `ensure` 引入；`4b3ab2e`(11-14) 挂 `mcp-sandbox.js` 工具表；`ed99c71`(11-16) `buildOwners.instances.ensure` 接线——commit 自承「此前 sessionId 被收下后丢弃」即本次才把 caller sessionId 接进 registry（构成可达性）；`74d734f`(11-17) `adopt:{skipCreate:true}`：ensure 直接以现有 env 容器 endpoints 登记（不 `backend.create`）+ `attached=true`；`fb7264d..HEAD` 核心文件零 diff
- **爆炸范围**：任一 P1 页 `POST /mcp` `tools/call sandbox.instance.ensure`：对目标 sessionId 抢先钉 caller 指纹→合法 UI 后续只得 409+`expectedFingerprint`（顺带泄露指纹）；`termPolicyStale`（routes.js:893）读同一行→受害者 `term.session.create` 同步 409（与 A9 联动）；`attached=true`→`sweep()` 永久跳过；`maxInstances` 占满→全员 503。`skipCreate` 不碰容器 CLI——零特权成本跨会话锁死注册表
- **台账判定**：指纹是「caller 可控 policy tuple 的哈希」而非 caller 身份——「先到先得」按 (sessionId,profileId) 成立；未处置

#### 3.20 [Medium · open · 比原记录更宽] `dnls:term-sessions:unbound-sessionid-keying`
- **源码位置**：`src/host/term-bridge.js` `active` Map 按 caller `sessionId` 键 + `listTermSessions` 返 `{id, attach:{url}}` url 含 `token=`；`term-ws.js` 回环 ws 仅 path 全等
- **沿革**：`74d734f`(11-17) 整套机制单 commit 落地；`ede7e45`(11-17) PTY resize+沿用 dnt error kind；`fb7264d..HEAD` term-bridge/term-ws 零 diff
- **爆炸范围**：**比原记录多一跳**——不只「偷 token 开 ws attach」，而是 `POST /mcp` `tools/call` 即：① `term.session.list` 把含 token 的 attach.url 白送任意 caller；② `term.session.input/read/resize/close` 直接对 victim PTY 写 stdin/读 output ring/杀会话——**全程不要 token**，token 只在 ws 升级路径被 path 校验，MCP 面整体绕过；③ `term.session.create` 带 victim sessionId 复用其行。ws 侧只验 `Sec-WebSocket-Key`+path 全等。联动：A8 的 `termPolicyStale` 使受害者 create 409；`dnls.mcp` `sessionBinding:true` 仅台账
- **台账判定**：影响应改写为「MCP 面无 token PTY 读写 + ws token 经 list 白送」两条并存；`term.*` 无独立 BINDING 行（全挂 `dnls.mcp` 下），未处置

### DNT 面（4 条）

#### 3.21 [Medium · open] `dnt-ws-credit-short-payload-rangeerror`
- **源码位置**：`dsh-nano-terminal/src/host/web-routes.js` CREDIT 分支（`fr.payload.readUInt32BE(0)` 无 `length>=4`）、`socket.on("data")` 无 try/catch；`src/host/ws.js` `FrameParser`
- **沿革**：`29d0462`(11-13) 插件引入；`cec2159`(11-14) DNT01 P1 引入 v2 channel+CREDIT/RESIZE 分支（CREDIT 缺长度 guard，旁边 RESIZE 有——缺陷引入点）；`c9fef8b`/`3adc588`/`9a64581`(11-17, post-audit) stall/align 重写+插桩，HEAD `lib/web-routes.js:999` CREDIT 仍裸 `readUInt32BE(0)`、`socket.on("data")`（:1036）仍无 try/catch
- **爆炸范围**：单帧 host 进程崩溃：P1 页面→`/dnt-nano-terminal/stream`→`registry.resolve`（id|name|前缀≥4，无调用方绑定）或裸 `{type:'open'}`→v2 协商→一个 `kind=CREDIT`、len<4 masked binary→uncaught RangeError 杀整个 host
- **台账判定**：与 B4/B5 同根（ws 数据面无资源边界）；修复应合并（feed try/catch+per-kind 最小长度）

#### 3.22 [Medium · open] `dnt-ws-frameparser-no-frame-limit`
- **源码位置**：`src/host/ws.js` `FrameParser.feed`（`buf` 保留、`readBigUInt64BE`、`frag.chunks` 无界）、每 feed `Buffer.concat` O(n²)
- **沿革**：`29d0462`(11-13) 落地即无 declared-length/累计缓冲/frag.chunks 上限；`cec2159`(11-14) v2 channel 复用同 parser；HEAD 全部未加界
- **爆炸范围**：两种慢速 OOM：(a) 声明 2^64 帧长滴灌→`buf` 无限留存+全量重拷放大 RSS；(b) 永不 FIN continuation 堆 `frag.chunks`。`dnt.stream` `bodyLimit:0`+无超时/空闲回收；KA-1..5 新增 keep-alive ping/pong 同样流经该 parser
- **台账判定**：`dnt.stream` `sessionBinding:true` 声明了但只是元数据

#### 3.23 [Medium · open] `dnt-ws-v1-unbounded-write-buffer`
- **源码位置**：`src/host/ws.js` `sendBinary(socket,chunk)`（v1 裸 write）、v2 stall/align
- **沿革**：`29d0462`(11-13) v1 引入即无 `writableLength`/back-pressure；`cec2159`(11-14) v2 加 CREDIT 256KiB+SNAP_LIMIT 4MiB；`c9fef8b`/`3adc588`(11-17, post-audit) v2 stall 语义改「丢弃+align 一次」，**v1 分支逐字节未动**
- **爆炸范围**：v1 协商（不带 `v:2`，默认）下 PTY 每字节进 `socket.write` 用户态队列→客户端停读后 host 堆单调增→OOM 掉所有会话。v2 有 credit 闸门但 `align()`/SNAPSHOT/`channel()` 旁路同样是裸 `socket.write`（仅 `destroyed` 检查），信用内瞬时可写量仍无 socket 级背压——**半径比原审计更宽**
- **台账判定**：B3–B5 同源（ws 数据面零资源边界）

#### 3.24 [Medium · open · 影响扩宽] `dnt:unclamped-resize-wasm-mirror-dos`
- **源码位置**：`src/host/sessions.js` `SessionRecord.resize`（无 clamp，lib/sessions.js:1316）；`create()`/restore 有 `[2,512]`；`src/host/mirror.js`；`lib/dnt-core.wasm`
- **沿革**：`29d0462`/`262b3d4`(11-14) create/restore clamp 但 resize 未 clamp→合同/实现分裂引入点；`cec2159`(11-14) v2 RESIZE+FACTS 新增两个未 clamp 入口（连同 v1 text、MCP `term.session.resize` 共 4 路）；`c9fef8b`(11-17, post-audit) resize 重构 `resizeMode(platform)`：`win32→resizeBox`（新 wasm ABI `dnt_resize_box`）——**缺陷面扩到 win32**，HEAD 仍无 clamp，`dnt-core.wasm` 随镜像重打
- **爆炸范围**：一帧 resize 写 65535×65535 进 `meta`（persist 毒化几何）+直驱 `dnt_resize`/`dnt_resize_box`→Grid::resize O(rows*cols) 在共享 wasm32 线性内存永久提交（实测 ~4.3GB，trap 可捕获故进程不死）；4 入口汇聚同一未 clamp `resize`
- **台账判定**：`/mcp` L2 `read:host` 声明也能触发 `proc` 效果；`registry.resolve` 无绑定+`sessionBinding` metadata

### 构建期面（3 条）

#### 3.25 [Low · open] `dsh-plugins/clean-lib-false-positive-and-computed-import-gap`
- **源码位置**：`scripts/check-clean-lib.mjs`（引号字面量正则）、`scripts/test-all.mjs:58`、`dsh-nano-notepad/index.js:134`（`ObjC.import('AppKit')` JXA 模板）
- **沿革**：`bd4d6ad`(11-11) 引入四条引号正则+scope=lib/+index.js；`178eb35`(11-14) scope 扩 DNLS/DNT（gap 放大）；`bacfee4`(11-17) notepad 另存为把 `ObjC.import('AppKit')` 写进 index.js（pre-`fb7264d`）；HEAD 复核 `node scripts/check-clean-lib.mjs`→`clean-lib FAILED: 1 bare specifier(s) 'AppKit'` exit 1，门禁仍被假阳性阻塞
- **爆炸范围**：双向缺口：(a) 外来语言 import 字符串（JXA/ObjC）即假阳性；(b) `import(expr)`/`require(expr)` 计算导入永不提取→真 drift 逃逸；(c) scope 只走 `lib/`+`index.js`，DNLS `src/host/` 整棵宿主可执行子树未入闸
- **台账判定**：repo 工具非路由——无 BINDING 行（正确）；维持原 remediation（parser 化提取+computed-import 规则+shipped `files` 全覆盖）

#### 3.26 [Low · open] `dsh-plugins/mutex-patch-js-tag-loss`
- **源码位置**：`dsh-nano-model-selector-compaction/scripts/gen-mutex-patch.mjs`（`jsTag.resolve` 剥 tag+三窄道 retag）、`cordis.patch.yml` `customSkillDirs[0]`（行 50-52/631-633 仍无 tag 多行纯标量，上游 standard.patch.yml:44/cordis.patch.yml:130 均带 `!!js`）
- **沿革**：`ff74487`(11-15) 引入；`ae61616`(11-15) P0 drift 未触 retag；`f8a9acf`(11-17, post-`fb7264d`) ACE-1117 P2 新增 `TOOLS_ROW`+`patches.push` 覆盖——重打后两处仍丢 tag，retag 三窄道逐字未改
- **爆炸范围**：「任何非 `disabled:` 键下的 `!!js` 标量→重序列化静默降格为字面字符串」；`f8a9acf` 新增 replay 节点意味着将来上游 preset 任何 `!!js` 都沉默穿过窄闸；安装期 cordis evaluator 把 JS 源码当目录字符串绑定→skill-filesystem 收到伪目录，静默语义漂移
- **台账判定**：构建期/供应链正确性缺陷无运行时面；维持原 remediation（CST 级 tagged-scalar 遍历回填或复用 VERSION_GUARDED_ROWS 占位符）

#### 3.27 [High · open] `hunter-e:grok-creds-workspace-copy`
- **源码位置**：`dsh-nano-model-selector/lib/host-media.js` `IMAGINE_PREAMBLE`（`cp -f ~/.grok/{auth,config}` 落 `<ws>/imagine/.grok/`）；`imagineRun` 死代码 `.gitignore` writer；`dsh-nano-explorer-extra/lib/host.js` `commitAll` `git add --all`
- **沿革**：`07cf543`(11-10) `/imagine` 引入即植活凭证；`89059ff`(11-12) security-fix 7788 加 `IMAGINE_GITIGNORE_BODY` 但只写在 `imagineRun` 内——`index.js` 不 import，skill 路径从未调用→**修复落地即死代码**；`9dd37d9`/`7e3c8f6`(11-17, post-audit) DNEE 提交图/待提交卡片扩展 git 路由，`commitAll` 仍 `git add --all`+`/read` 无 secret denylist
- **爆炸范围**：活凭证落盘 `<ws>/imagine/.grok/` 两条落地链：(a) `POST /nano-explorer-extra/read` ≤1MiB 无条件返回给 session-bound page JS；(b) `POST /commit`→`git add --all` 纳入可提交集（新提交卡片 UI 帮用户确认「全部改动」）。nsw S3 扩散面随插件退役消失，repo-commit 持久化+page-JS 直读仍在
- **台账判定**：`accepted-risks.json` disposition=`harden`，`optionalHardening`："Shipped: `.gitignore += imagine/.grok/`"——**该登记实质上无效**：被宣告的硬化只在死代码 `imagineRun`，live 路径零防护。需 [业主] 复核重写该行（当前记录给虚假安全感），并按原 remediation 把 `.gitignore`/mktemp GROK_HOME 移入 command template 本身

## 4. 共享根因与联动链（§2.2 展开）

### 4.1 联动攻击链（HEAD 下仍完整）

| 链 | 起点 → 中介 → 终态 | 涉及 claim |
|---|---|---|
| **页面 JS → 宿主编排** | 任一存储型/注入型页面脚本 → `requestRejection` 放行 → caller 自证 sessionId/target/profile → 宿主 fs/git/S3/LLM/PTY | R1 全部（scopeOf、?sessionId=、body.target、registry.resolve、active Map） |
| **远端内容 → 页面源执行** | Devin url / mp 文章 / bucket co-tenant / `<kitesurf>` note → 页面 JS → R1 | A2, A4, C3, B9 |
| **loopback → 容器/agent 注入** | 本地进程（无 Origin）→ mcp-bridge `/control` `/diagnostics` `/mcp` → humanHold/hint/CDP | A3, C7 |
| **同源页 → DoS/锁死** | P1 页 → ws 无界帧/未 clamp resize/抢先指纹钉/claim release → host OOM/409 全员/双写 | B3–B6, A8, A9, C6 |

### 4.2 `sessionBinding`/`capability`/`bodyLimit` 台账不执行的量化面

`packages/dsh-host-route-guard/src/route-guard.js:21-22` 注释自证："ledger metadata only, never enforced at runtime"。`security/route-sensitivity.json` 87 行（DNN 15/DNEE 18/DNMS 7/DNLS 29/DNT 6/DNCS 12）——**87 条路由唯一运行门都是 `requestRejection`**。`sessionBinding:true`（dnt.stream、dnls.mcp、dnee 全部）与 `sessionBinding:false`（dnms.async-history）在运行时**完全等价**——字段是「应绑定」登记而非事实。

### 4.3 台账与代码的漂移（§2.1 汇总）

`accepted-risks.json` 3 条 harden 中 1 条落在死代码（grok-creds）、1 条已落地但仅 warn（scopeof）；3 条 accept 中 1 条 bound 已扩（read-md）、1 条 flag 已被删（/list）；BINDING_TABLE `dnn.pipeline.s3`/`dnn.fx.chat` justification 掩盖第二凭据源与出站 fetch。**台账不是安全围栏的替代品**——台账行需定期与代码对账，否则给出虚假安全感。

## 5. 处置建议（按族）

| 族 | 建议 | 受益 claim |
|---|---|---|
| R1 单闸门+台账 | 在 `route-guard.js` 落地 `sessionBinding`/`capability`/`bodyLimit` 的运行时执行（至少 `sessionBinding` 对 caller sessionId 做 principal 校验）；同时修订 BINDING_TABLE justification 与 `accepted-risks.json` 漂移行 | A1, A3, A7, A8, A9, B1–B6, C2–C7, C9 |
| R2 `(req,res)` 丢 route | 统一 `readJsonBody(req, route?.bodyLimit)` 签名（notepad `jsonBody` 已是范式）；`FrameParser` 加 MAX_FRAME/累计上限/frag 上限+close 1009；`SessionRecord.resize` 加 `[2,512]` clamp | A7, B3, B4, B6, C5 |
| R3 页面自证 | `window.open` 加 scheme 白名单（http/https only）；`postMessage` 加 origin+source 校验；`s3Target`/`normalizeProfile` 不接受 caller 凭据；`/read` flag 移除或 allowlist | A2, A4, C1, C2, C8 |
| R4 构建期 | `check-clean-lib` parser 化+computed-import 规则+`files` 全覆盖；`gen-mutex-patch` CST 级 tag 回填；grok `.gitignore`/mktemp 移入 live template | B7, B8, B9 |

## 6. 覆盖总结

| 指标 | 数值 |
|---|---|
| 复核 claim | 27（confirmed=23 / needs_validation=3 / rejected=1，以 `findings.json` 为准——前序摘要的 22/3/2 属计数口误） |
| HEAD 状态 | **open=24 / fixed=1 / rejected 维持=1 / needs_validation 维持=3**（A6 fixed；A5 rejected；A2/A4/A6-残余 needs_validation） |
| open 内部分布 | 影响收窄=2（B1, B2）；影响扩宽=3（B5, B6, A9）；逐字节未动=19 |
| 台账漂移 | `accepted-risks.json` 4 行需复核（grok-creds、/list flag、read-md bound、pipeline.s3 justification）；BINDING_TABLE `dnn.pipeline.s3`/`dnn.fx.chat`/`dncs.config`/`dnls.mcp` justification 需修 |
| 唯一实质关闭 | `dnls.open-unrestricted-navigate-scheme`（`9b6287f` `navigationUrl()` scheme 白名单） |

### 6.1 明确排除

- **部署侧配置与拓扑**（Caddy、token broker、launchd、三实例隔离）不在仓库内；`dsh.local`/`dsh-dev.local`/`~/.dsh-desktop` 运行时状态未探测
- **真实外部服务**（Devin API、真实 S3、xAI、mp.weixin）未访问
- **`context/` 参考检出**（gitignored，非产品代码）；`deprecated/dsh-nano-shared-workspace` 出范围
- **needs_validation 残余**：A2（webview `javascript:` 语义+上游 url 可控性）、A4（跨窗口 postMessage 拓扑）、A6 已转 fixed——三条部署侧观测仍待 [业主] 裁决/验证

---

报告生成时间：2026-11-18；复核来源：`.agents/security-audit/261117/findings.json`（27 条）+ `git diff fb7264d..230ad45`（+82 commits）+ 三路台账子代理沿革分析。
