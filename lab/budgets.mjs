/**
 * Budget evaluation (spec §7 + A5 additions in performance-alpha.md §10.7).
 * Pure: takes a report + baseline, returns pass/fail with named culprits.
 * A failure always names pluginId + span/track/metric so the Markdown can
 * print it (spec §7 "报告必须点名 plugin id 与 span/track 名").
 */

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const fail = (failures, pluginId, metric, value, limit, reason) => {
  failures.push({ pluginId, metric, value, limit, reason })
}
const note = (notes, text) => notes.push(text)

const track = (report, pluginId, name) =>
  report?.plugins?.[pluginId]?.tracks?.[name] ?? null
const spans = (report, pluginId) => report?.plugins?.[pluginId]?.spans ?? {}
const hostSpans = (report, pluginId) => report?.plugins?.[pluginId]?.hostSpan ?? {}
const baselineReport = (baseline, scenario) => baseline?.reports?.[scenario] ?? null

// A baseline p95 of 0 (a sub-millisecond span) would make `limit = 0` and
// fail on 0.1 ms of noise. Use a small absolute floor alongside the ×1.5 rule.
const SPAN_P95_FLOOR_MS = 2
const HOST_P95_FLOOR_MS = 50
/** L0: page-level main-thread health red lines (ms). Plugin-level budgets
 *  remain native.spanMsP95 / native.trackMsP95 (§12, owner option A). */
const INPUT_DELAY_P95_LIMIT_MS = 50
const PROCESSING_P95_LIMIT_MS = 50
/** native.trackMsP95 is a small, high-variance metric (sidebar-graft callbackMs
 *  swings 0.7–24.6 ms). A single-run baseline × 1.5 produces false positives.
 *  Align the absolute floor with spec §7's existing native.spanMsP95 ≤ 50 ms
 *  red line; a real regression (e.g. 12 → 100 ms) still fails. */
const TRACK_MS_P95_FLOOR_MS = 50

/** All plugin ids present in a report. */
const pluginIds = report => Object.keys(report?.plugins ?? {})

/**
 * @param {object} report - schema-v1 report (possibly null for purity arm)
 * @param {object|null} baseline - {meta, reports}
 * @param {object} opts - {scenario, arm, purity, firstRun}
 * @returns {{pass:boolean, failures:Array, notes:Array, checks:number}}
 */
