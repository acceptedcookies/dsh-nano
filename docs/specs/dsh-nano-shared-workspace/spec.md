> **⛔ DEPRECATED（2026-11-12）**：本规格对应的插件已由 [业主] 裁决退役，源码整体移至 [`deprecated/dsh-nano-shared-workspace/`](../../../deprecated/README.md)。**本文件是历史草案，不再是现行合同**；发布、打包、门禁均已排除该插件。正文中的 `dsh-nano-shared-workspace/...` 路径按「退役当时位于仓库根」理解，未做批量改写。完整说明见 [`deprecated/README.md`](../../../deprecated/README.md)。

# dsh-nano-shared-workspace — 设计与实现规格（历史草案）

| 元信息 | 值 |
|---|---|
| 版本 | `0.1.0`（草案） |
| 类型 | dsh overlay 插件（host + client 双端） |
| dsh 引擎 | `>=0.2.2-rc.1 <0.3.0` |
| 构建 | `node scripts/build-client.mjs`（esbuild 0.25.0） |
| 参考实现 | `context/pgs3`（S3 服务端参考）、`context/layerfs`（不可变对象模型参考） |
| 文档日期 | 2026-11-09 |

## 0. 目标与非目标

**目标**：多台 dsh 客户端通过同一个 S3 兼容端点（Cloudflare R2 / 自托管 pgs3 / 任意 SigV4 端点）共享 session 历史。A 机产生的 session 自动出现在 B 机的 Shared workspace 里；S3 是唯一真源。

**非目标（本期，已被 §13 业主心智模型覆盖的部分不再当作永久非目标）**：

- 鉴权与用户权限管理（桶凭证即全部身份；后期再加对象签名/多角色）
- 工作区源文件同步曾列为本期非目标。§13.3 / §13.4 / §13.6 / §13.8 要求 S3 上的 workspace 是带状态的工作目录，文件经版本控制下发与回传。该能力**尚未实现**，不再写成永久非目标。
- attachment（图片/媒体）同步 —— v2
- 远端 session 在本机"继续对话"（需要 cwd 重映射）—— Phase B
- 删除传播（本期只进不出）

## 1. 已核实事实（设计地基）

| # | 事实 | 出处 |
|---|---|---|
| F1 | session 持久化 = 事件溯源 append-only 日志：`sessions/<project-dir>/session-<uuid>/session.v4.jsonl.zstd`，**文件首行即 header line，单体自足** | `~/.dsh-dev/sessions/`、`dsh-session-persistence-jsonl` |
| F2 | 唯一存储后端是 JSONL；`sessionPersistence` 服务提供 `create/open/stat/list/flush`，`open(id,'read')` 不抢写权 | `dsh-session-persistence` types |
| F3 | `create` 拒绝 `version != current`（`SessionFormatUnsupportedError`）；同 id 再 `create` 抛 `SessionAlreadyExistsError`；`open(id,'write')` 被占时抛 `SessionAlreadyOwnedError` | 同上 |
| F4 | `stat().location` 给出工件路径；`stat().revision` 是同服务内的单调变化令牌 | 同上 |
| F5 | S3 语义：**单对象**原子 PUT，无跨对象事务；条件写 `If-Match`/`If-None-Match`（`→*`）在 R2/S3/pgs3 可用，MinIO 等可能缺失 | pgs3 `store.rs`、R2 文档 |
| F6 | pgs3 **零鉴权**、支持条件写/分片/ListV2/Copy/Delete，条件写落 Postgres 事务是真原子 | `context/pgs3` |
| F7 | `ctx.credentials` 凭据服务落在 `$DSH_HOME/.credentials.yaml`（0600），插件可存 S3 secret | `dsh-credentials` |
| F8 | `jsonl.zstd` 压缩产物**不可安全按任意字节切片**（frame 边界任意）——delta 传输必须按"已提交字节前缀"切 | `dsh-session-persistence-jsonl` |
| F9 | `dsh-session-log-export` 已有 zip 打包导出；它证明"字节级搬运工件"是官方承认的迁移方式 | `dsh-session-log-export` |
| F10 | dsh 运行中的 backend 是否会重新扫盘尚未证实 → **P0-1 spike** | — |

## 1.5 网络基础设施（2026-11-09 已部署验证）

**公网端点**：`https://nano-shared-workspace.saobao.com` → `shv1`（上海，腾讯云 `49.235.109.23`）上的 MinIO。

```
dsh 插件（host 半侧，SigV4 fetch）
  → https://nano-shared-workspace.saobao.com   Cloudflare 边缘（TLS，橙色代理）
  → 源站 shv1 49.235.109.23                     nginx :443 → MinIO :9000
  → bucket: dsh-shared-workspace
```

### 已验证状态（2026-11-09 部署）

| 组件 | 状态 | 详情 |
|---|---|---|
| CF API token（`.env.cloudflare`） | ✅ 有效 | 权限：`dns_records:edit`、`zone:edit`、`zone_settings`、`ssl:read`——足够做 DNS/SSL（不含 Workers/Tunnel，也不需要） |
| `saobao.com` 域名区 | ✅ 激活 | zone id `95a207649ec68f6f6cb2a258c9b2e7d1`，Free 套餐，**SSL mode = strict** |
| DNS | ✅ 已建 | `A nano-shared-workspace.saobao.com → 49.235.109.23`，record id `d1448731e64b23c9c0b90311359864fc`，`proxied=true`（验证时传播仍在进行；dns-only 直连同样可用） |
| 上海服务器 | ✅ `shv1` = `VM-0-4-ubuntu` | `49.235.109.23`，wg0 `10.10.0.1`（本机 `10.10.0.3` 的 wg 对端），Ubuntu，nginx 1.24 + certbot，磁盘 57G 可用；**root SSH 免密** |
| MinIO | ✅ 运行中 | `RELEASE.2025-07-23`，systemd `minio.service`，`127.0.0.1:9000`（S3 API）/ `:9001`（控制台），数据目录 `/data/minio`，环境文件 `/etc/minio.env`（0600） |
| Bucket + 应用密钥 | ✅ | `dsh-shared-workspace`；svcacct 密钥存于本地 `.env.s3`（git 忽略）——**禁止提交入库** |
| 源站 TLS | ✅ Let's Encrypt | `/etc/letsencrypt/live/nano-shared-workspace.saobao.com/`，nginx `sites-available/nano-shared-workspace`（443→`127.0.0.1:9000`，80→301 跳转 + ACME webroot `/var/www/acme`） |
| SigV4 冒烟测试 | ✅ PUT/GET/LIST/DELETE 返回 200/204 | 从本机经 HTTPS 验证；UA 为 `python-urllib` 等可拦截值时会返 `error code: 1010` → **插件的 S3 客户端必须带 `User-Agent: dsh-nano-shared-workspace/<ver>`** |
| WireGuard | ⚠️ 接口在，peer 无握手 | 服务器是 `10.10.0.1`；本机隧道收不到流量——**不依赖**（管理走 SSH 直连，S3 流量走公网 HTTPS） |

