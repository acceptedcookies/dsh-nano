# DNK review-03 修复工作计划

> 2026-11-13 · 依据 `docs/code-review/26-nov/review-03.md` R1–R24。
> 原则：每条修复先核爆炸面（谁依赖、谁受影响），选长期治理方案，不做 hotfix。

## 治理原则映射

- 共享件改源不改拷：`route-guard` 改 `packages/dsh-host-route-guard/src`，DNK 重新打包自己的 bundle。
- 合同一处生效：`allowRemote` 同一条规则同时约束 `Config.validate`（加载期）与 `configure`（运行期），不两份。
- 错误一条分类链：`KitesurfError.id` 是唯一权威，HTTP 状态由 id 前缀映射，输入校验一律抛 `KitesurfError`。
- 安全默认收敛：fail-open → fail-fast；无鉴权监听 → Origin allowlist + 回环发布 + 资源上限。
- 文档单源生成：`SKILL.md` 由 `lib/skill.js` 构建期生成，杜绝运行时/文件两份漂移。

## 修复清单（爆炸面 → 长期方案）

| R | 修复 | 爆炸面核查结论 | 长期方案 |
|---|------|----------------|----------|
| R1 | files + 构建校验 | `index.js` 顶层 import；pack 即崩 | `files` 补 `lib/perf-host.js`；`build-client.mjs` 静态校验 index.js 的 `./lib/` import ⊆ `files` |
| R2 | allowRemote enforcement | 业主曾用 `10.0.0.8` 远程——保留远程能力但收合同 | `createNanoKite({allowRemote})`；`configure` 远程→`kitesurf.kite.remote`；profile 配 `allowRemote:true` 可用远程 |
| R3 | MCP 桥重写 | host `-p` 才能到容器 → 不能绑容器回环；但可绑宿主回环 `-p 127.0.0.1:` | 导出 `createBridge`：Origin allowlist（缺 Origin 放行非浏览器、错 Origin 拒绝）、0x0 重组、ping→pong、close 回握、帧≤1MB、连接≤8、idle 10min、stdin 背压、`/health` 去 `cdp`；entrypoint 加 supervisor 循环 |
| R4 | 选框可见 | render 期读 DOM + `placed` 绑 `pick` | `contentRect` 移 `useLayoutEffect`+`ResizeObserver`，`placed` 不依赖 `pick` |
| R5 | arrow/页根备注 | arrow 无 box → overlay null → form 不渲染 | arrow 用 from→to 推盒；form 只依赖 `pick`；零 box 不画 8px 幽灵 |
| R6 | 弹层拦事件 | `onClick` 拦不住 `pointerdown` | `.nks-note` `onPointerDown/Move/Up` 全 `stopPropagation` |
| R7 | 不自动导航 | AGENTS.md「不要」+ 抢占引擎页 | 挂载只 `status`；`ok` 则 `shot` 复现当前页（不导航）；地址留空 |
| R8 | 设置回填 | 每次保存强制 1280/清 UA | 用 `status.userAgent/viewport/kite.*` 播种；未改不发送；`viewport:'default'`→`null` |
| R9 | fail-fast | 共享包改源，4 插件受影响——但只在各自重建时生效 | `requestRejection` 非 function → `RouteGuardError('no-request-rejection')`；DNK 重建 bundle |
| R10 | 技能不烤地址 | `configure` 热生效 vs 文本死地址 | 技能教读 `GET /status` 取 `kite.cdp`，不烤字面量 |
| R11 | 负面指令+mcpPort | `agent-browser close` 会清空共享页 | 补禁 `close`/`--pin-tab` 不适用、`mcpPort`=`ws://host:mcp/mcp` 桥语义、suspend 丢页 |
| R12 | 台账重审 | 与 explorer 同型路由对齐 | `/last`/`/pick`/`/shot`→L2 `read:host`；`/settings`→L1 `write:kitesurf`；`/perf-review`→L2 `read:host`+accepted-risk；`/kite`→L2 `proc:local-sandbox`（init 写锁+start 起容器）；route-scan 注释改 Eight |
| R13 | 相位机 | `suspended→start` 绕过 resume；suspend 失败假态 | `start` 仅 `idle`；`sleepEngine` 容忍 `no such container`；头注更正 |
| R14 | 错误分层+bodyLimit | 4xx 语义丢失 + 裸 Error 折叠 | `fail()` 按 errorId 前缀映射 400/409/413/502；校验全抛 `KitesurfError`（新 id `kitesurf.body.*`/`kitesurf.pick.point`/`kitesurf.shot.scroll`/`kitesurf.navigate.failed`/`kitesurf.engine.connect`）；`spec.bodyLimit` 显式 + handler 读 `route.bodyLimit` |
| R15 | 重试边界 | 任意错误整体重跑 → 二次导航 | 错误分类：transport（connect/closed/timeout）才重试；CDP 域错误/业务错误直抛 |
| R16 | 容器收敛 | wrangler dev 需写态 → mount 不能简单 readonly | `--persist-to /tmp` + `,readonly` + `USER node` + `127.0.0.1:` 回环发布 + `DEFAULT_CHECKOUT` 删默认改 `KITESURF_CHECKOUT` 必填 + inspect 端口复核（best-effort） |
| R17 | errorText 抛错 | `net::ERR_*` 静默成白图 | `errorText` 非空→`kitesurf.navigate.failed`；`waitForHref`→`waitForPage` 容忍重定向 |
| R18 | SKILL.md 单源 | 无 frontmatter + 副本漂移 8787 | `build-client.mjs` 由 `lib/skill.js` 生成两份 SKILL.md（含 frontmatter） |
| R19 | 引擎特征 | 8787 可能是 Chrome | `useLive` 首连前 `/health` 验 `kitesurf*` 文本 → `kitesurf.engine.mismatch`；status 加 `engineMismatch` |
| R20 | 死代码 | 腐化面 | 删 `settingsOpen/onSaveAgent/.nks-settings/client VIEWPORTS`/`withCdp`/`pageFacts`/`assertPhase` |
| R21 | 质量缝 | 语义小漂移 | `lastError` 任一写路由成功即清；`/status` 的 `kite` 只回 `{phase,httpBase,mcpPort,cdp}`（不带 lock）；`?mode=window` 限 POST；`kite`/`bringUp` 加 span；perf 版本动态读 |
| R22 | UI/AX 一批 | 交互小坑 | wheel ref 节流去 preventDefault；`setPointerCapture`；radiogroup→`role=radio`+roving tabindex；删 toast 重抄；pins 可删+计数；status 失败后重取；`copyFor`+`inject locale`；对话框 form/autofocus/单例；`.nks-go` 常显 dirty；busy 加 `role=progressbar` |
| R23 | 文档漂移 | 「标签」承诺 vs 无 tab 条 | 实现「最近地址」`openNanoMenu` 历史（≤8 条，选中即导航）对齐「记住多个地址」；AGENTS.md 路由表补 settings/kite/perf |
| R24 | 杂项 | 多点小缝 | UA 空不 override（`userAgentApplied`）；init 先查 Node 再读锁；`dirname` 兼容 `\`；bringUp 注释 ~100s；技能注明坐标 DSF=1；`kite.container` 报文去路径；`mcp-bridge` 单测；`ssh-key` contract 行 |

## 顺序

1. `packages/dsh-host-route-guard`（R9）
2. `lib/engine.js`（R14/R15/R17/R19/R24）
3. `lib/nano-kite.js` + `lib/container-engine.js`（R2/R13/R16/R19/R24）
4. `runtime/`（R3/R16/R24）
5. `index.js`（R1/R14/R17/R21 + wiring）
6. `lib/skill.js` + `skills/` + `scripts/build-client.mjs`（R10/R11/R18/R1）
7. `src/client/`（R4-R8/R22/R23）
8. `security/` + `scripts/` + `feature-contract`（R12/R24）
9. `AGENTS.md` + tests + `npm test && npm run build`
10. ≤2 子代理二审 → 修复循环
