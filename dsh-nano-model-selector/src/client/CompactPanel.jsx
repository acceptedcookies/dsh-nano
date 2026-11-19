/** Async-compaction takeover panel (-20): four states U1–U4 driven by the host's read-only projection. */

import * as React from 'react'
import { SegmentedControl, Switch, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoWindowDialog } from 'dsh-nano-ui'
import { CheckIcon, CloseIcon, CompactionIcon, WarningIcon } from './icons.jsx'
import { fetchBundleState, fetchCompactState, postCompactSwitch, putCompactPolicy } from './compact.js'
import { DEFAULT_SUMMARY_PROMPT } from '../../lib/compact-prompt.js'
import { COMPACT_PRESETS, PRESET_EXTRA_REQUIREMENTS, presetActive, presetChanges } from './compact-presets.js'
import { tok } from './history-format.js'
import { WaterLine } from './WaterLine.jsx'

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
 * @param {{ copy: any, models: Array<{provider:string, model:string}>, sessionId?: string|null, onError: (text: string) => void, onSwitchDone?: () => void }} props
 * `models` = catalog (provider, model) pairs for the summary-model dropdown;
 * `sessionId` = the composer's session, whose fill/window the runtime box shows.
 */
export function CompactPanel({ copy, models, sessionId = null, onError, onSwitchDone }) {
  const [state, setState] = React.useState(null) // GET payload (policy face)
  // The inventory is a SEPARATE, one-shot read: it is the only host read that
  // costs a full `pluginManager.listBundles()` (~0.9 s of blocking disk work),
  // so it must never ride a heartbeat. Read once when the panel opens;
  // refreshed only by an explicit switch, whose response carries it.
  const [bundle, setBundle] = React.useState(null) // {installed, enabled, known} | null while loading
  const [busy, setBusy] = React.useState(false)
  const [banner, setBanner] = React.useState(null) // {kind:'success'|'warn'|'fail', text, code?}
  const [heartbeat, setHeartbeat] = React.useState(null) // {at: Date, status: 'ok'|'fail'} of the last policy read
  const [windowMap, setWindowMap] = React.useState({}) // provider/model -> {name, contextWindow}
  // A number edits only after the top-right confirm; blank clicks discard it.
  const [editField, setEditField] = React.useState(null)
  const [pending, setPending] = React.useState(null) // {field, raw}
  // The takeover switch is a profile-level change (it replays every preset's
  // plugin set); it must never fire from a bare toggle click — confirm first.
  const [confirmSwitch, setConfirmSwitch] = React.useState(null) // target boolean | null
  // A preset rewrites several fields at once (extraRequirements included), so
  // it shows the exact diff before the PUT.
  const [confirmPreset, setConfirmPreset] = React.useState(null) // preset | null
  // Confirmations draw inside the selector window: a main-window Modal sits on
  // the host modal band (1000), below the floating window (1200), and would be covered.
  const rootRef = React.useRef(null)

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
    fetchCompactState(sessionId)
      .then(value => { setState(value); setHeartbeat({ at: new Date(), status: value === null ? 'fail' : 'ok' }) })
      .catch(() => setHeartbeat({ at: new Date(), status: 'fail' }))
  }, [sessionId])
  React.useEffect(reload, [reload])
  // One-shot inventory read, deliberately outside any refresh.
  React.useEffect(() => {
    let live = true
    fetchBundleState()
      .then(value => { if (live && value !== null) setBundle(value) })
      .catch(() => {})
    return () => { live = false }
  }, [])
  // P5-02c: no heartbeat. The panel re-reads on open (the mount reload above)
  // and after a confirmed switch — a quiet panel does not need to poll
  // host-side state nobody is looking at.
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
  const ready = enabled && state.policy !== null

  const noteWithCode = (kind, text, code) => setBanner({ kind, text: code ? `${text}（${code}）` : text })

  const doSwitch = next => {
    if (busy) return
    setConfirmSwitch(next) // confirm first — POST happens only in confirmSwitchYes
  }

  const confirmSwitchYes = () => {
    const next = confirmSwitch
    setConfirmSwitch(null)
    if (next === null) return
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
        onSwitchDone?.()
      })
      .catch(error => noteWithCode('fail', `${copy.compactSwitchFailed}: ${error.message}`, error.code))
      .finally(() => setBusy(false))
  }

  /** PUT a partial policy; the response carries the re-derived policy face. */
  const writePolicy = (patch, successText) => {
    setBusy(true)
    putCompactPolicy(patch, sessionId)
      .then(data => {
        setEditField(null)
        setPending(null)
        noteWithCode('success', successText, 'applied')
        setHeartbeat({ at: new Date(), status: 'ok' })
        setState(prev => (prev === null ? prev : { ...prev, policy: data.policy ?? prev.policy }))
        onSwitchDone?.()
      })
      .catch(error => noteWithCode('fail', error.message, error.code))
      .finally(() => setBusy(false))
  }

  const saveField = (field, raw) => {
    const value = field === 'model' || field === 'extraRequirements' ? raw : Number(raw)
    if (field !== 'model' && field !== 'extraRequirements' && !Number.isFinite(value)) {
      onError(`${copy.selectionError}: ${field} must be a number`)
      return
    }
    // Water order is strict: H < B < S. Equality violates the master order
    // (-10②) exactly like inversion does. S is the read-only ceiling.
    const safety = policy.bufferSizeSafety ?? 0.9
    const next = { bufferSizeAsync: policy.bufferSizeAsync, healthTargetAsync: policy.healthTargetAsync, pinnedAsyncTokens: policy.pinnedAsyncTokens, [field]: value }
    if (field === 'bufferSizeAsync' || field === 'healthTargetAsync') {
      if (!(next.healthTargetAsync >= 0 && next.healthTargetAsync < next.bufferSizeAsync)) {
        noteWithCode('fail', `${copy.compactRejected}: H (${next.healthTargetAsync}) < B (${next.bufferSizeAsync})`, 'water-order')
        return
      }
      if (!(next.bufferSizeAsync < safety)) {
        noteWithCode('fail', `${copy.compactRejected}: B (${next.bufferSizeAsync}) < S (${safety})`, 'water-order')
        return
      }
    }
    writePolicy({ [field]: value }, `${copy.compactSwitchApplied} · ${fieldLabel(copy, field)}`)
  }

  const applyPreset = preset => {
    setConfirmPreset(null)
    if (preset === null) return
    writePolicy({ ...preset.patch }, copy.compactPresetApplied.replace('{name}', copy.compactPresetName[preset.id]))
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
  const numberProps = { onActivate: activateField, onDraft: stageDraft, onCancel: cancelEdit, busy }
  const editingOf = field => editField === field

  return (
    <div className="nms-compact" ref={rootRef}>
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
          <span className="nms-compact-card-desc" title={copy.compactSubtitle}>{copy.compactSubtitle}</span>
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

      {/* Live state first: where this session's fill sits against the lines. */}
      {ready && (
        <Section title={copy.compactRuntimeTitle}>
          <div className="nms-compact-runtime">
            {sessionId === null ? (
              <span className="nms-model-meta">{copy.compactRuntimeNoSession}</span>
            ) : (
              <>
                <WaterLine
                  fill={fill}
                  health={policy.healthTargetAsync ?? 0.5}
                  buffer={policy.bufferSizeAsync ?? 0.65}
                  safety={policy.bufferSizeSafety ?? 0.9}
                  copy={copy}
                  windowTokens={runtime.window ?? null}
                />
                {fill === null && (
                  <span className="nms-model-meta">
                    {meterDown
                      ? `${copy.compactMeterUnknown}（meter-unavailable）`
                      : runtime.window == null ? copy.compactRuntimeNotLive : copy.compactMeterUnknown}
                  </span>
                )}
                <span className="nms-compact-facts">
                  <span>{copy.compactLastCompaction}: {lastText(runtime.lastCompaction, copy)}</span>
                  <span>{copy.compactEffectivePin}: {tok(effective.pin)}</span>
                  <span>{copy.compactWindow}: {tok(runtime.window)}</span>
                  <span>{heartbeat === null ? '—' : heartbeat.status === 'ok' ? copy.compactReadAt.replace('{time}', heartbeat.at.toLocaleTimeString()) : copy.compactReadFailed}</span>
                </span>
              </>
            )}
          </div>
        </Section>
      )}

      {ready && (
        <Section title={copy.compactPresetTitle} hint={copy.compactPresetHint}>
          <div className="nms-compact-presets">
            {COMPACT_PRESETS.map(preset => {
              const active = presetActive(policy, preset)
              return (
                <button
                  key={preset.id}
                  type="button"
                  className="nms-compact-preset"
                  data-active={active}
                  aria-pressed={active}
                  disabled={busy}
                  onClick={() => { if (!active) setConfirmPreset(preset) }}
                >
                  <span className="nms-compact-preset-name">
                    {copy.compactPresetName[preset.id]}
                    {active && <Tag tone="success">{copy.compactPresetActive}</Tag>}
                  </span>
                  <span className="nms-compact-preset-desc">{copy.compactPresetDesc[preset.id]}</span>
                  <span className="nms-compact-preset-vals">
                    {`B ${ratioText(preset.patch.bufferSizeAsync)}% · H ${ratioText(preset.patch.healthTargetAsync)}% · ${tok(preset.patch.pinnedAsyncTokens)} / ${tok(preset.patch.pinnedFullTokens)}`}
                  </span>
                </button>
              )
            })}
          </div>
        </Section>
      )}

      {ready && (
        <Section title={copy.compactSectionLines} hint={copy.compactSectionLinesHint}>
          <div className="nms-compact-fields">
            <NumberField {...numberProps} label={copy.compactFieldBuffer} hint={copy.compactHintBuffer} field="bufferSizeAsync" value={policy.bufferSizeAsync} unit="%" ratio editing={editingOf('bufferSizeAsync')} />
            <NumberField {...numberProps} label={copy.compactFieldHealth} hint={copy.compactHintHealth} field="healthTargetAsync" value={policy.healthTargetAsync} unit="%" ratio editing={editingOf('healthTargetAsync')} />
            <Field label={copy.compactFieldSafety} hint={copy.compactHintSafety}>
              <span className="nms-compact-field-static">{Number.isFinite(policy.bufferSizeSafety) ? `${Math.round(policy.bufferSizeSafety * 100)} %` : '90 %'}</span>
            </Field>
          </div>
        </Section>
      )}

      {ready && (
        <Section title={copy.compactSectionRetain} hint={copy.compactSectionRetainHint}>
          <div className="nms-compact-fields">
            <NumberField {...numberProps} label={copy.compactFieldPinned} hint={copy.compactHintPinned} field="pinnedAsyncTokens" value={policy.pinnedAsyncTokens} unit="tokens" step="1000" editing={editingOf('pinnedAsyncTokens')} />
            <NumberField {...numberProps} label={copy.compactFieldPinnedFull} hint={copy.compactHintPinnedFull} field="pinnedFullTokens" value={policy.pinnedFullTokens} unit="tokens" step="1000" editing={editingOf('pinnedFullTokens')} />
          </div>
        </Section>
      )}

      {ready && (
        <Section title={copy.compactSectionSummary} hint={copy.compactSectionSummaryHint}>
          <div className="nms-compact-fields">
            <Field label={copy.compactFieldModel} hint={copy.compactHintModel}>
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
            </Field>
            <PromptField copy={copy} value={policy.extraRequirements ?? ''} version={policy.promptVersion ?? null} onSave={saveField} busy={busy} />
          </div>
        </Section>
      )}

      {/* Compression explainer (-20): scenario tabs over live-config copy. */}
      {ready && (
        <ScenarioBox
          copy={copy}
          meterDown={meterDown}
          degraded={degraded}
          policy={policy}
          effective={effective}
          modelLabel={modelValue === '/' ? copy.compactModelRouted : modelLabelOf(modelValue, windowMap)}
        />
      )}

      {confirmSwitch !== null && (
        <NanoWindowDialog
          container={windowOf(rootRef.current)}
          copy={copy}
          title={copy.compactConfirmTitle}
          description={confirmSwitch ? copy.compactConfirmEnable : copy.compactConfirmDisable}
          width={420}
          confirmLabel={copy.compactConfirmYes}
          onConfirm={confirmSwitchYes}
          onCancel={() => setConfirmSwitch(null)}
        />
      )}

      {confirmPreset !== null && (
        <NanoWindowDialog
          container={windowOf(rootRef.current)}
          copy={copy}
          title={copy.compactPresetConfirmTitle.replace('{name}', copy.compactPresetName[confirmPreset.id])}
          description={copy.compactPresetConfirmDesc}
          width={480}
          confirmLabel={copy.compactPresetApply}
          busy={busy}
          onConfirm={() => applyPreset(confirmPreset)}
          onCancel={() => setConfirmPreset(null)}
        >
          <PresetDiff copy={copy} policy={policy} preset={confirmPreset} />
        </NanoWindowDialog>
      )}
    </div>
  )
}

