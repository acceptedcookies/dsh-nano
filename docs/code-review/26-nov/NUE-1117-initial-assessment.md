# NUE-1117 初始评估：dsh-nano-ui 增强（nano-ui-enhancement）

> 编号：NUE-1117（NUE = nano-ui-enhancement）
> 基线：`main` @ `6b814f2`（ahead origin 6），宿主 `@deepseek-ai/dsh@0.2.2-rc.1` web profile，primitives 快照 rc.3
> 范围：`packages/dsh-nano-ui` 与全部活跃插件的浏览器 UI（[DNN] [DNEE] [DNMS] [DNCS] [DNK] [DNT]；[DNLS]、[DNMSC] 无浏览器 UI）
> 性质：评估 + 方案草案。本文**不冻结任何真相**；凡涉及公共合同或新规则的项，均标记为「待 [业主] 裁决」，进入后续 `NUE-1117-qna.md`。
> 证据口径：`file:line` 以基线 HEAD 为准；[DNK] 行号已在 `6b814f2` 复核。

---

## 0. 摘要

一句话结论：**nano-ui 现在是「几个弹层组件的集合」，不是「UI 体系」。** 它没有规格真源、没有令牌层、没有组件目录、没有测试、没有发现机制，因此各插件只能各自手绘；手绘又没有任何检查器能看见，于是重复、漂移、死样式和隐性 bug 持续累积。

| 维度 | 现状 | 目标 |
|---|---|---|
| 真源 | 无 UI 规格；README 停在 11-09 写着「三个插件」 | `docs/specs/dsh-nano-ui/DESIGN.md` 为唯一真源 |
| 覆盖 | 6 个导出（Dialog/Menu/Toast/Tabs/DOM 适配/样式串） | L0 令牌 + L1 安全门面 + L2 约 13 个组件 + DOM 适配 |
| 发现 | 无 `.d.ts`、无目录、无宿主 primitive 清单 | 从宿主生成 catalog（令牌/图标/props） |
| 测试 | 包内 0 测试；行为只被 [DNN] 3 个测试间接覆盖 | 包内单测 + 插件接线检测（仅 warn） |
| 治理 | `check-client-rules.mjs` 只扫 [DNMS]、只认具名 import | `check-ui-rules.mjs` 全仓扫描，warn-only，可由 design skill 触发 |
| 版本 | 永远 `0.1.0`，无 changelog | semver + CHANGELOG |

附带发现的**真实缺陷**（与 UI 体系无关，但应单独修，不并入 NUE）：
- [DNK] `src/client/index.js:1848` 调用 `setDrag(null)`，全文件没有 `drag` state（仅 `draftBox` @364），开关标注时抛 `ReferenceError`。
- [DNMS] `src/client/styles.js:242` 分隔线缺少开头的 `/*`，242–244 成为裸文本，吞掉 245 行 `.nms-hist { display:flex … }` 规则。
- nano-ui 自身引用了宿主不存在的令牌：`--dsw-alias-label-error`（styles.js:21,22）、`tooltip-label`（33）、`danger`（60）、`focus-ring`（128,129）。共享库的令牌错误会扩散到所有使用方。

---

## §1 [业主] 痛点 → 具体需求分解

[业主] 的原始诉求可归纳为：「各插件 UI 不像 [dsh] 原生，每次都要逐个返工；nano-ui 没起到收口作用。」拆成可验证的需求：

| ID | 痛点表述 | 具体需求 | 可验证标准 |
|---|---|---|---|
| R1 | 「看起来不像原生」 | 插件 UI 的尺寸、圆角、字号、颜色、图标全部来自宿主令牌或 primitive | 未解析令牌数 → 0；手绘 glyph 仅在登记缺口内存在 |
| R2 | 「每个插件都在重复造」 | 通用控件（开关、标签页、图标按钮、设置行、状态徽标、空态、确认框、浮窗）只实现一次 | 同一控件模式在插件内的手写副本 → 0（登记豁免除外） |
| R3 | 「agent 写 UI 时不知道有什么可用」 | 可发现的组件/令牌/图标目录，带 props 与示例 | 新插件作者只读 DESIGN.md + catalog 即可选型 |
| R4 | 「改一处要追很多处」 | 主题、层级（z-index）、暗色切换、浮窗主题跟随有单一实现 | 主题选择器 `body[data-ds-dark-theme]` 与 z 层值只在 nano-ui 出现 |
| R5 | 「修了又坏」 | nano-ui 有自己的测试；插件接线有覆盖预警 | 包内单测存在；`check-ui-rules` 能列出每个插件的偏离 |
| R6 | 「不想要仪式」 | 检查只 warn，不做 release-gate，不阻碍发布 | 检查脚本退出码恒 0（除自身崩溃），不进 deploy 链 |
| R7 | 「长期治理，不要 hotfix」 | 先立真源与分层，再迁移插件；能硬切就不双写 | 迁移按插件整块切换，旧样式同提交删除 |
| R8 | 「平台中立、上层建筑归 host」 | nano-ui 只做宿主缺口的补位；宿主有的直接透传；宿主组件改不了的不去改 | 每个 L2 组件都写明「宿主对应物 / 缺口理由」 |
| R9 | 「设计要有方法」 | 一套 design guideline 提示词 + 框架 + 工作流，沉淀为内部 design skill | skill 可被 agent 激活，产出评审意见而非门禁 |

隐含约束（来自 AGENTS.md 核心原则）：
- **不得侧载**：nano-ui 是构建期 `file:` 依赖、打进各插件 bundle，不是运行时共享通道。保持此形态。
- **不得擅自扩约**：「UI 归 nano-ui」若写进 AGENTS.md 属于全仓规则变更，须 [业主] 裁决。
- **不得过度仪式**：§7 的检测明确为 warn-only。