export function evaluate(report, baseline, opts = {}) {
  const failures = []
  const notes = []
  let checks = 0
  const scenario = opts.scenario ?? report?.meta?.scenario ?? 'unknown'
  const base = baselineReport(baseline, scenario)
  const check = (fn) => { checks += 1; fn() }
  // AUDIT, not a gate. §12.1 / three consecutive stability runs show that
  // "single-run baseline × multiplier" on high-variance readings (DOM-write
  // callback counts, host wall-clock I/O 3–23 s, span p95 that includes I/O
  // wait) produces false regressions on ~1/3 of runs. Those readings stay in
  // the report and in the D1 candidate table, but cannot veto the verdict.
  // Hard gates stay on low-variance / structural / attributable metrics.
  const audit = (pluginId, metric, value, limit, reason) => {
    note(notes, `[audit 不产生 exit 1] ${pluginId} ${metric}=${value}（参考上限 ${limit}）— ${reason}`)
  }

  // ---- structural integrity: measurement broken → fix before plugin budgets ----
  if (report) {
    check(() => {
      for (const [key, value] of Object.entries(report.structure ?? {})) {
        if (value !== 0) {
          fail(failures, 'measurement', `structure.${key}`, value, 0, 'measurement itself is broken')
        }
      }
    })
  }
  // First --arm on run only writes the baseline (spec §7): no regressions are
  // judged. Structural integrity is still checked — a broken instrument must
  // never become a baseline.
  if (opts.firstRun) {
    note(notes, 'first --arm on run: baseline written, budgets NOT judged (spec §7).')
    return { pass: failures.length === 0, failures, notes, checks }
  }

  // ---- purity arm: the observer alone must not produce long frames ----
  if (opts.arm === 'purity') {
    const p = opts.purity ?? {}
    if (p.error) {
      fail(failures, 'measurement', 'purity.error', String(p.error), 'none', 'standalone library did not load')
    } else {
      check(() => {
        if (p.loafCount !== 0) fail(failures, 'measurement', 'purity.loafCount', p.loafCount, 0, 'observer produced long frames')
      })
      check(() => {
        if (p.observerErrors !== 0) fail(failures, 'measurement', 'purity.observerErrors', p.observerErrors, 0, 'observer threw')
      })
      check(() => {
        if (p.observersMissing !== 0) fail(failures, 'measurement', 'purity.observersMissing', p.observersMissing, 0, 'partial observer install')
      })
    }
    return { pass: failures.length === 0, failures, notes, checks }
  }

  if (!report) {
    fail(failures, 'measurement', 'report', null, 'object', 'no report produced')
    return { pass: false, failures, notes, checks }
  }

  // Disabled (collection off) arm: only assert identity-path zero cost.
  if (report.enabled === false) {
    check(() => {
      const rows = pluginIds(report)
      for (const id of rows) {
        const p = report.plugins[id]
        if (Object.keys(p.tracks ?? {}).length || Object.keys(p.spans ?? {}).length || Object.keys(p.usage ?? {}).length) {
          fail(failures, id, 'disabled.rows', 'non-empty', '{}', 'disabled arm must produce no measurement rows')
        }
      }
      if (report.page.nanoCombined.scriptMs !== 0 || report.page.loafCount !== 0) {
        fail(failures, 'measurement', 'disabled.nanoMeasures', 'non-zero', 0, 'disabled arm must not collect nano measures')
      }
    })
    return { pass: failures.length === 0, failures, notes, checks }
  }

  const ids = pluginIds(report)
  const baselineIds = new Set(Object.keys(base?.plugins ?? {}))

  // ---- page-level ----
  check(() => {
    const bytes = num(report.page?.nanoCombined?.clientJsBytes)
    const baseBytes = num(base?.page?.nanoCombined?.clientJsBytes)
    if (bytes !== null && baseBytes !== null && bytes > baseBytes * 1.1) {
      fail(failures, 'page', 'nanoCombined.clientJsBytes', bytes, Math.round(baseBytes * 1.1), 'client JS growth > 10%')
    } else if (bytes !== null && baseBytes === null) {
      note(notes, `nanoCombined.clientJsBytes=${bytes}: no baseline key, recorded only.`)
    }
  })

  if (scenario === 'composer-type') {
    check(() => {
      const v = num(report.page?.nativeInpP75)
      const n = report.page?.nativeInpCount ?? 0
      // L0 / owner option A: nativeInpP75 is a PAGE-LEVEL audit reading, not a
      // plugin budget. spec §5.1 forbids copying page INP into a plugin row,
      // and §12 shows the 800 ms is presentation delay on synthetic CDP input
      // (the no-plugin daily instance is slower still). It is recorded and
      // surfaced in Markdown, but no longer vetoes the whole verdict by itself.
      const present = pluginIds(report).filter(id => {
        const s = report.plugins[id]?.native?.samples
        return (s?.spans ?? 0) + (s?.callbacks ?? 0) > 0
      })
      const baseV = num(base?.page?.nativeInpP75)
      const audit = [
        `nativeInpP75=${v} ms (n=${n})`,
        v !== null && v > 200 ? 'OVER 200 ms web-vitals reference' : 'within 200 ms reference',
        baseV !== null ? `baseline=${baseV} ms, delta=${v !== null ? Math.round(v - baseV) : 'n/a'} ms` : 'no baseline',
        `窗口内出现过的插件: ${present.join(', ') || '无'}`,
      ].join('; ')
      note(notes, `页级 audit（不产生 exit 1）：${audit}。CDP 合成按键抬高 presentation 段，非插件判定。`)
    })
    // L0: two NEW attributable hard red lines. These are the parts of
    // EventTiming.duration that a plugin CAN influence (main-thread busy and
    // event handlers). Presentation delay is deliberately excluded.
    for (const [metric, limit] of [
      ['inputDelayP95', INPUT_DELAY_P95_LIMIT_MS],
      ['processingP95', PROCESSING_P95_LIMIT_MS],
    ]) {
      check(() => {
        const v = num(report.page?.[metric])
        const n = report.page?.nativeInpCount ?? 0
        if (n < 8) {
          note(notes, `${metric}: nativeInpCount=${n} < 8，样本不足不判。`)
        } else if (v !== null && v > limit) {
          const present = pluginIds(report).filter(id => {
            const s = report.plugins[id]?.native?.samples
            return (s?.spans ?? 0) + (s?.callbacks ?? 0) > 0
          })
          fail(failures, 'page', metric, v, limit,
            `主线程/事件处理超时；窗口内出现过的插件: ${present.join(', ') || '无'}（需 tracing 进一步归因）`)
        }
      })
    }
    // Plugin-level PRIMARY budgets (already existed; now the main verdict).
    for (const id of ids) {
      check(() => {
        const v = num(report.plugins[id]?.native?.spanMsP95)
        const samples = report.plugins[id]?.native?.samples?.spans ?? 0
        if (samples >= 8 && v !== null && v > 50) {
          fail(failures, id, 'native.spanMsP95', v, 50, 'plugin span ms inside typing windows')
        } else if (samples < 8) {
          note(notes, `${id}: native.samples.spans=${samples} < 8, spanMsP95 not judged.`)
        }
      })
      check(() => {
        const v = num(report.plugins[id]?.native?.trackMsP95)
        const baseV = num(base?.plugins?.[id]?.native?.trackMsP95)
        // A tiny single-run baseline (e.g. 12 ms) times 1.5 gives 18 ms, and a
        // 1 ms wobble in sidebar-graft callbackMs produces a false regression.
        // Floor at 50 ms — the SAME absolute red line spec §7 already uses for
        // native.spanMsP95 — and let the median-of-repeats baseline absorb the
        // variance instead of chasing it by raising thresholds (§12.1).
        const limit = baseV === null ? null : Math.max(baseV * 1.5, TRACK_MS_P95_FLOOR_MS)
        if (v !== null && limit !== null && v > limit) {
          fail(failures, id, 'native.trackMsP95', v, Math.round(limit), 'track callback cost regression')
        }
      })
    }
  }

  // ---- idle red lines ----
  if (scenario === 'idle-10s') {
    for (const id of ids) {
      check(() => {
        const t = track(report, id, 'card-follow')
        if (t && (t.callbacks !== 0 || t.live !== 0)) {
          fail(failures, id, 'track.card-follow', `${t.callbacks}/${t.live}`, '0/0', 'rAF loop leak red line')
        }
      })
      check(() => {
        const t = track(report, id, 'hold')
        if (t && (t.callbacks !== 0 || t.live !== 0)) {
          fail(failures, id, 'track.hold', `${t.callbacks}/${t.live}`, '0/0', 'unclaimed hold interval must not exist')
        }
      })
      check(() => {
        const t = track(report, id, 'git-poll')
        if (t) {
          if (t.live < 1) fail(failures, id, 'track.git-poll.live', t.live, '>=1', 'poller must be mounted')
          const baseCb = num(base?.plugins?.[id]?.tracks?.['git-poll']?.callbacks)
          const limit = baseCb === null ? 1 : Math.max(1, Math.ceil(baseCb * 2))
          if (t.callbacks > limit) {
            audit(id, 'track.git-poll.callbacks', t.callbacks, limit, 'poller tick count is DOM/IO dependent; recorded only')
          }
        }
      })
      // A5: the cost the alpha report measured but had no rule for.
      check(() => {
        const t = track(report, id, 'card-wake')
        if (t) {
          const baseCb = num(base?.plugins?.[id]?.tracks?.['card-wake']?.callbacks)
          const limit = baseCb === null ? 40 : Math.ceil(baseCb * 2)
          if (t.callbacks > limit) {
            fail(failures, id, 'track.card-wake.callbacks', t.callbacks, limit, 'standing document.body observer firing on native DOM writes')
          }
          if (t.live > 4) fail(failures, id, 'track.card-wake.live', t.live, '<=4', 'standing observers exceed mounted panes')
        }
      })
      for (const name of ['sidebar-graft', 'sidebar-dedupe', 'ctia-watch']) {
        check(() => {
          const t = track(report, id, name)
          if (!t) return
          const baseCb = num(base?.plugins?.[id]?.tracks?.[name]?.callbacks)
          const limit = baseCb === null ? null : Math.ceil(baseCb * 2)
          if (limit !== null && t.callbacks > limit) {
            audit(id, `track.${name}.callbacks`, t.callbacks, limit, 'body-wide observer count follows native DOM writes (high variance); D1 ranks it instead')
          } else if (limit === null) note(notes, `${id}.${name}: no baseline, recorded only.`)
        })
      }
    }
  }

  // ---- per-name span / hostSpan: AUDIT only (high-variance I/O readings) ----
  for (const id of ids) {
    for (const [name, row] of Object.entries(spans(report, id))) {
      check(() => {
        const v = num(row.p95)
        const baseV = num(base?.plugins?.[id]?.spans?.[name]?.p95)
        const limit = baseV === null ? null : Math.max(Math.round(baseV * 1.5), SPAN_P95_FLOOR_MS)
        if (v !== null && limit !== null && v > limit) {
          audit(id, `span.${name}.p95`, v, limit, 'async span includes network/host I/O wait; see D1 candidate table')
        } else if (baseV === null) note(notes, `${id}.span.${name}: no baseline key, recorded only.`)
      })
    }
    for (const [name, row] of Object.entries(hostSpans(report, id))) {
      check(() => {
        const v = num(row.p95)
        const baseV = num(base?.plugins?.[id]?.hostSpan?.[name]?.p95)
        const limit = baseV === null ? null : Math.max(Math.round(baseV * 1.5), HOST_P95_FLOOR_MS)
        if (v !== null && baseV !== null && baseV > 0 && v > limit) {
          audit(id, `hostSpan.${name}.p95`, v, limit, 'host wall-clock I/O (3–23 s observed) is environment dependent; see D1')
        } else if (baseV === null || baseV === 0) {
          note(notes, `${id}.hostSpan.${name}: baseline p95=${baseV}, recorded only (absolute ${v} ms).`)
        }
      })
    }
  }

  if (opts.firstRun) note(notes, 'first --arm on run: baseline written, budgets NOT judged (spec §7).')
  return { pass: failures.length === 0, failures, notes, checks }
}

/** Build the version fingerprint used for exit code 2. */
export function versionsFrom(report, cfg, pluginVersions) {
  return {
    chromeMajor: report?.meta?.chromeMajor ?? null,
    dshVersion: cfg.dshVersion ?? null,
    observerVersion: report?.meta?.observerVersion ?? null,
    plugins: pluginVersions,
  }
}

export function versionsMatch(a, b) {
  if (!a || !b) return false
  return a.chromeMajor === b.chromeMajor &&
    a.dshVersion === b.dshVersion &&
    a.observerVersion === b.observerVersion &&
    JSON.stringify(a.plugins ?? {}) === JSON.stringify(b.plugins ?? {})
}