/** The selector's floating window that hosts this panel, or undefined before mount. */
function windowOf(element) {
  const panel = element?.closest?.('.nms-panel')
  return panel?.isConnected === true ? panel : undefined
}

/** A titled group of settings; the hint says in one line what the group controls. */
function Section({ title, hint, children }) {
  return (
    <section className="nms-compact-section">
      <div className="nms-compact-section-head">
        <span className="nms-compact-section-title">{title}</span>
        {hint && <span className="nms-compact-section-hint">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

/** One settings row: label + plain-language hint on the left, the control on the right. */
function Field({ label, hint, children }) {
  return (
    <div className="nms-compact-field">
      <span className="nms-compact-field-copy">
        <span className="nms-compact-field-label">{label}</span>
        {hint && <span className="nms-compact-field-hint">{hint}</span>}
      </span>
      {children}
    </div>
  )
}

/** The rows a preset would rewrite, old → new. */
function PresetDiff({ copy, policy, preset }) {
  const rows = presetChanges(policy, preset)
  const replacesCustom = rows.some(row => row.field === 'extraRequirements'
    && typeof row.from === 'string' && row.from.trim().length > 0)
  return (
    <div className="nms-compact-diff">
      {rows.map(row => (
        <div key={row.field} className="nms-compact-diff-row">
          <span className="nms-compact-diff-label">{fieldLabel(copy, row.field)}</span>
          <span className="nms-compact-diff-from" title={typeof row.from === 'string' ? row.from : undefined}>{fieldValueText(copy, row.field, row.from)}</span>
          <span className="nms-compact-diff-arrow" aria-hidden="true">→</span>
          <span className="nms-compact-diff-to">{fieldValueText(copy, row.field, row.to)}</span>
        </div>
      ))}
      {replacesCustom && <span className="nms-compact-diff-warn">{copy.compactPresetCustomLost}</span>}
    </div>
  )
}

function fieldLabel(copy, field) {
  return {
    model: copy.compactFieldModel,
    bufferSizeAsync: copy.compactFieldBuffer,
    healthTargetAsync: copy.compactFieldHealth,
    pinnedAsyncTokens: copy.compactFieldPinned,
    pinnedFullTokens: copy.compactFieldPinnedFull,
    extraRequirements: copy.compactPromptExtra.split(/[（(]/)[0].trim(),
  }[field] ?? field
}

function fieldValueText(copy, field, value) {
  if (field === 'bufferSizeAsync' || field === 'healthTargetAsync') return `${ratioText(value)} %`
  if (field === 'pinnedAsyncTokens' || field === 'pinnedFullTokens') return `${tok(value)} tokens`
  if (field === 'extraRequirements') {
    const text = typeof value === 'string' ? value.trim() : ''
    if (text.length === 0) return copy.compactPresetEmpty
    if (text === PRESET_EXTRA_REQUIREMENTS) return copy.compactPresetExtraValue
    return text.length > 48 ? `${text.slice(0, 48)}…` : text
  }
  return String(value ?? '—')
}

/** "完成 · 2026/11/19 10:02" from the session's durable compaction fold. */
function lastText(last, copy) {
  if (last === null || last === undefined || last.status === 'ready' || last.at == null) return copy.compactLastStatus.ready
  const status = copy.compactLastStatus[last.status] ?? String(last.status)
  const at = new Date(last.at)
  return Number.isNaN(at.getTime()) ? status : `${status} · ${at.toLocaleString()}`
}

const SCENARIO_KEYS = [
  { tab: 'compactCaseTabIdle', body: 'compactCaseIdle' },
  { tab: 'compactCaseTabBuffer', body: 'compactCaseBuffer' },
  { tab: 'compactCaseTabSafety', body: 'compactCaseSafety' },
  { tab: 'compactCaseTabDegraded', body: 'compactCaseDegraded' },
]

/** @param {{copy:any, meterDown:boolean, degraded:boolean, policy:any, effective:any, modelLabel:string}} props */
function ScenarioBox({ copy, meterDown, degraded, policy, effective, modelLabel }) {
  const [tab, setTab] = React.useState(1) // default: trigger-line scenario
  const pct = value => (Number.isFinite(value) ? `${Math.round(value * 100)}` : '—')
  const vars = {
    bp: pct(policy.bufferSizeAsync),
    hp: pct(policy.healthTargetAsync),
    sp: pct(policy.bufferSizeSafety ?? 0.9),
    pin: tok(policy.pinnedAsyncTokens),
    fpin: tok(policy.pinnedFullTokens),
    epin: tok(effective.pin ?? policy.pinnedAsyncTokens),
    model: modelLabel,
    status: meterDown ? 'meter-unavailable' : degraded ? 'state-read-failed' : 'ok',
  }
  const active = SCENARIO_KEYS[tab] ?? SCENARIO_KEYS[0]
  return (
    <div className="nms-compact-explain">
      <div className="nms-explain-head">
        <span className="nms-compact-section-title">{copy.compactExplainTitle}</span>
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
  const [provider] = pair.split('/')
  return meta?.name ? `${provider} · ${meta.name}` : pair
}

/** Ratios are stored as fractions and shown as whole percents. */
function ratioText(value) {
  return Number.isFinite(value) ? String(Math.round(value * 100)) : '—'
}

/**
 * A number row that edits in place; the value is written only after the
 * panel's top-right confirm. Ratios are edited as whole percents.
 * @param {{ label: string, hint?: string, field: string, value: any, unit: string, ratio?: boolean, step?: string, editing: boolean, onActivate: (field:string)=>void, onDraft: (field:string, raw:string)=>void, onCancel: ()=>void, busy: boolean }} props
 */
function NumberField({ label, hint, field, value, unit, ratio = false, step = '1', editing, onActivate, onDraft, onCancel, busy }) {
  const initial = ratio ? ratioText(value) : (Number.isFinite(value) ? String(value) : '—')
  const shown = ratio ? initial : tok(value)
  const [draft, setDraft] = React.useState(initial)
  React.useEffect(() => { if (editing) setDraft(initial === '—' ? '' : initial) }, [editing, initial])
  const publish = text => {
    setDraft(text)
    onDraft(field, ratio ? String(Number(text) / 100) : text)
  }
  return (
    <Field label={label} hint={hint}>
      {editing ? (
        <input
          className="nms-compact-input nms-compact-input-num"
          type="number"
          autoFocus
          aria-label={label}
          value={draft}
          step={ratio ? '1' : step}
          min="0"
          max={ratio ? '100' : undefined}
          disabled={busy}
          onChange={event => publish(event.target.value)}
          onKeyDown={event => { if (event.key === 'Escape') onCancel() }}
        />
      ) : (
        <button type="button" className="nms-compact-value" disabled={busy} onClick={() => onActivate(field)}>
          {`${shown} ${unit}`}
        </button>
      )}
    </Field>
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
      <Field label={copy.compactFieldPrompt} hint={copy.compactHintPrompt}>
        <button type="button" className="nms-compact-value nms-compact-value-wide" disabled={busy} aria-expanded={open} onClick={() => setOpen(prev => !prev)}>
          {custom ? copy.compactPromptCustom : copy.compactPromptBuiltin}
          {typeof version === 'string' && version.length > 0 ? ` · ${copy.compactPromptVersion.replace('{v}', version)}` : ''}
        </button>
      </Field>
      {open && (
        <div className="nms-compact-prompt-body">
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
        </div>
      )}
    </div>
  )
}
