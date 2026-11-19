# [DNCS] dncs-1119 全面体检与审查 Closure

- 日期：2026-11-19（本机时区）。
- 目标工作树：`.agents/worktrees/dncs-1119`；审查 HEAD：`c3a82bc`；比较基线：`main @ 2c14b60`，含 7 个分支提交。
- 状态：**本轮审查留档完成；findings-open；不是修复完成、完整配对验收通过或发布批准。**
- 范围：[DNCS] 全包作者源码、对应构建产物与测试，及分支改动的 [DNEE]/[DNT]、路由扫描与安全台账。未改产品源码、未提交、未合并。
- 证据：[本轮附件](evidence/dncs-1119/)。设计来源仍是 [design-1119](../../specs/dsh-nano-cloud-session/design-1119.md)，本文不另立公共合同、批准记录或 release-gate。

## 1. 交付判断

这是一次实质性的 API-only 到 API/SSH 双面配对骨架迁移，不是单纯 UI 改名。它完成了 host assembly、两份 family、Devin 专有 codec/API/SSH/bootstrap、远端 fs/process MCP、内存 scope、profile epoch、HTTP 资源入口及打包。旧 profile/12 条 API 路由保留，新增 workspace/resources 两条路由。

**可以肯定的交付**：可重复构建；产物与源码一致；现有离线回归通过；API 的 403/归档/中止语义保留；token 不随 remote bundle 远传；SSH host-key 显式确认；缺正式 H-CHAT 时不再 fake Agent，明确 unavailable。

**不能宣称的交付**：完整的云端文件树/Git/PTY/HTTP-WS 预览/原生 Chat 配对。当前宿主缺正式 H-EXEC/H-CHAT；PTY/forward 明确 unsupported，process 权限固定 false。离线工具成功不代表 [dsh工作台] 已接通远端世界。还存在可导致宿主退出、授权越界和文件操作错误的实质缺陷。

建议先收敛下列 P1，再做一次具备明确授权和稳定开发环境的定向配对验收；这是审查建议，不擅自增加发布闸门。

## 2. 审查发现

P1 = 可能影响宿主稳定性、授权/目标边界或文件安全，建议优先处理；P2 = 功能正确性、完整性及证据缺口。除特别标注外均由本分支引入或新增路径暴露。静态发现不冒充真实远端复现。

### F01 / P1：资源失败可产生未处理 rejection，导致整个宿主退出

位置：`dsh-nano-cloud-session/src/host/workspace-scopes.js:176-180`。

`promise.finally(...)` 返回的新 Promise 没有处理 rejection；返回给调用者的原 Promise 即便已 catch，第二条 rejection 仍未处理。资源超时、断线、权限/冲突错误都能到这里。本地隔离进程复现：先输出 `CALLER_CAUGHT`，随后进程 exit 1，未输出 `SURVIVED`。这不是只能在测试中发生的断言错误。

建议：settlement 清理链本身也必须处理 rejection，不把派生 rejection 遗弃；增加一次经真实 resource-service 错误路径的失败存活断言。

### F02 / P1：浏览器可自行授予 fs.write；连接/bootstrap 与工作根没有正式授权确认

位置：`src/host/workspace-scopes.js:96-100`、`src/host/assemble.js:250-257`、`src/client/native-workbench.js:155-164`（均在 [DNCS] 包内）。

`fsWrite` 直接相信 body.authorize；UI 点击普通 SSH 按钮就传 `['fs.write']`，没有宿主权限 owner 的批准回执。connect 会上传并启动远端程序，默认根取 probe cwd，UI 没有候选根确认。如果 cwd 是 home，不能由此推定整个 home 都是获准工作根。认证同源用户不等于新增远端写/执行面的正式授权。process/forward 固定 false 是正确收窄，但不弥补 fs/bootstrap 的缺口。

依据：design-1119 §7.3、§12 R2/R3。建议授权事实由正式 owner 提供，body 只表达请求；冻结经过真实路径验证且由用户确认的根。未运行真实连接来验证本项。

### F03 / P1：失效没有覆盖在途 connect/read/write，迟到结果仍可交付

位置：`src/host/workspace-scopes.js:49-57,155-180`、`src/host/resource-service.js:34-99,144-145`。

scope.barriers 从未登记消费者；track 不校验返回时的 generation。profile 失效只打 invalid/abort 并调用现有 cleanup；connect 的 API、探测、上传没有接收 signal，直到上传/启动后才检查 aborted。受控复现中 invalidateProfile 完成且 list 已空，在途读取仍返回 `LATE_OLD_GENERATION_DATA`。因此不能声称 T11 的在途清理已经覆盖。sleep/terminate 的 handler 也没有使关联 scope 失效（`assemble.js:216,336-337`）。

建议：先停准入，按阶段取消可取消的工作；迟到读丢弃；已接纳写入明确成功/失败/unknown，等待清理结算，不能把 abort 当已经撤销远端写入。

### F04 / P1：MCP 写入超时/断连未返回 outcome-unknown

位置：`src/providers/devin/mcp-client.js:32-50,74-79`。

所有请求超时一律 workspace-unavailable，child exit 一律 workspace-failed，没有区分只读与已发送写入/进程控制。远端已经写成功但响应丢失时，用户看到的是普通不可用/失败，无法据此知道应先核对而不是重发。family 声明 workspace-outcome-unknown，但此关键路径并未兑现。host 客户端的 buffer/pending 无对应上限、stderr 未消费、child/stdin error 也缺处理；远端 server 的限额不能替代 host 半侧的约束。

建议：发送前/后阶段和操作副作用显式分类，丢结果不自动重放；有界接收与并发、排空 stderr，并收口所有 transport error。本项是静态结论，未制造真实断线写入。

### F05 / P1：root realpath 校验允许祖先目录，可能放宽用户选定根

位置：`src/host/resource-service.js:104-108`。

最终条件同时接受 remoteRoot 是 confirmed 的子目录或祖先。若请求的子目录为指向祖先的 symlink，remote inspect 返回更宽祖先仍被接受，例如 confirmed=/home/u/project/link，realpath=/home/u。字面 root 收窄不能抵消这次向上放宽；还需要处理父链接交换竞态（`src/remote/path-policy.js`、`filesystem.js` 是 check-then-use）。

建议以确认后的 canonical realpath 为冻结身份，不允许祖先匹配；文件打开/发布阶段继续维持父目录身份。此处未执行远端利用，也未把竞态宣称为已复现。

### F06 / P1：[DNEE] 的 remote fs 与 local Git/watch/memo 混用

位置：`dsh-nano-explorer-extra/src/host/routes.js:69-75,327-370`、`src/host/git.js:108-132`。

新增 world 只覆盖部分 fs 读取/修改及 stats；status 仍对 root 调本机 watch，Git 仍 ctx.subprocess，status memo 仍只含 root/path。两个 world 具有相同根字符串时，可能显示或操作本地同名 checkout，或者串缓存。新增单测只验证 worldCacheKey 辅助函数，未调用真实 routes/Git 消费链。

这是 **H-EXEC 存在时可达的潜伏缺陷**；本机缺该正式能力，不能称本轮已经实际对错仓库执行。建议同一个冻结 world 贯穿 fs/subprocess/watch/cache，能力不完整则拒绝，不局部混搭。

### F07 / P1：[DNT] 缺绑定时仍可回落本机；恢复路径丢 remote 身份

位置：`dsh-nano-terminal/src/host/execution-world.js:4-26`、`sessions.js:234-247,324-357`、`persist.js:44-58`。

resolveExecutionWorld 在 H-EXEC 消失时无条件 local，未像 [DNEE] 检查 unbound-remote；create 会走本地 subprocess。remote record 虽设置 keep=false，但持久化未带 worldKind/generation，placeholder attach 仍直接用 ctx.subprocess，本来远端的窗格重启后可在本机复活。只防 keep-respawn 并未防恢复/失效回退，测试没有覆盖 SessionRegistry 的这些分支。

本轮未点会产生终端的按钮，不声称已在真实 UI spawn 复现。建议 unresolved/expired remote 明确拒绝，恢复记录不得遗失执行世界身份，也不能用 local lane 字符串推断它是本地。

### F08 / P2：符号链接 rename 错误地移动目标文件

