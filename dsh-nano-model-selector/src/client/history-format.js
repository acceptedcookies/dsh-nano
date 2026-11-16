/**
 * Pure presentation logic for the async-compaction history dialog.
 *
 * Kept out of the JSX so it can be unit-tested without React, the shell
 * primitives, or a browser: the dialog's job is to turn ledger records into
 * one honest line each, and that mapping is where a diagnostic view goes wrong
 * (wrong unit, wrong sign, silently swallowed unknown kind).
 */

/**
 * Ledger `kind` → the shell's Tag tone.
 *
 * Deliberately no StateDot state: these rows are historical facts, and the
 * shell's `ongoing` dot is a hollow ring that reads as a spinner — a record
 * from ten minutes ago must not look like it is still loading.
 */
export const HISTORY_KINDS = {
  arm: { tone: 'info' },
  claim: { tone: 'neutral' },
  commit: { tone: 'success' },
  drop: { tone: 'danger' },
  skip: { tone: 'warning' },
}

/** Fallback for a kind this build does not know (forward compatibility). */
export const UNKNOWN_KIND = { tone: 'outline' }

/**
 * Percent with one decimal. Anything that is not a finite number — a missing
 * meter, a degraded read — renders as an em dash rather than "NaN%".
 * @param {unknown} value - ratio in 0..1.
 */
export function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—'
}

/**
 * Format a `relativeTime` result through the active copy.
 * @param {number} at - epoch millis of the record.
 * @param {number} now - epoch millis of the render.
 * @param {object} copy - active dictionary slice.
 * @param {(at:number, now:number) => {unit:string, n:number}} [relativeTime] - the shell's
 *   `relativeTime` primitive; the local bucket function is the default so this module
 *   stays importable without the shell.
 * @returns {string}
 */
export function agoText(at, now, copy, relativeTime = relativeTimeOf) {
  if (!Number.isFinite(at)) return '—'
  const { unit, n } = relativeTime(at, now)
  if (unit === 'now') return copy.historyJustNow
  const forms = copy.historyAgo ?? {}
  return (forms[unit] ?? forms.minutes ?? '{n}').replace('{n}', String(n))
}

/**
 * The shell's `relativeTime` bucketing, reproduced so this module stays pure
 * and testable. The dialog passes the primitive's own result through the same
 * buckets; keeping the arithmetic here means the test covers the real path.
 * @param {number} at @param {number} now
 * @returns {{unit: string, n: number}}
 */
export function relativeTimeOf(at, now) {
  const delta = Math.max(0, now - at)
  if (delta < 60_000) return { unit: 'now', n: 0 }
  if (delta < 3_600_000) return { unit: 'minutes', n: Math.floor(delta / 60_000) }
  if (delta < 86_400_000) return { unit: 'hours', n: Math.floor(delta / 3_600_000) }
  if (delta < 30 * 86_400_000) return { unit: 'days', n: Math.floor(delta / 86_400_000) }
  if (delta < 365 * 86_400_000) return { unit: 'months', n: Math.floor(delta / (30 * 86_400_000)) }
  return { unit: 'years', n: Math.floor(delta / (365 * 86_400_000)) }
}

/**
 * The one line that explains a decision, per kind. Every branch falls back to
 * an em dash instead of printing `undefined` — a diagnostic view that shows
 * "undefined" is worse than one that shows nothing.
 * @param {object} record - one ledger record.
 * @param {object} copy - active dictionary slice.
 * @returns {string}
 */
export function recordHeadline(record, copy) {
  const dash = value => (value === undefined || value === null || value === '' ? '—' : String(value))
  switch (record?.kind) {
    case 'arm':
      return `${copy.historyFill} ${pct(record.fill)} · ${copy.historyRetain} ${dash(record.retain)}`
    case 'claim':
      return `${copy.historyRetain} ${dash(record.retain)}`
    case 'commit':
      return `${dash(record.records)} 条 · ${dash(record.tokens)} tok`
    case 'drop':
    case 'skip':
      return dash(record.detail ?? record.reason)
    default:
      return dash(record?.detail ?? record?.reason)
  }
}

