/**
 * Page-level and declaration-driven verdict (T-O-PRE1116-08.5 / 09.4).
 * Pure. Not part of the browser or host singleton entry.
 * A bad declaration throws; this function never returns a report.
 */

import { validateDeclaration } from './declaration.js'

const HARD_COUNTERS = new Set([
  'rootErrors', 'badNames', 'overflowSpans', 'overflowUsage',
  'observerErrors', 'observersMissing', 'badShape', 'missingBindingId',
])
const AUDIT_COUNTERS = new Set(['legacyCopies', 'oversize', 'unmappedKey'])

const num = value => (typeof value === 'number' && Number.isFinite(value) ? value : null)

function dig(root, path) {
  if (!path) return root
  let current = root
  for (const part of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined
    current = current[part]
  }
  return current
}

function resolveSubject(report, pluginId, subject) {
  if (typeof subject !== 'string' || subject.length === 0) return undefined
  if (subject.startsWith('page.')) return dig(report?.page, subject.slice('page.'.length))
  if (subject.startsWith('structure.')) return dig(report?.structure, subject.slice('structure.'.length))
  return dig(report?.plugins?.[pluginId], subject)
}

function sampleCount(report, pluginId, subject) {
  const parts = subject.split('.')
  parts.pop()
  const parent = resolveSubject(report, pluginId, parts.join('.'))
  if (parent != null && typeof parent === 'object' && typeof parent.n === 'number') return parent.n
  if (parent != null && typeof parent === 'object' && typeof parent.windowN === 'number') return parent.windowN
  return report?.page?.nativeInpCount ?? 0
}

function normalize(declarations) {
  if (declarations == null) return { list: [], baseline: null }
  if (Array.isArray(declarations)) {
    for (const item of declarations) validateDeclaration(item)
    return { list: declarations, baseline: null }
  }
  if (typeof declarations !== 'object') {
    throw new TypeError('declaration: expected a declaration or a list')
  }
  if (declarations.schema === 'dnpr.declaration/1') {
    validateDeclaration(declarations)
    return { list: [declarations], baseline: null }
  }
  if (Array.isArray(declarations.declarations)) {
    for (const item of declarations.declarations) validateDeclaration(item)
    return { list: declarations.declarations, baseline: declarations.baseline ?? null }
  }
  throw new TypeError('declaration: expected a declaration or a list')
}

function baselineValue(baseline, scenario, pluginId, subject) {
  if (baseline == null) return null
  const report = (scenario && baseline.reports?.[scenario]) || baseline.report || baseline
  return num(resolveSubject(report, pluginId, subject))
}

function ruleLimit(rule, base) {
  if (rule.op === 'max' || rule.op === 'min' || rule.op === 'eq') return rule.limit
  const reference = base == null ? rule.initial : base
  if (typeof reference !== 'number') return null
  return Math.max(reference * rule.factor, rule.floor)
}

function violates(op, value, limit) {
  if (op === 'max' || op === 'relBaseline') return value > limit
  if (op === 'min') return value < limit
  if (op === 'eq') return value !== limit
  return false
}

/**
 * @param {object} report - v2 report
 * @param {object|object[]|null} [declarations] - a declaration, a list, or
 *   `{ declarations, baseline }`
 * @returns {{verdict:'pass'|'fail', findings:Array}}
 */