### 运维备注

- **CF 代理 + SigV4**：可用；CF 不改动已签名 header。Free 套餐单请求上限（~100MB）对 ≤4MiB 的 part 很宽裕。
- **LE 证书续期**：certbot 已装，systemd timer 自动续；ACME webroot 保留在 HTTP。
- **MinIO 控制台**（`:9001`）：仅监听 localhost——本地访问用 `ssh -L 9001:127.0.0.1:9001 root@49.235.109.23`。
- **延迟**：上海 ↔ 客户端经 CF 边缘约几百 ms；对 30s/60s 轮询足够，不适合实时同步（本设计也不需要）。
- **pgs3**：保留为自建备选，但**实际部署用 MinIO**（原生 SigV4 鉴权、`mc` 管理、带控制台）。pgs3 无鉴权，只有藏在自有 bearer 代理后才有意义——不推荐。

## 2. 同步模型（核心决策）

**每个 session = 一个远端"单体文件族"，绝不共享一个全局文件。**

否决"远端单体 sqlite"的原因：S3 无跨对象事务，多客户端并发写同一文件必然撕裂（layerfs 的 Store 也是同一模型，本地可用、S3 上不可用）。改为：

```
{prefix}/
├── identities/{name}.json                 # 用户名抢注：{writerId, claimedAt} — If-None-Match:* 唯一占用
├── instances/{writerId}.json              # 心跳：{declaredName, hostname, dshVersion, lastSeen}
├── workspaces/{workspaceId}/              # 一个工作区一族对象；workspaceId 定义见 §2.1
│   └── sessions/{sessionId}/
│       ├── meta.json                      # 同步状态 + 展示元数据（唯一被覆写的对象）
│       └── body/{chunkIndex}.part         # 工件字节前缀切片，append-only，永不覆写
└── claims/{sessionId}.json                # 写权租约：{writerId, acquiredAt, expiresAt, heartbeatRev}
```

**不变量**（所有可靠性都从这里来）：

1. `body/*.part` 一旦写入**永不改写**——对象的并集始终构成 `session.v4.jsonl.zstd` 的**字节前缀**
2. `meta.json.committedBytes <= 所有 body chunk 总字节数`，永远成立
3. **单写者**：`meta.writerId` 唯一者能写；其他端**绝不**写入该 session 的任何对象（业主规则 #1/#2）
4. `ListObjectsV2(prefix)` 就是远端清单 —— **不维护全局 manifest**（消除单点竞争）
5. 写序 = 先 part 后 meta（读者永远不会看到指向缺失字节的 meta）
6. **写入前置校验**：每个 PUSH 周期写任何对象前，先 `HEAD meta` 确认 `writerId==me` 且 `rev` 一致；不一致 → 放弃写权转 WATCH（业主规则 #1"开始写入前再次检查"）

### 2.1 工作区与身份（业主规则 #4/#5）

**workspaceId**（机器无关）：优先级 `git remote URL hash > repo 根目录名 hash > cwd basename hash`；均为 SHA-256 前 16 hex。加入时也可手动指定——同一批文件即使跨机路径不同，也落同一族对象。

**writerId**：`<declaredName>-<instanceUuid>`。`declaredName` 接入时声明，`instanceUuid` 首次启动生成并持久化在 `state.db`。名字唯一性靠 `identities/{name}.json` 的 `If-None-Match:*` 抢注——已被占则 GUI 要求改名。

**token**：v1 = 桶凭证（共享，存 `ctx.credentials`）；v2 演进为 per-user token 验签（对象级 HMAC）。

**cool-off（租约 TTL）**：`expiresAt = now + 90s`；活跃写者每 30s 心跳续租（`heartbeatRev++`）；session 正常结束时显式释放 claim。他人只能在 `expiresAt` 过后接管。

### meta.json schema

```json
{
  "v": 1,
  "sessionId": "…uuid…",
  "writerId": "…instance-uuid…",
  "writerName": "seanz-macbook",
  "rev": 7,
  "formatVersion": 4,
  "committedBytes": 18342,
  "uncompressedSeqBytes": 0,
  "eventCount": 412,
  "title": "…",
  "projectDir": "--Users-seanz-foo--",
  "cwd": "/Users/seanz/foo",
  "createdAt": "2026-11-09T08:00:00Z",
  "mtime": "2026-11-09T08:31:04Z",
  "deleted": false,
  "attachmentRefs": []
}
```

- `rev` = 本端对该 meta 的单调修订号（S3 ETag 不可比时用 rev+mtime 判新）
- `committedBytes` 读者据此决定拉哪些 chunk；**上传方只有自己写完 part 才推进它**
- `uncompressedSeqBytes`/`eventCount` 留给 seq 级增量（Phase C 用，先写 0）

## 3. 上行管线（本机 → S3）

**接入握手**（插件启用时一次）：声明 `declaredName` → `PUT identities/{name}.json{writerId, claimedAt}`（`If-None-Match:*`）→ 409/412 则弹改名 → 写 `instances/{writerId}.json` 心跳 → 开始 sync 循环。端点无 CAS 时跳过抢注只写心跳（best-effort）。

**触发**：每 `pushIntervalSec`（默认 60s，session 活跃时 15s）扫描一次：
`sessionPersistence.list()` → 对每个 session 取 `stat()`（revision、sizeBytes、location、header）。

**写入前置校验（业主规则 #1）**：本周期要动任何对象前，`HEAD meta` → `writerId==me && rev==lastKnownRev`？是 → 继续；否 → 放弃写权、state.db 标 WATCH、本周期只读。

**每 session 状态机**（`state.db` 持久化）：

```
local stat        远端 meta          动作
─────────────────────────────────────────────────
不存在            不存在             → 无
存在              不存在             → CLAIM → PUSH-NEW
存在 本地大       writerId==me       → PUSH-DELTA
存在              writerId==me,
                远端 committedBytes
                == 本地 sizeBytes    → 无（已同步）
存在              writerId!=me       → 只读（WATCH）
任何              deleted==true      → 只读归档
```

