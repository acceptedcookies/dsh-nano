# dsh-nano-ui DESIGN

> 本文是 [dsh-nano] 浏览器 UI 的唯一规格（`T-O-NUE1117-02`）。`README.md` 只是入口页；包 `AGENTS.md`、`INTRODUCTION.md` 只描述用法并链接到这里，不复制条款。
> 依据：`docs/code-review/26-nov/NUE-1117-qna-truth.md`（Truth-ID 简写 `T01`…`T17`、`TB01`…`TB04`）。规则与真相层冲突时以真相层为准。
> 宿主口径：`@deepseek-ai/dsh@0.2.2-rc.1`。令牌、图标、导出以 `packages/dsh-nano-ui/catalog/*.json` 为准（由 `scripts/gen-nano-catalog.mjs` 生成，不手改）。
> nano-ui 版本与变更：[`packages/dsh-nano-ui/CHANGELOG.md`](../../../packages/dsh-nano-ui/CHANGELOG.md)。

## 1. 优先级与豁免

每个 UI 改动按顺序回答，前一问能回答就停（`T01`）：

1. **宿主有没有？** 查 `catalog/primitives.json` 与 `catalog/icons.json`。有就直接用宿主 primitive。
2. **nano-ui 有没有？** 查 §6 组件清单。有就用 nano-ui。
3. **是不是通用缺口？** 两个以上插件会用：先改本文，再在 nano-ui 里实现。
4. **只此一处？** 在插件内实现，只用 §2 令牌，并在实现处加豁免标记：

```css
/* nano-ui-exempt: <宿主或 nano-ui 缺的是什么> */
```

同一约束作用于 nano-ui 自身：宿主已有的组件，nano-ui 只能包装，不能重画。

**永远不做**（`T01`、`T12`）：

- 嫁接宿主内部 DOM：`[class*=…]`、`:has()` 套宿主结构、运行时扫描或合成宿主哈希类、改写宿主 portal 根节点。
- 读取宿主组件内部变量（如 `composer-model-*-display`、`session-list-edge-inset`、`--dsh-trajectory-toolbar-height`）。
- 猜令牌名、写十六进制色值、用 unicode 字符当图标。
- 插件之间通过 DOM 属性互相感知（如读别的插件写在 `<html>` 上的标记）。

宿主改不了的，接受宿主行为或登记到 §8 宿主缺口；插件不补（truth §6.1）。

## 2. 令牌

宿主令牌只有 `--dsw-alias-*`、`--dsw-radius-*`、`--dsw-elevation-*`、`--dsw-font-*`、`--dsw-focus-ring-*` 与少量 `--dsh-*`。**没有 spacing 和层级令牌**（见 §4、§8）。

| 用途 | 宿主令牌 | 不要写 |
|---|---|---|
| 错误 / 危险 | `--dsw-alias-state-error-primary`；hover 底色 `--dsw-alias-interactive-bg-hover-danger`；次级 `--dsw-alias-state-error-secondary` | `label-error`、`danger`、`label-danger`、`fill-error` |
| 警告 | `--dsw-alias-state-warn-primary`（另有 `-secondary`/`-tertiary`/`-label`） | `warning`、`warn`、`fill-warning`、`state-warning-primary` |
| 成功 | `--dsw-alias-state-success-primary` | `fill-success` |
| 信息 | `--dsw-alias-state-business-primary`（宿主没有 info，语义近似；**待视觉核对**） | `state-info-primary` |
| 焦点环 | `--dsw-focus-ring-color` + `--dsw-focus-ring-width` | `focus-ring` |
| 反色文字（含 Toast 文字） | `--dsw-alias-label-primary-inverted`（Toast 文字用法**待视觉核对**） | `label-invert`、`label-inverted`、`label-on-color`、`tooltip-label` |
| 第四级文字 | 宿主没有 quaternary；候选 `--dsw-alias-label-dimmed` / `--dsw-alias-label-caption`（**待视觉核对**后定一个） | `label-quaternary` |
| 文字 | `--dsw-alias-label-primary` / `-secondary` / `-tertiary` | — |
| 背景层 | `--dsw-alias-bg-layer-1` / `-layer-2` / `-layer-3` | `bg-primary`、`bg-secondary`、`bg-l2` |
| 描边 | `--dsw-alias-border-l1` … `-l4` | `border-primary`、`border-subtle` |
| 品牌色 | `--dsw-alias-brand-primary` | `accent-primary`、`fill-brand` |
| 链接 | `--dsw-alias-link`（宿主没有 hover 变体） | `link-hover` |
| 交互底色 | `--dsw-alias-interactive-bg-hover` | — |
| 阴影 | `--dsw-elevation-soft` / `-panel` / `-prominent` | `elevation-raised` |
| 圆角 | `--dsw-radius-*`；全圆角是 nano-ui 自有常量（宿主没有 `radius-full`） | `radius-full` |
| 细线 | `--dsh-hairline-width`（主题文件定义） | `hairline` |

