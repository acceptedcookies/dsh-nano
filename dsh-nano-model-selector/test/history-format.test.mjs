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
  HISTORY_KINDS, UNKNOWN_KIND, agoText, axisLabels, diagnosisOf, episodeView, foldSummary, groupEpisodes, pct, recordHeadline,
  relativeTimeOf, resolveFill, resolvePhase, statusBadgeFor, tok, zonesOf,
} from '../src/client/history-format.js'
import { COPY as I18N } from '../src/client/i18n.js'
import { COMPACT_PRESETS, PRESET_EXTRA_REQUIREMENTS, presetActive, presetChanges } from '../src/client/compact-presets.js'
import { validateMasterOrder } from '../lib/compact-policy.js'

const ZH = I18N.zh

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

test('recordHeadline explains each decision in plain words with its own number', () => {
  assert.equal(
    recordHeadline({ kind: 'arm', fill: 0.71, bufferSizeAsync: 0.7, retain: 39300 }, ZH),
    '填充 71.0% 越过触发线 70.0%，开始异步压缩（计划保留最近 39.3K）',
  )
  assert.equal(recordHeadline({ kind: 'claim', target: { provider: 'p', model: 'm' } }, ZH), '摘要模型开始改写：p/m')
  assert.equal(recordHeadline({ kind: 'claim', target: null }, ZH), '摘要模型开始改写：跟随会话模型')
  assert.equal(
    recordHeadline({ kind: 'select', lane: 'async', boundary: 'turn', retainedTokens: 39000 }, ZH),
    '选定切点：按整轮切，保留最近 39K 原文',
  )
  assert.equal(
    recordHeadline({ kind: 'select', lane: 'full', trigger: 'safety', fill: 0.91, boundary: 'node', retainedTokens: 20000 }, ZH),
    '越过强制线：填充 91.0%，按单条消息切，保留最近 20K 原文',
  )
  assert.equal(recordHeadline({ kind: 'commit', records: 5, tokens: 862 }, ZH), '上下文已替换：5 条旧记录（约 862）换成摘要')
  // A known reason reads as words; an unknown one falls back to the detail.
  assert.equal(recordHeadline({ kind: 'drop', reason: 'no-range' }, ZH), '未生效：没有可压缩的旧内容（最近的内容都在保留区里）')
  assert.equal(recordHeadline({ kind: 'drop', reason: 'future', detail: 'policy unreadable' }, ZH), '未生效：policy unreadable')
  assert.equal(recordHeadline({ kind: 'skip', reason: 'circuit-open' }, ZH), '连续临时失败，自动压缩已暂停')
  assert.equal(
    recordHeadline({ kind: 'health', fill: 0.52, healthTargetAsync: 0.45, overHealth: true }, ZH),
    '压缩后第一次请求：填充 52.0%，仍高于回落线 45.0%；下次到触发线改为同步压缩',
  )
})

test('recordHeadline never prints undefined for a partial record', () => {
  assert.equal(recordHeadline({ kind: 'arm' }, ZH), '填充 — 越过触发线 —，开始异步压缩（计划保留最近 —）')
  assert.equal(recordHeadline({ kind: 'commit' }, ZH), '上下文已替换：— 条旧记录（约 —）换成摘要')
  assert.equal(recordHeadline({ kind: 'future-kind' }, ZH), '—')
  assert.equal(recordHeadline(undefined, ZH), '—')
  for (const kind of ['arm', 'claim', 'select', 'commit', 'drop', 'skip', 'health']) {
    assert.equal(/undefined|NaN/.test(recordHeadline({ kind }, ZH)), false, kind)
    assert.equal(/undefined|NaN/.test(recordHeadline({ kind }, I18N.en)), false, kind)
  }
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

/* ---------------- episode view ---------------- */

const at = minutes => new Date(Date.UTC(2026, 10, 19, 10, minutes)).toISOString()
const NOW = Date.parse(at(30))

test('groupEpisodes folds one async compaction with its post-check into one card', () => {
  const groups = groupEpisodes([
    { at: at(0), kind: 'arm', fill: 0.71 },
    { at: at(0), kind: 'claim' },
    { at: at(1), kind: 'select', lane: 'async', boundary: 'turn', retainedTokens: 39000 },
    { at: at(2), kind: 'commit', compactionId: 'c1', records: 300, tokens: 90000 },
    { at: at(3), kind: 'health', compactionId: 'c1', fill: 0.4, healthTargetAsync: 0.45, overHealth: false },
  ], NOW)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].type, 'async')
  assert.equal(groups[0].status, 'committed')
  assert.equal(groups[0].records.length, 5)
  const view = episodeView(groups[0], ZH)
  assert.equal(view.title, '异步压缩')
  assert.equal(view.status, '成功')
  assert.equal(view.tone, 'success')
  assert.equal(view.summary, '触发时填充 71.0% · 保留最近 39K 原文 · 300 条旧记录换成摘要 · 压缩后 40.0%，低于回落线 45.0%')
})

