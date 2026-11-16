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
 * Design rules honoured here:
 *  - chrome comes from nano-ui's NanoDialog, never a bespoke modal;
 *  - every control and glyph is an official shell primitive (`SegmentedTabs`,
 *    `Tag`, `StateDot`, `Tooltip`, `Button`, `relativeTime`, `writeClipboard`);
 *  - every color/space/radius reads a `--dsw-*` token, so the card follows the
 *    active theme in both light and dark;
 *  - the water-line gauge is the diagnostic core: it shows fill against H/B/S
 *    so "why did nothing happen" is answerable without reading logs.
 */
import * as React from 'react'
import {
  Button,
  SegmentedControl,
  Tag,
  Tooltip,
  relativeTime,
  writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoDialog } from 'dsh-nano-ui'
import { fetchBundleState, fetchCompactHistory } from './compact.js'
import { HISTORY_KINDS, UNKNOWN_KIND, agoText, recordHeadline, resolveFill } from './history-format.js'
import { HistoryIcon } from './icons.jsx'
import { WaterLine } from './WaterLine.jsx'

/** Refresh cadence while an episode is armed or running. The ledger is
 *  append-only, so an idle dialog never needs this tick. */
const LIVE_REFRESH_MS = 3_000

/**
 * One ledger record. Collapsed shows the decision and its headline number;
 * expanded shows the raw payload — the debug surface, verbatim.
 * @param {{record: object, now: number, copy: object}} props
 */
function RecordRow({ record, now, copy }) {
  const [open, setOpen] = React.useState(false)
  const kind = HISTORY_KINDS[record.kind] ?? UNKNOWN_KIND
  const label = copy.historyKind[record.kind] ?? record.kind

  const headline = recordHeadline(record, copy)

  return React.createElement('div', { className: 'nms-hist-row', 'data-kind': record.kind },
    React.createElement('button', {
      type: 'button',
      className: 'nms-hist-row-head',
      'aria-expanded': open,
      onClick: () => setOpen(value => !value),
    },
    React.createElement('span', { className: 'nms-hist-row-mark', 'data-kind': record.kind, 'aria-hidden': 'true' }),
    React.createElement(Tag, { tone: kind.tone }, label),
    React.createElement('span', { className: 'nms-hist-row-headline', title: headline }, headline),
    React.createElement('span', { className: 'nms-hist-row-time' },
      typeof record.at === 'string' ? agoText(Date.parse(record.at), now, copy, relativeTime) : '—')),
    open ? React.createElement('pre', { className: 'nms-hist-raw' }, JSON.stringify(record, null, 2)) : null)
}

/**
 * The dialog itself. Reads once on open; the ledger is append-only telemetry,
 * so a manual refresh is the honest interaction (no polling that would imply
 * live progress the engine does not publish).
 */