**PUSH-NEW**（新 session 首次上传）：
1. `open(id,'read')` + `handle.read()` 拿到 `SessionInspection`（header + events），同时 `stat().location` 拿工件字节
2. 若工件读不到（未物化）→ `open(id,'write')` 拿不到就走 `handle.flush()` 的服务级 `flush()` 后重试
3. `PUT body/000000.part = 工件全量字节`（`x-amz-checksum-sha256` 带校验）
4. `PUT meta.json`（committedBytes=文件大小, writerId=me, rev=1）——**If-None-Match:*，已存在则 412 → 转为 WATCH**
5. `state.db` 记 `(sessionId, writerId=me, rev, committedBytes, pushedAt)`

**PUSH-DELTA**（append 增量）：
- 工件从 `committedBytes` 到 `sizeBytes` 的新尾部 → `PUT body/{N:06d}.part`（N=下一序号）
- 更新 meta：`rev++`、`committedBytes=sizeBytes`、`mtime=now`、`eventCount`
- **竞态安全**：part 是按序号新对象，meta 覆写只推进指针；即使两个 PUSH-DELTA 因重试并行，序号单调仍一致（重试前查 ListObjects 重定序号）

**为什么不上传"解码→重编码"的规范流**：字节级搬运保证导入端拿到的是**与写出端逐字节一致**的工件，dsh 版本一致时直接可读，零编解码 bug 面。

## 4. 下行管线（S3 → 本机）

每 `pollIntervalSec`（默认 30s）：

```
1. ListObjectsV2("{prefix}/workspaces/") → 远端 workspaceId → sessionId 集合
2. 对每个未导入的 sessionId: GET meta.json
3. 过滤：writerId != me 且 committedBytes > 0 且 formatVersion <= current
4. GET 所有 body/*.part（按序号排序）→ 拼成本地工件字节
5. 落地导入（见 §5）
6. state.db 记 lastSyncedCommittedBytes
```

**增量追更**：已导入 session 若 `meta.committedBytes > lastSynced` → 只 GET 缺失 chunk → 追加进本地工件（见 §5-B）。

**校验**：
- 每个 part 比对 SHA-256/ETag；失败重试一次后标记 session `suspect`，不再自动重试
- 拼出的字节**必须**是 `committedBytes` 长度；不足则等下一轮（writer 崩溃中途的正常态）
- `formatVersion > current` → GUI 标"migration-required"，不导入

## 5. 本地落地（两种模式）

### 5-A 只读归档（Phase A，默认）

工件写入 `~/.dsh*/sessions/--nano-shared--/session-<id>/session.v4.jsonl.zstd`（独立 project-dir 分组，不混本机 session）。

**导入判定 spike（P0-1）**：先验证 `sessionPersistence.stat(id)` 对外部落盘的工件是否立即可见。
- 可见 → 直接 `open(id,'read')`/`readColdSessionLog` 渲染 transcript，零编解码
- 不可见（backend 只在启动时扫盘）→ 工件照样落盘（重启即出现），且 GUI 的 Shared tab 用**自带只读查看器**渲染（需要解码器，见 §5-C）

### 5-B 增量追加（Phase B）

远端 committedBytes 增长时：
- 本地工件追加新字节（打开 fd 追加写）
- 若本地持有该 session 的 read handle → 关闭重开即见新事件（jsonl backend 的 `open` 按需读盘）
- **禁止路径**：session 被本机 `open(...,'write')` 持有（=用户在本机打开了它）→ 只读展示"远端有新版本"，**不**覆写，不抢写权。防止本机 dsh 用旧内容把远端进度盖回去：本机继续 append 时 backend 会重写整个工件 → 本地工件与远端分叉 → 此 session 标 `diverged`，要求用户在 GUI 里显式选择"以远端为准"（重落盘）或"以本机为准"（接管写权）

### 5-C 解码器需求

仅当 P0-1 不成立且需要 GUI 内置查看器时才写：zstd 解压 → jsonl 行解析 → `SessionEvent` 渲染。`dsh-session-query` 的 corpus/observation 走 service；自写只读查看器作为最后手段，先评估工作量再决定（**P0-2 spike**）。

## 6. 并发与竞态（权威规则）

| 场景 | 规则 |
|---|---|
| 同一 workspace 多人各写各的 session | 写权 per-session —— N 个用户并行写不同 session，零冲突（业主规则 #3） |
| 有人在写 session | 他人**只读观察**：WATCH + 增量拉 chunk，绝不写入（业主规则 #2） |
| 两端"同时"声称同一 session | `claims/{id}.json` + `meta` 写入用 CAS；先成功者 writer，失败者转 WATCH |
| cool-off 后接管 | claim `expiresAt` 过期 → 显式 `Take over` → CAS 抢 claim → 拉全量 → `PUT meta{writerId:me, rev:0}` → PUSH-DELTA。旧端下次 poll 看到 writerId≠me → 放弃写权（业主规则 #1） |
| 每次写入前 | re-HEAD meta，确认 writerId 仍是自己、rev 未变 —— 被接管立即停写（业主规则 #1"再次检查"） |
| 端点无 CAS（MinIO 等） | 降级为 claim 先读后写 + TTL 90s；GUI 显示 "best-effort" 徽标，提示可能分叉 |
| writer 崩溃 | 心跳停 → 90s 后 claim 自然过期 → 可被接管；meta 不会因半写而指向缺失字节（不变量 #2） |
| 分叉（违规并发写发生） | 检测 = 远端有我们没有的 chunk 且 writerId≠me → 标 `diverged`，GUI 红标，用户选边，**绝不**自动合并 |
| 用户名冲突 | `identities/{name}` CAS 抢注失败 → 强制改名后才能接入（业主规则 #5） |
| 删除 | 只写 `meta.deleted=true`（body 保留）；真删对象走"清空远端"管理操作并需二次确认 |

## 7. host 半侧结构

```
nano-shared-workspace/
├── index.js                 # name/inject/Config/apply 导出
├── cordis.patch.yml         # insert {id: nano-shared-workspace, name}
├── package.json / icon.svg / locale/{en,zh}.json
├── scripts/build-client.mjs
├── src/
│   ├── host/
│   │   ├── entry.js         # Config ~standard + apply
│   │   ├── s3.js            # 迷你 SigV4 客户端：GET/PUT/HEAD/DELETE/ListV2 + If-Match/If-None-Match + x-amz-checksum-sha256；Node fetch，无 SDK
│   │   ├── sync.js          # 上行/下行状态机 + 轮询循环（setInterval → ctx 生命周期）
│   │   ├── session-io.js    # stat/open/read/flush + 工件落盘/追加 + project-dir 编码
│   │   ├── routes.js        # /nano-shared-workspace/*：状态/远端列表/手动 sync/take-over/导入动作；每 handler 首行 requestRejection
│   │   └── state.js         # node:sqlite state.db：每 session 行（writerId/rev/committedBytes/lastSynced/status）
│   └── client/
│       ├── index.js         # 挂载：侧栏 tab + settings 卡
│       ├── panel.jsx        # Shared workspace 列表：远端 session、writer、mtime、大小、状态徽标（synced/pulling/diverged/suspect）
│       ├── settings.js      # endpoint/region/bucket/prefix/poll/push 间隔 + 凭证输入（写 ctx.credentials，不明文回显）
│       ├── prefs.js/i18n.js/styles.js
├── lib/{host.js,client.js}
```

