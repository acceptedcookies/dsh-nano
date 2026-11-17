# dsh-nano-model-selector

只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
装好的标志：composer 出现 `.nms-trigger`，并且 `/imagine` 已经注册。

## 身份

| 项 | 值 |
|---|---|
| 包名 | `dsh-nano-model-selector` |
| 插件 id | `nano-model-selector` |
| 版本 | 读 `package.json` 的 `version`，不要写死 |
| dsh 引擎 | 读 `package.json` 的 `engines.dsh` |
| 平台 | 仅 web |
| 宿主入口 | `index.js` |
| 浏览器入口 | `lib/client.js` |
| 宿主 inject | `llm`、`webServer`、`connection`、`skills` |

## 交付物

| 路径 | 角色 |
|---|---|
| `package.json` | 包名、`engines.dsh`、`files`、bundle patch、`dsh.client.inject` |
| `cordis.patch.yml` | 插入插件 id。`name` 是包名 |
| `index.js` | 宿主。运行时必需。目录路由、媒体路由、`imagine` 注册 |
| `lib/host-media.js` | 引擎探测、状态读写、技能正文。运行时必需。`index.js` 直接 import 它 |
| `lib/bundle-inventory.js` | 异步压缩 companion bundle 的只读库存投影（single-flight + 快照 + 事件失效）。运行时必需（`index.js` 相对 import） |
| `lib/perf-review-host.js` | 宿主 perf-review bundle。运行时必需（`index.js` 相对 import） |
| `lib/route-guard.js` | 路由注册 guard bundle。运行时必需（`index.js` 相对 import） |
| `lib/bindings.js` | 从仓根 `security/route-sensitivity.json` 按 id 烘焙的绑定表。运行时必需（`index.js` 相对 import） |
| `lib/client.js` | 浏览器包。运行时必需。安装时不重建 |
| `icon.svg`、`locale/` | 图标与中英文案 |
| `src/` | 作者树。已有上面的 `lib/` 时安装不需要它 |

client inject 以 `package.json` 的 `dsh.client.inject` 为准，不在这里抄。`files` 必须含 `lib/host-media.js`、`lib/route-guard.js`、`lib/bindings.js` 和这份 `AGENTS.md`，否则发包后宿主找不到模块。

## 前置

1. `dsh --version` 落在 `package.json` 的 `engines.dsh` 内。不够或过高就停。不要自行放宽，除非操作者明确接受命令输出里的那一对版本。
2. `pnpm` 在 PATH 上。`dsh plugin` 只是把参数转给 profile 里的 pnpm。
3. 目标是已经能打开的 Web profile，默认名 `web`。不要装进 headless、sdk 或 acp。
4. 图片生成需要本机 CLI。没有也能装：`/imagine` 会注册成引导 stub。探测顺序见「初次运行」。
5. 本包构建期依赖 `dsh-nano-ui`，声明为 `devDependencies` 的 `file:../packages/dsh-nano-ui`。`npm install`/`npm run build` 时解析这个相对路径；构建时它被打进 `lib/client.js`，运行中的页面不单独加载它。不要改这条依赖。tarball 只含构建产物，`dsh plugin add` 不再需要旁边的 `packages/` 目录。
6. 本包还构建期依赖 `dsh-performance-review`，同样声明为 `devDependencies` 的 `file:`，约束同上。它被打进 `lib/client.js` 和 `lib/perf-review-host.js` 两份产物；默认是恒等包装，只有页面带 `?perf-review=1` 或 `localStorage['dsh-perf-review']='1'`、宿主带 `DSH_PERF_REVIEW=1` 时才采集。不要改这条依赖。
7. 本包还构建期依赖路由注册库 `dsh-host-route-guard`，同样声明为 `devDependencies` 的 `file:`，约束同上。宿主侧由构建生成 `lib/route-guard.js`，绑定表从仓根账本按 id 烘焙进 `lib/bindings.js` 供 `index.js` 相对 import；全部 web 路由经 guard 注册，Host/Origin 围栏与 405 在 guard 内。不要改这条依赖。

未被告知 `DSH_HOME` 或 profile 名时，只动默认的 `web`。不要猜第二套实例。

## 安装

唯一命令：

```bash
dsh plugin --profile web add <spec>
```

`<spec>` 是本目录的绝对路径、`.tgz` 的绝对路径，或发布后的包名。

成功时写入该 profile 的 `dependencies` 和 `dsh.profile.bundles`，并应用本包的 `cordis.patch.yml`。其中 `name` 必须是包名，不能是绝对路径。

不要手改 profile 的 `package.json`。

