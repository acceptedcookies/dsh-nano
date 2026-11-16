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
  HISTORY_KINDS, UNKNOWN_KIND, activityLineFor, agoText, foldSummary, pct, recordHeadline, relativeTimeOf,
} from '../src/client/history-format.js'

const COPY = {
  historyFill: '填充',
  historyRetain: '保留',
  historyJustNow: '刚刚',
  historyAgo: { minutes: '{n} 分钟前', hours: '{n} 小时前', days: '{n} 天前', months: '{n} 个月前', years: '{n} 年前' },
  historyActivityArmed: '异步压缩已排队',
  historyActivityArmedTip: '等空闲',
  historyActivityRunning: '正在异步压缩',
  historyActivityRunningTip: '正在摘要',
  historyActivityFailed: '异步压缩失败',
  historyActivityFailedTip: '原因：{reason}',
  historyActivityUnknownReason: '未知原因',
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

test('every known kind has a shell tone and a StateDot state', () => {
  const tones = new Set(['danger', 'info', 'neutral', 'outline', 'quiet', 'solid', 'success', 'warning'])
  const dots = new Set(['ongoing', 'done', 'idle', 'error'])
  for (const [kind, spec] of Object.entries(HISTORY_KINDS)) {
    assert.ok(tones.has(spec.tone), `${kind} tone ${spec.tone} is not a shell Tag tone`)
    assert.ok(dots.has(spec.dot), `${kind} dot ${spec.dot} is not a StateDot state`)
  }
  assert.ok(tones.has(UNKNOWN_KIND.tone))
  assert.ok(dots.has(UNKNOWN_KIND.dot))
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

test('activityLineFor is silent while the lane is idle', () => {
  assert.equal(activityLineFor(null, COPY), null)
  assert.equal(activityLineFor(undefined, COPY), null)
  assert.equal(activityLineFor({ state: 'idle' }, COPY), null)
})

test('activityLineFor names the model and the instruction version', () => {
  const running = activityLineFor({
    state: 'running',
    model: { provider: 'magpie', model: 'auto/deepseek-v4.1-flash-1017' },
    promptVersion: '3b7aa71f',
  }, COPY)
  assert.equal(running.state, 'running')
  assert.equal(running.text, '正在异步压缩')
  assert.equal(running.meta, 'magpie/auto/deepseek-v4.1-flash-1017 · 摘要 v3b7aa71f')
  assert.equal(running.tooltip, '正在摘要')

  const armed = activityLineFor({ state: 'armed', model: null, promptVersion: null }, COPY)
  assert.equal(armed.text, '异步压缩已排队')
  // An empty policy model means "reuse the routed target": say so instead of
  // printing "undefined/undefined".
  assert.equal(armed.meta, '跟随会话模型')
})

test('activityLineFor reports the failure reason and never hides it', () => {
  const failed = activityLineFor({ state: 'failed', reason: 'transient', detail: '429: usage limit reached' }, COPY)
  assert.equal(failed.text, '异步压缩失败')
  assert.equal(failed.meta, '429: usage limit reached')
  assert.equal(failed.tooltip, '原因：429: usage limit reached')

  // A drop without detail still names its reason class.
  assert.equal(activityLineFor({ state: 'failed', reason: 'no-range' }, COPY).meta, 'no-range')
  // A drop with neither falls back to the localized placeholder.
  assert.equal(activityLineFor({ state: 'failed' }, COPY).meta, '未知原因')
})