位置：`src/remote/filesystem.js:155-175`。

rename 使用 src.real 而不是链接本身的 src.joined。隔离临时目录复现：link.txt -> target.txt；rename(link.txt,moved.txt) 后 target.txt 不存在，moved.txt 存在，link.txt 仍指向已不存在的 target.txt。read/remove 对链接的不同语义不能隐式套到 rename。

建议 rename 链接条目自身，明确 expectedVersion 的对象；补一例目标文件不变的行为测试。附件保留完整复现脚本。

### F09 / P2：资源 codec 错误被包装为 HTTP 500/failed

位置：`src/contracts/codec-util.js`、`workspace-family.js:85-90`、`src/host/assemble.js:83-109`。

codec 抛出的普通 Error 带 reason，但 work 只识别特定 class，落到兜底 500。受控调用 fs.read length=65537，得到 HTTP500 `{reason:'failed',message:'length is above 65536'}`，不是本地 invalid-request422。这会掩盖客户端错误和稳定失败分类。

建议统一将 codec failure 转成已声明类型/状态，不丢 reason，也不借修复扩增公共错误枚举。

### F10 / P2：工作台会吞附件/tags/insights/messages 的错误，并隐瞒历史截断

位置：`src/client/native-workbench.js:84-112,200-204`、`src/providers/devin/chat.js:5-44`。

工作台 catch 403/429/网络失败为 []/null，只要 detail 成功就 api:ready；消息只取首50再显示其中20，未跟游标，无截断说明，非文本直接 String(...)。独立分页 helper 没有用于当前降级工作台；达到 pages 上限且上游仍 has_next_page=true 时也 complete:true。已复现 pages=2/items=2/complete=true。nativeOpen 还将 prefixed id 传给 readMessagePages（`assemble.js:179-183`），与本分支其他 REST bare-id 规则不一致；该路径在当前无 H-CHAT 宿主未运行。

建议子资源分项错误可见，分页范围诚实，富内容明确支持/不支持；完整性位以真实末页为准。

### F11 / P2：profile/会话绑定仍可串源，附件上传尤其未绑定

位置：`src/client/api.js:34-35`、`native-workbench.js:25-35,61-68,108-112,131-143`、`index.js:112-135`、`new-session-dialog.js:75-81,121,132`。

工作台 send 带 profileId，upload 却没有：先开 A、激活 B，再在 A 上传，会传到 B 的附件空间而发给 A。create/catalog 也依赖当前 active 而非打开表单时冻结的 profile。currentBinding 的全局兜底优先于 stored 绑定；openSession 还会把旧 visible 本地会话映射改成新 remote，再用定时器打开当时的 active host。effect 不依赖 profileId、load 无代际防护，跨 profile 同 remoteId 或快切页面仍可能迟到覆盖。

建议表单/工作台以 (provider,profile,remote,local-view) 固定绑定；上传与后续发送共用身份；不重写无关旧会话、不以全局 current 作为持久视图身份。未动真实多账号验证。

### F12 / P2：健康度不是实时 scope 事实；生命周期确认不一致

位置：`src/client/native-workbench.js:69-112,155-181,193-209`。

轮询 effect 捕获初始 health，load 用非函数式 setHealth 回写，可把 connect 后的资源状态覆盖回旧值；没有轮询 workspace.status 或 disconnect UI。sleep/terminate 后也不清理 scope。工作台 archive 直接执行，没有侧栏路径具备的危险确认；发送前清空 draft，POST 拒绝或结果未知时丢失输入。终止虽有 RiskConfirmation，但本轮未进入该 UI，不能用静态代码声称交互验收已通过。

建议健康度来自当前 scope/generation，状态控制逐阶段反馈，失败保留草稿；归档确认保持一致。

### F13 / P2：列表、新建、设置仍有未兑现的 UI 合同

位置：`src/client/index.js:54-69,181-184`、`prefs.js:1-30`、`new-session-dialog.js:148`、`settings-dialog.js:209-216`。

列表固定首50，无 load-more；设置可保存 pollIntervalMs，但 index 的计时器不读该 preference，工作台另硬编码3秒。仓库字段宣称每行一个却使用单行 Input，换行粘贴可能合并成一个 repo；T20 使用纯函数构造带换行字符串，未覆盖 DOM。高级字段确实映射进 API，false/0 保留，但全量字段并不等于全量交互验收；security_profile 的显式 `{profile_id:null}` opt-out 没有表单入口。

此组部分为基线遗留债务，在新范围内仍未收口，不能全部归责为本分支回归。建议修最短用户路径而非继续增加空映射测试。

### F14 / P1（测试安全）：live 脚本覆盖固定路径，不是唯一测试资源

位置：`scripts/e2e-devin-workspace.mjs:78-105,148-155`、`scripts/live-bootstrap-once.mjs:22-37`。

两者硬编码业务 root 和固定目录/文件，mkdir 的所有错误被当已存在吞掉，再 createOnly:false 覆盖 sentinel；E2E 最后还删除该固定 sentinel。重复运行或遇同名用户文件会覆盖/删除非本次创建资源。T22 的 opt-in 只是开关，不等于已授权覆盖这些文件。部分步骤 fail 写到 JSON 后仍可能 exit0；本机 sentinel 在另一个临时路径，也不证明同路径本地/远端路由隔离。

建议使用单次唯一目录、createOnly、明确清理 ownership，失败影响退出码，未完成步骤保留 not-run。本轮两个脚本均未执行。

## 3. Provider 与 Devin API 功能映射回顾

| 面 | 当前实现与核对 | 余额 |
|---|---|---|
| profile | 单一 host store、旧 carrier 兼容、0600、token write-only、origin 变化要求重绑 | 批准 provenance 需澄清；失效链见 F03 |
| API 列表/详情 | REST v3 org scope，ID 大部分转 bare；403 不等于不存在 | 首页 UI、native history ID 例外见 F10/F13 |
| 新建 | prompt/title/repos/tags/mode/ACU/resumable、playbook/knowledge/secret/attachment、platform、structured output、安全项进入 codec | 实际付费创建未测；DOM/选择器/权限错误路径不等于 T20 纯函数测试 |
| 管理 | message、tags、insights、sleep/archive/unarchive/DELETE 分开；DELETE 非硬删 | 写入结果未知、分阶段上传、确认与 scope 清理见 F03/F04/F10-F12 |
| SSH 资源 | 固定 gateway、显式 fingerprint、专用 known_hosts、hash artifact、MCP fs/process | 正式授权、根身份、transport 失败和文件语义见 F02-F09 |
| 宿主集成 | 无 H-CHAT 返回503，不 fake Agent；无 PTY/forward 伪成功 | 原生 Chat、远端文件/Git/终端/预览仍属未交付余额 |
| 抽象 | family/operation ID、provider codec/目录已拆；仅真实 Devin，无虚假第二 provider | DEVIN_DEFINITION/assertKnownProvider 目前只被测试消费；provider UI 文件只是 re-export，generic 页面仍写 Devin；不能称完整同源能力投影 |

本轮只读核对官方 Create Session 文档：<https://docs.devin.ai/api-reference/v3/sessions/post-organizations-sessions.md>，OpenAPI `info.version=3.0.0`（2026-11-19 当时内容）。核对了 max_acu_limit integer、resumable boolean、SessionSecretInput.key/value/sensitive、security_profile.profile_id 可为 null 等形态；这不是整个 Devin API 的在线兼容认证，也不是固定版本/哈希 pin。仓内 form test 用 name 代替 secret.key 的 fixture 不能作为上游接受证明。

### 合同登记待 [业主] 澄清

`design-1119.md` 开头/§12 仍写待审阅、R1-R5 未批准；`session-family.js:16-22` 与 `workspace-family.js:221-229` 却把这些 authorityRefs 全标 approved:true。本文只能确认**仓内登记互相矛盾**，不能推断 [业主] 从未批准，也不能替 [业主] 追认。请在现有唯一决定真源中对齐状态；不要另建批准文件。

## 4. 执行记录

### 离线验证

Node v22.23.4、npm10.9.9；测试没有访问真实云端、没有建立 SSH。