没有 HMR 时，重启正在服务该 profile 的宿主进程，再强制刷新页面。只刷新页面不会换宿主路由。

卸载用 `dsh plugin --profile web remove`，参数是「身份」里的包名。没有 HMR 时同样要重启宿主。卸载不删除「配置与状态」里的浏览器数据或宿主状态文件。

## 验收

按顺序。前一步失败就停，不要换一个 profile 重试。失败时先看该 profile 目录下 `.plugin-manager/logs` 里这次 `dsh plugin` 的日志。

1. profile 的 `package.json` 里，`dependencies` 和 `dsh.profile.bundles` 都有本包名。
2. 重启并刷新后，页面里能找到本包的 client 模块（包名）。找不到说明 client 没进页面。
3. composer 出现 `.nms-trigger`。rail 为单列图标栏，首排是「全部」「收藏」「媒体生成」。
4. 已登录页面里 `GET /nano-model-selector/catalog` 返回 200 JSON。裸 curl 被拒是鉴权，不是没装上。composer 输入 `/i` 能看到 `imagine`。

## 初次运行

插件激活时注册 `imagine`。安装方不用再做初始化。

```
media-engine.json 里的显式选择
  → 自动挑选第一个检测到的引擎（grok 优先）
  → 引导 stub（没有引擎时 /imagine 仍在，内容是引导）
```

| 引擎 | 探测（按顺序） | 状态 |
|---|---|---|
| `grok` | `~/.grok/bin/grok`、`~/.local/bin/grok`、PATH 上的 `grok` | 可用 |
| `codex` | `~/.codex/bin/codex`、`~/.local/bin/codex`、PATH 上的 `codex` | 占位，未实测 |

显式预置不是第二条安装路径。在线：已登录页面 `PUT /nano-model-selector/media-engine`，正文 `{"engine":"grok"}`，成功后立刻重注册技能。离线：把 `{"engine":"grok"}` 写到「配置与状态」的状态文件，然后重启宿主。`engine` 只能是 `grok` 或 `codex`，否则丢弃并回到自动挑选。

## 使用

| 动作 | 结果 |
|---|---|
| 点 `.nms-trigger` | 单列图标 rail（超出高度可滚动、底部渐隐并有下拉指示）+ 模型列表 + 详情与 effort；`deepseek`/`deepseek-account`/`deepseek-official` 合并为单一「DeepSeek」品牌 |
| 「媒体生成」 | 扫描并选择本机图片 CLI |
| composer 里 `/imagine` | 把所选引擎的命令模板注入会话 |

技能要求会话 agent：把描述原样写进 `imagine/.prompt.txt`、把 `imagine/<slug>.<ext>` 写进 `imagine/.out.txt`（kebab-case slug，运行时 `grep -E` 门禁校验），然后**原样**执行模板——模板无占位符可替换。grok 模板把 `GROK_HOME` 指到工作区内的 `imagine/.grok`（并把 `~/.grok` 的凭证拷过去），形如 `OUT=$(tr … < "$PWD/imagine/.out.txt"); … ; mkdir -p "$PWD/imagine/.grok" && cp … ; GROK_HOME="$PWD/imagine/.grok" <binary> -p "$PROMPT. Save the image file to $OUT" --always-approve --cwd "$PWD"`，因此不需要 `danger-full-access`——所有写入都在工作区内。用户没要求就不要跑。

