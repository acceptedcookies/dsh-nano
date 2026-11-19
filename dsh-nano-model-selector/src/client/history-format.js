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
  select: { tone: 'neutral' },
  commit: { tone: 'success' },
  drop: { tone: 'danger' },
  skip: { tone: 'quiet' },
  health: { tone: 'success' },
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

/** Fill `{name}` slots; a missing value renders as an em dash. */
export function fillTemplate(template, vars) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key]
    return value === undefined || value === null || value === '' ? '—' : String(value)
  })
}

/**
 * Tokens as a short count: 140000 → "140K", 39321 → "39.3K".
 * @param {unknown} value
 */
export function tok(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 1_000_000) return `${trimZero((value / 1_000_000).toFixed(2))}M`
  if (Math.abs(value) >= 1000) return `${trimZero((value / 1000).toFixed(1))}K`
  return String(Math.round(value))
}

function trimZero(text) {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text
}

/** Plain-language reason for a drop/skip code; the raw code when unknown. */
export function reasonText(reason, copy) {
  if (reason === undefined || reason === null || reason === '') return copy.historyUnknownReason ?? '—'
  return copy.historyReason?.[reason] ?? String(reason)
}

/** Why a compaction lane ran, in words. */
export function triggerText(record, copy) {
  const key = record?.trigger ?? (record?.lane === 'async' ? 'b-line' : record?.lane)
  return copy.historyTrigger?.[key] ?? (key === undefined || key === null ? '—' : String(key))
}

/** Where the cut landed (turn/step/node), in words. */
export function boundaryText(boundary, copy) {
  return copy.historyBoundary?.[boundary] ?? (boundary === undefined || boundary === null ? '—' : String(boundary))
}

/**
 * The one line that explains a decision, in plain language. Every slot falls
 * back to an em dash instead of printing `undefined` — a diagnostic view that
 * shows "undefined" is worse than one that shows nothing.
 * @param {object} record - one ledger record.
 * @param {object} copy - active dictionary slice.
 * @param {object|null} [policy] - current policy, for lines the record does not carry.
 * @returns {string}
 */
