# dsh-remote-data-schema

构建期共享库，**不是插件**：无 `dsh.bundle`、无 `dsh.client`，不单独安装、不发布。
各 dsh-nano 插件以 `file:../packages/dsh-remote-data-schema` 声明为 **devDependencies**，由 esbuild 打进 `lib/` 产物（`lib/host.js`、`lib/s3-sync-host.js`）；运行中的宿主**不解析本包**。
本文件自洽：不依赖仓库根 AGENTS.md、`docs/`、`context/` 或本机手册。

## 身份

- 包名 `dsh-remote-data-schema`，版本与引擎见 `package.json`。
- 纯 ESM，零外部依赖（只用 `node:*`）。`node --test` 跑测试。
- 职责：宿主侧远端数据 schema 校验（26-nov-security-fix / P1-06 骨架，T-O-8）。

## 状态：Phase 1 骨架

`validate` / `SchemaReject` 已可用；`src/schema/v1.js` 与 `src/schema/v0.js` 是占位实现：
- **v1 规则在 Phase 2（P2-01）填写**，当前 `validateV1` 一律抛 `SchemaReject('schema:unimplemented')` —— fail-closed，绝不静默放行。
- **v0 只读兼容**：缺判别字段的对象按 v0 处理，返回 `compat:'v0-backfill'`。

## 消费方式

在**宿主消费点**调用（如 `src/host/s3-sync.js` 返回前、nsw `workspaces.js`/`session-io.js`/`tree.js` 拉取时），不做文件 IO：

```js
import { validate, SchemaReject } from 'dsh-remote-data-schema'

try {
  validate('manifest', obj)                  // {v} 缺省自动识别
  validate('session-meta', meta, { v: 1 })   // 显式版本
} catch (e) {
  if (e instanceof SchemaReject) { /* e.reason === 'schema:<field>' */ }
}
```

`kind` ∈ `manifest | file | image | marker | session-meta | tree-head`（`SUPPORTED_KINDS`）。`SchemaReject.reason` 形如 `schema:<field>`。

## 语义边界（T-O-8）

- 任一字段非法 → **整对象拒绝**，宿主返回 `{ok:false,reason:'schema',detail}`。
- v0 历史对象（无 `schemaVersion`/`v`）只读兼容 + 一次性补写，不做批量迁移。
- 未知版本（`schemaVersion`>1、`v`>1）→ `schema:unknown-version`。
- 字段白名单一律以**现写字面**为准，不按想象字段编写（errata A1）。

## 交付物

| 路径 | 角色 |
|---|---|
| `src/index.js` | 导出 `validate`、`SchemaReject`、`SUPPORTED_KINDS` |
| `src/reject.js` | `SchemaReject` 类型与 `reject(field)` 辅助 |
| `src/schema/v1.js`、`src/schema/v0.js` | 版本校验器（骨架） |
| `test/schema.test.mjs` | B1-T01 骨架单测 |

## 不要

- 不要在 v1 骨架未实现时放行（pass-through）远端对象；fail-closed 是设计。
- 不要依赖 DOM / 浏览器 API；本包跑在宿主。
- 不要把 schema 当传输层校验之外的用法（它只校验远端对象形状）。
