# DNCS × Devin Cloud 接入：文档追溯、目标模式与 Onboarding 规格

> 文档路径：`docs/specs/dsh-nano-cloud-session/onboarding-devin-docs.md`
> 所属包：`dsh-nano-cloud-session`（[DNCS]）
> 对应 worktree：`.agents/worktrees/dncs-devin-cloud-session-full`，分支 `dncs-devin-cloud-session-full`
> 文档日期：2026-11-15（Asia/Shanghai）
> 状态：v1（2026-11-15 已落地目标模式代码与 dsh-dev 部署；真实 Devin 上游待 [业主] 输入 token 验收）
> 读者：在 worktree 内实现 DNCS 的 agent；以及配置 Devin 侧账号的 [业主]

---

## 0. 目标模式（Target Mode）摘要

[DNCS] 不是「Devin 专用插件」，而是 **cloud-based session 的 carrier 抽象**：Devin 是第一个 carrier，后续 carrier 共享同一套 sidebar / session / settings 外壳，只在「接入」tab 内替换 carrier preset 与 onboarding 字段。

目标模式用四句话锚定：

1. **一个入口**：侧栏「工作区」上方的「云端工作区」小节是唯一入口；不再有悬浮按钮、右下角圆钮或浮动面板。
2. **一个接入 tab**：Devin 的 token、Org ID、base URL、连接测试、权限检查、文档链接、当前身份与健康状态全部放在设置弹窗的「接入」tab 内；不再把接入字段散落在「凭证 / 安全 / SSH」多个 tab。
3. **一个 carrier preset**：`devin-cloud-session` 是一份声明式 preset（显示名、认证形态、必填字段、默认 baseUrl、能力矩阵、onboarding 文案、Devin 侧准备步骤、权限清单）；Devin 只是 preset 的第一个实例，后续 carrier 新增 preset 而不是复制整套 UI。
4. **一套原生 UI**：全部按钮来自 `@deepseek-ai/dsh-client-ui-primitives` 的 `Button`，全部 glyph 来自 `Icon*` artwork，弹窗使用 `NanoDialog`（原生 `Modal`）+ `nanoTabs`；不手写按钮、不手写 SVG。

目标模式的验收不是「能连上 Devin」，而是：

- 新用户从侧栏小节到第一条云 session 不超过 3 个明确步骤；
- 接入失败时，错误只出现在「接入」tab，且给出可执行的下一步；
- Devin 的 API key / org 匹配 / 权限不足 / baseUrl 错误 / 429 都有独立可读状态；
- 新增第二个 carrier 时，不需要改 `section.js`、`session-dialog.js` 或 sidebar 结构，只新增 preset 与 carrier adapter。

---

## 1. Devin 文档追溯（2026-11-15）

### 1.1 权威来源