**Config（`~standard` 非密项）**：`endpoint`（默认 `https://nano-shared-workspace.saobao.com`）、`region`（默认 `us-east-1`）、`bucket`（默认 `dsh-shared-workspace`）、`prefix`、`declaredName`、`workspaceId`（空=自动推断）、`pollIntervalSec`(15-300, 默认30)、`pushIntervalSec`(15-600, 默认60)、`partSizeTarget`(64KiB-4MiB, 默认256KiB)、`claimTtlSec`(30-600, 默认90)、`autoImport`(bool, Phase B)。
**凭证**：`credentials.set(credentialKey("nano-shared-workspace:s3-access-key"), …)` / `s3-secret-key`。禁止写进 Config/日志/客户端包。

**inject**：`fs sessions webServer connection sessionPersistence credentials`（`subprocess`/`sandbox` 不需要——网络 I/O 直接 fetch）。

## 8. 性能设计

| 项 | 决策 | 收益 |
|---|---|---|
| 清单 | ListV2 单次分页 1000；meta 只在 `(sessionId, etag)` 变化时重新 GET（HEAD 便宜） | 每轮 = 1 List + 最多 N 个 HEAD |
| chunk 粒度 | `partSizeTarget = 256 KiB` 压缩字节：上行把增量攒到 ≥256KiB 或 push 间隔到点时才切 part——小 session 一对象，大 session 增量可控 | 远端对象数随时间对数级增长而非线性 |
| 上行触发 | `stat().revision` 变化才算 dirty——无变化的 session 零成本跳过 | 空闲时整套管线≈1 List/轮 |
| 下行 | 未导入 session 按需拉；已导入只补缺失 chunk | 带宽 ≈ 真实增量 |
| 读取 | `open(id,'read')` 不抢写权（F2）——与 agent 活跃写并行安全 | 同步不阻塞会话 |
| 工件寻址 | `stat().location` 直读工件，`fs.processPathFromHostPath` 校验属于 `$DSH_HOME/sessions/` 内 | 不猜路径布局 |
| zstd | 上传压缩态字节**原样**（工件已是 zstd 流） | 零重编码 CPU |
| 限流 | 单 session 拉取单 worker；并发上限 3；`Retry-After`/指数退避 | R2/自托管都不触发 429 |

## 9. client 半侧（UI）

- **侧栏 tab `Shared`**（`sidebarRightTabs` 注入，参照 explorer-extra 的 takeover 模式）
  - 分组：My sessions（我写的）/ Remote sessions（别人的）/ Conflicts（diverged/suspect）
  - 行：标题、项目名、writerName、mtime、大小、徽标；右键：Pull now / Open archive / Take over / Open in dsh session
  - 顶栏：Sync now、endpoint 状态灯（绿=可达/红=错误/灰=未配置）
- **设置卡**（`ui-settings` 或 explorer-extra 的 settings 模式）：endpoint 字段 + 凭证（masked，走 `ctx.credentials`）+ 间隔滑条 + "Test connection"（跑一个 ListV2 1 条）
- **本机 session 行标**（v2 候选）：本地树里给已同步 session 加 ✓ 角标

## 10. 风险登记（按严重度）

| # | 风险 | 缓解 |
|---|---|---|
| R1 | 拥有桶凭证者可注入任意 session；导入后被 resume 会执行其中 tool 序列 | v1：远端 session 默认**只读归档**展示；resume 需显式动作；v2：可选每对象 HMAC 签名 |
| R2 | pgs3 无鉴权 → 裸跑=桶公开 | spec/文档硬性要求：绑 `127.0.0.1` 或置于 token 反代后；GUI 对 http:// 端点警告 |
| R3 | 违规则单写者 → 分叉 | `diverged` 检测 + 红标 + 手动选边；绝不自动覆盖远端 |
| R4 | 格式版本漂移（跨 dsh 版本） | `formatVersion` 门控 + GUI "migration-required" 标 |
| R5 | backend 不重扫盘（P0-1 失败） | 工件照样落盘（重启可见）；归档查看器走自带解码（P0-2 评估） |
| R6 | writer 写中途崩溃 → 读者看到半截 | `committedBytes` 指针语义天然容忍；下一轮补齐 |
| R7 | 端点不支持条件写 | §6 降级路径 + "best-effort" 徽标；R2/pgs3 推荐为主端点 |
| R8 | 大桶（>1000 session）分页成本 | v1 接受；建议一 prefix 一工作区；v2 用 `instances/` 心跳做 last-writer 索引 |
| R9 | 本机 append 覆盖远端已拉取的工件 | §5-B 禁止路径 + diverged 状态 |
| R10 | zstd 切片切到 frame 边界外 | 已避免——切片单位是"已提交前缀"，由 writer 保证 |

## 11. 落地顺序（P0 → Phase A → B → C）

**已落地（2026-11-09，Phase-0 骨架）**：`dsh-nano-shared-workspace/` 插件已建并在 `dsh-dev.local` 端到端验证——

- **侧栏镜像区块**：`sidebar.workspaces` 是单席位槽，无法注册并列区块；实现改为 `shell.overlay` 常驻 + DOM graft——从 `[role="tree"]`（session 树根，生产 bundle 仍保留）向上爬到「parent 含全局面板 `<nav>`」的 regionArea，prepend host 元素再 portal `SharedSection`。**注意**：生产版移除了 `data-sidebar-workspace-header` 与 `data-sidebar-scrollport`，不能依赖；`data-collapsed` 属于 Settings 按钮而非侧栏。宽窄判断实测 region 宽度 >80px；rail 兜底从 `nav.nextElementSibling` 取 region。
- **设置弹窗**：`NanoDialog`（`dsh-nano-ui` 共享包）+ `Input`；字段 = 用户名 / MinIO Token / 可选 accessKey；端点+bucket 只读展示。
- **凭据**：`ctx.credentials.set('DSH_NSW_IDENTITY', {username,token,accessKey})` + `'DSH_NSW_USERNAME'`；GET settings 返回 `maskedSecret`（前4…后4），凭据落 `~/.dsh-dev/.credentials.yaml`。
- **路由**：`GET/PUT /nano-shared-workspace/settings`、`POST /settings/clear`、`GET /status`，经 `connection.requestRejection` 门禁。
- **profile 注册**：`~/.dsh-dev/profiles/web/package.json` 的 `dsh.profile.bundles` + `dependencies` + `node_modules` 符号链接（`../../../plugins/<name>`，两级目录深度）——`--patch` 在进程命令行未出现，加载走的是 profile bundle 路径。
- **验证**：PUT 写 → GET 回读 `configured:true`；「已配置 · seanz」状态、rail↔wide 切换、NanoDialog 保存、掩码展示截图确认。

