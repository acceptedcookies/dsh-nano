# [DNCS] Devin 双面配对设计与实施台账

> 文件名按[业主]指定为 `design-1119.md`；实际编写日期为 2026-11-18。
> 阅读基线：`main @ 48e7e6f6a53026c9a78e3898c8581912a450982b`，含阅读时已有的文档移动。
> 状态：**设计建议，待[业主]审阅；本轮仅新增本文，没有实施运行代码，没有进行远端连接。**
> 目标包：[DNCS] `dsh-nano-cloud-session`。近期交付对象只有 Devin。
> 下文 `file:line` 均为上述基线的作者文件坐标，不是未来实现的完成证明；新增文件明确标为「新增」，不编造行号。

## 0. 本轮裁决边界

### 0.1 已由[业主]明确的范围

本表只记录本次 scope reframe 的原意，不重新解释为已经批准所有新 wire 字段、错误码和权限面。

| 标记 | 已明确内容 | 本设计的执行含义 |
|---|---|---|
| S1 | 其他 provider 仅为远期接线与协议基线分析 | 本轮不实现第二个 provider、不搭通用 Remote-SSH 产品、不安装远端 [dsh] kernel |
| S2 | 近期仍是 Devin 适配，但 UI 与协议把 Devin 看作 provider 的一种 | 外壳使用 cloud workspace / provider 语义；Devin 专有字段、规则和文案归入 Devin 目录 |
| S3 | 对话和 session 状态通过 Devin API；资源和底层逻辑通过 SSH 进入 Devin VM | API 与 SSH 是配对的两个面，不是互相兜底；API 列表成功不代表工作区配对成功 |
| S4 | Devin 特殊抽象迁入合理语义文件夹 | provider 内聚、领域与传输分离；不是只把文件搬家后继续全局硬编码 |
| S5 | 此时确定 provider 映射真源、MCP 与插件内部抽象 | 在实现前指定唯一作者、操作闭集、身份、失败、生命周期、权限与各绑定；禁止以测试或运行结果反推新合同 |

### 0.2 继续生效的既有决定

- 仓根 `AGENTS.md:37-45` 的插件中立、宿主归属、不得侧载、单一真源、不得扩约及 UI 纪律继续生效；本设计不把 [nano-agent] / [nano-platform] 纳入运行链路。
- `docs/code-review/26-nov/contract-and-facade-1115-qna-truth.md:514-543`（`T-O-CF1115-22` / F22.1-F22.8）：native 支持必须由正式宿主能力兑现；禁止 fake Agent、空 cancel/idle、假 turn 完成、第二 durable 恢复源；不支持时显式失败，API 管理能力不随之关闭。
- `docs/code-review/26-nov/NUE-1117-qna-truth.md:63-64`（T17/T18）：不恢复 composer Devin 标签嫁接；宿主无来源字段时 [DNMS] 不私判云会话。
- `docs/specs/dsh-nano-ui/DESIGN.md:177-182` 的宿主缺口仍是宿主缺口，不能用本轮新 provider 对象作为跨插件暗号绕过。
- `packages/dsh-interface/AGENTS.md:11-21,62-66`：复用 contracts / host / build 三出口；不新增万能 IDL、运行时 provider 注册中心或共享凭证 store。

### 0.3 建议、批准与实现不是同一状态

本文后续条款均是**单一推荐方案**，不是已经实施或已经获得全部公共改约批准。第 12 节列出需[业主]确认的少量新合同；批准直接登记在本文对应条目，不另立同决定的 QNA / truth 副本。既有决定只引用，不复制成第二裁决源。

「完整收口」指第 13 节的整体能力被实现并有证据；仅整理目录、单测通过、API 可用或 native 正确返回 503，都不能单独宣称整体配对完成。宿主前置能力缺失时，如实登记依赖，不用插件影子运行时补洞，也不新增全仓发布门禁。

## 1. 目标与非目标

### 1.1 本轮目标

一个 Devin session 在 [dsh] 中对应一个可辨认的云端工作区入口：

1. API 面负责 Chat、远端 session 状态和 Devin 专有管理能力。
2. SSH 面负责同一 session 所对应 VM 的目录、文件、Git、进程、终端及选定服务端口。
3. 文件 UI、终端、预览、资源工具使用同一配对身份和远端根；不允许「聊天在 Devin、文件与终端实际在本机」。
4. 两面健康度独立可见。SSH 断开不伪造远端退出，API 不可达不等于 SSH 已断；任何失败均不得静默转成本地执行。
5. 保留现有已准 Devin 功能，在操作级核对缺口后补齐，而不是以「12 条路由」当作完整能力证明。

### 1.2 本轮明确不做

- 第二个 provider、任意 SSH 主机接入 UI、通用 SSH config 管理器、新插件或新公共 terminal lane。
- 远端 [dsh] kernel、独立 LLM Agent、[nano-agent] 部署；不在 Devin VM 再启动一套 Chat 权威。
- 本地 checkout 镜像、双向同步、后台 rsync、SSHFS 挂载、多用户共享目录。
- VPN、全局代理、复刻整张远端网络、透明劫持所有 localhost；只映射选定服务。
- 把全部 API 请求变成 MCP，或用一个 `exec(command)` / `fetch(url)` 工具代替明确的资源操作。
- 为追求像素一致恢复宿主私有 DOM、修改本机已安装宿主、自动安装到任何 profile。

远期只保留「provider 可有不同 Chat 后端、资源后端可替换」的结构空间；不写空 VM provider、不为远期预造 kernel installer。

## 2. 当前实现与差距

| 观察 | 现行锚点 | 结论与处理 |
|---|---|---|
| 宿主直接创建 Devin API，12 条路径与业务混在入口 | `dsh-nano-cloud-session/index.js:9-33,75-89,333-478` | 入口改为装配；operation 与 binding 分离，Devin adapter 移入 provider 目录 |
| preset 已存在，但设置页直接导入 Devin，profile 强制 `carrier:'devin'` | `dsh-nano-cloud-session/src/client/carriers.js:4-28`；`dsh-nano-cloud-session/src/client/settings-dialog.js:25-26,184-195`；`dsh-nano-cloud-session/src/host/profiles.js:65-88` | 本轮只有一个真实 provider 合法；去掉外壳的 Devin 假设，不宣称已有多 provider runtime |
| profile 更新原地修改对象、删除未联动旧桥 | `dsh-nano-cloud-session/src/host/profiles.js:141-162`；`dsh-nano-cloud-session/index.js:126-140,236-257` | profile 快照不可变、配置代际失效；已有工作区不跟随 active profile 漂移 |
| native bridge 是 fake Agent，先闭合 turn 再发消息 | `dsh-nano-cloud-session/index.js:203-225,276-304` | 按 F22 改为正式宿主外部会话能力，不复制完整 Agent 运行时 |
| 历史只读 first:100；轮询吞错误；卸载只清 timer | `dsh-nano-cloud-session/index.js:260-275,315-328,480-483` | 分页、稳定 identity、可见失败、AbortSignal 与在途 barrier 均需实现 |
| client API 不传完整配对上下文，右侧只记 local -> remote id | `dsh-nano-cloud-session/src/client/api.js:21-35`；`dsh-nano-cloud-session/src/client/native-workbench.js:24-26,49-71` | 上下文由宿主签发和解析，不能以 active profile 处理已打开页面 |
| 「终端」实为 openLocal，失败又打开本地 terminal | `dsh-nano-cloud-session/src/client/native-workbench.js:185-192` | 对云工作区删除本地回退；通过正式远端执行上下文打开终端 |
| SSH 只有 keygen 与命令模板 | `dsh-nano-cloud-session/src/host/ssh-keys.js:1-13,25-49` | 新增 Devin 专用 connector、bootstrap、资源 bridge、生命周期，不误称通用 Remote-SSH 产品 |
| [DNEE] 已用 fs/subprocess 抽象，但选择服务仍是全局、watch 仍直接 node:fs | `dsh-nano-explorer-extra/src/host/listing.js:16-27`；`dsh-nano-explorer-extra/src/host/git.js:108-146`；`dsh-nano-explorer-extra/src/host/routes.js:222-237,326-343` | 当前不是「全部直接读本地 fs」；真正缺口是按 session 的正式执行世界解析、watch 和缓存分区 |
| [DNT] 用 registry 的 ctx.subprocess；mcp lane 需要自己的 term 协议与 WS attach | `dsh-nano-terminal/src/host/sessions.js:183-247`；`dsh-nano-terminal/src/client/lanes.js:199-246` | 不能把任意 SSH-MCP 地址塞入 McpLane；本轮选正式 subprocess 后端接入，不增加 lane 或复制 term 工具集 |
| HTTP status 与上游 status 混用 | `dsh-nano-cloud-session/src/client/api.js:12-16`；`dsh-nano-cloud-session/index.js:98-109` | 分开 transport status 与 provider status，避免上游 404 被 client 当插件停用 |
| profile 改 baseUrl 可继承旧 secret，远端 URL 直接 window.open | `dsh-nano-cloud-session/src/host/profiles.js:54-62,76-86`；`dsh-nano-cloud-session/src/client/native-workbench.js:148,161` | 纳入凭证绑定和安全导航；审计来源见 `docs/code-review/26-nov/security-audit-1118.md:133-143`，URL 可利用性仍是 needs_validation，不伪报已复现 |

