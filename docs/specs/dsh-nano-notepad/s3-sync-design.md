# dsh-nano-notepad × S3 同步 — 设计分析

状态：草案（待业主确认 P0 范围与凭据来源）
日期：2026-11-11

## 0. 现状基线

| 层 | 现状 |
|---|---|
| 真源 | 浏览器 IndexedDB `dsh-nano-notepad`（每浏览器源一份）：`nodes`（文件/文件夹元数据+draft）、`versions`、`images`、`settings`、`ui`、`blobs` |
| 宿主 | `index.js` 只有三条路由 `/read` `/save` `/fetch-mp`，全部 `POST` + `connection.requestRejection` 准入 |
| 宿主凭据 | `inject = [webServer, connection, subprocess]`；`Config` 仅 6 个面板默认值；无状态目录、无 secrets 通道 |
| 同步 | BroadcastChannel 只协调**同源多标签页**；无远端 |
| 体积 | 图片单张 ≤20MB 可配；草稿无硬上限（save 路由 8MB） |

关键约束：密钥不能进浏览器。所有 S3 访问必须走宿主代理 + 宿主侧 SigV4 签名（不引 AWS SDK，SigV4 约 80 行，符合本仓「无外部依赖」惯例——fetch-mp 已内置重写的 sanitizer）。

## 1. 目标拆解（业主三点）

1. **持久化**：把 IndexedDB 全量内容镜像到 S3，获得云端 durable 落点。
2. **双向同步**：启用后 S3 为真源，本地为缓存；本地写→推；远端变→拉。
3. **配额治理**：rate-limit + 桶用量统计。

## 1.5 分层：通用 `dsh-s3-client` 包

SigV4 签名、令牌桶限速、JSON 用量账本与 notepad 的同步语义完全正交，且 `dsh-nano-shared-workspace` 也要用 S3 端点——抽成 `packages/dsh-s3-client/`（已落地，14 个 `node --test` 测试，含 AWS 官方 sig-v4 向量）。**包内只做**：请求签名（虚拟主机/路径两种寻址）、ListObjectsV2 分页、`If-Match` 条件写、ETag、`createRateLimiter`、`createLedger`。manifest/墓碑/key 布局、游标、冲突策略、凭据来源留在 notepad 的 `lib/s3-sync.js`。shared-workspace 复用时零 SigV4 重复。

## 2. 总体架构

```
浏览器 client (IDB)  ←→  宿主 s3-sync 引擎 (index.js)  ←→  S3
        ↑  本机状态/游标            ↑ dsh-s3-client (签名/限速/账本)
```

- **通用层 `packages/dsh-s3-client/`**：`client.js`（`createS3Client`）、`sign.js`、`rate.js`、`ledger.js`。
- **notepad 专属 `lib/s3-sync.js`**：凭据解析（env/Config）、manifest 合并、游标持久化、push/pull 路由业务。
- **宿主路由**（复用 `requestRejection` 准入）：
  - `POST /nano-notepad/s3/config` — 读/写连接配置（secret 只在请求体进，永不回传明文；回传 `hasSecret`）
  - `POST /nano-notepad/s3/pull` — `{since}` → 拉远端 manifest + 指定对象
  - `POST /nano-notepad/s3/push` — `{ops:[{put|delete, key, sha256, bytes}], payload?}` → 宿主代签上传
  - `GET  /nano-notepad/s3/status` — 游标、待传队列、限速器水位、用量统计、最近错误
  - `POST /nano-notepad/s3/test` — 连通性自检（HEAD bucket + 写一个 `_probe` 对象再删）
- **客户端**：`src/client/sync.js` 新模块——本地变更队列、拉取应用器（真源语义下：远端覆盖本地，本地未推完的进「冲突副本」）、状态条展示。面板加「云同步」tab（复用刚交付的 nanoTabs）。

## 3. 远端对象布局（bucket 前缀可配，默认 `nano-notepad/`）

```
<prefix>manifest.json            # 唯一真源索引：{rev, files:{id:{name,parent,ws,kind,sha256,bytes,updatedAt,deleted}},images:{hash:{bytes,mime}},settings?}
<prefix>files/<nodeId>.body      # 草稿原文（.md/.json/.html 一律按字节存，客户端自己知道类型）
<prefix>images/<sha256>          # 内容寻址，天然去重
<prefix>meta/node-<nodeId>.json  # 节点元数据（name/parent/workspace/kind/sourcePath/mp）
```

