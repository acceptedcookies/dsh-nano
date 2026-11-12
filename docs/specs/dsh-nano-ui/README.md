# dsh-nano-ui

三个 overlay 插件共用的 UI 原语 package（**非插件**，无 dsh bundle 声明）。封装于 `@deepseek-ai/dsh-client-ui-primitives` 与 React 18 之上，提供成品样式组件。

| 元信息 | 值 |
|---|---|
| 版本 | `0.1.0` |
| 类型 | 共享 package（npm，GitHub Packages 发布） |
| sideEffects | `false`（纯桶文件，可 tree-shake） |
| 文档更新 | 2026-11-09 |

## 树状结构

```
packages/dsh-nano-ui/
├── index.js                  # re-export 桶，无逻辑
├── package.json              # 包名/版本/peer/files/publishConfig
└── src/
    ├── dialog.js             # NanoDialog：声明式模态框组件
    ├── menu.js               # NanoMenu / NanoMenuItem：下拉与上下文菜单
    ├── toast.js              # NanoToast：轻提示
    ├── dom.js                # openNanoDialog / openNanoMenu：命令式挂载辅助
    ├── tabs.js               # nanoTabs：纯 DOM 分段 tab（ARIA tablist/tab/tabpanel）
    └── styles.js             # NANO_STYLES：共享 CSS（含 .np-switch N 段滑轨）
```

## 详细说明

- **消费方式**：插件以 `file:../packages/dsh-nano-ui` 依赖，经各自 esbuild bundle 进 `lib/client.js`；运行时不单独解析此包。
- **导出全览**：

| 导出 | 形态 | 用途 |
|---|---|---|
| `NanoDialog` | React 组件 | 模态对话框 |
| `openNanoDialog` | 命令式 | 手动挂载对话框 |
| `NanoMenu` / `NanoMenuItem` | React 组件 | 菜单渲染 |
| `openNanoMenu` | 命令式 | 手动挂载菜单 |
| `NanoToast` | React 组件 | toast |
| `nanoTabs` | 命令式 | 纯 DOM tab 条：`nanoTabs({items:[{value,label,panel}],value,onChange,label})`，管理 ARIA 与 hidden，支持 ←/→/Home/End 与横向溢出滚动 |
| `NANO_STYLES` | CSS 字符串 | 共享样式（`.np-switch`、`.nano-tabs` 等） |

- **tab 视觉契约**：`.nano-tab[aria-selected="true"]` 是反白实心 pill（亮底深字 + 底部 accent 线），是 tab 条里唯一的亮块；tab 等宽 `flex:1 1 0`，窄容器才横向滚动。消费方若给对话框内 `button` 加通用皮肤，必须排除 `.nano-tab`。
- **固定高度对话框**：`openNanoDialog({ fixedHeight })` 设置 `--nano-dlg-h` 并给卡片加 `.nano-dialog-fixed`；该 class 关闭 shell body 的滚动、把注入的 `.np-dlg-body` 变成 flex 列，由消费方把 tab 条与面板拆成两个兄弟容器（`.np-dlg-tabs` 固定 + `.np-dlg-panels` 滚动），这样滚动内容不会与 tab 重叠、切 tab 也不会改变卡片高度。
- **分隔线唯一性**：tab 条只挂一条 `border-bottom: 1px`。面板被包进 `.np-tab-panel` 后，任何基于「直接子元素 first-child」去掉首行 `border-top` 的规则都会失效；必须显式给 `.np-dlg-panels > .np-tab-panel > .np-section` 也清零，否则首行顶边框与 tab 条下边框贴成 2px 双线，且滚动后才变回 1px。

- **发布**：`publishConfig.registry = https://npm.pkg.github.com`；`files` 仅 `index.js` + `src/`；`private: false`。

## 依赖

| 类别 | 包 | 版本 |
|---|---|---|
| dependencies | （无） | — |
| devDependencies | （无） | — |
| peerDependencies | `react` | `>=18` |
| peerDependencies | `react-dom` | `>=18` |
| peerDependencies | `@deepseek-ai/dsh-client-ui-primitives` | `>=0` |

## 原生对比

| | dsh 原生 `dsh-client-ui-primitives` | dsh-nano-ui |
|---|---|---|
| 定位 | headless 无样式行为原语 | 成品样式组件 |
| 形态 | hooks/基础组件 | 声明式 + `open*` 命令式 |
| 使用方 | 官方 UI 包 | 本仓库三个插件 |

## 排版令牌契约（解耦）

nano-ui 共享样式不再硬编码字号，改为消费一组可选的 `--nano-*` CSS 自定义属性，全部带回退（默认 = shell 值）。宿主插件在自己的根上声明这些令牌即可重定排版，nano-ui 不需要该插件、行为也不变。

| 令牌 | 作用 | 回退 |
|---|---|---|
| `--nano-font-family` | 菜单/对话框/toast 字体族 | 继承 |
| `--nano-font-size` | 菜单/对话框正文、对话框内按钮字号 | 继承 |
| `--nano-line-height` | 菜单/对话框行高 | 继承 |
| `--nano-title-size` | 对话框标题字号 | 继承 |
| `--nano-desc-size` | 对话框描述 / 错误行 / toast 字号 | 继承 / 12px |

注意：`NanoMenu` 与 `NanoDialog` 都 portal 到 `document.body`，不在宿主导出的任意容器内 —— 所以令牌必须声明在 `document.documentElement`（`:root`）或 `body` 上才能到达这些弹层。宿主插件（如 `dsh-nano-notepad`）在自身 `:root` 规则里同时声明 `--np-*`（自身排版）与 `--nano-*`（喂给 nano-ui）即可。

## 弹层主题契约（`theme`）

排版令牌能走 `:root`，**颜色不能**：宿主可以把浮窗单独钉成 `light`，而 shell 仍是 `dark`，此时 portal 到 `body` 的弹层会解析到 shell 的 `--dsw-*` 调色板，画出深色菜单压在浅色浮窗上。

因此 `NanoMenu` / `openNanoMenu` / `NanoDialog` / `openNanoDialog` 接受可选的 `theme: 'light' | 'dark'`，表示**拥有者自己的**解析后配色：

| 弹层 | 落点 | 说明 |
|---|---|---|
| 菜单 | `.nano-menu` 根节点 `data-nano-theme` | React 属性直接下发 |
| 对话框 | portal 层（卡片与遮罩的共同父级）`data-nano-theme` | shell `Modal` 只透传自己的 props，所以不能走 React 属性；由 `openNanoDialog` 的 MutationObserver 在卡片提交后写到 `parentElement` |

拥有者据此把调色板作用到该子树，例如 notepad：

```css
[data-nano-theme="light"] { --dsw-menu-surface-fill: #fcfdfeb3; --dsw-alias-label-primary: #0f1115; … }
```

要点：

- 直接声明在弹层元素上的自定义属性**胜过继承**，所以 `body[data-ds-dark-theme]` 的更高特异性不会把它压回去。
- 省略 `theme` 时不写该属性，弹层继续跟随 shell —— 这是 `dsh-nano-explorer-extra`、`dsh-nano-shared-workspace` 的现状，不需要改。
- 卡片必须自己解析文字颜色：`.nano-dialog-card` 显式声明 `color: var(--dsw-alias-label-primary)`。否则 `color` 从 shell 继承成已计算值，浅色卡片上会留下近白字。
- `.nano-menu` 自身已声明 `color`，菜单不受此影响。
