# dsh-performance-review

构建期性能观测库，供 dsh-nano 系列插件共享。**不是插件**：无 `dsh.bundle`、无 `dsh.client`，不单独安装、不发布。

包事实：

- 导出 `./client`、`./host`、`./aggregate`、`./markdown`、`./state`、`./diagnose`、`./declaration`。
- 浏览器 bundle 不得引用 `./diagnose` 或 `./declaration`（Node 侧纯函数）。
- 没有写盘器：不产生任何宿主快照文件，也没有定时写入或退出钩子。
- 机制以 [`docs/specs/dsh-nano-performance-review/spec-26nov.md`](../../docs/specs/dsh-nano-performance-review/spec-26nov.md) 为唯一真源；本文件只列包事实，不复制机制。

```bash
npm run test
```