- **单 manifest 而非每文件索引**：节点数小（百级），一次 GET 全量 diff 最简单；写入走 `GET manifest → 合并 → PUT`，用 `rev` 单调递增。
- **乐观并发**：`PUT manifest` 带 `If-Match: <etag>`（AWS、MinIO、CF R2 支持；部分 S3 兼容服务不支持 → 降级为「写后重读校验」，多写入者场景本来就不支持，文档声明单写入者）。
- **删除语义**：manifest 里 `deleted:true` 墓碑 + 对象延迟回收（宿主清理任务，30 天或下次全量 GC），防误删即焚。

## 4. 双向同步语义（S3 为真源）

| 方向 | 行为 |
|---|---|
| 本地写 | 客户端把变更（草稿、节点元数据、图片）入 `syncOutbox`（IDB 新 store），防抖后 POST `/s3/push`；宿主序列化上传，成功后更新 manifest rev 并回执 `rev` |
| 远端变 | 轮询 `GET manifest`（默认 30s，可配 10–300s）；`rev` 前进则按 diff 拉 body，**覆盖**本地（本地未推变更自动另存 `xxx (local conflict).md` 文件后让位） |
| 离线 | outbox 堆积；状态条转灰「离线 N 项待传」；恢复后顺序续传 |
| 首次启用 | 三选一引导：①上传本地→覆盖远端 ②下载远端→覆盖本地 ③合并（按 updatedAt 逐文件取新，冲突出列表让用户挑） |

「真源在 S3」意味着：启用后本地 `delete`/`clear` 类操作也按远端裁决回放；BroadcastChannel 的旧「远端来了就 reload」逻辑要让位给 S3 游标（同源多页仍由 BC 广播 `rev` 提示拉取即可，不另开通道）。

## 5. Rate-limit 与用量统计

实现由 `dsh-s3-client` 的 `rate.js`（令牌桶）+ `ledger.js`（JSON 账本）提供；notepad 侧只配默认值：

| 维度 | 默认 | 配置键 |
|---|---|---|
| 请求速率 | 10 req/s，突发 20 | `s3.maxRps`, `s3.burst` |
| 上传带宽 | 512 KB/s | `s3.maxUpKbps` |
| 每日上传配额 | 200 MB | `s3.dailyUpMb` |
| 并发 | 2 | `s3.concurrency` |

超限：`/s3/status` 暴露 `throttled:true, retryAfterMs`；客户端状态条显示「限速中」。
用量账本：宿主状态文件 `<profile>/nano-notepad/s3-ledger.json` 累计 `{objects, bytes, dailyUp, monthlyOps}`，桶用量 = `LIST ?list-type=2` 周期聚合（10min 缓存）+ 本地账本增量修正。面板「存储」tab 加云用量行（复用 `.np-usage-chip` 样式）。

## 6. 凭据与安全

- Config 新增字段：`s3.enabled`、`s3.endpoint`、`s3.region`、`s3.bucket`、`s3.prefix`、`s3.accessKeyId`、`s3.secretKey`、`s3.sessionToken?`、上表限速键。
- **secret 不进浏览器**：面板只显示 `accessKeyId` 与 `hasSecret`；secret 经 `/s3/config` POST 写入宿主 ledger（`chmod 600`）或优先读 `DSH_NP_S3_SECRET` 环境变量。建议第一版只支持环境变量 + profile patch 直配，UI 只读展示，减少落盘面。
- TLS 强制（endpoint 必须 https），路径风格可配（virtual-host vs path-style，MinIO/兼容服务需要）。
- 所有路由沿用 `requestRejection`；`/s3/*` 一律 POST（除 status 可 GET）。

## 7. 里程碑

| 阶段 | 内容 | 验收 |
|---|---|---|
| **P0 管道** | `dsh-s3-client` ✅ 已落地（14 tests）+ Config schema、env 凭据、`/s3/test` 自检、`/s3/status` 骨架 | `dsh-dev` 重启后 `/s3/test` 对真实桶 200 |
| **P1 单向持久化** | outbox、`/s3/push`、manifest 写入、图片上传、错误重试（指数退避） | 面板开「备份到 S3」后改文件，桶里 manifest rev 递增、对象齐全 |
| **P2 双向真源** | `/s3/pull`、轮询游标、冲突副本策略、首次启用三选一、删除墓碑 | 两台浏览器（或两 profile）互改可见；拔网恢复后续传 |
| **P3 治理** | 令牌桶、配额拒绝、ledger、`/s3/status` 完整化、面板云用量行、限速态文案 | 压测超 quota 返回 retryAfter，用量行与 `aws s3 ls --summarize` 对账 |
| **P4 打磨** | GC 墓碑回收、冲突列表 UI、带宽自适应、spec 文档 + AGENTS.md 更新 | ego E2E 全链路 + 零 console error |

