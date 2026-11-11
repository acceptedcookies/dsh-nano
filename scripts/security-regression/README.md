# scripts/security-regression — PoC 重放 harness

把 `.anote/security-26nov` 的攻击 PoC 工程化成可重复执行的用例，断言宿主**拒绝**它们。基座（P1-09）已就位；具体用例随批次落盘。

## 结构

```
scripts/security-regression/
├── run.mjs            # 入口：发现 cases/*.mjs，逐个跑，判 rejected/not
├── lib/
│   ├── fake-s3.mjs    # 进程内 S3 stub（GET/PUT + ETag + If-Match/If-None-Match CAS）
│   └── page-fetch.mjs # fetchAsPage（token）+ fetchInPage（已认证页内 fetch）
└── cases/             # 每个 PoC 一个 .mjs：export {fingerprint, describe, run(ctx)}
```

## 判读门槛（写死）

- **拒绝 oracle**：用例 PASS ⟺ 宿主副作用**未发生** **且** 响应是 `{ok:false,reason}` / `{error}` 家族；**不是**「请求没抛错」。
- **baseline-RED**：每条用例应能在加固前 `90ac6b6` 上可执行；加固后同用例必须被拒。
- **确定性**：`node run.mjs --determinism 3` 连续结果一致（`B5-T05` 退出硬闸）。
- **逐 fingerprint 断言**（`B1-T03`：nsw remote-cross 6 条独立计，不并数）。

## 用法

```bash
node scripts/security-regression/run.mjs \
  --base https://dsh-dev.local --token <tok> [--only nsw:marker] [--determinism 3]
```

`--token` 可省（多数用例用 fake-S3 / loopback 直接打消费点，不走已认证页面）；需要 `connection.requestRejection` Peer 的用例用 `fetchInPage`（ego-browser 传入的 `page`）。

## 用例落盘（按批次）

| Test-ID | 用例 | 状态 |
|---|---|---|
| `B1-T03` | nsw remote-cross 6 fingerprint | pending（P2-03..06） |
| `B1-T06` | fetch-mp 30x 逐跳复验（loopback server） | pending（P2-07） |
| `B3-T02/T03` | 客户端+宿主 sanitize 负向语料 | pending（P3-02/03） |
| `B3-T07` | imagine 模板注入 | pending（P3-07） |
| `B4-*` | P2 加固（mutate realpath / git add / scopeOf / grok-creds） | pending（P4-01..04） |
