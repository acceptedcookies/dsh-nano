# Async compaction 部署后评估（desktop · 2026-11-19）

> 只读评估。[业主] 要求梳理 desktop profile 里近期有 async compaction 行为的 session，对准上一次真源改动部署到 desktop 之后的运行结果，按五轴打分，并把结论钉回机制 `file:line`。本文不改代码、不改策略、不改约。
>
> 评估窗：ledger 时间 `at >= 2026-11-17T17:37:00Z`（= 2026-11-18 01:37 +0800，desktop 上 [DNMSC] 四份运行文件的 mtime）。Journal 是一次压缩的 durable 真源；`async-history/*.jsonl` 是派生诊断，不是权威。

## 0. 结论

部署后的 async 路径是健康的，而且和冻结机制一致。10 次 arm 全部落到 commit，没有 drop、timeout、circuit、disarm、preempt。主 turn 没有被摘要堵住；checkpoint 帧和八段式摘要让模型在压缩后接着干活，包括尾部几乎被切光的两次。

Pin 拆分的公式是对的，落地不是。`pinnedAsyncTokens = 140000` 在 262k 窗口上被 15% 帽死在 39300，三级选择器又让 turn/step 优先于更接近 pin 的 node。10 次 async select 里只有 1 次（node）把尾巴留在 pin 附近；最差的两次只留下 3999 和 2823。心流能续上，靠的是摘要，不是 pin。

| 轴 | 判定 | 一句话 |
|---|---|---|
| 1. 机制是否符合真源 | 符合 | B 线 arm、同毫秒 claim、select 在 summarize 之前、commit 才落 bracket、lane-active 抑制重入，和代码一致 |
| 2. 时序 / 接口 / 诊断 | 正常，有两处读不出来 | Journal bracket 10/10 闭合且和 ledger 数字一致；同步 lane 的触发原因和 commit 后水位没有记账 |
| 3. pinned 拆分 | 公式按设计，结果不按 pin 落地 | effectivePin 每次都算对；选择器的层级优先可以让尾巴偏离 pin 一个数量级 |
| 4. prompt 优化 | 起作用 | 新帧（条数、token、边界、compactionId、`inspect_checkpoint`）在生产里可见；10/10 摘要是完整八段 |
| 5. arm 与心流 | 正面，样本小 | 同一次 turn 里连续压缩后工具调用立刻继续；最差切分也没有把任务打回原点 |

## 1. 证据口径

| 别名 | 路径 |
|---|---|
| 运行代码 | `~/.dsh-desktop/plugins/dsh-nano-model-selector-compaction/lib/` |
| 策略真源 | `~/.dsh-desktop/plugins/nano-model-selector/async-compact.json` |
| 诊断台账 | `~/.dsh-desktop/plugins/nano-model-selector/async-history/<sessionId>.jsonl` |
| 会话真源 | `~/.dsh-desktop/sessions/--Users-seanz-Documents-dsh-plugins--/<id>/session.v4.jsonl.zstd` |
| 仓库机制 | `dsh-nano-model-selector-compaction/lib/{host-compaction,compact-region,compact-policy}.js` |

仓库这四份运行文件和 desktop 逐字节相同：`compact-policy.js`、`compact-region.js`、`host-compaction.js`、`async-history.js`。Journal 里的 `compaction/prune` 是 tool-result pruner，不是 async episode。焦点名单以台账为准，不以 journal 里 `compaction/` 的命中次数为准。

策略文件 mtime 2026-11-17 09:22 +0800，评估窗内没有改过。全文：

```json
{
  "schema": 1,
  "model": { "provider": "magpie", "model": "auto/deepseek-v4.1-flash-1017" },
  "bufferSizeAsync": 0.7,
  "healthTargetAsync": 0.35,
  "bufferSizeSafety": 0.9,
  "pinnedAsyncTokens": 140000,
  "pinnedFullTokens": 20000
}
```

没有 `extraRequirements`。因此 arm 上的合同指纹就是内置指令：`instructionVersion()` = `9f8a1a46`（本机对当前源码现算，与全部部署后 arm 一致）。

## 2. 上一次真源改动，以及它何时进了 desktop

