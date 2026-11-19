# 1119 · Kitesurf 交付缺口审查与升级台账

> **Verdict：NOT READY FOR DELIVERY。** 当前 [DNK]/[DNLS] 可以呈现部分网站、执行部分 CDP 操作，但不能作为可靠的「浏览 + 同页调试 + MCP 协作 + 一键恢复」交付。9/9 GUI 冒烟和 74/74 [DNK] 单测不能推翻本轮真实复现的阻断缺陷。
>
> 本文是交付审查与后续工作建议，**不是修复完成声明，不新增发布门禁，不擅自扩展公共协议**。文名按 [业主] 指定的 `1119`，实际取证日期为 **2026-11-18，Asia/Shanghai，20:52 起**；各 API/状态证据保留自身时间，报告复核随后完成。

## 0. 范围、基线与证据规则

### 0.1 审查基线

| 项 | 本轮锁定值 |
|---|---|
| 仓库提交 | `55b5b6e04115671623d80f14c4823308f3b6a37e` |
| 审查工作树 | `kitesurf-delivery-review`；只增加本文和证据，不改产品实现 |
| 产品范围 | [DNK] UI/宿主/技能、[DNLS] Kitesurf 路由/CDP/runtime/driver/adapter/MCP 桥及测试、部署与验收工具 |
| 实测环境 | 现有 `https://dsh-dev.local/`；`DSH_HOME=~/.dsh-dev`；`kitesurf-dev`；宿主 3083、引擎 8800、桥 8801 |
| 引擎 | 官方原样 `39feadfb9a3e6c14b40cf170a559ce417d0fce5d` |
| 配方镜像 | `kitesurf-engine:39feadfb9a3e6c14b40cf170a559ce417d0fce5d-665716c07c13` |
| 工具 | 离线 shell Node 22.23.4；dev 宿主 Node 24.22.2；容器 agent-browser 0.42.0 / Wrangler 4.131.2；ego 指南 2.2.1 |
| 部署一致性 | 初始与最终均逐文件比较 67 项：仓库与 dev 相同；runtime receipt 9 项输出 SHA-256 均匹配 |
| 禁止动作 | 未部署或重启 desktop，未修改官方 pin，未修产品代码，未升级依赖，未推送远端 |

基线证据：[部署比对](<1119-evidence/deployment-parity.json>)、[最终比对](<1119-evidence/deployment-parity-final.json>)、[runtime 完整性](<1119-evidence/dev-runtime-integrity.json>)、[镜像内工具](<1119-evidence/dev-image-tools.json>)。

**纠正前序误诊：** 官方源码目录是无独立 `.git` 的归档，在里面运行 `git rev-parse HEAD` 会得到父仓提交；`55b5b6e` 不是 Kitesurf pin。`/json/list` 是发现入口，不能当作 [DNLS] 持有页面的 URL 真源。关闭独立诊断 socket 不能据此推断 [DNK] 页面被清空。引擎 `Page.navigate` 等待脚本执行路径，不只是文档 commit；但其回复仍不等于所有异步应用内容已经出现。

### 0.2 证据分类

- **LIVE**：本轮真实 dev 接口、UI、容器/宿主生命周期返回，附 JSON/截图/日志。
- **FIXTURE**：离线最小反例或 dev 容器内可控测试网页；能隔离网络因素。
- **SOURCE**：锁定提交的静态可达代码路径；未经动态触发的结论明确标注。
- **HISTORY**：Git 提交和旧实验记录；只证明当时记载过，不能冒充本轮重跑。
- **NOT RUN / BLOCKED**：明确未测、受阻或不宜在当前实例执行；不算通过。

P0/P1/P2 为**交付整改优先级**，不是安全漏洞评级。没有跨信任边界和具体影响证据的协议/隔离偏差，不称为已确认安全漏洞。本轮是功能与交付审查，不是渗透测试；未做破坏性/耗尽型测试。离线测试隔离了 HOME/状态/缓存，但不是 OS 强制安全沙箱，不用其结果证明安全边界。

### 0.3 执行副作用与清理

1. dev 初始容器为 stopped，经真实 `/recover` 启动；全程没有启动替代 [dsh] Web 服务。最终[清理状态](<1119-evidence/dev-cleanup-final.json>)为容器运行、ready/live=true、example.com已打开；浏览器测试TaskSpace已结束。
2. 可控网页只监听 **dev 容器 loopback:9919**，覆盖 static / delayed SPA / missing module / 12 秒慢模块 / HTTP echo / 仿真初始与延迟观测；不开放宿主公网端口。保留了[合并后的复现夹具](<1119-evidence/dev-fixture-server.cjs>)，原始第一轮夹具 20 分钟上限，第二轮 120 秒上限。
3. WS MCP 只读 `get_url` 结果报告 `engine:chrome, browserLaunched:true, applied:false`，与 pane 不同页；随后停止该链路并仅 stop/start dev 容器清理。**此字段不能单独证明实际启动了 Chrome**，因为兼容响应及 agent-browser 分类也可能使用 Chrome；准确结论是「身份/attach 未被交付验证，返回页与 pane 不一致」。
4. 第一轮 fixture 后台作业随该次容器 stop 退出 137，是主动清理，不算产品崩溃；第二轮正常 `/stop` 退出，见[作业收集摘要](<1119-evidence/fixture-jobs.json>)。
5. 先恢复 viewport/UA/headers 等核心设置，后重启已有 dev 宿主验证冷恢复；历史由 10 地址变为 0、locale 由值变为缺省，是本轮复现而非清空 API。最终 dev 运行、打开 example.com，humanHold=false，未残留测试夹具服务。
6. 测试中没有将 MCP 错误连接的页面作为 Kitesurf 浏览验证；未调用 `agent_browser_open/close`，没有让它导航外站。
7. 截图已裁切为 Kitesurf 区域，避免把同页其他插件内容作为交付证据。未保留 token/cookie/完整环境变量。

---

## 1. 前序修复：按 Git 历史而非口头“完成”追踪

完整相关提交索引见 [Git 历史归档](<1119-evidence/git-history.tsv>)。下表保留关键变更、正向价值和仍未证明的部分；合并提交不是另一轮独立验收。