路由都有 `connection.requestRejection`。裸调用被拒不是故障。

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/nano-model-selector/catalog` | 给浏览器的模型目录 |
| GET | `/nano-model-selector/media-engines` | `{ engines: [{key,label,detail,path,available}] }` |
| GET | `/nano-model-selector/media-engine` | `{ engine, explicit }`。`explicit: false` 表示自动挑选，未持久化 |
| PUT | `/nano-model-selector/media-engine` | 正文 `{"engine":"<key>"}`。写入状态文件并重注册 `imagine`。正文上限 16384 字节 |
| GET | `/nano-model-selector/perf-review/host` | 只读全进程性能视图。只接受 `since`；`mode` 和其他参数返回 400，不排空 |

## 配置与状态

无宿主 Config。

状态文件在 `$DSH_DATA_DIR`，否则 `$DSH_HOME`，否则 `~/.dsh`，其下 `plugins/nano-model-selector/media-engine.json`。卸载不删这个文件。整目录重建会丢掉显式选择；`/imagine` 仍在，只是回到自动挑选。

浏览器另有 `localStorage` 键 `dsh-nano-model-selector:media-engine.v1`，只是缓存。不要覆盖用户已有的状态文件。

## 构建

仅当「交付物」里的运行时文件缺失，或你刚改了 `src/`。

在本包目录执行：

```bash
npm install
npm run build
```

然后确认运行时文件非空。不要安装一份缺少这些文件、又不是你刚刚构建的树。

## 故障

| 现象 | 原因 | 处理 |
|---|---|---|
| 页面没有选择器 | patch 或 `lib/client.js` 不在包内，或宿主没重启 | 补齐后重启宿主并刷新 |
| 启动报找不到 `lib/host-media.js` | 运行时文件没进包 | 确认 `files` 含 `lib/host-media.js` 后重装 |
| catalog 或 media 返回 302 或被拒 | 没带已登录页面的会话 | 正常。用已登录页面验证 |
| `/imagine` 写着 no media engine configured | 本机没有 grok 或 codex | 装 CLI，或在「媒体生成」里选已检测到的引擎 |
| grok 被沙箱拦住 | 老版模板直接写 `~/.grok` | 正常模板已把 `GROK_HOME` 指进工作区，出现此卡说明宿主没重启装上新版；重装或重启宿主 |
| `dsh plugin add` 报引擎不符 | `engines.dsh` 与正在跑的 dsh 不一致 | 换符合范围的 dsh，或在操作者明确接受风险后执行命令输出里的 `allow-version`。不要改本包的 `engines` |
| pnpm 找不到 `dsh-nano-ui` | `../packages/dsh-nano-ui` 不存在 | 按「前置」放好，不要改依赖声明 |

## 异步压缩接管（DNMS01）

本包额外提供接管开关与策略路由；执行面在 host-only 姊妹包 `dsh-nano-model-selector-compaction`，其 `dsh.profile.bundles` 成员是 ON/OFF 唯一 canonical 开关（`install ≠ 接管`——`dsh plugin add` 后默认 OFF，需显式 `set_bundle(compaction,false→true)` 或面板切换）。

| 方法 | 路径 | 作用 |
|---|---|---|
| GET/HEAD | `/nano-model-selector/async-compact` | `{ok,policy:{…,effective:{pin,windowMin,dcs},runtime:{fill,lastCompaction,degraded}},missing}`。`policy=null`+`degraded='state-read-failed'` 表示状态文件不可读（U4）。**不携带 `bundle`**——库存投影在独立路由上，见下 |
| GET/HEAD | `/nano-model-selector/async-compact/bundle` | `{ok,bundle:{installed,enabled,known,availability?}}`。唯一的 U1–U4 库存读口。宿主侧快照缓存（默认 30 分钟，正确性由 `plugin-manager/changed` 立即失效保证，TTL 只兜底漏事件）+ 并发去重；**不得**把它并回状态面，`pluginManager.listBundles()` 单次约 0.9 秒同步磁盘枚举，轮询会把宿主事件循环打死 |
| PUT | `/nano-model-selector/async-compact` | 部分更新 `async-compact.json`（16384 字节上限；master 序 + schema 校验 + fail-closed，400 不写） |
| POST | `/nano-model-selector/async-compact/switch` | 面板唯一写入口（1024 字节上限）；转发 `pluginManager.setBundleEnabled('dsh-nano-model-selector-compaction')`，返回 `{application,restartReason?,bundle}`（先失效库存快照再重读） |

`GET …/async-compact?sessionId=<id>` 额外返回 `history`（附加字段，不传则响应形状不变）：

| 字段 | 含义 |
|---|---|
| `history.records` | 该会话的引擎决策账本，按追加顺序，最多 200 条 |
| `history.summary` | 从 records 折叠出的 `{arm,claim,commit,drop,skip,lastCommitAt,lastDropReason}`，不另存一份 |
| `history.degraded` | `null` 正常；`history-read-failed` 表示账本不可读或 sessionId 不合法 |

账本位置 `plugins/nano-model-selector/async-history/<sessionId>.jsonl`（与 `async-compact.json` 同目录）。**唯一写入方是 companion bundle**，本包只读；它是审计遥测，不是权威——一次压缩的权威仍是 session journal 的 `compaction/start|summary|end` 括号。

状态文件：与 media-engine.json 同目录的 `plugins/nano-model-selector/async-compact.json`（tmp+rename 原子写，0600）。卸载不删。字段 8 项（无 `enabled`）：`model` / `bufferSizeAsync`（B，默认 0.65，必须 `< H` 之上且 `< S`）/ `healthTargetAsync`（H，0.50）/ `bufferSizeSafety`（S，0.90 只读，文件不是 0.90 即 state-read-failed，不抬升）/ `pinnedAsyncTokens`（100000）/ `pinnedFullTokens`（20000）/ `extraRequirements`（追加在内置摘要指令之后，默认空）/ `schema`（1）。`summaryPrompt` 键出现即 `invalid-schema`。`effectivePin = min(pinnedAsyncTokens, floor(0.15·W))`；DC-1 `B < windowMin` → `fullOnly`；fill = `totalTokens/W`。

面板入口：顶栏搜索框与关闭按钮之间的「异步压缩」按钮，仅当 companion bundle 已安装时出现，否则搜索框占满该位。目录刷新按钮在搜索框内。页内四态（未安装/未启用/已启用/degraded），开关走 `POST …/switch`；B/H/pinnedAsyncTokens/model 可编辑 PUT。

历史视图：会话头部「更多操作」菜单里的「异步压缩历史」（`ctx.contextMenus.register({target:'sessionHeader', order:500})`），打开 nano-ui `NanoDialog`（主窗口级，宿主 `Modal` 承载遮罩、居中与焦点）。卡片顶部是水位尺（当前 fill 对 H/B/S 三条线，越过 B 即为应有 episode 的状态），下面是触发/执行/成功/失败四个计数，再下是「时间线 / 诊断」两个页签：时间线逐条列出决策（可展开看原始 JSON），诊断给出 `bundle/policy/effective/runtime/history` 的完整快照并支持一键复制。全部控件来自官方 primitive（`SegmentedControl`/`Tag`/`Button`/`relativeTime`/`writeClipboard`），配色只读 `--dsw-*` token。面板里的接管开关是宿主 `Switch`，场景页签是宿主 `SegmentedControl`，模型与媒体引擎标签是宿主 `Tag`。

两个必须遵守的呈现约束：

1. **固定高度**：时间线与诊断内容量差很大，内容撑高会让卡片在切页签时跳。`NanoDialog` 传 `fixedHeight: 560`，正文滚动。
2. **页签用 `SegmentedControl` 而非 `SegmentedTabs`**：后者每个页签渲染一个 `Pill`，看起来像自绘的描边控件；前者是 shell 自己的滑动指示器。

状态徽标：会话头部操作区（`conversation.session.header.utilities`，list slot，**必须带 `id`**，否则注册被拒）显示 `异步压缩已排队` / `正在异步压缩` / `已异步压缩 · N 条` / `异步压缩失败`，悬停给出摘要模型与 `摘要 v<8位指纹>`。指纹是生效摘要指令的 sha256 前 8 位（内置 + 附加要求整段；改 `extraRequirements` 即变）。

**不要放在 `conversation.input.activity`**：那是 composer 自己的活动行，语义是「输入框正忙」；异步压缩是会话级后台任务，放进去会让人以为在等输入。

`已异步压缩` 这一态是必需的：宿主的「上下文已压缩 · 已压缩 N 条历史记录」行由 `CompactionNodeView` 渲染，只传 `node.data`、标题固定回落到 `message.compaction`，**没有异步变体**（上层建筑归 host，插件改不了）。所以异步归属只能由本徽标承担，并在 commit 后保留 10 分钟。

该态由客户端从账本末条推导（`resolvePhase`），不依赖宿主是否已升级：宿主 `phase` 非 idle 时优先用宿主，否则若末条是 10 分钟内的 `commit` 就合成 `committed`。轮询空闲 15s、armed/running 3s。

`history.phase` 由账本末条推导：`arm`→`armed`（15 分钟内有效）、`claim`→`running`（3 分钟内有效，引擎单次尝试上限 120s）、`drop`→`failed`（10 分钟内有效，带 `reason`/`detail`）、`commit`→`committed`（10 分钟内有效，带 `tokens`/`records`/`compactionId`），`skip` 与过期记录一律 `idle`——宿主重启留下的陈旧 `arm` 不会让界面永久显示「正在压缩」。

历史时间线**不使用 `StateDot`**：`ongoing` 是空心环，看起来像永远转不完的 spinner；历史记录是既成事实，用静态方块标记 + `Tag` 语义色即可。

`dsh.client.inject` 必须含 `@deepseek-ai/dsh-client-ui-context-menu`：缺了它，`ctx.contextMenus` 能拿到对象、`register()` 也返回 disposer，但注册进的是另一个 registry，菜单永远不出现。

## 不要

- 不要把本目录拷进 `$DSH_HOME/plugins/` 当作安装。那不是这条合同。
- 不要用裸 curl 判定路由失败。请求必须带已登录页面的会话。
- 不要在用户没要求时执行 `/imagine`。
- 不要把 `context/` 或本机手册当成安装步骤。它们不在这个包里。