最后一笔改到 [DNMSC] 的提交是 `db75582`（2026-11-17 17:55 +0800，inspect-checkpoint 的 default export 修复）。它是 HEAD 的祖先；`db75582..HEAD` 不再改 [DNMSC]。这一串才是「上一次真源」：

| 提交 | 时间 (+0800) | 内容 |
|---|---|---|
| `7067602` | 11-17 16:08 | P1 策略硬切与共享烘焙 |
| `f8a9acf` | 11-17 16:13 | P2 `inspect_checkpoint` 与 base 覆盖 |
| `6064627` | 11-17 16:30 | P3 生命周期、互斥、超时、disarm |
| `c770f3d` | 11-17 16:42 | P4 统一三级选择器、prompt 清理、checkpoint 帧、select 账本 |
| `a8a48b0` | 11-17 16:57 | P5 session 范围 runtime、共享订阅、严格水位序 |
| `231eb0b` | 11-17 16:59 | P6 closure 语义校正 |
| `c21cc9c` / `5a59730` / `c49e332` | 11-17 17:15–17:18 | 复评夹具与 -08/-09 校正 |
| `db75582` | 11-17 17:55 | HOTFIX：inspect-checkpoint 必须是对象插件 |

Desktop 磁盘副本的 mtime 是 2026-11-18 01:37:12 +0800。运行切换比这早一点：同会话 `session-60e08fea` 在 2026-11-17 13:49Z 的 commit 还是旧指纹 `3b7aa71f`，16:02Z 的 arm 已经是 `9f8a1a46`。进程换包落在 11-17 21:49 到 11-18 00:02（+0800）之间，01:37 的拷贝把磁盘对齐到 `db75582` 之后的字节。

不要用 `build.json` 认部署身份。Desktop 上这份仍写着 `gitSha: e271a76`、`builtAt: 2026-11-17T01:06:33Z`。`e271a76` 是 11-17 09:06 的 deploy-local 提交，早于整串 ACE-1117。文件没随 lib 一起更新。

评估表只收 01:37 之后的台账。换包当夜、mtime 之前的两笔（`60e08fea` 16:02Z，窗口 1e6、retain 140000；`767f1813` 17:02Z，窗口 5e5、retain 75000）是过渡样本，不进下表。它们的 retain 仍然等于 `min(140000, floor(0.15·W))`，公式在换窗时也成立。

## 3. 部署后有 async 行为的 session

10 次 async arm，10 次 commit，0 次 drop。另外 6 次同步 select（manual / full），同步 lane 不写 ledger `commit`（只在 `_finishEpisode` 里写，见 §5）。

| Session | 在做什么 | Async commit | 同步 select | 备注 |
|---|---|---|---|---|
| `60e08fea-…` | [DNK]/[DNLS] 长会话，journal `turn=191` | 4 | manual 1、full 1 | 焦点。一次 turn 里连续压缩 |
| `d0539e7f-…` | [DNPR] 从规格写到 dsh-dev 可视验证，`turn=4` | 2 | — | 焦点。两次都是严重欠切 |
| `767f1813-…` | [DNMS] 第三页 UI，`turn=141` | 1 | manual 1 | 焦点。唯一的 turn 边界 async |
| `534e58eb-…` | kitesurf 只读审查，`turn=1` | 1 | — | |
| `cd43955d-…` | kitesurf 交付审查，`turn=1` | 1 | — | |
| `dc4f340c-…` | [DNK] 协议审查，`turn=1` | 1 | — | |
| `eba05eec-…` | — | 0 | full 2 | 同步重试，无 arm |
| `f9ee0250-…` | — | 0 | manual 1 | 无 arm |

`767f1813` 的 journal 有 421 条 `compaction/`，其中 220 条是 `compaction/prune`。那不是 async。

## 4. 轴 1 — 机制是否符合真源

符合。部署后每一笔 async 的形状都是：

`arm → claim（同一毫秒）→ select → skip lane-active* → commit`

对应代码：

