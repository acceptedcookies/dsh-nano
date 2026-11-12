# 包内 AGENTS.md 母版

这是三个 overlay 插件包内 `AGENTS.md` 的治理源，不是安装步骤。tarball 只带包内那一份，所以包内文件必须自洽，不能软链到本文件。

读者是只拿到这一个包或它的 `.tgz`、要把它装进 dsh Web profile 的 agent。不写规格、不写变更记录、不写本机双实例。规格在 `docs/specs/<包名>/`。本机环境在仓库根 [AGENTS.md](../../AGENTS.md) 和 `.local-dsh-setup.md`。

改安装合同时，先改本文件里的不变段落，再逐字抄回：

- [dsh-nano-notepad/AGENTS.md](../../dsh-nano-notepad/AGENTS.md)
- [dsh-nano-model-selector/AGENTS.md](../../dsh-nano-model-selector/AGENTS.md)
- [dsh-nano-explorer-extra/AGENTS.md](../../dsh-nano-explorer-extra/AGENTS.md)

> **⛔ DEPRECATED（2026-11-12）**：`dsh-nano-shared-workspace` 已退役并移至 [`deprecated/dsh-nano-shared-workspace/`](../../deprecated/README.md)，**本母版不再为它生成包内 `AGENTS.md`**，也不再列入「逐字抄回」清单。下方三行即现行全部活跃插件。

## 骨架

标题是包名。标题下三段是范围，其后十一个二级标题固定、顺序固定。没有内容的块写「无」，不删标题。

~~~~markdown
# <包名>

只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
装好的标志：<一句可观测的话>。

## 身份
## 交付物
## 前置
## 安装
## 验收
## 初次运行
## 使用
## 配置与状态
## 构建
## 故障
## 不要
~~~~

## 不变段落

下面几段在三份文件里逐字相同。尖括号是槽位，不进包内文件。

范围的前两句：

```markdown
只处理这一个包。不要安装、不要修改、也不要假设旁边还有别的 nano 插件。
周围仓库、`context/`、本机手册都不在这个包里。
```

前置的第 1、2、3、5 条和末句：

```markdown
1. `dsh --version` 落在 `package.json` 的 `engines.dsh` 内。不够或过高就停。不要自行放宽，除非操作者明确接受命令输出里的那一对版本。
2. `pnpm` 在 PATH 上。`dsh plugin` 只是把参数转给 profile 里的 pnpm。
3. 目标是已经能打开的 Web profile，默认名 `web`。不要装进 headless、sdk 或 acp。
5. 本包依赖 `dsh-nano-ui`，声明为 `file:../packages/dsh-nano-ui`。`dsh plugin add` 时 pnpm 会解析这个相对路径，目录必须是 `<parent>/packages/dsh-nano-ui` 与 `<parent>/<本包>`。不要改这条依赖。运行中的页面不单独加载它，构建时它被打进 `lib/client.js`。

未被告知 `DSH_HOME` 或 profile 名时，只动默认的 `web`。不要猜第二套实例。
```

第 4 条是本包的外部命令。没有就写「无」。

安装，整节相同：

~~~~markdown
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
~~~~

验收的引导句和第 1、2 步：

```markdown
按顺序。前一步失败就停，不要换一个 profile 重试。失败时先看该 profile 目录下 `.plugin-manager/logs` 里这次 `dsh plugin` 的日志。

1. profile 的 `package.json` 里，`dependencies` 和 `dsh.profile.bundles` 都有本包名。
2. 重启并刷新后，页面里能找到本包的 client 模块（包名）。找不到说明 client 没进页面。
```

构建，整节相同：

~~~~markdown
## 构建

仅当「交付物」里的运行时文件缺失，或你刚改了 `src/`。

在本包目录执行：

```bash
npm install
npm run build
```

然后确认运行时文件非空。不要安装一份缺少这些文件、又不是你刚刚构建的树。
~~~~

「不要」的最后一条：

```markdown
- 不要把 `context/` 或本机手册当成安装步骤。它们不在这个包里。
```

## 槽位

| 块 | 写什么 | 不写什么 |
|---|---|---|
| 装好的标志 | 一条看得见或请求得到的结果 | 「应该生效了」 |
| 身份 | 包名、插件 id、平台、入口、宿主 inject。版本和引擎指向 `package.json`，不写死 | client inject 清单、第二张「能力」表 |
| 交付物 | 运行时文件与作者文件各一行 | 全树 |
| 前置第 4 条 | 本包额外的外部命令 | 本机路径、launchd |
| 验收第 3、4 步 | 界面标志，然后宿主标志（路由、状态栏或技能） | 换 profile 重试 |
| 初次运行 | 零额外动作时出现什么、写在哪、卸载删不删 | 第二条安装路径 |
| 使用 | 动作表；agent 能调用的符号或路由；会改仓库或删数据的门禁 | 产品为什么这样设计 |
| 配置与状态 | 宿主配置（可省略）和浏览器存储键。没有就写「无」 | 用宿主配置去隐藏文件 |
| 故障 | 现在还会遇到的失败。三列：现象、原因、处理 | 已修复的旧版本 |

## 戒律

- 全文中文。命令、路径、标识符、JSON 键保持原文。
- 一个事实只出现一次。
- 安装只有 `dsh plugin --profile web add`。不写往 `$DSH_HOME/plugins/` 拷贝，不写 launchd，不写日常实例和开发实例。
- 危险动作单独写门禁：用户没要求就不要调用。
- 「不要」最多 5 条，而且不重复上面已经写成门禁的句子。
