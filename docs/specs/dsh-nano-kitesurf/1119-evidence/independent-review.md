# 独立复核与修订记录

源码基线：55b5b6e04115671623d80f14c4823308f3b6a37e。

本轮两名独立只读复核者分别检查事实/证据一致性和工作台账/代码锚点；不调用运行环境，不修改产品。

## 事实复核

- 核对20余份API/状态JSON与源码；保留 delivery NOT READY 结论。
- 确认74/74、210/212、9/9口径，两个离线失败归属，runtime九输出hash，host重启history10→0。
- 把“attach.url不存在”改成fixture返回缺attach字段。
- 补明history响应的plugin-store标签、实际内存真源与旧workerd-kv断言不一致。
- Axtra同时有index/JSX runtime中止，诊断尾部不是整次导航完整事件表。
- 明确engine:chrome生命周期元数据不能独立证明真实Chrome；同页不一致才是已证实。
- 第一轮fixture退出137来自本会话已收集作业bash-6b30b27efcd54eaa（主动stop容器），不是凭空推断，也不是崩溃判据。
- settings GET405属binding POST-only与死GET分支；DNK本身不GET settings，配置框空值另归status投影缺字段。

## 台账/锚点复核

- 核对约60处源码锚点；修正formatSize/Duration、last-good渲染点、state handler位置。
- 增G31预算/取消/迟到归属和G32截图error/副作用，避免正文缺口未进入工作台账。
- G12补control一致性与双writer NOT RUN；T14补0/4096/8192/65536分路由上限。
- cookie属性扩展、mobile/DPR缩约、HAR lite/标准命名标D（需业主决定），不把建议当新增合同。
- desktop端口验证属于后续独立验收，本轮未执行。
- 链接脚本只验存在/范围，不证明语义。

## 集成复核额外发现

人工查看RFC截图发现DOM/innerText虽有内容，但视口大面积白色仅链接可见。将“呈现PASS”更正为呈现FAIL/待样式复测（测时dark模拟开启，未干净light复测），同时撤回“五站全可见”的表述。该更正体现图像检查不能被DOM字符串替代。