依赖序：P0→P1 可独立交付价值（云端备份）；P2 才引入「真源」心智，必须等 P1 上传链路稳定；P3 可部分提前（令牌桶骨架在 P0 就位）。

## 8. 主要风险与决策点

1. **S3 兼容性参差**：`If-Match`、对象 tag、list-type=2 在兼容服务（R2/OSS/MinIO 旧版）上不全 → manifest 合并做「写后重读」兜底；decision：声明 AWS/MinIO≥RELEASE.2023 / R2 为受支持面。
2. **凭据形态**：env 变量 vs UI 可写。建议 P0 只 env；UI 写 secret 涉及宿主加密落盘，单列 P4 或不做。
3. **manifest 单点**：多写入者会丢 rev 竞争 → 明确「一个 profile 一个写入者」，多浏览器标签页由本 profile 宿主串行化，天然安全；跨 profile（dsh.local vs dsh-dev.local）共桶要分开 prefix。
4. **图片体量**：单图 ≤20MB×张数，P1 上传用 presign-PUT 直连会更快——但签名要算在宿主，第一版直接走宿主转发（流量小，简化）。如桶在公网而宿主在内网，P4 评估 presign。
5. **「真源」语义对用户是破坏性的**：本地未推送编辑会被远端盖 → 冲突副本兜底 + 首次启用强制三选一，UI 常显「云端为准」态。
6. **限速实测**：rate-limit 只对客户端自觉生效；真正的服务端防护靠 IAM policy（bucket policy 限 IP/前缀），文档给出示例 policy。

## 9. 实测拓扑与已就绪的测试环境（2026-11-11）

经 wg0 隧道 SSH 到 shv1 实测确认（非推测）：

```
Mac (10.10.0.3) ──wg0──┐
                       ├── shv1.saobao.com  VM-0-4-ubuntu  wg0=10.10.0.1:51820
spark (10.10.0.2) ─────┘        内网 eth0=10.0.0.4/22  公网 49.235.109.23
                                   │
   客户端 ──HTTPS──> Cloudflare ──> nginx:443 ──> minio 127.0.0.1:9000 ──> /data/minio
                    nano-shared-workspace.saobao.com
```

- `shv1.saobao.com` 是 WireGuard **中心节点**（`wg0 10.10.0.1/24`）；本机 Mac `10.10.0.3`、局域网 `spark` `10.10.0.2` 是两个 peer。SSH 走 `10.10.0.1:22`（wg0）与公网 `49.235.109.23:22` 都能到同一台上海云主机。
- MinIO：`/usr/local/bin/minio server /data/minio --address 127.0.0.1:9000 --console-address 127.0.0.1:9001`，systemd `EnvironmentFile=/etc/minio.env`，`MINIO_REGION_NAME=shv1`，版本 `2025-07-23`。
- nginx vhost `nano-shared-workspace.saobao.com` 把 443 `proxy_pass` 到 `127.0.0.1:9000`。**因此是 path-style 寻址**：bucket 在 URL 路径里，`dsh-s3-client` 必须 `pathStyle: true`（不是 virtual-host）。
- 凭据模式：每个 bucket 一个 `s3:*` 限定 policy；`.env.s3` 的两把 `nsw*` key 是 root `s3admin` 的 **service accounts**（`Policy: embedded`）。

**已创建的 notepad 测试资源**：

| 项 | 值 |
|---|---|
| bucket | `dsh-nano-notepad-test` |
| service account | `np53fe229559df52`（`ParentUser: s3admin`，embedded policy 仅授权该 bucket） |
| endpoint / region | `https://nano-shared-workspace.saobao.com` / `shv1` |
| path-style | `true` |
| 配置 | `.env.s3` 的 `S3_NOTEPAD_*` 段（git-ignored） |

`dsh-s3-client` 已对真实链路实测通过：`test()`（PUT/DELETE probe）、`putObject`/`getObject`（ETag 一致）、`headObject`、`listObjects` 全部成功；探测对象已清理，bucket 现为空。单测 15/15 通过（新增 `test()` 单前缀回归用例）。

