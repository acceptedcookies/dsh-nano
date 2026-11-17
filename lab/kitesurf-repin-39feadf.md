# 官方 Kitesurf 39feadf repin 与 DNLS adapter 实测

## 本次原则

依据[业主]本轮决定，Kitesurf pin 必须是官方 commit 原样源码：不能修改上游源码、加本地 commit 或把本地 patch 混入 pin。构建在独立派生目录，行为差异放 DNLS/DNK driver/adapter。每次 repin 回顾这些适配并做针对性兼容实验；不是新增发布门禁或跨包版本对账。

原则唯一真源：[AGENTS.md](../AGENTS.md)。本文件记录本轮实施和实验，不另立合同。

## 身份与来源

- 官方 SHA：`39feadfb9a3e6c14b40cf170a559ce417d0fce5d`。
- `git archive` SHA-256：`363d62a0068cccef39cfeef2bf690ea34fc3f0a446f499b1192a2790bbd14586`。
- 2,005 个官方文件逐个与该 commit 核对一致；派生 build 的所有官方文件也与 pin 字节一致。新增 Wasm/bundle/node_modules 仅存在 build/runtime，不回写 pin。
- manifest 中的 source-tree identity：`573317a75918b445b4af29f1f8164a3d30afbf59c014bc73a1535f6babc0c9f3`（排序后的 path + NUL + SHA256 行聚合）。stage 必须匹配 manifest 批准的 ref/tree，不能给错误来源贴新 SHA receipt。
- 当前工作树的 [manifest](../.dependencies/MANIFEST.json) 已 repin；没有改根仓另一个工作树的旧依赖 archive/context。
- [配方](../dsh-nano-local-sandbox/profiles/kitesurf/profile.yaml) 使用 Wrangler `4.131.2`，与上游锁一致；image tag 同时含官方 SHA 与配方摘要前缀，避免同 upstream pin 改配方后误 adopt 旧容器。
- 最终 image：`kitesurf-engine:39feadfb9a3e6c14b40cf170a559ce417d0fce5d-665716c07c13`。
- 配方摘要：`sha256:665716c07c13d435d0693a60f0e982b8f381b7ff78e40c0510279795bd94bac9`。
- 实际构建 image manifest list digest：`sha256:d4cfcf2148175218d1fea27305670f1ed095c60b5b8967402a3023a0f831fdcf`。

## 消融旧本地补丁

| 旧需求/补丁 | 处理 |
|---|---|
| engine `/history` GET/POST/DELETE 与 `KITESURF_HISTORY` KV | 不带入官方 pin。没有当前有效消费者依赖此 HTTP 实现。 |
| dirty `DELETE /history?url` | 删除依赖，DNLS driver 对 canonical `session.history` 执行按 URL/稳定 ID 删除。 |
| DNK `engineHistory*` 死函数/import | 已删除，不再暗示 engine KV-first。 |
| 历史列表/搜索/清空/计数 | [history adapter](../dsh-nano-local-sandbox/src/host/browser-history-adapter.js)，仅使用 session 原数组，不新建 KV/第二历史文件；不宣称已导入旧 KV。 |
| 浏览器跨文档后退/前进 | 官方 `Page.getNavigationHistory/navigateToHistoryEntry`，45秒预算、同会话串行；随后观测页面真实URL，不把被上游吞掉的错误当成功。 |
| viewport/UA/media/headers | [settings adapter](../dsh-nano-local-sandbox/src/host/browser-settings-adapter.js)，支持 width-only、固定viewport优先、null恢复auto-fit；严格校验，全成功后提交，失败补偿，不改上游。 |
| 慢导航误杀连接 | 保留上一轮 driver 修复；不把超时等同 socket 已死，不做导航自动重放。 |
| miniflare 需要可写 cf cache | 入口脚本将 `CLOUDFLARE_CF_FETCH_PATH` 指向 state volume，不修改引擎源码。 |
| GC | 入口脚本追加 `MINIFLARE_WORKERD_V8_FLAGS=--expose-gc` 且保留调用方其它 flags。页面/worker 不暴露 gc。 |

