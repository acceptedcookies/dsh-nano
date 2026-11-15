/** Async-compaction takeover panel (-20): four states U1–U4 driven by the host's read-only projection. */

import * as React from 'react'
import { CheckIcon, CloseIcon, CompactionIcon, WarningIcon } from './icons.jsx'
import { fetchCompactState, postCompactSwitch, putCompactPolicy } from './compact.js'

const BUNDLE_NAME = 'dsh-nano-model-selector-compaction'
/** The summary model must cover the largest upstream window; the official
 * DeepSeek-Flash (1M context) is the floor. Magpie mirrors whose route key
 * carries both 'deepseek' and 'flash' are offered alongside. */
const FLASH_RE = /deepseek.*flash|flash.*deepseek/i

/** @param {Array<{provider:string, model:string}>} models catalog pairs */
function flashChoices(models) {
  const seen = new Set()
  const picks = []
  for (const item of models) {
    const id = `${item.provider}/${item.model}`
    if (seen.has(id)) continue
    if (item.provider === 'deepseek-official' && /flash/i.test(item.model)) { seen.add(id); picks.push(item); continue }
    if (item.provider === 'magpie' && FLASH_RE.test(item.model)) { seen.add(id); picks.push(item) }
  }
  return picks
}

/**
 * @param {{ copy: any, models: Array<{provider:string, model:string}>, onError: (text: string) => void }} props
 * `models` = catalog (provider, model) pairs for the summary-model dropdown.
 */
