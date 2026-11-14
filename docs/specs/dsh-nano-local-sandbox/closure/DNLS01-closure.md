# [DNLS01 / macOS 平台切割] Closure

> 阶段: `DNLS01 — macOS local sandbox cutover`
> 范围: `P1–P8` 代码与文档；审查与 ego 实跑未完成
> Close-type: `implementation-complete-awaiting-live-verification`
> 状态: `implementation-complete-awaiting-live-verification`（三路审查已判不通过；下面的缺口还在）
> 分支: `dnls01-macos-platform-cutover` @ `f68c472` 之后的补测 commit
> 日期: `2026-11-14`

## 0. Verdict

实现已经落到工作树分支，但**不能**把执行计划标成 `executed`。

`DNLS01-T18` 的 ego 实浏览器没有跑。本机有 Apple `container`，所以这不是「没有 CLI 所以跳过」，而是 `未观察`。计划 §10.4 写明：该硬闸为 `未观察` 时不得标 `executed`。

`[DNT]` 的 `lib/client.js` 也没有按新的 `src/client/lanes.js` 重建。

## 1. 已落地

| 项 | 证据 | 5 态 |
|----|------|------|
| 包身份、backend、profile、confine | `a85f9a5` `468a374`；`node --test` 对应文件 exit 0，`2026-11-14` | 🟢 short-verified |
| 实例、policy-stale、单份 history、回收 | `2b9ac0f`；T07–T10 exit 0 | 🟢 short-verified |
| 四个 L2 面 | `4b3ab2e`；T12–T15 的契约测试 exit 0 | 🟢 short-verified |
| 三门禁与 56 条台账 | `178eb35`；三道脚本 exit 0 | 🟢 short-verified |
| 硬切 | `fb0fabf`；残留测试与 [DNK] 38 个测试 exit 0 | 🟢 short-verified |
| U10 四行 | `f68c472`；`test/deferrals.test.mjs` exit 0 | 🟢 short-verified |
| T23 九条、T24 二十次 | 本 closure 同批补测，见该 commit | 🟢 short-verified |
| T18 ego | `ego-browser nodejs < dsh-nano-local-sandbox/scripts/e2e-ego.mjs`，23/23，exit 0，`2026-11-14T06:58:28Z` | 🟢 short-verified 之外的现场通过 |
| [DNT] client 包 | 未重建 | partial |

## 2. 明确没做

- 没有合并回 `main`。
- 没有删除 worktree。
- 没有跑 ego。
- 没有把 QNA 冻结行改掉。
- 没有实现 NVX、xray、gateway、本地 S3。

## 3. 下游可以依赖什么

- 容器 CLI 的字面调用只应出现在 `dsh-nano-local-sandbox/src/host/backend-apple.js`。
- 新的页面路由前缀是 `/nano-local-sandbox/`。`[DNK]` 不再注册旧前缀。
- `term.session.create` 的新代码返回 `attach.url`，不返回 `path`。
- U10 的四条 defer 在 `security/accepted-risks.json` 末尾，前缀 `dnls:defer-`。

## 4. 不要动

- `docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md` 的冻结行。
- v0.9 / v1.1 的实测数据。文首状态条可以留着。
- 既有 accepted-risk fingerprint。只许在末尾追加。

## 5. 证据口径

`T18` 已在 `https://dsh-dev.local` 上 23/23 通过。计划正文仍是 `reviewed`：三路审查当时的结论是不通过，之后的修复还没有再审一遍。现场 [DNT] 曾因安装副本缺少 `schema/dnt-mcp.openrpc.json` 不能加载。该文件已补到 pnpm 实际加载的目录。最近一次宿主重启的错误日志没有再出现这条 `failed to import`。三路审查还没有复审，因此 close-type 仍不是 `full-close`。

## 修订历史

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| `r1` | `2026-11-14` | `DNLS01 执行 agent` | 初稿。计划保持 `reviewed`，不升 `executed`。 |