| 命令（工作树根） | 结果 |
|---|---|
| `npm --prefix dsh-nano-cloud-session run build` | exit0；构建前后 tracked lib 字节一致、无 drift |
| `npm --prefix dsh-nano-cloud-session test` | exit0；87 pass / 0 fail / 0 skip，含离仓 pack/load |
| `node --test dsh-nano-explorer-extra/test/remote-execution.test.mjs dsh-nano-terminal/test/remote-subprocess.test.mjs` | exit0；5 pass / 0 fail |
| `node scripts/check-route-sensitivity.mjs` | exit0；93 routes / 0 drift |
| `node scripts/check-feature-contract.mjs` | exit0；93 routes，8 plugins 的 UI/dataLocations |
| `git diff --check main...HEAD` | exit0 |

受控复现见 [repros.mjs](evidence/dncs-1119/repros.mjs) 与 [输出](evidence/dncs-1119/repros-output.log)。F01 的 exit1 是故意复现的产品缺陷，不是常规套件失败。未把通过数扩充成全仓全绿。

### [dsh] 开发实例来源与操作

初始 `dsh-dev` 加载的是 main 旧版：无分支新增 host/remote bundle；初次浏览仅作基线，不计分支验收。随后按包内安装合同执行 `DSH_HOME=~/.dsh-dev dsh plugin --profile web add --workspace-root <本工作树/dsh-nano-cloud-session>`（首次未加 --workspace-root 被 pnpm 拒绝），再仅用 launchctl 重启开发 web。未运行会删除插件副本的 `dsh-dev restart`，未动日常实例或邻包。

最终 dependency 是 link 指向本工作树。解析到的 index/host/client/remote 与 HEAD 相同；fresh cookie HTTP 链路最终200，boot rev=842befe73f90，正确 client URL 返回200且内容是分支 bundle 加宿主 framing；ego-browser 也独立拿到200并确认 workspace_shell 标记。因此不能只凭磁盘源码猜正在体验哪个版本。

开发实例期间被外部流程多次重启/同步，出现502/404及 HMR slot 重复注册异常。观察到的 slot 错误涉及 conversation.input.model / nano-model-selector；没有证据证明它是 [DNCS] 本分支所致，也不据此证明工作台失败的根因。未停止其他人的流程，未反复重装、删除或用 tarball 猜修。

注意：本轮安装改变了开发 profile 的本地依赖指向，服务保留运行；它不会因主树同步自然回到 main。需要回基线时应按同一插件安装合同显式重新指向开发副本，而不是 rm profile 或覆盖其他插件。

### ego-browser Agentic 视觉验证

使用 ego-browser v2.2.1，一个任务空间；结束时已关闭本轮页面，无浏览器替代工具。桌面截图与390x844窄屏均实际查看，不只读 DOM。所有检查都在 `https://dsh-dev.local/`，没有使用日常实例。

| 场景 | 本轮结果 |
|---|---|
| 入口与设置 | 侧栏云端工作区可见，设置四页签可切换；token 输入是密码框，现有 token 不回显 |
| 真实连接测试 | config:test 返回 pat_user，orgMatch=true；只读 API，不记录真实 org/token |
| 安全/SSH | 安全页显示600/write-only；SSH 引导可读，未点生成密钥、未 enroll |
| 新建表单 | 空 prompt 时创建禁用；查看上下文/附件/高级项；没有真实创建 |
| 本地校验 | 临时 browser-only guard 拦截 create/archive 任何误提交；输入无效 Session Secrets JSON 后显示错误，保留 prompt/JSON，guard 记录0次写请求 |
| 归档 | 侧栏弹危险确认，取消；同一 guard 记录0次写请求。没有实际归档 |
| 窄屏 | 390px viewport，设置 dialog=342px，左右24px；可读且可滚动，关闭按钮可见；不代表所有宿主界面移动端验收 |
| 既有会话打开 | 多次点审计/探测会话未出现预期工作台；受重启/HMR干扰，**inconclusive**，不写 PASS，不臆断根因 |
| 工作台终止/上传/tags/insights/SSH | 本轮未完成交互验收；仅做代码审查/离线测试，不能借其他路径代验 |

browser-only guard 最后恢复，测试草稿已关闭。没有创建真实云 session、发送消息、上传附件、sleep/archive/unarchive/terminate，没有 SSH、bootstrap、远端写入、PTY 或端口转发。未声称完整 live T22；历史实连不替代本轮。

可查看的低敏截图：[桌面新建表单](evidence/dncs-1119/create-desktop.png)、[窄屏设置](evidence/dncs-1119/settings-mobile.png)。不归档真实 session 内容、Cookie、token URL 或完整账号页面。其他临时诊断留在被忽略的 `.temp/dncs-1119-review-20261119/`，不是持久凭证或新的权威状态。

## 5. 测试覆盖回顾与后续最小闭环

T01-T22 是场景台账，不是22项已完成验收。当前 T12/T13 多为 helper 断言，T18 只测 health 合并/错误识别，T19 主要测 API fixture，T20 只测纯函数/假 fetch；它们没有挂载正式宿主 DOM 或调用完整执行消费链。T14 的 unsupported 证明诚实降级，不证明端口访问完成。87项离线全通过与上述缺陷并不矛盾。

最短后续顺序：

1. 收敛 F01-F07、F14 的稳定性/授权/目标和测试文件安全，逐项补定向行为证据；不反复全仓跑绿替代判断。
2. 对齐既有 R1-R5 决定登记，明确当前允许的降级交付边界；不把新按钮当权限来源。
3. 在没有外部重启/HMR干扰的开发窗口，先复核会话打开和工作台；再定向覆盖 F08-F13 的错误、分页、多profile、输入保留与确认路径。
4. 如要完成真实配对，由 [业主] 明确具体 profile/session、工作根、远端安装/写入/清理动作与费用上限后，才按设计 §11.4 做一次唯一资源的闭环。当前 H-EXEC/H-CHAT 不足的部分继续保留余额，不伪装完成。

本文 closure 关闭的是本轮“审查、体验、复现和留档”任务，不关闭产品缺陷，也不代替 [业主] 对交付/发布的最终裁决。

## 6. 追加裁决：指定 session 的 blocker 定位（2026-11-19 09:45–09:56，本机时间）

本节补充而不覆盖前一轮。对象仍是 `c3a82bc`；[业主] 本次点名 `devin-a65b1a2792e545319b067421c1b9ea4b@ssh.devin.ai`，授权从 [m3max] 使用默认 SSH key 做 session 级基础设施测试。以下的 **VM 工具实连**、**开发站产品请求**、**浏览器诊断性对照**是三份不同证据。未创建付费云 session、未发云消息、未改其归档/生命周期；本轮未提交产品修复。

### 6.1 已确诊：工作台打开的第一个断点在客户端目录同步，不在 SSH

- `dsh-dev` 的 [DNCS] boot rev 为 `842befe73f90`。从同源 session/get 读取指定 bare id 返回 200、ID 匹配、标题 `Linux @ dsh-nano`，当时 status=suspended。ego-browser TaskSpace 111 对该行的真实点击产生 `native_open → 503 NATIVE_UNAVAILABLE → workspace_shell → 200 + local_session_id`；客户端写入了该 local ID 对应的绑定。原生 Chat 的 503 是已处理的分支，不是工作台失败的终点。
- 在相同 tab 上观察原调用、不修改其返回结果，取得 `Error: sessions.retain: unknown session session-6`。源码 `src/client/index.js:124-135` 先发起 refresh 而**不等待**，随后在空 catch 内调用 openSession；已安装 `dsh-client-ui-workspace/lib/client.js:1661` 在导航前 retain，`dsh-api-session-controller/lib/client.js:3025` 在目录还不认识新 ID 时明确拒绝。另一次实测：shell 返回 session-5；400ms 后 mounted 仍是 session-4。`uiWorkspace.activeSessionId` 和 `sessions.current` 在该上下文均为 undefined；内部 `openTabIn` 对未 adopt 的会话静默无动作（`dsh-client-ui-sidebar-right/lib/client.js:2520-2530`）。重复点击还会生成更多本地壳，非新 Devin 会话。
- **改变顺序的正对照**：新 `workspace_shell` 返回 session-7 → `await ctx.sessions.refresh()`（本次约 369ms，不是等待阈值）→ `uiWorkspace.openSession(id)` → selection、`sidebarRight.mounted.getSnapshot()` 均等于目标 → 调公开 `sidebarRight.openTab('devin-workbench', {params:{remoteId}})`。可见 tab 类型正确、标题匹配，健康行 `api:ready resources:disconnected native:unavailable`。同一诊断过程中 get/messages/attachments/tags/insights 均取得过 200。只对这一个 profile/session 作证；同一页面已有该远端 ID 的绑定，**没有证明跨账号或冷启动隔离正确**。不再以外部重启解释这个已捕获的 retain 错误。诊断性调用不是分支修复；页面已关闭。

