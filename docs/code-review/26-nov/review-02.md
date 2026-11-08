# 弹窗（Dialog / Menu / Toast / Popover）入口登记与一致性审查

> 范围：`dsh-nano-notepad`、`dsh-nano-model-selector`、`dsh-nano-explorer-extra` 三个插件的浏览器端。日期 2026-11-09。
> 目的：把每个会"浮出"的入口登记为 ledger 条目，并逐条审查 ① 是否符合 dsh 原生 UI、② 关闭/确认等动作按钮是否来自同一组件、③ 翻译是否有统一入口、④ 色彩 token 是否有统一入口。

## 判定图例

- ✅ 符合 / 有统一入口
- ⚠️ 局部符合 / 内部一致但非原生 / 有可复用空间
- ❌ 不符合 / 无统一入口 / 存在漂移

---

## §1 弹窗入口 ledger

| # | 弹窗 | 插件 | 功能 | 按钮 / 动作 | 判定摘要 |
|---|------|------|------|------------|---------|
| D1 | **CommitDialog** | explorer-extra | 给所有 Git 变更写一条提交信息 | `cancel`(outline) + `commit`(primary，消息非空才可点) | ✅ 原生 Modal/Button |
| D2 | **RenameDialog** | explorer-extra | 重命名已有条目（F2 / 工具钮 / 菜单触发） | `cancel`(outline) + `confirm`(primary) | ✅ 原生 Modal/Button/Input |
| D3 | **RenameDialog(mode=create)** | explorer-extra | 给新建文件/文件夹命名 | `cancel`(outline) + `create`(primary) | ✅ 同一组件复用（D2 同源） |
| D4 | **outsidePrompt** | explorer-extra | 展开指向工作区外的符号链接前询问 | `cancel`(outline) + `openAnyway`(primary) | ✅ 原生 Dialog 包装 |
| D5 | **deleteRequest** | explorer-extra | 删除文件/目录确认卡 | `cancel`(outline) + `delete`(primary) | ✅ 原生 Dialog 包装 |
| D6 | **RowMenu** | explorer-extra | 行右键菜单：在 App 打开 / 复制路径×2 / 重命名 / 删除 | 若干 `menuitem`，删除项 `data-tone=danger`；外点/Esc/Enter 关闭 | ⚠️ 自制菜单（有理由，见下），样式贴近原生 |
| D7 | **RevealButton 下拉** | explorer-extra | 顶部"在 App 打开"的 opener 选择器 | 主钮 + chevron 下拉（各应用项）；外点/Esc 关闭 | ⚠️ 自制 split-button 下拉，复用 `.nxe-menu` 皮肤 |
| D8 | **toast** | explorer-extra | 复制路径成功的浮动提示 | 无按钮，1.6s 自动消失 | ⚠️ 自制 toast（`role=status`） |
| D9 | **nms-panel 选择器** | model-selector | 模型/档位/供应商筛选/收藏 选择浮层 | 搜索框 ×、刷新、关闭(✕)、供应商 rail、模型行、底部档位行；选中或 ✕/Esc/外点 关闭 | ⚠️ 自制 popover（`role=dialog`），样式贴近原生 |
| D10 | **nms-toast** | model-selector | 切模型失败/成功的浮动提示 | 无按钮，6s 自动消失 | ⚠️ 自制 toast |
| D11 | **dialog() 名称卡** | notepad | 重命名文件/文件夹（输入名称） | `cancel` + `ok`(primary)，右上 ✕ | ⚠️ 自制 `.np-card`，非原生 Modal |
| D12 | **dialog() 设置卡** | notepad | 便签设置（滑轨开关、延迟/数量等） | 右上 ✕ 关闭 | ⚠️ 自制 `.np-card`，无 footer 按钮（无 confirm/cancel） |
| D13 | **dialog() 历史版本** | notepad | 某文件的版本列表 | 各版本行 + `close` | ⚠️ 自制 `.np-card`，关闭=单钮+✕ |
| D14 | **dialog() 版本预览** | notepad | 预览某版本并可还原 | `back` + `restore`(primary，二次点击确认) | ⚠️ 自制 `.np-card`，restore 用 data-arm 两段式 |
| D15 | **dialog() 清空当前文件** | notepad | 清空当前文件确认 | `cancel` + `clear`(danger) | ⚠️ 自制 `.np-card`，danger 用 `np-danger` |
| D16 | **dialog() 清空全部** | notepad | 删除全部便签确认 | `cancel` + `deleteAll`(danger) | ⚠️ 自制 `.np-card` |
| D17 | **dialog() 删除条目** | notepad | 删除单个文件/文件夹确认 | `cancel` + `delete`(danger) | ⚠️ 自制 `.np-card` |
| D18 | **slash 菜单** | notepad | 编辑器内 `/` 块插入自动补全 | 各插入项 | ⚠️ 自制 `.np-slash` 列表（`role` 无） |
| D19 | **工作区切换菜单** | notepad | 树顶工作区范围切换 | 各工作区项（`np-ws-item`） | ⚠️ 自制 `.np-ws-menu` listbox |
| D20 | **np-menu 通用菜单** | notepad | `openMenuList` 弹出的通用文件/项菜单 | 各 `menuitem`，`data-selected` 勾 | ⚠️ 自制 `.np-menu` 列表 |