---

## §2 nano-ui 拆解、更新史图谱、与宿主原生体系对照

### 2.1 当前结构（620 行）

| 文件 | 行数 | 内容 | 问题 |
|---|---|---|---|
| `index.js` | 6 | 6 组导出 | 无类型、无版本常量 |
| `src/dialog.js` | 57 | `NanoDialog`：包装 primitives `Dialog`，加 `className`、固定高度、主题类 | 无 confirm 语义；危险按钮样式靠 CSS |
| `src/menu.js` | 101 | `NanoMenu`/`NanoMenuItem`：分段、勾选、图标槽、`direction:'up'` | 与宿主 `Menu`/`MenuSurface`/`MenuItemButton` 重叠，未复用宿主 item shape |
| `src/toast.js` | 11 | `NanoToast` 薄包装 | 无交互 toast（撤销、操作按钮） |
| `src/dom.js` | 160 | `openNanoDialog`/`openNanoMenu`：给非 React（DOM 字符串）插件用，返回 `close`+`setTheme` | 只覆盖 Dialog/Menu；无通用 `mountNano` |
| `src/tabs.js` | 150 | `nanoTabs`（DOM）+ `NanoTabs`（React，771babf 新增，105–150） | 与宿主 `SegmentedControl`/`SegmentedTabs` 关系未写明 |
| `src/styles.js` | 135 | `NANO_STYLES` 字符串；`--nano-*` 字号令牌（9a25d7e 登记） | 含 5 个宿主不存在的令牌（见 §0） |
| `package.json` | — | `0.1.0`，peer：react、react-dom、primitives `>=0` | 版本从未变更；`>=0` 无下限 |
| `README.md` | — | 软链到 docs/specs，内容停在 11-09 | 过期 |

### 2.2 更新史图谱

```
11-09  c4ccf41 ─ 首提交（随 DNN 文件树重组诞生：dialog/menu/toast）
       5072068 ─ 弹窗限高 80%                    ┐
       da98057 ─ 卡宽=浮窗×0.6、遮罩收进浮窗      │ 全部由 DNN 需求驱动
       7f6f26d ─ 编辑器字号                       │
       472a247 ─ README 软链到 docs/specs         │
       b5c4f2c ─ 危险确认描边红字（DNMS 打包）    ┘
11-10  9a25d7e ─ --nano-* 字号令牌，宿主 :root 覆盖（唯一一次「契约」性变更）
       772223a ─ 菜单限高/锚点间隙/border-box
       24316ed ─ 菜单图标 16px 槽
11-11  174046e ─ 对话框挂载层 pointer-events 关闭
       55575ae ─ 分段 tab；固定高度对话框滚动交给面板
11-12  b258f61 ─ 弹层跟随浮窗主题（DNN）
       51a71b5 ─ 设置弹窗蒙版溢出修复（DNN）
       0c97a94 ─ 层级：浮窗与弹层压过 shell 弹窗（DNN）
11-14  68399dd ─ openNanoMenu direction:'up'（DNK）
11-16  b3e4dc4 ─ 菜单分段 +48 行（DNN）
       437bd07 ─ NanoDialog className（DNT 同提交）
       771babf ─ NanoTabs（React）（DNLS/DNK 同提交）
```

规律：
1. **18 次提交中 12 次由 [DNN] 触发**，其余由 [DNK]/[DNT]/[DNMS] 顺手带入。nano-ui 是「DNN 的弹层工具箱」，不是自主演进的库。
2. **没有一次提交以 nano-ui 为主语做设计**：全部是修症状（限高、溢出、层级、主题跟随）。
3. 多次与插件改动**同提交**（437bd07、771babf、b5c4f2c），共享库变更缺少独立审查面。
4. 版本号从未动过，使用方无法知道自己打进了哪一版。

### 2.3 nano-ui vs 宿主原生体系：底层逻辑对照

| 层 | 宿主（dsh 0.2.2-rc.x） | nano-ui | 差距 / 结论 |
|---|---|---|---|
| 令牌 | `dsh-client-ui-theme/lib/client.js` 441 个名：radius xs4/sm8/md12/lg16/xl20/panel28；elevation stroke/panel/prominent/soft；字号阶梯 xl-24…xxxs-11（m-18 实为 16px）；暗色 = `body[data-ds-dark-theme]`；**无 spacing、无 z-index 令牌** | 只有 `--nano-*` 字号 3–4 个；其余直接引用 `--dsw-*`，其中 5 个不存在 | 缺 L0 层：间距、控件高度、z 层、git 色、主题作用域都没有统一定义 |
| primitive | `dsh-client-ui-primitives` 321 导出（rc.3），202 个图标；Button primary/ghost/outline/toolbar，md36/sm28，**无 icon-only**；Input 32px；Switch 36×20；SegmentedControl/SegmentedTabs/Menu/MenuGroup/MenuItemButton/MenuSurface 已解码；Modal/Tooltip/Toast/hooks 未解码 | 只包装 Dialog、Toast；Menu 自绘 | 没有「安全门面」：宿主某版缺导出时，各插件各写 `??` 回退（[DNK] index.js:1252–1280） |
| 组件 | 40+ 个 `dsh-client-ui-*` 官方包（layout、context-menu、workspace…）作为参考实现 | Dialog/Menu/Toast/Tabs | 插件反复需要但宿主没给的：IconButton、Toolbar、FieldRow、StatusChip、EmptyState、Confirm、Popover、Picker、ListRow、FloatingWindow |
| 渲染模型 | React，slot 注册，portal 到 body | React + DOM 适配（`dom.js`） | DOM 适配只覆盖 2 个组件，[DNN] 因此大量 DOM 字符串手绘 |
| 主题 | body 属性驱动，shell portal 跟随 | `setTheme` 手动推（b258f61） | 浮窗主题作用域（ThemeScope）没有抽象，逻辑散落在 [DNN] |
| 层级 | shell 自有层级，无公开 z 令牌 | 硬编码 z 值（0c97a94） | 各插件各写 z：[DNN] panel.js:77–80/943–948/1105–1110 |
| 图标/美术 | 202 个线性图标，16/20px，`currentColor`，1.5 描边 | 无图标层 | 缺左右 chevron 等，插件各自内联 SVG（[DNK] 1243–1247）或用 unicode（[DNT] ⊕?⚙） |
| 发现 | 无 `.d.ts`；导出清单只在 [DNMS] 测试快照 `test/primitives-exports.json` | 无 | agent 无法得知「有什么可用」 |
| 版本 | 随 dsh 发布 | 0.1.0 恒定 | 无 changelog，无兼容矩阵 |