1. **B 线才 arm。** `_pressureGate` 在 prune 之后的 fill ≥ `bufferSizeAsync` 且不是 full-only 时才 arm（`host-compaction.js:864-928`）。10 次 arm 的 fill 都在 0.701–0.749，`bufferSizeAsync` 都是 0.7，`orderOk` 都是 true。没有一次从 0.35 或 0.5 误触发。
2. **Arm 不阻塞 turn。** `_beginEpisodeAttempt` 在 arm 的当口把 phase 改成 `running` 并踢摘要，bracket 推迟到 commit（`host-compaction.js:379-412`）。台账里 arm 和 claim 的时间差是 0–1ms。
3. **在飞则抑制。** 同 session 再进 pre-step 时 `_laneActive` 写 `skip / lane-active`，不开始第二笔（`host-compaction.js:869-876`）。10 笔里 6 笔带 1–3 条 skip，fill 在飞的过程中还在涨（主 turn 还在往上下文里加 token）。另外 4 笔没有 skip，是因为那段时间没有新的 pre-step（典型情况是主 turn 正堵在一次工具调用里），不是摘要把 turn 卡住了。
4. **Select 先于摘要。** `select` 写在 `tx.summarize` 之前（`host-compaction.js:500-522`）。10 笔都有 select，没有「先 commit 再补 select」。
5. **Durable 真源仍是 journal bracket。** 10 个 `compactionId` 都是 `compaction/start` → `compaction/summary` → `compaction/end`，`end` 无 error，`sourceCommandId` 为空（不是 `/compact`）。Ledger 的 `tokens` / `records` 和帧里的 `replaced:` 一致，抽查的 8 笔逐字相同，例如 `7a8e182c`：`replaced: 260 entries (~85995 tokens)`，边界 `node` 在帧里写成 `message`（`compact-region.js:287`）。
6. **有效 pin 按公式冻结在 arm。** `effectivePin = min(pinnedAsyncTokens, floor(0.15·W))`（`compact-policy.js:29,93`；`host-compaction.js:909-911`）。W=262000 时 `floor(0.15·262000)=39300`，`min(140000, 39300)=39300`。10 次 arm 的 `retain` 都是 39300。`39300/262000=0.15 < H=0.35`，所以不是 DC-1，`fullOnly` 不该亮，`orderOk: true` 与此相符（`compact-policy.js:93-101`）。
7. **超时与熔断没有被碰到。** 预算 120s（`host-compaction.js:72,397-401`）。最慢一笔 arm→commit 53.0s。评估窗内没有 `circuit-open`、`timeout`、`disarmed`、`preempted`。

同步 lane 也按真源抢占：manual / full 走 `_runLane`，先 preempt 再选区间（`host-compaction.js:468-479,731-737`）。评估窗里没有看到 preempt 记录，是因为这些同步 select 发生时没有在飞的 async episode，不是抢占路径坏了。

## 5. 轴 2 — 时序、接口、诊断

时序正常。10 笔的 arm→commit：

| 时间 (+0800) | Session | 秒 | 边界 | skip |
|---|---|---|---|---|
| 11-18 21:02:58 | `cd43955d` | 16.7 | step | 2 |
| 11-18 21:07:45 | `534e58eb` | 30.0 | step | 3 |
| 11-18 22:28:54 | `60e08fea` | 53.0 | node | 0 |
| 11-18 23:04:01 | `767f1813` | 15.9 | turn | 0 |
| 11-18 23:11:10 | `60e08fea` | 22.5 | step | 1 |
| 11-18 23:34:51 | `60e08fea` | 16.8 | step | 2 |
| 11-18 23:59:13 | `d0539e7f` | 24.4 | step | 2 |
| 11-19 00:24:54 | `d0539e7f` | 16.5 | step | 0 |
| 11-19 00:30:12 | `dc4f340c` | 33.3 | step | 2 |
| 11-19 00:30:44 | `60e08fea` | 14.9 | step | 0 |

接口表达：