### 6.2 指定 VM：实际建成的私有资源层

使用 [m3max] 默认 Ed25519 key 和已有专用 known_hosts，StrictHostKeyChecking=yes，不转发 agent、不换 pin。API 标识与 SSH 目标按同一个上游 ID 对应，非独立 VM 身份密码学证明。SSH exec 返回 ubuntu、Linux x86_64、cwd `/home/ubuntu`。非交互 PATH 没有 node；已有 `/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node` 可用，无需安装。

| 层 | 本轮观测 | 边界 |
|---|---|---|
| 部署 | 独占 `/tmp/dncs-1119.KulnvWLW/` (0700)；`bridge.mjs` (0600) 和私有 `work/`；上传前后 SHA-256 `a41c265ad8cd4f54958dc72924b415dc462fd57d6a6df9cc625af7bd298eb438` 一致 | 只写新目录、未碰业务 checkout；/tmp 不承诺跨 VM 重建保留 |
| 文件/进程 | 分支 MCP 客户端经 SSH stdio 协商 `2025-06-18`，列出 12 tools；inspect.root 精确匹配 work；create-only 写 `receipt.txt`，字节回读相等；`pwd` exit 0、stdout 是该 work；结束后第二条全新连接重读相等 | 不是 `/resources` 路由授权；host 仍禁用 process；没有声称所有12种操作均经实操 |
| PTY | 同一目标 `ssh -tt`，远端 stdin 和 stdout 都通过 `test -t` | 证明 gateway 分配 PTY，不证明 [DNT] 已有 resize/exit 的正式 handle |
| 转发 | VM 仅监听 `127.0.0.1` 随机端口；第二条同目标 `ssh -W` 收到本次标记，exit 0，单次 listener 已结束。初期探测未取得端口，不计通过 | 证明 direct-tcpip；未开公网入口，未测试 HTTP/WS、浏览器鉴权或宿主端口代理 |

[冻结的 VM 工具原始输出](evidence/dncs-1119/vm-stdio-result.json)。两次 bridge 已关闭，无需保持 SSH 常驻。上述目录、bundle 与 26 字节回执有意保留；没有删除或覆盖他人文件。分支桥自身仍报告 pty/forward unsupported，两者和底层 SSH 能通不矛盾。

### 6.3 为什么不能把直连记作 [dsh] 产品已接通

1. **根策略明确不同。** 使用实测 cwd 和 `/tmp/.../work` 调分支 `freezeWorkspaceRoot` 得 `workspace-denied / 403`。现有策略要求根在 probe cwd 子树内。真实开发站 `/workspace connect` 显式传隔离根且不请求写授权，没有收到 scopeId：浏览器一次 60.237s 后 502 空体，另一次请求超时；绕过客户端环境代理、仍经正常本机 HTTPS 开发入口，55.700s 后亦 502 空体。**403 是本地策略结果，非在线响应。** 同期 3083 监听 PID 更换，不能从空 502 断定是谁杀了进程或哪一层超时。
2. connect 时观察到宿主先扫描/尝试专用 key，随后再扫描/使用默认 key，并串行执行 uname/pwd/id/node 探测。`resource-service.js:34-91` 是先探测、后验证根、再发布 bridge。证明存在串行等待，不证明它是 502 的唯一起因。默认产品发布路径的同哈希 artifact 已存在；`bootstrap.js:103-147` 会先写固定临时名再 `mv -f`。本轮不为凑绿覆盖该缓存，不调用旧固定 sentinel E2E，也不把 `/home/ubuntu` 整体设成工作根。
3. **发现影响 F06/F07 的更早断点。** 分支 `assemble.js:193-196` 把 `executionWorld:'unbound-remote'` 放到 `sessions.prepare(...meta)`；已安装 `@deepseek-ai/dsh-session/lib/index.js:1830-1843` 构造 header 时只摘录已知字段，保留 cwd、没有复制 executionWorld。[DNEE] 的 header 标记检查因此不能保护这条真实 prepare 路径。不能只给检查函数传手造 header 就宣称已隔离；未对本机或 VM 发危险文件/Git 操作。
4. **区分已有接口与真正缺项。** 已安装 `dsh-api-workspace-files/lib/index.js:399-415,503-508` 的 per-session lookup 给出 header.cwd，但 IO 使用控制器的 `ctx.fs`；有根选择不等于有按会话选 backend。`dsh-api-terminal-controller/lib/index.js:969-988` 实际从 **agent.ctx** 取 subprocess、sandboxPolicy、workingDirectory，并要求 spawnTerminal；宿主并非完全没有执行扩展点，但当前无 Agent 的工作台壳及只支持管道进程的 MCP 都不能直接满足。`dsh-agent/lib/types/runtime-types.d.ts:164-227` 还有 cancel/steer 等义务。本轮未证实已存在可给此壳合法使用的外部 Chat 或远端 terminal handle，不以猜测接口名代替调用链证据。

### 6.4 后续执行裁决（推荐，不等于发布或合同追认）

1. **先修工作台，不等宿主升级。** 按实际 session 目录完成信号导航；await refresh 后仍须确认该 ID 已可选（refresh 可复用旧的在途拉取），切换请求有代际和取消。只绑定返回的 localId，等待目标 mounted/adopt，走公开 openTab；失败分阶段可见，清除 opening，不映射旧 visible、不用400ms定时器、不用全局 currentBinding 作替身。复用/释放本地壳。用两个不同远端、快速切换及工作台冷打开复核，不只测同一标题。
2. **先做产品资源链的最小闭环，再扩功能。** 修 F01/F03/F04 的失败存活、撤销及不确定写入；按正式授权限制 F02/F05。下轮用 `/home/ubuntu` 下新建的唯一私有子目录（不是 home 根），对已有同哈希 artifact 先校验复用，不覆盖；异哈希使用唯一 staging。给 API、key 选择、probe、publish、MCP 分别记录脱敏耗时/失败，避免重复 SSH 往返。在稳定的 `dsh-dev` 上按 `/workspace connect → status → /resources fs.read → disconnect` 验证同一 scope/generation、匹配远端回执、断开后不可用。先只读；未拿到 scopeId 就不算通过。
3. **宿主集成有明确切入点。** 先解决持久/冷开也能辨识 remote 且缺绑定拒绝的正式身份，再让文件控制器、[DNEE] 的 Git/watch/cache 和 [DNT] 的 create/restore 走同一执行绑定。评估现有 agent-scoped subprocess 的合法复用；PTY 要验证输入、resize、exit；端口 owner 要验证会话鉴权、HTTP/WS、断开释放。H-CHAT 单列，不 fake Agent。VM 今天能通是开发依据，不代表以上原生 UI 已完成。
4. 保持完整目标，不要求 [业主] 先接受降级。当前分别标为：**工作台故障已定位且正确顺序实证，分支待修；指定 VM 基础资源层已建并实测；产品 scope 端到端未通；原生文件/PTY/预览/Chat 接入待做。** 前一轮的其他 findings 继续开放，未重跑无关全套件，不把本次证据记作整分支批准。

## 7. 实施与部署回执（2026-11-19，工作树未提交）

**可验收：指定 Devin API 工作台、指定 VM 独立资源桥。未验收：从工作台取得获准的远端执行绑定。** 基线仍为 `c3a82bc`；本节的源码与运行产物是该基线上的工作树修改，不是一个已发布提交。§1–6 保留作修复前记录。

