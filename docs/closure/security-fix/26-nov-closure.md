# 26-nov-security-hardening — 收口

**AP** `docs/plan/security-fix/26-nov-security-hardening.md` · **todo** `docs/plan/security-fix/todo.26-nov.md` · **log** `docs/plan/security-fix/work-log.26-nov.md` · **reviews** `.anote/reviews/security-fix/26-nov/{9012,3456,7788}/`

执行：PH0→PH5 全批完成并验证；随后 ≥3 对抗审查（9012 nsw-wire、3456 content-render、7788 explorer+release）逐一 fix↔test 收口。收口 HEAD `e3ec789`（wire `503945d`/`58d5e4e`、serializer `6bb77a5`、misc `e3ec789`）。

## 五态归类

`verified` 本地重测过 · `observed-OK-at-closure` 现场观察过但依赖外部环境 · `partial` 部分验证 · `未观察` 无法观察 · `deferred` 有意推迟。

### 计划内批次（P0×13 / P2×9）

| 节点 | 范围 | 态 |
|---|---|---|
| P0 | wire-boundary 全 13 项（schema、nsw marker/meta/HEAD、route-sensitivity、compat） | **verified** |
| P2 | 4 harden + 5 accept | **verified**（5 accept 为记录态，非代码） |
| B3 | content-render allowlist 双 renderer + escaping + injection 闭环 | **verified** |
| B4-T01..T04 | 打包/版本/隔离/构建 | **verified** |
| B4-T05 | `release.yml` 真实 `v*` tag 全链 | **observed-OK-at-closure**（dry-run 过：npm ci×4→build→lib 门禁→attest；**真实 tag 触发的 handoff attestation 尚未被首个 v\* tag 证实**） |

### 对抗审查发现 → 修复

**9012 nsw-wire**（`.anote/.../9012/report.md`，PoC 于 `poc/`）

| 发现 | 修法 | 态 |
|---|---|---|
| **P1** `v:0` 鉴别器被任何 kind 绕过 → 伪造 v0 marker/session-meta 进 depth-only v0 校验 | `validate()` + `validateV0` 把 **v0 收敛到仅 manifest**；回归 case 07 | **verified** |
| **F1/P2** `member.instance` 公开 → co-tenant 复制行 + 改 `localPath` → pull 写任意目录/push 外传/match 认领 | **本地 pin**：create/join 把 `localPath` 钉进 `dshHome/nsw-pins/`，pin 为唯一成员证明；`trustedMember`/`localMember`/`matchWorkspace` 全走 pin，无 pin 即无成员 | **verified**（regression 08） |
| **F7** 变体：legacy `hash16(basename)` 无 `localPath` 也可认领会话 | hash-claim 同样要 pin | **verified** |
| **F4/P3** pull 中 dangling-symlink 祖先 → `existsSync` 看不见 → mid-pull wedge | `inside()` 用 `lstatSync` 走父链，现存祖先必须是真目录 | **verified** |
| **F3/P4** APFS 大小写折叠 → `ImAgInE`/`.Git`/`NODE_MODULES` 绕过 SKIP | SKIP 改大小写不敏感（skippedRel/scan/SKIP 集全小写） | **verified** |
| **F5/P5** 伪造 `committedBytes` mid-part → append 写偏 → 永久 transcript 撕裂 | pushSession 从 `floor(committed/CHUNK)` 起整 part 重写（自愈） | **verified** |
| P6 信息项（`__proto__` memberId、image key↔sha 未绑定、conflicts[] 无界、v0 对 client 无形状、无预取字节上限、zstd 无界） | 文档化接受（schema 已挡利用面；属加固余地非可回退风险） | **deferred** |

**3456 content-render**（`.anote/.../3456/report.md`）

| 发现 | 修法 | 态 |
|---|---|---|
| **F1** Med-High：注释逐字节回填，Chrome 在 `<!-->`/`--!>` 也闭合 → `<img onerror>` 在单遍消费（直接打开存的 `.html`）执行 | `sanitizeHtml` 注释**整体丢弃**（注释无渲染内容） | **verified**（battery +3 payload） |
| **F2** Med：样式值内 `&#59;` 作为 entity tail 逃过 `;` split 再解码成真 `;` → 单条允许 decl 内折叠任意 `name:value`（如 `position:fixed!important`） | `sanitizeStyle` 拒任何解码后值含 `;` 的 decl | **verified** |
| F3 correctness：`{"ok":false}`/`[{"ok":false}]` 被判无效 JSON | 正确性缺陷非安全面 | **deferred** |
| F4 informational：imagine 模板把 `~/.grok` 凭证拷进 agent workspace | 设计如此（凭证留在工作区、不进 danger-full-access）；exfil 面已在 prompt-injection 范围内；grep-gate/file-channel/exit-64 复核固 | **deferred**（见 F3-imagine-gitignore 缓解） |

