/**
 * Pure projections shared by the fleet list and the sandbox page. A missing
 * reading stays '—'; it is never drawn or summed as zero.
 */
import { formatBytes } from './format.js'

export const DOT = {
  running: 'done', stopped: 'idle', failed: 'error', missing: 'warning',
  creating: 'ongoing', starting: 'ongoing',
}
export const OP_DOT = {
  accepted: 'ongoing', running: 'ongoing', succeeded: 'done', failed: 'error',
  indeterminate: 'warning', cancelled: 'idle',
}
export const SETTLED = new Set(['succeeded', 'failed', 'indeterminate', 'cancelled'])
export const ACTIONS = ['start', 'stop', 'restart', 'recreate', 'remove']

export const stateText = (copy, state) => copy.state[state] ?? copy.state.unknown
export const opText = (copy, state) => copy.opState[state] ?? state ?? copy.none
export const actionText = (copy, action) => copy.action[action] ?? action ?? copy.none
export const stepText = (copy, step) => (step ? copy.opStep[step] ?? step : null)
export const nameOf = (row) => row?.name ?? row?.sandboxId ?? ''
export const shortId = (id) => (typeof id === 'string' ? id.slice(0, 8) : '')
export const needsAttention = (row) => row?.observedState === 'failed' || row?.observedState === 'missing'
export const pendingRevision = (row) => Number.isInteger(row?.desiredRevision) && row.desiredRevision > (row.appliedRevision ?? 0)

export function cores(value, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value).toFixed(digits) : null
}

export function when(copy, value) {
  const ms = typeof value === 'number' ? value : Date.parse(value ?? '')
  if (!Number.isFinite(ms)) return null
  try { return new Intl.DateTimeFormat(copy.localeTag, { dateStyle: 'short', timeStyle: 'short' }).format(ms) } catch { return null }
}

/** Whole non-negative number, `null` for blank, `undefined` for anything else. */
export function whole(text) {
  const trimmed = String(text ?? '').trim()
  if (trimmed === '') return null
  return /^\d+$/.test(trimmed) ? Number(trimmed) : undefined
}

export function ratio(measured, allocated) {
  return typeof measured === 'number' && typeof allocated === 'number' && allocated > 0
    ? Math.max(0, Math.min(100, (measured / allocated) * 100))
    : null
}

/** Allocated size, e.g. `4 cores · 4.0 GiB`, or null when nothing is allocated. */
export function sizeLine(copy, row) {
  const cpus = row?.resources?.cpus
  const memory = formatBytes(row?.resources?.memoryBytes)
  if (cpus == null && memory == null) return null
  return [cpus == null ? null : copy.cores.replace('{n}', String(cpus)), memory].filter(Boolean).join(' · ')
}

/** Second line of a list row: live use over allocation when running. */
export function rowMeta(copy, row) {
  const parts = []
  if (row?.observedState === 'missing') parts.push(copy.containerMissing)
  else if (row?.observedState === 'running' && row.lastMinute) {
    const cpu = cores(row.lastMinute.cpuCores) ?? copy.none
    const mem = formatBytes(row.lastMinute.memoryBytes) ?? copy.none
    parts.push(`CPU ${cpu}/${row.resources?.cpus ?? copy.none}`)
    parts.push(`${mem}/${formatBytes(row.resources?.memoryBytes) ?? copy.none}`)
  } else {
    const size = sizeLine(copy, row)
    if (size) parts.push(size)
  }
  if (row?.profileId) parts.push(row.profileId)
  if (pendingRevision(row)) parts.push(copy.pendingApply)
  return parts.join(' · ')
}

/** Minute bins of one metric, gaps omitted. */
export function pointsOf(usage, metric, unit, valueKey) {
  if (usage?.[metric]?.unit !== unit || !Array.isArray(usage.history)) return []
  return usage.history.flatMap((bin) => (
    typeof bin?.at === 'number' && typeof bin[valueKey] === 'number' && Number.isFinite(bin[valueKey])
      ? [{ at: bin.at, value: bin[valueKey] }]
      : []
  ))
}

/** Sum of several sandboxes' bins at the same instant, with summed coverage. */
export function combine(usages, metric, unit, valueKey) {
  let expected = 0
  let valid = 0
  let objects = 0
  const byAt = new Map()
  for (const usage of usages) {
    const facts = usage?.[metric]
    if (!facts || facts.unit !== unit) continue
    objects += 1
    expected += Number(facts.expected) || 0
    valid += Number(facts.valid) || 0
    for (const point of pointsOf(usage, metric, unit, valueKey)) {
      byAt.set(point.at, (byAt.get(point.at) ?? 0) + point.value)
    }
  }
  const points = [...byAt.entries()].sort((a, b) => a[0] - b[0]).map(([at, value]) => ({ at, value }))
  const values = points.map((point) => point.value)
  return {
    objects, expected, valid, points,
    mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    peak: values.length ? Math.max(...values) : null,
  }
}