| 审查项 | 本轮实现与验证 | 未覆盖的边界 |
|---|---|---|
| F10–F13 / API 与视图 | 以实际目录刷新、目标 mounted 和公开 openTab 打开；仅用本 tab 的 profile/remote 参数，请求不再借全局绑定。重复打开复用同一本地壳。子资源分别呈现失败，支持消息和会话翻页；发送失败保留草稿；新建附件、目录、创建和归档绑定到相应 profile，repos 多行，安全 profile 区分继承/指定/显式 null。Devin 映射区分本地、API、SSH、原生投影，不用映射替代授权。 | 没有对每个付费创建、真实发送、附件上传、休眠/中止做线上写入。无全量多租户/浅色主题视觉验收。 |
| F01–F05、F08–F09 | scope 结算不再制造额外 rejection，失效读不交付；已发写入丢回执为 outcome unknown。复用区分 profile/epoch/root/grants；MCP 限并发/帧，消费 transport 错误。root 取显式严格子目录并与 inspect 精确匹配；rename 移动链接条目；codec 非法输入 422。 | 浏览器自报授权无效；`/workspace connect` 目前在执行前一律 503，而非已经接上权限 owner。root 精确匹配不等于已经证明并发换链路径安全。 |
| F06–F07 | [DNEE] 在识别出远端绑定时，在本地 Git/watch 前拒绝；[DNT] 拒失效/不完整绑定，新记录保存执行世界，远端冷恢复只保留屏幕不本地重启。 | 真实宿主 header 不保留 executionWorld；既无绑定又无标记时，不能证明是远端而非普通本地会话。旧无标记 terminal 记录不具备新语义。不是原生文件或 PTY 交付。 |
| F14 / 探针 | 独立 workspace 探针要求明确 profile、session、org/ID 一致；在 probe cwd 下排他创建私有目录，文件 create-only，artifact 同哈希复用、校验 staging 后无覆盖发布。 | 验证目录与回执有意保留在专用 VM；未删除历史目录。 |

### 7.1 实际运行证据

- 三包构建成功。全套运行当时：[DNCS] 116/116、[DNEE] 40/40、[DNT] 253/253。最后两项修正后另跑定向测试（DNCS probe/bootstrap/provider 11/11、DNT remote-subprocess 7/7）；不重复加总。路由检查 93 条无漂移，feature contract 通过。
- `~/.dsh-dev` 的 `web` 已将三包 link 到本工作树。部署中包装器第一次误选日常 `~/.dsh`，DNEE/DNT 两项已恢复 `file:`、重建对应依赖；核对日常三包均为原 `file:` 且没有重启日常实例。正确 CLI 指向开发 profile 后仅重启开发 launchd 服务。
- ego-browser TaskSpace 112，最终页面 rev `288212522dcf`（页面 boot 模块修订，不是 SHA-256）。真实点击指定会话两次：`native_open=503`、`workspace_shell=200,200`，同一个 UUID、第二次 reused，标题正确，`api:ready resources:disconnected native:unavailable`；SSH 和终端均 disabled。真实只读连接测试、设置四页签、新建多行、工作台归档取消通过。在浏览器拦截 message、只回 fixture 403 的对照中，发送失败提示可见且草稿保留；不是云端发消息成功。390px 无页面水平溢出，底部取消/创建可见：[最终构建新建表单](evidence/dncs-1119/create-after-390.png)。没有重绘品牌或新增未经设计确认的图标。
- 最终客户端文件 SHA-256 `edb34d34e54d25fb4a5d8558505be57155d1ec4277818eba807fd6e908ca23d1`，宿主 bundle `f467383be461f1deeff5fba5375f32b7c4f4208f0174dd1729395566a20a8782`。实际同源 connect 携带 `authorize:['fs.write']` 返回 `503 workspace-unavailable`，而非 scopeId。
- 显式指定 §6 同一 VM/profile 和默认 SSH key 后，更新后的 `scripts/e2e-devin-workspace.mjs` 首次停在 SSH probe（单独跟踪的 uname 一次 20s 超时）；随后一次取得专属根后停在发布。单独执行本版 publish 核对 chmod、哈希、硬链接发布成功，最终 artifact SHA-256 `8c750692b0664963ab8d327907a35e4b35bf6bd63a8f3e8a5d5480a1b147b1c7`。复用已核验 artifact 的整次脚本退出 0：API 身份、SSH、私有根、发布、MCP 握手、写读回执、pwd、两次本机哨兵、REST 消息页、二次连接读回均 true。PTY、端口预览、原生 Chat 明记 not-run；不能把成功的最后一次解释为网络无抖动或产品 `/resources` 已接通。

### 7.2 仍需 [业主] 的宿主交付决定

当前绑定版本 `@deepseek-ai/dsh@0.2.2-rc.1`：`dsh-user-approval/lib/types/index.d.ts` 的 request 面向**真实 Agent 的已打开 turn**，只授一次动作；`dsh-authorization` 的 owner 是**凭证获取流程**，不是文件/进程授权。两者都不是给无 Agent 工作台壳自批 workspace 的接口。`context/deepseek-harness/packages/ssh/README.md` 的 SSH fs/subprocess/sandbox 参考实现定位 headless/custom profile；其 SSH README 明说 Web workspace 假设本机 FS，不能把换全局 backend 当单会话绑定，也不能将 context 检出当运行版。

推荐指定实际 [dsh] 宿主开发仓、基线/允许部署的 web 版本，以及无 Agent 工作台按本地 view + profile + remote + generation + canonical root 授权/撤回的合同；把同一身份提供给官方文件控制器与终端 owner，由官方外部 Chat 面单独接投影。在此之前保留执行前拒绝，不新开私有跨插件服务或本机代理，不以 mock/独立 SSH 冒充正式宿主集成。**产品正向 connect→scope→fs.read→disconnect、原生远端 Git/PTY/预览/Chat 以及全量视觉适配仍未交付，不建议将整项目标标记完成。**

## 8. 业主裁决回撤（2026-11-19，工作树未提交）

[业主] 裁决：中央 Chat 只能原生映射 Devin，不允许任何手写工作台；右侧综合 tab 废弃；真实云文件 tab 与独立附件 tab 只有在已验证的宿主 cloud-view/严格 capability 过滤合同存在时才可打开——该合同尚不存在，因此本版本一律不打开。

- `session.native_open` 与 `session.workspace_shell` 两个 op 现在一律在 profile 解析、消息读取或任何会话创建/切换之前返回 `503 NATIVE_UNAVAILABLE`；不得用本地 shell、`ctx.uiWorkspace.openSession`、openTab 或任何全局隐藏状态作回退，不得混入 Kitesurf/[DNT]/本地 session。
- 自绘源 `src/client/native-workbench.js`、`src/client/open-sequence.js`、`src/client/providers/devin/details.js` 已改写为无实现的退役注释（tombstone，不删除用户文件）；构建产物不含 `devin-workbench`/自绘组件/壳逻辑。
- 点击会话行在不可用时只显示本地化文案「当前宿主无法打开原生云会话；未切换到本地会话。」
- 独立附件 tab 的边界：附件管理只有在宿主提供按会话严格过滤的原生面时方可存在；插件不自绘、不借用本地会话视图。
- §7 的证据属于回撤前构建；本节之后的行为以本节描述为准。产品未交付，不主张宿主已授权。

## 9. 宿主原生接口准备与 lifecycle 实测留档（2026-11-19，工作树未提交）

[业主] 明确批准：正式宿主接口在独立官方 `dsh-v0.2.2-rc.5` 分支开发（`.agents/worktrees/dncs-native-host`，独立分支 `dncs-native-host`），仅 dsh-dev 装载；不改原 pin/eval/context、不 push、不修改已安装 runtime。终端可用性仅限真正 SSH 直连，拒绝本地 fallback。真实写仅限专用测试会话——**ID 尚未提供，任何写请求均未发送，不向 `Linux @ dsh-nano` 会话发送**。

- 数据面实测（读）：同一 Linux VM 对应会话 2 页 52 条消息，时间正序，user/devin 两侧均带 `event_id`——**非原生 chat 的读取数据通路已通**（仍非宿主原生投影）。
- 管理位实测：设置跨源保存提示生效；原生管理窗 sleep/archive/terminate 三项取消路径各发 0 写请求；中止未勾选时确认按钮禁用；**全部写操作未实发**。
- 本轮回撤修正：管理目标冻结在 `sessionsProfileId`，缺失时管理窗禁止打开（不再 fallback active profile）；terminate 失败后错误显示在 RiskConfirmation 确认窗内，不展示假成功。
- 下次发写需 [业主] 另批并提供专门会话 ID。