export function diagnose(report, declarations) {
  const { list, baseline } = normalize(declarations)
  const findings = []
  const push = finding => findings.push(finding)

  const structure = report?.structure ?? {}
  for (const [key, value] of Object.entries(structure)) {
    if (typeof value !== 'number') continue
    if (value === 0) continue
    if (HARD_COUNTERS.has(key)) {
      push({
        id: `structure.${key}`,
        gate: 'hard',
        plugin: null,
        subject: `structure.${key}`,
        value,
        limit: 0,
        basis: 'cumulative',
      })
    } else if (AUDIT_COUNTERS.has(key)) {
      push({
        id: `structure.${key}`,
        gate: 'audit',
        plugin: null,
        subject: `structure.${key}`,
        value,
        limit: 0,
        basis: 'cumulative',
      })
    }
  }

  for (const audit of structure.audits ?? []) {
    if (audit?.code !== 'build-stamp') continue
    push({
      id: 'build-stamp',
      gate: 'audit',
      plugin: null,
      subject: 'build',
      value: audit.saw ?? null,
      limit: audit.have ?? null,
      basis: 'cumulative',
    })
  }

  const truncated = report?.page?.host?.truncated
  if (Array.isArray(truncated) && truncated.includes('epoch')) {
    push({
      id: 'host-epoch',
      gate: 'audit',
      plugin: null,
      subject: 'page.host.truncated',
      value: 'epoch',
      limit: null,
      basis: 'cumulative',
    })
  }
  if (Array.isArray(truncated) && truncated.some(item => item != null && typeof item === 'object')) {
    push({
      id: 'host-truncated',
      gate: 'audit',
      plugin: null,
      subject: 'page.host.truncated',
      value: truncated.filter(item => item != null && typeof item === 'object'),
      limit: 0,
      basis: 'window',
    })
  }

  const inpN = report?.page?.nativeInpCount ?? 0
  for (const [subject, limit] of [['inputDelayP95', 50], ['processingP95', 50]]) {
    const value = num(report?.page?.[subject])
    if (inpN >= 8 && value !== null && value > limit) {
      push({
        id: `page.${subject}`,
        gate: 'hard',
        plugin: null,
        subject: `page.${subject}`,
        value,
        limit,
        basis: 'window',
      })
    }
  }

  const bytes = num(report?.page?.nanoCombined?.clientJsBytes)
  const baseBytes = num(baseline?.page?.nanoCombined?.clientJsBytes)
  if (bytes !== null && baseBytes !== null && bytes > baseBytes * 1.1) {
    push({
      id: 'page.nanoCombined.clientJsBytes',
      gate: 'hard',
      plugin: null,
      subject: 'page.nanoCombined.clientJsBytes',
      value: bytes,
      limit: Math.round(baseBytes * 1.1),
      basis: 'cumulative',
    })
  }

  for (const pluginId of Object.keys(report?.plugins ?? {})) {
    const plugin = report.plugins[pluginId]
    const spanSamples = plugin?.native?.samples?.spans ?? 0
    const spanValue = num(plugin?.native?.spanMsP95)
    if (spanSamples >= 8 && spanValue !== null && spanValue > 50) {
      push({
        id: 'native.spanMsP95',
        gate: 'hard',
        plugin: pluginId,
        subject: 'native.spanMsP95',
        value: spanValue,
        limit: 50,
        basis: 'window',
      })
    }
    const trackSamples = plugin?.native?.samples?.callbacks ?? 0
    const trackValue = num(plugin?.native?.trackMsP95)
    if (trackSamples >= 8 && trackValue !== null && trackValue > 50) {
      push({
        id: 'native.trackMsP95',
        gate: 'hard',
        plugin: pluginId,
        subject: 'native.trackMsP95',
        value: trackValue,
        limit: 50,
        basis: 'window',
      })
    }
  }

  for (const declaration of list) {
    for (const budget of declaration.budgets ?? []) {
      const scenario = budget.scenario ?? null
      const count = sampleCount(report, declaration.plugin, budget.subject)
      if (budget.minSamples != null && count < budget.minSamples) continue
      const value = num(resolveSubject(report, declaration.plugin, budget.subject))
      if (value === null) continue
      const base = baselineValue(baseline, scenario, declaration.plugin, budget.subject)
      const limit = ruleLimit(budget.rule, base)
      if (limit === null) continue
      if (!violates(budget.rule.op, value, limit)) continue
      push({
        id: budget.id,
        gate: budget.gate,
        plugin: declaration.plugin,
        subject: budget.subject,
        value,
        limit,
        basis: 'window',
      })
    }
  }

  return {
    verdict: findings.some(item => item.gate === 'hard') ? 'fail' : 'pass',
    findings,
  }
}
