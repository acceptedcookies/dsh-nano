# test/spike — 设计前真实行为取证工作区

> **一句话定义**：spike 是**设计功能之前**的前期测试与证据搜集。它用真浏览器、真插件宿主、真 IndexedDB 或可控的离线构造，回答「这个设计前提在真实页面/真实宿主/真实存储上是否成立」。**spike 只产事实，不产合同。**

`test/spike/` 不是回归测试层：本仓库没有 CI、没有计数、没有 cap。它的唯一交付是**写在宪章 README 里的过程与结论**。

---

## 1. 现有工作区

| 目录 | 服务的设计 | 环境 | 状态 |
|---|---|---|---|
| `wx-article-ingest/` | 微信公众号文章导入 + 富文本渲染 | `dsh-dev.local` · mp.weixin.qq.com/mmbiz.qpic.cn（仅 GET） | 已收口；V-01–V-10 全 PASS（V-01 需伪装 UA、V-09 需深色适配层） |
| `notepad-wasm-fx/` | notepad 内置 libfx `fx-core.wasm` + 经 `ctx.llm` 桥到 model-selector 同一份模型清单 | `dsh-dev.local` · 127.0.0.1:3425（本机 magpie，仅作 `ctx.llm` 下游）· npm registry（libfx 下载） | 已建档；V-01–V-12 全 NOT_RUN（V-01 JSPI 为一票否决项） |
| `model-execution-sandbox/` | DSH 原生 `SandboxMode` 三档策略的实际边界（写入/读取/网络/进程/跨会话），为 `sandbox-nano-nvx` 提供基线 | 已安装的 `@deepseek-ai/dsh@0.2.2-rc.1` 宿主包 + `/usr/bin/sandbox-exec`（不启动实例；外部仅 `GET example.com` 探网络面） | 已收口；V-01–V-12 全 PASS（写入面 7/7 受控；读/网/进程三域零覆盖；`/tmp` 跨会话泄漏） |
| `celld-state-and-alarm/` | `dsh-nano-session-manager` 的外部 actor 选型：celld 能否承担 durable-state / alarm / 跨 dsh 重启存活 / 可接受开销 | 本机 macOS arm64 上 `celld dev` 单节点（不碰任何 dsh 实例；`GET` 官方二进制） | 已建档；V-01–V-12 全 NOT_RUN、V-13 deferred（V-03/V-04 一票否决；V-13 celld-in-VM 待 NVX 底座落地后验） |

每个工作区的方法、判读门槛和结论以其自己的 `README.md` 为准。

---

## 2. 取证环境

| 手段 | 适用 | 登记等级 |
|---|---|---|
| **ego-browser 会话 @ `https://dsh-dev.local/`** | 需要真插件宿主、真渲染、真 IndexedDB、真交互（点击/滚动/容器宽度）的命题 | `ego PASS` |
| **离线构造** | 不依赖宿主的命题：构造 HTML/样例、纯函数断言、静态测量 | `offline PASS` |

- 证据形态：**截图 + DOM 实测值**（`evaluate` 的 computedStyle / getBoundingClientRect / scrollHeight）+ 构造样例。截图放 `evidence/` 或 `/tmp`，不入库；README 只写数值结论与截图指针。
- 构建真源：`node scripts/build-client.mjs`（esbuild → `lib/client.js`）+ `node --check`；`dsh-dev restart` 同步到 `~/.dsh-dev/plugins/`。
- 灌进记事本的测试文件（`__nanoNotepad.import`）**验完必须删掉**，把 `dsh-dev` 会话还原到干净态。

---

## 3. 目录纪律

1. **一个 spike 一个目录**，feature 命名（`wx-article-ingest`），不带战役前缀。`test/spike/` 根下只放本 README 和工作区目录。
2. **宪章 README 先行**：一句话定义、锚表（建档日期、验证实例、上游真相、证据上限）、边界声明、判读门槛。**门槛执行前写死，跑完不挪。**
3. **只产证据**：不改 `dsh-nano-*` 任何包的 `src/`、不改 `packages/dsh-nano-ui` 的合同、不改 profile 配置。结论要转正，走对应包的 `docs/specs/**` 或业主指定路径。
4. **证据分级诚实**：写清 `ego` 还是 `offline`；`offline` 结论不能写成 `ego` 已通过。终态词只有 `PASS` / `RED` / `NOT_RUN` / `deferred`，附原因。
5. **可抛弃**：durable 的只有宪章 README 里的过程与结论。`evidence/`、`samples/`、`tmp/` 不进库。
6. **环境与边界**：只动 `dsh-dev.local`；`dsh.local` 是用户日常，**禁重启、禁写**。外发请求仅限 `GET`，且只取本宪章声明的目标域；任何要登录或突破鉴权的取证先问业主。

---

## 4. 宪章 README 结构

```text
test/spike/<feature>/
├── README.md        宪章：一句话定义 + 锚表 + 边界声明 + 判读门槛 + §过程/结论
├── evidence/        截图与实测 dump（.gitignore，不进库）
└── samples/         构造样例（.gitignore，不进库；要长期引用就把正文粘进 README）
```

| 段 | 内容 |
|---|---|
| `> 一句话定义` | 验证什么命题、只产证据不改合同 |
| 锚表 | 建档日期 · 验证实例 · 上游真相（要读的源文件列表）· 证据上限（本 spike 不承诺什么） |
| 边界声明 | 明确不动哪些包 / src / 合同 |
| §N 可验证命题 | V-xx 表：命题 · 方法 · 判读门槛 · 终态 |
| §过程/结论 | 实测数值 + 截图指针 + 终态词 |

---

## 5. .gitignore

每个工作区自带一份，进库的只有宪章 README：

```gitignore
evidence/
samples/
tmp/
```

root `.gitignore` 已覆盖日志与环境文件，spike 不加根规则。