## §10 Native acceptance round — targeted fixes (read-only + one approved write)

- 唯一获批真实写：专用 fixture `d445d3e4a63b4646b0c9d7335704fafa`，业主本人执行一发；API 回读 user `event-01a1f24711847ed9b174b12ad40a74e2` + assistant `event-01a1f2471bef71b3830253ba5cde3942`（`DNCS-NATIVE-OK`）。本轮未再发任何真实请求；Linux VM 只读 52 条。后续视觉验收由业主浏览器执行。
- assistant wire 改为 display-only `external/assistant-message`（`ignorable:true`，`data:{id,text}`，不写持久 log、不改 SDK/persistence）；宿主 ui-chat 新增 `external.ts` ConversationNodeDefinition + `SessionEventMap` 声明合并，`context.id`=event_id、role 'start'、settled `AssistantChatData`（turn:0、step:seq+1、finalNode.messageId=event_id），`buildViewNode → chatNode(...,'assistant-step')` 复用原生 renderer，零自绘。assembler 测试：replace 历史→append user+assistant→唯一 assistant-step 节点、无 turn/step/process/usage 伪物、增量与重开一致（98/98）。
- 固定 Chat：`DefaultConversationViews` 外部会话恒 `'chat'`；`ConversationSessionHeader` 外部会话仅 chat tab、隐藏本地 actions/utilities/菜单，保留 header corner。`StatsPills` 唯一宿主位 `conversation.composer.dock` 由 InputBar `!external` seat 级抑制（非 CSS）；wire 层不再伪造 turn/step/usage/ACU。
- 标题：`native-view` summary 带 `projections:{kind:'sequenced',asOfSeq:-1,values:{title:live.title}}`、follow 帧 `values.title` 随 poll 刷新；无合成 title 事件、无持久写。状态用真实 schema `status`+`status_detail`，删 `status_enum` 用法，`exit/finished` 不算 running。
- 独立 attachments tab：DNCS 注册 `sidebarRightTabs` definition `nano-cloud-session.attachments`（kind `cloud-attachments`，`externalOnly:true`），仅经 view summary `externalTabProviders:['nano-cloud-session.attachments']` 准入；本地/旧代/未准入外部一律路由拒绝（宿主 `externalOnly` 字段+`requireTabAllowed` 已在位，新增本地拒绝测试 6/6）。
- `session.external_attachments` op：dispatch 跳过 `pick()`，profileId/bare remoteId 只从已验证 registration 恢复，浏览器字段不可重定向（注册外 id→404 not-registered）；上游 `getAttachments` 数组直通 `{ok,items}`。
- 客户端 `attachments-tab.js`：原生 Button/Icon（Paperclip/Download/Refresh）+ul 列表，loading/empty/error+retry，`useSession` 取精确 mounted sessionId，gen+mounted 双重 stale 防护，仅 `https:` URL 渲染 `noopener noreferrer` 锚（无则不给链接），不记录签名 URL。
- 宿主修复：`guideEntries`/`tabTypes` 本地分支 getSnapshot 每次返回新数组 → `Maximum update depth exceeded`，seat 套件 47 例全挂；改为与外部分支同构的 last/cached 记忆，21 files / 328 tests 绿。
- 验证：DNCS build+**141/141**；宿主 `build:artifacts` **8/8 gates**（含 client compiler）；`git diff --check` 两树 clean，均未提交。已 `launchctl kickstart -k` 仅重启 `ai.deepseek.dsh.dev.web` fork 入口（bin.js 指 dncs-native-host worktree），:3083 就绪、路由 401；未动其他 profile、未写 VM/云、未 push。
- 边界：assistant 无 turn 的 renderer 走原生 assistant-step（assembler 级已证），实时增量 poll 显示待业主浏览器验收；files/terminal 仍未投产；fixture attachments 5 项仅契约+路由测试，未实读渲染。

## §11 External workspace resources round — files, attachments hardening, SSH terminal (deployed :3083, visual acceptance pending)

[业主] 授权范围：仅 dsh-dev、profile `dncs-3871b756`（org 绑定）、bare `a65b1a2792e545319b067421c1b9ea4b`、root `/home/ubuntu/dncs-probe-bnKCjHep` 只读（含 sentinel.txt）+ 同 VM 用户 SSH 交互 shell（cwd 同 root，不受文件 root 限制）；验收命令仅 `pwd; uname -s; exit`。本轮零云写、零真实请求。

- Host-owned grants：`DSH_EXTERNAL_WORKSPACE_GRANTS` 指向 user-owned 0600 JSON 数组（dev fork 入口 `~/.local/bin/dsh-dev-web-fork.sh` 唯一点位，文件 `~/.dsh-dev/nano-cloud-session-grants.json`）。绑定精确 opaque external id（含 profile epoch）；校验 endpoint/user 无 userinfo、identity/known-hosts 绝对路径、root 严格子目录（非 `/`、`/home`、`/home/<u>`、`/Users/<u>`、`/root`、本地 home）。无 secret 入档、key 内容从不被读。
- `grantOf`：仅存活 registration 可查；release/epoch 失效即 `undefined`；summary 的 `externalTabProviders` 由宿主按 grant 增补（files external + documentpreview；`terminal:true` 才加 terminal external）——provider 自声明部分原样保留，无 grant 时 only declared。
- workspace-files：lookup 对 `external:` id 仅在 grant+live registration 时产出 scope（`workspaceRoot=grant.root`，`external={backend,signal,current}`）；sessionController 改回 `scope.get()` 可选注入（之前硬 inject 导致无该服务的环境整个 lookup 不注册——binary-rpc/scope 套件曾全挂，已修）。read/stat/list/readBytes 走 SSH backend：`execFile('/usr/bin/ssh', [-F /dev/null, -i, -oBatchMode=yes, -oIdentitiesOnly=yes, -oStrictHostKeyChecking=yes, -oUserKnownHostsFile=, -oForwardAgent=no, -oClearAllForwardings=yes, -oPermitLocalCommand=no, --, user@host, python3, -c, <fixed helper>])`，请求 JSON 走 stdin（execFile 无 input 选项，已改为 child.stdin.end），30s timeout / 8MB maxBuffer / `env={PATH}`；helper 只读 fd-anchored + O_NOFOLLOW，枚举 stat/list/bytes。search 在任何 `ctx.fs` 触碰之前先查 external → `search-failed`（真实 bug 修复：原先会先 local stat 远端 root）；changes → `watch-unsupported`（FileNavigator 已有软回退，手动 refresh 可用）。in-flight 读：caller+lifetime 合并 signal；revoke → `session/not-found`；non-owner → `session/not-found`。新错误码 `workspace-file/external-unavailable` 已登记 RemoteErrorDetailsMap。
- terminal-controller：`terminalScope` lookup discriminant `{kind:'agent',agent}|{kind:'external',sessionId,grant,lifetime}`，wire 参数仍 `agentId`；缺 grant / `terminal!==true` / 未注册 → resolve undefined。external launch = 字面 `/usr/bin/ssh -tt <strictFlags> user@host "cd -- '<root>' && exec /bin/bash -l"`，`env:{LANG:'C.UTF-8'}`，不接收 shellPath/argv/cwd/env。`asScope` 兼容直调 bare Agent（内部 + 测试面），Remote 边界类型仍仅 TerminalScope（typert 禁 Agent 类实例入边界——重命名 param `terminalScope` 以满足 lookup 命名规则）。revoke → owner lifetime abort → disposeOwner terminate 全部 SSH 子进程；non-owner → session/not-found；files-only grant → session/not-found。
- Client：`ui-sidebar-files` 注册第二 definition `@deepseek-ai/dsh-client-ui-sidebar-files/external`（kind `cloud-files`、`externalOnly:true`）复用同一 FilesBody/FilesTitle/FileNavigator；`ui-sidebar-terminal` 注册 `.../external`（kind `cloud-terminal`、`externalOnly:true`）复用同一 TerminalBody/Title 与 close handler；preview 凭 `externalTabProviders` 里 documentpreview id 准入。`placeResource` 新增 `requireResourceScoped`：`dsh-resource://<type>/session/<id>/…` 的 `<id>` 与 mounted sessionId 不一致且任一端为 `external:` → 拒绝（在 pin/claim 前）；local↔local 跨会话行为不变。
- DNCS attachments 加固：`safeUrl` 提取为无依赖模块 `safe-url.js`——`new URL` 解析、仅 `https:`、username/password 皆空（含 `u%40ser` userinfo 拒绝）；sessionId 变化即清空 items；strict-mode remount 时 mountedRef 复位；新增 node:test 契约用例。
- Fork launcher：`dsh-dev-web-fork.sh` 唯一新增 `DSH_EXTERNAL_WORKSPACE_GRANTS=~/.dsh-dev/nano-cloud-session-grants.json`；原入口备份仍在 `.agents/launcher-backup-ai.deepseek.dsh.dev.web/`。
- 验证：新增 host 测试 17/17（grants 装载/校验/ssh argv 字面量/绑定-撤销、workspace-files SSH argv+stdin JSON/confinement 映射/拒绝 search+watch 且不触碰 transport/in-flight+mid-read revoke、terminal scope/PTV argv/env/非授权 id+files-only+non-owner 拒绝/revoke 终止）；workspace-files 262/262、terminal-controller 271/271、ui-sidebar-right 328+7、DNCS 143/143；`build:artifacts` 8/8 gates；fork `kickstart -k` 重启，PID 39368 worktree bin.js，POST status/session → 401。
- 待业主视觉验收：cloud-files tab（sentinel.txt 应可见）、preview 打开、cloud-terminal `pwd; uname -s; exit`、attachments 5 行链接、实时增量 poll。files 仅 stat/list/read/readBytes；search/watch 显式拒绝；无 fake watcher。

