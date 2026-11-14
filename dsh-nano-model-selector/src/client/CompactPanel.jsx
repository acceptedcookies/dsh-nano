/** Async-compaction takeover panel (-20): four states U1–U4 driven by the host's read-only projection. */

import * as React from 'react'
import { CompactionIcon, WarningIcon } from './icons.jsx'
import { fetchCompactState, postCompactSwitch, putCompactPolicy } from './compact.js'

const BUNDLE_NAME = 'dsh-nano-model-selector-compaction'

/**
 * @param {{ copy: any, models: Array<{provider:string, model:string}>, onError: (text: string) => void }} props
 * `models` = catalog (provider, model) pairs for the summary-model dropdown.
 */
export function CompactPanel({ copy, models, onError }) {
  const [state, setState] = React.useState(null) // GET payload
  const [busy, setBusy] = React.useState(false)
  const [confirm, setConfirm] = React.useState(false)
  const [banner, setBanner] = React.useState(null) // {kind:'success'|'warn'|'fail', text}
  const [draft, setDraft] = React.useState({})

  const reload = React.useCallback(() => {
    fetchCompactState().then(value => { setState(value); setDraft({}) }).catch(() => {})
  }, [])
  React.useEffect(reload, [reload])

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

  const policy = state.policy ?? {}
  const effective = policy.effective ?? {}
  const runtime = policy.runtime ?? {}
  const degraded = state.degraded === 'state-read-failed'

  const doSwitch = enabled => {
    if (busy) return
    setBusy(true)
    setConfirm(false)
    postCompactSwitch(enabled)
      .then(result => {
        const application = result.application ?? 'applied'
        setBanner(application === 'applied'
          ? { kind: 'success', text: copy.compactSwitchApplied }
          : application === 'restart-required'
            ? { kind: 'warn', text: `${copy.compactSwitchRestart}（dsh-dev restart）` }
            : application === 'overridden'
              ? { kind: 'warn', text: copy.compactSwitchOverridden }
              : { kind: 'warn', text: application })
        reload()
      })
      .catch(error => setBanner({ kind: 'fail', text: `${copy.compactSwitchFailed}: ${error.message}` }))
      .finally(() => setBusy(false))
  }

  const saveField = (field, raw) => {
    const value = field === 'model' ? raw : Number(raw)
    if (field !== 'model' && (!Number.isFinite(value))) {
      onError(`${copy.selectionError}: ${field} must be a number`)
      return
    }
    const patch = field === 'model' ? { model: value } : { [field]: value }
    setBusy(true)
    putCompactPolicy(patch)
      .then(() => { setBanner({ kind: 'success', text: copy.compactSwitchApplied }); reload() })
      .catch(error => setBanner({ kind: 'fail', text: error.message }))
      .finally(() => setBusy(false))
  }

  return (
    <div>
      <div className="nms-group">
        <CompactionIcon className="nms-group-star" size={12} />{copy.compactTitle}
        <span className="nms-group-count">{copy.compactSubtitle}</span>
      </div>

      {banner !== null && (
        <div className={`nms-error nms-banner-${banner.kind}`}>
          {banner.kind !== 'success' && <WarningIcon size={14} />}
          <span className="nms-error-copy">{banner.text}</span>
        </div>
      )}

      {/* U4 degraded banner (read failure keeps only the safety line live). */}
      {degraded && (
        <div className="nms-error">
          <WarningIcon size={14} />
          <span className="nms-error-copy">{copy.compactDegraded}</span>
        </div>
      )}

      {/* U2/U3: enabled state + toggle. U2 shows the same toggle at OFF. */}
      <div className="nms-model-row" data-active={bundle.enabled === true}>
        <div className="nms-model-main" style={{ cursor: 'default' }}>
          <span className="nms-model-copy">
            <span className="nms-model-line">
              <span className="nms-model-name">{bundle.enabled === true ? copy.compactEnabled : copy.compactDisabled}</span>
              <span className={`nms-tag ${bundle.enabled === true ? 'nms-tag-success' : 'nms-tag-warning'}`}>{BUNDLE_NAME}</span>
            </span>
            <span className="nms-model-desc">{copy.compactSubtitle}</span>
          </span>
        </div>
        <span className="nms-model-side">
          <button
            type="button"
            className="nms-effort-button"
            aria-pressed={bundle.enabled === true}
            disabled={busy}
            onClick={() => setConfirm(true)}
          >{bundle.enabled === true ? 'ON' : 'OFF'}</button>
        </span>
      </div>

      {confirm && (
        <div className="nms-error">
          <WarningIcon size={14} />
          <span className="nms-error-copy">
            {copy.compactSwitchConfirm}{' '}
            <button type="button" className="nms-retry" disabled={busy} onClick={() => doSwitch(!(bundle.enabled === true))}>OK</button>{' '}
            <button type="button" className="nms-retry" onClick={() => setConfirm(false)}>✕</button>
          </span>
        </div>
      )}

      {/* U3: policy fields only when enabled (degraded keeps them read-only). */}
      {bundle.enabled === true && state.policy !== null && (
        <div className="nms-model-row" data-active="false">
          <div className="nms-model-main" style={{ cursor: 'default' }}>
            <span className="nms-model-copy">
              <span className="nms-model-line"><span className="nms-model-name">{copy.compactFieldModel}</span></span>
              <select
                aria-label={copy.compactFieldModel}
                value={`${policy.model?.provider ?? ''}/${policy.model?.model ?? ''}`}
                disabled={busy}
                onChange={event => {
                  const [provider, ...rest] = event.target.value.split('/')
                  saveField('model', { provider, model: rest.join('/') })
                }}
              >
                <option value="/">{`（${copy.selectModel}）`}</option>
                {models.map(item => (
                  <option key={`${item.provider}/${item.model}`} value={`${item.provider}/${item.model}`}>{`${item.provider}/${item.model}`}</option>
                ))}
              </select>
              <EditableField label={copy.compactFieldBuffer} field="bufferSizeAsync" value={policy.bufferSizeAsync} onSave={saveField} />
              <EditableField label={copy.compactFieldHealth} field="healthTargetAsync" value={policy.healthTargetAsync} onSave={saveField} />
              <EditableField label={copy.compactFieldPinned} field="pinnedAsyncTokens" value={policy.pinnedAsyncTokens} onSave={saveField} />
              <span className="nms-model-meta">{copy.compactFieldSafety}</span>
              <span className="nms-model-meta">{copy.compactRuntimeFill}: {runtime.fill == null ? '—' : `${(runtime.fill * 100).toFixed(1)}%`}</span>
              <span className="nms-model-meta">{copy.compactLastCompaction}: {runtime.lastCompaction == null ? '—' : JSON.stringify(runtime.lastCompaction)}</span>
              <span className="nms-model-meta">pin={effective.pin ?? '—'} windowMin={effective.windowMin ?? '—'} dcs={JSON.stringify(effective.dcs ?? [])}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function EditableField({ label, field, value, onSave }) {
  const [draft, setDraft] = React.useState('')
  const [editing, setEditing] = React.useState(false)
  return (
    <span className="nms-model-meta">
      {label}：
      {editing ? (
        <input
          autoFocus
          defaultValue={value}
          size={8}
          onKeyDown={event => {
            if (event.key === 'Enter') { onSave(field, event.target.value); setEditing(false) }
            if (event.key === 'Escape') setEditing(false)
          }}
          onBlur={() => setEditing(false)}
        />
      ) : (
        <button type="button" className="nms-retry" onClick={() => setEditing(true)}>{value}</button>
      )}
    </span>
  )
}