- 摘要模型就是策略里的 `magpie / auto/deepseek-v4.1-flash-1017`，10 次 arm 的 `target` 都是它。
- `promptVersion` 有两套时间，这是代码故意的，不是合同在飞的过程中被换掉。Arm 用的是当时的 `extraRequirements`（`host-compaction.js:365,923`），所以部署后清一色 `9f8a1a46`。真正发出去的指令在 summarize 闭包里重算（`host-compaction.js:1071-1075`），commit 记的是这一份。Step 边界会把当前 turn 的开场白拼进指令：写入点是 `host-compaction.js:509-513`（只有 `boundary === 'step'`），拼接在 `compact-region.js:253-254`。哈希就变了。Turn / node 不拼，commit 仍是 `9f8a1a46`：`60e08fea` 的 node 笔 `7a8e182c` 和 `767f1813` 的 turn 笔 `afe7e683` 都是这样。
- 同一个长 turn 的多次 step 笔共享 commit 指纹：`60e08fea` 后三笔都是 `2812097d`（journal 都是 `turn=191`），`d0539e7f` 两笔都是 `61929f08`（都是 `turn=4`）。指纹变的是开场白，不是模板。

诊断缺口，两处都是台账形状而不是运行失败：

1. **同步 lane 只写 `select`，不写 `commit`，也不写为什么走了 full。** `commit` 只在 `_finishEpisode`（`host-compaction.js:563-572`）。`_adoptedOverHealth` 在 commit 后若 fill 仍 ≥ H，就把 session 放进 `_overHealth`，下次再碰 B 线时走 FULL 而不是 async（`host-compaction.js:587-596,854-861`）。`60e08fea` 在 22:29 的 node commit 之后，22:48 出现了一次 full select（retained 33693，target 20000），中间没有新的 arm。这和「commit 后水位仍 ≥ H，下一回 B 线被提升成 FULL」相容，但台账分不出它和 S 线（0.90）触发。不能把 22:48 写成已经证实的 over-health。
2. **Commit 后的 fill 没有记账。** 只能用 arm 时的 `fill·W − shadowed` 估算，摘要本身的 token 不在台账里。帧里的 `replaced` 是被盖住的量，不是剩下的量。

`build.json` 的过期 `gitSha` 会让下一次审计认错包。它不影响运行。

## 6. 轴 3 — pinned 拆分

设计是两套 pin，不是一个：

| Lane | targetTokens | 回落线 `line` | 代码 |
|---|---|---|---|
| async | effectivePin = min(140000, floor(0.15·W)) = **39300** | H = 0.35 | `host-compaction.js:909-913` |
| full / manual / overflow | `pinnedFullTokens` = **20000** | B = 0.70（safety 时才是 S） | `host-compaction.js:762-768,988-996,706-712` |

选择器不是「切到刚好 target」。`selectCompactableRange`（`compact-region.js:411-524`）的规则是：

- 候选必须是配平的工具边界。
- 尾巴 token 有上界：`floor(line·W) − systemHead − CHECKPOINT_RESERVE`，`CHECKPOINT_RESERVE = 8192`（`compact-region.js:409,469`）。Async 上界约 `91700 − head`。`61358` 能入选，说明当时 head ≤ 约 22150。
- 层级优先：有 turn 候选就不用 step，有 step 就不用 node。更远的 turn 打败更近的 step（`compact-region.js:417,513-521`）。
- 同一层里才取 `|retained − target|` 最近，平手留更多（`compact-region.js:500-510`）。

所以 pin 只是某一层内部的距离目标。层一旦定了，稀疏边界可以让结果离开 pin 一个数量级。这是按 -08 写的，不是实现跑偏。

### 6.1 部署后 10 次 async select

| Commit | 边界 | retained | target | retained/target | shadowed | 摘要字符 |
|---|---|---|---|---|---|---|
| `7a8e182c` | node | 38801 | 39300 | 0.99 | 85995 | 11981 |
| `afe7e683` | turn | 46120 | 39300 | 1.17 | 91287 | 11921 |
| `25b0bf5b` | step | 30399 | 39300 | 0.77 | 115897 | 15985 |
| `8a619ad6` | step | 26713 | 39300 | 0.68 | 113806 | 12563 |
| `e1a4e62d` | step | 24897 | 39300 | 0.63 | 128746 | 13953 |
| `f0f55640` | step | 51726 | 39300 | 1.32 | 95039 | 19203 |
| `e4abc5d1` | step | 61358 | 39300 | 1.56 | 74700 | 17456 |
| `7a45eac9` | step | 13547 | 39300 | 0.34 | 130637 | 11946 |
| `b8f26a3e` | step | 3999 | 39300 | 0.10 | 126971 | 14035 |
| `e8db8ae9` | step | 2823 | 39300 | 0.07 | 124522 | 13323 |