---

## §3 灵活性 / 覆盖 / 深度 / 测试对比，抽象层盲点与断点

### 3.1 四维对比

| 维度 | 宿主 primitives | nano-ui | 插件实际需求 |
|---|---|---|---|
| 灵活性 | props 稳定但窄（Button 无 icon-only、无 danger 变体） | `className` 透传（437bd07）是唯一扩展点 | 需要 variant/size/tone 维度，而不是 className 逃生口 |
| 覆盖 | 广（321 导出）但不可发现 | 窄（6 导出） | 约 13 类控件反复出现（见 §4 汇总） |
| 深度 | 单控件深（键盘、a11y、主题） | 浅：Menu 键盘导航、焦点陷阱未验证 | 弹层的焦点、Esc、外点关闭、层级需要一处做对 |
| 测试 | 宿主自测，插件不可见 | **0**；行为只被 [DNN] `test/{z-order,portal-theme,dialog-layout}.test.mjs` 间接覆盖 | 每个导出至少有渲染 + 主题 + 层级单测 |

### 3.2 抽象层盲点与断点

| # | 断点 | 现象 | 根因 |
|---|---|---|---|
| B1 | **规格断点** | 无 DESIGN.md，`--nano-*` 契约只在 9a25d7e 提交说明里 | 「契约」没有落到真源文件 |
| B2 | **发现断点** | agent 不知道 primitives 有 Switch/SegmentedControl，于是手绘 `np-switch`、`nms-switch` | 导出清单只存在于 [DNMS] 测试夹具 |
| B3 | **令牌断点** | 全仓约 60 处未解析令牌（§4.7） | 无令牌清单可比对；CSS 变量失败是静默的（回落到 initial） |
| B4 | **门面断点** | 宿主版本漂移时插件各写 `??`/`||` 回退 | 没有 L1 安全门面集中处理「某版缺导出」 |
| B5 | **渲染模型断点** | [DNN] DOM 字符串 UI 无法用 React 组件 | `dom.js` 只适配 Dialog/Menu |
| B6 | **作用域断点** | 浮窗主题、遮罩收进区域（[DNMS] `:has()`、[DNN] 浮窗矩形）各写一套 | 缺 ThemeScope / RegionScope 抽象 |
| B7 | **检查断点** | `scripts/check-client-rules.mjs:31` 只设 `PKG = dsh-nano-model-selector`；`:124` 正则只匹配 `import { … } from` 具名导入 | 规则检查从 DNMS 个案长出来，没有泛化 |
| B8 | **归属断点** | 同提交混改 nano-ui 与插件 | 共享包没有独立变更面与版本 |
| B9 | **认知断点** | 注释与事实不符（[DNK] 1243 称「只有 chevron-up/down」；[DNT] AGENTS.md:53 与 package.json:32 依赖矛盾） | 无 catalog 可查，凭记忆写注释 |

---

## §4 逐插件 UI 分析与原生适配台账

图例：✅ 已用宿主/nano-ui；⚠️ 手绘但有宿主对应物；⛔ 逻辑错误；🧠 认知错误；🕳 合法缺口（应登记）。

### 4.1 [DNN] dsh-nano-notepad

| 项 | 证据 | 判定 |
|---|---|---|
| 内联 CSS 约 803 行 | `panel.js:52-854` | ⚠️ 体量最大的手写样式源 |
| 宿主 primitive 只用 `Button` ×3 | `panel.js:37`、`3840-3855` | ⚠️ |
| 89 个原生 `<button>` | panel.js 全文 | ⚠️ 应收敛到 IconButton/Button |
| 21 个手绘 glyph | `dshIcon` 858–893，`googleIcon` 856，`textIcon` 857，`PANEL_ICON` 886 | ⚠️ 大部分宿主有对应图标；google 品牌图标 🕳 |
| 开关 `np-switch` | 440–448、3059–3066、3255–3283 | ⚠️ 宿主 `Switch` 36×20 |
| 设置行复制宿主结构 | 注释 574 | ⚠️ → `FieldRow` |
| 自绘 tooltip | 555–563、1038–1041 | ⚠️ → 宿主 Tooltip（待解码） |
| slash 菜单 | 4185–4239 | ⚠️ → `NanoMenu`/Picker |
| 主题复制 | 55–63、93–94 | ⚠️ → ThemeScope |
| z 值硬编码 | 77–80、943–948、1105–1110 | ⚠️ → L0 z 层 |
| 未解析令牌 | tooltip-label、bg-primary、bg-secondary、label-quaternary、label-error ×4、radius-full、focus-ring | ⛔ 静默失效 |
| nano-ui 用法 | 2128–2132 | ✅ 正确示范 |

