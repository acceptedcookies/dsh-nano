/**
 * history-format.test.mjs — the presentation contract of the async-compaction
 * history dialog.
 *
 * The dialog is a diagnostic surface: a wrong unit or a swallowed unknown kind
 * makes an operator draw the wrong conclusion about why compaction did not run.
 * These tests pin the mapping from ledger records to the one line each row
 * shows, plus the counters the header derives from the same records.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HISTORY_KINDS, UNKNOWN_KIND, agoText, axisLabels, foldSummary, pct, recordHeadline, relativeTimeOf, resolveFill, resolvePhase, statusBadgeFor,
} from '../src/client/history-format.js'

const COPY = {
  historyFill: '填充',
  historyRetain: '保留',
  historyJustNow: '刚刚',
  historyAgo: { minutes: '{n} 分钟前', hours: '{n} 小时前', days: '{n} 天前', months: '{n} 个月前', years: '{n} 年前' },
  historyBadgeArmed: '异步压缩已排队',
  historyBadgeArmedTip: '等空闲',
  historyBadgeRunning: '正在异步压缩',
  historyBadgeRunningTip: '正在摘要',
  historyBadgeCommitted: '已异步压缩',
  historyBadgeCommittedSize: '{n} 条',
  historyBadgeCommittedTip: '上一轮由异步通道完成',
  historyBadgeFailed: '异步压缩失败',
  historyBadgeFailedTip: '原因：{reason}',
  historyUnknownReason: '未知原因',
  historyModelRouted: '跟随会话模型',
  historyPromptVersion: '摘要 v{v}',
}

test('pct renders one decimal and never NaN', () => {
  assert.equal(pct(0.71), '71.0%')
  assert.equal(pct(0), '0.0%')
  assert.equal(pct(1), '100.0%')
  assert.equal(pct(null), '—')
  assert.equal(pct(undefined), '—')
  assert.equal(pct(Number.NaN), '—')
  assert.equal(pct('0.5'), '—')
})

test('relativeTimeOf buckets match the shell primitive', () => {
  const now = 1_700_000_000_000
  assert.deepEqual(relativeTimeOf(now - 1_000, now), { unit: 'now', n: 0 })
  assert.deepEqual(relativeTimeOf(now - 5 * 60_000, now), { unit: 'minutes', n: 5 })
  assert.deepEqual(relativeTimeOf(now - 3 * 3_600_000, now), { unit: 'hours', n: 3 })
  assert.deepEqual(relativeTimeOf(now - 2 * 86_400_000, now), { unit: 'days', n: 2 })
  assert.deepEqual(relativeTimeOf(now - 60 * 86_400_000, now), { unit: 'months', n: 2 })
  assert.deepEqual(relativeTimeOf(now - 400 * 86_400_000, now), { unit: 'years', n: 1 })
  // A clock skew that puts the record in the future reads as "just now".
  assert.deepEqual(relativeTimeOf(now + 60_000, now), { unit: 'now', n: 0 })
})

test('agoText localises every bucket and tolerates a partial dictionary', () => {
  const now = 1_700_000_000_000
  assert.equal(agoText(now - 1_000, now, COPY), '刚刚')
  assert.equal(agoText(now - 5 * 60_000, now, COPY), '5 分钟前')
  assert.equal(agoText(now - 3 * 3_600_000, now, COPY), '3 小时前')
  assert.equal(agoText(now - 2 * 86_400_000, now, COPY), '2 天前')
  // A dictionary missing a bucket falls back to minutes rather than throwing.
  assert.equal(agoText(now - 3 * 3_600_000, now, { historyJustNow: 'now', historyAgo: { minutes: '{n}m' } }), '3m')
  assert.equal(agoText(Number.NaN, now, COPY), '—')
})

test('recordHeadline explains each decision with its own number', () => {
  assert.equal(
    recordHeadline({ kind: 'arm', fill: 0.71, retain: 39300 }, COPY),
    '填充 71.0% · 保留 39300',
  )
  assert.equal(recordHeadline({ kind: 'claim', retain: 39300 }, COPY), '保留 39300')
  assert.equal(recordHeadline({ kind: 'commit', records: 5, tokens: 862 }, COPY), '5 条 · 862 tok')
  assert.equal(recordHeadline({ kind: 'drop', reason: 'degraded', detail: 'policy unreadable' }, COPY), 'policy unreadable')
  // A drop without detail still says why it was dropped.
  assert.equal(recordHeadline({ kind: 'drop', reason: 'no-range' }, COPY), 'no-range')
  assert.equal(recordHeadline({ kind: 'skip', reason: 'circuit-open' }, COPY), 'circuit-open')
})

test('recordHeadline never prints undefined for a partial record', () => {
  assert.equal(recordHeadline({ kind: 'arm' }, COPY), '填充 — · 保留 —')
  assert.equal(recordHeadline({ kind: 'commit' }, COPY), '— 条 · — tok')
  assert.equal(recordHeadline({ kind: 'future-kind' }, COPY), '—')
  assert.equal(recordHeadline(undefined, COPY), '—')
})

test('every known kind has a shell Tag tone and no live-state dot', () => {
  const tones = new Set(['danger', 'info', 'neutral', 'outline', 'quiet', 'solid', 'success', 'warning'])
  for (const [kind, spec] of Object.entries(HISTORY_KINDS)) {
    assert.ok(tones.has(spec.tone), `${kind} tone ${spec.tone} is not a shell Tag tone`)
    // A historical record must never carry a live-state marker: the shell's
    // 'ongoing' dot is a hollow ring that reads as a spinner that never stops.
    assert.equal(spec.dot, undefined, `${kind} must not declare a StateDot state`)
  }
  assert.ok(tones.has(UNKNOWN_KIND.tone))
  assert.equal(UNKNOWN_KIND.dot, undefined)
})

test('foldSummary counts what the timeline renders, in one pass', () => {
  const records = [
    { kind: 'arm' }, { kind: 'claim' }, { kind: 'commit', at: 'a' },
    { kind: 'arm' }, { kind: 'drop', reason: 'degraded' }, { kind: 'skip', reason: 'circuit-open' },
    { kind: 'commit', at: 'b' },
  ]
  const summary = foldSummary(records)
  assert.deepEqual(summary, {
    arm: 2, claim: 1, commit: 2, drop: 1, skip: 1,
    lastCommitAt: 'b',
    lastDropReason: 'degraded',
  })
  // Unknown kinds are counted nowhere but never throw.
  assert.equal(foldSummary([{ kind: 'future-kind' }]).arm, 0)
  assert.equal(foldSummary(null).commit, 0)
})

test('statusBadgeFor is silent while the lane is idle', () => {
  assert.equal(statusBadgeFor(null, COPY), null)
  assert.equal(statusBadgeFor(undefined, COPY), null)
  assert.equal(statusBadgeFor({ state: 'idle' }, COPY), null)
})

test('statusBadgeFor names the model and the instruction version', () => {
  const running = statusBadgeFor({
    state: 'running',
    model: { provider: 'magpie', model: 'auto/deepseek-v4.1-flash-1017' },
    promptVersion: '3b7aa71f',
  }, COPY)
  assert.equal(running.state, 'running')
  assert.equal(running.text, '正在异步压缩')
  assert.match(running.tooltip, /正在摘要/)
  assert.match(running.tooltip, /magpie\/auto\/deepseek-v4\.1-flash-1017 · 摘要 v3b7aa71f/)

  const armed = statusBadgeFor({ state: 'armed', model: null, promptVersion: null }, COPY)
  assert.equal(armed.text, '异步压缩已排队')
  // An empty policy model means "reuse the routed target": say so instead of
  // printing "undefined/undefined".
  assert.match(armed.tooltip, /跟随会话模型/)
})

test('statusBadgeFor keeps saying async after the commit', () => {
  // The shell's own 「上下文已压缩」 row is host-owned and cannot say which lane
  // produced it, so the badge has to carry that attribution.
  const committed = statusBadgeFor({ state: 'committed', records: 332, tokens: 90010, promptVersion: '3b7aa71f' }, COPY)
  assert.equal(committed.state, 'committed')
  assert.equal(committed.text, '已异步压缩 · 332 条')
  assert.match(committed.tooltip, /上一轮由异步通道完成/)

  // A commit without a record count still says async, just without the size.
  assert.equal(statusBadgeFor({ state: 'committed' }, COPY).text, '已异步压缩')
})

test('statusBadgeFor reports the failure reason and never hides it', () => {
  const failed = statusBadgeFor({ state: 'failed', reason: 'transient', detail: '429: usage limit reached' }, COPY)
  assert.equal(failed.text, '异步压缩失败')
  assert.equal(failed.tooltip, '原因：429: usage limit reached')

  assert.match(statusBadgeFor({ state: 'failed', reason: 'no-range' }, COPY).tooltip, /no-range/)
  assert.match(statusBadgeFor({ state: 'failed' }, COPY).tooltip, /未知原因/)
})

test('resolvePhase takes in-flight states from the ledger phase, committed from the projection', () => {
  const host = { state: 'running', model: { provider: 'p', model: 'm' } }
  const data = { history: { records: [] }, policy: { runtime: { lastCompaction: null } } }
  assert.equal(resolvePhase(host, data), host)
  // P5-01d: committed comes ONLY from lastCompaction — never from a commit
  // tail's freshness window.
  const committed = {
    history: { records: [{ kind: 'commit', tokens: 90010, records: 332, at: 'x' }] },
    policy: { runtime: { lastCompaction: { status: 'completed', at: 'x' } } },
  }
  assert.equal(resolvePhase({ state: 'idle' }, committed).state, 'committed')
  assert.equal(resolvePhase(null, committed).state, 'committed')
  // The ledger commit record still supplies the attribution facts.
  const phase = resolvePhase(null, committed)
  assert.equal(phase.tokens, 90010)
  assert.equal(phase.records, 332)
})

test('resolvePhase: no committed projection means no committed badge', () => {
  const busyFold = {
    history: { records: [{ kind: 'commit', tokens: 1, records: 1, at: 'x' }] },
    policy: { runtime: { lastCompaction: { status: 'busy', at: 'x' } } },
  }
  assert.equal(resolvePhase({ state: 'idle' }, busyFold).state, 'idle')
  const failedFold = {
    history: { records: [{ kind: 'commit', tokens: 1, records: 1, at: 'x' }] },
    policy: { runtime: { lastCompaction: { status: 'failed' } } },
  }
  assert.equal(resolvePhase({ state: 'idle' }, failedFold).state, 'idle')
  assert.equal(resolvePhase(null, { history: { records: [] }, policy: { runtime: { lastCompaction: null } } }), null)
})

test('a committed phase renders as the async attribution badge', () => {
  const records = [{
    kind: 'commit', tokens: 90010, records: 332,
    promptVersion: '3b7aa71f', target: { provider: 'magpie', model: 'auto/deepseek-v4.1-flash-1017' },
  }]
  const data = {
    history: { records },
    policy: { runtime: { lastCompaction: { status: 'completed', at: 'x' } } },
  }
  const badge = statusBadgeFor(resolvePhase({ state: 'idle' }, data), COPY)
  assert.equal(badge.state, 'committed')
  assert.equal(badge.text, '已异步压缩 · 332 条')
  assert.match(badge.tooltip, /摘要 v3b7aa71f/)
})

test('axisLabels puts each threshold at its own position with its value', () => {
  const axis = axisLabels(0.5, 0.65, 0.9)
  assert.deepEqual(axis.map(l => l.text), ['H 50.0%', 'B 65.0%', 'S 90.0%'])
  assert.deepEqual(axis.map(l => l.value), [0.5, 0.65, 0.9])
  assert.deepEqual(axis.map(l => l.tone), ['health', 'buffer', 'safety'])
  assert.deepEqual(axis.map(l => l.anchor), ['middle', 'middle', 'end'])
})

test('axisLabels keeps end labels inside the track', () => {
  // A centred label at 0.9 would hang past the right edge and clip.
  assert.equal(axisLabels(0.05, 0.5, 0.95)[0].anchor, 'start')
  assert.equal(axisLabels(0.05, 0.5, 0.95)[2].anchor, 'end')
})

test('axisLabels drops the value when two thresholds would collide', () => {
  // H ≤ B ≤ S is enforced, but they can still be a percentage point apart.
  const crowded = axisLabels(0.64, 0.65, 0.9)
  assert.equal(crowded[0].text, 'H')
  assert.equal(crowded[1].text, 'B')
  assert.equal(crowded[2].text, 'S 90.0%')
  // Colliding labels keep their values on the object even when the text is short.
  assert.equal(crowded[0].value, 0.64)
})
