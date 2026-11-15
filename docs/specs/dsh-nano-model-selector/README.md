# dsh-nano-model-selector

替换原生模型选择器的增强版 overlay 插件，挂在 DeepSeek Harness Web 对话输入区。

| 元信息 | 值 |
|---|---|
| 版本 | `0.1.1` |
| 类型 | dsh overlay 插件（纯客户端） |
| dsh 引擎 | `>=0.2.2-rc.1 <0.3.0` |
| 构建 | `node scripts/build-client.mjs`（esbuild 0.25.0） |
| 文档更新 | 2026-11-09 |

## 树状结构

```
dsh-nano-model-selector/
├── index.js                  # 入口 + inject 声明（仅客户端，无 host 逻辑）
├── cordis.patch.yml          # bundle patch 声明
├── package.json
├── package-lock.json
├── icon.svg
├── locale/
│   ├── zh.json
│   └── en.json
├── src/client/
│   ├── index.jsx             # 挂载点：替换原生选择器 slot
│   ├── ModelSelector.jsx     # 主组件：面板/搜索/分组/卡片
│   ├── favorites.js          # 收藏夹持久化
│   ├── icons.jsx             # 图标组件集
│   ├── BrandMark.jsx         # provider 品牌徽标
│   ├── logos/                # 品牌 logo 资源
│   │   ├── DeepSeek.svg      ├── GithubCopilot.svg  ├── Cursor.svg
│   │   ├── Gemini-CLI.svg    ├── Mistral.svg        ├── Devin.svg
│   │   ├── Magpie.png        └── WorkBuddy.png
│   ├── styles.js             # 组件 CSS
│   └── i18n.js
├── lib/
│   └── client.js             # esbuild 产物
├── scripts/build-client.mjs
├── context/spec.md + specs/  # 设计规格与截图（git 忽略）
└── node_modules/
```

## 详细说明

- **Provider 分组 + 过滤**：按 provider 归组，配品牌 logo 与徽标。
- **收藏夹**：常用模型置前，本地持久化。
- **Reasoning effort 直选**：面板内直接切换，无需进会话设置。
- **详情卡片**：面板按卡片高度推导，露出 4.5 张；原生仅名称/基础行。
- **inject**：`ui-conversation`、`ui-model-selection`、`api-session-controller`、`client-locale`。

## 依赖

| 类别 | 包 | 版本 |
|---|---|---|
| dependencies | `dsh-nano-ui` | `file:../packages/dsh-nano-ui` |
| devDependencies | `esbuild` | `0.25.0` |
| peer | （无） | — |

## 原生对比

| | dsh 原生 `ui-model-selection` | dsh-nano-model-selector |
|---|---|---|
| Provider 分组 | ✅ | ✅ + 过滤与品牌图标 |
| 收藏 | ❌ | ✅ |
| Effort 直选 | ❌ | ✅ 面板内 |
| 模型详情 | 基础行 | ✅ 卡片式 |

## DNMS01：异步压缩接管（2026-11 冻结执行）

| 包 | 角色 | 说明 |
|---|---|---|
| `dsh-nano-model-selector` | 主包 | rail 第 4 图标「压缩」四态面板；`GET/PUT /nano-model-selector/async-compact`（策略唯一可写真源 `async-compact.json`，7 字段无 `enabled`）；`POST …/async-compact/switch`（面板唯一写入口 → `setBundleEnabled`） |
| `dsh-nano-model-selector-compaction` | host-only bundle | `dsh.profile.bundles` 成员 = ON/OFF canonical 开关；ON 时 `NanoCompactionEngine` 经 4× preset `config.plugins` 全量回放替换各 isolate `id: compaction` 组的 `compaction-basic`；`lib/compaction/` 为 vendored seam（仅根导出 Cordis-free 原语） |

真相冻结 `T-O-DNMS01-01..22`（`qna/DNMS01-qna.md`）；执行锚 `plan/todo.DNMS01.md`；收口 `closure/N-A/DNMS01-closure.md`。
