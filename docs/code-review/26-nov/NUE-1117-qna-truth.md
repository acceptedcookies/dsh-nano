# NUE-1117 QnA Truth · 已冻结真相台账（nano-ui-enhancement）

> **范围**：只登记 [业主] 在 [NUE-1117-qna.md](NUE-1117-qna.md) 中已接受的 `T-O-NUE1117-B01`–`B04` 与 `T-O-NUE1117-01`–`14`，共 18 条。
> **性质**：`frozen-truth ledger / compact consumption entry`。问答是决策出处，本文不是第二真源；本文只做三件事：给每条真相钉上复核过的 `file:line` 证据，写出执行时必须遵守的推论，列出复核中发现的偏差。
> **复核基线**：`main` @ `5a41133`（2026-11-17）。宿主口径：`@deepseek-ai/dsh@0.2.2-rc.1` CLI 安装；primitives 导出快照 rc.1 = 311、rc.3 = 321（`dsh-nano-model-selector/test/primitives-exports.json`）；令牌来源 `dsh-client-ui-theme/lib/client.js`；组件签名从 `dsh-web-frontend/dist/assets/index-BgUyXZcc.js` 解码。
> **状态**：18 条全部 FROZEN。**冻结不是实施授权。** 复核发现的 3 项冲突（§7）已由 [业主] 于 2026-11-17 裁决，登记为 `12`–`14`。

---

## 0. 读法

1. 真相以问答 §1 为准；本文的「执行推论」只是把真相落到代码上的必然含义，不新增合同。
2. 「证据」一列全部在复核基线上重新读过；与初评不一致之处见 §5 勘误，以本文为准。
3. 「宿主原生」指宿主公开导出的 primitives、`theme` 等 Cordis 服务和 `dsh-client-ui-theme` 令牌。宿主哈希类名、portal 根节点结构、未导出的组件内部变量都不算原生接口。
4. 时点计数（行数、按钮数、令牌数）只描述基线事实，不是合同。

---

## 1. 状态总览

```
baseline     T-O-NUE1117-B01..B04   FROZEN（随问答冻结，2026-11-16）
foundational T-O-NUE1117-01..04     FROZEN（Round 1）
executional  T-O-NUE1117-05..11     FROZEN（Round 2–3）
review       T-O-NUE1117-12..14     FROZEN（Round 4，本文 §7 复核补充）
```

| 复核结论 | 条目 |
|---|---|
| 证据吻合，执行方案无需调整 | B01、B02、B03、B04、02、03、05、07、08、09、10 |
| 证据吻合，但执行时有必须写明的推论 | 01、04、06、11（见 §2 与 §4） |
| 与现有代码存在冲突，已补充裁决 | 01 / 11 与 nano-ui 自身的宿主 DOM 嫁接 → `12`；11 与 [DNMS] 区域测量 → `13`；[DNMS] Tooltip 参数缺陷 → `14`（已修复） |

---

## 2. 真相台账（含证据锚与执行推论）

