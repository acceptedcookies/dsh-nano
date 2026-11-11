# 工作日志 — 26-nov 安全加固执行

计划：`docs/plan/security-fix/26-nov-security-hardening.md`（对抗审查后 v1）。
方法：工作方法 STEP.0–8；五个批次按 DAG 串行，每 Phase 后 tick `todo.26-nov.md`。
基线：audit 24 findings → 16 high / 6 medium / 2 low；P0=13（remote-cross 7 + remote→page 6）、P2=9、local-supply 2。

## 批次进度总览

| Phase | 批次 | 范围 | 收口 commit | 门禁 |
|-------|------|------|-------------|------|
| PH1 | batch0-baseline | 台账 + skeleton + PoC 语料 | `e402df7` | — |
| PH2 | batch1-host-data | schema v1 + 4 消费点 | `68cc0e8` / `46be15e` / `2613e06` | B1 |
| PH3 | batch2-content-render | 双 renderer + imagine | `1ed3827` | B3 |
| PH4 | batch3-p2-supply | explorer 围栏 + 供应链 | `10e2f79` | B4 |
| PH5 | release-closure | 版本 + tarball + smoke | `10e2f79` | B5 |

## PH1 — baseline（`e402df7`）

- `security/{route-sensitivity,feature-contract,accepted-risks}.json`、`route-inventory.md`、`security-regression/` harness、`compat-regression.mjs`、`test/remote-schema/compat/`（7 真桶样本）。
- schema 包骨架；html-policy 表空、skeleton tests fail-closed。

## PH2 — batch1-host-data（`68cc0e8` + `46be15e` + `2613e06`）

- `P2-01` schema v1：`dsh-remote-data-schema` 六类 validator（manifest/file/image/marker/session-meta/tree-head）+ v0 只读兼容 + `SchemaReject`；detectVersion kind-aware（仅 manifest 默 v0-backfill，修 svg-mime 漏检）。24/24 tests。
- `P2-02` notepad `/s3/object`：`s3-sync.js` 接 schema，put 强制 v1、get 解码后验，`{ok:false,reason:'schema:<field>'}`；probe manifest corrupt 标记。37/37。
- `P2-03` nsw marker：`readMarker` + `ownMember`（严格 memberId=username@instance8 全 instanceId 匹配 + `localPath` 仅取自身），join 只改自身 member 行 — 关闭 marker-foreign-localPath exfil。
- `P2-04` nsw session：`validClaim`/`acquireClaim`/`renewClaim` ETag CAS（ifMatch/ifNoneMatch '*'，412 重读，4 次）；`readSessionMeta`/`pushSession`/`listRemoteSessions` 验 meta + key↔sessionId；`readBodyParts` parts≤ceil(committedBytes/PART_BYTES)，每 ≤64KiB。
- `P2-05` nsw tree：`replicaRoot` + `inside()` realpath 围栏（`..`/abs 拒→SKIP→symlink→祖先 realpath），SKIP += imagine；pull/push 验 tree-head。
- `P2-06` materialize + routes 边界 charset 双层（sessionId/workspaceId/localPath）。29/29 boundary tests。
- `P2-07` fetch-mp：`redirect:'manual'` + `allowedMpTarget` 逐跳复验（`^https://mp.weixin.qq.com/s/` https-pinned），cap 5。
- `P2-08` compat：真桶 7 样本全过（6 v1 + 1 v0-backfill manifest）。
- regression `cases/01..06`：6 fingerprint 全 REJECTED ×3 deterministic。

## PH3 — batch2-content-render（`1ed3827`）

- `P3-01` `dsh-html-policy`：ALLOWED_ELEMENTS/ATTRS/SCHEMES/STYLE_PROPS + POLICY；`sanitizeStyle`（白名单 + position 强制 static，entity-aware decl split）；`urlPolicy`（entity-decode + strip control 再 scheme 校验 → 杀 `&#106;avascript:`/`java\tscript:`）；`elementAction`（drop/keep/unwrap）；`PASSTHROUGH_ELEMENTS={foreignobject}`（留 client 重写）；`attrPolicy`/`escapeAttrValue` 重编码 `<>&"` 解 mXSS；`sanitizeHtml` 序列化器。15/15（battery-dom 24 payload 全拒，noscript-mxss 修复）。
- `P3-02` 客户端 `sanitizeRichHtml` → DOMParser + 共享 policy walk；foreignObject→`<image>`、data-src 提升、position:static 保留。panel.js data-* 转义。
- `P3-03` 宿主 `sanitizeMpHtml` → `src/host/mp-sanitize.js`→`lib/mp-sanitize.js`，共用序列化器；data-src/visibility 保留。byte-parity（3-way：新==旧 regex==snapshot，2242B）。
- `P3-04` image mime/base64：`dsh-remote-data-schema/image-check.js`（4 mime + charset + %4 + canonical round-trip + decoded≤cap）；sync.js:247 入库前 + markdown.js:165 `data:` src 前。
- `P3-05` manifest/workspaceId 属性转义：cleanRemoteFile id charset + `..` 拒；panel data-* 全转义。
- `P3-06` `json.js` MAX_DEPTH=32 受控拒绝（100k 深弹不 RangeError）。
- `P3-07` imagine：`{prompt}`/`{out}`/`{cwd}` **全删占位** — prompt/out 经 `imagine/.prompt.txt`+`.out.txt` 文件信道（数据非 shell），`{cwd}`→`$PWD`，grep -Eq out-gate exit-64 先于 creds copy；`isValidImagineOut/isValidImagineCwd/validateImagineArgs/imagineRun` 边界。7/7。
- `P3-08` mp 正向快照回归：`fixtures/mp-article.html` + `.expected.html`。