| 文档 | URL | 本文采用的事实 |
|---|---|---|
| API Overview | <https://docs.devin.ai/api-reference/overview> | v3 分 Organization API（`/v3/organizations/*`）与 Enterprise API（`/v3/enterprise/*`）；服务用户凭据 `cog_` 前缀；session 归属与 `create_as_user_id` |
| Authentication / RBAC | <https://docs.devin.ai/api-reference/authentication>、<https://docs.devin.ai/api-reference/v3/overview> | Bearer `cog_`；权限按 org/enterprise 分级；`UseDevinSessions`、`ViewOrgSessions`、`ImpersonateOrgSessions` 等 |
| List Sessions | <https://docs.devin.ai/api-reference/v3/sessions/organizations-sessions> | `first` 默认 100、最大 200；`after` 游标；全量 query（`tags`、`origins`、`is_archived`、时间窗、`playbook_id`、`parent_session_id`、`session_ids` 等） |
| Create Session | <https://docs.devin.ai/api-reference/v3/sessions/post-organizations-sessions> | `prompt` 必填；`title`/`tags`/`repos`/`devin_mode`/`max_acu_limit`/`resumable`/`playbook_id`/`knowledge_ids`/`secret_ids`/`session_secrets`/`attachment_urls`/`platform`/`struct...` 等 |
| Get Session | <https://docs.devin.ai/api-reference/v3/sessions/get-organizations-session> | 状态枚举、`status_detail`、`acus_consumed`、`pull_requests`、`security_profile`、`structured_output` |
| List messages | <https://docs.devin.ai/api-reference/v3/sessions/get-organizations-session-messages> | `first` 默认 100、最大 200；`after`；消息 `source` 为 `devin`/`user` |
| Send message | <https://docs.devin.ai/api-reference/v3/sessions/post-organizations-sessions-messages> | `POST .../messages`，正文 `{message}`；可唤醒挂起 session |
| List attachments | <https://docs.devin.ai/api-reference/v3/sessions/get-organizations-session-attachments> | 返回 `attachment_id/name/url/content_type/source` |
| Get tags / Append / Replace | <https://docs.devin.ai/api-reference/v3/sessions/get-organizations-session-tags> 等 | `GET` 读取；`POST` 追加；`PUT` 替换；最多 50 个 tag |
| Insights | <https://docs.devin.ai/api-reference/v3/sessions/get-organizations-session-insights>、<.../organizations-sessions-insights>、<.../insights/generate> | session 级读取/生成；列表级 insights 查询 |
| Sleep Session | <https://docs.devin.ai/api-reference/v3/sessions/post-organizations-sessions-sleep> | `POST .../sleep`；返回 session；与 `DELETE`（terminate）不同 |
| Archive / Unarchive | <https://docs.devin.ai/api-reference/v3/sessions/post-organizations-sessions-archive>、<.../unarchive> | `POST .../archive` / `.../unarchive` |
| Terminate | <https://docs.devin.ai/api-reference/v3/sessions/delete-organizations-sessions> | `DELETE .../sessions/{devin_id}`；**中止**而非硬删；不自动归档 |
| Playbooks | <https://docs.devin.ai/api-reference/v3/playbooks/organizations-playbooks> | 只读目录（`playbook_id/title` 等） |
| Secrets | <https://docs.devin.ai/api-reference/v3/secrets/organizations-secrets> | 只读目录（`secret_id/key/note/secret_type/access_type`）；不要回显 secret 值 |
| Knowledge notes | <https://docs.devin.ai/api-reference/v3/notes/organizations-knowledge-notes> | 只读目录（`note_id/name/trigger/is_enabled` 等） |
| Repositories | <https://docs.devin.ai/api-reference/v3/repositories/organizations-repositories> | 只读目录（`repo_path/repo_full_name/repo_name` 等） |
| Attachments upload | <https://docs.devin.ai/api-reference/v3/attachments/post-organizations-attachments> | `POST /v3/organizations/{org_id}/attachments`，multipart `file` |
| Pagination | <https://docs.devin.ai/api-reference/concepts/pagination> | `items` + `has_next_page` + `end_cursor`；`after` 游标 |
| Common Flows | <https://docs.devin.ai/api-reference/common-flows> | 把本地 repo/branch/diff 打包进 prompt 再 handoff 的推荐流程 |

### 1.2 文档事实与旧实现的关键差异