## §12 Browser acceptance round — guide/files/terminal verified on :3083 (2026-11-19)

本轮修复 + ego-browser taskSpace(119) 实际点击路径验收，全部为只读与已批准的 `pwd; uname -s; exit`；零云写、零 Devin prompt。

- 外部 alias 去重：`ui-sidebar-files` external registration 移除重复的 `sidebar.right.tab.files.actions` child 与 `commandId: 'workspace.files'` guide——external alias 仅 `externalOnly` + 自有 guide id `cloud-files`（无 commandId），复用同一 `FilesBody`/`FilesTitle`/`FileNavigator`，body 以 `renderSlot: () => undefined` 屏蔽动作槽（本座声明无 child，props 本就不带该 seat）。
- 远端 helper 安全重写：弃 `os.chdir`；helper 先 `os.open("/", O_RDONLY|O_DIRECTORY|O_NOFOLLOW)` 自 `/` 逐分量 walk 批准 root（父 fd 每步关闭），再 walk 目标 path；拒绝 `.`/`..`/空分量/绝对路径/NUL。文件打开用 `O_RDONLY|O_NOFOLLOW|O_NONBLOCK` + `fstat` 仅收 regular（FIFO/socket/特殊件 → not-file）；stat 允许 dir/file；list 枚举跳过特殊类型为 `other`。
- SSH 传输修正：OpenSSH 会把 argv 拼接成一条远端命令，未引用的多行 `-c` 脚本会碎。改为**单个** argv 元素 `python3 -c 'exec(__import__("base64").b64decode("<helper.b64>").decode())'`（helper 源码 base64 编译期嵌入，请求 JSON 仍走 stdin）。实测该命令回 `{"ok":true, result:{entries:[sentinel.txt]}}`。
- grant 文件加载加固：`openSync(O_RDONLY|O_NOFOLLOW)` + 同 fd `fstat`：必须 regular、mode 0600、`uid === process.getuid()`，拒绝符号链接授权文件；读取直接来自已验证 fd。root 校验追加 `.`/`..` 分量拒绝。
- 实测发现并修复的 3 个集成 blocker：
  1. `summaries()` 不给外部行 `cwd` → FilesBody/FileNavigator 全以 `sessions.byId[id].cwd` 为根判据，显示「没有工作区目录」；改为 grant 命中时 summary `cwd=grant.root`（只作导航根标记，读仍只走 external scope）。
  2. wire path 为绝对路径时 external backend 原样透传 → helper confined → 「在工作区之外」；新增 `externalRelative()`：绝对路径必须位于 grant root 下（root→''，子路径→相对），root 外 → `outside-workspace` 且不碰 ssh（回归测试：绝对路径翻译 + `/etc/passwd` 拒绝且 execFile 调用数不变）。
  3. `terminalScope` lookup `wire` 误写 `agentId`，strict descriptor 期望 `terminalScopeId` → `gateway/provider-mismatch`；改 `wire:'terminalScopeId'`。另 `spawnTerminal` 的本地 `cwd` 误用 remote root → 进程 exit(1)；TerminalLaunch 增 `cwd` 字段，external launch 用 `homedir()` 本地目录，远端 cd 仍由固定命令完成。
- ego-browser 实见证据（无凭证、无签名 URL、无终端秘密入图）：
  - 授权会话 `Linux @ dsh-nano`（external:devin:ZG5jcy0zODcxYjc1Ng:a65b1a2792e545319b067421c1b9ea4b:0）打开原生 Chat 历史正常；右侧 guide 恰三项：**工作区文件、新建终端、附件**（`native-cloud-guide-rc5.png`）。
  - 工作区文件 → 原生 Files 页顶部 `/home/ubuntu/dncs-probe-bnKCjHep`，树内仅 `sentinel.txt`（`native-cloud-files-rc5.png`）。
  - 点 `sentinel.txt` → 原生 document-preview tab 打开，路径 `/home/ubuntu/dncs-probe-bnKCjHep/sentinel.txt`，正文 `dncs-e2e 2026-11-19T02:47:50.436Z`（`native-cloud-sentinel-rc5.png`）。
  - 新建终端 → xterm 原生终端，prompt `ubuntu@devin-box:~/dncs-probe-bnKCjHep$`；输入 `pwd; uname -s` 回显 `/home/ubuntu/dncs-probe-bnKCjHep` + `Linux`；`exit` → `logout` + `Connection to ssh.devin.ai closed.` + 「进程已退出（0）」（`native-cloud-terminal-rc5.png`、`native-cloud-terminal-exit-rc5.png`）。
  - 未授权云会话 `Windows @ dsh-nano` guide 仅 **附件** 一项——files/terminal 不出现（`native-guide-ungranted-rc5.png`）。本地会话 guide 为原生 文件/代码审查/新建终端/Kitesurf，无任何云项（`native-guide-local-rc5.png`）。
  - 390px 宽（Emulation 覆盖）下侧栏折叠为导航抽屉，云会话可开、guide→Files→sentinel.txt 同样可用（`native-cloud-files-390-rc5.png`）。
- 测试面：external.spec.ts 新增绝对路径翻译用例（8/8）；`apply.client.spec`（files/terminal）更新含 external 注册位的快照断言（registration 顺序与 seat 数核实）。合并套件 75 files / **1300 tests pass**；`build:artifacts` **8/8 gates**；`git diff --check` 两树 clean，未提交未 push。fork 唯一入口 kickstart 重启，路由 401。
- 已知边界：search/watch 对 external 显式拒绝（navigator 手动 refresh 可用）；attachments tab 本轮未再实读（上轮已见 5 行）；终端 resize/reconnect 未专项演练（复用原生路径）；进程退出后「新建终端」按钮可再开（原生行为）。

## §13 Closeout round — external status phase, profile freeze, prompt outcome (2026-11-19)

本轮只读 + fixture 重放，零真实云写、零 Devin prompt、未发送第二次收费请求。