只有 node 那一次打在 pin 上（差 499）。它打中，是因为范围内没有 turn/step 候选，选择器落到了 node。Turn 那一次（`767f1813`）差 +6820，是这一层里离 39300 最近的 turn，仍然可接受。

两笔严重欠切都是 step 胜出：

- `b8f26a3e`（`60e08fea`，23:34）：retained 3999。同层距离规则下，不存在另一个 step 候选落在 `(3999, 74601]` 里还比它更近。更接近 39300 的 node 被层级规则丢掉了。
- `e8db8ae9`（`d0539e7f`，00:24）：retained 2823，同一机制。这一笔盖住 468 条、约 125k token，留下的尾巴不到 pin 的十分之一。

两笔超切是 step 尾巴本身就厚：`e4abc5d1` 留了 61358，只盖住 74700。Arm 时 fill 0.701，估算 commit 后 fill 仍在 H 之上（`0.70·W − 74700` 再加摘要，大约还在 0.4 以上）。这是 10 笔里买到的跑道最短的一笔。

### 6.2 同步 lane 的 pin 更松

Manual / full 的上界用的是 B 不是 H，所以尾巴可以合法地留到大约 `0.7·W − head − 8192`。`60e08fea` 22:24 的 manual 是 turn 边界，retained **152604**，target 20000（7.6 倍）。四分钟后 fill 已经 0.749，这次 manual 没有把会话压回 B 线以下。`f9ee0250` 的 manual 是 18681/20000，turn 边界碰巧靠近 pin。`eba05eec` 连续两次 full select（5 秒内）：第一次 step 80535/20000，第二次 node 20816/20000，对应 `_compactPressureBody` 的重试循环（`COMPACTION_RETRIES = 1`，`host-compaction.js:63,774-792`）。

`pinnedAsyncTokens = 140000` 在这台机器的常用窗口上是死旋钮。15% 帽要等 `W > 140000/0.15 ≈ 933333` 才松得开。262k 的 flash 窗口上，真正生效的 async pin 永远是 39300。文件里的 140000 只在评估窗之前那次 W=1e6 的过渡 arm 里出现过。

## 7. 轴 4 — prompt 优化有没有起作用

有。P4（`c770f3d`）换掉的生产可见部分是 checkpoint 帧，不是「模型忽然会写八段」——八段在旧指纹 `3b7aa71f` 的摘要里已经有了。

部署前 `767f1813` / `067fab5a` 的帧是宿主旧文案：

> This is an automatically generated checkpoint condensing an earlier span of the conversation to free up context.

部署后 8 笔深挖的帧都是 `checkpointPreamble`（`compact-region.js:286-294`）：

> This is a compaction checkpoint … replaced: N entries (~T tokens) / retained tail starts at: {turn|step|message} level / compactionId / call inspect_checkpoint

数字和台账一致，`node` 显示成 `message`。10/10 摘要含全部 8 个小节（Primary Request、Key Technical Concepts、Files and Code、Errors and Fixes、Pending Jobs、Current Work、Next Step、Critical Context），没有一节写成 `(none)`，正文里也没有把旧的 `<compacted-summary>` 原样抄进来。指令要求合并旧 checkpoint 而不是照抄（`compact-region.js:232`）。

摘要是工作记忆，不是缩写标题。欠切最厉害的两笔仍然写出了可执行的下一步：

- `b8f26a3e`（尾巴 3999）：Current Work 指到 `navigateOnce` 的具体编辑和并行的 agent-17；Next Step 是 `node --check` 加 `dsh-nano-local-sandbox` 的测试。
- `e8db8ae9`（尾巴 2823）：Current Work 写明 [DNPR] 已在 dsh-dev 可视验证，19 行时间线、`type:shell` 滤到 3 行；Next Step 是 `test/live/tab.live.mjs`。

Step 指纹的一个偏差：`currentTurnOpeningRequest` 取的是本 turn **第一条** `user/message`（`compact-region.js:534-551`）。三个审查 session（`534e58eb`、`cd43955d`、`dc4f340c`）的 commit 指纹都是 `263acc23`，而它们的第一条 user message 都是宿主的工作目录变更通知，真正的任务在下一条，而且三条任务文本不同。指纹相同说明拼进指令的开场白是同一段目录通知，不是那三条不同的任务。摘要正文仍然写对了各自的任务，因为任务在被盖住的正文里。补偿段没有保护到它想保护的那句话。

