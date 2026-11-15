# dsh-interface

构建期共享**归口**库（CF1115），**不是插件**：无 `dsh.bundle`、无 `dsh.client`，不单独安装、不发布、无万能根入口。
各 dsh-nano 插件以 `file:../packages/dsh-interface` 声明为 **devDependencies**，由各自 `scripts/build-client.mjs`（esbuild）把需要的出口打进 `lib/` 产物；运行中的宿主**不解析本包**，本包 `src/` 永远不进运行时。
本文件自洽：不依赖仓库根 AGENTS.md、`docs/`、`context/` 或本机手册。

## 身份

- 包名 `dsh-interface`，版本与引擎见 `package.json`。
- 纯 ESM，零外部运行时依赖（contracts 连 `node:*` 都不用；host/build 仅用 `node:*`）。`node --test` 跑测试。
- 唯一职责：把「合同族的生产者—消费者闭环」收拢为可执行真源 —— `contracts`（纯定义）/ `host`（注入 ctx 的门面）/ `build`（构建期物化助手）三出口。

## 三出口纪律（Q5 / T-O-CF1115-11）

| 出口 | 路径 | 纪律 |
|---|---|---|
| `dsh-interface/contracts` | `src/contracts/` | **纯定义**：无 I/O、无 `node:*`、无 DOM、无 Cordis 实例、无可变 store。只放可被三侧共享的类型词汇/记录形状/纯 codec/纯校验。 |
| `dsh-interface/host` | `src/host/` | **只注入 ctx**：门面把合同投影到 `ctx`（webServer/connection/effect/llm/…）。不得写文件、不得持有跨实例全局态。 |
| `dsh-interface/build` | `src/build/` | **仅构建期**：物化/烘焙助手（把声明表烤成产物常量）。运行时产物不得反向调用本出口。 |

> **不得**新增第四个出口、不得把 host 内容下沉进 contracts、不得让页面 bundle 引用 `build`。

## 消费方式

宿主/页面代码**不**裸 import 本包；由插件 `scripts/build-client.mjs` 把对应 `src/**/index.js` 打进 `lib/`。

```js
import { createWebRegistrar } from 'dsh-interface/host'

// bindings = 构建期烤进的绑定表（id/channel/match/path/…）。
const registrar = createWebRegistrar({ plugin: 'nano-x', bindings: BINDINGS })
const dispose = registrar.registerAll(ctx)   // → 幂等 dispose（已纳入 ctx.effect）
registrar.inventory()                        // → 生效绑定台账
```

### `createWebRegistrar`（Q6 / P0）
- 绑定轴：`channel`（`http`/`upgrade`）× `match`（`exact`/`prefix`）；`upgrade` 只允许 `exact`。
- 全批预检后才注册；任一失败回收本批已注册项；幂等 dispose 纳入 `ctx.effect`。
- `inventory()` 只暴露**生效绑定**（注册成功后才回填）。
- `http+exact` 的准入管线单向复用 `dsh-host-route-guard` 的唯一实现（`createGuard`）；`http+prefix`/`upgrade` 是 registrar 新增的提供面。

## 交付物

| 路径 | 角色 |
|---|---|
| `src/contracts/` | 纯定义出口 |
| `src/host/` | host 门面出口 |
| `src/build/` | 构建期出口 |
| `test/*.test.mjs` | node:test 单测 |
| `AGENTS.md` | 本文件 |

## 测试与打包

```bash
npm install        # 解析 file:../dsh-host-route-guard 等构建期依赖
npm test           # node --test
npm pack --dry-run # 应只含 src/ + AGENTS.md
```

## 不要

- 不要在运行时 `fs` 读 `security/*.json`；表是构建期烤进的常量。
- 不要把 `contracts` 引入 `node:*`/DOM/Cordis/store。
- 不要让 `build` 出口被页面 bundle 或运行时代码 import。
- 不要建通用 IDL/runtime 注册中心/万能根入口；按 `FamilyDefinition` 最小作者记录投影。
- 不要新增手工 required-plugin 清单或第二作者源。