| 提交 / 合并 | 目的与实际修复 | 当时证据 / 本轮评价 |
|---|---|---|
| `3367195` → `b20676a`；产物 `2c11f9e` | 客户端导航失败自动重试一次、调整确认时限 | 解决表面“打不开”，但多层重试可能重放尚未完成的导航；后续 repin 已删除此策略。不能据此推出连接稳定 |
| `305a4ea` → `2687fb2`；产物 `6609408` | 增加 4 秒截图/确认期限，快速失败 | 是客户端启发式，不能辨别慢网页和死引擎；后被替换。说明历史上在症状上反复加预算，而缺真实阶段观测 |
| `5d6a4d9` / `eb23907` → `decc02b` | 去重页面中心/心跳文案 | UI 改善，不是导航正确性证明 |
| `b3fcccc` → `ffdba88` | 容器资源以 profile 为准，识别规格漂移并重建 | 正向修复；现行实现见 [prepare](<../../../dsh-nano-local-sandbox/src/host/routes.js#L530-L594>)。资源一致不代表网页应用可用 |
| `d375d46` | UA / media / extraHeaders 从设置下发到 driver | 核心字段有事务测试，但后续扩充的 JS shim、cookie 具有不同副作用，旧测试不能自动覆盖 |
| `7ca858b` | 引入五类页面阶梯实验 | 增加静态、长文、React、动画站样本；但 [通过条件](<../../../scripts/eval-page-ladder.mjs#L40-L56>) 对空壳/截图有效性过弱 |
| `9b6287f` → `0f0ab20` | repin 官方 `39feadf`，本地补丁迁回 driver；history/settings/runtime/reconciliation；串行导航；不以超时杀 socket | 是正确方向。旧记录称 DNLS 203、DNK 71、上游26、专项11、网页5、连续40通过；本轮不重跑 Bazel，不把这些数字借用成当前结果。见 [旧 repin 实验](<../../../lab/kitesurf-repin-39feadf.md#L35-L71>) |
| `9ded627` | Network 生命周期、size/duration/cache、查询清空 | 后端 ring 得到字段，但前后端增量语义未闭合；本轮显示已有请求失败后 UI 仍 pending |
| `baf55af`、`6af931b`、`02c34d7` | 地址栏心跳、三 tab 控件栏、图标避让 | 外观/布局有效；心跳本质是本地计时，尚无宿主阶段或 last-event age |
| `e1f94b0`、`b9100f5` | 模拟 tab、GPS/locale/color-scheme/cookie，Elements 详情可关 | 保存回显曾代替实际值验证；本轮发现 locale 晚于页面脚本、DPR不生效、cookie清除无效 |
| `9056d5b` | Cookie 从页面表达式改为 `Network.setCookies`，按 pageUrl 配作用域 | 能写 cookie jar；但 setCookies([]) 不等于删除，scope 与前次/失败导航状态存在盲点 |
| `62c09a9` | 设置移除历史 tab，保留工具栏入口 | UI 收敛完成，不改变历史内存存储的生命周期 |
| `11a07bf`、`9ee9adc` | 请求 Headers/Payload/Response、Console level | 请求详情正向可用；未验证日志持续更新、异常、pending→failed 和接口cursor |
| `77f0421` | 212 对中英文 key 校准、硬编码收拢 | key parity/非空有测试；未验证所有残余文案、placeholder parity、英文实际UI。不是浏览能力验收 |
| `230ad45` | heartbeat 工作树整体合 main，并删除工作树 | **合并是代码集成，不是 desktop 完整交付。** 工作树完成结论超出了当时证据范围 |

### 1.1 为什么上次能“收口”但用户不能用

不是单个上游问题。存在四个具体替代关系：

- **“若干网站的 HTML/截图成功”替代“用户实际应用启动并可交互”。** title marker 可能本来就在服务端 HTML；SSR 页面显示不证明客户端 bootstrap。
- **“第一次看到几行日志/请求”替代“长期更新、异常和失败可定位”。** 当前 seq/cursor/merge 缺陷均能绕过一次性检查。
- **“插件文件已复制”替代“当前实例完整运行依赖已交付”。** [部署脚本](<../../../scripts/deploy-local.mjs#L329-L347>)不交付引擎 runtime，[运行时门槛](<../../../dsh-nano-local-sandbox/src/host/kitesurf-runtime.js#L55-L89>)却要求它；两者之间没有产品闭环。
- **“mock/辅助函数通过”替代“公开接口实际可用”。** `/evaluate` 自 `4b3ab2e` 的实现仍读测试依赖，不读 body；旧验证已出现其400，仍未阻止“调试可用”的总结。

旧记录明确只验证 dev。遵守“不擅自重启 desktop”是正确边界，但**未验证 desktop 应明确标未交付，不能把该边界当完整交付的免责理由**。同样，“上游 pin 原样”只约束源码来源，不允许漏交运行依赖。

---

## 2. 当前测试工具、矩阵、深度/广度/粒度评价

### 2.1 工具清单与边界

| 工具/层 | 当前覆盖 | 本轮结果 | 深度与盲区 |
|---|---|---|---|
| [DNK] `node --test test/*.mjs` | 12文件：URL/几何/备注/快照辅助函数、旧engine helper、技能生成、导航、i18n、UI源码扫描等 | **74/74** | 有价值但大部分不执行 React 状态与实际宿主激活；旧CDP导出已断路而辅助测试仍可全绿 |
| [DNLS] 同套件 | 47文件：路由、生命周期、mock backend/CDP、adapter、profile、pack、扫描规则 | **210/212** | 单函数/夹具强，跨路由→真实CDP→UI增量弱；两个失败保留，不能写212/212 |
| [既有 GUI smoke](<../../../scripts/gui-smoke-kitesurf.sh#L62-L145>) | 挂载、mode、诊断五面、11自检、example DOM、心跳属性、Network列、tab hover | **9/9 PASS** | 可证明外壳和一次性成功路径；**同一构建仍有本报告P0/P1**，说明它不是可用性证明 |
| [页面阶梯](<../../../scripts/eval-page-ladder.mjs#L10-L56>) | example / IANA / RFC / React / Archy | 本轮UI重新测，另加目标站 | 未将关键词限制为可见内容；截图任意base64>0就过；consoleErrors记录但不影响ok；缺document记录也放行 |
| [repin集成脚本](<../../../scripts/eval-kitesurf-repin.mjs#L41-L70>) | history、viewport、恢复、五站 | SOURCE/HISTORY，不重复全脚本 | 直接HTTP调用多，不能证明 pane 的旧DOM刷新与同页MCP |
| [两份 e2e 脚本](<../../../dsh-nano-kitesurf/scripts/e2e-ego.mjs#L256-L280>) | 大量UI/API操作 | 未原样执行，审查其断言 | DNK fork 仍 [要求 workerd-kv](<../../../dsh-nano-kitesurf/scripts/e2e-ego.mjs#L390-L392>)，实际plugin-store；Console仅rows>0；完整脚本不能以旧“通过”背书当前构建 |
| route/feature/security ledger检查 | 路由清单、方法/敏感度等静态一致性 | 发现全仓其他包 `/nano-explorer-extra/diff` 未进feature-contract | 本轮检查有效；是账本缺项，不归因为DNK新增运行故障，也不能忽略红项 |
| pack-manifest/源码扫描 | 文件集合、bare import、CLI归属、断言数量等 | 随离线套件执行 | 能防缺文件/边界污染，不证明runtime供给、恢复或浏览体验；断言数不是语义覆盖率 |
| 本轮 dev 可控网页 | SPA延迟、404入口、12s模块、POST echo、cookie、locale/DPR | 多项 FAIL，见 §3 | 明确排除了外站网络解释；未做资源耗尽/安全攻防 |
| 本轮 HTTP/WS wire | 30条REST绑定族枚举、MCP握手、目录、读工具、边界 | 多项 FAIL | 没把两套同名工具视为同一实现；分别留证 |

完整离线结果：[DNK TAP](<1119-evidence/dsh-nano-kitesurf-tests.tap>)、[DNLS TAP](<1119-evidence/dsh-nano-local-sandbox-tests.tap>)、[摘要](<1119-evidence/offline-summary.json>)。

DNLS 两个失败的归属：

1. [route-scan-coverage](<../../../dsh-nano-local-sandbox/test/route-scan-coverage.test.mjs#L14-L28>)：全仓 feature contract 未列 DNEE `/diff`。是交叉仓基线失败，不是容器/导航故障。
2. [threat.spike](<../../../dsh-nano-local-sandbox/test/threat.spike.test.mjs#L170-L190>)：旧 `term.session.create` 测试桩返回形状缺 `attach` 字段，读取 `structuredContent.attach.url` 时因 `attach` 为undefined而抛错；单独重跑也失败。是夹具与生产契约漂移，不应直接删掉断言冒绿。

### 2.2 本轮证明了原成功判据的假阳性

[离线反例](<1119-evidence/offline-reproductions.json>)：空 `#root`、关键词只在 title、日志明确 `app.js failed`、截图仅 `AAAA`（3字节），原 `runLadder` 仍 `ok:true`。

因此不能只补更多URL：需要先修**判定的特异性**。也不能简单改成 `HTML>4KB`、`text>40` 或“截图>1KB即成功”；这些会把合法图片/canvas/极简页面误判，并依旧可能放过有背景的大空图。应对每个可控样例指定可见标记、交互结果、截图解码与接口一致性。

### 2.3 六个维度的总结评价

- **广度：中等偏碎。** 路由名字多，真实正负例少；MCP两传输、部署bootstrap、重启持久性、SPA路由与同页写读覆盖不足。
- **深度：不足。** 同一请求从pending到failed、同一日志从产生到可见、same-page identity、异步渲染到pane更新都缺跨层断言。
- **粒度：两头多、中间少。** 大量纯函数/mock/文本扫描，少量人工GUI；缺真实handler+真实owner和UI状态机层。
- **真实性：环境预热偏差明显。** dev预先有镜像/runtime/服务；未从“当前home缺前置”验证完整交付。
- **失败敏感性：低。** consoleErrors不影响页面实验、空root可通过、只验证初始表格，不验证持续变化。
- **可追溯性：不足。** 历史报告缺精确source/deployed/toolchain/fixture/恢复状态的统一关联；本轮记录67文件比对、9输出hash和每项返回。

**总评：测试套件适合局部回归，不足以支持“浏览器和调试工作台已交付”的结论。** 不以覆盖百分比作无依据量化；本轮未采集行覆盖率。

---

## 3. 本轮 dsh-dev 全面验证结果

### 3.1 基础能力与生命周期

| 编号 | 验证 | 结果与范围 |
|---|---|---|
| V01 | 初始 stopped → `/recover` | PASS：4.378s，action=started；镜像/runtime存在；不是缺产物首次安装验证 |
| V02 | UI准备、引擎CDP、桥健康 | PASS：真实界面OK；不能据此代表页面应用可用 |
| V03 | 未鉴权 GET/POST status | PASS：401；未进行漏洞利用或其他身份探测 |
| V04 | method与输入基础校验 | GET open=405、file URL=400、viewport.width=1→400、未知network id=404 |
| V05 | 跨文档后退/前进 | PASS：example↔IANA真实URL变化；到达校验有正向价值 |
| V06 | suspend/resume、dev容器stop/start | PASS：状态stopped/running正确；host重新取得CDP；页面回收正常 |
| V07 | dev宿主重启 | 基础服务恢复PASS；观测到历史10地址→0、locale字段消失。**没有持久性保证**，但进程级设置本可设计为临时，是否要求持久化须统一现有承诺，见G22；曾短时未监听，后新PID84197正常 |
| V08 | core storage/interact/edit | PASS：localStorage set/read/delete；真实引擎click/edit可改变DOM |
| V09 | 截图、样式、自检 | PASS：example真实PNG已查看；body匹配3规则、80 computed；11自检全过（仅该页） |

证据：[初始API](<1119-evidence/dev-initial-api.json>)、[生命周期](<1119-evidence/dev-history-lifecycle.json>)、[鉴权负例](<1119-evidence/dev-unauthenticated.json>)、[宿主重启前](<1119-evidence/dev-pre-host-restart.json>) / [后](<1119-evidence/dev-post-host-restart.json>)、[最终API](<1119-evidence/dev-final-api.json>)。

### 3.2 六个真实网站：必须区分“可见”与“可调试”

均通过 pane 地址栏输入，等待本次心跳结束后读取UI、live DOM、诊断并截图。测前模拟曾设dark（已记录），不是干净浏览器基准；页面耗时包含额外采样和截图，**不是单纯导航时间**。

| 网站 | 本轮总耗时 | 可见结果 | 判定 |
|---|---:|---|---|
| example.com | 4.767s | 可见正文 | 呈现PASS，不代表JS交互 |
| IANA | 7.333s | 可见正文 | 呈现PASS |
| RFC2616 | 2.862s | 约513KB DOM和innerText存在，但截图视口大面积白色、只有链接可见 | **呈现FAIL/需复核样式**：不能因DOM有正文就报可见成功；当时dark模拟开启，未再以干净light复测 |
| react.dev | 21.529s | 首页可见 | 呈现PASS；没有完成交互应用验收，SSR内容不能当bootstrap证明 |
| archy.studio | 24.566s | 首页可见 | 呈现PASS；动态菜单/动画一致性未闭合 |
| axtraproperty.com.au | 50.263s | `/open`导航超时；live DOM仅2459B预览 / 诊断报告2491B；页面没有目标站可见内容 | **FAIL**：目标站依旧打不开；地址显示Axtra、pane仍显示Archy旧内容；诊断ready=true |

目标站console记录入口 `index-Rpf-tHCJ.js` module prefetch aborted；该次诊断network尾部还保留 `jsx-runtime-DUAcabCT.js` 四次约10秒abort、`index-Rpf-tHCJ.js` 两次约10秒abort，随后一次jsx-runtime成功200。不能把尾部采样当整次导航的完整重试计数。本轮没有证据把原因完全归结为宿主网络、站点不兼容或唯一一个上游bug；**可确定的是当前交付失败且诊断误导**。

证据：[真实网站JSON](<1119-evidence/dev-real-sites.json>)、[Axtra超时截图](<1119-evidence/site-axtra.png>)、[超时后诊断与恢复](<1119-evidence/dev-timeout-recovery.json>)。

### 3.3 可控样例：排除外站网络因素

| 编号 | 测试 | 本轮实测 |
|---|---|---|
| V10 | static页面 | `BASIC_READY_1119`可见；PASS |
| V11 | SPA 2.5秒后写入root | 后续live `/dom`含`SPA_READY_1119`，pane仍仅显示先前API结果，没有该标记；**FAIL：DOM预览冻结** |
| V12 | 入口模块404 | 约0.4秒后HTML预览空白，未给出可操作的页面失败提示；**FAIL：空壳被接受** |
| V13 | 模块头等待12秒 | 上游每次约10秒abort、共3次；host ring是真failed，但Network UI仍`…/0b/0ms`；**FAIL：增量丢状态+null当0** |
| V14 | 加载期间打开设置 | 环境`null`时红色异常、插件未知、全`—`，与用户截图一致；**FAIL：未观测冒充故障** |
| V15 | Console持续到达 | REST有54条测试标记，打开着的pane新增标记0；未捕获异常在最小反例里也没录入；**FAIL** |
| V16 | preview按钮 vs `/interact` | preview点击按钮不变，真实引擎click变`CLICKED_1119`，pane仍旧文本；**FAIL：预览不是活页且未同步** |
| V17 | POST Payload/Response | 单条详情可读请求体与真实echo响应；**PASS局部**，不抵消列表状态更新失败 |
| V18 | snapshot/ref/pick | `/snapshot`只文本+空refs，`/pick`基本selector可命中，但没有承诺的@N；**FAIL完整ref调试链** |

证据：[夹具页面](<1119-evidence/dev-fixture-pages.json>)、[慢加载](<1119-evidence/dev-slow-heartbeat.json>)、[调试和交互](<1119-evidence/dev-debugger-interaction.json>)、[离线缺陷](<1119-evidence/offline-reproductions.json>)。

### 3.4 模拟设置：保存回显不等于生效

| 验证 | 结果 |
|---|---|
| UA与extra header HTTP echo | PASS：`DeliveryReview/1119`、`X-Delivery-Review:1119`真实到达 |
| 固定viewport优先于pane fit | PASS：390×844保持；恢复null有效 |
| locale页面首次脚本 | **FAIL**：首次`en-US`，1.8秒后才`fr-FR`；override在导航完成后补入，无法当“默认语言” |
| Accept-Language | **未随locale改变**：HTTP echo仍`en-US,en;q=0.9`；应明确navigator/Intl/HTTP各层语义 |
| DPR/mobile | 设置回显`deviceScaleFactor:2,mobile:true`，页面DPR=1、截图390×844；**FAIL声称超出实际能力** |
| cookie写入 | PASS：HTTP echo与document.cookie可读 |
| `cookies:null`清除 | **FAIL**：设置回显空，但cookie jar仍`delivery_review=one` |
| GPS清除/rollback | SOURCE：null表达式直接return，不卸载已定义shim；本轮未取coords值，不把投影null当实际还原 |
| dark/light | 参数/页面style可见；媒体查询复杂语义、事件监听、初始脚本完整行为未全测，**不判全支持** |

证据：[仿真与cookie](<1119-evidence/dev-emulation.json>)、[仿真时序](<1119-evidence/dev-emulation-timing.json>)、[DPR截图390×844](<1119-evidence/emulation-dsf.png>)。

### 3.5 REST与两套MCP

- HTTP `/mcp`：`initialize/ping/notifications/initialized/unknown`均200 `{ok:true,tools:20}`，不是各自合法的MCP/JSON-RPC响应。
- HTTP `tools/list`：含20 sandbox +终端工具；description多为工具名本身，类型仅浅校验。
- HTTP `sandbox.diagnostics=null`、`sandbox.console=[]`、`sandbox.dom={url:engineBase}`、`sandbox.targets=[{url:engineBase}]`、`elements=null`；与同时刻REST真数据不同。
- 容器 WS `/mcp`：initialize可用、目录48工具（33 agent-browser +15 sandbox）。但sandbox诊断/DOM/console等均`kitesurf.diag.stale`。
- WS agent-browser `get_url`→`about:blank`，pane是测试页；返回effectiveLaunch=chrome和CDP applied=false。**同页协作已FAIL；真实引擎身份/attach失败细因待验证，不宣称实际Chrome进程已证实。**
- 未继续执行WS写类、双writer争用或agent导航；避免在身份未证实的引擎上继续。HTTP takeover/release本身可读写，但不能据此判人机共享页成立。

证据：[REST+HTTP MCP 39条](<1119-evidence/dev-rest-mcp.json>)、[WS MCP目录/工具](<1119-evidence/dev-ws-mcp.json>)、[WS页面身份](<1119-evidence/dev-ws-same-page.json>)。

### 3.6 REST边界复核

[边界结果](<1119-evidence/dev-rest-boundaries.json>)：

- 合法`/evaluate {expression:'1+1'}`→400 toolong：FAIL。
- `/settings` GET405；POST有校验。**POST-only本身不是错误**，405来自绑定表/guard，实现中保留的GET/HEAD分支是死代码；当前DNK并不GET该接口。另一个独立问题是status缺kite.httpBase/mcpPort，导致设置读到空值，仅显示8787/8799占位，见[设置原样保存](<1119-evidence/dev-settings-ui-save.json>)。
- `/kite configure`当前8800/8801也409：UI/技能宣称不可执行。
- malformed JSON `{broken`→`/settings`200空patch：FAIL，应按已有body.json语义拒绝。
- 5000字符cookies body被接受，超过绑定4096上限：FAIL，bodyLimit登记未在真实链强制。本轮只测5KB，不做大流量探测。
- `/wait {selector:missing,timeout:2000}`→23ms即504；它没等待该预算：FAIL语义。
- `/state load {name:不存在}`→200 restored.ok=true：没有命名快照恢复。
- `/console?level=error,exception`不按逗号集合过滤；`operations?errorsOnly=true`仍返回轮询，且无status/errorId/duration，不能定位失败。
- HEAD status200空body、未鉴权401、GET open405为正向结果。

### 3.7 路由级覆盖与未执行边界

[30条路由族覆盖表](<1119-evidence/route-coverage.json>)逐项区分LIVE、SOURCE、BLOCKED和NOT RUN；“全面验证”指按该范围逐域审查并记录结果，**不是30条路由所有方法、全部入参组合、所有MCP工具均已动态通过**。

以下未执行/受阻，不算通过：

- 不重启macOS、不操作desktop、不新装一个全空home；因此**新安装交付和开机恢复仍未动态收口**。
- 没有重跑官方Bazel完整构建/上游suite，没执行引擎升级；本轮核对当前pin输出hash。
- 原样完整e2e脚本有过时断言和可能改动其他状态，改为分项真实验证；既有smoke原样运行9/9。
- 英文/浅色全部布局、键盘/辅助功能、多pane并发、长时内存/连接泄漏、跨网络代理/TLS/CSP全部组合未穷尽。
- 不做攻击、容器逃逸、资源耗尽、真实多用户越权验证；不能得出安全合规结论。

---

## 4. 代码审查：根因、缺口与盲点

### 4.1 导航、健康与心跳

1. **环境未加载即红**：[EnvPanel初值与catch](<../../../dsh-nano-kitesurf/src/client/index.js#L1882-L1904>)、[二态显示](<../../../dsh-nano-kitesurf/src/client/index.js#L1974-L1992>)。没有unknown/loading/stale与last-good freshness。
2. **导航只避开一段probe**：[probeCdp](<../../../dsh-nano-local-sandbox/src/host/routes.js#L313-L324>)遇navigating返回alive，但[后续页面/DOM仍发命令](<../../../dsh-nano-local-sandbox/src/host/routes.js#L345-L375>)；探测阻塞与导航争同一引擎。
3. **根存在不等于应用成功**：[probeDom](<../../../dsh-nano-local-sandbox/src/host/routes.js#L419-L433>)只看root/url，[ready投影](<../../../dsh-nano-local-sandbox/src/host/observe.js#L30-L75>)将此计入整体正常。应保留一份观测事实、分开展示，不另造互相矛盾的canonical状态。
4. **“心跳”只有本地计时**：[beat timer](<../../../dsh-nano-kitesurf/src/client/index.js#L1099-L1106>)、[run finally](<../../../dsh-nano-kitesurf/src/client/index.js#L1259-L1279>)。无法表示backend进展/无新事件/超时后任务仍在跑。
5. **导航成功判据不足**：[navigateOnce](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L146-L156>)只验errorText，[captureNavigation](<../../../dsh-nano-kitesurf/src/shared/navigation.js#L11-L17>)只验非blank URL和data。模块失败可留下非blank空壳而200。
6. **预算是串行链，不是单条CDP**：[timeouts](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L159-L163>)、[shot链](<../../../dsh-nano-local-sandbox/src/host/routes.js#L966-L981>)含多个20s call+30s截图，[HTTP统一60s](<../../../dsh-nano-kitesurf/src/shared/navigation.js#L3-L5>)不能保证覆盖整个链；`loadDom`无显式截止。
7. **时限≠取消完成**：[CDP超时保留导航标记](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L395-L455>)正确避免杀socket，但queue在调用超时后可放下一个意图、未关联迟到完成；需要operation generation和明确排队/替换策略，不可偷偷自动重放。
8. **container inspect失败被当missing**：[observe](<../../../dsh-nano-local-sandbox/src/host/routes.js#L348-L359>)与[prepare](<../../../dsh-nano-local-sandbox/src/host/routes.js#L539-L555>)丢失daemon不可达/权限/解析等原因。前序“容器missing”的误诊即此类风险。

### 4.2 页面呈现与身份

- 默认HTML预览：[nativeHtml默认true](<../../../dsh-nano-kitesurf/src/client/index.js#L903-L904>)；[脚本剥离](<../../../dsh-nano-local-sandbox/src/host/dom-srcdoc.js#L16-L20>)和[iframe不允脚本](<../../../dsh-nano-kitesurf/src/client/index.js#L2551-L2558>)是既有安全意图，应保留，不能开启脚本来假修。
- [loadDom首次锁定](<../../../dsh-nano-kitesurf/src/client/index.js#L1118-L1120>)、[reloadShot只更新截图](<../../../dsh-nano-kitesurf/src/client/index.js#L1366-L1392>)使异步DOM/编辑结果不再投影。
- [错误处理](<../../../dsh-nano-kitesurf/src/client/index.js#L1283-L1315>)保留旧画面但无stale/source标识，地址与画面不对应；不是保存last-good本身错，而是把旧内容呈现成当前页面。
- [shot响应](<../../../dsh-nano-local-sandbox/src/host/routes.js#L974-L998>)只查data非空，未传播截图返回的error；可将占位图当成功。应按实际pin错误合同验证，不用文件大小硬判。
- [withPage](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L4-L16>)未缓存attached sessionId；当前pin TargetInfo不回sessionId时反复attach，需同socket target/session生命周期审查与计数验证，不在本轮夸称已证实内存泄漏。

### 4.3 调试数据与错误结果

- Console源无seq：[采集](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L359-L369>)；[前端去重key](<../../../dsh-nano-kitesurf/src/client/index.js#L544-L560>)全`cundefined`。未录Runtime.exceptionThrown/Log.entryAdded。
- Network源按开始时间过滤：[route since](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1480-L1488>)；前端`extra.length===0`直接不merge。同ID后续失败丢失，ring/API与pane矛盾。
- null size/time：[formatSize/Duration](<../../../dsh-nano-kitesurf/src/client/index.js#L456-L469>) `Number(null)=0`，伪造`0b/0ms`而非未知。
- [operations](<../../../dsh-nano-local-sandbox/src/host/routes.js#L945-L948>)只path/method/at；[读取](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1344-L1347>)不做errorsOnly/since，不能作真实trace。
- [evaluate](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1280-L1285>)读deps而非body，是测试seam接进生产的死实现。
- [snapshot](<../../../dsh-nano-local-sandbox/src/host/routes.js#L690-L692>)固定refs={}，[refs路由](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1255-L1267>)因此不能兑现@N；[elements flatten](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L61-L79>)丢id/class/children元数据，与UI搜索/统计/精准点选需求不符。

---

## 5. 协议层、MCP丰富度与真源审查

### 5.1 当前真源分布不是单份业务状态

| 域 | 应当权威的位置 | 现状 |
|---|---|---|
| 容器配方 | [profile](<../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L7-L33>) | 明确pin/image/resources；正向 |
| pane页面/CDP | [DNLS session.cdp](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L350-L358>) | 是真实pane连接；idle超时不杀socket为正确适配 |
| host HTTP MCP | [buildOwners](<../../../dsh-nano-local-sandbox/src/host/routes.js#L802-L874>) | 多个owner是假数据/空实现，不与REST同域同答 |
| WS sandbox诊断 | [DNK推送](<../../../dsh-nano-kitesurf/index.js#L609-L627>)→桥缓存 | DNK保留已退役CDP状态；默认桥8799不等dev8801；数据源与目标皆偏离 |
| bridge agent页面 | [每连接agent-browser进程](<../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L462-L475>) | 单独CDP连接；当前官方pin每WS独立BrowserState，新页about:blank，不是pane页 |
| history | [DNLS session.history](<../../../dsh-nano-local-sandbox/src/host/browser-history-adapter.js#L14-L45>) | 内存真源，重启消失；[路由source标签](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1088-L1099>)却固定`plugin-store`，旧e2e又期待`workerd-kv`，标签/存储承诺须校准；DNK旧文件存储/bridge durable文案仍残留 |
| 仿真 | DNLS session字段+引擎实际状态 | 回显已提交不等于当前/初始脚本已应用；cookie/shim有残留 |

**整改原则：不能再用新缓存/新面板补洞。先指定每个域唯一owner，同域所有消费面只投影该owner的状态。** history持久化位置/按session还是env共享、MCP同页代理方式是公共语义，需 [业主] 在后续工作中确认并留一份决定，不由审查直接改约。

### 5.2 HTTP MCP：目录丰富不等于协议可用

[HTTP分派](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1179-L1210>)没有标准初始化生命周期，未识别方法假200；[参数校验](<../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L134-L145>)只required/no-extra，不校验类型和界限；description=name。

[工具真owner](<../../../dsh-nano-local-sandbox/src/host/routes.js#L862-L873>)与[定义表](<../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L69-L119>)存在：

- diagnostics读无人写的字段；console对数组调用不存在的tail后回空；
- dom返回引擎base，targets合成base条目，elements null；
- recovery_plan恒[]，无法给真实恢复计划；
- lifecycle带sessionId但多数操作仍env容器；ensure走adopt，不创建隔离页/容器。

这不是工具数量不足，而是**握手、语义、owner、schema、错误结果、可发现性都没有闭合**。不要为了“丰富度”先加更多同名工具。

### 5.3 WS MCP：传输较完整，业务真源与同页前提失效

桥有frame长度/fragment/ping/close/idle和writer sticky认领等正向实现，不能把整个桥一概称空壳。但是：

- [默认AGENT_BROWSER_CDP](<../../../dsh-nano-local-sandbox/profiles/kitesurf/Dockerfile#L33-L37>)不能证明agent已附着正确页；本轮响应说明requested CDP未标applied，返回about:blank。
- 官方pin `packages/engine/src/cdp/connection.ts`每条连接拥有BrowserState、并创建about:blank；不能用第二个browser socket读pane页。修复不能仅“把8799改8801”。
- [DNK connectLive](<../../../dsh-nano-kitesurf/lib/engine.js#L202-L209>)明确throw retired owner，但宿主[旧诊断生产器](<../../../dsh-nano-kitesurf/index.js#L532-L627>)仍依赖旧字段；即便修端口，数据也不完整。
- HTTP与WS的sandbox工具表、入参、返回形状不同；技能写“人机共享同一页/统一ref”而实现未满足，见[技能承诺](<../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L29-L39>)。
- read-only工具引发底层launch/attach动作的identity要显式证明；身份不符必须fail-closed，不能悄悄换浏览器或私有空页。

### 5.4 REST 合规性、一致性评价

鉴权和方法白名单在本轮正向工作；但CRUD/命令混合接口必须有稳定且诚实的语义，不能以“REST不必纯”掩盖下列缺口：

1. [绑定表](<../../../dsh-nano-local-sandbox/lib/bindings.js>)登记的方法/bodyLimit与真实handler不完全一致。不得未经决定新增GET；先统一文档、分支与已有合同。
2. [readJson](<../../../dsh-nano-local-sandbox/src/host/routes.js#L709-L716>)吞JSON.parse错误、不执行登记上限；5KB负例已证明。
3. [status](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1004-L1014>)只kite.phase，UI读kite.httpBase/mcpPort为空，占位8787/8799不是实际配置；[configure](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1016-L1034>)未实现但UI仍发。
4. [wait](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1497-L1512>)无真正等待；[state](<../../../dsh-nano-local-sandbox/src/host/routes.js#L682-L687>)不实现命名存储/完整cookie/url恢复；不能200掩盖未执行。
5. 错误表[DNLS目录](<../../../dsh-nano-local-sandbox/src/host/error-catalog.js#L5-L33>)与[DNK旧目录](<../../../dsh-nano-kitesurf/lib/diagnostics.js#L1-L90>)并存；新抛id、旧文档、default502混杂，unknown method/invalid params被归502。错误集合变更要先决定，不在修复中私造命名空间。
6. history/shot等看似read的POST也会改变视口/滚动/导航，capability与重试说明应按副作用对账；超时后不自动重放。
7. `HAR`目前仅简化字段，未证明标准HAR1.2完整性；要么明确lite export，要么按schema补齐headers/timings/body等。

---

## 6. pin driver/adapter 完整性与升级边界

### 6.1 正向适配应保留

- 官方源码原样、派生runtime独立存放；[stage](<../../../dsh-nano-local-sandbox/scripts/stage-kitesurf-runtime.mjs#L19-L61>)比对来源树、写identity/hash receipt。
- [runtime门槛](<../../../dsh-nano-local-sandbox/src/host/kitesurf-runtime.js#L64-L99>)在删除旧容器前检查，避免缺产物先毁可运行环境。
- [reconciliation](<../../../dsh-nano-local-sandbox/src/host/kitesurf-reconciliation.js#L27-L58>)规范image名称、保留state/publications；不把missing fixture字段当漂移。
- [history adapter](<../../../dsh-nano-local-sandbox/src/host/browser-history-adapter.js#L76-L100>)补官方navigateToHistoryEntry吞errorText的到达检查，本轮后退前进通过。
- [viewport null恢复](<../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L171-L183>)不用上游空实现clearDeviceMetricsOverride；fixed优先fit。
- [entrypoint](<../../../dsh-nano-local-sandbox/profiles/kitesurf/entrypoint.sh#L10-L45>)将cache/persist写入state，保留官方pin只读、桥退出重启、workerd glibc用户空间。

### 6.2 适配缺口

| 面 | 缺口 / 验证要求 |
|---|---|
| runtime交付 | stage是独立命令，部署仅plugins；“完成部署”不覆盖artifact/image/service。当前home必须整体交付或明确返回缺前置，不能让用户手拷 |
| daemon恢复 | [backend](<../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L4-L27>)无命令级deadline，inspect error被吞；应识别服务不可达，按授权准备，不等于missing容器 |
| 默认语言 | [locale shim](<../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L14-L16>)只是navigator getter，未覆盖HTTP/Intl，且[navigate后重放](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L153-L155>)太晚；必须明确支持层，不改API值冒充全浏览器locale |
| GPS | null不卸载、watchPosition单次调用无真正watch生命周期；是有限模拟，不能假完整 |
| 色彩 | `ks_color_scheme`真支持，但matchMedia的复合/否定查询和change listener是假对象；不能匹配包含dark字符串就认完整CSS媒体语义 |
| cookie | [cookieParams](<../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L29-L37>)按session.pageUrl，缺domain/path/secure/httpOnly模型；set空不删；导航失败写pageUrl会污染scope；回滚不是jar快照恢复 |
| viewport | w/h有效，mobile/DPR需能力表和实际验证；不能接受并回显未实现字段 |
| settings事务 | [transaction](<../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L186-L220>)只看CDP Promise reject，不检查Runtime.evaluate exceptionDetails；JS catch{}使失败假成功；before命令不等于撤销shim |
| frame/事件 | 需page/session enable一致性和generation；本轮已有真Network/Console事件，故不把browser-level enable一概判成不工作 |
| upstream空实现 | setCacheDisabled、stopLoading等需能力探测/静态pin对账，UI禁用并说明，不用fake成功 |

### 6.3 官方升级候选与限制

当前pin之后官方修复 [baa7a400](https://github.com/cloudflare/kitesurf/commit/baa7a400b77053bdcb3ad6007157ccdbcbc5f73c)：资产后缀模块不再无条件stub，修复Vite类应用不bootstrap（#155）。可评估包含它的官方提交 `b9b904e208836b946c6ffc81832ac1ec576ece54`，但**本轮未构建/切换，不能称升级已验证，也不能断言Axtra一定由此修复**。

当前runtime的模块抓取10秒/3次重试为真实上游限制；[DNLS]45秒等待不是同一个预算。单纯把前端60秒改为180秒不会让失败模块重新成功。真正升级必须：

1. 固定官方候选SHA、归档来源、锁依赖；不添加本地pin补丁。
2. 在派生目录构建，复核driver/adapter行为与上游空实现变化。
3. 用本轮可控SPA、12s模块、资产模块与真实目标站重复对比，记录差异，不只跑旧五站。
4. 将同一完整产物交付到目标home；不把dev存在推断成desktop存在。
5. 保留旧可运行产物与state，失败能回退；公开协议/状态值新增先经 [业主] 决定。

**心跳能力边界：** 当前pin的Network.dataReceived在请求完成时汇总一次，不是逐chunk进度；Page.stopLoading为空实现。不得显示伪造百分比、速度、剩余时间，或把放弃等待叫作停止引擎导航。确切上游证据应随选定pin重新复核。

---

## 7. 统一 gaps 与具体工作 / 测试收口台账

以下每项状态均为 **OPEN（本轮不实施）**。每项包含可定位入口、目标、判定和证据；不以一次“全绿”替代条目闭合。`D`为需确认的公共语义决定，不另立重复真源。建议责任按owner划分：[DNLS]负责运行时/协议/唯一状态，[DNK]负责显示/交互，测试责任随owner而非全推给UI。

| ID / 优先级 | file:line 工作锚点 | 具体工作目标 | 测试收口台账（必须观察的结果） |
|---|---|---|---|
| G01 P0 | [bridge attach:473](<../../../dsh-nano-local-sandbox/profiles/kitesurf/mcp-bridge.mjs#L462-L475>)；[skill:29](<../../../dsh-nano-kitesurf/skills/kitesurf-cdp/SKILL.md#L29-L39>) | **D：同页所有权**。统一pane与agent所操作target，或明确不同页语义；身份不符fail-closed，不能靠第二socket访问同页 | T01：pane设随机DOM标记，agent读同标记；agent edit后pane看到同target/generation；断开agent不丢pane；核实真实产品identity，禁止fallback Chrome。当前FAIL |
| G02 P0 | [evaluate:1280](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1280-L1285>)；[keeper:32](<../../../dsh-nano-local-sandbox/src/host/cdp-keeper.js#L32-L40>) | body表达式进入唯一CDP owner；删除测试seam生产路径，保留已约定长度/错误语义 | T02：真实handler+dev `body.expression:'1+1'`得2，deps测试值不能替代body；合法await/语法错/空/超长按现合同分类，不对合法输入造假toolong，不返回上一页。当前FAIL |
| G03 P0 | [snapshot:690](<../../../dsh-nano-local-sandbox/src/host/routes.js#L690-L692>)；[pick/edit:1308](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1308-L1325>) | 实现已承诺@N语义和统一picker/a11y refs，或由 [业主] 明确缩约；page换代失效 | T03：snapshot→@N→pick/edit/interact指同节点；导航后旧ref拒绝；pane选中与agent反查一致。当前FAIL |
| G04 P0 | [HTML默认值:903](<../../../dsh-nano-kitesurf/src/client/index.js#L903-L904>)；[首次加载guard:1118](<../../../dsh-nano-kitesurf/src/client/index.js#L1118-L1128>)；[loadDom:1366](<../../../dsh-nano-kitesurf/src/client/index.js#L1366-L1392>) | DOM预览标为静态快照，跟随新generation/异步变化更新；交互代理到真实引擎，不开宿主脚本 | T04：延迟2.5秒root更新、click/edit、SPA路由后pane/live一致；脚本剥离仍有效。当前FAIL |
| G05 P0 | [navigate:146](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L146-L160>)；[capture:11](<../../../dsh-nano-kitesurf/src/shared/navigation.js#L11-L17>) | 区分导航回复、load阶段、页面错误、可见结果；错误保留现场；不以字节阈值硬判全部站点 | T05：404入口/12s模块/异步SPA/图片或canvas不同预期；目标Axtra必须有真实内容+最小交互，未达不宣告修复。当前FAIL |
| G06 P0 | [EnvPanel:1882](<../../../dsh-nano-kitesurf/src/client/index.js#L1882-L1904>)；[显示:1986](<../../../dsh-nano-kitesurf/src/client/index.js#L1983-L1992>)；[observe:30](<../../../dsh-nano-local-sandbox/src/host/observe.js#L30-L75>) | 未观测/加载/过期/故障分开；环境可用与页面应用状态分层，一份观测owner；loading不红、空壳不冒充成功 | T06：加载中打开设置无“异常+全—”；入口失败环境仍活但页面明确失败；错误/旧结果不互相覆盖。当前FAIL |
| G07 P0 | [console录入:359](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L359-L377>)；[merge:544](<../../../dsh-nano-kitesurf/src/client/index.js#L544-L570>) | 后端产稳定seq供前端去重，收uncaught/Log/导航source，level/since一致；运行期新日志持续可见 | T07：打开Console后依次log/warn/error/throw，各恰一次、可过滤、带来源；不依赖重开tab。当前FAIL |
| G08 P0 | [network since:1486](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1480-L1488>)；[merge:548](<../../../dsh-nano-kitesurf/src/client/index.js#L544-L552>) | 游标表达“更新”而非只“新开始”，同id能更新；未知size/time不转0 | T08：同请求pending→headers→finished/failed、只有更新无新行、同ms多事件、ring截断均正确；12s模块UI显示ERR。当前FAIL |
| G09 P1 | [beat:1099](<../../../dsh-nano-kitesurf/src/client/index.js#L1099-L1106>)；[events:395](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L395-L440>) | 地址栏分开本地elapsed、已知阶段、last-event age、completed/failed计数；无证据就显示等待，不伪进度 | T09：慢headers/无事件/下载失败/渲染迟到均可辨；timeout结束等待但不谎称停止；agent发起导航pane也可见。当前仅timer部分PASS |
| G10 P1 | [error:1283](<../../../dsh-nano-kitesurf/src/client/index.js#L1283-L1315>)；[frame更新:1366](<../../../dsh-nano-kitesurf/src/client/index.js#L1366-L1392>)；[DOM写入:2080](<../../../dsh-nano-kitesurf/src/client/index.js#L2080-L2088>) | last-good带source URL/时间/generation/stale；迟到帧不能覆盖新意图 | T10：Archy→Axtra失败时保留Archy但明确旧画面；A慢/B快竞态不串页；当前FAIL |
| G11 P0 | [MCP dispatch:1179](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1179-L1210>)；[schema:134](<../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L134-L145>) | 修既有HTTP MCP握手/notification/unknown/type错误；决定是否完整标准传输而非假RPC | T11：真实MCP客户端initialize→initialized→list→call，id/error/result正确；wrong type拒绝，notification无假result。当前FAIL |
| G12 P0 | [owners:862](<../../../dsh-nano-local-sandbox/src/host/routes.js#L862-L873>)；[tools:69](<../../../dsh-nano-local-sandbox/src/host/mcp-sandbox.js#L69-L119>)；[control:1163](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1163-L1175>) | REST/HTTP MCP同域同答，删除placeholder成功，diagnostics从唯一生产器实时供给而不是读无写者字段；工具描述可操作、输入输出真实 | T12：dom/targets/console/elements/diagnostics/control与REST同页同结果；不可用则明确错误；同页解决后双writer与humanHold分别验争用/释放/断线；当前数据FAIL、双writer NOT RUN |
| G13 P0 | [DNK push:609](<../../../dsh-nano-kitesurf/index.js#L609-L627>)；[retiredCDP:207](<../../../dsh-nano-kitesurf/lib/engine.js#L202-L209>) | 诊断生产移回真实DNLS owner，端口只从实际published来源；清理死状态，不只改默认端口 | T13：dev在实际published桥端口拿到新鲜快照；origin/instance/generation标识一致，无diag.stale；之后desktop独立验收其实际端口（通常8803，本轮NOT RUN）。当前dev FAIL |
| G14 P1 | [body:709](<../../../dsh-nano-local-sandbox/src/host/routes.js#L709-L716>)；[bindings](<../../../dsh-nano-local-sandbox/lib/bindings.js>) | 强制已有bodyLimit及对象JSON，方法/参数/错误表统一；不私加error枚举 | T14：坏JSON400；按绑定逐路由测试0/4096/8192/65536边界（settings5KB应413，不误伤edit/state较大合法body），拒绝无副作用；HEAD/GET/POST正确；本轮基础methods PASS、JSON/size FAIL |
| G15 P1 | [config:1016](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1016-L1034>)；[UI:2328](<../../../dsh-nano-kitesurf/src/client/index.js#L2328-L2345>) | **D：configure由谁负责**；实现既有设置能力或移除不可执行控件；真值/占位分开 | T15：保存明确配置真实生效并可读取，失败不先显示saved；原样无改保存不损状态；当前configure FAIL |
| G16 P1 | [operations:947](<../../../dsh-nano-local-sandbox/src/host/routes.js#L945-L948>)；[catalog:5](<../../../dsh-nano-local-sandbox/src/host/error-catalog.js#L5-L33>) | 记录status/errorId/duration/安全输入摘要和关联；errorsOnly真过滤；目录/throw/skills对账 | T16：制造400/404/502后trace定位相同操作，无cookie/body敏感泄漏；已登记errorId的HTTP/MCP分类一致，未登记id显式列缺口而非把默认502当正确；新增枚举先决定。当前FAIL |
| G17 P1 | [locale:14](<../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L14-L26>)；[replay:153](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L153-L155>) | 初始脚本前生效或明确标为有限override；navigator/Intl/HTTP分层；GPS/media能力真实 | T17：页面第一条脚本与后续读取语言一致、HTTP语言按支持约定；null卸载geo；复杂matchMedia不伪实现。当前FAIL |
| G18 P1 | [cookies:29](<../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L29-L37>)；[command:182](<../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L171-L198>) | cookie clear/replace作用域与rollback真实；空scope拒绝或延迟绑定，跨origin不散播敏感值。**D：是否扩充domain/path/secure/HttpOnly输入须另经决定** | T18：既有name=value写→删→reload不残留；其他cookie属性仅按已决定支持范围测试，不擅自新增；失败事务恢复jar；当前清除FAIL |
| G19 P1 | [viewport:59](<../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L59-L65>)；[projection:140](<../../../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js#L140-L159>) | mobile/DPR能力明确，不用session回显证明应用；**D：既有字段的拒绝/缩约须确认，不静默删除公共字段** | T19：按决定实现或明确报告不支持；DPR2读值与像素尺寸、mobile媒体/触摸特征分别验证；fixed/null继续通过。当前DPR FAIL |
| G20 P1 | [runtime:55](<../../../dsh-nano-local-sandbox/src/host/kitesurf-runtime.js#L55-L99>)；[deploy:329](<../../../scripts/deploy-local.mjs#L329-L347>) | 完整home交付：代码/runtime/image/service四者纳入同一次结果；失败保留旧工作环境 | T20：空home、缺artifact、坏ref/输出、缺镜像、服务停、已运行升级分别验证；目标desktop需之后独立验收。当前dev暖环境PASS，冷交付NOT RUN |
| G21 P1 | [backend:4](<../../../dsh-nano-local-sandbox/src/host/backend-apple.js#L4-L27>)；[prepare:539](<../../../dsh-nano-local-sandbox/src/host/routes.js#L539-L555>) | daemon unavailable/inspect failed/missing分开，命令有界，恢复不误删；并发recover串行 | T21：backend夹具注入三类错误；真实dev服务恢复实验需可回退；不可把未知当不存在。当前SOURCE缺口 |
| G22 P1 | [history:14](<../../../dsh-nano-local-sandbox/src/host/browser-history-adapter.js#L14-L45>)；[restore:728](<../../../dsh-nano-local-sandbox/src/host/routes.js#L728-L740>) | **D：history/settings持久语义**；只留一份durable writable真源，last-page是receipt还是恢复状态要明确 | T22：宿主重启仍按约定保留历史/设置，REST与MCP一致；UI标签页与访问历史语义清楚。当前history丢失LIVE |
| G23 P1 | [wait:1497](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1497-L1512>)；[state表达式:682](<../../../dsh-nano-local-sandbox/src/host/routes.js#L682-L691>)；[state handler:1241](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1241-L1246>) | 真正bounded等待；命名/inline state按合同实现或拒绝不支持项，禁止no-op200 | T23：延迟出现元素成功、超时符合预算；load不存在快照明确失败；cookie/url恢复按约定。当前FAIL |
| G24 P1 | [registry:27](<../../../dsh-nano-local-sandbox/src/host/instance-registry.js#L27-L79>)；[adopt:823](<../../../dsh-nano-local-sandbox/src/host/routes.js#L823-L858>) | **D：env共享与session隔离**统一；lifecycle sessionId不得忽略；sweep/attached正确生命周期 | T24：按该D产出的唯一约定，验证两个虚拟session的scope/端口/停启；无跨session误操作；不把同用户能力直接称漏洞。当前SOURCE语义缺口 |
| G25 P1 | [pin profile:9](<../../../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml#L7-L16>)；[stage:19](<../../../dsh-nano-local-sandbox/scripts/stage-kitesurf-runtime.mjs#L19-L61>) | 官方候选repin，对Vite资产模块/大树/截图错误做针对性兼容；不改pin本体 | T25：旧/新同夹具对照、Axtra可见+交互、adapter全回归、产物一致与回退；当前NOT RUN |
| G26 P1 | [ladder:40](<../../../scripts/eval-page-ladder.mjs#L40-L56>)；[smoke:101](<../../../scripts/gui-smoke-kitesurf.sh#L101-L128>) | 验收不接受空root/标题marker/假图；实时状态/异常/真实交互纳入，不只是UI存在 | T26：本轮空壳反例必须FAIL；健康网页PASS；无进度证据不伪造；9/9不得当总verdict。当前FAIL |
| G27 P2 | [DNK e2e:390](<../../../dsh-nano-kitesurf/scripts/e2e-ego.mjs#L390-L392>)；[fork test](<../../../dsh-nano-local-sandbox/test/e2e-fork.test.mjs>) | 合并重复e2e或共享业务断言，清理workerd-kv旧期待；保留真实负例 | T27：同构建双入口得相同业务结论，不以record名字数证明覆盖。当前SOURCE漂移 |
| G28 P2 | [route scan test:14](<../../../dsh-nano-local-sandbox/test/route-scan-coverage.test.mjs#L14-L28>)；[threat fixture:170](<../../../dsh-nano-local-sandbox/test/threat.spike.test.mjs#L170-L190>) | 修正本轮两项基线失败的真实归属：全仓ledger缺条、旧终端fixture；不删测试遮掩 | T28：保留本轮210/212原始结果；两失败各自归属修复/验证，全仓ledger项独立协调；下一次报告实际计数不固定212，fixture用生产数据形状。当前FAIL |
| G29 P2 | [HAR:1269](<../../../dsh-nano-local-sandbox/src/host/routes.js#L1269-L1277>)；[elements:61](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L61-L86>) | **D：HAR lite/标准声明校准按决定落实**；Elements保留id/class/children/style证据，精准选择 | T29：所选择的HAR schema或lite文档相符；ID/class搜索和节点样式与live一致。当前SOURCE缺口 |
| G30 P2 | [i18n tests](<../../../dsh-nano-kitesurf/test/i18n.test.mjs#L10-L27>)；[preview:2553](<../../../dsh-nano-kitesurf/src/client/index.js#L2551-L2558>) | 文案语义与真实能力对齐，补格式占位符/英文UI/预览标签；不使用“正常”暗示页面成功 | T30：zh/en主要全流程、长文本布局、无缺key/占位符、可访问名称；当前key parity PASS，行为NOT RUN |
| G31 P0 | [CDP预算:159](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L159-L163>)；[队列:97](<../../../dsh-nano-local-sandbox/src/host/cdp-elements.js#L97-L108>)；[HTTP预算:3](<../../../dsh-nano-kitesurf/src/shared/navigation.js#L3-L5>) | 为open/shot/dom/recover完整串行链建立预算与迟到结果归属，**D：超时后等待/取消/替换的公共语义**；不把timeout当transport死，不盲重试 | T31：在各子步骤边界注入延迟，HTTP与CDP截止一致；A超时后迟到不覆盖B、队列不偷偷重放；假stopLoading不得宣称取消成功。当前SOURCE+目标站timeout LIVE |
| G32 P1 | [shot:963](<../../../dsh-nano-local-sandbox/src/host/routes.js#L963-L998>)；[绑定表](<../../../dsh-nano-local-sandbox/lib/bindings.js#L5-L12>) | 截图错误字段传播；quality/scroll/viewport副作用与capability、重试文档对账；不得以非空占位图当渲染成功 | T32：模拟截图error+data仍按失败处理；三格式解码、quality范围/差异、scroll界限；history/shot是否可重试按副作用逐项验证，不新增未经决定的权限面。当前SOURCE缺口 |

### 7.1 实施次序与依赖

- **波次A：先修假成功与断路（G02/03/05/06/07/08/11/12/14/16/31/32）。** 让故障可定位、调试接口真实可用，禁止再被9/9绿灯掩盖。
- **波次B：同页架构与展示一致性（G01/04/09/10/13）。** G01是前置决定，不能只调端口；之后才能验收人机同页调试与HITL。
- **波次C：真实仿真、恢复与完整交付（G15/17–24）。** 不以copy插件完成替代runtime与服务，历史/配置真源只一份。
- **波次D：官方引擎升级与可用性对照（G25）。** 可与A并行实验，但不能拿升级掩盖本地缺陷；不修改当前工作实例直到有完整产物与回退。
- **波次E：测试工具与文档收敛（G26–30贯穿各波）。** 不再增加无区分力断言和仪式；每个gap有一个能失败的回归反例及一个正例。

### 7.2 最小测试矩阵升级

| 维度 | 最小样本 | 判定深度 |
|---|---|---|
| 页面类型 | static / SSR / pure SPA / delayed fetch / asset-extension module / image/canvas / redirect | 可见标记、真实交互、副作用、liveDOM与pane身份一致 |
| 网络阶段 | DNS/TLS失败、慢headers、慢body、404入口、子资源失败 | 地址栏阶段准确、Network完成状态、错误source、无自动重复导航 |
| 时间 | 首次进入、加载中、超时后迟到、再次导航、刷新、宿主重启、容器恢复 | generation/last-good/trace/持久状态可追踪 |
| 协议 | REST、HTTP MCP、WS MCP、pane/agent | 同一owner结果一致，JSON-RPC正确，身份不符拒绝 |
| 隔离 | dev暖环境、独立空home夹具、缺runtime/image/daemon | 缺前置明确、不会破坏旧容器、无desktop副作用 |
| 仿真 | 初始脚本/后续脚本/HTTP/截图四面 | 不是只读POST回显；null/失败回滚都验实际值 |
| 重试与并发 | 双击导航、两pane、超时后重试、并发recover | 一个意图一条导航，无盲重放/连接抖动/旧结果覆盖 |
| GUI与i18n | 中文/英文、窄pane、键盘、tab详情关闭 | 不篡改宿主DOM；真实点击能完成业务而非只找到按钮 |

---

## 8. 本次审查 verdict 与升级后价值

### 8.1 当前判定

**NOT READY FOR DELIVERY / 基础能力部分可用，完整调试交付未完成。**

- 不能说“Kitesurf什么都打不开”：example、IANA、React、Archy在本轮有可见内容，基础CDP/样式/请求详情/恢复有正向证据；RFC只有DOM证据而截图呈现异常，未判通过。
- 也不能说“环境都正常，只是Axtra网络不好”：可控SPA、Console、Network、evaluate、MCP、cookie/locale/DPR均有独立本地缺陷。
- 最严重的交付裂缝是**用户看到的页、API操作的页、agent工具的页和诊断依据不是一套已经闭合的事实**。
- 上次错误收口应撤回“可稳定浏览与调试”表述，保留已通过的局部能力；本轮只完成审查与取证，不宣告这些gap已修复。

### 8.2 完成升级后应实现的目标

1. 用户一键准备当前实例，不需要了解dev目录或手拷runtime；失败直指daemon/产物/镜像/端口中的真实原因。
2. 页面加载过程中能区分“等待”“有进展”“已失败”“旧画面”，不会全空红灯或空壳绿灯。
3. 一个简单SPA的启动、异步更新、按钮交互、选元素、看请求、读异常、执行求值构成可重复闭环。
4. MCP与pane真正同页，或经 [业主] 决定的隔离语义明确；不能静默回到无关about:blank或替代引擎。
5. 仿真支持清单与实际值一致，配置清除/失败回滚不残留；持久化符合已决定的单一真源。
6. 更新官方引擎后，同一测试矩阵可比较收益/回归，失败能回退；desktop最终验收以目标实例证据完成，不能由dev推断。

**价值不是“多了多少功能/测试”，而是用户能完成调试、失败能解释、升级可复现、部署可恢复，并且完成声明不再超出证据。**

---

## 附录 A · 证据索引与复现入口

- [证据目录说明](<1119-evidence/README.md>)；[全部证据SHA-256清单](<1119-evidence/manifest.json>)；[源码关键锚点](<1119-evidence/source-anchors.txt>)；[路由目录](<1119-evidence/route-inventory.json>)。
- [独立复核修订记录](<1119-evidence/independent-review.md>)；链接检查仅验证文件存在/行号范围，锚点的语义由独立代码复核确认，不能拿链接脚本代替代码审查。
- 历史：[相关Git日志](<1119-evidence/git-history.tsv>)。
- 离线：[摘要](<1119-evidence/offline-summary.json>)、[最小反例](<1119-evidence/offline-reproductions.json>)、两包TAP。
- 环境：[部署一致性](<1119-evidence/deployment-parity.json>)、[runtime hashes](<1119-evidence/dev-runtime-integrity.json>)、[宿主重启记录](<1119-evidence/dev-host-restart.json>)。
- 实测：[真实六站](<1119-evidence/dev-real-sites.json>)、[可控样例](<1119-evidence/dev-fixture-pages.json>)、[慢加载心跳](<1119-evidence/dev-slow-heartbeat.json>)、[调试交互](<1119-evidence/dev-debugger-interaction.json>)。
- 协议：[REST/HTTP MCP](<1119-evidence/dev-rest-mcp.json>)、[边界](<1119-evidence/dev-rest-boundaries.json>)、[WS目录](<1119-evidence/dev-ws-mcp.json>)、[同页偏差](<1119-evidence/dev-ws-same-page.json>)。
- 仿真：[cookie/HTTP](<1119-evidence/dev-emulation.json>)、[初始脚本与DPR](<1119-evidence/dev-emulation-timing.json>)。
- 旧smoke：[9/9仍PASS日志](<1119-evidence/existing-gui-smoke.log>)；它是本报告“验收不能代表可用性”的直接对照。

复现命令使用现有本机依赖，不安装新依赖：

```bash
# 从仓根执行；HOME/DSH_HOME/KITESURF_STATE 指向临时隔离状态目录，勿指desktop。
node --test --test-timeout=15000 dsh-nano-kitesurf/test/*.mjs
node --test --test-timeout=15000 dsh-nano-local-sandbox/test/*.mjs

# 既有smoke需要已有dev鉴权URL；不要把token写进报告/命令历史。
SMOKE_URL='<现有 dev 已登录 URL>' bash scripts/gui-smoke-kitesurf.sh
```

使用[可控fixture](<1119-evidence/dev-fixture-server.cjs>)时，只能通过 [DNLS] backend 在dev容器内启动；不要在宿主或desktop替代运行。实测仅在获得当前dev会话后走同源受鉴权REST；不要直接新开/关闭另一条CDP来推断pane状态。