| Truth-ID | 已锁定真相 | 复核证据（`5a41133`） | 执行推论 |
|---|---|---|---|
| `B01` | 阶段名 `NUE-1117`；初评是证据不是合同 | 初评 §0 | 初评的方案与清单要先经过本文 §5 勘误才可引用 |
| `B02` | 判据 = 仓根五原则 + 硬切、退役、平台中立、不耦合私域 | 仓根 `AGENTS.md`「核心工作原则」 | 每个工作项都要逐条对照（§6） |
| `B03` | 设计检测只给警告，不是发布闸门，可由 design skill 触发 | 初评 §7 | `check-ui-rules.mjs` 退出码恒为 0（脚本崩溃除外），不加入 `scripts/test-all.mjs:57-65` 的闸门列表 |
| `B04` | nano-ui 是构建期 `file:` 依赖，打进各插件 bundle | `dsh-nano-terminal/package.json:32`；各包 AGENTS「前置」 | nano-ui 升级不会影响尚未重建的插件。哪个插件打进了哪一版，只能从产物看出来，所以必须在产物里标出 nano-ui 版本（落实 `10`） |
| `01` | AGENTS 原则：宿主 primitive 优先，其次 nano-ui；两者都没有才在插件内实现并标 `nano-ui-exempt`；不得嫁接宿主内部 DOM | 嫁接现场：[DNEE] `styles.js:234-238`（`li[data-files-entry]:has(> div > div [data-status])`）；[DNCS] `section.js:36-39,59-61,164`，`styles.js:20-29`；[DNT] `NanoTerm.jsx:51-83`；[DNMS] `styles.js:229-234`；**nano-ui 自身** `dom.js:39-93` | ① 优先级同样约束 nano-ui：宿主已有的组件，nano-ui 只能包装，不能重画（§4.2）。② nano-ui 自身的嫁接也在禁止范围内（§7 A1）。③ 读取宿主组件的内部变量（如 `composer-model-*-display`、`session-list-edge-inset`）同样算嫁接 |
| `02` | `docs/specs/dsh-nano-ui/DESIGN.md` 为 UI 规格唯一真源 | 现有 `docs/specs/dsh-nano-ui/README.md`（115 行）已含排版令牌（`:66-78`）、弹层主题（`:80-102`）、弹层层级（`:104-115`）三项约定，但内容过期（`:3` 写「三个插件」，`:10` 日期 11-09，`:62` 把 primitives 称为「headless 无样式」，缺 NanoTabs/`region`/`className`）。`packages/dsh-nano-ui/README.md` 是指向它的软链 | 创建 DESIGN.md 时把 README 的三项约定迁入并改正，README 降为一页入口，不再保留独立条款，否则会有两份真源 |
| `03` | 每插件一次硬切，旧样式同提交删除 | 初评 §4 各插件台账 | 每个插件一个 worktree、一次合并；不留新旧两套样式 |
| `04` | ThemeScope、FloatingWindow、z 层令牌本期全做 | 宿主**没有** z 令牌，也没有 spacing 令牌（主题 437 个名字中均为 0）；宿主层级常量写死在哈希类中：Modal 根 1000、toast/portal 1100、`shell.overlay` 槽 20（[DNN] `panel.js:77-80,943-948,1105-1110`；规格 README `:106`）；宿主主题服务 `ctx.theme.getTheme().colorScheme` 已被 3 个插件各自封装（[DNK] `index.js:2140`，[DNEE] `index.js:66`，[DNN] `index.js:50`） | ① z 层令牌只能是 nano-ui 自有常量，以观测到的宿主层级为锚，并在 DESIGN.md 里登记为宿主缺口。② ThemeScope 读取宿主 `theme` 服务（由插件传入 `ctx.theme`），不读 `body[data-ds-dark-theme]`。③ 亮暗两套颜色值从 catalog 生成，不再手抄十六进制（[DNN] `panel.js:93-94` 的写法退役）。④ FloatingWindow 内的弹层不经宿主 body portal，由窗口自己的覆盖层承载（§4.3） |
| `05` | 新建只给警告的 `check-ui-rules.mjs`；`check-client-rules.mjs` 的导出检查扩展到全部插件、支持命名空间 import，保留退出语义 | `check-client-rules.mjs:31` 只设 [DNMS]；`:124` 只匹配具名 import；`test-all.mjs:59` 在闸门列表中 | 扩展时会暴露其他插件的既有问题，导致 `test-all` 变红。扩展规则与修复这些问题必须在同一提交完成，不得先合入一个必红的闸门 |
| `06` | [DNCS] 删除隐藏控件的样式段；[DNMS] 自己判断云会话；宿主权限/附件按钮登记为宿主缺口 | [DNCS] `styles.js:20-29`（`[class*="composerSeat"]`、`.nms-root`、`[data-nano-model-selector]` 和中英文 aria-label） | [DNMS] 判断云会话时只能用宿主会话元数据（`sessions` 服务），不能读 [DNCS] 写的 `html[data-dncs-cloud]`，否则只是把插件间感知换了个方向 |
| `07` | design skill 放在 `docs/agents/skills/dsh-nano-design/SKILL.md` | `docs/agents/` 目前只有 `TEMPLATE.md`；仓内其他 SKILL.md 在 `dsh-nano-kitesurf/skills/`，那是发布给会话 agent 的 | 该 skill 面向本仓开发 agent，不进任何插件的 `files` |
| `08` | catalog 生成后入库；[DNMS] 导出快照迁入，不留两份 | 快照 `dsh-nano-model-selector/test/primitives-exports.json`（来源 rc.1 CLI / rc.3 桌面 asar）；令牌提取口径不同会得到不同计数（初评写 441/439，本次正则得 437） | 生成脚本必须固定提取口径，并写入 `generated`/`sources` 元数据；`check-client-rules` 与 [DNMS] 测试同时改读 catalog |
| `09` | 迁移顺序 [DNMS] → [DNEE] → [DNT] → [DNK] → [DNCS] → [DNN] | 初评 §8 | 见 §6.2 与 PRE-1116 worktree 的先后关系 |
| `10` | nano-ui 升到 0.2.0 并补 CHANGELOG；nano-ui 与插件改动分开提交 | `packages/dsh-nano-ui/package.json` 版本 `0.1.0`，18 次提交从未变更 | nano-ui 导出 `VERSION` 并写进各插件产物；同一 worktree 里先提交 nano-ui，再提交插件 |
| `11` | [DNT] trajCls 改用 nano-ui `Toolbar`；[DNMS] 区域遮罩改用 nano-ui 对话框的区域选项（**已被 `13` 替代**），nano-ui 自己控制挂载层；[DNEE] `:has()` 逐条改用自有容器，改不了的登记为宿主缺口并删除；不留例外 | [DNT] `NanoTerm.jsx:51-56`（按 `--dsh-trajectory-toolbar-height` 反查哈希类）；[DNMS] `styles.js:229-234` 与 `index.jsx:94`（`document.querySelector('[data-conversation-region="chat"]')`）；nano-ui 已有 `region` 参数（`dialog.js:25-26,44`，`dom.js:44,68-90`），但它的实现方式正是修改宿主 Modal 的 portal 根节点 | 「nano-ui 自己控制挂载层」意味着带区域或主题作用域的对话框不能再包装宿主 `Modal`（宿主 `Modal` 永远 `createPortal(..., document.body)`，不接受容器参数）。具体承载方式由 `12` 确定，[DNMS] 部分由 `13` 改为主窗口级对话框 |
| `12` | 对话框拆成两种承载：主窗口级包装宿主 `Modal`；浮窗或区域内由 nano-ui 窗口覆盖层承载并接入 `useModalLayer`；`dom.js` 补丁、`theme`/`z` 参数、`--nano-dlg-*` 退役 | `dom.js:39-93`（MutationObserver + `card.parentElement` 改写宿主根节点）；宿主 `useModalLayer` 在 rc.1 与 rc.3 都有导出 | 见 §4.3。[DNN] 是唯一需要窗口覆盖层的现有使用方；规格 README `:80-115` 不迁入 DESIGN.md，直接退役 |
| `13` | [DNMS] 取消区域收束，历史对话框改为主窗口级 `Modal` | `index.jsx:94`；`styles.js:229-234`；`--nms-region-*` 变量 | [DNMS] 迁移时删除 `regionElement`、区域测量与 `body > div:has(> .nms-hist-dialog)`；包 AGENTS「三个必须遵守的呈现约束」第 1 条同步删除 |
| `14` | [DNMS] Tooltip 参数缺陷在 `main` 单独修复 | `AsyncStatusBadge.jsx:65` | 已修复：`3f43bf2`（DNMS 54 项单测通过） |

