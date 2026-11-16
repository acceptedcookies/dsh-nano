/**
 * Budget evaluation adapter (spec §7). Pure in the sense that it only reads a
 * report and a baseline; the declaration list is injected by the caller.
 *
 * Judging itself lives in DNPR `diagnose()` (T-O-PRE1116-08.5); this file keeps
 * the lab-facing envelope (`{pass, failures, notes, checks}`) so the runner and
 * the Markdown do not need a second vocabulary. No plugin or track name is
 * written here: declarations carry them (T-O-PRE1116-09.8).
 */
import { diagnose } from '../packages/dsh-performance-review/src/diagnose.js'
import { loadDeclarations } from './declarations.mjs'

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null)

// A baseline p95 of 0 (a sub-millisecond span) would make `limit = 0` and
// fail on 0.1 ms of noise. Use a small absolute floor alongside the ×1.5 rule.
const SPAN_P95_FLOOR_MS = 2
const HOST_P95_FLOOR_MS = 50

/**
 * @param {object} report - v2 report (possibly null for the purity arm)
 * @param {object|null} baseline - {meta, reports}
 * @param {object} opts - {scenario, arm, purity, firstRun, declarations?}
 * @returns {{pass:boolean, failures:Array, notes:Array, checks:number}}
 */
export function evaluate(report, baseline, opts = {}) {
  const failures = []
  const notes = []
  let checks = 0
  const check = fn => { checks += 1; fn() }
  const scenario = opts.scenario ?? report?.meta?.scenario ?? 'unknown'
  const declarations = opts.declarations ?? loadDeclarations()
  const base = baseline?.reports?.[scenario] ?? null

  const record = findings => {
    for (const finding of findings) {
      checks += 1
      if (finding.gate === 'hard') {
        failures.push({
          pluginId: finding.plugin ?? 'measurement',
          metric: finding.id,
          value: finding.value,
          limit: finding.limit,
          reason: finding.subject,
        })
      } else {
        notes.push(`[audit 不产生 exit 1] ${finding.plugin ?? 'page'} ${finding.id}=${String(finding.value)}（参考上限 ${String(finding.limit)}）— ${finding.subject}`)
      }
    }
  }

  // Structural integrity first: a broken instrument must never become a baseline.
  if (report) {
    const structureOnly = diagnose(report, []).findings.filter(item => item.subject.startsWith('structure.'))
    record(structureOnly)
  }
  if (opts.firstRun) {
    notes.push('first --arm on run: baseline written, budgets NOT judged (spec §7).')
    return { pass: failures.length === 0, failures, notes, checks }
  }

  // Purity arm: the observer alone must not produce long frames.
  if (opts.arm === 'purity') {
    const p = opts.purity ?? {}
    if (p.error) {
      failures.push({ pluginId: 'measurement', metric: 'purity.error', value: String(p.error), limit: 'none', reason: 'standalone library did not load' })
    } else {
      for (const [metric, limit, reason] of [
        ['loafCount', 0, 'observer produced long frames'],
        ['observerErrors', 0, 'observer threw'],
        ['observersMissing', 0, 'partial observer install'],
      ]) {
        check(() => {
          if (p[metric] !== limit) failures.push({ pluginId: 'measurement', metric: `purity.${metric}`, value: p[metric], limit, reason })
        })
      }
    }
    return { pass: failures.length === 0, failures, notes, checks }
  }

  if (!report) {
    failures.push({ pluginId: 'measurement', metric: 'report', value: null, limit: 'object', reason: 'no report produced' })
    return { pass: false, failures, notes, checks }
  }

  // Disabled (collection off) arm: identity path must produce no rows.
  if (report.page?.enabled === false) {
    check(() => {
      for (const [id, plugin] of Object.entries(report.plugins ?? {})) {
        const hand = plugin.hand ?? {}
        if (Object.keys(hand.tracks ?? {}).length || Object.keys(hand.spans ?? {}).length || Object.keys(hand.usage ?? {}).length) {
          failures.push({ pluginId: id, metric: 'disabled.rows', value: 'non-empty', limit: '{}', reason: 'disabled arm must produce no measurement rows' })
        }
      }
      if (report.page?.nanoCombined?.scriptMs !== 0 || report.page?.loafCount !== 0) {
        failures.push({ pluginId: 'measurement', metric: 'disabled.nanoMeasures', value: 'non-zero', limit: 0, reason: 'disabled arm must not collect nano measures' })
      }
    })
    return { pass: failures.length === 0, failures, notes, checks }
  }

  const verdict = diagnose(report, { declarations, baseline })
  record(verdict.findings)

  // Per-name span / host rows stay AUDIT only: they include network and host
  // I/O wait, so a single-run multiplier would produce false regressions.
  for (const [id, plugin] of Object.entries(report.plugins ?? {})) {
    for (const [name, row] of Object.entries(plugin.hand?.spans ?? {})) {
      check(() => {
        const v = num(row.p95)
        const baseV = num(base?.plugins?.[id]?.hand?.spans?.[name]?.p95)
        const limit = baseV === null ? null : Math.max(Math.round(baseV * 1.5), SPAN_P95_FLOOR_MS)
        if (v !== null && limit !== null && v > limit) {
          notes.push(`[audit 不产生 exit 1] ${id} span.${name}.p95=${v}（参考上限 ${limit}）— async span includes network/host I/O wait`)
        } else if (baseV === null) {
          notes.push(`${id}.span.${name}: no baseline key, recorded only.`)
        }
      })
    }
    for (const [name, row] of Object.entries(plugin.host ?? {})) {
      check(() => {
        const v = num(row.p95)
        const baseV = num(base?.plugins?.[id]?.host?.[name]?.p95)
        const limit = baseV === null ? null : Math.max(Math.round(baseV * 1.5), HOST_P95_FLOOR_MS)
        if (v !== null && baseV !== null && baseV > 0 && v > limit) {
          notes.push(`[audit 不产生 exit 1] ${id} host.${name}.p95=${v}（参考上限 ${limit}）— host wall-clock I/O is environment dependent`)
        } else if (baseV === null || baseV === 0) {
          notes.push(`${id}.host.${name}: baseline p95=${baseV}, recorded only (absolute ${v} ms).`)
        }
      })
    }
  }

  return { pass: failures.length === 0, failures, notes, checks }
}

/** Build the version fingerprint used for exit code 2 (protocol + build stamps). */
export function versionsFrom(report, cfg, pluginVersions) {
  return {
    protocol: report?.meta?.protocol ?? null,
    schema: report?.schema ?? null,
    chromeMajor: report?.page?.chromeMajor ?? null,
    dshVersion: cfg.dshVersion ?? null,
    builds: (report?.meta?.contributors ?? []).map(item => `${item.plugin}@${item.build ?? '?'}`).sort(),
    plugins: pluginVersions,
  }
}

export function versionsMatch(a, b) {
  if (!a || !b) return false
  return a.protocol === b.protocol &&
    a.schema === b.schema &&
    a.chromeMajor === b.chromeMajor &&
    a.dshVersion === b.dshVersion &&
    JSON.stringify(a.builds ?? []) === JSON.stringify(b.builds ?? []) &&
    JSON.stringify(a.plugins ?? {}) === JSON.stringify(b.plugins ?? {})
}