| # | 文档事实 | 旧 DNCS 实现 | 结论 |
|---|---|---|---|
| D1 | `DELETE /sessions/{id}` = terminate（中止，不自动 archive） | 代码注释正确，但 route ledger 曾写「终止 VM + 归档」 | 修正 ledger；UI 明确「中止 ≠ 归档」 |
| D2 | 有 `POST .../sleep`，可显式休眠保留 VM 快照 | 未暴露 | 加入 session op `sleep` |
| D3 | tags 有 `GET` + `POST`（append）+ `PUT`（replace） | 只有 `get`/`set_tags`（PUT） | 增加 `append_tags`；UI 提供追加/替换 |
| D4 | list sessions 支持 15+ 过滤参数 | 只用了部分 | 全量映射 |
| D5 | create 支持 `secret_ids`、`session_secrets`、`session_links`、`create_as_user_id`、`child_playbook_id`、`memory_enabled`、`bypass_approval`、`security_profile`、`structured_output_*` | 只映射部分 | 全部映射 |
| D6 | `attachment_urls` 是 create 字段；附件本身可 `POST /attachments` multipart 上传 | 只有 list attachments | 增加 `/upload` 宿主代理与 UI 上传 |
| D7 | playbooks/secrets/knowledge/repositories 是 org-level 只读目录 | 无 | 增加 `/catalog` 只读代理与新建表单选择器 |
| D8 | 错误体是 RFC 9457 `ProblemDetail`（`detail/title/status/error_code/errors`） | 兼容读取 `error.message`/`message`/`detail` | 增加 `error_code` 保留；403 仍不能当 404 |
| D9 | `devin_id` 是 `devin-` 前缀；列表 query 也有 `devin_id` | `needSessionId` 强制 `devin-` | 保持；UI 不把 403 渲染成不存在 |
| D10 | 文档没有「SSH API」；SSH 是 CLI/账号级手工 enroll | 当前生成专用 keypair + 命令，属于产品增强 | 保留，但明确不是 Devin API 的官方 lane |

### 1.3 Devin 侧必须配合的事项

| 项 | 需要 Devin 侧做什么 | 不做会怎样 |
|---|---|---|
| Service user | 创建 service user，生成 `cog_` PAT；角色至少含 `UseDevinSessions`（`org.devins.use`） | 无法创建/发消息 |
| Org ID | 从 Devin 后台复制 `org-…`；当前 API 不能枚举 org | 所有 org 路径 404/不可用 |
| 读全组织 session | 若需查看非本 token 创建的 session，授予 `ViewOrgSessions` | 只能看到本 service user 创建的 session |
| `create_as_user_id` | 若使用代用户创建，授予 `ImpersonateOrgSessions`，且目标用户有 `UseDevinSessions` | 该字段 403/422 |
| Playbooks / Knowledge / Secrets / Repos 目录 | 对应读取权限与已配置资源 | 新建表单目录为空；不影响手动填 ID |
| SSH enroll | 在 Devin Settings → SSH keys 手工粘贴公钥（账号级、一次性） | SSH 命令无法连通；插件只生成命令 |
| 出站网络 | 运行 dsh 的宿主可访问 `https://api.devin.ai` | 连接测试 `unreachable` |
| API 版本 | Organization API v3；`baseUrl` 默认 `https://api.devin.ai` | 旧 v1/v2 路径不匹配 |

> 不要在插件内硬编 token、org 或 baseUrl；不要假设 Devin 允许浏览器直连（本插件始终同源 proxy 到宿主）。

---

## 2. 当前 DNCS 状态与差距

### 2.1 已具备（HEAD / 本 worktree 之前）

- 侧栏「云端工作区」小节（graft 到原生「工作区」上方），原生 `projectRow` 风格 + 原生按钮/图标。
- `settings-dialog.js`：`NanoDialog` + `nanoTabs`，当前 tab 为「凭证 / 安全 / SSH」。
- 宿主 `index.js`：`/status`、`/config`、`/sessions`、`/session`、`/create`、`/message`、`/archive`、`/unarchive`、`/terminate`、`/ssh` 共 10 条路线。
- `devin-api.js` 已有 list/get/messages/attachments/insights/tags(set)/archive/unarchive/terminate。
- profile store：`${DSH_HOME}/nano-cloud-session.json`（0600），token write-only，env seed。

### 2.2 差距矩阵