## 10. 专用子域名与功能落地（2026-11-11）

### 专用 endpoint

| 项 | 值 |
|---|---|
| 子域名 | `nano-notepad.saobao.com` |
| DNS | Cloudflare A `49.235.109.23`，`proxied=true`，ttl 1（id `25d6b48edb60c782ef058b34c1942b03`） |
| 证书 | Let's Encrypt ECDSA，certbot **webroot** `/var/www/acme`，2027-02-09 到期，自动续期已注册 |
| nginx | `/etc/nginx/sites-available/nano-notepad` → 443 `proxy_pass http://127.0.0.1:9000`，`client_max_body_size 512m`，`proxy_buffering off`；80 段供 ACME + 301 |
| 寻址 | path-style（bucket 在 URL 路径里） |
| 链路 | 客户端 → Cloudflare → shv1 nginx:443 → MinIO `127.0.0.1:9000` → `/data/minio` |

创建方式：cf CLI 以 `CLOUDFLARE_API_TOKEN` 环境变量注入（详见 `.env.s3` 顶部注释）；80-only vhost 先上 → `certbot certonly --webroot -w /var/www/acme -d ... --key-type ecdsa` → 补 443 → `nginx -t && systemctl reload nginx`。本机实测 DNS、HTTP-01、公网 HTTPS（未签名 403）、`dsh-s3-client` 全链路 PUT/GET/HEAD/LIST/DELETE 通过。

### 已落地的代码

| 层 | 文件 | 内容 |
|---|---|---|
| 通用库 | `packages/dsh-s3-client/` | SigV4、令牌桶、ledger、weak-ETag 规范化；16 个单测 |
| 宿主引擎 | `dsh-nano-notepad/src/host/s3-sync.js` → bundle `lib/s3-sync-host.js` | 配置加载（env 优先 + `${DSH_HOME}/nano-notepad.env` 回退）、签名代理、限速、账本、状态；dev 实例只拷 `lib/` 不拷 `node_modules`，故必须 bundle |
| 宿主路由 | `index.js` | `POST /nano-notepad/s3/status` `/test` `/object`（op: put/get/head/delete/list，body 走 base64，32MB 上限），全部过 `connection.requestRejection` |
| 客户端 | `src/client/sync.js` | manifest（`{rev, files, images}`）+ ETag CAS、双向 diff、冲突安全（先应用远端再 push）、防抖 push、轮询 pull |
| 持久化 | `src/client/db.js` | DB_VERSION 3→4 新增 `sync` store、`s3Enabled`/`s3IntervalSec` 设置、`applyRemoteFiles`/`putImageFromRemote` |
| UI | `panel.js` / `i18n.js` | 设置第 5 个「云同步」tab（开关/间隔/状态/用量/测试连接/立即同步）、footer 独立状态 chip、点击直达设置 |

### 端到端验证（真实 GUI + 真实 S3）

- 设置持久化：启用后 IDB `settings.s3Enabled=true`，reload 保持；`sync` cursor 正常写入。
- 单向：启用后自动上传 6 个文件对象 + manifest，chip「已同步」，ledger 记账 `put/get`，`lastError:null`。
- 双向：从 S3 注入 rev+1 与新文件 → `cloudCycle()` → 本地文件树出现 `cloud-pull-test-0003.md`，manifest 保持 rev 2/7 files 不被覆盖。
- `__errs: 0`（全程 ego-browser 真实鼠标）。

**过程中修掉的四个真实缺陷**：
1. `index.js` 把宿主 `null`（对象不存在）coerce 成 `{ok:true}`，客户端 `atob(undefined)` 崩溃 → 保留 JSON `null`。
2. DB v3→v4 升级被另一个标签页的旧连接阻塞（`indexedDB.open` 无任何事件）→ `openDatabase` 注册 `db.onversionchange = () => db.close()`；调试时关闭多余标签页。
3. MinIO 返回 **weak ETag** (`W/"…"`)，不能用于 `If-Match`，且「manifest 读不出就当空桶重建」会覆盖云端 → `cleanEtag()` 规范化 + `readManifest()` 拒绝不可读/非 JSON manifest（head 校验）+ `pull()` 改为先应用远端再 push。
4. **HTML `hidden` 被作者样式覆盖**：`.np-mp-zone { display:flex }` 优先级高于 UA 的 `[hidden] { display:none }`，所以「微信公众号接入」关掉后粘贴区仍然可见（`hidden:true` 但实际 30px 高）。同类隐患还有 `.np-cloud`、`.np-endpoint-form`、`.np-switch-wizard`、`[role=tabpanel]` → 补 `.np-mp-zone[hidden] / .np-cloud[hidden] / .np-tab-panel[hidden] / .np-dlg-body [hidden] { display:none !important }`，并把 WeChat gating 从异步 `renderBody()`（无文件时会 early return）移到同步 `render()`。实测 OFF→ON→OFF：`display none → flex → none`、rect `0 → 30 → 0`。