盲点：DOM 字符串渲染导致无法复用 React 组件（B5）；浮窗是 [DNN] 的核心形态，但「浮窗」本身没有被抽象，其他插件（[DNT] floatbar）也在重复。

### 4.2 [DNEE] dsh-nano-explorer-extra

| 项 | 证据 | 判定 |
|---|---|---|
| `styles.js` 675 行，其中 23 个死类 | 含 `.nxe-menu*` 298–324 | ⚠️ 死样式 |
| `:has()` 嫁接宿主 DOM | 234–250 | ⚠️ 依赖宿主内部结构，宿主改版即断 |
| 手绘 tabs | `drawers.js:486-494`、`754-761`、`914-921` | ⚠️ → `NanoTabs`/SegmentedControl |
| 复刻宿主工具函数 | `format.js` 复刻 `fileSizeText`/`relativeTime` | ⚠️ 宿主已导出 |
| git 调色板 ×3 份 | styles.js 多处 | ⚠️ → L0 git 色令牌 |
| 未解析令牌 | label-error ×14、danger、warn、tooltip-label、border-subtle ×2 | ⛔ |

### 4.3 [DNMS] dsh-nano-model-selector

| 项 | 证据 | 判定 |
|---|---|---|
| 26 个原生 button | src/client | ⚠️ |
| `.nms-switch` | styles.js:139–143 | ⚠️ → Switch |
| `.nms-tag` | styles.js:106–109 | ⚠️ 宿主有 `Tag` |
| 手绘 tabs | `CompactPanel.jsx:410-424` | ⚠️ |
| 未用的 `Tooltip` import | src/client | 🧠 |
| **CSS 注释缺 `/*`** | `src/client/styles.js:242`（237 已闭合，242–244 裸文本，吞掉 245 `.nms-hist`） | ⛔ 历史卡片 flex 布局失效 |
| 未解析令牌 | label-on-color、elevation-raised、hairline ×5、state-info-primary ×2、state-warning-primary ×5、font-mono；composer-model-*-display 为宿主 composer 变量（运行时存在，🕳 需登记） | ⛔/🕳 |
| 优点 | 历史视图全用官方 primitive（AGENTS.md 明示 SegmentedControl/Tag/Tooltip/Button） | ✅ |

### 4.4 [DNCS] dsh-nano-cloud-session

| 项 | 证据 | 判定 |
|---|---|---|
| 对话框质量高：30 Button / 28 Input | src | ✅ |
| 17 个 `[class*=]` 嫁接选择器 | `section.js:59-164` | ⚠️ 依赖宿主哈希类名 |
| `withLocal` 合成哈希类 | 36–39 | ⚠️ |
| 隐藏 [DNMS] DOM + aria-label 匹配 | `styles.js:20-31` | ⛔ 违反「不得侧载」精神：插件间通过 DOM 互相感知 |
| `window.confirm` ×3 | src | ⚠️ → `NanoConfirm` |
| 无 SlotBoundary | src | ⚠️ 崩溃会带走宿主 slot |
| 未解析令牌 | session-list-edge-inset、label-danger ×2、border-primary ×5、bg-secondary ×5、accent-primary ×2、dsw-mono | ⛔ |

### 4.5 [DNK] dsh-nano-kitesurf

| 项 | 证据（`6b814f2` 复核） | 判定 |
|---|---|---|
| 非图标 primitive 0 个；47 个 `h('button'` | src/client/index.js | ⚠️ |
| `||` 回退链 | 1252–1280 | ⚠️ → L1 安全门面 |
| 过期注释「只有 chevron-up/down」 | 1243–1244 | 🧠 宿主图标集需以 catalog 核实；内联箭头 1245– |
| **`setDrag` 未定义** | 1848（仅有 `draftBox` @364） | ⛔ ReferenceError |
| 未定义类 | `nks-tool-glyph` 1277、`nks-dt-grow` 1647/1668、`nks-primary` 1995 | ⛔ 样式无效 |
| HistoryDialog 重复实现 | src/client | ⚠️ |
| 设置页已用 `NanoTabs` | 771babf | ✅ |
| 未解析令牌 | fill-error ×12、fill-brand、label-invert、fill-warning ×3、label-inverted、link-hover、label-quaternary ×2、fill-success ×3 | ⛔ |

### 4.6 [DNT] dsh-nano-terminal

| 项 | 证据 | 判定 |
|---|---|---|
| trajCls 哈希类发现 | `NanoTerm.jsx:51-83` | ⚠️ 运行时扫宿主类名 |
| 死 CSS | 94–105、126–131、151–153、162 | ⚠️ |
| 已 import 图标 go/help/settings/add 未用，却用 unicode ⊕?⚙ | 550–557 | 🧠 |
| `filterQuery` 无效 | 487、570 | ⛔ 过滤功能不生效 |
| AGENTS.md 与 package.json 矛盾 | `AGENTS.md:53` vs `package.json:32` | 🧠 |
| 未解析令牌 | label-quaternary ×7、font-family-mono、warning、bg-l2 | ⛔ |

### 4.7 跨插件汇总