/**
 * Fold ledger records into the four counters the header shows.
 *
 * Derived, never stored twice: the ledger is append-only, so the counts must
 * always agree with the records the timeline renders below them.
 * @param {object[]} records
 */
export function foldSummary(records) {
  const summary = { arm: 0, claim: 0, commit: 0, drop: 0, skip: 0, lastCommitAt: null, lastDropReason: null }
  for (const record of Array.isArray(records) ? records : []) {
    if (record === null || typeof record !== 'object') continue
    if (record.kind in summary) summary[record.kind] += 1
    if (record.kind === 'commit') summary.lastCommitAt = record.at ?? null
    if (record.kind === 'drop') summary.lastDropReason = record.reason ?? null
  }
  return summary
}
/**
 * The status badge's content for one live phase, or null when there is nothing
 * to say.
 *
 * A queued or running episode names the summarizer and the instruction
 * version; a settled one keeps saying 「已异步压缩」 for a while, because the
 * shell's own 「上下文已压缩」 row is host-owned and cannot say which lane
 * produced it. Kept pure so the wording is pinned by tests.
 *
 * @param {{state: string, model?: object|null, promptVersion?: string|null, reason?: string|null, detail?: string|null, tokens?: number|null, records?: number|null}|null} phase
 * @param {object} copy - active dictionary slice.
 * @returns {{state: string, text: string, tooltip: string}|null}
 */
export function statusBadgeFor(phase, copy) {
  if (phase === null || phase === undefined) return null
  const model = phase.model === null || phase.model === undefined
    ? copy.historyModelRouted
    : `${phase.model.provider}/${phase.model.model}`
  const version = typeof phase.promptVersion === 'string' && phase.promptVersion.length > 0
    ? copy.historyPromptVersion.replace('{v}', phase.promptVersion)
    : null
  const facts = [model, version].filter(Boolean).join(' · ')

  if (phase.state === 'armed') {
    return { state: 'armed', text: copy.historyBadgeArmed, tooltip: `${copy.historyBadgeArmedTip}\n${facts}` }
  }
  if (phase.state === 'running') {
    return { state: 'running', text: copy.historyBadgeRunning, tooltip: `${copy.historyBadgeRunningTip}\n${facts}` }
  }
  if (phase.state === 'committed') {
    const size = phase.records === null || phase.records === undefined
      ? null
      : copy.historyBadgeCommittedSize.replace('{n}', String(phase.records))
    return {
      state: 'committed',
      text: size === null ? copy.historyBadgeCommitted : `${copy.historyBadgeCommitted} · ${size}`,
      tooltip: `${copy.historyBadgeCommittedTip}\n${facts}`,
    }
  }
  if (phase.state === 'failed') {
    const reason = phase.detail ?? phase.reason ?? copy.historyUnknownReason
    return { state: 'failed', text: copy.historyBadgeFailed, tooltip: copy.historyBadgeFailedTip.replace('{reason}', reason) }
  }
  return null
}

/**
 * Resolve the fill ratio the water line should draw.
 *
 * The live projection can be unavailable (`degraded: 'meter-unavailable'` when
 * the host realm cannot measure the latest session) — on a desktop host that is
 * the normal case, and a blank gauge is the least useful thing a diagnostic
 * view can show. The engine records the fill it actually decided on, so fall
 * back to the newest decision and say so, rather than drawing nothing.
 *
 * @param {unknown} runtimeFill - `policy.runtime.fill`, a 0..1 ratio or null.
 * @param {object[]} records - ledger records, oldest first.
 * @returns {{value: number|null, fromDecision: boolean}}
 */