test('groupEpisodes separates failures, settlements, sync lanes and skip runs', () => {
  const groups = groupEpisodes([
    { at: at(0), kind: 'arm', fill: 0.7 },
    { at: at(1), kind: 'drop', reason: 'transient' },
    { at: at(2), kind: 'arm', fill: 0.7 },
    { at: at(3), kind: 'drop', reason: 'preempted' },
    { at: at(3), kind: 'select', lane: 'full', trigger: 'safety', fill: 0.92, retainedTokens: 20000 },
    { at: at(3), kind: 'select', lane: 'full', trigger: 'safety', fill: 0.88, retainedTokens: 18000 },
    { at: at(4), kind: 'skip', reason: 'turn-blocked' },
    { at: at(5), kind: 'skip', reason: 'turn-blocked' },
    { at: at(6), kind: 'skip', reason: 'lock-held' },
  ], NOW)
  assert.deepEqual(groups.map(g => `${g.type}:${g.status}:${g.records.length}`), [
    'async:dropped:2', 'async:settled:2', 'sync:started:2', 'skip:skipped:2', 'skip:skipped:1',
  ])
  const sync = episodeView(groups[2], ZH)
  assert.equal(sync.title, '同步压缩 · 越过强制线')
  assert.match(sync.summary, /开始时填充 92\.0%/)
  assert.match(sync.summary, /共 2 轮/)
  assert.equal(episodeView(groups[1], ZH).status, '已撤销')
  assert.equal(episodeView(groups[1], ZH).tone, 'neutral')
})

test('groupEpisodes marks an async episode without outcome as interrupted, not running', () => {
  // An arm superseded by a new arm, and a claim older than the attempt budget.
  const groups = groupEpisodes([
    { at: at(0), kind: 'arm' },
    { at: at(1), kind: 'arm' },
    { at: at(2), kind: 'claim' },
  ], NOW)
  assert.deepEqual(groups.map(g => g.status), ['stale', 'stale'])
  // A fresh claim is still running.
  assert.equal(groupEpisodes([{ at: at(29), kind: 'claim' }], NOW)[0].status, 'running')
})

test('diagnosisOf answers in words: fill against the lines, then the latest outcome', () => {
  const policy = { bufferSizeAsync: 0.7, healthTargetAsync: 0.45, bufferSizeSafety: 0.9 }
  const ago = () => '5 分钟前'
  const committed = groupEpisodes([
    { at: at(0), kind: 'arm' },
    { at: at(2), kind: 'commit', compactionId: 'c1', records: 300, tokens: 90000 },
    { at: at(3), kind: 'health', compactionId: 'c1', fill: 0.52, healthTargetAsync: 0.45, overHealth: true },
  ], NOW)
  const verdict = diagnosisOf({ fill: 0.5, policy, groups: committed, copy: ZH, ago })
  assert.equal(verdict.tone, 'warning')
  assert.deepEqual(verdict.lines, [
    '当前填充 50.0%，低于触发线 70.0%，暂时不需要压缩。',
    '最近一次异步压缩（5 分钟前）成功：300 条旧记录换成了摘要。',
    '但压缩后填充仍有 52.0%，高于回落线 45.0%；下次到触发线会直接同步压缩。',
  ])

  const failed = groupEpisodes([{ at: at(0), kind: 'arm' }, { at: at(1), kind: 'drop', reason: 'timeout' }], NOW)
  const bad = diagnosisOf({ fill: 0.75, policy, groups: failed, copy: ZH, ago })
  assert.equal(bad.tone, 'danger')
  assert.match(bad.lines[0], /已越过触发线 70\.0%/)
  assert.match(bad.lines[1], /没有生效：摘要超过 120 秒未完成/)

  assert.deepEqual(diagnosisOf({ fill: null, policy, groups: [], copy: ZH, ago }).lines, ['这个会话还没有触发过压缩。'])
  assert.equal(diagnosisOf({ fill: 0.95, policy, groups: [], copy: ZH, ago }).tone, 'danger')
})

