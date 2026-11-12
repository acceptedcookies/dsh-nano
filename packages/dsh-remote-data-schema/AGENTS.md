# dsh-remote-data-schema

构建期共享库，**不是插件**：无 `dsh.bundle`、无 `dsh.client`，不单独安装、不发布。
各 dsh-nano 插件以 `file:../packages/dsh-remote-data-schema` 声明为 **devDependencies**，由 esbuild 打进 `lib/` 产物（`lib/host.js`、`lib/s3-sync-host.js`）；运行中的宿主**不解析本包**。
本文件自洽：不依赖仓库根 AGENTS.md、`docs/`、`context/` 或本机手册。

## 身份

- 包名 `dsh-remote-data-schema`，版本与引擎见 `package.json`。
- 纯 ESM，零外部依赖（只用 `node:*`）。`node --test` 跑测试。
- 职责：宿主侧远端数据 schema 校验（26-nov-security-fix / P1-06 骨架，T-O-8）。

## 状态：Phase 2 已实现（P2-01）

`validate` / `SchemaReject` 已实现全部六类 v1 规则，白名单按现写字面（errata A1）：
- **导出常量**：`MAX_FILE_BYTES` 2MiB、`MAX_IMAGE_BYTES` 5MB、`MAX_COMMITTED_BYTES` 2GiB、`PART_BYTES` 64KiB、`MAX_DEPTH` 32、`SESSION_ID_RE`、`WORKSPACE_ID_RE`。
- **版本识别**：`schemaVersion` > `v`；缺判别字段时按 kind 决定——`manifest` → v0（存量 manifest 无 `schemaVersion`），`file`/`image`/`marker`/`session-meta`/`tree-head` → v1（这些类从无 v0 形态或恒带 `v`，缺省回退到 v0 会绕过白名单）。
- **file 是原始 UTF-8 字节**（`files/<id>.md` 存的草稿正文，不是 JSON）。可传 `{context:{key,id,manifest}}` 交叉校验 id 字符集与 manifest 归属；`session-meta` 可传 `{context:{parts}}` 校验分片大小。
- **v0 只读兼容**：仅 manifest 自动落 v0；返回 `compat:'v0-backfill'`，绝不就地升级、绝不静默写 v1。v0 也过 `MAX_DEPTH` 深度守卫。

## 消费方式

在**宿主消费点**调用（如 `src/host/s3-sync.js` 返回前、nsw `workspaces.js`/`session-io.js`/`tree.js` 拉取时），不做文件 IO：

```js
import { validate, SchemaReject } from 'dsh-remote-data-schema'

try {
  validate('manifest', obj)                                       // 无 schemaVersion → v0-backfill
  validate('image', payload)                                      // file/image 无 v0，直接走 v1
  validate('file', text, { v: 1, context: { key, manifest } })    // key 交叉校验
  validate('session-meta', meta, { context: { parts: sizes } })   // 分片限额
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
| `src/index.js` | 导出 `validate`、`SchemaReject`、`SUPPORTED_KINDS`、限额常量 |
| `src/reject.js` | `SchemaReject` 类型与 `reject(field)` 辅助 |
| `src/schema/v1.js` | 六类 v1 校验器 + `assertDepth` 深度守卫 + 限额常量 |
| `src/schema/v0.js` | v0 只读兼容（`compat:'v0-backfill'` + 深度守卫） |
| `test/schema.test.mjs` | B1-T01 单测（正/负样本，含存量桶字面形状） |

## 不要

- 不要在 v1 骨架未实现时放行（pass-through）远端对象；fail-closed 是设计。
- 不要依赖 DOM / 浏览器 API；本包跑在宿主。
- 不要把 schema 当传输层校验之外的用法（它只校验远端对象形状）。
