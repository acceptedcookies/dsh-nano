# dsh-host-route-guard

构建期共享库，**不是插件**：无 `dsh.bundle`、无 `dsh.client`，不单独安装、不发布。
各 dsh-nano 插件以 `file:../packages/dsh-host-route-guard` 声明为 **devDependencies**，由 esbuild 打进 `lib/` 产物（`lib/host.js`、`lib/route-guard.js`）；运行中的宿主**不解析本包**，本包 `src/` 永远不进运行时。
本文件自洽：不依赖仓库根 AGENTS.md、`docs/`、`context/` 或本机手册。

## 身份

- 包名 `dsh-host-route-guard`，版本与引擎见 `package.json`。
- 纯 ESM，零外部依赖（只用 `node:*`）。`node --test` 跑测试。
- 唯一职责：web 路由注册入口（26-nov-security-fix / P1-01，T-O-6/T-O-7）。

## 消费方式

宿主代码**不**裸 import 本包；由插件 `scripts/build-client.mjs` 把 `src/index.js` 打进 `lib/`。

```js
import { createGuard } from 'dsh-host-route-guard'

// table = 构建期从 security/route-sensitivity.json 烤进的该插件路由行 JS 常量。
// 本包不做任何文件 IO；不要在运行时读 JSON。
const guard = createGuard({ table: BAKED_TABLE, plugin: 'nano-x' })
guard.registerRoutes(ctx, ROUTE_SPECS)      // → disposer[]
guard.inventory()                            // → 台账行（喂 scripts/gen-route-inventory）
```

`RouteSpec`：`{ path, method?, methods?, handler, bodyLimit?, sensitivity?, capability?, sessionBinding? }`。`handler(req, res, route)`；`route` 是冻结的生效记录（methods/bodyLimit/sessionBinding/…）。等价独立入口 `registerRoutes(ctx, specs, { table, plugin? })` 存在，但拿不到 `inventory()`。

## 门禁语义（fail-closed）

- `ctx.get('connection')` 为空 → 抛 `RouteGuardError`，`reason:'no-connection'`。
- `(path, method)` 不在 table → `route-not-listed`；table 有而 spec 无 → `route-stale`。
- spec 的 `sensitivity`/`capability`/`sessionBinding` 与 table 行冲突 → `route-drift`（table 为准）。
- 方法不匹配 → 405 `{ok:false,reason:'method-not-allowed'}`；一切错误 JSON 形状 `{ok:false,reason}`。
- `bodyLimit`：spec 提供则生效，否则继承 table 行；经 `route.bodyLimit` + `readJsonBody(req, limit)` 生效，guard 不消费请求流。
- `sessionBinding` 只落台账，运行时**不**强制。

## 交付物

| 路径 | 角色 |
|---|---|
| `src/index.js` | 公开导出：`createGuard`、`registerRoutes`、`inventoryMarkdown`、`RouteGuardError`、`sendJson`、`readJsonBody` |
| `src/route-guard.js` | 实现与 JSDoc 合同 |
| `test/route-guard.test.mjs` | B0-T01 单测 |
| `AGENTS.md` | 本文件 |

## 测试与打包

```bash
npm test            # node --test
npm pack --dry-run  # 应只含 src/ + AGENTS.md
```

## 不要

- 不要在运行时 `fs` 读 `security/route-sensitivity.json`；table 是构建期烤进的常量。
- 不要加业务逻辑；本包是 43 路由的唯一注册入口，必须极简可测。
- 不要把 `sessionBinding` 当运行时鉴权；它只是台账元数据。
- 不要为兼容关闭校验；没有 feature flag。
