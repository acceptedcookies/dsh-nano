# dsh-nano-model-selector

替换内置模型选择器的增强版 overlay 插件：在 DeepSeek Harness Web 里提供更丰富的模型选择体验。

## 功能

- 按 provider 分组/过滤模型，附各品牌 logo（`src/client/logos/`）与 `BrandMark`
- 收藏夹：常用模型置前（`favorites.js`）
- 直接选择 reasoning effort，无需进会话设置
- 模型详情卡片：4.5 张卡片高度的面板，按卡片尺寸推导整体高度
- 纯客户端插件，无 host 侧逻辑（`lib/` 只有 `client.js`）

## 结构

- `index.js` + `cordis.patch.yml` — bundle patch；inject `ui-conversation`、`ui-model-selection`、`api-session-controller`、`locale`
- `src/client/` — `ModelSelector.jsx` 主组件、`icons.jsx`/`BrandMark.jsx` 图标体系、`favorites.js` 收藏持久化、`styles.js`、`i18n.js`
- `lib/client.js` — esbuild 产物
- `context/spec.md`、`context/specs/` — 设计规格与参考截图（不入库）

## 依赖

`dsh-nano-ui`（共享 UI 原语）。