**字体**：等宽只用 `--dsh-font-family-code`。不写 `font-mono`、`font-family-mono`、`dsw-mono`、`--ds-font-family-code`。

**排版令牌（nano-ui 自有）**：拥有者可在自己的根节点声明下列可选属性，重定 nano-ui 在其容器内渲染的菜单、对话框、页签的排版。窗口覆盖层与 `portal:false` 菜单是容器的后代，自然继承；主窗口级弹层（宿主 `Modal`、`portal:true` 的宿主 `Menu`）跟随宿主排版，不承接插件排版令牌。

| 令牌 | 作用 |
|---|---|
| `--nano-font-family` | 字体族 |
| `--nano-font-size` | 正文与对话框内按钮字号 |
| `--nano-line-height` | 行高 |
| `--nano-title-size` | 对话框标题字号 |
| `--nano-desc-size` | 对话框描述与错误行字号 |

## 3. 主题

- 判定只经 nano-ui `ThemeScope`（`createThemeScope({ theme, element, pin, subscribe })`），`theme` 是插件拿到的宿主 `ctx.theme` 服务（`T04`）。返回 `{ scheme, refresh, setPin, dispose }`。
- `resolveScheme({ pin, theme })`：`pin` 为 `light`/`dark` 时用 `pin`；否则读 `theme.getTheme()` 快照的方案（宿主快照的方案字段在 `active.colorScheme`，扁平的 `colorScheme` 同样读取），非 `light` 一律 `dark`；`getTheme` 缺失或抛错 → `dark`。
- 宿主主题服务没有订阅接口，变化只经 `theme/change` 事件：传 `subscribe: listener => ctx.on('theme/change', listener)`，`dispose()` 时一并解除；不传则由调用方在变化时调用 `refresh()`。`pin` 变化用 `setPin()`，不重建。
- `ThemeScope` 在拥有者元素上写 `data-nano-scheme`；`pin` 与宿主不同时，把该 scheme 的 `--dsw-*` 值（`catalog/tokens.json` 的 `schemes`，已解析的终值）以内联自定义属性注入该元素；`dispose()` 移除属性与全部注入值。插件源码不写亮暗两套色值。
- 不读 `body[data-ds-dark-theme]`，插件不再各写一份 `schemeOf`。

## 4. 层级与间距

宿主没有层级令牌。nano-ui 的层级常量全部在 `packages/dsh-nano-ui/src/layers.js`（`NANO_LAYER`），以观测到的宿主层级为锚；插件与 nano-ui 其他源码不写数字层级。

| 名称 | 值 | 锚 |
|---|---|---|
| `shellSlot` | 20 | 宿主 `shell.overlay` 槽（观测值） |
| `hostModal` | 1000 | 宿主 Modal 根（观测值） |
| `hostPortal` | 1100 | 宿主 Toast / portal 带（观测值） |
| `menu` | 1100 | nano-ui 自有弹层与宿主 portal 同带，高于宿主 Modal |
| `window` | 1200 | 浮窗层（[DNN] `.np-layer`） |
| `windowRaised` | 1210 | 浮窗之上的同窗附属层 |
| `overlay` | 10 | 窗口覆盖层在其容器内的相对层级 |

间距刻度（nano-ui 自有，`layers.js` 导出并生成 `--nano-space-1` … `--nano-space-6`）：4 / 8 / 12 / 16 / 20 / 24 px。

## 5. 弹层承载模型

