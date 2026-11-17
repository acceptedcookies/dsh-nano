/** Async-compaction takeover panel (-20): four states U1–U4 driven by the host's read-only projection. */

import * as React from 'react'
import { SegmentedControl, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { CheckIcon, CloseIcon, CompactionIcon, WarningIcon } from './icons.jsx'
import { fetchBundleState, fetchCompactState, postCompactSwitch, putCompactPolicy } from './compact.js'
import { DEFAULT_SUMMARY_PROMPT } from '../../lib/compact-prompt.js'

const BUNDLE_NAME = 'dsh-nano-model-selector-compaction'
/** The summary model must cover the largest upstream window; the official
 * DeepSeek-Flash (1M context) is the floor. Magpie mirrors whose route key
 * carries both 'deepseek' and 'flash' are offered alongside. */
const FLASH_RE = /deepseek.*flash|flash.*deepseek/i

/** @param {Array<{provider:string, model:string, name?:string, contextWindow?:number}>} models catalog pairs */
function flashChoices(models) {
  const seen = new Set()
  const picks = []
  for (const item of Array.isArray(models) ? models : []) {
    const id = `${item.provider}/${item.model}`
    if (seen.has(id)) continue
    if (item.provider === 'deepseek-official' && /flash/i.test(item.model)) { seen.add(id); picks.push(item); continue }
    if (item.provider === 'magpie' && FLASH_RE.test(item.model)) { seen.add(id); picks.push(item) }
  }
  return picks
}

/** Group flash choices by provider id so the native popup reads as labeled sections. */
function groupByProvider(choices) {
  const map = new Map()
  for (const item of choices) {
    if (!map.has(item.provider)) map.set(item.provider, [])
    map.get(item.provider).push(item)
  }
  return [...map.entries()]
}

/** "1M" / "256K" style window marker, or null when the catalog lacks one. */
function windowMark(contextWindow) {
  if (!Number.isFinite(contextWindow)) return null
  if (contextWindow >= 1048576) return `${Math.round(contextWindow / 1048576)}M`
  if (contextWindow >= 1024) return `${Math.round(contextWindow / 1024)}K`
  return String(contextWindow)
}

/**
 * @param {{ copy: any, models: Array<{provider:string, model:string}>, onError: (text: string) => void }} props
 * `models` = catalog (provider, model) pairs for the summary-model dropdown.
 */
export function CompactPanel({ copy, models, onError }) {
  const [state, setState] = React.useState(null) // GET payload (policy face)
  // The inventory is a SEPARATE, one-shot read: it is the only host read that
  // costs a full `pluginManager.listBundles()` (~0.9 s of blocking disk work),
  // so it must never ride the 30 s heartbeat below. Read once when the panel
  // opens; refreshed only by an explicit switch, whose response carries it.
  const [bundle, setBundle] = React.useState(null) // {installed, enabled, known} | null while loading
  const [busy, setBusy] = React.useState(false)
  const [banner, setBanner] = React.useState(null) // {kind:'success'|'warn'|'fail', text, code?}
  const [heartbeat, setHeartbeat] = React.useState(null) // {at: Date, status: number}
  const [windowMap, setWindowMap] = React.useState({}) // provider/model -> {name, contextWindow}
  // A number edits only after the top-right confirm; blank clicks discard it.
  const [editField, setEditField] = React.useState(null)
  const [pending, setPending] = React.useState(null) // {field, raw}

  // The injected directory's model objects carry no contextWindow; the host's
  // /catalog route does. Fetch it once to decorate the dropdown options.
  React.useEffect(() => {
    let live = true
    fetch('/nano-model-selector/catalog', { credentials: 'same-origin', cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!live || data == null) return
        const map = {}
        for (const group of data.groups ?? []) {
          for (const model of group.models ?? []) {
            map[`${group.id}/${model.id}`] = { name: model.name, contextWindow: model.contextWindow }
          }
        }
        setWindowMap(map)
      })
      .catch(() => {})
    return () => { live = false }
  }, [])

  const reload = React.useCallback(() => {
    fetchCompactState()
      .then(value => { setState(value); setHeartbeat(value === null ? { at: new Date(), status: 'fail' } : { at: new Date(), status: 'ok' }) })
      .catch(() => setHeartbeat({ at: new Date(), status: 'fail' }))
  }, [])
  React.useEffect(reload, [reload])
  // One-shot inventory read, deliberately outside the heartbeat.
  React.useEffect(() => {
    let live = true
    fetchBundleState()
      .then(value => { if (live && value !== null) setBundle(value) })
      .catch(() => {})
    return () => { live = false }
  }, [])
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

  // Draft-cancel callback and the outside-click listener MUST be declared
  // before every early return below — a hook that only runs on later renders
  // throws React invariant #310 and unmounts the whole slot.
  const cancelEdit = React.useCallback(() => {
    setEditField(null)
    setPending(null)
  }, [])
  React.useEffect(() => {
    if (editField === null) return undefined
    const onPointer = event => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest?.('.nms-compact-input-num, .nms-compact-confirm, .nms-compact-value')) return
      cancelEdit()
    }
    document.addEventListener('pointerdown', onPointer, true)
    return () => document.removeEventListener('pointerdown', onPointer, true)
  }, [editField, cancelEdit])

  if (state === null || bundle === null) {
    return <div className="nms-loading"><span className="nms-pending-dot" />{copy.loading}</div>
  }

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
    postCompactSwitch(next)
      .then(result => {
        const application = result.application ?? 'applied'
        const restart = application === 'restart-required'
          ? (result.restartReason ? `${copy.compactSwitchRestart}：${result.restartReason}` : copy.compactSwitchRestart)
          : null
        noteWithCode(
          application === 'applied' ? 'success' : 'warn',
          application === 'applied'
            ? copy.compactSwitchApplied
            : restart
              ?? (application === 'overridden' ? copy.compactSwitchOverridden : application),
          application,
        )
        // The switch response carries the projection the host just re-read
        // after dropping its snapshot — no second round trip.
        if (result.bundle !== undefined) setBundle(result.bundle)
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
    // Water order: H <= B <= S. Equality is legal; only a line sitting
    // strictly above the one above it is rejected. S is the read-only ceiling.
    const safety = policy.bufferSizeSafety ?? 0.9
    const next = { bufferSizeAsync: policy.bufferSizeAsync, healthTargetAsync: policy.healthTargetAsync, pinnedAsyncTokens: policy.pinnedAsyncTokens, [field]: value }
    if (field === 'bufferSizeAsync' || field === 'healthTargetAsync') {
      if (!(next.healthTargetAsync >= 0 && next.healthTargetAsync <= next.bufferSizeAsync)) {
        noteWithCode('fail', `${copy.compactRejected}: H (${next.healthTargetAsync}) ≤ B (${next.bufferSizeAsync})`, 'water-order')
        return
      }
      if (!(next.bufferSizeAsync <= safety)) {
        noteWithCode('fail', `${copy.compactRejected}: B (${next.bufferSizeAsync}) ≤ S (${safety})`, 'water-order')
        return
      }
    }
    const patch = field === 'model' ? { model: value } : { [field]: value }
    setBusy(true)
    putCompactPolicy(patch)
      .then(data => {
        setEditField(null)
        setPending(null)
        noteWithCode('success', `${copy.compactSwitchApplied} · ${field}`, 'applied')
        setHeartbeat({ at: new Date(), status: 'ok' })
        setState(prev => (prev === null ? prev : { ...prev, policy: data.policy ?? prev.policy }))
      })
      .catch(error => noteWithCode('fail', error.message, error.code))
      .finally(() => setBusy(false))
  }

  const activateField = field => {
    setEditField(field)
    setPending(null)
  }
  const stageDraft = (field, raw) => setPending({ field, raw })

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
      {(banner !== null || (pending !== null && editField === pending.field)) && (
        <div className="nms-compact-top-actions">
          {banner !== null && (
            <div className="nms-compact-chip" data-kind={banner.kind} role="status">
              {banner.kind === 'success' ? <CheckIcon size={12} /> : <WarningIcon size={12} />}
              <span className="nms-compact-chip-copy">{banner.text}</span>
              <button type="button" className="nms-compact-note-x" aria-label={copy.close} onClick={() => setBanner(null)}>
                <CloseIcon size={11} />
              </button>
            </div>
          )}
          {pending !== null && editField === pending.field && (
            <button
              type="button"
              className="nms-compact-confirm"
              disabled={busy}
              onClick={() => saveField(pending.field, pending.raw)}
            >
              {copy.compactApply}
            </button>
          )}
        </div>
      )}

      {/* Status card: state + toggle. */}
      <div className="nms-compact-card" data-enabled={enabled}>
        <div className="nms-compact-card-main">
          <span className="nms-model-name">{enabled ? copy.compactEnabled : copy.compactDisabled}</span>
          <span className="nms-compact-card-desc">{copy.compactSubtitle}</span>
        </div>
        <Switch
          checked={enabled}
          onChange={doSwitch}
          label={enabled ? copy.compactEnabled : copy.compactDisabled}
          disabled={busy}
        />
      </div>

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
          <div className="nms-compact-field">
            <span className="nms-compact-field-label">{copy.compactFieldModel}</span>
            <select
              className="nms-compact-input nms-compact-select"
              aria-label={copy.compactFieldModel}
              value={modelValue}
              disabled={busy}
              onChange={event => {
                const [provider, ...rest] = event.target.value.split('/')
                saveField('model', { provider, model: rest.join('/') })
              }}
            >
              <option value="/">{`（${copy.selectModel}）`}</option>
              {groupByProvider(choices).map(([provider, items]) => (
                <optgroup key={provider} label={provider}>
                  {items.map(item => {
                    const meta = windowMap[`${item.provider}/${item.model}`]
                    const mark = windowMark(meta?.contextWindow)
                    return (
                      <option key={`${item.provider}/${item.model}`} value={`${item.provider}/${item.model}`}>
                        {mark !== null
                          ? `${item.provider} · ${meta?.name ?? item.name ?? item.model} · ${mark}`
                          : `${item.provider} · ${meta?.name ?? item.name ?? item.model}`}
                      </option>
                    )
                  })}
                </optgroup>
              ))}
            </select>
          </div>

          <NumberField label={copy.compactFieldBuffer} field="bufferSizeAsync" value={policy.bufferSizeAsync} unit="%" display={ratioText} step="0.05" min="0" max="1" editing={editField === 'bufferSizeAsync'} onActivate={activateField} onDraft={stageDraft} onCancel={cancelEdit} busy={busy} />
          <NumberField label={copy.compactFieldHealth} field="healthTargetAsync" value={policy.healthTargetAsync} unit="%" display={ratioText} step="0.05" min="0" max="1" editing={editField === 'healthTargetAsync'} onActivate={activateField} onDraft={stageDraft} onCancel={cancelEdit} busy={busy} />
          <NumberField label={copy.compactFieldPinned} field="pinnedAsyncTokens" value={policy.pinnedAsyncTokens} unit="Tok" step="1000" min="0" editing={editField === 'pinnedAsyncTokens'} onActivate={activateField} onDraft={stageDraft} onCancel={cancelEdit} busy={busy} />

          <div className="nms-compact-field">
            <span className="nms-compact-field-label">{copy.compactFieldPinnedFull}</span>
            <span className="nms-compact-field-static">{`${policy.pinnedFullTokens ?? '—'} Tok`}</span>
          </div>
          <div className="nms-compact-field">
            <span className="nms-compact-field-label">{copy.compactFieldSafety}</span>
            <span className="nms-compact-field-static">{Number.isFinite(policy.bufferSizeSafety) ? `${Math.round(policy.bufferSizeSafety * 100)}%` : '90%'}</span>
          </div>
        </div>


      )}

      {enabled && state.policy !== null && (
        <PromptField copy={copy} value={policy.extraRequirements ?? ''} version={policy.promptVersion ?? null} onSave={saveField} busy={busy} />
      )}

      {/* Compression explainer (-20): scenario tabs over live-config copy. */}
      {enabled && state.policy !== null && (
        <ScenarioBox
          copy={copy}
          meterDown={meterDown}
          degraded={degraded}
          policy={policy}
          effective={effective}
          modelLabel={modelValue === '/' ? '—' : modelLabelOf(modelValue, windowMap)}
        />
      )}

      {/* Live telemetry: own box below the explainer — meter, last run,
          effective pins, heartbeat. */}
      {enabled && state.policy !== null && (
        <div className="nms-compact-runtime">
          <div className="nms-compact-meter-row">
            <span className="nms-model-meta">{copy.compactRuntimeFill}</span>
            {fill === null ? (
              <span className="nms-model-meta">{meterDown ? `${copy.compactMeterUnknown}（meter-unavailable）` : copy.compactMeterUnknown}</span>
            ) : (
              <>
                <span className="nms-compact-meter" role="meter" aria-valuenow={Math.round(fill * 100)} aria-valuemin="0" aria-valuemax="100">
                  <span className="nms-compact-meter-fill" data-level={fill >= (policy.bufferSizeSafety ?? 0.9) ? 'high' : fill >= 0.5 ? 'mid' : 'low'} style={{ width: `${(fill * 100).toFixed(1)}%` }} />
                </span>
                <span className="nms-compact-meter-num">{`${(fill * 100).toFixed(1)}%`}</span>
              </>
            )}
          </div>
          <div className="nms-compact-meta-row">
            <span className="nms-model-meta">
              {copy.compactLastCompaction}: {formatLast(runtime.lastCompaction)} · {copy.compactEffectivePin}={effective.pin ?? '—'} · {copy.compactWindowMin}={effective.windowMin ?? '—'}
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

const SCENARIO_KEYS = [
  { tab: 'compactCaseTabIdle', body: 'compactCaseIdle' },
  { tab: 'compactCaseTabBuffer', body: 'compactCaseBuffer' },
  { tab: 'compactCaseTabSafety', body: 'compactCaseSafety' },
  { tab: 'compactCaseTabDegraded', body: 'compactCaseDegraded' },
]

/** @param {{copy:any, meterDown:boolean, degraded:boolean, policy:any, effective:any, modelLabel:string}} props */
function ScenarioBox({ copy, meterDown, degraded, policy, effective, modelLabel }) {
  const [tab, setTab] = React.useState(1) // default: buffer-line scenario
  const pct = value => (Number.isFinite(value) ? `${Math.round(value * 100)}` : '—')
  const vars = {
    bp: pct(policy.bufferSizeAsync),
    hp: pct(policy.healthTargetAsync),
    sp: pct(policy.bufferSizeSafety ?? 0.9),
    pin: policy.pinnedAsyncTokens ?? '—',
    epin: effective.pin ?? '—',
    windowMin: effective.windowMin ?? '—',
    model: modelLabel,
    status: meterDown ? 'meter-unavailable' : degraded ? 'state-read-failed' : 'ok',
  }
  const active = SCENARIO_KEYS[tab] ?? SCENARIO_KEYS[0]
  return (
    <div className="nms-compact-explain">
      <div className="nms-explain-head">
        <span className="nms-compact-field-label">{copy.compactExplainTitle}</span>
        <SegmentedControl
          id="nms-compact-explain"
          value={active.tab}
          options={SCENARIO_KEYS.map(scenario => ({ value: scenario.tab, label: copy[scenario.tab] }))}
          onChange={value => setTab(Math.max(0, SCENARIO_KEYS.findIndex(scenario => scenario.tab === value)))}
          label={copy.compactExplainTitle}
        />
      </div>
      <div className="nms-explain-body">{interpolate(copy[active.body], vars)}</div>
    </div>
  )
}

/** Tiny {key} template interp for the scenario copy. */
function interpolate(template, vars) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`))
}

/** Render a stored provider/model pair as the dropdown's display label. */
function modelLabelOf(pair, windowMap) {
  const meta = windowMap[pair]
  const [provider, ...rest] = pair.split('/')
  const model = rest.join('/')
  return meta?.name ? `${provider} · ${meta.name}` : pair
}

/** Ratios are stored as fractions and shown as whole percents. */
function ratioText(value) {
  return Number.isFinite(value) ? String(Math.round(value * 100)) : '—'
}

/** @param {{ label: string, field: string, value: any, unit: string, display?: (value:any)=>string, step: string, min: string, max?: string, editing: boolean, onActivate: (field:string)=>void, onDraft: (field:string, raw:string)=>void, onCancel: ()=>void, busy: boolean }} props */
function NumberField({ label, field, value, unit, display, step, min, max, editing, onActivate, onDraft, onCancel, busy }) {
  const shown = display ? display(value) : String(value ?? '—')
  const [draft, setDraft] = React.useState(shown)
  React.useEffect(() => { if (editing) setDraft(shown === '—' ? '' : shown) }, [editing, shown])
  const publish = text => {
    setDraft(text)
    const raw = display === ratioText ? String(Number(text) / 100) : text
    onDraft(field, raw)
  }
  return (
    <div className="nms-compact-field">
      <span className="nms-compact-field-label">{label}</span>
      {editing ? (
        <input
          className="nms-compact-input nms-compact-input-num"
          type="number"
          autoFocus
          value={draft}
          step={display === ratioText ? '1' : step}
          min={display === ratioText ? '0' : min}
          max={display === ratioText ? '100' : max}
          disabled={busy}
          onChange={event => publish(event.target.value)}
          onKeyDown={event => { if (event.key === 'Escape') onCancel() }}
        />
      ) : (
        <button type="button" className="nms-compact-value" disabled={busy} onClick={() => onActivate(field)}>
          {`${shown} ${unit}`}
        </button>
      )}
    </div>
  )
}

/**
 * The built-in instruction is the single source (-07①⑤): shown read-only with
 * the fingerprint of the instruction actually sent; the only writable part is
 * `extraRequirements`, appended after the built-in body. Reset = clear extras.
 */
function PromptField({ copy, value, version, onSave, busy }) {
  const [open, setOpen] = React.useState(false)
  const areaRef = React.useRef(null)
  // Tolerate a non-string field on the read path — a stale or hand-edited state
  // file must not take the whole selector down at render.
  const text = typeof value === 'string' ? value : ''
  const custom = text.trim().length > 0
  return (
    <div className="nms-compact-prompt">
      <div className="nms-compact-field" style={{ height: 'auto', padding: 0 }}>
        <span className="nms-compact-field-label">{copy.compactFieldPrompt}</span>
        <button type="button" className="nms-compact-value" disabled={busy} onClick={() => setOpen(prev => !prev)}>
          {custom ? copy.compactPromptCustom : copy.compactPromptBuiltin}
          {typeof version === 'string' && version.length > 0 ? ` · ${copy.compactPromptVersion.replace('{v}', version)}` : ''}
        </button>
      </div>
      {open && (
        <>
          <textarea className="nms-compact-prompt-text" defaultValue={DEFAULT_SUMMARY_PROMPT} readOnly disabled />
          <span className="nms-model-meta">{copy.compactPromptExtra}</span>
          <textarea ref={areaRef} className="nms-compact-prompt-text" style={{ minHeight: '70px' }} defaultValue={text} disabled={busy} />
          <span className="nms-compact-prompt-actions">
            <button type="button" className="nms-effort-button" disabled={busy} onClick={() => {
              const raw = areaRef.current?.value ?? ''
              onSave('extraRequirements', raw)
              setOpen(false)
            }}>{copy.compactPromptSave}</button>
            <button type="button" className="nms-effort-button" disabled={busy} onClick={() => { onSave('extraRequirements', ''); setOpen(false) }}>{copy.compactPromptReset}</button>
            <button type="button" className="nms-effort-button" onClick={() => setOpen(false)}>{copy.compactPromptClose}</button>
          </span>
        </>
      )}
    </div>
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