export function resolveFill(runtimeFill, records) {
  if (typeof runtimeFill === 'number' && Number.isFinite(runtimeFill)) {
    return { value: runtimeFill, fromDecision: false }
  }
  for (let i = (Array.isArray(records) ? records.length : 0) - 1; i >= 0; i -= 1) {
    const fill = records[i]?.fill
    if (typeof fill === 'number' && Number.isFinite(fill)) return { value: fill, fromDecision: true }
  }
  return { value: null, fromDecision: false }
}

/** How long a settled commit keeps its async attribution on screen. */
const COMMITTED_TTL_MS = 10 * 60 * 1000

/**
 * Resolve the live phase, preferring the host's projection and falling back to
 * the ledger tail.
 *
 * The host derives `phase` itself, but a host that predates the `committed`
 * state (or one whose projection is degraded) reports `idle` right after a
 * successful async compaction — and that is exactly the moment the async
 * attribution matters, because the shell's own 「上下文已压缩」 row cannot say
 * which lane produced it. Deriving `committed` from the ledger keeps the badge
 * honest without waiting for a host upgrade.
 *
 * @param {{state?: string}|null} hostPhase - `history.phase` from the route.
 * @param {object[]} records - ledger records, oldest first.
 * @param {number} now - epoch millis.
 * @returns {object|null}
 */
export function resolvePhase(hostPhase, records, now) {
  if (hostPhase !== null && hostPhase !== undefined && typeof hostPhase.state === 'string' && hostPhase.state !== 'idle') {
    return hostPhase
  }
  const tail = Array.isArray(records) && records.length > 0 ? records[records.length - 1] : null
  if (tail === null || typeof tail.at !== 'string') return hostPhase ?? null
  const at = Date.parse(tail.at)
  if (!Number.isFinite(at) || now - at > COMMITTED_TTL_MS) return hostPhase ?? null
  if (tail.kind !== 'commit') return hostPhase ?? null
  return {
    state: 'committed',
    since: tail.at,
    model: tail.target ?? null,
    promptVersion: typeof tail.promptVersion === 'string' ? tail.promptVersion : null,
    reason: null,
    detail: null,
    compactionId: typeof tail.compactionId === 'string' ? tail.compactionId : null,
    tokens: typeof tail.tokens === 'number' ? tail.tokens : null,
    records: typeof tail.records === 'number' ? tail.records : null,
  }
}

/** Two axis labels closer than this would overlap; the earlier one drops its value. */
const AXIS_LABEL_MIN_GAP = 0.08

/**
 * Build the water-line axis: one label per threshold, anchored at its own
 * position so no legend has to be matched to a tick.
 *
 * `H ≤ B ≤ S` is enforced by the policy, but a user can still set them a
 * percentage point apart; at that distance two labels collide. The earlier of a
 * close pair therefore keeps only its letter — the colour and the tick still
 * carry the value, and nothing overlaps.
 *
 * @param {number} health
 * @param {number} buffer
 * @param {number} safety
 * @returns {Array<{letter: string, value: number, text: string, anchor: 'start'|'middle'|'end'}>}
 */
export function axisLabels(health, buffer, safety) {
  const lines = [
    { letter: 'H', value: health, tone: 'health' },
    { letter: 'B', value: buffer, tone: 'buffer' },
    { letter: 'S', value: safety, tone: 'safety' },
  ]
  return lines.map((line, index) => {
    const previous = lines[index - 1]
    const next = lines[index + 1]
    const crowded = (previous !== undefined && line.value - previous.value < AXIS_LABEL_MIN_GAP)
      || (next !== undefined && next.value - line.value < AXIS_LABEL_MIN_GAP)
    // Keep an end-anchored label inside the track instead of clipping it.
    const anchor = line.value <= 0.15 ? 'start' : line.value >= 0.85 ? 'end' : 'middle'
    return {
      letter: line.letter,
      tone: line.tone,
      value: line.value,
      text: crowded ? line.letter : `${line.letter} ${pct(line.value)}`,
      anchor,
    }
  })
}
