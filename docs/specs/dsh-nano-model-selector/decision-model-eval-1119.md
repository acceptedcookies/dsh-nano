# Decision 模型评估：四家 provider 实测对比（2026-11-19）

> 评估对象：System One 风格的**决策模型**——输入 `state`/`input` + 类型化 `questions`，输出结构化决策 + 校准概率，不生成自由文本。v1 范围固定为四个 provider：Cloudflare `clef` 三档、TypeSafe `Jev`、OpenAI `gpt-6-luna`、Google `gemini-decision-1`。Cloudflare 的 `clairic`（extraction，字段值抽取）不在本文范围。
>
> **凭据（统一于 `.env.local.development`）**：`CLOUDFLARE_API_TOKEN` / `TYPESAFE_APIKEY` / `OPENAI_API_KEY` / `GOOGLE_CLOUD_APIKEY`。
>
> **连通性（本机实测）**：仅 `api.cloudflare.com` 可本机直连；`api.typesafe.ai`→451、`api.openai.com`→超时、`generativelanguage.googleapis.com`→超时，三者均需代理。统一以 **[FRD1]（法国 OVH，`ssh -D` SOCKS 隧道）为锚定出口**做端到端实测，保证四家在同一网络路径下可比。

## 0. 结论先行

- **同一 API 形态、四个实现**。`{state/input, questions}` → `noul|choice|score` 概率分布。**TypeSafe Jev 是这个线协议的真源/原创者**；**Cloudflare clef 与 Google gemini-decision-1 都是它的兼容实现**；**OpenAI 是语义同构但 schema 独立**的第三方实现。
- **速度排序（[FRD1] 锚定，同通道端到端）**：**gemini-decision-1 ~0.19–0.32s 最快** > Jev ~1.0s > clef-flash ~1.25s > Luna ~1.6s。服务端推理本身 Jev ~0.17s / Gemini ~0.2s 占优，端到端都被传输盖过。
- **只有 clef 本机免代理 + 开权重**；Jev/Luna/Gemini 均需代理（Gemini 之前 402 已由新 key 解除，现可正常调用）。
- **选型**：国内落地用 `clef-flash`；要最快+最大批量/PDF/音视频 用 `gemini-decision-1`；要 262k 长文档/Box/Jev 校准 用 `Jev`；要消息序列输入/OpenAI 生态 用 `gpt-6-luna`。

## 1. Provider A — Cloudflare Clef（决策线）

- **真源**：Cloudflare 自研（`source=1`），research preview，权重 HF 开源 Apache 2.0（clef、clef-flash），零数据保留。是 Jev System One API 的**兼容复刻**（Qwen 底座重训）。
- **模型**：`clef`(27B, $0.24/M) / `clef-omni`(30B MoE 3B-active, $0.15/M, +audio) / `clef-flash`(9B, 24k, $0.038/M)；ctx 65k（flash 24k）；输出恒 0 token。
- **调用**：`POST /client/v4/accounts/{ACCT}/ai/run/@cf/cloudflare/clef`，`{model:"clef", state, questions{qid:{type:noul|choice|score,instructions,criteria}}}`。
- **实测**（同事故根因题）：`pool` conf 0.94、`input_tokens 233/0`。直连 ~1.0–1.7s，keep-alive 稳态 **0.5–1.0s**（约一半是 TLS/连接建立）。

## 2. Provider B — TypeSafe Jev（真源）

- **真源**：TypeSafe AI Inc.（旧金山，前 OpenAI 研究员 Diogo Almeida 等创立），2026-09-15 首发 Jev——**System One 决策模型品类与协议的原创者**。闭源 SaaS。种子 DCVC $40M，媒体报 a16z 至 ~$7.5B。
- **模型**：`jev-1.14.0`/`jev-latest`（+Box）、`jev-1.13.0`；**$0.042/Mtok 输入、输出免费**；ctx 默认 64k/req+32k/q，`TypeSafe-Danger-Zone-Long-Context: true` 抬至 **262k**。
- **调用**：`POST /v1/systemone`，`{model:"jev-latest", state, questions{...}}`；`model`/`input`/`questions` 命名与 clef/Gemini 兼容。Box 需 `TypeSafe-Danger-Zone-Images: true`（当前 experimental）。
- **实测**：`pool` conf 0.73–0.92、`input_tokens 405/49`。frd1 侧推理 ~0.17s，端到端经代理 ~0.9–1.5s。