**Phase-0.5 增量（2026-11-09 同日）——共享工作区 = 云端真源 + 本地副本，绝不落本地「工作区」列表**：

业主纠正后的正确模型：**workspaceId 云端生成（randomBytes(8).hex），正本在 S3；`members[].localPath` 只是各端副本位置**。曾错误地把「先建本地 workspace 再打标」当共享——已废弃。

- **新建** = 自建 NanoDialog（`src/client/create-dialog.js`：名称输入 + 面包屑目录浏览，`ctx.uiWorkspace.listDirectory`/`createDirectory` RPC，与 BrowseDirectoryFlow 同后端，非 OS 选择器）→ `POST /workspaces/create` **S3 先写** `workspaces/{randhex}.json` → 本地仅普通目录，`ctx.workspaces.create` 永不调用。
- **加入** = 未加入行点击 → 同对话框 join 模式 → `POST /workspaces/join` 把 `member+localPath` merge 进 marker（无 CAS，v1 竞态取并集）。
- **session→workspace 映射**：`matchWorkspace(cwd, markers)` = member `localPath` 前缀匹配（最长前缀优先），兼客 legacy path-hash id（`git remote hash > basename hash`）。
- **上行**（`src/host/session-io.js`）：`POST /sync` 扫 `$DSH_HOME/sessions/*/*/session.v4.jsonl.zstd` → matchWorkspace → claim 租约（`claims/{id}.json`，TTL 90s）→ `body/{i}.part`（64KB 对齐前缀切片）→ `meta.json`。被 foreign writer/claim 占着则跳过。
- **下行**：`GET /sessions` 列全远端 meta（delimiter 让 session 目录进 `prefixes` 而非 `keys`）；`POST /transcript` 拼 part → zstd 解码 → JSONL 事件数组。
- **客户端**：工作区行展开会话列表（session 行）→ 点击 `TranscriptDialog` 只读投影 user/assistant/tool 行；`window.__nsw` 调试钩子。
- **端到端验证**：E2E 创建 `e2e-shared-ws` marker 落桶且本地工作区无泄漏；副本目录造 session → `pushed:419b` → `/sessions` 列出 → transcript 弹窗读出 user/assistant 消息；他人 marker（`alice`）`未加入`→ 选副本 → members merge 双键 → `已加入`。

| 阶段 | 内容 | 验收 |
|---|---|---|
| **P0 spike** | ①外部工件落盘后 `stat()` 是否可见；②`open(id,'read')`+`read` 链能读到落盘工件；③迷你 S3 客户端打 R2/pgs3 的 ListV2+PUT+GET 往返 | 三个都绿才进 Phase A |
| **Phase A** | 接入握手（identities 抢注）+ host 全管线 + claim 租约/前置校验 + 只读归档（§5-A）+ 侧栏列表 UI + 设置卡 | A/B 两台 dsh-dev 实例挂同一桶：A 的 session 60s 内出现在 B 的 Shared tab 可看 transcript；A 在写期间 B 不能写（只读观察）；cool-off 后 B 可接管写权 |
| **Phase B** | 增量追加（§5-B）+ diverged 状态机 + Take over + fork-to-local 动作 | 远端 session 增量更新可见；接管后写权正确移交 |
| **Phase C** | eventCount 级增量（`uncompressedSeqBytes`）、attachment 同步、对象签名、心跳索引、远端删除传播、性能压测 | — |

## 12. 目录清单（最终形态）

```
dsh-nano-shared-workspace/
├── index.js                 # 出口：lib/host.js re-export
├── cordis.patch.yml
├── package.json
├── package-lock.json
├── icon.svg
├── README.md
├── locale/{en,zh}.json
├── src/
│   ├── host/{entry,s3,sync,session-io,routes,state,credentials}.js
│   └── client/{index,graft,section,settings-dialog,api,i18n,styles}.js
├── lib/{host.js,client.js}
├── scripts/build-client.mjs
└── docs/specs/dsh-nano-shared-workspace/spec.md  ← 本文件（仓库 docs/ 下）
```

## 13. 业主心智模型（2026-11-09 登记）

本节是业主对共享工作区的权威心智模型。它覆盖 §0 里把「只同步 session 历史、不同步工作区文件」当成产品边界的写法。下文每一条都按同一结构拆开：对象、真源、不变量、失败时怎么办；然后对照三样已经存在的东西——对象拓扑、上海 MinIO、本地插件——给出符合 / 部分符合 / 不符合。

对照时用的事实，只来自本文件 §1.5 的部署记录和 `dsh-nano-shared-workspace/src/host/` 的现行代码，不把规格里的愿望当成已上线。

### 13.0 三份对照物分别是什么

**拓扑（现在实际写在桶里的形状）**

```
dsh 插件  --SigV4 HTTPS-->  Cloudflare（nano-shared-workspace.saobao.com，橙色代理，SSL strict）
                         -->  shv1 49.235.109.23  nginx :443
                         -->  MinIO 127.0.0.1:9000
                         -->  bucket dsh-shared-workspace

workspaces/{workspaceId}.json                          成员与每人的 localPath
workspaces/{workspaceId}/sessions/{sessionId}/meta.json
workspaces/{workspaceId}/sessions/{sessionId}/body/{i}.part
claims/{sessionId}.json                                写租约，TTL 90s
```

这是一组会话日志对象加一张成员表。它不是一个带目录项、代际和合并的工作目录。

**上海 MinIO（2026-11-09 部署记录）**

`RELEASE.2025-07-23`，systemd，只听 `127.0.0.1:9000`（API）和 `:9001`（控制台），数据在 `/data/minio`，环境文件 `/etc/minio.env`（0600）。桶 `dsh-shared-workspace`。公网入口是 Cloudflare 代理加本机 nginx Let's Encrypt。部署记录里没有打开 bucket versioning，没有对象锁，没有生命周期里的代际策略。pgs3 没有跑在这台机器上。

**本地插件（`dsh-dev.local` 上的 `dsh-nano-shared-workspace`）**