旧 onboarding 已移动到本目录的 `onboarding-devin-docs.md`，其中 `:374-382` 的 API/E2E 是历史证据，不证明当前完整 UI / SSH 配对。上次阅读时 DNCS 41 项离线测试通过也不证明新架构已交付；本文不重跑收费脚本、不读取真实凭证。

## 3. 总体结构与身份

```text
Cloud Workspace UI (provider-neutral shell)
  -> authenticated local host bindings
      -> WorkspaceScope / formal host resource binding
          +-> providers/devin/api -> Devin REST v3
          |     Chat, remote session state, catalog, attachments, lifecycle
          +-> providers/devin/ssh -> SSH exec / PTY / selected port forward
                -> DNCS remote resource bridge in the SAME Devin VM
                     finite MCP filesystem + process operations
                     no Chat, no model key, no provider PAT

native Chat / file UI / terminal / previews
  -> their formal host capability owners
  -> the scope's Chat view / FileSystem / SubprocessRuntime / port access
```

### 3.1 四种身份不可混用

| 身份 | 定义 | 生命周期 |
|---|---|---|
| ProviderKey | 本轮仅 `devin`；UI preset id 不是另一 provider | 静态定义 |
| ProfileId | 现有 store 的稳定 id；不取 token、label、URL 充当身份 | 用户配置 |
| RemoteSessionId | Devin 返回的规范 id；只有 Devin codec 处理 bare / `devin-` 差异 | 上游权威 |
| WorkspaceScopeId | 本地宿主生成的随机、不可猜测、不持久化的绑定句柄 | 本次已验证配对 generation |

逻辑配对键为 `(providerKey, profileId, remoteSessionId)`。`configEpoch`、远端连接 generation、验证后的 root 共同决定 scope 是否仍有效；它们不是新的 durable 工作区注册表。root 改变或 VM 重连后必须重新核验，不拿本地 cwd 作为默认远端根。

`WorkspaceScopeId` 是路由身份，不是 bearer 授权。浏览器、代理和每个 stream 都仍需宿主认证及对该 scope 的访问检查；拿到别的 scope id 不能取得权限。

active profile 只用于「选择新建 / 列表来源」。已打开页面必须携带已绑定身份；切换 active 不重绑旧页面。修改或删除旧 profile 要使其 scope 失效，关闭旧凭证使用入口，结算已接纳操作；只改 label 也可保守失效，不为复用制造复杂例外。

### 3.2 状态不压成一个 connected

- `api`：`unknown | checking | ready | unavailable`，仅表示 API 通路与身份核验结果，不代表 VM 状态。
- `resources`：`disconnected | connecting | verifying | ready | closing | unavailable`。
- `nativeView`：`unavailable | opening | ready | closing`，取决于正式宿主 Chat 接口。
- `remoteSessionStatus`：保留 Devin 原 status / status_detail，不把未知值改成 done。

这些是**推荐的新状态合同**，批准后进入第 4 节唯一作者。整体配对可用必须同时具有 API 身份、资源 ready 与可用的宿主资源绑定；Chat 原生视图是否可用单独报告。不做全局 `ok:true` 隐藏部分失败。

## 4. 协议真源：先选所有者，再选传输

### 4.1 唯一作者安排

| 内容 | 推荐唯一作者路径（均为新增，尚不存在） | 派生消费者 |
|---|---|---|
| 已准 session / profile / provider 管理操作及其 HTTP 绑定 | `dsh-nano-cloud-session/src/contracts/session-family.js` | host dispatch、client codec、操作文档 |
| 工作区身份、状态、资源操作、失败、权限和绑定 | `dsh-nano-cloud-session/src/contracts/workspace-family.js` | 本地 host、远端 bridge、MCP tools/list、资源 adapter、测试 fixtures |
| Devin 专有能力选择、上游字段和 API/SSH 分工 | `dsh-nano-cloud-session/src/providers/devin/definition.js` | UI descriptor、adapter 装配、支持视图 |
| Devin REST v3 上游标准 | Devin 官方版本化 API / OpenAPI | `providers/devin/api.js` 的薄映射；不得宣称本仓重新定义上游 |
| 官方 fs / subprocess / native 接口 | 声明支持版本的官方宿主包 | `host-adapters/*`；不复制成 DNCS 的影子类 |
| [DNT] term MCP / 流合同 | [DNT] 自己的 schema 与 stream owner | 本轮不迁走、不另造 `term.*` |
| 准入与敏感性绑定 | `security/route-sensitivity.json` 的既有 binding 元数据 | 烘焙 bindings、route inventory；只保存关联与安全信息，不再手写业务 schema |

前两项采用现有 `defineFamily` 的最小作者记录，引用 `packages/dsh-interface/src/contracts/FamilyDefinition.js:11-24,46-89,120-174`。同一领域的 operation schema / failures / dispatch 只写一次，HTTP 与 MCP 只声明 codec 和绑定，不复制一套操作表。

`definition.js` 不再声明第二份 inputSchema 或 errors；它引用 family operation id，指出 `api` 或 `ssh` handler 和能力约束。UI 不能凭按钮存在就推定远端支持。`FamilyDefinition.providers` 是合同提供面选择，不是云厂商账号列表；两者不得因为都叫 provider 就混成可变全局 registry。

### 4.2 从现有代码迁移，不留两个作者

1. 在单次 family 切换中，将现有 `index.js` 的 configAction/sessionOps/catalog/SPECS 映射进 `session-family.js`；保留 12 条现有 URL 作为同一 operation 的既有绑定，不同时维护新旧 handler。
2. `security/feature-contract.json` 中该包的 responseShape / UI / dataLocations 改为引用或由 family 派生，停止作为另一份规范作者；route sensitivity 继续拥有自己的安全元数据。
3. `src/client/carriers.js` 改为消费安全的 descriptor，不维护第二套 capability 列表。
4. 新 schema 不因改目录自动升版本；新增 wire 面由第 12 节批准后一次登记。无关包不借机迁移。
5. 本文批准后是本次新语义的裁决 provenance，代码 family 是可执行 schema 真源；文档后续只引用，不逐字复制 schema 形成并行可写目录。