---

## 3. 证据复核结果

### 3.1 已逐行确认（与初评一致）

| 插件 | 证据 |
|---|---|
| nano-ui | 6 组导出 `index.js:1-6`；令牌错名 `styles.js:21,22`（`label-error`）、`:33`（`tooltip-label`）、`:60`（`danger`）、`:128,129`（`focus-ring`）；z 默认值 `styles.js:10`（菜单 30）、`:31`（toast 40）、`:39`（dialog-host 50） |
| [DNN] | `panel.js:37` 只引入 `Button`；`:52-854` 内联样式；`:77-80` 层级说明；`:93-94` 手抄亮暗色值；`:440-441` `np-switch`；`:556-557` 自绘 tooltip；`:574` 设置行；`:856-857` googleIcon/textIcon；`:886` PANEL_ICON；`:943-948`、`:1105-1110` 层级；`:2128-2132` 正确使用 NanoDialog；`:3840-3842` Button；`:4185` slash 菜单 |
| [DNEE] | `styles.js:1` 自有 Git 色板；`:234-238` 嫁接宿主文件树；`:298-324` `.nxe-menu*` 在源码中没有任何引用（死样式） |
| [DNMS] | `styles.js:106-109` `.nms-tag`；`:139-143` `.nms-switch`（36×20，与宿主 Switch 同尺寸）；`CompactPanel.jsx:410-413` 手写 tablist；`AsyncHistoryDialog.jsx:25` 引入 `Tooltip` 但未使用 |
| [DNCS] | `section.js:36-39` 合成哈希类；`:59-61`、`:164` `[class*=]` 查询；`styles.js:20-29`；`window.confirm` 3 处：`settings-dialog.js:133`、`native-workbench.js:123`、`index.js:125` |
| [DNK] | `index.js:1243-1244` 过期注释；`:1251-1278` 图标查找；`:1277`、`:1647`、`:1668`、`:1995` 未定义类；`:1848` 已修复（`60c3a4d`） |
| [DNT] | `NanoTerm.jsx:7` 引入 nano-ui；`:51-83` trajCls；`:94-96`、`:126-127`、`:151-153`、`:162` 死样式候选；`:550-557` unicode 图标；搜索框已修复（`5a41133`） |