能做的：S3 先写 workspace marker、选一个本地目录记成 `members[].localPath`、按 cwd 前缀把本机 session 日志推上去、用 `claims/{id}.json` 做先读后写的 90 秒租约、把远端 session 日志拉下来改写 cwd 再打开。不能做的：同步 workspace 里的普通文件、打开 session 时登记忙态、按版本合并冲突、用条件写保证单写者。

pgs3（`context/pgs3`）在这里的角色是**状态引擎的参考实现**，不是现网进程。它把对象放在 Postgres 里，`If-Match` / `If-None-Match` 落在同一个事务里：写要么整笔提交，要么一行都不改（`store.rs`：条件写改不到行就拒绝）。这是「带状态」的最小引擎。现网 MinIO 只被当成无条件 PUT 的对象盘在用。

### 13.1 共享工作区必须能创建 workspace，其下可以有多条 session，对应这个 workspace 里的文件

**原文。** 共享工作区必须可以创建 workspace。workspace 下面可以有多条 session，对应该 workspace 内的文件。

**拆解。**

- 对象有两个，不能并成一个。workspace 是一份文件集合的身份；session 是在这份文件集合上发生的一次对话。一个 workspace 对多条 session，一条 session 只属于一个 workspace。
- 「对应 workspace 内的文件」意味着 session 的工具读写落在这个 workspace 的目录里，而不是落在随便一个本机项目里。对应关系是目录成员资格，不是把 session id 写进某个列表就算数。
- 不变量：创建 workspace 不依赖本机已经有一个 Host「工作区」记录。session 列表挂在共享 workspace 上，不挂在本地「工作区」上。
- 失败：没有 workspace 身份就创建的 session，无法判断它在改哪一棵文件树，也不能被其他成员按 workspace 找回来。

**对照。**

| 对照物 | 结论 | 依据 |
|---|---|---|
| 拓扑 | 部分符合 | `workspaces/{id}.json` 是 workspace 身份；其下 `sessions/` 可以有多条。对象里没有「这个 workspace 的文件清单」，session 与文件的对应只靠每条 meta 里的 `cwd` 字符串。 |
| 上海 MinIO | 符合存储、不符合语义 | 桶能放下 marker 和任意条 session。MinIO 不理解 workspace，也不会拒绝「session 的 cwd 不属于该 workspace」。 |
| 本地插件 | 部分符合 | `POST /workspaces/create` 先写 S3 marker，不调用 `ctx.workspaces.create`。侧栏能在一个共享 workspace 下列出多条 session，新建会话用该成员的 `localPath` 当 cwd。会话日志不等于 workspace 文件；文件本身没有进这个 workspace 对象。 |

### 13.2 每个 workspace 必须能创建 session；同一条 session 同时只有一个已加入的同事可写；忙或 cool-off 期间其他人只读，并自动把 workspace 内容同步到本地

**原文。** 共享工作区的 workspace 必须可以创建 session。每一个 session 同时可以有 1 个加入到共享工作区的同事在工作。当前 session 正忙的时候，或者 cool-off 的时候，其他同事只能只读，和自动同步工作区中的内容到本地。

**拆解。**

- 写权的粒度是 **session**，不是整个 workspace。同一个 workspace 里，甲写 session A、乙写 session B，这两件事不互相挡住。
- 「已加入」是前提。没在 marker 的 `members` 里的人不能拿写权。
- 忙：写者活着，租约未过期。其他人可以拉、不可以推。
- cool-off：写者已经停手，但租约还没到期。这段时间仍然只读，避免两个客户端都以为自己是写者。到期之后才允许下一个人登记为忙。
- 「自动同步工作区中的内容」同步的是 workspace 的文件，不只是这条 session 的 jsonl。只读端拿到的本地副本要跟上真源，否则只读看到的是过期树。
- 不变量：任意时刻，一条 session 的有效写者 ∈ {0, 1}。0 只出现在无人持有或租约已过期。
- 失败：两人同时认为自己持有写权，后写的覆盖先写的，丢失没有版本可回放。先读后写的窗口就是这个失败。

**对照。**

| 对照物 | 结论 | 依据 |
|---|---|---|
| 拓扑 | 部分符合 | `claims/{sessionId}.json` 表达了「一条 session 一把锁」，字段有 `writerId`、`expiresAt`、`heartbeatRev`。没有对象表达「只读端正在把 workspace 文件拉到本地」，也没有对象能原子地把锁交出去。 |
| 上海 MinIO | 不符合单写者 | MinIO 只保存我们 PUT 上去的 JSON。插件没有使用 `If-Match`。两个客户端可以同时读到「锁空着」，然后都写成功。pgs3 的事务条件写能关掉这个窗口；现网没有这层。 |
| 本地插件 | 不符合 | 共享行上可以新建 session。`acquireClaim` 自己写明 `No CAS in v1`：读到未过期的别人锁就跳过推送，否则直接覆盖。没有打开 session 时的忙态登记，没有只读 UI，没有 cool-off 倒计时，没有把 workspace 文件自动同步到本地。租约只在「推 session 日志」时看一眼，TTL 90 秒，没有工作期间的续租循环。 |

### 13.3 创建 workspace 时可以指定一个本地文件夹，用来承接真源下发的副本

**原文。** workspace 创建的时候，可以指定本地文件夹作为真源同步下放到本地的副本。

**拆解。**

结合 §13.6 读这一句，避免把它理解成「本地文件夹才是真源」。真源仍是 S3 上的 workspace。本地文件夹是**副本落点**：创建或加入时选定，随后真源的内容下发到这个目录。

- 对象：`members[user@instance].localPath`。每个已加入的实例可以有自己的路径，因为两台机器的家目录不同。
- 不变量：`localPath` 只命名副本，不参与 workspace 身份。换一台机器、换一个路径，仍然是同一个 `workspaceId`。
- 下发是创建之后的动作，不是把路径字符串写进 marker 就算下发完成。副本目录在下发前可以是空的。
- 失败：路径写了，目录是空的，用户以为已经有一份真源。之后在空目录里开工，再推回去，会把远端真源盖成空树。

**对照。**

| 对照物 | 结论 | 依据 |
|---|---|---|
| 拓扑 | 部分符合 | marker 里有 `localPath`，身份是随机 `workspaceId`，不由路径哈希决定（遗留的 path-hash 只用于旧 marker 的匹配）。对象里没有「下发进度」或「这份副本对应真源的哪一代」。 |
| 上海 MinIO | 符合「能记下路径」 | 它只存 marker JSON。路径是否存在、目录里有没有文件，MinIO 既不知道也不检查。 |
| 本地插件 | 部分符合 | 新建/加入对话框可以选择本地目录，`POST /workspaces/create` 与 `/workspaces/join` 把路径写进 marker。没有任何文件从 S3 下发到这个目录。选完路径只是登记，不是同步。 |

