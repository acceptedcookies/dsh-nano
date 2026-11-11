# test/remote-schema/compat — 存量桶样本语料

存量 S3 桶的真实导出对象，供 `scripts/compat-regression.mjs`（P2-08 / `B1-T07`）跑 v1 schema 兼容校验。

## 判读纪律（写死，不挪）

- **来源必须真桶导出**（`.env.s3`），禁自生成自证。
- **覆盖六类**，每类至少 K=2 个样本（宪章下限；可更高）：`manifest/`、`files/`、`images/`、`marker/`、`session-meta/`、`tree-head/`。
- **只导元数据与小对象**：`manifest.json`、`files/*.md`、单个 `images/*`、marker / session-meta / tree-head JSON；大对象可 `.gitignore`。
- **通过率要求 100%**：v1 全兼容；v0 样本走只读 backfill（标 `compat:'v0-backfill'`）。
- 样本放置约定：一类一目录，文件名 = 对象名（或 `<sha8>.<ext>`）。

## 目录

| 目录 | schema kind | 来源字段 |
|---|---|---|
| `manifest/` | `manifest` | 桶根 `manifest.json` |
| `files/` | `file` | `files/*.md` |
| `images/` | `image` | `images/*` |
| `marker/` | `marker` | `.shared-workspace.json` |
| `session-meta/` | `session-meta` | `sessions/*.meta.json` |
| `tree-head/` | `tree-head` | `tree/HEAD` |

（P2-08 用 `.env.s3` 导出填充；本目录现为占位骨架，各 `.gitkeep` 保留空目录。）