export function AsyncHistoryDialog({ copy, sessionId, regionElement, onClose }) {
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

  React.useEffect(() => { load() }, [load])
  React.useEffect(() => {
    let live = true
    fetchBundleState().then(value => { if (live && value !== null) setBundle(value) }).catch(() => {})
    return () => { live = false }
  }, [])

  // The ledger is append-only, but an episode in flight is exactly when the
  // view must not be stale: a dialog opened at arm time would otherwise keep
  // showing "触发 1 / 执行 0" after the commit already happened, which reads as
  // "stuck". Refresh while armed/running, stop as soon as it settles.
  const phaseState = state.data?.history?.phase?.state ?? 'idle'
  const live = phaseState === 'armed' || phaseState === 'running'
  React.useEffect(() => {
    if (state.status !== 'ready' || !live) return undefined
    const timer = setTimeout(load, LIVE_REFRESH_MS)
    return () => clearTimeout(timer)
  }, [state.status, live, state.data, load])

  // Contain the whole overlay (mask included) inside the chat pane. NanoDialog
  // portals the card to <body>, so the only lever is the overlay's own box; the
  // `:has()` rule in the stylesheet reads these variables.
  React.useEffect(() => {
    const root = document.body
    const apply = () => {
      const rect = regionElement?.getBoundingClientRect?.()
      if (rect === undefined || rect === null || rect.width === 0) return
      root.style.setProperty('--nms-region-top', `${Math.round(rect.top)}px`)
      root.style.setProperty('--nms-region-left', `${Math.round(rect.left)}px`)
      root.style.setProperty('--nms-region-right', `${Math.round(globalThis.innerWidth - rect.right)}px`)
      root.style.setProperty('--nms-region-bottom', `${Math.round(globalThis.innerHeight - rect.bottom)}px`)
    }
    apply()
    globalThis.addEventListener('resize', apply)
    return () => {
      globalThis.removeEventListener('resize', apply)
      for (const key of ['--nms-region-top', '--nms-region-left', '--nms-region-right', '--nms-region-bottom']) {
        root.style.removeProperty(key)
      }
    }
  }, [regionElement])

  const history = state.data?.history ?? null
  const policy = state.data?.policy ?? null
  const effective = policy?.effective ?? null
  const runtime = policy?.runtime ?? null
  const records = Array.isArray(history?.records) ? history.records : []
  const summary = history?.summary ?? null
  const fill = resolveFill(runtime?.fill, records)

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
    },
    effective,
    runtime,
    historyDegraded: history?.degraded ?? null,
    summary,
  }, null, 2), [sessionId, bundle, policy, effective, runtime, history, summary])

  const copyDiagnostics = React.useCallback(() => {
    writeClipboard(diagnostics)
    setCopied(true)
  }, [diagnostics])

  React.useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [copied])

  const stats = [
    { key: 'arm', label: copy.historyKind.arm, value: summary?.arm ?? 0 },
    { key: 'claim', label: copy.historyKind.claim, value: summary?.claim ?? 0 },
    { key: 'commit', label: copy.historyKind.commit, value: summary?.commit ?? 0 },
    { key: 'drop', label: copy.historyKind.drop, value: summary?.drop ?? 0 },
  ]

  const timeline = state.status === 'loading'
    ? React.createElement('p', { className: 'nms-hist-empty' }, copy.historyLoading)
    : state.status === 'error'
      ? React.createElement('p', { className: 'nms-hist-empty', role: 'alert' }, copy.historyLoadFailed)
      : records.length === 0
        ? React.createElement('p', { className: 'nms-hist-empty' },
          history?.degraded === 'history-read-failed' ? copy.historyUnreadable : copy.historyEmpty)
        : React.createElement('div', { className: 'nms-hist-rows' },
          [...records].reverse().map((record, index) =>
            React.createElement(RecordRow, { key: `${record.at}-${index}`, record, now, copy })))

  const diagnosticsTab = React.createElement('div', { className: 'nms-hist-diag' },
    React.createElement('pre', { className: 'nms-hist-raw' }, diagnostics))

  return React.createElement(NanoDialog, {
    copy,
    title: copy.historyTitle,
    description: copy.historySubtitle.replace('{session}', sessionId.slice(0, 18)),
    width: 620,
    className: 'nms-hist-dialog',
    footer: React.createElement(React.Fragment, null,
      React.createElement(Button, {
        variant: 'outline',
        className: 'nano-modal-action',
        onClick: copyDiagnostics,
      }, copied ? copy.historyCopied : copy.historyCopy),
      React.createElement(Button, {
        variant: 'outline',
        className: 'nano-modal-action',
        onClick: load,
      }, copy.historyRefresh),
      React.createElement(Button, {
        variant: 'primary',
        className: 'nano-modal-action',
        onClick: onClose,
      }, copy.close)),
    onConfirm: onClose,
    onCancel: onClose,
  },
  React.createElement('div', { className: 'nms-hist' },
    React.createElement(WaterLine, {
      fill: fill.value,
      fillFromDecision: fill.fromDecision,
      health: policy?.healthTargetAsync ?? 0.5,
      buffer: policy?.bufferSizeAsync ?? 0.65,
      safety: policy?.bufferSizeSafety ?? 0.9,
      copy,
      live,
    }),
    React.createElement('div', { className: 'nms-hist-stats' },
      stats.map(stat => React.createElement('div', { key: stat.key, className: 'nms-hist-stat', 'data-kind': stat.key },
        React.createElement('span', { className: 'nms-hist-stat-value' }, String(stat.value)),
        React.createElement('span', { className: 'nms-hist-stat-label' }, stat.label)))),
    // SegmentedControl is the shell's own segmented switch (sliding indicator).
    // SegmentedTabs renders a Pill per tab, which reads as a custom bordered
    // control rather than a native one.
    React.createElement(SegmentedControl, {
      id: `nms-history-${sessionId}`,
      value: tab,
      options: [
        { value: 'timeline', label: copy.historyTabTimeline },
        { value: 'diagnostics', label: copy.historyTabDiagnostics },
      ],
      onChange: setTab,
      label: copy.historyTitle,
    }),
    React.createElement('div', { className: 'nms-hist-panel' }, tab === 'timeline' ? timeline : diagnosticsTab)))
}

/** The session-header menu entry: one glyph, one label, one dialog. */
export const historyMenuIcon = HistoryIcon
