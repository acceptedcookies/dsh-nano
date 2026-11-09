# dsh-nano-shared-workspace — 设计与实现规格

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

**非目标（本期）**：

- 鉴权与用户权限管理（桶凭证即全部身份；后期再加对象签名/多角色）
- 工作区源文件同步（LayerFS 类版本树 —— 未来重型方向，见 §10）
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
│   ├── host/{entry,s3,sync,session-io,routes,state}.js
│   └── client/{index,panel,settings,prefs,i18n,styles}.js(x)
├── lib/{host.js,client.js}
├── scripts/build-client.mjs
└── docs/specs/dsh-nano-shared-workspace/spec.md  ← 本文件（仓库 docs/ 下）
```
