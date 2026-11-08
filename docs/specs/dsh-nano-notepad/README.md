# dsh-nano-notepad

悬浮 Markdown 记事本 overlay 插件。笔记内容、版本历史与图片全部驻留浏览器（IndexedDB），不写入服务端工作区。

| 元信息 | 值 |
|---|---|
| 版本 | `0.1.1` |
| 类型 | dsh overlay 插件（host + client 双端） |
| dsh 引擎 | `>=0.2.2-rc.1 <0.3.0` |
| 构建 | `node scripts/build-client.mjs`（esbuild 0.25.0） |
| 文档更新 | 2026-11-09 |

## 树状结构

```
dsh-nano-notepad/
├── index.js                  # host 半侧：Config 默认值 + /nano-notepad/* HTTP 路由
├── cordis.patch.yml          # bundle patch 声明（插件挂载层）
├── package.json              # 包名/版本/inject 声明/files 白名单
├── package-lock.json         # npm 锁文件
├── icon.svg                  # 插件图标
├── locale/
│   ├── zh.json               # 中文文案
│   └── en.json               # 英文文案
├── src/client/               # 客户端源码（浏览器端）
│   ├── index.js              # 入口：注册面板、快捷键、主题
│   ├── panel.js              # 悬浮面板布局与交互
│   ├── markdown.js           # Markdown 渲染
│   ├── db.js                 # IndexedDB 持久层：笔记/版本/图片
│   └── i18n.js               # locale 加载
├── lib/
│   └── client.js             # esbuild 打包产物（运行时加载）
├── scripts/
│   └── build-client.mjs      # 构建脚本
├── context/                  # 规格与参考截图（git 忽略）
└── node_modules/             # 本地开发依赖（git 忽略）
```

## 详细说明

- **持久化**：全部数据在浏览器 IndexedDB，host 侧无存储；host 只提供配置默认值与「另存为」路由。
- **配置项**（`Config`，cordis standard schema）：
  - `saveDelayMs` 800（200–5000）自动保存防抖
  - `commitIntervalSec` 60（15–3600）版本快照间隔
  - `versionLimit` 50（5–500）历史版本上限
  - `imageLimitBytes` 5 MB（256 KB–20 MB）图片上限
  - `defaultView` rendered/source
- **另存为**：host 路由调 `osascript choose file name`，弹 macOS 原生保存对话框。
- **inject**：`ui-layout`、`client-shortcuts`、`ui-theme`、`client-locale`、`api-workspace-controller`、`api-session-controller`。

## 依赖

| 类别 | 包 | 版本 |
|---|---|---|
| dependencies | `dsh-nano-ui` | `file:../packages/dsh-nano-ui` |
| devDependencies | `esbuild` | `0.25.0` |
| peer | （无，宿主 dsh 提供 primitives/ React 经 inject） | — |

## 原生对比

| | dsh 原生 | dsh-nano-notepad |
|---|---|---|
| 记事本 | ❌ 无对应功能 | ✅ 浮窗 Markdown 记事 |
| 数据存放 | — | 浏览器 IndexedDB |
| 版本历史 | — | ✅ 周期快照 |
| 导出 | — | ✅ 系统保存对话框 |
