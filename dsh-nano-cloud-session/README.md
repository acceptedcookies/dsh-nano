# dsh-nano-cloud-session (DNCS)

cloud-session 客户端插件：**在 dsh 内完成云端工作区的授权、同步与操作**。`devin-cloud-session` 是第一个适配的 carrier。

## 语义边界（[业主] 裁决 2026-11-14）

- 「云端工作区」= carrier 远端 VM 承载的**单租户 hosted workspace**；dsh 只做视窗与操作面，canonical 在远端（[单一真源]），不背多用户目录同步语义。
- 工作区生命周期 = session 生命周期（suspend 保快照，exit/过期即没）；插件不承诺长期存储。
- SSH lane（VM shell / scp / 端口转发）是核心功能的一部分：公钥 enroll 是账号级、一次性、无 API，插件只负责引导与命令生成，终端本体属 [DNT]。

## 凭证

- PAT / service user key（`cog_` 前缀，录入时强制形态校验）+ `org-…`：**host-only**，存 `${DSH_HOME}/nano-cloud-session.json`（0600），只写不读。
- 空 store 首次启动可从 `DEVIN_API_TOKEN` / `DEVIN_ORG_ID` / `DEVIN_API_BASE` 环境变量或 `${DSH_HOME}/nano-cloud-session.env` 种子。

## 接口映射（devin carrier, REST v3）

| 面板动作 | 宿主路由 | 上游 |
|---|---|---|
| 连接测试 | `POST /nano-cloud-session/config` `{action:test}` | `GET /v3/self` |
| 列表（游标 ≤200） | `POST /nano-cloud-session/sessions` | `GET /v3/organizations/{org}/sessions` |
| 详情/消息流/附件/insights/tags | `POST /nano-cloud-session/session` `{op:…}` | `GET …/sessions/{id}[/*]` |
| 新建 | `POST /nano-cloud-session/create` | `POST …/sessions`（prompt/title/tags/repos/devin_mode/max_acu_limit/resumable/playbook_id/…） |
| 发消息 | `POST /nano-cloud-session/message` | `POST …/sessions/{id}/messages` |
| 归档/取消归档 | `…/archive` `…/unarchive` | 同名 upstream |
| 终止/中止 | `POST /nano-cloud-session/terminate` | `DELETE …/sessions/{id}`（存活 session → suspended；**非硬删、不自动归档**，收尾需再 archive） |
| SSH 引导 | `POST /nano-cloud-session/ssh`；`config action:ssh-key` | 生成专用密钥对（0600），返 `ssh -i` 命令 + `-L` 模板 + 公钥，不 spawn |

首次打开无 profile 时面板自动落「设置」并显示三步引导卡；「连接测试」返回 token 解析 org 与填入 org_id 的匹配校验。安全状态卡（store 路径/权限/种子/token 策略）在设置页顶部（`config action:security`）。

已实测的方言（spike `test/spike/cloud-session-devin` V-01..V-16 + live-smoke）：403 = 无权或不可见（非 404）；DELETE = 中止非硬删、不自动归档；org 不可枚举（profile 手填）；`repos` 浅校验；`first` ≤ 200；SSH gateway 断无 channel 的 `ssh -N`。

## 构建与测试

```bash
npm install && npm run build   # esbuild → lib/
npm test                       # node --test：store / api dialect / route wiring
```

真实上游冒烟：`npm run build` 后用 `node test/live-smoke.mjs`（读 `DEVIN_API_TOKEN`/`DEVIN_ORG_ID`，跑 create→message→archive→terminate 闭环，消耗 ~0 ACU）。