`inspect_checkpoint` 在这 8 笔 commit 之后的 80 条 journal 里一次都没被调用。帧把入口放对了，模型是靠摘要本身续上的，不是靠把原文读回来。这条恢复路径在本样本里没有被生产验证。

## 8. 轴 5 — arm 的结果和心流

正面。判据不是「用户有没有夸奖」，而是压缩发生时主任务有没有断、压缩之后模型是接着做还是重新问一遍。

`60e08fea` 是最强的一笔。四次 async commit 全在 journal `turn=191` 里，从 22:28 到次日 00:30。Arm 与 claim 同毫秒，摘要在 turn 旁边跑；commit 之后的下一批事件是 `assistant/message` 和 `tool/call`（接下来约 80 条里 11–16 次工具调用），下一条真正的 user 文本是 `<system-reminder>`，不是用户把任务重说一遍。四次 Current Work 是往前走的，不是同一段复读：读 dsh-dev 日志 → 修完 DNK skill 并建包 → 改 `navigateOnce` → 调试 `cdp-relay` 的 multiplex 测试挂起。

`d0539e7f` 两次都在 `turn=4`。第二次 commit 时摘要已经写到「NPR 已部署且在 dsh-dev 上可视验证」。尾巴只剩 2823 token，模型仍然按 Next Step 继续发工具调用。Pin 没留住近期工具输出，摘要把心流接上了。

`767f1813` 的 turn 边界 commit 之后，同一段抽样里出现了 `turn/end` 再 `turn/start`，任务从「第三页菜单是否画在面板内」接着往下走，没有回到「我们在做什么」。

代价也在这批样本里，只是没有变成可见的任务失败：

- 欠切把「近期原文」换成「摘要里的散文」。本样本的散文质量够用。下一次摘要写丢一个路径或一个数字，模型没有 39k 的尾巴可以回头看，而它又没有调用 `inspect_checkpoint`。
- 超切（`e4abc5d1`）几乎没把水位打到 H 以下。Async 的跑道要靠下一次 B 线，而且那一次有可能被 over-health 提升成更狠的 FULL。本样本在这之后没有再越过 B 线，所以没有看到后果。
- 10 笔、全部成功、没有一次熔断。不能据此放宽 120s 或熔断阈值。

## 9. 后续建议

下面都是观察，不是改约。层级规则、台账字段、pin 语义都是已冻结的合同；要动必须先有 [业主] 的决定。

1. **Pin 落地。** 若希望 async 尾巴靠近 effectivePin，而不是「某一层里碰巧最近」，需要改 `selectCompactableRange` 的层级优先（`compact-region.js:513-521`）。一个不改公式、只改挑选的方向：当胜出层的最近距离超过 target 的某个比例时，落到下一层。这会改变 -08「更远的 turn 打败更近的 step」。`b8f26a3e`（3999）和 `e8db8ae9`（2823）是这个改动的回归样本。
2. **140000 在 262k 窗口上不生效。** 若 [业主] 要的就是大约 14 万的原文尾，当前模型窗口做不到，15% 帽会先把它打成 39300。要么接受 39300，要么换更大窗口的摘要/主模型。不建议把帽静默抬高。
3. **台账补两列，否则轴 2 的两个缺口还在。** Commit 时记一笔 commit 后的 fill；同步 `select` 记触发原因（`safety` / `over-health` / `dc-1` / `manual` / `overflow`）。另外把 `promptVersion` 拆成合同指纹（模板 + `extraRequirements`，稳定）和请求指纹（含 verbatim）。现在的 commit 哈希把二者揉在一起，三个审查 session 的 `263acc23` 看起来像「同一份合同」，实际是同一句目录通知。
4. **Verbatim 取错句子。** `currentTurnOpeningRequest` 应跳过宿主注入的工作目录通知，取本 turn 里第一条真正的任务消息（`compact-region.js:534-551`）。摘要正文这次救了场，补偿段没有。
5. **`build.json`。** 下次往 desktop 拷包时一起更新。当前 `e271a76` 会把部署点认成 ACE-1117 之前。
6. **先不要动超时、熔断、H/B/S。** 这 10 笔没有提供「预算太紧」或「水位太高/太低」的失败样本。`60e08fea` 22:48 的 full 是否过狠，要等台账能写出触发原因再判断。