> 常驻但**非弹窗**、不计入 ledger：notepad 的 `.np-window` 悬浮主窗（常驻容器）、explorer 的 `StatusBar`、`.np-ws` 标签条、`.nms-trigger` 触发钮本体、`.np-card` 的宿主 `.np-dialog` mask（只是容器）。

---

## §2 逐项审查

### §2.1 是否符合 dsh 原生 UI？

| 插件 | 结论 | 说明 |
|------|------|------|
| **explorer-extra** | ✅ | `dialogs.js` 直接 `import { Button, Input, Modal } from '@deepseek-ai/dsh-client-ui-primitives'`——卡片壳、遮罩、Escape、焦点返回、动作行全由 shell 原语提供，`Dialog` 只做参数转发（`dialogs.js:17-34`）。shell 实际 bundle（`dsh-client-ui-workspace/lib/client.js`）的 footer 也是 `outline`+`primary`，与本插件 `Dialog` 动作序一致（`dialogs.js:25-30`）。 |
| **model-selector** | ⚠️ | 未用原生 `Modal`，但 popover 是合理的形态（跟随 composer 锚点、`createPortal` 到 body、`aria-haspopup=dialog`）。色彩与控件全部走 `--dsw-alias-*`，观感与 shell 一致；只是卡片壳是手写 `.nms-panel`。toast 同样手写。 |
| **notepad** | ⚠️→❌ | 完全自制 `dialog()`/`np-card`/`np-menu`/`np-slash`/`np-ws-menu`，**没有任何弹窗走原生 `Modal`**。虽然 `dialog()` 内部做了 role/aria-modal/焦点返回/inert，但形态与 shell Modal 不一致（卡片头、footer 按钮布局、圆角、遮罩均自定义）。 |

### §2.2 关闭 / 确认 等动作按钮是否来自同一组件？

| 插件 | 结论 | 说明 |
|------|------|------|
| **explorer-extra** | ✅ | 所有确认卡都经 `Dialog`（`dialogs.js:17`）→ `Button` 原语；footer 固定 `outline`(cancel) 左 + `primary`(confirm) 右，与 shell 一致。菜单项经 `RowMenu`/`nxe-menu-item`。唯一动作按钮全插件同源。 |
| **model-selector** | ✅（本插件内） | 无 confirm/cancel 型弹窗；关闭统一为 `nms-icon-button`+`copy.close`（D9）与 `close()`（D9/M2）。内部一致。 |
| **notepad** | ⚠️ | 所有卡经同一 `dialog()` helper（`panel.js:952`），confirm/cancel 用统一 `.np-actions` + `data-go` 与 `.np-danger`，内部一致；但**不是 shell `Button`**，且 D12 设置卡无 footer（只有右上 ✕）、D13 仅 `close` 单钮——按钮形态在本插件内仍统一，但与 shell 原生不同源。 |

