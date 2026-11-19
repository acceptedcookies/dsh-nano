/**
 * Async-compaction history: the diagnostic face of the DNMS01 takeover.
 *
 * The durable truth for one compaction is the session journal's
 * `compaction/start|summary|end` bracket. That bracket only exists once the
 * engine reached `prepareCompactionTransaction` — an episode dropped before it
 * (no compactable range, unreadable policy, held lock) leaves **no trace** and
 * used to fail silently. The companion bundle therefore also appends one JSON
 * line per decision to a per-session audit ledger; this dialog is the reader.
 *
 * Reading order, top to bottom: a plain-language verdict ("what is going on"),
 * the water line (where fill sits and what each zone does), then the ledger
 * folded into one card per compaction — the raw decisions stay one click away
 * inside each card.
 *
 * Design rules honoured here:
 *  - chrome comes from nano-ui's NanoDialog, never a bespoke modal;
 *  - every control is an official shell primitive (`SegmentedControl`, `Tag`,
 *    `Button`, `relativeTime`, `writeClipboard`);
 *  - it is a main-window dialog: the host Modal owns mask, placement and focus;
 *  - every color/space/radius reads a `--dsw-*` token, so the card follows the
 *    active theme in both light and dark.
 */
import * as React from 'react'
import {
  Button,
  SegmentedControl,
  Tag,
  relativeTime,
  writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoDialog } from 'dsh-nano-ui'
import { asyncCompactStore, fetchBundleState, fetchCompactHistory } from './compact.js'
import {
  HISTORY_KINDS, UNKNOWN_KIND, agoText, diagnosisOf, episodeView, fillTemplate, groupEpisodes, pct, recordHeadline, resolveFill, tok,
} from './history-format.js'
import { HistoryIcon } from './icons.jsx'
import { WaterLine } from './WaterLine.jsx'

const h = React.createElement

/**
 * One ledger record inside an episode card: the decision in words, and the
 * raw payload on click — the debug surface, verbatim.
 * @param {{record: object, now: number, copy: object, policy: object|null}} props
 */
function RecordRow({ record, now, copy, policy }) {
  const [open, setOpen] = React.useState(false)
  const kind = HISTORY_KINDS[record.kind] ?? UNKNOWN_KIND
  const label = copy.historyKind[record.kind] ?? record.kind
  const headline = recordHeadline(record, copy, policy)

  return h('div', { className: 'nms-hist-row', 'data-kind': record.kind },
    h('button', {
      type: 'button',
      className: 'nms-hist-row-head',
      'aria-expanded': open,
      title: copy.historyRaw,
      onClick: () => setOpen(value => !value),
    },
    h(Tag, { tone: kind.tone }, label),
    h('span', { className: 'nms-hist-row-headline', title: headline }, headline),
    h('span', { className: 'nms-hist-row-time' },
      typeof record.at === 'string' ? agoText(Date.parse(record.at), now, copy, relativeTime) : '—')),
    open ? h('pre', { className: 'nms-hist-raw' }, JSON.stringify(record, null, 2)) : null)
}

/**
 * One compaction (or one run of identical skips): title, outcome, one summary
 * line; the individual decisions unfold underneath.
 * @param {{group: object, now: number, copy: object, policy: object|null, initiallyOpen: boolean}} props
 */
function EpisodeCard({ group, now, copy, policy, initiallyOpen }) {
  const [open, setOpen] = React.useState(initiallyOpen)
  const view = episodeView(group, copy, policy)
  return h('div', { className: 'nms-hist-ep', 'data-type': group.type, 'data-status': group.status },
    h('button', {
      type: 'button',
      className: 'nms-hist-ep-head',
      'aria-expanded': open,
      onClick: () => setOpen(value => !value),
    },
    h('span', { className: 'nms-hist-row-mark', 'data-tone': view.tone, 'aria-hidden': 'true' }),
    h('span', { className: 'nms-hist-ep-title' }, view.title),
    h(Tag, { tone: view.tone }, view.status),
    group.type === 'skip' && view.count > 1 ? h('span', { className: 'nms-hist-ep-count' }, `×${view.count}`) : null,
    h('span', { className: 'nms-hist-row-time' },
      view.at === null ? '—' : agoText(Date.parse(view.at), now, copy, relativeTime))),
    view.summary.length > 0 ? h('div', { className: 'nms-hist-ep-summary', title: view.summary }, view.summary) : null,
    open ? h('div', { className: 'nms-hist-steps', 'aria-label': copy.historySteps },
      group.records.map((record, index) => h(RecordRow, { key: `${record.at}-${index}`, record, now, copy, policy }))) : null)
}