## 附录 — 机制索引

| 行为 | 位置 |
|---|---|
| 策略字段、15% 帽、主序、DC-1 | `dsh-nano-model-selector-compaction/lib/compact-policy.js:7-20,29,76-101` |
| 内置摘要指令、verbatim 与 extra 的拼接、指纹 | `lib/compact-region.js:198-276` |
| Checkpoint 帧、`node`→`message`、8192 预留 | `lib/compact-region.js:286-294,409` |
| 三级选择器 | `lib/compact-region.js:411-524` |
| 开场白提取 | `lib/compact-region.js:534-551` |
| 120s 预算、策略文件路径 | `lib/host-compaction.js:72,74-77` |
| Arm、冻结 pin / 指纹 | `lib/host-compaction.js:334-366` |
| 同毫秒 claim，摘要不占 turn | `lib/host-compaction.js:379-412` |
| Select 账、step 才附开场白 | `lib/host-compaction.js:482-523` |
| Commit 账（tokens、range、指纹） | `lib/host-compaction.js:531-572` |
| Commit 后 over-health | `lib/host-compaction.js:587-596,854-861` |
| B 线 arm 与 `lane-active` | `lib/host-compaction.js:800-931` |
| 发出前重算指纹 | `lib/host-compaction.js:1061-1077` |
| 台账只是派生诊断 | `dsh-nano-model-selector-compaction/AGENTS.md`「Audit ledger」一节 |

Desktop 策略：`~/.dsh-desktop/plugins/nano-model-selector/async-compact.json`。Desktop 台账：`~/.dsh-desktop/plugins/nano-model-selector/async-history/`。

---

## 10. 小窗口（262K）水位分析意见

针对 [业主] 的问题：为什么 140K 在 262K 上不生效、15% 帽是什么且是否合理、小窗口水位怎么推荐。数据按本评估窗内策略（B=0.70 / H=0.35 / S=0.90 / pinnedAsync=140000 / pinnedFull=20000，`magpie/auto/deepseek-v4.1-flash-1017`，W=262000）算，机制锚点沿用上文 `file:line`。

### 10.1 为什么 140K 不生效——两道闸门连续打死

**第一闸（实际生效的）：15% 帽。** `effectivePin = min(pinnedAsyncTokens, floor(0.15·W))`（`compact-policy.js:93`，帽常量 `PIN_FRACTION=0.15` 在 `:29`）。`floor(0.15×262000)=39300`，10 次 arm 的 `retain` 全是 39300。

**第二闸（帽拿掉也会死）：主序。** 合同要求 `effectivePin/W < H`（`compact-policy.js:13,96-100`）。`140000/262000=0.534 ≥ H=0.35` → DC-1 → `fullOnly: true` → async 永不 arm，只剩同步 FULL 道。

代码里自带分水岭：`windowMin = pinnedAsyncTokens / H`（`compact-policy.js:95`）。140000/0.35 = **400000**——140k pin 在 W>400k 的模型上才「有资格合法」，到 W≥**933333**（140000/0.15）才按字面生效。同一份策略文件在三个窗口的实测 retain：

| 窗口 | retain | 帽状态 |
|---|---|---|
| 1,000,000 | 140000 | 帽松（0.15×1M=150k ≥ 140k），pin 字面生效 |
| 500,000 | 75000 | 帽起作用（=0.15×500k） |
| 262,000 | 39300 | 帽起作用（=0.15×262k） |

### 10.2 15% 帽是什么，在 262K 是否合理

**是什么**：继承 [nano-agent] 语义的比例钳，保证「pin 永远是尾巴」。策略文件全局一份、W 随路由模型变，绝对 pin 必须按比例缩放才可能合法。

**在 262k 它不是节流器，是救命索**：没帽，140k pin 直接 DC-1 → fullOnly → async 整道关闭。帽把 `pinRatio` 钳在 ≤0.15 < H=0.35，async 才活着。