| 控件模式 | DNN | DNEE | DNMS | DNCS | DNK | DNT | 宿主对应 | nano-ui 归宿 |
|---|---|---|---|---|---|---|---|---|
| 开关 | ⚠️ | | ⚠️ | | | | `Switch` | L1 透传 |
| 标签页 | | ⚠️ | ⚠️ | | ✅ | | SegmentedControl | `NanoTabs` 统一 |
| 图标按钮 | ⚠️89 | | ⚠️26 | | ⚠️47 | ⚠️ | 无（Button 无 icon-only） | L2 `IconButton` 🕳 |
| 设置行 | ⚠️ | | | | ⚠️ | | 无公开 | L2 `FieldRow` |
| 确认框 | | | | ⚠️ | | | Dialog | L2 `NanoConfirm` |
| tooltip | ⚠️ | ⚠️ | 🧠 | | | | Tooltip | L1 透传（待解码） |
| 状态徽标 | | ⚠️git | ⚠️tag | | ⚠️ | | `Tag`/`StateDot` | L2 `StatusChip` |
| 浮窗 | ⚠️ | | | | | ⚠️ | 无 | L2 `FloatingWindow` 🕳 |
| z 层 | ⚠️ | | | | | | 无令牌 | L0 |
| 主题作用域 | ⚠️ | | ⚠️`:has()` | ⚠️ | | | body 属性 | L0 `ThemeScope` |
| 宿主 DOM 嫁接 | | ⚠️ | ⚠️ | ⚠️ | | ⚠️ | — | 不归 nano-ui；登记为风险 |

未解析令牌全量（含 nano-ui 自身）约 60 处。其中 `--dsh-hairline-width` 由运行时设置，属合法；composer-model-* 为宿主运行时变量，需登记。其余应映射到宿主真实令牌或 L0 新令牌。

### 4.8 认知错误归类

1. **「宿主没有，所以手绘」但宿主其实有**：Switch、Tag、relativeTime、fileSizeText、Tooltip。根因 B2。
2. **「宿主有，所以直接引用」但令牌名是猜的**：`label-error`、`danger`、`warning`、`bg-secondary`。根因 B3。
3. **「嫁接宿主 DOM 是适配」**：`:has()`、`[class*=]`、哈希类发现。这是对宿主内部结构的耦合，不是适配；违反「上层建筑归 host」。
4. **「nano-ui 是 DNN 的」**：历史表明它被当成 DNN 工具箱演进，其他插件不认为自己是使用方。

---

## §5 nano-ui 增强方案与 file:line 工作台账

### 5.1 目标架构

```
packages/dsh-nano-ui/
  index.js                 # 公共出口（分层 re-export）+ VERSION
  CHANGELOG.md
  catalog/                 # 生成物（B）：tokens.json / icons.json / primitives.json
  src/
    tokens/                # L0
      tokens.js            #   控件高度、间距、z 层、git 色、radius 别名 → 宿主令牌
      theme-scope.js       #   ThemeScope：body[data-ds-dark-theme] 与浮窗作用域
    safe/                  # L1
      primitives.js        #   带版本回退的 primitive 门面（替代各插件 ?? / ||）
      icons.js             #   图标门面：宿主图标优先，缺口用登记的 fallback SVG
    components/            # L2
      dialog.js menu.js toast.js tabs.js        # 现有，迁入
      icon-button.js toolbar.js field.js segmented.js badge.js status-chip.js
      empty-state.js confirm.js popover.js picker.js list-row.js floating-window.js
    dom/                   # DOM 适配
      mount.js             #   mountNano(Component, props, host) → {update, close, setTheme}
      dom.js               #   openNanoDialog/openNanoMenu 改为基于 mountNano
    styles.js              # NANO_STYLES，仅引用 L0 / 宿主真实令牌
  test/                    # 包内单测
docs/specs/dsh-nano-ui/DESIGN.md   # 唯一真源（A）
scripts/gen-primitives-exports.mjs # 扩展生成 catalog（B）
scripts/check-ui-rules.mjs         # warn-only 检测（D / §7）
```

硬切原则：现有 6 个导出名保持不变（它们是使用方已有的调用面），内部文件迁到 `components/` 与 `dom/`；不保留旧路径的兼容 re-export（包内私有路径无外部使用方）。

### 5.2 工作台账