### 4.3 API 面的操作映射

| 领域操作 | Devin 适配与保留内容 | 本轮要求 |
|---|---|---|
| profile list/save/remove/activate/test/security/ssh-key | 现有 configAction；token write-only | 旧 profile id / `carrier:'devin'` 原样可读，不复制凭证文件；新 UI 名称通过 codec 映射 |
| session list / listInsights / get | REST v3，完整过滤、游标、原 status | 修复 UI 传 `isArchived` 而 host 读 `is_archived`；列表翻页与错误可见 |
| session create | 现有所有 create 字段，不只 prompt | form / codec / upstream 三层逐字段对照；显式 false、0 与空值有各自规则，不 truthy 丢失 |
| chat history / send | messages 分页与普通发送 | 稳定 event_id、分页补齐、富内容呈现或明确不支持；发送确认与远端运行完成分开 |
| attachment list/upload | Devin org attachment 与消息附件 | 不把上游附件当 VM 文件；上传成功但发送未知需分阶段展示，不能自动再上传再发送 |
| tags get/append/replace；insights read/generate | 维持各自上游语义 | 409/422/429 与 already_exists 等实际响应可读，不吞为空结果 |
| catalog playbooks/secrets/knowledge/repositories | 元数据与 ID 目录 | 不返回 secret 值，不把 org repo 目录当远端已检出目录 |
| sleep/archive/unarchive/terminate | 维持各自 API 操作 | archive 不等于销毁 VM；terminate 不等于硬删、逐轮 cancel；状态以回读为准 |
| native view open | 正式宿主外部会话接口 + Chat adapter | 满足 F22 才发布，不能 fake Agent；API 管理仍独立可用 |

上游 API 的「完整」只指本表已选择能力及其字段，不代表实现整个 Devin Enterprise API。应把批准时的官方 OpenAPI 版本/哈希作为适配依据，不提交含会话或秘密的真实响应样本。

## 5. SSH 面：Devin 专用最小连接器

### 5.1 连接顺序与探测

1. 使用明确 ProfileId + RemoteSessionId 回读 API 身份/可见性；403 仍是 forbidden-or-invisible。不能仅靠 `/self` 成功认定 SSH 账号拥有该 VM。
2. 由 `providers/devin/session-id.js` 生成 gateway username，目标限制为批准的 Devin SSH gateway；浏览器不得提交 host、任意 ProxyCommand 或 SSH options。
3. 宿主以现有专用 key / 系统 SSH 建立连接，关闭 agent forwarding、X11 和反向转发。账号级公钥登记保持手工，不伪造 enroll API。
4. 严格校验 gateway host key；未知 key 进入显式 fingerprint 确认，变更拒绝。禁止 `StrictHostKeyChecking=no`，禁止自动改全局 known_hosts。
5. 只执行固定、只读的预检：OS/arch、可用 Node、实际 user/home/cwd、根候选、session 定向规则所能证明的身份。远端根需要确认并 realpath；不把目录名、固定 `/workspace` 或 API repo 名当事实。
6. 推荐首期支持基线为 macOS 本地宿主、Linux Devin VM、远端 Node >=20；其他本地平台不扩大承诺。缺运行时不自动下载或安装。以上是待批准支持范围，不是本轮已实测事实。
7. 通过已有 SSH exec 上传本包构建的 resource bridge 到远端用户专属、mode 0700、内容哈希命名的目录，临时文件原子发布，核对哈希后启动。artifact 是受控程序，不含账号、Chat 数据或秘密。
8. 在同一 SSH 认证连接所定向的 VM 内完成 MCP initialize 与资源根校验后，才发布 resources ready；不单凭 TCP/SSH 登录成功发布。

gateway 公钥只证明 gateway，不是 VM 与 API session 的独立密码学绑定。配对依据是 provider 的 session-to-SSH 定向合同，加本轮授权的实连交叉验证；如果 provider 无法证明目标或发生重定向，不宣称完整配对。

### 5.2 三种 SSH 承载，不强迫全部经过 MCP

| 数据 | 本轮推荐方式 | 为什么 |
|---|---|---|
| 有限文件/进程控制 | SSH exec 上的 MCP stdio | 不暴露远端公网服务、不创建额外 bearer、可严格校验工具闭集 |
| 交互 PTY | 独立 SSH PTY channel，由正式 SubprocessRuntime terminal adapter 管理 | 复用终端字节流、resize、exit/backpressure；不造 DNCS `term.*` 副本 |
| 选定远端服务 | SSH local forward，经本地鉴权的端口访问 owner 暴露 | 访问真实远端网络，不把本机 localhost 误当 VM localhost |

MCP stdio 和 TCP forward 都受同一 WorkspaceScope 生命周期管理；不把「SSH 隧道」限定为远端一定有 HTTP MCP server。现有 `src/host/ssh-keys.js:7-8` 记录 Devin gateway 不接受无 channel 的 `ssh -N`；控制连接保留真实 exec channel。TCP 转发、PTY、重连后目标是否一致必须分别实测，不能从普通 exec 成功推导。

连接器属于 [DNCS] 的宿主半侧，远端只运行 resource bridge；不新增通用 SSH 插件、不把容器引擎放入 [DNCS]、不调用 [DNLS] 私有路由。

### 5.3 MCP wire 与有限工具面

首期固定采用现有工具面使用的 MCP `2025-06-18`，只实现 `initialize`、`notifications/initialized`、`tools/list`、`tools/call`、取消通知与必要的 ping。只广告实际实现的 capabilities。标准不存在的「任意通知推流」不能伪装为 MCP；不支持 resources/prompts 就不广告。

- stdio 使用 MCP 的单行 UTF-8 JSON-RPC framing；JSON 内换行转义，stdout 只承载协议，日志写 stderr。
- 基于 request id 解复用并发响应，校验 jsonrpc/id/返回层次；非法输入走 JSON-RPC 协议错误，业务失败走 `isError:true`。
- 成功 `structuredContent` 固定 `{ok:true,data:T}`；失败 `structuredContent` 固定 `{ok:false,reason,message}`，这是待批准的本 family 语义。现有 `decodeMcpReply` 只解开 MCP 外层，调用方还必须验证这个内层和 operation output，不能把 `decoded.ok` 直接当业务成功。
- 取消通过 `notifications/cancelled` 传播到尚在执行的读取/等待；已发文件变更、已启动进程的结果不能因此声称回滚。
- 每帧上限建议 1 MiB；文件字节页最大 64 KiB，以 base64 传递；text/exec 结果有显式大小和 truncated 字段。超限拒绝或按 operation 明确分页，不静默截断完整文件。
- 每 scope 的在途请求上限建议 8；进程上限 4；读超时 20 秒。它们是本设计建议的资源保护值，批准后归 family constraints / host Config，不能散落在两个实现里。

资源 family 的 MCP binding 闭集如下；同一表投影成 tools/list 和 handler dispatch，bridge 不再手写工具名数组：