### §2.3 翻译是否到位？是否有统一入口？

| 插件 | 结论 | 说明 |
|------|------|------|
| **三者一致** | ⚠️ | 三插件 UI 文案统一走 `src/client/i18n.js` 的 `COPY` 字典 + `copyFor(language)`；语言源统一取 `ctx.locale.getSnapshot().active`，并各自订阅 `ctx.on('locale/change')` 切换（notepad `index.js:42-43`、model-selector `index.jsx:34-35`、explorer `index.js:65,70`）。`locale/{en,zh}.json` **只含 `meta` 元信息，不含 UI 文案**，真实双语都在 `i18n.js`。**统一入口成立**，但与 shell 的 `resolveText`/locale 资源体系**不同源**——`ctx.locale.resolveText` 只有 model-selector 在用（`index.jsx:37`），notepad/explorer 用自己的 COPY。 |
| 弹窗级覆盖 | ⚠️ | explorer-extra 所有弹窗文案（`cancel/confirm/commit/rename/newEntryTitle/deleteTitle/symlinkOutside/copied/revealIn/...`）都在 COPY；notepad 弹窗 `cancel/confirm/ok/delete/clear/restore/back/close/settingsTitle/clearFileTitle/...` 都在 COPY；model-selector `title/searchPlaceholder/refresh/close/allProviders/modelCount/selectionError/...` 都在 COPY。**未见弹窗内硬编码英文**。 |

### §2.4 色彩 token 是否有统一入口？

| 插件 | 结论 | 说明 |
|------|------|------|
| **explorer-extra** | ✅ | 双入口但都受控：通用色走 shell `--dsw-alias-*`（styles.js）；Git/忽略等专有语义色集中在 `styles.js:17-32` 的 `--nxe-*` 命名空间，明暗两档由 `[data-theme]` 统一切换。 |
| **model-selector** | ✅ | `styles.js` 全部引用 `--dsw-alias-*`，无插件自造色；跟随 shell 主题。 |
| **notepad** | ⚠️ | 通用色引用 `--dsw-alias-*`；但在 `panel.js:37-38` 给 `.np-window[data-theme=…]` **逐 token 重定义了一整套硬编码十六进制**（floating 窗体自带主题副本，与 `prefers-color-scheme`/`.np-window` 语境解耦）。这保证浮窗独立于 shell 主题，但意味着同一 token 名存在两份实现，shell 改配色不会联动。 |

---

## §3 汇总结论

- **原生一致性**：explorer-extra（✅ 全原生）> model-selector（⚠️ 形态自制但 token/控件贴近）> notepad（⚠️→❌ 全自制弹窗栈）。
- **动作按钮同源**：explorer-extra、model-selector ✅；notepad ⚠️（内部统一 `.np-actions`，非 shell `Button`）。
- **翻译统一入口**：✅ 三者各自有 `i18n.js COPY` + `ctx.locale.getSnapshot().active` 统一入口；⚠️ 未接入 shell `resolveText`/locale 资源体系，`locale/*.json` 仅元信息。
- **色彩 token 统一入口**：explorer-extra、model-selector ✅；notepad ⚠️（浮窗内联副本，存在 token 双实现漂移风险）。
- **待改进项（非阻断）**：
  1. notepad 弹窗建议逐步迁到 `Modal`/`Button`/`Input` 原语，或至少把 `dialog()` 卡片壳对齐 shell Modal 几何；当前唯一与原生 UI 显著不一致的是它。
  2. notepad `panel.js:37-38` 的整段 `--dsw-alias-*` 重定义建议改为消费 shell 主题，或用 `--np-*` 语义层隔离而非复制 token 名。
  3. explorer-extra 的 `RowMenu`/`RevealButton`/toast 虽自制，但注释已说明为何不走 `contextMenus`（1s 超时 + open-in-app 往返），可保留。
  4. 三插件的 `locale/*.json` 若要承载 UI 文案，应改为真正的翻译资源并接 `ctx.locale.resolveText`，否则建议移除以免误读。