## 3. Provider C — OpenAI Decisions

- **真源**：OpenAI `POST /v1/decisions`，public beta（DevDay 2026-09-29）。**schema 独立于 Jev**：`input`（text 或 message/tool-call 数组）、`questions` 数组带 `name`、`noul`→`predicate`、Choice `criteria`→`choices[]`、Score `criteria`→`levels[]`。
- **模型**：`gpt-6-luna`（唯一）；**$0.10/M input**（区域 +10%、>272k ×2），输出免费；questions ≤**400**/req；无官方 SDK（curl only）。
- **调用**：`POST /v1/decisions`，`{model:"gpt-6-luna", input, questions:[{type,name,instructions,choices|levels}]}`。
- **实测**：`pool` conf **0.95–1.0**（分布最锐利）、`input_tokens 186/0`。经代理 ~1.3–3.1s。
- **独有**：`input` 吃 message/tool-call/输出序列；GPT-Live 集成可语音流上判定；问题数上限最大。

## 4. Provider D — Google Gemini Decision 1

- **真源**：Google AI Studio `POST /v1beta/decisions`（`x-goog-api-key` 头），`createDecision` 方法。**System One 完全兼容**：`noul|choice|score` + `criteria` map，输出 `noul`/`choice`/`probabilities`/`confidence`/`legend` 同形。
- **模型**：`gemini-decision-1`；**$0.10/M input**（免费档 $0、付费档 $0.10；数据用于改进产品仅免费档）。**上下文 262,144 tok、questions ≤1000/req、输入文本+JSON+图+视频+音频+PDF**、输出恒 0 token。SDK `google.genai`（`client.decisions.create`）。
- **调用**：`POST https://generativelanguage.googleapis.com/v1beta/decisions`，`{model:"gemini-decision-1", input, questions{...}}`。
- **实测（[FRD1] 锚定，新 key）**：三次 run 端到端 **0.26 / 0.19 / 0.32s**（TTFB≈total，服务端推理即主体）；答案 `pool` conf 0.78、`score` 2.19、`noul` 0.91；`usage.total_input_tokens=275`、`total_output_tokens=0`。之前的 402 已随新 key 解除，现为四家端到端最快。
- **注意**：v1beta/decisions 计费走 AI Studio prepay 轨道（与 GCP project postpaid 不同轨）；当前 key 已接通，无阻塞。

## 5. [FRD1] 锚定的全面对比

端到端统一走 `ssh -D 127.0.0.1:21080`→[FRD1]，同一事故根因题（choice）。

### 5.1 端到端延迟矩阵（3 次）

| provider | 出口 | run1 | run2 | run3 | median | 结果 |
|---|---|---|---|---|---|---|
| **gemini-decision-1** | generativelanguage… | **0.26** | **0.19** | **0.32** | **0.26s** | 200, pool conf 0.78 |
| jev-latest | api.typesafe.ai | 1.14 | 1.50 | 1.34 | **1.34s** | 200, pool conf 0.73 |
| clef-flash | api.cloudflare.com | 0.95 | 1.25 | 1.99 | **1.25s** | 200, pool conf 0.94 |
| gpt-6-luna | api.openai.com | 2.29 | 1.64 | 1.30 | **1.64s** | 200, pool conf 0.95 |

> **gemini-decision-1 端到端 ~0.26s 全场最快**——TTFB≈total，服务端推理即主体、几乎无多余开销；Jev/clef/Luna 被「本机→frd1 的 SSH 一跳 + TLS」主导。服务端推理下限：Jev ~0.17s、Gemini ~0.2s、clef ~0.5–1.0s、Luna ~0.6–1.0s。

### 5.2 答案校准对照