| operationId / tool name | 输入核心字段（公共字段之外） | 输出核心字段 | 权限与效果 |
|---|---|---|---|
| `workspace.inspect` | 无 | root identity、OS/arch/runtime、generation facts | 只读握手；不返回完整 env |
| `fs.list` | path、cursor?、limit | entries、nextCursor?、truncated | 远端目录直接子项，不递归复制 |
| `fs.stat` | path | kind、resolvedPath、version、size?、linkTarget? | 元数据；策略决定链接可读性 |
| `fs.read` | path、offset、length | base64 bytes、offset、eof、version | 有界字节，UI 文本解码不丢无效字节 |
| `fs.write` | path、base64 bytes、expectedVersion 或 createOnly | version、bytes | 原子单文件发布；不盲目覆盖冲突 |
| `fs.mkdir` | path | created | 不隐式递归创建任意父目录 |
| `fs.rename` | from、to、expectedVersion、overwrite:false | destinationVersion | 首期不允许覆盖；不把跨文件系统失败伪装为原子成功 |
| `fs.remove` | path、expectedVersion、recursive:false | removed | 首期只删文件/空目录，沿既有 UI 危险确认；不提供递归删除 |
| `process.start` | argv[]、cwd、envPatch? | processHandle | 显式程序/参数，非 shell 拼接；按权限授权执行 |
| `process.read` | processHandle、stdout/stderr offsets、limit | chunks、next offsets、truncated、exit? | 有界、可重复读取，不偷消费其他读者 |
| `process.wait` | processHandle、timeoutMs | running 或 exit facts | 超时是仍运行，不是已取消 |
| `process.terminate` | processHandle | stop/unknown facts | 只针对本 scope 创建且仍持有的进程；不能 kill 任意 PID |

本表中的 schema 细节由实现阶段一次性落入 family 的纯 codec：拒绝未知字段、负偏移、无效 base64/NUL、空 argv、路径类型错误、跨 generation handle。不得由远端自行放宽。HTTP/JS 不能再维护不同字段拼写的独立 schema。

公共资源请求使用宿主已解析的 scope；远端调用不接受任意 provider/profile/sessionId 替换。每次 MCP initialize 创建新的 remote handle namespace；工具收到的 processHandle/cursor 只在该连接和根有效。`tools/list` 是双方已选合同的一致性检查，不是按名称授予权限或新建全仓 capability discovery。

首期文件读写和 Git 覆盖本表能表达的能力；未实现完整官方 FileSystem 的方法必须明确 unsupported，不能宣称已兼容整个服务。缺少 watch 时正式报告不支持；以用户刷新读取不是伪造 watch。要宣告宿主要求的完整资源后端，必须补齐其必要方法及正式验证。

### 5.4 Git、PTY、网络的特定边界

- Git 继续由 [DNEE] / 官方 Git owner 构造参数、清洗环境、处理确认，远端 process binding 执行；不再增加 `git.run(anything)` 工具或复制 Git 错误目录。只读 status/diff 与 commit/push 的授权不能混为一项。
- `process.start` 虽不经 shell，仍是远端代码执行权限，不是「安全只读」。没有执行授权时只开放文件只读；原始 MCP 进程面不直接广告给所有模型；模型侧仍使用各领域已批准工具与审批。
- PTY adapter 通过本机正式 subprocess 启动 SSH 客户端，但用户 shell 的 cwd/env/执行目标来自远端 verified scope。shell 选择与 executable lookup 在远端完成；禁止本地 shell、PATH、临时目录回退。
- 本机 SSH 客户端环境与远端 shell 环境分开构造；不透传本机 process.env、DSH/API 凭证、SSH_AUTH_SOCK 或本机控制面地址。当前 [DNT] 的 agentEnv 注入 DNT_API（dsh-nano-terminal/src/host/sessions.js:64-78），远端 adapter 必须显式过滤，不能把本机回调地址注入 VM 并误称可用。
- PTY 的 resize、输入、退出和受管范围终止必须满足官方 SubprocessTerminalHandle；断隧道不等于远端 shell/后代已停。不能证明停止时 reject / unknown，不以「ssh 进程退了」冒充远端 quiescence；此项是正式支持前的实连验证点。
- 端口由用户显式选择远端 loopback TCP 端口；本机绑定 127.0.0.1 随机端口，浏览器不能要求任意 host。绑定端口、隧道与授权同 scope 释放；浏览器只拿宿主 port handle，不拿原始 bridge URL。
- HTTP/WS 预览必须经鉴权的宿主端口访问能力或本设计批准的新绑定。远端页面放在隔离 origin，不与 [dsh] 凭证同源；不把 `Set-Cookie`、重定向、WS upgrade 和 HTML base path 当普通 JSON 代理。复杂页面不保证透明改写所有绝对 URL；无法安全呈现时明确不支持。
- 普通本地进程也可能访问 loopback forward，因此 tunnel 不是额外授权层，更不是零信任边界；不得转发本机管理端口或反向暴露宿主服务。

## 6. 宿主集成：必须补的正式能力，不是跨插件捷径

### 6.1 H-EXEC：按会话绑定执行世界

现有 fs/subprocess 抽象可以复用，但当前包清单不证明已经存在「每个 session 绑定不同远端执行世界」的正式装配。推荐给宿主提交如下能力需求，而不是在本仓发明 `ctx.nanoCloudSession` 或让 [DNEE]/[DNT] import [DNCS]：

```ts
// 需求形状，不是声称当前宿主已有的 API，也不是公共发布的 DTO。
type RemoteExecutionBinding = {
  identity: string
  generation: string
  root: string
  fs: OfficialFileSystem
  subprocess: OfficialSubprocessRuntime
  signal: AbortSignal
}
// 宿主拥有：
// 1. 对正式 session/view identity 注册、撤回绑定及其审批/资源 owner。
// 2. 每次操作按该 identity 取得当前 binding，过期/缺失明确拒绝。
// 3. local 会话继续走 local；已知 remote 会话绝不退回 local。
// 4. 生命周期、watch、端口访问及冷恢复的正式语义。
```

具体导出名和源文件必须在宿主仓核对后确定；本仓仅写 `src/host-adapters/execution.js` 薄消费者。不能把这段需求伪标为已存在接口并据此开工调用。

- 官方 file 读取 UI 与 [DNEE] 都通过该正式 owner 解析资源，不只改 [DNCS] 的树。
- [DNEE] 需将 fs、Git subprocess、watch、stats/status memo key 一起改为 binding identity + generation + root；只换 cwd 会串本地缓存。
- [DNT] 需在创建 terminal 时取得正式 binding 的 subprocess，整个 record 固定该 generation；keep/恢复不能在 scope 失效后本地重 spawn，资源失败按 [DNT] 现有错误目录处理。
- 同一进程同时打开本地和 Devin 会话时，不允许替换全局 `ctx.fs` / `ctx.subprocess`；官方服务类、Cordis scope/isolate 的合法装配归宿主，不复制 Service 或复刻 registry。
- 未装 [DNEE]/[DNT] 时用正式宿主文件/终端能力；不把可选插件变成 [DNCS] 安装前置，也不造第二套文件管理器来掩盖 H-EXEC 缺失。

### 6.2 H-CHAT：正式外部 Chat 视图

推荐接入只承担外部会话显示与受控发送的正式宿主接口，能声明不具备逐轮 steer/cancel，不要求构造完整本地 Agent。它必须支持非权威、可销毁重建的投影，载荷不落本地可执行恢复日志。

如果声明支持版本没有这个接口，又无法完整满足 Agent 义务，则按既有 F22 返回 NATIVE_UNAVAILABLE；不造 fake Agent、不恢复手写 Chat、不调用私有跳转。**这只是合法降级，不是本轮完整 Chat 体验已经收口。** 完整交付依赖宿主 H-CHAT，不能在报告中删除这项余额。

Chat adapter 仍要完成：

- 分页按上游游标读取本次请求范围；排序规则以已核对的上游规范为准，不能猜测 first:100 是最新或最旧。
- 按远端稳定 event_id 去重；缺稳定 ID / 重复内容不能用正文哈希猜测身份。scope 内缓存只服务显示，重建重新读远端。
- 先展示 pending，收到上游确认才变 accepted；独立展示远端 running/blocked/suspended 等状态。断网未知写入不自动重发。
- API 没有标准逐轮取消就不广告逐轮取消；用户手动 sleep/terminate 是单独管理动作。
- attachment、PR、structured output、status_detail、ACU/security profile 的已选显示范围逐项核对；不支持的内容可见报告，不转空字符串。

