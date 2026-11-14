# [DNLS01 / macOS 平台切割] Closure

> 阶段: `DNLS01 — macOS local sandbox cutover`
> 范围: `P1–P8` 代码、测试、文档与收口复审。未合并。
> Close-type: `executed-on-branch-not-merged`
> 状态: `executed`（§10.2 每一行都有四元组；三路收口复审通过；未合并回 `main`）
> 分支: `dnls01-macos-platform-cutover` @ `f68c472` 之后的补测 commit
> 日期: `2026-11-14`

## 0. Verdict

执行计划在分支 `dnls01-macos-platform-cutover` 上标成 `executed`。`DNLS01-T18` 已在 `https://dsh-dev.local` 上 23/23 通过。三路收口复审通过。还没有合并回 `main`，也没有删除 worktree。

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
| [DNT] client 包 | `lib/client.js` 已按 `lanes.js` 重建，无 isolate | 🟢 short-verified |

## 2. 明确没做

- 没有合并回 `main`。
- 没有删除 worktree。
- ego 已经跑过，23/23。
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

§10.2 每一行都有四元组。三路收口复审通过：`antigreen-rereview.md`、`qna-final.md`、`completeness-final.md`。现场 [DNT] 缺的 schema 已补到 pnpm 加载目录。计划是 `executed`，但 close-type 不是 `full-close`，因为还没有合并。

## 修订历史

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| `r1` | `2026-11-14` | `DNLS01 执行 agent` | 初稿。计划保持 `reviewed`，不升 `executed`。 |
| `r2` | `2026-11-14` | `DNLS01 执行 agent` | T18 现场通过，§10.2 补齐全，计划升为 `executed`。未合并。 |