> 本文档仅登记与审查，不改动代码。后续若把任一弹窗迁入原生原语，更新对应行的"判定"即可。

---

## §4 统一方案（已采纳，进行中）

**目标形态**：新建 `packages/dsh-nano-ui`——三插件共享的 UI 原语库。它是**构建时共享库**（各插件 esbuild 打包时把组件 inline 进自己的 `lib/client.js`），不是运行时包；运行时 `~/.dsh[-dev]/plugins/` 只装插件目录，`dsh-nano-ui` 不需存在。

**API**（`packages/dsh-nano-ui/index.js`）：
- `NanoDialog` — shell `Modal`+`Button`+`Input` 薄封装，footer 固定 `outline`(cancel)+`primary`/`danger`(confirm)，与 `dsh-client-ui-workspace` 原生一致。
- `NanoMenu`/`NanoMenuItem` — 锚定 popup 菜单（外点/Esc/方向键/Enter）。
- `NanoToast` — `role=status` 浮动提示。
- `openNanoDialog`/`openNanoMenu` — 非 React 插件（notepad）的 DOM 挂载适配器。
- `NANO_STYLES` — 共享 `nano-*` 样式，全部绑定 `--dsw-*` token。

**依赖**：各插件 `package.json` 加 `"dsh-nano-ui": "file:../packages/dsh-nano-ui"`；esbuild 对 `react`/`react-dom`/`@deepseek-ai/dsh-client-ui-primitives` 保持 `--external`，由 shell `__ModuleLoader__.load` 注入。

**发布路径**：`publishConfig.registry = https://npm.pkg.github.com`；发布后插件把 `file:` 依赖换成 semver 版本号，`npm i` 从 GitHub Packages 拉，esbuild 同样 inline，构建脚本零改动。

**迁移状态**：
- `dsh-nano-explorer-extra` — ✅ 完成（Dialog/RowMenu/RevealButton/toast 全部换 dsh-nano-ui，bundle 验证 `apply`/`inject` 正常）。
- `dsh-nano-model-selector` — ✅ 完成（toast → `NanoToast` + `.nms-root .nano-toast` 视口定位覆盖，`.nms-toast` 死样式移除；面板保留锚定 popover 形态，无共享 surface 类故不套 Modal；bundle 验证 `apply`/`inject` 正常）。
- `dsh-nano-notepad` — ✅ 完成（7 个 `dialog()` 卡 → `openNanoDialog`；`.np-ws-menu` 工作区切换 → `openNanoMenu` + `✓` 选中；`openMenuList` 确认为死代码移除；`.np-slash` 编辑器内 `/` 补全保留自制但行内换 `nano-menu-item` 皮肤；死 CSS `.np-dialog/.np-card/.np-menu/.np-ws-menu/.np-actions` 移除；`.np-window` 主题副本随弹窗 portal 到 body 失效——弹窗随 shell 主题；bundle 验证 `apply`/`inject` 正常）。

### §4.1 迁移后遗留注意项

- **notepad 弹窗 portal 到 `document.body`**：不再继承 `.np-window[data-theme]` 的浮窗主题副本，改随 shell 主题——这正是"统一为原生"的取舍，可接受。
- **`openNanoMenu` 适配器无 `onClose` hook**：notepad 工作区切换的关闭清理（`aria-expanded`/聚焦）经 `done()`/`wsToggleJustClosed` 标志处理，能用但不算优雅；若后续在 `dsh-nano-ui` 给 `openNanoMenu` 加 `onClose` 回调可去掉这套簿记。
- **无 DOM 测试环境**：迁移通过静态 + loader 模拟验证，未跑真 UI；建议在 `https://dsh-dev.local/` 做一次人工冒烟（开/关每个弹窗、输入聚焦、Enter 确认、danger 红钮）。

**判断**：方案可行。统一收敛到 shell 原生 `Modal` 方向——不新造设计，notepad 借道 `openNanoDialog` 直接变原生，`explorer-extra`/`model-selector` 复用同源原语，token/按钮/翻译入口单一。