### 6.3 宿主能力核对证据

当前本机包为 `@deepseek-ai/dsh@0.2.2-rc.1`；只作为本机接口核对，不能证明整个 engines 区间。后续实现必须核对目标安装包而非超前 context 源码。

| 正式 owner | 已核对入口 | 用途与限制 |
|---|---|---|
| `@deepseek-ai/dsh-fs` | 安装包 `README.zh.md:12,32-38`；`lib/types` | 可替换 FileSystem，不代表已交付 session 级 remote 路由 |
| `@deepseek-ai/dsh-subprocess` | 安装包 `lib/types/index.d.ts:48-110` | spawn / spawnTerminal / 执行环境与停止义务，不允许普通对象假冒 |
| `@deepseek-ai/dsh-api-workspace-files` | 安装包 `README.zh.md:28-40` | 读 Session 根和组合 FS；宿主资源绑定必须贯通该面 |
| `@deepseek-ai/dsh-agent` | 安装包 `lib/types/runtime-types.d.ts:164-227`；`lib/types/index.d.ts:320-336` | 完整 Agent 与 enter/register 的正式义务，不能拿有 enter 函数当支持视图 |

以上包位于 `INTRODUCTION.md:25,34` 指定的安装版目录。H-EXEC/H-CHAT 的新宿主实现需在其真实仓库取得 file:line 和提交证据后补入本表；本设计不编造外仓文件路径。

## 7. 本地绑定、错误与权限

### 7.1 浏览器与宿主的提供面

- 保留现有 12 条路径作为已有 API 操作的绑定；已打开页面显式指定 profile 或 scope，删除 active 隐式漂移。
- 推荐新增 `POST /nano-cloud-session/workspace`，闭集 op 为 `inspect | connect | status | disconnect`；新建/销毁本地 scope，不销毁远端 session。
- 推荐新增 `POST /nano-cloud-session/resources`，只投影第 5.3 节已批准资源 operation；body 上限由实际字段决定，不借旧 `/ssh` 信息路由承载执行。
- PTY 和文件 UI 优先使用 H-EXEC 后的正式宿主能力；不新增 DNCS terminal lane。端口访问通过正式 owner；若宿主缺少所需鉴权 HTTP-prefix / upgrade，先登记具体绑定再实现，不开不受控 reverse proxy。
- **不新增对浏览器公网开放的 `/mcp` 入口**。本轮 MCP 在宿主至远端 SSH stdio 内；已有宿主/插件模型工具继续经其正式审批面执行，不把内部 resource bridge 直接发布给任意模型或页面。
- exact HTTP 使用既有 guard；确需 prefix/upgrade 使用 `createWebRegistrar` 的已准装配，不能只校验 URL 后就裸 proxy。

现有 `/ssh` 保持信息用途或在明确升级说明中退役，绝不静默变成 spawn。每个新增 op 的 schema、权限和副作用在 family 有作者；安全 binding 元数据同步到仓根账本后烘焙，不在 runtime 读仓库 JSON。

### 7.2 推荐的新资源失败闭集

下表是**待批准**的新 workspace family 目录；不写进全仓万能错误，不复用 NATIVE_* 充当 SSH 错误。

| reason | 建议 HTTP | 适用 |
|---|---|---|
| `invalid-request` | 422 | 已有分类；字段/路径格式/未知 op，本地拒绝不发 SSH |
| `workspace-unavailable` | 503 | SSH、运行时、正式资源后端未就绪；不转本地 |
| `workspace-scope-expired` | 409 | profile/root/generation 失效或旧 handle |
| `workspace-denied` | 403 | 资源授权或根/符号链接策略拒绝；不泄露越界内容 |
| `workspace-not-found` | 404 | 已确认资源不存在；不借此解释 API 403 |
| `workspace-conflict` | 409 | 文件版本冲突、目标已存在或不可原子迁移 |
| `workspace-limit` | 413/429 | 字节上限 / 并发额度；绑定分别选择，body 保留同一 reason |
| `workspace-failed` | 502 | 已确认失败、协议损坏或远端执行器异常；安全阶段信息随 message，不回原始秘密 |
| `workspace-outcome-unknown` | 502 | 已提交资源写入/启动/停止但无法确认；不自动重发 |

API carrier 与既有 NATIVE_* 保留原义。JS 内区分 `httpStatus` 与 `providerStatus`；消息和 stderr 经过限长/脱敏，禁止把原始异常中的 token、私钥路径内容、环境变量值带进 UI。

不新增自动 retry 义务或 exactly-once 承诺。只读请求可由用户刷新；连接恢复只重新握手，不重放写入、exec、terminal input。已丢失结果的写入先提示核对远端。

### 7.3 授权与路径

- 「宿主已认证」是准入，不等于资源执行授权。connect/bootstrap、文件修改、process.start/terminate、终端、forward 都需所属宿主权限 owner 的明确授权；新增执行面的审批政策是第 12 节批准项。
- 第一版根由远端只读探测列出候选，用户确认后冻结到 scope。已存在对象按远端 realpath 验证；新文件校验已存在父目录；读写两端、rename 双端、symlink/..、竞态交换均不得只靠字符串 startsWith。
- 首期资源工具限制在选定工作根；系统运行时查询只允许固定预检，不允许用文件工具读任意 home / ssh key。此约束只属于新资源面，不偷改 [DNEE] 已准本地语义；无法保持一致的动作在远端明确不支持。
- 文件版本是远端实际版本，不取本地缓存 hash 充当权威；本地 display cache 不用于恢复写入。
- 新 profile 的 API base 默认来自 Devin definition；修改 origin 不继承旧 secret，要求显式重新绑定；禁止 redirects 把已签名请求带去其他 origin。具体 endpoint 信任规则与既有自定义 baseURL 的兼容处理需按第 12 节批准，不偷偷删已有能力。

## 8. 生命周期与单一真源

| 数据/资源 | 权威 owner | 本地允许保留什么 |
|---|---|---|
| Devin Chat、session 状态、tags/insights | Devin API | 可销毁显示页、identity / version/hash / consumed_at 回执；不作本地恢复读源 |
| VM 文件、Git、进程与远端网络事实 | 配对到的 VM | 有界显示结果和内存句柄；不复制成第二可写 checkout |
| API profile / token | 现有 `${DSH_HOME}/nano-cloud-session.json` | 仍是唯一 durable 配置；原 token 不复制给 remote bridge |
| SSH 私钥 | 现有 `${DSH_HOME}/nano-cloud-session-ssh` | 宿主读取，页面只得公钥/状态；不远传私钥、不 agent-forward |
| gateway 信任 | 建议专用 `${DSH_HOME}/nano-cloud-session-known-hosts` | 唯一 SSH host-key 信任记录；新信任面待批准 |
| 配对、generation、连接、Promise、processHandle | 本地 scope / 远端 bridge 的运行实例 | 仅内存；重启失效并重新验证，不序列化 |
| 远端 bridge artifact | 本次部署的内容哈希程序 | 非业务权威、无凭证；安装回执只含版本/哈希/时间，不存 bootstrap 可执行 payload |

连接流程：`resolve identity -> authorize -> ssh verify -> bootstrap -> initialize -> root verify -> register formal binding -> publish ready`。同逻辑键 connect single-flight，后来的调用者等同一初始化；任一步失败都回收本次创建的局部资源。

失效流程：`stop admission -> increment/invalidate generation -> abort cancellable reads -> settle admitted writes (success/failure/unknown) -> unregister formal views/resources -> close handles/tunnels -> await cleanup`。不得只清 setInterval；迟到 API/SSH 回包不能写入新 generation。

