# dsh-nano-model-selector

替换原生模型选择器的增强版 overlay 插件，面向 DeepSeek Harness Web 对话输入区。

## 功能列表

- Provider 分组 + 过滤，各品牌 logo（`logos/`）与 `BrandMark`
- 收藏夹置顶常用模型（`favorites.js` 持久化）
- 面板内直接选 reasoning effort
- 模型详情卡片，面板按卡片高度推导（露 4.5 张）
- 纯客户端，无 host 侧

## 原生对比

| | dsh 原生 `ui-model-selection` | dsh-nano-model-selector |
|---|---|---|
| Provider 分组 | ✅ 按组列出 | ✅ + 过滤与品牌图标 |
| 收藏 | ❌ | ✅ |
| Reasoning effort 直选 | ❌（需进设置） | ✅ 面板内 |
| 模型详情 | 名称/基础信息 | ✅ 卡片式详情 |

## 结构

- `index.js` + `cordis.patch.yml` — inject：`ui-conversation`、`ui-model-selection`、`api-session-controller`、`locale`
- `src/client/` — `ModelSelector.jsx` / `icons.jsx` / `BrandMark.jsx` / `favorites.js` / `styles.js` / `i18n.js`
- `lib/client.js` — esbuild 产物
- 依赖 `dsh-nano-ui`；规格见 `context/spec.md`（不入库）
