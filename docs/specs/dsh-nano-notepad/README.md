# dsh-nano-notepad

悬浮文本记事本 overlay 插件（内置 Markdown 渲染）。任意后缀的文本文件都按原名保存与编辑；Markdown 只是 `.md` / `.markdown` 的可选视图。笔记内容、版本历史与图片全部驻留浏览器（IndexedDB），不写入服务端工作区。

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

- **文件名**：原样保存调用方给的名字，不追加/改写扩展名（`.env`、`config.yaml`、无后缀都可以）。`fileName()` 只校验非法字符。
- **导入重名**：`__nanoNotepad.import(name, …)` 遇到同 workspace 的同名**未 pin** 文件时直接覆盖其草稿（旧草稿先存为一个 `import` 版本，历史里可回退），不产生第二份；同名文件已 pin、或同名是文件夹时才落 `-2` 副本。多处同名时优先根目录文件。
- **视图能力**：`.md` / `.markdown` 有 Markdown 预览；`.json` 有树工具；`.html`/`.htm`/`.wx` 在公众号接入开启时有富文本预览。其余后缀是纯文本，只开源码视图且不显示 Markdown 工具栏。
- **图片悬浮预览**：源码视图里图片就是 `![alt](notepad-image:<id>)`。`highlightSource` 给该 URL 的 span 打 `data-np-image`，编辑器按指针坐标命中这些 span（mirror 是 `pointer-events:none`，只能靠几何命中），命中后从 IndexedDB 取图、经 `checkImage` 同款门禁后弹 `.np-image-peek` 小窗。小窗在 `.np-window` 内，所以跟随浮窗自己的明暗；`pointer-events:none`，不会抢走打开它的 hover。只在源码视图、Markdown 文件、非拖选状态生效；图片行已删除时静默不弹。
- **始终置顶**：`.np-layer` 在挂载时 reparent 到 `document.body` —— `shell.overlay` slot 自己的容器是 `z-index:20` 的堆叠上下文，留在里面就永远压不过 shell 的 modal（`._root_` z-index:1000）与 toast 带（1100）。reparent 后 `.np-layer` 用 `z-index:1200`，notepad 自己的菜单/对话框 portal 传 `z:1210`（见 [dsh-nano-ui 弹层层级契约](../dsh-nano-ui/README.md)），保证浮窗与它的弹层始终压在 shell 弹窗之上。
- **另存为**：使用文件原名与真实后缀，选择器不限制扩展名；宿主按用户选定的完整路径写入，不再补 `.md`。
- **持久化**：全部数据在浏览器 IndexedDB，host 侧无存储；host 只提供配置默认值与「另存为」路由。
- **配置项**（`Config`，cordis standard schema）：
  - `saveDelayMs` 800（200–5000）自动保存防抖
  - `commitIntervalSec` 60（15–3600）版本快照间隔
  - `versionLimit` 50（5–500）历史版本上限
  - `imageLimitBytes` 5 MB（256 KB–20 MB）图片上限
  - `defaultView` rendered/source
- **同步动效**（设置 →「云同步」）：云端同步进行时的非侵入微动效，三选一 —— `a` 呼吸点 / `b` 流光扫过（默认）/ `c` 环弧旋转。**该特效由腾讯 Hy4 制作**。仅在 `syncing` 状态生效，不改布局、不动文字，并尊重系统的「减少动态效果」偏好；详见 [s3-sync-design.md](s3-sync-design.md) §12。
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
