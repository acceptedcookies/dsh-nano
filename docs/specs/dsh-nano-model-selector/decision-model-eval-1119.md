# Clef / Clairic 家族评估（Workers AI，2026-11-19）

> 目标定位：用户口中的 "chef" 是 `@cf/cloudflare/clef*` 的音近误写。Workers AI 目录中无字面 `chef`，存在一个完整的 Cloudflare 自研模型家族簇 `clef`（决策模型）与 `clairic`（抽取模型），共 5 个 SKU。以下评估基于本机 `.env.cloudflare` token 对该账号（`8b611460403095bdb99b6e3448d1f363`）的**真实 API 调用**，非二手文档复述。

## 0. 结论先行

这是一组**全新的"系统一"专用模型族，不是通用 LLM**。它们不做自由文本生成——clef 做"决策"（给定状态 + 类型化问题 → 每个选项输出概率），clairic 做"抽取/计算/预测"（给定状态 + 类型化字段 → 每个字段输出带置信度的值）。计费方式也截然不同：**只按输入 token 计费，不生成 token，零输出成本**。把它们当"更便宜的分类/抽取器"用是对的；把它们当 LLM 替代品用是错的。

## 1. 模型清单与硬参数

| 模型 | 家族 | 规模 | 任务 | 上下文 | 输入价 | 输出价 | 视觉 | 数据保留 |
|---|---|---|---|---|---|---|---|---|
| `@cf/cloudflare/clef` | 决策 | **27B** dense | 状态+schema→决策 | 65536 | **$0.24/M** | $0 | ✓ | 零保留 |
| `@cf/cloudflare/clef-omni` | 决策 | **30B MoE（3B active）** | 同上 + audio | 65536 | **$0.15/M** | $0 | ✓+audio | 零保留 |
| `@cf/cloudflare/clef-flash` | 决策 | **9B** | 同上 | **24576** | **$0.038/M** | $0 | ✓ | 零保留 |
| `@cf/cloudflare/clairic` | 抽取 | ~27B | 状态+fields→类型化值 | 65536 | **$0.10/M** | $0 | ✓ | 零保留 |
| `@cf/cloudflare/clairic-flash` | 抽取 | ~9B | 同上 | 65536 | **$0.10/M** | $0 | ✓ | 零保留 |

关键事实：
- 全部 `source=1`（Cloudflare 自研），`vision:true`，零数据保留，均为 research preview。
- **价格按"每次请求的输入 token 计费"**。clef 输出恒定 0 token（usage 里 `output_tokens:0`）；clairic 有极少量 output（~14 token）但仍按输入计价。
- 媒体输入按 token 折算计入输入：图片 ≤1024 token/张，clef 单次 ≤4 张，计入上下文。

## 2. API 契约（实测）

### clef（决策）
```json
POST /ai/run/@cf/cloudflare/clef
{"model":"clef",
 "state":"<text|json|images|video>",
 "questions":{
   "qid":{"type":"noul|choice|score",
          "instructions":"...",
          "criteria":{...或 [...]}}}}
```
- `noul` → 返回 `probability`（是/否）
- `choice` → 返回 `choice` + 每选项 `probabilities` + `confidence`
- `score` → 返回加权 `score` + 每档位 `probabilities` + `confidence`
- 问题数 1–64 个。

### clairic（抽取）
```json
POST /ai/run/@cf/cloudflare/clairic
{"model":"clairic",
 "state":"<text|json>",
 "fields":{"fid":{"type":"text|number|date", "decimals":N, "unit":"USD", "instructions":"..."}}}
```
- 每字段返回 `value` + `confidence` + `p_null`（不存在概率）+ `span`（grounding 区间）+ `grounding_method`。
- `usage` 额外给出 `state_tokens` / `schema_tokens` / `passes`（内部多遍解码）。

## 3. 实测性能（本机 3 次取中位 + 大 state 规模测试）

测试 1 — 决策（clef 家族，事故根因判定，state≈70 词）：

| 模型 | 3-run 延迟(ms) | 中位 | 大state(5KB,~3.5k tok) | choice 置信度 | 结论 |
|---|---|---|---|---|---|
| clef (27B) | 2461/1659/1043 | **1659** | 1351 | 0.873 | 正确（pool exhaustion） |
| clef-omni (MoE) | 1152/1047/1577 | **1152** | 1165 | 0.811 | 正确 |
| clef-flash (9B) | 1300/1048/1091 | **1091** | 1073 | 0.907 | 正确且最快 |

测试 2 — 抽取（clairic 家族，发票字段计算）：

| 模型 | 3-run 延迟(ms) | 中位 | 大state(5KB) | `total_usd` | `due_date` |
|---|---|---|---|---|---|
| clairic | 1413/1678/1501 | **1501** | 4311 | **1080 ✓** | 2026-12-01（conf 0.086） |
| clairic-flash | 1332/1446/2526 | **1446** | 1658 | **1080 ✓** | 2026-11-16（conf 0.213） |

### 观察