| 场景 | 承载 | 说明 |
|---|---|---|
| 主窗口级对话框 | 宿主 `Modal`（portal 到 `document.body`，层级 1000） | nano-ui `NanoDialog` 直接包装；`openNanoDialog` 不传 `container` 时走这条 |
| 浮窗或区域内的对话框 | nano-ui 窗口覆盖层：在拥有者 `container` 内渲染遮罩与卡片，接入宿主 `useModalLayer` | `openNanoDialog({ container })`；`container` 缺失或已脱离文档时抛错，不退回 body |
| 菜单 | 宿主 `Menu`；主窗口级 `portal:true`，窗口内 `portal:false` | 窗口内渲染继承窗口的主题与层级，不需要任何主题或层级参数 |
| Toast | 宿主 `Toast` | 寿命由宿主 `holdMs` 决定，见 §7 |

只有这两种对话框承载，没有第三种。窗口覆盖层：遮罩相对容器 `inset:0`；覆盖层自身 `pointer-events:auto`；Esc 只关最上层（`useModalLayer` 提供）；关闭后焦点回到打开前的元素；同一容器连续打开两层时后进先出。

## 6. 组件清单

### 6.1 宿主直接用

| 需求 | 宿主导出 | 要点 |
|---|---|---|
| 高风险确认 | `RiskConfirmation` | 不可逆操作；未勾选确认时确认按钮禁用 |
| 弹层栈 | `useModalLayer`、`closeTopModal`、`isBehindModal`、`useDismissOnOutsidePointer`、`useAnchoredMaxHeight` | nano-ui 自有弹层必须接入 |
| 页签条 | `SegmentedControl`（`SegmentedTabs` 为备选） | 选型依据 [DNMS] 包 AGENTS 呈现约束；视觉核对不过才换 `SegmentedTabs` |
| 悬浮说明 | `Tooltip` | 参数是 `label`，没有 `content` |
| 开关 / 勾选 / 输入 | `Switch`、`Checkbox`、`Input` | `Switch` 的 `onChange` 收布尔值 |
| 按钮 | `Button` | variant：primary / ghost / outline / toolbar；size：md / sm；`icon` 参数可只放图标 |
| 标签 / 状态 | `Tag`、`StateDot`、`Pill`、`ConnectionIndicator` | — |
| 设置表单 | `SettingsValueField`、`SettingsSecretField`、`SettingsForm`、`SettingsFormModel` | `SettingsFormModel` 绑定宿主设置存储，插件私有偏好不适用 |
| 展开行 / 浮卡 / 快捷键 / 路径 | `DisclosureRow`、`HoverCard`、`ShortcutKeys`、`PathLabel`、`FileTypeIcon` | — |
| 工具函数 | `relativeTime`、`fileSizeText`、`writeClipboard`、`useClipboardCopy` | 替换自写实现前先比对输出 |
| 图标 | `Icon*`（React）；ui-theme sprite `#dsw-icon-<glyph>-<weight>`（DOM） | 经 nano-ui 图标门面 |

### 6.2 nano-ui 包装宿主

| nano-ui | 包装的宿主组件 | 契约 |
|---|---|---|
| `NanoDialog` | `Modal` | 主窗口级；默认 Cancel / Confirm 两键；`danger` 描边红字；尺寸只有预设（§7 Modal） |
| `openNanoDialog` | `Modal` 或窗口覆盖层 | 有 `container` → 窗口覆盖层；否则主窗口级 |
| `NanoMenu` | `Menu` | `{ menu, actions, onClose, width, maxHeight, portal, direction }`；`portal`（默认）时 `menu` 是视口矩形，经 `getAnchorRect` 定位；`portal:false` 时 `menu` 是相对最近定位祖先的偏移。行 `{ id, label, icon, tone:'danger', disabled, separator, run }` 映射宿主项；选中先 `onClose` 再 `run`。`width` 是最小宽度；`maxHeight` 取不大于它的最大预设档（120/160/200/240/320/400/480，**待视觉核对**能否压过宿主列表自身上限） |
| `openNanoMenu` | `Menu` | `{ anchor, items, width, maxHeight, gap, direction, container }`；`direction:'up'` 映射宿主 `side:'top'`；有 `container`（须是定位祖先）时在其内挂载、`portal:false`，否则 `portal:true`；`gap` 超出宿主固定 4px 的部分并入锚矩形 |
| `NanoToast` | `Toast` | `{ text, anchor, tone, icon, actions, holdMs, onDone }`；`text` 为空不渲染；`text` 变化以 `text` 作 key 重挂；未传 `onDone` 时给空函数（宿主要求必填） |
| `NanoTabs` / `nanoTabs` | `SegmentedControl` | nano-ui 只负责「面板常驻、只切 `hidden`」；`nanoTabs` 返回 `{ el, select, value }` |