| WL | 文件:行 | 动作 | 依赖 | 裁决 |
|---|---|---|---|---|
| WL-01 | `docs/specs/dsh-nano-ui/DESIGN.md`（新） | 写 UI 规格真源：分层、令牌表、组件表（宿主对应物/缺口理由）、豁免标记语法、主题与层级规则 | — | 待 [业主]：是否为唯一真源 |
| WL-02 | `packages/dsh-nano-ui/README.md` | 软链改指 DESIGN.md 或重写为入口页；删除「三个插件」过期描述 | WL-01 | — |
| WL-03 | `AGENTS.md`「核心工作原则」 | 新增一条「UI 归 nano-ui」 | WL-01 | **待 [业主]**：措辞（全仓规则） |
| WL-04 | `docs/agents/TEMPLATE.md` | 新增 UI 小节：先查 catalog → 用 nano-ui → 缺口登记豁免 | WL-01 | — |
| WL-05 | `scripts/gen-primitives-exports.mjs` | 扩展：从宿主 `dsh-client-ui-theme/lib/client.js` 抽 441 令牌名；从 primitives 抽导出与图标名；写 `packages/dsh-nano-ui/catalog/*.json` | — | — |
| WL-06 | `packages/dsh-nano-ui/src/styles.js:21,22,33,60,128,129` | 修 5 个未解析令牌，映射到宿主真实令牌（以 catalog 为准） | WL-05 | 可先行（独立修复） |
| WL-07 | `src/tokens/tokens.js`（新） | L0：控件高度（36/28/32）、间距阶梯、z 层（base/float/popover/dialog/toast）、git 色、radius 别名 | WL-05 | — |
| WL-08 | `src/tokens/theme-scope.js`（新） | ThemeScope：统一主题判定与浮窗作用域；吸收 `dom.js` 的 `setTheme` 与 [DNN] 55–63/93–94 | WL-07 | 待 [业主]：范围 |
| WL-09 | `src/safe/primitives.js`（新） | L1 门面：按 catalog 版本矩阵导出安全 primitive；吸收 [DNK] 1252–1280 回退链 | WL-05 | — |
| WL-10 | `src/safe/icons.js`（新） | 图标门面：宿主图标 + 登记 fallback（左右箭头、google 品牌等）；吸收 [DNK] 1243–1247、[DNN] 856–893 | WL-05 | — |
| WL-11 | `src/components/*`（迁移） | 现有 dialog/menu/toast/tabs 迁入；`menu.js` 评估复用宿主 `MenuSurface`/`MenuItemButton` | — | — |
| WL-12 | `src/components/icon-button.js`、`toolbar.js` | 宿主 Button 无 icon-only 的缺口补位 | WL-07,10 | — |
| WL-13 | `field.js`（Field/FieldRow） | 设置行；吸收 [DNN] 574 附近、[DNK] 设置页 | WL-07 | — |
| WL-14 | `segmented.js`、`badge.js`、`status-chip.js` | 透传宿主 SegmentedControl/Tag，加 tone 维度；git 状态用 L0 色 | WL-07 | — |
| WL-15 | `empty-state.js`、`confirm.js` | `NanoConfirm` 替代 `window.confirm`（[DNCS] ×3） | WL-11 | — |
| WL-16 | `popover.js`、`picker.js`、`list-row.js` | slash 菜单、最近地址等选择器；吸收 [DNN] 4185–4239 | WL-11 | — |
| WL-17 | `floating-window.js` | 浮窗外壳（拖拽、限位、主题、层级）；吸收 [DNN] 浮窗与 [DNT] floatbar | WL-07,08 | 待 [业主]：是否纳入本期 |
| WL-18 | `src/dom/mount.js`（新）+ `dom.js` | `mountNano` 通用 DOM 适配；`openNanoDialog/Menu` 改写在其上 | WL-11 | — |
| WL-19 | `packages/dsh-nano-ui/package.json` | 版本 → 0.2.0；`files` 加 `catalog`；peer primitives 下限按 catalog 最低版本 | WL-05 | — |
| WL-20 | `packages/dsh-nano-ui/CHANGELOG.md`（新） | 自 0.1.0 起补记 | — | — |
| WL-21 | `packages/dsh-nano-ui/test/*.test.mjs`（新） | 每个导出：渲染、主题切换、层级、DOM 适配卸载；迁入 [DNN] 3 个测试中属于 nano-ui 的断言 | WL-11..18 | — |
| WL-22 | `scripts/check-ui-rules.mjs`（新） | §7 检测，warn-only | WL-05 | — |
| WL-23 | `scripts/check-client-rules.mjs:31,124` | 规则 2 泛化到全部插件、支持命名空间 import；或并入 WL-22 | WL-22 | 待 [业主]：是否合并 |

插件迁移（每个插件一个 worktree、一次硬切，旧样式同提交删除）：

| WL | 插件 | 关键行 | 动作 |
|---|---|---|---|
| WL-P1 | [DNMS] | styles.js:106–109、139–143；CompactPanel.jsx:410–424；未用 Tooltip | Switch/Tag/NanoTabs；删除手写 |
| WL-P2 | [DNEE] | styles.js 23 死类、298–324；drawers.js:486–494/754–761/914–921；format.js | 删死类；NanoTabs；改用宿主 relativeTime/fileSizeText；git 色 → L0 |
| WL-P3 | [DNK] | index.js 1243–1280、1277、1647、1668、1995；47 个 button | 门面 + IconButton；补齐或删除未定义类 |
| WL-P4 | [DNT] | NanoTerm.jsx 94–105/126–131/151–153/162、550–557 | 删死 CSS；unicode → 已 import 的宿主图标 |
| WL-P5 | [DNCS] | window.confirm ×3；styles.js:20–31 | NanoConfirm；移除对 [DNMS] DOM 的感知（需 [业主] 裁决替代方案） |
| WL-P6 | [DNN] | panel.js:52–854、440–448、555–563、858–893、4185–4239、77–80/943–948/1105–1110 | 最大块：经 `mountNano` 渐进替换；ThemeScope + z 层 + FloatingWindow |

独立缺陷（**不并入 NUE**，各自单独修）：
- BUG-1 [DNK] `src/client/index.js:1848` `setDrag` 未定义。
- BUG-2 [DNMS] `src/client/styles.js:242` 缺 `/*`。
- BUG-3 [DNT] `filterQuery` 无效（NanoTerm.jsx:487、570）。
- BUG-4 [DNT] `AGENTS.md:53` 与 `package.json:32` 依赖描述矛盾。

---

## §6 Design guideline：提示词、框架、工作流、design skill 基座

### 6.1 设计框架（四问）

每个 UI 改动按顺序回答，前一问能回答就不进入下一问：

1. **宿主有没有？** 查 `catalog/primitives.json` 与 `catalog/icons.json`。有 → 直接用（经 L1 门面）。
2. **nano-ui 有没有？** 查 DESIGN.md 组件表。有 → 用。
3. **是不是通用缺口？** 两个以上插件会用 → 提 nano-ui 组件（先改 DESIGN.md，再实现）。
4. **是不是插件私有？** 只此一处 → 插件内实现，必须用 L0 令牌，并加豁免标记 `/* nano-ui-exempt: <缺口说明> */`。

永远不做：嫁接宿主 DOM（`:has()` 套宿主结构、`[class*=]`、哈希类发现）；猜令牌名；unicode 当图标；插件间通过 DOM 互相感知。

### 6.2 Design guideline 提示词（供 agent 与 skill 使用）

