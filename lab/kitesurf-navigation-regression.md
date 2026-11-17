# Kitesurf 导航回归实验（2026-11-17）

## 结论与边界

同一现有 Kitesurf 构建、同一 `kitesurf-dev` 引擎，直接 CDP 和修复后的 DNLS 都能显示 archy.studio。无需以换引擎或增大容器内存修复本次回归。

可复现的接入层错误链：

1. DNLS 对所有 CDP 命令只等 4 秒，包括 `Page.navigate` 和 `Page.captureScreenshot`。
2. 超时直接设 `client.alive=false`；下一次 ensure/probe 会关闭原 socket 并重连。
3. Kitesurf 每个 WebSocket 有独立页面；关闭原 socket 会销毁仍在渲染的页面。
4. `/open` 吞掉异常，仍回 `200 {ok:true}`。面板再按 8 秒确认窗口和 4 秒截图竞速判失败，并自动重发导航，使错误继续放大。
5. 并发冷启动/probe 没有 singleflight，可能创建两条不同页面连接，或关闭另一个请求刚取得的新连接。

历史定位：`2d0b91a` 引入统一 4 秒命令截止；`d500462` 加入“命令超时即 socket 死亡”的判断。不是引擎的 retireStub 能力上限。

`Page.navigate: generation bump` 是主动退休旧页面 worker 的路径；单独的 `script terminated`、WebSocket close 日志、React 418 或某站 HTTP 403 都不足以证明引擎渲染能力不足。此前将这些日志直接归因为 OOM/引擎上限的结论撤回。

## 对照结果

- 旧引擎直接 CDP：archy.studio 导航约 **16.6 秒**，读到正确标题和 **42,617** 字符 DOM，截图再用约 **10.1 秒**。
- 修复 DNLS 后：裸域名 `archy.studio` 导航约 **10.0 秒**，DOM **37,915** 字符；9 次并发 `/ports` 探针期间 `cdpGeneration=0`，截图有效。
- dsh-dev 地址栏真实输入、Enter：心跳出现后正常进入 HTML 页面，标题 `Archy Studio — Creative Direction for Architecture & Property`，无错误弹窗。
- 真实鼠标点选可见标题：出现 4 个操作按钮；Esc 清掉选中。

DOM 长度随页面脚本、布局、动画时间变化，不作为固定快照合同。

## 五级内容复测

使用 `scripts/eval-page-ladder.mjs`，每例校验最终站点、内容标记、DOM、截图与主文档状态；不是发布门禁。最近一轮：

| 内容 | 主文档 | 导航耗时 | 总耗时（含截图/诊断） | DOM 字符 | 连接重建 |
|---|---:|---:|---:|---:|---:|
| example.com 静态页 | 200 | 1.42s | 1.83s | 1,979 | 0 |
| IANA CSS/小脚本 | 200 | 3.68s | 7.80s | 5,085 | 0 |
| RFC 2616 长文档 | 200 | 2.45s | 2.69s | 513,194 | 0 |
| react.dev 框架水合 | 200 | 4.99s | 11.82s | 266,970 | 0 |
| archy.studio 动画页 | 200 | 7.43s | 17.75s | 37,563 | 0 |

各例都有非空截图，五例通过。这个样本不能推导“任意网站均兼容”，也不能拿外站的 403 当作某一复杂度阈值。

## 最小修复

- CDP 分方法截止：普通 20s，导航 45s，截图 30s；命令超时只结束本次等待，不杀 socket、不自动导航重试。
- 实际 close/error 才标连接死亡；ensureClient singleflight；显式导航串行；忙时不做破坏性的存活判定。
- `/open` 规范 HTTP(S) 地址，等待真实导航结果，传播 `errorText`/异常，只有成功才记录地址。
- 面板只发一次导航、一次截图；HTTP 截止晚于 CDP 截止；移除未取消的截图竞速、重复确认和自动重发。
- 回归测试：DNLS 130 项、DNK 71 项通过，包括慢响应、晚回包、并发获取连接、无文档及导航错误结果；已中止的排队请求不会滞后跳页。

## 候选 pin 评估

只读比较了 `.dependencies/eval/kitesurf` 的 `39feadfb9a3e6c14b40cf170a559ce417d0fce5d`，与登记 pin `5770ee1e6b1f631f20f89ea2bf384c8f753fd3b4`。候选的 CDP page.ts 没有解释本次失败的必要差异；有 worker 回收/GC 启动配置变化，并且不含本地历史 KV 路由，需独立验证消费者再晋升。本轮未 repin、未改引擎构建、未更换容器资源。

当前容器仍挂载旧 context checkout 的事实与依赖 manifest 的迁移要求是另一个待办，不能假称本轮已经切换 pinned 执行来源。

## 交付状态

修复保留在 `kitesurf-engine-lab` 工作树，仅部署 dsh-dev。未合并 main，未覆盖正式版或桌面版。未新增发布门禁、版本对账或强制全插件部署。