### 3.2 已关闭

| 缺陷 | 修复提交 |
|---|---|
| [DNK] `setDrag` 未定义 | `60c3a4d` |
| [DNMS] `styles.js:242` 注释缺 `/*` | `fefd590` |
| [DNT] 窗格标题搜索不生效 | `5a41133` |
| [DNT] AGENTS 依赖描述矛盾 | `5a41133` |

---

## 4. dsh 原生接口与令牌对照（design 系统的准确基准）

### 4.1 令牌：错名 → 宿主真实名

宿主令牌只有 `--dsw-alias-*`、`--dsw-radius-*`、`--dsw-elevation-*`、`--dsw-font-*`、`--dsw-focus-ring-*` 和少量 `--dsh-*`，**没有 spacing 和 z 令牌**。

| 插件中出现的错名 | 宿主真实令牌 | 备注 |
|---|---|---|
| `label-error`、`danger`、`label-danger`、`fill-error` | `--dsw-alias-state-error-primary`（hover 底色 `--dsw-alias-interactive-bg-hover-danger`，次级 `state-error-secondary`） | nano-ui `styles.js:81-89` 已用对，`:21,22,60` 用错 |
| `warning`、`warn`、`fill-warning`、`state-warning-primary` | `--dsw-alias-state-warn-primary`（另有 `-secondary/-tertiary/-label`） | |
| `fill-success` | `--dsw-alias-state-success-primary` | |
| `state-info-primary` | `--dsw-alias-state-business-primary` | 宿主没有 info，语义近似，需视觉核对 |
| `focus-ring` | `--dsw-focus-ring-color` + `--dsw-focus-ring-width` | |
| `tooltip-label` | 无 | 宿主只有 `tooltip-bg`、`tooltip-key-bg`。tooltip 应直接用宿主 `Tooltip` 组件；toast 文字用 `--dsw-alias-label-primary-inverted`（需视觉核对） |
| `label-invert`、`label-inverted`、`label-on-color` | `--dsw-alias-label-primary-inverted` | |
| `label-quaternary` | 无；候选 `--dsw-alias-label-dimmed` 或 `--dsw-alias-label-caption` | 需视觉核对后在 DESIGN.md 定一个 |
| `bg-primary`、`bg-secondary`、`bg-l2` | `--dsw-alias-bg-layer-1` / `-layer-2` / `-layer-3` | |
| `border-primary`、`border-subtle` | `--dsw-alias-border-l1` … `-l4` | |
| `accent-primary`、`fill-brand` | `--dsw-alias-brand-primary` | |
| `link-hover` | 无；只有 `--dsw-alias-link` | |
| `radius-full` | 无 | nano-ui L0 自有常量 |
| `font-mono`、`font-family-mono`、`dsw-mono` | `--dsh-font-family-code`（[DNT] 现用的 `--ds-font-family-code` 也存在） | DESIGN.md 只选一个 |
| `elevation-raised` | `--dsw-elevation-soft` / `-panel` / `-prominent` | |
| `hairline` | `--dsh-hairline-width` | 由主题定义，不只是运行时变量（勘误 E10） |
| `composer-model-*-display`、`session-list-edge-inset` | 不是令牌，是宿主组件内部变量 | 依 `01` 不得依赖 |

