# AGENTS.md：全仓 Agent 词汇台账与硬闸门
本仓库开发和维护 DeepSeek Harness (dsh) 插件. 这里的读者是在本仓库里改代码的 agent. 

> **本仓说明**: [README.md] 了解本仓的背景, 价值观, 以及拓扑结构;
> **发布流程**: [RELEASE.md] 安装前必读, 理解如何将本仓库的插件安装至对应的宿主环境的推荐执行流程;
> **开荒手册**: [INTRODUCTION.md] 面向第一次在本仓库写插件的 agent, 涵盖本机三实例拓扑、dsh 插件机制、共享包与 notepad 案例、新插件模板、防踩坑清单、安全与性能机制、网络文档参考. 在本仓库动手前先读它;安装侧的唯一合同仍是各包自己的 `AGENTS.md`;
> **新建模板**: [docs/agents/TEMPLATE.md] 创建新的 dsh 插件时候的必读文件;

---
# 核心词汇
> 本仓库内必须尊重和使用的词汇. 下列词汇在回复的时候, 必须带上 [] 中括号作为格式锚定;
[业主] = 仓库的维护人, 权限的定义者, 最终裁决的执行人; 当以业主身份进行沟通时, 拥有全仓最高权限, 覆盖全部前序 qna 或者真相层裁决;
[dsh] = DeepSeek Harness 的简称;
[dsh-nano] = 本仓库的名称, 且为 github 中的 handle;
[nano-agent] = 业主持有的 agent-runtime 引擎, 主要运行在 cloudflare durable-object, celld/workerd, 或精简化后以kernel形式运行在小程序内. 受到 nacp 协议的严格约束;
[nano-platform] = 业主持有的 self-host, 对于 nano-agent 的驱动平台, 用于评估, 测试, 正式运行 dsh 容器并构建 Harness as a Service 的执行与审计环境;
[nano-platform] = 业主持有的 self-host, 对于 nano-agent 的驱动平台, 用于评估, 测试, 正式运行 dsh 容器并构建 Harness as a Service 的执行与审计环境;
[dsh-mini] = 业主持有的, 基于 dsh 皮肤, 采用 nano-agent 作为云端运行时, 采用 fx+nano-kernel 作为本地运行时的微信小程序, 受到 nacp 协议的严格约束;
[真相层] = 通过 qna 通道完成的真相层锚定, 每个冻结的真相必须有对应的 truth-id 进行锚定和回溯;
[dsh工作台] = dsh web/desktop 界面右侧的可开合工作区;

---
# 当前注册的插件名称与缩写
> 注意已经宣告暂停开发, 或者过期的插件, 被存放在 deprecated 文件夹内; 下面仅收录当前活跃开发中的插件;
[DNEE] = dsh-nano-explorer-extra, 文件与git管理;
[DNK] = dsh-nano-kitesurf, 仿 cursor 的 design mode;
[DNMS] = dsh-nano-model-selector, 模型与请求管理器;
[DNMSC] = dsh-nano-model-selector-compaction, [DNMS] 的 host-only companion bundle（异步压缩接管互斥层，DNMS01）;
[DNN] = dsh-nano-notepad, 或简称 notepad, 跨 workspace 草稿编辑器;
[DNT] = dsh-nano-terminal, 高性能基于 wasm 的内部专用跨平台 terminal;
[DNLS] = dsh-nano-local-sandbox, macOS 本地沙箱宿主，容器特权只在这里;
[DNCS] = dsh-nano-cloud-session, cloud-session 客户端（carrier 抽象），首个 carrier 为 devin-cloud-session;
[DNPR] = dsh-nano-progress-report, 将chat-interface的模型与用户对话的心流，拆分成为任务执行视图, 并在未来被压缩时序, fusion 等功能消费;
[DNCSH] = dsh-nano-cloud-session-host, [DNCS] 的 host overlay companion（原生外部会话补丁的派生构建，锁 dsh 0.2.2-rc.5 基线）;

