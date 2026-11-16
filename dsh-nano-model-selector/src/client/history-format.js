/**
 * Pure presentation logic for the async-compaction history dialog.
 *
 * Kept out of the JSX so it can be unit-tested without React, the shell
 * primitives, or a browser: the dialog's job is to turn ledger records into
 * one honest line each, and that mapping is where a diagnostic view goes wrong
 * (wrong unit, wrong sign, silently swallowed unknown kind).
 */

/** Ledger `kind` → the shell's own vocabulary. `dot` is a StateDot state. */
export const HISTORY_KINDS = {
  arm: { tone: 'info', dot: 'ongoing' },
  claim: { tone: 'neutral', dot: 'ongoing' },
  commit: { tone: 'success', dot: 'done' },
  drop: { tone: 'danger', dot: 'error' },
  skip: { tone: 'warning', dot: 'idle' },
}

/** Fallback for a kind this build does not know (forward compatibility). */
export const UNKNOWN_KIND = { tone: 'outline', dot: 'idle' }

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
 * The activity line's content for one live phase, or null when the lane is
 * idle (the shell's own 「上下文已压缩」 row covers the committed case).
 *
 * Kept pure so the wording — the part an operator actually reads — is pinned
 * by tests instead of by eyeballing the browser.
 *
 * @param {{state: string, model?: object|null, promptVersion?: string|null, reason?: string|null, detail?: string|null}|null} phase
 * @param {object} copy - active dictionary slice.
 * @returns {{state: string, text: string, meta: string|null, tooltip: string}|null}
 */
export function activityLineFor(phase, copy) {
  if (phase === null || phase === undefined) return null
  const model = phase.model === null || phase.model === undefined
    ? copy.historyModelRouted
    : `${phase.model.provider}/${phase.model.model}`
  const version = typeof phase.promptVersion === 'string' && phase.promptVersion.length > 0
    ? copy.historyPromptVersion.replace('{v}', phase.promptVersion)
    : null

  if (phase.state === 'armed') {
    return {
      state: 'armed',
      text: copy.historyActivityArmed,
      meta: [model, version].filter(Boolean).join(' · '),
      tooltip: copy.historyActivityArmedTip,
    }
  }
  if (phase.state === 'running') {
    return {
      state: 'running',
      text: copy.historyActivityRunning,
      meta: [model, version].filter(Boolean).join(' · '),
      tooltip: copy.historyActivityRunningTip,
    }
  }
  if (phase.state === 'failed') {
    const reason = phase.detail ?? phase.reason ?? copy.historyActivityUnknownReason
    return {
      state: 'failed',
      text: copy.historyActivityFailed,
      meta: reason,
      tooltip: copy.historyActivityFailedTip.replace('{reason}', reason),
    }
  }
  return null
}