| provider | choice | confidence | 分布形态 |
|---|---|---|---|
| **gemini-decision-1** | pool | **0.78** | **最保守**（pool 0.78、regression 0.20）|
| jev-latest | pool | 0.73 | 次保守（pool 0.80、regression 0.19）|
| clef-flash | pool | 0.94 | 锐利（pool 0.977）|
| gpt-6-luna | pool | **0.95→1.0** | **最极化**（顶选 ~1.0、其余 0.0）|

同一题四家都答对；**Gemini 与 Jev 同属谨慎校准档**（保留次选概率质量），Luna 最果断——阈值须按 provider 分别校准。

### 5.3 参数对比

| 维度 | Cloudflare Clef | TypeSafe Jev | OpenAI gpt-6-luna | Google Gemini Decision 1 |
|---|---|---|---|---|
| **协议/真源** | Jev 兼容复刻 | **原创/协议定义者** | 独立实现（schema 不同）| Jev 完全兼容 |
| **输入字段** | `state` | `state` | `input`（text/messages/tool-calls）| `input`（text/JSON/media blocks）|
| **问题容器** | map（1–64）| map（1–64）| 数组带 `name`（≤**400**）| map（≤**1000**）|
| **问题类型** | noul/choice/score | +**Box** | predicate/choice/score | noul/choice/score |
| **上下文** | 65k（flash 24k）| 262k（header）| 未文档化 | **262,144** |
| **模态** | text/JSON/img/video/audio(omni) | text/img(+Box) | text/img(base64) | text/JSON/**img/video/audio/PDF** |
| **输入价** | $0.038–$0.24/M | **$0.042/M** | $0.10/M | $0.10/M |
| **输出价** | $0 | $0 | $0 | $0 |
| **开源** | **Apache 2.0** | 闭源 | 闭源 | 闭源 |
| **本机可用** | **直连** | 代理 | 代理 | 代理（402 已解除）|
| **数据政策** | 零保留 | console policy | ZDR/HIPAA 合格 | 免费档喂训练/付费档否 |
| **SDK** | Workers AI | `typesafe_sdk` | 无 | `google.genai` |
| **成熟度** | preview | 1/3 财富500（媒体）| public beta | 付费可用、文档全 |

### 5.4 成本对照（同一判定 ~200–480 输入 tok）

| 档位 | 单价 | 每千次 | 每万次 |
|---|---|---|---|
| clef-flash | $0.038/M | ~$0.013 | ~$0.13 |
| **Jev 1.14** | $0.042/M | ~$0.020 | ~$0.20 |
| **gpt-6-luna** | $0.10/M | ~$0.047 | ~$0.47 |
| **gemini-decision-1** | $0.10/M | ~$0.047 | ~$0.47 |
| clef-omni | $0.15/M | ~$0.053 | ~$0.53 |
| clef 27B | $0.24/M | ~$0.084 | ~$0.84 |

## 6. 选型建议（v1 = 四 provider）

1. **国内/本机直接落地 → `clef-flash`**：免代理、keep-alive 稳态 0.5–1.0s、权重开源、最便宜。
2. **要最低推理延迟/262k 长文档/Box → `Jev`**：服务端最快（~0.17s），走 `autossh -D` 或海外部署解 451。
3. **要 400 题批量/消息序列输入/OpenAI 生态 → `gpt-6-luna`**：`input` 吃消息序列、批量上限最高；beta+需代理，做备用。
4. **要最快端到端 + 1000 题批量 + PDF/音视频输入 → `gemini-decision-1`**：[FRD1] 端到端 ~0.26s 全场最快，模态与批量最宽；需代理且计费走 AI Studio prepay 轨道（新 key 已接通，无阻塞）。
5. **写兼容层**：Jev/clef/Gemini 共享 System One 线协议（`state`/`questions` map/`criteria`）；OpenAI 是独立 schema（`input`/数组/`choices`/`levels`）。决策层封装成「`state+questions` 归一 → 四 provider 适配器」，model/base-url/auth/凭据从 `.env.local.development` 注入，可热切换、做 benchmark 与 failover。
6. **置信度治理**：四家都回 `probabilities`/`confidence`/`noul`(或 predicate `probability`)；**Luna 最极化、Gemini 与 Jev 最保守**，阈值按 provider 分别校准后再设自动通过线。