### 4.2 组件：宿主已有 → nano-ui 只能包装

已从宿主产物解码签名。依 `01`，下表左列已有的，nano-ui 不再自绘。

| 需求 | 宿主导出与签名要点 | nano-ui 的角色 | 现状偏差 |
|---|---|---|---|
| 模态框 | `Modal({open,onClose,title,closeLabel,description,children,footer,className,contentClassName,headless,backdropBlur})`，固定 portal 到 `document.body`，内部调用 `useModalLayer` | 主窗口级对话框直接包装（`NanoDialog` 现状，`dialog.js:5`） | 区域或主题作用域的对话框见 §4.3 |
| 高风险确认 | `RiskConfirmation({open,title,description,acknowledgeLabel,acknowledged,onAcknowledgedChange,confirmLabel,cancelLabel,onConfirm,onCancel})` | 不可逆操作的确认直接用它；一般确认用 `NanoDialog danger` | [DNCS] 3 处 `window.confirm` |
| 弹层栈 | `useModalLayer(ref, open, onClose)`、`closeTopModal`、`isBehindModal`、`modalSelector`、`useDismissOnOutsidePointer`、`useAnchoredMaxHeight`、`usePointerGrace`（仅 rc.3）、`useAnchoredPosition`（仅 rc.1） | nano-ui 自有弹层必须接入这一套，让 Esc、焦点回收和「最上层先关」与宿主一致 | NanoMenu 自写键盘与点外关闭（`menu.js`） |
| 菜单 | `Menu({open,anchor,items,selectedId,onSelect,onClose,align,side,portal,dense,compact,selection,footer,className,listClassName,contextual})`、`MenuSurface`、`MenuGroup`、`MenuItemButton`（含 danger、分隔、快捷键） | `NanoMenu` 改为包装宿主 `Menu`；窗口内用 `portal:false` | 现 NanoMenu 自绘，z 默认 30，比宿主 Modal 的 1000 低，从对话框里打开会被遮住 |
| 页签 | `SegmentedControl({id,value,options,onChange,label,disabled})`、`SegmentedTabs({items,value,onChange,label,size})` | `NanoTabs` 改为用宿主页签条，nano-ui 只负责「面板常驻、只切显隐」 | `tabs.js:121-150` 自绘 `.nano-tab` |
| 提示 | `Toast({text,icon,tone,anchor,holdMs,actions,onDone})` | `NanoToast` 改为包装宿主 Toast | `toast.js` 自绘；初评提出的「交互式 Toast」不需要另做 |
| 悬浮说明 | `Tooltip({label,shortcutKeys,side,align,delayMs,portal,maxWidth,openOnClick,onlyWhenClipped,disabled})`，**没有 `content` 参数** | 直接用 | [DNN] 自绘 tooltip；[DNMS] 用错参数（§7 A3） |
| 开关 / 勾选 / 输入 | `Switch({checked,onChange(bool),label,disabled,title})`、`Checkbox({checked,onChange,label})`、`Input({icon,...})` | 直接用 | [DNN] `np-switch`；[DNMS] `nms-switch` |
| 按钮 | `Button({variant='ghost',size='md',icon,className,...})`，variant 为 primary/ghost/outline/toolbar，size 为 md/sm | `IconButton` 只是 `Button` 加 `icon`、无文字、必须带 `aria-label` 的薄包装 | 初评说宿主「无 icon-only」，不准确（勘误 E3） |
| 标签 / 状态 | `Tag({tone='outline'})`（已见 outline/neutral/quiet）、`StateDot({state,size,appearance})`、`Pill`、`ConnectionIndicator` | `StatusChip` 只组合这些 | [DNMS] `.nms-tag`；[DNEE] 自有色板 |
| 设置表单 | `SettingsForm`、`SettingsFormModel`（绑定宿主设置作用域）、`SettingsValueField`、`SettingsSecretField`、`settingsTextField`、`settingsNumberField` | `FieldRow` 优先复用 `SettingsValueField` 的展示结构；`SettingsFormModel` 绑定宿主设置存储，插件私有偏好不适用 | [DNN] `:574` 手写设置行 |
| 展开行 / 浮卡 / 快捷键 / 路径 | `DisclosureRow`、`HoverCard`、`ShortcutKeys`、`PathLabel`、`FileTypeIcon` | `ListRow`、`Popover`、键位提示直接复用 | |
| 工具函数 | `relativeTime`、`fileSizeText`、`writeClipboard`、`useClipboardCopy` | 直接用 | [DNEE] `format.js` 有自写的 `formatBytes`（KiB 单位）和相对时间分桶，迁移时要比对输出，不能直接替换 |
| 图标 | 202 个 `Icon*`（rc.3），含 `IconChevronLeft/Right*`；`ICON_SYMBOLS` 与 ui-theme 维护的 sprite `#dsw-icon-<glyph>-<weight>` | L1 图标层：React 用 `Icon*`，DOM 字符串用 sprite `<use>`（[DNN] `panel.js:861` 的 `dshIcon` 已是这种原生做法） | [DNK] `:1243-1247` 自绘箭头没有必要 |