> CSS 写在模板字符串里，注释中出现反引号会提前闭合字符串导致 esbuild 报 `Expected ";" but found "hidden"`——写 CSS 注释时避免反引号。

## 11. 多端点配置与安全切换（2026-11-11 落地）

### 配置模型

| 项 | 说明 |
|---|---|
| 存储 | `${DSH_HOME}/nano-notepad-s3.json`，mode 0600，原子写；首次启动从 `S3_NOTEPAD_*` / `nano-notepad.env` 种子出一个「默认端点」，旧安装零迁移 |
| 字段 | `id / label / endpoint / region / bucket / prefix / pathStyle / accessKeyId / secretAccessKey / sessionToken`，均可在设置里填写 |
| 密钥 | **只写不读**：`POST /s3/config {action:'list'}` 只返回 `hasSecret`；编辑时 Secret 留空即保留原值；密钥永不进浏览器、永不回显 |
| 路由 | `POST /nano-notepad/s3/config`，action: `list / save / delete / probe / beginSwitch / commitSwitch / abortSwitch` |
| UI | 设置「云同步」tab 内的端点列表（切换/编辑/删除）+ 新增表单 + 内联切换向导 |

### 为什么切换需要专门流程

切换端点等于**换真源**。直接切会出现两类事故：本地被新端点的 manifest 覆盖（丢本地独有笔记），或本地把新端点覆盖（丢云端独有笔记）。因此切换必须在「本地与远端真源统一」后才算完成。

### 状态机与步骤

```
idle ──发起──> prepared（本地为真源，自动同步暂停）
                  │ 预检 / 差异
                  ├─ 一致 ──────────────────────┐
                  └─ 不一致 → 选策略 → switching ─┤
                                                  ▼
                              commit（active 切换 + cursor 重置 + 恢复同步）
                   任一失败 ──> abort（active 回到原端点 + 恢复同步）
```

1. **发起**（`prepareSwitch`）：`sync.suspend()` —— 停定时器、停自动 push/pull。此后**本地 IDB 是临时真源**：本地编辑照常写库并累积 `dirty` outbox，但绝不写入任何端点。状态条显示「切换中 · 本地为真源」。
2. **预检**（`config probe`）：宿主用目标 profile 建**临时 client**（不改 active）做连通性 PUT/DELETE + 读 `manifest.json`，返回 `{rev, files:[{id,name,sha256,bytes}], images}`。失败即中止，active 不变。
3. **差异比对**（`diffAgainst`）：本地文件与远端 manifest 逐条按 sha256 比对，得到 `onlyLocal / onlyRemote / conflict / same`，向导里列出文件明与数量。
4. **一致性确认**：
   - 四类差异全空 → 显示「两端完全一致，可直接完成切换」，只需点确认。
   - 有差异 → 必须选择一种统一策略（不允许跳过）：
     | 策略 | 动作 | 结果 |
     |---|---|---|
     | 以本地为准 | `resetCursor()` → 全量 push（重建目标 manifest 为本地树） | 目标端点 == 本地 |
     | 以远端为准 | 删除本地独有文件 → `resetCursor()` → pull 覆盖 | 本地 == 目标端点 |
     | 合并 | 冲突项另存 `(本地冲突).md` 副本 → pull → push | 两边 == 合并结果 |
   - 目标端点为空桶时只允许「以本地为准」，其余策略直接拒绝（避免误判不一致）。
5. **原子提交 / 回滚**（`commitSwitch`）：
   - `beginSwitch(targetId)`：宿主写 `pending={fromId,targetId,at}` 后才切 active；**重启时若发现 pending 会自动回滚到 fromId**，崩溃不会留下半切换状态。
   - 执行策略（此时 active 已是目标，所有 `/s3/object` 都打向目标端点）。
   - 成功 → `commitSwitch` 清 pending → `resetCursor` + `resume()`。
   - 任一步抛错 → `abortSwitch`（active 回 fromId、清 pending）→ `resume()`，向导显示错误。