sleep/terminate API 已确认后标记资源不可用并关闭本地连接，再由真实状态决定恢复；archive 只改变归档，不推断 VM 销毁；SSH 断线不能合成 API terminate。断开本地工作区不调用 Devin sleep/terminate/archive。

卸载只停止本次 scope 拥有的 bridge/进程；不删除远端目录或用户文件，不强杀无归属进程，不移除已登记 SSH key。进程停止结果不明要报告 unknown；artifact 清理另需用户操作，不用「卸载」名义做远端递归删除。

浏览器刷新不能恢复老 scope 句柄；再次选择 session 要走新验证。页面失去引用后的资源释放由正式宿主 owner 管理；不得靠跨插件 DOM 生命周期推定用户已关闭。

## 9. 语义目录与交付物

```text
dsh-nano-cloud-session/
  index.js                         # 只装配 ctx、guard、provider、正式 host adapter
  src/
    contracts/
      session-family.js            # 已有 API 操作及绑定唯一作者
      workspace-family.js          # 新资源协议、MCP schema/codec 唯一作者
    providers/devin/
      definition.js                # 安全的显示/能力引用与 provider 映射
      api.js                       # 从 src/host/devin-api.js 移入
      session-id.js                # bare / devin-、gateway user 规则
      profile-codec.js              # Devin token/org/baseURL 规则
      ssh.js                       # 专用 SSH 参数、连接与 exec/PTY/forward
      bootstrap.js                 # 探测、artifact 传送与校验
      chat.js                      # API Chat 映射，不伪造 Agent
    host/
      profiles.js                  # 单一 durable store，委托 provider codec
      workspace-scopes.js          # 内存代际、single-flight、barrier
      resource-service.js          # 域内调度与权限，非通用 registry
      route-guard-entry.js
      routes.js                    # family 投影的原/新增 bindings
    host-adapters/
      execution.js                 # H-EXEC 的正式接口薄消费者
      native-chat.js               # H-CHAT 的正式接口薄消费者
    remote/
      entry.mjs                    # Node-only 资源 MCP stdio；不加载 Chat
      filesystem.js
      processes.js
    client/
      index.js / section.js        # cloud workspace 外壳
      api.js                       # family codec + scope，不持有凭证
      workspace.js                 # API/SSH/host 三面状态
      settings-dialog.js           # provider-neutral 容器
      native-workbench.js           # 组合正式资源/管理页，不读取其他插件 DOM
      providers/devin/
        settings.js / create.js / details.js
  lib/
    host.js                        # 推荐聚合 host bundle，index.js 只 import 它
    client.js
    bindings.js / perf-review-host.js
    remote/devin-workspace.mjs      # 无 secret 的可上传程序
```

这是目标作者树，未出现的文件全部是新增计划。只拆出有实际职责的模块；不先造空 base class 或 provider 插件动态加载器。

构建将 provider-safe descriptor / pure codec 打进 client，把 Node/SSH/secret 相关内容留在 host；remote bundle 不含 profiles/store/native Chat。`package.json.files`、build script 与包内 AGENTS 同步，离仓安装不依赖源码、旁边 packages 或远端 npm install。

旧 `lib/devin-api.js` / `lib/ssh-keys.js` 等导入在同一切换中退役，不保留第二实现；非 exported 内部产物路径可以变更，外部 URL / 数据迁移语义不能借此暗改。旧 profile 的 `carrier:'devin'` 通过一个 codec 映射为内部 providerKey，不双写 provider 字段、不建第二 profile 文件。

## 10. 实施台账（当前全为 planned）

阶段是实施顺序，不是新增 release-gate。`H-*` 是宿主交付依赖，不伪装为本仓可完成的编码项。每项完成记录「实现提交 + 验证命令/场景 + 结果 + 时间」，不能只打勾。

| ID | 现行 file:line 起点 | 编码安排 / 目标文件 | 依赖与验收 |
|---|---|---|---|
| A01 | `dsh-nano-cloud-session/README.md:5-15`；本轮 S1-S5 | 按第 12 节登记批准；README/onboarding 对旧 API-only 范围作历史说明并链接本文 | 新公共面批准前不写已生效 |
| A02 | `dsh-nano-cloud-session/src/host/ssh-keys.js:1-13` | 新增只读 `scripts/probe-devin-workspace.mjs`，验证 exec/PTY/forward/目标/Node/根；输出脱敏事实，不 bootstrap | 单独远端授权；失败不换目标猜测 |
| A03 | `dsh-nano-cloud-session/src/client/native-workbench.js:185-192`；`dsh-nano-explorer-extra/src/host/routes.js:326-343` | H-EXEC：在宿主真实仓定位/交付正式 per-session resource seam，补回真实 file:line；本仓新增 `host-adapters/execution.js` | 不支持时资源 unavailable；不准 private ctx side channel |
| A04 | `dsh-nano-cloud-session/index.js:171-330` | H-CHAT：宿主正式外部视图能力核对/交付；新增 `host-adapters/native-chat.js`；删 fake/nativeTurn/no-op Agent | F22.1/F22.5；503 是降级证据，不是完整 Chat 验收 |
| B01 | `dsh-nano-cloud-session/index.js:126-155,333-364,381-478`；`packages/dsh-interface/src/contracts/FamilyDefinition.js:46-89` | 新增两份 family；操作/dispatch/codec/security 关联切换；不创建 runtime provider registry | A01；T01/T02 |
| B02 | `dsh-nano-cloud-session/src/host/devin-api.js:42-76,79-193`；`dsh-nano-cloud-session/src/client/carriers.js:4-28` | 移到 `providers/devin/api.js` 与 definition；normalize id / upstream aliases 内聚 | B01；原 API fixture 保持语义 |
| B03 | `dsh-nano-cloud-session/src/host/profiles.js:54-89,141-162` | provider codec、immutable profile snapshot、配置 epoch；删除/更新使旧 scope 失效；baseURL-secret 绑定 | A01/B02；T03/T15 |
| B04 | `dsh-nano-cloud-session/index.js:80-89,236-257,329-330,480-483` | 新增 `workspace-scopes.js`；全身份键、single-flight、受控 Promise barrier、generation | B03；T04/T11 |
| C01 | `dsh-nano-cloud-session/src/host/ssh-keys.js:25-49` | 新增 Devin ssh/bootstrap；不拼接用户 shell；严格 host-key，固定 gateway，exec channel 保活 | A02/B04；T05/T06 |
| C02 | `dsh-nano-cloud-session/scripts/build-client.mjs:44-76` | 新增 remote MCP bundle / filesystem / processes，复用 family codec；限长、并发、取消 | B01/C01；T07/T08/T09 |
| C03 | `dsh-nano-cloud-session/index.js:381-478` | 新 routes/resource-service，原12绑定保留，新 workspace/resources 绑定逐项安全登记 | A01/B01/B04；T02/T10 |
| C04 | `dsh-nano-explorer-extra/src/host/routes.js:63-89,222-237,303-343`；`dsh-nano-explorer-extra/src/host/git.js:108-146` | 消费 H-EXEC；fs/subprocess/watch/stats/status cache 同 scope 分区；本地行为不变 | A03/C02；T12 |
| C05 | `dsh-nano-terminal/src/host/sessions.js:183-247,324-325,356-357,560-560`；`dsh-nano-terminal/src/client/lanes.js:199-246` | 正式 remote subprocess binding；record 固定 generation，云 scope 禁止 local keep/recover；保留原 lane/term schema | A03/C01；T13 |
| C06 | `dsh-nano-cloud-session/src/client/native-workbench.js:185-192` | 正式端口访问 owner + Devin forward，隔离 origin / HTTP/WS 行为验证；缺正式能力不裸 proxy | A03/C01；T14 |
| D01 | `dsh-nano-cloud-session/index.js:198-225,260-304,315-328` | `providers/devin/chat.js`：分页/消息身份/接受与完成/取消传播/非 text；接正式 H-CHAT | A04/B04；T16/T17 |
| D02 | `dsh-nano-cloud-session/src/client/api.js:4-35`；`dsh-nano-cloud-session/src/client/index.js:54-81,112-118` | profile/scope 显式传递、http/provider status 分离、列表分页；disabled 不由上游404推定 | B01/B04；T03/T10/T18 |
| D03 | `dsh-nano-cloud-session/src/client/native-workbench.js:24-71,90-105,117-161,185-205` | workbench scope 绑定、三面健康度、管理阶段结果、导航校验；终端无本地回退 | C03-C06/D01；T18/T19 |
| D04 | `dsh-nano-cloud-session/src/client/settings-dialog.js:25-26,162-244`；`dsh-nano-cloud-session/src/client/new-session-dialog.js:35-78,128-163,180-208` | 外壳与 Devin settings/create/details 分离；单 provider 不显示假列表；字段与权限完整核对 | B02/D02；T18/T20 |
| E01 | `dsh-nano-cloud-session/scripts/build-client.mjs:44-97`；`dsh-nano-cloud-session/package.json:20-33` | host/remote/client 分包，更新 files / dependencies / build；不向 remote 带 PAT 或模型 | C02/D04；T21 |
| E02 | `dsh-nano-cloud-session/AGENTS.md:20-42,64-101,128-134`；`security/feature-contract.json:1099-1104,1135-1140` | 安装前提、联网/远端写入、支持边界、交付物、升级说明和派生安全台账同步 | E01；不得再声称「无外部命令 / 只访问 API」 |
| E03 | `dsh-nano-cloud-session/scripts/e2e-devin.mjs:1-93`；`dsh-nano-cloud-session/test/routes.test.mjs:115-184` | 保留 API 证据；新增显式 opt-in 配对 E2E，与旧测试分开命名/结果 | A02/C*/D*/E01；T22；未经授权不执行 |