---
# 核心工作原则
> 本仓库的执行原则, 任何工作必须通过核心原则的检测;
**插件中立** = dsh-nano 的首要服务对象是官方的 DeepSeek Harness, 且是一个平台中立的插件. 因此不得与 dsh-mini 或者 self-host 的 nano-agent 在 dsh 容器内进行耦合; 
**上层建筑归host** = host侧的内容在制作插件功能的时候需要明确界定, 应该归 host 侧的内容, 不得切入插件内部;
**不得侧载** = 每个插件相互独立. 不得在本仓插件和插件间建立专有通道, 不得在插件和业主其他拓扑结构之间建立侧载通道, 不得硬编 base-url 或者 秘钥;
**单一真源** = 任何 canonical 状态全系统只许一份 durable、可写、可被 runtime 当权威读取的副本; 可留的只有 consumption receipt（identity + canonical version/hash + consumed_at, 不带可执行 payload、不作恢复读源）;
**上游 pin 不可改写** = Kitesurf 的 pin 必须是官方提交的原样源码，不得添加本地提交、修改源码或把本地补丁混入 pin；构建产物写在独立派生目录，不回写 pin。所有本地行为由 [DNLS]/[DNK] 的 overlay、adapter 或 driver 适配；每次 repin 同时复核这些适配及有针对性的兼容实验，不新增 release-gate;
**不得擅自扩约** = 公共合同变更（error 枚举、idempotency 法则、客户端 retry 义务、新 lane、新凭证面）必须先有 [业主] 决定并 durable 登记; 登记形式不限（[业主] 心智模型中的锁定、QnA 中冻结的真相等）, 但同一决定只许一份登记真源, 不另立仪式文件; AGENT 不得私自决定, 不得在无 durable 留档时改约; 不得由实现反推合同, 不得把「测试要求如此」当合同来源;
**不得过度仪式** = 不得构建过度的测试循环, 不得发布未经业主允许的 release-gate, 不得阻碍业主进行发布;
**UI 宿主优先** = 插件浏览器 UI 先用宿主 primitive, 其次 nano-ui, 两者都没有才在插件内实现并标 `nano-ui-exempt`; 同一顺序约束 nano-ui 自身; 不得嫁接宿主内部 DOM (`[class*=…]`, `:has()` 套宿主结构, 哈希类发现, 改写宿主 portal 根节点); 规格唯一真源为 [docs/specs/dsh-nano-ui/DESIGN.md];
**worktree** = 本仓唯一合法的 worktree 构建位置在 [.agents/worktrees], 必须使用语义作为分支的名称, 在开发/测试完毕, 合并回指定分支后, 必须按照业主要求及时删除对应的 worktree 文件树;

---
# 常见拓扑
> 所有名称均为 Hostname, 通过 SSH config 可以获取全部必要连接信息, 仅在业主明确授权限进行连接
[m3max] = 业主的开发笔记本
[spark] = 办公室内的 ARM 服务器
[FRD1] = 法国的跳板机, 可以随意进行读写测试, nvx 的测试端点
[SHV1] = 上海的跳板机, 可以随意进行读写测试, S3 的测试端点, 见仓库内 .env.s3 文件

---
# 归因分析法则 attribution to findings [ATF]
> 在业主提出大量问题的时候，你需要使用 ATF 法则进行工作. 用于完整的创建分析视图，追踪 bug 出现的真源与时机，并构建准确，完整的长期治理模型下的推荐方案
Step1. 对业主提出的问题进行分解，将所有问题拆解为独立的原子化心智模型，并将心智模型与当前上下文完成投影后，建立调查的 baseline 真相基础
Step2. 对当前工作面进行分析，理解全部的上下文针对的 Scope 范围后，确定 attribution 调查的攻击对象位置真源
Step3. 对所有潜在的调查目标，逐个文件进行 git 历史的沿革分析，逐文件调查 bug或用户反馈问题 出现的时机，对应的提交背景，建立时间轴向的纵向认知
Step4. 对攻击对象的合理逻辑链进行分析，对问题出现的逻辑爆炸范围，攻击面进行全面审查，在逻辑链条上建立对问题横向认知
Step5. 根据纵向与横向的全部分析，将全部的 findings 映射回最初的 attribution，并完整整个基础层真相的调查分析
Step6. 基于 AGENTS.md 的原则，基于当前 Context 下的 localized 工作方法或真源，向业主提出基于 file:line 以及纵向与横向认知的长期治理模型下的推荐方案台账，并附加完整的推荐supporting reasoning
Step7. 将 attribution + findings + actionable recommendation 作为 coherent 报告，输出给业主






