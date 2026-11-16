# dsh-nano-ui

[dsh-nano] 插件共用的构建期 UI 库（非插件，不单独安装）。各插件以 `file:../packages/dsh-nano-ui` 依赖，构建时打进自己的 `lib/client.js`。

- **规格**：[DESIGN.md](DESIGN.md)（唯一规格：优先级、令牌、层级、承载模型、组件清单、检测规则、宿主缺口）
- **变更**：[CHANGELOG.md](../../../packages/dsh-nano-ui/CHANGELOG.md)
- **宿主对照**：`packages/dsh-nano-ui/catalog/`（令牌、图标、primitives 导出；生成，不手改）
- **当前版本**：读 `packages/dsh-nano-ui/package.json` 的 `version`；产物里以 `dsh-nano-ui@<版本>` 注释可检索