**宿主确实没有、nano-ui 需要自己提供的**：`Toolbar`（宿主 TrajectoryToolbar 未导出）、`EmptyState`、`FloatingWindow`、窗口级覆盖层（§4.3）、z 层与间距常量、ThemeScope、DOM 适配 `mountNano`。初评 §5 的 L2 清单按此收窄。

### 4.3 弹层承载模型（落实 `04` 与 `11`）

| 场景 | 承载方式 | 依据 |
|---|---|---|
| 主窗口级对话框 | 宿主 `Modal`（portal 到 body，z 1000） | 原生行为 |
| 浮窗或区域内的对话框 | nano-ui 窗口覆盖层：在拥有者容器内渲染遮罩与卡片，接入宿主 `useModalLayer`，按钮用宿主 `Button`，颜色只用令牌 | `11`「nano-ui 自己控制挂载层」；宿主 `Modal` 不接受容器参数 |
| 菜单 | 宿主 `Menu`；主窗口级 `portal:true`，窗口内 `portal:false` | 窗口内渲染自然继承窗口的主题和层级，不需要 `theme`/`z` 补丁 |
| Toast | 宿主 `Toast`（`anchor` 指向拥有者元素） | |

这个模型可以同时淘汰 `dom.js:39-93` 的 MutationObserver 补丁、`--nano-dlg-*` 文档级变量，以及规格 README `:80-115` 的「主题 / 层级契约」。

