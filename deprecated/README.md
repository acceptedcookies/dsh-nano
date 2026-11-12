# deprecated/ — 已退役插件归档

本目录存放**已从活跃发布面移除**的插件。这里的源码只读：不参与构建门禁、不进 tarball、不列入 [RELEASE.md] 的「适用的包」，安装侧也不应再 `dsh plugin add`。

---

## `dsh-nano-shared-workspace/` — DEPRECATED

| 项 | 值 |
|---|---|
| 退役日期 | 2026-11-12 |
| 决定人 | [业主] |
| 原位置 | 仓库根 `dsh-nano-shared-workspace/` |
| 现位置 | `deprecated/dsh-nano-shared-workspace/`（`git mv`，全部历史保留） |
| 最后活跃提交 | `53d37bf`（`main`，Round 10 冷启动非阻塞修复 + ledger §9） |

`package.json` 已加 `private: true`（`npm publish` 会被硬拒）、`description` 加 `[DEPRECATED]` 前缀。

`devDependencies` 里的 `file:../packages/*` 是**移动前的相对路径**：`node_modules/` 里 npm 建的软链是 `../../packages/<name>`，移动后指向 `deprecated/packages/<name>`。为此在 `deprecated/` 下放了一个 `packages -> ../packages` 软链，让归档源码的裸包名仍能解析——`scripts/eval/*` 与 `scripts/security-regression/*` 的 import 已改指归档路径，实测 10 个模块全部可加载。该软链只是**归档兼容指针**，不是第二份 `packages/` 副本，不参与构建/发布；干净检出若 `node_modules/` 未生成，需先 `npm ci`（或补同样的软链）才能复现历史 PoC。

### 退役原因

[业主] 判定当前拓扑不能适应多用户同步：**对象级 S3 + 15s 轮询** 在办公室到 [SHV1] 的 WAN RTT 下，成本 = 会话数 × RTT，且存在 ≥15s 的同步盲区；清理测试桶时又暴露出「每文件/每 generation/每会话一个独立对象」带来的对象基数问题（1291 个 key）与递归 LIST 的 N×RTT 放大。即便 `endpointDirect` 绕开 Cloudflare 橙云把全量 sync 从 150s 压到 37s，也只是缓解，未改变协议形态。

方向改为在 [spark] 上建本地中心点：同宿主目录以 `rshared` 挂载做文件层 [单一真源]、SQLite + SSE 做轻量状态协调、bubblewrap 做 per-member 隔离。详见会话中的 [spark] `web-neo` 容器核查结论。

### 已拆线的活跃引用

以下位置已移除或改为 deprecated 注记，不再是「四个插件」的现行合同：

- 顶层文档：[README.md]、[INTRODUCTION.md]、[RELEASE.md]、`docs/agents/TEMPLATE.md`
- 发布/打包：[RELEASE.md] 的「适用的包」表与打包规则；`package.json` 加 `private: true`（`npm publish` 硬拒）
- 门禁脚本：`scripts/check-feature-contract.mjs`、`scripts/check-clean-lib.mjs`、`scripts/route-scan.mjs`
- 安全合同：`security/route-sensitivity.json`（移除 22 条路由）、`security/feature-contract.json`（移除 20 条路由 + ui/dataLocations 条目）
- 人工清单：`security/route-inventory.md` 该节标注 deprecated
- 依赖源码的回归脚本：路径已改指向 `deprecated/`，并标注不再纳入 CI

### 历史档案：不改写

以下目录是**已冻结的记录**，文中的 `dsh-nano-shared-workspace/...` 是当时的历史路径，未做批量替换（避免伪造历史），请按「当时在仓库根」理解：

- `docs/specs/dsh-nano-shared-workspace/spec.md`（历史规格草案）
- `docs/eval/26-nov/DNSW-1112-automation.md`（Round 1–10 自动化 ledger）
- `docs/code-review/26-nov/*`（安全审查与 QnA 冻结记录）
- `docs/specs/dsh-nano-performance-review/spec-26nov.md`
- `.anote/**`、`.agents/worktrees/**`（审计证据与旧 worktree 检出）

其中 `docs/specs/.../spec.md` 与 `docs/eval/.../DNSW-1112-automation.md` 顶部各加了一行 DEPRECATED 注记，正文不动。

### 运行时残留（不在本仓库）

退役只改仓库，不改已安装的实例。以下为 2026-11-12 清理时的状态，供 [业主] 核对：

- 测试桶 `dasw-1112-shared` 的 `workspaces/` 与 `claims/` 已清空，`identities/` 四个身份保留。
- `~/.dsh`、`~/.dsh-dev`、`~/.dsh-desktop` 的 `cordis.patch.yml` 仍带 `nano-shared-workspace` 配置行；`plugins/dsh-nano-shared-workspace/lib/` 仍在磁盘上。要彻底停用需在**各实例**自行移除配置行并重启。
- 已在 [spark] 上核查的 `web-neo` 容器（AppArmor/seccomp unconfined + `CAP_SYS_ADMIN` + bubblewrap 0.9.0 可用）与本次退役无依赖关系。

### 若要恢复

`git mv deprecated/dsh-nano-shared-workspace dsh-nano-shared-workspace` 后，需要反向恢复上述「已拆线」清单，并从 `deprecated/README.md` 删除本文件。不建议在无 [业主] 新裁决时恢复。