**常量数值**：方向对、偏保守、不紧迫——

- 39300 ≈ 1–3 个工具密集 step 的逐字尾；
- 压缩后落点 ≈ `retained + head + summary` ≈ `39300 + ~20k + ~4k` ≈ **0.25**，到 B 还有 ~117k 跑道；
- 帽有合法余量：18%（47.2k）、20%（52.4k）都仍 < H=0.35，不触发 DC-1。想给小窗更厚的尾，帽可议到 0.18–0.20，属常量/合同改动，需 [业主] 决定；
- **实测偏差的主因不是帽**：10 次 select 只有 node 那次贴近 39300，最差 2823/3999 是选择器层级优先造成的稀疏边界，帽调大照样切不中。

**附带隐患**：主序只查 `H<B`，不查 `H>0.15`。写成 H=0.10 时 `pinRatio=0.15≥H` → DC-1 → async 静默全灭且无报错——写路径校验可以补。

### 10.3 262K 小窗的真实约束

- **B-S 绝对净空只有 52.4k**（(0.9−0.7)×262k）。一次大文件读取可一步越过 B 直撞 S，在飞 episode 被 FULL preempt。
- 在飞 fill 涨 0.005–0.035（约 170–400 tok/s），15–53s 的 attempt 目前赶得及 commit，但净空薄。
- **粒度是小窗本质**：一个 balanced step 可含 30–60k（窗口的 11–23%），边界稀疏，pin 命中率天然低。1M 窗切偏 30k 是 pin 的 3%，262k 偏 30k 是 76%。

### 10.4 对「300K 分水岭」的评价

300k 是合理的实用分水岭（帽在 300k 给 45k 尾，以下明显变薄），但机制里已有更精确的一条：**`windowMin = pinned/H`**（`compact-policy.js:95`），按当前配置是 **400k** 而非 300k——400k 以下绝对 pin 数学上就不成立。建议分水岭跟 `windowMin` 走，不写死 300k；若只要操作直觉值，300k 可接受。

### 10.5 推荐水位（≤300k，按 262k 算数）

| 参数 | 当前 | 建议 | 理由 |
|---|---|---|---|
| B | 0.70 | **0.62–0.65** | 最划算的一刀：arm 提前 ~13–21k token，B-S 净空 52k→66–73k（+26–40%），在飞 episode 存活率上升。B 是可写策略字段，不改合同 |
| H | 0.35 | 保持（激进可 0.30） | H 是尾巴上界（maxRetained≈91.7k）不是 pin；压低则落点更低跑道更长，0.30 时上界 78.6k 仍够用 |
| S | 0.90 | 不动 | 只读 |
| pinnedAsyncTokens | 140000 | 接受帽，或 UI 显示生效值 | 文件全局一份；面板应展示「本窗口生效 39300」 |
| pinnedFullTokens | 20000 | 不动 | FULL 是应急道，目标越小减得越狠，方向正确 |

### 10.6 >300k（含 500k / 1M 实测窗口）

- 300–930k：帽自然给 45k–139k 尾，水位不用动；B-S 净空随窗放大（500k→100k，1M→200k）。
- ≥933k：pin 字面生效，140k 尾合法。
- ≥400k：可考虑 H 提到 0.40–0.50（尾巴篮子更宽），非必须。

### 10.7 比水位更重要的一条

水位调参只治边际，治不了 2823/3999 那种切偏——那是 `selectCompactableRange`「层级 > 距离」（`compact-region.js:513-521`）在小窗的必然结果。若 [业主] 愿改合同，「胜出层偏离 target 超过 X% 落到下一层」是比任何水位调整更大的杠杆；`b8f26a3e`/`e8db8ae9` 两笔即回归样本。

### 10.8 一句话版

140K 不生效 = 15% 帽先切成 39300，没帽也会撞 H 变 fullOnly；帽在 262k 是 async 存活前提，合理（可议 0.18–0.20 不急）；小窗真瓶颈是 B-S 净空（52k）与边界粒度，**B 降到 0.62–0.65 是最便宜的一刀**，分水岭建议跟 `pinned/H`（当前 400k）走而非写死 300k。