---

## 5. 初评勘误

| # | 初评原表述 | 复核事实 |
|---|---|---|
| E1 | 「无 UI 规格，契约只在提交说明里」 | 有 `docs/specs/dsh-nano-ui/README.md`，含三项约定，但内容过期且有错（见 `02`） |
| E2 | NanoDialog 包装 primitives `Dialog` | 包装的是 `Modal`（`dialog.js:5`）；宿主没有 `Dialog` 导出 |
| E3 | 宿主 Button 无 icon-only | `Button` 有 `icon` 参数，可以只放图标 |
| E4 | L2 需要「交互式 Toast」 | 宿主 `Toast` 已支持 `actions`、`anchor`、`tone` |
| E5 | L2 需新建约 13 个组件 | 宿主已有 Menu、Toast、Switch、RiskConfirmation、SettingsValueField、HoverCard、DisclosureRow、ShortcutKeys；nano-ui 真正要新建的见 §4.2 末段 |
| E6 | [DNK] 注释可能有误 | 已确认：宿主有 `IconChevronLeft/RightOutline{Regular,Medium}` |
| E7 | [DNN] 21 个手绘图标（含 `dshIcon`） | `dshIcon`（`panel.js:858-884`）引用 ui-theme sprite，属原生；手绘的是 `googleIcon`（`:856,877-881`）、`textIcon`（`:857`）、`PANEL_ICON`（`:886`）、窗口按钮（`:887` 起） |
| E8 | [DNEE] 手绘页签 | `drawers.js:486,754,914` 用的是宿主 `Button` 切换 primary/outline 来充当页签，属于误用，不是手绘按钮 |
| E9 | [DNMS] 未使用的 Tooltip | 位置是 `AsyncHistoryDialog.jsx:25`；另发现 `AsyncStatusBadge.jsx:65` 传了不存在的 `content` 参数（§7 A3） |
| E10 | `--dsh-hairline-width` 只在运行时设置 | 主题文件中有定义 |
| E11 | 宿主令牌 441 / 439 个 | 取决于提取口径；本次正则得 437 个。以 catalog 生成脚本的固定口径为准 |
| E12 | 嫁接清单只列插件 | 漏了 nano-ui 自身：`dom.js:39-93` 通过 `card.parentElement` 改写宿主 Modal 根节点的位置、z-index、主题属性 |
| E13 | [DNEE] 复刻了 `fileSizeText`/`relativeTime` | 名字不同，是语义重叠（`formatBytes` 用 KiB），需要比对输出 |
| E14 | nano-ui 层级只提到 [DNN] 硬编码 | nano-ui 默认值本身有缺陷：菜单 30 低于宿主 Modal 1000，在对话框里打开菜单会被遮住 |

---

## 6. 原则与 worktree 符合性

### 6.1 仓根原则

| 原则 | 结论 | 说明 |
|---|---|---|
| 插件中立 | 符合 | 全部方案只依赖宿主公开导出、`theme` 服务和令牌；不涉及 [dsh-mini] 与 [nano-agent] |
| 上层建筑归 host | 符合（需执行推论） | 宿主改不了的（云会话 composer 按钮、z 令牌、区域 API）登记为宿主缺口，插件不补 |
| 不得侧载 | 符合 | `06` 消除 [DNCS]→[DNMS] 的 DOM 感知；[DNMS] 不得改读 `html[data-dncs-cloud]` |
| 单一真源 | 符合（需执行推论） | DESIGN.md 吸收规格 README（`02`）；catalog 取代 [DNMS] 快照（`08`）；ThemeScope 取代 3 个插件各自的 `schemeOf` |
| 不得擅自扩约 | 符合 | AGENTS 新原则由 [业主] 在 `01` 登记；§7 三项已登记为 `12`–`14` |
| 不得过度仪式 | 符合 | UI 检测只给警告（B03）；`check-client-rules` 是既有闸门，扩展时修完再合入（`05` 推论） |