| 能力 | 文档 | 当前实现 | 目标模式 |
|---|---|---|---|
| Session list 全量过滤 | `SessionsQueryParams` 全字段 | 部分 | 全部透传 + UI 过滤器 |
| Session get | 全字段 | 有 | 完整展示 status_detail/ACU/PR/structured output/security profile |
| Create 全字段 | 20+ 字段 | 部分 | 全字段 + 预设默认 |
| Messages 分页 | `after`/`first` | API 有，UI 无 | UI 显示加载更多 |
| Attachments 列表 | `GET .../attachments` | API 有，UI 无 | 「附件」tab |
| Attachments 上传 | `POST /attachments` multipart | 无 | `/upload` route + 选择文件 |
| Tags 读/追加/替换 | GET/POST/PUT | 只有 GET/SET | UI 「标签」tab，追加/替换 |
| Insights | session/list/generate | API 有，UI 无 | 「洞察」tab + 生成按钮 |
| Sleep | POST `/sleep` | 无 | 会话动作「休眠」 |
| Archive/Unarchive/Terminate | 有 | 有 | UI 动作完整 |
| Playbooks 目录 | org-level list | 无 | `/catalog` + 新建会话 playbook 选择 |
| Secrets 目录 | org-level list | 无 | `/catalog` + 多选 secret_id |
| Knowledge 目录 | org-level list | 无 | `/catalog` + 多选 knowledge_id |
| Repositories 目录 | org-level list | 无 | `/catalog` + repo 多选 |
| 单一接入 tab | 产品要求 | 分散在凭证/安全/SSH | 「接入」tab 包含全部 Devin 接入 |
| 多 carrier preset | 产品要求 | 只有 Devin 硬编码 | preset 注册表 + 首个 Devin preset |

---

## 3. 目标架构：carrier preset + 统一外壳

### 3.1 Carrier preset 模型

在客户端新增 `carriers.js`（或 `carriers/devin.js`）作为**声明式 preset**：

```js
export const CARRIER_PRESETS = [{
  id: 'devin-cloud-session',
  label: 'Devin Cloud',
  shortLabel: 'Devin',
  carrier: 'devin',
  auth: {
    kind: 'service-user-pat',
    tokenPrefix: 'cog_',
    fields: ['label', 'orgId', 'secret', 'baseUrl'],
    docs: {
      apiKeys: 'https://app.devin.ai/settings/api',
      orgId: 'https://app.devin.ai/settings',
      sshKeys: 'https://app.devin.ai/settings/ssh',
    },
  },
  defaults: {
    baseUrl: 'https://api.devin.ai',
    devinMode: 'normal',
    resumable: true,
  },
  capabilities: {
    sessions: true, messages: true, attachments: true, tags: true,
    insights: true, sleep: true, playbooks: true, secrets: true,
    knowledge: true, repositories: true, upload: true,
  },
  onboarding: {
    title: '接入 Devin Cloud',
    steps: [
      { id: 'token', title: '生成 Service User Token', body: 'Devin Settings → API → 生成 cog_ 前缀的 PAT' },
      { id: 'org', title: '复制 Org ID', body: '同一页面复制 org-…；API 不能枚举 org' },
      { id: 'test', title: '连接测试', body: '保存后点「连接测试」，principal_type 正常即接通' },
    ],
  },
}]
```

> 这是「Devin 预设」：不是 dsh agent preset，也不是第二个插件；它是 carrier onboarding 的声明。以后新增 `carrier: 'cursor-cloud'` 等只需新增一个 preset 与一个 `devin-api` 同级 adapter。

### 3.2 设置弹窗 tab 重排

当前（旧）：`凭证 / 安全 / SSH` —— 把「接入」和「运行配置」混在一起，且 Devin 的 token/org/baseUrl 与 SSH key 分散在三个地方。

目标（新）：

| tab | 内容 | 说明 |
|---|---|---|
| **接入** | carrier preset 选择器（当前只有 Devin Cloud）；`label`、`Org ID`、`API Token`、`Base URL`、`连接测试`、当前身份（`principal_type` / `service_user_name` / orgMatch）、权限清单、Devin 文档深链、保存/设为当前、删除 profile | **所有 Devin 接入相关内容只在这里**；首次打开无 profile 自动落此 tab |
| **会话** | 默认 `devin_mode`、默认 `max_acu_limit`、默认 `resumable`、默认 tags、默认 playbook、默认 repos、列表过滤偏好（show archived / poll interval） | 运行偏好，不放 token |
| **安全** | store path / mode 0600 / env seed / token write-only policy / 风险提示 | 只读状态 |
| **SSH** | 生成/查看专用密钥对、公钥复制、enroll 步骤、端口转发模板 | 保留，但明确「非 Devin API lane」 |