### 6.3 nano-ui 自建（宿主没有）

| nano-ui | 说明 |
|---|---|
| 窗口覆盖层（`NanoWindowDialog`） | §5 |
| `Toolbar` | 宿主 TrajectoryToolbar 未导出 |
| `EmptyState` | 空态 |
| `FloatingWindow` | 拥有覆盖层容器与 ThemeScope 的窗口外壳 |
| `IconButton` | `Button` + `icon`，无文字，`aria-label` 必填 |
| `mountNano(el, Component, props)` | DOM 代码挂 React 组件，返回 `{ update, unmount }` |
| `createThemeScope` / `resolveScheme` | §3 |
| `NANO_LAYER` 与间距刻度 | §4 |
| `icon(name)` / `iconMarkup(glyph, weight)` | 图标门面，名称对 catalog 校验 |
| `VERSION` | 产物里以 `dsh-nano-ui@<版本>` 注释出现，可检索 |

## 7. 宿主接口（解码结论）

从 `dsh-web-frontend/dist/assets/index-BgUyXZcc.js`（rc.1）解码，供 nano-ui 实现引用：

| 宿主组件 | 结论 |
|---|---|
| `Menu` | `anchor` 是 **ReactNode**（触发元素），渲染在 Menu 自己的根 `<span>` 内；矩形定位用 `getAnchorRect: () => DOMRect`，配合 `portal:true`。`portal` 默认 `false`，此时列表相对根 span 以 CSS 定位（`side:'top'`、`align:'end'` 改方向）。项：`{ id, label, icon, danger, disabled, shortcut, submenu }`，分隔 `{ type:'separator', id }`，组标题 `{ type:'label', id, text }`。选中触发 `onSelect(id)`，**不会自己关闭**；Esc 与外部 `pointerdown` 触发 `onClose` |
| `Toast` | `{ text, icon, tone, anchor, holdMs = 3000, actions, onDone }`。`anchor` 可省（省略时不做水平定位）；`onDone` **必填**，在 `holdMs + 1000ms` 后被调用；没有「不自动结束」。nano-ui 契约：寿命由调用方 `holdMs` 决定，`text` 变化时以 `text` 作 key 重挂 |
| `Modal` | 只接受 `className`/`contentClassName`，卡片宽度由宿主写死为 `min(380px, 100%)`，不随内容收缩；根层级 1000；内部调用 `useModalLayer`。主窗口级对话框的宽度因此只能用 nano-ui 预设类（380 / 480 / 560 / 720，`nano-dialog-w-<档>`），数值参数取不小于它的最近一档；高度施加在 nano-ui 自己渲染的正文元素上：`fixedHeight` 取不小于它的最近一档（480 / 560 / 640）减去宿主卡片框架 136px，`maxHeight` 减去同一框架值作正文上限 |
| `useModalLayer(ref, open, onClose)` | 维护文档级弹层栈：Esc 只关栈顶、Tab 焦点圈在栈顶内、关闭后焦点回到打开前元素；`isBehindModal(el)` 对不在栈顶内的元素返回 `true`（窗口覆盖层下层的元素因此被视为「在弹层之后」） |
| `SegmentedControl` | `{ id, value, options: [{ value, label, disabled, title }], onChange, label, disabled, className }`，内部处理方向键 |
| `RiskConfirmation` | `{ open, title, description, acknowledgeLabel, acknowledged, onAcknowledgedChange, confirmLabel, cancelLabel, closeLabel, onConfirm, onCancel, disabled }`；`!acknowledged` 时确认按钮禁用 |
| `Switch` | `{ checked, onChange(bool), label, disabled, title }` |

## 8. 宿主缺口

宿主缺的能力在这里登记；插件不补，等宿主提供后再迁移。

