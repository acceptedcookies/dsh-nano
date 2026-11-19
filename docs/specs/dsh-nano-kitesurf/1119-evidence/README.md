# 1119 交付审查证据

- 源码基线：`55b5b6e04115671623d80f14c4823308f3b6a37e`。
- 实测目标：现有 `https://dsh-dev.local/`，`DSH_HOME=~/.dsh-dev`，仅开发容器 `kitesurf-dev` / `8800,8801`。
- 不操作 desktop，不修改产品实现，不新增发布门禁。
- 原始结果中的 PASS 只代表该断言成立，不代表浏览器交付完成。
- 会话令牌、登录 cookie、完整环境变量不写入证据。仿真用的 `delivery_review` 是无权限的测试 cookie，保留以证明清除失效。
- UI 截图统一裁切到 Kitesurf 区域；保留 live DOM/console/network 摘要和原始测试返回。
- 两次容器内fixture均已停止；第一轮因主动stop容器退出137，第二轮正常关闭。
- WS返回的 `engine:chrome` 仅为工具生命周期元数据，不独立证明实际Chrome进程；与pane页不一致才是本轮确定事实。

## 文件索引（持续补充）

- `deployment-parity.json`：仓库与 dev 部署文件的初始内容比对。
- `offline-summary.json`、两包 `*-tests.tap`：隔离 HOME/DSH_HOME/KITESURF_STATE 的离线测试结果；进程并非 OS 安全沙箱，不作为安全漏洞验证。
- `dev-initial-api.json`：启动前状态、真实 prepare、状态、合法 evaluate、HTTP MCP initialize/list。

## 初始阻塞与工具异常

- DNLS 212 测试中 210 pass / 2 fail：一个为全仓 feature contract 未收录其他包 `/nano-explorer-extra/diff`；另一个为终端工具旧测试读取不存在的 attach.url。均需保留，不能称完整套件全绿。
- Kitesurf skill 工具返回 `value.resourceBase` schema 错误；改为只读读取已安装技能正文，未启动外部浏览器引擎。
- ego 2.2.1 不接受 `loc=role:treeitem >> nth=1` 组合；定位失败发生在初始 API 结果写入之后，改用已观测的 CSS role selector，不算产品失败。