```text
你在为 [dsh] 插件写 UI。目标：看起来与 dsh 原生无法区分。
规则：
1. 尺寸、圆角、字号、颜色、阴影只能来自 dsh 宿主令牌（catalog/tokens.json）或 nano-ui L0 令牌；不得写裸色值或猜令牌名。
2. 控件优先级：宿主 primitive（经 nano-ui/safe）> nano-ui 组件 > 插件私有实现（需 nano-ui-exempt 标记）。
3. 图标只用宿主图标集或 nano-ui/safe/icons 登记的 fallback；不得用 unicode 字符或内联手绘 SVG。
4. 主题只经 ThemeScope 判定；层级只用 L0 z 层；不得硬编码 z-index。
5. 不得依赖宿主内部 DOM 结构或哈希类名；宿主组件改不了的，接受其行为或登记为宿主缺口。
6. 控件高度：主按钮 36、紧凑 28、输入 32；开关 36×20；图标 16（菜单槽）/20（工具栏）。
7. 弹层必须：Esc 关闭、外点关闭、焦点回到触发点、跟随所在区域主题。
输出：先列出用到的宿主/nano-ui 组件与令牌，再给代码；任何豁免写明缺口理由。
```

### 6.3 工作流

```
需求 ─▶ 四问选型 ─▶（缺口）改 DESIGN.md ─▶ nano-ui 实现 + 单测 ─▶ 插件接入
                                                   │
                    插件内实现 ◀─（私有）            ▼
                         │                 check-ui-rules（warn）
                         └──────────────▶  design skill 评审意见 ─▶ [业主] 视觉验收
```

- nano-ui 变更与插件变更**分提交**（解决 B8）；nano-ui 每次对外行为变更进 CHANGELOG 并升版本。
- 视觉验收以 [业主] 为准；skill 只给意见。

### 6.4 内部 design skill 基座

建议位置：`.agents/skills/dsh-nano-design/SKILL.md`（待 [业主] 确认 skill 存放位置惯例）。

内容结构：
1. **何时激活**：新增/修改插件浏览器 UI、评审 UI PR、迁移手绘控件。
2. **输入**：目标插件路径；可选改动 diff。
3. **步骤**：读 DESIGN.md → 读 catalog → 按四问审视改动 → 运行 `node scripts/check-ui-rules.mjs --plugin <name>`（可选）→ 产出评审。
4. **输出格式**：`docs/code-review/<月>/<插件>-ui-review.md` 或直接回复；分「偏离 / 缺口候选 / 认知错误 / 建议」四栏，每条带 `file:line`。
5. **边界**：不改代码，不阻塞发布，不替 [业主] 判定视觉。

---

## §7 设计接线测试与覆盖预警（仅 warn，非 release-gate）

### 7.1 定位

- **不是门禁**：退出码恒为 0（脚本自身异常除外）；不接入 `deploy-local`、不接入任何发布链；符合「不得过度仪式」。
- **触发方式**：手动 `node scripts/check-ui-rules.mjs [--plugin <name>] [--json]`；或由 design skill 第 3 步调用。
- **产物**：终端摘要 + 可选 JSON；skill 据此写评估意见。

### 7.2 检测项

| 规则 | 检测 | 来源 |
|---|---|---|
| U1 未解析令牌 | `var(--dsw-*)` / `var(--dsh-*)` 不在 `catalog/tokens.json` 且不在运行时白名单 | B3 |
| U2 手绘已有控件 | 类名或结构匹配 switch/tabs/tag/tooltip 模式，而宿主或 nano-ui 有对应物 | B2 |
| U3 原生按钮密度 | `<button` / `h('button'` 数量，对比 Button/IconButton 使用量 | §4.7 |
| U4 非宿主图标 | unicode 符号作为按钮内容、内联 `<svg>` 未经图标门面 | B9 |
| U5 宿主 DOM 嫁接 | `[class*=`、`:has(` 指向非本插件类、运行时扫描哈希类 | §4.8-3 |
| U6 硬编码 z / 主题 | 裸 `z-index` 数字、直接读 `data-ds-dark-theme` | R4 |
| U7 primitive 导出 | 具名与命名空间 import 均核对 catalog（泛化 check-client-rules 规则 2） | B7 |
| U8 死样式 | 样式串中定义但源码未引用的类 | §4.2/4.6 |
| U9 未定义类 | 源码引用但样式中未定义的本插件前缀类 | §4.5 |
| U10 豁免登记 | 统计 `nano-ui-exempt` 标记，列出缺口说明供 DESIGN.md 吸收 | §6.1 |

### 7.3 覆盖预警

- **nano-ui 覆盖率**：每个插件「宿主/nano-ui 控件数 ÷ 控件总数」，仅展示趋势，不设阈值。
- **nano-ui 包内覆盖**：每个导出是否有对应单测文件；缺失时 warn。
- **令牌健康度**：每插件未解析令牌数。

### 7.4 nano-ui 包内单测（WL-21）

| 测试 | 断言 |
|---|---|
| `dialog.test.mjs` | 渲染、className 透传、固定高度、危险样式 |
| `menu.test.mjs` | 分段、勾选、`direction:'up'`、限高 |
| `tabs.test.mjs` | DOM 与 React 两版行为一致 |
| `dom.test.mjs` | `mountNano` 挂载/更新/卸载无泄漏；`setTheme` |
| `theme-scope.test.mjs` | 宿主暗色切换与浮窗作用域 |
| `tokens.test.mjs` | `NANO_STYLES` 内所有 `var(--…)` 均在 catalog 或 L0 中 |
| `z-order.test.mjs` | 迁入 [DNN] `test/z-order.test.mjs` 的 nano-ui 部分 |

这些是包的正常单测，不是发布闸门。

---

## §8 NUE-1117 执行台账

分支建议：`.agents/worktrees/nue-1117-<阶段>`，每阶段合并后删除 worktree。

