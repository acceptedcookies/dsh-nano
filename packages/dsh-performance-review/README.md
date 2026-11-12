# dsh-performance-review

构建期观测库，供 dsh-nano 系列插件共享。**不是插件**：无 `dsh.bundle`、无 `dsh.client`，不单独安装、不发布。各插件在 esbuild 打包时把 `src/client.js`（及间接的 `src/state.js`/`src/aggregate.js`）打进 `lib/client.js`；宿主侧把 `src/host.js` 打进 `lib/host.js`，或由未打包的 `index.js` 消费插件构建产出的单文件 `lib/observe-host.js`。

设计约束见 `docs/specs/dsh-nano-performance-review/spec-26nov.md`（rev3）。要点：

- 页面单例 `window.__perfReview`；宿主单例 `globalThis.__perfReviewHost`。多份打包拷贝共享同一实例，每份拷贝在 `join` 时登记 `contributors`。
- 默认关闭。浏览器 `localStorage['dsh-perf-review'] === '1'` 或 `?perf-review=1`；宿主 `DSH_PERF_REVIEW=1`。关闭时 `span`/`track`/`count` 是恒等包装——不打 mark，不查时间。
- 浏览器 `report()` 返回 report JSON 快照并清空窗口；宿主每 30 s 写 `plugins/perf-review/host.json`。

## React 渲染测量的两个真机边界（β §9.0 记录）

- `React.Profiler` 是 `Symbol.for('react.profiler')`，不是函数。`profiler()` 的守卫必须判空（`== null`），不能用 `typeof !== 'function'`——后者对每个调用方都原样返回组件，`commits` 恒 0（β 前一轮发现的盲区）。
- 生产构建 React ≤18.3.1 下 `<Profiler>.onRender` **不会触发**——该回调只在 profiling 构建启用，生产 `<Profiler>` 只作结构标记。因此 `profiler.commits`/`commitP95` 在生产恒 0 属预期；各插件的根组件渲染时长改由包装内的手动计时壳记为 **`react-render` span** 读取。React 19 profiling 构建才有真正的 `commits`。
- 纯 DOM 插件（如 notepad）没有 React 树可包，`profiler()` 不适用——沿用 `track`/`span`（例：`keystroke-input`）。

```bash
npm run test
```
