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
| `NANO_STYLES` | CSS 字符串 | 共享样式（`.np-switch` 等） |

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