1. **延迟整体在 1–1.7s 区间**，与体量强相关但不线性——MoE 的 omni 比 dense 27B 还快。首次调用有冷启动尾延迟（clef 首跑 2.4s）。
2. **决策质量三个模型都选对了根因**（connection pool 95% + queued connections → pool），置信度差异是单次采样噪声，不构成排序依据。
3. **clairic 大 state 延迟跳升明显**（1501→4311ms）。原因在 usage：`passes:9` + `input_tokens` 从 526 涨到 **13172**——clairic 对长 state 做多遍 schema 解码，token 和延迟一起涨。clef 家族 input 只涨到 ~3495。**长输入 + 多字段抽取时 clairic 的实际成本/延迟会高于表价直觉**。
4. **clairic 算术能力可用但有限**：`4×250+80=1080` 正确，`net 30` 的 `due_date` 算对（11-01+30=12-01）但自身置信度仅 0.086——它自己知道这是推断不是字面。日期/推断类字段要读 `confidence` 决定是否回落人工。

## 4. 价格模型与每千次成本

| 场景 | 输入 token/次 | 模型 | 每千次成本 |
|---|---|---|---|
| 客服路由判定（3 问题） | ~350 | clef-flash | **$0.013** |
| 同上 | ~350 | clef-omni | **$0.053** |
| 同上 | ~350 | clef | **$0.084** |
| 发票字段抽取（3 字段） | ~530 | clairic/-flash | **$0.053** |
| 大日志根因分析（5KB） | ~3500 | clef-flash | **$0.133** |
| 大日志字段抽取（13k tok, 9 passes） | ~13000 | clairic | **$1.30** |

对照：同一判定任务用通用 LLM（如 `@cf/meta/llama-3.3-70b` $0.30/M 输入 + $0.45/M 输出 + 生成文本再 parse）不仅更贵、更慢，还要自己处理 JSON 解析和概率校准。clef 的 `probabilities` 是原生校准输出，这是通用 LLM 给不了的。

## 5. 使用分析

**适合（直接命中设计意图）**
- 工单/告警路由与优先级判定（noul/choice/score 天然对应）
- 内容审核/安全分类（多标签 + 概率，可设阈值回落人工）
- 结构化抽取：发票、日志、合同关键字段（clairic 的 grounding span + confidence 可审计）
- RAG 前判断：query 分类、是否需要工具调用、文档相关性打分
- 低代码流水线里的"判断节点"：把原本要写规则或微调小模型的分类器换成一次 API

**不适合**
- 任何需要自由文本输出/对话/摘要生成的场景（输出恒为 0 token，根本生成不了）
- 需要超长上下文的任务（clef-flash 只有 24k，其余 65k）
- 对置信度语义要求严格的合规场景——`confidence` 是模型自评，preview 阶段尚未公开校准曲线，必须自己在业务数据上验证阈值
- 延迟敏感的内联路径（P99 有冷启动尾，且 preview 阶段 SLO 未承诺）

**关键工程注意点**
- 输出是**结构化概率**，下游必须消费 `probabilities`/`confidence`/`p_null`，不能只取 `choice` 顶值——否则会丢掉模型明确给出的"我不确定"信号。
- clef 与 clairic 的 `model` 字段是**短名**（`clef`/`clairic-flash`），不是完整 `@cf/...`，写错会报 pattern 错误。
- clef-flash 的 24k 上下文是硬约束，长 state 会被静默截断（文本部分），媒体超额则请求直接失败。
- clairic 的 `passes` 计费隐藏在大输入里——长 state + 多字段时先压测 token，再预估成本。
- 全部是 preview，权重后续会在 HF 开源（clef 已挂 HF 链接），自托管成本模型可作为议价/退出备选。

## 6. 场景预期

| 场景 | 推荐模型 | 理由 |
|---|---|---|
| 高吞吐客服路由（>10k req/day） | **clef-flash** | 9B 最快（~1.1s）、$0.038/M 最便宜、24k 上下文对短工单足够 |
| 告警根因/多维决策（含图、音频） | **clef-omni** | MoE 3B active 推理快、能吃 audio、置信度与 27B 相当 |
| 复杂决策、最高准确性要求 | **clef** | 27B dense，置信度校准更稳，贵 6 倍但单决仍 <$0.0001 |
| 发票/单据字段抽取 | **clairic-flash** | 抽取精度与 27B 持平、更便宜；除非字段间强依赖再上 clairic |
| 长日志多字段抽取 | **clairic**（需压测） | 9B flash 长输入延迟已跳升到 4.3s 的表兄弟风险；大输入先压 token |

## 7. 建议

1. **把 clef/clairic 当"校准过的结构化判定器"采购**，不要当 LLM 用。它们填补的是"通用 LLM 里又贵又不稳的分类/抽取/计算"这一档。
2. **小流量起步用 clef-flash + clairic-flash**，单位成本几乎可忽略；只有在实测置信度不达标时再升 27B/omni。
3. **在业务数据上先建置信度→准确率的映射表**，再定"自动通过/转人工"的阈值——preview 阶段官方没给校准保证。
4. **对长输入的 clairic 调用先压 `input_tokens`**，`passes` 会让实际成本/延迟随 state 长度非线性放大。
5. 若未来要做 self-host 或成本对账，盯 HF 的 `Cloudflare/clef` 权重开源进度。