> 接入 tab 内不要出现 SSH 按钮；SSH 是账号级手工动作，放在独立 tab，避免首次接入被 SSH 干扰。

### 3.3 侧栏小节交互

- 小节标题：`云端工作区`；右侧 3 个 `Button`（`IconRefreshOutlineRegular` / `IconSettingsOutlineRegular` / `IconProjectAddOutlineRegular`），位置与原生「工作区」标题栏一致。
- 无 profile：显示一行 `尚未配置云端工作区`，点击打开设置「接入」tab。
- 有 profile：显示 `carrier label · 当前 profile label` 工作区行，展开显示 session 行；点击 session 打开全高原生会话视图（`SessionDialog` 已从 modal 改为 workbench-shaped view）。
- 新会话按钮：打开发起会话弹窗；`prompt` 必填，其余使用「会话」tab 的默认值。
- 不要恢复悬浮入口或 `⌘E·2` 浮动面板。

---

## 4. 理想 Onboarding Process

### 4.1 首次接入（O1–O7）

| 步 | 用户动作 | 系统行为 | 失败处理 |
|---|---|---|---|
| O1 | 打开 dsh Web，看到侧栏「云端工作区」 | 插件激活，读取 `/status`；无 profile 显示引导行 | — |
| O2 | 点引导行/齿轮 | 打开设置弹窗，自动选中「接入」tab，carrier preset 默认 Devin Cloud | — |
| O3 | 在 Devin 后台生成 `cog_` token、复制 `org-…` | 接入 tab 显示 doc 深链与三步说明 | token 不是 `cog_` 前缀时前端校验 |
| O4 | 填 label / org / token / baseUrl → 保存 | `POST /config save`；token 写入 `${DSH_HOME}/nano-cloud-session.json` 0600，只回 `hasSecret` | 保存失败在接入 tab 内显示 commit 级错误 |
| O5 | 点「连接测试」 | `GET /v3/self`；显示 principal_type、service_user_name、orgMatch；若 org 不匹配给黄色警告 | 401/403/404/429/超时分别显示 |
| O6 | 可选：在「会话」tab 设置默认 playbook/repo/mode/tags | 写入浏览器 localStorage 或 profile 默认（不新增敏感面） | — |
| O7 | 关闭弹窗；小节显示 profile；新建会话 → 创建成功 | `POST /create` 使用预设默认；会话出现在列表 | 创建 422 逐字段显示 |

### 4.2 首次接入的 UI 状态机

```
idle (无 profile)
  → connect (接入 tab, Devin preset)
      → saving
      → testing
      → connected (orgMatch true / principal_type visible)
      → connected_with_warning (orgMatch false)
      → failed (reason in tab)
  → active (小节显示 profile)
```

- 任何一步失败不关闭弹窗，不清空已填字段。
- `connected` 后才能设为当前；「保存」与「设为当前」可以合并成保存并激活（首次）。
- 无 profile 时不显示「新建云会话」的启用态；点击提示先接入。

### 4.3 以后更新（O8–O10）

- 换 token：接入 tab → 编辑当前 profile → token 留空表示保留旧 token；填写则覆盖（write-only）。
- 换 org：接入 tab 修改 org → 连接测试 → 保存；已有 session 列表刷新。
- 换 baseUrl：仅高级/自托管兼容场景；仍强制 https。
- 新增 carrier：在 preset 列表选择第二个 carrier → 同一 tab 渲染该 carrier 的字段（无需新增页面）。

---

## 5. Host API 适配（目标）

### 5.1 路由表（12 条）