| 阶段 | 任务 | 交付 | 完成判据 | 前置 |
|---|---|---|---|---|
| P0 | QnA：§9 列出的裁决项 | `NUE-1117-qna.md` → `qna-truth` | [业主] 冻结 | — |
| P0′ | BUG-1..4 独立修复 | 各自小提交 | 复现消失 | 可与 P0 并行 |
| P1 | WL-01/02/04 真源与模板 | DESIGN.md、README、TEMPLATE | 文件存在且自洽 | P0 |
| P1 | WL-03 AGENTS.md 原则 | 一行规则 | [业主] 措辞落地 | P0 |
| P2 | WL-05 catalog 生成 | `catalog/*.json` | 令牌 441、导出 321、图标 202 与宿主一致 | P1 |
| P2 | WL-06 nano-ui 令牌修复 | styles.js | U1 对 nano-ui 为 0 | WL-05 |
| P3 | WL-07/08 L0 | tokens.js、theme-scope.js | 单测通过 | P2 |
| P3 | WL-09/10 L1 | safe/primitives.js、safe/icons.js | 单测通过 | P2 |
| P4 | WL-11..16、18 L2 + DOM 适配 | components/*、dom/mount.js | 单测通过；现有 6 导出行为不变（[DNN] 3 测试仍绿） | P3 |
| P4 | WL-17 FloatingWindow | floating-window.js | 视 [业主] 裁决 | P3 |
| P5 | WL-19/20/21 版本、changelog、包内测试 | 0.2.0 | `node --test packages/dsh-nano-ui/test` 通过 | P4 |
| P5 | WL-22/23 检测脚本 | check-ui-rules.mjs | 对全仓运行出报告，退出码 0 | P2 |
| P5 | design skill | SKILL.md | 可激活并产出评审 | WL-22 |
| P6 | WL-P1 [DNMS] | — | U1/U2 对 DNMS 下降至豁免内；GUI 验收 | P5 |
| P6 | WL-P2 [DNEE] | — | 同上 | P5 |
| P6 | WL-P4 [DNT] | — | 同上 | P5 |
| P6 | WL-P3 [DNK] | — | 同上 | P5 |
| P6 | WL-P5 [DNCS] | — | 同上；侧向 DOM 感知移除方案经 [业主] 裁决 | P5 |
| P7 | WL-P6 [DNN] | — | 最大块，分子阶段：令牌 → 开关/设置行 → 图标 → 菜单/tooltip → 浮窗 | P6 |

每个插件迁移的具体指令（统一模板）：
1. 在 worktree 中运行 `node scripts/check-ui-rules.mjs --plugin <name> --json`，保存为迁移前基线。
2. 按 §4 该插件台账逐行替换；同一提交删除被替换的样式与 glyph。
3. 无法替换的写 `nano-ui-exempt` 标记并说明缺口；缺口若两个插件以上出现，回到 P4 补组件。
4. 重建 `lib/client.js`（各包 AGENTS.md「构建」）；运行该插件既有测试。
5. 再跑检测，对比基线；在已安装 web profile 中做 GUI 验收（亮/暗两主题）。
6. 合并后删除 worktree。

---

## §9 Verdict

### 9.1 如何解决 [业主] 痛点

| 需求 | 解决机制 |
|---|---|
| R1 不像原生 | catalog 让令牌/图标可查；L0 只引真实令牌；U1/U4 持续暴露偏离 |
| R2 重复造 | L2 组件一次实现；§4.7 的 11 类模式各有归宿 |
| R3 不知道有什么 | DESIGN.md + catalog + design skill 三件套 |
| R4 改一处追多处 | ThemeScope、z 层、FloatingWindow 收口 |
| R5 修了又坏 | 包内单测 + 接线预警 |
| R6 不要仪式 | 检测 warn-only，不进发布链 |
| R7 长期治理 | 先真源再分层再迁移；插件整块硬切 |
| R8 平台中立 | 每个组件登记宿主对应物；嫁接宿主 DOM 列为反模式 |
| R9 设计方法 | §6 四问框架 + 提示词 + 工作流 + skill |

### 9.2 多维长期价值

- **一致性**：插件外观随宿主令牌演进自动对齐，而不是每次宿主改版逐个返工。
- **抗宿主漂移**：L1 门面与 catalog 生成把「宿主版本差异」集中到一处；消除各插件的 `??`/`||`。
- **新插件成本**：TEMPLATE + skill 让新插件第一天就走对路径。
- **可审计**：每个偏离都有 `file:line` 与豁免理由；缺口自然汇总为 nano-ui 的路线图。
- **体量**：预计删除手写样式数千行（[DNN] 约 800、[DNEE] 约 675 中大部分、[DNMS]/[DNT]/[DNK] 若干），nano-ui 增长有限。
- **风险**：最大风险是 [DNN] 的 DOM 字符串改造量，用 `mountNano` 渐进替换控制；其次是宿主 Modal/Tooltip/Toast 尚未解码，P2 需补齐。

### 9.3 待 [业主] 裁决（进入 QnA）

1. AGENTS.md 新原则「UI 归 nano-ui」的措辞，以及是否写入全仓原则。
2. DESIGN.md 是否作为 UI 唯一真源。
3. 插件迁移：每插件一次硬切，还是按规则逐条收紧（ratchet）。
4. FloatingWindow 与 ThemeScope 是否纳入本期。
5. BUG-1..4 是否按本文建议独立修复、先于 NUE。
6. `check-client-rules.mjs` 规则 2 是并入 `check-ui-rules.mjs` 还是原地泛化。
7. [DNCS] 对 [DNMS] DOM 的感知（styles.js:20–31）以什么替代：删除，还是登记为宿主缺口。
8. design skill 的存放位置与命名。