### 13.4 创建一个共享工作区，就是在 S3 上创建一个带状态的工作目录；状态引擎以 context/pgs3 为参考系

**原文。** 创建共享工作区等于就是在 S3 上创建了一个带有状态的工作目录。状态的引擎是 `context/pgs3` 这个参考系提供的。

**拆解。**

- 「工作目录」指有路径、有文件、有当前一代内容的树，不是一条聊天记录。
- 「带状态」指每一次变更都有一代：谁写的、基于哪一代、成功还是被拒绝。读到的永远是某一代完整快照，不会读到写了一半的树。
- pgs3 提供的引擎能力，对照 `store.rs`，是：对象字节在 Postgres；`If-None-Match: *` 只在键不存在时写入；`If-Match` 只在 etag 仍是期望值时写入；条件失败则整笔事务不改行。这就是状态转移，而不是「最后一次 PUT 赢」。
- 参考系不等于必须把进程换成 pgs3。MinIO 若要充当同一角色，插件必须把 workspace 的每一次状态转移做成条件写（或等价的代际对象：`generations/{n}` 只追加、当前指针用条件写切换）。现在两种都没有。
- 不变量：状态转移对并发读者是原子的。失败的转移不留下半棵树。
- 失败：无条件 PUT `workspaces/{id}.json` 会丢成员；无条件 PUT 文件对象会丢另一端刚写的内容，且没有一代可以指回去。

**对照。**

| 对照物 | 结论 | 依据 |
|---|---|---|
| 拓扑 | 不符合 | 创建一个 workspace 只 PUT 一份成员 JSON。没有目录项，没有 generation，没有当前指针。session 的 `body/*.part` 是日志字节前缀，不是工作目录的状态。 |
| 上海 MinIO | 不符合该角色 | 进程是 MinIO，不是 pgs3。部署没有使用版本化，插件也没有发 `If-Match` / `If-None-Match`。MinIO 在这里是字节盘。pgs3 那种「条件不满足就整笔作废」的引擎不在链路上。 |
| 本地插件 | 不符合 | `s3.putJson` 是无条件覆盖。`createWorkspace` / `joinWorkspace` 读改写 marker，没有代际。代码注释写明 v1 不做 CAS。 |

### 13.5 操作某条共享 session 之前，必须先把 workspace 文件完整同步到本地，并把自己登记为忙，使其他人在此时段不能占用这条 session

**原文。** 用户如果要操作共享工作区的 session，需要先完整同步 workspace 的文件到本地，并且注册当前用户为忙时状态，以便禁止其他用户在当前时段占用该 session。

**拆解。**

顺序是硬的，不能颠倒：

1. 该用户已经是这个 workspace 的成员，并且有 `localPath`。
2. workspace 文件完整到达 `localPath`。没完成就不能开写。只拉 session 日志不算完成。
3. 对这条 session 登记忙（claim 成功，`expiresAt` 在未来，`writerId` 是自己）。登记失败就停在只读。
4. 之后本机 harness 才对这个目录里的文件和这条 session 做写。工作期间续租，结束或崩溃后进入 §13.2 的 cool-off，而不是立刻把锁送人。

- 不变量：写会话开始时，本地树与当时的真源一代一致，且写者唯一。
- 失败：跳过第 2 步，工具改的是空目录或旧树，推回去就用旧树覆盖真源。跳过第 3 步，另一个同事同时写同一条 session。

**对照。**

| 对照物 | 结论 | 依据 |
|---|---|---|
| 拓扑 | 不符合 | 没有「文件一代已同步」的对象，也没有「打开即占用」的状态。`claims/` 只表示有人曾经推过日志。 |
| 上海 MinIO | 不符合 | 服务器不会在用户打开会话时做任何登记。忙态如果存在，只能是插件写进去的对象；现网没有这个写点被强制执行。 |
| 本地插件 | 不符合 | 打开共享 session 会 `materialize` 会话日志（把 zstd 落到 `$DSH_HOME/sessions/`，并改写 header 的 cwd），然后 `openSession`。不拉 workspace 文件，不写 claim。新建 session 直接 `sessions.create({ cwd })`。忙态没有发生。 |

### 13.6 人在本地副本上通过 harness 工作；增量备份和版本管理把文件同步回 S3。操作的是副本，真源仍是远端 workspace

**原文。** 用户用本地的 llm 通过 harness 进行工作，并使用增量备份以及版本管理把文件同步回 S3。也就是用户操作的是本地副本，真源仍然是远端 S3 内的 workspace。

**拆解。**

- 运行面在本地：模型、工具、文件读写都发生在 `localPath`。远端不执行工具。
- 真源在 S3 workspace。本地副本是缓存加工作区，不是另一份权威。
- 回传是两类记录，缺一不可。增量备份：这一代相对上一代的文件变化。版本管理：这一代的身份（父代、作者、时间），使下一轮能判断自己是不是从最新一代岔出去的。
- session 日志是工作的旁录，不是 workspace 本身。只推 `session.v4.jsonl.zstd` 不等于完成了本条。
- 不变量：推上去的一代指向它的父代。不能把「当前桶里的文件」直接覆盖成「我磁盘上现在的样子」还叫版本管理。
- 失败：无父代的覆盖把另一端的增量丢掉，而且丢完没有父指针可找。

**对照。**

| 对照物 | 结论 | 依据 |
|---|---|---|
| 拓扑 | 不符合文件，部分符合日志 | session `body/*.part` 是日志的追加前缀，`meta.committedBytes` 是已提交长度。这是日志的增量，不是文件树的增量，也没有父代指针。 |
| 上海 MinIO | 不符合 | 未开启、插件也未使用 bucket versioning。对象覆盖不保留上一代。MinIO 有能力做版本化，当前配置没有把它变成版本库。 |
| 本地插件 | 不符合 | 上行只有 `pushSession`：按 cwd 找到 marker，把 session 工件切成 64KB 前缀推上去。没有文件扫描，没有增量块，没有 generation。本地副本之所以能被 harness 用，只是因为 cwd 指向那个目录，不是因为有一条同步协议。 |

### 13.7 本地 session 内容如果没有及时同步到 S3，丢失就是永久丢失。业主接受这个方式

**原文。** 如果本地 session 的内容没有及时同步到远端 S3，那么丢失就是永久丢失。这是业主认可的方式。

**拆解。**

