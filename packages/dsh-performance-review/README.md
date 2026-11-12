# dsh-performance-review

构建期观测库，供 dsh-nano 系列插件共享。**不是插件**：无 `dsh.bundle`、无 `dsh.client`，不单独安装、不发布。各插件在 esbuild 打包时把 `src/client.js`（及间接的 `src/state.js`/`src/aggregate.js`）打进 `lib/client.js`；宿主侧把 `src/host.js` 打进 `lib/host.js`，或由未打包的 `index.js` 消费插件构建产出的单文件 `lib/observe-host.js`。

设计约束见 `docs/specs/dsh-nano-performance-review/spec-26nov.md`（rev3）。要点：

- 页面单例 `window.__perfReview`；宿主单例 `globalThis.__perfReviewHost`。多份打包拷贝共享同一实例，每份拷贝在 `join` 时登记 `contributors`。
- 默认关闭。浏览器 `localStorage['dsh-perf-review'] === '1'` 或 `?perf-review=1`；宿主 `DSH_PERF_REVIEW=1`。关闭时 `span`/`track`/`count` 是恒等包装——不打 mark，不查时间。
- 浏览器 `report()` 返回 report JSON 快照并清空窗口；宿主每 30 s 写 `plugins/perf-review/host.json`。

```bash
npm run test
```