| 方法 | 路径 | 敏感级 | 能力 | bodyLimit | 说明 |
|---|---|---|---|---|---|
| POST | `/nano-cloud-session/status` | L0 | read:none | 16384 | profile 列表 + activeId |
| POST | `/nano-cloud-session/config` | L3 | write:operator | 16384 | profile CRUD/test/security/ssh-key |
| POST | `/nano-cloud-session/sessions` | L2 | net:fetch | 65536 | `op:'list'|'insights'` + 全量过滤 |
| POST | `/nano-cloud-session/session` | L2 | net:fetch | 65536 | `op:'get'|'messages'|'attachments'|'insights'|'generate_insights'|'tags'|'set_tags'|'append_tags'|'sleep'` |
| POST | `/nano-cloud-session/create` | L2 | net:fetch+spawn:remote | 262144 | 全量 create 字段 |
| POST | `/nano-cloud-session/message` | L2 | net:fetch+spawn:remote | 65536 | 发消息 |
| POST | `/nano-cloud-session/archive` | L2 | net:fetch+write:remote | 16384 | 归档 |
| POST | `/nano-cloud-session/unarchive` | L2 | net:fetch+write:remote | 16384 | 取消归档 |
| POST | `/nano-cloud-session/terminate` | L2 | net:fetch+write:remote | 16384 | 中止（不是硬删/归档） |
| POST | `/nano-cloud-session/ssh` | L0 | read:none | 16384 | 生成 SSH 命令 |
| POST | `/nano-cloud-session/catalog` | L2 | net:fetch | 16384 | playbooks/secrets/knowledge/repositories 目录 |
| POST | `/nano-cloud-session/upload` | L2 | net:fetch+write:remote | 33554432 | base64 附件 → Devin multipart |

所有路由仍经 `dsh-host-route-guard`：Host/Origin 围栏、已认证 Peer、method 405、bodyLimit、route table 校验。

### 5.2 Create 字段映射

`createSession` 接受 UI 的 camelCase 或上游 snake_case；映射表：

| UI | Devin API |
|---|---|
| prompt | prompt（必填） |
| title | title |
| repos | repos[] |
| tags | tags[] |
| devinMode | devin_mode |
| maxAcuLimit | max_acu_limit |
| resumable | resumable |
| playbookId | playbook_id |
| knowledgeIds | knowledge_ids[] |
| secretIds | secret_ids[] |
| attachmentUrls | attachment_urls[] |
| platform | platform |
| bypassApproval | bypass_approval |
| childPlaybookId | child_playbook_id |
| createAsUserId | create_as_user_id |
| memoryEnabled | memory_enabled |
| sessionSecrets | session_secrets[{key,value,sensitive}] |
| sessionLinks | session_links[] |
| securityProfile | security_profile |
| structuredOutputSchema | structured_output_schema |
| structuredOutputRequired | structured_output_required |

### 5.3 错误语义

- `403` 一律 `forbidden-or-invisible`，UI 显示「无权或不可见（上游 fail-closed，不能证明不存在）」；不做成 404。
- `409` 冲突（如 session 正在运行/被占用）。
- `422` 字段级错误：保留 `detail/title/errors`，在表单字段旁显示。
- `429` 限速：显示退避提示，不自动重试创建/发消息。
- `timeout` / `unreachable`：在接入 tab 显示 baseUrl/网络检查。
- 任何 `CarrierError` 不泄露 token；上游 body 截断 300 字符。
- `DELETE` 语义显示为「中止」；归档是另一个按钮。

---

## 6. 目标模式执行清单（TM）