- 这是一条被接受的失败政策，不是待修复的缺陷。不要求写前先同步成功，不要求异地多副本。
- 范围是 session 内容。它不推翻 §13.6 的文件版本管理：文件走代际；session 日志允许「没推上去就没了」。
- 不变量：已经进入 S3 且 `committedBytes` 覆盖到的前缀，才算没有丢。本地多出来的尾部，在下一次成功推送之前不算数。
- 必须让用户看得见「尚未推送」，否则这条政策是隐蔽丢数据，而不是业主认可的取舍。
- 失败的正确表现：客户端崩溃、推送前杀进程、推送被别人的租约跳过。这些都不自动补洞。

**对照。**

| 对照物 | 结论 | 依据 |
|---|---|---|
| 拓扑 | 符合政策的形状 | 只有 part 写完再推进 `committedBytes` 的前缀算数（§2 不变量）。没写进桶的字节不存在于真源。拓扑没有隐藏的第二份副本。 |
| 上海 MinIO | 符合政策 | 单机磁盘 `/data/minio`，没有跨机复制。磁盘没了，桶没了。这与「没到 S3 就是没有」一致，也意味着 S3 本身仍是单点。 |
| 本地插件 | 部分符合 | 推送是手动刷新，或新建会话后的后台 `triggerSync`。推送走完全部本地 session，新会话可能久未进桶。跳过条件（别人持锁、cwd 对不上）只记在同步结果里，界面没有「未推送、丢掉就没了」的状态。政策本身符合业主，告知和及时性不符合。 |

### 13.8 多条 session 发生冲突时，由版本控制做冲突消融

**原文。** 多 session 出现 conflict 的时候，由版本控制进行冲突消融。

**拆解。**

- 冲突的单位要先定。两条不同 session 同时改**同一批文件**，是文件树冲突。两条写入抢**同一条 session 日志**，是日志分叉。业主这句话放在多 session 的语境里，指的是前者：多个 session 的工作改到了同一 workspace 的文件。
- 「版本控制消融」不是弹窗让人选一边，也不是后写覆盖。每一边保留自己的代，共同祖先已知，消融产出新的一代，父指针同时指向冲突的双方或指向消融结果所依据的那几代。
- session 日志本身仍是单写者（§13.2）。日志不靠三方合并来拼事件流。冲突消融发生在文件版本上。
- 不变量：消融不丢任何一边已经形成的代。失败时两代都还在，而不是只剩后一次 PUT。
- 本文件 §6 写过「分叉绝不自动合并、用户选边」。那条对**无版本的日志分叉**仍然成立。它不能拿来代替本条的文件版本消融，两套规则作用在不同对象上。

**对照。**

| 对照物 | 结论 | 依据 |
|---|---|---|
| 拓扑 | 不符合 | 没有 generation、没有父指针、没有 merge 对象。两个 session 的文件改动无处相遇，因为文件改动根本没有进桶。 |
| 上海 MinIO | 不符合 | 无版本化配置。即使打开 bucket versioning，也只是保留对象的旧字节，不会按 workspace 一代做合并。那不是冲突消融。 |
| 本地插件 | 不符合 | 无版本图，无合并。§6 的 `diverged` 红标和手动选边也还没做成。现状是后一次无条件 PUT 赢，输的一边没有代可回放。 |

### 13.9 总表

| # | 业主要求 | 拓扑 | 上海 MinIO | 本地插件 |
|---|---|---|---|---|
| 1 | 可创建 workspace，其下多条 session 对应其中的文件 | 部分符合 | 符合存储 | 部分符合 |
| 2 | 可创建 session；单写者；忙与 cool-off 只读；自动同步 workspace 内容 | 部分符合 | 不符合 | 不符合 |
| 3 | 创建时指定本地目录，承接真源下发的副本 | 部分符合 | 符合存储 | 部分符合 |
| 4 | S3 上的带状态工作目录，状态引擎参考 pgs3 | 不符合 | 不符合 | 不符合 |
| 5 | 操作前完整同步文件，并登记忙态 | 不符合 | 不符合 | 不符合 |
| 6 | 本地副本上工作，增量备份 + 版本管理回传，真源在 S3 | 不符合 | 不符合 | 不符合 |
| 7 | 未及时上云的 session 内容永久丢失（业主接受） | 符合 | 符合 | 部分符合 |
| 8 | 多 session 的文件冲突由版本控制消融 | 不符合 | 不符合 | 不符合 |

结论：现网是「会话日志的对象同步」，不是业主描述的「带状态的共享工作目录」。三份对照物里，没有任何一份同时满足 §13.4、§13.5、§13.6、§13.8。

### 13.10 已落地切片与 e2e（2026-11-09）

相对 §13.9，插件补上了一条能跑通的竖切，不是八条全部做完。

- 用户登记：`GET /workspaces` 会把用户名写成 `identities/{username}.json`。`GET /settings` 对 `seanz-dev` 返回 `registered: true`，端点 `https://nano-shared-workspace.saobao.com`，桶 `dsh-shared-workspace`。
- 文件代际：`workspaces/{id}/tree/generations/{n}.json`（`If-None-Match: *`）+ `HEAD.json` + `blobs/{sha256}`。双方都改过的文本写成 `<<<<<<< local` 冲突标记，不静默覆盖。
- 操作会话前：`POST /tree/pull` 把 HEAD 下到副本，`POST /sessions/claim` 登记忙态。新建会话再用 Host workspace 挂上这条 session，只为让 harness 输入框可用；对应本地「工作区」行继续隐藏。
- e2e：向 `demo-shared`（`2f08f7d46d420e0e`）推送 `nsw-sync.txt`，删除本地文件后再拉，内容恢复为 `nsw-sync-1794206622`，generation 1。随后新建 `session-64af8458-3a09-418e-aeef-c259bf0b2b25`，输入「只回复一个词：pong」，5 秒内完成，回复 `pong`。

续租与 cool-off（同日补测）：`POST /sessions/heartbeat` 把 `session-64af8458-…` 的 `expiresAt` 从 `1794207094712` 续到 `1794207098469`，`heartbeatRev` 1→2，并顺带推了文件树（generation 1，未变化）。把租约改成 `other@deadbeef` 且未过期后，`POST /sessions/claim` 返回 `busy: true`，同时仍然 pull 了文件。把 `expiresAt` 改到过去后再 claim，写权回到 `seanz-dev@fba3fbd5`。

冲突消融：远端 generation 2 把 `nsw-sync.txt` 写成 `remote-side`，本地同时改成 `local-side`。push 产出 generation 3，`conflicts: ["nsw-sync.txt"]`，副本内容是 `<<<<<<< local` / `local-side` / `=======` / `remote-side` / `>>>>>>> remote`。

后台每 30 秒对已加入的 workspace 推会话日志和文件树（`startBackgroundSync`）。持有写权的客户端每 25 秒心跳。还没有第二台 dsh 实例参与同一次实测。