### 实测结果

- 端点表单新增：`备用端点 B` → 列表出现、`hasSecret:true`、密钥不回显。
- 预检空桶 → 差异「仅本地有 7 / 其余 0」→ 三策略可选 → 选「以本地为准」→ 目标 prefix `notepad-b/` 下生成 manifest + 7 个文件对象，active 切到新端点，pending 清空。
- 无效密钥端点 probe 返回 `InvalidAccessKeyId`，active 保持不变。
- 宿主配置层 5 个 `node --test`（含 secret 不回显、留空保留、abort 回滚、崩溃重启回滚、active 不可删）；全程 `__errs: 0`。

## 12. 同步动效（腾讯 Hy4 制作）

footer 的云同步状态 chip（22px 高）在 `syncing` 阶段提供三种非侵入微动效，作为设置项由用户选择：

| 值 | 名称 | 实现 | 时长 |
|---|---|---|---|
| `a` | 呼吸点 | 圆点 `opacity .4→1` + `scale .82→1.2` | 1.8s ease-in-out |
| `b` | **流光扫过（默认）** | chip 内 `::after` 一层 14% 白高光 `translateX(-100%→100%)` | 2s ease-in-out |
| `c` | 环弧旋转 | 圆点外围 `::after` 一圈 1px 细弧 `rotate(360deg)` | 1.1s linear |

**该特效由腾讯 Hy4 制作。** 设置项文案（中/英）里都注明了署名。

共同约束：只在 `phase === 'syncing'` 生效，同步结束自动归零；文字「同步中…」保持静态；B/C 全部使用绝对定位伪元素，不产生重排；`@media (prefers-reduced-motion: reduce)` 下三版全部禁用。

**B（流光）的浅色主题适配**：浅色主题的 `--dsw-alias-bg-layer-1` 是纯白，14% 白色高光 + 无底衬的 chip 会让扫光完全消失。改为主题感知的两个变量，并给扫光一条「轨道」：

| 主题 | `--np-cloud-sheen` | `--np-cloud-sheen-track` |
|---|---|---|
| dark | `rgba(255,255,255,.18)` 暖白微光 | `rgba(255,255,255,.055)` |
| light | `rgba(65,118,230,.22)` 冷蓝微光（对应 `--dsw-alias-link`） | `rgba(38,49,72,.055)` |

变量挂在 `.np-window[data-theme=...]` 上（与 `resolvedTheme()` 产出的 `panel.dataset.theme` 一致），B 版 `syncing` 时把 track 作为 chip 背景、sheen 作为 `linear-gradient(100deg, transparent 34%, … 50%, … 66%)` 的中段。光带收窄到 32% 宽度，避免浅色下看起来像「半边泛蓝」而不是一道光扫过。实测 dark/light 两版扫光均清晰可见。

- 存储：`DEFAULT_SETTINGS.cloudMotion = 'b'`，`normalizeSettings` 只接受 `a|b|c`，越界回落默认值；通过 `writeSettings` 落在 IDB `settings` 行，reload 保持。
- UI：设置「云同步」tab 的三段 `.np-switch`（沿用 N 段滑轨），切换后立即 `paintCloud(sync.info())` 重绘 chip。
- 调试/程序化入口：`window.__nanoNotepad.setCloudMotion('a'|'b'|'c')`，与 UI 走同一条持久化路径。
- 实测：三个值各自在真实 `cloudCycle()` 中验证动画启停（`np-cloud-breath` / `np-cloud-sweep` / `np-cloud-spin` → `none`），`__errs: 0`。

## 13. 待业主确认

- [x] 桶：MinIO（shv1），region `shv1`，endpoint 见上 —— **已实测确认**
- [x] 测试 bucket 与凭据 —— **已就绪**
- [ ] 凭据：正式接入时用 env `DSH_NP_S3_*` 还是 UI 可粘贴？（测试阶段用 `.env.s3`）
- [ ] 范围：P0+P1（备份）先落保护器，还是直接奔 P2 双向？
- [ ] `blobs`/`ui`/workspace 树结构是否也上云（建议：nodes+versions+images 上云；ui/折叠态保留本地）？
- [ ] shared-workspace 与 notepad 是否共桶分 prefix，还是各用独立 bucket？（当前测试用独立 bucket）