| ID | 目标 | 涉及文件 | 验收 |
|---|---|---|---|
| TM-01 | carrier preset 注册表 + Devin preset | `src/client/carriers.js`（或 `carriers/devin.js`） | 首个 preset 的 label/字段/文档链接从 preset 渲染，不在组件里硬编码 Devin |
| TM-02 | 设置弹窗 tab 重排 | `settings-dialog.js`、`i18n.js` | tab 固定「接入 / 会话 / 安全 / SSH」；接入 tab 含全部 Devin 接入项；切换高度固定 |
| TM-03 | 接入 tab 的首次引导 | `settings-dialog.js` | 无 profile 自动落「接入」；三步 guide；token/org/baseUrl 与连接测试在同一 tab |
| TM-04 | 会话 tab 默认值 | `settings-dialog.js` + `new-session-dialog.js` | playbook/repo/mode/tags 默认值来自会话 tab；新建表单预填 |
| TM-05 | 列表全量过滤 | `devin-api.js`、`index.js`、`session-dialog.js` | 时间窗/tags/origins/playbook/parent/session_ids 均可传；ui 只展示常用 3–4 个 |
| TM-06 | Session 详情完整字段 | `session-dialog.js` | status_detail、ACU、PR、structured_output、security_profile 可见 |
| TM-07 | attachments 列表 + 上传 | `index.js`、`devin-api.js`、`session-dialog.js`、`new-session-dialog.js` | `/upload` 200；新建附件 URL 进入 create；详情「附件」tab 列出 |
| TM-08 | tags 读/追加/替换 | `session-dialog.js` | 三个动作分别调 GET/POST/PUT；409/422 可读 |
| TM-09 | insights 读/生成 | `session-dialog.js` | 「洞察」tab；生成按钮 `already_exists` 有提示 |
| TM-10 | sleep / archive / unarchive / terminate | `session-dialog.js`、`devin-api.js` | 四个动作语义与文档一致；terminate 不宣称归档 |
| TM-11 | catalog 目录 | `index.js`、`devin-api.js`、`new-session-dialog.js` | playbooks/secrets/knowledge/repos 列表按需加载；只读、不返回 secret value |
| TM-12 | 安全/审计台账 | `security/route-sensitivity.json`、`security/feature-contract.json`、`security/route-inventory.md`、`src/host/route-table.js` | `node scripts/check-route-sensitivity.mjs` 0 drift；12 条路由 |
| TM-13 | 测试 | `test/*.test.mjs` | `npm test` 全绿；新增 API 映射、catalog/upload/route 测试 |
| TM-14 | dsh-dev 部署 | `~/.dsh-dev/plugins/dsh-nano-cloud-session` | 页面有「云端工作区」；接入 tab 可打开；`/status` 200；业主可配置 |

### 6.1 目标文件拓扑

```
dsh-nano-cloud-session/src/client/
├── carriers.js              # carrier preset 注册表（Devin 首个）
├── section.js               # sidebar 小节（只读 preset 显示名）
├── settings-dialog.js       # 接入 / 会话 / 安全 / SSH 四 tab
├── new-session-dialog.js    # 预设默认 + 全量 create 字段
├── session-dialog.js        # 会话 / 附件 / 洞察 / 标签
├── api.js                   # host route helpers
├── styles.js                # native token layout only
├── i18n.js
└── index.js                 # shell.overlay graft + state
```

### 6.2 验收命令

```bash
cd .agents/worktrees/dncs-devin-cloud-session-full/dsh-nano-cloud-session
npm install
npm test
npm run build
cd ..
node scripts/check-route-sensitivity.mjs
node scripts/check-feature-contract.mjs   # 若仓库提供
```

部署与业主复测：

```bash
cd /Users/seanz/Documents/dsh-plugins/.agents/worktrees/dncs-devin-cloud-session-full
node scripts/deploy-local.mjs --home ~/.dsh-dev --profile web --plugins dsh-nano-cloud-session --no-build
launchctl kickstart -k gui/$(id -u)/ai.deepseek.dsh.dev.web
# 然后在 dsh-dev 页面：云端工作区 → 接入 → 填 Devin token/org → 连接测试
```

> 注意：`dsh-dev restart` 会从主 checkout 同步 `~/.dsh-dev/plugins`；worktree 验证后如果要长期保留，需要合并回 main 或重新 deploy worktree 副本。不要直接编辑 `~/.dsh-dev` 里的文件作为真源。

---

## 7. 需求与开放决策