上表现行锚点均为完整仓库相对路径；执行时不把新增文件写成「已有 line 1」。DNEE/DNT 的其他既有变更不回退、不借本任务统一重构。

## 11. 具体测试方案

### 11.1 测试分层与夹具

- 单元/合同：纯 codec、fake API、fake SSH driver、内存双文件系统；不连接任何真实账号。
- 受控集成：对 connect/read/write/cleanup 使用 deferred Promise 控制时序；断连点可确定，不靠 sleep 或 clearInterval 次数判绿。
- 本地 SSH 夹具：独立临时用户数据目录的测试 sshd / mock gateway，由测试环境授权启动；不读取用户 ~/.ssh，不以本机环境可用作为默认前提。缺夹具标 not-run，不冒充 skip=通过。
- UI：正式 host test harness 中同时打开本地与两个 Devin scope；DOM 测宿主公开 slot/primitive，不匹配哈希类。
- 真实 Devin：第 11.4 节一次授权闭环；它不是每轮修改都跑的常规测试。

### 11.2 测试台账

所有新增测试文件均位于 `dsh-nano-cloud-session/test/`，跨包用例注明各自位置。每个断言针对合同风险，不以字符串搜索目录名充当行为验证。

| ID | 建议测试文件 / 层 | 具体输入与断言 |
|---|---|---|
| T01 | `provider-contract.test.mjs` / unit | 定义仅 Devin；未知 provider/op/dispatch、缺批准 authority、未声明 capability 被拒；UI/MCP/handler 的 operation 集完全来自同源投影 |
| T02 | `bindings.test.mjs` / contract | 12 条原绑定逐一同语义；新增2条 body/schema/method/认证/Origin/权限；未知 op 无副作用；任一注册失败整批撤回 |
| T03 | `scope-routing.test.mjs` / integration | profile A/B 相同 remote id；开 A 后激活 B，A 的 Chat/附件/资源仍走 A；删 A 不再使用旧 token；host HTTP404 与 provider404 不互盖 |
| T04 | `workspace-scopes.test.mjs` / deferred | 同键10个 connect 共享一个初始化；不同键互不共享；中途失败所有 waiter 结算，未发布 scope，无 orphan |
| T05 | `devin-ssh.test.mjs` / unit | id 含空格/引号/换行/选项前缀、恶意 root/argv、用户 host 参数均不能注入 shell/SSH options；argv 捕获验证；无 -A/-R/StrictHostKeyChecking=no/-N-only |
| T06 | `bootstrap.test.mjs` / fixture | 未知/变更 host key、无 Node、无权限、哈希错、并发安装、上传半断、旧 artifact；没有 ready；只回收本次文件，不删用户目录 |
| T07 | `remote-mcp.test.mjs` / stdio | 分片/粘连/乱序 id、JSON 内换行、非 JSON、未知 method、version不匹配、超帧、stderr日志；不死锁、不把日志当结果 |
| T08 | `remote-fs.test.mjs` / fixture | 同名本地/远端哨兵文件内容不同；list/read/write/rename/remove 只影响远端；覆盖冲突、symlink/..、父链接竞态、越界、二进制、超限与分页；本地哨兵不变 |
| T09 | `remote-process.test.mjs` / deferred+fixture | argv/env/cwd 与预期一致；非 shell 注入；输出分页/保尾截断、wait超时仍running；跨scope handle拒绝；start/terminate结果丢失标unknown不重发 |
| T10 | `resource-auth.test.mjs` / integration | 已认证但未授权执行，拥有A却传B scope，非法path/raw forward URL；在任何远端副作用之前拒绝；token/secret/env不出响应和日志 |
| T11 | `scope-lifecycle.test.mjs` / deferred | read、write、connect、PTY attach 分别在 profile 修改/删除/卸载时挂起；迟到read不append；已发write明确结算/unknown；依赖最后释放；无悬挂Promise/新本地spawn |
| T12 | DNEE `test/remote-execution.test.mjs` / integration | local与remote相同root字符串但不同binding；Git/stats/watch/memo不串；远端read失败不读本地；本地原有mutation/确认/链接规则保持 |
| T13 | DNT `test/remote-subprocess.test.mjs` / fixture | pwd/hostname标识为目标VM；UTF-8/二进制字节/resize/exit/blocked/背压/attach；scope失效后keep不spawn本地；断SSH时远端停止事实未知不能报告已退出；远端env不含本机DNT_API/SSH_AUTH_SOCK/DSH凭证。 |
| T14 | `port-access.test.mjs` / fixture+browser | 远端HTTP与WS哨兵可达、本地同端口哨兵不可达；跨scope handle/任意host拒绝；重定向/cookie/恶意HTML不能访问DSH凭据；端口释放只影响本scope |
| T15 | `profile-security.test.mjs` / unit | 改origin+空secret不沿用旧token；redirect不把Bearer发其他origin；恶意外链scheme拒绝；旧profile fixture仍能在明确政策内读，不双写store |
| T16 | `devin-chat.test.mjs` / API fixture | 251条消息跨3页，页边重复/空页/游标无进展/第二页失败/非text/缺event_id；完整范围可说明、错误可见；不把首100条当全部 |
| T17 | `native-chat-support.test.mjs` / formal host harness | 支持/不支持宿主；无完整义务时503且无localId；POST确认前pending，拒绝/未知不显示完成；取消不调用sleep/terminate；无本地LLM执行或可恢复payload |
| T18 | `ui-workspace.test.mjs` / UI | 三面状态独立；active切换、先开A后开B、上游404、插件停用/重开；旧请求不能复活失效scope；资源断开终端不退本地 |
| T19 | `workbench-actions.test.mjs` / UI+fake API | upload成功/send未知、catalog权限拒绝、insights不存在/拒绝、tags conflict、sleep与archive分开；不吞错误为[]/null，不自动重试写入 |
| T20 | `devin-form-mapping.test.mjs` / contract+UI | 对现有create字段、false/0、repo/knowledge/secret选择、结构化schema、附件，form -> codec -> API逐字段比对；错误留表单、不清输入 |
| T21 | `pack-contract.test.mjs` / artifact | 离仓解包可加载host/client/remote，remote无profile/Chat/secret importer；缺artifact拒绝；各平台资源声明不超出已验范围 |
| T22 | `scripts/e2e-devin-workspace.mjs` / live opt-in | 第11.4节全链路；API与SSH各自记录结论，生成脱敏证据；没授权不运行 |