### 6.2 worktree

| 要求 | 执行方式 |
|---|---|
| 位置 | 只在 `.agents/worktrees/` |
| 分支名 | 用语义命名：`nue-1117-foundation`（DESIGN.md、AGENTS、TEMPLATE、skill）、`nue-1117-catalog`、`nue-1117-nano-ui`（L0/L1/L2、测试、0.2.0），插件迁移各一个，如 `nue-1117-migrate-dnms` |
| 提交顺序 | 同一 worktree 内先提交 nano-ui，再提交插件（`10`）；每个插件迁移一个 worktree、一次合并（`03`） |
| 收尾 | 合并后按 [业主] 要求删除 worktree |
| 与在途工作的关系 | 现有 `.agents/worktrees/facade-observe-binding-v2`（PRE-1116，82 个文件，含 [DNN]/[DNT] 的 `lib/` 与构建脚本）和 `dnls-observe-pty` 不由本阶段跟进。插件迁移 worktree 应在 PRE-1116 合入 `main` 之后再从 `main` 切出；`lib/client.js` 冲突一律重新构建，不手工合并 |

---

## 7. 复核补充裁决（已由 [业主] 于 2026-11-17 裁决）

以下保留题面供回溯；裁决结果见 §2 的 `12`–`14`。A1 → `12`（拆成两种承载），A2 → `13`（改为主窗口级），A3 → `14`（已修复 `3f43bf2`）。

| # | 事项 | 冲突 | 建议 |
|---|---|---|---|
| A1 | nano-ui 自身的宿主 DOM 嫁接 | `01` 禁止嫁接，`11` 要求 nano-ui 自控挂载层；但现有 `openNanoDialog`（`dom.js:39-93`）正是通过 `parentElement` 改写宿主 Modal 根节点，[DNN] 全部对话框依赖它 | 按 §4.3 拆成两条路径：主窗口级对话框继续包装宿主 `Modal`；浮窗或区域内的对话框由 nano-ui 窗口覆盖层承载（接入 `useModalLayer`）。MutationObserver 补丁、`theme`/`z` 参数和 `--nano-dlg-*` 一起退役 |
| A2 | [DNMS] 区域测量依赖宿主 DOM | `index.jsx:94` 用 `document.querySelector('[data-conversation-region="chat"]')` 取对话区矩形；宿主没有公开的区域 API | 二选一：(a) 视为宿主缺口，保留这一处只读查询，在 DESIGN.md 登记为唯一例外；(b) 取消区域收束，历史对话框改为主窗口级 `Modal`。建议 (b)，与 `01`「不留例外」一致 |
| A3 | [DNMS] 状态徽标悬停说明从不显示 | `AsyncStatusBadge.jsx:65` 传 `{ content: badge.tooltip }`，宿主 `Tooltip` 只认 `label`。包 AGENTS 写明「悬停给出摘要模型与指纹」，实际不生效 | 与上次 4 个缺陷一样，在 `main` 上单独修复，不并入 NUE |

---

## 8. 下游消费

- `NUE-1117-action-plan.md` 只能引用本文 §2 的 Truth-ID 作为方向依据，工作项须用 §4 的宿主对照、§5 勘误后的事实。
- 初评 §5 工作台账需按 §4.2 收窄：WL-11 改为「包装宿主组件」，WL-12/14/15/16 大部分改为薄包装，WL-17 与窗口覆盖层合并，新增「退役 `dom.js` 补丁」与「nano-ui 产物版本标记」两项。