## PH4 — batch3-p2-supply（`10e2f79`）

- `P4-01` explorer mutate：`assertInside` → async realpath-aware（`fs.resolve(root)`+`fs.resolve(path)`→`isLexicallyInside(realRoot,realPath)`），5 mutator 全接 — 关 symlink-ancestor 逃逸（accepted-risks 标「加固+边缘」）。
- `P4-02` `.git` 拒绝：assertInside 拒 `<root>/.git/**`（lexical+resolved 双重）；`commitAll` 加 post-add `git diff --cached --name-only` `.git` 兜底。
- `P4-03` scopeOf 跨会话：`root≠sandboxPolicy.workspaceRoot` 时 `console.warn('[nxe] scopeOf cross-session')`，日志-only。
- `P4-04` grok-creds：`.gitignore += imagine/.grok/`（nsw SKIP+=imagine 已 P2-05）— staged creds 既不被 commit 也不被 push。
- `P4-05` `accepted-risks.json`：9 条 optionalHardening/monitoring/ownerSignoff/reviewDate 全填；mutate-symlink 标「加固+边缘」。
- `P4-06` npx 回退移除：4 build-client 仅本地 `node_modules/.bin/esbuild`，缺失 exit 1 + npm ci 提示。
- `P4-07` release CI：`.github/workflows/release.yml` on `v*` → npm ci×4 → build → `git diff --exit-code -- lib/`（可重现）→ clean-lib/routes/contract/compat/regression 门禁 → npm pack → SHA256SUMS → `attest-build-provenance` + artifact。
- explorer `test/mutate-fence.test.mjs` 5/5（真 symlink 三 mutator 拒、.git 拒、in-workspace 不受影响）。

## PH5 — release-closure（`10e2f79`）

- `P5-01` 版本：四插件 0.1.1/0.1.0→0.2.0；files 覆盖全部 lib 产物。
- `P5-02` tarball 隔离：四 `.tgz` 自足（0 runtime dep、0 `file:`、0 bare import）+ `~/.dsh-dev` 重装激活。
- `P5-03` dsh-dev smoke：四 host 载入（401→cookie 全过）— notepad `/s3/status` 真桶、model-selector `/catalog`、nsw `/status`、explorer 注册 + scopeOf 跨会话 log 已现场观察（`/status` 对未知会话正确报 unknown）。

## 门禁快照（每次收口）

route-sensitivity 0-drift（43 路由）· feature-contract PASS · clean-lib 17/17 · compat 7/7 · regression 6/6 · tests：schema 24 + policy 15 + notepad 46 + nsw 29 + explorer 5 + imagine 7。

## REVIEW + closure

见 `.anote/reviews/security-fix/26-nov/{9012,3456,7788}/report.md`（≥3 对抗审查）与 `docs/closure/security-fix/26-nov-closure.md`（五态归类 + handoff）。

## REVIEW fix↔test 收口（`503945d`→`e3ec789`）

三份对抗审查（9012/3456/7788）逐条 fix↔test，全绿后收口：

- **9012 F1/F7** nsw 成员信任锚 → 本地 pin（`dshHome/nsw-pins/`），pin 为唯一成员证明；pull/push/match 全走 pin；regression 08。
- **9012 P1** v0 鉴别器收敛 manifest-only；**F3/F4/F5** SKIP 大小写、dangling-symlink wedge、整 part 重写 — 全 PoC 死。
- **3456 F1/F2** 注释早闭逃逸（丢注释）+ `&#59;` 样式值 smuggle（解码值含 `;` 即丢 decl）。
- **7788 F1/F2/W2** rename/createFile/createFolder leaf+destination 围 `.git`，moveEntry 对 realRoot；**F3** imagine/.gitignore staging；**W3** release 用 `git status --porcelain`；**W1** assertInside fail-closed；**W5** scopeOf 无 baseline 时 audit info。
- 门禁终态：route 0-drift · contract PASS · clean-lib 17 · compat 7/7 · regression **8/8** · tests **126**。
- 收口文档 `docs/closure/security-fix/26-nov-closure.md`（五态 + 残留 + handoff）。
