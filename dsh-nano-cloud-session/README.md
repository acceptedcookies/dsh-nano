# dsh-nano-cloud-session (DNCS)

cloud-session 客户端插件：**在 dsh 内完成云端工作区的授权、同步与操作**。`devin-cloud-session` 是第一个适配的 carrier。

## 语义边界（[业主] 裁决 2026-11-14）

- 「云端工作区」= carrier 远端 VM 承载的**单租户 hosted workspace**；dsh 只做视窗与操作面，canonical 在远端（[单一真源]），不背多用户目录同步语义。
- 工作区生命周期 = session 生命周期（suspend 保快照，exit/过期即没）；插件不承诺长期存储。
- SSH lane（VM shell / scp / 端口转发）当前只做引导：公钥 enroll 是账号级、一次性、无 API，插件生成密钥对与命令，不 spawn。产品 `/workspace connect` 在宿主存在正式授权 owner 之前一律 `503 workspace-unavailable`；终端本体属 [DNT]，远端执行绑定未获批准前不宣称可用。

## 凭证

- PAT / service user key（`cog_` 前缀，录入时强制形态校验）+ `org-…`：**host-only**，存 `${DSH_HOME}/nano-cloud-session.json`（0600），只写不读。
- 空 store 首次启动可从 `DEVIN_API_TOKEN` / `DEVIN_ORG_ID` / `DEVIN_API_BASE` 环境变量或 `${DSH_HOME}/nano-cloud-session.env` 种子。

## 接口映射（devin carrier, REST v3）

| 面板动作 | 宿主路由 | 上游 |
|---|---|---|
| 连接测试 | `POST /nano-cloud-session/config` `{action:test}` | `GET /v3/self` |
| 列表（游标 ≤200） | `POST /nano-cloud-session/sessions` | `GET /v3/organizations/{org}/sessions` |
| 详情/消息流/附件/insights/generate_insights/tags/set_tags/append_tags/sleep | `POST /nano-cloud-session/session` `{op:…}` | `GET/POST …/sessions/{id}[/*]` |
| 新建 | `POST /nano-cloud-session/create` | `POST …/sessions`（全量 SessionCreateRequest，含 playbook/knowledge/secrets/attachments/structured output/security profile） |
| 目录 | `POST /nano-cloud-session/catalog` | `GET …/playbooks`、`…/secrets`、`…/knowledge/notes`、`…/repositories` |
| 附件上传 | `POST /nano-cloud-session/upload` | `POST …/attachments` multipart |
| 发消息 | `POST /nano-cloud-session/message` | `POST …/sessions/{id}/messages` |
| 归档/取消归档 | `…/archive` `…/unarchive` | 同名 upstream |
| 终止/中止 | `POST /nano-cloud-session/terminate` | `DELETE …/sessions/{id}`（存活 session → suspended；**非硬删、不自动归档**，收尾需再 archive） |
| SSH 引导 | `POST /nano-cloud-session/ssh`；`config action:ssh-key` | 生成专用密钥对（0600），返 `ssh -i` 命令 + `-L` 模板 + 公钥，不 spawn |

侧栏「工作区」上方激活「云端工作区」小节；无 profile 时显示三步引导行，点小节右侧齿轮打开设置弹窗（nano-ui tabs：接入 / 会话 / 安全 / SSH）。[业主] 裁决（2026-11-19）：中央 Chat 只能原生映射 Devin，无手写工作台；右侧综合 tab 已废弃。真实云文件与独立附件 tab 需要已验证的宿主 cloud-view/严格 capability 过滤合同才允许打开——该合同尚不存在，因此 `native_open` 与 `workspace_shell` 在 profile 解析之前一律返回 `503 NATIVE_UNAVAILABLE`，不读消息、不 mint、不切换任何会话，更不混入 Kitesurf/[DNT]/本地 session/本地 shell。点击会话行在不可用时仅显示「当前宿主无法打开原生云会话；未切换到本地会话。」「接入」tab 集中管理 Devin token/Org/Base URL/连接测试/权限清单；「会话」tab 管理新建默认值。「连接测试」返回 token 解析 org 与填入 org_id 的匹配校验；安全状态（store 路径/权限/种子/token 策略）在「安全」tab（`config action:security`）。

已实测的方言（spike `test/spike/cloud-session-devin` V-01..V-16 + live-smoke）：403 = 无权或不可见（非 404）；DELETE = 中止非硬删、不自动归档；org 不可枚举（profile 手填）；`repos` 浅校验；`first` ≤ 200；SSH gateway 断无 channel 的 `ssh -N`。

## 构建与测试

```bash
npm install && npm run build   # esbuild → lib/
npm test                       # node --test：store / api dialect / route wiring
```

真实上游冒烟：`npm run e2e`（默认 `~/.dsh-dev`，可用 `E2E_DSH_HOME` 覆盖；读 active profile，跑 self/upload/create+attachment/messages/attachments/tags/sleep/archive 闭环，不打印 token）。旧 `scripts/live-smoke.mjs` 仍可独立使用。

配对工作区探针（SSH + MCP，opt-in，不进 `npm test`，不属产品授权）：`DNCS_LIVE_WORKSPACE=1 DNCS_PROBE_PROFILE=<profile-id> DNCS_PROBE_SESSION=devin-… node scripts/e2e-devin-workspace.mjs`。profile 与 session 都必须显式指定，且 `/v3/self` 的 org 与会话 id 必须与该 profile 一致；在 probe cwd 下以 `mktemp -d` 独占私有根，create-only 写入。未知 host key 必须提供 `DNCS_EXPECTED_FINGERPRINT`，不再使用 `accept-new`。CLI 独立实测只证明指定 session 的基础设施链路，不等于 UI 已获准连接。

历史范围：本包早期只覆盖 Devin API 会话面。design-1119 把 SSH 资源面（专用 known_hosts、fingerprint 确认、哈希 artifact、MCP fs/process）收进同一配对；PTY/端口转发在宿主缺少 H-EXEC 时显式 `NATIVE_UNAVAILABLE`，不回退本机 cwd/文件/终端。