export function recordHeadline(record, copy, policy = null) {
  const step = copy.historyStep ?? {}
  switch (record?.kind) {
    case 'arm':
      return fillTemplate(step.arm, {
        fill: pct(record.fill),
        line: pct(record.bufferSizeAsync ?? policy?.bufferSizeAsync),
        kept: tok(record.retain),
      })
    case 'claim':
      return fillTemplate(step.claim, {
        model: typeof record.target === 'string' && record.target !== '' ? record.target
          : record.target?.model ? `${record.target.provider}/${record.target.model}` : copy.historyModelRouted,
      })
    case 'select':
      return fillTemplate(record.lane === 'async' ? step.selectAsync : step.selectSync, {
        trigger: triggerText(record, copy),
        fill: pct(record.fill),
        boundary: boundaryText(record.boundary, copy),
        kept: tok(record.retainedTokens),
      })
    case 'commit':
      return fillTemplate(step.commit, { records: record.records, tokens: tok(record.tokens) })
    case 'drop': {
      const reason = reasonText(record.reason, copy)
      return fillTemplate(step.drop, { reason: record.detail && copy.historyReason?.[record.reason] === undefined ? record.detail : reason })
    }
    case 'skip':
      return reasonText(record.reason, copy)
    case 'health':
      return fillTemplate(record.overHealth ? step.healthOver : step.healthOk, {
        fill: pct(record.fill),
        line: pct(record.healthTargetAsync ?? policy?.healthTargetAsync),
        tokens: tok(record.tokens),
      })
    default: {
      const value = record?.detail ?? record?.reason
      return value === undefined || value === null || value === '' ? '—' : String(value)
    }
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
    const plain = copy.historyReason?.[phase.reason]
    const reason = plain === undefined
      ? phase.detail ?? phase.reason ?? copy.historyUnknownReason
      : (phase.detail ? `${plain}（${phase.detail}）` : plain)
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

/**
 * Resolve the live phase for the badge.
 *
 * P5-01d: `committed` comes ONLY from the session-scoped projection's
 * `lastCompaction` (the durable fold's `status: 'completed'`) — no 10-minute
 * ledger window, no host TTL. The projection does not carry the ledger's
 * metadata, so the newest `commit` record (not necessarily the tail: a
 * post-commit `select`/`arm` may sit above it) supplies model / promptVersion
 * / counts. In-flight states (`armed`/`running`/`failed`) still come from the
 * ledger-derived `history.phase`, which knows `select` via `derivePhase`.
 *
 * @param {{state?: string}|null} hostPhase - `history.phase` from the route.
 * @param {object} data - the full `?sessionId=` payload (policy + history).
 * @returns {object|null}
 */
export function resolvePhase(hostPhase, data) {
  const last = data?.policy?.runtime?.lastCompaction ?? null
  if (last?.status === 'completed') {
    const records = Array.isArray(data?.history?.records) ? data.history.records : []
    let commit = null
    for (let i = records.length - 1; i >= 0; i -= 1) {
      if (records[i]?.kind === 'commit') { commit = records[i]; break }
    }
    return {
      state: 'committed',
      since: typeof last.at === 'string' ? last.at : null,
      model: commit?.target ?? null,
      promptVersion: typeof commit?.promptVersion === 'string' ? commit.promptVersion : null,
      reason: null,
      detail: null,
      compactionId: typeof commit?.compactionId === 'string' ? commit.compactionId : null,
      tokens: typeof commit?.tokens === 'number' ? commit.tokens : null,
      records: typeof commit?.records === 'number' ? commit.records : null,
    }
  }
  if (hostPhase !== null && hostPhase !== undefined && typeof hostPhase.state === 'string' && hostPhase.state !== 'idle') {
    return hostPhase
  }
  return hostPhase ?? null
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

/* ---------------- episode view (timeline cards) ---------------- */

/** An async episode with no terminal record for this long was cut off (host restart). */
const ARMED_STALE_MS = 15 * 60_000
const RUNNING_STALE_MS = 3 * 60_000
/** Consecutive sync selects of one lane within this gap are retries of one compaction. */
const SYNC_RETRY_GAP_MS = 60_000

const timeOf = record => (typeof record?.at === 'string' ? Date.parse(record.at) : Number.NaN)

/**
 * Fold ledger records (oldest first) into the units a reader thinks in: one
 * async compaction (arm → claim → select → commit/drop, plus the post-commit
 * health verdict), one synchronous compaction (its select retries), one run of
 * identical skips. Returned oldest first.
 *
 * Statuses: async `armed`/`running`/`committed`/`dropped`/`settled` (disarmed
 * or preempted — a settlement, not a failure)/`stale` (no terminal record);
 * sync `started` (its outcome lives in the journal, not in the ledger);
 * skip `skipped`; orphan health `ok`/`over`; anything else `other`.
 *
 * @param {object[]} records
 * @param {number} [now]
 */
export function groupEpisodes(records, now = Date.now()) {
  const groups = []
  const byCompaction = new Map()
  let open = null
  const push = group => { groups.push(group); return group }
  const closeStale = () => { if (open !== null) open.status = 'stale'; open = null }

  for (const record of Array.isArray(records) ? records : []) {
    if (record === null || typeof record !== 'object') continue
    const kind = record.kind
    if (kind === 'arm') {
      closeStale()
      open = push({ type: 'async', status: 'armed', records: [record] })
    } else if (kind === 'claim' || (kind === 'select' && record.lane === 'async')) {
      if (open === null) open = push({ type: 'async', status: 'running', records: [] })
      open.records.push(record)
      open.status = 'running'
    } else if (kind === 'commit') {
      const group = open ?? push({ type: 'async', status: 'committed', records: [] })
      group.records.push(record)
      group.status = 'committed'
      if (typeof record.compactionId === 'string') byCompaction.set(record.compactionId, group)
      open = null
    } else if (kind === 'drop') {
      const group = open ?? push({ type: 'async', status: 'dropped', records: [] })
      group.records.push(record)
      group.status = record.reason === 'disarmed' || record.reason === 'preempted' ? 'settled' : 'dropped'
      open = null
    } else if (kind === 'health') {
      const group = byCompaction.get(record.compactionId)
      if (group !== undefined) group.records.push(record)
      else push({ type: 'health', status: record.overHealth ? 'over' : 'ok', records: [record] })
    } else if (kind === 'select') {
      const last = groups.at(-1)
      const lastRecord = last?.records.at(-1)
      if (last?.type === 'sync' && last.records[0].lane === record.lane
        && last.records[0].trigger === record.trigger
        && timeOf(record) - timeOf(lastRecord) <= SYNC_RETRY_GAP_MS) {
        last.records.push(record)
      } else {
        push({ type: 'sync', status: 'started', records: [record] })
      }
    } else if (kind === 'skip') {
      const last = groups.at(-1)
      if (last?.type === 'skip' && last.records[0].reason === record.reason) last.records.push(record)
      else push({ type: 'skip', status: 'skipped', records: [record] })
    } else {
      push({ type: 'other', status: 'other', records: [record] })
    }
  }
  if (open !== null) {
    const age = now - timeOf(open.records.at(-1))
    const limit = open.status === 'armed' ? ARMED_STALE_MS : RUNNING_STALE_MS
    if (Number.isFinite(age) && age > limit) open.status = 'stale'
  }
  return groups
}

const GROUP_TONES = {
  committed: 'success',
  dropped: 'danger',
  settled: 'neutral',
  armed: 'info',
  running: 'info',
  stale: 'warning',
  started: 'warning',
  skipped: 'quiet',
  ok: 'success',
  over: 'warning',
  other: 'outline',
}

/**
 * Title, status tag and one summary line for an episode card.
 * @param {ReturnType<typeof groupEpisodes>[number]} group
 * @param {object} copy
 * @param {object|null} [policy]
 * @returns {{title: string, status: string, tone: string, summary: string, at: string|null, count: number}}
 */
export function episodeView(group, copy, policy = null) {
  const first = group.records[0] ?? {}
  const last = group.records.at(-1) ?? {}
  const find = kind => group.records.find(record => record.kind === kind)
  const status = copy.historyEpisodeStatus?.[group.status] ?? group.status
  const tone = GROUP_TONES[group.status] ?? 'outline'
  const at = typeof last.at === 'string' ? last.at : null
  const parts = []
  let title = copy.historyEpisode?.[group.type] ?? group.type

  if (group.type === 'async') {
    const arm = find('arm')
    const select = find('select')
    const commit = find('commit')
    const drop = find('drop')
    const health = find('health')
    if (arm !== undefined) parts.push(fillTemplate(copy.historySummary?.armFill, { fill: pct(arm.fill) }))
    if (select !== undefined) parts.push(fillTemplate(copy.historySummary?.kept, { kept: tok(select.retainedTokens) }))
    if (commit !== undefined) parts.push(fillTemplate(copy.historySummary?.replaced, { records: commit.records, tokens: tok(commit.tokens) }))
    if (drop !== undefined) parts.push(reasonText(drop.reason, copy))
    if (health !== undefined) {
      parts.push(fillTemplate(health.overHealth ? copy.historySummary?.afterOver : copy.historySummary?.afterOk, {
        fill: pct(health.fill),
        line: pct(health.healthTargetAsync ?? policy?.healthTargetAsync),
      }))
    } else if (commit !== undefined) {
      parts.push(copy.historySummary?.afterPending ?? '')
    }
  } else if (group.type === 'sync') {
    title = `${title} · ${triggerText(first, copy)}`
    parts.push(fillTemplate(copy.historySummary?.syncFill, { fill: pct(first.fill) }))
    parts.push(fillTemplate(copy.historySummary?.kept, { kept: tok(last.retainedTokens) }))
    if (group.records.length > 1) parts.push(fillTemplate(copy.historySummary?.retries, { n: group.records.length }))
    parts.push(copy.historySummary?.syncResult ?? '')
  } else if (group.type === 'skip') {
    parts.push(reasonText(first.reason, copy))
  } else if (group.type === 'health') {
    parts.push(recordHeadline(first, copy, policy))
  } else {
    parts.push(recordHeadline(first, copy, policy))
  }
  return {
    title,
    status,
    tone,
    summary: parts.filter(part => typeof part === 'string' && part.length > 0).join(' · '),
    at,
    count: group.records.length,
  }
}

/**
 * The one-paragraph answer to "what is going on with compaction here?",
 * shown above the timeline. Pure so the wording is pinned by tests.
 *
 * @param {{fill: number|null, policy: object|null, groups: object[], now?: number, copy: object, ago?: (at:number)=>string}} input
 * @returns {{tone: 'success'|'info'|'warning'|'danger'|'neutral', lines: string[]}}
 */
export function diagnosisOf({ fill, policy, groups, copy, ago = () => '' }) {
  const B = policy?.bufferSizeAsync
  const H = policy?.healthTargetAsync
  const S = policy?.bufferSizeSafety ?? 0.9
  const lines = []
  let tone = 'neutral'
  const v = copy.historyVerdict ?? {}

  const latestAsync = [...(groups ?? [])].reverse().find(group => group.type === 'async') ?? null
  if (latestAsync?.status === 'running') { lines.push(v.running); tone = 'info' }
  else if (latestAsync?.status === 'armed') { lines.push(v.armed); tone = 'info' }

  if (typeof fill === 'number' && Number.isFinite(fill) && typeof B === 'number') {
    if (fill >= S) { lines.push(fillTemplate(v.aboveSafety, { fill: pct(fill), line: pct(S) })); tone = 'danger' }
    else if (fill >= B) { lines.push(fillTemplate(v.aboveBuffer, { fill: pct(fill), line: pct(B) })); if (tone === 'neutral') tone = 'warning' }
    else { lines.push(fillTemplate(v.belowBuffer, { fill: pct(fill), line: pct(B) })); if (tone === 'neutral') tone = 'success' }
  } else if ((groups ?? []).length > 0) {
    lines.push(v.unknownFill)
  }

  if (latestAsync !== null) {
    const at = Date.parse(latestAsync.records.at(-1)?.at ?? '')
    const when = Number.isFinite(at) ? ago(at) : '—'
    const drop = latestAsync.records.find(record => record.kind === 'drop')
    const commit = latestAsync.records.find(record => record.kind === 'commit')
    const health = latestAsync.records.find(record => record.kind === 'health')
    if (latestAsync.status === 'committed') {
      lines.push(fillTemplate(v.committed, { ago: when, records: commit?.records, tokens: tok(commit?.tokens) }))
      if (health?.overHealth === true) {
        lines.push(fillTemplate(v.overHealth, { fill: pct(health.fill), line: pct(health.healthTargetAsync ?? H) }))
        if (tone === 'success' || tone === 'neutral') tone = 'warning'
      }
    } else if (latestAsync.status === 'dropped') {
      lines.push(fillTemplate(v.dropped, { ago: when, reason: reasonText(drop?.reason, copy) }))
      if (tone !== 'danger') tone = 'danger'
    } else if (latestAsync.status === 'settled') {
      lines.push(fillTemplate(v.settled, { ago: when, reason: reasonText(drop?.reason, copy) }))
    } else if (latestAsync.status === 'stale') {
      lines.push(fillTemplate(v.stale, { ago: when }))
      if (tone === 'success' || tone === 'neutral') tone = 'warning'
    }
  }
  if (lines.length === 0) lines.push(v.empty)
  return { tone, lines: lines.filter(line => typeof line === 'string' && line.length > 0) }
}

/**
 * The four zones of the water line, each with its range and the zone the
 * current fill sits in.
 * @param {number} health @param {number} buffer @param {number} safety
 * @param {number|null} fill
 */
export function zonesOf(health, buffer, safety, fill) {
  const zones = [
    { key: 'health', from: 0, to: health },
    { key: 'buffer', from: health, to: buffer },
    { key: 'async', from: buffer, to: safety },
    { key: 'force', from: safety, to: 1 },
  ]
  const at = typeof fill === 'number' && Number.isFinite(fill) ? Math.min(1, Math.max(0, fill)) : null
  return zones.map((zone, index) => ({
    ...zone,
    current: at !== null && at >= zone.from && (at < zone.to || (index === zones.length - 1 && at <= zone.to)),
    range: `${Math.round(zone.from * 100)}–${Math.round(zone.to * 100)}%`,
  }))
}