| 缺口 | 现状 | 影响 |
|---|---|---|
| 层级令牌 | 宿主层级写死在哈希类里（1000 / 1100 / 20） | nano-ui 自有 `NANO_LAYER`（§4） |
| spacing 令牌 | 宿主没有 | nano-ui 自有间距刻度（§4） |
| 区域 API | 宿主没有公开的对话区 / 工作区矩形 | [DNMS] 历史对话框改主窗口级（`T13`） |
| TrajectoryToolbar 导出 | 宿主未导出 | nano-ui `Toolbar` 替代（`T11`） |
| 云会话 composer 按钮 | 宿主不提供「云会话下隐藏权限/附件按钮」的开关 | [DNCS] `styles.js` 里 `html[data-dncs-cloud="1"] [class*="composerSeat"] …` 隐藏段已删除，按钮照常显示（`T06`） |
| 云会话标识 | 宿主 composer 没有给插件放会话来源标识的挂载点 | [DNCS] composer 嫁接整段与 `.dncs-devin-chip` 已删除，不另找挂载点（`T17`） |
| 侧栏小节外壳 | `sidebar.workspaces` 是单座 slot，宿主不提供「侧栏分区」外壳组件，也不公开列表几何变量（`--dsh-session-list-*` 属内部实现） | [DNCS] 只按 slot 属性插入自有小节，标题行、行高与折叠态用令牌与 `--nano-space-*` 自绘；折叠态取自自有 host 宽度，展开走宿主 `ctx.layout.toggleSidebar`；与原生「工作区」的像素对齐无法保证（`T23`） |
| 文件树状态钩子 | 宿主文件树行不接受插件着色，也不接受插件改写行几何（chevron 槽位、accessory 列宽） | [DNEE] 行着色、幽灵行删除线、行内边距与 chevron 全部删除，状态只剩 accessory 上的字母与圆点（`T11`） |
| Modal 尺寸参数 | 宿主 `Modal` 卡片宽度写死，不接受尺寸参数 | 主窗口级对话框只有预设尺寸（§7） |

## 9. 检测规则

`node scripts/check-ui-rules.mjs [--plugin <name>] [--json]` 输出警告，**退出码恒为 0**（脚本异常除外），不进 `scripts/test-all.mjs` 闸门（`TB03`）。扫描范围：六个使用方（[DNMS]、[DNEE]、[DNT]、[DNK]、[DNCS]、[DNN]）的 `src/client/**` 与 `packages/dsh-nano-ui/src/**`。

| 规则 | 检测 |
|---|---|
| U1 未解析令牌 | `var(--dsw-*)` / `var(--dsh-*)` 不在 `catalog/tokens.json`（运行时白名单除外） |
| U2 手绘已有控件 | 类名匹配 switch / tabs / tag / tooltip / toast / menu 模式，而宿主或 nano-ui 有对应物 |
| U3 原生按钮密度 | `<button` / `h('button'` / `createElement('button'` 的数量 |
| U4 非宿主图标 | unicode 符号当按钮内容；内联 `<svg>` 未经图标门面 |
| U5 宿主 DOM 嫁接 | `[class*=`、`:has(` 指向非本插件类、运行时扫描哈希类 |
| U6 硬编码层级 / 主题 | 数字层级（不在 `layers.js`）、读 `data-ds-dark-theme`、自写 `schemeOf` |
| U7 primitive 导出 | 见 `scripts/check-client-rules.mjs` 规则 2（闸门，非本脚本） |
| U8 死样式 | 样式串中定义、源码未引用的本插件前缀类 |
| U9 未定义类 | 源码引用、样式中未定义的本插件前缀类 |
| U10 豁免登记 | 统计 `nano-ui-exempt` 标记；每条须在 §10 有说明 |

## 10. 豁免登记

`nano-ui-exempt` 标记的说明。每条标记在这里有一行；`check-ui-rules --json` 的 U10 输出与本表条数相等。

| 位置 | 缺口说明 |
|---|---|
| `dsh-nano-model-selector/src/client/styles.js`（`.nms-trigger-label` / `.nms-trigger-effort` / `.nms-trigger-icon`） | 读 `--dsh-composer-model-text-display` / `--dsh-composer-model-icon-display`：宿主 `conversation.input.model` 槽位合同变量（`dsh-client-ui-conversation` `slots.d.ts`），不是 `--dsw` 令牌，catalog 不收录，U1 照报 |
| `dsh-nano-explorer-extra/src/client/format.js`（`formatBytes`） | 宿主 `fileSizeText` 输出不等价：不加空格、1024 进制套十进制单位名（`1.0KB`）、最高 GB、对 0/NaN 无兜底；本包状态栏读 `1 KiB`，替换会改掉全部体积文案 |
| `dsh-nano-explorer-extra/src/client/styles.js`（`.nxe-git-alert`） | 宿主 `Toast` 到 `holdMs` 自动结束，没有「常驻到用户关闭」的形态；Git 读取失败提示必须常驻，故由本包自绘 |