### 11.3 未来实施时的命令

以下是**测试安排，不是本轮执行记录**。新增文件未创建前命令不可当当前可运行证明；默认 `node --test` 不包含 live 测试，live 仅位于 scripts 且显式 opt-in。

```sh
# 在仓根执行；按改动阶段选择对应命令，不每轮跑全仓。
node --test dsh-nano-cloud-session/test/provider-contract.test.mjs dsh-nano-cloud-session/test/bindings.test.mjs
node --test dsh-nano-cloud-session/test/workspace-scopes.test.mjs dsh-nano-cloud-session/test/scope-lifecycle.test.mjs
node --test dsh-nano-cloud-session/test/devin-ssh.test.mjs dsh-nano-cloud-session/test/bootstrap.test.mjs dsh-nano-cloud-session/test/remote-mcp.test.mjs
node --test dsh-nano-cloud-session/test/remote-fs.test.mjs dsh-nano-cloud-session/test/remote-process.test.mjs dsh-nano-cloud-session/test/resource-auth.test.mjs
node --test dsh-nano-cloud-session/test/devin-chat.test.mjs dsh-nano-cloud-session/test/native-chat-support.test.mjs
node --test dsh-nano-explorer-extra/test/remote-execution.test.mjs dsh-nano-terminal/test/remote-subprocess.test.mjs
node scripts/check-route-sensitivity.mjs
node scripts/check-feature-contract.mjs
npm --prefix dsh-nano-cloud-session run build
node --test dsh-nano-cloud-session/test/pack-contract.test.mjs
# 最后一次本包回归；不要求重复全仓测试。
npm --prefix dsh-nano-cloud-session test
```

UI 用例使用项目实际选定的正式 host/browser harness，命令在 A03/A04 取证后补入实现记录；不发明当前仓库不存在的 runner。成功判据是表中行为、无失败退出码和清理结算，不设臆造覆盖率/延迟分数线。

### 11.4 一次真实 Devin 配对验收

须取得[业主]对**具体 profile/session、远端写入、bootstrap、进程/PTY、端口转发与费用上限**的单次授权；可以选择现有专用测试 session，创建新 session 则另含明确授权。不能因已允许阅读文档就执行本节。

1. 核对 API self/org/session 与 SSH 目标；记录 provider 的定向依据、真实 user/root/runtime，日志不含 token/私钥/完整 env。
2. 在批准工作根内创建唯一测试目录与远端哨兵；文件树读取，编辑写回，校验远端变化；本机同路径哨兵保持不变。
3. 在同根执行只读 Git status/diff，终端确认 pwd/目标，测试 resize/exit；不默认 commit/push。
4. 启动仅测试用途的远端 loopback HTTP/WS 服务，通过前端端口入口访问并确认是远端内容；不能只 curl 本地 helper 端口。
5. 经原生 Chat 发一条获准请求，让 Devin 读取这个远端哨兵；从 API 回复与 SSH 文件事实交叉核对。这个动作验证两面落在同一工作环境，单独 `/self` 或 `ssh pwd` 不够。
6. 核对消息历史分页、附件上传/发送、至少一个管理动作的完整 UI 路径；sleep/terminate 等要具体授权，不自动做破坏性清理。
7. 断开并重连、切 active profile、使旧scope失效，证明不串账号、不转本地、不重复提交命令。
8. 仅清理本次创建且获准清理的测试资源；停止结果未知如实记录。不要自动归档/销毁整个 session，不删除用户文件/SSH key。

证据最少包括代码提交、宿主版本/正式能力来源、各步骤结果、脱敏 API/SSH 身份关联、文件/终端/预览目标、在途清理结果与时间。真实未测项明确 not-run；历史E2E不替代本次。

## 12. 建议一次确认的新合同

为避免「设计写完即擅自扩约」，本节集中列出本次推荐。当前状态均为 **RECOMMENDED / 未获本次明确批准**；[业主]批准本文后只在此登记结论与时间，不再复制到另一份真相文件。S1-S5 和既有 F22 不重新投票。

| 项 | 本文唯一推荐 | 涉及的新承诺 |
|---|---|---|
| R1 协议与真源 | 第4节两份 family + Devin definition；原12路由是同源binding；第5.3节有限MCP操作与第7.2节资源失败目录 | 新资源操作、MCP绑定、错误/状态/限额；不得先部署再追认 |
| R2 SSH/远端程序/信任 | Devin专用连接器；现有key；专用known-hosts；显式fingerprint确认；授权后上传哈希程序；首期本地macOS/远端Linux+Node>=20 | SSH执行、远端程序安装与host-key信任面；不新增远端Bearer、不自动装运行时 |
| R3 资源权限 | 第7.3节工作根与危险操作政策；模型不直接拿内部process.start；不提供递归删除/任意转发 | 新执行面如何得到正式审批，不能以已登录网页等同批准 |
| R4 宿主支持 | H-EXEC/H-CHAT作为正式前置；缺失只明确降级，完整交付仍保留余额 | 不复制宿主、不增加DNT lane、不建立插件私有通道；不默默删原生Chat目标 |
| R5 安全与兼容 | baseURL变更不继承secret、跨origin不带Bearer、安全导航；原自定义endpoint要显式重新绑定而非静默废弃 | 既有credential绑定行为的安全收窄与升级说明，非只挪文件 |

环境事实的确认不是新增裁决：Devin 当前是否支持 PTY/forward、安装版是否有正式接口，必须通过 A02-A04 取证；失败只调整可兑现支持视图，不能悄悄将协议换成另一方案或扩大工具闭集。

## 13. 推荐的完整收口目标

以下是本次功能的完成定义，不是额外批准的 release-gate：

- **范围收口**：只含真实 Devin；未来 provider/kernel/通用Remote-SSH没有空实现或新凭证入口。
- **真源收口**：领域schema、provider映射、安全binding各有明确作者；无第二份工具表/错误表/可写会话副本。
- **API收口**：第4.3节所有已选操作与字段均有代码和验证；历史/确认/取消/未知结果不伪装。
- **资源收口**：同一配对上下文的文件、Git、PTY、MCP执行、HTTP/WS服务访问确实在Devin VM；断开不转本地。
- **宿主收口**：H-EXEC/H-CHAT有正式类型、真实装配与目标版本证据；仍需503时可交付合法降级，但不能标记完整配对完成。
- **生命周期收口**：双profile/配置失效/并发打开/断线/卸载在途任务均有结算与无迟到写入证据；无未知写入自动重发。
- **安全与产物收口**：远端不带PAT/私钥，host-key与审批可解释；离仓产物可用，包内安装合同与真实依赖一致。
- **证据收口**：A01-E03逐项保留完成/未完成与原因；T01-T22对应行为有证据，真实未测不填PASS；不借UI迁移或离线单测销掉SSH/native余额。

**最终建议：把本轮做成「Devin API 会话面 + Devin SSH 资源面 + 正式宿主工作区绑定」的一次真实配对交付，而不是泛化 provider 平台，也不是继续给 API-only UI 打补丁。**
