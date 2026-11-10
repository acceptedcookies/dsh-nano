#!/usr/bin/env node
/**
 * D1: build the P4 candidate table from a committed baseline report.
 * Owner rule (spec §1): priority is 次数 × 耗时, NOT the single slowest sample.
 * Nothing here edits plugin code — it only ranks, and refuses to rank on a
 * single sample or on latency that is pure I/O wait without a note.
 *
 * Usage: node lab/candidates.mjs [--baseline lab/baseline/baseline.json]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const LAB = dirname(fileURLToPath(import.meta.url))
const i = process.argv.indexOf('--baseline')
const path = i === -1 ? join(LAB, 'baseline', 'baseline.json') : resolve(process.argv[i + 1])
if (!existsSync(path)) { console.error(`no baseline at ${path}`); process.exit(2) }
const baseline = JSON.parse(readFileSync(path, 'utf8'))

const rows = []
for (const [scenario, report] of Object.entries(baseline.reports ?? {})) {
  if (!report || report.enabled === false) continue
  for (const [pluginId, plugin] of Object.entries(report.plugins ?? {})) {
    for (const [name, s] of Object.entries(plugin.spans ?? {})) {
      const n = s.n ?? 0
      const p95 = s.p95 ?? 0
      if (n < 2) continue // single sample is an anecdote, not an optimisation input
      rows.push({ pluginId, kind: 'span', name, scenario, n, p95, score: Math.round(n * p95), note: 'browser span (may include I/O wait)' })
    }
    for (const [name, t] of Object.entries(plugin.tracks ?? {})) {
      const n = t.callbacks ?? 0
      const ms = t.callbackMs ?? 0
      if (n < 2) continue
      rows.push({ pluginId, kind: 'track', name, scenario, n, p95: ms, score: Math.round(n * ms), note: 'callback count × total callback ms' })
    }
    for (const [name, h] of Object.entries(plugin.hostSpan ?? {})) {
      const n = h.n ?? 0
      const p95 = h.p95 ?? 0
      if (n < 2) continue
      rows.push({ pluginId, kind: 'hostSpan', name, scenario, n, p95, score: Math.round(n * p95), note: 'host wall clock (I/O + git/spawn)' })
    }
  }
}
rows.sort((a, b) => b.score - a.score)

const lines = [
  '# P4 候选表（按 次数 × 耗时 排序）',
  '',
  `来源基线：\`${path}\`，生成 ${new Date().toISOString()}`,
  '',
  '> 唯一合法的优化输入。单次样本（n<2）不进表；`stats-count` 14.4s 之类单样本不得据此改代码。',
  '> span/hostSpan 的 p95 含 I/O 等待，不等同主线程时间；优化前需先判断它到底是不是主线程成本。',
  '',
  '| # | pluginId | kind | name | scenario | n | p95/ms | 次数×耗时 | 备注 |',
  '|---|---|---|---|---|---|---|---|---|',
]
rows.forEach((r, idx) => {
  lines.push(`| ${idx + 1} | ${r.pluginId} | ${r.kind} | ${r.name} | ${r.scenario} | ${r.n} | ${r.p95} | ${r.score} | ${r.note} |`)
})
if (rows.length === 0) lines.push('| — | — | — | — | — | — | — | — | 无 n≥2 的候选 |')
lines.push('')
lines.push(`共 ${rows.length} 条候选。D2 只处理表内被业主确认的项，每改一项复跑同基线，退出码 0 才合入。`)
lines.push('')

// Budget verdicts are ALSO "report-named" optimisation inputs: a red-line
// failure must be fixed before the lab can say 合格, even when its
// 次数×耗时 score is small (card-wake is cheap per callback but fails idle-10s).
lines.push('## 预算失败点名（来自最近一次判定运行）')
lines.push('')
const outDir = join(LAB, 'out')
const verdicts = readdirSync(outDir).filter(f => /-on\.json$/.test(f)).sort().reverse().slice(0, 20)
const named = new Map()
for (const f of verdicts) {
  const bundle = JSON.parse(readFileSync(join(outDir, f), 'utf8'))
  // Injection tests deliberately fabricate a failure; they are not real
  // report-named optimisation inputs and must not pollute the D1 table.
  if ((bundle.notes ?? []).some(n => String(n).includes('INJECT-'))) continue
  for (const fail of bundle.verdict?.failures ?? []) {
    if (fail.pluginId === 'measurement' || fail.pluginId === 'page') continue
    const key = `${fail.pluginId}|${fail.metric}`
    if (!named.has(key)) named.set(key, { ...fail, scenario: bundle.scenario, file: f })
  }
}
if (named.size === 0) {
  lines.push('最近 20 份判定报告里没有插件级预算失败。')
} else {
  lines.push('| pluginId | metric | scenario | value | limit | 报告 |')
  lines.push('|---|---|---|---|---|---|')
  for (const f of named.values()) {
    lines.push(`| ${f.pluginId} | ${f.metric} | ${f.scenario} | ${f.value} | ${f.limit} | \`${f.file}\` |`)
  }
}
lines.push('')
lines.push('> 预算失败是**红线**，优先级高于上表的 次数×耗时 排序：不合格就不能进入 P4 的常规优化。')
lines.push('')

const out = join(LAB, 'out', 'p4-candidates.md')
writeFileSync(out, `${lines.join('\n')}\n`)
console.log(lines.join('\n'))
console.log(`\nwritten: ${out}`)
