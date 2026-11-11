# test/spike/security-fix — 26-nov 安全加固 spike 宪章

> **一句话定义**：验证安全加固（三共享包 + 43 路由 guard + schema/policy/加固）在真实宿主上「不引入功能回退、PoC 真被拒」——每批收口用 live journey 实测，不用单测自证。spike 只产事实，不改任何包源码、不改合同。

| 锚 | 值 |
|---|---|
| 建档日期 | 2026-11-11 |
| 验证实例 | `https://dsh-dev.local/`（ego-browser 真 Chromium + 真插件宿主 + 真 IndexedDB）· fake S3（`scripts/security-regression/lib/fake-s3.mjs`）· loopback server |
| 上游真相 | `docs/plan/security-fix/26-nov-security-hardening.md`（AP，B 测试矩阵 §4）· `security/route-sensitivity.json`（43 行）· `security/feature-contract.json` · `.anote/security-26nov`（PoC 语料，baseline-RED 参照）· 各插件 `index.js`/`src/host/routes.js` |
| 证据上限 | 本 spike 不承诺性能回归量级、不承诺真实公网攻击面（请求需已认证 Peer）；只回答「每批门禁在真宿主/真数据上是否 PASS + PoC 是否真被拒」 |

**边界声明**：不改 `dsh-nano-*/src/**`、`packages/dsh-*` 任何文件、profile 配置。所有实验通过已认证页面 `fetch`、fake S3、loopback server 或 `evaluate` 观测。`dsh.local` 禁碰。外发仅 `GET`，只打宪章声明的目标。灌入的测试数据（S3 样本、IDB 记录）验完即删，会话还原。

---

## §1 判读门槛（跑前写死，跑完不挪）

| 门槛 | 值 | 适用 |
|---|---|---|
| **PoC 拒绝判据** | 断言 = 「宿主副作用 oracle **未**被触发」**且**响应是 `{ok:false,reason}` 家族；**不算**「请求没抛异常」 | 所有 security-regression 用例 |
| **baseline-RED 锚** | 每条 security PoC 在**加固前** HEAD（`90ac6b6`）必须可执行（RED）；加固后同 PoC 必须拒绝（PASS）。先证明它曾经真打中 | 全部 B1/B3/B4 PoC |
| **回归判据** | 与加固前 `feature-contract.json` 零漂移：同一路由、同方法、同 bodyLimit、同 UI 入口、同数据位置 | 每批门禁 |
| **功能零回退** | 每批门禁含「核心功能 smoke 无回退」：notepad 保存/读/fetch-mp/s3、explorer 树/git、nsw 工作区/session、model-selector catalog/media | 每批 + B5-T03 |
| **compat 样本** | 真桶导出（禁自生成自证）、N≥K 覆盖 manifest/files/images/marker/session-meta/tree-head 六类、100% 通过 v1 | B1-T07 |
| **确定性** | security-regression harness 连跑 N≥3 结果一致 | B5-T05 退出硬闸 |

## §2 用例锚点（Test-ID → 用例 → 锚点文件）

| Test-ID | 断言 | 锚点（本宪章 → 真实文件） |
|---|---|---|
| `B0-T05` | 43 路由经 guard 可达且行为不变 | 本宪章 §3.1 |
| `B1-T03` | nsw remote-cross 6 fingerprint 逐条拒 | `scripts/security-regression/cases/` |
| `B1-T06` | fetch-mp 30x 逐跳复验 | loopback server in `scripts/security-regression/` |
| `B3-T02/T03` | 客户端+宿主 sanitize 负向 0 执行 | `fixtures/` + offline DOM |
| `B3-T08` | mp 文章正向渲染快照 | `fixtures/mp-article.html` |
| `B4-*` | P2 加固（mutate realpath/git add/scopeOf/grok-creds） | `scripts/security-regression/cases/` |
| `B5-T02/T03` | tarball 隔离安装 + 全 smoke | 本宪章 §4 |

## §3 过程 / 结论

### §3.1 B0-T05 — 43 路由 guard 注册 smoke（2026-11-11）

| 方法 | 结果 | 终态 |
|---|---|---|
| `dsh-dev restart` 后对每插件代表路由带 token `fetch` | `/nano-notepad/s3/status` `/nano-explorer-extra/status` `/nano-shared-workspace/status` `/nano-shared-workspace/workspaces` `/nano-model-selector/catalog` `/nano-model-selector/media-engine` 全 → **401**（registered + requestRejection 拒绝未认证） | `ego PASS` |
| 未登记路由 `/nano-notepad/bogus` | **404**（guard 未挂） | `ego PASS` |
| `GET` on `POST /nano-notepad/save` | 401（先过 gate） | `ego PASS` |
| `node scripts/check-route-sensitivity.mjs` | 43 routes, 0 drift | `offline PASS` |
| `node scripts/check-feature-contract.mjs` | PASS | `offline PASS` |
| `node scripts/check-clean-lib.mjs` | 16 artifacts, 0 bare specifiers | `offline PASS` |

**结论**：43 路由全部经 `dsh-host-route-guard` 注册，Host/Origin fence + 认证 Peer 生效（未认证 curl→401），未登记→404，方法/错误形状在 guard 内统一。零功能回退在后续批门禁继续验证。

*（后续批的 spike 结论按本宪章 §3.N 追加；终态词只写 `ego PASS`/`offline PASS`/`RED`/`NOT_RUN`/`deferred` + 原因）*
