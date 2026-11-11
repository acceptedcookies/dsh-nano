# dsh-html-policy

构建期共享库，**不是插件**：无 `dsh.bundle`、无 `dsh.client`，不单独安装、不发布。
各 dsh-nano 插件以 `file:../packages/dsh-html-policy` 声明为 **devDependencies**，由 esbuild 打进 `lib/` 产物（客户端进 `lib/client.js`，宿主渲染器进 `lib/` 相应产物）；运行中的宿主/页面**不解析本包**。
本文件自洽：不依赖仓库根 AGENTS.md、`docs/`、`context/` 或本机手册。

## 身份

- 包名 `dsh-html-policy`，版本与引擎见 `package.json`。
- 纯 ESM，零外部依赖（只用 `node:*`，不依赖 DOM）。`node --test` 跑测试。
- 职责：共享 HTML allowlist 策略表（26-nov-security-fix / P1-07 骨架，T-O-9）。

## 状态：Phase 3 已实现

- `ALLOWED_ELEMENTS`（39 个，含 `animateTransform` camelCase + `ALLOWED_ELEMENTS_LC` 小写镜像）、`ALLOWED_ATTRS`（15 个小写键）、`ALLOWED_SCHEMES`（`http`/`https`）、`ALLOWED_STYLE_PROPS`（约 50 个，MP 安全样式并集）已按规格填充（P3-01）。`PASSTHROUGH_ELEMENTS = {foreignobject}` 保 client 的 foreignObject→image 变换。
- **强制丢弃集**保持不变：`DROP_ELEMENTS`（script/iframe/object/embed/base/meta/form/input/button/textarea/select/link/style）、`isDropAttr`（全部 `on*` + `srcdoc`）、`isDropScheme`（`javascript:`/`data:text`/`vbscript:`/`file:`、非 image 的 `data:`）。
- `sanitizePolicy({kind,name,value,el})` 已实现：element/attr/url/style-prop 四类判定的纯函数分发；`sanitizeHtml(html)` 是宿主字符串序列化器（字节保留引号风格；attr 值仅实体编码 `<`/`>`/`"`/`&`——mXSS 闸门）；`sanitizeStyle(cssText,{mapDecl})` 声明级过滤、`position` 强制 `static`、支持客户端 dark-remap 钩子。

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
| `src/index.js` | 汇总导出 `ALLOWED_*`、`DROP_*`、`isDropAttr`、`isDropScheme`、`elementAction`、`attrPolicy`、`urlPolicy`、`sanitizeStyle`、`sanitizePolicy`、`sanitizeHtml`、`POLICY` |
| `src/policy.js` | 策略常量表 + 丢弃判定 + `decodeEntities`/`urlPolicy`/`styleDecls`/`sanitizeStyle`/`elementAction`/`attrPolicy` |
| `src/sanitizePolicy.js` | `sanitizePolicy` 分发器 + `sanitizeHtml` 宿主字符串序列化器 |
| `test/policy.test.mjs` | B3-T01 单测：表内容、`sanitizePolicy` 判定、battery-dom 攻击语料 0-执行 |
| `test/fixtures/battery-dom.txt` | v-mpsan 攻击语料（负样本） |

## 不要

- 不要放行活动内容；attr 序列化必须实体编码 `<`/`>`/`"`/`&`，绝不原样回填（mXSS 重建防护）。
- 不要依赖 DOM API；宿主字符串 renderer 也消费本包。
- 不要为「兼容」把活动元素/属性/scheme 移出丢弃集，也不要把 `data-*`/`id`/`target`/动画属性加回 allowlist（spec 有意省略，animateTransform 因此惰性）。
