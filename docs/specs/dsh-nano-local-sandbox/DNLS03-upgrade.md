# [DNLS] 受管对象合同切换

本指南面向原先按 session 操作本地沙箱的操作者和客户端作者。`dnls.control/1` 是控制合同版本，不是 npm 包版本。提供者和消费端要配对升级；[DNT] local 与第三方 MCP 不使用这套迁移规则。

1. **先确认环境。** 每个 `DSH_HOME` 使用自己的状态根。已有卷但没有对应台账、台账损坏或版本未知时，宿主拒绝初始化；不要清空目录、删锁或按容器名推断归属。保留原卷和台账备份，在接管手续完成前保持旧对象不受管。新建对象不是迁移旧卷。
2. **先发现，再选定。** 在已获准的当前宿主读取 `GET /nano-local-sandbox/contract`。响应头与正文必须都是 `dnls.control/1`。MCP 调 `sandbox.contract`。列出可见对象，明确选择 `sandboxId`；不能从 session、容器名、当前 pane 或相邻端口推算。
3. **保存操作引用。** 对象 HTTP 请求带 `X-DNLS-Contract: dnls.control/1` 和一个 query `sandboxId`；MCP 在 `params._meta["dnls/contract"]` 配对版本，仅在 `arguments.sandboxId` 传目标。首次创建不传已有目标。提交后保留原 `requestId`、`operationId` 与 `sandboxId`；202 只是受理。断线时查询原操作，不换键重发。`indeterminate` 需要核对现场。
4. **终端分两次操作。** 只在明确新建时用 `paneId/openId` 调 `term.session.create`；返回两个 ID 而不返回地址。授权的 `term.session.list` 可给出已有终端的资源引用。该引用不是 bearer，也不是 WebSocket 地址。重新打开只走 `term.session.attach`，使用核权后的 `dnt-ws-v2` locator，不重发输入、不创建第二个终端。关闭页面只 detach；结束 PTY 是单独的显式动作。
5. **核对宿主依赖。** 共享 browser owner 不证明终端的个人归属。没有可信的细粒度主体时，不调用 broker，也不会发出地址。当前右侧工作区的页签需要已挂载的 session；这不是无 session 管理页。使用有权的公开管理 API，不用本机 shell、假 session 或旧 v1 地址补位。

停止 sandbox 保留其 ID、端口、卷与名额。保存资源期望不自动应用；显式换代前核对修订、保卷和终端中断影响。升级失败时保留原始文件和操作回执，停止写入；旧提供者不理解新台账，不能作为自动回退路径。
