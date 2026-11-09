# dsh-nano-shared-workspace

共享工作区：把 dsh 会话同步到 S3 真源（MinIO），多台客户端按 `username + Token` 身份访问同一 workspace 的远端会话列表。

规格：`../docs/specs/dsh-nano-shared-workspace/spec.md`

## 当前形态（Phase-0 骨架）

- 侧栏「工作区」上方的镜像「共享工作区」区块（`shell.overlay` + DOM graft）
- 设置弹窗（`dsh-nano-ui` 的 `NanoDialog`）：用户名 / MinIO Token / 可选 accessKey
- 凭据走 `ctx.credentials`（`DSH_NSW_IDENTITY` / `DSH_NSW_USERNAME`，env 兜底）
- Host 路由：`GET/PUT /nano-shared-workspace/settings`、`POST /settings/clear`、`GET /status`

## 开发

```sh
npm install && npm run build
dsh-dev restart          # 同步到 ~/.dsh-dev/plugins 并重启 3083
# 浏览器开 https://dsh-dev.local/
```

首次接入还需把插件注册进开发 profile（`~/.dsh-dev/profiles/web/package.json` 的
`dsh.profile.bundles` + `dependencies`，并在 `node_modules` 放 `../../../plugins/<name>` 符号链接）。