export function CompactPanel({ copy, models, onError }) {
  const [state, setState] = React.useState(null) // GET payload
  const [busy, setBusy] = React.useState(false)
  const [confirm, setConfirm] = React.useState(false)
  const [banner, setBanner] = React.useState(null) // {kind:'success'|'warn'|'fail', text, code?}
  const [heartbeat, setHeartbeat] = React.useState(null) // {at: Date, status: number}

  const reload = React.useCallback(() => {
    fetchCompactState()
      .then(value => { setState(value); setHeartbeat(value === null ? { at: new Date(), status: 'fail' } : { at: new Date(), status: 'ok' }) })
      .catch(() => setHeartbeat({ at: new Date(), status: 'fail' }))
  }, [])
  React.useEffect(reload, [reload])
  // Heartbeat poll: the meter/last-compaction numbers are host-side state; a
  // quiet 30s re-read keeps the panel honest without user action.
  React.useEffect(() => {
    const timer = window.setInterval(reload, 30000)
    return () => window.clearInterval(timer)
  }, [reload])
  // Auto-dismiss transient result notes; errors stay until dismissed.
  React.useEffect(() => {
    if (banner === null || banner.kind === 'fail') return
    const timer = window.setTimeout(() => setBanner(null), 6000)
    return () => window.clearTimeout(timer)
  }, [banner])

  if (state === null) {
    return <div className="nms-loading"><span className="nms-pending-dot" />{copy.loading}</div>
  }

  const bundle = state.bundle ?? { installed: false, enabled: false, known: false }

  // U1: bundle not installed.
  if (bundle.installed !== true) {
    return (
      <div className="nms-empty">
        <span className="nms-empty-icon"><CompactionIcon size={17} /></span>
        {copy.compactNotInstalled}
      </div>
    )
  }

  const enabled = bundle.enabled === true
  const policy = state.policy ?? {}
  const effective = policy.effective ?? {}
  const runtime = policy.runtime ?? {}
  const degraded = state.degraded === 'state-read-failed'
  const meterDown = runtime.degraded === 'meter-unavailable'

  const noteWithCode = (kind, text, code) => setBanner({ kind, text: code ? `${text}（${code}）` : text })

  const doSwitch = next => {
    if (busy) return
    setBusy(true)
    setConfirm(false)
    postCompactSwitch(next)
      .then(result => {
        const application = result.application ?? 'applied'
        noteWithCode(
          application === 'applied' ? 'success' : 'warn',
          application === 'applied'
            ? copy.compactSwitchApplied
            : application === 'restart-required'
              ? copy.compactSwitchRestart
              : application === 'overridden'
                ? copy.compactSwitchOverridden
                : application,
          application,
        )
        reload()
      })
      .catch(error => noteWithCode('fail', `${copy.compactSwitchFailed}: ${error.message}`, error.code))
      .finally(() => setBusy(false))
  }

  const saveField = (field, raw) => {
    const value = field === 'model' ? raw : Number(raw)
    if (field !== 'model' && !Number.isFinite(value)) {
      onError(`${copy.selectionError}: ${field} must be a number`)
      return
    }
    const patch = field === 'model' ? { model: value } : { [field]: value }
    setBusy(true)
    putCompactPolicy(patch)
      .then(() => { noteWithCode('success', `${copy.compactSwitchApplied} · ${field}`, 'applied'); reload() })
      .catch(error => noteWithCode('fail', error.message, error.code))
      .finally(() => setBusy(false))
  }

  const savedModel = `${policy.model?.provider ?? ''}/${policy.model?.model ?? ''}`
  const choices = flashChoices(models)
  // The dropdown never shows a bogus selection: when the stored pair is not a
  // flash-family route, it renders as "(select)" and the user picks a real one.
  const modelValue = choices.some(item => `${item.provider}/${item.model}` === savedModel) ? savedModel : '/'
  const fill = runtime.fill == null ? null : Math.max(0, Math.min(1, runtime.fill))

  return (
    <div className="nms-compact">
      <div className="nms-group">
        <CompactionIcon className="nms-group-star" size={12} />{copy.compactTitle}
      </div>

      {/* Result chip: absolutely anchored to the panel's top-right strip — it
          overlays instead of inserting, so the list never reflows. */}
      {banner !== null && (
        <div className="nms-compact-chip" data-kind={banner.kind} role="status">
          {banner.kind === 'success' ? <CheckIcon size={12} /> : <WarningIcon size={12} />}
          <span className="nms-compact-chip-copy">{banner.text}</span>
          <button type="button" className="nms-compact-note-x" aria-label={copy.close} onClick={() => setBanner(null)}>
            <CloseIcon size={11} />
          </button>
        </div>
      )}

      {/* Status card: state + toggle. */}
      <div className="nms-compact-card" data-enabled={enabled}>
        <div className="nms-compact-card-main">
          <span className="nms-model-name">{enabled ? copy.compactEnabled : copy.compactDisabled}</span>
          <span className="nms-model-desc">{copy.compactSubtitle}</span>
        </div>
        <button
          type="button"
          className="nms-switch"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? copy.compactEnabled : copy.compactDisabled}
          disabled={busy}
          onClick={() => setConfirm(true)}
        >
          <span className="nms-switch-thumb" />
        </button>
      </div>

      {/* Switch confirmation: inline note with real buttons. */}
      {confirm && (
        <div className="nms-compact-note" data-kind="warn">
          <WarningIcon size={13} />
          <span className="nms-compact-note-copy">{copy.compactSwitchConfirm}</span>
          <span className="nms-compact-note-actions">
            <button type="button" className="nms-effort-button" disabled={busy} onClick={() => doSwitch(!enabled)}>{copy.compactConfirmOk}</button>
            <button type="button" className="nms-effort-button" onClick={() => setConfirm(false)}>{copy.compactConfirmCancel}</button>
          </span>
        </div>
      )}

      {/* U4 degraded: read failure keeps only the safety line live. */}
      {degraded && (
        <div className="nms-compact-note" data-kind="fail">
          <WarningIcon size={13} />
          <span className="nms-compact-note-copy">{copy.compactDegraded}</span>
        </div>
      )}

      {/* U3: editable policy only when enabled. */}
      {enabled && state.policy !== null && (
        <div className="nms-compact-fields">
          <label className="nms-compact-field">
            <span className="nms-compact-field-label">{copy.compactFieldModel}</span>
            <select
              className="nms-compact-input"
              aria-label={copy.compactFieldModel}
              value={modelValue}
              disabled={busy}
              onChange={event => {
                const [provider, ...rest] = event.target.value.split('/')
                saveField('model', { provider, model: rest.join('/') })
              }}
            >
              <option value="/">{`（${copy.selectModel}）`}</option>
              {choices.map(item => (
                <option key={`${item.provider}/${item.model}`} value={`${item.provider}/${item.model}`}>{`${item.provider}/${item.model}`}</option>
              ))}
            </select>
          </label>

          <NumberField label={copy.compactFieldBuffer} field="bufferSizeAsync" value={policy.bufferSizeAsync} step="0.05" min="0" max="1" onSave={saveField} busy={busy} />
          <NumberField label={copy.compactFieldHealth} field="healthTargetAsync" value={policy.healthTargetAsync} step="0.05" min="0" max="1" onSave={saveField} busy={busy} />
          <NumberField label={copy.compactFieldPinned} field="pinnedAsyncTokens" value={policy.pinnedAsyncTokens} step="1000" min="0" onSave={saveField} busy={busy} />

          <div className="nms-compact-field">
            <span className="nms-compact-field-label">{copy.compactFieldSafety}</span>
            <span className="nms-compact-field-static">0.80</span>
          </div>
        </div>
      )}

      {/* Runtime readouts: fill meter + last compaction + heartbeat. */}
      {enabled && state.policy !== null && (
        <div className="nms-compact-runtime">
          <div className="nms-compact-meter-row">
            <span className="nms-compact-field-label">{copy.compactRuntimeFill}</span>
            {fill === null ? (
              <span className="nms-compact-field-static">{meterDown ? `${copy.compactMeterUnknown}（meter-unavailable）` : copy.compactMeterUnknown}</span>
            ) : (
              <>
                <span className="nms-compact-meter" role="meter" aria-valuenow={Math.round(fill * 100)} aria-valuemin="0" aria-valuemax="100">
                  <span className="nms-compact-meter-fill" data-level={fill >= 0.8 ? 'high' : fill >= 0.5 ? 'mid' : 'low'} style={{ width: `${(fill * 100).toFixed(1)}%` }} />
                </span>
                <span className="nms-compact-meter-num">{`${(fill * 100).toFixed(1)}%`}</span>
              </>
            )}
          </div>
          <div className="nms-compact-meta-row">
            <span className="nms-model-meta">{copy.compactLastCompaction}: {formatLast(runtime.lastCompaction)}</span>
          </div>
          <div className="nms-compact-meta-row">
            <span className="nms-model-meta">
              {copy.compactEffectivePin}={effective.pin ?? '—'} · {copy.compactWindowMin}={effective.windowMin ?? '—'}
            </span>
          </div>
          <div className="nms-compact-meta-row">
            <span className="nms-model-meta">
              {copy.compactHeartbeat}: {heartbeat === null ? '—' : `${heartbeat.at.toLocaleTimeString()} · GET ${heartbeat.status === 'ok' ? '200' : '✕'}`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/** @param {{ label: string, field: string, value: any, step: string, min: string, max?: string, onSave: (field:string, raw:string)=>void, busy: boolean }} props */
function NumberField({ label, field, value, step, min, max, onSave, busy }) {
  const [draft, setDraft] = React.useState(null) // null = not editing
  const editing = draft !== null
  const commit = () => { onSave(field, draft); setDraft(null) }
  return (
    <label className="nms-compact-field">
      <span className="nms-compact-field-label">{label}</span>
      {editing ? (
        <input
          className="nms-compact-input nms-compact-input-num"
          type="number"
          autoFocus
          value={draft}
          step={step}
          min={min}
          max={max}
          disabled={busy}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') commit()
            if (event.key === 'Escape') setDraft(null)
          }}
          onBlur={commit}
        />
      ) : (
        <button type="button" className="nms-compact-value" disabled={busy} onClick={() => setDraft(String(value ?? ''))}>
          {value ?? '—'}
        </button>
      )}
    </label>
  )
}

/** lastCompaction may be an epoch ms number or an object {at, tokens}; render quietly. */
function formatLast(value) {
  if (value == null) return '—'
  const at = typeof value === 'number' ? value : value.at ?? value.time ?? null
  if (at != null) {
    const d = new Date(at)
    if (!Number.isNaN(d.getTime())) return d.toLocaleString()
  }
  return String(value.tokens ?? value)
}