/**
 * The dialog itself. Reads once on open; the ledger is append-only telemetry,
 * so a manual refresh is the honest interaction (no polling that would imply
 * live progress the engine does not publish).
 */
export function AsyncHistoryDialog({ copy, sessionId, onClose }) {
  const [state, setState] = React.useState({ status: 'loading', data: null, error: null })
  // Diagnostics only: the bundle inventory is a separate, on-demand read
  // (see lib/bundle-inventory.js) and must never ride the ledger refresh.
  const [bundle, setBundle] = React.useState(null)
  const [tab, setTab] = React.useState('timeline')
  const [copied, setCopied] = React.useState(false)
  const now = Date.now()

  const load = React.useCallback(() => {
    setState({ status: 'loading', data: null, error: null })
    fetchCompactHistory(sessionId).then(
      data => setState({ status: 'ready', data, error: null }),
      error => setState({ status: 'error', data: null, error }),
    )
  }, [sessionId])

  // Refresh comes from the shared store (P5-02e): one fetch on open, plus the
  // store's own 3000 ms continuation while the session is running and an
  // episode is open. This component owns no timer of its own.
  React.useEffect(() => {
    const unsubscribe = asyncCompactStore.subscribe(sessionId, data => {
      setState({ status: 'ready', data, error: null })
    })
    return unsubscribe
  }, [sessionId])
  React.useEffect(() => {
    let live = true
    fetchBundleState().then(value => { if (live && value !== null) setBundle(value) }).catch(() => {})
    return () => { live = false }
  }, [])

  const phaseState = state.data?.history?.phase?.state ?? 'idle'
  const live = phaseState === 'armed' || phaseState === 'running'

  const history = state.data?.history ?? null
  const policy = state.data?.policy ?? null
  const effective = policy?.effective ?? null
  const runtime = policy?.runtime ?? null
  const records = Array.isArray(history?.records) ? history.records : []
  const fill = resolveFill(runtime?.fill, records)
  const groups = React.useMemo(() => groupEpisodes(records, now), [records])
  const health = policy?.healthTargetAsync ?? 0.5
  const buffer = policy?.bufferSizeAsync ?? 0.65
  const safety = policy?.bufferSizeSafety ?? 0.9
  const ago = at => agoText(at, now, copy, relativeTime)

  const verdict = state.status === 'ready'
    ? diagnosisOf({ fill: fill.value, policy, groups, copy, ago })
    : null

  const counts = { commit: 0, drop: 0, sync: 0, skip: 0 }
  for (const group of groups) {
    if (group.type === 'async' && group.status === 'committed') counts.commit += 1
    else if (group.type === 'async' && group.status === 'dropped') counts.drop += 1
    else if (group.type === 'sync') counts.sync += 1
    else if (group.type === 'skip') counts.skip += group.records.length
  }

  const diagnostics = React.useMemo(() => JSON.stringify({
    sessionId,
    bundle,
    policy: policy === null ? null : {
      model: policy.model,
      bufferSizeAsync: policy.bufferSizeAsync,
      healthTargetAsync: policy.healthTargetAsync,
      bufferSizeSafety: policy.bufferSizeSafety,
      pinnedAsyncTokens: policy.pinnedAsyncTokens,
      pinnedFullTokens: policy.pinnedFullTokens,
      extraRequirements: typeof policy.extraRequirements === 'string' && policy.extraRequirements.length > 0,
      promptVersion: policy.promptVersion ?? null,
    },
    effective,
    runtime,
    historyDegraded: history?.degraded ?? null,
    phase: history?.phase ?? null,
    summary: history?.summary ?? null,
    recentRecords: records.slice(-30),
  }, null, 2), [sessionId, bundle, policy, effective, runtime, history, records])

  const copyDiagnostics = React.useCallback(() => {
    writeClipboard(diagnostics)
    setCopied(true)
  }, [diagnostics])

  React.useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [copied])

  const timeline = state.status === 'loading'
    ? h('p', { className: 'nms-hist-empty' }, copy.historyLoading)
    : state.status === 'error'
      ? h('p', { className: 'nms-hist-empty', role: 'alert' }, copy.historyLoadFailed)
      : groups.length === 0
        ? h('p', { className: 'nms-hist-empty' },
          history?.degraded === 'history-read-failed' ? copy.historyUnreadable : copy.historyEmpty)
        : h('div', { className: 'nms-hist-eps' },
          [...groups].reverse().map((group, index) => h(EpisodeCard, {
            key: `${group.records[0]?.at}-${group.type}-${index}`,
            group,
            now,
            copy,
            policy,
            initiallyOpen: index === 0,
          })))

  const model = policy?.model?.provider ? `${policy.model.provider}/${policy.model.model}` : copy.historyModelRouted
  const facts = [
    [copy.historyFact.takeover, bundle === null ? '—' : bundle.enabled === true ? copy.historyFactOn : copy.historyFactOff],
    [copy.historyFact.lines, policy === null ? '—' : `H ${pct(health)} · B ${pct(buffer)} · S ${pct(safety)}`],
    [copy.historyFact.model, policy === null ? '—' : model],
    [copy.historyFact.window, tok(runtime?.window)],
    [copy.historyFact.pin, tok(effective?.pin)],
    [copy.historyFact.ledger, history?.degraded ?? fillTemplate(copy.historyFactLedger, { n: records.length })],
  ]
  const diagnosticsTab = h('div', { className: 'nms-hist-diag' },
    h('div', { className: 'nms-hist-facts', 'aria-label': copy.historyFacts },
      facts.map(([label, value]) => h('div', { key: label, className: 'nms-hist-fact' },
        h('span', { className: 'nms-hist-fact-label' }, label),
        h('span', { className: 'nms-hist-fact-value', title: value }, value)))),
    h('span', { className: 'nms-hist-raw-title' }, copy.historyRawTitle),
    h('pre', { className: 'nms-hist-raw' }, diagnostics))

  return h(NanoDialog, {
    copy,
    title: copy.historyTitle,
    description: copy.historySubtitle.replace('{session}', sessionId.slice(0, 18)),
    width: 720,
    // Timeline and diagnostics hold very different amounts of content; a
    // content-sized card jumped on every tab switch, so the body is fixed and scrolls.
    fixedHeight: 640,
    className: 'nms-hist-dialog',
    footer: h(React.Fragment, null,
      h(Button, { variant: 'outline', className: 'nano-modal-action', onClick: copyDiagnostics },
        copied ? copy.historyCopied : copy.historyCopy),
      h(Button, { variant: 'outline', className: 'nano-modal-action', onClick: load }, copy.historyRefresh),
      h(Button, { variant: 'primary', className: 'nano-modal-action', onClick: onClose }, copy.close)),
    onConfirm: onClose,
    onCancel: onClose,
  },
  h('div', { className: 'nms-hist' },
    verdict === null ? null : h('div', { className: 'nms-hist-verdict', 'data-tone': verdict.tone, role: 'status' },
      verdict.lines.map((line, index) => h('p', { key: index }, line))),
    h(WaterLine, {
      fill: fill.value,
      fillFromDecision: fill.fromDecision,
      health,
      buffer,
      safety,
      copy,
      live,
      windowTokens: fill.fromDecision ? null : runtime?.window ?? null,
    }),
    h('div', { className: 'nms-hist-bar' },
      // SegmentedControl is the shell's own segmented switch (sliding
      // indicator). SegmentedTabs renders a Pill per tab, which reads as a
      // custom bordered control rather than a native one.
      h(SegmentedControl, {
        id: `nms-history-${sessionId}`,
        value: tab,
        options: [
          { value: 'timeline', label: copy.historyTabTimeline },
          { value: 'diagnostics', label: copy.historyTabDiagnostics },
        ],
        onChange: setTab,
        label: copy.historyTitle,
      }),
      h('div', { className: 'nms-hist-stats', title: copy.historyStatNote },
        Object.entries(counts).map(([key, value]) => h('span', { key, className: 'nms-hist-stat', 'data-kind': key },
          h('span', { className: 'nms-hist-stat-label' }, copy.historyStat[key]),
          h('span', { className: 'nms-hist-stat-value' }, String(value)))))),
    // Keyed by tab so a switch starts at the top instead of inheriting the
    // other tab's scroll offset. data-tab lets CSS give the diagnostics pane
    // its own scroll region (the raw snapshot scrolls, the facts stay put).
    h('div', { key: tab, className: 'nms-hist-panel', 'data-tab': tab }, tab === 'timeline' ? timeline : diagnosticsTab)))
}

/** The session-header menu entry: one glyph, one label, one dialog. */
export const historyMenuIcon = HistoryIcon