## 构建与启动

完整官方 `bazel run //packages/engine:dev_build` 成功（3,046 actions）。下载慢导致两轮 Cargo repository 600秒截止；最终通过 Bazel 官方 `--experimental_scale_timeouts=4` 完成，未改 build 源码。Node依赖 frozen lock安装，无改锁。

[stage工具](../dsh-nano-local-sandbox/scripts/stage-kitesurf-runtime.mjs) 从官方 pin 与同 SHA build 生成独立 runtime，并写只含身份/hash的 receipt。Apple nested tmpfs mountpoint `.wrangler` 作为生成目录预建，避免只读bind上创建目录失败。

[镜像构建工具](../scripts/build-kitesurf-image.mjs) 通过已安装宿主真实 `ctx.sandbox.confine` / LocalSandboxProvider，显式给 image-context 和 Apple container state scoped write roots。没有裸 spawn 降级。CLI调用仍仅在 backend-apple。

runtime 来源已从旧 context 切为 `$DSH_HOME/artifacts/kitesurf/<sha>/runtime`；默认不再 `latest`。一键准备会比较实际 image/runtime/resources；先验证新runtime和本地image，再stop/remove/create，保留原state volume及端口。缺runtime或image不会删除旧容器。

## 验证结果

- DNLS 完整单元/合同测试：203/203（含缺镜像不销毁旧容器、history 吞错、source provenance 负例）。
- DNK 完整单测：71/71。
- 官方 `bazel test //:check`：26/26，通过；首次遇npm包EOF，后续helper 60秒超时，缓存预热及显式300秒预算后全过，无改测试期待。
- 官方专项 e2e：4文件11/11（GC对页面/evaluate/worker隐藏、Promise身份、ShadowRoot构造样式表、SVG mask像素）。
- dsh-dev真实driver五级：全部通过，见下表。
- 7项集成：跨document后退/前进、history投影/删除、固定viewport不被fit覆盖、null恢复auto-fit、最终engine+DOM ready均通过。
- ego-browser：实际地址栏输入裸 `archy.studio` → Enter，有单个loading heartbeat；最终loading=0、HTML iframe标题正确、无错误dialog；环境设置异步完成后OK，dialog固定560px；真实鼠标点选出现清除按钮与inspector，Escape后均消失。最终宿主重启后 recover 返回200/action=noop/ready=true，未再次重建容器，HTML标题仍为Archy。

| 样本 | 文档HTTP | DOM | 截图 | 导航耗时 |
|---|---:|---:|---:|---:|
| example.com | 200 | 1,979B | 169,431B | 2.43s |
| IANA example domains | 200 | 5,085B | 197,145B | 13.67s |
| RFC2616 长文档 | 200 | 513,194B | 193,275B | 3.59s |
| react.dev | 200 | 266,970B | 76,764B | 2.03s |
| archy.studio | 200 | 37,912B | 120,333B | 10.49s |

五级期间 `cdpGeneration=1` 全程不变；该1来自本次主动升级旧container，不是导航中重连。

### 小规模持续导航，不夸大内存结论

独立lab容器、4c/4GiB、2条连接各20次交替 example/IANA，累计40/40成功，无CDP异常，每页有HTML/title、gc不可见。container stats内存：初始0.956GB，最高采样1.555GB，关闭连接后短时1.521GB。这里是容器resident usage，不是引擎V8 heap；不把它当作已证明内存平坦或长期无泄漏，更不等同上游940页实验。lab容器实验完成后已停止，未动prod/desktop。

## 开发实例边界

仅部署 dsh-dev 的 DNLS/DNK，重启已有launchd宿主并刷新原 `https://dsh-dev.local`；未起替代Web服务器。prod/desktop未切换，也未自行重启桌面应用。

早期既有未隔离lifecycle测试曾写桌面last-page为example.com，原值未知未擅自猜测恢复；已修fixture使用临时state目录，后续suite全部隔离。

ego首次访问因本机proxy尚未就绪失败，同一task space恢复后成功；未升级ego。工具提示Ego Lite可更新（需[业主]另外授权，不在本任务内自动升级）。
