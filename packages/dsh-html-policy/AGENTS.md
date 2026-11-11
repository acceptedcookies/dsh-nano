# dsh-html-policy

构建期共享库，**不是插件**：无 `dsh.bundle`、无 `dsh.client`，不单独安装、不发布。
各 dsh-nano 插件以 `file:../packages/dsh-html-policy` 声明为 **devDependencies**，由 esbuild 打进 `lib/` 产物（客户端进 `lib/client.js`，宿主渲染器进 `lib/` 相应产物）；运行中的宿主/页面**不解析本包**。
本文件自洽：不依赖仓库根 AGENTS.md、`docs/`、`context/` 或本机手册。

## 身份

- 包名 `dsh-html-policy`，版本与引擎见 `package.json`。
- 纯 ESM，零外部依赖（只用 `node:*`，不依赖 DOM）。`node --test` 跑测试。
- 职责：共享 HTML allowlist 策略表（26-nov-security-fix / P1-07 骨架，T-O-9）。

## 状态：Phase 1 骨架

- `ALLOWED_ELEMENTS` / `ALLOWED_ATTRS` / `ALLOWED_SCHEMES` / `ALLOWED_STYLE_PROPS` 是**空占位 Set**，策略内容在 Phase 3（P3-01）填写。
- **强制丢弃集已生效**：`DROP_ELEMENTS`（script/iframe/object/embed/base/meta/form/input/button/textarea/select/link/style）、`isDropAttr`（全部 `on*` + `srcdoc`）、`isDropScheme`（`javascript:`/`data:text`/`vbscript:`/`file:`、非 image 的 `data:`）。
- `sanitizePolicy({kind,name,value,el})` 是**纯函数签名 stub**，当前调用即抛 `not implemented` —— fail-closed，绝不静默放行。

## 消费方式

一张策略表同时驱动两个 renderer（T-O-9）：
- 客户端 `sanitizeRichHtml`（DOMParser 遍历）— 打进 `lib/client.js`
- 宿主 `sanitizeMpHtml`（regex 序列化）— 打进宿主 `lib/` 产物

两 renderer 读同一份 `ALLOWED_*` + `DROP_*`，保证剥除集一致。

## 语义边界

- 只**过滤活动内容**，保留 mp 文章排版（data-src 提升、foreignObject→image、visibility:hidden→visible 由 renderer 负责，不在本包）。
- 本包是纯数据 + 纯函数：无 DOM、无 IO、无状态。
- `position` 样式在 Phase 3 强制 `static`。

## 交付物

| 路径 | 角色 |
|---|---|
| `src/index.js` | 汇总导出 `ALLOWED_*`、`DROP_*`、`isDropAttr`、`isDropScheme`、`sanitizePolicy` |
| `src/policy.js` | 常量表（含 Phase 3 填充清单）+ 丢弃判定 |
| `src/sanitizePolicy.js` | 纯函数签名（stub） |
| `test/policy.test.mjs` | B3-T01 骨架单测 |

## 不要

- 不要在骨架阶段放行活动内容；`sanitizePolicy` 的「抛错 stub」是设计。
- 不要依赖 DOM API；宿主 regex renderer 也消费本包。
- 不要为「兼容」把活动元素/属性/scheme 移出丢弃集。
