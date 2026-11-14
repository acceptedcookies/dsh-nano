/**
 * fx-pipeline.js — LS-RAG 生产管线编排器（§13.3 L3 step executor）。
 *
 * 确定性宿主编排：顺序 stage 链，每步是宿主原语（run/set-cat/rename/
 * accept/reject/write-back/claim）——**不进 note_* 工具集**，不给 LLM
 * 自由发挥。执行态写 sqlite runs/checkpoints/claim_ledger；定义存
 * pipeline_defs（§13.4 L4）。语料真源仍在 IDB，本层只做编排+记账。
 */

import * as db from './db.js'
import { acceptDraft, rejectDraft } from './fx-corpus.js'
/* fx-corpus→db 无回指 fx-pipeline——静态 import 安全（iife 无二次动态 import）。 */

/** 模板绑定：`{{last}}`/`{{last.id}}`/`{{ctx.vars.x}}`/`{{node}}` 替换。 */
function bind(value, ctx) {
  if (typeof value === 'string') {
    return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
      const parts = path.split('.')
      let cur = parts[0] === 'last' ? ctx.last
        : parts[0] === 'ctx' ? { vars: ctx.vars }
        : parts[0] === 'node' ? ctx.node
        : undefined
      for (const p of parts.slice(parts[0] === 'ctx' ? 2 : 1)) cur = cur?.[p]
      return cur === undefined || cur === null ? '' : (typeof cur === 'object' ? JSON.stringify(cur) : String(cur))
    })
  }
  if (Array.isArray(value)) return value.map(v => bind(v, ctx))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = bind(v, ctx)
    return out
  }
  return value
}

/**
 * 顺序链执行器。spec = {name, stages:[{step, args}]}
 * ctx = {idb, corpus, runWithTools, model, node, vars, defId}
 * 返回 {runId, status:'done'|'error', stages:[{step,ok,result,error}]}
 */
export async function runPipeline(spec, ctx) {
  const sq = await ctx.sqlite()
  await sq.openPipeline()
  const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const stages = []
  const local = { last: null, vars: ctx.vars ?? {}, node: ctx.node ?? null }
  const steps = {
    /** LLM one-shot：args={prompt, promptId?, model?}→ctx.last={text,toolCalls} */
    async run(a) {
      const prompt = a.prompt ?? ''
      /* skipRefresh：编排层统一在链尾刷新节点，不每 stage 全量 IDB+渲染。 */
      local.last = await ctx.runWithTools(prompt, { model: a.model ?? ctx.model, skipRefresh: true })
      return { text: (local.last?.text ?? '').slice(0, 120), toolCalls: local.last?.toolCalls?.length ?? 0 }
    },
    /** 改 cat：args={id|fromLast, cat} */
    async setCat(a) {
      const id = a.id ?? (a.fromLast ? local.last?.id : null) ?? local.node?.id
      const res = await ctx.corpus().setCat({ id, cat: a.cat })
      local.last = JSON.parse(res.content)
      return local.last
    },
    /** 改名：args={id?, name}（name 支持模板） */
    async rename(a) {
      const id = a.id ?? local.node?.id
      const node = await db.renameNode(ctx.idb, id, a.name)
      local.last = { id: node.id, name: node.name }
      return local.last
    },
    /** 接受草稿：args={id?} */
    async accept(a) {
      const id = a.id ?? local.node?.id
      local.last = await acceptDraft(ctx.idb, id)
      return local.last
    },
    /** 驳回草稿：args={id?, feedback} */
    async reject(a) {
      const id = a.id ?? local.node?.id
      local.last = await rejectDraft(ctx.idb, id, a.feedback ?? '')
      return local.last
    },
    /** 写回当前节点草稿：args={id?, content, append?} */
    async writeBack(a) {
      const id = a.id ?? local.node?.id
      let prior = ''
      if (a.append) { try { const r = await ctx.corpus().read({ id }); prior = JSON.parse(r.content ?? '{}').content ?? '' } catch {} }
      const content = a.append ? `${prior}${a.content}` : String(a.content ?? '')
      await db.saveDraft(ctx.idb, id, content)
      local.last = { id, written: content.length }
      return local.last
    },
    /** claim 租约：args={key}→acquire+recordClaim（release 在链尾统一） */
    async claim(a) {
      await sq.claim.acquire(a.key ?? `run-${runId}`)
      await sq.recordClaim({ key: a.key ?? `run-${runId}`, op: 'acquire', writerId: 'fx-pipeline', heartbeatRev: 0, detail: `pipeline ${spec.name}` })
      local.last = { claimed: a.key ?? `run-${runId}` }
      return local.last
    },
  }

  const claimKey = spec.claimKey ?? `run-${runId}`
  /* 性能：claim.acquire 是 s3 网络 RTT（实测 ~4.6s）。与 beginRun 及首个
     stage 并行发出——fencing 语义仍是「写产物前 acquired」：steps 在 claim
     落地前不碰共享写面（run/setCat 只写 IDB/本地），acquire 在链尾 release
     前必定 awaited。 */
  const claimReady = (async () => {
    try { await sq.claim.acquire(claimKey); await sq.recordClaim({ key: claimKey, op: 'acquire', writerId: 'fx-pipeline', heartbeatRev: 0, detail: spec.name }) } catch (e) {
      /* casGate fail 或已持——记账但继续（本地产物仍可跑，共享写面门已挡 s3） */
      try { await sq.recordClaim({ key: claimKey, op: 'deny', writerId: 'fx-pipeline', heartbeatRev: 0, detail: String(e?.message ?? e) }) } catch {}
    }
  })()
  try { await sq.beginRun(runId, spec.name ?? 'pipeline', { defId: ctx.defId ?? null, stages: spec.stages?.length ?? 0 }) } catch {}

  let status = 'done'
  for (const [i, stage] of (spec.stages ?? []).entries()) {
    const fn = steps[stage.step]
    if (!fn) { stages.push({ step: stage.step, ok: false, error: `unknown step ${stage.step}` }); status = 'error'; break }
    const args = bind(stage.args ?? {}, local)
    try {
      const result = ctx.perf?.span ? await ctx.perf.span(`fx-stage-${stage.step}`, () => fn(args)) : await fn(args)
      stages.push({ step: stage.step, ok: true, result })
      try { await sq.checkpoint(runId, stage.step, { index: i, args, ok: true }) } catch {}
    } catch (e) {
      stages.push({ step: stage.step, ok: false, error: String(e?.message ?? e) })
      try { await sq.checkpoint(runId, stage.step, { index: i, args, ok: false, error: String(e?.message ?? e) }) } catch {}
      status = 'error'
      break
    }
  }
  await claimReady /* fence：release 前必确认 acquire 已落地 */
  try { await sq.recordClaim({ key: claimKey, op: 'release', writerId: 'fx-pipeline', heartbeatRev: 0, detail: `${spec.name} ${status}` }) } catch {}
  try { await sq.claim.release(claimKey) } catch {}
  try { await sq.finishRun(runId, status) } catch {}
  return { runId, status, stages }
}