**7788 explorer + release**（`.anote/.../7788/report.md`）

| 发现 | 修法 | 态 |
|---|---|---|
| **F1** HIGH：rename destination 未围栏 → `rename{name:".git"}` 植入武装 gitdir → `git add --all` filter RCE | `assertInside(destination)` 前置（变体：gitfile via `kind:"file"`） | **verified** |
| **F2** createFile/createFolder 只围栏 parent 不围栏 leaf → `name:".git"` 建 `<root>/.git` | 合成 leaf 也 `assertInside` | **verified** |
| **W2** moveEntry 把 realpath resolvedDir 对比**词法** workspaceRoot → symlinked root 误拒 | 对比 realRoot；destination 也过 `.git`+realRoot 双检 | **verified** |
| **F3** `imagine/.grok/` gitignore 是 repo-anchored，覆盖不了嵌套 imagine/ → staged creds 可被 `git add --all` | `imagineRun` stage 时写 `imagine/.gitignore`（`.grok/`+`.prompt.txt`+`.out.txt`） | **verified** |
| **W3** release.yml `git diff --exit-code` 漏 UNTRACKED 重建 lib | 改 `git status --porcelain` 抓 modified+untracked | **verified** |
| **W1** `assertInside` 把 `fs.resolve()` 失败 catch→return（fail-open）；resolve 对缺 leaf 不抛 → 真错误应拒写 | 改 fail-closed：resolve 错误即拒绝 | **verified** |
| **W5** host own-root undefined 时跨会话 warn 被压制 → adopt 无审计 | 无 baseline 时 `console.info` 记一条 adopt | **verified** |
| **W4** `.git` 正则大小写（APFS 会折叠 `.Git`） | informational：大小写不敏感文件系统下 lexical `.git` 段已拒；realpath 折叠后路径仍匹配 `/\.git/` | **deferred**（inert） |

## 残留风险（owner 明示）

1. **B4-T05 release handoff**：`release.yml` 的 `attest-build-provenance` + handoff attestation 只在真实 `v*` tag 下触发；本收口只 dry-run 过 build+门禁。**首个 v\* tag 前未证实**。
2. **9012-F1 一次性 rejoin**：成员 pin 是新增信任锚；升级前已 join 的 workspace **首次 sync 前需 re-join 一次**写 pin（否则 `localMember`/`matchWorkspace` 视为无成员 — fail-closed，不外传，但需用户重 join）。
3. **9012-P6 / 3456-F3/F4 / 7788-W4**：文档化接受或推迟，均非可回退功能面；清单见各 report。
4. **explorer `commitAll` 仍 `git add --all`**：功能合同不变；.git 围栏（F1/F2/W2）+ HEAD/post-add `.git` diff 兜底使武装 gitdir 难再被 add，但「用户工作区内可被 commit」的语义本身是设计面，非本批收口项。

## 门禁快照（收口 HEAD `e3ec789`）

| 门禁 | 结果 |
|---|---|
| `check-route-sensitivity` | 43 路由 0 drift |
| `check-feature-contract` | PASS（43 路由 + ui + dataLocations ×4） |
| `check-clean-lib` | 17 产物仅 node:* + 相对 import |
| `compat-regression` | 7/7（1 v0-backfill） |
| `security-regression` | **8/8 REJECTED**（+07 v0-discriminant、+08 member-pin） |
| `node --test` | schema 24 · policy 15 · notepad 46 · nsw 29 · model-selector 7 · explorer 5 = **126 全过** |

## handoff

- 四个插件 `lib/` 已按最终 src 重建并通过 clean-lib + tarball 隔离验证。
- 首个 `v*` tag 推之前，先看 `release.yml` 的 attest + handoff attestation 是否真的落盘（B4-T05 唯一 `observed-OK-at-closure` 项）。
- nsw 成员 pin 是新的本地信任锚：写 `dshHome/nsw-pins/<wsId>.json`，不随 bucket 走，卸载不删 —— 删 pin 即脱成员（fail-closed）。