### 7.1 已确定

- Devin 是首个 carrier；UI 不把 Devin 硬编码进 section 结构。
- 接入全部放在「接入」tab；SSH 独立 tab；会话默认值放「会话」tab；安全只读状态放「安全」tab。
- 所有按钮/图标/输入使用 dsh 原生 primitives/artwork；设置弹窗使用 `NanoDialog` + `nanoTabs`。
- 不新增凭证面：仍使用 `${DSH_HOME}/nano-cloud-session.json`（0600）。
- 403 不渲染成不存在；DELETE 是中止不是硬删/归档。

### 7.2 待 [业主] 评审

1. **Devin preset 的展示名**：`Devin Cloud` 还是 `Devin Cloud Session`？
2. **接入 tab 的「设为当前」**：首次保存是否自动 activate？建议首次自动，之后多 profile 显式选择。
3. **会话 tab 默认值存储**：浏览器 localStorage（每个浏览器）还是 profile 文件（跨浏览器）？建议浏览器偏好用 localStorage，跨设备默认放 profile store 的 `defaults` 字段（不包含 secret）。
4. **附件上传 UI**：单文件还是多文件？建议多选，但每个文件顺序上传。
5. **insights 生成**：是否允许用户手动触发？建议允许，按钮在「洞察」tab，显示 `already_exists` 状态。

---

## 8. 本轮实现状态（2026-11-15）

- 宿主：12 条路由已注册；`devin-api.js` 已覆盖 session list/get/create/messages/attachments/tags/sleep/insights/archive/unarchive/terminate 与 playbooks/secrets/knowledge/repositories/upload。
- 客户端：`carriers.js` 的 Devin preset 已落地；设置弹窗改为「接入 / 会话 / 安全 / SSH」四 tab；Devin session 通过 host-side transient dsh Session projection 进入原生 `conversation.view`（native Chat），附件/tags/insights/lifecycle 进入原生右侧工作台 tab。手写 chat surface 已删除。
- 安全台账：`route-sensitivity.json`、`feature-contract.json`、`route-inventory.md` 已同步；`check-route-sensitivity` / `check-feature-contract` 0 drift。
- 测试：`npm test` 19/19 通过；`lib/client.js` 已部署到 `~/.dsh-dev/plugins/dsh-nano-cloud-session/` 并重启宿主。
- 真实 Devin 连通：2026-11-15 [业主] 在 dsh-dev「接入」tab 配置 `devin-sean`；`/v3/self` 返回 `pat_user`、`orgMatch: true`；session list 返回 10 条；session 详情/附件/洞察/标签已实测。
- E2E：`scripts/e2e-devin.mjs` 于 2026-11-15 真实上游通过：self、upload、create with attachment、messages（Devin 回 OK）、attachments 取回、tags read/append、sleep 后 status=suspended、archive/unarchive；12 项全 PASS。
- 待办：native chat 的 UI 发送路径与「新建会话 + 附件」的 UI 全流程仍建议 [业主] 手动点一遍（宿主/API 已实测）。

## 9. 参考资料索引

- Devin API Overview：<https://docs.devin.ai/api-reference/overview>
- Devin Sessions：<https://docs.devin.ai/api-reference/v3/sessions/organizations-sessions>
- Devin OpenAPI v3 JSON：<https://docs.devin.ai/v3-openapi.json>
- 本地完整 OpenAPI 副本（研究用，不提交）：`.research/devin-v3-openapi.json`
- 本仓库旧 DNCS 设计：[`dsh-nano-cloud-session/README.md`](../../../dsh-nano-cloud-session/README.md)
- 本仓库 sidebar 小节的实现参考：[`dsh-nano-cloud-session/src/client/section.js`](../../../dsh-nano-cloud-session/src/client/section.js)
- deprecated shared workspace 的 graft 踩坑：[`deprecated/dsh-nano-shared-workspace/src/client/graft.js`](../../../deprecated/dsh-nano-shared-workspace/src/client/graft.js)