- **真实生命周期相位**：`native-view.js` 新增 `phaseOf(detail)`——new/claimed/resuming→pending、running/working→working、running/finished→completed、running/waiting_*→awaiting-input、suspended→suspended、error→failed、exit→stopped、其余→unknown；raw `status`/`status_detail` 原样保留在 view state。`summary.running` 只看 phase==='working'——`running/finished`、`waiting_for_user` 不再暴露 Stop。poll 中 `getSession` 失败显式置 `unknown`，不再静默保留 working。
- **非durable状态通知**：external view 的 follow 初始与每次相位变更产出 `{type:'external-status',phase}`——不占 event seq、不持久化。Client 契约新增 `SessionExternalStatusPhase`/`SessionExternalStatusNotification`（types.ts），transport 将该 frame 走 notifications 通道（`SessionFollowNotification` union），`Session.acceptEventChange` 仅在 `external===true` 的会话上同步更新 snapshot `externalPhase`——本地流无法伪造外部生命周期。
- **Composer 原生暴露**：`InputBar` external 时禁 `primaryStops`/`interruptible`/steer/queue 模式（`primarySubmitMode` 固定 'enter'），`apply.ts` inject 对 external 关闭 `toggleCommandMenu`/`stop`/`retry` 并喂 `ABSENT_LEXICON`/`ABSENT_MENU_LAUNCHER`（slash/@ 入口无候选）；placeholder 为纯文本原生 locale 键 `placeholder.external.{working|awaiting|idle|unavailable}` 按 externalPhase 取——8 语言本地化，非 CSS。queue/busy 反馈保留（sending spinner、draft）。
- **prompt outcome 诚实**：`postMessage` 网络层（status 0）与 5xx 包为 `CarrierError('upstream-unknown', 'prompt outcome unknown, check session history before resending: …')`；mismatched 回执同；abort 仍抛 abort；403/422/429 等已分类状态原样透出，不遮蔽、不自动重试、不误称成功。
- **profile 冻结**（本轮确认已在位并补测试）：row click 传 `{profileId: sessionsProfileId}`（section.js:186）；`openSession` 缺 profileId → 拒（先于请求）；response 回来后 `store.current.activeId !== profileId` → 拒开，不绑错 org。回归断言已加入 `workbench-open.test.mjs`。
- **文档**：AGENTS.md 同步——native_open 合同为 `sessionController.externalSessions.nativeViewVersion === 1` + 显式 profileId；删除「一律 503」「mint 工作台宿主会话」与 `ctx.externalChat` 假合同表述；`workspace_shell` 恒 503。
- **测试**：`devin-native-view.test.mjs` 16/16——phaseOf 全表、初始+变更 external-status 帧（不占 seq/不持久化）、getSession 失败→unknown、prompt unknown/403/422/429 分流、**fixture 重放**（两条已批准真实回读 event `event-01a1f24711847ed9b174b12ad40a74e2`(user) + `event-01a1f2471bef71b3830253ba5cde3942`(assistant 'DNCS-NATIVE-OK') 重开两次各恰出现一次）。DNCS 全套 149/149。宿主 `session.client.spec` +2（external snapshot 更新 + 本地伪造拒绝）、`transport.client.spec` +1（frame→change 映射）——session.client 75/75、transport 245/245。
- **区分**：实时 fixture 指上述两条已知 event 的投影重放（单元测试内回放，无网络）；真云历史回复指上轮 :3083 实际打开 external Chat 见到的 52 条历史与 `DNCS-NATIVE-OK` 回复——本轮浏览器仅做设置/管理/布局复核，未重发。
- **浏览器复核**（ego-browser taskSpace 121，无生命周期提交、无新建、无 prompt）：设置弹窗 4 tab 接入/会话/安全/SSH 齐（`native-settings-tabs-rc6.png`）；管理弹窗 休眠/归档/中止 出现且「关闭」取消无请求（`native-manage-cancel-rc6.png`）；中止 RiskConfirmation 复选框+取消路径正常；打开 Linux @ dsh-nano 原生 Chat 历史在、composer placeholder 显示「向云会话发送消息」（external idle phase locale），composer 无任何本地 stop/命令/附件/模型按钮（`native-external-phase-rc6.png`）；390px Emulation 下 scrollWidth==clientWidth==390 无横向溢出（`native-390-rc6.png`）。
- **失败如实**：`session-models.host.spec.ts` 3 例「profile reload requires the root Include entry」孤立与合并运行均失败——config-editor/app-boot 模型选择路径，与本轮改动文件无交集，判为预存环境失败，如实报告不扩大改动。
- fork :3083 已 kickstart 重启（PID 97567 worktree bin.js），路由 401；`build:artifacts` 8/8 gates；`build:check` **2/2 gates PASS**（本轮顺手修复了前几轮未提交测试文件的 tsc 欠账：TerminalScope 直调 cast、subagent SessionAddress.mode、files-only grant 的 exactOptionalPropertyTypes、快照字面量 `external` 字段——均为断言级修正，行为不变，1485/1485 复测绿）；两树未提交未 push。

### §13 追补 — 源码核对三点（2026-11-19，同一轮内，仍零云写）

1. `InputBar.steeringAvailable` 前置 `!external`——键盘与按钮两条 queue 路径都到不了 external。
2. `client/index.js` 在 `await ctx.sessions.refresh()` 之后、`uiWorkspace.openSession` 之前再核 `store.current.activeId === profileId`——refresh 期间发生的 profile 切换同样拒开。
3. `native-view.prompt`：dispatch 前 `signal.throwIfAborted()`（预取消零 postMessage）；一旦交给 carrier，abort/网络/5xx/非法或不匹配回执（含 `parseRemoteSessionId` 抛错）全部归 `upstream-unknown` 且不回显回执数据；确定 4xx（403/422/429 等）保留原 reason。测试：预取消零 post、提交后 abort→unknown、非法/不匹配回执→unknown 且错误不含回执内容。
- 复验：DNCS 150/150（devin-native-view 17/17）、ui-conversation 914/914、`build:artifacts` 8/8；fork 再次 kickstart（PID 17426），路由 401。

### §13 再补 — 生命周期 host-handler→carrier 行为覆盖（2026-11-19，受控上游，非真实云操作）

`test/routes.test.mjs` 新增一例：`t.mock.method(globalThis,'fetch')` 截断全部出网——断言的是路由→carrier 行为，零真实请求。save A + save B + activate B 之后，五次操作均显式携 `profileId: A`：

- `POST /create` → `POST /v3/organizations/org-a/sessions`（body 含 `prompt`，无 `profileId`/`secret` 泄漏）；`/session` op `sleep` → `POST …/abc/sleep`；`/archive` → `POST …/abc/archive`；`/unarchive` → `POST …/abc/unarchive`；`/terminate` → `DELETE …/abc`——逐条断 method+pathname 与官方 v3 openapi 一致。
- 全部请求的 authorization 头唯一且属于 profile A 的 token——显式绑定胜过 active B（值不落档）。
- 上游 403 → 路由返回 HTTP 403、`ok:false`、`reason:'forbidden-or-invisible'`、`providerStatus:403`，denied fetch `callCount() === 1` = 恰好一次上游尝试、无自动重试。
- `node --test test/routes.test.mjs` **14/14**；无产品代码改动、无重启。

## 14. 最终构建：真实回复实时到达，刷新无重复

[业主] 另行批准一次向 `DNCS native chat e2e`（`d445d3e4a63b4646b0c9d7335704fafa`）的实发。ego-browser 打开此会话，确认中央有上次回复 `DNCS-NATIVE-OK`、无本次标记。从原生 composer 输入 `请仅回复 DNCS-LIVE-OK，不要执行命令或修改文件`，仅点击一次发送，不重试。

- 在不切换、不刷新的同一页面观察到用户消息和独立助手回复 `DNCS-LIVE-OK` 各一次，右栏关闭。截图：[最终构建中央 Chat 实发回执](evidence/dncs-1119/final-native-live-reply.png)。
- 同一 Devin 会话 API 返回新的用户事件 `event-01a1f2b793c57dfaac69db93169ecc6d` 和助手事件 `event-01a1f2b79c0f71f1b99815c289206f4c`，助手文本精确匹配。
- 重新加载开发站，不再点会话行。浏览器新文档的中央 Chat 恢复该消息和该回复，各一次，原生 composer 仍在。此证据关闭第 10–13 节所留“最终构建真实回复实时到达未验证”，不改变首轮实发发现过同步缺陷的记录。
- 本次没有向 `Linux @ dsh-nano` 发消息，没有新建云会话、归档、休眠或中止。上述生命周期写入的真实云端副作用不作为本轮通过项；云文件只读授权、搜索/监视、PTY 重连等边界见第 12 节。