test('zonesOf splits the track at H/B/S and flags the zone holding the fill', () => {
  const zones = zonesOf(0.45, 0.7, 0.9, 0.72)
  assert.deepEqual(zones.map(z => z.key), ['health', 'buffer', 'async', 'force'])
  assert.deepEqual(zones.map(z => z.range), ['0–45%', '45–70%', '70–90%', '90–100%'])
  assert.deepEqual(zones.map(z => z.current), [false, false, true, false])
  assert.equal(zonesOf(0.45, 0.7, 0.9, 1).at(-1).current, true)
  assert.deepEqual(zonesOf(0.45, 0.7, 0.9, null).map(z => z.current), [false, false, false, false])
})

test('tok shortens token counts without trailing zeros', () => {
  assert.equal(tok(140000), '140K')
  assert.equal(tok(39321), '39.3K')
  assert.equal(tok(262144), '262.1K')
  assert.equal(tok(1048576), '1.05M')
  assert.equal(tok(900), '900')
  assert.equal(tok(null), '—')
})

/* ---------------- presets ---------------- */

test('both presets pass the host master order on the windows they target', () => {
  const [small, large] = COMPACT_PRESETS
  const base = { bufferSizeSafety: 0.9 }
  for (const W of [131072, 262144]) {
    const order = validateMasterOrder({ ...base, ...small.patch }, W)
    assert.equal(order.ok, true, `small @ ${W}`)
    assert.equal(order.fullOnly, false, `small @ ${W} must keep the async lane`)
  }
  for (const W of [524288, 1048576]) {
    const order = validateMasterOrder({ ...base, ...large.patch }, W)
    assert.equal(order.ok, true, `large @ ${W}`)
    assert.equal(order.fullOnly, false, `large @ ${W} must keep the async lane`)
  }
  assert.deepEqual({ ...small.patch, extraRequirements: undefined }, {
    bufferSizeAsync: 0.7, healthTargetAsync: 0.45, pinnedAsyncTokens: 140000, pinnedFullTokens: 20000, extraRequirements: undefined,
  })
  assert.equal(large.patch.bufferSizeAsync, 0.6)
  assert.equal(large.patch.healthTargetAsync, 0.3)
  assert.equal(small.patch.extraRequirements, PRESET_EXTRA_REQUIREMENTS)
})

test('presetChanges lists only differing fields; presetActive needs all of them', () => {
  const [small] = COMPACT_PRESETS
  const policy = {
    bufferSizeAsync: 0.65, healthTargetAsync: 0.5, pinnedAsyncTokens: 100000, pinnedFullTokens: 20000, extraRequirements: '',
  }
  assert.deepEqual(presetChanges(policy, small).map(row => row.field),
    ['bufferSizeAsync', 'healthTargetAsync', 'pinnedAsyncTokens', 'extraRequirements'])
  assert.equal(presetActive(policy, small), false)
  const applied = { ...policy, ...small.patch, extraRequirements: `  ${PRESET_EXTRA_REQUIREMENTS}\n` }
  assert.deepEqual(presetChanges(applied, small), [])
  assert.equal(presetActive(applied, small), true)
  assert.equal(presetActive(null, small), false)
})
